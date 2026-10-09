---
typ: befund
erstellt: 2026-10-09
aktualisiert: 2026-10-09
status: abgeschlossen — Quote mit zwei Definitionen gerechnet, elf Zusagen selbst nachgemessen, Ausfälle namentlich
tags: [FISI, Lernspiel, Netzwerk, Bilanz, Agententeam, Messung]
---

# ⚖️ Bilanz – Agententeam 2.0: die Erfolgsquote, gemessen

> [!danger] Die ehrliche Antwort in vier Zeilen
> Der Nutzer verlangt **mindestens 90 %**. Nach der **strengen** Lesart erreicht das Team sie **nicht**:
> **43 von 49 Aufgaben = 87,8 %** (Aufgabenstand), und **6 von 9 prüfbaren Zusagen = 66,7 %** ohne jeden
> Abzug. Nach der **wohlwollenden**, aber immer noch belegten Lesart steht es **45 von 49 = 91,8 %** und
> **8 von 9 = 88,9 %**. Die Tore sind dagegen **6 von 6 messbaren bestanden (100 %)** — vier Tore konnte
> ich **nicht messen**, weil kein Browser/Programmstart freigegeben war. Kein einziger gestarteter Lauf war
> rot: `sh tools/test.sh` meldet **726/726 grün, Exit 0**.
>
> **Die zwei Zahlen, die zählen:** 87,8 % (Aufgaben, streng) und 66,7 % (Zusagen, streng). Beide unter 90.
> Wer die 90 % sehen will, muss die Nachmeldungen und Abzüge mitzählen — und das sage ich hier ausdrücklich
> dazu, damit niemand die Zahl später ohne diesen Satz zitiert.

## 1 · Methode — was ich messen konnte und was nicht

**Gemessen habe ich selbst** (in dieser Sitzung, mit den Werkzeugen des Hauses): den Aufgabenstand über die
Aufgabenliste, sechs Tore, elf Zusagen, die Artefakte auf der Platte (Bytes, SHA256), das geladene
Datenpaket, das Regelwerk und den vollen Testlauf.

