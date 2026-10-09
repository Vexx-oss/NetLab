---
tags: [FISI, Lernspiel, Android]
erstellt: 2026-10-06
---

# 📱 Netzwerk-Labor für Android

Die Android-Fassung des Netzwerk-Labors: eine WebView-Hülle um **dieselbe**
Browser-Fassung, die auch die `.exe` und die Seite im Netz benutzen. Eine Quelle,
kein zweiter Stand — es wird nichts nachgebaut und nichts gepflegt, was es doppelt gibt.

**Fertige App:** `Programm/Netzwerk-Labor-1.2.4-Android.apk`, versionCode **10202**,
versionName 1.2.4, signiert (v2 + v3), keine Berechtigungen, freie Drehung. Darin liegt
genau die gemessene Seite: `assets/index.html`, 2.231.733 Bytes, SHA256
`d58254c7875a8646cd8543c1ab6e652a0204eb408322289edac23961f25cc659` — selbst
nachgemessen: das `assets/index.html` **in** der APK ist byte-gleich zu
`android/bau/assets/index.html` (geprüft in `android/bauen.py`, Schritt 7, und am
06.10.2026 zusätzlich von Hand aus der APK entpackt).

**End-APK (06.10.2026, 16:19:40):** 960.028 Bytes, SHA256
`88c16df1ea1f8bc9cb5e91d834d48cd7027408c45f1923d07f01205e41c016f7`.

**Die APK-Größe ist als Kennung wertlos.** `apksigner` hängt einen Signaturblock von
genau 4.096 Bytes an und füllt davor auf eine 4.096er-Grenze auf (Hinweis von
„huelle-drehung“): vier verschiedene Seiten in dieser Sitzung, jedes Mal exakt
960.028 Bytes. Als Kennung deshalb immer die SHA256 nennen — oder versionCode plus
Seiten-SHA. Der APK-Hash ändert sich mit jedem Bau (die ZIP-Zeitstempel stecken mit
drin), die Seiten-Kennung `d58254c7875a8646…` ist der Inhalt und bleibt.

## Installieren

1. Die `.apk` aufs Telefon bringen (Kabel, Cloud, Messenger — egal).
2. Datei antippen. Android fragt einmal nach der Erlaubnis *„Unbekannte Apps
   installieren“* — die gilt für die App, die die Datei geöffnet hat (z. B. „Dateien“).
3. „Installieren“. Fertig: kein Play Store, kein Konto, kein Internet.

Die App fordert **keine** Berechtigung an (geprüft: `aapt2 dump badging` nennt keine
`uses-permission`-Zeile, und im Manifest gibt es keine). Sie *kann* nichts nachladen
und nichts senden — nicht „aus Versehen“, sondern weil sie es nicht darf.

Die App darf sich **drehen** (Hoch- und Querformat, `screenOrientation="unspecified"`).
Ein Dreh erzeugt die Activity nicht neu (`configChanges` deckt
`orientation|screenSize|screenLayout|smallestScreenSize|keyboard|keyboardHidden|navigation|touchscreen|density|uiMode|fontScale|colorMode|locale|layoutDirection`),
der Spielstand bleibt also stehen.

## So bedient man sie auf dem Telefon

Auf Telefonmaßen (**kurze Seite ≤ 640 px**) gilt eine eigene Anordnung. Sie entsteht
allein in `android/mobil/mobil.css` und `mobil.js`; `src/` ist unangetastet.

| Was | Hochformat (412 × 915) | Querformat (915 × 412) |
|---|---|---|
| Navigation (Heute · Postfach · Labor · Kunden · Wiki · Lernstand · Shop) | untere Leiste im Daumenbereich, 7 Knöpfe à 51 × 50 px | senkrechte Schiene links, 56 px breit, 7 Knöpfe à 56 × 51 px |
| Geräteleiste (Endgeräte · Server · Netzwerk · Außenwelt) | Blatt von unten, geöffnet mit dem **+ Knopf** unten links | ebenso, Blatt liegt rechts neben der Schiene |
| Dock (Inspektor · Simulation · Terminal · Plan · Akte) | Blatt von unten, geöffnet mit dem **Dock-Knopf** unten rechts | Blatt von rechts |
| Werkzeuge (Auswahl V · Kabel K · Ping P), Ansicht, Rückgängig/Wiederholen, Zoom | **eine** Zeile, 52 px hoch, unten; Zoom ganz rechts | ebenso, in derselben Zeile |
| Kopfzeile | **eine** Zeile, 49 px: Symbol · Geld · Ruf · offene Tickets · ⋯-Menü | eine Zeile, 49 px: zusätzlich der Name „Netzwerk-Labor“, „Stufe“ und die drei Knöpfe |
| Schließen der Blätter | Geräteblatt: + Knopf, Tippen daneben oder Esc · Dock-Blatt: Griff antippen, nach unten wischen oder der ⌄-Knopf im Reiter | ebenso |

**Was im ⋯-Menü liegt (nur Hochformat):** Suche (Strg+K), Hell/Dunkel, Einstellungen,
Leiste, Tastenkürzel. Der Grund ist das Platzbudget: vier Wertpillen à 44 px plus Name
plus vier Knöpfe passen bei 412 px Breite nicht in eine Zeile, und zwei Zeilen kosten
48 px Zeichenfläche. **Bewusste Entscheidung:** Im Hochformat steht statt des Namens
„Netzwerk-Labor“ nur das Symbol — auf dem Telefon steht der Name ohnehin im
Startbildschirm, und der Name allein kostet 91 px. Im Querformat ist er sichtbar.
Wer den Namen auch im Hochformat will, muss eine zweite Kopfzeile (48 px) bezahlen.

