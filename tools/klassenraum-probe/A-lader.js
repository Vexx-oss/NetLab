"use strict";
/* ---------- Bereich A: gemeinsamer Lader für die headless Proben ----------
   Lädt genau wie tests/run.js (dieselbe Reihenfolge, dieselbe Lernmotor-Regel) alle
   headless-fähigen Module in EINEN vm-Kontext und gibt ihn samt Namensräumen zurück.
   Kein npm, nur Node-Bordmittel. Kein DOM, keine Schreibvorgänge.

   Reihenfolge (tests/run.js:23-37):
     kern/basis.js, kern/netz.js, (Lernmotor), modell/geraete.js, sim/engine.js,
     cli/parser.js, daten/basis.js, spiel/zustand.js, dann übrige spiel/*.js alphabetisch.

   Benutzung:
     const {kontext, lauf, WURZEL} = require("./A-lader.js");
     const lab = kontext();                 // Module geladen, Kontext steht
     lab.Spiel._trocken = true;             // nichts melden, nichts speichern
     lab.jetzt.setzen(1759706400000);       // feste Uhr für reproduzierbare Messungen
*/
const fs = require("fs"), path = require("path"), vm = require("vm");

const WURZEL = path.resolve(__dirname, "..", "..");
const SRC = path.join(WURZEL, "src");

/* Gleiche Lernmotor-Regel wie tests/run.js und bauen.py: Spielhalle daneben hat Vorrang, sonst die Kopie im Repo. */
const LERNMOTOR_QUELLE = path.resolve(WURZEL, "..", "FISI-Spielhalle", "src", "lernmotor.js");
const LERNMOTOR_KOPIE = path.join(WURZEL, "fremd", "lernmotor.js");
const KOPF = /^\/\*\s*=+[\s\S]*?=+\s*\*\/\s*/;

function lernmotor() {
  if (fs.existsSync(LERNMOTOR_QUELLE)) return {pfad: LERNMOTOR_QUELLE, kopie: false};
  if (fs.existsSync(LERNMOTOR_KOPIE)) return {pfad: LERNMOTOR_KOPIE, kopie: true};
  throw new Error("Kein Lernmotor gefunden: weder " + LERNMOTOR_QUELLE + " noch " + LERNMOTOR_KOPIE);
}

/* Schichten wie tests/run.js: [Ordner, Kopfdateien, Schlussdateien] */
const SCHICHTEN = [
  ["kern", ["basis.js", "netz.js"], []], ["@lernmotor", [], []], ["modell", ["geraete.js"], []],
  ["sim", ["engine.js"], []], ["cli", ["parser.js"], []], ["daten", ["basis.js"], []], ["spiel", ["zustand.js"], []],
];

function modulliste() {
  const liste = [];
  for (const [ordner, kopf, schluss] of SCHICHTEN) {
    if (ordner === "@lernmotor") { liste.push(LM.pfad); continue; }
    const d = path.join(SRC, ordner);
    if (!fs.existsSync(d)) continue;
    const alle = fs.readdirSync(d).filter(n => n.endsWith(".js")).sort();
    const reihe = [...kopf.filter(n => alle.includes(n)), ...alle.filter(n => !kopf.includes(n) && !schluss.includes(n)), ...schluss.filter(n => alle.includes(n))];
    for (const n of reihe) liste.push(path.join(d, n));
  }
  return liste;
}
const LM = lernmotor();

function inhalt(f) {
  const t = fs.readFileSync(f, "utf8");
  return f === LM.pfad && LM.kopie ? t.replace(KOPF, "") : t;
}

/* Kontext bauen; `zusatz` wird als weiteres Skript im selben Kontext ausgeführt und bekommt den Namensraum `LAB`. */
function kontext(zusatz) {
  const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl});
  const code = [`"use strict"; const LABOR_VERSION = "probe"; const LABOR_BAU = "A-codec";`];
  for (const f of modulliste()) code.push(`/* ${path.relative(WURZEL, f)} */\n` + inhalt(f));
  code.push("var __LAB__ = {Spiel, DATEN, Zufall, Modell, Sim, L, jetzt, store, tief, LABOR_VERSION, LABOR_BAU, Bus, IP};");
  try { vm.runInContext(code.join("\n;\n"), ctx, {filename: "A-lader.js"}); }
  catch (e) { throw new Error("LADEFEHLER beim Laden der Module: " + (e && e.stack || e)); }
  ctx.__LAB__.module = modulliste().map(f => path.relative(WURZEL, f));
  if (zusatz) ctx.__LAB__.lauf = (quelltext, name) => vm.runInContext(`(function(){${quelltext}\n})()`, ctx, {filename: name || "A-lauf"});
  LETZTER = ctx.__LAB__;                  /* für Proben, die denselben Speicher wie ein Prüfling brauchen */
  return ctx.__LAB__;
}

/* Der zuletzt gebaute Kontext (jeder kontext()-Aufruf liefert einen NEUEN Kontext mit EIGENEM store —
   wer den Speicher eines bereits geladenen Prüflings untersuchen will, muss diesen hier holen,
   sonst prüft er einen zweiten, leeren Speicher. Beim Bau von A-pruef-api.js genau so aufgefallen.) */
let LETZTER = null;
function letzterKontext() { return LETZTER; }

/* Nur die Modulliste (ohne Laden) – für Berichte. (Achtung: NICHT `module` nennen – das verdeckt das
   CommonJS-`module` und die Exporte landen ins Leere; genau dieser Fehler ist beim ersten Lauf aufgefallen.) */
function dateiliste() { return modulliste().map(f => path.relative(WURZEL, f)); }

module.exports = {kontext, letzterKontext, dateiliste, WURZEL, SRC, lernmotor: LM};
