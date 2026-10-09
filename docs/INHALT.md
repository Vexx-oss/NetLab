# 📚 Die Notizen dieses Projekts

Diese Übersicht sammelt, was **nicht** Quelltext ist: Verträge, Pläne, Befunde, Konzepte und
den Verlauf. Der Einstieg ins Projekt steht in [`../README.md`](../README.md), die
Betriebsregeln für Mitarbeit und Modelle in [`../AGENTS.md`](../AGENTS.md).

> **Seit 07.10.2026 veröffentlicht.** Bis Fassung 1.2.3 landeten auf GitHub Pages nur
> `docs/index.html` und `docs/bilder/`. Jetzt stellt `.github/workflows/seite.yml` zusätzlich
> die Doku als **durchsuchbare Seite** unter `/doku/` dazu: `tools/seite.py` wandelt die
> Markdown-Dateien dieses Verzeichnisses samt `README.md` und `AGENTS.md` in HTML um
> (`tools/md.py`, nur Python-Standardbibliothek — die CI hat keine Zusatzpakete).
> Das Erzeugnis liegt in `docs/doku/` und ist versioniert, wie `docs/index.html` es auch ist.
> Wer eine Notiz hinzufügt, trägt sie hier ein und lässt `python tools/seite.py --pruefen`
> laufen; der Bau prüft, dass keine Datei fehlt und kein `[[…]]`-Verweis offen bleibt.

## Was gilt (verbindlich)

| Datei | Wofür |
|---|---|
| [`Architektur.md`](Architektur.md) | Der Vertrag zwischen den Bausteinen: Datenformen, Verhalten, Gründe, Trace-Format. Änderungen an Datenformen stehen **zuerst** hier. |
| [`Bauen.md`](Bauen.md) | Bauen, Testen, Messen, Ausliefern im Detail — inklusive der gemessenen Fallen (d8, `</head>`, `screenOrientation`, MIME-Typ der Schriften). |
| [`SITZUNGSABSCHLUSS.md`](SITZUNGSABSCHLUSS.md) | Die acht Schritte am Ende einer Sitzung: aufräumen, Fassung ziehen, prüfen, bauen, Stand nachziehen, committen, veröffentlichen, nachmessen — mit den Regeln, die aus Fehlern stammen. |
| [`Mitmachen.md`](Mitmachen.md) | Arbeitsweise und Regeln für Beiträge. |
| [`Liesmich.md`](Liesmich.md) | Übersicht für Leser: was das Spiel ist, wie man es startet, was es kann. |

## Was geschehen ist (Verlauf)

| Datei | Wofür |
|---|---|
| [`CHANGELOG.md`](CHANGELOG.md) | Was sich wann geändert hat — aus der echten Commit-Historie abgeleitet, nicht aus Erinnerung. |

## Entwicklung: Pläne, Befunde, Konzepte

| Datei | Wofür |
|---|---|
| [`entwicklung/Design – Spielspaß 2.0.md`](<entwicklung/Design – Spielspaß 2.0.md>) | Die große Design-Notiz: Befunde, Hebel, Messwerte, verworfene Versuche — je Runde ein Abschnitt. |
| [`entwicklung/Plan – Ausbau 1.2.md`](<entwicklung/Plan – Ausbau 1.2.md>) | Phasen, Stand und Messwerte des Ausbaus 1.2. |
| [`entwicklung/Konzept – Netzwerk-Labor.md`](<entwicklung/Konzept – Netzwerk-Labor.md>) | Die Spezifikation des Spiels. |
| [`entwicklung/Konzept – Lernplattform für Betriebe und Schulen.md`](<entwicklung/Konzept – Lernplattform für Betriebe und Schulen.md>) | Konzept für den Einsatz im Unterricht und in der Ausbildung. |
| [`entwicklung/Befund – Programm startet wieder.md`](<entwicklung/Befund – Programm startet wieder.md>) | Der Befund zum Integritätslabel, das die `.exe` blockierte — samt Reparaturweg. |
| [`entwicklung/Klassenraum – Umsetzungsreife Spezifikation.md`](<entwicklung/Klassenraum – Umsetzungsreife Spezifikation.md>) | Vertrag für die nächste Stufe: die Lehrkraft sagt einen Code an, jedes Gerät baut denselben Auftrag — **noch nicht umgesetzt** (Fassung 1.2.3). |
| [`entwicklung/Klassenraum/`](entwicklung/Klassenraum/Liesmich.md) | Die vier Teil-Dokumente zu diesem Vertrag (A Codec/Determinismus · B Oberfläche/Ablauf · C Rust/Live/QR · D Prüfung/Abnahme) mit allen Messprotokollen. |
| [`entwicklung/Opus-Auftrag – Netzwerk-Labor.md`](<entwicklung/Opus-Auftrag – Netzwerk-Labor.md>) | Der ursprüngliche Auftrag, aus dem das Projekt entstand. |

