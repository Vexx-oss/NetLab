---
tags: [FISI, Lernspiel, Konzept, Netzwerk]
erstellt: 2026-09-30
status: Entwurf – bereit für Umsetzung (Phase 0 zuerst); Stand 30.09.2026: Desktop-Programm mit Tauri
---

# 🖧 Konzept – Netzwerk-Labor (Arbeitstitel)

⬆️ [[10-Projekte/Lernprojekte/Netzwerk-Labor/Liesmich|Netzwerk-Labor]] · Auftrag für Opus: [[Opus-Auftrag – Netzwerk-Labor]]

## 1 · Worum es geht

Du führst ein **Ein-Mann-Systemhaus**. Kunden schicken Tickets: „Das Kassen-WLAN kommt nicht auf den Server“, „Baut uns ein Netz für zwei Abteilungen“. Du löst sie in einem **Netzwerk-Simulator**, in dem Geräte wirklich Pakete verschicken, verwerfen und beantworten – mit Diagramm, Konfig-Panels und einer **Cisco-ähnlichen Konsole**. Wer Tickets löst, verdient Geld und Ruf, schaltet größere Kunden frei und lässt Routinefälle später von **Playbooks** (Automatisierung) erledigen. Eine schmale, ruhige **Leiste am Bildschirmrand** hält das Ganze am Laufen, ohne im Weg zu sein.

Zielgruppe: du und deine Klasse (FISI-Umschulung, AP1/AP2). **Eigenständiges Desktop-Programm** für Windows (`.exe`) und Linux (AppImage/Binary), das sich still verhält (§ 9.7). Als Zugabe gibt es eine Browser-Fassung als Einzeldatei ohne Fensterfunktionen, praktisch zum Teilen, wie bei der [[10-Projekte/Lernprojekte/FISI-Spielhalle/Liesmich|FISI-Spielhalle]].

## 2 · Fünf Säulen (Leitplanken für jede Entscheidung)

1. **Können ist die Währung.** Fortschritt hängt an der Beherrschung im Lernmotor, nicht an Klicks. Automatisieren darf nur, was du auf Stufe „sicher“ beherrschst.
2. **Die Simulation ist echt.** Jede Antwort des Spiels lässt sich aus Paketen herleiten (ARP, MAC-Tabelle, TTL, ACL-Treffer). Nie „weil das Skript es so will“.
3. **Nie stecken bleiben.** Es gibt immer einen nächsten Schritt: Hinweisleiter bis zum vorgeführten Lösungsweg, danach ein Wiederholungsticket.
4. **Klein anfangen, jederzeit aufhören.** 60 Sekunden bis zum ersten Erfolg. Ein Ticket darf 1 Minute oder 25 Minuten dauern, gespeichert wird laufend.
5. **Bedienung darf nie das Hindernis sein.** Rückgängig immer, keine Pflicht-Dialoge, sofortige Rückmeldung (§ 7).

## 3 · Der Loop

### 3.1 Drei Zeitskalen

| Skala | Dauer | Was passiert | Neben der Wirkung |
|---|---|---|---|
| **Mikro** | 30–120 s | Mini-Ticket in der Leiste (Config-Zeile finden, Log lesen, Ablauf ordnen, Ausgang vorhersagen) | Lernmotor-Einheit, kleiner Euro-Betrag |
| **Meso** | 10–25 min | Ein **Arbeitstag**: 3–5 Tickets, davon ein Projekt oder eine Störung im Labor. Abschluss: „Heute dran“ als **Bereitschaftsdienst** (fällige Wiederholungen als Wartungs-Tickets getarnt) | Ruf, Euro, Sterne der Kunden |
| **Makro** | Wochen | Kunden wachsen, neue Stufen, Prüfungstage (AP1/AP2-Simulation als „Zertifizierung“), Playbook-Slots | Freischaltungen |

### 3.2 Ticketarten

| Art | Start | Ziel | Dauer |
|---|---|---|---|
| **Störung** | Netz steht, etwas ist kaputt (injizierter Fehler, § 8) | Symptom beheben, Kollateralschäden vermeiden | 1–8 min |
| **Projekt** | Kundenbrief mit Anforderungen, leere Fläche | Netz planen und bauen; Abnahmetests laufen | 10–25 min |
| **Wartung** | Vertragskunde meldet Ereignis (Idle-Schicht) | wie Störung, mit Frist | 1–5 min |
| **Mini** | Schnappschuss (Diagramm, Log oder Config-Ausschnitt) | eine Frage in < 2 min, in der Leiste spielbar (nur Maus) | 0,5–2 min |
| **Prüfungstag** | Gemischter Satz, Zeitlimit, keine Hilfen | Note nach IHK-Schlüssel (vorhanden in der Spielhalle) | 25 min |

**Vorhersage vor dem Test:** Bei Einstieg und AP1 fragt das Spiel optional „Wird der Ping klappen?“, bevor die Simulation läuft. Erst raten, dann sehen: das ist einer der stärksten Lerneffekte und kostet kaum Aufwand.

### 3.3 Karriere-Stufen (Freischaltung über Ruf **und** Können)

| Stufe | Beispielkunde | Neue Geräte | Neue Fertigkeiten (`lab.*`) |
|---|---|---|---|
| 1 Azubi | Friseursalon: 3 PCs, 1 Router | PC, Router, Switch (einfach) | IP/Maske/Gateway, Ping lesen, „gleiches Netz?“, ARP sehen |
| 2 Geselle | Schreibbüro: 10 PCs, Drucker, Server | Server, Switch (verwaltbar) | kleines Subnetting, DHCP, DNS, Ports, TCP-Handshake |
| 3 | Arztpraxis: Verwaltung / Behandlung / Gäste | – | VLAN, Trunk, Router-on-a-Stick, ACL |
| 4 | Autohaus: 2 Standorte | Internet-Wolke | statische und Default-Route, Rückroute, NAT/PAT, Port-Weiterleitung |
| 5 | Mittelstand mit DMZ | Firewall | Zonen, DMZ, Regelwerk, Port-Security |
| 6 (später) | Storage und Cloud | NAS/SAN | passend zu [[20-Bereiche/Karriere – Storage & Cloud/Liesmich|Karriere – Storage & Cloud]] |

Bewusst **nur 7 Gerätetypen**: PC (auch als Laptop/Drucker-Skin), Server, Switch, Router, Firewall, Internet, später NAS. Die Tiefe steckt im Verhalten, nicht in der Auswahl.

### 3.4 Die Idle-Schicht (Leiste und Wartungsverträge)

