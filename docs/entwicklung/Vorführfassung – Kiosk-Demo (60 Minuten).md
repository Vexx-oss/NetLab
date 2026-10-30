---
tags: [FISI, Lernspiel, Netzwerk, Vorführung, Kiosk, Werkzeug]
erstellt: 2026-10-31
status: Gebaut und in Edge headless gemessen (22 von 22 Prüfungen grün); als Browserdatei ausgeliefert.
---

# Vorführ-Fassung – Kiosk-Demo (60 Minuten)

**Auftrag des Nutzers (31.10.2026):** „ließe sich netlab so einrichten dass es ne 1 stündige
demo version ist?" — gewählt wurde im Gespräch die **Vorführ-/Kiosk-Variante**: nach 60
Minuten automatisch zurück auf einen frischen Spielstand, gedacht für Beamer, Messe oder
einen Rechner im Computerraum, an dem mehrere Besucher nacheinander spielen.

**Was es geworden ist.** Eine eigene **Auslieferungsdatei**
`Programm/Netzwerk-Labor-Demo.html`, gebaut aus der fertigen Einzeldatei. Das normale Spiel
bleibt byte-gleich; es wird nur gelesen. Der Spielstand der normalen Fassung auf demselben
Rechner bleibt unberührt, weil die Vorführ-Fassung einen **eigenen Speicherplatz** benutzt.
Kurz: `python tools/kiosk.py` → fertig.

## 1 · Warum nicht im Spielcode

Die Vorführ-Fassung ist eine **Betriebsart der Auslieferung**, keine Spielfunktion. Drei
Gründe für den Weg über das Werkzeug statt über `src/`:

1. **Kein Risiko für das Spiel.** Kein Modul, keine Datenform, kein Testhaken ändert sich;
   die 878 Tests und die Simulation bleiben unberührt. Der normale Bau ist und bleibt die
   Grundlage — die Demo entsteht nur, wenn jemand sie ausdrücklich baut.
2. **Die Rücksetzung braucht keine Spiel-API.** Sie löscht den eigenen Speicher *vor* dem
   Start der Spielskripte und lädt die Seite neu. Das Spiel merkt davon nichts und kann
   sich auch nicht dagegen wehren (kein Sonderfall in `Spiel`, `store` oder `UI`).
3. **Ein Spielstand pro Rechner bleibt heil.** Der eigene Speicherplatz ist die
   Voraussetzung dafür, dass eine Vorführdatei auf demselben Rechner nicht den privaten
   Spielstand der normalen Fassung löscht.

## 2 · Aufbau (zwei Einschübe, drei Ersetzungen)

| Was | Wo im Bau | Datei | Zweck |
|---|---|---|---|
| **Vorlauf** | im `<head>`, vor allen Spielskripten | `tools/kiosk/vorlauf.js` | entscheidet **vor** dem Laden des Spielstands: neuer Besuch = frisch; Neuladen (F5) = behalten; Stunde abgelaufen = frisch. Setzt den Startzeitpunkt. |
| **Anzeige** | nach dem Spiel, vor dem Lizenzblock | `tools/kiosk/anzeige.js` | Chip „Vorführung · 47 Min" unten, nach Ablauf die Karte „Vorführung beendet" und dann Neuladen. |
| **Speicherplatz** | 3 Stellen in der Einzeldatei | `tools/kiosk.py`, `ERSETZUNGEN` | aus `"netzwerk-labor"` wird `"netzwerk-labor-vorfuehrung"` — eigener Speicher. |

Die drei Stellen des Speicherplatzes sind **nicht optional**:

