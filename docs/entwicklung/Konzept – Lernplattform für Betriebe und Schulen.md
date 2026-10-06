---
tags: [FISI, Lernspiel, Netzwerk, Plattform, Konzept]
erstellt: 2026-10-06
aktualisiert: 2026-10-06
status: Konzept (Vorschlag) – nichts davon ist gebaut; Stand der Belege 06.10.2026
---

# Konzept – Lernplattform für Betriebe und Schulen

Dieses Dokument denkt das Netzwerk-Labor als **kaufbares Lerntool für Berufsschulen und
Ausbildungsbetriebe** weiter: eine Lehrer- und eine Schüler-Instanz, Aufträge in Echtzeit,
Gamification für den Unterricht — und die autarken Singleplayer-Funktionen unverändert
daneben. Es ist ein **Konzept, kein Werbetext und keine Zusage**: Jede Zahl ist entweder
im Code dieser Sitzung gemessen (mit Datei und Zeile) oder ausdrücklich als Schätzung
gekennzeichnet.

**Lesehilfe — jede Aussage trägt eines dieser drei Zeichen:**

| Zeichen | Bedeutung |
|---|---|
| ✅ | **heute im Code vorhanden** (Datei:Zeile als Beleg) |
| ➡️ | **daraus ableitbar** — kein neuer Kern nötig, aber Arbeit |
| 🆕 | **neu zu bauen** — heute existiert dafür nichts |

## 0. Was heute wirklich da ist (gemessen 06.10.2026)

| Bestand | Zahl | Beleg |
|---|---|---|
| Fertigkeiten (Kompetenzfelder) | **27** in 6 Regionen (5+5+5+5+4+3) | `src/daten/basis.js:13-41`, `src/spiel/kompetenz.js:8-15` |
| Lernmotor-Stufen | Box **0–5**, sechs Namen: angefangen · gesehen · geübt · sicher · gemeistert · gemeistert ★ | `src/spiel/kompetenz.js:21` |
| Karriere-Stufen | **6** (Azubi · Geselle · Fachkraft · Spezialist · Senior · Storage & Cloud) mit Ruf-Schwellen 0/10/28/55/90/140 | `src/spiel/karriere.js:17-25` |
| Kunden der Karriere | **6** (Salon, Schreibbüro, Arztpraxis, Autohaus, Mittelstand, Storage) | `src/spiel/karriere.js:31-36` |
| Handgeschriebene Aufträge | **46** (18+19+4+2+3 in fünf Dateien, Muster `t({id:`) | `src/daten/tickets-*.js` |
| Fehlerarten (Injektoren) | **36**, je mit `passt/anwenden/loesung/hilfen/erklaerung` | `src/spiel/injektoren.js` (36 × `neu({name:`) |
| Netzvorlagen | **5**: lan, buero, praxis, standorte, dmz | `src/spiel/injektoren.js:19`, `src/spiel/vorlagen.js` |
| Mini-Tickets (Leiste) | **92** im Code (die Liesmich nennt 83 — Abweichung, nicht erklärt) | `src/daten/mini.js` |
| Wiki-Seiten | **27** — eine je Fertigkeit, reine Daten | `src/daten/wiki.js` |
| Lehrtexte | je Simulationsgrund, drei Niveaus (E · AP1 · AP2) mit Quellenangabe, „reine Daten, keine Logik" | `src/daten/lehrtexte.js:2-9` |
| Hilfeleiter | **Stufen 0–6** mit Sternkosten 0/0/0/0/½/½/1 | `src/spiel/hilfe.js:3-14` |
| Prüfungstag | 3 generierte Aufgaben, 25 min, keine Hilfen, IHK-Punkteschlüssel, Gebühr AP1 40 € / AP2 80 €, bestanden ab 50 | `src/spiel/pruefung.js:2-9` |
| Abnahme | Ziele ✓/✗ mit Grund, Regression, Neustart-Test, Kollateralschaden, Tempo-Bonus 10 % | `src/spiel/abnahme.js:2-12` |
| Niveau (Differenzierung) | **E / AP1 / AP2** automatisch aus dem Mittel der Leitner-Box | `src/spiel/lernen.js:13-27` |
| „Unterrichtsthema" | existiert als Einstellung; Ereignisse ziehen es zu 60 %, Mini-Tickets zuerst | `src/spiel/wartung.js:30,108-109`, `src/spiel/mini.js:41`, `src/ui/karriere.js:332` |
| Tagesrätsel | gleiche Aufgabe für alle: hängt nur an Datum und Niveau, **nie am Spielstand** | `src/spiel/tagesraetsel.js:3` |
| Determinismus | mulberry32 in `Zufall(seed)`; sim/, cli/, spiel/ nutzen **kein** `Math.random` (nur Kommentare, die es zusichern) | `src/kern/basis.js:41-56` |
| Speicher | drei Speicher `lern` · `labor` · `einst`, Schreiben 2 s verzögert | `src/kern/basis.js:58-84` |
| Spielstand | `v:2` mit Migration und Ergänzern (`Spiel.ergaenzer`) | `src/spiel/zustand.js:15,41-60` |
| Browser-Ablage | localStorage-Schlüssel `netzwerk-labor` | `src/plattform/plattform-browser.js:6` |
| Export/Import | JSON, Datei `netzwerk-labor-<datum>.json` | `src/ui/karriere.js:393-396` |
| Tests | **213/213 grün** (30 Testdateien, 76 Module) — in dieser Sitzung ausgeführt | `sh tools/test.sh` |
| Umfang | src/ 20.787 Zeilen, web/index.html 1.677.529 B, Einzeldatei 2.193.687 B, APK 960.028 B | gemessen |
| Netzwerkcode | **0 Treffer** für fetch/XMLHttpRequest/WebSocket/EventSource in `src/` und in der Tauri-Hülle | gemessen |
| Lizenz | PolyForm Noncommercial 1.0.0: Bildungseinrichtungen frei, **kommerzielle Nutzung ausgeschlossen** | `LIZENZ.md`, `LICENSE` |
| Schriften | Atkinson Hyperlegible, Bricolage Grotesque, JetBrains Mono — alle OFL | `schriften/OFL-*.txt` |

**Was heute ausdrücklich NICHT existiert** (damit niemand es für vorhanden hält):
Klassen, Rollen, Konten, Anmeldung, Server, Sync, Chat, Mehrbenutzerbetrieb, Freigaben,
Mandanten, Fernauswertung. Die Suche nach Netzwerkcode ergab null Treffer; die
Android-Fassung hat **keine einzige Berechtigung** (kein INTERNET) — die App kann heute
technisch nicht nach Hause telefonieren.

## 1. Leitsatz und Produktkern

**Leitsatz:** *Ein autarkes Lernspiel bleibt die Grundlage — die Klasse kommt obendrauf,
nicht darunter.*

Drei Sätze zum Produktkern:

1. Das Netzwerk-Labor bleibt, was es ist: ein Lernspiel, das ohne Netz, ohne Konto und
   ohne Installation auf jedem Gerät läuft — dieser Teil wird **nicht** angefasst.
2. Darüber liegt eine **Klassenraum-Schicht**: Lehrkräfte und Ausbilder schicken Aufträge
   und Szenarien an ihre Gruppe, sehen während der Stunde, wer wo hängt, und werten nach
   Kompetenzen statt nach Gefühl aus.
3. Der **Rahmen** (Simulationskern, Auftragsmodell, Abnahme, Gamification, Lernmotor) ist
   gesetzt und versioniert; **gestaltbar** sind die Inhalte: Aufträge, Szenarien,
   Simulationen, Templates, Wissen, Dateien.