**Wartungsverträge.** Jeder Kunde mit Vertrag bringt Euro pro Stunde, solange seine Ampel grün ist. In unregelmäßigen Abständen (Startwert: etwa eine Störung je 20–40 min und Kunde, Warteschlange höchstens 5) kommt ein Ereignis ins Postfach, gezogen aus dem Ticketpool passend zu Kunde und deinem Können. Frist 60 min echte Zeit. Überschreitung: Ampel gelb, dann rot, in Rot fließt kein Geld, bis behoben. Kein Fortschritt geht verloren, niemand kündigt.

**Playbooks (Automatisierung).** Jede Fertigkeit ab **Stufe 3 („sicher“)** lässt sich als Playbook kaufen (Euro, begrenzte Slots). Es löst Routinetickets dieser Art automatisch für 60 % Ertrag, ohne Lernwirkung. Ist die Fertigkeit im Lernmotor **fällig** (`L.istFaellig`), ist das Playbook „veraltet“ und pausiert, bis du die Wiederholung gemacht hast. So bindet das Spiel Idle-Einkommen an Spaced Repetition, statt es zu umgehen. Passives Einkommen soll höchstens etwa ein Drittel dessen erreichen, was aktives Spielen bringt (Balancing-Ziel, Startwerte im Spiel justierbar).

**Offline-Bericht.** Beim Öffnen: „Während du weg warst: 3 Wartungen automatisch, 2 Tickets warten, Kunde Praxis Müller ist rot.“ Zeit zählt höchstens 8 h.

**Leiste.** Die Leiste ist die Kompaktansicht des Programms: rahmenlos, klein (etwa 300 × 56 px, aufgeklappt 320 × 300 px – 220 px reichten im Test für ein Mini-Ticket nicht), am Bildschirmrand, halbdurchsichtig. Sie zeigt Kunden-Ampeln, Euro pro Stunde, Ruf und die Zahl offener Tickets, aufgeklappt ein Mini-Ticket. Neue Tickets erscheinen **nur als Zähler und Punkt** (Leiste und Tray-Symbol), ohne Ton, ohne Pop-up, ohne Fokus. Ausführlich in § 9.7.

**Unterrichtsmodus.** Ein Schalter „Heute im Unterricht: …“ (Thema aus `L.THEMEN`/Fertigkeiten, z. B. VLAN oder TCP). Mini-Tickets und Ereignisse ziehen dann bevorzugt dazu passende Fertigkeiten, ruhige Darstellung, keine Animation und kein Ton.

### 3.5 Abnahme und Belohnung

- **Abnahme** = automatische Tests aus dem Ticket („Kasse erreicht Server“, „Gast erreicht Server **nicht**“, „nichts, was vorher ging, ist kaputt“). Letzteres ist echtes Change-Management (Regressionstest) und ein häufiger Prüfungsfehler.
- **Sterne (1–5):** gelöst, Hilfen genutzt, Kollateralschäden, nicht gespeichert. Tempo zählt nur als kleiner Bonus.
- **Neustart-Test (AP2):** Die Abnahme „zieht am Ende den Stecker“ und lädt die *gespeicherte* Konfiguration. Wer nicht gespeichert hat, verliert die Änderung, genau wie in echt (RAM gegen NVRAM, siehe § 6). Bei Einstieg nur ein Warnhinweis.
- **Live-Auftragsliste:** Bei Einstieg laufen die Abnahmetests im Hintergrund weiter, und jede Anforderung springt auf ✓, sobald sie erfüllt ist. Das fühlt sich wie ein Quest-Log an. Bei AP2 gibt es das nicht, nur „Abnahme anfordern“.
- **Wirtschaft bewusst dünn:** Euro kaufen Playbook-Slots, Kundenakquise, Prüfungsgebühren und Aussehen. **Kernwerkzeuge werden nie hinter Geld versteckt** (Simulation, Inspektor, Konsole, Hilfe). Ruf ist kein Zahlungsmittel und öffnet nur Kundenstufen.

## 4 · Hilfe, wenn man nicht weiterkommt

| Stufe | Was | Kosten |
|---|---|---|
| 0 | **Symptom und Ziel** stehen immer sichtbar (Auftragsliste) | frei |
| 1 | **Fehlersuche-Leiter:** Checkliste von unten nach oben (Link → VLAN → IP/Maske → Gateway → Route → ACL/Dienst). Du hakst ab, was du geprüft hast | frei |
| 2 | **Werkzeuge wie im Betrieb:** Ping, Traceroute, `show`-Befehle, Simulation mit Ereignisliste. Sie zeigen, *wo* es hängt, nur so genau wie die echten Werkzeuge | frei |
| 3 | **Frage des Seniors:** „Was passiert, wenn PC-B den Server anpingt: welche Adresse fragt er per ARP?“ | frei, Sterne −0 |
| 4 | **Bereich markieren:** Gerät oder Schnittstelle leuchtet auf | ½ Stern |
| 5 | **Konkreter Hinweis:** welches Feld oder welcher Befehl | ½ Stern |
| 6 | **Lösung vorführen:** Schritte laufen mit Kommentar im GUI/CLI ab (kein bloßer Text). Danach legt das Spiel ein **Wiederholungsticket** in den Lernmotor (`hilfe:true`), das später selbst zu lösen ist | 1 Stern, kein Scheitern |

Zusätzlich: **Nachschlagen** verlinkt kontextabhängig in die Vault-Notiz (nicht bei AP2). **Snapshots und Rückgängig** machen jede Änderung folgenlos. **Nach 4 min ohne Fortschritt** bietet der Senior *einmal je Ticket* Hilfe an, ablehnbar, kein Nörgeln. **Die Diagnosetiefe hängt vom Niveau ab:** bei Einstieg erklärt jede verworfene Frame-Zeile den Grund in Klartext, bei AP2 steht dort nur, was das Gerät selbst melden würde.

## 5 · Simulation (das Herzstück)

### 5.1 Prinzip

- **Ereignisgesteuerte Simulation auf Frame-Ebene** mit virtueller Zeit. Ein Lauf erzeugt eine **Trace** (Liste von Ereignissen) als reine Daten. Die Oberfläche spielt die Trace nur ab (Play, Schritt, Tempo, Zurückspulen). Das trennt Rechnen und Anzeigen und macht Golden-Tests einfach.
- **Kein Modul darf DOM oder Zeit anfassen.** `sim/` läuft im Browser und (wenn Node da ist) headless.
- **Realzeit gegen Simulationsmodus** wie in Packet Tracer: derselbe Lauf, einmal nur das Ergebnis, einmal Schritt für Schritt.
- **Ereignis-Budget** je Lauf (Startwert 5 000). Wird es gerissen (z. B. Layer-2-Schleife ohne STP), meldet die Simulation „Broadcast-Sturm erkannt“ und bricht sauber ab. Das ist selbst ein Lernfall.
- Jede Konfigurationsänderung verwirft die alte Trace. Config ist Daten (JSON); **running** und **startup** getrennt gehalten.

