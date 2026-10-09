"use strict";
/* ---------- Bereich A: Probe für Codec, Bit-Budget, Kanonisierung und Determinismus ----------
   AUFRUF (aus dem Repo-Wurzelverzeichnis):
     & "$env:LOCALAPPDATA\node-portable\node-v24.21.0-win-x64\node.exe" tools\klassenraum-probe\A-codec-probe.js
   Nebenbefehle:
     … A-codec-probe.js --teil1      schreibt Nachweise\Klassenraum\A-codec-teil1.json (eigener Prozess)
     … A-codec-probe.js --teil2      schreibt Nachweise\Klassenraum\A-codec-teil2.json
   Die Probe ändert NICHTS im Repo außer ihren eigenen Nachweisdateien (A-*).
   Sie lädt die Spielmodule headless über A-lader.js (gleiche Reihenfolge wie tests/run.js),
   setzt die Uhr fest und arbeitet trocken (Spiel._trocken, leerer Stand) – kein Dateizugriff des Spiels.

   Alles, was hier steht, ist die REFERENZIMPLEMENTIERUNG der Festlegung in A-festlegung.md.
   src/spiel/klassenraum.js gibt es noch nicht; dieser Code ist der Spezifikationstext dafür. */

const fs = require("fs"), path = require("path"), {spawnSync} = require("child_process");
const {kontext, WURZEL} = require("./A-lader.js");

const NACHT = path.join(WURZEL, "Nachweise", "Klassenraum");
const BEFEHL = '& "$env:LOCALAPPDATA\\node-portable\\node-v24.21.0-win-x64\\node.exe" tools\\klassenraum-probe\\A-codec-probe.js';
const FESTE_UHR = 1759706400000;                 /* 2026-10-06 00:00 UTC – feste Uhr für reproduzierbare Proben */

/* ============================ 1 · Codec (reine Funktionen) ============================ */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const wert = c => ALPHABET.indexOf(c);
const zeichen = v => ALPHABET[((v % 32) + 32) % 32];

function fehler(fehler, grund, extra) { return Object.assign({fehler, grund}, extra || {}); }

/* Prüfsummen über k Nutzzeichen: C1 mod 31 (Gewichte 1..k), C2 mod 32 (Gewichte 1,3,5,…,2k-1) */
function pruefsummen(v) {
  let c1 = 0, c2 = 0;
  for (let i = 0; i < v.length; i++) { c1 += (i + 1) * v[i]; c2 += (2 * i + 1) * v[i]; }
  return {c1: c1 % 31, c2: c2 % 32};
}

/* "NL-XXXX-XX" – 20 Bit Nutzlast (sitzung 5 | art 1 | index 6 | variante 8) + 10 Bit Prüfsumme */
function auftragscode({sitzung, art, index, variante}) {
  const n = ((sitzung & 31) << 15) | ((art & 1) << 14) | ((index & 63) << 8) | (variante & 255);
  const v = [(n >>> 15) & 31, (n >>> 10) & 31, (n >>> 5) & 31, n & 31];
  const {c1, c2} = pruefsummen(v);
  return "NL-" + zeichen(v[0]) + zeichen(v[1]) + zeichen(v[2]) + zeichen(v[3]) + "-" + zeichen(c1) + zeichen(c2);
}

/* "E-XXXX-XXX" – 25 Bit Nutzlast (sitzung 5 | platz 5 | sterne 4 | versuche 2 | dauer 9) + 10 Bit Prüfsumme */
function ergebnisCodeBauen({sitzung, platz, sterne, versuche, dauerS}) {
  const halbe = Math.max(0, Math.min(10, Math.round((+sterne || 0) * 2)));
  const vers = Math.max(0, Math.min(3, Math.trunc(+versuche || 0)));
  const dauer = Math.max(0, Math.min(511, Math.round((+dauerS || 0) / 10)));
  const n = ((sitzung & 31) << 20) | ((platz & 31) << 15) | (halbe << 11) | (vers << 9) | dauer;
  const v = [(n >>> 20) & 31, (n >>> 15) & 31, (n >>> 10) & 31, (n >>> 5) & 31, n & 31];
  const {c1, c2} = pruefsummen(v);
  return "E-" + v.slice(0, 4).map(zeichen).join("") + "-" + zeichen(v[4]) + zeichen(c1) + zeichen(c2);
}

/* Normalisieren: Groß-/Kleinschreibung egal, Trennzeichen egal, Präfix optional */
function normalisieren(roh) { return String(roh).toUpperCase().replace(/[^0-9A-Z]/g, ""); }

const HINWEIS_ZEICHEN = "Im Code kommt kein I, kein O, keine 0 und keine 1 vor – hast du 0 statt O oder 1 statt I getippt?";
const HINWEIS_E_CODE = "Das sieht nach einem Ergebnis-Code aus (E-…). Hier gehört der Auftragscode hin (NL-…).";

/* Auftragscode lesen – nur Codec, ohne Tabellen: {sitzung, art, index, variante} | {fehler,grund} | null */
function auftragLesen(roh) {
  if (roh == null || String(roh).trim() === "") return null;
  let s = normalisieren(roh);
  const praefix = s.startsWith("NL") && s.length === 8;
  if (praefix) s = s.slice(2);
  if (s.length !== 6) {
    const eHint = /^E[0-9A-Z]{7}$/.test(normalisieren(roh)) ? {hinweis: HINWEIS_E_CODE} : null;
    return fehler("länge", `Der Code hat ${s.length} Zeichen – er braucht 6 (gedruckt z. B. NL-4F7K-2Q).`, eHint);
  }
  for (const c of s) if (wert(c) < 0) return fehler("zeichen", HINWEIS_ZEICHEN, {zeichen: c});
  const v = [...s].map(wert);
  const {c1, c2} = pruefsummen(v.slice(0, 4));            /* Prüfsumme NUR über die 4 Nutzzeichen */
  if (v[4] !== c1 || v[5] !== c2) return fehler("prüfziffer", "Die Prüfziffer passt nicht – hast du dich vertippt?",
    {erwartet: zeichen(c1) + zeichen(c2), gefunden: zeichen(v[4]) + zeichen(v[5])});
  const n = (v[0] << 15) | (v[1] << 10) | (v[2] << 5) | v[3];
  return {sitzung: (n >>> 15) & 31, art: (n >>> 14) & 1, index: (n >>> 8) & 63, variante: n & 255,
          nutzzeichen: s, geprueft: true};
}

/* Ergebnis-Code lesen: {sitzung, platz, sterne, dauerS, versuche, ok} | {fehler,grund} | null */
function ergebnisLesenRoh(roh) {
  if (roh == null || String(roh).trim() === "") return null;
  let s = normalisieren(roh);
  const praefix = s.startsWith("E") && s.length === 8;
  if (praefix) s = s.slice(1);
  if (s.length !== 7) return fehler("länge", `Der Ergebnis-Code hat ${s.length} Zeichen – er braucht 7 (gedruckt z. B. E-4F7K-2Q3).`);
  for (const c of s) if (wert(c) < 0) return fehler("zeichen", HINWEIS_ZEICHEN, {zeichen: c});
  const v = [...s].map(wert);
  const {c1, c2} = pruefsummen(v.slice(0, 5));            /* Prüfsumme NUR über die 5 Nutzzeichen */
  if (v[5] !== c1 || v[6] !== c2) return fehler("prüfziffer", "Die Prüfziffer passt nicht – hast du dich vertippt?");
  const n = (v[0] << 20) | (v[1] << 15) | (v[2] << 10) | (v[3] << 5) | v[4];
  const halbe = (n >>> 11) & 15;
  /* Gegenprüfung Iteration 2: das 4-Bit-Feld „sterne" kann 0..15 tragen. Werte über 10 (also über
     5 Sterne) sind kein gültiger Auftragszustand – ein von Hand gebauter Code darf hier nicht
     „7,5 Sterne" in die Lehrerliste schreiben. */
  if (halbe > 10) return fehler("bereich", `Der Sterne-Wert im Code liegt außerhalb des Bereichs (0..10 halbe Sterne): ${halbe}.`);
  return {sitzung: (n >>> 20) & 31, platz: (n >>> 15) & 31, sterne: halbe / 2,
          versuche: (n >>> 9) & 3, dauerS: (n & 511) * 10, ok: true};
}
/* Rohe Nutzlast ohne Klemmung – nur für die Bereichsmessung (ein Angreifer/Handcode baut so einen Code) */
function ergebnisCodeRoh(n) {
  const v = [(n >>> 20) & 31, (n >>> 15) & 31, (n >>> 10) & 31, (n >>> 5) & 31, n & 31];
  const {c1, c2} = pruefsummen(v);
  return "E-" + v.slice(0, 4).map(zeichen).join("") + "-" + zeichen(v[4]) + zeichen(c1) + zeichen(c2);
}

/* ============================ 2 · Netzkennwert ============================ */

/* Kanonische JSON-Abbildung: Objektschlüssel rekursiv sortiert (UTF-16-Reihenfolge, locale-unabhängig) */
function kanonisch(x) {
  if (Array.isArray(x)) return "[" + x.map(kanonisch).join(",") + "]";
  if (x && typeof x === "object") return "{" + Object.keys(x).sort().map(k => JSON.stringify(k) + ":" + kanonisch(x[k])).join(",") + "}";
  return JSON.stringify(x === undefined ? null : x);
}
/* FNV-1a (32 Bit) über UTF-16-Codeeinheiten – bewusst ohne Buffer/TextEncoder, damit dieselbe Funktion
   im Browser, in der Einzeldatei und headless identisch läuft. */
