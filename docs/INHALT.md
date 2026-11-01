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
| [`Liesmich.md`](Liesmich.md) | Übersicht für Leser: was das Spiel ist, wie man es startet, was es kann (Stand 2.9.0). |

## Unterricht: erste Stunde und erster Einstieg

| Datei | Wofür |
|---|---|
| [`Lehrkraft – Erste Stunde.md`](<Lehrkraft – Erste Stunde.md>) | Ablauf der ersten Unterrichtsstunde mit dem Klassenraum: vorbereiten, Code ansagen, Arbeitsphase, Auswertung — mit ehrlichen Grenzen (Server/QR 3.1, Schulnetz nicht geprüft). |
| [`Schueler – Erste fünf Minuten.md`](<Schueler – Erste fünf Minuten.md>) | Kurzblatt für Azubis: öffnen, ersten Auftrag annehmen, Klassenraum-Code, Hilfe und Abgabe. |

## Was geschehen ist (Verlauf)

| Datei | Wofür |
|---|---|
| [`CHANGELOG.md`](CHANGELOG.md) | Was sich wann geändert hat — aus der echten Commit-Historie abgeleitet, nicht aus Erinnerung. |

## Entwicklung: Pläne, Befunde, Konzepte

| Datei | Wofür |
|---|---|
| [`entwicklung/Design – Spielspaß 2.0.md`](<entwicklung/Design – Spielspaß 2.0.md>) | Die große Design-Notiz: Befunde, Hebel, Messwerte, verworfene Versuche — je Runde ein Abschnitt. |
| [`entwicklung/Plan – Ausbau 1.2.md`](<entwicklung/Plan – Ausbau 1.2.md>) | Phasen, Stand und Messwerte des Ausbaus 1.2. |
| [`superpowers/plans/2026-11-01-variante-b-onboarding-analyse-begleiter.md`](<superpowers/plans/2026-11-01-variante-b-onboarding-analyse-begleiter.md>) | Der freigegebene Plan für 3.1.0 „Variante B“: Onboarding, Analyse-Begleiter, Labor-UX, Layout, QC-Gates — Entscheidungen, Dateien, Aufgaben, Abnahmekriterien. |
| [`entwicklung/Konzept – Netzwerk-Labor.md`](<entwicklung/Konzept – Netzwerk-Labor.md>) | Die Spezifikation des Spiels. |
| [`entwicklung/Konzept – Lernplattform für Betriebe und Schulen.md`](<entwicklung/Konzept – Lernplattform für Betriebe und Schulen.md>) | Konzept für den Einsatz im Unterricht und in der Ausbildung. |
| [`entwicklung/Befund – Programm startet wieder.md`](<entwicklung/Befund – Programm startet wieder.md>) | Der Befund zum Integritätslabel, das die `.exe` blockierte — samt Reparaturweg. |
| [`entwicklung/Klassenraum – Umsetzungsreife Spezifikation.md`](<entwicklung/Klassenraum – Umsetzungsreife Spezifikation.md>) | Vertrag für die Lehrkraft-Funktion: die Lehrkraft sagt einen Code an, jedes Gerät baut denselben Auftrag — **Stufen A+B seit 2.0.0 gebaut; Server/QR (C/D) sind 3.1 und im Produkt nicht gebaut** (Stand 2.9.0). |
| [`entwicklung/Klassenraum/`](entwicklung/Klassenraum/Liesmich.md) | Der Ordner des Vertrags mit vier umsetzungsreifen Teil-Dokumenten und allen Messprotokollen. |
| [`entwicklung/Klassenraum/A – Codec und Determinismus.md`](<entwicklung/Klassenraum/A – Codec und Determinismus.md>) | Bereich A: Format, Bit-Budget, Prüfsumme, Kanonisierung, Ergebniscode und API — umsetzungsreif; alles Zahlengestützte ist in Messprotokollen belegt. |
| [`entwicklung/Klassenraum/B – Oberfläche und Ablauf.md`](<entwicklung/Klassenraum/B – Oberfläche und Ablauf.md>) | Bereich B: verbindliche Festlegung für Ansichten, DOM, Klassennamen, Texte und Startseiten-Eingabe. |
| [`entwicklung/Klassenraum/C – Rust, Live und QR.md`](<entwicklung/Klassenraum/C – Rust, Live und QR.md>) | Bereich C: Live-Server C1/C2 und QR-Encoder — Datei:Zeile-genau, gebaut und gemessen; der Einbau in die `.exe` ist eine Anleitung. |
| [`entwicklung/Klassenraum/D – Prüfung, Abnahme und Reihenfolge.md`](<entwicklung/Klassenraum/D – Prüfung, Abnahme und Reihenfolge.md>) | Bereich D: Testplan, Abnahmebefehle mit Sollzahlen, Vorführdrehbuch, Risiken, Reihenfolge und Definition of Done. |
| [`entwicklung/Opus-Auftrag – Netzwerk-Labor.md`](<entwicklung/Opus-Auftrag – Netzwerk-Labor.md>) | Der ursprüngliche Auftrag, aus dem das Projekt entstand. |