### 5.2 Geräte und Verhalten

| Gerät | Verhalten (v1) |
|---|---|
| **PC / Server** | Schnittstelle mit IP, Maske, Gateway, DNS, DHCP-Client; ARP-Cache mit Ablauf; ICMP Echo; kleines Terminal (`ipconfig`, `ping`, `arp -a`, `nslookup`, `tracert`); Dienste am Server: DHCP, DNS, HTTP, Dateidienst |
| **Switch** | MAC-Lernen und Altern (Cisco-Standard 300 s), Fluten unbekannter Ziele und Broadcasts, VLAN-Datenbank, Access- und Trunk-Ports (802.1Q, Native VLAN), Ports abschaltbar, Verwaltungsadresse |
| **Router** | Schnittstellen und Subinterfaces (`encapsulation dot1Q`), Routingtabelle (verbunden, statisch, Default), ARP, ICMP-Fehler (Netz unerreichbar, TTL abgelaufen), ACL (standard/erweitert, in/out, erste Übereinstimmung gewinnt), NAT (statisch, PAT/overload), DHCP-Server und `ip helper-address` |
| **Firewall** | Vereinfachte Zonen (innen, außen, DMZ), Regeltabelle, zustandsbehaftet (Rückverkehr erlaubt), NAT; im Editor herstellerneutral, Konsole nur in Grundzügen |
| **Internet** | Kulisse: ISP-Router mit Default-Route und einigen öffentlichen Servern |

### 5.3 Protokollumfang

- **v1:** Ethernet, ARP, VLAN/802.1Q, IPv4, ICMP, UDP, TCP (vereinfacht: Handshake SYN → SYN/ACK → ACK, Daten, FIN, RST bei geschlossenem Port; **kein** Staukontroll-Modell), DHCP (Discover/Offer/Request/Ack), DNS (einfache Abfrage), ACL, NAT/PAT.
- **später (Phase 6):** STP (vereinfacht), LACP, Port-Security, IPv6, dynamisches Routing (RIP oder OSPF, jeweils groß), Bandbreite und Latenz.
- **bewusst nicht:** WLAN-Funk, QoS, echte IOS-Feinheiten, Leistungssimulation.

### 5.4 Gründe-Katalog

Jedes Verwerfen und jeder Fehlschlag trägt einen **Grundcode**, dazu einen Lehrtext (kurz bei Einstieg, knapp bei AP2), eine Fertigkeit `lab.*` und eine Quelle (Vault-Notiz oder RFC). Ausschnitt:

| Code | Wo | Kernaussage | Fertigkeit |
|---|---|---|---|
| `LINK_DOWN` | Port | Kein Link: Kabel fehlt, Port abgeschaltet oder Gegenstelle aus | `lab.link` |
| `ARP_NO_REPLY` | Host | Im eigenen Netz antwortet niemand: falsche IP, Maske oder VLAN? | `lab.arp` |
| `DROP_VLAN` | Switch | Frame in VLAN 20, Zielport in VLAN 10; VLANs gehen nie ineinander über | `lab.vlan` |
| `TRUNK_NOT_ALLOWED` | Trunk | VLAN 20 ist auf dem Trunk nicht erlaubt | `lab.trunk` |
| `NO_GATEWAY` | Host | Ziel in anderem Netz, aber kein Standardgateway | `lab.gateway` |
| `GW_WRONG_SUBNET` | Host | Gateway liegt nicht im eigenen Netz | `lab.gateway` |
| `NO_ROUTE` | Router | Keine Route zum Zielnetz (ICMP Destination unreachable) | `lab.route` |
| `NO_RETURN_ROUTE` | Router | Hinweg ok, Antwort findet zurück keinen Weg (Symptom: Timeout) | `lab.route` |
| `TTL_EXPIRED` | Router | Routing-Schleife, TTL erreicht 0 | `lab.ttl` |
| `ACL_DENY` | Router/FW | Regel Nr. X verwirft; Reihenfolge zählt | `lab.acl` |
| `NAT_MISSING` | Router | Private Adresse im Internet nicht routbar; NAT fehlt oder inside/outside vertauscht | `lab.nat` |
| `DUP_IP` | Host | Adresskonflikt | `lab.ip` |
| `DHCP_NO_OFFER` | Host | Kein DHCP-Server erreichbar (VLAN oder Relay); Windows nimmt eine 169.254.x.x-Adresse (APIPA) | `lab.dhcp` |
| `PORT_CLOSED` | Server | RST: kein Dienst lauscht auf dem Port | `lab.ports` |
| `STORM` | Netz | Ereignis-Budget gerissen: Schleife ohne STP | `lab.stp` |

Der Unterschied zwischen **Timeout** (verworfen, still) und **Destination unreachable** (jemand meldet es) ist selbst Prüfungsstoff und wird sichtbar gemacht.

### 5.5 Authentizität und Belege

- **Belege vor Einbau.** Jeder Lehrtext und jedes IOS-Verhalten wird an einer Quelle belegt (Cisco-Dokumentation, RFC, CCNA-Lehrbuch oder Vault-Notiz). Was nicht belegt ist, wird vereinfacht und im Spiel als **„IOS-ähnlich“** gekennzeichnet, nicht erfunden.
- **Realistische Eigenheiten, zuschaltbar:** Erstes Ping über den Router verliert oft das erste Paket (ARP wird noch aufgelöst; IOS zeigt `.!!!!`). RAM gegen NVRAM (Neustart verliert Ungespeichertes). Lernfall aus dem Unterricht vom 29.09.: VLAN-Datenbank (`vlan.dat`) im Flash überlebt `write erase`. **Vor Einbau prüfen**, für welche Plattformen genau das gilt; in deiner Notiz steht „Router“, die VLAN-Datei gehört nach meinem Wissen zum Switch.
- **Kein Cisco-Bildmaterial.** Eigene, neutrale Symbole, kein Markenlogo, keine IOS-Abbilder. Die Konsole heißt „IOS-ähnlich“.

## 6 · Konsole (IOS-ähnlich)

Cisco-Ausführlichkeit ist ausdrücklich gewünscht, also von Anfang an mit dabei (ab Phase 2).

