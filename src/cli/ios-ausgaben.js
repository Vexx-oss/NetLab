"use strict";
/* ---------- Konsole: Ausgaben (show, running-config, ping, traceroute) ----------
   CLI.zeige.*            show-Ausgaben (Sitzung → Text)
   CLI.runningConfig(g)   running-config als Text (ab „!“ bis „end“), CLI.konfigText(g, konfig) für jede Konfig
   CLI.ifStatus(netz, g, name) → {status:"up"|"down"|"administratively down", protokoll, kurz}
   CLI.statusMeldungen(g, name, vor, nach) → Syslog-Zeilen (%LINK-…, %LINEPROTO-…)
   CLI.iosPing / CLI.iosTraceroute → formatieren Sim.ping / Sim.traceroute wie IOS
   CLI.regelText(regel, standard, "show"|"conf")
   Formate nach IOS 15 (1900er-Router, Catalyst 2960). Zähler (Pakete, Fehler) sind nicht nachgebaut und fehlen. */
(() => {
  const C = CLI, h = C.h, Z = C.zeige = {};
  const G = s => h.geraet(s), K = s => h.konfig(s);
  const links = h.links, rechts = h.rechts;
  const zustand = (netz, id) => (netz.zustand && netz.zustand[id]) || {};
  const uhr = netz => (netz.zustand && netz.zustand._uhr) || 0;
  const pad = (n, l = 2) => String(n).padStart(l, "0");

  /* ---------- Schnittstellen ---------- */
  h.trunkTraegt = (pk, v) => pk.trunkErlaubt === "all" || (Array.isArray(pk.trunkErlaubt) && pk.trunkErlaubt.map(Number).includes(Number(v)));
  C.ifStatus = function(netz, g, name){
    const art = h.ifArt(g, name), k = h.ifKonfig(g, name);
    if (!k) return {status: "deleted", protokoll: "down", kurz: "notconnect"};
    if (art === "svi") {
      if (k.shutdown) return {status: "administratively down", protokoll: "down"};
      const v = name.slice(4);
      if (!((g.flash && g.flash.vlans) || {})[v]) return {status: "down", protokoll: "down"};
      const aktiv = Object.entries(g.running.ports || {}).some(([p, pk]) =>
        (pk.modus === "trunk" ? h.trunkTraegt(pk, v) : String(pk.accessVlan) === v) && Modell.portStatus(netz, g.id, p).status === "oben");
      return {status: "up", protokoll: aktiv ? "up" : "down"};
    }
    if (art === "sub") {
      if (k.shutdown) return {status: "administratively down", protokoll: "down"};
      return C.ifStatus(netz, g, name.split(".")[0]);
    }
    const ps = Modell.portStatus(netz, g.id, name);
    if (ps.status === "aus" && ps.grund === "PORT_SHUTDOWN") return {status: "administratively down", protokoll: "down", kurz: "disabled"};
    if (ps.status === "aus" && ps.grund === "PORTSEC_VIOLATION") return {status: "down", protokoll: "down", kurz: "err-disabled"};
    if (ps.status === "oben") return {status: "up", protokoll: "up", kurz: "connected"};
    return {status: "down", protokoll: "down", kurz: "notconnect"};
  };
  C.statusMeldungen = function(g, name, vor, nach){
    const L = h.langName(name), r = [];
    if (vor.status !== nach.status) {
      if (nach.status === "administratively down") r.push(`%LINK-5-CHANGED: Interface ${L}, changed state to administratively down`);
      else if (nach.status === "up") r.push(`%LINK-${vor.status === "administratively down" ? "5-CHANGED" : "3-UPDOWN"}: Interface ${L}, changed state to up`);
      else r.push(`%LINK-3-UPDOWN: Interface ${L}, changed state to down`);
    }
    if (vor.protokoll !== nach.protokoll) r.push(`%LINEPROTO-5-UPDOWN: Line protocol on Interface ${L}, changed state to ${nach.protokoll}`);
    return r;
  };
  /* alle Schnittstellen in Anzeigereihenfolge */
  h.alleIfs = g => {
    const k = g.running;
    if (g.typ === "switch") return [...h.ifSortieren(Object.keys(k.svi || {}).map(v => "Vlan" + v)), ...Modell.PORTS.switch];
    return h.ifSortieren(Object.keys(k.if || {}));
  };
  h.macVon = (g, name) => {
    const m = (g.hw && g.hw.macs) || {};
    if (/^Vlan/.test(name)) return m.svi || m[Modell.PORTS[g.typ][0]] || "00:00:00:00:00:00";
    return m[name.split(".")[0]] || "00:00:00:00:00:00";
  };

  Z.ipIntBrief = s => {
    const g = G(s), z = [links("Interface", 27) + links("IP-Address", 16) + "OK? Method Status                Protocol"];
    for (const n of h.alleIfs(g)) {
      const k = h.ifKonfig(g, n) || {}, st = C.ifStatus(s.netz, g, n);
      z.push(links(h.langName(n), 27) + links(k.ip || "unassigned", 16) + "YES " + links(k.ip ? "manual" : "unset", 7) + links(st.status, 22) + st.protokoll);
    }
    return z.join("\n");
  };
  const HW = {Fa: ["Fast Ethernet", 100000, 100, "100Mb/s"], Gi: ["Gigabit Ethernet", 1000000, 10, "1000Mb/s"]};
  function ifDetail(s, g, n){
    const k = h.ifKonfig(g, n), st = C.ifStatus(s.netz, g, n), art = h.ifArt(g, n), mac = IP.macCisco(h.macVon(g, n));
    const hw = art === "svi" ? ["EtherSVI", 1000000, 10] : HW[n.slice(0, 2)] || ["Ethernet", 1000000, 10, "1000Mb/s"];
    const z = [`${h.langName(n)} is ${st.status}, line protocol is ${st.protokoll}` + (art === "port" ? ` (${st.kurz})` : ""),
               `  Hardware is ${hw[0]}, address is ${mac} (bia ${mac})`];
    if (k.beschreibung) z.push(`  Description: ${k.beschreibung}`);
    if (art !== "port" && k.ip && IP.maskeGueltig(k.maske)) z.push(`  Internet address is ${k.ip}/${IP.praefix(k.maske)}`);
    z.push(`  MTU 1500 bytes, BW ${hw[1]} Kbit/sec, DLY ${hw[2]} usec,`, "     reliability 255/255, txload 1/255, rxload 1/255");
    if (art === "sub" && k.vlan != null) z.push(`  Encapsulation 802.1Q Virtual LAN, Vlan ID  ${k.vlan}.`);
    else z.push("  Encapsulation ARPA, loopback not set");
    if ((art === "port" || art === "phys") && st.status === "up") z.push(`  Full-duplex, ${hw[3]}, media type is RJ45`);
    if (art !== "port") z.push("  ARP type: ARPA, ARP Timeout 04:00:00");
    return z.join("\n");
  }
  Z.interfaces = (s, name) => {
    const g = G(s);
    if (name) { if (!h.ifKonfig(g, name)) return {ausgabe: `% ${h.langName(name)} ist nicht konfiguriert.`, fehler: true}; return ifDetail(s, g, name); }
    return h.alleIfs(g).map(n => ifDetail(s, g, n)).join("\n");
  };
  Z.status = s => {
    const g = G(s), z = ["", "Port      Name               Status       Vlan       Duplex  Speed Type"];
    for (const p of Modell.PORTS.switch) {
      const k = g.running.ports[p], st = C.ifStatus(s.netz, g, p), gi = p.startsWith("Gi"), oben = st.kurz === "connected";
      z.push(links(p, 10) + links(String(k.beschreibung || "").slice(0, 18), 19) + links(st.kurz, 13) +
             links(k.modus === "trunk" ? "trunk" : String(k.accessVlan), 11) + rechts(oben ? "a-full" : "auto", 6) + " " +
             rechts(oben ? (gi ? "a-1000" : "a-100") : "auto", 6) + " " + (gi ? "10/100/1000BaseTX" : "10/100BaseTX"));
    }
    return z.join("\n");
  };
  Z.trunk = s => {
    const g = G(s), vl = (g.flash && g.flash.vlans) || {};
    const trunks = Modell.PORTS.switch.filter(p => g.running.ports[p].modus === "trunk" && C.ifStatus(s.netz, g, p).kurz === "connected");
    if (!trunks.length) return "";
    const erlaubt = pk => pk.trunkErlaubt === "all" ? "1-4094" : (pk.trunkErlaubt.length ? h.vlanListeText(pk.trunkErlaubt) : "none");
    const aktiv = pk => { const l = Object.keys(vl).map(Number).filter(v => h.trunkTraegt(pk, v)); return l.length ? h.vlanListeText(l) : "none"; };
    const z = ["", "Port        Mode             Encapsulation  Status        Native vlan"];
    for (const p of trunks) z.push(links(p, 12) + links("on", 17) + links("802.1q", 15) + links("trunking", 14) + g.running.ports[p].nativeVlan);
    for (const [kopf, fn] of [["Vlans allowed on trunk", erlaubt], ["Vlans allowed and active in management domain", aktiv], ["Vlans in spanning tree forwarding state and not pruned", aktiv]]) {
      z.push("", links("Port", 12) + kopf);
      for (const p of trunks) z.push(links(p, 12) + fn(g.running.ports[p]));
    }
    return z.join("\n");
  };
  const STD_VLANS = [[1002, "fddi-default", "fddi"], [1003, "token-ring-default", "tr"], [1004, "fddinet-default", "fdnet"], [1005, "trnet-default", "trnet"]];
  Z.vlan = (s, kurz) => {
    const g = G(s), vl = (g.flash && g.flash.vlans) || {};
    const z = ["", "VLAN Name                             Status    Ports", "---- -------------------------------- --------- -------------------------------"];
    const ids = Object.keys(vl).map(Number).sort((a, b) => a - b);
    for (const v of ids) {
      const ports = Modell.PORTS.switch.filter(p => g.running.ports[p].modus !== "trunk" && Number(g.running.ports[p].accessVlan) === v);
      const zeilen = []; for (let i = 0; i < ports.length; i += 4) zeilen.push(ports.slice(i, i + 4).join(", "));
      z.push(links(v, 4) + " " + links(vl[v].name, 32) + " " + links("active", 9) + " " + (zeilen[0] || "").replace(/\s+$/, ""));
      for (const x of zeilen.slice(1)) z.push(" ".repeat(48) + x);
    }
    for (const [v, n] of STD_VLANS) z.push(links(v, 4) + " " + links(n, 32) + " " + "act/unsup");
    if (!kurz) {
      z.push("", "VLAN Type  SAID       MTU   Parent RingNo BridgeNo Stp  BrdgMode Trans1 Trans2",
                 "---- ----- ---------- ----- ------ ------ -------- ---- -------- ------ ------");
      for (const v of ids) z.push(links(v, 4) + " enet  " + links(100000 + v, 10) + " 1500  -      -      -        -    -        0      0");
      for (const [v, , t] of STD_VLANS) z.push(links(v, 4) + " " + links(t, 5) + " " + links(100000 + v, 10) + " 1500  -      -      -        -    -        0      0");
    }
    return z.join("\n");
  };
  Z.macTabelle = (s, nurDynamisch) => {
    const g = G(s), z = zustand(s.netz, s.id), jetztUhr = uhr(s.netz), zeilen = [];
    for (const [vlan, tab] of Object.entries(z.mac || {})) for (const [mac, e] of Object.entries(tab || {}))
      if (e && (e.bis == null || e.bis > jetztUhr)) zeilen.push({vlan: +vlan, mac, typ: "DYNAMIC", port: e.port});
    if (!nurDynamisch) for (const p of Modell.PORTS.switch) {
      const ps = g.running.ports[p].portSecurity;
      if (ps) for (const mac of ps.macs || []) zeilen.push({vlan: +g.running.ports[p].accessVlan, mac, typ: "STATIC", port: p});
    }
    zeilen.sort((a, b) => a.vlan - b.vlan || String(a.mac).localeCompare(String(b.mac)));
    return ["          Mac Address Table", "-------------------------------------------", "",
            "Vlan    Mac Address       Type        Ports", "----    -----------       --------    -----",
            ...zeilen.map(r => rechts(r.vlan, 4) + "    " + links(IP.macCisco(r.mac), 18) + links(r.typ, 12) + r.port),
            `Total Mac Addresses for this criterion: ${zeilen.length}`].join("\n");
  };

  /* ---------- Routing ---------- */
  const klasse = ip => { const a = IP.zuZahl(ip) >>> 24; return a < 128 ? 8 : a < 192 ? 16 : a < 224 ? 24 : 32; };
  /* Routen wie die Routingtabelle sie zeigt: C/L für aktive Schnittstellen, S nur mit erreichbarem Next Hop */
  C.routen = function(netz, g){
    const k = g.running, r = [], conn = [];
    for (const [n, i] of Object.entries(k.if || {})) {
      if (!i.ip || !IP.maskeGueltig(i.maske)) continue;
      const st = C.ifStatus(netz, g, n); if (st.protokoll !== "up") continue;
      conn.push({netz: IP.netz(i.ip, i.maske), maske: i.maske, aus: n});
      r.push({code: "C", netz: IP.netz(i.ip, i.maske), p: IP.praefix(i.maske), aus: n});
      r.push({code: "L", netz: i.ip, p: 32, aus: n});
    }
    const statisch = (k.routen || []).filter(x => IP.gueltig(x.netz) && IP.maskeGueltig(x.maske));
    const ifOben = n => { const i = (k.if || {})[n]; return !!i && C.ifStatus(netz, g, n).protokoll === "up"; };
    const erreichbar = (ip, tiefe, ohne) => conn.some(c => IP.imNetz(ip, c.netz, c.maske)) ||
      (tiefe < 4 && statisch.some(x => x !== ohne && IP.imNetz(ip, x.netz, x.maske) && gueltig(x, tiefe + 1)));
    const gueltig = (x, tiefe = 0) => x.aus ? ifOben(x.aus) : !!x.nh && erreichbar(x.nh, tiefe, x);
    const kandidaten = statisch.filter(x => gueltig(x) && !conn.some(c => c.netz === x.netz && c.maske === x.maske));
    for (const x of kandidaten) {
      const beste = Math.min(...kandidaten.filter(y => y.netz === x.netz && y.maske === x.maske).map(y => y.ad || 1));
      if ((x.ad || 1) !== beste) continue;
      r.push({code: x.netz === "0.0.0.0" && x.maske === "0.0.0.0" ? "S*" : "S", netz: x.netz, p: IP.praefix(x.maske), nh: x.nh || null, aus: x.aus || null, ad: x.ad || 1});
    }
    return r;
  };
  function routeText(e){
    const ziel = `${e.netz}/${e.p}`;
    if (e.code === "C" || e.code === "L" || (e.aus && !e.nh)) return `${ziel} is directly connected, ${h.langName(e.aus)}`;
    return `${ziel} [${e.ad}/0] via ${e.nh}` + (e.aus ? `, ${h.langName(e.aus)}` : "");
  }
  const CODES = ["Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP",
    "       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area",
    "       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2",
    "       E1 - OSPF external type 1, E2 - OSPF external type 2",
    "       i - IS-IS, su - IS-IS summary, L1 - IS-IS level-1, L2 - IS-IS level-2",
    "       ia - IS-IS inter area, * - candidate default, U - per-user static route",
    "       o - ODR, P - periodic downloaded static route, H - NHRP, l - LISP",
    "       + - replicated route, % - next hop override"];
  Z.ipRoute = s => {
    const g = G(s);
    if (g.typ === "switch") {   /* 2960 ohne „ip routing“: zeigt nur das Standardgateway */
      const gw = g.running.defaultGateway;
      return [gw ? `Default gateway is ${gw}` : "Default gateway is not set", "",
              "Host               Gateway           Last Use    Total Uses  Interface", "ICMP redirect cache is empty"].join("\n");
    }
    const r = C.routen(s.netz, g), z = [...CODES, ""];
    const def = r.find(e => e.code === "S*");
    z.push(def ? `Gateway of last resort is ${def.nh || "0.0.0.0"} to network 0.0.0.0` : "Gateway of last resort is not set", "");
    const zahl = e => IP.zuZahl(e.netz), bloecke = [], gruppen = {};
    for (const e of r) {
      const kl = klasse(e.netz);
      if (e.p < kl) { bloecke.push({sort: zahl(e), zeilen: [links(e.code, 6) + routeText(e)]}); continue; }
      const major = IP.netz(e.netz, IP.maske(kl));
      (gruppen[major] = gruppen[major] || {kl, liste: []}).liste.push(e);
    }
    for (const [major, {kl, liste}] of Object.entries(gruppen)) {
      liste.sort((a, b) => zahl(a) - zahl(b) || a.p - b.p);
      if (liste.length === 1 && liste[0].p === kl) { bloecke.push({sort: IP.zuZahl(major), zeilen: [links(liste[0].code, 6) + routeText(liste[0])]}); continue; }
      const masken = [...new Set(liste.map(e => e.p))];
      const kopf = masken.length === 1 ? `      ${major}/${masken[0]} is subnetted, ${liste.length} subnets`
                                       : `      ${major}/${kl} is variably subnetted, ${liste.length} subnets, ${masken.length} masks`;
      bloecke.push({sort: IP.zuZahl(major), zeilen: [kopf, ...liste.map(e => links(e.code, 9) + routeText(e))]});
    }
    bloecke.sort((a, b) => a.sort - b.sort);
    for (const b of bloecke) z.push(...b.zeilen);
    return z.join("\n").replace(/\n+$/, "");
  };

  /* ---------- ARP ---------- */
  Z.arp = s => {
    const g = G(s), z = zustand(s.netz, s.id), jetztUhr = uhr(s.netz), eigene = Modell.adressen(g), zeilen = [];
    const ifVon = ip => { const x = eigene.find(a => IP.maskeGueltig(a.maske) && IP.imNetz(ip, a.ip, a.maske)); return x ? x.port : null; };
    for (const a of eigene) {
      if (C.ifStatus(s.netz, g, a.port).protokoll !== "up") continue;
      zeilen.push({ip: a.ip, alter: "-", mac: h.macVon(g, a.port), port: a.port});
    }
    for (const [ip, e] of Object.entries(z.arp || {})) {
      if (!e || (e.bis != null && e.bis <= jetztUhr) || zeilen.some(x => x.ip === ip)) continue;
      const alter = e.bis != null ? Math.max(0, Math.floor((jetztUhr - (e.bis - 14400000)) / 60000)) : 0;
      zeilen.push({ip, alter: String(alter), mac: e.mac, port: e.port || ifVon(ip) || ""});
    }
    zeilen.sort((a, b) => IP.zuZahl(a.ip) - IP.zuZahl(b.ip));
    return ["Protocol  Address          Age (min)  Hardware Addr   Type   Interface",
            ...zeilen.map(x => "Internet  " + links(x.ip, 17) + rechts(x.alter, 8) + "   " + links(IP.macCisco(x.mac), 16) + "ARPA   " + h.langName(x.port))].join("\n");
  };

  /* ---------- NAT ---------- */
  Z.natTrans = s => {
    const k = K(s), z = zustand(s.netz, s.id), zeilen = [];
    const zeile = (pro, ig, il, ol, og) => links(pro, 4) + " " + links(ig, 21) + " " + links(il, 21) + " " + links(ol, 21) + " " + og;
    /* dynamische Einträge der Sim: {typ, proto, innen, innenPort, aussen, aussenPort, ziel, zielPort, bis} */
    const sim = h.sim(), liste = sim && typeof sim.natTabelle === "function" ? sim.natTabelle(s.netz, s.id) : (z.nat || []);
    const mitPort = (ip, p) => ip ? (p != null ? `${ip}:${p}` : ip) : "---";
    for (const e of liste || []) {
      if (!e || typeof e !== "object" || e.typ === "statisch") continue;
      zeilen.push(zeile(String(e.proto || "---").toLowerCase(), mitPort(e.aussen, e.aussenPort), mitPort(e.innen, e.innenPort),
                        mitPort(e.ziel, e.zielPort), mitPort(e.ziel, e.zielPort)));
    }
    for (const x of (k.nat && k.nat.statisch) || []) {
      if (x.proto) zeilen.push(zeile(x.proto, `${x.aussen}:${x.aussenPort}`, `${x.innen}:${x.innenPort}`, "---", "---"));
      else zeilen.push(zeile("---", x.aussen, x.innen, "---", "---"));
    }
    if (!zeilen.length) return "";
    return [zeile("Pro", "Inside global", "Inside local", "Outside local", "Outside global"), ...zeilen].join("\n");
  };

  Z.natStatistik = s => {
    const k = K(s), sim = h.sim(), liste = (sim && typeof sim.natTabelle === "function" ? sim.natTabelle(s.netz, s.id) : (zustand(s.netz, s.id).nat || [])) || [];
    const dyn = liste.filter(e => e && e.typ !== "statisch").length, stat = ((k.nat && k.nat.statisch) || []).length;
    const ifs = rolle => Object.entries(k.if || {}).filter(([, i]) => i && i.nat === rolle).map(([n]) => "  " + h.langName(n));
    const z = [`Total active translations: ${dyn + stat} (${stat} static, ${dyn} dynamic; ${liste.filter(e => e && e.proto).length} extended)`,
      "Outside interfaces:", ...ifs("outside"), "Inside interfaces:", ...ifs("inside"), `Hits: ${dyn}  Misses: 0`, "Expired translations: 0", "Dynamic mappings:"];
    for (const [i, d] of ((k.nat && k.nat.dynamisch) || []).entries())
      z.push("-- Inside Source", `[Id: ${i + 1}] access-list ${d.acl} interface ${h.langName(d.aus)} refcount ${dyn}`);
    return z.join("\n");
  };
  /* `show ip dhcp conflict` – echte Konflikte aus der Laufzeit (§ 10.2: `leases[ip].konflikt` mit Zeitpunkt).
     Die Erkennungsmethode (Ping/ARP/Gratuitous ARP) unterscheidet die Simulation nicht: „IOS-ähnlich“,
     ein echter Router zeigt dort „Ping“ bzw. „ARP“ oder „Gratuitous ARP“. */
  Z.dhcpKonflikt = s => {
    const g = G(s), z = zustand(s.netz, s.id), jetzt = uhr(s.netz), zeilen = [];
    if (!dhcpAktiv(g)) return `% Auf ${g.running.hostname || g.name} läuft kein DHCP-Server (Dienst ist aus).`;
    for (const [ip, l] of Object.entries(z.leases || {})) {
      if (!l || typeof l !== "object" || !(l.konflikt || l.konfliktZeit)) continue;
      const t = l.konfliktZeit != null ? l.konfliktZeit : l.konflikt === true ? null : l.konflikt;
      const alter = typeof t === "number" && t <= jetzt ? Math.floor((jetzt - t) / 1000) : null;
      zeilen.push({ip, methode: l.konfliktMethode || "Ping", zeit: alter == null ? "unbekannt"
        : `${pad(Math.floor(alter / 3600))}:${pad(Math.floor(alter / 60) % 60)}:${pad(alter % 60)}`, vrf: l.vrf || "default"});
    }
    zeilen.sort((a, b) => IP.zuZahl(a.ip) - IP.zuZahl(b.ip));
    const out = ["IP address        Detection method   Detection time          VRF"];
    for (const zl of zeilen) out.push(links(zl.ip, 18) + links(zl.methode, 19) + links(zl.zeit, 24) + zl.vrf);
    if (!zeilen.length) out.push("% Keine Adresskonflikte – der Server hat keine doppelt belegte Adresse gefunden.");
    return out.join("\n");
  };
  Z.benutzer = s => {
    const z = ["    Line       User       Host(s)              Idle       Location"];
    z.push(s.ueberSsh ? `   0 con 0                idle                 00:01:12` : "*  0 con 0                idle                 00:00:00");
    if (s.ueberSsh) z.push(`*  2 vty 0     ${links(s.ueberSsh.user, 10)} idle                 00:00:00 ${s.ueberSsh.von}`);
    z.push("", "  Interface    User               Mode         Idle     Peer Address");
    return z.join("\n");
  };

  /* ---------- ACL ---------- */
  function adrText(a, standard, art){
    if (!a || (a.ip === "0.0.0.0" && a.wc === "255.255.255.255")) return "any";
    if (a.wc === "0.0.0.0") return standard ? a.ip : "host " + a.ip;
    return standard && art === "show" ? `${a.ip}, wildcard bits ${a.wc}` : `${a.ip} ${a.wc}`;
  }
  function portText(p, proto){
    if (!p) return "";
    return ` ${p.op} ` + p.ports.map(x => h.portText(proto, Number(x))).join(" ");
  }
  C.regelText = function(r, standard, art){
    const akt = !standard && art === "conf" ? links(r.aktion, 6) : r.aktion;
    if (standard) return `${akt} ${adrText(r.quelle, true, art)}`;
    return `${akt} ${r.proto} ${adrText(r.quelle, false, art)}${portText(r.quellPort, r.proto)} ${adrText(r.ziel, false, art)}${portText(r.zielPort, r.proto)}` +
           (r.icmpTyp ? " " + r.icmpTyp : "");
  };
  const aclReihe = acls => Object.keys(acls).sort((a, b) => {
    const na = /^\d+$/.test(a), nb = /^\d+$/.test(b);
    if (na && nb) return +a - +b; if (na !== nb) return na ? -1 : 1; return a.localeCompare(b);
  });
  Z.acls = (s, nur) => {
    const acls = K(s).acls || {}, z = [];
    for (const name of aclReihe(acls)) {
      if (nur && String(nur) !== name) continue;
      const a = acls[name], std = a.typ === "standard", seqs = C.seqListe(a.regeln);
      z.push(`${std ? "Standard" : "Extended"} IP access list ${name}`);
      a.regeln.forEach((r, i) => z.push(`    ${seqs[i]} ${C.regelText(r, std, "show")}`));
    }
    return z.join("\n");
  };

  /* ---------- DHCP ----------
     Datenformen: Architektur.md § 10.1 (Pool) und § 10.2 (Laufzeit). Der Router führt seine Pools in
     `running.dhcp`, ein Server/NAS in `running.dienste.dhcp` – beide haben dieselbe Form. Alle neuen Felder
     (start, anzahl, domain, leaseS, reservierungen, t1, t2, abgelaufen, konflikt) werden DEFENSIV gelesen:
     fehlt eins, gilt der Standard (Architektur § 10.1 „Fehlende Felder werden defensiv gelesen“).
     `show ip dhcp binding|pool|conflict` gilt damit auch auf einem Server-Host mit DHCP-Dienst. */
  const LEASE_STANDARD_S = 86400;                      /* IOS-Vorgabe: 1 Tag (Sim.T.LEASE/1000) */
  const macKlein = m => String(m == null ? "" : m).toLowerCase();
  /* Pools eines Geräts – Router und Host haben dieselbe Form (§ 10.1) */
  const dhcpDaten = g => (g.running && g.running.dhcp) || (g.running && g.running.dienste && g.running.dienste.dhcp) || {};
  const dhcpPools = g => { const p = dhcpDaten(g).pools; return Array.isArray(p) ? p : []; };
  /* Läuft auf diesem Gerät überhaupt ein DHCP-Dienst? (Router: immer, Host: nur wenn eingeschaltet) */
  const dhcpAktiv = g => g.typ === "router" ? true : !!dhcpDaten(g).an;
  /* Leases der Laufzeit (§ 10.2). Fehlt `leases` (noch) ganz, liefert die Sim die aktuellen – defensiv. */
  function leasesVon(s, g = G(s)){
    const l = zustand(s.netz, g.id).leases;
    if (l && typeof l === "object") return l;
    const sim = h.sim && h.sim();
    if (sim && typeof sim.leases === "function") {
      const r = sim.leases(s.netz, g.id) || [];
      const o = {}; for (const x of r) if (x && x.ip) o[x.ip] = x;
      return o;
    }
    return {};
  }
  const reservierungen = p => { const r = p.reservierungen; return Array.isArray(r) ? r : []; };
  /* Reservierungen mit Zustand: {mac, ip, name, frei, aktiv} */
  const reservierungenMitZustand = (s, p, leases = leasesVon(s)) => {
    const jetzt = uhr(s.netz);
    return reservierungen(p).map(r => {
      const l = leases[r.ip];
      const bis = l && l.bis != null ? l.bis : null;
      const aktiv = !!l && macKlein(l.mac) === macKlein(r.mac) && (bis == null || bis > jetzt);
      return {mac: r.mac, ip: r.ip, name: r.name, frei: !aktiv && (!l || (bis != null && bis <= jetzt)), bis, aktiv};
    });
  };
  /* Ein Lease-Eintrag in eine Zeile für die Anzeige übersetzen */
  function leaseZeile(s, ip, l, jetzt){
    const bis = l.bis != null ? l.bis : null;
    const restS = bis != null ? Math.floor((bis - jetzt) / 1000) : null;      /* negativ = abgelaufen */
    const abgelaufen = !!l.abgelaufen || (restS != null && restS < 0);
    const dauer = restS == null ? "Infinite"
      : abgelaufen ? "abgelaufen" : `${pad(Math.floor(restS / 3600))}:${pad(Math.floor(restS / 60) % 60)}:${pad(restS % 60)} Rest`;
    const hex = macKlein(l.mac).replace(/[^0-9a-f]/g, "");
    const cid = hex.length >= 12 ? ("01" + hex).match(/.{1,4}/g).join(".") : "unbekannt";
    return {ip, mac: macKlein(l.mac), bis, restS, abgelaufen, t1: l.t1 != null ? l.t1 : null, t2: l.t2 != null ? l.t2 : null,
            hostname: l.hostname || "", konflikt: !!l.konflikt || !!l.konfliktZeit, name: nameZuMac(s, l.mac), cid, dauer};
  }
  function nameZuMac(s, mac){
    const m = macKlein(mac);
    for (const g of Object.values(s.netz.geraete || {})) {
      for (const x of Object.values((g.hw && g.hw.macs) || {})) if (macKlein(x) === m) return String(g.running && g.running.hostname || g.name);
    }
    return "";
  }
  const zustandsWort = (l, res) => res && res.aktiv ? "reserviert" : l.abgelaufen ? "abgelaufen" : l.konflikt ? "Konflikt" : "aktiv";
  Z.dhcpBinding = s => {
    const g = G(s), jetzt = uhr(s.netz), leases = leasesVon(s, g);
    if (!dhcpAktiv(g)) return {ausgabe: `% Auf ${g.running.hostname || g.name} läuft kein DHCP-Server (Dienst ist aus).\n% Einschalten im Inspektor (Reiter „Dienste“) oder auf einem Router mit „ip dhcp pool …“.`, fehler: true,
      tipp: "Ohne laufenden DHCP-Dienst gibt es keine Leases – die Adressen der Clients kommen dann von einem anderen Server."};
    /* Reservierungen der Pools mit Namen, damit „reserviert“ an der richtigen Zeile steht */
    const res = new Map();
    for (const p of dhcpPools(g)) for (const r of reservierungenMitZustand(s, p, leases)) if (r.ip) res.set(r.ip, r);
    /* Aktive Leases aus der Laufzeit dieses Geräts (Architektur § 10.2) */
    const akt = [], alt = [];
    for (const [ip, e] of Object.entries(leases)) {
      if (!e || typeof e !== "object") continue;
      const l = leaseZeile(s, ip, e, jetzt);
      if (l.abgelaufen) alt.push(l); else akt.push(l);
    }
    akt.sort((a, b) => IP.zuZahl(a.ip) - IP.zuZahl(b.ip));
    alt.sort((a, b) => IP.zuZahl(a.ip) - IP.zuZahl(b.ip));
    for (const l of akt) l.wort = zustandsWort(l, res.get(l.ip));
    const out = ["Bindings from all pools not associated with VRF:",
      "IP address          Client-ID/              Lease expiration        Type",
      "                    Hardware address/", "                    User name",
      links("Gerät", 16) + links("Zustand", 11) + "T1 / T2 (Erneuerung, IOS-ähnlich)"];
    if (!akt.length) out.push("  (keine aktiven Leases)");
    for (const l of akt)
      out.push(links(l.ip, 20) + links(l.cid, 24) + links(l.dauer, 24) + "Automatic",
        "  " + links(l.name || l.hostname || "unbekannt", 14) + links(l.wort, 11) + t1t2Text(l, jetzt));
    /* Abgelaufene Leases zeigt ein echter Router nicht mehr an (er löscht sie) – hier stehen sie zur Kontrolle darunter. */
    if (alt.length) {
      out.push("", "Abgelaufene Leases (im Labor sichtbar, IOS räumt sie selbst weg):",
        "IP address          Client-ID/              Zustand           Gerät");
      for (const l of alt) out.push(links(l.ip, 20) + links(l.cid, 24) + links("abgelaufen", 17) + (l.name || "unbekannt"));
    }
    if (res.size) {
      const offen = [...res.values()].filter(r => !r.aktiv);
      if (offen.length) {
        out.push("", "Reservierungen (fest MAC → IP), noch ohne Lease:");
        for (const r of offen) out.push("  " + links(r.ip || "–", 16) + links(IP.macCisco(r.mac), 18) + (r.name || ""));
      }
    }
    return out.join("\n");
  };
  /* T1/T2 sind Zeitpunkte (§ 10.2). Angezeigt wird die Restzeit bis dorthin – beides ist „IOS-ähnlich“:
     ein echter Router zeigt in `show ip dhcp binding` weder T1 noch T2. */
  const t1t2Text = (l, jetzt) => {
    if (l.t1 == null && l.t2 == null) return "kein T1 bekannt";      /* alte Leases ohne t1/t2: kein Fehler (§ 10.2) */
    const rest = t => { if (t == null) return "–"; const s = Math.floor((t - jetzt) / 1000); return s <= 0 ? "erreicht" : `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };
    return `T1 ${rest(l.t1)}  T2 ${rest(l.t2)}`;
  };
  Z.dhcpPool = s => {
    const g = G(s), z = zustand(s.netz, s.id), jetzt = uhr(s.netz), leases = z.leases || {}, out = [];
    if (!dhcpAktiv(g)) return `% Auf ${g.running.hostname || g.name} läuft kein DHCP-Server (Dienst ist aus).\n% Einschalten im Inspektor (Reiter „Dienste“).`;
    const pools = dhcpPools(g);
    if (!pools.length) return "% Kein DHCP-Pool eingerichtet. Anlegen mit „ip dhcp pool NAME“ (Router) bzw. im Inspektor unter „Dienste“.";
    for (const p of pools) {
      /* Bereich: netz/maske + start + anzahl (Architektur § 10.1) – Ausschlüsse und Reservierungen zählen mit (§ 10.6) */
      const ok = IP.gueltig(p.netz) && IP.maskeGueltig(p.maske);
      const b = ok ? poolBereich(p) : null;
      const belegtIp = new Set(Object.entries(leases).filter(([, l]) => l && l.mac && l.bis != null && l.bis > jetzt).map(([ip]) => ip));
      const res = ok ? reservierungenMitZustand(s, p) : [];
      let vergebbar = 0, vergeben = 0, reserviert = 0;
      if (b) {
        for (let n = IP.zuZahl(b.von); n <= IP.zuZahl(b.bis); n++) {
          const ip = IP.zuText(n >>> 0);
          if (!IP.hostAdresse(ip, p.maske)) continue;
          if (ausgeschlossen(g, ip)) continue;                                  /* ip dhcp excluded-address */
          if (macKlein(b.gw && b.gw) && ip === b.gw) continue;                   /* das Gateway vergibt der Pool nie */
          if (res.some(r => r.ip === ip)) { reserviert++; continue; }            /* fest MAC → IP */
          vergebbar++; if (belegtIp.has(ip)) vergeben++;
        }
      }
      const frei = Math.max(0, vergebbar - vergeben);
      const last = vergebbar + reserviert;
      const lastProzent = last > 0 ? Math.round((vergeben + reserviert) * 100 / last) : 0;
      const naechste = b ? naechsteFreie(g, p, b, leases, res, jetzt) : "";
      out.push("", `Pool ${p.name} :`,
        ` Utilization mark (high/low)    : ${lastProzent} / 0`, " Subnet size (first/next)       : 0 / 0",
        ` Total addresses                : ${vergebbar}`);                  /* nur vergebbare Adressen: start/anzahl minus Ausschlüsse minus Gateway */
      if (reserviert) out.push(` Reserved addresses             : ${reserviert}   (feste MAC → IP, IOS-ähnlich)`);
      out.push(` Leased addresses               : ${vergeben}`,
        ` Free addresses                 : ${frei}`, " Pending event                  : none");
      const lz = leaseDauerS(p);
      out.push(` Lease duration                 : ${lz ? zeitText(lz) : "unendlich (infinite)"}`,
        ` Domain name (Option 15)        : ${p.domain || "–"}`, " DNS server                     : " + (p.dns || "–"));
      if (ok && b) {
        out.push(" 1 subnet is currently in the pool :", " Current index        IP address range                    Leased addresses",
          " " + links(naechste || b.von, 21) + links(b.von, 17) + "- " + links(b.bis, 18) + vergeben);
      } else out.push(" 0 subnets are currently in the pool :");
      if (res.length) {
        out.push(" Reservierungen (fest MAC → IP):");
        for (const r of res) out.push("  " + links(r.ip || "–", 16) + links(IP.macCisco(r.mac), 18) + links(r.name || "", 14) + (r.aktiv ? "Lease aktiv" : "frei"));
      }
    }
    return out.join("\n");
  };
  /* Bereich eines Pools: start (Standard: erste Hostadresse) + anzahl Adressen, begrenzt auf das Subnetz */
  function poolBereich(p){
    const n = Math.max(0, Math.round(Number(p.anzahl == null || p.anzahl === "" ? 50 : p.anzahl)) || 0);
    const von = IP.gueltig(p.start) ? IP.zuText(IP.zuZahl(p.start)) : IP.plus(IP.netz(p.netz, p.maske), 1);
    if (n <= 0) return {von, bis: IP.plus(von, -1 >>> 0), anzahl: 0, gw: p.gw || ""};    /* leerer Bereich */
    const bisSoll = IP.plus(von, n - 1), bisMax = IP.plus(IP.broadcast(p.netz, p.maske), -1 >>> 0);
    const bis = IP.vergleich(bisSoll, bisMax) > 0 ? bisMax : bisSoll;
    return {von, bis, anzahl: Math.max(0, IP.zuZahl(bis) - IP.zuZahl(von) + 1), gw: p.gw || ""};
  }
  /* `ip dhcp excluded-address` liegt am Router in `dhcp.ausgeschlossen`, am Host in `dienste.dhcp.ausgeschlossen`
     (Architektur § 10.1: „ausgeschlossen gilt auch hier“). Fehlt die Liste, ist nichts ausgeschlossen. */
  function ausgeschlossen(g, ip){
    const liste = dhcpDaten(g).ausgeschlossen;
    if (!Array.isArray(liste)) return false;
    return liste.some(x => x && IP.gueltig(x.von) && IP.vergleich(ip, x.von) >= 0 && IP.vergleich(ip, IP.gueltig(x.bis) ? x.bis : x.von) <= 0);
  }
  /* Lease-Dauer eines Pools in Sekunden: `leaseS` ist neu (§ 10.1), `lease` lesen wir defensiv mit,
     0/fehlend = Sim.T.LEASE (IOS-Vorgabe 1 Tag). */
  function leaseDauerS(p){
    const roh = p.leaseS != null && p.leaseS !== "" ? p.leaseS : (p.lease != null && p.lease !== "" ? p.lease : null);
    if (roh == null) return 0;
    if (roh === 0 || roh === "0" || roh === "infinite") return 0;
    return Math.max(0, Math.round(Number(roh) || 0));
  }
  const zeitText = sek => sek >= 86400 && sek % 86400 === 0 ? `${sek / 86400} Tag(e) (${sek} s)`
    : sek >= 3600 && sek % 3600 === 0 ? `${sek / 3600} Stunde(n) (${sek} s)` : `${sek} s`;
  function naechsteFreie(g, p, b, leases, res, jetzt){
    for (let n = IP.zuZahl(b.von); n <= IP.zuZahl(b.bis); n++) {
      const ip = IP.zuText(n >>> 0);
      if (!IP.hostAdresse(ip, p.maske) || ip === b.gw) continue;
      if (ausgeschlossen(g, ip)) continue;
      if (res.some(r => r.ip === ip)) continue;
      const l = leases[ip];
      if (!l || !l.mac || l.bis == null || l.bis <= jetzt) return ip;
    }
    return "";
  }

  /* ---------- Port-Security ---------- */
  const VERSTOSS = {shutdown: "Shutdown", restrict: "Restrict", protect: "Protect"};
  Z.portSecurity = (s, name) => {
    const g = G(s), z = zustand(s.netz, s.id);
    const zaehler = p => ((z.psVerstoesse || {})[p]) || ((z.errdisabled || {})[p] ? 1 : 0);   /* Sim zählt Verstöße (noch) nicht */
    const gelernt = p => { const x = (z.portsec || {})[p]; return Array.isArray(x) ? x : (x && x.macs) || []; };
    if (name) {
      const k = g.running.ports[name]; if (!k) return {ausgabe: "% Nur Switch-Ports haben Port-Security.", fehler: true};
      const ps = k.portSecurity, st = C.ifStatus(s.netz, g, name);
      const vorgabe = Object.assign({max: 1, verstoss: "shutdown", macs: []}, ps || k.psVorgabe || {});
      const alle = [...vorgabe.macs, ...gelernt(name).filter(m => !vorgabe.macs.includes(m))];
      const letzte = alle.length ? `${IP.macCisco(alle[alle.length - 1])}:${k.accessVlan}` : "0000.0000.0000:0";
      return [`Port Security              : ${ps ? "Enabled" : "Disabled"}`,
              `Port Status                : ${!ps ? "Secure-down" : st.kurz === "err-disabled" ? "Secure-shutdown" : st.kurz === "connected" ? "Secure-up" : "Secure-down"}`,
              `Violation Mode             : ${VERSTOSS[vorgabe.verstoss] || vorgabe.verstoss}`, "Aging Time                 : 0 mins", "Aging Type                 : Absolute",
              "SecureStatic Address Aging : Disabled", `Maximum MAC Addresses      : ${vorgabe.max}`, `Total MAC Addresses        : ${ps ? alle.length : 0}`,
              `Configured MAC Addresses   : ${vorgabe.sticky ? 0 : vorgabe.macs.length}`, `Sticky MAC Addresses       : ${vorgabe.sticky ? vorgabe.macs.length : 0}`,
              `Last Source Address:Vlan   : ${letzte}`, `Security Violation Count   : ${zaehler(name)}`].join("\n");
    }
    const z2 = ["Secure Port  MaxSecureAddr  CurrentAddr  SecurityViolation  Security Action", "                (Count)       (Count)          (Count)",
                "---------------------------------------------------------------------------"];
    for (const p of Modell.PORTS.switch) {
      const ps = g.running.ports[p].portSecurity; if (!ps) continue;
      const anzahl = new Set([...(ps.macs || []), ...gelernt(p)]).size;
      z2.push(rechts(p, 11) + rechts(ps.max, 15) + rechts(anzahl, 13) + rechts(zaehler(p), 19) + rechts(VERSTOSS[ps.verstoss] || ps.verstoss, 17));
    }
    z2.push("---------------------------------------------------------------------------",
            "Total Addresses in System (excluding one mac per port)     : 0", "Max Addresses limit in System (excluding one mac per port) : 8192");
    return z2.join("\n");
  };

  /* ---------- CDP (einfach: direkt verkabelte Switches und Router mit Link) ---------- */
  Z.cdp = s => {
    const g = G(s), jetztUhr = uhr(s.netz), z = ["Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge",
      "                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone,", "                  D - Remote, C - CVTA, M - Two-port Mac Relay", "",
      "Device ID        Local Intrfce     Holdtme    Capability  Platform  Port ID"];
    let n = 0;
    for (const k of s.netz.kabel) {
      const hier = k.a.geraet === g.id ? k.a : k.b.geraet === g.id ? k.b : null; if (!hier) continue;
      const dort = hier === k.a ? k.b : k.a, gg = s.netz.geraete[dort.geraet];
      if (!gg || !(gg.typ === "switch" || gg.typ === "router") || !Modell.linkOben(s.netz, k).oben) continue;
      const cap = gg.typ === "router" ? "R B S I" : "S I";
      z.push(links(gg.running.hostname || gg.name, 17) + links(h.cdpName(hier.port), 18) + links(180 - Math.floor((jetztUhr / 1000) % 60), 6) +
             rechts(cap, 14) + "  " + links(gg.typ === "router" ? "Router" : "Switch", 10) + h.cdpName(dort.port));
      n++;
    }
    z.push("", `Total cdp entries displayed : ${n}`);
    return z.join("\n");
  };

  /* ---------- Uhr, Version, Flash (virtuelle Zeit ab „1. März 1993“, wie ein Gerät ohne gestellte Uhr) ---------- */
  const TAGE = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  Z.uhr = s => {
    const t = Math.max(0, Math.floor(uhr(s.netz))), tag = Math.floor(t / 86400000), r = t % 86400000;
    return `*${pad(Math.floor(r / 3600000))}:${pad(Math.floor(r / 60000) % 60)}:${pad(Math.floor(r / 1000) % 60)}.${pad(r % 1000, 3)} UTC ${TAGE[tag % 7]} Mar ${1 + (tag % 31)} 1993`;
  };
  Z.version = s => {
    const g = G(s), t = Math.floor(uhr(s.netz) / 60000), fw = g.typ === "firewall", sw = g.typ === "switch";
    const z = [`IOS-ähnliche Software (Netzwerk-Labor), Version ${sw ? "15.0" : "15.1"} – Nachbau für das Lernspiel, keine echte Herstellersoftware`, "",
      `${g.running.hostname} uptime is ${Math.floor(t / 1440)} days, ${Math.floor(t / 60) % 24} hours, ${t % 60} minutes`, "System returned to ROM by power-on", ""];
    if (sw) z.push("24 FastEthernet interfaces", "2 Gigabit Ethernet interfaces", "64K bytes of flash-simulated non-volatile configuration memory.",
                   `Base ethernet MAC Address       : ${IP.macCisco(h.macVon(g, "Fa0/1")).replace(/\./g, "").match(/../g).join(":").toUpperCase()}`);
    else z.push(`${(Modell.PORTS[g.typ] || []).length} Gigabit Ethernet interfaces`, fw ? "(Firewall, herstellerneutral)" : "255K bytes of non-volatile configuration memory.");
    z.push("", "Configuration register is 0x2102");
    return z.join("\n");
  };
  Z.flash = s => {
    const g = G(s), datum = "Mar 1 1993 00:00:00 +00:00", dateien = [["-rwx", 4414921, "labor-ios.bin"]];
    const vl = Object.keys((g.flash && g.flash.vlans) || {});
    if (g.typ === "switch" && vl.some(v => v !== "1")) dateien.push(["-rwx", 616 + 40 * vl.length, "vlan.dat"]);
    if (g.typ === "switch" && g.startup) dateien.push(["-rwx", C.konfigText(g, g.startup).length, "config.text"]);
    const gesamt = g.typ === "switch" ? 32514048 : 256487424, belegt = dateien.reduce((x, d) => x + d[1], 0);
    return ["Directory of flash:/", "", ...dateien.map((d, i) => rechts(i + 1, 5) + "  " + d[0] + " " + rechts(d[1], 11) + "  " + datum + "  " + d[2]), "",
            `${gesamt} bytes total (${gesamt - belegt} bytes free)`].join("\n");
  };

  /* ---------- running-config ---------- */
  /* Schein-Hash für „enable secret 5“: sieht aus wie MD5-crypt, ist aber KEIN echter Hash (nur Anzeige). */
  function scheinHash(pw){
    const abc = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"; let x = 2166136261; const o = [];
    for (let i = 0; i < 26; i++) { for (const c of String(pw) + i) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0; } o.push(abc[x % 64]); }
    return "$1$" + o.slice(0, 4).join("") + "$" + o.slice(4).join("");
  }
  C.scheinHash = scheinHash;
  /* Typ-7-Verschleierung (IOS-ähnlich: Form wie echt, Verfahren nur angedeutet – Typ 7 ist ohnehin umkehrbar und kein Schutz) */
  function typ7(pw){ let x = "08"; for (const [i, c] of [...String(pw)].entries()) x += ((c.charCodeAt(0) ^ "dsfd;kfoA,.iyewrkldJKD".charCodeAt((i + 8) % 22)) & 0xff).toString(16).toUpperCase().padStart(2, "0"); return x; }
  C.typ7 = typ7;
  function psZeilen(k){
    const ps = k.portSecurity || k.psVorgabe; if (!ps) return [];
    const z = [];
    if (ps.max != null && ps.max !== 1) z.push(` switchport port-security maximum ${ps.max}`);
    if (ps.verstoss && ps.verstoss !== "shutdown") z.push(` switchport port-security violation ${ps.verstoss}`);
    if (k.portSecurity) z.push(" switchport port-security");
    if (ps.sticky) z.push(" switchport port-security mac-address sticky");
    for (const m of ps.macs || []) z.push(` switchport port-security mac-address ${ps.sticky ? "sticky " : ""}${IP.macCisco(m)}`);
    return z;
  }
  /* Zeilen innerhalb eines interface-Blocks (ohne Kopfzeile) */
  C.ifZeilen = function(g, name, k){
    const art = h.ifArt(g, name), z = [];
    if (!k) return z;
    if (k.beschreibung) z.push(` description ${k.beschreibung}`);
    if (art === "port") {
      if (Number(k.accessVlan) !== 1) z.push(` switchport access vlan ${k.accessVlan}`);
      if (Number(k.nativeVlan) !== 1) z.push(` switchport trunk native vlan ${k.nativeVlan}`);
      if (k.trunkErlaubt !== "all" && Array.isArray(k.trunkErlaubt)) z.push(` switchport trunk allowed vlan ${k.trunkErlaubt.length ? h.vlanListeText(k.trunkErlaubt) : "none"}`);
      if (k.modus === "trunk") z.push(" switchport mode trunk");
      else if (Number(k.accessVlan) !== 1 || k.portSecurity || k.psVorgabe) z.push(" switchport mode access");
      z.push(...psZeilen(k));
      if (k.shutdown) z.push(" shutdown");
      return z;
    }
    if (art === "sub" && k.vlan != null) z.push(` encapsulation dot1Q ${k.vlan}${k.nativ ? " native" : ""}`);
    if (k.ip) z.push(` ip address ${k.ip} ${k.maske}`);
    else if (art !== "sub") z.push(" no ip address");
    if (k.aclIn) z.push(` ip access-group ${k.aclIn} in`);
    if (k.aclOut) z.push(` ip access-group ${k.aclOut} out`);
    for (const x of k.helper || []) z.push(` ip helper-address ${x}`);
    if (k.nat) z.push(` ip nat ${k.nat}`);
    if (k.shutdown) z.push(" shutdown");
    if (art === "phys") z.push(" duplex auto", " speed auto");
    return z;
  };
  function lineZeilen(g, k){
    const l = k.lines || {}, con = l.con || {}, vty = l.vty || {login: true}, z = [];
    const block = (kopf, x) => { z.push(kopf); if (x.passwort) z.push(` password ${k.pwVerschluesseln ? "7 " + typ7(x.passwort) : x.passwort}`); if (x.logsync) z.push(" logging synchronous");
      if (x.login === "local") z.push(" login local"); else if (x.login) z.push(" login"); if (x.transport) z.push(` transport input ${x.transport}`); };
    block("line con 0", con);
    if (g.typ === "router") z.push("line aux 0");
    block("line vty 0 4", vty);
    if (g.typ === "switch") block("line vty 5 15", vty);
    return z;
  }
  C.aclZeilen = function(name, a){
    const std = a.typ === "standard";
    if (a.benannt) return [`ip access-list ${std ? "standard" : "extended"} ${name}`, ...a.regeln.map(r => " " + C.regelText(r, std, "conf"))];
    return a.regeln.map(r => `access-list ${name} ${C.regelText(r, std, "conf")}`);
  };
  C.natZeilen = function(nat){
    const z = [];
    for (const x of (nat && nat.statisch) || [])
      z.push(x.proto ? `ip nat inside source static ${x.proto} ${x.innen} ${x.innenPort} ${x.aussen} ${x.aussenPort}` : `ip nat inside source static ${x.innen} ${x.aussen}`);
    for (const x of (nat && nat.dynamisch) || [])
      z.push(`ip nat inside source list ${x.acl} interface ${h.langName(x.aus)}${x.overload ? " overload" : ""}`);
    return z;
  };
  C.routeZeile = x => `ip route ${x.netz} ${x.maske}` + (x.aus ? ` ${h.langName(x.aus)}` : "") + (x.nh ? ` ${x.nh}` : "") + ((x.ad || 1) !== 1 ? ` ${x.ad}` : "");
  C.poolZeilen = p => [`ip dhcp pool ${p.name}`, ...(p.netz ? [` network ${p.netz} ${p.maske}`] : []),
                       ...(p.gw ? [` default-router ${p.gw}`] : []), ...(p.dns ? [` dns-server ${p.dns}`] : [])];
  C.bannerZeile = text => {
    const d = ["^C", "#", "$", "%", "&"].find(x => !String(text).includes(x)) || "^C";
    return `banner motd ${d}${text}${d}`;
  };
  function iosText(g, k){
    const r = g.typ === "router", z = [];
    z.push("!", `version ${r ? "15.1" : "15.0"}`);
    if (!r) z.push("no service pad");
    z.push("service timestamps debug datetime msec", "service timestamps log datetime msec", k.pwVerschluesseln ? "service password-encryption" : "no service password-encryption", "!",
           `hostname ${k.hostname}`, "!", "boot-start-marker", "boot-end-marker", "!");
    if (k.enableSecret) z.push(`enable secret 5 ${scheinHash(k.enableSecret)}`, "!");
    for (const [n, b] of Object.entries(k.benutzer || {})) z.push(b.art === "password" ? `username ${n} password ${k.pwVerschluesseln ? "7 " + typ7(b.pw) : "0 " + b.pw}` : `username ${n} secret 5 ${scheinHash(b.pw)}`);
    if (Object.keys(k.benutzer || {}).length) z.push("!");
    z.push("no aaa new-model");
    if (!r) z.push("system mtu routing 1500");
    z.push("!");
    if (r) {
      const d = k.dhcp || {};
      if ((d.ausgeschlossen || []).length) { for (const x of d.ausgeschlossen) z.push(`ip dhcp excluded-address ${x.von}${x.bis && x.bis !== x.von ? " " + x.bis : ""}`); z.push("!"); }
      for (const p of d.pools || []) z.push(...C.poolZeilen(p), "!");
    }
    if (k.domainLookup === false) z.push("no ip domain lookup", "!");
    if (k.domainName) z.push(`ip domain-name ${k.domainName}`, "!");
    if (k.sshSchluessel) z.push("ip ssh version 2", "!");
    if (!r) z.push("spanning-tree mode pvst", "spanning-tree extend system-id", "!", "vlan internal allocation policy ascending", "!");
    const namen = r ? h.ifSortieren(Object.keys(k.if || {})) : [...Modell.PORTS.switch, ...h.ifSortieren(Object.keys(k.svi || {}).map(v => "Vlan" + v))];
    for (const n of namen) {
      const ik = r ? k.if[n] : /^Vlan/.test(n) ? k.svi[n.slice(4)] : k.ports[n];
      z.push(`interface ${h.langName(n)}`, ...C.ifZeilen(g, n, ik), "!");
    }
    if (r) {
      z.push("ip forward-protocol nd", "!");
      const nat = C.natZeilen(k.nat), rt = (k.routen || []).map(C.routeZeile);
      if (nat.length || rt.length) z.push(...nat, ...rt, "!");
      const acls = k.acls || {}, reihe = aclReihe(acls);
      const benannt = reihe.filter(n => acls[n].benannt), nummer = reihe.filter(n => !acls[n].benannt);
      for (const n of benannt) z.push(...C.aclZeilen(n, acls[n]), "!");
      if (nummer.length) { for (const n of nummer) z.push(...C.aclZeilen(n, acls[n])); z.push("!"); }
    } else {
      if (k.defaultGateway) z.push(`ip default-gateway ${k.defaultGateway}`);
      z.push("!");
    }
    if (k.banner) z.push(C.bannerZeile(k.banner), "!");
    z.push(...lineZeilen(g, k), "!", "end");
    return z.join("\n");
  }
  /* Firewall: herstellerneutrale Darstellung (konfiguriert wird im Inspektor) */
  function fwText(g, k){
    const z = ["! Firewall-Konfiguration (herstellerneutral, IOS-ähnliche Darstellung)", "!", `hostname ${k.hostname}`, "!"];
    for (const [n, i] of Object.entries(k.if || {})) {
      z.push(`interface ${h.langName(n)}`);
      if (i.zone) z.push(` zone ${i.zone}`);
      z.push(i.ip ? ` ip address ${i.ip} ${i.maske}` : " no ip address");
      if (i.shutdown) z.push(" shutdown");
      z.push("!");
    }
    for (const x of k.routen || []) z.push(C.routeZeile(x).replace(/^ip /, ""));
    if ((k.routen || []).length) z.push("!");
    for (const r of k.regeln || [])
      z.push(`regel ${r.id} von ${r.von} nach ${r.nach} proto ${r.proto} quelle ${r.quelle} ziel ${r.ziel}${r.port ? " port " + r.port : ""} ${r.aktion}${r.aktiv === false ? " inaktiv" : ""}` +
             (r.text ? `   ! ${r.text}` : ""));
    if ((k.regeln || []).length) z.push("regel standard verwerfen   ! implizit am Ende", "!");
    for (const x of (k.nat && k.nat.quellNat) || []) z.push(`nat quelle ${x.von} -> ${x.nach}`);
    for (const x of (k.nat && k.nat.weiterleitung) || []) z.push(`weiterleitung ${x.proto} ${x.aussenPort} -> ${x.ziel}:${x.zielPort}`);
    z.push("!", "end");
    return z.join("\n");
  }
  C.konfigText = function(g, k){
    if (!g || !k) return null;
    if (g.typ === "router" || g.typ === "switch") return iosText(g, k);
    if (g.typ === "firewall") return fwText(g, k);
    return null;
  };
  C.runningConfig = g => C.konfigText(g, g && g.running);
  Z.showRun = (s, ifName) => {
    const g = G(s);
    if (ifName) {
      const ik = h.ifKonfig(g, ifName);
      if (!ik) return {ausgabe: `% ${h.langName(ifName)} ist nicht konfiguriert.`, fehler: true};
      const text = [`interface ${h.langName(ifName)}`, ...C.ifZeilen(g, ifName, ik), "end"].join("\n");
      return `Building configuration...\n\nCurrent configuration : ${text.length} bytes\n!\n${text}`;
    }
    const text = C.runningConfig(g);
    return `Building configuration...\n\nCurrent configuration : ${text.length} bytes\n${text}`;
  };
  Z.showStart = s => {
    const g = G(s);
    if (!g.startup) return {ausgabe: "startup-config is not present", hinweis: "Noch nichts gesichert. „copy running-config startup-config“ (oder „write memory“) sichert die laufende Konfiguration."};
    const text = C.konfigText(g, g.startup);
    return `Using ${text.length} out of ${g.typ === "switch" ? 65536 : 262136} bytes\n${text}`;
  };

  /* ---------- ping / traceroute (IOS) ---------- */
  const unbekannt = (s, ziel) => ({ausgabe: `Translating "${ziel}"` + (K(s).domainLookup !== false ? "...domain server (255.255.255.255)" : "") +
    "\n% Unrecognized host or address, or protocol not running.", fehler: true,
    tipp: "Auf Routern und Switches testest du mit der IP-Adresse – einen DNS-Server kennt das Gerät hier nicht."});
  const keineSim = () => ({ausgabe: "% Die Simulation ist noch nicht geladen.", fehler: true});
  C.iosPing = function(s, ziel, o = {}){
    if (!IP.gueltig(ziel)) return unbekannt(s, ziel);
    const sim = h.sim(); if (!sim || typeof sim.ping !== "function") return keineSim();
    const anzahl = o.anzahl || 5, ip = IP.zuText(IP.zuZahl(ziel));
    const r = sim.ping(s.netz, s.id, ip, {anzahl, ttl: null, quelle: o.quelle || null}) || {};
    const antw = (r.antworten || []).slice(0, anzahl);
    /* IOS-Zeichen (Cisco: „Understanding the Ping and Traceroute Commands“): ! Antwort, . Zeitüberschreitung,
       U Unreachable empfangen, & TTL abgelaufen. Eine lokal gescheiterte ARP-Auflösung zeigt IOS als „.“. */
    const art = a => a.art || (a.ok ? "echo" : a.grund === "TTL_EXPIRED" ? "time-exceeded" : a.von ? "unreachable" : "timeout");
    const zeichen = antw.map(a => art(a) === "echo" ? "!" : art(a) === "time-exceeded" ? "&" : art(a) === "unreachable" && !a.lokal ? "U" : ".").join("");
    const ok = antw.filter(a => art(a) === "echo"), rtt = ok.map(a => Math.round(a.rtt || 0));
    const z = ["Type escape sequence to abort.", `Sending ${anzahl}, 100-byte ICMP Echos to ${ip}, timeout is 2 seconds:`];
    if (o.quelle) z.push(`Packet sent with a source address of ${o.quelle} `);
    for (let i = 0; i < zeichen.length; i += 70) z.push(zeichen.slice(i, i + 70));
    let quote = `Success rate is ${Math.floor(ok.length * 100 / anzahl)} percent (${ok.length}/${anzahl})`;
    if (ok.length) quote += `, round-trip min/avg/max = ${Math.min(...rtt)}/${Math.floor(rtt.reduce((a, b) => a + b, 0) / rtt.length)}/${Math.max(...rtt)} ms`;
    z.push(quote);
    let hinweis = null;
    if (zeichen[0] === "." && ok.length) hinweis = "Das erste Paket ging verloren, weil erst ARP die MAC-Adresse auflösen musste. Beim nächsten Ping steht sie im Cache.";
    else if (!ok.length) hinweis = "„.“ heißt: keine Antwort in 2 Sekunden. „U“ heißt: ein Router meldet „nicht erreichbar“. Wo es hakt, zeigt die Simulation unten Schritt für Schritt.";
    return {ausgabe: z.join("\n"), trace: r.trace || null, hinweis};
  };
  const TR_CODE = {host: "!H", net: "!N", admin: "!A", port: "!P"};
  const TR_GRUND = {ACL_DENY: "!A", FW_DENY: "!A", NO_ROUTE: "!N", HOST_UNREACHABLE: "!H", ARP_NO_REPLY: "!H"};
  C.iosTraceroute = function(s, ziel){
    if (!IP.gueltig(ziel)) return unbekannt(s, ziel);
    const sim = h.sim(); if (!sim || typeof sim.traceroute !== "function") return keineSim();
    const ip = IP.zuText(IP.zuZahl(ziel));
    const r = sim.traceroute(s.netz, s.id, ip, {maxHops: 30}) || {};
    const z = ["Type escape sequence to abort.", `Tracing the route to ${ip}`, "VRF info: (vrf in name/id, vrf out name/id)"];
    for (const hop of r.hops || []) {
      const nr = rechts(hop.nr, 3);
      if (!hop.ip) { z.push(`${nr}  *  *  * `); continue; }
      const sym = hop.grund && hop.grund !== "TTL_EXPIRED" && hop.grund !== "TIMEOUT" && (TR_CODE[hop.code] || TR_GRUND[hop.grund]);
      if (sym) { z.push(`${nr} ${hop.ip} ${sym}  ${sym}  ${sym} `); continue; }
      const rtts = hop.rtts && hop.rtts.length ? hop.rtts.slice(0, 3) : [hop.rtt != null ? hop.rtt : 2 * hop.nr];
      while (rtts.length < 3) rtts.push(rtts[rtts.length - 1]);
      z.push(`${nr} ${hop.ip} ` + rtts.map(t => t == null ? "*" : `${Math.round(t)} msec`).join(" "));
    }
    return {ausgabe: z.join("\n"), trace: r.trace || null,
      hinweis: "Jede Zeile ist ein Router auf dem Weg. „*“ = keine Antwort (TTL-Test ohne Rückmeldung), „!H/!N/!A“ = Host/Netz nicht erreichbar bzw. von einer ACL verboten."};
  };
})();