Die zwei schwebenden Knöpfe (+ Gerät, Dock) und die Griffe sind Zutaten von
`mobil.js` — das Spiel selbst kennt sie nicht. Alles läuft in `try/catch`: eine
Anpassung darf das Spiel nie lahmlegen.

## Was gemessen ist — neun Abnahmekriterien, vorher/nachher

Gemessen am 06.10.2026 mit `android/werkzeuge/mobilprobe.py` (Werkzeug von Teammitglied
„mobil-pruefer“) in einem **echten Browser** (headless Edge) mit aufgesetztem
Telefonbildschirm und Berührungsemulation. Die Zahlen sind Laufzeitwerte, keine
Schätzung. „Vorher“ = die alte Anpassungsschicht (44 %) bzw. die Angaben des Leads für
das Querformat (`ist-quer-*.png`), „nachher“ = Fassung mit SHA256 `d58254c7875a8646…`
der gebauten Seite `android/bau/assets/index.html` (2.231.733 Bytes). Der volle Lauf
über 16 Profile (4 Geräte × 2 Ausrichtungen × 2 Themen) mit Ziehprobe meldet
**12 von 12 gewerteten Profilen grün** (die vier Tablet-Profile werden gemessen, aber
nicht gewertet — Telefon-Zielwerte gelten dort nicht).

| # | Kriterium | vorher hoch | nachher hoch | vorher quer | nachher quer |
|---|---|---|---|---|---|
| 1 | Zeichenfläche, Anteil der Bildschirmbreite | 44 % (182 px) | **100 %** (412 px) | 75 % (685 px) | **93,9 %** (859 px) |
| 2 | tote Fläche rechts | 76 px | **0 px** | 76 px | **0 px** |
| 3 | Werkzeugleiste | 3 Zeilen, 110 px | **1 Zeile, 52 px** | 2 Zeilen | **1 Zeile, 52 px** |
| 4 | abgeschnittener Text (`scrollWidth > clientWidth + 2`) | 4 Elemente | **0** | — | **0** |
| 5 | Knöpfe unter 44 × 44 px | — | **0 von 19** | — | **0 von 19** |
| 6 | Kabelzug mit dem Finger | — (nicht gemessen) | **5 → 6 Kabel** | ja (Lead, alte Fassung) | **5 → 6 Kabel** |
| 7 | JS-Fehler / Überlauf | 0 / 0 px | **0 / 0 px** | 0 / 0 px | **0 / 0 px** |
| 7b | `UI.modus('leiste')` abgefangen | ja | **ja (bleibt „voll“)** | ja | **ja** |
| 8 | Zoom im Labor (Vorlage salon) | 0,25 | **0,5027** | 0,4787 | **0,4957** |
| 9 | dunkles Thema | dunkel | **dunkel (rgb(14,19,27))** | dunkel | **dunkel** |
| — | Zeichenfläche verdeckt | 14,2 % | **5,8 %** | 17,7 % | **7,4 %** |
| — | Kollision Leiste/Gerät | — | **0 von 6** | — | **0 von 6** |
| — | Kopfzeile | 54 px | 49 px | 54 px | 49 px |
| — | nichts ragt aus dem Bildschirm | — | **0 Elemente** | — | **0 Elemente** |

Weitere Profile (dieselbe Fassung, dunkel **und** hell identisch, mit Ziehprobe:
Kabel 5 → 6 in jedem Profil):

| Profil | Zeichenfläche | totR | Zoom (= Maximum) | verdeckt | Kollision | Ziel |
|---|---|---|---|---|---|---|
| 412 × 915 hoch | 100 % | 0 px | 0,5027 | 5,8 % | 0 von 6 | grün |
| 915 × 412 quer | 93,9 % | 0 px | 0,4957 | 7,4 % | 0 von 6 | grün |
| 360 × 640 hoch | 100 % | 0 px | 0,4324 | 10,3 % | 0 von 6 | grün |
| 640 × 360 quer | 91,2 % | 0 px | 0,4170 | 12,9 % | **1 von 6 zu 3 %** | grün |
| 428 × 926 hoch | 100 % | 0 px | 0,5243 | 5,5 % | 0 von 6 | grün |
| 926 × 428 quer | 94,0 % | 0 px | 0,5213 | 6,9 % | 0 von 6 | grün |
| Tablet 800 × 1280 hoch | 80,8 % | 0 px | 0,8189 | 5,5 % | 0 von 6 | nicht gewertet |
| Tablet 1280 × 800 quer | 88,0 % | 0 px | 1,1000 | 8,6 % | 0 von 6 | nicht gewertet |

In jedem Profil außerdem: 0 abgeschnittene Elemente, 0 Elemente außerhalb des
Bildschirms, 0 Überlauf, 0 JS-Fehler, 0 Konsolenfehler, Leisten-Modus abgefangen.

**Alle sieben Navigationsansichten** (gegengeprüft von „mobil-pruefer“ mit
`mobilprobe.py --mit-ansichten`, Pixel 7 hoch, dunkel — geklickt, nicht geschätzt):

| Ansicht | sichtbare Knöpfe | unter 44 × 44 px | abgeschnittener Text | außerhalb |
|---|---|---|---|---|
| Heute | 15 | **0** | 0 | 0 |
| Postfach | 13 | **0** | 2 (Absicht: `-webkit-line-clamp:2`) | 0 |
| Labor | 16 | **0** | 0 | 0 |
| Kunden | 13 | **0** | 0 | 0 |
| Wiki | 36 | **0** | 0 | 22 (breite Tabelle, Behälter scrollt) |
| Lernstand | 39 | **0** | 0 | 0 |
| Shop | 9 | **0** | 0 | 0 |

