"use strict";
/* ---------- Simulation: Kern (Architektur § 5, Konzept § 5) ----------
   Ereignisgesteuert auf Frame-Ebene mit virtueller Zeit. Ein Aufruf (Sim.ping, Sim.tcp …) ist ein „Lauf“:
   Er legt eine Ereignis-Warteschlange an, schickt Frames über Kabel (1 ms je Kabel) und schreibt jede
   Entscheidung als Ereignis in die Trace. Die Trace ist reine Daten, die Oberfläche spielt sie nur ab.
   Kein DOM, kein Date.now(), kein Math.random – Zeit ist netz.zustand._uhr (virtuelle Millisekunden).

   Aufteilung:  engine.js   Lauf, Warteschlange, Ereignisse, Kabel, Gründe, gemeinsame Helfer
                l3.js       IP-Stapel für alle Geräte mit Adresse (Schnittstellen, ARP, ICMP-Fehler, Routingtabelle)
                host.js     PC/Server/NAS: Senden, Dienste (TCP/UDP), DHCP-/DNS-Client, DHCP-/DNS-Server
                switch.js   MAC-Lernen, Fluten, VLAN/Trunk, Port-Security, SVI
                router.js   Weiterleiten, ACL, NAT/PAT, DHCP-Server und Relay (auch Basis für Firewall/Internet)
                firewall.js Zonen, Regeln, Zustandstabelle, Quell-NAT, Port-Weiterleitung
                internet.js Kulisse: ISP-Router mit öffentlichen Servern
                aufrufe.js  öffentliche Aufrufe (ping, traceroute, tcp, http, dns, dhcp, adresse, pruefeZiel, erklaere) */
const Sim = {};

Sim.BUDGET = 5000;           /* Ereignisse je Lauf, darüber: Broadcast-Sturm */
Sim.KABEL_MS = 1;            /* virtuelle Laufzeit je Kabel */
Sim.T = {
  MAC_ALTER: 300000,         /* Cisco-Standard: 300 s */
  ARP_HOST: 120000,          /* vereinfacht (Windows: 15–45 s „reachable“, danach „stale“) */
  ARP_IOS: 14400000,         /* IOS: 4 Stunden */
  ARP_WARTEN: 1000,          /* so lange wartet ein Gerät auf eine ARP-Antwort */
  ARP_WIEDERHOLEN: 2000,     /* IOS fragt frühestens nach 2 s erneut */
  LEASE: 86400000,           /* IOS-DHCP-Standard: 1 Tag */
  PING_IOS: 2000, PING_WIN: 4000, PING_ABSTAND_WIN: 1000,
  UNREACH_DROSSEL: 500,      /* IOS: höchstens eine ICMP-Unreachable-Meldung je 500 ms */
  TCP_RTO: 1000, DNS_TIMEOUT: 2000, DHCP_TIMEOUT: 4000,
};
Sim.MAC_NULL = "00:00:00:00:00:00";

