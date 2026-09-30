"use strict";
/* ---------- Simulation: Internet (Kulisse) ----------
   Ein Provider-Router mit wan-Schnittstellen, statischen Routen (zurück zu öffentlichen Kundennetzen) und
   virtuellen Servern (running.server[] mit dienste). Die Server stehen „hinter“ dem Provider-Router
   (eine Station weiter: Antwort-TTL 63) und beantworten Ping, HTTP/HTTPS und DNS für die Namen in server[].
   Pakete mit privater Quelladresse verwirft das Internet (NAT_MISSING). Unbekannte öffentliche Ziele meldet
   der Provider-Router mit „Destination host unreachable“ (HOST_UNREACHABLE). */
Sim.internet = (() => {
  const L3 = () => Sim.l3;
  const server = g => (g.running.server || []).filter(s => IP.gueltig(s.ip));
  const TTL_SERVER = 63;
  const DIENST_TCP = {80: "http", 443: "https"};

  function antwort(L, g, sv, f, teile){
    const p = Sim._frame(Object.assign({ip: {src: sv.ip, dst: f.ip.src, ttl: TTL_SERVER, proto: teile.tcp ? "TCP" : teile.udp ? "UDP" : "ICMP", id: Sim._neueIpId(L, g.id)}}, teile));
    L.antwortIds.add(p.ip.id);
    L3().senden(L, g, p);
    return p;
  }
  function bedienen(L, g, ifc, sv, f){
    const wer = `${sv.name} (${sv.ip})`, dienste = sv.dienste || [];
    if (f.icmp) {
      if (f.icmp.typ !== "echo-request") return;
      Sim._log(L, "antworten", g.id, ifc.port, f, `${wer} im Internet erhält den Echo Request und antwortet.`);
      antwort(L, g, sv, f, {icmp: {typ: "echo-reply", code: null, seq: f.icmp.seq, id: f.icmp.id}});
      return;
    }
    if (f.udp) {
      if (f.udp.dst === 53 && dienste.includes("dns")) {
        const eintraege = [];
        for (const s of server(g)) eintraege.push({name: s.name, ip: s.ip});
        const ersatz = Object.assign({}, g, {name: wer});
        return Sim.host.dnsAntwort(L, ersatz, ifc, Object.assign(Sim._kopie(f)), eintraege);
      }
      Sim._log(L, "verwerfen", g.id, ifc.port, f, `Auf ${wer} lauscht kein Dienst an UDP-Port ${f.udp.dst}.`, {grund: "PORT_CLOSED"});
      const orig = {src: f.ip.src, dst: f.ip.dst, proto: "UDP", id: f.ip.id, icmpId: null, seq: null, sport: f.udp.src, dport: f.udp.dst};
      const p = antwort(L, g, sv, f, {icmp: {typ: "unreachable", code: "port", seq: null, id: null, orig}});
      L.icmpGrund[p.ip.id] = "PORT_CLOSED";
      return;
    }
    if (!f.tcp) return;
    const t = f.tcp, fl = t.flags || [], key = ["inet", sv.ip, f.ip.src, t.src, t.dst].join("|");
    const s = L.tcpSrv[key], dienst = DIENST_TCP[t.dst];
    const seg = (flags, seq, ack, app) => antwort(L, g, sv, f, {tcp: {src: t.dst, dst: t.src, flags, seq, ack}, app: app || null});
    if (fl.includes("RST")) { delete L.tcpSrv[key]; return; }
    if (fl.includes("SYN") && !fl.includes("ACK")) {
      if (!dienst || !dienste.includes(dienst)) {
        Sim._log(L, "verwerfen", g.id, ifc.port, f, `${wer} bietet an TCP-Port ${t.dst} keinen Dienst an und antwortet mit RST.`, {grund: "PORT_CLOSED"});
        const p = seg(["RST", "ACK"], 0, (t.seq || 0) + 1); L.icmpGrund[p.ip.id] = "PORT_CLOSED";
        return;
      }
      L.tcpSrv[key] = {zustand: "syn-empfangen", seq: 7000};
      Sim._log(L, "antworten", g.id, ifc.port, f, `${wer} nimmt die Verbindung an Port ${t.dst} an (SYN/ACK).`);
      seg(["SYN", "ACK"], 7000, (t.seq || 0) + 1);
      return;
    }
    if (!s) { seg(["RST", "ACK"], 0, (t.seq || 0) + 1); return; }
    if (fl.includes("FIN")) { delete L.tcpSrv[key]; Sim._log(L, "antworten", g.id, ifc.port, f, `${wer} bestätigt den Verbindungsabbau (FIN/ACK).`); seg(["FIN", "ACK"], s.seq + 2, (t.seq || 0) + 1); return; }
    if (f.app && f.app.proto === "HTTP") {
      const https = t.dst === 443;
      Sim._log(L, "antworten", g.id, ifc.port, f, `${wer} liefert die Seite aus (${https ? "HTTPS, TLS vereinfacht" : "HTTP"}): 200 OK.`);
      seg(["PSH", "ACK"], s.seq + 1, (t.seq || 0) + 1, {proto: "HTTP", info: https ? "HTTPS: 200 OK (TLS vereinfacht)" : "HTTP/1.1 200 OK", felder: {status: 200, host: sv.name}});
      return;
    }
    if (fl.includes("ACK") && s.zustand === "syn-empfangen") { s.zustand = "offen"; Sim._log(L, "empfangen", g.id, ifc.port, f, `${wer}: Die TCP-Verbindung steht.`); }
  }

  const haken = {
    eingang(L, g, ifc, f){
      const s = f.ip.src;
      if (IP.privat(s) || IP.apipa(s) || IP.loopback(s)) {
        Sim._log(L, "verwerfen", g.id, ifc.port, f, `Das Internet verwirft das Paket: Die Quelladresse ${s} ist privat und wird im Internet nicht geroutet. NAT fehlt – oder inside/outside ist vertauscht.`, {grund: "NAT_MISSING"});
        return false;
      }
      return true;
    },
    virtuell(L, g, ifc, f){
      const sv = server(g).find(s => s.ip === f.ip.dst);
      if (!sv) return false;
      if (f.ip.ttl <= 1) return false;          /* Traceroute: der Provider-Router meldet „Time exceeded“ */
      bedienen(L, g, ifc, sv, f);
      return true;
    },
    keineRoute(L, g, ifc, f){
      const dst = f.ip.dst;
      if (L.antwortIds.has(f.ip.id) || IP.privat(dst)) return Sim.router.keineRoute(L, g, ifc, f);
      Sim._log(L, "verwerfen", g.id, ifc.port, f, `Im Internet gibt es unter ${dst} kein erreichbares Ziel. Der Provider-Router meldet „Destination host unreachable“.`, {grund: "HOST_UNREACHABLE"});
      L3().icmpFehler(L, g, ifc, f, "unreachable", "host", "HOST_UNREACHABLE");
    },
  };
  function empfangen(L, g, port, f){ return Sim.router.empfangen(L, g, port, f); }
  /* DNS-Namen der Kulisse (für die Namensauflösung ohne eigenen DNS-Server nicht benutzt – nur Anzeige) */
  const namen = g => server(g).map(s => ({name: s.name, ip: s.ip}));
  return {empfangen, haken, namen, server};
})();
