"use strict";
/* ---------- Konsole: Terminal für pc/server/nas – gemeinsamer Kern (Phase C) ----------
   Jedes Endgerät hat ein Betriebssystem (Modell.osVon: pc → windows, server/nas → linux, änderbar im Inspektor).
     windows  host-windows.js  Eingabeaufforderung (cmd) und auf Wunsch ein PowerShell-Auszug („powershell“)
     linux    host-linux.js    bash mit sudo
   Hier: Dispatcher (CLI.hostEingabe, CLI.hostTab, CLI.hostPrompt, CLI.hostBegruessung) und gemeinsame Helfer CLI.host.*
   Ergebnis eines Befehls: Text | {ausgabe, fehler, tipp, hinweis, trace, befund, ok, geaendert, leeren, unbekannt}
     befund/ok: eine Zeile für die Akte (Beweiskarte) – nur bei Diagnosebefehlen.
   Konfiguration ändern nur netsh/route (Windows) bzw. sudo ip/systemctl (Linux) – über CLI.ausfuehren (Verlauf). */
(() => {
  const C = CLI, h = C.h;
  C.HOST_BEFEHLE ||= {};
  const G = s => h.geraet(s);
  const zustand = s => (s.netz.zustand && s.netz.zustand[s.id]) || {};
  const H = C.host = {};

  /* ---------- Adresse eines Adapters: Sim.adresse (echte Lage inkl. DHCP/APIPA), sonst Konfig + Laufzeit ---------- */
  H.adresse = function(s, port = "eth0"){
    const sim = h.sim();
    if (sim && typeof sim.adresse === "function") {
      try { const a = sim.adresse(s.netz, s.id, port); if (a) return a; } catch (e) { /* Rückfall unten */ }
    }
    const k = (G(s).running.if || {})[port] || {};
    if (!k.dhcp) return k.ip ? {ip: k.ip, maske: k.maske, gw: k.gw, dns: k.dns, quelle: "statisch"} : {ip: "", maske: "", gw: "", dns: "", quelle: "keine"};
    const l = (zustand(s).dhcp || {})[port];
    if (l && l.ip) return {ip: l.ip, maske: l.maske, gw: l.gw || "", dns: l.dns || "", quelle: IP.apipa(l.ip) ? "apipa" : "dhcp"};
    return {ip: "", maske: "", gw: "", dns: "", quelle: "keine"};
  };
  C.hostAdresse = H.adresse;
  H.ports = s => Object.keys(G(s).running.if || {});
  H.linkOben = (s, port = "eth0") => Modell.portStatus(s.netz, s.id, port).status === "oben";
  H.lease = (s, port = "eth0") => (zustand(s).dhcp || {})[port] || null;
  H.zustand = zustand;

  /* Liegt es am eigenen Rechner? (Windows: „Allgemeiner Fehler“, Linux: „Network is unreachable“) */
  H.lokalerFehler = function(s, ip){
    const a = H.adresse(s, "eth0");
    if (!H.linkOben(s, "eth0")) return "Das Netzwerkkabel ist nicht verbunden oder der Link ist unten.";
    if (!a.ip) return "Der Rechner hat keine IP-Adresse.";
    if (ip && IP.maskeGueltig(a.maske) && !IP.gleichesNetz(a.ip, ip, a.maske) && !a.gw) return "Das Ziel liegt in einem anderen Netz, und es ist kein Standardgateway eingetragen.";
    return null;
  };
  /* Name → IP über die Simulation (merkt sich Treffer für ipconfig /displaydns) */
  H.aufloesen = function(s, ziel){
    if (IP.gueltig(ziel)) return {ip: IP.zuText(IP.zuZahl(ziel)), name: null};
    const sim = h.sim();
    const d = sim && typeof sim.dns === "function" ? sim.dns(s.netz, s.id, ziel) || {} : {};
    if (d.ok && d.ip) { (s.dnsCache ||= {})[String(ziel).toLowerCase()] = d.ip; return {ip: d.ip, name: ziel, trace: d.trace}; }
    return {fehlt: true, trace: d.trace || null, grund: d.grund || null};
  };
  /* Dienste dieses Geräts: [{dienst, proto, port, name, an}] */
  H.dienste = s => Object.entries(G(s).running.dienste || {}).filter(([d]) => Modell.DIENSTPORTS[d])
    .map(([d, c]) => Object.assign({dienst: d, an: !!(c && c.an)}, Modell.DIENSTPORTS[d]));
  /* Konfiguration ändern – über den Verlauf (eine Quelle der Wahrheit, Rückgängig geht) */
  H.aendern = (s, beschreibung, fn) => C.ausfuehren(s, `${G(s).name}: ${beschreibung}`, fn, false).geaendert;
  /* Letzte Aufzeichnung je Netz (für tcpdump): Konsole und Oberfläche legen sie hier ab */
  const SPUREN = new WeakMap();
  H.merkeTrace = (netz, trace) => { if (netz && trace) SPUREN.set(netz, trace); };
  H.letzteTrace = netz => SPUREN.get(netz) || null;
  C.traceMerken = H.merkeTrace;
  /* Ping-Ergebnis in einer Zeile (Akte) */
  H.pingBefund = function(r, anzahl){
    const antw = (r && r.antworten) || [];
    const art = a => a.art || (a.ok ? "echo" : a.von ? "unreachable" : "timeout");
    const echo = antw.filter(a => art(a) === "echo").length;
    if (echo === anzahl && echo) return {befund: `${echo}/${anzahl} Antworten`, ok: true};
    if (echo) return {befund: `${echo}/${anzahl} Antworten, Rest verloren`, ok: false};
    const m = antw.find(a => art(a) === "unreachable" || art(a) === "time-exceeded");
    if (m && m.von) return {befund: art(m) === "time-exceeded" ? `TTL abgelaufen (Meldung von ${m.von})` : `Zielhost nicht erreichbar (Meldung von ${m.von})`, ok: false};
    if (antw.some(a => art(a) === "fehler")) return {befund: "Allgemeiner Fehler – der Rechner sendet gar nicht", ok: false};
    return {befund: "Zeitüberschreitung – keine Antwort", ok: false};
  };
  /* Argumente mit Anführungszeichen zerlegen: netsh interface ip set address "Ethernet" static … */
  H.woerter = text => { const l = [], re = /"([^"]*)"|(\S+)/g; let m; while ((m = re.exec(text))) l.push(m[1] != null ? m[1] : m[2]); return l; };
  /* Webseite im Labor (curl): kleine, erkennbare Seite */
  H.seite = (host, ip) => `<!DOCTYPE html>\n<html><head><title>${host}</title></head>\n<body><h1>${host}</h1><p>Webserver ${ip} antwortet (Labor).</p></body></html>`;

  /* ---------- Dispatcher ---------- */
  const os = s => s.os || Modell.osVon(G(s)) || "windows";
  C.hostPrompt = function(s){
    const g = G(s);
    if (os(s) === "linux") return `${s.root ? "root" : "admin"}@${String(g.running.hostname || g.name).toLowerCase()}:~${s.root ? "#" : "$"}`;
    return s.ps ? "PS C:\\>" : "C:\\>";
  };
  C.hostBegruessung = s => os(s) === "linux" ? "Linux-ähnliche Shell (bash) – „help“ zeigt die Befehle." : "Eingabeaufforderung (Windows-artig) – „help“ zeigt die Befehle.";
  const IOS_WOERTER = /^(show|sh|enable|en|conf|configure|interface|int|vlan|switchport|no|copy|write|wr|reload)$/i;
  C.hostEingabe = function(s, zeile){
    const t = String(zeile).trim();
    if (!t) return C.antwort(s, "", "", false);
    s.historie.push(t); if (s.historie.length > 50) s.historie.shift(); s.hIndex = null;
    const tabelle = C.HOST_BEFEHLE[os(s)] || {};
    let r;
    try { r = tabelle._eingabe ? tabelle._eingabe(s, t) : {ausgabe: "(kein Terminal für dieses Betriebssystem)", fehler: true}; }
    catch (e) { r = {ausgabe: "Interner Fehler des Terminals: " + (e && e.message || e), fehler: true}; }
    if (r && typeof r === "object" && r.unbekannt) {
      const wort = t.split(/\s+/)[0];
      r = os(s) === "linux"
        ? {ausgabe: `${wort}: command not found`, fehler: true,
           tipp: IOS_WOERTER.test(wort) ? "Das ist ein Befehl für Router und Switches (IOS). Hier ist eine Linux-Shell – „help“ zeigt, was geht." : "„help“ zeigt die Befehle dieser Shell."}
        : {ausgabe: s.ps ? `${wort} : Die Benennung "${wort}" wurde nicht als Name eines Cmdlet, einer Funktion, einer Skriptdatei oder eines ausführbaren Programms erkannt.`
                         : `Der Befehl "${wort}" ist entweder falsch geschrieben oder\nkonnte nicht gefunden werden.`, fehler: true,
           tipp: IOS_WOERTER.test(wort) ? "Das ist ein Befehl für Router und Switches (IOS). Auf dem PC gibt es ipconfig, ping, tracert … – „help“ zeigt alle." : "„help“ zeigt die Befehle dieses Terminals."};
    }
    if (r && typeof r === "object" && r.trace) H.merkeTrace(s.netz, r.trace);
    return C.antwort(s, r, t, !!(r && typeof r === "object" && r.geaendert));
  };
  C.hostTab = function(s, zeile){
    const z = String(zeile || ""), tabelle = C.HOST_BEFEHLE[os(s)] || {};
    const namen = (tabelle._namen ? tabelle._namen(s) : []).slice().sort((a, b) => a.localeCompare(b));
    const m = /^(\s*(?:sudo\s+)?)(\S*)$/.exec(z);
    if (m) {
      const t = m[2].toLowerCase(), kand = namen.filter(n => n.toLowerCase().startsWith(t));
      if (kand.length === 1) return {zeile: m[1] + kand[0] + " ", vorschlaege: []};
      return {zeile: z, vorschlaege: t ? kand : namen};
    }
    const o = tabelle._optionen ? tabelle._optionen(s, z) : null;
    if (o && o.kand.length) {
      if (o.kand.length === 1) return {zeile: o.vor + o.kand[0], vorschlaege: []};
      return {zeile: z, vorschlaege: o.kand};
    }
    return {zeile: z, vorschlaege: []};
  };
})();
