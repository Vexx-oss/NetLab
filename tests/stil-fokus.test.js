"use strict";
/* ---------- CSS-03: Fokus sichtbar - Whitelist und Ersatz >= 3:1 (3.0.0) ----------
   BEFUND (Frontend-Audit 2.9.0, berichte/frontend-design.md § CSS-03): In Kontextmenue und
   Schnellwahl war der Fokusring abgeschaltet (.menue-punkt/.sw-teil, rahmen.css:152/166); der
   Ersatz war nur die Flaeche --panel-3 auf --panel = 1,24:1 dunkel / 1,19:1 hell (< 3:1,
   WCAG 1.4.11). Insgesamt unterdruecken 15 Deklarationen den outline. Ohne Whitelist kann jede
   davon unbemerkt den Tastaturfokus unsichtbar machen.
   NORM (Lead-Entscheid W1, 31.10.2026): 2-px-Akzentring ist die Regel; ein 1-px-Ersatz ist nur
   mit >= 4,5:1 und Whitelist-Eintrag zulaessig; jeder uebrige Ersatz >= 3:1 (Task CSS-03).
   DIESER TEST: (1) scannt alle src/stil/*.css nach outline-Unterdrueckungen, (2) verlangt je
   Unterdrueckung einen Whitelist-Eintrag samt Beleg (der Ersatz muss im CSS stehen) und
   gemessenem Kontrast aus den Tokens (WCAG 2.x, 7 Token-Zustaende), (3) prueft Menue,
   Schnellwahl und Simulation ausdruecklich auf 2-px-Akzentring, (4) laesst keinen veralteten
   Eintrag als Deckung gelten. GRENZE (ehrlich): der Beleg wird als Text in der Datei gefunden,
   nicht im DOM gemessen - Sicht-/Tastaturpruefung gehoert zu vision/R-design (W2/W4). */
