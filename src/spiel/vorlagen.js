"use strict";
/* ---------- Netzvorlagen für Tickets und Generator (Konzept § 8.2) ----------
   Spiel.vorlagen[name] = {name, titel, kunde, stufe, skills:[…], bauen(z, {kunde}) → {netz, rollen, ziele}}
   Jede Vorlage liefert ein GESUNDES Netz mit gewürfelten Adressen (z = Zufall(seed)), ordentlichem Layout
   und den gesunden Zielen (erreichbar/blockiert/dhcp), die ein Injektor brechen kann. Geräte-IDs sind fest,
   damit Injektoren und handgeschriebene Tickets sie direkt ansprechen können. IOS-Geräte sind gespeichert. */
Spiel.vorlagen = (() => {
  const V = {};
  const DNS_EXTERN = "198.51.100.53";

  function host(n, id, name, x, y, adr, o = {}){
    Modell.geraet(n, o.typ || "pc", {id, name, x, y, skin: o.skin || null});
    if (o.dhcp) Modell.setzen(n, id, "if.eth0.dhcp", true);
    else for (const [f, w] of Object.entries({ip: adr.ip, maske: adr.maske, gw: adr.gw || "", dns: adr.dns || ""})) Modell.setzen(n, id, "if.eth0." + f, w);
    for (const d of o.dienste || []) Modell.setzen(n, id, "dienste." + d, {an: true});
    return n.geraete[id];
  }
  function rIf(n, id, port, ip, maske, extra = {}){
    Modell.setzen(n, id, `if.${port}.ip`, ip); Modell.setzen(n, id, `if.${port}.maske`, maske);
    Modell.setzen(n, id, `if.${port}.shutdown`, false);
    for (const [k, w] of Object.entries(extra)) Modell.setzen(n, id, `if.${port}.${k}`, w);
  }
  const regel = (aktion, q, qwc, zi, zwc, proto = "ip", zielPort = null) =>
    ({aktion, proto, quelle: {ip: q, wc: qwc}, ziel: zi == null ? null : {ip: zi, wc: zwc}, zielPort, quellPort: null, icmpTyp: null});
  /* WAN-Anbindung: Internet wan-Port ↔ Router-Port, /30 aus 203.0.113.0/24 (RFC 5737) */
  function wan(n, z, router, port, inetPort = "wan0"){
    const k = z.zahl(40) + 1, basis = 4 * k;
    const inetIp = `203.0.113.${basis + 1}`, rIp = `203.0.113.${basis + 2}`, m = "255.255.255.252";
    Modell.setzen(n, "inet", `if.${inetPort}.ip`, inetIp); Modell.setzen(n, "inet", `if.${inetPort}.maske`, m);
    Modell.verbinden(n, {geraet: router, port}, {geraet: "inet", port: inetPort});
    return {inetIp, rIp, maske: m};
  }
  const speichernAlle = n => { for (const g of Object.values(n.geraete)) if (Modell.IOS[g.typ]) Modell.speichern(g); };
  const verschieden = (z, anzahl, min, max) => { const s = new Set(); while (s.size < anzahl) s.add(min + z.zahl(max - min + 1)); return [...s]; };

  const NAMEN = {
    salon: {kasse: "PC-Kasse", buero: "PC-Buero", drucker: "Drucker", r: "R-Salon", sw: "SW-Salon"},
    baeckerei: {kasse: "Kasse-Theke", buero: "PC-Backstube", drucker: "Bondrucker", r: "R-Baeckerei", sw: "SW-Laden"},
  };

  /* 1 · Ein LAN mit Router und NAT (Salon, Bäckerei) */
  V.lan = {name: "lan", titel: "Ein LAN mit Router ins Internet", kunde: "salon", stufe: 1,
    skills: ["lab.link", "lab.ip", "lab.netz", "lab.gateway", "lab.arp", "lab.ping", "lab.switch", "lab.cli", "lab.speichern", "lab.nat", "lab.route", "lab.dns"],
    bauen(z, o = {}){
      const N = NAMEN[o.kunde] || NAMEN.salon;
      const n = Modell.neu(), c = z.wahl([1, 2, 10, 20, 50, 100, 178]), p = `192.168.${c}.`;
      const gwEnd = z.wahl([1, 254]), gw = p + gwEnd, m = "255.255.255.0";
      const [a, b, d] = verschieden(z, 3, 10, 99).map(x => p + x);
      Modell.geraet(n, "internet", {id: "inet", x: 760, y: 80});
      Modell.geraet(n, "router", {id: "r1", name: N.r, x: 540, y: 80});
      Modell.geraet(n, "switch", {id: "sw1", name: N.sw, x: 400, y: 250});
      host(n, "kasse", N.kasse, 200, 420, {ip: a, maske: m, gw, dns: DNS_EXTERN}, {skin: "kasse"});
      host(n, "buero", N.buero, 400, 440, {ip: b, maske: m, gw, dns: DNS_EXTERN});
      host(n, "drucker", N.drucker, 600, 420, {ip: d, maske: m, gw, dns: ""}, {skin: "drucker", dienste: ["druck"]});
      Modell.verbinden(n, {geraet: "kasse"}, {geraet: "sw1", port: "Fa0/1"});
      Modell.verbinden(n, {geraet: "buero"}, {geraet: "sw1", port: "Fa0/2"});
      Modell.verbinden(n, {geraet: "drucker"}, {geraet: "sw1", port: "Fa0/3"});
      Modell.verbinden(n, {geraet: "sw1", port: "Gi0/1"}, {geraet: "r1", port: "Gi0/0"});
      const w = wan(n, z, "r1", "Gi0/1");
      rIf(n, "r1", "Gi0/0", gw, m, {nat: "inside", beschreibung: "LAN"});
      rIf(n, "r1", "Gi0/1", w.rIp, w.maske, {nat: "outside", beschreibung: "Internet"});
      Modell.setzen(n, "r1", "routen", [{netz: "0.0.0.0", maske: "0.0.0.0", nh: w.inetIp, aus: null, ad: 1}]);
      Modell.setzen(n, "r1", "acls", {"1": {typ: "standard", benannt: false, regeln: [regel("permit", p + "0", "0.0.0.255")]}});
      Modell.setzen(n, "r1", "nat", {statisch: [], dynamisch: [{acl: "1", aus: "Gi0/1", overload: true}]});
      speichernAlle(n);
      return {netz: n, rollen: {clients: ["kasse", "buero"], hosts: ["kasse", "buero", "drucker"], drucker: "drucker", router: "r1", switch: "sw1",
        lanIf: "Gi0/0", wanIf: "Gi0/1", netz: p + "0", maske: m, gw, inetIp: w.inetIp, namen: N},
        ziele: [
          {typ: "erreichbar", von: "kasse", nach: "drucker", proto: "tcp", port: 9100, text: `${N.kasse} druckt auf dem ${N.drucker}`},
          {typ: "erreichbar", von: "buero", nach: "drucker", proto: "icmp", text: `${N.buero} erreicht den ${N.drucker}`},
          {typ: "erreichbar", von: "kasse", nach: "buero", proto: "icmp", text: `${N.kasse} und ${N.buero} erreichen sich`},
          {typ: "erreichbar", von: "buero", nach: "www.beispiel.de", proto: "http", text: `${N.buero} öffnet www.beispiel.de`},
          {typ: "erreichbar", von: "kasse", nach: "198.51.100.10", proto: "icmp", text: `${N.kasse} erreicht das Internet`},
        ]};
    }};

  /* 2 · Schreibbüro: Clients und Server in zwei Netzen, DHCP über Relay, DNS, Dateifreigabe */
  V.buero = {name: "buero", titel: "Clients und Server in zwei Netzen", kunde: "schreibbuero", stufe: 2,
    skills: ["lab.dhcp", "lab.dns", "lab.ports", "lab.tcp", "lab.gateway", "lab.link", "lab.ip", "lab.cli", "lab.speichern", "lab.subnetz", "lab.route"],
    bauen(z, o = {}){
      const n = Modell.neu(), a = 10 + z.zahl(200), m = "255.255.255.0";
      const S = `10.${a}.10.`, C = `10.${a}.20.`, domain = "buero.local";
      const srvIp = S + z.wahl([5, 10, 20]), druckIp = C + z.wahl([20, 30, 40]);
      Modell.geraet(n, "internet", {id: "inet", x: 800, y: 70});
      Modell.geraet(n, "router", {id: "r1", name: "R-Buero", x: 560, y: 90});
      Modell.geraet(n, "switch", {id: "sw1", name: "SW-Clients", x: 330, y: 250});
      Modell.geraet(n, "switch", {id: "sw2", name: "SW-Server", x: 760, y: 250});
      host(n, "srv", "Server", 760, 430, {ip: srvIp, maske: m, gw: S + "1", dns: srvIp}, {typ: "server"});
      host(n, "pc1", "PC-Albers", 150, 430, null, {dhcp: true});
      host(n, "pc2", "PC-Sekretariat", 330, 450, null, {dhcp: true});
      host(n, "drucker", "Drucker", 510, 430, {ip: druckIp, maske: m, gw: C + "1", dns: srvIp}, {skin: "drucker", dienste: ["druck"]});
      Modell.setzen(n, "srv", "dienste", {
        http: {an: true}, https: {an: false}, datei: {an: true}, ssh: {an: false}, druck: {an: false},
        dns: {an: true, eintraege: [{name: "server." + domain, ip: srvIp}, {name: "drucker." + domain, ip: druckIp}]},
        dhcp: {an: true, pools: [{name: "CLIENTS", netz: C + "0", maske: m, gw: C + "1", dns: srvIp, start: C + "100", anzahl: 50}]},
      });
      Modell.verbinden(n, {geraet: "pc1"}, {geraet: "sw1", port: "Fa0/1"});
      Modell.verbinden(n, {geraet: "pc2"}, {geraet: "sw1", port: "Fa0/2"});
      Modell.verbinden(n, {geraet: "drucker"}, {geraet: "sw1", port: "Fa0/3"});
      Modell.verbinden(n, {geraet: "srv"}, {geraet: "sw2", port: "Fa0/1"});
      Modell.verbinden(n, {geraet: "sw1", port: "Gi0/1"}, {geraet: "r1", port: "Gi0/0"});
      Modell.verbinden(n, {geraet: "sw2", port: "Gi0/1"}, {geraet: "r1", port: "Gi0/1"});
      const w = wan(n, z, "r1", "Gi0/2");
      rIf(n, "r1", "Gi0/0", C + "1", m, {nat: "inside", helper: [srvIp], beschreibung: "Clients"});
      rIf(n, "r1", "Gi0/1", S + "1", m, {nat: "inside", beschreibung: "Server"});
      rIf(n, "r1", "Gi0/2", w.rIp, w.maske, {nat: "outside", beschreibung: "Internet"});
      Modell.setzen(n, "r1", "routen", [{netz: "0.0.0.0", maske: "0.0.0.0", nh: w.inetIp, aus: null, ad: 1}]);
      Modell.setzen(n, "r1", "acls", {"1": {typ: "standard", benannt: false, regeln: [regel("permit", `10.${a}.0.0`, "0.0.255.255")]}});
      Modell.setzen(n, "r1", "nat", {statisch: [], dynamisch: [{acl: "1", aus: "Gi0/2", overload: true}]});
      speichernAlle(n);
      return {netz: n, rollen: {clients: ["pc1", "pc2"], dhcpClients: ["pc1", "pc2"], hosts: ["pc1", "pc2", "drucker", "srv"], server: "srv", drucker: "drucker",
        router: "r1", switch: "sw1", switches: ["sw1", "sw2"], relayIf: "Gi0/0", lanIf: "Gi0/0", serverIf: "Gi0/1", wanIf: "Gi0/2", domain, netzC: C + "0", netzS: S + "0", maske: m, inetIp: w.inetIp},
        ziele: [
          {typ: "dhcp", von: "pc1", text: "PC-Albers bekommt automatisch eine Adresse"},
          {typ: "erreichbar", von: "pc1", nach: "server." + domain, proto: "http", text: "PC-Albers öffnet das Intranet (server.buero.local)"},
          {typ: "erreichbar", von: "pc2", nach: "srv", proto: "tcp", port: 445, text: "PC-Sekretariat erreicht die Dateifreigabe"},
          {typ: "erreichbar", von: "pc2", nach: "drucker", proto: "tcp", port: 9100, text: "PC-Sekretariat druckt"},
          {typ: "erreichbar", von: "pc1", nach: "198.51.100.10", proto: "http", text: "PC-Albers kommt ins Internet"},
        ]};
    }};

  /* 3 · Arztpraxis: drei VLANs, Router-on-a-Stick, Gäste per ACL getrennt */
  V.praxis = {name: "praxis", titel: "Drei VLANs mit Router-on-a-Stick", kunde: "praxis", stufe: 3,
    skills: ["lab.vlan", "lab.trunk", "lab.rostick", "lab.acl", "lab.link", "lab.gateway", "lab.cli", "lab.speichern", "lab.nat"],
    bauen(z, o = {}){
      const n = Modell.neu(), b = z.wahl([10, 40, 60, 110]), v1 = b, v2 = b + 10, v3 = b + 20, m = "255.255.255.0";
      const net = v => `192.168.${v}.`, srvIp = net(v1) + "5";
      Modell.geraet(n, "internet", {id: "inet", x: 780, y: 70});
      Modell.geraet(n, "router", {id: "r1", name: "R-Praxis", x: 500, y: 80});
      Modell.geraet(n, "switch", {id: "sw1", name: "SW-Praxis", x: 500, y: 260});
      host(n, "srv", "Server", 190, 260, {ip: srvIp, maske: m, gw: net(v1) + "1", dns: srvIp}, {typ: "server"});
      host(n, "empfang", "PC-Empfang", 250, 440, {ip: net(v1) + "21", maske: m, gw: net(v1) + "1", dns: srvIp});
      host(n, "behandlung", "PC-Behandlung", 500, 460, {ip: net(v2) + "21", maske: m, gw: net(v2) + "1", dns: srvIp});
      host(n, "gast", "Gast-Laptop", 750, 440, {ip: net(v3) + "21", maske: m, gw: net(v3) + "1", dns: DNS_EXTERN}, {skin: "laptop"});
      Modell.setzen(n, "srv", "dienste.datei", {an: true});
      Modell.setzen(n, "srv", "dienste.dns", {an: true, eintraege: [{name: "server.praxis.local", ip: srvIp}]});
      Modell.vlan(n, "sw1", v1, "Verwaltung"); Modell.vlan(n, "sw1", v2, "Behandlung"); Modell.vlan(n, "sw1", v3, "Gaeste");
      Modell.verbinden(n, {geraet: "srv"}, {geraet: "sw1", port: "Fa0/1"});
      Modell.verbinden(n, {geraet: "empfang"}, {geraet: "sw1", port: "Fa0/2"});
      Modell.verbinden(n, {geraet: "behandlung"}, {geraet: "sw1", port: "Fa0/11"});
      Modell.verbinden(n, {geraet: "gast"}, {geraet: "sw1", port: "Fa0/21"});
      Modell.verbinden(n, {geraet: "sw1", port: "Gi0/1"}, {geraet: "r1", port: "Gi0/0"});
      for (const [p, v] of [["Fa0/1", v1], ["Fa0/2", v1], ["Fa0/11", v2], ["Fa0/21", v3]]) Modell.setzen(n, "sw1", `ports.${p}.accessVlan`, v);
      Modell.setzen(n, "sw1", "ports.Gi0/1.modus", "trunk");
      Modell.setzen(n, "r1", "if.Gi0/0.shutdown", false);
      for (const v of [v1, v2, v3]) Modell.setzen(n, "r1", `if.Gi0/0.${v}`, Object.assign(Modell.subIf(v), {ip: net(v) + "1", maske: m, nat: "inside"}));
      const w = wan(n, z, "r1", "Gi0/1");
      rIf(n, "r1", "Gi0/1", w.rIp, w.maske, {nat: "outside", beschreibung: "Internet"});
      Modell.setzen(n, "r1", "routen", [{netz: "0.0.0.0", maske: "0.0.0.0", nh: w.inetIp, aus: null, ad: 1}]);
      Modell.setzen(n, "r1", "acls", {
        "1": {typ: "standard", benannt: false, regeln: [regel("permit", "192.168.0.0", "0.0.255.255")]},
        "GAST": {typ: "erweitert", benannt: true, regeln: [
          regel("deny", net(v3) + "0", "0.0.0.255", net(v1) + "0", "0.0.0.255"),
          regel("deny", net(v3) + "0", "0.0.0.255", net(v2) + "0", "0.0.0.255"),
          regel("permit", "0.0.0.0", "255.255.255.255", "0.0.0.0", "255.255.255.255")]},
      });
      Modell.setzen(n, "r1", `if.Gi0/0.${v3}.aclIn`, "GAST");
      Modell.setzen(n, "r1", "nat", {statisch: [], dynamisch: [{acl: "1", aus: "Gi0/1", overload: true}]});
      speichernAlle(n);
      return {netz: n, rollen: {clients: ["empfang", "behandlung"], hosts: ["srv", "empfang", "behandlung", "gast"], server: "srv", gast: "gast", router: "r1", switch: "sw1",
        vlans: {verwaltung: v1, behandlung: v2, gaeste: v3}, trunkPort: "Gi0/1", ports: {srv: "Fa0/1", empfang: "Fa0/2", behandlung: "Fa0/11", gast: "Fa0/21"},
        wanIf: "Gi0/1", inetIp: w.inetIp, gastAcl: "GAST"},
        ziele: [
          {typ: "erreichbar", von: "empfang", nach: "srv", proto: "tcp", port: 445, text: "Empfang öffnet die Patientenakten auf dem Server"},
          {typ: "erreichbar", von: "behandlung", nach: "srv", proto: "tcp", port: 445, text: "Behandlungsraum öffnet die Patientenakten"},
          {typ: "erreichbar", von: "behandlung", nach: "empfang", proto: "icmp", text: "Behandlung und Empfang erreichen sich"},
          {typ: "erreichbar", von: "gast", nach: "www.beispiel.de", proto: "http", text: "Gäste kommen ins Internet"},
          {typ: "blockiert", von: "gast", nach: "srv", proto: "tcp", port: 445, text: "Gäste kommen NICHT an die Patientenakten"},
          {typ: "blockiert", von: "gast", nach: "behandlung", proto: "icmp", text: "Gäste erreichen den Behandlungsraum NICHT"},
        ]};
    }};

  /* 4 · Autohaus: zwei Standorte, statische Routen, NAT für beide Netze */
  V.standorte = {name: "standorte", titel: "Zwei Standorte mit statischen Routen", kunde: "autohaus", stufe: 4,
    skills: ["lab.route", "lab.ttl", "lab.nat", "lab.gateway", "lab.link", "lab.subnetz", "lab.cli", "lab.speichern"],
    bauen(z, o = {}){
      const n = Modell.neu(), a = 10 + z.zahl(200), m = "255.255.255.0", mt = "255.255.255.252";
      const A = `10.${a}.1.`, B = `10.${a}.2.`, T = `10.${a}.255.`;
      Modell.geraet(n, "internet", {id: "inet", x: 460, y: 50});
      Modell.geraet(n, "router", {id: "r1", name: "R-Zentrale", x: 280, y: 160});
      Modell.geraet(n, "router", {id: "r2", name: "R-Filiale", x: 660, y: 160});
      Modell.geraet(n, "switch", {id: "sw1", name: "SW-Zentrale", x: 280, y: 310});
      Modell.geraet(n, "switch", {id: "sw2", name: "SW-Filiale", x: 660, y: 310});
      host(n, "srv", "Server", 120, 460, {ip: A + "10", maske: m, gw: A + "1", dns: A + "10"}, {typ: "server"});
      host(n, "verkauf", "PC-Verkauf", 330, 470, {ip: A + "21", maske: m, gw: A + "1", dns: A + "10"});
      host(n, "werkstatt", "PC-Werkstatt", 600, 470, {ip: B + "21", maske: m, gw: B + "1", dns: A + "10"});
      host(n, "annahme", "PC-Annahme", 800, 460, {ip: B + "22", maske: m, gw: B + "1", dns: A + "10"});
      Modell.setzen(n, "srv", "dienste.datei", {an: true});
      Modell.setzen(n, "srv", "dienste.dns", {an: true, eintraege: [{name: "server.autohaus.local", ip: A + "10"}]});
      Modell.verbinden(n, {geraet: "srv"}, {geraet: "sw1", port: "Fa0/1"});
      Modell.verbinden(n, {geraet: "verkauf"}, {geraet: "sw1", port: "Fa0/2"});
      Modell.verbinden(n, {geraet: "werkstatt"}, {geraet: "sw2", port: "Fa0/1"});
      Modell.verbinden(n, {geraet: "annahme"}, {geraet: "sw2", port: "Fa0/2"});
      Modell.verbinden(n, {geraet: "sw1", port: "Gi0/1"}, {geraet: "r1", port: "Gi0/0"});
      Modell.verbinden(n, {geraet: "sw2", port: "Gi0/1"}, {geraet: "r2", port: "Gi0/0"});
      Modell.verbinden(n, {geraet: "r1", port: "Gi0/1"}, {geraet: "r2", port: "Gi0/1"});
      const w = wan(n, z, "r1", "Gi0/2");
      rIf(n, "r1", "Gi0/0", A + "1", m, {nat: "inside", beschreibung: "LAN Zentrale"});
      rIf(n, "r1", "Gi0/1", T + "1", mt, {nat: "inside", beschreibung: "Standleitung Filiale"});
      rIf(n, "r1", "Gi0/2", w.rIp, w.maske, {nat: "outside", beschreibung: "Internet"});
      rIf(n, "r2", "Gi0/0", B + "1", m, {beschreibung: "LAN Filiale"});
      rIf(n, "r2", "Gi0/1", T + "2", mt, {beschreibung: "Standleitung Zentrale"});
      Modell.setzen(n, "r1", "routen", [{netz: B + "0", maske: m, nh: T + "2", aus: null, ad: 1}, {netz: "0.0.0.0", maske: "0.0.0.0", nh: w.inetIp, aus: null, ad: 1}]);
      Modell.setzen(n, "r2", "routen", [{netz: "0.0.0.0", maske: "0.0.0.0", nh: T + "1", aus: null, ad: 1}]);
      Modell.setzen(n, "r1", "acls", {"1": {typ: "standard", benannt: false, regeln: [regel("permit", `10.${a}.0.0`, "0.0.255.255")]}});
      Modell.setzen(n, "r1", "nat", {statisch: [], dynamisch: [{acl: "1", aus: "Gi0/2", overload: true}]});
      speichernAlle(n);
      return {netz: n, rollen: {clients: ["verkauf", "werkstatt", "annahme"], hosts: ["srv", "verkauf", "werkstatt", "annahme"], server: "srv", router: "r1", router2: "r2",
        switches: ["sw1", "sw2"], netzA: A + "0", netzB: B + "0", transfer: T + "0", maske: m, a, wanIf: "Gi0/2", inetIp: w.inetIp},
        ziele: [
          {typ: "erreichbar", von: "werkstatt", nach: "srv", proto: "tcp", port: 445, text: "Die Werkstatt öffnet die Auftragsdaten in der Zentrale"},
          {typ: "erreichbar", von: "annahme", nach: "verkauf", proto: "icmp", text: "Filiale und Zentrale erreichen sich"},
          {typ: "erreichbar", von: "werkstatt", nach: "198.51.100.10", proto: "http", text: "Die Filiale kommt ins Internet"},
          {typ: "erreichbar", von: "verkauf", nach: "198.51.100.10", proto: "http", text: "Die Zentrale kommt ins Internet"},
        ]};
    }};

  /* 5 · Mittelstand: Firewall mit Zonen innen, DMZ, außen; Webshop per Port-Weiterleitung */
  V.dmz = {name: "dmz", titel: "Firewall mit DMZ", kunde: "mittelstand", stufe: 5,
    skills: ["lab.fw", "lab.dmz", "lab.portfwd", "lab.nat", "lab.ports", "lab.route", "lab.gateway"],
    bauen(z, o = {}){
      const n = Modell.neu(), a = 10 + z.zahl(200), b = 1 + z.zahl(30), m = "255.255.255.0";
      const I = `10.${a}.10.`, D = `172.16.${b}.`, webIp = D + "10";
      Modell.geraet(n, "internet", {id: "inet", x: 700, y: 60});
      Modell.geraet(n, "firewall", {id: "fw", name: "FW", x: 420, y: 120});
      Modell.geraet(n, "switch", {id: "sw1", name: "SW-LAN", x: 220, y: 290});
      Modell.geraet(n, "switch", {id: "sw2", name: "SW-DMZ", x: 620, y: 290});
      host(n, "pc1", "PC-Vertrieb", 120, 450, {ip: I + "21", maske: m, gw: I + "1", dns: DNS_EXTERN});
      host(n, "pc2", "PC-Buchhaltung", 320, 460, {ip: I + "22", maske: m, gw: I + "1", dns: DNS_EXTERN});
      host(n, "web", "Webshop", 620, 450, {ip: webIp, maske: m, gw: D + "1", dns: DNS_EXTERN}, {typ: "server", dienste: ["https"]});
      Modell.verbinden(n, {geraet: "pc1"}, {geraet: "sw1", port: "Fa0/1"});
      Modell.verbinden(n, {geraet: "pc2"}, {geraet: "sw1", port: "Fa0/2"});
      Modell.verbinden(n, {geraet: "web"}, {geraet: "sw2", port: "Fa0/1"});
      Modell.verbinden(n, {geraet: "sw1", port: "Gi0/1"}, {geraet: "fw", port: "Gi0/0"});
      Modell.verbinden(n, {geraet: "sw2", port: "Gi0/1"}, {geraet: "fw", port: "Gi0/1"});
      const w = wan(n, z, "fw", "Gi0/2");
      const fwIf = (p, ip, mm, zone) => { Modell.setzen(n, "fw", `if.${p}`, {ip, maske: mm, zone, shutdown: false}); };
      fwIf("Gi0/0", I + "1", m, "innen"); fwIf("Gi0/1", D + "1", m, "dmz"); fwIf("Gi0/2", w.rIp, w.maske, "aussen");
      Modell.setzen(n, "fw", "routen", [{netz: "0.0.0.0", maske: "0.0.0.0", nh: w.inetIp, aus: null, ad: 1}]);
      Modell.setzen(n, "fw", "regeln", [
        {id: "r1", von: "innen", nach: "aussen", proto: "ip", quelle: "any", ziel: "any", port: null, aktion: "erlauben", aktiv: true, text: "LAN ins Internet"},
        {id: "r2", von: "innen", nach: "dmz", proto: "tcp", quelle: I + "0/24", ziel: webIp + "/32", port: 443, aktion: "erlauben", aktiv: true, text: "Mitarbeiter auf den Webshop"},
        {id: "r3", von: "aussen", nach: "dmz", proto: "tcp", quelle: "any", ziel: webIp + "/32", port: 443, aktion: "erlauben", aktiv: true, text: "Kunden auf den Webshop"},
        {id: "r4", von: "dmz", nach: "aussen", proto: "ip", quelle: "any", ziel: "any", port: null, aktion: "erlauben", aktiv: true, text: "Webshop holt Updates"},
      ]);
      Modell.setzen(n, "fw", "nat", {quellNat: [{von: "innen", nach: "aussen"}, {von: "dmz", nach: "aussen"}], weiterleitung: [{proto: "tcp", aussenPort: 443, ziel: webIp, zielPort: 443}]});
      /* ein Kunde „draußen“: Laptop direkt am Internet (eigenes öffentliches Netz, RFC 5737) */
      Modell.setzen(n, "inet", "if.wan1.ip", "203.0.113.193"); Modell.setzen(n, "inet", "if.wan1.maske", "255.255.255.192");
      host(n, "kunde", "Kunden-Laptop", 880, 200, {ip: "203.0.113.200", maske: "255.255.255.192", gw: "203.0.113.193", dns: DNS_EXTERN}, {skin: "laptop"});
      Modell.verbinden(n, {geraet: "kunde"}, {geraet: "inet", port: "wan1"});
      speichernAlle(n);
      return {netz: n, rollen: {clients: ["pc1", "pc2"], hosts: ["pc1", "pc2", "web"], web: "web", firewall: "fw", extern: "kunde", switches: ["sw1", "sw2"],
        netzInnen: I + "0", netzDmz: D + "0", fwAussen: w.rIp, webIp, inetIp: w.inetIp},
        ziele: [
          {typ: "erreichbar", von: "pc1", nach: "web", proto: "tcp", port: 443, text: "Der Vertrieb erreicht den Webshop (HTTPS)"},
          {typ: "erreichbar", von: "pc2", nach: "www.beispiel.de", proto: "http", text: "Das LAN kommt ins Internet"},
          {typ: "erreichbar", von: "kunde", nach: w.rIp, proto: "tcp", port: 443, text: "Kunden erreichen den Webshop über das Internet"},
          {typ: "blockiert", von: "web", nach: "pc1", proto: "icmp", text: "Aus der DMZ kommt niemand ins interne Netz"},
        ]};
    }};

  /* Welche Vorlage passt zu Kunde bzw. Fertigkeit? */
  V._fuerKunde = {salon: "lan", baeckerei: "lan", schreibbuero: "buero", praxis: "praxis", autohaus: "standorte", mittelstand: "dmz", storage: "buero"};
  Object.defineProperty(V, "_fuerKunde", {enumerable: false});
  return V;
})();
