"use strict";
/* ---------- CLI.vorschlag: der Rückfall für Fassungen ohne DATEN.hilfen ----------
   Warum diese Datei existiert (Review „Testqualität", 09.10.2026): CLI.vorschlag war die zweite
   Vorschlagsmaschine — im Programm nicht mehr erreichbar (UI.konsole nimmt Spiel.hilfe.passend),
   aber der einzige Rückfall, wenn DATEN.hilfen fehlt, und in einzelnen Modi genauer als der Hauptweg:
   sie kennt den Kontext DER SITZUNG (config/if/vlan/line/dhcp) und nennt den nächsten Teilschritt.
   Deshalb bleibt sie (Entscheidung des Leads, Option 1) und wird hier JE MODUS gedeckt.
   Geprüft wird nur die öffentliche Fläche: CLI.vorschlag(sitzung) → {befehl, text} | null. */
gruppe("CLI: vorschlag (Rückfall)", () => {
  const netz = () => {
    const n = Modell.neu();
    Modell.geraet(n, "router", {id: "r1", name: "R1"});
    Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
    Modell.geraet(n, "pc", {id: "pc1", name: "PC1"});
    Modell.geraet(n, "server", {id: "srv1", name: "SRV1"});
    Modell.geraet(n, "firewall", {id: "fw1", name: "FW1"});
    Modell.verbinden(n, {geraet: "sw1", port: "Gi0/1"}, {geraet: "r1", port: "Gi0/0"});
    Modell.verbinden(n, {geraet: "pc1"}, {geraet: "sw1", port: "Fa0/1"});
    Modell.verbinden(n, {geraet: "srv1"}, {geraet: "sw1", port: "Fa0/2"});
    return n;
  };
  const e = (s, ...zeilen) => { let r; for (const z of zeilen) r = CLI.eingabe(s, z); return r; };
  /* Der Vorschlag als Zeichenkette – kürzer zu lesen als das Objekt. */
  const v = s => { const r = CLI.vorschlag(s); return r ? r.befehl : null; };
  const text = s => { const r = CLI.vorschlag(s); return r ? r.text : null; };

  pruefe("Exec: Benutzermodus → enable, dann der Überblick, dann Sichern, dann Konfigurieren", () => {
    const n = netz(), s = CLI.sitzung(n, "r1", {einstieg: true});
    erwarte.gleich(v(s), "enable", "ohne Rechte zuerst enable");
    erwarte.wahr(typeof text(s) === "string" && text(s).length > 10, "mit Erklärung");
    e(s, "enable");
    erwarte.gleich(v(s), "show ip interface brief", "der erste Blick gilt den Schnittstellen");
    e(s, "show ip interface brief");
    erwarte.gleich(v(s), "configure terminal", "nichts geändert → konfigurieren");
    /* Etwas ändern: danach ist die Konfiguration ungespeichert, und der Vorschlag wechselt auf Sichern. */
    e(s, "configure terminal", "hostname R2", "end");
    erwarte.wahr(Modell.ungespeichert(n.geraete.r1), "die Änderung ist ungespeichert");
    erwarte.gleich(v(s), "copy running-config startup-config", "erst sichern, sonst ist alles nach dem Neustart weg");
    e(s, "copy running-config startup-config", "");
    erwarte.gleich(v(s), "configure terminal", "nach dem Sichern wieder der Weg in die Konfiguration");
  });

  pruefe("config: Hostname ohne Namen, abgeschalteter Port mit Kabel, sonst end", () => {
    const n = netz();
    /* Ein Gerät, das noch den Werksnamen trägt („Router"): zuerst den Namen vergeben. */
    const r2 = Modell.geraet(n, "router", {id: "r2", name: "Router"});
    Modell.verbinden(n, {geraet: "sw1", port: "Gi0/2"}, {geraet: "r2", port: "Gi0/0"});
    const s2 = CLI.sitzung(n, "r2");
    e(s2, "enable", "configure terminal");
    erwarte.gleich(v(s2), "hostname R1", "dem Gerät zuerst einen Namen geben (er steht danach im Prompt)");
    e(s2, "hostname Kern");
    erwarte.gleich(v(s2), "interface GigabitEthernet0/0", "dieser Port hat ein Kabel und ist abgeschaltet");
    e(s2, "interface GigabitEthernet0/0", "no shutdown", "exit");
    erwarte.gleich(v(s2), "end", "nichts mehr zu tun → zurück in den privilegierten Modus");
    /* Ein Switch mit Werksnamen „Switch" – dasselbe Spiel mit dem Switch-Namen. */
    const n3 = netz(), sw = Modell.geraet(n3, "switch", {id: "swx", name: "Switch"});
    const s3 = CLI.sitzung(n3, sw.id); e(s3, "enable", "configure terminal");
    erwarte.gleich(v(s3), "hostname SW1");
    erwarte.gleich(r2.running.hostname, "Kern", "der Name steht wirklich in der Konfiguration");
  });

  pruefe("Schnittstellenmodus: Subinterface, IP-Adresse, no shutdown, exit", () => {
    const n = netz(), s = CLI.sitzung(n, "r1");
    e(s, "enable", "configure terminal", "interface Gi0/0.10");
    erwarte.gleich(v(s), "encapsulation dot1Q 10", "ein Subinterface braucht zuerst sein VLAN-Tag");
    e(s, "encapsulation dot1Q 10");
    erwarte.gleich(v(s), "ip address ", "dann Adresse und Maske");
    e(s, "ip address 192.168.10.1 255.255.255.0");
    erwarte.gleich(v(s), "exit", "ein Subinterface ist nicht abgeschaltet – fertig, eine Ebene zurück");
    /* Der physische Port dagegen ist ab Werk aus: nach der Adresse kommt no shutdown. */
    e(s, "exit", "interface Gi0/0");
    erwarte.gleich(v(s), "ip address ", "der physische Port hat noch keine Adresse");
    e(s, "ip address 192.168.20.1 255.255.255.0");
    erwarte.gleich(v(s), "no shutdown", "Router-Ports sind ab Werk aus");
    e(s, "no shutdown");
    erwarte.gleich(v(s), "exit", "fertig → eine Ebene zurück");
  });

  pruefe("Switch-Port: einem VLAN zuordnen, wenn der Port noch im Standard-VLAN liegt", () => {
    const n = netz(), sw = n.geraete.sw1;
    const s = CLI.sitzung(n, "sw1");
    e(s, "enable", "configure terminal", "interface Fa0/1");
    erwarte.gleich(v(s), "exit", "mit nur einem VLAN gibt es nichts zuzuordnen");
    e(s, "exit", "vlan 10", "name Verwaltung", "exit", "interface Fa0/1");
    erwarte.gleich(Object.keys(sw.flash.vlans).length > 1, true, "es gibt jetzt mehr als ein VLAN");
    erwarte.gleich(v(s), "switchport access vlan ", "der Port darf in sein VLAN");
  });

  pruefe("VLAN, LINE, DHCP, ACL: der jeweils nächste fehlende Teilschritt", () => {
    const n = netz(), s = CLI.sitzung(n, "sw1");
    e(s, "enable", "configure terminal", "vlan 10");
    erwarte.gleich(v(s), "name ", "ein VLAN ohne sprechenden Namen");
    e(s, "name Verwaltung");
    erwarte.gleich(v(s), "exit");
    e(s, "exit", "line console 0");
    erwarte.gleich(v(s), "password ", "ohne Passwort kommt jeder an die Konsole");
    e(s, "password geheim");
    erwarte.gleich(v(s), "login", "und danach soll auch danach gefragt werden");
    e(s, "login");
    erwarte.gleich(v(s), "exit");
    /* DHCP-Pool am Router: Netz → Gateway → DNS → fertig */
    const r = netz(), sr = CLI.sitzung(r, "r1");
    e(sr, "enable", "configure terminal", "ip dhcp pool LAN");
    erwarte.gleich(v(sr), "network ", "aus welchem Netz vergeben?");
    e(sr, "network 192.168.10.0 255.255.255.0");
    erwarte.gleich(v(sr), "default-router ", "das Gateway für die Clients");
    e(sr, "default-router 192.168.10.1");
    erwarte.gleich(v(sr), "dns-server ", "und der DNS-Server");
    e(sr, "dns-server 192.168.10.20");
    erwarte.gleich(v(sr), "exit", "Pool fertig");
    /* ACLs: die erste Regel, danach exit */
    e(sr, "exit", "ip access-list standard VERW");
    erwarte.gleich(v(sr), "permit ", "die erste Regel einer Standard-Liste");
    e(sr, "permit 192.168.10.0 0.0.0.255");
    erwarte.gleich(v(sr), "exit");
    e(sr, "exit", "ip access-list extended GAST");
    erwarte.gleich(v(sr), "deny ", "die erste Regel einer erweiterten Liste");
  });

  pruefe("Hosts: ipconfig/ip a, dann ping zum Gateway, dann nichts mehr", () => {
    const n = netz();
    Modell.setzen(n, "pc1", "if.eth0.ip", "192.168.10.10"); Modell.setzen(n, "pc1", "if.eth0.maske", "255.255.255.0"); Modell.setzen(n, "pc1", "if.eth0.gw", "192.168.10.1");
    Modell.setzen(n, "srv1", "if.eth0.ip", "192.168.10.20"); Modell.setzen(n, "srv1", "if.eth0.maske", "255.255.255.0"); Modell.setzen(n, "srv1", "if.eth0.gw", "192.168.10.1");
    const pc = CLI.sitzung(n, "pc1");
    erwarte.gleich(v(pc), "ipconfig", "Windows-Rechner: erst die eigene Adresse");
    e(pc, "ipconfig");
    erwarte.gleich(v(pc), "ping 192.168.10.1", "dann das Gateway");
    e(pc, "ping 192.168.10.1");
    erwarte.gleich(v(pc), null, "danach ist der Einstieg fertig");
    const srv = CLI.sitzung(n, "srv1");
    erwarte.gleich(v(srv), "ip a", "Linux-Server: ip a statt ipconfig");
    e(srv, "ip a");
    erwarte.gleich(v(srv), "ping -c 4 192.168.10.1", "dann vier Pakete zum Gateway");
    e(srv, "ping -c 4 192.168.10.1");
    erwarte.gleich(v(srv), null);
    /* Host ohne Gateway: nach dem ersten Befehl ist Schluss (kein geratener Ping). */
    const n2 = netz(), pc2 = CLI.sitzung(n2, "pc1");
    erwarte.gleich(v(pc2), "ipconfig");
    e(pc2, "ipconfig");
    erwarte.gleich(v(pc2), null, "ohne Gateway kein Ping-Vorschlag");
  });

  pruefe("Firewall: enable, dann die Regelübersicht, dann nichts", () => {
    const n = netz(), s = CLI.sitzung(n, "fw1");
    erwarte.gleich(v(s), "enable", "die Firewall zeigt erst nach enable etwas");
    e(s, "enable");
    erwarte.gleich(v(s), "show running-config", "Regeln, Zonen und NAT ansehen");
    e(s, "show running-config");
    erwarte.gleich(v(s), null, "mehr kann die Konsole der Firewall nicht anbieten");
  });

  pruefe("Randfälle: kein Vorschlag bei fehlender Sitzung, ausgeschaltetem Gerät, offener Rückfrage", () => {
    const n = netz();
    erwarte.gleich(CLI.vorschlag(null), null, "ohne Sitzung kein Vorschlag");
    erwarte.gleich(CLI.vorschlag(undefined), null);
    const s = CLI.sitzung(n, "r1");
    Modell.geraetSetzen(n, "r1", "an", false);
    erwarte.gleich(v(s), null, "ein ausgeschaltetes Gerät bekommt keinen Vorschlag");
    Modell.geraetSetzen(n, "r1", "an", true);
    e(s, "enable", "copy running-config startup-config");
    erwarte.wahr(!!s.rueckfrage, "die Rückfrage steht offen");
    erwarte.gleich(v(s), null, "während einer Rückfrage kein neuer Vorschlag");
    e(s, "\u0003");
    erwarte.gleich(v(s), "show ip interface brief", "nach dem Abbruch geht es weiter");
    /* Das Internet hat keine Konsole – dort gibt es auch keinen Vorschlag. */
    const inet = Modell.geraet(n, "internet", {id: "inet"});
    erwarte.gleich(CLI.vorschlag(CLI.sitzung(n, inet.id)), null);
  });
});
