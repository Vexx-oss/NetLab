# 🔎 Review – Auffindbarkeit und Spielerführung (Aufgabe R5)

⬆️ [[10-Projekte/Lernprojekte/Netzwerk-Labor/Liesmich|Netzwerk-Labor]] · Vertrag: [[Hilfestellung – Stufen und Schnittstellen]] · Rolle: Prüfer für Auffindbarkeit

> **Frage dieses Reviews:** Findet ein Azubi im 1. Lehrjahr die Hilfestellung überhaupt, und versteht er sie?
> Geprüft wurde die **erste Stunde** — vom ersten Blick auf die Begrüßungskarte bis zum ersten Fehler im Terminal.
> Stand: Commit `c341c2d`, `node tests/run.js` 395/395 grün. **Kein Code geändert** — dieses Dokument ist der ganze Auftrag.

## Verfahren (ehrlich: was gemessen wurde und was nicht)

| Punkt | Verfahren | Belastbarkeit |
|---|---|---|
| 1, 4, 5 | Quelltext gelesen (`src/ui/*.js`, `src/spiel/*.js`, `src/stil/*.css`), Zeilen zitiert | Beleg aus dem Code |
| 2 | **DOM-Attrappe**: `src/ui/hilfe.js` in einem eigenen vm-Bereich geladen, `UI.hilfe.zeichnen(...)` mit echtem Netz (Generator, Seed 7) aufgerufen, danach `button` gezählt und `textContent` in Zeichen gemessen | gemessen, nicht geschätzt |
| 3 | Zeichenzählung über die geladenen Datenpakete (`DATEN.hilfen`, `Spiel.FEHLERTEXTE`, `DATEN.lehrtexte`, `Spiel.mini.hilfe`) und über die DOM-Attrappe | gemessen |
| 5 (Geometrie) | Rechnung aus den CSS-Zahlen; **keine** Layout-Messung im Browser | **nicht gemessen** — in dieser Umgebung gibt es kein CDP/keinen Browser (Briefing). Die Aussage „im zugeklappten Zustand nicht klickbar“ folgt aus `overflow:hidden` + Höhe 56 px + `opacity:0`, nicht aus einem Bildschirmfoto. |

Reproduktion der Messungen (read-only, kein Testlauf nötig): die beiden Skripte aus diesem Review laden dieselben Schichten wie `tests/run.js` (`kern · lernmotor · modell · sim · cli · daten · spiel`), setzen `Spiel._trocken = true`, bauen eine Instanz mit `Spiel.instanzErstellen({gen:{skill:"lab.link", seed:7}})` und rufen `UI.hilfe.zeichnen` mit einem IOS-Gerät des Netzes auf.

---

## Befund 1 · P1 — Die Stufenwahl steht **unter** dem Startknopf und verschwindet mit der Karte

**Behauptung.** Die Wahl des Bildungsstands sitzt in der Begrüßungskarte, aber **nach** den beiden Knöpfen „Zeig mir den ersten Auftrag“ und „Erst umsehen“. Wer den Primärknopf drückt, hat die Wahl nie gesehen — und sie kommt nicht wieder.

**Beleg.**
* `src/ui/spiel.js:690-694` baut die Karte: erst `T.BEGRUESSUNG`, dann `.sp-einstieg-knoepfe` mit „Zeig mir den ersten Auftrag“ (`knopf primaer`, also die auffälligste Fläche) und „Erst umsehen“.
* `src/ui/start.js:157-161` hängt die Wahl **ans Ende** derselben Karte: `ziel.append(k)` — also unter die beiden Knöpfe.
* `src/ui/spiel.js:683-689` (`wahl`): jeder Klick setzt `Spiel.einstieg.waehlen(weg)`, und `st` wird damit `begruessung` gesetzt; `src/spiel/erstestunde.js:164` macht daraus `begruessungNoetig() === false` — die Karte (mit der Wahl) erscheint **nie wieder**.
* Der Text über der Wahl sagt es selbst: `src/spiel/erstestunde.js:127` — „Wie viel Hilfe darf es sein? **Umstellen geht jederzeit in den Einstellungen.**“ Der Satz stimmt, er steht nur unter dem Knopf, der die Karte schließt.

