# Netzwerk-Labor

Lernspiel im Stil von Packet Tracer plus Karriere- und Idle-Schicht für FISI-Auszubildende (IHK AP1/AP2). Als Ein-Mann-Systemhaus löst du Netzwerk-Aufträge in einem echten Simulator: Pakete laufen Frame für Frame (ARP, Switching, VLAN, Routing, ACL, NAT, DHCP, DNS, TCP/HTTP, Firewall), Konfiguration über Diagramm, Inspektor und IOS-ähnliche Konsole. Wer nicht weiterkommt, bekommt eine Hilfeleiter bis zur vorgeführten Lösung. Können ist die Währung: Wiederholung nach Lernplan (Lernmotor), Automatisierung erst für sicher Beherrschtes.

Desktop-Programm (Tauri 2, Windows). Oberfläche und Logik in schlichtem JavaScript ohne Bundler, Rust-Hülle dünn. Alles läuft lokal und offline, nichts wird gesendet.

> Kein Cisco-Produkt. Die Konsole ist „IOS-ähnlich“ und kennzeichnet Unbelegtes als solches.

## Stand

| Zweig / Tag | Inhalt |
|---|---|
| `master`, Tag `v1.1` | Version 1.1 (Windows-.exe), 124 Tests |
| `ausbau-1.2` | Ausbau 1.2 in Arbeit: Phase 0/A fertig (ruhigere Oberfläche, Geräte-Fächer, Auftragsmappe), Spielspaß-Konzept und Fahrplan |
| Tag `endversion-1.0` | Rückfallstand 1.0 |

## Bauen und testen

```bash
python bauen.py                 # src/ -> web/index.html (Einzeldatei) 
sh tools/test.sh                # Tests headless in Node (Node 24 portabel unter %LOCALAPPDATA%\node-portable)
python tools/klassen.py         # Abgleich: Klassen im JS <-> Regeln im CSS
python tools/cdp.py start --frisch   # echtes Programm starten und per DevTools-Protokoll steuern/messen
```

Windows-Programm (Rust und WebView2 nötig):

```bash
cd shell/src-tauri
CARGO_TARGET_DIR=<schneller-Ordner>/target cargo tauri build --no-bundle
```

Die fertigen Programme (`Programm/`) und die Bildschirmfoto-Nachweise (`Nachweise/`) liegen bewusst nicht im Git.

## Aufbau

- `src/` – Code in Schichten: `kern` · `modell` · `sim` · `cli` · `daten` · `spiel` · `plattform` · `ui` · `stil`. `sim/` und `cli/` laufen headless (kein DOM, keine Uhr, kein Zufall ohne Seed).
- `shell/src-tauri/` – Rust-Hülle (Fenster, Leiste, Tray, Speichern, Autostart).
- `tests/` – Tests (`sh tools/test.sh`), jedes Ticket wird automatisch validiert.
- `tools/` – Bau-, Mess- und Testwerkzeuge.

## Dokumente

Die Notizen sind Obsidian-Dateien (Wikilinks); lesbar sind sie auch als Text.

- [`Architektur.md`](Architektur.md) – verbindlicher Vertrag zwischen den Bausteinen
- [`Konzept – Netzwerk-Labor.md`](Konzept%20%E2%80%93%20Netzwerk-Labor.md) – Spezifikation
- [`Plan – Ausbau 1.2.md`](Plan%20%E2%80%93%20Ausbau%201.2.md) – Phasen, Stand, Messwerte
- [`Design – Spielspaß 2.0.md`](Design%20%E2%80%93%20Spielspa%C3%9F%202.0.md) – Befunde, zwölf Hebel, Scorecard, Startblöcke

## Lizenz

Noch nicht festgelegt (alle Rechte vorbehalten). Die Schriften unter `schriften/` stehen unter der SIL Open Font License (Lizenztexte liegen dabei).
