"use strict";
/* UI: KONTRAST DER TEXT-TOKENS (UX-Audit U03, Architektur §16.4 „Lesbarkeit")
   Geprüft wird gerechnet, nicht behauptet: WCAG 2.x (sRGB, relative Leuchtdichte) auf den
   Tokens, die TATSÄCHLICH in src/stil/basis.css stehen — für das dunkle Standard-Schema und
   beide hellen Wege (:root:not([data-theme="dark"]) im Medienblock UND :root[data-theme="light"]).

   Befund vor der Änderung (UX-Audit): --faint dunkel 3,87:1 auf --panel und 3,49:1 auf --panel-2,
   --faint hell 3,59:1, --accent hell 4,45:1 auf Weiß. Nach der Änderung: alle Text-Tokens ≥ 4,5:1
   auf --bg, --panel und --panel-2.

   Text-Token = Vordergrundfarbe, die als Textfarbe verwendet werden darf: --ink, --muted, --faint,
   --accent (Links, Überschriften), die Statusfarben --ok/--warn/--bad/--info/--geld/--ruf (Preise,
   Hinweise, Ergebniszeilen) und --accent-ink auf --accent (Text auf dem Hauptknopf).
   NICHT Text: --*-soft (Flächen), Zonen, VLAN- und Paketfarben (immer mit Beschriftung, nie als
   Fließtext-Token) — dieselbe Grenze wie im Audit. */
