---
tags: [FISI, Lernspiel, Netzwerk, Spieldesign]
erstellt: 2026-10-04
status: Welle 1 (S1 + S2), Welle 2 (B + C), E1 und E2 gebaut 04./05.10.2026, Zweig ausbau-1.2; Scorecard 38,0 von 60 (Ist 26,0, Ziel 39,0 = +50 %) – HALTEPUNKT nach E2; danach D → F (G Reserve)
---

# 🎮 Design – Spielspaß 2.0

⬆️ [[10-Projekte/Lernprojekte/Netzwerk-Labor/Liesmich|Netzwerk-Labor]] · baut auf [[Plan – Ausbau 1.2]] (Phasen 0/A fertig) · Vertrag: [[Architektur]]

> [!success] Stand 04.10.2026: Sitzung S1 „Sofortgefühl“ gebaut und im echten Programm abgenommen
> Funktionsprobe-Szene + Nachbesprechung in drei Blöcken · Stufenregeln (Warnungen/Haken/Versuche) · Juice an 12 Stellen + Klang (leise, Leiste stumm) · Einstieg ohne Fenster mit zwei Senior-Blasen und erster Wahl · Kabel-Meldung kurz und unten. Messwerte, Entscheidungen und Bilder: [[#14 · Stand nach S1]]. Scorecard 2/4/12 neu bewertet: **26,0 → 28,4**. **Haltepunkt – S2 beginnt erst nach dem Anspielen.**

> [!success] Stand 04.10.2026: Sitzung S2 „Bogen“ gebaut und im echten Programm abgenommen – Welle 1 fertig
> Hub „Heute“ als Startseite (1 Hauptknopf, 30 Wörter) · Aufwärmen mit drei Karten · Tagesrätsel für alle gleich, Ergebnis zum Kopieren · Fehlerdex mit 34 Fehlerarten im Lernstand · Spieltagebuch mit „Auswertung kopieren“. Scorecard 1/5/8/9/10 neu bewertet: **28,4 → 32,1**. Einzelheiten: [[#15 · Stand nach S2]].

> [!success] Stand 04.10.2026: Welle 2 „Detektiv“ fertig (Phasen B und C), im echten Programm abgenommen
> Terminal je Gerät (Windows/Linux/IOS) im Dock · Befehle werden Beweise in der Akte · Zielarten „befehl“ und „antwort“ mit drei Terminal-Aufträgen · neun Terminal-Minikarten · Abzeichen „Von unten nach oben“ · Hilfestufe 2 nennt die nächste Diagnose · Kabel, Ports und Paketschilder verraten im AP-Niveau keine Ursache mehr (R1). Abnahme „Rechner ohne Internet“ nur über das Terminal: ★★★★★, Hilfe 0. Scorecard 3/4/8 neu bewertet: **32,1 → 33,2**. Einzelheiten: [[#17 · Stand nach Phase C (Welle 2 fertig)]].

> [!warning] HALTEPUNKT 05.10.2026 nach E2 – Scorecard 38,0 von 60 (Ziel 39,0 nicht ganz erreicht)
> E2 „Kundenakte und Kompetenzkarte“ gebaut und im echten Programm abgenommen: Netz-Atlas je Kunde, Vertrauen 1–5, 21 Kundengeschichten mit Senior, offene Baustellen; Kompetenzkarte mit 27 Feldern in 6 Regionen und Nebel. Scorecard 6/7/8/9/11 neu bewertet: **36,1 → 38,0** (+46 % statt +50 %). Was die letzten 1,0 Punkte bringen könnte und warum ich nicht weitergebaut habe: [[#19 · Stand nach E2 – Haltepunkt]]. **D beginnt erst nach dem Anspielen.**

> [!success] Stand 05.10.2026: E1 „Formen, Wahl, Ereignisse“ gebaut und im echten Programm abgenommen
> Sieben Auftragsformen (Störung, Projekt, Terminal, Fernwartung, Plan-Audit, Adressplan, Hotline) · Postfach als Wahl mit Mischer (nie dreimal dieselbe Form, 1000 Postfächer im Test) · „Provisorium oder sauber?“ mit Folgeauftrag · sechs Ereignisse mit Erklärsatz. Abnahme: sechs Aufträge zeigen vier Formen, Stromausfall-Szenario (write memory rettet die Reparatur), Platzbudget hält bei jeder neuen Form. Scorecard 3/4/5/6/7/9/11 neu bewertet: **33,2 → 36,1**. Einzelheiten: [[#18 · Stand nach E1]].

> [!info] So liest du diese Notiz
> **§ 0 reicht für die Entscheidung** (eine Seite). § 1 sind die Beobachtungen, § 5 die Bausteine, § 9 die Reihenfolge, § 13 der Text für Opus. Alles dazwischen ist Nachschlagewerk.

---

## 0 · Auf einen Blick

**Befund:** Nach Phase A ist das Spiel *ruhig und verständlich*, aber es hat noch keinen **Sog**. Es gibt einen Spielzug (Einstellung ändern, bis der Haken grün ist), eine Auftragsform (33 von 37 Aufträgen sind Störungen), eine Belohnung (Zahlen, die nichts öffnen) und eine Welt ohne Gedächtnis.

**Vier Säulen** (jede Entscheidung wird daran geprüft):

| Säule | Prüffrage |
|---|---|
| 🔎 **Du bist der Detektiv** | Findet der Spieler die Ursache *selbst*, oder markiert das Spiel sie vorher? |
| 🏠 **Dein Netz, dein Ruf** | Merkt sich die Welt, was ich getan habe, und kommt es zurück? |
| 📈 **Sichtbar besser werden** | Sehe ich, was ich jetzt kann und was als Nächstes aufgeht? |
| ☕ **Kurz rein, gern bleiben** | Hat die Sitzung Anfang, Höhepunkt, Ende – und eine offene Frage für morgen? |

**Zwölf Hebel** (Details in § 5; „Kriterium“ = was auf der Scorecard steigt):

| # | Hebel | Wirkung im Spiel | Aufwand | Welle |
|---|---|---|---|---|
| 1 | **Funktionsprobe + kurze Nachbesprechung** | Nach der Abnahme *siehst* du, dass die Kasse wieder druckt (Szene, Kundenstimme), statt einen Bericht zu lesen | mittel | 1 | | –
| 2 | **Ermitteln: Stufenregeln, Akte, Verdacht** | Ursache wird gefunden, nicht gezeigt; „!“-Warnungen und Live-Haken hängen am Niveau | klein → mittel | 1 / 2 | | –
| 3 | **Fehlerdex** | 34 Fehlerarten als Sammlung: gesehen → verstanden | klein | 1 | | **3,3**
| 4 | **Hub „Heute“** | Startseite mit *einem* Hauptknopf, Aufwärmen, Feierabend mit Ausblick auf morgen | mittel | 1 | | **3,3**
| 5 | **Tagesrätsel + Klasse** | Ein Rätsel pro Tag für alle (gleicher Seed, kein Server), teilbares Ergebnis; später Netz-Codes („Fehler bauen und verschenken“) | klein → mittel | 1 / 4 | | –
| 6 | **Spielgefühl: Juice + Klang** | Alles antwortet in < 200 ms; leise synthetisierte Klänge | klein | 1 | | –
| 7 | **Einstieg in 90 Sekunden** | Statt 60-Wörter-Fenster: sofort handeln, erster Erfolg mit Probe | klein | 1 | | –
| 8 | **Werkzeugkasten & Büro** | Euro kauft *Fähigkeiten* (Kabeltester, Netzprüfer, Analyse-Modus), nicht nur Automatisierung | mittel | 2 / 4 | | **3,2**
| 9 | **Abwechslung: Formen, Postfach als Wahl, Ereignisse, Entscheidungen** | 6 Auftragsformen; Wahl zwischen Lohn/Zeit/Risiko; „Provisorium oder sauber?“ mit Folgen | groß | 3 | | –
| 10 | **Kundenakte: Netz-Atlas, Vertrauen, Geschichten, Folgen** | Kunden werden Personen mit Verlauf; dein Werk leuchtet im Atlas auf | groß | 3 | | –
| 11 | **Meisterschaft: Kompetenzkarte, Par, Gürtel, Portfolio** | Nebel lichten; Effizienz-Medaillen; Meisterprüfung; Abnahmeprotokoll zum Mitnehmen | mittel | 3 / 4 | | –
| 12 | **Messen & Abstimmen** | Lokales Spieltagebuch, Auswertung zum Kopieren, Ökonomie-Simulator | klein → mittel | 1 / 4 | | –

**Scorecard** (12 Kriterien × 0–5, § 7): **Ist 26,0 von 60 → Ziel 39,0 (+50 %)** nach den Wellen 1–3. Das ist eine begründete Experteneinschätzung nach Anspielen und Code-Durchsicht, **kein Beweis für „mehr Spaß“**; belegt wird sie durch das Spieltagebuch und einen kleinen Playtest (§ 8).

**Reihenfolge:** **Welle 1 „Sofortgefühl“** (zwei Sitzungen S1/S2, nutzt nur vorhandene Daten, geringstes Risiko) → **Welle 2 „Detektiv“** (Phasen B Netzplan + C Terminal, speist die Akte) → **Welle 3 „Welt & Abwechslung“** (Phasen D DHCP/DNS + E Formen/Ereignisse + Kundenakte + Kompetenzkarte) → **Welle 4 „Meisterschaft & Klasse“** (Par, Gürtel, Netz-Codes, Büro, Abschluss F). Nach jeder Welle: Haltepunkt, Scorecard neu bewerten, 10 Minuten Anspielen.

> [!note] Reihenfolge ab 04.10.2026 abends (Vorgabe des Nutzers): **C-Rest → E1 → E2 → D → F**, G bleibt Reserve. E hebt die Scorecard am meisten (Abwechslung, Entscheidungen, Besitz, Erzählung = Kriterien 5, 6, 7, 11); D folgt danach. Halt, sobald die Scorecard ehrlich ≥ 39,0 ist oder E2 fertig ist.

---

## 1 · Befunde (selbst gespielt am 04.10.2026, Browser-Fassung des Stands nach Phase A)

### 1.1 Was funktioniert – bleibt
- **Phase A wirkt.** Der Startzustand ist ruhig: eine Auftragszeile, vier Geräte-Fächer, ein Satz vom Coach. Man weiß, wo man hinschaut.
- **Die Simulation ist das Herzstück.** Pakete laufen wirklich, Ursachen sind herleitbar, „Was war los?“ nennt Quelle und Schicht.
- **Lernen ist eingebaut:** Hilfeleiter, „Erklär mir das“, Lernmotor, Abzeichen für *Arbeitsweisen*.
- **Stimme:** Kundentexte (Mira) und Kundenpost haben Ton – das ist die Grundlage für Figuren.
- **Ruhe-Prinzip:** „Niemand kündigt“, Leiste ohne Ton und Fokusklau. Das bleibt unverhandelbar (§ 2, R7).

### 1.2 Was bremst – zehn Befunde mit Beleg

| # | Befund | Beleg (gesehen/gemessen) | Folge |
|---|---|---|---|
| B1 | **Eine Auftragsform** | 37 handgeschriebene Aufträge: 33 Störungen, 4 Projekte (je eins pro Stufe). Generiert: 34 Fehlerarten × 5 Netzvorlagen, aber dieselbe Form | Nach 5 Aufträgen weiß man, was kommt |
| B2 | **Die Ursache wird mitgeliefert** | Beim Start von „Die Kasse findet niemanden“ trägt die Kasse schon ein gelbes „!“; die Ziele haken sich live ab. Man kann raten, bis es grün ist | Detektivarbeit entfällt; Prüfungsform (ohne Live-Haken) wird nie geübt |
| B3 | **Der Höhepunkt ist ein Bericht** | Nach der Abnahme: Dialog mit sechs Blöcken (Sterne, Zitat, Lohn, Geübtes, Abzeichen, Erklärung). Dass der Drucker wieder druckt, sieht man nicht | Peak-End schwach: der Schluss prägt die Erinnerung am stärksten |
| B4 | **Belohnung öffnet nichts** | Shop: nur Playbooks (Automatisierung) und Wartungsverträge. Keine Werkzeuge, kein Büro, keine neue Fähigkeit | Belohnung heißt „weniger selbst spielen“ |
| B5 | **Welt ohne Gedächtnis** | Kunden = Textkarten; jedes Netz entsteht je Auftrag neu; frühere Entscheidungen kommen nie zurück | Kein Besitz, keine Geschichte |
| B6 | **Keine Wahl** | Postfach nach dem ersten Auftrag: drei Aufträge desselben Kunden, alle „Einstieg“, 3–4 Min, 35–40 € | Reihenfolge ist egal |
| B7 | **Kaum Bogen** | „Heute dran“/Feierabend existieren; es fehlen Ankommen, Höhepunkt und Ausblick | Kein Grund, *morgen* wiederzukommen |
| B8 | **Lernstand ist ein Bericht** | Fließtext plus 15 Abzeichenkarten | Meisterschaft ist nicht als Landkarte sichtbar |
| B9 | **Allein** | Nichts zum Teilen oder Vergleichen – obwohl es für eine Klasse gedacht ist | Keine Gesprächsanlässe |
| B10 | **Langer Anlauf ohne Überraschung** | Stufe 2 zeigt „Ruf 1 / 16“, bei etwa +1 Ruf je Auftrag; dazwischen derselbe Auftragstyp | Das erste echte „Aha“ kommt spät |

### 1.3 Kleine Baustellen aus Phase A
- **K1** Fläche schrumpft (Opus: Zoom ≈ 35 %), wenn Inspektor *und* Simulation offen sind → **ein gemeinsames Dock mit Reitern** (Inspektor | Simulation | Terminal | Plan | Akte); Fläche behält ≥ 60 % Breite.
- **K2** Der Terminal-Knopf öffnet noch die alte Konsole im Inspektor → Phase C.
- **K3** „Schmal“ wurde als 960 px gemessen. Gemeint war der **Leiste-Modus** (`UI.modus("leiste")`, ca. 320 × 300). Den hat Phase A nicht angefasst; er wird separat geprüft (Mini-Ticket, Zähler, kein Ton).
- **K4** Kopfzeile unverändert (Euro, Ruf, Stufe, „3 offen“ – doppelt zum Postfach-Zähler –, Suche, Leiste, Thema, Einstellungen, Hilfe) → Thema/Einstellungen/Hilfe in ein ⋯-Menü.
- **K5** Das Willkommensfenster hat rund 60 Wörter, bevor man etwas tun darf → Hebel 7.
- **K6** Der Kabel-Toast (3 Zeilen Lehrtext) liegt über dem Netz und verdeckt Beschriftungen → kürzer, unten, nicht über der Fläche.
- **K7** Versionsnummer zeigt noch 1.1.0 → Phase F.

> [!warning] Was ich nicht geprüft habe
> Die .exe selbst, den Leiste-Modus, Ton, den Prüfungstag und spätere Stufen. Die Browser-Fassung war ca. 15 Minuten Anspielen plus Datenabfragen (Aufträge, Fertigkeiten, Fehlerarten).

---

## 2 · Spielregeln für jede Entscheidung

| | Regel |
|---|---|
| **R1** | **Erkenntnis vor Belohnung.** Das Spiel markiert eine Ursache nie vor der Diagnose – außer im Niveau *Einstieg* oder gegen bezahlte Hilfe. |
| **R2** | **Antwort in < 200 ms.** Jede Handlung bekommt sichtbares (optional hörbares) Feedback. Fehler sind ruhig („noch nicht“), nie rot flackernd. |
| **R3** | **Jede Sitzung hat Anfang, Höhepunkt, Ende** – und eine offene Frage für morgen. |
| **R4** | **Jede Belohnung öffnet etwas:** eine Möglichkeit, einen Ort, ein Werkzeug, eine Geschichte. Nie nur eine Zahl. |
| **R5** | **Platzbudget.** Neues erscheint im Kontext (dort, wo man es braucht), nie als Dauer-Element. Labor-Start bleibt ≤ 12 Bedienelemente, ≤ 40 Wörter, genau ein Hauptknopf (Messung wie in Phase A). |
| **R6** | **Wahl hat Folgen, aber nie Fortschrittsverlust.** Kein Auftrag, keine Stufe, kein Kunde geht verloren. |
| **R7** | **Ruhe.** Keine Zeitstrafen, kein FOMO, keine Serien-Schuld, keine Pop-up-Flut; Leiste stumm; ein Aus-Schalter für Ereignisse und Ton. |
| **R8** | **Lokal.** Nichts verlässt den Rechner, außer der Spieler kopiert es bewusst (Tagesrätsel-Text, Netz-Code, Auswertung). |

---

## 3 · Fachliche Grundlage (zum Nachlesen; keine Zahlen behauptet)

| Quelle | Kernidee | Wirkt hier in |
|---|---|---|
| **Selbstbestimmungstheorie** (Ryan & Deci) | Dranbleiben entsteht aus Kompetenz, Autonomie, Verbundenheit | Hebel 2, 5, 9, 11 |
| **Flow** (Csikszentmihalyi), **GameFlow** (Sweetser & Wyeth) | Klare Ziele, sofortiges Feedback, Anforderung ≈ Können | R2, Stufenregeln, Flow-Regler |
| **MDA** (Hunicke, LeBlanc, Zubek) | Aus Mechanik wird Dynamik wird Erlebnis – rückwärts planen | Säulen |
| **Cognitive Load** (Sweller), **Mayer** | Überflüssige Last senken, Wichtiges signalisieren | Phase A, R5, Hub |
| **Lernforschung:** Abrufübung, verteiltes Üben, Durchmischen, *erwünschte Schwierigkeiten* (Bjork), *produktives Scheitern* (Kapur) | Anstrengung beim Finden lehrt mehr als Vorgekautes | Verdacht, Mischer, Lernmotor |
| **Peak-End-Regel** (Kahneman) | Höhepunkt und Ende prägen die Erinnerung | Hebel 1, 4 |
| **Zeigarnik-Effekt** | Offene Fäden bleiben im Kopf | Feierabend-Ausblick |
| **Zielgradient** | Nähe zum Ziel motiviert | Fortschrittsbalken (vorhanden), Atlas |
| **Spielermotivationen** (Quantic Foundry, Yee) | Meisterschaft, Entdeckung, Gemeinschaft, Geschichte, Gestaltung | Kriterien 4–11 |
| **Game Feel** (Swink), *Juice it or Lose it* (Jonasson & Purho) | Kleine Rückmeldungen machen Handlung befriedigend | Hebel 6 |
| **Wordle-Muster** | Gleiches Rätsel für alle, teilbares Ergebnis, kein Server | Hebel 5 |

**Spiele als Vorbild (nicht nachbauen):** *Return of the Obra Dinn* (Schlüsse ziehen, Notizbuch) · *Papers, Please* (Entscheidungen mit Folgen) · *Opus Magnum*/Zachtronics (Par, eigene Lösung verbessern) · *PowerWash Simulator* (Vorher/Nachher ist selbst die Belohnung) · *Stardew Valley* (Tagesrhythmus, Beziehungen) · *Slay the Spire* (Varianz zwischen Läufen) · *Hacknet*/*Duskers* (Terminal-Atmosphäre).

---

## 4 · Die Spielschleife in vier Zeitmaßstäben

**4.1 Sekunden – Handlung.** Aktion → Antwort in < 200 ms: Kabel rastet ein (Klick, Port-LED pulsiert), Ping-Welle läuft sichtbar zum Ziel, der Haken „ploppt“. Fehler: leiser tiefer Ton, Hinweis „noch nicht“ plus *Warum*.

**4.2 Auftrag (3–8 Min) – sieben Schritte:**

| Schritt | Was passiert | Neu? |
|---|---|---|
| 1 Annehmen | Wahl im Postfach: Lohn · Zeit · Risiko · „Übt“ | Wahl (Hebel 9) |
| 2 Lage lesen | Brief (≤ 60 Wörter sichtbar) + Plan | Plan (Phase B) |
| 3 Ermitteln | Ping, Befehle, Paketansicht; die **Akte** sammelt Befunde | Akte (Hebel 2) |
| 4 Verdacht | „Ich vermute: Schicht … / Ursache … / Gerät …“ – vor dem Eingriff | Hebel 2 |
| 5 Eingreifen | Konfiguration, Kabel, Befehl | vorhanden |
| 6 Probe | **Funktionsprobe-Szene**: das Ergebnis im Alltag des Kunden | Hebel 1 |
| 7 Nachbesprechung | „Dein Weg“ · „Merke“ · Beute (3 Blöcke) | Hebel 1 |

**4.3 Sitzung (20–30 Min).** Ankommen im Hub (30 s) → **Aufwärmen** (3 Lernkarten, ~2 Min) → 2–3 Aufträge *verschiedener Form* → höchstens ein Ereignis → optional **Tagesrätsel** (3–5 Min) → **Feierabend**: Bilanz + „Morgen: Frau Kaya fragt wegen WLAN“ (offener Faden).

**4.4 Wochen und Monate.** Großauftrag je Stufe in drei Akten (Planen → Bauen → Abnehmen und Dokumentieren) · Kundengeschichten (Kapitel) · Kompetenzkarte (Nebel lichten) · Meisterprüfung je Region · Prüfungstag als Finale · Spezialisierung (Netzwerk / Sicherheit / Storage).

---

## 5 · Die Hebel im Detail

### Hebel 1 – Funktionsprobe und kurze Nachbesprechung (Welle 1, Sitzung S1)
**Was:** Nach bestandener Abnahme läuft 2–6 s eine **Szene**: Für jedes Ziel (max. 4 gezeigt, Rest zusammengefasst) fährt das Paket den echten Pfad (aus der Trace der Abnahme), das Endgerät *reagiert* (Drucker schiebt einen Beleg aus, „Seite lädt“-Balken am Internet, Adresse erscheint am PC, Schild „gesperrt“ bei Blockier-Zielen), dann sagt der Kunde einen Satz an *dem* Gerät, das er zuerst nutzt. Überspringbar (Esc/Klick/Leertaste). Reduzierte Bewegung: statische Haken-Liste (1,2 s).
**Danach** ein kompakter Dialog, **höchstens drei Blöcke**: ① Sterne + Lohn (Tempo-Bonus inklusive) ② **Dein Weg** – drei Chips aus Verlauf und Akte (z. B. *Ping Kasse→Drucker ✗ → Gateway geändert → Probe ✓*) ③ **Merke** (ein Satz, Tiefe nach Niveau) + „Nachlesen“. Abzeichen und Stufenfeier nur, wenn neu (die Aufstiegsfeier existiert).
**Vorher/Nachher:** die geänderten Geräte pulsieren kurz (Diff gegen das Startnetz) – kein neues Zeichnen nötig.
**Bausteine:** `spiel/szene.js` (headless: Zielart + Gerätetyp → Szenenzeile, Pfad aus Trace), `ui/szene.js` (Präfix `sz-`), Haken in `ticketFertig()` (`ui/spiel.js`), Ergebnisdialog kürzen. **Daten:** keine pro Ticket – Standardzuordnung aus Zielart (`erreichbar`, `http`, `dhcp`, `blockiert`, `konfig`, `gespeichert`) und `skin` des Zielgeräts.
**Test:** Für *jedes* Ticket (hand + generiert) liefert `Spiel.szene` mindestens eine Zeile, jede mit existierenden Geräten und gültigem Pfad.

### Hebel 2 – Ermitteln: Stufenregeln, Akte, Verdacht (Regeln: S1; Akte: Welle 2)
**Stufenregeln (sofort, klein):** Die Live-Warnungen („!“ an Geräten) und die Live-Haken der Ziele hängen am Niveau (Tabelle § 6). So wird B2 behoben, ohne etwas Neues zu bauen.
**Akte (Welle 2):** Jede Diagnose – Ping, Traceroute, Paketansicht, Terminal-Befehl, Plan-Vergleich – legt automatisch eine **Beweiskarte** ab: Quelle · Befund in einer Zeile · Schicht. Beispiel: *Ping Kasse → Drucker: Zeitüberschreitung bei R-Salon (kein Rückweg) · Schicht 3*. Karten lassen sich mit ★ markieren. Sie liegen als Reiter *Akte* im Dock (nicht als neues Dauer-Element).
**Verdacht:** Vor dem ersten Eingriff wählt man *Schicht* → *Ursache* (4 Optionen aus den Gründen der Simulation, eine richtig, drei glaubwürdig falsch) → *Gerät*. Treffer: +10 % Lohn und Abzeichen „Spürnase“. Falsch: **keine Strafe**, aber die Nachbesprechung erklärt den Unterschied („Du hattest Schicht 3 vermutet. Dagegen sprach: Der Link war oben, die ARP-Antwort kam an …“). Das ist Fehlerdiagnose statt Lösungsanzeige.
**Bausteine:** `spiel/akte.js` (hört auf Bus `trace`), `inst.akte[]`, `inst.verdacht`; Optionen aus `Sim.GRUENDE` und `DATEN.lehrtexte` (29 Gründe vorhanden).

### Hebel 3 – Fehlerdex (Welle 1, Sitzung S2)
34 Fehlerarten (`Spiel.INJEKTOREN`, mit `titel`, `erklaerung`, `quelle`, `skills`, `gruende`, `vorlagen`) werden eine **Sammlung**: unbekannt (Silhouette, „taucht ab Stufe X auf“) → **gesehen** (im Auftrag aufgetreten) → **verstanden** (ohne Hilfe gelöst). Eintrag zeigt Symptom aus Kundensicht, Ursache, *woran man es erkennt*, Quelle. Kategorienabschluss gibt einen Titel („Schicht-1-Profi“). **Die Daten gibt es schon** – das ist die billigste Sammelmotivation im ganzen Plan.
**Spielstand:** `st.dex = {[injektor]: {gesehen: tag, verstanden: tag|null}}`. **Test:** Dex enthält genau die Injektoren; Zustände überstehen Speichern/Laden.

### Hebel 4 – Hub „Heute“ (Welle 1, Sitzung S2)
Die erste Ansicht wird **eine ruhige Seite statt sechs Reitern**: Datumszeile und Serie · **eine große Karte „Dein nächster Auftrag“** (Titel, Kunde, ~Minuten, Lohn, Knopf *Annehmen* – der einzige Hauptknopf) · darunter drei kleine Kacheln: **Aufwärmen** (3 Karten) · **Tagesrätsel** · **Post** (Kunde/Ereignis, falls etwas da ist). Nach dem Tagesziel erscheint **Feierabend** mit Bilanz und *einem* Ausblick („Morgen: …“, aus der Kundenpost bzw. dem nächsten Faden). Serie bleibt, mit **Urlaubstagen** (2 pro Woche frei) und freundlichem „Willkommen zurück“ statt Schuld.
**Bausteine:** `spiel/hub.js`, `ui/hub.js` (Präfix `hb-`), als Standardansicht registriert; Andock-Leiste bleibt.

### Hebel 5 – Tagesrätsel und Klasse (Tagesrätsel: S2; Netz-Codes: Welle 4)
**Tagesrätsel:** Seed = Datum + Niveau → `Spiel.generiere(skill, seed)` – **alle in der Klasse bekommen dasselbe Netz**, ohne Server. Ergebnis zum Kopieren, ohne die Ursache zu verraten:
```
Netzwerk-Labor · Tagesrätsel #4 · AP1
★★★☆☆ · 4:12 · Hilfe 0 · 2 Versuche
🟩🟩🟨⬜
```
(🟩 beim ersten Versuch, 🟨 nach Fehlversuch, ⬜ nicht erreicht – je Ziel.) Eigene Serie; ein Rätsel pro Tag, kein Zeitdruck, nichts geht verloren.
**Fehler bauen und verschenken (Welle 4):** Im Sandkasten ein gesundes Netz wählen, 1–2 Fehler aus dem Dex einbauen (nur solche, die man *verstanden* hat – Lernen durch Lehren), als **Netz-Code** (komprimierter Text oder Datei) exportieren; ein Mitschüler importiert ihn als Auftrag „Von <Name>“. Ergebnis wieder als Text. Alles offline.
**Bausteine:** `spiel/tagesraetsel.js`, später `spiel/netzcode.js` (Kompression per `CompressionStream`, Rückfall: Klartext-JSON).

### Hebel 6 – Spielgefühl: Juice und Klang (Welle 1, Sitzung S1)
**Juice-Liste (≈ 12 Stellen):** Kabel rastet ein · Port-LED pulsiert grün · Ping-Welle bei Erfolg · Haken „ploppt“ · Sterne fliegen ein · Euro zählt hoch (vorhanden) · Gerät „atmet“, wenn es antwortet · sanftes Wackeln statt Rotflackern bei Fehlern · Stufenfeier (vorhanden).
**Klang:** mit WebAudio selbst erzeugt, keine Dateien: Klick, Link-an (zwei steigende Töne), Ping-Erfolg, Haken, Sterne-Arpeggio, „noch nicht“ (tief, leise), Stufenfanfare. Einstellung *Ton: aus / leise / normal*, Standard **leise** in der Vollansicht, **immer stumm** in der Leiste und bei nicht fokussiertem Fenster. Nichts, was nur über Klang verständlich ist.
**Bausteine:** `ui/klang.js`, kleine CSS-Animationen mit Präfix `jc-`; `prefers-reduced-motion` und `UI.bewegung()` respektieren.

### Hebel 7 – Einstieg in 90 Sekunden (Welle 1, Sitzung S1)
Das Willkommensfenster (≈ 60 Wörter) entfällt. Das Spiel startet **direkt im Labor**; der Senior spricht in zwei kurzen Sprechblasen (zusammen ≤ 25 Wörter). **Erste Handlung ≤ 15 s, erster Erfolg ≤ 90 s** mit Funktionsprobe. Danach sofort das Postfach mit *zwei* Aufträgen zur Wahl (erste echte Entscheidung in den ersten 3 Minuten). Erstes harmloses Ereignis nach ~10 Min, erstes freigeschaltetes Werkzeug nach ~15 Min, erste Akte/Verdacht beim 3. Auftrag.

### Hebel 8 – Werkzeugkasten und Büro (Werkzeuge: Welle 2; Büro: Welle 4)
Euro kauft **Fähigkeiten**, die man spürt: **Kabeltester** (zeigt Linkzustand und Kabelart auf der Fläche) · **Netzprüfer** (schaltet die „!“-Warnungen in AP-Niveaus wieder zu) · **Analyse-Modus** (Paketansicht für alle Geräte) · **Konsolenkabel** (Terminal auf Geräten ohne IP) · **Beschriftungsgerät** (Dokumentation → Sterne). *Büro-Ausbau* (Welle 4): Whiteboard (Plan an der Wand), zweiter Monitor (Dock zweigeteilt), Rack (Labor-Plätze). **Weiterbildung** schaltet Themen frei und führt zur **Spezialisierung** (Netzwerk / Sicherheit / Storage & Cloud – passend zum Karriereziel). Playbooks bleiben (sie sind pädagogisch klug: Automatisierung nur, was man sicher kann), sind aber *eine* Ausgabe unter mehreren, nicht die einzige.

### Hebel 9 – Abwechslung: Formen, Postfach als Wahl, Ereignisse, Entscheidungen (Welle 3)
**Sechs Formen** neben Störung und Projekt: *Terminal-Forensik* (Netz unsichtbar, nur ein Rechner per Fernwartung) · *Plan-Audit* (Kundenplan hat 1–3 Fehler) · *Adressplan/Beratung* (Subnetting-Tabelle) · *Hotline* (Kunde im Alltagston, du wählst Rückfragen; Textbaum als reine Daten) · *Sicherheitsvorfall* (fremder DHCP-Server, offener Dienst) · *Rollout* (mehrere gleiche Arbeitsplätze nach Plan; Tempo nur auf Wunsch).
**Postfach als Wahl:** 3–4 Aufträge *verschiedener Kunden und Formen* mit Lohn · Zeit · Risiko · „Übt“; **Mischer** (nie dieselbe Form mehr als zweimal hintereinander; gewichtet nach Zeit seit letzter Form und fälligen Fertigkeiten).
**Ereignisse** (wie im Plan, Phase E, plus): Stromausfall (ungesicherte Konfig ist weg) · Kabelschaden · **Provider-Störung** (nicht dein Fehler – erkennen) · „Der Praktikant hat nur kurz …“ · Weiterempfehlung (neuer Kunde) · **Notfall-Anruf** (zwei Dinge gleichzeitig, du wählst die Reihenfolge) · seltene Glücksmomente (Kunde bringt Kuchen: kleiner Bonus; **Fundstück**: Altgerät mit Kommentar „NICHT ANFASSEN – Kalle“). Höchstens eines je ~15 Min aktiver Zeit, einstellbar *aus / selten / normal*, immer mit Erklärsatz („Das passiert in echt, weil …“).
**Entscheidung „Provisorium oder sauber?“** (~8 Aufträge): *Provisorium* = kürzere Ziele, Lohn × 0,6, setzt eine Schuld-Markierung, die **nach ca. 3 Aufträgen** einen Folgeauftrag auslöst („Das Provisorium von neulich …“); *sauber* = volle Ziele inkl. Sicherung und Dokumentation, mehr Lohn, mehr Vertrauen. **Datenform:** `ticket.varianten:[{id, ziele, lohnFaktor, folge:{ticket, nach}}]`. Keine Strafe, nur Konsequenz.

### Hebel 10 – Kundenakte: Atlas, Vertrauen, Geschichten, Folgen (Welle 3)
Pro Kunde (aus den 7 vorhandenen): **Netz-Atlas** – das dokumentierte Netz (Plan-Erzeuger aus Phase B), dessen Geräte „aufleuchten“, wenn du dort gearbeitet hast; vollständig = „Kunde komplett betreut“. **Vertrauen** (1–5): steigt durch saubere Lösungen; schaltet **Kundengeschichten** frei (3 kurze Kapitel je Kunde mit einer kleinen Wendung und einem Rätsel), Empfehlungen und kleine Rabatte. **Figuren:** der Senior (Mentor, stellt Gegenfragen statt Lösungen, trocken-warm), Mira (Salon), Heinz (Bäckerei) … je drei Sätze Charakter, Redewendungen und ein einfaches SVG-Gesicht. **Folgen:** Schuld-Markierungen aus Hebel 9 erscheinen im Kundenblatt als „offene Baustelle“.
**Spielstand:** `st.kundenakte[kunde] = {vertrauen, kapitel, atlas:[geraeteIds], schulden:[]}`.

### Hebel 11 – Meisterschaft: Karte, Par, Gürtel, Portfolio (Karte: Welle 3; Rest: Welle 4)
**Kompetenzkarte** ersetzt die Textliste im Lernstand: die **27 Fertigkeiten** als Landkarte in sechs Regionen (Adressierung · Switching/VLAN · Routing · Dienste · Sicherheit · Betrieb/Storage). Zustände: *Nebel* (nur Nachbarfelder sichtbar) → gesehen → geübt (Einstieg) → sicher (AP1) → **Meister** (AP2), gespeist aus dem Lernmotor. Klick auf ein Feld: Mini-Übung, Wiki, passender Auftrag.
**Par:** Jede Referenzlösung (`Spiel.loesung`) hat eine Schrittzahl. Wer weniger oder gleich viele Schritte braucht, bekommt eine Medaille – **optional** („Besser machen“ spielt dasselbe Netz erneut). **Gürtel** je Region (Weiß bis Schwarz) + **Meisterprüfung** (5 Aufgaben ohne Hilfe). **Portfolio:** Nach jedem Großauftrag lässt sich ein **Abnahmeprotokoll** und der **Netzplan als Bild** exportieren – echte Unterlagen für Berichtsheft und Projektdokumentation.

### Hebel 12 – Messen und Abstimmen (Tagebuch: S2; Simulator: Welle 4)
**Spieltagebuch** (lokal, letzte 500 Ereignisse): Sitzungen, Aufträge (Form, Niveau, Dauer, Sterne, Hilfe, Versuche), „weiter?“ (nächster Auftrag < 120 s). Knopf *Auswertung kopieren* erzeugt eine kurze Textzusammenfassung zum Einfügen in den Chat – damit werden Aussagen wie „fühlt sich langweilig an“ zu Zahlen.
**Ökonomie-Simulator** (`tools/oekonomie.js`, Node): spielt Stufenverläufe mit Annahmen durch und prüft Taktung (Ziel: Stufe 1 → 2 in ≈ 45–60 Min aktiver Zeit; passiv ≤ ⅓ von aktiv; kein Auftragstyp > 2× in Folge).
**Flow-Regler:** zwei Fehlschläge hintereinander in einer Fertigkeit → Gerüst (zusätzlicher Hinweis, kleinere Variante); drei Glanzergebnisse → mehr Verwicklung (zweiter Fehler, weniger Hinweise). Sichtbar in den Einstellungen („Anpassung: automatisch / manuell“), nie als Etikett am Spieler.

---

## 6 · Stufenregeln (Einstieg / AP1 / AP2)

Passt zu „erst beibringen, dann abfragen“ und macht aus dem Niveau eine echte Prüfungsübung.

| Mechanik | Einstieg | AP1 | AP2 |
|---|---|---|---|
| Live-Warnungen („!“ am Gerät) | an | erst ab Hilfestufe 2 | aus (Werkzeug *Netzprüfer*) |
| Live-Haken der Ziele | an, mit Grund | an, ohne Grund | erst bei Abnahme |
| Verdacht vor dem Eingriff | freiwillig (Bonus) | Pflicht für ★★★ | Pflicht |
| Plan | voller Netzplan | Skizze + Tabelle | Tabelle oder Skizze mit Lücken |
| Terminal-Vorschlag | Vorschlagszeile | nur Tipp nach Fehler | keiner |
| Abnahmeversuche | frei | −½ Stern ab Versuch 2 | −1 Stern ab Versuch 2 |
| Funktionsprobe-Szene | ausführlich | kurz | kurz |

---

## 7 · Scorecard (Rubrik, Ist, Ziel)

Jedes Kriterium wird mit einer **Prüffrage** bewertet (0 = nein, 5 = durchgehend ja). Bewertet wird nach jedem Haltepunkt von dir (oder mir) *am echten Programm*, mit kurzer Begründung in der Notiz.

| # | Kriterium | Prüffrage (5 = …) | Ist | nach S1 | nach S2 | nach C | nach E1 | nach E2 | Ziel | Hebt vor allem |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | Orientierung & Ziele | …man weiß in 5 Sekunden, was zu tun ist, auf jedem Bildschirm | 3,5 | – | **3,8** | – | – | – | 4,0 | Hub, Akte |
| 2 | Feedback & Spielgefühl | …jede Handlung antwortet sofort, Erfolge *fühlen* sich an | 2,5 | **3,5** | – | – | – | – | 3,8 | 1, 6 |
| 3 | Herausforderung & Flow | …Aufgaben passen sich Können an, Fehlschlag frustriert nicht | 3,0 | – | – | **3,3** | **3,4** | – | 3,6 | 2, 12 |
| 4 | Entdeckung | …die Ursache wird selbst gefunden, nie vorher markiert | 2,0 | **2,6** | – | **3,3** | **3,4** | – | 3,6 | 2, 3 |
| 5 | Abwechslung | …nie dieselbe Form > 2× in Folge, Überraschungen mit Sinn | 1,5 | – | **2,0** | – | **3,0** | – | 3,0 | 5, 9 |
| 6 | Bedeutsame Entscheidungen | …Wahlen verändern Lohn, Risiko, spätere Aufträge | 1,5 | – | – | – | **2,6** | **2,8** | 2,8 | 9, 10 |
| 7 | Besitz & Welt | …man sieht *sein* Werk wachsen; die Welt erinnert sich | 2,0 | – | – | – | **2,3** | **2,9** | 3,0 | 8, 10 |
| 8 | Meisterschaft sichtbar | …man sieht, was man kann und was als Nächstes aufgeht | 2,5 | – | **3,1** | **3,2** | – | **3,4** | 3,4 | 3, 11 |
| 9 | Sitzungsbogen & Rückkehrgrund | …Anfang, Höhepunkt, Ende, offener Faden für morgen | 2,0 | – | **3,2** | – | **3,3** | **3,4** | 3,4 | 4, 5 |
| 10 | Klasse & Teilen | …man kann mit Mitschülern vergleichen, spielen, sich helfen – ohne Server | 0,5 | – | **1,6** | – | – | – | 1,8 | 5 |
| 11 | Figuren & Erzählung | …Kunden sind Personen mit Verlauf, der Senior hat Haltung | 2,0 | – | – | – | **2,2** | **3,0** | 3,0 | 10 |
| 12 | Einstieg | …erste Handlung < 15 s, erster Erfolg < 90 s, Wahl < 3 Min | 3,0 | **3,8** | – | – | – | – | 3,6 | 7 |
| | **Summe (von 60)** | | **26,0** | **28,4** | **32,1** | **33,2** | **36,1** | **38,0** | **39,0** | **+50 %** |

*„nach S1“: nur die Kriterien, die S1 laut Auftrag neu bewertet (2, 4, 12); „nach S2“: 1, 5, 8, 9, 10; „nach C“ (Ende Welle 2, B + C): 3, 4, 8; „nach E1“: 3, 4, 5, 6, 7, 9, 11; „nach E2“: 6, 7, 8, 9, 11. „–“ = unverändert gegenüber der Spalte davor. Begründungen in [[#14 · Stand nach S1]], [[#15 · Stand nach S2]] und [[#17 · Stand nach Phase C (Welle 2 fertig)]] [[#18 · Stand nach E1]] und [[#19 · Stand nach E2 – Haltepunkt]].*

*Hinweis:* Welle 4 (Netz-Codes, Par, Gürtel, Büro) ist Reserve und hebt vor allem 8, 10 und 11 weiter; sie gehört nicht zur +50 %-Zusage.

---

## 8 · Messen

**Verhaltensmaße aus dem Spieltagebuch (Hebel 12)** – pro Person und Woche, Vergleich *vor* und *nach* jeder Welle:

| Maß | Bedeutung | Zielrichtung |
|---|---|---|
| **Weiterspiel-Rate** | Anteil der Auftragsabschlüsse, nach denen binnen 2 Min der nächste beginnt | +50 % relativ zu Messung 0 |
| **Sitzungen pro Woche** / Median-Länge | Rückkehr und Tiefe | +50 % / 15–35 Min |
| **Erstversuch-Quote** | Flow-Kanal | 55–75 % (nicht höher: zu leicht) |
| **Hilfe-Quote** | Wird Hilfe genutzt statt aufgegeben? | sinkt über die Stufen |
| **Zeit bis erster Verdacht** | Detektivschleife angenommen? | Verdachtsquote > 60 % in AP1 |

**Playtest (30 Min, 3–5 Mitschüler, einmal vor Welle 1 = „Messung 0“, dann nach jeder Welle):** 10 Min frei spielen, laut denken lassen; Beobachter notiert **5 Reibungspunkte** und **5 Leuchtmomente**; danach 8 Fragen auf einer Skala 1–7 (angelehnt an PENS, nicht das offizielle Instrument): *Ich fühlte mich geschickt · Ich habe dazugelernt · Ich konnte selbst entscheiden, wie ich vorgehe · Ich wusste immer, was als Nächstes dran ist · Ich habe die Zeit vergessen · Ich würde meinen Mitschülern davon erzählen · Ich würde morgen weiterspielen · Ich war nie genervt.*

> [!tip] Wenn es schnell gehen soll
> Messung 0 darfst du auslassen; das Tagebuch (S2) misst ab dann. Aber ohne Vorher-Wert bleibt „+50 %“ eine Schätzung – das sage ich ehrlich dazu.

---

## 9 · Umsetzung: Wellen und Opus-Sitzungen

**Grundsätze (aus dem Projekt, unverändert):** selbst und nacheinander bauen, kein Schwarm · nach jedem Modul `sh tools/test.sh` und Git-Commit · Vertrag zuerst in `Architektur.md` · Wirkung vor Grün (Szenario im echten Programm, `cdp.py lauf`) · Klassen ↔ CSS (`tools/klassen.py`) · Platzbudget R5 mit Messung wie Phase A · nur Windows bauen.

| Welle | Sitzung | Inhalt | Abnahme (messbar/gesehen) |
|---|---|---|---|
| **1 Sofortgefühl** | **S1** | Hebel 1 (Szene + Dialog ≤ 3 Blöcke) · Stufenregeln aus § 6 (nur Warnungen/Haken/Versuche) · Hebel 6 (Juice, Klang) · Hebel 7 (Einstieg 90 s) · K6 (Toast) | Frisch → erster Auftrag: erste Handlung ≤ 15 s, Erfolg ≤ 90 s, Probe 2–6 s überspringbar, Dialog ≤ 3 Blöcke, Startbildschirm ≤ 25 Wörter; Test: Szene für alle Tickets; Niveau-Matrix; Ton aus in Leiste |
| | **S2** | Hebel 4 (Hub, Aufwärmen, Feierabend-Ausblick, Urlaubstage) · Hebel 5 (Tagesrätsel) · Hebel 3 (Fehlerdex) · Hebel 12 (Tagebuch + „Auswertung kopieren“) | Hub: 1 Hauptknopf, ≤ 40 Wörter; Tagesrätsel: gleicher Tag + Niveau → gleiches Netz (Test), Teilen-Text kopiert; Dex = 34 Injektoren (Test); Tagebuch überlebt Neustart |
| **2 Detektiv** | **B** | Plan (Phase B) · **Dock** (K1) · Akte + Verdacht (Hebel 2) · Werkzeuge v1 (Kabeltester, Netzprüfer) | Szenario „Kasse ohne Netz“ mit Plan; Akte füllt sich aus Ping/Trace; Verdacht trifft/verfehlt mit erklärter Nachbesprechung; Fläche ≥ 60 % Breite bei offenem Dock |
| | **C** | Terminal (Phase C); Befehle füllen die Akte | wie im Plan; Terminalbefehl erzeugt Beweiskarte |
| **3 Welt & Abwechslung** | **D** | DHCP, DNS (Phase D) mit Fehlerarten → neue Dex-Einträge | wie im Plan |
| | **E1** | Auftragsformen (Hebel 9), Postfach als Wahl, Mischer, Ereignisse, „Provisorium/sauber“ | 6 Aufträge zeigen ≥ 4 Formen; Stromausfall-Szenario; Mischer-Test 1000 Postfächer |
| | **E2** | Kundenakte (Hebel 10: Atlas, Vertrauen, Kapitel, Folgen) · Kompetenzkarte (Hebel 11a) | Atlas leuchtet nach Auftrag; Folgeauftrag erscheint nach Provisorium; Karte zeigt 27 Felder mit Nebel |
| **4 Meisterschaft & Klasse** | **G** | Par/Medaillen, Gürtel, Meisterprüfung, Portfolio-Export · Netz-Codes + „Fehler bauen“ · Büro/Weiterbildung/Spezialisierung · Ökonomie-Simulator · STP, OSPF | Export öffnet in einem Bildbetrachter; Netz-Code läuft Hin- und Rückweg (Test); Simulator-Bericht |
| | **F** | Abschluss (Wiki, Abzeichen, Migration, Version, Build, Gesamtdurchspiel) | wie im Plan |

**Datenformen, die in `Architektur.md` ergänzt werden** (alles optional mit Standardwert, Migration `v:1 → v:2`):

```js
st.dex           = { [injektor]: { gesehen:"2026-10-04", verstanden:null|"2026-10-05" } }
st.tagesraetsel  = { serie:0, [tagId]: { sterne, sek, hilfe, versuche, zeile } }
st.tagebuch      = [ { t, art:"auftrag-ende"|"sitzung", form, niveau, sek, sterne, hilfe, versuche, weiter } ]   // höchstens 500
st.kundenakte    = { [kunde]: { vertrauen:1..5, kapitel:0..3, atlas:[geraeteId], schulden:[{id, seit}] } }
st.einst.ton     = "aus"|"leise"|"normal"
inst.akte        = [ { n, art:"ping"|"trace"|"befehl"|"plan", von, nach, befund, schicht, grund:null, wichtig:false } ]
inst.verdacht    = { schicht, grund, geraet, t, treffer:null|"schicht"|"voll" }
ticket.varianten = [ { id:"provisorium", ziele:[…], lohnFaktor:0.6, folge:{ ticket:"salon-04-folge", nach:3 } } ]
Spiel.szene(inst, abnahme) → [ { ziel, art:"druckt"|"seite"|"adresse"|"gesperrt"|"haken"|"sicherung", pfad:[geraeteId], text } ]
```

---

## 10 · Risiken und Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| **Mehr Funktionen = wieder zu voll** (genau deine Kritik) | R5 Platzbudget mit Messung; Neues erscheint im Kontext und nach Stufe; Hub statt Reiterflut |
| **Scorecard ist subjektiv** | Prüffragen, Begründung in der Notiz, Tagebuch + Playtest als Gegenprobe; Zusage nur „Schätzung +50 %“ |
| **Inhalte (Geschichten, Hotline, Ereignisse) sind viel Text** | Umfang begrenzt: 7 Kunden × 3 Kapitel; Texte kurz; fachlich geprüft und mit Quelle; Aufteilung auf die Sitzungen |
| **Animation/Ton belasten WebView2 (≈ 0,5 GB im Leerlauf)** | CSS/SVG statt Canvas-Schleifen; Szene nur 2–6 s; Ton per WebAudio ohne Dateien; messen mit `tools/messen.ps1` |
| **Manipulatives Design schleicht sich ein** | R6/R7; keine Zeitstrafen, keine Serien-Schuld; Pausenhinweis nach 60 Min; Ereignisse und Ton abschaltbar |
| **Simulationsänderungen brechen alte Tickets** | Golden-Tests einfrieren (`sim-golden`); Pflichtvalidierung jedes Tickets bleibt |
| **Agenten bauen daneben** | Kein Schwarm; Spieler-Szenario je Sitzung; „Wird es aus Ticket/Oberfläche aufgerufen?“ als Abnahmefrage |

> [!bug] Ehrliche Grenze
> „Spielspaß“ lässt sich nicht beweisen, nur annähern. Diese Notiz erhöht die Wahrscheinlichkeit, dass das Spiel trägt, und sorgt dafür, dass wir es *merken*, wenn es das nicht tut.

---

## 11 · Gegenlesen: was sich in den zwei Durchgängen geändert hat

**Durchgang 1** (Entwurf gegen deine Kritik „zu viel auf einmal“ geprüft)
- Zu viele neue Dauer-Elemente → **R5 Platzbudget** und „Hub statt Reiter“; Akte/Plan/Terminal teilen sich *ein* Dock (K1).
- „+50 %“ war eine Behauptung → **Rubrik mit Prüffragen**, Ist/Ziel je Kriterium, Tagebuch und Playtest.
- Reiz-Mechaniken können manipulieren → **R6/R7**, Urlaubstage statt Serien-Verlust, Pausenhinweis.

**Durchgang 2** (gegen Machbarkeit und Reihenfolge geprüft)
- Akte braucht Plan und Terminal als Quellen → nur die **Stufenregeln** kommen sofort (S1), die **Akte** in Welle 2.
- Welle 1 nutzt *nur vorhandene Daten* (Ziele, Traces, Injektoren, Lernmotor) → geringstes Risiko, größter sofortiger Effekt (Peak-End, Sammeln, Bogen).
- **Verschoben oder gestrichen:** Azubi-Mitarbeiter, der Aufträge lernt (Backlog) · Rivale-Systemhaus · kosmetische Büro-Spielerei vor Welle 4 · Ranglisten (bräuchten Server, widersprechen R8) · Hintergrundmusik (nur Effekte).
- Die zwei **Quick-Win-Sammler** (Fehlerdex, Tagesrätsel) kommen früh, weil sie aus vorhandenen Daten entstehen und in der Klasse Gesprächsanlass sind.

---

## 12 · Entscheidungen (Standard gilt, außer du widersprichst)

| Frage | Standard |
|---|---|
| Ton | Standard *leise* in der Vollansicht, Leiste immer stumm, jederzeit abschaltbar |
| Tagesrätsel | pro Niveau (Einstieg/AP1/AP2), Datum als Seed, Teilen nur durch Kopieren |
| Ereignisse | Standard *selten*, abschaltbar, nie Fortschrittsverlust |
| Hub | wird Startansicht; Andock-Leiste bleibt |
| Verdacht | Einstieg freiwillig, AP1 für ★★★ Pflicht, AP2 Pflicht |
| Klassen-Funktionen | alles optional und lokal; kein Konto, kein Server |
| Linux-Build | weiter nicht; nur Windows |
| GitHub | privates Repository `netzwerk-labor`; Programme (.exe) bleiben draußen |

---

## 13 · Startblöcke für Opus

**Sitzung S1** (kopieren, Arbeitsordner `Documents\Joshua`):

````text
Du arbeitest am „Netzwerk-Labor“ (Joshua/10-Projekte/Lernprojekte/Netzwerk-Labor), Zweig ausbau-1.2.
Phase 0 und A sind fertig. Jetzt kommt WELLE 1, SITZUNG S1 („Sofortgefühl“) – NICHT Phase B.

ZUERST LESEN: „Design – Spielspaß 2.0.md“ (§ 0, § 2, § 5 Hebel 1, 2 (nur Stufenregeln), 6, 7, § 6, § 9),
„Plan – Ausbau 1.2.md“ (§ 1 Leitplanken), „Architektur.md“, dann ui/spiel.js (ticketFertig, Ergebnisdialog,
Willkommen), ui/editor-pakete.js (Paketanimation), spiel/abnahme.js, ui/app.js (Einstellungen), spiel/abzeichen.js.

ARBEITSWEISE: selbst und nacheinander (kein Schwarm); nach jedem Modul sh tools/test.sh + Commit;
Datenformen zuerst in Architektur.md; jede neue CSS-Klasse mit Regel (python tools/klassen.py); nur Windows
bauen; Platzbudget R5 einhalten (Labor-Start ≤ 12 Bedienelemente, ≤ 40 Wörter, 1 Hauptknopf – wie in Phase A
messen). Entscheide Details selbst, halte sie im Commit-Text fest, berichte ehrlich auch über Fehlschläge.

AUFGABEN
1. Funktionsprobe-Szene (Hebel 1): spiel/szene.js (headless) + ui/szene.js (Präfix sz-). Läuft nach bestandener
   Abnahme 2–6 s, überspringbar (Esc/Klick/Leertaste), bei reduzierter Bewegung statische Haken-Liste.
   Pfad aus der Trace der Abnahme; Endgerät reagiert (Drucker/Seite/Adresse/Schild); Kundenzeile als Sprechblase.
   Ergebnisdialog auf höchstens drei Blöcke kürzen (Sterne+Lohn · Dein Weg · Merke), Abzeichen nur wenn neu.
   Geänderte Geräte pulsieren kurz (Diff gegen Startnetz).
2. Stufenregeln aus § 6 (nur Live-Warnungen „!“, Live-Haken, Abnahmeversuche) abhängig vom Niveau; Test-Matrix.
3. Spielgefühl (Hebel 6): Juice-Liste (~12 Stellen, Präfix jc-) und Klang per WebAudio (ui/klang.js, Einstellung
   Ton aus/leise/normal, Standard leise, Leiste und unfokussiertes Fenster stumm).
4. Einstieg in 90 s (Hebel 7): Willkommensfenster ersetzen (direkt ins Labor, Senior in zwei kurzen Sprechblasen,
   ≤ 25 Wörter), danach Postfach mit zwei Aufträgen zur Wahl.
5. Kabel-Toast (K6) kürzen und nicht über die Fläche legen.

ABNAHME (im echten Programm, python tools/cdp.py lauf …, Bildschirmfotos):
Frisch → erster Auftrag → Probe → Ergebnis → Postfach (Wahl). Messen: Zeit bis erste Handlung ≤ 15 s, Erfolg ≤ 90 s,
Probe 2–6 s, Dialog ≤ 3 Blöcke, Startbildschirm ≤ 25 Wörter. Tests: Szene für ALLE Tickets (hand + generiert);
Niveau-Matrix; Ton stumm in der Leiste. Prüfe zusätzlich den Leiste-Modus (UI.modus("leiste")) einmal separat.
Danach: Scorecard-Kriterien 2, 4 und 12 selbst neu bewerten (mit Begründung) und in „Design – Spielspaß 2.0.md“
eintragen. Build neu, Notiz aktualisieren, HALTEPUNKT – nicht mit S2 beginnen.
````

**Sitzung S2** (nach dem Anspielen von S1): gleicher Kopf, aber *„SITZUNG S2 („Bogen“)“*, Aufgaben: Hub „Heute“ (Hebel 4: Hauptkarte, Aufwärmen, Tagesrätsel-Kachel, Feierabend mit Ausblick, Urlaubstage) · Tagesrätsel (Hebel 5) · Fehlerdex (Hebel 3) · Spieltagebuch mit „Auswertung kopieren“ (Hebel 12). Abnahme laut § 9; danach Scorecard 1, 5, 8, 9, 10 neu bewerten.

Verwandt: [[Plan – Ausbau 1.2]] · [[Konzept – Netzwerk-Labor]] · [[Architektur]] · [[10-Projekte/Lernprojekte/FISI-Spielhalle/Liesmich|FISI-Spielhalle]]

---

## 14 · Stand nach S1

*Gebaut und abgenommen am 04.10.2026 (Opus, Zweig `ausbau-1.2`, 8 Commits). Alles hier ist im echten Programm gesehen: `Programm/Netzwerk-Labor.exe` (gebaut 04.10. 15:25), Szenario per `python tools/cdp.py lauf`, keine JS-Fehler. Bilder und Messdateien: `Nachweise/1.2-S1/` (im Vault, nicht im Git).*

### Abnahme (Frisch → erster Auftrag → Probe → Ergebnis → Postfach mit Wahl)

| Messung | Soll | Ergebnis |
|---|---|---|
| Startbildschirm: Text des Seniors | ≤ 25 Wörter | **23 Wörter** in zwei Blasen (11 + 12); kein Fenster, kein Klick vorab |
| Labor-Start (Messung wie Phase A, R5) | ≤ 12 Elemente, ≤ 40 Wörter, 1 Hauptknopf | **12 · 29 Wörter (30 mit Blase 2) · 1** – in 1366×768 und 960 px |
| Zeit bis erste Handlung | ≤ 15 s | Spiel ist nach **0,3 s** bedienbar; im Skript (mit 3 s „Lesepause“) Kabel nach **4,7 s** |
| Erster Erfolg (Abnahme bestanden) | ≤ 90 s | **14,6 s** im Skript (Kabel, Ping mit Vorhersage, Abnahme) |
| Funktionsprobe | 2–6 s, überspringbar | **2,95 s**; Esc überspringt (0,6 s); reduzierte Bewegung: Haken-Liste **1,2 s** |
| Ergebnisdialog | ≤ 3 Blöcke | **3** (Sterne + Lohn · Dein Weg · Merke), 1 Hauptknopf |
| Erste Wahl | < 3 Min | Ergebnis → „Nächsten Auftrag wählen“ → **2 Angebote, 2 Kunden** (Salon/Einstieg 35 € · Bäckerei/AP1 45 €) |
| Ton | leise, Leiste stumm | Vollansicht Pegel 0,18 („leise“), **Leiste und Fenster im Hintergrund 0** (Test + im Programm) |
| Leiste separat | läuft | eingeklappt unten rechts, Zähler, Mini-Ticket, kein Ton |

**Tests:** 136 grün (vorher 126): Stufenregeln-Matrix, Szene für **alle 37 handgeschriebenen und 95 generierten** Aufträge (jede Zeile mit Kabel-verbundenem Pfad bis zum Endgerät), Vorher/Nachher-Diff, Ton-Regel, erste Wahl im Postfach.

> [!warning] Ehrlich zu den Zeiten
> Erste Handlung und Erfolg sind mit einem Skript gemessen, nicht mit einem Menschen. Ein Mensch liest die 23 Wörter (~6 s) und braucht für Kabel, Ping und Abnahme eher 30–60 s – das bleibt deutlich unter 90 s, ist aber eine Schätzung, bis das Spieltagebuch (S2) echte Zeiten liefert.

### Scorecard 2, 4, 12 – neu bewertet

| # | Ist → nach S1 | Begründung |
|---|---|---|
| **2 Feedback & Spielgefühl** | 2,5 → **3,5** | Erfolg ist jetzt *sichtbar*: Paket fährt den echten Weg, der Drucker schiebt „Beleg kommt raus“, Mira bedankt sich an ihrer Kasse. Alle Haupthandlungen antworten sofort und hörbar (Kabel rastet ein + LEDs, Gerät setzen, Werkzeug/Fach, Ping atmet bzw. wackelt sanft, Haken ploppt, Sterne glänzen). **Nicht 3,8**, weil Änderungen im Inspektor (Adresse tippen) und im Terminal noch keine eigene Rückmeldung haben und die Probe bei offener Simulation auf einer kleinen Fläche läuft (K1, kommt mit dem Dock). |
| **4 Entdeckung** | 2,0 → **2,6** | B2 ist ab AP1 behoben: keine „!“-Warnungen (AP1 erst ab Hilfestufe 2, AP2 nie), in AP2 keine Live-Haken, zweiter Abnahmeversuch kostet. **Nur 2,6**, weil die meisten frühen Aufträge Einstieg sind und dort bewusst alles markiert bleibt (jetzt sogar mit Grund) und die eigentlichen Detektiv-Werkzeuge (Akte, Verdacht, Plan) erst in Welle 2 kommen. |
| **12 Einstieg** | 3,0 → **3,8** | Kein 60-Wörter-Fenster mehr; nach 0,3 s im Labor, der Senior sagt in 23 Wörtern, worum es geht; erster Erfolg mit Probe; danach die erste echte Wahl (zwei Kunden, zwei Niveaus). Über dem Ziel 3,6, aber **nicht höher**, weil es nur skriptgemessen ist und der Vorhersage-Dialog beim ersten Ping einen zusätzlichen Klick verlangt. |

**Summe 26,0 → 28,4 von 60** (nur 2/4/12 neu bewertet). Das ist meine Einschätzung am echten Programm, kein Playtest-Ergebnis.

### Entscheidungen (stehen auch in den Commits)

- **Versuchsabzug einmal**, nicht je Versuch (AP1 −½ ★, AP2 −1 ★ ab dem 2. Versuch) – Ruhe-Prinzip R7. Prüfung behält ihre eigenen Regeln.
- **„!“ verschwindet überall zugleich** (Fläche, Inspektor-Kopf, Hinweise, gelbe Feldvermutungen); rote Formatfehler bleiben.
- **Szene:** Einstieg zeigt bis 4 Ziele, AP1/AP2 bis 2 und schneller; das erste Paket verwirft der Router oft regulär während ARP – gezeigt wird das erste, das ankommt.
- **Dialog:** Kundenzitat steckt jetzt in der Szene; Abzeichen, Fertigkeitsstufe und Tagesziel (mit „morgen fällig“) nur als je eine Zeile im ersten Block, wenn es sie gibt.
- **Kein „Ich kenne mich aus“-Knopf** mehr; Postfach ist über die Leiste immer erreichbar.
- **Erste Wahl:** bis zum 2. erledigten Auftrag zwei Angebote verschiedener Kunden, danach wie bisher drei.
- **K6:** „nicht über der Fläche“ heißt hier „nicht über dem Netz“ – die Meldung steht unten links im Rand, den das Einpassen frei hält; einen Streifen außerhalb gibt es im Labor nicht, ohne dauerhaft Platz zu kosten (R5).
- **Spiel.einstSetzen** schreibt in einen frischen Einstellungsstand (der alte Zwischenspeicher konnte Oberflächen-Einstellungen überschreiben).

### Aufgefallen und gleich behoben

- Kundenpost-Meldung und „Alle Ziele erfüllt“ standen mitten in der Probe → warten jetzt bzw. schließen beim Bestehen.

### Offen

- **K1 Dock:** Ist die Simulation offen (passiert beim ersten Ping), läuft die Probe auf ~53 % Zoom. Gehört zu Welle 2 (gemeinsames Dock).
- Rückmeldung für Inspektor- und Terminal-Änderungen fehlt noch (Kriterium 2).
- Zeiten mit echten Menschen messen (Spieltagebuch, S2) und die Scorecard dann gegenprüfen.

### Bildschirmfotos

Start ohne Fenster (Blase 1), Aufgabe (Blase 2), Kabel-Meldung unten:
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-S1/s1-1366-1-start.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-S1/s1-1366-3-kabel.png|420]]

Funktionsprobe und Nachbesprechung in drei Blöcken:
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-S1/s1-1366-5-probe.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-S1/s1-1366-6-ergebnis.png|420]]

Erste Wahl im Postfach · reduzierte Bewegung (960 px) · Leiste am Bildschirmrand:
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-S1/s1-1366-7-wahl.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-S1/s1-960-3-ruhig.png|320]]
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-S1/s1-leiste-desktop-ausschnitt.png|380]]

---

## 15 · Stand nach S2

*Gebaut und abgenommen am 04.10.2026 (Opus, Zweig `ausbau-1.2`, 4 Commits). Alles im echten Programm gesehen: `Programm/Netzwerk-Labor.exe` (neu gebaut), Szenario per `python tools/cdp.py lauf` in drei Teilen mit Neustart dazwischen, keine JS-Fehler. Bilder und Messdateien: `Nachweise/1.2-S2/`.*

### Abnahme

| Messung | Soll | Ergebnis |
|---|---|---|
| Hub „Heute“ (Messung wie Phase A, ohne Kopf und Andock-Leiste) | 1 Hauptknopf, ≤ 40 Wörter | **1 („Annehmen ▸“) · 30 Wörter** in 1366×768 und 960 px; nach dem Tagesziel (Feierabend) **1 („Zur Leiste“) · 35 Wörter** |
| Tagesrätsel: gleicher Tag + Niveau → gleiches Netz | Test | grün – für E, AP1, AP2 und 14 Tage je Niveau; Spielstand (Stufe, Geld, Niveau-Wahl) ändert nichts; ≥ 3 verschiedene Fertigkeiten in zwei Wochen |
| Teilen-Text kopiert | gesehen | Klick auf „Ergebnis kopieren“ im Programm → Windows-Zwischenablage enthält genau `Netzwerk-Labor · Tagesrätsel #4 · Einstieg / ★★★★★ · 0:03 · Hilfe 0 · 1 Versuch / 🟩` (mit `Get-Clipboard` ausgelesen) |
| Fehlerdex = 34 Fehlerarten | Test | grün – Dex = `Spiel.INJEKTOREN`, jede Art in einer von 8 Gruppen, mit Kundensymptom und Erkennungszeichen |
| Tagebuch überlebt Neustart | gesehen | Programm beendet und neu gestartet: 2 Sitzungen, 2 Auftragsenden (mit Niveau, Sternen, Versuchen, Weiterspiel), Dex 2/2, Rätsel und Aufwärmen noch da |

**Tests:** 144 grün (vorher 136): Fehlerdex (34 Arten, erst beim Abschluss erfasst, Hilfe ab Stufe 4 = nur „gesehen“, Ehrentitel), Tagesrätsel (Determinismus, Teilen-Text ohne Ursache, 🟨 nach Fehlversuch, verfällt am Folgetag), Hub (Serie mit Urlaubstagen, angefangener Auftrag zuerst, Feierabend mit Ausblick), Tagebuch (Weiterspiel-Rate, Neustart, höchstens 500), Spielstand v:1 → v:2.

### Scorecard 1, 5, 8, 9, 10 – neu bewertet

| # | vorher → nach S2 | Begründung |
|---|---|---|
| **1 Orientierung & Ziele** | 3,5 → **3,8** | Die Startseite beantwortet „Was jetzt?“ mit genau einer Karte und einem Knopf; ein angefangener Auftrag steht als „Weiter mit“ oben. **Nicht 4,0**, weil Postfach und Lernstand weiter lange Seiten sind und im Labor selbst noch nichts dazukam (Akte/Plan: Welle 2). |
| **5 Abwechslung** | 1,5 → **2,0** | Jeder Tag hat jetzt eigene Elemente: ein anderes Rätsel (Fertigkeit wechselt mit dem Datum) und drei Aufwärmkarten. **Nur 2,0**, weil alle Aufträge – auch das Rätsel – noch dieselbe Form „Störung“ haben; die Formen kommen mit Hebel 9 (Welle 3). |
| **8 Meisterschaft sichtbar** | 2,5 → **3,1** | Der Fehlerdex zeigt, was man schon kann (verstanden), was man nur mit Hilfe geschafft hat (gesehen) und was noch kommt („taucht ab Stufe 3 auf“); Gruppen geben Ehrentitel. **Nicht 3,4**, weil die Kompetenzkarte (Nebel, Regionen) erst in Welle 3 kommt. |
| **9 Sitzungsbogen & Rückkehrgrund** | 2,0 → **3,2** | Anfang (Hub mit Datum, Serie, „Willkommen zurück“), Aufwärmen, Höhepunkt (Auftrag mit Probe), Ende (Feierabend mit Bilanz und *einem* Ausblick „Morgen wartet …“), dazu jeden Tag ein neues Rätsel. **Nicht 3,4**, weil der offene Faden nur der nächste Postfach-Auftrag ist – Geschichten und Ereignisse (Welle 3) fehlen. |
| **10 Klasse & Teilen** | 0,5 → **1,6** | Alle mit gleichem Niveau bekommen am selben Tag dasselbe Netz – ohne Server; das Ergebnis lässt sich mit einem Klick kopieren und verrät die Ursache nicht. **Nicht 1,8**, weil es noch keinen Vergleich im Spiel und keine Netz-Codes gibt (Welle 4). |

**Summe 28,4 → 32,1 von 60.** Wieder meine Einschätzung am echten Programm, kein Playtest – ab jetzt misst aber das Spieltagebuch mit (Weiterspiel-Rate, Erstversuch, Dauer), die Zahlen lassen sich mit „Auswertung kopieren“ holen.

### Entscheidungen (stehen auch in den Commits)

- **Fehlerdex erst beim Abschluss:** Ein offener Auftrag trägt nichts in den Dex ein – sonst stünde die Ursache dort, bevor der Spieler sie findet (R1). „Verstanden“ = bestanden ohne bezahlte Hilfe (Hilfestufe < 4, dieselbe Grenze wie im Lernmotor).
- **Gruppen aus der Hauptfertigkeit** (8 Gruppen, Ehrentitel z. B. „Schicht-1-Profi“, „Türsteher“): Neue Fehlerarten aus Phase D landen automatisch in einer Gruppe; ohne passende Gruppe erscheint „Weitere“, und der Test schlägt an.
- **Tagesrätsel:** Nummer = Tage seit 01.10.2026 + 1 (heute #4); Fertigkeit aus einer festen Liste je Niveau, Seed nur aus Datum und Niveau. Niveau = feste Wahl oder Lernstand der freigegebenen Fertigkeiten; im Rätsel bleibt es fest. Ein angefangenes Rätsel verfällt still beim Programmstart am Folgetag (kein Verlust, R6).
- **Serie mit Urlaubstagen:** Je Kalenderwoche überbrücken zwei Fehltage die Serie; Fehltage vor dem Beginn der Serie verbrauchen nichts. Nach ≥ 2 Tagen Pause heißt es „Willkommen zurück!“ – nie „Serie verloren“ (R7). Die Lernmotor-Serie (Spielhalle) bleibt unverändert.
- **Hub ist Startansicht** nach dem ersten Auftrag und steht vorn in der Andock-Leiste. „Zum Postfach“ im Ergebnis heißt jetzt „Übersicht“ und führt zum Hub; die erste Wahl (zwei Angebote) bleibt im Postfach.
- **Feierabend ersetzt die Auftragskarte** – mit Auftragskarte waren es 57 Wörter; jetzt 35, „Noch einen Auftrag“ steht daneben.
- **Spieltagebuch:** Sitzung = Programmstart bis zur letzten Handlung (das Programm läuft oft stundenlang im Tray); „weiter“ = nächster Auftrag binnen 2 Minuten. Nichts verlässt den Rechner – die Auswertung ist Text, den man selbst kopiert (R8).

### Aufgefallen und gleich behoben

- Nach dem Tagesrätsel zeigte der Hub einen neuen statt des angefangenen Auftrags (Postfach sortiert Ungelesenes nach oben) → der zuletzt angefangene steht jetzt vorn.
- „0 Urlaubstage frei“ bei einer frischen Serie (Fehltage *vor* dem Beginn wurden mitgezählt) → zählen nur noch, wenn sie eine Lücke überbrücken.
- Feierabend über dem Wortbudget (57) → s. o.

### Offen

- Das Rätsel ist noch immer eine Störung wie die anderen Aufträge (Formen: Welle 3).
- Die Aufwärmkarten kommen aus dem vorhandenen Mini-Ticket-Bestand; für manche Fertigkeiten gibt es nur wenige Karten.
- Spieltagebuch-Zahlen von echten Menschen fehlen noch – erst damit lässt sich die Scorecard gegenprüfen.

### Bildschirmfotos

Hub „Heute“ nach dem ersten Auftrag · Aufwärmen:
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-S2/s2-1366-2-hub.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-S2/s2-1366-4-aufgewaermt.png|420]]

Tagesrätsel im Labor · Ergebnis mit 🟩 und „Ergebnis kopieren“:
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-S2/s2-1366-5-raetsel.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-S2/s2-1366-6-raetsel-ergebnis.png|420]]

Fehlerdex im Lernstand · Feierabend mit Ausblick:
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-S2/s2-1366-8-fehlerdex.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-S2/s2-1366-11-feierabend.png|420]]

---

## 16 · Stand nach Phase B (Welle 2, erster Teil)

*Gebaut und abgenommen am 04.10.2026 (Zweig `ausbau-1.2`, 6 Commits). Im echten Programm per `cdp.py lauf` in drei Teilen gespielt, keine JS-Fehler. Bilder und Messdateien: `Nachweise/1.2-B/`. Die Scorecard wird nach Phase C (Ende Welle 2) neu bewertet.*

### Abnahme

| Messung | Soll | Ergebnis |
|---|---|---|
| Labor-Start „Kasse ohne Netz“ (R5) | ≤ 12 Elemente, ≤ 40 Wörter, 1 Hauptknopf | **12 · 30 · 1** – unverändert, das Dock erscheint erst mit Inhalt |
| Fläche bei offenem Dock | ≥ 60 % der Laborbreite | **60,8 %** (1366 px, Reiter Simulation + Akte) · **61,1 %** (960 px, Dock 266 px) – vorher lief die Funktionsprobe bei offener Simulation auf ~53 % Zoom (K1) |
| Plan zum Auftrag | Plan neben dem Labor, Unterschied ohne Hilfe sichtbar | „Kartenzahlung tot“ (AP1): Mappe → Reiter Plan → „Neben das Labor heften“ → Klick auf die Kasse: **Plan 192.168.20.1 · Labor 192.168.20.105** (Hilfestufe 0; im AP1 ohne Markierung) → im Inspektor korrigiert → bestanden |
| Akte füllt sich | aus Ping (und Kabeltest) | Ping Kasse → Internet: Karte „Zeitüberschreitung – keine Antwort“ (Grund im AP1 verborgen) · Kabeltest: „Link oben – Signal auf beiden Seiten“ |
| Verdacht trifft / verfehlt, mit Erklärung | gesehen | Treffer vor dem Eingriff: **„🎯 Volltreffer: Falsches Standardgateway an Kasse-Theke – genau das war es.“**, Lohn „inkl. 5,00 € für den Verdacht“ · Fehlschuss: **„Du hattest Schicht 1 vermutet (…). Tatsächlich: Zahlendreher in der IP-Adresse an PC-Kasse (Schicht 3). Woran man es erkennt: Gateway im falschen Netz.“** |
| Werkzeuge v1 | im Shop, im Spiel wirksam | Kabeltester für 40 € gekauft → Rechtsklick auf ein Kabel „Kabel testen“ → Beweiskarte; Netzprüfer (150 €, ab Stufe 2) im Test |

**Tests:** 153 grün (vorher 144): Netzplan für alle 37 Hand- und 60+ generierten Aufträge (deterministisch, keine überlappenden Beschriftungen – auch umgebrochen auf 300/400 px –, kein injizierter Fehlerwert im Plan, Abweichung Plan ↔ Start = genau die Geräte der Lösung), Akte, Verdacht (vier Ursachen, genau eine richtig, passend zum Netztyp; Treffer-Stufen; Bonus nur vor dem Eingriff), Stufenregeln um den Verdacht ergänzt, Werkzeuge im Shop.

### Entscheidungen

- **Ursachen im Verdacht sind Fehlerarten** (= Fehlerdex-Einträge wie „Falsches Standardgateway“), nicht Simulationsgründe („Gateway antwortet nicht“): Ein Grund ist ein Symptom, gefragt ist die Ursache. Die drei falschen kommen aus derselben Gruppe oder einer Nachbarschicht und können im selben Netztyp vorkommen.
- **Stufenregeln für den Verdacht:** Einstieg freiwillig (+10 % Lohn bei Volltreffer vor dem Eingriff), AP1 ohne Verdacht −½ ★, AP2 −1 ★ – ein fester Abzug statt „★★★ nur mit Verdacht“, wie beim Versuchsabzug. Projekte (keine Ursache) und die Prüfung kennen keinen Verdacht.
- **Plan aus Startnetz + Referenzlösung** statt aus einer eigenen „gesund“-Fabrik: gilt ohne Handarbeit für Störungen (gesund) *und* Projekte (Ziel). Plan-Art je Niveau: Einstieg Netzplan, AP1 Skizze + Tabelle, AP2 Tabelle mit Lücken bei Gateway/DNS der Rechner.
- **„Plan ↔ Labor“** steht für das gewählte Gerät nebeneinander; markiert wird ein Unterschied nur im Einstieg (R1). „Abweichungen markieren“ gibt es auch – es zählt wie Hilfestufe 4 (−½ ★).
- **Dock-Verhalten:** Auswahl zeigt den Inspektor, außer Plan oder Akte sind offen (dort gehört die Auswahl zum Vergleich bzw. füllt das Gerät im Verdacht vor). Ein Ping bei anderem Reiter frischt die Simulation nur auf und meldet sich kurz.
- **Kabeltester im Kabelmenü** (Rechtsklick) statt als viertes Werkzeug: keine dauerhafte Schaltfläche (R5); ohne Kauf steht er ausgegraut mit „Werkzeug im Shop“ da.
- **Akte-Befund wie ein echtes Werkzeug** („Zeitüberschreitung“, „Zielhost nicht erreichbar“); Grund und Schicht zeigt die Karte nur im Einstieg.

### Offen (ehrlich)

- **B4 nur teilweise:** Projekte haben ihren Soll-Plan (der Plan zeigt das Ziel), aber noch keine eigenen Zielarten `topologie`/`adresse` und keinen Geisterplan auf der Fläche. **B5 (Plan-Audit-Aufträge)** kommt mit den Auftragsformen in Phase E.
- Im Zustand „Mappe offen“ zählt die Messung jetzt 13 statt 12 Elemente (dritter Reiter „Plan“); der Labor-Start ohne Mappe bleibt bei 12.
- Traceroute als Beweiskarte und Terminal-Befehle in der Akte folgen in Phase C.
- Der Kabel-Tooltip (Mauszeiger über dem Kabel) nennt den Grund weiterhin auch im AP-Niveau – Altbestand aus 1.0, gehört mit R1 in Phase C/D aufgeräumt.

### Bildschirmfotos

Plan neben dem Labor – Plan 192.168.20.1, Labor 192.168.20.105 · Akte mit Verdacht vor dem Eingriff:
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-B/b-1366-3-plan-vergleich.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-B/b-1366-5-verdacht.png|420]]

Nachbesprechung: Volltreffer · Fehlschuss mit Erklärung:
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-B/b-1366-6-ergebnis-volltreffer.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-B/b-1366-10-ergebnis-daneben.png|420]]

Kabeltester im Kabelmenü · schmal (960 px) mit Dock:
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-B/b-1366-8-kabelmenue.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-B/b-960-akte.png|320]]

---

## 17 · Stand nach Phase C (Welle 2 fertig)

*Gebaut und abgenommen am 04.10.2026 (Zweig `ausbau-1.2`; Phase C mit 10 Commits, davon 7 in dieser Sitzung). Im echten Programm per `cdp.py lauf` gespielt, keine JS-Fehler. Bilder und Messdateien: `Nachweise/1.2-C/`. Tests: **170 grün** (vorher 163).*

### Abnahme

| Messung | Soll | Ergebnis |
|---|---|---|
| „Rechner ohne Internet“ nur über das Terminal (Plan § C) | ipconfig → ping Gateway → nslookup → netsh → Abnahme grün | Auftrag „Backstube offline – nur per Fernwartung“ (AP1): `ipconfig` zeigt Gateway .172 · `ping 192.168.10.172` „Zielhost nicht erreichbar“ (von der eigenen Adresse = ARP ohne Antwort) · `nslookup` „Zeitüberschreitung … UnKnown“ · Router-Adresse aus dem Netzplan · `ping 192.168.10.254` 4/4 · Verdacht „Falsches Standardgateway an PC-Backstube“ · `netsh interface ip set address "Ethernet" static …` · `ping www.beispiel.de` 4/4 → **★★★★★, Hilfe 0, Volltreffer (+5 €)** |
| Befehle füllen die Akte | Beweiskarte je Diagnosebefehl | 4 Karten (ipconfig, zwei Pings, nslookup), Befund wie das echte Werkzeug |
| Platzbudget R5 beim Terminal-Auftrag | ≤ 12 · ≤ 40 · 1 | **12 · 19 · 1** (1366 px, Labor-Start nach der Mappe) |
| Zielart „antwort“ | Eingabe in der Mappe, gegen das Netz geprüft | salon-terminal (Einstieg): falsche IP → „Antwort stimmt nicht“ (ohne die richtige zu verraten), richtig → ✓, 3/3, ★★★★★ |
| Hilfestufe 2 | nennt die nächste Diagnose, nicht die Lösung | „Fang unten an: Öffne das Terminal von PC-Kasse (Doppelklick) und sieh dir mit ipconfig Adresse, Maske und Gateway an.“ |
| R1 auf der Fläche | Ursache nur, wo das Niveau Hinweise zeigt | Kabel: E „Port abgeschaltet: Schnittstelle abgeschaltet“, AP1/AP2 „Link unten“ · Paketschild: E „✗ Keine ARP-Antwort“, AP1 „✗ verworfen“ |
| Schmal (960 px) mit Terminal | lesbar, nichts verdeckt | Fläche 70 %, Terminal bricht um; die Messung zählt dann 21 Elemente/92 Wörter, weil die Terminal-Ausgabe mitzählt (kein Start-Zustand) |

### Scorecard 3, 4, 8 – neu bewertet (Welle 2 = B + C)

| Kriterium | Wert | Begründung |
|---|---|---|
| **3 Herausforderung & Flow** | 3,0 → **3,3** | Fehlschlag wird lehrreich statt teuer: Verdacht daneben kostet nichts und erklärt den Unterschied, Hilfestufe 2 gibt einen nächsten Schritt statt der Lösung, Terminal-Tipps nach Niveau (E alle, AP1 nach Fehlern, AP2 keine). **Nicht höher**, weil sich nichts von selbst an das Können anpasst – der Flow-Regler (Hebel 12) fehlt, das Niveau stellt man von Hand. |
| **4 Entdeckung** | 2,6 → **3,3** | Die Ursache wird jetzt im AP-Niveau tatsächlich selbst gefunden: Plan ↔ Labor, Beweiskarten, Hypothese vor dem Eingriff, echte Befehlsausgaben; die letzten „Verräter“ auf der Fläche (Kabel-Tooltip, ■-Symbol, Paketschild) sind weg. Die Abnahme wurde mit Hilfe 0 nur über das Terminal bestanden. **Nicht 3,6**, weil die ersten ~8 Aufträge Einstieg sind und dort bewusst alles markiert bleibt, und weil die Simulation die Gründe auf Klick weiter nennt (gewollt, aber ein naheliegender Abkürzungsweg). |
| **8 Meisterschaft sichtbar** | 3,1 → **3,2** | Neues Abzeichen „Von unten nach oben“ macht eine Arbeitsweise sichtbar, Werkzeuge im Shop zeigen, was als Nächstes aufgeht (Netzprüfer ab Stufe 2). **Nur +0,1**: Die Kompetenzkarte (Hebel 11a) fehlt noch, Lernstand bleibt eine Liste. |

**Summe 32,1 → 33,2.** Nicht neu bewertet, obwohl berührt: 1 (Akte/Plan helfen beim „Was jetzt?“ im Auftrag, aber das Dock bringt auch mehr Reiter), 2 (Terminal antwortet sofort, Pakete laufen über die Fläche) und 7 (gekaufte Werkzeuge sind Besitz) – zusammen höchstens +0,3; ich lasse sie bewusst stehen, damit die Zahl nicht schneller steigt als das Spiel.

### Entscheidungen

- **Arbeitsziele statt Netzziele:** `befehl` (passender Befehl lief fehlerfrei auf genau dem Gerät) und `antwort` (Wert aus der Ausgabe, geprüft gegen das *aktuelle* Netz). `Sim.pruefeZiel` bleibt unberührt; nur `Spiel.zielPruefen(netz, ziel, inst)` kennt sie. Ein Terminal-Auftrag darf ohne Fehler im Netz auskommen (reine Übung).
- **„Ausgeführt“ = ohne Tippfehler.** Ein Diagnosebefehl mit negativem Befund (nslookup ohne Antwort, ping auf einen unbekannten Namen) zählt als ausgeführt – genau diese Fehlschläge sind die Erkenntnis.
- **Keine neuen Fertigkeiten `lab.cli.*`:** Die Terminal-Minikarten heißen `mini-cli-*` und hängen an der Fertigkeit, um die es inhaltlich geht (ipconfig deuten → lab.gateway, nslookup → lab.dns …). So bleibt die Kompetenzkarte (E2) bei 27 Feldern, und Generator, Prüfung und Tagesrätsel ziehen keine Fertigkeit, für die es keine Fehlerart gibt.
- **Die Diagnose beginnt beim Kunden:** Hilfestufe 2 nennt die Befehle für den Rechner des ersten Ziels (beim Intranet-Auftrag PC-Albers, nicht den Server) – Adresse → Weg → Name → Dienst.
- **Vorführen im echten Terminal:** „Lösung vorführen“ legt Terminal-Schritte vorbereitet in die Eingabezeile; Enter führt aus. So sieht man die Ausgabe, und der Befehl zählt fürs Ziel.
- **Ein Regelwerk für Hinweise:** Kabel, Port-Punkte, Paketschild und Ping-Meldung folgen derselben Regel wie die „!“-Warnungen (Einstieg an, AP1 ab Hilfestufe 2, AP2 nur mit Netzprüfer).

### Aufgefallen und gleich behoben

- Windows-`nslookup` zeigte bei unerreichbarem Server dessen Namen; echtes Windows schreibt „Server: UnKnown“ (die Rückwärtsauflösung scheitert ja auch).
- Erst im echten Programm sichtbar: Das Schild an der Abbruchstelle eines Terminal-Pings nannte im AP1 „Gateway antwortet nicht“ – jetzt „✗ verworfen“.
- Abnahmeskript: Ein Klick auf den bereits aktiven Dock-Reiter klappt das Dock zu (gewollt) – der Befehl lief dann ins Leere, die Abnahme meldete das offene Ziel korrekt („Befehl fehlt“).

### Offen (ehrlich)

- **Fernwartung ist eine Geschichte, keine Regel:** In den C-Aufträgen ist das Netz sichtbar und der Inspektor geht. Die Form „Terminal-Forensik“ (Netz unsichtbar) kommt in E1.
- Der Drucker der Vorlage `lan` ist technisch ein PC mit Drucker-Aussehen – Doppelklick öffnet eine Windows-Eingabeaufforderung. Fachlich schief, stört nicht; gehört zu D (Geräte-Erweiterung).
- `lab.cli` heißt weiter „IOS-Konsole“; Wiki-Einträge für die Host-Terminals kommen in Phase F.
- Die Simulation nennt Gründe weiterhin auf Klick (auch im AP2). Das ist gewollt (Werkzeug), aber ein Abkürzungsweg – beobachten im Spieltagebuch.

### Bildschirmfotos

„Rechner ohne Internet“: Diagnose im Terminal · Plan zeigt den Router · Akte mit Verdacht · Ergebnis:
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-C/c-1366-3-terminal-diagnose.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-C/c-1366-4-plan-router.png|420]]
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-C/c-1366-5-akte-verdacht.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-C/c-1366-7-ergebnis.png|420]]

Terminal-Übung im Einstieg: Hilfestufe 2 · Antwort falsch · Antworten richtig:
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-C/c-1366-8-hilfe-naechste-diagnose.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-C/c-1366-9-antwort-falsch.png|420]]
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-C/c-1366-10-antworten-richtig.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-C/c-960-terminal.png|320]]

---

## 18 · Stand nach E1

*Gebaut und abgenommen am 04./05.10.2026 (Zweig `ausbau-1.2`, 13 Commits, darunter zwei Fehlerbehebungen außerhalb von E1: Theme-Auswahl, Linux-Terminal). Im echten Programm per `cdp.py lauf` in drei Teilen gespielt, keine JS-Fehler. Bilder und Messdateien: `Nachweise/1.2-E1/`. Tests: **187 grün** (vorher 170).*

### Abnahme

| Messung | Soll | Ergebnis |
|---|---|---|
| „Vormittag“: 6 Aufträge nacheinander | ≥ 4 Formen | Immer der Vorschlag des Hubs, Lösung per Skript: **Plan-Audit · Adressplan · Fernwartung · Plan-Audit · Adressplan · Projekt** – 4 Formen (erster Lauf vor den Korrekturen: 5 Formen), nie dreimal dieselbe, alle ★★★★★ |
| Postfach als Wahl | 3–4 Angebote, verschiedene Kunden und Formen, Lohn · Zeit · Risiko · Übt | 4 Angebote von 3 Kunden in 4 Formen (Bild 1); Marke „Form“ und „Einstieg · Risiko gering“ |
| Mischer | 1000 Postfächer | Test: 1000 × 12 Abschlüsse – nie dreimal dieselbe Form, nie dazu gezwungen, erste Angebote immer verschiedener Form, Kunden doppelt < 2 %; Story-Auftrag ist immer dabei |
| Stromausfall | ungesicherte Konfig weg, write memory rettet | salon-05 „sauber“: Port per Terminal eingeschaltet → „💾 Nicht gespeichert: SW-Salon“ → Stromausfall „was nicht gesichert war, ist weg“ (Ziele 3/5 → 0/5) → erneut + `write memory` → zweiter Stromausfall „nichts verloren“ → mit Notiz bestanden, „Aufschlag für saubere Arbeit (× 1,2)“ |
| Platzbudget R5 am Start jeder neuen Form | ≤ 12 · ≤ 40 · 1 | Fernwartung E **8·40·1**, AP1 **7·36·1** · Adressplan E **7·32·1**, AP1 **8·34·1** · Plan-Audit **12·18·1** · Hotline **12·22·1** · Provisorium/sauber **12·18·1** (gemessen nach dem Schließen der Mappe, ohne vorübergehende Toasts) |

### Was gebaut ist

- **Formen** (`spiel/formen.js`): Störung, Projekt, Terminal (C), **Fernwartung** (`forensik.js`: Fläche verdeckt, nur das Terminal eines Rechners; Fehler, die man dort findet und behebt – Adresse, Maske, Gateway, DNS am Windows-PC, Dienst am Linux-Server), **Plan-Audit** (`audit.js`: 1–3 Fehler stehen nur im Plan, man markiert sie in der Tabelle), **Adressplan** (`beratung.js` + `ui/blatt.js`: Subnetting als Arbeitsblatt, Einstieg gleich große Netze, AP1/AP2 VLSM, Zeile für Zeile), **Hotline** (`daten/tickets-hotline.js`, `hotline.js`: drei Rückfragen zur Wahl, Antworten in der Akte, gute Fragetechnik +1 Ruf).
- **Mischer** (`mischer.js`) und Postfach als Wahl (3 Angebote, ab Stufe 2 vier); Marke mit Form und „Niveau · Risiko“ am Angebot und im Hub.
- **„Provisorium oder sauber?“** (`varianten.js`) bei acht Aufträgen; Provisorium = Schuld → Folgeauftrag nach drei Abschlüssen; sauber = „Änderung gesichert“ + Änderungsnotiz.
- **Ereignisse** (`ereignisse.js`, `ui/ereignisse.js`): Stromausfall, Kabelschaden, Provider-Störung, Praktikant, Weiterempfehlung, Notfall-Anruf; aus/selten/normal (Standard selten = höchstens eines je 30 Minuten aktiver Arbeit).

### Scorecard – neu bewertet (betroffen: 3, 4, 5, 6, 7, 9, 11)

| Kriterium | Wert | Begründung |
|---|---|---|
| **5 Abwechslung** | 2,0 → **3,0** | Sieben Formen, die sich wirklich anders spielen (blind im Terminal, Arbeitsblatt, Telefonat, Tabelle prüfen), der Mischer garantiert „nie dreimal dieselbe Form“, Ereignisse bringen Überraschungen mit Erklärung. **Nicht höher**: Sicherheitsvorfall und Rollout fehlen, Terminal und Fernwartung ähneln sich, generierte Formen wiederholen ihr Muster nach ein paar Runden, Ereignisse sind im Standard selten. |
| **6 Bedeutsame Entscheidungen** | 1,5 → **2,6** | Angebote mit Lohn · Zeit · Risiko · Übt, „Provisorium oder sauber?“ mit spürbarer Folge (×0,6 und Folgeauftrag gegen ×1,2 und Mehrarbeit), Notfall: jetzt wechseln oder erst fertig machen, Hotline: welche Frage. **Nicht 2,8**: nur acht Aufträge bieten die Variante, Vertrauen als Folge kommt erst mit E2, das Risiko ergibt sich nur aus dem Niveau. |
| **7 Besitz & Welt** | 2,0 → **2,3** | Die Welt erinnert sich zum ersten Mal: Das Provisorium kommt als „Das Provisorium von neulich …“ zurück, Weiterempfehlung bringt einen anderen Kunden. Der eigentliche Hebel (Atlas, Kundenakte) ist E2. |
| **9 Sitzungsbogen & Rückkehrgrund** | 3,2 → **3,3** | Offene Fäden entstehen jetzt aus dem Spiel (Folgeauftrag, Notfall mit Frist). Der Feierabend-Ausblick nennt sie noch nicht. |
| **11 Figuren & Erzählung** | 2,0 → **2,2** | Kunden sprechen am Telefon im eigenen Ton, Folgeaufträge erzählen weiter („Heute Nacht war bei uns der Strom weg …“). Kundengeschichten und Senior mit Haltung kommen in E2. |
| **3 Herausforderung & Flow** | 3,3 → **3,4** | Das Risiko steht am Angebot – man wählt die Schwierigkeit bewusst; Formen fordern verschiedene Fähigkeiten. Automatische Anpassung fehlt weiter. |
| **4 Entdeckung** | 3,3 → **3,4** | Fernwartung (nur Befehle) und Plan-Audit (selbst vergleichen) sind reines Herausfinden; die Hotline sammelt Hinweise statt sie zu geben. |

**Summe 33,2 → 36,1.** Nicht neu bewertet: 1, 2, 8, 10, 12 (E1 berührt sie kaum).

### Entscheidungen

- **Story geht vor:** Liegt kein Story-Auftrag im Postfach, ist der nächste immer dabei (nach Reihe, nicht gesperrt); generierte Formen füllen die übrigen Plätze.
- **Keine neuen Fertigkeiten** für die Formen: Fernwartung übt lab.gateway/lab.ip/…, Adressplan lab.subnetz, Audit lab.ip – die Kompetenzkarte bleibt bei 27.
- **Provisorium nur, wo es fachlich stimmt:** Die Reparatur muss in der running-config stehen. praxis-02 (VLAN anlegen) flog raus – VLANs stehen in vlan.dat und überleben den Neustart auch ungesichert; ein Test prüft das für alle acht.
- **„Änderung gesichert“** ist erst erfüllt, wenn die startup-config nicht mehr die vom Start ist (vorher stand der Haken schon vor jeder Arbeit da).
- **Ereignisse laufen über den Verlauf** (Strg+Z holt den Stand zurück) – nie Fortschrittsverlust, die Erklärung sagt, dass es in echt nicht ginge.
- **Adressplan Zeile für Zeile:** höchstens fünf Felder zugleich (R5) – und so rechnet man VLSM ohnehin.

### Aufgefallen und gleich behoben

- **Nutzer-Meldung „Theme lässt sich nicht auswählen“:** Seit dem ersten Stand verkaufte der Shop Akzentfarben und Leistenstile, die Oberfläche hat sie nie angewendet, und für Gekauftes gab es keinen Knopf. Jetzt: Farben für Dunkel und Hell (Kontrast ≥ 4,5 : 1), Leistenstile, „Auswählen“ im Shop und Auswahl in den Einstellungen.
- **Linux-Terminal** (Phase C) hieß „Eingabeaufforderung · Windows-artig“ und schlug `ipconfig` vor – jetzt „Terminal · Linux-artig (bash)“, Vorschlag `ip a`.
- IDs generierter Formen hingen nur am Seed – gleicher Seed mit anderem Niveau lieferte den zwischengespeicherten Auftrag.
- Zwei Tests schalteten den Trockenmodus aus und ließen so den globalen Lernmotor mitlernen – ein späterer Test bekam dadurch ein anderes Niveau.

### Offen (ehrlich)

- Die Abnahme „6 Aufträge“ lief mit Lösung per Skript (Formen und Reihenfolge echt aus dem Mischer, das Lösen nicht von Hand).
- Sicherheitsvorfall (braucht D: Rogue-DHCP, Port-Security) und Rollout fehlen; Glücksmomente/Fundstück auch.
- `https` am Linux-Server lässt sich im Terminal nicht starten (apache2 schaltet nur http) – deshalb nicht in der Fernwartung (→ D).
- Der Feierabend-Ausblick nennt Folgeaufträge und Notfälle noch nicht.

### Bildschirmfotos

Postfach als Wahl · Stromausfall: ungesichert weg · mit write memory gesichert:
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-E1/e1-1366-1-postfach-wahl.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-E1/e1-1366-10-stromausfall-verlust.png|420]]
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-E1/e1-1366-11-stromausfall-gesichert.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-E1/e1-1366-9-wahl-provisorium-sauber.png|420]]

Fernwartung · Adressplan Zeile für Zeile:
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-E1/e1-1366-13-fernwartung-start.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-E1/e1-1366-14-adressplan-start.png|420]]

---

## 19 · Stand nach E2 – Haltepunkt

*Gebaut und abgenommen am 05.10.2026 (Zweig `ausbau-1.2`, 3 Commits). Im echten Programm per `cdp.py lauf` gespielt, keine JS-Fehler. Bilder und Messdatei: `Nachweise/1.2-E2/`. Tests: **191 grün** (vorher 187). `Programm/Netzwerk-Labor.exe` ist der Stand nach E2.*

### Abnahme

| Messung | Soll | Ergebnis |
|---|---|---|
| Atlas leuchtet nach einem Auftrag | ja | „Die Kasse findet niemanden“ (Salon) → Ergebnis „🗺 3 Geräte im Netz-Atlas (3/5)“; Akte: Kasse, Büro-PC, Drucker hell, „3 von 5 Geräten betreut“ |
| Folgeauftrag nach einem Provisorium | erscheint | „Die Kiste lässt niemanden raus“ als Provisorium (Abschlag × 0,6, „meldet sich in etwa drei Aufträgen wieder“) → nach drei weiteren Abschlüssen „Das Provisorium von neulich: …“ mit Marke „↩ Folgeauftrag“ im Postfach; Akte: „Folgeauftrag liegt im Postfach“ |
| Kompetenzkarte | 27 Felder mit Nebel | 27 Felder in 6 Regionen, auf Stufe 1 **13 im Nebel** („14 von 27 Feldern sichtbar“) |
| Kapitel | frei mit Vertrauen, Frage mit Erklärung und Quelle | Im Browser: „Vier Uhr morgens“ (Bäckerei) richtig beantwortet → +1 Ruf, Erklärung + Quelle IEC 62040, Kapitel als gelesen markiert |

### Was gebaut ist

- **Kundenakte** (`spiel/kundenakte.js`, Ansicht „Kunden“ → „Akte ▸“): Netz-Atlas (das dokumentierte Netz des Kunden aus dem Plan-Erzeuger; ein Gerät leuchtet, sobald man dort gearbeitet hat – geändert, geprüft, per Fernwartung betreut, im Audit korrigiert), Vertrauen 1–5 (★ ≥ 4,5 +1, „sauber“ +1, Notfall rechtzeitig +1, Provisorium nichts, sinkt nie), Geschichten, offene Baustellen, letzte Aufträge.
- **21 Kundengeschichten** (`daten/geschichten.js`): je Kunde drei kurze Kapitel mit wiederkehrenden Figuren (Miras Nichte Lea, Kowalskis Neffe Kevin, Albers' Wartungsbuch, Frau Krämer und Dr. Müller, Timo Brenner und der Seniorchef, Dr. Kessler, Jana Wolff), einem Satz des Seniors als Gegenfrage, einer Frage mit Erklärung und Quelle (BSI IT-Grundschutz, BSI 200-4, DSGVO, RFCs, IEEE, IEC, ETSI, ITIL, SNIA).
- **Kompetenzkarte** (`spiel/kompetenz.js`, Lernstand): ersetzt die Fertigkeitenliste; Nebel lichtet sich durch neue Stufen und geübte Nachbarn (Reihe in der Region + fachliche Brücken); Klick: Üben oder Nachschlagen.
- **Ergebnisdialog:** eine Zeile im Block „Dein Weg“ – Atlas, Vertrauen, neue Geschichte.

### Scorecard – neu bewertet (betroffen: 6, 7, 8, 9, 11)

| Kriterium | Wert | Begründung |
|---|---|---|
| **11 Figuren & Erzählung** | 2,2 → **3,0** | Kunden sind Personen mit Verlauf: wiederkehrende Figuren über drei Kapitel, eigene Stimme (Hotline, Folgeaufträge, Kapitel), der Senior mit Haltung (Gegenfrage statt Lösung). **Nicht höher:** kurze Szenen statt verzweigter Geschichte, keine Gesichter, das dritte Kapitel braucht rund acht saubere Aufträge beim selben Kunden. |
| **7 Besitz & Welt** | 2,3 → **2,9** | Man sieht sein Werk wachsen (Atlas je Kunde bis „komplett betreut“), die Welt erinnert sich (Vertrauen, Baustellen, Folgeaufträge, Verlauf). **Nicht 3,0:** Der Atlas ist das feste Kundennetz, nicht das selbst Gebaute; Vertrauen öffnet nur Geschichten – Empfehlungen und Rabatte aus Hebel 10 fehlen. |
| **8 Meisterschaft sichtbar** | 3,2 → **3,4** | Die Kompetenzkarte zeigt auf einen Blick, was man kann (Stufen je Feld) und was als Nächstes aufgeht (Nebel, „ab Stufe n“). Sie macht vorhandenes Können sichtbar, neue Meisterschafts-Mechanik (Par, Gürtel) gibt es erst in Welle 4. |
| **6 Bedeutsame Entscheidungen** | 2,6 → **2,8** | Die Wahl „Provisorium oder sauber?“ hat jetzt eine sichtbare zweite Folge: Vertrauen wächst nur mit sauberer Arbeit, die Baustelle steht in der Akte. |
| **9 Sitzungsbogen & Rückkehrgrund** | 3,3 → **3,4** | Lange Fäden: die nächste Geschichte bei Vertrauen n, der Atlas, der noch nicht komplett ist. Der Feierabend-Ausblick nennt sie noch nicht. |

**Summe 36,1 → 38,0 (+46 % gegenüber 26,0).** Das Ziel 39,0 ist **nicht ganz erreicht**. Ehrlich gerechnet fehlen die letzten Zehntel dort, wo E nicht hinreicht: 1 Orientierung (3,8 statt 4,0), 2 Spielgefühl (3,5 statt 3,8 – die neuen Formen haben keine eigene Funktionsprobe), 3 Flow (3,4 statt 3,6 – kein automatischer Flow-Regler), 4 Entdeckung (3,4 statt 3,6 – mehr Fehlerarten kommen mit D), 10 Klasse (1,6 statt 1,8 – Netz-Codes sind Welle 4).

### Warum Haltepunkt statt weiterbauen

Der Auftrag lautete: halten, sobald die Scorecard ehrlich ≥ 39,0 ist **oder** E2 fertig ist. E2 ist fertig. Die naheliegenden nächsten Hebel wären klein und gezielt – Vertrauen mit Folgen (Empfehlung, kleiner Rabatt), Feierabend-Ausblick mit offenen Fäden, eine kurze Funktionsprobe für Fernwartung, Adressplan und Audit, der Flow-Regler aus Hebel 12 –, aber das gehört nach dem Anspielen entschieden, nicht vorher. D (DHCP/DNS-Tiefe) habe ich wie verlangt nicht angefangen.

### Aufgefallen und gleich behoben

- Der Atlas wurde in voller Seitenbreite gezeichnet (die Größenregel des Netzplans gilt nur im Plan-Container) – jetzt in natürlicher Planbreite.
- Die richtige Antwort im Kapitel-Dialog war nach dem Klick nicht hervorgehoben (das Aussehen deaktivierter Knöpfe überdeckte es).
- Ein Test der Kompetenzkarte hatte sich verrechnet (ein geübtes Feld lichtet alle Nachbarn, nicht nur eines) – jetzt aus der Nachbarschaft berechnet.

### Offen (ehrlich)

- Vertrauen hat außer Geschichten noch keine Folgen (Empfehlungen, Rabatte).
- Für „Planwerk Architekten“ (Stufe 6) gibt es noch keine Aufträge – die drei Geschichten sind geschrieben, aber unerreichbar, bis Storage kommt.
- Der Atlas ist hoch (Ebenen-Layout); auf kleinen Bildschirmen muss man scrollen.
- Die Abnahme lief mit Lösung per Skript; Formen, Kunden und Abläufe stammen aus dem echten Spiel.

### Bildschirmfotos

Ergebnis mit Atlas-Zeile · Akte mit hellen Geräten:
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-E2/e2-1366-1-ergebnis-atlas.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-E2/e2-1366-2-akte-atlas.png|420]]

Provisorium im Ergebnis · Folgeauftrag im Postfach · Kompetenzkarte:
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-E2/e2-1366-3-ergebnis-provisorium.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-E2/e2-1366-4-postfach-folgeauftrag.png|420]]
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-E2/e2-1366-5-kompetenzkarte.png|560]]
