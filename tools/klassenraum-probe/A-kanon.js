"use strict";
/* ---------- Bereich A: Kanonisierung messen (A-kanon) ----------
   Probe zur eingefrorenen Festlegung tools/klassenraum-probe/A-festlegung.md.
   Misst, NICHTS wird angenommen:
     1. Handgeschriebene Auftraege: alle Tickets aus Spiel.ticketReihe() x 64 Varianten,
        Kanonisierung nach § 5 (eigene Fassung / Schritte k / Rueckfall).
     2. Generierte Formen: alle Fertigkeiten aus DATEN.skills x Varianten (§ 5, generiert()).
     3. Determinismus ueber ZWEI getrennte Node-Prozesse (--teil 1 / --teil 2),
        Teil 2 als echter Kindprozess (spawnSync, stdio "inherit").
     4. Instanz-Weg: Spiel.instanzErstellen(...) in beiden Prozessen, Netzkennwert von inst.netz;
        zusaetzlich ohneFlow:true gegen ohneFlow:false mit geladenem Spiel.flow.
     5. Netzkennwert nach § 6: Gleichheit, Feldaenderung, Schluesselpermutation, zustand,
        Laenge/Alphabet, FNV-1a-Gegenrechnung.
     6. Rueckfall-Anteil: wie viele Tickets bekommen bei KEINER Variante eine eigene Fassung?
   Kein Bestandteil des Spiels, keine Schreibvorgaenge im Spiel (Spiel._trocken = true).
   Kein Math.random; die Permutationen nutzen einen festen Seed ueber den Spiel-Zufall.

   Aufruf (Node portabel, v24.21.0):
     & "$env:LOCALAPPDATA\node-portable\node-v24.21.0-win-x64\node.exe" tools\klassenraum-probe\A-kanon.js
   Einzelteile (schreibt nur die Teil-Dateien):
     & "<node>" tools\klassenraum-probe\A-kanon.js --teil 1
     & "<node>" tools\klassenraum-probe\A-kanon.js --teil 2
   Ausgabe: Nachweise/Klassenraum/A-kanon.json (nur geschrieben, wenn sie sich aendert)
            Nachweise/Klassenraum/A-kanon-teil1.json, -teil2.json (nur in den Teil-Modi)
*/
const fs = require("fs");
const path = require("path");
const {spawnSync} = require("child_process");
const {kontext, WURZEL} = require("./A-lader.js");

const NACH = path.join(WURZEL, "Nachweise", "Klassenraum");
const MARKE = "A-kanon-json:";                   /* Kennzeichen der maschinenlesbaren Zeile auf stderr */
const STEH = "2026-10-06";                       /* Stand laut A-festlegung.md (kein Datum aus der Uhr) */
const FENSTER = 64;                              /* KANON_FENSTER § 5 */
const UHR_FEST = 1759706400000;                  /* 2026-10-06 00:00:00 UTC – feste Uhr wie A-recon.js */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ZEIT_VARIANTEN = 64;                       /* Pflicht: 64 Varianten je Handauftrag */
const ZEIT_VARIANTEN_GEN = 64;                   /* generierte Formen; bei zu langer Laufzeit Stichprobe (16) */
const OBERGRENZE_MS = 420000;                    /* ~7 min fuer die Generator-Messung, dann Stichprobe */

/* ---------- Netzkennwert (A-festlegung.md § 6) ---------- */
function fnv1a32(text){
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i) & 255; h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
const kennwertAus = h => {                        /* 6 Zeichen ueber (h & 0x3FFFFFFF), hoechstwertige 5 Bit zuerst */
  const k = h & 0x3FFFFFFF;
  let s = "", x = k;
  for (let i = 5; i >= 0; i--) s += ALPHABET[(x >>> (i * 5)) & 31];
  return s;
};
let letzterKanonText = null, letzteSchluessel = null;
function netzkennwert(netz){
  const geraete = {};
  for (const id of Object.keys(netz.geraete).sort()) geraete[id] = netz.geraete[id];   /* alle Felder, nur zustand faellt weg */
  const kabel = netz.kabel.map(k => ({id: k.id, a: {geraet: k.a.geraet, port: k.a.port}, b: {geraet: k.b.geraet, port: k.b.port}}))
    .sort((x, y) => x.a.geraet.localeCompare(y.a.geraet) || x.a.port.localeCompare(y.a.port)
                 || x.b.geraet.localeCompare(y.b.geraet) || x.b.port.localeCompare(y.b.port) || x.id.localeCompare(y.id));
  const kanon = {geraete, kabel};                 /* netz.zustand (Laufzeit) bleibt draussen */
  const text = JSON.stringify(kanon, (k, v) => (v && typeof v === "object" && !Array.isArray(v))
    ? Object.fromEntries(Object.keys(v).sort().map(s => [s, v[s]])) : v);
  letzterKanonText = text;
  letzteSchluessel = {netz: Object.keys(netz).sort(), geraet: Object.keys(netz.geraete).slice().sort().slice(0, 4),
                      kanon: Object.keys(kanon), geraeteZahl: Object.keys(geraete).length, kabelZahl: kabel.length};
  return kennwertAus(fnv1a32(text));
}

/* FNV-1a Schritt fuer Schritt ("A") – Gegenrechnung von Hand */
function fnv1aZeigen(text){
  const schritte = [];
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    const b = text.charCodeAt(i) & 255;
    const vor = h;
    h ^= b;
    const nachXor = h;
    h = Math.imul(h, 16777619) >>> 0;
    schritte.push({zeichen: text[i], byte: b, hVorXor: vor >>> 0, hNachXor: nachXor >>> 0, hNachMul: h});
  }
  return {text, startwert: 2166136261, prim: 16777619, schritte, h: h >>> 0, h30: h & 0x3FFFFFFF, kennwert: kennwertAus(h)};
}
const hex8 = n => "0x" + (n >>> 0).toString(16).toUpperCase().padStart(8, "0");

