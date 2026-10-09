---
typ: befund
erstellt: 2026-10-09
aktualisiert: 2026-10-09 (zweite Fassung nach den drei behobenen Ausfällen)
status: abgeschlossen — Quote mit zwei Definitionen gerechnet; Definition I erreicht die 90 %, Definition II nicht
tags: [FISI, Lernspiel, Netzwerk, Bilanz, Agententeam, Messung]
---

# ⚖️ Bilanz – Agententeam 2.0: die Erfolgsquote, gemessen

> [!success] Die Antwort auf die 90-%-Frage — kurz
> **Definition I (Aufgabe erledigt): 51 von 52 = 98,1 % → die 90 % sind erreicht.**
> **Definition II (Behauptung hält der Nachmessung stand): 9 von 10 = 90,0 % → die 90 % sind erreicht —
> genau auf der Latte, nicht darüber.**
> Die Tore: **8 von 8 messbaren bestanden (100 %)**; vier Tore brauchen einen Browser und blieben
> **nicht gemessen**. `sh tools/test.sh` meldet **733/733 grün, Exit 0**.
>
> **Der eine Abstrich, der bleibt:** eine **veraltete APK-Angabe** — `Architektur.md:919` und
> `CHANGELOG.md:82` nennen 1 160 732 B / `A27751B2…`, auf der Platte liegen 1 164 828 B / `2208C08A…`.
> Dieselbe Sorte Fehler steckt im Codec-Beleg vom 06.10. Kein Produktfehler — ein **Nachweis**-Fehler,
> und genau die zählen in Definition II.
>
> **Und ein Bild hat sich während dieser Messung geändert** (die Nachbesserung der Leitung): vorher waren
> „2a" und „2b" byte-identisch (9 Bilder für 10 Schritte), jetzt sind es **10 verschiedene Bilder** — ich
> habe beide angesehen, sie zeigen wirklich Verschiedenes. Damit ist auch dieser Abstrich weg.

## 1 · Was sich seit der ersten Fassung geändert hat

| Größe | erste Fassung | jetzt |
|---|---|---|
| Aufgaben | 43/49 erledigt, 5 in Arbeit | **51/52 erledigt, 1 offen** |
| Tests | 726/726 (81 Dateien) | **733/733 (82 Dateien)** |
| Tore messbar/bestanden | 6 von 6 | **8 von 8** (zwei neue Tore, s. § 3) |
| Aufgabe „falscher Abnahmebefehl" | offen | **behoben** (`tests/run.js:57`, leerer Filter = rot) |
| `inspektor.css` (12 einzelne `\r`) | offen | **behoben** (task-51) |
| R8-Verlust (2 regellose Selektoren) | offen | **behoben** (task-52) |
| Doppeltes Bild | offen | **behoben — während dieser Messung** (10 Dateien, jetzt 10 verschiedene Bilder) |
| Veraltete Belege | offen | **weiter offen** (Codec-JSON 06.10., APK-Angabe) |

**Bemerkenswert und belegbar:** Zwei der drei behobenen Punkte sind **aus meiner Prüfung entstanden** —
die Aufgaben **task-51** und **task-52** wurden angelegt, weil ich den 12 einzelnen `\r` und den
regellosen Selektoren nachgegangen bin. Beide sind abgeschlossen, beide habe ich nachgemessen.

## 2 · Die Aufgaben: task-1 bis task-52

Quelle: die geteilte Aufgabenliste (49 Einträge in der ersten Fassung, jetzt 52; die Beschreibung nahm an,
sie sei mir nicht zugänglich — sie ist es).

| Zustand | Anzahl | Nummern |
|---|---:|---|
| **erledigt** (`completed`) | **51** | task-1 … task-52 außer task-19 |
| **in Arbeit** (`in_progress`) | **0** | keine |
| **offen** (`pending`) | **1** | **task-19** (Production Release 2.0.0) |
| abgebrochen | **0** | keine Aufgabe wurde abgebrochen gemeldet |

