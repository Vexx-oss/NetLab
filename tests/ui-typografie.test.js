"use strict";
/* UI: TYPO-SKALA (UX-Audit U02, Architektur §16.4)
   BEFUND: 29 freie px-Größen, darunter funktionale Beschriftungen unter 11 px — der Hauptbefund
   waren die 8,5-px-Portnamen im Editor (editor.css), dazu 9,5-px-Tastenlabels und 10,5-px-Titel
   (editor.css/inspektor.css). Jetzt: sechs Stufen --fs-1…--fs-6 in basis.css; in ALLEN Stildateien
   steht kein px-Wert mehr in der Schriftgröße (font-size bzw. der Größenteil von font:). Relative
   em/% bleiben erlaubt (code/kbd), line-height in px ist keine Schriftgröße und bleibt.
   Deko-Glyphen über 28 px (Sterne, Punktezahl, großes Feier-Symbol, Riesencode) sind aus --fs-6
   abgeleitet (calc), kein eigener px-Wert.

   SVG-Beschriftung: eigene Zusicherung für die Editor-/Netzplan-Texte — sie liegt nie unter --fs-1
   (11 px); die 8,5-px-Portnamen sind der Audit-Befund und stehen hier als Stichprobe. */
gruppe("UI: Typo-Skala (U02)", () => {
  const hatRequire = (() => { try { return typeof require === "function"; } catch (e) { return false; } })();
  const lies = rel => { const fs = require("fs"), path = require("path"); return fs.readFileSync(path.join(__dirname, "..", rel), "utf8"); };
  const stilDateien = () => { const fs = require("fs"), path = require("path");
    const d = path.join(__dirname, "..", "src", "stil"); return fs.readdirSync(d).filter(n => n.endsWith(".css")).map(n => ({ name: n, text: fs.readFileSync(path.join(d, n), "utf8") })); };
  const ohneKommentar = t => t.replace(/\/\*[\s\S]*?\*\//g, " ");
  /* Schriftgrößen-Deklarationen: bei font: zählt nur der Teil vor dem Schrägstrich (line-height). */
  const schriftWerte = text => {
    const out = [];
    for (const m of ohneKommentar(text).matchAll(/(?:^|[;{\s])(font-size|font)\s*:\s*([^;}]+)/g)) {
      let wert = m[2].trim();
      if (m[1] === "font") wert = wert.split("/")[0].trim();
      out.push({ prop: m[1], wert });
    }
    return out;
  };
  const pxLiteral = wert => /(?:^|[\s(,])-?\d+(?:\.\d+)?px\b/.test(wert);
  const regel = (css, sel) => { const i = css.indexOf(sel + "{"); if (i < 0) return null;
    let tiefe = 0; for (let j = i; j < css.length; j++) { if (css[j] === "{") tiefe++; else if (css[j] === "}" && --tiefe === 0) return css.slice(css.indexOf("{", i) + 1, j); } return null; };

  pruefe("basis.css definiert die sechs Stufen 11 / 12,5 / 14 / 16 / 20 / 28 px", () => {
    if (!hatRequire) return;
    const basis = ohneKommentar(lies("src/stil/basis.css"));
    const soll = {"--fs-1": "11px", "--fs-2": "12.5px", "--fs-3": "14px", "--fs-4": "16px", "--fs-5": "20px", "--fs-6": "28px"};
    for (const [tok, wert] of Object.entries(soll)) {
      const m = basis.match(new RegExp(tok + "\\s*:\\s*([^;]+);"));
      erwarte.wahr(!!m, "Token " + tok + " fehlt in basis.css");
      erwarte.gleich(m[1].trim(), wert, "Wert von " + tok);
    }
  });

  pruefe("Kein px-Literal mehr in font-size/font aller Stildateien außer der Token-Datei (Ziel 0)", () => {
    if (!hatRequire) return;
    const treffer = [];
    for (const f of stilDateien()) {
      if (f.name === "basis.css") continue;
      for (const s of schriftWerte(f.text)) if (pxLiteral(s.wert)) treffer.push(f.name + ": " + s.prop + ": " + s.wert.slice(0, 60));
    }
    erwarte.gleich(treffer, [], "freie px-Größen außerhalb der Token-Datei");
  });

  pruefe("Auch basis.css selbst benutzt die Skala (body = --fs-4)", () => {
    if (!hatRequire) return;
    const basis = ohneKommentar(lies("src/stil/basis.css"));
    erwarte.passt(basis, /body\{[^}]*font:\s*var\(--fs-4\)\//, "body nutzt nicht --fs-4");
    erwarte.passt(basis, /code\{font-size:\.92em/, "code soll relativ bleiben");
  });

  pruefe("SVG-Beschriftung im Editor nie unter --fs-1 (11 px) — die 8,5-px-Portnamen sind weg", () => {
    if (!hatRequire) return;
    const css = ohneKommentar(lies("src/stil/editor.css"));
    const SVG_LABELS = [".pd-name", ".lb-wz-taste", ".lb-geraete-titel", ".badge-aus text", ".vlan-schild text",
      ".karte-zeile", ".gw-schild text", ".band-text", ".paket-text", ".ger-name", ".ger-ip", ".kabel-port"];
    for (const sel of SVG_LABELS) {
      const rumpf = regel(css, sel);
      erwarte.wahr(!!rumpf, "SVG-Text-Regel fehlt: " + sel);
      const gr = (rumpf.match(/font(?:-size)?\s*:\s*([^;}]+)/) || [])[1] || "";
      const stufe = gr.match(/var\(--fs-([1-6])\)/);
      erwarte.wahr(!!stufe, sel + " nutzt keine Typo-Stufe (Wert: " + gr.trim().slice(0, 60) + ")");
      erwarte.wahr(Number(stufe[1]) >= 1, sel + " liegt unter --fs-1");
      erwarte.falsch(/(?:^|[\s(,])-?\d+(?:\.\d+)?px\b/.test(gr.split("/")[0]), sel + " hat noch einen px-Wert");
    }
    /* Der Audit-Hauptbefund ausdrücklich: Portname ist jetzt 11 px, nicht 8,5. */
    erwarte.enthaelt(regel(css, ".pd-name"), "var(--fs-1)", "die Portnamen stehen nicht auf --fs-1");
    erwarte.falsch(/8\.5px/.test(css), "8.5px steht noch in editor.css");
  });

  pruefe("Zählung: font-size-Literale außerhalb basis.css = 0 (Belegzahl)", () => {
    if (!hatRequire) return;
    let literale = 0, stufen = 0;
    for (const f of stilDateien()) {
      for (const s of schriftWerte(f.text)) {
        if (pxLiteral(s.wert)) literale++;
        if (/var\(--fs-[1-6]\)/.test(s.wert)) stufen++;
      }
    }
    if (literale) console.log("Offene px-Schriftgrößen: " + literale);
    erwarte.gleich(literale, 0, "px-Schriftgrößen außerhalb basis.css");
    erwarte.wahr(stufen > 400, "zu wenige Deklarationen nutzen die Skala: " + stufen);
  });
});
