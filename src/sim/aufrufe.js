"use strict";
/* ---------- Simulation: öffentliche Aufrufe (Architektur § 5.1) ----------
   Sim.ping, Sim.traceroute, Sim.tcp, Sim.http, Sim.dns, Sim.dhcp, Sim.adresse, Sim.pruefeZiel, Sim.erklaere
   plus Anzeigehilfen für die Konsole (Sim.routingTabelle, Sim.arpTabelle, Sim.macTabelle, Sim.natTabelle,
   Sim.leases, Sim.schnittstellen) und Sim.vergehen (virtuelle Uhr vorstellen).
   Jeder Aufruf ist ein Lauf mit eigener Trace. ping/tcp/… verändern netz.zustand absichtlich (ARP-Caches,
   MAC-Tabellen, Leases bleiben wie im echten Netz); pruefeZiel arbeitet auf einer Kopie. */
(() => {
  const L3 = () => Sim.l3;
  const istWin = g => Sim._istHost(g);

  /* ---------- Bausteine ---------- */
  /* Ein Paket senden und auf die passende Antwort warten (Warteschlange leerlaufen lassen) */
  function anfrage(L, g, f, o){
    const s = L3().socket(L, {geraet: g.id, passt: o.passt,
      bei(fr){ if (!s.antwort) { s.antwort = fr; s.tAnt = L.t; } },
      fehler(e){ if (!s.fehlerInfo) s.fehlerInfo = e; }});
    s.ids.add(f.ip.id);
    const t0 = L.t, idx = L.ev.length;
    const r = L3().senden(L, g, f, o.sendOpt);
    if (r && r.ok === false) { s.zu = true; return {sofort: true, grund: r.grund, text: r.text, idx, t0}; }
    Sim._ablauf(L);
    s.zu = true;
    const zuSpaet = s.antwort && s.tAnt - t0 > o.timeout;
    if ((!s.antwort || zuSpaet) && !L.abbruch && L.t < t0 + o.timeout) L.t = t0 + o.timeout;
    return {antwort: zuSpaet ? null : s.antwort || null, tAnt: s.tAnt, fehler: s.fehlerInfo || null, idx, t0};
  }
  /* entscheidende Stelle im Fenster ab idx: erstes Ereignis mit diesem Grund, sonst erstes mit irgendeinem */
  function stelle(L, idx, grund){
    let erstes = null;
    for (let i = idx; i < L.ev.length; i++) {
      const e = L.ev[i]; if (!e.grund) continue;
      if (e.grund === grund) return e;
      if (!erstes) erstes = e;
    }
    return erstes;
  }
  function stelleSetzen(L, e){ if (e) L.stelle = e.n; }
  function timeoutGrund(L, idx){ const e = Sim._erster(L, idx); return e ? e.grund : "TIMEOUT"; }
  /* lokaler Fehler (z. B. ARP ohne Antwort): eine frühere, genauere Stelle im selben Fenster hat Vorrang */
  function genauer(L, idx, grund){ const e = Sim._erster(L, idx); return e ? e.grund : grund; }

  function start(netz, art, vonId){
    const L = Sim._lauf(netz, {art, von: vonId});
    const g = netz.geraete[vonId] || null;
    return {L, g};
  }
  function ohneGeraet(L, vonId, extra){
    Sim._log(L, "info", null, null, null, `Gerät „${vonId}“ gibt es in diesem Netz nicht.`);
    return Object.assign({ok: false, grund: null, trace: Sim._trace(L, false, `Gerät „${vonId}“ fehlt.`), text: `Gerät „${vonId}“ fehlt.`}, extra || {});
  }
  function ausgeschaltet(L, g, extra){
    const e = Sim._log(L, "verwerfen", g.id, null, null, `${g.name} ist ausgeschaltet.`, {grund: "DEVICE_OFF"});
    stelleSetzen(L, e);
    return Object.assign({ok: false, grund: "DEVICE_OFF", trace: Sim._trace(L, false, `${g.name} ist ausgeschaltet.`), text: `${g.name} ist ausgeschaltet.`}, extra || {});
  }

  /* ---------- DHCP-Client ---------- */
  function apipaAdresse(mac){ const h = Sim._hash(mac); return `169.254.${1 + (h % 254)}.${(h >>> 8) % 256}`; }
  function dhcpHolen(L, g, port){
    const c = g.running.if && g.running.if[port];
    if (!c) return {ok: false, grund: null, text: `${g.name} hat keinen Anschluss ${port}.`};
    if (!c.dhcp) return {ok: false, grund: null, text: `An ${g.name} ${port} ist DHCP aus (feste Adresse).`};
    const z = Sim._z(L, g.id); z.dhcp ||= {}; delete z.dhcp[port]; Sim._cacheNeu(L);
    const ifc = L3().schnittstellen(L, g).find(i => i.port === port);
    const idx0 = L.ev.length;
    if (!ifc.oben) {
      const lg = c.an === false ? {grund: "PORT_SHUTDOWN", text: `Die Netzwerkkarte ${port} von ${g.name} ist deaktiviert.`} : (Sim._linkGrund(L, g.id, port) || {grund: "LINK_DOWN", text: "Kein Link."});
      const e = Sim._log(L, "verwerfen", g.id, port, null, `${lg.text} Ohne Link kann ${g.name} keinen DHCP-Server fragen.`, {grund: lg.grund, proto: "DHCP"});
      return {ok: false, grund: lg.grund, lease: null, text: lg.text, stelle: e};
    }
    const xid = Sim._hash(`${g.id}|${port}|${L.t}|${L.ev.length}`) % 1000000;
    const dhcpFrame = (felder, info) => Sim._frame({ip: {src: "0.0.0.0", dst: "255.255.255.255", ttl: 128, proto: "UDP", id: Sim._neueIpId(L, g.id)},
      udp: {src: 68, dst: 67}, app: {proto: "DHCP", info, felder: Object.assign({xid, clientMac: ifc.mac, clientIp: "0.0.0.0", angeboten: "0.0.0.0", relay: "0.0.0.0", server: null}, felder)}});
    const passt = typen => fr => !!(fr.app && fr.app.proto === "DHCP" && fr.app.felder && fr.app.felder.xid === xid && typen.includes(fr.app.felder.typ));
    let angebot = null;
    for (let v = 0; v < 3 && !angebot && !L.abbruch; v++) {
      const f = dhcpFrame({typ: "discover"}, "DHCP Discover");
      const r = anfrage(L, g, f, {passt: passt(["offer"]), timeout: Sim.T.DHCP_TIMEOUT * (v + 1), sendOpt: {ifc,
        text: v ? `${g.name} bekommt kein Angebot und wiederholt den DHCP Discover (Versuch ${v + 1}).` : `${g.name} hat noch keine Adresse und ruft per Broadcast nach einem DHCP-Server (DHCP Discover).`}});
      if (r.antwort) angebot = r.antwort.app.felder;
    }
    let ack = null;
    if (angebot) {
      for (let v = 0; v < 2 && !ack && !L.abbruch; v++) {
        const f = dhcpFrame({typ: "request", gewuenscht: angebot.angeboten, server: angebot.server}, `DHCP Request ${angebot.angeboten}`);
        const r = anfrage(L, g, f, {passt: passt(["ack", "nak"]), timeout: Sim.T.DHCP_TIMEOUT, sendOpt: {ifc,
          text: `${g.name} nimmt das Angebot an und bittet per Broadcast um ${angebot.angeboten} (DHCP Request).`}});
        if (r.antwort) ack = r.antwort.app.felder;
      }
    }
    if (ack && ack.typ === "ack") {
      const lease = {ip: ack.angeboten, maske: ack.maske, gw: ack.gateway || "", dns: ack.dns || "", server: ack.server, bis: L.t + (ack.leaseS || 86400) * 1000};
      z.dhcp[port] = lease; Sim._cacheNeu(L);
      Sim._log(L, "lernen", g.id, port, null, `${g.name} übernimmt ${lease.ip}/${IP.praefix(lease.maske)}${lease.gw ? `, Gateway ${lease.gw}` : ", kein Gateway"}${lease.dns ? `, DNS ${lease.dns}` : ""} vom DHCP-Server ${lease.server}.`, {proto: "DHCP"});
      return {ok: true, grund: null, lease: tief(lease), text: `${g.name} hat per DHCP ${lease.ip} bekommen.`};
    }
    if (L.abbruch) return {ok: false, grund: "STORM", lease: null, text: "Broadcast-Sturm"};
    const ip = apipaAdresse(ifc.mac);
    z.dhcp[port] = {ip, maske: "255.255.0.0", gw: "", dns: "", apipa: true, server: null, bis: L.t + 300000}; Sim._cacheNeu(L);
    const vorher = Sim._erster(L, idx0);
    const grund = vorher && vorher.grund === "DHCP_POOL_EMPTY" ? "DHCP_POOL_EMPTY" : "DHCP_NO_OFFER";
    const text = grund === "DHCP_POOL_EMPTY" ? `Der DHCP-Pool ist erschöpft. ${g.name} gibt sich selbst die APIPA-Adresse ${ip}/16.`
                                             : `${g.name} bekommt kein DHCP-Angebot und gibt sich selbst die APIPA-Adresse ${ip}/16 (169.254.x.x). Damit erreicht es nur andere APIPA-Geräte.`;
    const e = Sim._log(L, "info", g.id, port, null, text, {grund, proto: "DHCP"});
    return {ok: false, grund, ursache: vorher ? vorher.grund : null, lease: null, apipa: ip, text, stelle: vorher || e};
  }
  function brauchtDhcp(L, g, port){
    const c = g.running.if[port]; if (!c || !c.dhcp) return false;
    const l = (L.netz.zustand[g.id] || {}).dhcp?.[port];
    return !l || l.apipa || l.bis <= L.t;
  }
  /* Hosts mit dhcp:true ohne gültige Lease holen sich zuerst eine Adresse (sichtbar in derselben Trace) */
  function vorbereiten(L, g){
    if (!Sim._istHost(g) || !g.an) return;
    for (const port of Modell.PORTS[g.typ]) {
      if (!brauchtDhcp(L, g, port)) continue;
      if (!Modell.kabelAn(L.netz, g.id, port) && port !== "eth0") continue;
      const r = dhcpHolen(L, g, port);
      if (!r.ok && !L.dhcpFehler) L.dhcpFehler = {grund: r.grund, stelle: r.stelle || null, text: r.text};
    }
  }

  /* ---------- Ziel auflösen: Geräte-ID → erste nutzbare Adresse, IP direkt, sonst DNS ---------- */
  function ersteAdresse(L, g){
    const ifs = L3().schnittstellen(L, g).filter(i => i.ip);
    const i = ifs.find(x => x.oben && x.quelle !== "apipa") || ifs.find(x => x.oben) || ifs[0];
    if (i) return i.ip;
    if (g.typ === "internet") { const s = Sim.internet.server(g)[0]; return s ? s.ip : null; }
    return null;
  }
  function zielAufloesen(L, g, ziel){
    const s = String(ziel == null ? "" : ziel).trim();
    if (IP.gueltig(s)) return {ok: true, ip: s, geraet: null};
    const zg = L.netz.geraete[s];
    if (zg) {
      if (Sim._istHost(zg) && zg.an) for (const port of Modell.PORTS[zg.typ]) if (brauchtDhcp(L, zg, port) && Modell.kabelAn(L.netz, zg.id, port)) dhcpHolen(L, zg, port);
      const ip = ersteAdresse(L, zg);
      if (!ip) {
        const e = Sim._log(L, "info", zg.id, null, null, `${zg.name} hat keine IP-Adresse – es gibt kein Ziel, an das man senden könnte.`, {grund: "NO_IP"});
        return {ok: false, grund: "NO_IP", text: `${zg.name} hat keine IP-Adresse.`, stelle: e};
      }
      return {ok: true, ip, geraet: zg.id, name: zg.name};
    }
    const d = dnsAufloesen(L, g, s);
    if (!d.ok) return Object.assign({ok: false}, d);
    return {ok: true, ip: d.ip, geraet: null, name: s};
  }

  /* ---------- DNS-Client ---------- */
  /* Ist der DNS-Server aus einem tieferen Grund unerreichbar (kein Gateway, NAT fehlt, Link unten …), zählt dieser Grund:
     Er ist die eigentliche Ursache und der nächste Prüfschritt. Ist der Weg frei und nur der DNS-Dienst stumm, bleibt es DNS_NO_SERVER. */
  const tiefer = u => u && !["TIMEOUT", "SERVICE_OFF", "PORT_CLOSED"].includes(u) ? u : "DNS_NO_SERVER";
  function dnsAufloesen(L, g, name){
    const idx0 = L.ev.length;
    if (IP.gueltig(name)) return {ok: true, ip: name};
    const ifc = Sim._istHost(g) ? L3().schnittstellen(L, g).find(i => i.ip && i.dns) : null;
    if (!ifc) {
      const e = Sim._log(L, "verwerfen", g.id, null, null, `${g.name} hat keinen DNS-Server eingetragen und kann „${name}“ nicht auflösen.`, {grund: "DNS_NO_SERVER", proto: "DNS"});
      return {ok: false, grund: "DNS_NO_SERVER", ip: null, text: `Kein DNS-Server eingetragen.`, stelle: e};
    }
    const server = ifc.dns;
    /* Loopback: Der eingetragene DNS-Server ist das Gerät selbst (typisch für den DNS-Server im eigenen Netz) – die Frage
       geht nicht über das Kabel, der eigene Dienst antwortet (wie über 127.0.0.1). Ohne laufenden Dienst: Port zu. */
    if (L3().schnittstellen(L, g).some(i => i.ip === server)) {
      const d = (g.running.dienste || {}).dns;
      if (!d || !d.an) {
        const e = Sim._log(L, "verwerfen", g.id, null, null, `${g.name} fragt sich selbst (${server}), aber der eigene DNS-Dienst läuft nicht.`, {grund: "SERVICE_OFF", proto: "DNS"});
        return {ok: false, grund: tiefer("SERVICE_OFF"), ursache: "SERVICE_OFF", ip: null, text: `Der eigene DNS-Dienst (${server}) läuft nicht.`, stelle: e};
      }
      const n = name.toLowerCase().replace(/\.$/, ""), treffer = (d.eintraege || []).find(x => String(x.name).toLowerCase().replace(/\.$/, "") === n);
      if (treffer) { Sim._log(L, "info", g.id, null, null, `${g.name} ist selbst DNS-Server und kennt ${n}: ${treffer.ip} (lokal, ohne Netz).`, {proto: "DNS"}); return {ok: true, ip: treffer.ip, grund: null}; }
      const e = Sim._log(L, "info", g.id, null, null, `${g.name} ist selbst DNS-Server, hat aber keinen Eintrag für „${n}“ (NXDOMAIN).`, {grund: "DNS_FAIL", proto: "DNS"});
      return {ok: false, grund: "DNS_FAIL", ip: null, text: `„${name}“ ist unbekannt (NXDOMAIN).`, stelle: e};
    }
    for (let v = 0; v < 2 && !L.abbruch; v++) {
      const sport = Sim._ephemeral(L, g.id);
      const f = Sim._frame({ip: {src: null, dst: server, ttl: L3().ttlStart(g), proto: "UDP", id: Sim._neueIpId(L, g.id)}, udp: {src: sport, dst: 53},
                            app: {proto: "DNS", info: `DNS-Anfrage: Wer ist ${name}?`, felder: {name, typ: "A"}}});
      const r = anfrage(L, g, f, {timeout: Sim.T.DNS_TIMEOUT, passt: fr => !!((fr.udp && fr.udp.dst === sport && fr.app && fr.app.proto === "DNS") || (fr.icmp && fr.icmp.orig && fr.icmp.orig.id === f.ip.id)),
                                  sendOpt: {text: `${g.name} fragt den DNS-Server ${server}: „Wer ist ${name}?“`}});
      if (r.sofort) return {ok: false, grund: tiefer(r.grund), ursache: r.grund, ip: null, text: `DNS-Server ${server} nicht erreichbar: ${r.text}`, stelle: stelle(L, idx0, r.grund)};
      if (r.antwort && r.antwort.app && r.antwort.app.proto === "DNS") {
        const a = r.antwort.app.felder;
        if (a.ip) { Sim._log(L, "empfangen", g.id, null, r.antwort, `${g.name} hat die Antwort: ${name} ist ${a.ip}.`); return {ok: true, ip: a.ip, grund: null}; }
        const e = Sim._log(L, "info", g.id, null, r.antwort, `Der DNS-Server kennt „${name}“ nicht (NXDOMAIN). Tippfehler im Namen oder Eintrag fehlt?`, {grund: "DNS_FAIL"});
        return {ok: false, grund: "DNS_FAIL", ip: null, text: `„${name}“ ist unbekannt (NXDOMAIN).`, stelle: e};
      }
      if (r.antwort && r.antwort.icmp) {
        const u = L.icmpGrund[r.antwort.ip.id] || null;
        return {ok: false, grund: tiefer(u), ursache: u, ip: null, text: `Der DNS-Server ${server} antwortet nicht auf Port 53.`, stelle: stelle(L, idx0, u)};
      }
      if (r.fehler) { const u = genauer(L, r.idx, r.fehler.grund); return {ok: false, grund: tiefer(u), ursache: u, ip: null, text: `DNS-Server ${server} nicht erreichbar: ${r.fehler.text}`, stelle: stelle(L, idx0, u)}; }
    }
    const u = timeoutGrund(L, idx0);
    const e = stelle(L, idx0, u) || Sim._log(L, "info", g.id, null, null, `Der DNS-Server ${server} antwortet nicht.`, {grund: "DNS_NO_SERVER", proto: "DNS"});
    return {ok: false, grund: tiefer(u === "TIMEOUT" ? null : u), ursache: u === "TIMEOUT" ? null : u, ip: null, text: `Der DNS-Server ${server} antwortet nicht.`, stelle: e};
  }

  /* ---------- Ping ---------- */
  function quelleAdresse(L, g, q){
    if (!q) return null;
    if (IP.gueltig(q)) return q;
    const i = L3().ifName(L, g, Sim._ifKurz(q)); return i && i.ip ? i.ip : null;
  }
  function echo(L, g, dst, o){
    const f = Sim._frame({ip: {src: o.quelle || null, dst, ttl: o.ttl, proto: "ICMP", id: Sim._neueIpId(L, g.id)}, icmp: {typ: "echo-request", code: null, seq: o.seq, id: o.ident}});
    const r = anfrage(L, g, f, {timeout: o.timeout, passt: fr => !!(fr.icmp && ((fr.icmp.typ === "echo-reply" && fr.icmp.id === o.ident && fr.icmp.seq === o.seq) || (fr.icmp.orig && fr.icmp.orig.id === f.ip.id))),
                                sendOpt: {text: `${g.name} schickt einen Echo Request (Ping ${o.seq}) an ${dst}.`}});
    if (r.sofort) { const e = stelle(L, r.idx, r.grund); return {ok: false, art: "fehler", grund: r.grund, rtt: null, ttl: null, von: null, text: r.text, e}; }
    if (r.antwort) {
      const fr = r.antwort, rtt = Math.max(0, r.tAnt - r.t0);
      if (fr.icmp.typ === "echo-reply") {
        const her = L.herkunft[fr.ip.id];
        if (o.zielGeraet && her && her !== o.zielGeraet) {
          const e = Sim._log(L, "info", g.id, null, fr, `Die Antwort kam von ${Sim._name(L, her)}, nicht von ${Sim._name(L, o.zielGeraet)}: Beide benutzen ${dst}. Adresskonflikt!`, {grund: "DUP_IP"});
          return {ok: false, art: "echo", grund: "DUP_IP", rtt, ttl: fr.ip.ttl, von: fr.ip.src, e};
        }
        return {ok: true, art: "echo", grund: null, rtt, ttl: fr.ip.ttl, von: fr.ip.src};
      }
      const grund = L.icmpGrund[fr.ip.id] || (fr.icmp.typ === "time-exceeded" ? "TTL_EXPIRED" : "HOST_UNREACHABLE");
      return {ok: false, art: fr.icmp.typ, code: fr.icmp.code || null, grund, rtt, ttl: fr.ip.ttl, von: fr.ip.src, e: stelle(L, r.idx, grund)};
    }
    if (r.fehler) {
      const eigen = (L3().schnittstellen(L, g).find(i => i.ip) || {}).ip || null;
      const grund = genauer(L, r.idx, r.fehler.grund);
      return {ok: false, art: "unreachable", code: "host", lokal: true, grund, rtt: null, ttl: null, von: eigen, text: r.fehler.text, e: stelle(L, r.idx, grund)};
    }
    const grund = timeoutGrund(L, r.idx);
    return {ok: false, art: "timeout", grund, rtt: null, ttl: null, von: null, e: stelle(L, r.idx, grund)};
  }
  function eigeneAdresse(L, g, ip){ return ip === "127.0.0.1" || L3().schnittstellen(L, g).some(i => i.ip === ip); }
  function gesamtGrund(antworten){
    const f = antworten.filter(a => !a.ok && a.grund);
    const x = f.find(a => a.grund !== "TIMEOUT") || f[0];
    return x || null;
  }

  Sim.ping = function(netz, vonId, ziel, opt){
    opt = opt || {};
    const {L, g} = start(netz, "ping", vonId);
    if (!g) return ohneGeraet(L, vonId, {antworten: []});
    if (!g.an) return ausgeschaltet(L, g, {antworten: []});
    vorbereiten(L, g);
    const z = zielAufloesen(L, g, ziel);
    if (!z.ok) {
      stelleSetzen(L, z.stelle);
      const text = `„${ziel}“ lässt sich nicht auflösen: ${z.text || ""}`.trim();
      return {ok: false, grund: z.grund, antworten: [], ziel: null, trace: Sim._trace(L, false, text), text};
    }
    const win = istWin(g), anzahl = opt.anzahl == null ? 4 : Math.max(1, +opt.anzahl);
    const timeout = win ? Sim.T.PING_WIN : Sim.T.PING_IOS;
    const zst = Sim._z(L, g.id); zst.pingId = ((zst.pingId || 0) % 65000) + 1;
    const ident = zst.pingId, ttl = opt.ttl != null ? +opt.ttl : L3().ttlStart(g);
    const quelle = quelleAdresse(L, g, opt.quelle);
    const antworten = [];
    if (eigeneAdresse(L, g, z.ip)) {
      Sim._log(L, "info", g.id, null, null, `${g.name} pingt seine eigene Adresse ${z.ip}: Die Antwort kommt direkt vom eigenen Netzwerkstapel, kein Paket verlässt das Gerät.`, {proto: "ICMP"});
      for (let i = 0; i < anzahl; i++) antworten.push({ok: true, art: "echo", grund: null, rtt: 0, ttl, von: z.ip});
    } else {
      for (let seq = 1; seq <= anzahl && !L.abbruch; seq++) {
        const t0 = L.t;
        const a = echo(L, g, z.ip, {ident, seq, ttl, timeout, quelle, zielGeraet: z.geraet});
        antworten.push(a);
        if (win && seq < anzahl && L.t < t0 + Sim.T.PING_ABSTAND_WIN) L.t = t0 + Sim.T.PING_ABSTAND_WIN;
      }
    }
    if (L.abbruch) for (const a of antworten) if (!a.ok && !a.grund) a.grund = "STORM";
    const n = antworten.filter(a => a.ok).length, dup = antworten.find(a => a.grund === "DUP_IP");
    const ok = n > 0 && !L.abbruch && !dup;
    let grund = null, text;
    const zielText = z.name && z.name !== z.ip ? `${z.name} [${z.ip}]` : z.ip;
    if (ok) {
      text = `${g.name} erreicht ${zielText}: ${n} von ${antworten.length} Antworten.`;
      if (!antworten[0].ok && antworten[0].art === "timeout") text += " Das erste Paket ging verloren, während ARP lief.";
    } else if (L.abbruch) { grund = "STORM"; text = `Abbruch: Broadcast-Sturm (Layer-2-Schleife).`; }
    else if (dup) { grund = "DUP_IP"; stelleSetzen(L, dup.e); text = `${g.name} bekommt Antworten von zwei verschiedenen Geräten mit der Adresse ${z.ip} – Adresskonflikt. ${n} von ${antworten.length} Antworten kamen vom richtigen Gerät.`; }
    else {
      const x = gesamtGrund(antworten);
      grund = (L.dhcpFehler && L.dhcpFehler.grund) || (x ? x.grund : "TIMEOUT");
      const e = (L.dhcpFehler && L.dhcpFehler.stelle) || (x && x.e) || null;
      stelleSetzen(L, e);
      text = `${g.name} erreicht ${zielText} nicht. ${e ? e.text : (Sim.GRUENDE[grund] || {}).titel || ""}`.trim();
    }
    const ant = antworten.map(a => { const r = Object.assign({}, a); delete r.e; return r; });
    return {ok, grund, antworten: ant, ziel: z.ip, trace: Sim._trace(L, ok, text), text};
  };

  /* ---------- Traceroute ---------- */
  Sim.traceroute = function(netz, vonId, zielIp, opt){
    opt = opt || {};
    const {L, g} = start(netz, "traceroute", vonId);
    if (!g) return ohneGeraet(L, vonId, {hops: []});
    if (!g.an) return ausgeschaltet(L, g, {hops: []});
    vorbereiten(L, g);
    const z = zielAufloesen(L, g, zielIp);
    if (!z.ok) { stelleSetzen(L, z.stelle); return {ok: false, grund: z.grund, hops: [], trace: Sim._trace(L, false, z.text || "Ziel unbekannt"), text: z.text}; }
    const win = istWin(g), max = opt.maxHops || 30, timeout = win ? Sim.T.PING_WIN : Sim.T.PING_IOS;
    const zst = Sim._z(L, g.id); zst.pingId = ((zst.pingId || 0) % 65000) + 1;
    const ident = zst.pingId, hops = [];
    let fertig = false, ok = false, grund = null, seq = 0, udpPort = 33434;
    for (let ttl = 1; ttl <= max && !fertig && !L.abbruch; ttl++) {
      const hop = {nr: ttl, ip: null, grund: null, rtts: []};
      const idx = L.ev.length;
      for (let p = 0; p < 3 && !L.abbruch; p++) {
        seq++;
        const f = win
          ? Sim._frame({ip: {src: null, dst: z.ip, ttl, proto: "ICMP", id: Sim._neueIpId(L, g.id)}, icmp: {typ: "echo-request", code: null, seq, id: ident}})
          : Sim._frame({ip: {src: null, dst: z.ip, ttl, proto: "UDP", id: Sim._neueIpId(L, g.id)}, udp: {src: Sim._ephemeral(L, g.id), dst: udpPort++}});
        const r = anfrage(L, g, f, {timeout, passt: fr => !!(fr.icmp && ((win && fr.icmp.typ === "echo-reply" && fr.icmp.id === ident && fr.icmp.seq === seq) || (fr.icmp.orig && fr.icmp.orig.id === f.ip.id))),
                                    sendOpt: {text: `${g.name} schickt eine Traceroute-Probe mit TTL ${ttl} an ${z.ip}.`}});
        if (r.sofort) { hop.grund = r.grund; fertig = true; grund = r.grund; stelleSetzen(L, stelle(L, r.idx, r.grund)); break; }
        if (!r.antwort) { hop.rtts.push(null); if (r.fehler) { hop.grund = genauer(L, r.idx, r.fehler.grund); grund = hop.grund; fertig = true; stelleSetzen(L, stelle(L, r.idx, grund)); break; } continue; }
        const fr = r.antwort;
        hop.rtts.push(Math.max(0, r.tAnt - r.t0));
        if (!hop.ip) hop.ip = fr.ip.src;
        if (fr.icmp.typ === "echo-reply" || (fr.icmp.typ === "unreachable" && fr.icmp.code === "port" && fr.ip.src === z.ip)) { fertig = true; ok = true; }
        else if (fr.icmp.typ === "unreachable") {
          const u = L.icmpGrund[fr.ip.id] || "HOST_UNREACHABLE";
          hop.grund = u; hop.code = fr.icmp.code; grund = u; fertig = true; stelleSetzen(L, stelle(L, r.idx, u));
        }
      }
      if (!hop.ip && !hop.grund) { hop.grund = timeoutGrund(L, idx); }
      hops.push(hop);
    }
    if (L.abbruch) grund = "STORM";
    if (!ok && !grund) {
      const letzte = hops.filter(h => h.grund && h.grund !== "TIMEOUT");
      grund = letzte.length ? letzte[0].grund : "TIMEOUT";
      const e = letzte.length ? Sim._erster(L, 0) : null; stelleSetzen(L, e);
    }
    const text = ok ? `Ziel ${z.ip} nach ${hops.length} Station${hops.length === 1 ? "" : "en"} erreicht.` : `Ziel ${z.ip} nicht erreicht (${(Sim.GRUENDE[grund] || {}).titel || grund}).`;
    return {ok, grund: ok ? null : grund, hops, ziel: z.ip, trace: Sim._trace(L, ok, text), text};
  };

  /* ---------- TCP ---------- */
  function tcpVerbinden(L, g, dst, port){
    const sport = Sim._ephemeral(L, g.id), idx0 = L.ev.length, seq = 1000 + (Sim._hash(g.id + sport) % 9000);
    for (let v = 0; v < 3 && !L.abbruch; v++) {
      const f = Sim._frame({ip: {src: null, dst, ttl: L3().ttlStart(g), proto: "TCP", id: Sim._neueIpId(L, g.id)}, tcp: {src: sport, dst: port, flags: ["SYN"], seq, ack: 0}});
      const r = anfrage(L, g, f, {timeout: Sim.T.TCP_RTO * Math.pow(2, v),
        passt: fr => !!((fr.tcp && fr.tcp.dst === sport && fr.tcp.src === port) || (fr.icmp && fr.icmp.orig && fr.icmp.orig.id === f.ip.id)),
        sendOpt: {text: v ? `${g.name} bekommt keine Antwort und wiederholt das SYN an ${dst}:${port} (Versuch ${v + 1}).` : `${g.name} möchte eine TCP-Verbindung zu ${dst}:${port} und schickt SYN (Schritt 1 von 3).`}});
      if (r.sofort) return {ok: false, grund: r.grund, text: r.text, stelle: stelle(L, r.idx, r.grund)};
      if (r.antwort) {
        const fr = r.antwort;
        if (fr.tcp && fr.tcp.flags.includes("SYN") && fr.tcp.flags.includes("ACK")) {
          const ack = Sim._frame({ip: {src: fr.ip.dst, dst, ttl: L3().ttlStart(g), proto: "TCP", id: Sim._neueIpId(L, g.id)}, tcp: {src: sport, dst: port, flags: ["ACK"], seq: seq + 1, ack: fr.tcp.seq + 1}});
          L3().senden(L, g, ack, {text: `${g.name} bestätigt mit ACK (Schritt 3 von 3) – die Verbindung steht.`});
          Sim._ablauf(L);
          return {ok: true, sport, seq: seq + 1, ack: fr.tcp.seq + 1, src: fr.ip.dst};
        }
        if (fr.tcp && fr.tcp.flags.includes("RST")) {
          const grund = L.icmpGrund[fr.ip.id] || "PORT_CLOSED";
          Sim._log(L, "empfangen", g.id, null, fr, `${g.name} erhält RST: Auf ${dst}:${port} nimmt niemand die Verbindung an.`);
          return {ok: false, grund, text: `Verbindung abgewiesen (RST).`, stelle: stelle(L, idx0, grund)};
        }
        if (fr.icmp) {
          const grund = L.icmpGrund[fr.ip.id] || "HOST_UNREACHABLE";
          return {ok: false, grund, text: `ICMP „${fr.icmp.typ}“ von ${fr.ip.src}.`, stelle: stelle(L, idx0, grund)};
        }
      }
      if (r.fehler) { const grund = genauer(L, r.idx, r.fehler.grund); return {ok: false, grund, text: r.fehler.text, stelle: stelle(L, r.idx, grund)}; }
    }
    const grund = L.abbruch ? "STORM" : timeoutGrund(L, idx0);
    return {ok: false, grund, text: "Keine Antwort auf SYN.", stelle: stelle(L, idx0, grund)};
  }
  function tcpSchliessen(L, g, dst, port, c){
    const f = Sim._frame({ip: {src: c.src, dst, ttl: L3().ttlStart(g), proto: "TCP", id: Sim._neueIpId(L, g.id)}, tcp: {src: c.sport, dst: port, flags: ["FIN", "ACK"], seq: c.seq, ack: c.ack}});
    const r = anfrage(L, g, f, {timeout: Sim.T.TCP_RTO, passt: fr => !!(fr.tcp && fr.tcp.dst === c.sport && fr.tcp.flags.includes("FIN")), sendOpt: {text: `${g.name} baut die Verbindung ab (FIN).`}});
    if (r.antwort) {
      const a = Sim._frame({ip: {src: c.src, dst, ttl: L3().ttlStart(g), proto: "TCP", id: Sim._neueIpId(L, g.id)}, tcp: {src: c.sport, dst: port, flags: ["ACK"], seq: c.seq + 1, ack: r.antwort.tcp.seq + 1}});
      L3().senden(L, g, a, {text: `${g.name} bestätigt den Abbau (ACK). Verbindung geschlossen.`});
      Sim._ablauf(L);
    }
  }
  function mitDhcpGrund(L, r){
    if (!r.ok && L.dhcpFehler && L.dhcpFehler.grund) { r.grund = L.dhcpFehler.grund; if (L.dhcpFehler.stelle) r.stelle = L.dhcpFehler.stelle; }
    return r;
  }

  Sim.tcp = function(netz, vonId, ziel, port){
    const {L, g} = start(netz, "tcp", vonId);
    if (!g) return ohneGeraet(L, vonId);
    if (!g.an) return ausgeschaltet(L, g);
    vorbereiten(L, g);
    port = +port;
    const z = zielAufloesen(L, g, ziel);
    if (!z.ok) { stelleSetzen(L, z.stelle); return {ok: false, grund: z.grund, trace: Sim._trace(L, false, z.text), text: z.text}; }
    const c = mitDhcpGrund(L, tcpVerbinden(L, g, z.ip, port));
    if (c.ok) tcpSchliessen(L, g, z.ip, port, c);
    else stelleSetzen(L, c.stelle);
    const text = c.ok ? `${g.name} → ${z.ip}:${port}: TCP-Verbindung hergestellt (SYN, SYN/ACK, ACK).` : `${g.name} → ${z.ip}:${port}: keine Verbindung. ${c.stelle ? c.stelle.text : c.text || ""}`.trim();
    return {ok: !!c.ok && !L.abbruch, grund: c.ok ? null : c.grund, ziel: z.ip, trace: Sim._trace(L, c.ok, text), text};
  };

  /* ---------- HTTP ---------- */
  function urlZerlegen(url){
    const s = String(url || "").trim();
    const m = /^(?:(https?):\/\/)?([^\/:\s]+)(?::(\d+))?(\/\S*)?$/i.exec(s);
    if (!m) return null;
    const schema = (m[1] || "http").toLowerCase();
    return {schema, host: m[2], port: m[3] ? +m[3] : (schema === "https" ? 443 : 80), pfad: m[4] || "/"};
  }
  Sim.http = function(netz, vonId, url){
    const {L, g} = start(netz, "http", vonId);
    if (!g) return ohneGeraet(L, vonId, {status: null});
    if (!g.an) return ausgeschaltet(L, g, {status: null});
    const u = urlZerlegen(url);
    if (!u) { const text = `„${url}“ ist keine gültige Adresse.`; return {ok: false, status: null, grund: null, trace: Sim._trace(L, false, text), text}; }
    vorbereiten(L, g);
    const z = zielAufloesen(L, g, u.host);
    if (!z.ok) { stelleSetzen(L, z.stelle); const text = `${u.host} lässt sich nicht auflösen: ${z.text || ""}`; return {ok: false, status: null, grund: z.grund, trace: Sim._trace(L, false, text), text}; }
    const c = mitDhcpGrund(L, tcpVerbinden(L, g, z.ip, u.port));
    if (!c.ok) {
      stelleSetzen(L, c.stelle);
      const text = `${u.schema}://${u.host}${u.port !== (u.schema === "https" ? 443 : 80) ? ":" + u.port : ""}: keine Verbindung. ${c.stelle ? c.stelle.text : c.text || ""}`.trim();
      return {ok: false, status: null, grund: c.grund, ziel: z.ip, trace: Sim._trace(L, false, text), text};
    }
    const https = u.schema === "https" || u.port === 443;
    const f = Sim._frame({ip: {src: c.src, dst: z.ip, ttl: L3().ttlStart(g), proto: "TCP", id: Sim._neueIpId(L, g.id)},
      tcp: {src: c.sport, dst: u.port, flags: ["PSH", "ACK"], seq: c.seq, ack: c.ack},
      app: {proto: "HTTP", info: https ? `HTTPS: GET ${u.pfad} (TLS vereinfacht)` : `GET ${u.pfad} HTTP/1.1`, felder: {host: u.host, pfad: u.pfad}}});
    const r = anfrage(L, g, f, {timeout: Sim.T.TCP_RTO * 4, passt: fr => !!(fr.tcp && fr.tcp.dst === c.sport && fr.app && fr.app.proto === "HTTP"),
                                sendOpt: {text: `${g.name} fordert die Seite an: ${f.app.info}.`}});
    let status = null, grund = null;
    if (r.antwort) { status = r.antwort.app.felder.status; Sim._log(L, "empfangen", g.id, null, r.antwort, `${g.name} erhält die Seite: ${r.antwort.app.info}.`); c.seq += 1; c.ack = r.antwort.tcp.seq + 1; }
    else { grund = timeoutGrund(L, r.idx); stelleSetzen(L, stelle(L, r.idx, grund)); }
    tcpSchliessen(L, g, z.ip, u.port, c);
    const ok = status === 200 && !L.abbruch;
    const text = ok ? `${u.schema}://${u.host}${u.pfad} → ${status} OK (${z.ip}).` : `Keine Antwort vom Webserver ${z.ip}.`;
    return {ok, status, grund: ok ? null : (L.abbruch ? "STORM" : grund), ziel: z.ip, trace: Sim._trace(L, ok, text), text};
  };

  /* ---------- DNS, DHCP ---------- */
  Sim.dns = function(netz, vonId, name){
    const {L, g} = start(netz, "dns", vonId);
    if (!g) return ohneGeraet(L, vonId, {ip: null});
    if (!g.an) return ausgeschaltet(L, g, {ip: null});
    vorbereiten(L, g);
    const d = dnsAufloesen(L, g, String(name || "").trim());
    if (!d.ok) stelleSetzen(L, d.stelle);
    const text = d.ok ? `${name} → ${d.ip}` : `${name}: ${d.text}`;
    return {ok: d.ok && !L.abbruch, ip: d.ip || null, grund: d.ok ? null : (L.abbruch ? "STORM" : d.grund), ursache: d.ursache || null, trace: Sim._trace(L, d.ok, text), text};
  };
  Sim.dhcp = function(netz, vonId, port){
    port = port || "eth0";
    const {L, g} = start(netz, "dhcp", vonId);
    if (!g) return ohneGeraet(L, vonId, {lease: null});
    if (!g.an) return ausgeschaltet(L, g, {lease: null});
    if (!Sim._istHost(g)) { const text = `${g.name} ist kein Endgerät mit DHCP-Client.`; return {ok: false, lease: null, grund: null, trace: Sim._trace(L, false, text), text}; }
    const r = dhcpHolen(L, g, port);
    if (!r.ok) stelleSetzen(L, r.stelle);
    return {ok: r.ok && !L.abbruch, lease: r.lease || null, grund: r.ok ? null : (L.abbruch ? "STORM" : r.grund), ursache: r.ursache || null, apipa: r.apipa || null,
            trace: Sim._trace(L, r.ok, r.text), text: r.text};
  };

  /* ---------- Adresse (ohne Lauf, verändert nichts) ---------- */
  Sim.adresse = function(netz, id, port){
    const g = netz.geraete[id]; if (!g) return {ip: "", maske: "", gw: "", dns: "", quelle: "keine"};
    const L = Sim._lauf(netz, {art: "adresse"});
    const ifs = L3().schnittstellen(L, g);
    const name = port ? (g.typ === "switch" && /^\d+$/.test(String(port)) ? "Vlan" + port : Sim._ifKurz(port)) : null;
    const i = name ? ifs.find(x => x.name === name) : (ifs.find(x => x.ip) || ifs[0]);
    if (!i) return {ip: "", maske: "", gw: "", dns: "", quelle: "keine"};
    return {ip: i.ip || "", maske: i.ip ? i.maske : "", gw: i.gw || "", dns: i.dns || "", quelle: i.ip ? i.quelle : "keine"};
  };

  /* ---------- Abnahme: pruefeZiel (Architektur § 7.1) auf einer Kopie ---------- */
  function wertGleich(a, b){
    if (a === b) return true;
    if (a == null || b == null) return a == b;
    if (typeof a !== "object" && typeof b !== "object") return String(a) === String(b);
    return JSON.stringify(a) === JSON.stringify(b);
  }
  function erreichbarkeit(k, z){
    const proto = z.proto || "icmp";
    if (proto === "icmp") return Sim.ping(k, z.von, z.nach, {anzahl: 4});
    if (proto === "tcp") return Sim.tcp(k, z.von, z.nach, z.port);
    if (proto === "http") {
      const port = z.port ? +z.port : 80, schema = port === 443 ? "https" : "http";
      return Sim.http(k, z.von, `${schema}://${z.nach}${port !== 80 && port !== 443 ? ":" + port : ""}/`);
    }
    if (proto === "dns") {
      const r = Sim.dns(k, z.von, z.name || z.nach);
      if (r.ok && z.ip && r.ip !== z.ip) { r.ok = false; r.grund = "DNS_FAIL"; r.text = `${z.name || z.nach} löst auf ${r.ip} auf, erwartet war ${z.ip}.`; }
      return r;
    }
    return {ok: false, grund: null, trace: null, text: `Unbekanntes Protokoll „${proto}“.`};
  }
  Sim.pruefeZiel = function(netz, ziel){
    const z = ziel || {};
    const beschr = z.text || "";
    if (z.typ === "konfig" || z.typ === "gespeichert") {
      const g = netz.geraete[z.geraet];
      if (!g) return {ok: false, grund: null, trace: null, text: `Gerät „${z.geraet}“ fehlt.`};
      if (z.typ === "konfig") {
        const flash = z.quelle === "flash" || /^vlans\./.test(String(z.pfad));
        const ist = Modell.lesen(flash ? g.flash : g.running, z.pfad);
        const ok = wertGleich(ist, z.wert);
        return {ok, grund: null, trace: null, text: ok ? (beschr || `${g.name}: ${z.pfad} passt.`) : `${g.name}: ${z.pfad} ist ${JSON.stringify(ist)}, erwartet ${JSON.stringify(z.wert)}.`};
      }
      const ok = g.startup ? Modell.gleich(g.running, g.startup) : !Modell.ungespeichert(g);
      return {ok, grund: null, trace: null, text: ok ? (beschr || `${g.name}: Konfiguration ist gespeichert.`) : `${g.name}: running-config ist nicht gespeichert (copy running-config startup-config).`};
    }
    const k = Modell.kopie(netz);
    if (z.typ === "dhcp") {
      const r = Sim.dhcp(k, z.von, z.port || "eth0");
      return {ok: r.ok, grund: r.grund, trace: r.trace, text: r.ok ? (beschr || r.text) : r.text};
    }
    if (z.typ === "erreichbar" || z.typ === "blockiert") {
      const r = erreichbarkeit(k, z);
      const geht = !!r.ok;
      if (z.typ === "erreichbar") return {ok: geht, grund: geht ? null : (r.grund || "TIMEOUT"), trace: r.trace || null, text: geht ? (beschr || r.text) : r.text};
      const sturm = r.grund === "STORM";
      return {ok: !geht && !sturm, grund: geht ? null : r.grund || null, trace: r.trace || null,
              text: geht ? `Noch erreichbar: ${r.text}` : sturm ? r.text : (beschr ? `${beschr} – ${r.text}` : r.text)};
    }
    return {ok: false, grund: null, trace: null, text: `Unbekannter Zieltyp „${z.typ}“.`};
  };

  /* ---------- Erklärung: die entscheidende Stelle eines Fehlschlags ---------- */
  Sim.erklaere = function(trace){
    if (!trace || !Array.isArray(trace.ereignisse)) return null;
    const ev = trace.ereignisse;
    let e = trace.stelle ? ev[trace.stelle - 1] : null;
    if (!e && trace.abbruch) e = ev.find(x => x.grund === "STORM");
    if (!e && trace.ok === true) return null;
    if (!e) e = ev.find(x => x.grund && x.art === "verwerfen") || ev.find(x => x.grund);
    if (!e) return null;
    return {grund: e.grund, geraet: e.geraet, port: e.port, text: e.text, n: e.n};
  };

  /* ---------- Anzeigehilfen für Konsole und Inspektor (lesen nur) ---------- */
  function leserLauf(netz){ return Sim._lauf(netz, {art: "lesen"}); }
  Sim.schnittstellen = function(netz, id){
    const g = netz.geraete[id]; if (!g) return [];
    return L3().schnittstellen(leserLauf(netz), g).map(i => ({name: i.name, port: i.port, ip: i.ip, maske: i.maske, gw: i.gw, dns: i.dns, mac: i.mac, oben: i.oben, quelle: i.quelle, vlan: i.vlan, svi: i.svi}));
  };
  Sim.routingTabelle = function(netz, id){
    const g = netz.geraete[id]; if (!g || !["router", "firewall", "internet"].includes(g.typ)) return [];
    return L3().routen(leserLauf(netz), g).map(r => ({typ: r.typ, netz: r.netz, maske: r.maske, praefix: r.praefix, nh: r.nh, aus: r.aus, ad: r.ad}))
      .sort((a, b) => IP.vergleich(a.netz, b.netz) || b.praefix - a.praefix);
  };
  Sim.arpTabelle = function(netz, id){
    const z = (netz.zustand || {})[id] || {}, uhr = +(netz.zustand || {})._uhr || 0;
    return Object.entries(z.arp || {}).filter(([, e]) => e.bis > uhr).map(([ip, e]) => ({ip, mac: e.mac, if: e.if || null, restS: Math.round((e.bis - uhr) / 1000)}))
      .sort((a, b) => IP.vergleich(a.ip, b.ip));
  };
  Sim.macTabelle = function(netz, id){
    const z = (netz.zustand || {})[id] || {}, uhr = +(netz.zustand || {})._uhr || 0, r = [];
    for (const [v, tab] of Object.entries(z.mac || {})) for (const [mac, e] of Object.entries(tab)) if (e.bis > uhr) r.push({vlan: +v, mac, port: e.port, restS: Math.round((e.bis - uhr) / 1000)});
    return r.sort((a, b) => a.vlan - b.vlan || String(a.port).localeCompare(String(b.port)));
  };
  Sim.natTabelle = function(netz, id){ const z = (netz.zustand || {})[id] || {}, uhr = +(netz.zustand || {})._uhr || 0; return (z.nat || []).filter(e => e.bis > uhr).map(e => tief(e)); };
  Sim.leases = function(netz, id){ const z = (netz.zustand || {})[id] || {}, uhr = +(netz.zustand || {})._uhr || 0; return Object.entries(z.leases || {}).filter(([, l]) => l.bis > uhr).map(([ip, l]) => ({ip, mac: l.mac, bis: l.bis})); };
  /* virtuelle Uhr vorstellen (z. B. für Alterung von ARP- und MAC-Einträgen zwischen Tickets) */
  Sim.vergehen = function(netz, ms){ netz.zustand ||= {_uhr: 0}; netz.zustand._uhr = (+netz.zustand._uhr || 0) + Math.max(0, +ms || 0); return netz.zustand._uhr; };

  Sim._intern = {anfrage, dhcpHolen, dnsAufloesen, zielAufloesen, tcpVerbinden, urlZerlegen, apipaAdresse};
})();
