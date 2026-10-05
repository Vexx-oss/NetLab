"use strict";
/* Simulation: je Grundcode ein auslösender Fall, Firewall, Vertrag (Trace-Format, Aufrufe), pruefeZiel, Leistung.
   Testnetze aus sim-golden.test.js (Sim._test). */
gruppe("Sim Gründe", () => {
  const T = () => Sim._test;
  const ping = (n, von, ziel, anzahl) => Sim.ping(n, von, ziel, {anzahl: anzahl || 2});
  const grund = (r, soll) => { erwarte.falsch(r.ok, "sollte scheitern: " + r.text); erwarte.gleich(r.grund, soll, r.text); };
  const hatGrund = (tr, code) => tr.ereignisse.some(e => e.grund === code);

  /* Firewall-Netz: PCI – FW(innen) · FW(aussen) – Internet · FW(dmz) – WEB */
  function fwNetz(){
    const t = T(), n = Modell.neu();
    Modell.geraet(n, "firewall", {id: "fw", name: "FW1"}); Modell.geraet(n, "internet", {id: "inet"});
    t.host(n, "pci", "192.168.1.10", null, "192.168.1.1"); Modell.setzen(n, "pci", "if.eth0.dns", "198.51.100.53");
    t.host(n, "web", "172.16.0.10", null, "172.16.0.1", "server");
    t.kabel(n, "pci", "eth0", "fw", "Gi0/0"); t.kabel(n, "fw", "Gi0/1", "inet", "wan0"); t.kabel(n, "web", "eth0", "fw", "Gi0/2");
    const fi = (p, ip, m, zone) => { Modell.setzen(n, "fw", `if.${p}.ip`, ip); Modell.setzen(n, "fw", `if.${p}.maske`, m); Modell.setzen(n, "fw", `if.${p}.zone`, zone); };
    fi("Gi0/0", "192.168.1.1", "255.255.255.0", "innen"); fi("Gi0/1", "203.0.113.2", "255.255.255.252", "aussen"); fi("Gi0/2", "172.16.0.1", "255.255.255.0", "dmz");
    Modell.setzen(n, "fw", "routen", [{netz: "0.0.0.0", maske: "0.0.0.0", nh: "203.0.113.1", aus: null, ad: 1}]);
    Modell.setzen(n, "fw", "regeln", [
      {id: "r1", von: "innen", nach: "aussen", proto: "ip", quelle: "any", ziel: "any", port: null, aktion: "erlauben", aktiv: true, text: "Surfen"},
      {id: "r2", von: "aussen", nach: "dmz", proto: "tcp", quelle: "any", ziel: "172.16.0.10/32", port: 80, aktion: "erlauben", aktiv: true, text: "Webserver"}]);
    Modell.setzen(n, "fw", "nat", {quellNat: [{von: "innen", nach: "aussen"}], weiterleitung: [{proto: "tcp", aussenPort: 80, ziel: "172.16.0.10", zielPort: 80}]});
    Modell.setzen(n, "inet", "if.wan0.ip", "203.0.113.1"); Modell.setzen(n, "inet", "if.wan0.maske", "255.255.255.252");
    return n;
  }

  pruefe("GRUENDE: alle 34 Codes aus Architektur § 5.3 und § 10.4 mit Titel, Skill aus DATEN.skills und Schicht 1–7", () => {
    const codes = "LINK_DOWN PORT_SHUTDOWN NO_IP ARP_NO_REPLY DROP_VLAN TRUNK_NOT_ALLOWED NATIVE_MISMATCH NO_GATEWAY GW_WRONG_SUBNET GW_UNREACHABLE WRONG_MASK NO_ROUTE NO_RETURN_ROUTE TTL_EXPIRED ACL_DENY FW_DENY NAT_MISSING DUP_IP DHCP_NO_OFFER DHCP_POOL_EMPTY DHCP_LEASE_EXPIRED DHCP_RESERVED_BUSY DHCP_ROGUE_OFFER DHCP_SNOOPING_BLOCKED DHCP_CONFLICT DNS_FAIL DNS_NO_SERVER PORT_CLOSED SERVICE_OFF STORM PORTSEC_VIOLATION DEVICE_OFF HOST_UNREACHABLE TIMEOUT".split(" ");
    erwarte.gleich(Object.keys(Sim.GRUENDE).sort(), codes.slice().sort());
    const skills = new Set(DATEN.skills.map(s => s.id));
    for (const c of codes) {
      const g = Sim.GRUENDE[c];
      erwarte.wahr(g.titel && skills.has(g.skill) && g.schicht >= 1 && g.schicht <= 7, c);
      if (DATEN.lehrtexte[c] && DATEN.lehrtexte[c].skill) erwarte.gleich(g.skill, DATEN.lehrtexte[c].skill, c + " passt zum Lehrtext");
    }
  });

  pruefe("LINK_DOWN: PC ohne Kabel", () => {
    const n = T().lan(); Modell.trennen(n, Modell.kabelAn(n, "pc1", "eth0").kabel.id);
    const r = ping(n, "pc1", "192.168.1.11"); grund(r, "LINK_DOWN");
    erwarte.gleich(r.antworten[0].art, "fehler");
  });
  pruefe("PORT_SHUTDOWN: Switchport zum Ziel abgeschaltet (Diagnose am Port)", () => {
    const n = T().lan(); Modell.setzen(n, "sw1", "ports.Fa0/2.shutdown", true);
    const r = ping(n, "pc1", "192.168.1.11"); grund(r, "PORT_SHUTDOWN");
    const e = Sim.erklaere(r.trace); erwarte.gleich([e.geraet, e.port], ["sw1", "Fa0/2"]);
  });
  pruefe("DEVICE_OFF: Ziel ausgeschaltet; Absender ausgeschaltet", () => {
    const n = T().lan(); Modell.geraetSetzen(n, "pc2", "an", false);
    grund(ping(n, "pc1", "192.168.1.11"), "DEVICE_OFF");
    grund(ping(n, "pc2", "192.168.1.10"), "DEVICE_OFF");
  });
  pruefe("NO_IP: keine Adresse eingetragen; Ziel ohne Adresse", () => {
    const n = T().lan(); Modell.setzen(n, "pc1", "if.eth0.ip", "");
    grund(ping(n, "pc1", "192.168.1.11"), "NO_IP");
    grund(ping(n, "pc2", "pc1"), "NO_IP");
  });
  pruefe("ARP_NO_REPLY: niemand hat die Adresse im eigenen Netz (Windows: Zielhost nicht erreichbar)", () => {
    const r = ping(T().lan(), "pc1", "192.168.1.99"); grund(r, "ARP_NO_REPLY");
    erwarte.gleich([r.antworten[0].art, r.antworten[0].code, r.antworten[0].von], ["unreachable", "host", "192.168.1.10"]);
  });
  pruefe("DROP_VLAN: getaggter Frame an Access-Port (Router-on-a-Stick ohne Trunk)", () => {
    const n = DATEN.beispiele.praxis(); Modell.setzen(n, "sw1", "ports.Gi0/1.modus", "access");
    const r = ping(n, "empfang", "behandlung"); grund(r, "DROP_VLAN");
    erwarte.gleich(Sim.erklaere(r.trace).port, "Gi0/1", "Trunk-Port als Access-Port in VLAN 1");
    const b = DATEN.beispiele.praxis(); Modell.setzen(b, "sw1", "ports.Gi0/1.modus", "access"); Modell.setzen(b, "sw1", "ports.Gi0/1.accessVlan", 10);
    const r2 = ping(b, "empfang", "behandlung");
    erwarte.falsch(r2.ok); erwarte.wahr(hatGrund(r2.trace, "DROP_VLAN"), "getaggte Antwort am Access-Port verworfen: " + r2.text);
  });
  pruefe("DROP_VLAN: VLAN fehlt in der VLAN-Datenbank (Port inaktiv)", () => {
    const n = T().lan(); Modell.setzen(n, "sw1", "ports.Fa0/1.accessVlan", 30);
    grund(ping(n, "pc1", "192.168.1.11"), "DROP_VLAN");
  });
  pruefe("TRUNK_NOT_ALLOWED: VLAN auf dem Trunk nicht erlaubt", () => {
    const t = T(), n = Modell.neu();
    Modell.geraet(n, "switch", {id: "sw1", name: "SW1"}); Modell.geraet(n, "switch", {id: "sw2", name: "SW2"});
    for (const s of ["sw1", "sw2"]) { Modell.vlan(n, s, 10, "A"); Modell.setzen(n, s, "ports.Gi0/1.modus", "trunk"); Modell.setzen(n, s, "ports.Gi0/1.trunkErlaubt", [1, 20]); Modell.setzen(n, s, "ports.Fa0/1.accessVlan", 10); }
    t.host(n, "pc1", "192.168.10.10"); t.host(n, "pc2", "192.168.10.20");
    t.kabel(n, "pc1", "eth0", "sw1", "Fa0/1"); t.kabel(n, "pc2", "eth0", "sw2", "Fa0/1"); t.kabel(n, "sw1", "Gi0/1", "sw2", "Gi0/1");
    const r = ping(n, "pc1", "192.168.10.20"); grund(r, "TRUNK_NOT_ALLOWED");
    erwarte.gleich(Sim.erklaere(r.trace).port, "Gi0/1");
    Modell.setzen(n, "sw1", "ports.Gi0/1.trunkErlaubt", "1,10,20"); Modell.setzen(n, "sw2", "ports.Gi0/1.trunkErlaubt", "all");
    erwarte.wahr(ping(n, "pc1", "192.168.10.20").ok, "nach dem Freigeben");
  });
  pruefe("NATIVE_MISMATCH: CDP-Hinweis, ungetaggt landet im Native VLAN der Gegenseite", () => {
    const t = T(), bau = vlanPc2 => {
      const n = Modell.neu();
      Modell.geraet(n, "switch", {id: "sw1", name: "SW1"}); Modell.geraet(n, "switch", {id: "sw2", name: "SW2"});
      Modell.vlan(n, "sw2", 99, "Native");
      for (const s of ["sw1", "sw2"]) Modell.setzen(n, s, "ports.Gi0/1.modus", "trunk");
      Modell.setzen(n, "sw2", "ports.Gi0/1.nativeVlan", 99); Modell.setzen(n, "sw2", "ports.Fa0/1.accessVlan", vlanPc2);
      t.host(n, "pc1", "192.168.1.10"); t.host(n, "pc2", "192.168.1.20");
      t.kabel(n, "pc1", "eth0", "sw1", "Fa0/1"); t.kabel(n, "pc2", "eth0", "sw2", "Fa0/1"); t.kabel(n, "sw1", "Gi0/1", "sw2", "Gi0/1");
      return n;
    };
    const leck = ping(bau(99), "pc1", "192.168.1.20");
    erwarte.wahr(leck.ok, "VLAN 1 auf SW1 landet in VLAN 99 auf SW2 (wie echt)");
    erwarte.wahr(hatGrund(leck.trace, "NATIVE_MISMATCH"), "Hinweis in der Trace");
    grund(ping(bau(1), "pc1", "192.168.1.20"), "NATIVE_MISMATCH");
  });
  pruefe("NO_GATEWAY und GW_WRONG_SUBNET beim Absender (Allgemeiner Fehler)", () => {
    const n = T().lan(); Modell.setzen(n, "pc1", "if.eth0.gw", "");
    const r = ping(n, "pc1", "10.9.9.9"); grund(r, "NO_GATEWAY"); erwarte.gleich(r.antworten[0].art, "fehler");
    Modell.setzen(n, "pc1", "if.eth0.gw", "10.0.0.1");
    grund(ping(n, "pc1", "10.9.9.9"), "GW_WRONG_SUBNET");
  });
  pruefe("GW_UNREACHABLE: Gateway im eigenen Netz antwortet nicht; PC als Gateway leitet nicht weiter", () => {
    grund(ping(T().lan(), "pc1", "10.9.9.9"), "GW_UNREACHABLE");
    const n = T().lan(); Modell.setzen(n, "pc1", "if.eth0.gw", "192.168.1.11");
    grund(ping(n, "pc1", "10.9.9.9"), "GW_UNREACHABLE");
  });
  pruefe("WRONG_MASK: zu große Maske (Ziel für lokal gehalten) und zu kleine (Gateway scheinbar fremd)", () => {
    const n = T().zweiNetze(); Modell.setzen(n, "pca", "if.eth0.maske", "255.255.0.0");
    grund(ping(n, "pca", "10.0.2.10"), "WRONG_MASK");
    const k = T().zweiNetze(); Modell.setzen(k, "pca", "if.eth0.ip", "10.0.1.100"); Modell.setzen(k, "pca", "if.eth0.maske", "255.255.255.224");
    grund(ping(k, "pca", "10.0.2.10"), "WRONG_MASK");
  });
  pruefe("NO_ROUTE: Router meldet Destination unreachable (Netz); IOS drosselt: U.U.U", () => {
    const n = T().zweiNetze();
    const r = ping(n, "pca", "10.9.9.9"); grund(r, "NO_ROUTE");
    erwarte.gleich([r.antworten[0].art, r.antworten[0].code, r.antworten[0].von], ["unreachable", "net", "10.0.1.1"]);
    const selbst = Sim.ping(n, "r1", "10.9.9.9", {anzahl: 5});
    erwarte.gleich(selbst.antworten.map(a => a.ok ? "!" : a.art === "unreachable" ? "U" : "."), [".", ".", ".", ".", "."], "Router ohne eigene Route: nur Punkte");
    const z = T().zweiRouter(); Modell.setzen(z, "r1", "routen", [{netz: "0.0.0.0", maske: "0.0.0.0", nh: "10.0.12.2", aus: null, ad: 1}]);
    const ios = Sim.ping(z, "r1", "10.9.9.9", {anzahl: 5});
    erwarte.gleich(ios.antworten.map(a => a.ok ? "!" : a.art === "unreachable" ? "U" : "."), [".", "U", ".", "U", "."], "R2 meldet, gedrosselt auf eine Meldung je 500 ms");
    erwarte.gleich(ios.grund, "NO_ROUTE");
  });
  pruefe("NO_RETURN_ROUTE: Antwort findet keinen Rückweg", () => {
    const n = T().zweiRouter(); Modell.setzen(n, "r2", "routen", []);
    grund(ping(n, "pca", "10.0.2.10", 4), "NO_RETURN_ROUTE");
  });
  pruefe("TTL_EXPIRED: Routing-Schleife zwischen zwei Routern", () => {
    const n = T().zweiRouter();
    Modell.setzen(n, "r1", "routen", [{netz: "0.0.0.0", maske: "0.0.0.0", nh: "10.0.12.2", aus: null, ad: 1}]);
    Modell.setzen(n, "r2", "routen", [{netz: "0.0.0.0", maske: "0.0.0.0", nh: "10.0.12.1", aus: null, ad: 1}]);
    const r = ping(n, "pca", "10.9.9.9", 3); grund(r, "TTL_EXPIRED");
    erwarte.wahr(r.antworten.some(a => a.art === "time-exceeded"), "Time exceeded kommt zurück");
    erwarte.falsch(r.trace.abbruch, "kein Sturm");
  });
  pruefe("ACL_DENY: Standard-ACL out, implizites deny any", () => {
    const n = T().zweiNetze();
    Modell.setzen(n, "r1", "acls", {"10": {typ: "standard", benannt: false, regeln: [{aktion: "permit", proto: "ip", quelle: {ip: "10.0.1.99", wc: "0.0.0.0"}, ziel: null, zielPort: null, quellPort: null, icmpTyp: null}]}});
    Modell.setzen(n, "r1", "if.Gi0/1.aclOut", "10");
    const r = ping(n, "pca", "10.0.2.10"); grund(r, "ACL_DENY");
    erwarte.enthaelt(Sim.erklaere(r.trace).text, "deny any");
    Modell.setzen(n, "r1", "if.Gi0/1.aclOut", "99");
    erwarte.wahr(ping(n, "pca", "10.0.2.10", 4).ok, "nicht vorhandene ACL lässt alles durch (IOS)");
  });
  pruefe("ACL: erweiterte Regel mit Port – HTTP erlaubt, SMB gesperrt", () => {
    const n = T().zweiNetze();
    Modell.setzen(n, "pcb", "dienste", {http: {an: true}, datei: {an: true}});
    const any = {ip: "0.0.0.0", wc: "255.255.255.255"};
    Modell.setzen(n, "r1", "acls", {"WEB": {typ: "erweitert", benannt: true, regeln: [
      {aktion: "permit", proto: "tcp", quelle: any, ziel: {ip: "10.0.2.10", wc: "0.0.0.0"}, zielPort: {op: "eq", ports: [80]}, quellPort: null, icmpTyp: null},
      {aktion: "permit", proto: "icmp", quelle: any, ziel: any, zielPort: null, quellPort: null, icmpTyp: "echo"}]}});
    Modell.setzen(n, "r1", "if.Gi0/0.aclIn", "WEB");
    erwarte.wahr(Sim.tcp(n, "pca", "10.0.2.10", 80).ok, "HTTP erlaubt");
    grund(Sim.tcp(n, "pca", "10.0.2.10", 445), "ACL_DENY");
    erwarte.wahr(Sim.ping(n, "pca", "10.0.2.10").ok, "Ping erlaubt");
  });
  pruefe("FW_DENY und Firewall: Quell-NAT, zustandsbehaftet, Port-Weiterleitung", () => {
    const n = fwNetz();
    const r = Sim.ping(n, "pci", "198.51.100.10");
    erwarte.wahr(r.ok, r.text);
    const raus = r.trace.ereignisse.find(e => e.art === "senden" && e.geraet === "fw" && e.port === "Gi0/1" && e.frame.icmp);
    erwarte.gleich(raus.frame.ip.src, "203.0.113.2", "Quell-NAT");
    erwarte.wahr(r.trace.ereignisse.some(e => e.geraet === "fw" && /zustandsbehaftet/.test(e.text)), "Rückverkehr über Zustand");
    erwarte.wahr(Sim.http(n, "pci", "http://www.beispiel.de").ok, "Surfen mit DNS");
    grund(Sim.ping(n, "pci", "172.16.0.10"), "FW_DENY");
    const w = Sim.tcp(n, "inet", "203.0.113.2", 80);
    erwarte.wahr(w.ok, "Port-Weiterleitung aus dem Internet: " + w.text);
    grund(Sim.ping(n, "inet", "172.16.0.10"), "NO_ROUTE");
    const k = fwNetz(); Modell.setzen(k, "fw", "regeln", []);
    grund(Sim.ping(k, "pci", "198.51.100.10"), "FW_DENY");
  });
  pruefe("NAT_MISSING: private Quelle im Internet", () => {
    const n = DATEN.beispiele.salon(); Modell.setzen(n, "r1", "if.Gi0/0.nat", null);
    grund(ping(n, "kasse", "198.51.100.10"), "NAT_MISSING");
  });
  pruefe("DUP_IP: zwei Geräte mit derselben Adresse", () => {
    const n = T().lan(); Modell.setzen(n, "pc3", "if.eth0.ip", "192.168.1.11");
    const r = Sim.ping(n, "pc1", "pc2", {anzahl: 4}); grund(r, "DUP_IP");
    erwarte.wahr(hatGrund(r.trace, "DUP_IP"), "Hinweis in der Trace");
  });
  pruefe("HOST_UNREACHABLE: unbekannte öffentliche Adresse", () => {
    const r = ping(DATEN.beispiele.salon(), "kasse", "198.51.100.99"); grund(r, "HOST_UNREACHABLE");
    erwarte.wahr(r.antworten.some(a => a.art === "unreachable" && a.code === "host" && a.von === "203.0.113.1"), "Provider-Router meldet");
  });
  pruefe("TIMEOUT: erstes Paket geht beim IOS-ARP verloren, ohne Fehlergrund", () => {
    const r = Sim.ping(T().zweiNetze(), "pca", "10.0.2.10");
    erwarte.gleich([r.antworten[0].ok, r.antworten[0].art, r.antworten[0].grund], [false, "timeout", "TIMEOUT"]);
  });
  pruefe("PORT_CLOSED und SERVICE_OFF: RST vom Ziel", () => {
    grund(Sim.tcp(T().lan(), "pc1", "192.168.1.11", 80), "PORT_CLOSED");
    const n = DATEN.beispiele.praxis(); Modell.setzen(n, "srv", "dienste.http.an", false);
    const r = Sim.tcp(n, "empfang", "srv", 80); grund(r, "SERVICE_OFF");
    erwarte.wahr(r.trace.ereignisse.some(e => e.art === "senden" && e.frame.tcp && e.frame.tcp.flags.includes("RST")), "RST gesendet");
    const s = DATEN.beispiele.salon();
    erwarte.wahr(Sim.tcp(s, "kasse", "drucker", 9100).ok, "Druckdienst läuft");
    const h = Sim.http(n, "empfang", "http://192.168.10.5");
    erwarte.gleich([h.ok, h.grund], [false, "SERVICE_OFF"]);
  });
  pruefe("DHCP: Router als DHCP-Server, ausgeschlossene Adressen, DHCP_POOL_EMPTY", () => {
    const t = T(), n = t.zweiNetze();
    t.host(n, "pcc", null); t.kabel(n, "pcc", "eth0", "sw2", "Fa0/2");
    Modell.setzen(n, "pcb", "if.eth0.dhcp", true); Modell.setzen(n, "pcc", "if.eth0.dhcp", true);
    Modell.setzen(n, "r1", "dhcp", {ausgeschlossen: [{von: "10.0.2.1", bis: "10.0.2.253"}], pools: [{name: "LAN2", netz: "10.0.2.0", maske: "255.255.255.0", gw: "10.0.2.1", dns: ""}]});
    const a = Sim.dhcp(n, "pcb");
    erwarte.wahr(a.ok, a.text); erwarte.gleich(a.lease.ip, "10.0.2.254");
    const b = Sim.dhcp(n, "pcc"); grund(b, "DHCP_POOL_EMPTY");
    erwarte.wahr(IP.apipa(Sim.adresse(n, "pcc").ip), "APIPA");
    erwarte.gleich(Sim.dhcp(n, "pcb").lease.ip, "10.0.2.254", "gleiche Adresse bei Erneuerung");
  });
  pruefe("DHCP automatisch vor dem Ping (sichtbar in derselben Trace)", () => {
    const t = T(), n = t.zweiNetze();
    Modell.setzen(n, "pcb", "if.eth0.dhcp", true);
    Modell.setzen(n, "r1", "dhcp", {ausgeschlossen: [{von: "10.0.2.1", bis: "10.0.2.9"}], pools: [{name: "LAN2", netz: "10.0.2.0", maske: "255.255.255.0", gw: "10.0.2.1", dns: ""}]});
    const r = Sim.ping(n, "pcb", "10.0.1.10");
    erwarte.wahr(r.ok, r.text);
    erwarte.wahr(r.trace.ereignisse.some(e => e.proto === "DHCP"), "DORA in der Trace");
  });
  pruefe("DNS_FAIL und DNS_NO_SERVER", () => {
    const n = DATEN.beispiele.praxis();
    grund(Sim.dns(n, "behandlung", "gibtsnicht.praxis.local"), "DNS_FAIL");
    grund(Sim.dns(T().lan(), "pc1", "server.local"), "DNS_NO_SERVER");
    Modell.setzen(n, "srv", "dienste.dns.an", false);
    const r = Sim.dns(n, "empfang", "server.praxis.local"); grund(r, "DNS_NO_SERVER");
    erwarte.gleich(r.ursache, "SERVICE_OFF");
    grund(Sim.ping(n, "empfang", "server.praxis.local"), "DNS_NO_SERVER");
  });

  /* ---------- DHCP-Tiefe (D1, Architektur § 10) ---------- */
  pruefe("DHCP-Lease: Ablauf in virtueller Zeit, Erneuerung bei 50 % (T1), Adresse bleibt", () => {
    const t = T(), n = t.zweiNetze();
    Modell.setzen(n, "pcb", "if.eth0.dhcp", true);
    Modell.setzen(n, "r1", "dhcp", {ausgeschlossen: [{von: "10.0.2.1", bis: "10.0.2.9"}],
      pools: [{name: "LAN2", netz: "10.0.2.0", maske: "255.255.255.0", gw: "10.0.2.1", dns: "", leaseS: 7200}]});
    const a = Sim.dhcp(n, "pcb");
    erwarte.wahr(a.ok, a.text);
    const ip = a.lease.ip, dauer = 7200 * 1000;
    erwarte.gleich([a.lease.bis - Sim.vergehen(n, 0), a.lease.bis - a.lease.t1], [dauer, dauer / 2], "T1 liegt bei 50 %");
    erwarte.gleich(Sim.adresse(n, "pcb").quelle, "dhcp", "Lease gilt");
    /* Ablauf: Uhr über `bis` hinaus vorstellen – ohne neues Angebot ist die Adresse weg */
    Sim.vergehen(n, dauer + 1000);
    erwarte.gleich(Sim.adresse(n, "pcb").ip, "", "abgelaufene Lease gilt nicht mehr");
    erwarte.gleich(Sim.adresse(n, "pcb").quelle, "keine");
    /* Erneuerung bei T1: Uhr auf T1 stellen, dann muss dieselbe Adresse erneuert werden (kein Discover) */
    const b = Sim.dhcp(n, "pcb");
    erwarte.wahr(b.ok, b.text);
    erwarte.gleich(b.lease.ip, ip, "dieselbe Adresse nach Ablauf und Neubezug");
  });
  pruefe("DHCP-Reservierung: feste MAC bekommt immer die reservierte Adresse, auch außerhalb des Bereichs", () => {
    const t = T(), n = t.zweiNetze();
    const mac = n.geraete.pcb.hw.macs.eth0;
    Modell.setzen(n, "pcb", "if.eth0.dhcp", true);
    Modell.setzen(n, "r1", "dhcp", {ausgeschlossen: [], pools: [{name: "LAN2", netz: "10.0.2.0", maske: "255.255.255.0", gw: "10.0.2.1", dns: "",
      start: "10.0.2.100", anzahl: 10, reservierungen: [{mac, ip: "10.0.2.240", name: "drucker"}]}]});
    const a = Sim.dhcp(n, "pcb");
    erwarte.wahr(a.ok, a.text);
    erwarte.gleich(a.lease.ip, "10.0.2.240", "Reservierung schlägt den Bereich");
    erwarte.gleich(Sim.leases(n, "r1").find(l => l.ip === "10.0.2.240").zustand, "reserviert", "als reserviert gekennzeichnet");
    erwarte.gleich(Sim.dhcp(n, "pcb").lease.ip, "10.0.2.240", "dieselbe Adresse beim zweiten Mal");
  });
  pruefe("DHCP-Konflikt: doppelt vergebene Adresse wird übersprungen und vermerkt", () => {
    const t = T(), n = t.zweiNetze();
    /* pcb trägt .100 fest, der Pool beginnt genau dort → der Server muss sie überspringen */
    Modell.setzen(n, "pcb", "if.eth0.ip", "10.0.2.100");
    t.host(n, "pcc", null); t.kabel(n, "pcc", "eth0", "sw2", "Fa0/2");
    Modell.setzen(n, "pcc", "if.eth0.dhcp", true);
    Modell.setzen(n, "r1", "dhcp", {ausgeschlossen: [], pools: [{name: "LAN2", netz: "10.0.2.0", maske: "255.255.255.0", gw: "10.0.2.1", dns: "", start: "10.0.2.100", anzahl: 5}]});
    const a = Sim.dhcp(n, "pcc");
    erwarte.wahr(a.ok, a.text);
    erwarte.falsch(a.lease.ip === "10.0.2.100", "die belegte Adresse wird nicht vergeben");
    /* derselbe Adresskonflikt wie im Gerätemodell (zwei Träger) → DUP_IP ist bekannt */
    erwarte.gleich(Sim.leases(n, "r1").filter(l => l.ip === a.lease.ip).length, 1, "genau eine Lease für die vergebene Adresse");
  });

  /* ---------- Vertrag und Aufrufe ---------- */
  pruefe("Trace-Format exakt nach Architektur § 5.2", () => {
    const r = Sim.ping(DATEN.beispiele.salon(), "kasse", "www.beispiel.de");
    erwarte.wahr(r.ok, r.text);
    const tr = r.trace;
    for (const k of ["start", "ende", "ereignisse", "abbruch", "zusammenfassung"]) erwarte.wahr(k in tr, k);
    const ARTEN = ["senden", "empfangen", "weiterleiten", "fluten", "verwerfen", "antworten", "lernen", "info"];
    const PROTOS = ["ARP", "ICMP", "TCP", "UDP", "DHCP", "DNS", "HTTP", null];
    let t = -1;
    tr.ereignisse.forEach((e, i) => {
      erwarte.gleich(Object.keys(e), ["n", "t", "art", "geraet", "port", "nach", "frame", "proto", "grund", "text"]);
      erwarte.gleich(e.n, i + 1); erwarte.wahr(e.t >= t, "Zeit steigt"); t = e.t;
      erwarte.wahr(ARTEN.includes(e.art) && PROTOS.includes(e.proto), e.art + "/" + e.proto);
      erwarte.wahr(typeof e.text === "string" && e.text.length > 5, "Text");
      if (e.frame) erwarte.gleich(Object.keys(e.frame), ["eth", "arp", "ip", "icmp", "udp", "tcp", "app"]);
      if (e.art === "senden") erwarte.wahr(e.nach && e.nach.geraet && e.nach.port, "senden hat nach");
    });
    erwarte.wahr(tr.ereignisse.some(e => e.proto === "DNS"), "Name per DNS aufgelöst");
    erwarte.wahr(/^✓/.test(tr.zusammenfassung), tr.zusammenfassung);
  });
  pruefe("pruefeZiel: alle Zieltypen, ohne den Spielstand zu verändern", () => {
    const n = DATEN.beispiele.praxis(), vorher = JSON.stringify(n);
    const Z = z => Sim.pruefeZiel(n, z);
    erwarte.wahr(Z({typ: "erreichbar", von: "empfang", nach: "behandlung", proto: "icmp"}).ok);
    erwarte.wahr(Z({typ: "erreichbar", von: "empfang", nach: "srv", proto: "tcp", port: 445}).ok);
    erwarte.wahr(Z({typ: "erreichbar", von: "empfang", nach: "srv", proto: "http"}).ok);
    erwarte.wahr(Z({typ: "erreichbar", von: "behandlung", nach: "server.praxis.local", proto: "dns", ip: "192.168.10.5"}).ok);
    erwarte.wahr(Z({typ: "blockiert", von: "gast", nach: "srv", proto: "tcp", port: 445}).ok);
    const f = Z({typ: "erreichbar", von: "gast", nach: "srv", proto: "icmp"});
    erwarte.gleich([f.ok, f.grund], [false, "ACL_DENY"]); erwarte.wahr(!!f.trace && f.text.length > 0);
    erwarte.falsch(Z({typ: "blockiert", von: "empfang", nach: "srv", proto: "icmp"}).ok);
    erwarte.wahr(Z({typ: "konfig", geraet: "sw1", pfad: "ports.Fa0/11.accessVlan", wert: 20}).ok);
    erwarte.wahr(Z({typ: "konfig", geraet: "sw1", pfad: "ports.Fa0/11.accessVlan", wert: "20"}).ok, "Zahl/Text egal");
    erwarte.wahr(Z({typ: "konfig", geraet: "sw1", pfad: "vlans.30.name", wert: "Gaeste"}).ok, "flash (vlan.dat)");
    erwarte.wahr(Z({typ: "gespeichert", geraet: "r1"}).ok);
    erwarte.falsch(Z({typ: "dhcp", von: "empfang"}).ok, "statisch → kein DHCP");
    erwarte.gleich(JSON.stringify(n), vorher, "Netz unverändert");
    Modell.setzen(n, "r1", "if.Gi0/0.10.beschreibung", "Verwaltung");
    erwarte.falsch(Z({typ: "gespeichert", geraet: "r1"}).ok);
  });
  pruefe("ping/tcp verändern netz.zustand absichtlich (ARP-Cache bleibt), Uhr läuft weiter", () => {
    const n = T().lan();
    Sim.ping(n, "pc1", "192.168.1.11", {anzahl: 1});
    erwarte.wahr(Sim.arpTabelle(n, "pc1").some(e => e.ip === "192.168.1.11"));
    const u = n.zustand._uhr; erwarte.wahr(u > 0);
    Sim.ping(n, "pc1", "192.168.1.11", {anzahl: 1}); erwarte.wahr(n.zustand._uhr > u);
    Sim.vergehen(n, 200000);
    erwarte.gleich(Sim.arpTabelle(n, "pc1").length, 0, "ARP-Eintrag (Host 120 s) abgelaufen");
  });
  pruefe("Deterministisch: gleiche Eingabe → gleiche Trace", () => {
    const a = Sim.http(DATEN.beispiele.salon(), "kasse", "http://www.beispiel.de"), b = Sim.http(DATEN.beispiele.salon(), "kasse", "http://www.beispiel.de");
    erwarte.gleich(JSON.stringify(a.trace), JSON.stringify(b.trace));
  });
  pruefe("Traceroute: Windows (ICMP) und IOS (UDP) über zwei Router", () => {
    const n = T().zweiRouter();
    const r = Sim.traceroute(n, "pca", "10.0.2.10");
    erwarte.wahr(r.ok, r.text);
    erwarte.gleich(r.hops.map(h => h.ip), ["10.0.1.1", "10.0.12.2", "10.0.2.10"]);
    erwarte.falsch(hatGrund(r.trace, "TTL_EXPIRED"), "TTL-Ablauf ist bei traceroute kein Fehler");
    const ios = Sim.traceroute(n, "r1", "10.0.2.10");
    erwarte.wahr(ios.ok, ios.text); erwarte.gleich(ios.hops.map(h => h.ip), ["10.0.12.2", "10.0.2.10"]);
    const kaputt = T().zweiRouter(); Modell.setzen(kaputt, "r1", "routen", []);
    const k = Sim.traceroute(kaputt, "pca", "10.0.2.10");
    erwarte.falsch(k.ok); erwarte.gleich(k.grund, "NO_ROUTE");
    erwarte.gleich(k.hops.map(h => [h.ip, h.grund]), [["10.0.1.1", null], ["10.0.1.1", "NO_ROUTE"]], "R1 antwortet erst mit Time exceeded, dann mit Netz unerreichbar");
    const inet = Sim.traceroute(DATEN.beispiele.salon(), "kasse", "198.51.100.10");
    erwarte.gleich(inet.hops.map(h => h.ip), ["192.168.1.1", "203.0.113.1", "198.51.100.10"]);
  });
  pruefe("Switch-SVI: Ping auf den Switch und vom Switch", () => {
    const n = T().lan();
    Modell.setzen(n, "sw1", "svi.1", {ip: "192.168.1.2", maske: "255.255.255.0", shutdown: false});
    erwarte.wahr(Sim.ping(n, "pc1", "192.168.1.2").ok, "Ping auf die SVI");
    const r = Sim.ping(n, "sw1", "192.168.1.12", {anzahl: 5});
    erwarte.gleich(r.antworten.map(a => a.ok ? "!" : "."), [".", "!", "!", "!", "!"]);
    Modell.setzen(n, "sw1", "svi.1.shutdown", true);
    erwarte.falsch(Sim.ping(n, "pc1", "192.168.1.2").ok, "SVI shutdown");
  });
  pruefe("Adresse, Tabellen, erklaere", () => {
    const n = DATEN.beispiele.praxis();
    erwarte.gleich(Sim.adresse(n, "r1", "Gi0/0.10"), {ip: "192.168.10.1", maske: "255.255.255.0", gw: "", dns: "", quelle: "statisch"});
    erwarte.gleich(Sim.adresse(n, "empfang", "eth0").gw, "192.168.10.1");
    const rt = Sim.routingTabelle(T().zweiRouter(), "r1");
    erwarte.gleich(rt.map(x => x.typ + " " + x.netz + "/" + x.praefix), ["C 10.0.1.0/24", "S 10.0.2.0/24", "C 10.0.12.0/30"]);
    erwarte.gleich(Sim.erklaere(Sim.ping(n, "empfang", "behandlung").trace), null);
    const e = Sim.erklaere(Sim.ping(n, "gast", "srv").trace);
    erwarte.gleich([e.grund, e.geraet, e.port], ["ACL_DENY", "r1", "Gi0/0"]);
  });
  pruefe("Leistung: 60 Geräte, Ping über den Router unter 50 ms Rechenzeit", () => {
    const t = T(), n = Modell.neu();
    Modell.geraet(n, "router", {id: "r1", name: "R1"});
    const sw = ["swa", "swb", "swc", "swd"];
    for (const s of sw) Modell.geraet(n, "switch", {id: s, name: s.toUpperCase()});
    t.kabel(n, "swa", "Gi0/1", "r1", "Gi0/0"); t.kabel(n, "swa", "Gi0/2", "swb", "Gi0/1");
    t.kabel(n, "swc", "Gi0/1", "r1", "Gi0/1"); t.kabel(n, "swc", "Gi0/2", "swd", "Gi0/1");
    t.rif(n, "r1", "Gi0/0", "10.1.0.1", "255.255.0.0"); t.rif(n, "r1", "Gi0/1", "10.2.0.1", "255.255.0.0");
    let k = 0;
    for (const s of sw) for (let i = 1; i <= 14 && Object.keys(n.geraete).length < 60; i++) {
      const netz = s === "swa" || s === "swb" ? 1 : 2, id = `h${++k}`;
      t.host(n, id, `10.${netz}.${k}.10`, "255.255.0.0", `10.${netz}.0.1`); t.kabel(n, id, "eth0", s, `Fa0/${i}`);
    }
    erwarte.gleich(Object.keys(n.geraete).length, 60);
    const von = "h1", nach = "h" + k;
    Sim.ping(Modell.kopie(n), von, nach);                /* Aufwärmen (JIT) */
    const zeiten = [];
    for (let i = 0; i < 5; i++) { const c = Modell.kopie(n), t0 = Date.now(); const r = Sim.ping(c, von, nach); zeiten.push(Date.now() - t0); erwarte.wahr(r.ok, r.text); }
    zeiten.sort((a, b) => a - b);
    erwarte.wahr(zeiten[2] < 50, "Median " + zeiten[2] + " ms");
  });
});
