---
tags: [FISI, Lernspiel, Netzwerk]
erstellt: 2026-09-30
aktualisiert: 2026-10-31
status: Version 2.9.0 (Browser-Einzeldatei; Doku als HTML unter /doku/; Windows-.exe und Android-APK nur selbst gebaut)
---

# 🖧 Netzwerk-Labor

Lernspiel im Stil von Packet Tracer plus Karriere- und Idle-Schicht: Als Ein-Mann-Systemhaus löst du Netzwerk-Tickets in einem echten Simulator (Diagramm, Konfig-Panels, IOS-ähnliche Konsole). Können ist die Währung: Wer etwas sicher beherrscht, darf es automatisieren. Wer nicht weiterkommt, bekommt eine Hilfeleiter bis zur vorgeführten Lösung.

## ▶ Starten
- **Im Browser, ohne Download:** [vexx-oss.github.io/NetLab](https://vexx-oss.github.io/NetLab/) – ein Klick, spielt sofort. Kein Entpacken, keine Installation, kein Internet.
- **Häufige Fragen:** [FAQ.md](FAQ.md) — Start, Spielstände, Windows-Programm, Lizenz, Troubleshooting. Die Einzeldatei enthält seit 2.1.0 einen **Lizenzblock** (PolyForm Noncommercial 1.0.0 + die drei OFL-Texte der Schriften) als eingebetteten Text.
- **Die Doku im Browser:** [vexx-oss.github.io/NetLab/doku/](https://vexx-oss.github.io/NetLab/doku/) – alle Verträge, Pläne, Befunde und Review-Berichte als lesbare Seiten. Seit 07.10.2026 ausgeliefert (`python tools/seite.py`); im Browser-ZIP liegt derselbe Stand als Ordner `doku/` bei, damit er auch ohne Netz lesbar ist.
- **Eine Datei für alles:** `docs/index.html` bzw. `Netzwerk-Labor.html` aus dem Release-ZIP – das ganze Spiel in **einer** HTML-Datei, Schriften eingebettet, läuft per Doppelklick auf Windows, Linux und macOS. Gebaut von `python tools/einfach.py`.
- **Windows-Programm:** die `.exe` aus dem [Release](https://github.com/Vexx-oss/NetLab/releases/latest) laden und per Doppelklick starten (SmartScreen: „Weitere Informationen → Trotzdem ausführen“). Bringt zusätzlich Leiste, Tray und globales Tastenkürzel. **Im Klon liegt keine `.exe`** (nicht versioniert).
- **Android:** Die APK wird **selbst gebaut** (`python android/bauen.py`, Android-SDK nötig) und dann aufs Telefon kopiert (einmal „Unbekannte Apps installieren“ erlauben). **Im Klon und in der 2.9.0-Veröffentlichung liegt keine APK** (Beleg: `docs/CHANGELOG.md`, Abschnitt 2.9.0); ob eine künftige Veröffentlichung eine anhängt, ist **nicht geprüft**. Kein Play Store, kein Konto, **keine Berechtigung** — die App darf nicht einmal ins Netz. `versionName` folgt der Spielversion, `versionCode` ist die Bauzählung aus `android/bauen.py`; die aktuelle Zahl steht in `docs/STAND.md` (Android-Bauzählung). Nur mit größerem Code lässt sich eine neue APK über die alte installieren. Bauen und alle Grenzen: [[android/LIESMICH|Netzwerk-Labor für Android]]. **Nicht geprüft:** ein Lauf auf einem echten Telefon oder Emulator (kein Gerät vorhanden).
- **Linux:** `Programm/linux/` – `.deb` (Ubuntu/Debian) oder AppImage, **Stand 1.0** (seither keine neue Linux-Fassung). Details und was auf welchem System geht: [[Programm/PLATTFORM|PLATTFORM]].
- **Auslieferungspaket bauen:** `python tools/paket.py` → `dist/Netzwerk-Labor-<Version>-Windows.zip` mit Einzeldatei, `.exe`, Anleitung und Lizenztexten.
- Anleitung für die Klasse: `Vorlagen/LIESMICH.txt` (Quelle) → liegt im Paket als `LIESMICH.txt`.

## Was drin ist (Fassung 2.9.0)

**Simulation auf Frame-Ebene.** ARP, Switching mit MAC-Lernen, VLAN und 802.1Q, Router-on-a-Stick, statische Routen, ICMP (Timeout gegen unreachable, TTL), ACL, NAT/PAT, DHCP mit Relay, Reservierung und Lease-Laufzeit, DNS, TCP-Handshake, HTTP, Firewall mit Zonen und Port-Weiterleitung, Internet als Kulisse, Broadcast-Sturm. Jede Antwort ist aus Paketen hergeleitet; die Simulation spielt Schritt für Schritt ab (PDU-Ansicht).

**Konsole.** IOS-ähnlich (Modi, Kurzformen, `?`, Tab, `do`, running/startup, `write erase`/`vlan.dat`) und Windows-Terminal (`ipconfig`, `ping`, `tracert`, `arp -a`, `nslookup`). Befehle, die nicht belegt sind, werden als solche gekennzeichnet.

**Aufträge und Lernsystem.** Handgeschriebene Tickets in sechs Karrierestufen (Azubi bis Storage & Cloud) bei sieben Kunden inklusive Projekten; dazu unbegrenzt generierte Tickets aus Netzvorlagen und Fehlerinjektoren, jede Variante automatisch geprüft. Mini-Tickets für die Leiste, Hilfeleiter bis zur vorgeführten Lösung, Abnahme mit Regressions- und Neustart-Test, Sterne/Euro/Ruf, Wartungsverträge, Playbooks, Offline-Bericht, Prüfungstag nach IHK-Notenschlüssel und Lernmotor (Wiederholung nach Plan). **Die genauen Mengen misst `docs/STAND.md`** (erzeugt von `python tools/stand.py`); diese Seite wiederholt sie nicht.

**Subnetting-Abteilung (seit 2.9.0).** Eigene Ansicht im Dock: Lehrpfad in Stufen, Werkzeuge (32-Bit-Labor, Masken-Schieber, Blocklineal, Rechenweg-Assistent, Adressplaner, VLAN-Werkzeug), Lernspiele (Präfix-Blitz, Netz-Sortierer, VLAN-Patcher) und Formelsammlung.

**Oberfläche.** Dock-Leiste mit den Ansichten Heute, Postfach, Labor, Subnetting, Training, Wiki, Lernstand, Kunden und Klassenraum (Klasse für Lehrkräfte, Auftrag für Azubis). Im Labor: Inspektor, Konsole, Werkzeuge, Auftragsbogen und das Simulations-Panel **Flugschreiber**; die **Einsatzakte** begleitet den Auftrag, die **Kundenakte** sammelt Atlas, Vertrauen und Kapitel; die **Erste Stunde** beginnt mit einem Anruf auf der Heute-Karte. Auf dem Desktop zusätzlich: Leiste am Bildschirmrand, Tray, globales Tastenkürzel, Einzelinstanz und Autostart.

**Klassenraum (Stufe A+B).** Die Lehrkraft sagt einen Code an, jedes Gerät baut denselben Auftrag selbst; Ergebnis-Codes und Ampel, H-Code und anonyme Fortschrittszeile — **ohne Bewertung**. Server und QR sind **3.1** und im Produkt nicht gebaut ([[Architektur]] § 12.6/§ 12.7).

**Desktop.** Ein Fenster, zwei Ansichten (Vollansicht ⇄ Leiste), Spielstand atomar mit rollierenden Sicherungen, Export/Import.

## Was seit 1.0 dazukam (kurz)

- **2.0:** Klassenraum Stufen A+B, Hilfeleiter-Ausbau, mehr Inhalte.
- **2.1:** Wahrheit, Korrektheit und Inhalte (S1–S8).
- **2.2–2.4:** neues Frontend (Matrix-Elegant, POLARIS, ReMASTER mit Lagebild, Piktogrammen und geraden Kabeln).
- **2.5:** Bento-Oberfläche (Postfach, Kunden, Dashboard, Training, Leiste).
- **2.6:** Einsatzakte, Ausbildungs-Cockpit, Flugschreiber, eigenes Fenster.
- **2.7:** Auftragsbogen, entzerrter Inspektor, Leiste als Begleiter.
- **2.8:** Kurzübung mit Auftragskontext, Flugschreiber mit Aufmerksamkeitsführung.
- **2.9:** Abteilung Subnetting.

Details, Messwerte und verworfene Versuche: `docs/CHANGELOG.md` · Plan: [[Plan – Ausbau 1.2]].

## Aufbau
- [[Konzept – Netzwerk-Labor]] (Spezifikation) · [[Architektur]] (Vertrag zwischen den Bausteinen) · [[Opus-Auftrag – Netzwerk-Labor]] (ursprünglicher Bauauftrag) · [[Befund – Programm startet wieder]] (05.10.2026: WebView2-Ausfall und Reparatur)
- **Nächste Fassung:** [[Konzept – 3.0]] (Plan für 3.0: Klassenbetrieb, Diagnose, Messkette) · [[Design – Spielspaß 2.0]] (Befunde, Hebel, Scorecard) · [[Klassenraum – Umsetzungsreife Spezifikation]] (Vertrag; Stufen A+B gebaut, C/D offen)
- `src/` Code (kern, modell, sim, cli, daten, spiel, plattform, ui, stil) · `shell/src-tauri/` Rust-Hülle · `tests/` (`sh tools/test.sh`; Zahl: `docs/STAND.md`) · `tools/` (bauen, testen, messen, ausliefern) · `Programm/` fertige Programme · `docs/` die Website-Fassung (erzeugt) samt `docs/doku/` (die Doku als durchsuchbare Seite, `python tools/seite.py`) · `fremd/` fremder Bestand (Lernmotor aus der Spielhalle)
- Versionen: Git im Projektordner, Tags von `endversion-1.0` über `v1.1`, `v1.2.0`–`v1.2.4` bis `v2.0.0`–`v2.9.0` (Stand 31.10.2026); der Endstand liegt zusätzlich unter `Programm/Endversion-1.0/`.

## Ehrliche Grenzen
- Arbeitsspeicher im Leerlauf rund 0,5 GB (WebView2, gemessen 07.10.2026), CPU praktisch null.
- Linux nur in WSLg getestet, nicht auf echtem GNOME/KDE; dort kein Tray-Dienst.
- Konsole „IOS-ähnlich“, kein Cisco-Nachbau. **OSPF fehlt**; IPv6 und WLAN werden inhaltlich geübt, aber nicht paketweise simuliert (`docs/STAND.md`, bekannte Ausnahmen). Die frühere Lücke „Storage-Kunde (Stufe 6) nicht erreichbar“ ist seit dem Ausbau 1.2 geschlossen.
- **Nicht geprüft (Stand 31.10.2026):** Lauf der Live-Seite und der Release-Anhänge, echter Browser, Android auf einem Gerät, Screenreader und eine echte Unterrichtsstunde. Was auf Android offen ist, steht in [[android/LIESMICH|Netzwerk-Labor für Android]]; die Klassenraum-Grenzen (Server/QR erst 3.1) in [[Architektur]] § 12.6/§ 12.7.

Verwandt: [[10-Projekte/Lernprojekte/FISI-Spielhalle/Liesmich|FISI-Spielhalle]] (liefert den Lernmotor) · [[20-Bereiche/Karriere – Storage & Cloud/Liesmich|Karriere – Storage & Cloud]] (späteres Ziel Stufe 6)

⬆️ [[10-Projekte/Lernprojekte/Liesmich|Lernprojekte]] · 🏠 [[Start]]
