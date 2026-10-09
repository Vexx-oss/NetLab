---
typ: befund
erstellt: 2026-10-09
aktualisiert: 2026-10-09
status: abgeschlossen — Nullmessung (aus HEAD bbf20d8) und Nachher-Messung (09.10.2026, 17:43) stehen; fünf meiner sieben Gegenproben bestanden, zwei Befunde offen (§ 12/§ 13)
tags: [FISI, Lernspiel, Netzwerk, Stil, Output-Runde, Befund, Messung]
---

# 📏 Befund – Output-Runde (unabhängige Messung)

> [!info] Was diese Datei ist
> Ich bin der **Prüfer** dieser Runde, nicht einer der Ströme. Hier steht der **Vorher-Stand** der
> 14 CSS-Dateien und der zwölf Minimalismus-Regeln — gemessen, bevor die Ströme geschrieben haben.
> Wenn der Lead „Ströme sind durch" meldet, wird derselbe Satz Zahlen **erneut** gemessen und
> gegenübergestellt (§ 7 sagt vorher, was geprüft wird — damit die Abnahme nicht nachträglich
> verhandelbar ist).

> [!tip] Der Vorher-Stand ist gegen weiterlaufende Arbeit gesichert
> Alle 14 Dateien sind byte-identisch mit `HEAD` (`bbf20d8`). Die Nullmessung ist deshalb **jederzeit
> reproduzierbar**, auch wenn die Ströme weiter am Arbeitsbaum schreiben: `git show HEAD:src/stil/<datei>`.

## 1 · Vorher-Stand der 14 Dateien

Aufnahme **09.10.2026, 17:06:43** (Schnappschuss) — geprüft: jede Datei `== HEAD` (Byte-Vergleich SHA256,
nachdem ein erster Vergleich über `git show` im Textmodus bei `inspektor.css` falsch anschlug; siehe § 5).
Bytes, Zeilen und CRLF sind **byteweise** gezählt, nicht über einen Editor.

| Datei | Bytes | Zeilen | CRLF | SHA256 (HEAD, vollständig) |
|---|---:|---:|---:|---|
| `editor.css` | 29 064 | 337 | 0 | `248CC2C0F79998D5838F6C689CDF078B6E430A816CD152173DB17EF8669D637F` |
| `spiel.css` | 24 432 | 282 | 0 | `873924F0A8A7A4D969FA408971DD4AD385CAE0AAB8E0D928A156811F356CE6F9` |
| `szene.css` | 6 957 | 76 | 0 | `8874206F241A72D121BEA4D7BD8C621BB2DA0D0BBD51669ECC67C7EE140DEB2C` |
| `juice.css` | 3 242 | 47 | 0 | `8542E107662F195FA616C77287E9000AA4C7592EE98A94D09562C4B972C3B017` |
| `rahmen.css` | 17 136 | 193 | 0 | `F1D1C915B08B862C612CD397E1992A4994F7A52F47FB9525EC75543C1A9D5C43` |
| `leiste.css` | 6 719 | 78 | 0 | `27C6F587FB1F7F7CC413EA1DF43A29FBFBC5F23C7272D6D6686A8DC04755E659` |
| `inspektor.css` | 11 658 | 149 | **149** | `C3AAC7D8604C245DF117694AE1DBDE65136592E8A9B58F3AD0847D828C96FB88` |
| `ereignisse.css` | 1 577 | 17 | 0 | `CAD4294044F7279DF7133DAE05A0486C743786E198B8D4F1915B87C092221280` |
| `karriere.css` | 10 417 | 131 | 0 | `319ED3F1398FBC80FAFA6EEBE22784D366E5F98F494105A9601917ABEE5E75C9` |
| `hub.css` | 7 061 | 91 | 0 | `A1E1B052E7B2F14BA0DFA2164A1090A8E818B0F48F38406338BF72DB585BEC32` |
| `simulation.css` | 11 926 | 146 | 0 | `1DDACB8E4879CD393E94BBA32BC69D1BF7546673DE3C43B7E95494615E24635C` |
| `terminal.css` | 2 089 | 22 | 0 | `9DD47547813A508053ADE36890C7F8022EFAC5B153A4D37D4BBFD08D2864C6E2` |
| `akte.css` | 2 799 | 37 | 0 | `439966587CFD075B75C3720E9A4DAF0D39131B60F5BF1525FF662FDACBF310DA` |
| `kundenakte.css` | 2 768 | 42 | 0 | `724DE277DE4BE68CE9D2DEA6A479852FEA1C6D283504A60D5A642780C32A9E96` |

> [!warning] `inspektor.css` ist die einzige CRLF-Datei — und git sieht dort nichts
> 11 658 B, 149 Zeilen, **alle 149 mit CRLF** — so steht sie in HEAD, also **committet**, nicht von einem
> Strom erzeugt. `git ls-files --eol src/stil/inspektor.css` meldet `i/-text w/-text`, git hält die Datei
> für **binär**: eine LF-Umstellung wäre mit `git diff --stat` **nicht** sichtbar. Ich prüfe diese Datei
> deshalb später **byteweise** (§ 7, Punkt 1). Alle anderen 13 Dateien sind reines LF (`i/lf w/lf`).

## 2 · Vorher-Stand der Regeln — aus HEAD, mit `tools/ethos.py` selbst gerechnet

