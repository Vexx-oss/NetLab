# Review – Betrieb-Werkzeuge (R2, Teil A und B)

> **Auftrag.** Abgegrenzter Teil von `task-17` (Punkte 1–3 dort macht `fehlertexte`):
> **A)** Prüfwerkzeuge der `AGENTS.md`-Tabelle durchgehen und die ohne GUI/Browser lauffähigen ausführen —
> je Werkzeug Befehl · Ergebnis · Aussagekraft für den neuen Stand.
> **B)** Prüfen, ob `tools/ablaeufe.py`, `tools/ethos.py`, `tools/klassen.py`, `tools/paket.py`,
> `tools/seite-pruefen.py`, `tools/menueprobe.py` und `bauen.py` **feste Listen** von Modulen, CSS-Dateien
> oder Ansichten führen, in denen die neuen Dateien fehlen (das wäre P1: das Werkzeug prüft ins Leere und
> meldet fälschlich grün).
>
> **Grenzen dieses Laufs.** Geschrieben wurde **nur diese Datei**. Nicht ausgeführt: `python bauen.py`,
> `python tools/einfach.py`, `python tools/repo-verweise-flicken.py` (Auftrag), `python tools/q-echt.py`,
> `python android/bauen.py`, die Klassenraum-Proben und `shell/entwickeln.ps1` (GUI, Android bzw. außerhalb
> des Auftrags). Alle Zahlen unten sind in diesem Lauf gemessen, nichts geschätzt; nicht Gemessenes steht
> als „nicht gelaufen“ da.

## 0 · Messbedingungen

| Punkt | Wert | Beleg |
|---|---|---|
| Stand | Commit `c341c2d` „Hilfestellung: Hilfe dahin, wo der Azubi steht“ | `git log --oneline -3` |
| Baukennung Quellstand | `1ac4d858` | `python -c "import bauen; print(bauen.baukennung())"` (nur gerechnet, nichts geschrieben) |
| `docs/index.html` | `1ac4d858`, 2.525.927 B | `LABOR_BAU`-Zeile gelesen |
| `web/index.html` | `1ac4d858` | `LABOR_BAU`-Zeile gelesen |
| `Netzwerk-Labor.html` | `1ac4d858`, byte-gleich zu `docs/index.html` | SHA256 beider Dateien: `1D147476F13CA092…`, je 2.525.927 B |
| Veröffentlichte Seite | `b74f840f` (Vor-Stand) | `tools/seite-pruefen.py`; `git show 9cd66aa:docs/index.html` liefert genau `b74f840f` |
| Neue Dateien im Bau | 9 JS-Marken + 5 CSS-Marken = **14 von 14** | Marken `/* ---- <pfad> ---- */` in `docs/index.html` und `web/index.html`, je 1 Treffer |

Weil Quellstand, `docs/index.html` und `web/index.html` dieselbe Kennung tragen, messen die Browser-Werkzeuge
den **neuen** Stand — die Android-Seite dagegen nicht (siehe P2‑1).

## A · Prüfwerkzeuge: Ergebnis je Werkzeug