Das ist die Unity-Analogie, wörtlich genommen: Der Rahmen ist die Engine, die Fachinhalte
sind die Assets. Ein Kunde gestaltet seine Aufträge, sein Wissen, seine Reihenfolgen — er
baut nicht die Engine um.

### Die Trennlinie: fest · gestaltbar · gesperrt

| Baustein | fest (Rahmen, vom Anbieter gesetzt) | gestaltbar (Kunde) | gesperrt (auch für Kunden) |
|---|---|---|---|
| Simulationskern (Modell, Sim, Determinismus) | ✅ vollständig | — | Änderung der Simulationsregeln |
| Auftragsmodell (`ticketBauen`: Vorlage + Seed + Injektoren + Ziele) | ✅ Form bleibt | Inhalte: Texte, Ziele, Fehlerwahl, Zeit, Lohn, Reihenfolge, Kunde | neue Zieltypen ohne Kern-Update |
| Abnahme und Bewertung (Ziele, Regression, Neustart-Test) | ✅ Regeln | Schwellen je Auftrag (Zeit, Niveau, Hilfen erlaubt) | Bewertungslogik selbst |
| Notenschlüssel (IHK-Punkte) | ✅ | — | ✅ gesperrt: sonst sind Noten nicht vergleichbar |
| Gamification (Ruf, Euro, Karriere, Abzeichen) | ✅ Rahmen | Lohnhöhe, Belohnungstexte, Karriere-Tempo | Abschalten der Fairness-Regeln |
| Lernmotor (Leitner) und Kompetenzmodell | ✅ | Zuordnung Auftrag → Fertigkeiten | Box-Zählung, Intervalle |
| Hilfeleiter 0–6 | ✅ Stufen und Sternkosten | welche Stufen im Unterricht erlaubt sind | Stufen 4–6 in Prüfungen |
| Oberfläche / Design-System | ✅ Struktur, Bedienbarkeit | Logo, Farben, Titel, eigene Texte, Sprache | Eingriffe, die Bedienbarkeit oder Kontrast verschlechtern |
| Wissen (Wiki, Lehrtexte, Geschichten) | ✅ Format | Inhalte vollständig | — |
| Dateien und Anhänge | ✅ Format | eigene Dateien je Auftrag | ausführbarer Code in Paketen |
| Rollen und Rechte | ✅ Modell | Klassengrößen, Fristen | Rechteausweitung über die Rolle hinaus |
| Datenschutz-Voreinstellungen | ✅ Datenminimierung | Löschfristen (nach unten) | ✅ gesperrt: Telemetrie, Werbung, Chat, Weitergabe |
| Serverbetrieb | ✅ Software | Betriebsort (eigener Server / gehostet) | Zugriff auf Inhalte fremder Mandanten |

## 2. Rollen und Instanzen

Fünf Rollen, zwei Instanzen. „Instanz" heißt: dasselbe Programm, andere Rechte und eine
andere Startansicht. Technisch ist das heute schon so gebaut — die Oberfläche registriert
Ansichten zur Laufzeit (`src/ui/app.js:11,56-80`), eine Rolle blendet nur ein.

| Rolle | Instanz | darf | darf nicht |
|---|---|---|---|
| **Lehrer / Lehrkraft** | Lehrerkonsole | Klassen anlegen, Sitzung starten, Aufträge zuweisen, Live-Stand sehen, differenzieren, auswerten, Inhalte auswählen und freigeben | Klarnamen ohne Freigabe sehen, Rohdaten exportieren, Bewertungslogik ändern, Schüler anschreiben |
| **Schüler / Azubi** | Lern-Instanz (heutiges Spiel) | beitreten, Aufträge spielen, autark weiterspielen, Hilfeleiter nutzen, Ergebnis abgeben | fremde Klassen sehen, Lehreransicht öffnen, eigene Ergebnisse löschen |
| **Ausbilder / Betrieb** | Ausbilder-Konsole | wie Lehrer, zusätzlich: betriebliche Kompetenzberichte, Ausbildungsstand je Azubi, eigenes Inhaltsarchiv | Noten vergeben (nur Ausbildungsstand), auf Schulklassen zugreifen |
| **Admin** (Schule oder Betrieb) | Verwaltung | Nutzer anlegen, Rollen vergeben, Serverbetrieb, Aufbewahrungsfristen, Export und Löschung | Lernstände inhaltlich einsehen (nur Metadaten), Bewertungen ändern |
| **Gast** | heutiges Spiel | alles, was das Spiel heute kann — ohne Konto, ohne Netz | Daten hochladen, einer Klasse beitreten |

### Klasse anlegen und beitreten

➡️ **Klasse anlegen** (Lehrerkonsole): Name, Fach, Zeitraum → die Konsole erzeugt einen
**Klassencode** aus 6 Zeichen ohne verwechselbare Zeichen (kein 0/O, 1/I/L).

➡️ **Beitritt, drei Wege — alle ohne Konto:**

