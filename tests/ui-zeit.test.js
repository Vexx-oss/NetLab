"use strict";
/* UI: ZEIT-TOKENS UND EIN HELFER (UX-Audit U07, Architektur §16.4)
   BEFUND (Audit): zweite Zeit-Leiter in JavaScript — 260 ms Ansicht, 700 ms Zähler, 220/260 ms
   Toast, 180 ms Overlay-Abbau — außerhalb der CSS-Dauern. Jetzt gilt: vier Stufen und der Zähler
   stehen in basis.css, gelesen wird über GENAU EINE Funktion UI.zeit() mit headless-Fallbacks.

   Geprüft wird beides (Wirkung vor Grün):
     · die Tokens selbst (exakte Werte + Easings),
     · UI.zeit() wirklich (headless-Fallbacks, getComputedStyle-Zweig, unbekannter Name wirft),
     · die Animationspfade aus dem Audit benutzen UI.zeit() und kein nacktes Zahlenliteral mehr.
   AUSGENOMMEN (fremde Dateien, offen gemeldet): src/ui/editor*.js (Track D: ansichtAnimieren 260 ms)
   und src/ui/spiel.js (Lead/Integrator: Overlay 180 ms, Zähler 900 ms). Sie stehen in AUSGENOMMEN,
   damit der Test nicht eine Datei rot macht, die ein anderer Schreiber hält. */
