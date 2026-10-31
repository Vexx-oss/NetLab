"use strict";
/* CLI-WIRKUNG (CLI-01, 31.10.2026): Die Konsole wirkt über Modell/Simulation — nicht nur über Prompt-Text.
   Vorbild ist der DHCP-Pool-Befund vom 05.10.2026 (Test prüfte nur den Prompt, die Befehle änderten nichts).
   Jede Prüfung nennt den Aufrufpfad (Datei:Zeile) und vergleicht den ZUSTAND, nicht die Ausgabe.
   Aufrufpfade:
     ip address / no shutdown / description   src/cli/ios-befehle.js:599-644 (shut, ifZeilen-Pfade über h.setzen)
     hostname                                  src/cli/ios-befehle.js:526-527
     vlan / name                               src/cli/ios-befehle.js:585-586
     switchport access vlan                    src/cli/ios-befehle.js:647-655
     ip route                                  src/cli/ios-befehle.js:314-329
     access-list                               src/cli/ios-befehle.js:373-412
     ip nat                                    src/cli/ios-befehle.js:459-470, :743
     DHCP-Pool (network/default-router/dns)    src/cli/ios-befehle.js:878-957
     write memory / copy run start             src/cli/ios-befehle.js:63-71
     write erase / delete flash:vlan.dat       src/cli/ios-befehle.js:82-107
     reload                                    src/cli/ios-befehle.js:110-135
     CLI.entspricht / CLI.anwenden             src/cli/entspricht.js:150-192
     CLI.hostTab                               src/cli/host-terminal.js:161-176
     Ausgabefilter                             src/cli/parser.js:585-598 */
