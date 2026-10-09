# 🧩 Entwurf – Inhaltslücken: trägt der Stoff eine 1.3?

⬆️ [[10-Projekte/Lernprojekte/Netzwerk-Labor/Liesmich|Netzwerk-Labor]] · Auftrag: `task-29` · Vertrag: [[Hilfestellung – Stufen und Schnittstellen]] · Stand: [[Architektur]]

> **Auftrag.** Messen, welche **Inhalts**lücken eine Fassung 1.3 füllen muss – nicht welche Technik fehlt.
> **Methode.** Nur gelesen und gezählt; **keine Zeile Code geändert**. Jede Zahl ist in dieser Sitzung erhoben
> (Befehle im Anhang). Stand: Commit `c341c2d`, `node tests/run.js` → **395/395 grün** (unverändert, weil nichts geändert wurde).
> **Was ich NICHT messen konnte:** Die Lernnotizen und Fragenkataloge des Nutzers liegen **außerhalb** dieses
> Repositoriums. Die Prüfungsbewertung stützt sich deshalb auf die Felder `ap`/`stufe` in `DATEN.skills` und auf die
> Quellen, auf die `DATEN.wiki`/`DATEN.lehrtexte` verweisen – **nicht** auf die echten Kataloge. Das ist eine
> Einschätzung, keine Messung, und steht überall als solche da.

## Bestand (selbst gemessen, nicht abgeschrieben)

| Größe | Zahl | Quelle der Zahl |
|---|---:|---|
| Fertigkeiten | 27 | `DATEN.skills.length` |
| Handgeschriebene Tickets | 58 | `DATEN.tickets.length` |
| Mini-Tickets | 92 | `DATEN.mini.length` |
| davon mit eigenem Denkanstoß | **25** | `Object.keys(DATEN.miniDenkhilfen).length` |
| Wiki-Seiten | 27 | `Object.keys(DATEN.wiki).length` |
| Lehrtexte | 34 | `Object.keys(DATEN.lehrtexte).length` |
| Fehlertexte | 82 | `Spiel.FEHLERTEXTE.length` |
| Hilfe-Vorschläge | 29 | `DATEN.hilfen.VORSCHLAEGE.length` |
| Trainingsszenarien | 34 | `DATEN.trainings.length` |
| Injektoren | 36 | `Object.keys(Spiel.INJEKTOREN).length` |
| Grundcodes | 34 | `Object.keys(Sim.GRUENDE).length` |
| Kunden / Geschichten | 7 / 7 | `DATEN.kunden`, `DATEN.geschichten` |
| Gerätetypen | **7** | `Modell.TYPEN` = pc, server, switch, router, firewall, internet, nas |
| Werkzeughinweise | 27 | `Object.keys(Spiel.WERKZEUGE).length` (einer je Fertigkeit) |
| Leiter-Sprossen (Hilfe-Bereiche) | 6 | `Spiel.LEITER.length` = link, vlan, ip, gateway, route, dienst |

---

## 0 · Sofort-Befund: drei Karten, die man anklicken kann und die nicht aufgehen — P1

* **Behauptung:** Für drei Fertigkeiten gibt es **keinen Fehler-Injektor**, also lässt sich ihr Trainingsszenario nie
  bauen. Die Ansicht zeigt die Karten trotzdem.
* **Beleg:** Gemessen über `Spiel.INJEKTOREN` × `DATEN.skills`: **`lab.portsec`, `lab.stp`, `lab.storage`** haben
  keinen Injektor (0 von 36 deckt sie ab). Die drei Szenarien stehen in `src/daten/trainings.js`
  (`tr-portsec-dose`, `tr-stp-schleife`, `tr-storage-nas-san`), `Spiel.training.starten()` lehnt sie mit
  „Für diese Fertigkeit gibt es keinen Fehler-Injektor" ab (Beleg aus Baustein D, dort gemessen).
