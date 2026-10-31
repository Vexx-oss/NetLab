---
tags: [FISI, Lernspiel, Netzwerk, Unterricht, Klassenraum]
beschreibung: Erste Stunde mit dem Klassenraum — vorbereiten, Code ansagen, Arbeitsphase, Auswertung, ehrliche Grenzen.
erstellt: 2026-10-31
---

# Lehrkraft – Erste Stunde (Klassenraum)

> **Wofür dieses Blatt ist.** Ein Ablauf für die erste Unterrichtsstunde mit dem Netzwerk-Labor:
> vorbereiten, den Auftragscode ansagen, die Arbeitsphase begleiten, Ergebnisse einsammeln und
> auswerten. Es beschreibt die **Stufe A+B** des Klassenraums — ohne Server, ohne QR, ohne Bewertung.
> **Was es nicht ist:** kein Nachweis einer gemessenen Unterrichtsstunde im Schulnetz; die Grenzen
> stehen ausdrücklich in § 5.

## 1 · Vorher vorbereiten (etwa 5 Minuten)

- **Gerät der Lehrkraft:** die Live-Seite oder die Einzeldatei öffnen. Das Spiel läuft offline,
  ohne Konto, ohne Installation und ohne Server.
- **Klassenstärke einstellen:** Ansicht **Klasse** → Schaltfläche **Datei…** → Feld
  **Klassenstärke** (0 = nicht eingestellt). Die Obergrenze ist die Codec-Grenze von 31 Plätzen
  ([Architektur.md](Architektur.md) § 12.8).
- **Auftrag wählen:** im Feld **Auftrag** stehen die Handtickets, die der Klassenraum-Code erreicht,
  und erzeugte Übungen. Nicht jedes Handticket ist per Code adressierbar; die Ansicht zeigt die
  Formatgrenze an (Grenze und Zahl: [STAND.md](STAND.md), Ausnahme „Klassenraum-Codec").
- **Code anzeigen** → der **Auftragscode** (`NL-…`) erscheint groß; **Code kopieren** gibt ihn an
  die Klasse weiter (Beamer, Tafel, Chat).
- **Vorher üben:** der Trockenlauf-Test `tests/klassen-20.test.js` fährt den Ablauf mit 20 simulierten
  Geräten durch. Das ist ein **Software-Test**, kein gemessener Unterricht.

## 2 · Die ersten fünf Minuten der Klasse

1. Die Azubis öffnen dieselbe Fassung (Live-Seite oder Einzeldatei).
2. Ansicht **Auftrag** → **Auftragscode** und **Platz** eintippen → **Auftrag öffnen**.
3. Kontrolle: Die Statuszeile meldet „Auftrag angenommen: <Titel> · Platz N".
4. **Klassenraum-Abdruck vergleichen:** Alle Geräte mit demselben Code zeigen denselben Abdruck,
   sofern überall dasselbe Auftragsnetz geladen ist. Der Abdruck beschreibt das **geladene Netz**,
   nicht den Code ([Architektur.md](Architektur.md) § 12.4).
5. Wer den Code nicht hat: Ansicht **Klasse** zeigt ihn; der Code ist die Ansage, kein Geheimnis.

## 3 · Arbeitsphase begleiten (etwa 25–35 Minuten)

- Die Klasse arbeitet im **Labor**; jeder Auftrag ist ein echter Netzfall mit Abnahme.
- **Hilfe im Spiel:** die Hilfeleiter kostet nichts und führt notfalls bis zur vorgeführten Lösung.
- **„Ich hänge":** der Azubi drückt im Labor den Knopf, bekommt einen **Hilfecode** (`H-…`) und
  zeigt ihn dir. Du fügst ihn in das Feld **Ergebnis-Codes** ein: die Ansicht liest „Platz N hängt:
  x von y Zielen erfüllt" — als Klartext, **nicht** als Ergebnis.
- **Anonyme Diagnose:** aus den Hilfecodes zählt die Ansicht je Schritt, wie viele hängen
  („Schritt k: n von <Klassenstärke>"). Kein Name, kein Rang, kein Vergleich
  ([Architektur.md](Architektur.md) § 12.5).
- **Ergebnis-Codes** (`E-…`) ebenfalls einfügen — einzeln oder als Block. Ist ein Platz schon belegt,
  fragt der Dialog **[Abbrechen] [Ersetzen] [Entfernen]**; nichts wird still verworfen.
- Eine neue Sitzung ersetzt keine Sitzung mit Ergebnissen ohne Rückfrage; alte Sitzungen bleiben in
  der Liste unter **Datei…** erhalten.

## 4 · Auswerten und sichern (etwa 10 Minuten)

- **Ampel:** fertig / offen / Median der Dauern; die Fortschrittszeile ergänzt „in den letzten
  5 Minuten" und „letzte Abgabe".
- **20-Übersicht:** sobald Klassenstärke und Dauer gesetzt sind, zeigt sie „Abgabe: x abgegeben ·
  y offen · noch N min" samt offener Sitzplätze.
- **Tafel:** Platz · Sterne · Dauer · Fehlversuche — nur Platznummern. **Keine Namen, keine Noten,
  kein Ranking** ([Architektur.md](Architektur.md) § 12).
- **Sichern:** **Datei… → Exportieren** schreibt eine Vollsicherung der Sitzungen (der Weg auf einen
  anderen Rechner). **Importieren** ersetzt nach Bestätigung alle Sitzungen des Geräts.

## 5 · Ehrliche Grenzen dieser Stunde

- **Kein Server, kein QR-Code.** Server (Stufe C) und QR (Stufe D) sind **3.1** und im Produkt nicht
  gebaut; die Einstellungen zeigen dazu nur einen ehrlichen Hinweis, keinen Schalter
  ([Architektur.md](Architektur.md) § 12.6/§ 12.7).
- **Keine Firewall-Freigabe nötig — und nicht geprüft.** Es läuft kein Server, also gibt es nichts
  freizugeben. Ein Schul-/Klassennetz wurde in dieser Sitzung **nicht** gemessen.
- **Kein echter 20-Geräte-Unterricht gemessen.** Der Trockenlauf ist ein Test; Schul-WLAN, Beamer,
  Gerätevielfalt und ein Raum mit 20 Geräten sind **nicht geprüft**.
- **Kein Gerätetest.** Android/Tablet auf einem echten Gerät ist **nicht geprüft**.
- **Keine Bewertung und keine Identität.** Codes tragen Sitzung, Platz, Sterne, Fehlversuche und
  Dauer — keinen Namen, keine Note, keinen Rang; alles bleibt auf dem Gerät.
- **Nicht geprüft:** Verhalten auf fremden Schulrechnern, Browser-Richtlinien der Schule, Beamer-
  Darstellung und ein echter Stundenverlauf.

## 6 · Belege

- Vertrag: [Architektur.md](Architektur.md) § 12 — Datenform § 12.1, API § 12.2, Fehler § 12.3,
  Netzkennwert § 12.4, Hilfecode § 12.5, Server/QR (3.1) § 12.6/§ 12.7, Grenzen § 12.8.
- Übersicht und FAQ: [README](../README.md) · [FAQ.md](FAQ.md) Fragen 5, 8 und 16 · [Liesmich.md](Liesmich.md).
- Zahlen: [STAND.md](STAND.md) — die einzige Zahlenquelle; dieses Blatt wiederholt keine Produktzahlen.
- Test: `tests/klassen-20.test.js` (Trockenlauf mit 20 simulierten Geräten).
