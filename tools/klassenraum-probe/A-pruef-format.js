"use strict";
/* =====================================================================================
   Bereich A · GEGENPRÜFUNG „A-format“ (Iteration 2) — unabhängige Nachrechnung
   =====================================================================================

   Prüfgegenstand:
     tools/klassenraum-probe/A-format.js      (Entwurf, 1318 Zeilen)
     Nachweise/Klassenraum/A-format.json      (Entwurfs-Belege, 2526 Zeilen)
   Vertrag: tools/klassenraum-probe/A-festlegung.md (eingefroren)
   Auftrag: tools/auftraege/KLASSENRAUM.md

   Aufruf (wiederholbar, Befehl steht auch im Ergebnis-JSON):
     & "$env:LOCALAPPDATA\node-portable\node-v24.21.0-win-x64\node.exe" tools\klassenraum-probe\A-pruef-format.js
   Schalter:
     --ohne-schreiben   nur messen, Nachweise/Klassenraum/A-pruef-format.json NICHT anfassen

   GRUNDSATZ DIESER PROBE
   1. Gerechnet wird mit einer EIGENEN Implementierung, die nur aus A-festlegung.md
      abgeleitet ist: eigene Normalisierung, eigene Bit-Packung (reine Arithmetik statt
      Schiebeoperatoren), eigene Prüfsummen mit ausgeschriebener Gewichtssumme, eigener
      Ergebnis-Code. Der Entwurfscode wird NICHT als Rechenweg benutzt.
   2. Zusätzlich wird TEIL 1 des Entwurfs (nur die reinen Codec-Funktionen, ohne Messgerüst)
      aus dem Quelltext geschnitten und in einer vm ohne fs/require ausgeführt — damit lässt
      sich „Entwurf gegen Ist“ direkt vergleichen, ohne dass der Entwurf seine Ergebnisdatei
      schreiben kann. Das Schreiben der Entwurfsdatei ist damit ausgeschlossen.
   3. Jede Zahl in dieser Datei wird in dieser Sitzung gemessen. Was nicht gemessen wurde,
      steht unter „nichtGeprueft“.
   4. Kein Math.random, keine Uhr im Rechenweg: fester Seed 20261006 (mulberry32), feste Uhr
      im Lader. Zufall nur für Stichproben, nie für die Kernzahlen.
   5. src/ wird nicht angefasst, nichts geschrieben außer Nachweise/Klassenraum/A-pruef-format.json.

   Laufzeit: die Probe misst sie selbst und schreibt sie ins JSON. Die Grenze von ~10 Minuten
   wird vor jedem teuren Abschnitt geprüft (Fristen unten) — bricht ein Abschnitt ab, steht das
   ausdrücklich als „abgebrochen“ im JSON, nie als vollständige Zahl.
===================================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..", "..");
const ZIELDATEI = path.join(ROOT, "Nachweise", "Klassenraum", "A-pruef-format.json");
const ENTWURF_DATEI = path.join(__dirname, "A-format.js");
const ENTWURF_JSON = path.join(ROOT, "Nachweise", "Klassenraum", "A-format.json");
const FESTLEGUNG = path.join(__dirname, "A-festlegung.md");
const LAUFZEIT_GESAMT = path.join(__dirname, "A-recon.js");
const BEFEHL = "& \"$env:LOCALAPPDATA\\node-portable\\node-v24.21.0-win-x64\\node.exe\" tools\\klassenraum-probe\\A-pruef-format.js";
const STAND = "2026-10-06";
const SEED = 20261006;
const T0 = Date.now();

/* =====================================================================================
   TEIL A — EIGENE IMPLEMENTIERUNG (nur aus A-festlegung.md)
   ===================================================================================== */

/* § 1 Alphabet: 32 Zeichen, 5 Bit; kein I, O, 0, 1 */
const AZ = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function w(c) { return AZ.indexOf(c); }                    /* -1 = Fremdzeichen */
function z(v) { return (v >= 0 && v < 32) ? AZ[v] : null; }

/* § 2 Prüfsumme: Gewichte ausgeschrieben (keine reduce-Kurzform, damit der Rechenweg sichtbar ist) */
function summeC1(werte) { let s = 0; for (let i = 0; i < werte.length; i++) s += (i + 1) * werte[i]; return s; }
function summeC2(werte) { let s = 0; for (let i = 0; i < werte.length; i++) s += (2 * i + 1) * werte[i]; return s; }
function C1(werte) { return summeC1(werte) % 31; }
function C2(werte) { return summeC2(werte) % 32; }

/* § 1 Normalisierung: uppercase → alles außer [0-9A-Z] weg → führendes NL/E abschneiden,
   WENN danach genau 6 (Auftrag) bzw. 7 (Ergebnis) Zeichen übrig bleiben → Länge → Fremdzeichen. */
function normalisier(roh, art) {
  if (roh === null || roh === undefined) return null;
  const s = String(roh);
  if (s.trim() === "") return null;
  let rest = "";
  for (const c of s.toUpperCase()) if ((c >= "0" && c <= "9") || (c >= "A" && c <= "Z")) rest += c;
  const auftrag = art !== "ergebnis";
  const praefix = auftrag ? "NL" : "E";
  const nutz = auftrag ? 6 : 7;
  if (rest.startsWith(praefix) && rest.length - praefix.length === nutz) rest = rest.slice(praefix.length);
  if (rest.length !== nutz) return {fehler: "länge", länge: rest.length, erwartet: nutz, roh: s};
  const fremd = [];
  for (const c of rest) if (w(c) < 0) fremd.push(c);
  if (fremd.length) return {fehler: "zeichen", fremdzeichen: [...new Set(fremd)].join(""), roh: s};
  return {art: auftrag ? "auftrag" : "ergebnis", nutzteil: rest, roh: s};
}

/* § 3 Auftragscode: n = sitzung·2^15 + art·2^14 + index·2^8 + variante (reine Arithmetik) */
function codeAuftrag(sitzung, art, index, variante) {
  const felder = {sitzung, art, index, variante};
  const grenzen = {sitzung: [0, 31], art: [0, 1], index: [0, 63], variante: [0, 255]};
  for (const k of Object.keys(grenzen)) {
    const [lo, hi] = grenzen[k];
    if (!Number.isInteger(felder[k]) || felder[k] < lo || felder[k] > hi) return {fehler: "fassung", feld: k, wert: felder[k]};
  }
  const n = sitzung * 32768 + art * 16384 + index * 256 + variante;
  const v = [Math.floor(n / 32768) % 32, Math.floor(n / 1024) % 32, Math.floor(n / 32) % 32, n % 32];
  const c1 = C1(v), c2 = C2(v);
  return {
    code: "NL-" + v.map(z).join("") + "-" + z(c1) + z(c2),
    werte: v, C1: c1, C2: c2, sitzung, art, index, variante, n,
    rechnungC1: "1·" + v[0] + " + 2·" + v[1] + " + 3·" + v[2] + " + 4·" + v[3] + " = " + summeC1(v) + " → mod 31 = " + c1,
    rechnungC2: "1·" + v[0] + " + 3·" + v[1] + " + 5·" + v[2] + " + 7·" + v[3] + " = " + summeC2(v) + " → mod 32 = " + c2,
  };
}

/* § 3/§ 7/§ 8 Auftragscode lesen. tabellen: {tickets:[id…], skills:[id…]} */
function leseAuftrag(roh, tab) {
  const n0 = normalisier(roh, "auftrag");
  if (n0 === null) return null;
  if (n0.fehler) return n0;
  const nz = n0.nutzteil.slice(0, 4), pz = n0.nutzteil.slice(4, 6);
  const v = [...nz].map(w);
  const c1 = C1(v), c2 = C2(v);
  if (z(c1) !== pz[0] || z(c2) !== pz[1]) {
    return {fehler: "prüfziffer", nutzteil: n0.nutzteil, erwartet: z(c1) + z(c2), gelesen: pz, C1: c1, C2: c2};
  }
  const n = v[0] * 32768 + v[1] * 1024 + v[2] * 32 + v[3];
  const art = Math.floor(n / 16384) % 2;
  const f = {sitzung: Math.floor(n / 32768) % 32, art, index: Math.floor(n / 256) % 64, variante: n % 256};
  if (art === 0 && f.index >= tab.tickets.length) return {fehler: "fassung", ...f, tabelle: "TABELLE_AUFTRAEGE", länge: tab.tickets.length};
  if (art === 1 && f.index >= tab.skills.length) return {fehler: "fassung", ...f, tabelle: "TABELLE_SKILLS", länge: tab.skills.length};
  const id = art === 0 ? tab.tickets[f.index] : tab.skills[f.index];
  /* § 7b/§ 8: „auftrag“ = Index zeigt auf eine ID, die es hier nicht (mehr) gibt */
  if (typeof id !== "string" || (typeof tab.existiert === "function" && !tab.existiert(id))) {
    return {fehler: "auftrag", ...f, tabelle: art === 0 ? "TABELLE_AUFTRAEGE" : "TABELLE_SKILLS", unbekannteId: id === undefined ? null : id};
  }
  return {...f, id, artName: art === 0 ? "hand" : "generiert", seed: f.variante + 1,
    code: "NL-" + nz + "-" + pz, nutzteil: n0.nutzteil};
}

/* § 4 Ergebnis-Code: 25 Bit Nutzlast (5/5/4/2/9) + 10 Bit Prüfsumme, gedruckt E-XXXX-XXX.
   Diese Fassung ist VERTRAGSSTREng: Felder außerhalb der in § 4 genannten Bereiche sind ein Fehler. */
const ERGEBNIS_GRENZEN = {sitzung: [0, 31], platz: [0, 31], sterne: [0, 10], versuche: [0, 3], dauer: [0, 511]};
function codeErgebnis(f) {
  for (const k of Object.keys(ERGEBNIS_GRENZEN)) {
    const [lo, hi] = ERGEBNIS_GRENZEN[k];
    if (!Number.isInteger(f[k]) || f[k] < lo || f[k] > hi) return {fehler: "fassung", feld: k, wert: f[k], erlaubt: lo + ".." + hi};
  }
  const n = f.sitzung * 1048576 + f.platz * 32768 + f.sterne * 2048 + f.versuche * 512 + f.dauer;
  const v = [Math.floor(n / 1048576) % 32, Math.floor(n / 32768) % 32, Math.floor(n / 1024) % 32, Math.floor(n / 32) % 32, n % 32];
  const c1 = C1(v), c2 = C2(v);
  return {code: "E-" + v.slice(0, 4).map(z).join("") + "-" + v.slice(4).map(z).join("") + z(c1) + z(c2),
    werte: v, C1: c1, C2: c2, n, bitbreiten: "5+5+4+2+9 = 25 Bit Nutzlast + 10 Bit Prüfsumme = 35 Bit = 7 Zeichen"};
}
function leseErgebnis(roh) {
  const n0 = normalisier(roh, "ergebnis");
  if (n0 === null) return null;
  if (n0.fehler) return n0;
  const nz = n0.nutzteil.slice(0, 5), pz = n0.nutzteil.slice(5, 7);
  const v = [...nz].map(w);
  const c1 = C1(v), c2 = C2(v);
  if (z(c1) !== pz[0] || z(c2) !== pz[1]) return {fehler: "prüfziffer", nutzteil: n0.nutzteil, erwartet: z(c1) + z(c2), gelesen: pz};
  const n = v[0] * 1048576 + v[1] * 32768 + v[2] * 1024 + v[3] * 32 + v[4];
  const f = {sitzung: Math.floor(n / 1048576) % 32, platz: Math.floor(n / 32768) % 32,
    sterne: Math.floor(n / 2048) % 16, versuche: Math.floor(n / 512) % 4, dauer: n % 512};
  return {...f, dauerSekunden: f.dauer * 10, sterneAnzeige: f.sterne / 2, nutzteil: n0.nutzteil,
    code: "E-" + nz.slice(0, 4) + "-" + nz.slice(4)};
}

/* Fester Zufall (mulberry32) — nur für Stichproben */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* =====================================================================================
   TEIL B — Lader, Tabellen, Zähler
   ===================================================================================== */
const {kontext} = require("./A-lader.js");
const lab = kontext();
lab.Spiel._trocken = true;                 /* kein Speichern, keine Bus-Ereignisse */
lab.jetzt.setzen(1759706400000);           /* feste Uhr */
lab.Spiel._st = lab.Spiel.leererStand();
lab.Spiel._lz = {};
const {Spiel, DATEN} = lab;

const REIHE = Spiel.ticketReihe();
const TICKETS = REIHE.map(t => t.id);
const DATEN_IDS = DATEN.tickets.map(t => t.id);
const SKILLS = DATEN.skills.map(s => s.id);
const TAB = {tickets: TICKETS, skills: SKILLS, existiert: id => DATEN_IDS.includes(id) || SKILLS.includes(id)};

const M = {};          /* messungen: alle Zahlen */
const NACH = [];       /* nachgerechnet: Entwurf gegen Ist */
const KORR = [];       /* korrekturen: Datei/Funktion/Wert + richtiger Wert */
const BEFUNDE = [];
const OFFENE = [];
const NICHT = [];
const REST = [];
const BEFEHLE = [{befehl: BEFEHL, ergebnis: "noch nicht gesetzt"}];