## Entwicklung: Stil, Terminologie, Themes

| Datei | Wofür |
|---|---|
| [`entwicklung/Stilfaden – Auftragstexte.md`](<entwicklung/Stilfaden – Auftragstexte.md>) | Der Stilfaden für Auftragstexte (09.10.2026): was an Symptom- und Titeltexten gemessen schlecht war und welche Regeln jetzt gelten. |
| [`entwicklung/Terminologie.md`](<entwicklung/Terminologie.md>) | Vier Achsen und eine Sprosse: was „Stufe" im Programm je Bildschirm bedeutet — mit Datenfeld, Wertebereich, Quelle und Beispiel. |
| [`entwicklung/Themes-Vertrag.md`](<entwicklung/Themes-Vertrag.md>) | Der Vertrag der fünf Zusatz-Themes (2.3.1): eine eigene Stildatei je Theme, Tokens im Block `:root[data-theme="<id>"]`, Einbindung über den Bau. |

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
[Übergabezettel des 2.0-Fundaments](<entwicklung/Übergabe – Stand 2.0-Fundament.md>); der jüngste
Übergabezettel ist [Runde 8](<entwicklung/Übergabe – Stand 31.10.2026 – Runde 8.md>).

| Datei | Wofür |
|---|---|
| [`entwicklung/Übergabe – Stand 09.10.2026.md`](<entwicklung/Übergabe – Stand 09.10.2026.md>) | Die **Vorgängerfassung** des Übergabezettels: der Stand der Entscheidungsvorlage, als noch nichts gebaut war. Bewusst kurz: wo wir standen, was galt, welche drei Fehler im Code standen. Jüngster Stand ist [Übergabe – Runde 8](<entwicklung/Übergabe – Stand 31.10.2026 – Runde 8.md>). |
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
heutigen Standes, CHANGELOG-Abschnitt 2.0.1): Die Tags `v2.0.0`–`v2.0.5` existieren (gemessen 26.10.2026 mit `git tag --list`); ob der Release `v2.0.5` online steht, ist in dieser Sitzung **nicht geprüft**. Die gemessenen Zahlen stehen im [CHANGELOG](CHANGELOG.md) § 2.0.0, die Begründungen und die
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
| [`entwicklung/Übergabe – Stand 2.0-Fundament.md`](<entwicklung/Übergabe – Stand 2.0-Fundament.md>) | **Für den Neustart.** Der Übergabezettel des 2.0-Fundaments, bewusst kurz: was diese Sitzung gebaut hat, welche vier Regeln jetzt gelten, was als Nächstes zu tun ist. Ein neuer Lauf liest zuerst diese Datei. |
| [`entwicklung/Befund – Lernmotor-Falle.md`](<entwicklung/Befund – Lernmotor-Falle.md>) | Die Falle in `fremd/lernmotor.js` mit Datei:Zeile — was auf unserer Seite behoben ist, was nur in der FISI-Spielhalle behoben werden kann, samt Änderungsvorschlag. Vorlage für den Nutzer, nicht ausgeführt. |
| [`entwicklung/Review – 2.0-Fundament.md`](<entwicklung/Review – 2.0-Fundament.md>) | Die **unabhängige Gegenprüfung** des Fundaments: jede Behauptung der Teammates mit eigenem Befehl oder Zitat nachgemessen, mit Restzweifeln und dem, was nicht geprüft werden konnte. |
| [`entwicklung/Review – Klassenraum A+B.md`](<entwicklung/Review – Klassenraum A+B.md>) | Die **unabhängige Gegenprüfung** der Klassenraum-Stufen A und B (Codec, Öffnungsweg, die zwei Ansichten) mit eigenen Messungen — und ausdrücklich dem, was **nicht** geprüft werden konnte. |
| [`entwicklung/Befund – Output-Runde.md`](<entwicklung/Befund – Output-Runde.md>) | Die **unabhängige Messung der Output-Runde**: Vorher-Stand der 14 CSS-Dateien (Bytes, Zeilen, CRLF, SHA256), Regeln vorher/nachher, **sieben Gegenproben** — und der **R8-Fund** samt dem einen benannten Verlust, dazu sieben widerlegte Annahmen. |
| [`entwicklung/Befund – 27 von 27.md`](<entwicklung/Befund – 27 von 27.md>) | Die Frage, ob **jede** der 27 Fertigkeiten als Klassenraum-Auftrag lösbar ist — in vier Messungen belegt, mit der Tabelle aller 27 und fünf Befunden zum Drumherum. |