**Nicht messen konnte ich** (Auflage „keine Prozesse"): alles, was einen Browser oder das laufende Programm
braucht — `--rauch`, beide Menüproben, R12 im DOM. Diese vier Tore und zwei Zusagen stehen deshalb als
**„nicht selbst gemessen"** in der Bilanz, nicht als bestanden und nicht als durchgefallen.

**Zwei Dinge sind mir dabei selbst passiert und stehen hier, weil sie zum Bild gehören:** ein
**falsch addiertes** Summenfeld in meinem Output-Runden-Bericht (inzwischen korrigiert) und ein
Zeilenvergleich im Textmodus, der 12 einzelne `\r` als Umbrüche zählte. Beides ist in
`Befund – Output-Runde.md` § 10/§ 15 offengelegt.

## 2 · Die Aufgaben: task-1 bis task-49

Quelle: die geteilte Aufgabenliste, die mir **doch** zugänglich war (die Aufgabenbeschreibung nahm das
Gegenteil an — ich habe sie deshalb direkt gezählt statt aus Dokumenten zu raten).

| Zustand | Anzahl | Nummern |
|---|---:|---|
| **erledigt** (`completed`) | **43** | task-1 … task-18, task-20 … task-40, task-43 … task-46 |
| **in Arbeit** (`in_progress`) | **5** | task-41 · task-42 · task-47 · task-48 · task-49 |
| **offen** (`pending`) | **1** | task-19 |
| abgebrochen | **0** | keine Aufgabe wurde abgebrochen gemeldet |

**Drei Aufgaben stehen falsch im Board — mit Beleg, nicht mit Gefühl:**

* **task-41** (Strom F: `simulation/terminal/akte/kundenakte`, R10 16× auf 0) ist **sachlich fertig**:
  `python tools/ethos.py` meldet R10 global **0**, und zwar in genau diesen vier Dateien. Der Eigner
  („hilfevorrat") hat sie nicht abgeschlossen. *Beleg: eigener Lauf, § 3.*
* **task-42** (Strom G: R12 messbar machen) ist **sachlich fertig**: `ethos.py` meldet ohne `--dom`
  ausdrücklich `NICHT GEMESSEN: R12` statt einer stillen 0, und `tests/ethos-r12.test.js` existiert und ist
  grün. Der Eigner („pruefer") hat sie nicht abgeschlossen. *Beleg: eigener Lauf + Testlauf.*
* **task-19** (Production Release 2.0.0) ist **zu Recht offen**: die Erzeugnisse sind da (Fassung 2.0.0,
  `.exe`, APK, Einzeldatei, Doku), aber **veröffentlicht ist nichts** — die Seite online steht weiter auf
  1.2.4, weil nicht gepusht wurde (so steht es auch in `docs/CHANGELOG.md`). „Deployen" war Teil des
  Nutzerauftrags; die Hälfte davon fehlt.

**Damit gibt es zwei Aufgabenstände, und ich nenne beide:** streng **43/49**, mit belegter Nachmeldung
**45/49** (task-41 und task-42 sind nachweislich geliefert).

## 3 · Die Tore — Soll, Ist, bestanden

| # | Tor | Soll | Ist (selbst gemessen) | bestanden |
|---|---|---|---|---|
| 1 | `sh tools/test.sh` | 726/726 | **726/726 grün, 0 übersprungen, Exit 0** (81 Testdateien, 91 Module) | **ja** |
| 2 | `python tools/ethos.py` | GRÜN | **GRÜN** + „BESSER als der Stand": R1 22 · R2 113 · R3 195 · R4 514 · **R5–R11 = 0** | **ja** |
| 3 | `python tools/klassen.py` | 0 | **0 Klassen ohne CSS-Regel** | **ja** |
| 4 | `node tools/sim-stand.js` | unverändert | **„Simulation unverändert gegenüber dem Referenzstand."** (12/12) | **ja** |
| 5 | `python tools/seite.py --pruefen` | GRÜN | **GRÜN: 42 Dokumente, kein toter Verweis**, Exit 0 | **ja** |
| 6 | R12 ohne `--dom` | sagt „nicht gemessen" | **`NICHT GEMESSEN: R12`** — kein stilles Grün mehr | **ja** |
| 7 | `sh tools/test.sh --rauch` | 45/45 | — | **nicht gemessen** (Browser) |
| 8 | Menüprobe Web | 45 erfüllt / 0 verletzt | — | **nicht gemessen** (Browser) |
| 9 | Menüprobe Android | 49 erfüllt / 0 verletzt | — | **nicht gemessen** (Browser) |
| 10 | R12 im laufenden Programm | `klasse` 6, `Auftrag` 3 | — | **nicht gemessen** (Programmstart) |

**Torquote:** **6 von 6 messbaren bestanden = 100 %** · über alle zehn Tore gerechnet **6/10 = 60 %**,
wobei die vier fehlenden **nicht durchgefallen**, sondern **nicht gemessen** sind. Für die Tore 7–10 stütze
ich mich auf die Zahlen der Leitung (`Architektur.md` § 12.2 nennt „Web 45/0, Android 49/0, R12 6/6 und
3/3") — das sind **ihre** Messungen, nicht meine.

**Randbefund zum Nachziehen:** `AGENTS.md` nennt für die Tests **725** — mein Lauf zählt **726**. Die
Hauszahl ist um eins überholt.

## 4 · Elf Zusagen, selbst nachgemessen

Ich habe die kühnsten Behauptungen genommen — nicht die bequemsten.

| # | Zusage | Meine Messung | Urteil |
|---|---|---|---|
| 1 | „726/726 grün" | 726/726, Exit 0 | **bestätigt** |
| 2 | „Release-`.exe` 8.630.272 B" | `Programm/Netzwerk-Labor.exe` = **8 630 272 B**, SHA256 `C66067A7…2287` | **bestätigt** |
| 3 | „Netzwerk-Labor.html 2.829.477 B, 0 Außenverweise" | **2 829 477 B**; `<script src>` 0, `<link href>` 0, `<img src>` 0 (die acht `http…` im Text sind Beispielinhalte) | **bestätigt** |
| 4 | „`docs/index.html` = `Netzwerk-Labor.html` byte-gleich, SHA256 `C3C51EDA…828E`" | beide **2 829 477 B**, beide `C3C51EDA6FBD8DD49F8EC390DEC92BD6C9B2A59A7BEC116FE493CF439056828E` | **bestätigt** |
| 5 | „58 Handaufträge · 27 Fertigkeiten · 39 Injektoren · 92 Minis · 29 Wiki-Seiten" | Datenpaket selbst geladen: `tickets` **58**, `skills` **27**, `mini` **92**, `wiki` **29**; `neu({…})` in `src/spiel/injektoren.js` **39×** | **bestätigt** |
| 6 | „58/58 Kanonisierung, `kanonHandK0` 3520" | `Nachweise/Klassenraum/A-kanon.json`: „**3712** Kanonisierungen … k=0 bei **3520** von 3712 (Anteil 0,9483), Rückfälle 192" — und die Gegenprobe `A-pruef-kanon.js` rechnet 58/58 unabhängig nach | **bestätigt** (Beleg gelesen, Probe **nicht** neu gefahren) |
| 7 | „`seite.py --pruefen` GRÜN" | **GRÜN: 42 Dokumente**, 43 HTML in `docs/doku/` und `_site/doku/`, kein toter Verweis, Exit 0 | **bestätigt** |
| 8 | „10 Bildschirmfotos in `Nachweise/Klassenraum/`" | **11 PNGs im Ordner, 10 mit dem Schema `D-vorfuehrung-*`** — aber `…-2a-b-auftrag-web.png` und `…-2b-c-auftrag-web.png` sind **byte-identisch** (`171 718 B`, gleicher SHA256) | **bestätigt mit Abzug**: zehn Dateien, **neun verschiedene Bilder** |
| 9 | „Kanonisierung/Codec: `A-codec-probe.js` rechnet erschöpfend" | Der Beleg ist vom **06.10.** und sein Abschnitt „generierte Formen" ist **überholt**: er führt `lab.portsec`, `lab.stp`, `lab.storage` als „Kein Injektor" — genau die drei Injektoren, die task-5 am 09.10. gebaut hat | **bestätigt, aber Beleg veraltet** |
| 10 | APK „1 160 732 B, SHA256 `A27751B2…F93733`" (`Architektur.md` § 12) | auf der Platte: `Programm/Netzwerk-Labor-2.0.0-Android.apk` = **1 164 828 B**, SHA256 `2208C08A…7BDD` | **nicht bestätigt** — die Dokumentangabe passt nicht mehr zur Datei |
| 11 | „R12 `klasse` 6/6 und `Auftrag` 3/3 im laufenden Programm" | nicht nachmessbar (kein Programmstart). Im Testlauf ist der Fall grün: „Lehrkraft: sechs sichtbare Bedienelemente, Azubi: drei" — das ist aber die **DOM-Attrappe**, nicht das laufende Programm | **nicht selbst gemessen** |

**Zusagenquote:** 11 geprüft, davon **2 nicht messbar** → **9 prüfbar**.
**8 von 9 bestätigt = 88,9 %** (mit den zwei Abzügen) · **6 von 9 = 66,7 %** (nur die ohne jeden Abzug).

## 5 · Die Quote — zwei Definitionen, getrennt gerechnet

**Definition I — „Aufgabe erledigt" (Prozess).** Zählt jede der 49 Aufgaben, die abgeschlossen ist.

```
streng   : 43 erledigt / 49 gesamt          = 0,8776 → 87,8 %
mit Beleg: 45 erledigt / 49 gesamt          = 0,9184 → 91,8 %
   (task-41 und task-42 sind nachweislich geliefert, stehen aber auf „in Arbeit";
    task-19 bleibt offen, weil „deployen" nicht passiert ist)
```

**Definition II — „Behauptung hält der Nachmessung stand" (Wirkung).** Zählt jede selbst geprüfte Zusage.

```
streng   :  6 ohne Abzug  / 9 prüfbar       = 0,6667 → 66,7 %
mit Abzug:  8 bestätigt   / 9 prüfbar       = 0,8889 → 88,9 %
   (die zwei Abzüge: doppeltes Bild bei 2a/2b; veralteter Codec-Beleg)
   nicht eingerechnet: 2 Zusagen, die ich ohne Browser/Programm nicht messen konnte
```

**Welche Definition ist die ehrlichste?** **Definition II.** Sie misst nicht, ob jemand *gesagt* hat,
dass er fertig ist, sondern ob die Behauptung **vor der Nachmessung** hält — und genau das ist der
Unterschied, den dieses Projekt an anderer Stelle „Wirkung vor Grün" nennt. Definition I belohnt
Fleiß, Definition II belohnt Wahrheit. Der Preis von II ist, dass sie vom Prüfer abhängt: 9 geprüfte
Zusagen sind eine Stichprobe, keine Vollerhebung — die Quote hat deshalb eine **Messunsicherheit**, die
ich nicht als Dezimalstelle verstecke: **±1 Zusage verschiebt sie um rund 11 Punkte.**

**Und die Torquote?** Sie sieht mit 100 % am besten aus und ist am wenigsten aussagekräftig: sie prüft
nur, was messbar war. Vier der zehn Tore konnte ich nicht anfassen.

> [!warning] Unterm Strich
> **Keine der beiden Definitionen erreicht die geforderten 90 % in der strengen Lesart.**
> 87,8 % (Aufgaben) und 66,7 % (Zusagen) sind die Zahlen, die ich vor dem Nutzer vertreten würde;
> 91,8 % und 88,9 % sind die wohlwollende Lesart mit benannten Abzügen. Wer 90 % will, muss die
> Nachmeldungen mitzählen — und akzeptieren, dass **zwei** der neun geprüften Zusagen einen Abstrich
> tragen und **eine** (APK) schlicht falsch dokumentiert ist.

## 6 · Die Ausfälle, namentlich

Keine Schönfärberei: hier steht, was schiefging, mit Zahl und Beleg.

| # | Ausfall | Beleg | Was es gekostet hat |
|---|---|---|---|
| 1 | **Anführungszeichen-Falle — dreimal, drei Testdateien lahmgelegt** | `tests/klassenraum-hilfevorrat.test.js` (Zusicherung im Gruppenrumpf) · `tests/hilfe-ebene2.test.js` (nicht ladbar) · `tests/ethos-r12.test.js:83` (echtes `"` im `pruefe`-Namen — **heute selbst gemessen**: 17:09 `LADEFEHLER: labor-tests.js:22744`, Exit 2) | **Jedes Mal stand der GANZE Testlauf still** (Exit 2, keine einzige Zahl) — nicht ein roter Test, sondern gar kein Ergebnis. Beim dritten Mal dauerte es von 17:09 bis ~17:15. |
| 2 | **„Grün ohne Wirkung" — zweimal** | a) R12 meldete `0 sichtbare Elemente — eingehalten` (dokumentiert in `tools/ethos.py` selbst, Aufgabe task-42) · b) das Menüproben-Profil `telefon-quer` brach mit „kein UI" ab: **1 Verstoß und 9 gar nicht gemessene Kriterien** (dokumentiert in `tools/menueprobe.py`, Diff geprüft) | Eine Regel galt als eingehalten, die **nichts gemessen** hatte; ein Profil galt als gemessen, das **abgebrochen** war. Genau die Bauart, vor der AGENTS.md warnt. |
| 3 | **Ein Messwerkzeug zehn Minuten kaputt** | `tools/ethos.py` 17:06:39 (`except Exception als_fehler:`) → SyntaxError; mein erster Regelwerks-Lauf fiel hinein; 17:06:50 repariert (**selbst gemessen**) | Ein Lauf ohne Zahlen; die Nullmessung der Output-Runde musste wiederholt werden. |
| 4 | **Attrappen-Leak: acht rote Tests, Ursache im Test, nicht im Produkt** | `docs/CHANGELOG.md` + `Review – 2.0-Fundament.md` § 3.3: „Ursache lag **in der Attrappe des Tests, nicht im Produktivcode**"; die Attrappe wurde repariert, es **blieben drei Fehler** | Acht rote `UI: Übergabe › …`-Zeilen, eine ganze Prüfrunde, und die Gefahr, den Fehler im Produktivcode zu suchen. |
| 5 | **Falscher Abnahmebefehl: `--klassenraum` prüft 0 Fälle** | `docs/Architektur.md:911`, `CHANGELOG.md:229-230`, `Review – Klassenraum A+B.md:199` („**bestätigt: der Befehl ist unbrauchbar**"); Mechanik in `tests/run.js:53,60,66`: der Filter nimmt das Argument wörtlich, kein Testname enthält die Striche | **`0/0 grün` bei Exit 0 — ein grüner Lauf, der nichts geprüft hat.** Das ist „grün ohne Wirkung" ein **drittes** Mal, nur an anderer Stelle. |
| 6 | **Testdatei mit fehlender Klammer und falschem Rückgabewert** | `docs/entwicklung/Befund – 27 von 27.md:162-164`: „`}));` statt `});` erzeugte einen `LADEFEHLER`" und „die Kapsel gab das **Ergebnis** statt einer Hülle zurück (`t.fn is not a function`)" | Ein Zwischenstand war nicht lauffähig — der Schwarm bekam eine kaputte Datei. |
| 7 | **Das Namenswerkzeug verschwieg genau seinen Fall** | `docs/CHANGELOG.md`: `node tools/pruefe-namen-flicken.js` meldete „0 laden nicht" (Exit 0), **während `tests/hilfe-ebene2.test.js` nicht ladbar war**; Ursache `tools/pruefe-namen-flicken.js:86`, danach korrigiert | Die Absicherung gegen Ausfall 1 war selbst blind. Heute misst das Werkzeug ehrlich: „76 Dateien geprüft, 0 laden nicht". |
| 8 | **Ein doppeltes Bild als zwei Vorführschritte** | `D-vorfuehrung-2a-b-auftrag-web.png` = `D-vorfuehrung-2b-c-auftrag-web.png`, beide 171 718 B, gleicher SHA256 (**selbst gemessen**) | Schritt „Auftrag B" und Schritt „Auftrag C" sind mit **demselben** Bild belegt. Die Zahl „10 Fotos" stimmt, die Beweiskraft für den Unterschied B↔C nicht. |
| 9 | **Dokumentierte APK stimmt nicht mit der Datei überein** | `Architektur.md` § 12 nennt 1 160 732 B / `A27751B2…`; auf der Platte liegen **1 164 828 B** / `2208C08A…` (**selbst gemessen**) | Ein Nachweis, der auf eine Datei zeigt, die es so nicht mehr gibt. Klein, aber es ist derselbe Fehlertyp wie die veralteten Codec-Belege. |

## 7 · Was das Team gelernt hat — und was für 3.0 zählt

**Was sich wiederholt hat:** Die Anführungszeichen-Falle kam **dreimal**, „grün ohne Wirkung" **dreimal**
(R12, Menüproben-Profil, `--klassenraum`), veraltete Belege **zweimal** (Codec-JSON, APK), und **ein**
Werkzeug war zehn Minuten kaputt. Das Muster ist immer dasselbe: **eine Zahl, die aus einem Fehlerpfad
entsteht, sieht genauso aus wie eine gemessene Zahl.**

**Was nachweislich dagegen hilft — und schon eingebaut ist:**

1. **Trockenlauf zuerst.** `node tools/pruefe-namen-flicken.js` ohne `--setzen` zeigt, was es täte.
2. **Gegenproben als Pflicht.** Die Werkzeuge haben sie eingebaut: `ethos.py --gegenprobe` sticht elf
   Regeln absichtlich und **muss** rot werden; `menueprobe.py` lädt bei „kein UI" genau einmal neu und
   schreibt die Notiz dazu; `rauch.py` und `klassenraum-probe` arbeiten mit eigenen Nachrechnungen.
3. **„Nicht gemessen" als eigener Zustand.** Das ist die wichtigste Neuerung dieser Runde: `ethos.py`
   meldet R12 nicht mehr als 0, sondern als **`NICHT GEMESSEN`** — und die Schlusszeile sagt, dass die
   Regel weder als eingehalten noch als verletzt zählt. Dasselbe Prinzip hat der Prüfer beim
   Codec angewandt („nicht geprüft" steht ausdrücklich im JSON).
4. **Kapseln um jeden Test.** Jede Zusicherung gehört in `pruefe(…, kapsel(() => {…}))`; ein sofort
   ausgeführter Gruppenrumpf reißt den ganzen Lauf mit (Ausfall 1).
5. **Byte-Messung statt Textmodus.** Zweimal in dieser Sitzung hat mich der Textmodus getäuscht
   (CRLF, einzelne `\r`). Wer Zeilen und Enden vergleicht, misst Bytes.

**Was 3.0 daraus mitnehmen sollte:** Die Quote ist nicht durch mehr Zusagen zu heben, sondern durch
**weniger blinde Flecken**. Konkret: (a) ein Kurzlauf `node --check` über alle JS-Dateien und ein
Laufzeit-Zähler für `console.error` (Vorschlag P3 aus `Review – Testqualität`), damit Ausfall 1 und 6
früher auffallen; (b) Belege mit **Datum und Fassung** im Dateinamen, damit Ausfall 9 (veraltete APK)
nicht mehr möglich ist; (c) jede Zusage, die ein Werkzeug misst, mit einer **Gegenprobe** versehen —
so wie es `ethos.py --gegenprobe` schon vormacht.

## 8 · Nicht feststellbar (Pflichtabschnitt)

* **Die vier Browser-/Programm-Tore** (Rauchtest 45/45, Menüprobe Web 45/0, Android 49/0, R12 im
  laufenden Programm 6/6 und 3/3) habe ich **nicht selbst gemessen** — Auflage „keine Prozesse". Ich
  berichte sie als **nicht gemessen**, nicht als bestanden. Belegt sind sie nur durch die Dokumente der
  Leitung (`Architektur.md` § 12.2, `CHANGELOG.md`).
* **Die 27 „Fertig-Meldungen"** des Auftragstextes kann ich nicht zählen: Meldungen im Postfach der
  Leitung sehe ich nicht. Was ich sehe, sind **43 abgeschlossene Aufgaben** — die Zahl 27 und meine 43
  messen offenbar Verschiedenes. **Das ist eine echte Lücke dieser Bilanz.**
* **Die Codec-Probe habe ich nicht neu gefahren** (~250 s, schreibt `Nachweise/`). Die Zahl 3520 stammt
  aus dem Beleg vom 06.10., nicht aus meiner Messung.
* **Ob die vier Dokumente-Verluste** (veraltete Codec-JSON, veraltete APK-Angabe, doppeltes Bild,
  `AGENTS.md` 725 statt 726) **Auswirkungen auf Veröffentlichungen** hatten, habe ich nicht geprüft.
* **Keine Aussage über die Qualität der Inhalte** (ob die 58 Aufträge didaktisch taugen) und **keine
  über eine echte Unterrichtsstunde** — beides war nicht Gegenstand und ist nicht messbar.
* **Die Quote hat eine Stichproben-Unsicherheit**: 9 geprüfte Zusagen, ±1 verschiebt sie um rund 11
  Punkte. Eine Vollerhebung aller Zusagen war nicht möglich.

## 9 · Belege dieser Bilanz (selbst ausgeführt)

| Zweck | Handlung | Ergebnis |
|---|---|---|
| Aufgabenstand | `team_task_list` (vollständig, 49 Einträge) | 43 completed · 5 in_progress · 1 pending · 0 abgebrochen |
| Tests | `sh tools/test.sh` (Git-Bash-Form) | **726/726 grün, 0 übersprungen, Exit 0**, 81 Testdateien, 91 Module |
| Regelwerk | `python tools/ethos.py` | GRÜN, R1 22 · R2 113 · R3 195 · R4 514 · R5–R11 = 0 · R12 „NICHT GEMESSEN" |
| Klassen | `python tools/klassen.py` | 0 |
| Simulation | `node tools/sim-stand.js` | unverändert (12/12) |
| Doku | `python tools/seite.py --pruefen` | GRÜN, 42 Dokumente, Exit 0 |
| Stand-Datei | `tests/stil-stand.json` gelesen | neu eingefroren auf R1 22 · R2 113 · R3 195 · R4 514 · R5–R12 = 0 (jeder Wert **besser oder gleich** dem alten Stand — kein Deckeln) |
| Erzeugnisse | `Get-FileHash` | Einzeldatei = `docs/index.html` = `C3C51EDA…828E` (2 829 477 B); `.exe` 8 630 272 B; APK 1 164 828 B |
| Datenpaket | Module geladen und gezählt | tickets 58 · skills 27 · mini 92 · wiki 29 · miniDenkhilfen 91 · trainings 34 |
| Injektoren | `neu({…})` in `src/spiel/injektoren.js` gezählt | 39 |
| Bilder | SHA256 je PNG | 10 × `D-vorfuehrung-*`, davon **2 identisch** |
| Ausfälle | Dokumente gelesen (`Review – Betrieb.md:206`, `Befund – 27 von 27.md:162-164`, `CHANGELOG.md`, `Review – Klassenraum A+B.md:199`, `tools/menueprobe.py`, `tools/ethos.py`) | Belege wie in § 6 zitiert |
