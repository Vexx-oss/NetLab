package oss.vexx.netlab;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.DisplayCutout;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;

/**
 * Hülle um die Browser-Fassung des Netzwerk-Labors.
 *
 * Die Seite wird NICHT aus dem Netz geladen. Sie liegt als eine einzige Datei
 * (assets/index.html) in der App und wird unter der erfundenen Adresse
 * https://netzwerk-labor.local/ ausgeliefert — beantwortet in shouldInterceptRequest.
 *
 * Warum nicht file:///android_asset/...? Ein file://-Ursprung gilt als undurchsichtig;
 * localStorage (der Spielstand!) ist dort nicht verlässlich. Ein echter https-Ursprung
 * verhält sich wie im Browser. Die App hat deshalb auch kein INTERNET-Recht: die
 * Adresse verlässt das Gerät nie.
 *
 * DREHEN (geändert 06.10.2026): Die App ist nicht mehr auf Querformat festgenagelt
 * (AndroidManifest.xml, screenOrientation="unspecified"). Ein Dreh darf die Seite NICHT
 * neu laden — der Spielstand liegt in localStorage und überlebt zwar auch ein Neuladen,
 * aber ein laufendes Labor, offene Dialoge und der Verlauf gingen verloren. Drei Netze
 * halten das:
 *   1. configChanges im Manifest fängt das Drehen ab → es gibt gar kein onCreate.
 *   2. Sollte die Activity doch neu erzeugt werden, stellt restoreState die Seite aus
 *      dem gesicherten Zustand wieder her — ohne loadUrl (onSaveInstanceState).
 *   3. Die einzige zweite loadUrl-Stelle ist der Fehler-Rückfall in onReceivedError:
 *      sie greift nur, wenn die Hauptseite gar nicht geladen werden konnte, und wird
 *      von einem Dreh nie erreicht.
 * Außerdem liegt die Oberfläche nicht unter Statusleiste, Aussparung (Notch) oder
 * Gestenleiste: das Thema ist kein Fullscreen-Thema (siehe res/values/themes.xml), und
 * zusätzlich setzt innenabstandSetzen() alles als Innenabstand, was das System trotzdem
 * als Systemleiste oder Aussparung meldet. Die Seite selbst bringt kein
 * viewport-fit=cover mit; die WebView hält den Satzspiegel damit ohnehin im sicheren
 * Bereich.
 */
public class MainActivity extends Activity {

    private static final String TAG = "NetzwerkLabor";
    private static final String WIRT = "netzwerk-labor.local";
    private static final String START = "https://" + WIRT + "/index.html";
    private static final int DATEI_WAHL = 4711;

    /** Wird vom Bau-Werkzeug ersetzt (android/bauen.py). */
    public static final String SPIEL_VERSION = "__VERSION__";
    public static final String HUELLE = "android-1";