## Die Runden 2.1–2.9 — Entwürfe, Übergaben, Begleitverträge (26.–31.10.2026)

Von der 2.1-Runde bis zur Abteilung Subnetting (2.9.0): jede Runde hat einen **Entwurf**
(Vertrag vor dem Bau) und eine **Übergabe** (Stand nach der Runde). Der CHANGELOG nennt die
Fassungen, die Entwürfe die Begründungen und verworfenen Versuche.

| Datei | Wofür |
|---|---|
| [`entwicklung/Entwurf – Bento 2.5 (Arbeitsplatz).md`](<entwicklung/Entwurf – Bento 2.5 (Arbeitsplatz).md>) | Gestaltungsvertrag der Bento-2.5-Runde (30.10.2026): Postfach, Kunden, Dashboard, Training und Leiste neu gedacht — mit Nutzerzitaten und Messwerten. |
| [`entwicklung/Entwurf – Lagebild 2.0 (Gestaltungsvertrag).md`](<entwicklung/Entwurf – Lagebild 2.0 (Gestaltungsvertrag).md>) | Gestaltungs- und Umsetzungsvertrag für die Laborfläche (30.10.2026): Topologie, Themes, gerade Kabel, Piktogramme. |
| [`entwicklung/Entwurf – Runde 4 (Jobdoku & QoL).md`](<entwicklung/Entwurf – Runde 4 (Jobdoku & QoL).md>) | Gestaltungsvertrag Runde 4 „Jobdoku & QoL" (31.10.2026): Einsatzakte, Ausbildungs-Cockpit, Flugschreiber, Inspektor, Fenster, Shop — Ergebnis ist Fassung 2.6.0. |
| [`entwicklung/Entwurf – Runde 5 (Leiste & Auftragsmappe).md`](<entwicklung/Entwurf – Runde 5 (Leiste & Auftragsmappe).md>) | Gestaltungsvertrag Runde 5 (31.10.2026): drei Nutzer-Screenshots als Auftrag — Leisten-Verhalten und Auftragskontext im Minimodus. |
| [`entwicklung/Entwurf – Runde 6 (Kurzübung mit Kontext).md`](<entwicklung/Entwurf – Runde 6 (Kurzübung mit Kontext).md>) | Gestaltungsvertrag Runde 6 (31.10.2026): Befund „Kurzübungs-Frage ohne Netzkontext" und der Kontextblock vor der Frage. |
| [`entwicklung/Entwurf – Runde 7 (Flugschreiber-Aufmerksamkeit).md`](<entwicklung/Entwurf – Runde 7 (Flugschreiber-Aufmerksamkeit).md>) | Gestaltungsvertrag Runde 7 (31.10.2026): Aufmerksamkeitsführung im Simulations-Panel „Flugschreiber". |
| [`entwicklung/Entwurf – Runde 8 (Abteilung Subnetting).md`](<entwicklung/Entwurf – Runde 8 (Abteilung Subnetting).md>) | Gestaltungsvertrag Runde 8 (31.10.2026): Nutzerauftrag, Integration in die Themes, Werkzeuge und Lernspiele, Aufgaben-Optimierung — Ergebnis ist Fassung 2.9.0. |
| [`entwicklung/Subnetting – Lernstufen-Matrix.md`](<entwicklung/Subnetting – Lernstufen-Matrix.md>) | Die Lernstufen-Matrix der generierten Subnetting- und VLAN-Aufgaben (Runde 7): Typ-Matrix, sieben Befunde mit Vorher/Nachher und Testbeleg — didaktische Grundlage für die Subnetting-Abteilung. |
| [`entwicklung/Vorführfassung – Kiosk-Demo (60 Minuten).md`](<entwicklung/Vorführfassung – Kiosk-Demo (60 Minuten).md>) | Die Kiosk-Demo (31.10.2026): eine Stunde Vorführbetrieb, danach frischer Spielstand — eigene Auslieferungsdatei `Programm/Netzwerk-Labor-Demo.html`. |
| [`entwicklung/Übergabe – Stand 29.10.2026 – Frontend-Redesign.md`](<entwicklung/Übergabe – Stand 29.10.2026 – Frontend-Redesign.md>) | Übergabe Frontend-Redesign (29.10.2026): Entscheidungen, Bild-Vorlagen und nächste Schritte — bewusst ohne Produktcode-Änderung. |
| [`entwicklung/Übergabe – Stand 30.10.2026 – Bento 2.5.md`](<entwicklung/Übergabe – Stand 30.10.2026 – Bento 2.5.md>) | Übergabe Bento 2.5 (30.10.2026): die fünf neu gestalteten Bereiche, Messwerte und offene Punkte. |
| [`entwicklung/Übergabe – Stand 31.10.2026 – Runde 4.md`](<entwicklung/Übergabe – Stand 31.10.2026 – Runde 4.md>) | Übergabe Runde 4 (31.10.2026): sieben Stränge, Ergebnis 2.6.0, Nachweise und offene Punkte. |
| [`entwicklung/Übergabe – Stand 31.10.2026 – Runde 5.md`](<entwicklung/Übergabe – Stand 31.10.2026 – Runde 5.md>) | Übergabe Runde 5 (31.10.2026): Befunde aus drei Bildschirmfotos, Umsetzung, Messungen. |
| [`entwicklung/Übergabe – Stand 31.10.2026 – Runde 6 und 7.md`](<entwicklung/Übergabe – Stand 31.10.2026 – Runde 6 und 7.md>) | Übergabe Runden 6 und 7 (31.10.2026): Kurzübung mit Kontext und Flugschreiber-Aufmerksamkeitsführung. |
| [`entwicklung/Übergabe – Stand 31.10.2026 – Runde 8.md`](<entwicklung/Übergabe – Stand 31.10.2026 – Runde 8.md>) | Übergabe Runde 8 (31.10.2026): Auftrag, Umsetzung, Abnahme — enthält den Veröffentlichungs-Nachweis der 2.9.0. |

