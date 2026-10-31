"use strict";
/* CLI-RUNNINGCONFIG (CLI-02, 31.10.2026): show running-config ist wiedereinspielbar.
   Vertrag docs/Architektur.md § 6.1/§ 6.2: Wiedergabeweg beginnt mit configure terminal; danach ist der Text
   zeichengleich und die Modell-Kernfelder sind gleich. VLAN-Datenbank (flash.vlans) gehört nicht zur
   running-config (wie auf IOS). Verglichen wird der ZUSTAND, nicht nur der Text.
   Aufrufpfade: CLI.runningConfig src/cli/ios-ausgaben.js:733; iosText :664-705; poolZeilen :658-659;
   CLI.anwenden src/cli/entspricht.js:161-192; Typ-Präfixe ios-befehle.js:240-276, :818; Filter parser.js:586. */
gruppe("CLI: running-config Roundtrip", () => {
  const e = (s, ...zeilen) => { let r; for (const z of zeilen) r = CLI.eingabe(s, z); return r; };
  const kern = g => ({
    hostname: g.running.hostname, if: g.running.if, ports: g.running.ports, svi: g.running.svi,
    dhcp: g.running.dhcp, acls: g.running.acls, routen: g.running.routen, nat: g.running.nat,
    snooping: g.running.snooping, lines: g.running.lines, banner: g.running.banner,
  });
  /* Frisches Gerät desselben Typs; running-config einspielen (Wiedergabeweg mit configure terminal, § 6.1). */
  const runde = (quelle, id, typ) => {
    const text = CLI.runningConfig(quelle.geraete[id]);
    const frisch = Modell.neu();
    Modell.geraet(frisch, typ, {id, name: quelle.geraete[id].name});
    const r = CLI.anwenden(frisch, id, "configure terminal\n" + text);
    return {text, frisch, g: frisch.geraete[id], r};
  };
  const routerNetz = () => {
    const n = Modell.neu();
    Modell.geraet(n, "router", {id: "r1", name: "R1"});
    const s = CLI.sitzung(n, "r1");
    e(s, "enable", "configure terminal", "hostname R1",
      "enable secret Geheim1", "username admin secret geheim", "service password-encryption",
      "line console 0", "password konsole", "login", "exit",
      "ip domain-name labor.local", "no ip domain-lookup",
      "ip route 10.9.0.0 255.255.0.0 10.0.0.254",
      "ip access-list standard VERW", "permit 10.0.0.0 0.0.0.255", "exit",
      "ip nat inside source list 1 interface Gi0/0 overload",
      "interface Gi0/0", "ip address 10.0.0.1 255.255.255.0", "no shutdown", "ip nat inside", "description Uplink", "exit",
      "ip dhcp pool LAN", "network 192.168.44.0 255.255.255.0", "default-router 192.168.44.1",
      "dns-server 192.168.44.53", "lease 2", "domain-name labor.local",
      "host drucker", "hardware-address 0200.aabb.cc01", "ip 192.168.44.50", "exit", "exit", "end");
    return n;
  };

  pruefe("Router: running-config ist vollständig einspielbar, danach gleiche Kernfelder und gleicher Text", () => {
    const n = routerNetz();
    const {text, g, r} = runde(n, "r1", "router");
    erwarte.gleich([r.ok, r.fehler.length], [true, 0], "jede Zeile ist einspielbar: " + JSON.stringify(r.fehler.map(x => x.toString())).slice(0, 600));
    erwarte.gleich(kern(g), kern(n.geraete.r1), "Kernfelder nach dem Einspielen gleich");
    erwarte.gleich(CLI.runningConfig(g), text, "Text ist nach dem Einspielen zeichengleich");
    /* Der Wiedergabeweg verliert keine Zeile: Anzahl der Konfigurationszeilen (ohne !/end) bleibt gleich. */
    const zeilen = t => t.split("\n").filter(z => z.trim() && !/^\s*!/.test(z) && z.trim() !== "end").length;
    erwarte.gleich(zeilen(CLI.runningConfig(g)), zeilen(text), "gleiche Zahl wirksamer Konfigurationszeilen");
  });

  pruefe("Router: DHCP-Pool vollständig — lease, domain-name, host/hardware-address/ip stehen in der Anzeige", () => {
    const n = routerNetz();
    const text = CLI.runningConfig(n.geraete.r1);
    for (const z of [" lease 2", " domain-name labor.local", " host drucker", " hardware-address 0200.aabb.cc01", " ip 192.168.44.50"])
      erwarte.enthaelt(text, z, "running-config zeigt die gesetzte DHCP-Option");
    const {g, r} = runde(n, "r1", "router");
    erwarte.gleich([r.ok, r.fehler.length], [true, 0]);
    erwarte.gleich(g.running.dhcp, n.geraete.r1.running.dhcp, "DHCP-Datenform nach Roundtrip gleich");
  });

  pruefe("Switch: Ports/SVI einspielbar; VLAN-Datenbank (vlan.dat) bleibt getrennt", () => {
    const n = Modell.neu(); Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
    const s = CLI.sitzung(n, "sw1");
    e(s, "enable", "configure terminal", "hostname SW1", "vlan 20", "name Verwaltung", "exit",
      "interface Fa0/1", "switchport access vlan 20", "switchport mode access", "exit",
      "interface Vlan1", "ip address 192.168.1.2 255.255.255.0", "no shutdown", "exit", "end");
    const text = CLI.runningConfig(n.geraete.sw1);
    erwarte.falsch(/^\s*vlan\s+20/m.test(text), "VLAN-Datenbank steht nicht in der running-config (§ 6.1)");
    erwarte.enthaelt(text, "switchport access vlan 20");
    const frisch = Modell.neu(); Modell.geraet(frisch, "switch", {id: "sw1", name: "SW1"});
    /* vlan.dat wird getrennt angelegt – wie beim echten Switch vor dem Einspielen. */
    for (const [nr, v] of Object.entries(n.geraete.sw1.flash.vlans)) if (nr !== "1") Modell.vlan(frisch, "sw1", nr, v.name);
    const r = CLI.anwenden(frisch, "sw1", "configure terminal\n" + text);
    erwarte.gleich([r.ok, r.fehler.length], [true, 0], JSON.stringify(r.fehler.map(x => x.toString())).slice(0, 600));
    erwarte.gleich(kern(frisch.geraete.sw1), kern(n.geraete.sw1), "Switch-Kernfelder nach Roundtrip gleich");
    erwarte.gleich(CLI.runningConfig(frisch.geraete.sw1), text, "Switch-Text zeichengleich");
  });

  pruefe("startup-config: gesicherte Konfiguration ist einspielbar und stellt den Zustand wieder her", () => {
    const n = Modell.neu(); Modell.geraet(n, "router", {id: "r1", name: "R1"});
    const s = CLI.sitzung(n, "r1");
    e(s, "enable", "configure terminal", "hostname A", "interface Gi0/1", "ip address 10.0.1.1 255.255.255.0", "no shutdown", "exit", "end", "write memory");
    const stText = CLI.konfigText(n.geraete.r1, n.geraete.r1.startup);
    erwarte.wahr(typeof stText === "string" && stText.length > 0, "startup-Text vorhanden");
    const frisch = Modell.neu(); Modell.geraet(frisch, "router", {id: "r1", name: "R1"});
    const r = CLI.anwenden(frisch, "r1", "configure terminal\n" + stText);
    erwarte.gleich([r.ok, r.fehler.length], [true, 0]);
    erwarte.gleich([frisch.geraete.r1.running.hostname, frisch.geraete.r1.running.if["Gi0/1"].ip], ["A", "10.0.1.1"], "startup stellt den Zustand wieder her");
  });

  pruefe("Anzeigeform: keine Phantom-Zeilen; no ip domain-lookup und SSH ehrlich gekennzeichnet", () => {
    const n = routerNetz();
    const s = CLI.sitzung(n, "r1");
    e(s, "konsole");                       /* Konsolen-Passwort (Typ 7 nach service password-encryption) */
    e(s, "enable");                        /* Password: */
    e(s, "Geheim1", "configure terminal", "crypto key generate rsa modulus 1024", "end");
    const text = CLI.runningConfig(n.geraete.r1);
    for (const z of ["version 15", "service timestamps", "boot-start-marker", "boot-end-marker", "no aaa new-model",
      "system mtu", "spanning-tree", "vlan internal", "duplex auto", "speed auto", "ip forward-protocol", "line aux"])
      erwarte.falsch(text.includes(z), "Phantom-Zeile darf nicht erscheinen: " + z);
    erwarte.falsch(/^\s*ip ssh version 2/m.test(text), "ip ssh version 2 erscheint nicht als Scheinbefehl");
    erwarte.enthaelt(text, "no ip domain-lookup", "Anzeigeform deckt sich mit dem Befehl");
    erwarte.passt(text, /^! SSH aktiv/m, "SSH ist ehrlich als Kommentar gekennzeichnet (Parser kennt den Befehl nicht)");
    const {r} = runde(n, "r1", "router");
    erwarte.gleich([r.ok, r.fehler.length], [true, 0]);
  });

  pruefe("Geheimnisse: Typ-Präfixe 5/7 werden eingelesen und unverändert angezeigt; Anmeldung wirkt", () => {
    const n = routerNetz();
    const text = CLI.runningConfig(n.geraete.r1);
    erwarte.passt(text, /enable secret 5 \$1\$/m, "enable secret wird als Typ 5 angezeigt");
    erwarte.passt(text, /username admin secret 5 \$1\$/m, "username secret Typ 5");
    erwarte.passt(text, /^ password 7 [0-9A-F]+$/m, "line-Passwort Typ 7 bei service password-encryption");
    const {frisch, g, r} = runde(n, "r1", "router");
    erwarte.gleich([r.ok, r.fehler.length], [true, 0]);
    erwarte.gleich(CLI.runningConfig(g), text, "Geheimnis-Zeilen bleiben nach dem Einspielen gleich");
    /* Wirkung: nach dem Roundtrip meldet man sich mit dem Klartext-Passwort an. */
    const s2 = CLI.sitzung(frisch, "r1");
    erwarte.enthaelt(e(s2, "konsole").prompt || "R1>", "R1>", "Konsolen-Passwort (Typ 7) passt nach dem Roundtrip");
    const pw = e(s2, "enable");
    erwarte.enthaelt(pw.prompt, "Password:");
    erwarte.gleich(e(s2, "Geheim1").prompt, "R1#", "Klartext-Passwort passt zum Typ-5-Eintrag");
  });

  pruefe("Gegenprobe: ein absichtlich entferntes Feld macht den Zustandsvergleich rot", () => {
    const n = routerNetz();
    const {text, g} = runde(n, "r1", "router");
    const ohneLease = text.split("\n").filter(z => z.trim() !== "lease 2").join("\n");
    erwarte.falsch(ohneLease === text, "Testaufbau: lease-Zeile wurde entfernt");
    const frisch = Modell.neu(); Modell.geraet(frisch, "router", {id: "r1", name: "R1"});
    CLI.anwenden(frisch, "r1", "configure terminal\n" + ohneLease);
    erwarte.falsch(JSON.stringify(kern(frisch.geraete.r1).dhcp) === JSON.stringify(kern(g).dhcp),
      "ohne lease-Zeile unterscheidet sich der DHCP-Zustand — der Vergleich erkennt den Verlust");
  });

  pruefe("Grenzen: Firewall-Konfiguration ist als nicht wiedereinspielbar gekennzeichnet, Hosts haben keine", () => {
    const n = Modell.neu(); Modell.geraet(n, "firewall", {id: "fw1", name: "FW1"});
    const fw = CLI.runningConfig(n.geraete.fw1);
    erwarte.wahr(typeof fw === "string" && fw.length > 0, "Firewall hat eine Anzeige");
    erwarte.enthaelt(fw, "nicht wiedereinspielbar", "Firewall-Text nennt die Grenze ehrlich");
    const p = Modell.neu(); Modell.geraet(p, "pc", {id: "pc1", name: "PC1"});
    erwarte.gleich(CLI.runningConfig(p.geraete.pc1), null, "Hosts haben keine IOS-running-config");
  });
});
