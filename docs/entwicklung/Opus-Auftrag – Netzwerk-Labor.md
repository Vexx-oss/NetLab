---
tags: [FISI, Lernspiel, Auftrag]
erstellt: 2026-09-30
aktualisiert: 2026-09-30 (Desktop-Programm mit Tauri)
---

# 🤖 Opus-Auftrag – Netzwerk-Labor

⬆️ [[10-Projekte/Lernprojekte/Netzwerk-Labor/Liesmich|Netzwerk-Labor]] · Grundlage: [[Konzept – Netzwerk-Labor]]

Den Block unten in eine neue Sitzung kopieren (Arbeitsordner: `Documents\Joshua`, Modell Opus). Er ist absichtlich eigenständig. **Eine Phase je Sitzung** ist am robustesten: für die nächste den Block wiederverwenden und `PHASE` austauschen. **Phase 0 immer allein**, sie enthält die ganze Infrastruktur (Rust-Build, Linux-Umgebung, Fensterverhalten).

````text
Du baust das „Netzwerk-Labor“: ein Lernspiel für FISI-Auszubildende, in dem man als Ein-Mann-Systemhaus
Netzwerk-Tickets in einem echten Netzwerk-Simulator löst (Diagramm + Konfig-Panels + IOS-ähnliche Konsole),
mit Karriere- und Idle-Schicht. Es ist ein EIGENSTÄNDIGES DESKTOP-PROGRAMM für Windows (.exe) und Linux,
das sich am Bildschirmrand still und minimal verhält, ohne die Sicht des Nutzers zu verdecken.
Die Spezifikation liegt fertig vor. Setze sie um, entscheide Details selbst, halte Entscheidungen im Log fest.

PHASE: 0 (Hülle und Grundlage, siehe Konzept § 11). Erst danach Phase 1.

ZUERST LESEN (in dieser Reihenfolge, vollständig):
1. 10-Projekte/Lernprojekte/Netzwerk-Labor/Konzept – Netzwerk-Labor.md   ← Spezifikation, verbindlich
   (für Phase 0 besonders § 9 „Technik und Desktop-Hülle“ mit 9.1–9.8, dazu § 11 und § 12)
2. 10-Projekte/Lernprojekte/FISI-Spielhalle/Plan – Spielhalle 2.0.md und Liesmich.md   ← Vorbild und Konventionen
3. FISI-Spielhalle/src/kern.js, lernmotor.js, ui.js, stil.css, tests.html und bauen.py
   ← so ist die Spielhalle gebaut; das Labor nutzt DENSELBEN Lernmotor (zur Bauzeit eingebunden, nicht kopiert)
4. Stoffquellen für spätere Lehrtexte in 20-Bereiche/Umschulung/Netzwerk/: Network – Lernfassung.md,
   VLAN – Lernfassung.md (enthält Cisco-Befehle), TCP – Lernfassung.md, 04-AP1-Netzwerk.md,
   07-Uebungen-Subnetting-Szenarien.md, Fragen – Netzwerke planen.md

TECHNIK (entschieden, nicht neu verhandeln)
- Tauri 2 als Hülle, Oberfläche und Spiellogik in schlichtem JavaScript (kein Bundler, kein TypeScript, kein npm für die App).
  Tauri lädt den von bauen.py gebauten Ordner web/; API über app.withGlobalTauri (window.__TAURI__) – vorher in der
  aktuellen Tauri-Doku gegenprüfen, die Konfiguration kann sich geändert haben.
- Rust-Seite dünn halten (Fenster, Tray, Speichern, Autostart, Einzelinstanz; grob < 500 Zeilen).
- Der Kern kennt nur die Plattform-Schnittstelle (src/plattform/plattform.js), nie Tauri direkt. Zwei Umsetzungen:
  plattform-tauri.js und plattform-browser.js (Browser-Fassung als Einzeldatei über bauen.py --paket).
  plattform.kann("...") blendet Nicht-Unterstütztes aus, mit einem Satz Begründung. Es darf nie etwas brechen.
- Speichern: Cache mit Durchschreiben, damit `store.get/set` des Lernmotors synchron bleiben. Rust schreibt atomar
  (temporäre Datei, dann umbenennen), 5 rotierende Sicherungen, Versionsfeld, Export/Import per Dateidialog.
- Ein Fenster, zwei Ansichten (Leiste/Voll) plus Tray. Leiste: rahmenlos, klein, halbdurchsichtig, ohne Fokus,
  nur Maus, kein Ton, neue Tickets nur als Zähler/Punkt. Regeln in Konzept § 9.7 sind verbindlich.
- Zeigerereignisse statt HTML5-Drag-and-Drop; konservatives CSS; Schriften lokal (woff2), keine externen Anfragen.
- sim/ und cli/ greifen NIE auf DOM, Datum oder Zufall direkt zu (Zufall nur über übergebenen Seed).
- Simulation = ereignisgesteuert auf Frame-Ebene, Ergebnis eine Trace als reine Daten (für spätere Phasen).
- Deutsche Oberfläche, Anrede „du“. Keine erfundenen Fachinhalte, jeder Lehrtext mit Quelle, Unbelegtes als „IOS-ähnlich“.
  Kein Cisco-Logo, keine Cisco-Symbole. Fertigkeiten heißen lab.*, Thema „Netzwerk“.

UMGEBUNG (am 30.09.2026 auf diesem Rechner geprüft)
- Vorhanden: Rust 1.97.1 (cargo, rustc), Visual Studio 2022 Community (C++-Arbeitslast NICHT geprüft), WebView2 154,
  Python 3.14, Git, Docker, WSL2 mit Ubuntu 26.04 (WSLg: Wayland, DISPLAY=:0 für XWayland).
