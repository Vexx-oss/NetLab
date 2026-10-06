---
tags: [FISI, Lernspiel, Netzwerk, Klassenraum]
erstellt: 2026-10-06
aktualisiert: 2026-10-07
status: fertig – umsetzungsreife Spezifikation, Umsetzung noch nicht begonnen
---

# Klassenraum – Arbeitsordner

Hier liegt die **umsetzungsreife Fassung** des Arbeitsauftrags
[`../../../tools/auftraege/KLASSENRAUM.md`](../../../tools/auftraege/KLASSENRAUM.md)
(Lehrer-/Schüler-Instanz als Hobby-Fassung). Der Auftrag selbst bleibt unangetastet; dieser Ordner
beantwortet die Fragen, die er offen lässt, und belegt jede Antwort mit einer Messung.

**Einstieg:** die Endfassung
[`../Klassenraum – Umsetzungsreife Spezifikation.md`](../Klassenraum%20%E2%80%93%20Umsetzungsreife%20Spezifikation.md)
– sie ist der Vertrag, aus dem gebaut wird. Wer bauen will, nimmt zusätzlich den geschärften Auftragstext
[`../../../tools/auftraege/KLASSENRAUM-umsetzungsreif.md`](../../../tools/auftraege/KLASSENRAUM-umsetzungsreif.md).

## Aufbau

| Datei | Inhalt |
|---|---|
| [`A – Codec und Determinismus.md`](A%20%E2%80%93%20Codec%20und%20Determinismus.md) | Code-Format `NL-XXXX-XX`, Prüfsumme, Bit-Budget, Seed-Kanonisierung, `Spiel.klassenraum`-API, Ergebnis-Code `E-XXXX-XXX`, Speicherform, Netzkennwert |
| [`B – Oberfläche und Ablauf.md`](B%20%E2%80%93%20Oberfl%C3%A4che%20und%20Ablauf.md) | zwei Ansichten, DOM/Klassen/Tokens, alle Texte wörtlich, Startseiten-Zeile, Beamer-Lesbarkeit, Ampel, Export/Import, Server-Schalter |
| [`C – Rust, Live und QR.md`](C%20%E2%80%93%20Rust,%20Live%20und%20QR.md) | Server in der `.exe` (C1), gebautes eigenständiges Binary (C2), zwei Endpunkte, CORS/Ports/Grenzen, abhängigkeitsfreier QR-Encoder |
| [`D – Prüfung, Abnahme und Reihenfolge.md`](D%20%E2%80%93%20Pr%C3%BCfung,%20Abnahme%20und%20Reihenfolge.md) | 40 Testfälle, Abnahmebefehle mit Sollzahlen, Vorführdrehbuch, Risiken, Definition of Done, Architektur-Vorschlag |

Wiederlaufbare Proben: [`../../../tools/klassenraum-probe/`](../../../tools/klassenraum-probe/)
(Codec-Messung, QR-Referenz, HTTP-Probe) · gebauter Server:
[`../../../tools/klassenraum/`](../../../tools/klassenraum/) · Messdateien und Fotos:
`Nachweise/Klassenraum/` (nicht im Git).

## Was gemessen ist – und was nicht

**Belegt:** Determinismus über zwei getrennte Prozesse (12/12 Codes gleich), 92/92 Vertipper und 100 % der
10.000 Mutationen abgelehnt, 3.712 Kanonisierungspaare mit 94,83 % eigener Netzfassung, Export/Import
verlustfrei, C2-Server gebaut (322.560 B, `cargo test` 10/10, HTTP-Probe 20/20), QR-Encoder gegen eine
unabhängige Referenz 25/25 gleich und rückkodiert, Baukette byte-gleich, `node tests/run.js` 251/251.

**Nicht gemessen (ehrlich):** Rauchtest und Menüprobe (Edge startet in der Werkzeug-Sandbox nicht),
echte Vorführung mit zwei Browserprofilen oder Telefonen, Handy-Scan des QR-Codes, C1-Laufzeitbeweis,
Firewall-Abfrage.
