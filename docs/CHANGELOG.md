# Änderungsverlauf

Der Verlauf ist aus der echten Commit-Historie abgeleitet, nicht aus Erinnerung. Die
ausführlichen Begründungen, Messwerte und verworfenen Versuche stehen in
[`Design – Spielspaß 2.0.md`](<entwicklung/Design – Spielspaß 2.0.md>) und
[`Plan – Ausbau 1.2.md`](<entwicklung/Plan – Ausbau 1.2.md>).

Zweig: `ausbau-1.2` (Standardzweig). Tags: `endversion-1.0`, `v1.1`, `v1.2.0`, `v1.2.1`, `v1.2.2`, `v1.2.3`, `v1.2.4`, `v2.0.0` (über die GitHub-API gemessen am 09.10.2026); **`v2.0.1` folgt** mit dem Auffrischen dieser Fassung.

---

## 2.0.1 — Veröffentlichung des heutigen Standes (09.10.2026)

**Warum diese Fassung.** Die **Seite** war tagesaktuell (byte-gleich zum lokalen Bau), aber das **Release
`v2.0.0`** stammt vom 09.10.2026, **14:44 UTC** — es ist **älter** als die Output-Runde und enthält **keine
APK**. Ein Release lässt sich nicht ohne `--force` verschieben (Hausregel), also zieht die Fassung auf
**2.0.1** und bekommt ein **neues Tag**; die CI baut daraus ein frisches Release, und der neue Android-Job
hängt die APK als **vierten** Anhang an. **`v2.0.0` bleibt unverändert stehen** — es wird weder
überschrieben noch verschoben.

### Neu

- **Platz und Abdruck am geöffneten Auftrag.** Die Azubi-Ansicht „Mitarbeit" hat jetzt ein Feld **Platz**
  (1…31) und zeigt den **Klassenraum-Abdruck** des **tatsächlich geladenen** Netzes (`src/ui/klassenraum.js:265`,
  `:268`, `:279`; B § 6.5).
- **Das Namenstor in `tools/test.sh`.** Das Werkzeug `tools/pruefe-namen-flicken.js` fand die
  Anführungszeichen-Falle in Testnamen — aber **niemand rief es auf**; sie hat am 09.10.2026 **dreimal** den
  ganzen Lauf mit `LADEFEHLER` (Exit 2) angehalten. Jetzt läuft sein **Trockenlauf vor** den Tests (er
  schreibt nichts), prüft jede Testdatei zusätzlich mit `node --check` und bricht mit Hilfetext ab
  (`tools/test.sh:29-40`, `:44`, `:50`).
- **Fassung 2.0.1 gezogen** — **18 Stellen, 0 Fehler** (Trockenlauf zuerst): `bauen.py`,
  `shell/src-tauri/tauri.conf.json`, `Cargo.toml`, der **eigene** Block im `Cargo.lock`,
  `.github/workflows/release.yml`, `docs/Bauen.md`, `README.md`, `android/LIESMICH.md`, `docs/Liesmich.md`,
  `android/huelle/AndroidManifest.xml`. **`VERSION_CODE` 20002** von Hand: die Hausregel verlangt einen Wert
  **über** dem aus `versionName 2.0.1` abgeleiteten 20001, damit eine APK mit gleichem Namen, aber neuerem
  Bau installierbar bleibt (Begründung als Kommentar in `android/bauen.py:68-74`).
- **Der Release-Ablauf hängt die APK an.** Ein eigener Job **`android`** lädt den Signaturschlüssel aus zwei
  Repository-Secrets (`ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORT`) und hängt die APK als **vierten**
  Anhang neben Browser-ZIP, `.html` und `.exe`. Fehlen die Secrets, bricht **nur dieser Job** mit klarer
  Meldung ab — die drei anderen Anhänge kommen trotzdem, weil er mit `needs: release` **parallel** zum
  Windows-Job läuft. Absicht: `android/signatur/` liegt **nicht** im Git, und `android/bauen.py` würde sonst
  einen **neuen** Schlüssel erzeugen — eine APK, die sich nicht über eine alte Fassung installieren lässt,
  wäre schlimmer als keine.

### Prüfstand

| Prüfung | Ergebnis |
|---|---|
| `node tests/run.js` | **734/734 grün**, 82 Testdateien, 91 Module, **0 übersprungen**, Exit 0 (selbst gemessen) |
| `python bauen.py` | **128 Module, 2239 KB**, Version **2.0.1** (Lead) |
| Einzeldatei `docs/index.html` = `Netzwerk-Labor.html` | **2.830.266 B**, SHA256 `B048488874AA54C3A97F24CF2D8C462404A4AFC16BABE520F252421E23DBE0DC`, byte-gleich, **0 Außenverweise** (Lead; Größe und Hash selbst nachgerechnet) |
| Android-APK 2.0.1 | **1.164.828 B**, Signatur gültig — **ohne Prüfsumme**, sie ist **nicht reproduzierbar**: derselbe Quellstand ergibt jedes Mal einen anderen Hash (die 2.0.0-APK hatte bei gleicher Größe wieder einen anderen, gemessen `60F4CF99…`) |
| Fassung in den Erzeugnissen | **2.0.1** in `web/index.html`, `docs/index.html`, `Netzwerk-Labor.html`, `android/bau/assets/index.html` (selbst geprüft) |

### Nicht geprüft (ehrlich)

- **Der CI-Lauf ist nicht abgewartet:** ob das Release `v2.0.1` schon steht und ob der Android-Job
  durchläuft, ist hier **nicht gemessen**; die zwei **Secrets** kann nur der Nutzer anlegen.
- **Die Live-Seite** trug beim Schreiben noch die 2.0.0-Auslieferung; nach dem Push liefert sie 2.0.1.
- Die APK steht hier **ohne Prüfsumme** — sie ist nicht byte-reproduzierbar, nur ihre **Größe** ist stabil.
---

## 2.0.0 — Output-Runde: Trefferflächen, Altlasten und R12 (09.10.2026)

**Die dritte Runde derselben Fassung: die Oberfläche selbst.** Nach dem Fundament (Abschnitt weiter unten)
und dem Öffnungsweg (Abschnitt darunter) räumt diese Runde auf, was seit Fassung 1.2 als Altlast im
Regelwerk steht und was die Werkzeuge bisher nur **gemeldet**, aber nicht durchgesetzt haben:
Trefferflächen unter 44 px, Zeitwerte außerhalb der Skala, `z-index`-Deklarationen außerhalb der Leiter,
zusätzliche Bewegungsblöcke, doppelte CSS-Blöcke — und die Regel **R12**, die bisher **nichts gemessen**
hat. Sieben Ströme haben parallel gearbeitet.

Bezug: `AGENTS.md` (Befehlstabelle) · [`tests/stil-stand.json`](../tests/stil-stand.json) · `tools/ethos.py` ·
`tools/menueprobe.py` · `tools/rauch.py`.

### Was vorher gemessen war

| Prüfung | Vorher |
|---|---|
| `python tools/menueprobe.py --datei web/index.html` | **rot: 36 von 43 Kriterien erfüllt** — 44-px-Trefferflächen in den Editor-Menüs (seit 07.10.2026 in `AGENTS.md` dokumentiert, vorbestehend) |
| `python tools/menueprobe.py --datei android/bau/assets/index.html` | **rot** — im Lauf der Runde 38/4 mit drei Überdeckungen, später 49/8; Ursache: ein Menü mit `z-index: 40` lag **unter** dem Dock-Blatt (`45`) |
| `python tools/ethos.py` — R1 · R2 · R3 · R4 | **23** Farb-Literale · **122** Radien ohne Token · **206** Schriftwerte außerhalb der Skala · **539** Abstandswerte außerhalb der Skala |
| Regel R5 (Dauer nur 1/160/320 ms) | **70** Zeitwerte außerhalb der Skala |
| Regel R6 (`z-index` nur aus der Leiter) | **11** Deklarationen außerhalb der Leiter |
| Regel R8 (Bewegung aus: ein zentraler Block) | **5** weitere Bewegungsblöcke |
| Regel R10 (keine identische Blockdopplung) | **87** doppelte Blöcke |
| Regel R12 (höchstens 6 Bedienelemente je Ansicht) | **ohne Wirkung**: „0 sichtbare Elemente — eingehalten", also nie wirklich gemessen |
| `python tools/rauch.py` | **39/39** bei **12 Ansichten** — die zwei neuen Klassenraum-Ansichten fehlten |
| `src/stil/` | **14 Dateien** im Umfang der Runde (Aufnahme 17:06:43, jede Datei `== HEAD`); Quelle: [Befund – Output-Runde](<entwicklung/Befund – Output-Runde.md>) § 1 |

