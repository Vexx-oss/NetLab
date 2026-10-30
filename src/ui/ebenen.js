"use strict";
/* ---------- Ebenen der Netz-Fläche (Konzept § 7 „Ebenen“) ----------
   Physik · VLAN · IP-Netze (Standard) · MAC-Tabellen · Routen.
   UI.ebenen.aktuell            "physik"|"vlan"|"ip"|"mac"|"routen"
   UI.ebenen.setzen(id, {merken}) umschalten (merkt sich die Wahl, außer merken:false – Ticket-Vorgabe), zeichnet neu, Bus „ebene“
   UI.ebenen.gemerkt()          zuletzt selbst gewählte Ebene (Freies Labor)
   UI.ebenen.fuerSkills(skills) Standardansicht eines Tickets (Skill → Ebene)
   UI.ebenen.zonen(netz)        → {zonen:[{cidr, netz, praefix, ids, anker, gw, farbe, apipa}], ohne:Set(ids ohne gültige Adresse)}
     ids = Mitglieder (Geräte mit GENAU einer gültigen Adresse im Netz); anker = Router/Firewall mit
     mehreren Adressen [{id, ip, port}], gw = erste passende Anker-Adresse („GW <ip>" im Chip, § 3.3).
   UI.ebenen.adresse(netz, g)   → {ip, maske, text, gueltig, quelle}  erste Adresse für Beschriftung und Ping
   UI.ebenen.vlanPort(netz, id, port) → {art:"access", vlan} | {art:"trunk", erlaubt, nativ} | null
   UI.ebenen.zeichneZonen(schicht, netz, pos)      pos(id) → {x, y}
   UI.ebenen.zeichneKarten(schicht, netz, pos, ebene) → Map(id → Kärtchen-<g>)
   Die Zeichenfunktionen liefern reine SVG-Knoten; das Verschieben übernimmt der Editor. */
