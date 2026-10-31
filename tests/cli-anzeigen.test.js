"use strict";
/* CLI-ANZEIGEN (CLI-07, W2/Tier 2, 31.10.2026): Anzeigen aus der Simulation – eine Wahrheit.
   Sim-Getter: src/sim/aufrufe.js:578-592 (routingTabelle, arpTabelle, macTabelle).
   Vorher rechnete die CLI Routen/ARP/MAC selbst nach (ios-ausgaben.js:135,153-174,219-234) und zeigte
   eine Route als aktiv, die die Simulation nicht aktiviert (Ausgangs-IF ohne IP).
   Geprüft wird der ZUSTAND aus der Sim, nicht nur der Text. */
gruppe("CLI: Anzeigen aus der Simulation", () => {
  const e = (s, ...z) => { let r; for (const x of z) r = CLI.eingabe(s, x); return r; };

  pruefe("show ip route zeigt keine Route, die die Simulation nicht aktiviert (Ausgangs-IF ohne IP)", () => {
    const n = Modell.neu();
    Modell.geraet(n, "router", {id: "r1", name: "R1"});
    Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
    Modell.verbinden(n, {geraet: "sw1", port: "Gi0/1"}, {geraet: "r1", port: "Gi0/1"});
    const s = CLI.sitzung(n, "r1");
    e(s, "enable", "configure terminal",
      "interface Gi0/0", "ip address 10.0.0.1 255.255.255.0", "no shutdown", "exit",
      "interface Gi0/1", "no shutdown", "exit",
      "ip route 10.9.0.0 255.255.0.0 Gi0/1", "end");
    const sim = Sim.routingTabelle(n, "r1");
    erwarte.falsch(sim.some(r => r.netz === "10.9.0.0"), "Testaufbau: die Sim aktiviert die Route nicht (Ausgangs-IF ohne IP)");
    const aus = e(s, "show ip route").ausgabe;
    erwarte.falsch(/10\.9\.0\.0/.test(aus), "die CLI zeigt keine Route, die nicht routet: " + aus);
  });

  pruefe("show ip route ist deckungsgleich mit Sim.routingTabelle", () => {
    const n = Modell.neu();
    Modell.geraet(n, "router", {id: "r1", name: "R1"});
    Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
    Modell.verbinden(n, {geraet: "sw1", port: "Gi0/2"}, {geraet: "r1", port: "Gi0/0"});
    const s = CLI.sitzung(n, "r1");
    e(s, "enable", "configure terminal",
      "interface Gi0/0", "ip address 10.0.0.1 255.255.255.0", "no shutdown", "exit",
      "ip route 10.9.0.0 255.255.0.0 10.0.0.254", "end");
    const sim = Sim.routingTabelle(n, "r1");
    erwarte.wahr(sim.length > 0, "die Sim hat eine Routingtabelle");
    const aus = e(s, "show ip route").ausgabe;
    for (const r of sim) erwarte.enthaelt(aus, r.netz + "/" + r.praefix, "Sim-Route " + r.netz + "/" + r.praefix + " steht in der Anzeige");
    /* Keine Route in der Anzeige, die die Sim nicht kennt – nur Code-Zeilen (L/C/S) zählen, nicht Gruppenköpfe.
       L (local) leitet sich aus Sim.schnittstellen ab, alle anderen müssen in Sim.routingTabelle stehen. */
    const bekannt = new Set(sim.map(r => r.netz + "/" + r.praefix));
    const eigene = new Set((Sim.schnittstellen(n, "r1") || []).filter(i => i.oben && i.ip).map(i => i.ip + "/32"));
    const angezeigt = [...aus.matchAll(/^\s*([LCS])\*?\s+(\d+\.\d+\.\d+\.\d+)\/(\d+)/gm)].map(m => ({code: m[1], x: m[2] + "/" + m[3]}));
    for (const z of angezeigt) erwarte.wahr(z.code === "L" ? (eigene.has(z.x) || bekannt.has(z.x)) : bekannt.has(z.x),
      "Anzeige-Route " + z.code + " " + z.x + " stammt aus der Sim");
  });

  pruefe("show ip arp enthält die Einträge aus Sim.arpTabelle", () => {
    const n = Modell.neu();
    Modell.geraet(n, "router", {id: "r1", name: "R1"});
    Modell.geraet(n, "pc", {id: "pc1", name: "PC1"});
    Modell.verbinden(n, {geraet: "r1", port: "Gi0/1"}, {geraet: "pc1"});
    Modell.setzen(n, "pc1", "if.eth0.ip", "10.0.1.2");
    Modell.setzen(n, "pc1", "if.eth0.maske", "255.255.255.0");
    const s = CLI.sitzung(n, "r1");
    e(s, "enable", "configure terminal", "interface Gi0/1", "ip address 10.0.1.1 255.255.255.0", "no shutdown", "exit", "end");
    e(s, "ping 10.0.1.2");
    const sim = Sim.arpTabelle(n, "r1");
    erwarte.wahr(sim.some(a => a.ip === "10.0.1.2"), "die Sim hat den ARP-Eintrag gelernt: " + JSON.stringify(sim));
    const aus = e(s, "show ip arp").ausgabe;
    for (const a of sim) erwarte.enthaelt(aus, a.ip, "ARP-Eintrag " + a.ip + " aus der Sim steht in der Anzeige");
  });

  pruefe("show mac address-table enthält die Einträge aus Sim.macTabelle", () => {
    const n = Modell.neu();
    Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
    Modell.geraet(n, "pc", {id: "pc1", name: "PC1"});
    Modell.geraet(n, "pc", {id: "pc2", name: "PC2"});
    Modell.verbinden(n, {geraet: "pc1"}, {geraet: "sw1", port: "Fa0/1"});
    Modell.verbinden(n, {geraet: "pc2"}, {geraet: "sw1", port: "Fa0/2"});
    Modell.setzen(n, "pc1", "if.eth0.ip", "192.168.1.10"); Modell.setzen(n, "pc1", "if.eth0.maske", "255.255.255.0");
    Modell.setzen(n, "pc2", "if.eth0.ip", "192.168.1.11"); Modell.setzen(n, "pc2", "if.eth0.maske", "255.255.255.0");
    Sim.ping(n, "pc1", "192.168.1.11");
    const sim = Sim.macTabelle(n, "sw1");
    erwarte.wahr(sim.length >= 2, "die Sim hat MAC-Adressen gelernt: " + JSON.stringify(sim));
    const s = CLI.sitzung(n, "sw1"); e(s, "enable");
    const aus = e(s, "show mac address-table").ausgabe;
    for (const m of sim) erwarte.enthaelt(aus, IP.macCisco(m.mac), "MAC " + m.mac + " aus der Sim steht in der Anzeige");
  });

  pruefe("show interfaces switchport, show vlan id und MAC-Filter liefern Modellwerte", () => {
    const n = Modell.neu(); Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
    Modell.geraet(n, "pc", {id: "pc1", name: "PC1"}); Modell.geraet(n, "pc", {id: "pc2", name: "PC2"});
    Modell.verbinden(n, {geraet: "pc1"}, {geraet: "sw1", port: "Fa0/1"});
    Modell.verbinden(n, {geraet: "pc2"}, {geraet: "sw1", port: "Fa0/2"});
    Modell.setzen(n, "pc1", "if.eth0.ip", "192.168.20.10"); Modell.setzen(n, "pc1", "if.eth0.maske", "255.255.255.0");
    Modell.setzen(n, "pc2", "if.eth0.ip", "192.168.20.11"); Modell.setzen(n, "pc2", "if.eth0.maske", "255.255.255.0");
    const s = CLI.sitzung(n, "sw1");
    e(s, "enable", "configure terminal", "vlan 20", "name Verwaltung", "exit",
      "interface Fa0/1", "switchport access vlan 20", "switchport mode access", "exit",
      "interface Fa0/2", "switchport access vlan 20", "switchport mode access", "exit", "end");
    Sim.ping(n, "pc1", "192.168.20.11");
    const sw = e(s, "show interfaces switchport").ausgabe;
    erwarte.enthaelt(sw, "Access Mode VLAN: 20", "show interfaces switchport nennt das Zugriffs-VLAN");
    erwarte.passt(sw, /Name:\s+Fa0\/1/m, "der Port ist aufgeführt");
    const vlan = e(s, "show vlan id 20").ausgabe;
    erwarte.enthaelt(vlan, "Verwaltung", "show vlan id 20 nennt den VLAN-Namen");
    erwarte.enthaelt(vlan, "Fa0/1", "show vlan id 20 nennt den Port");
    const mac = e(s, "show mac address-table interface Fa0/1").ausgabe;
    erwarte.enthaelt(mac, "Fa0/1", "MAC-Tabelle lässt sich auf eine Schnittstelle filtern");
    erwarte.falsch(/Fa0\/2/.test(mac), "der Filter zeigt keinen fremden Port");
  });
});
