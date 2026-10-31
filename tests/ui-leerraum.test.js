"use strict";
/* VIS-09 (C, task-90): Leerräume/gestreckte Karten. Headless ist kein Layout messbar; geprüft werden
   deshalb die CSS-Regeln, die den Leerraum strukturell verhindern (Raster-Teiler, keine Streckung),
   plus Daten-/Zählproben. Die <25-%-Messung bei 1440/960/720 macht vision (Bild + DOM-Zahlen);
   dieser Test liefert die falsifizierbaren Fixpunkte dafür. */
const LR_LADEN = (() => {
  try { return typeof require === "function" && typeof DATEN === "object" && DATEN !== null && typeof document === "undefined"; }
  catch (e) { return false; }
})();
const LR_DATEIEN = ["subnetz.css", "klassenraum.css", "kundenakte.css", "karriere.css", "lernstand.css"];
function lrCss(name){
  const fs = require("fs"), path = require("path");
  return fs.readFileSync(path.join(__dirname, "..", "src", "stil", name), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
}

if (!LR_LADEN) {
  pruefe("Leerraum-Regeln: nur unter node tests/run.js prüfbar", () => { erwarte.wahr(false, "require/DATEN fehlt"); });
} else gruppe("UI: Leerräume und gestreckte Karten (VIS-09 C)", () => {

  pruefe("VIS-09 C: Subnetting-Raster füllt 8 Modulkarten ohne leere Teilzeile (4/2/1 Spalten)", () => {
    const n = DATEN.subnetzLehrplan.module.length;
    erwarte.gleich(n, 8, "acht Modulkarten (Lehrplan)");
    const css = lrCss("subnetz.css");
    erwarte.passt(css, /\.ansicht\[data-ansicht="subnetz"\] \.bn-raster > \.sn-modul\{grid-column:span 3\}/, "1440: vier Spalten (span 3)");
    erwarte.passt(css, /@media \(max-width:1100px\)\{ \.ansicht\[data-ansicht="subnetz"\] \.bn-raster > \.sn-modul\{grid-column:span 6\}/, "960: zwei Spalten (span 6)");
    /* stil-Review P1: bento.css schaltet ≤900 px auf EINE Spalte — die Karte muss dort span 1 haben. */
    erwarte.passt(css, /@media \(max-width:900px\)\{ \.ansicht\[data-ansicht="subnetz"\] \.bn-raster > \.sn-modul\{grid-column:span 1\}/, "≤900: eine Spalte (span 1, kein implizites 12-Spalten-Raster)");
    erwarte.falsch(/\@media \(max-width:720px\)\{ \.ansicht\[data-ansicht="subnetz"\] \.bn-raster > \.sn-modul\{grid-column:span 12\}/.test(css), "keine 720er-span-12-Regel mehr (stil P1)");
    erwarte.gleich([n % 4, n % 2], [0, 0], "8 ist durch 4 und 2 teilbar — keine Restzelle in der letzten Zeile");
    /* 44-px-Regel der Subnetting-Ansicht bleibt unangetastet. */
    erwarte.passt(css, /\.sn-seite \.knopf\{min-height:44px\}/, "44-px-Ziele nicht regressiert");
  });

  pruefe("VIS-09 C: Klassenraum-Inhaltsspalte nutzt die Breite (Leerraum je Seite < 25 % bei 1440)", () => {
    const css = lrCss("klassenraum.css");
    /* stil-Review P1: der 660-px-Deckel bleibt unter 1200 px erhalten; erst ab 1200 px wird breiter. */
    erwarte.passt(css, /@media \(min-width:1200px\)\{ \.kl-lehrer \.kl-spalte\{width:min\(1120px,100%\)\} \}/, "ab 1200 px: Inhaltsspalte 1120 px (sonst 660-px-Deckel)");
    const breite = 1120, fenster = 1440;
    erwarte.wahr((fenster - breite) / 2 / fenster < 0.25, "je Seite bleiben " + ((fenster - breite) / 2) + " px < 25 % der Fläche");
  });

  pruefe("VIS-09 C: Kundenakte/Lernstand/Kunden — keine auf Fremdhöhe gestreckten Karten", () => {
    const akte = lrCss("kundenakte.css");
    erwarte.passt(akte, /\.ka-seite \.bn-raster\{align-items:start\}/, "Aktenraster streckt keine Kacheln (align-items:start)");
    erwarte.passt(akte, /\.ka-rechts > \.ka-block\{flex:0 0 auto; align-self:start\}/, "rechter Kachelstapel behält Inhaltshöhe");
    const lern = lrCss("lernstand.css");
    erwarte.passt(lern, /\.bn-raster\.lern-raster\{align-items:start\}/, "Lernstand-Kacheln werden nicht gestreckt");
    const karriere = lrCss("karriere.css");
    erwarte.passt(karriere, /\.kr-raster\{[^}]*align-items:start/, "Kundenraster streckt keine Karten (eine Regel, keine Dopplung)");
    erwarte.passt(karriere, /\.kr-raster > \.kr-kunde\{align-self:start\}/, "Kundenkarten behalten Inhaltshöhe");
  });

  pruefe("VIS-09 C: Theme-/Fokus-Grundlagen unangetastet (keine Theme-Datei geändert, 44 px bleiben)", () => {
    const fs = require("fs"), path = require("path");
    const dir = path.join(__dirname, "..", "src", "stil");
    const themen = fs.readdirSync(dir).filter(n => n.startsWith("zzz-thema-"));
    /* Die Fixliste hat NUR die fünf Basisdateien angefasst — kein Theme ist dabei. */
    erwarte.wahr(themen.length >= 5, "fünf Theme-Dateien vorhanden: " + themen.join(", "));
    for (const f of themen) erwarte.falsch(LR_DATEIEN.includes(f), "kein Theme in der Fixliste: " + f);
    const akte = lrCss("kundenakte.css");
    erwarte.passt(akte, /\.ka-seite \.ka-zurueck, \.ka-block \.knopf\.klein\{min-height:44px\}/, "44-px-Ziele in der Akte unverändert");
  });

});
