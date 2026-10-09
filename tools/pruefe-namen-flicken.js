"use strict";
/* Reparaturwerkzeug für die typografische Anführungszeichen-Falle (Lead, 07.10.2026).
 *
 * WARUM ES DIESES SKRIPT GIBT
 * In diesem Projekt sind Testnamen deutsch und enthalten typografische Anführungszeichen
 * („ “ U+201E/U+201C). Steht ein solcher Name in ASCII-Doppelquotes ("…„Text“…"), endet der
 * JS-String beim ersten inneren `"` und die Datei lädt nicht mehr — `node tests/run.js` bricht
 * dann mit LADEFEHLER (Exit 2) ab, und die GESAMTE Testsuite steht still. Das ist am 07.10.2026
 * dreimal passiert (tests/spiel-stufensystem.test.js, tests/pruefung-hilfestellung.test.js).
 *
 * WAS ES TUT
 * Es sucht `pruefe("…")`-Aufrufe, deren String ein typografisches „ oder “ enthält, und setzt
 * diesen String auf einfache Anführungszeichen um ('…'). Einfache Anführungszeichen sind in
 * deutschen Testnamen unproblematisch, weil das Apostroph dort nicht vorkommt. Der Text selbst
 * wird Zeichen für Zeichen übernommen — nichts wird umformuliert.
 *
 * BENUTZUNG (immer erst Trockenlauf, dann --setzen):
 *   node tools/pruefe-namen-flicken.js tests/mein-test.test.js            # zeigt nur, was es täte
 *   node tools/pruefe-namen-flicken.js tests/mein-test.test.js --setzen   # schreibt
 * Ohne Dateiargument prüft es ALLE tests/*.test.js und meldet, welche nicht laden (`node --check`).
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const WURZEL = path.resolve(__dirname, "..");
const TESTS = path.join(WURZEL, "tests");

/* Ein pruefe(...)-Aufruf mit ASCII-Doppelquotes, der NUR deswegen hält, weil das typografische „…“
   innen steht. Enthält der Name ein escaped `\"`, ist der String bewusst zusammengesetzt und in
   Ordnung — den fassen wir nicht an. Gemessen 07.10.2026: von 46 Testdateien brauchen nur die
   defekten eine Umsetzung; alle anderen laden, weil sie `\"` verwenden. */
function faelle(text) {
  const treffer = [];
  const re = /pruefe\((\s*)"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const inhalt = m[2];
    if (inhalt.includes('\\"')) continue;                       /* bewusst escaped: nicht anfassen */
    if (!/[\u201E\u201C\u201A\u2018]/.test(inhalt)) continue;    /* ohne typografisches Zeichen: kein Fall */
    treffer.push({start: m.index, ende: m.index + m[0].length, alt: m[0], inhalt});
  }
  return treffer;
}

/* Ersetzt von HINTEN nach VORN, damit die Positionen gültig bleiben. Ein Apostroph im Namen
   würde das Ergebnis zerstören — dann lieber melden als kaputt schreiben. */
function flicken(text) {
  const liste = faelle(text);
  const probleme = liste.filter(f => f.inhalt.includes("'"));
  if (probleme.length) return {text, anzahl: 0, probleme: probleme.map(f => f.inhalt)};
  let neu = text;
  for (const f of liste.slice().reverse()) {
    neu = neu.slice(0, f.start) + "pruefe(" + " '" + f.inhalt + "'" + neu.slice(f.ende);
  }
  return {text: neu, anzahl: liste.length, probleme: []};
}

function ladbar(datei) {
  try { execFileSync(process.execPath, ["--check", datei], {stdio: "pipe"}); return true; }
  catch (e) { return String(e.stderr || e.stdout || "").split("\n").filter(z => z.includes(".js:")).slice(0, 2).join(" | "); }
}

function main() {
  const args = process.argv.slice(2);
  const setzen = args.includes("--setzen");
  const dateien = args.filter(a => !a.startsWith("--"));
  const liste = dateien.length
    ? dateien.map(d => path.resolve(d))
    : fs.readdirSync(TESTS).filter(n => n.endsWith(".test.js")).map(n => path.join(TESTS, n));

  let geflickt = 0, kaputt = [];
  for (const datei of liste) {
    if (!fs.existsSync(datei)) { console.log("FEHLT: " + datei); continue; }
    const text = fs.readFileSync(datei, "utf8");
    const {text: neu, anzahl, probleme} = flicken(text);
    const rel = path.relative(WURZEL, datei);
    if (probleme.length) {
      console.log("ACHTUNG " + rel + ": " + probleme.length + " Name(n) enthalten ein Apostroph — von Hand prüfen:");
      for (const p of probleme) console.log("    " + p);
    }
    if (anzahl) {
      console.log((setzen ? "flicke " : "würde flicken ") + rel + ": " + anzahl + " pruefe()-Name(n)");
      if (setzen) { fs.writeFileSync(datei, neu, "utf8"); geflickt++; }
    }
    if (setzen || !anzahl) {
      const fehler = ladbar(datei);
      if (fehler !== true) { kaputt.push(rel + " — " + fehler); console.log("LÄDT NICHT " + rel + ": " + fehler); }
    }
  }
  console.log("\n" + liste.length + " Datei(en) geprüft, " + geflickt + " geschrieben, " + kaputt.length + " laden nicht.");
  if (kaputt.length) { console.log("Nicht ladbar:\n  " + kaputt.join("\n  ")); process.exit(1); }
}

main();