**Wirkung auf einen Azubi im 1. Lehrjahr.** Er liest 138 Zeichen Begrüßung (`src/spiel/erstestunde.js:115`), sieht darunter zwei Knöpfe und klickt den blauen. Damit ist der Bildungsstand auf `azubi` festgelegt — zufällig die richtige Voreinstellung, aber **die Wahl war unsichtbar**. Will er später etwas ändern, muss er den Zahnrad-Knopf ohne Beschriftung finden (`src/ui/app.js:218`, nur Symbol + `title="Einstellungen"`) und dort den Abschnitt „Bildungsstand“ (`src/ui/stufensystem.js:81`). Das Wort „Bildungsstand“ kennt er nicht.

**Vorschlag (kleinste Änderung, eine Zeile in `src/ui/start.js`).**
`ziel.append(k)` → `ziel.insertBefore(k, ziel.querySelector(".sp-einstieg-knoepfe") || null)` (mit `append` als Rückfall, wenn der Knopfblock fehlt).
Damit steht die Frage „Wie viel Hilfe darf es sein?“ **vor** den beiden Knöpfen: Der Azubi wählt zuerst und startet danach — oder drückt trotzdem sofort los, dann bleibt `azubi` wie bisher.
*Optional, zweite Zeile:* im Toast beim Klick auf „Erst umsehen“ (nicht auf dem Primärweg) einmal „Bildungsstand: Azubi — änderbar unter ⚙ Einstellungen“ melden. Nicht nötig, wenn der erste Vorschlag umgesetzt ist.

## Befund 2 · P2 — Ethos-Regel R12: für den Streifen allein eingehalten, in der Ansicht um das Dreifache überschritten

**Behauptung.** Der Vorschlagsstreifen zeigt **4 Knöpfe** (azubi) bzw. **5** (azubi-plus) — als *Fläche* also unter der Grenze von 6. Die Regel R12 („höchstens 6 Bedienelemente je Ansicht“, `tools/ethos.py:300-317`) wird aber über `document.querySelectorAll` **im ganzen Dokument** gemessen; die Terminal-Ansicht enthält schon ohne den Streifen **19** Bedienelemente. Die Regel ist damit nicht „vom Streifen verletzt“, sondern **für diese Ansicht falsch geschnitten**.

**Beleg (gemessen an der DOM-Attrappe, echtes `src/ui/hilfe.js`, Netz aus `Spiel.instanzErstellen`, Modus `priv`, Fehlerfall „Invalid input“):**

| Stufe | Knöpfe im Streifen | davon | Zeichen im Streifen gleichzeitig |
|---|---|---|---|
| azubi | **4** | 3 × `hl-sprosse-knopf` (Link, Route, ACL und Dienst) + 1 × `hl-knopf` | **1 279** |
| azubi-plus | **5** | 3 × `hl-sprosse-knopf` + 2 × `hl-knopf` | **1 404** |
| geselle (nach Fehler) | **4** | wie azubi | 930 |
| geselle (ohne Fehler) / meister | **0** | — | 0 |

Die Knöpfe entstehen an genau drei Stellen in `src/ui/hilfe.js`: `hl-knopf` (Zeile 64), `hl-lauf` (Zeile 67, nur `art === "pruefen"`) und `hl-sprosse-knopf` (Zeile 78, je Leiter-Sprosse mit passendem Befehl — hier 3 von 6).
Alles andere in der Ansicht zählt R12 mit: Kopfzeile **9** (`src/ui/app.js:197-219`: vier klickbare Werte + Strg+K, Leiste, Hell/Dunkel, Einstellungen, Tastenkürzel), Andockleiste **8** (`src/ui/app.js:23` `REIHE`), Terminal aus **2** (`<textarea class="ko-eingabe">`, `src/ui/konsole.js:109`, und der Knopf „Leeren“, Zeile 122) → **zusammen ≥ 23**. Das ist kein Fehler des Streifens: die Ansicht war schon vor der Hilfestellung dreifach über der Grenze. `tools/ethos.py` führt R12 deshalb mit Stand **0** und druckt ohne `--dom` „übersprungen“ — die Zahl ist nie gemessen worden.

