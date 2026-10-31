"use strict";
/* NAMENS-GATE (QUA-05, 3.0) — findet die Anführungszeichen-Falle OHNE Fehlalarme.
 *
 * WARUM (belegt): In diesem Projekt sind Testnamen deutsch und enthalten typografische
 * Anführungszeichen („ “ U+201E/U+201C). Steht so ein Name in ASCII-Doppelquotes ("…„Text“…"),
 * endet der JS-String beim inneren `"` — die Datei lädt nicht mehr, tests/run.js bricht mit
 * LADEFEHLER (Exit 2) ab, die ganze Suite steht. Am 07.10./09.10.2026 mehrfach passiert.
 *
 * WAS 3.0 ANDERS IST (Befund Q6, berichte/qualitaet.md):
 *   · Die alte Heuristik flaggte jede Zeile mit U+201E/U+201C — 75 Fehlalarme in 33 Dateien,
 *     obwohl harmlose typografische Zeichen in korrekten Strings keinen Lauf brechen.
 *   · Sie prüfte nur `pruefe(...)`-Namen, nicht die Texte in `erwarte(...)` (dort schlug die
 *     Falle zweimal zu).
 *   · Sie startete für JEDE Datei einen eigenen `node --check` (30 s).
 * Jetzt gilt: EIN Node-Prozess parst alle Testdateien (Baustein tools/syntax.js). Ein Fund ist
 * nur noch, was die Datei wirklich NICHT laden lässt; die Falle wird an der Bruchstelle als
 * Datei:Zeile benannt und ist in `pruefe(...)` UND `erwarte(...)` dieselbe Erkennung.
 * Ein Fehlalarm auf ladbarem Bestand ist damit strukturell ausgeschlossen (0 Treffer).
 *
 * BENUTZUNG (immer erst Trockenlauf, dann --setzen):
 *   node tools/pruefe-namen-flicken.js                        # alle tests/*.test.js, schreibt nichts
 *   node tools/pruefe-namen-flicken.js DATEI [DATEI…]         # nur diese Dateien
 *   node tools/pruefe-namen-flicken.js --setzen [DATEI…]      # echte Fälle reparieren (schreibt)
 * Für den Fall wird die betroffene Zeile auf einfache Anführungszeichen umgestellt; enthält die
 * Zeile ein ASCII-Apostroph, wird NICHT geschrieben, sondern „von Hand prüfen“ gemeldet.
 */
const fs = require("fs");
const path = require("path");

const WURZEL = path.resolve(__dirname, "..");
const syntax = require("./syntax.js");

/* Typografische Zeichen, die in einem ASCII-"…"-String die Falle auslösen können. */
const TYPO = /[\u201E\u201C\u201A\u2018]/;

function zeilen(text) {
  return String(text).split("\n");        /* behaelt \r am Zeilenende: Zeilenzahl/Zeilenenden bleiben */
}

/* Repariert EINE Zeile. Die Falle entsteht, wenn nach einem typografischen Öffnen („) das
   schließende Zeichen als ASCII-" getippt wird: "Titel „Zitat" Ende" bricht den String.
   Fachlich richtige Reparatur: genau dieses innere ASCII-" wird zum typografischen “ —
   der Text bleibt Zeichen für Zeichen erhalten, die äußeren ASCII-Quotes bleiben (String heil).
   Konservativ: ohne erkennbares „…"-Muster wird NICHT geschrieben, sondern gemeldet. */
function repariereZeile(zeile) {
  const alt = String(zeile == null ? "" : zeile);
  if (!TYPO.test(alt)) return {geaendert: false, zeile: alt, grund: "kein typografisches Zeichen"};
  const neu = alt.replace(/„([^"„“\n]*?)"(?=[\s,.;:)\]])/g, "„$1“");
  if (neu !== alt) return {geaendert: true, zeile: neu, grund: ""};
  return {geaendert: false, zeile: alt, grund: "kein Muster „…“ erkannt — von Hand prüfen"};
}

/* Parst die Dateien in EINEM Prozess (tools/syntax.js) und klassifiziert Ladefehler:
   art "quotes" = Anführungszeichen-Falle (Zeile mit typografischem Zeichen in der Nähe),
   art "syntax" = anderer Syntaxfehler (bleibt selbstverständlich rot). */