Dafür war eine Wurzel zu beheben: `all:unset` in `src/stil/hub.css` (`.hb-oder-zeile`,
`.hb-woche-knopf`) und genaue Klassen wie `.knopf.klein` (30 px) setzen `min-height`
zurück und schlagen einen Element-Selektor. In der Telefonstufe steht deshalb
`button { min-height: 44px !important; }` — die Zusage wächst nur nach unten.

Und die Blätter selbst (ebenfalls `--bedienprobe`, Pixel 7 hoch): die vier
Gerätekategorien öffnen ihre Fächer (396 × 307 / 166 / 213 / 119 px), alle **ganz im
Bild**, kein Teil außerhalb, kein Teil unter 44 px; das Dock-Blatt öffnet sich
(412 × 520), Reiter 100 × 44; das ⋯-Menü ist 216 × 267 px groß, ganz im Bild, seine
fünf Punkte sind je 202 × 44 px.

**Der eine ehrliche Rest:** auf dem kleinsten Querformat (640 × 360) überdeckt die
Werkzeugzeile **32 px² eines Geräts (3 %)**. Ursache ist eine Rechnung im Spiel, nicht
in der Anordnung: `einpassen()` lässt unten `min(84 px, 15 % der Höhe)` frei — bei
272 px Höhe sind das 41 px, die Werkzeugzeile ist aber 52 px hoch. Mit 44-px-Knöpfen
lässt sich keine flachere Zeile bauen. Auf allen größeren Profilen (Höhe ≥ 324 px)
tritt das nicht auf.

**Warum der Zoom auf einem 360-px-Telefon 0,4324 ist und nicht 0,5:** `einpassen()`
in `src/ui/editor.js` rechnet `k = min((Fensterbreite − 40) / Netzbreite, …)`. Das
Salon-Netz ist 740 Einheiten breit (aus zwei Messpunkten zurückgerechnet:
(412 − 40) / 0,5027 = 740). Auf 360 px sind 320 px nutzbar → 320 / 740 = 0,4324 ist
das **rechnerische Maximum**. Der Zielwert „≥ 0,5“ gilt deshalb nur für das
Referenzgerät 412 × 915; überall sonst gilt „eingepasst“ (Zoom = das Maximum dieser
Fläche). Der Lead hat das so entschieden.

**Warum die Zeichenfläche im Querformat 93,9 % und nicht 100 % ist:** Dort ist die
Höhe das knappe Gut (412 px), also ist die Navigation eine 56 px breite Schiene links.
Mit der unteren Leiste wären es 100 % Breite gewesen, aber nur 276 px Höhe und ein
Zoom von 0,4234 — **kleiner als der alte Stand 0,4787**. Die Schiene gibt 48 px Höhe
zurück und hebt den Zoom auf 0,4957. Der Lead hat diese Abwägung verlangt und
abgenommen.

## Was ausdrücklich NICHT geprüft ist

**Auf einem echten Android-Gerät oder Emulator ist die App nie gestartet.** Es lag
weder ein Gerät angeschlossen noch ein Emulator-Bild vor. Geprüft ist die *Seite in
der App* (in einem echten Browser mit Telefonmaßen), nicht die App **auf** Android.
Damit sind diese Punkte offen — sie stehen hier, damit niemand sie für erledigt hält:

- ob Android die Seite wirklich über `shouldInterceptRequest` bekommt (Hauptweg),
- ob der Rückfall auf `file:///android_asset/` greift, falls nicht,
- die Dialoge (`alert`/`confirm`), die Dateiauswahl beim Laden eines Spielstands,
  das Teilen-Menü beim Sichern, die Zurück-Taste, die Bildschirmtastatur, der Ton,
- ob der WebView bei dunklem Hüllen-Thema wirklich `prefers-color-scheme: dark` meldet,
- **die sicheren Ränder (Notch, Gestenleiste):** `mobil.js` setzt `viewport-fit=cover`
  im Meta-Tag (gemessen: die gebaute Seite trägt jetzt
  `width=device-width, initial-scale=1, viewport-fit=cover`), und `mobil.css` rechnet
  überall mit `env(safe-area-inset-*)` samt Rückfallwert. Was davon **ankommt**, ist
  auf dem Messplatz 0 px — ein Kopfloser-Browser hat keine Aussparung. Ob die Werte auf
  einem Gerät mit Notch wirklich geliefert werden, ist **nicht gemessen**.
- die Blätter (Geräte, Dock) mit dem Finger zu **wischen**: das Zuschieben per Griff ist
  eingebaut, aber im Kopfloser-Browser nicht mit einer Wischgeste geprüft.

Der Hauptweg ist das Muster, das AndroidX selbst (`WebViewAssetLoader`) empfiehlt.
Trotzdem gilt: erst auf einem Gerät ist es bewiesen.

## Grenzen der Bedienung (gewollt oder offen)

- **Kein Zwei-Finger-Zoom.** Das Spiel kennt nur das Mausrad. Gezoomt wird über den
  Knopf unten rechts (Prozentzahl) → Menü *Vergrößern / Verkleinern / 100 % / Einpassen*.
- **Tablet bleibt Schreibtisch.** Die Telefon-Anordnung greift nur, wenn die kurze
  Seite ≤ 640 px ist. Ein Tablet (800 × 1280, 1280 × 800) behält Navigation und
  Geräteleiste als Spalten — dort ist Platz dafür. Gemessen: 80,8 % bzw. 88,0 %
  Zeichenfläche. Wer auch das Tablet als Telefon behandeln will, ändert eine Zeile in
  `mobil.css` (die beiden `max-width`/`max-height`-Grenzen). Die Fingerregeln gelten
  dort trotzdem: Kopfknöpfe, Werkzeuge und Dock-Reiter sind auf dem Tablet 44 × 44 px
  (vorher 40 × 44 — gemessen und behoben).
