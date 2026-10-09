---
typ: entwurf
aktualisiert: 2026-10-09
status: fertig — Teil 2 (Lehrersicht) und Teil 1 (Gegenprüfung der vier Entwürfe), 09.10.2026
tags: [Netzwerk-Labor, Klassenraum, Gegenprüfung, Lehrersicht]
---

# Entwurf – Gegenprüfung und Lehrersicht

**Wer das schreibt.** Ich baue an diesem Auftrag keinen Code. Ich bin der fünfte Blickwinkel: Die vier
Entwürfe (`Klassenraum-Umsetzung`, `Tutor auf Sprachmodell`, `Mitnehmbarer Lernstand`, `Inhaltslücken`)
entstehen parallel, und hier steht, was von **außen** auffällt — Widersprüche, Doppelarbeit, zu
optimistische Zahlen, und was ganz fehlt. Dazu die **Lehrersicht**: 20 Azubis, 90 Minuten, wechselnde
Rechner, eine Lehrkraft, die kein Netzwerk-Profi sein muss.

**Rangfolge bei Widersprüchen:** `docs/Architektur.md` → `Klassenraum – Umsetzungsreife Spezifikation.md`
→ die vier Entwürfe → dieser Text. Jede Zahl hier ist **in dieser Sitzung gemessen**, jede Datei:Zeile
nachgesehen; was ich nicht messen konnte, steht als solches da.

**Reihenfolge:** Teil 2 zuerst (er braucht die anderen Entwürfe nicht), Teil 1 folgt, sobald die vier
in `docs/entwicklung/` liegen.

---

# TEIL 2 · DIE LEHRERSICHT

## 2.0 Was heute wirklich da ist (gemessen, nicht erinnert)

