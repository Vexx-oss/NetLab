"use strict";
/* ---------- CSS-04: 44-px-Ziel systemisch, Ausnahmen belegt (3.0.0) ----------
   BEFUND (Frontend-Audit 2.9.0, berichte/frontend-design.md § CSS-04): Das 44-px-Ziel stand nur
   als 158 lokale Patches im CSS; zentral waren kleinere Ziele: .knopf 40 (rahmen.css:105),
   .in-eingabe/.in-auswahl 34 (inspektor.css:73), .ko-knopf 28 (konsole.css:12),
   .lb-wz/.lb-knopf 40 (editor.css:105), .wk-suche-feld 32 (werkstatt.css:12), .wk-knopf 36.
   NORM (Projektregel/Design § 35, Lead-Auftrag CSS-04): Bedienziele >= 44 px. Ausnahmen sind
   ausdruecklich begruendet, gemessen und in tests/stil-ziele-ausnahmen.json gelistet — die Liste
   darf nicht luegen (Ist-Wert wird gegen das CSS gemessen) und nicht veralten.
   DIESER TEST rechnet die WIRKSAME Groesse aus der CSS-Kaskade (basis.css zuerst, dann
   alphabetisch wie bauen.py stile()); @media-Bloecke zaehlen NICHT (das 44er-Ziel gilt auch fuer
   Mausbedienung, das grobe Zeiger-Medium ist nur eine Zusatzregel). Er prueft:
   1) jedes Ziel >= 44 px oder dokumentierte Ausnahme,
   2) Ausnahmen mit Ist-Wert und Begruendung, keine veraltete Ausnahme,
   3) das Bitband: Hoehe 44, 32 Zellen in EINER Reihe, Breite als Ausnahme (Design § 43),
   4) dass die Klassen im UI-Code wirklich erzeugt werden (Wirkung, nicht nur CSS-Text).
   GRENZE (ehrlich): das ist eine statische Rechnung der deklarierten Kaskade, keine DOM-Messung;
   die Sicht-/Ueberlaufpruefung der geaenderten Flaechen gehoert zu vision/R-design (W2/W4). */