/* Gründe (Architektur § 5.3). skill nur aus DATEN.skills, schicht = OSI-Schicht, an der es hakt. */
Sim.GRUENDE = {
  LINK_DOWN:         {titel: "Kein Link",                           skill: "lab.link",    schicht: 1},
  PORT_SHUTDOWN:     {titel: "Schnittstelle abgeschaltet",          skill: "lab.link",    schicht: 1},
  DEVICE_OFF:        {titel: "Gerät ausgeschaltet",                 skill: "lab.link",    schicht: 1},
  NO_IP:             {titel: "Keine IP-Adresse",                    skill: "lab.ip",      schicht: 3},
  ARP_NO_REPLY:      {titel: "Keine ARP-Antwort",                   skill: "lab.arp",     schicht: 2},
  DROP_VLAN:         {titel: "Anderes VLAN",                        skill: "lab.vlan",    schicht: 2},
  TRUNK_NOT_ALLOWED: {titel: "VLAN auf dem Trunk nicht erlaubt",    skill: "lab.trunk",   schicht: 2},
  NATIVE_MISMATCH:   {titel: "Native VLAN ungleich",                skill: "lab.trunk",   schicht: 2},
  PORTSEC_VIOLATION: {titel: "Port-Security-Verstoß",               skill: "lab.portsec", schicht: 2},
  STORM:             {titel: "Broadcast-Sturm",                     skill: "lab.stp",     schicht: 2},
  NO_GATEWAY:        {titel: "Kein Standardgateway",                skill: "lab.gateway", schicht: 3},
  GW_WRONG_SUBNET:   {titel: "Gateway im falschen Netz",            skill: "lab.gateway", schicht: 3},
  GW_UNREACHABLE:    {titel: "Gateway antwortet nicht",             skill: "lab.gateway", schicht: 3},
  WRONG_MASK:        {titel: "Falsche Subnetzmaske",                skill: "lab.netz",    schicht: 3},
  NO_ROUTE:          {titel: "Keine Route",                         skill: "lab.route",   schicht: 3},
  NO_RETURN_ROUTE:   {titel: "Keine Rückroute",                     skill: "lab.route",   schicht: 3},
  TTL_EXPIRED:       {titel: "TTL abgelaufen",                      skill: "lab.ttl",     schicht: 3},
  ACL_DENY:          {titel: "Von ACL verworfen",                   skill: "lab.acl",     schicht: 3},
  NAT_MISSING:       {titel: "NAT fehlt",                           skill: "lab.nat",     schicht: 3},
  DUP_IP:            {titel: "Adresskonflikt",                      skill: "lab.ip",      schicht: 3},
  HOST_UNREACHABLE:  {titel: "Zielhost nicht erreichbar",           skill: "lab.ping",    schicht: 3},
  TIMEOUT:           {titel: "Zeitüberschreitung",                  skill: "lab.ping",    schicht: 3},
  FW_DENY:           {titel: "Firewall-Regel verwirft",             skill: "lab.fw",      schicht: 4},
  PORT_CLOSED:       {titel: "Port geschlossen",                    skill: "lab.ports",   schicht: 4},
  SERVICE_OFF:       {titel: "Dienst ausgeschaltet",                skill: "lab.ports",   schicht: 7},
  DHCP_NO_OFFER:     {titel: "Kein DHCP-Angebot",                   skill: "lab.dhcp",    schicht: 7},
  DHCP_POOL_EMPTY:   {titel: "DHCP-Pool erschöpft",                 skill: "lab.dhcp",    schicht: 7},
  DNS_FAIL:          {titel: "Name nicht auflösbar",                skill: "lab.dns",     schicht: 7},
  DNS_NO_SERVER:     {titel: "Kein DNS-Server erreichbar",          skill: "lab.dns",     schicht: 7},
};

/* ---------- Lauf und Warteschlange ---------- */
Sim._lauf = function(netz, info){
  netz.zustand ||= {_uhr: 0};
  const t0 = +netz.zustand._uhr || 0;
  return {
    netz, info: info || {}, t0, t: t0, q: [], seq: 0, ev: [], abbruch: null, stelle: null,
    ipId: 1, arpWarte: {}, arpAntwort: {}, sockets: [], antwortIds: new Set(), icmpGrund: {}, herkunft: {},
    tcpSrv: {}, cache: {}, einmal: {}, dhcpAngebot: {},
  };
};
Sim._plan = function(L, dt, fn){
  const e = {t: L.t + (dt || 0), s: L.seq++, fn};
  const q = L.q; let i = q.length;
  while (i > 0 && (q[i-1].t > e.t || (q[i-1].t === e.t && q[i-1].s > e.s))) i--;
  q.splice(i, 0, e);
};
/* Warteschlange leerlaufen lassen. bis = optionale Obergrenze der virtuellen Zeit. */
Sim._ablauf = function(L, bis){
  while (L.q.length && !L.abbruch) {
    if (bis != null && L.q[0].t > bis) break;
    const e = L.q.shift();
    if (e.t > L.t) L.t = e.t;
    e.fn();
  }
  if (L.abbruch) L.q.length = 0;
};
/* Zeit vorrücken (Timeout abwarten), ohne Ereignisse zu erzeugen */
Sim._warte = function(L, bisAbs){ Sim._ablauf(L, bisAbs); if (!L.abbruch && bisAbs > L.t) L.t = bisAbs; };

