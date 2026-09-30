"use strict";
/* ---------- Modell: Geräte, Ports, Kabel, Konfiguration als reine Daten ----------
   Vertrag: Architektur.md § 4. Kein DOM, keine Uhr. Alles hier ist JSON-sicher. */
const Modell = (() => {
  const TYPEN = ["pc", "server", "switch", "router", "firewall", "internet", "nas"];
  const NAMEN = {pc: "PC", server: "Server", switch: "Switch", router: "Router", firewall: "Firewall", internet: "Internet", nas: "NAS"};
  const IOS = {switch: true, router: true, firewall: true};
  const HOST = {pc: true, server: true, nas: true};
  const range = (pre, a, b) => Array.from({length: b - a + 1}, (_, i) => pre + (a + i));
  const PORTS = {
    pc: ["eth0"], server: ["eth0"], nas: ["eth0", "eth1"],
    switch: [...range("Fa0/", 1, 24), "Gi0/1", "Gi0/2"],
    router: ["Gi0/0", "Gi0/1", "Gi0/2"],
    firewall: ["Gi0/0", "Gi0/1", "Gi0/2", "Gi0/3"],
    internet: ["wan0", "wan1", "wan2", "wan3"],
  };
  /* Dienst → Transport/Port (Server-Seite) */
  const DIENSTPORTS = {
    http: {proto: "tcp", port: 80, name: "Webserver (HTTP)"}, https: {proto: "tcp", port: 443, name: "Webserver (HTTPS)"},
    dns: {proto: "udp", port: 53, name: "DNS-Server"}, dhcp: {proto: "udp", port: 67, name: "DHCP-Server"},
    datei: {proto: "tcp", port: 445, name: "Dateifreigabe (SMB)"}, ssh: {proto: "tcp", port: 22, name: "SSH"},
    druck: {proto: "tcp", port: 9100, name: "Druckdienst (RAW)"},
  };
  const DEFAULT_VLANS = () => ({"1": {name: "default"}});

  function hostIf(){ return {an: true, dhcp: false, ip: "", maske: "", gw: "", dns: ""}; }
  function switchPort(){ return {modus: "access", accessVlan: 1, trunkErlaubt: "all", nativeVlan: 1, shutdown: false, beschreibung: "", portSecurity: null}; }
  function routerIf(){ return {ip: "", maske: "", shutdown: true, beschreibung: "", nat: null, aclIn: null, aclOut: null, helper: []}; }
  function subIf(vlan){ return {vlan: vlan == null ? null : +vlan, nativ: false, ip: "", maske: "", shutdown: false, beschreibung: "", nat: null, aclIn: null, aclOut: null, helper: []}; }

  function werkszustand(typ, name){
    const hn = name || NAMEN[typ];
    switch (typ) {
      case "pc": case "server": case "nas": {
        const k = {hostname: hn, if: {}, dienste: {}};
        for (const p of PORTS[typ]) k.if[p] = hostIf();
        if (typ !== "pc") k.dienste = {
          http: {an: typ === "server"}, https: {an: false},
          dns: {an: false, eintraege: []},
          dhcp: {an: false, pools: []},
          datei: {an: typ === "nas"}, ssh: {an: false}, druck: {an: false},
        };
        return k;
      }
      case "switch": {
        const ports = {}; for (const p of PORTS.switch) ports[p] = switchPort();
        return {hostname: hn, enableSecret: null, banner: "", ports, svi: {"1": {ip: "", maske: "", shutdown: true}}, defaultGateway: ""};
      }
      case "router": {
        const ifs = {}; for (const p of PORTS.router) ifs[p] = routerIf();
        return {hostname: hn, enableSecret: null, banner: "", if: ifs, routen: [], acls: {}, nat: {statisch: [], dynamisch: []}, dhcp: {ausgeschlossen: [], pools: []}};
      }
      case "firewall": {
        const ifs = {}; for (const p of PORTS.firewall) ifs[p] = {ip: "", maske: "", zone: null, shutdown: false};
        return {hostname: hn, if: ifs, routen: [], regeln: [], nat: {quellNat: [], weiterleitung: []}};
      }
      case "internet": {
        const ifs = {}; for (const p of PORTS.internet) ifs[p] = {ip: "", maske: ""};
        return {hostname: "Internet", if: ifs, routen: [], server: [
          {name: "www.beispiel.de", ip: "198.51.100.10", dienste: ["http", "https"]},
          {name: "dns.beispiel.de", ip: "198.51.100.53", dienste: ["dns"]},
        ]};
      }
    }
    throw new Error("Unbekannter Gerätetyp " + typ);
  }

  /* FNV-1a für stabile MACs aus Gerät+Port */
  function hash(s){ let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function alleMacs(netz){ const s = new Set(); for (const g of Object.values(netz.geraete)) for (const m of Object.values(g.hw?.macs || {})) s.add(m); return s; }
  function macsVergeben(netz, g){
    const vergeben = alleMacs(netz); g.hw = {macs: {}};
    for (const p of PORTS[g.typ]) {
      let salz = 0, mac;
      do { mac = IP.macAus(hash(`${g.id}/${p}/${salz++}`)); } while (vergeben.has(mac));
      vergeben.add(mac); g.hw.macs[p] = mac;
    }
  }

  const neu = () => ({v: 1, geraete: {}, kabel: [], zustand: {_uhr: 0}});
  function freieId(netz, typ){
    const kurz = {pc: "pc", server: "srv", switch: "sw", router: "r", firewall: "fw", internet: "inet", nas: "nas"}[typ];
    let i = 1; while (netz.geraete[kurz + i]) i++; return kurz + i;
  }
  function freierName(netz, typ){
    const basis = {pc: "PC", server: "Server", switch: "SW", router: "R", firewall: "FW", internet: "Internet", nas: "NAS"}[typ];
    if (typ === "internet") return "Internet";
    const namen = new Set(Object.values(netz.geraete).map(g => g.name));
    let i = 1; while (namen.has(basis + i)) i++; return basis + i;
  }
  /* Gerät anlegen: Modell.geraet(netz, "router", {id:"r1", name:"R1", x:300, y:200}) */
  function geraet(netz, typ, o = {}){
    if (!PORTS[typ]) throw new Error("Unbekannter Gerätetyp " + typ);
    const id = o.id || freieId(netz, typ);
    if (netz.geraete[id]) throw new Error("Gerät existiert schon: " + id);
    const name = o.name || freierName(netz, typ);
    const g = {id, typ, skin: o.skin || null, name, x: o.x ?? 100, y: o.y ?? 100, an: o.an ?? true, hw: null,
               running: werkszustand(typ, name), startup: null, flash: typ === "switch" ? {vlans: DEFAULT_VLANS()} : {}};
    macsVergeben(netz, g);
    netz.geraete[id] = g;
    return g;
  }
  function entfernen(netz, id){
    netz.kabel = netz.kabel.filter(k => k.a.geraet !== id && k.b.geraet !== id);
    delete netz.geraete[id]; delete netz.zustand[id];
  }
  const ports = g => PORTS[g.typ].slice();
  function kabelAn(netz, id, port){
    for (const k of netz.kabel) {
      if (k.a.geraet === id && k.a.port === port) return {kabel: k, gegen: k.b};
      if (k.b.geraet === id && k.b.port === port) return {kabel: k, gegen: k.a};
    }
    return null;
  }
  function freierPort(netz, id, gegenTyp){
    const g = netz.geraete[id]; if (!g) return null;
    let liste = ports(g);
    if (g.typ === "switch" && gegenTyp && !HOST[gegenTyp]) liste = [...liste.filter(p => p.startsWith("Gi")), ...liste.filter(p => !p.startsWith("Gi"))];
    return liste.find(p => !kabelAn(netz, id, p)) || null;
  }
  function freieKabelId(netz){ let i = 1; const s = new Set(netz.kabel.map(k => k.id)); while (s.has("k" + i)) i++; return "k" + i; }
  /* verbinden(netz, {geraet:"pc1"}, {geraet:"sw1", port:"Fa0/3"}) */
  function verbinden(netz, a, b){
    const ga = netz.geraete[a.geraet], gb = netz.geraete[b.geraet];
    if (!ga || !gb) return {fehler: "Gerät nicht gefunden."};
    if (ga === gb) return {fehler: "Ein Gerät kann nicht mit sich selbst verbunden werden."};
    const pa = a.port || freierPort(netz, ga.id, gb.typ), pb = b.port || freierPort(netz, gb.id, ga.typ);
    if (!pa) return {fehler: `${ga.name} hat keinen freien Anschluss mehr.`};
    if (!pb) return {fehler: `${gb.name} hat keinen freien Anschluss mehr.`};
    if (!PORTS[ga.typ].includes(pa)) return {fehler: `${ga.name} hat keinen Anschluss ${pa}.`};
    if (!PORTS[gb.typ].includes(pb)) return {fehler: `${gb.name} hat keinen Anschluss ${pb}.`};
    if (kabelAn(netz, ga.id, pa)) return {fehler: `${ga.name} ${pa} ist schon belegt.`};
    if (kabelAn(netz, gb.id, pb)) return {fehler: `${gb.name} ${pb} ist schon belegt.`};
    const k = {id: freieKabelId(netz), a: {geraet: ga.id, port: pa}, b: {geraet: gb.id, port: pb}};
    netz.kabel.push(k);
    return k;
  }
  function trennen(netz, kabelId){
    const k = netz.kabel.find(x => x.id === kabelId); if (!k) return false;
    netz.kabel = netz.kabel.filter(x => x !== k);
    macsVergessen(netz, k.a.geraet, k.a.port); macsVergessen(netz, k.b.geraet, k.b.port);
    return true;
  }
  /* Ist der Port administrativ und elektrisch oben (ohne Kabelbetrachtung)? */
  function portAn(netz, id, port){
    const g = netz.geraete[id]; if (!g) return {an: false, grund: "DEVICE_OFF"};
    if (!g.an) return {an: false, grund: "DEVICE_OFF"};
    const k = g.running;
    if (HOST[g.typ]) return k.if[port] && k.if[port].an === false ? {an: false, grund: "PORT_SHUTDOWN"} : {an: true};
    if (g.typ === "switch") {
      if (k.ports[port]?.shutdown) return {an: false, grund: "PORT_SHUTDOWN"};
      if (netz.zustand?.[id]?.errdisabled?.[port]) return {an: false, grund: "PORTSEC_VIOLATION"};
      return {an: true};
    }
    if (g.typ === "router" || g.typ === "firewall") return k.if[port]?.shutdown ? {an: false, grund: "PORT_SHUTDOWN"} : {an: true};
    return {an: true};
  }
  function linkOben(netz, kabel){
    for (const s of [kabel.a, kabel.b]) { const p = portAn(netz, s.geraet, s.port); if (!p.an) return {oben: false, grund: p.grund, seite: s}; }
    return {oben: true, grund: null};
  }
  /* Portstatus für die Anzeige: "oben" | "unten" | "frei" | "aus" */
  function portStatus(netz, id, port){
    const ka = kabelAn(netz, id, port), pa = portAn(netz, id, port);
    if (!pa.an) return {status: "aus", grund: pa.grund};
    if (!ka) return {status: "frei", grund: "LINK_DOWN"};
    const l = linkOben(netz, ka.kabel);
    return l.oben ? {status: "oben", grund: null} : {status: "unten", grund: l.grund};
  }

  /* Pfade: "if.eth0.gw", "if.Gi0/0.10.ip" (Subinterface), "ports.Fa0/5.accessVlan", "svi.1.ip" */
  function pfad(p){
    if (Array.isArray(p)) return p.slice();
    const s = String(p).split(".");
    if (s[0] === "if" && s.length >= 3 && /\//.test(s[1]) && /^\d+$/.test(s[2])) s.splice(1, 2, s[1] + "." + s[2]);
    return s;
  }
  function lesen(obj, p){ let o = obj; for (const k of pfad(p)) { if (o == null) return undefined; o = o[k]; } return o; }
  /* Konfigurationswert setzen (running). Legt fehlende Subinterfaces an. Räumt Laufzeit auf. */
  function setzen(netz, id, p, wert){
    const g = netz.geraete[id]; if (!g) throw new Error("Gerät nicht gefunden: " + id);
    const s = pfad(p); let o = g.running;
    for (let i = 0; i < s.length - 1; i++) {
      const k = s[i];
      if (o[k] == null) {
        if (s[i-1] === "if" && g.typ === "router" && /\.\d+$/.test(k)) o[k] = subIf(null);
        else if (s[i-1] === "svi") o[k] = {ip: "", maske: "", shutdown: true};
        else o[k] = {};
      }
      o = o[k];
    }
    o[s[s.length - 1]] = tief(wert);
    if (s[0] === "hostname" && IOS[g.typ]) g.name = wert;
    aufraeumen(netz, id, s);
    return g;
  }
  function loeschen(netz, id, p){
    const g = netz.geraete[id]; const s = pfad(p); let o = g.running;
    for (let i = 0; i < s.length - 1; i++) { o = o?.[s[i]]; if (o == null) return; }
    if (Array.isArray(o)) o.splice(+s[s.length-1], 1); else delete o[s[s.length - 1]];
    aufraeumen(netz, id, s);
  }
  function laufzeit(netz, id){ return (netz.zustand ||= {_uhr: 0})[id] ||= {}; }
  function macsVergessen(netz, id, port){
    const z = netz.zustand?.[id]; if (!z?.mac) return;
    for (const tab of Object.values(z.mac)) for (const [m, e] of Object.entries(tab)) if (e.port === port) delete tab[m];
  }
  function aufraeumen(netz, id, s){
    const z = laufzeit(netz, id);
    if (s[0] === "if" || s[0] === "svi" || s[0] === "routen") { z.arp = {}; }
    if (s[0] === "if" && (s[2] === "dhcp" || s[2] === "ip" || s[2] === "maske") && z.dhcp) delete z.dhcp[s[1]];
    if (s[0] === "ports" && (s[2] === "shutdown" || s[2] === "modus" || s[2] === "accessVlan")) macsVergessen(netz, id, s[1]);
    if (s[0] === "nat") z.nat = [];
  }
  function geraetSetzen(netz, id, feld, wert){
    const g = netz.geraete[id];
    if (feld === "an") {
      g.an = !!wert;
      if (!g.an) netz.zustand[id] = {};                         /* Strom aus: Laufzeit weg */
      if (!g.an) for (const k of netz.kabel) { const gg = k.a.geraet === id ? k.b : k.b.geraet === id ? k.a : null; if (gg) macsVergessen(netz, gg.geraet, gg.port); }
    } else if (feld === "name") { g.name = wert; if (IOS[g.typ] || HOST[g.typ]) g.running.hostname = wert; }
    else g[feld] = wert;
  }
  /* VLAN-Datenbank (Switch, flash:vlan.dat) */
  function vlan(netz, id, nr, name){
    const g = netz.geraete[id]; const v = g.flash.vlans ||= DEFAULT_VLANS();
    if (name === null) { if (String(nr) !== "1") delete v[String(nr)]; }
    else v[String(nr)] = {name: name || ("VLAN" + String(nr).padStart(4, "0"))};
  }
  const speichern = g => { g.startup = tief(g.running); };
  function neustart(netz, id){
    const g = netz.geraete[id];
    g.running = g.startup ? tief(g.startup) : werkszustand(g.typ, IOS[g.typ] ? NAMEN[g.typ] : g.name);
    if (IOS[g.typ]) g.name = g.running.hostname;
    netz.zustand[id] = {};
    for (const k of netz.kabel) { const gg = k.a.geraet === id ? k.b : k.b.geraet === id ? k.a : null; if (gg) macsVergessen(netz, gg.geraet, gg.port); }
  }
  /* write erase: startup-config löschen (vlan.dat bleibt!) */
  const startupLoeschen = g => { g.startup = null; };
  const kopie = netz => tief(netz);
  const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const ungespeichert = g => !!g && (IOS[g.typ]) && !gleich(g.running, g.startup ?? werkszustand(g.typ, NAMEN[g.typ]));

  /* Alle konfigurierten L3-Adressen eines Geräts (für Prüfungen und Anzeige) */
  function adressen(g){
    const k = g.running, r = [];
    if (HOST[g.typ]) for (const [p, i] of Object.entries(k.if)) { if (!i.dhcp && i.ip) r.push({port: p, ip: i.ip, maske: i.maske}); }
    if (g.typ === "router" || g.typ === "firewall" || g.typ === "internet") for (const [p, i] of Object.entries(k.if)) { if (i.ip) r.push({port: p, ip: i.ip, maske: i.maske}); }
    if (g.typ === "switch") for (const [v, i] of Object.entries(k.svi || {})) if (i.ip) r.push({port: "Vlan" + v, ip: i.ip, maske: i.maske});
    return r;
  }

  /* Live-Prüfung für den Inspektor. Nur Tippfehler und offensichtliche Widersprüche,
     keine Lösungsverrate: „Gateway liegt nicht im eigenen Netz“ sagt ein echter Windows-Dialog auch. */
  function pruefen(netz){
    const w = [], ipsGesehen = {};
    const add = (geraet, feld, code, text) => w.push({geraet, feld, code, text});
    for (const g of Object.values(netz.geraete)) {
      const k = g.running;
      if (HOST[g.typ]) for (const [p, i] of Object.entries(k.if)) {
        if (i.dhcp) continue;
        const f = `if.${p}`;
        if (i.ip && !IP.gueltig(i.ip)) add(g.id, f + ".ip", "IP_SYNTAX", `„${i.ip}“ ist keine gültige IPv4-Adresse (vier Zahlen 0–255, getrennt durch Punkte).`);
        if (i.maske && !IP.maskeGueltig(i.maske)) add(g.id, f + ".maske", "MASK_SYNTAX", `„${i.maske}“ ist keine gültige Subnetzmaske (erst nur Einsen, dann nur Nullen).`);
        if (i.ip && IP.gueltig(i.ip) && !i.maske) add(g.id, f + ".maske", "MASK_EMPTY", "Ohne Subnetzmaske weiß der Rechner nicht, welche Adressen im eigenen Netz liegen.");
        if (IP.gueltig(i.ip) && IP.maskeGueltig(i.maske)) {
          if (IP.istNetzadresse(i.ip, i.maske)) add(g.id, f + ".ip", "IP_IS_NET", `${i.ip} ist die Netzadresse von ${IP.cidr(i.ip, i.maske)} und kein Host.`);
          if (IP.istBroadcast(i.ip, i.maske)) add(g.id, f + ".ip", "IP_IS_BC", `${i.ip} ist die Broadcastadresse von ${IP.cidr(i.ip, i.maske)} und kein Host.`);
          if (i.gw && IP.gueltig(i.gw) && !IP.gleichesNetz(i.ip, i.gw, i.maske)) add(g.id, f + ".gw", "GW_WRONG_SUBNET", `Gateway ${i.gw} liegt nicht im Netz ${IP.cidr(i.ip, i.maske)}.`);
          if (i.gw && i.gw === i.ip) add(g.id, f + ".gw", "GW_SELF", "Das Gateway ist die eigene Adresse. Gemeint ist der Router.");
        }
        if (i.gw && !IP.gueltig(i.gw)) add(g.id, f + ".gw", "IP_SYNTAX", `„${i.gw}“ ist keine gültige Gateway-Adresse.`);
        if (i.dns && !IP.gueltig(i.dns)) add(g.id, f + ".dns", "IP_SYNTAX", `„${i.dns}“ ist keine gültige DNS-Server-Adresse.`);
      }
      for (const a of adressen(g)) if (IP.gueltig(a.ip)) (ipsGesehen[a.ip] ||= []).push({g, a});
    }
    for (const [ip, liste] of Object.entries(ipsGesehen)) if (liste.length > 1)
      for (const {g, a} of liste) add(g.id, HOST[g.typ] ? `if.${a.port}.ip` : `if.${a.port}.ip`, "DUP_IP", `${ip} ist mehrfach vergeben (${liste.map(x => x.g.name).join(", ")}).`);
    return w;
  }

  return {TYPEN, NAMEN, PORTS, DIENSTPORTS, IOS, HOST, werkszustand, subIf, switchPort, routerIf, hostIf,
          neu, geraet, entfernen, ports, kabelAn, freierPort, verbinden, trennen, portAn, linkOben, portStatus,
          pfad, lesen, setzen, loeschen, geraetSetzen, vlan, laufzeit, macsVergessen, speichern, neustart, startupLoeschen,
          kopie, gleich, ungespeichert, adressen, pruefen, konfig: g => g.running};
})();