| Werkzeug | Befehl | Ergebnis (gemessen) | Aussagekräftig für den neuen Stand? |
|---|---|---|---|
| Tests (headless) | `node tests/run.js` | **395/395 grün, 0 ROT, exit 0** (46 Testdateien, 81 Module) | **ja** — Stand der Tabelle ist 395 |
| Minimalismus-Regelwerk | `python tools/ethos.py` | **GRÜN**; 26 CSS-Dateien, 2.079 Zeilen; R9 0, R10 87 (genau der eingefrorene Stand) | **ja** — neue CSS-Dateien werden mitgezählt, ohne neue Verletzung |
| Klassen ↔ CSS | `python tools/klassen.py` | **0 Klassen ohne CSS-Regel** | **ja** — um 09:45 war es 1 (`st-knopf`), Baustein A lieferte `src/stil/stufensystem.css` um 09:55:26 nach |
| Simulation gegen Referenz | `node tools/sim-stand.js` | „Simulation unverändert gegenüber dem Referenzstand.“ | **ja** |
| GitHub-Abläufe | `python tools/ablaeufe.py` | **GRÜN**, alle Abläufe gültig und vollständig | **ja** |
| Rauchtest der Oberfläche | `python tools/rauch.py --ohne-bau` | vor der Ergänzung **36/36 grün, exit 0** (3 Breiten × (1 Auftrag + 11 Ansichten)); nach der Ergänzung um „Training“ **39/39 grün, exit 0** (12 Ansichten × 3 Breiten) | **ja nach der Ergänzung** → P1‑1 (im Arbeitsbaum behoben und nachgemessen) |
| Menüprobe Android | `python tools/menueprobe.py --datei android/bau/assets/index.html --lauf` | **GRÜN: 5 Profile, 49 Kriterien erfüllt, 0 verletzt** | **null** — die Zahl stimmt, sagt über den neuen Stand aber **nichts** → P2‑1 |
| Menüprobe Web | `python tools/menueprobe.py --datei web/index.html --lauf` | **ROT**: 1. Lauf 36 erfüllt/43 verletzt, 2. Lauf 12/22; Profil „schreibtisch“ (Maus) GRÜN 9/0 | **vorbestehend, nicht von uns** → P2‑2 |
| Drei Randbefunde | `python tools/nachprobe-menuefix.py` | **GRÜN: „alle drei Befunde behoben“**, exit 0 | **ja** (Editor-Menüs, vom neuen Stand unberührt) |
| Bilder der Doku | `python tools/bilder.py --pruefen` | **GRÜN**, 8 Bilder vorhanden und zugeordnet | **ja** |
| Testnamen-Falle | `node tools/pruefe-namen-flicken.js` (Trockenlauf) | 46 Dateien geprüft, **0 laden nicht**, 11 Namen würden umgesetzt | **ja** → P3‑2 |
| Lernmotor-Kopie | `python tools/lernmotor.py` | **GRÜN: GLEICH** (beide 86 Zeilen, SHA256 `66084b81…`) | **ja** |
| Veröffentlichte Seite | `python tools/seite-pruefen.py` | **GRÜN**, HTTP 200, 2.269.597 B, 14/14 Schriften, 0 Außenverweise — **aber** Baukennung dort `b74f840f` | **nein → P2‑3** |
| Einzeldatei | `python tools/einfach.py` | **nicht gelaufen** (Auftrag). Ersatz read-only: `docs/index.html` ↔ `Netzwerk-Labor.html` **byte-gleich**, beide `1ac4d858` | ja (Ersatzmessung) |
| Bauen | `python bauen.py` | **nicht gelaufen** (Auftrag). Ersatz read-only: Kennung Quelle = `docs/index.html` = `web/index.html` → Bau ist aktuell | ja (Ersatzmessung) |
| Tote Verweise | `python tools/repo-verweise-flicken.py` | **nicht gelaufen** (schreibt) → tote relative Verweise in Markdown nach dem Commit **ungeprüft** | offen |
| Lernmotor-Rückfall | `python tools/lernmotor-rueckfall.py` | **nicht gelaufen** (verschiebt die Quelle außerhalb des Projekts). Ersatz: Kopie == Quelle byte-gleich → der Rückfall lädt identischen Code | ja (Ersatzmessung) |
| Echtes Programm | `python tools/q-echt.py` | **nicht gelaufen** (startet die `.exe`, GUI) | offen |
| Android-APK · Klassenraum-Proben · PC-Hülle | `python android/bauen.py` · `cargo`/`C-http-probe.ps1` · `pwsh shell/entwickeln.ps1 -NurBauen` | **nicht gelaufen** (Android laut Nutzerentscheidung unangetastet, Klassenraum unberührt, Hülle baut/schreibt) | nicht nötig |

### Befunde mit Priorität

