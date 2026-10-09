"use strict";
/* ---------- Spiel: Postfach und Ticket-Instanzen ----------
   Ticket-Definitionen kommen aus DATEN.tickets (Architektur § 7.1) oder vom Generator (Spiel.generierte[id]).
   Eine Instanz ist ein konkretes, spielbares Ticket mit eigenem Netz (Architektur § 7.2):
   { iid, ticketId, seed, netz, hilfeStufe, hilfen:[], start, frist|null, quelle, kunde, gelesen, ab|null,
     zeitMs, basis:null|[{von,nach}], gen:null|{skill, seed, opts}, leiter:{}, fortschritt }
   Das Postfach hält immer 2–3 reguläre Tickets bereit (nie leer, nie übervoll); Wartung/Tag/Prüfung
   stellt die Karriere zusätzlich ein. */

Spiel.POSTFACH_ZIEL = 3;                       /* so viele reguläre Tickets liegen höchstens bereit (ab Stufe 2: eins mehr) */
Spiel.POSTFACH_WAHL = 2;                       /* erste Wahl (Einstieg in 90 s): zwei Angebote verschiedener Kunden */
/* Bis zum zweiten erledigten Auftrag liegen genau zwei Angebote bereit – möglichst von verschiedenen Kunden, damit sich
   Lohn, Zeit und Thema wirklich unterscheiden (erste echte Entscheidung in den ersten Minuten). Danach drei. */
Spiel.postfachZiel = () => Spiel.st.erledigt.length < 2 ? Spiel.POSTFACH_WAHL : Spiel.POSTFACH_ZIEL + (Spiel.st.stufe >= 2 ? 1 : 0);
Spiel.WIEDERHOLUNG_NACH_MS = 15 * 60 * 1000;   /* Wiederholungsticket nach „Lösung vorführen“ erscheint später */
Spiel.generierte = Spiel.generierte || {};

/* Ticket-Definition zu einer ID: handgeschrieben, generiert oder (für Instanzen) neu generiert.
   P2: Eine Instanz mit inst.vielfalt bekommt die Fassung ihres Instanz-Seeds (eigenes Netz je Instanz).
   Alt-Instanzen ohne dieses Feld behalten die feste Fassung – ihr Netz wechselt nach dem Umbau nicht. */
