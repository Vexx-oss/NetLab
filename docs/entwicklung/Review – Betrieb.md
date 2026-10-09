# Review – Betrieb und Auslieferung

> **Gegenstand:** Commit `c341c2d` („Hilfestellung: Hilfe dahin, wo der Azubi steht“) auf `ausbau-1.2`,
> **nicht gepusht** (`git status -sb`: `ahead 1`). Vorgänger `9cd66aa`.
> **Prüfer:** `fehlertexte` (Rolle Betriebs-/Auslieferungsprüfer, Aufgabe `task-17`), 09.10.2026.
> **Schreibregel eingehalten:** geändert wurde **nur diese Datei**. `python bauen.py`, `python tools/einfach.py`
> und `python tools/repo-verweise-flicken.py` wurden **nicht** ausgeführt — sie schreiben. Als Ersatz stehen
> unten Byte-Vergleiche und Zählungen an den fertigen Erzeugnissen.
> Jeder Befund hat die Form **Behauptung · Beleg · Risiko · nächster Schritt** und eine Priorität
> (**P1** = Auslieferung falsch, **P2** = fehlt für eine saubere Auslieferung, **P3** = Ordnung/Ermessen).

## Kurzurteil

* **Der Code ist betriebsreif.** Die Migration v:2 → v:3 ist in elf Punkten durchgemessen (Abschnitt 1),
  die Prüfungen des Hauses sind unverändert grün (Abschnitt 3), und die neuen Bausteine sind vollständig
  in beiden gebauten Seiten (26/26 CSS, 48/48 `spiel/*.js`, 32/32 `ui/*.js`).
* **Die Auslieferung ist es nicht.** Der Commit ändert Inhalt **und Datenform**, aber die Fassung steht
  überall weiter auf **1.2.3** (P1-1). Ein Tag `v1.2.4` scheitert ohne Fassungszug an der eigenen Prüfung
  im Release-Ablauf; ein erneutes `v1.2.3` würde die veröffentlichten Anhänge stillschweigend ersetzen.
* **Ein Regressionsbefund am Menütest ist keiner:** Die 43 Menüverletzungen sind vor und nach dem Commit
  **identisch** (je 36 erfüllt / 43 verletzt) — die dokumentierte Erwartung „49 erfüllt, 0 verletzt“
  bezieht sich auf die Android-Datei, und die ist in diesem Arbeitsbaum nicht messbar (P2-4).

| Nr. | Befund | Priorität |
|---|---|---|
| P1-1 | Fassung nicht gezogen: Inhalt v:3 unter der Nummer 1.2.3 | **P1** |
| P2-1 | `docs/CHANGELOG.md` hat keinen Abschnitt für diesen Commit | P2 |
| P2-2 | `docs/Architektur.md` widerspricht sich: `v:2` (Z. 234) gegen `v:3` (Z. 873/903) | P2 |
| P2-3 | README behauptet, die lokale `.exe` sei auf dem Stand des Zweigs — ist sie nicht | P2 |
| P2-4 | `menueprobe`-Erwartung (49/0) mit dem Arbeitsbaum nicht reproduzierbar | P2 |
| P2-5 | Der neue Wächter gegen die Anführungszeichen-Falle ist noch nicht angewendet (20 Namen) | P2 |
| P3-1 | Konzept-Dokument nennt weiter `v:2` | P3 |
| P3-2 | Die Review-Dokumente stehen nicht in `docs/INHALT.md` | P3 |
| P3-3 | `Architektur.md` § 13.5 schiebt die echten Zahlen auf „nach der Gesamtabnahme“ | P3 |

---

## 1 · Spielstand-Migration v:2 → v:3

**Quellen:** `src/spiel/zustand.js` (`Spiel.VERSION = 3`, `Spiel.leererStand`, `Spiel.migrieren`,
`Spiel.sicherungAnlegen`, `Spiel.importPruefen`, `Spiel.laden`).

