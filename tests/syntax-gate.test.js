"use strict";
/* QUA-01 — JS-SYNTAX-GATE (3.0): jede JS-Datei aus dem src-Baum und jede Testdatei MUSS parsen.
   Befund Q2 (berichte/qualitaet.md): kein Gate prüfte die JS-Dateien unter src/; ein Syntaxfehler
   in einer der nie geladenen UI-Dateien passierte die ganze CI. Werkzeug: tools/syntax.js
   (ein Node-Prozess). Der Lauf in der Suite parst den echten Bestand mit — ein Syntaxfehler macht
   diesen Test rot. Allein lauffähig:  node tests/syntax-gate.test.js  */
(function(){
  /* ---------- allein lauffähig (Muster tests/klassenraum-abnahme.test.js) ---------- */
  function sqAlleinLaden(){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const code = [fs.readFileSync(path.join(__dirname, "harness.js"), "utf8"),
                  fs.readFileSync(__filename, "utf8"), "testsAusfuehren();"];
    const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename});
    let ergebnisse;
    try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "syntax-gate.test.js"}); }
    catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
    const rot = ergebnisse.filter(e => !e.ok);
    for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
    console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
    process.exit(rot.length ? 1 : 0);
  }
  if (typeof gruppe === "undefined" && typeof document === "undefined" && typeof require === "function") { sqAlleinLaden(); return; }

  gruppe("QUA-01: JS-Syntax-Gate (tools/syntax.js)", () => {
    const path = require("path"), fs = require("fs"), os = require("os");
    const WURZEL = path.join(__dirname, "..");
    const lade = () => require(path.join(WURZEL, "tools", "syntax.js"));

    /* Eine Wegwerfdatei in %TEMP% – nie im Repo. */
    const probe = (name, inhalt) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nl-syntax-"));
      const datei = path.join(dir, name);
      fs.writeFileSync(datei, inhalt, "utf8");
      return {dir, datei};
    };
    const raeume = dir => { try { fs.rmSync(dir, {recursive: true, force: true}); } catch (e) {} };

    pruefe("kaputte Klammer wird mit Datei und Zeile gemeldet (Befund Q2 wird rot)", () => {
      const S = lade();
      const {dir, datei} = probe("kaputt.js", "const a = (;\nconst b = 2;\n");
      try {
        const r = S.pruefeDateien([datei]);
        erwarte.gleich(r.geprueft, 1, "genau eine Datei geprüft");
        erwarte.gleich(r.fehler.length, 1, "genau ein Syntaxfehler");
        erwarte.gleich(r.fehler[0].datei, datei, "die Fehlermeldung nennt die Datei");
        erwarte.wahr(r.fehler[0].zeile >= 1, "die Fehlermeldung nennt eine Zeile (ist " + r.fehler[0].zeile + ")");
        erwarte.enthaelt(String(r.fehler[0].meldung), "Syntax", "der Grund ist ein Syntaxfehler");
      } finally { raeume(dir); }
    });

    pruefe("saubere Datei ist grün und wird gezählt", () => {
      const S = lade();
      const {dir, datei} = probe("sauber.js", "\"use strict\";\nconst a = 1;\n");
      try {
        const r = S.pruefeDateien([datei]);
        erwarte.gleich(r.geprueft, 1, "eine Datei geprüft");
        erwarte.gleich(r.fehler, [], "kein Befund");
      } finally { raeume(dir); }
    });

    pruefe("Standardumfang umfasst den src-Baum und alle Testdateien – und ist heute fehlerfrei", () => {
      const S = lade();
      const u = S.sammleStandard();
      erwarte.wahr(u.src.length >= 142, "src-Dateien: " + u.src.length + " (Soll >= 142)");
      erwarte.wahr(u.tests.length >= 118, "Testdateien: " + u.tests.length + " (Soll >= 118)");
      const r = S.pruefeDateien(u.alle);
      erwarte.gleich(r.fehler, [], "Syntaxfehler im Bestand");
    });
  });
})();
