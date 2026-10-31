"use strict";
/* CLI-FEHLPFADE (CLI-06, W2/Tier 2, 31.10.2026): Falschauskünfte und Sackgassen schließen.
   Bericht backend-cli.md CLI-07/CLI-10/11/12/13/16. Geprüft wird die Wirkung/die Ehrlichkeit, nicht nur der Prompt. */
gruppe("CLI: Fehlpfade", () => {
  const e = (s, ...z) => { let r; for (const x of z) r = CLI.eingabe(s, x); return r; };
  const buero = () => Spiel.vorlagen.buero.bauen(Zufall(1)).netz;

  pruefe("nslookup NAME SERVER erfindet keine Antwort des gewählten Servers", () => {
    const n = buero(), s = CLI.sitzung(n, "pc1");
    const r = e(s, "nslookup server.buero.local 203.0.113.9");
    erwarte.wahr(/nicht nachgebaut|Grenze|Server-Parameter/i.test(String(r.ausgabe)), "der Server-Parameter wird nicht still ignoriert: " + r.ausgabe);
  });

  pruefe("dig @SERVER ist ehrlich (Server-Parameter nicht still ignoriert)", () => {
    const n = buero(), s = CLI.sitzung(n, "srv");
    const r = e(s, "dig @203.0.113.9 server.buero.local");
    erwarte.wahr(/nicht nachgebaut|Grenze|@server|Server-Parameter/i.test(String(r.ausgabe)), "dig @ ist ehrlich: " + r.ausgabe);
  });

  pruefe("route -p add 0.0.0.0 mask 0.0.0.0 <gw> wirkt (Ticket-Muster tickets-terminal.js:37)", () => {
    const n = buero(), s = CLI.sitzung(n, "drucker");
    const r = e(s, "route -p add 0.0.0.0 mask 0.0.0.0 10.135.20.254");
    erwarte.falsch(r.fehler, "route -p add wird angenommen: " + r.ausgabe);
    erwarte.gleich(n.geraete.drucker.running.if.eth0.gw, "10.135.20.254", "Gateway ist gesetzt");
  });

  pruefe("exit aus (dhcp-config-host) erhält den Pool-Kontext (CLI-12)", () => {
    const n = Modell.neu(); Modell.geraet(n, "router", {id: "r1", name: "R1"});
    const s = CLI.sitzung(n, "r1");
    e(s, "enable", "configure terminal", "ip dhcp pool LAN", "network 192.168.10.0 255.255.255.0",
      "host drucker", "hardware-address 0200.aabb.cc01", "ip 192.168.10.50", "exit");
    const r = e(s, "dns-server 192.168.10.53");
    erwarte.falsch(r.fehler, "nach exit wirkt der Pool weiter: " + r.ausgabe);
    erwarte.gleich(n.geraete.r1.running.dhcp.pools[0].dns, "192.168.10.53");
  });

  pruefe("copy startup-config running-config ersetzt vollständig (CLI-11)", () => {
    const n = Modell.neu(); Modell.geraet(n, "router", {id: "r1", name: "R1"});
    const s = CLI.sitzung(n, "r1");
    e(s, "enable", "configure terminal", "hostname A", "end", "write memory");
    e(s, "configure terminal", "interface Gi0/0.10", "encapsulation dot1Q 10", "exit", "hostname B", "end");
    const r = e(s, "copy startup-config running-config", "");
    erwarte.falsch(r.fehler, "copy start run nimmt an: " + r.ausgabe);
    erwarte.gleich(n.geraete.r1.running.hostname, "A", "running stammt aus der startup");
    erwarte.gleich(n.geraete.r1.running.if["Gi0/0.10"], undefined, "die spätere Ergänzung ist weg (kein Hybrid)");
  });

  pruefe("terminal length ist ehrlich gekennzeichnet (CLI-10)", () => {
    const n = Modell.neu(); Modell.geraet(n, "router", {id: "r1", name: "R1"});
    const s = CLI.sitzung(n, "r1"); e(s, "enable");   /* terminal length ist ein EXEC-Befehl (nicht Config) */
    const r = e(s, "terminal length 24");
    erwarte.wahr(/Attrappe|nicht nachgebaut|ohne Pause|Paging/i.test(String(r.hinweis || r.ausgabe)),
      "die Hilfe verspricht keine wirkungslose Funktion: " + JSON.stringify(r.hinweis || r.ausgabe));
  });

  pruefe("neues SVI meldet keinen Übergang, der nie stattfand (CLI-13)", () => {
    const n = Modell.neu(); Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
    const s = CLI.sitzung(n, "sw1"); e(s, "enable", "configure terminal");
    const r = e(s, "interface vlan 10");
    erwarte.falsch(/administratively down/.test(String(r.ausgabe)), "keine Meldung über einen Zustand, der nie galt: " + r.ausgabe);
    erwarte.gleich(n.geraete.sw1.running.svi["10"].shutdown, false, "SVI-Zustand ist definiert (nicht widersprüchlich)");
  });
});
