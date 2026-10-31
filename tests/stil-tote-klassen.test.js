"use strict";
/* ---------- CSS-09: Tote Klassen und die Gegenrichtung (CSS -> JS), 3.0.0 Tier 2 ----------
   BEFUND (Frontend-Audit 2.9.0, § CSS-09/F-10): tools/klassen.py prueft nur JS -> CSS (0 fehlend).
   Die Gegenrichtung fehlte: 8 CSS-Klassen ohne Erzeuger (flow-geruest, flow-verwicklung,
   hb-auftrag-text, hb-feier-knoepfe, hb-kachel-sym, hb-kachel-text, kr-skill-name, lb-sim-titel-text).
   DIESER TEST: (1) die 8 belegten Altlasten sind entfernt; (2) Klassen ohne nachweisbaren Erzeuger
   sind in tests/stil-tote-klassen.json inventarisiert (loeschen ODER dokumentieren). Erzeuger =
   Name woertlich in src (JS/HTML) ODER dynamisches Muster aus Template-Literalen/Konkatenation.
   Eine neue tote Klasse macht den Test rot, bis sie geloescht oder begruendet ist.
   GRENZE: statische Analyse; Laufzeit-Erzeuger aus Tabellen koennen als Kandidat erscheinen und
   sind im Inventar als Pruefbedarf (nicht sicher tot) gefuehrt. JS -> CSS bleibt klassen.py. */