* **Aufwand:** 2 Sitzungen (3 Injektoren + Vorlagen + Tests) – oder 0,5 Sitzung, wenn man die Karten ausblendet.
* **Wirkung:** Ein Azubi sieht drei von 34 Übungen, die er nie starten kann. Das ist kein Inhalts-, sondern ein
  Vertrauensschaden – und `lab.storage` ist ohnehin die dünnste Fertigkeit (§ 2).

---

## 1 · Die Denkhilfe-Lücke: 67 von 92 Minis haben keinen eigenen Anstoß — P1

* **Behauptung:** 67 Mini-Tickets fallen auf den Fertigkeitssatz zurück (`Spiel.SENIOR_FRAGEN`/`Spiel.WERKZEUGE`).
  Der Satz erinnert an das **Werkzeug**, nicht an die **Frage** – bei mehreren Minis derselben Fertigkeit bekommt
  der Azubi also mehrfach wortgleich dieselbe Hilfe.
* **Beleg:** `DATEN.miniDenkhilfen` hat 25 Einträge (`src/daten/mini-denkhilfen.js:35`), `DATEN.mini` hat 92. Der
  Rückfall steht in `src/spiel/mini.js:192–196` (`miniDenktext`), der eigene Text greift in `:197`/`:227`. Ebenfalls
  betroffen: das **Stichwort** für den Lernanker – ohne eigenes `stichwort` fällt `Spiel.mini.anker` auf den
  Fertigkeitsnamen zurück (`src/spiel/mini.js:222–228, 268–274`).
* **Aufwand:** Die vorhandenen 25 Einträge sind 96 Zeilen (`mini-denkhilfen.js`, task-20). 67 weitere ≈ 2,7× dieser
  Arbeit, jeder Text muss die Lösung meiden und einen Begriff nennen, der **nicht** im Wiki steht → **3 Sitzungen**
  (geschätzt, nicht gemessen; 13 der 25 vorhandenen haben zusätzlich einen wörtlichen `ausschnitt`, der Rest kommt
  ohne aus).
* **Wirkung:** Die Hilfe greift in **26 von 27** Fertigkeiten; jede einzelne Frage wird verständlicher, ohne dass
  eine Zeile Simulation angefasst wird. Der größte Hebel pro Aufwand im ganzen Bestand.

### Die 67 Minis ohne eigenen Denkanstoß (gemessen, gruppiert nach Fertigkeit)

| Fertigkeit | AP | ohne | Mini-IDs (ohne Präfix `mini-`) |
|---|---|---:|---|
| lab.gateway | AP1 | 5 | gw-1, gw-2, gw-3, cli-ipconfig-1, cli-netsh-1 |
| lab.ip | AP1 | 3 | ip-1, ip-2, cli-linux-1 |
| lab.subnetz | AP1 | 3 | sub-1, sub-3, sub-4 |
| lab.dhcp | AP1 | 3 | dhcp-1, dhcp-2, dhcp-3 |
| lab.ports | AP1 | 3 | port-1, port-2, port-3 |
| lab.cli | AP2 | 3 | cli-1, cli-2, cli-3 |
| lab.speichern | AP2 | 3 | save-1, save-2, save-3 |
| lab.trunk | AP2 | 3 | trunk-1, trunk-2, trunk-3 |
| lab.rostick | AP2 | 3 | ros-1, ros-2, ros-3 |
| lab.acl | AP2 | 3 | acl-1, acl-2, acl-3 |
| lab.route | AP1 | 3 | route-1, route-2, route-3 |
| lab.ttl | AP2 | 3 | ttl-1, ttl-2, ttl-3 |
| lab.nat | AP1 | 3 | nat-1, nat-2, nat-3 |
| lab.dmz | AP2 | 3 | dmz-1, dmz-2, dmz-3 |
| lab.portsec | AP2 | 3 | psec-1, psec-2, psec-3 |
| lab.netz | AP1 | 2 | netz-1, netz-2 |
| lab.arp | AP1 | 2 | arp-1, arp-3 |
| lab.switch | AP1 | 2 | sw-2, sw-3 |
| lab.dns | AP1 | 2 | dns-1, cli-nslookup-1 |
| lab.tcp | AP2 | 2 | tcp-1, tcp-3 |
| lab.vlan | AP1 | 2 | vlan-1, vlan-2 |
| lab.portfwd | AP2 | 2 | fwd-1, fwd-2 |
| lab.fw | AP2 | 2 | fw-1, fw-2 |
| lab.stp | AP2 | 2 | stp-1, stp-2 |
| lab.link | AP1 | 1 | link-2 |
| lab.storage | AP2 | 1 | sto-1 |
| **Summe** | | **67** | 26 Fertigkeiten – nur `lab.ping` (6 Minis) ist vollständig versorgt |

