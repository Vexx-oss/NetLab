"use strict";
/* QUELLEN-GATE (QUA-03, 3.0) — findet Zusicherungen, die nicht falsch sein können.
   Befund Q3 (berichte/qualitaet.md): zwei Tests endeten mit einem immer wahren "wahr(true)" und waren
   damit unbedingt grün; Befund Q4: vier Python-Fallbacks zählten als Zusicherung. r-arch-Befund
   31.10.2026: eine naive Textsuche zählt auch Kommentare, Strings und Regex-Inhalte — deshalb
   maskiert dieses Werkzeug zuerst alles, was kein CODE ist, und sucht nur im maskierten Text.
   Nutzung: tests/run.js ruft pruefeQuellen() vor jedem Lauf auf (Abbruch mit Datei:Zeile, Exit 1).
            Schnelltest ohne Testlauf:  node tools/quellen-gate.js
   Ein eigener Ausführungspfad an tests/run.js vorbei fehlt bewusst — das Gate läuft bei jedem Lauf. */
const fs = require("fs"), path = require("path");
const WURZEL = path.resolve(__dirname, "..");
const TESTS = path.join(WURZEL, "tests");
const VERBOTEN = [
  {muster: /erwarte\.wahr\(\s*true\s*[,)]/, was: "erwarte.wahr(true) — unfalsifizierbare Zusicherung"},
];

/* Ersetzt Kommentare, Strings, Template-Literale und Regex-Literale durch Leerzeichen.
   Zeilenumbrüche bleiben stehen, damit Zeilennummern unverändert stimmen. */
function maskiere(text) {
  const aus = text.split("");
  const blank = (a, b) => {
    for (let k = a; k < b && k < aus.length; k++) if (aus[k] !== "\n" && aus[k] !== "\r") aus[k] = " ";
  };
  /* Steht an Position i ein Regex-Literal oder eine Division? (Heuristik wie in JS-Lexern) */
  const regexErlaubt = (i) => {
    let k = i - 1;
    while (k >= 0 && (aus[k] === " " || aus[k] === "\t" || aus[k] === "\r" || aus[k] === "\n")) k--;
    if (k < 0) return true;
    const z = aus[k];
    if ("(,=:[!&|?{};+-*%~^<>".includes(z)) return true;
    if (/[A-Za-z_$]/.test(z)) {
      let wort = "";
      while (k >= 0 && /[\w$]/.test(aus[k])) { wort = aus[k] + wort; k--; }
      return ["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "case", "do", "else", "yield", "await"].includes(wort);
    }
    return false;
  };
  let i = 0;
  while (i < text.length) {
    const c = text[i], n = text[i + 1];
    if (c === "/" && n === "/") {
      let j = text.indexOf("\n", i); if (j < 0) j = text.length;
      blank(i, j); i = j; continue;
    }
    if (c === "/" && n === "*") {
      let j = text.indexOf("*/", i + 2); j = j < 0 ? text.length : j + 2;
      blank(i, j); i = j; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < text.length) { if (text[j] === "\\") { j += 2; continue; } if (text[j] === c) { j++; break; } j++; }
      blank(i, j); i = j; continue;
    }
    if (c === "\u0060") {
      let j = i + 1;
      while (j < text.length) { if (text[j] === "\\") { j += 2; continue; } if (text[j] === "\u0060") { j++; break; } j++; }
      blank(i, j); i = j; continue;
    }
    if (c === "/" && regexErlaubt(i)) {
      let j = i + 1, inKlasse = false;
      while (j < text.length) {
        const d = text[j];
        if (d === "\\") { j += 2; continue; }
        if (d === "[") { inKlasse = true; j++; continue; }
        if (d === "]") { inKlasse = false; j++; continue; }
        if (d === "/" && !inKlasse) { j++; break; }
        if (d === "\n") break;
        j++;
      }
      blank(i, j); i = j; continue;
    }
    i++;
  }
  return aus.join("");
}

/* quellen: [{datei, text}] → {geprueft, funde:[{datei, zeile, was, text}]} */
function pruefeQuellen(quellen) {
  const funde = [];
  for (const q of quellen || []) {
    const name = q && q.datei ? String(q.datei) : "?";
    const text = q && typeof q.text === "string" ? q.text : "";
    const original = text.split(/\r?\n/);
    const maskiert = maskiere(text).split(/\r?\n/);
    for (let i = 0; i < maskiert.length; i++) {
      for (const v of VERBOTEN) {
        if (v.muster.test(maskiert[i])) funde.push({datei: name, zeile: i + 1, was: v.was, text: String(original[i] || "").trim()});
      }
    }
  }
  return {geprueft: (quellen || []).length, funde};
}

/* Alle Testdateien als Quellen einlesen (für den Schnelltest und für tests/run.js). */
function sammleTestdateien() {
  return fs.readdirSync(TESTS).filter(n => n.endsWith(".test.js")).sort()
    .map(n => ({datei: "tests/" + n, text: fs.readFileSync(path.join(TESTS, n), "utf8")}));
}

function main() {
  const r = pruefeQuellen(sammleTestdateien());
  if (r.funde.length) {
    for (const f of r.funde) console.error("UNFALSIFIZIERBAR " + f.datei + ":" + f.zeile + " — " + f.was + "\n    " + f.text.slice(0, 160));
    console.error("\n" + r.funde.length + " unfalsifizierbare Zusicherung(en) in " + r.geprueft + " Testdateien. Das ist kein grüner Lauf.");
    process.exit(1);
  }
  console.log(r.geprueft + " Testdateien geprüft (Code, ohne Kommentare/Strings/Regex), 0 unfalsifizierbare Zusicherungen.");
}

if (require.main === module) main();
module.exports = {VERBOTEN, maskiere, pruefeQuellen, sammleTestdateien};