Gesamtzahlen aus HEAD (`git show HEAD:…` für **alle 29** Dateien in `src/stil/`, dem Werkzeug als
Textliste übergeben):

| Regel | Was sie zählt | HEAD |
|---|---|---:|
| R1 | Farbe nur per Token | **23** |
| R2 | Radius nur aus Tokens | **122** |
| R3 | Schrift nur aus 6 Werten | **206** |
| R4 | Abstand nur aus der Skala | **539** |
| **R5** | Dauer nur 1/160/320 ms | **70** |
| **R6** | z-index nur aus der Leiter | **11** |
| R7 | `!important` nur in `basis.css` | **0** |
| **R8** | Bewegung aus: ein zentraler Block | **5** |
| R9 | Ein Selektor einmal definiert | **0** |
| **R10** | keine identische Blockdopplung | **87** |
| R11 | Längenzahl nur mit Einheit | **0** |
| R12 | höchstens 6 Bedienelemente je Ansicht | **nicht gemessen** (ohne `--dom` übersprungen) |

Kennzahlen HEAD: **29 Dateien · 2 199 Zeilen · 6 106 Deklarationen · 1 791 Regelblöcke · 1 750 Selektor+Kontext**.

**Die vier verfolgten Altlasten je Datei** (Summe = 173):

| Datei | R5 | R6 | R8 | R10 | Summe |
|---|---:|---:|---:|---:|---:|
| `editor.css` | 11 | 4 | 0 | 19 | **34** |
| `spiel.css` | 12 | 2 | 2 | 19 | **35** |
| `szene.css` | 16 | 1 | 2 | 2 | **21** |
| `juice.css` | 10 | 0 | 1 | 0 | **11** |
| `rahmen.css` | 8 | 3 | 0 | 14 | **25** |
| `leiste.css` | 5 | 0 | 0 | 2 | **7** |
| `inspektor.css` | 2 | 0 | 0 | 9 | **11** |
| `ereignisse.css` | 2 | 1 | 0 | 0 | **3** |
| `karriere.css` | 3 | 0 | 0 | 3 | **6** |
| `hub.css` | 1 | 0 | 0 | 3 | **4** |
| `simulation.css` | 0 | 0 | 0 | 13 | **13** |
| `terminal.css` | 0 | 0 | 0 | 1 | **1** |
| `akte.css` | 0 | 0 | 0 | 1 | **1** |
| `kundenakte.css` | 0 | 0 | 0 | 1 | **1** |
| **Summe** | **70** | **11** | **5** | **87** | **173** |

Vier Dateien haben **kein** R5/R6-Problem (`simulation`, `terminal`, `akte`, `kundenakte`): dort geht es
nur um R10. Umgekehrt trägt `editor.css` allein 4 der 11 z-index-Verstöße.

## 3 · Die Stand-Datei als Referenz — und warum „GRUEN" dort wenig heißt

`tests/stil-stand.json` (500 B, SHA256 `2C685CEB3FB3B2ABC9808C3106DA33B94C3B51F0F9817EE0F00D266E1CC8DFC5`,
zuletzt **06.10.2026 18:54:39**) friert ein: R5 **70**, R6 **11**, R8 **5**, R10 **87** — also genau die
HEAD-Zahlen, die der Lead genannt hat. **Aber:** die Stand-Datei friert **21 Dateien / 1 878 Zeilen /
5 450 Deklarationen** ein; heute sind es **29 / 2 199 / 6 106**.