UI.ebenen = (() => {
  const LISTE = [
    {id: "physik", name: "Physik",      taste: "1", text: "Kabel, Ports und ihr Zustand"},
    {id: "vlan",   name: "VLAN",        taste: "2", text: "Access-Ports in VLAN-Farbe mit Nummer, Trunks als Doppelstrich"},
    {id: "ip",     name: "IP-Netze",    taste: "3", text: "Jedes Subnetz als farbige Zone – gleiches Netz sieht man sofort"},
    {id: "mac",    name: "MAC-Tabellen",taste: "4", text: "Was Switches gelernt haben (und ARP-Caches der Router)"},
    {id: "routen", name: "Routen",      taste: "5", text: "Routingtabellen der Router, Gateways der Hosts"},
  ];
  const ZONEN = ["a", "b", "c", "d", "e"];
  let aktuell = null;

  function einstEbene(){ try { return (store.get("einst", {}) || {}).labor?.ebene; } catch { return null; } }
  function gemerkt(){ const e = einstEbene(); return LISTE.some(l => l.id === e) ? e : "ip"; }
  function holen(){ if (!aktuell) aktuell = gemerkt(); return aktuell; }
  function setzen(id, o = {}){
    if (!LISTE.some(l => l.id === id)) return;
    const neu = aktuell !== id;
    aktuell = id;
    if (o.merken !== false) { const e = store.get("einst", {}) || {}; e.labor = Object.assign({}, e.labor, {ebene: id}); store.set("einst", e); }
    if (!neu) return;
    Bus.senden("ebene", id);
    UI.labor?.neuZeichnen?.();
  }
  /* Ticket → Standardansicht: der erste Skill, der eine eigene Ebene hat, entscheidet; sonst IP-Netze */
  const SKILL_EBENE = {"lab.link": "physik", "lab.ports": "physik", "lab.portsec": "physik", "lab.stp": "physik", "lab.switch": "physik",
    "lab.vlan": "vlan", "lab.trunk": "vlan", "lab.rostick": "vlan", "lab.arp": "mac", "lab.route": "routen", "lab.ttl": "routen"};
  function fuerSkills(skills){ for (const s of skills || []) if (SKILL_EBENE[s]) return SKILL_EBENE[s]; return "ip"; }

  /* ---------- Adressen ---------- */
  function lease(netz, id, port){ const d = netz.zustand?.[id]?.dhcp?.[port]; return d && IP.gueltig(d.ip) ? d : null; }
  function adresse(netz, g){
    if (!g) return {ip: null, text: "", gueltig: false, quelle: "keine"};
    const k = g.running || {};
    if (Modell.HOST[g.typ]) {
      for (const [p, i] of Object.entries(k.if || {})) {
        if (i.dhcp) {
          let l = lease(netz, g.id, p);
          if (!l && typeof Sim !== "undefined" && typeof Sim.adresse === "function") {
            try { const a = Sim.adresse(netz, g.id, p); if (a && IP.gueltig(a.ip) && a.quelle !== "keine") l = a; } catch (e) { /* Sim im Bau */ }
          }
          if (l) return {ip: l.ip, maske: l.maske, text: l.ip, gueltig: IP.maskeGueltig(l.maske), quelle: IP.apipa(l.ip) ? "apipa" : "dhcp", port: p};
          return {ip: null, text: "DHCP – noch keine Adresse", gueltig: false, quelle: "dhcp", port: p};
        }
        if (i.ip) {
          const ok = IP.gueltig(i.ip) && IP.maskeGueltig(i.maske) && IP.hostAdresse(i.ip, i.maske);
          return {ip: IP.gueltig(i.ip) ? i.ip : null, maske: i.maske, text: i.ip + (i.maske && IP.maskeGueltig(i.maske) ? "/" + IP.praefix(i.maske) : ""), gueltig: ok, quelle: "statisch", port: p};
        }
      }
      return {ip: null, text: "keine IP", gueltig: false, quelle: "keine"};
    }
    const liste = Modell.adressen(g).filter(a => IP.gueltig(a.ip));
    if (!liste.length) return {ip: null, text: g.typ === "switch" ? "" : "keine IP", gueltig: false, quelle: "keine"};
    const a = liste[0];
    return {ip: a.ip, maske: a.maske, text: a.ip + (IP.maskeGueltig(a.maske) ? "/" + IP.praefix(a.maske) : "") + (liste.length > 1 ? ` +${liste.length - 1}` : ""),
            gueltig: IP.maskeGueltig(a.maske), quelle: "statisch", port: a.port};
  }
  /* alle gültigen L3-Adressen eines Geräts (inkl. DHCP-Leases) */
  function alleAdressen(netz, g){
    const r = [];
    if (Modell.HOST[g.typ]) {
      for (const [p, i] of Object.entries(g.running.if || {})) {
        if (i.dhcp) { const l = lease(netz, g.id, p); if (l && IP.maskeGueltig(l.maske)) r.push({ip: l.ip, maske: l.maske}); }
        else if (IP.gueltig(i.ip) && IP.maskeGueltig(i.maske) && IP.hostAdresse(i.ip, i.maske)) r.push({ip: i.ip, maske: i.maske});
      }
      return r;
    }
    for (const a of Modell.adressen(g)) if (IP.gueltig(a.ip) && IP.maskeGueltig(a.maske)) r.push(a);
    return r;
  }
  function zonen(netz){
    const m = new Map(), ohne = new Set();
    for (const g of Object.values(netz.geraete)) {
      const liste = alleAdressen(netz, g);
      if (!liste.length && g.typ !== "switch" && g.typ !== "internet") ohne.add(g.id);
      if (!liste.length) continue;
      /* Mitglied ist, wer GENAU EINE gültige Adresse in diesem Netz hat. Geräte mit >= 2 Adressen
         (Router/Firewall) sind Anker: Sie kommen NICHT in die Form, ihre erste passende Adresse steht
         als „GW <ip>" am Chip. Vorher lag der Router in jeder Zone und die Hüllen zogen sich über die
         ganze Fläche (Befund B3). */
      const proNetz = new Map();
      for (const a of liste) {
        const c = IP.cidr(a.ip, a.maske); if (!c) continue;
        if (!proNetz.has(c)) proNetz.set(c, []);
        proNetz.get(c).push(a);
      }
      for (const [c, adressen] of proNetz) {
        const erste = adressen[0];
        if (!m.has(c)) m.set(c, {cidr: c, netz: IP.netz(erste.ip, erste.maske), praefix: IP.praefix(erste.maske), ids: [], anker: [], gw: null, apipa: IP.apipa(erste.ip)});
        const z = m.get(c);
        if (liste.length === 1) { if (!z.ids.includes(g.id)) z.ids.push(g.id); }
        else if (!z.anker.some(a => a.id === g.id)) z.anker.push({id: g.id, ip: erste.ip, port: erste.port});
      }
    }
    const liste = [...m.values()].sort((a, b) => IP.vergleich(a.netz, b.netz) || a.praefix - b.praefix);
    for (const z of liste) {
      z.anker.sort((a, b) => a.id.localeCompare(b.id));
      if (z.gw == null && z.anker.length) z.gw = z.anker[0].ip;      /* erste passende Adresse = Gateway */
    }
    liste.forEach((z, i) => { z.farbe = ZONEN[i % ZONEN.length]; });
    return {zonen: liste, ohne};
  }

  /* ---------- Konvexe Hülle (Andrew-Monotone-Chain) über Punkte ---------- */
  function huelle(punkte){
    const p = punkte.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const kreuz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const unten = [], oben = [];
    for (const q of p) { while (unten.length >= 2 && kreuz(unten[unten.length - 2], unten[unten.length - 1], q) <= 0) unten.pop(); unten.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (oben.length >= 2 && kreuz(oben[oben.length - 2], oben[oben.length - 1], q) <= 0) oben.pop(); oben.push(q); }
    oben.pop(); unten.pop();
    return unten.concat(oben);
  }
  /* ---------- Kartenmaße (müssen zu editor.js geraetGruppe passen, Vertrag § 3.1) ----------
     160x76 auf breiten, 118x64 auf schmalen Fenstern. Hier eigenständig, weil ebenen.js nicht in den
     Editor hineinschaut; die Zahlen stehen in beiden Dateien mit demselben Kommentar. */
  function kartenMasse(){
    const breit = !(typeof innerWidth === "number" && innerWidth < 900);
    return breit ? {kw: 160, kh: 76} : {kw: 118, kh: 64};
  }
  /* Ray-Box wie in editor.js: Schnittpunkt mit dem Kartenrahmen (für die /30-Kapsel). */
  function randPunkt(p, q, m){
    const dx = q.x - p.x, dy = q.y - p.y;
    if (!dx && !dy) return null;
    const hw = m.kw / 2, hh = m.kh / 2;
    let t = Infinity;
    if (dx) t = Math.min(t, hw / Math.abs(dx));
    if (dy) t = Math.min(t, hh / Math.abs(dy));
    return Number.isFinite(t) ? {x: p.x + dx * t, y: p.y + dy * t} : null;
  }
  /* Weiche Insel (Vertrag § 3.3, Befund B2): konvexe Hülle über die KARTEN-RECHTECKE der Mitglieder,
     aufgeblasen um dx/dy. Die Aufblasung schiebt jeden Hüllpunkt vom Hüllen-Schwerpunkt nach außen –
     bei achsenparallelen Hüllen (der Normalfall) ist das die exakte Rechteck-Erweiterung. */
  function huelleAufgeblasen(punkte, dx, dy){
    const eindeutig = [];
    for (const q of punkte) if (!eindeutig.some(p => Math.abs(p[0] - q[0]) < 0.01 && Math.abs(p[1] - q[1]) < 0.01)) eindeutig.push(q);
    const hl = huelle(eindeutig);
    if (hl.length < 3) return hl;
    const cx = hl.reduce((s, q) => s + q[0], 0) / hl.length, cy = hl.reduce((s, q) => s + q[1], 0) / hl.length;
    return hl.map(q => [q[0] + (q[0] >= cx ? dx : -dx), q[1] + (q[1] >= cy ? dy : -dy)]);
  }
  /* Gerundetes Vieleck: Ecken mit Radius r als kurze Quadratik, gerade Kanten bleiben gerade.
     (Der Vertrag nennt „Catmull-Rom o. ä."; Catmull-Rom schwingt bei den aufgeblasenen Rechteck-
     ecken nach außen und erzeugte so Überlappungen benachbarter Inseln — gemessen 604 px².) */
  function gerundeterPfad(p, r){
    const n = p.length;
    if (n < 3) return "";
    const abstand = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
    let d = "M" + p[0][0].toFixed(1) + " " + p[0][1].toFixed(1);
    for (let i = 0; i < n; i++) {
      const vor = p[(i - 1 + n) % n], eck = p[i], nach = p[(i + 1) % n];
      const l1 = abstand(vor, eck), l2 = abstand(eck, nach);
      const rr = Math.min(r, l1 / 2, l2 / 2);
      if (rr < 0.5) { d += " L" + eck[0].toFixed(1) + " " + eck[1].toFixed(1); continue; }
      const s1x = (eck[0] - vor[0]) / l1, s1y = (eck[1] - vor[1]) / l1;
      const s2x = (nach[0] - eck[0]) / l2, s2y = (nach[1] - eck[1]) / l2;
      d += " L" + (eck[0] - s1x * rr).toFixed(1) + " " + (eck[1] - s1y * rr).toFixed(1) +
           " Q" + eck[0].toFixed(1) + " " + eck[1].toFixed(1) + " " + (eck[0] + s2x * rr).toFixed(1) + " " + (eck[1] + s2y * rr).toFixed(1);
    }
    return d + " Z";
  }
  /* Freie Stelle für den Zonen-Chip (Vorgabe der Leitung 30.10.2026): Kandidaten unten-links →
     unten-rechts → oben-links → oben-rechts, je 18 px nach außen versetzt; Kapsel-Chip mittig darüber,
     dann darüber/darunter/seitlich weiter. Geprüft wird gegen Karten UND schon gesetzte Chips, mit
     6 px Mindestabstand. Bleibt nichts frei, gewinnt die Stelle mit der geringsten Überdeckung –
     der Chip wird NIE weggelassen (Befund B1). */
  const CHIP_ABSTAND = 6;
  function chipStelle(belegt, form, b, h){
    /* Der Mindestabstand von 6 px gilt zwischen CHIPS (beide bekommen 3 px Rand). Karten gegenueber
       genuegt Beruehrung: sonst rutschte der Kapsel-Chip 26 px von der Kapsel weg (gemessen), weil zwei
       Kandidaten wegen der 6-px-Zugabe als Ueberdeckung galten. */
    const ueber = (x, y) => belegt.reduce((s, q) => {
      const pad = q.istChip ? CHIP_ABSTAND / 2 : 0;
      const x1 = x - pad, y1 = y - pad, x2 = x + b + pad, y2 = y + h + pad;
      const dx = Math.min(x2, q.x2) - Math.max(x1, q.x1), dy = Math.min(y2, q.y2) - Math.max(y1, q.y1);
      return s + (dx > 0 && dy > 0 ? dx * dy : 0);
    }, 0);
    const kand = [];
    if (form.art === "kapsel") {
      /* Erster Kandidat: mittig ueber der Kapselmitte (Vorgabe der Leitung). Erst wenn dort eine Karte
         liegt, geht es in 18-px-Schritten weiter nach oben, dann unten/seitlich. */
      for (let n = 0; n < 10; n++) {
        kand.push([form.mx - b / 2, form.my - 17 - h - 10 - n * 18]);
        kand.push([form.mx - b / 2, form.my + 17 + 10 + n * 18]);
        kand.push([form.maxX + 18 + n * 18, form.my - h / 2]);
        kand.push([form.minX - b - 18 - n * 18, form.my - h / 2]);
      }
    } else {
      for (let n = 0; n < 10; n++) {
        const ab = (n + 1) * 18;
        kand.push([form.minX + 14, form.maxY + ab]);
        kand.push([form.maxX - b - 14, form.maxY + ab]);
        kand.push([form.minX + 14, form.minY - h - ab]);
        kand.push([form.maxX - b - 14, form.minY - h - ab]);
      }
    }
    let wahl = kand[0], beste = ueber(wahl[0], wahl[1]);
    for (const q of kand) {
      if (beste <= 0) break;
      const u = ueber(q[0], q[1]);
      if (u < beste) { beste = u; wahl = q; }
    }
    return wahl;
  }
  /* Reine Verbindungsnetze (<= 2 Mitglieder, Kante vorhanden, z. B. WAN /30) werden eine Kapsel um die
     Sichtstrecke: Rechteck r=999 (Stadion), nicht die Hülle (Vertrag § 3.3). */
  function kapselForm(z, netz, pos, m){
    if (z.ids.length > 2) return null;
    const beteiligt = new Set([...z.ids, ...z.anker.map(a => a.id)]);
    const kanten = netz.kabel.filter(k => beteiligt.has(k.a.geraet) && beteiligt.has(k.b.geraet) && k.a.geraet !== k.b.geraet);
    if (!kanten.length) return null;
    const k = kanten.find(x => z.ids.includes(x.a.geraet) || z.ids.includes(x.b.geraet)) || kanten[0];
    const A = pos(k.a.geraet), B = pos(k.b.geraet);
    if (!A || !B) return null;
    const p1 = randPunkt(A, B, m) || A, p2 = randPunkt(B, A, m) || B;
    const dx = p2.x - p1.x, dy = p2.y - p1.y, lang = Math.hypot(dx, dy);
    if (lang < 4) return null;
    return {p1, p2, lang, winkel: Math.atan2(dy, dx) * 180 / Math.PI, mx: (p1.x + p2.x) / 2, my: (p1.y + p2.y) / 2};
  }
  function zeichneZonen(schicht, netz, pos){
    const {zonen: zl} = zonen(netz);
    const m = kartenMasse();
    /* Vorbelegung: alle Karten randgenau. Chips dürfen weder auf Geräten noch auf anderen Chips liegen –
       sonst verschwänden sie unter der Geräte-Ebene. */
    const belegt = [];
    for (const g of Object.values(netz.geraete)) {
      const p = pos(g.id); if (!p) continue;
      belegt.push({x1: p.x - m.kw / 2, y1: p.y - m.kh / 2, x2: p.x + m.kw / 2, y2: p.y + m.kh / 2, istChip: false});
    }
    for (const z of zl) {
      const mitglieder = z.ids.map(pos).filter(Boolean);
      const kapsel = z.ids.length <= 2 ? kapselForm(z, netz, pos, m) : null;
      let form = null;
      if (kapsel) form = {art: "kapsel", ...kapsel, minX: Math.min(kapsel.p1.x, kapsel.p2.x), maxX: Math.max(kapsel.p1.x, kapsel.p2.x)};
      else if (mitglieder.length) {
        /* Aufblasung 20/20 (Leitung 30.10.2026 wollte 22/20): Bei 22 bleiben rechnerisch 4 Welt-px
           Ueberlappung (2*(80+22) gegen 200 Kartenabstand, exakt gemessen 604 px²); mit 20/20 beruehren
           sich die Inseln hoechstens. 30/26 liess sie ~20 px ineinanderschneiden. Ein einzelnes
           Mitglied bekommt ein Ei (Ellipse) – die Huelle eines Punktes waere nur ein Rechteck. */
        if (mitglieder.length === 1) {
          const p = mitglieder[0], rx = m.kw / 2 + 20, ry = m.kh / 2 + 20;
          const d = "M" + (p.x - rx).toFixed(1) + " " + p.y.toFixed(1) +
            " A" + rx.toFixed(1) + " " + ry.toFixed(1) + " 0 1 0 " + (p.x + rx).toFixed(1) + " " + p.y.toFixed(1) +
            " A" + rx.toFixed(1) + " " + ry.toFixed(1) + " 0 1 0 " + (p.x - rx).toFixed(1) + " " + p.y.toFixed(1) + " Z";
          form = {art: "insel", d, minX: p.x - rx, maxX: p.x + rx, minY: p.y - ry, maxY: p.y + ry};
        } else {
          const ecken = [];
          for (const p of mitglieder) ecken.push([p.x - m.kw / 2, p.y - m.kh / 2], [p.x + m.kw / 2, p.y - m.kh / 2], [p.x - m.kw / 2, p.y + m.kh / 2], [p.x + m.kw / 2, p.y + m.kh / 2]);
          const aufgeblasen = huelleAufgeblasen(ecken, 20, 20);
          const xs = aufgeblasen.map(q => q[0]), ys = aufgeblasen.map(q => q[1]);
          form = {art: "insel", d: gerundeterPfad(aufgeblasen, 26), minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys)};
        }
      }
      if (!form) continue;
      const g = sv("g", {class: "zone zone-" + z.farbe, "data-cidr": z.cidr});
      if (form.art === "kapsel") {
        /* Randgenau: Kapsel von Kartenrand zu Kartenrand (Vorgabe der Leitung 30.10.2026). Vorher griffen
           die runden Enden 17 px unter die Karten – sichtbar blieben nur zwei Boegen "()" neben der
           Strecke. Jetzt liegt die ganze Kapsel sichtbar zwischen den beiden Karten. */
        g.append(sv("rect", {class: "zone-flaeche", x: -form.lang / 2, y: -17, width: form.lang, height: 34, rx: 999,
          transform: "translate(" + form.mx.toFixed(1) + " " + form.my.toFixed(1) + ") rotate(" + form.winkel.toFixed(1) + ")"}));
      } else {
        g.append(sv("path", {class: "zone-flaeche", d: form.d}));
      }
      /* Chip: CIDR immer sichtbar, „GW <ip>" als zweite Zeile, wenn ein Anker im Netz liegt (Befund B1).
         Insel: unten links am Inselrand; Kapsel: mittig darüber (Vorgabe der Leitung). */
      const zeile1 = z.cidr + (z.apipa ? " · APIPA" : "");
      const zeile2 = z.gw ? "GW " + z.gw : "";
      const b = Math.max(zeile1.length, zeile2.length) * 6.05 + 28;
      const h = zeile2 ? 34 : 22;
      const [x, y] = chipStelle(belegt, form, b, h);
      belegt.push({x1: x, y1: y, x2: x + b, y2: y + h, istChip: true});
      const lg = sv("g", {class: "zone-label"});
      lg.setAttribute("data-x", x.toFixed(1));
      lg.setAttribute("data-y", y.toFixed(1));
      lg.setAttribute("transform", "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ")");
      lg.append(sv("rect", {x: 0, y: 0, width: b.toFixed(1), height: h, rx: 7}));
      lg.append(sv("circle", {class: "zone-punkt", cx: 10, cy: h / 2, r: 3}));
      const tx = sv("text", {class: "zone-text", x: 20, y: zeile2 ? 14 : 15, "text-anchor": "start"}, zeile1);
      if (zeile2) tx.append(sv("tspan", {class: "zone-gw", x: 20, y: 28, text: zeile2}));
      lg.append(tx);
      g.append(lg);
      schicht.append(g);
    }
  }

  /* ---------- VLAN ---------- */
  function vlanPort(netz, id, port){
    const g = netz.geraete[id]; if (!g || g.typ !== "switch") return null;
    const p = g.running.ports?.[port]; if (!p) return null;
    if (p.modus === "trunk") return {art: "trunk", erlaubt: p.trunkErlaubt, nativ: p.nativeVlan ?? 1};
    return {art: "access", vlan: +p.accessVlan || 1};
  }
  const vlanFarbe = v => `var(--vlan-${((Math.max(1, +v || 1) - 1) % 8) + 1})`;
  const erlaubtText = e => e === "all" || e == null ? "alle" : Array.isArray(e) ? (e.length > 4 ? e.slice(0, 4).join(",") + "…" : e.join(",")) : String(e);

  /* ---------- Kärtchen (MAC-Tabellen, ARP, Routen) ---------- */
  function karte(titel, zeilen, leer){
    const g = sv("g", {class: "karte"});
    const zeilenText = zeilen.length ? zeilen : [leer];
    const breite = Math.max(titel.length * 6.9 + 20, ...zeilenText.map(z => z.length * 6.3 + 20), 120);
    const hoehe = 26 + zeilenText.length * 15 + 6;
    g.append(sv("rect", {class: "karte-rahmen", x: 0, y: 0, width: breite, height: hoehe, rx: 8}));
    g.dataset.b = String(Math.ceil(breite)); g.dataset.h = String(Math.ceil(hoehe));
    g.append(sv("text", {class: "karte-titel", x: 10, y: 17, text: titel}));
    zeilenText.forEach((z, i) => g.append(sv("text", {class: "karte-zeile" + (zeilen.length ? "" : " leer"), x: 10, y: 34 + i * 15, text: z})));
    return g;
  }
  const MAX = 7;
  function kuerzen(zeilen){ return zeilen.length > MAX ? zeilen.slice(0, MAX - 1).concat(`+ ${zeilen.length - MAX + 1} weitere`) : zeilen; }
  function macZeilen(netz, id){
    const uhr = netz.zustand?._uhr || 0, z = netz.zustand?.[id]?.mac || {}, r = [];
    for (const [vlan, tab] of Object.entries(z)) for (const [mac, e] of Object.entries(tab || {})) {
      if (e && e.bis != null && e.bis <= uhr) continue;
      r.push(`${String(vlan).padEnd(4)} ${IP.macCisco(mac)}  ${e.port}`);
    }
    return r.sort();
  }
  function arpZeilen(netz, id){
    const uhr = netz.zustand?._uhr || 0, z = netz.zustand?.[id]?.arp || {}, r = [];
    for (const [ip, e] of Object.entries(z)) { if (e && e.bis != null && e.bis <= uhr) continue; r.push(`${ip.padEnd(15)} ${IP.macCisco(e.mac || "")}`); }
    return r.sort((a, b) => IP.vergleich(a.split(" ")[0], b.split(" ")[0]));
  }
  function routenZeilen(g){
    const k = g.running, r = [];
    for (const [p, i] of Object.entries(k.if || {})) {
      if (!IP.gueltig(i.ip) || !IP.maskeGueltig(i.maske)) continue;
      r.push(`C ${IP.cidr(i.ip, i.maske).padEnd(18)} ${p}${i.shutdown ? " (aus)" : ""}`);
    }
    for (const rt of k.routen || []) {
      const ziel = IP.maskeGueltig(rt.maske) ? `${rt.netz}/${IP.praefix(rt.maske)}` : rt.netz;
      r.push(`S ${ziel.padEnd(18)} ${rt.nh ? "via " + rt.nh : "→ " + (rt.aus || "?")}`);
    }
    return r;
  }
  function zeichneKarten(schicht, netz, pos, ebene){
    const karten = new Map();
    if (ebene !== "mac" && ebene !== "routen") return karten;
    for (const g of Object.values(netz.geraete)) {
      let k = null;
      if (ebene === "mac" && g.typ === "switch") k = karte(`MAC-Tabelle ${g.name}`, kuerzen(macZeilen(netz, g.id)), "leer – noch kein Verkehr");
      else if (ebene === "mac" && g.typ === "router") k = karte(`ARP-Cache ${g.name}`, kuerzen(arpZeilen(netz, g.id)), "leer – noch nichts aufgelöst");
      else if (ebene === "routen" && (g.typ === "router" || g.typ === "firewall")) k = karte(`Routen ${g.name}`, kuerzen(routenZeilen(g)), "keine – nichts konfiguriert");
      else if (ebene === "routen" && Modell.HOST[g.typ]) {
        const i = Object.values(g.running.if || {})[0] || {};
        const t = i.dhcp ? "GW per DHCP" : i.gw ? `GW ${i.gw}` : "kein Gateway";
        k = sv("g", {class: "gw-schild" + (i.gw || i.dhcp ? "" : " fehlt")});
        const b = t.length * 6.3 + 14;
        k.append(sv("rect", {x: -b / 2, y: 0, width: b, height: 18, rx: 9}), sv("text", {x: 0, y: 13, "text-anchor": "middle", text: t}));
        k.dataset.gw = "1";
      }
      if (!k) continue;
      k.setAttribute("data-id", g.id);
      schicht.append(k);
      karten.set(g.id, k);
    }
    karten.ids = Object.keys(netz.geraete);
    platzieren(karten, pos);
    return karten;
  }
  /* GW-Schild unter die Beschriftung; Kärtchen dorthin, wo sie kein Gerät und kein anderes Kärtchen verdecken
     (rechts, links, unten, oben – die erste freie Stelle gewinnt) */
  function platzieren(karten, pos, nurId){
    const kasten = [];
    for (const id of karten.ids || [...karten.keys()]) { const p = pos(id); if (p) kasten.push({id, x1: p.x - 42, y1: p.y - 36, x2: p.x + 42, y2: p.y + 62}); }
    const frei = (r, eigen) => !kasten.some(k => k.id !== eigen && r.x1 < k.x2 && r.x2 > k.x1 && r.y1 < k.y2 && r.y2 > k.y1);
    for (const [id, k] of karten) {
      const p = pos(id); if (!p) continue;
      if (k.dataset.gw) { if (!nurId || id === nurId) k.setAttribute("transform", `translate(${p.x} ${p.y + 66})`); continue; }
      const b = +k.dataset.b || 160, hh = +k.dataset.h || 60;
      const kand = [[p.x + 44, p.y - 30], [p.x - 44 - b, p.y - 30], [p.x - b / 2, p.y + 68], [p.x - b / 2, p.y - 44 - hh]];
      let wahl = kand[0];
      for (const [x, y] of kand) { if (frei({x1: x, y1: y, x2: x + b, y2: y + hh}, id)) { wahl = [x, y]; break; } }
      kasten.push({id: "karte-" + id, x1: wahl[0], y1: wahl[1], x2: wahl[0] + b, y2: wahl[1] + hh});
      if (!nurId || id === nurId) k.setAttribute("transform", `translate(${wahl[0]} ${wahl[1]})`);
    }
  }

  return {LISTE, get aktuell(){ return holen(); }, setzen, gemerkt, fuerSkills, adresse, alleAdressen, zonen, zeichneZonen, vlanPort, vlanFarbe, erlaubtText,
          zeichneKarten, platzieren, huelle};
})();
