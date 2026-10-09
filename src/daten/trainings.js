"use strict";
/* ---------- Trainingsszenarien für den Trainingsbereich (Vertrag „Hilfestellung" § 6) ----------
   DATEN.trainings = [{id, titel, beschreibung, skill, geraet, art, minuten, geruest, niveau, tipp, quelle, schritte?}]

   Regeln (gemessen in tests/daten-trainings.test.js, nicht behauptet):
   · skill     = id aus DATEN.skills (src/daten/basis.js). Jede dieser 27 ids kommt mindestens einmal vor,
                 keine erfundene. Damit deckt der Trainingsbereich jede Fertigkeit des Labors ab.
   · art       = "basis" (geführt heranführen) | "stoerung" (Fehler suchen) | "pruefung" (ohne Hilfe bestehen).
   · minuten   = 3..15, geschätzte Dauer eines Durchgangs.
   · geruest   = true bei basis/stoerung (geführte Übung mit Schritten und Denkanstoß), false bei pruefung.
                 schritte stehen genau dann in der Datei, wenn geruest true ist.
   · niveau    = Erklärtiefe der erzeugten Instanz (Vertrag § 1): basis → "E", stoerung → "AP1", pruefung → "AP2".
                 Der Aufrufer (src/spiel/training.js, starten) reicht sie als opts.stufe an den Generator.
   · tipp      = ein Satz Denkanstoß fürs Gerüst, nie die Lösung; bei pruefung leer.
   · geraet    = Geräteklasse, auf der der erzeugte Fall sitzt, in der Sprache von src/spiel/training.js:
                 "host" (Endgerät: PC, Server, NAS) · "switch" · "router" · "firewall" · "alle"
                 (mehrere Klassen, das Gerät hängt am Seed). Die Klasse ist aus den Injektoren der Fertigkeit
                 GEMESSEN (Spiel.INJEKTOREN × Spiel.vorlagen), nicht geraten. null heißt: für diese
                 Fertigkeit gibt es noch keinen Injektor – das Szenario ist ein Vorratseintrag
                 (lab.portsec, lab.stp, lab.storage), starten() kann es erst mit Injektor bauen.
   · quelle    = belegbare Quelle: Vault-Notizname und/oder RFC bzw. Hersteller-Doku. Jeder Teil (getrennt
                 durch „ · ") steht wörtlich in den Quellen derselben Fertigkeit – in DATEN.lehrtexte
                 (je Grundcode) oder in DATEN.wiki[skill].quelle/.belege. Nichts ist erfunden.
   · beschreibung = der E-Satz (Klartext, Anrede „du"); die Stufenwahl macht der Aufrufer.

   Reine Daten, kein DOM, keine Logik, deterministisch (kein Math.random, kein Date.now). */
