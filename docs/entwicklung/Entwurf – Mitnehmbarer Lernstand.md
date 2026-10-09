# Entwurf – Mitnehmbarer Lernstand

> **Auftrag (E3).** Im Klassenzimmer ist der Spielstand eine Browser-Ablage: Rechner gewechselt = Fortschritt weg.
> Dieser Text prüft, ob ein **mitnehmbarer Lernstand-Code** das löst, und entwirft ihn.
> **Kein Code, kein Umbau.** Alle Zahlen sind in dieser Sitzung gemessen (Probe über `node` stdin: echte
> headless-Module, `Spiel._trocken = true`, Node v24.21.0); fremde Messungen sind als solche gekennzeichnet.
> Nicht gemessene Punkte stehen ausdrücklich als „nicht gemessen“ da.

---

## 0 · Kurzfassung

1. **Es braucht zwei Codes.** Der vorhandene Ergebnis-Code `E-XXXX-XXX` trägt **25 Bit** Nutzlast
   (Spezifikation § 2.2) — darin haben **2 bis 4 Fertigkeiten** Platz, nicht 27. Ein Lernstand-Code ist
   außerdem ein anderer Zweck: der Ergebnis-Code ist zum **Vorführen am Beamer** gedacht, der Lernstand-Code
   zum **Mitnehmen über einen Rechnerwechsel**.
2. **Ein Codec, zwei Nutzlasten.** Alphabet (32 Zeichen = 5 Bit), Prüfsumme (mod 31/mod 32), Kanonisierung
   und die eingefrorene Fertigkeits-Tabelle werden **wiederverwendet**; neu ist nur das Nutzlast-Layout und
   das Präfix `L-`. Zwei Implementierungen wären die teure Variante, zwei Layouts sind die billige.
3. **Vorgeschlagene Länge: 8 bis 40 Zeichen, je nach Lernstand.** Belegtmaske (27 Bit) + 6 Bit je
   *angefasster* Fertigkeit (Kasten 3 Bit, Fälligkeit 3 Bit) + 10 Bit Prüfsumme → **8 Zeichen** bei leerem
   Stand, **22** bei 12 Fertigkeiten, **40** bei allen 27 (gemessen: 27 Fertigkeiten sind heute die Obergrenze).
4. **Kein Signatur-Schutz.** Ein Lernspiel ohne Noten braucht keine Kryptografie; eine Signatur kostet
   **+103 Zeichen** (64-Byte-Signatur bei 5 Bit/Zeichen) und schützt nichts, was ein Lehrer nicht sowieso
   durch Hinsehen prüft. Prüfsumme (Tippfehler) und Plausibilität (Kästen fallen nicht ohne Fehler) genügen.
5. **Der Datei-Export löst den Rechnerwechsel schon** (`src/ui/karriere.js:442-446`, gemessen **57.577 Zeichen**
   für einen gefüllten Stand). Der Code ist nicht die Rettung, sondern der **kleine Weg** für den Fall
   „kein Dateisystem, nur eine Tafel und ein Stift“.

---

## 1 · Was ist überhaupt mitzunehmen?

### 1.1 Gemessene Größen (ein gefüllter Stand, echter Spielweg)

Gefüllt wurde über den echten Weg: `Spiel.laden()` → `Spiel.postfachAuffuellen()` → 8 Aufträge öffnen,
lösen, abnehmen, abschließen; danach jede der 27 Fertigkeiten 4× über `L.ueben` geübt und 12 Fehler über
`L.fehler` eingetragen. `Spiel._trocken = true` (keine Schreibzugriffe).

| Speicher | Schlüssel | leer | gefüllt | Anteil |
|---|---|---|---|---|
| Spielstand `Spiel.st` | `labor` | 304 | **27.673** | davon `postfach` **25.509 = 92 %** |
| Lernstand `L.st` | `lern` | 60 | **3.040** | davon `units` 2.149 · `fehler` 819 |
| Einstellungen | `einst` | 167 (`EINST_STANDARD`) | 167 | – |
| **Exportdatei** (so, wie `exportieren` sie schreibt) | – | – | **57.577 Zeichen (≈ 56 KB)** | 2 Leerzeichen Einrückung |

**Obergrenzen** (künstlich gefüllt, um das Wachstum zu zeigen):