### Was geändert wurde

**Vierzehn CSS-Dateien in `src/stil/`** wurden angefasst — `editor.css`, `spiel.css`, `szene.css`, `juice.css`,
`rahmen.css`, `leiste.css`, `inspektor.css`, `ereignisse.css`, `karriere.css`, `hub.css`, `simulation.css`,
`terminal.css`, `akte.css`, `kundenakte.css`; Umfang **306 insertions(+), 260 deletions(-)**.

- **Trefferflächen ≥ 44 px.** `min-height`/`min-width` wurden **nicht kleiner**, `44px` kommt jetzt **11×**
  vor (vorher 3×), neu dazu `68px`; keine kleinere Schrift, **kein** Selektor ohne `font-size`.
- **R1–R4.** Farb-Literale, Radien, Schrift- und Abstandswerte wandern auf die Tokens und Skalen des
  Regelwerks.
- **R5 und R6.** Zeitwerte und `z-index`-Deklarationen kommen aus der Skala bzw. der benannten Leiter.
- **R8 — gelöscht, nicht verschoben.** Die fünf Zusatzblöcke in `juice.css`, `spiel.css` und `szene.css`
  sind **weg**; `basis.css` ist **byte-identisch** geblieben. „Bewegung reduzieren" heißt im Haus
  „**1 ms statt aus**" (`basis.css:91`), und der schärfere Schalter `html[data-bewegung="aus"]`
  (`basis.css:93`) ist unangetastet — „Bewegung aus" schaltet weiterhin wirklich ab.
- **R10.** Doppelte Blöcke sind durch **Zusammenschluss** verschwunden: Komma-Selektorlisten **119 → 158**
  (+39), Selektoren 1 819 → 1 818.
- **R12 wird messbar.** `tools/ethos.py` sagt ohne `--dom` jetzt ausdrücklich „**NICHT GEMESSEN**" statt
  still „0 sichtbare Elemente — eingehalten"; im Programm wertet **`ethos.r12_js()`** unverändert aus:
  `klasse` **6/6**, `Auftrag` **3/3** (drei Breiten, zwei Zustände, vier Gegenproben).
- **Menüprobe.** Die Ursache der Android-Überdeckung — ein Menü mit `z-index: 40` **unter** dem Dock-Blatt
  (`45`) — ist behoben; der Web-Bau kommt von 36/43 auf **45 erfüllt, 0 verletzt**.
- **Rauchtest erweitert.** Die zwei Klassenraum-Ansichten „Klasse" (Lehrkraft: Code anzeigen) und
  „Auftrag" (Azubi: Code eintippen und öffnen) sind als **echte Wege** dabei — **14 Fälle × 3 Breiten = 45**.
- **Dazu in dieser Runde:** das Wiki hat **zwei neue Seiten** — **„Klassenraum"** und **„Übergabe"**
  (jetzt **29 Seiten / 107 Abschnitte**, beide in der Ansicht und über die Suche erreichbar) —, und in
  `Nachweise/Klassenraum/` liegen **10 Bildschirmfotos und 1 Exportdatei** der fünf Vorführschritte
  (Drei-Geräte-Lauf: Code `NL-9ACQ-AM`, B und C messen denselben Abdruck `3U9JGE`, Ampel 1/2 → 2/2,
  Import überlebt den Neustart).

### Was danach gemessen ist

| Prüfung | Nachher |
|---|---|
| `python tools/menueprobe.py --datei web/index.html` | **GRÜN: 5 von 5 Profilen, 45 Kriterien erfüllt, 0 verletzt** (selbst gemessen) |
| `python tools/menueprobe.py --datei android/bau/assets/index.html` | **GRÜN: 5 von 5 Profilen, 49 Kriterien erfüllt, 0 verletzt** (selbst gemessen) |
| `python tools/ethos.py` | **GRUEN** — besser als der Stand: R1 23→22 · R2 122→113 · R3 206→195 · R4 539→514 · R5 70→0 · R6 11→0 · R8 5→0 · R10 87→0 |
| R12 im Programm (`ethos.r12_js()`) | `klasse` **6/6 ✓**, `Auftrag` **3/3 ✓** — drei Breiten, zwei Zustände, **vier Gegenproben** (Zahl der Leitung) |
| `python tools/rauch.py` | **45/45** (14 Ansichten × 3 Breiten; Zahl der Leitung, der Aufbau ist im Quelltext nachgezählt) |
| `sh tools/test.sh` | **725/725 grün**, 81 Testdateien, 91 Module, **0 übersprungen**, Exit 0 (selbst gemessen) |
| `python tools/klassen.py` · `node tools/sim-stand.js` | **0** Klassen ohne CSS-Regel · Simulation **unverändert** (selbst gemessen) |
| `python bauen.py` | **128 Module, 2225 KB** → `web/index.html` (Version **2.0.0**) (Zahl der Leitung) |
| Einzeldatei `docs/index.html` = `Netzwerk-Labor.html` | **2.829.477 B**, SHA256 `C3C51EDA6FBD8DD49F8EC390DEC92BD6C9B2A59A7BEC116FE493CF439056828E`, **0 Außenverweise**, byte-gleich (selbst nachgerechnet) |
| Android-APK 2.0.0 | **1.160.732 B**, SHA256 `A27751B2924705DDFD7E5CF4FA1A027DC552182D8B8010AEEC56493E49F93733`, Signatur gültig (selbst nachgerechnet) |

### Verworfen — und warum das hier steht

**R8 durch Verschieben lösen — so gemacht wurde es nicht.** Die Absicht war, die fünf Zusatzblöcke in den
zentralen Reduced-Motion-Block einzulagern; gemessen ist `basis.css` **byte-identisch** geblieben, die
Blöcke wurden **gelöscht**. *Lehre:* Wer Bewegung entfernt, muss nachsehen, ob sie eine **Rückmeldung**
trug. Genau das ist hier passiert und benannt: `.ger[class*="jc-"] .gb` und `.kabel[class*="jc-"] *` haben
im ganzen `src/stil/` **keine Regel mehr** — sie waren aber nicht tot: `UI.juice(el,"einrasten")` wird auf
Kabelelementen gerufen (`src/ui/editor-werkzeuge.js:307,353`, `src/ui/juice.js:11`). Für „Bewegung
reduzieren" liefen diese Animationen vorher **gar nicht**, jetzt laufen sie in **1 ms**. Ob man das sieht,
ist **nicht gemessen** (kein Browserlauf freigegeben).

**„Eine Regel abschalten, um grün zu werden" — widerlegt.** Skalen und Zählfunktionen sind zeichengleich,
`tests/stil-stand.json` ist nicht gesenkt, und R12 wurde **strenger** statt lockerer („nicht gemessen"
statt stiller 0). **„Die Trefferflächen passend machen, indem der Inhalt schrumpft" — widerlegt:** keine
kleinere Schrift, kein Selektor ohne `font-size`, kein gesunkener `min-height`-Wert. **„Die Altlasten
wurden gelöscht statt geändert" — weitgehend widerlegt:** +39 Komma-Selektorlisten zeigen den
Zusammenschluss, nur zwei Selektoren verschwanden (beide aus dem gelöschten R8-Block).

### Nicht geprüft (ehrlich)

- **Kein `ethos.py --dom` gegen die Release-Hülle.** R12 lief gegen den **Debug-Bau** und den **Web-Bau**,
  nicht gegen die Auslieferungs-Hülle.
- **Kein Snipping-Werkzeug:** die Bildschirmfotos in `Nachweise/Klassenraum/` sind über CDP aufgenommen.
- **`prefers-reduced-motion` ist im Browser nicht gemessen** — dem Werkzeug fehlt `Emulation.setEmulatedMedia`.
- **Die 720-px-Frage im Einstellungsdialog ist nicht gemessen** — die Menüprobe erreicht den Dialog nicht.
- **Die Erzeugnis-Hashes sind Momentaufnahmen**: die letzten CSS-Werte steckten beim Messen noch nicht im
  Artefakt, und ein Desktop-Release-Bau lief noch.