**Wirkung auf einen Azubi.** Zwei Wirkungen: (a) 4–5 zusätzliche Knöpfe in einer Zeile sind noch überschaubar, aber sie stehen zwischen sechs gleich aussehenden Sprossen und dem Vorschlag — die *eine* Handlung, die er sucht („welchen Befehl tippe ich?“), ist nicht die auffälligste. (b) Die Regel, die das begrenzen sollte, greift hier nicht und wird deshalb auch nicht nachgezogen.

**Vorschlag.**
1. R12 **je Fläche** definieren statt je Dokument: Messung mit einem Container („höchstens 6 Bedienelemente je Hilfefläche / je Karte“), oder die Zahl auf den Ist-Stand der Ansicht beziehen. Sonst ist jede neue Fläche automatisch rot oder die Regel bleibt ungelesen.
2. Im Streifen: höchstens **einen** Aktionsknopf je Vorschlag zeigen — `hl-lauf` („Ausführen“) nur beim *ersten* Vorschlag, bei weiteren nur `hl-knopf` („in die Eingabe“). Spart bei azubi-plus einen Knopf und macht die Zeile ruhiger.

## Befund 3 · P2 — Die Textwand im Streifen: 1 279 Zeichen auf einmal, davon 243 für eine einzige Erklärung

**Behauptung.** Im Fehlerfall liest ein Azubi im Streifen **gleichzeitig** Fehlererklärung (281 Zeichen), „Was geht hier?“ (210), die sechs Sprossen der Werkzeugleiter (356), den Vorschlag (265) und die Syntax-Brücke (157) — zusammen **1 279 Zeichen**; bei azubi-plus **1 404**. Die längste Einzelerklärung im Streifen misst 115, die längste Fehlererklärung der Stufe „ausführlich“ **264** Zeichen. Gegen die bestehende Oberfläche ist das nicht aus dem Rahmen (Lehrtexte bis 440 Zeichen), aber dort erscheint **ein** Text auf Klick — hier erscheinen fünf Textblöcke nebeneinander.

**Beleg (gemessen).**
* Streifen, azubi, mit Fehler: 1 279 Zeichen gesamt — `hl-fehler` 281, `hl-geruest` 210, `hl-leiter` 356, `hl-vorschlaege` 265, `hl-bruecke` 157 (`hl-kopf` 10).
* Ohne Fehler: 795 Zeichen (kein Fehlertext, keine Brücke).
* Längste `erklaerung` in `DATEN.hilfen.VORSCHLAEGE` (29 Einträge): **115 Zeichen**, `dienst-ios-run` (`src/daten/hilfen.js:125`); längste `syntax`: 71.
* Längste `ausfuehrlich`-Erklärung in `Spiel.FEHLERTEXTE` (82 Einträge): **264 Zeichen**, `ios-unknown-exec` (`src/spiel/fehlertexte.js:207`); danach `ios-invalid` 243 (Zeile 177), `win-dns-timeout` 241, `win-telnet-port` 238.
* Vergleich Bestand: `DATEN.lehrtexte` (34 Codes) — längster E-Text **440 Zeichen** (`DHCP_ROGUE_OFFER`), erscheint aber nur auf Klick im Erklären-Panel, ein Text zur Zeit. Mini-Ticket: längste Denkhilfe **125 Zeichen** (gemessen über alle 92 Minis), Frage ≤ 140 (Vertrag), Erklärung erst nach der Antwort.
* Die Stufe schützt nur halb: `geselle` bekommt mit `knapp` 39 Zeichen statt 243 — **azubi-plus bekommt denselben langen Text wie azubi** (Vertrag § 3: `erklaerung:"ausfuehrlich"` für beide). Genau die Stufe, die „knapper“ versprochen bekommt, liest am meisten: **1 404 Zeichen**.

**Wirkung auf einen Azubi im 1. Lehrjahr.** Nach dem ersten Tippfehler bekommt er fünf Kästen auf einmal. Er liest den ersten Satz, sieht darunter 350 Zeichen Leiter und 250 Zeichen Vorschlag und macht zu — die hilfreiche Zeile („Tippe an dieser Stelle ein Leerzeichen und dann ?“) steht im Fehlerkasten, der oberste ist also richtig gewählt; die Wiederholung darunter verwässert sie.