| Weg | Ablauf | Voraussetzung |
|---|---|---|
| **Code** | Schüler öffnet das Spiel, tippt den Code, bekommt automatisch ein Sitzplatz-Pseudonym („Bank 3 / Platz 2") | keine |
| **QR an der Tafel** | Lehrkraft zeigt QR; die App öffnet sich mit vorbelegtem Code | Smartphone-Kamera oder Tablet |
| **Klassenliste** | Admin importiert CSV **nur wenn Namen gewünscht sind** | bewusste Entscheidung + Einwilligung |

Der Code ordnet einen **Sitzplatz** zu, keine Person. Namen sind optional und
standardmäßig aus.

### Autarkie: was ohne Netz passiert

Das ist der Kern des Versprechens — und heute bereits wahr:

1. ✅ **Ohne Server läuft alles weiter.** Es gibt keinen Netzwerkcode im Projekt
   (gemessen: 0 Treffer), also kann das Spiel ohne Server gar nicht ausfallen.
2. ➡️ **Auftrag ohne Netz weitergeben:** Ein Auftrag ist ein winziger Bauplan
   (Vorlage, Seed, Fehler, Ziele) und liegt bei den 46 Handaufträgen ohnehin auf dem
   Gerät. Die Lehrkraft sagt die **Auftrags-ID** an („salon-03") — jedes Gerät hat
   denselben Auftrag, weil die Erzeugung deterministisch ist (`src/kern/basis.js:41-56`).
   Für generierte Aufträge gibt es dasselbe als kurzen **Aufgabencode** (z. B. `S7-K4-19`:
   Vorlage, Niveau, Seed).
3. ✅ **Gleiche Aufgabe für alle** ist im Code bereits Prinzip: das Tagesrätsel hängt nur
   an Datum und Niveau, nie am Spielstand — „so bekommt die ganze Klasse dasselbe"
   (`src/spiel/tagesraetsel.js:3`).
4. ➡️ **Nachreichen ohne Netz:** Ergebnisse bleiben lokal; sobald wieder Verbindung
   besteht, werden sie nachgesendet (siehe § 3 und § 6).

## 3. Echtzeit: Sitzung, Live-Auftrag, Rückkanal

### Sitzungsmodell

Eine **Sitzung = eine Unterrichtsstunde**:

```
{ sitzung: 42, klasse: "9b-IT", thema: "lab.vlan", beginn, ende,
  auftraege: [ {id, spec|ticketId, frist, hilfenErlaubt: 0..3, gruppe: "alle"|"A"|"B"} ],
  zustand: "offen" | "gesperrt" | "beendet" }
```

✅ Bausteine dafür sind vorhanden: die Ticket-Instanz trägt bereits **`frist`** und
**`quelle`** (`src/spiel/postfach.js:2-8`), und „Unterrichtsthema" existiert als
Einstellung, die Ereignisse und Mini-Tickets bevorzugt (`src/spiel/wartung.js:108-109`).
➡️ Aus dem lokalen Thema wird das von der Lehrkraft gesetzte Thema.

### Wie der Auftrag zum Schüler kommt

1. Lehrkraft wählt in der Konsole einen Auftrag (aus 46 Handaufträgen, aus 36 Fehlerarten
   generiert, oder eine Klassenprüfung) und ein Zeitfenster.
2. Der **Auftrag geht als Bauplan** an die Geräte — wenige hundert Byte, kein Netzplan,
   keine Simulation. Die Simulation läuft auf dem Gerät.
3. Weg: WebSocket an den Klassenserver, wenn vorhanden; sonst beim nächsten Sync; sonst
   Code/ID zum Abtippen (§ 2). Der dritte Weg ist der wichtigste: er funktioniert immer.
4. Die Geräte setzen den Auftrag ins Postfach — das Postfach hält heute 2–3 Tickets bereit
   (`src/spiel/postfach.js:9-13`), der Live-Auftrag kommt als **weiterer Eintrag mit
   `quelle: "unterricht"`** dazu und steht ganz oben.

### Timer, Sperre, Nachreichen

| Element | Verhalten | Stand |
|---|---|---|
| **Timer** | Ablaufzeit = `frist` der Instanz; Anzeige im Kopf, Warnung 2 min vorher | ✅ `frist` vorhanden, ➡️ Anzeige |
| **Sperre** | Während der Live-Phase sind Postfach und eigene Aufträge gesperrt („Unterrichtsmodus"); die Lehrkraft kann freigeben | ➡️ kleiner Eingriff in die Oberfläche |
| **Nachreichen** | Nach Ablauf wandert der Auftrag in eine Nachreichen-Liste; das Ergebnis zählt mit dem Vermerk „nach Frist" | ➡️ |
| **Abbruch durch Lehrkraft** | Auftrag wird zurückgezogen; das Gerät merkt sich „storniert" und zeigt es an, statt still zu verschwinden | ➡️ |

### Rückkanal: was zurückkommt — und was nicht

Übertragen werden **nur Ergebnisse**, keine Eingaben, kein Bildschirm, kein Chat:

| Ereignis | Inhalt | Größe |
|---|---|---|
| `gestartet` | Auftrags-ID, Sitzplatz, Zeit | < 100 B |
| `ziel-erreicht` | Ziel-Nummer | < 100 B |
| `abnahme` | bestanden, Sterne, Niveau, Abzüge | < 200 B |
| `versuch` | Fehlversuch, Hilfestufe genutzt | < 100 B |
| `haengt` | letztes unerfülltes Ziel + Fehlerart aus dem Fehlerdex | < 200 B |

Damit sieht die Lehrkraft das, was im Unterricht zählt: **wer fertig ist, wer wo hängt, wie
viele Anläufe und welche Hilfe nötig waren** — als Ampel je Sitzplatz, nicht als
Überwachung. ✅ Die Datenquellen dafür existieren: Hilfeleiter-Stufe und Hilfen liegen an
der Instanz, der Fehlerdex sammelt `{gesehen, verstanden}` je Fehlerart
(`src/spiel/zustand.js:34`).

**Bewusst nicht übertragen:** Tastatureingaben, Zwischenschritte der Konsole, Chat,
Kamera, Mikrofon, Standort, Gerätekennung, IP-Adresse (der Klassenserver protokolliert
sie nicht).

### Verbindungsabbruch und Konfliktregeln

Das Gerät ist die Wahrheit für den eigenen Fortschritt, der Server für die Zuweisung:

| Fall | Regel |
|---|---|
| Verbindung bricht ab | Es geht lokal weiter; Ereignisse landen in einer Warteschlange im Spielstand |
| Wieder da | Warteschlange wird nachgesendet; jedes Ereignis hat eine ID, doppelte werden verworfen (idempotent) |
| Auftrag geändert, während Gerät offline war | **Lehrer gewinnt** bei Zuweisung/Streichung, **Gerät gewinnt** beim eigenen Ergebnis |
| Widerspruch (Auftrag storniert, Ergebnis da) | beides bleibt erhalten, sichtbar als „storniert, Ergebnis nachgereicht" — kein stilles Überschreiben |
| Uhren laufen auseinander | Zeit nur zur Anzeige; Reihenfolge über Ereignisnummern, nicht über Zeitstempel |

## 4. Didaktik

### Lernziele je Auftrag

✅ Jeder Auftrag trägt `ziele[]` mit Text (Beispiel `src/daten/tickets-1-2.js`: „Die Kasse
druckt Belege auf dem Drucker"). Sie sind auf Hilfeleiter-Stufe 0 („Symptom und Ziel")
immer sichtbar (`src/spiel/hilfe.js:5`). ➡️ Für den Unterricht kommen zwei Felder dazu:
**Lernziel in Lehrersprache** und **geschätzte Dauer** (Minuten gibt es schon).

### Kompetenzabgleich

Das Spiel bringt ein fertiges Kompetenzmodell mit — es muss für die Plattform nicht neu
erfunden werden:

| Ebene | Bestand | Verwendung im Unterricht |
|---|---|---|
| 27 Fertigkeiten in 6 Regionen | ✅ `src/spiel/kompetenz.js:8-15` | Klassen-Heatmap „Fertigkeit × Sitzplatz" |
| Karriere-Stufe 1–6 je Fertigkeit | ✅ `src/daten/basis.js:14-40` | Lehrplan-Zuordnung („das gehört in Stufe 2") |
| Leitner-Box 0–5 (6 Namen) | ✅ `src/spiel/kompetenz.js:21` | „was sitzt, was nicht" |
| Niveau E / AP1 / AP2 | ✅ `src/spiel/lernen.js:13-27` | AP1/AP2-Bezug zur IHK-Prüfung |
| Ergebnis je Auftrag | ✅ Sterne, Abzüge, Regression, Neustart-Test | Note und Nachweis |

### Auswertung für die Lehrkraft: „was ist sitzengeblieben"

➡️ Vier Ansichten, alle aus vorhandenen Daten:

1. **Klassenbild:** je Fertigkeit der Anteil Sitzplätze mit Box ≥ 3 („sicher" oder besser).
   Was in der Stunde geübt wurde und danach noch unter 3 steht, ist sitzengeblieben.
2. **Lernzuwachs der Stunde:** Box-Stand je Fertigkeit vor und nach der Sitzung
   (Differenz) — das ist der Beleg, dass die Stunde gewirkt hat.
3. **Fehlerbild der Klasse:** häufigste Fehlerarten aus dem Fehlerdex, aggregiert
   (`src/spiel/zustand.js:34`) — zeigt, was erklärt werden muss.
4. **Aufwand je Auftrag:** Anläufe, genutzte Hilfestufe, Zeit (Instanz trägt `zeitMs`,
   `hilfeStufe`, `hilfen[]`) — zeigt, welcher Auftrag zu schwer war.

### Hausaufgaben, Wiederholung, Differenzierung, Prüfung

| Baustein | Wie | Stand |
|---|---|---|
| **Hausaufgabe** | Auftrag mit Frist außerhalb der Sitzung; erscheint beim nächsten Öffnen im Postfach | ✅ Postfach füllt sich selbst nach (`src/spiel/zustand.js:110`), ➡️ Zuweisung |
| **Wiederholung** | Leitner-Intervalle; „nach dem Vorführen: Wiederholung im Lernmotor + Variante als Ticket" gibt es schon (`src/spiel/hilfe.js:8-10`) | ✅ |
| **Differenzierung** | Niveau E/AP1/AP2 automatisch aus dem Lernstand; die Lehrkraft kann je Gruppe ein Niveau, einen Flow („Gerüst"/„Verwicklung", `src/spiel/flow.js`) und die Fehlerzahl wählen | ✅ Mechanik, ➡️ Gruppen-Zuweisung |
| **Prüfungsmodus** | Prüfungstag: 3 generierte Aufgaben, 25 min, keine Hilfen, IHK-Punkteschlüssel (`src/spiel/pruefung.js:2-9`) | ✅ vorhanden, ➡️ Klassenprüfung mit **einem Seed für alle** |
| **Fairness** | Gleicher Seed + deterministische Erzeugung = identische Aufgabe auf allen Geräten, ohne Datenübertragung | ✅ gemessen: „gleicher Seed → gleiches Netz" (Testlauf) |

**Ehrliche Grenzen der Didaktik:**

- Es gibt **keinen Aufsatz- oder Freitextbewertung** und keine KI-Noten. Bewertet wird, was
  Ziele und Simulation hergeben (erreichbar? Regel eingehalten? Konfiguration überlebt
  Neustart?).
- Der **Prüfungsmodus ist eine Übungsprüfung**, kein zertifiziertes Examen: Wer das Gerät
  bedient, ist nicht feststellbar. Ein Zertifikat ist ein Kompetenznachweis, kein
  IHK-Zeugnis — und darf nicht so heißen.
- Differenzierung heißt hier: **der Auftrag passt sich an, nicht das Etikett.** Das Niveau
  ist heute in den Einstellungen sichtbar; im Unterricht sollte es nicht als Schild vor
  einem Schüler stehen. Das ist eine Oberflächenentscheidung, keine Kernänderung.

## 5. Datenschutz und Recht

Bei Schulen ist das der Ausschlusspunkt Nummer eins. Deshalb ist der Vorschlag technisch
so gebaut, dass die Prüfung klein bleibt. **Keine Rechtsberatung** — das ist eine
technische Voreinstellung mit Begründung.

### Grundsatz: Datenminimierung, nicht abschaltbar

- **Kein Konto für Schüler.** Beitritt per Klassencode, Zuordnung über Sitzplatz-Pseudonym.
- **Keine Klarnamen als Standard.** Namen gibt es nur, wenn die Einrichtung sie
  ausdrücklich einschaltet und die Rechtsgrundlage geklärt ist.
- **Kein Chat, keine Nachrichten, keine Kontaktaufnahme** über die Plattform (auch nicht
  Lehrer → Schüler) — das vermeidet Aufsichtspflicht- und Missbrauchsfragen vollständig.
- **Keine Telemetrie nach außen.** Kein Analysewerkzeug, keine Werbe-ID, keine
  Fehlerberichte an Dritte, kein Training von KI-Modellen mit Schülerdaten.

### Was erhoben wird — und was nicht

| Erhoben (notwendig) | Nicht erhoben (bewusst) |
|---|---|
| Sitzplatz-Pseudonym (je Klasse) | Name, Adresse, Geburtsdatum, Foto |
| Kompetenzstand je Fertigkeit (Leitner-Box) | Chat- oder Nachrichteninhalte |
| Ergebnisse je Auftrag (Ziele, Sterne, Anläufe, Hilfestufe, Dauer) | Tastatureingaben außerhalb des Spiels |
| Fehlerdex je Fertigkeit | Standort, Kamera, Mikrofon, Kontakte |
| Zeitpunkt von Sitzung und Abgabe | Gerätekennung, Werbe-ID |
| — | IP-Adresse im Anwendungsprotokoll |

### Speicherort, Fristen, Löschung

| Frage | Vorschlag |
|---|---|
| **Wo liegen die Daten?** | Im Schul- oder Betriebsnetz auf einem eigenen Rechner (Klassenserver) — sie verlassen das Haus nicht. Keine Übermittlung in Drittländer. |
| **Wer betreibt?** | Die Einrichtung (On-Premise) oder ein gehosteter Container **je Einrichtung** mit Auftragsverarbeitungsvertrag (DSGVO Art. 28). |
| **Wie lange?** | Ereignisse je Stunde 90 Tage (einstellbar kürzer), Kompetenzstände bis zum Ende des Schuljahres bzw. der Ausbildung, dann Löschung oder Übergabe als Zeugnis-Anhang. |
| **Löschen** | „Alles löschen" je Klasse und je Person; Export vor der Löschung möglich (JSON). |
| **Sicherheit** | Transport nur im lokalen Netz mit TLS; Zugriff je Rolle; getrennte Mandanten; kein Zugriff einer Schule auf eine andere. |
| **Auskunft** | Kompetenzstand und Ergebnisse sind für die betroffene Person selbst einsehbar und exportierbar (Art. 15 DSGVO). |

### Einwilligung bei Minderjährigen

- **Empfohlener Weg:** so wenige Personendaten wie möglich. Ein Sitzplatz-Code ist
  **pseudonym, nicht anonym**: Führt die Lehrkraft den Sitzplan, ist der Bezug zur Person
  herstellbar — dann bleibt es ein personenbezogenes Datum und braucht eine Rechtsgrundlage.
  Der Vorteil liegt nicht in „keine DSGVO", sondern in weniger Daten, klaren Zwecken und
  kurzen Fristen.
- **Wenn Namen gewünscht sind:** Rechtsgrundlage kommt in der Schule regelmäßig aus dem
  **Schulrecht des Landes**, nicht aus einer Einwilligung; zusätzlich Einbindung der
  Schulleitung und des Datenschutzbeauftragten. Bei Betrieben: Einwilligung bzw.
  Ausbildungsvertrag/Zweck.
- **Kinder unter 16** (Art. 8 DSGVO) sind bei Diensten der Informationsgesellschaft ein
  eigener Fall — hier ist die Rechtsprüfung Pflicht, nicht optional.

### Was vor dem ersten Verkauf zu klären ist (offene Rechtsfragen)

1. Landesdatenschutzgesetz und Schulgesetz des Ziellandes (16 Länder, 16 Regeln).
2. Datenschutz-Folgenabschätzung (Art. 35 DSGVO): bei systematischer Auswertung von
   Leistungsdaten Minderjähriger plausibel — im Konzept vorsehen, nicht nachreichen.
3. Beteiligung der Lehrerkonferenz/Personalvertretung an Werkzeugen, die Unterricht
   auswerten.
4. Urheberrecht an Kundeninhalten (Marktplatz, § 7) und an fremden Inhalten im Paket.
5. Die Lizenzfrage nach § 9 — sie ist der eigentliche Vorbehalt.

## 6. Technik auf dem vorhandenen Code

### Was heute trägt

| Baustein | Zustand | Warum das für die Plattform wichtig ist |
|---|---|---|
| Eine HTML-Datei ohne Bündler | ✅ 2.193.687 B Einzeldatei, 0 Außenverweise | Auslieferung ohne Installation; jedes Gerät hat das komplette Spiel |
| Anpassungsschicht | ✅ Muster `android/mobil/`: CSS/JS wird beim Bau hinter das Spiel gehängt | Die Klassenraum-Schicht kommt genau so dazu — **der Kern bleibt unangetastet** |
| Plattform-Schicht | ✅ `src/plattform/` (3 Dateien, 185 Zeilen): browser, tauri + Android-Hülle | Weiteres „Plattform"-Ziel ist das vorhandene Muster |
| Speicher | ✅ `store` mit drei Speichern und 2-Sekunden-Schreiben (`src/kern/basis.js:58-84`) | Sync kann als Ereignis-Queue andocken, ohne die Spiel-Logik zu ändern |
| Determinismus | ✅ mulberry32, kein `Math.random` in sim/cli/spiel | Gleicher Auftrag auf 30 Geräten, ohne die Lösung zu verschicken |
| Auftrag als Bauplan | ✅ `Spiel.ticketBauen(spec)` (`src/spiel/generator.js:2-11`) | Der Netz-Payload ist ein kleiner Bauplan, kein Netzzustand |
| Instanz mit Frist und Quelle | ✅ `src/spiel/postfach.js:2-8` | Live-Auftrag und Nachreichen brauchen kein neues Datenmodell |
| Ereignis-Bus | ✅ `Spiel.melden(name, daten)` | Ausgehende Ereignisse hängen sich hier an |
| Export/Import JSON | ✅ `netzwerk-labor-<datum>.json` | Vorbild für das Inhalts-Paketformat |
| Tests | ✅ 213/213 grün, jedes Ticket wird geprüft | Inhalte lassen sich **automatisch validieren** — Qualitätssicherung ohne Redaktion |

### Was fehlt (alles 🆕)

Serverdienst · Transport · Identität und Rollen · Sitzungsmodell · Sync-Warteschlange ·
Konfliktregeln · Mandantenfähigkeit · Versions- und Signaturprüfung für Inhalte ·
Update-Weg für Pakete · Protokollierung und Backup · Supportwerkzeuge für den Betrieb ·
deutsche Oberfläche der Lehrerkonsole.

### Vorgeschlagene Architektur: local-first, Server nur als Verteiler

```
Gerät (Spiel, unverändert)          Klassenserver (neu, klein)         Lehrerkonsole (neu)
  ├─ Klassenraum-Schicht  ⇄ WebSocket ⇄  ├─ Sitzungen, Klassen   ⇄  ├─ Auftrag wählen
  │   (wie android/mobil)                ├─ Auftrags-Specs           ├─ Live-Ampel
  ├─ Simulation lokal                    ├─ Ergebnis-Ereignisse      ├─ Auswertung
  └─ Warteschlange im Spielstand         └─ SQLite                   └─ Inhalte verwalten
```

- **Die Simulation bleibt auf dem Gerät.** Der Server verteilt Baupläne und sammelt
  Ergebnisse — er rechnet nichts. 30 Geräte = 30 lokale Simulationen, kein Server-Prozessor
  nötig.
- **Größenordnung einer Unterrichtsstunde** (Schätzung aus den Feldgrößen): 30 × ~1 KB
  Auftrag ≈ 30 KB, 30 × 20 Ereignisse × 200 B ≈ 120 KB — **unter 1 MB je Stunde**. Das
  läuft auf jedem Schul-WLAN und notfalls über einen Hotspot.
- **Klassenserver:** Node.js (im Projekt bereits Bauwerkzeug) + SQLite, Start als
  Windows-Dienst oder Doppelklick; kein Internetzugang nötig, keine eingehenden
  Verbindungen von außen.
- **Kein Kern-Umbau:** Die Klassenraum-Schicht hängt sich wie `android/mobil/` hinter das
  Spiel und ist vollständig in `try/catch` — **ohne Server tut sie still nichts.** Damit
  bleibt die Autarkie technisch garantiert, nicht nur versprochen.
- **Zwei Betriebsformen, eine Software:** On-Premise im Schulnetz (Voreinstellung) oder
  ein Container je Einrichtung (gehostet). Mandantentrennung in der Datenbank, nicht in
  getrennten Installationen.
- **Paketformat für Inhalte:** JSON mit `formatVersion`, `id`, `titel`, `autor`, `lizenz`,
  `sha256`, Signatur; Inhalte (Aufträge, Wiki, Lehrtexte, Dateien) darin. Ausführbarer Code
  ist **nicht** erlaubt — Inhalte sind Daten.
- **Anmeldung:** zuerst nur Klassencode und Pseudonym. Schul-SSO (Moodle, itslearning,
  IServ) später über LTI 1.3 oder CSV — nicht in Stufe 1.

### Betriebskosten (Schätzungen, ausdrücklich nicht gemessen)

| Posten | On-Premise je Schule | Gehostet je Schule |
|---|---|---|
| Infrastruktur | vorhandener Rechner/VM, 0 € | ~5 €/Monat Container + Backup |
| Einrichtung | ~1 Stunde | ~30 Minuten |
| Updates | 1–2 × je Jahr, ~15 Minuten | automatisch |
| Support | Supportvertrag (Empfehlung: 15 % der Lizenz/Jahr) | dito |

### Harte Grenzen, ehrlich benannt

- **iOS** ist der schwierigste Fall: Installation nur über MDM oder Web; im Web fehlen
  Töne und Speicherverhalten je nach Browser. Der beste Weg für Schulen bleibt
  Android-Tablet, Windows-Rechner oder Browser.
- **Schulnetze** sind oft restriktiv (getrennte WLANs, keine Geräte-zu-Gerät-Kommunikation).
  Deshalb ist der codebasierte Weg ohne Netz kein Notnagel, sondern die Rückfalllinie.
- **Der Serverbetrieb ist eine Dauerlast.** Ein Dienst, der im Schulnetz läuft, braucht
  Sicherheitsupdates und einen Ansprechpartner. Ohne Supportvertrag wird daraus ein
  Vertrauensrisiko.
- **Kein Fernzugriff von außen** ohne ausdrückliche Zustimmung der Einrichtung.

## 7. Autorenwerkzeug und Marktplatz

### Was der Kunde heute schon „autoren" kann

✅ Ein Auftrag ist ein **Bauplan aus Daten** (`src/daten/basis.js:107-126`), kein Programm:
`id, reihe, kunde, karriere, stufe, vorlage, vSeed, minuten, injektoren[{name, ziel, param}],
ziele[], titel, briefing, symptom, erklaerung, lohn`. Dazu kommen:
Wissen je Fertigkeit (27 Wiki-Seiten), Lehrtexte je Simulationsgrund in drei Niveaus und
Geschichten je Kunde — **alles reine Daten** (`src/daten/lehrtexte.js:9`).

🆕 **Nicht** als Daten vorhanden: die Fehlerarten (36 JS-Funktionen in
`src/spiel/injektoren.js`), die Netzvorlagen (`src/spiel/vorlagen.js` baut Netze im Code)
und die Ziel-Prüfer. **Das ist die Grenze des Werkzeugs ohne Programmieren.**

### Drei Ausbaustufen des Autorenwerkzeugs

| Stufe | Was der Ausbilder kann | Nutzt | Aufwand |
|---|---|---|---|
| **A — Auftrag aus Bausteinen** | Vorlage wählen, 1–2 der 36 Fehlerarten wählen, Ziele aus dem Katalog, Briefing/Symptom/Erklärung schreiben, Lohn, Minuten, Niveau, Reihenfolge | ✅ alles im Code vorhanden | klein |
| **B — eigene Vorlage** | neues Netz bauen (Geräte, Verkabelung, Konfiguration) als Daten | ➡️ der Modell-Layer kann Netze bereits als Daten (`Modell.geraet/verbinden/setzen`) | mittel |
| **C — eigene Mechanik** | neuer Simulationskern für ein anderes Fach | 🆕 | groß (§ 8) |

**Der Arbeitsablauf in Stufe A** (Ziel: 15 Minuten, kein Programmierwissen):

1. Kunde/Betrieb wählen, Auftragstitel.
2. Vorlage wählen (5 vorhanden, mit Vorschaubild).
3. Fehlerart wählen (36, mit Suchfeld „was soll schiefgehen?").
4. Ziel wählen (erreichbar? blockiert? Konfiguration überlebt Neustart?).
5. Texte schreiben: Briefing in Kundenstimme, Symptom, Erklärung (mit Beispielen als
   Vorlage) — optional Hilfeleiter-Stufen 1–3 füllen.
6. **Probe:** das Werkzeug spielt den Auftrag automatisch durch — Fehler wirkt, Lösung
   heilt, Regression sauber. Genau diese Prüfung fährt heute schon die Testsuite für alle
   46 Aufträge und 5 Vorlagen (213/213 grün). Erst danach ist der Auftrag „geprüft".

### Versionierung, Freigabe, Teilen

➡️ Paketformat mit `formatVersion` und SemVer je Inhalt, SHA256 und Signatur;
drei Zustände: **Entwurf → geprüft → freigegeben**. Eine Klasse sieht nur Freigegebenes.
Teilen zwischen Betrieben: Export/Import als Datei (heute schon das Muster für den
Spielstand), später über den Marktplatz. Kundeninhalte sind **Eigentum des Kunden**;
das Werkzeug darf sie ohne Zustimmung nicht weitergeben.

### Marktplatz (Stufe 4)

| Element | Vorschlag |
|---|---|
| Angebot | Fachpakete (z. B. „VLAN im Mittelstand", „Prüfungsvorbereitung AP1") aus Aufträgen, Wissen, Szenarien |
| Qualität | Prüfsiegel „didaktisch geprüft": automatische Probe (§ 7 A, Schritt 6) + fachliche Sichtung |
| Recht | Urheber bleibt Verfasser; Lizenz je Paket (frei / bezahlt / nur eigene Schule); Haftungsklärung |
| Erlös | 30 % Vermittlungsanteil (Vorschlag), 70 % Verfasser; Auszahlung ab Schwellenwert |
| Kaltstart | eigener kostenloser Grundbestand (die 46 Aufträge + Wissen) als Startpaket; Anreiz für die ersten Verfasser |
| Grenze | **keine ausführbaren Inhalte** — sonst wird aus dem Marktplatz ein Sicherheitsproblem |

## 8. Fachrichtungen jenseits der Netzwerktechnik

Die entscheidende Einsicht: **Der Rahmen ist fachneutral, der Kern ist es nicht.** Das
Netzwerk-Labor hat 20.787 Zeilen Code, davon ist der weitaus größte Teil Netzwerk-Simulation
und Netzwerk-Oberfläche. Übertragbar ist der Rahmen darum herum.

| Rahmen (fachneutral, wiederverwendbar) | Fachinhalt (heute Netzwerktechnik) |
|---|---|
| Auftrags- und Kundenmodell, Fristen, Lohn | Gerätetypen (PC, Router, Switch, Server, Firewall) |
| Abnahme: Ziele, Regression, Neustart-Test | Kabel, Ports, VLAN, ACL, NAT, DHCP, DNS |
| Leitner-Lernmotor, Kompetenzkarte | 27 Fertigkeiten und ihre 6 Regionen |
| Gamification (Ruf, Euro, Karriere, Abzeichen) | IOS-Konsole, Windows-Terminal, PDU-Ansicht |
| Hilfeleiter 0–6, Mini-Ticket-Format | 36 Fehlerarten der Netzwerktechnik |
| Autorenwerkzeug, Paketformat, Klassenraum | 5 Netzvorlagen, 27 Wiki-Seiten, Lehrtexte |
| Determinismus, Bau- und Auslieferungswege | AP1/AP2-Bezug der IHK-Prüfung |

### Andocken je Fach

| Fach | Was der Kern können müsste | Aufwand | Anmerkung |
|---|---|---|---|
| **Elektronik** | Schaltplan, Messpunkte (Spannung/Strom/Logikpegel), Bauteilfehler | 🆕 groß | braucht Fachberatung und Messmodell |
| **Mechatronik / SPS** | Signalfluss, Zeitdiagramm, Schrittkette, Sensorik | 🆕 groß | Zeitverhalten ist ein eigenes Simulationsproblem |
| **Pflege** | Prozesskette, Vitalwerte, Dokumentationspflichten | 🆕 mittel–groß | **keine Personen simulation**; nur Prozess und Doku, ethisch und rechtlich heikel |
| **Logistik** | Lagerlayout, Wege, Kommissionierung, Engpässe | 🆕 mittel | am nächsten an der vorhandenen Idee „Netz aus Knoten und Wegen" |
| **Prozedur-/Wissensfächer** (Arbeitssicherheit, Hygieneschulung, Dokumentation) | nichts Neues: Reihenfolge-, Zuordnungs- und Wahlaufgaben | ➡️ **heute schon möglich** | das Mini-Ticket-Format hat bereits 92 Beispiele und drei Aufgabentypen (`src/daten/mini.js:4`) |

**Empfehlung:** Wenn ein zweites Fach bewiesen werden soll, dann mit einem **Prozess- oder
Prozedurthema** (Logistik/Pflege-Dokumentation) — dort trägt der vorhandene Rahmen fast
alles, und der Beweis „dieselbe Plattform, anderes Fach" gelingt in Monaten statt Jahren.
Elektronik und Mechatronik nur mit einem zahlenden Fachpartner.

## 9. Geschäftsmodell

### Zuerst die Lizenzfrage — sie entscheidet alles andere

Gemessen in `LIZENZ.md` und `LICENSE`: Das Projekt steht unter **PolyForm Noncommercial
License 1.0.0**, Copyright Vexx-oss.

- **Bildungseinrichtungen dürfen heute kostenlos nutzen** — auch wenn sie Kursgebühren
  nehmen (Definition „Noncommercial Organizations" der Lizenz).
- **Kommerzielle Nutzung ist ausgeschlossen**; die Lizenz verlangt ausdrücklich eine
  gesonderte Erlaubnis („Commercial users must contact the licensor to purchase a
  commercial-use license").
- Der Rechteinhaber ist der Autor selbst — er **kann** diese Erlaubnis erteilen. Das ist
  die rechtliche Grundlage des ganzen Vorhabens (Dual Licensing).

Daraus folgen drei Sätze, die man nicht wegdiskutieren kann:

1. **Für Schulen bleibt der Kern frei.** Das ist kein Verlust, sondern das stärkste
   Vertriebsargument: Eine Lehrkraft kann heute anfangen, ohne Beschaffung.
2. **Ausbildungsbetriebe brauchen eine kommerzielle Lizenz** — nach meiner Auslegung sind
   sie keine Bildungseinrichtung im Sinne der Lizenz (Auslegung, keine Rechtsprüfung). Das
   ist der natürlichste Erlösstrom und gleichzeitig eine offene Rechtsfrage
   (§ 12, Entscheidung 1).
3. **Die Plattform-Schicht ist ein eigenes Werk** (Server, Lehrerkonsole, Werkstatt,
   Marktplatz). Sie kann kommerziell lizenziert werden, unabhängig vom Spielkern.

### Lizenzmodelle

| Modell | Für wen | Empfehlung |
|---|---|---|
| **Standortlizenz je Schule/Jahr**, Klassenstaffel | Berufsschulen, Schulen | **Empfehlung** — keine Zählung, passt zum Haushaltsjahr |
| Klassenlizenz je Schuljahr | einzelne Lehrkraft als Einstieg | guter Einstieg, schlecht als Dauerform |
| Sitzplatzlizenz je Azubi/Jahr | Betriebe | Empfehlung für Betriebe ab ~20 Azubis |
| Träger-/Landeslizenz | Schulträger, Ministerium | der große Hebel, aber langer Vorlauf |
| Marktplatz-Anteil | Verfasser von Fachpaketen | 30 % (Vorschlag) |

**Preisvorschlag** (Vorschlag, keine Messung, bewusst moderat für den Einstieg):
Schule bis 400 Lernende 690 €/Jahr, bis 900 Lernende 1.290 €/Jahr, darüber 1.900 €/Jahr;
Einzelklasse 149 €/Schuljahr; Betrieb bis 20 Azubis 390 €/Jahr, danach 12 €/Azubi/Jahr;
30 Tage Test ohne Zahlungsdaten; Supportvertrag 15 %/Jahr.

### Was den Preis rechtfertigt

1. **Funktioniert ohne Internet** — in vielen Klassenzimmern die einzige verlässliche Lösung.
2. **Daten bleiben im Haus** — kein Cloud-Anbieter, kein Drittland, minimale Daten.
3. **Faire Aufgaben:** gleicher Seed = gleiche Aufgabe für alle, deterministisch belegt.
4. **Vorbereitungszeit sparen:** Aufträge aus Bausteinen, automatische Auswertung je
   Kompetenz statt Korrekturarbeit.
5. **Inhalte selbst pflegbar** — kein Verlagszyklus, kein Warten auf ein Update.
6. **Nachweis statt Note:** 27 Fertigkeiten mit Stufen, exportierbar für Zeugnisgespräche.
7. **Qualität ist messbar:** 213 automatisierte Prüfungen, jedes Ticket wird auf „Fehler
   wirkt, Lösung heilt" getestet — das kann kaum ein Lernspiel am Markt vorweisen.

### Beschaffungswege an Berufsschulen (Deutschland)

| Weg | Ablauf | Realistische Dauer |
|---|---|---|
| **Einzel-Lehrkraft → Fachkonferenz → Schulbudget** | kostenlos testen, im Unterricht zeigen, Fachkonferenz beschließt, Schulleitung beantragt Lernmittel | 3–12 Monate |
| **Schulträger (Kreis/Stadt)** | Sachkostenträger beschafft Software; ab kommunalen Schwellenwerten Vergleichsangebote, darüber Ausschreibung | 6–18 Monate |
| **Land / Landesbildungsserver** | Rahmenvertrag oder Landeslizenz über Ministerium, Medienzentren, Lehrerfortbildung | 12–36 Monate |
| **Betrieb** | Ausbildungsleitung, Bildungskosten (steuerlich absetzbar), Angebot über IHK-Ausbildungsberater, Innung | 1–3 Monate |
| **Bildungsträger/Umschulung** | Träger kauft für Maßnahmen (ggf. über Bildungsgutschein finanziert) | 1–6 Monate |
| **Vertriebskanäle** | Webinare für Lehrkräfte, didacta/Fachmessen, Bildungsmedien-Kataloge, kostenlose Referenzschule | laufend |

**Erlösgrößenordnung (Szenario, keine Prognose):** 50 Schulen × 1.290 € = 64.500 €, dazu
200 Betriebe × 390 € = 78.000 € → rund 140.000 €/Jahr Lizenzumsatz. Davon gehen Support,
Weiterentwicklung und Vertrieb ab; das ist eine tragfähige Ein-Personen-Größe, kein
Wachstumsgeschäft.

## 10. Umsetzungsfahrplan in vier Stufen

| Stufe | Was entsteht | Voraussetzungen | Risiken | Kleinster sichtbarer Nutzen |
|---|---|---|---|---|
| **1. Klassenraum** | Klassenserver im Schulnetz, Klassencode/QR, Live-Auftrag mit Frist, Rückkanal, Lehrer-Ampel, Auswertung „was ist sitzengeblieben" | 🆕 Server, Klassenraum-Schicht, Rollen, Konfliktregeln; ✅ Auftragsmodell, Frist, Determinismus, Auswertungsdaten | Schulnetz/Firewall; Datenschutzfreigabe; Support in der ersten Stunde; Erwartung „läuft wie PowerPoint" | Die Lehrkraft drückt einen Knopf, 30 Geräte zeigen denselben Auftrag, nach 10 Minuten sieht sie, wer wo hängt — und alles funktioniert auch, wenn das Netz ausfällt |
| **2. Werkstatt** | Auftrags-Assistent (Stufe A), Wissen und Dateien pflegen, Gruppen-Differenzierung, Hausaufgaben, Klassenprüfung mit einem Seed, Paket-Export/Import, Validierung durch die Tests | ✅ Bauplan-Format, 36 Fehlerarten, 5 Vorlagen, Testlogik; ➡️ Oberfläche auf vorhandenen Bausteinen (Dialoge, Blätter, Formulare in `src/ui/`) | Erwartung „ich baue mein eigenes Spiel"; Supportaufwand; Qualität selbstgebauter Aufträge | Ein Ausbilder baut in 15 Minuten seinen ersten eigenen, automatisch geprüften Auftrag — ohne eine Zeile Code |
| **3. Mehrere Fächer und Mandanten** | Plugin-Vertrag für Simulationskerne, ein zweiter Kern als Beweis, Mehrschul-Betrieb, Inhalts-Versionierung und Freigabe, SSO/LTI, Updateweg | 🆕 Kern-Vertrag, zweiter Kern, Mandantenfähigkeit; § 8 Empfehlung: Prozess-/Prozedurthema zuerst | zweiter Kern wird unterschätzt; Support je Fach; Komplexität der Mandanten | Dieselbe Plattform trägt zwei Fachrichtungen — eine Lizenz, mehrere Fächer |
| **4. Marktplatz** | Teilen und Verkaufen von Fachpaketen, Prüfsiegel, Bewertungen, Abrechnung, Kuratierung | 🆕 Paketformat mit Signatur, Rechtsrahmen (Urheber, Haftung), Zahlungsabwicklung, Moderation | Kaltstart (keine Inhalte → keine Käufer → keine Verfasser); Qualitätsstreuung; Rechtefragen | Fremde Fachinhalte kaufen oder eintauschen — das Produkt wächst, ohne dass der Anbieter jedes Fach selbst baut |

## 11. Risiken und Gegenargumente

### Der stärkste Einwand einer Lehrkraft

> **„Ich habe 45 Minuten und 30 Geräte. Wenn das nicht auf Anhieb läuft, stehe ich vor der
> Klasse ohne Unterricht — und für die Einarbeitung habe ich keine Zeit."**

Dieser Einwand ist berechtigt, und er entscheidet über Erfolg oder Misserfolg. Sechs
Antworten, die alle im Code oder im Konzept gedeckt sind:

1. **Das Spiel läuft ohne Server.** Es gibt heute keinen Netzwerkcode — der Live-Auftrag
   ist Zusatz, niemals Voraussetzung. Fällt der Server aus, wird weitergearbeitet.
2. **Rückfalllinie ohne Netz:** Auftrags-ID oder Aufgabencode an die Tafel, alle haben
   denselben Auftrag (Determinismus). Das ist kein Notbehelf, sondern der Normalweg in
   schlecht vernetzten Schulen.
3. **Einstieg in 60 Sekunden:** Das Spiel hat einen geführten Einstieg, das erste Ticket
   ist auf eine Minute ausgelegt — getestet („salon-01 in 60 Sekunden lösbar", Testlauf).
4. **Kein Konto, kein Login, kein Passwort** für Schüler. Weniger, was schiefgehen kann.
5. **Einarbeitung in 15 Minuten**, nicht in einem Nachmittag: Ein Video, eine fertige
   Auftragssammlung für die erste Stunde, die Ampel als einzige neue Ansicht.
6. **Die Lehrkraft behält die Kontrolle:** Sie kann jederzeit in den Einzelspieler-Betrieb
   zurückschalten; die Auswertung ist ein Angebot, keine Pflicht.

### Weitere Risiken

| Risiko | Warum plausibel | Gegenmaßnahme | Frühwarnsignal |
|---|---|---|---|
| Schulnetz/WLAN fällt aus | Regelfall, nicht Ausnahme | Local-first, Code-Rückfall, Klassenserver optional | Lehrkraft bricht ersten Test ab |
| Datenschutzfreigabe dauert länger als der Verkauf | Schulrecht ist Ländersache | Datenminimierung, On-Premise, fertige Unterlagen (Verzeichnis, Löschkonzept, DSFA-Skizze) | Fragebogen des DSB unbeantwortbar |
| Supportlast in der Stunde | 30 Geräte, 30 Fehlerquellen | Selbsthilfe (Diagnoseseite), Rückfalllinie, klare Systemanforderungen | Häufige „geht nicht"-Meldungen ohne Diagnose |
| Inhalte bleiben liegen | Pflege kostet Zeit | Werkzeug in 15 Minuten, Vorlagen, geteilte Pakete | Kunde legt nach der Schulung nichts an |
| Bus-Faktor 1 | Ein Entwickler, keine Firma | Supportpartner, dokumentierte Formate, offengelegte Pakete, Zweitperson für Betrieb | Ausfall des Anbieters = Stillstand |
| Kostenlose Konkurrenz | Cisco Packet Tracer ist gratis, dazu Lernplattformen und KI-Tutoren | Positionierung: deutsch, offline, prüfungsnah (AP1/AP2), ohne Registrierung, Lehrerauswertung | Vergleich „wozu zahlen?" |
| Lizenz-Widerspruch | Kern ist noncommercial, Produkt soll verkauft werden | Dual Licensing klar trennen (Kern frei für Schulen, Plattform kommerziell), Rechtsprüfung vor dem ersten Verkauf | Erste Rechnung ohne geklärte Lizenz |
| Prüfungsversprechen | Zertifikat ohne Anerkennung ist wertlos | Nie „IHK-Zertifikat" behaupten; Kompetenznachweis mit klarer Beschreibung | Kunde fragt nach Anerkennung |
| Marktplatz-Kaltstart | Ohne Inhalte keine Käufer | Eigener Grundbestand kostenlos, Anreizprogramm für erste Verfasser | Marktplatz mit < 10 Paketen |
| iOS | Installation und Töne eingeschränkt | Fokus Android/Windows/Browser; iOS nur Web | Erste Schule mit iPads |
| Zweiter Fachkern unterschätzt | Neuer Kern ist Monatsarbeit, nicht Wochenarbeit | Nur mit Fachpartner und Budget beginnen | Fachberatung fehlt |
| Server-Sicherheit | Ein Dienst im Schulnetz ist ein Angriffsziel | Kein Internetzugang, Updates, Supportvertrag, Datenminimierung | Kein Update seit einem Jahr |

**Woran es scheitern wird, wenn nicht aufgepasst wird:** an zu vielen Fächern gleichzeitig
und an einem Server, der Zuverlässigkeit verspricht, die die Schule nicht betreiben kann.
Die Reihenfolge in § 10 ist deshalb bewusst: erst die Stunde retten, dann Inhalte, dann
Fächer, dann Markt.

## 12. Offene Entscheidungen (mit Empfehlung)

1. **Lizenzweg: Dual Licensing oder alles frei?** → *Empfehlung: Dual Licensing.* Der Kern
   bleibt für Bildungseinrichtungen frei (heutige Lizenz), die Plattform-Schicht und die
   Nutzung in Betrieben werden kommerziell lizenziert. Rechtlich vor dem ersten Verkauf
   klären; die heutige Lizenz verbietet kommerzielle Nutzung ausdrücklich.
2. **Betriebsmodell: On-Premise oder gehostet?** → *Empfehlung: On-Premise als
   Voreinstellung*, gehosteter Container je Schule als Option. Datenschutz und
   Ausfallverhalten sind damit einfacher, und der Server darf ausfallen.
3. **Identität: Pseudonym oder Klarname?** → *Empfehlung: Pseudonym.* Sitzplatz-Code als
   Standard, Namen nur auf ausdrücklichen Wunsch mit geklärter Rechtsgrundlage.
4. **Erste Ausbaustufe: Live-Auftrag oder gleich Prüfungsmodus?** → *Empfehlung: nur
   Live-Auftrag plus Auswertung.* Der Prüfungsmodus ist didaktisch heikel (Aufsicht,
   Identität, Anerkennung) und kommt in Stufe 2.
5. **Autorenformat: Daten jetzt, visueller Editor später?** → *Empfehlung: ja.* Zuerst der
   Assistent auf dem vorhandenen Bauplan (Stufe A), Vorlagen-Editor (Stufe B) erst, wenn
   Kunden danach fragen.
6. **Zweites Fach: welches?** → *Empfehlung: ein Prozess-/Prozedurthema* (Logistik oder
   Pflege-Dokumentation), weil dort der vorhandene Rahmen fast alles trägt. Elektronik und
   Mechatronik nur mit zahlendem Fachpartner.
7. **Kommunikation im Produkt: Chat oder nicht?** → *Empfehlung: kein Chat.* Kein
   Nachrichtenkanal zwischen Lehrkraft und Minderjährigen — das vermeidet Aufsichtspflicht-,
   Haftungs- und Datenschutzfragen vollständig.
8. **Zertifikat: eigenes Kompetenzprofil oder Prüfungsnähe?** → *Empfehlung: eigenes
   Kompetenzprofil* mit transparenter Beschreibung, ausdrücklich kein IHK-Label; die
   IHK-Notenskala dient nur als Orientierung im Übungsmodus.
9. **Preisanker: Standortlizenz oder Sitzplatz?** → *Empfehlung: Standortlizenz mit
   Klassenstaffel für Schulen, Sitzplatz für Betriebe.* Passt zu Haushaltslogik und
   vermeidet Zählstreit.
10. **Serverbetrieb: selbst oder Partner?** → *Empfehlung: selbst in Stufe 1 (klein
    halten), ab Stufe 3 ein Supportpartner je Region.* Ohne betreibende Person vor Ort wird
    Support zum Ausfallrisiko.

---

**Was dieses Dokument nicht ist:** keine Rechtsberatung, keine Preiszusage, keine
Zeitplanzusage. Schätzungen sind als Schätzung gekennzeichnet. Wer damit Geld verdienen
will, muss zuerst Entscheidung 1 (Lizenz) klären — alles andere ist danach Handwerk.