| Teil | Füllung | Größe |
|---|---|---|
| `L.st.log` | 3000 Einträge (Deckel laut Lernmotor) | **157.001** |
| `L.st.fehler` | 200 Einträge (Deckel) | 19.491 |
| `L.st.tage` | 200 Tage | 3.001 |
| `L.st` gesamt | worst case | **179.547** |

**Wachstum je Einheit:** 12.740 Zeichen je Postfach-Instanz (das **generierte Netz** steckt mit drin),
136 Zeichen je erledigtem Ticket, 79,6 Zeichen je angefasster Fertigkeit.

### 1.2 Fortschritt oder Momentaufnahme?

`Spiel.st` hat **28 Felder** (gemessen): `abzeichen, aktiv, angebot, buch, dex, einstieg, ereignisse,
erledigt, ersteStunde, euro, flow, karriere, kunden, kundenakte, naechsteIid, playbooks, post, postfach,
ruf, schulden, stufe, tag, tagebuch, tagesraetsel, training, v, werkzeuge, zuletzt`.

| Kategorie | Felder | Mitnehmen? |
|---|---|---|
| **Fortschritt** (klein, personengebunden) | `euro`, `ruf`, `stufe`, `kunden`, `playbooks`, `training`, `abzeichen`, `dex`, `karriere`, `werkzeuge` | **ja** — zusammen wenige hundert Zeichen |
| **Momentaufnahme** (groß, austauschbar) | `postfach` (92 %!), `aktiv`, `angebot`, `post` | **nein** — die Aufträge werden deterministisch neu erzeugt (§ 2.1 der Spezifikation) |
| **Historie** (wächst monoton) | `erledigt`, `buch`, `tagebuch`, `ereignisse`, `flow`, `ersteStunde`, `tagesraetsel`, `schulden` | **nein** für den Code, **ja** für die Datei |
| **Technik** | `v`, `naechsteIid`, `zuletzt` | `v` ja (Fassung), Rest nein |

**Lernstand `L.st`:** `units` (Kästen, Fälligkeiten, richtig/falsch) ist der Kern. `tage` trägt die Serie,
`fehler` das Fehlerheft (gedeckelt), `tests` die Prüfungsnotizen. **`log` ist Ballast**: bis zu 3000
Einträge/157 KB, nur für die Behalten-Quote nötig — ein Code darf ihn nicht tragen.

**Kleinste sinnvolle Nutzlast für den Lernstand:** `{id: [box, due]}` für 27 Fertigkeiten = **772 Zeichen**
(gemessen), Beispiel `["lab.link",[1,"2026-10-10"]]`. Der Löwenanteil ist das **Datum** (10 Zeichen je
Fertigkeit) — im Code wird daraus ein **Fälligkeits-Korb** (3 Bit), nicht ein Datum.

**Behauptung:** Der Lernstand ist der einzige Teil, der im Klassenzimmer wirklich fehlt.
**Beleg:** 92 % des Spielstands sind Momentaufnahme; die Datei (57.577 Zeichen) existiert schon als Weg.
**Aufwand:** 0 (nur Auswahl-Entscheidung). **Risiko:** klein — wer den ganzen Karrierestand mitnehmen will,
braucht weiterhin die Datei (das ist in Ordnung und steht so in der Oberfläche, `karriere.js:439`).

---

## 2 · Ein Code oder zwei?

### 2.1 Der vorhandene Ergebnis-Code

```
gedruckt   E-XXXX-XXX      immer genau 10 Zeichen
Nutzlast   25 Bit: sitzung 5 | platz 5 | sterne 4 | versuche 2 | dauer 9
Prüfsumme  10 Bit: C1 = (1v₀+2v₁+3v₂+4v₃) mod 31, C2 = (1v₀+3v₁+5v₂+7v₃) mod 32
```
(Beleg: `docs/entwicklung/Klassenraum – Umsetzungsreife Spezifikation.md` § 2.2; Round-Trip dort über
335.168 Fälle verlustfrei.)

### 2.2 Rechnung: warum das nicht reicht

