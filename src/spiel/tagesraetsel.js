"use strict";
/* ---------- Tagesrätsel: ein Netz pro Tag und Niveau, für alle gleich (Design – Spielspaß 2.0, Hebel 5; Architektur § 9.3) ----------
   Fertigkeit und Netz hängen nur an Datum und Niveau – nie am Spielstand –, so bekommt die ganze Klasse dasselbe
   Rätsel, ohne Server. Ergebnis als Text zum Kopieren, der die Ursache nicht verrät:
     Netzwerk-Labor · Tagesrätsel #4 · AP1
     ★★★☆☆ · 4:12 · Hilfe 0 · 2 Versuche
     🟩🟩🟨⬜              (je Ziel: 🟩 im ersten Versuch, 🟨 später, ⬜ nicht erreicht)
   Kein Zeitdruck, nichts geht verloren: Ein angefangenes Rätsel verfällt erst beim Programmstart am Folgetag. */
Spiel.raetsel = {};
Spiel.RAETSEL = {
  START: "2026-10-01",                 /* Rätsel #1 */
  SEED: 7000000,
  SKILLS: {
    E:   ["lab.link", "lab.ip", "lab.netz", "lab.gateway", "lab.dns", "lab.ports"],
    AP1: ["lab.ip", "lab.netz", "lab.gateway", "lab.arp", "lab.dns", "lab.dhcp", "lab.vlan", "lab.route", "lab.nat", "lab.ports"],
    AP2: ["lab.dhcp", "lab.vlan", "lab.trunk", "lab.rostick", "lab.acl", "lab.route", "lab.ttl", "lab.nat", "lab.fw", "lab.dmz", "lab.portfwd", "lab.speichern"],
  },
  FELD: {g: "🟩", y: "🟨", w: "⬜"},
};

Spiel.raetsel.nummer = tag => tageZwischen(Spiel.RAETSEL.START, tag || heute()) + 1;
Spiel.raetsel.daten = function(){
  const st = Spiel.st;
  if (!st.tagesraetsel || typeof st.tagesraetsel !== "object" || Array.isArray(st.tagesraetsel)) st.tagesraetsel = {serie: 0};
  return st.tagesraetsel;
};
/* Niveau des Spielers für neue Rätsel: feste Wahl, sonst aus dem Lernstand der freigegebenen Fertigkeiten */
Spiel.raetsel.niveau = function(){
  const w = Spiel.einst.wahl;
  if (Spiel.NIVEAUS.includes(w)) return w;
  const skills = (DATEN.skills || []).filter(s => (s.stufe || 1) <= Math.max(1, Spiel.st.stufe)).map(s => s.id);
  return Spiel.niveauFuer({skills, stufe: "E"});
};
/* Welche Fertigkeit und welcher Seed? Nur Datum + Niveau zählen. Lässt sich für eine Fertigkeit kein Auftrag bauen,
   geht es in fester Reihenfolge weiter – für alle gleich. */
Spiel.raetsel.wahl = function(tag, niveau){
  const pool = Spiel.RAETSEL.SKILLS[niveau] || Spiel.RAETSEL.SKILLS.E;
  const nr = Spiel.raetsel.nummer(tag), rang = Math.max(0, Spiel.NIVEAUS.indexOf(niveau));
  const seed = Spiel.RAETSEL.SEED + nr * 3 + rang;
  const start = Zufall("raetsel:" + tag + ":" + niveau).zahl(pool.length);
  for (let i = 0; i < pool.length; i++) {
    const skill = pool[(start + i) % pool.length];
    try { const def = Spiel.generiere(skill, seed, {stufe: niveau}); if (def) return {skill, seed, def, nr, niveau, tag}; }
    catch (e) { /* nächste Fertigkeit */ }
  }
  return null;
};
Spiel.raetsel.def = (tag, niveau) => { const w = Spiel.raetsel.wahl(tag, niveau); return w ? w.def : null; };