gruppe("Stil: Tote Klassen und Inventar (CSS-09)", () => {
  const fs = require("fs"), path = require("path");
  const WURZEL = path.join(__dirname, "..");
  const STIL = path.join(WURZEL, "src", "stil");
  const INVENTAR = path.join(__dirname, "stil-tote-klassen.json");
  const {execFileSync} = require("child_process");
  const PY = (typeof process !== "undefined" && process.env && process.env.PYTHON) || "python";
  const BT = String.fromCharCode(96), DL = String.fromCharCode(36) + "{";

  const ACHT = ["flow-geruest", "flow-verwicklung", "hb-auftrag-text", "hb-feier-knoepfe",
                "hb-kachel-sym", "hb-kachel-text", "kr-skill-name", "lb-sim-titel-text"];
  const KLASSENMUSTER = /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/;

  const ohneKommentar = (t) => t.replace(/\/\*[\s\S]*?\*\//g, " ");
  const cssKlassen = () => {
    const map = new Map();
    for (const f of fs.readdirSync(STIL).filter((n) => n.endsWith(".css")).sort()) {
      const t = ohneKommentar(fs.readFileSync(path.join(STIL, f), "utf8"));
      for (const m of t.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)) {
        if (!map.has(m[1])) map.set(m[1], new Set());
        map.get(m[1]).add(f);
      }
    }
    return map;
  };
  const produzenten = () => {
    const dateien = [];
    (function sammle(d) {
      for (const e of fs.readdirSync(d, {withFileTypes: true})) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) sammle(p);
        else if (/\.(js|html)$/.test(e.name)) dateien.push(p);
      }
    })(path.join(WURZEL, "src"));
    return dateien.map((p) => [p, fs.readFileSync(p, "utf8")]);
  };
  const esc = (s) => s.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
  const dynamischeMuster = (dateien) => {
    const roh = [];
    for (const p of dateien) {
      const t = p[1];
      const stuecke = t.split(BT);
      for (let i = 1; i < stuecke.length; i += 2) {
        const s = stuecke[i];
        if (s.indexOf(DL) < 0) continue;
        const teile = s.split(DL);
        for (let j = 0; j < teile.length; j++) {
          let teil = teile[j];
          if (j > 0) { const k = teil.indexOf("}"); teil = k < 0 ? "" : teil.slice(k + 1); }
          for (const tok of teil.match(/[A-Za-z0-9_-]+/g) || []) {
            if (!tok.includes("-")) continue;
            if (tok.endsWith("-")) roh.push("^" + esc(tok) + "[a-z0-9-]*$");
            if (tok.startsWith("-")) roh.push("^[a-z0-9-]*" + esc(tok) + "$");
          }
        }
      }
      for (const m of t.matchAll(/["']\s*([A-Za-z0-9_-]*-)\s*["']\s*\+/g)) roh.push("^" + esc(m[1]) + "[a-z0-9-]*$");
      for (const m of t.matchAll(/\+\s*["']\s*(-[A-Za-z0-9_-]*)\s*["']/g)) roh.push("^[a-z0-9-]*" + esc(m[1]) + "$");
      for (const m of t.matchAll(/["']\s*([A-Za-z0-9_-]*-)\s*["']\s*\+\s*[^+;\n]{1,60}?\+\s*["']\s*([A-Za-z0-9_-]*)\s*["']/g))
        roh.push("^" + esc(m[1]) + "[a-z0-9-]*" + esc(m[2]) + "$");
    }
    return [...new Set(roh)].map((s) => new RegExp(s));
  };

  const klassen = cssKlassen();
  const dateien = produzenten();
  const text = dateien.map((p) => p[1]).join("\n");
  const muster = dynamischeMuster(dateien);
  const kandidaten = [...klassen.keys()].filter((k) => KLASSENMUSTER.test(k) && !text.includes(k) && !muster.some((r) => r.test(k))).sort();

  pruefe("Die 8 belegten Altlasten sind aus src/stil entfernt (F-10)", () => {
    const nochDa = ACHT.filter((k) => klassen.has(k));
    erwarte.gleich(nochDa, [], "Altlast wieder im CSS: " + nochDa.join(", "));
    erwarte.gleich(ACHT.length, 8, "die belegte Liste umfasst 8 Klassen");
  });

  pruefe("CSS-Klassen ohne nachweisbaren Erzeuger sind vollstaendig inventarisiert (neue = rot)", () => {
    const daten = JSON.parse(fs.readFileSync(INVENTAR, "utf8"));
    const inventar = new Set();
    for (const eintrag of daten.pruefbedarf || []) for (const k of eintrag.klassen || []) inventar.add(k);
    const neu = kandidaten.filter((k) => !inventar.has(k));
    const veraltet = [...inventar].filter((k) => !kandidaten.includes(k));
    erwarte.gleich(neu, [], "neue tote/undokumentierte Klassen: " + neu.slice(0, 10).join(", "));
    erwarte.gleich(veraltet, [], "Inventar-Eintrag ohne Kandidat (geloescht? dann streichen): " + veraltet.slice(0, 10).join(", "));
    erwarte.gleich(kandidaten.length, inventar.size, "Kandidaten und Inventar decken sich");
    erwarte.wahr(kandidaten.length > 0, "es gibt dokumentierten Pruefbedarf (sonst waere das Inventar leer)");
  });

  pruefe("Inventar luegt nicht: Klassen stehen in der genannten CSS-Datei, Grund + Beleg vorhanden", () => {
    const daten = JSON.parse(fs.readFileSync(INVENTAR, "utf8"));
    const fehler = [];
    if (String(daten.hinweis || "").length < 60) fehler.push("Hinweis/Methode fehlt");
    if (!Array.isArray(daten.entfernt) || daten.entfernt.length !== 8) fehler.push("entfernt-Liste ist nicht 8");
    for (const k of ACHT) {
      const e = (daten.entfernt || []).find((x) => x.klasse === k);
      if (!e) { fehler.push(k + ": Eintrag in entfernt fehlt"); continue; }
      if (String(e.beleg || "").length < 10) fehler.push(k + ": Beleg fehlt");
    }
    for (const eintrag of daten.pruefbedarf || []) {
      if (!String(eintrag.grund || "").length) fehler.push("Gruppe " + eintrag.datei + ": Grund fehlt");
      for (const k of eintrag.klassen || []) {
        const dateienDerKlasse = klassen.get(k);
        if (!dateienDerKlasse) { fehler.push(k + ": nicht im CSS"); continue; }
        if (!dateienDerKlasse.has(eintrag.datei)) fehler.push(k + ": steht nicht in " + eintrag.datei);
      }
    }
    erwarte.gleich(fehler, [], "Inventar-Fehler: " + fehler.slice(0, 8).join("; "));
  });

  pruefe("klassen.py (Richtung JS -> CSS) bleibt 0 – keine Regel durch die Loeschung verloren", () => {
    let aus, code;
    try {
      aus = execFileSync(PY, ["tools/klassen.py"], {cwd: WURZEL, encoding: "utf8", timeout: 120000,
        env: {...(typeof process !== "undefined" && process.env ? process.env : {}), PYTHONIOENCODING: "utf-8"},
        stdio: ["ignore", "pipe", "pipe"]});
      code = 0;
    } catch (e) {
      aus = String((e.stdout || "") + "\n" + (e.stderr || ""));
      code = e.status == null ? -1 : e.status;
    }
    erwarte.gleich(code, 0, "klassen.py Exit-Code (0 = 0 Klassen ohne CSS-Regel): " + aus.slice(-900));
    erwarte.enthaelt(aus, "0 Klassen ohne CSS-Regel", "Bilanzzeile von klassen.py");
  });
});