function fnv1a(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function netzAbbild(netz) {
  const geraete = {};
  for (const id of Object.keys(netz.geraete || {}).sort()) geraete[id] = netz.geraete[id];
  const schluessel = k => [k.a.geraet, k.a.port, k.b.geraet, k.b.port, k.id].join("\u0000");
  const kabel = (netz.kabel || []).map(k => ({id: k.id, a: {geraet: k.a.geraet, port: k.a.port}, b: {geraet: k.b.geraet, port: k.b.port}}))
    .sort((x, y) => { const a = schluessel(x), b = schluessel(y); return a < b ? -1 : a > b ? 1 : 0; });
  return {v: netz.v, geraete, kabel};      /* netz.zustand (Laufzeit) bleibt draußen */
}
function netzkennwert(netz) {
  const h = fnv1a(kanonisch(netzAbbild(netz))) & 0x3fffffff;
  let s = "";
  for (let i = 5; i >= 0; i--) s += zeichen((h >>> (i * 5)) & 31);
  return s;
}

/* ============================ 3 · Lader, Tabellen, Kanonisierung ============================ */

function start() {
  const lab = kontext();
  const {Spiel, DATEN, jetzt, store} = lab;
  Spiel._trocken = true;                       /* keine Bus-Ereignisse, kein Spiel.speichern */
  jetzt.setzen(FESTE_UHR);
  Spiel._st = Spiel.leererStand();
  Spiel._lz = {};
  return lab;
}

/* Index-Tabellen: eingefrorene Reihenfolge (Festlegung § 7) */
function tabellen(lab) {
  const {Spiel, DATEN} = lab;
  const auftraege = Spiel.ticketReihe().map(t => t.id);
  const roh = (DATEN.tickets || []).map(t => t.id);
  const skills = (DATEN.skills || []).map(s => s.id);
  const unterschiede = [];
  const n = Math.max(auftraege.length, roh.length);
  for (let i = 0; i < n; i++) if (auftraege[i] !== roh[i]) unterschiede.push({index: i, reihe: auftraege[i] ?? null, roh: roh[i] ?? null});
  return {auftraege, roh, skills, unterschiede};
}

const KANON_FENSTER = 64;

/* Handgeschriebener Auftrag: eigene Seed-Fassung im Fenster suchen, sonst feste Fassung (deterministisch) */
function kanonisiereHand(lab, def, seedStart) {
  const {Spiel} = lab;
  for (let k = 0; k < KANON_FENSTER; k++) {
    const s = seedStart + k;
    let d = null;
    try { d = def.fuerSeed(s); } catch (e) { d = null; }
    if (d && d !== def && Spiel.ticketGueltig(d)) return {seed: s, def: d, eigene: true, schritte: k};
  }
  const d0 = def.fuerSeed(seedStart);
  if (d0 && Spiel.ticketGueltig(d0)) return {seed: seedStart, def: d0, eigene: false, schritte: KANON_FENSTER};
  return fehler("auftrag", "Für diesen Auftrag liefert keine Seed-Fassung ein spielbares Netz.");
}
/* Generierte Form: Spiel.generiere + Spiel.ticketGueltig, Fenster wie oben */
function kanonisiereGeneriert(lab, skill, seedStart) {
  const {Spiel} = lab;
  for (let k = 0; k < KANON_FENSTER; k++) {
    const s = seedStart + k;
    let d = null;
    try { d = Spiel.generiere(skill, s); } catch (e) { d = null; }
    if (d && Spiel.ticketGueltig(d)) return {seed: s, def: d, eigene: true, schritte: k};
  }
  return fehler("auftrag", `Für die Fertigkeit ${skill} liefert kein Seed im Fenster (${KANON_FENSTER}) einen spielbaren Auftrag.`);
}

/* Code lesen und in einen Auftrag übersetzen (Tabellen + Kanonisierung) */
function ausCode(lab, tab, roh) {
  const {Spiel, DATEN} = lab;
  const g = auftragLesen(roh);
  if (!g || g.fehler) return g;
  if (g.art === 0) {
    if (g.index >= tab.auftraege.length) return fehler("fassung", `Auftragsindex ${g.index} liegt hinter dem Ende der Auftragstabelle (${tab.auftraege.length} Einträge).`);
    const id = tab.auftraege[g.index];
    const def = (DATEN.tickets || []).find(t => t.id === id);
    if (!def) return fehler("auftrag", `Den Auftrag Nr. ${g.index} (${id}) gibt es in dieser Fassung nicht.`);
    const k = kanonisiereHand(lab, def, g.variante + 1);
    if (k.fehler) return k;
    return {ticketId: id, seed: k.seed, art: "hand", sitzung: g.sitzung, index: g.index, variante: g.variante,
            skill: null, eigene: k.eigene, schritte: k.schritte,
            code: auftragscode({sitzung: g.sitzung, art: 0, index: g.index, variante: g.variante}), _def: k.def};
  }
  if (g.index >= tab.skills.length) return fehler("fassung", `Fertigkeitsindex ${g.index} liegt hinter dem Ende der Fertigkeitstabelle (${tab.skills.length} Einträge).`);
  const skill = tab.skills[g.index];
  if (!(DATEN.skills || []).some(s => s.id === skill)) return fehler("auftrag", `Die Fertigkeit Nr. ${g.index} (${skill}) gibt es in dieser Fassung nicht.`);
  const k = kanonisiereGeneriert(lab, skill, g.variante + 1);
  if (k.fehler) return k;
  return {ticketId: k.def.id, seed: k.seed, art: "generiert", sitzung: g.sitzung, index: g.index, variante: g.variante,
          skill, eigene: true, schritte: k.schritte,
          code: auftragscode({sitzung: g.sitzung, art: 1, index: g.index, variante: g.variante}), _def: k.def};
}

/* ============================ 4 · Referenz-API Spiel.klassenraum ============================ */

function klassenraumApi(lab, tab) {
  const {Spiel, DATEN, jetzt, store} = lab;
  const STANDARD = () => ({fassung: 1, programm: lab.LABOR_VERSION, sitzung: null, platz: null, letzte: null, zuletzt: jetzt()});
  const laden = () => Object.assign(STANDARD(), store.get("klassenraum", null) || {});
  const sichern = s => { s.zuletzt = jetzt(); store.set("klassenraum", s); return s; };

  /* erzeugen({ticketId?, skill?, seed?, dauerMin?, titel?}) */
  function erzeugen(o = {}) {
    const {ticketId, skill, seed, dauerMin, titel} = o || {};
    if ((ticketId && skill) || (!ticketId && !skill))
      return fehler("wahl", "Bitte genau einen Auftrag ODER eine Fertigkeit wählen.");
    const s0 = laden();
    const zaehler = (s0.zaehler || 0) + 1;
    const variante = (typeof seed === "number" && isFinite(seed)) ? ((seed >>> 0) % 256) : (Spiel.neuerSeed("klassenraum-variante:" + zaehler) % 256);
    const id = (typeof o.sitzung === "number") ? (o.sitzung & 31) : (1 + (Spiel.neuerSeed("klassenraum-id:" + zaehler) % 31));
    let k, art, index, def;
    if (ticketId) {
      index = tab.auftraege.indexOf(ticketId);
      def = (DATEN.tickets || []).find(t => t.id === ticketId);
      if (index < 0 || !def) return fehler("auftrag", `Den Auftrag ${ticketId} gibt es in dieser Fassung nicht.`);
      art = "hand";
      k = kanonisiereHand(lab, def, variante + 1);
    } else {
      index = tab.skills.indexOf(skill);
      if (index < 0) return fehler("auftrag", `Die Fertigkeit ${skill} gibt es in dieser Fassung nicht.`);
      art = "generiert";
      k = kanonisiereGeneriert(lab, skill, variante + 1);
    }
    if (k.fehler) return k;
    const sitzung = {
      id, titel: titel || k.def.titel || k.def.id, art, ticketId: k.def.id, skill: art === "generiert" ? skill : null,
      index, variante, seed: k.seed, eigene: !!k.eigene, schritte: k.schritte,
      code: auftragscode({sitzung: id, art: art === "hand" ? 0 : 1, index, variante}),
      dauerMin: Math.max(1, Math.min(120, Math.trunc(+dauerMin || 10))), erstellt: jetzt(), ergebnisse: {},
    };
    const s = laden(); s.zaehler = zaehler; s.sitzung = sitzung; sichern(s);
    return JSON.parse(JSON.stringify(sitzung));
  }

  function sitzung() { const s = laden(); return s.sitzung ? JSON.parse(JSON.stringify(s.sitzung)) : null; }

  /* ergebnisCode(inst, abnahme) – nach Spiel.abschliessen aufrufen */
  function ergebnisCode(inst, abnahme) {
    if (!inst) return fehler("auftrag", "Kein Auftrag übergeben.");
    if (!inst.klassenraum || typeof inst.klassenraum.sitzung !== "number")
      return fehler("auftrag", "Dieser Auftrag kam nicht über einen Klassenraum-Code.");
    if (!abnahme) return fehler("abnahme", "Ohne Abnahme gibt es keinen Ergebnis-Code.");
    if (!abnahme.bestanden) return fehler("abnahme", "Der Auftrag ist noch nicht bestanden.");
    const platz = Math.max(0, Math.min(31, Math.trunc(inst.klassenraum.platz || 0)));
    const versuche = Math.max(0, Math.min(3, (inst.abnahmen || 1) - 1));
    const dauerS = Math.max(0, Math.round((inst.zeitMs || 0) / 1000));
    return ergebnisCodeBauen({sitzung: inst.klassenraum.sitzung, platz, sterne: abnahme.sterne, versuche, dauerS});
  }

  function ergebnisLesen(roh) { return ergebnisLesenRoh(roh); }

  /* ergebnisEintragen(code) – idempotent, Platz ist der Schlüssel */
  function ergebnisEintragen(roh) {
    const s = laden();
    if (!s.sitzung) return fehler("sitzung", "Es läuft keine Sitzung – erst einen Auftrag erzeugen.", {art: "keine"});
    const g = ergebnisLesenRoh(roh);
    if (!g || g.fehler) return g;
    if (g.sitzung !== s.sitzung.id)
      return fehler("sitzung", `Dieser Ergebnis-Code gehört zu Sitzung ${g.sitzung} – hier läuft Sitzung ${s.sitzung.id}.`, {art: "fremd", codeSitzung: g.sitzung, hier: s.sitzung.id});
    const vorhanden = s.sitzung.ergebnisse[String(g.platz)];
    if (vorhanden) {
      const gleich = normalisieren(vorhanden.code) === normalisieren(roh);
      return {ok: true, neu: false, grund: gleich ? "doppelt" : "platz-schon-da", platz: g.platz, sterne: vorhanden.sterne};
    }
    s.sitzung.ergebnisse[String(g.platz)] = {platz: g.platz, sterne: g.sterne, dauerS: g.dauerS, versuche: g.versuche,
      code: ergebnisCodeBauen({sitzung: g.sitzung, platz: g.platz, sterne: g.sterne, versuche: g.versuche, dauerS: g.dauerS}),
      zeit: jetzt(), quelle: "eingabe"};
    sichern(s);
    return {ok: true, neu: true, platz: g.platz, sterne: g.sterne};
  }

  function exportieren() {
    const s = laden();
    if (!s.sitzung) return fehler("sitzung", "Es läuft keine Sitzung – nichts zu exportieren.");
    return JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: s.fassung || 1, programm: s.programm || lab.LABOR_VERSION,
      zeit: jetzt(), sitzung: s.sitzung}, null, 1);
  }

  function importieren(text) {
    if (typeof text !== "string" || text.trim() === "") return fehler("format", "Die Datei ist leer.");
    let d = null;
    try { d = JSON.parse(text); } catch (e) { return fehler("format", "Das ist keine JSON-Datei."); }
    if (!d || typeof d !== "object" || Array.isArray(d)) return fehler("format", "Das ist keine Klassenraum-Datei.");
    if (d.format !== "netzwerk-labor/klassenraum") return fehler("format", "Das ist keine Klassenraum-Datei (format fehlt).");
    const f = typeof d.fassung === "number" && isFinite(d.fassung) ? d.fassung : 0;
    if (f > 1) return fehler("fassung", `Die Datei stammt aus einer neueren Fassung (Stand ${f}); dieses Programm kennt nur 1.`);
    const si = d.sitzung;
    if (si === undefined || si === null) return fehler("format", "In der Datei fehlt die Sitzung.");
    if (typeof si !== "object" || Array.isArray(si)) return fehler("format", "Die Sitzung in der Datei ist unbrauchbar.");
    if (typeof si.id !== "number" || !si.code || typeof si.code !== "string") return fehler("format", "Die Sitzung in der Datei ist unbrauchbar.");
    if (si.ergebnisse !== undefined && (!si.ergebnisse || typeof si.ergebnisse !== "object" || Array.isArray(si.ergebnisse)))
      return fehler("format", "Die Ergebnisliste in der Datei ist unbrauchbar (Abbildung Platz → Ergebnis erwartet).");
    /* Verlustfrei: die Sitzung wird als Ganzes übernommen (auch unbekannte Felder), nur Pflichtfelder
       bekommen Standardwerte. Fehler beim ersten Lauf: ein festes Feldgerüst ließ `schritte` weg. */
    const sitzung = JSON.parse(JSON.stringify(si));
    sitzung.id = si.id & 31;
    sitzung.titel = si.titel || "Klassenraum-Auftrag";
    sitzung.art = si.art === "generiert" ? "generiert" : "hand";
    sitzung.ticketId = si.ticketId || null;
    sitzung.skill = si.skill || null;
    sitzung.index = si.index ?? 0;
    sitzung.variante = si.variante ?? 0;
    sitzung.seed = si.seed ?? 1;
    sitzung.eigene = !!si.eigene;
    if (sitzung.schritte === undefined) sitzung.schritte = null;
    sitzung.dauerMin = si.dauerMin || 10;
    sitzung.erstellt = si.erstellt || jetzt();
    sitzung.ergebnisse = si.ergebnisse || {};
    const s = laden();
    s.fassung = Math.max(1, f);
    s.programm = typeof d.programm === "string" ? d.programm : s.programm;
    s.sitzung = sitzung;
    sichern(s);
    return {ok: true, sitzung: JSON.parse(JSON.stringify(sitzung))};
  }

  return {erzeugen, ausCode: roh => ausCode(lab, tab, roh), sitzung, ergebnisCode, ergebnisLesen, ergebnisEintragen,
          exportieren, importieren, netzkennwert, laden, leeren: () => { const s = STANDARD(); s.zaehler = 0; store.set("klassenraum", s); return s; }};
}

