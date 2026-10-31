"use strict";
/* QUA-05 — NAMENS-GATE OHNE FEHLALARME (3.0). Befund Q6 (berichte/qualitaet.md): das alte
   Werkzeug flaggte jede Zeile mit U+201E/U+201C (75 Fehlalarme in 33 Dateien), prüfte keine
   erwarte(...)-Texte und startete 118 Einzelprozesse (30 s). Jetzt: EIN Prozess parst alle
   Testdateien (tools/syntax.js); Fund = Datei lädt nicht; die Falle wird an der Bruchstelle als
   Datei:Zeile benannt — identisch für pruefe(...) und erwarte(...). --setzen repariert nur echte
   Fälle. Allein lauffähig:  node tests/namen-gate.test.js  */
(function(){
  function ngAlleinLaden(){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const code = [fs.readFileSync(path.join(__dirname, "harness.js"), "utf8"),
                  fs.readFileSync(__filename, "utf8"), "testsAusfuehren();"];
    const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename});
    let ergebnisse;
    try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "namen-gate.test.js"}); }
    catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
    const rot = ergebnisse.filter(e => !e.ok);
    for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
    console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
    process.exit(rot.length ? 1 : 0);
  }
  if (typeof gruppe === "undefined" && typeof document === "undefined" && typeof require === "function") { ngAlleinLaden(); return; }

  gruppe("QUA-05: Namens-Gate ohne Fehlalarme (pruefe + erwarte, ein Prozess)", () => {
    const {execFileSync} = require("child_process");
    const fs = require("fs"), path = require("path"), os = require("os");
    const WURZEL = path.join(__dirname, "..");
    const SKRIPT = path.join(WURZEL, "tools", "pruefe-namen-flicken.js");
    const NODE = require("process").execPath;
    const rufe = (args) => {
      const t0 = Date.now();
      try {
        const aus = execFileSync(NODE, [SKRIPT, ...args], {cwd: WURZEL, encoding: "utf8", timeout: 60000,
          stdio: ["ignore", "pipe", "pipe"]});
        return {code: 0, text: String(aus), ms: Date.now() - t0};
      } catch (e) {
        return {code: e.status == null ? -1 : e.status,
                text: String(e.stdout || "") + String(e.stderr || e.message || ""), ms: Date.now() - t0};
      }
    };
    const probe = (name, inhalt) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nl-namen-"));
      const datei = path.join(dir, name);
      fs.writeFileSync(datei, inhalt, "utf8");
      return {dir, datei};
    };
    const raeume = dir => { try { fs.rmSync(dir, {recursive: true, force: true}); } catch (e) {} };

    /* Fixtures: echte Falle = nach „…“ folgt ein ASCII-" statt “; harmlos = korrekt typografisch. */
    const HARMLOS = 'pruefe("harmlos „zitat“", () => { erwarte.gleich(1, 1, "ok"); });\n';
    const FALLE_PRUEFE = 'pruefe("Titel „Zitat" Ende", () => {});\n';
    const FALLE_ERWARTE = 'pruefe("ok", () => { erwarte.gleich(1, 1, "Text „Zitat" Ende"); });\n';
    const SAUBER = 'pruefe("sauber", () => { erwarte.gleich(1, 1, "ok"); });\n';

    pruefe("harmlose typografische Anführungszeichen sind KEIN Fund (0 Fehlalarme)", () => {
      const {dir, datei} = probe("harmlos.test.js", HARMLOS);
      try {
        const G = require(SKRIPT);
        const r = G.pruefeDateien([datei]);
        erwarte.gleich(r.geprueft, 1, "eine Datei geprüft");
        erwarte.gleich(r.funde, [], "ladbare Datei mit „…“ ist kein Fall");
      } finally { raeume(dir); }
    });

    pruefe("echte ASCII-Falle in pruefe(...) wird mit Datei:Zeile erkannt", () => {
      const {dir, datei} = probe("falle-pruefe.test.js", FALLE_PRUEFE);
      try {
        const G = require(SKRIPT);
        const r = G.pruefeDateien([datei]);
        erwarte.gleich(r.funde.length, 1, "genau ein Fund");
        erwarte.gleich(r.funde[0].art, "quotes", "als Anführungszeichen-Fall klassifiziert");
        erwarte.gleich(r.funde[0].zeile, 1, "Zeile 1");
        erwarte.enthaelt(r.funde[0].text, "Titel", "Bruchstelle benannt");
      } finally { raeume(dir); }
    });

    pruefe("echte ASCII-Falle in erwarte(...)-Text wird ebenfalls erkannt", () => {
      const {dir, datei} = probe("falle-erwarte.test.js", FALLE_ERWARTE);
      try {
        const G = require(SKRIPT);
        const r = G.pruefeDateien([datei]);
        erwarte.gleich(r.funde.length, 1, "genau ein Fund");
        erwarte.gleich(r.funde[0].art, "quotes", "erwarte-Text ist derselbe Fall");
        erwarte.enthaelt(r.funde[0].text, "Text", "Bruchstelle benannt");
      } finally { raeume(dir); }
    });

    pruefe("CLI: saubere Datei, Trockenlauf schreibt nichts (Exit 0)", () => {
      const {dir, datei} = probe("sauber.test.js", SAUBER);
      try {
        const vorher = fs.readFileSync(datei, "utf8");
        const r = rufe([datei]);
        erwarte.gleich(r.code, 0, "saubere Datei ist grün: " + r.text.slice(-300));
        erwarte.enthaelt(r.text, "0 laden nicht", "Bilanzzeile nennt 0");
        erwarte.gleich(fs.readFileSync(datei, "utf8"), vorher, "Trockenlauf schreibt nichts");
      } finally { raeume(dir); }
    });

    pruefe("CLI --setzen repariert die echte Falle (äußere Quotes bleiben, Text bleibt)", () => {
      const {dir, datei} = probe("falle-fix.test.js", FALLE_PRUEFE);
      try {
        const r = rufe(["--setzen", datei]);
        erwarte.gleich(r.code, 0, "nach der Reparatur lädt die Datei: " + r.text.slice(-400));
        erwarte.enthaelt(r.text, "geschrieben", "Schreibvorgang gemeldet");
        const inhalt = fs.readFileSync(datei, "utf8");
        erwarte.enthaelt(inhalt, "„Zitat“ Ende", "Text fachlich repariert (typografisches “)");
        const G = require(SKRIPT);
        erwarte.gleich(G.pruefeDateien([datei]).funde, [], "kein Restfund");
      } finally { raeume(dir); }
    });

    pruefe("Bestand: 0 Fehlalarme, 0 laden nicht, Laufzeit < 2 s (gebündelter Prozess)", () => {
      const r = rufe([]);
      erwarte.gleich(r.code, 0, "Bestand lädt: " + r.text.slice(-500));
      erwarte.enthaelt(r.text, "0 Anführungszeichen-Fall", "keine Fälle im Bestand");
      erwarte.enthaelt(r.text, "0 laden nicht", "keine unladbaren Dateien");
      erwarte.wahr(r.ms < 2000, "Laufzeit unter 2 s (gemessen " + r.ms + " ms)");
    });
  });
})();
