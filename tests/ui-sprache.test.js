"use strict";
/* task-115 (r-didaktik W4, D1/D2): Begriffe in den neuen 3.0-Flächen.
   D1: einheitlich „Abgabe(n)“ in Flächen/Zählern; „Ergebnis-Code“ nur für den Code selbst.
   D2: Der Karriere-Stufenwert (azubi … meister) heißt nicht mehr „Bildungsstand“.
   Wirkungstest: D1 prüft die gerenderte Ansicht (tests/ui-klassenraum.test.js, „D1: …“);
   dieses Gate hält die sichtbaren Quelltext-Literale für D2 und die Trennregel von D1 fest. */
const SP_KANN_LADEN = (() => {
  try { return typeof require === "function" && typeof document === "undefined"; } catch (e) { return false; }
})();
function spQuelle(name){
  const fs = require("fs"), path = require("path");
  return fs.readFileSync(path.join(__dirname, "..", "src", "ui", name), "utf8");
}

if (!SP_KANN_LADEN) {
  pruefe("Sprach-Gate: nur unter node tests/run.js prüfbar", () => { erwarte.wahr(false, "require fehlt"); });
} else gruppe("UI: Begriffe (task-115)", () => {

  pruefe("D2: Karriere-Stufe heißt „Karriere-Stufe“, nicht „Bildungsstand“", () => {
    const q = spQuelle("lernstand.js");
    erwarte.wahr(q.includes("Karriere-Stufe"), "die sichtbare Bezeichnung ist „Karriere-Stufe“");
    erwarte.enthaelt(q, "Karriere-Stufe: Stufe ", "die Kompetenzkarte nennt Begriff und Stufe");
    erwarte.falsch(q.includes("Bildungsstand"), "kein „Bildungsstand“ mehr im Lernstand-UI (verwechselbar mit IHK-Abschluss)");
  });

  pruefe("D1: „Abgabe“ in Flächen, „Ergebnis-Code“ nur für den Code selbst", () => {
    const q = spQuelle("klassenraum.js");
    erwarte.falsch(q.includes("noch keine Ergebnisse"), "kein „noch keine Ergebnisse“ mehr");
    erwarte.enthaelt(q, "noch keine Abgaben", "die leere Ampel sagt „noch keine Abgaben“");
    erwarte.enthaelt(q, '"Abgabe-Codes"', "das Feld der Lehrkraft heißt „Abgabe-Codes“");
    erwarte.enthaelt(q, "Ergebnis-Code für deine Lehrkraft", "der erzeugte Code selbst bleibt „Ergebnis-Code“");
    erwarte.enthaelt(q, "Abgabe ohne gültigen Platz", "ungültige Plätze werden als Abgabe ausgewiesen");
  });

});
