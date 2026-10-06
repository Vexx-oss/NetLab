# A · Festlegung (eingefroren für alle Entwürfe und Gegenprüfungen)

Stand 2026-10-06, Bereich A des Auftrags `tools/auftraege/KLASSENRAUM.md`.
Diese Datei ist die **verbindliche Schnittstelle** für die Entwürfe A-format, A-kanon, A-api und deren
Gegenprüfer. Wer eine Abweichung für nötig hält, meldet sie als Befund — ändert die Festlegung aber nicht selbst.

Alle Zahlen sind **in dieser Sitzung gemessen** (Basisstand): `node tests/run.js` → 251/251 grün,
58 handgeschriebene Tickets (`DATEN.tickets.length` = 58, `Spiel.ticketReihe().length` = 58),
davon 3 `art:"terminal"`, 27 Fertigkeiten (`DATEN.skills.length`), 76 geladene Module (Lader wie `tests/run.js`).

## 1 · Alphabet und Form

```
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"   // 32 Zeichen, 5 Bit je Zeichen; kein I, O, 0, 1
wert(c)  = ALPHABET.indexOf(c)                  // 0..31
zeichen(v) = ALPHABET[v]
```

**Auftragscode:** `NL-XXXX-XX` — 10 Zeichen inkl. Trennstriche. Nutzteil = 6 Zeichen (30 Bit):
4 Nutzzeichen + 2 Prüfzeichen. Beispielform: `NL-4F7K-2Q` (Formbeispiel aus dem Auftrag; der konkrete
Code ist **kein** gültiger Code unserer Prüfsumme — siehe Probe).

**Ergebnis-Code:** `E-XXXX-XXX` — 10 Zeichen inkl. Trennstriche. Nutzteil = 7 Zeichen (35 Bit):
5 Nutzzeichen + 2 Prüfzeichen.

Normalisierung (beide Codes): `String(roh).toUpperCase()` → alle Zeichen außer `[0-9A-Z]` entfernen
(Leerzeichen, Bindestriche, Punkte …) → führendes `NL` (Auftrag) bzw. `E` (Ergebnis) abschneiden, **wenn**
danach genau 6 (bzw. 7) Zeichen übrig bleiben → Länge prüfen → Fremdzeichen prüfen → Prüfsumme.
`nl4f7k2q` und `NL-4F7K-2Q` sind damit dieselbe Eingabe.

## 2 · Prüfsumme (zwei Zeichen, 10 Bit)

Über die Nutzzeichen `v0..v(k-1)` (k = 4 Auftrag, k = 5 Ergebnis):

```
C1 = (1*v0 + 2*v1 + 3*v2 + 4*v3 [+ 5*v4]) mod 31     → Prüfzeichen 1 = zeichen(C1)   // 31 ist prim, < 32
C2 = (1*v0 + 3*v1 + 5*v2 + 7*v3 [+ 9*v4]) mod 32     → Prüfzeichen 2 = zeichen(C2)   // alle Gewichte ungerade
```

**Beweis (nicht Messung):** Eine einzelne Ersetzung an Position i ändert `C2` um `w_i·δ mod 32` mit
`w_i` ungerade und `0 < |δ| ≤ 31` → `w_i·δ ≡ 0 (mod 32)` nur für `δ ≡ 0 (mod 32)` → unmöglich →
**jede Einzel-Ersetzung wird erkannt**, auch `A↔9`. Eine Nachbarvertauschung zweier Nutzzeichen mit
Werten `u ≠ w` ändert `C1` um `∓(u−w) mod 31` (31 prim) und `C2` um `(u−w)·(∓2) mod 32`; beide
Prüfungen versagen gleichzeitig nur, wenn `u−w ≡ 0 (mod 31)` **und** `u−w ≡ 0 (mod 16)` — 31 ist nicht
durch 16 teilbar → unmöglich → **jede Nachbarvertauschung wird erkannt**. (Gemessen wird das trotzdem,
mit 20+ Fällen; die Probe zählt zusätzlich die Randfälle `A↔9` und `u−w = 31`.)

## 3 · Bit-Budget Auftragscode (30 Bit = 6 Zeichen)

Nutzlast 20 Bit = 4 Zeichen: `n = (sitzung << 15) | (art << 14) | (index << 8) | variante`

| Feld | Bit | Bereich | Bedeutung |
|---|---|---|---|
| sitzung | 5 | 0..31 | Sitzungskennung der Lehrkraft (`erzeugen` wählt 1..31; 0 = „ohne Sitzung“) |
| art | 1 | 0/1 | 0 = handgeschrieben (Index in `TABELLE_AUFTRAEGE`), 1 = generiert (Index in `TABELLE_SKILLS`) |
| index | 6 | 0..63 | Auftrags- bzw. Fertigkeitsindex; belegt 0..57 (Aufträge) bzw. 0..26 (Fertigkeiten) |
| variante | 8 | 0..255 | Variantenfeld; Startseed ist immer `variante + 1` (1..256) |

