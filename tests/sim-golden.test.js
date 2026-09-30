"use strict";
/* Simulation: Golden-Traces und Pflichtszenarien (Konzept § 10.1, Auftrag SIM). Eigene Testnetze hier, Beispielnetze unverändert. */
gruppe("Sim", () => {
  /* ---------- Testnetze ---------- */
  const T = {};
  T.host = (n, id, ip, maske, gw, typ) => {
    Modell.geraet(n, typ || "pc", {id, name: id.toUpperCase()});
    if (ip != null) Modell.setzen(n, id, "if.eth0.ip", ip);
    Modell.setzen(n, id, "if.eth0.maske", maske || "255.255.255.0");
    if (gw) Modell.setzen(n, id, "if.eth0.gw", gw);
    return n.geraete[id];
  };
  T.kabel = (n, a, pa, b, pb) => { const k = Modell.verbinden(n, {geraet: a, port: pa}, {geraet: b, port: pb}); if (k.fehler) throw new Error(k.fehler); return k; };
  T.rif = (n, r, port, ip, maske, extra) => {
    Modell.setzen(n, r, `if.${port}.ip`, ip); Modell.setzen(n, r, `if.${port}.maske`, maske || "255.255.255.0"); Modell.setzen(n, r, `if.${port}.shutdown`, false);
    for (const [k, v] of Object.entries(extra || {})) Modell.setzen(n, r, `if.${port}.${k}`, v);
  };
  /* PC1 .10, PC2 .11, PC3 .12 an SW1 Fa0/1..3 */
  T.lan = () => {
    const n = Modell.neu();
    Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
    T.host(n, "pc1", "192.168.1.10", null, "192.168.1.1"); T.host(n, "pc2", "192.168.1.11", null, "192.168.1.1"); T.host(n, "pc3", "192.168.1.12", null, "192.168.1.1");
    T.kabel(n, "pc1", "eth0", "sw1", "Fa0/1"); T.kabel(n, "pc2", "eth0", "sw1", "Fa0/2"); T.kabel(n, "pc3", "eth0", "sw1", "Fa0/3");
    return n;
  };
  /* PCA 10.0.1.10 – SW1 – R1 – SW2 – PCB 10.0.2.10 */
  T.zweiNetze = () => {
    const n = Modell.neu();
    Modell.geraet(n, "router", {id: "r1", name: "R1"});
    Modell.geraet(n, "switch", {id: "sw1", name: "SW1"}); Modell.geraet(n, "switch", {id: "sw2", name: "SW2"});
    T.host(n, "pca", "10.0.1.10", null, "10.0.1.1"); T.host(n, "pcb", "10.0.2.10", null, "10.0.2.1");
    T.kabel(n, "pca", "eth0", "sw1", "Fa0/1"); T.kabel(n, "sw1", "Gi0/1", "r1", "Gi0/0");
    T.kabel(n, "r1", "Gi0/1", "sw2", "Gi0/1"); T.kabel(n, "pcb", "eth0", "sw2", "Fa0/1");
    T.rif(n, "r1", "Gi0/0", "10.0.1.1"); T.rif(n, "r1", "Gi0/1", "10.0.2.1");
    return n;
  };
  /* PCA – SW1 – R1 =(10.0.12.0/30)= R2 – SW2 – PCB, statische Routen in beide Richtungen */
  T.zweiRouter = () => {
    const n = Modell.neu();
    Modell.geraet(n, "router", {id: "r1", name: "R1"}); Modell.geraet(n, "router", {id: "r2", name: "R2"});
    Modell.geraet(n, "switch", {id: "sw1", name: "SW1"}); Modell.geraet(n, "switch", {id: "sw2", name: "SW2"});
    T.host(n, "pca", "10.0.1.10", null, "10.0.1.1"); T.host(n, "pcb", "10.0.2.10", null, "10.0.2.1");
    T.kabel(n, "pca", "eth0", "sw1", "Fa0/1"); T.kabel(n, "sw1", "Gi0/1", "r1", "Gi0/0");
    T.kabel(n, "r1", "Gi0/1", "r2", "Gi0/1");
    T.kabel(n, "r2", "Gi0/0", "sw2", "Gi0/1"); T.kabel(n, "pcb", "eth0", "sw2", "Fa0/1");
    T.rif(n, "r1", "Gi0/0", "10.0.1.1"); T.rif(n, "r1", "Gi0/1", "10.0.12.1", "255.255.255.252");
    T.rif(n, "r2", "Gi0/0", "10.0.2.1"); T.rif(n, "r2", "Gi0/1", "10.0.12.2", "255.255.255.252");
    Modell.setzen(n, "r1", "routen", [{netz: "10.0.2.0", maske: "255.255.255.0", nh: "10.0.12.2", aus: null, ad: 1}]);
    Modell.setzen(n, "r2", "routen", [{netz: "10.0.1.0", maske: "255.255.255.0", nh: "10.0.12.1", aus: null, ad: 1}]);
    return n;
  };
  const sendet = (tr, id) => tr.ereignisse.filter(e => e.art === "senden" && (!id || e.geraet === id));
  const mac = (n, id, p) => n.geraete[id].hw.macs[p || "eth0"];
  Sim._test = T;          /* für die zweite Testdatei (sim-gruende) */

  /* ---------- Golden-Traces ---------- */
  pruefe("Golden: erster Ping im selben Netz = ARP-Request (Broadcast), ARP-Reply (Unicast), Echo-Request, Echo-Reply", () => {
    const n = T.lan();
    const r = Sim.ping(n, "pc1", "192.168.1.11", {anzahl: 1});
    erwarte.wahr(r.ok, r.text);
    const h = sendet(r.trace).filter(e => e.geraet === "pc1" || e.geraet === "pc2");
    const art = e => e.frame.arp ? "arp-" + e.frame.arp.op : e.frame.icmp.typ;
    erwarte.gleich(h.map(e => e.geraet + ":" + art(e)), ["pc1:arp-request", "pc2:arp-reply", "pc1:echo-request", "pc2:echo-reply"]);
    erwarte.gleich(h[0].frame.eth.dst, IP.MAC_BROADCAST, "ARP-Anfrage per Broadcast");
    erwarte.gleich(h[1].frame.eth.dst, mac(n, "pc1"), "ARP-Antwort per Unicast an PC1");
    erwarte.gleich(h[2].frame.eth.dst, mac(n, "pc2"), "Echo direkt an die MAC von PC2");
    erwarte.wahr(r.trace.ereignisse.some(e => e.art === "fluten" && e.geraet === "sw1"), "Switch flutet die ARP-Anfrage");
    erwarte.falsch(sendet(r.trace, "sw1").some(e => e.nach.geraet === "pc3" && !e.frame.arp), "PC3 bekommt nur den Broadcast");
  });

  pruefe("Golden: Ping über den Router – ARP fürs Gateway, MAC wechselt, IP bleibt, TTL −1", () => {
    const n = T.zweiNetze();
    const r = Sim.ping(n, "pca", "10.0.2.10", {anzahl: 2});
    erwarte.wahr(r.ok, r.text);
    const arp = sendet(r.trace, "pca").find(e => e.frame.arp);
    erwarte.gleich(arp.frame.arp.targetIp, "10.0.1.1", "PCA fragt nach dem Gateway, nicht nach dem Ziel");
    const kandidaten = sendet(r.trace, "sw1").filter(e => e.frame.icmp && e.frame.icmp.typ === "echo-request" && e.nach.geraet === "r1");
    const vor = kandidaten.find(k => sendet(r.trace, "r1").some(e => e.frame.ip && e.frame.ip.id === k.frame.ip.id));
    const nach = sendet(r.trace, "r1").find(e => e.frame.ip && e.frame.ip.id === vor.frame.ip.id);
    erwarte.wahr(!!nach, "R1 schickt dasselbe Paket weiter");
    erwarte.gleich([nach.frame.ip.src, nach.frame.ip.dst], [vor.frame.ip.src, vor.frame.ip.dst], "IP-Adressen bleiben");
    erwarte.gleich(nach.frame.ip.ttl, vor.frame.ip.ttl - 1, "TTL −1");
    erwarte.gleich(nach.frame.eth.src, mac(n, "r1", "Gi0/1"), "neue Quell-MAC = Router");
    erwarte.gleich(nach.frame.eth.dst, mac(n, "pcb"), "neue Ziel-MAC = PCB");
    erwarte.gleich(vor.frame.eth.dst, mac(n, "r1", "Gi0/0"), "vor dem Router: Ziel-MAC = Gateway");
    erwarte.gleich(r.antworten.filter(a => a.ok).map(a => a.ttl), [127], "Antwort-TTL 128 − 1 Router");
  });

  pruefe("Golden: MAC-Tabelle lernt, unbekanntes Ziel wird geflutet, bekanntes gezielt weitergeleitet", () => {
    const n = T.lan();
    /* PC1 kennt die MAC von PC2 schon (ARP-Cache), der Switch aber nicht → Unicast an unbekannte MAC */
    n.zustand.pc1 = {arp: {"192.168.1.11": {mac: mac(n, "pc2"), bis: 1e9, if: "eth0"}}};
    const r = Sim.ping(n, "pc1", "192.168.1.11", {anzahl: 2});
    erwarte.wahr(r.ok, r.text);
    const fl = r.trace.ereignisse.find(e => e.art === "fluten");
    erwarte.wahr(!!fl && fl.frame.icmp && fl.frame.eth.dst === mac(n, "pc2"), "unbekannter Unicast wird geflutet");
    erwarte.enthaelt(fl.text, "noch nicht");
    erwarte.wahr(r.trace.ereignisse.some(e => e.art === "weiterleiten" && e.geraet === "sw1" && e.frame.icmp && e.frame.icmp.typ === "echo-reply"), "Antwort geht gezielt (PC1 schon gelernt)");
    const tab = Sim.macTabelle(n, "sw1").map(x => x.mac + "@" + x.port).sort();
    erwarte.gleich(tab, [mac(n, "pc1") + "@Fa0/1", mac(n, "pc2") + "@Fa0/2"].sort());
    erwarte.wahr(r.trace.ereignisse.some(e => e.art === "lernen" && e.geraet === "sw1"), "Ereignis „lernen“");
  });

  pruefe("Golden: VLAN trennt Broadcast-Domänen", () => {
    const n = T.lan();
    Modell.vlan(n, "sw1", 10, "A"); Modell.vlan(n, "sw1", 20, "B");
    Modell.setzen(n, "sw1", "ports.Fa0/1.accessVlan", 10); Modell.setzen(n, "sw1", "ports.Fa0/2.accessVlan", 20); Modell.setzen(n, "sw1", "ports.Fa0/3.accessVlan", 10);
    const r = Sim.ping(n, "pc1", "192.168.1.11", {anzahl: 1});
    erwarte.falsch(r.ok);
    erwarte.gleich(r.grund, "DROP_VLAN");
    const ziele = sendet(r.trace, "sw1").map(e => e.nach.geraet);
    erwarte.wahr(ziele.includes("pc3") && !ziele.includes("pc2"), "Broadcast nur in VLAN 10: " + ziele.join(","));
    const e = Sim.erklaere(r.trace);
    erwarte.gleich([e.grund, e.geraet, e.port], ["DROP_VLAN", "sw1", "Fa0/2"]);
    const ok = Sim.ping(n, "pc1", "192.168.1.12", {anzahl: 1});
    erwarte.wahr(ok.ok, "gleiches VLAN geht");
  });

  pruefe("Golden: Trunk trägt den 802.1Q-Tag, Access-Ports nicht", () => {
    const n = Modell.neu();
    Modell.geraet(n, "switch", {id: "sw1", name: "SW1"}); Modell.geraet(n, "switch", {id: "sw2", name: "SW2"});
    for (const s of ["sw1", "sw2"]) { Modell.vlan(n, s, 10, "Buero"); Modell.setzen(n, s, "ports.Gi0/1.modus", "trunk"); Modell.setzen(n, s, "ports.Fa0/1.accessVlan", 10); }
    T.host(n, "pc1", "192.168.10.10"); T.host(n, "pc2", "192.168.10.20");
    T.kabel(n, "pc1", "eth0", "sw1", "Fa0/1"); T.kabel(n, "pc2", "eth0", "sw2", "Fa0/1"); T.kabel(n, "sw1", "Gi0/1", "sw2", "Gi0/1");
    const r = Sim.ping(n, "pc1", "192.168.10.20", {anzahl: 1});
    erwarte.wahr(r.ok, r.text);
    const trunk = r.trace.ereignisse.filter(e => e.art === "senden" && e.port === "Gi0/1");
    erwarte.wahr(trunk.length >= 2 && trunk.every(e => e.frame.eth.vlan === 10), "auf dem Trunk Tag 10");
    erwarte.wahr(sendet(r.trace).filter(e => e.port === "Fa0/1").every(e => e.frame.eth.vlan === null), "Access-Port ungetaggt");
  });

  pruefe("Router-on-a-Stick (praxis): Empfang ↔ Behandlung klappt, Gast → Server scheitert mit ACL_DENY", () => {
    const n = DATEN.beispiele.praxis();
    const r = Sim.ping(n, "empfang", "behandlung");
    erwarte.wahr(r.ok, r.text);
    const trunk = sendet(r.trace, "sw1").filter(e => e.port === "Gi0/1");
    erwarte.wahr(trunk.some(e => e.frame.eth.vlan === 10) && trunk.some(e => e.frame.eth.vlan === 20), "Trunk trägt VLAN 10 und 20");
    const g = Sim.ping(n, "gast", "srv");
    erwarte.falsch(g.ok); erwarte.gleich(g.grund, "ACL_DENY");
    erwarte.wahr(g.antworten.some(a => a.art === "unreachable" && a.code === "admin" && a.von === "192.168.30.1"), "R1 meldet administratively prohibited");
    erwarte.enthaelt(Sim.erklaere(g.trace).text, "GAST");
    const tcp = Sim.tcp(n, "gast", "srv", 445);
    erwarte.falsch(tcp.ok); erwarte.gleich(tcp.grund, "ACL_DENY");
    erwarte.wahr(Sim.ping(n, "gast", "192.168.30.1").ok, "Gast erreicht sein Gateway (ACL filtert nur Weitergeleitetes nach Regel)");
    erwarte.gleich(Sim.ping(n, "gast", "behandlung").grund, "ACL_DENY");
    erwarte.wahr(Sim.tcp(n, "empfang", "srv", 445).ok, "Empfang erreicht die Dateifreigabe");
    const d = Sim.dns(n, "behandlung", "server.praxis.local");
    erwarte.gleich([d.ok, d.ip], [true, "192.168.10.5"]);
  });

  pruefe("Router-on-a-Stick (praxis + Internet): Gast darf ins Internet (permit any), aber nicht in VLAN 10/20", () => {
    const n = DATEN.beispiele.praxis();
    Modell.geraet(n, "internet", {id: "inet"});
    T.kabel(n, "r1", "Gi0/1", "inet", "wan0");
    T.rif(n, "r1", "Gi0/1", "203.0.113.2", "255.255.255.252", {nat: "outside"});
    for (const v of [10, 20, 30]) Modell.setzen(n, "r1", `if.Gi0/0.${v}.nat`, "inside");
    Modell.setzen(n, "inet", "if.wan0.ip", "203.0.113.1"); Modell.setzen(n, "inet", "if.wan0.maske", "255.255.255.252");
    Modell.setzen(n, "r1", "routen", [{netz: "0.0.0.0", maske: "0.0.0.0", nh: "203.0.113.1", aus: null, ad: 1}]);
    const acls = tief(n.geraete.r1.running.acls);
    acls.NAT = {typ: "standard", benannt: true, regeln: [{aktion: "permit", proto: "ip", quelle: {ip: "192.168.0.0", wc: "0.0.255.255"}, ziel: null, zielPort: null, quellPort: null, icmpTyp: null}]};
    Modell.setzen(n, "r1", "acls", acls);
    Modell.setzen(n, "r1", "nat", {statisch: [], dynamisch: [{acl: "NAT", aus: "Gi0/1", overload: true}]});
    const r = Sim.ping(n, "gast", "198.51.100.10");
    erwarte.wahr(r.ok, r.text);
    erwarte.gleich(Sim.ping(n, "gast", "srv").grund, "ACL_DENY");
  });

  pruefe("NAT/PAT ins Internet (salon): Kasse pingt 198.51.100.10 und öffnet http://www.beispiel.de", () => {
    const n = DATEN.beispiele.salon();
    const r = Sim.ping(n, "kasse", "198.51.100.10");
    erwarte.wahr(r.ok, r.text);
    const raus = sendet(r.trace, "r1").find(e => e.port === "Gi0/1" && e.frame.icmp && e.frame.icmp.typ === "echo-request");
    erwarte.gleich(raus.frame.ip.src, "203.0.113.2", "PAT: Quelle ist die öffentliche Adresse");
    const rein = sendet(r.trace, "r1").find(e => e.port === "Gi0/0" && e.frame.icmp && e.frame.icmp.typ === "echo-reply");
    erwarte.gleich(rein.frame.ip.dst, "192.168.1.10", "zurückübersetzt");
    erwarte.wahr(Sim.natTabelle(n, "r1").some(e => e.innen === "192.168.1.10" && e.aussen === "203.0.113.2"), "Übersetzungstabelle");
    const h = Sim.http(n, "kasse", "http://www.beispiel.de");
    erwarte.wahr(h.ok, h.text); erwarte.gleich(h.status, 200);
    erwarte.wahr(h.trace.ereignisse.some(e => e.proto === "DNS"), "DNS in derselben Trace");
    const flags = sendet(h.trace, "kasse").filter(e => e.frame.tcp).map(e => e.frame.tcp.flags.join("+"));
    erwarte.gleich(flags.slice(0, 2), ["SYN", "ACK"], "Handshake vom Client: SYN, dann ACK");
    erwarte.wahr(sendet(h.trace, "inet").some(e => e.frame.tcp && e.frame.tcp.flags.join("+") === "SYN+ACK"), "Server: SYN/ACK");
  });

  pruefe("Fehlendes NAT → NAT_MISSING (auch bei vertauschtem inside/outside)", () => {
    const n = DATEN.beispiele.salon();
    Modell.setzen(n, "r1", "nat", {statisch: [], dynamisch: []});
    const r = Sim.ping(n, "kasse", "198.51.100.10");
    erwarte.falsch(r.ok); erwarte.gleich(r.grund, "NAT_MISSING");
    erwarte.gleich(Sim.erklaere(r.trace).geraet, "inet");
    const v = DATEN.beispiele.salon();
    Modell.setzen(v, "r1", "if.Gi0/0.nat", "outside"); Modell.setzen(v, "r1", "if.Gi0/1.nat", "inside");
    erwarte.gleich(Sim.ping(v, "kasse", "198.51.100.10").grund, "NAT_MISSING");
  });

  pruefe("Fehlende Rückroute → NO_RETURN_ROUTE (Timeout, keine Meldung beim Absender)", () => {
    const n = T.zweiRouter();
    erwarte.wahr(Sim.ping(n, "pca", "10.0.2.10").ok, "mit beiden Routen");
    Modell.setzen(n, "r2", "routen", []);
    const r = Sim.ping(n, "pca", "10.0.2.10");
    erwarte.falsch(r.ok); erwarte.gleich(r.grund, "NO_RETURN_ROUTE");
    erwarte.wahr(r.antworten.every(a => a.art === "timeout"), "Absender sieht nur Timeouts");
    erwarte.gleich(Sim.erklaere(r.trace).geraet, "r2");
  });

  pruefe("DHCP über Relay (ip helper-address): giaddr bestimmt den Pool", () => {
    const n = T.zweiNetze();
    Modell.geraet(n, "server", {id: "srv", name: "SRV"});
    T.kabel(n, "srv", "eth0", "sw1", "Fa0/2");
    for (const [k, v] of Object.entries({ip: "10.0.1.5", maske: "255.255.255.0", gw: "10.0.1.1"})) Modell.setzen(n, "srv", "if.eth0." + k, v);
    Modell.setzen(n, "srv", "dienste.dhcp", {an: true, pools: [
      {name: "Netz1", netz: "10.0.1.0", maske: "255.255.255.0", gw: "10.0.1.1", dns: "10.0.1.5", start: "10.0.1.100", anzahl: 50},
      {name: "Netz2", netz: "10.0.2.0", maske: "255.255.255.0", gw: "10.0.2.1", dns: "10.0.1.5", start: "10.0.2.100", anzahl: 50}]});
    Modell.setzen(n, "pcb", "if.eth0.dhcp", true);
    const ohne = Sim.dhcp(Modell.kopie(n), "pcb");
    erwarte.falsch(ohne.ok, "ohne Relay kein Angebot"); erwarte.gleich(ohne.grund, "DHCP_NO_OFFER");
    Modell.setzen(n, "r1", "if.Gi0/1.helper", ["10.0.1.5"]);
    const r = Sim.dhcp(n, "pcb");
    erwarte.wahr(r.ok, r.text);
    erwarte.gleich([r.lease.ip, r.lease.maske, r.lease.gw], ["10.0.2.100", "255.255.255.0", "10.0.2.1"]);
    erwarte.wahr(r.trace.ereignisse.some(e => e.geraet === "r1" && e.art === "weiterleiten" && e.frame && e.frame.app && e.frame.app.felder.relay === "10.0.2.1"), "Relay setzt giaddr");
    const infos = r.trace.ereignisse.filter(e => e.art === "senden" && e.frame.app && e.frame.app.proto === "DHCP" && (e.geraet === "pcb" || e.nach.geraet === "pcb")).map(e => e.frame.app.felder.typ);
    erwarte.gleich([...new Set(infos)], ["discover", "offer", "request", "ack"], "DORA");
    erwarte.gleich(Sim.adresse(n, "pcb", "eth0").quelle, "dhcp");
    erwarte.wahr(Sim.ping(n, "pcb", "10.0.1.5").ok, "mit Lease erreichbar");
    erwarte.gleich(Sim.leases(n, "srv").map(l => l.ip), ["10.0.2.100"]);
  });

  pruefe("DHCP ohne Server → APIPA 169.254.x.x und DHCP_NO_OFFER", () => {
    const n = T.lan();
    Modell.setzen(n, "pc1", "if.eth0.dhcp", true);
    const r = Sim.dhcp(n, "pc1");
    erwarte.falsch(r.ok); erwarte.gleich(r.grund, "DHCP_NO_OFFER");
    const a = Sim.adresse(n, "pc1", "eth0");
    erwarte.gleich([a.quelle, a.maske], ["apipa", "255.255.0.0"]); erwarte.wahr(IP.apipa(a.ip), a.ip);
    const p = Sim.ping(n, "pc1", "192.168.1.11");
    erwarte.falsch(p.ok); erwarte.gleich(p.grund, "DHCP_NO_OFFER");
  });

  pruefe("Schleife ohne STP → Broadcast-Sturm (STORM, sauberer Abbruch)", () => {
    const n = T.lan();
    Modell.geraet(n, "switch", {id: "sw2", name: "SW2"});
    T.kabel(n, "sw1", "Gi0/1", "sw2", "Gi0/1"); T.kabel(n, "sw1", "Gi0/2", "sw2", "Gi0/2");
    const r = Sim.ping(n, "pc1", "192.168.1.11", {anzahl: 1});
    erwarte.gleich(r.trace.abbruch, "STORM"); erwarte.falsch(r.ok); erwarte.gleich(r.grund, "STORM");
    erwarte.wahr(r.trace.ereignisse.length <= Sim.BUDGET, "Budget eingehalten");
    erwarte.gleich(Sim.erklaere(r.trace).grund, "STORM");
  });

  pruefe("Port-Security: fremde MAC → err-disabled, Grund PORTSEC_VIOLATION", () => {
    const n = T.lan();
    Modell.setzen(n, "sw1", "ports.Fa0/1.portSecurity", {max: 1, verstoss: "shutdown", macs: ["02:00:00:00:00:99"]});
    const r = Sim.ping(n, "pc1", "192.168.1.11", {anzahl: 1});
    erwarte.falsch(r.ok); erwarte.gleich(r.grund, "PORTSEC_VIOLATION");
    erwarte.wahr(n.zustand.sw1.errdisabled["Fa0/1"] === true, "err-disabled");
    erwarte.gleich(Modell.portAn(n, "sw1", "Fa0/1").grund, "PORTSEC_VIOLATION");
    const zwei = Sim.ping(n, "pc1", "192.168.1.11", {anzahl: 1});
    erwarte.gleich(zwei.grund, "PORTSEC_VIOLATION", "Port bleibt aus");
    const erlaubt = T.lan();
    Modell.setzen(erlaubt, "sw1", "ports.Fa0/1.portSecurity", {max: 1, verstoss: "shutdown", macs: [mac(erlaubt, "pc1")]});
    erwarte.wahr(Sim.ping(erlaubt, "pc1", "192.168.1.11", {anzahl: 1}).ok, "erlaubte MAC geht");
  });

  pruefe("Erster Ping über den Router: .!!!! (IOS verwirft, solange ARP läuft)", () => {
    const n = T.zweiNetze();
    const r = Sim.ping(n, "r1", "10.0.2.10", {anzahl: 5});
    erwarte.gleich(r.antworten.map(a => a.ok ? "!" : "."), [".", "!", "!", "!", "!"]);
    erwarte.gleich(r.antworten[0].grund, "TIMEOUT");
    const vomPc = Sim.ping(T.zweiNetze(), "pca", "10.0.2.10");
    erwarte.gleich(vomPc.antworten.map(a => a.ok ? "!" : "."), [".", "!", "!", "!"], "auch vom PC aus");
    erwarte.enthaelt(vomPc.text, "ARP");
    erwarte.gleich(Sim.ping(n, "r1", "10.0.2.10", {anzahl: 5}).antworten.map(a => a.ok ? "!" : "."), ["!", "!", "!", "!", "!"], "ARP-Cache bleibt");
  });
});
