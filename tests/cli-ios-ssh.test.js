"use strict";
/* IOS-INVENTUR UND SSH (Plan – Ausbau 1.2, C3): Befehl × Modus × Gerät ist vorhanden (kein „% Invalid input“),
   neue Konfigurationsbefehle landen in der running-config, SSH vom PC-Terminal auf den Router klappt nur, wenn er dafür
   eingerichtet ist – und die Anmeldung läuft dann in einer echten IOS-Sitzung. */
gruppe("CLI: IOS-Inventur und SSH", () => {
  const netz = () => {
    const n = Modell.neu();
    Modell.geraet(n, "router", {id: "r1", name: "R1"});
    Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
    Modell.geraet(n, "pc", {id: "pc1", name: "PC1"});
    Modell.verbinden(n, {geraet: "sw1", port: "Gi0/1"}, {geraet: "r1", port: "Gi0/0"});
    Modell.verbinden(n, {geraet: "pc1"}, {geraet: "sw1", port: "Fa0/1"});
    for (const [f, w] of Object.entries({ip: "10.0.0.10", maske: "255.255.255.0", gw: "10.0.0.1"})) Modell.setzen(n, "pc1", "if.eth0." + f, w);
    return n;
  };
  const e = (s, ...zeilen) => { let r; for (const z of zeilen) r = CLI.eingabe(s, z); return r; };
  const vorhanden = (s, befehl) => { const r = CLI.eingabe(s, befehl); return !/% (Invalid input|Incomplete command|Ambiguous)/.test(r.ausgabe) ? null : `${befehl} → ${r.ausgabe.split("\n").slice(-1)[0]}`; };

  pruefe("Inventur: show-Befehle (privilegiert) und Konfigurationsbefehle sind auf Router und Switch vorhanden", () => {
    const n = netz(), fehlt = [];
    const r = CLI.sitzung(n, "r1"); e(r, "enable");
    for (const b of ["show ip route", "show ip interface brief", "show ip arp", "show ip dhcp binding", "show ip dhcp pool", "show ip dhcp conflict",
      "show ip nat translations", "show ip nat statistics", "show cdp neighbors", "show version", "show clock", "show users", "show running-config",
      "show startup-config", "show access-lists", "show interfaces", "show arp"]) { const f = vorhanden(r, b); if (f) fehlt.push("R1# " + f); }
    const sw = CLI.sitzung(n, "sw1"); e(sw, "enable");
    for (const b of ["show vlan brief", "show interfaces trunk", "show interfaces status", "show mac address-table", "show ip interface brief",
      "show port-security", "show cdp neighbors", "show version", "show users", "show running-config"]) { const f = vorhanden(sw, b); if (f) fehlt.push("SW1# " + f); }
    e(r, "configure terminal");
    for (const b of ["hostname R1", "ip routing", "ip domain-name labor.local", "crypto key generate rsa modulus 1024", "username admin secret geheim",
      "service password-encryption", "banner motd #Nur fuer Befugte#", "enable secret klasse", "line vty 0 4", "transport input ssh", "login local", "exit"]) { const f = vorhanden(r, b); if (f) fehlt.push("R1(config) " + f); }
    e(sw, "configure terminal");
    for (const b of ["hostname SW1", "ip domain-name labor.local", "crypto key generate rsa general-keys modulus 1024", "username admin secret geheim",
      "line vty 0 15", "transport input ssh", "login local"]) { const f = vorhanden(sw, b); if (f) fehlt.push("SW1(config) " + f); }
    erwarte.gleich(fehlt, []);
    const run = CLI.runningConfig(n.geraete.r1);
    for (const z of ["service password-encryption", "ip domain-name labor.local", "username admin secret 5 ", "ip ssh version 2", " login local", " transport input ssh"]) erwarte.enthaelt(run, z, "running-config");
  });

  pruefe("crypto key generate rsa braucht hostname und ip domain-name; ohne modulus fragt IOS nach den Bits", () => {
    const n = netz(), r = CLI.sitzung(n, "r1");
    e(r, "enable", "configure terminal", "no hostname");
    erwarte.enthaelt(e(r, "crypto key generate rsa modulus 1024").ausgabe, "% Please define a hostname other than Router.");
    e(r, "hostname R1");
    erwarte.enthaelt(e(r, "crypto key generate rsa modulus 1024").ausgabe, "% Please define a domain-name first.");
    e(r, "ip domain-name labor.local");
    erwarte.enthaelt(e(r, "crypto key generate rsa").ausgabe, "Choose the size of the key modulus");
    const fertig = e(r, "2048");
    erwarte.enthaelt(fertig.ausgabe, "%SSH-5-ENABLED");
    erwarte.gleich(n.geraete.r1.running.sshSchluessel, {bits: 2048});
  });

  pruefe("SSH vom PC: erst abgelehnt, nach Einrichtung Passwort → IOS-Sitzung (show users zeigt vty), exit trennt", () => {
    const n = netz(), r = CLI.sitzung(n, "r1");
    e(r, "enable", "configure terminal", "interface g0/0", "ip address 10.0.0.1 255.255.255.0", "no shutdown", "end");
    const pc = CLI.sitzung(n, "pc1");
    let a = e(pc, "ssh -l admin 10.0.0.1");
    erwarte.wahr(a.fehler && /Connection refused/.test(a.ausgabe), "noch kein SSH: " + a.ausgabe);
    erwarte.enthaelt(e(pc, "ssh -l admin 10.0.0.99").ausgabe, "Connection timed out");
    e(r, "configure terminal", "hostname R1", "ip domain-name labor.local", "crypto key generate rsa modulus 1024", "username admin secret geheim",
      "line vty 0 4", "transport input ssh", "end");
    erwarte.enthaelt(e(pc, "ssh admin@10.0.0.1").ausgabe, "Connection closed by 10.0.0.1 port 22", "ohne login local");
    e(r, "configure terminal", "line vty 0 4", "login local", "end");
    a = e(pc, "ssh -l admin 10.0.0.1");
    erwarte.gleich(a.prompt, "admin@10.0.0.1's password:");
    erwarte.enthaelt(e(pc, "falsch").ausgabe, "Permission denied, please try again.");
    a = e(pc, "geheim");
    erwarte.gleich(a.prompt, "R1>");
    erwarte.gleich(e(pc, "enable").prompt, "R1#");
    erwarte.wahr(/2 vty 0\s+admin\s+idle\s+\S+\s+10\.0\.0\.10/.test(e(pc, "show users").ausgabe), "show users zeigt die SSH-Sitzung");
    a = e(pc, "configure terminal");
    erwarte.gleich(a.prompt, "R1(config)#");
    e(pc, "hostname R1-SSH", "end");
    erwarte.gleich(n.geraete.r1.running.hostname, "R1-SSH", "Änderung per SSH wirkt");
    a = e(pc, "exit");
    erwarte.wahr(/Connection to 10\.0\.0\.1 closed\./.test(a.ausgabe) && a.prompt === "C:\\>", a.ausgabe + " / " + a.prompt);
  });
});