| Frage | Befund | Beleg |
|---|---|---|
| Was liefert man aus? | **eine** HTML-Datei, 2 557 214 Bytes (2,44 MB), Schriften eingebettet | `docs/index.html` |
| Wie startet sie? | Doppelklick, kein Server, kein Konto, kein Login | `src/ui/start.js:208-211` |
| Wo liegt der Fortschritt? | ausschließlich lokal im Gerät: `localStorage["netzwerk-labor"]` | `src/plattform/plattform-browser.js:6,21,28` |
| Was liegt drin? | `labor` (Spielstand), `lern` (Lernmotor), `einst` (Einstellungen), `sandbox` (freies Labor) | `src/spiel/zustand.js:139,184`; `fremd/lernmotor.js:39-40` |
| Wie groß ist das? | **48 275 Bytes** für einen gespielten Stand (6 Aufträge, 12 Buchungen, 40 Tagebuch-Einträge, 8 Dex-Einträge, 5 Kunden, 3 offene Tickets, 12 geübte Fertigkeiten) — davon `labor` 47 245 B, `lern` 1 026 B | eigene Messung, Node-Lauf mit `Spiel.laden()`/`Spiel.speichern()` |
| Wie kommt man zurück auf Anfang? | **gar nicht von der Oberfläche aus.** `Spiel.neu()` gibt es, aber niemand ruft es auf | `src/spiel/zustand.js:174-178` (Definition); Aufrufe nur in Tests: `tests/spiel-bogen.test.js:13`, `spiel-abzeichen.test.js:11`, `spiel-post.test.js:11`, `spiel-fluss-zustand.test.js:14` |
| Gibt es eine Klassensitzung, einen Code, eine Code-Eingabe? | **nein.** „Klassenraum" kommt in `src/` **null** mal vor | keine Treffer für `Klassenraum\|Auftragscode\|Ergebnis-Code` in `src/**/*.js` |
| Gibt es QR, Deep-Link, URL-Parameter? | **nein** — kein `location.search`, kein `URLSearchParams`, kein `hashchange` in `src/` | Suche in `src/**/*.js`: 0 Treffer |
| Kann ein Azubi sein Ergebnis abgeben? | Das Abschluss-Fenster zeigt Sterne, Lohn, „Dein Weg", „Merke", Wiki-Link — **kein** Kopieren, **kein** Export | `src/ui/spiel.js:494-526` |
| Kann die Lehrkraft Ergebnisse einsammeln? | Nur den **ganzen** Spielstand je Gerät: Einstellungen → „Spielstand" → Export/Import als JSON-Datei | `src/ui/karriere.js:395-400, 442-465` |
| Funktioniert es ohne Internet? | Ja — keine Netzwerkaufrufe im Spiel; die 12 Außenverweise im Doku-Erzeugnis stammen aus `README.md` selbst | `Klassenraum – Umsetzungsreife Spezifikation.md` § 0 („0 Treffer") |

**Der eine Satz, der die Lehrersicht zusammenfasst:** Das Spiel ist heute ein **Einzelspieler-Werkzeug
auf genau einem Gerät**. Alles, was eine Klasse braucht — übergeben, zuweisen, einsammeln, überblicken —
fehlt; und zwar nicht als Feinschliff, sondern als fehlende Funktion.

## 2.1 Die 90 Minuten, Minute für Minute

Jeder Schritt: **Behauptung · Beleg · Wirkung.** „FEHLT" heißt: heute nicht möglich.

### 0–10 min · Ankommen und Verteilen

| Zeit | Was passieren muss | Wie es heute aussieht |
|---|---|---|
| −1 | 20 Geräte haben das Spiel | **FEHLT als Verteiler.** Es gibt genau eine Auslieferung: Browser-Link (braucht Internet) oder die 2,44-MB-Datei kopieren. Für „kein Internet" bleibt nur Kopieren auf 20 Rechner. |
| 0–3 | 20 Azubis sitzen davor, es läuft, ohne Anmeldung | **Trägt.** Doppelklick, `UI.starten()` baut die Oberfläche allein auf (`src/ui/start.js:44-107`). |
| 3–8 | Der erste Azubi am Rechner sieht einen klaren Anfang | **Trägt für den ERSTEN.** Ohne `einstieg.fertig` und ohne erledigte Aufträge startet die Begrüßung mit der Stufenwahl (`src/ui/spiel.js:858`). |
| 3–8 | … und der zweite Azubi derselben Stunde am selben Rechner ebenso | **FEHLT.** Es gibt keinen Übergabeknopf. |
| 8–10 | Die Lehrkraft sagt EINE Sache an, und alle 20 haben denselben Auftrag | **FEHLT.** Es gibt keine Code-Eingabe und keine Sitzung — der Auftrag wird im Postfach selbst gewählt (`src/ui/spiel.js:496`, „Nächsten Auftrag wählen"). |

**Behauptung:** Der Übergang zwischen zwei Menschen am selben Rechner ist heute nicht vorgesehen.
**Beleg:** Fehlt ein offener Auftrag, beginnt das Spiel die Einführung neu (`src/ui/spiel.js:858`); ist
einer offen, steht der zweite Azubi **mitten im Auftrag des ersten** — beim Start lädt das Spiel den
offenen Auftrag (`src/ui/spiel.js:857` „aktiveLaden()"). Und zurück auf Anfang kommt man nur über
Einstellungen → Spielstand → Importieren einer leeren Datei; `Spiel.neu()` (`src/spiel/zustand.js:174`)
wird von keiner Oberfläche aufgerufen.
**Wirkung:** Bei 5 Rechnern und 20 Azubis (4 Gruppen) ist der Zustand nach der ersten Gruppe
„gebraucht": erledigte Aufträge, verdientes Geld, ein halb gelöster Auftrag. Entweder spielt die zweite
Gruppe A auf den Ergebnissen von Gruppe 1 — dann ist die Stunde für die Auswertung wertlos — oder die
Lehrkraft repariert 5 Geräte von Hand. **Das ist die Stelle, an der der Einsatz in der zweiten Stunde
abbricht.**

### 10–70 min · Arbeiten

| Zeit | Was passieren muss | Wie es heute aussieht |
|---|---|---|
| 10–15 | Alle finden denselben Auftrag | **FEHLT.** Ansage nötig: „Postfach, zweite Karte, Annehmen." Bei 20 Leuten landen erfahrungsgemäß nicht alle dort. |
| 15–60 | Die Azubis arbeiten, die Stufen greifen | **Trägt.** Der Bildungsstand steuert Vorschläge, Hilfe-Vorrat und Werkzeugleiter (`src/spiel/stufensystem.js`), der Fehlerinjektor den Schwierigkeitsgrad. || 15–60 | Aufträge sind reproduzierbar (Klassenvergleich) | **Trägt die Mechanik, FEHLT der Weg.** Der Seed steckt in der Instanz (`src/spiel/postfach.js:91-97`), aber es gibt keinen Weg, ihn anzusagen — genau dafür ist der Auftragscode der Spezifikation da. |
| 20–70 | Die Lehrkraft sieht, wer hängt | **FEHLT.** Kein Live-Stand: `store` ist rein lokal (`src/kern/basis.js:73-132`), es gibt keinen Sendeweg. |
| 20–70 | Der Unterrichtsmodus sperrt Postfach/Shop | **FEHLT.** Es gibt keinen Schalter; `Spiel.einst.unterricht` existiert als Einstellung, sperrt aber nichts. |

**Behauptung:** Ohne Zuweisung entsteht in den ersten zehn Minuten die größte Unruhe — und die Lehrkraft
merkt erst am Ende, wer auf einem anderen Auftrag war.
**Beleg:** Der Einstieg wählt **einen von zwei** Aufträgen zur Wahl (`Spiel.POSTFACH_WAHL = 2`,
`src/spiel/postfach.js:11`); die Auswahl ist ausdrücklich eine Entscheidung des Spielers.
**Wirkung:** Eine Auswertung „was ist sitzengeblieben" ist unmöglich, wenn 20 Azubis an bis zu 20
verschiedenen Aufträgen saßen.

### 70–90 min · Abgeben und einsammeln

| Zeit | Was passieren muss | Wie es heute aussieht |
|---|---|---|
| 70–80 | Jeder sieht sein Ergebnis | **Trägt.** Abschluss-Fenster mit Sternen, Lohn, Weg, Merksatz (`src/ui/spiel.js:494-526`). |
| 80–85 | 20 Ergebnisse kommen zur Lehrkraft | **FEHLT.** Das Fenster hat genau drei Knöpfe: „Nächsten Auftrag wählen" / „Nächstes Ticket", „Übersicht", „Feierabend: zur Leiste" (`src/ui/spiel.js:523-526`). Kein Kopieren, kein Melden. |
| 85–90 | Die Lehrkraft sieht den Stand der Klasse | **FEHLT.** Es bleibt der Geräte-Export: 20 Dateien von 20 Rechnern, jede ein vollständiger Spielstand, der ausdrücklich **nicht** für die Leistungsbewertung vorgesehen ist. |

**Behauptung:** „Ergebnis abgeben" fehlt vollständig — und das ist im Konzept kein Nebensatz, sondern
eine ausdrückliche Grenze.
**Beleg:** `Konzept – Lernplattform für Betriebe und Schulen.md:108` nennt als Grenze der Lehrkraft
„Rohdaten exportieren"; das Abschluss-Fenster bietet keinerlei Teilen (`UI.kopieren` wird nur an zwei
Stellen benutzt: `src/ui/editor.js:451` und `src/ui/hub.js:123` — **nicht** im Abschluss).
**Wirkung:** Die Lehrkraft kann am Stundenende **nichts** mitnehmen, was sie nicht 20-mal von Hand
geholt hat. Damit fällt der pädagogische Nutzen der Stunde weg, obwohl das Spiel die Sterne schon
berechnet hat.

## 2.2 Wo bricht es heute ab? Die drei konkretesten Stellen

1. **`src/ui/spiel.js:857` — `aktiveLaden()` beim Start.** Der nächste Azubi am selben Rechner steckt
   sofort im offenen Auftrag des vorigen. Mit `src/ui/spiel.js:858` („kein `einstieg.fertig`, keine
   erledigten Aufträge → Einführung neu") entsteht der zweite Fall: Der zweite Azubi sieht die
   Begrüßung **noch einmal** — als hätte er nichts getan.
2. **`src/spiel/zustand.js:174-178` — `Spiel.neu()` ohne Aufrufer.** Zurücksetzen ist vorhanden und
   getestet, aber nicht erreichbar. Es fehlt kein Mechanismus, sondern ein Knopf.
3. **`src/ui/spiel.js:523-526` — das Abschluss-Fenster ohne Weg nach draußen.** Drei Knöpfe, keiner
   davon trägt ein Ergebnis zur Lehrkraft. `src/ui/karriere.js:442-445` exportiert nur den **ganzen**
   Speicher; das ist die falsche Körnung (ein Gerät, nicht ein Ergebnis).

## 2.3 Die kleinste Änderung mit der größten Wirkung

**Ein Übergabeknopf.** Nicht der Klassenraum, nicht der Server, nicht der Tutor:

> **„Neuer Azubi an diesem Rechner"** — sichtbar auf der Startansicht und in den Einstellungen, ein
> Klick, Sicherheitsfrage, „was bleibt" klar benannt: Spielstand weg, Lernstand bleibt
> (oder: auch der Lernstand weg — die Entscheidung gehört der Lehrkraft, nicht dem Programm).

**Beleg, dass es klein ist:** `Spiel.neu()` existiert, räumt `labor` auf und lädt neu
(`src/spiel/zustand.js:174-178`), lässt den Lernmotor ausdrücklich stehen (Kommentar Zeile 160:
„Lernstand bleibt, der gehört dem Lernmotor"). Dazu ein `UI.app.registrieren` oder eine Zeile im
Einstellungs-Abschnitt — die Infrastruktur für beides ist da (`src/ui/app.js:6,59-61`).
**Beleg, dass es wirkt:** Es entscheidet, ob das Spiel in der **zweiten** Stunde am selben Rechner
überhaupt einsetzbar ist (siehe 2.1, Schritt 3–8).
**Steht das im Klassenraum-Entwurf?** Dort steht der große Bogen (Code, Sitzung, Ampel, Sammlung).
Dieser Knopf ist die Vorstufe: Er braucht **keinen** Server, **keinen** Code, **kein** Netz — und
schaltet den Fall „mehrere Azubis je Gerät" sofort frei. Wenn er im Entwurf nicht vorkommt, gehört er
als Stufe 0 davor: erst übergeben können, dann zuweisen.

**Zweite Kleinigkeit, gleiche Familie:** Im Abschluss-Fenster einen Knopf **„Ergebnis kopieren"**, der
`UI.kopieren` mit einer Zeile wie `NL salon-03 · 4,5★ · 1 Versuch · 92 s` aufruft. `UI.kopieren` gibt es
seit langem (`src/ui/dom.js:36`), es fehlt nur der Aufruf im Abschluss. Damit kann die Lehrkraft
20 Ergebnisse per Zwischenablage einsammeln, ohne einen einzigen Server.

## 2.4 Was eine 1.3 auf keinen Fall kaputt machen darf

| Darf nicht brechen | Warum es auf der Kippe steht | Beleg / Gegenmaßnahme |
|---|---|---|
| **Determinismus** | Genau daraus lebt der Klassenraum: derselbe Code → derselbe Auftrag. Ein „Zufall" beim Erzeugen der Sitzung oder eine Uhr im Seed macht die Kernzusage falsch. | Seed-Kanonisierung und Codec sind spezifiziert (`Klassenraum – Umsetzungsreife Spezifikation.md` § 2.3); die Mechanik ist heute schon deterministisch (`KANON_FENSTER`-Idee, `def.fuerSeed`). |
| **Offline-Betrieb** | Der stärkste Satz in der ganzen Konzeption: „Die Lehrkraft drückt einen Knopf … und alles funktioniert auch, wenn das Netz ausfällt" (`Konzept – Lernplattform…md:572`). Ein Tutor auf Sprachmodell oder eine Ampel mit Server kippt das sofort. | Im Spiel gibt es heute **0** Netzwerkaufrufe; jede neue Schicht muss einen codefreien Rückfall haben — so wie die Spezifikation es mit „Local-first, Code-Rückfall" beschreibt (`:604`). |
| **Datenminimierung** | Ein Spielstand von 48 275 B ist harmlos; ein Spielstand mit **Klarnamen** ist es nicht. Der Codec kennt ausdrücklich kein Namensfeld (`…Spezifikation.md` § 2.2), der Platz ist eine Zahl 0..31. | Diese Grenze darf keine Bequemlichkeit („wer war das?") aufweichen. Für Minderjährige gilt: pseudonym, nicht anonym (`Konzept – Lernplattform…md:315-333`). |
| **Die echten Geräte im Raum** | 20 Rechner, wechselnd bestückt, keine Installation, keine Adminrechte. Eine 1.3, die einen Klassenraum-Server, einen Browser mit Netzfreigabe oder ein Zertifikat voraussetzt, fällt im Raum durch. | Heute reicht Doppelklick (`src/ui/start.js:208-211`). Dieser Weg darf nicht länger werden. |
| **Der Einzelspieler-Betrieb** | Ein Azubi ohne Klasse muss weiter allein spielen können; das Konzept hält das ausdrücklich fest (`:597`). | Kein Zwang zu Sitzung, Code oder Anmeldung. |
| **Die Prüfungssicht** | Der Lernstand je Fertigkeit entsteht aus `L.ueben` (`fremd/lernmotor.js:39-40`). Wenn eine neue Schicht den Lernstand getrennt speichert, zerfällt die Auswertung in zwei Wahrheiten. | Eine Quelle für den Lernstand, kein zweiter Zähler. |

## 2.5 URTEIL — die richtige 1.3, wenn man nur EINE Sache bauen könnte

**Nicht** der Klassenraum-Server und **nicht** der Tutor. Sondern:

> **„Ein Rechner, viele Azubis": sauber übergeben und ein Ergebnis, das die Lehrkraft mitnehmen kann.**

Konkret: ein Übergabeknopf („Neuer Azubi an diesem Rechner", Spielstand weg — Lernstand nach Wahl der
Lehrkraft) **und** ein „Ergebnis kopieren" im Abschluss-Fenster. Beides zusammen ist vermutlich ein
halber Tag Arbeit, braucht keinen Server, kein Netz, keine Entscheidung des Datenschutzbeauftragten —
und es ist die Voraussetzung für **jeden** größeren Schritt: Ohne Übergabe ist das Spiel in der zweiten
Stunde unbrauchbar, und ohne Rückgabe bleibt die Stunde für die Lehrkraft ergebnislos. Der Codec und die
Live-Ampel sind wertvoll, aber sie setzen beides voraus.

**Die Reihenfolge, die ich empfehle:** (0) übergeben · (1) Ergebnis zurückgeben · (2) denselben Auftrag
für alle (Code) · (3) Ampel/Sammlung · (4) alles darüber.

---

# TEIL 1 · GEGENPRÜFUNG DER VIER ENTWÜRFE

> **Stand: fertig, 09.10.2026.** Alle vier Entwürfe lagen vor:
> `Klassenraum-Umsetzung` (30 046 B) · `Tutor auf Sprachmodell` (21 968 B) ·
> `Mitnehmbarer Lernstand` (18 700 B) · `Inhaltslücken` (19 619 B).
> Geprüft: Widersprüche · Doppelarbeit · stille Abhängigkeiten · zu optimistische Zahlen ·
> was ganz fehlt. Jede Zahl unten ist in dieser Sitzung gezählt.

## 1.0 Vorbereitung (schon gemessen, damit Teil 1 schnell wird)

Damit die Zahlprüfung (Punkt 4) nicht geraten wird, hier die Größen des Bestands — **in dieser Sitzung
gezählt**:

| Größe | Wert | Wie gezählt |
|---|---|---|
| Testdateien | **53** | `tests/*.test.js` |
| Tests | **461** grün, 0 übersprungen | `node tests/run.js` |
| Module im Testlauf | **83** | Schlusszeile von `tests/run.js` |
| Quelldateien `src/**/*.js` | **117** | Verzeichnis, rekursiv |
| Zeilen `src/**` | **26 337** | Zeilen aller `.js` unter `src/` |
| Datenmodule `src/daten` | 15 Dateien, 4 562 Zeilen | Verzeichnis |
| Spiellogik `src/spiel` | 48 Dateien, 6 953 Zeilen | Verzeichnis |
| Oberfläche `src/ui` | 32 Dateien, 8 100 Zeilen | Verzeichnis |
| CSS-Dateien | 26, 2 109 Zeilen | `python tools/ethos.py` |
| Werkzeuge `tools/*.py` | 34 | Verzeichnis |
| Handaufträge | 58 | `Klassenraum – Umsetzungsreife Spezifikation.md` § 0 |

**Die Wachstumskurve (der wichtigste Satz für jede Aufwandsschätzung):** Seit dem Commit der
Klassenraum-Spezifikation (`59c6ccf`, 07.10.2026) bis heute sind es **13 Commits**, **168 geänderte
Dateien** und **51 123 hinzugefügte Zeilen**; allein in `src/` und `tests/` **54 Dateien, 34 davon neu,
10 281 Zeilen**. Die Testzahl stieg in derselben Zeit von **251 auf 461**.

**Was das für die Schätzungen heißt:** Dieses Projekt liefert **je Arbeitsblock rund 1 000–1 600 Zeilen
Quelltext samt Tests** (34 neue Dateien in ~13 Blöcken). Wer eine Sitzung schätzt, muss also sagen,
*welche* dieser Größenordnung er meint. Die Schätzungen der vier Entwürfe tun das nicht — sie zählen
„Sitzungen", aber nicht Zeilen, Dateien und Tests. Das ist die eigentliche Schwäche, nicht die einzelne
Zahl.

---

## 1.1 Widersprüche: zwei Codes — Doppelarbeit oder saubere Trennung?

**Der Befund des Leads, geprüft.** `Mitnehmbarer Lernstand` § 2.3 schlägt **zwei** Codes vor
(`E-XXXX-XXX` für die Vorführung, `L-…` zum Mitnehmen), `Klassenraum-Umsetzung` plant den `E-Code` in
seiner Stufe A/B.

**Mein Urteil: saubere Trennung — keine Doppelarbeit. Aber mit einer offenen Naht.**

| Prüfung | Befund |
|---|---|
| Ist dieselbe Sache zweimal geplant? | **Nein.** `Mitnehmbarer Lernstand` § 2.3 sagt ausdrücklich „ein Codec, zwei Nutzlasten" und übernimmt Alphabet, Prüfsumme (mod 31/32) und die eingefrorene Index-Tabelle aus der Spezifikation (`Klassenraum – Umsetzungsreife Spezifikation.md` § 2.1/§ 2.4). Der Lernstand-Code ist ein **anderes Nutzlast-Layout**, keine zweite Implementierung. |
| Überschneidet sich der Aufwand? | **Nein, er addiert sich.** `Klassenraum-Umsetzung` § 2 führt den E-Code als „Teil von A/B"; `Mitnehmbarer Lernstand` § 6 rechnet den L-Code mit **1–1,5 S** und die Klassenliste mit **1 S** — beides steht **nicht** in der Klassenraum-Planung. Summe beider Pläne: 8–10,5 S statt 7–9,5 S. |
| Wo ist die Naht? | **`ergebnisEintragen(code)` ist für EINEN Code gebaut.** Die Liste je *platz* (Spezifikation § 2.5) hält „Ergebnis-Code, Lernstand-Code" laut `Mitnehmbarer Lernstand` § 5.2 als **zwei Felder** — die Spezifikation kennt nur eines. Wer zuerst baut, legt die Datenform fest. Das muss **eine** Entscheidung sein (mein Vorschlag: ein Feld `codes: {ergebnis, lernstand}`, so bleibt die Idempotenz über `platz` unangetastet). |

**Wirkung:** Kein doppelter Bau, aber ein doppelter **Anspruch auf dieselbe Datenform**. Wird das nicht
in der Spezifikation nachgezogen, baut A die Liste mit einem Feld und C erweitert sie später — dann sind
die gesammelten Codes der ersten Stunde nicht mehr lesbar.

## 1.2 Doppelarbeit: zweimal dieselbe Infrastruktur

| Dieselbe Sache | Wer plant sie | Befund |
|---|---|---|
| `store "klassenraum"` | Spezifikation § 2.5/§ 2.8 (Basis) + `Mitnehmbarer Lernstand` § 5.2 (Erweiterung) | **kein Widerspruch**, aber zwei Besitzer-Regime in einer Tabelle, die es noch nicht gibt. **Gemessen: der Schlüssel existiert heute nicht** — die einzigen Store-Schlüssel im Code sind `einst`, `labor`, `lern`, `sandbox`. |
| Prüfsummen-Polynome (mod 31 / mod 32) | Spezifikation § 2.1 (E) + `Mitnehmbarer Lernstand` § 3.4 (L, „wörtlich übernommen") | saubere Wiederverwendung — **sofern** die Implementierung als **eine** Funktion entsteht. Zwei Kopien desselben Polynoms wären der klassische Auseinanderlauf. |
| „Dieselbe Hilfe für 67 Minis" | `Inhaltslücken` § 1 will sie **schreiben**; `Tutor auf Sprachmodell` § 3 Fall 2 will sie **vom Modell erzeugen** | **echte Doppelarbeit im Ziel, nicht im Weg.** Beide lösen dasselbe Problem (Mini-Denkhilfe beantwortet die Frage nicht). Wer beides baut, zahlt zweimal — und der Tutor verliert seinen Hauptbeleg („67 Fälle, in denen die Tabelle versagt"), sobald die 67 Texte stehen. |
| `Spiel.klassenraum` | `Klassenraum-Umsetzung` § 1.2 (baut es) + `Mitnehmbarer Lernstand` § 2.3/§ 5.2 (setzt es voraus) | **Stille Voraussetzung**, siehe 1.4 — und im Mitnehmbar-Entwurf als „Muster vorhanden" bezeichnet, obwohl **gemessen nichts davon existiert**. |

## 1.3 Widersprüche in den Zahlen: derselbe Testlauf, drei Werte

| Datei | Behauptung | Gemessen heute |
|---|---|---|
| `Klassenraum-Umsetzung` § 5 | „Hausstand **434**, 53 Testdateien" | **461**, 53 Testdateien |
| `Inhaltslücken` § 0 | „`node tests/run.js` → **395/395 grün** (unverändert, weil nichts geändert wurde)" | **461** — die Zahl ist der Stand *vor* der Hilfestellung, nicht „unverändert" |
| `Tutor auf Sprachmodell` | nennt keine Testzahl (nennt `tests/sim-stand.json` als Determinismus-Beleg) | — |
| `Mitnehmbarer Lernstand` | nennt keine Testzahl | — |

**Wirkung:** Die Sollzahlen der Abnahme werden aus diesen Werten abgeleitet (`Klassenraum-Umsetzung`
§ 8/E7 schlägt „434 + 40 ≈ 474" vor). Mit dem heutigen Stand sind es **461 + 40 ≈ 501**. Das ist kein
Rechenfehler, sondern die normale Drift in einem Repo, das an einem Tag 100 Tests zulegt — aber es zeigt,
dass **keine** Zahl in diesen vier Entwürfen aus einer gemeinsamen Messung stammt. Vor dem Bau gehört
**eine** Messung an den Anfang, nicht vier.

## 1.4 Stille Abhängigkeiten (die wichtigsten zuerst)

**(a) Der Lernmotor wirft den Lernstand still weg — und die Import-Reihenfolge entscheidet.**
`fremd/lernmotor.js:39` liest den Speicher **einmal beim Laden des Skripts**:
`let st = (() => { const s = store.get("lern", null); return s && s.v === 1 ? s : leer(); })();`
Dazu `:40` `const save = () => store.set("lern", st);` und `:109` `reset()`.
Daraus folgen **zwei** Fallen, und nur die erste steht in den Entwürfen:

1. **Zu spät geschrieben:** Wird der importierte Code nach dem Start in `store["lern"]` gelegt, hält der
   Motor weiter sein altes `st`-Objekt — und der **nächste `save()` überschreibt den Import**. Wer nur
   `store.set("lern", …)` aufruft, hat nichts importiert, sondern beim nächsten `L.ueben` den Lernstand
   des vorigen Azubis zurückgeschrieben. `Mitnehmbarer Lernstand` § 7 nennt die Reihenfolge als
   „ersten Testfall der Umsetzung"; **kein anderer Entwurf nennt sie** — und keiner nennt das
   Überschreiben durch `save()`.
2. **`v` nicht exakt 1:** `s.v === 1` ist eine **strenge** Prüfung ohne Migration. Ein Stand mit `v:2`
   (oder ein von Hand gebauter Code) wird **ohne Meldung** durch `leer()` ersetzt. Der Spielstand ist hier
   vorbildlich (`src/spiel/zustand.js:46` hebt alte Stände an, `:126-134` lehnt zu neue mit Satz ab) —
   der Lernmotor tut **weder noch**.

**(b) `Spiel.instanzErstellen` braucht `ohneFlow`, sonst ist derselbe Code je Gerät verschieden.**
`src/spiel/postfach.js:79` schaltet den Flow-Regler nur bei `quelle !== "pruefung"` und `!o.ohneFlow` ab.
Ein Klassenraum-Auftrag mit derselben `ticketId` und demselben Seed, aber unterschiedlichem Lernstand der
Geräte, bekommt damit **verschiedene Netze**. `Klassenraum-Umsetzung` § 1.3 hat das gemessen und
`ohneFlow: true` vorgesehen — die Spezifikation nennt es in § 2.6. In `Mitnehmbarer Lernstand` und
`Inhaltslücken` kommt der Punkt nicht vor.

**(c) Der Klassenraum-Auftrag verfälscht die Karriere — und niemand prüft es.** (Ausführlich in 1.5,
Punkt 2: es ist einer der zwei fehlenden Punkte.)

**(d) Zwei Entwürfe hängen an einer Klasse, die es noch nicht gibt.** `Mitnehmbarer Lernstand` § 2.3
begründet seinen Aufwand mit „Muster vorhanden (`Spiel.klassenraum` + Einstellungen ‚Spielstand')".
Gemessen: **`Spiel.klassenraum` existiert nicht** (`typeof` leer, `src/spiel/klassenraum.js` fehlt), der
Store-Schlüssel `klassenraum` fehlt. Von den zwei genannten Mustern existiert genau **eines**
(`karriere.js:442-465`). Der Aufwand „0,5 S Oberfläche" ist damit gegen ein Muster geschätzt, das zur
Hälfte nicht da ist. `Klassenraum-Umsetzung` § 2 ist hier ehrlicher: „die Umsetzungsseite ist exakt null".

## 1.5 Zu optimistische Zahlen — die drei kleinsten Schätzungen, nachgezählt

**Erst die Eichung, die der Lead erfragt hat: ist „25 Denkhilfen = 96 Zeilen" tragfähig?**

Gemessen: `src/daten/mini-denkhilfen.js` hat **97 Zeilen**, **7 506 Zeichen**, **25 Einträge**,
**4 836 Zeichen Text** (Mittel 194 Zeichen je Eintrag). Die Zeilenzahl als Eichmaß ist **schwach**:
Überschrift, Kommentare und Klammern zählen mit. Belastbar ist der **Textumfang**: 25 Einträge ≈
4 800 Zeichen Prosa, also ≈ **190 Zeichen je Eintrag**. 67 weitere Einträge wären ≈ **13 000 Zeichen**
neue deutsche Prosa — bei einer Prüfregel, die jeder Text bestehen muss (keine Lösung, keine wörtliche
Option, ein Stichwort, das **nicht** im Wiki steht). Die Eichung ist damit **nicht falsch, aber zu
grob**: „3 Sitzungen" bleibt plausibel, die Zeilenzahl trägt die Schätzung nicht.

**Die drei kleinsten Schätzungen:**

| # | Schätzung | Wo | Nachgezählt | Urteil |
|---|---|---|---|---|
| 1 | **„0,5 Sitzung"** für „Neues Nutzlast-Layout + Encoder/Decoder" | `Mitnehmbarer Lernstand` § 2.3 | Die Vorbilder im Repo sind **keine** kleinen Dateien: `tools/klassenraum-probe/A-format.js` **1 318 Zeilen**, `A-kanon.js` **762**, die API-Probe `A-api.js` **1 977**. Die Spec nennt § 2.1–§ 2.4 (Alphabet, zwei Prüfsummen, Nutzlast-Bitfeld, Kanonisierung über 64 Seeds, zwei eingefrorene Tabellen) — **dieser Teil ist noch nicht implementiert**. Hinzu kommen 40 Testfälle (Spec § 5.1) und 12 nie werfende API-Funktionen mit 10 Fehlerklassen. | **um Faktor 2–3 daneben** (realistisch 1–1,5 S, ohne UI) |
| 2 | **„0,5 Sitzung"** für Tests („Round-Trip, Tippfehler, Fassungen, Grenzen") | `Mitnehmbarer Lernstand` § 2.3 | Der beste Vergleich liegt aus **dieser** Sitzung vor: 13 Fälle = **154 Zeilen** Testdatei. Hochgerechnet auf 40 Fälle ≈ **470 Zeilen**, plus zwei Testhilfen, die laut Spec **noch fehlen** (`ampelZahlen`, `netzwert` — `Klassenraum-Umsetzung` § 3 bestätigt das). | **plausibel in der Menge, zu knapp im Umfeld** (0,5–1 S) |
| 3 | **„halber Tag"** für Übergabe + Rückgabe (mein eigener Vorschlag aus Teil 2) | dieser Text, 2.5 | `Spiel.neu()` existiert (`src/spiel/zustand.js:174`), `UI.kopieren` existiert (`src/ui/dom.js:36`), ein Einstellungs-Abschnitt existiert (`src/ui/app.js:6`). Aber: ein Knopf mit Sicherheitsfrage braucht Text, Zustand und einen Test; „Ergebnis kopieren" braucht einen Aufhänger im **fremden** `src/ui/spiel.js:523-526` — dieselbe Fremddatei, die `Klassenraum-Umsetzung` § 2 als ungelöste Frage nennt. | **hält nur, wenn die Fremddatei-Erlaubnis vorher kommt**; sonst +0,5 S |

**Und jetzt die große Zahl: sind 7–9,5 Sitzungen für den Klassenraum plausibel?**

**Ja — ich bestätige die Korrektur des Kollegen, und ich würde eher an die Obergrenze gehen.** Belege:

* **Dateien:** Die Spec verlangt **vier neue Dateien** (`src/spiel/klassenraum.js`, `src/ui/klassenraum.js`,
  `src/stil/klassenraum.css`, `tests/klassenraum.test.js`) plus Fremdeingriffe in
  `src/ui/start.js` (Startseiten-Zeile), `src/spiel/postfach.js` (Filter oder Nebenwirkungen) und
  `src/ui/spiel.js` (Ort des Ergebnis-Codes). Gemessen: von diesen drei Fremddateien nennt die Spec
  **keine einzige** in ihrer Erlaubnisliste — `Klassenraum-Umsetzung` § 2 hat das gefunden.
* **Umfang der neuen Module:** `src/spiel` umfasst heute 48 Dateien/6 953 Zeilen, `src/ui`
  32 Dateien/8 100 Zeilen. Ein Codec-Modul mit 12 Funktionen und ein Ansichtsmodul mit zwei Ansichten
  liegen erfahrungsgemäß bei **600–1 200 Zeilen** — das ist der Umfang, den dieses Projekt je Block
  liefert (10 281 Zeilen in `src`/`tests` über 13 Blöcke).
* **Testumfang:** 40 Fälle ≈ 470 Zeilen (siehe oben) — und die Sollzahl der Abnahme wächst von 461 auf
  ~501, also **+9 %** auf einen Schlag.
* **Der Rust-Teil ist nicht „schon fertig":** Der C2-Server liegt gebaut vor (10/10 Tests), aber § 4.3/L3
  verlangt die **Umstellung des Formats** — gemessen betroffen: `tools/klassenraum/src/lager.rs:21-23`
  (`sitzung`, `platz`, `sterne`) und `:49-56` (Feldlesung). Danach ist die HTTP-Probe (Sollwert 20/20)
  **erneut** zu messen. Das ist **keine** halbe Sitzung, sondern eine Änderung mit eigener Abnahme.
* **Was fehlt, wenn der Codec fertig ist:** der Übergabefall (Teil 2) und die Karriere-Frage (1.6) —
  beides steht in **keiner** Sitzung der vier Entwürfe.

**Meine Zahl, aus den gemessenen Posten:** Stufe A **2–3 S** · B **2 S** · E (Nachziehen, Sollzahlen,
Architektur, CHANGELOG) **1 S** · Übergabe + Rückgabe (fehlt in allen Plänen) **0,5 S** ·
Karriere-Regel + Test (fehlt in allen Plänen) **0,5 S** = **6–7 S** bis der Unterricht mit **einem** Code
trägt; mit C1 **+1–1,5**, C2/L3-Umstellung **+0,5–1**, QR **+0,5–1** = **8–10,5 S**. Gegen die 4,5–5,5 der
Spec ist das **Faktor ~1,8**, gegen die 7–9,5 des Kollegen **+1 S** — die Differenz sind genau die zwei
Punkte, die in keinem Entwurf stehen.

## 1.6 Was fehlt ganz? Drei Dinge, die in keinem der vier Entwürfe stehen

### Fehlt 1 · Der Übergabefall: zwei Azubis an einem Rechner

**Behauptung:** Für den häufigsten Fall im Klassenzimmer (20 Azubis, weniger Rechner) hat **kein**
Entwurf eine Antwort. Ausführlich in Teil 2, hier die Belege gegen die vier Dateien:

* `Klassenraum-Umsetzung` prüft `store "klassenraum"` und die Sichtbarkeit von Aufträgen — ein Zurücksetzen
  oder Übergeben kommt nicht vor.
* `Mitnehmbarer Lernstand` beschreibt den **Umzug auf einen anderen Rechner** (Code), nicht die **Übergabe**
  an den nächsten Menschen — der Lernstand-Code hilft dort nicht, weil der nächste Azubi keinen Code hat,
  sondern einen **leeren** Rechner braucht.
* `Inhaltslücken` und `Tutor auf Sprachmodell` behandeln Inhalt, nicht Geräte.
* **Beleg im Code:** `Spiel.neu()` existiert (`src/spiel/zustand.js:174-178`), wird aber von **keiner**
  Oberfläche aufgerufen (Aufrufe nur in vier Tests); wer den Rechner übernehmen soll, sieht den Stand des
  Vorgängers (`src/ui/spiel.js:857` lädt den offenen Auftrag).

**Wirkung:** Ohne diesen Fall ist das Spiel in der zweiten Stunde am selben Rechner unbrauchbar — der
gesamte Klassenraum-Aufwand zahlt sich dann nicht aus.

### Fehlt 2 · Der Klassenraum-Auftrag verfälscht die Karriere — und niemand prüft es

**Behauptung:** Wird ein Auftrag mit `quelle:"klassenraum"` abgenommen, zählt er **voll** für Lohn, Ruf,
Wochenziele, Kundenakte und Empfehlungen. Für `quelle:"pruefung"` gibt es an jeder dieser Stellen einen
Filter — für „klassenraum" **nirgends**, weil die Quelle noch nicht existiert.

**Beleg (gemessen, sechs Stellen):**

| Stelle | Filter für `pruefung`? | Wirkung ohne Filter |
|---|---|---|
| `src/spiel/woche.js:10,12,16` | ja (`e.quelle !== "pruefung" && e.quelle !== "raetsel"`) | Ein Klassenraum-Auftrag zählt in die **Wochenwertung** — 20 Azubis in einer Stunde = eine Woche Karrierefortschritt |
| `src/spiel/abzeichen.js:13` | ja (`e.quelle !== "pruefung"`) | Klassenraum-Aufträge sammeln Abzeichen |
| `src/spiel/formen.js:43` | ja | Sie bestimmen die **Formmischung** („nie zweimal dieselbe Form") |
| `src/spiel/kundenakte.js:54` | **nein** — zählt `st.erledigt` je Kunde ohne Quellfilter | Die Kundenampel steigt; `empfehlen()` wählt nach dieser Zahl |
| `src/spiel/postfach.js:127` | ja (Filter, seit 07.10. auch `training`) | Ohne Filter steht der Auftrag im Postfach und im Offen-Zähler |
| `src/spiel/abnahme.js:118` | ja, aber **nur** für `training` (Umleitung in `Spiel.training.abnehmen`) | Der Klassenraum-Auftrag läuft in den **normalen** Karriereweg: `st.erledigt.push({… quelle})` (`:150`), Lohn (`:91`), Ruf (`:94`) |

**Und ein zweiter, subtilerer Effekt:** `src/spiel/postfach.js:14`
`Spiel.postfachZiel = () => Spiel.st.erledigt.length < 2 ? Spiel.POSTFACH_WAHL : …` — auf einem frischen
Klassenraum-Rechner liegen **zwei** Angebote im Postfach statt drei (`POSTFACH_WAHL = 2`, `:11`). Wer
zwischendurch einen Klassenraum-Auftrag löst, ändert damit die **Auswahl** für den Einzelspieler.

**Wirkung:** Das Spiel ist ein Lernspiel ohne Noten — aber es hat eine ausdrückliche Zusage, dass
Prüfungs- und Trainingsaufträge die Karriere **nicht** verfälschen (`abnahme.js:111-119`, § 6 des
Hilfe-Vertrags). Für den Klassenraum gibt es diese Zusage nicht. Entweder man will sie (dann gehört die
Quelle in **alle sechs** Filter, mit Test), oder man will sie nicht (dann gehört es in die Spezifikation,
denn ein Lehrer wird fragen). **In keinem der vier Entwürfe steht die Frage.**

### Fehlt 3 · Die Verteilung: welcher Code für welche 20 Leute?

**Behauptung:** Der Klassenraum-Entwurf beschreibt genau **einen** Code für die Klasse („ein Code, alle
bauen denselben Auftrag"), aber nicht, was eine Lehrkraft tut, die **differenzieren** will — und das ist
im Konzept ausdrücklich vorgesehen.

**Beleg:** `Konzept – Lernplattform für Betriebe und Schulen.md:261` nennt die Differenzierung als
Lehrkraft-Werkzeug („die Lehrkraft kann je Gruppe ein Niveau, einen Flow und die Fehlerzahl wählen"),
`:108` nennt „differenzieren" als Aufgabe der Lehrerkonsole. Die Spezifikation kennt nur **eine** Sitzung
je Lehrkraft (`store "klassenraum"`, `sitzung`, `platz`, `plaetze` in § 2.5) — **kein** Feld für Gruppen.
`Klassenraum-Umsetzung` § 8/E3 lehnt „Lehreransage überstimmt den Bildungsstand" ab (zu Recht,
Vertrag § 1) — damit ist die einzige heute geplante Differenzierung die **Stufe des Menschen**, nicht eine
Gruppenzuweisung.

**Wirkung:** Eine Lehrkraft mit 20 Azubis auf drei Niveaus bekommt **einen** Auftrag für alle. Sie kann
das Spiel benutzen — aber nicht differenzieren, und genau das ist der pädagogische Kern des Konzepts.

### Und was **nicht** fehlt (damit die Liste nicht unfair wird)

Zwei Dinge, die ich geprüft habe, weil sie naheliegend wären — beide sind sauber gelöst:

* **Determinismus des Klassenraum-Auftrags:** `ohneFlow: true` ist in der Spec (§ 2.6) und im Entwurf
  (§ 1.3) vorgesehen; der Instanz-Feldname überlebt die Migration (vom Kollegen gemessen).
* **„Kein Klarname möglich":** Der Codec hat kein Namensfeld (Spec § 2.2), der Platz ist eine Zahl 0..31 —
  das ist die richtige Antwort auf den Datenschutz-Einwand und steht in **beiden** Code-Entwürfen.

---

## 1.7 Die vier Fragen des Leads, kurz beantwortet

1. **E-Code + L-Code: Doppelarbeit?** Nein — ein Codec, zwei Nutzlasten, und `Mitnehmbarer Lernstand`
   § 2.3 sagt das selbst. Die Naht ist die **Datenform der Sammelliste** (ein Feld oder zwei): das gehört
   in die Spezifikation, bevor A gebaut wird.
2. **Passen „67 Denkhilfen zuerst" (≈7 S) und „Klassenraum 7–9,5 S" zusammen?** Sie passen **nicht in
   dieselbe Woche** — zusammen sind es 14–16,5 S, also 2,5–3 Wochen bei fünf Blöcken je Woche. Sie
   **widersprechen sich aber nicht inhaltlich**: Inhaltslücken baut Inhalte ohne Vertragsrisiko und
   schließt eine gemessene Lücke (67 von 92), der Klassenraum braucht vorher **Lead-Entscheidungen**
   (§ 8/E1, E2, E4) und drei Fremddatei-Freigaben. **Reihenfolge: Inhaltslücken zuerst** (Punkte 0–3,
   ~7 S), Klassenraum danach — und dabei **den Tutor hinten anstellen**, weil er nach den 67 Denkhilfen
   seinen Hauptbeleg verliert.
3. **Stillen Abhängigkeiten:** die Lernmotor-Reihenfolge (`fremd/lernmotor.js:39-40`, **plus** das
   Überschreiben durch `save()` — neu gefunden), `ohneFlow` (`src/spiel/postfach.js:79`), die zwei
   fehlenden Testhilfen (`ampelZahlen`, `netzwert`), und die Karriere-Filter (1.6). Wer sie nicht auf dem
   Zettel hat, baut zweimal.
4. **Zwei Dinge, die in keinem Entwurf stehen:** (a) der Übergabefall, (b) die Karriere-Verfälschung —
   beide belegt, dazu (c) die fehlende Differenzierung als dritter Fund.

## 1.8 URTEIL ZU TEIL 1

Die vier Entwürfe **widersprechen sich in der Sache nicht** — sie greifen sauber ineinander (ein Codec,
zwei Nutzlasten; Inhalte hier, Code dort). Die drei echten Probleme sind:

1. **Kein Plan rechnet gegen den heutigen Stand.** Drei verschiedene Testzahlen, veraltete Sollzahlen,
   eine stille Voraussetzung (`Spiel.klassenraum` als „Muster vorhanden"). **Eine Messung vor dem Bau.**
2. **Der Aufwand ist nach unten offen:** die zwei Lücken aus 1.6 fehlen in **jeder** Sitzungsliste. Die
   beste Korrektur im Feld (7–9,5 S) ist noch **1 S zu klein**.
3. **Zwei Entwürfe planen dasselbe Ziel von zwei Seiten** (67 Denkhilfen vs. Tutor). Das ist kein
   Fehler, aber eine Reihenfolge-Frage — und sie ist entschieden: **erst die Texte, dann das Modell.**

Und aus Teil 2 bleibt der wichtigste Satz stehen: **was eine 1.3 wirklich braucht, ist der Übergabefall.**
Er fehlt in allen vier Entwürfen, er kostet am wenigsten und er entscheidet, ob der Rest je im
Klassenzimmer ankommt.
