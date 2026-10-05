---
tags: [FISI, Lernspiel, Netzwerk]
erstellt: 2026-09-30
aktualisiert: 2026-10-01
status: Version 1.1 (Windows-.exe; Linux-Pakete Stand 1.0) – wird ausgebaut
---

# 🖧 Netzwerk-Labor

Lernspiel im Stil von Packet Tracer plus Karriere- und Idle-Schicht: Als Ein-Mann-Systemhaus löst du Netzwerk-Tickets in einem echten Simulator (Diagramm, Konfig-Panels, IOS-ähnliche Konsole). Können ist die Währung: Wer etwas sicher beherrscht, darf es automatisieren. Wer nicht weiterkommt, bekommt eine Hilfeleiter bis zur vorgeführten Lösung.

## ▶ Starten
- **Windows:** `Programm/Netzwerk-Labor.exe` per Doppelklick (SmartScreen: „Weitere Informationen → Trotzdem ausführen“).
- **Linux:** `Programm/linux/` – `.deb` (Ubuntu/Debian) oder AppImage, **Stand 1.0** (für 1.1 vorerst keine eigene Linux-Fassung). Details und was auf welchem System geht: [[Programm/PLATTFORM|PLATTFORM]].
- Anleitung für die Klasse: `Programm/LIESMICH.txt`.

## Was drin ist (Version 1.0)
- **Simulation** auf Frame-Ebene: ARP, Switching mit MAC-Lernen, VLAN/802.1Q, Router-on-a-Stick, statische Routen, ICMP (Timeout vs. unreachable, TTL), ACL, NAT/PAT, DHCP mit Relay, DNS, TCP-Handshake, HTTP, Firewall mit Zonen und Port-Weiterleitung, Internet als Kulisse, Broadcast-Sturm. Jede Antwort ist aus Paketen hergeleitet; die Simulation spielt Schritt für Schritt ab (PDU-Ansicht).
- **Konsole** IOS-ähnlich (Modi, Kurzformen, `?`, Tab, `do`, running/startup, `write erase`/`vlan.dat`) und Windows-Terminal (`ipconfig`, `ping`, `tracert`, `arp -a`, `nslookup`).
- **Spiel:** 37 handgeschriebene Tickets in 5 Karrierestufen (Salon, Bäckerei, Schreibbüro, Arztpraxis, Autohaus, Mittelstand) inkl. 4 Projekte; unbegrenzt generierte Tickets (5 Netzvorlagen × 30 Fehlerinjektoren, jede Variante automatisch geprüft); 83 Mini-Tickets für die Leiste; Hilfeleiter 0–6; Abnahme mit Regressions- und Neustart-Test; Sterne, Euro, Ruf; Wartungsverträge, Playbooks, Offline-Bericht; Prüfungstag nach IHK-Notenschlüssel; Lernmotor der Spielhalle (Wiederholung nach Plan).
- **Desktop:** ein Fenster, zwei Ansichten (Vollansicht ⇄ Leiste am Bildschirmrand), Tray mit Punkt, Strg+Alt+L, Einzelinstanz, Autostart auf Wunsch, Spielstand atomar mit 5 Sicherungen, Export/Import.

## Neu in 1.1 (aus dem Durchspielen im echten Programm)
- **Konsole, Simulations-Panel und PDU-Ansicht** sind jetzt richtig gestaltet (die Stylesheets fehlten in 1.0 ganz): dunkles Terminal, Inspektor wird für 80-Zeichen-Tabellen breiter; Ereignisliste mit Abspielsteuerung, Filter und Paketfeldern Schicht für Schicht. Normales Verwerfen (fremde Broadcasts, erstes Paket während ARP) gilt nicht mehr als „Problem“.
- **Einstieg:** Coach-Hinweis erscheint sofort und wählt das passende Werkzeug vor; Meldungen verdecken die Geräte nicht mehr; Vorhersage-Dialog rechts, damit das Netz sichtbar bleibt.
- **Motivation mit Lernwert:** 15 Abzeichen für Arbeitsweisen (selbst finden, vorher denken, verteilt üben), Fortschrittsbalken zur nächsten Stufe, Feierabend-Bilanz beim Tagesziel mit den morgen fälligen Themen.
- **Prüfungstag und generierte Tickets** nennen das Symptom aus Kundensicht statt der Ursache.
- **Leiste:** aufgeklappt 320 × 300 (Mini-Ticket passt ohne Scrollen), Ecke aus den Einstellungen wirkt jetzt.
- **Spielstand:** zusätzlich „vorheriger Stand“ (alle 15 min), wird bei beschädigter Datei zuerst geladen.
- Kleinere Fehler: Strg+C bei Konsolen-Rückfragen, Shop-Texte, Hilfeleiter-Höhe, Einpassen der Ansicht.

## Aufbau
- [[Konzept – Netzwerk-Labor]] (Spezifikation) · [[Architektur]] (Vertrag zwischen den Bausteinen) · [[Opus-Auftrag – Netzwerk-Labor]] (ursprünglicher Bauauftrag) · [[Befund – Programm startet wieder]] (05.10.2026: WebView2-Ausfall und Reparatur)
- **Ausbau 1.2 (läuft):** [[Plan – Ausbau 1.2]] (Phasen, Stand) · [[Design – Spielspaß 2.0]] (Befunde, 12 Hebel, Scorecard, Startblöcke für Opus)
- `src/` Code (kern, modell, sim, cli, daten, spiel, plattform, ui, stil) · `shell/src-tauri/` Rust-Hülle · `tests/` (124 Tests, `sh tools/test.sh`) · `tools/` (bauen, testen, messen) · `Programm/` fertige Programme
- Versionen: Git im Projektordner (Tags `endversion-1.0`, `v1.1`); die Endversion 1.0 liegt zusätzlich unter `Programm/Endversion-1.0/`.

## Ehrliche Grenzen
- Arbeitsspeicher im Leerlauf rund 0,5 GB (WebView2), CPU praktisch null.
- Linux nur in WSLg getestet, nicht auf echtem GNOME/KDE; dort kein Tray-Dienst.
- Konsole „IOS-ähnlich“, kein Cisco-Nachbau; STP, OSPF, IPv6 und Storage-Kunden (Stufe 6) noch nicht.

Verwandt: [[10-Projekte/Lernprojekte/FISI-Spielhalle/Liesmich|FISI-Spielhalle]] (liefert den Lernmotor) · [[20-Bereiche/Karriere – Storage & Cloud/Liesmich|Karriere – Storage & Cloud]] (späteres Ziel Stufe 6)

⬆️ [[10-Projekte/Lernprojekte/Liesmich|Lernprojekte]] · 🏠 [[Start]]
