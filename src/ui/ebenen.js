"use strict";
/* ---------- Ebenen der Netz-Fläche (Konzept § 7 „Ebenen“) ----------
   Physik · VLAN · IP-Netze (Standard) · MAC-Tabellen · Routen.
   UI.ebenen.aktuell            "physik"|"vlan"|"ip"|"mac"|"routen"
   UI.ebenen.setzen(id, {merken}) umschalten (merkt sich die Wahl, außer merken:false – Ticket-Vorgabe), zeichnet neu, Bus „ebene“
   UI.ebenen.gemerkt()          zuletzt selbst gewählte Ebene (Freies Labor)
   UI.ebenen.fuerSkills(skills) Standardansicht eines Tickets (Skill → Ebene)
   UI.ebenen.zonen(netz)        → {zonen:[{cidr, netz, praefix, ids, farbe, apipa}], ohne:Set(ids ohne gültige Adresse)}
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
      for (const a of liste) {
        const c = IP.cidr(a.ip, a.maske); if (!c) continue;
        if (!m.has(c)) m.set(c, {cidr: c, netz: IP.netz(a.ip, a.maske), praefix: IP.praefix(a.maske), ids: [], apipa: IP.apipa(a.ip)});
        const z = m.get(c); if (!z.ids.includes(g.id)) z.ids.push(g.id);
      }
    }
    const liste = [...m.values()].sort((a, b) => IP.vergleich(a.netz, b.netz) || a.praefix - b.praefix);
    liste.forEach((z, i) => { z.farbe = ZONEN[i % ZONEN.length]; });
    return {zonen: liste, ohne};
  }

  /* ---------- Hülle (konvexe Hülle um Kreise je Gerät) ---------- */
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
  function zonenPfad(mitten, r){
    const pts = [];
    for (const c of mitten) for (let i = 0; i < 20; i++) { const w = i / 20 * Math.PI * 2; pts.push([c.x + Math.cos(w) * r, c.y + Math.sin(w) * r]); }
    const hl = huelle(pts);
    return {d: "M" + hl.map(q => q[0].toFixed(1) + " " + q[1].toFixed(1)).join("L") + "Z", obenLinks: hl.reduce((m, q) => q[0] + q[1] < m[0] + m[1] ? q : m, hl[0])};
  }
  /* Fläche der Gerätetrefferfläche (editor.js `ger-treffer`: 68x64 um den Mittelpunkt) plus 2 px Luft */
  const GER_B = 36, GER_H = 34;
  /* Freie Stelle für ein Schild der Breite b und Höhe h suchen. belegt sind Rechtecke {x1,y1,x2,y2}
     von Geräten UND schon gesetzten Schildern. Feste Reihenfolge unten · rechts · links · oben,
     je Richtung einen Schildschritt weiter – die erste Stelle ohne Überdeckung gewinnt.
     Bleibt keine frei, gewinnt die Stelle mit der GERINGSTEN Überdeckung (Schild nie weglassen). */
  function schildStelle(belegt, x0, y0, b, h){
    const ueber = (x, y) => belegt.reduce((s, q) => {
      const dx = Math.min(x + b, q.x2) - Math.max(x, q.x1), dy = Math.min(y + h, q.y2) - Math.max(y, q.y1);
      return s + (dx > 0 && dy > 0 ? dx * dy : 0);
    }, 0);
    const richtungen = [[0, h + 4], [b + 12, 0], [-(b + 12), 0], [0, -(h + 4)]];
    let wahl = [x0, y0], beste = ueber(x0, y0);
    for (let n = 1; n <= 12 && beste > 0; n++) for (const [dx, dy] of richtungen) {
      const u = ueber(x0 + dx * n, y0 + dy * n);
      if (u < beste) { beste = u; wahl = [x0 + dx * n, y0 + dy * n]; }
      if (!beste) break;
    }
    return wahl;
  }
  function zeichneZonen(schicht, netz, pos){
    const {zonen: zl} = zonen(netz);
    /* Vorbelegung: die Geräterechtecke. Ohne sie blieb ein Schild auf dem Router liegen
       (Befund 05.10.2026: „192.168.30.0/24“ mitten auf r1). */
    const belegt = [];
    for (const g of Object.values(netz.geraete)) {
      const p = pos(g.id); if (!p) continue;
      belegt.push({x1: p.x - GER_B, y1: p.y - GER_H, x2: p.x + GER_B, y2: p.y + GER_H});
    }
    for (const z of zl) {
      const mitten = z.ids.map(pos).filter(Boolean);
      if (!mitten.length) continue;
      const {d, obenLinks} = zonenPfad(mitten, 54);
      const g = sv("g", {class: `zone zone-${z.farbe}`, "data-cidr": z.cidr});
      g.append(sv("path", {class: "zone-flaeche", d}));
      const text = z.cidr + (z.apipa ? " · APIPA" : "");
      const b = text.length * 6.6 + 16, h = 20;
      const [x, y] = schildStelle(belegt, obenLinks[0] - 14, obenLinks[1] - 22, b, h);
      belegt.push({x1: x, y1: y, x2: x + b, y2: y + h});
      g.append(sv("rect", {class: "zone-schild", x, y, width: b, height: h, rx: 10}));
      g.append(sv("text", {class: "zone-text", x: x + b / 2, y: y + 14, "text-anchor": "middle", text}));
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