## Entwicklung: die Hilfestellung und ihre Gegenprüfung (07.10.2026)

| Datei | Wofür |
|---|---|
| [`entwicklung/Hilfestellung – Stufen und Schnittstellen.md`](<entwicklung/Hilfestellung – Stufen und Schnittstellen.md>) | **Der Vertrag** der Hilfestellung: vier Bildungsstufen, Hilfekonto je Ticket, Datenformen `DATEN.hilfen`/`DATEN.trainings`, Schreibrechte je Baustein, Abnahmekriterien. Gespiegelt in [`Architektur.md`](Architektur.md) § 13. |
| [`entwicklung/Review – Lernwirkung.md`](<entwicklung/Review – Lernwirkung.md>) | Führt die Hilfe zum Lernen? Der wichtigste Bericht: zwei P1 (Vorrat ohne Zahlkraft, fehlende Lernverbuchung je Fertigkeit), und was gut ist. Mit Selbstkorrekturen des Prüfers. |
| [`entwicklung/Review – Auffindbarkeit.md`](<entwicklung/Review – Auffindbarkeit.md>) | Findet ein Azubi die Hilfe? Gemessen an einer DOM-Attrappe: Stufenwahl hinter dem Startknopf, vier Bedeutungen von „Stufe", 1 279 Zeichen Textwand, unerreichbarer Leisten-Knopf. |
| [`entwicklung/Review – Wartbarkeit.md`](<entwicklung/Review – Wartbarkeit.md>) | Doppelte Wahrheiten, Kopplung, defensive Rückfälle (17 „ist Baustein A da?"-Prüfungen: 11 nötig, 6 entfernbar), Testabdeckung. |
| [`entwicklung/Review – Testqualität.md`](<entwicklung/Review – Testqualität.md>) | Die **Mutationsprobe**: künstlich eingebaute Fehler, und wie viele Tests sie fangen. Fünf Mutanten gemessen, alle erkannt; dazu die Lücke in „Wirkung vor Grün". |
| [`entwicklung/Review – Betrieb.md`](<entwicklung/Review – Betrieb.md>) | Spielstand-Migration v:2 → v:3 in elf Punkten, Byte-Gleichheit der Erzeugnisse, und warum die Fassung gezogen werden musste. |
| [`entwicklung/Review – Betrieb-Werkzeuge.md`](<entwicklung/Review – Betrieb-Werkzeuge.md>) | Die Prüfwerkzeuge selbst: welches misst was, und der Befund, dass der Rauchtest eine feste Ansichtsliste führte — die neue Ansicht fehlte darin. |
| [`entwicklung/Design – Spielspaß 2.0.md`](<entwicklung/Design – Spielspaß 2.0.md>) § 31–§ 35 | Der Bau der Hilfestellung, die Auslieferung 1.2.4, (in § 33) das **2.0-Fundament**, (in § 34) der **Klassenraum-Öffnungsweg** und (in § 35) die **Output-Runde** — inklusive dem, was bewusst **nicht** gebaut und was **verworfen** wurde. |

## Fahrplan 1.3 / 2.0 — Entscheidungsvorlage (09.10.2026)

Fünf unabhängige Prüfer haben je einen Entwurf geschrieben (1 454 Zeilen). Sie sind die Vorlage für die
Bauten der Sitzung vom 09.10.2026 geworden: der Fahrplan bleibt der Einstieg, die fünf Entwürfe sind die
Belege — und der Stand dessen, was daraus gebaut wurde, steht im
[jüngsten Übergabezettel](<entwicklung/Übergabe – Stand 2.0-Fundament.md>).

| Datei | Wofür |
|---|---|
| [`entwicklung/Übergabe – Stand 09.10.2026.md`](<entwicklung/Übergabe – Stand 09.10.2026.md>) | Die **Vorgängerfassung** des Übergabezettels: der Stand der Entscheidungsvorlage, als noch nichts gebaut war. Bewusst kurz: wo wir standen, was galt, welche drei Fehler im Code standen. Jüngster Stand ist [Übergabe – Stand 2.0-Fundament](<entwicklung/Übergabe – Stand 2.0-Fundament.md>). |
| [`entwicklung/Fahrplan – 1.3 und 2.0.md`](<entwicklung/Fahrplan – 1.3 und 2.0.md>) | **Hier anfangen.** Was die fünf Prüfer fanden, wo sie sich widersprechen, was keiner abdeckt, die empfohlene Reihenfolge (Übergabe → Karriere-Filter → 67 Denkhilfen → …) und die acht Entscheidungen, die nur der Nutzer treffen kann. |
| [`entwicklung/Entwurf – Klassenraum-Umsetzung.md`](<entwicklung/Entwurf – Klassenraum-Umsetzung.md>) | Die 286-KB-Spezifikation gegen den heutigen Code gemessen: was vorhanden ist, was fehlt, die 40 Testfälle, sechs Widersprüche. **Aufwand ehrlich nach oben korrigiert: 8–11,5 Sitzungen statt 4,5–5,5.** |
| [`entwicklung/Entwurf – Gegenprüfung und Lehrersicht.md`](<entwicklung/Entwurf – Gegenprüfung und Lehrersicht.md>) | Der fünfte Blickwinkel: die 90 Minuten einer Unterrichtsstunde Minute für Minute, drei belegte Abbruchstellen — und die zwei gefundenen Fehler, die in **keinem** anderen Entwurf stehen. |
| [`entwicklung/Entwurf – Mitnehmbarer Lernstand.md`](<entwicklung/Entwurf – Mitnehmbarer Lernstand.md>) | Was ein Code tragen kann: gemessene Nutzlastgrößen, warum es **zwei** Codes braucht, und die Falle in `fremd/lernmotor.js:39`. |
| [`entwicklung/Entwurf – Tutor auf Sprachmodell.md`](<entwicklung/Entwurf – Tutor auf Sprachmodell.md>) | Machbarkeit und **Risiko** eines Sprachmodells als Tutor: Urteil „lohnt unter Bedingungen", die Prüfkette gegen das Lösungsverbot, Offline-Bruch, Datenschutz. |
| [`entwicklung/Entwurf – Inhaltslücken.md`](<entwicklung/Entwurf – Inhaltslücken.md>) | Was der Stoff nicht hergibt: 67 Minis ohne Denkanstoß, 10 Fertigkeiten ohne Hilfe-Vorschlag, IPv6 = 0 Treffer, drei gesperrte Trainingskarten. |

## Das 2.0-Fundament — gebaut, Fassung 2.0.0 (09.10.2026)

Was der Fahrplan als Entscheidungsvorlage beschrieb, ist in dieser Sitzung gebaut worden: Übergabe und
Ergebnis kopieren, die eine Umleitung für Klassenraum-Aufträge, Auftrags-Determinismus, der ehrliche
Hilfevorrat, die geöffneten Trainingskarten, die Denkhilfen, Hilfe-Vorschläge der mittleren Ebene, Wiki
mit IPv6 und WLAN, die Wache gegen die Lernmotor-Falle — dazu drei Nachträge aus dem laufenden Auftrag:
**keine schnelle Wiederholung**, der **sichtbare nächste Schritt** und der **Fragen-Generator**. Die
Fassung wurde auf **2.0.0** gezogen und gebaut — inzwischen steht sie auf **2.0.1** (Veröffentlichung des
heutigen Standes, CHANGELOG-Abschnitt 2.0.1): **`v2.0.0` ist veröffentlicht**, `v2.0.1` folgt mit Freigabe. Die gemessenen Zahlen stehen im [CHANGELOG](CHANGELOG.md) § 2.0.0, die Begründungen und die
verworfenen Versuche im [Design](<entwicklung/Design – Spielspaß 2.0.md>) § 33.

Die **zweite Hälfte derselben Fassung** ist der **Öffnungsweg (Klassenraum Stufe A+B)**: der Auftragscode,
die zwei Ansichten für Lehrkraft und Azubi, die Startseiten-Zeile und der Ergebnis-Code als Toast — **ohne
Bewertung, ohne Server, ohne QR**; die Stufen C und D kommen später. Bauweg und verworfene Versuche stehen
im [Design](<entwicklung/Design – Spielspaß 2.0.md>) § 34.

Die **dritte Runde** derselben Fassung ist die **Output-Runde**: Trefferflächen ≥ 44 px, die Altlasten der
Regeln R1–R10 und die Regel **R12**, die bisher **nichts** gemessen hat — sieben Ströme, sieben
Gegenproben, ein belegter R8-Fund („gelöscht statt verschoben"). Bauweg, verworfene Versuche und die
Messpunkte stehen im [Design](<entwicklung/Design – Spielspaß 2.0.md>) § 35.

| Datei | Wofür |
|---|---|
| [`entwicklung/Übergabe – Stand 2.0-Fundament.md`](<entwicklung/Übergabe – Stand 2.0-Fundament.md>) | **Für den Neustart.** Der jüngste Übergabezettel, bewusst kurz: was diese Sitzung gebaut hat, welche vier Regeln jetzt gelten, was als Nächstes zu tun ist. Ein neuer Lauf liest zuerst diese Datei. |
| [`entwicklung/Befund – Lernmotor-Falle.md`](<entwicklung/Befund – Lernmotor-Falle.md>) | Die Falle in `fremd/lernmotor.js` mit Datei:Zeile — was auf unserer Seite behoben ist, was nur in der FISI-Spielhalle behoben werden kann, samt Änderungsvorschlag. Vorlage für den Nutzer, nicht ausgeführt. |
| [`entwicklung/Review – 2.0-Fundament.md`](<entwicklung/Review – 2.0-Fundament.md>) | Die **unabhängige Gegenprüfung** des Fundaments: jede Behauptung der Teammates mit eigenem Befehl oder Zitat nachgemessen, mit Restzweifeln und dem, was nicht geprüft werden konnte. |
| [`entwicklung/Review – Klassenraum A+B.md`](<entwicklung/Review – Klassenraum A+B.md>) | Die **unabhängige Gegenprüfung** der Klassenraum-Stufen A und B (Codec, Öffnungsweg, die zwei Ansichten) mit eigenen Messungen — und ausdrücklich dem, was **nicht** geprüft werden konnte. |
| [`entwicklung/Befund – Output-Runde.md`](<entwicklung/Befund – Output-Runde.md>) | Die **unabhängige Messung der Output-Runde**: Vorher-Stand der 14 CSS-Dateien (Bytes, Zeilen, CRLF, SHA256), Regeln vorher/nachher, **sieben Gegenproben** — und der **R8-Fund** samt dem einen benannten Verlust, dazu sieben widerlegte Annahmen. |
| [`entwicklung/Befund – 27 von 27.md`](<entwicklung/Befund – 27 von 27.md>) | Die Frage, ob **jede** der 27 Fertigkeiten als Klassenraum-Auftrag lösbar ist — in vier Messungen belegt, mit der Tabelle aller 27 und fünf Befunden zum Drumherum. |

## Ausblick: 3.0 und der Betrieb (09.10.2026)

Was nach der ausgelieferten 2.0 kommt — als Plan, nicht als Wunschzettel.

| Datei | Wofür |
|---|---|
| [`entwicklung/Konzept – 3.0.md`](<entwicklung/Konzept – 3.0.md>) | **Der Plan für die nächste Fassung.** Fünf Säulen — **Unterricht mit 20 Azubis**, **Inhalte, die nicht ausgehen**, **Stufe C/D ehrlich eingeordnet**, **technische Schulden**, **Diagnose ohne Bewertung** —, jede mit Aufwand, Risiko und einem **messbaren** Fertig-Kriterium; **Aufwandsspanne 11–20 Sitzungen** (davon 4,5–6,5 unverzichtbar) und ein Abschnitt „was ausdrücklich **nicht** in 3.0 gehört". |
| [`entwicklung/Markt – Monetarisierung.md`](<entwicklung/Markt – Monetarisierung.md>) | Der ehrliche Marktteil: **20 Quellen gelistet, 13 abgerufen, 7 mit belastbaren Zahlen** (BIBB, Westermann BiBox, MoodleCloud, § 5 DDG, § 19 UStG) und **9 Wettbewerber** mit URL und Preismodell; Preisvorschlag **Standortlizenz 390 €/Jahr** (ausdrücklich als **Setzung** markiert) — und der wichtigste Abschnitt: **„was NICHT funktionieren wird"**, darunter, dass ein Server-/Abo-Modell den Kern „kein Server, kein Konto" zerstört. |
| [`entwicklung/Bilanz – Agententeam 2.0.md`](<entwicklung/Bilanz – Agententeam 2.0.md>) | Die **Erfolgsquote des Agententeams**, ehrlich gerechnet: streng **87,8 %** der Aufgaben und **66,7 %** der Zusagen halten der Nachmessung stand (mit Belegen 91,8 % und 88,9 %); **neun Ausfälle namentlich**. |
## Wie dieses Verzeichnis aufgeräumt wurde

Bis zum 06.10.2026 lagen zwölf Notizen im Wurzelverzeichnis; ein Besucher sah sie vor dem
Quelltext. Auf Wunsch wurden sie hierher gezogen — **mit** `git mv`, damit die
Versionsgeschichte jeder Datei erhalten bleibt, und mit angepassten Verweisen
(`tools/repo-aufraeumen.py`, `tools/repo-verweise-flicken.py`; der zweite Lauf prüft
**jeden** relativen Verweis in **jeder** Markdown-Datei gegen die Wirklichkeit).

Im Wurzelverzeichnis bleiben nur, was man dort erwartet: `README.md`, `CHANGELOG.md`
(Konvention auf GitHub), `LICENSE`, `LIZENZ.md`, `AGENTS.md`, `.gitignore`,
`.gitattributes`, `index.html` (Weiterleitung für Pages), die Baueingänge `bauen.py` und
`schriften.css` sowie die Ordner `src/`, `tests/`, `tools/`, `android/`, `shell/`,
`schriften/`, `Vorlagen/`, `Programm/`, `fremd/` und `docs/`.