- **Modi und Prompts:** `Router>` → `Router#` → `Router(config)#` → `(config-if)#`, `(config-subif)#`, `(config-vlan)#`, `(config-line)#`.
- **Bedienung:** eindeutige Kurzformen (`sh ip int br`), `?` zeigt die Optionen an der Stelle, **Tab** vervollständigt, `no`-Präfix, `do` in der Konfiguration, Verlauf mit Pfeil hoch/runter. Fehler im Stil `% Invalid input detected at '^' marker.`, `% Incomplete command.`, `% Ambiguous command: "…"`.
- **Befehle (v1):** `hostname`, `enable`/`enable secret`, `interface`/`interface range`, `ip address`, `no shutdown`, `description`, `vlan`, `switchport mode access|trunk`, `switchport access vlan`, `switchport trunk allowed vlan`/`native vlan`, `ip route`, `ip default-gateway`, `ip dhcp pool`/`ip helper-address`, `access-list`/`ip access-list`, `ip nat inside|outside`/`ip nat inside source …`, `show running-config|startup-config|ip interface brief|interfaces trunk|vlan brief|mac address-table|ip route|arp|version|flash:`, `ping`, `traceroute`, `copy running-config startup-config`, `write memory`/`erase startup-config`/`write erase`, `delete flash:vlan.dat`, `reload`.
- **Eine Quelle der Wahrheit.** GUI und Konsole ändern **dasselbe Config-Objekt**. `running-config` wird daraus erzeugt (feste, an IOS angelehnte Reihenfolge). **Jede GUI-Änderung zeigt den Konsolenbefehl dazu** („entspricht: `ip address 10.0.0.1 255.255.255.0`“) mit „In Konsole übernehmen“. So lernt man die CLI ganz nebenbei.
- **Einstieg:** die Konsole schlägt auf Wunsch den nächsten Befehl vor, erklärt jeden in einer Zeile und bietet `?`-Hilfe mit Erklärung.
- **Host-Terminal** (Windows-artig): `ipconfig`, `ping`, `arp -a`, `nslookup`, `tracert`.

## 7 · Bedienung (UX-Regeln für Opus)

**Grundsatz:** Wer 10 Minuten damit spielt, hat nie gegen die Oberfläche gekämpft.

**Fläche**
- SVG-Zeichenfläche mit Raster-Einrasten, Zoom mit Mausrad, Verschieben mit Ziehen auf leerer Fläche, `F` = alles einpassen, „Aufräumen“ (Auto-Layout).
- **Geräteleiste** links: Ziehen *oder* erst anklicken, dann auf die Fläche klicken. Doppelklick auf leere Fläche öffnet eine Schnellauswahl.
- **Verkabeln:** Über dem Gerät erscheinen die Port-Punkte. Ziehen vom Punkt (oder vom Gerät) zum Zielgerät, das Spiel wählt den nächsten **freien passenden Port**; nur bei Mehrdeutigkeit (Shift, oder Ablegen auf einen Port-Punkt) wird gefragt. Kabelart (gerade/gekreuzt) entfällt: Auto-MDI-X ist heute Standard, im Einstieg einmal erklärt.
- **Farben mit Text:** Link grün/orange/rot **plus** Symbol; VLAN-Farbe am Port **plus** Nummer; Trunk mit Doppelstrich. Nie nur Farbe.
- **Ebenen** (Umschalter): Physik · VLAN · IP-Netze · MAC-Tabellen · Routen. Standard: **IP-Netze**, d. h. jedes Subnetz als farbige Zone um seine Geräte, sodass „gleiches Netz?“ sofort sichtbar ist.
- **Ping-Gummiband:** Ping-Werkzeug (Taste `P`), vom Gerät A auf Gerät B ziehen, Ergebnis als Toast, Paket fliegt entlang des Wegs, „In Simulation öffnen“.

**Inspektor** (rechts, beim Antippen eines Geräts) mit Reitern *Übersicht · Schnittstellen · VLAN/Routing (je nach Gerät) · Dienste · Konsole*
- Live-Prüfung beim Tippen („10.0.0.5/24 liegt nicht im Netz von Gateway 10.0.1.1“), keine Fehler erst nach Speichern.
- Zeile „entspricht: …“ (§ 6).

**Simulation** (unten)
- **Ereignisliste** (eine Zeile je Etappe, mit Grundcode und Klartext), Filter nach Protokoll, Klick auf Zeile leuchtet das Gerät auf.
- **PDU-Inspektor:** aufklappbare OSI-Schichten, **geänderte Felder** gegenüber der vorigen Etappe hervorgehoben (MAC wechselt an jedem Router, IP nicht, TTL −1).
- Play, Schritt, Tempo, Zurückspulen.

**Komfort**
- **Rückgängig/Wiederholen** für alles (Befehlsmuster im Modell), Snapshots, „Ticket zurücksetzen“ mit Bestätigung.
- **Autospeichern** nach jeder Änderung.
- **Befehlspalette** `Strg+K` (Gerät springen, `ping A B`, Ebene wechseln).
- Tastenkürzel auf Rechnern, Trefferflächen ≥ 44 px, `prefers-reduced-motion` respektieren. **Desktop zuerst** (Programm); die Browser-Fassung ist Zugabe, Handy nur zum Lesen.
- **Keine Pflicht-Dialoge** bei Routinehandlungen. Fehlermeldungen erklären, sie schimpfen nicht.
- **Kein schwebendes Fenstersystem** (Aufwand, Bedienrisiko): Desktop-Metapher nur als **Andock-Leiste** (Postfach · Labor · Wiki · Kunden · Lernkarte · Shop), jede App füllt die Fläche.
- **Leistung:** 60 Geräte, Ziehen bleibt flüssig.

**Optik:** dunkler „Leitstand“-Look, gleiche Schriften wie die Spielhalle (Atkinson Hyperlegible, Bricolage Grotesque, JetBrains Mono, lokal eingebettet), eigene flache Symbole.

## 8 · Daten

### 8.1 Ticket-Format (Skizze)

```js
{ id:"t-salon-01", art:"stoerung", stufe:"E",            // E | AP1 | AP2
  kunde:"salon", titel:"Drucker nicht erreichbar",
  briefing:"Hallo, seit heute Morgen …",
  skills:["lab.gateway","lab.arp"],
  netz:{ geraete:[…], links:[…] },                      // Topologie und Config (running und startup)
  fehler:[{ injektor:"gw-falsch", auf:"pc-kasse", param:{…} }],
  ziele:[{ typ:"erreichbar", von:"pc-kasse", nach:"drucker" },
         { typ:"blockiert",  von:"gast", nach:"server", proto:"tcp", port:445 }],
  hilfen:{ frage:[…], bereich:[…], konkret:[…] },
  loesung:[ { gerät:"r1", befehl:"ip route 10.0.2.0 255.255.255.0 10.0.1.2" } ],
  erklaerung:"…", quelle:"[[04-AP1-Netzwerk]]",
  lohn:{ euro:40, ruf:1 } }
```

