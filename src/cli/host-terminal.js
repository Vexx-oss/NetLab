"use strict";
/* ---------- Konsole: Windows-artiges Terminal für pc/server/nas (Prompt C:\>) ----------
   CLI.hostEingabe(s, zeile), CLI.hostTab(s, zeile), CLI.hostBegruessung(s)
   Texte nach deutschem Windows 10/11 (ipconfig, ping, tracert, arp -a). Was nicht sicher belegt ist, ist schlicht
   gehalten und im Code als „Windows-ähnlich“ markiert. Ändert nie die Konfiguration; ipconfig /release und /renew
   ändern nur die Laufzeit (netz.zustand bzw. Sim.dhcp). */
(() => {
  const C = CLI, h = C.h;
  const G = s => h.geraet(s);
  const links = h.links, rechts = h.rechts;
  const ADAPTER = p => p === "eth0" ? "Ethernet" : "Ethernet " + (Number(String(p).replace(/\D/g, "")) + 1);
  const KOPF = ["", "Windows-IP-Konfiguration", ""];
  const zustand = s => (s.netz.zustand && s.netz.zustand[s.id]) || {};

  C.hostBegruessung = () => "Eingabeaufforderung (Windows-artig) – „help“ zeigt die Befehle.";

  /* Adresse des Adapters: Sim.adresse (echte Lage inkl. DHCP/APIPA), sonst aus Konfig und Laufzeit */
  function adresse(s, port){
    const sim = h.sim();
    if (sim && typeof sim.adresse === "function") {
      try { const a = sim.adresse(s.netz, s.id, port); if (a) return a; } catch (e) { /* Rückfall unten */ }
    }
    const k = G(s).running.if[port] || {};
    if (!k.dhcp) return k.ip ? {ip: k.ip, maske: k.maske, gw: k.gw, dns: k.dns, quelle: "statisch"} : {ip: "", maske: "", gw: "", dns: "", quelle: "keine"};
    const l = (zustand(s).dhcp || {})[port];
    if (l && l.ip) return {ip: l.ip, maske: l.maske, gw: l.gw || "", dns: l.dns || "", quelle: IP.apipa(l.ip) ? "apipa" : "dhcp"};
    return {ip: "", maske: "", gw: "", dns: "", quelle: "keine"};
  }
  C.hostAdresse = adresse;
  const ports = s => Object.keys(G(s).running.if || {});

  function adapter(s, port, alle){
    const g = G(s), k = g.running.if[port] || {}, ps = Modell.portStatus(s.netz, s.id, port);
    if (k.an === false) return [];                                     /* deaktivierter Adapter erscheint nicht */
    const z = ["", `Ethernet-Adapter ${ADAPTER(port)}:`, ""], mac = IP.macWindows((g.hw.macs || {})[port] || "");
    const hw = () => { if (alle) z.push("   Beschreibung. . . . . . . . . . . : Netzwerkadapter (Labor)", `   Physische Adresse . . . . . . . . : ${mac}`,
                                        `   DHCP aktiviert. . . . . . . . . . : ${k.dhcp ? "Ja" : "Nein"}`, "   Autokonfiguration aktiviert . . . : Ja"); };
    if (ps.status !== "oben") {
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
      const l = (zustand(s).dhcp || {})[port];
      if (a.quelle === "dhcp" && l && l.server) z.push(`   DHCP-Server . . . . . . . . . . . : ${l.server}`);
      if (a.dns) z.push(`   DNS-Server  . . . . . . . . . . . : ${a.dns}`);
      z.push("   NetBIOS über TCP/IP . . . . . . . : Aktiviert");
    }
    return z;
  }
  const KEIN_ADAPTER = "Der Vorgang ist fehlgeschlagen, da sich kein Adapter in einem für diesen Vorgang zulässigen Status befindet.";
  function ipconfig(s, args){
    const opt = (args[0] || "").toLowerCase();
    const g = G(s), alle = ports(s);
    if (!opt) return [...KOPF, ...alle.flatMap(p => adapter(s, p, false))].join("\n");
    if (opt === "/all") return [...KOPF, `   Hostname  . . . . . . . . . . . . : ${g.running.hostname}`, "   Primäres DNS-Suffix . . . . . . . :",
      "   Knotentyp . . . . . . . . . . . . : Hybrid", "   IP-Routing aktiviert  . . . . . . : Nein", "   WINS-Proxy aktiviert  . . . . . . : Nein",
      ...alle.flatMap(p => adapter(s, p, true))].join("\n");
    if (opt === "/flushdns") return [...KOPF, "Der DNS-Auflösungscache wurde geleert."].join("\n");
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
        tipp: "Dieser Rechner hat eine feste (statische) Adresse. Für DHCP stellst du im Inspektor „automatisch (DHCP)“ ein."};
      const sim = h.sim(); if (!sim || typeof sim.dhcp !== "function") return {ausgabe: "(Die Simulation ist noch nicht geladen.)", fehler: true};
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
      return {ausgabe: z.join("\n"), trace, hinweis, tipp: hinweis, fehler};
    }
    return {ausgabe: "Fehler: Unbekannte oder unvollständige Befehlszeilenoption.\n\nSyntax: ipconfig [/all | /release | /renew | /flushdns]", fehler: true};
  }

  /* Liegt es am eigenen Rechner? (Windows meldet dann „Allgemeiner Fehler“ statt zu senden) */
  function lokalerFehler(s, ip){
    const ps = Modell.portStatus(s.netz, s.id, "eth0"), a = adresse(s, "eth0");
    if (ps.status !== "oben") return "Das Netzwerkkabel ist nicht verbunden oder der Link ist unten (ipconfig: „Medium getrennt“).";
    if (!a.ip) return "Der Rechner hat keine IP-Adresse.";
    if (IP.maskeGueltig(a.maske) && !IP.gleichesNetz(a.ip, ip, a.maske) && !a.gw) return "Das Ziel liegt in einem anderen Netz, und es ist kein Standardgateway eingetragen.";
    return null;
  }
  function namenAufloesen(s, ziel){
    if (IP.gueltig(ziel)) return {ip: IP.zuText(IP.zuZahl(ziel)), name: null};
    const sim = h.sim();
    const d = sim && typeof sim.dns === "function" ? sim.dns(s.netz, s.id, ziel) || {} : {};
    return d.ok && d.ip ? {ip: d.ip, name: ziel, trace: d.trace} : {fehlt: true, trace: d.trace || null, grund: d.grund || null};
  }
  function ping(s, args){
    let anzahl = 4, ziel = null;
    for (let i = 0; i < args.length; i++) {
      const a = args[i].toLowerCase();
      if (a === "-n") { const n = parseInt(args[++i], 10); if (!(n >= 1 && n <= 4294967295)) return {ausgabe: `Ungültiger Wert für Option -n.`, fehler: true}; anzahl = Math.min(n, 100); }
      else if (a === "-l" || a === "-w" || a === "-i") i++;
      else if (a[0] === "-" || a[0] === "/") continue;
      else ziel = args[i];
    }
    if (!ziel) return {ausgabe: "Syntax: ping [-n Anzahl] Zielname\n\nOptionen:\n    -n Anzahl      Anzahl der zu sendenden Echoanforderungen (Standard 4).", fehler: true};
    const sim = h.sim(); if (!sim || typeof sim.ping !== "function") return {ausgabe: "(Die Simulation ist noch nicht geladen.)", fehler: true};
    const n = namenAufloesen(s, ziel);
    if (n.fehlt) return {ausgabe: `Ping-Anforderung konnte Host "${ziel}" nicht finden. Überprüfen Sie den Namen, und versuchen Sie es erneut.`, fehler: true, trace: n.trace,
      tipp: "Der Name ließ sich nicht auflösen. Prüfe mit „ipconfig /all“, ob ein DNS-Server eingetragen ist, und teste ihn mit „nslookup " + ziel + "“."};
    const z = ["", n.name ? `Ping wird ausgeführt für ${n.name} [${n.ip}] mit 32 Bytes Daten:` : `Ping wird ausgeführt für ${n.ip} mit 32 Bytes Daten:`];
    let empfangen = 0, allgemein = false; const rtts = [];
    const r = sim.ping(s.netz, s.id, n.ip, {anzahl}) || {}, trace = r.trace || null;
    /* Sim-Antwort: {ok, art:"echo"|"timeout"|"unreachable"|"time-exceeded"|"fehler", code, lokal, grund, rtt, ttl, von} */
    for (const a of (r.antworten || []).slice(0, anzahl)) {
      const art = a.art || (a.ok ? "echo" : a.von ? "unreachable" : "timeout");
      if (art === "echo") {
        const t = Math.round(a.rtt || 0); rtts.push(t); empfangen++;
        z.push(`Antwort von ${a.von || n.ip}: Bytes=32 Zeit${t < 1 ? "<1ms" : "=" + t + "ms"} TTL=${a.ttl != null ? a.ttl : 128}`);
      } else if (art === "time-exceeded") { empfangen++; z.push(`Antwort von ${a.von}: TTL beim Transport abgelaufen.`); }
      else if (art === "unreachable" && a.von) {
        /* lokal: Windows meldet die EIGENE Adresse („Antwort von 192.168.1.10: Zielhost nicht erreichbar.“) */
        empfangen++; z.push(`Antwort von ${a.von}: Ziel${a.code === "net" ? "netz" : a.code === "port" ? "port" : "host"} nicht erreichbar.`);
      } else if (art === "fehler") { allgemein = true; z.push("PING: Fehler bei der Übertragung. Allgemeiner Fehler."); }
      else z.push("Zeitüberschreitung der Anforderung.");
    }
    const lokal = allgemein ? (lokalerFehler(s, n.ip) || "Der Rechner kann das Paket gar nicht erst losschicken.") : null;
    const verloren = anzahl - empfangen;
    z.push("", `Ping-Statistik für ${n.ip}:`, `    Pakete: Gesendet = ${anzahl}, Empfangen = ${empfangen}, Verloren = ${verloren}`,
           `    (${Math.floor(verloren * 100 / anzahl)}% Verlust),`);
    if (rtts.length) z.push("Ca. Zeitangaben in Millisek.:",
      `    Minimum = ${Math.min(...rtts)}ms, Maximum = ${Math.max(...rtts)}ms, Mittelwert = ${Math.round(rtts.reduce((x, y) => x + y, 0) / rtts.length)}ms`);
    let hinweis = null;
    if (lokal) hinweis = lokal + " Windows schickt dann gar nichts los.";
    else if (!rtts.length && empfangen) hinweis = "„Zielhost nicht erreichbar“ zählt Windows als „empfangen“ – 0 % Verlust heißt hier also NICHT, dass es klappt.";
    else if (!rtts.length) hinweis = "Keine Antwort. Arbeite dich von innen nach außen vor: eigene Adresse (ipconfig), Gateway pingen, dann weiter.";
    return {ausgabe: z.join("\n"), trace, hinweis};
  }
  function tracert(s, args){
    const ziel = args.find(a => a[0] !== "-" && a[0] !== "/");
    if (!ziel) return {ausgabe: "Syntax: tracert [-d] Zielname", fehler: true};
    const sim = h.sim(); if (!sim || typeof sim.traceroute !== "function") return {ausgabe: "(Die Simulation ist noch nicht geladen.)", fehler: true};
    const n = namenAufloesen(s, ziel);
    if (n.fehlt) return {ausgabe: `Der Zielname "${ziel}" konnte nicht aufgelöst werden.`, fehler: true, trace: n.trace};
    const z = n.name ? ["", `Routenverfolgung zu ${n.name} [${n.ip}]`, "über maximal 30 Hops:", ""] : ["", `Routenverfolgung zu ${n.ip} über maximal 30 Hops`, ""];
    const r = sim.traceroute(s.netz, s.id, n.ip, {maxHops: 30}) || {};
    const zeit = t => t == null ? rechts("*", 6) + "   " : rechts(t < 1 ? "<1 ms" : `${Math.round(t)} ms`, 9);
    for (const hop of r.hops || []) {
      const nr = rechts(hop.nr, 3);
      if (!hop.ip && hop.nr === 1 && hop.grund && hop.grund !== "TIMEOUT" && lokalerFehler(s, n.ip)) {
        z.push(nr + "     Übertragungsfehler: Allgemeiner Fehler."); break;                     /* Windows-ähnlich */
      }
      if (!hop.ip) { z.push(nr + "     *        *        *     Zeitüberschreitung der Anforderung."); continue; }
      if (hop.code || (hop.grund && hop.grund !== "TTL_EXPIRED" && hop.grund !== "TIMEOUT")) {
        z.push(`${nr}  ${hop.ip}  meldet: Ziel${hop.code === "net" || hop.grund === "NO_ROUTE" ? "netz" : "host"} nicht erreichbar.`); break;
      }
      const rtts = hop.rtts && hop.rtts.length ? hop.rtts.slice(0, 3) : [2 * hop.nr];
      while (rtts.length < 3) rtts.push(rtts[rtts.length - 1]);
      z.push(nr + rtts.map(zeit).join("") + "  " + hop.ip);
    }
    z.push("", "Ablaufverfolgung beendet.");
    return {ausgabe: z.join("\n"), trace: r.trace || null};
  }
  function arp(s, args){
    const opt = (args[0] || "").toLowerCase();
    if (opt === "-d") { Modell.laufzeit(s.netz, s.id).arp = {}; return ""; }
    if (opt !== "-a" && opt !== "-g") return {ausgabe: "Zeigt und ändert die IP-zu-Physikalisch-Adressübersetzungstabellen, die vom\nAddress Resolution Protocol (ARP) verwendet werden.\n\nARP -a      Zeigt die aktuellen ARP-Einträge an.\nARP -d      Löscht die ARP-Einträge.", fehler: !!opt};
    const a = adresse(s, "eth0");
    if (!a.ip) return "Keine ARP-Einträge gefunden.";
    const uhr = (s.netz.zustand && s.netz.zustand._uhr) || 0, eintraege = [];
    for (const [ip, e] of Object.entries(zustand(s).arp || {})) if (e && (e.bis == null || e.bis > uhr)) eintraege.push([ip, IP.macWindows(e.mac).toLowerCase(), "dynamisch"]);
    eintraege.sort((x, y) => IP.zuZahl(x[0]) - IP.zuZahl(y[0]));
    if (IP.maskeGueltig(a.maske)) eintraege.push([IP.broadcast(a.ip, a.maske), "ff-ff-ff-ff-ff-ff", "statisch"]);
    eintraege.push(["255.255.255.255", "ff-ff-ff-ff-ff-ff", "statisch"]);
    return ["", `Schnittstelle: ${a.ip} --- 0x4`, "  Internetadresse       Physische Adresse     Typ",
            ...eintraege.map(e => "  " + links(e[0], 22) + links(e[1], 22) + e[2])].join("\n");
  }
  /* nslookup: Wortlaut der Fehlermeldungen Windows-ähnlich (deutsche Windows-Fassung nicht vollständig belegt) */
  function nslookup(s, args){
    const name = args.find(a => a[0] !== "-");
    if (!name) return {ausgabe: "(Der interaktive Modus von nslookup ist hier nicht nachgebaut. Beispiel: nslookup www.beispiel.de)", fehler: true};
    const a = adresse(s, "eth0");
    if (!a.dns) return {ausgabe: `*** Standardserver sind nicht verfügbar.\nServer:  UnKnown\nAddress:  127.0.0.1\n\n*** UnKnown kann ${name} nicht finden: No response from server`, fehler: true,
      tipp: "Es ist kein DNS-Server eingetragen. Das siehst du mit „ipconfig /all“ (Zeile DNS-Server)."};
    const sim = h.sim(); if (!sim || typeof sim.dns !== "function") return {ausgabe: "(Die Simulation ist noch nicht geladen.)", fehler: true};
    let sname = "UnKnown";
    for (const g of Object.values(s.netz.geraete)) if (g.typ === "internet") for (const x of g.running.server || []) if (x.ip === a.dns) sname = x.name;
    const kopf = [`Server:  ${sname}`, `Address:  ${a.dns}`, ""];
    const d = sim.dns(s.netz, s.id, name) || {};
    if (d.ok) return {ausgabe: [...kopf, `Name:    ${name}`, `Address:  ${d.ip}`, ""].join("\n"), trace: d.trace || null};
    if (d.grund === "DNS_FAIL") return {ausgabe: [...kopf, `*** ${sname} kann ${name} nicht finden: Non-existent domain`].join("\n"), trace: d.trace || null, fehler: true,
      tipp: "Der DNS-Server antwortet, kennt den Namen aber nicht. Tippfehler? Oder fehlt der Eintrag auf dem Server?"};
    return {ausgabe: ["Zeitüberschreitung bei DNS-Anforderung.", "    Das Zeitlimit beträgt 2 Sekunden.", ...kopf, `*** Zeitüberschreitung bei Anforderung an ${sname}.`].join("\n"),
      trace: d.trace || null, fehler: true, tipp: "Der DNS-Server antwortet nicht. Ist er per ping erreichbar? Läuft dort der DNS-Dienst?"};
  }
  const HILFE = ["Befehle in diesem Terminal (Windows-artig):",
    "  ipconfig [/all | /release | /renew | /flushdns]   eigene Adresse, Maske, Gateway; DHCP neu anfordern",
    "  ping [-n Anzahl] Ziel                             Erreichbarkeit testen (IP-Adresse oder Name)",
    "  tracert Ziel                                      Weg zum Ziel, Router für Router",
    "  arp -a  |  arp -d                                 ARP-Cache anzeigen bzw. leeren",
    "  nslookup Name                                     Namen beim DNS-Server nachfragen",
    "  hostname                                          Rechnernamen anzeigen",
    "  cls                                               Bildschirm leeren"].join("\n");
  const BEFEHLE = {
    ipconfig, ping, tracert, arp, nslookup,
    hostname: s => G(s).running.hostname,
    cls: () => ({ausgabe: "", leeren: true}),
    help: () => HILFE, hilfe: () => HILFE, "?": () => HILFE,
    exit: () => ({ausgabe: "", hinweis: "Das Terminal bleibt im Spiel offen."}),
  };
  const IOS_WOERTER = /^(show|sh|enable|en|conf|configure|interface|int|ip|vlan|switchport|no|copy|write|wr|reload|hostname)$/i;
  C.hostEingabe = function(s, zeile){
    const t = String(zeile).trim();
    if (!t) return C.antwort(s, "", "", false);
    s.historie.push(t); if (s.historie.length > 50) s.historie.shift(); s.hIndex = null;
    const teile = t.split(/\s+/), cmd = teile[0].toLowerCase().replace(/\.exe$/, "");
    const fn = Object.prototype.hasOwnProperty.call(BEFEHLE, cmd) ? BEFEHLE[cmd] : null;
    let r;
    try {
      r = fn ? fn(s, teile.slice(1)) : {ausgabe: `Der Befehl "${teile[0]}" ist entweder falsch geschrieben oder\nkonnte nicht gefunden werden.`, fehler: true,
        tipp: IOS_WOERTER.test(cmd) ? "Das ist ein Befehl für Router und Switches (IOS). Auf dem PC gibt es ipconfig, ping, tracert … – „help“ zeigt alle." : "„help“ zeigt die Befehle dieses Terminals."};
    } catch (e) { r = {ausgabe: "Interner Fehler des Terminals: " + (e && e.message || e), fehler: true}; }
    return C.antwort(s, r, t, false);
  };
  C.hostTab = function(s, zeile){
    const z = String(zeile || ""), m = /^(\s*)(\S*)$/.exec(z);
    const namen = ["arp", "cls", "help", "hostname", "ipconfig", "nslookup", "ping", "tracert"];
    if (m) {
      const t = m[2].toLowerCase(), kandidaten = namen.filter(n => n.startsWith(t));
      if (kandidaten.length === 1) return {zeile: m[1] + kandidaten[0] + " ", vorschlaege: []};
      return {zeile: z, vorschlaege: t ? kandidaten : namen};
    }
    const o = /^(\s*ipconfig\s+)(\S*)$/i.exec(z);
    if (o) {
      const opts = ["/all", "/release", "/renew", "/flushdns"].filter(x => x.startsWith(o[2].toLowerCase()));
      if (opts.length === 1) return {zeile: o[1] + opts[0], vorschlaege: []};
      return {zeile: z, vorschlaege: opts};
    }
    return {zeile: z, vorschlaege: []};
  };
})();
