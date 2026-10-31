---
tags: [FISI, Lernspiel, Netzwerk, Unterricht, Einstieg]
beschreibung: Die ersten fünf Minuten im Netzwerk-Labor — öffnen, Auftrag annehmen, Klassenraum-Code, Hilfe und Abgabe.
erstellt: 2026-10-31
---

# Schueler – Erste fünf Minuten

> **Kurzblatt für den Einstieg.** Fünf Minuten, dann läuft das Labor: öffnen, ersten Auftrag
> annehmen, im Klassenraum den Code eintippen, Hilfe holen und abgeben — offline, ohne Konto.
> Was nicht geprüft ist, steht ausdrücklich in § 5.

## 1 · Öffnen (1 Minute)

- **Im Browser:** [vexx-oss.github.io/NetLab](https://vexx-oss.github.io/NetLab/) öffnen — ein
  Klick, kein Download. Oder die **Einzeldatei** herunterladen und doppelklicken; sie enthält
  Schriften und Programm (kein Nachladen, kein Internet nötig).
- **Kein Konto, keine Installation, kein Login.** Im Windows-Programm gibt es zusätzlich die
  Leiste; für den Anfang reicht der Browser.
- Die Kopfzeile zeigt, ob gespeichert ist („… sichert" / „✓ gesichert" / „⚠ nicht gesichert").

## 2 · Der erste eigene Auftrag (ohne Klasse)

1. **Postfach** öffnen und die erste Kundenmail lesen.
2. **„Auftrag annehmen"** — das Netz erscheint im **Labor**.
3. **Gerät anklicken:** rechts zeigt der **Inspektor** Adressen, Ports, VLAN, Routen, ACL, NAT. Das
   IOS-ähnliche Terminal ist ein **Knopf im Inspektor-Kopf** (kein Reiter).
4. **Werkzeuge** oben links: **V** auswählen/verschieben · **K** Kabel · **P** Ping · **T** Terminal
   (auch Doppelklick auf ein Gerät).
5. Nach einem Ping: **„In Simulation öffnen"** — das Paket Schritt für Schritt.
6. **„Abnahme anfordern"** — der Kunde prüft nach, auch auf Kollateralschäden.
7. **Hilfeleiter:** Checkliste, Werkzeugtipp, Frage vom Senior — am Anfang gratis, notfalls bis zur
   vorgeführten Lösung. Fehler kosten nichts.

## 3 · In der Klasse: der Klassenraum-Code (2 Minuten)

1. Ansicht **Auftrag** öffnen.
2. **Auftragscode** und **Platz** eintippen → **Auftrag öffnen**.
3. Die Statuszeile bestätigt: „Auftrag angenommen: <Titel> · Platz N". Der **Klassenraum-Abdruck**
   zeigt dein geladenes Netz — vergleich ihn mit deinem Nachbarn: gleicher Auftrag, gleicher Abdruck.
4. Es ist derselbe Ablauf wie aus dem Postfach; Abnahme und alles Weitere laufen normal.
5. **Ergebnis-Code:** nach bestandener Abnahme erscheint der Code (`E-…`) als Meldung — kopieren
   und der Lehrkraft zeigen.
6. **„Ich hänge":** im Labor gibt es einen Knopf, der einen **Hilfecode** (`H-…`) kopiert — zeig ihn
   der Lehrkraft. Er enthält nur Platz und Zähler, keinen Namen.

## 4 · Wenn etwas klemmt

- **Code unlesbar?** Das Alphabet lässt I, O, 0 und 1 weg; die häufigste Verwechslung ist O statt 0 —
  die Meldung sagt es ([Architektur.md](Architektur.md) § 12.3).
- **Kein Auftrag offen?** Erst den Code der Lehrkraft eintippen; ohne Code gibt es keinen
  Klassenraum-Auftrag.
- **Spielstand weg?** Browser und Windows speichern getrennt; das Spiel sichert automatisch, und
  Export/Import liegen im Spiel (Details: [FAQ.md](FAQ.md) Frage 2).
- **Kein Code / kein Netz?** Alles läuft offline; frag die Lehrkraft nach dem Code.

## 5 · Ehrliche Grenzen

- **Kein Server, kein QR-Code:** beide sind **3.1** und im Produkt nicht gebaut
  ([Architektur.md](Architektur.md) § 12.6/§ 12.7).
- **Keine Namen, keine Noten, kein Ranking:** der Klassenraum überträgt nur Codes; es gibt keine
  Bewertung durch das Programm.
- **Nicht geprüft:** ein Lauf auf echten Schulgeräten/Tablets, eine reale Schulnetz-Umgebung und ein
  echter Unterricht mit 20 Geräten; der Trockenlauf (`tests/klassen-20.test.js`) ist ein Software-Test.
- **Keine Internetpflicht:** die Einzeldatei lädt nichts nach; nur die Live-Seite braucht eine
  Verbindung, um geladen zu werden.

## 6 · Belege

- Einstieg: [Liesmich.md](Liesmich.md) · [README](../README.md); Klassenraum: [FAQ.md](FAQ.md)
  Fragen 8 und 16.
- Vertrag: [Architektur.md](Architektur.md) § 12 — Öffnungsweg § 12.2, Fehler § 12.3, Hilfecode § 12.5.
- Zahlen: [STAND.md](STAND.md) — die einzige Zahlenquelle.