gruppe("Stil: 44-px-Ziel und belegte Ausnahmen (CSS-04)", () => {
  const fs = require("fs"), path = require("path");
  const WURZEL = path.join(__dirname, "..");
  const STIL = path.join(WURZEL, "src", "stil");
  const lese = (name) => fs.readFileSync(path.join(STIL, name), "utf8");
  const quelle = (rel) => fs.readFileSync(path.join(WURZEL, rel), "utf8");
  const LISTE = path.join(__dirname, "stil-ziele-ausnahmen.json");

  /* Reihenfolge wie bauen.py stile(): basis.css zuerst, danach alphabetisch. Theme-Dateien
     (zzz-thema-*) bleiben aussen vor: sie sind bedingte Designsysteme (html[data-theme=...]) und
     laut Lead-Entscheid unangetastet — gemessen wird der POLARIS-Standard. */
  const DATEIEN = ["basis.css"].concat(fs.readdirSync(STIL)
    .filter((n) => n.endsWith(".css") && n !== "basis.css" && !n.startsWith("zzz-thema-")).sort());
  const ohneKommentar = (t) => t.replace(/\/\*[\s\S]*?\*\//g, " ");
  /* @media/@supports/@layer-Bloecke entfernen: Ziele gelten fuer Mausbedienung, nicht nur coarse. */
  const ohneMedien = (css) => {
    let out = "", i = 0;
    while (i < css.length) {
      const rest = css.slice(i);
      const m = /@(media|supports|layer)\b/.exec(rest);
      if (!m) { out += rest; break; }
      out += rest.slice(0, m.index);
      const st = css.indexOf("{", i + m.index);
      if (st < 0) break;
      let tiefe = 0, j = st;
      for (; j < css.length; j++) { if (css[j] === "{") tiefe++; else if (css[j] === "}" && --tiefe === 0) { j++; break; } }
      i = j;
    }
    return out;
  };
  const regeln = (datei) => {
    const css = ohneMedien(ohneKommentar(lese(datei)));
    const out = [];
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) out.push({ sel: m[1].trim(), rumpf: m[2] });
    return out;
  };
  /* Kaskade: je Selektor die letzte Deklaration je Eigenschaft (spaetere Datei/Regel gewinnt). */
  const kaskade = new Map();
  for (const datei of DATEIEN) {
    for (const r of regeln(datei)) {
      for (const sel of r.sel.split(",").map((x) => x.trim()).filter(Boolean)) {
        const map = kaskade.get(sel) || new Map();
        kaskade.set(sel, map);
        for (const stueck of r.rumpf.split(";")) {
          const k = stueck.indexOf(":");
          if (k < 0) continue;
          map.set(stueck.slice(0, k).trim(), stueck.slice(k + 1).trim());
        }
      }
    }
  }
  const px = (wert) => { const m = /(-?\d+(?:\.\d+)?)px/.exec(String(wert || "")); return m ? Number(m[1]) : null; };
  const wert = (sel, prop) => { const m = kaskade.get(sel); return m ? m.get(prop) : undefined; };
  const wirksam = (sel, achse) => {
    const a = px(wert(sel, achse)), b = px(wert(sel, achse === "height" ? "min-height" : "min-width"));
    return a == null && b == null ? null : Math.max(a == null ? -Infinity : a, b == null ? -Infinity : b);
  };

  const ZIELE = [
    {sel: ".knopf", achse: "height"},
    {sel: ".in-eingabe", achse: "height"},
    {sel: ".in-auswahl", achse: "height"},
    {sel: ".in-port-feld .in-eingabe", achse: "height"},
    {sel: ".in-svi .in-eingabe", achse: "height"},
    {sel: ".ko-knopf", achse: "height"},
    {sel: ".lb-wz", achse: "height"},
    {sel: ".lb-knopf", achse: "height"},
    {sel: ".wk-suche-feld", achse: "height"},
    {sel: ".wk-knopf", achse: "height"},
    {sel: ".sw-bit", achse: "height"},
    {sel: ".menue-punkt", achse: "height"},
    {sel: ".pal-punkt", achse: "height"},
    {sel: ".am-zu", achse: "height"},
    {sel: ".kopf-knopf", achse: "height", ausnahme: true},
    {sel: ".kopf-knopf", achse: "width", ausnahme: true},
    {sel: ".sw-bit", achse: "width", ausnahme: true}
  ];

  const datenListe = JSON.parse(fs.readFileSync(LISTE, "utf8"));
  const ausnahmen = datenListe.ausnahmen || [];
  const finde = (sel, achse) => ausnahmen.filter((a) => a.selektor === sel && a.achse === achse);

  pruefe("Systemische Ziele: >= 44 px (oder Ausnahme mit Beleg)", () => {
    const verstoesse = [];
    for (const z of ZIELE) {
      const ist = wirksam(z.sel, z.achse);
      const hatAusnahme = finde(z.sel, z.achse).length === 1;
      if (z.ausnahme && !hatAusnahme) { verstoesse.push(z.sel + " " + z.achse + ": keine Ausnahme dokumentiert"); continue; }
      if (!z.ausnahme && hatAusnahme) { verstoesse.push(z.sel + " " + z.achse + ": unerwartete Ausnahme"); continue; }
      if (!z.ausnahme && (ist == null || ist < 44)) verstoesse.push(z.sel + " " + z.achse + " = " + ist + " px < 44");
    }
    erwarte.gleich(verstoesse.length, 0, "Verstoesse: " + verstoesse.slice(0, 8).join("; "));
  });

  pruefe("Ausnahmen luegen nicht: Ist-Wert gegen CSS gemessen, Begruendung vorhanden, keine veraltete", () => {
    erwarte.wahr(ausnahmen.length <= 4, "hoechstens 4 Ausnahmen (Whitelist klein halten), sind " + ausnahmen.length);
    const fehler = [];
    for (const a of ausnahmen) {
      const ziel = ZIELE.filter((z) => z.sel === a.selektor && z.achse === a.achse);
      if (ziel.length !== 1) { fehler.push("veraltet/ohne Ziel: " + a.selektor + " " + a.achse); continue; }
      if (String(a.grund || "").length < 40) fehler.push(a.selektor + ": Begruendung zu kurz");
      if (String(a.beleg || "").length < 5) fehler.push(a.selektor + ": Beleg fehlt");
      if (typeof a.ist === "number") {
        const gemessen = wirksam(a.selektor, a.achse);
        if (gemessen !== a.ist) fehler.push(a.selektor + " " + a.achse + ": Ist-Wert " + a.ist + " px, CSS sagt " + gemessen + " px");
      }
    }
    erwarte.gleich(fehler, [], "Ausnahmen-Fehler: " + fehler.slice(0, 8).join("; "));
  });

  pruefe("Bitband: 32 Zellen in EINER Reihe, Hoehe 44, Breite als Ausnahme nach Design § 43", () => {
    const hoehe = wirksam(".sw-bit", "height");
    erwarte.wahr(hoehe != null && hoehe >= 44, "Bit-Zelle ist " + hoehe + " px hoch (soll >= 44)");
    const reihe = kaskade.get(".sw-bit-reihe");
    erwarte.wahr(!!reihe, "Regel .sw-bit-reihe fehlt");
    const rumpf = [...reihe.entries()].map((e) => e[0] + ":" + e[1]).join(";");
    erwarte.enthaelt(rumpf, "display:flex", "Bitband ist eine Flex-Reihe");
    erwarte.enthaelt(rumpf, "flex-wrap:wrap", "Bitband bricht bei Platzmangel um, statt zu quetschen");
    const breite = finde(".sw-bit", "width");
    erwarte.gleich(breite.length, 1, "Breiten-Ausnahme fuer .sw-bit fehlt");
    erwarte.enthaelt(breite[0].beleg, "43", "die Breiten-Ausnahme verweist auf Design § 43");
    erwarte.enthaelt(breite[0].grund, "Bit", "die Begruendung nennt die Bit-Zellen");
  });

  pruefe("Wirkung: die geprueften Klassen werden im UI-Code wirklich erzeugt", () => {
    const paare = [
      ["src/ui/inspektor.js", "in-eingabe"],
      ["src/ui/konsole.js", "ko-knopf"],
      ["src/ui/editor.js", "lb-wz"],
      ["src/ui/werkstatt.js", "wk-such"],
      ["src/ui/subnetz-werkzeuge.js", "sw-bit"],
      ["src/ui/app.js", "knopf"]
    ];
    for (const p of paare) erwarte.enthaelt(quelle(p[0]), p[1], p[0] + " erzeugt ." + p[1]);
  });
});