**P1‑1 · Der Rauchtest öffnete die neue Ansicht „training“ nie. — im Arbeitsbaum behoben, nachgemessen.**
*Behauptung:* `tools/rauch.py` führt eine **feste Ansichtsliste**; die im neuen Stand hinzugekommene Ansicht
„training“ fehlte darin, der Lauf meldete trotzdem grün.
*Beleg (Stand der Messung, Commit `c341c2d`):* `tools/rauch.py:175-187` — `FAELLE` mit genau 11 Fällen
(Heute, Postfach, Labor · Störung/Fernwartung/Adressplan/Plan-Audit/Hotline, Kunden, Wiki, Lernstand, Shop).
Kein „training“. Die Ansicht existiert: `src/ui/app.js:23` (`REIHE` enthält `"training"`) und
`src/ui/training.js:133` (`UI.app.registrieren("training", …)`). Gemessen: 3 Breiten × (1 + 11) = **36 Fälle,
36/36 grün** — die 12. Ansicht wurde nicht gebaut.
*Risiko im Betrieb:* Die Abnahme „36/36 grün“ sagte nichts über die neue Trainingsansicht; JS-Fehler,
waagerechter Überlauf, verdeckte Hauptaktion oder leere Flächen dort wären nicht aufgefallen.
*Behoben (fremde Hand, uncommittet):* `tools/rauch.py:190` ergänzt einen Fall
`("Training", "__rauch.ansicht('training')", [".tr-karte .tr-knoepfe .knopf.primaer", ".tr-kopf .tr-summe"], None)`
— die feste Ansichtsliste führt jetzt **12 Fälle statt 11**.
*Nachgemessen von mir:* `python tools/rauch.py --ohne-bau` → **39/39 grün, exit 0**, in allen drei Breiten
„✓ Training · Starten (6 min)“.
*Erledigt:* `AGENTS.md` (Zeile „+ Rauchtest der Oberfläche“) nennt inzwischen **39/39 (12 Ansichten × 3 Breiten,
seit 07.10.2026 mit „Training“)** — die Zahl ist nachgezogen.
*Hinweis:* `tools/rauch.py` gehört **nicht** zu den sieben in Auftrag B genannten Dateien — die P1-Frage dort
ist mit **Nein** beantwortet (Abschnitt B). Diese Ansichtsliste ist die **einzige feste Liste im ganzen
Werkzeugsatz**, in der etwas Neues fehlte; alle Modul- und CSS-Listen nehmen per `glob` auf.

**P2‑1 · Die Android-Menüprobe ist grün — die Aussage über den neuen Stand ist null.**
*Behauptung:* Die 49/0 aus der `AGENTS.md`-Tabelle sind für den neuen Stand **nicht** aussagekräftig: die Zahl
stimmt, die Aussage ist null.
*Beleg:* `android/bau/assets/index.html` ist vom **07.10.2026 08:36** und enthält **0 Treffer** für
`stufensystem.js`, `lernstand-hilfe.js`, `ui/training.js`, `hilfen.js`, `trainings.js`, `start.css`
(sechs Einzelabfragen). Der Lauf selbst: GRÜN, 5 Profile, 49 erfüllt, 0 verletzt, exit 0. Die Android-Fassung
wurde auf Nutzerentscheidung **bewusst nicht angefasst**.
*Risiko:* Wird „49/49 grün“ als Nachweis für den neuen Stand berichtet, ist das ein **falsches Grün** —
die gemessene Seite kennt die Hilfestellung nicht.
*Erledigt:* `AGENTS.md` führt die Einschränkung inzwischen direkt in der Zeile „Tiefe Menüebenen“: „das prüft
die Android-Fassung … Die Zahl ist grün, sagt über den aktuellen Quellstand aber **nichts**“.
*Nächster Schritt:* Für den neuen Stand `--datei web/index.html` messen (siehe P2‑2) und in Berichten die
gemessene Datei samt Datum/Baukennung mitführen.

**P2‑2 · Die Web-Menüprobe ist rot — vorbestehend, nicht von uns.**
*Behauptung:* `python tools/menueprobe.py --datei web/index.html --lauf` endet rot; die Verletzungen stammen
**nicht** aus der Hilfestellung, sondern sind älter als der Commit.
*Beleg (eigene Läufe):* 1. Lauf: „ROT: 5 Profil(e), 36 Kriterien erfüllt, 43 verletzt“; 2. Lauf: „12 Kriterien
erfüllt, 22 verletzt“ — u. a. Profil `schreibtisch` (Maus) GRÜN 9/0, `klein-hoch` ROT 3/19, `tablet-hoch`,
`telefon-hoch`, `telefon-quer` je ROT 0/1. Die Verletzungen sind Trefferflächen unter 44 px in
**Editor-Menüs** (Ebene 2/3 Fach, 4 Kontextmenü, 8 Ansicht-Menü, 9 Zoom-Menü, 10 Dock-Blatt) — keine davon in
den neuen Ansichten.
*Einordnung:* `fehlertexte` hat dieselbe Messung gegen `HEAD~1` gefahren und **identische Zahlen** erhalten
(fremde Messung, von mir übernommen — ich habe keinen Vorher-Lauf gemacht): **vorbestehend, keine
Verschlechterung durch `c341c2d`**. Offen bleibt nur, dass meine zwei Läufe am **selben** Stand verschiedene
Summen ergaben (43 gegen 22 Verletzungen) — ein Hinweis auf Zustandsabhängigkeit des Werkzeugs, nicht auf
einen Schaden.
*Nächster Schritt:* Nichts gegen die Hilfestellung; bei Gelegenheit entscheiden, ob die 44-px-Regel nur für
die Android-Fassung gilt (die Web-Fassung wird mit Maus bedient) oder die Editor-Knöpfe nachgezogen werden.
Bis dahin: im Bericht „vorbestehend, rot aus dem Editor, nicht aus dem neuen Stand“.