| Nutzlast je Fertigkeit | Fertigkeiten in 25 Bit |
|---|---|
| 5 Bit (nur Kasten-Stufe) | **5** |
| 6 Bit (Kasten 3 + Fälligkeit 3) | **4** |
| 7 Bit | **3** |
| 9 Bit (Kasten 3 + Fälligkeit 6) | **2** |

Heute gibt es **27 Fertigkeiten** (gemessen: `DATEN.skills.length = 27` und `L.SKILLS` nach `Spiel.laden()`
= **27**). In die 25 Bit passen also **2 bis 5** — der Faktor zur Wirklichkeit ist 5 bis 13.

**Beides in einen Code** hieße: 25 Bit Ergebnis + 189 Bit Lernstand (Variante aus § 3) + 10 Bit Prüfsumme
= **56 Zeichen**. Damit wäre der Vorführzweck zerstört: der Ergebnis-Code soll **angesagt** und in Sekunden
abgetippt werden (10 Zeichen), der Lernstand-Code darf länger sein, weil er **selten** und in Ruhe
übertragen wird.

### 2.3 Empfehlung: zwei Codes, ein Codec

| | Ergebnis-Code | Lernstand-Code (neu) |
|---|---|---|
| Präfix | `E-` | `L-` |
| Zweck | Vorführen/Vergleichen am Beamer, Sammlung je Sitzung | Mitnehmen des Lernstands auf einen anderen Rechner |
| Nutzlast | 25 Bit (unverändert) | 27 Bit Maske + 6 Bit je befasster Fertigkeit |
| Länge | 10 Zeichen (unverändert) | 8–40 Zeichen (§ 3) |
| Wer tippt | Lehrkraft | Schüler/in, einmal je Gerätewechsel |

**Was die Dopplung kostet** (Aufwand, nicht Laufzeit):

| Posten | Aufwand | Anmerkung |
|---|---|---|
| Alphabet, Prüfsummen-Polynome, Kanonisierung | **0** | aus dem vorhandenen Codec übernommen |
| Fertigkeits-Index-Tabelle (27 IDs) | **0** | dieselbe eingefrorene Tabelle wie in § 2.4 der Spezifikation |
| Neues Nutzlast-Layout + Encoder/Decoder | 0,5 Sitzung | reine Bitarithmetik, in Node prüfbar |
| Oberfläche (Code zeigen/eintippen, Vorschau, Sicherung) | 0,5–1 Sitzung | Muster vorhanden (`Spiel.klassenraum` + Einstellungen „Spielstand“) |
| Tests (Round-Trip, Tippfehler, Fassungen, Grenzen) | 0,5 Sitzung | Vorbild: 40 Fälle im Klassenraum-Testplan |

**Risiko der Dopplung:** zwei Formate müssen erklärt werden. Gegenmittel: **ein** Ort in den Einstellungen,
der beide zeigt („Zeigen (Beamer)“ / „Mitnehmen“), und **ein** Hilfetext, der sagt, wofür welcher Code ist.

---

## 3 · Der Lernstand-Code

### 3.1 Nutzlast-Layout (Vorschlag)

```
Alphabet   ABCDEFGHJKLMNPQRSTUVWXYZ23456789         (32 Zeichen = 5 Bit, kein I, O, 0, 1)
gedruckt   L-XXXX-XXXX-…                            Vierergruppen, immer mit Präfix
Nutzlast   v 3 | platz 5 | 27-Bit-Belegtmaske | je belegter Fertigkeit 6 Bit (Kasten 3 | Fälligkeit 3)
Prüfsumme  10 Bit wie beim Auftrags-/Ergebnis-Code (mod 31, mod 32)
```
* `v` = Fassung des Lernstand-Formats (nicht des Spielstands, § 3.3).
* `platz` = Sitzplatz 0..31 (dieselbe anonyme Kennung wie im Ergebnis-Code; **kein Klarname möglich**).
* **Belegtmaske** = eine Fertigkeit, die nie angefasst wurde, braucht keine 6 Bit. Der Code wächst mit dem
  Lernstand — das ist gewollt: ein Anfänger tippt 8 Zeichen, ein Fortgeschrittener 22–40.
* `Kasten` 0..5 (Lernmotor-Deckel) → 3 Bit. `Fälligkeit` als Korb: 0 = heute/überfällig, 1 = 1–2 Tage,
  2 = 3–6, 3 = 7–13, 4 = 14+, 5 = „später/30 Tage“, 6/7 frei → 3 Bit.
  **Genauigkeit geht verloren** (kein exaktes Datum) — für „wie weit ist die Klasse“ reicht der Korb.

