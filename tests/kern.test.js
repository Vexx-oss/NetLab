"use strict";
gruppe("Kern", () => {
  pruefe("IP: Umrechnung hin und zurück", () => {
    erwarte.gleich(IP.zuText(IP.zuZahl("192.168.1.70")), "192.168.1.70");
    erwarte.gleich(IP.zuZahl("256.1.1.1"), null);
    erwarte.gleich(IP.zuZahl("10.0.0"), null);
  });
  pruefe("IP: Netz, Broadcast, Präfix gegen Bitrechnung (2000 Fälle)", () => {
    const z = Zufall(7); let f = 0;
    for (let t = 0; t < 2000; t++) {
      const ip = [z.zahl(256), z.zahl(256), z.zahl(256), z.zahl(256)].join("."), p = z.zahl(33);
      const bits = ip.split(".").map(x => (+x).toString(2).padStart(8, "0")).join("");
      const nz = parseInt(bits.slice(0, p) + "0".repeat(32 - p), 2), bc = parseInt(bits.slice(0, p) + "1".repeat(32 - p), 2);
      const m = IP.maske(p);
      if (IP.zuZahl(IP.netz(ip, m)) !== nz || IP.zuZahl(IP.broadcast(ip, m)) !== bc || IP.praefix(m) !== p) f++;
    }
    erwarte.gleich(f, 0, "Abweichungen");
  });
  pruefe("IP: Masken gültig/ungültig", () => {
    erwarte.wahr(IP.maskeGueltig("255.255.255.192")); erwarte.falsch(IP.maskeGueltig("255.255.0.255")); erwarte.wahr(IP.maskeGueltig("0.0.0.0"));
  });
  pruefe("IP: private Bereiche nach RFC 1918", () => {
    for (const a of ["10.1.2.3", "172.16.0.1", "172.31.255.254", "192.168.0.1"]) erwarte.wahr(IP.privat(a), a);
    for (const a of ["172.32.0.1", "11.0.0.1", "192.169.0.1", "203.0.113.5"]) erwarte.falsch(IP.privat(a), a);
  });
  pruefe("IP: Wildcard wie in ACLs", () => {
    erwarte.wahr(IP.wildcardPasst("192.168.30.77", "192.168.30.0", "0.0.0.255"));
    erwarte.falsch(IP.wildcardPasst("192.168.31.77", "192.168.30.0", "0.0.0.255"));
    erwarte.wahr(IP.wildcardPasst("8.8.8.8", "0.0.0.0", "255.255.255.255"));
  });
  pruefe("MAC-Formate", () => {
    erwarte.gleich(IP.macCisco("00:60:2f:3a:1b:01"), "0060.2f3a.1b01");
    erwarte.gleich(IP.macWindows("00:60:2f:3a:1b:01"), "00-60-2F-3A-1B-01");
  });
  pruefe("Zufall ist deterministisch", () => {
    const a = Zufall(42), b = Zufall(42);
    erwarte.gleich([a.zahl(100), a.zahl(100), a.zahl(100)], [b.zahl(100), b.zahl(100), b.zahl(100)]);
  });
  pruefe("store: Cache mit Durchschreiben", () => {
    store.set("probe", {a: 1}); const x = store.get("probe"); x.a = 2; erwarte.gleich(store.get("probe"), {a: 1});
  });
  pruefe("Lernmotor ist eingebunden und nutzt den Labor-Speicher", () => {
    L.skill("lab.probe", "Probe", "Netzwerk", "AP1", "labor");
    L.ueben("lab.probe", true);
    erwarte.wahr(L.versucht("lab.probe")); erwarte.wahr(!!store.get("lern").units["lab.probe"]);
  });
});

