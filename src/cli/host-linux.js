"use strict";
/* ---------- Konsole: Linux-ähnliche Shell (bash) für Server/NAS (Phase C) ----------
   Ausgaben nach Debian/Ubuntu (iproute2, iputils-ping, traceroute, dig, ss, systemctl) – vereinfacht und als
   „Linux-ähnlich“ markiert, wo nicht exakt belegt. Ändern geht nur mit sudo: „sudo ip addr add/flush“, „sudo ip route
   add/del default“, „sudo ip link set eth0 up|down“, „sudo systemctl start|stop|restart Dienst“ – über den Verlauf.
   sudo fragt im Labor nicht nach einem Passwort. tcpdump zeigt die Pakete der letzten Simulation an diesem Gerät. */
(() => {
  const C = CLI, h = C.h;
  C.HOST_BEFEHLE ||= {};
  const H = () => C.host;
  const G = s => h.geraet(s);
  const links = h.links;
  const SIM_FEHLT = {ausgabe: "(Die Simulation ist noch nicht geladen.)", fehler: true};
  /* Dienstnamen unter Linux → Labor-Dienst */
  const UNITS = {apache2: "http", httpd: "http", nginx: "http", named: "dns", bind9: "dns", dnsmasq: "dns", "isc-dhcp-server": "dhcp", dhcpd: "dhcp",
    smbd: "datei", samba: "datei", ssh: "ssh", sshd: "ssh", cups: "druck"};
  const UNIT_NAME = {http: "apache2", dns: "named", dhcp: "isc-dhcp-server", datei: "smbd", ssh: "ssh", druck: "cups", https: "apache2"};
  const UNIT_TEXT = {apache2: "The Apache HTTP Server", named: "BIND Domain Name Server", "isc-dhcp-server": "ISC DHCP IPv4 server", smbd: "Samba SMB Daemon", ssh: "OpenBSD Secure Shell server", cups: "CUPS Scheduler"};
  const mac = s => ((G(s).hw.macs || {}).eth0 || "00:00:00:00:00:00").toLowerCase();
  const praefix = m => IP.maskeGueltig(m || "") ? IP.praefix(m) : null;

  /* ---------- ip ---------- */
  function ipAddr(s){
    const g = G(s), k = g.running.if.eth0 || {}, oben = H().linkOben(s), aktiv = k.an !== false, a = H().adresse(s, "eth0");
    const flags = !aktiv ? "<BROADCAST,MULTICAST>" : oben ? "<BROADCAST,MULTICAST,UP,LOWER_UP>" : "<NO-CARRIER,BROADCAST,MULTICAST,UP>";
    const z = ["1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000", "    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00",
      "    inet 127.0.0.1/8 scope host lo", "       valid_lft forever preferred_lft forever",
      `2: eth0: ${flags} mtu 1500 qdisc fq_codel state ${aktiv && oben ? "UP" : "DOWN"} group default qlen 1000`, `    link/ether ${mac(s)} brd ff:ff:ff:ff:ff:ff`];
    if (aktiv && oben && a.ip && praefix(a.maske) != null) {
      const dyn = a.quelle === "dhcp";
      z.push(`    inet ${a.ip}/${praefix(a.maske)} brd ${IP.broadcast(a.ip, a.maske)} scope ${a.quelle === "apipa" ? "link" : "global"}${dyn ? " dynamic" : ""} eth0`,
             dyn ? "       valid_lft 86234sec preferred_lft 86234sec" : "       valid_lft forever preferred_lft forever");
    }
    const ok = aktiv && oben && !!a.ip;
    return {ausgabe: z.join("\n"), befund: !aktiv ? "eth0 ist abgeschaltet (DOWN)" : !oben ? "eth0: NO-CARRIER – kein Link" : a.ip ? `eth0 ${a.ip}/${praefix(a.maske)}${a.quelle === "apipa" ? " (APIPA)" : ""}` : "eth0 ohne IPv4-Adresse", ok};
  }
  function ipLink(s){
    const k = G(s).running.if.eth0 || {}, oben = H().linkOben(s), aktiv = k.an !== false;
    return ["1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000", "    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00",
      `2: eth0: ${!aktiv ? "<BROADCAST,MULTICAST>" : oben ? "<BROADCAST,MULTICAST,UP,LOWER_UP>" : "<NO-CARRIER,BROADCAST,MULTICAST,UP>"} mtu 1500 qdisc fq_codel state ${aktiv && oben ? "UP" : "DOWN"} mode DEFAULT group default qlen 1000`,
      `    link/ether ${mac(s)} brd ff:ff:ff:ff:ff:ff`].join("\n");
  }
  function ipRoute(s){
    const a = H().adresse(s, "eth0"), z = [];
    if (a.ip && H().linkOben(s) && praefix(a.maske) != null) {
      if (a.gw) z.push(`default via ${a.gw} dev eth0 proto ${a.quelle === "dhcp" ? "dhcp" : "static"}`);
      z.push(`${IP.cidr(a.ip, a.maske)} dev eth0 proto kernel scope link src ${a.ip}`);
    }
    return {ausgabe: z.join("\n"), befund: a.gw ? `default via ${a.gw}` : "keine Default-Route", ok: !!a.gw};
  }
  function ip(s, args, root){
    const w = args.map(x => x.toLowerCase()), obj = w[0] || "", rest = w.slice(1);
    const ist = (x, ...l) => l.some(v => v.startsWith(x) && x.length >= 1);
    if (!obj || obj === "help") return "Usage: ip [ OPTIONS ] OBJECT { COMMAND | help }\n       OBJECT := { address | route | link }";
    if (ist(obj, "address", "addr", "a")) {
      const cmd = rest[0] || "show";
      if (["show", "list", "ls"].includes(cmd) || cmd === "s") return ipAddr(s);
      if (cmd === "add" || cmd === "flush" || cmd === "del" || cmd === "delete") {
        if (!root) return {ausgabe: "RTNETLINK answers: Operation not permitted", fehler: true, tipp: "Ändern braucht Root-Rechte: „sudo ip addr …“."};
        if (cmd === "flush" || cmd === "del" || cmd === "delete") {
          const geaendert = H().aendern(s, "ip addr flush – Adresse entfernt", () => { Modell.setzen(s.netz, s.id, "if.eth0.ip", ""); Modell.setzen(s.netz, s.id, "if.eth0.maske", ""); });
          return {ausgabe: "", geaendert};
        }
        const m = /^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/.exec(rest[1] || "");
        if (!m || !IP.gueltig(m[1]) || +m[2] > 32) return {ausgabe: `Error: any valid prefix is expected rather than "${rest[1] || ""}".`, fehler: true, tipp: "Schreibweise: sudo ip addr add 192.168.1.5/24 dev eth0"};
        const dev = rest[rest.indexOf("dev") + 1];
        if (rest.indexOf("dev") < 0 || dev !== "eth0") return {ausgabe: `Cannot find device "${dev || ""}"`, fehler: true};
        const geaendert = H().aendern(s, `ip addr add ${m[1]}/${m[2]}`, () => {
          Modell.setzen(s.netz, s.id, "if.eth0.dhcp", false);
          Modell.setzen(s.netz, s.id, "if.eth0.ip", IP.zuText(IP.zuZahl(m[1])));
          Modell.setzen(s.netz, s.id, "if.eth0.maske", IP.maske(+m[2]));
        });
        return {ausgabe: "", geaendert, hinweis: "Im Labor hat eth0 genau eine Adresse – „add“ ersetzt die bisherige (echtes Linux würde eine zweite dazulegen)."};
      }
      return {ausgabe: `Command "${cmd}" is unknown, try "ip address help".`, fehler: true};
    }
    if (ist(obj, "route", "r")) {
      const cmd = rest[0] || "show";
      if (["show", "list", "ls"].includes(cmd)) return ipRoute(s);
      if (cmd === "add" || cmd === "del" || cmd === "delete" || cmd === "replace") {
        if (!root) return {ausgabe: "RTNETLINK answers: Operation not permitted", fehler: true, tipp: "Ändern braucht Root-Rechte: „sudo ip route …“."};
        if (rest[1] !== "default" && rest[1] !== "0.0.0.0/0") return {ausgabe: "(Linux-ähnlich: Im Labor wirkt am Rechner nur die Default-Route – „sudo ip route add default via GATEWAY“.)", fehler: true};
        if (cmd === "del" || cmd === "delete") { const geaendert = H().aendern(s, "ip route del default", () => Modell.setzen(s.netz, s.id, "if.eth0.gw", "")); return {ausgabe: "", geaendert}; }
        const gw = rest[rest.indexOf("via") + 1];
        if (rest.indexOf("via") < 0 || !IP.gueltig(gw || "")) return {ausgabe: "Error: inet prefix is expected rather than \"" + (gw || "") + "\".", fehler: true};
        if (cmd === "add" && (G(s).running.if.eth0 || {}).gw) return {ausgabe: "RTNETLINK answers: File exists", fehler: true, tipp: "Es gibt schon eine Default-Route. „sudo ip route replace default via …“ ersetzt sie (oder erst „del“)."};
        const geaendert = H().aendern(s, `ip route ${cmd} default via ${gw}`, () => Modell.setzen(s.netz, s.id, "if.eth0.gw", IP.zuText(IP.zuZahl(gw))));
        return {ausgabe: "", geaendert};
      }
      return {ausgabe: `Command "${cmd}" is unknown, try "ip route help".`, fehler: true};
    }
    if (ist(obj, "link", "l")) {
      if (rest[0] === "set") {
        if (!root) return {ausgabe: "RTNETLINK answers: Operation not permitted", fehler: true, tipp: "„sudo ip link set eth0 up“"};
        if (rest[1] !== "eth0" || !["up", "down"].includes(rest[2])) return {ausgabe: "Syntax: sudo ip link set eth0 up|down", fehler: true};
        const geaendert = H().aendern(s, `ip link set eth0 ${rest[2]}`, () => Modell.setzen(s.netz, s.id, "if.eth0.an", rest[2] === "up"));
        return {ausgabe: "", geaendert};
      }
      return ipLink(s);
    }
    return {ausgabe: `Object "${obj}" is unknown, try "ip help".`, fehler: true};
  }

  /* ---------- ping, traceroute ---------- */
  function ping(s, args){
    let anzahl = null, ziel = null;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "-c") { const n = parseInt(args[++i], 10); if (!(n >= 1)) return {ausgabe: `ping: invalid argument: '${args[i] || ""}'`, fehler: true}; anzahl = Math.min(n, 100); }
      else if (args[i] === "-W" || args[i] === "-i" || args[i] === "-s") i++;
      else if (args[i][0] !== "-") ziel = args[i];
    }
    if (!ziel) return {ausgabe: "ping: usage error: Destination address required", fehler: true};
    const sim = h.sim(); if (!sim || typeof sim.ping !== "function") return SIM_FEHLT;
    const n = H().aufloesen(s, ziel);
    if (n.fehlt) return {ausgabe: `ping: ${ziel}: Temporary failure in name resolution`, fehler: true, trace: n.trace, befund: `Name „${ziel}“ nicht auflösbar`, ok: false};
    const lokal = H().lokalerFehler(s, n.ip);
    if (lokal && /Gateway|Adresse/.test(lokal)) return {ausgabe: "ping: connect: Network is unreachable", fehler: true, befund: "Network is unreachable – keine Route", ok: false,
      tipp: lokal + " „ip a“ und „ip r“ zeigen Adresse und Default-Route."};
    const k = anzahl || 4;
    const r = sim.ping(s.netz, s.id, n.ip, {anzahl: k}) || {}, a = H().adresse(s, "eth0");
    const z = [`PING ${n.name || n.ip} (${n.ip}) 56(84) bytes of data.`], rtts = [];
    let empfangen = 0, fehler = 0;
    (r.antworten || []).slice(0, k).forEach((x, i) => {
      const art = x.art || (x.ok ? "echo" : x.von ? "unreachable" : "timeout");
      if (art === "echo") { const t = Math.max(0.1, x.rtt || 0.5); rtts.push(t); empfangen++; z.push(`64 bytes from ${x.von || n.ip}: icmp_seq=${i + 1} ttl=${x.ttl != null ? x.ttl : 64} time=${t.toFixed(2)} ms`); }
      else if (art === "unreachable" || art === "fehler") { fehler++; z.push(`From ${x.von || a.ip || "?"} icmp_seq=${i + 1} Destination ${x.code === "net" ? "Net" : "Host"} Unreachable`); }
      else if (art === "time-exceeded") { fehler++; z.push(`From ${x.von} icmp_seq=${i + 1} Time to live exceeded`); }
    });
    const verloren = k - empfangen;
    z.push("", `--- ${n.name || n.ip} ping statistics ---`, `${k} packets transmitted, ${empfangen} received, ${fehler ? `+${fehler} errors, ` : ""}${Math.round(verloren * 100 / k)}% packet loss, time ${(k - 1) * 1001}ms`);
    if (rtts.length) { const avg = rtts.reduce((x, y) => x + y, 0) / rtts.length; z.push(`rtt min/avg/max/mdev = ${Math.min(...rtts).toFixed(3)}/${avg.toFixed(3)}/${Math.max(...rtts).toFixed(3)}/0.050 ms`); }
    if (!anzahl) z.push("(Im Labor nach 4 Paketen beendet – ohne „-c“ pingt Linux, bis du Strg+C drückst.)");
    return Object.assign({ausgabe: z.join("\n"), trace: r.trace || null, fehler: !empfangen}, H().pingBefund(r, k), {ziel: n.ip});
  }
  function traceroute(s, args){
    const ziel = args.find(a => a[0] !== "-");
    if (!ziel) return {ausgabe: "Usage: traceroute [ -n ] host", fehler: true};
    const sim = h.sim(); if (!sim || typeof sim.traceroute !== "function") return SIM_FEHLT;
    const n = H().aufloesen(s, ziel);
    if (n.fehlt) return {ausgabe: `${ziel}: Temporary failure in name resolution\nCannot handle "host" cmdline arg \`${ziel}' on position 1 (argc 1)`, fehler: true, trace: n.trace, befund: `Name „${ziel}“ nicht auflösbar`, ok: false};
    const r = sim.traceroute(s.netz, s.id, n.ip, {maxHops: 30}) || {}, z = [`traceroute to ${n.name || n.ip} (${n.ip}), 30 hops max, 60 byte packets`];
    let letzter = null;
    for (const hop of r.hops || []) {
      if (!hop.ip) { z.push(`${String(hop.nr).padStart(2)}  * * *`); continue; }
      const t = (hop.rtts && hop.rtts.length ? hop.rtts : [2 * hop.nr]).slice(0, 3); while (t.length < 3) t.push(t[t.length - 1]);
      const fehlerZeichen = hop.code || (hop.grund && hop.grund !== "TTL_EXPIRED" && hop.grund !== "TIMEOUT") ? (hop.code === "net" || hop.grund === "NO_ROUTE" ? " !N" : " !H") : "";
      z.push(`${String(hop.nr).padStart(2)}  ${hop.ip} (${hop.ip})  ${t.map(x => Math.max(0.1, x).toFixed(3) + " ms" + fehlerZeichen).join("  ")}`);
      letzter = hop.ip;
      if (fehlerZeichen) break;
    }
    return {ausgabe: z.join("\n"), trace: r.trace || null, ok: !!r.ok, befund: r.ok ? `Ziel erreicht nach ${(r.hops || []).length} Hops` : `endet bei ${letzter || "Hop 1"}`};
  }

  /* ---------- DNS: dig, nslookup, host ---------- */
  function dnsFragen(s, name){
    const a = H().adresse(s, "eth0");
    if (!a.dns) return {keinServer: true};
    const sim = h.sim(); if (!sim || typeof sim.dns !== "function") return null;
    return Object.assign({server: a.dns}, sim.dns(s.netz, s.id, name) || {});
  }
  function dig(s, args){
    const name = args.find(a => a[0] !== "-" && a[0] !== "+" && a[0] !== "@");
    if (!name) return ";; Usage: dig [@server] name [type]";
    const d = dnsFragen(s, name);
    if (!d) return SIM_FEHLT;
    if (d.keinServer) return {ausgabe: ";; no servers could be reached", fehler: true, befund: "kein DNS-Server in /etc/resolv.conf", ok: false};
    const kopf = [`; <<>> DiG 9.18 (Labor) <<>> ${name}`, ";; global options: +cmd", ";; Got answer:"];
    if (d.ok) return {ausgabe: [...kopf, `;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 4711`, ";; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1", "",
      ";; QUESTION SECTION:", `;${name}.\t\t\tIN\tA`, "", ";; ANSWER SECTION:", `${name}.\t\t300\tIN\tA\t${d.ip}`, "", ";; Query time: 2 msec", `;; SERVER: ${d.server}#53(${d.server}) (UDP)`].join("\n"),
      trace: d.trace, befund: `${name} → ${d.ip}`, ok: true};
    if (d.grund === "DNS_FAIL") return {ausgabe: [...kopf, `;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 4711`, ";; flags: qr rd ra; QUERY: 1, ANSWER: 0, AUTHORITY: 0, ADDITIONAL: 1", "",
      ";; QUESTION SECTION:", `;${name}.\t\t\tIN\tA`, "", `;; SERVER: ${d.server}#53(${d.server}) (UDP)`].join("\n"), trace: d.trace, fehler: true, befund: `${name}: NXDOMAIN (Name unbekannt)`, ok: false};
    return {ausgabe: [`;; communications error to ${d.server}#53: timed out`, `;; communications error to ${d.server}#53: timed out`, "", `; <<>> DiG 9.18 (Labor) <<>> ${name}`, ";; global options: +cmd", ";; no servers could be reached"].join("\n"),
      trace: d.trace, fehler: true, befund: `${name}: DNS-Server ${d.server} antwortet nicht`, ok: false};
  }
  function nslookup(s, args){
    const name = args.find(a => a[0] !== "-");
    if (!name) return {ausgabe: "(Im Labor bitte mit Namen: nslookup www.beispiel.de)", fehler: true};
    const d = dnsFragen(s, name);
    if (!d) return SIM_FEHLT;
    if (d.keinServer) return {ausgabe: ";; connection timed out; no servers could be reached", fehler: true, befund: "kein DNS-Server eingetragen", ok: false};
    const kopf = [`Server:\t\t${d.server}`, `Address:\t${d.server}#53`, ""];
    if (d.ok) return {ausgabe: [...kopf, "Non-authoritative answer:", `Name:\t${name}`, `Address: ${d.ip}`, ""].join("\n"), trace: d.trace, befund: `${name} → ${d.ip}`, ok: true};
    if (d.grund === "DNS_FAIL") return {ausgabe: [...kopf, `** server can't find ${name}: NXDOMAIN`].join("\n"), trace: d.trace, fehler: true, befund: `${name}: NXDOMAIN`, ok: false};
    return {ausgabe: ";; connection timed out; no servers could be reached", trace: d.trace, fehler: true, befund: `${name}: DNS-Server antwortet nicht`, ok: false};
  }
  function host(s, args){
    const name = args.find(a => a[0] !== "-");
    if (!name) return "Usage: host [-v] name";
    const d = dnsFragen(s, name);
    if (!d) return SIM_FEHLT;
    if (d.keinServer || (!d.ok && d.grund !== "DNS_FAIL")) return {ausgabe: ";; connection timed out; no servers could be reached", fehler: true, trace: d.trace, befund: `${name}: kein DNS-Server erreichbar`, ok: false};
    if (!d.ok) return {ausgabe: `Host ${name} not found: 3(NXDOMAIN)`, fehler: true, trace: d.trace, befund: `${name}: NXDOMAIN`, ok: false};
    return {ausgabe: `${name} has address ${d.ip}`, trace: d.trace, befund: `${name} → ${d.ip}`, ok: true};
  }

  /* ---------- ss, curl, systemctl, tcpdump ---------- */
  function ss(s, root){
    const d = H().dienste(s).filter(x => x.an), z = [links("Netid", 6) + links("State", 8) + "Recv-Q Send-Q   Local Address:Port    Peer Address:Port Process"];
    for (const x of d) z.push(links(x.proto, 6) + links(x.proto === "tcp" ? "LISTEN" : "UNCONN", 8) + "0      " + (x.proto === "tcp" ? "511" : "0  ") + "    " +
      links(`0.0.0.0:${x.port}`, 22) + links("0.0.0.0:*", 18) + (root ? `users:(("${UNIT_NAME[x.dienst] || x.dienst}",pid=${700 + x.port % 300},fd=4))` : ""));
    return {ausgabe: z.join("\n"), befund: d.length ? "lauscht auf " + d.map(x => `${x.proto}/${x.port}`).join(", ") : "kein Dienst lauscht", ok: d.length > 0,
      hinweis: root ? null : "Die Spalte „Process“ füllt sich nur mit sudo."};
  }
  function curl(s, args){
    const kopf = args.some(a => a === "-I" || a === "--head"), url = args.find(a => !a.startsWith("-"));
    if (!url) return {ausgabe: "curl: try 'curl --help' or 'curl --manual' for more information", fehler: true};
    const sim = h.sim(); if (!sim || typeof sim.http !== "function") return SIM_FEHLT;
    const r = sim.http(s.netz, s.id, url) || {};
    const hostName = String(url).replace(/^https?:\/\//i, "").split(/[\/:]/)[0], port = /^https:/i.test(url) ? 443 : 80;
    if (r.ok) return {ausgabe: kopf ? "HTTP/1.1 200 OK\nServer: Labor-Webserver\nContent-Type: text/html; charset=utf-8" : H().seite(hostName, r.ziel || ""), trace: r.trace, befund: `HTTP 200 von ${hostName}`, ok: true};
    if (!r.ziel) return {ausgabe: `curl: (6) Could not resolve host: ${hostName}`, fehler: true, trace: r.trace, befund: `curl: Name „${hostName}“ nicht auflösbar`, ok: false};
    const abgelehnt = r.grund === "PORT_CLOSED" || r.grund === "SERVICE_OFF";
    return {ausgabe: abgelehnt ? `curl: (7) Failed to connect to ${hostName} port ${port} after 2 ms: Couldn't connect to server` : `curl: (28) Failed to connect to ${hostName} port ${port} after 21000 ms: Timed out`,
      fehler: true, trace: r.trace, befund: abgelehnt ? `Port ${port} geschlossen` : `keine Antwort von ${hostName}:${port}`, ok: false};
  }
  function systemctl(s, args, root){
    const cmd = (args[0] || "").toLowerCase(), unit = String(args[1] || "").replace(/\.service$/, "");
    if (!cmd || cmd === "list-units") {
      const z = ["  UNIT                         LOAD   ACTIVE   SUB     DESCRIPTION"];
      for (const x of H().dienste(s)) { const u = UNIT_NAME[x.dienst]; if (u && !z.some(l => l.includes(u + ".service"))) z.push("  " + links(u + ".service", 29) + "loaded " + links(x.an ? "active" : "inactive", 9) + links(x.an ? "running" : "dead", 8) + (UNIT_TEXT[u] || u)); }
      return z.join("\n");
    }
    const dienst = UNITS[unit];
    if (!["status", "start", "stop", "restart", "enable", "disable", "is-active"].includes(cmd)) return {ausgabe: `Unknown command verb ${cmd}.`, fehler: true};
    if (!unit) return {ausgabe: "Too few arguments.", fehler: true};
    const cfg = dienst ? (G(s).running.dienste || {})[dienst] : null;
    if (!dienst || !cfg) return {ausgabe: `Unit ${unit}.service could not be found.`, fehler: true, tipp: "Dienste im Labor: " + Object.keys(UNIT_NAME).map(d => UNIT_NAME[d]).filter((v, i, l) => l.indexOf(v) === i).join(", ")};
    const name = UNIT_NAME[dienst];
    if (cmd === "status" || cmd === "is-active") {
      if (cmd === "is-active") return {ausgabe: cfg.an ? "active" : "inactive", fehler: !cfg.an, befund: `${name}: ${cfg.an ? "active" : "inactive"}`, ok: !!cfg.an};
      return {ausgabe: [`${cfg.an ? "●" : "○"} ${name}.service - ${UNIT_TEXT[name] || name}`, `     Loaded: loaded (/lib/systemd/system/${name}.service; enabled; preset: enabled)`,
        cfg.an ? "     Active: active (running)" : "     Active: inactive (dead)"].join("\n"), befund: `${name}: ${cfg.an ? "active (running)" : "inactive (dead)"}`, ok: !!cfg.an};
    }
    if (!root) return {ausgabe: `Failed to ${cmd} ${name}.service: Interactive authentication required.\nSee system logs and 'systemctl status ${name}.service' for details.`, fehler: true, tipp: `Dienste steuern braucht Root-Rechte: „sudo systemctl ${cmd} ${name}“.`};
    if (cmd === "enable" || cmd === "disable") return `${cmd === "enable" ? "Created symlink" : "Removed"} /etc/systemd/system/multi-user.target.wants/${name}.service.`;
    const an = cmd !== "stop";
    const geaendert = H().aendern(s, `systemctl ${cmd} ${name}`, () => Modell.setzen(s.netz, s.id, `dienste.${dienst}.an`, an));
    return {ausgabe: "", geaendert};
  }
  const tcpdumpZeile = (e, t) => {
    const f = e.frame || {}, ip = f.ip, zeit = `00:00:${String(Math.floor(t)).padStart(2, "0")}.${String(Math.round((t % 1) * 1e6)).padStart(6, "0")}`;
    if (f.arp) return `${zeit} ARP, ${f.arp.op === "request" ? `Request who-has ${f.arp.targetIp} tell ${f.arp.senderIp}` : `Reply ${f.arp.senderIp} is-at ${String(f.arp.senderMac).toLowerCase()}`}, length 28`;
    if (!ip) return null;
    if (f.icmp) return `${zeit} IP ${ip.src} > ${ip.dst}: ICMP ${({"echo-request": "echo request", "echo-reply": "echo reply", unreachable: "host unreachable", "time-exceeded": "time exceeded in-transit"})[f.icmp.typ] || f.icmp.typ}, id 1, seq ${f.icmp.seq || 1}, length 64`;
    if (f.app && f.app.proto === "DNS") return `${zeit} IP ${ip.src}.${(f.udp || {}).src || 53} > ${ip.dst}.${(f.udp || {}).dst || 53}: ${f.app.info}`;
    if (f.tcp) return `${zeit} IP ${ip.src}.${f.tcp.src} > ${ip.dst}.${f.tcp.dst}: Flags [${(f.tcp.flags || []).map(x => ({SYN: "S", ACK: ".", FIN: "F", RST: "R", PSH: "P"})[x] || x).join("")}], length 0`;
    if (f.udp) return `${zeit} IP ${ip.src}.${f.udp.src} > ${ip.dst}.${f.udp.dst}: UDP${f.app ? ", " + f.app.info : ""}`;
    return `${zeit} IP ${ip.src} > ${ip.dst}: ${ip.proto}`;
  };
  function tcpdump(s, root){
    if (!root) return {ausgabe: "tcpdump: eth0: You don't have permission to perform this capture on that device\n(socket: Operation not permitted)", fehler: true, tipp: "Mitschneiden braucht Root-Rechte: „sudo tcpdump -n“."};
    const t = H().letzteTrace(s.netz);
    const ev = t ? (t.ereignisse || []).filter(e => (e.geraet === s.id && (e.art === "empfangen" || e.art === "antworten")) || (e.art === "senden" && (e.geraet === s.id || (e.nach && e.nach.geraet === s.id)))) : [];
    const z = ["tcpdump: verbose output suppressed, use -v[v]... for full protocol decode", "listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes"];
    const zeilen = []; for (const e of ev) { const l = tcpdumpZeile(e, (e.t || 0) / 1000); if (l && zeilen[zeilen.length - 1] !== l) zeilen.push(l); }
    z.push(...zeilen.slice(0, 40), "^C", `${zeilen.length} packets captured`, `${zeilen.length} packets received by filter`, "0 packets dropped by kernel");
    if (!t) z.push("(Noch keine Simulation – erst pingen oder eine Seite abrufen, dann mitschneiden.)");
    return {ausgabe: z.join("\n"), befund: `${zeilen.length} Pakete an eth0 mitgeschnitten`, ok: zeilen.length > 0};
  }

  const HILFE = ["Befehle in dieser Shell (Linux-ähnlich; Ändern nur mit sudo):",
    "  ip a  ·  ip r  ·  ip link                   Adresse, Routen (Default-Route = Gateway), Link",
    "  sudo ip addr add IP/PRÄFIX dev eth0       Adresse setzen   (sudo ip addr flush dev eth0: entfernen)",
    "  sudo ip route add default via GATEWAY     Gateway setzen   (… replace / del default)",
    "  sudo ip link set eth0 up|down             Schnittstelle an/aus",
    "  ping -c 4 Ziel  ·  traceroute Ziel         Erreichbarkeit, Weg",
    "  dig Name  ·  nslookup Name  ·  host Name   DNS fragen",
    "  cat /etc/resolv.conf  ·  cat /etc/hosts    eingetragener DNS-Server, lokale Namen",
    "  ss -tulpn                                  lauschende Dienste",
    "  systemctl status|start|stop|restart DIENST (apache2, named, isc-dhcp-server, smbd, ssh, cups)",
    "  curl http://Name  ·  sudo tcpdump -n       Webseite abrufen · Pakete der letzten Simulation",
    "  hostnamectl · whoami · clear"].join("\n");
  function befehl(s, w, root){
    const cmd = (w[0] || "").toLowerCase(), args = w.slice(1);
    switch (cmd) {
      case "ip": return ip(s, args, root);
      case "ifconfig": return {ausgabe: "-bash: ifconfig: command not found", fehler: true, tipp: "ifconfig ist veraltet und oft nicht installiert – heute heißt es „ip a“."};
      case "ping": return ping(s, args);
      case "traceroute": case "tracepath": return traceroute(s, args);
      case "dig": return dig(s, args);
      case "nslookup": return nslookup(s, args);
      case "host": return host(s, args);
      case "ss": case "netstat": return ss(s, root);
      case "curl": case "wget": return curl(s, args);
      case "systemctl": case "service": return cmd === "service" ? systemctl(s, [args[1], args[0]], root) : systemctl(s, args, root);
      case "tcpdump": return tcpdump(s, root);
      case "cat": {
        const datei = args[0] || "";
        if (datei === "/etc/resolv.conf") { const a = H().adresse(s, "eth0"); return {ausgabe: `# Labor: von der Netzwerkkonfiguration geschrieben\n${a.dns ? "nameserver " + a.dns : "# (kein DNS-Server eingetragen)"}`, befund: a.dns ? `nameserver ${a.dns}` : "kein nameserver", ok: !!a.dns}; }
        if (datei === "/etc/hosts") return `127.0.0.1\tlocalhost\n127.0.1.1\t${String(G(s).running.hostname).toLowerCase()}`;
        if (datei === "/etc/hostname") return String(G(s).running.hostname).toLowerCase();
        return {ausgabe: `cat: ${datei || "''"}: No such file or directory`, fehler: true};
      }
      case "hostnamectl": return [` Static hostname: ${String(G(s).running.hostname).toLowerCase()}`, "       Icon name: computer-server", "Operating System: Linux (Labor-Nachbau)", "          Kernel: Linux 6.1"].join("\n");
      case "hostname": return String(G(s).running.hostname).toLowerCase();
      case "whoami": return root ? "root" : "admin";
      case "clear": return {ausgabe: "", leeren: true};
      case "help": case "man": return HILFE;
      case "exit": case "logout": if (s.root) { s.root = false; return ""; } return {ausgabe: "", hinweis: "Das Terminal bleibt im Spiel offen."};
      default: return null;
    }
  }
  C.HOST_BEFEHLE.linux = {
    _eingabe(s, t){
      let w = t.split(/\s+/), root = !!s.root;
      if (w[0] === "sudo") {
        w = w.slice(1);
        if (!w.length) return "usage: sudo command";
        if (w[0] === "-i" || w[0] === "su") { s.root = true; return ""; }
        root = true;
      }
      if (w.includes("--help") || w.includes("-h")) return HILFE;
      return befehl(s, w, root) || {unbekannt: true};
    },
    _namen: () => ["ip", "ping", "traceroute", "dig", "nslookup", "host", "ss", "curl", "systemctl", "tcpdump", "cat", "hostnamectl", "hostname", "whoami", "clear", "help", "sudo", "exit"],
    _optionen(s, z){
      const o = /^(\s*(?:sudo\s+)?ip\s+)(\S*)$/i.exec(z);
      if (o) return {vor: o[1], kand: ["address", "route", "link"].filter(x => x.startsWith(o[2].toLowerCase()))};
      const c = /^(\s*(?:sudo\s+)?cat\s+)(\S*)$/i.exec(z);
      if (c) return {vor: c[1], kand: ["/etc/resolv.conf", "/etc/hosts", "/etc/hostname"].filter(x => x.startsWith(c[2]))};
      const d = /^(\s*(?:sudo\s+)?systemctl\s+)(\S*)$/i.exec(z);
      if (d) return {vor: d[1], kand: ["status", "start", "stop", "restart"].filter(x => x.startsWith(d[2].toLowerCase()))};
      return null;
    },
  };
})();