- **Ein Gerät wird auf 640 × 360 zu 3 % von der Werkzeugzeile berührt** (32 px²) —
  siehe die Tabelle oben. Auf allen anderen Profilen 0 von 6.
- **IP-Beschriftungen im Netz sind kleiner als 44 px.** Die Geräte-Adressen
  (`.ger-ip.kopierbar`, Klick kopiert die IP) sind Spieltext im gezeichneten Netz und
  skalieren mit dem Zoom — gemessen auf dem Tablet 86 × 13 px, auf dem Telefon bei
  Zoom 0,5 rund 55 × 9 px. Das Spiel blendet sie unter Zoom 0,6 selbst aus; auf
  Telefonmaßen sind sie damit **nicht sichtbar**, auf dem Tablet schon. Sie wurden
  absichtlich nicht abgeschaltet: die 44-px-Regel gilt den Bedienelementen der
  Oberfläche, nicht den Beschriftungen in der Zeichnung.
- **Die Startansicht im Querformat hat Zoom 0,334** — dort, wo **kein** Ticket geladen
  wird (`--ohne-labor`). Die Auftragszeile ist dort ein 117 px hoher Streifen über die
  ganze Breite, und niemand stößt nach dem Laden ein Einpassen nach. Ein Blatt von
  rechts (280 px Spalte) würde den Zoom auf etwa 0,5 heben — aber die Zeichenfläche
  fiele auf 63 % der Breite, also **unter den eigenen Zielwert ≥ 80 %**. Der Tausch
  wurde verworfen (Begründung unten). Im geladenen Labor (Auftrag 39 px) und auf dem
  echten Nutzerpfad mit Ticket (`--mit-start`) stimmt der Zoom exakt mit dem Maximum.
- **Tastenkürzel** (V, K, P, I, S, F, A, 0, ±, Entf) brauchen eine echte Tastatur.
  Alles davon ist auch antippbar.
- **Kabel an genau einen Port stecken:** Die Port-Punkte erscheinen, während gezogen
  wird — das ist der übliche Berührungsweg. Ob die kleinen Punkte (Ø 11 px) mit dem
  Finger zuverlässig zu treffen sind, ist **nicht gemessen**.
- **Der Leisten-Modus ist stillgelegt.** `ui/leiste.js` öffnet und schließt die Leiste
  an `pointerenter`/`pointerleave` und zieht ein Fenster per Maus — auf einem Telefon
  gibt es weder Zeiger noch Fenster. Statt den Knopf zu verstecken, fängt die
  Anpassung den Wechsel ab und sagt einmal, warum.
- **Statusleiste bleibt sichtbar** (bewusst kein Fullscreen-Thema): so liegt die
  Oberfläche nie unter Systemknöpfen.
- **Fernprüfung ist eingeschaltet** (`WebView.setWebContentsDebuggingEnabled(true)`).
  Wer USB-Debugging aktiviert, kann die Seite im laufenden Betrieb über
  `chrome://inspect` ansehen — gewollt zum Messen auf dem Gerät (auch
  `window.__nlMobil` steht dort bereit, samt `__nlMobil.blatt('geraete'|'dock'|'menue')`
  und `__nlMobil.safeArea`). Wer das nicht will, nimmt die Zeile in
  `MainActivity.java` heraus.

## Bauen

```bash
python android/bauen.py                 # Spiel → Einzeldatei → APK → Prüfung
python android/bauen.py --ohne-spiel    # schneller: nimmt android/bau/spiel.html
python android/bauen.py --nur-pruefen   # nur Signatur, Kennwerte, Assets prüfen
python android/bauen.py --sdk D:\android-sdk
```

Ergebnis: `Programm/Netzwerk-Labor-<Version>-Android.apk`. Die Version kommt aus
`bauen.py` — es gibt keinen zweiten Stand.

Voraussetzungen: Android-SDK (`build-tools` **≥ 35**, eine Plattform mit `android.jar`,
`cmdline-tools`), JDK 17+, Python mit Pillow (nur fürs Symbol).

### Messen

```bash
python android/werkzeuge/mobilprobe.py                    # 4 Geräte × hoch/quer, dunkel
python android/werkzeuge/mobilprobe.py --lauf --thema dunkel,hell --ziehprobe
python android/werkzeuge/mobilprobe.py --geraet pixel7 --ausrichtung hoch \
    --ziehprobe --bedienprobe --bild Nachweise/android/nachher-hoch-start.png
```

Der Lauf prüft die Zielwerte selbst und endet mit Rückgabewert 1, sobald einer
verletzt ist. `--port 0` sucht einen freien Steuerport (wichtig, wenn mehrere Läufe
gleichzeitig laufen).

### Warum kein Gradle

Das Projekt hat keinen Paketmanager, keinen Bundler und keine Abhängigkeiten — die
Web-Fassung ist **eine** HTML-Datei. Gradle würde dafür ein Abhängigkeitsverzeichnis
und mehrere hundert MB Werkzeug nachladen. `aapt2`, `javac`, `d8`, `zipalign`,
`apksigner` tun dasselbe in fünf nachvollziehbaren Schritten. Kein `build.gradle`,
kein `androidx`, keine Fremdbibliothek — die App benutzt nur `android.*`.

### Warum build-tools ≥ 35