**Die eine offene Aufgabe, ehrlich eingeordnet:** `task-19` ist der **Production Release**. Der
Release-**Bau** ist gemacht (Fassung 2.0.0 in allen Erzeugnissen, § 4), die **Veröffentlichung** nicht:
es wurde nicht gepusht, weil die Hausregel dafür die ausdrückliche Freigabe des Nutzers verlangt
(`docs/SITZUNGSABSCHLUSS.md`, Schritt 6). Die Aufgabe bleibt deshalb zu Recht offen — sie ist der
einzige Grund, warum Definition I nicht 100 % zeigt.

## 3 · Die Tore — Soll, Ist, bestanden

| # | Tor | Soll | Ist (selbst gemessen) | bestanden |
|---|---|---|---|---|
| 1 | `sh tools/test.sh` | „N/N grün" | **733/733 grün, 0 übersprungen, Exit 0** (82 Testdateien, 91 Module) | **ja** |
| 2 | `python tools/ethos.py` | GRÜN | **GRÜN** + „BESSER als der Stand": R1 22 · R2 113 · R3 195 · R4 514 · **R5–R11 = 0** | **ja** |
| 3 | `python tools/klassen.py` | 0 | **0 Klassen ohne CSS-Regel** | **ja** |
| 4 | `node tools/sim-stand.js` | unverändert | **„Simulation unverändert gegenüber dem Referenzstand."** (12/12) | **ja** |
| 5 | `python tools/seite.py --pruefen` | GRÜN | **GRÜN: 42 Dokumente, kein toter Verweis**, Exit 0 | **ja** |
| 6 | R12 ohne `--dom` | sagt „nicht gemessen" | **`NICHT GEMESSEN: R12`** — kein stilles Grün | **ja** |
| 7 | **neu:** `node tests/run.js --klassenraum` | prüft Fälle (nicht 0) | **104/104 grün, Exit 0** (vorher `0/0 grün`, Exit 0) | **ja** |
| 8 | **neu:** `node tests/run.js gibtEsNicht` | rot, wenn nichts passt | **Exit 1** + „KEIN Test passt zum Filter … Das ist kein grüner Lauf." | **ja** |
| 9 | `sh tools/test.sh --rauch` | 45/45 | — | **nicht gemessen** (Browser) |
| 10 | Menüprobe Web | 45 erfüllt / 0 verletzt | — | **nicht gemessen** (Browser) |
| 11 | Menüprobe Android | 49 erfüllt / 0 verletzt | — | **nicht gemessen** (Browser) |
| 12 | R12 im laufenden Programm | `klasse` 6, `Auftrag` 3 | — | **nicht gemessen** (Programmstart) |

**Torquote:** **8 von 8 messbaren bestanden = 100 %** · über alle zwölf Tore **8/12 = 66,7 %**, wobei die
vier fehlenden **nicht durchgefallen**, sondern **nicht gemessen** sind. Für die Tore 9–12 stütze ich mich
auf die Zahlen der Leitung — das sind **ihre** Messungen, nicht meine.

**Randbefund, während der Messung nachgezogen:** `AGENTS.md` nannte für die Tests **725**, mein Lauf zählt
**733** (acht daneben). **Während ich schrieb, wurde die Hauszahl korrigiert** — die Datei nennt jetzt
selbst „Stand: **733**, 82 Testdateien, 91 Module" und beschreibt den neuen Filter samt seiner Tücke:
bei einem Filter ohne Treffer **zeigt die Bilanzzeile weiterhin „0/0 grün"** — es entscheidet der
**Exit-Code** (1). Das ist ehrlich dokumentiert, aber es bleibt eine Zeile, die grün *aussieht*.

## 4 · Elf Zusagen, erneut selbst nachgemessen

