"use strict";
/* VIS-01 — ABNAHME 3.0.0 (B7): tools/abnahme-3.0.py bündelt die sieben DoD-Achsen B1–B7.
   Befund (berichte/vision.md §3A, B7): „Jedes 3.0-Versprechen hat Befehl/Assertion; die
   ‚nicht gemessen‘-Liste enthält keine Kernzusage mehr; eine Abnahme-Datei bündelt alle Gates.“
   Der Test prüft: --gegenprobe macht JEDE Achse einzeln rot (7/7), --blind B4 macht die
   Gegenprobe selbst rot, JSON-Abnahmedatei hat alle 7 Achsen mit Befehl je Gate, und eine
   fehlende Basis macht eine Achse wirklich rot (nicht nur simuliert).
   Allein lauffähig:  node tests/abnahme-3.0.test.js  */
(function(){
  function abAlleinLaden(){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const code = [fs.readFileSync(path.join(__dirname, "harness.js"), "utf8"),
                  fs.readFileSync(__filename, "utf8"), "testsAusfuehren();"];
    const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename});
    let ergebnisse;
    try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "abnahme-3.0.test.js"}); }
    catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
    const rot = ergebnisse.filter(e => !e.ok);
    for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
    console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
    process.exit(rot.length ? 1 : 0);
  }
  if (typeof gruppe === "undefined" && typeof document === "undefined" && typeof require === "function") { abAlleinLaden(); return; }

  gruppe("VIS-01: Abnahme 3.0.0 — sieben DoD-Achsen als Gate", () => {
    const {execFileSync} = require("child_process");
    const fs = require("fs"), path = require("path"), os = require("os");
    const WURZEL = path.join(__dirname, "..");
    const SKRIPT = path.join(WURZEL, "tools", "abnahme-3.0.py");
    const PY = (typeof process !== "undefined" && process.env && process.env.PYTHON) || "python";
    const umgebung = {...(typeof process !== "undefined" && process.env ? process.env : {}), PYTHONIOENCODING: "utf-8"};
    const rufe = (args) => {
      try {
        const aus = execFileSync(PY, [SKRIPT, ...args], {cwd: WURZEL, encoding: "utf8", timeout: 300000,
          env: umgebung, stdio: ["pipe", "pipe", "pipe"]});
        return {code: 0, text: String(aus)};
      } catch (e) {
        return {code: e.status == null ? -1 : e.status,
                text: String(e.stdout || "") + String(e.stderr || e.message || "")};
      }
    };
    const tmpPfad = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "nl-abnahme-")), "abnahme.json");

    pruefe("Gegenprobe: jede der sieben Achsen ist einzeln rot provozierbar (7/7, Exit 0)", () => {
      const r = rufe(["--gegenprobe"]);
      erwarte.gleich(r.code, 0, "Gegenprobe muss 7/7 erkennen: " + r.text.slice(-500));
      for (const a of ["B1", "B2", "B3", "B4", "B5", "B6", "B7"]) erwarte.enthaelt(r.text, a + " rot provoziert", "Achse " + a);
      erwarte.enthaelt(r.text, "7/7", "Bilanz der Gegenprobe");
    });

    pruefe("Gegenprobe ist falsifizierbar: blinde Achse macht rot (Exit 1)", () => {
      const r = rufe(["--gegenprobe", "--blind", "B4"]);
      erwarte.gleich(r.code, 1, "blinde Achse muss rot machen: " + r.text.slice(-300));
      erwarte.passt(r.text, /ROT|BLIND/i, "Grund steht da");
    });

    pruefe("Abnahme-Datei: JSON mit allen sieben Achsen, Zeit und Befehl je Gate", () => {
      const ziel = tmpPfad();
      const r = rufe(["--schnell", "--json", ziel]);
      erwarte.wahr(r.code === 0 || r.code === 1, "Exit 0 oder 1 (ist " + r.code + ")");
      const daten = JSON.parse(fs.readFileSync(ziel, "utf8"));
      erwarte.gleich(Object.keys(daten.achsen).sort(), ["B1", "B2", "B3", "B4", "B5", "B6", "B7"], "sieben Achsen");
      erwarte.wahr(typeof daten.zeit === "string" && daten.zeit.length > 10, "Zeitstempel vorhanden");
      for (const [kuerzel, achse] of Object.entries(daten.achsen)) {
        erwarte.wahr(["gruen", "rot", "nicht_gemessen"].includes(achse.status), kuerzel + ": eigener Status");
        for (const g of achse.gates) {
          erwarte.wahr(typeof g.befehl === "string" && g.befehl.length > 3, kuerzel + "/" + g.name + ": Befehl fehlt");
          erwarte.wahr(["gruen", "rot", "nicht_gemessen"].includes(g.status), kuerzel + "/" + g.name + ": Status");
        }
      }
    });

    pruefe("Echte Basis ohne Pflichtdateien macht B1 wirklich rot (nicht nur simuliert)", () => {
      const leer = fs.mkdtempSync(path.join(os.tmpdir(), "nl-basis-"));
      const ziel = path.join(leer, "abnahme.json");
      try {
        const r = rufe(["--nur-achse", "B1", "--schnell", "--basis", leer, "--json", ziel]);
        erwarte.gleich(r.code, 1, "fehlende Basis muss rot machen: " + r.text.slice(-300));
        const daten = JSON.parse(fs.readFileSync(ziel, "utf8"));
        erwarte.gleich(daten.achsen.B1.status, "rot", "Achse B1 rot");
        erwarte.gleich(daten.achsen.B1.gates[0].status, "rot", "erstes Gate rot (Datei fehlt)");
      } finally { try { fs.rmSync(leer, {recursive: true, force: true}); } catch (e) {} }
    });

    pruefe("B7 allein ist im schnellen Modus gruen und schreibt die Datei (Exit 0)", () => {
      const ziel = tmpPfad();
      const r = rufe(["--nur-achse", "B7", "--schnell", "--json", ziel]);
      erwarte.gleich(r.code, 0, "B7 muss grün sein: " + r.text.slice(-300));
      const daten = JSON.parse(fs.readFileSync(ziel, "utf8"));
      erwarte.gleich(daten.achsen.B7.status, "gruen", "B7 gruen");
    });
  });
})();
