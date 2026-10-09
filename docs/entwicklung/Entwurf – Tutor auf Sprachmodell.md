# Entwurf – Tutor auf Sprachmodell (Machbarkeit und Risiko)

> **Auftrag:** task-27, „E2 · Tutor auf Sprachmodell". **Prüfer:** `fehlertexte`, 09.10.2026.
> **Gegenstand:** Wäre ein Sprachmodell als Tutor eine echte Verbesserung gegenüber der statischen Hilfe
> (82 Fehlertexte · 25 fragebezogene Denkhilfen · 92 Minis · 34 Grundcodes · 36 Injektoren)?
> **Art dieser Datei:** Machbarkeits- und **Risiko**prüfung. Kein Umbau, keine Netzaufrufe, keine Zeile Code.
> **Alle Zahlen dieser Datei sind in dieser Sitzung gemessen**, sofern nicht ausdrücklich „Annahme" oder
> „nicht geprüft" danebensteht.

## Urteil vorweg

**LOHNT UNTER BEDINGUNGEN — und zwar nur als optionale Zugabe zum Terminal, nicht als Ersatz der Tabelle.**

Tragende Gründe:
1. Der Kontext ist reich **und klein**: 696 Zeichen (~199 Token, Schätzung) genügen für eine gute Erklärung.
   Das Modell muss fast nichts raten — es muss nur den *Fall* erklären, nicht das Spiel kennen.