**Gemessen 06.10.2026, mit einem Minimalbeispiel nachgestellt:** `d8` aus
**build-tools 34.0.0** (D8 8.2.2-dev) bricht bei **jeder verschachtelten Klasse** mit
einer internen NullPointerException ab („Cannot invoke String.length() because … is
null“). Eine Klasse ohne Verschachtelung übersetzt dieselbe Fassung problemlos.
`d8` aus **build-tools 36.0.0** (D8 8.10.9-dev) übersetzt dieselben Klassen.
`android/bauen.py` nimmt deshalb die höchste vorhandene Fassung und **bricht mit
klarer Meldung ab**, wenn nur 34.x da ist.

Zweiter gemessener Unterschied: d8 ab build-tools 35 nimmt **kein Verzeichnis** mehr
als Eingabe („Unsupported source file type“), sondern einzelne `.class`-Dateien.
Das Bauwerkzeug übergibt deshalb die Liste.

## Aufbau

```
android/
  bauen.py                    der ganze Bau: Spiel → Einzeldatei → einhängen → APK → prüfen
  LIESMICH.md                 diese Datei
  huelle/
    AndroidManifest.xml       Paket, freie Drehung, keine Rechte
    src/oss/vexx/netlab/MainActivity.java    WebView, Asset-Auslieferung, Dialoge, Brücke
    res/…                     Symbol (5 Dichten + adaptiv), Farben, Thema, App-Name
  mobil/
    mobil.css                 Telefon-Anordnung + Fingerregeln (Trefferflächen ≥ 44 px)
    mobil.js                  Telefon-Bedienung: + Knopf, Dock-Blatt, ⋯-Menü, viewport-fit
  werkzeuge/
    ikone.py                  App-Symbol aus den Farben des Spiels (Pillow)
    mobilprobe.py             Telefonmaße nachstellen, messen, Bildschirmfotos, Kabelzug
  bau/                        Zwischenstände (nicht im Git)
  signatur/                   Schlüssel + Zugang (nicht im Git!)
```

## Die Android-Anpassung

`mobil/mobil.css` und `mobil.js` werden beim Bau **hinter** das Spiel gehängt
(`android/bauen.py`, Schritt 3 — CSS vor `</head>`, JS als letztes Skript vor
`</body>`). Die Quellen in `src/` bleiben unangetastet — es gibt keine zweite Fassung
der Oberfläche, die auseinanderlaufen könnte.

- **`mobil.css`**, Teil 1 — Fingerregeln für jedes Berührungsgerät: kein Gummiband,
  kein Tipp-Blitz, kein Doppeltipp-Zoom; Trefferflächen ≥ 44 px; das **Token-Leck**
  `.labor:not(.dock-da){--dock-b:0px}` (in `src/stil/editor.css` bleibt die dritte
  Rasterspalte sonst 76 px breit und leer, weil `--dock-b` global 76 px ist — gesetzt
  wird die Variable nur am `.labor`, sonst verlöre die Navigationsspalte ihre Breite);
  die Startbild-Knöpfe `.hb-oder-zeile`, `.hb-woche-knopf`, `.knopf.klein`, `.am-mehr`,
  `.am-lesen`, `.am-zu`, `.am-tab` auf 44 px, und `button{min-height:44px !important}`,
  weil `all:unset` in `src/stil/hub.css` und genaue Klassen wie `.knopf.klein`
  (30 px) einen Element-Selektor sonst schlagen.
- **`mobil.css`**, Teil 2 — Telefon-Anordnung (kurze Seite ≤ 640 px): obere Leiste in
  den Daumenbereich, Geräteleiste und Dock als `position:fixed`-Blätter **außerhalb des
  Rasters** (sie nehmen der Zeichenfläche keinen Pixel Breite), Werkzeugzeile in einer
  Reihe (so breit wie ihr Inhalt, damit der leere Rest nichts verdeckt), Kopfzeile
  verdichtet, `env(safe-area-inset-*)` mit Rückfallwerten, Querformat mit
  Navigationsschiene links.
- **`mobil.js`** — kennzeichnet die Seite (`nl-android`), legt den Leisten-Modus still,
  hängt den Spielstand-Export an das Teilen-Menü von Android, ergänzt
  `viewport-fit=cover` im Meta-Tag, baut den **+ Knopf**, den **Dock-Knopf**, den
  **Griff** am Dock-Blatt und das **⋯-Menü** der Kopfzeile, und legt
  `window.__nlMobil` als Selbstauskunft an. Ein `MutationObserver` hängt die Zutaten
  wieder ein, wenn die Ansicht neu aufgebaut wird (`UI.modus('voll')` baut das DOM neu).
  Alles in `try/catch`.
- **Nichts in `src/` wird nachgebaut.** Die Blätter zeigen dieselben Gerätefächer
  (`.pa-*`) und dieselben Dock-Reiter (`.lb-dock-tab`), nur an anderer Stelle. Der
  Öffner ruft die vorhandenen APIs (`UI.labor.dock(...)`, `UI.labor.dockStand`,
  `UI.ansicht`), das ⋯-Menü klickt die vorhandenen Kopfknöpfe über ihren Titel an.
- **Sicherer Rand:** `viewport-fit=cover` gehört in `mobil.js`, weil die Hülle es nicht
  setzen kann (`WebSettings` kennen kein `viewport-fit`) und `src/seite.html` tabu ist.

### Verworfen: Auftragsblatts als Spalte im Querformat