> [!warning] `ethos.py` meldet damit „GRUEN", obwohl 173 Verstöße offen sind
> Das ist die **Bauart** des Werkzeugs, nicht ein Fehler: `pruefe_gegen_stand` meldet nur, wenn eine Zahl
> **steigt** („Eingehalten ist damit nicht jede Regel — der Stand friert die Altlasten ein"). Für die
> Abnahme heißt das: **„GRUEN" ist kein Nachweis**. Der Nachweis sind die Zahlen aus § 2.

**Live-Stand um 17:07** (`python tools/ethos.py`, Exit 0, „GRUEN"): R5 **67**, R6 **10** — die Ströme
haben zu diesem Zeitpunkt also bereits **3 Zeitwerte und 1 z-index** bereinigt. Alles andere unverändert.

## 4 · Zeitachse der Nullmessung (wer wann was angefasst hat)

| Zeit | Beobachtung |
|---|---|
| 17:06:39 | `tools/ethos.py` geschrieben — **syntaktisch kaputt** (`except Exception als_fehler:`) |
| **17:06:43** | **mein Schnappschuss der 14 Dateien — identisch mit HEAD** |
| 17:06:45 | mein erster `python tools/ethos.py` → `SyntaxError: invalid syntax`, Exit 1, **keine Zahlen** |
| 17:06:50 | `ethos.py` repariert (571 Zeilen), läuft wieder |
| ab 17:07:15 | die Ströme schreiben: `ereignisse.css`, `spiel.css` (17:07:22), `karriere.css` (17:07:23) … |
| 17:07:44 | `tests/ethos-r12.test.js` neu geschrieben — mit einem echten `"` im Testnamen (§ 5) |
| ~17:09 | mein Gesamtlauf → `LADEFEHLER`, Exit 2: die Suite **lädt nicht mehr** |
| ~17:12 | `node tools/pruefe-namen-flicken.js` (trocken) → `1 laden nicht`; der Blocker war bestätigt |
| ~17:15 | derselbe Trockenlauf → `0 laden nicht`: **der Blocker ist behoben** (Datei 6 723 → 6 725 B) |

**Was die Ströme bis ~17:15 schon verändert hatten** (Byte-Vergleich gegen HEAD, alles weiter **LF**):

| Datei | HEAD B/Z | jetzt B/Z | Δ Bytes |
|---|---|---|---|
| `spiel.css` | 24 432 / 282 | 25 472 / 288 | +1 040 |
| `szene.css` | 6 957 / 76 | 8 411 / 90 | +1 454 |
| `juice.css` | 3 242 / 47 | 4 313 / 55 | +1 071 |
| `ereignisse.css` | 1 577 / 17 | 1 797 / 19 | +220 |
| `karriere.css` | 10 417 / 131 | 10 349 / 128 | −68 |
| `hub.css` | 7 061 / 91 | 7 135 / 91 | +74 |
| `simulation.css` | 11 926 / 146 | 11 899 / 136 | −27 |
| `terminal.css` | 2 089 / 22 | 2 135 / 22 | +46 |
| `akte.css` | 2 799 / 37 | 2 882 / 37 | +83 |
| `kundenakte.css` | 2 768 / 42 | 2 826 / 41 | +58 |
| `editor.css` · `rahmen.css` · `leiste.css` · `inspektor.css` | — | unverändert | 0 |

> [!note] Diese Zwischenstände sind **kein** Nachher-Stand
> Sie sind der Beweis, dass die Runde läuft — nicht ihr Ergebnis. Die Abnahme (§ 7) misst erst nach dem
> Wort „Ströme sind durch".

## 5 · Der Blocker: die Suite lud nicht (und die Ursache)

`tests/ethos-r12.test.js:83` enthielt in einem `pruefe()`-Namen ein **echtes ASCII-Anführungszeichen**:

```js
pruefe("Eine nicht erreichbare Ansicht ist „nicht gemessen" — und reißt die Regel", () => {
```

Das `"` hinter „nicht gemessen“ schließt die Zeichenkette vorzeitig → `SyntaxError: missing ) after
argument list`. Weil `tests/run.js:58` **alle** Testdateien in **einen** `vm`-Zusammenhang lädt, riss das
den **ganzen** Lauf ab: `LADEFEHLER: labor-tests.js:22744`, **Exit 2**, keine einzige Zahl. Genau die
Falle, vor der AGENTS.md warnt („Gegen die Falle in Testnamen") — und `tools/pruefe-namen-flicken.js`
kannte sie: Trockenlauf `1 laden nicht`. Rund zehn Minuten später war sie behoben (`0 laden nicht`).

**Nicht von mir behoben** (mein Schreibrecht ist diese Datei): ich habe nur gemeldet und belegt.

**Erledigt um ~17:15** — `node tools/pruefe-namen-flicken.js` meldet danach `0 laden nicht`. Die Suite lädt
wieder; `node tests/run.js` läuft durch.

### Der Gesamtlauf ist während der Runde ein **bewegliches Ziel**

| Zeit | Ergebnis | rote Tests |
|---|---|---|
| 17:15:46 | **678/689 grün, 11 rot** (78 Testdateien, 91 Module) | nicht mitgeschrieben |
| 17:20:48 | **686/690 grün, 4 rot** | Doku: Markdown-Konverter › „Jede erzeugte Seite hat `<h1>`, Inhalt, Fussleiste und den Weg zum Spiel" · Doku: Markdown-Konverter › „Die Uebersicht nennt alle Dokumente, gruppiert, mit einer Zeile je Dokument" · Klassenraum: Lösbarkeit › „alle 27 Fertigkeiten: Injektor + Ziel, im Startnetz wirklich gebrochen, gültig und lösbar" · Klassenraum: Lösbarkeit › „der echte Weg der Lehrkraft: erzeugen → Code → ausCode → lösen → Abnahme besteht (alle 27)" |
| **17:29:38** | **690/690 grün, 0 rot, Exit 0** | keine (78 Testdateien, 91 Module, 0 übersprungen) |

> [!warning] Die Nullmessung des Gesamtlaufs ist **nicht** 661/661
> In 14 Minuten: 689 → 690 Tests und **11 → 4 → 0** rote. Die vom Lead genannte Zahl 661/661 ist **nicht
> reproduzierbar** — es gibt inzwischen 690 Tests. Wer sie als Vorher-Stand zugrunde legt, vergleicht
> gegen einen Stand, den es nicht mehr gibt. Für die Nachher-Messung gilt: **Gesamtzahl nur zusammen mit
> Zeitstempel**, und rote Tests **namentlich** — die Zahl allein sagt nichts. Erschwerend: der Gesamtlauf
> ist selbst ein **Schreibvorgang** (siehe Kasten unten), er ändert also den Zustand, den er misst.

> [!note]- Warum zwei rote Tests **meine** Datei betrafen (und sich selbst heilen)
> `tests/doku-seite.test.js` zählt die Quellen (`docs/**/*.md` plus `README.md` und `AGENTS.md`) und
> verlangt, dass jede davon in `docs/doku/` als Seite liegt. Mein neuer Befund war um 17:20 noch nicht
> gebaut → zwei Karten fehlten → zwei Tests rot. **Im selben Lauf** baut der dritte Test dieser Datei die
> Seiten neu (`tools/seite.py`); eine Messung unmittelbar danach zeigt 42 erzeugte Seiten, 41 Karten und
> „41 Dokumente" in `docs/doku/index.html` — Bau und Quellen stimmen dann überein. Der Zustand heilt
> sich also selbst, ist aber für **jeden** neu hinzugefügten Text eine Runde lang rot. Die Testdatei kennt
> das (Kommentar `doku-seite.test.js:114-115`). **Folge für die Messung: `node tests/run.js` ist kein
> reiner Leselauf — er baut `docs/doku/` neu und verändert damit den Zustand, den er misst.**

## 6 · Ein eigener Messfehler, offen gelegt

Mein erster Vergleich „Schnappschuss == HEAD?" lief über `git show …` im **Textmodus**; Python wandelt
dabei CRLF → LF. Für die eine CRLF-Datei (`inspektor.css`) ergab das einen falschen Unterschied
(HEAD „11 509 B" gegen Arbeit „11 658 B"). **Korrekt** ist die Byte-Messung: HEAD-Blob und Arbeitsbaum
sind dort **identisch** (11 658 B, 149 × CRLF). Der Fehler ist hier festgehalten, weil er die Bauart
zeigt: wer Zeilenenden über einen Textmodus vergleicht, misst nicht die Datei.

## 7 · Prüfplan für die Nachher-Messung (vorher festgelegt)

1. **Zeilenenden byteweise** je Datei (Bytes, Zeilen, CRLF, SHA256) und `git ls-files --eol`; für
   `inspektor.css` zusätzlich `git diff --stat` gegen `--ignore-cr-at-eol` — mit dem Wissen, dass git
   diese Datei für binär hält.
2. **Regelzahlen** R1–R11 gegen HEAD (jede Verschlechterung ist ein Befund) **und** gegen
   `tests/stil-stand.json`; Hash der Stand-Datei gegen `2C685CEB…` — wird sie **gesenkt**, um Grün zu
   bekommen, ist das ein Befund, kein Fortschritt.
3. **Werkzeuge gegen Abschalten**: SHA256 von `tools/ethos.py` (`2CDB1BAB…`), `tools/klassen.py`
   (`932F1959…`), `tools/menueprobe.py` (`6406173C…`), `tools/test.sh` (`AF592509…`), `tests/harness.js`
   (`6F14D06F…`). Wird eine Prüfung **entfernt oder entschärft** statt ein Wert geändert, ist die Zahl
   wertlos. R12 muss **wirklich gemessen** werden (Zahl je Ansicht) — nicht „übersprungen" und nicht „0
   aus einem Fehlerpfad".
4. **Bewegung, die Rückmeldung trägt** (§ 3 der Auftragslage): je Datei die Zahl der
   `transition`/`animation`-Deklarationen und `@keyframes`-Blöcke gegen HEAD — **36 / 54 / 41** in den 14
   Dateien. Sinkt eine dieser Zahlen, während R5/R8 sinken, wurde Bewegung **entfernt** statt diszipliniert.
5. **Trefferfläche nicht durch Verkleinern des Inhalts**: Schriftgrößen-Histogramm je Datei (HEAD:
   u. a. 12 px = 35×, 13 px = 41×, 12,5 px = 25×, 14 px = 22×) und `min-height`/`min-width`-Werte
   (HEAD: 44 px = 3×, 40 px = 5×, 48 px = 2×, 46 px = 1×). Wird eine Fläche „passend" gemacht, indem
   Text schrumpft oder verschwindet, ist das eine Verschlechterung, keine Reparatur.
6. **Altlast durch Löschen statt Ändern**: sinkt die Zeilenzahl einer Datei, obwohl R10 steigen müsste —
   prüfen, ob ein Regelblock **gelöscht** wurde und seine Selektoren dadurch ohne CSS dastehen
   (`python tools/klassen.py` muss **0** bleiben).
7. **Tokens/Farben/Abstände**: R1 (23), R2 (122), R3 (206), R4 (539) dürfen nicht steigen; R7/R9/R11
   müssen **0** bleiben.
8. **`python tools/klassen.py`** = `0 Klassen ohne CSS-Regel` (Vorher: 0).
9. **`node tools/sim-stand.js`** — die Simulation darf sich durch reine Stil-Arbeit **nicht** verändert
   haben (Vorher nicht geprüft, wird beim Nachher-Lauf mitgemessen).
10. **`node tests/run.js`** — Gesamtzahl **mit Zeitstempel** und die roten Tests **namentlich**. Der
    Vorher-Stand ist nicht eine Zahl, sondern die Tabelle in § 5: **690/690 grün, 0 rot** um 17:29:38
    (davor 678/689 um 17:15:46 und 686/690 um 17:20:48). Die vom Lead genannte Zahl **661/661 ist nicht
    reproduzierbar** — es gibt inzwischen 690 Tests.
11. **Merkposten `tools/menueprobe.py`**: der Lead nennt **36/43** als rot. Diese Zahl messe ich erst im
    Nachher-Lauf **selbst** nach (sie hängt am gebauten `web/index.html`, und Bauen war nicht Teil der
    Nullmessung) — bis dahin gilt sie als **vom Lead genannt, von mir nicht nachgemessen**.

## 8 · Nicht geprüft

* **R12 ist nicht gemessen.** Ohne `--dom` überspringt das Werkzeug die Regel; ein DOM-Lauf braucht das
  laufende Programm (`python tools/cdp.py start`) — und der Lead hat bis auf Weiteres **kein Edge**
  freigegeben. Der R12-Zustand ist damit **offen**, nicht „eingehalten".
* **Kein Browserlauf.** Kein `rauch.py`, kein `menueprobe.py --lauf`, kein Programmstart — wie angesagt.
* **Der Bau ist nicht gelaufen** (`bauen.py`): die genannten Zahlen gelten für `src/stil/*.css`, nicht für
  die gebaute `web/index.html` oder die Einzeldatei.
* **Die Zwischenstände aus § 4** sind Momentaufnahmen während laufender Arbeit, keine Ergebnisse.
* **Der Gesamtlauf nach der Reparatur** ist eine Momentaufnahme; während der Runde werden laufend
  Testdateien ergänzt (75 → 76 Dateien innerhalb von Minuten).

## 9 · Belege (alle in dieser Sitzung ausgeführt)

| Zweck | Handlung | Ergebnis |
|---|---|---|
| Vorher-Stand | `Get-FileHash` + Byte-Zählung der 14 Dateien, 17:06:43 | Bytes/Zeilen/CRLF/SHA256 wie § 1 |
| Ist HEAD der Vorher-Stand? | `git show HEAD:src/stil/<d>` je Datei, Byte-Vergleich | 14 × identisch |
| Regeln aus HEAD | `tools/ethos.py` als Modul geladen, `messen(texte=liste)` mit HEAD-Texten | R5 70, R6 11, R8 5, R10 87; Kennzahlen § 2 |
| Regeln live | `python tools/ethos.py` | Exit 0, „GRUEN", R5 67, R6 10, R12 übersprungen |
| Klassen ↔ CSS | `python tools/klassen.py` | `0 Klassen ohne CSS-Regel`, Exit 0 |
| Zeilenenden | `git ls-files --eol src/stil` | 13 × `i/lf w/lf`; `inspektor.css` `i/-text w/-text` |
| Blocker | `node tests/run.js` | `LADEFEHLER: labor-tests.js:22744`, `SyntaxError`, **Exit 2** |
| Blocker bestätigt | `node tools/pruefe-namen-flicken.js` (trocken) | `1 laden nicht` → später `0 laden nicht` |
| Gesamtlauf | `node tests/run.js` (dreimal) | 678/689 (17:15:46) · 686/690 (17:20:48) · **690/690 grün, Exit 0** (17:29:38) |
| Fingerabdruck | `transition`/`animation`/`@keyframes` aus HEAD gezählt | 36 / 54 / 41 in den 14 Dateien |

---

# Nachher-Messung (09.10.2026)

> [!success] Kurzurteil
> **Die Runde ist echt.** Keine Regel wurde abgeschaltet, keine Schrift wurde kleiner, kein
> Höhenwert sank, die Zeilenenden sind unversehrt, `klassen.py` bleibt 0, die Simulation unverändert,
> der Gesamtlauf **715/715 grün** (17:43:37). R5 70 → 0, R6 11 → 0, R8 5 → 0, R10 87 → 0 sind mit
> **unveränderten Zählvorschriften** gemessen.
> **Zwei Dinge sind offen**, und beide betreffen R8: die fünf `prefers-reduced-motion`-Blöcke wurden
> **gelöscht**, nicht in den zentralen Block verschoben (`basis.css` ist byte-identisch) — für die
> meisten Fälle nachweislich unschädlich, weil die Endzustände in die Zustandsregeln wanderten;
> **zwei Selektoren in `juice.css` haben jetzt aber gar keine Regel mehr** (§ 12).

## 10 · Vorher/Nachher der 14 Dateien

Die Ströme haben noch **während** meiner Nachher-Messung geschrieben: `szene.css` um 17:39:32 und
`rahmen.css` um 17:42:01. Die Tabelle ist der Stand **17:43:56**; Fingerabdruck, Selektor-Vergleich und
R8-Zählung habe ich nach diesen beiden Schreibvorgängen **wiederholt**, damit alles denselben Stand zeigt.

| Datei | HEAD B/Z | JETZT B/Z | ΔB | ΔZ | CRLF | SHA256 jetzt ([:16]) | R5·R6·R8·R10 vorher → nachher |
|---|---:|---:|---:|---:|---:|---|---|
| `editor.css` | 29 064 / 337 | 31 777 / 360 | +2 713 | +23 | 0 | `949d7dfb2654e60e` | 11·4·0·19 → **0·0·0·0** |
| `spiel.css` | 24 432 / 282 | 24 964 / 269 | +532 | −13 | 0 | `567fc6b10f208b09` | 12·2·2·19 → **0·0·0·0** |
| `szene.css` | 6 957 / 76 | 11 071 / 112 | +4 114 | +36 | 0 | `1be83480f59438d8` | 16·1·2·2 → **0·0·0·0** |
| `juice.css` | 3 242 / 47 | 4 313 / 55 | +1 071 | +8 | 0 | `cd5df4147aa5c008` | 10·0·1·0 → **0·0·0·0** |
| `rahmen.css` | 17 136 / 193 | 18 630 / 201 | +1 494 | +8 | 0 | `4a481b75b2026ea4` | 8·3·0·14 → **0·0·0·0** |
| `leiste.css` | 6 719 / 78 | 6 898 / 79 | +179 | +1 | 0 | `54ed7f695ec9de11` | 5·0·0·2 → **0·0·0·0** |
| `inspektor.css` | 11 658 / 149 | 11 490 / 141 | −168 | −8 | **141** | `a1005bc5e584ed3f` | 2·0·0·9 → **0·0·0·0** |
| `ereignisse.css` | 1 577 / 17 | 1 797 / 19 | +220 | +2 | 0 | `6a9b99251ea50811` | 2·1·0·0 → **0·0·0·0** |
| `karriere.css` | 10 417 / 131 | 10 349 / 128 | −68 | −3 | 0 | `365bc84fead401ac` | 3·0·0·3 → **0·0·0·0** |
| `hub.css` | 7 061 / 91 | 6 965 / 88 | −96 | −3 | 0 | `b305b50d4f38ae26` | 1·0·0·3 → **0·0·0·0** |
| `simulation.css` | 11 926 / 146 | 11 899 / 136 | −27 | −10 | 0 | `43b54f31fbf320cf` | 0·0·0·13 → **0·0·0·0** |
| `terminal.css` | 2 089 / 22 | 2 135 / 22 | +46 | 0 | 0 | `55e99c70cc8e764a` | 0·0·0·1 → **0·0·0·0** |
| `akte.css` | 2 799 / 37 | 2 882 / 37 | +83 | 0 | 0 | `93344061d1c6e63d` | 0·0·0·1 → **0·0·0·0** |
| `kundenakte.css` | 2 768 / 42 | 2 826 / 41 | +58 | −1 | 0 | `1a6dea6255a88b6e` | 0·0·0·1 → **0·0·0·0** |
| **Summe** | 137 845 / 1 648 | 147 996 / 1 688 | **+10 151** | **+40** | 141 | — | **70·11·5·87 → 0·0·0·0** |

> [!caution] Diese Tabelle ist eine **Momentaufnahme**, keine Endabnahme
> Die Summenzeile ist die Summe **dieser** Tabellenwerte (Stand 17:43:56). Eine Nachzählung wenige
> Minuten später ergab bereits **149 990 B / 1 708 Zeilen** — es wurde also weiter geschrieben, nachdem
> der Lead „Ströme sind durch" gemeldet hatte. Meine erste Fassung dieser Summenzeile war außerdem
> **falsch addiert** (157 445 / 1 828 / +5 547 / +24); ich habe sie nachgerechnet und korrigiert.
> Regelzahlen, Zeilenenden und Werkzeug-Hashes sind von diesen Nachträgen nicht betroffen — sie waren
> bei jeder Messung im selben Lauf konsistent.

## 11 · Regeln und Kennzahlen Vorher → Nachher

| Regel | HEAD | jetzt | Urteil |
|---|---:|---:|---|
| R1 Farbe nur per Token | 23 | **22** | besser |
| R2 Radius nur aus Tokens | 122 | **121** | besser |
| R3 Schrift nur aus 6 Werten | 206 | **204** | besser |
| R4 Abstand nur aus der Skala | 539 | **530** | besser |
| R5 Dauer nur 1/160/320 ms | 70 | **0** | eingehalten |
| R6 z-index nur aus der Leiter | 11 | **0** | eingehalten |
| R7 `!important` nur in `basis.css` | 0 | 0 | unverändert |
| R8 Bewegung aus: ein zentraler Block | 5 | **0** | siehe § 12 |
| R9 Ein Selektor einmal definiert | 0 | 0 | unverändert |
| R10 keine identische Blockdopplung | 87 | **0** | eingehalten |
| R11 Längenzahl nur mit Einheit | 0 | 0 | unverändert |
| R12 höchstens 6 Bedienelemente je Ansicht | nicht gemessen | **nicht gemessen** | ohne `--dom` ausdrücklich „NICHT GEMESSEN" (kein stilles Grün mehr) |

Kennzahlen: 29 Dateien · **2 245 Zeilen / 5 997 Deklarationen / 1 705 Blöcke / 1 658 Selektor+Kontext**
(HEAD: 2 199 / 6 106 / 1 791 / 1 750).

> [!warning] Eine Zahl, die ich zuerst falsch gelesen habe: „Zeilen"
> `tools/ethos.py` liest Dateien im **Textmodus**; dort wird ein einzelnes `\r` ohne `\n` als
> Zeilenumbruch gezählt. `inspektor.css` enthält **12 solche einzelnen CR** → der Lauf meldet 2 245
> Zeilen, byteweise sind es **2 235**; für HEAD 2 199 gegen 2 187. Die Regelzahlen sind davon
> unberührt. Wer Zeilen vergleicht, muss dieselbe Zählweise benutzen.

## 12 · Der R8-Fund: gelöscht statt verschoben

`basis.css` ist **byte-identisch zu HEAD** (6 947 B, 94 Zeilen, `git diff` = 0 Zeilen). Der zentrale
Block `basis.css:91` ist eine **1-ms-Regel**, kein Ausschalter:

```css
@media (prefers-reduced-motion: reduce){ *,*::before,*::after{animation-duration:1ms !important; animation-iteration-count:1 !important; transition-duration:1ms !important} }
```

R8 wurde also nicht durch Einlagern gelöst, sondern durch **Löschen** der fünf Zusatzblöcke. Was darin
stand und wodurch es heute gedeckt ist — jede Zeile nachgemessen:

| gelöschter Block (HEAD) | Inhalt | heute gedeckt durch |
|---|---|---|
| `juice.css:45` | `animation:none` für `.ger[class*="jc-"] .gb`, `.kabel[class*="jc-"] *`, `.am-ziele.jc-haken`, `.lb-wz.jc-wahl`, `.pa-kat.jc-wahl`, `.wert.jc-geld`, `.sp-sterne.jc-sterne span.voll` | Zentralregel **1 ms** — **nicht** `animation:none`. Die zwei ersten Selektoren haben **gar keine Regel mehr** |
| `spiel.css:259` | `.sp-overlay.blatt .sp-karte{transform:none; transition:none}` | `.sp-overlay.da .sp-karte, .sp-overlay.blatt.da .sp-karte{transform:none}` (spiel.css) — die Regel war doppelt |
| `spiel.css:269` | `.sp-fest .sp-senior-sym, .sp-fest h2{animation:none}` | beide Animationen haben `both`; ihre Keyframes enden auf `transform:none; opacity:1` → Endzustand bleibt stehen |
| `szene.css:35` | `…{animation:none}` **und** `.sz-balken i{width:100%}` | `szene.css:29` trägt den Endzustand jetzt **selbst**: `.sz-balken i{… width:100%; animation:sz-laden … both}`, `@keyframes sz-laden from{width:0}` |
| `szene.css:71` | `animation:none`, `opacity:1` für Adressen/Legende, `.sz-stempel{transform:rotate(-12deg); opacity:1}` | `szene.css:83` `.sz-audit.gestempelt .sz-stempel{transform:rotate(-12deg); opacity:1; animation:sz-stempeln …}`; die Adress-/Legendregeln tragen `opacity:1` ohnehin. Alles mit `both` |

> [!danger] Der eine echte Verlust
> `.ger[class*="jc-"] .gb` und `.kabel[class*="jc-"] *` haben **im ganzen `src/stil/` keine Regel mehr**
> (gemessen über alle 29 Dateien). Sie waren **nicht tot**: `UI.juice(el,"einrasten")` wird auf
> Kabel-Elementen gerufen (`src/ui/editor-werkzeuge.js:307` und `:353`, `Z.kEl.get(...)`), und
> `UI.juice` setzt die Klasse `jc-einrasten` (`src/ui/juice.js:11`). Für Nutzer mit
> „Bewegung reduzieren" liefen die Einrast-Animation und die Port-LED-Animation dieser Elemente bisher
> **gar nicht**, jetzt laufen sie in **1 ms**. Sichtbar dürfte der Unterschied nicht sein — gemessen ist
> er nicht (kein Browserlauf freigegeben).
>
> Die Absicht dahinter ist dokumentiert und vertretbar: „Bewegung reduzieren" heißt im ganzen Programm
> „1 ms statt aus" (`basis.css:91`), und der zweite, schärfere Schalter der Einstellung
> (`basis.css:93`, `html[data-bewegung="aus"] *{animation:none !important; transition:none !important}`)
> ist **unangetastet** — „Bewegung aus" schaltet weiterhin wirklich ab.

## 13 · Die sieben Gegenproben — Ergebnis

| # | Gegenprobe (aus § 7) | Ergebnis |
|---|---|---|
| 1 | **Zeilenenden** byteweise + `git ls-files --eol` + `git diff --stat` gegen `--ignore-cr-at-eol` | **bestanden**: `git diff --stat src/stil` = `306 insertions(+), 260 deletions(-)`, mit `--ignore-cr-at-eol` **identisch**; von 29 Dateien 28 × `i/lf w/lf`, nur `inspektor.css` `i/-text w/-text` (unverändert 141 Zeilen / 141 CRLF / 12 einzelne CR) |
| 2 | **Regeln gegen HEAD und gegen `tests/stil-stand.json`** | **bestanden**: keine Regel schlechter, vier besser; Stand-Datei **byte-identisch** (`2C685CEB…`), also nicht gesenkt |
| 3 | **Werkzeuge gegen Abschalten** | **bestanden, mit Fußnote**: `stil-stand.json`, `klassen.py`, `test.sh`, `harness.js` unverändert; `ethos.py` geändert — aber **nur im R12-Block**, Skalen und die Funktionen R4/R5/R6/R8/R10 zeichengleich zu 17:06, und R12 wurde **strenger** (sagt „nicht gemessen" statt stiller 0); `menueprobe.py` geändert — Diff geprüft: **keine Kriterien abgeschwächt**, nur eine Wartestelle + ein Neuladen bei „kein UI" |
| 4 | **Bewegung gegen „Rückmeldung entfernt"** | **bestanden**: `transition` 36 → 35, `animation` 54 → 54, `@keyframes` 41 → 41. Die eine verschwundene `transition` ist benannt: der gelöschte R8-Block `transition:none` auf `.sp-overlay.blatt .sp-karte` — keine Rückmeldung, sondern eine Reduced-Motion-Ausnahme |
| 5 | **Trefferfläche nicht durch kleineren Inhalt** | **bestanden**: keine neue Schriftgröße, **0** Selektoren ohne `font-size`; die drei entfallenen `font-size`-Deklarationen stecken in Komma-Zusammenschlüssen. `min-height/min-width`: **nichts wurde kleiner**, `44px` **3 → 11**, neu `68px`; entfallen sind nur `0`(1), `34px`(2), `36px`(1), `38px`(1), `40px`(1), `42px`(1) |
| 6 | **Altlast durch Löschen statt Ändern** | **bestanden mit zwei benannten Ausnahmen**: Regelblöcke mit Komma-Selektorliste **119 → 158 (+39)** = Zusammenschluss-Signatur; Selektoren 1 819 → 1 818 (2 weg, 1 neu); **3** Selektoren verloren eine Eigenschaft — `.sp-overlay.blatt .sp-karte` (`transition`, = der R8-Fall) und `klassenraum.css: .kl-lehrer`/`.kl-schueler` (`overflow`, **außerhalb der 14 Dateien**, nicht geprüft ob gewollt) |
| 7 | **Tokens/Farben/Abstände** | **bestanden**: R1 ↓1, R2 ↓1, R3 ↓2, R4 ↓9; R7/R9/R11 bleiben 0 |

**Weitere Werkzeuge nach der Runde:** `python tools/klassen.py` → `0 Klassen ohne CSS-Regel` ·
`node tools/sim-stand.js` → „Simulation unverändert gegenüber dem Referenzstand" (12/12) ·
`python tools/ethos.py` → GRÜN + „BESSER als der Stand" + ausdrücklich `NICHT GEMESSEN: R12` ·
`node tests/run.js` → **715/715 grün, 0 rot, 0 übersprungen, Exit 0 (17:43:37, 81 Testdateien, 91 Module)**.

## 14 · Was ich widerlegt habe

1. **„R8 wurde in den zentralen Block verschoben."** Widerlegt: `basis.css` ist byte-identisch, die fünf
   Blöcke wurden gelöscht, und die Zentralregel ist eine **1-ms-Regel**, kein `animation:none`.
2. **„Eine Regel wurde abgeschaltet, um grün zu werden."** Widerlegt: Skalen und Zählfunktionen
   unverändert, Stand-Datei unangetastet, R12 strenger statt lockerer.
3. **„Die Trefferflächen wurden passend gemacht, indem der Inhalt schrumpft."** Widerlegt: keine
   kleinere Schrift, kein Selektor ohne `font-size`, kein gesunkener `min-height`-Wert.
4. **„Die Altlasten wurden gelöscht statt geändert."** Weitgehend widerlegt: +39 Komma-Listen zeigen den
   Zusammenschluss; nur 2 Selektoren verschwanden (beide aus dem gelöschten R8-Block).
5. **„Die Menüprobe 43/5 ist reiner CSS-Fortschritt."** Relativiert: `menueprobe.py` wurde in derselben
   Runde geändert (Neuladen bei „kein UI"). Die Kriterien sind **nicht** abgeschwächt — aber der
   Vorher-Wert **36/43 stammt aus einer anderen Werkzeugfassung**, der Vergleich ist deshalb nicht
   allein der Stil-Arbeit zuzuschreiben.
6. **„661/661 als Nullmessung."** Nicht reproduzierbar: meine drei Läufe ergaben 678/689 → 686/690 →
   690/690 (vorher) und **715/715** (nachher), jeweils mit Zeitstempel.
7. **Der eigene Fehler aus § 6** (Textmodus bei Zeilenenden) hat sich bestätigt und ist hier erneut
   aufgetreten — diesmal bei den *Zeilen*: Textmodus zählt 12 einzelne `\r` in `inspektor.css` als
   Umbrüche. Beide Male ist die Byte-Messung die verlässliche.

## 15 · Nicht geprüft (Nachtrag zur Nachher-Messung)

* **R12 habe ich nicht selbst gemessen** — kein DOM-Lauf, kein Browser (so angesagt). Die Zahlen des
  Leads (`klasse` 6, `Auftrag` 3; fünf Altansichten über 6) stehen als **seine** Messung, nicht als
  meine. Selbst geprüft habe ich nur, dass `ethos.py` ohne `--dom` ausdrücklich „NICHT GEMESSEN" meldet.
* **Menüprobe 43/5 und Android 49/8, Rauchtest 45/45**: nicht selbst gefahren (keine Prozesse). Der
  `menueprobe.py`-Diff ist geprüft, die Zahlen nicht.
* **Die z-index-Neuvergabe**: Anzahl der Deklarationen unverändert (19), alle Werte auf der Leiter —
  ob die **Stapelreihenfolge** überall dieselbe bleibt, ist ohne Browser nicht entscheidbar. Mit den
  8 Überdeckungen der Android-Menüprobe ist das vereinbar, **bewiesen** ist es nicht.
* **`klassenraum.css`: `.kl-lehrer`/`.kl-schueler` verlieren `overflow`** — außerhalb der 14 Dateien,
  ob gewollt: **nicht geprüft**.
* **`inspektor.css`: 12 einzelne `\r`** (in HEAD wie im Arbeitsbaum, als `<CR><CR><LF>`-Leerzeilen bei
  Byte 10 778–11 487). Warum `git ls-files --eol` die Datei als `-text` führt, habe ich **nicht**
  ermittelt (keine NUL-Bytes, gültiges UTF-8 — gemessen, aber die Ursache der Einstufung nicht).
* **Sichtbares Verhalten**: kein Pixel, kein Klick, kein Vorleseprogramm geprüft. Alle Aussagen dieser
  Datei sind Quelltext- und Zahlenmessungen.
