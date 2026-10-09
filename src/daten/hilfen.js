"use strict";
/* ---------- Daten: Terminal-Hilfe (Vertrag „Hilfestellung – Stufen und Schnittstellen" § 4) ----------
   DATEN.hilfen.VORSCHLAEGE  Vorschläge für den Streifen unter dem Schirm. `bereich` ist IMMER eine id aus
                            Spiel.LEITER (link · vlan · ip · gateway · route · dienst), damit Leiter und
                            Vorschlag dieselbe Sprache sprechen. `befehl` ist so, wie er im Terminal stehen
                            soll – vollständig und ausführbar, damit ein Azubi ihn anklicken und mit Enter
                            ausführen kann. `syntax` ist das Muster zum Lernen (mit <Platzhaltern>).
                            `art: "pruefen"` ändert NIE eine Konfiguration (das prüft
                            tests/spiel-hilfe-vorschlaege.test.js in der echten CLI nach).
                            Zwei Zusatzfelder (optional, beide in § 4 nicht genannt):
                            `nurTyp`  – nur für diese Modell-Gerätetypen (Modell.TYPEN), weil z. B.
                                        „show vlan brief" nur ein Switch kennt.
                            `vorrang` – kleinere Zahl zuerst (Standard 0); „enable" steht damit vor allem
                                        anderen, weil ohne den privilegierten Modus nichts weitergeht.
   DATEN.hilfen.GERUEST      „Was geht hier?" – Text je Geräteart und CLI-Modus, KEIN Befehl.
                            Erste Zeile = Kurzfassung (für azubi-plus), ganze Zeilen = ausführlich (azubi).
   DATEN.hilfen.SYNTAX       Syntax-Brücke: „ich will X" → „so schreibt man das". `erkennt` ist ein
                            regulärer Ausdruck (als Zeichenkette) auf die getippte Zeile.
   Gelesen wird das NUR über Spiel.hilfe.passend/geruest/leiter/syntaxBruecke (Vertrag § 4), nie direkt
   aus der Oberfläche. Befehle sind gegen die echten Befehlsbäume geprüft (src/cli/ios-befehle.js,
   host-windows.js, host-linux.js) – kein geratener Befehl. */