/* ============================ 5 · Messungen ============================ */

function messLänge(lab) {
  /* Alle 2^20 Nutzlasten: Länge und Round-Trip (erschöpfend) */
  const t0 = Date.now();
  let minLaenge = 99, maxLaenge = 0, zuLang = 0, fehlschlag = 0, beispiele = [];
  for (let sitzung = 0; sitzung < 32; sitzung++) for (let art = 0; art < 2; art++) for (let index = 0; index < 64; index++) for (let variante = 0; variante < 256; variante++) {
    const code = auftragscode({sitzung, art, index, variante});
    if (code.length < minLaenge) minLaenge = code.length;
    if (code.length > maxLaenge) maxLaenge = code.length;
    if (code.length > 10) zuLang++;
    const g = auftragLesen(code);
    if (!g || g.fehler || g.sitzung !== sitzung || g.art !== art || g.index !== index || g.variante !== variante) {
      fehlschlag++;
      if (beispiele.length < 5) beispiele.push({code, sitzung, art, index, variante, g});
    }
  }
  return {geprueft: 32 * 2 * 64 * 256, minLaenge, maxLaenge, zuLang, fehlschlag, beispiele, ms: Date.now() - t0};
}

function messErgebnisCode() {
  const t0 = Date.now();
  let minLaenge = 99, maxLaenge = 0, zuLang = 0, fehlschlag = 0, zufall = 0;
  const pruef = (sitzung, platz, sterne, versuche, dauerS) => {
    const code = ergebnisCodeBauen({sitzung, platz, sterne, versuche, dauerS});
    if (code.length < minLaenge) minLaenge = code.length;
    if (code.length > maxLaenge) maxLaenge = code.length;
    if (code.length > 10) zuLang++;
    const g = ergebnisLesenRoh(code);
    const ok = g && !g.fehler && g.sitzung === (sitzung & 31) && g.platz === (platz & 31)
      && Math.abs(g.sterne - Math.min(5, Math.max(0, sterne))) < 1e-9 && g.versuche === Math.min(3, versuche)
      && g.dauerS === Math.min(5110, Math.round(Math.max(0, dauerS) / 10) * 10);
    if (!ok) { fehlschlag++; if (fehlschlag <= 3) console.error("E-Round-Trip-Fehler", code, g, {sitzung, platz, sterne, versuche, dauerS}); }
    return ok;
  };
  /* Randwerte erschöpfend: alle sitzung×platz×sterne×versuche bei drei Dauern */
  for (let sitzung = 0; sitzung < 32; sitzung++) for (let platz = 0; platz < 32; platz++) for (let h = 0; h <= 10; h++) for (let v = 0; v <= 3; v++) for (const d of [0, 5110, 1234]) { pruef(sitzung, platz, h / 2, v, d); zufall++; }
  /* Zufallsstichprobe (mulberry32 wie im Projekt – siehe Hinweis bei Zufall32) */
  const zz = Zufall32(12345);
  for (let i = 0; i < 200000; i++) { pruef(zahlBis(zz, 32), zahlBis(zz, 32), zahlBis(zz, 11) / 2, zahlBis(zz, 4), zahlBis(zz, 5111)); zufall++; }
  return {geprueft: zufall, minLaenge, maxLaenge, zuLang, fehlschlag, ms: Date.now() - t0};
}

function messNormalisierung(lab, tab) {
  /* Formbeispiel aus dem Auftrag: beide Schreibweisen müssen identisch normalisiert UND identisch beurteilt werden. */
  const formbeispiel = ["nl4f7k2q", "NL-4F7K-2Q"].map(f => {
    const g = auftragLesen(f);
    return {eingabe: f, normalisiert: normalisieren(f), urteil: g && g.fehler ? g.fehler : "gültig"};
  });
  /* Echter Code: Groß-/Kleinschreibung, Trennstriche, Leerzeichen dürfen nichts ändern. */
  const echt = auftragscode({sitzung: 4, art: 0, index: 12, variante: 7});
  const schreibweisen = [echt, echt.toLowerCase(), echt.replace(/-/g, ""), " " + echt.toLowerCase().replace("-", " ") + " ", echt.replace(/-/g, ".")];
  const gleich = schreibweisen.map(f => {
    const g = auftragLesen(f);
    return {eingabe: f, normalisiert: normalisieren(f), felder: g && !g.fehler ? [g.sitzung, g.art, g.index, g.variante] : (g ? g.fehler : null)};
  });
  const erste = JSON.stringify(gleich[0].felder);
  /* Präfix-Falle: ein Nutzteil, der selbst mit "NL" beginnt, muss trotzdem richtig gelesen werden. */
  const praefixFalle = (() => {
    const werte = [12, 10, 7, 20];                            /* N, L, H, W → gedruckt "NL-NLHW-.." */
    const code = auftragscodeVonWerten(werte);
    const g = auftragLesen(code);
    const g2 = auftragLesen(normalisieren(code));             /* ohne Trennstriche: "NLNLHW??" */
    return {code, normalisiert: normalisieren(code), gelesen: g && !g.fehler ? [g.sitzung, g.art, g.index, g.variante] : (g && g.fehler),
      ohneStricheGelesen: g2 && !g2.fehler ? [g2.sitzung, g2.art, g2.index, g2.variante] : (g2 && g2.fehler)};
  })();
  return {formbeispiel, gleich, alleGleich: gleich.every(g => JSON.stringify(g.felder) === erste),
    kleinGleich: normalisieren("nl4f7k2q") === normalisieren("NL-4F7K-2Q"), praefixFalle};
}

/* Zeichen im GEDRUCKTEN Code ändern – Prüfzeichen werden NICHT neu berechnet (genau das prüft die Prüfsumme).
   Fehler beim ersten Lauf: Wer die Nutzlast neu kodiert, bekommt immer einen gültigen Code und misst nichts. */
const CODEZEICHEN = code => [...code.replace(/-/g, "").slice(2)];
const CODE_AUS_ZEICHEN = z => "NL-" + z.slice(0, 4).join("") + "-" + z.slice(4).join("");
const CODE_STELLE = i => (i < 4 ? 3 + i : 4 + i);          /* Nutzzeichen i → Position im gedruckten Code */