    private WebView web;
    private ValueCallback<Uri[]> dateiWahl;
    private boolean ausgewichen = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle zustand) {
        super.onCreate(zustand);
        WebView.setWebContentsDebuggingEnabled(true);

        web = new WebView(this);
        web.setBackgroundColor(0xFF0E131B);

        /* Kein Fensterrand: was das System als Statusleiste, Gestenleiste oder
           Aussparung (Notch) meldet, wird zum Innenabstand der WebView. Damit liegt im
           Hochformat nichts unter dem Kameraloch oder unter der Gestenleiste — auch
           dann, wenn ein Gerät die App randlos zeigt (Android 15/16 können das
           erzwingen). Meldet das System nichts (Regelfall: das Thema ist kein
           Fullscreen-Thema, der Inhalt wird schon freigehalten), bleibt der Abstand 0;
           zweimal gerechnet wird also nichts. */
        web.setOnApplyWindowInsetsListener((View v, WindowInsets insets) -> {
            int oben = insets.getSystemWindowInsetTop();
            int unten = insets.getSystemWindowInsetBottom();
            int links = insets.getSystemWindowInsetLeft();
            int rechts = insets.getSystemWindowInsetRight();
            if (Build.VERSION.SDK_INT >= 28) {          // DisplayCutout gibt es ab API 28
                DisplayCutout ausschnitt = insets.getDisplayCutout();
                if (ausschnitt != null) {
                    oben = Math.max(oben, ausschnitt.getSafeInsetTop());
                    unten = Math.max(unten, ausschnitt.getSafeInsetBottom());
                    links = Math.max(links, ausschnitt.getSafeInsetLeft());
                    rechts = Math.max(rechts, ausschnitt.getSafeInsetRight());
                }
            }
            v.setPadding(links, oben, rechts, unten);
            return insets;
        });

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setUseWideViewPort(true);          // viewport-Meta der Seite gilt (width=device-width)
        s.setLoadWithOverviewMode(false);    // nicht herauszoomen
        s.setSupportZoom(false);             // kein Seiten-Zoom; gezoomt wird im Spiel (2 Finger)
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        /* Feste Textgröße. Das Spiel rechnet seinen Aufbau in px; eine vom System
           hochgedrehte Schrift (fontScale) würde Beschriftungen aus den Leisten
           schieben — im Hochformat ist dafür kein Platz. Bewusst gegen die
           Systemeinstellung: das Layout des Spiels hat Vorrang. */
        s.setTextZoom(100);
        s.setMediaPlaybackRequiresUserGesture(false);   // die Töne des Spiels
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);
        s.setAllowFileAccess(true);      // nur für den Rückfall auf file:///android_asset/
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest anfrage) {
                Uri u = anfrage.getUrl();
                if (!WIRT.equals(u.getHost())) return null;      // es gibt nur diese eine Quelle
                String pfad = u.getPath();
                if (pfad == null || pfad.equals("/")) pfad = "/index.html";
                String name = pfad.startsWith("/") ? pfad.substring(1) : pfad;
                try {
                    InputStream ein = getAssets().open(name);
                    return new WebResourceResponse(mime(name), istText(name) ? "utf-8" : null, ein);
                } catch (IOException e) {
                    Log.w(TAG, "Asset fehlt: " + name);
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found",
                            Collections.<String, String>emptyMap(), new ByteArrayInputStream(new byte[0]));
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest anfrage) {
                Uri u = anfrage.getUrl();
                if (WIRT.equals(u.getHost())) return false;      // im Spiel bleiben
                try {                                             // echter Link: im Browser öffnen
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Kein Browser gefunden.", Toast.LENGTH_SHORT).show();
                }
                return true;
            }

            /**
             * Rückfall, falls die interne Quelle nicht beantwortet wird.
             *
             * Der Hauptweg ist `shouldInterceptRequest` — so liefert auch AndroidX
             * (WebViewAssetLoader) seine Assets aus. Er lässt sich aber nur auf einem
             * Gerät beweisen. Steht die Seite deshalb nicht, wird sie ein zweites Mal
             * über `file:///android_asset/index.html` geladen: dann fehlt zwar
             * womöglich der Spielstand (file:// hat einen undurchsichtigen Ursprung),
             * aber die App zeigt kein „Webseite nicht verfügbar“.
             */
            @Override
            public void onReceivedError(WebView v, WebResourceRequest anfrage, WebResourceError fehler) {
                if (!anfrage.isForMainFrame()) return;
                Log.e(TAG, "Hauptseite nicht geladen: " + fehler.getDescription() + " — " + anfrage.getUrl());
                if (ausgewichen) return;
                ausgewichen = true;
                Toast.makeText(MainActivity.this,
                        "Interne Quelle nicht erreichbar — lade aus dem App-Ordner.",
                        Toast.LENGTH_LONG).show();
                v.loadUrl("file:///android_asset/index.html");
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            /* Ohne diese drei Dialoge liefert alert() nichts und confirm() immer false —
               „Ticket zurücksetzen“ fragt aber nach. */
            @Override
            public boolean onJsAlert(WebView v, String url, String text, final android.webkit.JsResult r) {
                new android.app.AlertDialog.Builder(MainActivity.this)
                        .setMessage(text).setPositiveButton("OK", (d, w) -> r.confirm())
                        .setOnCancelListener(d -> r.cancel()).show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView v, String url, String text, final android.webkit.JsResult r) {
                new android.app.AlertDialog.Builder(MainActivity.this)
                        .setMessage(text)
                        .setPositiveButton("OK", (d, w) -> r.confirm())
                        .setNegativeButton("Abbrechen", (d, w) -> r.cancel())
                        .setOnCancelListener(d -> r.cancel()).show();
                return true;
            }

            @Override
            public boolean onJsPrompt(WebView v, String url, String text, String vorbelegung,
                                      final android.webkit.JsPromptResult r) {
                final android.widget.EditText feld = new android.widget.EditText(MainActivity.this);
                feld.setText(vorbelegung == null ? "" : vorbelegung);
                new android.app.AlertDialog.Builder(MainActivity.this)
                        .setMessage(text).setView(feld)
                        .setPositiveButton("OK", (d, w) -> r.confirm(feld.getText().toString()))
                        .setNegativeButton("Abbrechen", (d, w) -> r.cancel())
                        .setOnCancelListener(d -> r.cancel()).show();
                return true;
            }

            /* „Spielstand laden“ ist ein <input type=file> — ohne das hier passiert nichts. */
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> ziel,
                                             FileChooserParams p) {
                if (dateiWahl != null) dateiWahl.onReceiveValue(null);
                dateiWahl = ziel;
                try {
                    startActivityForResult(p.createIntent(), DATEI_WAHL);
                    return true;
                } catch (Exception e) {
                    dateiWahl = null;
                    Toast.makeText(MainActivity.this, "Keine Dateiauswahl verfügbar.", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }

            @Override
            public boolean onConsoleMessage(android.webkit.ConsoleMessage m) {
                Log.i(TAG, m.message() + " (" + m.sourceId() + ":" + m.lineNumber() + ")");
                return true;
            }
        });

        web.addJavascriptInterface(new Bruecke(), "NetzAndroid");

        /* Der Ladepfad beim Start. Die einzige zweite Ladestelle im Code ist der
           Fehler-Rückfall in onReceivedError (unten) — sie greift nur, wenn die
           Hauptseite gar nicht geladen werden konnte.
           Wird die Activity neu erzeugt (Konfigurationswechsel, der nicht in
           configChanges steht; nach einem Prozess-Tod ist `zustand` da, enthält aber
           keine WebView), dann wird die gesicherte Seite wiederhergestellt statt neu
           geladen. restoreState liefert null, wenn nichts zu holen ist — dann greift
           der normale Start. Ein Dreh kommt hier gar nicht an (configChanges). */
        if (zustand != null && web.restoreState(zustand) != null) {
            Log.i(TAG, "Seite aus gesichertem Zustand wiederhergestellt — kein loadUrl.");
        } else {
            web.loadUrl(START);
        }
        setContentView(web);
    }

    /**
     * Ein Dreh landet hier — und lädt ausdrücklich nichts.
     *
     * Die WebView bleibt dieselbe Instanz: kein neues onCreate, kein loadUrl, kein
     * Verlust von Spielstand, offenen Dialogen oder Verlauf. Die neue Fenstergröße
     * erreicht die Seite als resize; darum kümmert sie sich selbst (die Android-Anpassung
     * in android/mobil/ setzt darauf auf).
     */
    @Override
    public void onConfigurationChanged(Configuration neu) {
        super.onConfigurationChanged(neu);
        Log.i(TAG, "Konfiguration gewechselt: orientation=" + neu.orientation
                + ", " + neu.screenWidthDp + "×" + neu.screenHeightDp + " dp"
                + " — WebView bleibt bestehen, kein loadUrl.");
    }

    /**
     * Zustand der WebView sichern (Seite, Verlauf, Bildlauf) — das Netz für den Fall,
     * dass die Activity doch neu erzeugt wird. Der Spielstand selbst liegt in
     * localStorage und braucht das nicht; hier geht es um die laufende Sitzung.
     */
    @Override
    protected void onSaveInstanceState(Bundle ziel) {
        super.onSaveInstanceState(ziel);
        if (web != null) web.saveState(ziel);
    }

    @Override
    protected void onActivityResult(int anfrage, int ergebnis, Intent daten) {
        if (anfrage == DATEI_WAHL) {
            Uri[] auswahl = null;
            if (ergebnis == RESULT_OK && daten != null) {
                if (daten.getClipData() != null) {
                    int n = daten.getClipData().getItemCount();
                    auswahl = new Uri[n];
                    for (int i = 0; i < n; i++) auswahl[i] = daten.getClipData().getItemAt(i).getUri();
                } else if (daten.getData() != null) {
                    auswahl = new Uri[]{daten.getData()};
                }
            }
            if (dateiWahl != null) { dateiWahl.onReceiveValue(auswahl); dateiWahl = null; }
            return;
        }
        super.onActivityResult(anfrage, ergebnis, daten);
    }

    /** Zurück-Taste: erst im Spiel zurück, dann die App verlassen. */
    @Override
    public boolean onKeyDown(int taste, KeyEvent ereignis) {
        if (taste == KeyEvent.KEYCODE_BACK) {
            if (web != null && web.canGoBack()) { web.goBack(); return true; }
            finish();
            return true;
        }
        return super.onKeyDown(taste, ereignis);
    }

    @Override protected void onPause() { super.onPause(); if (web != null) web.onPause(); }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override protected void onDestroy() { if (web != null) web.destroy(); super.onDestroy(); }

    private static String mime(String name) {
        String n = name.toLowerCase();
        if (n.endsWith(".html") || n.endsWith(".htm")) return "text/html";
        if (n.endsWith(".js")) return "application/javascript";
        if (n.endsWith(".css")) return "text/css";
        if (n.endsWith(".json")) return "application/json";
        if (n.endsWith(".svg")) return "image/svg+xml";
        if (n.endsWith(".png")) return "image/png";
        if (n.endsWith(".webp")) return "image/webp";
        if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
        if (n.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    private static boolean istText(String name) {
        String n = name.toLowerCase();
        return n.endsWith(".html") || n.endsWith(".htm") || n.endsWith(".js")
                || n.endsWith(".css") || n.endsWith(".json") || n.endsWith(".svg");
    }

    /**
     * Brücke zur Seite. Bewusst klein: nur, was der Browser nicht kann.
     * Die Seite erkennt die Hülle an `typeof NetzAndroid !== "undefined"`.
     */
    public class Bruecke {

        @JavascriptInterface
        public String spielVersion() { return SPIEL_VERSION; }

        @JavascriptInterface
        public String huelle() { return HUELLE; }

        /** Spielstand teilen (Dateien, Drive, Mail …) — der Browser lädt stattdessen herunter. */
        @JavascriptInterface
        public void teilen(String titel, String text) {
            final Intent i = new Intent(Intent.ACTION_SEND);
            i.setType("application/json");
            i.putExtra(Intent.EXTRA_SUBJECT, titel);
            i.putExtra(Intent.EXTRA_TEXT, text);
            runOnUiThread(() -> {
                try {
                    startActivity(Intent.createChooser(i, titel));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Kein Ziel zum Teilen gefunden.", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void meldung(String text) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, text, Toast.LENGTH_SHORT).show());
        }
    }
}
