"use strict";
/* ---------- Simulation: PC, Server, NAS ----------
   Senden (eigenes Netz oder Gateway? – die Maske entscheidet), Empfangen, ICMP Echo, Dienste nach
   Modell.DIENSTPORTS (TCP-Handshake, RST bei geschlossenem Port, UDP mit ICMP Port Unreachable),
   DHCP- und DNS-Server als Dienst. Die Client-Seite (Ping, DHCP-Client, DNS-Client …) steht in aufrufe.js. */
Sim.host = (() => {
  const L3 = () => Sim.l3;

  function ifWahl(L, g, dst){
    const ifs = L3().schnittstellen(L, g);
    return ifs.find(i => i.ip && IP.gleichesNetz(i.ip, dst, i.maske) && i.oben)
        || ifs.find(i => i.ip && i.gw && i.oben)
        || ifs.find(i => i.ip && i.oben)
        || ifs.find(i => i.ip) || ifs.find(i => i.oben) || ifs[0] || null;
  }
  function fehler(L, g, port, f, grund, text){
    Sim._log(L, "verwerfen", g.id, port, f, text, {grund});
    L3().lokalerFehler(L, g, f, grund, text);
    return {ok: false, grund, text};
  }
  /* Paket vom Host aus senden. opt.ifc erzwingt die Schnittstelle. → {ok} oder {ok:false, grund, text} */
  function ipSenden(L, g, f, opt){
    opt = opt || {};
    const dst = f.ip.dst, ifc = opt.ifc || ifWahl(L, g, dst);
    if (!g.an) return {ok: false, grund: "DEVICE_OFF", text: `${g.name} ist ausgeschaltet.`};
    if (!ifc) return fehler(L, g, null, f, "NO_IP", `${g.name} hat keine Netzwerkschnittstelle mit Adresse.`);
    const c = g.running.if[ifc.port] || {};
    if (!ifc.oben) {
      if (c.an === false) return fehler(L, g, ifc.port, f, "PORT_SHUTDOWN", `Die Netzwerkkarte ${ifc.port} von ${g.name} ist deaktiviert.`);
      const lg = Sim._linkGrund(L, g.id, ifc.port) || {grund: "LINK_DOWN", text: `${g.name} ${ifc.port} hat keinen Link.`};
      return fehler(L, g, ifc.port, f, lg.grund, lg.text + ` ${g.name} kann nichts senden („Medium getrennt“).`);
    }
    const bc = dst === "255.255.255.255" || (ifc.ip && IP.istBroadcast(dst, ifc.maske) && IP.gleichesNetz(dst, ifc.ip, ifc.maske));
    if (bc) { if (!f.ip.src) f.ip.src = ifc.ip || "0.0.0.0"; return {ok: L3().raus(L, g, ifc, IP.MAC_BROADCAST, f, opt.text)}; }
    if (!ifc.ip) {
      const text = ifc.dhcp ? `${g.name} soll die Adresse per DHCP bekommen, hat aber noch keine. Ohne IP-Adresse kann es nichts senden.`
                            : ifc.fehlerhaft ? `${g.name} hat keine gültige IP-Adresse/Maske eingetragen und kann nichts senden.`
                            : `${g.name} hat keine IP-Adresse und kann nichts senden.`;
      return fehler(L, g, ifc.port, f, "NO_IP", text);
    }
    if (!f.ip.src) f.ip.src = ifc.ip;
    const netzText = IP.cidr(ifc.ip, ifc.maske);
    if (IP.gleichesNetz(ifc.ip, dst, ifc.maske)) {
      const diagnose = () => {
        const ref = L3().segmentMaske(L, g, ifc);
        if (ref && ref !== ifc.maske && !IP.gleichesNetz(ifc.ip, dst, ref))
          return {grund: "WRONG_MASK", text: `${g.name} hält ${dst} wegen seiner Maske ${ifc.maske} für einen Nachbarn und fragt per ARP. Im Netz gilt aber ${ref} (/${IP.praefix(ref)}): ${dst} liegt hinter dem Router und antwortet nie auf diese ARP-Anfrage.`};
        return {grund: "ARP_NO_REPLY", text: `${g.name} bekommt keine ARP-Antwort für ${dst}. Im eigenen Netz ${netzText} meldet sich niemand mit dieser Adresse.`};
      };
      L3().aufloesen(L, g, ifc, dst, f, {diagnose, text: opt.text});
      return {ok: true};
    }
    const ref = L3().segmentMaske(L, g, ifc);
    const maskeFalsch = ref && ref !== ifc.maske;
    if (!ifc.gw) {
      if (maskeFalsch && IP.gleichesNetz(ifc.ip, dst, ref))
        return fehler(L, g, ifc.port, f, "WRONG_MASK", `${g.name} hält ${dst} wegen seiner Maske ${ifc.maske} für fremd und sucht ein Gateway. Im Netz gilt aber ${ref} (/${IP.praefix(ref)}) – das Ziel wäre direkt erreichbar.`);
      return fehler(L, g, ifc.port, f, "NO_GATEWAY", `${dst} liegt nicht im eigenen Netz ${netzText}, und ${g.name} hat kein Standardgateway. Es weiß nicht, wohin mit dem Paket.`);
    }
    if (!IP.gleichesNetz(ifc.ip, ifc.gw, ifc.maske)) {
      if (maskeFalsch && IP.gleichesNetz(ifc.ip, ifc.gw, ref))
        return fehler(L, g, ifc.port, f, "WRONG_MASK", `Mit der Maske ${ifc.maske} liegt das Gateway ${ifc.gw} für ${g.name} scheinbar außerhalb des eigenen Netzes. Im Netz gilt aber ${ref} (/${IP.praefix(ref)}) – die Maske von ${g.name} ist falsch.`);
      return fehler(L, g, ifc.port, f, "GW_WRONG_SUBNET", `Das Gateway ${ifc.gw} liegt nicht im eigenen Netz ${netzText}. ${g.name} kann es nicht direkt erreichen und verwirft das Paket.`);
    }
    const gw = ifc.gw;
    L3().aufloesen(L, g, ifc, gw, f, {text: opt.text, diagnose: () => ({grund: "GW_UNREACHABLE",
      text: `${g.name} bekommt keine ARP-Antwort von seinem Gateway ${gw}. Das Gateway ist nicht erreichbar – falsche Adresse, Router-Schnittstelle aus oder anderes VLAN?`})});
    return {ok: true};
  }

  function empfangen(L, g, port, f){
    const ifc = L3().schnittstellen(L, g).find(i => i.port === port);
    if (!ifc || !f.eth) return;
    if (f.eth.vlan != null) { Sim._log(L, "verwerfen", g.id, port, f, `${g.name} erwartet ungetaggte Frames und verwirft den Frame mit 802.1Q-Tag (VLAN ${f.eth.vlan}).`); return; }
    if (f.eth.dst !== ifc.mac && f.eth.dst !== IP.MAC_BROADCAST) { Sim._log(L, "verwerfen", g.id, port, f, `Der Frame ist an ${f.eth.dst} adressiert, nicht an ${g.name}. Die Netzwerkkarte verwirft ihn.`); return; }
    if (f.arp) return L3().arpEmpfangen(L, g, ifc, f);
    if (!f.ip) return;
    const ip = f.ip;
    const anMich = !!ifc.ip && ip.dst === ifc.ip;
    const bc = ip.dst === "255.255.255.255" || (!!ifc.ip && IP.istBroadcast(ip.dst, ifc.maske) && IP.gleichesNetz(ip.dst, ifc.ip, ifc.maske));
    const dhcpAnMich = f.udp && f.udp.dst === 68 && f.eth.dst === ifc.mac;
    if (!anMich && !bc && !dhcpAnMich) {
      if (f.eth.dst === ifc.mac)
        Sim._log(L, "verwerfen", g.id, port, f, `${g.name} ist kein Router: Das Paket für ${ip.dst} kam an seine MAC-Adresse, wird aber nicht weitergeleitet. Beim Absender ist wohl ${g.name} als Gateway eingetragen.`, {grund: "GW_UNREACHABLE"});
      else Sim._log(L, "verwerfen", g.id, port, f, `Das Paket ist für ${ip.dst}, nicht für ${g.name}.`);
      return;
    }
    lokal(L, g, ifc, f, bc);
  }

  function lokal(L, g, ifc, f, bc){
    if (L3().zustellen(L, g, ifc, f)) return;
    if (f.icmp) {
      if (f.icmp.typ === "echo-request") {
        if (bc) { Sim._log(L, "verwerfen", g.id, ifc.port, f, `${g.name} beantwortet keine Pings an eine Broadcast-Adresse.`); return; }
        return L3().echoAntwort(L, g, ifc, f);
      }
      Sim._log(L, "empfangen", g.id, ifc.port, f, `${g.name} erhält ${Sim._kurz(f)} von ${f.ip.src}, erwartet aber nichts dergleichen.`);
      return;
    }
    if (f.udp) return udp(L, g, ifc, f, bc);
    if (f.tcp && !bc) return tcp(L, g, ifc, f);
  }

  /* Dienst zu Port: {name, an, key} oder null (kein solcher Dienst auf diesem Gerät bekannt) */
  function dienst(g, proto, port){
    const d = g.running.dienste || {};
    for (const [key, def] of Object.entries(Modell.DIENSTPORTS)) {
      if (def.proto === proto && def.port === port && d[key]) return {key, name: def.name, an: !!d[key].an};
    }
    return null;
  }
  function geschlossen(L, g, ifc, f, proto, port){
    const d = dienst(g, proto, port);
    const grund = d ? "SERVICE_OFF" : "PORT_CLOSED";
    const text = d ? `Auf ${g.name} ist der Dienst „${d.name}“ ausgeschaltet: An ${proto.toUpperCase()}-Port ${port} lauscht niemand.`
                   : `Auf ${g.name} lauscht kein Dienst an ${proto.toUpperCase()}-Port ${port}.`;
    Sim._log(L, "verwerfen", g.id, ifc.port || ifc.name, f, text, {grund});
    return grund;
  }

  function udp(L, g, ifc, f, bc){
    const u = f.udp, d = g.running.dienste || {};
    if (u.dst === 67) {
      if (d.dhcp && d.dhcp.an) return dhcpServer(L, g, ifc, f, poolsVonHost(g));
      if (bc) { Sim._log(L, "verwerfen", g.id, ifc.port, f, `${g.name} ist kein DHCP-Server und ignoriert den ${f.app ? f.app.info : "DHCP-Broadcast"}.`); return; }
    }
    if (u.dst === 53 && d.dns && d.dns.an && !bc) return dnsAntwort(L, g, ifc, f, d.dns.eintraege || []);
    if (u.dst === 68) { Sim._log(L, "verwerfen", g.id, ifc.port, f, `${g.name} erwartet gerade keine DHCP-Antwort.`); return; }
    if (bc) { Sim._log(L, "verwerfen", g.id, ifc.port, f, `${g.name} ignoriert den UDP-Broadcast an Port ${u.dst}.`); return; }
    if (u.dst >= 33434 && u.dst < 33700) {
      Sim._log(L, "antworten", g.id, ifc.port, f, `${g.name} ist das Ziel der Traceroute-Probe und antwortet mit „Port unreachable“ – so erkennt traceroute das Ende.`);
      L3().icmpFehler(L, g, ifc, f, "unreachable", "port", null);
      return;
    }
    const grund = geschlossen(L, g, ifc, f, "udp", u.dst);
    L3().icmpFehler(L, g, ifc, f, "unreachable", "port", grund);
  }

  /* ---- TCP (Server-Seite) ---- */
  function segment(L, g, f, flags, seq, ack, app){
    const t = f.tcp;
    const p = Sim._frame({ip: {src: f.ip.dst, dst: f.ip.src, ttl: L3().ttlStart(g), proto: "TCP", id: Sim._neueIpId(L, g.id)},
                          tcp: {src: t.dst, dst: t.src, flags, seq, ack}, app: app || null});
    L.antwortIds.add(p.ip.id);
    return p;
  }
  function rst(L, g, f, grund){
    const p = segment(L, g, f, ["RST", "ACK"], 0, (f.tcp.seq || 0) + 1);
    L.icmpGrund[p.ip.id] = grund || null;
    L3().senden(L, g, p);
  }
  function tcp(L, g, ifc, f){
    const t = f.tcp, fl = t.flags || [], key = [g.id, f.ip.src, t.src, t.dst].join("|");
    const s = L.tcpSrv[key];
    if (fl.includes("RST")) { delete L.tcpSrv[key]; Sim._log(L, "empfangen", g.id, ifc.port, f, `${g.name} erhält ein RST: Die Verbindung ist abgebrochen.`); return; }
    if (fl.includes("SYN") && !fl.includes("ACK")) {
      const d = dienst(g, "tcp", t.dst);
      if (!d || !d.an) { const grund = geschlossen(L, g, ifc, f, "tcp", t.dst); rst(L, g, f, grund); return; }
      L.tcpSrv[key] = {zustand: "syn-empfangen", seq: 5000, dienst: d};
      Sim._log(L, "antworten", g.id, ifc.port, f, `${g.name} (${d.name}) nimmt den Verbindungswunsch an Port ${t.dst} an und antwortet mit SYN/ACK.`);
      L3().senden(L, g, segment(L, g, f, ["SYN", "ACK"], 5000, (t.seq || 0) + 1));
      return;
    }
    if (!s) { Sim._log(L, "verwerfen", g.id, ifc.port, f, `${g.name} kennt keine Verbindung dazu und antwortet mit RST.`); rst(L, g, f, null); return; }
    if (fl.includes("FIN")) {
      delete L.tcpSrv[key];
      Sim._log(L, "antworten", g.id, ifc.port, f, `${g.name} bestätigt den Verbindungsabbau (FIN/ACK).`);
      L3().senden(L, g, segment(L, g, f, ["FIN", "ACK"], s.seq + 1, (t.seq || 0) + 1));
      return;
    }
    if (f.app && f.app.proto === "HTTP") {
      const https = t.dst === 443;
      Sim._log(L, "antworten", g.id, ifc.port, f, `${g.name} liefert die Seite aus: ${https ? "HTTPS (TLS vereinfacht)" : "HTTP"} 200 OK.`);
      const app = {proto: "HTTP", info: https ? "HTTPS: 200 OK (TLS vereinfacht)" : "HTTP/1.1 200 OK", felder: {status: 200, host: (f.app.felder || {}).host || ""}};
      s.seq += 1;
      L3().senden(L, g, segment(L, g, f, ["PSH", "ACK"], s.seq, (t.seq || 0) + 1, app));
      return;
    }
    if (fl.includes("ACK")) {
      if (s.zustand === "syn-empfangen") { s.zustand = "offen"; Sim._log(L, "empfangen", g.id, ifc.port, f, `${g.name}: Die TCP-Verbindung steht (Drei-Wege-Handshake fertig).`); }
      return;
    }
  }

  /* ---- DHCP-Server (auch vom Router benutzt) ----
     Ein Pool hat für Router UND Host dieselbe Form (Architektur § 10.1). Fehlende Felder werden defensiv gelesen,
     damit alte Spielstände weiterlaufen:
       anzahl    fehlend → ganzes Subnetz (bis Broadcast−1); gesetzt → so viele Adressen ab start
       start     fehlend → Netz+1
       leaseS    fehlend/0 → Sim.T.LEASE
       domain    fehlend → "" (Option 15 wird dann nicht gesendet)
     Ergebnis: {name, netz, maske, gw, dns, domain, leaseS, von, bis, aus:[{von,bis}], reservierungen:[{mac,ip,name}]} */
  function poolForm(p, aus){
    const netz = IP.netz(p.netz, p.maske);
    const von = IP.gueltig(p.start) ? p.start : IP.plus(netz, 1);
    const bisMax = IP.plus(IP.broadcast(p.netz, p.maske), -1);
    const gesetzt = p.anzahl != null && p.anzahl !== "";
    const roh = gesetzt ? Math.max(0, +p.anzahl || 0) : null;
    const bis = roh == null ? bisMax : (IP.vergleich(IP.plus(von, roh - 1), bisMax) > 0 ? bisMax : IP.plus(von, roh - 1));
    const leaseS = +p.leaseS > 0 ? Math.round(+p.leaseS) : Sim.T.LEASE / 1000;
    const res = (Array.isArray(p.reservierungen) ? p.reservierungen : [])
      .filter(r => r && IP.gueltig(r.ip)).map(r => ({mac: String(r.mac == null ? "" : r.mac).toLowerCase(), ip: r.ip, name: r.name || ""}));
    return {name: p.name || "Pool", netz, maske: p.maske, gw: p.gw || "", dns: p.dns || "", domain: p.domain || "",
            leaseS, von, bis, aus: aus || [], reservierungen: res};
  }
  /* Ist der DHCP-Dienst dieses Geräts an? Router: fehlendes `an` = an (IOS-Vorgabe). Host: nur wenn eingeschaltet. */
  function dhcpAn(g){
    if (g.typ === "router") { const d = g.running.dhcp || {}; return d.an !== false; }
    const d = (g.running.dienste && g.running.dienste.dhcp) || {};
    return !!d.an;
  }
  /* Gerätename zu einer MAC – für die Lease-Tabelle (Architektur § 10.2, Feld `hostname`). */
  function nameZuMac(L, mac){
    const m = String(mac == null ? "" : mac).toLowerCase();
    if (!m) return "";
    for (const g of Object.values(L.netz.geraete || {})) {
      for (const x of Object.values((g.hw && g.hw.macs) || {})) {
        if (String(x).toLowerCase() === m) return String((g.running && g.running.hostname) || g.name || "");
      }
    }
    return "";
  }
  /* Ausschlussbereiche eines Geräts – Router führen sie in `dhcp.ausgeschlossen`, Hosts ebenso (ab D1). */
  function ausschluesse(d){
    return ((d && d.ausgeschlossen) || []).filter(a => a && IP.gueltig(a.von))
      .map(a => ({von: a.von, bis: IP.gueltig(a.bis) ? a.bis : a.von}));
  }
  function poolsVonHost(g){
    const d = g.running.dienste.dhcp || {};
    const aus = ausschluesse(d);
    return (d.pools || []).filter(p => IP.gueltig(p.netz) && IP.maskeGueltig(p.maske)).map(p => poolForm(p, aus));
  }
  function belegt(L, ip){ return Sim._besitzerIp(L, ip).length > 0; }
  function freieAdresse(L, g, pool, mac){
    const z = Sim._z(L, g.id), leases = (z.leases ||= {});
    for (const [ip, l] of Object.entries(leases)) if (l.mac === mac && l.bis > L.t && IP.imNetz(ip, pool.netz, pool.maske)) return ip;
    const angeboten = new Set(Object.entries(L.dhcpAngebot).filter(([k]) => k.startsWith(g.id + "|") && !k.endsWith("|" + mac)).map(([, v]) => v));
    for (let n = IP.zuZahl(pool.von), ende = IP.zuZahl(pool.bis); n <= ende; n++) {
      const ip = IP.zuText(n >>> 0);
      if (!IP.hostAdresse(ip, pool.maske)) continue;
      if (pool.aus.some(a => IP.vergleich(ip, a.von) >= 0 && IP.vergleich(ip, a.bis) <= 0)) continue;
      if (ip === pool.gw || angeboten.has(ip)) continue;
      const l = leases[ip]; if (l && l.mac !== mac && l.bis > L.t) continue;
      if (belegt(L, ip)) continue;           /* vereinfacht: ersetzt die Konfliktprüfung (IOS pingt vor dem Angebot) */
      return ip;
    }
    return null;
  }
  function dhcpServer(L, g, ifc, f, pools){
    const a = (f.app && f.app.felder) || {}, wo = ifc.port || ifc.name;
    const relay = a.relay && a.relay !== "0.0.0.0" ? a.relay : null;
    const bezug = relay || ifc.ip;
    const pool = bezug && pools.find(p => IP.imNetz(bezug, p.netz, p.maske));
    if (!pool) { Sim._log(L, "verwerfen", g.id, wo, f, `${g.name} hat keinen DHCP-Pool für das Netz von ${bezug || "?"} und antwortet nicht.`); return; }
    const serverId = ifc.ip;
    const z = Sim._z(L, g.id), leases = (z.leases ||= {});
    let typ, ip;
    if (a.typ === "discover") {
      ip = freieAdresse(L, g, pool, a.clientMac);
      if (!ip) { Sim._log(L, "verwerfen", g.id, wo, f, `Der Pool „${pool.name}“ auf ${g.name} ist erschöpft: Für ${a.clientMac} ist keine Adresse mehr frei. Es kommt kein Angebot.`, {grund: "DHCP_POOL_EMPTY"}); return; }
      L.dhcpAngebot[g.id + "|" + a.clientMac] = ip; typ = "offer";
      Sim._log(L, "antworten", g.id, wo, f, `${g.name} bietet ${a.clientMac} die Adresse ${ip} aus dem Pool „${pool.name}“ an (DHCP Offer).`);
    } else if (a.typ === "request") {
      if (a.server && a.server !== serverId) { delete L.dhcpAngebot[g.id + "|" + a.clientMac]; Sim._log(L, "verwerfen", g.id, wo, f, `Der Client hat sich für einen anderen DHCP-Server entschieden.`); return; }
      ip = a.gewuenscht;
      const l = leases[ip];
      const ok = ip && IP.imNetz(ip, pool.netz, pool.maske) && (!l || l.mac === a.clientMac || l.bis <= L.t);
      typ = ok ? "ack" : "nak";
      if (ok) {
        const dauer = pool.leaseS * 1000, bis = L.t + dauer;
        const alt = l && l.mac === a.clientMac ? l : null;
        leases[ip] = {mac: a.clientMac, bis, t1: bis - Math.round(dauer / 2), t2: bis - Math.round(dauer / 8),
                      hostname: alt && alt.hostname ? alt.hostname : nameZuMac(L, a.clientMac),
                      konflikt: alt ? !!alt.konflikt : false, konfliktSeit: alt && alt.konfliktSeit != null ? alt.konfliktSeit : null};
        delete L.dhcpAngebot[g.id + "|" + a.clientMac];
      }
      Sim._log(L, "antworten", g.id, wo, f, ok ? `${g.name} bestätigt: ${ip} gehört jetzt ${a.clientMac} (DHCP Ack, ${pool.leaseS === 86400 ? "Lease 1 Tag" : `Lease ${Math.round(pool.leaseS / 3600)} h`}).` : `${g.name} lehnt die gewünschte Adresse ${ip} ab (DHCP Nak).`);
    } else return;
    const felder = {typ, xid: a.xid, clientMac: a.clientMac, angeboten: typ === "nak" ? "0.0.0.0" : ip, relay: relay || "0.0.0.0", server: serverId,
                    maske: pool.maske, gateway: pool.gw || "", dns: pool.dns || "", leaseS: pool.leaseS, domain: pool.domain || ""};
    const info = {offer: "DHCP Offer", ack: "DHCP Ack", nak: "DHCP Nak"}[typ];
    const app = {proto: "DHCP", info: `${info}${typ !== "nak" ? " " + ip : ""}`, felder};
    if (relay) {
      const p = Sim._frame({ip: {src: serverId, dst: relay, ttl: L3().ttlStart(g), proto: "UDP", id: Sim._neueIpId(L, g.id)}, udp: {src: 67, dst: 67}, app});
      L.antwortIds.add(p.ip.id);
      L3().senden(L, g, p);
    } else {
      const p = Sim._frame({ip: {src: serverId, dst: typ === "nak" ? "255.255.255.255" : ip, ttl: L3().ttlStart(g), proto: "UDP", id: Sim._neueIpId(L, g.id)}, udp: {src: 67, dst: 68}, app});
      L.antwortIds.add(p.ip.id);
      L3().raus(L, g, ifc, typ === "nak" ? IP.MAC_BROADCAST : a.clientMac, p);
    }
  }

  /* ---- DNS-Server (auch das Internet benutzt ihn) ---- */
  function dnsAntwort(L, g, ifc, f, eintraege){
    const name = String(((f.app && f.app.felder) || {}).name || "").toLowerCase().replace(/\.$/, "");
    const e = eintraege.find(x => String(x.name).toLowerCase().replace(/\.$/, "") === name);
    const app = {proto: "DNS", info: e ? `DNS-Antwort: ${name} → ${e.ip}` : `DNS-Antwort: ${name} unbekannt (NXDOMAIN)`,
                 felder: {name, ip: e ? e.ip : null, rcode: e ? "NOERROR" : "NXDOMAIN"}};
    const p = Sim._frame({ip: {src: f.ip.dst, dst: f.ip.src, ttl: L3().ttlStart(g), proto: "UDP", id: Sim._neueIpId(L, g.id)}, udp: {src: 53, dst: f.udp.src}, app});
    L.antwortIds.add(p.ip.id);
    Sim._log(L, "antworten", g.id, ifc.port || ifc.name, f, e ? `${g.name} kennt ${name} und antwortet: ${e.ip}.` : `${g.name} hat keinen Eintrag für ${name} und antwortet „NXDOMAIN“.`);
    L3().senden(L, g, p);
  }

  return {ifWahl, ipSenden, empfangen, lokal, dienst, dhcpServer, poolsVonHost, freieAdresse, dnsAntwort, poolForm, dhcpAn, ausschluesse, nameZuMac};
})();
