"use strict";
/* DOK-03 — WERTE-GATE FÜR DIE DOKU (3.0): tools/doku-claims.py prüft Werte statt Musterpräsenz.
   Befund (berichte/doku.md, Blindfleck 31.10.2026): fassung-ziehen.py --pruefen war Exit 0 TROTZ
   Liesmich „VERSION_CODE = 20006“ (android/bauen.py:79 = 20901), drei „13 Tags“-Stellen und
   FAQ „1.1.0“ gegen HERKUNFT „2.5.0“. Das Werkzeug prüft R1 VERSION_CODE, R2 Tag-Zahl,
   R3 Bildstand, R4 INHALT-Abdeckung, R5 Verweiszahl; --gegenprobe baut 4 Abweichungen ein und ist
   nur grün, wenn alle 4 erkannt werden (Vorbild tools/ethos.py:532-565).
   Allein lauffähig:  node tests/doku-claims.test.js  */
(function(){
  /* ---------- allein lauffähig (Muster tests/syntax-gate.test.js) ---------- */
  function dcAlleinLaden(){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const code = [fs.readFileSync(path.join(__dirname, "harness.js"), "utf8"),
                  fs.readFileSync(__filename, "utf8"), "testsAusfuehren();"];
    const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename});
    let ergebnisse;
    try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "doku-claims.test.js"}); }
    catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
    const rot = ergebnisse.filter(e => !e.ok);
    for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
    console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
    process.exit(rot.length ? 1 : 0);
  }
  if (typeof gruppe === "undefined" && typeof document === "undefined" && typeof require === "function") { dcAlleinLaden(); return; }

  gruppe("DOK-03: Werte-Gate tools/doku-claims.py", () => {
    const {execFileSync} = require("child_process");
    const path = require("path");
    const WURZEL = path.join(__dirname, "..");
    const SKRIPT = path.join(WURZEL, "tools", "doku-claims.py");
    const PY = (typeof process !== "undefined" && process.env && process.env.PYTHON) || "python";
    const umgebung = {...(typeof process !== "undefined" && process.env ? process.env : {}), PYTHONIOENCODING: "utf-8"};
    const rufe = (args) => {
      try {
        const aus = execFileSync(PY, [SKRIPT, ...args], {cwd: WURZEL, encoding: "utf8", timeout: 120000,
          env: umgebung, stdio: ["pipe", "pipe", "pipe"]});
        return {code: 0, text: String(aus)};
      } catch (e) {
        return {code: e.status == null ? -1 : e.status,
                text: String(e.stdout || "") + String(e.stderr || e.message || "")};
      }
    };

    pruefe("Gegenprobe: alle vier Abweichungen werden erkannt (4/4, Exit 0)", () => {
      const r = rufe(["--gegenprobe"]);
      erwarte.gleich(r.code, 0, "Gegenprobe muss alle vier erkennen: " + r.text.slice(-600));
      for (const regel of ["R1", "R2", "R3", "R4"]) erwarte.enthaelt(r.text, regel, "Regel in der Gegenprobe");
      erwarte.enthaelt(r.text, "Gegenprobe 4/4", "die Gegenprobe meldet ausdruecklich 4/4");
    });

    pruefe("Gegenprobe ist falsifizierbar: blinde Regel macht rot (Exit 1)", () => {
      const r = rufe(["--gegenprobe", "--blind", "R2"]);
      erwarte.gleich(r.code, 1, "eine blinde Regel muss die Gegenprobe rot machen: " + r.text.slice(-400));
      erwarte.passt(r.text, /ROT|BLIND/i, "der Grund steht da");
    });

    pruefe("Prüfmodus liefert R1–R5 und nur Exit 0 oder 1 (nie still grün)", () => {
      const r = rufe(["--pruefen"]);
      erwarte.wahr(r.code === 0 || r.code === 1, "Exit ist 0 oder 1 (ist " + r.code + ")");
      for (const regel of ["R1", "R2", "R3", "R4", "R5"]) erwarte.enthaelt(r.text, regel, "Abschnitt in der Ausgabe");
      if (r.code === 1) erwarte.passt(r.text, /ROT|—/, "Befunde werden mit Datei/Zeile benannt");
      else erwarte.passt(r.text, /GRUEN/i, "grüner Lauf wird ausdrücklich gemeldet");
    });
  });
})();
