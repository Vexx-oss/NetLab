"use strict";
/* ---------- Konsole (CLI): Namensraum, Parser, Modi, Sitzung ----------
   Vertrag: Architektur.md § 6, Konzept § 6. Kein DOM, keine Uhr, kein Zufall (Architektur § 1).
   IOS-ähnlich: Verhalten und Ausgaben an Cisco IOS 15 (Router der 1900er-Reihe, Switch 2960) angelehnt.
   Was nicht belegt ist, ist vereinfacht und in den Kommentaren als „IOS-ähnlich“ markiert.

   Aufbau der Schicht (bauen.py lädt parser.js zuerst, dann alphabetisch):
     parser.js        CLI, Zerlegen, Befehlsbaum-Maschine (Kurzformen, ?, Tab, Fehler), Sitzung, eingabe()
     entspricht.js    CLI.entspricht (GUI → Befehl), CLI.anwenden, CLI.vorschlag, CLI.erklaere
     host-terminal.js Windows-artiges Terminal für pc/server/nas
     ios-ausgaben.js  show-Ausgaben, running-config, ping/traceroute
     ios-befehle.js   Befehlsbäume (CLI.baeumeBauen) und Konfigurationsbefehle

   Befehlsbaum-Knoten:
     {w:"hostname"}               Schlüsselwort (Kurzform: jedes eindeutige Präfix)
     {p:"WORD", t:"wort", n:"x"}  Parameter vom Typ t (CLI.PARAM), Wert landet in a[n]
     h: englische IOS-Hilfe, d: deutsche Kurz-Erklärung (Einstieg), k: Kinder (Array oder fn(s, ctx)),
     f: Handler (s, a) → Text | {ausgabe, fehler, tipp, rueckfrage}, cr: hier darf der Befehl enden,
     noCr: in der no-Form darf er hier enden, nein:false: keine no-Form, nurNo: nur in der no-Form,
     nur(s): nur auf passenden Geräten/Modi, sim: ändert keine Konfiguration (nie über den Verlauf),
     zeigen: Ausgabe darf mit „| include …“ gefiltert werden, n + v: Schlüsselwort setzt a[n] = v. */
