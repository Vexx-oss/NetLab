"use strict";
/* KRN-07: DETERMINISMUS-WACHE (task-75)
   Geprüft wird der Quelltext der headless-Schichten: src/kern, src/modell, src/sim, src/cli dürfen
   KEINE eigene Uhr und keinen eigenen Zufall ziehen. Erlaubt sind allein die benannten Zeit-Nähte in
   src/kern/basis.js (jetzt(), heute(), plusTage(), tageZwischen() — die Tests stellen sie über
   jetzt.setzen() fest); Kommentare werden vor der Suche gestrippt (Bauart
   tests/klassenraum-codec.test.js:332-335), damit Erklärtexte keine Fehltreffer erzeugen.
   Verboten: Math.random, performance.now, Date.now, new Date — außer in den vier genannten
   basis.js-Nähten. Der Altbefund KRN-B11 (store.sofort nahm Date.now() statt jetzt()) wird so rot. */
const DW_WURZEL = require("path").join(__dirname, "..");
const DW_FS = require("fs"), DW_PATH = require("path");
const DW_VERBOTEN = /Math\.random|performance\.now|Date\.now|new Date\s*\(/g;
/* Die vier erlaubten Zeit-Nähte in basis.js — Wortlaut aus dem Code; jede andere Uhr ist rot. */
const DW_ERLAUBT = [
  /fest != null \? fest : Date\.now\(\)/,      /* jetzt()/weiter(): die steuerbare Naht */
  /new Date\(jetzt\(\)\)/,                    /* heute(d = new Date(jetzt())) */
  /new Date\(y, m-1, d\+n\)/,                  /* plusTage */
  /new Date\(b\+"T12:00"\)|new Date\(a\+"T12:00"\)/, /* tageZwischen */
];
function dwStrippt(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, s => s.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, s => " ".repeat(s.length));
}
function dwDateien(ordner) {
  const raus = [];
  const lauf = d => {
    for (const e of DW_FS.readdirSync(d, {withFileTypes: true})) {
      const p = DW_PATH.join(d, e.name);
      if (e.isDirectory()) lauf(p);
      else if (p.endsWith(".js")) raus.push(p);
    }
  };
  lauf(DW_PATH.join(DW_WURZEL, "src", ordner));
  return raus;
}
function dwTreffer(ordner, name) {
  const treffer = [];
  for (const datei of dwDateien(ordner)) {
    const rel = DW_PATH.relative(DW_WURZEL, datei).replace(/\\/g, "/");
    const zeilen = dwStrippt(DW_FS.readFileSync(datei, "utf8")).split(/\r?\n/);
    zeilen.forEach((z, i) => {
      DW_VERBOTEN.lastIndex = 0;
      let m;
      while ((m = DW_VERBOTEN.exec(z))) {
        const erlaubt = rel === "src/kern/basis.js" && DW_ERLAUBT.some(re => re.test(z));
        if (!erlaubt) treffer.push(rel + ":" + (i + 1) + " „" + m[0] + "“");
      }
    });
  }
  return treffer;
}
if (typeof require === "function") gruppe("Kern: Determinismus-Wache (KRN-07)", () => {
  for (const ordner of ["sim", "cli"]) {
    pruefe("src/" + ordner + ": 0 eigene Uhr, 0 eigener Zufall", () => {
      const t = dwTreffer(ordner);
      erwarte.gleich(t.join(" | "), "", "verbotene Quellen in src/" + ordner);
    });
  }
  pruefe("src/modell: 0 eigene Uhr, 0 eigener Zufall", () => {
    erwarte.gleich(dwTreffer("modell").join(" | "), "", "verbotene Quellen in src/modell");
  });
  pruefe("src/kern: nur die vier benannten Zeit-Nähte in basis.js", () => {
    erwarte.gleich(dwTreffer("kern").join(" | "), "", "unerlaubte Uhr/Zufall in src/kern");
  });
  pruefe("Wache selbst: der Grundtext nennt die Naht und stripst Kommentare", () => {
    const quelle = DW_FS.readFileSync(DW_PATH.join(DW_WURZEL, "src", "kern", "basis.js"), "utf8");
    erwarte.enthaelt(quelle, "setzen = ms", "die Naht jetzt().setzen muss existieren");
    erwarte.gleich(dwStrippt("/* Math.random() */ const x = 1;").includes("Math.random"), false, "Kommentar wird gestrippt");
    erwarte.gleich(dwStrippt("const x = Math.random();").includes("Math.random"), true, "echter Aufruf bleibt sichtbar");
  });
});
