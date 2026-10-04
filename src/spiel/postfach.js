"use strict";
/* ---------- Spiel: Postfach und Ticket-Instanzen ----------
   Ticket-Definitionen kommen aus DATEN.tickets (Architektur § 7.1) oder vom Generator (Spiel.generierte[id]).
   Eine Instanz ist ein konkretes, spielbares Ticket mit eigenem Netz (Architektur § 7.2):
   { iid, ticketId, seed, netz, hilfeStufe, hilfen:[], start, frist|null, quelle, kunde, gelesen, ab|null,
     zeitMs, basis:null|[{von,nach}], gen:null|{skill, seed, opts}, leiter:{}, fortschritt }
   Das Postfach hält immer 2–3 reguläre Tickets bereit (nie leer, nie übervoll); Wartung/Tag/Prüfung
   stellt die Karriere zusätzlich ein. */

Spiel.POSTFACH_ZIEL = 3;                       /* so viele reguläre Tickets liegen höchstens bereit */
Spiel.WIEDERHOLUNG_NACH_MS = 15 * 60 * 1000;   /* Wiederholungsticket nach „Lösung vorführen“ erscheint später */
Spiel.generierte = Spiel.generierte || {};

/* Ticket-Definition zu einer ID: handgeschrieben, generiert oder (für Instanzen) neu generiert */
Spiel.ticketDef = function(id, inst){
  if (!id) return null;
  const d = (DATEN.tickets || []).find(t => t.id === id);
  if (d) return d;
  if (Spiel.generierte[id]) return Spiel.generierte[id];
  const gen = inst && inst.gen;
  if (gen && typeof Spiel.generiere === "function") {
    try {
      const g = Spiel.generiere(gen.skill, gen.seed, gen.opts || {});
      if (g) { Spiel.generierte[g.id] = g; if (g.id !== id) Spiel.generierte[id] = g; return g; }
    } catch (e) { typeof console !== "undefined" && console.error("Generator", e); }
  }
  return null;
};

/* Reihenfolge der handgeschriebenen Tickets: Karriere-Stufe, dann optional def.reihe, dann Reihenfolge in DATEN.tickets */
Spiel.ticketReihe = function(){
  const alle = (DATEN.tickets || []).map((t, i) => ({t, i}));
  return alle.filter(({t}) => t && t.id && !t.entwurf && t.art !== "mini" && t.art !== "wartung")
    .sort((a, b) => (a.t.karriere || 1) - (b.t.karriere || 1) || ((a.t.reihe ?? 1e6) - (b.t.reihe ?? 1e6)) || a.i - b.i)
    .map(x => x.t);
};

Spiel.istErledigt = id => Spiel.st.erledigt.some(e => e.id === id);

/* Startwert einer neuen Instanz: variiert im Spiel, bleibt in Tests (jetzt.setzen) reproduzierbar */
Spiel.neuerSeed = function(zusatz){
  let h = (jetzt() % 2147483647) ^ Math.imul(Spiel.st.naechsteIid, 2654435761);
  for (const c of String(zusatz || "")) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) || 1;
};

/* Spiel.instanzErstellen({ticketId | gen:{skill, seed, opts}, quelle, frist, kunde, seed, ab}) → inst */
Spiel.instanzErstellen = function(o = {}){
  const st = Spiel.st;
  let def = null, gen = null;
  if (o.gen) {
    if (typeof Spiel.generiere !== "function") throw new Error("Kein Ticket-Generator vorhanden (Spiel.generiere).");
    gen = {skill: o.gen.skill, seed: o.gen.seed ?? Spiel.neuerSeed(o.gen.skill), opts: o.gen.opts || {}};
    def = Spiel.generiere(gen.skill, gen.seed, gen.opts);
    if (!def) throw new Error("Generator lieferte kein Ticket für " + gen.skill);
    Spiel.generierte[def.id] = def;
  } else {
    def = Spiel.ticketDef(o.ticketId);
    if (!def) throw new Error("Unbekanntes Ticket: " + o.ticketId);
  }
  const seed = o.seed ?? (gen ? gen.seed : Spiel.neuerSeed(def.id));
  const netz = Spiel.startNetz(def, seed);
  const inst = {
    iid: "i" + (st.naechsteIid++), ticketId: def.id, seed, netz,
    hilfeStufe: 0, hilfen: [], start: jetzt(), frist: typeof o.frist === "number" ? o.frist : null,
    quelle: o.quelle || "postfach", kunde: o.kunde || def.kunde || null,
    gelesen: false, ab: typeof o.ab === "number" ? o.ab : null,
    zeitMs: 0, basis: null, gen, leiter: {}, fortschritt: null,
  };
  st.postfach.push(inst);
  if (!st.angebot.includes(def.id) && !gen) st.angebot.push(def.id);
  if (inst.kunde) Spiel.kunde(inst.kunde);
  Spiel.speichern();
  Spiel.melden("ticket-neu", {inst, def});
  Spiel.melden("zustand-geaendert", {grund: "ticket-neu"});
  return inst;
};

/* Kundeneintrag im Spielstand (legt ihn bei Bedarf an) */
Spiel.kunde = function(id){
  const k = Spiel.st.kunden;
  return k[id] ||= {vertrag: false, ampel: "gruen", seit: heute(), sterne: []};
};
Spiel.kundenDaten = id => (DATEN.kunden && DATEN.kunden[id]) || {name: id || "Kunde", symbol: "✉", farbe: null, saetze: {}};