Der Auftrag ist im Querformat ein 117 px hoher Streifen (Startansicht) und frisst die
knappe Höhe. Als 280 px breite Spalte rechts stiege der Zoom der Startansicht von
0,334 auf etwa 0,5 — aber die Zeichenfläche fiele auf 579 px = **63 % der Breite** und
damit unter den eigenen Zielwert ≥ 80 %. Zusätzlich gilt: die Labor-Messung (Auftrag
= reiner Titel, 39 px) würde davon **nichts merken** und weiter 93,9 % melden — die
Verschlechterung träfe also nur die Ansichten, die der Nutzer wirklich sieht. Genau
das ist „grün ohne Wirkung“. Deshalb bleibt der Streifen; die Begründung steht auch im
Kommentar von `mobil.css`.

### Geheilt: das Netz blieb nach dem Ticket-Öffnen zu klein

**Der Mangel (im Spiel, nicht in der Anordnung):** Wer im Hub ein Ticket öffnet, geht
durch `src/ui/spiel.js:46-51` — erst `UI.labor.laden(...)`, **dann**
`UI.app.ansicht("labor")`. In diesem Moment ist die Zeichenfläche noch nicht sichtbar,
und `einpassen()` steigt ohne Flächengröße folgenlos aus, es setzt nur die Wartemarke
(`src/ui/editor.js:248-249`). `zeigen()` löscht diese Marke danach trotzdem
(`src/ui/editor.js:795`), sodass der Wächter beim Ansichtswechsel (Zeile 129) nicht mehr
greift und nur noch `ansichtSetzen()` läuft: **das Netz behält den Zoom der vorigen
Ansicht.** Gemessen mit `mobilprobe.py --mit-start` (Pixel 7 quer, 915 × 412): Zoom
**0,334 statt 0,4957** — das Netz saß 33 % zu klein links oben. Ohne `--mit-start` (Labor
war beim Laden schon sichtbar) war es sofort richtig; im Hochformat fiel der Fehler
kleiner aus (0,5167 statt 0,5027). Auf dem Schreibtisch fällt er kaum auf, auf dem
Telefon deutlich, weil die Anordnung die Flächenhöhe zwischen Hub und Labor stark ändert.

**Die Heilung in der Anpassungsschicht** (`mobil.js`, Abschnitt 5): `UI.labor.laden`
wird umhüllt und stößt `einpassen(false)` nach 120, 420 und 900 ms noch einmal an —
drei Versuche, weil der Ansichtswechsel **nach** dem Laden passiert, und ein zweiter
Aufruf auf schon eingepasster Ansicht ist wirkungsgleich. Zwei Sicherungen: ein neueres
`laden()` bricht die alten Versuche ab, und sobald der Nutzer die Fläche anfasst
(`pointerdown` oder Rad im Bereich der Leinwand oder der Werkzeugleisten), wird nicht
mehr nachgepasst — ein selbst gewählter Zoom bleibt stehen.

**Nachgemessen:** `mobilprobe.py --geraet pixel7 --ausrichtung hoch,quer --mit-start`
meldet **„Zoom eingepasst“ 2/2** (vorher 1/2), Labor hoch 0,5027, quer 0,4957 — beides
exakt das Maximum. Die Telefonwerte ohne `--mit-start` sind unverändert.

**Die saubere Reparatur wären zwei Zeilen in `src/ui/editor.js`** (die Wartemarke erst
löschen, wenn wirklich eingepasst wurde — etwa `Z.einpassenAusstehend = !Z.eingepasst`
statt `= false`). Das ist eine Entscheidung des Nutzers, nicht unsere: `src/` ist für
diese Aufgabe tabu, und die Umhüllung in `mobil.js` wirkt nur in der Android-Fassung.
Auf dem Schreibtisch (`.exe`, Seite im Netz) besteht der Mangel weiter.

### Warum der Zoom in der Startansicht ohne Ticket noch hinter dem Maximum bleibt

Auch nach der Heilung gibt es einen Rest, und er ist derselbe Mechanismus: die
Startansicht (Hub) ändert ihre Auftragszeile **nach** dem Laden (im Querformat
117 px statt 39 px). Wo kein `laden()` vorausgeht, stößt niemand nach. Gemessen:
`--geraet pixel7 --ausrichtung quer --ohne-labor` → Zoom 0,334, während `einpassen()` für
die dann gültige Fläche 0,3766 hergäbe. **Beleg, dass es nicht an `android/mobil/`
liegt:** dasselbe Muster zeigt das Tablet-Profil, für das die Telefon-Anordnung gar
nicht greift (`--geraet tablet --ausrichtung quer --ohne-labor`: Zoom 0,9151 gegen
eingepasst 1,0319). Mit `--mit-start` (dem echten Nutzerpfad) und im geladenen Labor
stimmt der Zoom exakt mit dem Maximum überein.

### Behoben: die Absenderzeile im Postfach wurde im Querformat zerschnitten