### 8.2 Fehlerinjektoren (Grundlage für unbegrenzten Nachschub)

Handgeschriebene Kernaufgaben (etwa 30 für den Start) **plus** prozedurale Varianten: Adressen, VLAN-IDs und Namen werden gewürfelt, ein **Injektor** (kleine Funktion, die einen bekannten Fehler in ein gesundes Netz setzt) bricht etwas. Jeder Injektor trägt eine Fertigkeit und Lehrtext-Codes.

Erste Injektoren: falsche Maske, falsches Gateway, VLAN-Mismatch, Trunk ohne erlaubtes VLAN, Native-VLAN-Mismatch, Port abgeschaltet, Route fehlt, Rückroute fehlt, ACL-Reihenfolge, NAT inside/outside vertauscht, doppelte IP, falscher DNS, DHCP-Pool zu klein, Ungespeichert nach Neustart, Kabel im falschen Port, Schleife ohne STP.

**Pflicht:** Für jedes generierte Ticket prüft ein automatischer Test, dass (a) die **Lösung** alle Ziele erfüllt und (b) der **Fehler** die erwarteten Ziele mit dem **erwarteten Grundcode** bricht.

### 8.3 Lernmotor-Anbindung

Wiederverwenden, nicht neu bauen: `src/lernmotor.js` (`L.skill`, `L.ueben(id, ok, {hilfe, sicher})`, `L.fehler`, `L.istFaellig`, `L.faelligeIds`, `L.themaStand`) und das `store`-Muster aus `src/kern.js`. `bauen.py` des Labors zieht den Lernmotor zur Bauzeit aus `../FISI-Spielhalle/src/` (**ein** Lernmotor, keine Kopie). Fertigkeiten heißen `lab.*`, Thema `"Netzwerk"`. Der Lernmotor bleibt unverändert; `store` bekommt im Labor einen Speicher-Adapter (§ 9.3).

**Lernstand-Brücke.** Programm und Browser-Spielhalle haben **getrennte Speicher**. Zusammenführen geht per Export/Import-Datei. Die Spielhalle bräuchte dazu einen Import-Knopf, den sie bisher bewusst nicht hat (nur bauen, wenn du es willst). Ungeprüfte Alternative für später: die Spielhalle als Fenster im selben Programm öffnen (gleicher Ursprung, gleicher Speicher).

Spielstand (Euro, Ruf, Kunden, Playbooks, offene Tickets, Config je Ticket) in eigenem Schlüssel `labor`, versioniert (`v:1`) mit Migration.

## 9 · Technik und Desktop-Hülle

### 9.1 Entscheidung: Tauri 2 mit schlichtem JavaScript

- **Auf diesem Rechner geprüft (30.09.2026):** Rust 1.97.1 (`cargo`, `rustc`), Visual Studio 2022 Community, WebView2-Runtime 154, Python 3.14, Git, Docker und WSL2 mit Ubuntu 26.04 (WSLg, also mit Linux-Fenstern) sind da. **Node fehlt.** Die App selbst braucht es nicht; als Testläufer wird es nach deiner Freigabe installiert (§ 9.8). Nicht geprüft: ob die C++-Arbeitslast von Visual Studio installiert ist (Opus merkt es beim ersten Build). In der WSL-Ubuntu fehlt **alles** (kein `gcc`, `cargo`, `node`, `pkg-config`, WebKitGTK). Auch `tauri-cli` ist nicht installiert (`cargo install tauri-cli --version "^2"`).
- **Warum Tauri:** kleines Programm (nutzt die vorhandene WebView statt eines mitgelieferten Chromium), natives Tray-Symbol, Autostart, Fenstersteuerung, und die Spielhalle-Technik (schlichtes JS, `bauen.py`) bleibt. Die Oberfläche braucht **kein npm**: Tauri lädt den gebauten Ordner, `app.withGlobalTauri` liefert die API als Objekt `window.__TAURI__` (vor Einbau in der aktuellen Doku prüfen).
- **Rust bleibt dünn** (Fenster, Tray, Speichern, Autostart, Einzelinstanz; grob unter 500 Zeilen). Alle Spiellogik ist JavaScript.
- **Alternative Electron:** bringt Chromium mit (deutlich größer, im Leerlauf mehr Speicher), rendert dafür auf allen Systemen gleich. Nur wählen, wenn WebKitGTK unter Linux zu viele Darstellungsprobleme macht. Der Kern ist durch die Schnittstelle in § 9.2 austauschbar.

### 9.2 Aufbau

```
Netzwerk-Labor/
  bauen.py                   baut web/ (Ordner für Tauri + Einzeldatei-Fassung), --paket = Browser-ZIP
  src/
    kern/     util.js (IP/MAC-Helfer), ereignis.js
    plattform/ plattform.js (Schnittstelle), plattform-tauri.js, plattform-browser.js
    modell/   geraete.js, konfig.js, topologie.js, befehle.js (Rückgängig)
    sim/      engine.js, frames.js, host.js, switch.js, router.js, firewall.js,
              dienste.js (DHCP/DNS/HTTP), tcp.js, gruende.js (Codes → Lehrtexte)
    cli/      parser.js (Modi, Kurzformen, ?), ios-switch.js, ios-router.js,
              ausgaben.js (show-Formate), host-terminal.js
    ui/       editor.js, inspektor.js, konsole.js, simpanel.js, pdu.js, ebenen.js, leiste.js
    spiel/    tickets.js, generator.js, injektoren.js, abnahme.js, hilfe.js,
              wirtschaft.js, wartung.js, mini.js, postfach.js
    daten/    tickets-*.js, kunden.js, lehrtexte.js
  shell/      Tauri-Projekt: src-tauri/ (Cargo.toml, tauri.conf.json, src/main.rs, icons/)
  tools/      messen.ps1 (Leerlauf messen), linux-bauen.sh
  tests/      tests.html + run.js (Node)
  web/        Build-Ausgabe (nicht versionieren)
```

**Plattform-Schnittstelle** (`plattform.js`): Der Kern kennt nur sie, nie Tauri direkt. Sie bietet `laden()`, `speichern()`, `fenster.modus("tray"|"leiste"|"voll")`, `fenster.immerOben(bool)`, `fenster.deckkraft(x)`, `abzeichen(n, text)`, `benachrichtigen(text)`, `autostart(bool)`, `datei.exportieren()`/`importieren()` und `kann(funktion)`. Die Browser-Fassung setzt `localStorage`, Tab-Titel-Zähler und Download-Link um; `kann()` blendet Nicht-Unterstütztes in den Einstellungen aus, mit einer Zeile Begründung.