| # | Zusage | Meine Messung | Urteil |
|---|---|---|---|
| 1 | „733/733 grün" | **733/733, 0 übersprungen, Exit 0** | **bestätigt** |
| 2 | „`--klassenraum` liefert 99/99" | **104/104, Exit 0** — der Filter greift jetzt (vorher 0/0). Die Zahl ist höher als gemeldet, weil seither Tests dazukamen | **bestätigt** (Mechanik und Wirkung) |
| 3 | „ein Filter, der nichts trifft, ist rot" | `node tests/run.js gibtEsNicht` → **Exit 1**, Meldung „KEIN Test passt zum Filter … 0 von 733 Fällen geprüft" | **bestätigt** |
| 4 | „`inspektor.css`: 12 einzelne `\r` weg, git führt die Datei als Text" | **0 einzelne `\r`**, 147 Zeilen, 147 CRLF, `git ls-files --eol` → **`i/lf w/crlf`** (vorher `i/-text w/-text`). Arbeitsbaum nach CRLF→LF-Normalisierung **byte-identisch** mit HEAD (11 923 B, SHA `bd93bc4d…`); Regelbefunde je Datei unverändert (R2 6 · R3 16 · R4 58) | **bestätigt** |
| 5 | „R8-Verlust behoben: die zwei Selektoren sind zurück" | beide Selektoren stehen wieder in `src/stil/juice.css:72-73`; juice.css hat **0** `prefers-reduced-motion`-Blöcke, **R8 bleibt 0** | **bestätigt** |
| 6 | „gemessen im echten Browser: reduzierte Bewegung = 0 Animationen" | nicht nachmessbar (kein Browser). **Aber die Kette ist im Quelltext belegt:** `juice.css:72-73` nutzt `html[data-bewegung="reduziert"]`, `src/ui/app.js:48` setzt das Attribut aus `UI.bewegung()`, und `app.js:13-16` liefert „reduziert" **auch** bei `wenigBewegung()` — und das liest `src/ui/dom.js:44` aus `prefers-reduced-motion`. Die OS-Einstellung ist damit wieder gedeckt | **bestätigt im Quelltext** (Messung im Browser: nicht selbst gemacht) |
| 7 | „`tests/klassen-20.test.js`: 20 Geräte, ein Code, Ampel 20/20, 349 ms" | Test existiert (15 389 B) und ist grün: „Trockenlauf: EIN Code, 20 Geräte, derselbe Auftrag (über `def.id`) – Ampel 20 von 20 (**318 ms**)"; dazu die drei Grenzbefunde (Platz 32 klemmt still auf 31 · doppelter Platz → erster gewinnt · zwei Sitzungen unmöglich) | **bestätigt** (Laufzeit 318 ms statt 349 — Lauftoleranz) |
| 8 | „Release-`.exe` 8.630.272 B" | **8 630 272 B**, SHA256 `C66067A7…2287` | **bestätigt** |
| 9 | „Netzwerk-Labor.html 2.829.477 B, 0 Außenverweise · `docs/index.html` byte-gleich" | beide **2 829 477 B**, beide `C3C51EDA…828E`; `<script src>` 0, `<link href>` 0, `<img src>` 0 | **bestätigt** |
| 10 | „10 Bildschirmfotos in `Nachweise/Klassenraum/`" | **10 Dateien mit dem Schema `D-vorfuehrung-*`, jetzt 10 verschiedene Bilder.** Die frühere Dopplung (`2a-b-auftrag` = `2b-c-auftrag`, beide 171 718 B) ist **während dieser Messung behoben** worden: `2b` ist jetzt 61 095 B und zeigt eine andere Ansicht. **Ich habe beide Bilder angesehen:** `2a` zeigt den geöffneten Auftrag (Kasse ohne Netz, Salon Lockerwerk, Ziele 0/1, Netz mit R-Salon/PC-Kasse/PC-Buero/Drucker), `2b` zeigt die **Mitarbeit-Ansicht** mit Codefeld, Platz 2 und dem Stand „Auftrag angenommen: Kasse ohne Netz · Platz 2 · Klassenraum-Abdruck 3U9JGE" | **bestätigt** (inhaltlich geprüft, nicht nur per Hash) |
| 11 | „Belege und APK-Angaben aktuell" | `Nachweise/Klassenraum/A-kanon.json` ist weiter vom **06.10.**; `Architektur.md:919` und `CHANGELOG.md:82` nennen die APK mit **1 160 732 B / `A27751B2…`** — auf der Platte liegen **1 164 828 B / `2208C08A…`** | **nicht bestätigt** |