DATEN.hilfen = {
  VORSCHLAEGE: [
    /* ---------------- Link: Steckt das Kabel, ist der Port an? ---------------- */
    {id: "link-enable", bereich: "link", skills: ["lab.cli"], vorrang: -1,
     befehl: "enable", syntax: "enable",
     erklaerung: "In den privilegierten Modus wechseln (der Prompt endet dann auf #) – fast alle Prüfbefehle gehen erst dort.",
     geraet: "alle", modus: ["user", "fwUser"], ebene: 1, art: "pruefen"},
    {id: "link-ios-brief", bereich: "link", skills: ["lab.link", "lab.ip"],
     befehl: "show ip interface brief", syntax: "show ip interface brief",
     erklaerung: "Jede Schnittstelle mit Adresse, Status und Protokoll – der erste Blick, ob der Link überhaupt steht.",
     geraet: "ios", modus: ["user", "priv"], ebene: 1, art: "pruefen"},
    {id: "link-switch-mac", bereich: "link", skills: ["lab.switch", "lab.link"], nurTyp: ["switch"],
     befehl: "show mac address-table", syntax: "show mac address-table",
     erklaerung: "Der Switch zeigt, an welchem Port er welche MAC-Adresse gelernt hat – kommt dort ein Frame an?",
     geraet: "ios", modus: ["user", "priv"], ebene: 1, art: "pruefen"},
    {id: "link-win-ipconfig", bereich: "link", skills: ["lab.link", "lab.ip"],
     befehl: "ipconfig", syntax: "ipconfig",
     erklaerung: "Zeigt Adresse, Maske und Gateway dieses Rechners – steht dort überhaupt eine Adresse?",
     geraet: "host-windows", modus: [], ebene: 1, art: "pruefen"},
    {id: "link-linux-ip-a", bereich: "link", skills: ["lab.link", "lab.ip"],
     befehl: "ip a", syntax: "ip a",
     erklaerung: "Zeigt jede Schnittstelle des Servers mit Adresse und Zustand (UP oder DOWN).",
     geraet: "host-linux", modus: [], ebene: 1, art: "pruefen"},

    /* ---------------- VLAN: gleiches VLAN, Trunk lässt es durch ---------------- */
    {id: "vlan-show-brief", bereich: "vlan", skills: ["lab.vlan"], nurTyp: ["switch"],
     befehl: "show vlan brief", syntax: "show vlan brief",
     erklaerung: "Welcher Port liegt in welchem VLAN? Ohne diese Liste rät man beim Trunk.",
     geraet: "ios", modus: ["user", "priv"], ebene: 1, art: "pruefen"},
    {id: "vlan-trunk-zeigen", bereich: "vlan", skills: ["lab.trunk"], nurTyp: ["switch"],
     befehl: "show interfaces trunk", syntax: "show interfaces trunk",
     erklaerung: "Trunk-Ports mit erlaubten VLANs und Native VLAN – lässt der Trunk dein VLAN durch?",
     geraet: "ios", modus: ["user", "priv"], ebene: 1, art: "pruefen"},
    {id: "vlan-access-setzen", bereich: "vlan", skills: ["lab.vlan"], nurTyp: ["switch"],
     befehl: "switchport access vlan 10", syntax: "switchport access vlan <VLAN>",
     erklaerung: "Ordnet den gewählten Port dem VLAN 10 zu – die Zahl an das eigene VLAN anpassen.",
     geraet: "ios", modus: ["if", "range"], ebene: 3, art: "aendern"},
    {id: "vlan-trunk-setzen", bereich: "vlan", skills: ["lab.trunk"], nurTyp: ["switch"],
     befehl: "switchport mode trunk", syntax: "switchport mode trunk",
     erklaerung: "Macht den Port zum Trunk, damit mehrere VLANs über eine Leitung passen.",
     geraet: "ios", modus: ["if", "range"], ebene: 3, art: "aendern"},

    /* ---------------- IP und Maske ---------------- */
    {id: "ip-win-all", bereich: "ip", skills: ["lab.ip", "lab.dns"],
     befehl: "ipconfig /all", syntax: "ipconfig /all",
     erklaerung: "Adresse, Maske, Gateway, DNS und MAC – alles, was dieser Rechner über sein Netz weiß.",
     geraet: "host-windows", modus: [], ebene: 1, art: "pruefen"},
    {id: "ip-linux-route", bereich: "ip", skills: ["lab.ip", "lab.gateway"],
     befehl: "ip r", syntax: "ip r",
     erklaerung: "Die Routentabelle des Servers – die Zeile „default via …\" ist sein Gateway.",
     geraet: "host-linux", modus: [], ebene: 1, art: "pruefen"},
    {id: "ip-ios-setzen", bereich: "ip", skills: ["lab.ip"], nurTyp: ["router"],
     befehl: "ip address 192.168.10.1 255.255.255.0", syntax: "ip address <IP> <Maske>",
     erklaerung: "Adresse und Maske auf die gewählte Router-Schnittstelle – physischer Port oder Subinterface.",
     geraet: "ios", modus: ["if", "subif"], ebene: 3, art: "aendern"},
    {id: "ip-win-setzen", bereich: "ip", skills: ["lab.ip"],
     befehl: "netsh interface ip set address \"Ethernet\" static 192.168.10.10 255.255.255.0 192.168.10.1",
     syntax: "netsh interface ip set address \"Ethernet\" static <IP> <Maske> <Gateway>",
     erklaerung: "Setzt Adresse, Maske und Gateway von Hand – ohne DHCP.",
     geraet: "host-windows", modus: [], ebene: 3, art: "aendern"},
    {id: "ip-linux-setzen", bereich: "ip", skills: ["lab.ip"],
     befehl: "sudo ip addr add 192.168.10.10/24 dev eth0", syntax: "sudo ip addr add <IP>/<Präfix> dev eth0",
     erklaerung: "Gibt eth0 eine feste Adresse – „sudo ip addr flush dev eth0\" nimmt sie wieder weg.",
     geraet: "host-linux", modus: [], ebene: 3, art: "aendern"},

    /* ---------------- Gateway ---------------- */
    {id: "gateway-win-ping", bereich: "gateway", skills: ["lab.gateway", "lab.ping"],
     befehl: "ping 192.168.10.1", syntax: "ping <Gateway>",
     erklaerung: "Antwortet das Standardgateway? Erst wenn das geht, lohnt der Blick weiter ins Netz.",
     geraet: "host-windows", modus: [], ebene: 1, art: "pruefen"},
    {id: "gateway-linux-ping", bereich: "gateway", skills: ["lab.gateway", "lab.ping"],
     befehl: "ping -c 4 192.168.10.1", syntax: "ping -c 4 <Gateway>",
     erklaerung: "Vier Pakete zum Gateway – kommt eine Antwort, stimmen Link und Adresse.",
     geraet: "host-linux", modus: [], ebene: 1, art: "pruefen"},
    {id: "gateway-win-route", bereich: "gateway", skills: ["lab.gateway", "lab.route"],
     befehl: "route print", syntax: "route print",
     erklaerung: "Die Routentabelle des PCs: Steht dort 0.0.0.0 mit dem richtigen Gateway?",
     geraet: "host-windows", modus: [], ebene: 1, art: "pruefen"},
    {id: "gateway-switch-default", bereich: "gateway", skills: ["lab.gateway"], nurTyp: ["switch"],
     befehl: "ip default-gateway 192.168.10.1", syntax: "ip default-gateway <Gateway>",
     erklaerung: "Der Verwaltungszugang des Switch braucht ein Gateway, sonst antwortet er nur im eigenen Netz.",
     geraet: "ios", modus: ["config"], ebene: 3, art: "aendern"},

    /* ---------------- Route ---------------- */
    {id: "route-ios-zeigen", bereich: "route", skills: ["lab.route"],
     befehl: "show ip route", syntax: "show ip route",
     erklaerung: "Kennt der Router das Zielnetz? C = direkt verbunden, S = statisch, L = eigene Adresse.",
     geraet: "ios", modus: ["user", "priv"], ebene: 1, art: "pruefen"},
    {id: "route-ios-statisch", bereich: "route", skills: ["lab.route"], nurTyp: ["router"],
     befehl: "ip route 192.168.20.0 255.255.255.0 192.168.10.2",
     syntax: "ip route <Netz> <Maske> <Next-Hop>",
     erklaerung: "Eine statische Route zum Zielnetz – der Rückweg braucht sie auf der anderen Seite auch.",
     geraet: "ios", modus: ["config"], ebene: 3, art: "aendern"},
    {id: "route-win-tracert", bereich: "route", skills: ["lab.ttl", "lab.route"],
     befehl: "tracert 192.168.20.10", syntax: "tracert <Ziel>",
     erklaerung: "Zeigt Router für Router, wo der Weg endet – dort fehlt meist die Route.",
     geraet: "host-windows", modus: [], ebene: 1, art: "pruefen"},
    {id: "route-linux-traceroute", bereich: "route", skills: ["lab.ttl", "lab.route"],
     befehl: "traceroute 192.168.20.10", syntax: "traceroute <Ziel>",
     erklaerung: "Jede Zeile ist ein Router auf dem Weg; Sternchen heißen: hier kommt nichts zurück.",
     geraet: "host-linux", modus: [], ebene: 1, art: "pruefen"},

    /* ---------------- ACL und Dienst ---------------- */
    {id: "dienst-ios-run", bereich: "dienst", skills: ["lab.acl", "lab.nat", "lab.speichern"],
     befehl: "show running-config", syntax: "show running-config",
     erklaerung: "Die laufende Konfiguration: access-list, ip access-group, ip nat inside/outside – und was noch nicht gesichert ist.",
     geraet: "ios", modus: ["priv"], ebene: 1, art: "pruefen"},
    {id: "dienst-ios-acl", bereich: "dienst", skills: ["lab.acl"], nurTyp: ["router"],
     befehl: "show access-lists", syntax: "show access-lists",
     erklaerung: "Welche Regel trifft das Paket zuerst? Denk an das unsichtbare „deny any\" am Listenende.",
     geraet: "ios", modus: ["priv"], ebene: 1, art: "pruefen"},
    {id: "dienst-win-nslookup", bereich: "dienst", skills: ["lab.dns"],
     befehl: "nslookup server.labor", syntax: "nslookup <Name>",
     erklaerung: "Fragt den DNS-Server nach dem Namen – kommt die richtige Adresse zurück?",
     geraet: "host-windows", modus: [], ebene: 1, art: "pruefen"},
    {id: "dienst-win-telnet", bereich: "dienst", skills: ["lab.ports"],
     befehl: "telnet 192.168.10.20 80", syntax: "telnet <Host> <Port>",
     erklaerung: "Prüft, ob auf dem Ziel wirklich ein Dienst auf diesem Port lauscht.",
     geraet: "host-windows", modus: [], ebene: 1, art: "pruefen"},
    {id: "dienst-linux-ss", bereich: "dienst", skills: ["lab.ports"],
     befehl: "ss -tulpn", syntax: "ss -tulpn",
     erklaerung: "Welche Dienste lauschen auf diesem Server – und auf welchem Port?",
     geraet: "host-linux", modus: [], ebene: 1, art: "pruefen"},
    {id: "dienst-linux-systemctl", bereich: "dienst", skills: ["lab.ports"],
     befehl: "systemctl status ssh", syntax: "systemctl status <Dienst>",
     erklaerung: "Läuft der Dienst auf dem Zielgerät überhaupt – und seit wann?",
     geraet: "host-linux", modus: [], ebene: 1, art: "pruefen"},
    {id: "dienst-fw-run", bereich: "dienst", skills: ["lab.fw", "lab.dmz"],
     befehl: "show running-config", syntax: "show running-config",
     erklaerung: "Regeln, Zonen und NAT der Firewall: Die erste passende Regel gewinnt.",
     geraet: "fw", modus: ["fwPriv"], ebene: 1, art: "pruefen"},

    /* ================= Ebene 2 (task-8, 09.10.2026): „genauer nachsehen, ohne etwas zu ändern" =================
       Der Vertrag (§ 4) kennt drei Ebenen: 1 = harmlos ansehen, 3 = ändert etwas. Die mittlere war bis heute
       0-mal belegt – die Leiter sprang von „ansehen" direkt zu „ändern" (Entwurf – Inhaltslücken § 3).
       Ebene 2 ist der prüfende Schritt dazwischen (Cache, Lease, Status, Verbindungsaufbau): Er liest tiefer
       oder sendet eine Anfrage, ändert aber NIE eine Konfiguration – deshalb tragen alle Ebene-2-Einträge
       `art: "pruefen"`. Sichtbar wird die Ebene in src/ui/hilfe.js („· ansehen" / „· genauer nachsehen" / „· ändern").
       Hier stehen außerdem die zehn Fertigkeiten, für die es bis heute keinen einzigen Vorschlag gab
       (lab.netz · lab.arp · lab.subnetz · lab.dhcp · lab.tcp · lab.rostick · lab.portfwd · lab.portsec ·
       lab.stp · lab.storage) und zwei zusätzliche Sprossen für die Firewall, die nur eine hatte.
       Jeder Befehl ist in src/cli/ios-befehle.js, src/cli/host-windows.js oder src/cli/host-linux.js belegt.

       NACHTRAG task-28 (09.10.2026), zwei Regeln aus der Gegenprüfung – sie gelten für ALLE Einträge oben:
       1. KEIN Befehl darf auf demselben Gerät zweimal im Katalog stehen. `passend` filtert den Verlauf über
          den Befehlstext (src/spiel/hilfe.js) – ein Zwilling mit demselben Befehl ist damit entweder vom
          früher sortierten Eintrag verdeckt oder mit ihm zusammen gefiltert: er erscheint NIE. Vier
          Ebene-2-Einträge waren so unsichtbar (ip-ios-subif, ip-linux-nas, dienst-fw-zonen,
          link-switch-schleife). Sie tragen jetzt je einen eigenen Befehl – dieselbe Anzeige, andere Frage
          gibt es nicht mehr, und `passend` wirft doppelte Befehle zusätzlich selbst heraus.
       2. KEIN Befehl darf auf einem Gerät angeboten werden, das ihn ablehnt: `nurTyp` richtig setzen
          (ip-ios-setzen galt am Switch, dort gibt es keine L3-Subinterfaces → nurTyp router). */

    /* ---- IP und Maske: Wer liegt im eigenen Netz, welche Adresse hat das Gerät? ---- */
    {id: "ip-win-arp", bereich: "ip", skills: ["lab.arp", "lab.netz"],
     befehl: "arp -a", syntax: "arp -a",
     erklaerung: "Der ARP-Cache des PCs: Hier stehen nur Nachbarn aus dem eigenen Netz – fremde Ziele werden nie per ARP gesucht.",
     geraet: "host-windows", modus: [], ebene: 2, art: "pruefen"},
    {id: "ip-ios-arp", bereich: "ip", skills: ["lab.arp", "lab.netz"],
     befehl: "show ip arp", syntax: "show ip arp",
     erklaerung: "Die ARP-Tabelle des Geräts: Welche Adresse im eigenen Netz wurde schon aufgelöst – und über welche Schnittstelle?",
     geraet: "ios", modus: ["user", "priv"], ebene: 2, art: "pruefen"},
    {id: "ip-win-maske", bereich: "ip", skills: ["lab.subnetz", "lab.netz"],
     befehl: "netsh interface ip show config", syntax: "netsh interface ip show config",
     erklaerung: "Zeigt die Maske als Präfix und in Punktschreibweise – die Maske, mit der dieser PC rechnet.",
     geraet: "host-windows", modus: [], ebene: 2, art: "pruefen"},
    {id: "ip-ios-dhcp-binding", bereich: "ip", skills: ["lab.dhcp"], nurTyp: ["router"],
     befehl: "show ip dhcp binding", syntax: "show ip dhcp binding",
     erklaerung: "Welche Adresse hat der Router schon vergeben, an welche MAC und bis wann? Eine leere Liste heißt: Es hat noch kein Client gefragt.",
     geraet: "ios", modus: ["priv"], ebene: 2, art: "pruefen"},
    {id: "ip-ios-dhcp-pool", bereich: "ip", skills: ["lab.dhcp"], nurTyp: ["router"],
     befehl: "show ip dhcp pool", syntax: "show ip dhcp pool",
     erklaerung: "Zeigt Netz, Gateway und Auslastung des Pools – sind noch freie Adressen übrig, oder ist der Pool erschöpft?",
     geraet: "ios", modus: ["priv"], ebene: 2, art: "pruefen"},
    {id: "ip-ios-subif", bereich: "ip", skills: ["lab.rostick"], nurTyp: ["router"],
     befehl: "show interfaces", syntax: "show interfaces",
     erklaerung: "Schnittstellen im Detail: Jedes Subinterface zeigt „Encapsulation 802.1Q, Vlan ID“ und seine Adresse.",
     geraet: "ios", modus: ["user", "priv"], ebene: 2, art: "pruefen"},
    {id: "ip-fw-schnittstellen", bereich: "ip", skills: ["lab.fw", "lab.dmz", "lab.portfwd"],
     befehl: "show ip interface brief", syntax: "show ip interface brief",
     erklaerung: "Die Schnittstellen der Firewall: Steht jede Zone (innen, außen, DMZ) auf up? Ein Interface down sperrt diese Seite.",
     geraet: "fw", modus: ["fwUser", "fwPriv"], ebene: 2, art: "pruefen"},

    /* ---- VLAN: Trägt der Port zum Router die VLANs der Subinterfaces? ---- */
    {id: "vlan-switch-rostick", bereich: "vlan", skills: ["lab.rostick", "lab.trunk"], nurTyp: ["switch"],
     befehl: "show interfaces status", syntax: "show interfaces status",
     erklaerung: "Die Spalte „Vlan“ zeigt am Port zum Router „trunk“ – nur so trägt er die VLANs der Subinterfaces.",
     geraet: "ios", modus: ["user", "priv"], ebene: 2, art: "pruefen"},

    /* ---- Route: der Weg aus der Firewall heraus ---- */
    {id: "route-fw-tabelle", bereich: "route", skills: ["lab.fw", "lab.dmz"],
     befehl: "show ip route", syntax: "show ip route",
     erklaerung: "Die Routentabelle der Firewall: Kennt sie das Netz hinter sich und den Weg nach außen – und über welche Schnittstelle?",
     geraet: "fw", modus: ["fwUser", "fwPriv"], ebene: 2, art: "pruefen"},

    /* ---- ACL und Dienst: NAT, TCP-Aufbau, Dateidienst ---- */
    {id: "dienst-ios-nat", bereich: "dienst", skills: ["lab.portfwd", "lab.nat"], nurTyp: ["router"],
     befehl: "show ip nat translations", syntax: "show ip nat translations",
     erklaerung: "Welche innere Adresse wurde nach außen übersetzt? Eine Port-Weiterleitung steht hier als feste Regel mit Protokoll und Port.",
     geraet: "ios", modus: ["priv"], ebene: 2, art: "pruefen"},
    {id: "dienst-win-tcp", bereich: "dienst", skills: ["lab.tcp"],
     befehl: "curl http://192.168.10.20", syntax: "curl http://<Host>",
     erklaerung: "Der TCP-Aufbau läuft wirklich ab (SYN, SYN/ACK, ACK) – die Ereignisliste der Simulation zeigt ihn Schritt für Schritt.",
     geraet: "host-windows", modus: [], ebene: 2, art: "pruefen"},
    {id: "dienst-linux-datei", bereich: "dienst", skills: ["lab.storage"],
     befehl: "systemctl status smbd", syntax: "systemctl status <Dienst>",
     erklaerung: "Läuft der Dateidienst (Samba/SMB)? Ohne ihn antwortet das Gerät auf Ping, aber an Port 445 nimmt niemand eine Verbindung an.",
     geraet: "host-linux", modus: [], ebene: 2, art: "pruefen"},

    /* ---- Link: Port-Security, Schleife und der Link zum Speicher ---- */
    {id: "link-switch-portsec", bereich: "link", skills: ["lab.portsec", "lab.switch"], nurTyp: ["switch"],
     befehl: "show port-security", syntax: "show port-security",
     erklaerung: "Erlaubte MAC-Adressen und Verstöße je Port: Ein Port auf err-disabled fällt hier zuerst auf.",
     geraet: "ios", modus: ["user", "priv"], ebene: 2, art: "pruefen"},
    {id: "link-switch-schleife", bereich: "link", skills: ["lab.stp", "lab.switch"], nurTyp: ["switch"],
     befehl: "show cdp neighbors", syntax: "show cdp neighbors",
     erklaerung: "Steht derselbe Nachbar zweimal in der Liste, hängen zwei Kabel zwischen denselben Switches – eine Schleife.",
     geraet: "ios", modus: ["user", "priv"], ebene: 2, art: "pruefen"},
    {id: "link-linux-nas", bereich: "link", skills: ["lab.storage", "lab.link"],
     befehl: "ip link", syntax: "ip link",
     erklaerung: "Ist eth0 des Servers oder NAS oben? NO-CARRIER heißt: kein Link – dann kommt kein Frame an.",
     geraet: "host-linux", modus: [], ebene: 2, art: "pruefen"},
  ],

  /* „Was geht hier?" je CLI-Modus. Erste Zeile = Kurzfassung, ab der zweiten Zeile ausführlich. */
  GERUEST: {
    ios: {
      user: "Angemeldet, aber nur zum Schauen: show-Befehle, ping und traceroute.\nMit „enable\" kommst du in den privilegierten Modus (der Prompt endet dann auf #).\n„?\" zeigt an jeder Stelle, was hier erlaubt ist, Tab vervollständigt.",
      priv: "Zeigen, prüfen, sichern: show …, ping, traceroute, copy running-config startup-config.\nKonfigurieren geht erst nach „configure terminal\" (kurz: conf t).\nMit „disable\" zurück in den Benutzermodus.",
      config: "Globale Konfiguration: hostname, vlan <Nr>, interface <Port>, ip route, ip default-gateway, ip dhcp pool, line console 0.\n„?\" listet alles, was hier erlaubt ist; „end\" führt zurück zum #.",
      if: "Eine Schnittstelle einstellen: ip address <IP> <Maske>, no shutdown, description <Text>.\nAm Switch-Port stattdessen: switchport access vlan <VLAN>, switchport mode trunk.\nMit „exit\" zurück nach (config).",
      subif: "Subinterface (Router-on-a-Stick): encapsulation dot1Q <VLAN>, dann ip address <IP> <Maske>.\nMit „exit\" zurück nach (config).",
      range: "Mehrere Ports auf einmal: switchport access vlan <VLAN>, switchport mode trunk, shutdown bzw. no shutdown.\nMit „exit\" zurück nach (config).",
      vlan: "VLAN einstellen: name <Name>. Die Nummer selbst wählst du vorher mit „vlan <Nr>\".\nMit „exit\" zurück nach (config).",
      line: "Zugang (Konsole oder VTY): password <Passwort> und login – ohne login fragt niemand nach dem Passwort.\nMit „exit\" zurück nach (config).",
      dhcp: "DHCP-Pool: network <Netz> <Maske>, default-router <Gateway>, dns-server <DNS>.\nMit „exit\" zurück nach (config).",
      std: "Standard-ACL: permit <Quelle> <Wildcard>, deny <Quelle> <Wildcard>.\nAm Ende steht immer ein unsichtbares „deny any\" – die Reihenfolge entscheidet.",
      ext: "Erweiterte ACL: permit oder deny, dann Protokoll (ip, tcp, udp, icmp), Quelle, Ziel, ggf. eq <Port>.\nDie erste passende Regel gewinnt.",
      abgemeldet: "Abgemeldet.\nEnter drücken, dann wieder anmelden (ggf. Passwort eingeben).",
    },
    "host-windows": {
      host: "Eingabeaufforderung: ipconfig [/all | /renew], ping <Ziel>, tracert <Ziel>, nslookup <Name>, arp -a, route print, netstat -an.\nÄndern mit netsh interface ip set address \"Ethernet\" static <IP> <Maske> <Gateway>.\n„help\" listet alle Befehle dieses Terminals.",
    },
    "host-linux": {
      host: "Shell: ip a, ip r, ip link, ping -c 4 <Ziel>, traceroute <Ziel>, dig <Name>, ss -tulpn, systemctl status <Dienst>.\nÄndern nur mit „sudo\", z. B. sudo ip addr add <IP>/<Präfix> dev eth0.\n„help\" listet alle Befehle dieser Shell.",
    },
    fw: {
      fwUser: "Die Firewall zeigt nur an: erst „enable\", dann show running-config, ping oder traceroute.\nRegeln, Zonen und NAT stellt man im Inspektor ein.",
      fwPriv: "Anzeige- und Testbefehle: show running-config, ping <Ziel>, traceroute <Ziel>.\nKonfigurieren geht nur im Inspektor.",
    },
  },

  /* Syntax-Brücke: „ich will X" → Muster je Geräteart. `erkennt` prüft die getippte Zeile,
     `beispiel` ist ein vollständiger Befehl für genau diese Geräteart. */
  SYNTAX: {
    "ip-adresse-setzen": {
      titel: "IP-Adresse setzen", erkennt: "ip\\s*adress|ip[\\s-]*adresse|\\bip\\s+addr\\b",
      ios: "ip address <IP> <Maske>", host: "netsh interface ip set address \"Ethernet\" static <IP> <Maske> <Gateway>",
      "host-linux": "sudo ip addr add <IP>/<Präfix> dev eth0",
      beispiel: {ios: "interface GigabitEthernet0/0  →  ip address 192.168.10.1 255.255.255.0",
                 "host-windows": "netsh interface ip set address \"Ethernet\" static 192.168.10.10 255.255.255.0 192.168.10.1",
                 "host-linux": "sudo ip addr add 192.168.10.10/24 dev eth0"},
      hinweis: "Am Router zuerst „configure terminal“, dann die Schnittstelle wählen (interface g0/0); am PC gehört die Adresse zum Adapter \"Ethernet\" und wird dort mit netsh gesetzt.",
    },
    "gateway-setzen": {
      titel: "Standardgateway setzen", erkennt: "gateway|default[\\s-]*router|route\\s+add\\s+default|standard-?gateway",
      ios: "ip default-gateway <Gateway>", host: "netsh interface ip set address \"Ethernet\" static <IP> <Maske> <Gateway>",
      "host-linux": "sudo ip route add default via <Gateway>",
      beispiel: {ios: "ip default-gateway 192.168.10.1",
                 "host-windows": "netsh interface ip set address \"Ethernet\" static 192.168.10.10 255.255.255.0 192.168.10.1",
                 "host-linux": "sudo ip route add default via 192.168.10.1"},
      hinweis: "Das Gateway muss im eigenen Netz liegen, sonst findet der Rechner es nicht per ARP.",
    },
    "route-setzen": {
      titel: "Statische Route setzen", erkennt: "route|routing|routen",
      ios: "ip route <Netz> <Maske> <Next-Hop>", host: "route add <Netz> mask <Maske> <Gateway>",
      "host-linux": "sudo ip route add <Netz>/<Präfix> via <Gateway>",
      beispiel: {ios: "ip route 192.168.20.0 255.255.255.0 192.168.10.2",
                 "host-windows": "route add 192.168.20.0 mask 255.255.255.0 192.168.10.1",
                 "host-linux": "sudo ip route add 192.168.20.0/24 via 192.168.10.1"},
      hinweis: "Der nächste Router (Next-Hop) muss direkt erreichbar sein – sonst bleibt die Route unbenutzt.",
    },
    "vlan-zuordnen": {
      titel: "Port einem VLAN zuordnen", erkennt: "vlan|switchport",
      ios: "switchport access vlan <VLAN>", host: null,
      beispiel: {ios: "interface Fa0/1  →  switchport mode access  →  switchport access vlan 10"},
      hinweis: "Erst den Port wählen (interface Fa0/1), dann switchport … – ein Router-Port kennt das nicht.",
    },
    "trunk-setzen": {
      titel: "Trunk konfigurieren", erkennt: "trunk|dot1q|802\\.1q",
      ios: "switchport mode trunk", host: null,
      beispiel: {ios: "interface Gi0/1  →  switchport mode trunk  →  switchport trunk allowed vlan 10,20"},
      hinweis: "Auf beiden Seiten Trunk, sonst bleibt das VLAN auf der Strecke.",
    },
    "shutdown-aufheben": {
      titel: "Schnittstelle einschalten", erkennt: "shutdown|abgeschaltet|administratively|port\\s+(ist\\s+)?aus|einschalten",
      ios: "no shutdown", host: "netsh interface set interface \"Ethernet\" admin=enabled",
      "host-linux": "sudo ip link set eth0 up",
      beispiel: {ios: "interface GigabitEthernet0/0  →  no shutdown",
                 "host-windows": "netsh interface set interface \"Ethernet\" admin=enabled",
                 "host-linux": "sudo ip link set eth0 up"},
      hinweis: "Router-Ports sind ab Werk abgeschaltet – eine Adresse allein hilft nicht.",
    },
    "speichern": {
      titel: "Konfiguration sichern", erkennt: "speicher|sichern|save|copy\\s+run|write\\s+mem",
      ios: "copy running-config startup-config", host: null,
      beispiel: {ios: "copy running-config startup-config   (oder: write memory)"},
      hinweis: "Ohne Sichern ist nach einem Neustart alles weg, was nur im RAM stand.",
    },
    "erreichbarkeit-pruefen": {
      titel: "Erreichbarkeit prüfen", erkennt: "ping|erreich|erreichbar|antwortet",
      ios: "ping <Ziel>", host: "ping <Ziel>", "host-linux": "ping -c 4 <Ziel>",
      beispiel: {ios: "ping 192.168.10.1", "host-windows": "ping 192.168.10.1", "host-linux": "ping -c 4 192.168.10.1"},
      hinweis: "Antwortet das Gateway, liegt der Fehler weiter hinten; antwortet es nicht, erst Link und Adresse prüfen.",
    },
    "namensaufloesung-pruefen": {
      titel: "Namensauflösung prüfen", erkennt: "nslookup|\\bdig\\b|namensaufl|dns",
      ios: null, host: "nslookup <Name>", "host-linux": "dig <Name>",
      beispiel: {"host-windows": "nslookup server.labor", "host-linux": "dig server.labor"},
      hinweis: "Kommt keine Antwort, fehlt der DNS-Server in der Konfiguration – oder er ist nicht erreichbar.",
    },
    "dienst-pruefen": {
      titel: "Dienst und Port prüfen", erkennt: "dienst|port\\s*\\d|telnet|ss\\s+-|netstat|systemctl|lauscht",
      ios: "show running-config", host: "telnet <Host> <Port>", "host-linux": "ss -tulpn",
      beispiel: {"host-windows": "telnet 192.168.10.20 80", "host-linux": "ss -tulpn", ios: "show running-config"},
      hinweis: "Erst prüfen, ob überhaupt ein Dienst lauscht – dann, ob eine ACL oder Firewall ihn blockiert.",
    },
  },
};