2. Es gibt **belegte Fälle, in denen die Tabelle prinzipiell versagt** (Abschnitt 3): bei 67 der 92 Minis
   fällt die Denkhilfe auf einen Fertigkeitssatz zurück, der die gestellte Frage nicht beantwortet, und
   beim häufigsten Konsolenfehler („% Invalid input detected") sagt der Katalog „tippe ?", obwohl das Spiel
   den echten Grund (Port gibt es auf diesem Gerät nicht) bereits kennt.
3. Die **harte Regel ist maschinell durchsetzbar** — aber nur für die *wörtliche* Lösung. Gegen eine
   **Paraphrase** der Lösung hilft kein Filter (Abschnitt 4). Deshalb: Modell nie dort einsetzen, wo die
   Antwort ein einzelner Fakt ist (Mini-Tickets), und nie als einzige Hilfe.

Bedingungen, ohne die daraus ein **„lohnt nicht"** wird:
* **B1 Offline-Versprechen bleibt.** Das Spiel läuft heute ohne Netz und hat 0 Außenverweise. Der Tutor
  darf das nicht brechen: **Standard aus**, nur als ausdrücklich eingeschaltete Zugabe, mit Rückfall auf die
  Tabelle bei jedem Fehler (Abschnitt 5, Variante A).
* **B2 Kein Fahrzeug ohne Rückfall.** Fällt der Anbieter aus, muss jede Zeile Hilfe weiter funktionieren —
  die Tabelle ist der Rückfall, nicht der Notnagel (Abschnitt 6).
* **B3 Keine Daten von Minderjährigen zum Anbieter**, solange kein Auftragsverarbeitungsvertrag mit dem
  Bildungsträger steht. Der gemessene Dateninhalt ist harmlos (Abschnitt 6), aber die *selbst getippte
  Zeile* kann alles enthalten.
* **B4 Kein Modelltext als einzige Quelle** an Stellen, wo die Lösung ein Fakt ist (Mini-Tickets,
  Prüfungsfragen). Dort bleibt die Tabelle die Antwort und das Modell höchstens eine *Rückfrage*.

---

## 1 · Was das Spiel zum Fehlerzeitpunkt schon weiß

Alles Folgende liegt bereits im Speicher, wenn der Fehler passiert — **kein Feld muss neu erhoben werden**:

| Was | Wo im Quelltext | Was drinsteht |
|---|---|---|
| Die Eingabezeile + die Ausgabe | `src/ui/hilfe.js:153` ruft `Spiel.fehlertext({netz, id, modus, eingabe: text, fehler: letzterFehler})` | Befehl, Modus, Gerät, Fehlerkennzeichen, vollständiger Ausgabetext |
| Der Gerätetyp + die echten Ports | `src/spiel/fehlertexte.js` (`lageVon`, `Modell.PORTS`) | z. B. Router: `["Gi0/0","Gi0/1","Gi0/2"]` — sagt, ob ein Port existiert |
| Der Ausgabekatalog | `src/daten/fehlertexte.js` (82 Zeilen), öffentlich `Spiel.FEHLERTEXTE` | Erkennungsmuster, Muster, Beispiel, Klartext je Stufe |
| Die Hilfestufe des Tickets | `inst.hilfeStufe`, geschrieben in `src/spiel/hilfe.js:128-131`, migriert in `src/spiel/zustand.js:82` | 0…6, welche Sprosse der Leiter offen ist |
| Die **schon geöffneten** Hilfen **je Fertigkeit** | `src/spiel/hilfe.js:148` → `inst.hilfen.push({stufe, skill, frei, gedeckt, t})` | was der Lernende schon geholt hat — **mit `skill`**, also fachlich zuzuordnen |
| Der Lernstand je Fertigkeit | `L.box(id)` → `fremd/lernmotor.js:44`; `L.versucht`, `L.stufeName`, `L.faelligeIds` ebenda (`:111` öffentliche Fläche) | Leitner-Kasten 0…5, Versuche, Fälligkeit |
| Das Fehlerheft des Lernmotors | `L.fehler(...)`, `L.haeufigeFehler(n)` (`fremd/lernmotor.js:111`) | welche Fehler *dieser* Lernende wiederholt macht |
| Der Fehlerdex (Spiel) | `src/spiel/dex.js:7` + `DEX_SYMPTOM` `:22` | Fehlerart + **Kundensymptom** in Alltagssprache |
| Der Grundcode der Simulation | `Sim.GRUENDE` `src/sim/engine.js:34-70` — **34 Codes**, je `{titel, skill, schicht}` | z. B. `LINK_DOWN: {titel:"Kein Link", skill:"lab.link", schicht:1}` |
| Das Ereignis selbst | `Sim._log(...)` `src/sim/engine.js:115` → `{geraet, port, art, proto, grund, text, frame}` | Gerät, Port, Grund **und ein fertiger Klartextsatz** |
| Der Wiki-Eintrag zur Fertigkeit | `DATEN.wiki[skill]`, über `Spiel.mini.anker` (`src/spiel/mini.js:246`) verknüpft | Nachschlagetext je Fertigkeit |

**Messung (echter Fehlerfall, `interface gigabitEthernet0/7` auf einem Router):**

| Block | Zeichen |
|---|---|
| Eingabe + Ausgabe | 106 |
| Modus / Gerät / vorhandene Ports | 49 |
| Instanz (`hilfeStufe`, bisherige `hilfen` mit `skill`) | 85 |
| Fertigkeiten des Tickets | 23 |
| Lernmotor (`L.box` zweier Fertigkeiten, fällig, häufige Fehler) | 68 |
| Dex-Symptom (Kundensatz) | 70 |
| Grundcode (`Sim.GRUENDE.LINK_DOWN`) | 52 |
| Katalogtext (was heute gezeigt wird) | 243 |
| **Summe** | **696 Zeichen ≈ 199 Token** (Schätzung 3,5 Zeichen/Token) |

Zum Vergleich: der **komplette** Spielstand plus Netz derselben Szene misst 1096 Zeichen (~313 Token).
Die Kontextfrage ist damit **kein Kostenproblem** — der Unterschied zwischen „relevanter Ausschnitt" und
„alles" beträgt rund 114 Token. Wer alles schickt, spart sich die Auswahl-Logik und verliert fast nichts.

## 2 · Was ein Modell leisten könnte — und was nicht

**Kann es (weil es den Fall erklären, nicht das Spiel kennen muss):**
* Den *beobachteten* Fehler mit dem *Kontext* verbinden: „Gi0/7 gibt es auf diesem Router nicht — er hat
  Gi0/0 bis Gi0/2." Das ist Wissen aus `Modell.PORTS` + Eingabezeile, keine Spielfachkenntnis.
* Auf eine Frage antworten, statt einen Merksatz zu zeigen (der Fall der 67 Minis, Abschnitt 3).
* Denselben Sachverhalt in verschiedenen Formulierungen liefern — für Nachfragen („verstehe ich nicht")
  und für andere Leseniveaus, ohne 82 Texte zu pflegen.
* Die **Frage** des Lernenden verstehen, wenn sie unscharf ist („warum geht das nicht").

**Kann es nicht:**
* Garantieren, dass keine Lösung im Text steht (Abschnitt 4) — das ist eine *Filter*frage, keine Modellfrage.
* Deterministisch sein: derselbe Fall kann zwei verschiedene Texte ergeben. Das Spiel ist heute überall
  deterministisch (`tests/sim-stand.json`, kein `Math.random` ohne Seed in `src/sim/`, `src/cli/`).
* Offline arbeiten, wenn es ein Netzdienst ist (Abschnitt 5).
* Prüfungsrelevante Bewertungen übernehmen — Bewertung ist im Spiel an `Spiel.abnahme` gebunden.

## 3 · Drei belegte Fälle, in denen die heutige Hilfe versagt

**Fall 1 (der Fall des Leads — inzwischen teilweise geheilt, deshalb hier ehrlich nachgemessen): `mini-ping-3`**
*Beleg (heute gemessen):* Das Mini „Der Router-Ping zeigt „U.U.U". Was ist los?" **hat** inzwischen einen
eigenen Eintrag in `DATEN.miniDenkhilfen` — die 25 fragebezogenen Denkhilfen sind neu. Der Fall bleibt
aber als *Bauart* bestehen und ist der Grund für die 25: Ohne eigenen Eintrag greift der Fertigkeitssatz
`Spiel.WERKZEUGE["lab.ping"]` = „Ping-Werkzeug (P): von einem Gerät auf das andere ziehen und die
Ereignisliste in der Simulation lesen." — eine Bedienungsanleitung auf eine Diagnosefrage.
*Was auch mit dem neuen Eintrag offen bleibt (gemessen):* Der Lernanker verweist auf die **Fertigkeits**seite
(`src/spiel/mini.js:274` `wiki: w ? m.skill : null`). `DATEN.wiki["lab.ping"]` ist 2067 Zeichen lang und
enthält die Zeichenfolge „U.U.U" **nicht**, obwohl `DATEN.lehrtexte` sie kennt. Wer nach der Antwort
nachschlagen will, landet auf einer Seite, die den beobachteten Code nicht erklärt.
*Risiko:* Der Lernende bekommt auf eine Diagnosefrage eine Anleitung und beim Nachschlagen eine Seite, die
seinen Code nicht nennt — er lernt nicht, was „U" bedeutet (kein Echo, Ziel nicht erreichbar).
*Vorschlag:* Genau dieser Fall gehört in den Tutor: Eingabe (der Ping), Ausgabe (`U.U.U`), Grundcode
(`HOST_UNREACHABLE`/`TIMEOUT` aus `Sim.GRUENDE`) und Fertigkeit liegen vor.

**Fall 2 (selbst gefunden, gemessen): `mini-sub-3` — „Wie viele Hosts passen in ein /28-Netz?"**
*Beleg (Messung über alle 92 Minis):* **67 der 92 Minis** haben keinen fragebezogenen Denkanstoß (25 haben
einen); sie fallen auf `Spiel.SENIOR_FRAGEN[skill]` bzw. `Spiel.WERKZEUGE[skill]` zurück
(`src/spiel/mini.js:182` `miniOhneLoesung`, `:213` `miniAusschnitt` für die zweite Sprosse). Bei
`mini-sub-3` lautet der Rückfall: „Ebene „IP-Netze" und ipconfig: Liegen Adresse und Gateway im selben
Subnetz?" — eine Frage über *Adressvergleiche*, gestellt zu einer *Host-Anzahl*. Die Lösung ist „14".
*Risiko:* Die Hilfe führt in eine andere Denkrichtung als die Aufgabe. Der Lernende sucht den Fehler bei
sich, obwohl der Text nicht passt.
*Vorschlag:* Für „Rechnen" (Host-Anzahl, Netzadresse) ist ein Modell billig und präzise: Es kennt die
Aufgabenstellung (Frage + Optionen) ohnehin — aber siehe B4: dort darf es **fragen**, nicht lösen.

**Fall 3 (selbst gefunden, gemessen): der häufigste Konsolenfehler.**
*Beleg:* Auf einem Router ergibt `interface gigabitEthernet0/7` die Ausgabe
`"                                    ^\n% Invalid input detected at '^' marker."`. Der Katalog antwortet
(wortgleich für **jeden** falschen Input): „Das Gerät kennt das Wort über dem ^ nicht. Tippe an dieser
Stelle ein Leerzeichen und dann das Fragezeichen …". Das Spiel weiß aber: `Modell.PORTS.router` ist
`["Gi0/0","Gi0/1","Gi0/2"]`, der Modus ist `config`, und das `^` steht unter der Portnummer.
*Risiko:* Der Hinweis („tippe ?") ist nicht falsch, aber er verrät nicht die *Ursache* — und genau die ist
in diesem Moment bekannt. Das ist der Fall, in dem der Katalog prinzipiell nicht besser werden kann: Eine
Tabelle kann nur nach *Ausgabetext* unterscheiden, und dieser Text ist bei allen falschen Eingaben gleich.
*Vorschlag:* Der Tutor bekommt den Ausgabeausschnitt **plus** die Gerätefakten und darf die konkrete
Ursache benennen — hier ist die Ursache kein „Lösungstext", sondern eine Eigenschaft des Geräts.

**Nebenbefund (gemessen):** Von 82 Katalogeinträgen beantworten mehrere dieselbe Ausgabe (z. B.
`% Incomplete command.` → zwei Einträge, unterschieden nur über die Eingabezeile). Der Katalog ist damit
bereits an der Grenze dessen, was eine Ausgabe-Tabelle leisten kann — ein weiterer Ausbau wäre Pflege
ohne Ende (93. Fall, 94. Fall …).

## 4 · Die harte Regel: Prüfkette gegen „Lösung im Text"

**Was heute gilt (gemessen):**
* `Spiel.mini.hilfe` filtert jeden Text durch `miniOhneLoesung(text, m, pruefeOptionen)`
  (`src/spiel/mini.js:182`): abgelehnt wird, wenn der Text den Lösungstext enthält, wenn der
  Lösungstext den Text enthält (beide Richtungen, ab 4 Zeichen), und bei Denkhilfen zusätzlich, wenn eine
  Antwortoption wörtlich genannt wird (`miniNenntOption`, `src/spiel/mini.js:175`, Wortgrenzen-Regex).
* Der Test `tests/spiel-mini-hilfe.test.js:125-151` prüft das über **alle 92 Minis × bis zu 3 Sprossen**:
  kein Treffer des Lösungstextes, keine wörtliche Option, Ausschnitte müssen aus der Aufgabe stammen,
  höchstens zwei Sprossen je Frage. Ergänzend `tests/spiel-mini-denktexte.test.js:67` für die 25
  fragebezogenen Texte.

**Behauptung: Für Modelltext gilt dieselbe Prüfung — sie muss nur *nach* dem Modell laufen.**
*Vorschlag (Prüfkette, alles deterministisch und ohne Modell testbar):*
1. **Eingangskontrolle (Prompt-Bau):** Der Prompt enthält nur Felder einer **Whitelist** (Abschnitt 1).
   `Spiel.mini.loesungText`, `m.richtig`, `def.loesung`, `abnahme.ergebnisse`, `Spiel.INJEKTOREN`-Ursachen
   und `Sim.GRUENDE[...].titel` für Mini-Tickets sind **gesperrt** — durch Code, nicht durch Bitte im Prompt.
2. **Nachfilter (Pflicht, fail-closed):** Jeder Modelltext läuft durch dieselbe Funktion
   `miniOhneLoesung(...)`. Fällt er durch, wird er **verworfen** und die Tabellenzeile gezeigt. Kein
   „Notausgang", kein Log-only.
3. **Verbotene Muster (eng):** Der Modelltext darf den Lösungstext nicht enthalten, keine Option wörtlich
   nennen und nicht mit `Lösung`, `richtig ist`, `die Antwort lautet` beginnen. Ein breiteres Muster wäre
   schädlich: „255.255.255.0" ist in einer Erklärung legitim und in einer anderen die Lösung.
4. **Formgrenzen:** höchstens N Zeichen (Vorschlag: 400), kein Markdown-Codeblock mit vollständiger
   Konfigurationszeile, keine Befehlsfolge, die den Auftrag abschließt (Vergleich gegen `def.loesung`).
5. **Sprossen-Zwang:** Der Tutor ersetzt keine Sprosse. Er erscheint **nur**, wenn
   `Spiel.stufe.wannPasst("miniHilfe", {fehler})` ja sagt und der Vorrat es hergibt — sonst bleibt es bei
   der Tabelle. Damit gilt die Stufenregel (§ 2) unverändert.
6. **Gegenprobe mit Attrappen (der eigentliche Test):** Ein Testmodell, das absichtlich
   (a) den Lösungstext, (b) eine Option, (c) eine Paraphrase, (d) eine leere Antwort und (e) eine
   Prompt-Injektion aus der Aufgabe zurückgibt, muss in (a), (b) und (d) **abgefangen** werden. Läuft ohne
   Netz, weil das Modell durch eine Attrappe ersetzt wird.

**Restrisiko — ehrlich:** Die Kette garantiert die **wörtliche** Lösung (Fall a/b), nicht die
**umschriebene**: „Zwei Geräte tragen dieselbe Nummer" besteht jede Textprüfung und ist trotzdem die
Antwort auf `mini-ip-2` („Zwei Geräte haben dieselbe IP-Adresse"). Dagegen hilft kein Filter, nur die
Einsatzregel: **kein Modelltext dort, wo die Lösung ein einzelner Fakt ist** (B4). Im Terminal ist die Lage
anders: Dort ist der *richtige Befehl* erlaubt (der Katalog zeigt ihn als `muster`/`beispiel`) — das
Lösungsverbot der Minis gilt dort gar nicht, sondern nur „nicht die Aufgabe abnehmen".

## 5 · Der Offline-Bruch — zwei Varianten

**Gemessen:** `docs/index.html` und `Netzwerk-Labor.html` haben **0 Außenverweise** und 14 eingebettete
Schriften; `tools/einfach.py` prüft das bei jedem Bau („beide byte-gleich, 0 Außenverweise"). Das Spiel
läuft ohne Netz vollständig — das ist eine Zusage, kein Zufall.

### Variante A — Tutor nur mit Netz, sonst Tabelle (empfohlen)
* **Standard aus.** Ein Schalter im Bildungsstand-/Einstellungsbereich („Erklärungen von einem Modell
  formulieren lassen"), zusätzlich ein Schalter für den Bildungsträger.
* **Ein Aufruf, ein Fall:** Der Tutor bekommt genau einen Auftrag (den aktuellen Fehler), keine Sitzung,
  keinen Verlauf. Die Antwort wird **nicht** gespeichert (kein Cache mit Personenbezug, kein Verlauf).
* **Fail-closed:** Kein Netz, Zeitüberschreitung, Fehlercode, leerer Text, Filter-Treffer → die
  Tabellenzeile erscheint. **Kein** Ladezustand, der die Hilfe blockiert; die Tabelle hat Vorrang.
* **Determinismus bleibt erhalten:** Der *Spielzustand* ändert sich nie durch den Tutor (er schreibt nur
  Text, kein `Spiel.*`-Feld). `node tools/sim-stand.js` bleibt unverändert; Testläufe setzen den Tutor ab
  (`Spiel._trocken` hat bereits ein Muster für genau das).
* **Testbar ohne Netz:** Ein `TutorAttrappe` wie `CLI.simAttrappe` (`src/cli/parser.js:105`): Tests
  ersetzen den Dienst durch eine Attrappe und prüfen (i) Rückfall bei Fehler, (ii) Filterkette,
  (iii) „kein Schreiben in den Spielstand".
* **Kosten:** ein Aufruf je *gezeigter* Hilfe, nicht je Zeile — der Tutor läuft nur, wenn der Lernende
  Hilfe anfordert bzw. ein Fehler erkannt wird, und höchstens einmal je Fehler (Entprellung, wie
  `Spiel.SENIOR_NACH_MS`).

### Variante B — Modell lokal auf dem Rechner
* **Nicht gemessen — hier nicht prüfbar** (kein Modell im Repo, kein Netzzugriff in dieser Sitzung).
* Auf dem Papier plausibel: die Aufgabe ist winzig (199 Token Eingabe, ~100–200 Token Ausgabe). Ein
  quantisiertes Modell mit 1–3 Mrd. Parametern könnte das auf einer modernen CPU in Sekunden erledigen —
  **das ist eine Annahme, kein Messwert.**
* Was dagegen spricht, heute darauf zu bauen: (a) die Zielhardware des Bildungsträgers ist unbekannt
  (vermutlich Büro-PCs ohne GPU, teils Tablets im Browser), (b) ein Modellgewicht von mehreren hundert MB
  bis einigen GB passt nicht zur 2,5-MB-Einzeltdatei und zum „läuft ohne Installation"-Versprechen, (c) im
  Browser (WebGPU/WASM) ist die Latenz auf schwacher Hardware unklar.
* **Ehrliche Empfehlung:** Variante B heute **nicht** einplanen. Wenn überhaupt, als zweiter Schritt mit
  genau einer geplanten Testreihe auf der echten Zielhardware.

## 6 · Datenschutz und Minderjährige

**Gemessen — was überhaupt im Spieltext steht:**
* Gerätenamen sind Rollen: `Modell.NAMEN` = `{pc:"PC", server:"Server", switch:"Switch", router:"Router",
  firewall:"Firewall", internet:"Internet", nas:"NAS"}`, dazu vom Spiel erzeugte Hostnamen (R1, SW1, …).
* Kunden sind **erfundene Betriebe**: `DATEN.kunden` hat 7 Einträge (`salon`, `baeckerei`, `schreibbuero`,
  `praxis`, `autohaus`, `mittelstand`, `storage`), Anzeigename z. B. „Salon Lockenwerk".
* Adressen sind Laboradressen (10.0.0.x, 192.168.x.x); `whoami` liefert die feste Zeichenkette
  `labor\azubi`.
* **Ergebnis: kein Personenbezug im Spieltext.** Keine Klarnamen, keine echten Adressen, keine Kennungen.

**Der eine reale Pfad:** Die **selbst getippte Zeile** geht mit (sie ist Teil des Fehlerkontexts). Dort
kann ein Mensch alles eintragen — auch einen echten Namen in `description …` oder in einer Antwort. Das ist
die einzige Stelle, an der personenbezogene Daten das Gerät verlassen könnten, und sie ist nicht
vorhersehbar.
*Risiko (Bildungsträger, Minderjährige):* Ohne Auftragsverarbeitungsvertrag und Rechtsgrundlage ist der
Versand auch *möglicher* Personenbezugs ein Risiko, zusätzlich zur Frage der Einwilligungsfähigkeit
Minderjähriger. Das ist eine Entscheidung des Trägers, nicht des Spiels.
*Vorschlag:* (1) Tutor standardmäßig **aus**; (2) Schalter nur für volljährige bzw. freigegebene Konten —
oder besser: **nur für den Konsolenfehler**, wo die Zeile ein Befehl ist; (3) Einverständniserklärung mit
genau diesen Sätzen: *„Wenn du den Modell-Tutor einschaltest, wird die Zeile, die du gerade getippt hast,
samt der Fehlermeldung und einigen Angaben aus dem Spiel an einen externen Dienst gesendet. Es werden
keine Namen, keine Standortdaten und keine Gerätekennungen deines Rechners gesendet. Der Tutor ist freiwillig
und jederzeit abschaltbar; ohne ihn funktioniert alles unverändert."* (4) Sichtbarer Hinweis im Tutor-Text
selbst; (5) keine Speicherung der Antwort, kein Verlauf.

## 7 · Kosten und Ausfall (Annahmen ausdrücklich gekennzeichnet)

* **Volumen, gemessen:** ~199 Token Eingabe + ~150 Token Ausgabe ≈ **350 Token je Hilfe**.
  100 Hilfen am Tag ≈ 35 000 Token ≈ 0,035 Mio. Token; für eine Klasse mit 30 Lernenden und je 20 Hilfen
  am Tag ≈ 210 000 Token ≈ 0,21 Mio. Token.
* **Preis: nicht gemessen** (in dieser Sitzung ohne Netzzugriff, keine Preisliste geprüft). Bei einem
  üblichen Preismodell in der Größenordnung weniger Cent je Million Token liegt der Betrag pro Klasse und
  Tag in der Größenordnung **unter einem Cent bis wenige Cent** — die Größenordnung hängt fast nur am
  Anbieterpreis, nicht am Kontext (Abschnitt 1).
* **Ausfall:** keine Wirkung auf das Spiel, solange B2 gilt — die Tabelle antwortet weiter. Der einzige
  sichtbare Unterschied: der Erklärungstext ist der bekannte Katalogtext. Das ist der Grund, warum der
  Rückfall **nicht** optional sein darf.
* **Grenzen:** Der Tutor ersetzt keine Bewertung, keine Abnahme, kein Speichern, kein Postfach — er liefert
  Text. Alles andere bleibt deterministisch und damit prüfbar.

## 8 · Empfehlung: kleinster sinnvoller Schritt

Wenn gebaut wird, dann **in dieser Reihenfolge** (jeder Schritt einzeln abnehmbar):
1. **Kontextsammler** (rein, deterministisch, ohne Netz): baut aus `{netz, id, modus, eingabe, ausgabe}` +
   `inst` + `L` den 696-Zeichen-Block. Testbar gegen feste Fälle, kein Modell beteiligt.
2. **Prüfkette** (`miniOhneLoesung` + Muster + Formgrenzen) mit Attrappen-Test (Abschnitt 4.6). Auch ohne
   Modell vollständig prüfbar — das ist der eigentliche Wert.
3. **Tutor-Attrappe + Rückfall**: Der Tutor ist eine Schnittstelle mit Attrappe; der Rückfall auf die
   Tabelle wird getestet, **bevor** ein echter Dienst angeschlossen wird.
4. Erst danach: echter Dienst, Schalter, Einverständniserklärung — als Zugabe, nicht als Grundlage.

**Wann die Antwort „lohnt nicht" lautet:** wenn (a) der Träger den Versand nicht freigibt, (b) keine
Rechtsgrundlage für Minderjährige hergestellt werden kann, oder (c) das Offline-Versprechen nicht erhalten
bleibt (Tutor als Pflichtweg). In allen drei Fällen bleibt es bei der Tabelle — und die drei Fälle aus
Abschnitt 3 bleiben dann offen; sie sind auch **ohne** Modell lösbar (fragebezogene Denkhilfen für die 67
Minis, Gerätefakten für den Konsolenfehler), nur langsamer zu pflegen.

## Was ich **nicht** geprüft habe

* Kein Modell aufgerufen, keinen Anbieter kontaktiert, keine Preise geprüft (Auftrag: keine Netzaufrufe).
* Die Token-Zahl ist aus Zeichen geschätzt (3,5 Zeichen/Token), nicht mit einem Tokenizer gemessen.
* Variante B (lokales Modell) ist **nicht gemessen**: keine Laufzeit-, Speicher- oder Latenzmessung, und
  die Zielhardware des Bildungsträgers ist unbekannt.
* Die Filterkette ist **entworfen**, nicht implementiert und nicht gegen ein echtes Modell erprobt. Gemessen
  ist nur die *heutige* Kette (`src/spiel/mini.js:180-191`) samt Test über alle 92 Minis.
* Nicht geprüft: rechtliche Bewertung (DSGVO-Einwilligung Minderjähriger) — das ist eine Aufgabe des
  Trägers, hier steht nur, welche Sätze in einer Erklärung vorkommen müssten.
