"use strict";
/* JS-SYNTAX-GATE (QUA-01, 3.0) — parst JEDE JavaScript-Datei aus dem Produktivbaum und alle
   Testdateien. Befund Q2 (berichte/qualitaet.md): bisher prüfte nur das Namens-Gate
   (tools/pruefe-namen-flicken.js) die Testdateien mit node --check; die JS-Dateien unter src/
   parste kein Gate, ein Syntaxfehler in einer nie geladenen UI-Datei passierte die ganze CI.

   Nutzung:
     node tools/syntax.js                  # Standard: alle JS unter src/ + alle tests/*.test.js
     node tools/syntax.js DATEI [DATEI…]   # einzelne Dateien (Gegenprobe, Prüfkopie)
   Exit: 0 = alle Dateien parsen · 1 = mindestens ein Syntaxfehler (Datei:Zeile auf stderr)
         · 2 = keine Datei gefunden (dann ist der Lauf nicht grün, sondern leer)

   Ein Node-Prozess statt 260 × node --check: vm.Script nutzt dieselbe Grammatik wie node --check,
   kostet aber Millisekunden statt Sekunden. */
const fs = require("fs"), path = require("path"), vm = require("vm");
const WURZEL = path.resolve(__dirname, "..");
const SRC = path.join(WURZEL, "src");
const TESTS = path.join(WURZEL, "tests");

/* Alle .js-Dateien unter einem Ordner, sortiert (deterministisch). */
function sammleJs(ordner) {
  const liste = [];
  (function rek(dir) {
    let eintraege;
    try { eintraege = fs.readdirSync(dir, {withFileTypes: true}); }
    catch (e) { return; }
    for (const e of eintraege.sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) rek(p);
      else if (e.name.endsWith(".js")) liste.push(p);
    }
  })(ordner);
  return liste;
}

/* Der Standardumfang des Gates: src-Baum + alle Testdateien (tests/*.test.js). */
function sammleStandard() {
  const src = sammleJs(SRC);
  let tests = [];
  try { tests = fs.readdirSync(TESTS).filter(n => n.endsWith(".test.js")).sort().map(n => path.join(TESTS, n)); }
  catch (e) { tests = []; }
  return {src, tests, alle: src.concat(tests)};
}

/* Parst jede Datei als CommonJS-Skript (wie node --check) und sammelt Fehler mit Zeile. */
function pruefeDateien(dateien) {
  const fehler = [];
  let geprueft = 0;
  for (const datei of dateien) {
    let text;
    try { text = fs.readFileSync(datei, "utf8"); }
    catch (e) { fehler.push({datei, zeile: 0, meldung: "nicht lesbar: " + String((e && e.message) || e)}); continue; }
    geprueft++;
    try { new vm.Script(text, {filename: datei}); }
    catch (e) {
      const st = String((e && e.stack) || "");
      const erste = st.split("\n")[0] || "";
      const m = /^(.*):(\d+)$/.exec(erste);
      const name = String((e && e.name) || "SyntaxError");
      fehler.push({datei: m ? m[1] : datei, zeile: m ? Number(m[2]) : 0,
                   meldung: name + ": " + String((e && e.message) || e)});
    }
  }
  return {geprueft, fehler};
}

function kurz(datei) {
  const rel = path.relative(WURZEL, datei);
  return rel && !rel.startsWith("..") ? rel : datei;
}

function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
  const standard = sammleStandard();
  const dateien = args.length ? args.map(a => path.resolve(a)) : standard.alle;
  if (!dateien.length) {
    console.error("FEHLER: keine JS-Datei gefunden — Standardumfang leer. Das ist kein grüner Lauf.");
    process.exit(2);
  }
  const r = pruefeDateien(dateien);
  if (r.fehler.length) {
    for (const f of r.fehler) console.error("SYNTAXFEHLER " + kurz(f.datei) + ":" + f.zeile + " — " + f.meldung);
    console.error("\n" + r.fehler.length + " von " + dateien.length + " Datei(en) mit Syntaxfehler. Das ist kein grüner Lauf.");
    process.exit(1);
  }
  const umfang = args.length ? "" : " (davon " + standard.src.length + " src, " + standard.tests.length + " Testdateien)";
  console.log(dateien.length + " JS-Datei(en) geparst" + umfang + ", 0 Syntaxfehler.");
}

if (require.main === module) main();
module.exports = {pruefeDateien, sammleStandard, sammleJs};
