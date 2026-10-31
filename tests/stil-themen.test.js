"use strict";
/* ---------- CSS-08: Theme-Parität und Kontrast (3.0.0, Tier 2) ----------
   BEFUND (Frontend-Audit 2.9.0, berichte/frontend-design.md F-11/F-13): Die 5 Theme-Dateien sind
   laut Themes-Vertrag eigenstaendige Designsysteme, aber ungeprueft: der Kontrasttest las nur
   basis.css, und drei Themes (keramik/messing/pulsar) hatten ZWEI :root[data-theme]-Tokenbloecke
   (der zweite nur fuer --lage-*-Dauern) — gegen den Vertrag „ein Block je Theme".
   DIESER TEST PRUEFT die 8 Token-Zustaende (dunkel, hell ueber beide Pfade, 5 Themes):
   1) Pflicht-Tokenliste des Themes-Vertrags vollstaendig (Farben, Form, Schrift) und color-scheme,
   2) genau EIN :root[data-theme]-Block je Theme (F-11),
   3) Pflicht-Kontraste je Theme: --ink auf --bg/--panel >= 7:1, --muted/--faint >= 4,5:1,
      --accent-ink auf --accent >= 4,5:1,
   4) Palette-Gruppen (--typ-, --p-, --vlan-, --zone-) in jedem Theme definiert,
   5) dass die Theme-Dateien vom Bau wirklich geladen werden (Wirkung, bauen.py).
   DOKUMENTIERTE AUSNAHME (Lead-Entscheid a, W1): --faint auf --panel-3 liegt mit 4,45:1 (dunkel)
   / 4,38:1 (hell) knapp unter 4,5 und bleibt bewusst P2 — es ist KEIN Vertragspaar des
   Themes-Vertrags und wird hier nicht geprueft. Alle Vertragspaare liegen darueber.
   GRENZE (ehrlich): gerechnet wird aus den Tokens, nicht im DOM; Sichtpruefung = vision/R-design. */