**P2‑3 · Die veröffentlichte Seite ist ein Stand zurück.**
*Behauptung:* `tools/seite-pruefen.py` ist grün, prüft aber nicht den neuen Stand.
*Beleg:* Werkzeugausgabe: „HINWEIS: Baukennung dort b74f840f, lokal 1ac4d858“; HTTP 200, Version dort 1.2.3.
`git show 9cd66aa:docs/index.html` → `LABOR_BAU = "b74f840f"` (der Commit **vor** `c341c2d`).
*Risiko:* Wer die Adresse öffnet, spielt die Fassung **ohne** Hilfestellung; die Werkzeugmeldung „GRUEN“
verleitet zu „online ist aktuell“.
*Nächster Schritt:* Veröffentlichung nachziehen (`docs/SITZUNGSABSCHLUSS.md`, Schritt „veröffentlichen“) und
danach `tools/seite-pruefen.py` erneut laufen lassen; erwartet wird dort `1ac4d858`.

**P3‑1 · `nachprobe-menuefix.py` brach im ersten Lauf ab.**
*Beleg:* Erster Lauf (in einer Kette aus drei Browser-Werkzeugen): Messungen für 1280 × 800 waren da,
danach `FEHLER: der Browser meldet sich nicht auf dem Steuerport.`, exit 1. Zweiter Lauf allein:
**„GRÜN: alle drei Befunde behoben“**, exit 0.
*Risiko:* Ein Abbruch sieht wie ein Befund aus; die Ursache (Port/Fensterstart) ist nicht gemessen.
*Nächster Schritt:* Werkzeug allein aufrufen und den Exit-Code werten, nicht die Textausgabe.

**P3‑2 · Elf Prüfnamen tragen noch die Anführungszeichen-Falle.**
*Beleg:* `node tools/pruefe-namen-flicken.js` (Trockenlauf): „46 Datei(en) geprüft, 0 geschrieben,
0 laden nicht“ und „würde flicken“ für `tests/spiel-speichern.test.js` (1), `tests/spiel-stufensystem.test.js`
(1), `tests/spiel-training.test.js` (4), `tests/spiel-varianten.test.js` (1), `tests/spiel-wirtschaft.test.js`
(1), `tests/ui-training.test.js` (3).
*Risiko:* Heute laden alle Dateien; die Falle bleibt aber bestehen und hat am 07.10.2026 dreimal den ganzen
Lauf mit `LADEFEHLER` (Exit 2) angehalten.
*Nächster Schritt:* `node tools/pruefe-namen-flicken.js --setzen` (schreibt) durch den Lead, danach erneut
`node tests/run.js`.

**P3‑3 · Die eingefrorenen Kennzahlen in `tests/stil-stand.json` sind veraltet.**
*Beleg:* Datei nennt `kennzahlen.dateien = 21`; gemessen sind es **26** CSS-Dateien (2.079 Zeilen, 5.847
Deklarationen gegen eingefrorene 1.878/5.450). Verglichen werden von `ethos.py` nur die **Regelzahlen**
(`pruefe_gegen_stand`, `tools/ethos.py:369-382`) — die sind unverändert und grün.
*Risiko:* Keines für die Abnahme; die Datei beschreibt den Umfang aber falsch.
*Nächster Schritt:* Bei der nächsten Verbesserung `python tools/ethos.py --neu --stand tests/stil-stand.json`
(damit ziehen die Kennzahlen mit) — nur mit Freigabe, die Datei gehört zum Regelwerk.

**P3‑4 · Momentaufnahme `klassen.py` 1 → 0.**
Um 09:45 meldete `python tools/klassen.py` **1** Klasse ohne CSS-Regel (`st-knopf`,
`src/ui/stufensystem.js:24`); `src/stil/stufensystem.css` entstand um **09:55:26**, danach **0**. Das ist
kein Befund gegen den Stand, sondern ein Hinweis auf die Reihenfolge gleichzeitiger Arbeit: Zwischenstände
anderer Bausteine erzeugen kurzzeitig rot.

