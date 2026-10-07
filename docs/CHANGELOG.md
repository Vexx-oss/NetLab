# Änderungsverlauf

Der Verlauf ist aus der echten Commit-Historie abgeleitet, nicht aus Erinnerung. Die
ausführlichen Begründungen, Messwerte und verworfenen Versuche stehen in
[`Design – Spielspaß 2.0.md`](<entwicklung/Design – Spielspaß 2.0.md>) und
[`Plan – Ausbau 1.2.md`](<entwicklung/Plan – Ausbau 1.2.md>).

Zweig: `ausbau-1.2` (Standardzweig). Tags: `endversion-1.0`, `v1.1`, `v1.2.0`, `v1.2.1`, `v1.2.2`, `v1.2.3`.

---

## 1.2.1

Nur die Lizenz — der Grund für eine eigene Fassung: **das Release `v1.2.0` enthielt noch
die MIT-Lizenz.** Wer es heruntergeladen hat, hätte das Spiel kommerziell nutzen dürfen.

- `LICENSE` → **PolyForm Noncommercial 1.0.0**, `LIZENZ.md` entsprechend neu geschrieben,
  README und die Paket-Anleitung nachgezogen. Der verbindliche Wortlaut kommt von
  [polyformproject.org](https://polyformproject.org/licenses/noncommercial/1.0.0) und ist
  unverändert übernommen, nur mit Copyright-Zeile und dem Hinweis für kommerzielle
  Anfragen davor.
- Versionsnummer auf `1.2.1` in `bauen.py`, `Cargo.toml` und `tauri.conf.json`, damit die
  Fassung mit der neuen Lizenz von der alten unterscheidbar ist.

Die Windows-`.exe` wurde in dieser Fassung **ebenfalls neu gebaut** und nennt sich jetzt
`1.2.1` — sie trägt die Lizenz zwar nicht in der Binärdatei, soll aber dieselbe Fassung
melden wie der Rest. Ihr Start wurde gemessen (siehe unten).

---

## 1.2.2 — Tag `v1.2.2` (Android-Oberfläche und Bau)

Schwerpunkt: Fehler in den **tiefer genesteten Menüs** der Android-Fassung, gefunden und
belegt von einem Expertenteam (vier Teammitglieder, ein Qualitätstor), gemessen mit
`tools/menueprobe.py` (neu), `android/werkzeuge/mobilprobe.py` und einem echten
WebView2-Fenster.

**Tiefe Menüebenen — vier Trefferflächen waren zu klein**

- `.pa-zu` (Fach schließen), `.dialog-zu` (Dialog schließen) und `.lb-dock-einklappen`
  (Dock einklappen) waren **40 × 44 px**, der `.nl-griff` am Dock-Blatt **96 × 18 px** —
  in JEDEM der fünf gemessenen Profile. Ursache: `min-height` deckt nur die Höhe, die
  Breite stand als `width` in einer Klasse (`src/stil/editor.css:29`, `rahmen.css:146`,
  `editor.css:305`). Jetzt `min-width: 44px` bzw. `min-height: 44px` in `mobil.css`.
- `.wahl-knopf` (Umschalter in den Einstellungen: Hell/Dunkel/System, An/Reduziert/Aus)
  war 40 × 44 px — dieselbe Ursache (`rahmen.css:162`). Jetzt ebenfalls 44 px breit.

**Auftragsmappe deckte die Werkzeugleiste zu**

- Bei offener Mappe trafen alle vier Knöpfe der oberen Werkzeugleiste auf die Mappenreiter;
  ein Klick auf „Ansicht“ öffnete nichts. Ursache: `.lb-auftrag{z-index:5}` trägt die Mappe
  (`spiel.css:31`, `z-index:30`), die Leisten lagen ohne eigene Ebene darunter. Jetzt
  `z-index:10` aus der benannten Leiter (`tools/ethos.py`, R6) an beiden Leisten.

**Dock: Reiterleiste und eingeklapptes Blatt**

- Die Reiterleiste war bei fünf Reitern 499 px breit in 393 px Platz: Der Reiter „Akte“
  lag als 2-px-Streifen am Rand, „Dock einklappen“ ganz außerhalb, und der Bildlauf war
  ausgeblendet. Die Container-Schwelle von 380 px griff bei 393 px Dockbreite nicht —
  jetzt 560 px, und die Reiter behalten mit `min-width:44px` ihre Fingerfläche.
- Das **eingeklappte** Blatt blieb 412 × 520 px groß und deckend über der Leinwand; die
  Trefferprobe auf „Auswählen“, „Kabel verlegen“ und „Ping“ landete auf `lb-dock`. Jetzt
  schrumpft es auf die Reiterleiste (**412 × 109 px**, gemessen), die sechs Knöpfe sind
  wieder treffbar.
- Im eingeklappten Reiterstreifen stand sichtbar **„null“**: `replaceChildren(null)` macht
  aus dem Argument den Text „null“. Jetzt `.filter(Boolean)` (`editor.js:153-158`).

**Karriere-Overlays schließen mit Escape**

- „Prüfung AP1“ und „Mini-Ticket“ blieben nach Escape offen — `karriere.js` hängte keinen
  Tastenhörer ein, anders als `spiel.js:434-443` und `hub.js:13-21`. Nachgezogen.

**Schriften: der MIME-Typ hing an der Windows-Registry**

- `tools/einfach.py` fragte `mimetypes.guess_type`; fehlt `.woff2` in der Registry, wurde
  daraus `application/octet-stream` — 14-mal, 196 Bytes größer und nicht byte-gleich zu
  einem Bau auf Linux. Jetzt feste Tabelle (`FESTE_TYPEN`/`typ_von`). Zweimal aufgerufen:
  beide Läufe **14× `font/woff2`, 0× `application/octet-stream`**, identische Prüfsumme.

**Bau: Entwicklungsrunde in Sekunden**

- Neu `shell/entwickeln.ps1`: baut `web/` und die Hülle im **Debug-Profil**. Gemessen:
  erster Lauf 3 m 11 s (Abhängigkeiten), **jede weitere Runde 4,2 s** — gegenüber
  104–176 s Release-Neu-Link. Die Auslieferung bleibt Release (`cargo tauri build`).
- `android/werkzeuge/mobilprobe.py` brach bei jedem Start ab (`%` in einem `help=`-Text,
  argparse formatiert mit `%`). Eine Zeile: `%%`.

**Neues Werkzeug**

- `tools/menueprobe.py` — fährt die tiefen Menüebenen in einem echten Browser ab
  (Geräteblatt → Fach → Gerätewahl → Kontextmenü → Port-Menü, Kopf-⋯ → Dialog,
  Ansicht-/Zoom-Menü, Dock-Blatt → Reiter, Auftrags-⋯, Auftragsmappe) und prüft je
  Ebene Lage, Abschneiden, Trefferflächen, Überdeckung und den Schließ-Zustand.
  Stand: **5 Profile, 49 Kriterien erfüllt, 0 verletzt.**

**Drei weitere Menüfehler aus dem Audit behoben (Desktop, damit auch Android-Tablet)**

- **Menü am Fensterrand:** Ein Menü mit 26 Einträgen (Port-Wahl) ragte 3–4 px unten aus dem
  Fenster. Ursache: `UI.menue()` maß **vor** dem Setzen von `left`/`top` und klemmte mit
  267 × 510 statt 273 × 520. Der erste Versuch, das Element zum Messen mit `hidden`
  (also `display:none`) anzuhängen, machte es schlimmer — ein unsichtbares Element liefert
  für **jedes** Rechteck 0, die Klemmung rechnete mit Höhe 0 und das Menü lief 506 px aus
  dem Fenster. Jetzt misst die Klasse `.nl-messend` mit `visibility:hidden` (Layout bleibt,
  Animation aus): **0 px Überstand** bei 1280 × 800 und 720 × 640.
- **Terminal-Sitzungen:** Bei vier Sitzungen lag der aktive Reiter außerhalb der Leiste
  (720 × 640: scrollWidth 517 in 239 px), und `scrollbar-width:none` versteckte den einzigen
  Hinweis darauf. Jetzt `scrollbar-width:thin` **und** der Bildlauf wird ausdrücklich auf
  den aktiven Reiter gesetzt (`scrollIntoView` allein genügte nicht — selbst gemessen: bei
  1280 × 800 blieb der vierte Reiter rechts draußen). Nachgemessen: der aktive Reiter ist in
  beiden Fenstern ganz sichtbar und mit der Mitte treffbar.
- **Zwei Bildlaufleisten in der Auftragsmappe:** Der Reiter „Plan“ scrollte doppelt
  (`.am-inhalt` und `.am-plan` getrennt begrenzt). Jetzt wächst der Plan mit, gescrollt wird
  die Mappe — gemessen: **1 scrollender Bereich** statt 2.

Nachprobe: `python tools/nachprobe-menuefix.py` → **GRÜN: alle drei Befunde
behoben** (1280 × 800 und 720 × 640). Menüprobe, Dock-Probe und Testbatterie bleiben grün.

**Veröffentlichte Fassung: Tag `v1.2.2`.** Die Fassungsnummer steht in `bauen.py`,
`shell/src-tauri/Cargo.toml` und `shell/src-tauri/tauri.conf.json` — ein Skript hat sie
gezogen und dabei im `Cargo.lock` **nur** den eigenen Block geändert (die beiden fremden
Pakete mit derselben Nummer blieben unberührt, sonst wäre die Sperrdatei beschädigt).

- Browser-Einzeldatei `docs/index.html` = `Netzwerk-Labor.html`: 2.269.597 Bytes,
  SHA256 `e44e4c6b…`, meldet `LABOR_VERSION = "1.2.2"`.
- Android-App `Programm/Netzwerk-Labor-1.2.2-Android.apk`: 988.700 Bytes, versionCode
  **10202** (unverändert — die Bauzählung steigt nur, wenn sie muss), versionName 1.2.2,
  signiert (v2+v3), keine Berechtigungen. Die 1.2.1 liegt als `.apk.beiseite` daneben.
- Windows-Programm `Programm/Netzwerk-Labor.exe`: neu gebaut (Rust 1.97.1, 4m 25s), meldet
  als Produkt- und Dateiversion **1.2.2**. **Start gemessen** (`python tools/q-echt.py`):
  Fenster offen, erster Auftrag mit echter Maus gelöst, 5 ★, 0 Fehler, Fernwartungs-Schild
  sichtbar, eigene Instanz wieder beendet.
- Geprüft auf dem Endstand: 251/251 Tests grün, `ethos.py` GRÜN, 0 Klassen ohne CSS-Regel,
  `tools/menueprobe.py` 5 Profile / 49 Kriterien / 0 verletzt, `tools/seite-pruefen.py` GRÜN.

---

## 1.2.3 — Tag `v1.2.3` (Klassenraum-Spezifikation; Spiel unverändert)

Diese Fassung bringt **keine neue Spielfunktion**. Sie liefert den Arbeitsauftrag „Klassenraum"
(Lehrer-/Schüler-Instanz als Hobby-Ebene: die Lehrkraft sagt einen Code an, jedes Gerät baut denselben
Auftrag selbst — ohne Konto, Server oder Netz) in **umsetzungsreifer** Form: jede offene Frage
entschieden, jede Zahl gemessen. Der Spielkern ist unverändert; geändert haben sich die
Fassungsnummern und die Dokumentation.

**Neu**

- `docs/entwicklung/Klassenraum – Umsetzungsreife Spezifikation.md` — der Vertrag (Code-Format, API,
  Speicherform, zwei Endpunkte, 40 Testfälle, Abnahme, Reihenfolge, Entscheidungen).
- `docs/entwicklung/Klassenraum/` — vier Teil-Dokumente (A Codec/Determinismus · B Oberfläche/Ablauf ·
  C Rust/Live/QR · D Prüfung/Abnahme) samt `Liesmich`.
- `tools/auftraege/KLASSENRAUM-umsetzungsreif.md` — der geschärfte Auftragstext zum Weitergeben.
- `tools/klassenraum/` — eigenständiger Rust-Server **ohne jede Kiste** (`Cargo.toml` ohne
  `[dependencies]`), `GET /liste` und `POST /ergebnis`, idempotent, Datensparsamkeit erzwungen.
- `tools/klassenraum-probe/` — wiederlaufbare Proben (Codec über alle 2²⁰ Nutzlasten, QR-Encoder mit
  unabhängiger Python-Referenz, HTTP-Probe, Belegprüfer).

**Gemessen (in dieser Fassung nachgerechnet)**

| Prüfung | Ergebnis |
|---|---|
| `sh tools/test.sh` | **251/251 grün** (35 Testdateien, 76 Module) |
| `python tools/ethos.py` · `tools/klassen.py` · `node tools/sim-stand.js` | GRÜN · 0 Klassen ohne CSS-Regel · Simulation unverändert |
| `python bauen.py` | 107 Module, 1.699 KB → `web/index.html` (Version 1.2.3) |
| `python tools/einfach.py` (+`--ziel`) | 2.269.597 B, **0 Außenverweise**, beide Erzeugnisse byte-gleich |
| `python tools/seite-pruefen.py` | GRÜN — mit dem erwarteten Hinweis, dass die **alte** veröffentlichte Seite noch 1.2.2 lieferte |
| `python android/bauen.py` | GRÜN — APK 1.2.3, versionCode 10203 (vorher musste `VERSION_CODE` von 10202 auf 10203 steigen, sonst verweigert Android den Bau über die alte Fassung) |
| `python tools/q-echt.py` | `.exe` startet, erster Auftrag (`salon-01`) mit echter Maus gelöst, **5 ★**, 0 Fehler, 5 Bildschirmfotos, eigene Instanz wieder beendet |

**Erzeugnisse**

- Browser-Einzeldatei `docs/index.html` und `Netzwerk-Labor.html`: **2.269.597 B**,
  SHA256 `0927CA947F31D226B072D4CF450AAE6A4439ECD7F83781388A2FA2E2F783E176` (beide gleich).
- Windows-Programm `Programm/Netzwerk-Labor.exe`: **8.217.088 B**, SHA256
  `5F6A8C8136700436FFFDB5DC249CFDFFE580A4D602F3694116EE253D716E3E12`, Produkt- und Dateiversion
  **1.2.3**, Start gemessen (Bildschirmfotos in `Nachweise/1.2-Q/`).
- Android `Programm/Netzwerk-Labor-1.2.3-Android.apk`: **988.700 B**, SHA256
  `581D194C84238BA52D001369975FDD26276EB2145D8241F062188799D0F23E00`, versionCode **10203**,
  versionName 1.2.3, signiert (v2+v3), keine Berechtigungen. Die 1.2.2 liegt daneben.

**Nachtrag 07.10.2026 — die `.exe` hängt jetzt am Release**

Bisher fehlte die Windows-Fassung im Release: der Ablauf läuft auf `ubuntu-latest` und kann keine
Windows-`.exe` bauen, und ins Git gehört sie bewusst nicht (8 MB je Bau). Jetzt baut ein zweiter Job
auf `windows-latest` sie und hängt sie an — für dieses Release gemessen:

- `Netzwerk-Labor.exe`: **8.211.456 B**, Produkt- und Dateiversion **1.2.3**,
  SHA256 `28C7C6B4F411D325F99380D92DB66E1D2FA6D569CDFB8F0A0471C6C8AAB7E808`; stabiler Link
  `https://github.com/Vexx-oss/NetLab/releases/latest/download/Netzwerk-Labor.exe` (geprüft:
  `HTTP 200`, `Content-Disposition: attachment`).
- Bauweg im Ablauf: `python bauen.py` → `cargo build --release --features custom-protocol`
  (dieselbe Bauart wie `cargo tauri build --no-bundle`, nur ohne CLI). Laufzeiten des zweiten
  Anlaufs: Linux-Job **62 s**, Windows-Job **425 s**.
- Derselbe Weg auf dem Entwicklungsrechner ergibt eine **andere** Binärdatei (8.217.088 B, SHA256
  `E2735D79…5DD68`) — Rust-Bauten sind nicht bit-gleich. Beide melden 1.2.3; der Start der lokalen
  Fassung ist mit `python tools/q-echt.py` gemessen (Fenster offen, erster Auftrag mit echter Maus
  gelöst, 5 ★, 0 Fehler).
- **Gemessene Falle:** `gh release upload --clobber` scheitert beim Ersetzen gleichnamiger Anhänge
  mit `HTTP 404` auf `uploads.github.com` (erster Anlauf rot, Windows-Job dadurch übersprungen).
  Der Ablauf entfernt die alten Anhänge jetzt ausdrücklich, wartet 5 s und wiederholt den Upload —
  zweiter Anlauf: **beide Jobs grün**.
- Das Browser-Paket sagt den fehlenden Windows-Teil jetzt selbst: `tools/paket.py` hängt einen
  Hinweis vor `LIESMICH.txt` und `START-HIER.md`, wenn keine `.exe` enthalten ist (vorher stand dort
  eine Anleitung für eine Datei, die nicht im Paket lag).

**Nicht gemessen (ehrlich).** Rauchtest (`36/36`), Menüprobe und die fünf Vorführschritte des
Klassenraums: Edge startet in der Werkzeug-Sandbox nicht. Der Klassenraum ist **nicht umgesetzt** —
diese Fassung liefert die Spezifikation; der Server in der `.exe` (Stufe C1) ist beschrieben, aber nicht
gebaut.

---

## 1.2.0 — in Arbeit auf `ausbau-1.2`

105 Commits seit `v1.1`. Schwerpunkte:

**Versionsnummer nachgezogen**

- `VERSION` stand seit dem Tag `v1.1` unverändert auf `1.1.0`, obwohl `ausbau-1.2` seither
  105 Commits weiter ist — das gebaute Spiel nannte sich also weiter „v1.1.0". Jetzt
  `1.2.0` in `bauen.py`, `shell/src-tauri/Cargo.toml` und `shell/src-tauri/tauri.conf.json`.
  Kein Test hängt an der Nummer (geprüft: 213/213 unverändert grün).
- **Die Windows-`.exe` wurde am 06.10.2026 neu gebaut** (Rust 1.97.1, Tauri 2, 9m 21s) und
  liegt als 1.2.0 in `Programm/`. **Ihr Start ist gemessen:** `python tools/q-echt.py` fuhr
  im echten Programm durch — Fenster offen, erster Auftrag mit echter Maus gelöst, 5 ★,
  0 Fehler, Fernwartungs-Schild sichtbar, keine JS-Fehler. Beweisbilder in
  `Nachweise/1.2-Q/`. Zuvor war der Start zweimal an der Einzelinstanz-Sperre gescheitert
  (eine Instanz der Vorgängerfassung lief noch, Exitcode 0) — die wurde nicht angefasst,
  sondern der Nutzer beendete sie. Die alte Datei liegt als
  `Programm/Netzwerk-Labor-1.1.0.exe.beiseite` daneben (nicht im Git).

**Lizenz festgelegt: PolyForm Noncommercial 1.0.0**

- Bis hierher stand „Noch nicht festgelegt (alle Rechte vorbehalten)". Zwischenstand war
  **MIT** — das war zu weitgehend: MIT erlaubt ausdrücklich Verkauf und kommerzielle
  Nutzung, also genau das, was hier nicht gewollt ist.
- Jetzt **PolyForm Noncommercial 1.0.0** in [`LICENSE`](../LICENSE), erklärt in
  [`LIZENZ.md`](../LIZENZ.md). Die Wahl ist bewusst auf eine **anerkannte, fertig
  formulierte** Lizenz gefallen statt auf etwas Selbstgeschriebenes: Sie erlaubt alles
  Nicht-Kommerzielle (spielen, üben, unterrichten, studieren, weitergeben) und verbietet
  alles Kommerzielle, mit klaren Definitionen für „kommerziell", „Bildungseinrichtung"
  und „persönliche Nutzung".
- **Bildungseinrichtungen** sind ausdrücklich erlaubt, unabhängig von der Herkunft ihrer
  Mittel — eine bezahlte Schulung einer Firma oder eines einzelnen Trainers ist dagegen
  kommerziell und braucht eine gesonderte Erlaubnis.
- Die Grenze steht in `LIZENZ.md`: Der Quelltext ist öffentlich, und GitHub erlaubt
  jedermann das **Forken** — das ist Plattform-Bedingung und nicht abschaltbar. Verhindert
  wird die **Nutzung** über das Erlaubte hinaus. Wer den Code unter Verschluss halten will,
  muss das Repositorium auf privat stellen; dann ist allerdings nichts mehr einsehbar.

**Release wird automatisch angelegt**

- `.github/workflows/release.yml`: Ein Versions-Tag genügt. Der Ablauf prüft den Stand,
  baut das Auslieferungspaket und legt das Release mit den Anhängen an. Nötig, weil ein
  Release über die API ein Schreib-Token braucht, das auf dem Entwicklungsrechner nicht
  liegt (die API antwortet dort mit 401); ein Ablauf bekommt es von GitHub.
- **Erster Lauf gescheitert und behoben:** `tools/einfach.py` verlangte `web/index.html`,
  das auf einem frischen Klon fehlt (`web/` ist erzeugt). Jetzt baut das Werkzeug `web/` bei
  Bedarf selbst nach — damit ist es selbstgenügsam, egal wer es aufruft. Belegt mit einem
  frischen Klon ohne `web/`: derselbe Bau, dieselbe Prüfsumme.
- Ergebnis: Release
  [`v1.2.0`](https://github.com/Vexx-oss/NetLab/releases/tag/v1.2.0) mit zwei Anhängen.
  Beide laden mit `Content-Disposition: attachment` herunter (gemessen) — ein Klick.

**Auslieferung (neu in dieser Fassung)**

- `docs/index.html` — das ganze Spiel als **eine Datei**, Schriften eingebettet, keine
  Außenverweise. Läuft per Doppelklick und über GitHub Pages.
- **Zeilenenden normalisiert:** die Quellen sind gemischt (61 Dateien CRLF, 101 LF). Der
  Bau erbte das und schrieb 23.838 CRLF in `docs/index.html` — Git hätte die Datei als
  „ständig geändert" geführt, und der Bau auf Linux wäre nicht byte-gleich zu Windows
  gewesen. `bauen.py`, `tools/einfach.py` und `tools/bilder.py` lesen jetzt normalisiert
  und schreiben LF. Nebeneffekt: die Einzeldatei ist rund 24 KB kleiner.
- `tools/paket.py` — baut ein Auslieferungspaket (Ordner + ZIP) und prüft es per CRC32
  gegen das Original zurück.
- `tools/starttest.py` — startet die Einzeldatei in einem echten Browser (headless Edge,
  `file://`) und misst `#app`, CSS-Regeln, geladene Schriften und JS-Fehler.
- `tools/einfach.py` — baut die Einzeldatei aus `web/` und verweigert den Bau, wenn ein
  Außenverweis übrig bleibt.
- `.github/workflows/` — Prüflauf bei jedem Push, Veröffentlichung auf GitHub Pages.
  Beide Abläufe sind auf einem frischen Klon nachgestellt (`tools/ci-nachbau.py`): ohne
  die Nachbar-Spielhalle, ohne `Nachweise/` und ohne Pillow — genau der Zustand auf
  GitHub. Drei Fehler fielen dabei auf und sind behoben:
  `tools/lernmotor-bau.py` und `tools/lernmotor-rueckfall.py` brachen ohne die Spielhalle
  ab; `tools/bilder.py` verlangte Pillow schon beim Prüfen (auf dem Runner nicht
  installiert) und riss den ganzen Lauf mit; und ein zweiter Job im
  Veröffentlichungs-Ablauf ließ GitHub nach 902 s den *gesamten* Lauf abbrechen.
- **`fremd/lernmotor.js`** — der Lernmotor lag bisher außerhalb des Repositoriums
  (`../FISI-Spielhalle`). Ein frischer Klon war deshalb weder baubar noch testbar. Jetzt
  liegt der Stand im Repo, mit Herkunft und Prüfsumme im Kopf. Drei Werkzeuge weisen es
  nach: `tools/lernmotor.py` (Kopie gegen Quelle), `tools/lernmotor-bau.py` (Bau mit und
  ohne Spielhalle byte-gleich), `tools/lernmotor-rueckfall.py` (Tests **und**
  Simulationsvergleich laufen ohne Spielhalle).
- `tests/run.js` und `tools/sim-stand.js` hatten dieselbe Außenabhängigkeit und greifen
  jetzt ebenfalls auf die Kopie zurück — sonst wäre der Prüflauf auf GitHub gescheitert.
- `tools/test.sh` sucht Node jetzt auch im `PATH` (vorher war ein Windows-Pfad
  festgenagelt) — dasselbe Skript läuft damit auf GitHub.

**Ausbau 1.2, Phase 0 und A**

- Geräte-Fächer, Ansicht-Menü, Inspektor und Simulation erst bei Bedarf.
- Auftragszeile und Auftragsmappe, Textdiät, „Erklär mir das".

**Auftrag R — DHCP-Tiefe und Sicherheitsvorfälle**

- Lease-Laufzeit, Erneuerung bei 50 %, `domain`-Option, Reservierung, Adresskonflikt,
  Lease-Liste und die fünf Grundcodes (DHCP DORA, NAK, DECLINE).
- Rogue-DHCP und DHCP-Snooping über die Konsole (`ip dhcp snooping`).
- Zwei DHCP-Injektoren (fremder Server, Snooping ohne Trust).
- *Behobener Befund:* Der gesamte DHCP-Pool-Modus der Konsole war seit 1.0
  **wirkungslos** — der Test prüfte nur den Prompt. Ein Test, der nur den Prompt prüft,
  ist kein Test.

**Lesbarkeit der Topologie**

- Adressschilder weichen Geräten aus, Beschriftungen größer, Zoom gestaffelt,
  Tooltip mit allen Adressen, Klick auf eine Adresse kopiert sie (für Routing von Hand).
- Werkzeug-Kurztasten stehen jetzt sichtbar im Knopf (es gab sie schon, man fand sie nicht).
- Simulationsansicht: inhaltstragende Beschriftungen auf mindestens 12 px.

**Startprobleme (Befund, berichtigt)**

- Die `.exe` startete nicht (`failed to create webview`, `0x800700AA`). Erste Deutung
  (zwangsweise beendete `msedgewebview2.exe`) war **falsch**. Gemessene Ursache:
  Das Integritätslabel „Niedrig" auf dem Vault vererbt sich auf die `.exe`, die dadurch
  als Low-Prozess läuft und `%LOCALAPPDATA%` nicht beschreiben darf.
  `Programm/Integritaet-reparieren.cmd` setzt das Label ohne Administratorrechte zurück.

## 1.1.0 — Tag `v1.1` (01.10.2026)

- Konsole, Simulations-Panel und PDU-Ansicht richtig gestaltet — **in 1.0 fehlten diese
  Stylesheets ganz**.
- Einstieg: Coach-Hinweis erscheint sofort und wählt das passende Werkzeug vor.
- 15 Abzeichen, Fortschrittsbalken zur nächsten Stufe, Feierabend-Bilanz mit den morgen
  fälligen Themen.
- Prüfungstag und generierte Tickets nennen das **Symptom aus Kundensicht** statt der Ursache.
- Leiste aufgeklappt 320 × 300, Ecke aus den Einstellungen wirkt.
- Spielstand: zusätzlich „vorheriger Stand" (alle 15 min), wird bei beschädigter Datei
  zuerst geladen.
- Linux-Pakete bleiben auf Stand 1.0.

## 1.0.0 — Tag `endversion-1.0` (01.10.2026)

Erste vollständige Fassung: 37 handgeschriebene Tickets, 83 Mini-Tickets, 115 Tests grün,
Windows-`.exe` sowie Linux-Pakete (`.deb`, AppImage, `.tar.gz`).

## 2026-09-30 — Grundgerüst

`8769e8d` Grundgerüst, Architektur und Zwischenstände. Zwei Anläufe, beide am
Nutzungslimit abgebrochen.