Spiel.raetsel.instanz = tag => Spiel.st.postfach.find(i => i.quelle === "raetsel" && i.raetsel && i.raetsel.tag === (tag || heute())) || null;
/* Stand für heute (Hub-Kachel): Nummer, Niveau, laufende Instanz, Ergebnis, Serie */
Spiel.raetsel.heute = function(){
  const tag = heute(), d = Spiel.raetsel.daten(), inst = Spiel.raetsel.instanz(tag);
  const ergebnis = d[tag] || null;
  return {tag, nr: Spiel.raetsel.nummer(tag), niveau: ergebnis ? ergebnis.niveau : inst ? inst.raetsel.niveau : Spiel.raetsel.niveau(),
    inst, ergebnis, serie: Spiel.raetsel.serie()};
};
Spiel.raetsel.starten = function(){
  const tag = heute();
  const da = Spiel.raetsel.instanz(tag); if (da) return da;
  if (Spiel.raetsel.daten()[tag]) return null;                           /* heute schon gelöst */
  const w = Spiel.raetsel.wahl(tag, Spiel.raetsel.niveau());
  if (!w) return null;
  const inst = Spiel.instanzErstellen({gen: {skill: w.skill, seed: w.seed, opts: {stufe: w.niveau}}, quelle: "raetsel"});
  inst.raetsel = {tag, nr: w.nr, niveau: w.niveau};
  Spiel.speichern();
  return inst;
};
/* Abschluss (aus Spiel.abschliessen): Ergebnis und Teilen-Zeile festhalten */
Spiel.raetsel.ergebnis = function(inst, abnahme){
  const r = inst.raetsel; if (!r) return null;
  const d = Spiel.raetsel.daten();
  const ziele = (abnahme.ergebnisse || []).map((e, i) => { const n = (inst.zielErst || [])[i]; return n === 1 ? "g" : n > 1 ? "y" : e.ok ? "y" : "w"; });
  const eintrag = {nr: r.nr, niveau: r.niveau, sterne: abnahme.sterne, sek: Math.round((inst.zeitMs || 0) / 1000), hilfe: inst.hilfeStufe || 0,
    versuche: inst.abnahmen || 1, ziele, zeile: ziele.map(z => Spiel.RAETSEL.FELD[z]).join("")};
  d[r.tag] = eintrag;
  d.serie = Spiel.raetsel.serie();
  return eintrag;
};
Spiel.raetsel.serie = function(){
  const d = Spiel.raetsel.daten();
  const tage = new Set(Object.keys(d).filter(k => /^\d{4}-\d\d-\d\d$/.test(k)));
  return Spiel.hub ? Spiel.hub.serie(tage).tage : tage.size;
};
Spiel.raetsel.teilen = function(tag){
  const e = Spiel.raetsel.daten()[tag || heute()]; if (!e) return "";
  const s = e.sterne || 0, sterne = "★".repeat(Math.floor(s)) + (s % 1 ? "½" : "") + "☆".repeat(Math.max(0, 5 - Math.ceil(s)));
  const zeit = `${Math.floor(e.sek / 60)}:${String(e.sek % 60).padStart(2, "0")}`;
  return `Netzwerk-Labor · Tagesrätsel #${e.nr} · ${Spiel.NIVEAU_NAME[e.niveau] || e.niveau}\n${sterne} · ${zeit} · Hilfe ${e.hilfe} · ${e.versuche} ${e.versuche === 1 ? "Versuch" : "Versuche"}\n${e.zeile}`;
};
/* Programmstart: Rätsel von gestern (nicht gelöst) verfallen still – kein Verlust, morgen gibt es ein neues */
Spiel.raetsel.aufraeumen = function(st){
  const t = heute(), alt = (st.postfach || []).filter(i => i.quelle === "raetsel" && (!i.raetsel || i.raetsel.tag !== t)).map(i => i.iid);
  if (!alt.length) return 0;
  st.postfach = st.postfach.filter(i => !alt.includes(i.iid));
  if (alt.includes(st.aktiv)) st.aktiv = null;
  return alt.length;
};
Spiel.ergaenzer.raetsel = st => { Spiel.raetsel.aufraeumen(st); };
