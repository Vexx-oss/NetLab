"use strict";
/* QUA-04 — ZAHL-GATE (3.0): die Testzahl des Laufs muss zu docs/STAND.md passen.
   Befund Q5 (berichte/qualitaet.md): 7 Abnahmetests verschwanden still, der Lauf meldete eine
   kleinere Zahl und blieb grün; tools/stand.py --pruefen verglich zwar, lief aber nicht in
   tools/test.sh. Werkzeug tools/zaehl-gate.js liest die Bilanzzeile des Laufs und den
   STAND:ZAHLEN-Block aus docs/STAND.md; Abweichung = Exit 1 mit ist/soll.
   Allein lauffähig:  node tests/zaehl-gate.test.js  */
(function(){
  /* ---------- allein lauffähig (Muster tests/syntax-gate.test.js) ---------- */
  function zgAlleinLaden(){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const code = [fs.readFileSync(path.join(__dirname, "harness.js"), "utf8"),
                  fs.readFileSync(__filename, "utf8"), "testsAusfuehren();"];
    const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename});
    let ergebnisse;
    try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "zaehl-gate.test.js"}); }
    catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
    const rot = ergebnisse.filter(e => !e.ok);
    for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
    console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
    process.exit(rot.length ? 1 : 0);
  }
  if (typeof gruppe === "undefined" && typeof document === "undefined" && typeof require === "function") { zgAlleinLaden(); return; }

  gruppe("QUA-04: Zähl-Gate — Testzahl gegen docs/STAND.md", () => {
    const path = require("path");
    const WURZEL = path.join(__dirname, "..");
    const lade = () => require(path.join(WURZEL, "tools", "zaehl-gate.js"));
    const BILANZ = "1095/1111 grün  (127 Testdateien, 98 Module)";
    const standMit = (gesamt, testdateien) => "<!-- STAND:ZAHLEN " + JSON.stringify({tests: {exit: 0, gesamt, gruen: gesamt, headless: 98, rot: 0, testdateien, uebersprungen: 0}}) + " -->";

    pruefe("passende Testzahl ist grün", () => {
      const G = lade();
      const r = G.zaehle(BILANZ, standMit(1111, 127));
      erwarte.gleich(r.ok, true, "Grund: " + (r.gruende || []).join(" | "));
      erwarte.gleich(r.ist.gesamt, 1111, "gemessene Gesamtzahl");
      erwarte.gleich(r.soll.gesamt, 1111, "Soll aus STAND");
    });

    pruefe("eine fehlende Testdatei wird rot gemeldet", () => {
      const G = lade();
      const r = G.zaehle(BILANZ, standMit(1111, 126));
      erwarte.gleich(r.ok, false, "Abweichung muss rot sein");
      erwarte.wahr((r.gruende || []).some(g => g.includes("Testdateien")), "Grund nennt die Testdateien");
    });

    pruefe("abweichende Gesamtzahl nennt ist und soll", () => {
      const G = lade();
      const r = G.zaehle(BILANZ, standMit(1049, 127));
      erwarte.gleich(r.ok, false, "Abweichung muss rot sein");
      const text = (r.gruende || []).join(" ");
      erwarte.enthaelt(text, "1111", "gemessene Zahl im Grund");
      erwarte.enthaelt(text, "1049", "Soll-Zahl im Grund");
    });

    pruefe("ohne STAND:ZAHLEN-Block ist das kein grüner Lauf", () => {
      const G = lade();
      const r = G.zaehle(BILANZ, "<p>kein Block</p>");
      erwarte.gleich(r.ok, false, "fehlender Block muss rot sein");
      erwarte.wahr((r.gruende || []).some(g => g.includes("STAND:ZAHLEN")), "Grund nennt den fehlenden Block");
    });

    pruefe("ohne Bilanzzeile ist das kein grüner Lauf", () => {
      const G = lade();
      const r = G.zaehle("kein Testlauf", standMit(1111, 127));
      erwarte.gleich(r.ok, false, "fehlende Bilanz muss rot sein");
      erwarte.wahr((r.gruende || []).some(g => g.includes("Bilanz")), "Grund nennt die Bilanz");
    });
  });
})();
