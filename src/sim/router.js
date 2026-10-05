"use strict";
/* ---------- Simulation: Router (und gemeinsame Weiterleitung für Firewall und Internet) ----------
   Schnittstellen und Subinterfaces (802.1Q), verbundene Netze, statische Routen und Default-Route (längster
   Präfix gewinnt), ARP (IOS verwirft das erste Paket, solange ARP läuft), MAC-Wechsel je Hop, TTL −1,
   ICMP „Destination unreachable“ (gedrosselt: eine je 500 ms) und „Time exceeded“, ACL (standard/erweitert,
   in/out, erste Übereinstimmung gewinnt, implizites deny, Meldung „administratively prohibited“),
   NAT (statisch inkl. Port, PAT/overload), DHCP-Server und ip helper-address (Relay).
   Reihenfolge wie IOS (Cisco „NAT Order of Operation“): innen→außen: ACL in, Routing, NAT, ACL out;
   außen→innen: ACL in, NAT, Routing, ACL out. */
Sim.router = (() => {
  const L3 = () => Sim.l3;

  /* ---------- gemeinsamer Empfang für Router, Firewall, Internet ---------- */
  function haken(g){ return g.typ === "router" ? H : (Sim[g.typ] && Sim[g.typ].haken) || {}; }
  function empfangen(L, g, port, f){
    if (!f.eth) return;
    const tag = f.eth.vlan;
    const ifc = L3().ifFuerPort(L, g, port, tag);
    const subs = g.typ === "router" ? L3().schnittstellen(L, g).filter(i => i.port === port && i.sub && i.vlan != null) : [];
    if (ifc && !ifc.ip && tag == null && subs.length) {
      const gemeint = Sim._gemeint(L, f).has(g.id);
      Sim._log(L, "verwerfen", g.id, port, f, `${g.name} ${port} erwartet getaggte Frames (Subinterfaces für VLAN ${subs.map(i => i.vlan).join(", ")}), dieser kommt ungetaggt an und wird verworfen. Ist der Switchport gegenüber ein Trunk?`, {grund: gemeint ? "DROP_VLAN" : null});
      return;
    }
    if (!ifc) {
      const gemeint = Sim._gemeint(L, f).has(g.id);
      Sim._log(L, "verwerfen", g.id, port, f, tag != null
        ? `${g.name} hat an ${port} keine Subschnittstelle für VLAN ${tag} (encapsulation dot1Q ${tag}) und verwirft den getaggten Frame.`
        : `${g.name} ${port} ist für ungetaggte Frames nicht konfiguriert und verwirft den Frame.`, {grund: gemeint ? "DROP_VLAN" : null});
      return;
    }
    if (!ifc.oben) { Sim._log(L, "verwerfen", g.id, port, f, `${g.name} ${ifc.name} ist abgeschaltet (shutdown) und nimmt nichts an.`, {grund: "PORT_SHUTDOWN"}); return; }
    if (f.eth.dst !== ifc.mac && f.eth.dst !== IP.MAC_BROADCAST) { Sim._log(L, "verwerfen", g.id, port, f, `Der Frame ist an ${f.eth.dst} adressiert, nicht an ${g.name}.`); return; }
    if (f.arp) return L3().arpEmpfangen(L, g, ifc, f);
    if (!f.ip) return;
    if (!ifc.ip) { Sim._log(L, "verwerfen", g.id, port, f, `${g.name} ${ifc.name} hat keine IP-Adresse und verarbeitet keine IP-Pakete.`); return; }
    ip(L, g, ifc, f);
  }

  function ip(L, g, ifc, f){
    const h = haken(g), vorIp = f.ip.src + ">" + f.ip.dst;
    if (h.eingang && !h.eingang(L, g, ifc, f)) return;
    const dst = f.ip.dst;
    const bc = dst === "255.255.255.255" || (IP.istBroadcast(dst, ifc.maske) && IP.gleichesNetz(dst, ifc.ip, ifc.maske));
    if (bc) {
      if (h.broadcast && h.broadcast(L, g, ifc, f)) return;
      Sim._log(L, "verwerfen", g.id, ifc.port, f, `${g.name} leitet Broadcasts nicht in andere Netze weiter.`);
      return;
    }
    const eigene = L3().eigeneIfc(L, g, dst);
    if (eigene) return lokal(L, g, ifc, eigene, f);
    if (h.virtuell && h.virtuell(L, g, ifc, f)) return;
    if (f.ip.ttl <= 1) {
      const tr = L.info.art === "traceroute" && L.herkunft[f.ip.id] === L.info.von;
      Sim._log(L, "verwerfen", g.id, ifc.port, f, tr
        ? `${g.name}: TTL erreicht 0. ${g.name} verwirft die Probe und meldet „Time exceeded“ – so verrät es sich als Station auf dem Weg (traceroute).`
        : `${g.name}: Die TTL ist abgelaufen (TTL ${f.ip.ttl}). Das Paket wird verworfen, ${f.ip.src} bekommt „Time exceeded“. Kreist es in einer Routing-Schleife?`, {grund: tr ? null : "TTL_EXPIRED"});
      L3().icmpFehler(L, g, ifc, f, "time-exceeded", null, tr ? null : "TTL_EXPIRED");
      return;
    }
    const w = L3().suche(L, g, dst);
    if (!w || !w.ifc) return (h.keineRoute || keineRoute)(L, g, ifc, f);
    if (h.ausgang && !h.ausgang(L, g, ifc, w, f)) return;
    const vorher = f.ip.ttl;
    f.ip.ttl -= 1;
    Sim._log(L, "weiterleiten", g.id, w.ifc.port || w.ifc.name, f,
      `${g.name}: ${dst} → ${L3().routeText(w.route)}. Neuer Ethernet-Kopf (MAC-Adressen)${vorIp === f.ip.src + ">" + f.ip.dst ? ", IP-Adressen bleiben" : ", IP-Adresse per NAT übersetzt"}, TTL ${vorher} → ${f.ip.ttl}.`);
    L3().aufloesen(L, g, w.ifc, w.nh, f, {});
  }

  function keineRoute(L, g, ifc, f){
    const rueck = L.antwortIds.has(f.ip.id), dst = f.ip.dst;
    const grund = rueck ? "NO_RETURN_ROUTE" : "NO_ROUTE";
    Sim._log(L, "verwerfen", g.id, ifc.port || ifc.name, f, rueck
      ? `${g.name} kennt keinen Weg zurück zu ${dst}: Die Antwort ist bis hier gekommen, aber es fehlt eine Route für ${dst}. Beim Absender kommt nichts an – er sieht nur eine Zeitüberschreitung.`
      : `${g.name} kennt kein Netz für ${dst} (keine passende Route, keine Default-Route) und meldet „Destination unreachable“ zurück.`, {grund});
    L3().icmpFehler(L, g, ifc, f, "unreachable", "net", grund);
  }

  function lokal(L, g, ifcIn, eigene, f){
    const h = haken(g), wo = ifcIn.port || ifcIn.name;
    if (!eigene.oben) { Sim._log(L, "verwerfen", g.id, wo, f, `Die Adresse ${eigene.ip} gehört zu ${g.name} ${eigene.name}, die Schnittstelle ist aber nicht aktiv.`); return; }
    if (L3().zustellen(L, g, eigene, f)) return;
    if (h.lokal && h.lokal(L, g, ifcIn, eigene, f)) return;
    if (f.icmp) {
      if (f.icmp.typ === "echo-request") return L3().echoAntwort(L, g, ifcIn, f);
      Sim._log(L, "empfangen", g.id, wo, f, `${g.name} erhält ${Sim._kurz(f)} von ${f.ip.src}.`);
      return;
    }
    if (f.udp) {
      if (h.udp && h.udp(L, g, ifcIn, f)) return;
      const tr = f.udp.dst >= 33434 && f.udp.dst < 33700;
      Sim._log(L, tr ? "antworten" : "verwerfen", g.id, wo, f, tr ? `${g.name} ist das Ziel der Traceroute-Probe und antwortet mit „Port unreachable“.` : `Auf ${g.name} lauscht kein Dienst an UDP-Port ${f.udp.dst}.`, {grund: tr ? null : "PORT_CLOSED"});
      L3().icmpFehler(L, g, ifcIn, f, "unreachable", "port", tr ? null : "PORT_CLOSED");
      return;
    }
    if (f.tcp) {
      const fl = f.tcp.flags || [];
      if (fl.includes("RST")) return;
      Sim._log(L, "verwerfen", g.id, wo, f, `Auf ${g.name} lauscht kein Dienst an TCP-Port ${f.tcp.dst} (Fernzugriff auf Router ist in der Simulation nicht nachgebildet). Antwort: RST.`, {grund: "PORT_CLOSED"});
      const p = Sim._frame({ip: {src: f.ip.dst, dst: f.ip.src, ttl: L3().ttlStart(g), proto: "TCP", id: Sim._neueIpId(L, g.id)},
                            tcp: {src: f.tcp.dst, dst: f.tcp.src, flags: ["RST", "ACK"], seq: 0, ack: (f.tcp.seq || 0) + 1}});
      L.antwortIds.add(p.ip.id); L.icmpGrund[p.ip.id] = "PORT_CLOSED";
      ipSenden(L, g, p);
    }
  }

  /* Paket vom Gerät selbst (Ping aus der Konsole, ICMP-Meldungen, Antworten, Relay) */
  function ipSenden(L, g, f, opt){
    opt = opt || {};
    const dst = f.ip.dst;
    const w = L3().suche(L, g, dst);
    if (!w || !w.ifc) {
      const rueck = L.antwortIds.has(f.ip.id), grund = rueck ? "NO_RETURN_ROUTE" : "NO_ROUTE";
      const text = rueck ? `${g.name} will antworten, kennt aber keinen Weg zurück zu ${dst}. Die Antwort wird verworfen.`
                         : `${g.name} hat keine Route zu ${dst}.`;
      Sim._log(L, "verwerfen", g.id, null, f, text, {grund});
      L3().lokalerFehler(L, g, f, grund, text);
      return {ok: false, grund, text};
    }
    if (!f.ip.src) f.ip.src = w.ifc.ip;
    L3().aufloesen(L, g, w.ifc, w.nh, f, {text: opt.text});
    return {ok: true};
  }

  /* ---------- ACL ---------- */
  const ICMPNAME = {"echo-request": "echo", "echo-reply": "echo-reply", unreachable: "unreachable", "time-exceeded": "time-exceeded"};
  function teil(x, ip){ if (!x || !x.ip) return true; return IP.wildcardPasst(ip, x.ip, x.wc == null ? "0.0.0.0" : x.wc); }
  function portOp(b, p){
    if (p == null) return false;
    const ps = (b.ports || []).map(Number);
    switch (b.op) {
      case "eq": return ps.includes(p);
      case "neq": return !ps.includes(p);
      case "gt": return p > ps[0];
      case "lt": return p < ps[0];
      case "range": return p >= ps[0] && p <= ps[1];
    }
    return false;
  }
  function regelPasst(r, f, typ){
    const ip = f.ip, standard = typ === "standard";
    if (!standard && r.proto && r.proto !== "ip" && r.proto !== String(ip.proto).toLowerCase()) return false;
    if (!teil(r.quelle, ip.src)) return false;
    if (standard) return true;
    if (!teil(r.ziel, ip.dst)) return false;
    const l4 = f.tcp || f.udp;
    if (r.zielPort && !(l4 && portOp(r.zielPort, l4.dst))) return false;
    if (r.quellPort && !(l4 && portOp(r.quellPort, l4.src))) return false;
    if (r.icmpTyp && !(f.icmp && ICMPNAME[f.icmp.typ] === r.icmpTyp)) return false;
    return true;
  }
  /* → {ok, nr, regel, implizit, fehlt} */
  function aclPruefen(g, name, f){
    const a = (g.running.acls || {})[name];
    if (!a || !(a.regeln || []).length) return {ok: true, fehlt: true};   /* IOS: nicht vorhandene ACL lässt alles durch */
    const typ = a.typ || "standard";
    for (let i = 0; i < a.regeln.length; i++) if (regelPasst(a.regeln[i], f, typ)) return {ok: a.regeln[i].aktion === "permit", nr: i + 1, regel: a.regeln[i], typ};
    return {ok: false, implizit: true, typ};
  }
  function adr(x){
    if (!x || !x.ip || (x.ip === "0.0.0.0" && x.wc === "255.255.255.255")) return "any";
    if (!x.wc || x.wc === "0.0.0.0") return "host " + x.ip;
    return `${x.ip} ${x.wc}`;
  }
  function portText(b){ if (!b) return ""; return b.op === "range" ? ` range ${b.ports[0]} ${b.ports[1]}` : ` ${b.op} ${(b.ports || []).join(" ")}`; }
  function regelText(r, typ){
    if (typ === "standard") return `${r.aktion} ${adr(r.quelle)}`;
    return `${r.aktion} ${r.proto || "ip"} ${adr(r.quelle)}${portText(r.quellPort)} ${adr(r.ziel)}${portText(r.zielPort)}${r.icmpTyp ? " " + r.icmpTyp : ""}`;
  }
  function aclVerwirft(L, g, ifcIn, ifcAcl, f, name, richtung, r){
    const wo = `ACL ${name} (${richtung} auf ${ifcAcl.name})`;
    Sim._log(L, "verwerfen", g.id, ifcAcl.port || ifcAcl.name, f, r.implizit
      ? `${g.name} verwirft das Paket: ${wo} – keine Regel passt, am Ende steht das unsichtbare „deny any“.`
      : `${g.name} verwirft das Paket: ${wo}, Regel ${r.nr}: ${regelText(r.regel, r.typ)}.`, {grund: "ACL_DENY"});
    L3().icmpFehler(L, g, ifcIn, f, "unreachable", "admin", "ACL_DENY");
  }

  /* ---------- NAT ---------- */
  const natTab = (L, g) => (Sim._z(L, g.id).nat ||= []);
  const LEBEN = {icmp: 60000, udp: 300000, tcp: 86400000};
  function l4Port(f, seite){
    if (f.tcp || f.udp) return (f.tcp || f.udp)[seite];
    if (f.icmp && (f.icmp.typ === "echo-request" || f.icmp.typ === "echo-reply")) return f.icmp.id;
    return null;
  }
  function l4Setzen(f, seite, port){
    if (f.tcp || f.udp) (f.tcp || f.udp)[seite] = port;
    else if (f.icmp) f.icmp.id = port;
  }
  const protoKlein = f => String(f.ip.proto).toLowerCase();
  function natRaus(L, g, ifcIn, ifcOut, f){
    const n = g.running.nat || {}, src = f.ip.src, proto = protoKlein(f), sport = l4Port(f, "src");
    const alt = `${src}${sport != null ? ":" + sport : ""}`;
    for (const s of n.statisch || []) {
      if (s.innen !== src) continue;
      if (s.proto && (s.proto !== proto || +s.innenPort !== sport)) continue;
      f.ip.src = s.aussen;
      if (s.proto && s.aussenPort != null) l4Setzen(f, "src", +s.aussenPort);
      Sim._log(L, "info", g.id, ifcOut.port, f, `${g.name} übersetzt die Quelle ${alt} → ${f.ip.src}${s.proto ? ":" + l4Port(f, "src") : ""} (statisches NAT).`);
      return true;
    }
    const tab = natTab(L, g);
    for (const d of n.dynamisch || []) {
      const aus = d.aus ? Sim._ifKurz(d.aus) : null;
      if (aus && aus !== ifcOut.name) continue;
      if (!aclPruefen(g, String(d.acl), f).ok || !(g.running.acls || {})[String(d.acl)]) continue;
      const aussen = (aus ? L3().ifName(L, g, aus) : ifcOut) || {};
      if (!aussen.ip) continue;
      let e = tab.find(x => x.typ !== "statisch" && x.proto === proto && x.innen === src && x.innenPort === sport && x.bis > L.t);
      if (!e) {
        if (!d.overload && tab.some(x => x.aussen === aussen.ip && x.innen !== src && x.bis > L.t)) {
          Sim._log(L, "verwerfen", g.id, ifcOut.port, f, `${g.name}: Die Adresse ${aussen.ip} ist schon von einem anderen Gerät belegt, und „overload“ fehlt. Keine Übersetzung möglich.`, {grund: "NAT_MISSING"});
          return false;
        }
        let port = sport;
        if (sport != null && d.overload) {
          const frei = p => !tab.some(x => x.aussen === aussen.ip && x.proto === proto && x.aussenPort === p && x.bis > L.t);
          if (!frei(port)) { port = 1024; while (!frei(port) && port < 65535) port++; }
        }
        e = {typ: d.overload ? "pat" : "dynamisch", proto, innen: src, innenPort: sport, aussen: aussen.ip, aussenPort: port, ziel: f.ip.dst, zielPort: l4Port(f, "dst"), bis: 0};
        tab.push(e);
      }
      e.bis = L.t + (LEBEN[proto] || 60000);
      f.ip.src = e.aussen;
      if (e.aussenPort != null) l4Setzen(f, "src", e.aussenPort);
      Sim._log(L, "info", g.id, ifcOut.port, f, `${g.name} übersetzt die Quelle ${alt} → ${e.aussen}${e.aussenPort != null ? ":" + e.aussenPort : ""} (${d.overload ? "PAT/overload" : "dynamisches NAT"}) und merkt sich das in der NAT-Tabelle.`);
      return true;
    }
    return true;   /* nichts passt: Paket geht unübersetzt weiter (im Internet dann NAT_MISSING) */
  }
  function natRein(L, g, ifc, f){
    const n = g.running.nat || {}, tab = natTab(L, g), proto = protoKlein(f);
    /* ICMP-Fehlermeldung zu einer übersetzten Verbindung: eingebetteten Kopf mit zurückübersetzen */
    if (f.icmp && f.icmp.orig && (f.icmp.typ === "unreachable" || f.icmp.typ === "time-exceeded")) {
      const o = f.icmp.orig, op = String(o.proto).toLowerCase(), oport = o.sport != null ? o.sport : o.icmpId;
      const e = tab.find(x => x.aussen === o.src && x.proto === op && x.aussenPort === oport && x.bis > L.t);
      if (e) {
        f.ip.dst = e.innen; o.src = e.innen;
        if (o.sport != null) o.sport = e.innenPort; else { o.icmpId = e.innenPort; f.icmp.id = e.innenPort; }
        Sim._log(L, "info", g.id, ifc.port, f, `${g.name} ordnet die ICMP-Meldung der NAT-Tabelle zu und schickt sie an ${e.innen} weiter.`);
      }
      return;
    }
    const dst = f.ip.dst, dport = l4Port(f, "dst");
    const e = tab.find(x => x.aussen === dst && x.proto === proto && x.aussenPort === dport && x.bis > L.t);
    if (e) {
      f.ip.dst = e.innen; if (e.innenPort != null) l4Setzen(f, "dst", e.innenPort);
      Sim._log(L, "info", g.id, ifc.port, f, `${g.name} findet ${dst}${dport != null ? ":" + dport : ""} in der NAT-Tabelle und übersetzt zurück auf ${e.innen}${e.innenPort != null ? ":" + e.innenPort : ""}.`);
      return;
    }
    for (const s of n.statisch || []) {
      if (s.aussen !== dst) continue;
      if (s.proto && (s.proto !== proto || +s.aussenPort !== dport)) continue;
      f.ip.dst = s.innen;
      if (s.proto && s.innenPort != null) l4Setzen(f, "dst", +s.innenPort);
      Sim._log(L, "info", g.id, ifc.port, f, `${g.name} übersetzt das Ziel ${dst}${s.proto ? ":" + dport : ""} → ${s.innen}${s.proto && s.innenPort != null ? ":" + s.innenPort : ""} (statisches NAT).`);
      return;
    }
  }

  /* ---------- DHCP ---------- */
  /* Dieselbe Pool-Form wie beim Host (Architektur § 10.1): start/anzahl/domain/leaseS/reservierungen und
     Ausschlüsse sind auf beiden Gerätetypen gleich. Der Router reicht seine `ausgeschlossen`-Liste mit. */
  function routerPools(g){
    const d = g.running.dhcp || {};
    const aus = Sim.host.ausschluesse(d);
    return (d.pools || []).filter(p => IP.gueltig(p.netz) && IP.maskeGueltig(p.maske)).map(p => Sim.host.poolForm(p, aus));
  }
  function relay(L, g, ifc, f){
    const a = f.app.felder || {};
    for (const h of ifc.helper) {
      const p = Sim._kopie(f);
      p.eth = null;
      p.ip = {src: ifc.ip, dst: h, ttl: 255, proto: "UDP", id: Sim._neueIpId(L, g.id)};
      p.udp = {src: 67, dst: 67};
      p.app.felder = Object.assign({}, a, {relay: a.relay && a.relay !== "0.0.0.0" ? a.relay : ifc.ip});
      Sim._log(L, "weiterleiten", g.id, ifc.port, p, `${g.name} leitet den ${f.app.info} als Unicast an ${h} weiter (ip helper-address, Relay-Adresse ${ifc.ip} bestimmt den Pool).`);
      ipSenden(L, g, p);
    }
  }
  const H = {
    eingang(L, g, ifc, f){
      if (ifc.aclIn) {
        const r = aclPruefen(g, ifc.aclIn, f);
        if (!r.ok) { aclVerwirft(L, g, ifc, ifc, f, ifc.aclIn, "in", r); return false; }
      }
      if (ifc.nat === "outside") natRein(L, g, ifc, f);
      return true;
    },
    ausgang(L, g, ifcIn, w, f){
      if (ifcIn.nat === "inside" && w.ifc.nat === "outside" && !natRaus(L, g, ifcIn, w.ifc, f)) return false;
      if (w.ifc.aclOut) {
        const r = aclPruefen(g, w.ifc.aclOut, f);
        if (!r.ok) { aclVerwirft(L, g, ifcIn, w.ifc, f, w.ifc.aclOut, "out", r); return false; }
      }
      return true;
    },
    broadcast(L, g, ifc, f){
      if (!(f.udp && f.udp.dst === 67 && f.app && f.app.proto === "DHCP")) return false;
      const pools = Sim.host.dhcpAn(g) ? routerPools(g) : [];
      if (pools.some(p => IP.imNetz(ifc.ip, p.netz, p.maske))) { Sim.host.dhcpServer(L, g, ifc, f, pools); return true; }
      if (ifc.helper.length) { relay(L, g, ifc, f); return true; }
      Sim._log(L, "verwerfen", g.id, ifc.port, f, `${g.name} ist hier kein DHCP-Server und hat an ${ifc.name} keine „ip helper-address“ – der Broadcast endet am Router.`);
      return true;
    },
    udp(L, g, ifcIn, f){
      if (!(f.app && f.app.proto === "DHCP" && f.udp.dst === 67)) return false;
      const a = f.app.felder || {};
      if (a.typ === "discover" || a.typ === "request") {
        const pools = Sim.host.dhcpAn(g) ? routerPools(g) : [];
        if (!pools.length) return false;
        Sim.host.dhcpServer(L, g, ifcIn, f, pools);
        return true;
      }
      const ziel = L3().schnittstellen(L, g).find(i => i.ip && i.ip === a.relay && i.oben);
      if (!ziel) return false;
      const p = Sim._frame({ip: {src: ziel.ip, dst: a.typ === "nak" ? "255.255.255.255" : a.angeboten, ttl: 255, proto: "UDP", id: Sim._neueIpId(L, g.id)},
                            udp: {src: 67, dst: 68}, app: Sim._kopie(f.app)});
      L.antwortIds.add(p.ip.id);
      Sim._log(L, "weiterleiten", g.id, ziel.port, p, `${g.name} reicht das ${f.app.info} an ${a.clientMac} ins Netz von ${ziel.name} weiter (Relay).`);
      L3().raus(L, g, ziel, a.typ === "nak" ? IP.MAC_BROADCAST : a.clientMac, p);
      return true;
    },
  };

  return {empfangen, ip, lokal, keineRoute, ipSenden, haken, aclPruefen, regelPasst, regelText, natRaus, natRein, routerPools, H};
})();
