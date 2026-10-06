"use strict";
/* B-ui-zitate-pruefen.js – liest ein Dokument, sammelt alle Datei:Zeile-Belege und prüft,
   ob die genannte Datei existiert und die Zeile gibt.
   Nur lesend. Aufruf: node B-ui-zitate-pruefen.js <Dokument> [--zeigen]
   Von Bereich B (Klassenraum) angelegt; gehört NICHT zum Spiel, sondern zur Nachweisführung. */
const fs = require("fs"), path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const datei = process.argv[2];
if (!datei) { console.error("Aufruf: node B-ui-zitate-pruefen.js <Dokument> [--zeigen]"); process.exit(2); }
const zeigen = process.argv.includes("--zeigen");
const text = fs.readFileSync(datei, "utf8");

/* Endungen, die als Beleg zählen; :12 oder :12-34 oder :12-14, :44-46 */
const ENDUNG = "(?:js|css|md|py|json|html|rs|toml|txt|sh|ps1|cmd|bat)";
/* Zeichenbereich enthält bewusst die Gedankenstriche – die Datei „A – Codec und Determinismus.md"
   trägt einen im Namen. */
const MUSTER = new RegExp("([A-Za-z0-9_.\\-\\u00c0-\\u017f\\u2013\\u2014/\\\\ ]{2,140}?\\." + ENDUNG + "):(\\d+)(?:\\s*[-\\u2013\\u2014]\\s*(\\d+))?", "g");

const treffer = new Map();      /* datei -> Set(zeilen) */
let nennungen = 0;
for (const m of text.matchAll(MUSTER)) {
  let p = m[1].trim().replace(/^[(`*„"'\s]+/, "").replace(/\\/g, "/");
  /* Nur der Dateiname/relativer Pfad – führende Beschriftungen abschneiden */
  p = p.replace(/^(?:Datei|siehe|vgl\.?|Muster|Zeile|in)\s+/i, "");
  const von = +m[2], bis = m[3] ? +m[3] : von;
  if (!treffer.has(p)) treffer.set(p, new Set());
  for (let z = von; z <= bis; z++) treffer.get(p).add(z);
  nennungen++;
}

/* Bekannte Abkürzungen auf echte Pfade abbilden */
const KURZ = {
  "plattform-browser.js": "src/plattform/plattform-browser.js",
  "plattform-tauri.js": "src/plattform/plattform-tauri.js",
  "A – Codec und Determinismus.md": "docs/entwicklung/Klassenraum/A – Codec und Determinismus.md",
  "KLASSENRAUM.md": "tools/auftraege/KLASSENRAUM.md",
  "COMMON.md": "tools/auftraege/COMMON.md",
  "AGENTS.md": "AGENTS.md",
  "Liesmich.md": "docs/entwicklung/Klassenraum/Liesmich.md",
  "bauen.py": "bauen.py",
};
const kandidaten = p => {
  const l = [];
  if (KURZ[p]) l.push(KURZ[p]);
  if (p.startsWith("src/") || p.startsWith("docs/") || p.startsWith("tools/") || p.startsWith("tests/")) l.push(p);
  l.push(path.join("src/stil", p), path.join("src/ui", p), path.join("src/spiel", p), path.join("src/kern", p),
         path.join("src/plattform", p), path.join("src/daten", p), path.join("src/cli", p), path.join("src/sim", p),
         path.join("src/modell", p), path.join("tools", p), path.join("tests", p), p);
  return l;
};

let gut = 0, fehlendeDatei = [], zuKurz = [];
const bericht = [];
for (const [p, zeilen] of [...treffer.entries()].sort()) {
  const gefunden = kandidaten(p).map(k => path.join(ROOT, k)).find(k => fs.existsSync(k) && fs.statSync(k).isFile());
  if (!gefunden) { fehlendeDatei.push(p + " (" + zeilen.size + " Zeilenangaben)"); continue; }
  const anzahl = fs.readFileSync(gefunden, "utf8").replace(/\n$/, "").split(/\r?\n/).length;
  const drueber = [...zeilen].filter(z => z > anzahl).sort((a, b) => a - b);
  if (drueber.length) zuKurz.push(`${path.relative(ROOT, gefunden)} hat ${anzahl} Zeilen, zitiert: ${drueber.join(", ")}`);
  else gut++;
  bericht.push({datei: path.relative(ROOT, gefunden), zitate: zeilen.size, zeilen: anzahl});
}

bericht.sort((a, b) => b.zitate - a.zitate);
if (zeigen) for (const b of bericht) console.log(`  ${String(b.zitate).padStart(4)} Belege  ${b.datei}  (${b.zeilen} Zeilen)`);
console.log(`\nZitate: ${nennungen} Nennungen in ${treffer.size} Dateien`);
console.log(`  Dateien mit Belegen, alle Zeilen vorhanden: ${gut}`);
console.log(`  Unbekannte Datei: ${fehlendeDatei.length}`);
for (const s of fehlendeDatei) console.log("    " + s);
console.log(`  Zeile hinter dem Dateiende: ${zuKurz.length}`);
for (const s of zuKurz) console.log("    " + s);
process.exit(fehlendeDatei.length + zuKurz.length ? 1 : 0);
