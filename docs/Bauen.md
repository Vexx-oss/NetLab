# Bauen, Testen, Ausliefern

Alles, was du brauchst, um aus dem Quelltext ein spielbares Programm zu machen. Wenn du
nur **spielen** willst: [README](../README.md) → *Sofort spielen*.

## Was du brauchst

| Werkzeug | Wofür | Bemerkung |
|---|---|---|
| **Python 3** | alle Bau- und Prüfwerkzeuge | keine Pakete nötig außer Pillow für `tools/bilder.py` |
| **Node 24** | Tests | portabel unter `%LOCALAPPDATA%\node-portable`, sonst aus dem `PATH` |
| **Rust + Tauri 2** | nur für die Windows-`.exe` | dazu WebView2 (bringt Windows 10/11 mit) |

`sh tools/test.sh` sucht Node in dieser Reihenfolge: `$NODE`, dann der portable Ordner,
dann `node` aus dem `PATH`. Auf GitHub läuft derselbe Befehl.

## Die vier Bausteine

```
src/ ──python bauen.py──▶ web/index.html ──python tools/einfach.py──▶ docs/index.html
                              │                                             │
                              │                                             └─▶ EINE Datei, überall spielbar
                              └─▶ Vorlage für die Rust-Hülle (shell/) ──▶ Netzwerk-Labor.exe
```

| Befehl | Ergebnis | Dauer |
|---|---|---|
| `python bauen.py` | `web/index.html` + `web/tests.html` (107 Module) | Sekunden |
| `python tools/einfach.py` | `docs/index.html` — das Spiel als **eine** Datei | Sekunden |
| `python tools/paket.py` | `dist/` — Ordner + ZIP für eine Release, geprüft (mit `.exe`, wenn `Programm/` sie hat → `-Windows.zip`, sonst `-Browser.zip`) | Sekunden |
| `cargo tauri build --no-bundle` | `netzwerk-labor.exe` (Rust-Hülle) | Minuten |

`python bauen.py` muss **immer vor** `cargo tauri build` laufen — die Hülle lädt `web/`.

## Die Einzeldatei

Der wichtigste Befehl für die Auslieferung. Er hängt die Schriften als Daten-URI in die
Seite und **verweigert den Bau**, wenn ein Außenverweis übrig bleibt (`<link>`,
`<script src>`, `<img src>`, `url()` auf eine Schriftdatei). Damit kann keine Fassung
entstehen, die heimlich nachlädt.

```bash
python tools/einfach.py                        # -> docs/index.html
python tools/einfach.py --pruefen              # nur prüfen
python tools/einfach.py --ziel /tmp/spiel.html # woandershin
```

Gemessener Stand (06.10.2026): **2.263.054 Bytes (2,16 MB)**, 14 Schriften eingebettet,
**0 Außenverweise**. Zum Vergleich: ohne eingebettete Schriften wären es 1,6 MB plus ein
Ordner daneben — und genau dieser Ordner ist die Fehlerquelle, wenn jemand nur die
`index.html` weiterreicht.

> **Bekannter Schönheitsfehler bei den Schriften** (gemessen, nicht behoben):
> `mimetypes.guess_type(".woff2")` liefert unter Windows `application/octet-stream`, weil
> die Zuordnung aus der Registry kommt. In der Datei steht deshalb
> `data:application/octet-stream;base64,…` statt `data:font/woff2;base64,…` — 14 Schriften
> × 14 Zeichen = **196 Bytes größer als nötig**, und eine Suche nach `font/woff2` findet
> nichts. Der Browser stört sich nicht daran (CSS-`@font-face` erzwingt den Typ nicht).
> Wer es beheben will, setzt die Typen in `tools/einfach.py` fest — dann ändern sich aber
> Größe und SHA256 der versionierten `docs/index.html`.

> **Zeilenenden.** Der Bau liefert **LF**, auf jeder Plattform. Die Quellen sind gemischt
> (61 Dateien CRLF, 101 LF, so gewachsen und bewusst nicht angefasst), im Repositorium gilt
> laut `.gitattributes` aber LF. Ohne Normalisierung erbte `docs/index.html` 23.838 CRLF:
> Git führte die Datei als „ständig geändert", und der Bau auf Linux wäre nicht byte-gleich
> zum Bau auf Windows. Deshalb lesen `bauen.py`, `tools/einfach.py` und `tools/bilder.py`
> mit Normalisierung und schreiben mit `newline="\n"`.

