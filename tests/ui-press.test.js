"use strict";
/* UI: GENAU EINE PRESS-REGEL (UX-Audit U06, Architektur §16.4)
   BEFUND: `.knopf:active{transform:scale(.96)}` (juice.css) und `.knopf:active{transform:translateY(1px)}`
   (rahmen.css) — gleiche Spezifität, rahmen.css gewinnt, aber der Knopf ruckelt (1 px über 160 ms)
   und Werkzeugknöpfe springen ohne Transition. Jetzt: EINE Regel, Druck 80 ms (--dauer-kurz),
   Lösen 160 ms (--dauer in der Grundregel). Der Test zählt die widersprüchlichen Regeln. */
gruppe("UI: Press (U06)", () => {
  const hatRequire = (() => { try { return typeof require === "function"; } catch (e) { return false; } })();
  const lies = rel => { const fs = require("fs"), path = require("path"); return fs.readFileSync(path.join(__dirname, "..", rel), "utf8"); };
  const ohneKommentar = t => t.replace(/\/\*[\s\S]*?\*\//g, " ");
  const bisKlammer = (css, auf) => { let tiefe = 0;
    for (let i = auf; i < css.length; i++) { if (css[i] === "{") tiefe++; else if (css[i] === "}" && --tiefe === 0) return css.slice(auf, i + 1); } return ""; };
  /* Alle Regeln sammeln: {selektor, rumpf} – reicht für die Zählung. */
  const regeln = css => {
    css = ohneKommentar(css);
    const out = [];
    for (let i = 0; i < css.length; i++) {
      if (css[i] !== "{") continue;
      /* Selektor rückwärts bis zum letzten } oder ; */
      let s = css.lastIndexOf("}", i - 1);
      s = Math.max(s, css.lastIndexOf(";", i - 1));
      const sel = css.slice(s + 1, i).trim();
      const rumpf = bisKlammer(css, i);
      if (sel && rumpf) out.push({ sel, rumpf: rumpf.slice(1, -1) });
      i += rumpf.length;
    }
    return out;
  };
  const stil = () => { const fs = require("fs"), path = require("path");
    const d = path.join(__dirname, "..", "src", "stil");
    return fs.readdirSync(d).filter(n => n.endsWith(".css")).map(n => ({ name: n, regeln: regeln(fs.readFileSync(path.join(d, n), "utf8")) })); };
  const transformRegeln = () => {
    const out = [];
    for (const datei of stil()) for (const r of datei.regeln) {
      if (!/\.knopf:active/.test(r.sel)) continue;
      if (/(^|;)\s*transform\s*:/.test(r.rumpf)) out.push({ datei: datei.name, sel: r.sel, rumpf: r.rumpf.replace(/\s+/g, " ").trim() });
    }
    return out;
  };

  pruefe("Genau EINE .knopf:active-Transform-Regel (widersprüchliche Regeln: 0)", () => {
    if (!hatRequire) return;
    const treffer = transformRegeln();
    erwarte.gleich(treffer.length, 1, "widersprüchliche .knopf:active-Transform-Regeln: " + JSON.stringify(treffer));
  });

  pruefe("Druck 80 ms über --dauer-kurz, Lösen 160 ms über die Grundregel", () => {
    if (!hatRequire) return;
    const [regel] = transformRegeln();
    erwarte.wahr(!!regel, "die eine Press-Regel fehlt");
    const wert = (rumpf, prop) => { const m = rumpf.match(new RegExp("(?:^|;)\\s*" + prop + "\\s*:\\s*([^;]+)")); return m ? m[1].trim() : null; };
    erwarte.wahr(/translateY\(1px\)/.test(wert(regel.rumpf, "transform") || ""), ".knopf:active drückt nicht um 1 px (Wert: " + wert(regel.rumpf, "transform") + ")");
    erwarte.gleich(wert(regel.rumpf, "transition-duration"), "var(--dauer-kurz)", "Druckdauer muss --dauer-kurz sein (80 ms)");
    /* Lösen: die Grundregel .knopf transitioniert transform mit --dauer (160 ms). */
    const basis = stil().flatMap(d => d.regeln);
    const grund = basis.filter(r => r.sel === ".knopf");
    erwarte.gleich(grund.length, 1, "Grundregel .knopf fehlt oder ist doppelt");
    erwarte.passt(wert(grund[0].rumpf, "transition") || "", /transform var\(--dauer\)/, "Lösen muss 160 ms (var(--dauer)) sein");
    /* Tokens selbst */
    const b = ohneKommentar(lies("src/stil/basis.css"));
    erwarte.passt(b, /--dauer-kurz:\s*80ms/, "--dauer-kurz ist nicht 80 ms");
    erwarte.passt(b, /--dauer:\s*160ms/, "--dauer ist nicht 160 ms");
  });

  pruefe("juice.css überschreibt .knopf:active nicht mehr", () => {
    if (!hatRequire) return;
    const juice = ohneKommentar(lies("src/stil/juice.css"));
    erwarte.falsch(/\.knopf:active/.test(juice), "juice.css definiert .knopf:active weiterhin");
    erwarte.passt(juice, /\.lb-wz:active[^{]*\{transform:scale\(\.96\)\}/, "die Werkzeugknopf-Regel ist verschwunden");
  });
});