**Reihenfolge im Batch:** zuerst die fünf Fertigkeiten mit 5 und 3 offenen Minis (`lab.gateway` zuerst – dort ist
**kein einziger** der fünf Minis versorgt), zuletzt die Einzelfälle.

---

## 2 · Prüfungsabdeckung: die Breite stimmt, die Tiefe nicht — P2

* **Behauptung:** Die 27 Fertigkeiten verteilen sich **14 × AP1 / 13 × AP2** (gemessen über `DATEN.skills[].ap`).
  Jede Fertigkeit hat eine Wiki-Seite (27) und mindestens ein Trainingsszenario (34). Der Unterschied liegt nicht
  in der Breite, sondern in der Tiefe: **9 Fertigkeiten haben keinen einzigen Lehrtext**, und bei drei davon ist
  zusätzlich das Training gesperrt (§ 0).
* **Beleg:** `ap`-Verteilung aus `DATEN.skills`; Karriere-Stufen 1:7 · 2:7 · 3:4 · 4:4 · 5:3 · 6:2.
  Ohne Lehrtext: `lab.switch`, `lab.subnetz`, `lab.tcp`, `lab.cli`, `lab.speichern`, `lab.rostick`,
  `lab.portfwd`, `lab.dmz`, `lab.storage` (alle 34 Lehrtexte liegen auf 18 Fertigkeiten).
* **Aufwand:** 1 Sitzung für 9 Lehrtexte (je Grundcode einer, Muster wie `src/daten/lehrtexte.js`) – die
  Fehlertexte sind schon da und nennen dieselben Meldungen.
* **Wirkung:** Genau die Meldungen, die ein Azubi im Terminal sieht, sind in diesen neun Themen unerklärt; die
  Simulation kennt die Ursachen (`Sim.GRUENDE`), das Spiel sagt sie ihm aber nicht.

### Die schwächsten Fertigkeiten (gezählt: Wiki-Abschnitte · Lehrtexte · Minis · Denkhilfen · Trainings · Vorschläge)

| Fertigkeit | AP | Wiki-Abschn. | Lehrtexte | Minis | Denkhilfen | Trainings (startbar) | Vorschläge | Summe |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| **lab.storage** | AP2 | 2 | 0 | 1 | 0 | 1 (**gesperrt**) | 0 | **4** |
| **lab.stp** | AP2 | 2 | 1 | 2 | 0 | 1 (**gesperrt**) | 0 | **6** |
| lab.rostick | AP2 | 3 | 0 | 3 | 0 | 1 | 0 | 7 |
| lab.tcp / lab.cli / lab.speichern / lab.dmz / lab.portfwd | AP2 | 3 | 0 | 3 | 0–1 | 1 | 0–1 | 7–8 |
| lab.portsec | AP2 | 3 | 1 | 3 | 0 | 1 (**gesperrt**) | 0 | 8 |
| lab.netz / lab.switch / lab.arp | AP1 | 3 | 0–1 | 3 | 1 | 1 | 0–1 | 9 |