- **`tests/stil-stand.json` ist auf dem Stand dieser Runde eingefroren** — R1 22 · R2 113 · R3 195 ·
  R4 514 · R5–R12 = 0 (selbst nachgeprüft: der Lauf meldet kein „BESSER als der Stand" mehr).

### Nachtrag (09.10.2026, nach dem 20-Geräte-Lauf)

- **Neu: `tests/klassen-20.test.js`** — 20 Geräte aus **einem** Auftragscode, Ampel **20/20**, 349 ms;
  damit **733 Fälle** in **82 Testdateien** (91 Module), `davon 0 übersprungen`.
- **Befund K2 ist behoben:** `node tests/run.js --klassenraum` läuft jetzt (der Filter schneidet führende
  Striche ab) und meldet **104/104 grün**. Ein Filter, der **nichts** trifft, endet mit **Exit 1** und der
  Meldung „KEIN Test passt zum Filter … Das ist kein grüner Lauf." — die Bilanzzeile allein zeigt weiterhin
  „0/0 grün"; es entscheidet der **Exit-Code**.
- **Grenzbefunde des 20-Geräte-Laufs** (als Anforderung ins [Konzept 3.0](<entwicklung/Konzept – 3.0.md>) übernommen):
  `platz` > 31 wird **still auf 31 geklemmt** (harte Obergrenze je Sitzung), ein **doppelter Platz** lässt den
  ersten Eintrag gewinnen, und **zwei Sitzungen gleichzeitig gehen nicht** (`sitzung` ist ein Einzelfeld —
  nur Export/Import holt die alte zurück).
- **Erzeugnisse:** APK neu gebaut **1.164.828 B** — **die Größe ist stabil, der SHA256 nicht:** derselbe
  Quellstand ergibt bei jedem Bau **einen anderen Hash** (gemessen: `2208C08A…` → `CF5F2905…`), die APK wird
  deshalb **ohne feste Prüfsumme** zitiert. Einzeldatei unverändert **2.829.477 B**, `C3C51EDA…828E` — sie
  **ist** reproduzierbar, ebenso die `.exe` —, und die **Live-Seite ist byte-gleich** dazu (selbst
  nachgemessen).
---

## 2.0.0 — Klassenraum Stufe A+B (09.10.2026)

**Der Öffnungsweg: die Lehrkraft sagt einen Code an, jedes Gerät baut denselben Auftrag selbst** — ohne
Konto, ohne Server, ohne Netz. Das ist die zweite Hälfte der Fassung 2.0.0; die erste (Übergabe, Ergebnis,
Karriereumleitung, Denkhilfen, Wiki, Wiederholungssperre, nächster Schritt, Fragen-Generator) steht im
Abschnitt „2.0.0 — Production Release: das 2.0-Fundament" weiter unten.

Vertrag: [`Architektur.md`](Architektur.md) § 12 (Spezifikation) · § 12.1 (Entscheidungen E1–E8) ·
§ 12.2 (Bau-Entscheidungen L1–L5).

### Neu

- **Auftragscode `NL-XXXX-XX`** — immer 10 Zeichen, 30 Bit Nutzlast (Sitzung 5 · Art 1 · Index 6 ·
  Variante 8) plus 2 Prüfzeichen (mod 31 / mod 32). Das Alphabet hat 32 Zeichen und lässt `I`, `O`, `0`
  und `1` weg — verwechselbare Zeichen kommen nicht vor.
- **Ergebnis-Code `E-XXXX-XXX`** — 25 Bit Nutzlast (Sitzung 5 · Platz 5 · halbe Sterne 4 · Fehlversuche 2 ·
  Dauer 9 in 10-s-Einheiten) plus 2 Prüfzeichen. Er trägt das Ergebnis, nicht die Person: kein Name, keine
  Kennung, kein Gerät.
- **Netzkennwert (Klassenraum-Abdruck)** — **6 Zeichen**, FNV-1a über die kanonisch sortierte Abbildung von
  `{v, geraete, kabel}` **ohne** `netz.zustand`. Er zeigt, wie ähnlich zwei Netze sind; dass alle denselben
  Auftrag haben, beweist **nicht** er, sondern der Vergleich über `def.id` (Entscheidung E8).
- **Kanonisierung statt Zufall.** Zu einem Code sucht der Bau höchstens **64 Seeds** je Variante
  (`KANON_FENSTER`) und nimmt den ersten, der wirklich einen spielbaren Auftrag ergibt — derselbe Code
  ergibt deshalb auf jedem Gerät denselben Auftrag, auch bei generierten Fällen.
- **Eingefrorene Tabellen: 58 Aufträge, 27 Fertigkeiten** — **alle 27 tauglich**; die frühere Angabe
  „24 von 27" ist seit den drei neuen Injektoren überholt (der Prüfer hat **27** nachgemessen, Review § 3;
  zwei Kommentare im Produktivcode sagen sie noch — Befund **K1**). Die **Länge gehört zum Format**: ein Code mit Auftragsindex 58…63 oder Fertigkeitsindex 27…63 wird als `fassung`-Fehler
  **abgelehnt**, statt still etwas anderes zu bauen. Neue Aufträge dürfen nur **angehängt** werden, damit
  alte Codes ihre Bedeutung behalten.
- **`Spiel.klassenraum`** — die Rechen- und Verwaltungsfläche: `erzeugen`, `ausCode`, `sitzung`,
  `ergebnisCode`, `ergebnisLesen`, `ergebnisEintragen`, `exportieren`, `importieren`, `netzkennwert`,
  `tauglicheFertigkeiten`, `platz`/`platzSetzen`, `plaetze`/`plaetzeSetzen`, `abnehmen`, `tabellen`
  (**16 Namen** = die elf der Vertragstabelle § 12 + `plaetze`/`plaetzeSetzen` nach L6 + das vorhandene
  `abnehmen` + die Prüffläche `tabellen()`; seit 09.10.2026 steht diese Zählung so auch in § 12.2).
- **Eigener Store-Schlüssel `klassenraum`** — der **fünfte** Schlüssel neben `lern`, `labor`, `einst` und
  `sandbox`, mit `fassung: 1` und einem eigenen Exportformat
  `{format: "netzwerk-labor/klassenraum", …}`. Der Spielstand (`labor`) bleibt **unberührt** — eine
  Klassensitzung kann ihn nicht beschädigen.
- **Öffnungsweg** — `Spiel.instanzErstellen({ticketId｜gen, seed, quelle: "klassenraum", ohneFlow: true})`
  setzt `inst.klassenraum = {sitzung, platz, code}`, geöffnet wird über den vorhandenen Weg
  `UI.spiel.oeffnen(iid)`. **E1 gilt**: der Auftrag bleibt im sichtbaren Postfach **unsichtbar** und hebt
  keinen Zähler.
- **Zwei neue Ansichten.** `klassenraum` (Lehrkraft) legt eine Sitzung an, zeigt den Code **groß und
  kopierbar**, eine Ampel über die eingegangenen Ergebnisse (Median als oberer Wert), eine Block-Eingabe
  für eingetippte Ergebnis-Codes und **einen** Hausdialog für Sichern und Einlesen. `mitarbeit` (Azubi)
  hat ein Eingabefeld, **markiert** Tippfehler und öffnet einen gültigen Code. **Sechs** sichtbare
  Bedienelemente bei der Lehrkraft, **drei** beim Azubi (Regel R12: höchstens sechs je Ansicht).
- **Startseiten-Zeile über einen Bus-Haken** — `Bus.an("ansicht" | "zustand-geaendert" | "spiel-geladen")`;
  `src/ui/hub.js` bleibt **unangetastet**.
- **Ergebnis-Code als Toast** — gemeldet über den Bus-Kanal `klassenraum`, mit Kopierknopf, statt als
  dauerhafte Zeile im Abschlussfenster (Entscheidung L5; `B § 7.2` verbietet die Zeile ausdrücklich).
- **Keine Bewertung.** Entschieden vom Nutzer am 09.10.2026: *„Nein, Lehreraufträge sollen nicht bewertet
  werden."* Keine Note, keine Punkte, keine Rangfolge, kein Vergleich zwischen Azubis; der Auftrag zählt
  ausschließlich für den Lernstand des Einzelnen ([`Architektur.md`](Architektur.md) § 12.1).
