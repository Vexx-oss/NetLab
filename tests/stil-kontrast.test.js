"use strict";
/* ---------- CSS-01: Hell-Palette vollstaendig, Pflichtpaare >= 3:1 (3.0.0) ----------
   BEFUND (Frontend-Audit 2.9.0, 31.10.2026, berichte/frontend-design.md): POLARIS hell erbte
   32 Dunkel-Palettentokens: --typ-* (7), --p-* (7), --vlan-* (8), --zone-* (10). Gemessene
   Wirkung: Geraete-Icons color-mix(--typ 78%, --ink) auf --bg = 2,18:1 (im Screenshot 2,14:1);
   --p-* 1,57-2,25:1, --vlan-* 1,58-2,54:1 auf --panel (Weiss).
   Die Tokens sind nicht Dekoration: editor.css speist .typ-* ueber --g in die SVG-Icons
   (zz-lagebild.css .ger .gb-glyph), .band-text/.band-paket lesen --p-*, inspektor.css faerbt
   .in-vlan-nr mit --vlan-* als TEXT, szene.css die Adressplan-Legende.
   DIESER TEST RECHNET (WCAG 2.x, sRGB, relative Leuchtdichte) aus den Tokens - kein Bild,
   keine behauptete Zahl. Geprueft werden 8 Token-Zustaende: dunkel, hell ueber beide Pfade
   (Medienblock und data-theme) und die 5 Themes; je Theme werden ALLE
   :root[data-theme=...]-Bloecke gemerged (Altbestand hat teils einen zweiten --lage-*-Block).
   NORM (Lead-Entscheid W1, 31.10.2026): Icons und Signal-/VLAN-Farben >= 3,0:1 (WCAG 1.4.11;
   Task CSS-01). --zone-* sind Alpha-Waeschen: nur Vorhandensein (Lead-Entscheid b; die
   zusammengesetzten Linien erreichen selbst dunkel nur 1,94-2,22:1, ein 3:1 waere dort eine
   andere Gestaltung). Zusaetzlich fuer die beiden hellen Wege: Farben mit Textverwendung
   >= 4,5:1 (WCAG 1.4.3). Die 5 Theme-Dateien bleiben unangetastet (Lead-Entscheid e). */
