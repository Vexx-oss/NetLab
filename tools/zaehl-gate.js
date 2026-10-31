"use strict";
/* ZAHL-GATE (QUA-04, 3.0) — die Testzahl des Laufs muss zur Bilanz in docs/STAND.md passen.
   Befund Q5 (berichte/qualitaet.md): sieben Abnahmetests verschwanden still, sobald eine API
   fehlte; der Lauf meldete eine kleinere Zahl und blieb gruen. tools/stand.py --pruefen haette
   es bemerkt, lief aber nicht in tools/test.sh. Dieses Gate schliesst die Luecke lokal:
     node tools/zaehl-gate.js --bilanz <lauf.log> [--stand docs/STAND.md]
   Es liest die BILANZ-Zeile des Laufs und den STAND:ZAHLEN-Block aus docs/STAND.md.
   Exit 0 = gleich · Exit 1 = Abweichung (mit ist/soll) · Exit 2 = Aufruf-/Lesefehler. */
const fs = require("fs"), path = require("path");
const WURZEL = path.resolve(__dirname, "..");
const STAND = path.join(WURZEL, "docs", "STAND.md");

/* Die Bilanzzeile des Testlaufs: "1095/1111 grün  (127 Testdateien, 98 Module)" (auch mit ", N ROT"). */
function bilanzZahlen(text) {
  const zeilen = String(text == null ? "" : text).split(/\r?\n/);
  for (let i = zeilen.length - 1; i >= 0; i--) {
    const m = /^\s*(\d+)\/(\d+) grün(?:\s*,\s*(\d+) ROT)?\s*\((\d+) Testdateien,\s*(\d+) Module\)/.exec(zeilen[i]);
    if (m) return {gezeigt: Number(m[1]), gesamt: Number(m[2]), rot: m[3] == null ? 0 : Number(m[3]),
                   testdateien: Number(m[4]), module: Number(m[5])};
  }
  return null;
}

/* Der verborgene Zahlenblock in docs/STAND.md: <!-- STAND:ZAHLEN {...} --> */
function standZahlen(text) {
  const m = /<!--\s*STAND:ZAHLEN\s+(\{[\s\S]*?\})\s*-->/.exec(String(text == null ? "" : text));
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (e) { return null; }
}

/* Vergleicht Bilanz gegen STAND. Rueckgabe {ok, ist, soll, gruende, hinweisModule}. */
function zaehle(bilanzText, standText) {
  const gruende = [];
  const ist = bilanzZahlen(bilanzText);
  if (!ist) gruende.push("keine Bilanzzeile gefunden (Muster: N/M grün (T Testdateien, H Module)) — das ist kein Testlauf.");
  const zahlen = standZahlen(standText);
  if (!zahlen) gruende.push("kein STAND:ZAHLEN-Block in docs/STAND.md gefunden.");
  const soll = zahlen && zahlen.tests
    ? {gesamt: zahlen.tests.gesamt, testdateien: zahlen.tests.testdateien, module: zahlen.tests.headless}
    : null;
  if (ist && soll) {
    if (ist.gesamt !== soll.gesamt) {
      gruende.push("Tests: gemessen " + ist.gesamt + ", docs/STAND.md sagt " + soll.gesamt + " — stilles Verschwinden oder ungezaehltes Hinzukommen ist kein gruener Lauf.");
    }
    if (ist.testdateien !== soll.testdateien) {
      gruende.push("Testdateien: gemessen " + ist.testdateien + ", docs/STAND.md sagt " + soll.testdateien + ".");
    }
  }
  const hinweisModule = ist && soll && ist.module !== soll.module
    ? "Hinweis (kein Gate): Module gemessen " + ist.module + ", STAND headless " + soll.module + " — STAND nach src-Aenderungen neu ziehen."
    : null;
  return {ok: gruende.length === 0, ist, soll, gruende, hinweisModule};
}

function main() {
  const args = process.argv.slice(2);
  const iBilanz = args.indexOf("--bilanz"), iStand = args.indexOf("--stand");
  if (iBilanz < 0 || !args[iBilanz + 1]) {
    console.error("AUFRUF: node tools/zaehl-gate.js --bilanz <lauf.log> [--stand docs/STAND.md]");
    process.exit(2);
  }
  const bilanzDatei = path.resolve(args[iBilanz + 1]);
  const standDatei = iStand >= 0 && args[iStand + 1] ? path.resolve(args[iStand + 1]) : STAND;
  let bilanzText, standText;
  try { bilanzText = fs.readFileSync(bilanzDatei, "utf8"); }
  catch (e) { console.error("FEHLER: Bilanzdatei nicht lesbar: " + bilanzDatei); process.exit(2); }
  try { standText = fs.readFileSync(standDatei, "utf8"); }
  catch (e) { console.error("FEHLER: STAND-Datei nicht lesbar: " + standDatei); process.exit(2); }
  const r = zaehle(bilanzText, standText);
  if (r.hinweisModule) console.log(r.hinweisModule);
  if (!r.ok) {
    for (const g of r.gruende) console.error("ZAHL-GATE ROT: " + g);
    console.error("Die Testzahl weicht von docs/STAND.md ab. Nach beabsichtigten Aenderungen zieht gates im Messfenster \"python tools/stand.py\"; ungeplant heißt: ein Test ist still verschwunden (Befund Q5).");
    process.exit(1);
  }
  console.log("ZAHL-GATE GRÜN: " + r.ist.gesamt + " Tests und " + r.ist.testdateien + " Testdateien — wie docs/STAND.md.");
}

if (require.main === module) main();
module.exports = {zaehle, bilanzZahlen, standZahlen};