**Vorschlag (kleinste Wirkung).** Im Streifen **eine** Sache je Zustand führen: Ist ein Fehler da, zeigt der Streifen Fehlertext + **den ersten** Vorschlag; Gerüst und Leiter klappen erst auf Klick auf („Werkzeugleiter (6)“). Ohne Fehler bleibt es wie heute. Das ist eine Änderung an `src/ui/hilfe.js` (zeichnen) und optional ein `aufklappen`-Zustand — kein Datenumbau.

## Befund 4 · P1 — Vier Dinge heißen „Stufe“: die Kopfzeile widerspricht sogar ihrem eigenen Tooltip

**Behauptung.** „Stufe“ bedeutet im Programm vier verschiedene Dinge, und an mindestens einer Stelle stehen zwei Bedeutungen gleichzeitig auf dem Bildschirm. Die kleinste Klarstellung: **zwei sichtbare Zeichenketten** ändern, nicht das Vokabular umbauen.

**Beleg.** Die vier Bedeutungen:

| Bedeutung | Feld | sichtbar als |
|---|---|---|
| Karriere-Stufe | `Spiel.st.stufe` | Kopfzeile `src/ui/app.js:133` (`Stufe 2`), Balken-Tooltip `src/ui/spiel.js:34`, Aufstiegsfeier `src/ui/karriere.js:475` |
| Bildungsstand | `Spiel.einst.stufe` | Begrüßungskarte, Einstellungen „Bildungsstand“, Trainingskopf `src/ui/training.js:35` (`Stufe azubi`) |
| Erklärtiefe | `Spiel.einst.niveau` | Einstellungen „Erklärtiefe“ (`src/ui/app.js:317-319`) |
| Prüfungsstrenge je Ticket | `Spiel.einst.wahl`, `inst.niveau` | Einstellungen **„Niveau“** (`src/ui/karriere.js:381`), Chip am Ticket `src/ui/spiel.js:641` (`AP1 · Risiko …`) |
| (dazu) Hilfeleiter-Sprosse | `inst.hilfeStufe` | `src/ui/spiel.js:264` (`Stufe 3/6`) |
| (dazu) Fertigkeitsstufe | `DATEN.skills[].stufe` | Wiki-Kopf `src/ui/karriere.js:303` (`Stufe 3 · AP1`) |

Die Stellen, an denen es sich **beißt**:
1. **`src/ui/app.js:133` gegen `src/ui/app.js:200`** — derselbe Wert zeigt sichtbar `Stufe 2`, sein Tooltip sagt `Karriere-Stufe`. Die sichtbare Beschriftung ist die falsche.
2. **Zwei Einstellungen mit demselben Aussehen, zwei Namen:** `src/ui/app.js:317-319` heißt „Erklärtiefe“ (Einstieg/AP1/AP2), `src/ui/karriere.js:381` heißt „Niveau“ (Automatisch/Einstieg/AP1/AP2) und meint die Prüfungsstrenge je Ticket. Der Vertrag nennt die zweite ausdrücklich „Prüfungsstrenge je Ticket“ (§ 1) — nur die Oberfläche sagt „Niveau“.
3. **`src/ui/training.js:35`** — `Stufe azubi` meint den Bildungsstand, während im selben Fenster die Kopfzeile `Stufe 2` die Karriere meint. Die Datei zeigt zwei Zeilen später (Zeile 52) vorbildlich `Karriere-Stufe` — zwei Wörter für dieselbe Sache, eines davon falsch.
4. **`src/ui/spiel.js:264`** — `Stufe 3/6` meint die Hilfestufe (Sprosse der Hilfeleiter), nicht die Karriere. Die Schaltfläche daneben heißt „Hilfe“; das Wort „Stufe“ ist dort überflüssig.
5. **Gleichzeitig auf einem Bildschirm:** Kopfzeile `Stufe 3` (Karriere) und Lernstand-Hinweis `Stufe 1 von 4 · Azubi (1. Lehrjahr)` (`src/ui/lernstand-hilfe.js:100`) — beide sagen „Stufe“, beide meinen etwas anderes.

**Wirkung auf einen Azubi im 1. Lehrjahr.** Er liest „Stufe 3“ in der Kopfzeile, klickt auf den Lernstand und liest dort „Stufe 1 von 4“. Er kann nicht wissen, dass das zwei Achsen sind; im schlechtesten Fall hält er den Bildungsstand für seinen Spielfortschritt und dreht ihn hoch („ich bin doch schon Stufe 3“) — und verliert genau die Hilfe, die ihm fehlt.