**Am wenigsten Inhalt hat `lab.storage`** (Summe 4): eine Wiki-Seite mit zwei Abschnitten, kein Lehrtext, **ein**
Mini, kein Denkanstoß, kein Vorschlag – und das eine Training ist gesperrt. `lab.stp` folgt dicht dahinter.
Auffällig: die vier dünnsten Fertigkeiten sind **alle AP2** – die Prüfungsvorbereitung ist dort am schwächsten,
wo die Prüfung am meisten verlangt.

---

## 3 · Hilfe-Abdeckung: 29 Vorschläge, aber 10 Fertigkeiten ohne jeden — P1/P2

* **Behauptung:** Der Vorschlagsstreifen deckt **17 von 27** Fertigkeiten ab; **10 haben keinen einzigen Vorschlag**.
  Dazu hat der Streifen **keine Symptom-Sicht**: Ein Azubi, der „kein Internet" sieht, muss den Bereich raten – die
  Auswahl filtert nur nach Gerät, Modus und Art (`src/spiel/hilfe.js:275–286`) und ordnet nach Leiter-Reihenfolge.
* **Beleg (gezählt über `DATEN.hilfen.VORSCHLAEGE`):**
  * je Bereich: **dienst 7** · **link 5** · **ip 5** · **vlan 4** · **gateway 4** · **route 4**
  * je Gerät: ios 12 · host-windows 8 · host-linux 7 · **alle 1** · **fw 1**
  * je Ebene: **Ebene 1: 22 · Ebene 2: 0 · Ebene 3: 7** · je Art: prüfen 22 · ändern 7
  * **ohne Vorschlag:** `lab.netz`, `lab.arp`, `lab.subnetz`, `lab.dhcp`, `lab.tcp`, `lab.rostick`,
    `lab.portfwd`, `lab.portsec`, `lab.stp`, `lab.storage`
  * Symptom-Probe: an einem Firewall-Gerät im Modus `fwPriv` bleiben genau **zwei** Kandidaten
    (`link-enable`, `dienst-fw-run`) – einer davon ist „enable".
* **Aufwand:** 2–3 Sitzungen. 20 Vorschläge (je einer für die 10 leeren Fertigkeiten, dazu Ebene 2 und der
  Firewall-Bereich) + ein Symptom-Index über `DATEN.hilfen.SYNTAX` (12 Schlüssel vorhanden) für den Einstieg
  „ich sehe X, was prüfe ich zuerst?".
* **Wirkung:** Der Streifen ist die **erste** Anlaufstelle im Terminal. Wo er leer bleibt, steht der Azubi ohne
  nächsten Schritt – genau die Lage, für die der ganze Auftrag „Hilfestellung" gebaut wurde.

### Die drei dünnsten Stellen im Streifen

1. **Ebene 2 fehlt vollständig** (0 von 29). Die Leiter springt von „harmlos ansehen" (22×) direkt zu
   „ändert Konfiguration" (7×). Zwischen „ich schaue nach" und „ich schreibe um" gibt es keinen Vorschlag.
2. **Firewall: 1 Vorschlag** – bei drei AP2-Fertigkeiten (`lab.fw`, `lab.dmz`, `lab.portfwd`), neun Minis und
   drei Trainings, die auf diesem Gerät spielen.
3. **`route`, `vlan`, `gateway` je 4** – die Bereiche sind dünn besetzt, obwohl dort die Prüfungsfragen sitzen
   (Subnetting/Route, VLAN/Trunk). `dienst` (7) ist dagegen ein Sammelbecken für sieben Fertigkeiten
   (acl, nat, speichern, dns, ports, fw, dmz) und damit zu grob, um zu führen.

---

## 4 · Gerätebreite: 7 Typen, vier Themen ohne jede Übung — P2

* **Behauptung:** `Modell.TYPEN` hat sieben Werte (pc, server, switch, router, firewall, internet, nas). Gemessen
  über `src/**/*.js` (Groß-/Kleinschreibung beachtet, Zählung im Anhang) fehlen vier Prüfungsthemen **als Übung**,
  nicht nur „ein wenig":