/* Zufall wie im Projekt (mulberry32, src/kern/basis.js Zufall). Fehler beim ersten Lauf: ein selbstgebauter
   LCG (x = a*x+c mod 2^32) hat in den niedrigen Bits eine Periode von 32 – die 10.000 „Zufallscodes“ waren
   dadurch nur rund 16 verschiedene, und die gemessene Ablehnungsquote war wertlos. */
function Zufall32(seed) {
  let a = (seed >>> 0) || 1;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const zahlBis = (z, n) => Math.floor(z() * n);

function messZufallscodes(lab, tab) {
  const t0 = Date.now();
  const zufall = Zufall32(987654321);
  const rnd = n => zahlBis(zufall, n);
  const klasse = e => e && e.fehler ? e.fehler : (e ? "gültig" : "null");
  /* (a) rohe Zeichenketten: so tippt jemand, der den Aufbau nicht kennt */
  const laufRoh = (zeichenvorrat, n) => {
    const zaehler = {}, gesehen = new Set(); let abgelehnt = 0, gueltig = [];
    for (let i = 0; i < n; i++) {
      let s = "";
      for (let j = 0; j < 8; j++) s += zeichenvorrat[rnd(zeichenvorrat.length)];
      gesehen.add(s);
      const g = auftragLesen(s), k = klasse(g);
      zaehler[k] = (zaehler[k] || 0) + 1;
      if (k !== "gültig") abgelehnt++; else if (gueltig.length < 5) gueltig.push(s);
    }
    return {n, verschiedene: gesehen.size, abgelehnt, quote: +(abgelehnt / n).toFixed(6), klassen: zaehler, gueltigeBeispiele: gueltig};
  };
  /* (b) wohlgeformte Zufallscodes (NL-XXXX-XX, alle Zeichen zufällig): hier entscheidet allein die Prüfsumme */
  const laufWohlgeformt = n => {
    const zaehler = {}, gesehen = new Set(); let abgelehnt = 0; const durch = [];
    for (let i = 0; i < n; i++) {
      const z = []; for (let j = 0; j < 6; j++) z.push(ALPHABET[rnd(32)]);
      const code = CODE_AUS_ZEICHEN(z);
      gesehen.add(code);
      const g = auftragLesen(code), k = klasse(g);
      zaehler[k] = (zaehler[k] || 0) + 1;
      if (k !== "gültig") abgelehnt++;
      else { const a = ausCode(lab, tab, code); durch.push({code, urteil: a && a.fehler ? a.fehler : "Auftrag " + a.ticketId}); }
    }
    return {n, verschiedene: gesehen.size, abgelehnt, quote: +(abgelehnt / n).toFixed(6), klassen: zaehler, durchgekommen: durch.slice(0, 8), durchgekommenGesamt: durch.length};
  };
  /* (c) Ein-Zeichen-Mutationen gültiger Codes, Position 0..5 der sechs Nutzzeichen */
  const mut = {n: 0, erkannt: 0, klassen: {}, gueltigGeblieben: [], verschiedeneCodes: new Set(), verschiedeneMutationen: new Set()};
  for (let i = 0; i < 10000; i++) {
    const code = auftragscode({sitzung: rnd(32), art: rnd(2), index: rnd(64), variante: rnd(256)});
    const z = CODEZEICHEN(code);
    const pos = rnd(6);
    let anderes = null;
    do { anderes = ALPHABET[rnd(32)]; } while (anderes === z[pos]);
    z[pos] = anderes;
    const m = CODE_AUS_ZEICHEN(z);
    mut.verschiedeneCodes.add(code); mut.verschiedeneMutationen.add(m);
    const g = auftragLesen(m), k = klasse(g);
    mut.n++; mut.klassen[k] = (mut.klassen[k] || 0) + 1;
    if (k !== "gültig") mut.erkannt++; else if (mut.gueltigGeblieben.length < 5) mut.gueltigGeblieben.push({von: code, nach: m});
  }
  mut.verschiedeneCodes = mut.verschiedeneCodes.size; mut.verschiedeneMutationen = mut.verschiedeneMutationen.size;
  return {rohGemischt: laufRoh("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), 10000),
    rohAlphabet: laufRoh(ALPHABET.split(""), 10000),
    wohlgeformt: laufWohlgeformt(10000),
    mutationen: Object.assign(mut, {quote: +(mut.erkannt / mut.n).toFixed(6)}), ms: Date.now() - t0};
}

function messVertipper() {
  /* Systematische Vertipper an vier gültigen Codes: ersetzen, Nachbarvertauschung, Buchstabe↔Ziffer.
     Geändert wird immer die Zeichenkette des gedruckten Codes; die Prüfzeichen bleiben stehen. */
  const basiscodes = [
    auftragscode({sitzung: 3, art: 0, index: 5, variante: 10}),
    auftragscode({sitzung: 31, art: 0, index: 57, variante: 255}),
    auftragscode({sitzung: 12, art: 1, index: 20, variante: 128}),
    auftragscode({sitzung: 0, art: 1, index: 26, variante: 1}),
  ];
  const ZIFFER = "23456789";
  const zifferZuBuchstabe = {"2": "Z", "3": "B", "4": "A", "5": "S", "6": "G", "7": "T", "8": "B", "9": "P"};
  const faelle = [];
  const nimm = (code, z, art) => {
    const m = CODE_AUS_ZEICHEN(z);
    const g = auftragLesen(m);
    faelle.push({art, code, vertippt: m, klasse: g && g.fehler ? g.fehler : (g ? "gültig" : "null"),
                 abgelehnt: !(g && g.geprueft)});
  };
  for (const code of basiscodes) {
    const z0 = CODEZEICHEN(code);
    for (let i = 0; i < 6; i++) {
      const c = z0[i], w = wert(c);
      /* (a) ein Zeichen ersetzt: nächstes und übernächstes Alphabetzeichen */
      nimm(code, z0.map((x, k) => k === i ? zeichen(w + 1) : x), "ersetzt+1");
      nimm(code, z0.map((x, k) => k === i ? zeichen(w + 7) : x), "ersetzt+7");
      /* (b) Nachbarvertauschung (echtes Tauschen zweier Zeichen, auch über die Gruppengrenze) */
      if (i < 5) { const t = z0.slice(); [t[i], t[i + 1]] = [t[i + 1], t[i]]; nimm(code, t, "vertauscht"); }
      /* (c) Buchstabe ↔ Ziffer */
      const neu = ZIFFER.includes(c) ? zifferZuBuchstabe[c] : ZIFFER[w % 8];
      nimm(code, z0.map((x, k) => k === i ? neu : x), ZIFFER.includes(c) ? "ziffer→buchstabe" : "buchstabe→ziffer");
    }
  }
  /* Verwechslungsfälle, die das Alphabet ausschließt (Klasse "zeichen") */
  const verwechslung = [];
  for (const [von, nach, stelle] of [["O", "0", 2], ["0", "O", 2], ["I", "1", 3], ["1", "I", 3]]) {
    const code = auftragscode({sitzung: 6, art: 0, index: 3, variante: 4});
    const m = code.slice(0, CODE_STELLE(stelle)) + nach + code.slice(CODE_STELLE(stelle) + 1);
    const g = auftragLesen(m);
    verwechslung.push({von, nach, eingabe: m, klasse: g && g.fehler ? g.fehler : "gültig"});
  }
  /* Grenzfälle der mod-31-Rechnung: A↔9 (Wertdifferenz 31) und Vertauschung zweier Zeichen mit Wertdifferenz 31.
     Beide Fälle sind beweisbar durch C2 (mod 32 mit ungeraden Gewichten) erkannt – hier gemessen, mit Rechenweg. */
  const grenzfaelle = [];
  const grundwerte = [0, 31, 0, 31];                     /* jede Position trägt A (0) oder 9 (31) – echter A↔9-Fall */
  const grundcode = auftragscodeVonWerten(grundwerte);
  for (const pos of [0, 1, 2, 3]) {
    const z = CODEZEICHEN(grundcode);
    const vor = wert(z[pos]);
    z[pos] = zeichen(vor === 0 ? 31 : 0);
    const m = CODE_AUS_ZEICHEN(z);
    const a = pruefsummen(CODEZEICHEN(grundcode).slice(0, 4).map(wert));
    const b = pruefsummen(CODEZEICHEN(m).slice(0, 4).map(wert));
    const g = auftragLesen(m);
    grenzfaelle.push({fall: "A↔9", stelle: pos, vorher: vor, nachher: wert(z[pos]), code: grundcode, vertippt: m,
      C1: [a.c1, b.c1], C2: [a.c2, b.c2], C1Gleich: a.c1 === b.c1, C2Gleich: a.c2 === b.c2,
      klasse: g && g.fehler ? g.fehler : "gültig", abgelehnt: !(g && g.geprueft)});
  }
  for (const pos of [0, 1, 2]) {
    const z = CODEZEICHEN(grundcode);
    if (Math.abs(wert(z[pos]) - wert(z[pos + 1])) !== 31) continue;
    [z[pos], z[pos + 1]] = [z[pos + 1], z[pos]];
    const m = CODE_AUS_ZEICHEN(z);
    const a = pruefsummen(CODEZEICHEN(grundcode).slice(0, 4).map(wert));
    const b = pruefsummen(CODEZEICHEN(m).slice(0, 4).map(wert));
    const g = auftragLesen(m);
    grenzfaelle.push({fall: "Vertauschung Wertdifferenz 31", stelle: pos, code: grundcode, vertauscht: m,
      C1: [a.c1, b.c1], C2: [a.c2, b.c2], C1Gleich: a.c1 === b.c1, C2Gleich: a.c2 === b.c2,
      klasse: g && g.fehler ? g.fehler : "gültig", abgelehnt: !(g && g.geprueft)});
  }
  const zaehl = a => faelle.filter(f => f.art === a).length;
  const abgelehnt = faelle.filter(f => f.abgelehnt).length;
  return {
    faelle: faelle.length, abgelehnt, quote: +(abgelehnt / faelle.length).toFixed(6),
    jeArt: {ersetzt: zaehl("ersetzt+1") + zaehl("ersetzt+7"), vertauscht: zaehl("vertauscht"),
            zifferBuchstabe: zaehl("ziffer→buchstabe") + zaehl("buchstabe→ziffer")},
    klassen: faelle.reduce((m, f) => { m[f.klasse] = (m[f.klasse] || 0) + 1; return m; }, {}),
    liste: faelle, verwechslung, grenzfaelle,
  };
}
/* Code aus fertigen Nutzzeichenwerten (4 Werte für den Auftragscode) */
function auftragscodeVonWerten(v) {
  const {c1, c2} = pruefsummen(v);
  return "NL-" + zeichen(v[0]) + zeichen(v[1]) + zeichen(v[2]) + zeichen(v[3]) + "-" + zeichen(c1) + zeichen(c2);
}

function messKanonisierung(lab, tab, budget) {
  const {Spiel} = lab;
  const t0 = Date.now();
  const hand = {tickets: 0, varianten: 0, k0: 0, eigene: 0, rueckfall: 0, maxK: 0, summeK: 0,
                ohneEigeneFassung: [], jeTicket: [], ms: 0, abgebrochen: false, geprueftGueltig: 0};
  for (const id of tab.auftraege) {
    if (Date.now() - t0 > budget) { hand.abgebrochen = true; break; }
    const def = Spiel.ticketDef(id);
    const zeile = {id, eigene: 0, rueckfall: 0, maxK: 0, summeK: 0};
    for (let variante = 0; variante < 64; variante++) {
      const k = kanonisiereHand(lab, def, variante + 1);
      hand.varianten++;
      if (k.fehler) { hand.rueckfall++; continue; }
      if (Spiel.ticketGueltig(k.def)) hand.geprueftGueltig++;
      if (k.eigene) { hand.eigene++; zeile.eigene++; } else { hand.rueckfall++; zeile.rueckfall++; }
      if (k.schritte === 0) hand.k0++;
      hand.maxK = Math.max(hand.maxK, k.schritte); zeile.maxK = Math.max(zeile.maxK, k.schritte);
      hand.summeK += k.schritte; zeile.summeK += k.schritte;
    }
    hand.tickets++;
    hand.jeTicket.push({id, eigene: zeile.eigene, rueckfall: zeile.rueckfall, maxK: zeile.maxK, mittelK: +(zeile.summeK / 64).toFixed(2)});
    if (zeile.eigene === 0) hand.ohneEigeneFassung.push({id, art: def.art});
  }
  hand.mittelK = +(hand.summeK / Math.max(1, hand.varianten)).toFixed(3);
  hand.ms = Date.now() - t0;

  const gen = {skills: 0, varianten: 0, k0: 0, maxK: 0, summeK: 0, fehlschlaege: 0, jeSkill: [], ms: 0, abgebrochen: false};
  const g0 = Date.now();
  for (const skill of tab.skills) {
    if (Date.now() - g0 > budget) { gen.abgebrochen = true; break; }
    const zeile = {skill, maxK: 0, k0: 0, fehlschlaege: 0, summeK: 0};
    for (let variante = 0; variante < 64; variante++) {
      const k = kanonisiereGeneriert(lab, skill, variante + 1);
      gen.varianten++;
      if (k.fehler) { gen.fehlschlaege++; zeile.fehlschlaege++; continue; }
      if (k.schritte === 0) { gen.k0++; zeile.k0++; }
      gen.maxK = Math.max(gen.maxK, k.schritte); zeile.maxK = Math.max(zeile.maxK, k.schritte);
      gen.summeK += k.schritte; zeile.summeK += k.schritte;
    }
    gen.skills++;
    gen.jeSkill.push({skill, maxK: zeile.maxK, k0: zeile.k0, fehlschlaege: zeile.fehlschlaege, mittelK: +(zeile.summeK / 64).toFixed(2)});
  }
  gen.mittelK = +(gen.summeK / Math.max(1, gen.varianten)).toFixed(3);
  gen.ms = Date.now() - g0;
  return {hand, generiert: gen, fenster: KANON_FENSTER};
}

function messNetzkennwert(lab, tab) {
  const {Spiel, Modell, tief} = lab;
  const def = Spiel.ticketDef(tab.auftraege[0]);
  const n1 = Spiel.startNetz(def, 5);
  const n2 = Spiel.startNetz(def, 5);
  const k1 = netzkennwert(n1), k2 = netzkennwert(n2);
  /* Schlüsselreihenfolge permutieren: Objekt neu aufbauen, Schlüssel in umgekehrter Reihenfolge */
  const perm = {v: n1.v, geraete: {}, kabel: []};
  for (const id of Object.keys(n1.geraete).reverse()) {
    const g = n1.geraete[id], h = {};
    for (const f of Object.keys(g).reverse()) h[f] = g[f];
    perm.geraete[id] = h;
  }
  perm.kabel = n1.kabel.slice().reverse();
  const kPerm = netzkennwert(perm);
  /* ein Feld ändern (IP-Adresse des ersten Geräts mit running-config) */
  const geaendert = tief(n1);
  const gid = Object.keys(geaendert.geraete).find(id => geaendert.geraete[id].running && geaendert.geraete[id].running.if);
  if (gid) { const ifs = Object.keys(geaendert.geraete[gid].running.if); geaendert.geraete[gid].running.if[ifs[0]].ip = "203.0.113.99"; }
  const kGeaendert = netzkennwert(geaendert);
  /* Laufzeit (zustand) ändern → Kennwert unverändert */
  const zustand = tief(n1); zustand.zustand = {_uhr: 4711, [Object.keys(zustand.geraete)[0]]: {mac: "aa:bb:cc:dd:ee:ff"}};
  const kZustand = netzkennwert(zustand);
  /* Kabelreihenfolge egal */
  const kabelUm = tief(n1); kabelUm.kabel = kabelUm.kabel.slice().reverse();
  const kKabel = netzkennwert(kabelUm);
  return {gleich: k1 === k2, kennwert: k1, kennwert2: k2, permutiertGleich: k1 === kPerm, kPerm,
    geaendertGleich: k1 === kGeaendert, kGeaendert, geraetGeaendert: gid,
    zustandGleich: k1 === kZustand, kZustand, kabelreihenfolgeGleich: k1 === kKabel, kKabel,
    laenge: k1.length, nurAlphabet: [...k1].every(c => wert(c) >= 0),
    fnvProbe: {text: "A", bytes: ["A".charCodeAt(0)], h: fnv1a("A")}};
}

/* Tauglichkeit je Fertigkeit: erster Seed (1..128), der ein gültiges Ticket liefert.
   Das ist die Grundlage für die eingefrorene Fertigkeitstabelle: nur taugliche Fertigkeiten
   dürfen einen Auftragscode bekommen; für untaugliche gibt es keinen Code. */
function messFertigkeitstauglichkeit(lab, tab, budget) {
  const {Spiel} = lab;
  const t0 = Date.now(), je = [];
  let tauglich = 0, untauglich = 0, abgebrochen = false;
  for (const skill of tab.skills) {
    if (Date.now() - t0 > budget) { abgebrochen = true; break; }
    let erster = null, fehler = null, versuche = 0;
    for (let seed = 1; seed <= 128 && erster === null; seed++) {
      versuche++;
      try { const d = Spiel.generiere(skill, seed); if (d && Spiel.ticketGueltig(d)) erster = seed; else fehler = "Ticket nicht gültig"; }
      catch (e) { fehler = String(e && e.message || e); }
    }
    if (erster !== null) tauglich++; else untauglich++;
    je.push({skill, tauglich: erster !== null, ersterSeed: erster, versuche, fehler: erster === null ? fehler : null});
  }
  return {skills: je.length, tauglich, untauglich, je, ms: Date.now() - t0, abgebrochen, suchraum: 128};
}

/* Je Fehlerklasse ein Beleg – inklusive der beiden Klassen, die nur über Tabellen entstehen
   (unbekannter Auftrag, andere Programmfassung). */
function messFehlerklassen(lab, tab, tauglichkeit) {
  const eCode = ergebnisCodeBauen({sitzung: 4, platz: 3, sterne: 4, versuche: 0, dauerS: 600});
  /* Der Fall „Fertigkeit ohne Injektor" wird ABGELEITET, nicht auf einen Index festgenagelt:
     er belegt die Fehlerklasse `auftrag` für eine Fertigkeit, die keinen spielbaren Auftrag liefert.
     Gibt es heute keine solche Fertigkeit (alle 27 haben seit task-5 einen Injektor), entfällt der
     Fall AUSDRÜCKLICH — ein gültiger Auftrag darf nicht als Beleg für `{fehler:"auftrag"}` gelten. */
  const untauglichIndex = tauglichkeit ? tauglichkeit.je.findIndex(s => !s.tauglich) : -1;
  const untauglichFall = untauglichIndex >= 0
    ? {eingabe: auftragscode({sitzung: 5, art: 1, index: untauglichIndex, variante: 3}),
       ausCode: ausCode(lab, tab, auftragscode({sitzung: 5, art: 1, index: untauglichIndex, variante: 3}))}
    : {entfaellt: true, grund: `Keine untaugliche Fertigkeit in dieser Fassung (${tauglichkeit ? tauglichkeit.tauglich : "?"} von ${tauglichkeit ? tauglichkeit.skills : "?"} liefern im Suchraum einen gültigen Auftrag) — der Fall ist heute nicht darstellbar.`};
  const zeichenFall = "NL-" + "A".repeat(3) + "O" + "-AA";
  const tabelleMitLuecke = {...tab, auftraege: ["gibt-es-nicht", ...tab.auftraege.slice(1)]};
  const faelle = {
    leer: {eingabe: "", auftrag: auftragLesen(""), ausCode: ausCode(lab, tab, "")},
    nullEingabe: {eingabe: null, auftrag: auftragLesen(null)},
    laenge: {eingabe: "NL-ABC", auftrag: auftragLesen("NL-ABC")},
    laengeErgebnisImAuftragsfeld: {eingabe: eCode, auftrag: auftragLesen(eCode)},
    zeichen: {eingabe: zeichenFall, auftrag: auftragLesen(zeichenFall)},
    pruefziffer: {eingabe: "NL-4F7K-2Q", auftrag: auftragLesen("NL-4F7K-2Q")},
    fassungAuftragsindex: {eingabe: auftragscode({sitzung: 5, art: 0, index: 61, variante: 3}),
      ausCode: ausCode(lab, tab, auftragscode({sitzung: 5, art: 0, index: 61, variante: 3}))},
    fassungFertigkeitsindex: {eingabe: auftragscode({sitzung: 5, art: 1, index: 40, variante: 3}),
      ausCode: ausCode(lab, tab, auftragscode({sitzung: 5, art: 1, index: 40, variante: 3}))},
    auftragTabelleMitLuecke: {eingabe: auftragscode({sitzung: 5, art: 0, index: 0, variante: 3}),
      ausCode: ausCode(lab, tabelleMitLuecke, auftragscode({sitzung: 5, art: 0, index: 0, variante: 3}))},
    auftragUntauglicheFertigkeit: untauglichFall,
    ergebnisLeer: {eingabe: "", gelesen: ergebnisLesenRoh("")},
    ergebnisLaenge: {eingabe: "E-ABC", gelesen: ergebnisLesenRoh("E-ABC")},
    ergebnisZeichen: {eingabe: "E-AAAO-AAA", gelesen: ergebnisLesenRoh("E-AAAO-AAA")},
    ergebnisAuftragscodeImFeld: {eingabe: auftragscode({sitzung: 5, art: 0, index: 3, variante: 3}), gelesen: ergebnisLesenRoh(auftragscode({sitzung: 5, art: 0, index: 3, variante: 3}))},
    bereichSterne: {hinweis: "Nutzlast mit sterne-Bits = 15 (7,5 Sterne) – von Hand gebaut, Prüfsumme stimmt",
      eingabe: ergebnisCodeRoh((7 << 20) | (3 << 15) | (15 << 11) | (0 << 9) | 5),
      gelesen: ergebnisLesenRoh(ergebnisCodeRoh((7 << 20) | (3 << 15) | (15 << 11) | (0 << 9) | 5))},
    bereichSterneGrenze: {hinweis: "sterne-Bits = 10 (5 Sterne) – muss gültig bleiben",
      eingabe: ergebnisCodeRoh((7 << 20) | (3 << 15) | (10 << 11) | (3 << 9) | 511),
      gelesen: ergebnisLesenRoh(ergebnisCodeRoh((7 << 20) | (3 << 15) | (10 << 11) | (3 << 9) | 511))},
  };
  return faelle;
}

/* Reservierte Indizes (heute frei): zählen und belegen, dass sie {fehler:"fassung"} ergeben.
   Wichtig für § 2.3: „frei" heißt „in dieser Fassung nicht vergeben"; beim Anhängen neuer Aufträge
   wird ein solcher Index belegt (er wurde nie ausgegeben). */
function messReserviert(lab, tab, tauglichkeit) {
  const zaehl = {auftraegeFrei: 0, fertigkeitenFrei: 0, auftraegeFreiFassung: 0, fertigkeitenFreiFassung: 0, andereKlasse: []};
  for (let sitzung = 0; sitzung < 32; sitzung++) for (let variante = 0; variante < 256; variante++) {
    for (let index = tab.auftraege.length; index < 64; index++) {
      zaehl.auftraegeFrei++;
      const g = ausCode(lab, tab, auftragscode({sitzung, art: 0, index, variante}));
      if (g && g.fehler === "fassung") zaehl.auftraegeFreiFassung++;
      else if (zaehl.andereKlasse.length < 5) zaehl.andereKlasse.push({art: 0, index, g});
    }
    for (let index = tab.skills.length; index < 64; index++) {
      zaehl.fertigkeitenFrei++;
      const g = ausCode(lab, tab, auftragscode({sitzung, art: 1, index, variante}));
      if (g && g.fehler === "fassung") zaehl.fertigkeitenFreiFassung++;
      else if (zaehl.andereKlasse.length < 5) zaehl.andereKlasse.push({art: 1, index, g});
    }
  }
  /* Taugliche vs. untaugliche Fertigkeitsindizes — ABGELEITET aus der Messung
     (`messFertigkeitstauglichkeit`), nicht gesetzt. Die frühere Annahme „3 untauglich, also 24 von 27"
     war der Stand VOR den drei Injektoren aus task-5 (lab.portsec, lab.stp, lab.storage); eine feste
     Zahl veraltet wieder. Ohne Messung wird NICHT geraten: dann bleibt das Feld null. */
  const untauglich = tauglichkeit ? tauglichkeit.untauglich : null;
  zaehl.tauglicheIndizes = tauglichkeit ? tauglichkeit.tauglich : null;
  zaehl.untauglicheIndizes = untauglich;
  zaehl.unerreichbareCodesFertigkeit = untauglich === null ? null : untauglich * 32 * 256;   /* 32 Sitzungen × 256 Varianten */
  zaehl.tauglichkeitQuelle = "messFertigkeitstauglichkeit: Spiel.generiere + Spiel.ticketGueltig, Suchraum 128 Seeds je Fertigkeit";
  zaehl.tauglichkeitAbgebrochen = tauglichkeit ? !!tauglichkeit.abgebrochen : null;
  zaehl.tauglichkeitHinweis = !tauglichkeit ? "Ohne Tauglichkeitsmessung nicht ableitbar — absichtlich null statt geraten."
    : tauglichkeit.abgebrochen ? "Die Tauglichkeitsmessung brach nach dem Budget ab — die Zahlen decken nur die geprüften Fertigkeiten ab."
    : null;
  return zaehl;
}

/* ============================ 6 · Determinismus über zwei Prozesse ============================ */

/* Feste Prüfliste: 6 handgeschriebene Aufträge (darunter ein Terminal-Auftrag), 6 generierte */
function pruefliste(tab) {
  const hand = [0, 7, 13, 29, 41, tab.auftraege.length - 1].map(i => ({art: 0, index: i, variante: (i * 7) % 256, sitzung: (i % 30) + 1}));
  const gen = [0, 4, 9, 15, 21, tab.skills.length - 1].map((i, k) => ({art: 1, index: i, variante: (i * 11 + k) % 256, sitzung: (i % 30) + 1}));
  return [...hand, ...gen];
}

function teil(lab, tab, nummer) {
  const liste = pruefliste(tab).map(f => {
    const code = auftragscode({sitzung: f.sitzung, art: f.art, index: f.index, variante: f.variante});
    const g = ausCode(lab, tab, code);
    let kennwert = null, instanzKennwert = null, fehler = null;
    if (g && !g.fehler) {
      try {
        const inst = lab.Spiel.instanzErstellen(g.skill
          ? {gen: {skill: g.skill, seed: g.seed}, seed: g.seed, quelle: "klassenraum", ohneFlow: true}
          : {ticketId: g.ticketId, seed: g.seed, quelle: "klassenraum", ohneFlow: true});
        instanzKennwert = netzkennwert(inst.netz);
        kennwert = netzkennwert(lab.Spiel.startNetz(g._def, g.seed));
      } catch (e) { fehler = String(e && e.message || e); }
    } else fehler = g ? (g.fehler + ": " + g.grund) : "null";
    return {code, art: f.art, index: f.index, variante: f.variante, sitzung: f.sitzung,
      ticketId: (g && g.ticketId) || null, skill: (g && g.skill) || null, seed: (g && g.seed) ?? null,
      schritte: (g && g.schritte) ?? null, kennwert, instanzKennwert, fehler};
  });
  const aus = {teil: nummer, pid: process.pid, node: process.version, uhr: FESTE_UHR, liste};
  const ziel = path.join(NACHT, "A-codec-teil" + nummer + ".json");
  fs.writeFileSync(ziel, JSON.stringify(aus, null, 1), "utf8");
  console.log(`Teil ${nummer}: pid ${process.pid}, ${liste.length} Codes → ${path.relative(WURZEL, ziel)}`);
  return aus;
}

function messDeterminismus() {
  const t0 = Date.now();
  const rufe = n => {
    const r = spawnSync(process.execPath, [__filename, "--teil" + n], {cwd: WURZEL, stdio: "inherit"});
    if (r.error) return {fehler: String(r.error.message || r.error)};
    return {status: r.status};
  };
  const r1 = rufe(1), r2 = rufe(2);
  const lese = n => { try { return JSON.parse(fs.readFileSync(path.join(NACHT, "A-codec-teil" + n + ".json"), "utf8")); } catch (e) { return null; } };
  const a = lese(1), b = lese(2);
  if (!a || !b) return {fehler: "Teil-Dateien fehlen", r1, r2};
  const abweichungen = [];
  for (let i = 0; i < a.liste.length; i++) {
    const x = a.liste[i], y = b.liste[i];
    if (JSON.stringify(x) !== JSON.stringify(y)) abweichungen.push({i, code: x.code, a: x, b: y});
  }
  return {pids: [a.pid, b.pid], verschieden: a.pid !== b.pid, codes: a.liste.length,
    identisch: a.liste.length - abweichungen.length, abweichungen: abweichungen.length, liste: abweichungen,
    kennwerte: a.liste.map(x => ({code: x.code, seed: x.seed, kennwert: x.kennwert, instanz: x.instanzKennwert, fehler: x.fehler})),
    ms: Date.now() - t0, r1, r2};
}

/* ============================ 7 · Ergebnis-Code, Speicher, Export ============================ */

function messSpeicher(lab, tab, K) {
  K.leeren();
  /* Abnahmefall nachstellen: echte Instanz + echte Abnahme */
  const inst = lab.Spiel.instanzErstellen({ticketId: tab.auftraege[0], seed: 11, quelle: "klassenraum", ohneFlow: true});
  inst.klassenraum = {sitzung: 9, platz: 5, code: "NL-TEST-XX"};
  inst.zeitMs = 72500;                      /* 72,5 s Arbeitszeit */
  lab.Spiel.loesungAnwenden(inst.netz, lab.Spiel.defVon(inst).loesung);   /* Lösung anwenden → Abnahme besteht */
  inst.abnahmen = 1;                        /* eine Abnahme vorher → nach Spiel.abnahme 2 → 1 Fehlversuch */
  const abnahme = lab.Spiel.abnahme(inst);
  const code = K.ergebnisCode(inst, abnahme);
  const gelesen = K.ergebnisLesen(code);
  const randfaelle = {
    ohneAbnahme: K.ergebnisCode(inst, null),
    nichtBestanden: K.ergebnisCode(inst, Object.assign({}, abnahme, {bestanden: false})),
    ohneKlassenraum: K.ergebnisCode({netz: inst.netz, zeitMs: 1000, abnahmen: 1}, abnahme),
    instNull: K.ergebnisCode(null, abnahme),
    leererCode: K.ergebnisLesen(""),
    unsinnOhneSitzung: K.ergebnisEintragen("XYZ"),
  };
  /* Idempotenz */
  K.leeren();
  const sitz = K.erzeugen({ticketId: tab.auftraege[2], seed: 42, dauerMin: 12, titel: "Probe", sitzung: 4});
  const sitz2 = K.erzeugen({skill: tab.skills[3], seed: 7, sitzung: 6});
  K.importieren(K.exportieren());                         /* Sitzung 6 sichern */
  K.leeren();
  K.importieren(JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, programm: lab.LABOR_VERSION, zeit: FESTE_UHR, sitzung: sitz2}));
  const vor = JSON.stringify(lab.store.get("klassenraum", null));
  const e1 = K.ergebnisEintragen(ergebnisCodeBauen({sitzung: 6, platz: 3, sterne: 4, versuche: 1, dauerS: 610}));
  const nach1 = JSON.stringify(lab.store.get("klassenraum", null));
  const e2 = K.ergebnisEintragen(ergebnisCodeBauen({sitzung: 6, platz: 3, sterne: 4, versuche: 1, dauerS: 610}));
  const nach2 = JSON.stringify(lab.store.get("klassenraum", null));
  const e3 = K.ergebnisEintragen(ergebnisCodeBauen({sitzung: 6, platz: 3, sterne: 5, versuche: 0, dauerS: 300}));
  const nach3 = JSON.stringify(lab.store.get("klassenraum", null));
  const e4 = K.ergebnisEintragen(ergebnisCodeBauen({sitzung: 7, platz: 4, sterne: 5, versuche: 0, dauerS: 300}));
  const nach4 = JSON.stringify(lab.store.get("klassenraum", null));
  const e5 = K.ergebnisEintragen(ergebnisCodeBauen({sitzung: 6, platz: 0, sterne: 2.5, versuche: 3, dauerS: 5110}));
  const nach5 = lab.store.get("klassenraum", null);
  const ergebnisAnzahl = Object.keys(nach5.sitzung ? nach5.sitzung.ergebnisse : {}).length;
  const unsinnMitSitzung = K.ergebnisEintragen("XYZ");
  const leerMitSitzung = K.ergebnisEintragen("");
  /* Block-Eingabe: drei Codes in einem Text */
  const block = [ergebnisCodeBauen({sitzung: 6, platz: 8, sterne: 3, versuche: 0, dauerS: 120}),
                 ergebnisCodeBauen({sitzung: 6, platz: 9, sterne: 5, versuche: 2, dauerS: 5050}),
                 ergebnisCodeBauen({sitzung: 6, platz: 8, sterne: 3, versuche: 0, dauerS: 120})].join("\n");
  const blockErgebnis = block.split(/\s+/).filter(Boolean).map(c => K.ergebnisEintragen(c));
  /* Export/Import verlustfrei */
  K.leeren();
  const s3 = K.erzeugen({ticketId: tab.auftraege[10], seed: 3, sitzung: 2});
  K.ergebnisEintragen(ergebnisCodeBauen({sitzung: 2, platz: 1, sterne: 4.5, versuche: 0, dauerS: 1110}));
  K.ergebnisEintragen(ergebnisCodeBauen({sitzung: 2, platz: 2, sterne: 3, versuche: 1, dauerS: 220}));
  K.ergebnisEintragen(ergebnisCodeBauen({sitzung: 2, platz: 31, sterne: 5, versuche: 0, dauerS: 5110}));
  const text = K.exportieren();
  const vorImport = lab.store.get("klassenraum", null).sitzung;
  const vorImportText = JSON.stringify(vorImport);
  K.leeren();
  const imp = K.importieren(text);
  const nachImport = lab.store.get("klassenraum", null).sitzung;
  const nachImportText = JSON.stringify(nachImport);
  /* Verlustfrei heißt: gleicher Inhalt. Die Reihenfolge der Schlüssel darf sich ändern (importieren ordnet neu). */
  const verlustfrei = kanonisch(vorImport) === kanonisch(nachImport);
  const fehlendeFelder = Object.keys(vorImport).filter(k => !(k in nachImport) || JSON.stringify(nachImport[k]) !== JSON.stringify(vorImport[k]));
  const importFehler = {
    leer: K.importieren(""),
    keinJson: K.importieren("{kaputt"),
    fremd: K.importieren(JSON.stringify({format: "netzwerk-labor", speicher: {}})),
    array: K.importieren("[]"),
    neuere: K.importieren(JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 2, sitzung: sitz})),
    ohneSitzung: K.importieren(JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1})),
    sitzungZahl: K.importieren(JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, sitzung: 5})),
    sitzungArray: K.importieren(JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, sitzung: []})),
    ergebnisseArray: K.importieren(JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1,
      sitzung: Object.assign({}, sitz, {ergebnisse: []})})),
    anderesProgramm: K.importieren(JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, programm: "1.0.0", sitzung: sitz})),
  };
  /* Speicherform von erzeugen */
  K.leeren();
  const neu = K.erzeugen({ticketId: tab.auftraege[4], seed: 200, sitzung: 3, dauerMin: 15, titel: "Titelprobe"});
  const roh = lab.store.get("klassenraum", null);
  return {
    abnahme: {bestanden: abnahme.bestanden, sterne: abnahme.sterne, versucheInCode: (inst.abnahmen || 1) - 1},
    code, gelesen, laenge: code.length,
    randfaelle,
    idempotenz: {e1, e2, e3, e4, e5, nach5, unsinnMitSitzung, leerMitSitzung,
                 nachErstemGleichNachZweitem: nach1 === nach2,
                 nach2GleichNach3: nach2 === nach3, nach3GleichNach4: nach3 === nach4,
                 vorErstemUngleichNachErstem: vor !== nach1, ergebnisAnzahl},
    blockErgebnis,
    exportImport: {verlustfrei, vorImportText, nachImportText, fehlendeFelder, importOk: !!imp.ok, importFehler},
    erzeugenFelder: Object.keys(neu).sort(), speicherFelder: Object.keys(roh).sort(), sitzungFelder: Object.keys(roh.sitzung || {}).sort(),
    sitzung: neu,
  };
}