**Vorschlag — die kleinste Klarstellung (zwei Zeichenketten, kein Umbau).**
1. `src/ui/app.js:133` → `Karriere ${x}` (bzw. `Karriere-Stufe ${x}`): die Kopfzeile sagt dann dasselbe wie ihr Tooltip.
2. `src/ui/training.js:35` → `Bildungsstand ${stufe}`.
*Wenn eine dritte Zeile erlaubt ist:* `src/ui/karriere.js:381` „Niveau“ → „Prüfungsstrenge je Ticket“ (das Wort aus dem Vertrag, § 1) — damit sind die beiden Einstellungen mit identischen Optionen (E/AP1/AP2) unterscheidbar.
Alles Weitere ist Kür und kann warten: `spiel.js:264` → `Hilfe ${stufe}/6` (die Schaltfläche darunter heißt schon „Hilfe“); Wiki-Kopf langfristig `Lernstufe 3 · AP1`. **Nicht** umbenennen sollte man `Spiel.st.stufe` (Karriere) oder `Spiel.einst.stufe` (Bildungsstand) selbst — die Feldnamen sind Vertrag; es geht nur um die sichtbaren Wörter.

## Befund 5 · P2 — Der Hilfe-Knopf ist in der Leiste erst nach dem Aufklappen erreichbar

**Behauptung.** Bei 300 × 56 px ist der Hilfe-Knopf **nicht** bedienbar: er liegt im Bereich `.lk-auf`, der zugeklappt nur 2 px Höhe hat, `opacity:0` trägt und vom `overflow:hidden` der Karte abgeschnitten wird. Erreichbar wird er erst, wenn die Leiste bei Mausberührung auf 320 × 300 px aufklappt (280 ms Verzögerung). Der Vertragssatz „Der Hilfe-Knopf steht in `UI.leiste`“ ist damit **formal erfüllt, praktisch nur im aufgeklappten Zustand**.

**Beleg.**
* Maße: `src/ui/leiste.js:10` — `const ZU = [300, 56], AUF = [320, 300]`; `src/stil/leiste.css:10` — `.leiste-karte.auf{width:320px; height:300px}`.
* Die Statuszeile belegt 54 der 56 px: `src/stil/leiste.css:18` — `.lk-zeile{… height:54px …}`.
* Alles Bedienbare außer „öffnen“/„ausblenden“ liegt darunter: `src/stil/leiste.css:39-40` — `.lk-auf{… flex:1 1 auto; min-height:0; … opacity:0}`, erst `.leiste-karte.auf .lk-auf{opacity:1}`; `src/stil/leiste.css:6` — die Karte hat `overflow:hidden`.
* Aufklappen: `src/ui/leiste.js:47-51` — `pointerenter` → 280 ms → `aufklappen()`; Zuklappen 5 s nach `pointerleave`.
* Der Hilfe-Knopf entsteht in `src/ui/karriere.js:343` (`.mk-hilfe-knopf`) und der Anker in Zeile 360 (`.mk-wiki-knopf`), gezeichnet über `leisteMini()` (`src/ui/karriere.js:397`, gerufen in Zeile 522 und 531).
* Platzrechnung aufgeklappt: 300 − 54 (Statuszeile) − 8 (Innenabstand) − ~18 (drei Abstände à 6) − ~20 (Fußzeile) ≈ **200 px** für Ticket **und** Hilfe-Bereich zusammen. Ein Ticket mit Schnappschuss und vier Antworten braucht allein ~280 px (Kopf 16 + Frage bis 140 Zeichen ≈ 3 × 16 + Schnappschuss bis 7 × 14 + 4 × 28 für die Knöpfe). Beide Bereiche haben `overflow:auto` (`leiste.css:43` für `.lk-mini`, `leiste.css:52` für `.lk-mini-hilfe`) — es wird also **in zwei Fenstern gleichzeitig gescrollt**.