| Kandidat | Treffer in `src/` | Was wirklich da ist | Fehlt |
|---|---:|---|---|
| **IPv6** | **0** | nichts – keine Adresse, kein Präfix, kein NDP, kein DHCPv6 | **alles** |
| **WLAN / Access Point** | 30 | 3 Geschichten-Fragen (BSI NET.2.1, IEEE 802.11), 4 Beratungs-Module, 3 Briefings, 4 Mini-Distraktoren („Ein zweites WLAN"), ein geplanter Platzhalter `src/ui/geraetebilder.js:21` | Gerätetyp, SSID/VLAN, Funk, WPA, Übung |
| **VPN / IPsec** | 8 | 2 Geschichten-Fragen (RFC 4301), 1 Wiki-Satz (`wiki.js:483`), Portname `isakmp: 500` (`parser.js:95`), 1 Distraktor | Tunnel, Gegenstelle, Übung |
| **TLS / Zertifikate** | **5** (TLS) · **1** (Zertifikat) | nur der Vermerk **„TLS vereinfacht"** (`internet.js:61–62`, `host.js:174–175`, `aufrufe.js:456`); „Zertifikat" meint die **Karriere-Urkunde** (`karriere.js:258`) | Zertifikat, CA, Ablauf, Handshake |
| **Monitoring / SNMP** | **2** | Syslog-Zeilen bei Statusänderungen (`ios-ausgaben.js:6`), Portname `SNMP` (`pdu.js:65`), `snmp: 161`/`syslog: 514` (`parser.js:95`) | Syslog-Senke, SNMP, Schwellwert, Übung |
| **Backup / RAID** | 2 substanzielle | 2 Geschichten-Fragen: RAID 1 (BSI CON.3), Snapshot ≠ Sicherung (SNIA) – `geschichten.js:66–71, 158–163` | Fertigkeit, Wiki-Seite, Übung |
| **Virtualisierung** | **1** | ein Halbsatz: „gut für Datenbanken und virtuelle Maschinen" (`wiki.js:578`) | Hypervisor, VM, Container, Übung |
| **PowerShell / Bash-Skripting** | 11 | ein **PowerShell-Auszug** mit 3 Cmdlets (`host-windows.js:2, 6, 419, 434`), bash-Shell (`host-linux.js`), 1 Fehlertext | Skript, Schleife, Variable, `.ps1`/`.sh` |
| **Ticketsystem / ITIL** | 5 | ITIL als **Quelle und Fragetechnik**: Service Desk/Incident (`tickets-hotline.js:7`), Change Enablement (`geschichten.js:64`), Configuration Management (`audit.js:68`) | Incident/Problem/Change als Prozess, SLA, CMDB |

* **Die drei größten Lücken** (Kriterium: fehlt als Übung **und** wiegt in der Prüfung):
  1. **IPv6** – null Treffer im ganzen Quelltext, aber Pflichtstoff der AP1 (Adressierung, Präfixe, Nachbarschaft)
     und Grundlage jeder AP2-Netzplanung. Es passt in die vorhandene Maschinerie (Modell, Simulation, `IP`-Helfer).
  2. **WLAN / Access Point** – der einzige **physische** Gerätetyp, der fehlt; Funk, Kanal, SSID, Gastnetz und
     WPA sind AP1-Stoff, und im Spiel existiert WLAN bisher nur als Erzähltext und als falsche Antwortoption.
  3. **Virtualisierung** – ein einziger Halbsatz im Wiki für ein klassisches AP2-Thema (Hypervisor, VM, Container,
     Speicheranbindung); es hängt direkt an `lab.storage`, der dünnsten Fertigkeit (§ 2).
  Dicht dahinter: **TLS/Zertifikate** (nur „vereinfacht") und **Backup/RAID** (zwei gute Story-Fragen, aber keine
  Fertigkeit, kein Wiki, keine Übung).
* **Aufwand (geschätzt):** IPv6 dünn 4–6 Sitzungen (Adressen, Präfix, NDP, Dual-Stack, 1 Wiki, 3 Lehrtexte,
  6 Minis, 2 Trainings), WLAN/AP 4–5 (Gerätetyp + Ports/Skins + SSID↔VLAN + 3 Tickets + Wiki/Minis),
  Virtualisierung 1–2 (Fertigkeit + Wiki + Minis, VM auf dem vorhandenen Server), TLS 2–3, Backup/RAID 1–2,
  Monitoring 1–2 (die Syslog-Zeilen sind schon da), Skripting 2–3, ITIL 1.
* **Wirkung:** Jedes dieser Themen ist eine echte Prüfungsfrage, die das Spiel heute **gar nicht** übt – der Azubi
  lernt sie aus einem Buch statt im Labor.

---

## 5 · Reihenfolge nach WERT (nicht nach Aufwand)

Bewertet nach dem Nutzen für einen Azubi, der AP1/AP2 schreibt. Begründung je Zeile in der Spalte „Warum hier".

| # | Maßnahme | Aufwand | Warum genau hier |
|---|---|---:|---|
| **0** | **Injektoren für `lab.portsec`, `lab.stp`, `lab.storage`** (oder Karten ausblenden) | 0,5–2 S | Nicht Inhalt, sondern ein sichtbarer Defekt: drei Karten, die nie aufgehen (§ 0). Vor allem anderen zu beheben. |
| **1** | **67 Denkhilfen** schreiben | 3 S | Greift in **26 von 27** Fertigkeiten, in **jeder** Mini-Runde. Kein neues Datenmodell, kein Sim-Risiko. Hebt die bestehende Hilfe von „Werkzeugtipp" auf „Denkanstoß zur Frage". |
| **2** | **Hilfe-Vorschläge**: 10 leere Fertigkeiten füllen, **Ebene 2** einführen, Firewall-Bereich, Symptom-Einstieg | 2–3 S | Der Streifen ist die erste Anlaufstelle; 10 Fertigkeiten enden heute ohne nächsten Schritt, und 0 von 29 Vorschlägen sind Ebene 2 („genauer nachsehen, ohne etwas zu ändern"). |
| **3** | **9 fehlende Lehrtexte** (Ergänzung zu 1./2.) | 1 S | Die Meldungen sind da (`Spiel.FEHLERTEXTE`, 82), die Ursachen auch (`Sim.GRUENDE`, 34) – es fehlt nur der Text, der beides verbindet. Sehr billig, große Wirkung auf `lab.storage`/`lab.stp`. |
| **4** | **IPv6** als Thema | 4–6 S | Null Treffer im Quelltext, AP1-Pflichtstoff, passt in vorhandene Modell-/Sim-Schichten. Größte inhaltliche Lücke. |
| **5** | **WLAN / Access Point** als Gerät + Übung | 4–5 S | AP1/AP2-Stoff, heute nur Erzähltext; einziger fehlender physischer Gerätetyp. |
| **6** | **Virtualisierung** (VM/Container, Hypervisor) | 1–2 S | Klassisches AP2-Thema, hängt an `lab.storage` – der dünnsten Fertigkeit. Billig, weil Server/NAS schon existieren. |
| **7** | **TLS / Zertifikate** (Zertifikat, CA, Ablauf, HTTPS echt) | 2–3 S | AP2-Sicherheit; heute nur der Vermerk „TLS vereinfacht", und „Zertifikat" bedeutet im Code etwas ganz anderes. |
| **8** | **Backup / RAID** als Fertigkeit + Wiki | 1–2 S | Zwei fertige Story-Fragen mit guten Quellen (BSI CON.3, SNIA) warten nur auf eine Wiki-Seite und Minis. |
| **9** | **Monitoring / SNMP** | 1–2 S | AP2-Betrieb; die Syslog-Zeilen entstehen schon (`ios-ausgaben.js:6`) – es fehlt die Lektion darüber. |
| **10** | **ITIL als Prozess** (Incident/Change/SLA) | 1 S | Als Quelle und Fragetechnik bereits im Einsatz (3 Belege); es fehlt die sichtbare Fertigkeit. |
| **11** | **Skripting** (Schleifen, Variablen, `.ps1`/`.sh`) | 2–3 S | Praxisstoff, aber im Prüfungsgewicht hinter Netz/Sicherheit/Betrieb; PowerShell und bash sind als einzelne Befehle schon da. |

**Warum diese Reihenfolge und nicht „erst die großen Themen":**
Die Punkte 0–3 verbessern, was **täglich benutzt** wird, und kosten zusammen rund **7 Sitzungen** – für einen
Azubi, der die Syntax noch nicht kennt, ist jeder dieser Punkte unmittelbar spürbar. Die Punkte 4–7 sind der
**Inhalt**, der heute völlig fehlt; sie sind teurer und brauchen Vertragsarbeit an `docs/Architektur.md`
(neue Datenform für IPv6-Adressen, neuer Gerätetyp, neue VM) – deshalb **nach** den Hilfen, aber **vor** den
kleinen Ergänzungen 8–11, weil sie ganze Prüfungsgebiete abdecken.

**Vier Dinge, die nicht auf deiner Liste standen, aber dazugehören:**
1. die **drei gesperrten Trainingskarten** (§ 0) – sichtbarer Defekt;
2. die **10 Fertigkeiten ohne einen einzigen Hilfe-Vorschlag** (§ 3) – der Azubi steht dort ohne nächsten Schritt;
3. die **fehlende Ebene 2** im Vorschlagskatalog (0 von 29) – die Leiter kennt nur „ansehen" und „ändern";
4. **`lab.storage` als dünnste Fertigkeit** (Summe 4, § 2) – und genau dort ist zusätzlich das Training gesperrt.

---

## 6 · Was ich nicht gemessen habe (ehrlich)

* **Die Fragenkataloge und Lernnotizen des Nutzers** liegen nicht in diesem Repo. Ob IPv6, WLAN, Virtualisierung
  oder TLS in *seinen* AP1/AP2-Katalogen tatsächlich vorkommen, habe ich **nicht geprüft** – die Einschätzung
  stützt sich auf das FISI-Rahmenthema und auf die Quellen, die `DATEN.wiki`/`DATEN.lehrtexte` nennen.
* **Die Sitzungszahlen sind Schätzungen**, geeicht an genau einer bekannten Größe: 25 Denkhilfen = 96 Zeilen
  (`task-20`). Alle anderen Angaben (Trefferzahlen, Listen, Summen) sind in dieser Sitzung gezählt.
* **Nicht geprüft**, wie sich die Lücken im Spiel *anfühlen*: kein Browser, kein CDP in dieser Umgebung. Die
  Wirkung ist aus der Aufrufkette abgeleitet (`Spiel.mini.hilfe`, `Spiel.hilfe.passend`), nicht erlebt.

## Anhang · Messbefehle

```
# Bestand und Lücken (ein Node-Lauf über die Datenmodule):
#   DATEN.skills/.mini/.wiki/.lehrtexte/.trainings/.hilfen/.miniDenkhilfen, Spiel.FEHLERTEXTE, Sim.GRUENDE
# Gerätebreite je Thema (case-sensitive, über src/**/*.js):
#   IPv6 0 · WLAN 30 · VPN/IPsec 8 · TLS 5 (Zertifikat 1) · Monitoring 2 ·
#   Backup/RAID 2 substanzielle · Virtualisierung 1 · PowerShell/Skripting 11 · ITIL 5
# Injektoren: Object.values(Spiel.INJEKTOREN) gegen DATEN.skills
# Testlauf: & "$env:LOCALAPPDATA\node-portable\node-v24.21.0-win-x64\node.exe" tests/run.js  → 395/395 grün
```

Kein Code, keine Quelldatei und kein Test wurde für diesen Entwurf geändert; `git status` zeigt von mir nur diese Datei.
