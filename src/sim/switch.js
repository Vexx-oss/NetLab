"use strict";
/* ---------- Simulation: Switch ----------
   MAC-Lernen je VLAN (Alterung 300 s), Fluten unbekannter Ziele und Broadcasts im VLAN, Access- und Trunk-Ports
   (802.1Q-Tag nur auf dem Trunk, Native VLAN ungetaggt, erlaubte VLANs), VLAN-Datenbank (flash), Port-Security,
   SVI (Verwaltungsadresse mit ip default-gateway). Kein Spanning Tree: Eine Schleife endet im Broadcast-Sturm. */
Sim.switch = (() => {
  const L3 = () => Sim.l3;
  const native = pc => +pc.nativeVlan || 1;
  function vlanListe(e){
    if (Array.isArray(e)) return e.map(Number);
    const r = [];
    for (const teil of String(e).split(",")) {
      const m = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(teil); if (!m) continue;
      const a = +m[1], b = m[2] ? +m[2] : a;
      for (let v = a; v <= b && v - a < 4096; v++) r.push(v);
    }
    return r;
  }
  function erlaubt(pc, v){
    const e = pc.trunkErlaubt;
    if (e == null || e === "all" || e === "") return true;
    if (e === "none") return false;
    return vlanListe(e).includes(+v);
  }
  const vlanDa = (g, v) => !!(g.flash && g.flash.vlans && g.flash.vlans[String(v)]);
  const istGruppe = mac => mac === IP.MAC_BROADCAST || (parseInt(String(mac).slice(0, 2), 16) & 1) === 1;
  function tab(L, g, v){ const z = Sim._z(L, g.id); z.mac ||= {}; return (z.mac[v] ||= {}); }

  function empfangen(L, g, port, f){
    const pc = g.running.ports[port]; if (!pc || !f.eth) return;
    const tag = f.eth.vlan;
    let v;
    if (pc.modus === "trunk") {
      v = tag == null ? native(pc) : +tag;
      if (tag == null) nativePruefen(L, g, port, pc, f);
      if (!erlaubt(pc, v)) {
        Sim._log(L, "verwerfen", g.id, port, f, `${g.name} ${port}: VLAN ${v} ist auf diesem Trunk nicht erlaubt (switchport trunk allowed vlan). Der Frame wird verworfen.`, {grund: "TRUNK_NOT_ALLOWED"});
        return;
      }
    } else {
      if (tag != null) {
        Sim._log(L, "verwerfen", g.id, port, f, `${g.name} ${port} ist ein Access-Port und erwartet ungetaggte Frames. Der Frame mit Tag VLAN ${tag} wird verworfen – hier gehört ein Trunk hin.`, {grund: "DROP_VLAN"});
        return;
      }
      v = +pc.accessVlan || 1;
    }
    if (!vlanDa(g, v)) {
      Sim._log(L, "verwerfen", g.id, port, f, `VLAN ${v} gibt es in der VLAN-Datenbank von ${g.name} nicht (show vlan brief). ${port} ist dafür inaktiv, der Frame wird verworfen.`, {grund: "DROP_VLAN"});
      return;
    }
    if (pc.modus !== "trunk" && pc.portSecurity && !portSec(L, g, port, pc, f)) return;
    lernen(L, g, v, f.eth.src, port, f);
    weiter(L, g, v, port, f);
  }

  /* Native VLAN ungleich: CDP meldet es; Verhalten wie echt (ungetaggt landet im Native VLAN dieser Seite) */
  function nativePruefen(L, g, port, pc, f){
    const k = Modell.kabelAn(L.netz, g.id, port); if (!k) return;
    const gg = L.netz.geraete[k.gegen.geraet];
    if (!gg || gg.typ !== "switch") return;
    const pg = gg.running.ports[k.gegen.port];
    if (!pg || pg.modus !== "trunk" || native(pg) === native(pc)) return;
    const key = "native|" + k.kabel.id; if (L.einmal[key]) return; L.einmal[key] = true;
    Sim._log(L, "info", g.id, port, f, `CDP-Meldung auf ${g.name}: Native VLAN mismatch auf ${port} (${native(pc)}) mit ${gg.name} ${k.gegen.port} (${native(pg)}). Ungetaggte Frames aus VLAN ${native(pg)} landen hier in VLAN ${native(pc)}.`, {grund: "NATIVE_MISMATCH"});
  }

  function portSec(L, g, port, pc, f){
    const ps = pc.portSecurity, mac = String(f.eth.src).toLowerCase();
    const z = Sim._z(L, g.id), gelernt = ((z.portsec ||= {})[port] ||= []);
    const fest = (ps.macs || []).map(m => String(m).toLowerCase());
    if (fest.includes(mac) || gelernt.includes(mac)) return true;
    const max = Math.max(1, +ps.max || 1);
    if (fest.length + gelernt.length < max) { gelernt.push(mac); return true; }
    const art = ps.verstoss || "shutdown";
    let text = `Port-Security auf ${g.name} ${port}: ${mac} ist nicht erlaubt (höchstens ${max} MAC-Adresse${max > 1 ? "n" : ""}). `;
    if (art === "shutdown") {
      (z.errdisabled ||= {})[port] = true; z.portsec[port] = [];
      Modell.macsVergessen(L.netz, g.id, port); Sim._cacheNeu(L);
      text += `Der Switch schaltet den Port ab (err-disabled).`;
    } else text += art === "restrict" ? "Der Frame wird verworfen und der Verstoß gezählt (restrict)." : "Der Frame wird still verworfen (protect).";
    Sim._log(L, "verwerfen", g.id, port, f, text, {grund: "PORTSEC_VIOLATION"});
    return false;
  }

  function lernen(L, g, v, mac, port, f){
    if (istGruppe(mac)) return;
    const t = tab(L, g, v), e = t[mac];
    const neu = !e || e.bis <= L.t, wandert = e && e.bis > L.t && e.port !== port;
    t[mac] = {port, bis: L.t + Sim.T.MAC_ALTER};
    if (neu) Sim._log(L, "lernen", g.id, port, f, `${g.name} lernt: ${mac} ist an ${port} (VLAN ${v}).`);
    else if (wandert) Sim._log(L, "lernen", g.id, port, f, `${g.name} sieht ${mac} jetzt an ${port} statt an ${e.port} und trägt um (VLAN ${v}).`);
  }

  function sviIfc(L, g, v){ return L3().schnittstellen(L, g).find(i => i.svi === v && i.oben && i.ip) || null; }

  function weiter(L, g, v, inPort, f){
    const dst = f.eth.dst, svi = sviIfc(L, g, v);
    if (svi && dst === svi.mac) return anSvi(L, g, svi, f);
    if (istGruppe(dst)) { fluten(L, g, v, inPort, f, false); if (svi) anSvi(L, g, svi, Sim._kopie(f)); return; }
    const e = tab(L, g, v)[dst];
    if (e && e.bis > L.t) {
      if (e.port === inPort) { Sim._log(L, "verwerfen", g.id, inPort, f, `${g.name}: Das Ziel ${dst} liegt am selben Port ${inPort}. Nichts weiterzuleiten.`); return; }
      Sim._log(L, "weiterleiten", g.id, e.port, f, `${g.name} kennt ${dst} an ${e.port} (VLAN ${v}) und leitet den Frame gezielt dorthin.`);
      aus(L, g, e.port, v, f);
      return;
    }
    fluten(L, g, v, inPort, f, true);
  }
  function aus(L, g, p, v, f){
    const pc = g.running.ports[p], c = Sim._kopie(f);
    c.eth.vlan = pc && pc.modus === "trunk" && v !== native(pc) ? v : null;
    return Sim._senden(L, g.id, p, c);
  }
  function fluten(L, g, v, inPort, f, unbekannt){
    const ziele = [], lassen = [];
    for (const x of Sim._adj(L)[g.id] || []) {
      if (x.port === inPort) continue;
      const pc = g.running.ports[x.port]; if (!pc) continue;
      const traegt = pc.modus === "trunk" ? erlaubt(pc, v) : (+pc.accessVlan || 1) === v;
      const oben = !Sim._linkGrund(L, g.id, x.port);
      if (traegt && oben) ziele.push(x.port); else lassen.push({port: x.port, pc, traegt, oben});
    }
    const wohin = ziele.length ? ziele.join(", ") : "keinen weiteren Port";
    const text = unbekannt ? `${g.name} kennt ${f.eth.dst} in VLAN ${v} noch nicht und flutet den Frame an ${wohin}.`
                           : `${g.name} flutet den Broadcast in VLAN ${v} an ${wohin}.`;
    Sim._log(L, "fluten", g.id, inPort, f, text);
    for (const p of ziele) aus(L, g, p, v, f);
    if (!lassen.length) return;
    const gemeint = Sim._gemeint(L, f);
    if (!gemeint.size) return;
    for (const x of lassen) {
      const hinter = Sim._hinter(L, g.id, x.port);
      const wer = [...gemeint].find(id => hinter.has(id)); if (!wer) continue;
      const zn = Sim._name(L, wer);
      if (!x.oben) {
        const lg = Sim._linkGrund(L, g.id, x.port);
        Sim._log(L, "verwerfen", g.id, x.port, f, `${lg.text} Dahinter wäre ${zn} – der Frame kommt dort nicht an.`, {grund: lg.grund});
      } else if (x.pc.modus === "trunk") {
        Sim._log(L, "verwerfen", g.id, x.port, f, `${g.name} schickt VLAN ${v} nicht über den Trunk ${x.port}: Dort ist VLAN ${v} nicht erlaubt. Dahinter wäre ${zn}.`, {grund: "TRUNK_NOT_ALLOWED"});
      } else {
        Sim._log(L, "verwerfen", g.id, x.port, f, `${g.name} ${x.port} gehört zu VLAN ${+x.pc.accessVlan || 1}, der Frame zu VLAN ${v}. VLANs gehen nie ineinander über – ${zn} bekommt ihn nicht.`, {grund: "DROP_VLAN"});
      }
    }
  }

  /* ---- SVI: der Switch als Endgerät in einem VLAN ---- */
  function anSvi(L, g, ifc, f){
    if (f.arp) return L3().arpEmpfangen(L, g, ifc, f);
    if (!f.ip) return;
    const bc = f.ip.dst === "255.255.255.255" || (IP.istBroadcast(f.ip.dst, ifc.maske) && IP.gleichesNetz(f.ip.dst, ifc.ip, ifc.maske));
    if (f.ip.dst !== ifc.ip) {
      if (!bc) Sim._log(L, "verwerfen", g.id, ifc.name, f, `${g.name} routet nicht (Layer-2-Switch) und verwirft das Paket für ${f.ip.dst}.`);
      return;
    }
    if (L3().zustellen(L, g, ifc, f)) return;
    if (f.icmp && f.icmp.typ === "echo-request") return L3().echoAntwort(L, g, ifc, f);
    if (f.tcp && (f.tcp.flags || []).includes("SYN") && !(f.tcp.flags || []).includes("ACK")) {
      Sim._log(L, "verwerfen", g.id, ifc.name, f, `Auf ${g.name} lauscht kein Dienst an TCP-Port ${f.tcp.dst} (Fernzugriff ist in der Simulation nicht nachgebildet).`, {grund: "PORT_CLOSED"});
      const p = Sim._frame({ip: {src: ifc.ip, dst: f.ip.src, ttl: 255, proto: "TCP", id: Sim._neueIpId(L, g.id)}, tcp: {src: f.tcp.dst, dst: f.tcp.src, flags: ["RST", "ACK"], seq: 0, ack: (f.tcp.seq || 0) + 1}});
      L.antwortIds.add(p.ip.id); L.icmpGrund[p.ip.id] = "PORT_CLOSED";
      ipSenden(L, g, p);
      return;
    }
    if (f.udp && !bc) { Sim._log(L, "verwerfen", g.id, ifc.name, f, `Auf ${g.name} lauscht kein Dienst an UDP-Port ${f.udp.dst}.`, {grund: "PORT_CLOSED"}); L3().icmpFehler(L, g, ifc, f, "unreachable", "port", "PORT_CLOSED"); }
  }
  function ausSvi(L, g, ifc, f, text){
    Sim._log(L, "info", g.id, ifc.name, f, text || `${g.name} schickt ${Sim._kurz(f)} aus seiner Verwaltungsschnittstelle ${ifc.name}.`);
    weiter(L, g, ifc.svi, ifc.name, f);
    return true;
  }
  /* Paket vom Switch selbst (Ping aus der Konsole) */
  function ipSenden(L, g, f, opt){
    opt = opt || {};
    const dst = f.ip.dst, ifs = L3().schnittstellen(L, g).filter(i => i.ip);
    const ifc = ifs.find(i => i.oben && IP.gleichesNetz(i.ip, dst, i.maske)) || ifs.find(i => i.oben && i.gw) || ifs.find(i => i.oben) || null;
    const weg = (grund, text) => { Sim._log(L, "verwerfen", g.id, ifc ? ifc.name : null, f, text, {grund}); L3().lokalerFehler(L, g, f, grund, text); return {ok: false, grund, text}; };
    if (!ifc) return weg(ifs.length ? "LINK_DOWN" : "NO_IP", ifs.length ? `Die Verwaltungsschnittstelle von ${g.name} ist nicht aktiv (shutdown oder kein aktiver Port im VLAN).` : `${g.name} hat keine IP-Adresse (interface vlan … / ip address …).`);
    if (!f.ip.src) f.ip.src = ifc.ip;
    if (IP.gleichesNetz(ifc.ip, dst, ifc.maske)) { L3().aufloesen(L, g, ifc, dst, f, {text: opt.text}); return {ok: true}; }
    if (!ifc.gw) return weg("NO_GATEWAY", `${dst} liegt nicht im Netz von ${g.name}, und es ist kein „ip default-gateway“ gesetzt.`);
    if (!IP.gleichesNetz(ifc.ip, ifc.gw, ifc.maske)) return weg("GW_WRONG_SUBNET", `Das Default-Gateway ${ifc.gw} liegt nicht im Netz ${IP.cidr(ifc.ip, ifc.maske)} von ${g.name}.`);
    L3().aufloesen(L, g, ifc, ifc.gw, f, {text: opt.text});
    return {ok: true};
  }

  return {erlaubt, vlanListe, vlanDa, empfangen, weiter, fluten, anSvi, ausSvi, ipSenden, native};
})();