- **Kein Server, kein QR.** Stufe C (Live-Server) und Stufe D (QR) kommen nach **E6** später; 2.0 bleibt
  ohne Netz und ohne Konto benutzbar.
- **Kein siebtes Bedienelement (O1 entschieden).** Die Platzzahl der Klasse bleibt im **Datei-Dialog**; die
  Lehrkräfte-Ansicht behält ihre **sechs** Bedienelemente (R12 wird nicht aufgeweicht). Ist keine Platzzahl
  gesetzt, sagt die Ampel ausdrücklich **„Plätze nicht eingestellt"** — statt eine Zahl zu erfinden.

### Offen und zurückgestellt

- **E3** (überstimmt die Lehreransage den Bildungsstand? — nein), **E5** (Hilfe-Sicht der Lehrkraft — nein
  für 1.3) und **E6** (Server/QR — später): entschieden bzw. offen, **nicht gebaut**.
- Stufe **C** und **D** sind nicht gebaut; der Live-Server bleibt optional und in den Einstellungen
  abschaltbar (Standard aus).

### Prüfstand (Klassenraum Stufe A+B)

| Prüfung | Ergebnis |
|---|---|
| `sh tools/test.sh` (Lead) | **Exit 0** — `661/661 grün  (74 Testdateien, 91 Module)`, `davon 0 übersprungen` |
| die vier neuen Testdateien, Filter `klassenraum` (Lead) | **67/67 grün** — der richtige Filter; `--klassenraum` liefert **0/0** (Befund **K2**) |
| `python tools/ethos.py` · `tools/klassen.py` · `node tools/sim-stand.js` (Lead) | **GRUEN** · **0** Klassen ohne CSS-Regel (auch `klassen.py kl-` → 0) · Simulation **unverändert** |
| `python bauen.py` (Lead) | **128 Module, 2202 KB** → `web/index.html` (Version **2.0.0**) und `web/tests.html` |
| `python tools/seite.py --pruefen` (Lead) | **GRUEN: 39 Dokumente** (nach dem Doku-Neubau **40**); die zwei roten Doku-Tests sind genau dieser Neubau |
| `python tools/einfach.py` + `--ziel` (Lead; Bytes und SHA256 selbst nachgerechnet) | **2.791.782 B**, SHA256 `D7D45F1390C31F2CFE7EB578BC7BF21F6813A85A23951DD4323931D9D1E4A4A2`, **0 Außenverweise**, beide byte-gleich |
| `python android/bauen.py` (Lead; Bytes und SHA256 selbst nachgerechnet) | APK **1.148.444 B**, SHA256 `A9526120C66930E4BC4093795E2D1DECA5C5AF18268CE4E753E064AF1AC2D988`, `GRUEN: Signatur gültig, Kennwerte stimmen, keine Rechte` |
| Fassung in den Erzeugnissen (selbst geprüft) | **2.0.0** in `web/index.html`, `docs/index.html` und `android/bau/assets/index.html`; `Netzwerk-Labor.html` ist byte-gleich zu `docs/index.html` |