function messInstanzweg(lab, tab) {
  const {Spiel} = lab;
  const st = Spiel.st;
  const vorher = {angebot: st.angebot.length, postfach: st.postfach.length, erledigt: st.erledigt.length, ziel: Spiel.postfachZiel()};
  const inst = Spiel.instanzErstellen({ticketId: tab.auftraege[0], seed: 33, quelle: "klassenraum", ohneFlow: true});
  const nachher = {angebot: st.angebot.length, postfach: st.postfach.length, erledigt: st.erledigt.length, ziel: Spiel.postfachZiel()};
  const sichtbar = Spiel.postfach().some(i => i.iid === inst.iid);
  const regulaer = () => st.postfach.filter(i => i.quelle === "postfach" || i.quelle === "generiert").length;
  const postfachRegulaerNachher = regulaer();
  const instGen = Spiel.instanzErstellen({gen: {skill: tab.skills[0], seed: 5}, quelle: "klassenraum", ohneFlow: true});

  /* FLOW-FALLE: Der Flow-Regler baut generierte Aufträge passend zum Spielerfortschritt um
     (src/spiel/flow.js:50-66 → Spiel.generiere(skill, seed, {flow:…}) → andere ID, anderes Netz).
     Ohne ohneFlow:true bekämen zwei Geräte mit verschiedenem Fortschritt VERSCHIEDENE Aufträge zum selben Code. */
  const neuerStand = flowStand => { Spiel._st = Spiel.leererStand(); Spiel._lz = {}; if (flowStand) Spiel.st.flow = flowStand; };
  const skill = tab.skills[0];
  const flowAktiv = {[skill]: {letzte: ["g", "g", "g"], stand: "verwicklung"}};
  neuerStand(flowAktiv);
  const genOhneFlow = Spiel.instanzErstellen({gen: {skill, seed: 5}, quelle: "klassenraum", ohneFlow: true});
  const kwGenOhne = netzkennwert(genOhneFlow.netz);
  neuerStand(flowAktiv);
  const genMitFlow = Spiel.instanzErstellen({gen: {skill, seed: 5}, quelle: "klassenraum"});
  const kwGenMit = netzkennwert(genMitFlow.netz);
  neuerStand(flowAktiv);
  const handMitFlow = Spiel.instanzErstellen({ticketId: tab.auftraege[0], seed: 33, quelle: "klassenraum"});
  const kwHandMit = netzkennwert(handMitFlow.netz);
  neuerStand(null);
  const handOhneFlow = Spiel.instanzErstellen({ticketId: tab.auftraege[0], seed: 33, quelle: "klassenraum", ohneFlow: true});
  const kwHandOhne = netzkennwert(handOhneFlow.netz);

  return {
    vorher, nachher, sichtbarImPostfach: sichtbar, quelle: inst.quelle, vielfalt: inst.vielfalt,
    regulaerNachher: postfachRegulaerNachher, postfachZiel: Spiel.postfachZiel(),
    angebotEnthaelt: nachher.angebot > vorher.angebot,
    instGen: {ticketId: instGen.ticketId, quelle: instGen.quelle, kennwert: netzkennwert(instGen.netz)},
    flowFalle: {
      flowStandAktiv: "verwicklung (letzte drei Glanzergebnisse)",
      generiertMitFlow: {ticketId: genMitFlow.ticketId, kennwert: kwGenMit, opts: (genMitFlow.gen || {}).opts},
      generiertOhneFlow: {ticketId: genOhneFlow.ticketId, kennwert: kwGenOhne, opts: (genOhneFlow.gen || {}).opts},
      generiertGleich: genMitFlow.ticketId === genOhneFlow.ticketId && kwGenMit === kwGenOhne,
      handMitFlow: {ticketId: handMitFlow.ticketId, kennwert: kwHandMit},
      handOhneFlow: {ticketId: handOhneFlow.ticketId, kennwert: kwHandOhne},
      handGleich: handMitFlow.ticketId === handOhneFlow.ticketId && kwHandMit === kwHandOhne,
    },
  };
}