DATEN.trainings = [
  /* ---------- lab.link: Link und Kabel prüfen ---------- */
  {id: "tr-link-kabel", titel: "Kein Link am Arbeitsplatz-PC", skill: "lab.link", geraet: "alle",
   art: "basis", minuten: 6, geruest: true, niveau: "E",
   beschreibung: "Ein PC meldet „Netzwerkkabel nicht angeschlossen“, obwohl er am Switch hängt. Du prüfst zuerst Schicht 1: Steckt das Kabel an beiden Enden, leuchtet die Port-LED, ist der Port nicht per shutdown abgeschaltet? Erst wenn der Link steht (up/up), haben IP-Adresse und Gateway überhaupt eine Chance.",
   tipp: "Schicht 1 zuerst: Hängt wirklich eine Leitung dran, und ist der Port eingeschaltet? Ein abgeschalteter Port sieht am PC genauso aus wie ein fehlendes Kabel.",
   schritte: ["Steckverbindung an PC und Switch prüfen, Port-LED ansehen.",
     "Am PC `ipconfig` aufrufen: Steht dort „Medienstatus: Medium getrennt“?",
     "Am Switch `show ip interface brief` lesen: down/down oder administratively down?",
     "Bei administratively down in den Schnittstellenmodus wechseln und `no shutdown` setzen.",
     "Erneut messen: Status und Protocol müssen up / up sein, danach das Gateway anpingen."],
   quelle: "Fragen – Netzwerke planen (Fehlersuche nach OSI von unten) · Cisco IOS Interface Command Reference (show ip interface brief)"},

  {id: "tr-link-port-down", titel: "Ein einzelner Switchport bleibt down", skill: "lab.link", geraet: "alle",
   art: "stoerung", minuten: 8, geruest: true, niveau: "AP1",
   beschreibung: "Ein Kollege kommt nicht ins Netz: Sein Port Fa0/5 steht auf down/down, alle Nachbarports am selben Switch laufen. Der Fehler sitzt also nicht am Switch insgesamt, sondern an dieser einen Leitung. Du grenzt ein: Kabel, Gegenstelle, Port-Zustand, VLAN.",
   tipp: "Nur ein Port ist betroffen – vergleich ihn mit einem laufenden Nachbarport. Der Unterschied steht in der Konfiguration.",
   schritte: ["`show ip interface brief` am Switch: Ist wirklich nur Fa0/5 down/down?",
     "Kabel auf einen freien, laufenden Port umstecken und erneut messen.",
     "Steht der Port danach up/up, waren Port oder Kabel defekt.",
     "Bleibt es down/down: Endgerät prüfen – eingeschaltet, Schnittstelle aktiv?",
     "`show running-config interface Fa0/5` gegen einen Nachbarport vergleichen: shutdown, VLAN, Port-Security."],
   quelle: "Fragen – Netzwerke planen (Fehlersuche nach OSI von unten) · Cisco IOS Interface Command Reference (show ip interface brief)"},

  /* ---------- lab.ip: IP-Adresse und Maske setzen ---------- */
  {id: "tr-ip-setzen", titel: "PC fest adressieren", skill: "lab.ip", geraet: "host",
   art: "basis", minuten: 6, geruest: true, niveau: "E",
   beschreibung: "Im Netz 192.168.1.0/24 bekommt der PC die feste Adresse 192.168.1.10, Maske 255.255.255.0, Gateway 192.168.1.1 und DNS 198.51.100.53. .0 ist die Netzadresse und .255 der Broadcast – beide darfst du nicht vergeben. Nach dem Eintragen liest du mit ipconfig gegen, ob Adresse, Maske und Gateway wirklich so ankommen.",
   tipp: "Netzadresse und Broadcast dürfen nicht an einen Host gehen. Rechne mit der Maske nach, welche Adressen in 192.168.1.0/24 überhaupt Hosts sind.",
   schritte: ["Freie Adresse wählen und mit `ipconfig` prüfen, dass 192.168.1.10 niemand benutzt.",
     "Adresse 192.168.1.10, Maske 255.255.255.0, Gateway 192.168.1.1 eintragen.",
     "Mit `ipconfig` gegenlesen: Steht die Adresse auf dem richtigen Adapter?",
     "Das Gateway anpingen – eine Antwort beweist, dass Schicht 1 bis 3 stehen."],
   quelle: "Network – Lernfassung (§ 7 IPv4-Adressen) · Cisco IOS IP Addressing Command Reference (ip address)"},

  {id: "tr-ip-konflikt", titel: "Adresskonflikt im LAN", skill: "lab.ip", geraet: "host",
   art: "stoerung", minuten: 8, geruest: true, niveau: "AP1",
   beschreibung: "Windows meldet beim Start einen Adresskonflikt für 192.168.1.10: Zwei Geräte antworten auf dieselbe IP, und welches Paket ankommt, ist Zufall. Du findest den Doppelgänger über die MAC-Adresse zur IP und vergibst danach eine freie Adresse.",
   tipp: "Zu einer IP gehört im LAN genau eine MAC-Adresse. Such die zweite MAC – sie gehört nicht zu deinem Adapter.",
   schritte: ["`ipconfig /all` zeigt die eigene MAC-Adresse zum konfigurierten Adapter.",
     "`arp -a` zeigt die fremde MAC zu 192.168.1.10.",
     "Am Switch die fremde MAC in `show mac address-table` einem Port zuordnen.",
     "Diesen Port bis zum Gerät verfolgen und dem Gerät eine andere Adresse geben.",
     "`ipconfig /release` und `/renew` – die Konfliktmeldung darf nicht wiederkommen."],
   quelle: "Network – Lernfassung (§ 9 ARP) · RFC 5227 (IPv4 Address Conflict Detection)"},

  /* ---------- lab.netz: Gleiches Netz? (Maske anwenden) ---------- */
  {id: "tr-netz-maske", titel: "Gleiches Netz oder nicht?", skill: "lab.netz", geraet: "host",
   art: "basis", minuten: 5, geruest: true, niveau: "E",
   beschreibung: "Zwei Rechner sollen sich ohne Router erreichen: 10.1.1.10/16 und 10.1.200.5/16. Du rechnest mit der Maske nach, ob beide in derselben Netz-ID liegen – nicht nach Augenmaß über das dritte Oktett.",
   tipp: "Nicht schätzen: mit der Maske für beide Adressen die Netz-ID ausrechnen und vergleichen.",
   schritte: ["Maske 255.255.0.0 = /16 notieren: Netzanteil sind die ersten zwei Oktette.",
     "Netz-ID bilden: beide Adressen ergeben 10.1.0.0.",
     "Weil die Netz-IDs gleich sind, liegt kein Router dazwischen – der Ping geht direkt.",
     "Gegenprobe mit /24: dort wären es zwei verschiedene Netze und ohne Router nicht erreichbar."],
   quelle: "Network – Lernfassung (§ 8 Subnetting) · 04-AP1-Netzwerk (Subnetting-Verfahren)"},

  /* ---------- lab.gateway: Standardgateway ---------- */
  {id: "tr-gateway-setzen", titel: "Standardgateway eintragen", skill: "lab.gateway", geraet: "alle",
   art: "basis", minuten: 5, geruest: true, niveau: "E",
   beschreibung: "Im eigenen Netz klappt jeder Ping, nach draußen nicht: Beim PC fehlt das Standardgateway. Der Router steht mit 192.168.1.1 im selben Netz und darf als Gateway eingetragen werden – eine Adresse aus einem fremden Netz wäre nicht direkt erreichbar.",
   tipp: "Das Gateway ist die Adresse des Routers im eigenen Netz. Es muss also im Netz aus eigener IP und Maske liegen.",
   schritte: ["`ipconfig` lesen: Steht hinter „Standardgateway“ ein Eintrag?",
     "Router-Adresse im eigenen Netz feststellen (192.168.1.1).",
     "Gateway eintragen und speichern.",
     "Gateway anpingen – eine Antwort zeigt, dass der Weg nach draußen offen ist."],
   quelle: "Network – Lernfassung (§ 0 Landkarte, § 9) · Netzwerk – Geschichten („Die Straße, in der Lappi wohnt“)"},

  {id: "tr-gateway-falsch", titel: "Gateway im falschen Netz", skill: "lab.gateway", geraet: "alle",
   art: "stoerung", minuten: 7, geruest: true, niveau: "AP1",
   beschreibung: "Ein PC hat 192.168.5.20/24, als Gateway ist aber 192.168.6.1 eingetragen. Ein Gateway muss im eigenen Netz liegen, sonst kann der PC es nicht per ARP erreichen; Windows warnt beim Speichern, und der Ping endet mit „Allgemeiner Fehler“.",
   tipp: "Ping zuerst das eingetragene Gateway. Rechne dann mit der eigenen Maske nach, ob diese Adresse überhaupt im eigenen Netz liegt.",
   schritte: ["Eigene Adresse und Maske mit `ipconfig` feststellen: Netz ist 192.168.5.0/24.",
     "Rechnerisch prüfen, ob 192.168.6.1 in 192.168.5.0/24 liegt – liegt es nicht.",
     "Die richtige Router-Adresse aus dem eigenen Netz ablesen oder erfragen.",
     "Gateway korrigieren und den Ping auf die Router-Adresse wiederholen."],
   quelle: "Network – Lernfassung (§ 8 Subnetting, § 9 Gateway) · 04-AP1-Netzwerk"},

  /* ---------- lab.arp: ARP: IP zu MAC auflösen ---------- */
  {id: "tr-arp-ablauf", titel: "Prüfung: ARP im eigenen Netz", skill: "lab.arp", geraet: "host",
   art: "pruefung", minuten: 7, geruest: false, niveau: "AP2",
   beschreibung: "Ohne Gerüst: Du zeigst am Modell, in welcher Reihenfolge ein erster Ping im eigenen Netz abläuft und warum ein Ziel außerhalb des Netzes nach einer anderen IP per ARP fragt. Bewertet wird die Begründung – Broadcast, Unicast und ARP-Cache müssen sitzen.",
   tipp: "",
   quelle: "Network – Lernfassung (§ 9 ARP Schritt für Schritt) · RFC 826"},

  /* ---------- lab.ping: Ping und Fehlermeldungen lesen ---------- */
  {id: "tr-ping-meldungen", titel: "Prüfung: Ping-Meldungen deuten", skill: "lab.ping", geraet: "alle",
   art: "pruefung", minuten: 6, geruest: false, niveau: "AP2",
   beschreibung: "Ohne Hilfe ordnest du drei Ausgaben zu: „.!!!!“ (erstes Paket verloren, weil ARP lief), „U.U.U“ (ein Router meldet, dass es keinen Weg gibt) und „Zeitüberschreitung“ (niemand hat geantwortet). Bewertet wird die Begründung, nicht der Schnellschuss.",
   tipp: "",
   quelle: "Cisco: Understanding the Ping and Traceroute Commands · Microsoft Learn: ping · Network – Lernfassung (§ 10 Werkzeugkasten)"},

  /* ---------- lab.switch: Switch: MAC-Tabelle und Fluten ---------- */
  {id: "tr-switch-mactabelle", titel: "MAC-Tabelle lesen", skill: "lab.switch", geraet: "switch",
   art: "basis", minuten: 6, geruest: true, niveau: "E",
   beschreibung: "Ein Switch lernt aus der Quell-MAC jedes ankommenden Frames, welcher Port hinter welcher Adresse liegt. Du liest `show mac address-table`, erklärst den Eintragstyp DYNAMIC und untersuchst, was mit einem Frame an eine unbekannte Ziel-MAC passiert: Er wird im VLAN geflutet.",
   tipp: "Gelernt wird aus der Absender-MAC, nicht aus der Ziel-MAC. Was macht der Switch, wenn er das Ziel nicht kennt?",
   schritte: ["`show mac address-table` aufrufen und die Spalten Vlan, Mac Address, Type, Ports benennen.",
     "Von PC-A auf PC-B pingen und die Tabelle erneut lesen: Welche Einträge sind neu?",
     "Am PC-C das Kabel ziehen und die Tabelle beobachten: Nach der Alterung verschwindet sein Eintrag.",
     "Einen Frame an eine unbekannte Ziel-MAC schicken und das Fluten im VLAN begründen."],
   quelle: "Network – Lernfassung · Cisco Catalyst Command Reference (show mac address-table)"},

  /* ---------- lab.subnetz: Adressplan und Subnetting ---------- */
  {id: "tr-subnetz-plan", titel: "Adressplan für vier Abteilungen", skill: "lab.subnetz", geraet: "host",
   art: "basis", minuten: 10, geruest: true, niveau: "E",
   beschreibung: "Aus 192.168.10.0/24 soll jede der vier Abteilungen ein eigenes Netz mit Platz für rund 50 Geräte bekommen. /26 liefert 62 Hostadressen je Netz und passt damit auf vier Netze; Netz-ID, erster und letzter Host sowie Broadcast rechnest du selbst aus.",
   tipp: "Blockgröße = 2 hoch (32 minus Präfix). Zähl die Blöcke ab und trag zu jedem Block Netz-, Host- und Broadcastadresse ein.",
   schritte: ["Blockgröße für /26 bestimmen: 2 hoch 6 = 64 Adressen.",
     "Netz-IDs bilden: .0, .64, .128, .192.",
     "Je Netz Broadcast eintragen (.63, .127, .191, .255) und die Hostspanne ablesen (.1–.62 und so weiter).",
     "Router-Interface je VLAN mit der ersten Hostadresse belegen (.1, .65, .129, .193).",
     "Gegenprobe: 4 × 62 = 248 Hostadressen reichen für die vier Abteilungen."],
   quelle: "04-AP1-Netzwerk · 07-Uebungen-Subnetting-Szenarien · Fragen – Subnetting"},

  {id: "tr-subnetz-pruefung", titel: "Prüfung: Subnetting ohne Hilfe", skill: "lab.subnetz", geraet: "host",
   art: "pruefung", minuten: 12, geruest: false, niveau: "AP2",
   beschreibung: "Ohne Gerüst: Zu 172.16.5.130/25, 10.0.0.50/27 und 192.168.1.70/26 nennst du Netz-ID, Broadcast und Hostanzahl und trägst die Werte in die Simulation ein. Ein falsches Oktett fällt sofort auf – nachrechnen statt raten.",
   tipp: "",
   quelle: "04-AP1-Netzwerk · 07-Uebungen-Subnetting-Szenarien · Fragen – Subnetting"},

  /* ---------- lab.dhcp: DHCP (DORA, Pool, Relay) ---------- */
  {id: "tr-dhcp-dora", titel: "DHCP-Pool und DORA", skill: "lab.dhcp", geraet: "alle",
   art: "basis", minuten: 7, geruest: true, niveau: "E",
   beschreibung: "Ein Server soll im Netz 192.168.1.0/24 Adressen von .100 bis .150 vergeben und Gateway .1 sowie DNS 198.51.100.53 mitliefern. Du legst den Pool an, lässt einen Client per DHCP anfragen und liest die vier Nachrichten Discover, Offer, Request, Ack in der richtigen Reihenfolge mit.",
   tipp: "Vier Nachrichten: zwei vom Client, zwei vom Server. Notier zu jeder, wer sie schickt und was sie anbietet.",
   schritte: ["Pool mit dem Bereich 192.168.1.100 bis 192.168.1.150 anlegen.",
     "Gateway 192.168.1.1 und DNS 198.51.100.53 als Optionen mitgeben.",
     "Am Client DHCP einschalten und die vier Nachrichten mitlesen.",
     "`ipconfig` prüfen: Adresse aus dem Pool, Lease-Zeit gesetzt, Gateway und DNS übernommen."],
   quelle: "Network – Lernfassung (§ 7 Besondere Adressen, § 9 DORA) · RFC 2131 · RFC 3927"},

  /* ---------- lab.dns: DNS-Namensauflösung ---------- */
  {id: "tr-dns-name", titel: "Ping auf die Adresse klappt, auf den Namen nicht", skill: "lab.dns", geraet: "host",
   art: "stoerung", minuten: 6, geruest: true, niveau: "AP1",
   beschreibung: "Der Ping auf 192.168.1.5 antwortet, `ping server.praxis.local` nicht, und `nslookup` meldet, der Name wurde nicht gefunden. Kabel, Maske und Gateway sind also in Ordnung – es fehlt der Eintrag im DNS-Server, oder der Client fragt den falschen Server.",
   tipp: "Trenne die zwei Fragen: Kennt der Client überhaupt einen DNS-Server – und kennt der Server den Namen?",
   schritte: ["`ipconfig /all` prüfen: Ist ein DNS-Server eingetragen und erreichbar?",
     "`nslookup server.praxis.local 192.168.1.5` – fragt den Server direkt; kennt er den Namen?",
     "Fehlt der Eintrag, am DNS-Server die Zuordnung Name → 192.168.1.5 anlegen.",
     "Erneut `nslookup` und `ping` auf den Namen: Beides muss jetzt antworten."],
   quelle: "Network – Lernfassung (§ 9 DNS) · RFC 1034 · RFC 1035"},

  /* ---------- lab.ports: Ports und Dienste (TCP/UDP) ---------- */
  {id: "tr-ports-dienst", titel: "Prüfung: Port und Dienst", skill: "lab.ports", geraet: "alle",
   art: "pruefung", minuten: 5, geruest: false, niveau: "AP2",
   beschreibung: "Ohne Hilfe: Der Ping zum Server geht, der Browser meldet „Verbindung abgelehnt“. Du benennst den Port (443 beziehungsweise 80), ordnest ihn TCP zu und erklärst, dass ein RST vom Server kommt, wenn dort kein Dienst lauscht – ein filterndes Gerät verwirft dagegen still.",
   tipp: "",
   quelle: "04-AP1-Netzwerk (Ports) · TCP – Lernfassung (§ 5: RST bei geschlossenem Port) · RFC 9293"},

  /* ---------- lab.tcp: TCP-Handshake ---------- */
  {id: "tr-tcp-handshake", titel: "TCP-Handshake beobachten", skill: "lab.tcp", geraet: "host",
   art: "basis", minuten: 5, geruest: true, niveau: "E",
   beschreibung: "Bevor Daten fließen, stimmen Client und Server im Drei-Wege-Handshake die Sequenznummern ab: SYN, SYN/ACK, ACK. Du öffnest eine Verbindung, liest die drei Schritte mit und prüfst den Unterschied zu einem geschlossenen Port, der mit RST antwortet.",
   tipp: "Drei Nachrichten vor den Daten: Wer fragt, wer bestätigt – und was passiert, wenn niemand zuhört?",
   schritte: ["Verbindung zum Webserver auf Port 443 aufbauen.",
     "Die drei Nachrichten SYN, SYN/ACK, ACK in der richtigen Reihenfolge notieren.",
     "Zweiten Versuch auf einen Port ohne Dienst starten (zum Beispiel 8080).",
     "Die RST-Antwort deuten: Der Port ist geschlossen, dort lauscht kein Dienst."],
   quelle: "TCP – Lernfassung · RFC 9293"},

  /* ---------- lab.cli: IOS-Konsole: Modi und Grundbefehle ---------- */
  {id: "tr-cli-modi", titel: "Die Modi der IOS-Konsole", skill: "lab.cli", geraet: "alle",
   art: "basis", minuten: 7, geruest: true, niveau: "E",
   beschreibung: "Auf einem Router gibst du erst `enable`, dann `configure terminal` ein und landest im Konfigurationsmodus. Dort funktionieren show-Befehle nur mit `do` davor – ohne `do` antwortet IOS „Invalid input“. Du läufst die Modi einmal bewusst durch und prüfst nach jedem Schritt den Prompt.",
   tipp: "Der Prompt verrät den Modus. Wo show nicht erlaubt ist, hilft ein kurzes Wort davor.",
   schritte: ["Von `Router>` mit `enable` nach `Router#`.",
     "Mit `configure terminal` nach `Router(config)#`.",
     "Mit `interface Gi0/0` nach `Router(config-if)#`.",
     "Dort `do show ip interface brief` eingeben – und einmal ohne `do`, um die Fehlermeldung zu sehen.",
     "Mit `exit` herausgehen und den Prompt prüfen."],
   quelle: "VLAN – Lernfassung · Cisco IOS Configuration Fundamentals Configuration Guide: Using the Command-Line Interface"},

  /* ---------- lab.speichern: running- und startup-config ---------- */
  {id: "tr-config-speichern", titel: "Konfiguration dauerhaft sichern", skill: "lab.speichern", geraet: "router",
   art: "basis", minuten: 4, geruest: true, niveau: "E",
   beschreibung: "Die running-config liegt im RAM und ist nach einem Neustart weg. Du änderst am Router eine Schnittstellen-Adresse, sicherst mit `copy running-config startup-config` ins NVRAM und prüfst nach einem reload, dass die Änderung noch da ist. Auf Switches liegen VLAN-Daten zusätzlich in flash:vlan.dat und überleben dort ein erase startup-config.",
   tipp: "Zwei Konfigurationen, zwei Speicher: die laufende und die gespeicherte. Welche überlebt den Neustart?",
   schritte: ["Am Router eine Adresse ändern und die running-config ansehen.",
     "`copy running-config startup-config` ausführen.",
     "Mit `show startup-config` gegenprüfen, dass der Eintrag dort steht.",
     "Neustart auslösen und nach dem Hochlauf prüfen, ob die Konfiguration noch da ist.",
     "Gegenprobe: Was passiert mit den VLAN-Daten eines Switches nach `erase startup-config`?"],
   quelle: "Netzwerk 29.09 · Cisco IOS Configuration Fundamentals Configuration Guide (Managing Configuration Files)"},

  /* ---------- lab.vlan: VLANs und Access-Ports ---------- */
  {id: "tr-vlan-anlegen", titel: "VLANs anlegen und Ports zuordnen", skill: "lab.vlan", geraet: "switch",
   art: "basis", minuten: 7, geruest: true, niveau: "E",
   beschreibung: "Am Switch SW1 sollen Verwaltung und Gäste getrennt werden: VLAN 10 „Verwaltung“ für Fa0/1 und Fa0/2, VLAN 20 „Gaeste“ für Fa0/11. Du legst beide VLANs in der VLAN-Datenbank an, setzt die Access-Ports und prüfst mit `show vlan brief`, dass die Ports wirklich zugeordnet sind.",
   tipp: "Erst das VLAN anlegen, dann den Port hineinsetzen – ein Port in einem nicht existierenden VLAN wird inaktiv.",
   schritte: ["`vlan 10` und `vlan 20` anlegen und Namen vergeben.",
     "Fa0/1 und Fa0/2 mit `switchport access vlan 10` in VLAN 10 setzen.",
     "Fa0/11 mit `switchport access vlan 20` in VLAN 20 setzen.",
     "`show vlan brief` prüfen: Stehen beide Ports im richtigen VLAN und sind sie aktiv?"],
   quelle: "VLAN – Lernfassung · VLAN – Visuelle Lernnotiz (§ 7 Zwischen VLANs routen) · IEEE 802.1Q"},

  {id: "tr-vlan-trennung", titel: "Zwei PCs am selben Switch erreichen sich nicht", skill: "lab.vlan", geraet: "switch",
   art: "stoerung", minuten: 8, geruest: true, niveau: "AP1",
   beschreibung: "Zwei PCs hängen am selben Switch, haben Adressen aus demselben Netz und erreichen sich trotzdem nicht. Meist ist die VLAN-Zuordnung der Grund: Ports in verschiedenen VLANs sind verschiedene Broadcast-Domänen, auch im selben Gehäuse. Ohne Router gibt es keinen Weg dazwischen.",
   tipp: "Schau nach, in welchem VLAN jeder Port steht. Zwischen zwei VLANs vermittelt niemand von selbst.",
   schritte: ["`show vlan brief` lesen: In welchem VLAN steht Fa0/1, in welchem Fa0/2?",
     "Prüfen: Haben beide PCs Adressen aus demselben Netz und dieselbe Maske?",
     "Entscheiden: beide Ports ins gleiche VLAN, oder Router-on-a-Stick einrichten.",
     "Nach der Änderung erneut pingen und mit `show mac address-table` prüfen, ob gelernt wird."],
   quelle: "VLAN – Lernfassung · VLAN – Visuelle Lernnotiz (§ 7 Zwischen VLANs routen) · IEEE 802.1Q"},

  /* ---------- lab.trunk: Trunk und 802.1Q ---------- */
  {id: "tr-trunk-erlauben", titel: "VLAN 20 fehlt auf dem Trunk", skill: "lab.trunk", geraet: "switch",
   art: "stoerung", minuten: 9, geruest: true, niveau: "AP1",
   beschreibung: "Die PCs in VLAN 20 kommen nicht über den Router, VLAN 10 läuft. `show interfaces trunk` zeigt unter „Vlans allowed on trunk“ nur 1 und 10 – das VLAN 20 fehlt in der Erlaubnisliste. Typische Falle: `switchport trunk allowed vlan 20` ersetzt die Liste, statt sie zu ergänzen.",
   tipp: "„allowed vlan“ ist eine Liste. Ersetzen oder ergänzen – das ist der ganze Unterschied.",
   schritte: ["`show interfaces trunk` lesen: Welche VLANs sind erlaubt, ist der Port überhaupt ein Trunk?",
     "Mit der VLAN-Datenbank vergleichen: Existiert VLAN 20 auf beiden Switches?",
     "`switchport trunk allowed vlan add 20` an beiden Enden setzen.",
     "Erneut prüfen und aus VLAN 20 zum Gateway pingen.",
     "Native VLAN an beiden Enden vergleichen – ungetaggte Frames landen sonst im falschen VLAN."],
   quelle: "VLAN – Lernfassung (§ 2 Befehle) · Cisco Catalyst Software Configuration Guide: Configuring VLAN Trunks · IEEE 802.1Q"},

  /* ---------- lab.rostick: Router-on-a-Stick ---------- */
  {id: "tr-rostick-subif", titel: "Router-on-a-Stick einrichten", skill: "lab.rostick", geraet: "alle",
   art: "basis", minuten: 9, geruest: true, niveau: "E",
   beschreibung: "Ein Router soll zwei VLANs verbinden und hängt mit einem einzigen Kabel am Trunk des Switches. Du legst je VLAN ein Subinterface an, ordnest ihm mit `encapsulation dot1Q <VLAN>` das Tag zu und gibst ihm dann die Gateway-Adresse – ohne dot1Q verweigert IOS die IP.",
   tipp: "Je VLAN ein Subinterface: erst das Tag zuordnen, dann die Adresse. Die Nummer hinter dem Punkt ist nur ein Name.",
   schritte: ["`interface Gi0/0.10` anlegen und `encapsulation dot1Q 10` setzen.",
     "192.168.10.1/24 als Gateway für VLAN 10 eintragen.",
     "Dasselbe für VLAN 20: `Gi0/0.20`, dot1Q 20, 192.168.20.1.",
     "Am Switch den Port zum Router als Trunk setzen und prüfen.",
     "Aus beiden VLANs das jeweilige Gateway anpingen und danach den Weg über den Router testen."],
   quelle: "VLAN – Visuelle Lernnotiz · VLAN – Lernfassung (§ 1 Korrektur 6)"},

  /* ---------- lab.acl: Access-Listen (ACL) ---------- */
  {id: "tr-acl-regeln", titel: "Gäste per ACL trennen", skill: "lab.acl", geraet: "router",
   art: "basis", minuten: 8, geruest: true, niveau: "E",
   beschreibung: "Das Gästenetz 192.168.30.0/24 darf nicht ins Verwaltungsnetz 192.168.10.0/24, alles andere bleibt erlaubt. Du baust die Regeln in der richtigen Reihenfolge – first match – und denkst an das unsichtbare „deny any“ am Ende jeder Liste.",
   tipp: "Spezielle Regel nach oben, allgemeine nach unten: gelesen wird von oben nach unten, der erste Treffer entscheidet.",
   schritte: ["Regel 1: `deny ip 192.168.30.0 0.0.0.255 192.168.10.0 0.0.0.255`.",
     "Regel 2: `permit ip any any` – sonst sperrt das implizite deny any den ganzen Rest.",
     "Die Liste an der richtigen Schnittstelle und Richtung anwenden (eingehend am Gäste-Subinterface).",
     "Vom Gast-PC ins Verwaltungsnetz pingen: muss scheitern.",
     "Vom Gast-PC ins Internet pingen: muss klappen."],
   quelle: "Cisco IOS Security Configuration Guide: IP Access Lists · Infrastruktur & Sicherheit – Visuelle Lernnotiz (Firewall: Reihenfolge der Regeln)"},

  {id: "tr-acl-reihenfolge", titel: "Prüfung: Reihenfolge in der ACL", skill: "lab.acl", geraet: "router",
   art: "pruefung", minuten: 9, geruest: false, niveau: "AP2",
   beschreibung: "Ohne Hilfe: Zwei Regeln stehen in der Reihenfolge „permit any“ vor „deny 192.168.30.0 0.0.0.255“. Du entscheidest, ob die Sperre greift, begründest es mit first match statt mit „die genauere Regel gewinnt“ und korrigierst die Liste durch Umsortieren.",
   tipp: "",
   quelle: "Cisco IOS Security Configuration Guide: IP Access Lists · Infrastruktur & Sicherheit – Visuelle Lernnotiz (Firewall: Reihenfolge der Regeln)"},

  /* ---------- lab.route: Statische Routen und Default-Route ---------- */
  {id: "tr-route-statisch", titel: "Statische Route und Default-Route", skill: "lab.route", geraet: "router",
   art: "basis", minuten: 8, geruest: true, niveau: "E",
   beschreibung: "Ein Router kennt nur seine direkt angeschlossenen Netze. Du bringst ihm bei, dass 10.2.0.0/16 über 10.255.0.2 erreichbar ist (`ip route 10.2.0.0 255.255.0.0 10.255.0.2`), und schickst alles andere mit der Default-Route 0.0.0.0/0 zum Provider.",
   tipp: "Eine Route besteht aus Zielnetz, Maske und nächstem Router. Die Default-Route ist die mit der kürzesten Maske.",
   schritte: ["`show ip route` lesen: Welche Netze kennt der Router direkt (C), welche fehlen?",
     "Statische Route für 10.2.0.0/16 mit Next Hop 10.255.0.2 eintragen.",
     "Default-Route `ip route 0.0.0.0 0.0.0.0 203.0.113.1` ergänzen.",
     "Erneut `show ip route`: Stehen beide Routen mit Verwaltungsdistanz 1 drin?",
     "Ein Ziel in 10.2.0.0/16 anpingen – und danach ein Ziel, für das nur die Default-Route greift."],
   quelle: "Cisco IOS IP Routing: Static Routing Configuration Guide · Network – Lernfassung (§ 0: die Antwort braucht ebenfalls einen Weg)"},

  {id: "tr-route-rueckweg", titel: "Hinweg klappt, Rückweg fehlt", skill: "lab.route", geraet: "router",
   art: "stoerung", minuten: 9, geruest: true, niveau: "AP1",
   beschreibung: "Ein Ping von A nach B läuft in die Zeitüberschreitung, obwohl der Zielrouter das Paket bekommt. Meist fehlt die Route zurück: Der Zielrouter weiß nicht, wohin mit der Antwort, und verwirft sie still. Du prüfst beide Richtungen getrennt.",
   tipp: "Ein Ping braucht zwei Wege. Prüf die Routingtabelle auf beiden Seiten einzeln.",
   schritte: ["Am Absender `tracert` laufen lassen: Wo enden die Antworten?",
     "Am Zielrouter `show ip route` prüfen: Gibt es eine Route zurück zum Absendernetz?",
     "Fehlende Rückroute eintragen, Next Hop zeigt zum nächsten Router auf dem Rückweg.",
     "Erneut pingen – ohne Zeitüberschreitung.",
     "Beide Routen mit `show ip route` dokumentieren: Hinweg und Rückweg."],
   quelle: "Network – Lernfassung (§ 0: die Antwort braucht ebenfalls einen Weg) · Cisco IOS IP Routing: Static Routing Configuration Guide · RFC 792 (Destination Unreachable) · Fragen – Netzwerke planen (Routing)"},

  /* ---------- lab.ttl: TTL und Traceroute ---------- */
  {id: "tr-ttl-traceroute", titel: "Prüfung: TTL und Wegverfolgung", skill: "lab.ttl", geraet: "router",
   art: "pruefung", minuten: 6, geruest: false, niveau: "AP2",
   beschreibung: "Ohne Hilfe: Du erklärst, warum jeder Router die TTL um 1 senkt, was bei 0 passiert (ICMP Time exceeded) und wie traceroute daraus Hop für Hop den Weg aufbaut. Auf dem Router erkennst du eine Ausgabe mit abwechselnd 10.1.255.1 und 10.1.255.2 als Routing-Schleife.",
   tipp: "",
   quelle: "Network – Lernfassung (§ 5, § 10 tracert) · RFC 791 · RFC 792 (Time Exceeded)"},

  /* ---------- lab.nat: NAT und PAT ---------- */
  {id: "tr-nat-pat", titel: "PAT fürs ganze LAN", skill: "lab.nat", geraet: "router",
   art: "basis", minuten: 8, geruest: true, niveau: "E",
   beschreibung: "Das LAN nutzt 192.168.1.0/24 (RFC 1918) und soll mit der einen öffentlichen Adresse 203.0.113.2 ins Internet. Du markierst die Schnittstellen mit `ip nat inside` und `ip nat outside` und lässt PAT (Overload) über eine ACL die internen Adressen übersetzen.",
   tipp: "Wo liegen die privaten Adressen, wo die öffentliche? Und wodurch unterscheidet der Router mehrere Verbindungen über dieselbe Adresse?",
   schritte: ["`ip nat inside` am LAN-Interface und `ip nat outside` am WAN-Interface setzen.",
     "ACL 1 mit `permit 192.168.1.0 0.0.0.255` anlegen.",
     "`ip nat inside source list 1 interface Gi0/1 overload` konfigurieren.",
     "Vom PC ins Internet pingen und mit `show ip nat translations` die Übersetzung ansehen.",
     "Prüfen: Viele interne Adressen teilen sich eine öffentliche und werden über Portnummern unterschieden."],
   quelle: "Network – Lernfassung (§ 7, Korrektur 14) · RFC 1918 · RFC 3022 · Cisco IOS NAT Configuration Guide"},

  /* ---------- lab.portfwd: Port-Weiterleitung ---------- */
  {id: "tr-portfwd-dmz", titel: "Prüfung: Port-Weiterleitung in die DMZ", skill: "lab.portfwd", geraet: "firewall",
   art: "pruefung", minuten: 7, geruest: false, niveau: "AP2",
   beschreibung: "Ohne Hilfe: Der Webshop in der DMZ (172.16.0.10) soll von außen über TCP 443 erreichbar sein. Du entscheidest, welche zwei Dinge nötig sind – die Weiterleitung auf 172.16.0.10:443 und eine Firewall-Regel außen → DMZ – und begründest, warum NAT allein nicht reicht.",
   tipp: "",
   quelle: "05-AP2-Infrastruktur-Sicherheit · Cisco IOS NAT Configuration Guide (Static NAT with port) · RFC 3022"},

  /* ---------- lab.fw: Firewall-Regeln und Zonen ---------- */
  {id: "tr-fw-regeln", titel: "Firewall-Regeln und Zonen", skill: "lab.fw", geraet: "firewall",
   art: "basis", minuten: 7, geruest: true, niveau: "E",
   beschreibung: "Eine Firewall arbeitet nach „was nicht erlaubt ist, ist verboten“, und am Ende jedes Regelwerks steht implizit ein Verwerfen. Du baust Regeln für innen → außen und außen → DMZ, prüfst die Reihenfolge (first match) und erklärst, warum Antworten bei einer zustandsbehafteten Firewall keiner eigenen Regel bedürfen.",
   tipp: "Am Ende jedes Regelwerks steht ein Verwerfen. Formuliere zuerst, was erlaubt sein soll, und prüf dann die Reihenfolge.",
   schritte: ["Zonen festlegen: innen, DMZ, außen.",
     "Regel „innen → außen: TCP 443 erlauben“ anlegen.",
     "Regel „außen → DMZ: TCP 443 erlauben“ mit Ziel 172.16.0.10 anlegen.",
     "Regel „DMZ → innen: verwerfen“ anlegen und prüfen, dass keine allgemeine Erlaubnis sie überstimmt.",
     "Verbindungen testen und die Regelzähler beobachten: Welche Regel hat gegriffen?"],
   quelle: "05-AP2-Infrastruktur-Sicherheit (Firewall-Grundregeln) · Infrastruktur & Sicherheit – Visuelle Lernnotiz (Firewall)"},

  /* ---------- lab.dmz: DMZ ---------- */
  {id: "tr-dmz-aufbau", titel: "Webshop in die DMZ stellen", skill: "lab.dmz", geraet: "firewall",
   art: "basis", minuten: 8, geruest: true, niveau: "E",
   beschreibung: "Ein Webshop muss von außen erreichbar sein – aber er gehört nicht ins interne LAN. Du baust die DMZ als eigene Zone zwischen außen und innen, stellst den Server dort ab und sperrst den Weg DMZ → innen, damit ein übernommener Server nicht bis zum Dateiserver kommt.",
   tipp: "Von außen erreichbar heißt nicht vertrauenswürdig: Der Server gehört in eine eigene Zone mit möglichst wenig Zugang nach innen.",
   schritte: ["Netz für die DMZ wählen, zum Beispiel 172.16.0.0/24.",
     "Webshop-Server in die DMZ stellen und von außen per Port-Weiterleitung erreichbar machen.",
     "Regel DMZ → innen verwerfen; Ausnahmen nur, wenn ein Dienst sie wirklich braucht.",
     "Aus dem LAN auf den Webshop zugreifen und den Weg umgekehrt testen.",
     "Prüfen: Vom DMZ-Server darf kein Ping ins Verwaltungsnetz gehen."],
   quelle: "05-AP2-Infrastruktur-Sicherheit · Infrastruktur & Sicherheit – Visuelle Lernnotiz (Firmennetz mit DMZ und VLANs)"},

  /* ---------- lab.portsec: Port-Security ---------- */
  {id: "tr-portsec-dose", titel: "Fremdes Gerät an der Netzwerkdose", skill: "lab.portsec", geraet: null,
   art: "basis", minuten: 7, geruest: true, niveau: "E",
   beschreibung: "In einem Besprechungsraum hängt ein Switchport, an dem jeder sein Notebook anstecken kann. Mit Port-Security erlaubst du genau eine MAC-Adresse; bei einem Verstoß geht der Port in den Zustand err-disabled. Zurück kommt er nur mit `shutdown` und `no shutdown` – und erst, nachdem die Ursache behoben ist.",
   tipp: "Port-Security zählt MAC-Adressen. Was passiert bei einem Verstoß – und wie kommt der Port wieder zurück?",
   schritte: ["Am Port Fa0/10 `switchport port-security` einschalten.",
     "`switchport port-security maximum 1` setzen und eine erlaubte MAC festlegen.",
     "`switchport port-security violation shutdown` konfigurieren.",
     "Ein zweites Gerät anstecken und beobachten: Der Port geht in err-disabled.",
     "Ursache beheben, dann `shutdown` und `no shutdown` – der Port muss wieder up/up sein."],
   quelle: "Cisco Catalyst Software Configuration Guide: Configuring Port Security · Network – Lernfassung (§ 9 MAC Flooding, Abwehr Port Security)"},

  /* ---------- lab.stp: Schleifen und Spanning Tree ---------- */
  {id: "tr-stp-schleife", titel: "Broadcast-Sturm durch Doppelverbindung", skill: "lab.stp", geraet: null,
   art: "stoerung", minuten: 9, geruest: true, niveau: "AP1",
   beschreibung: "Zwei Switches sind versehentlich doppelt verbunden, und das Netz wird plötzlich sehr langsam: Broadcasts kreisen zwischen beiden Geräten und vervielfachen sich. Du erkennst das an hoher Last ohne Nutzverkehr und behebst es, indem du die zweite Leitung entfernst oder Spanning Tree arbeiten lässt.",
   tipp: "Zwei Wege zwischen zwei Switches sind einer zu viel, solange niemand Frames blockiert. Welches Protokoll macht das?",
   schritte: ["Die zweite Verbindung zwischen den Switches suchen (Kabelplan oder Anzeige im Modell).",
     "Beobachten: Broadcasts laufen über beide Wege, die Last steigt ohne echten Verkehr.",
     "Zweite Leitung entfernen – das Netz beruhigt sich sofort.",
     "Spanning Tree einschalten und dieselbe Doppelverbindung wieder herstellen: Ein Port geht in Blocking, kein Sturm.",
     "Mit `show spanning-tree` den blockierten Port benennen."],
   quelle: "Fragen – Netzwerke planen (Wozu STP?) · IEEE 802.1D"},

  /* ---------- lab.storage: NAS, SAN und Speichernetze ---------- */
  {id: "tr-storage-nas-san", titel: "NAS oder SAN?", skill: "lab.storage", geraet: null,
   art: "basis", minuten: 10, geruest: true, niveau: "E",
   beschreibung: "Ein NAS stellt Dateien über das LAN bereit (SMB auf TCP 445, NFS auf 2049), ein SAN stellt Blockspeicher bereit, den ein Server wie eine eigene Platte nutzt (iSCSI auf 3260). Du ordnest beide Aufgaben zu und begründest, warum ein Dateiserver für die Abteilung ein NAS ist und eine Datenbank Blockspeicher braucht.",
   tipp: "Frag zuerst: Wer greift zu – Menschen auf Dateien oder ein Server auf Blöcke?",
   schritte: ["Anforderungen sammeln: Dateien für Menschen oder ein Blockgerät für einen Server?",
     "NAS nennen und den Dienst zuordnen: SMB 445 beziehungsweise NFS 2049.",
     "SAN nennen und den Transport zuordnen: iSCSI 3260 im eigenen Speichernetz.",
     "Im Modell ein NAS als Dateiserver aufstellen und eine Freigabe nutzen.",
     "Gegenprobe: Warum ein NAS für eine Datenbank ungeeignet ist – Dateizugriff mit Sperren statt Blockzugriff."],
   quelle: "Storage-Konzeptatlas · IANA Port Number Registry (445, 2049, 3260)"}
];