Spiel.ticketDef = function(id, inst){
  if (!id) return null;
  const d = (DATEN.tickets || []).find(t => t.id === id);
  if (d) return inst && inst.vielfalt && typeof d.fuerSeed === "function" ? (d.fuerSeed(inst.seed) || d) : d;
  if (Spiel.generierte[id]) return Spiel.generierte[id];
  if (/-folge$/.test(id) && Spiel.varianten) {                 /* Folgeauftrag nach einem Provisorium (E1) */
    const basis = (DATEN.tickets || []).find(t => t.id === id.replace(/-folge$/, ""));
    if (basis) return Spiel.varianten.folgeDef(basis);
  }
  const gen = inst && inst.gen;
  if (gen && gen.form) {                                      /* generierte Form (E1): Fernwartung, Plan-Audit, Adressplan */
    try { return Spiel.generiereForm(gen.form, gen.seed, gen.opts || {}); }
    catch (e) { typeof console !== "undefined" && console.error("Form-Generator", e); return null; }
  }
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
  if (o.gen && o.gen.form) {
    gen = {form: o.gen.form, seed: o.gen.seed ?? Spiel.neuerSeed(o.gen.form), opts: o.gen.opts || {}};
    def = Spiel.generiereForm(gen.form, gen.seed, gen.opts);
  } else if (o.gen) {
    if (typeof Spiel.generiere !== "function") throw new Error("Kein Ticket-Generator vorhanden (Spiel.generiere).");
    gen = {skill: o.gen.skill, seed: o.gen.seed ?? Spiel.neuerSeed(o.gen.skill), opts: o.gen.opts || {}};
    def = Spiel.generiere(gen.skill, gen.seed, gen.opts);
    if (!def) throw new Error("Generator lieferte kein Ticket für " + gen.skill);
    Spiel.generierte[def.id] = def;
  } else {
    def = Spiel.ticketDef(o.ticketId);
    if (!def) throw new Error("Unbekanntes Ticket: " + o.ticketId);
  }
  /* Flow-Regler (§ 20 F6): Stand der Hauptfertigkeit festhalten; Generiertes kommt eine Nummer kleiner bzw. größer.
     Quellen OHNE Regler: Prüfung und Tagesrätsel (eigene Wege) und der KLASSENRAUM. Dessen Auftrag muss allein aus
     (Code, Seed) entstehen – der Flow-Stand gehört dem EINZELNEN Gerät (Lern-Geschichte, flow.js:46-52) und machte
     sonst denselben Code je Gerät zu einem anderen Auftrag: gemessen (lab.vlan, Seed 5) „gen-lab.vlan-5“ /
     „-geruest“ / „-verwicklung“ (Fahrplan § 2.4, Test Nr. 41 in tests/klassenraum-determinismus.test.js).
     `ohneFlow: true` bleibt zusätzlich möglich, für die Quelle „klassenraum“ ist es nicht mehr nötig. */
  const ohneRegler = o.quelle === "pruefung" || o.quelle === "raetsel" || o.quelle === "klassenraum";
  const flow = Spiel.flow && !o.ohneFlow && !ohneRegler ? Spiel.flow.fuer(def) : null;
  if (flow && gen) { const anders = Spiel.flow.anpassen(gen, def, flow); if (anders && anders.def) { gen = anders.gen; def = anders.def; } }
  const seed = o.seed ?? (gen ? gen.seed : Spiel.neuerSeed(def.id));
  /* P2 „Auftragsvielfalt“: Ein NEUER Handauftrag bekommt Netz und Fehlerstelle aus seinem Instanz-Seed –
     die Definition wird dafür je (id, seed) gebaut und gemerkt. Kann sie das nicht (z. B. eine handgeschriebene
     Lösung mit fester Adresse), bleibt vielfalt false und das Netz ist wie bisher das feste aus vSeed. */
  let vielfalt = false;
  if (!gen && typeof def.fuerSeed === "function") {
    const jeSeed = def.fuerSeed(seed);
    if (jeSeed && jeSeed !== def) { def = jeSeed; vielfalt = true; }
  }
  const netz = Spiel.startNetz(def, seed);
  const inst = {
    iid: "i" + (st.naechsteIid++), ticketId: def.id, seed, netz, vielfalt,
    hilfeStufe: 0, hilfen: [], start: jetzt(), frist: typeof o.frist === "number" ? o.frist : null,
    quelle: o.quelle || "postfach", kunde: o.kunde || def.kunde || null,
    gelesen: false, ab: typeof o.ab === "number" ? o.ab : null,
    zeitMs: 0, basis: null, gen, leiter: {}, fortschritt: null, flow,
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

/* Sichtbare Tickets, sortiert: Fristen zuerst (früheste oben), dann – nach zwei gleichen Formen in Folge – die anderen Formen
   vor der gesperrten (der Hub schlägt sie so nie als nächstes vor), dann Ungelesenes, dann nach Eingang.
   „training" ist seit der Hilfestellung (07.10.2026) die dritte unsichtbare Quelle: Trainingsinstanzen liegen
   im Spielstand (damit Spiel.oeffnen sie findet), gehören aber nicht ins Postfach und zählen nicht als offen –
   verbindlich: docs/entwicklung/Hilfestellung – Stufen und Schnittstellen.md § 6.
   „klassenraum" ist seit dem 2.0-Fundament die vierte unsichtbare Quelle (Entscheidung E1, Fahrplan § 7):
   ein Auftrag aus einem Lehrercode liegt ebenfalls in st.postfach – Spiel.instanz und Spiel.oeffnen finden ihn –,
   gehört aber nicht in die sichtbare Liste und nicht in die Zähler. Die Flow-Regel bleibt unberührt: `ohneRegler`
   in instanzErstellen schließt die Quelle bereits ein. */
Spiel.postfach = function(){
  const t = jetzt();
  const sperre = Spiel.mischer ? Spiel.mischer.gesperrt(Spiel.formVerlauf()) : null;
  const gesperrt = i => sperre && Spiel.formVon(Spiel.defVon(i)) === sperre ? 1 : 0;
  return Spiel.st.postfach.filter(i => !(i.ab && i.ab > t) && i.quelle !== "pruefung" && i.quelle !== "raetsel" && i.quelle !== "training" && i.quelle !== "klassenraum").slice().sort((a, b) => {
    const fa = a.frist ?? Infinity, fb = b.frist ?? Infinity;
    if (fa !== fb) return fa - fb;
    if ((a.kuratiert || 99) !== (b.kuratiert || 99)) return (a.kuratiert || 99) - (b.kuratiert || 99);     /* erste Stunde: Folge vorn */
    if (sperre && gesperrt(a) !== gesperrt(b)) return gesperrt(a) - gesperrt(b);
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
  /* Erste Stunde (§ 20 F3): die nächsten zwei Schritte der gestalteten Folge statt Mischer und Geschichtsreihe */
  if (Spiel.ersteStunde && Spiel.ersteStunde.aktiv()) {
    neu.push(...Spiel.ersteStunde.auffuellen());
    if (Spiel.ersteStunde.aktiv() && Spiel.postfach().length) return neu;
  }
  const regulaer = () => st.postfach.filter(i => i.quelle === "postfach" || i.quelle === "generiert").length;
  const imPostfach = new Set(st.postfach.map(i => i.ticketId));
  const kandidaten = Spiel.ticketReihe().filter(t => (t.karriere || 1) <= st.stufe && !Spiel.istErledigt(t.id) && !imPostfach.has(t.id));
  const ziel = Spiel.postfachZiel(), wahl = ziel === Spiel.POSTFACH_WAHL;
  /* Nach der ersten Wahl: Postfach als Wahl – verschiedene Formen und Kunden (Mischer, E1) */
  if (!wahl && Spiel.mischer && regulaer() < ziel) {
    const offen = st.postfach.filter(i => i.quelle === "postfach" || i.quelle === "generiert").map(i => ({form: Spiel.formVon(Spiel.defVon(i)), kunde: i.kunde, story: !i.gen}));
    const auswahl = Spiel.mischer.waehlen({kandidaten: Spiel.mischer.kandidaten(st), offen, verlauf: Spiel.formVerlauf(), n: ziel - regulaer(), z: Zufall(Spiel.neuerSeed("mischer"))});
    const niveau = Spiel.einst.wahl === "auto" ? undefined : Spiel.einst.wahl;
    for (const k of auswahl) {
      try {
        if (k.ticketId) neu.push(Spiel.instanzErstellen({ticketId: k.ticketId, quelle: "postfach"}));
        else {
          /* selten findet ein Form-Generator für einen Seed keinen passenden Fehler (z. B. Fernwartung beim Schreibbüro ~0,6 %) – dann ein anderer Seed */
          let inst = null, fehler = null;
          for (let v = 0; v < 3 && !inst; v++) {
            try { inst = Spiel.instanzErstellen({gen: {form: k.form, seed: Spiel.neuerSeed(k.schluessel + (v ? ":" + v : "")), opts: Object.assign({stufe: niveau}, k.gen.opts)}, quelle: "generiert"}); }
            catch (e) { fehler = e; }
          }
          if (!inst) throw fehler;
          neu.push(inst);
        }
      } catch (e) { typeof console !== "undefined" && console.error("Mischer", k.schluessel, e); }
    }
  }
  while (kandidaten.length && regulaer() < ziel) {
    /* in der Wahl-Phase zuerst einen Kunden, der noch nicht im Postfach steht */
    const kunden = new Set(st.postfach.filter(i => i.quelle === "postfach" || i.quelle === "generiert").map(i => i.kunde));
    const i = wahl ? Math.max(0, kandidaten.findIndex(t => !kunden.has(t.kunde))) : 0;
    const [t] = kandidaten.splice(i, 1);
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
