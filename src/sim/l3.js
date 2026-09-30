"use strict";
/* ---------- Simulation: IP-Stapel für alle Geräte mit Adresse ----------
   Schnittstellen (einheitliche Sicht auf Host-, Router-, SVI-, Firewall- und Internet-Konfiguration),
   ARP-Cache und -Auflösung, ICMP-Fehlermeldungen, Routingtabelle, Sockets für die Aufrufe. */
Sim.l3 = (() => {
  const TTL = {pc: 128, server: 128, nas: 64, router: 255, switch: 255, firewall: 64, internet: 64};
  const ttlStart = g => TTL[g.typ] || 64;
  const sviMac = g => IP.macAus(Sim._hash(g.id + "/svi"));
  const gueltig = (ip, m) => IP.gueltig(ip) && IP.maskeGueltig(m) && IP.hostAdresse(ip, m);

  /* ---- Schnittstellen ----
     ifc = {geraet, name, port, vlan, nativ, svi, ip, maske, gw, dns, mac, oben, quelle, nat, aclIn, aclOut, helper, zone} */
  function linkOk(L, gid, port){ return !Sim._linkGrund(L, gid, port); }
  function hostIfs(L, g){
    const r = [], z = L.netz.zustand[g.id] || {};
    for (const port of Modell.PORTS[g.typ]) {
      const c = g.running.if[port]; if (!c) continue;
      const i = {geraet: g.id, name: port, port, vlan: null, nativ: false, svi: null, ip: "", maske: "", gw: "", dns: "",
                 mac: g.hw.macs[port], oben: g.an && c.an !== false && linkOk(L, g.id, port), quelle: "keine", dhcp: !!c.dhcp};
      if (c.dhcp) {
        const l = z.dhcp && z.dhcp[port];
        if (l && (l.apipa || l.bis > L.t)) Object.assign(i, {ip: l.ip, maske: l.maske, gw: l.gw || "", dns: l.dns || "", quelle: l.apipa ? "apipa" : "dhcp"});
      } else if (gueltig(c.ip, c.maske)) {
        Object.assign(i, {ip: c.ip, maske: c.maske, gw: IP.gueltig(c.gw) ? c.gw : "", dns: IP.gueltig(c.dns) ? c.dns : "", quelle: "statisch"});
      } else if (c.ip) i.fehlerhaft = true;
      r.push(i);
    }
    return r;
  }
  function routerIfs(L, g){
    const r = [], ifs = g.running.if || {};
    for (const [name, c] of Object.entries(ifs)) {
      const port = name.split(".")[0], sub = name.includes(".");
      if (!Modell.PORTS.router.includes(port)) continue;
      const phys = ifs[port] || {};
      const oben = g.an && !c.shutdown && !(sub && phys.shutdown) && (!sub || c.vlan != null) && linkOk(L, g.id, port);
      r.push({geraet: g.id, name, port, vlan: sub ? (c.vlan == null ? null : +c.vlan) : null, nativ: sub ? !!c.nativ : false, svi: null,
              ip: gueltig(c.ip, c.maske) ? c.ip : "", maske: gueltig(c.ip, c.maske) ? c.maske : "", gw: "", dns: "",
              mac: g.hw.macs[port], oben, quelle: "statisch", nat: c.nat || null, aclIn: c.aclIn || null, aclOut: c.aclOut || null,
              helper: (c.helper || []).filter(IP.gueltig), sub});
    }
    return r;
  }
  function sviOben(L, g, v){
    const k = g.running, c = (k.svi || {})[v];
    if (!g.an || !c || c.shutdown || !(g.flash?.vlans || {})[String(v)]) return false;
    for (const [p, pc] of Object.entries(k.ports)) {
      if (!Modell.kabelAn(L.netz, g.id, p) || !linkOk(L, g.id, p)) continue;
      if (pc.modus === "trunk" ? Sim.switch.erlaubt(pc, +v) : +pc.accessVlan === +v) return true;
    }
    return false;
  }
  function switchIfs(L, g){
    const r = [];
    for (const [v, c] of Object.entries(g.running.svi || {})) {
      const ok = gueltig(c.ip, c.maske);
      r.push({geraet: g.id, name: "Vlan" + v, port: null, vlan: null, nativ: false, svi: +v, ip: ok ? c.ip : "", maske: ok ? c.maske : "",
              gw: IP.gueltig(g.running.defaultGateway) ? g.running.defaultGateway : "", dns: "", mac: sviMac(g), oben: sviOben(L, g, v), quelle: "statisch"});
    }
    return r;
  }
  function einfacheIfs(L, g){
    const r = [];
    for (const port of Modell.PORTS[g.typ]) {
      const c = (g.running.if || {})[port] || {}; const ok = gueltig(c.ip, c.maske);
      r.push({geraet: g.id, name: port, port, vlan: null, nativ: false, svi: null, ip: ok ? c.ip : "", maske: ok ? c.maske : "", gw: "", dns: "",
              mac: g.hw.macs[port], oben: g.an && !c.shutdown && linkOk(L, g.id, port), quelle: "statisch", zone: c.zone || null});
    }
    return r;
  }
  function schnittstellen(L, g){
    const c = (L.cache.ifs ||= {});
    if (c[g.id]) return c[g.id];
    let r = [];
    if (Sim._istHost(g)) r = hostIfs(L, g);
    else if (g.typ === "router") r = routerIfs(L, g);
    else if (g.typ === "switch") r = switchIfs(L, g);
    else r = einfacheIfs(L, g);
    return (c[g.id] = r);
  }
  const ifName = (L, g, name) => schnittstellen(L, g).find(i => i.name === name) || null;
  /* Welche Schnittstelle nimmt einen Frame an diesem Port (mit diesem 802.1Q-Tag) an? */
  function ifFuerPort(L, g, port, tag){
    const liste = schnittstellen(L, g).filter(i => i.port === port);
    if (g.typ === "router") {
      if (tag != null) return liste.find(i => i.sub && i.vlan === +tag) || null;
      return liste.find(i => i.sub && i.nativ) || liste.find(i => !i.sub) || null;
    }
    if (tag != null) return null;
    return liste[0] || null;
  }
  const eigeneIfc = (L, g, ip) => schnittstellen(L, g).find(i => i.ip && i.ip === ip) || null;

  /* ---- ARP ---- */
  const arpTab = (L, g) => (Sim._z(L, g.id).arp ||= {});
  function arpGet(L, g, ip){ const e = arpTab(L, g)[ip]; return e && e.bis > L.t ? e : null; }
  function arpSet(L, g, ifc, ip, mac){
    arpTab(L, g)[ip] = {mac, bis: L.t + (Sim._istHost(g) ? Sim.T.ARP_HOST : Sim.T.ARP_IOS), if: ifc.name};
  }
  /* IOS verwirft das auslösende Paket, solange ARP läuft; Hosts, Firewall und Internet halten es zurück */
  const arpVerwirft = g => g.typ === "router" || g.typ === "switch";

  /* Frame mit Ethernet-Kopf versehen und über die Schnittstelle hinausschicken */
  function raus(L, g, ifc, dstMac, f, text){
    f.eth = {src: ifc.mac, dst: dstMac, typ: f.arp ? "ARP" : "IPv4", vlan: ifc.vlan != null && !ifc.nativ ? ifc.vlan : null};
    if (ifc.svi != null) return Sim.switch.ausSvi(L, g, ifc, f, text);
    return Sim._senden(L, g.id, ifc.port, f, text);
  }
  function anfragen(L, g, ifc, nh, text){
    const f = Sim._frame({arp: {op: "request", senderMac: ifc.mac, senderIp: ifc.ip, targetMac: Sim.MAC_NULL, targetIp: nh}});
    return raus(L, g, ifc, IP.MAC_BROADCAST, f, text || `${g.name} kennt die MAC-Adresse von ${nh} noch nicht und fragt per ARP-Broadcast: „Wer hat ${nh}?“`);
  }
  /* Nächsten Hop auflösen und senden. opt.diagnose(L) → {grund, text} beim Ausbleiben der Antwort.
     Rückgabe: true (gesendet oder wartet), false (verworfen). */
  function aufloesen(L, g, ifc, nh, f, opt){
    opt = opt || {};
    const e = arpGet(L, g, nh);
    if (e) return raus(L, g, ifc, e.mac, f, opt.text);
    const key = g.id + "|" + nh;
    let w = L.arpWarte[key];
    if (arpVerwirft(g)) {
      Sim._log(L, "verwerfen", g.id, ifc.port || ifc.name, f,
        `${g.name} kennt die MAC-Adresse von ${nh} noch nicht. Es fragt per ARP und verwirft dieses Paket (IOS-Verhalten – deshalb geht beim ersten Ping oft das erste Paket verloren: „.!!!!“).`);
      if (!w || L.t - w.seit >= Sim.T.ARP_WIEDERHOLEN) {
        w = L.arpWarte[key] = {seit: L.t, pakete: [], ifc, nh, opt};
        anfragen(L, g, ifc, nh);
        zeitAus(L, g, key, w);
      }
      return false;
    }
    if (w) { w.pakete.push({f, text: opt.text}); return true; }
    w = L.arpWarte[key] = {seit: L.t, pakete: [{f, text: opt.text}], ifc, nh, opt};
    if (!anfragen(L, g, ifc, nh)) { delete L.arpWarte[key]; lokalerFehler(L, g, f, Sim._letzterGrund(L) || "LINK_DOWN"); return false; }
    zeitAus(L, g, key, w);
    return true;
  }
  function zeitAus(L, g, key, w){
    Sim._plan(L, Sim.T.ARP_WARTEN, () => {
      if (L.arpWarte[key] !== w) return;
      delete L.arpWarte[key];
      if (arpGet(L, g, w.nh)) return;
      const d = (w.opt.diagnose && w.opt.diagnose(L)) || {grund: "ARP_NO_REPLY",
        text: `${g.name} bekommt keine ARP-Antwort für ${w.nh}. Im Netz ${IP.cidr(w.ifc.ip, w.ifc.maske) || ""} meldet sich niemand mit dieser Adresse.`};
      const f = w.pakete.length ? w.pakete[0].f : null;
      Sim._log(L, "verwerfen", g.id, w.ifc.port || w.ifc.name, f, d.text, {grund: d.grund, proto: "ARP"});
      for (const p of w.pakete) lokalerFehler(L, g, p.f, d.grund, d.text);
    });
  }
  function aufgeloest(L, g, ifc, ip, mac){
    const key = g.id + "|" + ip, w = L.arpWarte[key];
    if (!w) return;
    delete L.arpWarte[key];
    for (const p of w.pakete) raus(L, g, w.ifc, mac, p.f, p.text);
  }
  function arpEmpfangen(L, g, ifc, f){
    const a = f.arp, wo = ifc.port || ifc.name;
    if (!ifc.ip) { Sim._log(L, "verwerfen", g.id, wo, f, `${g.name} hat an ${ifc.name} keine IP-Adresse und beachtet die ARP-Nachricht nicht.`); return; }
    if (a.senderIp === ifc.ip && a.senderMac !== ifc.mac) {
      L.dup = true;
      Sim._log(L, "info", g.id, wo, f, `${g.name} sieht eine ARP-Nachricht von ${a.senderMac}, die seine eigene Adresse ${ifc.ip} benutzt – zwei Geräte haben dieselbe IP (Adresskonflikt).`, {grund: "DUP_IP"});
    }
    if (a.op === "request") {
      if (a.targetIp === ifc.ip) {
        const lernt = a.senderIp !== "0.0.0.0" && a.senderIp !== ifc.ip;
        if (lernt) arpSet(L, g, ifc, a.senderIp, a.senderMac);
        Sim._log(L, "antworten", g.id, wo, f, `${g.name} erkennt seine Adresse ${ifc.ip}${lernt ? `, merkt sich ${a.senderIp} → ${a.senderMac}` : ""} und antwortet per Unicast.`);
        const r = Sim._frame({arp: {op: "reply", senderMac: ifc.mac, senderIp: ifc.ip, targetMac: a.senderMac, targetIp: a.senderIp}});
        raus(L, g, ifc, a.senderMac, r);
        if (lernt) aufgeloest(L, g, ifc, a.senderIp, a.senderMac);
      } else {
        const t = arpTab(L, g);
        if (t[a.senderIp] && a.senderIp !== "0.0.0.0") t[a.senderIp] = Object.assign(t[a.senderIp], {mac: a.senderMac});
        Sim._log(L, "verwerfen", g.id, wo, f, `${g.name} ist nicht gemeint (gesucht: ${a.targetIp}) und verwirft die ARP-Anfrage.`);
      }
      return;
    }
    if (a.targetIp !== ifc.ip && a.targetMac !== ifc.mac) { Sim._log(L, "verwerfen", g.id, wo, f, `Die ARP-Antwort ist nicht für ${g.name}.`); return; }
    const key = g.id + "|" + a.senderIp, vorher = L.arpAntwort[key];
    if (vorher && vorher !== a.senderMac) {
      L.dup = true;
      Sim._log(L, "info", g.id, wo, f, `${g.name} bekommt für ${a.senderIp} Antworten von zwei MAC-Adressen (${vorher} und ${a.senderMac}): Zwei Geräte benutzen dieselbe IP. Der ARP-Eintrag springt auf die letzte Antwort.`, {grund: "DUP_IP"});
    }
    L.arpAntwort[key] = a.senderMac;
    arpSet(L, g, ifc, a.senderIp, a.senderMac);
    Sim._log(L, "lernen", g.id, wo, f, `${g.name} trägt ${a.senderIp} → ${a.senderMac} in seinen ARP-Cache ein.`);
    aufgeloest(L, g, ifc, a.senderIp, a.senderMac);
  }

  /* ---- Sockets der Aufrufe (Client-Seite) ---- */
  function socket(L, def){ const s = Object.assign({ids: new Set()}, def); L.sockets.push(s); return s; }
  function zustellen(L, g, ifc, f){
    for (const s of L.sockets) if (!s.zu && s.geraet === g.id && s.passt(f)) { s.bei(f, ifc); return true; }
    return false;
  }
  function lokalerFehler(L, g, f, grund, text){
    if (!f || !f.ip) return;
    for (const s of L.sockets) if (!s.zu && s.geraet === g.id && s.ids.has(f.ip.id) && s.fehler) s.fehler({grund, text});
  }

  /* ---- ICMP ---- */
  const ICMPTEXT = {unreachable: "Destination unreachable", "time-exceeded": "Time exceeded"};
  function icmpFehler(L, g, ifcIn, f, typ, code, grund){
    if (!f || !f.ip) return false;
    if (f.icmp && (f.icmp.typ === "unreachable" || f.icmp.typ === "time-exceeded")) return false;   /* nie Fehler über Fehler (RFC 1812) */
    if (f.ip.src === "0.0.0.0" || f.ip.dst === "255.255.255.255") return false;
    const z = Sim._z(L, g.id);
    if (typ === "unreachable" && g.typ === "router") {
      if (z.unreachZuletzt != null && L.t >= z.unreachZuletzt && L.t - z.unreachZuletzt < Sim.T.UNREACH_DROSSEL) {
        Sim._log(L, "info", g.id, ifcIn ? (ifcIn.port || ifcIn.name) : null, f, `${g.name} meldet diesmal nichts: IOS sendet höchstens eine „Destination unreachable“ je 500 ms (deshalb oft „U.U.U“).`);
        return false;
      }
      z.unreachZuletzt = L.t;
    }
    const src = (ifcIn && ifcIn.ip) || (schnittstellen(L, g).find(i => i.ip && i.oben) || {}).ip;
    if (!src) return false;
    const l4 = f.tcp || f.udp;
    const orig = {src: f.ip.src, dst: f.ip.dst, proto: f.ip.proto, id: f.ip.id, icmpId: f.icmp ? f.icmp.id : null, seq: f.icmp ? f.icmp.seq : null,
                  sport: l4 ? l4.src : null, dport: l4 ? l4.dst : null};
    const p = Sim._frame({ip: {src, dst: f.ip.src, ttl: ttlStart(g), proto: "ICMP", id: Sim._neueIpId(L, g.id)},
                          icmp: {typ, code: code || null, seq: orig.seq, id: orig.icmpId, orig}});
    L.icmpGrund[p.ip.id] = grund || null; L.antwortIds.add(p.ip.id);
    const was = typ === "unreachable" ? `„${ICMPTEXT[typ]}“ (${{net: "Netz", host: "Host", port: "Port", admin: "administrativ verboten"}[code] || code})` : `„${ICMPTEXT[typ]}“`;
    Sim._log(L, "antworten", g.id, ifcIn ? (ifcIn.port || ifcIn.name) : null, p, `${g.name} meldet ${f.ip.src} ${was} zurück.`);
    senden(L, g, p);
    return true;
  }
  function echoAntwort(L, g, ifc, f){
    const p = Sim._frame({ip: {src: f.ip.dst, dst: f.ip.src, ttl: ttlStart(g), proto: "ICMP", id: Sim._neueIpId(L, g.id)},
                          icmp: {typ: "echo-reply", code: null, seq: f.icmp.seq, id: f.icmp.id}});
    L.antwortIds.add(p.ip.id);
    Sim._log(L, "antworten", g.id, ifc.port || ifc.name, f, `${g.name} erhält den Echo Request von ${f.ip.src} und antwortet mit einem Echo Reply.`);
    senden(L, g, p);
  }

  /* ---- Routingtabelle (Router, Firewall, Internet) ---- */
  function routen(L, g){
    const c = (L.cache.rt ||= {});
    if (c[g.id]) return c[g.id];
    const ifs = schnittstellen(L, g).filter(i => i.oben && i.ip);
    const t = ifs.map(i => ({netz: IP.netz(i.ip, i.maske), maske: i.maske, praefix: IP.praefix(i.maske), nh: null, aus: i.name, ad: 0, typ: "C"}));
    const statisch = (g.running.routen || []).filter(r => IP.gueltig(r.netz) && IP.maskeGueltig(r.maske));
    const offen = [];
    for (const r of statisch) {
      const aus = r.aus ? Sim._ifKurz(r.aus) : null;
      if (aus && !ifs.some(i => i.name === aus)) continue;              /* Ausgangsschnittstelle down → Route nicht aktiv */
      if (!aus && !IP.gueltig(r.nh)) continue;
      offen.push({netz: IP.netz(r.netz, r.maske), maske: r.maske, praefix: IP.praefix(r.maske), nh: IP.gueltig(r.nh) ? r.nh : null, aus, ad: r.ad == null ? 1 : +r.ad, typ: "S"});
    }
    /* rekursive Next-Hops: nur aktiv, wenn der Next-Hop selbst erreichbar ist (zwei Durchgänge genügen hier) */
    for (let runde = 0; runde < 3; runde++) {
      for (const r of offen.slice()) {
        if (r.aus || t.some(x => x !== r && IP.imNetz(r.nh, x.netz, x.maske))) { t.push(r); offen.splice(offen.indexOf(r), 1); }
      }
    }
    return (c[g.id] = t);
  }
  function suche(L, g, dst, tiefe){
    tiefe = tiefe || 0;
    let best = null;
    for (const r of routen(L, g)) {
      if (!IP.imNetz(dst, r.netz, r.maske)) continue;
      if (!best || r.praefix > best.praefix || (r.praefix === best.praefix && r.ad < best.ad)) best = r;
    }
    if (!best) return null;
    if (best.aus) return {route: best, ifc: ifName(L, g, best.aus), nh: best.nh || dst};
    if (tiefe > 4) return null;
    const w = suche(L, g, best.nh, tiefe + 1);
    if (!w) return null;
    return {route: best, ifc: w.ifc, nh: w.route.typ === "C" ? best.nh : w.nh};
  }
  const routeText = r => r.typ === "C" ? `direkt verbunden an ${r.aus}` : (r.praefix === 0 ? "Default-Route" : "statische Route") + (r.nh ? ` über ${r.nh}` : ` an ${r.aus}`);

  /* ---- Broadcast-Domäne (aus der Konfiguration, für Diagnosen): alle L3-Schnittstellen, die ein
          ungetaggter Frame von gid:port aus erreichen würde ---- */
  function domaene(L, gid, port){
    const key = gid + "|" + port, c = (L.cache.dom ||= {});
    if (c[key]) return c[key];
    const erg = [], gesehen = new Set(), swv = new Set(), adj = Sim._adj(L);
    const start = (adj[gid] || []).find(x => x.port === port);
    const stapel = start ? [{geraet: start.gegen.geraet, port: start.gegen.port, tag: null}] : [];
    while (stapel.length) {
      const x = stapel.pop(), k = x.geraet + "|" + x.port + "|" + x.tag;
      if (gesehen.has(k)) continue; gesehen.add(k);
      const g = L.netz.geraete[x.geraet]; if (!g) continue;
      if (g.typ !== "switch") { const i = ifFuerPort(L, g, x.port, x.tag); if (i && i.ip) erg.push({geraet: g.id, ifc: i}); continue; }
      const pc = g.running.ports[x.port]; if (!pc) continue;
      let v;
      if (pc.modus === "trunk") v = x.tag == null ? (+pc.nativeVlan || 1) : +x.tag;
      else { if (x.tag != null) continue; v = +pc.accessVlan || 1; }
      if (swv.has(g.id + "#" + v)) continue; swv.add(g.id + "#" + v);
      const svi = schnittstellen(L, g).find(i => i.svi === v && i.ip); if (svi) erg.push({geraet: g.id, ifc: svi});
      for (const y of adj[g.id] || []) {
        if (y.port === x.port) continue;
        const pc2 = g.running.ports[y.port]; if (!pc2) continue;
        if (pc2.modus === "trunk") { if (Sim.switch.erlaubt(pc2, v)) stapel.push({geraet: y.gegen.geraet, port: y.gegen.port, tag: v === (+pc2.nativeVlan || 1) ? null : v}); }
        else if ((+pc2.accessVlan || 1) === v) stapel.push({geraet: y.gegen.geraet, port: y.gegen.port, tag: null});
      }
    }
    return (c[key] = erg);
  }
  /* Welche Maske benutzt „das Netz“ um diese Adresse herum? Zuerst der Router/die Firewall im Segment, sonst die Mehrheit. */
  function segmentMaske(L, g, ifc){
    if (!ifc.port) return null;
    const nachbarn = domaene(L, g.id, ifc.port).filter(x => x.geraet !== g.id);
    const gw = nachbarn.find(x => x.ifc.ip === ifc.gw) || nachbarn.find(x => {
      const t = L.netz.geraete[x.geraet].typ; return (t === "router" || t === "firewall") && IP.gleichesNetz(x.ifc.ip, ifc.ip, x.ifc.maske);
    });
    if (gw) return gw.ifc.maske;
    const zaehl = {};
    for (const x of nachbarn) if (IP.gleichesNetz(x.ifc.ip, ifc.ip, x.ifc.maske)) zaehl[x.ifc.maske] = (zaehl[x.ifc.maske] || 0) + 1;
    const best = Object.entries(zaehl).sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : null;
  }

  /* DHCP-Anbieter (für die Diagnose „wer hätte den Discover beantworten sollen“) */
  function dhcpAnbieter(L){
    const r = [];
    for (const g of Object.values(L.netz.geraete)) {
      const k = g.running;
      if (Sim._istHost(g) && k.dienste && k.dienste.dhcp && k.dienste.dhcp.an) r.push(g.id);
      if (g.typ === "router" && ((k.dhcp && (k.dhcp.pools || []).length) || Object.values(k.if || {}).some(i => (i.helper || []).length))) r.push(g.id);
    }
    return r;
  }

  /* Paket aus einem Gerät heraus senden (Host, SVI, Router, Firewall, Internet) */
  function senden(L, g, f, opt){
    if (Sim._istHost(g)) return Sim.host.ipSenden(L, g, f, opt);
    if (g.typ === "switch") return Sim.switch.ipSenden(L, g, f, opt);
    return Sim.router.ipSenden(L, g, f, opt);
  }

  return {ttlStart, sviMac, schnittstellen, ifName, ifFuerPort, eigeneIfc, sviOben,
          arpTab, arpGet, arpSet, arpVerwirft, raus, anfragen, aufloesen, aufgeloest, arpEmpfangen,
          socket, zustellen, lokalerFehler, icmpFehler, echoAntwort,
          routen, suche, routeText, domaene, segmentMaske, dhcpAnbieter, senden};
})();
Sim._letzterGrund = function(L){ for (let i = L.ev.length - 1; i >= 0; i--) if (L.ev[i].grund) return L.ev[i].grund; return null; };