gruppe("UI: Zeit-Tokens (U07)", () => {
  const hatRequire = (() => { try { return typeof require === "function"; } catch (e) { return false; } })();
  const AUSGENOMMEN = { "editor.js": "Track D", "editor-werkzeuge.js": "Track D", "editor-pakete.js": "Track D",
    "editor-fach.js": "Track D", "spiel.js": "Lead/Integrator", "werkstatt.js": "Track D" };
  const TOKENS = [
    ["--dauer-kurz", "80ms"], ["--dauer", "160ms"], ["--dauer-mittel", "240ms"], ["--dauer-lang", "320ms"], ["--dauer-zaehler", "700ms"],
  ];

  const lies = rel => { const fs = require("fs"), path = require("path"); return fs.readFileSync(path.join(__dirname, "..", rel), "utf8"); };
  const stilDateien = () => { const fs = require("fs"), path = require("path");
    const d = path.join(__dirname, "..", "src", "stil"); return fs.readdirSync(d).filter(n => n.endsWith(".css")).map(n => ({ name: n, text: fs.readFileSync(path.join(d, n), "utf8") })); };
  const uiDateien = () => { const fs = require("fs"), path = require("path");
    const d = path.join(__dirname, "..", "src", "ui"); return fs.readdirSync(d).filter(n => n.endsWith(".js")).map(n => ({ name: n, text: fs.readFileSync(path.join(d, n), "utf8") })); };
  const ohneKommentar = t => t.replace(/\/\*[\s\S]*?\*\//g, " ");

  pruefe("basis.css trägt die vier Dauern, den Zähler und die drei Easings", () => {
    if (!hatRequire) return;
    const basis = ohneKommentar(lies("src/stil/basis.css"));
    for (const [name, wert] of TOKENS) {
      const m = basis.match(new RegExp(name + "\\s*:\\s*([^;]+);"));
      erwarte.wahr(!!m, "Token " + name + " fehlt in basis.css");
      erwarte.gleich(m[1].trim(), wert, "Wert von " + name);
    }
    for (const e of ["--ease-standard", "--ease-out", "--ease-pop"]) {
      const m = basis.match(new RegExp(e + "\\s*:\\s*cubic-bezier\\(([^)]+)\\)"));
      erwarte.wahr(!!m, "Easing " + e + " fehlt in basis.css");
    }
  });

  pruefe("Genau EINE Funktion UI.zeit() liest die Tokens per getComputedStyle", () => {
    if (!hatRequire) return;
    const alle = uiDateien();
    const definitionen = alle.filter(f => /UI\.zeit\s*=/.test(f.text)).map(f => f.name);
    erwarte.gleich(definitionen, ["dom.js"], "UI.zeit wird nur in src/ui/dom.js definiert");
    const dom = lies("src/ui/dom.js");
    erwarte.enthaelt(dom, "getComputedStyle(document.documentElement).getPropertyValue(TOKEN[schluessel])", "der Token-Zugriff fehlt");
    erwarte.enthaelt(dom, "const FALLBACK = {kurz: 80", "Fallback-Tabelle fehlt");
    erwarte.passt(dom, /UI\.zeit\s*=\s*\(\(\)\s*=>\s*\{[\s\S]*?return function zeit\(name\)/, "UI.zeit ist keine Fabrik mit genau einer Funktion zeit(name)");
    /* Kein zweiter Leser: welcher UI-Baustein die Dauer-Tokens direkt liest, zählt hier mit. */
    const leser = alle.filter(f => /getComputedStyle\([^)]*\)\.getPropertyValue\(\s*TOKEN\[/.test(f.text)).map(f => f.name);
    erwarte.gleich(leser, ["dom.js"], "nur dom.js liest die Dauer-Tokens direkt");
  });

  pruefe("UI.zeit liefert ohne DOM die Fallbacks aus basis.css", () => {
    if (!hatRequire) return;
    const vm = require("vm");
    const basis = ohneKommentar(lies("src/stil/basis.css"));
    const quelle = lies("src/ui/dom.js") + "\n;globalThis.__UI = UI;";
    const bereich = { console, setTimeout, clearTimeout };
    vm.createContext(bereich);
    vm.runInContext(quelle, bereich, { filename: "ui/dom.js" });
    const UI2 = bereich.__UI;
    erwarte.gleich(typeof UI2.zeit, "function", "UI.zeit fehlt nach dem Laden von dom.js");
    const namen = ["kurz", "dauer", "mittel", "lang", "zaehler"];
    for (let i = 0; i < namen.length; i++) {
      const soll = parseFloat(TOKENS[i][1]);
      erwarte.gleich(UI2.zeit(namen[i]), soll, "headless-Fallback für " + namen[i]);
      /* Der Fallback muss mit basis.css übereinstimmen, sonst prüft der Test zwei Wahrheiten. */
      const m = basis.match(new RegExp(TOKENS[i][0].replace(/-/g, "\\-") + "\\s*:\\s*(\\d+)ms"));
      erwarte.wahr(!m || Number(m[1]) === soll, "Fallback " + namen[i] + " weicht von basis.css ab");
    }
    erwarte.wirft(() => UI2.zeit("gibt-es-nicht"), "unbekannter Name muss werfen");
  });

  pruefe("UI.zeit liest getComputedStyle und fällt bei leerem Wert zurück", () => {
    if (!hatRequire) return;
    const vm = require("vm");
    const quelle = lies("src/ui/dom.js") + "\n;globalThis.__UI = UI;";
    const wert = p => p === "--dauer-mittel" ? "240ms" : p === "--dauer-lang" ? "320ms" : "";
    const bereich = { console, setTimeout, clearTimeout, document: { documentElement: {} }, getComputedStyle: () => ({ getPropertyValue: wert }) };
    vm.createContext(bereich);
    vm.runInContext(quelle, bereich, { filename: "ui/dom.js" });
    erwarte.gleich(bereich.__UI.zeit("mittel"), 240, "getComputedStyle-Wert wird nicht gelesen");
    erwarte.gleich(bereich.__UI.zeit("lang"), 320, "getComputedStyle-Wert 320ms");
    erwarte.gleich(bereich.__UI.zeit("kurz"), 80, "leerer Wert muss den Fallback nehmen");
    erwarte.gleich(bereich.__UI.zeit("zaehler"), 700, "leerer Wert muss den Fallback nehmen");
  });

  pruefe("Die Animationspfade aus dem Audit benutzen UI.zeit statt Zahlen", () => {
    if (!hatRequire) return;
    /* Datei: der Literal-Fund von vorher (Audit U07) → die erwartete neue Form. */
    const PFADE = [
      { datei: "app.js", war: /ms = 700/, neu: /ms = UI\.zeit\("zaehler"\)/ },
      { datei: "toast.js", war: /, 220\);/, neu: /hinweisStill\(st\); \}, UI\.zeit\("dauer"\)\)/ },
      { datei: "toast.js", war: /\}\), 260\);/, neu: /5000\}\)\), UI\.zeit\("mittel"\)\)/ },
      { datei: "hub.js", war: /setTimeout\(\(\) => o\.remove\(\), 180\)/, neu: /setTimeout\(\(\) => o\.remove\(\), UI\.zeit\("dauer"\)\)/ },
      { datei: "karriere.js", war: /setTimeout\(\(\) => o\.remove\(\), 180\)/, neu: /setTimeout\(\(\) => o\.remove\(\), UI\.zeit\("dauer"\)\)/ },
      { datei: "uebergabe.js", war: /setTimeout\(\(\) => o\.remove\(\), 180\)/, neu: /setTimeout\(\(\) => o\.remove\(\), UI\.zeit\("dauer"\)\)/ },
      { datei: "szene.js", war: /\? 0 : 180\)/, neu: /\? 0 : UI\.zeit\("dauer"\)\)/ },
    ];
    for (const p of PFADE) {
      const text = lies("src/ui/" + p.datei);
      erwarte.passt(text, p.neu, p.datei + ": Zeit-Token nicht eingesetzt");
      erwarte.falsch(p.war.test(text), p.datei + ": altes Zeit-Literal noch vorhanden");
    }
  });

  pruefe("CSS: Übergänge und Animationen benutzen die Dauer-Tokens statt ms-Literalen", () => {
    if (!hatRequire) return;
    const fs = require("fs"), path = require("path");
    const d = path.join(__dirname, "..", "src", "stil");
    const treffer = [];
    for (const n of fs.readdirSync(d).filter(x => x.endsWith(".css") && x !== "basis.css")) {
      const css = ohneKommentar(fs.readFileSync(path.join(d, n), "utf8"));
      for (const m of css.matchAll(/(?:^|[;{\s])(transition|animation)\s*:\s*([^;}]+)/g)) {
        if (/\d+(?:\.\d+)?m?s\b/.test(m[2])) treffer.push(n + ": " + m[1] + ": " + m[2].slice(0, 80));
      }
    }
    erwarte.gleich(treffer, [], "ms-Literale in CSS-Übergängen (Tokens benutzen)");
  });

  pruefe("Keine nackten ms-Literale mehr in den Animationspfaden meiner Dateien", () => {
    if (!hatRequire) return;
    const verbote = [
      { muster: /setTimeout\([^\n]*?,\s*(180|220|260|700)\s*\)/g, was: "setTimeout mit Zeit-Literal" },
      { muster: /\bms\s*=\s*(180|220|260|700)\b/g, was: "Standard-Dauer als Literal" },
    ];
    const treffer = [];
    for (const f of uiDateien()) {
      if (AUSGENOMMEN[f.name]) continue;
      for (const v of verbote) {
        const m = f.text.match(v.muster);
        if (m) treffer.push(f.name + ": " + v.was + " " + [...new Set(m)].slice(0, 3).join(" | "));
      }
    }
    erwarte.gleich(treffer, [], "Zeit-Literale außerhalb der Tokens");
    /* Offene Stellen bei fremden Schreibern ehrlich benennen – nicht als bestanden verkaufen. */
    const offen = [];
    for (const f of uiDateien()) if (AUSGENOMMEN[f.name]) {
      if (/setTimeout\([^\n]*?,\s*(180|220|260|700|900)\s*\)/.test(f.text) || /\bms\s*=\s*\d{2,4}\b/.test(f.text)) offen.push(f.name);
    }
    if (offen.length) console.log("OFFEN (fremde Dateien, nicht meine Schreibzone): " + offen.join(", "));
    erwarte.wahr(true, "dokumentiert");
  });
});
