"use strict";
/* ---------- Bereich A: Aufklärung (Recon) ----------
   Zählt Tickets/Tabellen, prüft den Lader und misst die Laufzeit der Seed-Fassungen.
   Kein Bestandteil der Abgabe-Messung, sondern Vorarbeit für die Festlegung.
   Aufruf:  & "<node>" tools\klassenraum-probe\A-recon.js
*/
const {kontext} = require("./A-lader.js");
const lab = kontext();
const {Spiel, DATEN, jetzt, Zufall} = lab;

Spiel._trocken = true;                       /* nichts melden, nichts speichern */
jetzt.setzen(1759706400000);                 /* feste Uhr: 2026-10-06 00:00:00 UTC (nur Uhr, kein Datum im Code) */
Spiel._st = Spiel.leererStand();
Spiel._lz = {};

const reihe = Spiel.ticketReihe();
const roh = DATEN.tickets;
const mini = roh.filter(t => t.art === "mini");
const wartung = roh.filter(t => t.art === "wartung");
const entwurf = roh.filter(t => t.entwurf);
const terminal = roh.filter(t => t.art === "terminal");

console.log(JSON.stringify({
  module: lab.module.length,
  ticketsRoh: roh.length,
  ticketReihe: reihe.length,
  mini: mini.length, wartung: wartung.length, entwurf: entwurf.length, terminal: terminal.length,
  skills: DATEN.skills.length,
  ersteIdsRoh: roh.slice(0, 5).map(t => t.id),
  ersteIdsReihe: reihe.slice(0, 5).map(t => t.id),
  reiheGleichRoh: reihe.map(t => t.id).join("|") === roh.map(t => t.id).join("|"),
  ticketArtVerteilung: roh.reduce((m, t) => { m[t.art || "stoerung"] = (m[t.art || "stoerung"] || 0) + 1; return m; }, {}),
}, null, 1));

/* Laufzeit der Seed-Fassung für ein Ticket (erste Messung: wie teuer ist fuerSeed + ticketGueltig?) */
const t0 = Date.now();
const id = reihe[0].id;
const def = Spiel.ticketDef(id);
let eigene = 0, zurueck = 0;
for (let v = 0; v < 16; v++) {
  const s = v + 1;
  const d = def.fuerSeed(s);
  if (d !== def) eigene++; else zurueck++;
}
console.log("fuerSeed 16 Varianten von", id, "→ eigene:", eigene, "Rückfall:", zurueck, "in", Date.now() - t0, "ms");

/* Generator: ein Skill, ein Seed */
const t1 = Date.now();
try {
  const g = Spiel.generiere(DATEN.skills[0].id, 7);
  console.log("generiere(skill,7) →", g.id, "gueltig:", Spiel.ticketGueltig(g), "in", Date.now() - t1, "ms", "fehlerstellen:", (g.fehlerstellen || []).length);
} catch (e) { console.log("generiere(skill,7) warf:", String(e && e.message || e), "in", Date.now() - t1, "ms"); }

/* Netzgestalt: welche Schlüssel hat ein Netz? (für den Netzkennwert) */
const n = Spiel.startNetz(Spiel.ticketDef(reihe[0].id), 3);
console.log("netz-Schlüssel:", Object.keys(n));
console.log("geraet-Schlüssel:", Object.keys(n.geraete[Object.keys(n.geraete)[0]]));