**Hinweis zur Herkunft.** Nach dem Befund **K1** des Prüfers (zwei Kommentare sagten noch „24 von 27")
wurde der Codec-Kommentar berichtigt und **neu gebaut**: die Erzeugnisse dieser Runde sind jünger als die
des Fundaments, und deren Werte (Einzeldatei 2.720.252 B / `3822D6B5…`, APK 1.127.964 B / `DB11BF88…`)
sind damit **überholt**.

**Erneut überholt** durch die **Output-Runde** und ihren Nachtrag (Abschnitt ganz oben): dort stehen die
gültigen Erzeugnisse dieser Fassung (Einzeldatei **2.829.477 B**, SHA256 `C3C51EDA…828E`; APK
**1.164.828 B** — **ohne** Prüfsumme, sie hebt sich bei jedem Bau auf).

**Neue Dateien dieser Stufe** — Bytes und SHA256 vom Chronisten über den Arbeitsbaum gerechnet, **alle
LF, 0 CRLF**:

| Datei | Bytes | SHA256 |
|---|---|---|
| `src/spiel/klassenraum-codec.js` | 18.989 | `74A4A9A141510ED3581C659DE112D67334E3123D619A3FF34127844D5A1F80FF` |
| `src/spiel/klassenraum.js` | 26.295 | `E1D4816CB2FB7A40DC7A1E5F8B733AA30F75A7CD5D48F734016F5631FF43B3C4` |
| `src/ui/klassenraum.js` | 25.550 | `4744D18E02025F2A607313EF2E0F6BE26D1006E2CECB00F1BFCD648A606490C3` |
| `src/stil/klassenraum.css` | 4.401 | `AC24A9A3DEDE3B515ED05922D0DB56656563B580669FBA87515CC0E67264ADFE` |
| `tests/klassenraum-codec.test.js` | 26.792 | `24D89D2467E0232C6013501C25E53F76C7AF3723350463377DA71B53E589A094` |
| `tests/klassenraum.test.js` | 20.326 | `01764065AE74F592872D983FC67D73C201BA0C770785747646C336561BC79BF8` |
| `tests/ui-klassenraum.test.js` | 25.735 | `564A2E37A6C913956F20BC29CB5AAED699C2D37CD150551B4E3D412EB5F727AE` |
| `tests/klassenraum-abnahme.test.js` | 23.034 | `54A2F154E14E8D559F8459110965DA595D8E7B64E8481343556CB1AE3CE00DF7` |

**Additiv geändert:** `src/spiel/zustand.js` — 12.390 B, SHA256
`EF6D1A8570D3B01EB4534E23250C0FF877DC4625C38C207B02362D3BC10FEC5D`, eine Zeile (`Spiel.KLASSENRAUM`).
Die Datei ist **vorbestehend** CRLF (216 CRLF-Zeilen; Index-Arithmetik im Review § 11) — **kein**
Zeilenenden-Bruch in dieser Runde.

### Nicht geprüft (ehrlich)

- **Kein Browserlauf und kein Pixelbild** dieser Stufe: `tools/rauch.py` und `tools/menueprobe.py` liefen
  für die neuen Ansichten **nicht** — die Wirkung ist über DOM-Attrappen und Quelltext belegt.
- **Keine echte Unterrichtsstunde**, kein Versuch mit einer Lehrkraft und einer Klasse.
- **Stufe C und D** (Server, QR) sind nicht gebaut und damit auch nicht geprüft.
- Der in Dokument D genannte Abnahmebefehl ist **untauglich**: `node tests/run.js --klassenraum` benutzt
  `--klassenraum` als Namensfilter, der in **keinem** Testnamen vorkommt; die Bilanzzeile zählt nur die
  gefilterte Liste (`tests/run.js:53,60,66`) und meldet deshalb **0/0 grün** bei **Exit 0** — ein grüner
  Lauf, der nichts geprüft hat. Richtig ist der Filter **ohne** Striche: `node tests/run.js klassenraum`
  → **67 Fälle** (Prüfer, Review § 10).
---

## 2.0.0 — Production Release: das 2.0-Fundament (09.10.2026)

**Dreizehn Bausteine, die kein neues Spiel sind, sondern seine Voraussetzungen.** Der
[Fahrplan 1.3/2.0](<entwicklung/Fahrplan – 1.3 und 2.0.md>) hatte fünf Entwürfe vorgelegt; diese Fassung
baut die Fundamenthälfte daraus: zwei Azubis nacheinander am selben Rechner, ein kopierbares Ergebnis,
Klassenraum ohne Karriereschaden, derselbe Auftrag auf jedem Gerät, ein ehrlicher Hilfevorrat, geöffnete
Trainingskarten, Denkhilfen für fast alle Minis, Hilfe-Vorschläge der mittleren Ebene, ein Wiki mit IPv6
und WLAN, eine Wache gegen die Lernmotor-Falle — und drei Nachträge aus dem laufenden Auftrag des Nutzers:
**keine schnelle Wiederholung**, ein **sichtbarer nächster Schritt** und **generierte Fragen**.

Verträge: [`Architektur.md`](Architektur.md) § 12/§ 13. Berichte:
[Review – 2.0-Fundament](<entwicklung/Review – 2.0-Fundament.md>) (unabhängige Gegenprüfung),
[Befund – Lernmotor-Falle](<entwicklung/Befund – Lernmotor-Falle.md>),
[Übergabe – Stand 2.0-Fundament](<entwicklung/Übergabe – Stand 2.0-Fundament.md>) (der neue Übergabezettel).

### Neu

- **Übergabe — „Neuer Azubi an diesem Rechner".** `Spiel.uebergabe({lernstandBehalten})` setzt den
  Spielstand zurück, lässt Einstellungen stehen und den Lernstand wahlweise auch; `Spiel.uebergabeLetzte`
  berichtet, was zuletzt übergeben wurde. Die Oberfläche hat dafür einen eigenen Einstellungsabschnitt mit
  vier Wegen — **Behalten**, **Löschen**, **Erst sichern** (exportiert und übergibt **nicht**),
  **Abbrechen** —, Escape schließt den Dialog, nach dem Zurücksetzen wird kalt neu geladen. Damit steckt
  der zweite Azubi nicht mehr im Auftrag des ersten.
- **Ergebnis kopieren.** `Spiel.ergebnisText(inst, erg)` baut den mehrzeiligen Klartext eines
  abgeschlossenen Auftrags, `Spiel.ergebnisKurz` eine Einzeiler-Zusammenfassung. Im Abschlussfenster steht
  jetzt ein Knopf **„Ergebnis kopieren"** (`src/ui/spiel.js:543`), der erst beim Klick textet
  (`UI.kopieren`), damit ein Fehler im Text das Fenster nicht schon beim Öffnen zerlegt.
- **Klassenraum-Aufträge verfälschen die Karriere nicht mehr.** EINE Umleitung in
  `src/spiel/abnahme.js:126-127` schickt `quelle === "klassenraum"` in `Spiel.klassenraum.abnehmen` — **vor**
  jedem Nebeneffekt. Kein Geld, kein Ruf, kein `st.erledigt`, keine Wochenwertung, keine Abzeichen, kein
  Karriere-Ereignis; der **Lernwert bleibt** (`Spiel.lernenNachAbnahme`). Elf Filterstellen mussten dadurch
  **nicht** nachgezogen werden — sie sind toter Vorsorge-Code (Entwurf E2).
- **Derselbe Auftrag auf jedem Gerät.** Derselbe Code und derselbe Seed ergeben denselben Auftrag,
  unabhängig vom lokalen Flow-Stand. Bewiesen wird das über `def.id` — Ziele, Geräte und Kabellisten sind in
  allen Flow-Ständen gleich und hätten die Abweichung **nicht** bemerkt.
- **Ehrlicher Hilfevorrat.** Die Ticket-Stufe wird ausdrücklich gesetzt; der Vorrat richtet sich nach dem
  eingestellten Bildungsstand (6/4/2/0) statt still nach dem Standard. Ein leerer Vorrat **sperrt nicht**
  (Vertrag § 13.2).
- **Drei gesperrte Trainingskarten sind offen.** Neue Injektoren `portsec-fremde-mac`, `stp-doppelkabel`
  (zwei parallele Kabel, reproduzierbar `abbruch === "STORM"`) und `nas-ohne-adresse`; die Injektorenzahl
  steigt damit von 36 auf **39** (der Prüfer hat 39 Injektoren = 39 Dex-Einträge = 39 Gruppen-Summe
  nachgezählt). Der Kartenschritt „Mit `show spanning-tree` den blockierenden Port benennen" wurde
  **entfernt** — dieses Kommando gibt es im Spiel nicht.
- **Denkhilfen statt eines Fertigkeitssatzes für alle.** Eigene Denkanstöße für **91 der 92** Minis
  (vorher 25; **60** in der Grunddatei, **31** in der Zusatzdatei); `mini-link-2` bleibt bewusst ohne
  Eintrag, weil ein Test genau das verlangt. Die zweite
  Datei hängt idempotent an (`DATEN.miniDenkhilfen = Object.assign(...)`), damit die Ladereihenfolge keine
  Einträge frisst. Der Prüfer hat **91 von 91** über den echten Weg beim Spieler nachgewiesen — nicht nur
  im Datenbestand.
- **Hilfe-Vorschläge der mittleren Ebene.** **44** Vorschläge statt 29: Ebene 1 = 22, **Ebene 2 = 15**
  (vorher 0), Ebene 3 = 7. Alle **27** Fertigkeiten haben jetzt mindestens einen Vorschlag (vorher waren
  10 ohne). `bereich` bleibt ausschließlich eine Leiter-id (`link`, `vlan`, `ip`, `gateway`, `route`,
  `dienst`), `art` ausschließlich `pruefen`/`aendern`.
- **Wiki 2.0.** Die dünnsten Seiten sind gefüllt, **IPv6** (fünf Seiten mit eigenem Abschnitt) und
  **WLAN/Access Point** sind als Nachschlagewissen nachgetragen — als Abschnitte in bestehenden
  Fertigkeiten, **ohne** neue Fertigkeit (die Skill-Tabelle ist für den Klassenraum-Codec eingefroren).
- **Lernmotor-Wache.** Ein Wächtertest beweist, dass im gesamten `src/` niemand `store.get("lern")` /
  `store.set("lern")` direkt aufruft — der Lernstand geht nur über die `L.*`-API. Der Gegenversuch (ein
  eingebauter Direktaufruf) macht den Test nachweislich rot; danach wurde er zurückgenommen.
- **Keine schnelle Wiederholung.** `Spiel.mini` rotiert jetzt statt zu filtern: je Fertigkeit kommt jedes
  Mini einmal dran, bevor sich eines wiederholt, und bei echter Erschöpfung das **am längsten nicht
  gespielte**. Gemessene Wirkung über den echten Weg (`naechstes()` + `antworten()`): vorher **20 Runden →
  11 verschiedene Minis, 9 Wiederholungen**; nachher **20 Runden → 20 verschiedene, 0 Wiederholungen**,
  40 Runden → 40 verschiedene. Der Zustand liegt in `st.mini` und übersteht einen Neustart; alte
  Spielstände werden rekonstruiert. Der Auftragsmischer nimmt einen bereits offenen Inhalt nicht mehr in
  den Topf.
- **Der nächste nötige Schritt wird gezeigt.** `Spiel.naechster(inst)` liefert
  `{geraet, ziel, text, bereich}` — gelesen aus den offenen Zielen und den Plan-Abweichungen, **keine neue
  Wahrheit**. Die Oberfläche hebt das Gerät im Netzplan hervor (pulsieren); die Führung kommt **nur auf
  Bedarf**: `azubi`/`azubi-plus` nach **90 s** ohne Fortschritt, `geselle` erst nach einem Fehler,
  `meister` **nie** ungefragt (gefragt bekommt sie jeder), Anzeigedauer **15 s**. Der Text verrät die
  Lösung nicht: er sagt, *wo* es hakt, nicht *warum*.
- **Fragen-Generator.** Aus **11 geprüften Vorlagen** und einem Katalog von **20 Denkfehlern** entstehen
  immer neue Aufgaben — deterministisch aus dem Seed, mit selbst ausgerechneter Lösung (der Test führt
  ≥ 200 Seeds durch). Generierte Fragen laufen **nicht** in den festen Bestand (92 Minis) hinein, sondern
  werden an genau zwei Stellen eingehängt; ihre Id `gf-<vorlage>-<seed>` trägt die Frage in sich und
  übersteht einen Neustart.

### Behoben

- **Die acht roten `UI: Übergabe › …`** aus der Hinterlassenschaft eines abgebrochenen Laufs sind grün. Die
  Ursache lag **in der Attrappe des Tests, nicht im Produktivcode** — der Prüfer hat das mit drei Proben und
  einem Gegenversuch belegt ([Review § 3](<entwicklung/Review – 2.0-Fundament.md>)); die Zusicherungen
  wurden **nicht** abgeschwächt.
- **Das Namens-Werkzeug verschwieg genau den Fall, für den es da ist.** `node tools/pruefe-namen-flicken.js`
  meldete „0 laden nicht" (Exit 0), während `tests/hilfe-ebene2.test.js` in diesem Fenster **nicht ladbar**
  war — der Testlauf hätte dort mit **Exit 2** abgebrochen. Ursache war `tools/pruefe-namen-flicken.js:86`;
  nach der Korrektur meldet das Werkzeug **66 Dateien geprüft, 0 geschrieben, 0 laden nicht** (vom Prüfer
  nachgemessen, Review § 4.4).
- **Ein Klassenraum-Auftrag verfälschte die Karriere** — im Fahrplan mit **+33 € / +1 Ruf** belegt und vom
  Prüfer auf dem ungefilterten Pfad exakt reproduziert. Jetzt: 0 € / 0 Ruf, kein `erledigt`-Eintrag, keine
  Kundenampel — während der Lernstand sehr wohl steigt.
- **Derselbe Code ergab je Gerät einen anderen Auftrag** (`postfach.js`, lokaler Flow-Stand). Jetzt
  identisch — über `def.id` bewiesen.
- **Der Hilfevorrat war still der Standard-Vorrat**, auch wenn der Mensch auf „meister" stand: sechs
  Sprossen landeten auf `def.skills[0]`. Jetzt gilt der eingestellte Bildungsstand.
- **Ein Kartenschritt verlangte ein Kommando, das es nicht gibt** (`show spanning-tree`) — der Schritt ist
  entfernt, die Karte ist spielbar.
- **`Spiel.ergebnisKurz` hatte keinen Aufrufer** („Wirkung vor Grün" verletzt). Entschieden wurde **nicht**
  entfernen, sondern einen echten Aufrufer bauen: die Kurzfassung steht jetzt als Untertitel im
  Abschlussfenster (`src/ui/spiel.js:511`).
- **Fehlerdex nachgezogen**: alle 39 Injektoren haben Gruppe, Symptom, Erkennungszeichen und Erklärung;
  sieben Grundcodes **ohne** Injektor bleiben ausdrücklich benannt (der Prüfer hat die Zahlen des
  Eigentümers nachgezählt und eine zu starke Aussage korrigiert — `OFFEN` fehlt in `Sim.GRUENDE`, wird aber
  in `src/spiel/dex.js:77` bewusst abgefangen).

### Verworfen — und warum das hier steht

- **`lab.stp` über EIN zweites Kabel:** gemessen **kein** Sturm (Ziel blieb ok, `abbruch: null`). Erst
  **zwei parallele** Kabel ergeben reproduzierbar einen Sturm. Ein erster Injektorversuch wäre also ein
  Injektor geworden, der nichts bricht — `ticketBauen` verwirft solche Fälle zu Recht.
- **Den Lernmotor selbst reparieren:** verworfen. `fremd/lernmotor.js` trägt „FREMDE DATEI — NICHT HIER
  BEARBEITEN", die Quelle liegt außerhalb des Projektordners und hat beim Laden **Vorrang** — eine
  Änderung an der Kopie hätte auf diesem Rechner nachweislich **keine** Wirkung. Stattdessen Wächtertest +
  Befunddokument mit Änderungsvorschlag für die FISI-Spielhalle.
- **Elf Karriere-Filter nachziehen:** verworfen zugunsten **einer** Umleitung (Entwurf E2).
- **Vier Ebene-2-Vorschläge, die nie erschienen** (von Ebene-1-Zwillingen verdeckt): nicht die Prüfung
  abschalten, sondern je einen eigenen, fachlich passenden Befehl ergänzen.
- **`Spiel.ergebnisKurz` entfernen:** verworfen, siehe „Behoben" — ein Aufrufer ist billiger als eine
  gelöschte Funktion.
- **Die E1-Begründung des Entwurfs ist nur halb richtig:** der Offen-Zähler entfällt, die
  `ticketId`-Blockade bleibt (gemessen) — bewusst symmetrisch zu `training`/`pruefung`/`raetsel` gelassen.
- **Ein Schwarm aus 15 Teammitgliedern** war am 05.10.2026 gescheitert (drei von vier brachen mitten in der
  Arbeit ab). Diese Sitzung zeigt den Gegenweg — als **Beobachtung**, nicht als neue Regel: eine Datei, ein
  Schreiber, Shared Tasks mit Schreibbereichen, Änderungen an fremden Dateien **über den Lead**.

### Prüfstand

| Prüfung | Ergebnis |
|---|---|
| `node tests/run.js` (vom Chronisten selbst gemessen) | **620/620 grün** (70 Testdateien, 90 Module), **davon 0 übersprungen**, Exit 0 |
| dieselbe Messung **vor** der Sitzung (Nullmessung des Leads) | 471/479 grün, **8 rot** (alle acht `UI: Übergabe › …`), 55 Testdateien, 84 Module |
| `python tools/ethos.py` · `tools/klassen.py` · `node tools/sim-stand.js` (selbst gemessen) | GRÜN · **0** Klassen ohne CSS-Regel · Simulation **unverändert** (12/12) |
| `python bauen.py` (Lead) | **126 Module, 2133 KB** → `web/index.html`, **Version 2.0.0** |
| `python tools/einfach.py` + `--ziel Netzwerk-Labor.html` (Lead) | **0 Außenverweise**, beide byte-gleich — Bytes und SHA256 vom Chronisten nachgerechnet (unten) |
| `python tools/seite.py --pruefen` (Lead) | GRÜN: 39 Dokumente, kein toter Verweis, jede Seite mit `<h1>` und Fußzeile |
| `python tools/seite-pruefen.py` (Lead) | GRÜN — mit dem erwarteten Hinweis, dass die **online** veröffentlichte Seite noch **1.2.4** liefert (es wurde nicht gepusht) |
| `python android/bauen.py` (Lead) | GRÜN — APK 2.0.0, `versionCode` **20001** (`VERSION_CODE` musste von Hand über den abgeleiteten Wert 20000 steigen) |

**Zwischenstand, der nicht als Endstand durchging:** der Prüfer maß um 15:31 **591/593 grün, 2 rot** — die
zwei roten Zeilen (`Fragen-Generator`, `Spiel: naechster Schritt`) gehörten Bausteinen, die erst danach
fertig wurden. Sein Fazit gilt weiter: *591 von 593 grün heißt nicht fertig.*

### Erzeugnisse

- Browser-Einzeldatei `docs/index.html` = `Netzwerk-Labor.html`: **2.720.252 B**,
  SHA256 `3822D6B5C03C8D216EF588DD693E2D95DB6FFE2C0F22B21276C050EDE7F095F6` (beide gleich, vom Chronisten
  gerechnet), `LABOR_VERSION = "2.0.0"`, 0 Außenverweise.
- Android `Programm/Netzwerk-Labor-2.0.0-Android.apk`: **1.127.964 B**,
  SHA256 `DB11BF88C1B3431909E20C08209BB9EE08B291BD2BE004568D84C711A569FAC1` (vom Chronisten nachgerechnet),
  versionName 2.0.0, `versionCode` 20001, signiert, keine Berechtigungen.
- **Die `.exe` wurde in dieser Fassung NICHT neu gebaut** (Rust-Bau, nicht Teil dieses Auftrags); sie meldet
  deshalb weiterhin eine ältere Fassung. Ihre Fassungsnummer ist hier **nicht gemessen**.
- **Nicht gepusht, kein Tag.** `v2.0.0` und der Push stehen aus — beides nur mit ausdrücklicher Freigabe
  des Nutzers. Tag- und Zweigzeile im Kopf dieses Dokuments bleiben deshalb unverändert.
- **Überholt** — zuerst durch die Klassenraum-Stufe A+B, dann durch die **Output-Runde** (jeweils
  Abschnitte weiter oben). Gültig sind die Erzeugnisse der Output-Runde samt Nachtrag: Einzeldatei
  **2.829.477 B**, SHA256 `C3C51EDA…828E`; APK **1.164.828 B** (**Größe** stabil, **Hash** nicht — er ändert
  sich bei jedem Bau). Die hier genannten Werte waren der Stand **nach dem Fundament**.

### Neue Dateien dieser Fassung (Bytes und SHA256)

Alle Werte mit `Get-FileHash -Algorithm SHA256` über den Arbeitsbaum gerechnet (Chronist). Die vier
Dokumente des Stand-Nachziehens (`CHANGELOG`, `INHALT`, `Design – Spielspaß 2.0.md`,
`Übergabe – Stand 2.0-Fundament.md`) stehen hier **nicht** — eine Datei kann ihren eigenen Hash nicht
enthalten.

| Datei | Bytes | SHA256 |
|---|---|---|
| `src/spiel/uebergabe.js` | 4.539 | `DB6AB3376989A48B7DC9B2A6C334E9E8BBAF7D8443E442C2A81E835597C803C7` |
| `src/spiel/ergebnis.js` | 10.154 | `51103A2F6085A0C9FAB9B9A98B8C43E8EB29479773670BDD92F3D0BCB26C45DF` |
| `src/spiel/klassenraum.js` | 4.122 | `1F4F9BFE73AB19D36C0356E106DAA3E79E8B56FA06F5BC95AA25FD123E928B5A` |
| `src/spiel/naechster.js` | 9.422 | `EE37C873ADE2D9C487C0B0A9E45958E00167434C931EBDEEB86F86DA79367CAB` |
| `src/spiel/fragen.js` | 7.542 | `D97F5ABAB5B930C5CAE72BBD78BAD0C458D719B41B0085202E8B2C7E1D6B77B4` |
| `src/daten/fragen-vorlagen.js` | 17.987 | `EC96F562354A2B2C1057A3B5EA34A3F140918AAAC37919CD245C0640ECA49C10` |
| `src/daten/mini-denkhilfen2.js` | 10.619 | `3061A66AE662C13465AE6BD8F19E0521D77087E8F62C7A6AEE5DD08EC76DE6BD` |
| `src/ui/uebergabe.js` | 5.304 | `F3A3DC7378F7CFE4490CE4E63B7F09587D12D8108554CC59FCD29114B1F81A6B` |
| `src/stil/uebergabe.css` | 881 | `5FFF076690A7BFE4F55772A74DBFA2CA5D9E1D661523313B839441220151FDB2` |
| `src/stil/naechster.css` | 1.855 | `6EFFE6F53E8B2B95E14DF9A6122C3FB522056094FB6A207D81861E9A7D4D2264` |
| `tests/2.0-abnahme.test.js` | 23.454 | `C07E06745EE295F106D060AE49D36FD34447AC84FBF9FFFC4DCAF352B621CF0A` |
| `tests/spiel-uebergabe.test.js` | 14.882 | `B2FDDD3D097E13821AF43C3EF9E4208072813337A5B6618092FBBB55B5F3B4E1` |
| `tests/ui-uebergabe.test.js` | 14.114 | `F125293B629A3FD7F2FAAF1F88A19CA3C9EA22CB358CE16105FBD1EF12883B55` |
| `tests/spiel-ergebnis.test.js` | 13.336 | `51646BB4AE82F1D1E308A465DF70405E148FF3C398E379B5AFB6F3EB3FBD0B07` |
| `tests/ui-spiel-ergebnis.test.js` | 24.063 | `3927FD7EA310D15E6C5344BAF54C49D84F56E5340C72C9C5B36862364C8B8229` |
| `tests/klassenraum-karriere.test.js` | 22.704 | `7473F7F3F44DB0EDD78D3E9786C4BCB85EBA30BCD96EB22DABDCE12FA5542952` |
| `tests/klassenraum-determinismus.test.js` | 11.258 | `A8D717F357996B60DCC2C8FD62808C00DCE44013E4598255F60802A994FA3B87` |
| `tests/klassenraum-hilfevorrat.test.js` | 8.338 | `B3474ACBAE50D61A4608CA1F00C2B9C147C33B0B2F73537A4C2D5B166E52BC7B` |
| `tests/injektoren-neu.test.js` | 9.166 | `F218929D3326FA713A4B2652D2A7AA8E244CB88A2C87CA213BFCD4D01E6A127B` |
| `tests/denkhilfen-teil1.test.js` | 9.970 | `2DFD18328D4CCE378E0B589F0FD677299BD8AC5C32928E5A4E1DD4A57B8DD400` |
| `tests/denkhilfen-teil2.test.js` | 10.081 | `B32A025FBBE3D4A00BC3F9F50E4D00395972C5DBBF7F4FBF2253DE3B1E867ED1` |
| `tests/hilfe-ebene2.test.js` | 40.607 | `6398027468B2AA1C21A1D85C67A19FB68929C679DECFF389C6A78780CF26D1BA` |
| `tests/wiki-2.0.test.js` | 13.647 | `E125DE42E35FE5C2A8C159C208BCAF192DC86F3AB8617168F2D676346CAFCDE4` |
| `tests/lernmotor-wache.test.js` | 14.996 | `A1386F3BDAAD0232525F38A1941D441358F84879EB54DA9C6FDE16FAC4F79B8C` |
| `tests/mini-wiederholung.test.js` | 22.323 | `9DDC9E0801BA1AE621894C48866079E90B3AF36E25FD037966854E11C8E4A0CF` |
| `tests/naechster-schritt.test.js` | 20.002 | `E4157F91E48B31CA4A7418E366B792710900DDC573552F7884131259075A1DDD` |
| `tests/fragen-generator.test.js` | 21.406 | `2E8C8BCE1DD2FCFCC6D9DD688696712BED737DF419F32B0FE7332476F7767B23` |
| `docs/entwicklung/Befund – Lernmotor-Falle.md` | 19.137 | `FCDD716293D113CE8866DF745BFF558312EE60E410B90E9E8D498C943A54FE47` |
| `docs/entwicklung/Review – 2.0-Fundament.md` | 44.744 | `84F6A75C032E1C4FCD61552E8E443C578855F996CECD8E422F61E52B53A966E7` |

**Geändert** (ohne Hash, weil teils danach noch vom Fassungszug berührt):
`src/spiel/abnahme.js` · `postfach.js` · `flow.js` · `stufensystem.js` · `hilfe.js` · `mini.js` ·
`mischer.js` · `injektoren.js` · `dex.js` · `ereignisse.js` · `hub.js` · `src/daten/hilfen.js` ·
`mini-denkhilfen.js` · `trainings.js` · `wiki.js` · `src/ui/spiel.js` · `netzplan.js` · `src/ui/hilfe.js` ·
`tests/daten-trainings.test.js` · `tickets-generator.test.js` · `spiel-bogen.test.js` ·
`tools/pruefe-namen-flicken.js` — dazu die Fassungsstellen (`bauen.py`, `shell/src-tauri/Cargo.toml`,
`tauri.conf.json`, `android/bauen.py`, `android/LIESMICH.md`, `docs/Bauen.md`, `docs/Liesmich.md`) und die
Dokumente dieses Stand-Nachziehens.

### Nicht geprüft (ehrlich)

- **Kein Browserlauf.** `tools/rauch.py` und `tools/menueprobe.py` liefen **nicht**, es gibt kein
  Bildschirmfoto und keine Pixelmessung dieser Fassung. Die Wirkung der Oberfläche ist über DOM-Attrappen
  und Quelltext belegt, **nicht** im gezeichneten Bild.
- **Keine echte Unterrichtsstunde**, kein Test mit einem Menschen.
- **Die `.exe` wurde nicht neu gebaut** und **nicht** gestartet; `tools/q-echt.py` lief nicht.
- **Die veröffentlichte Seite ist unverändert 1.2.4**, weil nicht gepusht wurde. `tools/seite-pruefen.py`
  meldet das ausdrücklich (Baukennung online `109f7738`, lokal `c3fff0b3`).
- **`tools/seite.py` lief vor dem Stand-Nachziehen** — die Doku-Seiten unter `docs/doku/` wurden um
  **15:56:28** erzeugt (gemessen an `docs/doku/CHANGELOG.html`) und sind damit **älter** als die vier
  Dokumente dieses Nachziehens; vor einem Commit muss `python tools/seite.py` erneut laufen.
- Die Testzahl **620** stammt aus dem Lauf (`tests/run.js` führt jeden `pruefe`-Aufruf aus, auch in
  Schleifen); statisch gezählt hat der Chronist **613** `pruefe(`-Stellen in 70 Testdateien. Die Differenz
  erklärt sich durch Tests, die in Schleifen erzeugt werden — **nicht aufgeklärt**, wie viele es genau sind.

---

## 1.2.4

**Hilfestellung — Hilfe dahin, wo der Azubi steht.** Ein Azubi kann die Syntaxen nicht kennen und hat im
Spielflow keinen Zugriff auf eine Lernnotiz. Diese Fassung bringt die Hilfe dorthin, wo er steht: ins
Terminal, in die kleinen Mails der Leiste und in einen Trainingsbereich abseits der Aufträge — und sie
wächst **schrittweise** mit dem Bildungsstand.

Vertrag: [`entwicklung/Hilfestellung – Stufen und Schnittstellen.md`](<entwicklung/Hilfestellung – Stufen und Schnittstellen.md>),
gespiegelt in [`Architektur.md`](Architektur.md) § 13.

### Neu

- **Bildungsstand als eigene Achse**: `azubi` · `azubi-plus` · `geselle` · `meister` (Rang 1–4), wählbar in
  den Einstellungen und in der Begrüßungskarte. Eine eigene Achse neben Erklärtiefe und Prüfungsstrenge.
- **Hilfekonto je Ticket**: 6 / 4 / 2 / 0 freie Hilfen. Ein leerer Vorrat **sperrt nicht** — die nächste
  Sprosse kostet dann Sterne wie bisher. Ein Azubi darf nie in einer Sackgasse landen.
- **Terminal-Vorschlagsstreifen** unter dem Konsolenschirm: 29 belegte Befehle (22 „nur ansehen", 7
  „ändert etwas") mit Syntax-Muster und Begründung, „Was geht hier?" je Konsolen-Modus, Syntax-Brücke nach
  einem Fehler. Im Fehlerfall steht nur das Nötigste, der Rest kommt auf Klick.
- **Lernanker in den Mini-Mails**: Hilfe-Knopf (Denkanstoß, **nie** die Lösung) und nach der Antwort ein
  Anker ins Wiki. Die Denkhilfe ist jetzt **fragebezogen** (25 eigene Texte) statt fertigkeitsweit — vorher
  bekamen alle sechs `lab.ping`-Fragen denselben Satz.
- **Trainingsbereich**: eigene Ansicht mit 34 Szenarien, jede Fertigkeit mindestens einmal. Zahlt kein
  Geld, keinen Ruf, erscheint nicht im Postfach — zählt nur für den Lernmotor. Das Ergebnis erklärt jetzt
  je offenem Ziel und gruppiert die Gründe nach Fertigkeit.
- **Fehlertexte**: 82 Katalogzeilen, jede echte Konsolenmeldung in Klartext in der Tiefe der Stufe.
- **Anweisungszeile der ersten Stunde** je Stufe: `azubi` nennt den Weg, `meister` bekommt nichts Ungefragtes.
- **Lernstand**: Abschnitt „Hilfe und Übung" je fälliger Fertigkeit mit Üben- und Wiki-Knopf.

### Behoben

- **Der Vorrat bezahlt jetzt wirklich.** Bis 1.2.3 richtete sich der Sternabzug allein nach `hilfeStufe`:
  sechs „freie" Hilfen kosteten trotzdem 2 Sterne und 20 % Lohn — gemessen 3 Sterne statt 5. Jetzt zieht nur
  eine **ungedeckte** Sprosse Sterne ab; ein Altstand zahlt unverändert.
- **Hilfe wird je Fertigkeit verbucht.** `inst.hilfen` trägt jetzt `skill`; der Lernmotor entscheidet je
  Fertigkeit statt einmal für alle. Vorher stieg eine mit der kostenlosen OSI-Checkliste gelöste Aufgabe im
  Wiederholungsplan wie eine selbst gelöste (Kasten 0→0 mit Hilfe, 0→1 ohne).
- **Ein Linux-Server bekam die Windows-Erklärung**: die Bereichs-Ableitung setzte für Endgeräte pauschal
  `host`, bevor das Betriebssystem bekannt war. Steht der Bereich fest und nichts passt, kommt jetzt lieber
  gar kein Kasten als eine fremde Erklärung.
- **Der Rauchtest prüfte die Trainingsansicht nie.** `tools/rauch.py` führte eine feste Liste von 11
  Ansichten; „training" fehlte. Er meldete 36/36 grün, ohne die neue Ansicht zu öffnen — jetzt 12 Fälle,
  **39/39**.
- **Die Stufenwahl war unsichtbar**: sie hing hinter dem Knopfblock der Begrüßungskarte, wer den blauen
  Knopf drückte, hatte sie nie gesehen. Steht jetzt davor.
- **Vier Dinge hießen „Stufe"**: die Kopfzeile zeigte `Stufe 2` (Karriere), während ihr eigener Tooltip
  `Karriere-Stufe` sagte. Jetzt `Karriere 2`, `Bildungsstand …`, `Hilfe 3/6`, `Prüfungsstrenge je Ticket`.
- **Der Hilfe-Knopf ist in der Leiste erreichbar**: bei 300 × 56 px lag er hinter `overflow:hidden` und
  `opacity:0`, erreichbar erst nach 280 ms Mausberührung. Jetzt sitzt er in der Statuszeile (im echten Edge
  nachgemessen: 34 × 32 px, `elementFromPoint` trifft ihn), und ein Zeichen meldet ein wartendes Mini-Ticket.
- **Der Spielstand** wandert auf `v:3` (Feld `training`); ein v:2-Stand wird verlustfrei migriert (11 Punkte
  geprüft, inklusive laufendem Ticket und Sicherung).

### Prüfstand

`node tests/run.js` **434/434 grün** (50 Testdateien, 83 Module, exit 0, 0 übersprungen) ·
`python tools/ethos.py` GRÜN · `python tools/klassen.py` 0 · `node tools/sim-stand.js` unverändert ·
`python tools/rauch.py` **39/39** (echter Edge, 12 Ansichten × 3 Breiten) ·
`docs/index.html` und `Netzwerk-Labor.html` byte-gleich, 0 Außenverweise.

**Nicht geprüft:** das Pixelbild im Browser ist nicht angesehen; die Android-Fassung wurde nicht gebaut
(`VERSION_CODE` ist auf 10204 nachgezogen, die APK auf 1.2.3 bleibt gültig); drei Trainingsszenarien
(`lab.portsec`, `lab.stp`, `lab.storage`) haben keinen Injektor und stehen als gesperrte Karten.

Eine unabhängige Gegenprüfung mit fünf Prüfern hat sechs Befunde ergeben; die Berichte liegen unter
`docs/entwicklung/Review – *.md`, die offenen Punkte darin sind benannt.

### Nachtrag: die Auslieferung selbst (09.10.2026)

Beim Nachziehen der Veröffentlichung fielen drei Fehler in der **Auslieferung** auf — keiner davon im
Spiel:

- **Das Release hätte die veraltete `.exe` als neue Fassung verpackt.** Der Linux-Job rief
  `tools/paket.py` ohne Schalter; das Werkzeug nimmt dann `Programm/Netzwerk-Labor.exe`, wenn sie
  existiert. Gemessen: die lokale Datei meldete noch **1.2.3**, das Paket hieße
  `Netzwerk-Labor-1.2.4-Windows.zip`. Jetzt heißt der Schritt `--ohne-exe`; der Linux-Job liefert nur
  die `Netzwerk-Labor-<fassung>-Browser.zip` — genau der Name, den dieses Dokument und
  [`Liesmich.md`](Liesmich.md) verlinken. Die echte `.exe` kommt aus dem Windows-Job, der vor dem
  Anhängen prüft, dass ihre `ProductVersion` zum Tag passt.
- **Die Doku ist jetzt im Paket.** Wer die Einzeldatei herunterlädt, arbeitet oft ohne Netz — die
  Doku war bis dahin nur online erreichbar. `tools/paket.py` legt `docs/doku/` als Ordner `doku/`
  bei; das ZIP wächst dadurch von 0,97 auf 1,43 MB (39 statt 9 Einträge).
- **Zwei Doku-Angaben waren schlicht falsch.** `docs/Liesmich.md` behauptete, die alte Adresse
  `…/Side-Project/` werde von GitHub umgeleitet — **gemessen: HTTP 404**; lebend ist ausschließlich
  `…/NetLab/`. Und `README.md` nannte die lokale `.exe` „auf dem Stand von `ausbau-1.2`", obwohl sie
  `1.2.3` meldet und der Zweig `1.2.4` ist. Beides korrigiert.

Dazu: `Programm/Netzwerk-Labor.exe` bleibt bewusst liegen (AGENTS.md: der Ordner wird nicht geleert)
und ist jetzt als **veraltet** gekennzeichnet statt als aktuell.

**Neu im Ablauf:** `.github/workflows/seite.yml` veröffentlicht zusätzlich `docs/doku/`, und ein
Schritt prüft den Stand, der wirklich hochgeht (`python3 tools/seite.py --pruefen`).

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
