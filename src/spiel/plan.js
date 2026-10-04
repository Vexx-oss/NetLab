"use strict";
/* ---------- Netzplan zum Auftrag (Plan – Ausbau 1.2, Phase B; Architektur § 9.4) ----------
   Der Plan entsteht aus dem SOLL-Netz: Startnetz + Referenzlösung. Bei einer Störung ist das das gesunde Netz, bei einem
   Projekt das Ziel. Er verrät die Ursache also nie – was im Labor davon abweicht, IST die Diagnose (B3).
   Drei Arten: netzplan (IT-Doku: Ports, Adressen, VLANs) · skizze (Kunde: Namen, Linien, wenige Adressen) · tabelle
   (Adresstabelle, im AP2 mit Lücken). Die Zeichnung wird automatisch in Ebenen ausgerichtet, nicht von der Laborfläche
   übernommen: Internet → Router/Firewall → Switches → Endgeräte. Headless (kein DOM). */
Spiel.plan = {};
Spiel.PLAN = {SPALTE_MIN: 120, ZEILE: 118, RAND: 36, ZEICHEN_PX: 8.8, ZEILE_PX: 18, SYMBOL: 44};   /* ZEICHEN_PX: 15-px-Schrift (Mono 14 px ≈ 8,4 px je Zeichen) */
(() => {

/* Startnetz + Referenzlösung (gecacht je Instanz) */
Spiel.plan.sollNetzVon = function(def, seed){
  const n = Spiel.startNetz(def, seed);
  Spiel.loesung(n, def.loesung || []);
  /* Plan-Audit (E1): Die Kundendoku hat Fehler – sie stehen nur im Plan, nie im Netz */
  for (const f of def.planFehler || []) if (n.geraete[f.geraet]) Modell.setzen(n, f.geraet, `if.${f.port}.${f.feld}`, f.wert);
  return n;
};
Spiel.plan.sollNetz = function(inst){
  const lz = Spiel.laufzeit(inst);
  if (!lz.sollNetz) lz.sollNetz = Spiel.plan.sollNetzVon(Spiel.defVon(inst), inst.seed);
  return lz.sollNetz;
};

/* Art je Niveau (oder vom Ticket vorgegeben): E voller Netzplan, AP1 Skizze + Tabelle, AP2 Tabelle mit Lücken */
Spiel.plan.art = function(inst){
  const def = Spiel.defVon(inst);
  if (def && def.plan && def.plan.art) return def.plan.art;
  return {E: "netzplan", AP1: "skizze", AP2: "tabelle"}[Spiel.niveauVon(inst)] || "netzplan";
};
/* breite (px, optional): verfügbarer Platz – lange Ebenen brechen dann um, statt die Schrift zu verkleinern */
Spiel.plan.fuer = function(inst, {breite} = {}){
  const art = Spiel.plan.art(inst);
  return Spiel.plan.aus(Spiel.plan.sollNetz(inst), {art, verdeckt: art === "tabelle" ? "hosts-gw-dns" : null, breite});
};

const PLAN_HOST = {pc: true, server: true, nas: true};
Spiel.plan.ebenen = function(netz){
  const g = netz.geraete, ids = Object.keys(g).sort();
  const nachbarn = id => netz.kabel.flatMap(k => k.a.geraet === id ? [k.b.geraet] : k.b.geraet === id ? [k.a.geraet] : []).filter(x => g[x]);
  const ebene = {};
  for (const id of ids) if (g[id].typ === "internet") ebene[id] = 0;
  for (const id of ids) if (g[id].typ === "router" || g[id].typ === "firewall") ebene[id] = 1;
  /* Switches: Abstand zum nächsten Router über Switch-Kabel (Kaskaden untereinander) */
  let rand = ids.filter(id => g[id].typ === "switch" && nachbarn(id).some(n => ebene[n] === 1));
  for (const id of rand) ebene[id] = 2;
  for (let tiefe = 3; rand.length && tiefe < 9; tiefe++) {
    const neu = [];
    for (const id of rand) for (const n of nachbarn(id)) if (g[n].typ === "switch" && ebene[n] == null) { ebene[n] = tiefe; neu.push(n); }
    rand = neu;
  }
  for (const id of ids) if (g[id].typ === "switch" && ebene[id] == null) ebene[id] = 2;
  const swMax = Math.max(1, ...ids.filter(id => g[id].typ === "switch").map(id => ebene[id]));
  for (const id of ids) if (ebene[id] == null) ebene[id] = PLAN_HOST[g[id].typ] ? swMax + 1 : swMax + 1;
  return {ebene, nachbarn};
};

/* VLAN eines Host-Anschlusses: Access-VLAN des Switchports am anderen Kabelende */
Spiel.plan.vlanAn = function(netz, id, port){
  const k = Modell.kabelAn(netz, id, port); if (!k) return null;
  const sw = netz.geraete[k.gegen.geraet];
  if (!sw || sw.typ !== "switch") return null;
  const p = (sw.running.ports || {})[k.gegen.port] || {};
  return p.modus === "trunk" ? null : (p.accessVlan || 1);
};

/* Adressen eines Geräts für Zeichnung und Tabelle */
Spiel.plan.adressen = function(netz, g){
  const r = g.running || {}, liste = [];
  if (PLAN_HOST[g.typ]) {
    for (const [port, c] of Object.entries(r.if || {})) {
      if (!Modell.kabelAn(netz, g.id, port) && !c.ip && !c.dhcp) continue;
      liste.push({port, ip: c.dhcp ? "" : c.ip || "", maske: c.dhcp ? "" : c.maske || "", gw: c.dhcp ? "" : c.gw || "", dns: c.dhcp ? "" : c.dns || "",
        dhcp: !!c.dhcp, vlan: Spiel.plan.vlanAn(netz, g.id, port)});
    }
  } else if (g.typ === "router" || g.typ === "firewall") {
    for (const [port, c] of Object.entries(r.if || {}).sort((a, b) => a[0].localeCompare(b[0]))) {
      if (!c.ip) continue;
      liste.push({port, ip: c.ip, maske: c.maske || "", vlan: c.vlan || null, zone: c.zone || null});
    }
  } else if (g.typ === "switch") {
    for (const [v, c] of Object.entries(r.svi || {})) if (c.ip) liste.push({port: "Vlan" + v, ip: c.ip, maske: c.maske || "", vlan: +v});
  }
  return liste;
};

const planCidr = (ip, maske) => { try { return IP.gueltig(ip) && IP.maskeGueltig(maske) ? IP.cidr(ip, maske) : ""; } catch (e) { return ""; } };
const planPraefix = maske => { try { return IP.maskeGueltig(maske) ? "/" + IP.praefix(maske) : ""; } catch (e) { return ""; } };

Spiel.plan.aus = function(netz, {art = "netzplan", verdeckt = null, breite: platz = null} = {}){
  const P = Spiel.PLAN, g = netz.geraete;
  const {ebene, nachbarn} = Spiel.plan.ebenen(netz);
  /* Beschriftung je Knoten (was die Zeichnung unter dem Namen zeigt) */
  const knoten = Object.values(g).map(d => {
    const adressen = Spiel.plan.adressen(netz, d);
    let zeigen = [];
    if (art === "netzplan") zeigen = adressen.map(a => PLAN_HOST[d.typ] ? (a.dhcp ? "DHCP" : a.ip ? a.ip + planPraefix(a.maske) : "")
      : `${a.port} ${a.ip}${planPraefix(a.maske)}`).filter(Boolean);
    else if (art === "skizze") zeigen = d.typ === "router" || d.typ === "firewall" || d.typ === "server" || d.typ === "nas"
      ? adressen.slice(0, 1).map(a => a.ip) : [];
    return {id: d.id, name: d.name, typ: d.typ, skin: d.skin || null, ebene: ebene[d.id], adressen, zeigen, x: 0, y: 0};
  });
  /* Ebenen ordnen: in jeder Ebene nach der Position des ersten Nachbarn darüber, dann nach Name */
  const reihen = {};
  for (const k of knoten) (reihen[k.ebene] ||= []).push(k);
  const stufen = Object.keys(reihen).map(Number).sort((a, b) => a - b);
  const index = {};
  for (const e of stufen) {
    const vater = k => { const vs = nachbarn(k.id).filter(n => ebene[n] < e).map(n => index[n]).filter(i => i != null); return vs.length ? Math.min(...vs) : 1e6; };
    reihen[e].sort((a, b) => vater(a) - vater(b) || a.name.localeCompare(b.name, "de"));
    reihen[e].forEach((k, i) => { index[k.id] = i; });
  }
  /* Spaltenbreite und Zeilenhöhe je Reihe aus den Beschriftungen – so überlappt nichts. Höchstens so viele Geräte
     nebeneinander, wie bei ≥ 92 % Maßstab in den Platz passen; der Rest bricht (versetzt) in eine weitere Reihe um. */
  const textBreite = k => Math.max(k.name.length, ...k.zeigen.map(z => z.length)) * P.ZEICHEN_PX + 16;
  const textHoehe = k => P.SYMBOL + (1 + k.zeigen.length) * P.ZEILE_PX;
  const reihenListe = [];
  for (const e of stufen) {
    const spalte = Math.max(P.SPALTE_MIN, ...reihen[e].map(textBreite)) + 18;
    const maxReihe = platz ? Math.max(2, Math.floor((platz / 0.92 - 2 * P.RAND) / spalte)) : Infinity;
    for (let i = 0; i < reihen[e].length; i += maxReihe) {
      const teil = reihen[e].slice(i, i + maxReihe), versetzt = (i / maxReihe) % 2 === 1;
      reihenListe.push({teil, spalte, versetzt, hoehe: Math.max(P.ZEILE, ...teil.map(textHoehe)) + 22, breite: teil.length * spalte + (versetzt ? spalte / 2 : 0)});
    }
  }
  const breite = Math.round(Math.max(...reihenListe.map(r => r.breite), P.SPALTE_MIN) + 2 * P.RAND);
  let y = P.RAND + P.SYMBOL / 2;
  for (const r of reihenListe) {
    const links = (breite - r.breite) / 2 + (r.versetzt ? r.spalte / 2 : 0);
    r.teil.forEach((k, i) => { k.x = Math.round(links + i * r.spalte + r.spalte / 2); k.y = Math.round(y); });
    y += r.hoehe;
  }
  const hoehe = Math.round(y - P.SYMBOL / 2 - 22 + P.RAND);
  /* Linien, Netze, Tabelle */
  const linien = netz.kabel.filter(k => g[k.a.geraet] && g[k.b.geraet]).map(k => {
    const port = (id, p) => g[id].typ === "switch" ? ((g[id].running.ports || {})[p] || {}) : null;
    const pa = port(k.a.geraet, k.a.port), pb = port(k.b.geraet, k.b.port);
    const trunk = !!((pa && pa.modus === "trunk") || (pb && pb.modus === "trunk"));
    const zugang = [pa, pb].find(p => p && p.modus !== "trunk");
    return {a: {id: k.a.geraet, port: k.a.port}, b: {id: k.b.geraet, port: k.b.port}, trunk, vlan: trunk ? null : zugang ? (zugang.accessVlan || 1) : null};
  });
  const netze = {};
  for (const k of knoten) for (const a of k.adressen) {
    const c = planCidr(a.ip, a.maske); if (!c) continue;
    const n = netze[c] ||= {cidr: c, vlan: a.vlan || null, geraete: []};
    if (!n.geraete.includes(k.id)) n.geraete.push(k.id);
  }
  const verdecktListe = [];
  const tabelle = [];
  for (const k of knoten.slice().sort((a, b) => a.ebene - b.ebene || a.x - b.x)) {
    if (k.typ === "internet") continue;
    for (const a of k.adressen) {
      const zeile = {id: k.id, name: k.name, typ: k.typ, port: a.port, ip: a.dhcp ? "DHCP" : a.ip, maske: a.maske, gw: a.gw ?? "", dns: a.dns ?? "", vlan: a.vlan ?? null, dhcp: !!a.dhcp};
      if (verdeckt === "hosts-gw-dns" && PLAN_HOST[k.typ] && !a.dhcp) {
        for (const f of ["gw", "dns"]) if (zeile[f]) { zeile[f] = "?"; verdecktListe.push({id: k.id, feld: f}); }
      }
      tabelle.push(zeile);
    }
  }
  return {art, breite, hoehe, knoten, linien, netze: Object.values(netze), tabelle, verdeckt: verdecktListe};
};

/* ---------- Plan ↔ Labor: Abweichungen (B3) ---------- */
function planBlaetter(a, b, pfad, aus){
  const obj = x => x && typeof x === "object" && !Array.isArray(x);
  if (obj(a) && obj(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) planBlaetter(a[k], b[k], pfad ? pfad + "." + k : k, aus);
    return;
  }
  const leer = x => x === undefined || x === null || x === "" || (obj(x) && !Object.keys(x).length) || (Array.isArray(x) && !x.length);
  if (leer(a) && leer(b)) return;
  if (JSON.stringify(a) !== JSON.stringify(b)) aus.push({pfad, soll: a === undefined ? null : a, ist: b === undefined ? null : b});
}
Spiel.plan.diff = function(soll, ist){
  const aus = [];
  for (const id of new Set([...Object.keys(soll.geraete), ...Object.keys(ist.geraete)])) {
    const a = soll.geraete[id], b = ist.geraete[id];
    if (!a || !b) { aus.push({geraet: id, pfad: "(gerät)", soll: a ? a.name : null, ist: b ? b.name : null}); continue; }
    if (!!a.an !== !!b.an) aus.push({geraet: id, pfad: "an", soll: !!a.an, ist: !!b.an});
    const blaetter = [];
    planBlaetter(a.running, b.running, "", blaetter);
    if (a.typ === "switch") planBlaetter({vlans: (a.flash || {}).vlans}, {vlans: (b.flash || {}).vlans}, "flash", blaetter);
    for (const x of blaetter) aus.push(Object.assign({geraet: id}, x));
  }
  const schluessel = k => [k.a.geraet + ":" + k.a.port, k.b.geraet + ":" + k.b.port].sort().join("|");
  const ks = new Map(soll.kabel.map(k => [schluessel(k), k])), ki = new Map(ist.kabel.map(k => [schluessel(k), k]));
  for (const [s, k] of ks) if (!ki.has(s)) aus.push({geraet: k.a.geraet, kabel: "fehlt", port: k.a.port, gegen: {geraet: k.b.geraet, port: k.b.port}});
  for (const [s, k] of ki) if (!ks.has(s)) aus.push({geraet: k.a.geraet, kabel: "zuviel", port: k.a.port, gegen: {geraet: k.b.geraet, port: k.b.port}});
  return aus;
};
Spiel.plan.geraeteAus = diff => [...new Set(diff.flatMap(d => d.kabel ? [d.geraet, d.gegen.geraet] : [d.geraet]))].sort();
Spiel.plan.abweichungen = function(inst){
  return Spiel.plan.geraeteAus(Spiel.plan.diff(Spiel.plan.sollNetz(inst), inst.netz));
};
})();