**Befund** (von „mobil-pruefer“ gemessen, im Bild sichtbar): In der Auftragsliste des
Postfachs war `.sp-mail-von` („Mira Kaya · Salon Lockenwerk") **mitten durch die
Buchstaben** abgeschnitten — 10 px sichtbarer Platz, 18 px gebraucht; betroffen
`pixel7/quer` und `gross/quer`, dunkel und hell.

**Wurzel — und sie lag in dieser Schicht:** `.sp-mail` ist ein `<button>` **und**
zugleich ein Flex-Element der scrollenden Spalte `.sp-pf-liste`
(`src/stil/spiel.css:204-205`). Eine **feste** `min-height` ersetzt dort die
automatische Mindestgröße (`min-height:auto` = min-content-Größe des Eintrags), und
damit darf der Eintrag schrumpfen. Mit der pauschalen Zusage
`button { min-height: 44px !important }` wurde er im Querformat (363 px Höhe) auf 44 px
gedrückt; der Text hatte darin keinen Platz mehr. Im Hochformat fiel es nicht auf, weil
die Liste genug Höhe hat.

**Heilung:** die Zusage gilt jetzt allen Knöpfen **außer** diesem Listeneintrag —
`button:not(.sp-mail) { min-height: 44px !important; }` plus
`.sp-mail { min-height: auto; }` (das ausdrückliche `auto` ist nötig, weil sonst die
ältere Regel `button{min-height:40px}` aus Teil 1 weiter gilt). Ohne feste Mindesthöhe
bleibt der Eintrag auf Inhaltshöhe, und **die Liste scrollt stattdessen** — genau das
Verhalten, das der Behälter (`overflow:auto`) vorsieht. Die 44-px-Zusage bleibt erfüllt:
der Eintrag ist von Natur aus ~90–115 px hoch.

**Nachgemessen:**
`mobilprobe.py --geraet pixel7 --ausrichtung hoch,quer --lauf --mit-ansichten` →
**„Alle Ansichten" 2/2 grün** (vorher 8/12 bei mobil-pruefer), Postfach quer 14 Knöpfe,
**0 unter 44 px**, 0 außerhalb; die zwei verbleibenden „abgeschnittenen" Elemente im
Postfach sind die **absichtliche** `-webkit-line-clamp:2` der Vorschau (so auch im
Hochformat, das immer grün war). Bild:
`Nachweise/android/nachher-fix-pixel7-quer-dunkel-ansicht-postfach.png`.
Der Laborlauf `--lauf --ziehprobe --mit-start` bleibt grün: hoch 100 % · 0,5027 · 5,8 %
· 0 von 44 · Kabel 5→6, quer 93,9 % · 0,4957 · 7,4 % · 0 von 44 · 5→6.

**Nicht geändert, aber geprüft:** Im rechten Detailbereich (`.sp-leser`) liegt der Knopf
„Weiterarbeiten" als **gewollter** Klebebalken über dem Text
(`src/stil/spiel.css:251`: „bleibt sichtbar, wenn der Brief länger ist als der Platz").
Der Bereich hat `overflow:auto` — im Bild ist der Bildlaufbalken zu sehen —, der Text ist
also vollständig erreichbar; die Aufnahme zeigt einen Zustand mitten im Scrollen. Der
Klebebalken gehört zum Spiel, nicht in die Anpassungsschicht.

### Behoben: zwei ungestylte Fremdknöpfe auf dem Tablet

`.nl-fab-geraete` und `.nl-fab-dock` bekommen ihre Gestalt nur in der Telefonstufe
(kurze Seite ≤ 640 px). Auf einem Tablet standen sie deshalb ungestylt über der
Zeichenfläche — von „mobil-pruefer“ gemessen: 74 × 44 px bei x154 y99 und 71 × 44 px bei
x228 y99, `display=inline-block`, „überdeckt die Zeichenfläche: ja“. Seit der Korrektur
stehen sie in derselben Regel wie die übrigen Zutaten von `mobil.js`
(`.nl-mehr, .nl-menue, .nl-griff, .nl-fab { display: none; }`); die Telefonstufe setzt
mit `display: flex` wieder ein. **Nachgemessen:** `mobilprobe.py` führt jetzt eine Spalte
`nlFab` („im DOM / davon sichtbar“) — Telefon hoch und quer **2/2**, Tablet hoch und quer
**2/0**; die Zahl der sichtbaren Knöpfe auf dem Tablet fiel von 29 auf 27 (hoch) bzw. 30
auf 28 (quer). `nl-im-menue` ist bewusst **nicht** in dieser Regel: das ist nur eine
Markierung an vorhandenen Kopfknöpfen, kein eigener Behälter — würde man sie verstecken,
verschwänden auf dem Tablet drei echte Knöpfe.

## Projektprüfungen (unverändert grün, Stand 06.10.2026)

| Prüfung | Ergebnis |
|---|---|
| `sh tools/test.sh` | **213/213 grün** |
| `node tools/sim-stand.js` | Simulation unverändert gegenüber dem Referenzstand |
| `python tools/klassen.py` | 0 Klassen ohne CSS-Regel |
| `python tools/einfach.py --pruefen docs/index.html` | eigenständig, keine Außenverweise |
| `python tools/lernmotor.py` | Kopie entspricht der Quelle |
| `python tools/starttest.py android/bau/assets/index.html` | lädt, rendert, 3 Schriften da, 0 JS-Fehler |
| `mobilprobe.py --statisch` (mobil-pruefer) | mobil.css und mobil.js 1× eingehängt, CSS vor JS, JS als letztes Skript, aus `spiel.html` reproduzierbar |
| `mobilprobe.py --lauf --thema dunkel,hell --ziehprobe` | 12 von 12 gewerteten Profilen grün |

`src/` wurde nicht angefasst. `docs/index.html` und `Netzwerk-Labor.html` sind
unberührt (der Android-Bau schreibt seine Einzeldatei nach `android/bau/`).

## Nebenbefund: der Bau ist nicht byte-gleich über Python-Umgebungen

Beim Vergleich fiel auf: `docs/index.html` (2.193.491 B) und ein frischer Bau
(2.193.687 B) unterscheiden sich um **196 Bytes** — genau 14 Schriften × 14 Bytes.
Ursache ist der MIME-Typ in der Daten-URI: `font/woff2` (10 Zeichen) gegen
`application/octet-stream` (24 Zeichen). `tools/einfach.py` fragt `mimetypes.guess_type`
— und das liest unter Windows die Registry. Fehlt dort `.woff2`, wird daraus
`application/octet-stream`. **Die Schriften laden trotzdem** (im Starttest alle drei
„geladen“), weil Browser das Format an den Bytes erkennen. Nicht geändert, nur
gemeldet: es ist eine Frage der Nachvollziehbarkeit, nicht der Funktion — und eine
Änderung an `tools/einfach.py` gehört in einen eigenen Schritt mit eigenen Tests.

## Nachtrag: die tiefer genesteten Menüs (06.10.2026, zweite Runde)

Gefunden von einem Expertenteam (menu-auditor, mobil-verifier, build-engineer, superviser als
Qualitätstor) und nachgemessen mit dem neuen Werkzeug **`tools/menueprobe.py`** — es klickt in
einem echten Browser (headless Edge, Gerätemaße emuliert) die tiefen Ebenen durch:
Geräteblatt → Kategorie-Fach → Gerätewahl → Kontextmenü → Port-Menü, Kopf-⋯ → Dialog,
Ansicht-/Zoom-Menü, Dock-Blatt → Reiter, Auftrags-⋯, Auftragsmappe. Je Ebene wird geprüft:
liegt sie ganz im Bild, ist sie in einem scrollenden Behälter eingesperrt, Trefferflächen
unter 44 px, Überdeckung durch eine spätere Ebene, und ob sie sich wieder schließt.

| Befund | vorher (gemessen) | nachher (gemessen) |
|---|---|---|
| `.pa-zu` (Fach schließen) | 40 × 44 px, in **allen** 5 Profilen | **44 × 44 px** |
| `.dialog-zu` (Dialog schließen) | 40 × 44 px | **44 × 44 px** |
| `.lb-dock-einklappen` | 32 × 44 px (Tablet/Schreibtisch) | **44 × 44 px** |
| `.wahl-knopf` (Einstellungen) | 40 × 44 px | **44 × 44 px** |
| `.nl-griff` (Dock zuschieben) | 96 × 18 px | **96 × 44 px** |
| Dock-Reiter ohne Beschriftung | 35 px breit (Tablet) | **44 px** |
| Dock-Reiterleiste, 5 Reiter | Inhalt 499 px in 393 px Platz, „Akte“ 2 px sichtbar, „Dock einklappen“ außerhalb | Beschriftungen ab 560 px Dockbreite aus, alles sichtbar |
| Eingeklapptes Dock-Blatt | **412 × 520 px** groß und deckend über der Leinwand; Trefferprobe auf „Auswählen“, „Kabel verlegen“, „Ping“ landete auf `lb-dock` | **412 × 109 px**; 6 Knöpfe, **0 nicht treffbar** |
| „null“ im eingeklappten Reiterstreifen | sichtbarer Textknoten „null“ (`replaceChildren(null)`) | weg (`.filter(Boolean)`) |
| Menüprobe gesamt | 18 Verletzungen in 5 Profilen | **49 Kriterien erfüllt, 0 verletzt** |

Dazu zwei Befunde außerhalb der Telefon-Anordnung, die aber auf jeder Fassung lagen:

- **Die Auftragsmappe deckte die Werkzeugleiste zu** (menu-auditor, echtes WebView2-Fenster
  1280 × 800, echte Maus): bei offener Mappe trafen alle vier Knöpfe der oberen Leiste auf die
  Mappenreiter, ein Klick auf „Ansicht“ öffnete nichts. Ursache: `.lb-auftrag{z-index:5}` trägt
  die Mappe (`spiel.css:31`, `z-index:30`), die Leisten hatten keine eigene Ebene. Jetzt
  `z-index:10` (benannte Leiter, `tools/ethos.py` R6) an `.lb-leiste-oben`/`.lb-leiste-unten`.
  Nachgemessen: alle drei Werkzeugknöpfe erreichbar, 0 verdeckt.
- **Die Karriere-Overlays schlossen nicht mit Escape** („Prüfung AP1“, „Mini-Ticket“);
  `karriere.js` hängte keinen Tastenhörer ein, anders als `spiel.js:434-443` und `hub.js:13-21`.
  Nachgemessen: 1 Overlay → nach echter Escape-Taste 0.

**Was NICHT geprüft ist** (unverändert offen): kein echtes Android-Gerät und kein Emulator; die
sicheren Ränder (Notch, Gestenleiste) sind auf dem Messplatz 0 px; Langdruck als Kontextmenü;
eine echte Wischgeste am Dock-Blatt; ob die Port-Punkte (Ø 11 px) mit dem Finger zu treffen sind;
die tiefen Ebenen auf einem Tablet; `--drehprobe`/`--zoomprobe`/`--zoomwechsel` nach den
Änderungen.

Dazu zwei **Reste ohne Reparatur**, gemessen und bewusst offen gelassen:

- **Das Port-Menü erreicht man mit dem Finger nicht.** Der Weg dorthin ist Umschalt beim
  Loslassen eines Kabelzugs (`src/ui/editor-werkzeuge.js` prüft nur `e.shiftKey`); ein Telefon
  hat keine Umschalttaste. Gemessen von „mobil-verifier“: Der Fingerzug legt das Kabel an
  (5 → 6), das Menü erscheint aber nicht. Der übliche Weg „nächster freier Port“ funktioniert;
  wer den Port selbst wählen will, braucht eine Tastatur. Ob das so bleiben soll, ist eine
  Entscheidung des Nutzers.
- **Auf sehr flachen Fenstern (640 × 360) liegen die untersten Einträge eines langen Fächers
  oder Kontextmenüs unter der Kante** — der Behälter scrollt, sie sind per Bildlauf erreichbar.
  Kein Abschneiden, sondern die Bildlaufgrenze.

⬆️ [[10-Projekte/Lernprojekte/Netzwerk-Labor/Liesmich|Netzwerk-Labor]] · 🏠 [[Start]]