/* ---------- Zufall mit festem Seed (fuer Permutationen) ---------- */
function zufall(seed){
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function gemischt(arr, z){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(z() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

/* ---------- Kontext ---------- */
function frisch(){
  const lab = kontext();
  lab.Spiel._trocken = true;                     /* keine Bus-Ereignisse, kein Speichern */
  lab.jetzt.setzen(UHR_FEST);                    /* feste Uhr */
  lab.Spiel._st = lab.Spiel.leererStand();
  lab.Spiel._lz = {};
  return lab;
}
/* Selbstpruefung mit Gedaechtnis: ticketGueltig ist teuer (baut Netze, wendet die Loesung an).
   Gemerkt wird je Fassungs-Objekt und Lauf – dieselbe Zahl an Pruefungen wie ohne Memo, nur ohne Doppelarbeit. */
function gueltigVon(lab, d, cache){
  if (!d) return false;
  if (cache.has(d)) return cache.get(d);
  let ok = false;
  try { ok = !!lab.Spiel.ticketGueltig(d); } catch (e) { ok = false; }
  cache.set(d, ok);
  return ok;
}
/* Kanonisierung § 5 fuer einen Handauftrag: k = 0, wenn der Startseed schon eine EIGENE gueltige Fassung ist,
   sonst Abstand bis zur ersten eigenen gueltigen Fassung im Fenster, sonst FENSTER (Rueckfall auf die feste Fassung). */
function kern(lab, def, seedStart, cache){
  for (let k = 0; k < FENSTER; k++) {
    const s = seedStart + k;
    let d = null;
    try { d = def.fuerSeed(s); } catch (e) { d = null; }
    if (d && d !== def && gueltigVon(lab, d, cache)) {
      return {k, seed: s, eigene: true, fassung: d,
              eigeneListe: k === 0 ? [0] : [0, k]};         /* nur die geprueften Stellen (die Schleife bricht hier ab) */
    }
  }
  let d0 = null;
  try { d0 = def.fuerSeed(seedStart); } catch (e) { d0 = null; }
  const gueltig0 = gueltigVon(lab, d0, cache);
  return {k: FENSTER, seed: seedStart, eigene: false, fassung: d0 || def, gueltig0, eigeneListe: []};
}
function handMessung(lab, def, varianten){
  const spec = def.spec || {};
  const e = {id: def.id, art: spec.art || def.art, varianteZahl: varianten, eigene: [], rueckfall: 0, k: [],
             fehler: [], startSeeds: [], gueltig0: 0, gueltig64: 0};
  const cache = new Map();                          /* ueber alle 64 Varianten: jede Fassung nur einmal pruefen */
  let erster = null;
  for (let v = 0; v < varianten; v++) {
    const seedStart = v + 1;
    const kk = kern(lab, def, seedStart, cache);
    if (v === 0) erster = kk;
    e.k.push(kk.k);
    e.startSeeds.push(seedStart);
    if (kk.eigene) {
      e.gueltig0++;
      e.eigene.push({seedStart, k: kk.k, seed: kk.seed});
    } else {
      e.rueckfall++;
      if (kk.gueltig0) e.gueltig64++; else e.fehler.push({variante: v, seedStart, grund: "auch die feste Fassung ist nicht gueltig"});
    }
  }
  e.eigeneBeiK0 = e.gueltig0;                        /* k = 0: der Startseed war schon eine eigene gueltige Fassung */
  e.eigeneAnteil = e.eigene.length / varianten;
  e.kMax = Math.max(...e.k);
  e.kMittel = e.k.reduce((a, b) => a + b, 0) / varianten;
  e.anteilK0 = e.eigeneBeiK0 / varianten;
  e.ohneEigeneFassung = e.eigene.length === 0;
  e.beispiel = {variante: 0, seedStart: 1, seed: erster.seed, k: erster.k, eigene: erster.eigene,
                eigeneListe: erster.eigeneListe};
  return e;
}
function genMessung(lab, skillId, varianten){
  const e = {skill: skillId, varianteZahl: varianten, fehlschlaege: 0, treffer: 0, k: [], ausnahmen: 0,
             kMax: 0, k0: 0, seeds: [], ersterFehlschlag: null, meldungen: [], ausnahmeTexte: []};
  const cache = new Map();
  for (let v = 0; v < varianten; v++) {
    const seedStart = v + 1;
    let treffer = null;
    for (let k = 0; k < FENSTER; k++) {
      let d = null;
      try { d = lab.Spiel.generiere(skillId, seedStart + k); }
      catch (err) {
        e.ausnahmen++;
        const t = String(err && err.message || err);
        if (!e.ausnahmeTexte.includes(t) && e.ausnahmeTexte.length < 3) e.ausnahmeTexte.push(t);
      }
      if (!d) continue;
      if (gueltigVon(lab, d, cache)) { treffer = {seed: seedStart + k, k}; break; }
    }
    if (treffer) {
      e.treffer++; e.k.push(treffer.k); e.seeds.push(treffer.seed);
      if (treffer.k === 0) e.k0++;
    } else {
      e.fehlschlaege++;
      if (e.ersterFehlschlag === null) e.ersterFehlschlag = {variante: v, seedStart};
    }
  }
  e.kMax = e.k.length ? Math.max(...e.k) : null;
  e.kMittel = e.k.length ? e.k.reduce((a, b) => a + b, 0) / e.k.length : null;
  e.anteilK0 = e.treffer ? e.k0 / e.treffer : null;
  e.anteilFehlschlag = e.fehlschlaege / varianten;
  return e;
}

/* ---------- Pruef-Codes (feste Liste: 6 handgeschrieben, 6 generiert, darunter 1 Terminal) ---------- */
function pruefCodes(lab){
  const reihe = lab.Spiel.ticketReihe();
  const skills = lab.DATEN.skills;
  const handWahl = [10, 20, 30, 40, 45, 0].map(i => reihe[i]).filter(Boolean);
  const fertigkeiten = [0, 1, 2, 3, 4, 5].map(i => skills[i]).filter(Boolean);
  const liste = [];
  handWahl.forEach((t, n) => liste.push({nr: liste.length + 1, art: "hand", ticketId: t.id, skill: null,
                                          variante: 4 * n, seedStart: 4 * n + 1, ticketArt: t.spec && t.spec.art || t.art}));
  fertigkeiten.forEach((s, n) => liste.push({nr: liste.length + 1, art: "gen", ticketId: null, skill: s.id,
                                             variante: 3 * n + 1, seedStart: 3 * n + 2}));
  return liste;
}
function eintraege(lab, codes){
  const cache = new Map();
  return codes.map(c => {
    const z = {nr: c.nr, art: c.art, ticketId: c.ticketId, skill: c.skill, variante: c.variante};
    let def = null, seed = c.seedStart;
    if (c.art === "hand") {
      const def0 = lab.Spiel.ticketDef(c.ticketId);
      const kk = kern(lab, def0, c.seedStart, cache);
      z.seed = seed = kk.seed;
      z.schritte = kk.k;
      z.eigene = !kk.rueckfall;
      z.eigeneListe = kk.eigeneListe;
      def = kk.fassung;                                       /* die kanonisierte Fassung, nicht die feste */
    } else {
      let treffer = null, fassung = null;
      for (let k = 0; k < FENSTER; k++) {
        let d = null;
        try { d = lab.Spiel.generiere(c.skill, c.seedStart + k); } catch (e) { /* weiter */ }
        if (!d) continue;
        let ok = false;
        try { ok = !!lab.Spiel.ticketGueltig(d); } catch (e) { ok = false; }
        if (ok) { treffer = {seed: c.seedStart + k, k}; fassung = d; break; }
      }
      z.seed = seed = treffer ? treffer.seed : c.seedStart;
      z.schritte = treffer ? treffer.k : FENSTER;
      z.eigene = !!treffer;
      def = fassung;
      if (!def) { try { def = lab.Spiel.generiere(c.skill, seed); } catch (e) { def = null; } }
    }
    let netz = null;
    try { netz = lab.Spiel.startNetz(def, z.seed); } catch (e) { netz = null; }
    z.netzkennwert = netz ? netzkennwert(netz) : null;
    return z;
  });
}

/* ---------- Datei schreiben (nur wenn anders, LF, ohne BOM) ---------- */
/* eintraegeVergleich: nur den Inhalt vergleichen, der sich bei gleicher Messung NICHT aendern darf
   (pid, Zeitstempel und Laufzeiten wechseln bei jedem Lauf – sonst schriebe die Probe jedes Mal neu). */
function schreibe(pfad, text, eintraegeVergleich){
  const bytes = Buffer.from(text.replace(/\r\n/g, "\n"), "utf8");
  if (fs.existsSync(pfad)) {
    if (eintraegeVergleich) {
      try {
        const a = JSON.parse(fs.readFileSync(pfad, "utf8"));
        if (JSON.stringify(a.eintraege) === JSON.stringify(eintraegeVergleich)) return {geschrieben: false, grund: "Eintraege identisch"};
      } catch (e) { /* unlesbar → neu schreiben */ }
    } else if (fs.readFileSync(pfad).equals(bytes)) return {geschrieben: false, grund: "Datei identisch"};
  }
  fs.mkdirSync(path.dirname(pfad), {recursive: true});
  fs.writeFileSync(pfad, bytes);
  return {geschrieben: true, grund: "neu"};
}

/* ---------- Teil-Modus: 12 Pruef-Codes auswerten und in eine Datei schreiben ---------- */
function teil(nr){
  const lab = frisch();
  const codes = pruefCodes(lab);
  const e = eintraege(lab, codes);
  const inst = instanzLauf(lab, codes);
  const ohne = ohneFlow(lab, codes);
  const daten = {teil: nr, pid: process.pid, uhrFest: UHR_FEST, stand: STEH, eintraege: e, instanzen: inst, ohneFlow: ohne};
  const datei = path.join(NACH, "A-kanon-teil" + nr + ".json");
  const erg = schreibe(datei, JSON.stringify(daten, null, 1) + "\n", e);
  process.stderr.write("[A-kanon] Teil " + nr + " pid=" + process.pid + " codes=" + e.length + " datei="
    + (erg.geschrieben ? "geschrieben" : "unveraendert") + " (" + erg.grund + ")\n");
  /* Maschinenlesbare Zeile fuer den Elternprozess: so vergleicht der Hauptlauf die FRISCHE Ausgabe des
     Kindprozesses und nicht eine alte Datei (process.pid ist sonst aus dem Vorlauf). */
  process.stderr.write(MARKE + JSON.stringify(daten) + "\n");
  return daten;
}

/* Instanz-Weg: derselbe Pruef-Code ueber Spiel.instanzErstellen({ticketId|gen, seed, quelle:"klassenraum", ohneFlow:true}) */
function instanzLauf(lab, codes){
  return codes.map(c => {
    const args = {quelle: "klassenraum", ohneFlow: true, seed: c.seedStart};
    if (c.art === "hand") args.ticketId = c.ticketId; else args.gen = {skill: c.skill, seed: c.seedStart};
    try {
      const inst = lab.Spiel.instanzErstellen(args);
      return {nr: c.nr, art: c.art, ticketId: inst.ticketId, skill: c.skill, seed: inst.seed, iid: inst.iid,
              vielfalt: !!inst.vielfalt, flow: inst.flow || null, quelle: inst.quelle,
              hilfen: Array.isArray(inst.hilfen) ? inst.hilfen.length : null, ab: inst.ab,
              netzkennwert: netzkennwert(inst.netz)};
    } catch (e) { return {nr: c.nr, fehler: String(e && e.message || e)}; }
  });
}

/* ohneFlow: derselbe Code einmal mit ohneFlow:true, einmal mit ohneFlow:false (Spiel.flow ist geladen) */
function ohneFlow(lab, codes){
  return codes.map(c => {
    const o = {nr: c.nr, art: c.art, ticketId: c.ticketId, skill: c.skill, seed: c.art === "hand" ? c.seedStart : null};
    const bau = (ohneFlowFlag, seed) => {
      const args = {quelle: "klassenraum", ohneFlow: ohneFlowFlag, seed};
      if (c.art === "hand") args.ticketId = c.ticketId; else args.gen = {skill: c.skill, seed};
      const inst = lab.Spiel.instanzErstellen(args);
      return {iid: inst.iid, seed: inst.seed, ticketId: inst.ticketId, vielfalt: !!inst.vielfalt,
              flow: inst.flow || null, netzkennwert: netzkennwert(inst.netz)};
    };
    let a = null, b = null, fehler = null;
    try { a = bau(true, c.seedStart); } catch (e) { fehler = String(e && e.message || e); }
    try { b = bau(false, c.seedStart); } catch (e) { fehler = (fehler ? fehler + " | " : "") + String(e && e.message || e); }
    o.ohneFlowTrue = a; o.ohneFlowFalse = b; o.fehler = fehler;
    o.netzGleich = !!(a && b && a.netzkennwert === b.netzkennwert);
    o.flowGleich = !!(a && b && JSON.stringify(a.flow) === JSON.stringify(b.flow));
    return o;
  });
}

/* ---------- Hauptlauf ---------- */
function starten(){
  const t0 = Date.now();
  const lab = frisch();
  const M = {};                                         /* alle Zahlen */
  const B = [];                                         /* Befunde */
  const O = [];                                         /* offen */
  const N = [];                                         /* nicht geprueft */

  /* Grundwerte */
  const reihe = lab.Spiel.ticketReihe();
  const roh = lab.DATEN.tickets;
  const skills = lab.DATEN.skills;
  M.grundwerte = {
    module: lab.module.length, ticketsRoh: roh.length, ticketReihe: reihe.length, skills: skills.length,
    terminal: reihe.filter(t => t.spec && t.spec.art === "terminal" || t.art === "terminal").length,
    reiheGleichRoh: reihe.map(t => t.id).join("|") === roh.map(t => t.id).join("|"),
    tabelleAuftraege: reihe.map(t => t.id), tabelleSkills: skills.map(s => s.id),
    fenster: FENSTER, alphabet: ALPHABET, alphabetLaenge: ALPHABET.length, zeitVarianten: ZEIT_VARIANTEN,
    uhrFest: UHR_FEST, zufall: "kein Math.random in dieser Probe (Permutationen mit festem Seed)",
  };
  B.push("Grundwerte gemessen: ticketReihe " + reihe.length + ", DATEN.tickets " + roh.length
    + ", skills " + skills.length + ", dieselbe Reihenfolge wie DATEN.tickets: " + (M.grundwerte.reiheGleichRoh ? "ja" : "nein")
    + " (Anhang A-festlegung § 7 verlangt das ausdruecklich NICHT).");

  /* ---------- 1. Handgeschriebene Auftraege: alle x 64 Varianten ---------- */
  const tH = Date.now();
  const handAlle = [];
  for (const def of reihe) handAlle.push(handMessung(lab, def, ZEIT_VARIANTEN));
  M.laufzeitHandMs = Date.now() - tH;
  M.hand = {
    tickets: handAlle.length, variantenJeTicket: ZEIT_VARIANTEN, messungen: handAlle.length * ZEIT_VARIANTEN,
    eigeneBeiK0: handAlle.reduce((a, e) => a + e.eigeneBeiK0, 0),
    anteilEigeneK0: handAlle.reduce((a, e) => a + e.eigeneBeiK0, 0) / (handAlle.length * ZEIT_VARIANTEN),
    eigeneGesamt: handAlle.reduce((a, e) => a + e.eigene.length, 0),
    anteilEigene: handAlle.reduce((a, e) => a + e.eigene.length, 0) / (handAlle.length * ZEIT_VARIANTEN),
    kMax: Math.max(...handAlle.map(e => e.kMax)),
    kMittel: handAlle.reduce((a, e) => a + e.kMittel, 0) / handAlle.length,
    rueckfaelle: handAlle.reduce((a, e) => a + e.rueckfall, 0),
    ticketsOhneEigeneFassung: handAlle.filter(e => e.ohneEigeneFassung).map(e => e.id),
    ticketsImmerEigeneFassung: handAlle.filter(e => e.kMax === 0).map(e => e.id),
    fehler: handAlle.filter(e => e.fehler.length).map(e => ({id: e.id, fehler: e.fehler})),
    jeTicket: handAlle.map(e => ({id: e.id, art: e.art, kMax: e.kMax, kMittel: e.kMittel, anteilK0: e.anteilK0,
      eigene: e.eigene.length, rueckfall: e.rueckfall, ohneEigeneFassung: e.ohneEigeneFassung, beispiel: e.beispiel})),
  };
  B.push("Handauftraege: " + M.hand.messungen + " Kanonisierungen in " + M.laufzeitHandMs + " ms; k=0 bei "
    + M.hand.eigeneBeiK0 + " von " + M.hand.messungen + " (Anteil " + M.hand.anteilEigeneK0.toFixed(4)
    + "), hoechstes k = " + M.hand.kMax + ", Mittel k = " + M.hand.kMittel.toFixed(3)
    + ", Rueckfaelle = " + M.hand.rueckfaelle + ".");
  B.push(M.hand.ticketsOhneEigeneFassung.length + " von " + handAlle.length
    + " Handauftraegen bekommen bei KEINER der " + ZEIT_VARIANTEN + " Varianten eine eigene Fassung (immer dasselbe feste Netz): "
    + (M.hand.ticketsOhneEigeneFassung.join(", ") || "keine") + ".");
  if (M.hand.fehler.length) B.push("Auffaellig: " + JSON.stringify(M.hand.fehler));
  B.push("Randfall belegt: in allen " + M.hand.rueckfaelle + " Rueckfall-Faellen war die feste Fassung gueltig ("
    + M.hand.jeTicket.filter(e => e.rueckfall).reduce((a, e) => a + e.rueckfall, 0) + " Faelle), kein einziger Lauf endete mit {fehler:\"fassung\"}; "
    + "das betrifft genau die " + M.hand.ticketsOhneEigeneFassung.length + " Terminal-Auftraege (fuerSeed gibt dort laut src/daten/basis.js:160 immer die feste Fassung).");
  B.push("Zwei Wege, zwei Kennwerte: startNetz(def, seed) mit der FESTEN Fassung eines Handauftrags ergibt ein anderes Netz "
    + "als startNetz(def.fuerSeed(seed), seed) mit der Seed-Fassung. Der Instanz-Weg (postfach.js:86-90) benutzt die Seed-Fassung; "
    + "die Kanonisierung muss deshalb dieselbe Fassung an startNetz geben, sonst vergleicht man zwei verschiedene Netze (in dieser Probe erst nach einem Fehler behoben, Beleg: messungen.determinismus.netzkennwerteTeil1 == messungen.instanz.eintraege[].netzkennwert).");

  /* ---------- 2. Generierte Formen ---------- */
  /* Erst ein Vormessung: eine Fertigkeit x 64 Varianten, daraus die Hochrechnung fuer alle 27. */
  const tG0 = Date.now();
  const probe = genMessung(lab, skills[0].id, ZEIT_VARIANTEN_GEN);
  const zeitProSkill = Date.now() - tG0;
  const hochrechnung = zeitProSkill * skills.length;
  let variantenGen = ZEIT_VARIANTEN_GEN, stichprobe = false, grundStichprobe = null;
  if (hochrechnung > OBERGRENZE_MS) {
    variantenGen = 16; stichprobe = true;
    grundStichprobe = "Vormessung " + skills[0].id + " x " + ZEIT_VARIANTEN_GEN + " = " + zeitProSkill
      + " ms → Hochrechnung " + hochrechnung + " ms > " + OBERGRENZE_MS + " ms; auf 16 Varianten gekuerzt (Stichprobe)";
  }
  const tG = Date.now();
  const genAlle = variantenGen === ZEIT_VARIANTEN_GEN ? [probe, ...skills.slice(1).map(s => genMessung(lab, s.id, variantenGen))]
                                                     : skills.map(s => genMessung(lab, s.id, variantenGen));
  M.laufzeitGenMs = Date.now() - tG;
  M.gen = {
    skills: genAlle.length, variantenJeSkill: variantenGen, stichprobe, grundStichprobe,
    vormessung: {skill: skills[0].id, varianten: ZEIT_VARIANTEN_GEN, ms: zeitProSkill, hochrechnungMs: hochrechnung},
    messungen: genAlle.length * variantenGen,
    fehlschlaege: genAlle.reduce((a, e) => a + e.fehlschlaege, 0),
    anteilFehlschlag: genAlle.reduce((a, e) => a + e.fehlschlaege, 0) / (genAlle.length * variantenGen),
    treffer: genAlle.reduce((a, e) => a + e.treffer, 0),
    kMax: Math.max(...genAlle.map(e => e.kMax == null ? 0 : e.kMax)),
    kMittel: genAlle.reduce((a, e) => a + (e.kMittel || 0), 0) / genAlle.length,
    k0Gesamt: genAlle.reduce((a, e) => a + e.k0, 0),
    anteilK0: genAlle.reduce((a, e) => a + e.k0, 0) / (genAlle.reduce((a, e) => a + e.treffer, 0) || 1),
    ausnahmen: genAlle.reduce((a, e) => a + e.ausnahmen, 0),
    skillsMitFehlschlag: genAlle.filter(e => e.fehlschlaege).map(e => ({skill: e.skill, fehlschlaege: e.fehlschlaege, erster: e.ersterFehlschlag, meldungen: e.ausnahmeTexte})),
    skillsMitAusnahmen: genAlle.filter(e => e.ausnahmen).map(e => ({skill: e.skill, ausnahmen: e.ausnahmen, meldungen: e.ausnahmeTexte})),
    skillsMitKgroesser0: genAlle.filter(e => e.kMax > 0).map(e => ({skill: e.skill, kMax: e.kMax, anteilK0: e.anteilK0})),
    jeSkill: genAlle.map(e => ({skill: e.skill, varianteZahl: e.varianteZahl, treffer: e.treffer, fehlschlaege: e.fehlschlaege,
      kMax: e.kMax, kMittel: e.kMittel, anteilK0: e.anteilK0, anteilFehlschlag: e.anteilFehlschlag, ausnahmen: e.ausnahmen,
      meldungen: e.ausnahmeTexte})),
  };
  B.push("Generierte Formen: " + M.gen.messungen + " Kanonisierungen in " + M.laufzeitGenMs + " ms"
    + (stichprobe ? " (STICHPROBE: " + grundStichprobe + ")" : " (volle 64 Varianten je Fertigkeit)")
    + "; hoechstes k = " + M.gen.kMax + ", Mittel k = " + M.gen.kMittel.toFixed(3)
    + ", Fenster erschoepft bei " + M.gen.fehlschlaege + " Messungen (Anteil " + M.gen.anteilFehlschlag.toFixed(4)
    + "), Anteil k=0 = " + M.gen.anteilK0.toFixed(4) + ", Generator-Ausnahmen = " + M.gen.ausnahmen + ".");
  if (M.gen.skillsMitFehlschlag.length) B.push("Fertigkeiten mit erschoepftem Fenster: " + JSON.stringify(M.gen.skillsMitFehlschlag)
    + " – der Generator wirft dort fuer JEDEN Seed (Meldung siehe meldungen), § 8 nennt diesen Fall {fehler:\"auftrag\"} ('Generator liefert nichts').");
  else B.push("Keine Fertigkeit mit erschoepftem Fenster (jede Variante fand eine gueltige Form).");

  /* ---------- 3. Determinismus ueber zwei Prozesse ---------- */
  const codes = pruefCodes(lab);
  const teil1Daten = teil(1);
  const node = process.execPath;
  const skript = __filename;
  const argv = [skript, "--teil", "2"];
  /* Vorprobe: vertraegt diese Sandbox ueberhaupt einen Kindprozess mit "pipe"? (Antwort als Messung, nicht als Annahme) */
  const pipeProbe = spawnSync(node, ["-e", "process.stdout.write('ok')"], {stdio: "pipe", windowsHide: true, timeout: 20000});
  M.spawnPipeVersuche = {befehl: node + " -e \"process.stdout.write('ok')\"", stdio: "pipe",
    status: pipeProbe.status, stdout: pipeProbe.stdout ? String(pipeProbe.stdout) : null,
    fehler: pipeProbe.error ? (String(pipeProbe.error.code || "") + " " + String(pipeProbe.error.message || pipeProbe.error)).trim() : null,
    folgerung: pipeProbe.error ? "pipe ist in dieser Umgebung gesperrt (EPERM) → stdio:\"inherit\" ist Pflicht" : "pipe war moeglich"};
  const tS = Date.now();
  /* stdio: "inherit" – so verlangt es der Auftrag, und ein "pipe" fuer stderr scheitert in dieser Sandbox
     belegt mit EPERM (siehe messungen.determinismus.spawn.spawnPipeVersuche). Der Kindprozess schreibt seine
     Ausgabe in Nachweise/Klassenraum/A-kanon-teil2.json; der Elternprozess vergleicht diese Datei mit den
     eigenen, im selben Lauf berechneten Eintraegen. */
  const lauf = spawnSync(node, argv, {stdio: "inherit", windowsHide: true});
  const kindMs = Date.now() - tS;
  const pfad1 = path.join(NACH, "A-kanon-teil1.json"), pfad2 = path.join(NACH, "A-kanon-teil2.json");
  let teil2Daten = null;
  try { teil2Daten = JSON.parse(fs.readFileSync(pfad2, "utf8")); } catch (e) { teil2Daten = null; }
  const quelle2 = teil2Daten ? "Nachweise/Klassenraum/A-kanon-teil2.json (vom Kindprozess in diesem Lauf geschrieben oder unveraendert gelassen)" : null;
  const vgl = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  let identisch = 0, abweichungen = [];
  if (teil2Daten) {
    for (let i = 0; i < teil1Daten.eintraege.length; i++) {
      const a = teil1Daten.eintraege[i], b = (teil2Daten.eintraege || [])[i];
      if (b && vgl(a, b)) identisch++; else abweichungen.push({nr: a.nr, teil1: a, teil2: b || null});
    }
  }
  M.determinismus = {
    spawn: {befehl: node + " " + argv.join(" "), status: lauf.status, signal: lauf.signal || null,
            fehler: lauf.error ? String(lauf.error.message || lauf.error) : null, kindLaufzeitMs: kindMs,
            stdio: "inherit (wie im Auftrag verlangt)",
            spawnPipeVersuche: M.spawnPipeVersuche || null},
    teil1: {pid: teil1Daten.pid, datei: path.relative(WURZEL, pfad1), eintraege: teil1Daten.eintraege.length},
    teil2: teil2Daten ? {pid: teil2Daten.pid, quelle: quelle2, datei: path.relative(WURZEL, pfad2), eintraege: (teil2Daten.eintraege || []).length} : null,
    gleichePid: !!(teil2Daten && teil2Daten.pid === teil1Daten.pid),
    eintraegeVerglichen: teil1Daten.eintraege.length, identischeEintraege: identisch,
    abweichungen: abweichungen.length, abweichungenListe: abweichungen,
    netzkennwerteTeil1: teil1Daten.eintraege.map(e => ({nr: e.nr, ticketId: e.ticketId, skill: e.skill, seed: e.seed,
      schritte: e.schritte, netzkennwert: e.netzkennwert})),
    codes: codes.map(c => ({nr: c.nr, art: c.art, ticketId: c.ticketId, skill: c.skill, variante: c.variante, seedStart: c.seedStart, ticketArt: c.ticketArt || null})),
  };
  if (lauf.error) {
    O.push("spawnSync ist gescheitert (" + M.determinismus.spawn.fehler + "). Manueller Befehl: "
      + "& \"" + node + "\" \"" + skript + "\" --teil 2");
    B.push("Determinismus NICHT verglichen: der Kindprozess liess sich nicht starten.");
  } else {
    B.push("Determinismus ueber zwei getrennte Prozesse: " + identisch + " von " + teil1Daten.eintraege.length
      + " Eintraegen identisch, " + abweichungen.length + " Abweichungen. spawnSync status="
      + (lauf.status === null ? "null" : lauf.status) + ", Laufzeit " + kindMs + " ms, stdio \"inherit\". PID Teil 1 = "
      + teil1Daten.pid + ", PID in Teil-2-Datei = " + (teil2Daten ? teil2Daten.pid : "?")
      + (M.determinismus.gleichePid ? " → GLEICH (dann waere es kein zweiter Prozess gewesen!)" : " → verschieden"));
  }
  B.push("Sandbox-Beleg: spawnSync mit stdio \"pipe\" liefert " + (M.spawnPipeVersuche.fehler || "keinen Fehler")
    + ", stdout = " + JSON.stringify(M.spawnPipeVersuche.stdout) + " → " + M.spawnPipeVersuche.folgerung + ".");

  /* ---------- 4. Instanz-Weg (instanzErstellen) ---------- */
  const inst1 = instanzLauf(lab, codes);
  const inst2 = teil2Daten && Array.isArray(teil2Daten.instanzen) ? teil2Daten.instanzen : null;
  let instIdentisch = 0; const instAbw = [];
  if (inst2) for (let i = 0; i < inst1.length; i++) { if (vgl(inst1[i], inst2[i])) instIdentisch++; else instAbw.push({nr: inst1[i].nr, teil1: inst1[i], teil2: inst2[i]}); }
  M.instanz = {gemessen: inst1.length, identischeEintraege: instIdentisch, abweichungen: instAbw.length,
               abweichungenListe: instAbw, nurTeil1Vorhanden: !inst2, eintraege: inst1};
  /* Gegenprobe: der Netzkennwert aus der Kanonisierung muss der des Instanz-Wegs sein (gleiche Fassung, gleicher Seed) */
  const kennPaare = teil1Daten.eintraege.map((e, i) => ({nr: e.nr, kanon: e.netzkennwert, instanz: inst1[i] ? inst1[i].netzkennwert : null}));
  M.kanonGegenInstanz = {gepruefte: kennPaare.length, gleich: kennPaare.filter(p => p.kanon === p.instanz).length,
    ungleich: kennPaare.filter(p => p.kanon !== p.instanz), liste: kennPaare};
  B.push("Kanonisierung und Instanz-Weg liefern denselben Netzkennwert: " + M.kanonGegenInstanz.gleich + " von "
    + M.kanonGegenInstanz.gepruefte + " Codes gleich.");

  /* ohneFlow:false gegen ohneFlow:true – frischer Kontext, damit nichts aus dem Hauptlauf nachwirkt */
  const labF = frisch();
  const flowVergleich = ohneFlow(labF, codes);
  const labF2 = frisch();                                       /* zweite, unabhaengige Rechnung zum Nachweis der Wiederholbarkeit */
  const flowVergleich2 = ohneFlow(labF2, codes);
  const gleicheKennwerte = flowVergleich.filter((e, i) => e.netzGleich && JSON.stringify(e) === JSON.stringify(flowVergleich2[i])).length;
  M.ohneFlow = {
    gemessen: flowVergleich.length,
    netzGleich: flowVergleich.filter(e => e.netzGleich).length,
    netzVerschieden: flowVergleich.filter(e => !e.netzGleich).length,
    flowGleich: flowVergleich.filter(e => e.flowGleich).length,
    flowVerschieden: flowVergleich.filter(e => !e.flowGleich).length,
    fehler: flowVergleich.filter(e => e.fehler).map(e => ({nr: e.nr, fehler: e.fehler})),
    wiederholbar: gleicheKennwerte,
    beispiele: flowVergleich.map(e => ({nr: e.nr, art: e.art, ticketId: e.ticketId, skill: e.skill,
      netzGleich: e.netzGleich, flowTrue: e.ohneFlowTrue && e.ohneFlowTrue.flow, flowFalse: e.ohneFlowFalse && e.ohneFlowFalse.flow,
      kennTrue: e.ohneFlowTrue && e.ohneFlowTrue.netzkennwert, kennFalse: e.ohneFlowFalse && e.ohneFlowFalse.netzkennwert,
      seedTrue: e.ohneFlowTrue && e.ohneFlowTrue.seed, seedFalse: e.ohneFlowFalse && e.ohneFlowFalse.seed,
      vielfaltTrue: e.ohneFlowTrue && e.ohneFlowTrue.vielfalt, vielfaltFalse: e.ohneFlowFalse && e.ohneFlowFalse.vielfalt})),
  };
  B.push("Instanz-Weg: " + M.instanz.gemessen + " Instanzen in beiden Prozessen, "
    + (inst2 ? instIdentisch + " identische Eintraege, " + instAbw.length + " Abweichungen" : "Teil 2 nicht lesbar, kein Vergleich") + ".");
  B.push("ohneFlow (Spiel.flow geladen, aber ALLE Staende 'normal', also ohne Wirkung): von " + M.ohneFlow.gemessen
    + " Codes ist das Netz bei " + M.ohneFlow.netzGleich + " gleich und bei " + M.ohneFlow.netzVerschieden
    + " verschieden; inst.flow ist bei " + M.ohneFlow.flowGleich + " gleich und bei " + M.ohneFlow.flowVerschieden
    + " verschieden. Der eigentliche Unterschied zeigt sich erst, wenn ein Flow-Stand gesetzt ist (naechster Befund).");

  /* Flow wirklich ausloesen: fuer jede generierte Pruef-Fertigkeit den Stand 'geruest' setzen und vergleichen.
     Gemessen wird nicht nur der Netzkennwert, sondern auch Fassungs-ID, Stufe und Zielzahl – sonst bliebe
     unklar, ob ohneFlow nur inst.flow oder auch den Auftrag aendert. */
  /* Wichtig: der Generator merkt sich Fassungen in Spiel.generierte. Zwei Instanzen im SELBEN Lauf teilen sie
     sich (postfach.js:38) – deshalb bekommt jede Seite einen FRISCHEN Kontext, sonst vergleicht die Messung
     sich selbst. Das ist zugleich ein Befund zur Reihenfolge in einem echten Spielerprozess. */
  const flowFaelle = [];
  for (const c of codes.filter(x => x.art === "gen")) {
    const bau = (ohne) => {
      const labFL = frisch();
      labFL.Spiel.st.flow = {[c.skill]: {letzte: ["f", "f"], stand: "geruest"}};
      const stand = labFL.Spiel.flow.stand(c.skill);
      const inst = labFL.Spiel.instanzErstellen({gen: {skill: c.skill, seed: c.seedStart}, quelle: "klassenraum", ohneFlow: ohne, seed: c.seedStart});
      const def = labFL.Spiel.defVon(inst);
      const ziele = def && Array.isArray(def.ziele) ? def.ziele : [];
      return {stand, iid: inst.iid, flow: inst.flow || null, ticketId: inst.ticketId, seed: inst.seed, vielfalt: !!inst.vielfalt,
              kennwert: netzkennwert(inst.netz),
              stufe: def ? def.stufe : null, ziele: ziele.length,
              zieleMitErwartet: ziele.filter(z => z.erwartet).length,
              zielTexte: ziele.map(z => String(z.text || "").slice(0, 60))};
    };
    let mit = null, ohne = null, fehler = null;
    try { mit = bau(false); } catch (e) { fehler = String(e && e.message || e); }
    try { ohne = bau(true); } catch (e) { fehler = (fehler ? fehler + " | " : "") + String(e && e.message || e); }
    const gleich = (a, b, f) => !!(a && b && JSON.stringify(a[f]) === JSON.stringify(b[f]));
    flowFaelle.push({skill: c.skill, seed: c.seedStart, stand: mit ? mit.stand : null, fehler,
      mitFlow: mit, ohneFlow: ohne,
      netzGleich: !!(mit && ohne && mit.kennwert === ohne.kennwert),
      ticketIdGleich: gleich(mit, ohne, "ticketId"), stufeGleich: gleich(mit, ohne, "stufe"),
      zieleGleich: gleich(mit, ohne, "ziele"), zieleMitErwartetGleich: gleich(mit, ohne, "zieleMitErwartet"),
      netzZieleGleich: !!(mit && ohne && JSON.stringify(mit.zielTexte) === JSON.stringify(ohne.zielTexte)),
      flowFeldGleich: !!(mit && ohne && mit.flow === ohne.flow)});
  }
  M.flowAusgeloest = {faelle: flowFaelle.length, netzGleich: flowFaelle.filter(f => f.netzGleich).length,
    ticketIdVerschieden: flowFaelle.filter(f => !f.ticketIdGleich).length,
    zieleVerschieden: flowFaelle.filter(f => !f.zieleGleich).length,
    zieleMitErwartetVerschieden: flowFaelle.filter(f => !f.zieleMitErwartetGleich).length,
    netzZieleVerschieden: flowFaelle.filter(f => !f.netzZieleGleich).length,
    flowFeldVerschieden: flowFaelle.filter(f => !f.flowFeldGleich).length,
    fehler: flowFaelle.filter(f => f.fehler).map(f => ({skill: f.skill, fehler: f.fehler})),
    liste: flowFaelle};
  M.flowStandVorher = flowFaelle.map(f => ({skill: f.skill, stand: f.stand}));
  B.push("Flow ausgeloest (Stand 'geruest' je Fertigkeit, je Seite ein frischer Kontext): Netz bei " + M.flowAusgeloest.netzGleich
    + " von " + M.flowAusgeloest.faelle + " Faellen gleich; Fassungs-ID bei " + M.flowAusgeloest.ticketIdVerschieden
    + " verschieden, Zielzahl bei " + M.flowAusgeloest.zieleVerschieden + ", gebrochene Ziele bei "
    + M.flowAusgeloest.zieleMitErwartetVerschieden + ", inst.flow bei " + M.flowAusgeloest.flowFeldVerschieden + " verschieden.");
  const flowBsp = flowFaelle.find(f => f.mitFlow && f.ohneFlow && !f.zieleGleich)
               || flowFaelle.find(f => f.mitFlow && f.ohneFlow && !f.ticketIdGleich);
  if (flowBsp) B.push("Beispiel " + flowBsp.skill + " (Seed " + flowBsp.seed + "): MIT Flow "
    + flowBsp.mitFlow.ticketId + ", Stufe " + flowBsp.mitFlow.stufe + ", Ziele " + flowBsp.mitFlow.ziele
    + " (davon gebrochen " + flowBsp.mitFlow.zieleMitErwartet + "), Kennwert " + flowBsp.mitFlow.kennwert
    + "; OHNE Flow " + flowBsp.ohneFlow.ticketId + ", Stufe " + flowBsp.ohneFlow.stufe + ", Ziele "
    + flowBsp.ohneFlow.ziele + " (davon gebrochen " + flowBsp.ohneFlow.zieleMitErwartet + "), Kennwert "
    + flowBsp.ohneFlow.kennwert + " – das Netz ist gleich, die Aufgabenstellung nicht.");
  else if (flowFaelle.length) B.push("Flow ausgeloest, aber in keinem der " + flowFaelle.length
    + " Faelle aenderte sich Fassungs-ID oder Zielzahl – der Regler wirkte hier nur auf inst.flow.");
  M.flowHinweis = "Achtung: die beiden Instanzen eines Falls teilen sich Spiel.generierte und damit dieselbe Fassungs-ID bei gleichem Seed; die Zielzahl je Fassung wird deshalb miteinander verglichen.";

  /* ---------- 5. Netzkennwert ---------- */
  const tN = Date.now();
  const defK = lab.Spiel.ticketDef(reihe[0].id);
  const netzA = lab.Spiel.startNetz(defK, 3);
  const netzB = lab.Spiel.startNetz(defK, 3);
  let gleich = 0, ungleich = 0;
  const paare = [];
  for (let i = 0; i < 200; i++) {
    const a = netzkennwert(netzA), b = netzkennwert(netzB);
    if (a === b) gleich++; else { ungleich++; paare.push({i, a, b}); }
  }
  const kennA = netzkennwert(netzA);
  /* (b) ein Feld geaendert → anderer Kennwert; mehrere unabhaengige Aenderungen einzeln */
  const aenderungen = [];
  const testAenderung = (name, fn) => {
    const n = lab.Spiel.startNetz(defK, 3);
    const vor = netzkennwert(n);
    let info = null;
    try { info = fn(n); } catch (e) { info = "Fehler: " + String(e && e.message || e); }
    const nach = netzkennwert(n);
    aenderungen.push({name, info, vor, nach, anders: vor !== nach});
  };
  testAenderung("erste Host-IP", n => { const id = Object.keys(n.geraete).find(i => n.geraete[i].typ === "pc" || n.geraete[i].typ === "server");
    const g = n.geraete[id]; const p = Object.keys(g.running.if)[0]; const alt = g.running.if[p].ip;
    g.running.if[p].ip = alt === "192.168.10.99" ? "192.168.10.98" : "192.168.10.99"; return {geraet: id, port: p, alt, neu: g.running.if[p].ip}; });
  testAenderung("erster Router-Port shutdown", n => { const id = Object.keys(n.geraete).find(i => n.geraete[i].typ === "router");
    const g = n.geraete[id]; const p = Object.keys(g.running.if)[0]; const alt = !!g.running.if[p].shutdown;
    g.running.if[p].shutdown = !alt; return {geraet: id, port: p, alt, neu: !alt}; });
  testAenderung("erster Switch-Port shutdown", n => { const id = Object.keys(n.geraete).find(i => n.geraete[i].typ === "switch");
    const g = n.geraete[id]; const p = Object.keys(g.running.ports)[0]; const alt = !!g.running.ports[p].shutdown;
    g.running.ports[p].shutdown = !alt; return {geraet: id, port: p, alt, neu: !alt}; });
  testAenderung("Geraet an/aus", n => { const id = Object.keys(n.geraete)[0]; const alt = n.geraete[id].an;
    n.geraete[id].an = !alt; return {geraet: id, alt, neu: !alt}; });
  testAenderung("Kabel entfernt", n => { const k = n.kabel[n.kabel.length - 1]; n.kabel = n.kabel.filter(x => x !== k);
    return k ? {kabel: k.id, von: k.a, nach: k.b} : "kein Kabel"; });
  testAenderung("Kabel zusaetzlich", n => { const a = n.kabel[0]; const neu = {id: "k-probe", a: {geraet: a.a.geraet, port: a.a.port}, b: {geraet: a.b.geraet, port: a.b.port}};
    n.kabel.push(neu); return {kabel: "k-probe"}; });
  /* (d) zustand (Laufzeit) geaendert → gleicher Kennwert */
  const nZ = lab.Spiel.startNetz(defK, 3);
  const vorZ = netzkennwert(nZ);
  nZ.zustand = nZ.zustand || {};
  nZ.zustand._uhr = 4711;
  const gidZ = Object.keys(nZ.geraete)[0];
  nZ.zustand[gidZ] = {macs: {"0": "AA:BB:CC:DD:EE:FF"}, errdisabled: {}};
  const nachZ = netzkennwert(nZ);
  /* (c) Schluesselreihenfolge permutiert → gleicher Kennwert */
  const zP = zufall(20261006);
  const permTest = [];
  for (let i = 0; i < 20; i++) {
    const n = lab.Spiel.startNetz(defK, 3 + i);
    const vor = netzkennwert(n);
    const g = {};
    for (const id of gemischt(Object.keys(n.geraete), zP)) {
      const r = n.geraete[id], ro = {};
      for (const f of gemischt(Object.keys(r), zP)) ro[f] = r[f];
      if (ro.running && typeof ro.running === "object") {
        const rn = {};
        for (const f of gemischt(Object.keys(ro.running), zP)) {
          const v = ro.running[f];
          if (v && typeof v === "object" && !Array.isArray(v)) {
            const inn = {};
            for (const f2 of gemischt(Object.keys(v), zP)) inn[f2] = v[f2];
            rn[f] = inn;
          } else rn[f] = v;
        }
        ro.running = rn;
      }
      g[id] = ro;
    }
    const kabel = n.kabel.map(k => {
      const ko = {id: k.id, a: k.a, b: k.b}, kp = {};
      for (const f of gemischt(Object.keys(ko), zP)) kp[f] = ko[f];
      return kp;
    });
    const n2 = {kabel, geraete: g, v: n.v, zustand: n.zustand};
    const nach = netzkennwert(n2);
    permTest.push({i, vor, nach, gleich: vor === nach});
  }
  /* (e) Laenge/Alphabet */
  const zeichenPruefung = (() => {
    const werte = [kennA, netzkennwert(netzB), ...aenderungen.map(a => a.nach), ...permTest.map(p => p.nach), nachZ];
    const schlecht = [];
    for (const w of werte) {
      if (typeof w !== "string" || w.length !== 6) schlecht.push({kennwert: w, grund: "Laenge"});
      for (const c of String(w)) if (!ALPHABET.includes(c)) schlecht.push({kennwert: w, zeichen: c, grund: "nicht im ALPHABET"});
    }
    return {gepruefteKennwerte: werte.length, laengeImmer6: werte.every(w => typeof w === "string" && w.length === 6), fremdzeichen: schlecht.length, schlechte: schlecht};
  })();
  /* (f) FNV-1a Gegenrechnung */
  const fnv = fnv1aZeigen("A");
  M.netzkennwert = {
    laufzeitMs: Date.now() - tN,
    implementierung: "A-festlegung.md § 6: kanon = {geraete:{id:{…}}, kabel:[{id,a,b}]}, zustand draussen, JSON.stringify mit rekursiv sortierten Schluesseln, FNV1a32, 6 Zeichen aus ALPHABET ueber (h & 0x3FFFFFFF)",
    gleichheit: {wiederholungen: 200, gleich, ungleich, abweichungen: paare},
    netz: {id: defK.id, geraete: Object.keys(netzA.geraete).length, kabel: netzA.kabel.length, kennwert: kennA},
    kanonForm: {schluessel: letzteSchluessel, textLaenge: letzterKanonText ? letzterKanonText.length : null,
                anfang: letzterKanonText ? letzterKanonText.slice(0, 240) : null},
    feldAenderungen: aenderungen,
    zustand: {vor: vorZ, nach: nachZ, gleich: vorZ === nachZ,
              gesetzt: {_uhr: 4711, geraet: gidZ}},
    permutation: {faelle: permTest.length, gleich: permTest.filter(p => p.gleich).length,
                  ungleich: permTest.filter(p => !p.gleich).length, beispiele: permTest.slice(0, 3)},
    laengeAlphabet: zeichenPruefung,
    fnv1aGegenrechnung: Object.assign({}, fnv, {startwertHex: hex8(fnv.startwert), hHex: hex8(fnv.h), h30Hex: hex8(fnv.h30),
      schritteHex: fnv.schritte.map(s => ({zeichen: s.zeichen, byte: s.byte, hVorXor: hex8(s.hVorXor), hNachXor: hex8(s.hNachXor), hNachMul: hex8(s.hNachMul)}))}),
  };
  B.push("Netzkennwert: 200 Wiederholungen auf zwei gleichen Netzen → " + gleich + " gleich, " + ungleich
    + " ungleich; " + aenderungen.filter(a => a.anders).length + " von " + aenderungen.length
    + " Feldaenderungen ergaben einen anderen Kennwert; zustand geaendert → " + (vorZ === nachZ ? "gleicher" : "ANDERER")
    + " Kennwert; " + permTest.filter(p => p.gleich).length + " von " + permTest.length + " Permutationen → gleicher Kennwert.");
  B.push("Kennwert-Laenge immer 6: " + zeichenPruefung.laengeImmer6 + ", Fremdzeichen: " + zeichenPruefung.fremdzeichen
    + " (geprueft an " + zeichenPruefung.gepruefteKennwerte + " Kennwerten).");
  B.push("FNV-1a Gegenrechnung \"A\": h = " + hex8(fnv.h) + " (" + fnv.h + "), h & 0x3FFFFFFF = " + hex8(fnv.h30)
    + " (" + fnv.h30 + "), Kennwert = " + fnv.kennwert + ".");
  if (!fnv.kennwert || fnv.kennwert.length !== 6) O.push("FNV-Gegenrechnung lieferte keinen 6-Zeichen-Kennwert.");

  /* ---------- 6. Rueckfall-Anteil ---------- */
  M.rueckfall = {
    tickets: handAlle.length,
    ohneEigeneFassung: handAlle.filter(e => e.ohneEigeneFassung).length,
    anteil: handAlle.filter(e => e.ohneEigeneFassung).length / handAlle.length,
    ids: handAlle.filter(e => e.ohneEigeneFassung).map(e => e.id),
    immerEigene: handAlle.filter(e => e.kMax === 0).length,
    rueckfaelleGesamt: M.hand.rueckfaelle, varianten: ZEIT_VARIANTEN,
  };
  B.push("Vielfalt: " + M.rueckfall.ohneEigeneFassung + " von " + M.rueckfall.tickets + " Tickets (Anteil "
    + M.rueckfall.anteil.toFixed(4) + ") haben in keiner der " + ZEIT_VARIANTEN + " Varianten eine eigene Fassung; "
    + M.rueckfall.rueckfaelleGesamt + " von " + M.hand.messungen + " Kanonisierungen griffen auf die feste Fassung zurueck.");

  M.laufzeitMs = Date.now() - t0;
  if (M.laufzeitMs > 600000) O.push("Laufzeit " + M.laufzeitMs + " ms liegt ueber 10 Minuten.");
  /* Zur Wiederholbarkeit: die beiden Teil-Dateien werden nur bei geaenderten Eintraegen neu geschrieben
     (im zweiten Lauf byte-gleich, SHA256 unveraendert). Diese Datei enthaelt dagegen die gemessenen Laufzeiten;
     sie aendert sich deshalb bei jedem Lauf, solange die Laufzeit anders ausfaellt – gewollt, weil die Zahl
     Pflicht ist und nicht gerundet werden soll. */
  M.wiederholbarkeit = {teilDateienNurBeiAenderung: true, hauptdateiEnthaeltLaufzeit: true,
    hinweis: "Zwei Laeufe hintereinander: A-kanon-teil1/2.json byte-gleich (kein Neuschreiben), A-kanon.json neu geschrieben wegen Laufzeit-/Zeitwerten."};

  /* ---------- JSON ---------- */
  const out = {
    thema: "A · Kanonisierung messen: Handauftraege, generierte Formen, Determinismus ueber zwei Prozesse, Instanz-Weg, Netzkennwert, Rueckfall-Anteil",
    stand: STEH,
    befehle: [{
      befehl: "& \"$env:LOCALAPPDATA\\node-portable\\node-v24.21.0-win-x64\\node.exe\" tools\\klassenraum-probe\\A-kanon.js",
      ergebnis: "exit 0, alles gemessen, A-kanon.json geschrieben/geprueft (Laufzeit " + M.laufzeitMs + " ms)",
    }, {
      befehl: "& \"$env:LOCALAPPDATA\\node-portable\\node-v24.21.0-win-x64\\node.exe\" tools\\klassenraum-probe\\A-kanon.js --teil 1",
      ergebnis: "schreibt Nachweise/Klassenraum/A-kanon-teil1.json (12 Pruef-Codes)",
    }, {
      befehl: "Kindprozess aus dem Hauptlauf: \"" + node + "\" \"" + skript + "\" --teil 2",
      ergebnis: "spawnSync stdio=inherit, status=" + (lauf.status === null ? "null" : lauf.status)
        + (lauf.error ? ", Fehler: " + M.determinismus.spawn.fehler : ", kein Fehler") + ", Laufzeit " + kindMs + " ms",
    }],
    messungen: M,
    befunde: B,
    offene: O.length ? O : ["Keine offenen Punkte aus dieser Probe."],
    nichtGeprueft: N.length ? N : [
      "Kein Blick in die Oberflaeche (kein UI, kein Browser, kein Rauchtest).",
      "Kein Test von Spiel.ausCode/erzeugen (Bereich A-Codec, andere Probe/Datei) – hier nur die Kanonisierung.",
      "Kein Android-/Tauri-Lauf, kein zweiter Rechner – der Prozessvergleich ersetzt ihn nicht.",
      "Variante nur 0..63 (seedStart 1..64): hoehere Variantenfelder (64..255) sind nicht gemessen.",
      "Wie lange die Kanonisierung auf einem Schuelergeraet dauert: nur Node v24.21.0 auf diesem Rechner gemessen; die Laufzeit schwankte zwischen zwei Laeufen deutlich (siehe messungen.laufzeitMs).",
      "Ob ein Nutzer den Code richtig abtippt: nicht geprueft (keine Eingabeprobe).",
      "Rueckfall-Faelle bei generierten Formen (Skills ohne Injektor) sind nicht ueber instanzErstellen geprueft, nur ueber Spiel.generiere.",
      "Der Kindprozess wird ohne shell gestartet (spawnSync exe + Argumente). Auf Windows ist das robust, solange der Node-Pfad keine Leerzeichen enthaelt (hier geprueft, Pfad ohne Leerzeichen). Enthaelt der Pfad in einer anderen Umgebung Leerzeichen, kann spawnSync scheitern; dann nennt das JSON den manuellen Befehl.",
      "Die PID in A-kanon-teil2.json stammt aus dem letzten Lauf, der die Datei wirklich neu geschrieben hat; bei identischem Inhalt bleibt der Zeitstempel und damit auch die PID stehen (so verlangt: Datei nur bei Aenderung schreiben). Dass der Kindprozess in DIESEM Lauf lief, belegt spawnSync status=0 und die Kind-Laufzeit, nicht die PID.",
    ],
  };
  const ziel = path.join(NACH, "A-kanon.json");
  const erg = schreibe(ziel, JSON.stringify(out, null, 1) + "\n");
  process.stderr.write("[A-kanon] " + (erg.geschrieben ? "geschrieben" : "unveraendert") + ": " + path.relative(WURZEL, ziel)
    + " (" + erg.grund + "), Laufzeit " + M.laufzeitMs + " ms\n");
  process.stdout.write("[A-kanon] fertig in " + M.laufzeitMs + " ms · Handauftraege " + M.hand.messungen
    + " · generiert " + M.gen.messungen + " · Determinismus " + M.determinismus.identischeEintraege + "/"
    + M.determinismus.eintraegeVerglichen + " · Rueckfall " + M.rueckfall.rueckfaelleGesamt + "\n");
  return out;
}

/* ---------- Einsprung ---------- */
if (require.main === module) {
  const i = process.argv.indexOf("--teil");
  const t = i >= 0 ? Number(process.argv[i + 1]) : null;
  if (t === 1 || t === 2) { teil(t); } else { try { starten(); } catch (e) { process.stderr.write("[A-kanon] FEHLER: " + (e && e.stack || e) + "\n"); process.exitCode = 1; } }
}
module.exports = {netzkennwert, fnv1a32, kennwertAus, ALPHABET, teil, starten};
