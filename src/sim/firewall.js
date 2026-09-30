"use strict";
/* ---------- Simulation: Firewall (herstellerneutral, Architektur § 4) ----------
   Routing wie ein Router, dazu Zonen je Schnittstelle, Regeln von oben nach unten (erste passende gewinnt,
   am Ende implizit verwerfen), zustandsbehaftet (Rückverkehr einer erlaubten Verbindung ist erlaubt),
   Quell-NAT (PAT) von Zone zu Zone, Port-Weiterleitung (Ziel-NAT). Verworfen wird still (Grund FW_DENY).
   Vereinfachungen: Verkehr innerhalb derselben Zone ist erlaubt; Regeln sehen bei Port-Weiterleitung die
   innere Zieladresse; an die Firewall selbst wird nur die Adresse der Eingangsschnittstelle beantwortet. */
Sim.firewall = (() => {
  const LEBEN = {icmp: 60000, udp: 300000, tcp: 86400000};
  const zone = ifc => ifc.zone || "(keine)";
  const proto = f => String(f.ip.proto).toLowerCase();
  function ports(f){
    if (f.tcp || f.udp) { const l = f.tcp || f.udp; return {s: l.src, d: l.dst}; }
    if (f.icmp && (f.icmp.typ === "echo-request" || f.icmp.typ === "echo-reply")) return {s: f.icmp.id, d: f.icmp.id};
    return {s: null, d: null};
  }
  function setzePort(f, seite, p){
    if (f.tcp || f.udp) (f.tcp || f.udp)[seite === "s" ? "src" : "dst"] = p;
    else if (f.icmp) f.icmp.id = p;
  }
  const tab = (L, g) => (Sim._z(L, g.id).fw ||= []);
  const natTab = (L, g) => (Sim._z(L, g.id).nat ||= []);
  const istFehler = f => f.icmp && (f.icmp.typ === "unreachable" || f.icmp.typ === "time-exceeded");

  function adrPasst(regelAdr, ip){
    if (!regelAdr || regelAdr === "any") return true;
    const c = IP.ausCidr(regelAdr);
    if (c) return IP.imNetz(ip, c.netz, c.maske);
    return regelAdr === ip;
  }
  function regelPasst(r, f, von, nach){
    if (r.aktiv === false) return false;
    if (r.von && r.von !== "any" && r.von !== von) return false;
    if (r.nach && r.nach !== "any" && r.nach !== nach) return false;
    const p = proto(f);
    if (r.proto && r.proto !== "ip" && r.proto !== p) return false;
    if (!adrPasst(r.quelle, f.ip.src) || !adrPasst(r.ziel, f.ip.dst)) return false;
    if (r.port != null && r.port !== "") { const l = f.tcp || f.udp; if (!l || l.dst !== +r.port) return false; }
    return true;
  }
  function verbindung(L, g, f){
    const pt = ports(f), p = proto(f);
    for (const c of tab(L, g)) {
      if (c.bis <= L.t || c.proto !== p) continue;
      if (c.src === f.ip.src && c.sport === pt.s && c.dst === f.ip.dst && c.dport === pt.d) return {c, rueck: false};
      if (c.src === f.ip.dst && c.sport === pt.d && c.dst === f.ip.src && c.dport === pt.s) return {c, rueck: true};
    }
    return null;
  }
  function zuFehler(L, g, f){
    const o = f.icmp.orig; if (!o) return null;
    const op = String(o.proto).toLowerCase(), os = o.sport != null ? o.sport : o.icmpId, od = o.dport != null ? o.dport : o.icmpId;
    return tab(L, g).find(c => c.bis > L.t && c.proto === op && ((c.src === o.src && c.sport === os) || (c.dst === o.src && c.dport === os) || (c.dst === o.dst && c.dport === od))) || null;
  }

  const haken = {
    eingang(L, g, ifc, f){
      const k = g.running, pt = ports(f), p = proto(f);
      /* Rückverkehr zu Quell-NAT: Ziel zurückübersetzen */
      if (f.ip.dst === ifc.ip) {
        if (istFehler(f) && f.icmp.orig) {
          const o = f.icmp.orig, op = String(o.proto).toLowerCase(), oport = o.sport != null ? o.sport : o.icmpId;
          const c = tab(L, g).find(x => x.snat && x.snat.ip === o.src && x.snat.port === oport && x.proto === op && x.bis > L.t);
          if (c) { f.ip.dst = c.src; o.src = c.src; if (o.sport != null) o.sport = c.sport; else { o.icmpId = c.sport; f.icmp.id = c.sport; } }
          return true;
        }
        const c = tab(L, g).find(x => x.snat && x.snat.ip === f.ip.dst && x.snat.port === pt.d && x.proto === p && x.bis > L.t);
        if (c) {
          f.ip.dst = c.src; setzePort(f, "d", c.sport);
          Sim._log(L, "info", g.id, ifc.port, f, `${g.name} erkennt die Antwort zu einer bekannten Verbindung und übersetzt das Ziel zurück auf ${c.src}${c.sport != null ? ":" + c.sport : ""} (Quell-NAT).`);
          return true;
        }
        /* Port-Weiterleitung */
        const w = (k.nat && k.nat.weiterleitung || []).find(x => (x.proto || "tcp") === p && +x.aussenPort === pt.d);
        if (w && IP.gueltig(w.ziel)) {
          const alt = `${f.ip.dst}:${pt.d}`;
          f.ip.dst = w.ziel; setzePort(f, "d", w.zielPort != null ? +w.zielPort : pt.d);
          L.fwDnat = {id: f.ip.id, ip: ifc.ip, port: pt.d};
          Sim._log(L, "info", g.id, ifc.port, f, `${g.name} leitet ${alt} per Port-Weiterleitung an ${f.ip.dst}:${ports(f).d} weiter.`);
        }
      }
      return true;
    },
    ausgang(L, g, ifcIn, w, f){
      const von = zone(ifcIn), nach = zone(w.ifc), p = proto(f);
      const v = verbindung(L, g, f);
      if (v) {
        v.c.bis = L.t + (LEBEN[p] || 60000);
        if (v.rueck && v.c.dnat) { f.ip.src = v.c.dnat.ip; setzePort(f, "s", v.c.dnat.port); }
        if (!v.rueck && v.c.snat) { f.ip.src = v.c.snat.ip; setzePort(f, "s", v.c.snat.port); }
        Sim._log(L, "info", g.id, w.ifc.port, f, v.rueck ? `${g.name} lässt die Antwort durch: Sie gehört zu einer erlaubten Verbindung (zustandsbehaftet).` : `${g.name}: Das Paket gehört zu einer bestehenden, erlaubten Verbindung.`);
        return true;
      }
      if (istFehler(f)) {
        if (zuFehler(L, g, f)) return true;
      }
      let erlaubt = false, text;
      if (von === nach && ifcIn.zone) { erlaubt = true; text = `${g.name}: Verkehr innerhalb der Zone „${von}“ ist erlaubt.`; }
      else {
        const regeln = g.running.regeln || [];
        const i = regeln.findIndex(r => regelPasst(r, f, von, nach));
        if (i < 0) {
          Sim._log(L, "verwerfen", g.id, ifcIn.port, f, `${g.name} verwirft das Paket von Zone „${von}“ nach „${nach}“: Keine Regel passt, am Ende wird implizit verworfen.`, {grund: "FW_DENY"});
          return false;
        }
        const r = regeln[i];
        if (r.aktion !== "erlauben") {
          Sim._log(L, "verwerfen", g.id, ifcIn.port, f, `${g.name} verwirft das Paket von „${von}“ nach „${nach}“: Regel ${i + 1}${r.text ? ` („${r.text}“)` : ""} sagt „verwerfen“.`, {grund: "FW_DENY"});
          return false;
        }
        erlaubt = true; text = `${g.name} erlaubt das Paket von „${von}“ nach „${nach}“ nach Regel ${i + 1}${r.text ? ` („${r.text}“)` : ""} und merkt sich die Verbindung.`;
      }
      if (!erlaubt) return false;
      if (istFehler(f)) return true;
      const pt = ports(f);
      const c = {proto: p, src: f.ip.src, sport: pt.s, dst: f.ip.dst, dport: pt.d, bis: L.t + (LEBEN[p] || 60000), snat: null, dnat: null};
      if (L.fwDnat && L.fwDnat.id === f.ip.id) { c.dnat = {ip: L.fwDnat.ip, port: L.fwDnat.port}; L.fwDnat = null; }
      const sn = (g.running.nat && g.running.nat.quellNat || []).find(x => x.von === von && x.nach === nach);
      if (sn && w.ifc.ip) {
        const alle = tab(L, g);
        const frei = port => !alle.some(x => x.snat && x.snat.ip === w.ifc.ip && x.snat.port === port && x.proto === p && x.bis > L.t);
        let port = pt.s;
        if (port != null && !frei(port)) { port = 1024; while (!frei(port) && port < 65535) port++; }
        c.snat = {ip: w.ifc.ip, port};
        natTab(L, g).push({typ: "snat", proto: p, innen: c.src, innenPort: c.sport, aussen: w.ifc.ip, aussenPort: port, bis: c.bis});
        f.ip.src = w.ifc.ip; setzePort(f, "s", port);
        text += ` Quell-NAT: ${c.src} → ${w.ifc.ip}${port != null ? ":" + port : ""}.`;
      }
      tab(L, g).push(c);
      Sim._log(L, "info", g.id, w.ifc.port, f, text);
      return true;
    },
    lokal(L, g, ifcIn, eigene, f){
      if (eigene.name === ifcIn.name) return false;
      Sim._log(L, "verwerfen", g.id, ifcIn.port, f, `${g.name} beantwortet nur Pakete an die Adresse der Schnittstelle, an der sie ankommen (${ifcIn.ip}). ${eigene.ip} ist von hier aus gesperrt.`, {grund: "FW_DENY"});
      return true;
    },
  };
  function empfangen(L, g, port, f){ return Sim.router.empfangen(L, g, port, f); }
  return {empfangen, haken, regelPasst};
})();
