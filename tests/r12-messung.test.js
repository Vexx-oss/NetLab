"use strict";
/* VIS-05 / r-arch V02 — R12 MESSBAR + VERSIONIERTE RATSCHE (3.0).
   Die verbindliche Letztmessung wird versioniert als tests/r12-stand.json (neben sim-stand.json/
   stil-stand.json); stand.py liest NUR sie (frischer Klon ohne Nachweise/ ist reproduzierbar).
   ethos.py --dom --r12 <roh> vergleicht je Ansicht×Breite gegen diese Baseline:
   aktuell > Baseline = ROT, ≤ Baseline = grün, fehlende Evidenz = "nicht gemessen" (kein 0).
   --festhalten friert die Letztmessung ein. Allein lauffähig:  node tests/r12-messung.test.js  */
(function(){
  function r12AlleinLaden(){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const code = [fs.readFileSync(path.join(__dirname, "harness.js"), "utf8"),
                  fs.readFileSync(__filename, "utf8"), "testsAusfuehren();"];
    const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename});
    let ergebnisse;
    try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "r12-messung.test.js"}); }
    catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
    const rot = ergebnisse.filter(e => !e.ok);
    for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
    console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
    process.exit(rot.length ? 1 : 0);
  }
  if (typeof gruppe === "undefined" && typeof document === "undefined" && typeof require === "function") { r12AlleinLaden(); return; }

  gruppe("VIS-05: R12 je Ansicht×Breite, versionierte Ratsche (tests/r12-stand.json)", () => {
    const {execFileSync} = require("child_process");
    const fs = require("fs"), path = require("path"), os = require("os");
    const WURZEL = path.join(__dirname, "..");
    const PY = (typeof process !== "undefined" && process.env && process.env.PYTHON) || "python";
    const umgebung = {...(typeof process !== "undefined" && process.env ? process.env : {}), PYTHONIOENCODING: "utf-8"};
    const python = (args, eingabe) => {
      try {
        return {code: 0, text: String(execFileSync(PY, args, {cwd: WURZEL, input: eingabe, encoding: "utf8",
          timeout: 300000, env: umgebung, stdio: ["pipe", "pipe", "pipe"]}))};
      } catch (e) {
        return {code: e.status == null ? -1 : e.status, text: String(e.stdout || "") + String(e.stderr || e.message || "")};
      }
    };
    const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "nl-r12-"));
    const schreibe = (datei, daten) => fs.writeFileSync(datei, JSON.stringify(daten, null, 2) + "\n", "utf8");
    const rauchDaten = (messungen, gemessen = true) => ({
      fassung: 1, quelle: "tests/r12-messung.test.js", gemessen,
      grund: gemessen ? null : "nicht gemessen: kein Programm",
      breiten: [1440, 1366, 960, 720], grenze: 6, grenzen: {mitarbeit: 3}, messungen,
    });
    const ansicht = (name, titel, zahl, fehler) => ({name, titel, zahl, fehler: fehler || null});
    const mess = (breite, ansichten) => ({breite, messbar: true, grund: null, ansichten});
    /* R12 bleibt 0 (statische Regel, Lead): die DOM-Ratsche gegen tests/r12-stand.json liefert
       die R12-Befunde; R1–R11 werden für den Test permissiv gesetzt, damit nur R12 zählt. */
    const PERMISSIV = {fassung: 1, regeln: {R1: 999999, R2: 999999, R3: 999999, R4: 999999, R5: 999999,
      R6: 999999, R7: 999999, R8: 999999, R9: 999999, R10: 999999, R11: 999999, R12: 0}};
    const standDatei = (dir) => { const p = path.join(dir, "stil-stand.json"); schreibe(p, PERMISSIV); return p; };

    pruefe("Auswertung je Breite+Ansicht: Verstoß und fehlende Messung werden benannt", () => {
      const p = python(["-c", [
        "import importlib.util, json, sys",
        "spec = importlib.util.spec_from_file_location('ethos', " + JSON.stringify(path.join(WURZEL, "tools", "ethos.py")) + ")",
        "m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)",
        "daten = json.load(sys.stdin)",
        "befunde, zahlen, verstoesse, gemessen = m.r12_auswerten_breiten(daten)",
        "print(json.dumps({'befunde': befunde, 'zahlen': zahlen, 'verstoesse': verstoesse, 'gemessen': gemessen}))",
      ].join("\n")], JSON.stringify(rauchDaten([
        mess(1440, [ansicht("heute", "Heute", 4), ansicht("mitarbeit", "Auftrag", 2)]),
        mess(960, [ansicht("heute", "Heute", 7), ansicht("mitarbeit", "Auftrag", null, "nicht aufgebaut")]),
      ])));
      erwarte.gleich(p.code, 0, p.text.slice(0, 400));
      const r = JSON.parse(p.text);
      erwarte.gleich(r.zahlen.length, 4, "vier Messungen (2 Ansichten × 2 Breiten)");
      erwarte.gleich(r.verstoesse.length, 1, "genau ein Wert ueber der Grenze");
      erwarte.wahr(r.befunde.some(b => b.includes("nicht gemessen")), "fehlende Ansicht benannt");
      erwarte.gleich(r.gemessen, false, "unvollstaendige Messung = nicht gemessen");
    });

    pruefe("Kein Programm: --dom meldet ausdrücklich nicht gemessen (nie eine 0)", () => {
      const r = python([path.join("tools", "ethos.py"), "--dom"]);
      erwarte.passt(r.text, /nicht gemessen/i, "Grund steht in der Ausgabe");
      erwarte.falsch(/0 sichtbare Elemente — eingehalten/.test(r.text), "keine falsche 0");
    });

    pruefe("--festhalten schreibt die versionierte Baseline mit dem Schema", () => {
      const dir = tmpDir();
      const roh = path.join(dir, "roh.json"), basis = path.join(dir, "r12-stand.json");
      try {
        schreibe(roh, rauchDaten([mess(1440, [ansicht("heute", "Heute", 4), ansicht("mitarbeit", "Auftrag", 2)])]));
        const r = python([path.join("tools", "ethos.py"), "--r12", roh, "--r12-ausgabe", path.join(dir, "verbindlich.json"),
          "--r12-baseline", basis, "--festhalten", "--stand", standDatei(dir)]);
        erwarte.gleich(r.code, 0, "festhalten muss gruen enden: " + r.text.slice(-500));
        const daten = JSON.parse(fs.readFileSync(basis, "utf8"));
        for (const feld of ["fassung", "quelle", "zeit", "grenzen", "ansichten", "messungen", "max", "verstoesse"])
          erwarte.wahr(feld in daten, "Schema-Feld fehlt: " + feld);
        erwarte.gleich(daten.ansichten.heute["1440"], 4, "Ansicht×Breite=Zahl");
        erwarte.gleich(daten.ansichten.mitarbeit["1440"], 2, "zweite Ansicht");
        erwarte.gleich(daten.messungen, 2, "zwei Messungen");
        erwarte.gleich(daten.max, 4, "max 4");
      } finally { try { fs.rmSync(dir, {recursive: true, force: true}); } catch (e) {} }
    });

    pruefe("--festhalten verweigert unvollständige Messungen (keine Baseline aus Nicht-Messung)", () => {
      const dir = tmpDir();
      const roh = path.join(dir, "roh.json"), basis = path.join(dir, "r12-stand.json");
      try {
        schreibe(roh, rauchDaten([], false));
        const r = python([path.join("tools", "ethos.py"), "--r12", roh, "--r12-ausgabe", path.join(dir, "verbindlich.json"),
          "--r12-baseline", basis, "--festhalten", "--stand", standDatei(dir)]);
        erwarte.gleich(fs.existsSync(basis), false, "keine Baseline aus einer Nicht-Messung");
        erwarte.passt(r.text, /nicht festgehalten|nicht gemessen/i, "Grund wird genannt");
      } finally { try { fs.rmSync(dir, {recursive: true, force: true}); } catch (e) {} }
    });

    pruefe("Ratsche: unverändert = grün (Exit 0)", () => {
      const dir = tmpDir();
      const roh = path.join(dir, "roh.json"), basis = path.join(dir, "r12-stand.json");
      try {
        schreibe(roh, rauchDaten([mess(960, [ansicht("heute", "Heute", 5)])]));
        schreibe(basis, {fassung: 1, quelle: "test", zeit: "2026-10-31T12:00:00+01:00", grenzen: {standard: 6},
          ansichten: {heute: {"960": 5}}, messungen: 1, max: 5, verstoesse: []});
        const r = python([path.join("tools", "ethos.py"), "--r12", roh, "--r12-ausgabe", path.join(dir, "verbindlich.json"),
          "--r12-baseline", basis, "--stand", standDatei(dir)]);
        erwarte.gleich(r.code, 0, "unveraendert muss gruen sein: " + r.text.slice(-500));
        erwarte.passt(r.text, /0 Ratsche|R12 .*eingehalten/i, "kein Zuwachs gemeldet");
      } finally { try { fs.rmSync(dir, {recursive: true, force: true}); } catch (e) {} }
    });

    pruefe("Ratsche: eingeschmuggerte Verschlechterung ist ROT (Exit 1, Zuwachs benannt)", () => {
      const dir = tmpDir();
      const roh = path.join(dir, "roh.json"), basis = path.join(dir, "r12-stand.json");
      try {
        schreibe(roh, rauchDaten([mess(960, [ansicht("heute", "Heute", 6)])]));
        schreibe(basis, {fassung: 1, quelle: "test", zeit: "2026-10-31T12:00:00+01:00", grenzen: {standard: 6},
          ansichten: {heute: {"960": 5}}, messungen: 1, max: 5, verstoesse: []});
        const r = python([path.join("tools", "ethos.py"), "--r12", roh, "--r12-ausgabe", path.join(dir, "verbindlich.json"),
          "--r12-baseline", basis, "--stand", standDatei(dir)]);
        erwarte.gleich(r.code, 1, "Zuwachs muss rot sein: " + r.text.slice(-600));
        erwarte.enthaelt(r.text, "Ratsche", "Ratsche im Befund");
        erwarte.enthaelt(r.text, "Baseline 5", "Baseline im Befund");
      } finally { try { fs.rmSync(dir, {recursive: true, force: true}); } catch (e) {} }
    });

    pruefe("Ratsche: fehlende Baseline-Grenze = ausdrücklich nicht gemessen (kein stilles Grün)", () => {
      const dir = tmpDir();
      const roh = path.join(dir, "roh.json"), basis = path.join(dir, "r12-stand.json");
      try {
        schreibe(roh, rauchDaten([mess(1440, [ansicht("heute", "Heute", 4), ansicht("neu", "Neue Ansicht", 2)])]));
        schreibe(basis, {fassung: 1, quelle: "test", zeit: "2026-10-31T12:00:00+01:00", grenzen: {standard: 6},
          ansichten: {heute: {"1440": 4}}, messungen: 1, max: 4, verstoesse: []});
        const r = python([path.join("tools", "ethos.py"), "--r12", roh, "--r12-ausgabe", path.join(dir, "verbindlich.json"),
          "--r12-baseline", basis, "--stand", standDatei(dir)]);
        erwarte.passt(r.text, /keine Baseline/i, "fehlende Baseline wird benannt");
        erwarte.enthaelt(r.text, "NICHT GEMESSEN", "R12 gilt als nicht gemessen");
      } finally { try { fs.rmSync(dir, {recursive: true, force: true}); } catch (e) {} }
    });

    pruefe("stand.py liest NUR die versionierte tests/r12-stand.json (frischer Klon ohne Nachweise)", () => {
      const dir = tmpDir();
      const basis = path.join(dir, "r12-stand.json");
      try {
        schreibe(basis, {fassung: 1, quelle: "tools/ethos.py --dom --r12 --festhalten", zeit: "2026-10-31T21:00:00+01:00",
          grenzen: {standard: 6, mitarbeit: 3}, ansichten: {heute: {"1440": 4, "960": 5}}, messungen: 2, max: 5, verstoesse: []});
        const p = python(["-c", [
          "import importlib.util, json, sys",
          "spec = importlib.util.spec_from_file_location('stand', " + JSON.stringify(path.join(WURZEL, "tools", "stand.py")) + ")",
          "m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)",
          "z = m.zahlen_aus_stand()",
          "z['r12'] = m.messe_r12(sys.argv[1])",
          "print(json.dumps({'r12': z['r12'], 'zeile': [l for l in m.stand_text(z).splitlines() if 'R12' in l]}))",
        ].join("\n"), path.join(dir, "r12-stand.json")]);
        erwarte.gleich(p.code, 0, p.text.slice(0, 800));
        const r = JSON.parse(p.text);
        erwarte.gleich(r.r12.gemessen, true, "versionierte Messung gelesen");
        erwarte.gleich(r.r12.max, 5, "max aus Datei");
        erwarte.gleich(r.r12.messungen, 2, "Messungen aus Datei");
        erwarte.wahr(r.zeile.some(z => z.includes("tests/r12-stand.json")), "Zeile nennt die versionierte Quelle");
        erwarte.wahr(r.zeile.some(z => z.includes("Letztmessung")), "Zeile nennt die Letztmessung");
        const p2 = python(["-c", [
          "import importlib.util, json, sys",
          "spec = importlib.util.spec_from_file_location('stand', " + JSON.stringify(path.join(WURZEL, "tools", "stand.py")) + ")",
          "m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)",
          "print(json.dumps(m.messe_r12(sys.argv[1])))",
        ].join("\n"), path.join(dir, "gibtsnicht.json")]);
        erwarte.gleich(p2.code, 0, p2.text.slice(0, 500));
        const leer = JSON.parse(p2.text);
        erwarte.gleich(leer.gemessen, false, "fehlende Datei = nicht gemessen");
        erwarte.passt(String(leer.grund), /nicht gemessen|fehlt/i, "Grund benannt");
      } finally { try { fs.rmSync(dir, {recursive: true, force: true}); } catch (e) {} }
    });
  });
})();
