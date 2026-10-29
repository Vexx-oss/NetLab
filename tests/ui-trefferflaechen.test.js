"use strict";
/* UI: TREFFERFLÄCHEN DER SIMULATION (UX-Audit U10, Projektregel 44 px)
   BEFUND: Transport 28×28, Filterchips 26 hoch, Tempo/MAC-Chips 26 hoch — gegen den eigenen
   44-px-Standard (Toast-Schließen rahmen.css:107, Menüpunkte rahmen.css:121; Design § 35).
   Jetzt: Transport und Chips ≥ 44, der Icon-Glyph bleibt 16. */
gruppe("UI: Trefferflächen der Simulation (U10)", () => {
  const hatRequire = (() => { try { return typeof require === "function"; } catch (e) { return false; } })();
  const lies = rel => { const fs = require("fs"), path = require("path"); return fs.readFileSync(path.join(__dirname, "..", rel), "utf8"); };
  const ohneKommentar = t => t.replace(/\/\*[\s\S]*?\*\//g, " ");
  const bisKlammer = (css, auf) => { let tiefe = 0;
    for (let i = auf; i < css.length; i++) { if (css[i] === "{") tiefe++; else if (css[i] === "}" && --tiefe === 0) return css.slice(auf, i + 1); } return ""; };
  /* Regel zu einem Selektor finden: auch in Sammelregeln („.a, .si-modus button{…}") und ohne
     Verwechslung mit Zustandsregeln, die den Namen als Teil enthalten (.si-filter-knopf.an). */
  const alleRegeln = css => { const out = []; for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) out.push({sel: m[1].trim(), rumpf: m[2]}); return out; };
  const regel = (css, sel) => { for (const r of alleRegeln(css)) if (r.sel.split(",").map(x => x.trim()).includes(sel)) return r.rumpf; return null; };
  const wert = (rumpf, prop) => { const m = String(rumpf || "").match(new RegExp("(?:^|;)\\s*" + prop + "\\s*:\\s*([^;]+)")); return m ? m[1].trim() : null; };
  const px = s => { const m = String(s || "").match(/(\d+(?:\.\d+)?)px/); return m ? Number(m[1]) : null; };

  pruefe("Simulations-Transport ist 44×44 (Icon bleibt 16)", () => {
    if (!hatRequire) return;
    const css = ohneKommentar(lies("src/stil/simulation.css"));
    const r = regel(css, ".si-steuer-knopf");
    erwarte.wahr(!!r, ".si-steuer-knopf fehlt");
    erwarte.gleich(px(wert(r, "width")), 44, "Transport-Breite");
    erwarte.gleich(px(wert(r, "height")), 44, "Transport-Höhe");
    /* Das Icon ist ein SVG mit fester Kantenlänge – es darf nicht mitwachsen. */
    erwarte.passt(lies("src/ui/simpanel.js"), /const icon = n => sv\("svg", \{viewBox: "0 0 16 16", width: 16, height: 16/, "Icon-Größe im Simpanel");
  });

  pruefe("Filterchips sind mindestens 44 hoch", () => {
    if (!hatRequire) return;
    const css = ohneKommentar(lies("src/stil/simulation.css"));
    const r = regel(css, ".si-filter-knopf");
    erwarte.wahr(!!r, ".si-filter-knopf fehlt");
    erwarte.wahr(px(wert(r, "min-height")) >= 44, "Filterchip-Höhe ist " + wert(r, "min-height"));
  });

  pruefe("Tempo- und Format-Chips sind mindestens 44 hoch", () => {
    if (!hatRequire) return;
    const css = ohneKommentar(lies("src/stil/simulation.css"));
    for (const sel of [".si-modus button", ".si-tempo button", ".pdu-format button"]) {
      const r = regel(css, sel);
      erwarte.wahr(!!r, "Segmentknopf-Regel fehlt: " + sel);
      erwarte.wahr(px(wert(r, "min-height")) >= 44, sel + ": Höhe ist " + wert(r, "min-height"));
    }
  });

  pruefe("Kein Bedienknopf der Simulationsleiste bleibt unter 44 hoch", () => {
    if (!hatRequire) return;
    const css = ohneKommentar(lies("src/stil/simulation.css"));
    /* Nur die Bedienelemente DER LEISTE (Transport/Filter/Tempo); .si-knopf in der Ereigniskarte ist
       kein 44-px-Ziel des Audits (U10 nennt Transport, Filter und Tempo). */
    for (const sel of [".si-steuer-knopf", ".si-filter-knopf", ".si-modus button", ".si-tempo button", ".pdu-format button"]) {
      const r = regel(css, sel);
      erwarte.wahr(!!r, "Regel fehlt: " + sel);
      const h = px(wert(r, "height")) != null ? px(wert(r, "height")) : px(wert(r, "min-height"));
      erwarte.wahr(h >= 44, sel + " ist nur " + h + " hoch");
    }
  });
});