- Fehlt: Node, tauri-cli. In der WSL-Ubuntu fehlt ALLES (gcc, cargo, node, pkg-config, WebKitGTK-Entwicklungspakete).
- Der Nutzer hat Werkzeug-Installationen ausdrücklich erlaubt. Trotzdem: Vor jeder Installation mit Adminrechten
  (winget, sudo apt) einen Satz „was und warum“ nennen, nur installieren, was Phase 0 braucht (Konzept § 9.8,
  erste vier Zeilen), Versionen ins Log. Paketnamen auf Ubuntu 26.04 mit apt-cache prüfen. Beim WSL-Start erscheint
  eine Netzwerkwarnung (Fallback VirtioProxy); falls apt deshalb scheitert, Ursache klären statt umgehen.
- Der erste Rust-Build dauert Minuten: im Hintergrund laufen lassen, nicht danebenstehen.

ABNAHME PHASE 0 (sichtbare Abläufe, nicht „Modul existiert“)
  1. Netzwerk-Labor.exe startet per Doppelklick unter Windows; die Linux-Fassung startet in WSLg.
     Probiere in WSLg beides: mit GDK_BACKEND=x11 (XWayland) und ohne (Wayland).
  2. Leiste ⇄ Vollansicht per Klick, im selben Fenster; die Vollansicht baut ihr DOM beim Wechsel ab.
  3. Tray-Symbol; ein simuliertes Ticket (Testknopf) setzt Punkt und Zähler, OHNE Fokus, Ton oder Pop-up.
  4. Neustart des Programms behält den Zustand; beschädigte Datei → letzte Sicherung wird geladen und gemeldet.
  5. Zweiter Start holt die Leiste nach vorn statt ein zweites Programm zu öffnen.
  6. Die Tabelle aus Konzept § 9.4 ist je System ausgefüllt (getestet, nicht angenommen), Rückfall-Anzeigen funktionieren.
  7. Browser-Fassung (bauen.py --paket): START.html öffnet per Doppelklick, Konsole ohne Fehler.
  8. Lernmotor eingebunden: eine lab.*-Fertigkeit erscheint im Lernstand; tests.html grün, Node-Lauf (tests/run.js) grün.
  9. Leerlaufwerte (CPU, Speicher) in Tray und Leiste gemessen, Windows und Linux, Zahlen im Log. Keine Grenzwerte erfinden.

VORGEHEN
1. Kurze Architekturskizze in Netzwerk-Labor/Architektur.md (Plattform-Schnittstelle, Speichern, Fensterzustände,
   Datenmodell-Entwurf für Gerät/Kabel/Config/Frame/Trace), dann sofort bauen. Nicht auf Freigabe warten.
2. Zuerst der dünnste Durchstich: leeres Fenster → Leiste ⇄ Voll → Tray → Speichern. Dann Linux. Dann verbreitern.
3. Nach jedem größeren Baustein: Tests grün, dann EINE gezielte Sichtprüfung im echten Programm (Bildschirmfoto).
   Keine endlosen Prüfschleifen. Fehler gezielt beheben.
4. Logge in 90-Werkstatt/Logs/<Datum>.md: was gebaut, was geprüft (mit Zahlen), was bewusst vereinfacht, was offen.
5. Am Ende: beide Fassungen frisch bauen, Windows-exe aus leerem Ordner starten, Linux-Fassung in WSLg starten.

ANTI-MUSTER (aus früheren Läufen)
- Nicht Module „neben das System“ schreiben: Tests grün, im Programm null Wirkung.
- Nicht behaupten, etwas sei geprüft, wenn nur der Code gelesen wurde. Ehrlich berichten, was gelaufen ist und was nicht.
- Fensterfunktionen NICHT als „geht“ melden, bevor sie auf dem jeweiligen System gesehen wurden (WSLg ≠ echtes GNOME/KDE).
- Kein Aufblähen: Nur 7 Gerätetypen im Spiel, Tiefe im Verhalten. Streichliste im Konzept § 12 beachten.

Wenn du an einer Stelle wirklich nicht weiterkommst, wähle die einfachere Lösung, dokumentiere sie und melde sie im
Abschlussbericht. Frage nur bei echten Blockaden. Unbeantwortet bleibt die Linux-Frage (welche Distribution/Oberfläche):
baue für „GNOME unter Wayland“ als schwächsten Fall.
````

## Vorlage für Folgephasen

Gleicher Block, `PHASE` und Leseliste anpassen. Installationsregel und Anti-Muster bleiben.

| PHASE | Zusatz zum Block |
|---|---|
| 1 | Konzept §§ 3–5 und 7 vollständig lesen. Abnahme: Ticket „Salon: Drucker nicht erreichbar“ von Anfang bis Abnahme im **Programm** lösbar, Golden-Traces grün, Bedienung nach § 7 |
| 2 | Konzept § 6 vollständig lesen, IOS-Ausgaben belegen (Cisco-Doku), `write erase`/`vlan.dat`-Verhalten vor dem Einbau an einer Quelle prüfen |
| 3 | Reason-Codes und Lehrtexte aus § 5.4 vervollständigen; TCP-Handshake im PDU-Inspektor |
| 4 | Ticket-Generator und Injektoren nach § 8.2 **mit** automatischer Ticketprüfung; Prüfungstag aus der Spielhalle wiederverwenden |
| 5 | Leiste bei 320 × 220 px prüfen; Ticket-Eingang ohne Fokusklau **auf beiden Systemen** testen; Playbooks an `L.istFaellig` koppeln; Vollbild-Ausblendung (Windows) |