## Die Fassung 3.0.0 — Release (31.10.–01.11.2026)

| Datei | Wofür |
|---|---|
| [`entwicklung/Übergabe – Stand 3.0.0.md`](<entwicklung/Übergabe – Stand 3.0.0.md>) | Übergabe und Release-Notes der Fassung 3.0.0: was neu ist, Artefakte und SHA256 (lokal gemessen), Installationswege, bekannte Grenzen, offene Freigaben — Commit-Kette W0 bis W5 und die Protokolle unter `Nachweise/3.0/`. |

## Die Fassung 3.1.0 — Release (2026-11-01)

| Datei | Wofür |
|---|---|
| [`entwicklung/Übergabe – Stand 3.1.0.md`](<entwicklung/Übergabe – Stand 3.1.0.md>) | Übergabe und Release-Notes der Fassung 3.1.0: Onboarding, Analyse-Begleiter, sichtbare Labor-Aktionen, Resizer, Bento-Abnahme, QC-Gates; Artefakte und SHA256 (nach Build), Installationswege, Grenzen, veröffentlichte Schritte. |

## Ausblick: 3.0 und der Betrieb — der Plan vom 09.10.2026 (3.0.0 gebaut)

Was nach der ausgelieferten 2.0 kommt — als Plan, nicht als Wunschzettel.