gruppe("Modell", () => {
  pruefe("Gerät anlegen, Ports, MACs eindeutig", () => {
    const n = Modell.neu();
    for (let i = 0; i < 20; i++) Modell.geraet(n, "switch");
    const macs = Object.values(n.geraete).flatMap(g => Object.values(g.hw.macs));
    erwarte.gleich(new Set(macs).size, macs.length);
    erwarte.gleich(Modell.ports(n.geraete.sw1).length, 26);
  });
  pruefe("Verbinden wählt freien Port, Uplink auf Gi", () => {
    const n = Modell.neu(); Modell.geraet(n, "switch", {id: "sw1"}); Modell.geraet(n, "router", {id: "r1"}); Modell.geraet(n, "pc", {id: "pc1"});
    const k1 = Modell.verbinden(n, {geraet: "sw1"}, {geraet: "r1"}); erwarte.gleich(k1.a.port, "Gi0/1"); erwarte.gleich(k1.b.port, "Gi0/0");
    const k2 = Modell.verbinden(n, {geraet: "pc1"}, {geraet: "sw1"}); erwarte.gleich(k2.b.port, "Fa0/1");
    erwarte.wahr(Modell.verbinden(n, {geraet: "pc1"}, {geraet: "r1"}).fehler, "PC hat nur einen Port");
  });
  pruefe("Router-Schnittstellen sind ab Werk abgeschaltet (IOS)", () => {
    const n = Modell.neu(); Modell.geraet(n, "router", {id: "r1"}); Modell.geraet(n, "switch", {id: "sw1"});
    const k = Modell.verbinden(n, {geraet: "r1"}, {geraet: "sw1"});
    erwarte.gleich(Modell.linkOben(n, k).oben, false); erwarte.gleich(Modell.linkOben(n, k).grund, "PORT_SHUTDOWN");
    Modell.setzen(n, "r1", "if.Gi0/0.shutdown", false); erwarte.gleich(Modell.linkOben(n, k).oben, true);
  });
  pruefe("Pfade mit Subinterfaces", () => {
    erwarte.gleich(Modell.pfad("if.Gi0/0.10.ip"), ["if", "Gi0/0.10", "ip"]);
    erwarte.gleich(Modell.pfad("if.Gi0/0.10"), ["if", "Gi0/0.10"]);
    erwarte.gleich(Modell.pfad("if.Gi0/0.ip"), ["if", "Gi0/0", "ip"]);
    const n = Modell.neu(); Modell.geraet(n, "router", {id: "r1"});
    Modell.setzen(n, "r1", "if.Gi0/0.20.ip", "10.0.20.1");
    erwarte.gleich(n.geraete.r1.running.if["Gi0/0.20"].ip, "10.0.20.1");
  });
  pruefe("Neustart lädt startup-config, VLANs bleiben (vlan.dat)", () => {
    const n = DATEN.beispiele.praxis();
    Modell.setzen(n, "sw1", "ports.Fa0/2.accessVlan", 20);
    Modell.neustart(n, "sw1");
    erwarte.gleich(n.geraete.sw1.running.ports["Fa0/2"].accessVlan, 10);
    Modell.startupLoeschen(n.geraete.sw1); Modell.neustart(n, "sw1");
    erwarte.gleich(n.geraete.sw1.running.ports["Fa0/2"].accessVlan, 1);
    erwarte.wahr(!!n.geraete.sw1.flash.vlans["20"], "VLAN 20 überlebt write erase");
  });
  pruefe("Live-Prüfung: Gateway außerhalb des Netzes", () => {
    const n = DATEN.beispiele.salon(); Modell.setzen(n, "kasse", "if.eth0.gw", "192.168.2.1");
    const w = Modell.pruefen(n); erwarte.wahr(w.some(x => x.code === "GW_WRONG_SUBNET" && x.geraet === "kasse"));
  });
  pruefe("Verlauf: rückgängig und wiederholen", () => {
    const n = DATEN.beispiele.salon(); const v = Modell.verlauf(n);
    v.aendern("Gateway", nn => Modell.setzen(nn, "kasse", "if.eth0.gw", "192.168.1.254"));
    erwarte.gleich(n.geraete.kasse.running.if.eth0.gw, "192.168.1.254");
    v.zurueck(); erwarte.gleich(n.geraete.kasse.running.if.eth0.gw, "192.168.1.1");
    v.vor(); erwarte.gleich(n.geraete.kasse.running.if.eth0.gw, "192.168.1.254");
  });
});