### 1.1 Was gemessen ist

Ein **echter v:2-Stand** (so, wie ihn ein Spieler hat: mit laufendem Ticket ohne `hilfenFrei`, ohne
`training`, mit `dex`, `tagesraetsel`, `tagebuch`) wurde in den Speicher gelegt und über `Spiel.laden()`
geladen — der volle Weg, nicht nur `migrieren()`:

| Prüfung | Ergebnis |
|---|---|
| Standversion nach dem Laden | `v = 3` |
| Trainingsstand ergänzt | `training = {"je":{}}` |
| Trainings-API antwortet | `Spiel.training.liste()` → 34 Szenarien, `stand()` vorhanden |
| Alte Werte bleiben | `euro 42.5`, `ruf 7`, `stufe 2`, `tagesraetsel.serie 3` unverändert |
| Laufendes Ticket | bleibt erhalten (`iid i1`, Index 0), `hilfen`/`hilfeStufe` unverändert |
| Ergänzte Instanzfelder | `leiter = {}` |
| Hilfe-Konto einer v:2-Instanz | `{frei: 5, gesamt: 6}` — Zahl, kein Wurf |
| Bildungsstand ohne `einst.stufe` | Rückfall `"azubi"` |
| Sicherung vor der Migration | `store["labor-sicherung"].stand.v === 2` — der Rückweg steht |
| Zurückgeschrieben | `store["labor"].v === 3` |
| Import v:2 / ohne `v` / v:4 | angenommen / angenommen / **abgewiesen** („kennt nur v3“) |
| Kaputte v:2-Reste (`dex: [1]`, `tagesraetsel: "x"`, `tagebuch: {}`, `training: 7`) | repariert |

**Zusatzbefund (kein Fehler, aber wissenswert):** Das Postfach wird beim Laden **aufgefüllt** — aus einem
Stand mit einem offenen Ticket wurden zwei (`i1`, `i2`). Das ist `Spiel.postfachAuffuellen({still:true})`
in `Spiel.laden` und gewollt; das alte Ticket bleibt unangetastet an erster Stelle.

**Keine harte Zahl im Code:** Die Suche nach `v:2`, `v === 2`, `st.v` in `src/`, `tests/`, `tools/` findet
nur `Spiel.VERSION` und davon abgeleitete Vergleiche (`tests/spiel-speichern.test.js:211,215,225`;
`tests/spiel-fluss-zustand.test.js:38-60` prüft den v:2-Fall ausdrücklich). Es gibt **keine** Stelle, die
bricht.

### 1.2 Befunde

**P2-2 · Der Vertrag widerspricht sich bei der Schemaversion.**
*Behauptung:* `docs/Architektur.md` nennt in der Überschrift von § 7.2 weiter `v:2`, während Code und die
neuen Abschnitte `v:3` sagen.
*Beleg:* `docs/Architektur.md:234` „### 7.2 Spielstand (`store "labor"`, `v:2`)" gegen `:873` („Spielstand
`v:3`“) und `:903` („Spielstand **`v:3`** mit `training`-Feld und Migration“).
*Risiko:* Wer die Datenform nachschlägt, liest zuerst die falsche Schemaversion — genau die Zahl, über die
Migration entschieden wird.
*Nächster Schritt:* Überschrift auf `v:3` ziehen (eine Zeile).

**P3-1 · Ein Konzept-Dokument nennt weiter `v:2`.**
*Beleg:* `docs/entwicklung/Konzept – Lernplattform für Betriebe und Schulen.md:47` — „Spielstand | `v:2`
mit Migration und Ergänzern“. Protokolle (`Plan – Ausbau 1.2.md`, ältere Design-Abschnitte) nennen `v:2`
zu Recht als **damaligen** Stand; sie bleiben laut `SITZUNGSABSCHLUSS.md` unangetastet.
*Risiko:* gering (Konzept, nicht Vertrag).
*Nächster Schritt:* beim nächsten Anfassen der Datei mitziehen.