gruppe("CLI: Wirkung", () => {
  const netz = () => {
    const n = Modell.neu();
    Modell.geraet(n, "router", {id: "r1", name: "R1"});
    Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
    Modell.geraet(n, "pc", {id: "pc1", name: "PC1"});
    Modell.geraet(n, "server", {id: "srv1", name: "SRV1"});
    Modell.verbinden(n, {geraet: "sw1", port: "Gi0/1"}, {geraet: "r1", port: "Gi0/0"});
    Modell.verbinden(n, {geraet: "pc1"}, {geraet: "sw1", port: "Fa0/1"});
    Modell.verbinden(n, {geraet: "srv1"}, {geraet: "sw1", port: "Fa0/2"});
    return n;
  };
  const e = (s, ...zeilen) => { let r; for (const z of zeilen) r = CLI.eingabe(s, z); return r; };
  const tief = x => JSON.parse(JSON.stringify(x));

  pruefe("Wirkung 1: ip address, no shutdown, description ändern das Modell (nicht den Prompt)", () => {
    const n = netz(), s = CLI.sitzung(n, "r1");
    e(s, "enable", "configure terminal", "interface Gi0/0", "ip address 10.0.0.1 255.255.255.0",
      "no shutdown", "description Uplink");
    const k = n.geraete.r1.running.if["Gi0/0"];
    erwarte.gleich([k.ip, k.maske], ["10.0.0.1", "255.255.255.0"], "ip address wirkt im Modell");
    erwarte.gleich(k.shutdown, false, "no shutdown wirkt im Modell");
    erwarte.gleich(k.beschreibung, "Uplink", "description wirkt im Modell");
    /* Falsifizierbar: shutdown setzt genau den Zustand zurück, den no shutdown gerade gesetzt hat. */
    e(s, "shutdown");
    erwarte.gleich(n.geraete.r1.running.if["Gi0/0"].shutdown, true, "shutdown wirkt (Gegenrichtung)");
  });

  pruefe("Wirkung 2: hostname steht im Gerätenamen und in running.hostname", () => {
    const n = netz(), s = CLI.sitzung(n, "r1");
    e(s, "enable", "configure terminal", "hostname Kern");
    erwarte.gleich([n.geraete.r1.name, n.geraete.r1.running.hostname], ["Kern", "Kern"]);
    erwarte.gleich(CLI.prompt(s), "Kern(config)#");
  });

  pruefe("Wirkung 3: vlan/name legen die VLAN-Datenbank an, switchport access vlan ordnet den Port zu", () => {
    const n = netz(), s = CLI.sitzung(n, "sw1");
    e(s, "enable", "configure terminal", "vlan 20", "name Verwaltung", "exit",
      "interface Fa0/1", "switchport access vlan 20", "exit", "end");
    erwarte.gleich(n.geraete.sw1.flash.vlans["20"], {name: "Verwaltung"}, "vlan 20 steht in flash.vlans");
    erwarte.gleich(n.geraete.sw1.running.ports["Fa0/1"].accessVlan, 20, "Port liegt in VLAN 20");
    /* Ein unbekanntes VLAN wird beim Zuweisen angelegt (IOS-ähnlich) – auch das ist eine Wirkung. */
    e(s, "configure terminal", "interface Fa0/2", "switchport access vlan 30", "exit", "end");
    erwarte.wahr(!!n.geraete.sw1.flash.vlans["30"], "VLAN 30 wurde automatisch angelegt");
    erwarte.gleich(n.geraete.sw1.running.ports["Fa0/2"].accessVlan, 30);
  });

  pruefe("Wirkung 4: ip route, access-list und ip nat erzeugen die Datenformen", () => {
    const n = netz(), s = CLI.sitzung(n, "r1");
    e(s, "enable", "configure terminal",
      "ip route 10.9.0.0 255.255.0.0 10.0.0.254",
      "ip access-list standard VERW", "permit 10.0.0.0 0.0.0.255", "exit",
      "ip nat inside source list 1 interface Gi0/0 overload",
      "interface Gi0/0", "ip nat inside", "exit", "end");
    erwarte.gleich(n.geraete.r1.running.routen,
      [{netz: "10.9.0.0", maske: "255.255.0.0", nh: "10.0.0.254", aus: null, ad: 1}], "Route steht im Modell");
    const acl = n.geraete.r1.running.acls["VERW"];
    erwarte.gleich([acl.typ, acl.benannt, acl.regeln.length], ["standard", true, 1], "ACL angelegt");
    erwarte.gleich(acl.regeln[0].aktion, "permit", "ACL-Regel hat die Aktion (nicht nur den Prompt)");
    erwarte.gleich(n.geraete.r1.running.nat.dynamisch,
      [{acl: "1", aus: "Gi0/0", overload: true}], "NAT-Regel steht im Modell");
    erwarte.gleich(n.geraete.r1.running.if["Gi0/0"].nat, "inside", "Schnittstellenrolle NAT wirkt");
  });

  pruefe("Wirkung 5: DHCP-Pool network/default-router/dns-server wirken im Modell", () => {
    const n = netz(), s = CLI.sitzung(n, "r1");
    e(s, "enable", "configure terminal", "ip dhcp pool LAN",
      "network 192.168.44.0 255.255.255.0", "default-router 192.168.44.1", "dns-server 192.168.44.53", "exit", "end");
    const pool = n.geraete.r1.running.dhcp.pools.find(p => p.name === "LAN");
    erwarte.wahr(!!pool, "Pool steht im Modell");
    erwarte.gleich([pool.netz, pool.maske, pool.gw, pool.dns],
      ["192.168.44.0", "255.255.255.0", "192.168.44.1", "192.168.44.53"], "Poolwerte wirken");
  });

  pruefe("Wirkung 6: write memory sichert als tiefe Kopie; spätere Änderung erreicht die startup nicht", () => {
    const n = netz(), s = CLI.sitzung(n, "r1");
    e(s, "enable", "configure terminal", "hostname R1", "exit");
    e(s, "write memory");
    erwarte.gleich(tief(n.geraete.r1.startup), tief(n.geraete.r1.running), "startup == running nach write memory");
    e(s, "configure terminal", "hostname NEU", "end");
    erwarte.gleich(n.geraete.r1.startup.hostname, "R1", "startup ist eine Kopie, keine Referenz");
    erwarte.gleich(n.geraete.r1.running.hostname, "NEU");
    erwarte.wahr(Modell.ungespeichert(n.geraete.r1), "Änderung ist als ungesichert erkannt");
  });

  pruefe("Wirkung 7: copy running-config startup-config + Enter sichert; write erase löscht startup, VLANs bleiben", () => {
    const n = netz(), r = CLI.sitzung(n, "r1");
    e(r, "enable", "configure terminal", "hostname R1", "end");
    const frage = e(r, "copy running-config startup-config");
    erwarte.enthaelt(frage.prompt, "Destination filename [startup-config]?", "copy fragt nach dem Dateinamen");
    const fertig = e(r, "");
    erwarte.enthaelt(fertig.ausgabe, "[OK]", "copy meldet [OK]");
    erwarte.gleich(tief(n.geraete.r1.startup), tief(n.geraete.r1.running), "copy sichert die laufende Konfiguration");
    erwarte.gleich(Modell.ungespeichert(n.geraete.r1), false, "nichts mehr ungesichert");
    /* write erase: startup weg, running bleibt, VLAN-Datenbank (vlan.dat) bleibt. */
    const sw = CLI.sitzung(n, "sw1");
    e(sw, "enable", "configure terminal", "vlan 20", "name Verwaltung", "exit", "end", "write memory");
    erwarte.wahr(!!n.geraete.sw1.startup, "Switch hat eine startup");
    e(sw, "write erase");
    e(sw, "");
    erwarte.gleich(n.geraete.sw1.startup, null, "write erase löscht die startup-config");
    erwarte.wahr(!!n.geraete.sw1.flash.vlans["20"], "VLAN 20 überlebt write erase (vlan.dat)");
    erwarte.wahr(!!n.geraete.sw1.running.ports["Fa0/1"], "running-config läuft weiter");
  });

  pruefe("Wirkung 8: delete flash:vlan.dat entfernt die VLANs nach zwei Rückfragen", () => {
    const n = netz(), s = CLI.sitzung(n, "sw1");
    e(s, "enable", "configure terminal", "vlan 20", "name Verwaltung", "exit", "end", "write memory");
    const p1 = e(s, "delete flash:vlan.dat");
    erwarte.enthaelt(p1.prompt, "Delete filename [vlan.dat]?", "erste Rückfrage");
    const p2 = e(s, "");
    erwarte.enthaelt(p2.prompt, "Delete flash:/vlan.dat? [confirm]", "zweite Rückfrage");
    e(s, "");
    erwarte.falsch(!!n.geraete.sw1.flash.vlans["20"], "VLAN 20 ist aus der Datenbank weg");
    erwarte.gleich(Object.keys(n.geraete.sw1.flash.vlans), ["1"], "nur VLAN 1 bleibt");
    erwarte.falsch(/vlan\.dat/.test(e(s, "show flash:").ausgabe), "show flash: listet vlan.dat nicht mehr");
  });

  pruefe("Wirkung 9: reload lädt die startup-config; ohne startup startet das Gerät im Werkszustand", () => {
    const n = netz(), s = CLI.sitzung(n, "r1");
    e(s, "enable", "configure terminal", "hostname A", "end", "write memory");
    e(s, "configure terminal", "hostname B", "end");
    const q = e(s, "reload");
    erwarte.enthaelt(q.prompt, "System configuration has been modified. Save? [yes/no]:");
    const q2 = e(s, "no");
    erwarte.enthaelt(q2.prompt, "Proceed with reload? [confirm]");
    e(s, "");
    erwarte.gleich(n.geraete.r1.running.hostname, "A", "reload lädt die gesicherte Konfiguration");
    erwarte.gleich(n.geraete.r1.startup.hostname, "A", "startup bleibt unverändert");
    /* Zweiter Fall: ohne startup → Werkszustand. */
    const s2 = CLI.sitzung(n, "r1");
    e(s2, "enable", "write erase");
    e(s2, "");
    erwarte.gleich(n.geraete.r1.startup, null);
    e(s2, "reload");
    e(s2, "no");
    e(s2, "");
    erwarte.gleich(n.geraete.r1.running.hostname, "Router", "ohne startup startet das Gerät im Werkszustand");
  });

  pruefe("Wirkung 10: CLI.entspricht → CLI.anwenden wirkt auf Router, Switch und Host", () => {
    const n = netz();
    /* Router: GUI-Änderung als Befehlsblock (Produktionspfad src/ui/inspektor.js:328-329). */
    const block = CLI.entspricht(n.geraete.r1, "if.Gi0/0.ip", "10.0.0.1");
    erwarte.enthaelt(block, "interface GigabitEthernet0/0");
    const rr = CLI.anwenden(n, "r1", "configure terminal\n" + block);
    erwarte.gleich([rr.ok, rr.fehler.length], [true, 0], "Router-Block ist fehlerfrei einspielbar");
    erwarte.gleich(n.geraete.r1.running.if["Gi0/0"].ip, "10.0.0.1", "Router-Block wirkt");
    /* Switch: Port-VLAN über den GUI-Block. */
    const blockSw = CLI.entspricht(n.geraete.sw1, "ports.Fa0/1.accessVlan", 20);
    const rs = CLI.anwenden(n, "sw1", "configure terminal\n" + blockSw);
    erwarte.gleich([rs.ok, rs.fehler.length], [true, 0], "Switch-Block ist fehlerfrei einspielbar");
    erwarte.gleich(n.geraete.sw1.running.ports["Fa0/1"].accessVlan, 20, "Switch-Block wirkt");
    /* Host: netsh-Block der Windows-Konsole. */
    Modell.setzen(n, "pc1", "if.eth0.ip", "10.135.20.30");
    Modell.setzen(n, "pc1", "if.eth0.maske", "255.255.255.0");
    Modell.setzen(n, "pc1", "if.eth0.gw", "10.135.20.1");
    const blockHost = CLI.entspricht(n.geraete.pc1, "if.eth0.ip", "10.135.20.77");
    erwarte.enthaelt(blockHost, "netsh interface ip set address");
    const rh = CLI.anwenden(n, "pc1", blockHost);
    erwarte.gleich([rh.ok, rh.fehler.length], [true, 0], "Host-Block ist fehlerfrei einspielbar");
    erwarte.gleich(n.geraete.pc1.running.if.eth0.ip, "10.135.20.77", "Host-Block wirkt");
  });

  pruefe("Wirkung 11: CLI.hostTab vervollständigt Windows- und Linux-Terminal", () => {
    const n = netz(), w = CLI.sitzung(n, "pc1"), l = CLI.sitzung(n, "srv1");
    erwarte.gleich(CLI.hostTab(w, "ipc"), {zeile: "ipconfig ", vorschlaege: []}, "Windows: ipc → ipconfig");
    erwarte.gleich(CLI.hostTab(w, "i").zeile, "ipconfig ", "Windows: eindeutiges Präfix");
    erwarte.gleich(CLI.hostTab(w, "netsh interface ip show ").zeile, "netsh interface ip show config", "netsh-Optionen");
    erwarte.gleich(CLI.hostTab(l, "sud").zeile, "sudo ", "Linux: sud → sudo");
    erwarte.gleich(CLI.hostTab(l, "ip ").vorschlaege, ["address", "route", "link"], "Linux: ip-Optionen");
  });

  pruefe("Wirkung 12: | exclude filtert exakt, | section liefert den Block ohne Nachbarblock", () => {
    const n = netz(), s = CLI.sitzung(n, "r1");
    e(s, "enable");
    const alles = e(s, "show running-config").ausgabe;
    const ohne = e(s, "show running-config | exclude interface").ausgabe;
    erwarte.gleich(ohne, alles.split("\n").filter(z => !z.includes("interface")).join("\n"), "exclude filtert genau die Musterzeilen");
    const sec = e(s, "show running-config | section line con").ausgabe;
    erwarte.wahr(sec.startsWith("line con 0"), "section beginnt am Abschnittskopf");
    erwarte.falsch(sec.includes("line vty"), "section nimmt den Nachbarblock nicht mit");
  });
});