### 3.2 Längen (gerechnet, 27 Fertigkeiten, Prüfsumme 10 Bit eingerechnet)

| Variante | Nutzlast | Zeichen | gedruckt |
|---|---|---|---|
| nur Kästen, fest (3 Bit × 27) | 81 Bit | **19** | `L-XXXX-XXXX-XXXX-XXXX-XXX` |
| Maske + 4 Bit (Kastenstufe 2 + Fälligkeitsstufe 2) | 135 Bit | **29** | 8 Gruppen |
| **Maske + 6 Bit (empfohlen)** leer → 12 → 27 belegt | 27 → 99 → 189 Bit | **8 → 22 → 40** | 2 → 6 → 10 Gruppen |
| fest, Kasten 3 + Fälligkeit 6 Bit | 243 Bit | 51 | 13 Gruppen |
| fest, Kasten 3 + Fälligkeit 10 Bit (exaktes Datum) | 351 Bit | 73 | 19 Gruppen |

**Behauptung:** Ein Lernstand-Code bleibt tippbar, wenn er sich nach dem Lernstand richtet.
**Beleg:** Die Tabelle ist aus dem gemessenen Aufbau gerechnet (27 Fertigkeiten, 1 Bit ≈ 1 Zeichen bei
5 Bit/Zeichen); die Zahl der heute vorhandenen Fertigkeiten ist gemessen (27).
**Aufwand:** im Codec enthalten. **Risiko:** Bei 40 Zeichen wird das Abtippen mühsam → dann QR (§ 5.3).

### 3.3 Fassungen: `v:3` heute, `v:4` morgen

Gemessen:
* `Spiel.VERSION = 3` (`src/spiel/zustand.js:16`), und `migrieren` hebt alte Stände an:
  `st.v = Math.max(zahl(st.v, 0), Spiel.VERSION)` (`:53`) — **alte Stände werden ergänzt, nie verworfen**.
* Ein **zu neuer** Spielstand wird **abgelehnt** statt halb geladen: `laden()` gibt
  `{ok:false, zuNeu:true, grund:"Dieser Spielstand stammt aus einer neueren Fassung (Stand vN); dieses
  Programm kennt nur v3."}` (`:146-148`).
* Der **Lernmotor ist strenger und stiller**: `let st = (() => { const s = store.get("lern", null);
  return s && s.v === 1 ? s : leer(); })();` (`fremd/lernmotor.js:39`) — passt `v` nicht **exakt**, wird der
  Lernstand **ohne Meldung weggeworfen**. Das ist die gefährlichste Stelle des ganzen Themas.

**Regeln für den Lernstand-Code:**
1. Der Code trägt seine **eigene** Fassung (`v` 3 Bit), unabhängig von `Spiel.VERSION`.
2. **Alter Code → neues Spiel:** immer lesbar. Neue Fertigkeiten sind einfach nicht in der Maske = „neu“
   (`L.box` 0). Fällt eine Fertigkeit weg, wird sie beim Import ignoriert (Index unbekannt).
3. **Neuer Code → altes Spiel:** **ablehnen mit Satz**, nicht halb importieren — genau wie `laden()` es beim
   Spielstand schon tut.
4. **Import überschreibt nie still:** erst Vorschau („Klasse 8b, 14 von 27 Fertigkeiten, Serie 3 Tage“),
   dann Sicherung wie beim Datei-Import (`Spiel.sicherungAnlegen`, `src/ui/karriere.js:460`), dann erst
   schreiben.
5. Die **Index-Tabelle wird nur angehängt** (nie eingeschoben) — Regel aus Spezifikation § 2.4; freie
   Indizes liefern dort `{fehler:"fassung"}`.

### 3.4 Tippfehler