Nutzzeichen: `z0 = n>>>15 & 31`, `z1 = n>>>10 & 31`, `z2 = n>>>5 & 31`, `z3 = n & 31`.
Prüfzeichen: `z4 = zeichen(C1)`, `z5 = zeichen(C2)`.
Beweis der Länge: 5+1+6+8 = 20 Bit + 10 Bit Prüfsumme = 30 Bit = 6 Zeichen · 5 Bit ✓;
gedruckt `NL-` + 4 + `-` + 2 = 10 Zeichen (Budget ≤ 10 inkl. Trennstriche) ✓.

## 4 · Bit-Budget Ergebnis-Code (35 Bit = 7 Zeichen)

Nutzlast 25 Bit = 5 Zeichen:
`n = (sitzung << 20) | (platz << 15) | (sterne << 11) | (versuche << 9) | dauer`

| Feld | Bit | Bereich | Bedeutung |
|---|---|---|---|
| sitzung | 5 | 0..31 | Sitzungskennung (muss zur lokalen Sitzung passen) |
| platz | 5 | 0..31 | Platzkennung, 0 = „ohne Platz“; **nie ein Klarname** |
| sterne | 4 | 0..10 | halbe Sterne (`round(sterne*2)`) |
| versuche | 2 | 0..3 | Fehlversuche = `abnahmen − 1`, bei ≥3 auf 3 begrenzt („3+“) |
| dauer | 9 | 0..511 | Einheiten à 10 s → 0..5110 s (1:25:10) |

Prüfzeichen: `z5 = zeichen(C1)` (Gewichte 1..5 mod 31), `z6 = zeichen(C2)` (Gewichte 1,3,5,7,9 mod 32).
Gedruckt: `E-` + 4 + `-` + 3 = 10 Zeichen ✓.

## 5 · Kanonisierung (gleiche Schleife auf jedem Gerät)

