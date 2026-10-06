"use strict";
/* B-ui-a-zitate-nachziehen.js – zieht die Belegstellen auf das A-Dokument nach.
   Bereich A hat sein Dokument nach meiner ersten Fassung überarbeitet (708 -> 821 Zeilen).
   Dieses Skript bildet die alten Zeilennummern über den GIT-STAND des Dokuments auf die neuen ab:
   für jede alte Zeile wird ein wiedererkennbares Textstück gesucht und im aktuellen Dokument
   die Zeile gesucht, die es enthält. Nichts wird geraten: passt ein Stück nicht genau einmal,
   bleibt das Zitat stehen und wird gemeldet.
   Nur lesend bis auf die eine Zieldatei. Aufruf:
     node B-ui-a-zitate-nachziehen.js <zieldatei.md> [--trocken]                                  */
const fs = require("fs"), path = require("path"), cp = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const REL_A = "docs/entwicklung/Klassenraum/A – Codec und Determinismus.md";
const ziel = process.argv[2];
const trocken = process.argv.includes("--trocken");
if (!ziel) { console.error("Aufruf: node B-ui-a-zitate-nachziehen.js <zieldatei.md> [--trocken]"); process.exit(2); }

const alt = cp.execSync(`git show HEAD:"${REL_A}"`, {cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28}).split(/\r?\n/);
const neu = fs.readFileSync(path.join(ROOT, REL_A), "utf8").split(/\r?\n/);

/* Alte Zeilennummer -> neuer Text. Ein Stück muss im aktuellen Dokument genau einmal vorkommen. */
const STUECKE = {
  37:  "NL-XXXX-XX       4 Nutzzeichen",
  40:  "NL-XXXX-XX       4 Nutzzeichen",
  44:  "immer genau 10 Zeichen",
  47:  "toUpperCase()",
  50:  "alles außer `[0-9A-Z]` entfernen",
  128: "Rückgabe ist immer `{fehler:",
  359: "function netzkennwert(netz)",
  364: "return s;",
  381: "kein** Prüfmittel gegen Manipulation",
  385: "Flow-Regler.**",
  391: "ohneFlow: true` setzen",
  410: "Sitzung aus `store \"klassenraum\"`",
  414: "`exportieren()`",
  448: "const c = Spiel.klassenraum.ausCode(eingabe)",
  457: "Spiel.oeffnen(inst.iid);",
  471: "**`ergebnisCode(inst, abnahme)`**",
  476: "| `ergebnisCode` |",
  486: "**`ergebnisEintragen(code)` – idempotent**",
  489: "derselbe Code noch einmal",
  501: "**`platzkennung` (Leiter-Hinweis 4):**",
  513: "E-XXXX-XXX      5 Nutzzeichen",
  520: "| `platz` | 5 | 0..31",
  521: "| `sterne` | 4 | 0..10",
  522: "| `versuche` | 2 | 0..3",
  523: "| `dauer` | 9 | 0..511",
  533: "für eine Ampel mit Median-Dauer",
  537: "Round-Trip ergibt",
  547: "gehört zu Sitzung 7 – hier läuft Sitzung 6",
  549: "Tippfehler im Ergebniscode",
  558: "```json",
  576: "| `sitzung.ergebnisse` |",
  601: "| `platz` | 0..31",
  605: "Gemessene Feldliste von `erzeugen`",
  606: "`art, code, dauerMin",
  610: "```json",
  612: "\"format\": \"netzwerk-labor/klassenraum\"",
  627: "neuere Fassung (Stand 2)",
  635: "Die Datei ist leer.",
  637: "Das ist keine Klassenraum-Datei (format fehlt)",
  640: "In der Datei fehlt die Sitzung",
  643: "`{format, fassung:1, programm:\"1.0.0\", sitzung}`",
};

/* Alte Zeilennummern aus dem aktuellen Dokument einsammeln und ersetzen. */
const text = fs.readFileSync(ziel, "utf8");
const MUSTER = /(A – Codec und Determinismus\.md):(\d+)(?:\s*[-–]\s*(\d+))?/g;
const treffer = [...text.matchAll(MUSTER)];
const neuText = text.replace(MUSTER, (ganz, datei, a, b) => {
  const von = +a, bis = b ? +b : +a;
  const teile = [];
  for (let z = von; z <= bis; z++) {
    const stueck = STUECKE[z];
    if (!stueck) { teile.push(null); continue; }
    const kandidaten = [];
    neu.forEach((zeile, i) => { if (zeile.includes(stueck)) kandidaten.push(i + 1); });
    teile.push(kandidaten.length === 1 ? kandidaten[0] : null);
    if (kandidaten.length !== 1) console.log(`  UNKLAR alt :${z} [${stueck}] -> ${kandidaten.length} Treffer`);
  }
  if (teile.some(t => t === null)) return ganz;                    /* unverändert lassen */
  const a2 = teile[0], b2 = teile[teile.length - 1];
  return datei + ":" + a2 + (bis > von ? "-" + b2 : "");
});
const offen = [...neuText.matchAll(MUSTER)].length;
console.log(`A-Zitate im Dokument: ${treffer.length} Nennungen -> ${offen} danach`);
console.log(`Ersetzt: ${text === neuText ? 0 : "ja"}${trocken ? " (Trockenlauf, nichts geschrieben)" : ""}`);
if (!trocken) fs.writeFileSync(ziel, neuText, "utf8");
