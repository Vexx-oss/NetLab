"use strict";
/* CLI-Grundlagen: Modi, Prompts, Kurzformen, Fehlermeldungen mit ^, ?, Tab, no, do, Pipe, Passwörter */
gruppe("CLI: Grundlagen", () => {
  const netz = () => {
    const n = Modell.neu();
    Modell.geraet(n, "router", {id: "r1", name: "R1"});
    Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
    Modell.geraet(n, "pc", {id: "pc1", name: "PC1"});
    Modell.verbinden(n, {geraet: "sw1", port: "Gi0/1"}, {geraet: "r1", port: "Gi0/0"});
    Modell.verbinden(n, {geraet: "pc1"}, {geraet: "sw1", port: "Fa0/1"});
    return n;
  };
  const e = (s, ...zeilen) => { let r; for (const z of zeilen) r = CLI.eingabe(s, z); return r; };

  pruefe("Modi und Prompts wie IOS (Router)", () => {
    const s = CLI.sitzung(netz(), "r1");
    erwarte.gleich(CLI.prompt(s), "R1>");
    erwarte.gleich(e(s, "enable").prompt, "R1#");
    const r = e(s, "configure terminal");
    erwarte.gleich(r.prompt, "R1(config)#");
    erwarte.enthaelt(r.ausgabe, "Enter configuration commands, one per line.  End with CNTL/Z.");
    erwarte.gleich(e(s, "interface GigabitEthernet0/0").prompt, "R1(config-if)#");
    erwarte.gleich(e(s, "interface g0/0.10").prompt, "R1(config-subif)#");
    erwarte.gleich(e(s, "exit").prompt, "R1(config)#");
    erwarte.gleich(e(s, "interface range g0/1 - 2").prompt, "R1(config-if-range)#");
    erwarte.gleich(e(s, "line console 0").prompt, "R1(config-line)#");
    erwarte.gleich(e(s, "ip access-list standard VERW").prompt, "R1(config-std-nacl)#");
    erwarte.gleich(e(s, "ip access-list extended GAST").prompt, "R1(config-ext-nacl)#");
    erwarte.gleich(e(s, "ip dhcp pool LAN").prompt, "R1(dhcp-config)#");
    const end = e(s, "end");
    erwarte.gleich(end.prompt, "R1#");
    erwarte.enthaelt(end.ausgabe, "%SYS-5-CONFIG_I: Configured from console by console");
    erwarte.gleich(e(s, "disable").prompt, "R1>");
  });
  pruefe("Switch: (config-vlan)# und interface vlan; exit/end/Strg+Z", () => {
    const s = CLI.sitzung(netz(), "sw1");
    e(s, "en", "conf t");
    erwarte.gleich(e(s, "vlan 10").prompt, "SW1(config-vlan)#");
    erwarte.gleich(e(s, "exit").prompt, "SW1(config)#");
    erwarte.gleich(e(s, "interface vlan 1").prompt, "SW1(config-if)#");
    erwarte.gleich(e(s, "\u001a").prompt, "SW1#");
    erwarte.gleich(e(s, "conf t", "int fa0/5", "end").prompt, "SW1#");
  });
  pruefe("Kurzformen und Schreibweisen der Schnittstellen", () => {
    const n = netz(), s = CLI.sitzung(n, "sw1");
    e(s, "en", "conf t");
    for (const [z, soll] of [["int fa0/2", "Fa0/2"], ["interface FastEthernet0/3", "Fa0/3"], ["int f0/4", "Fa0/4"], ["int fast 0/5", "Fa0/5"],
                             ["int FastEthernet 0/6", "Fa0/6"], ["int gi0/1", "Gi0/1"], ["int g0/2", "Gi0/2"], ["int gig0/1", "Gi0/1"], ["int GigabitEthernet 0/2", "Gi0/2"]]) {
      const r = e(s, z);
      erwarte.falsch(r.fehler, z + ": " + r.ausgabe);
      erwarte.gleich(s.kontext.ifs, [soll], z);
      e(s, "exit");
    }
    e(s, "int range fa0/1 - 3, fa0/7");
    erwarte.gleich(s.kontext.ifs, ["Fa0/1", "Fa0/2", "Fa0/3", "Fa0/7"]);
    const r = e(s, "end", "sh ip int br");
    erwarte.falsch(r.fehler);
    erwarte.enthaelt(r.ausgabe, "Interface                  IP-Address      OK? Method Status                Protocol");
    erwarte.gleich(r.befehl, "show ip interface brief");
  });
  pruefe("% Invalid input mit ^ genau unter der Fehlerstelle", () => {
    const s = CLI.sitzung(netz(), "r1");
    e(s, "en", "conf t");
    const r = e(s, "ip adress 10.0.0.1");
    erwarte.wahr(r.fehler);
    const [marke, text] = r.ausgabe.split("\n");
    erwarte.gleich(text, "% Invalid input detected at '^' marker.");
    erwarte.gleich(marke.indexOf("^"), "R1(config)#".length + "ip ".length, "Position des ^");
    const r2 = e(s, "interface gigabitEthernet0/7");      /* Port gibt es nicht: ^ unter der Nummer */
    erwarte.gleich(r2.ausgabe.split("\n")[0].indexOf("^"), "R1(config)#".length + "interface gigabitEthernet".length);
  });
  pruefe("% Incomplete command. und % Ambiguous command:", () => {
    const s = CLI.sitzung(netz(), "r1");
    e(s, "en", "conf t", "int g0/0");
    erwarte.gleich(e(s, "ip address").ausgabe, "% Incomplete command.");
    erwarte.gleich(e(s, "ip address 10.0.0.1").ausgabe, "% Incomplete command.");
    erwarte.gleich(e(s, "exit", "i").ausgabe, '% Ambiguous command:  "i"');
    erwarte.gleich(e(s, "end", "c").ausgabe, '% Ambiguous command:  "c"');
  });
  pruefe("Exec: unbekanntes Wort → Translating … domain server", () => {
    const s = CLI.sitzung(netz(), "r1");
    const r = e(s, "hallo");
    erwarte.wahr(r.fehler);
    erwarte.gleich(r.ausgabe, 'Translating "hallo"...domain server (255.255.255.255)\n% Unknown command or computer name, or unable to find computer address');
    e(s, "en", "conf t", "no ip domain-lookup", "end");
    erwarte.gleich(e(s, "hallo").ausgabe, 'Translating "hallo"\n% Unknown command or computer name, or unable to find computer address');
    /* privilegierter Befehl im Benutzermodus: Invalid input, kein DNS-Versuch */
    e(s, "disable");
    const r2 = e(s, "conf t");
    erwarte.enthaelt(r2.ausgabe, "% Invalid input detected at '^' marker.");
  });
  pruefe("? zeigt die Optionen an der Stelle; Einstieg mit deutscher Erklärung", () => {
    const n = netz(), s = CLI.sitzung(n, "r1");
    e(s, "en");
    const r = e(s, "configure ?");
    erwarte.enthaelt(r.ausgabe, "terminal");
    erwarte.enthaelt(r.ausgabe, "<cr>");
    erwarte.falsch(/über diese Konsole/.test(r.ausgabe), "ohne Einstieg keine deutsche Erklärung");
    const t = e(s, "sh?");
    erwarte.enthaelt(t.ausgabe, "show");
    const s2 = CLI.sitzung(n, "r1", {einstieg: true});
    e(s2, "en");
    const r2 = e(s2, "show ?");
    erwarte.enthaelt(r2.ausgabe, "running-config");
    erwarte.enthaelt(r2.ausgabe, "aktuelle Konfiguration im RAM");
    erwarte.enthaelt(e(s2, "conf t", "int g0/0", "ip address ?").ausgabe, "A.B.C.D");
    erwarte.enthaelt(e(s2, "interface ?").ausgabe, "GigabitEthernet");
    erwarte.enthaelt(e(s2, "do show running-config ?").ausgabe, "|");
    /* ? ändert nichts und landet nicht im Verlauf der Befehle */
    erwarte.falsch(e(s2, "hostname ?").geaendert);
  });
  pruefe("Tab vervollständigt eindeutige Kurzformen und Schnittstellentypen", () => {
    const s = CLI.sitzung(netz(), "r1");
    e(s, "en");
    erwarte.gleich(CLI.tab(s, "conf").zeile, "configure ");
    erwarte.gleich(CLI.tab(s, "sh ip int").zeile, "sh ip interface ");
    const mehr = CLI.tab(s, "c");
    erwarte.gleich(mehr.zeile, "c");
    erwarte.wahr(mehr.vorschlaege.includes("configure") && mehr.vorschlaege.includes("copy"));
    e(s, "conf t");
    erwarte.gleich(CLI.tab(s, "int g").zeile, "int GigabitEthernet");
    erwarte.gleich(CLI.tab(s, "hostn").zeile, "hostname ");
  });
  pruefe("no-Präfix und do im Konfigurationsmodus", () => {
    const n = netz(), s = CLI.sitzung(n, "r1");
    e(s, "en", "conf t", "int g0/0", "no shutdown");
    erwarte.falsch(n.geraete.r1.running.if["Gi0/0"].shutdown);
    e(s, "description Uplink", "no description");
    erwarte.gleich(n.geraete.r1.running.if["Gi0/0"].beschreibung, "");
    const r = e(s, "do show ip interface brief");
    erwarte.enthaelt(r.ausgabe, "GigabitEthernet0/0");
    erwarte.gleich(CLI.prompt(s), "R1(config-if)#", "do bleibt im Modus");
    erwarte.wahr(e(s, "show ip interface brief").fehler, "ohne do geht show im Konfigurationsmodus nicht");
  });
  pruefe("Tipp-Zeile nur im Einstieg", () => {
    const n = netz();
    const ohne = CLI.sitzung(n, "r1"), mit = CLI.sitzung(n, "r1", {einstieg: true});
    e(ohne, "en"); e(mit, "en");
    erwarte.falsch(/Tipp:/.test(e(ohne, "hostname R9").ausgabe));
    const r = e(mit, "hostname R9");
    erwarte.enthaelt(r.ausgabe, "Tipp: Konfigurationsbefehle gehen erst nach „configure terminal“");
    const r2 = e(mit, "conf t", "show run");
    erwarte.enthaelt(r2.ausgabe, "Tipp:");
    erwarte.enthaelt(r2.ausgabe, "„do“");
  });
  pruefe("globaler Befehl in (config-if) wechselt nach (config), wie IOS", () => {
    const n = netz(), s = CLI.sitzung(n, "r1");
    e(s, "en", "conf t", "int g0/0");
    const r = e(s, "hostname Kern");
    erwarte.falsch(r.fehler);
    erwarte.gleich(r.prompt, "Kern(config)#");
    erwarte.gleich(n.geraete.r1.name, "Kern");
    erwarte.gleich(e(s, "int g0/1", "int g0/2").prompt, "Kern(config-if)#");
    erwarte.gleich(s.kontext.ifs, ["Gi0/2"]);
  });
  pruefe("Ausgabe filtern mit | include / begin", () => {
    const s = CLI.sitzung(netz(), "r1");
    e(s, "en");
    const r = e(s, "show running-config | include interface");
    erwarte.gleich(r.ausgabe.split("\n").every(z => z.includes("interface")), true);
    erwarte.gleich(r.ausgabe.split("\n").length, 3);
    erwarte.wahr(e(s, "show running-config | begin line").ausgabe.startsWith("line con 0"));
  });
  pruefe("enable secret und Konsolen-Passwort fragen verdeckt nach", () => {
    const n = netz(), s = CLI.sitzung(n, "r1");
    e(s, "en", "conf t", "enable secret Geheim1", "line con 0", "password konsole", "login", "end", "disable");
    const r = e(s, "enable");
    erwarte.gleich(r.prompt, "Password: ");
    erwarte.wahr(r.verdeckt);
    erwarte.gleich(e(s, "falsch").prompt, "Password: ");
    erwarte.gleich(e(s, "Geheim1").prompt, "R1#");
    const aus = e(s, "exit");
    erwarte.enthaelt(aus.ausgabe, "Press RETURN to get started.");
    const an = e(s, "");
    erwarte.enthaelt(an.ausgabe, "User Access Verification");
    erwarte.gleich(an.prompt, "Password: ");
    erwarte.gleich(e(s, "konsole").prompt, "R1>");
    const run = e(s, "en", "Geheim1", "show running-config").ausgabe;
    erwarte.passt(run, /^enable secret 5 \$1\$\S{4}\$\S{22}$/m);
    erwarte.enthaelt(run, "line con 0\n password konsole\n login");
  });
  pruefe("Strg+C bricht eine Rückfrage ab", () => {
    const n = netz(), s = CLI.sitzung(n, "r1");
    e(s, "en");
    erwarte.gleich(e(s, "copy running-config startup-config").prompt, "Destination filename [startup-config]? ");
    erwarte.gleich(e(s, "\u0003").prompt, "R1#");
    erwarte.gleich(n.geraete.r1.startup, null);
  });
  pruefe("Verlauf der Eingaben (Pfeil hoch/runter)", () => {
    const s = CLI.sitzung(netz(), "r1");
    e(s, "en", "show version", "show clock");
    erwarte.gleich(CLI.historie(s, -1), "show clock");
    erwarte.gleich(CLI.historie(s, -1), "show version");
    erwarte.gleich(CLI.historie(s, +1), "show clock");
    erwarte.gleich(CLI.historie(s, +1), "");
  });
  pruefe("Firewall: nur Anzeige, Konfiguration im Inspektor", () => {
    const n = Modell.neu(); Modell.geraet(n, "firewall", {id: "fw1", name: "FW1"});
    Modell.setzen(n, "fw1", "if.Gi0/0.ip", "192.168.1.254"); Modell.setzen(n, "fw1", "if.Gi0/0.maske", "255.255.255.0"); Modell.setzen(n, "fw1", "if.Gi0/0.zone", "innen");
    Modell.setzen(n, "fw1", "regeln", [{id: "r1", von: "innen", nach: "aussen", proto: "tcp", quelle: "any", ziel: "any", port: 443, aktion: "erlauben", aktiv: true, text: "Web"}]);
    const s = CLI.sitzung(n, "fw1");
    erwarte.gleich(CLI.prompt(s), "FW1>");
    e(s, "enable");
    const run = e(s, "show running-config").ausgabe;
    erwarte.enthaelt(run, "herstellerneutral");
    erwarte.enthaelt(run, " zone innen\n ip address 192.168.1.254 255.255.255.0");
    erwarte.enthaelt(run, "regel r1 von innen nach aussen proto tcp quelle any ziel any port 443 erlauben");
    const r = e(s, "conf t");
    erwarte.wahr(r.fehler);
    erwarte.enthaelt(r.ausgabe, "Inspektor");
  });
});