Spiel.instanz = iid => Spiel.st.postfach.find(i => i.iid === iid) || null;
Spiel.aktiveInstanz = () => Spiel.st.aktiv ? Spiel.instanz(Spiel.st.aktiv) : null;
Spiel.defVon = inst => inst ? Spiel.ticketDef(inst.ticketId, inst) : null;

/* Sichtbare Tickets, sortiert: Fristen zuerst (früheste oben), dann Ungelesenes, dann nach Eingang */
Spiel.postfach = function(){
  const t = jetzt();
  return Spiel.st.postfach.filter(i => !(i.ab && i.ab > t) && i.quelle !== "pruefung").slice().sort((a, b) => {
    const fa = a.frist ?? Infinity, fb = b.frist ?? Infinity;
    if (fa !== fb) return fa - fb;
    if (!!a.gelesen !== !!b.gelesen) return a.gelesen ? 1 : -1;
    return a.start - b.start;
  });
};
Spiel.ungelesen = () => Spiel.postfach().filter(i => !i.gelesen).length + (Spiel.post ? Spiel.post.ungelesen() : 0);   /* Tickets + Kundenpost */

/* Instanzen ohne auflösbare Definition (Ticket gelöscht, Generator fehlt) entfernen */
Spiel.instanzenPruefen = function(){
  const st = Spiel.st, weg = [];
  st.postfach = st.postfach.filter(i => { const ok = !!Spiel.defVon(i); if (!ok) weg.push(i.ticketId); return ok; });
  if (st.aktiv && !Spiel.instanz(st.aktiv)) st.aktiv = null;
  return weg;
};

/* Postfach auffüllen: die nächsten ungelösten Tickets bis Karriere-Stufe st.stufe, höchstens POSTFACH_ZIEL reguläre.
   Ist alles gelöst: Generator-Variante (fällige Fertigkeit zuerst) oder das schwächste gelöste Ticket erneut. */
Spiel.postfachAuffuellen = function({still = false} = {}){
  const st = Spiel.st, neu = [];
  const regulaer = () => st.postfach.filter(i => i.quelle === "postfach" || i.quelle === "generiert").length;
  const imPostfach = new Set(st.postfach.map(i => i.ticketId));
  const kandidaten = Spiel.ticketReihe().filter(t => (t.karriere || 1) <= st.stufe && !Spiel.istErledigt(t.id) && !imPostfach.has(t.id));
  for (const t of kandidaten) {
    if (regulaer() >= Spiel.POSTFACH_ZIEL) break;
    neu.push(Spiel.instanzErstellen({ticketId: t.id, quelle: "postfach"}));
  }
  if (Spiel.postfach().length === 0) {
    const n = Spiel.nachschub();
    if (n) neu.push(n);
  }
  return neu;
};

/* Nachschub, wenn alle handgeschriebenen Tickets erledigt sind */
Spiel.nachschub = function(){
  const st = Spiel.st;
  const freigegeben = (DATEN.skills || []).filter(s => (s.stufe || 1) <= st.stufe).map(s => s.id);
  if (typeof Spiel.generiere === "function" && freigegeben.length) {
    const faellig = typeof L !== "undefined" ? L.faelligeIds(id => freigegeben.includes(id)) : [];
    const geuebt = freigegeben.filter(id => typeof L !== "undefined" && L.versucht(id));
    const liste = faellig.length ? faellig : geuebt.length ? geuebt : freigegeben;
    const z = Zufall(Spiel.neuerSeed("nachschub"));
    for (let versuch = 0; versuch < 4; versuch++) {
      const skill = z.wahl(liste);
      try { return Spiel.instanzErstellen({gen: {skill, seed: Spiel.neuerSeed(skill + versuch), opts: {stufe: Spiel.einst.wahl === "auto" ? undefined : Spiel.einst.wahl}}, quelle: "generiert"}); }
      catch (e) { /* nächste Fertigkeit versuchen */ }
    }
  }
  /* ohne Generator: gelöstes Ticket mit den wenigsten Sternen noch einmal (neuer Seed) */
  const reihe = Spiel.ticketReihe().filter(t => (t.karriere || 1) <= st.stufe);
  if (!reihe.length) return null;
  const sterneVon = id => Math.max(0, ...st.erledigt.filter(e => e.id === id).map(e => e.sterne || 0));
  const t = reihe.slice().sort((a, b) => sterneVon(a.id) - sterneVon(b.id))[0];
  return Spiel.instanzErstellen({ticketId: t.id, quelle: "postfach"});
};

/* Instanz aus dem Postfach nehmen (nach Abschluss) */
Spiel.instanzEntfernen = function(iid){
  const st = Spiel.st;
  st.postfach = st.postfach.filter(i => i.iid !== iid);
  if (st.aktiv === iid) st.aktiv = null;
  if (Spiel._lz) delete Spiel._lz[iid];
};

Spiel.alsGelesen = function(iid){
  const i = Spiel.instanz(iid); if (!i || i.gelesen) return;
  i.gelesen = true; Spiel.geaendert("gelesen");
};

/* Geschätzte Minuten (Anzeige im Postfach) */
Spiel.minuten = function(def){
  if (!def) return null;
  if (typeof def.minuten === "number") return def.minuten;
  return {mini: 1, stoerung: 5, wartung: 4, projekt: 15}[def.art] || 5;
};
