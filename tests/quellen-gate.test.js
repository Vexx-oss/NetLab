"use strict";
/* QUA-03 — QUELLEN-GATE (3.0): Tests dürfen keine unfalsifizierbaren Zusicherungen enthalten.
   Befund Q3/Q4 (berichte/qualitaet.md): ein immer wahres "wahr(true, …)" ist unbedingt grün; 2 Tests konnten nie
   rot werden, 4 Python-Fallbacks zählten als grün. Werkzeug: tools/quellen-gate.js (unterscheidet
   CODE von Kommentaren/Strings/Regex — r-arch-Befund); tests/run.js ruft den Scan vor jedem Lauf auf
   und bricht bei einem Fund mit Datei:Zeile ab. Schnelltest: node tools/quellen-gate.js
   Allein lauffähig:  node tests/quellen-gate.test.js  */
(function(){
  /* ---------- allein lauffähig (Muster tests/syntax-gate.test.js) ---------- */
  function qgAlleinLaden(){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const code = [fs.readFileSync(path.join(__dirname, "harness.js"), "utf8"),
                  fs.readFileSync(__filename, "utf8"), "testsAusfuehren();"];
    const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename});
    let ergebnisse;
    try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "quellen-gate.test.js"}); }
    catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
    const rot = ergebnisse.filter(e => !e.ok);
    for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
    console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
    process.exit(rot.length ? 1 : 0);
  }
  if (typeof gruppe === "undefined" && typeof document === "undefined" && typeof require === "function") { qgAlleinLaden(); return; }

  gruppe("QUA-03: Quellen-Gate gegen unfalsifizierbare Zusicherungen", () => {
    const fs = require("fs"), path = require("path");
    const WURZEL = path.join(__dirname, "..");
    const lade = () => require(path.join(WURZEL, "tools", "quellen-gate.js"));
    /* Das verbotene Muster wird zusammengesetzt, damit diese Testdatei es nicht selbst enthält. */
    const VERBOTEN = "erwarte.wahr(" + "true";

    pruefe("immer wahres " + VERBOTEN + " wird mit Datei und Zeile gefunden", () => {
      const G = lade();
      const text = "const x = 1;\n" + VERBOTEN + ", \"dokumentiert\");\n";
      const r = G.pruefeQuellen([{datei: "tests/probe.test.js", text}]);
      erwarte.gleich(r.geprueft, 1, "eine Quelle geprüft");
      erwarte.gleich(r.funde.length, 1, "genau ein Fund");
      erwarte.gleich(r.funde[0].datei, "tests/probe.test.js", "Datei");
      erwarte.gleich(r.funde[0].zeile, 2, "Zeile");
      erwarte.enthaelt(r.funde[0].was, "unfalsifizierbar", "Grund");
    });

    pruefe("echte Zusicherungen sind grün", () => {
      const G = lade();
      const text = "erwarte.gleich(1, 1, \"ok\");\nerwarte.wahr(istWahr, \"echte Bedingung\");\n";
      const r = G.pruefeQuellen([{datei: "tests/probe.test.js", text}]);
      erwarte.gleich(r.funde, [], "kein Fund");
    });

    pruefe("der echte Testbestand enthält keine unfalsifizierbaren Zusicherungen", () => {
      const G = lade();
      const quellen = fs.readdirSync(__dirname).filter(n => n.endsWith(".test.js")).sort()
        .map(n => ({datei: "tests/" + n, text: fs.readFileSync(path.join(__dirname, n), "utf8")}));
      erwarte.wahr(quellen.length >= 118, "Testdateien: " + quellen.length + " (Soll >= 118)");
      const r = G.pruefeQuellen(quellen);
      erwarte.gleich(r.funde, [], "unfalsifizierbare Zusicherungen");
    });

    /* r-arch-Befund 31.10.2026: eine naive Suche zählt Kommentare, Strings und Regex-Inhalte als
       Verstoß. Das Gate maskiert deshalb erst Kommentare/Strings/Template-Literale/Regex — nur
       echter CODE zählt. Die folgenden Fälle sichern beide Richtungen ab. */
    pruefe("Kommentar, String und Template zählen NICHT als Verstoß", () => {
      const G = lade();
      const tick = String.fromCharCode(96);
      const text = [
        "// " + VERBOTEN + ", \"Kommentar\");",
        "/* " + VERBOTEN + ", \"Block\") */",
        "const s = \"" + VERBOTEN + ");",
        "const t = " + tick + VERBOTEN + ");" + tick + ";",
        "const ok = 1;",
      ].join("\n");
      const r = G.pruefeQuellen([{datei: "tests/probe.test.js", text}]);
      erwarte.gleich(r.funde, [], "nur Kommentar/String/Template — kein Fund");
    });

    pruefe("Regex-Literal: Muster darin ist kein Verstoß, Code dahinter wird erkannt", () => {
      const G = lade();
      const text = "const re = /" + VERBOTEN + "/;\n" + VERBOTEN + ", \"echte Stelle\");\n";
      const r = G.pruefeQuellen([{datei: "tests/probe.test.js", text}]);
      erwarte.gleich(r.funde.length, 1, "nur die echte Code-Stelle");
      erwarte.gleich(r.funde[0].zeile, 2, "Zeile der echten Stelle");
    });

    pruefe("Code nach Strings/Regex wird nicht abgeschnitten (kein stilles Übersehen)", () => {
      const G = lade();
      const text = [
        "const s = \"ein String\";",
        "const r = /[a-z]+/;",
        "const q = 1 / 2;",
        VERBOTEN + ", \"echte Stelle\");",
      ].join("\n");
      const r = G.pruefeQuellen([{datei: "tests/probe.test.js", text}]);
      erwarte.gleich(r.funde.length, 1, "genau eine echte Stelle");
      erwarte.gleich(r.funde[0].zeile, 4, "Zeile 4");
    });

    pruefe("die sieben historischen Fundstellen (Audit Q3/Q4) werden erkannt", () => {
      const G = lade();
      const namen = ["doku-seite.test.js", "doku-seite.test.js", "doku-seite.test.js", "doku-seite.test.js",
                     "spiel-hilfe-vorschlaege.test.js", "ui-symbole.test.js", "ui-zeit.test.js"];
      const quellen = namen.map((n, i) => ({datei: "tests/" + n, text: "const a" + i + " = 1;\n" + VERBOTEN + ", \"dokumentiert\");\n"}));
      const r = G.pruefeQuellen(quellen);
      erwarte.gleich(r.funde.length, 7, "alle sieben Fundstellen");
      erwarte.gleich(r.funde.map(f => f.datei).sort(), namen.map(n => "tests/" + n).sort(), "Dateien der Fundstellen");
      erwarte.gleich(r.funde.map(f => f.zeile), [2, 2, 2, 2, 2, 2, 2], "jeweils Zeile 2");
    });
  });
})();