/* ---------- Ereignisse ---------- */
Sim._proto = function(f){
  if (!f) return null;
  if (f.app && f.app.proto) return f.app.proto;
  if (f.arp) return "ARP";
  if (f.ip) return f.ip.proto;
  return null;
};
Sim._log = function(L, art, geraet, port, frame, text, x){
  if (L.abbruch) return null;
  x = x || {};
  if (L.ev.length >= Sim.BUDGET - 1) { Sim._sturm(L, geraet, port, frame); return null; }
  const e = {n: L.ev.length + 1, t: L.t - L.t0, art, geraet: geraet || null, port: port == null ? null : port,
             nach: x.nach ? {geraet: x.nach.geraet, port: x.nach.port} : null,
             frame: frame ? tief(frame) : null, proto: x.proto || Sim._proto(frame), grund: x.grund || null, text: text || ""};
  L.ev.push(e);
  return e;
};
Sim._sturm = function(L, geraet, port, frame){
  const e = {n: L.ev.length + 1, t: L.t - L.t0, art: "verwerfen", geraet: geraet || null, port: port == null ? null : port, nach: null,
             frame: frame ? tief(frame) : null, proto: Sim._proto(frame), grund: "STORM",
             text: `Abbruch nach ${Sim.BUDGET} Ereignissen: Frames kreisen ohne Ende. Das ist ein Broadcast-Sturm – eine Layer-2-Schleife ohne Spanning Tree.`};
  L.ev.push(e); L.abbruch = "STORM"; L.stelle = e.n; L.q.length = 0;
};
/* Trace abschließen (Architektur § 5.2). ok und stelle sind Zusatzfelder für Oberfläche und Hilfe. */
Sim._trace = function(L, ok, zusammenfassung){
  if (L.t > (+L.netz.zustand._uhr || 0)) L.netz.zustand._uhr = L.t;
  const fertigOk = L.abbruch ? false : !!ok;
  const z = (fertigOk ? "✓ " : "✗ ") + String(zusammenfassung || "").replace(/^[✓✗]\s*/, "");
  return {start: L.t0, ende: L.t, ereignisse: L.ev, abbruch: L.abbruch, zusammenfassung: z, ok: fertigOk, stelle: L.stelle};
};

/* ---------- Frames ---------- */
Sim._frame = function(t){
  return {eth: t.eth || null, arp: t.arp || null, ip: t.ip || null, icmp: t.icmp || null, udp: t.udp || null, tcp: t.tcp || null, app: t.app || null};
};
Sim._kopie = f => tief(f);