```
KANON_FENSTER = 64
hand(def, seedStart):                       // def = DATEN-Ticketdefinition (feste Fassung)
  für k = 0..63:
     s = seedStart + k                      // ≥ 1
     d = def.fuerSeed(s)
     wenn Spiel.ticketGueltig(d) && d !== def → {seed:s, def:d, eigene:true, schritte:k}
  d0 = def.fuerSeed(seedStart)              // Rückfall: feste Fassung (dasselbe Netz auf allen Geräten)
  wenn Spiel.ticketGueltig(d0) → {seed:seedStart, def:d0, eigene:false, schritte:64}
  sonst → {fehler:"fassung"}
generiert(skill, seedStart):
  für k = 0..63:
     try d = Spiel.generiere(skill, seedStart+k) catch → weiter
     wenn d && Spiel.ticketGueltig(d) → {seed:seedStart+k, def:d, schritte:k}
  → {fehler:"auftrag", grund:"Kein Injektor für <skill>"}
```
Nachtrag (Gegenprüfung Iteration 2): Der Zweig ohne Treffer ist `auftrag`, nicht `fassung` – so steht es in
§ 8 („Generator liefert nichts"). Für `lab.portsec`, `lab.stp`, `lab.storage` gibt es in dieser Fassung
gar keinen Injektor; die Oberfläche darf nur Fertigkeiten anbieten, für die
`Spiel.generiere` etwas liefert (gemessen 24 von 27).

`seedStart = variante + 1`. Der Rückfall (`eigene:false`) ist **kein Fehler**: er liefert deterministisch
dasselbe feste Netz auf jedem Gerät. Terminal-Aufträge (`art:"terminal"`) liefern laut `fuerSeed`
immer die feste Fassung.

## 6 · Netzkennwert

```
netzkennwert(netz) -> 6 Zeichen aus ALPHABET
  kanon = {geraete: {id: {…alle Felder des Geräts…}} für jede id sortiert,
           kabel:   [{id, a:{geraet,port}, b:{geraet,port}}] sortiert nach a.geraet, a.port, b.geraet, b.port, id}
  netz.zustand (Laufzeit: MAC-Tabellen, _uhr) bleibt DRAUSSEN
  text = kanonisch(kanon)      // rekursiv sortierte Objektschlüssel, JSON.stringify ohne Leerzeichen
  h = FNV1a32(text)            // h=2166136261; je UTF-16-Codeeinheit: h ^= text.charCodeAt(i); h = imul(h,16777619) >>> 0
  kennwert = 6 Zeichen über (h & 0x3FFFFFFF), höchstwertige 5 Bit zuerst
```
Hinweis (Gegenprüfung Iteration 2): FNV-1a ist Lehrbuch-mäßig über **Bytes** definiert; hier wird bewusst
je UTF-16-Codeeinheit gerechnet (kein `Buffer`, kein `TextEncoder`), damit dieselbe Funktion im Browser, in
der Einzeldatei und headless identisch läuft. Wichtig ist, dass **beide Geräte dieselbe Zeichenkette**
verarbeiten – bei gleichem JS-String ist das der Fall (auch bei Umlauten in Gerätenamen).

## 7 · Tabellen (eingefroren, Index → ID)

- `TABELLE_AUFTRAEGE` = Reihenfolge von `Spiel.ticketReihe()` (heute 58 Einträge; **nicht** die rohe
  `DATEN.tickets`-Reihenfolge — beide Reihenfolgen sind gemessen *verschieden*). Liste als Literal in
  `src/spiel/klassenraum.js` einfrieren; neue Aufträge **nur anhängen**, nie einschieben, nie umnummerieren.
- `TABELLE_SKILLS` = Reihenfolge von `DATEN.skills` (27 Einträge), gleiche Anhängeregel.
- Vorkehrung gegen verschobene Tabellen: (a) eingefrorene Literalliste statt Laufzeitberechnung,
  (b) Ladeprüfung „jede ID existiert in `DATEN.tickets`“, (c) freie Indizes (Aufträge 58..63,
  Fertigkeiten 27..63) ergeben `{fehler:"fassung"}`, (d) ein vorgeschlagener Test vergleicht die
  eingefrorene Liste mit der aktuellen `Spiel.ticketReihe()`-Reihenfolge.

## 8 · Fehlerklassen (`{fehler:"…", grund:"…"}`)

| fehler | Auslöser | Beispiel-grund (Oberfläche) |
|---|---|---|
| `länge` | nach Normalisierung nicht 6 (Auftrag) / 7 (Ergebnis) Zeichen | „Der Code hat 5 Zeichen – er braucht 6 (z. B. NL-4F7K-2Q).“ |
| `zeichen` | Zeichen außerhalb `ALPHABET` (I, O, 0, 1) | „Im Code kommt kein I, O, 0 und kein 1 vor – hast du 0 statt O getippt?“ |
| `prüfziffer` | Prüfsumme stimmt nicht | „Die Prüfziffer passt nicht – hast du dich vertippt?“ |
| `bereich` | ein Feldwert liegt außerhalb seiner Spanne (Sterne-Bits > 10 = mehr als 5 Sterne) | „Der Sterne-Wert im Code liegt außerhalb des Bereichs (0..10 halbe Sterne).“ |
| `auftrag` | Index zeigt auf eine ID, die es hier nicht (mehr) gibt; Generator liefert nichts (kein Injektor) | „Diesen Auftrag gibt es in dieser Fassung nicht.“ |
| `fassung` | Index im freien Bereich (58..63 / 27..63) | „Dieser Code stammt aus einer anderen Programmfassung.“ |
| `sitzung` | Ergebnis-Code gehört zu einer anderen Sitzung / es läuft keine (Zusatzfeld `art: "fremd"｜"keine"`) | „Dieser Ergebnis-Code gehört zu Sitzung 12 – hier läuft Sitzung 7.“ |
| `abnahme` | Ergebniscode ohne bestandene Abnahme | „Der Auftrag ist noch nicht bestanden.“ |
| `wahl` | `erzeugen` ohne `ticketId` **und** ohne `skill`, oder mit beiden | „Bitte genau einen Auftrag oder eine Fertigkeit wählen.“ |

Nachtrag (Gegenprüfung Iteration 2): `bereich`, `abnahme` und das Zusatzfeld `art` bei `sitzung` sind
Ergänzungen. `bereich` schließt die Lücke, dass ein von Hand gebauter Code mit Sterne-Bits 11..15
(5,5–7,5 Sterne) sonst als gültig durchginge.

`null`/`undefined`/leere Eingabe → `null` (nichts getippt = keine Fehlermeldung).

## 9 · Speicherform `store "klassenraum"` und Export

```json
{"fassung":1, "programm":"<LABOR_VERSION>", "platz":null, "zuletzt":1759706400000,
 "sitzung":null,
 "letzte":null}
```
`erzeugen` legt `sitzung` an:
```json
{"id":7,"titel":"…","art":"hand","ticketId":"salon-01","skill":null,"index":0,
 "variante":42,"seed":43,"code":"NL-XXXX-XX","eigene":true,"dauerMin":10,
 "erstellt":1759706400000,"ergebnisse":{}}
```
`ergebnisse` ist eine Abbildung `platz → {platz,sterne,dauerS,versuche,code,zeit,quelle}`.
Export: `{"format":"netzwerk-labor/klassenraum","fassung":1,"programm":"…","zeit":…,"sitzung":{…}}`.

## 10 · Regeln für alle A-Proben

- Lader: `require("./A-lader.js").kontext()`; Uhr festsetzen (`jetzt.setzen(...)`), `Spiel._trocken = true`,
  `Spiel._st = Spiel.leererStand()`, `Spiel._lz = {}` → keine Schreibvorgänge, keine Bus-Ereignisse.
- Node: `& "$env:LOCALAPPDATA\node-portable\node-v24.21.0-win-x64\node.exe" <datei>`.
- Schreibbereich je Agent: **nur** die zugeteilten `tools/klassenraum-probe/A-*` und
  `Nachweise/Klassenraum/A-*`. Kein `src/**`, kein `tests/**`, kein git, keine Installation.
- Ergebnis-JSON je Probe: `{"thema","stand","befehle":[{"befehl","ergebnis"}],"messungen":{…},"befunde":[…],"offene":[…],"nichtGeprueft":[…]}`.
- Deutsch, ehrlich: nichts behaupten, was nicht in dieser Sitzung gemessen wurde.