gruppe("UI: Kontrast (WCAG 2.x aus den Tokens)", () => {
  const hatRequire = (() => { try { return typeof require === "function"; } catch (e) { return false; } })();
  const TEXT = ["--ink", "--muted", "--faint", "--accent", "--ok", "--warn", "--bad", "--info", "--geld", "--ruf"];
  const FLAECHEN = ["--bg", "--panel", "--panel-2"];
  const ZIEL = 4.5;

  /* sRGB → lineare Leuchtdichte nach WCAG 2.x */
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const leuchte = hex => {
    const h = String(hex).trim().replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return 0.2126 * lin(parseInt(h.slice(0, 2), 16)) + 0.7152 * lin(parseInt(h.slice(2, 4), 16)) + 0.0722 * lin(parseInt(h.slice(4, 6), 16));
  };
  const kontrast = (a, b) => {
    const la = leuchte(a), lb = leuchte(b);
    if (la == null || lb == null) return null;
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  const runde = x => Math.round(x * 100) / 100;

  /* --- basis.css lesen und die Token-Blöcke holen (kein CSS-Parser, nur Klammern zählen) --- */
  const ohneKommentar = t => t.replace(/\/\*[\s\S]*?\*\//g, " ");
  const bisKlammer = (css, auf) => {
    let tiefe = 0;
    for (let i = auf; i < css.length; i++) {
      if (css[i] === "{") tiefe++;
      else if (css[i] === "}" && --tiefe === 0) return css.slice(auf, i + 1);
    }
    return "";
  };
  const block = (css, sel) => { const i = css.indexOf(sel + "{"); return i < 0 ? null : bisKlammer(css, css.indexOf("{", i)); };
  const farbToken = blockCss => {
    const o = {};
    if (!blockCss) return o;
    for (const stueck of blockCss.slice(1, -1).split(";")) {
      const k = stueck.indexOf(":");
      if (k < 0) continue;
      const prop = stueck.slice(0, k).trim(), wert = stueck.slice(k + 1).trim();
      if (prop.startsWith("--") && /^#[0-9a-fA-F]{6}$/.test(wert)) o[prop] = wert;
    }
    return o;
  };

  pruefe("basis.css hat die Text-Tokens in allen drei Schemata (sonst prüft der Test nichts)", () => {
    if (!hatRequire) return;
    const fs = require("fs"), path = require("path");
    const css = ohneKommentar(fs.readFileSync(path.join(__dirname, "..", "src", "stil", "basis.css"), "utf8"));
    const dunkel = farbToken(block(css, ":root"));
    const hellMedien = farbToken(block(css, ":root:not([data-theme=\"dark\"])"));
    const hellAttribut = farbToken(block(css, ":root[data-theme=\"light\"]"));
    for (const feld of FLAECHEN) erwarte.wahr(!!dunkel[feld], "dunkles Schema: Fläche " + feld + " fehlt in :root");
    for (const tok of TEXT) erwarte.wahr(!!dunkel[tok], "dunkles Schema: Text-Token " + tok + " fehlt in :root");
    erwarte.wahr(!!hellMedien["--faint"], "heller Medienblock: --faint fehlt");
    erwarte.wahr(!!hellAttribut["--faint"], "helles data-theme: --faint fehlt");
    erwarte.wahr(!!hellAttribut["--accent"], "helles data-theme: --accent fehlt");
  });

  const schemata = () => {
    if (!hatRequire) return [];
    const fs = require("fs"), path = require("path");
    const css = ohneKommentar(fs.readFileSync(path.join(__dirname, "..", "src", "stil", "basis.css"), "utf8"));
    const dunkel = farbToken(block(css, ":root"));
    const hellMedien = Object.assign({}, dunkel, farbToken(block(css, ":root:not([data-theme=\"dark\"])")));
    const hellAttribut = Object.assign({}, dunkel, farbToken(block(css, ":root[data-theme=\"light\"]")));
    return [
      {name: "dunkel", t: dunkel},
      {name: "hell (Medienblock)", t: hellMedien},
      {name: "hell (data-theme)", t: hellAttribut},
    ];
  };

  pruefe("alle Text-Tokens ≥ 4,5:1 auf --bg/--panel/--panel-2 (beide Schemata)", () => {
    if (!hatRequire) return;
    let verstoesse = 0, geprueft = 0, kleinster = {wert: Infinity, text: ""};
    for (const s of schemata()) {
      for (const tok of TEXT) {
        for (const flaeche of FLAECHEN) {
          const c = kontrast(s.t[tok], s.t[flaeche]);
          if (c == null) { verstoesse++; continue; }
          geprueft++;
          if (c < kleinster.wert) kleinster = {wert: c, text: tok + " auf " + flaeche + " (" + s.name + ")"};
          if (c < ZIEL) verstoesse++;
        }
      }
    }
    erwarte.gleich(verstoesse, 0, "Verstöße unter 4,5:1 (kleinster Wert: " + runde(kleinster.wert) + ":1 " + kleinster.text + ")");
    erwarte.gleich(geprueft, TEXT.length * FLAECHEN.length * 3, "geprüfte Paare");
  });

  pruefe("U03 ausdrücklich: --faint dunkel/hell und --accent hell ≥ 4,5:1 (die drei Audit-Werte)", () => {
    if (!hatRequire) return;
    const [dunkel, hellMedien, hellAttribut] = schemata();
    const faelle = [
      {was: "--faint dunkel auf --panel-2 (war 3,49:1)", c: kontrast(dunkel.t["--faint"], dunkel.t["--panel-2"])},
      {was: "--faint dunkel auf --bg (war 4,17:1)", c: kontrast(dunkel.t["--faint"], dunkel.t["--bg"])},
      {was: "--faint hell auf --panel (war 3,59:1)", c: kontrast(hellMedien.t["--faint"], hellMedien.t["--panel"])},
      {was: "--faint hell (data-theme) auf --bg", c: kontrast(hellAttribut.t["--faint"], hellAttribut.t["--bg"])},
      {was: "--accent hell auf --bg (war 4,45:1 auf Weiß)", c: kontrast(hellAttribut.t["--accent"], hellAttribut.t["--bg"])},
      {was: "--accent hell (Medienblock) auf --panel-2", c: kontrast(hellMedien.t["--accent"], hellMedien.t["--panel-2"])},
    ];
    for (const f of faelle) erwarte.wahr(f.c != null && f.c >= ZIEL, f.was + " ist jetzt " + runde(f.c) + ":1");
  });

  pruefe("Text auf dem Hauptknopf: --accent-ink auf --accent ≥ 4,5:1", () => {
    if (!hatRequire) return;
    for (const s of schemata()) {
      const c = kontrast(s.t["--accent-ink"], s.t["--accent"]);
      erwarte.wahr(c != null && c >= ZIEL, s.name + ": --accent-ink auf --accent ist " + runde(c) + ":1");
    }
  });
});