### Beweisen, dass sie läuft

`--pruefen` sagt nur, dass die Datei eigenständig **ist**. Ob das Spiel darin startet,
sagt `tools/starttest.py`: es lädt die Datei in einem echten Browser über `file://`
(genau der Weg eines Doppelklicks) und misst am geladenen Dokument.

```bash
python tools/starttest.py                          # docs/index.html
python tools/starttest.py pfad/zur/datei.html --bild beweis.png
```

Gemessen werden `#app`-Inhalt, sichtbarer Textanfang, CSS-Blätter und -Regeln, ob jede
der drei Schriften **wirklich geladen und wirklich benutzt** wird, und JS-Fehler.

> **Eine Falle, die dokumentiert bleiben soll:** `document.fonts.check('16px "Bricolage
> Grotesque"')` meldet `false` — die Schrift gibt es nur in Gewicht 600 und 800, und die
> Abfrage ohne Gewicht fragt 400 ab. Ein Test, der das nicht weiß, meldet einen Fehler,
> den es nicht gibt. `tools/starttest.py` prüft darum je Familie das Gewicht, das es
> wirklich gibt (400 / 800 / 400).

### Automatisch veröffentlichen

`.github/workflows/seite.yml` stellt die fertige, versionierte `docs/index.html` bei jedem
Push auf `ausbau-1.2` auf GitHub Pages. Danach ist das Spiel unter
**https://vexx-oss.github.io/NetLab/** mit einem Klick spielbar.

**Die eine Einstellung, die nur im Browser geht:**
*Settings → Pages → Build and deployment → **Source: „GitHub Actions"***.
Solange Pages aus ist, wird der Deploy-Schritt übersprungen und der Lauf bleibt **grün** —
er meldet in einer Notiz, was fehlt. Nach dem Einschalten läuft er von selbst.

> **Wenn die Adresse trotzdem 404 liefert** (gemessen 06.10.2026): Die Antwort war
> `Site not found · GitHub Pages`, obwohl der Ablauf grün war und `deploy-pages`
> erfolgreich meldete. Diese Kombination heißt: Es wurde veröffentlicht, aber die
> **Quelle** in den Einstellungen ist nicht „GitHub Actions" — dann wird eine Seite aus
> einem Zweig erwartet.
>
> Deshalb funktioniert jetzt **beides**:
>
> | Quelle in den Einstellungen | Was veröffentlicht wird |
> |---|---|
> | „GitHub Actions" | `docs/index.html` aus dem Ablauf |
> | Ein Zweig, Ordner `/` | `index.html` im Wurzelverzeichnis — eine Weiterleitung auf `Netzwerk-Labor.html` |
>
> Ohne die Weiterleitung im Wurzelverzeichnis findet Pages bei einer Zweig-Quelle keine
> `index.html` und antwortet mit 404. Die Weiterleitung ist absichtlich doppelt
> abgesichert: `meta refresh`, `location.replace` und ein sichtbarer Link.