---

## 2 · Auslieferung

### 2.1 Erzeugnisse — gemessen

| Erzeugnis | Größe | SHA256 (16) | Datum |
|---|---|---|---|
| `docs/index.html` | 2.525.927 B | `1D147476F13CA092` | 09.10. 10:19:46 |
| `Netzwerk-Labor.html` | 2.525.927 B | `1D147476F13CA092` | 09.10. 10:19:47 |
| `web/index.html` (Hülle, gitignoriert) | 2.009.965 B | `2BB6E4B30B890E83` | 09.10. 10:24:00 |
| `Programm/Netzwerk-Labor.exe` | 8.217.088 B | — | **07.10. 12:38:39** |
| Commit `c341c2d` | — | — | 09.10. 10:22:30 |

* **Byte-Gleichheit der beiden ausgelieferten Seiten: ja** (`1D147476…`, beide 2.525.927 B) — Schritt 3 des
  Sitzungsabschlusses ist damit erfüllt, ohne `einfach.py` erneut laufen zu lassen.
* **0 Außenverweise, 14 eingebettete Schriften** in beiden Dateien (Zählung `(href|src)="http…"` → 0,
  `data:` → 14) — die Erwartung „0 Außenverweise“ ist ohne Neubau nachgewiesen.
* **Der Bau ist deterministisch:** `tools/rauch.py` hat `web/index.html` neu gebaut; die Datei ist davor
  und danach **byte-identisch** (`2BB6E4B3…`). Alle drei Erzeugnisse haben nach allen Messungen denselben
  Hash wie vorher — es wurde nichts am Stand verschoben.
* **Alle neuen Bausteine sind im Bau:** 26/26 `src/stil/*.css` (Marker `/* ---- <name>.css ---- */`),
  48/48 `src/spiel/*.js`, 32/32 `src/ui/*.js`; `hilfe.css`, `training.css`, `stufensystem.css`,
  `lernstand-hilfe.css` und die neue Regel `.hl-fehler` sind enthalten.

### 2.2 Die acht Schritte (`docs/SITZUNGSABSCHLUSS.md`)

| Schritt | Stand | Beleg |
|---|---|---|
| 1 Aufräumen | ✅ | `git status` beim Start leer; keine Erzeugnisse im Commit (`web/`, `dist/`, `.exe` fehlen) |
| 2 Fassung ziehen | ❌ **nicht geschehen** | `bauen.py` `VERSION = "1.2.3"`, `tauri.conf.json` `"version": "1.2.3"` → P1-1 |
| 3 Prüfen und bauen | ⚠️ Prüfungen ✅, Bau **nicht neu** (schreibt) | 395/395 · ethos GRÜN · klassen 0 · sim-stand unverändert · rauch 36/36 · Byte-Gleichheit + Marker-Zählung als Bau-Ersatz |
| 4 Die `.exe` | ❌ **nicht neu gebaut** | lokal 07.10., Quellen 09.10. → P2-3; die Release-`.exe` baut die CI korrekt (`release.yml:155` `python bauen.py` vor `cargo build`) |
| 5 Stand nachziehen | ⚠️ teilweise | `Architektur.md` + Design-Notiz ✅, **`docs/CHANGELOG.md` fehlt** (P2-1), `INHALT.md` unberührt |
| 6 Committen | ✅ | `c341c2d`, 30 Dateien, lokal |
| 7 Veröffentlichen | ✅ **zu Recht nicht** | `ahead 1`; Push/Tag/Release brauchen ausdrückliche Freigabe des Nutzers |
| 8 Nachmessen | ✅ | `seite-pruefen.py`: live `1.2.3`, Baukennung **`b74f840f`** gegen lokal **`1ac4d858`** → online steht der **alte** Stand |

### 2.3 Befunde