Die Prüfsumme wird **wörtlich vom vorhandenen Codec übernommen** (10 Bit, zwei Polynome mod 31/mod 32).
Deren Wirkung ist dort gemessen (fremde Messung, Spezifikation § 2.1): **92/92** gebaute Vertipper
abgelehnt, im ganzen Raum **130.023.424** Ersetzungen und **3.047.424** Vertauschungen ohne einen
unbemerkten Fehler, 10.000 wohlgeformte Zufallscodes → **99,84 %** abgelehnt. Für den Lernstand-Code gilt
dieselbe Größenordnung, **sofern** die Prüfsumme über **alle** Zeichen läuft — bei variablem Layout heißt
das: erst `v`/`platz`/Maske/Paare kanonisieren, dann rechnen, dann prüfen.

---

## 4 · Missbrauch, Manipulation, Grenzen

**Behauptung: Für dieses Spiel ist Kryptografie die falsche Antwort.**
* **Beleg (Kosten):** Eine Signatur (z. B. Ed25519, 64 Byte = 512 Bit) verlängert den Code um
  **103 Zeichen** (5 Bit/Zeichen) — aus 29 würden **132**; das ist nicht mehr abtippbar. HMAC scheidet aus,
  weil das Geheimnis im offenen Repositorium stünde. Eine Prüfung auf einem Server widerspricht der
  Spezifikation („Ein Code, kein Server, kein Konto“, § 1).
* **Beleg (Wert):** Es gibt **keine Noten**. `Spiel.st.ruf` und `euro` sind Spielwerte; wer sie fälscht,
  betrügt sich um die eigene Übung. Der Klassenraum-Ergebnis-Code hat dasselbe „Problem“ und wird bewusst
  nicht geschützt.
* **Was billig ist und bleibt:**
  1. **Prüfsumme** gegen Vertipper (schon bezahlt, § 3.4).
  2. **Plausibilität** beim Import: Kasten 5 ohne einen einzigen Treffer ist auffällig; `Fälligkeit` muss in
     den Körben liegen; Serie ≤ Lerntage; die Belegtmaske darf nicht mehr Fertigkeiten zeigen, als es gibt.
     Solche Codes werden **nicht abgelehnt**, aber **markiert** („ungewöhnlich“) — Ehrlichkeit statt Gitter.
  3. **Die pädagogische Antwort:** Ein Lehrer, der wissen will, ob jemand rechnen kann, lässt rechnen. Der
     Code ersetzt keine Prüfung, er ersetzt das Abschreiben vom Nachbarn.
* **Was nie kommt:** Signatur, Konto, Cloud-Sync, Serverpflicht. **Aufwand:** 0 (Nichtstun ist hier die
  Entscheidung). **Risiko:** Ein Schüler kann einen fremden Code abgeben. Gegenmittel: `platz` (Sitzplatz)
  und die mündliche Nachfrage — dasselbe Risiko wie beim Ergebnis-Code heute.

---

## 5 · Der Lehrerfall ohne Server

### 5.1 Die Haltung der Spezifikation

Wörtlich (§ 4.3, „Entscheidung des Leiters“): *„der Server transportiert **nur Codes** – kein `platz`,
keine `sterne`, keine `dauerS`. Der Ergebnis-Code trägt alles … Damit gibt es **eine** Quelle der Wahrheit
… und keine Möglichkeit, Klarnamen einzuschmuggeln.“* Und (§ 4.3, Ende): *„**Ohne Server keine
Fehlermeldung** – die Live-Fläche bleibt aus, A und B laufen vollständig.“*

Daraus folgt für den Lernstand: **Der Code ist die Wahrheit, das Gerät der Lehrkraft ist nur Ablage.**

### 5.2 Die kleinste Lösung (ohne Server)

**Ein Code je Schüler reicht** — die Lehrkraft sammelt sie ein und tippt sie in eine Liste, die es schon
gibt: `store "klassenraum"` mit `ergebnisEintragen` (idempotent über `platz`, erster Eintrag gewinnt,
Spezifikation § 2.5). Erweiterung:

1. Der Lernstand-Code trägt **denselben `platz`** wie der Ergebnis-Code → Zuordnung Code ↔ Sitzplatz.
2. Die Klassenliste bekommt je Platz **zwei Felder**: letzter Ergebnis-Code, letzter Lernstand-Code.
3. Ein **Zeitstempel** („eingegangen“) liegt schon im Entwurf (`GET /liste` → `eingegangen`); ohne Server
   setzt ihn das Lehrer-Gerät beim Eintippen.