/* ---------- Kleinigkeiten ---------- */
Sim._z = function(L, id){ const z = L.netz.zustand; return z[id] ||= {}; };
Sim._g = (L, id) => L.netz.geraete[id] || null;
Sim._name = function(L, id){ const g = L.netz.geraete[id]; return g ? g.name : String(id); };
Sim._hash = function(s){ let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
Sim._istHost = g => !!g && (g.typ === "pc" || g.typ === "server" || g.typ === "nas");
Sim._istIos = g => !!g && (g.typ === "router" || g.typ === "switch");
Sim._modul = typ => ({pc: "host", server: "host", nas: "host", switch: "switch", router: "router", firewall: "firewall", internet: "internet"})[typ];
/* "GigabitEthernet0/1" → "Gi0/1", "fa0/5" → "Fa0/5" (Routen aus der Konsole) */
Sim._ifKurz = function(n){
  if (n == null) return n;
  const s = String(n).trim();
  const m = /^(gi|gigabitethernet|fa|fastethernet|eth|ethernet|wan|vlan)\s*([\d/.]+)$/i.exec(s);
  if (!m) return s;
  const k = m[1].toLowerCase();
  const pre = k.startsWith("gi") ? "Gi" : k.startsWith("fa") ? "Fa" : k === "wan" ? "wan" : k === "vlan" ? "Vlan" : k === "eth" && !m[2].includes("/") ? "eth" : "Eth";
  return pre + m[2];
};
Sim._neueIpId = function(L, gid){ const id = L.ipId++; L.herkunft[id] = gid; return id; };
Sim._ephemeral = function(L, gid){ const z = Sim._z(L, gid); const p = z.naechsterPort || 49152; z.naechsterPort = p >= 65000 ? 49152 : p + 1; return p; };
Sim._erster = function(L, von){ for (let i = von; i < L.ev.length; i++) if (L.ev[i].grund) return L.ev[i]; return null; };

/* ---------- Kabel ---------- */
/* Nachbarschaft je Gerät (einmal je Lauf) */
Sim._adj = function(L){
  if (L.cache.adj) return L.cache.adj;
  const a = {};
  for (const k of L.netz.kabel) {
    (a[k.a.geraet] ||= []).push({port: k.a.port, gegen: k.b, kabel: k});
    (a[k.b.geraet] ||= []).push({port: k.b.port, gegen: k.a, kabel: k});
  }
  return (L.cache.adj = a);
};
/* Warum ist dieser Port ohne Link? → {grund, text} */
Sim._linkGrund = function(L, gid, port){
  const netz = L.netz, k = Modell.kabelAn(netz, gid, port);
  if (!k) return {grund: "LINK_DOWN", text: `An ${Sim._name(L, gid)} ${port} steckt kein Kabel.`};
  const l = Modell.linkOben(netz, k.kabel);
  if (l.oben) return null;
  const s = l.seite || k.gegen, wer = `${Sim._name(L, s.geraet)} ${s.port}`;
  const text = {
    PORT_SHUTDOWN: `${wer} ist abgeschaltet (shutdown). Ohne Link geht nichts über diese Leitung.`,
    DEVICE_OFF: `${Sim._name(L, s.geraet)} ist ausgeschaltet. Die Leitung ${Sim._name(L, gid)} ${port} hat keinen Link.`,
    PORTSEC_VIOLATION: `${wer} ist nach einem Port-Security-Verstoß abgeschaltet (err-disabled).`,
  }[l.grund] || `Die Leitung an ${Sim._name(L, gid)} ${port} hat keinen Link.`;
  return {grund: l.grund || "LINK_DOWN", text, seite: s};
};
/* Frame auf ein Kabel legen. Liefert false, wenn der Link fehlt (dann mit Verwerfen-Ereignis). */
Sim._senden = function(L, gid, port, frame, text){
  if (L.abbruch) return false;
  const k = Modell.kabelAn(L.netz, gid, port);
  const unten = Sim._linkGrund(L, gid, port);
  if (unten) {
    Sim._log(L, "verwerfen", gid, port, frame, unten.text, {grund: unten.grund});
    return false;
  }
  const f = Sim._kopie(frame);
  Sim._log(L, "senden", gid, port, f, text || Sim._sendeText(L, gid, port, f, k.gegen), {nach: k.gegen});
  Sim._plan(L, Sim.KABEL_MS, () => Sim._empfangen(L, k.gegen.geraet, k.gegen.port, f));
  return true;
};
Sim._sendeText = function(L, gid, port, f, gegen){
  const zu = `${Sim._name(L, gegen.geraet)}`;
  const tag = f.eth && f.eth.vlan != null ? ` (802.1Q-Tag VLAN ${f.eth.vlan})` : "";
  return `${Sim._name(L, gid)} schickt ${Sim._kurz(f)} über ${port} an ${zu}${tag}.`;
};
/* Kurzbeschreibung eines Frames für Texte */
Sim._kurz = function(f){
  if (!f) return "einen Frame";
  if (f.arp) return f.arp.op === "request" ? `eine ARP-Anfrage „Wer hat ${f.arp.targetIp}?“` : `eine ARP-Antwort „${f.arp.senderIp} ist ${f.arp.senderMac}“`;
  if (f.app && f.app.info) return `„${f.app.info}“`;
  if (f.icmp) return {"echo-request": "einen Echo Request (Ping)", "echo-reply": "einen Echo Reply", unreachable: "ein ICMP „Destination unreachable“", "time-exceeded": "ein ICMP „Time exceeded“"}[f.icmp.typ] || "ein ICMP-Paket";
  if (f.tcp) return `ein TCP-Segment [${(f.tcp.flags || []).join(", ")}] an Port ${f.tcp.dst}`;
  if (f.udp) return `ein UDP-Paket an Port ${f.udp.dst}`;
  return "einen Frame";
};
Sim._empfangen = function(L, gid, port, frame){
  const g = Sim._g(L, gid); if (!g || !g.an || L.abbruch) return;
  const m = Sim[Sim._modul(g.typ)];
  if (m && m.empfangen) m.empfangen(L, g, port, frame);
};

/* ---------- Wissen über das Netz (für Diagnosen und Adressauflösung) ---------- */
/* Alle Geräte, die hinter einem Port liegen – über Kabel und durch Switches hindurch, ohne Rücksicht auf Zustand */
Sim._hinter = function(L, gid, port){
  const key = gid + "|" + port, c = (L.cache.hinter ||= {});
  if (c[key]) return c[key];
  const adj = Sim._adj(L), set = new Set(), gesehen = new Set([gid]);
  const start = (adj[gid] || []).find(x => x.port === port);
  const stapel = start ? [start.gegen.geraet] : [];
  while (stapel.length) {
    const id = stapel.pop(); if (gesehen.has(id)) continue;
    gesehen.add(id); set.add(id);
    const g = L.netz.geraete[id];
    if (g && g.typ === "switch") for (const x of adj[id] || []) if (!gesehen.has(x.gegen.geraet)) stapel.push(x.gegen.geraet);
  }
  return (c[key] = set);
};
/* IP → Geräte, die diese Adresse gerade tragen (statisch, DHCP-Lease, Router, SVI, Firewall, Internet) */
Sim._ipKarte = function(L){
  if (L.cache.ips) return L.cache.ips;
  const m = {};
  for (const g of Object.values(L.netz.geraete)) {
    for (const ifc of Sim.l3.schnittstellen(L, g)) if (ifc.ip) (m[ifc.ip] ||= []).includes(g.id) || m[ifc.ip].push(g.id);
  }
  return (L.cache.ips = m);
};
Sim._besitzerIp = (L, ip) => (Sim._ipKarte(L)[ip] || []).slice();
Sim._macKarte = function(L){
  if (L.cache.macs) return L.cache.macs;
  const m = {};
  for (const g of Object.values(L.netz.geraete)) {
    for (const mac of Object.values(g.hw?.macs || {})) m[mac] = g.id;
    if (g.typ === "switch") m[Sim.l3.sviMac(g)] = g.id;
  }
  return (L.cache.macs = m);
};
Sim._besitzerMac = (L, mac) => Sim._macKarte(L)[mac] || null;
/* Wer ist mit diesem Frame gemeint? (nur für die Diagnose: an welchem Port „verpasst“ ein Switch das Ziel) */
Sim._gemeint = function(L, f){
  const s = new Set();
  if (f.arp && f.arp.op === "request") { for (const id of Sim._besitzerIp(L, f.arp.targetIp)) s.add(id); return s; }
  if (f.udp && f.udp.dst === 67 && f.eth && f.eth.dst === IP.MAC_BROADCAST) { for (const id of Sim.l3.dhcpAnbieter(L)) s.add(id); return s; }
  if (f.eth && f.eth.dst !== IP.MAC_BROADCAST) { const id = Sim._besitzerMac(L, f.eth.dst); if (id) s.add(id); }
  return s;
};
Sim._cacheNeu = function(L){ delete L.cache.ips; delete L.cache.ifs; delete L.cache.rt; };