gruppe("Stil: Hell-Palette und Pflichtkontraste (CSS-01)", () => {
  const fs = require("fs"), path = require("path");
  const WURZEL = path.join(__dirname, "..");
  const STIL = path.join(WURZEL, "src", "stil");
  const lese = (name) => fs.readFileSync(path.join(STIL, name), "utf8");
  const quelle = (rel) => fs.readFileSync(path.join(WURZEL, rel), "utf8");

  const TYP = ["--typ-router", "--typ-switch", "--typ-firewall", "--typ-host", "--typ-server", "--typ-nas", "--typ-internet"];
  const PROTO = ["--p-arp", "--p-icmp", "--p-tcp", "--p-udp", "--p-dhcp", "--p-dns", "--p-http"];
  const VLAN = ["--vlan-1", "--vlan-2", "--vlan-3", "--vlan-4", "--vlan-5", "--vlan-6", "--vlan-7", "--vlan-8"];
  const ZONEN = ["--zone-a", "--zone-b", "--zone-c", "--zone-d", "--zone-e",
                 "--zone-a-linie", "--zone-b-linie", "--zone-c-linie", "--zone-d-linie", "--zone-e-linie"];
  const PFLICHT = TYP.concat(PROTO, VLAN, ZONEN);
  const THEMES = ["keramik", "messing", "nordlicht", "papier", "pulsar"];

  /* --- CSS zerlegen (kein Parser, nur Klammern zaehlen) --- */
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
  const hellMedienBlock = tokenAus(block(basis, ':root:not([data-theme="dark"])'));
  const hellAttributBlock = tokenAus(block(basis, ':root[data-theme="light"]'));

  const ZUSTAENDE = [
    { name: "dunkel", t: dunkel },
    { name: "hell (Medienblock)", t: Object.assign({}, dunkel, hellMedienBlock) },
    { name: "hell (data-theme)", t: Object.assign({}, dunkel, hellAttributBlock) },
  ];
  for (const id of THEMES) ZUSTAENDE.push({ name: "Theme " + id, t: Object.assign({}, dunkel, themeToken(id)) });

  /* --- WCAG 2.x: sRGB -> lineare Leuchtdichte, Kontrastverhaeltnis --- */
  const hex3 = (h) => {
    const m = /^#([0-9a-fA-F]{6})$/.exec(String(h || "").trim());
    return m ? [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)] : null;
  };
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const leuchte = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  const kontrast = (a, b) => { const la = leuchte(a), lb = leuchte(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
  const mische = (a, b, p) => a.map((v, i) => Math.round(v * p + b[i] * (1 - p)));
  const farbe = (t, tok) => hex3(t[tok]);
  const runde = (x) => Math.round(x * 100) / 100;

  pruefe("basis.css: beide hellen Wege setzen alle 32 Palette-Tokens (7 typ + 7 p + 8 vlan + 10 zone)", () => {
    erwarte.gleich(PFLICHT.length, 32, "Pflichtliste der Palette (die Liste selbst darf nicht schrumpfen)");
    const fehlen = [];
    for (const weg of [["Medienblock", hellMedienBlock], ["data-theme", hellAttributBlock]])
      for (const tok of PFLICHT) if (!(tok in weg[1])) fehlen.push(weg[0] + ": " + tok);
    erwarte.gleich(fehlen.length, 0, "fehlende Tokens: " + fehlen.length + (fehlen.length ? " (z. B. " + fehlen.slice(0, 8).join(", ") + ")" : ""));
  });

  pruefe("Geraete-Icons >= 3:1: color-mix(--typ-* 78%, --ink) auf --bg in allen 7 Zustaenden", () => {
    const verstoesse = [];
    let kleinster = { wert: Infinity, wo: "" };
    for (const z of ZUSTAENDE) {
      const bg = farbe(z.t, "--bg"), ink = farbe(z.t, "--ink");
      if (!bg || !ink) { verstoesse.push(z.name + ": --bg/--ink fehlt"); continue; }
      for (const tok of TYP) {
        const roh = farbe(z.t, tok);
        if (!roh) { verstoesse.push(z.name + ": " + tok + " fehlt"); continue; }
        const c = kontrast(mische(roh, ink, 0.78), bg);
        if (c < kleinster.wert) kleinster = { wert: c, wo: z.name + " " + tok };
        if (c < 3) verstoesse.push(z.name + " " + tok + " = " + runde(c) + ":1");
      }
    }
    erwarte.gleich(verstoesse.length, 0, "Verstoesse: " + verstoesse.slice(0, 6).join("; "));
    erwarte.wahr(kleinster.wert >= 3, "kleinster Icon-Kontrast " + runde(kleinster.wert) + ":1 (" + kleinster.wo + ")");
  });

  pruefe("Protokoll- und VLAN-Farben >= 3:1 auf --panel und --bg (alle 7 Zustaende)", () => {
    const verstoesse = [];
    for (const z of ZUSTAENDE) {
      for (const tok of PROTO.concat(VLAN)) {
        const roh = farbe(z.t, tok);
        if (!roh) { verstoesse.push(z.name + ": " + tok + " fehlt"); continue; }
        for (const flaeche of ["--panel", "--bg"]) {
          const fl = farbe(z.t, flaeche);
          if (!fl) { verstoesse.push(z.name + ": " + flaeche + " fehlt"); continue; }
          const c = kontrast(roh, fl);
          if (c < 3) verstoesse.push(z.name + " " + tok + " auf " + flaeche + " = " + runde(c) + ":1");
        }
      }
    }
    erwarte.gleich(verstoesse.length, 0, "Verstoesse: " + verstoesse.slice(0, 8).join("; "));
  });

  pruefe("hell: Farben mit Textverwendung >= 4,5:1 auf --bg/--panel/--panel-2 (WCAG 1.4.3)", () => {
    const verstoesse = [];
    for (const weg of ["hell (Medienblock)", "hell (data-theme)"]) {
      const z = ZUSTAENDE.filter((s) => s.name === weg)[0];
      for (const tok of PROTO.concat(VLAN)) {
        const roh = farbe(z.t, tok);
        if (!roh) { verstoesse.push(weg + ": " + tok + " fehlt"); continue; }
        for (const flaeche of ["--bg", "--panel", "--panel-2"]) {
          const fl = farbe(z.t, flaeche);
          const c = fl ? kontrast(roh, fl) : 0;
          if (c < 4.5) verstoesse.push(weg + " " + tok + " auf " + flaeche + " = " + runde(c) + ":1");
        }
      }
    }
    erwarte.gleich(verstoesse.length, 0, "Verstoesse: " + verstoesse.slice(0, 8).join("; "));
  });

  pruefe("--zone-* in allen 7 Zustaenden vorhanden und Farbwerte (Alpha-Waesche: Norm Vorhandensein)", () => {
    const fehlen = [];
    for (const z of ZUSTAENDE)
      for (const tok of ZONEN) {
        const wert = z.t[tok];
        if (!wert) { fehlen.push(z.name + ": " + tok + " fehlt"); continue; }
        if (!/^(#[0-9a-fA-F]{6}|rgba?\([^)]*\))$/.test(String(wert).trim())) fehlen.push(z.name + ": " + tok + " kein Farbwert (" + wert + ")");
      }
    erwarte.gleich(fehlen.length, 0, "fehlende/ungueltige Zone-Tokens: " + fehlen.slice(0, 8).join("; "));
  });

  pruefe("Wirkung: Icons, Paketfarben, VLAN-Text und Bau lesen wirklich diese Tokens", () => {
    const editor = lese("editor.css"), lage = lese("zz-lagebild.css");
    const inspektorCss = lese("inspektor.css"), inspektorJs = quelle(path.join("src", "ui", "inspektor.js"));
    const pduJs = quelle(path.join("src", "ui", "pdu.js")), bauen = quelle("bauen.py");
    const paare = [[".typ-router", "--typ-router"], [".typ-switch", "--typ-switch"], [".typ-firewall", "--typ-firewall"],
                   [".typ-pc", "--typ-host"], [".typ-server", "--typ-server"], [".typ-nas", "--typ-nas"], [".typ-internet", "--typ-internet"]];
    for (const p of paare) erwarte.enthaelt(editor, p[0] + "{--g:var(" + p[1] + ")}", "editor.css: " + p[0] + " speist --g aus " + p[1]);
    erwarte.enthaelt(lage, "color-mix(in srgb, var(--g, var(--ink)) 78%, var(--ink))", "Icons mischen --g zu 78% mit --ink (die Rechnung oben ist die echte Formel)");
    erwarte.enthaelt(editor, "fill:var(--p-icmp)", "editor.css .band-text nutzt --p-icmp als Textfarbe");
    erwarte.enthaelt(inspektorCss, "color:var(--v, var(--ink))", "inspektor.css nutzt die VLAN-Farbe als Textfarbe");
    erwarte.enthaelt(inspektorJs, "--vlan-", "inspektor.js setzt --v aus --vlan-*");
    for (const tok of PROTO) erwarte.enthaelt(pduJs, tok, "pdu.js mappt das Protokoll auf " + tok);
    erwarte.enthaelt(bauen, '["basis.css"]', "bauen.py laedt basis.css vor allen anderen Stilregeln (Tokens wirken)");
  });
});