### 9.3 Speicherung

Der Lernmotor bleibt synchron (`store.get/set`). Deshalb: **Cache mit Durchschreiben.** Beim Start lädt die Hülle asynchron alles in den Speicher, `store.set` schreibt in den Cache und stößt ein verzögertes Schreiben an (etwa 2 s). Die Rust-Seite schreibt **atomar** (temporäre Datei, dann umbenennen) in den Datenordner des Programms (`%APPDATA%` unter Windows, `~/.local/share` unter Linux). Dazu **5 rotierende Sicherungen** (täglich), Versionsfeld und Migration. Ist die Datei beschädigt, lädt das Programm die letzte Sicherung und sagt es. **Export/Import** über Dateidialog.

### 9.4 Was auf welchem System geht

**Nach meinem Wissen, hier nicht getestet.** Opus prüft jede Zeile je System (unter WSLg testbar: mit `GDK_BACKEND=x11` als X11 über XWayland, ohne als Wayland; der Compositor ist aber weder GNOME noch KDE, für echte Desktops siehe § 9.8) und trägt das Ergebnis in die Abnahme ein.

| Funktion | Windows 11 | Linux X11 / KDE | Linux Wayland (GNOME) |
|---|---|---|---|
| Immer im Vordergrund per Programm | ja | ja | nein, Sache des Compositors |
| Fenster selbst positionieren und andocken | ja | ja | nein |
| Durchsichtiges, rahmenloses Fenster | ja | ja, mit Compositor | meist ja |
| Tray-Symbol | ja | ja | nur mit AppIndicator-Erweiterung |
| Globaler Hotkey | ja | ja (X11) | eingeschränkt oder nein |
| Klick-durchlässig im Ruhezustand | ja | meist | unklar |
| Vollbild oder Präsentation erkennen | ja (Windows-Schnittstelle) | X11 möglich | nein |

**Rückfall:** Wo etwas fehlt, läuft die Leiste als normales kleines Fenster, das du selbst platzierst und über das Fenstermenü „immer oben“ setzt. Die Einstellungen zeigen die Funktion ausgegraut mit einem Satz Begründung. Nichts bricht.

### 9.5 Bauen und Verteilen