/* ============================ 8 · Hauptlauf ============================ */

function main() {
  const t0 = Date.now();
  const lab = start();
  const tab = tabellen(lab);
  const K = klassenraumApi(lab, tab);
  /* Obere Schranke je Kanonisierungsteil. Am 09.10.2026 riss sie bei Maschinenlast: 56 von 58
     Handaufträgen in 540 s (Laufzeit gesamt 647 s statt der in A § 0 dokumentierten 253 s).
     Deshalb 30 min — der unbelastete Normalfall braucht ~250 s, die Schranke ist nur eine Notbremse.
     Wird sie erreicht, steht das im Befundtext, in der Konsole UND im JSON (`abgebrochen`). */
  const budget = Math.max(60000, 30 * 60 * 1000);

  const laenge = messLänge(lab);
  const normalisierung = messNormalisierung(lab, tab);
  const zufall = messZufallscodes(lab, tab);
  const vertipper = messVertipper();
  const eCode = messErgebnisCode();
  const netz = messNetzkennwert(lab, tab);
  const kanon = messKanonisierung(lab, tab, budget);
  const tauglichkeit = messFertigkeitstauglichkeit(lab, tab, 120000);
  const fehlerklassen = messFehlerklassen(lab, tab, tauglichkeit);
  const reserviert = messReserviert(lab, tab, tauglichkeit);
  const instanzweg = messInstanzweg(lab, tab);
  const speicher = messSpeicher(lab, tab, K);
  const determ = messDeterminismus();

  /* Ein abgeschnittener Lauf darf nicht wie ein vollständiger aussehen (Lehre vom 09.10.2026:
     der Abbruch stand nur im JSON-Feld `abgebrochen`, der Befundtext nannte eine glatte Zahl).
     Deshalb hier EINMAL berechnet und an drei Stellen benutzt: Befundtext, Konsole, JSON. */
  const handFehlend = tab.auftraege.filter(id => !kanon.hand.jeTicket.some(z => z.id === id));
  const genFehlend = tab.skills.filter(id => !kanon.generiert.jeSkill.some(z => z.skill === id));
  const budgetS = Math.round(budget / 1000);
  const handKopf = `Kanonisierung Handaufträge: ${kanon.hand.tickets} von ${tab.auftraege.length} Aufträgen`
    + (kanon.hand.abgebrochen ? `, ABGEBROCHEN nach Budget (${budgetS} s) — NICHT gemessen: ${handFehlend.join(", ")}` : ", vollständig");
  const genKopf = `Generierte Formen: ${kanon.generiert.skills} von ${tab.skills.length} Fertigkeiten`
    + (kanon.generiert.abgebrochen ? `, ABGEBROCHEN nach Budget (${budgetS} s) — NICHT gemessen: ${genFehlend.join(", ")}` : ", vollständig");

  const aus = {
    thema: "A-codec", stand: "2026-10-06",
    /* `stand` bleibt das Datum des DOKUMENTS (Vergleichbarkeit mit A § 9), `laufzeit` ist der
       Zeitpunkt DIESES Laufs (neu am 09.10.2026). Getrennt, damit der Beleg datiert ist, ohne die
       Dokumentzuordnung zu verschieben. */
    laufzeit: new Date().toISOString(),
    befehl: BEFEHL,
    umgebung: {node: process.version, module: lab.module.length, ticketsRoh: tab.roh.length, ticketReihe: tab.auftraege.length,
      skills: tab.skills.length, terminal: (lab.DATEN.tickets || []).filter(t => t.art === "terminal").length,
      reiheGleichRoh: tab.auftraege.join("|") === tab.roh.join("|"), reihenfolgeUnterschiede: tab.unterschiede.length,
      festeUhr: FESTE_UHR},
    tabelle: {auftraege: tab.auftraege, rohReihenfolge: tab.roh, skills: tab.skills, unterschiede: tab.unterschiede},
    messungen: {
      laengeAuftragscode: laenge, laengeErgebnisCode: eCode, normalisierung, zufallscodes: zufall,
      vertipper, fehlerklassen, reserviert, netzkennwert: netz, kanonisierung: kanon, fertigkeitstauglichkeit: tauglichkeit,
      determinismus: determ, speicher, instanzweg,
    },
    befunde: [
      `Auftragscode immer genau ${laenge.minLaenge} Zeichen (NL-XXXX-XX), Ergebniscode immer genau ${eCode.minLaenge} Zeichen (E-XXXX-XXX) – jeweils inkl. Trennstriche.`,
      `Erschöpfender Round-Trip über alle ${laenge.geprueft} Nutzlasten: ${laenge.fehlschlag} Fehlschläge.`,
      `${tab.auftraege.length} handgeschriebene Aufträge: Spiel.ticketReihe() und DATEN.tickets sind an ${tab.unterschiede.length} Stellen in anderer Reihenfolge – die Tabelle muss eingefroren werden.`,
      `${handKopf}; ${kanon.hand.k0} von ${kanon.hand.varianten} Varianten mit 0 Schritten; Rückfall auf die feste Fassung ${kanon.hand.rueckfall}× (${kanon.hand.ohneEigeneFassung.map(x => x.id).join(", ")}).`,
      `${genKopf}; ${kanon.generiert.fehlschlaege} von ${kanon.generiert.varianten} Varianten scheitern (${kanon.generiert.jeSkill.filter(x => x.fehlschlaege > 0).map(x => x.skill).join(", ") || "keine"}). Tauglichkeit (eigene Messung, ${tauglichkeit.abgebrochen ? "ABGEBROCHEN" : "vollständig"}): ${tauglichkeit.tauglich} von ${tauglichkeit.skills} Fertigkeiten liefern überhaupt einen Auftrag.`,
      `Determinismus: ${determ.identisch} von ${determ.codes} Codes in zwei getrennten Node-Prozessen (pids ${determ.pids.join(", ")}) identisch in Seed, Netzkennwert und Instanz-Kennwert.`,
      `Netzkennwert: 6 Zeichen, unabhängig von Schlüssel- und Kabelreihenfolge, ändert sich bei einer geänderten IP (${netz.kennwert} → ${netz.kGeaendert}), ignoriert die Laufzeit (netz.zustand).`,
      `Flow-Falle belegt: mit aktivem Flow-Stand liefert ohneFlow:false einen anderen generierten Auftrag (${instanzweg.flowFalle.generiertMitFlow.ticketId} statt ${instanzweg.flowFalle.generiertOhneFlow.ticketId}) – der Klassenraum-Weg braucht ohneFlow:true.`,
    ],
    offene: [],
    nichtGeprueft: [],
    laufzeitMs: Date.now() - t0,
  };
  fs.mkdirSync(NACHT, {recursive: true});
  fs.writeFileSync(path.join(NACHT, "A-codec.json"), JSON.stringify(aus, null, 1), "utf8");
  fs.writeFileSync(path.join(NACHT, "A-tabelle.json"), JSON.stringify({
    auftraege: tab.auftraege.map((id, i) => ({index: i, id})),
    rohReihenfolge: tab.roh.map((id, i) => ({index: i, id})),
    skills: tauglichkeit.je.map((s, i) => ({index: i, id: s.skill, tauglich: s.tauglich, ersterSeed: s.ersterSeed})),
    unterschiede: tab.unterschiede,
  }, null, 1), "utf8");
  /* Der Abbruch gehört AUCH auf die Konsole — im JSON-Block wird er beim Blick auf die letzten
     Zeilen leicht übersehen (Befund vom 09.10.2026: 56 von 58, aber eine glatte Zahl im Text). */
  const warnungen = [];
  if (kanon.hand.abgebrochen) warnungen.push(`${handKopf}.`);
  if (kanon.generiert.abgebrochen) warnungen.push(`${genKopf}.`);
  console.log(JSON.stringify({ok: true, laufzeit: aus.laufzeit, laufzeitMs: aus.laufzeitMs,
    laenge: [laenge.minLaenge, laenge.maxLaenge], roundtripFehler: laenge.fehlschlag,
    vertipper: `${vertipper.abgelehnt}/${vertipper.faelle}`,
    zufallRoh: zufall.rohGemischt.quote, zufallWohlgeformt: zufall.wohlgeformt.quote, mutationen: zufall.mutationen.quote,
    kanonHand: `${kanon.hand.tickets}/${tab.auftraege.length}${kanon.hand.abgebrochen ? " ABGEBROCHEN" : ""}`,
    kanonHandFehlend: handFehlend,
    kanonHandK0: kanon.hand.k0, kanonHandVarianten: kanon.hand.varianten, kanonHandRueckfall: kanon.hand.rueckfall,
    kanonGen: `${kanon.generiert.skills}/${tab.skills.length}${kanon.generiert.abgebrochen ? " ABGEBROCHEN" : ""}`,
    kanonGenFehlschlaege: kanon.generiert.fehlschlaege,
    fertigkeitenTauglich: `${tauglichkeit.tauglich}/${tauglichkeit.skills}`,
    zweiProzesse: `${determ.identisch}/${determ.codes}`,
    abgebrochen: warnungen.length > 0,
  }, null, 1));
  for (const w of warnungen) console.log("WARNUNG: " + w);
  if (!warnungen.length) console.log(`Vollständig: ${handKopf}; ${genKopf}.`);
}

if (process.argv[2] === "--teil1" || process.argv[2] === "--teil2") {
  const lab = start();
  teil(lab, tabellen(lab), process.argv[2] === "--teil1" ? 1 : 2);
} else {
  main();
}
