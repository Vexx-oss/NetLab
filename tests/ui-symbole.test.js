"use strict";
/* UI: EIN ICON-SATZ STATT EMOJI (UX-Audit U01, Architektur §16.4 „Icons")
   BEFUND: zwei Icon-Sprachen — eigene SVG-Symbole (UI.symbol) plus Emoji als funktionale Icons
   (akte.js:9, hub.js:35/60/62/80/115, karriere.js:30/72/92/221/236/322 …). Jetzt gilt: UI-Chrome
   benutzt UI.symbol, Emoji bleibt nur Klartext-Copy vorbehalten.

   Gezählt werden Emoji-Codepoints mit Emoji-PRÄSENTATION (\p{Emoji_Presentation}) plus
   Extended_Pictographic mit Variantenselektor FE0F — also Zeichen, die ohne Steuerzeichen bunt
   rendern. Reine Textzeichen (✓ ✗ ↔ ↩ ★ ♥ ☎ ✉ ⚠) sind KEINE Emoji im Sinne dieser Zählung;
   sie rendern einfarbig in der Textfarbe und waren nie der Befund.

   Alle ui-Dateien zählen mit (spiel.js/start.js vom Lead für U01 freigegeben); Ziel 0. */
gruppe("UI: Symbole statt Emoji (U01)", () => {
  const hatRequire = (() => { try { return typeof require === "function"; } catch (e) { return false; } })();
  /* ALLE ui-Dateien zählen mit: spiel.js/start.js hat der Lead für U01 freigegeben, editor*.js
     hatte keine Emoji-Präsentation (nur Textzeichen wie ✓ ✗ ↔ ⚠). Ziel 0 in der ganzen UI. */
  const AUSGENOMMEN = {};
  const EMOJI = /\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F/gu;
  const lies = rel => { const fs = require("fs"), path = require("path"); return fs.readFileSync(path.join(__dirname, "..", rel), "utf8"); };
  const uiDateien = () => { const fs = require("fs"), path = require("path");
    const d = path.join(__dirname, "..", "src", "ui"); return fs.readdirSync(d).filter(n => n.endsWith(".js")).map(n => ({ name: n, text: fs.readFileSync(path.join(d, n), "utf8") })); };
  const zaehle = text => (text.match(EMOJI) || []).length;

  const GLYPHEN = ["ping", "kabel", "trace", "terminal", "plan", "feierabend", "raetsel", "dex", "ziel",
    "schloss", "empfehlung", "provisorium", "urkunde", "kaffee", "sprechblase", "beleg", "welt", "etikett",
    "sicherung", "rechner", "serie", "blitz", "werkzeug", "senior", "auswertung", "idee", "anker",
    "trophae", "medaille", "tendenz", "telefon", "feier"];

  pruefe("UI.symbol kennt alle Glyphen, die vorher Emoji waren", () => {
    if (!hatRequire) return;
    const quelle = lies("src/ui/geraetebilder.js");
    const start = quelle.indexOf("const S = {");
    const ende = quelle.indexOf("};", start);
    erwarte.wahr(start > 0 && ende > start, "der Symbol-Satz const S = { … } fehlt");
    const satz = quelle.slice(start, ende);
    const namen = new Set([...satz.matchAll(/^\s*([a-zA-Z]+):\s*\[/gm)].map(m => m[1]));
    for (const name of GLYPHEN) erwarte.wahr(namen.has(name), "UI.symbol-Glyphe fehlt: " + name);
    erwarte.passt(quelle, /const S = \{[\s\S]*?"M[^"]+"/, "die Glyphen tragen keine SVG-Pfade");
  });

  pruefe("Keine Emoji mehr in der UI-Chrome meiner Schreibzone (Ziel 0)", () => {
    if (!hatRequire) return;
    const treffer = [];
    for (const f of uiDateien()) {
      if (AUSGENOMMEN[f.name]) continue;
      const n = zaehle(f.text);
      if (n) treffer.push(f.name + ": " + n + " (" + [...new Set(f.text.match(EMOJI))].join("") + ")");
    }
    erwarte.gleich(treffer, [], "Emoji in der UI-Chrome");
  });

  pruefe("Auch die Stildateien tragen keine Emoji-codepoints", () => {
    if (!hatRequire) return;
    const fs = require("fs"), path = require("path");
    const d = path.join(__dirname, "..", "src", "stil");
    const treffer = fs.readdirSync(d).filter(n => n.endsWith(".css") && zaehle(fs.readFileSync(path.join(d, n), "utf8")) > 0);
    erwarte.gleich(treffer, [], "Emoji in CSS");
  });

  pruefe("Ersatz ist wirklich verdrahtet (Stichproben aus dem Audit)", () => {
    if (!hatRequire) return;
    const faelle = [
      { datei: "akte.js", teil: 'SYM = {ping: "ping", kabel: "kabel", trace: "trace", befehl: "tastatur", plan: "plan"}' },
      { datei: "akte.js", teil: 'h("h3", {}, UI.symbol("suche", 18), " Dein Verdacht")' },
      { datei: "hub.js", teil: 'h("h3", {}, UI.symbol("feierabend", 18), " Feierabend")' },
      { datei: "hub.js", teil: 'kachel(UI.symbol("raetsel", 22), ' },
      { datei: "hub.js", teil: 'kachel(UI.symbol("dex", 22), "Fehlerdex"' },
      { datei: "hub.js", teil: 'UI.symbol("ziel", 16), " " + v.text' },
      { datei: "hub.js", teil: 'h("h2", {}, UI.symbol("raetsel", 20), " Tagesrätsel")' },
      { datei: "karriere.js", teil: 'UI.symbol("schloss", 18)' },
      { datei: "karriere.js", teil: 'UI.symbol("senior", 28)' },
      { datei: "lernstand.js", teil: 'UI.symbol("auswertung", 16), " Auswertung kopieren"' },
      { datei: "lernstand.js", teil: 'UI.symbol("urkunde", 14)' },
      { datei: "karriere.js", teil: 'UI.symbol("idee", 16), " ", w.merksatz' },
      { datei: "szene.js", teil: 'SYMBOL = {druckt: "beleg", seite: "welt", adresse: "etikett", gesperrt: "schloss", haken: "ok", sicherung: "sicherung"}' },
      { datei: "ereignisse.js", teil: 'UI.symbol("telefon", 16)' },
    ];
    for (const f of faelle) erwarte.enthaelt(lies("src/ui/" + f.datei), f.teil, f.datei + ": Ersatz fehlt");
  });

  pruefe("Offene Emoji in fremden Dateien werden ehrlich gezählt (nicht als bestanden verkauft)", () => {
    if (!hatRequire) return;
    const offen = [];
    for (const f of uiDateien()) if (AUSGENOMMEN[f.name]) {
      const n = zaehle(f.text);
      if (n) offen.push(f.name + ": " + n);
    }
    if (offen.length) console.log("OFFEN (fremde Schreibzone, Namen im Bericht): " + offen.join(", "));
    erwarte.wahr(true, "dokumentiert");
  });
});
