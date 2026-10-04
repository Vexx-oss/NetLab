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

  /* ---------- SSH vom Terminal auf Router/Switch (Phase C, C3) ----------
     ssh -l BENUTZER ZIEL | ssh BENUTZER@ZIEL. Klappt nur, wenn das Gerät erreichbar ist und für SSH eingerichtet:
     hostname + ip domain-name, crypto key generate rsa, username … secret …, line vty … login local + transport input ssh.
     Danach laufen die Eingaben in einer IOS-Sitzung des Zielgeräts (exit/logout beendet die Verbindung). */
  function sshStarten(s, t){
    const w = t.split(/\s+/).slice(1), lin = os(s) === "linux";
    let user = null, ziel = null;
    for (let i = 0; i < w.length; i++) { if (w[i] === "-l") user = w[++i]; else if (w[i] === "-p") i++; else if (w[i][0] !== "-") ziel = w[i]; }
    if (ziel && ziel.includes("@")) [user, ziel] = ziel.split("@");
    if (!ziel) return {ausgabe: "usage: ssh [-l login_name] [-p port] destination", fehler: true};
    user = user || (lin ? "admin" : "azubi");
    const n = H.aufloesen(s, ziel);
    if (n.fehlt) return {ausgabe: `ssh: Could not resolve hostname ${ziel}: ${lin ? "Name or service not known" : "Der angegebene Host ist unbekannt."}`, fehler: true, trace: n.trace, befund: `SSH: Name „${ziel}“ unbekannt`, ok: false};
    const sim = h.sim(); if (!sim || typeof sim.ping !== "function") return {ausgabe: "(Die Simulation ist noch nicht geladen.)", fehler: true};
    const p = sim.ping(s.netz, s.id, n.ip, {anzahl: 1}) || {};
    if (!(p.antworten || []).some(a => a.ok)) return {ausgabe: `ssh: connect to host ${ziel} port 22: Connection timed out`, fehler: true, trace: p.trace, befund: `SSH zu ${ziel}: keine Verbindung`, ok: false,
      tipp: "Das Gerät antwortet nicht einmal auf Ping. Erst die Erreichbarkeit klären (Adresse, Gateway, Kabel)."};
    const z = Object.values(s.netz.geraete).find(g => Modell.IOS[g.typ] && g.typ !== "firewall" && Modell.adressen(g).some(a => a.ip === n.ip));
    if (!z) return {ausgabe: `ssh: connect to host ${ziel} port 22: Connection refused`, fehler: true, trace: p.trace, befund: `SSH zu ${ziel}: abgelehnt`, ok: false,
      tipp: "SSH-Anmeldung ist im Labor für Router und Switches nachgebaut. Das Terminal eines Servers öffnest du per Doppelklick."};
    const k = z.running, vty = (k.lines || {}).vty || {login: true};
    if (!k.sshSchluessel || vty.transport === "telnet" || vty.transport === "none")
      return {ausgabe: `ssh: connect to host ${ziel} port 22: Connection refused`, fehler: true, trace: p.trace, befund: `SSH zu ${z.name}: abgelehnt (kein SSH eingerichtet)`, ok: false,
        tipp: `${z.name} ist erreichbar, nimmt aber kein SSH an: Es fehlt „crypto key generate rsa“ (dafür hostname und ip domain-name) oder „transport input ssh“ unter line vty.`};
    if (vty.login !== "local") return {ausgabe: `Connection closed by ${n.ip} port 22`, fehler: true, trace: p.trace, befund: `SSH zu ${z.name}: keine Anmeldung möglich`, ok: false,
      tipp: "SSH braucht Benutzer und Passwort: „username admin secret …“ und unter line vty „login local“."};
    s.ssh = {ziel: z.id, name: ziel, ip: n.ip, user, phase: "passwort", versuche: 0, von: H.adresse(s, "eth0").ip || "?"};
    return {ausgabe: "", trace: p.trace, befund: `SSH zu ${z.name}: Anmeldung läuft`, ok: true};
  }
  function sshEingabe(s, zeile){
    const v = s.ssh, z = s.netz.geraete[v.ziel];
    if (!z) { s.ssh = null; return {ausgabe: `Connection to ${v.name} closed.`, fehler: true}; }
    if (v.phase === "passwort") {
      const b = (z.running.benutzer || {})[v.user];
      if (b && zeile === b.pw) {
        v.phase = "an";
        v.sitzung = C.sitzung(s.netz, z.id, {verlauf: s.verlauf, einstieg: s.einstieg, tipps: s.tipps});
        v.sitzung.rueckfrage = null; v.sitzung.modus = "user"; v.sitzung.ueberSsh = {user: v.user, von: v.von};
        return {ausgabe: z.running.banner ? "\n" + z.running.banner + "\n" : "", befund: `SSH als ${v.user} auf ${z.name} angemeldet`, ok: true};
      }
      v.versuche++;
      if (v.versuche >= 3) { s.ssh = null; return {ausgabe: `${v.user}@${v.name}: Permission denied (publickey,keyboard-interactive,password).`, fehler: true, tipp: "Benutzer oder Passwort stimmen nicht – „show running-config | include username“ auf dem Gerät zeigt die Benutzer."}; }
      return {ausgabe: "Permission denied, please try again.", fehler: true};
    }
    const r = C.eingabe(v.sitzung, zeile);
    if (v.sitzung.modus === "abgemeldet") { s.ssh = null; return Object.assign({}, r, {ausgabe: `Connection to ${v.name} closed.`, prompt: C.prompt(s)}); }
    return r;
  }

  /* ---------- Dispatcher ---------- */
  const os = s => s.os || Modell.osVon(G(s)) || "windows";
  C.hostPrompt = function(s){
    const g = G(s);
    if (s.ssh) return s.ssh.phase === "passwort" ? `${s.ssh.user}@${s.ssh.name}'s password:` : C.prompt(s.ssh.sitzung);
    if (os(s) === "linux") return `${s.root ? "root" : "admin"}@${String(g.running.hostname || g.name).toLowerCase()}:~${s.root ? "#" : "$"}`;
    return s.ps ? "PS C:\\>" : "C:\\>";
  };
  C.hostBegruessung = s => os(s) === "linux" ? "Linux-ähnliche Shell (bash) – „help“ zeigt die Befehle." : "Eingabeaufforderung (Windows-artig) – „help“ zeigt die Befehle.";
  const IOS_WOERTER = /^(show|sh|enable|en|conf|configure|interface|int|vlan|switchport|no|copy|write|wr|reload)$/i;
  C.hostEingabe = function(s, zeile){
    if (s.ssh) {                                   /* SSH-Sitzung: Eingaben gehen ans Zielgerät */
      const r = sshEingabe(s, String(zeile).trim());
      return r && typeof r.prompt === "string" ? r : C.antwort(s, r, "", !!(r && r.geaendert));
    }
    const t = String(zeile).trim();
    if (!t) return C.antwort(s, "", "", false);
    s.historie.push(t); if (s.historie.length > 50) s.historie.shift(); s.hIndex = null;
    const tabelle = C.HOST_BEFEHLE[os(s)] || {};
    let r;
    try { r = /^ssh(\s|$)/i.test(t) ? sshStarten(s, t) : tabelle._eingabe ? tabelle._eingabe(s, t) : {ausgabe: "(kein Terminal für dieses Betriebssystem)", fehler: true}; }
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
