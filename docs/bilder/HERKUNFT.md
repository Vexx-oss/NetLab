# Herkunft der Bilder

Diese Bilder sind **Ausschnitte aus den Abnahme-Nachweisen** des Projekts, keine
gestellten Aufnahmen. Quelldatei, Pruefsumme und Groesse stehen unten; die Originale
liegen unter `Nachweise/` (nicht im Git, weil 22 MB Beweismaterial).

Bearbeitung: **nur auf Breite skaliert und als JPEG gespeichert.** Nicht beschnitten,
nicht retuschiert.

**Die Bilder zeigen die Fassung 1.1.0** — die Nachweise wurden vor dem Versionssprung
auf 1.2.0 aufgenommen. Die Oberflaeche ist dieselbe; die kleinen Ziffern in der Kopfzeile
der Bilder sind der einzige Unterschied. Neue Nachweise werden mit der jeweils aktuellen
Fassung erzeugt.

Neu bauen: `python tools/bilder.py` · Pruefen: `python tools/bilder.py --pruefen`


| Bild | aus Nachweise/ | Groesse | SHA256 (Bild) |
|---|---|---|---|
| `topologie.jpg` | `1.2-Topo/topo-praxis-mit-tasten.png` | 102,251 B | 208e48bd03accc6b |
| `einstieg.jpg` | `1.2-Phase-A/nachher-1366-1-start.png` | 90,960 B | 35dad476e939bfe3 |
| `konsole.jpg` | `1.2-C/c-1366-3-terminal-diagnose.png` | 151,061 B | 4a768c2dfe7a6014 |
| `simulation.jpg` | `1.2-Phase-A/nachher-1366-8-sim.png` | 106,088 B | 9fd0246ca8916486 |
| `kompetenzkarte.jpg` | `1.2-E2/e2-1366-5-kompetenzkarte.png` | 119,266 B | b732452c9c14d15f |
| `ergebnis.jpg` | `1.2-S2/s2-1366-1-erster-auftrag.png` | 73,753 B | 3160af377bdc6e54 |
| `postfach.jpg` | `1.2-C/c-1366-1-postfach.png` | 110,112 B | ec5426eb6e9dabfe |
| `hilfe.jpg` | `1.2-C/c-1366-8-hilfe-naechste-diagnose.png` | 112,689 B | 6c72c5f6d77ee865 |

## Was auf welchem Bild zu sehen ist

- **`topologie.jpg`** — Topologie der Arztpraxis mit Adressschildern, VLAN-Flaechen und den drei Werkzeugen
- **`einstieg.jpg`** — Der erste Auftrag „Kasse ohne Netz“: Ticket, Ziele, Senioren-Hinweis, Labor
- **`konsole.jpg`** — IOS-aehnliche Konsole und Windows-Terminal bei der Fehlersuche (ping, nslookup)
- **`simulation.jpg`** — Simulation auf Frame-Ebene: 42 Ereignisse, Filter nach ARP/ICMP, PDU-Ansicht
- **`kompetenzkarte.jpg`** — Lernstand: Kompetenzkarte, Fehlerheft, Stufen „neu“ bis „gemeistert“
- **`ergebnis.jpg`** — Abnahme bestanden: Sterne, Lohn, Abzeichen, „Merke“-Kasten mit Lernquelle
- **`postfach.jpg`** — Postfach: Kundenmails mit Symptom aus Kundensicht
- **`hilfe.jpg`** — Die Hilfeleiter: naechste Diagnose vorschlagen, Fehler kostet nichts