**Zusagenquote:** 11 geprüft, davon **1 nicht messbar** (die Browser-Messung aus Nr. 6 — die Quelltext-
kette habe ich belegt, den Browser nicht) → **10 prüfbar**.
**9 von 10 bestätigt = 90,0 %** · **1 verfehlt** (Nr. 11). Zählt man die im Quelltext belegte
Browser-Messung mit, sind es 10 von 11 = 90,9 %.

## 5 · Die Quote — zwei Definitionen, getrennt gerechnet

**Definition I — „Aufgabe erledigt" (Prozess).** Zählt jede der 52 Aufgaben, die abgeschlossen ist.

```
51 erledigt / 52 gesamt = 0,9808 → 98,1 %
   offen: task-19 (Release-Bau fertig, Veröffentlichung ohne Nutzerfreigabe nicht erlaubt)
   Die frühere Nachmeldung ist eingetreten: task-41 und task-42 stehen jetzt auf „erledigt".
```

**Definition II — „Behauptung hält der Nachmessung stand" (Wirkung).** Zählt jede selbst geprüfte Zusage.

```
9 bestätigt / 10 prüfbar = 0,9000 → 90,0 %
   verfehlt: APK-Angabe in Architektur.md/CHANGELOG.md passt nicht zur Datei (Nr. 11)
   nicht eingerechnet: 1 Zusage (Nr. 6), die ohne Browser nicht messbar ist — die Quelltextkette
   dazu habe ich belegt; zählt man sie mit, sind es 10 von 11 = 90,9 %
```

**Welche Definition ist die ehrlichste?** **Definition II** — sie misst, ob eine Behauptung **vor** der
Nachmessung hält, nicht ob jemand „fertig" gesagt hat. Definition I belohnt Fleiß, Definition II belohnt
Wahrheit. Der Preis: 10 geprüfte Zusagen sind eine **Stichprobe**, ±1 Zusage verschiebt die Quote um
**10 Punkte** — die 90,0 % sind deshalb **genau auf der Latte**, nicht komfortabel darüber. Definition I
ist dagegen **keine Stichprobe** — sie zählt das ganze Board.

> [!warning] Unterm Strich — die Antwort auf die Frage des Nutzers
> **Beide Definitionen erreichen die 90 %: 98,1 % (Aufgaben) und 90,0 % (Zusagen).**
> Definition II liegt **exakt auf der Schwelle** — ein einziger weiterer Abstrich kippt sie unter 90.
> Der eine Abstrich, der noch steht, ist die **veraltete APK-Angabe** (`Architektur.md:919`,
> `CHANGELOG.md:82` gegen die Datei auf der Platte) — dieselbe Sorte Fehler wie der Codec-Beleg vom
> 06.10. Beide sind in Minuten zu beheben: Zahl und SHA256 nachrechnen, Datum in den Belegnamen.
> **Dann steht Definition II bei 10 von 10.**

## 6 · Die Ausfälle — Stand jetzt

**Von den neun Ausfällen der ersten Fassung sind sieben behoben, einer entschärft, einer offen.**