function pruefeDateien(dateien) {
  const r = syntax.pruefeDateien(dateien);
  const funde = [];
  for (const f of r.fehler) {
    let text = "";
    try { text = fs.readFileSync(f.datei, "utf8"); } catch (e) { /* nicht lesbar → syntax */ }
    const z = zeilen(text);
    let kandidat = null;
    for (let nr = Math.max(1, f.zeile - 2); nr <= f.zeile + 2; nr++) {
      const inhalt = z[nr - 1];
      if (inhalt != null && TYPO.test(inhalt)) { kandidat = {zeile: nr, text: inhalt.trim()}; break; }
    }
    funde.push({
      datei: f.datei,
      zeile: kandidat ? kandidat.zeile : f.zeile,
      text: kandidat ? kandidat.text : "",
      art: kandidat ? "quotes" : "syntax",
      meldung: f.meldung,
    });
  }
  return {geprueft: r.geprueft, funde};
}

/* Repariert eine Datei mit Anführungszeichen-Fällen (max. 3 Durchgänge, dann neu parsen). */
function repariereDatei(datei) {
  const probleme = [], gefixt = new Set();
  let geschrieben = false;
  for (let durchgang = 0; durchgang < 3; durchgang++) {
    const {funde} = pruefeDateien([datei]);
    const faelle = funde.filter(f => f.art === "quotes");
    if (!faelle.length) break;
    let text;
    try { text = fs.readFileSync(datei, "utf8"); } catch (e) { probleme.push(datei + ": nicht lesbar"); break; }
    const z = zeilen(text);
    let geaendert = false;
    for (const f of faelle) {
      const r = repariereZeile(z[f.zeile - 1]);
      if (r.geaendert) { z[f.zeile - 1] = r.zeile; geaendert = true; gefixt.add(f.zeile); }
      else probleme.push(path.relative(WURZEL, datei) + ":" + f.zeile + " — " + r.grund);
    }
    if (!geaendert) break;
    fs.writeFileSync(datei, z.join("\n"), "utf8");
    geschrieben = true;
  }
  const rest = pruefeDateien([datei]).funde;
  return {geschrieben, anzahl: gefixt.size, probleme, rest};
}

function main() {
  const args = process.argv.slice(2);
  const setzen = args.includes("--setzen");
  const dateienArg = args.filter(a => !a.startsWith("--"));
  const liste = dateienArg.length
    ? dateienArg.map(d => path.resolve(d))
    : syntax.sammleStandard().tests;
  const vorhanden = [];
  for (const datei of liste) {
    if (!fs.existsSync(datei)) { console.log("FEHLT: " + path.relative(WURZEL, datei)); continue; }
    vorhanden.push(datei);
  }
  let {funde} = pruefeDateien(vorhanden);
  let geschrieben = 0;
  if (setzen) {
    for (const datei of Array.from(new Set(funde.map(f => f.datei)))) {
      const r = repariereDatei(datei);
      if (r.geschrieben) geschrieben++;
      for (const p of r.probleme) console.log("ACHTUNG " + p);
    }
    funde = pruefeDateien(vorhanden).funde;
    if (geschrieben) console.log(geschrieben + " Datei(en) geschrieben (nur echte Anführungszeichen-Fälle).");
  }
  for (const f of funde) {
    const rel = path.relative(WURZEL, f.datei) || f.datei;
    if (f.art === "quotes") console.log("ANFUEHRUNGSZEICHEN " + rel + ":" + f.zeile + " — " + f.text);
    else console.log("LADEFEHLER " + rel + ":" + f.zeile + " — " + f.meldung + (f.text ? " | " + f.text : ""));
  }
  const quotes = funde.filter(f => f.art === "quotes").length;
  console.log("\n" + vorhanden.length + " Datei(en) geprüft, " + quotes + " Anführungszeichen-Fall/Fälle, "
    + funde.length + " laden nicht.");
  if (funde.length) process.exit(1);
}

if (require.main === module) main();
module.exports = {pruefeDateien, repariereZeile, repariereDatei, sammleTestdateien: () => syntax.sammleStandard().tests};
