---
tags: [FISI, Lernspiel, Netzwerk]
erstellt: 2026-09-30
aktualisiert: 2026-10-06
status: Version 1.2 (Browser-Einzeldatei + Windows-.exe + Android-.apk; Linux-Pakete Stand 1.0) – wird ausgebaut
---

# 🖧 Netzwerk-Labor

Lernspiel im Stil von Packet Tracer plus Karriere- und Idle-Schicht: Als Ein-Mann-Systemhaus löst du Netzwerk-Tickets in einem echten Simulator (Diagramm, Konfig-Panels, IOS-ähnliche Konsole). Können ist die Währung: Wer etwas sicher beherrscht, darf es automatisieren. Wer nicht weiterkommt, bekommt eine Hilfeleiter bis zur vorgeführten Lösung.

## ▶ Starten
- **Im Browser, ohne Download:** [vexx-oss.github.io/NetLab](https://vexx-oss.github.io/NetLab/) – ein Klick, spielt sofort. Kein Entpacken, keine Installation, kein Internet. (Das Repositorium hieß früher `Side-Project`; GitHub leitet die alte Adresse um.)
- **Eine Datei für alles:** `docs/index.html` bzw. `Netzwerk-Labor.html` aus dem Release-ZIP – das ganze Spiel in **einer** HTML-Datei, Schriften eingebettet, läuft per Doppelklick auf Windows, Linux und macOS. Gebaut von `python tools/einfach.py`.
- **Windows-Programm:** `Programm/Netzwerk-Labor.exe` per Doppelklick (SmartScreen: „Weitere Informationen → Trotzdem ausführen“). Bringt zusätzlich Leiste, Tray und globales Tastenkürzel.
- **Android:** `Programm/Netzwerk-Labor-1.2.4-Android.apk` aufs Telefon kopieren und antippen (einmal „Unbekannte Apps installieren“ erlauben). Kein Play Store, kein Konto, **keine Berechtigung** — die App darf nicht einmal ins Netz. **Hoch- und Querformat:** die App dreht frei (im Manifest `screenOrientation="unspecified"` statt der früheren Querformat-Sperre); ein Dreh lädt die Seite **nicht** neu und kostet keinen Spielstand. Bauzählung `versionCode 10202` bei unveränderter Spielversion `versionName 1.2.4` — nur mit größerem Code lässt sich die neue APK über die alte installieren. Bauen und alle Grenzen: [[android/LIESMICH|Netzwerk-Labor für Android]]. **Nach dem 06.10.2026 neu gebaut** (988.700 Bytes): elf Fehler in den tief genesteten Menüs behoben — zu kleine Trefferflächen (40 × 44 und 96 × 18 px), ein eingeklapptes Dock-Blatt, das 412 × 520 px deckend über der Leinwand stehenblieb, das Wort „null“ im Reiterstreifen, ein Menü, das unten aus dem Fenster ragte. Gemessen mit `tools/menueprobe.py`: 5 Profile, 49 Kriterien erfüllt, 0 verletzt.
- **Linux:** `Programm/linux/` – `.deb` (Ubuntu/Debian) oder AppImage, **Stand 1.0** (für 1.1/1.2 vorerst keine eigene Linux-Fassung). Details und was auf welchem System geht: [[Programm/PLATTFORM|PLATTFORM]].
- **Auslieferungspaket bauen:** `python tools/paket.py` → `dist/Netzwerk-Labor-<Version>-Windows.zip` mit Einzeldatei, `.exe`, Anleitung und Lizenztexten.
- Anleitung für die Klasse: `Vorlagen/LIESMICH.txt` (Quelle) → liegt im Paket als `LIESMICH.txt`.

## Was drin ist (Version 1.0)
- **Simulation** auf Frame-Ebene: ARP, Switching mit MAC-Lernen, VLAN/802.1Q, Router-on-a-Stick, statische Routen, ICMP (Timeout vs. unreachable, TTL), ACL, NAT/PAT, DHCP mit Relay, DNS, TCP-Handshake, HTTP, Firewall mit Zonen und Port-Weiterleitung, Internet als Kulisse, Broadcast-Sturm. Jede Antwort ist aus Paketen hergeleitet; die Simulation spielt Schritt für Schritt ab (PDU-Ansicht).
- **Konsole** IOS-ähnlich (Modi, Kurzformen, `?`, Tab, `do`, running/startup, `write erase`/`vlan.dat`) und Windows-Terminal (`ipconfig`, `ping`, `tracert`, `arp -a`, `nslookup`).
- **Spiel:** 58 handgeschriebene Tickets in 6 Karrierestufen (Azubi, Geselle, Fachkraft, Spezialist, Senior, Storage & Cloud) bei 7 Kunden (Salon Lockenwerk, Bäckerei Kornblume, Schreibbüro Wortgenau, Hausarztpraxis Dr. Müller, Autohaus Brenner, Kessler Feinmechanik GmbH, Planwerk Architekten) inkl. 4 Projekte; unbegrenzt generierte Tickets (5 Netzvorlagen × 36 Fehlerinjektoren, jede Variante automatisch geprüft); 92 Mini-Tickets für die Leiste; Hilfeleiter 0–6; Abnahme mit Regressions- und Neustart-Test; Sterne, Euro, Ruf; Wartungsverträge, Playbooks, Offline-Bericht; Prüfungstag nach IHK-Notenschlüssel; Lernmotor der Spielhalle (Wiederholung nach Plan).
- **Desktop:** ein Fenster, zwei Ansichten (Vollansicht ⇄ Leiste am Bildschirmrand), Tray mit Punkt, Strg+Alt+L, Einzelinstanz, Autostart auf Wunsch, Spielstand atomar mit 5 Sicherungen, Export/Import.

## Neu in 1.1 (aus dem Durchspielen im echten Programm)
- **Konsole, Simulations-Panel und PDU-Ansicht** sind jetzt richtig gestaltet (die Stylesheets fehlten in 1.0 ganz): dunkles Terminal, Inspektor wird für 80-Zeichen-Tabellen breiter; Ereignisliste mit Abspielsteuerung, Filter und Paketfeldern Schicht für Schicht. Normales Verwerfen (fremde Broadcasts, erstes Paket während ARP) gilt nicht mehr als „Problem“.
- **Einstieg:** Coach-Hinweis erscheint sofort und wählt das passende Werkzeug vor; Meldungen verdecken die Geräte nicht mehr; Vorhersage-Dialog rechts, damit das Netz sichtbar bleibt.
- **Motivation mit Lernwert:** 15 Abzeichen für Arbeitsweisen (selbst finden, vorher denken, verteilt üben), Fortschrittsbalken zur nächsten Stufe, Feierabend-Bilanz beim Tagesziel mit den morgen fälligen Themen.
- **Prüfungstag und generierte Tickets** nennen das Symptom aus Kundensicht statt der Ursache.
- **Leiste:** aufgeklappt 320 × 300 (Mini-Ticket passt ohne Scrollen), Ecke aus den Einstellungen wirkt jetzt.
- **Spielstand:** zusätzlich „vorheriger Stand“ (alle 15 min), wird bei beschädigter Datei zuerst geladen.
- Kleinere Fehler: Strg+C bei Konsolen-Rückfragen, Shop-Texte, Hilfeleiter-Höhe, Einpassen der Ansicht.

## Neu in 1.2 (Ausbau, Stand 06.10.2026)
- **Speichern ist sichtbar.** In der Kopfzeile steht „… sichert“, „✓ gesichert“ oder „⚠ nicht gesichert“; ein gescheiterter Schreibvorgang wird gemeldet statt verschwiegen. Ein abgeschlossener Auftrag und jeder Kauf gehen **sofort** auf die Platte — vorher dauerte es bis zu rund 2,4 s (gemessen: 2.436 ms bis zum Schreibvorgang beim Auftragsabschluss).
- **Zwei Fenster:** Läuft das Spiel zweimal auf demselben Spielstand, warnt es: „Es gewinnt, wer zuletzt schreibt — bitte nur in einem Fenster spielen.“
- **Aufträge sind vielfältig.** Derselbe Auftrag sieht bei jedem Durchgang anders aus (Adressen, Fehlerstelle): das Netz entsteht aus dem Seed der Instanz statt aus einem festen. Jede Fassung wird auf Lösbarkeit geprüft, ein laufender Auftrag behält sein Netz, Terminal-Aufträge bleiben bewusst fest.
- **58 Aufträge statt 37:** zwölf neue, davon neun in den Stufen 3–6 und drei Sicherheits-Aufträge. **Stufe 6 „Storage & Cloud“ ist jetzt erreichbar** — Schwelle 115 Ruf: 114 aus den Stufen 1–5, 13 aus den drei NAS-Aufträgen bei Planwerk Architekten.
- **Der Shop ist stark reduziert:** zwei Kacheln statt eines Felds von 27–38 (je nach Spielstand), der Rest ist an seinen Ort gewandert. Wartungsverträge stehen in der Kundenakte, die Prüfungsanmeldung im Lernstand, Farben und Leisten in den Einstellungen. **Behoben:** die Prüfungsanmeldung im Shop war wirkungslos und kostete 60/90 €, während die Prüfung selbst 40/80 € abbuchte — es gibt jetzt genau eine Preisquelle (`Spiel.PRUEFUNG.GEBUEHR`).
- **Begrüßung beim ersten Start:** eine Karte („Willkommen im Netzwerk-Labor! …“) mit zwei Wegen — „Zeig mir den ersten Auftrag“ oder „Erst umsehen“ —, danach **eine** Anweisungszeile am ersten Auftrag, die den Weg nennt statt der Lösung, und ein Schlusssatz nach der Abnahme. Ein Bestandsstand sieht nichts davon.
- **Für Mitwirkende:** `python tools/ethos.py` prüft 12 Minimalismus-Regeln für die Stylesheets (`src/stil/*.css`) und läuft in `sh tools/test.sh` mit; die Testkette steht bei 251 Tests in 35 Dateien.
- **1.2.3 (07.10.2026): keine neue Spielfunktion.** Diese Fassung liefert die **umsetzungsreife Spezifikation des Klassenraums** (Lehrkraft sagt einen Code an, jedes Gerät baut denselben Auftrag selbst) samt einem eigenständigen Rust-Server als Probe. Im Spiel ist davon noch nichts zu sehen — der Vertrag steht in [[Klassenraum – Umsetzungsreife Spezifikation]], die vier Teil-Dokumente liegen im Ordner `docs/entwicklung/Klassenraum/`.

## Aufbau
- [[Konzept – Netzwerk-Labor]] (Spezifikation) · [[Architektur]] (Vertrag zwischen den Bausteinen) · [[Opus-Auftrag – Netzwerk-Labor]] (ursprünglicher Bauauftrag) · [[Befund – Programm startet wieder]] (05.10.2026: WebView2-Ausfall und Reparatur)
- **Ausbau 1.2 (läuft):** [[Plan – Ausbau 1.2]] (Phasen, Stand) · [[Design – Spielspaß 2.0]] (Befunde, 12 Hebel, Scorecard, Startblöcke für Opus) · [[Klassenraum – Umsetzungsreife Spezifikation]] (nächste Stufe, noch nicht umgesetzt)
- `src/` Code (kern, modell, sim, cli, daten, spiel, plattform, ui, stil) · `shell/src-tauri/` Rust-Hülle · `tests/` (251 Tests in 35 Dateien, `sh tools/test.sh`) · `tools/` (bauen, testen, messen, ausliefern) · `Programm/` fertige Programme · `docs/` die Website-Fassung (erzeugt) · `fremd/` fremder Bestand (Lernmotor aus der Spielhalle)
- Versionen: Git im Projektordner (Tags `endversion-1.0`, `v1.1`, `v1.2.0`, `v1.2.1`, `v1.2.2`, `v1.2.3`); die Endversion 1.0 liegt zusätzlich unter `Programm/Endversion-1.0/`.

## Ehrliche Grenzen
- Arbeitsspeicher im Leerlauf rund 0,5 GB (WebView2), CPU praktisch null.
- Linux nur in WSLg getestet, nicht auf echtem GNOME/KDE; dort kein Tray-Dienst.
- Konsole „IOS-ähnlich“, kein Cisco-Nachbau; OSPF und IPv6 fehlen noch, und Spanning Tree (`lab.stp`) hat bis jetzt keinen eigenen handgeschriebenen Auftrag. Die frühere Lücke „Storage-Kunde (Stufe 6) nicht erreichbar“ ist seit dem Ausbau 1.2 geschlossen.
- **Die Android-App ist auf keinem echten Gerät gestartet** (kein Telefon, kein Emulator vorhanden — auch am 06.10.2026 nicht, `adb devices` war leer). Geprüft ist die *Seite in der App* in einem echten Browser mit Telefonmaßen — dort funktioniert auch das Kabelziehen mit dem Finger. Dass ein Dreh die Seite nicht neu lädt, ist **nicht am Gerät** gemessen, sondern im gepackten Manifest (`screenOrientation=-1`, `configChanges=0x40007ffc`) und im Java belegt. Was auf Android offen ist, steht in [[android/LIESMICH|Netzwerk-Labor für Android]].

Verwandt: [[10-Projekte/Lernprojekte/FISI-Spielhalle/Liesmich|FISI-Spielhalle]] (liefert den Lernmotor) · [[20-Bereiche/Karriere – Storage & Cloud/Liesmich|Karriere – Storage & Cloud]] (späteres Ziel Stufe 6)

⬆️ [[10-Projekte/Lernprojekte/Liesmich|Lernprojekte]] · 🏠 [[Start]]
