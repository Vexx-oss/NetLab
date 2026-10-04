"use strict";
/* ---------- Konsole: Windows-artige Eingabeaufforderung (cmd) + PowerShell-Auszug (Phase C) ----------
   Texte nach deutschem Windows 10/11 (ipconfig, ping, tracert, arp -a, route print, netstat, netsh). Was nicht sicher belegt
   ist, ist schlicht gehalten und im Code als „Windows-ähnlich“ markiert. Konfiguration ändern netsh und route (über den
   Verlauf – Rückgängig geht); ipconfig /release und /renew ändern nur die Laufzeit (netz.zustand bzw. Sim.dhcp).
   „powershell“ wechselt in den PowerShell-Auszug (Test-NetConnection, Resolve-DnsName, Get-NetIPConfiguration), „exit“ zurück. */
(() => {
  const C = CLI, h = C.h;
  C.HOST_BEFEHLE ||= {};
  const H = () => C.host;
  const G = s => h.geraet(s);
  const links = h.links, rechts = h.rechts;
  const ADAPTER = p => p === "eth0" ? "Ethernet" : "Ethernet " + (Number(String(p).replace(/\D/g, "")) + 1);
  const PORT_VON = name => { const n = String(name || "").trim().toLowerCase(); if (n === "ethernet") return "eth0"; const m = /^ethernet\s*(\d+)$/.exec(n); return m ? "eth" + (+m[1] - 1) : null; };
  const KOPF = ["", "Windows-IP-Konfiguration", ""];
  const SIM_FEHLT = {ausgabe: "(Die Simulation ist noch nicht geladen.)", fehler: true};
  const ports = s => H().ports(s);
  const adresse = (s, p) => H().adresse(s, p);

  /* ---------- ipconfig ---------- */
  function adapter(s, port, alle){
    const g = G(s), k = g.running.if[port] || {};
    if (k.an === false) return [];                                     /* deaktivierter Adapter erscheint nicht */
    const z = ["", `Ethernet-Adapter ${ADAPTER(port)}:`, ""], mac = IP.macWindows((g.hw.macs || {})[port] || "");
    const hw = () => { if (alle) z.push("   Beschreibung. . . . . . . . . . . : Netzwerkadapter (Labor)", `   Physische Adresse . . . . . . . . : ${mac}`,
                                        `   DHCP aktiviert. . . . . . . . . . : ${k.dhcp ? "Ja" : "Nein"}`, "   Autokonfiguration aktiviert . . . : Ja"); };
    if (!H().linkOben(s, port)) {
      z.push("   Medienstatus. . . . . . . . . . . : Medium getrennt", "   Verbindungsspezifisches DNS-Suffix:"); hw();
      return z;
    }
    const a = adresse(s, port);
    z.push("   Verbindungsspezifisches DNS-Suffix:"); hw();
    if (a.ip) {
      const zusatz = alle ? "(Bevorzugt)" : "";
      z.push(a.quelle === "apipa" ? `   Autokonfiguration IPv4-Adresse  . : ${a.ip}${zusatz}` : `   IPv4-Adresse  . . . . . . . . . . : ${a.ip}${zusatz}`,
             `   Subnetzmaske  . . . . . . . . . . : ${a.maske}`);
    }
    z.push(`   Standardgateway . . . . . . . . . : ${a.gw || ""}`.replace(/\s+$/, ""));
    if (alle) {
      const l = H().lease(s, port);
      if (a.quelle === "dhcp" && l && l.server) z.push(`   DHCP-Server . . . . . . . . . . . : ${l.server}`);
      if (a.dns) z.push(`   DNS-Server  . . . . . . . . . . . : ${a.dns}`);
      z.push("   NetBIOS über TCP/IP . . . . . . . : Aktiviert");
    }
    return z;
  }
  function ipBefund(s){
    if (!H().linkOben(s, "eth0")) return {befund: "Medium getrennt – kein Link", ok: false};
    const a = adresse(s, "eth0");
    if (!a.ip) return {befund: "keine IPv4-Adresse", ok: false};
    const p = IP.maskeGueltig(a.maske) ? "/" + IP.praefix(a.maske) : "";
    return {befund: `${a.quelle === "apipa" ? "APIPA " : ""}${a.ip}${p} · Gateway ${a.gw || "–"}${a.dns ? " · DNS " + a.dns : ""}`, ok: a.quelle !== "apipa" && !!a.gw};
  }
  const KEIN_ADAPTER = "Der Vorgang ist fehlgeschlagen, da sich kein Adapter in einem für diesen Vorgang zulässigen Status befindet.";
  function ipconfig(s, args){
    const opt = (args[0] || "").toLowerCase();
    const g = G(s), alle = ports(s);
    if (!opt) return Object.assign({ausgabe: [...KOPF, ...alle.flatMap(p => adapter(s, p, false))].join("\n")}, ipBefund(s));
    if (opt === "/all") return Object.assign({ausgabe: [...KOPF, `   Hostname  . . . . . . . . . . . . : ${g.running.hostname}`, "   Primäres DNS-Suffix . . . . . . . :",
      "   Knotentyp . . . . . . . . . . . . : Hybrid", "   IP-Routing aktiviert  . . . . . . : Nein", "   WINS-Proxy aktiviert  . . . . . . : Nein",
      ...alle.flatMap(p => adapter(s, p, true))].join("\n")}, ipBefund(s));
    if (opt === "/flushdns") { s.dnsCache = {}; return [...KOPF, "Der DNS-Auflösungscache wurde geleert."].join("\n"); }
    if (opt === "/displaydns") {
      const e = Object.entries(s.dnsCache || {});
      if (!e.length) return [...KOPF, "    Der DNS-Auflösungscache ist leer. (Er füllt sich mit ping, nslookup, curl … per Name.)"].join("\n");
      return [...KOPF, ...e.flatMap(([n, ip]) => [`    ${n}`, "    ----------------------------------------", `    Eintragsname  . . . . : ${n}`, "    Eintragstyp . . . . . : 1",
        "    Gültigkeitsdauer. . . : 300", "    Datenlänge. . . . . . : 4", "    Abschnitt . . . . . . : Antwort", `    (Host-)A-Eintrag  . . : ${ip}`, ""])].join("\n");
    }
    const dhcpPorts = alle.filter(p => g.running.if[p].dhcp && g.running.if[p].an !== false);
    if (opt === "/release") {
      if (!dhcpPorts.length) return {ausgabe: [...KOPF, KEIN_ADAPTER].join("\n"), fehler: true,
        tipp: "Dieser Rechner hat eine feste (statische) Adresse. /release und /renew gibt es nur bei DHCP."};
      const z = Modell.laufzeit(s.netz, s.id); z.dhcp = z.dhcp || {};
      for (const p of dhcpPorts) delete z.dhcp[p];
      return [...KOPF, ...alle.flatMap(p => adapter(s, p, false))].join("\n");
    }
    if (opt === "/renew") {
      if (!dhcpPorts.length) return {ausgabe: [...KOPF, KEIN_ADAPTER].join("\n"), fehler: true,
        tipp: "Dieser Rechner hat eine feste (statische) Adresse. Für DHCP stellst du im Inspektor „automatisch (DHCP)“ ein – oder „netsh interface ip set address \"Ethernet\" dhcp“."};
      const sim = h.sim(); if (!sim || typeof sim.dhcp !== "function") return SIM_FEHLT;
      const z = [...KOPF]; let trace = null, hinweis = null, fehler = false;
      for (const p of dhcpPorts) {
        const r = sim.dhcp(s.netz, s.id, p) || {};
        trace = r.trace || trace;
        if (!r.ok) {          /* Windows-ähnlich (Wortlaut nicht exakt belegt) */
          z.push(`Beim Erneuern der Schnittstelle "${ADAPTER(p)}" ist folgender Fehler aufgetreten: Es konnte keine Verbindung mit dem DHCP-Server hergestellt werden. Das Zeitlimit für die Anforderung wurde überschritten.`);
          hinweis = "Kein DHCP-Server hat geantwortet (DORA bricht nach „Discover“ ab). Der Rechner nimmt dann eine APIPA-Adresse 169.254.x.x. Prüfe Kabel, VLAN, Pool und bei anderem Netz die „ip helper-address“.";
          fehler = true;
        }
      }
      z.push(...alle.flatMap(p => adapter(s, p, false)));
      return Object.assign({ausgabe: z.join("\n"), trace, hinweis, tipp: hinweis, fehler}, fehler ? {befund: "DHCP: kein Angebot – APIPA", ok: false} : ipBefund(s));
    }
    return {ausgabe: "Fehler: Unbekannte oder unvollständige Befehlszeilenoption.\n\nSyntax: ipconfig [/all | /release | /renew | /flushdns | /displaydns]", fehler: true};
  }

  /* ---------- ping, tracert, pathping ---------- */
  function ping(s, args){
    let anzahl = 4, ziel = null, laenge = 32, endlos = false;
    for (let i = 0; i < args.length; i++) {
      const a = args[i].toLowerCase();
      if (a === "-n") { const n = parseInt(args[++i], 10); if (!(n >= 1 && n <= 4294967295)) return {ausgabe: "Ungültiger Wert für Option -n.", fehler: true}; anzahl = Math.min(n, 100); }
      else if (a === "-l") { const n = parseInt(args[++i], 10); if (!(n >= 0 && n <= 65500)) return {ausgabe: "Ungültiger Wert für Option -l. Gültiger Bereich: 0 bis 65500.", fehler: true}; laenge = n; }
      else if (a === "-t") endlos = true;
      else if (a === "-w" || a === "-i") i++;
      else if (a[0] === "-" || a[0] === "/") continue;
      else ziel = args[i];
    }
    if (!ziel) return {ausgabe: "Syntax: ping [-t] [-n Anzahl] [-l Größe] [-4] Zielname\n\nOptionen:\n    -t             Sendet bis zum Abbruch (Strg+C).\n    -n Anzahl      Anzahl der zu sendenden Echoanforderungen (Standard 4).\n    -l Größe       Größe des Sendepuffers.", fehler: true};
    const sim = h.sim(); if (!sim || typeof sim.ping !== "function") return SIM_FEHLT;
    const n = H().aufloesen(s, ziel);
    if (n.fehlt) return {ausgabe: `Ping-Anforderung konnte Host "${ziel}" nicht finden. Überprüfen Sie den Namen, und versuchen Sie es erneut.`, fehler: true, trace: n.trace,
      befund: `Name „${ziel}“ nicht auflösbar`, ok: false,
      tipp: "Der Name ließ sich nicht auflösen. Prüfe mit „ipconfig /all“, ob ein DNS-Server eingetragen ist, und teste ihn mit „nslookup " + ziel + "“."};
    const z = ["", n.name ? `Ping wird ausgeführt für ${n.name} [${n.ip}] mit ${laenge} Bytes Daten:` : `Ping wird ausgeführt für ${n.ip} mit ${laenge} Bytes Daten:`];
    let empfangen = 0, allgemein = false; const rtts = [];
    const r = sim.ping(s.netz, s.id, n.ip, {anzahl}) || {}, trace = r.trace || null;
    for (const a of (r.antworten || []).slice(0, anzahl)) {
      const art = a.art || (a.ok ? "echo" : a.von ? "unreachable" : "timeout");
      if (art === "echo") {
        const t = Math.round(a.rtt || 0); rtts.push(t); empfangen++;
        z.push(`Antwort von ${a.von || n.ip}: Bytes=${laenge} Zeit${t < 1 ? "<1ms" : "=" + t + "ms"} TTL=${a.ttl != null ? a.ttl : 128}`);
      } else if (art === "time-exceeded") { empfangen++; z.push(`Antwort von ${a.von}: TTL beim Transport abgelaufen.`); }
      else if (art === "unreachable" && a.von) {
        empfangen++; z.push(`Antwort von ${a.von}: Ziel${a.code === "net" ? "netz" : a.code === "port" ? "port" : "host"} nicht erreichbar.`);
      } else if (art === "fehler") { allgemein = true; z.push("PING: Fehler bei der Übertragung. Allgemeiner Fehler."); }
      else z.push("Zeitüberschreitung der Anforderung.");
    }
    const lokal = allgemein ? (H().lokalerFehler(s, n.ip) || "Der Rechner kann das Paket gar nicht erst losschicken.") : null;
    const verloren = anzahl - empfangen;
    z.push("", `Ping-Statistik für ${n.ip}:`, `    Pakete: Gesendet = ${anzahl}, Empfangen = ${empfangen}, Verloren = ${verloren}`, `    (${Math.floor(verloren * 100 / anzahl)}% Verlust),`);
    if (rtts.length) z.push("Ca. Zeitangaben in Millisek.:",
      `    Minimum = ${Math.min(...rtts)}ms, Maximum = ${Math.max(...rtts)}ms, Mittelwert = ${Math.round(rtts.reduce((x, y) => x + y, 0) / rtts.length)}ms`);
    if (endlos) z.push("(Im Labor nach " + anzahl + " Paketen beendet – „-t“ sendet im echten Windows, bis du Strg+C drückst.)");
    let hinweis = null;
    if (lokal) hinweis = lokal + " Windows schickt dann gar nichts los.";
    else if (!rtts.length && empfangen) hinweis = "„Zielhost nicht erreichbar“ zählt Windows als „empfangen“ – 0 % Verlust heißt hier also NICHT, dass es klappt.";
    else if (!rtts.length) hinweis = "Keine Antwort. Arbeite dich von innen nach außen vor: eigene Adresse (ipconfig), Gateway pingen, dann weiter.";
    return Object.assign({ausgabe: z.join("\n"), trace, hinweis}, H().pingBefund(r, anzahl), {ziel: n.ip});
  }
  function tracert(s, args){
    const ziel = args.find(a => a[0] !== "-" && a[0] !== "/");
    if (!ziel) return {ausgabe: "Syntax: tracert [-d] Zielname", fehler: true};
    const sim = h.sim(); if (!sim || typeof sim.traceroute !== "function") return SIM_FEHLT;
    const n = H().aufloesen(s, ziel);
    if (n.fehlt) return {ausgabe: `Der Zielname "${ziel}" konnte nicht aufgelöst werden.`, fehler: true, trace: n.trace, befund: `Name „${ziel}“ nicht auflösbar`, ok: false};
    const z = n.name ? ["", `Routenverfolgung zu ${n.name} [${n.ip}]`, "über maximal 30 Hops:", ""] : ["", `Routenverfolgung zu ${n.ip} über maximal 30 Hops`, ""];
    const r = sim.traceroute(s.netz, s.id, n.ip, {maxHops: 30}) || {};
    const zeit = t => t == null ? rechts("*", 6) + "   " : rechts(t < 1 ? "<1 ms" : `${Math.round(t)} ms`, 9);
    let letzter = null, endeText = null;
    for (const hop of r.hops || []) {
      const nr = rechts(hop.nr, 3);
      if (!hop.ip && hop.nr === 1 && hop.grund && hop.grund !== "TIMEOUT" && H().lokalerFehler(s, n.ip)) { z.push(nr + "     Übertragungsfehler: Allgemeiner Fehler."); endeText = "Allgemeiner Fehler"; break; }
      if (!hop.ip) { z.push(nr + "     *        *        *     Zeitüberschreitung der Anforderung."); continue; }
      if (hop.code || (hop.grund && hop.grund !== "TTL_EXPIRED" && hop.grund !== "TIMEOUT")) {
        z.push(`${nr}  ${hop.ip}  meldet: Ziel${hop.code === "net" || hop.grund === "NO_ROUTE" ? "netz" : "host"} nicht erreichbar.`); letzter = hop.ip; endeText = "nicht erreichbar"; break;
      }
      const rtts = hop.rtts && hop.rtts.length ? hop.rtts.slice(0, 3) : [2 * hop.nr];
      while (rtts.length < 3) rtts.push(rtts[rtts.length - 1]);
      z.push(nr + rtts.map(zeit).join("") + "  " + hop.ip); letzter = hop.ip;
    }
    z.push("", "Ablaufverfolgung beendet.");
    const ok = !!r.ok;
    return {ausgabe: z.join("\n"), trace: r.trace || null, ok,
      befund: ok ? `Ziel erreicht nach ${(r.hops || []).length} Hops` : `endet bei ${letzter || "Hop 1"}${endeText ? " (" + endeText + ")" : " – danach keine Antwort"}`};
  }
  function pathping(s, args){
    const t = tracert(s, args);
    if (!t || t.fehler) return t;
    const ziel = args.find(a => a[0] !== "-" && a[0] !== "/");
    const hops = t.ausgabe.split("\n").filter(z => /^\s*\d+\s/.test(z));
    return Object.assign({}, t, {ausgabe: ["", `Routenverfolgung zu ${ziel} über maximal 30 Abschnitte:`, `  0  ${G(s).running.hostname} [${adresse(s, "eth0").ip || "?"}]`,
      ...hops.map(z => z.replace(/^(\s*\d+)\s+(?:(?:<?\d+ ms|\*)\s+)*/, "$1  ")), "", "Berechnung der Statistiken dauert ca. " + 25 * Math.max(1, hops.length) + " Sekunden ...",
      "(Im Labor sofort: Verlust je Abschnitt wie bei tracert – 0 %, solange Antworten kommen.)", "", "Ablaufverfolgung beendet."].join("\n")});
  }

  /* ---------- arp, nslookup, getmac, route, netstat ---------- */
  function arp(s, args){
    const opt = (args[0] || "").toLowerCase();
    if (opt === "-d") { Modell.laufzeit(s.netz, s.id).arp = {}; return ""; }
    if (opt !== "-a" && opt !== "-g") return {ausgabe: "Zeigt und ändert die IP-zu-Physikalisch-Adressübersetzungstabellen, die vom\nAddress Resolution Protocol (ARP) verwendet werden.\n\nARP -a      Zeigt die aktuellen ARP-Einträge an.\nARP -d      Löscht die ARP-Einträge.", fehler: !!opt};
    const a = adresse(s, "eth0");
    if (!a.ip) return {ausgabe: "Keine ARP-Einträge gefunden.", befund: "ARP-Cache leer (keine Adresse)", ok: false};
    const uhr = (s.netz.zustand && s.netz.zustand._uhr) || 0, eintraege = [];
    for (const [ip, e] of Object.entries(H().zustand(s).arp || {})) if (e && (e.bis == null || e.bis > uhr)) eintraege.push([ip, IP.macWindows(e.mac).toLowerCase(), "dynamisch"]);
    eintraege.sort((x, y) => IP.zuZahl(x[0]) - IP.zuZahl(y[0]));
    const dyn = eintraege.length;
    if (IP.maskeGueltig(a.maske)) eintraege.push([IP.broadcast(a.ip, a.maske), "ff-ff-ff-ff-ff-ff", "statisch"]);
    eintraege.push(["255.255.255.255", "ff-ff-ff-ff-ff-ff", "statisch"]);
    return {ausgabe: ["", `Schnittstelle: ${a.ip} --- 0x4`, "  Internetadresse       Physische Adresse     Typ", ...eintraege.map(e => "  " + links(e[0], 22) + links(e[1], 22) + e[2])].join("\n"),
      befund: dyn ? `${dyn} gelernte Einträge (${eintraege.slice(0, Math.min(2, dyn)).map(e => e[0]).join(", ")}${dyn > 2 ? " …" : ""})` : "keine gelernten Einträge", ok: dyn > 0};
  }
  /* nslookup: Wortlaut der Fehlermeldungen Windows-ähnlich (deutsche Windows-Fassung nicht vollständig belegt) */
  function dnsServerName(s, ip){
    for (const g of Object.values(s.netz.geraete)) if (g.typ === "internet") for (const x of g.running.server || []) if (x.ip === ip) return x.name;
    for (const g of Object.values(s.netz.geraete)) if (Modell.HOST[g.typ] && (g.running.if.eth0 || {}).ip === ip) return String(g.running.hostname || g.name).toLowerCase();
    return "UnKnown";
  }
  function nslookupAntwort(s, name, server){
    const a = adresse(s, "eth0"), dns = server || a.dns;
    if (!dns) return {ausgabe: `*** Standardserver sind nicht verfügbar.\nServer:  UnKnown\nAddress:  127.0.0.1\n\n*** UnKnown kann ${name} nicht finden: No response from server`, fehler: true,
      befund: "kein DNS-Server eingetragen", ok: false, tipp: "Es ist kein DNS-Server eingetragen. Das siehst du mit „ipconfig /all“ (Zeile DNS-Server)."};
    const sim = h.sim(); if (!sim || typeof sim.dns !== "function") return SIM_FEHLT;
    const sname = dnsServerName(s, dns), kopf = [`Server:  ${sname}`, `Address:  ${dns}`, ""];
    const d = sim.dns(s.netz, s.id, name) || {};
    if (d.ok) { (s.dnsCache ||= {})[name.toLowerCase()] = d.ip; return {ausgabe: [...kopf, "Nicht autorisierende Antwort:", `Name:    ${name}`, `Address:  ${d.ip}`, ""].join("\n"), trace: d.trace || null, befund: `${name} → ${d.ip}`, ok: true}; }
    if (d.grund === "DNS_FAIL") return {ausgabe: [...kopf, `*** ${sname} kann ${name} nicht finden: Non-existent domain`].join("\n"), trace: d.trace || null, fehler: true,
      befund: `${name}: Name nicht gefunden (Server antwortet)`, ok: false, tipp: "Der DNS-Server antwortet, kennt den Namen aber nicht. Tippfehler? Oder fehlt der Eintrag auf dem Server?"};
    return {ausgabe: ["Zeitüberschreitung bei DNS-Anforderung.", "    Das Zeitlimit beträgt 2 Sekunden.", "Server:  UnKnown", `Address:  ${dns}`, "", "*** Zeitüberschreitung bei Anforderung an UnKnown."].join("\n"),
      trace: d.trace || null, fehler: true, befund: `${name}: DNS-Server ${dns} antwortet nicht`, ok: false, tipp: "Der DNS-Server antwortet nicht. Ist er per ping erreichbar? Läuft dort der DNS-Dienst?"};
  }
  function nslookup(s, args){
    const name = args.find(a => a[0] !== "-");
    if (!name) {
      const a = adresse(s, "eth0");
      s.nslookup = {server: null};
      return {ausgabe: [`Standardserver:  ${a.dns ? dnsServerName(s, a.dns) : "UnKnown"}`, `Address:  ${a.dns || "127.0.0.1"}`, "",
        "(Interaktiver Modus: Name eingeben · „server IP“ wechselt den Server · „exit“ beendet)"].join("\n"), modus: "nslookup"};
    }
    return nslookupAntwort(s, name, args[1] && IP.gueltig(args[1]) ? args[1] : null);
  }
  function nslookupInteraktiv(s, t){
    const w = H().woerter(t), c = (w[0] || "").toLowerCase();
    if (c === "exit") { s.nslookup = null; return ""; }
    if (c === "server" && w[1]) { if (!IP.gueltig(w[1])) return {ausgabe: `*** Server für ${w[1]} kann nicht gefunden werden.`, fehler: true}; s.nslookup.server = w[1]; return `Standardserver:  ${dnsServerName(s, w[1])}\nAddress:  ${w[1]}`; }
    if (c.startsWith("set")) return "";          /* set type=… : im Labor gibt es nur A-Einträge */
    return nslookupAntwort(s, w[0], s.nslookup.server);
  }
  function getmac(s){
    const g = G(s), z = ["", "Physische Adresse   Transportname", "=================== =========================================================="];
    for (const p of ports(s)) z.push(links(IP.macWindows((g.hw.macs || {})[p] || ""), 20) + (H().linkOben(s, p) ? `\\Device\\Tcpip_{LABOR-${p.toUpperCase()}}` : "Medium getrennt"));
    return z.join("\n");
  }
  function routePrint(s){
    const a = adresse(s, "eth0"), z = ["===========================================================================", "IPv4-Routentabelle",
      "===========================================================================", "Aktive Routen:", "     Netzwerkziel    Netzwerkmaske          Gateway    Schnittstelle Metrik"];
    const zeile = (ziel, maske, gw, ifip, m) => rechts(ziel, 17) + rechts(maske, 17) + rechts(gw, 17) + rechts(ifip, 17) + rechts(m, 7);
    if (a.ip && H().linkOben(s)) {
      if (a.gw) z.push(zeile("0.0.0.0", "0.0.0.0", a.gw, a.ip, 25));
      if (IP.maskeGueltig(a.maske)) z.push(zeile(IP.netz(a.ip, a.maske), a.maske, "Auf Verbindung", a.ip, 281), zeile(a.ip, "255.255.255.255", "Auf Verbindung", a.ip, 281));
    }
    z.push(zeile("127.0.0.0", "255.0.0.0", "Auf Verbindung", "127.0.0.1", 331), "===========================================================================");
    return {ausgabe: z.join("\n"), befund: a.gw ? `Standardroute über ${a.gw}` : "keine Standardroute (kein Gateway)", ok: !!a.gw};
  }
  function route(s, args){
    const w = args.map(x => x.toLowerCase());
    if (w[0] === "print" || !w.length) return routePrint(s);
    if (w[0] === "add" || w[0] === "delete") {
      const ziel = w[1], mi = w.indexOf("mask"), maske = mi >= 0 ? w[mi + 1] : (w[0] === "add" ? "255.255.255.255" : null), gw = mi >= 0 ? w[mi + 2] : w[2];
      if (!ziel || !IP.gueltig(ziel)) return {ausgabe: "Der Routenbefehl ist ungültig.\nSyntax: route add 0.0.0.0 mask 0.0.0.0 <Gateway>  ·  route delete 0.0.0.0", fehler: true};
      if (ziel !== "0.0.0.0" || (maske && maske !== "0.0.0.0")) return {ausgabe: " OK! (Windows-ähnlich: Im Labor wirkt nur die Standardroute 0.0.0.0 – weitere Routen am Rechner sind nicht nachgebaut.)", fehler: true};
      if (w[0] === "add" && !(gw && IP.gueltig(gw))) return {ausgabe: "Der Routenbefehl ist ungültig: Gateway fehlt.", fehler: true};
      if (w[0] === "add" && G(s).running.if.eth0.dhcp) return {ausgabe: " OK!\n(Die Adresse kommt per DHCP – eine feste Standardroute legst du besser mit netsh … static fest.)", fehler: false};
      const geaendert = H().aendern(s, w[0] === "add" ? `route add – Standardgateway ${gw}` : "route delete – Standardgateway entfernt",
        () => Modell.setzen(s.netz, s.id, "if.eth0.gw", w[0] === "add" ? IP.zuText(IP.zuZahl(gw)) : ""));
      return {ausgabe: " OK!", geaendert};
    }
    return {ausgabe: "Bearbeitet die Netzwerk-Routingtabellen.\n\nROUTE PRINT  ·  ROUTE ADD 0.0.0.0 MASK 0.0.0.0 <Gateway>  ·  ROUTE DELETE 0.0.0.0", fehler: true};
  }
  function netstat(s){
    const d = H().dienste(s).filter(x => x.an), z = ["", "Aktive Verbindungen", "", "  Proto  Lokale Adresse         Remoteadresse          Status"];
    for (const x of d) z.push(x.proto === "tcp" ? `  TCP    ${links("0.0.0.0:" + x.port, 23)}${links("0.0.0.0:0", 23)}ABHÖREN` : `  UDP    ${links("0.0.0.0:" + x.port, 23)}*:*`);
    return {ausgabe: z.join("\n"), befund: d.length ? "lauscht auf " + d.map(x => `${x.proto.toUpperCase()} ${x.port}`).join(", ") : "kein Dienst lauscht", ok: d.length > 0};
  }

  /* ---------- netsh: Adresse per Befehl setzen (ändert die Konfiguration – über den Verlauf) ---------- */
  function netsh(s, t){
    const w = H().woerter(t).slice(1), l = w.map(x => x.toLowerCase());
    const i = l[0] === "interface" || l[0] === "int" ? 1 : -1;
    if (i < 0 || !["ip", "ipv4"].includes(l[1])) return {ausgabe: "Folgender Befehl wurde nicht gefunden: " + w.join(" ") + "\n\nIm Labor: netsh interface ip show config  ·  netsh interface ip set address \"Ethernet\" static IP MASKE GATEWAY  ·  … dhcp  ·  netsh interface ip set dns \"Ethernet\" static DNS", fehler: true};
    const verb = l[2], was = l[3];
    if (verb === "show" && (was === "config" || was === "address" || was === "addresses")) return netshShow(s);
    if (verb !== "set" && verb !== "add") return {ausgabe: "Folgender Befehl wurde nicht gefunden: " + w.join(" "), fehler: true};
    /* Werte als „name=…“ oder der Reihe nach */
    const rest = w.slice(4), benannt = {}, frei = [];
    for (const x of rest) { const m = /^([a-z]+)=(.*)$/i.exec(x); if (m) benannt[m[1].toLowerCase()] = m[2]; else frei.push(x); }
    const name = benannt.name || frei.shift();
    const port = PORT_VON(name);
    if (!port || !G(s).running.if[port]) return {ausgabe: `Es wurde keine Schnittstelle „${name || ""}“ gefunden. (Windows-ähnlich – die Schnittstelle heißt „Ethernet“, siehe ipconfig.)`, fehler: true};
    const quelle = (benannt.source || benannt.quelle || frei.shift() || "").toLowerCase();
    if (was === "address") {
      if (quelle === "dhcp") {
        const geaendert = H().aendern(s, "netsh – Adresse per DHCP", () => { Modell.setzen(s.netz, s.id, `if.${port}.dhcp`, true); });
        return {ausgabe: "", geaendert, hinweis: "DHCP ist an. „ipconfig /renew“ holt sofort eine Adresse."};
      }
      if (quelle !== "static") return {ausgabe: "Syntax: netsh interface ip set address \"Ethernet\" static IP-Adresse Subnetzmaske [Gateway]\n        netsh interface ip set address \"Ethernet\" dhcp", fehler: true};
      const ip = benannt.addr || benannt.address || frei.shift(), maske = benannt.mask || frei.shift(), gw = benannt.gateway || frei.shift() || "";
      if (!IP.gueltig(ip || "")) return {ausgabe: `Die angegebene IP-Adresse ist ungültig: ${ip || "(leer)"}`, fehler: true};
      if (!IP.maskeGueltig(maske || "")) return {ausgabe: `Die angegebene Subnetzmaske ist ungültig: ${maske || "(leer)"}`, fehler: true};
      if (gw && gw.toLowerCase() !== "none" && !IP.gueltig(gw)) return {ausgabe: `Das angegebene Gateway ist ungültig: ${gw}`, fehler: true};
      const gwText = gw && gw.toLowerCase() !== "none" ? IP.zuText(IP.zuZahl(gw)) : "";
      const geaendert = H().aendern(s, `netsh – IP ${ip} ${maske}${gwText ? " Gateway " + gwText : ""}`, () => {
        Modell.setzen(s.netz, s.id, `if.${port}.dhcp`, false);
        Modell.setzen(s.netz, s.id, `if.${port}.ip`, IP.zuText(IP.zuZahl(ip)));
        Modell.setzen(s.netz, s.id, `if.${port}.maske`, maske);
        Modell.setzen(s.netz, s.id, `if.${port}.gw`, gwText);
      });
      return {ausgabe: "", geaendert};
    }
    if (was === "dns" || was === "dnsservers" || was === "dnsserver") {
      if (quelle === "dhcp") { const geaendert = H().aendern(s, "netsh – DNS per DHCP", () => Modell.setzen(s.netz, s.id, `if.${port}.dns`, "")); return {ausgabe: "", geaendert}; }
      const dns = benannt.address || benannt.addr || (quelle === "static" ? frei.shift() : quelle);
      if (!IP.gueltig(dns || "")) return {ausgabe: "Syntax: netsh interface ip set dns \"Ethernet\" static DNS-Server-Adresse", fehler: true};
      const geaendert = H().aendern(s, `netsh – DNS-Server ${dns}`, () => Modell.setzen(s.netz, s.id, `if.${port}.dns`, IP.zuText(IP.zuZahl(dns))));
      return {ausgabe: "", geaendert};
    }
    return {ausgabe: "Folgender Befehl wurde nicht gefunden: " + w.join(" "), fehler: true};
  }
  function netshShow(s){
    const z = [];
    for (const p of ports(s)) {
      const k = G(s).running.if[p] || {}, a = adresse(s, p);
      z.push("", `Konfiguration der Schnittstelle "${ADAPTER(p)}"`, `    DHCP aktiviert:                       ${k.dhcp ? "Ja" : "Nein"}`);
      if (a.ip) z.push(`    IP-Adresse:                           ${a.ip}`, `    Subnetzpräfix:                        ${IP.maskeGueltig(a.maske) ? IP.cidr(a.ip, a.maske) + " (Maske " + a.maske + ")" : ""}`);
      if (a.gw) z.push(`    Standardgateway:                      ${a.gw}`, "    Gatewaymetrik:                        0");
      z.push("    Schnittstellenmetrik:                 25",
        k.dhcp ? `    Über DHCP konfigurierte DNS-Server:   ${a.dns || "Keine"}` : `    Statisch konfigurierte DNS-Server:    ${a.dns || "Keine"}`,
        "    Mit welchem Suffix registriert:       Nur primär", "    Statisch konfigurierte WINS-Server:   Keine");
    }
    return Object.assign({ausgabe: z.join("\n")}, ipBefund(s));
  }

  /* ---------- curl, telnet, Test-NetConnection (TCP), Resolve-DnsName, Get-NetIPConfiguration ---------- */
  function curl(s, args){
    const kopf = args.some(a => a === "-I" || a === "--head"), url = args.find(a => !a.startsWith("-"));
    if (!url) return {ausgabe: "curl: try 'curl --help' for more information", fehler: true};
    const sim = h.sim(); if (!sim || typeof sim.http !== "function") return SIM_FEHLT;
    const r = sim.http(s.netz, s.id, url) || {};
    const host = String(url).replace(/^https?:\/\//i, "").split(/[\/:]/)[0], port = /^https:/i.test(url) ? 443 : (/:(\d+)/.exec(url.replace(/^https?:\/\//i, "")) || [0, 80])[1];
    if (r.ok) return {ausgabe: kopf ? "HTTP/1.1 200 OK\nServer: Labor-Webserver\nContent-Type: text/html; charset=utf-8" : H().seite(host, r.ziel || ""), trace: r.trace, befund: `HTTP 200 von ${host}`, ok: true};
    if (!r.ziel) return {ausgabe: `curl: (6) Could not resolve host: ${host}`, fehler: true, trace: r.trace, befund: `curl: Name „${host}“ nicht auflösbar`, ok: false};
    const abgelehnt = r.grund === "PORT_CLOSED" || r.grund === "SERVICE_OFF";
    return {ausgabe: abgelehnt ? `curl: (7) Failed to connect to ${host} port ${port} after 2 ms: Couldn't connect to server` : `curl: (28) Failed to connect to ${host} port ${port} after 21000 ms: Timed out`,
      fehler: true, trace: r.trace, befund: abgelehnt ? `Port ${port} geschlossen (Verbindung abgelehnt)` : `keine Antwort von ${host}:${port}`, ok: false};
  }
  function tcpTest(s, ziel, port){
    const sim = h.sim(); if (!sim || typeof sim.tcp !== "function") return null;
    return sim.tcp(s.netz, s.id, ziel, port) || {};
  }
  function telnet(s, args){
    const ziel = args[0], port = +(args[1] || 23);
    if (!ziel) return {ausgabe: "Syntax: telnet Host [Port]", fehler: true};
    const r = tcpTest(s, ziel, port); if (!r) return SIM_FEHLT;
    if (r.ok) return {ausgabe: `Verbindung zu ${ziel} wird hergestellt...\n(Verbindung steht – Port ${port} ist offen. Im Labor sofort wieder getrennt.)`, trace: r.trace, befund: `TCP ${port} offen`, ok: true};
    return {ausgabe: `Verbindung zu ${ziel} wird hergestellt...Es konnte keine Verbindung mit dem Host hergestellt werden, auf Port ${port}: Verbinden fehlgeschlagen`, fehler: true, trace: r.trace,
      befund: `TCP ${port} nicht erreichbar`, ok: false};
  }
  function testNetConnection(s, args){
    let ziel = null, port = null;
    for (let i = 0; i < args.length; i++) {
      const a = args[i].toLowerCase();
      if (a === "-computername") ziel = args[++i]; else if (a === "-port") port = +args[++i]; else if (a === "-informationlevel") i++; else if (!ziel && a[0] !== "-") ziel = args[i];
    }
    ziel = ziel || "internetbeacon.msedge.net";
    const a = adresse(s, "eth0"), n = H().aufloesen(s, ziel);
    if (n.fehlt) return {ausgabe: `WARNUNG: Name resolution of ${ziel} failed\n\nComputerName   : ${ziel}\nRemoteAddress  :\nInterfaceAlias :\nSourceAddress  :\nPingSucceeded  : False`, fehler: true, trace: n.trace,
      befund: `Name „${ziel}“ nicht auflösbar`, ok: false};
    const kopf = [`ComputerName     : ${ziel}`, `RemoteAddress    : ${n.ip}`];
    if (port) {
      const r = tcpTest(s, n.ip, port) || {};
      return {ausgabe: [...(r.ok ? [] : [`WARNUNG: TCP connect to (${n.ip} : ${port}) failed`, ""]), "", ...kopf, `RemotePort       : ${port}`, "InterfaceAlias   : Ethernet", `SourceAddress    : ${a.ip || ""}`, `TcpTestSucceeded : ${r.ok ? "True" : "False"}`].join("\n"),
        trace: r.trace, fehler: !r.ok, befund: `TCP ${port} zu ${ziel}: ${r.ok ? "offen" : "nicht erreichbar"}`, ok: !!r.ok};
    }
    const sim = h.sim(); if (!sim || typeof sim.ping !== "function") return SIM_FEHLT;
    const r = sim.ping(s.netz, s.id, n.ip, {anzahl: 1}) || {}, ok = (r.antworten || []).some(x => x.ok);
    return {ausgabe: [...(ok ? [] : [`WARNUNG: Ping to ${n.ip} failed with status: TimedOut`, ""]), "", ...kopf, "InterfaceAlias         : Ethernet", `SourceAddress          : ${a.ip || ""}`,
      `PingSucceeded          : ${ok ? "True" : "False"}`, ok ? "PingReplyDetails (RTT) : 1 ms" : ""].filter(x => x !== "").join("\n"), trace: r.trace, fehler: !ok, befund: `Ping ${ziel}: ${ok ? "ok" : "keine Antwort"}`, ok};
  }
  function resolveDnsName(s, args){
    const name = args.find(a => a[0] !== "-");
    if (!name) return {ausgabe: "Resolve-DnsName : Der Parameter \"Name\" fehlt.", fehler: true};
    const a = adresse(s, "eth0");
    if (!a.dns) return {ausgabe: `Resolve-DnsName : ${name} : Es ist kein DNS-Server konfiguriert.`, fehler: true, befund: "kein DNS-Server eingetragen", ok: false};
    const sim = h.sim(); if (!sim || typeof sim.dns !== "function") return SIM_FEHLT;
    const d = sim.dns(s.netz, s.id, name) || {};
    if (d.ok) { (s.dnsCache ||= {})[name.toLowerCase()] = d.ip; return {ausgabe: ["", "Name                                           Type   TTL   Section    IPAddress", "----                                           ----   ---   -------    ---------",
      links(name, 47) + "A      300   Answer     " + d.ip].join("\n"), trace: d.trace, befund: `${name} → ${d.ip}`, ok: true}; }
    return {ausgabe: `Resolve-DnsName : ${name} : ${d.grund === "DNS_FAIL" ? "DNS-Name ist nicht vorhanden" : "Timeoutzeitraum für den Vorgang abgelaufen"}`, fehler: true, trace: d.trace,
      befund: d.grund === "DNS_FAIL" ? `${name}: Name nicht gefunden` : `${name}: DNS-Server antwortet nicht`, ok: false};
  }
  function getNetIPConfiguration(s){
    const a = adresse(s, "eth0");
    return Object.assign({ausgabe: ["", "InterfaceAlias       : Ethernet", "InterfaceIndex       : 4", "InterfaceDescription : Netzwerkadapter (Labor)",
      `NetProfile.Name      : ${a.ip ? "Netzwerk" : "Nicht identifiziertes Netzwerk"}`, `IPv4Address          : ${a.ip || ""}`, `IPv4DefaultGateway   : ${a.gw || ""}`, `DNSServer            : ${a.dns || ""}`, ""].join("\n")}, ipBefund(s));
  }

  /* ---------- Rest ---------- */
  const HILFE = ["Befehle in diesem Terminal (Windows-artig, als Administrator):",
    "  ipconfig [/all | /release | /renew | /flushdns | /displaydns]   Adresse, Maske, Gateway, DNS; DHCP neu",
    "  ping [-n Anzahl] [-l Größe] [-t] Ziel        Erreichbarkeit (IP oder Name)",
    "  tracert Ziel  ·  pathping Ziel               Weg zum Ziel, Router für Router",
    "  nslookup [Name]                               DNS fragen (ohne Name: interaktiv)",
    "  arp -a | -d  ·  getmac  ·  route print       ARP-Cache, MAC-Adresse, Routentabelle",
    "  netstat -an                                   Dienste, die auf diesem Rechner lauschen",
    "  curl http://Name  ·  telnet Host Port         Webseite abrufen, Port prüfen",
    "  netsh interface ip show config                Konfiguration anzeigen",
    "  netsh interface ip set address \"Ethernet\" static IP MASKE GATEWAY   (oder … dhcp)",
    "  netsh interface ip set dns \"Ethernet\" static DNS",
    "  route add 0.0.0.0 mask 0.0.0.0 GATEWAY        Standardgateway setzen",
    "  hostname · whoami · systeminfo · type C:\\Windows\\System32\\drivers\\etc\\hosts · cls",
    "  powershell                                    Test-NetConnection, Resolve-DnsName, Get-NetIPConfiguration"].join("\n");
  const HOSTS = ["# Hosts-Datei (Labor): Einträge „IP-Adresse  Name“ haben Vorrang vor DNS.", "# Zeilen mit # sind Kommentare.", "#", "# 127.0.0.1    localhost"].join("\n");
  function systeminfo(s){
    const g = G(s), a = adresse(s, "eth0"), k = g.running.if.eth0 || {};
    return ["", `Hostname:                                  ${g.running.hostname}`, `Betriebssystemname:                        Windows (Labor)`,
      "Betriebssystemhersteller:                  (Labor-Nachbau)", "Netzwerkkarte(n):                          1 Netzwerkkarte(n) installiert.",
      "                                           [01]: Netzwerkadapter (Labor)", "                                                 Verbindungsname: Ethernet",
      `                                                 DHCP aktiviert:  ${k.dhcp ? "Ja" : "Nein"}`, "                                                 IP-Adresse(n)",
      `                                                 [01]: ${a.ip || "–"}`].join("\n");
  }
  const CMD = {
    ipconfig: (s, a) => ipconfig(s, a), ping: (s, a) => ping(s, a), tracert: (s, a) => tracert(s, a), pathping: (s, a) => pathping(s, a),
    arp: (s, a) => arp(s, a), nslookup: (s, a) => nslookup(s, a), getmac: s => getmac(s), route: (s, a) => route(s, a),
    netstat: s => netstat(s), curl: (s, a) => curl(s, a), telnet: (s, a) => telnet(s, a),
    hostname: s => G(s).running.hostname, whoami: () => "labor\\azubi", systeminfo: s => systeminfo(s),
    type: (s, a) => /hosts$/i.test(a.join(" ")) ? HOSTS : {ausgabe: "Das System kann die angegebene Datei nicht finden.", fehler: true},
    cls: () => ({ausgabe: "", leeren: true}), clear: () => ({ausgabe: "", leeren: true}),
    help: () => HILFE, hilfe: () => HILFE, "?": () => HILFE,
    powershell: s => { s.ps = true; return "Windows PowerShell (Labor-Auszug) – „exit“ führt zurück zur Eingabeaufforderung."; },
    exit: s => { if (s.ps) { s.ps = false; return ""; } return {ausgabe: "", hinweis: "Das Terminal bleibt im Spiel offen."}; },
  };
  const PS = {
    "test-netconnection": (s, a) => testNetConnection(s, a), tnc: (s, a) => testNetConnection(s, a),
    "resolve-dnsname": (s, a) => resolveDnsName(s, a), "get-netipconfiguration": s => getNetIPConfiguration(s), gip: s => getNetIPConfiguration(s),
  };
  C.HOST_BEFEHLE.windows = {
    _eingabe(s, t){
      if (s.nslookup) return nslookupInteraktiv(s, t);
      const teile = t.split(/\s+/), cmd = teile[0].toLowerCase().replace(/\.exe$/, "");
      if (cmd === "netsh") return netsh(s, t);
      if (s.ps && Object.prototype.hasOwnProperty.call(PS, cmd)) return PS[cmd](s, teile.slice(1));
      if (Object.prototype.hasOwnProperty.call(CMD, cmd)) return CMD[cmd](s, teile.slice(1));
      if (!s.ps && Object.prototype.hasOwnProperty.call(PS, cmd)) return {ausgabe: `Der Befehl "${teile[0]}" ist entweder falsch geschrieben oder\nkonnte nicht gefunden werden.`, fehler: true,
        tipp: `„${teile[0]}“ ist ein PowerShell-Befehl. Tippe zuerst „powershell“.`};
      return {unbekannt: true};
    },
    _namen: s => [...Object.keys(CMD).filter(n => !["hilfe", "?", "clear"].includes(n)), "netsh", ...(s.ps ? ["Test-NetConnection", "Resolve-DnsName", "Get-NetIPConfiguration"] : [])],
    _optionen(s, z){
      const o = /^(\s*ipconfig\s+)(\S*)$/i.exec(z);
      if (o) return {vor: o[1], kand: ["/all", "/release", "/renew", "/flushdns", "/displaydns"].filter(x => x.startsWith(o[2].toLowerCase()))};
      const n = /^(\s*netsh\s+(?:\S+\s+)*)(\S*)$/i.exec(z);
      if (n) { const folge = {"": ["interface"], interface: ["ip"], ip: ["show", "set"], show: ["config"], set: ["address", "dns"], address: ['"Ethernet"'], dns: ['"Ethernet"']};
        const w = H().woerter(n[1]).slice(1), letzt = (w[w.length - 1] || "").toLowerCase(); return {vor: n[1], kand: (folge[w.length ? letzt : ""] || []).filter(x => x.toLowerCase().startsWith(n[2].toLowerCase()))}; }
      return null;
    },
  };
})();