const CLI = (() => {
  const C = {};

  /* ---------- Text-Helfer ---------- */
  const h = C.h = {};
  h.links = (s, n) => { s = String(s == null ? "" : s); return s.length >= n ? s : s + " ".repeat(n - s.length); };
  h.rechts = (s, n) => { s = String(s == null ? "" : s); return s.length >= n ? s : " ".repeat(n - s.length) + s; };
  h.zeilen = arr => arr.filter(x => x != null).join("\n");

  /* ---------- Schnittstellennamen ----------
     Kanonisch im Modell: "Fa0/1", "Gi0/0", "Gi0/0.10"; SVIs "Vlan10" (Pfad svi.10). */
  const TYPEN = [
    {kurz: "Fa", lang: "FastEthernet", cdp: "Fas", h: "FastEthernet IEEE 802.3", d: "Fast-Ethernet-Port (100 Mbit/s)"},
    {kurz: "Gi", lang: "GigabitEthernet", cdp: "Gig", h: "GigabitEthernet IEEE 802.3z", d: "Gigabit-Port (1000 Mbit/s)"},
    {kurz: "Vlan", lang: "Vlan", cdp: "Vla", h: "Catalyst Vlans", d: "virtuelle Schnittstelle eines VLANs (SVI, Verwaltungsadresse)"},
  ];
  C.IFTYPEN = TYPEN;
  h.langName = name => {
    const m = /^(Fa|Gi)(\d.*)$/.exec(String(name));
    if (m) return (m[1] === "Fa" ? "FastEthernet" : "GigabitEthernet") + m[2];
    return String(name);
  };
  h.kurzName = name => String(name).replace(/^FastEthernet/i, "Fa").replace(/^GigabitEthernet/i, "Gi");
  h.cdpName = name => { const m = /^(Fa|Gi)(\d.*)$/.exec(String(name)); return m ? (m[1] === "Fa" ? "Fas " : "Gig ") + m[2] : String(name); };
  /* Art einer Schnittstelle auf einem Gerät: "port" (Switch-Port), "phys" (Router/Firewall), "sub", "svi" */
  h.ifArt = (g, name) => {
    if (/^Vlan\d+$/.test(name)) return "svi";
    if (/\.\d+$/.test(name)) return "sub";
    return g.typ === "switch" ? "port" : "phys";
  };
  /* Modellpfad einer Schnittstelle: "ports.Fa0/1", "if.Gi0/0", "if.Gi0/0.10", "svi.10" */
  h.ifPfad = (g, name) => {
    const art = h.ifArt(g, name);
    if (art === "svi") return "svi." + name.slice(4);
    if (art === "port") return "ports." + name;
    return "if." + name;
  };
  h.ifKonfig = (g, name) => {
    const k = g.running, art = h.ifArt(g, name);
    if (art === "svi") return (k.svi || {})[name.slice(4)] || null;
    if (art === "port") return (k.ports || {})[name] || null;
    return (k.if || {})[name] || null;
  };
  /* Schnittstellen sortiert: physisch nach Nummer, Subinterfaces direkt hinter ihrem Port */
  h.ifSortieren = namen => namen.slice().sort((a, b) => {
    const z = n => { const m = /^([A-Za-z]+)(\d+)\/(\d+)(?:\.(\d+))?$/.exec(n) || /^([A-Za-z]+)(\d+)$/.exec(n) || [n, n, 0, 0, 0];
      return [m[1], +m[2] || 0, +m[3] || 0, m[4] == null ? -1 : +m[4]]; };
    const x = z(a), y = z(b);
    for (let i = 0; i < 4; i++) { if (x[i] < y[i]) return -1; if (x[i] > y[i]) return 1; }
    return 0;
  });

  /* ---------- VLAN-Listen "1,10,20-30" ---------- */
  h.vlanListeLesen = (text, min = 1, max = 4094) => {
    const r = new Set();
    for (const teil of String(text).split(",")) {
      const m = /^(\d+)(?:-(\d+))?$/.exec(teil.trim()); if (!m) return null;
      const a = +m[1], b = m[2] != null ? +m[2] : a;
      if (a < min || b > max || b < a) return null;
      for (let v = a; v <= b; v++) r.add(v);
    }
    return [...r].sort((x, y) => x - y);
  };
  h.vlanListeText = liste => {
    const l = [...new Set(liste.map(Number))].sort((a, b) => a - b), teile = [];
    for (let i = 0; i < l.length;) { let j = i; while (j + 1 < l.length && l[j + 1] === l[j] + 1) j++;
      teile.push(j > i ? `${l[i]}-${l[j]}` : `${l[i]}`); i = j + 1; }
    return teile.join(",");
  };

  /* ---------- Portnamen in ACLs (IOS-Schlüsselwörter; running-config zeigt sie statt der Zahl) ---------- */
  C.PORTNAMEN = {
    tcp: {"ftp-data": 20, ftp: 21, telnet: 23, smtp: 25, domain: 53, www: 80, pop3: 110, bgp: 179},
    udp: {domain: 53, bootps: 67, bootpc: 68, tftp: 69, ntp: 123, snmp: 161, snmptrap: 162, isakmp: 500, syslog: 514, rip: 520},
  };
  h.portText = (proto, nr) => { const t = C.PORTNAMEN[proto] || {}; for (const [n, z] of Object.entries(t)) if (z === nr) return n; return String(nr); };

  /* ---------- Zugriff auf Gerät und Modell (eine Quelle der Wahrheit) ---------- */
  h.geraet = s => s.netz.geraete[s.id];
  h.konfig = s => h.geraet(s).running;
  h.setzen = (s, pfad, wert) => Modell.setzen(s.netz, s.id, pfad, wert);
  h.loeschen = (s, pfad) => Modell.loeschen(s.netz, s.id, pfad);
  h.fehler = (text, tipp) => ({ausgabe: text, fehler: true, tipp: tipp || null});
  /* Simulation: echte Sim oder (in Tests) CLI.simAttrappe */
  C.simAttrappe = null;
  h.sim = () => C.simAttrappe || (typeof Sim !== "undefined" ? Sim : null);

  /* ---------- Zerlegen ---------- */
  function zerlegen(zeile){
    const t = [], re = /\S+/g; let m;
    while ((m = re.exec(zeile))) t.push({text: m[0], pos: m.index});
    return t;
  }
  C.zerlegen = zerlegen;

  /* ---------- Parameter-Typen ----------
     Rückgabe: {n, wert} (verbraucht n Wörter) | null (passt nicht) | {teil:true} (unvollständig)
               | {mehrdeutig:true} | {invalidPos} (Fehler an bestimmter Stelle) */
  function ipWert(text){ return IP.gueltig(text) ? IP.zuText(IP.zuZahl(text)) : null; }
  function ifTypen(s, node){
    const g = h.geraet(s), ports = Modell.PORTS[g.typ] || [], arten = node.arten || ["phys"];
    const r = [];
    if (ports.some(p => p.startsWith("Fa"))) r.push(TYPEN[0]);
    if (ports.some(p => p.startsWith("Gi"))) r.push(TYPEN[1]);
    if (arten.includes("svi") && g.typ === "switch") r.push(TYPEN[2]);
    return r;
  }
  C.ifTypen = ifTypen;
  function ifNummer(s, typ, rest, arten){
    const g = h.geraet(s);
    if (typ.kurz === "Vlan") { if (!/^\d+$/.test(rest)) return null; const v = +rest; return v >= 1 && v <= 4094 ? "Vlan" + v : null; }
    const m = /^(\d+)\/(\d+)(?:\.(\d+))?$/.exec(rest); if (!m) return null;
    const basis = `${typ.kurz}${+m[1]}/${+m[2]}`;
    if (!(Modell.PORTS[g.typ] || []).includes(basis)) return null;
    if (m[3] != null) {
      if (!arten.includes("sub") || g.typ !== "router") return null;
      const nr = +m[3]; return nr >= 1 && nr <= 4294967295 ? basis + "." + nr : null;
    }
    return basis;
  }
  /* Schnittstelle als Parameter: "g0/0", "gi0/0", "GigabitEthernet 0/0", "fa0/1", "vlan 10", "g0/0.10" */
  function ifParam(s, T, i, node){
    const m = /^([a-z][a-z-]*)(.*)$/i.exec(T[i].text); if (!m) return null;
    const typen = ifTypen(s, node).filter(t => t.lang.toLowerCase().startsWith(m[1].toLowerCase()));
    if (!typen.length) return null;
    if (typen.length > 1) return {mehrdeutig: true};
    let rest = m[2], n = 1;
    if (!rest) { if (i + 1 >= T.length) return {teil: true, typ: typen[0]}; rest = T[i + 1].text; n = 2; }
    const name = ifNummer(s, typen[0], rest, node.arten || ["phys"]);
    if (!name) return {invalidPos: T[i + n - 1].pos + (n === 1 ? m[1].length : 0)};
    return {n, wert: name};
  }
  /* interface range fa0/1 - 5, fa0/7 , g0/1 - 2 → ["Fa0/1", …] */
  function bereichLesen(s, text){
    const g = h.geraet(s), ports = Modell.PORTS[g.typ] || [], r = [];
    for (const teil of String(text).split(",")) {
      const m = /^\s*([a-z][a-z-]*)\s*(\d+)\/(\d+)\s*(?:-\s*(\d+))?\s*$/i.exec(teil); if (!m) return null;
      const typ = TYPEN.slice(0, 2).filter(t => t.lang.toLowerCase().startsWith(m[1].toLowerCase()));
      if (typ.length !== 1) return null;
      const a = +m[3], b = m[4] != null ? +m[4] : a; if (b < a) return null;
      for (let x = a; x <= b; x++) { const p = `${typ[0].kurz}${+m[2]}/${x}`; if (!ports.includes(p)) return null; if (!r.includes(p)) r.push(p); }
    }
    return r.length ? r : null;
  }
  C.bereichLesen = bereichLesen;
  const PARAM = C.PARAM = {
    wort: (s, T, i) => ({n: 1, wert: T[i].text}),
    zahl: (s, T, i, node) => {
      if (!/^\d+$/.test(T[i].text)) return null;
      const z = +T[i].text; return z < node.min || z > node.max ? null : {n: 1, wert: z};
    },
    ip: (s, T, i) => { const w = ipWert(T[i].text); return w ? {n: 1, wert: w} : null; },
    rest: (s, T, i, node, ctx) => ({n: T.length - i, wert: ctx.zeile.slice(T[i].pos).replace(/\s+$/, "")}),
    if: ifParam,
    ifbereich: (s, T, i, node, ctx) => {
      const text = ctx.zeile.slice(T[i].pos), liste = bereichLesen(s, text);
      return liste ? {n: T.length - i, wert: liste} : null;
    },
    vlanliste: (s, T, i, node) => { const l = h.vlanListeLesen(T[i].text, node.min || 1, node.max || 4094); return l ? {n: 1, wert: l} : null; },
    port: (s, T, i, node) => {
      const t = T[i].text.toLowerCase();
      if (/^\d+$/.test(t)) { const z = +t; return z <= 65535 ? {n: 1, wert: z} : null; }
      const namen = C.PORTNAMEN[node.proto] || {}, treffer = Object.keys(namen).filter(k => k.startsWith(t));
      const exakt = treffer.find(k => k === t);
      if (exakt || treffer.length === 1) return {n: 1, wert: namen[exakt || treffer[0]]};
      return treffer.length > 1 ? {mehrdeutig: true} : null;
    },
    mac: (s, T, i) => {
      const m = /^([0-9a-f]{1,4})\.([0-9a-f]{1,4})\.([0-9a-f]{1,4})$/i.exec(T[i].text); if (!m) return null;
      const hex = m.slice(1).map(x => x.padStart(4, "0")).join("").toLowerCase();
      return {n: 1, wert: hex.match(/../g).join(":")};
    },
    praefix: (s, T, i) => { const m = /^\/(\d{1,2})$/.exec(T[i].text); return m && +m[1] <= 32 ? {n: 1, wert: +m[1]} : null; },
  };

  /* ---------- Befehlsbaum-Maschine ---------- */
  function kinder(s, node, ctx){
    if (!node) return [];
    const k = typeof node.k === "function" ? node.k(s, ctx) : (node.k || []);
    return k.filter(c => (!c.nur || c.nur(s, ctx)) && (!c.nurNo || ctx.no) && (!ctx.no || c.nein !== false));
  }
  C.kinder = kinder;
  /* Hier darf der Befehl enden: Blatt (keine Kinder), cr:true, oder in der no-Form noCr:true.
     Der Handler ist der letzte Knoten mit f auf dem Pfad (ein Befehl, viele Argumente). */
  function fertig(node, ctx){ return !!(node && (node.cr || !node.k || (ctx.no && node.noCr))); }
  /* Ein Schritt: welches Kind passt auf Wort i? */
  function schritt(s, kids, T, i, ctx){
    const t = T[i].text.toLowerCase();
    const kw = kids.filter(c => c.w && c.w.toLowerCase().startsWith(t));
    const exakt = kw.find(c => c.w.toLowerCase() === t);
    if (exakt) return {node: exakt, n: 1};
    let pNode = null, pErg = null, teil = null, mehr = false, invalidPos = null;
    for (const c of kids) {
      if (!c.p) continue;
      const r = PARAM[c.t](s, T, i, c, ctx);
      if (!r) continue;
      if (r.n) { pNode = c; pErg = r; break; }
      if (r.teil) teil = teil || r;
      if (r.mehrdeutig) mehr = true;
      if (r.invalidPos != null) invalidPos = Math.max(invalidPos ?? -1, r.invalidPos);
    }
    if (kw.length === 1) return {node: kw[0], n: 1};
    if (kw.length > 1 && !pNode) return {fehler: "ambiguous", i, pos: T[i].pos};
    if (pNode) return {node: pNode, n: pErg.n, wert: pErg.wert};
    if (mehr) return {fehler: "ambiguous", i, pos: T[i].pos};
    if (teil && i === T.length - 1) return {fehler: "incomplete", i: T.length, teilParam: teil};
    return {fehler: "invalid", i, pos: invalidPos != null ? invalidPos : T[i].pos};
  }
  /* Ganze Zeile gegen einen Baum prüfen */
  function parse(s, wurzel, T, ctx){
    let node = wurzel; const pfad = [], args = {}, werte = [];
    ctx.no = false; ctx.args = args;
    for (let i = 0; i < T.length;) {
      const kids = kinder(s, node, ctx);
      const r = schritt(s, kids, T, i, ctx);
      if (r.fehler) return Object.assign(r, {status: "fehler", pfad, args, no: ctx.no});
      node = r.node; pfad.push(node);
      const wert = node.p ? r.wert : (node.v !== undefined ? node.v : true);
      if (node.istNo) ctx.no = true;
      if (node.n) args[node.n] = wert; else if (node.w) args[node.w] = true;
      werte.push(node.p ? (Array.isArray(wert) ? T.slice(i).map(x => x.text).join(" ") : (node.t === "if" ? h.langName(wert) : node.t === "rest" ? wert : T.slice(i, i + r.n).map(x => x.text).join(" "))) : node.w);
      i += r.n;
    }
    if (!pfad.length) return {status: "leer"};
    if (!fertig(node, ctx)) return {status: "fehler", fehler: "incomplete", i: T.length, pfad, args, no: ctx.no, knoten: node};
    let hk = null; for (let j = pfad.length - 1; j >= 0; j--) if (pfad[j].f) { hk = pfad[j]; break; }
    return {status: "ok", pfad, args, no: ctx.no, knoten: node, handlerKnoten: hk, befehl: werte.join(" ")};
  }
  C.parse = parse;

  /* ---------- Modi ---------- */
  const MODI = C.MODI = {
    user:   {prompt: ">", baum: "exec"},
    priv:   {prompt: "#", baum: "exec"},
    config: {prompt: "(config)#", baum: "config", konfig: true},
    if:     {prompt: "(config-if)#", baum: "if", eltern: "config", konfig: true},
    subif:  {prompt: "(config-subif)#", baum: "if", eltern: "config", konfig: true},
    range:  {prompt: "(config-if-range)#", baum: "if", eltern: "config", konfig: true},
    vlan:   {prompt: "(config-vlan)#", baum: "vlan", eltern: "config", konfig: true},
    line:   {prompt: "(config-line)#", baum: "line", eltern: "config", konfig: true},
    std:    {prompt: "(config-std-nacl)#", baum: "std", eltern: "config", konfig: true},
    ext:    {prompt: "(config-ext-nacl)#", baum: "ext", eltern: "config", konfig: true},
    dhcp:   {prompt: "(dhcp-config)#", baum: "dhcp", eltern: "config", konfig: true},
    fwUser: {prompt: ">", baum: "fw"},
    fwPriv: {prompt: "#", baum: "fw"},
  };
  let BAEUME = null;
  C.baum = name => { if (!BAEUME) BAEUME = C.baeumeBauen(); return BAEUME[name]; };
  C.baeumeNeu = () => { BAEUME = null; };

  /* ---------- Sitzung ---------- */
  function art(g){ return Modell.HOST[g.typ] ? "host" : g.typ === "firewall" ? "fw" : Modell.IOS[g.typ] ? "ios" : "info"; }
  /* CLI.sitzung(netz, geraetId, {verlauf, einstieg}) → Sitzung (reines Objekt, gehört der Oberfläche) */
  /* o.tipps: "alle" (Einstieg) | "fehler" (AP1: nur nach Fehlern) | "keine" (AP2) – Stufenregeln, Design § 6 */
  C.sitzung = function(netz, id, o = {}){
    const g = netz.geraete[id]; if (!g) throw new Error("Gerät nicht gefunden: " + id);
    const s = {netz, id, verlauf: o.verlauf || null, einstieg: !!o.einstieg, tipps: o.tipps || (o.einstieg ? "alle" : "keine"), art: art(g), modus: "user", kontext: {},
               rueckfrage: null, historie: [], hIndex: null, begruessung: "", os: Modell.osVon ? Modell.osVon(g) : null};
    if (s.art === "fw") s.modus = "fwUser";
    if (s.art === "host") s.modus = "host";
    if (s.art === "info") { s.modus = "info"; s.begruessung = "Das Internet ist Kulisse und hat keine Konsole."; }
    if (s.art === "ios") C.anmeldungStarten(s, false);
    if (s.art === "host") s.begruessung = C.hostBegruessung ? C.hostBegruessung(s) : "";
    return s;
  };
  /* Begrüßung nach Start/Abmelden: Banner, bei Konsolen-Passwort „User Access Verification“ */
  C.anmeldungStarten = function(s, mitText){
    const k = h.konfig(s), con = (k.lines || {}).con || {};
    const teile = [];
    if (k.banner) teile.push(k.banner);
    s.modus = s.art === "fw" ? "fwUser" : "user";
    if (con.login && con.passwort) {
      teile.push("", "User Access Verification", "");
      s.rueckfrage = {prompt: "Password: ", verdeckt: true, versuche: 0, weiter: loginPruefen};
    }
    s.kontext = {};
    s.begruessung = teile.join("\n");
    return mitText ? s.begruessung : "";
  };
  function loginPruefen(s, antwort){
    const con = (h.konfig(s).lines || {}).con || {};
    if (antwort === con.passwort) return "";
    this.versuche = (this.versuche || 0) + 1;
    if (this.versuche >= 3) { s.modus = "abgemeldet"; return "% Bad passwords"; }
    return {ausgabe: "", rueckfrage: this};
  }
  C.prompt = function(s){
    if (s.rueckfrage) return s.rueckfrage.prompt;
    if (s.art === "host") return s.nslookup ? ">" : C.hostPrompt ? C.hostPrompt(s) : "C:\\>";
    if (s.art === "info") return "";
    if (s.modus === "abgemeldet") return "";
    const g = h.geraet(s); const name = g ? g.running.hostname || g.name : "?";
    return name + (MODI[s.modus] ? MODI[s.modus].prompt : ">");
  };
  /* Verlauf der Eingaben (Pfeil hoch/runter): schritt -1 = älter, +1 = neuer */
  C.historie = function(s, schritt){
    const l = s.historie; if (!l.length) return "";
    if (s.hIndex == null) s.hIndex = l.length;
    s.hIndex = Math.max(0, Math.min(l.length, s.hIndex + schritt));
    return s.hIndex >= l.length ? "" : l[s.hIndex];
  };

  /* ---------- Änderungen ausführen (Verlauf, Bus, geaendert) ---------- */
  const stand = netz => JSON.stringify(netz.geraete) + JSON.stringify(netz.kabel);
  function ausfuehren(s, beschreibung, fn, sim){
    if (sim) return {erg: sicher(fn), geaendert: false};
    const vorher = stand(s.netz); let erg;
    if (s.verlauf) erg = s.verlauf.aendern(beschreibung, () => sicher(fn));
    else erg = sicher(fn);
    const geaendert = stand(s.netz) !== vorher;
    if (geaendert && !s.verlauf && typeof Bus !== "undefined") Bus.senden("netz-geaendert", {netz: s.netz, beschreibung});
    return {erg, geaendert};
  }
  function sicher(fn){
    try { return fn(); }
    catch (e) { return {ausgabe: "% Interner Fehler der Konsole: " + (e && e.message || e), fehler: true}; }
  }
  C.ausfuehren = ausfuehren;

  /* Handler-Ergebnis vereinheitlichen */
  function norm(r){
    if (r == null) return {ausgabe: ""};
    if (typeof r === "string") return {ausgabe: r};
    return r;
  }
  function antwort(s, r, befehl, geaendert){
    r = norm(r);
    if (r.rueckfrage) s.rueckfrage = r.rueckfrage;
    let ausgabe = r.ausgabe || "";
    const tipps = s.tipps || (s.einstieg ? "alle" : "keine");
    if (r.fehler && r.tipp && tipps !== "keine") ausgabe += (ausgabe ? "\n" : "") + "Tipp: " + r.tipp;
    else if (!r.fehler && r.hinweis && tipps === "alle") ausgabe += (ausgabe ? "\n" : "") + "Tipp: " + r.hinweis;
    const e = {ausgabe, prompt: C.prompt(s), geaendert: !!geaendert, befehl: befehl || ""};
    if (r.fehler) e.fehler = true;
    if (r.leeren) e.leeren = true;
    if (r.zeile != null) e.zeile = r.zeile;
    if (r.trace) e.trace = r.trace;                 /* ping/traceroute: Trace für die Animation (UI entscheidet) */
    if (r.befund) { e.befund = r.befund; e.ok = r.ok !== false; }      /* Diagnosebefehl: eine Zeile für die Akte */
    if (s.rueckfrage && s.rueckfrage.verdeckt) e.verdeckt = true;
    return e;
  }
  C.antwort = antwort;

  /* ---------- Fehlermeldungen im IOS-Stil ---------- */
  function fehlerText(s, zeile, r){
    if (r.fehler === "invalid") return " ".repeat(C.prompt(s).length + r.pos) + "^\n% Invalid input detected at '^' marker.";
    if (r.fehler === "ambiguous") return `% Ambiguous command:  "${zeile.trim()}"`;
    return "% Incomplete command.";
  }
  C.fehlerText = fehlerText;

  /* ---------- Hilfe mit ? ---------- */
  function hilfeZeilen(s, liste, crDa){
    const eintraege = liste.map(c => {
      if (c.p && c.t === "if") return ifTypen(s, c).map(t => ({l: t.lang, h: t.h, d: t.d}));
      return [{l: c.w || c.p, h: c.h || "", d: c.d || ""}];
    }).flat();
    if (crDa) eintraege.push({l: "<cr>", h: "", d: "Befehl ist vollständig (Enter)"});
    const breite = Math.max(0, ...eintraege.map(e => e.l.length)) + 2;
    return eintraege.map(e => ("  " + h.links(e.l, breite) + e.h + (s.einstieg && e.d ? (e.h ? "  – " : "") + e.d : "")).replace(/\s+$/, "")).join("\n");
  }
  /* IOS: Was im Untermodus unbekannt ist, versucht es im übergeordneten Modus („interface ?“ in config-if) */
  function hilfe(s, zeile){
    let r = hilfeIn(s, zeile, s.modus), m = MODI[s.modus];
    while (r.fehler && m && m.eltern) { const r2 = hilfeIn(s, zeile, m.eltern); if (!r2.fehler) return r2; m = MODI[m.eltern]; }
    return r;
  }
  function hilfeIn(s, zeile, modusName){
    const vor = zeile.replace(/\?\s*$/, "");
    const teilweise = vor.length > 0 && !/\s$/.test(vor);
    const T = zerlegen(vor);
    const modus = MODI[modusName]; const wurzel = C.baum(modus.baum);
    const vorT = teilweise ? T.slice(0, -1) : T;
    const ctx = {zeile: vor, no: false};
    let node = wurzel;
    if (vorT.length) {
      const r = parse(s, wurzel, vorT, ctx);
      if (r.status === "fehler" && r.fehler !== "incomplete") return {ausgabe: fehlerText(s, vor, r), fehler: true, zeile: vor};
      if (r.status === "fehler" && r.teilParam) {       /* "interface gigabitEthernet ?" */
        const t = r.teilParam.typ, ports = (Modell.PORTS[h.geraet(s).typ] || []).filter(p => p.startsWith(t.kurz));
        const text = t.kurz === "Vlan" ? "  <1-4094>  Vlan interface number" : `  ${ports.map(p => p.slice(t.kurz.length)).join(", ")}  ${t.lang} interface number`;
        return {ausgabe: text, zeile: vor};
      }
      node = r.pfad[r.pfad.length - 1];
      ctx.no = r.no;
    }
    if (teilweise) {
      const t = T[T.length - 1].text.toLowerCase();
      const kids = kinder(s, node, ctx);
      const namen = [];
      for (const c of kids) {
        if (c.w && c.w.toLowerCase().startsWith(t)) namen.push(c.w);
        if (c.p && c.t === "if") for (const ty of ifTypen(s, c)) if (ty.lang.toLowerCase().startsWith(t)) namen.push(ty.lang);
      }
      if (!namen.length) {
        /* Zahl/Adresse angefangen: Parameter anzeigen wie IOS */
        const par = kids.filter(c => c.p && c.t !== "if");
        if (par.length && /^[\d./]/.test(t)) return {ausgabe: hilfeZeilen(s, par, false), zeile: vor};
        return {ausgabe: "% Unrecognized command", fehler: true, zeile: vor};
      }
      return {ausgabe: namen.join("  ") + "  ", zeile: vor};
    }
    const kids = kinder(s, node, ctx);
    if (node !== wurzel && kids.length === 0 && !fertig(node, ctx)) return {ausgabe: "% Unrecognized command", fehler: true, zeile: vor};
    const zeigtPipe = node !== wurzel && fertig(node, ctx) && pfadZeigt(s, vorT, modusName);
    const liste = kids.slice();
    let text = hilfeZeilen(s, liste, node !== wurzel && fertig(node, ctx));
    if (zeigtPipe) text = text.replace(/(\n?  <cr>.*)$/, "\n  |  Output modifiers" + (s.einstieg ? "  – Ausgabe filtern (include, exclude, begin, section)" : "") + "$1");
    return {ausgabe: text, zeile: vor};
  }
  function pfadZeigt(s, T, modusName){
    const r = parse(s, C.baum(MODI[modusName || s.modus].baum), T, {zeile: T.map(t => t.text).join(" "), no: false});
    return r.status === "ok" && r.pfad.some(n => n.zeigen);
  }

  /* ---------- Tab-Vervollständigung ---------- */
  C.tab = function(s, zeile){
    zeile = String(zeile || "");
    if (s.art === "host") return C.hostTab ? C.hostTab(s, zeile) : {zeile, vorschlaege: []};
    if (!MODI[s.modus] || s.rueckfrage) return {zeile, vorschlaege: []};
    const T = zerlegen(zeile);
    const wurzel = C.baum(MODI[s.modus].baum), ctx = {zeile, no: false};
    const endeLeer = !T.length || /\s$/.test(zeile);
    const vorT = endeLeer ? T : T.slice(0, -1);
    let node = wurzel;
    if (vorT.length) {
      const r = parse(s, wurzel, vorT, ctx);
      if (r.status === "fehler" && r.fehler !== "incomplete") return {zeile, vorschlaege: []};
      node = r.pfad[r.pfad.length - 1]; ctx.no = r.no;
    }
    const kids = kinder(s, node, ctx);
    if (endeLeer) return {zeile, vorschlaege: kids.filter(c => c.w).map(c => c.w)};
    const letzt = T[T.length - 1], t = letzt.text.toLowerCase();
    const kw = kids.filter(c => c.w && c.w.toLowerCase().startsWith(t));
    const exakt = kw.find(c => c.w.toLowerCase() === t);
    const kopf = zeile.slice(0, letzt.pos);
    if (exakt || kw.length === 1) return {zeile: kopf + (exakt || kw[0]).w + " ", vorschlaege: []};
    const vorschlaege = kw.map(c => c.w);
    /* Schnittstellentyp ausschreiben: g0/0 → GigabitEthernet0/0 */
    const ifKnoten = kids.find(c => c.p && c.t === "if");
    if (ifKnoten) {
      const m = /^([a-z][a-z-]*)(.*)$/i.exec(letzt.text);
      if (m) {
        const typen = ifTypen(s, ifKnoten).filter(x => x.lang.toLowerCase().startsWith(m[1].toLowerCase()));
        if (typen.length === 1 && !kw.length) return {zeile: kopf + typen[0].lang + m[2], vorschlaege: []};
        for (const x of typen) vorschlaege.push(x.lang);
      }
    }
    return {zeile, vorschlaege};
  };

  /* ---------- Eingabe ---------- */
  /* CLI.eingabe(sitzung, zeile) → {ausgabe, prompt, geaendert, befehl} (+ fehler, zeile, verdeckt, leeren)
     ausgabe enthält NICHT die Echo-Zeile; die Oberfläche zeigt prompt + zeile selbst an.
     Die ^-Markierung ist auf „prompt + zeile“ in Festbreitenschrift ausgerichtet. */
  C.eingabe = function(s, zeile){
    zeile = String(zeile == null ? "" : zeile).replace(/[\r\n]+$/, "");
    const g = h.geraet(s);
    if (!g) return {ausgabe: "% Dieses Gerät gibt es nicht mehr.", prompt: "", geaendert: false, befehl: "", fehler: true};
    if (!g.an) return {ausgabe: "(Das Gerät ist ausgeschaltet. Schalte es im Inspektor ein.)", prompt: C.prompt(s), geaendert: false, befehl: "", fehler: true};
    /* Strg+C (^C): laufende Rückfrage abbrechen */
    if (zeile === "\x03" || zeile === "^C") { C.abbrechen(s); return antwort(s, "", "", false); }
    /* laufende Rückfrage (Destination filename, [confirm], Password, Banner-Text …) */
    if (s.rueckfrage) {
      const rf = s.rueckfrage; s.rueckfrage = null;
      const {erg, geaendert} = ausfuehren(s, rf.beschreibung || "Konsole", () => rf.weiter.call(rf, s, zeile), !rf.beschreibung);
      const e = norm(erg);
      if (e.rueckfrage && e.rueckfrage !== rf) { e.rueckfrage.beschreibung = e.rueckfrage.beschreibung || rf.beschreibung; e.rueckfrage.befehl = rf.befehl; }
      return antwort(s, e, rf.befehl || "", geaendert);
    }
    if (s.art === "host") return C.hostEingabe(s, zeile);
    if (s.art === "info") return {ausgabe: s.begruessung, prompt: "", geaendert: false, befehl: ""};
    if (s.modus === "abgemeldet") {
      const text = C.anmeldungStarten(s, true);
      return {ausgabe: text, prompt: C.prompt(s), geaendert: false, befehl: "", verdeckt: !!(s.rueckfrage && s.rueckfrage.verdeckt)};
    }
    /* Strg+Z */
    if (zeile === "\u001a" || /^\s*\^z\s*$/i.test(zeile)) {
      if (MODI[s.modus].konfig) { s.modus = "priv"; s.kontext = {}; return antwort(s, "%SYS-5-CONFIG_I: Configured from console by console", "end", false); }
      return antwort(s, "", "", false);
    }
    if (/\?\s*$/.test(zeile)) {
      const r = hilfe(s, zeile);
      return antwort(s, Object.assign({}, r, {fehler: false}), "", false);
    }
    const T = zerlegen(zeile);
    if (!T.length) return antwort(s, "", "", false);
    s.historie.push(zeile.trim()); if (s.historie.length > 50) s.historie.shift(); s.hIndex = null;
    /* Ausgabefilter „| include …“ */
    let TT = T, pipe = null;
    const pi = T.findIndex(t => t.text[0] === "|");
    if (pi > 0) { TT = T.slice(0, pi); pipe = zeile.slice(T[pi].pos + 1); }
    const modus = MODI[s.modus];
    let r = parse(s, C.baum(modus.baum), TT, {zeile, no: false});
    let elternWechsel = false;
    if (r.status !== "ok" && modus.eltern) {
      const r2 = parse(s, C.baum(MODI[modus.eltern].baum), TT, {zeile, no: false});
      if (r2.status === "ok") { r = r2; elternWechsel = true; }
      else if ((r2.i || 0) > (r.i || 0)) r = r2;
    }
    if (r.status !== "ok") return iosFehler(s, zeile, r, TT);
    if (pipe != null && !r.pfad.some(n => n.zeigen)) return iosFehler(s, zeile, {fehler: "invalid", pos: T[pi].pos, i: pi}, T);
    if (elternWechsel) { s.modus = modus.eltern; s.kontext = {}; }
    const a = Object.assign({}, r.args, {no: r.no, zeile, befehl: r.befehl});
    const knoten = r.handlerKnoten;
    if (!knoten) return antwort(s, "% Incomplete command.", r.befehl, false);
    const beschreibung = "Konsole: " + zeile.trim();
    const {erg, geaendert} = ausfuehren(s, beschreibung, () => knoten.f(s, a), knoten.sim || r.pfad.some(n => n.sim));
    let e = norm(erg);
    if (e.rueckfrage && !e.rueckfrage.beschreibung && !knoten.sim) { e.rueckfrage.beschreibung = beschreibung; }
    if (e.rueckfrage) e.rueckfrage.befehl = r.befehl;
    if (pipe != null && !e.fehler) e = Object.assign({}, e, {ausgabe: C.filtern(e.ausgabe, pipe)});
    return antwort(s, e, r.befehl, geaendert);
  };

  /* Rückfrage abbrechen (Strg+C in der Oberfläche); liefert true, wenn eine offen war */
  C.abbrechen = function(s){ const offen = !!s.rueckfrage; s.rueckfrage = null; return offen; };

  function iosFehler(s, zeile, r, T){
    const modus = s.modus;
    /* Exec: unbekanntes erstes Wort hält IOS für einen Rechnernamen (Telnet) und fragt DNS */
    if ((modus === "user" || modus === "priv" || modus === "fwUser" || modus === "fwPriv") && r.fehler === "invalid" && (r.i || 0) === 0) {
      const t = T[0].text.toLowerCase();
      const privBekannt = (modus === "user" || modus === "fwUser") &&
        (C.baum(MODI[modus].baum).k || []).some(c => c.privOnly && c.w && c.w.toLowerCase().startsWith(t));
      if (!privBekannt) {
        const lookup = h.konfig(s).domainLookup !== false;
        const text = `Translating "${T[0].text}"` + (lookup ? "...domain server (255.255.255.255)" : "") +
                     "\n% Unknown command or computer name, or unable to find computer address";
        return antwort(s, {ausgabe: text, fehler: true, tipp: C.tipp(s, zeile, Object.assign({}, r, {unbekannt: true}), T)}, zeile.trim(), false);
      }
    }
    return antwort(s, {ausgabe: fehlerText(s, zeile, r), fehler: true, tipp: C.tipp(s, zeile, r, T)}, zeile.trim(), false);
  }

  /* ---------- Einstieg: Fehler erklären, nicht schimpfen ---------- */
  const EXEC_WOERTER = ["show", "ping", "traceroute", "copy", "write", "reload", "clear", "erase", "delete"];
  const KONFIG_WOERTER = ["hostname", "interface", "ip", "vlan", "access-list", "line", "banner", "router", "no", "switchport", "shutdown"];
  const passt = (wort, liste) => !!wort && liste.some(w => w.startsWith(wort.toLowerCase()) && wort.length >= 2);
  C.tipp = function(s, zeile, r, T){
    const erstes = T[0] ? T[0].text.toLowerCase() : "";
    const m = s.modus, konfig = MODI[m] && MODI[m].konfig;
    if (m === "priv" && passt(erstes, KONFIG_WOERTER)) return "Konfigurationsbefehle gehen erst nach „configure terminal“ (kurz: conf t).";
    if (r.unbekannt) return "Ein unbekanntes erstes Wort hält IOS für einen Rechnernamen und fragt dafür den DNS. „?“ zeigt die Befehle, die es hier gibt." +
      (h.konfig(s).domainLookup !== false ? " Mit „no ip domain-lookup“ (Konfigurationsmodus) entfällt die Wartezeit." : "");
    if (m === "user" && r.i === 0) return "Dafür brauchst du den privilegierten Modus: erst „enable“.";
    if (m === "user" && erstes.startsWith("sh")) return "Diese Anzeige gibt es erst im privilegierten Modus: erst „enable“.";
    if (konfig && r.i === 0 && passt(erstes, EXEC_WOERTER)) return "Im Konfigurationsmodus stellst du Anzeige- und Exec-Befehlen „do“ voran, z. B. „do show ip interface brief“.";
    if (m === "priv" && r.i === 0 && passt(erstes, KONFIG_WOERTER)) return "Konfigurationsbefehle gehen erst nach „configure terminal“ (kurz: conf t).";
    const low = zeile.toLowerCase().trim();
    if (m === "config" && r.fehler === "invalid" && /^(no\s+)?(sh\w*|shutdown|sw\w*|desc\w*|enc\w*|ip\s+(ad\w*|nat|access-g\w*|helper\w*))(\s|$)/.test(low)) {
      return "Das ist ein Schnittstellenbefehl. Wähle zuerst die Schnittstelle, z. B. „interface GigabitEthernet0/0“.";
    }
    if (r.fehler === "incomplete") return "Da fehlt noch etwas. Tippe ein Leerzeichen und „?“, dann siehst du, was an dieser Stelle erwartet wird.";
    if (r.fehler === "ambiguous") return "Die Abkürzung passt auf mehrere Befehle. Tippe ein paar Buchstaben mehr, oder hänge direkt „?“ an, um die Kandidaten zu sehen.";
    if (/trunk\s+enc/.test(low)) return "Dieser Switch (2960) kennt nur 802.1Q, der Befehl entfällt. Direkt: „switchport mode trunk“.";
    if (m === "if" && h.geraet(s).typ === "switch" && /^\s*ip\s+ad/.test(low)) return "Switch-Ports arbeiten auf Schicht 2 und haben keine IP-Adresse. Die Verwaltungsadresse gehört auf „interface vlan 1“.";
    return "An der Stelle mit ^ versteht das Gerät die Eingabe nicht. „?“ zeigt, was dort erlaubt ist.";
  };

  /* ---------- Ausgabefilter: | include / exclude / begin / section ---------- */
  C.filtern = function(text, filter){
    const m = /^\s*(\S+)\s*(.*)$/.exec(filter || ""); if (!m) return text;
    const art = ["include", "exclude", "begin", "section"].filter(x => x.startsWith(m[1].toLowerCase()));
    if (art.length !== 1 || !m[2]) return text;
    let re; try { re = new RegExp(m[2]); } catch (e) { re = {test: z => z.includes(m[2])}; }
    const z = String(text).split("\n");
    if (art[0] === "include") return z.filter(x => re.test(x)).join("\n");
    if (art[0] === "exclude") return z.filter(x => !re.test(x)).join("\n");
    if (art[0] === "begin") { const i = z.findIndex(x => re.test(x)); return i < 0 ? "" : z.slice(i).join("\n"); }
    const r = []; let drin = false;
    for (const x of z) { if (/^\S/.test(x)) drin = re.test(x); else if (!drin && re.test(x)) { r.push(x); continue; } if (drin) r.push(x); }
    return r.join("\n");
  };

  return C;
})();