gruppe("Stil: Theme-Paritaet und Kontraste (CSS-08)", () => {
  const fs = require("fs"), path = require("path");
  const WURZEL = path.join(__dirname, "..");
  const STIL = path.join(WURZEL, "src", "stil");
  const lese = (name) => fs.readFileSync(path.join(STIL, name), "utf8");
  const quelle = (rel) => fs.readFileSync(path.join(WURZEL, rel), "utf8");

  const THEMES = ["keramik", "messing", "nordlicht", "papier", "pulsar"];
  const SCHEMA = {keramik: "light", messing: "dark", nordlicht: "dark", papier: "light", pulsar: "dark"};
  const PFLICHT = ["--bg", "--bg-raster", "--panel", "--panel-2", "--panel-3", "--line", "--line-2", "--ink",
    "--muted", "--faint", "--accent", "--accent-ink", "--accent-soft", "--mint", "--iris", "--amber", "--koralle",
    "--ok", "--ok-soft", "--warn", "--warn-soft", "--bad", "--bad-soft", "--info", "--info-soft", "--geld", "--ruf",
    "--glas", "--leiste-bg", "--radius", "--radius-s", "--radius-xs", "--schatten", "--glow", "--display", "--body", "--mono"];
  const PALETTE = {typ: ["--typ-router", "--typ-switch", "--typ-firewall", "--typ-host", "--typ-server", "--typ-nas", "--typ-internet"],
    p: ["--p-arp", "--p-icmp", "--p-tcp", "--p-udp", "--p-dhcp", "--p-dns", "--p-http"],
    vlan: ["--vlan-1", "--vlan-2", "--vlan-3", "--vlan-4", "--vlan-5", "--vlan-6", "--vlan-7", "--vlan-8"],
    zone: ["--zone-a", "--zone-b", "--zone-c", "--zone-d", "--zone-e", "--zone-a-linie", "--zone-b-linie", "--zone-c-linie", "--zone-d-linie", "--zone-e-linie"]};

  const ohneKommentar = (t) => t.replace(/\/\*[\s\S]*?\*\//g, " ");
  const bisKlammer = (css, auf) => {
    let tiefe = 0;
    for (let i = auf; i < css.length; i++) {
      if (css[i] === "{") tiefe++;
      else if (css[i] === "}" && --tiefe === 0) return css.slice(auf, i + 1);
    }
    return "";
  };
  const dekl = (body) => {
    const o = {};
    for (const stueck of body.slice(1, -1).split(";")) {
      const k = stueck.indexOf(":");
      if (k < 0) continue;
      const prop = stueck.slice(0, k).trim(), wert = stueck.slice(k + 1).trim();
      if (prop.startsWith("--")) o[prop] = wert;
    }
    return o;
  };
  const themeInfo = (id) => {
    const roh = lese("zzz-thema-" + id + ".css");
    const css = ohneKommentar(roh);
    const marke = ':root[data-theme="' + id + '"]';
    const bloecke = [], zeilen = [];
    let ab = 0;
    while (true) {
      const i = css.indexOf(marke, ab);
      if (i < 0) break;
      const body = bisKlammer(css, css.indexOf("{", i));
      bloecke.push(body);
      zeilen.push(roh.slice(0, i).split("\n").length);
      ab = i + marke.length;
    }
    const token = Object.assign({}, ...bloecke.map(dekl));
    let cs = null;
    for (const b of bloecke) { const m = /color-scheme\s*:\s*([^;}]+)/.exec(b); if (m) { cs = m[1].trim(); break; } }
    return {bloecke, zeilen, token, cs};
  };
  const hex = (h) => { const m = /^#([0-9a-fA-F]{6})$/.exec(String(h || "").trim()); return m ? [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)] : null; };
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const leuchte = (a) => 0.2126 * lin(a[0]) + 0.7152 * lin(a[1]) + 0.0722 * lin(a[2]);
  const kontrast = (a, b) => { const la = leuchte(a), lb = leuchte(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
  const runde = (x) => Math.round(x * 100) / 100;

  /* dunkel + beide hellen Wege aus basis.css als Token-Zustaende (Kontrast-Parität). */
  const basis = ohneKommentar(lese("basis.css"));
  const block = (css, sel) => { const i = css.indexOf(sel + "{"); return i < 0 ? null : bisKlammer(css, css.indexOf("{", i)); };
  const dunkel = dekl(block(basis, ":root") || "{}");
  const mediaHell = Object.assign({}, dunkel, dekl(block(basis, ':root:not([data-theme="dark"])') || "{}"));
  const attrHell = Object.assign({}, dunkel, dekl(block(basis, ':root[data-theme="light"]') || "{}"));
  const ZUSTAENDE = [["dunkel", dunkel], ["hell (Medienblock)", mediaHell], ["hell (data-theme)", attrHell]];

  pruefe("Themes-Vertrag: Pflicht-Token und color-scheme vollstaendig in allen 5 Theme-Dateien", () => {
    const fehler = [];
    for (const id of THEMES) {
      const info = themeInfo(id);
      for (const tok of PFLICHT) if (!(tok in info.token)) fehler.push(id + ": " + tok + " fehlt");
      if (info.cs !== SCHEMA[id]) fehler.push(id + ": color-scheme ist " + info.cs + ", soll " + SCHEMA[id]);
    }
    erwarte.gleich(PFLICHT.length, 37, "Pflichtliste des Themes-Vertrags (Liste darf nicht schrumpfen)");
    erwarte.gleich(fehler, [], "fehlende Pflicht-Tokens: " + fehler.slice(0, 8).join("; "));
  });

  pruefe("Genau EIN :root[data-theme]-Tokenblock je Theme (F-11: keine gesplitteten Tokenbloecke)", () => {
    const fehler = [];
    for (const id of THEMES) {
      const info = themeInfo(id);
      if (info.bloecke.length !== 1) fehler.push(id + ": " + info.bloecke.length + " Tokenbloecke (Zeilen " + info.zeilen.join(", ") + ")");
    }
    erwarte.gleich(fehler, [], "gesplittete Tokenbloecke: " + fehler.join("; "));
  });

  pruefe("Pflicht-Kontraste je Theme: --ink >= 7:1, --muted/--faint >= 4,5:1, --accent-ink auf --accent >= 4,5:1", () => {
    const verstoesse = [];
    for (const id of THEMES) {
      const t = themeInfo(id).token;
      const paare = [["--ink", "--bg", 7], ["--ink", "--panel", 7], ["--muted", "--bg", 4.5], ["--muted", "--panel", 4.5],
                     ["--faint", "--bg", 4.5], ["--faint", "--panel", 4.5], ["--accent-ink", "--accent", 4.5]];
      for (const p of paare) {
        const a = hex(t[p[0]]), b = hex(t[p[1]]);
        if (!a || !b) { verstoesse.push(id + ": " + p[0] + "/" + p[1] + " fehlt"); continue; }
        const c = kontrast(a, b);
        if (c < p[2]) verstoesse.push(id + " " + p[0] + " auf " + p[1] + " = " + runde(c) + ":1 < " + p[2]);
      }
    }
    erwarte.gleich(verstoesse.length, 0, "Kontrast-Verstoesse: " + verstoesse.slice(0, 8).join("; "));
  });

  pruefe("Palette-Paritaet: --typ-*/--p-*/--vlan-*/--zone-* in jedem Theme definiert", () => {
    const fehlen = [];
    for (const id of THEMES) {
      const t = themeInfo(id).token;
      for (const gruppe of Object.keys(PALETTE)) for (const tok of PALETTE[gruppe]) if (!(tok in t)) fehlen.push(id + ": " + tok);
    }
    erwarte.gleich(fehlen, [], "fehlende Palette-Tokens: " + fehlen.slice(0, 8).join("; "));
  });

  pruefe("Wirkung: 7 Token-Zustaende (hell ueber beide Pfade) und die Theme-Dateien werden gebaut", () => {
    erwarte.gleich(ZUSTAENDE.length + THEMES.length, 8, "3 Basis-Pfade + 5 Themes = 7 Zustaende (hell zweifach)");
    for (const z of ZUSTAENDE) erwarte.wahr(!!z[1]["--bg"] && !!z[1]["--ink"], z[0] + " hat --bg/--ink");
    for (const id of THEMES) {
      const t = themeInfo(id).token;
      erwarte.wahr(!!t["--bg"] && !!t["--ink"], "Theme " + id + " hat --bg/--ink");
    }
    erwarte.enthaelt(quelle("bauen.py"), 'sorted(p.name for p in d.glob("*.css"))', "bauen.py sammelt alle src/stil/*.css (Themes werden mitgebaut)");
  });
});