- **Windows:** `cargo tauri build` erzeugt eine einzelne `Netzwerk-Labor.exe`. Sie braucht die WebView2-Runtime (Windows 11 hat sie, ältere Systeme eventuell nicht). Ohne Signatur zeigt Windows **SmartScreen** („Weitere Informationen → Trotzdem ausführen“); das steht in der LIESMICH für die Klasse.
- **Linux:** in der WSL-Ubuntu bauen. Vorher Entwicklungspakete installieren (`build-essential`, `pkg-config`, `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `librsvg2-dev`, `libayatana-appindicator3-dev`, `libssl-dev`, dazu Rust über `rustup`; **Paketnamen auf Ubuntu 26.04 mit `apt-cache` prüfen**). Ergebnis: AppImage und tar.gz. Nach meinem Wissen braucht ein AppImage auf neueren Ubuntu-Versionen `libfuse2` oder den Start mit `--appimage-extract-and-run`. Alternativ Docker.
- **Kein Cross-Kompilieren:** jedes System baut nativ.
- **Browser-Fassung:** `bauen.py --paket` erzeugt wie bei der Spielhalle `START.html` in einer ZIP, derselbe Kern ohne Fensterfunktionen.
- **Aktualisieren:** neu verteilen. Die Version steht in der Kopfzeile, der Spielstand wird migriert.

### 9.6 Grundsätze

- `sim/` und `cli/` haben **keinen** DOM-Zugriff, keinen direkten Zugriff auf Zeit oder Zufall (Zufall nur mit übergebenem Seed).
- Config ist reine Daten. Jede UI-Aktion geht über einen Befehl im Modell (Rückgängig und Autospeichern gratis). Ereignisse (`ereignis.js`) statt direkter Aufrufe zwischen UI und Spiel.
- **Zeigerereignisse statt HTML5-Drag-and-Drop** (in WebKitGTK oft holprig, und für den Editor ohnehin besser). Konservatives CSS, Sichtprüfung **auf beiden Engines** (WebView2 = Chromium, WebKitGTK = Safari-Engine).
- Schriften lokal (woff2), keine externen Anfragen. Zeit über **Zeitstempel-Differenz**, nicht durch Zählen von Ticks.
- **Tests:** `tests.html` läuft in der Hülle oder im Browser (Vorbild Spielhalle) **und** headless mit Node (`tests/run.js`, nur eingebautes `node:test`/`assert`, keine npm-Pakete). Kein Bundler, kein TypeScript: Sim und Konsole bleiben schlichtes JavaScript mit JSDoc-Typen, damit `bauen.py` als Werkzeug reicht.

### 9.7 Verhalten am Desktop (minimal und unauffällig)

**Ein Fenster, zwei Ansichten, dazu Tray.** Die Leiste und die Vollansicht sind **dasselbe Fenster**, das Größe, Rahmen und „immer oben“ zur Laufzeit wechselt. So gibt es nur einen JavaScript-Kontext und einen Spielstand, keine Synchronisation. Zwischen Ansichten wird das DOM der Vollansicht abgebaut.

| Zustand | Was |
|---|---|
| **Tray** | Kein Fenster. Symbol mit Punkt bei neuen Tickets, Tooltip „2 Tickets · 38 €/h“. Linksklick blendet die Leiste ein/aus. Rechtsklick: Öffnen, Ruhe 1 h, Immer oben, Autostart, Beenden |
| **Leiste** | Rahmenlos, klein, am Rand, Standard 55 % deckend. Maus darüber: voll deckend und Aufklappen zum Mini-Panel. Nach 5 s ohne Maus wieder zu |
| **Voll** | Normales Fenster mit Rahmen: Labor, Postfach, Kunden, Wiki, Lernkarte |

**Regeln**
1. **Nie Fokus stehlen.** Die Leiste erscheint ohne Aktivierung. Sie ist nur mit der Maus bedienbar, **Mini-Tickets brauchen keine Tastatur** (Auswahl, Anklicken, Sortieren). Ein neues Ticket ändert nur Zähler und Punkt: kein Aufspringen, kein Ton. Systembenachrichtigungen sind optional, standardmäßig aus und begrenzt (höchstens eine je 30 min).
2. **Nie im Weg.** Position wird pro Monitor gemerkt, bei geänderter Monitoranordnung zurück ins Sichtbare geholt. Schließen der Leiste geht ins Tray, nicht ins Beenden. „Ruhe 1 h“ blendet alles aus. Vollbild und Präsentation blenden die Leiste automatisch aus (Windows, unter Linux nur, wo möglich).
3. **Klick-durchlässig im Ruhezustand (optional).** Die Leiste lässt Mausklicks durch, außer über ihren Bedienelementen. Dafür fragt die Rust-Seite den Mauszeiger etwa 10-mal je Sekunde ab, aber nur solange die Leiste sichtbar ist.
4. **Sparsam.** In Tray und Leiste wird nur bei Zustandsänderung gezeichnet. Die Uhr läuft über Zeitstempel: ein 60-s-Timer, Sekundentakt nur bei Mausberührung. Die Simulation pausiert außerhalb des Labors. Ziel: **Leerlauf ≈ 0 % CPU.**
5. **Speicher, ehrlich.** Auch eine leere WebView braucht im Leerlauf grob einige zehn bis über hundert MB (unter Windows mehrere `msedgewebview2`-Prozesse). Wirklich winzig geht nur mit nativer Oberfläche. Der Kompromiss ist gewollt. **Phase 0 misst** und trägt die Zahlen ins Log, ohne Grenzwert zu erfinden.
6. **Eine Instanz.** Ein zweiter Start holt die Leiste nach vorn, statt ein zweites Programm zu öffnen.
7. **Autostart nur auf ausdrückliche Wahl.** Er startet dann still im Tray.
8. **Alles abschaltbar und gemerkt.** Globaler Hotkey (Vorschlag Strg+Alt+L) blendet ein/aus. Kann die Plattform ihn nicht, bleibt der Tray-Eintrag.

Nicht in v1: Windows-**AppBar** (die Leiste reserviert Platz am Rand, andere Fenster schieben sich nicht darunter). Sie wäre das „echt integrierte“ Verhalten, ist unter Linux aber sehr unterschiedlich und deshalb spätere Idee.

### 9.8 Werkzeuge installieren (du hast es erlaubt)

| Werkzeug | Wo | Wofür | Nötig? |
|---|---|---|---|
| `tauri-cli` (`cargo install tauri-cli --version "^2"`) | Windows und WSL | Bauen und Entwicklungsmodus | ja |
| Visual Studio „Desktopentwicklung mit C++“ | Windows | Linker für Rust | nur falls es fehlt (beim ersten Build prüfen) |
| Node.js LTS (`winget install OpenJS.NodeJS.LTS`) | Windows (WSL bei Bedarf) | headless Tests | empfohlen |
| `build-essential pkg-config libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev libayatana-appindicator3-dev libssl-dev` und `rustup` | WSL-Ubuntu | Linux-Build | ja für Linux (Paketnamen prüfen) |
| `xdotool`, `wmctrl` | WSL-Ubuntu | X11-Fensterverhalten prüfen (immer oben, Position) | optional |
| **Ubuntu-GNOME-VM** (Hyper-V, in Windows 11 Pro enthalten), bei Bedarf KDE-VM | Windows | echte Linux-Desktops testen, je ISO einige GB | optional, erst nach deiner Antwort auf die Linux-Frage |

**Regeln:** Phase 0 braucht nur die ersten vier Zeilen. Opus nennt **vor jeder Installation mit Adminrechten** (`winget`, `sudo apt`) in einem Satz, was und warum, installiert nur, was die laufende Phase braucht, und trägt die Versionen ins Log. Kein Signaturzertifikat und keine Cloud-Build-Dienste nötig.

## 10 · Tests (vor jeder Veröffentlichung grün)

1. **Golden-Traces:** kanonische Abläufe als festes Soll (erster Ping im Netz = ARP-Anfrage per Broadcast, ARP-Antwort per Unicast, Echo-Anfrage, Echo-Antwort; Ping über den Router = ARP für das Gateway, MAC wechselt, TTL −1; MAC-Tabelle lernt, Fluten bei unbekanntem Ziel, VLAN trennt Broadcast-Domänen).
2. **Rechnungsgegenprobe:** Subnetzrechnung des Labors gegen Python `ipaddress` (wie bei der Spielhalle, 0 Abweichungen).
3. **Ticketprüfung:** jede Lösung besteht, jeder Fehler scheitert mit dem erwarteten Grundcode (§ 8.2).
4. **CLI-Prüfung:** je Befehl eine Ausgabe-Erwartung, Abkürzungen, Fehlermeldungen, Modi.
5. **Durchspiel-Lauf:** ein Skript spielt in der Oberfläche Ticket 1 bis N automatisch durch (wie `testlauf.js` der Spielhalle).
6. **Sichtprüfung:** je Phase im echten Programm **auf Windows und Linux**, Bildschirmfotos, Leiste und Vollansicht, Dunkel- und Hellmodus.
7. **Leerlaufmessung:** CPU und Speicher in Tray und Leiste (`tools/messen.ps1` unter Windows, `ps` unter Linux), Zahlen ins Log.

## 11 · Phasen mit Abnahmekriterien

Alle Kriterien sind **sichtbare Abläufe im Browser**, nicht „Modul existiert“. Ein Modul, das getestet ist, aber vom Spiel nie aufgerufen wird, zählt als nicht erledigt.

| Phase | Inhalt | Abnahme (Klick-Ablauf) |
|---|---|---|
| **0 Hülle und Grundlage** | Tauri-Projekt, `bauen.py` (Ordner + Einzeldatei), Plattform-Schnittstelle, Speichern (atomar, Sicherungen), Ein-Fenster-Umschaltung Leiste ⇄ Voll, Tray mit Punkt, Einzelinstanz, Lernmotor eingebunden, Leerdesign, Rückfall-Anzeigen, Messung | `Netzwerk-Labor.exe` startet per Doppelklick; Linux-Fassung startet in WSLg; Leiste ⇄ Voll per Klick; ein simuliertes Ticket setzt den Tray-Punkt; Neustart behält den Zustand; `kann()`-Tabelle je System ausgefüllt; Leerlaufwerte im Log; `tests.html` grün |
| **1 Erstes Ping** *(Vertikalschnitt)* | Editor (PC, Switch, Router), Kabel, Inspektor mit IP-Feldern, Ping-Gummiband, Sim-Kern L2/L3 (ARP, ICMP, statisches Gateway), Ereignisliste, PDU-Inspektor, Ebene IP-Netze, Undo/Autospeichern, 5 Einstiegs-Tickets, Auftragsliste live, Hilfestufen 0–6 | Ticket „Salon: Drucker nicht erreichbar“ ist von Anfang bis Abnahme lösbar, Trace stimmt mit Golden-Test überein, Lösung wird vorgeführt und erzeugt Wiederholungsticket |
| **2 Konsole und VLAN** | IOS-Parser, Switch- und Router-Konsole, `?`/Tab/Kurzformen, running/startup, `reload`, VLAN, Trunk, Router-on-a-Stick, 15 weitere Tickets, „entspricht: …“-Zeile | Arztpraxis-Projekt (3 VLANs) per Konsole *und* per Panel lösbar; nicht gespeicherte Änderung geht nach `reload` verloren |
| **3 Dienste** | DHCP, DNS, ACL, NAT/PAT, Server, Firewall (vereinfacht), TCP-Handshake-Ansicht | Autohaus-Projekt mit 2 Standorten und Internet, NAT-Fehlersuche, SYN → SYN/ACK → ACK im PDU-Inspektor sichtbar |
| **4 Karriere** | Postfach, Kunden, Euro/Ruf, Stufen, Abnahme mit Sternen, Neustart-Test, Injektor-Generator, Wiki-Links, Prüfungstag | Ein Arbeitstag von Postfach bis Abnahme; generiertes Ticket besteht die Ticketprüfung |
| **5 Idle** | Wartungsverträge, Playbooks (an Fälligkeit gekoppelt), Offline-Bericht, Mini-Tickets und Leisteninhalt, Unterrichtsmodus, Ruhe-Schalter, Vollbild-Ausblendung | Mini-Ticket in der Leiste ohne Tastatur lösbar; Ticket kommt ohne Fokusklau und ohne Ton an; Playbook pausiert, sobald die Fertigkeit fällig ist |
| **6 Ausbau** | STP, LACP, Port-Security, IPv6, RIP/OSPF, Storage-Kunden (NAS/SAN), Story-Bögen | je Thema eigene Abnahme |

**Empfohlene Reihenfolge:** Phase 0 **allein** zuerst: Stehen Windows- und Linux-Build und die Leiste, ist der Rest reine Web-Arbeit. Dann 1 → **dem Nutzer 10 Minuten in die Hand geben** → 2 → 3 → 4 → 5. Simulation und Konsole tragen etwa 70 % des Aufwands. Die Idle-Schicht ist dünn und kommt deshalb spät. Die Bedienung des Editors ist das größte Akzeptanzrisiko, also zuerst hier den Nutzertest.

## 12 · Risiken und ehrliche Grenzen

| Risiko | Gegenmaßnahme |
|---|---|
| Die Simulation lehrt etwas Falsches | Golden-Traces, Belege je Lehrtext, „IOS-ähnlich“ kennzeichnen, Fehler ehrlich ansprechen |
| Umfang läuft weg (Simulation und Konsole sind groß) | Phasen mit Abnahme, Vertikalschnitt zuerst, Streichliste: Firewall-Konsole, Story, OSPF |
| Editor fühlt sich zäh an | Nutzertest nach Phase 1, UX-Regeln aus § 7 sind Abnahmekriterien |
| Idle wird zum Klickspiel ohne Lernen | Können-Tor: Playbooks nur ab „sicher“, pausiert bei Fälligkeit; Euro kauft nie Kernwerkzeuge |
| Spielstand beschädigt oder gelöscht | Atomares Schreiben, 5 rotierende Sicherungen, Export/Import (§ 9.3) |
| Lernstand von Programm und Browser-Spielhalle getrennt | Export/Import; optional Spielhalle als Fenster im selben Programm (ungeprüft), § 8.3 |
| Cisco-Marke | eigene Symbole, „IOS-ähnlich“, keine Abbilder |
| Agent baut Module „daneben“ | Abnahme nur als sichtbarer Ablauf, Verkabelung in `bauen.py` prüfen |
| Wayland/GNOME erlaubt keine Overlay-Funktionen (immer oben, Positionieren, Hotkey) | Rückfall auf normales kleines Fenster, ehrliche Anzeige in den Einstellungen (§ 9.4) |
| WebKitGTK verhält sich anders als Chromium (Ziehen, CSS, SVG-Geschwindigkeit) | Zeigerereignisse, konservatives CSS, Sichtprüfung auf beiden Systemen; Electron als Notausgang |
| Unsigniertes Programm: SmartScreen, Linux-Ausführrechte | Anleitung in der LIESMICH, Signieren später, falls es die Klasse stört |
| Speicherbedarf der WebView höher als „minimal“ | Vollansicht bei Leiste abbauen, messen, ehrlich berichten (§ 9.7) |
| Erster Build dauert lange, Linux-Umgebung ist leer | Phase 0 allein, Installationen mit Rückfrage (Adminrechte), Build im Hintergrund |

## 13 · Entscheidungen (Standard gilt, außer du widersprichst)

1. **Eigenes Projekt** neben der Spielhalle (von dir am 30.09. bestätigt), Lernmotor gemeinsam genutzt. Später erhält die Spielhalle eine Kachel „Netzwerk-Labor“.
2. **Desktop-Programm mit Tauri 2** für Windows (`.exe`) und Linux (AppImage/Binary), schlichtes JavaScript, kein Node. Browser-Fassung als Zugabe.
3. **Ein Fenster, zwei Ansichten** (Leiste und Voll) plus Tray, statt mehrerer Fenster.
4. **Standard der Leiste:** halbdurchsichtig, am Rand, ohne Ton und ohne Fokusklau, Autostart aus.
5. **Fiktion:** Ein-Mann-Systemhaus, Kunden fiktiv, Mentorfigur namenlos („Senior“).
6. **Konsole von Anfang an (Phase 2)**, kein „später vielleicht“.
7. **Export/Import** von Spielstand und Lernstand als Datei: **ja** (jetzt selbstverständlich, weil das Programm ohnehin in Dateien speichert).
8. **Dynamisches Routing (RIP/OSPF)** erst in Phase 6. **Windows-AppBar** nur als spätere Idee.
9. **Spielname** offen (Arbeitstitel „Netzwerk-Labor“ für das Werkzeug, „Systemhaus“ für die Fiktion).

### Frage an dich (nicht blockierend)
Welches Linux und welche Oberfläche nutzt ihr (Ubuntu/GNOME, KDE, anderes; X11 oder Wayland)? Davon hängt ab, wie viel von § 9.4 dort wirklich funktioniert. Ohne Antwort baut Opus für „GNOME unter Wayland“ als schwächsten Fall und lässt alles andere darüber hinaus laufen.