| Datei | Wofür |
|---|---|
| [`entwicklung/Konzept – 3.0.md`](<entwicklung/Konzept – 3.0.md>) | **Der Plan für die nächste Fassung.** Fünf Säulen — **Unterricht mit 20 Azubis**, **Inhalte, die nicht ausgehen**, **Stufe C/D ehrlich eingeordnet**, **technische Schulden**, **Diagnose ohne Bewertung** —, jede mit Aufwand, Risiko und einem **messbaren** Fertig-Kriterium; **Aufwandsspanne 11–20 Sitzungen** (davon 4,5–6,5 unverzichtbar) und ein Abschnitt „was ausdrücklich **nicht** in 3.0 gehört"; die Ist-Zahlen sind Stand 09.10.2026, der heutige Stand steht in §1a und in `docs/STAND.md`. |
| [`entwicklung/Markt – Monetarisierung.md`](<entwicklung/Markt – Monetarisierung.md>) | Der ehrliche Marktteil: **20 Quellen gelistet, 13 abgerufen, 7 mit belastbaren Zahlen** (BIBB, Westermann BiBox, MoodleCloud, § 5 DDG, § 19 UStG) und **9 Wettbewerber** mit URL und Preismodell; Preisvorschlag **Standortlizenz 390 €/Jahr** (ausdrücklich als **Setzung** markiert) — und der wichtigste Abschnitt: **„was NICHT funktionieren wird"**, darunter, dass ein Server-/Abo-Modell den Kern „kein Server, kein Konto" zerstört. |
| [`entwicklung/Bilanz – Agententeam 2.0.md`](<entwicklung/Bilanz – Agententeam 2.0.md>) | Die **Erfolgsquote des Agententeams**, ehrlich gerechnet: streng **87,8 %** der Aufgaben und **66,7 %** der Zusagen halten der Nachmessung stand (mit Belegen 91,8 % und 88,9 %); **neun Ausfälle namentlich**. |
## Wie dieses Verzeichnis aufgeräumt wurde

Bis zum 06.10.2026 lagen zwölf Notizen im Wurzelverzeichnis; ein Besucher sah sie vor dem
Quelltext. Auf Wunsch wurden sie hierher gezogen — **mit** `git mv`, damit die
Versionsgeschichte jeder Datei erhalten bleibt, und mit angepassten Verweisen
(`tools/repo-aufraeumen.py`, `tools/repo-verweise-flicken.py`). **Grenze des alten Werkzeugs
(26.10.2026 gemessen):** `repo-verweise-flicken.py` liest `git ls-files "*.md"`, git gibt Pfade
mit Umlauten aber quotiert aus — dadurch sah es nur **42 statt 78** Dateien. Seit 26.10.2026 prüft
`python tools/stand.py --pruefen` alle Markdown-Dateien (auch die mit Umlauten) und meldet tote
Verweise, statt sie zu übersehen; die aktuelle Zahl steht in `docs/STAND.md`.

Im Wurzelverzeichnis bleiben nur, was man dort erwartet: `README.md`, `LICENSE`, `LIZENZ.md`,
`AGENTS.md` (der `CHANGELOG.md` liegt bewusst in `docs/`), `.gitignore`,
`.gitattributes`, `index.html` (Weiterleitung für Pages), die Baueingänge `bauen.py` und
`schriften.css` sowie die Ordner `src/`, `tests/`, `tools/`, `android/`, `shell/`,
`schriften/`, `Vorlagen/`, `Programm/`, `fremd/` und `docs/`.