## B · Feste Dateilisten — Ergebnis

**Antwort: NEIN.** Keines der sieben genannten Werkzeuge führt eine feste Liste von Modulen oder CSS-Dateien,
in der die neuen Dateien fehlen. Sie nehmen alle per `glob` auf:

| Werkzeug | Feste Liste? | Beleg | Neue Dateien dabei? |
|---|---|---|---|
| `bauen.py` | nur **Reihenfolge** (Kopf-/Schlussdateien je Schicht) | `bauen.py:37-47` `SCHICHTEN`; Vollständigkeit per `bauen.py:60` `sorted(p.name for p in d.glob("*.js"))` und `bauen.py:124` `sorted(p.name for p in d.glob("*.css"))` | **ja** — 14/14 Marken im Bau |
| `tools/ethos.py` | nein (Stand-Datei führt nur Regelzahlen) | `tools/ethos.py:126`, `:323`, `:387` `STIL.glob("*.css")` | **ja** — 26 Dateien gezählt |
| `tools/klassen.py` | nein | `tools/klassen.py:31` `(SRC/"stil").glob("*.css")`, `:38` `(SRC/"ui").glob("*.js")` | **ja** — `lh-`-Klassen wurden gefunden |
| `tools/paket.py` | nein (baut aus dem fertigen Bau) | `tools/paket.py:43-48` `WEB_INDEX`/`WEB_STIL`/`SCHRIFTEN`; Sammeln per `rglob` (`:165`, `:182`, `:203`, `:213`) | **ja** — Inhalt steckt in `web/index.html` |
| `tools/seite-pruefen.py` | nur eine feste **Zahl** | `tools/seite-pruefen.py:29` `ERWARTETE_SCHRIFTEN = 14` (Ist: 14) | **ja** (keine Modulliste) |
| `tools/menueprobe.py` | nur die **Profile** (Absicht) | `tools/menueprobe.py:40-46` `PROFILE` (5) | **ja** (keine Modulliste) |
| `tools/ablaeufe.py` | nein | `tools/ablaeufe.py:267` `ORDNER.glob("*.yml") + ORDNER.glob("*.yaml")` | **ja** |

Zwei feste Listen außerhalb der sieben, beide bewusst und unschädlich für die neuen Dateien:
`tests/run.js:23-26` (`SCHICHTEN`, ohne die Schicht `ui` — seit der Freigabe von `require` in `tests/run.js:42`
laden UI-Tests ihre Datei selbst) und `tools/ci-nachbau.py:60-70` (`SCHRITTE` = die CI-Schritte).

Die **einzige** feste Liste im ganzen Werkzeugsatz, in der etwas Neues fehlte, ist die Ansichtsliste `FAELLE`
in `tools/rauch.py` (11 Fälle ohne „training“; seit dem 07.10.2026 **12 Fälle** mit „Training“, `tools/rauch.py:190`)
— siehe **P1‑1**. Dateilisten mit fehlenden Modulen: **keine**.

## C · Nächste Schritte, kurz

1. **P1‑1:** erledigt — `tools/rauch.py:190` (12 statt 11 Fälle), von mir nachgemessen **39/39 grün**, und
   `AGENTS.md` nennt in der Rauchtest-Zeile inzwischen **39/39 (12 Ansichten × 3 Breiten)**.
2. **P2‑3:** Veröffentlichung nachziehen, danach `seite-pruefen.py` erneut (erwartet `1ac4d858`).
3. **P2‑1:** Die Android-Zahl (49/0) nicht als Nachweis für den neuen Stand verwenden — die Einschränkung
   steht jetzt in `AGENTS.md`; für den neuen Stand `--datei web/index.html` messen.
4. **P2‑2:** Web-Menüprobe ist **vorbestehend rot** (identisch zu `HEAD~1`, fremde Messung) — nichts gegen
   die Hilfestellung; nur die 44-px-Frage im Editor bleibt offen.
5. **P3‑2:** `pruefe-namen-flicken.js --setzen` einmal laufen lassen (schreibt 11 Namen um).
6. **Offen aus meinem Auftrag:** `tools/repo-verweise-flicken.py` (schreibt, deshalb nicht gelaufen) und
   `q-echt.py` (GUI) — beide bleiben ungemessen.

*Gemessen am 07.10.2026 im Arbeitsbaum `ausbau-1.2`, Commit `c341c2d`, Baukennung `1ac4d858`.*