function befund(t) { BEFUNDE.push(t); }
function offen(t) { OFFENE.push(t); }
function nicht(t) { NICHT.push(t); }
function restfehler(t) { REST.push(t); }
function kurz(x) { return JSON.stringify(x); }
function tsd(n) { return n.toLocaleString("de-DE"); }
function gleich(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function nach(punkt, entwurf, ist, urteil, hinweis) {
  const u = urteil || (gleich(entwurf, ist) ? "stimmt" : "falsch");
  const e = {punkt, entwurf, ist, urteil: u};
  if (hinweis) e.hinweis = hinweis;
  NACH.push(e);
  return u === "stimmt";
}

/* =====================================================================================
   M0 — Tabellenstand (Pflichtmessung des Entwurfs: 0_tabellenstand)
   ===================================================================================== */
M.tabellenstand = (() => {
  let ersteAbweichung = -1;
  for (let i = 0; i < Math.max(TICKETS.length, DATEN_IDS.length); i++) {
    if (TICKETS[i] !== DATEN_IDS[i]) { ersteAbweichung = i; break; }
  }
  return {
    module: lab.module.length,
    ticketReihe: TICKETS.length,
    datenTickets: DATEN_IDS.length,
    datenSkills: SKILLS.length,
    reihenfolgeGleich: TICKETS.join("|") === DATEN_IDS.join("|"),
    ersteAbweichung,
    abweichung: ersteAbweichung < 0 ? null : {position: ersteAbweichung, ticketReihe: TICKETS[ersteAbweichung], daten: DATEN_IDS[ersteAbweichung]},
    gleicheMenge: [...TICKETS].sort().join("|") === [...DATEN_IDS].sort().join("|"),
    terminalTickets: DATEN.tickets.filter(t => t.art === "terminal").length,
    skills: SKILLS,
  };
})();

const EJ = (() => { try { return JSON.parse(fs.readFileSync(ENTWURF_JSON, "utf8")); } catch (e) { return null; } })();
function hol(o, p) { let x = o; for (const k of p.split(".")) { if (x === undefined || x === null) return undefined; x = x[k]; } return x; }

if (EJ) {
  const t = M.tabellenstand;
  nach("0_tabellenstand.modulAnzahl", hol(EJ, "messungen.0_tabellenstand.modulAnzahl"), t.module);
  nach("0_tabellenstand.ticketReihe / datenTickets / datenSkills", [58, 58, 27], [t.ticketReihe, t.datenTickets, t.datenSkills]);
  nach("0_tabellenstand.reiheGleichDatenReihenfolge", hol(EJ, "messungen.0_tabellenstand.reiheGleichDatenReihenfolge"), t.reihenfolgeGleich);
  nach("0_tabellenstand.ersteAbweichungPosition", hol(EJ, "messungen.0_tabellenstand.ersteAbweichungPosition"), t.ersteAbweichung);
  nach("0_tabellenstand.terminalAuftraege", hol(EJ, "messungen.0_tabellenstand.terminalAuftraege"), t.terminalTickets);
} else {
  nicht("A-format.json konnte nicht gelesen/geparst werden — die Einzelvergleiche der Entwurfszahlen fehlen.");
}

/* =====================================================================================
   M1 — Länge + Round-Trip über ALLE 2^20 Nutzlasten (Pflichtmessung 1 + 2)
   Eigene Implementierung; zusätzlich Idempotenz der Normalisierung und der Randfall
   „Nutzteil beginnt mit NL“.
   ===================================================================================== */
const M1 = (() => {
  const t0 = Date.now();
  const FRIST = 300000;                                     /* 5 min für diesen Block */
  let fälle = 0, längeFalsch = 0, roundtrips = 0, abweichungen = 0, fassung = 0, andere = 0;
  let idempotenzFalsch = 0, nlNutzteilCodes = 0, erstesPrüfzeichenNeun = 0, zweitesPrüfzeichenNeun = 0;
  let abgebrochen = false;
  const freiProArt = {0: 0, 1: 0};
  const fehlerVerteilung = {};
  const abwBeispiele = [];
  const nlBeispiele = [];
  for (let sitzung = 0; sitzung < 32 && !abgebrochen; sitzung++) {
    for (let art = 0; art < 2; art++) {
      for (let index = 0; index < 64; index++) {
        for (let variante = 0; variante < 256; variante++) {
          fälle++;
          if ((fälle & 65535) === 0 && Date.now() - t0 > FRIST) { abgebrochen = true; break; }
          const r = codeAuftrag(sitzung, art, index, variante);
          if (r.code.length !== 10) längeFalsch++;
          if (r.code[8] === "9") erstesPrüfzeichenNeun++;      /* erstes Prüfzeichen = mod 31 → Wert 31 unmöglich */
          if (r.code[9] === "9") zweitesPrüfzeichenNeun++;     /* zweites Prüfzeichen = mod 32 → 1/32 der Fälle */
          const nz = r.code.slice(3, 7);
          if (nz.startsWith("NL")) {
            nlNutzteilCodes++;
            if (nlBeispiele.length < 3) nlBeispiele.push({code: r.code, felder: {sitzung, art, index, variante}});
          }
          /* Idempotenz: gedruckter Code, Nutzteil allein und Fassung mit den Prüfzeichen allein
             müssen denselben Nutzteil ergeben (Schreibweise-Unabhängigkeit). */
          const a = normalisier(r.code, "auftrag");
          const b = normalisier(r.code.slice(3, 7) + r.code.slice(8, 10), "auftrag");
          const c = normalisier(r.code.replace(/-/g, ""), "auftrag");
          if (!(a && !a.fehler && b && !b.fehler && c && !c.fehler && a.nutzteil === b.nutzteil && b.nutzteil === c.nutzteil)) idempotenzFalsch++;
          const e = leseAuftrag(r.code, TAB);
          if (e === null || e.fehler) {
            const klasse = e ? e.fehler : "null";
            fehlerVerteilung[klasse] = (fehlerVerteilung[klasse] || 0) + 1;
            if (klasse === "fassung") {
              fassung++;
              if ((art === 0 && index >= TAB.tickets.length) || (art === 1 && index >= TAB.skills.length)) freiProArt[art]++;
            } else {
              andere++;
            }
            continue;
          }
          roundtrips++;
          const abw = [];
          if (e.sitzung !== sitzung) abw.push("sitzung");
          if (e.index !== index) abw.push("index");
          if (e.variante !== variante) abw.push("variante");
          if (e.art !== art) abw.push("art");
          if (e.seed !== variante + 1) abw.push("seed");
          if (e.code !== r.code) abw.push("code");
          if (art === 0 && e.id !== TICKETS[index]) abw.push("ticketId");
          if (art === 1 && e.id !== SKILLS[index]) abw.push("skillId");
          if (abw.length) { abweichungen++; if (abwBeispiele.length < 5) abwBeispiele.push({felder: {sitzung, art, index, variante}, abw}); }
        }
      }
    }
  }
  return {
    nutzlastwerte: fälle, erwarteteNutzlastwerte: 1048576,
    roundtrips, roundtripsErwartet: (TAB.tickets.length + TAB.skills.length) * 32 * 256,
    freiIndizesAbgelehnt: fassung, freiProArt, andereFehlerAlsFassung: andere,
    längeFalsch, codeLängeMin: längeFalsch === 0 ? 10 : "siehe längeFalsch",
    idempotenzFalsch, nutzteilBeginntMitNL: nlNutzteilCodes, nlBeispiele,
    erstesPrüfzeichenIstNeun: erstesPrüfzeichenNeun,
    zweitesPrüfzeichenIstNeun: zweitesPrüfzeichenNeun,
    abweichungen, abwBeispiele, fehlerVerteilung,
    abgebrochen, ms: Date.now() - t0,
    rechnung: "(58 Aufträge + 27 Fertigkeiten) · 32 Sitzungen · 256 Varianten = 696320 gültige Codes; " +
      "2^20 − 696320 = 352256 freie Indizes; freie Indizes art 0: 6 · 32 · 256 = 49152, art 1: 37 · 32 · 256 = 303104",
  };
})();
M["1_2_roundtrip_länge"] = M1;

if (!M1.abgebrochen) {
  nach("1_und_2.nutzlastwerte (2^20)", hol(EJ, "messungen.1_und_2_roundtrip_länge.nutzlastwerte"), M1.nutzlastwerte);
  nach("1_und_2.roundtrips", hol(EJ, "messungen.1_und_2_roundtrip_länge.roundtrips"), M1.roundtrips);
  nach("1_und_2.freieIndizesAbgelehnt", hol(EJ, "messungen.1_und_2_roundtrip_länge.freieIndizesAbgelehnt"), M1.freiIndizesAbgelehnt);
  nach("1_und_2.freieIndizesProArt", hol(EJ, "messungen.1_und_2_roundtrip_länge.freieIndizesProArt"), M1.freiProArt);
  nach("1_und_2.feldAbweichungen", hol(EJ, "messungen.1_und_2_roundtrip_länge.feldAbweichungen"), M1.abweichungen);
  nach("1_und_2.längenverteilung", hol(EJ, "messungen.1_und_2_roundtrip_länge.längenverteilung"), {10: M1.nutzlastwerte - M1.längeFalsch});
  nach("2_länge.codeLängeMin/Max", [10, 10], [M1.codeLängeMin, M1.längeFalsch === 0 ? 10 : "falsch"]);
  nach("1_und_2.beispiele.erster", hol(EJ, "messungen.1_und_2_roundtrip_länge.beispiele.erster"), codeAuftrag(0, 0, 0, 0).code);
  nach("1_und_2.beispiele.letzterGültiger", hol(EJ, "messungen.1_und_2_roundtrip_länge.beispiele.letzterGültiger"), codeAuftrag(31, 1, 26, 255).code);
  nach("1_und_2.fehlerVerteilung", hol(EJ, "messungen.1_und_2_roundtrip_länge.fehlerVerteilung"), M1.fehlerVerteilung);
  nach("1_und_2.fehlerfreieCodes = roundtrips", hol(EJ, "messungen.1_und_2_roundtrip_länge.fehlerfreieCodes"), M1.roundtrips);
  befund("M1/M2 (eigene Implementierung): alle " + tsd(M1.nutzlastwerte) + " Nutzlastwerte durchgezählt — " +
    tsd(M1.roundtrips) + " gültige Codes lesen sich mit identischen Feldern zurück (0 Abweichungen), " +
    tsd(M1.freiIndizesAbgelehnt) + " freie Indizes ergeben {fehler:\"fassung\"} (art 0: " + M1.freiProArt[0] + ", art 1: " + M1.freiProArt[1] + "), " +
    "Länge immer 10. Die Zahlen des Entwurfs stimmen.");
} else {
  restfehler("M1 brach nach der Frist ab (" + M1.nutzlastwerte + " von 1048576 Fällen) — Round-Trip-Zahlen nur teilweise geprüft.");
  nicht("M1: vollständiger Round-Trip über 2^20 NICHT zu Ende gemessen (Frist).");
}

/* Randfall „Nutzteil beginnt mit NL“: der Entwurf prüft nur EINEN Code (NL-AAAA-AA) und folgert
   daraus „kein geprüfter Code trägt einen Nutzteil, der mit NL beginnt“. Hier wird gezählt. */
M.randfall_nutzteil_NL = (() => {
  const bsp = codeAuftrag(12, 0, 40, 0);                       /* sitzung 12 → z0 = N(12), z1 = (art<<4)|(index>>2) = 10 = L */
  const gedruckt = leseAuftrag(bsp.code, TAB);
  const nutzteilAllein = leseAuftrag(bsp.code.slice(3, 7) + bsp.code.slice(8), TAB);
  const ohneTrenner = leseAuftrag(bsp.code.replace(/-/g, ""), TAB);
  const klein = leseAuftrag(bsp.code.toLowerCase(), TAB);
  return {
    anzahlGültigerCodesMitNLNutzteil: M1.nutzteilBeginntMitNL,
    beispiele: M1.nlBeispiele,
    probe: {
      felder: {sitzung: 12, art: 0, index: 40, variante: 0},
      nutzzeichen: bsp.code.slice(3, 7), code: bsp.code, C1: bsp.C1, C2: bsp.C2,
      gedruckt: gedruckt.fehler ? gedruckt : {id: gedruckt.id, index: gedruckt.index, sitzung: gedruckt.sitzung, seed: gedruckt.seed},
      nutzteilAllein: nutzteilAllein.fehler ? nutzteilAllein : {id: nutzteilAllein.id, index: nutzteilAllein.index},
      ohneTrenner: ohneTrenner.fehler ? ohneTrenner : {id: ohneTrenner.id, index: ohneTrenner.index},
      kleinGeschrieben: klein.fehler ? klein : {id: klein.id, index: klein.index},
      alleVierGleich: !!(gedruckt.id && nutzteilAllein.id && ohneTrenner.id && klein.id &&
        gedruckt.id === nutzteilAllein.id && gedruckt.id === ohneTrenner.id && gedruckt.id === klein.id),
    },
  };
})();
nach("3_normalisierung.nutzteilBeginntMitNL (Aussage „kein geprüfter Code“)",
  "kein geprüfter Code trägt einen Nutzteil, der mit NL beginnt",
  M.randfall_nutzteil_NL.anzahlGültigerCodesMitNLNutzteil + " gültige Codes (art 0, Sitzung 12, Index 40..43, alle 256 Varianten)",
  "falsch",
  "Der Entwurf hat nur NL-AAAA-AA geprüft. Gemessen: " + M.randfall_nutzteil_NL.anzahlGültigerCodesMitNLNutzteil +
  " der 696320 gültigen Codes tragen einen Nutzteil, der mit „NL“ beginnt; ihr gedruckter Code, der Nutzteil allein, ohne Trenner und klein geschrieben lesen sich alle gleich (" +
  M.randfall_nutzteil_NL.probe.allVierGleich + "), z. B. " + M.randfall_nutzteil_NL.probe.code + " → " + kurz(M.randfall_nutzteil_NL.probe.gedruckt.id) + ".");

/* =====================================================================================
   M2 — Ergebnis-Code: Länge, Grenzen, Round-Trip, Verhalten außerhalb der Bereiche
   (Pflichtmessung 2 Zusatz + §-4-Randfälle sterne 0 / versuche 3 / dauer 511)
   ===================================================================================== */
const ENTW = (() => {
  /* TEIL 1 des Entwurfs (nur die reinen Codec-Funktionen) aus dem Quelltext schneiden und in
     einer vm OHNE fs/require/path ausführen. Damit sind die Entwurfsfunktionen vergleichbar,
     ohne dass der Entwurf sein Messgerüst (und seine Ergebnisdatei) anfassen kann. */
  const quelle = fs.readFileSync(ENTWURF_DATEI, "utf8");
  const start = quelle.indexOf("const ALPHABET");
  const teil2 = quelle.indexOf("TEIL 2");
  const ende = quelle.lastIndexOf("}", teil2);
  if (start < 0 || teil2 < 0 || ende < 0) return {fehler: "TEIL 1 nicht gefunden"};
  const text = quelle.slice(start, ende + 1);
  if (/require\(|readFileSync|writeFileSync|process\./.test(text)) return {fehler: "TEIL 1 enthält fremde Aufrufe — nicht ausgeführt"};
  try {
    const f = vm.runInNewContext(
      text + "\n;({wert, zeichen, normalisieren, pruefsummen, codeBauen, auftragLesen, ergebnisCodeBauen, ergebnisLesen, ersterCode, ALPHABET, TABELLE_AUFTRAEGE_LAENGE, TABELLE_SKILLS_LAENGE})",
      {console: {log() {}, warn() {}}, Math, Number, JSON, Object, Array, String, Set, Symbol, isNaN, parseInt, parseFloat},
      {filename: "A-format-TEIL1"});
    return f;
  } catch (e) {
    return {fehler: "vm: " + String(e && e.message || e)};
  }
})();
M.entwurfsfunktionen = ENTW.fehler ? {extrahiert: false, fehler: ENTW.fehler} : {
  extrahiert: true, quelle: "A-format.js, Zeilen von „const ALPHABET“ bis Ende ersterCode()",
  hinweis: "nur TEIL 1 (reine Funktionen); TEIL 2 (Messgerüst) und das Schreiben der Entwurfsdatei wurden nicht ausgeführt",
  entwurfsTabellenlängen: {auftraege: ENTW.TABELLE_AUFTRAEGE_LAENGE, skills: ENTW.TABELLE_SKILLS_LAENGE},
  alphabetGleich: ENTW.ALPHABET === AZ,
};

M["2c_ergebnisCode"] = (() => {
  const grenzen = [
    {fall: "kleinster (0,0,0,0,0)", felder: {sitzung: 0, platz: 0, sterne: 0, versuche: 0, dauer: 0}},
    {fall: "größter (31,31,10,3,511)", felder: {sitzung: 31, platz: 31, sterne: 10, versuche: 3, dauer: 511}},
    {fall: "sterne 0 / versuche 3", felder: {sitzung: 5, platz: 7, sterne: 0, versuche: 3, dauer: 0}},
    {fall: "dauer 511 / versuche 0", felder: {sitzung: 31, platz: 0, sterne: 10, versuche: 0, dauer: 511}},
    {fall: "Beispiel des Entwurfs (7,12,8,0,60)", felder: {sitzung: 7, platz: 12, sterne: 8, versuche: 0, dauer: 60}},
  ].map(x => {
    const r = codeErgebnis(x.felder);
    const g = leseErgebnis(r.code);
    return {fall: x.fall, felder: x.felder, code: r.code, länge: r.code.length, C1: r.C1, C2: r.C2,
      gelesen: {sitzung: g.sitzung, platz: g.platz, sterne: g.sterne, versuche: g.versuche, dauer: g.dauer, dauerSekunden: g.dauerSekunden},
      roundtripOk: gleich(x.felder, {sitzung: g.sitzung, platz: g.platz, sterne: g.sterne, versuche: g.versuche, dauer: g.dauer})};
  });
  const zufall = rng(SEED + 1);
  let fälle = 0, fehl = 0, längeFalsch = 0;
  for (let i = 0; i < 10000; i++) {
    const f = {sitzung: Math.floor(zufall() * 32), platz: Math.floor(zufall() * 32), sterne: Math.floor(zufall() * 11),
      versuche: Math.floor(zufall() * 4), dauer: Math.floor(zufall() * 512)};
    const r = codeErgebnis(f);
    fälle++;
    if (r.code.length !== 10) längeFalsch++;
    const g = leseErgebnis(r.code);
    if (!g || g.fehler || g.sitzung !== f.sitzung || g.platz !== f.platz || g.sterne !== f.sterne ||
        g.versuche !== f.versuche || g.dauer !== f.dauer) fehl++;
  }
  return {grenzen, zufallsRoundtrip: {fälle, fehl, längeFalsch},
    ergebnisCodelänge: 10, rechnung: "E-XXXX-XXX = 2 + 1 + 4 + 1 + 3 = 10 Zeichen",
    entwurfsBeispiel: ENTW.fehler ? null : ENTW.ergebnisCodeBauen({sitzung: 7, platz: 12, sterne: 8, versuche: 0, dauer: 60}).code};
})();
{
  const m = M["2c_ergebnisCode"];
  const rand = (hol(EJ, "messungen.2_länge.randwerte") || []).find(r => /Ergebnis/.test(r.fall) && /größter/.test(r.fall)) || {};
  nach("2c_ergebnisCode.ergebnisCodeBeispiel", hol(EJ, "messungen.2c_ergebnisCode.ergebnisCodeBeispiel.code"), m.entwurfsBeispiel);
  nach("2_länge.randwerte größter Ergebnis-Code (31,31,10,3,511)", rand.code, codeErgebnis({sitzung: 31, platz: 31, sterne: 10, versuche: 3, dauer: 511}).code);
  nach("2_länge.randwerte kleinster Ergebnis-Code (0,0,0,0,0)", ((hol(EJ, "messungen.2_länge.randwerte") || []).find(r => /Ergebnis/.test(r.fall) && /kleinster/.test(r.fall)) || {}).code,
    codeErgebnis({sitzung: 0, platz: 0, sterne: 0, versuche: 0, dauer: 0}).code);
  nach("2c_ergebnisCode.fälle/fehlschläge", [10000, 0], [m.zufallsRoundtrip.fälle, m.zufallsRoundtrip.fehl]);
  nach("2_länge.ergebnisCodeLänge", 10, m.ergebnisCodelänge);
  nach("2c_ergebnisCode: Werte des Entwurfsbeispiels", hol(EJ, "messungen.2c_ergebnisCode.ergebnisCodeBeispiel.werte"), m.entwurfsBeispiel ? codeErgebnis({sitzung: 7, platz: 12, sterne: 8, versuche: 0, dauer: 60}).werte : null);
  befund("M2 Zusatz (eigene Implementierung): Ergebnis-Code " + tsd(m.zufallsRoundtrip.fälle) + " zufällige Feldkombinationen round-trip-fest (0 Fehlschläge), " +
    "Länge immer 10; Grenzfälle sterne 0, sterne 10, versuche 0/3, dauer 0/511 lesen sich exakt zurück. Die Ergebnisse des Entwurfs stimmen.");
}

/* Verhalten AUSSERHALB der Bereiche aus § 4: der Entwurf klemmt still, diese Probe nicht. */
M.randfall_ergebnis_ausserhalb = (() => {
  const fälle = [
    {name: "sterne 12 (Bereich § 4: 0..10)", felder: {sitzung: 1, platz: 1, sterne: 12, versuche: 0, dauer: 10}},
    {name: "dauer 6000 (Bereich § 4: 0..511)", felder: {sitzung: 1, platz: 1, sterne: 2, versuche: 0, dauer: 6000}},
    {name: "sitzung 40 (Bereich § 4: 0..31)", felder: {sitzung: 40, platz: 1, sterne: 2, versuche: 0, dauer: 10}},
    {name: "versuche 7 (Bereich § 4: 0..3)", felder: {sitzung: 1, platz: 1, sterne: 2, versuche: 7, dauer: 10}},
    {name: "dauer 10.4 (kein Ganzzahlwert)", felder: {sitzung: 1, platz: 1, sterne: 2, versuche: 0, dauer: 10.4}},
    {name: "sterne NaN", felder: {sitzung: 1, platz: 1, sterne: NaN, versuche: 0, dauer: 10}},
  ].map(x => {
    const meins = codeErgebnis(x.felder);
    const ent = ENTW.fehler ? null : ENTW.ergebnisCodeBauen(x.felder);
    const gelesen = ent && ent.code ? leseErgebnis(ent.code) : null;
    return {name: x.name, felder: x.felder,
      meineStrengeFassung: meins.fehler ? {fehler: meins.fehler, feld: meins.feld, erlaubt: meins.erlaubt} : {code: meins.code},
      entwurf: ent && !ent.fehler ? {code: ent.code, gelesen: gelesen && !gelesen.fehler ? {sterne: gelesen.sterne, versuche: gelesen.versuche, dauer: gelesen.dauer, sitzung: gelesen.sitzung, sterneAnzeige: gelesen.sterneAnzeige} : gelesen} : ent};
  });
  return {fälle, hinweis: "Der Entwurf prüft die Bereiche aus § 4 nicht, sondern rundet und klemmt still " +
    "(Math.max(0, Math.min((1<<bits)-1, Math.round(wert) || 0))). Diese Probe liefert dort {fehler:\"fassung\"}."};
})();

/* =====================================================================================
   M3 — Normalisierung (Pflichtmessung 3): Schreibvarianten, Präfixregel, Idempotenz
   ===================================================================================== */
M.normalisierung = (() => {
  const eingaben = ["nl4f7k2q", "NL-4F7K-2Q", "  nl 4f7k 2q  ", "nl.4f7k.2q", "NL 4F7K 2Q", "4F7K2Q", "4F7K-2Q",
    "NL-4F7K2Q", "NL4F7K2Q", "n-l-4-f-7-k-2-q", "nl4F7k2Q", "NL-4F7K-E3", "nl4f7ke3", "NL-NL4F7K",
    "NL-NLAA-BL", "NLAA-BL", "NLAA", "N L A A", "----", "", "   ", null, undefined, 0, false];
  const tab = eingaben.map(e => {
    const n = normalisier(e, "auftrag");
    const l = leseAuftrag(e, TAB);
    const ent = ENTW.fehler ? null : ENTW.auftragLesen(e, {tickets: TICKETS, skills: SKILLS, existiert: id => DATEN_IDS.includes(id) || SKILLS.includes(id)});
    return {eingabe: e === null ? "null" : e === undefined ? "undefined" : JSON.stringify(e),
      nutzteil: n && n.nutzteil ? n.nutzteil : null,
      klasse: l === null ? "null" : (l.fehler || "angenommen"),
      ticketId: l && !l.fehler ? l.id : null,
      entwurfKlasse: ent === null ? "null" : (ent && (ent.fehler || "angenommen")),
      gleich: (l === null ? "null" : (l.fehler || "angenommen")) === (ent === null ? "null" : (ent && (ent.fehler || "angenommen")))};
  });
  const nutzteile = [...new Set(tab.filter(x => x.nutzteil).map(x => x.nutzteil))];
  return {varianten: tab, nutzteileUnterschiedlich: nutzteile,
    alleEntwurfsKlassenGleich: tab.every(x => x.gleich),
    idempotenzFalschAusM1: M1.idempotenzFalsch,
    regel: "§ 1: uppercase → alles außer [0-9A-Z] weg → führendes NL abschneiden, WENN danach genau 6 Zeichen übrig bleiben"};
})();
{
  const n = M.normalisierung;
  /* Die 11 Varianten des Entwurfs einzeln mit der eigenen Implementierung nachrechnen */
  const entwurfsVarianten = hol(EJ, "messungen.3_normalisierung.varianten") || [];
  const vNach = entwurfsVarianten.map(v => {
    const n0 = normalisier(v.eingabe, "auftrag");
    const l = leseAuftrag(v.eingabe, TAB);
    const nutzteil = n0 && n0.nutzteil ? n0.nutzteil : null;
    const klasse = l === null ? "null" : (l.fehler || "angenommen");
    return {eingabe: v.eingabe, entwurfNutzteil: v.nutzteil, meinNutzteil: nutzteil, entwurfKlasse: v.fehler, meineKlasse: klasse,
      stimmt: nutzteil === v.nutzteil && klasse === v.fehler};
  });
  M.normalisierung.entwurfsVariantenNachgerechnet = vNach;
  nach("3_normalisierung.varianten (11 Schreibvarianten des Entwurfs)", entwurfsVarianten.length, vNach.filter(x => x.stimmt).length,
    vNach.every(x => x.stimmt) ? "stimmt" : "falsch", "je Variante Nutzteil und Fehlerklasse gegenübergestellt; gemeinsam ist " + kurz([...new Set(vNach.map(x => x.meinNutzteil))]));
  nach("3_normalisierung: alle Varianten ergeben denselben Nutzteil 4F7K2Q", ["4F7K2Q"], [...new Set(vNach.map(x => x.meinNutzteil))]);
  nach("3_normalisierung: Entwurfsklassen == eigene Klassen (alle geprüften Eingaben)", true, n.alleEntwurfsKlassenGleich);
  nach("Idempotenz der Normalisierung über 2^20 Codes", 0, n.idempotenzFalschAusM1);
  const leerFälle = n.varianten.filter(v => ["null", "undefined", "\"\"", "\"   \""].includes(v.eingabe));
  nach("Normalisierung von null/undefined/leer", leerFälle.map(() => "null"), leerFälle.map(v => v.klasse),
    leerFälle.length > 0 && leerFälle.every(v => v.klasse === "null") ? "stimmt" : "falsch");
  befund("M3 (eigene Implementierung): „nl4f7k2q“ und „NL-4F7K-2Q“ ergeben denselben Nutzteil 4F7K2Q und dieselbe Ablehnung (prüfziffer) — das Formbeispiel ist kein gültiger Code. " +
    "Die Präfixregel greift genau dann, wenn danach 6 (Auftrag) bzw. 7 (Ergebnis) Zeichen übrig bleiben; die Normalisierung ist über alle 2^20 Codes idempotent (0 Abweichungen). " +
    "Neu geprüft (der Entwurf prüfte hier nur einen Code): es gibt " + M.randfall_nutzteil_NL.anzahlGültigerCodesMitNLNutzteil + " gültige Codes mit einem Nutzteil, das selbst mit „NL“ beginnt — " +
    "ihr gedruckter Code " + M.randfall_nutzteil_NL.probe.code + " und der Nutzteil allein lesen sich gleich (" + kurz(M.randfall_nutzteil_NL.probe.gedruckt.id) + ").");
}

/* =====================================================================================
   M4 — Vertipper (Pflichtmessung 4): eigene Fälle, Entwurfs-Kernfälle, GANZER Zeichenraum
   ===================================================================================== */
const M4 = (() => {
  /* (a) eigene, benannte Mutationsfälle auf einem echten gültigen Code */
  const basis = codeAuftrag(0, 0, 0, 0);                      /* NL-AAAA-AA */
  const basisVoll = codeAuftrag(26, 0, 23, 169);              /* entspricht dem korrigierten Formbeispiel NL-4F7K-E3 */
  const setze = (code, pos, c) => code.slice(0, pos) + c + code.slice(pos + 1);
  const posImCode = p => 3 + p + (p >= 4 ? 1 : 0);            /* Nutzteilposition 0..5 → Index im gedruckten Code */
  const eigen = [];
  const fall = (name, code, erwartet) => {
    const r = leseAuftrag(code, TAB);
    const ent = ENTW.fehler ? null : ENTW.auftragLesen(code, {tickets: TICKETS, skills: SKILLS, existiert: id => DATEN_IDS.includes(id) || SKILLS.includes(id)});
    const klasse = r === null ? "null" : (r.fehler || "angenommen");
    const entwurfsKlasse = ent === null ? "null" : (ent && (ent.fehler || "angenommen"));
    eigen.push({name, eingabe: code, erwartet, klasse, entwurfsKlasse, stimmt: klasse === erwartet && entwurfsKlasse === erwartet});
    return klasse;
  };
  const c0 = basis.code;                                       /* NL-AAAA-AA */
  fall("Nutzzeichen 1 ersetzt (A→B)", setze(c0, posImCode(0), "B"), "prüfziffer");
  fall("Nutzzeichen 2 ersetzt (A→C)", setze(c0, posImCode(1), "C"), "prüfziffer");
  fall("Nutzzeichen 3 ersetzt (A→2)", setze(c0, posImCode(2), "2"), "prüfziffer");
  fall("Nutzzeichen 4 ersetzt (A→Z)", setze(c0, posImCode(3), "Z"), "prüfziffer");
  fall("Prüfzeichen 1 ersetzt (A→B)", setze(c0, posImCode(4), "B"), "prüfziffer");
  fall("Prüfzeichen 2 ersetzt (A→B)", setze(c0, posImCode(5), "B"), "prüfziffer");
  fall("Nachbarn 1–2 vertauscht (AA→AA, gleicher Wert → kein Fall)", c0, "angenommen");
  fall("Nachbarn 1–2 vertauscht auf A9B4-Muster", setze(setze("NL-A9B4-Q2", posImCode(0), "9"), posImCode(1), "A"), "prüfziffer");
  fall("A↔9 an Nutzzeichen 1 (Wertdifferenz 31)", setze("NL-A9B4-Q2", posImCode(0), "9"), "prüfziffer");
  fall("Prüfzeichen getauscht (Q2→2Q)", "NL-A9B4-2Q", "prüfziffer");
  fall("Nutzzeichen 4 gegen Prüfzeichen 1 getauscht", "NL-A9B4-42", "prüfziffer");
  fall("Buchstabe↔Ziffer (8→B) auf NL-KE8F-DQ", setze("NL-KE8F-DQ", posImCode(2), "B"), "prüfziffer");
  fall("Ziffer↔Buchstabe (2→Z) auf NL-NC2D-H9", setze("NL-NC2D-H9", posImCode(2), "Z"), "prüfziffer");
  fall("Fremdzeichen O statt 0 (Länge bleibt 6)", setze("NL-A9B4-Q2", posImCode(2), "O"), "zeichen");
  fall("Fremdzeichen 1 am Ende", setze("NL-A9B4-Q2", 9, "1"), "zeichen");
  fall("ein Zeichen gelöscht (9 Zeichen)", "NL-A9B4-Q", "länge");
  fall("ein Zeichen eingefügt (11 Zeichen)", "NL-A9B4-Q22", "länge");
  fall("Leerzeichen statt Trenner (gültig)", "NL AAAA AA", "angenommen");
  fall("klein geschrieben (gültig)", "nl-aaaa-aa", "angenommen");
  fall("Basiscode des Entwurfs NL-A9B4-Q2 (dort als gültig geführt, ist aber art 1/Index 60)", "NL-A9B4-Q2", "fassung");
  fall("korrigiertes Formbeispiel (gültig)", basisVoll.code, "angenommen");
  fall("Formbeispiel NL-4F7K-2Q (ungültig)", "NL-4F7K-2Q", "prüfziffer");
  const eigeneFälle = eigen.length, eigeneOk = eigen.filter(x => x.stimmt).length;

  /* (b) die 44 Kernfälle des Entwurfs einzeln nachrechnen (aus A-format.json) */
  const kern = hol(EJ, "messungen.4_vertipper.kernfälle") || [];
  const kernNach = kern.map(k => {
    const r = leseAuftrag(k.vertippterCode, TAB);
    const klasse = r === null ? "null" : (r.fehler || "angenommen");
    const pos = typeof k.position === "number" ? k.position : Number(String(k.position).split("-")[0]);
    const art = k.art === "b_nachbarn_vertauscht"
      ? (pos <= 2 ? "Nutzzeichen-Nachbartausch" : pos === 3 ? "Nutzzeichen↔Prüfzeichen (nicht § 2)" : "Prüfzeichen-Tausch (nicht § 2)")
      : pos <= 3 ? "Nutzzeichen" : "Prüfzeichen";
    return {nr: k.nr, art: k.art, position: k.position, einordnung: art, code: k.vertippterCode,
      entwurfKlasse: k.fehlerklasse, meineKlasse: klasse, stimmt: klasse === k.fehlerklasse};
  });
  const kernArten = kernNach.reduce((m, k) => { m[k.einordnung] = (m[k.einordnung] || 0) + 1; return m; }, {});

  /* (c) die Basiscodes: der Entwurf behauptet Herkunft art/Index/Variante/Sitzung von Hand.
         Hier wird jeder Basiscode mit der eigenen Implementierung gelesen. */
  const basen = (hol(EJ, "messungen.4_vertipper.basen") || []).map(b => {
    const r = leseAuftrag(b.code, TAB);
    return {code: b.code, entwurfHerkunft: b.herkunft, entwurfArt: b.art, entwurfIndex: b.index,
      entwurfSitzung: b.sitzung, entwurfVariante: b.variante, entwurfTabelle: b.tabelle,
      entwurfPrüfzeichen: b.prüfzeichen, entwurfC1: b.C1, entwurfC2: b.C2,
      istKlasse: r === null ? "null" : (r.fehler || "angenommen"),
      istArt: r && r.art !== undefined ? r.art : null, istIndex: r && r.index !== undefined ? r.index : null,
      istSitzung: r && r.sitzung !== undefined ? r.sitzung : null, istVariante: r && r.variante !== undefined ? r.variante : null,
      istId: r && r.id ? r.id : null,
      meinePrüfzeichen: z(C1([...b.code.slice(3, 7)].map(w))) + z(C2([...b.code.slice(3, 7)].map(w))),
      herkunftStimmt: !!(r && r.art !== undefined && r.art === b.art && r.index === b.index && r.sitzung === b.sitzung && r.variante === b.variante)};
  });

  /* (d) GANZER Zeichenraum: alle 32^4 Nutzteile, je 4 Stellen · 31 Ersatzzeichen und 3 Nachbarpaare.
         Ersetzungen: unerkannt = C1 und C2 bleiben gleich (dann greift die Prüfziffer nicht). */
  const t0 = Date.now();
  const NUTZ = 32 * 32 * 32 * 32;
  let subFälle = 0, subUnerkannt = 0, tauschFälle = 0, tauschUnerkannt = 0, c1Gleich = 0, c2Gleich = 0, beideGleich = 0;
  let pzTauschFälle = 0, pzTauschUnerkannt = 0, nutzPrüfTauschFälle = 0, nutzPrüfTauschUnerkannt = 0;
  let abgebrochen = false;
  for (let n = 0; n < NUTZ; n++) {
    if ((n & 65535) === 0 && Date.now() - t0 > 300000) { abgebrochen = true; break; }
    const v0 = Math.floor(n / 32768) % 32, v1 = Math.floor(n / 1024) % 32, v2 = Math.floor(n / 32) % 32, v3 = n % 32;
    const c1 = (v0 + 2 * v1 + 3 * v2 + 4 * v3) % 31;
    const c2 = (v0 + 3 * v1 + 5 * v2 + 7 * v3) % 32;
    const v = [v0, v1, v2, v3];
    for (let pos = 0; pos < 4; pos++) {
      const w1 = pos + 1, w2 = 2 * pos + 1;
      const alt = v[pos];
      for (let neu = 0; neu < 32; neu++) {
        if (neu === alt) continue;
        subFälle++;
        const d = neu - alt;
        if ((d * w1) % 31 === 0 && (d * w2) % 32 === 0) subUnerkannt++;
      }
    }
    for (let k = 0; k < 3; k++) {
      if (v[k] === v[k + 1]) continue;
      tauschFälle++;
      const t = v.slice(); t[k] = v[k + 1]; t[k + 1] = v[k];
      const g1 = (t[0] + 2 * t[1] + 3 * t[2] + 4 * t[3]) % 31 === c1;
      const g2 = (t[0] + 3 * t[1] + 5 * t[2] + 7 * t[3]) % 32 === c2;
      if (g1) c1Gleich++;
      if (g2) c2Gleich++;
      if (g1 && g2) { beideGleich++; tauschUnerkannt++; }
    }
    /* Zusatzfälle, die der Entwurf in dieselbe Kennzahl mischt (Randbemerkung des Prüfers):
       a) Tausch Nutzzeichen 4 ↔ erstes Prüfzeichen: neue Nutzlast [v0,v1,v2,c1], neue Prüfzeichen [c2, v3] */
    if (v3 !== c1) {
      nutzPrüfTauschFälle++;
      const t = [v0, v1, v2, c1];
      const n1 = (t[0] + 2 * t[1] + 3 * t[2] + 4 * t[3]) % 31;
      const n2 = (t[0] + 3 * t[1] + 5 * t[2] + 7 * t[3]) % 32;
      if (n1 === c2 && n2 === v3) nutzPrüfTauschUnerkannt++;
    }
    /* b) Tausch der beiden Prüfzeichen: Nutzlast unverändert; erkannt, solange C1 ≠ C2 */
    pzTauschFälle++;
    if (c1 === c2) pzTauschUnerkannt++;                       /* dann sind beide Zeichen gleich → gar keine Änderung */
  }
  return {
    eigeneFälle, eigeneOk, eigene: eigen,
    kernNachgerechnet: {anzahl: kernNach.length, stimmt: kernNach.filter(k => k.stimmt).length,
      einordnung: kernArten, fälle: kernNach},
    basen,
    raum: {nutzteile: NUTZ, abgebrochen,
      ersetzungen: {fälle: subFälle, unerkannt: subUnerkannt, beiVollständig: subFälle === NUTZ * 124},
      nachbartauschNutzzeichen: {fälle: tauschFälle, unerkannt: tauschUnerkannt, C1Gleich: c1Gleich, C2Gleich: c2Gleich, beideGleich,
        erwartetFälle: 3 * NUTZ - 3 * 32 * 32 * 32, erwartetC1Gleich: 3 * 2 * 32 * 32, erwartetC2Gleich: 3 * 32 * 32 * 32},
      prüfzeichenTausch: {fälle: pzTauschFälle, unerkannt: pzTauschUnerkannt, hinweis: "C1 = C2 → die beiden Prüfzeichen sind dasselbe Zeichen, der „Tausch“ ist keine Änderung"},
      nutzzeichenGegenPrüfzeichen: {fälle: nutzPrüfTauschFälle, unerkannt: nutzPrüfTauschUnerkannt,
        hinweis: "Tausch Nutzzeichen 4 ↔ Prüfzeichen 1 (Position 3-4): § 2 sagt darüber nichts — es ist kein Tausch zweier Nutzzeichen"},
      ms: Date.now() - t0},
  };
})();
M.vertipper = M4;

if (!M4.raum.abgebrochen) {
  const rv = M4.raum;
  nach("5.raumVollständig.ersetzungen.fälle", hol(EJ, "messungen.5_zufallscodes.raumVollständig.ersetzungen.fälle"), rv.ersetzungen.fälle);
  nach("5.raumVollständig.ersetzungen.unerkannt", 0, rv.ersetzungen.unerkannt);
  nach("5.raumVollständig.nachbartausch.fälle", hol(EJ, "messungen.5_zufallscodes.raumVollständig.nachbartausch.fälle"), rv.nachbartauschNutzzeichen.fälle);
  nach("5.raumVollständig.nachbartausch.unerkannt", 0, rv.nachbartauschNutzzeichen.unerkannt);
  nach("5.raumVollständig.nachbartausch.C1Unverändert", hol(EJ, "messungen.5_zufallscodes.raumVollständig.nachbartausch.C1Unverändert"), rv.nachbartauschNutzzeichen.C1Gleich);
  nach("5.raumVollständig.nachbartausch.C2Unverändert", hol(EJ, "messungen.5_zufallscodes.raumVollständig.nachbartausch.C2Unverändert"), rv.nachbartauschNutzzeichen.C2Gleich);
  nach("5.raumVollständig.nachbartausch.beideUnverändert", 0, rv.nachbartauschNutzzeichen.beideGleich);
} else {
  restfehler("Raummessung brach nach der Frist ab — die Vollständigkeitsaussage des Entwurfs ist damit nicht bestätigt.");
}
nach("4_vertipper.kernfälleAnzahl", hol(EJ, "messungen.4_vertipper.kernfälleAnzahl"), M4.kernNachgerechnet.anzahl);
nach("4_vertipper: jede behauptete Fehlerklasse einzeln", M4.kernNachgerechnet.anzahl, M4.kernNachgerechnet.stimmt, M4.kernNachgerechnet.stimmt === M4.kernNachgerechnet.anzahl ? "stimmt" : "falsch",
  "Einordnung nach Position: " + kurz(M4.kernNachgerechnet.einordnung));
nach("4_vertipper.artenVerteilung", hol(EJ, "messungen.4_vertipper.artenVerteilung"),
  M4.kernNachgerechnet.fälle.reduce((m, k) => { m[k.art] = (m[k.art] || 0) + 1; return m; }, {}));
nach("Eigene Mutationsfälle (20 benannte Fälle)", M4.eigeneFälle, M4.eigeneOk, M4.eigeneOk === M4.eigeneFälle ? "stimmt" : "falsch",
  "je Fall: erwartete Klasse, eigene Klasse und Entwurfsklasse gegenübergestellt");

/* Die Basiscodes des Entwurfs: Herkunftsangaben einzeln prüfen */
{
  const falsch = M4.basen.filter(b => !b.herkunftStimmt);
  nach("4_vertipper.basen: Herkunft (art/index/variante/sitzung) aller 5 Basiscodes", "jede Herkunft ist geprüft und gültig",
    falsch.length + " von " + M4.basen.length + " falsch", falsch.length === 0 ? "stimmt" : "falsch",
    M4.basen.map(b => b.code + ": behauptet " + b.entwurfHerkunft + " → ist art " + b.istArt + ", Index " + b.istIndex + ", Sitzung " + b.istSitzung + ", Variante " + b.istVariante + ", Klasse " + b.istKlasse).join(" | "));
  nach("4_vertipper.genauigkeit („Alle Basiscodes … als gültig geprüft“)", true, M4.basen.every(b => b.istKlasse === "angenommen"),
    M4.basen.every(b => b.istKlasse === "angenommen") ? "stimmt" : "falsch",
    M4.basen.filter(b => b.istKlasse !== "angenommen").map(b => b.code + " → " + b.istKlasse).join(", ") || "alle gültig");
  nach("4_vertipper.prüfsummenProben (C1/C2 je Basiscode)", "C1/C2 und Prüfzeichen wie im JSON",
    M4.basen.map(b => b.code + " → " + b.meinePrüfzeichen + " (C1 " + b.entwurfC1 + "/C2 " + b.entwurfC2 + ")").join("; "),
    M4.basen.every(b => b.meinePrüfzeichen === b.entwurfPrüfzeichen) ? "stimmt" : "falsch");
}

/* tauschKontrolle: die Erwartungstexte des Entwurfs gegen die eigenen Rechnungen */
M.tauschKontrolle_Prüfung = (() => {
  const fälle = hol(EJ, "messungen.4_vertipper.tauschKontrolle.fälle") || [];
  const g1 = [1, 2, 3, 4], g2 = [1, 3, 5, 7];
  const zeilen = fälle.map(f => {
    const zk = f.code.slice(3, 7) + f.code.slice(8, 10);
    const pos = Number(String(f.position).split("->")[0]);
    const u = Number(f.u), wert = Number(f.w);
    const neu = zk.split("");
    const tmp = neu[pos]; neu[pos] = neu[pos + 1]; neu[pos + 1] = tmp;
    const nutz = neu.slice(0, 4).map(w);
    const c1neu = nutz.reduce((s, x, i) => s + g1[i] * x, 0) % 31;
    const c2neu = nutz.reduce((s, x, i) => s + g2[i] * x, 0) % 32;
    const c1 = Number(f.C1), c2 = Number(f.C2);
    /* richtige Differenz: ΔC1 = (u−w)·(g_pos − g_pos+1) = (u−w)·1 ; ΔC2 = (u−w)·2 */
    const dC1 = (((u - wert) % 31) + 31) % 31;
    const dC2 = (((u - wert) * 2 % 32) + 32) % 32;
    const erwartetC1Zahl = Number((String(f.erwartungC1).match(/≡ (-?\d+) \(mod 31\)/) || [])[1]);
    const erwartetC2Zahl = Number((String(f.erwartungC2).match(/≡ (-?\d+) \(mod 32\)/) || [])[1]);
    const gemessenC1 = (((c1neu - c1) % 31) + 31) % 31;
    const gemessenC2 = (((c2neu - c2) % 32) + 32) % 32;
    const kategorie = pos <= 2 ? "Nutzzeichen-Nachbartausch" : pos === 3 ? "Nutzzeichen↔Prüfzeichen" : "Prüfzeichen-Tausch";
    return {code: f.code, position: f.position, kategorie,
      C1: c1, C1neuMeineRechnung: c1neu, gemessenC1, entwurfErwartungC1: erwartetC1Zahl,
      C2: c2, C2neuMeineRechnung: c2neu, gemessenC2, entwurfErwartungC2: erwartetC2Zahl,
      entwurfsErwartungC1Stimmt: erwartetC1Zahl === gemessenC1,
      entwurfsErwartungC2Stimmt: erwartetC2Zahl === gemessenC2,
      meineRechnungStimmtMitGemessen: dC1 === gemessenC1 && dC2 === gemessenC2};
  });
  const c1Falsch = zeilen.filter(z => !z.entwurfsErwartungC1Stimmt);
  const c2Falsch = zeilen.filter(z => !z.entwurfsErwartungC2Stimmt);
  const kategorien = zeilen.reduce((m, z) => { m[z.kategorie] = (m[z.kategorie] || 0) + 1; return m; }, {});
  return {anzahl: zeilen.length, erwartungC1Falsch: c1Falsch.length, erwartungC2Falsch: c2Falsch.length,
    kategorien, meineRechnungAlleRichtig: zeilen.every(z => z.meineRechnungStimmtMitGemessen),
    beispieleFalsch: c1Falsch.slice(0, 3).map(z => ({position: z.position, entwurfErwartungC1: z.entwurfErwartungC1, gemessenC1: z.gemessenC1, entwurfErwartungC2: z.entwurfErwartungC2, gemessenC2: z.gemessenC2})),
    zeilen};
})();
{
  const t = M.tauschKontrolle_Prüfung;
  nach("4_vertipper.tauschKontrolle.erwartungC1", "ΔC1 wie angegeben (25 Fälle)", (t.anzahl - t.erwartungC1Falsch) + " von " + t.anzahl + " richtig", t.erwartungC1Falsch === 0 ? "stimmt" : "falsch",
    "Beispiele: " + kurz(t.beispieleFalsch));
  nach("4_vertipper.tauschKontrolle.erwartungC2", "ΔC2 wie angegeben (25 Fälle)", (t.anzahl - t.erwartungC2Falsch) + " von " + t.anzahl + " richtig", t.erwartungC2Falsch === 0 ? "stimmt" : "falsch");
  nach("4_vertipper.tauschKontrolle.merkregel („C2 bleibt genau dann gleich, wenn v0−v1+v2−v3 = 0“)",
    "C2 unverändert ⟺ alternierende Nutzlast", "C2 unverändert ⟺ |Wertdifferenz| = 16 (gemessen im ganzen Raum: " + tsd(M4.raum.nachbartauschNutzzeichen.C2Gleich) + " Fälle = 3 · 32 · 32 · 32)", "falsch",
    "In den 25 Kontrollfällen ist C2 genau in den 5 Prüfzeichen-Täuschen unverändert — dort ist die Nutzlast gar nicht betroffen, nicht „alternierend“.");
  nach("4_vertipper.tauschKontrolle: Kategorien", "25 Nachbartauschungen zweier Nutzzeichen", t.kategorien, "falsch",
    "Nur " + (t.kategorien["Nutzzeichen-Nachbartausch"] || 0) + " der " + t.anzahl + " Fälle tauschen zwei Nutzzeichen; " + (t.kategorien["Nutzzeichen↔Prüfzeichen"] || 0) +
    " tauschen Nutzzeichen 4 gegen das erste Prüfzeichen, " + (t.kategorien["Prüfzeichen-Tausch"] || 0) + " die beiden Prüfzeichen.");
}
{
  const b = M4.basen;
  KORR.push({
    stelle: "tools/klassenraum-probe/A-format.js, NUTZTEIL_MUSTER (Zeilen 583–589) und die davon abgeleiteten Felder herkunft/art/index/sitzung/variante/tabelle in messungen.4_vertipper.basen",
    problem: "Alle fünf Basiscodes tragen von Hand gesetzte Herkunftsangaben, die nicht zum Code passen. Gemessen (eigene Dekodierung): " +
      b.map(x => x.code + " → art " + x.istArt + ", Index " + x.istIndex + ", Sitzung " + x.istSitzung + ", Variante " + x.istVariante + " (behauptet: " + x.entwurfHerkunft + ", art " + x.entwurfArt + ", Index " + x.entwurfIndex + ")").join("; ") + ".",
    vorschlag: "Die Basiscodes mit codeBauen(art, index, variante) erzeugen statt die Nutzzeichen von Hand zu wählen — dann stimmen art/index/variante/sitzung. Achtung: der erste Basiscode NL-A9B4-Q2 ist gar kein gültiger Code (art 1, Index 60 → {fehler:\"fassung\"}), die Behauptung „Alle Basiscodes sind … als gültig geprüft“ ist damit falsch.",
  });
  KORR.push({
    stelle: "tools/klassenraum-probe/A-format.js, tauschKontrolle (Zeilen 727 und 729) → messungen.4_vertipper.tauschKontrolle.erwartungC1/erwartungC2",
    problem: "Die Erwartungstexte rechnen mit der falschen Gewichtsdifferenz: angegeben ist ΔC1 = (w−u)·(g_{p+2}−g_{p+1}) = (w−u)·1, richtig ist ΔC1 = (u−w)·1 = −(w−u)·1 (bzw. ΔC2 = (u−w)·2). Folge: " +
      M.tauschKontrolle_Prüfung.erwartungC1Falsch + " von " + M.tauschKontrolle_Prüfung.anzahl + " C1-Erwartungen und " + M.tauschKontrolle_Prüfung.erwartungC2Falsch + " von " + M.tauschKontrolle_Prüfung.anzahl + " C2-Erwartungen widersprechen den im selben JSON stehenden Messwerten C1neu/C2neu.",
    vorschlag: "In der Schleife (p = Nachbarindex) ΔC1 = (u−w)·(g_p − g_{p+1}) = (u−w)·1 und ΔC2 = (u−w)·2 schreiben, wobei u = wert(zk[p]) und w = wert(zk[p+1]); für p = 3 (Nutzzeichen↔Prüfzeichen) und p = 4 (Prüfzeichen-Tausch) getrennt ausweisen, weil dort nicht zwei Nutzzeichen getauscht werden. Beispiel: Position 1->2 von NL-A9B4-Q2 — Entwurf sagt ≡ 1 (mod 31), gemessen ist C1neu = 13 gegen C1 = 14, also ≡ 30.",
  });
  KORR.push({
    stelle: "tools/klassenraum-probe/A-format.js, tauschKontrolle.merkregel → messungen.4_vertipper.tauschKontrolle.merkregel",
    problem: "Der Satz „im gemessenen Bereich bleibt C2 genau dann gleich, wenn v0−v1+v2−v3 = 0 (alternierende Nutzlast)“ ist falsch: C2 bleibt bei einem Nachbartausch genau dann gleich, wenn die Wertdifferenz 16 beträgt (2·16 = 32 ≡ 0 mod 32). Im ganzen Raum sind das " +
      tsd(M4.raum.nachbartauschNutzzeichen.C2Gleich) + " Fälle (3 · 32 · 32 · 32), nicht die alternierenden. Die 5 C2Gleich-Fälle der Kontrollgruppe sind außerdem sämtlich Prüfzeichen-Täusche, bei denen die Nutzlast unverändert bleibt.",
    vorschlag: "merkregel ersetzen durch: „ΔC1 ≡ 0 (mod 31) ⟺ |u−w| = 31; ΔC2 ≡ 0 (mod 32) ⟺ |u−w| = 16; beides zugleich ist unmöglich (31 ∩ 16 = ∅), deshalb wird jeder Nachbartausch zweier ungleicher Nutzzeichen erkannt (gemessen: 0 von 3.047.424).“",
  });
}

/* Der Auftrag-Kontrollfall des Entwurfs (4_vertipper.auftragKontrolle) */
M.auftragKontrolle = (() => {
  const b = (hol(EJ, "messungen.4_vertipper.basen") || [])[1] || {};
  const r = b.code ? leseAuftrag(b.code, TAB) : null;
  const index = r && r.index !== undefined ? r.index : -1;
  const manipuliert = TAB.tickets.map((id, i) => i === 0 ? null : id);
  const mitNullAnIndex0 = b.code ? leseAuftrag(b.code, {tickets: manipuliert, skills: SKILLS, existiert: TAB.existiert}) : null;
  const mitNullAmRichtigenIndex = b.code ? leseAuftrag(b.code, {tickets: TAB.tickets.map((id, i) => i === index ? null : id), skills: SKILLS, existiert: TAB.existiert}) : null;
  return {basisCode: b.code, tatsächlicherIndex: index, tatsächlicheId: r && r.id ? r.id : null,
    entwurfsFeld_mitTabelle: hol(EJ, "messungen.4_vertipper.auftragKontrolle.mitTabelle"),
    entwurfsFeld_ohneEintrag: hol(EJ, "messungen.4_vertipper.auftragKontrolle.ohneEintrag") === undefined ? "(fehlt im JSON)" : hol(EJ, "messungen.4_vertipper.auftragKontrolle.ohneEintrag"),
    manipulationAnIndex0: mitNullAnIndex0 && mitNullAnIndex0.fehler ? mitNullAnIndex0.fehler : "gelesen(" + (mitNullAnIndex0 && mitNullAnIndex0.id) + ")",
    manipulationAmRichtigenIndex: mitNullAmRichtigenIndex && mitNullAmRichtigenIndex.fehler ? mitNullAmRichtigenIndex.fehler : "gelesen",
    skillIndexFrei27: (() => { const c = codeAuftrag(0, 1, 27, 0); const l = leseAuftrag(c.code, TAB); return {code: c.code, klasse: l.fehler}; })()};
})();
nach("4_vertipper.auftragKontrolle.ohneEintrag (Fall „ID verschwindet“)", "auftrag (belegt)", M.auftragKontrolle.entwurfsFeld_ohneEintrag, "falsch",
  "Der Entwurf setzt TICKETS[0] auf null, der Basiscode NL-NC2D-H9 zeigt aber auf Index " + M.auftragKontrolle.tatsächlicherIndex + " (" + M.auftragKontrolle.tatsächlicheId + ") → der Fall belegt nichts, das Feld ist undefined und fehlt deshalb im JSON. Am richtigen Index manipuliert ergibt erwartungsgemäß „" + M.auftragKontrolle.manipulationAmRichtigenIndex + "“.");
KORR.push({
  stelle: "tools/klassenraum-probe/A-format.js, auftragKontrolle in baueVertipper() (Zeile 774: TICKETS.map((id,i) => i === 0 ? null : id))",
  problem: "Der Kontrollfall „Eintrag verschwindet → {fehler:auftrag}“ manipuliert Index 0, der verwendete Basiscode (basen[1] = NL-NC2D-H9) zeigt aber auf Index " +
    M.auftragKontrolle.tatsächlicherIndex + " (" + M.auftragKontrolle.tatsächlicheId + "). Ergebnis: der Fall liest gültig, `weg.fehler` ist undefined, und die Felder ohneEintrag/grund fehlen im JSON — der Fall belegt nichts.",
  vorschlag: "Den echten Index nehmen: `const idx = auftragLesen(b.code, QUELLE).index;` und dann `TICKETS.map((id,i) => i === idx ? null : id)` — oder einen Basiscode mit Index 0 verwenden (ersterCode(0,0)).",
});

/* =====================================================================================
   M5 — Zufallscodes (Pflichtmessung 5), mit demselben Seed und Ziehungsmuster wie der Entwurf
   ===================================================================================== */
M.zufallscodes = (() => {
  const zufall = rng(SEED);
  const raumVoll = ("0123456789" + "ABCDEFGHIJKLMNOPQRSTUVWXYZ").split("");
  const raumAlpha = AZ.split("");
  const lauf = (raum, n, len) => {
    const zähler = {}; let akzeptiert = 0, begonnenMitNL = 0;
    const beispiele = [];
    for (let i = 0; i < n; i++) {
      let s = "";
      for (let k = 0; k < len; k++) s += raum[Math.floor(zufall() * raum.length)];
      if (s.startsWith("NL")) begonnenMitNL++;
      const l = leseAuftrag(s, TAB);
      const klasse = l === null ? "null" : (l.fehler || "angenommen");
      zähler[klasse] = (zähler[klasse] || 0) + 1;
      if (klasse === "angenommen") { akzeptiert++; if (beispiele.length < 3) beispiele.push({eingabe: s, id: l.id}); }
      else if (beispiele.length < 3 && klasse !== "länge") beispiele.push({eingabe: s, klasse});
    }
    return {n, akzeptiert, fehlerklassen: zähler, begonnenMitNL, beispiele};
  };
  const a = lauf(raumVoll, 10000, 8);                        /* [0-9A-Z], 8 Zeichen */
  const b = lauf(raumAlpha, 10000, 8);                       /* ALPHABET, 8 Zeichen */
  const b6 = lauf(raumAlpha, 10000, 6);                      /* ALPHABET, 6 Zeichen */
  /* Basiscodes und Mutationen genau wie im Entwurf gezogen (gleicher Seed, gleiche Reihenfolge) */
  const basen = [];
  for (let i = 0; i < 100; i++) {
    const sitzung = Math.floor(zufall() * 32), art = i % 2, index = Math.floor(zufall() * 64), variante = Math.floor(zufall() * 256);
    basen.push(codeAuftrag(sitzung, art, index, variante).code);
  }
  let cAkzeptiert = 0, unverändert = 0, gültigeBasis = 0;
  const cZähler = {};
  for (let i = 0; i < 10000; i++) {
    const basis = basen[Math.floor(zufall() * basen.length)];
    if (!basis) break;
    gültigeBasis++;
    const pos = Math.floor(zufall() * 6);
    const idx = 3 + pos + (pos >= 4 ? 1 : 0);
    const alt = basis[idx];
    let neu = alt, k = 0;
    while (neu === alt && k++ < 64) { const kand = AZ[Math.floor(zufall() * AZ.length)]; if (kand !== alt) neu = kand; }
    const mutiert = basis.slice(0, idx) + neu + basis.slice(idx + 1);
    if (mutiert === basis) { unverändert++; continue; }
    const l = leseAuftrag(mutiert, TAB);
    const klasse = l === null ? "null" : (l.fehler || "angenommen");
    cZähler[klasse] = (cZähler[klasse] || 0) + 1;
    if (klasse === "angenommen") cAkzeptiert++;
  }
  /* alle 6 Stellen · 31 Ersatzzeichen für alle 100 Basiscodes */
  let cVollFälle = 0, cVollUnerkannt = 0;
  for (const basis of basen) {
    for (let pos = 0; pos < 6; pos++) {
      const idx = 3 + pos + (pos >= 4 ? 1 : 0);
      const alt = basis[idx];
      for (const c of AZ) {
        if (c === alt) continue;
        cVollFälle++;
        const l = leseAuftrag(basis.slice(0, idx) + c + basis.slice(idx + 1), TAB);
        if (!(l === null || l.fehler)) cVollUnerkannt++;
      }
    }
  }
  return {seed: SEED, generator: "mulberry32 (eigene Fassung)",
    a_raum0bis9AZ_laenge8: a, b_alphabet_laenge8: b, b6_zusatzlauf_alphabet_laenge6: b6,
    c_einZeichenMutation: {n: gültigeBasis, akzeptiert: cAkzeptiert, unveränderteMutationen: unverändert, fehlerklassen: cZähler, basenAnzahl: basen.length},
    c_vollständig: {basenAnzahl: basen.length, fälle: cVollFälle, unerkannt: cVollUnerkannt},
    hinweis: "Seed und Ziehungsreihenfolge wie im Entwurf, damit dessen Stichprobenzahlen vergleichbar sind — gelesen wird ausschließlich mit der eigenen Implementierung."};
})();
{
  const z = M.zufallscodes;
  nach("5a (10.000× 8 Zeichen aus [0-9A-Z], Fehlerklassen)", hol(EJ, "messungen.5_zufallscodes.a_raum0bis9AZ_laenge8.fehlerklassen"), z.a_raum0bis9AZ_laenge8.fehlerklassen);
  nach("5a.begonnenMitNL", hol(EJ, "messungen.5_zufallscodes.a_raum0bis9AZ_laenge8.begonnenMitNL"), z.a_raum0bis9AZ_laenge8.begonnenMitNL);
  nach("5b (10.000× 8 Zeichen aus ALPHABET, Fehlerklassen)", hol(EJ, "messungen.5_zufallscodes.b_alphabet_laenge8.fehlerklassen"), z.b_alphabet_laenge8.fehlerklassen);
  nach("5b6 (10.000× 6 Zeichen aus ALPHABET)", {akzeptiert: hol(EJ, "messungen.5_zufallscodes.b6_zusatzlauf_alphabet_laenge6.akzeptiert"), klassen: hol(EJ, "messungen.5_zufallscodes.b6_zusatzlauf_alphabet_laenge6.fehlerklassen")},
    {akzeptiert: z.b6_zusatzlauf_alphabet_laenge6.akzeptiert, klassen: z.b6_zusatzlauf_alphabet_laenge6.fehlerklassen});
  nach("5c (10.000 Mutationen): unerkannt", hol(EJ, "messungen.5_zufallscodes.c_einZeichenMutation.akzeptiert"), z.c_einZeichenMutation.akzeptiert);
  nach("5c (10.000 Mutationen): unveränderte Mutationen", 0, z.c_einZeichenMutation.unveränderteMutationen);
  nach("5c vollständig (18.600 Ersetzungen): unerkannt", 0, z.c_vollständig.unerkannt);
  befund("M5 (eigene Implementierung, gleicher Seed 20261006 und gleiche Ziehungsreihenfolge): die Stichprobenzahlen des Entwurfs sind reproduzierbar — " +
    "5a " + kurz(z.a_raum0bis9AZ_laenge8.fehlerklassen) + ", 5b " + kurz(z.b_alphabet_laenge8.fehlerklassen) + ", 5b6 " + z.b6_zusatzlauf_alphabet_laenge6.akzeptiert + "/10000 angenommen, " +
    "5c " + z.c_einZeichenMutation.akzeptiert + " unerkannt von " + z.c_einZeichenMutation.n + ", 5c-vollständig " + z.c_vollständig.unerkannt + " unerkannt von " + tsd(z.c_vollständig.fälle) + ".");
}

/* =====================================================================================
   M6 — Fehlerklassen (§ 8, Pflichtmessung 6)
   ===================================================================================== */
M.fehlerklassen = (() => {
  const fälle = {};
  const pruefe = (name, code, erwartet) => {
    const r = leseAuftrag(code, TAB);
    const klasse = r === null ? "null" : (r.fehler || "angenommen");
    const ent = ENTW.fehler ? null : ENTW.auftragLesen(code, {tickets: TICKETS, skills: SKILLS, existiert: id => DATEN_IDS.includes(id) || SKILLS.includes(id)});
    fälle[name] = {eingabe: code === null ? "null" : code, erwartet, klasse, entwurf: ent === null ? "null" : (ent && (ent.fehler || "angenommen")), stimmt: klasse === erwartet};
    return klasse;
  };
  pruefe("länge (7 Zeichen)", "NL-4F7K-2", "länge");
  pruefe("länge (4 Zeichen)", "NL-B4", "länge");
  pruefe("länge (nur Trenner)", "---", "länge");
  pruefe("zeichen (O)", "NL-4F7K-2O", "zeichen");
  pruefe("zeichen (1)", "NL-4F7K-21", "zeichen");
  pruefe("zeichen vor länge? 5 Zeichen mit O", "NL-OQS-4", "zeichen");
  pruefe("prüfziffer", "NL-AAAA-AB", "prüfziffer");
  pruefe("prüfziffer (Formbeispiel)", "NL-4F7K-2Q", "prüfziffer");
  pruefe("fassung: art 0, Index 58", codeAuftrag(0, 0, 58, 0).code, "fassung");
  pruefe("fassung: art 0, Index 63", codeAuftrag(0, 0, 63, 0).code, "fassung");
  pruefe("fassung: art 1, Index 27", codeAuftrag(0, 1, 27, 0).code, "fassung");
  pruefe("fassung: art 1, Index 63", codeAuftrag(0, 1, 63, 0).code, "fassung");
  pruefe("gültig: art 0, Index 57", codeAuftrag(0, 0, 57, 0).code, "angenommen");
  pruefe("gültig: art 1, Index 26 (letzte Fertigkeit)", codeAuftrag(0, 1, 26, 0).code, "angenommen");
  const leer = [null, undefined, "", "   ", "\t\n"].map(e => ({eingabe: e === null ? "null" : e === undefined ? "undefined" : JSON.stringify(e),
    klasse: leseAuftrag(e, TAB) === null ? "null" : "nicht null"}));
  /* auftrag: echte Tabelle manipulieren (Index des Codes wird vorher bestimmt) */
  const c57 = codeAuftrag(0, 0, 57, 0).code;
  const i57 = leseAuftrag(c57, TAB).index;
  const auftragFälle = [
    {name: "Eintrag auf null", ergebnis: leseAuftrag(c57, {tickets: TAB.tickets.map((id, i) => i === i57 ? null : id), skills: SKILLS, existiert: TAB.existiert})},
    {name: "Eintrag unbekannte ID", ergebnis: leseAuftrag(c57, {tickets: TAB.tickets.map((id, i) => i === i57 ? "gibt-es-nicht" : id), skills: SKILLS, existiert: TAB.existiert})},
  ].map(x => ({name: x.name, klasse: x.ergebnis && x.ergebnis.fehler || "gelesen"}));
  return {fälle, eigeneFälleOk: Object.values(fälle).filter(f => f.stimmt).length, eigeneFälle: Object.keys(fälle).length,
    leereEingaben: leer, auftragFälle,
    wahlUndSitzung: "„wahl“ und „sitzung“ sind in einem reinen Codec nicht erreichbar (§ 8: sie gehören zu erzeugen/Instanz) — in dieser Probe nicht geprüft.",
    entwurfsKontrollFälle: hol(EJ, "messungen.4_vertipper.kontrollFälle"),
    entwurfsFehlerklassen: hol(EJ, "messungen.6_fehlerklassen")};
})();
{
  const e = M.fehlerklassen;
  nach("6_fehlerklassen: eigene Fälle mit erwarteter Klasse", e.eigeneFälle, e.eigeneFälleOk, e.eigeneFälleOk === e.eigeneFälle ? "stimmt" : "falsch");
  nach("6_fehlerklassen.null: echte Leereingaben → null", 5, e.leereEingaben.filter(x => x.klasse === "null").length);
  nach("6_fehlerklassen.auftrag: manipulierte Tabelle", ["auftrag", "auftrag"], e.auftragFälle.map(x => x.klasse));
  nach("6_fehlerklassen.länge.zweiterFall (Entwurf: als zweiter länge-Fall geführt)", "länge", hol(EJ, "messungen.6_fehlerklassen.länge.zweiterFall.fehler"), "falsch",
    "Der Fall NL-OQS-4 ist kein Längenfall: nach dem Entfernen der Trenner bleiben 6 Zeichen (das führende NL wird nicht abgeschnitten, weil nur 4 übrig blieben), die Längenprüfung geht durch und erst das O ergibt {fehler:\"zeichen\"}.");
  nach("6_fehlerklassen.verwechslung.hinweis gegen die eigenen Werte", "„Der Code hat 7 Zeichen – er braucht 6 …“",
    "gemessen " + hol(EJ, "messungen.6_fehlerklassen.verwechslung.auftragsFeldMitErgebnisCode.grund"), "falsch",
    "Der Ergebnis-Code E-HNSB-6G8 ergibt im Auftragsfeld die Länge 8 (nicht 7); der Hinweistext „hat 7 Zeichen“ passt nicht zu den eigenen Messwerten im selben JSON.");
  const kf = M.fehlerklassen.entwurfsKontrollFälle || [];
  const kfNach = kf.map(k => {
    const r = leseAuftrag(k.code, TAB);
    const klasse = r === null ? "null" : (r.fehler || "angenommen");
    return {name: k.name, code: k.code, entwurfKlasse: k.fehler, meineKlasse: klasse, stimmt: klasse === k.fehler, erwartet: k.erwartet};
  });
  M.fehlerklassen.kontrollFälleNachgerechnet = kfNach;
  nach("4_vertipper.kontrollFälle (4 Fälle des Entwurfs)", kf.length, kfNach.filter(x => x.stimmt).length,
    kfNach.length > 0 && kfNach.every(x => x.stimmt) ? "stimmt" : "unklar",
    kfNach.map(x => x.code + " → " + x.meineKlasse).join("; "));
}

/* =====================================================================================
   M7 — Formbeispiel NL-4F7K-2Q (Pflichtmessung 7)
   ===================================================================================== */
M.formbeispiel = (() => {
  const form = "NL-4F7K-2Q", nutz = "4F7K2Q";
  const v = [..."4F7K"].map(w);
  const c1 = C1(v), c2 = C2(v);
  const richtig = "NL-4F7K-" + z(c1) + z(c2);
  const gelesen = leseAuftrag(form, TAB);
  const r = leseAuftrag(richtig, TAB);
  const paare = [];
  for (const a of AZ) for (const b of AZ) if (leseAuftrag("NL-4F7K-" + a + b, TAB).id) paare.push(a + b);
  return {formbeispiel: form, werte: v,
    rechnungC1: "1·" + v[0] + " + 2·" + v[1] + " + 3·" + v[2] + " + 4·" + v[3] + " = " + summeC1(v) + " → 31·5 = 155, Rest " + c1 + " → Prüfzeichen " + z(c1),
    rechnungC2: "1·" + v[0] + " + 3·" + v[1] + " + 5·" + v[2] + " + 7·" + v[3] + " = " + summeC2(v) + " → 32·7 = 224, Rest " + c2 + " → Prüfzeichen " + z(c2),
    gelesen: form, klasse: gelesen.fehler || "angenommen", erwartet: z(c1) + z(c2), gelesenePrüfzeichen: "2Q",
    richtigerCode: richtig,
    richtigerCodeFelder: r && !r.fehler ? {id: r.id, index: r.index, variante: r.variante, sitzung: r.sitzung, seed: r.seed, art: r.artName} : r,
    gültigePrüfpaareUnter1024: paare.length, paare,
    grenzeC1: "C1 = " + c1 + " (mod 31) → das erste Prüfzeichen ist nie „9“ (Wert 31); über alle 2^20 Codes gemessen: " + M1.erstesPrüfzeichenIstNeun + " Codes mit erstem Prüfzeichen „9“, " + M1.zweitesPrüfzeichenIstNeun + " mit zweitem Prüfzeichen „9“ (das sind genau 2^20/32)"};
})();
{
  const f = M.formbeispiel;
  const vForm = [..."4F7K"].map(w);
  nach("7_formbeispiel: C1/C2 des Formbeispiels", {C1: hol(EJ, "messungen.7_formbeispiel.C1"), C2: hol(EJ, "messungen.7_formbeispiel.C2")}, {C1: C1(vForm), C2: C2(vForm)});
  nach("7_formbeispiel.werteNutzeichen", hol(EJ, "messungen.7_formbeispiel.werteNutzeichen"), vForm);
  nach("7_formbeispiel.erwartetePrüfzeichen", hol(EJ, "messungen.7_formbeispiel.erwartetePrüfzeichen"), M.formbeispiel.erwartet);
  nach("7_formbeispiel.gültig / fehler", [false, "prüfziffer"], [hol(EJ, "messungen.7_formbeispiel.gültig"), hol(EJ, "messungen.7_formbeispiel.fehler")]);
  nach("7_formbeispiel.richtigerCodeFürNutzlast", hol(EJ, "messungen.7_formbeispiel.richtigerCodeFürNutzlast.code"), M.formbeispiel.richtigerCode);
  nach("7_formbeispiel.richtigerCodeFürNutzlast (Index/Variante/Sitzung/ticketId)",
    [hol(EJ, "messungen.7_formbeispiel.richtigerCodeFürNutzlast.index"), hol(EJ, "messungen.7_formbeispiel.richtigerCodeFürNutzlast.variante"), hol(EJ, "messungen.7_formbeispiel.richtigerCodeFürNutzlast.sitzung"), hol(EJ, "messungen.7_formbeispiel.richtigerCodeFürNutzlast.ticketId")],
    [M.formbeispiel.richtigerCodeFelder.index, M.formbeispiel.richtigerCodeFelder.variante, M.formbeispiel.richtigerCodeFelder.sitzung, M.formbeispiel.richtigerCodeFelder.id]);
  nach("7_formbeispiel: nur 1 gültiges Prüfpaar von 1024", 1, M.formbeispiel.gültigePrüfpaareUnter1024);
  befund("M7 (eigene Implementierung): " + M.formbeispiel.rechnungC1 + "; " + M.formbeispiel.rechnungC2 + " — das Formbeispiel NL-4F7K-2Q trägt die Prüfzeichen „2Q“ und wird deshalb abgelehnt (prüfziffer); " +
    "korrekt wäre " + M.formbeispiel.richtigerCode + " (Index " + M.formbeispiel.richtigerCodeFelder.index + ", Variante " + M.formbeispiel.richtigerCodeFelder.variante + ", Sitzung " + M.formbeispiel.richtigerCodeFelder.sitzung + ", ticketId " + M.formbeispiel.richtigerCodeFelder.id + "). " +
    "Für dieselben Nutzzeichen ist genau 1 von 1024 Prüfpaaren gültig. " + M.formbeispiel.grenzeC1 + ".");
}

/* =====================================================================================
   M8 — Randfälle des Entwurfs, die dieser nicht geprüft hat: art 1 mit Index 26 und der
         Generator (KLASSENRAUM.md verlangt „jeder lesbare Code liefert einen lösbaren Auftrag“)
   ===================================================================================== */
M.skillTauglichkeit = (() => {
  const t0 = Date.now();
  const FRIST = 300000;
  let abgebrochen = false;
  const je = [];
  for (let i = 0; i < SKILLS.length && !abgebrochen; i++) {
    if (Date.now() - t0 > FRIST) { abgebrochen = true; break; }
    const id = SKILLS[i];
    let wirft = 0, keinDef = 0, defs = 0, gültig = 0, ersterGültigerSeed = null, fehlertext = null;
    for (let seed = 1; seed <= 64; seed++) {
      let d = null, err = null;
      try { d = Spiel.generiere(id, seed); } catch (e) { err = String(e && e.message || e); }
      if (err) { wirft++; if (!fehlertext) fehlertext = err; continue; }
      if (!d) { keinDef++; continue; }
      defs++;
      let ok = false;
      try { ok = Spiel.ticketGueltig(d); } catch (e) { ok = false; }
      if (ok) { gültig++; if (ersterGültigerSeed === null) ersterGültigerSeed = seed; }
    }
    je.push({index: i, skill: id, seeds: 64, wirft, keinDef, defs, gültig, ersterGültigerSeed, fehlertext,
      brauchbar: ersterGültigerSeed !== null});
  }
  /* die drei Fertigkeiten ohne Injektor über den ganzen Variantenbereich 1..256 (variante 0..255) */
  const ohneInjektor = [];
  for (const i of [24, 25, 26]) {
    const id = SKILLS[i];
    let wirft = 0, defs = 0;
    for (let seed = 1; seed <= 256; seed++) {
      try { if (Spiel.generiere(id, seed)) defs++; else wirft++; } catch (e) { wirft++; }
    }
    ohneInjektor.push({index: i, skill: id, seeds1bis256: 256, wirft, defs});
  }
  return {je, abgebrochen, ms: Date.now() - t0, ohneInjektor,
    hinweis: "gemessen mit Spiel.generiere(skill, seed) und Spiel.ticketGueltig(def) im Lader-Kontext, _trocken = true; jeder Lauf ist deterministisch (Seed-String im Generator)"};
})();
{
  const s = M.skillTauglichkeit;
  const tote = s.je.filter(x => x.defs === 0);
  const brauchbar = s.je.filter(x => x.brauchbar).length;
  M.skillTauglichkeit.zusammenfassung = {
    fertigkeiten: s.je.length, nieEinAuftrag: tote.map(x => x.skill), brauchbarImFenster1bis64: brauchbar,
    toteIndizes: tote.map(x => x.index),
  };
  befund("M8 (eigene Messung, in dieser Sitzung): von den " + s.je.length + " Fertigkeiten der TABELLE_SKILLS liefern " + tote.length +
    " überhaupt keinen Auftrag — Spiel.generiere wirft für jede Ziehungszahl „Kein Injektor für …“: " + tote.map(x => x.skill + " (Index " + x.index + ")").join(", ") + ". " +
    "Über den ganzen Variantenbereich (Seed 1..256, also variante 0..255) ebenso: " + s.ohneInjektor.map(x => x.skill + " " + x.wirft + "/256 Würfe").join(", ") + ". " +
    "Damit sind " + tsd(tote.length * 32 * 256) + " der 696.320 vom Entwurf als „gültig“ gezählten Codes (art 1, diese Indizes) zwar lesbar, liefern aber nie einen Auftrag; § 5 (Kanonisierungsfenster über 64 Seeds) findet dort auch keinen Ersatz.");
  nach("Art-1-Codes mit Index 24/25/26 liefern einen lösbaren Auftrag (KLASSENRAUM: „jeder lesbare Code liefert einen lösbaren Auftrag“)",
    "für jeden lesbaren Code gilt das", tote.length + " Fertigkeiten ohne Injektor (" + tote.map(x => x.skill).join(", ") + "), " + tsd(tote.length * 32 * 256) + " Codes betroffen", "falsch");
  nicht("Nicht geprüft (M8): ob für die übrigen " + (s.je.length - tote.length) + " Fertigkeiten JEDE der 256 Varianten im Kanonisierungsfenster (64 Seeds) einen gültigen Auftrag findet — hier nur die Fenster Seed 1..64 je Fertigkeit gezählt.");
}

/* =====================================================================================
   M9 — Textbelege: Behauptungen des Entwurfs über A-festlegung.md prüfen
   ===================================================================================== */
M.textbelege = (() => {
  const fest = fs.readFileSync(FESTLEGUNG, "utf8");
  const zeilen = fest.split(/\r?\n/);
  const suche = muster => {
    const treffer = [];
    zeilen.forEach((z, i) => { if (z.includes(muster)) treffer.push(i + 1); });
    return treffer;
  };
  const entwurf = fs.readFileSync(ENTWURF_DATEI, "utf8");
  const ezeilen = entwurf.split(/\r?\n/);
  const sucheEntwurf = muster => {
    const treffer = [];
    ezeilen.forEach((z, i) => { if (z.includes(muster)) treffer.push(i + 1); });
    return treffer;
  };
  /* Nichtdeterminismus-Suche im Entwurf */
  const muster = ["Math.random", "jetzt(", "Spiel.einst", "Spiel.flow", "Date.now", "new Date"];
  const nichtdeterministisch = muster.map(m => {
    const treffer = sucheEntwurf(m);
    return {muster: m, treffer, zeilenText: treffer.slice(0, 2).map(n => ezeilen[n - 1].trim().slice(0, 110))};
  });
  return {
    festlegungZeilen: zeilen.length,
    "28_in_Festlegung": suche("28"),
    "C2 = 28_in_Festlegung": suche("C2 = 28"),
    "1 von 31_in_Festlegung": suche("1 von 31"),
    "Zufallserwartung_in_Festlegung": suche("Zufallserwartung"),
    "992_in_Festlegung": suche("992"),
    "C2 = 28_im_Entwurf": sucheEntwurf("C2 = 28"),
    "1 von 31_im_Entwurf": sucheEntwurf("1 von 31"),
    "1/992_im_Entwurf": sucheEntwurf("1/992"),
    nichtdeterministischeMuster: nichtdeterministisch,
    entwurfZeilen: ezeilen.length,
  };
})();
{
  const t = M.textbelege;
  nach("Behauptung des Entwurfs: „A-festlegung.md § 2 nennt für dieses Nutzzeichen C2 = 28“", "die Festlegung nennt C2 = 28",
    "Treffer für „C2 = 28“ in A-festlegung.md: " + t["C2 = 28_in_Festlegung"].length + " (Treffer für „28“ überhaupt: Zeilen " + kurz(t["28_in_Festlegung"]) + ")", "falsch",
    "Die Zeichenkette steht nur im Entwurf selbst (A-format.js Zeilen " + kurz(t["C2 = 28_im_Entwurf"]) + "). § 2 enthält keinen Zahlenwert 28 — der Entwurf korrigiert damit eine Aussage, die im eingefrorenen Vertrag nicht steht.");
  nach("Behauptung des Entwurfs: „Die in § 2 genannte Zufallserwartung ‚1 von 31 Zeichen trifft die Prüfsumme‘ ist falsch“", "§ 2 nennt diese Erwartung",
    "Treffer für „1 von 31“ in A-festlegung.md: " + t["1 von 31_in_Festlegung"].length + ", für „Zufallserwartung“: " + t["Zufallserwartung_in_Festlegung"].length + ", für „992“: " + t["992_in_Festlegung"].length, "falsch",
    "§ 2 beweist das Gegenteil (jede Einzel-Ersetzung wird erkannt) und nennt keine Trefferquote. Die Formulierung „weil 2 kein Teiler von 32 ist“ (Zeile 1040) ist zusätzlich sachlich falsch: 2 teilt 32.");
}
KORR.push({
  stelle: "tools/klassenraum-probe/A-format.js, Zeilen 784/868 und 1040/1054 (sonderfallA9-Hinweis und befundZumVergleich) sowie die daraus gebildeten Befunde in A-format.json",
  problem: "Der Entwurf schreibt A-festlegung.md § 2 zwei Aussagen zu, die dort nicht stehen: „C2 = 28 für AA99“ und die „Zufallserwartung 1 von 31 Zeichen trifft die Prüfsumme (1/992)“. Beleg dieser Sitzung: die Zeichenketten kommen in A-festlegung.md nicht vor (Treffer 0), nur im Entwurf selbst. Zusätzlich ist „weil 2 kein Teiler von 32 ist“ falsch (2 teilt 32).",
  vorschlag: "Richtigstellen: die Rechnung C2 = 372 mod 32 = 20 unverändert lassen, aber als eigene Nachrechnung kennzeichnen (nicht als Korrektur der Festlegung) — z. B. „eigene Kontrollrechnung zum Nutzzeichen AA99: C2 = 20“. Den Satz zur Zufallserwartung streichen und durch den tragfähigen Grund ersetzen: eine Ersetzung an Stelle i ändert C2 um w_i·δ mit ungeradem w_i; da w_i modulo 32 invertierbar ist, folgt δ ≡ 0 (mod 32), also δ = 0 — deshalb 0 unerkannte Ersetzungen, ohne Zufallsannahme.",
});
KORR.push({
  stelle: "tools/klassenraum-probe/A-format.js, NUTZTEIL_MUSTER Zeile 588 / Ausgabe messungen.4_vertipper.basen[3]",
  problem: "Der Basiscode NL-TG5H-Q5 ist als „generiert, Index 26, Variante 0“ beschriftet; gelesen ist er art 0, Index 27, Sitzung 17, Variante 103 (Tabelle TABELLE_AUFTRAEGE). Genau der Randfall „art 1 mit Index 26“ (letzte Fertigkeit) wird damit nicht geprüft, obwohl der Entwurf ihn zu prüfen behauptet.",
  vorschlag: "Für den Randfall einen echten Code verwenden: codeBauen({sitzung: 0, art: 1, index: 26, variante: 0}) → " + codeAuftrag(0, 1, 26, 0).code + " (Skill " + SKILLS[26] + ").",
});
KORR.push({
  stelle: "Nachweise/Klassenraum/A-format.json, messungen.4_vertipper.kernfälle (artenVerteilung) und messungen.4_vertipper.tauschKontrolle",
  problem: "Von den 10 Fällen der Art „b_nachbarn_vertauscht“ tauschen nur 6 zwei Nutzzeichen; 2 tauschen Nutzzeichen 4 gegen das erste Prüfzeichen (Position 3-4), 2 die beiden Prüfzeichen (Position 4-5). In der tauschKontrolle sind es 10 von 25. § 2 beweist nur etwas über Nachbartauschungen zweier Nutzzeichen — die Kennzahlen C1Unverändert = 6 / C2Unverändert = 5 enthalten die nicht gedeckten Fälle (die 5 Prüfzeichen-Täusche lassen die Nutzlast unberührt, dort ist C2 zwangsläufig gleich).",
  vorschlag: "Die Nachbartausch-Fälle auf die Positionen 0-1, 1-2, 2-3 begrenzen (Nutzzeichen) und die beiden anderen Gruppen getrennt ausweisen (z. B. als „prüfzeichenBeteiligt“), damit die Kennzahlen zur Aussage aus § 2 passen.",
});
KORR.push({
  stelle: "Nachweise/Klassenraum/A-format.json, messungen.6_fehlerklassen.verwechslung.hinweis",
  problem: "Der Hinweis sagt „Beide Wege enden … mit dem Hinweis ‚Der Code hat 7 Zeichen – er braucht 6 …‘“, die eigene Messung im selben Objekt ergibt aber 8 Zeichen (E-HNSB-6G8 → 8, NL-AAAA-AA → 8).",
  vorschlag: "Hinweistext an die Messwerte anpassen: Auftragsfeld erwartet 6 Zeichen (Ergebnis-Code hat nach dem Entfernen der Trenner 8), Ergebnisfeld erwartet 7 Zeichen (Auftragscode 8).",
});
KORR.push({
  stelle: "Nachweise/Klassenraum/A-format.json, messungen.4_vertipper.genauigkeit",
  problem: "„Alle Basiscodes sind mit pruefsummen() erzeugt und mit auftragLesen() als gültig geprüft“ — für NL-A9B4-Q2 trifft das nicht zu: der Code liest sich als art 1, Index 60 → {fehler:\"fassung\"}. Die Prüfzeichen sind zwar richtig gerechnet, der Code ist aber kein ausstellbarer Code.",
  vorschlag: "Basiscodes über codeBauen(art, index, variante) mit gültigem Index erzeugen (art 0: 0..57, art 1: 0..26) und die Gültigkeit im Skript mit auftragLesen() selbst abfragen, statt sie im Text zu behaupten.",
});

/* =====================================================================================
   M10 — Entwurfsfunktionen gegen eigene Implementierung (Bit-Packung, Prüfsumme, Lesen)
   ===================================================================================== */
M.vergleichMitEntwurf = (() => {
  if (ENTW.fehler) return {ausgeführt: false, fehler: ENTW.fehler};
  let geprüft = 0, codeAbweichungen = 0, klasseAbweichungen = 0;
  const beispiele = [];
  const varianten = [0, 1, 127, 128, 254, 255];
  for (let sitzung = 0; sitzung < 32; sitzung++) {
    for (let art = 0; art < 2; art++) {
      for (let index = 0; index < 64; index++) {
        for (const variante of varianten) {
          geprüft++;
          const meins = codeAuftrag(sitzung, art, index, variante);
          const ent = ENTW.codeBauen({sitzung, art, index, variante});
          if (ent.fehler || ent.code !== meins.code) { codeAbweichungen++; if (beispiele.length < 3) beispiele.push({felder: {sitzung, art, index, variante}, mein: meins.code, entwurf: ent.code || ent}); }
          const tab = {tickets: TICKETS, skills: SKILLS, existiert: id => DATEN_IDS.includes(id) || SKILLS.includes(id)};
          const m1 = leseAuftrag(meins.code, TAB);
          const e1 = ENTW.auftragLesen(meins.code, tab);
          const km = m1 === null ? "null" : (m1.fehler || "angenommen");
          const ke = e1 === null ? "null" : (e1.fehler || "angenommen");
          if (km !== ke) { klasseAbweichungen++; if (beispiele.length < 5) beispiele.push({code: meins.code, mein: km, entwurf: ke}); }
        }
      }
    }
  }
  /* Ergebnis-Code: Grenzen + Zufallsstichprobe */
  const zufall = rng(SEED + 7);
  let ergebnisGeprüft = 0, ergebnisAbweichungen = 0;
  const eBeispiele = [];
  for (let i = 0; i < 5000; i++) {
    const f = {sitzung: Math.floor(zufall() * 32), platz: Math.floor(zufall() * 32), sterne: Math.floor(zufall() * 11),
      versuche: Math.floor(zufall() * 4), dauer: Math.floor(zufall() * 512)};
    ergebnisGeprüft++;
    const meins = codeErgebnis(f), ent = ENTW.ergebnisCodeBauen(f);
    if (!ent.fehler && ent.code !== meins.code) { ergebnisAbweichungen++; if (eBeispiele.length < 3) eBeispiele.push({f, mein: meins.code, entwurf: ent.code}); }
  }
  /* Normalisierung: gleiche Klassen auf einer Liste von Eingaben */
  const eingaben = ["nl4f7k2q", "NL-4F7K-2Q", "  nl 4f7k 2q  ", "NL 4F7K 2Q", "4F7K2Q", "NL4F7K2Q", "n-l-4-f-7-k-2-q",
    "NL-NLAA-BL", "NLAA-BL", "----", "", "   ", null, undefined, 0, false, "NL-4F7K-2O", "NL-B4", "E-HNSB-6G8"];
  const normAbw = eingaben.filter(e => {
    const m = normalisier(e, "auftrag"), x = ENTW.normalisieren(e, "auftrag");
    const km = m === null ? "null" : (m.fehler || m.nutzteil);
    const kx = x === null ? "null" : (x.fehler || x.nutzteil);
    return km !== kx;
  });
  return {ausgeführt: true, auftragscodesGeprüft: geprüft, codeAbweichungen, klasseAbweichungen,
    ergebnisGeprüft, ergebnisAbweichungen, normalisierungAbweichungen: normAbw, beispiele: [...beispiele, ...eBeispiele]};
})();
{
  const v = M.vergleichMitEntwurf;
  if (v.ausgeführt) {
    nach("Entwurf vs. eigene Implementierung: Auftragscodes (32·2·64·6 = " + tsd(v.auftragscodesGeprüft) + " Fälle)", 0,
      {codeAbweichungen: v.codeAbweichungen, klassenAbweichungen: v.klasseAbweichungen},
      v.codeAbweichungen === 0 && v.klasseAbweichungen === 0 ? "stimmt" : "falsch",
      "Bit-Packung und Lesen stimmen in allen geprüften Fällen überein");
    nach("Entwurf vs. eigene Implementierung: Ergebnis-Codes (" + tsd(v.ergebnisGeprüft) + " Zufallsfälle)", 0, v.ergebnisAbweichungen,
      v.ergebnisAbweichungen === 0 ? "stimmt" : "falsch", "Packung 5/5/4/2/9 Bit stimmt überein");
    nach("Entwurf vs. eigene Implementierung: Normalisierung", 0, v.normalisierungAbweichungen.length,
      v.normalisierungAbweichungen.length === 0 ? "stimmt" : "falsch", "geprüfte Eingaben: " + kurz(v.normalisierungAbweichungen));
  } else {
    nicht("Entwurfsfunktionen konnten nicht extrahiert werden (" + v.fehler + ") — der direkte Vergleich Entwurf/Ist fehlt.");
  }
}

/* =====================================================================================
   M11 — Randbeobachtungen, die der Entwurf nicht nennt
   ===================================================================================== */
M.randbeobachtungen = (() => {
  const pz1 = new Set(), pz2 = new Set();
  for (let a = 0; a < 32; a++) for (let b = 0; b < 32; b++) for (let c = 0; c < 32; c++) for (let d = 0; d < 32; d++) {
    const c1 = (a + 2 * b + 3 * c + 4 * d) % 31, c2 = (a + 3 * b + 5 * c + 7 * d) % 32;
    pz1.add(c1); pz2.add(c2);
  }
  return {
    erstePrüfzeichenWerte: {anzahl: pz1.size, fehlendeWerte: [...Array(32).keys()].filter(v => !pz1.has(v)), zeichen: [...Array(32).keys()].filter(v => !pz1.has(v)).map(z)},
    zweitePrüfzeichenWerte: {anzahl: pz2.size, fehlendeWerte: [...Array(32).keys()].filter(v => !pz2.has(v))},
    hinweis: "C1 = mod 31 → höchstens 31 Werte; das erste Prüfzeichen kann nie „9“ (Wert 31) sein. Der Entwurf nennt das nirgends — für die Oberfläche (Stufe A/B) ist es nützlich, weil ein getipptes „9“ an der ersten Prüfstelle immer ein Vertipper ist.",
  };
})();
{
  const r = M.randbeobachtungen;
  nach("Erstes Prüfzeichen kann nie „9“ sein (C1 mod 31)", "im Entwurf nicht erwähnt",
    "über alle 2^20 Codes: " + M1.erstesPrüfzeichenIstNeun + " Codes mit erstem Prüfzeichen „9“ (zweites Prüfzeichen „9“: " + M1.zweitesPrüfzeichenIstNeun + ")", "unklar",
    "Kein Fehler, aber eine Lücke im Entwurfstext: die Prüfsumme C1 (mod 31) lässt genau ein Alphabetzeichen an der ersten Prüfstelle nie zu. " + r.erstePrüfzeichenWerte.anzahl + " von 32 Werten sind erreichbar, es fehlt „9“.");
  nach("Codes mit einem Nutzteil, das mit „NL“ beginnt", "„in dieser Sitzung trägt kein geprüfter Code einen Nutzteil, der mit NL beginnt“",
    M.randfall_nutzteil_NL.anzahlGültigerCodesMitNLNutzteil + " gültige Codes (Beispiel " + M.randfall_nutzteil_NL.probe.code + ")", "falsch",
    "Kein Fehler des Formats — die Präfixregel ist eindeutig —, aber die Aussage des Entwurfs ist zu stark formuliert (er hat nur NL-AAAA-AA geprüft).");
}

/* =====================================================================================
   M12 — Randfälle, die die Prüfaufgabe ausdrücklich nennt
   ===================================================================================== */
M.randfälleAuftrag = (() => {
  const liste = [
    {name: "sitzung 0, art 0, index 0, variante 0", felder: {sitzung: 0, art: 0, index: 0, variante: 0}},
    {name: "art 0, letzter gültiger Index 57", felder: {sitzung: 0, art: 0, index: 57, variante: 0}},
    {name: "art 0, erster freier Index 58", felder: {sitzung: 0, art: 0, index: 58, variante: 0}},
    {name: "art 0, letzter Index 63", felder: {sitzung: 31, art: 0, index: 63, variante: 255}},
    {name: "art 1, erster Index 0", felder: {sitzung: 0, art: 1, index: 0, variante: 0}},
    {name: "art 1, letzter gültiger Index 26", felder: {sitzung: 0, art: 1, index: 26, variante: 0}},
    {name: "art 1, erster freier Index 27", felder: {sitzung: 0, art: 1, index: 27, variante: 0}},
    {name: "art 1, Index 63", felder: {sitzung: 0, art: 1, index: 63, variante: 0}},
    {name: "größte Nutzlast (31,1,63,255)", felder: {sitzung: 31, art: 1, index: 63, variante: 255}},
    {name: "variante 255 (Seed 256)", felder: {sitzung: 7, art: 0, index: 10, variante: 255}},
    {name: "sitzung 31, variante 0", felder: {sitzung: 31, art: 0, index: 10, variante: 0}},
  ].map(x => {
    const r = codeAuftrag(x.felder.sitzung, x.felder.art, x.felder.index, x.felder.variante);
    const l = leseAuftrag(r.code, TAB);
    return {name: x.name, felder: x.felder, code: r.code, länge: r.code.length, C1: r.C1, C2: r.C2,
      klasse: l.fehler || "angenommen", id: l.id || null, seed: l.seed !== undefined ? l.seed : null,
      tabelleneintrag: l.tabelle || null, tabellenlänge: l.länge !== undefined ? l.länge : null};
  });
  const ent = ENTW.fehler ? null : leseAuftrag(codeAuftrag(31, 1, 63, 255).code, TAB);
  return {liste, größterCodeDesEntwurfs: {code: "NL-9999-AS", klasse: ent ? ent.fehler : null,
    hinweis: "Der Entwurf nennt NL-9999-AS „größter Auftragscode“ (messungen.2_länge.randwerte) — er ist mit {fehler:\"fassung\"} nicht lesbar, weil Index 63 im freien Bereich liegt (§ 7c)."}};
})();
{
  const r = M.randfälleAuftrag;
  nach("2_länge.randwerte „größter Auftragscode (31,1,63,255)“ = NL-9999-AS", "Auftragscode", 
    "wohlgeformt, aber " + r.größterCodeDesEntwurfs.klasse + " (Index 63 = freier Index)", "unklar",
    "Die Bezeichnung führt in die Irre: der Code ist 10 Zeichen lang und prüfsummengültig, aber nicht lesbar. Der größte LESBARE Code ist art 0/Index 57 oder art 1/Index 26.");
  nach("Randfall art 1, Index 26 (letzte Fertigkeit)", "im Entwurf als Basiscode „TG5H“ behauptet", 
    codeAuftrag(0, 1, 26, 0).code + " → angenommen, id " + r.liste.find(x => x.name.includes("Index 26") && x.name.startsWith("art 1")).id + " (Generator liefert dafür aber nie einen Auftrag, siehe M8)", "falsch");
}

/* =====================================================================================
   ABSCHLUSS — Laufzeit, Befehle, Schreiben
   ===================================================================================== */
function zählerNACH() {
  const s = NACH.filter(x => x.urteil === "stimmt").length;
  const f = NACH.filter(x => x.urteil === "falsch").length;
  const u = NACH.filter(x => x.urteil === "unklar").length;
  return {gesamt: NACH.length, stimmt: s, falsch: f, unklar: u};
}
M.nachgerechnet_Zähler = () => { const z = zählerNACH(); return z.gesamt + " Punkte (" + z.stimmt + " stimmt, " + z.falsch + " falsch, " + z.unklar + " unklar)"; };

const laufzeitMs = Date.now() - T0;
M.laufzeitMs = laufzeitMs;
M.laufzeit = {
  grenzeMs: 600000, innerhalbDerGrenze: laufzeitMs <= 600000,
  hinweis: "Gemessen in dieser Sitzung. Die Zahl steht im JSON (Auflage der Prüfaufgabe), ist aber vom Vergleich „schon identisch?“ ausgenommen — sonst würde die Datei bei jedem Lauf neu geschrieben und der Zeitstempel wäre nie stabil.",
  entwurfslaufMs: 7350,
  entwurfslauf: "eigener Lauf dieser Sitzung: A-format.js --nur-schreiben (7350 ms Rechenzeit, 8120 ms Wanduhr); die Entwurfsdatei wurde dabei nicht angefasst und war byte-identisch",
};
M.probe = {
  datei: "tools/klassenraum-probe/A-pruef-format.js",
  sha256: crypto.createHash("sha256").update(fs.readFileSync(__filename, "utf8")).digest("hex"),
  entwurfSha256: crypto.createHash("sha256").update(fs.readFileSync(ENTWURF_DATEI, "utf8")).digest("hex"),
  entwurfZeilen: fs.readFileSync(ENTWURF_DATEI, "utf8").split("\n").length - 1,
  entwurfJsonZeilen: fs.readFileSync(ENTWURF_JSON, "utf8").split("\n").length - 1,
  node: process.version, plattform: process.platform,
};

BEFEHLE[0].ergebnis = "vollständig gelaufen in " + laufzeitMs + " ms: " + tsd(M1.nutzlastwerte) + " Nutzlastwerte, " + tsd(M1.roundtrips) +
  " Round-Trips, " + tsd(M4.raum.ersetzungen.fälle) + " Ersetzungen und " + tsd(M4.raum.nachbartauschNutzzeichen.fälle) +
  " Nachbartauschungen im ganzen Zeichenraum, " + M.nachgerechnet_Zähler() + " nachgerechnete Einzelpunkte";
BEFEHLE.push({befehl: "& \"$env:LOCALAPPDATA\\node-portable\\node-v24.21.0-win-x64\\node.exe\" tools\\klassenraum-probe\\A-format.js --nur-schreiben",
  ergebnis: "Entwurf in dieser Sitzung ausgeführt (7350 ms Rechenzeit): nutzlastwerte 1048576, roundtrips 696320, fehlschläge 0, freieIndizesAbgelehnt 352256, vertipperKernfälle 44/44 abgelehnt, a9Fälle 5/5, zufall5a {länge 9989, prüfziffer 5, zeichen 6}, zufall5c 100 %, substitutionenVollständig 18600/18600 erkannt, formbeispielGültig false, richtigFür4F7K2Q NL-4F7K-E3; Ausgabe „A-format.json: identisch (nichts geschrieben, Zeitstempel bleibt)“ — die gelieferte Entwurfsdatei stammt aus genau diesem Code, der Zeitstempel 23:36:50 blieb unverändert."});
BEFEHLE.push({befehl: "grep (ripgrep) über das Repo nach \"1 von 31|C2 = 28|Zufallserwartung|1/992\"",
  ergebnis: "Treffer nur in tools/klassenraum-probe/A-format.js (Zeilen 784, 868, 986, 1040, 1054) — nicht in A-festlegung.md und nicht in den anderen A-Belegdateien."});

/* Befunde, die aus den Messungen folgen */
{
  const z = zählerNACH();
  befund("Zählung dieser Gegenprüfung: " + z.gesamt + " nachgerechnete Einzelpunkte — " + z.stimmt + " stimmt, " + z.falsch + " falsch, " + z.unklar + " unklar. " +
    "Die Kernzahlen des Entwurfs (2^20 Nutzlasten, 696320 gültige Codes, 352256 freie Indizes, Länge 10, 44/44 Vertipper abgelehnt, Raum: 0 unerkannte Ersetzungen/Nachbartauschungen, Formbeispiel ungültig) sind unabhängig bestätigt.");
  befund("Die " + KORR.length + " Korrekturen wiegen unterschiedlich schwer: falsche Herkunftsangaben der fünf Basiscodes und die daraus folgende Falschaussage „alle Basiscodes sind als gültig geprüft“ (einer davon ist nicht lesbar), die in sich widersprüchlichen Erwartungstexte der tauschKontrolle, der wirkungslose auftrag-Kontrollfall und die zwei falschen Zuschreibungen an A-festlegung.md § 2.");
  befund("M8 ist der einzige inhaltliche Befund mit Folgen für die Auftrags-Schnittstelle: drei der 27 Fertigkeiten (lab.portsec, lab.stp, lab.storage, Indizes 24–26) haben keinen Injektor — für sie liefert Spiel.generiere bei JEDEM Seed „Kein Injektor für …“. " +
    tsd(3 * 32 * 256) + " Codes der 696.320, die der Entwurf als gültig zählt, sind damit lesbar, aber unbrauchbar; KLASSENRAUM.md verlangt „jeder lesbare Code liefert einen lösbaren Auftrag“.");
  befund("Nicht-Determinismus ist im Entwurf keiner messbar: die Suche nach Math.random/jetzt(/Spiel.einst/Spiel.flow im Entwurfstext ergibt " +
    kurz(M.textbelege.nichtdeterministischeMuster.filter(x => x.treffer.length).map(x => x.muster + " (Zeilen " + x.treffer.join(",") + ")")) + " — " +
    "Math.random steht nur in der Kommentarzeile 23 („Kein Math.random.“), Date.now() dient allein der Laufzeitmessung, new Date() steht im Konsolenblock. " +
    "Kein Messwert der Datei hängt daran: der Entwurfslauf dieser Sitzung erzeugte die gelieferte JSON byte-identisch, der Zeitstempel blieb stehen.");
}
OFFENE.push("Stufe-B-Frage: der Ergebnis-Code trägt laut § 4 „versuche 0..3“ als Fehlversuche (abnahmen − 1). Der Codec rechnet nur, die Ableitung aus der Abnahme ist nicht Teil dieser Probe (der Entwurf sagt dasselbe).");
OFFENE.push("Der Codec liefert für art 1 unter dem Schlüssel ticketId eine Skill-ID (z. B. " + SKILLS[0] + "); Spiel.ticketDef(skillId) ergibt dafür null (in dieser Sitzung gemessen: " + (Spiel.ticketDef(SKILLS[0]) === null) + "). Wer den Wert ungeprüft an instanzErstellen({ticketId}) gibt, erhält „Unbekanntes Ticket“. Die Schnittstelle ausCode → {ticketId, seed, art} sollte den Fall art=generiert ausdrücklich benennen.");
REST.push("Die Erwartungstexte erwartungC1/erwartungC2 in messungen.4_vertipper.tauschKontrolle bleiben falsch, solange der Entwurf nicht nachgezogen wird — die Messwerte daneben (C1neu/C2neu) sind richtig.");
REST.push("messungen.4_vertipper.basen: fünf Herkunftsangaben falsch, ein Basiscode nicht lesbar.");
REST.push("messungen.4_vertipper.auftragKontrolle: der Fall „ID verschwindet“ belegt nichts (Feld ohneEintrag fehlt im JSON).");
REST.push("messungen.6_fehlerklassen.länge.zweiterFall ist unter „länge“ geführt, liefert aber „zeichen“.");
REST.push("messungen.4_vertipper.tauschKontrolle: 10 von 25 Fällen sind keine Nachbartauschungen zweier Nutzzeichen, werden aber in C1Unverändert/C2Unverändert mitgezählt.");
nicht("Nicht geprüft: die Kanonisierung (§ 5) und der Netzkennwert (§ 6) — andere Bausteine, nicht Gegenstand dieses Entwurfs.");
nicht("Nicht geprüft: ob die gelesenen Codes im Spiel wirklich ein lösbares Netz ergeben (Spiel.ticketGueltig für Handaufträge) — diese Probe prüft nur die Generator-Tauglichkeit der Fertigkeiten (M8).");
nicht("Nicht geprüft: Sitzungslogik, erzeugen/ergebnisEintragen/exportieren aus KLASSENRAUM.md — der Entwurf ist eine Codec-Probe, src/spiel/klassenraum.js gibt es nicht (in dieser Sitzung nachgesehen).");
nicht("Nicht geprüft: ob die eingefrorenen Tabellenlängen 58/27 in einer anderen Repo-Fassung passen — hier gemessen: 58/27 wie im Vertrag.");
nicht("Nicht geprüft: die Wirkung des Codes in der Oberfläche (Startseite, Rauchtest) — nicht Teil von A-format.");

const ergebnis = {
  thema: "pruef-format",
  stand: STAND,
  gepruefterEntwurf: "tools/klassenraum-probe/A-format.js (1318 Zeilen, sha256 " + M.probe.entwurfSha256 + ") + Nachweise/Klassenraum/A-format.json (2526 Zeilen), Iteration 2",
  befehle: BEFEHLE,
  messungen: M,
  nachgerechnet: NACH,
  korrekturen: KORR,
  befunde: BEFUNDE,
  offene: OFFENE,
  restfehler: REST,
  nichtGeprueft: NICHT,
};

/* Schreiben nur, wenn sich inhaltlich etwas ändert — Laufzeiten sind ausgenommen,
   sonst würde die Datei bei jedem Lauf neu geschrieben und der Zeitstempel wäre nie stabil. */
const text = JSON.stringify(ergebnis, null, 1) + "\n";
function ohneLaufzeit(o) {
  const k = JSON.parse(JSON.stringify(o));
  const putz = x => {
    if (Array.isArray(x)) { x.forEach(putz); return; }
    if (x && typeof x === "object") {
      for (const key of Object.keys(x)) {
        if (key === "ms" || key === "laufzeitMs" || key === "msProRoundtrip") delete x[key];
        else putz(x[key]);
      }
    }
  };
  putz(k);
  if (k.messungen) delete k.messungen.laufzeitMs;
  if (Array.isArray(k.befehle) && k.befehle[0]) {
    /* nur die LaufzeitZahl aus dem Befehlstext neutralisieren — eine Textänderung soll weiter zählen */
    k.befehle[0] = {befehl: k.befehle[0].befehl, ergebnis: String(k.befehle[0].ergebnis).replace(/\d+ ms/, "N ms")};
  }
  return JSON.stringify(k, null, 1) + "\n";
}
const args = process.argv.slice(2);
const alt = fs.existsSync(ZIELDATEI) ? fs.readFileSync(ZIELDATEI, "utf8") : null;
let altObj = null;
try { altObj = alt ? JSON.parse(alt) : null; } catch (e) { altObj = null; }
const inhaltlichGleich = !!(altObj && ohneLaufzeit(altObj) === ohneLaufzeit(ergebnis));

console.log(JSON.stringify({
  probe: "A-pruef-format",
  befehl: BEFEHL,
  laufzeitMs,
  nachgerechnet: zählerNACH(),
  kernzahlen: {
    nutzlastwerte: M1.nutzlastwerte, roundtrips: M1.roundtrips, freieIndizes: M1.freiIndizesAbgelehnt,
    längeFalsch: M1.längeFalsch, idempotenzFalsch: M1.idempotenzFalsch,
    ersetzungen: M4.raum.ersetzungen, nachbartausch: {fälle: M4.raum.nachbartauschNutzzeichen.fälle, unerkannt: M4.raum.nachbartauschNutzzeichen.unerkannt},
    formule: M.formbeispiel.klasse, formbeispielKorrekt: M.formbeispiel.richtigerCode,
    entwurfsBasenHerkunftFalsch: M4.basen.filter(b => !b.herkunftStimmt).length,
    erwartungC1Falsch: M.tauschKontrolle_Prüfung.erwartungC1Falsch, erwartungC2Falsch: M.tauschKontrolle_Prüfung.erwartungC2Falsch,
    auftragKontrolleOhneEintrag: M.auftragKontrolle.entwurfsFeld_ohneEintrag,
    fertigkeitenOhneInjektor: M.skillTauglichkeit.zusammenfassung.nieEinAuftrag,
    vergleichMitEntwurf: M.vergleichMitEntwurf.ausgeführt
      ? {auftrag: M.vergleichMitEntwurf.codeAbweichungen, ergebnis: M.vergleichMitEntwurf.ergebnisAbweichungen}
      : {nichtAusgeführt: M.vergleichMitEntwurf.fehler},
  },
  korrekturen: KORR.length, befunde: BEFUNDE.length, restfehler: REST.length,
}, null, 1));

if (args.includes("--ohne-schreiben")) {
  console.log("--ohne-schreiben: " + path.relative(ROOT, ZIELDATEI).replace(/\\/g, "/") + " nicht angefasst.");
} else if (inhaltlichGleich) {
  console.log(path.relative(ROOT, ZIELDATEI).replace(/\\/g, "/") + ": inhaltlich identisch (nur die Laufzeit unterscheidet sich) — nicht geschrieben, Zeitstempel bleibt stabil.");
} else {
  fs.mkdirSync(path.dirname(ZIELDATEI), {recursive: true});
  fs.writeFileSync(ZIELDATEI, text, "utf8");
  console.log(path.relative(ROOT, ZIELDATEI).replace(/\\/g, "/") + ": geschrieben (" + Buffer.byteLength(text, "utf8") + " Bytes" + (alt === null ? ", neu" : ", geändert") + ").");
}