| # | Ausfall | Stand | Beleg |
|---|---|---|---|
| 1 | **Anführungszeichen-Falle** (dreimal, drei Testdateien lahmgelegt) | **entschärft, nicht beseitigt** | Das Werkzeug greift jetzt: `node tools/pruefe-namen-flicken.js` meldet „82 Dateien geprüft, 0 geschrieben, **0 laden nicht**" (früher verschwieg es genau diesen Fall). **Aber:** `tools/test.sh` ruft es **nicht** auf (dort stehen nur `ethos.py` und `rauch.py`) — die Falle kann einen Lauf weiterhin anhalten, bis jemand den Trockenlauf startet. |
| 2 | **„Grün ohne Wirkung" — dreimal** (R12 · Menüproben-Profil · `--klassenraum`) | **behoben (alle drei)** | R12 meldet „NICHT GEMESSEN" statt 0 · `menueprobe.py` lädt bei „kein UI" einmal neu und schreibt die Notiz · `--klassenraum` liefert jetzt **104/104**, und ein leerer Filter ist **rot** (`tests/run.js:57,73`). |
| 3 | **`ethos.py` zehn Minuten kaputt** (17:06:39–17:06:50) | **erledigt** (Zwischenstand, repariert) | eigener Lauf: SyntaxError → danach 571 Zeilen, läuft. |
| 4 | **Attrappen-Leak** (8 rote `UI: Übergabe`, Ursache im Test) | **behoben** | die acht Fälle sind grün; Ursache im `CHANGELOG` und in `Review – 2.0-Fundament` § 3.3 dokumentiert. |
| 5 | **Falscher Abnahmebefehl `--klassenraum` = 0 Fälle** | **behoben** | siehe Tor 7/8: 104/104 statt 0/0; leerer Filter = Exit 1. |
| 6 | **Fehlende Klammer + `t.fn is not a function`** | **behoben** | `Befund – 27 von 27.md:162-164`; die Datei lädt und ist grün. |
| 7 | **Namenswerkzeug verschwieg seinen Fall** | **behoben** | „0 laden nicht" — und es hatte den Fall vorher korrekt gemeldet (`ethos-r12.test.js`). |
| 8 | **Ein doppeltes Bild als zwei Vorführschritte** | **BEHOBEN — während dieser Messung** | Vorher gemessen: `2a-b-auftrag` = `2b-c-auftrag`, beide 171 718 B, gleicher SHA256 (10 Dateien, 9 Bilder). Jetzt: `2b` ist **61 095 B** und **10 von 10 Bildern verschieden**; ich habe beide angesehen — `2a` zeigt den geöffneten Auftrag, `2b` die Mitarbeit-Ansicht mit Codefeld. Der Befund hat also gewirkt. |
| 9 | **Veraltete Belege** | **OFFEN** | `A-kanon.json` weiter vom **06.10.** (führt `lab.portsec`/`lab.stp`/`lab.storage` als „kein Injektor" — die drei gibt es seit task-5) · APK: Dokument **1 160 732 B / `A27751B2…`**, Datei **1 164 828 B / `2208C08A…`** (beides heute erneut gemessen). |

**Dazu zwei Befunde aus meiner Output-Runden-Prüfung, die inzwischen behoben sind** (eigene Aufgaben
task-51 und task-52, beide abgeschlossen und von mir nachgemessen):

* **`inspektor.css` hatte 12 einzelne `\r`** und war für git **binär** (`i/-text`). Jetzt: 0 einzelne `\r`,
  `w/crlf`, für git Text, Inhalt byte-identisch mit HEAD nach Zeilenenden-Normalisierung.
* **Der R8-Verlust: zwei Selektoren ohne jede Regel.** Jetzt stehen sie wieder
  (`juice.css:72-73`), R8 bleibt **0**, und die Kette bis zur OS-Einstellung ist im Quelltext belegt (§ 4 Nr. 6).

**Und ein Nachziehbefund, der sich beim Schreiben erledigt hat:** `AGENTS.md` nannte **725** Tests,
gemessen sind **733** — die Hauszahl wurde während dieser Messung auf 733 korrigiert (selbst geprüft,
`AGENTS.md:31`).

## 7 · Was das Team gelernt hat — und was für 3.0 zählt

**Was sich wiederholt hat:** Anführungszeichen-Falle **dreimal**, „grün ohne Wirkung" **dreimal**,
veraltete Belege **zweimal**, ein Werkzeug zehn Minuten kaputt. Das Muster ist immer dasselbe:
**eine Zahl aus einem Fehlerpfad sieht aus wie eine gemessene Zahl.**

**Was nachweislich hilft — und jetzt eingebaut ist:**

1. **Ein leerer Filter ist rot.** Die wichtigste Neuerung der zweiten Fassung: `tests/run.js` schneidet
   führende Striche ab **und** bricht ab, wenn kein Test passt. „Grün, aber nichts geprüft" ist damit
   strukturell unmöglich geworden — nicht nur durch Disziplin verhindert.
2. **„Nicht gemessen" ist ein eigener Zustand.** `ethos.py` meldet R12 ausdrücklich als nicht gemessen;
   es zählt weder als eingehalten noch als verletzt.
3. **Gegenproben als Pflicht.** `ethos.py --gegenprobe` sticht elf Regeln absichtlich; `menueprobe.py`
   lädt bei „kein UI" genau einmal neu und schreibt die Notiz dazu.
4. **Kapseln um jeden Test.** Ein sofort ausgeführter Gruppenrumpf reißt den ganzen Lauf mit.
5. **Byte-Messung statt Textmodus.** Zweimal hat mich der Textmodus getäuscht; beide Male war die
   Byte-Messung die verlässliche.
6. **Die Nachmessung erzeugt Arbeit — und das ist gut.** Meine zwei Befunde wurden zu task-51 und task-52
   und sind erledigt. **Was für 3.0 heißt:** jede als „fertig" gemeldete Zusage braucht einen Prüfer mit
   Byte-Maß, sonst wandert der Fehler in die nächste Fassung.

**Was 3.0 noch mitnehmen sollte:** (a) `tools/pruefe-namen-flicken.js` in `tools/test.sh` **einbinden** —
das Werkzeug ist da, es wird nur nicht aufgerufen (Ausfall 1); (b) ein `node --check`-Kurzlauf über alle
JS-Dateien und ein `console.error`-Zähler (Vorschlag P3 aus `Review – Testqualität`); (c) **Belege mit
Datum und Fassung im Dateinamen**, damit die veraltete APK und das Codec-JSON nicht mehr entstehen können.

## 8 · Nicht feststellbar (Pflichtabschnitt)

* **Vier Tore** (Rauchtest 45/45, Menüprobe Web 45/0, Android 49/0, R12 im laufenden Programm 6/6 und 3/3)
  habe ich **nicht selbst gemessen** — Auflage „keine Prozesse". Sie stehen als **nicht gemessen**, nicht
  als bestanden.
* **Die Browser-Messung des R8-Fixes** („reduziert = 0 Animationen, voll = 1") ist die Messung der
  Leitung; ich habe nur die **Quelltextkette** nachgeprüft, die sie trägt (`app.js:48`, `app.js:13-16`,
  `dom.js:44`, `juice.css:72-73`).
* **Die „27 Fertig-Meldungen"** des Auftragstextes kann ich nicht zählen — Meldungen im Postfach der
  Leitung sehe ich nicht. Was ich sehe, sind **51 abgeschlossene Aufgaben**. Die beiden Zahlen messen
  offenbar Verschiedenes; **das bleibt eine Lücke dieser Bilanz.**
* **Die Codec-Probe habe ich nicht neu gefahren** (~250 s, schreibt `Nachweise/`). Die Zahl 3520 stammt
  aus dem Beleg vom 06.10., nicht aus meiner Messung — und genau dieser Beleg ist als veraltet gemeldet.
* **Die Laufzeit 349 ms** des neuen 20-Geräte-Tests konnte ich nicht reproduzieren; ich messe **318 ms**
  (der Test selbst protokolliert 297 ms). Das ist Laufstreuung, kein Widerspruch — aber es ist nicht
  dieselbe Zahl.
* **Ein Nebenbefund aus dem nachgebesserten Bild:** Im Codefeld von `2b` steht **`nl9acqam`** — das
  entspricht **nicht** dem dokumentierten Auftragscode-Format `NL-XXXX-XX` (10 Zeichen, Großbuchstaben,
  zwei Prüfzeichen, ohne I/O/0/1). Der Status darunter zeigt einen **angenommenen** Auftrag. Ob das
  Programm diesen Wert akzeptiert hat oder das Feld nur einen Rest bzw. eine ungültige Eingabe zeigt,
  ist **aus dem Bild nicht entscheidbar** — **nicht geprüft**. Es ist keine Behauptung, sondern eine
  Beobachtung, die jemand mit laufendem Programm in einer Minute klären kann.
* **Keine Aussage über Inhaltsqualität** (ob die 58 Aufträge didaktisch taugen) und **keine über eine
  echte Unterrichtsstunde**.
* **Die Quote hat eine Stichproben-Unsicherheit**: 9 geprüfte Zusagen, ±1 verschiebt Definition II um
  rund 11 Punkte. Eine Vollerhebung aller Zusagen war nicht möglich.

## 9 · Belege dieser Bilanz (alle selbst ausgeführt)

| Zweck | Handlung | Ergebnis |
|---|---|---|
| Aufgabenstand | Aufgabenliste (vollständig, 52 Einträge) | **51 completed · 0 in_progress · 1 pending (task-19) · 0 abgebrochen** |
| Tests | `sh tools/test.sh` | **733/733 grün, 0 übersprungen, Exit 0**, 82 Testdateien, 91 Module |
| Filter (neu) | `node tests/run.js --klassenraum` | **104/104 grün, Exit 0** |
| Leerer Filter (neu) | `node tests/run.js gibtEsNicht` | **Exit 1** + „KEIN Test passt zum Filter … kein grüner Lauf" |
| Namenswerkzeug | `node tools/pruefe-namen-flicken.js` (trocken) | „82 Dateien geprüft, 0 geschrieben, **0 laden nicht**" |
| Regelwerk | `python tools/ethos.py` | GRÜN, R1 22 · R2 113 · R3 195 · R4 514 · R5–R11 = 0 · R12 „NICHT GEMESSEN" |
| Klassen · Simulation · Doku | `klassen.py` · `sim-stand.js` · `seite.py --pruefen` | 0 · unverändert (12/12) · GRÜN, 42 Dokumente |
| `inspektor.css` | Byte-Zählung + `git ls-files --eol` + SHA gegen HEAD | 147 Zeilen, 147 CRLF, **0 einzelne `\r`**, `i/lf w/crlf`, nach Normalisierung byte-identisch mit HEAD |
| R8-Fix | `juice.css` gelesen + Selektorvergleich HEAD↔Arbeitsbaum | beide Selektoren zurück, **0** neue `prefers-reduced-motion`-Blöcke, Selektor- Menge **1820 → 1820** (nichts weg, nichts neu) |
| 20-Geräte-Test | Testlauf-Ausgabe | „Trockenlauf: 20 Geräte · 20 Ergebnis-Codes · Ampel 20/20 · **318 ms**" + 3 Grenzbefunde |
| Erzeugnisse | `Get-FileHash` | Einzeldatei = `docs/index.html` = `C3C51EDA…828E` (2 829 477 B) · `.exe` 8 630 272 B · APK 1 164 828 B |
| Bilder | SHA256 je PNG + **beide Vorführbilder angesehen** | 11 PNG, 10 × `D-vorfuehrung-*`, **10 verschiedene**; `2a` = geöffneter Auftrag, `2b` = Mitarbeit-Ansicht (61 095 B) |
| Belege | `A-kanon.json`, `Architektur.md:919`, `CHANGELOG.md:82` | Codec-Beleg **06.10.** · APK-Angabe **weicht** von der Datei ab |