**Wirkung auf einen Azubi im 1. Lehrjahr.** Er sieht in der Leiste €/h, Ruf und die Zahl offener Tickets — **kein Zeichen, dass ein Mini-Ticket wartet**. Erst wenn er zufällig mit der Maus über die Leiste fährt (und 0,3 s wartet), wächst sie auf 320 × 300 und zeigt Frage, Antworten und den Hilfe-Knopf. Im aufgeklappten Zustand muss er dann im Ticket scrollen, um die Antwortknöpfe zu sehen, und im zweiten Fenster die Denkhilfe — der Knopf, den er dafür drücken soll, scrollt mit seinem Bereich weg.

**Vorschlag.**
1. **Sichtbares Signal im zugeklappten Zustand:** ein kleiner Punkt/Zähler „Mini“ in `.lk-zeile` (die Zeile hat Platz neben dem Offen-Zähler; die Karte ist dann 320 breit statt 300) — dann weiß der Azubi, dass dort etwas wartet.
2. **Hilfe-Knopf nach oben ziehen:** den Knopf in die Statuszeile holen und den *Text* im aufklappbaren Bereich zeigen. Damit ist er ohne Hover erreichbar — die Vertragszeile wäre dann wörtlich erfüllt. (Betrifft `src/ui/leiste.js` + `src/stil/leiste.css`; eine Zeile Code und ~6 Zeilen CSS.)
3. **Platz:** wenn die Hilfe offen ist, `.lk-mini-hilfe{flex:1 1 auto}` und `.lk-mini{flex:0 1 auto}` — dann liest der Azubi die Hilfe ganz und scrollt im Ticket, statt in beiden.

---

## Zusammenfassung

| # | Befund | Wirkung | Priorität | Aufwand |
|---|---|---|---|---|
| 1 | Stufenwahl steht unter dem Startknopf und ist danach weg | Wahl wird nie gesehen; Änderung nur über ein Symbol ohne Beschriftung | **P1** | 1 Zeile (`src/ui/start.js:161`) |
| 4 | Vier „Stufe“-Bedeutungen; Kopfzeile widerspricht ihrem Tooltip, „Erklärtiefe“ und „Niveau“ sehen gleich aus | Er verwechselt Bildungsstand und Karriere und dreht die Hilfe ab | **P1** | 2 Zeichenketten (`app.js:133`, `training.js:35`), +1 optional (`karriere.js:381`) |
| 3 | Streifen zeigt gleichzeitig 1 279–1 404 Zeichen | Fünf Kästen auf einmal; azubi-plus liest am meisten | **P2** | Aufklappen in `src/ui/hilfe.js` |
| 2 | R12 je Ansicht nicht messbar erfüllbar (≥ 23 Bedienelemente; Streifen selbst 4–5) | Regel greift nicht, wird nicht nachgezogen | **P2** | Regel schärfen (`tools/ethos.py`) + 1 Knopf sparen |
| 5 | Hilfe-Knopf erst nach 280 ms Hover, zwei Scroll-Bereiche | „Leiste“ nur halb erfüllt; wartendes Mini unsichtbar | **P2** | Knopf in die Statuszeile (klein) |

**Was gut ist und bleiben soll.** Die Frage über der Wahl („Wie viel Hilfe darf es sein? Umstellen geht jederzeit in den Einstellungen.“, `src/spiel/erstestunde.js:127`) ist genau die richtige Sprache für einen Azubi. Der Streifen erklärt nach einem Fehler zuerst das Fehlgeschlagene, dann den nächsten Schritt — die Reihenfolge stimmt. Die Stufen tun sichtbar, was sie versprechen: `meister` bekommt 0 Bedienelemente und 0 Zeichen, `geselle` ohne Fehler ebenfalls 0 (gemessen). Und die Hilfe verrät nirgends die Lösung (Gegenprüfung V1, `tests/pruefung-hilfestellung.test.js`).

**Nicht geprüft (ehrlich).** Ob die Flächen auf einem 300 × 56 px großen Fenster wirklich *so* aussehen, ist hier nicht messbar (kein Browser/CDP). Die Geometrie-Aussagen stammen aus CSS-Zahlen und der Clip-Regel, nicht aus einem Bildschirmfoto. Ebenso ungeprüft: Verhalten auf dem Tablet/Android (nicht Teil dieses Auftrags) und die Frage, ob ein echter Azubi die vier Stufennamen („Azubi+“, „Geselle“, „Meister“) auf sich bezieht — dafür bräuchte es einen Menschen vor dem Programm, nicht einen Prüfer am Quelltext.