> **Warum der Ablauf nicht selbst baut und keinen zweiten Job hat** (gemessen 05.10.2026):
> Zwei Dinge gingen schief, beide nachgestellt und behoben.
>
> 1. `actions/configure-pages` mit `enablement: true` sollte Pages selbst einschalten.
>    Laut Aktionsquelle braucht das ein Token **jenseits** des Standard-`GITHUB_TOKEN`
>    (PAT mit `repo`-Recht oder GitHub App mit `administration:write`). Der Schritt
>    scheiterte und riss den ganzen Lauf mit — die Tests liefen nicht einmal.
> 2. Ein zweiter Job („Ist Pages eingeschaltet?") wartete auf einen freien Läufer. Die
>    Läufe brauchten an diesem Abend 5–11 Minuten Anlauf; nach **902 Sekunden** brach
>    GitHub den *gesamten* Lauf ab, auch den bereits erfolgreichen Teil. Deshalb ist die
>    Prüfung jetzt ein Schritt im selben Job, und der Ablauf baut nicht mehr selbst —
>    das macht `pruefen.yml`.
>
> `python tools/ablaeufe.py` prüft beides dauerhaft: kein `enablement: true`, keine
> unbedingte Veröffentlichung, kein zweiter Job.

### Wenn ein Prüflauf als „cancelled" mit 0 Schritten dasteht

Gemessen am 05.10.2026: Mehrere Läufe von `pruefen.yml` bekamen **keinen Läufer** zugeteilt,
blieben rund 15 Minuten in der Warteschlange und wurden dann von GitHub abgebrochen —
Status `cancelled`, 0 Schritte, kein Runner. Das ist Verhalten der Plattform, **kein
Testergebnis**: es wurde nichts gemessen, also ist auch nichts rot.

Der Gegenbeweis liegt vor: Lauf `37367258747` (Job „Bauen und prüfen") hatte **alle 13
Schritte erfolgreich**, einschließlich Einzeldatei und Bilderprüfung. Derselbe Stand ist
zusätzlich hier nachgestellt und grün: `python tools/ci-nachbau.py`.

Nachholen von Hand: *Actions → Prüfen → Run workflow*. Damit sich nichts staut, hat der
Ablauf eine Concurrency-Gruppe je Zweig; zusätzlich läuft er nachts um 03:17 UTC.

## Das Auslieferungspaket

```bash
python tools/paket.py               # mit .exe, falls Programm/ sie hat -> ...-Windows.zip
python tools/paket.py --ohne-exe    # nur die Browser-Fassung -> ...-Browser.zip (so im Release)
python tools/paket.py --nur-ordner  # Ordner bauen, kein ZIP
```

Das Werkzeug baut die Einzeldatei frisch, sammelt alles Nötige ein, schreibt ein
`SIZES.txt` mit Prüfsummen und **liest das ZIP danach zurück**: CRC32 für jeden Eintrag,
und jede Datei Byte für Byte gegen den Ordner. Ein Paket, das sich nicht öffnen lässt,
fällt hier auf und nicht beim Nutzer.

Gebaut wird `dist/Netzwerk-Labor-<version>-<Windows|Browser>.zip` mit dem Inhalt
`Netzwerk-Labor-<version>/`. Welche der beiden Varianten entsteht, entscheidet **eine** Sache —
ob `Programm/Netzwerk-Labor.exe` da ist (oder `--ohne-exe` gesetzt wird):

```
Netzwerk-Labor.html            das Spiel als Einzeldatei (überall spielbar)
Netzwerk-Labor.exe             Windows-Programm mit Leiste und Tray   (nur Windows-Variante)
Integritaet-reparieren.cmd     falls die .exe kein Fenster zeigt       (nur Windows-Variante)
doku/                          die ganze Doku als lesbare Seiten (seit 07.10.2026)
START-HIER.md / LIESMICH.txt   Anleitung zum Losspielen
LIZENZ.md / LIZENZEN/          Lizenz des Programms und der Schriften
SIZES.txt                      Inhalt, Größen, Prüfsummen
```

> **`--ohne-exe` ist im Release-Ablauf Pflicht.** Ohne den Schalter nimmt `paket.py` die
> **lokale** `Programm/Netzwerk-Labor.exe`, wenn sie existiert — und die ist meist veraltet.
> Gemessen am 09.10.2026: sie meldete noch `1.2.3`, wäre aber als
> `Netzwerk-Labor-1.2.4-Windows.zip` veröffentlicht worden. Die echte `.exe` baut der
> Windows-Job in `release.yml` aus dem Tag und prüft dort, dass ihre `ProductVersion` zum Tag
> passt; der Linux-Job liefert deshalb nur die Browser-Fassung. `doku/` kommt in **beide**
> Varianten, denn wer die Einzeldatei herunterlädt, arbeitet oft ohne Netz.

Die Anleitungen kommen aus `Vorlagen/` — **eine** Quelle, kein zweiter Ort zum Pflegen.

### Eine Release anlegen

**Das macht ein Ablauf** ([`.github/workflows/release.yml`](../.github/workflows/release.yml)):
Sobald ein Versions-Tag gepusht wird, prüft er den Stand, baut das Auslieferungspaket und
legt das Release mit den Anhängen an.

```bash
git tag -a v2.0.3 -m "Netzwerk-Labor 2.0.3"
git push origin v2.0.3
```

Nach etwa einer Minute steht das Release unter
*Releases* — mit dem ZIP und der Einzeldatei `Netzwerk-Labor.html` als Anhänge; die
Windows-`.exe` folgt aus dem zweiten Job (Windows-Läufer, einige Minuten später).

> **Warum ein Ablauf und nicht von Hand:** Ein Release über die API anzulegen braucht ein
> Token mit Schreibrecht. Auf dem Entwicklungsrechner liegt keines (die API antwortet dort
> mit 401, gemessen 06.10.2026). Ein Ablauf bekommt von GitHub ein `GITHUB_TOKEN` und darf
> mit `permissions: contents: write` Releases anlegen.

> **Die `.exe` ist nicht im Release**, weil sie nicht im Git liegt (8 MB). Im Paket steht
> dann der Browser-Hinweis. Wer die Windows-Fassung anhängen will: `.exe` bauen
> (siehe unten), `python tools/paket.py` laufen lassen und das entstandene
> `dist/Netzwerk-Labor-<Version>-Windows.zip` im Release-Bildschirm von Hand hineinziehen.

Ein Tag allein ist noch kein Release: **GitHub legt Releases nie von selbst an.** Der
Reiter „Releases" bleibt leer, bis ein Ablauf oder ein Mensch einen anlegt. Die älteren
Tags `endversion-1.0` und `v1.1` haben aus demselben Grund bis heute kein Release.

> **Warum `Netzwerk-Labor.html` zusätzlich im Repositorium liegt** (2,2 MB, gegen die
> Regel „keine gebauten Dateien im Git"): Ein Download-Weg muss **einen** Klick brauchen,
> und ein Release-Anhang braucht eine Person, die ihn anlegt. Die Datei ist textbasiert
> und damit diffbar, wird bei inhaltlichen Änderungen mitgebaut und ist mit
> `docs/index.html` byte-identisch. Die 8-MB-`.exe` bleibt weiter draußen — sie gehört
> an eine Release, und dort **hängt sie seit dem 07.10.2026 automatisch** (siehe unten).

## Die Windows-`.exe`

```bash
python bauen.py                                    # zuerst!
cd shell/src-tauri
CARGO_TARGET_DIR=<schneller-Ordner>/target cargo tauri build --no-bundle
# Ergebnis kopieren nach Programm/Netzwerk-Labor.exe
```

**Automatisch im Release** (seit 07.10.2026): Der Ablauf
[`.github/workflows/release.yml`](../.github/workflows/release.yml) hat einen zweiten Job
(„Windows-Programm bauen und anhängen"), der auf `windows-latest` genau diese Reihenfolge
fährt — `python bauen.py`, dann `cargo build --release --features custom-protocol` (dieselbe
Bauart wie `cargo tauri build --no-bundle`, nur ohne die CLI) — die Fassung der `.exe` gegen
den Tag prüft und sie als **`Netzwerk-Labor.exe`** an das Release hängt. Damit ist der
Ein-Klick-Download stabil:

```
https://github.com/Vexx-oss/NetLab/releases/latest/download/Netzwerk-Labor.exe
```

Auf dem Entwicklungsrechner bleibt der Weg oben für `Programm/Netzwerk-Labor.exe` — dieser
Bau ist zusätzlich mit `python tools/q-echt.py` **gestartet** und geprüft worden
(07.10.2026: 3 m 45 s, 8.217.088 B, erster Auftrag mit echter Maus gelöst, 5 ★, 0 Fehler).

Die fertigen Programme und die Bildschirmfoto-Nachweise liegen **bewusst nicht im Git**
(`.gitignore`): 8 MB `.exe` und 22 MB Beweismaterial gehören nicht in die Historie.

## Die Android-App (`.apk`)

Seit 06.10.2026 gibt es eine Android-Fassung: dieselbe Browser-Fassung in einer
WebView-Hülle. Eigene Anleitung mit allen Grenzen: [`android/LIESMICH.md`](../android/LIESMICH.md).

```bash
python android/bauen.py                 # Spiel → Einzeldatei → APK → Prüfung
python android/bauen.py --ohne-spiel    # schneller, nimmt android/bau/spiel.html
python android/bauen.py --nur-pruefen   # Signatur, Kennwerte, Assets prüfen
```

Ergebnis: `Programm/Netzwerk-Labor-<Version>-Android.apk` (0,94 MB, signiert).
Nötig sind ein Android-SDK mit **build-tools ≥ 35** und ein JDK 17+.

**Zwei Versionszahlen, zwei Bedeutungen** (06.10.2026): `versionName` ist die
Spielversion aus `bauen.py` (`VERSION`) und bleibt **1.2.1**. `versionCode` ist die
Bauzählung und steht als eigene Zahl in `android/bauen.py` (`VERSION_CODE`, jetzt
**10202**) — aus 1.2.1 abgeleitet ergäbe sie 10201, also genau den Code der schon
gebauten APK. Android verweigert die Installation über eine alte Fassung, wenn der Code
nicht größer ist („App nicht installiert“). Deshalb ist er vom Namen entkoppelt und
steigt mit jeder APK, die das Haus verlässt; `version_lesen()` bricht ab, wenn
`VERSION_CODE` unter dem aus `versionName` ableitbaren Wert liegt.

**Die App dreht frei.** Bis 06.10.2026 stand im Manifest
`android:screenOrientation="sensorLandscape"` — Querformat festgenagelt. Jetzt steht dort
`unspecified` (Systemvorgabe, gepackter Wert −1): mit eingeschalteter Automatik dreht
die App in Hoch- und Querformat, bei ausgeschalteter bleibt sie in der Lage, die der
Nutzer eingestellt hat. `fullUser` und `fullSensor` wurden verworfen, weil sie eine
bewusste Systemeinstellung übergehen — die Begründung steht im Kopf von
`android/huelle/AndroidManifest.xml`.

Ein Dreh lädt die Seite **nicht** neu: `configChanges` fängt ihn ab (gepackt
`0x40007ffc`: orientation, screenSize, screenLayout, smallestScreenSize, keyboard,
keyboardHidden, navigation, touchscreen, density, uiMode, fontScale, colorMode, locale,
layoutDirection), `onConfigurationChanged` lädt ausdrücklich nichts, und für den Fall
einer trotzdem neu erzeugten Activity stellt `onSaveInstanceState`/`restoreState` die
Seite ohne `loadUrl` wieder her. Der Spielstand liegt in `localStorage` unter
`https://netzwerk-labor.local/` und überlebt auch das.

Der Bau prüft diese Zusage selbst (Schritt 7) und wird rot, wenn eine Bedingung verletzt
ist:

1. badging darf kein `android.hardware.screen.landscape/-portrait` nennen,
2. `screenOrientation` in der APK muss −1 sein,
3. `configChanges` muss orientation und screenSize enthalten,
4. **im Bytecode** der `classes.dex` in der APK darf `onConfigurationChanged` kein
   `WebView.loadUrl` aufrufen (`dexdump -d`, gezählt wird je Methode). Rot wird der Bau,
   sobald dort ein Aufruf steht; die Verteilung wird immer mitgedruckt (in der
   eingefrorenen Fassung: `onCreate 1x` für den Start, `onReceivedError 1x` für den
   Fehler-Rückfall). Das ist der Ersatz für den Gerätetest, der hier nicht möglich ist —
   siehe „Ehrliche Grenzen“.

Gemessen an der eingefrorenen APK vom 06.10.2026 (980.508 Bytes, SHA256 `46c90213…`,
Seite darin `a2bba5cf…`):

```
package: name='oss.vexx.netlab' versionCode='10202' versionName='1.2.1' platformBuildVersionName='14' platformBuildVersionCode='34' compileSdkVersion='34' compileSdkVersionCodename='14'
uses-feature-not-required: name='android.hardware.touchscreen'
```

Kein `uses-permission` (die App darf nicht ins Netz), kein Orientierungsmerkmal.

Zwei Läufe hintereinander ergeben denselben Inhalt, aber **nicht** dieselbe SHA256: die
ZIP-Zeitstempel entstehen bei jedem Lauf neu. Die **Größe** taugt nicht als Kennung:
`apksigner` hängt einen Signaturblock von genau 4.096 Bytes an, und davor wird auf eine
4.096er-Grenze aufgefüllt. An der Endfassung nachgerechnet (Bytes aus der Datei selbst,
„Nutzdaten" = komprimierte Daten plus lokale Köpfe):
Nutzdaten 974.195 + Füllung 653 + Signaturblock 4.096 + Verzeichnis 1.542 + Abschluss
22 = 980.508. Zuwächse bis zur nächsten Grenze verschwinden also in der Füllung — zuletzt
wuchsen die Nutzdaten um 3.229 Bytes (970.966 → 974.195) und die Füllung schrumpfte um
genau 3.229 Bytes (3.882 → 653): die Gesamtgröße blieb 980.508, obwohl die Seite eine
andere war (`b2329e3a…` → `a2bba5cf…`). Wer eine APK wiedererkennt, nimmt die **SHA256**,
nicht die Größe.

| Baustein | Wo | Was |
|---|---|---|
| Bau | `android/bauen.py` | aapt2 → javac → d8 → zipalign → apksigner, ohne Gradle |
| Hülle | `android/huelle/` | Manifest, `MainActivity.java`, Symbol, Thema |
| Anpassung | `android/mobil/` | `mobil.css`/`mobil.js`, beim Bau hinter das Spiel gehängt |
| Messen | `android/werkzeuge/mobilprobe.py` | Telefonmaße nachstellen, Kabelzug mit dem Finger, Bildschirmfoto |
| Symbol | `android/werkzeuge/ikone.py` | aus den Farben des Spiels (Pillow) |

Vier Dinge, die dabei gemessen wurden und leicht Zeit kosten, wenn man sie nicht weiß:

1. **`d8` aus build-tools 34.0.0 ist unbrauchbar** — es bricht bei jeder
   verschachtelten Klasse mit einer internen NullPointerException ab. Ab 36.0.0 geht es.
   `android/bauen.py` nimmt die höchste vorhandene Fassung.
2. **d8 ab build-tools 35 nimmt kein Verzeichnis mehr** als Eingabe, sondern
   einzelne `.class`-Dateien.
3. **`</head>` kommt in der gebauten Seite zweimal vor** — das Spiel liefert einer
   Attrappe-Webseite im Labor eine HTML-Vorlage als Zeichenkette mit. Zum Einhängen
   der Android-Anpassung wird deshalb die Stelle benannt (erstes `</head>` vor `<body>`,
   letztes `</body>` am Dateiende), nicht gezählt.
4. **`screenOrientation` frei heißt −1, nicht 0.** Im gepackten Manifest
   (`aapt2 dump xmltree --file AndroidManifest.xml`) ist −1
   `SCREEN_ORIENTATION_UNSPECIFIED`; **0 ist `SCREEN_ORIENTATION_LANDSCAPE`**, 6 war
   `SCREEN_ORIENTATION_SENSOR_LANDSCAPE` (die alte Sperre). Eine Prüfung auf „0 = frei“
   wäre also genau falsch herum. Ebenfalls gemessen: ein XML-Kommentar mit einer
   Zeile aus Bindestrichen (`-----`) macht das Manifest ungültig — `--` ist in einem
   XML-Kommentar verboten, aapt2 bricht dann ab.

`src/` bleibt unangetastet: die Anpassung gilt nur für die App.

## Repo-Angaben setzen (Beschreibung, Homepage, Themen)

Diese drei Angaben lassen sich **nicht** per `git push` setzen, sondern nur über die
GitHub-API mit einem Token — auf dem Entwicklungsrechner liegt keines (die API antwortet
dort mit 401, gemessen 06.10.2026). Dafür gibt es ein Werkzeug:

```bash
python tools/repo-angaben.py              # Trockenlauf: zeigt nur, was gesetzt würde
GH_TOKEN=ghp_xxx python tools/repo-angaben.py --setzen
```

Nötig ist ein **Fine-grained Token** mit Repository-Zugriff nur auf `NetLab` und der
Berechtigung **Administration: Read and write** (GitHub → Settings → Developer settings →
Personal access tokens). Das Token wird nur an `api.github.com` gesendet und nirgends
gespeichert. Die Homepage ist bereits gesetzt; Beschreibung und Themen fehlen noch.

Dasselbe Werkzeug kann die **Windows-Fassung an ein Release hängen** — die 8-MB-`.exe`
liegt nicht im Git und kann deshalb vom Release-Ablauf nicht mitgebaut werden:

```bash
python tools/paket.py                                        # erzeugt dist/*-Windows.zip
GH_TOKEN=ghp_xxx python tools/repo-angaben.py --hochladen    # hängt sie an das Release
```

Dafür braucht das Token zusätzlich **Contents: Read and write**.

Alles andere ist in Abläufe gewandert und braucht kein Token von Hand: Prüfen
(`pruefen.yml`), Veröffentlichen (`seite.yml`) und das Anlegen des Releases
(`release.yml`).

## Prüfwerkzeuge und die Testkette

`sh tools/test.sh` führt die Prüfungen in dieser Reihenfolge aus; jeder Schritt bricht den
Lauf ab, wenn er rot wird (gemessen an `tools/test.sh`, Zeilen 29–37):

| Aufruf | Reihenfolge |
|---|---|
| `sh tools/test.sh` | 1. `python tools/ethos.py` · 2. `node tests/run.js` (Tests) |
| `sh tools/test.sh --rauch` | 1. `node tests/run.js` · 2. `python tools/klassen.py` · 3. `python tools/ethos.py` · 4. `python tools/rauch.py` |

> **Achtung, leicht zu verwechseln:** `tools/klassen.py` läuft **nur** mit `--rauch`, und
> `ethos.py` steht dort **nach** `klassen.py` — im gewöhnlichen Lauf läuft `ethos.py`
> dagegen **vor** den Tests. Wer „ethos läuft nach klassen.py" schreibt, meint den
> Rauchtest-Pfad.

Stand 07.10.2026: **434/434 grün, 50 Testdateien, 83 Module, davon 0 übersprungen**. Neu in dieser
Runde sind die Hilfestellung (`spiel-stufensystem`, `spiel-hilfe-lernverbuchung`, `spiel-mini-denktexte`,
`spiel-hilfe-streifen`, `spiel-leiste-hilfe`, `spiel-training`, `ui-training`, `spiel-einstieg-stufe`,
`spiel-fehlertexte`, `daten-trainings`, `spiel-lernstand-hilfe`) sowie die beiden Gegenprüfungen
(`pruefung-hilfestellung`, `pruefung-wirkung`) und `doku-seite`. Die Schlusszeile meldet jetzt auch
**„davon N übersprungen"** — ein Test ohne eine einzige Zusicherung gilt als übersprungen und nicht
mehr stillschweigend als grün.

### `tools/ethos.py` — Minimalismus als Regelwerk

„Minimalistisch" ist als Adjektiv nicht prüfbar. `tools/ethos.py` macht daraus **zwölf
Regeln** für `src/stil/*.css` und zählt Literale im Quelltext:

| Nr | Regel |
|---|---|
| R1 | Farbe nur per Token — kein `#hex`/`rgb`/`hsl` außerhalb der Token-Blöcke |
| R2 | Radius nur aus Tokens (`var(--radius…)`, `999px` Pille, `50%` Kreis) |
| R3 | Schrift nur aus sechs Werten: 11, 12, 13, 15, 20, 28 px — kein `em`/`%`, keine halben Pixel |
| R4 | Abstand nur aus der Skala {0, 4, 8, 12, 16, 24, 32} px (negative Gegenstücke erlaubt) |
| R5 | Dauer nur aus {1 ms (Bewegung aus), 160 ms, 320 ms}; `var(--dauer)` erlaubt |
| R6 | `z-index` nur aus der benannten Leiter {10, 20, … 80} |
| R7 | `!important` nur in `basis.css` (Reset und Barrierefreiheit) |
| R8 | genau **ein** zentraler `@media (prefers-reduced-motion)`-Block (`basis.css`) |
| R9 | ein Selektor wird unter gleichen Bedingungen nur einmal definiert |
| R10 | keine identischen Regelblöcke (gleicher Inhalt, gleiche Bedingungen) |
| R11 | jede Zahl in einer Längen-Eigenschaft trägt eine Einheit |
| R12 | höchstens 6 sichtbare Bedienelemente je Ansicht — **DOM-Messung im laufenden Programm** |

```bash
python tools/ethos.py                       # alle Regeln messen
python tools/ethos.py --stand DATEI         # nur Verschlechterungen gegenüber DATEI sind rot
python tools/ethos.py --neu --stand DATEI   # Stand aus dem Ist-Stand einfrieren
python tools/ethos.py --gegenprobe          # baut absichtlich Verstöße ein — muss rot werden
python tools/ethos.py --dom                 # Regel 12 im laufenden Programm messen (tools/cdp.py)
python tools/ethos.py --lang                # alle Fundstellen statt der ersten fünf
```

* **Rückgabewert 1, sobald eine Regel rot ist.** Ohne `--stand` ist **jeder** Verstoß rot.
* Mit `--stand tests/stil-stand.json` sind die Altlasten eingefroren: **grün heißt „nicht
  schlechter als der Stand"**, nicht „jede Regel eingehalten". Die Meldung sagt das
  ausdrücklich („Eingehalten ist damit nicht jede Regel — der Stand friert die Altlasten
  ein").
* `--gegenprobe` **dreht die Bedeutung des Rückgabewerts um**: 0 ist das gute Ergebnis (er
  wurde rot), Vorbild `tools/rauch.py --gegenprobe`.
* **Regel 12 braucht `--dom`** (Browser über `tools/cdp.py`); ohne das wird sie
  übersprungen und im Bericht als „übersprungen" ausgewiesen — dann sind nur elf Regeln
  prüfbar.
* Gemessener Stand (06.10.2026): 21 Dateien, 1.897 Zeilen, 5.479 Deklarationen, 1.613
  Regelblöcke, 1.574 verschiedene Selektor+Kontext — GRÜN; die Gegenprobe schlägt bei
  allen elf prüfbaren Regeln an.

## Messen im echten Programm

```bash
python tools/cdp.py start --frisch     # startet die .exe mit Fernsteuerungs-Port
python tools/cdp.py eval "<js>"        # JavaScript auswerten
python tools/cdp.py shot bild.png      # Bildschirmfoto
python tools/cdp.py stop               # beendet nur die eigene Instanz
```

`python tools/q-echt.py` fährt damit eine vollständige Abnahme im echten Programm:
erster Auftrag per echter Maus, Sprechblase, Fernwartung, Bildschirmfotos.

> **Wenn das Programm schon läuft**, bricht `tools/cdp.py` mit einer Meldung ab und beendet
> **nichts**. Das ist Absicht (AGENTS.md Regel 1): Fremde Prozesse werden nicht angefasst.
> Also erst das laufende Programm über das Tray-Symbol beenden.

## Der Lernmotor

Das Netzwerk-Labor und die FISI-Spielhalle teilen sich **einen** Lernmotor.

```bash
python tools/lernmotor.py                  # Kopie gegen Quelle prüfen
python tools/lernmotor.py --neu-einlesen   # Kopie bewusst erneuern
python tools/lernmotor-bau.py              # Bau mit und ohne Spielhalle byte-gleich?
```

`fremd/lernmotor.js` liegt im Repo und macht es allein baubar. Liegt die Spielhalle
daneben, hat sie Vorrang. Der Herkunftskopf in der Kopie wird beim Bau **abgeschnitten**,
damit beide Wege byte-gleich bauen — sonst hätte die Kopie 1.000 Bytes mehr Inhalt im
Spiel als die Quelle.

## Wenn etwas klemmt

| Bild | Ursache und Abhilfe |
|---|---|
| `kein Node gefunden` | Node 24 installieren oder `NODE=/pfad/zu/node sh tools/test.sh` |
| `sh tools/test.sh` bricht mit `dirname`-Fehler ab | Git-`/usr/bin` fehlt im `PATH`: `& "C:\Program Files\Git\bin\bash.exe" -c 'export PATH=/usr/bin:/bin:$PATH; sh tools/test.sh'` |
| `.exe` zeigt kein Fenster | `Programm/Integritaet-reparieren.cmd` (Details in [`Nachweise/1.2-Start/BEFUND.md`](../Nachweise/1.2-Start/BEFUND.md)) |
| `einfach.py`: „Aussenverweise uebrig geblieben" | Eine neue Datei wird von außen geladen. Entweder einbetten oder bewusst im Spiel belassen und die Prüfliste in `tools/einfach.py` anpassen — **nicht** die Prüfung abschalten. |
| `lernmotor.py` meldet ABWEICHUNG | Die Spielhalle ist weiter. `--neu-einlesen`, dann Tests und `node tools/sim-stand.js`. |