**P1-1 · Die Fassung wurde nicht gezogen — die Auslieferung wäre falsch.**
*Behauptung:* Der Commit liefert neue Spielfunktion und eine neue Schemaversion aus, aber jede
Fassungsangabe steht weiter auf 1.2.3. Wird jetzt veröffentlicht, bekommt dieselbe Nummer einen anderen
Inhalt.
*Beleg:*
* `python tools/fassung-ziehen.py --neu 1.2.4` (Trockenlauf, nichts geschrieben): 17 Stellen gefunden —
  `bauen.py`, `Cargo.toml`, `tauri.conf.json`, `release.yml` (2×), `docs/Bauen.md` (2×), `README.md` (4×),
  `android/LIESMICH.md` (2×), `docs/Liesmich.md` (2×), `AndroidManifest.xml`, `Cargo.lock` (eigener Block);
  **1 Muster nicht gefunden** („Sie ist **1.2.3** (gebaut am“ in `README.md`) → Exit 1, „bitte ansehen“.
* `.github/workflows/release.yml:170-172`: `$soll = $tag -replace '^v',''`; `if ($ist -ne $soll) { throw }` —
  ein Tag `v1.2.4` **scheitert**, solange `tauri.conf.json` 1.2.3 meldet; der Windows-Job hängt dann keine
  `.exe` an.
* `.github/workflows/release.yml:102-114` (Linux) und `:187-196` (Windows) **ersetzen** gleichnamige Anhänge
  (idempotenter Ablauf) — ein erneutes `v1.2.3` würde die veröffentlichten Anhänge stillschweigend
  austauschen.
* `README.md:29` „Alle drei Wege liefern dieselbe Fassung `1.2.3`“ und `README.md:287` „Die `.exe` in
  `Programm/` ist auf dem Stand von `ausbau-1.2`“ — beides wird mit diesem Commit falsch.
* `.github/workflows/seite.yml:21-22` veröffentlicht bei **jedem** Push auf `ausbau-1.2` — ein Push ohne
  Fassungszug stellt die neue Seite unter der alten Nummer online, während ZIP und `.exe` im Release alt
  bleiben.
* Gemessen: in `docs/index.html`, `web/index.html`, `Netzwerk-Labor.html` steht `LABOR_VERSION = "1.2.3"`.
*Risiko:* Zwei verschiedene Stände unter einer Nummer; Rückfragen („welche 1.2.3 hast du?“) sind nicht
beantwortbar; ein reguläres `v1.2.4`-Release ist ohne Fassungszug blockiert.
*Nächster Schritt (in dieser Reihenfolge):* (1) README-Muster für `fassung-ziehen.py` richten, bis der
Trockenlauf 0 Fehler meldet; (2) `python tools/fassung-ziehen.py --neu 1.2.4 --setzen`;
(3) `VERSION_CODE` in `android/bauen.py` von Hand über den aus `versionName` abgeleiteten Wert ziehen;
(4) `docs/CHANGELOG.md`-Abschnitt 1.2.4 schreiben (mit den Zahlen aus Abschnitt 3);
(5) `python bauen.py` → `python tools/einfach.py` (+ `--ziel Netzwerk-Labor.html`), Byte-Gleichheit prüfen;
(6) `.exe` bauen lassen **oder** bewusst auf den CI-Bau im Release setzen; (7) committen; (8) Push/Tag
einzeln freigeben lassen.

**P2-1 · Kein CHANGELOG-Abschnitt.**
*Beleg:* `docs/CHANGELOG.md` ist **nicht** im Commit (`git show --name-only HEAD`); der jüngste Abschnitt
ist „## 1.2.3 — Tag `v1.2.3` (Klassenraum-Spezifikation; Spiel unverändert)“ (Z. 137) — die Aussage „Spiel
unverändert“ wäre nach diesem Commit falsch.
*Risiko:* Der Verlauf behauptet, seit 1.2.3 habe sich nichts geändert; `SITZUNGSABSCHLUSS.md` Schritt 5
verlangt den Abschnitt mit **gemessenen** Zahlen und den SHA256 der erzeugten Dateien.
*Nächster Schritt:* Abschnitt „1.2.4“ mit den Zahlen aus diesem Review (395/395, ethos, klassen,
sim-stand, 36/36, Migration) und den SHA256 von `docs/index.html` / `Netzwerk-Labor.html`.

**P2-3 · Die lokale `.exe` ist älter als der Zweig, und das README sagt das Gegenteil.**
*Beleg:* `Programm/Netzwerk-Labor.exe` 07.10. 12:38:39 (8.217.088 B) — jüngste Quelldatei 09.10. 10:19,
Commit 09.10. 10:22:30. `README.md:287` behauptet, sie sei „auf dem Stand von `ausbau-1.2`“. `tauri.conf.json`
lädt `"frontendDist": "../../web"` (gitignoriert, weil erzeugt) — die lokale `.exe` trägt also den
**web/-Stand vom 07.10.**, ohne Hilfestellung.
*Risiko:* `python tools/q-echt.py` („echtes Programm“) würde den **alten** Stand prüfen und dafür grün
melden; wer die `.exe` aus `Programm/` weitergibt, liefert die alte Fassung.
*Nächster Schritt:* Entweder `cargo tauri build --no-bundle` + Kopie nach `Programm/` + `tools/q-echt.py`
(Schritt 4, ~4–5 min) — oder im README ausdrücklich schreiben, dass die lokale `.exe` auf dem Stand vom
07.10.2026 ist und die Release-`.exe` aus der CI kommt.

**P2-4 · Die Menüprobe-Erwartung ist mit dem Arbeitsbaum nicht reproduzierbar — aber der Commit ist keine
Verschlechterung.**
*Beleg (drei Messungen, Edge headless):*
* `python tools/menueprobe.py --datei android/bau/assets/index.html --lauf` (der in `AGENTS.md`
  dokumentierte Befehl): `ROT: 5 Profil(e), 20 Kriterien erfüllt, 3 verletzt` + **„Fehler im Messskript
  ["kein UI"]“** — die Erwartung lautet „49 Kriterien erfüllt, 0 verletzt“.
* `python tools/menueprobe.py --lauf` (Vorgabe: `docs/index.html`): `ROT: 36 erfüllt, 43 verletzt`.
* Dieselbe Datei aus **`HEAD~1`** (`9cd66aa`, vor diesem Commit) in eine temporäre Kopie gezogen und
  gemessen: `ROT: 36 erfüllt, 43 verletzt` — **identisch**. Die Verletzungen sind also vorbestehend
  (Trefferflächen unter 44 px: „Fach schließen“ 30×30, Kontext-/Ansicht-/Zoom-Menü 206×38, Dock
  44×36 und 32×32), keine Folge dieses Commits.
*Risiko:* Die Zahl in `AGENTS.md`, `README.md` und `docs/Liesmich.md` („5 Profile, 49 Kriterien erfüllt,
0 verletzt“) beschreibt einen Stand, den niemand mehr nachmessen kann; ein Abnehmer hält den Lauf für
kaputt oder die Doku für falsch.
*Nächster Schritt:* `python android/bauen.py` (schreibt, deshalb hier nicht gelaufen) und den
dokumentierten Befehl wiederholen; danach die Zahl in `AGENTS.md`/`README.md`/`docs/Liesmich.md` auf den
gemessenen Stand ziehen **oder** die Erwartung ausdrücklich auf die Web-Datei umschreiben.

**P2-5 · Der Wächter gegen die Anführungszeichen-Falle liegt bereit, ist aber nicht angewendet.**
*Beleg:* `node tools/pruefe-namen-flicken.js` (Trockenlauf): „46 Datei(en) geprüft, **0 geschrieben**,
0 laden nicht“ — und „würde flicken“ für **20 `pruefe()`-Namen in 10 Dateien**, darunter
`tests/spiel-fehlertexte.test.js` (2: Z. 149 und 285) und `tests/spiel-training.test.js` (4). Heute lädt
alles (395/395), die Namen sind intakt — die Falle ist **latent**, nicht akut.
*Risiko:* Die nächste Bearbeitung eines solchen Namens setzt ein ASCII-`"` hinein, der String endet zu
früh, und der **ganze** Lauf stirbt mit `LADEFEHLER` (Exit 2) — an einem Tag bereits dreimal passiert.
*Nächster Schritt:* Wenn die Review-Schreibarbeiten beendet sind, einmal `--setzen` laufen lassen
(ändert fremde Dateien → Lead), danach `node tests/run.js` zur Gegenprobe.

---

## 3 · Prüfwerkzeuge: was lief, was nicht

Alle Angaben aus dieser Sitzung, an **diesem** Stand (Commit + Arbeitsbaum) gemessen.

| Werkzeug (Tabelle `AGENTS.md`) | Erwartung | Ergebnis |
|---|---|---|
| `sh tools/test.sh` → `node tests/run.js` | N/N grün | **395/395 grün** (46 Testdateien, 81 Module), exit 0 |
| `sh tools/test.sh --rauch` | zusätzlich 36/36 | `python tools/rauch.py` → **36/36 grün** |
| `python tools/klassen.py` | `0 Klassen ohne CSS-Regel` | **0** |
| `python tools/ethos.py` | GRÜN | **GRÜN** gegen `tests/stil-stand.json` |
| `node tools/sim-stand.js` | unverändert | **„Simulation unverändert gegenüber dem Referenzstand.“** |
| `python tools/ablaeufe.py` (neu entdeckt) | Abläufe gültig | **GRÜN: alle Ablaeufe gueltig und vollstaendig** (`seite.yml`, `release.yml`, …) |
| `python tools/nachprobe-menuefix.py` | `GRÜN: alle drei Befunde behoben` | **GRÜN** |
| `python tools/seite-pruefen.py` | veröffentlichte Seite | **GRÜN** — live 1.2.3, Baukennung `b74f840f` gegen lokal `1ac4d858` (Hinweis) |
| `node tools/pruefe-namen-flicken.js` (neu) | trocken zuerst | 46 geprüft, 0 geschrieben, 0 laden nicht, 20 offene Namen → P2-5 |
| `python tools/fassung-ziehen.py` | Trockenlauf zuerst | gelaufen mit `--neu 1.2.4`: **1 Fehler** (README-Muster) → P1-1 |
| `python tools/menueprobe.py … --lauf` | 5 Profile, 49/0 | **nicht reproduzierbar** (Android: „kein UI“; Web: 36/43, identisch zu `HEAD~1`) → P2-4 |
| `python tools/repo-verweise-flicken.py` | tote Verweise | **nicht ausgeführt (schreibt)**. Ersatz: eigene Lese-Prüfung über 54 Markdown-Dateien, **70 relative Verweise, 0 tot** |
| `python bauen.py` | läuft durch | **nicht ausgeführt (schreibt)**. Ersatz: Marker-Zählung 26/26 · 48/48 · 32/32 und Byte-Gleichheit beider Seiten |
| `python tools/einfach.py` | beide byte-gleich, 0 Außenverweise | **nicht ausgeführt (schreibt)**. Ersatz: SHA256 gleich, **0 externe `href`/`src`**, 14 `data:`-URIs |
| `python android/bauen.py` | GRÜN | **nicht ausgeführt** — außerhalb dieses Auftrags (Vertrag § 9), schreibt `android/bau/` |
| `pwsh shell/entwickeln.ps1 -NurBauen` | Debug-Bau | **nicht ausgeführt** — Rust-Bau, schreibt `target/` |
| `python tools/q-echt.py` | startet die `.exe` | **nicht ausgeführt** — GUI-Fenster; die lokale `.exe` ist zudem veraltet (P2-3) |
| `python tools/messen.ps1` | CPU/RAM | **nicht ausgeführt** — verlangt eine **laufende** `Netzwerk-Labor.exe` |
| `python tools/paket.py` | Paket | **nicht ausgeführt** — schreibt `dist/`, und der Release-Ablauf ruft es selbst auf |
| Klassenraum-Proben (Codec ~250 s, `cargo build`, HTTP-Probe) | 2²⁰ Nutzlasten · 10/10 · 20/20 | **nicht ausgeführt** — gehören nicht zu diesem Commit; die Klassenraum-Spezifikation ist laut `INHALT.md:36` „noch nicht umgesetzt“ |
| `tools/starttest.py`, `tools/sonde-*.py`, `tools/kopier-*.py`, `tools/tasten-probe.py` | GUI-Messungen | **nicht ausgeführt** — brauchen ein sichtbares Fenster |

**Nebenwirkungen der Messungen:** `tools/rauch.py` hat `web/index.html` neu gebaut (gitignoriert) — die
Datei ist danach **byte-identisch** (`2BB6E4B3…`), alle drei Erzeugnisse haben denselben Hash wie vorher.
Es sind keine Messordner im Arbeitsbaum geblieben (`_probe-browser/` wurde nicht angelegt).

---

## 4 · Feste Dateilisten

**Befund: keine feste Liste, die ergänzt werden müsste — die neuen Dateien werden überall automatisch
aufgenommen.** Belege (jeweils im Quelltext gelesen und die Wirkung gezählt):

| Ort | Mechanismus | Wirkung am Bau |
|---|---|---|
| `bauen.py` | je Schicht `sorted(d.glob("*.js"))`, `src/stil/*.css` | Marker im Bau: **48/48** `spiel`, **32/32** `ui`, **26/26** `stil` |
| `tests/run.js` | `readdirSync().filter(*.test.js)` | **46/46** Testdateien geladen |
| `tools/ethos.py` | `sorted(STIL.glob("*.css"))` | 26 Dateien, GRÜN |
| `tools/klassen.py` | `(SRC/"stil").glob("*.css")`, `(SRC/"ui").glob("*.js")` | 0 Klassen ohne CSS-Regel |
| `tools/ablaeufe.py` | `.github/workflows` | GRÜN |
| `tools/paket.py` | feste **Vorlagen** (`Vorlagen/`, Lizenzen, `schriften/`) — keine Modulliste | nicht betroffen |
| `tools/seite-pruefen.py`, `tools/menueprobe.py` | arbeiten auf der gebauten Datei | nicht betroffen |

Die einzige Aufzählung der neuen Dateien steht in der **Dokumentation**: `docs/Architektur.md` § 13.4
(Z. 891-898) nennt alle neuen Module und Stile — vollständig, inklusive `src/spiel/fehlertexte.js`.

---

## 5 · Wiederherstellbarkeit

* `git show --stat HEAD`: **30 Dateien**, darunter die beiden erzeugten Seiten `docs/index.html` und
  `Netzwerk-Labor.html` — ein `git revert` nimmt beide mit zurück.
* `git cat-file -p HEAD`: **genau ein** `parent` (`9cd66aa`) → kein Merge, kein Konfliktpotenzial; der
  Arbeitsbaum war beim Commit sauber, die Umkehrprobe würde also ohne Konflikt anwenden.
* Der Commit ist **nicht gepusht** (`ahead 1`) → online ist nichts zu widerrufen; die veröffentlichte Seite
  ist unverändert der alte Stand (live gemessen, Abschnitt 3).
* **Nicht ausgeführt:** `git revert` selbst (er würde den Arbeitsbaum schreiben) — die Aussage stützt sich
  auf Elternzahl, Dateiliste und den sauberen Stand.

---

## 6 · Ordnungsbefunde (P3)

**P3-2 · Die Review-Dokumente stehen nicht im Notiz-Index.**
*Behauptung:* `docs/INHALT.md` sammelt die Notizen des Projekts, führt die mit diesem Auftrag
entstandenen Review-Dateien aber nicht auf.
*Beleg:* `docs/INHALT.md:31-38` listet Design, Plan, Konzept, Befund, Klassenraum, Opus-Auftrag —
  `Review – Betrieb.md` (diese Datei) und die parallel entstandenen `Review – Auffindbarkeit.md`,
  `Review – Lernwirkung.md`, `Review – Wartbarkeit.md`, `Review – Betrieb-Werkzeuge.md` fehlen.
*Risiko:* gering — die Dateien sind auffindbar, solange man den Ordner öffnet; der Index ist die
  vereinbarte Einstiegsstelle.
*Nächster Schritt:* nach Abschluss der Reviews eine Zeile „Review – …“ im Abschnitt „Entwicklung“
  ergänzen (oder bewusst lassen: `SITZUNGSABSCHLUSS.md` Schritt 5 verlangt `INHALT.md` nur bei Umzügen).

**P3-3 · Der „Stand der Umsetzung“ verschiebt die echten Zahlen auf später.**
*Behauptung:* `AGENTS.md` verlangt „Kein Commit ohne Stand“; der neue Abschnitt nennt aber keine Zahlen,
sondern kündigt sie an.
*Beleg:* `docs/Architektur.md:900-907` — „### 13.5 Stand der Umsetzung (07.10.2026) … Die Bausteine A–J
entstehen parallel; **diese Zeile wird nach der Gesamtabnahme durch die echten Zahlen ersetzt.**“
Gemessen sind diese Zahlen inzwischen: **395/395 grün**, ethos GRÜN, klassen 0, sim-stand unverändert,
rauch 36/36, Migration in elf Punkten geprüft.
*Risiko:* Wer den Commit liest, sieht keinen belastbaren Stand; die Abnahme muss die Zahlen erneut
zusammentragen.
*Nächster Schritt:* nach der Gesamtabnahme § 13.5 mit Datum und den gemessenen Zahlen füllen — zusammen
mit dem CHANGELOG-Abschnitt (P2-1).

## Was ich **nicht** geprüft habe

* Die Oberfläche mit eigenen Augen (kein Bildschirmfoto möglich); die Wirkung ist über `rauch.py` (36/36),
  `menueprobe.py` und die Tests belegt, nicht über Augenschein.
* `python tools/q-echt.py` und `tools/messen.ps1` — GUI bzw. laufendes Programm.
* Ein echter `.exe`-Start und die Produktversion **in der lokalen Binärdatei** (nur ihr Datum und die
  Tatsache, dass die CI die Release-`.exe` baut, sind gemessen).
* `python bauen.py` / `python tools/einfach.py` als Lauf (sie schreiben) — ersetzt durch Byte- und
  Marker-Prüfungen an den fertigen Erzeugnissen.
* Android/APK (`android/bauen.py`) und die Klassenraum-Proben.
* Ob die veröffentlichte Seite nach einem Push wirklich aktualisiert würde (kein Push, keine Freigabe).

## Belege: die verwendeten Befehle

```powershell
git status -sb ; git log --oneline -3 ; git show --stat HEAD ; git cat-file -p HEAD
(Get-FileHash docs/index.html).Hash ; (Get-FileHash Netzwerk-Labor.html).Hash
node tests/run.js ; python tools/ethos.py ; python tools/klassen.py ; node tools/sim-stand.js
python tools/ablaeufe.py ; python tools/nachprobe-menuefix.py ; python tools/rauch.py
python tools/menueprobe.py --lauf ; python tools/menueprobe.py --datei <HEAD~1-Kopie> --lauf
python tools/seite-pruefen.py ; python tools/fassung-ziehen.py --neu 1.2.4
node tools/pruefe-namen-flicken.js            # Trockenlauf, ohne --setzen
```