1. `const SCHLUESSEL = "netzwerk-labor";` (`src/plattform/plattform-browser.js`) — Lesen/Schreiben.
2. `window.localStorage.getItem("netzwerk-labor")` (`src/kern/basis.js`, „Frühstart") — füllt
   den Speicher **bevor** der Lernmotor lädt.
3. `e.key !== "netzwerk-labor"` (`src/ui/start.js`) — Fenster-Wächter (zwei Fenster auf einem Stand).

**Dieser Befund hat die Bauform gerettet:** Der erste Messlauf war **21/22** — „Neuladen (F5)
hält den Fortschritt" war rot. Ursache: Die Ersetzung kannte nur Stelle 1; der Frühstart in
`kern/basis.js` las weiter den **leeren normalen** Speicher, hielt den Stand für „keiner da"
und schrieb beim ersten Speichern einen frischen Stand über den Vorführ-Speicher. Ergebnis:
Rücksetzung bei jedem Neuladen statt nach 60 Minuten. Erst nach der zweiten Ersetzung war der
Lauf 22/22 grün. Die Format-Kennung `"format": "netzwerk-labor"` für Export/Import bleibt
absichtlich unangetastet — die gehört zum Dateiformat, nicht zum Speicher.

## 3 · Gemessen (Edge headless über `file://`, 31.10.2026, Fassung 2.5.1)

`python tools/kiosk.py --messen` baut zwei Probefassungen (9 s und 60 Minuten), startet Edge
headless über `file://` (der Weg eines Doppelklicks) und misst:

| Fall | Messwert |
|---|---|
| Start | Chip sichtbar, „Vorführung · 0:09", unterer Rand 635 px; frischer Stand 0 € / Stufe 1 |
| Restzeit läuft | 7.922 → 6.620 ms |
| Fortschritt gesetzt | 4.242 € im Vorführ-Speicher, `localStorage["netzwerk-labor"]` = **null** |
| 60-Minuten-Fassung: 999 € gesetzt | steht im Vorführ-Speicher (26.895 B) |
| Neuladen (F5) | 999 € und Stufe 3 **bleiben**; Sitzung `"1"`, Startzeit unverändert |
| Neues Fenster (neuer Browserstart) | frischer Stand 0 € / Stufe 1 — der vorherige Fortschritt ist weg |
| Ablauf (9-s-Probe) | Karte „Vorführung beendet", danach Neuladen: 0 € / 0 Ruf / Stufe 1 / 0 erledigt; neue Stunde mit Restzeit 5.629 ms |
| normaler Speicher | in allen Läufen `localStorage["netzwerk-labor"]` = null (unberührt) |
| JS-/Konsolenfehler | 0 in beiden Läufen |
| Grundlage | `Netzwerk-Labor.html` und `docs/index.html` vor/nach dem Bau byte-gleich |

Bilder: `Nachweise/vorfuehrung/kiosk-chip.png` und `kiosk-ruecksetzung.png` (nicht versioniert).

**Der ausgelieferte Bau:** `Programm/Netzwerk-Labor-Demo.html` — **3.591.584 B**, SHA256
`17690c49779f20f3…c3461a81`, 0 Außenverweise, Lizenzblock enthalten, Titel
„Netzwerk-Labor – Vorführung". `python tools/kiosk.py --pruefen` und
`python tools/einfach.py --pruefen` sind grün; `tools/starttest.py` meldet 0 JS-Fehler,
drei geladene Schriften, 3.393 CSS-Regeln (dieselben 47 Knöpfe wie die normale Fassung).

## 4 · Verhalten im Betrieb

* **Doppelklick** auf die Datei → frischer Stand, Chip unten mit Restzeit.
* **F5/Neuladen** → Stand bleibt (niemand verliert Fortschritt durch einen Unfall).
* **Fenster schließen und neu öffnen** → neuer Besucher beginnt bei 0.
* **Nach 60 Minuten** → kurze Karte, automatischer Neustart mit frischem Stand; die nächste
  Stunde läuft sofort weiter. Niemand muss etwas drücken.
* **Der Betreiber** kann jederzeit über *Einstellungen → Neu anfangen → „Von 0 anfangen"*
  zurücksetzen — das ist der normale Weg des Spiels und funktioniert auch hier.

## 5 · Grenzen — bewusst und benannt

* **Kein Kopierschutz.** Eine `.html`-Datei ist lesbar, und die normale Fassung ist frei
  herunterladbar. Die Vorführ-Fassung ist eine Hilfe für den Stand, **kein Verkaufsschloss**
  (dieselbe Einschätzung wie `Markt – Monetarisierung.md` § 10.5: Kopierschutz/DRM wird
  nicht funktionieren).
* **Ein Fenster.** Zwei Tabs auf demselben Speicher überschreiben sich (bei der normalen
  Fassung genauso). Für den Stand: ein Fenster, Vollbild (F11).
* **Nur Browser.** Eine `.exe`-Vorführ-Fassung wurde **nicht gebaut**: In der Rust-Hülle
  liegt der Spielstand außerhalb von `localStorage`, und ein Seiten-Neuladen brächte den
  alten Stand zurück (Befund 30.10.2026, `src/ui/uebergabe.js`). Die Anzeige hat einen
  vorbereiteten Weg für diesen Fall, er ist aber **in dieser Sitzung nicht gemessen**.
* **Die Uhr ist die Systemzeit.** Wer sie stellt, verschiebt die Stunde. Für eine Vorführung
  reicht das; für einen Schutz nicht (siehe oben).
* **Der Chip ist sichtbar.** Das ist Absicht — bei einer Vorführung soll man sehen, dass es
  eine Vorführung ist.

## 6 · Dateien und Befehle

```
tools/kiosk.py                 Bau, Prüfung, Messung; Kopfkommentar = Bedienungsanleitung
tools/kiosk/vorlauf.js         Einschub 1: Speicher, Sitzung, Startzeit
tools/kiosk/anzeige.js         Einschub 2: Chip, Rücksetzung, Messhaken (window.__vorfuehrung)
Programm/Netzwerk-Labor-Demo.html   Erzeugnis (nicht versioniert, wie die .exe)
Programm/LIESMICH-Demo.txt     kurze Anleitung neben der Datei
```

```bash
python tools/kiosk.py                        # bauen (60 Minuten) -> Programm/Netzwerk-Labor-Demo.html
python tools/kiosk.py --minuten 45           # andere Dauer
python tools/kiosk.py --pruefen DATEI        # Struktur prüfen
python tools/kiosk.py --messen               # Verhalten in Edge headless messen (~1 Minute)
```

Bau und Bedienung stehen auch in [Bauen.md](../Bauen.md) (Abschnitt „Die Vorführ-Fassung
(Kiosk, 60 Minuten)").

## 7 · Offen (nicht Teil dieses Auftrags)

* **`.exe`-Vorführ-Fassung** — bräuchte eine Rücksetzung in der Rust-Hülle (oder das
  Nachbauen der Oberfläche im laufenden Prozess wie `src/ui/uebergabe.js`); erst sinnvoll,
  wenn die Vorführung wirklich auf dem Windows-Programm laufen soll.
* **Automatischer Vollbild-Start** beim Öffnen der Demo-Datei — geht im Browser nur nach
  einer Nutzergeste, ist also für einen Doppelklick-Ablauf nicht verlässlich.
* **Leerlauf-Rücksetzung** (z. B. nach 10 Minuten ohne Eingabe) — bewusst nicht eingebaut:
  der Auftrag war die Stunde, und eine zweite Uhr hätte die Vorführung nur unberechenbar
  gemacht.
