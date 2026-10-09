"use strict";
/* Headless-Testlauf:  wsl -d Ubuntu -- node tests/run.js [filter]
   Lädt alle headless-fähigen Module (Reihenfolge wie bauen.py) in einen gemeinsamen vm-Kontext,
   dann tests/harness.js und alle tests/*.test.js. Kein npm, nur Node-Bordmittel. */
const fs = require("fs"), path = require("path"), vm = require("vm");
const WURZEL = path.resolve(__dirname, ".."), SRC = path.join(WURZEL, "src");

/* Der Lernmotor wird mit Netzwerk-Labor und FISI-Spielhalle geteilt. Liegt die Spielhalle
   daneben, hat sie Vorrang; sonst greift die Kopie im Repositorium (fremd/lernmotor.js).
   Ohne diesen Rückfall wäre der Testlauf in einem frischen Klon (und auf GitHub) nicht
   lauffähig — die Datei läge außerhalb des Repositoriums. Ihr Herkunftskopf wird
   abgeschnitten, damit beide Wege dieselbe Quelle laden. Gleiche Logik wie in bauen.py. */
const LERNMOTOR_QUELLE = path.resolve(WURZEL, "..", "FISI-Spielhalle", "src", "lernmotor.js");
const LERNMOTOR_KOPIE = path.join(WURZEL, "fremd", "lernmotor.js");
function lernmotor() {
  if (fs.existsSync(LERNMOTOR_QUELLE)) return { pfad: LERNMOTOR_QUELLE, kopie: false };
  if (fs.existsSync(LERNMOTOR_KOPIE)) return { pfad: LERNMOTOR_KOPIE, kopie: true };
  throw new Error("Kein Lernmotor gefunden: weder " + LERNMOTOR_QUELLE + " noch " + LERNMOTOR_KOPIE);
}
const LM = lernmotor();
const KOPF = /^\/\*\s*=+[\s\S]*?=+\s*\*\/\s*/;

const SCHICHTEN = [
  ["kern", ["basis.js", "netz.js"], []], ["@lernmotor", [], []], ["modell", ["geraete.js"], []],
  ["sim", ["engine.js"], []], ["cli", ["parser.js"], []], ["daten", ["basis.js"], []], ["spiel", ["zustand.js"], []],
];
function module(){
  const liste = [];
  for (const [ordner, kopf, schluss] of SCHICHTEN) {
    if (ordner === "@lernmotor") { liste.push(LM.pfad); continue; }
    const d = path.join(SRC, ordner); if (!fs.existsSync(d)) continue;
    const alle = fs.readdirSync(d).filter(n => n.endsWith(".js")).sort();
    const reihe = [...kopf.filter(n => alle.includes(n)), ...alle.filter(n => !kopf.includes(n) && !schluss.includes(n)), ...schluss.filter(n => alle.includes(n))];
    for (const n of reihe) liste.push(path.join(d, n));
  }
  return liste;
}
function inhalt(f) {
  const t = fs.readFileSync(f, "utf8");
  return f === LM.pfad && LM.kopie ? t.replace(KOPF, "") : t;
}
/* Der Testbereich bekommt `require`, `__dirname` und `__filename` mit: dadurch kann eine Testdatei
   eine Datei aus `src/ui/` (oder einer anderen nicht-headless Schicht) selbst nachladen und genau die
   Datei prüfen, die im Programm läuft. Ohne sie ist `typeof require === "undefined"` und ein Test, der
   eine UI-Datei laden will, nimmt fälschlich einen Browser-Zweig. Gemessen und begründet von
   `lernstand-hilfe` am 07.10.2026 (tests/run.js:42 war die Ursache von drei roten Tests).
   Die Schichten mit `headless = False` werden weiterhin NICHT automatisch geladen — die UI-Schicht
   braucht `document`, und tests.html enthält sie nicht. */
const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename});
const code = [`"use strict"; const LABOR_VERSION = "test";`];
for (const f of module()) code.push(`/* ${path.relative(WURZEL, f)} */\n` + inhalt(f));
code.push(fs.readFileSync(path.join(__dirname, "harness.js"), "utf8"));
const filter = process.argv[2] || "";
const testdateien = fs.readdirSync(__dirname).filter(n => n.endsWith(".test.js")).sort();
for (const n of testdateien) code.push(`/* tests/${n} */\n` + fs.readFileSync(path.join(__dirname, n), "utf8"));
code.push(`testsAusfuehren();`);
let ergebnisse;
try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "labor-tests.js"}); }
catch (e) { console.error("LADEFEHLER:", e && e.stack || e); process.exit(2); }
const gezeigt = ergebnisse.filter(e => !filter || e.name.toLowerCase().includes(filter.toLowerCase()));
let fehler = 0;
for (const e of gezeigt) {
  if (e.ok) console.log(`✓ ${e.name}${e.ms > 300 ? `  (${e.ms} ms)` : ""}`);
  else { fehler++; console.log(`✗ ${e.name}\n    ${e.fehler.replace(/\n/g, "\n    ")}`); }
}
console.log(`\n${gezeigt.length - fehler}/${gezeigt.length} grün${fehler ? `, ${fehler} ROT` : ""}  (${testdateien.length} Testdateien, ${module().length} Module)`);
process.exit(fehler ? 1 : 0);