gruppe("Stil: Fokus sichtbar - Whitelist und Ersatz (CSS-03)", () => {
  const fs = require("fs"), path = require("path");
  const WURZEL = path.join(__dirname, "..");
  const STIL = path.join(WURZEL, "src", "stil");
  const lese = (name) => fs.readFileSync(path.join(STIL, name), "utf8");
  const THEMES = ["keramik", "messing", "nordlicht", "papier", "pulsar"];

  /* --- CSS zerlegen (kein Parser; auskommentierte Stellen zaehlen nicht) --- */
  const ohneKommentar = (t) => t.replace(/\/\*[\s\S]*?\*\//g, " ");
  const bisKlammer = (css, auf) => {
    let tiefe = 0;
    for (let i = auf; i < css.length; i++) {
      if (css[i] === "{") tiefe++;
      else if (css[i] === "}" && --tiefe === 0) return css.slice(auf, i + 1);
    }
    return "";
  };
  const block = (css, sel) => { const i = css.indexOf(sel + "{"); return i < 0 ? null : bisKlammer(css, css.indexOf("{", i)); };
  const tokenAus = (blockCss) => {
    const o = {};
    if (!blockCss) return o;
    for (const stueck of blockCss.slice(1, -1).split(";")) {
      const k = stueck.indexOf(":");
      if (k < 0) continue;
      const prop = stueck.slice(0, k).trim(), wert = stueck.slice(k + 1).trim();
      if (prop.startsWith("--")) o[prop] = wert;
    }
    return o;
  };
  const themeToken = (id) => {
    const css = ohneKommentar(lese("zzz-thema-" + id + ".css"));
    const o = {}, marke = ':root[data-theme="' + id + '"]';
    let ab = 0;
    while (true) {
      const i = css.indexOf(marke, ab);
      if (i < 0) break;
      Object.assign(o, tokenAus(bisKlammer(css, css.indexOf("{", i))));
      ab = i + marke.length;
    }
    return o;
  };

  const basis = ohneKommentar(lese("basis.css"));
  const dunkel = tokenAus(block(basis, ":root"));
  const zustaende = [
    ["dunkel", dunkel],
    ["hell (Medienblock)", Object.assign({}, dunkel, tokenAus(block(basis, ':root:not([data-theme="dark"])')))],
    ["hell (data-theme)", Object.assign({}, dunkel, tokenAus(block(basis, ':root[data-theme="light"]')))],
  ];
  for (const id of THEMES) zustaende.push(["Theme " + id, Object.assign({}, dunkel, themeToken(id))]);
  /* Lokale Tokens der Konsole: die Konsole ist immer dunkel, unabhaengig vom Theme (konsole.css:1-7). */
  const konsoleToken = tokenAus(block(ohneKommentar(lese("konsole.css")), ".ko-huelle"));

  /* --- flache Regeln: "selektor{...}" ohne verschachtelte Klammern --- */
  const regeln = (datei) => {
    const css = ohneKommentar(lese(datei));
    const out = [];
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(css))) out.push({ datei, sel: m[1].trim().replace(/\s+/g, " "), inhalt: m[2] });
    return out;
  };
  const flach = (datei, sel) => {
    const treffer = regeln(datei).filter((r) => r.sel === sel);
    return treffer.length ? treffer[0].inhalt : null;
  };
  const UNTERDRUECKUNG = /outline\s*:\s*(?:none|0)(?:\s+none)?\s*(?:;|$)/i;
  const alleDateien = fs.readdirSync(STIL).filter((n) => n.endsWith(".css")).sort();
  const unterdrueckungen = [];
  for (const datei of alleDateien)
    for (const r of regeln(datei)) if (UNTERDRUECKUNG.test(r.inhalt)) unterdrueckungen.push({ datei, sel: r.sel });
  const schluessel = (x) => x.datei + " | " + x.sel;

  /* --- Whitelist: je Unterdrueckung ein Ersatz, der im CSS steht und >= Schwelle kontrastiert.
     typ ring2 = 2-px-Akzentring (>= 3:1), rand1 = 1-px-Rand (nur >= 4,5:1), cursor = Cursor
     (Konsole, >= 3:1). flaechen = angrenzende Flaechen-Tokens, gegen die gemessen wird. --- */
  const AUSNAHMEN = [
    { datei: "editor.css", sel: ".lb-svg", typ: "ring2",
      belege: [{ text: "box-shadow:inset 0 0 0 2px var(--accent)", inSel: ".lb-svg" }], token: "--accent", flaechen: ["--bg"],
      grund: "SVG-Arbeitsflaeche: der :focus-visible-Ring liegt INNEN (box-shadow), weil .lb-svg overflow versteckt" },
    { datei: "hotline.css", sel: ".ht-frage:hover, .ht-frage:focus-visible", typ: "rand1",
      belege: [{ text: "border-color:var(--accent)", inSel: ".ht-frage" }], token: "--accent", flaechen: ["--accent-soft", "--panel"],
      grund: "Antwortkarte: Rand wechselt auf Akzent, Flaeche auf accent-soft (1 px, nur >= 4,5:1)" },
    { datei: "hub.css", sel: ".hb-oder-zeile:hover, .hb-oder-zeile:focus-visible", typ: "rand1",
      belege: [{ text: "border-color:var(--accent)", inSel: ".hb-oder-zeile" }], token: "--accent", flaechen: ["--bg", "--panel"],
      grund: "Wahlzeile im Hub: 1-px-Akzentrand (nur >= 4,5:1)" },
    { datei: "karriere.css", sel: ".kr-wiki-liste input[type=search]:focus", typ: "rand1",
      belege: [{ text: "border-color:var(--accent)", inSel: "input[type=search]" }], token: "--accent", flaechen: ["--panel"],
      grund: "Wiki-Suchfeld: 1-px-Akzentrand; der accent-soft-Schatten allein waere zu blass" },
    { datei: "konsole.css", sel: ".ko-eingabe", typ: "cursor",
      belege: [{ text: "caret-color:var(--ko-prompt)", inSel: ".ko-eingabe" }], token: "--ko-prompt", flaechen: ["--ko-bg"],
      grund: "Terminal-Eingabe: blinkender Cursor ist die Fokusanzeige, kein Ring (Konsole bleibt dunkel)" },
    { datei: "konsole.css", sel: ".ko-eingabe:focus, .ko-eingabe:focus-visible", typ: "cursor",
      belege: [{ text: "caret-color:var(--ko-prompt)", inSel: ".ko-eingabe" }], token: "--ko-prompt", flaechen: ["--ko-bg"],
      grund: "Terminal-Eingabe: Fokus-Regel unterdrueckt den Ring absichtlich, Cursor traegt den Fokus" },
    { datei: "netzplan.css", sel: ".np-geraet", typ: "ring2",
      belege: [{ text: "stroke:var(--accent)", inSel: ".np-geraet" }, { text: "stroke-width:2", inSel: ".np-geraet .np-ring" }], token: "--accent", flaechen: ["--bg"],
      grund: "Netzplan-Knoten: 2-px-Akzentring am SVG-Ring (.np-ring), keine Outline auf SVG-Gruppen" },
    { datei: "rahmen.css", sel: ".pal-eingabe", typ: "rand1",
      belege: [{ text: "border-color:var(--accent)", inSel: ".pal-kasten" }], token: "--accent", flaechen: ["--panel"],
      grund: "Befehlspalette: der Fokusring sitzt am Kasten (:focus-within, 1-px-Akzentrand); der zentrale Ring der Eingabe bleibt" },
    { datei: "simulation.css", sel: ".si-liste", typ: "ring2",
      belege: [{ text: "box-shadow:inset 0 0 0 2px var(--accent)", inSel: ".si-liste" }], token: "--accent", flaechen: ["--panel", "--bg"],
      grund: "Ereignisliste (role=listbox, tabindex=0): 2-px-Akzentring innen statt accent-soft (1,0:1)" },
    { datei: "spiel.css", sel: ".am-mappe:focus", typ: "ring2",
      belege: [{ text: "outline:2px solid var(--accent)", inSel: ".am-mappe" }], token: "--accent", flaechen: ["--panel"],
      grund: "Auftragsmappe: nur :focus unterdrueckt (Programmfokus); :focus-visible traegt den 2-px-Ring" },
    { datei: "spiel.css", sel: ".am-variante-karte:hover, .am-variante-karte:focus-visible, .am-variante-karte.an", typ: "rand1",
      belege: [{ text: "border-color:var(--accent)", inSel: ".am-variante-karte" }], token: "--accent", flaechen: ["--accent-soft", "--panel"],
      grund: "Variantenkarte: 1-px-Akzentrand auf Akzent-Flaeche (nur >= 4,5:1)" },
    { datei: "werkstatt.css", sel: ".wk-suche-feld", typ: "rand1",
      belege: [{ text: "border-color:var(--accent)", inSel: ".wk-suche" }], token: "--accent", flaechen: ["--panel-2"],
      grund: "Werkstatt-Suche: zusaetzlich zum zentralen Ring traegt die Huelle den 1-px-Akzentrand (:focus-within)" },
  ];

  /* --- WCAG 2.x: sRGB -> lineare Leuchtdichte, Kontrastverhaeltnis --- */
  const hex3 = (h) => {
    const m = /^#([0-9a-fA-F]{6})$/.exec(String(h || "").trim());
    return m ? [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)] : null;
  };
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const leuchte = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  const kontrast = (a, b) => { const la = leuchte(a), lb = leuchte(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
  const runde = (x) => Math.round(x * 100) / 100;
  const farbeVon = (z, tok) => (String(tok).startsWith("--ko-") ? konsoleToken[tok] : z[tok]);

  pruefe("Kontextmenue und Schnellwahl: 2-px-Akzentring statt 1,24:1-Flaeche", () => {
    const faelle = [
      ["rahmen.css", ".menue-punkt:hover:not([disabled]), .menue-punkt:focus-visible", "--panel-3"],
      ["rahmen.css", ".sw-teil:hover, .sw-teil:focus-visible", "--panel-3"],
    ];
    for (const f of faelle) {
      const datei = f[0], sel = f[1], fokusflaeche = f[2];
      const inhalt = flach(datei, sel);
      erwarte.wahr(!!inhalt, "Regel fehlt: " + datei + " " + sel);
      erwarte.enthaelt(inhalt, "outline:2px solid var(--accent)", "2-px-Akzentring in " + sel);
      erwarte.falsch(/outline\s*:\s*(?:none|0)\b/i.test(inhalt), "keine Outline-Unterdrueckung mehr in " + sel);
      for (const z of zustaende) {
        const c1 = kontrast(hex3(z[1]["--accent"]), hex3(z[1][fokusflaeche]));
        const c2 = kontrast(hex3(z[1]["--accent"]), hex3(z[1]["--panel"]));
        erwarte.wahr(c1 >= 3, z[0] + ": Ring auf " + fokusflaeche + " = " + runde(c1) + ":1");
        erwarte.wahr(c2 >= 3, z[0] + ": Ring auf --panel = " + runde(c2) + ":1");
      }
    }
  });

  pruefe("Simulation: innerer Fokusring ist der Akzent (accent-soft = 1,0:1; zentraler Ring bleibt)", () => {
    const inhalt = flach("simulation.css", ".si-liste:focus-visible");
    erwarte.wahr(!!inhalt, "Regel .si-liste:focus-visible fehlt");
    erwarte.enthaelt(inhalt, "box-shadow:inset 0 0 0 2px var(--accent)", "2-px-Akzentring innen");
    erwarte.falsch(inhalt.includes("accent-soft"), "accent-soft als Ringfarbe ist zu blass");
    for (const z of zustaende)
      for (const flaeche of ["--panel", "--bg"])
        erwarte.wahr(kontrast(hex3(z[1]["--accent"]), hex3(z[1][flaeche])) >= 3, z[0] + ": Akzent auf " + flaeche);
  });

  pruefe("Zentraler Fokusring: 2 px var(--accent), >= 3:1 auf --bg/--panel/--panel-2/--panel-3 (7 Zustaende)", () => {
    const zentral = regeln("basis.css").filter((r) => r.sel.includes("button:focus-visible") && r.inhalt.includes("outline:2px solid var(--accent)"));
    erwarte.gleich(zentral.length, 1, "genau eine zentrale :focus-visible-Regel in basis.css");
    const inhalt = zentral.length ? zentral[0].inhalt : "";
    erwarte.enthaelt(inhalt, "outline:2px solid var(--accent)", "2-px-Ring der Grundlage");
    for (const z of zustaende)
      for (const flaeche of ["--bg", "--panel", "--panel-2", "--panel-3"]) {
        const c = kontrast(hex3(z[1]["--accent"]), hex3(z[1][flaeche]));
        erwarte.wahr(c >= 3, z[0] + ": zentraler Ring auf " + flaeche + " = " + runde(c) + ":1");
      }
  });

  pruefe("Jede outline-Unterdrueckung ist whitelisted - und kein Eintrag ist veraltet", () => {
    const gefunden = unterdrueckungen.map(schluessel).sort();
    const erwartet = AUSNAHMEN.map(schluessel).sort();
    const fehlend = gefunden.filter((k) => !erwartet.includes(k));
    const veraltet = erwartet.filter((k) => !gefunden.includes(k));
    erwarte.gleich(fehlend.length, 0, "Unterdrueckung ohne Whitelist: " + fehlend.join("; "));
    erwarte.gleich(veraltet.length, 0, "Whitelist-Eintrag ohne Unterdrueckung: " + veraltet.join("; "));
    erwarte.gleich(gefunden.length, erwartet.length, "Zahl Unterdrueckungen vs. Whitelist");
  });

  pruefe("Whitelist: Beleg im CSS vorhanden, Ersatz >= 3:1 (1-px-Faelle >= 4,5:1) in 7 Zustaenden", () => {
    for (const a of AUSNAHMEN) {
      const dateiRegeln = regeln(a.datei);
      for (const beleg of a.belege) {
        const belegRegel = dateiRegeln.filter((r) => r.sel.includes(beleg.inSel) && r.inhalt.replace(/\s+/g, " ").includes(beleg.text.replace(/\s+/g, " ")));
        erwarte.wahr(belegRegel.length >= 1, a.datei + ": Beleg " + beleg.text + " in Regel mit " + beleg.inSel + " fehlt (gefunden " + belegRegel.length + ")");
      }
      const schwelle = a.typ === "rand1" ? 4.5 : 3;
      for (const z of zustaende)
        for (const flaeche of a.flaechen) {
          const vorne = farbeVon(z[1], a.token), hinten = farbeVon(z[1], flaeche);
          erwarte.wahr(!!vorne && !!hinten, a.datei + ": Token fehlt: " + a.token + " / " + flaeche);
          const c = kontrast(hex3(vorne), hex3(hinten));
          erwarte.wahr(c >= schwelle, a.datei + " (" + a.sel + "): " + a.token + " auf " + flaeche + " = " + runde(c) + ":1 < " + schwelle);
        }
    }
  });

  pruefe("Themes bleiben unangetastet: keine outline-Unterdrueckung in zzz-thema-*.css", () => {
    const themen = alleDateien.filter((n) => n.startsWith("zzz-thema-"));
    erwarte.gleich(themen.length, 5, "5 Theme-Dateien");
    const treffer = unterdrueckungen.filter((u) => u.datei.startsWith("zzz-thema-"));
    erwarte.gleich(treffer.map(schluessel), [], "Outline-Unterdrueckung in einer Theme-Datei");
  });
});