4. **Ablage ohne Server:** die Liste als **Datei** exportieren/importieren (`store.alles()` → JSON, Muster:
   `karriere.js:442-446`) plus die vorhandene Tabelle. Kein Netz, kein Konto, kein Server.
5. **Die Anzeige, die die Frage beantwortet:** „14 von 27 Fertigkeiten im Klassenschnitt, 6 Schüler ohne
   Code diese Woche, schwächste Fertigkeit: `lab.vlan`“ — das ist eine Auswertung über die eingesammelten
   Codes, **auf dem Lehrer-Gerät**, nicht auf einem Server.

**Aufwand:** 1 Sitzung (die Sammel-Liste existiert, es kommen ein Feld und eine Auswertung hinzu).
**Risiko:** Abtippen von 30 Codes à 8–40 Zeichen ist mühsam → deshalb QR, aber erst danach.

### 5.3 QR (später, nicht zuerst)

Der vorhandene Encoder ist laut Spezifikation § 4.4 **alphanumerisch, Version 1, Stufe H** und trägt
**genau den 10-Zeichen-Auftragscode**. Ein 29-Zeichen-Lernstandscode passt dort **nicht** hinein; es bräuchte
eine größere QR-Version. **Nicht gemessen** (ich habe keine QR-Kapazität nachgerechnet) — deshalb steht sie
hinten in der Reihenfolge. Nutzen: die Lehrkraft **scannt** ab, statt zu tippen; der Code bleibt derselbe.

---

## 6 · Aufwand und Reihenfolge

| Rang | Was | Aufwand | Warum |
|---|---|---|---|
| **Schon da** | Datei-Export/Import des ganzen Speichers | 0 | löst den Rechnerwechsel vollständig (57.577 Zeichen gemessen) |
| **Zuerst** | Lernstand-Code: Layout, Prüfsumme, Kanonisierung, Tests | **1–1,5 Sitzungen** | der einzige Weg ohne Dateisystem; Round-Trip in Node prüfbar |
| **Dann** | Oberfläche: „Mitnehmen“ (Code zeigen) + „Einlesen“ (Vorschau, Sicherung, Ablehnung zu neuer Codes) | **0,5–1 Sitzung** | ohne Vorschau ist ein Fehlgriff ein verlorener Lernstand |
| **Dann** | Klassen-Sammelliste + Auswertung auf dem Lehrer-Gerät | **1 Sitzung** | beantwortet „wie weit ist die Klasse“ ohne Server |
| **Später** | QR für den Lernstand-Code (größere Version) | 1 Sitzung | Komfort, kein Inhalt |
| **Nie** | Signatur, Konto, Cloud, Serverpflicht | – | Widerspruch zu „Ein Code, kein Server, kein Konto“; Kosten > Nutzen |

---

## 7 · Grenzen dieses Entwurfs (ehrlich)

* **Nicht gemessen:** das Verhalten von `localStorage` an seiner Größengrenze (der Browser-Speicher ist
  endlich; der gefüllte Stand braucht ~31 KB, die Datei 56 KB — beides wirkt harmlos, ist aber **nicht**
  gegen das Limit geprüft). Ebenfalls **nicht gemessen**: QR-Kapazitäten (§ 5.3) und das Verhalten auf
  Android (die Android-Fassung ist laut Nutzerentscheidung nicht Teil dieses Auftrags).
* **Nicht entworfen:** ein Weg, den *kompletten* Karrierestand per Code zu übertragen — er ist mit 92 %
  Momentaufnahme zu groß und wird es bleiben. Dafür bleibt die Datei.
* **Verlust im Entwurf:** der Lernstand-Code verliert das **exakte Fälligkeitsdatum** (nur Körbe), den
  **Übungsverlauf** (`log`) und die Prüfungsnotizen (`tests`). Der Lernstand *bleibt* erhalten, seine
  Feingranularität nicht.
* **Der Lernmotor ist die harte Kante:** `fremd/lernmotor.js:39` wirft einen Lernstand mit unbekanntem `v`
  **still** weg. Wer den Code importiert, muss den Lernstand **schreiben, bevor** ein Programmteil ihn liest
  — sonst ist der Import wirkungslos. Das ist der erste Testfall der Umsetzung, nicht der letzte.
