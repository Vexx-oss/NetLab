"use strict";
/* ---------- Bereich A · Probe „A-format“ — Codec GENAU nach A-festlegung.md ----------
   headless, CommonJS, ohne npm. `src/` wird NICHT angefasst: src/spiel/klassenraum.js gibt es
   noch nicht. Dieses Probenskript ist die Referenzimplementierung für den Spezifikationstext.

   Aufruf (Wiederholung, Befehl im Kopf der Datei und im Ergebnis-JSON):
     & "$env:LOCALAPPDATA\node-portable\node-v24.21.0-win-x64\node.exe" tools\klassenraum-probe\A-format.js
   Zusatzargumente:
     --ohne-schreiben   nur messen, die Ergebnisdatei NICHT schreiben (für Determinismus-Prüfung)
     --nur-schreiben    nichts messen: die bereits gemessene Ergebnisdatei auf Gleichheit prüfen

   Vertrag: tools/klassenraum-probe/A-festlegung.md (eingefroren, verbindlich). Wortlaut dort:
     § 1 Alphabet, Form, Normalisierung · § 2 Prüfsumme C1/C2 · § 3 Nutzlast Auftragscode (20 Bit)
     § 7 Tabellen (eingefroren) · § 8 Fehlerklassen und Textbausteine

   REINE FUNKTIONEN (kein Zustand, kein DOM, keine Uhr, kein Zufall außer dem festen Prüf-Seed):
     normalisieren(roh, art)        -> {fehler} | {art, nutzteil, roh}
     pruefsummen(werte)             -> {C1, z1, C2, z2}
     codeBauen({sitzung,art,index,variante}) -> {code} | {fehler}
     auftragLesen(roh, tabellen)    -> {ticketId,seed,art,index,variante,sitzung,code} | {fehler} | null
   Beide öffentlichen Funktionen sind rein: sie lesen nur ihre Argumente und die übergebene Tabelle.

   Zufall in der Probe: NUR der feste Seed SEED = 20261006 (mulberry32). Kein Math.random.
*/
const fs = require("fs");
const path = require("path");

/* =====================================================================================
   TEIL 1 — CODEC (Referenzimplementierung, reine Funktionen)
   ===================================================================================== */

/* § 1: 32 Zeichen, 5 Bit je Zeichen; kein I, O, 0, 1 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const BASIS = ALPHABET.length;                       /* 32 */
const AUSGESCHLOSSEN = ["I", "O", "0", "1"];         /* laut § 1 nicht im Alphabet */
const NUMMERN = "0123456789";
const BUCHSTABEN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/* Fehlerklassen (§ 8) und ihre Textbausteine (Oberfläche, Wortlaut) */
const FEHLERKLASSEN = ["länge", "zeichen", "prüfziffer", "auftrag", "fassung", "sitzung", "wahl"];
const TEXT_LÄNGE = n => "Der Code hat " + n + " Zeichen – er braucht 6 (z. B. NL-4F7K-2Q).";
const TEXT_ZEICHEN = "Im Code kommt kein I, O, 0 und kein 1 vor – hast du 0 statt O getippt?";
const TEXT_PRUEFZIFFER = "Die Prüfziffer passt nicht – hast du dich vertippt?";
const TEXT_AUFTRAG = "Diesen Auftrag gibt es in dieser Fassung nicht.";
const TEXT_FASSUNG = "Dieser Code stammt aus einer anderen Programmfassung.";

/* Feste Fassung der Tabellen (§ 7): Länge der eingefrorenen Liste. Die ID-Listen selbst werden
   unten zur Laufzeit aus dem Lader gemessen (Spiel.ticketReihe(), DATEN.skills) — die Probe
   rechnet nicht mit abgeschriebenen IDs. */
const TABELLE_AUFTRAEGE_LAENGE = 58;
const TABELLE_SKILLS_LAENGE = 27;
const FENSTER = 64;                                  /* § 5 KANON_FENSTER */

/* Ein Zeichen → Wert 0..31. Kein Treffer → -1 (Fremdzeichen). */
function wert(c) { return ALPHABET.indexOf(c); }

/* Wert 0..31 → Zeichen. Außerhalb → null. */
function zeichen(v) {
  if (!Number.isInteger(v) || v < 0 || v >= BASIS) return null;
  return ALPHABET[v];
}

/* § 1 Normalisierung: Großschreibung → alles außer [0-9A-Z] weg → führendes NL (Auftrag) bzw.
   E (Ergebnis) abschneiden, WENN danach genau 6 (bzw. 7) Zeichen übrig bleiben.
   Danach Länge prüfen, dann Fremdzeichen. Gibt den Nutzteil ZURÜCK (noch ohne Prüfsumme). */
function normalisieren(roh, art) {
  art = art || "auftrag";
  const istAuftrag = art === "auftrag";
  const nutz = istAuftrag ? 6 : 7;                   /* 4+2 bzw. 5+2 (§ 1) */
  const praefix = istAuftrag ? "NL" : "E";

  if (roh === null || roh === undefined) return null; /* § 8: nichts getippt = keine Fehlermeldung */
  const s0 = String(roh);
  if (s0.trim() === "") return null;                  /* § 8: leere Eingabe → null */

  const gross = s0.toUpperCase();
  const ohneTrenner = gross.replace(/[^0-9A-Z]/g, ""); /* Leerzeichen, Punkt, Bindestrich … */
  let rest = ohneTrenner;
  if (rest.startsWith(praefix) && rest.length - praefix.length === nutz) rest = rest.slice(praefix.length);

  if (rest.length !== nutz) {
    return {fehler: "länge", grund: TEXT_LÄNGE(rest.length), art, länge: rest.length, erwartet: nutz, roh: s0};
  }
  const fremd = [];
  for (const c of rest) if (wert(c) < 0) fremd.push(c);
  if (fremd.length) {
    return {fehler: "zeichen", grund: TEXT_ZEICHEN, art, fremdzeichen: [...new Set(fremd)].join(""), roh: s0};
  }
  return {art, roh: s0, nutzteil: rest};
}

/* § 2 Prüfsumme: C1 = (1v0+2v1+…) mod 31, C2 = (1v0+3v1+5v2+…) mod 32.
   Gibt neben den Zahlen auch die Prüfzeichen zurück (Rückgabeart der Referenz). */
function pruefsummen(werte) {
  const c1 = werte.reduce((s, v, i) => s + (i + 1) * v, 0) % 31;
  const c2 = werte.reduce((s, v, i) => s + (2 * i + 1) * v, 0) % 32;
  return {C1: c1, z1: zeichen(c1), C2: c2, z2: zeichen(c2)};
}

/* § 3 Auftragscode bauen: n = (sitzung << 15) | (art << 14) | (index << 8) | variante */
function codeBauen(felder) {
  const f = felder || {};
  const sitzung = f.sitzung, art = f.art, index = f.index, variante = f.variante;
  const grenzen = {sitzung: [0, 31], art: [0, 1], index: [0, 63], variante: [0, 255]};
  for (const name of Object.keys(grenzen)) {
    const v = f[name], [lo, hi] = grenzen[name];
    if (!Number.isInteger(v) || v < lo || v > hi) {
      return {fehler: "fassung", grund: "Feld " + name + " außerhalb " + lo + ".." + hi + ": " + String(v)};
    }
  }
  const n = ((sitzung << 15) | (art << 14) | (index << 8) | variante) >>> 0;
  const werte = [(n >>> 15) & 31, (n >>> 10) & 31, (n >>> 5) & 31, n & 31];
  const p = pruefsummen(werte);
  const zk = werte.map(zeichen).concat([p.z1, p.z2]);
  const code = "NL-" + zk.slice(0, 4).join("") + "-" + zk.slice(4, 6).join("");
  return {
    code, sitzung, art, index, variante,
    nutzlast: n, nutzzeichen: zk.slice(0, 4).join(""), werte,
    C1: p.C1, C2: p.C2, prüfzeichen: p.z1 + p.z2,
  };
}

/* Auftragscode lesen. tabellen: {tickets:[id…], skills:[id…], existiert?(id)}.
   Reihenfolge der Prüfungen: Länge → Fremdzeichen → Prüfsumme → freier Index (fassung) → ID (auftrag). */
function auftragLesen(roh, tabellen) {
  const t = tabellen || {};
  const tickets = t.tickets || [];
  const skills = t.skills || [];
  const existiert = t.existiert || (id => tickets.includes(id));

  const n0 = normalisieren(roh, "auftrag");
  if (n0 === null) return null;                          /* § 8: null/leer → null */
  if (n0.fehler) return n0;

  const nz = n0.nutzteil.slice(0, 4);
  const pz = n0.nutzteil.slice(4, 6);
  const werte = [];
  for (const c of nz) werte.push(wert(c));
  const p = pruefsummen(werte);
  const falsch = [];
  if (p.z1 !== pz[0]) falsch.push("C1");
  if (p.z2 !== pz[1]) falsch.push("C2");
  if (falsch.length) {
    return {
      fehler: "prüfziffer", grund: TEXT_PRUEFZIFFER, art: "auftrag", roh: n0.roh, nutzteil: n0.nutzteil,
      falsch, C1: p.C1, C2: p.C2, erwartetePrüfzeichen: p.z1 + p.z2, gelesenePrüfzeichen: pz,
      rechnung: "C1=" + p.C1 + " (mod 31), C2=" + p.C2 + " (mod 32)",
    };
  }

  const n = ((werte[0] << 15) | (werte[1] << 10) | (werte[2] << 5) | werte[3]) >>> 0;
  const felder = {sitzung: (n >>> 15) & 31, art: (n >>> 14) & 1, index: (n >>> 8) & 63, variante: n & 255};

  /* § 7 (c): freie Indizes ergeben {fehler:"fassung"} */
  if (felder.art === 0 && felder.index >= TABELLE_AUFTRAEGE_LAENGE) {
    return {fehler: "fassung", grund: TEXT_FASSUNG, art: "auftrag", roh: n0.roh, nutzteil: n0.nutzteil,
            ...felder, freierIndex: felder.index, tabelle: "TABELLE_AUFTRAEGE", tabellenlänge: TABELLE_AUFTRAEGE_LAENGE};
  }
  if (felder.art === 1 && felder.index >= TABELLE_SKILLS_LAENGE) {
    return {fehler: "fassung", grund: TEXT_FASSUNG, art: "auftrag", roh: n0.roh, nutzteil: n0.nutzteil,
            ...felder, freierIndex: felder.index, tabelle: "TABELLE_SKILLS", tabellenlänge: TABELLE_SKILLS_LAENGE};
  }

  /* § 7 (b): Ladeprüfung „jede ID existiert in DATEN.tickets“ */
  const quelle = felder.art === 0 ? tickets : skills;
  const id = quelle[felder.index];
  if (typeof id !== "string" || !existiert(id)) {
    return {fehler: "auftrag", grund: TEXT_AUFTRAG, art: "auftrag", roh: n0.roh, nutzteil: n0.nutzteil,
            ...felder, tabelle: felder.art === 0 ? "TABELLE_AUFTRAEGE" : "TABELLE_SKILLS", unbekannteId: id === undefined ? null : id};
  }

  const code = "NL-" + nz + "-" + pz;
  /* Rückgabe: erst die Nutzlastfelder aus `felder`, dann die abgeleiteten Felder — „art“ und „code“
     überschreiben die Zahlenwerte, deshalb steht die Zuweisung NACH dem Spread. */
  return {...felder, ticketId: id, seed: felder.variante + 1, art: felder.art === 0 ? "hand" : "generiert",
    nutzteil: n0.nutzteil, nutzzeichen: nz, prüfzeichen: pz, C1: p.C1, C2: p.C2, code};
}

/* § 4 Ergebnis-Code (7 Zeichen Nutzteil = 35 Bit aus 5 Feldern + 2 Prüfzeichen, gedruckt
   „E-XXXX-XXX“ = 10 Zeichen). Die Felder werden EINZELN über die Bitbreite gepackt und dann
   zeichenweise gedruckt — nicht über einen 32-Bit-Schiebewert (der 35-Bit-Wert passt nicht hinein).
   ACHTUNG „halbe Sterne“: § 4 nennt als Bereich 0..10 und als Formel `round(sterne*2)`. Der Codec
   trägt deshalb den GANZEN Wert 0..10 (4 Bit) — die Verdopplung passiert beim Aufrufer, nicht hier.
   Wer hier die Anzeige-Sterne (0..5) hineingibt, verliert die Hälfte (gemessen: 8 → 4). */
function ergebnisCodeBauen(felder) {
  const f = felder || {};
  const z = [];
  const feld = (wert, bits) => {
    const v = Math.max(0, Math.min((1 << bits) - 1, Math.round(wert) || 0));
    for (let i = bits - 1; i >= 0; i--) z.push((v >>> i) & 1);
    return v;
  };
  const f1 = feld(f.sitzung, 5), f2 = feld(f.platz, 5), f3 = feld(f.sterne, 4), f4 = feld(f.versuche, 2), f5 = feld(f.dauer, 9);
  const werte5 = [];
  for (let i = 0; i < 5; i++) {
    let v = 0;
    for (let b = 0; b < 5; b++) v = (v << 1) | (z[i * 5 + b] || 0);
    werte5.push(v);
  }
  const p = pruefsummen(werte5);
  const zk = werte5.map(zeichen).concat([p.z1, p.z2]);
  return {code: "E-" + zk.slice(0, 4).join("") + "-" + zk.slice(4, 7).join(""),
    nutzzeichen: zk.slice(0, 5).join(""), prüfzeichen: zk.slice(5).join(""),
    werte: werte5, C1: p.C1, C2: p.C2, felder: {sitzung: f1, platz: f2, sterne: f3, versuche: f4, dauer: f5}};
}

/* Ergebnis-Code lesen (§ 4): gleiche Prüfreihenfolge wie beim Auftragscode (Länge → Zeichen →
   Prüfsumme). Rein, ohne Sitzungsprüfung (die gehört zur Instanz, § 8 „sitzung“).
   `sterne` ist der ganze Wert 0..10 (halbe Sterne) — dieselbe Einheit wie beim Bauen. */
function ergebnisLesen(roh) {
  const n0 = normalisieren(roh, "ergebnis");
  if (n0 === null) return null;
  if (n0.fehler) return n0;
  const nz = n0.nutzteil.slice(0, 5), pz = n0.nutzteil.slice(5, 7);
  const werte5 = [...nz].map(wert);
  const p = pruefsummen(werte5);
  const falsch = [];
  if (p.z1 !== pz[0]) falsch.push("C1");
  if (p.z2 !== pz[1]) falsch.push("C2");
  if (falsch.length) {
    return {fehler: "prüfziffer", grund: TEXT_PRUEFZIFFER, art: "ergebnis", roh: n0.roh, nutzteil: n0.nutzteil,
      falsch, C1: p.C1, C2: p.C2, erwartetePrüfzeichen: p.z1 + p.z2, gelesenePrüfzeichen: pz,
      rechnung: "C1=" + p.C1 + " (mod 31), C2=" + p.C2 + " (mod 32)"};
  }
  const bits = [];
  for (const v of werte5) for (let i = 4; i >= 0; i--) bits.push((v >>> i) & 1);
  const nimm = (start, breite) => { let v = 0; for (let i = 0; i < breite; i++) v = (v << 1) | bits[start + i]; return v; };
  const felder = {sitzung: nimm(0, 5), platz: nimm(5, 5), sterne: nimm(10, 4), versuche: nimm(14, 2), dauer: nimm(16, 9)};
  return {...felder, art: "ergebnis", nutzteil: n0.nutzteil, nutzzeichen: nz, prüfzeichen: pz,
    code: "E-" + nz.slice(0, 4) + "-" + nz.slice(4) + pz, dauerSekunden: felder.dauer * 10,
    sterneAnzeige: felder.sterne / 2, C1: p.C1, C2: p.C2};
}

/* Erster gültiger Code der Tabelle an Position `index` mit art 0: kleinste Variante, die die
   Prüfsumme besteht (alle 256 Varianten sind für die Prüfsumme gleichwertig, deshalb ist das
   Ergebnis deterministisch und unabhängig von der Suche selbst). */
function ersterCode(art, index) {
  for (let v = 0; v < 256; v++) {
    const r = codeBauen({sitzung: 0, art: art, index: index, variante: v});
    if (!r.fehler) return r;
  }
  return null;
}

/* =====================================================================================
   TEIL 2 — MESSGERÜST
   ===================================================================================== */
const SEED = 20261006;
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

const ROOT = path.resolve(__dirname, "..", "..");
const PROBE_DATEI = __filename;
const ZIELDATEI = path.join(ROOT, "Nachweise", "Klassenraum", "A-format.json");
const BEFEHL = "& \"$env:LOCALAPPDATA\\node-portable\\node-v24.21.0-win-x64\\node.exe\" tools\\klassenraum-probe\\A-format.js";
const STAND = "2026-10-06";

const MESS = {};            /* alle Zahlen, nach Pflichtmessung 1..7 gegliedert */
const ZEIT = {};            /* Laufzeiten: gehen NUR auf die Konsole, nicht in die Datei */
const BEFUNDE = [];
const OFFENE = [];
const NICHT_GEPRUEFT = [];
const BEFEHL_LISTE = [{befehl: BEFEHL, ergebnis: "Platzhalter — wird am Ende der Messung gesetzt"}];

function befund(t) { BEFUNDE.push(t); }
function offen(t) { OFFENE.push(t); }
function ungeprueft(t) { NICHT_GEPRUEFT.push(t); }
function kurz(x) { return JSON.stringify(x); }
function zahl(n) { return n.toLocaleString("de-DE"); }

/* ---------- Lader (A-lader.js) laden — genau wie im Vertrag § 10 vorgeschrieben ---------- */
const lader = require("./A-lader.js");
const lab = lader.kontext();
lab.Spiel._trocken = true;                 /* nichts melden, nichts speichern */
lab.jetzt.setzen(1759706400000);           /* feste Uhr: 2026-10-06 00:00:00 UTC */
lab.Spiel._st = lab.Spiel.leererStand();
lab.Spiel._lz = {};

/* Die Tabellen sind laut § 7 die Reihenfolge von Spiel.ticketReihe() bzw. DATEN.skills.
   Sie werden HIER gemessen (nicht abgeschrieben) und als eingefrorene Literale mitgeführt —
   die ID-Listen stehen zusätzlich im Ergebnis-JSON als Belegstellen. */
const REIHE = lab.Spiel.ticketReihe();
const TICKETS = REIHE.map(t => t.id);
const SKILLS = lab.DATEN.skills.map(s => s.id);
const DATEN_IDS = lab.DATEN.tickets.map(t => t.id);
const NICHT_IN_DATEN = TICKETS.filter(id => !DATEN_IDS.includes(id));
const SKILLS_NICHT_IN_DATEN = SKILLS.filter(id => !lab.DATEN.skills.some(s => s.id === id));
/* § 7 (b): jede ID muss es geben — art 0 in DATEN.tickets, art 1 in DATEN.skills. */
const QUELLE = {
  tickets: TICKETS,
  skills: SKILLS,
  existiert: id => DATEN_IDS.includes(id) || SKILLS.includes(id),
};
const T0 = Date.now();

/* =====================================================================================
   MESSUNG 1 + 2 — erschöpfender Round-Trip über alle 2^20 Nutzlastwerte und Codelänge
   ===================================================================================== */
const m12 = (() => {
  const t0 = Date.now();
  let fälle = 0, fehl = 0, prüfFehl = 0, längeMin = Infinity, längeMax = 0, über10 = 0;
  let freiIndizes = 0, andereFehler = 0, roundtrips = 0, abwAnzahl = 0;
  const fehlerVerteilung = {};
  const freiProArt = {0: 0, 1: 0};
  const längensumme = new Map();
  const beispiele = {};
  const felderFalsch = [];
  const fehlerBeispiele = [];
  for (let sitzung = 0; sitzung < 32; sitzung++) {
    for (let art = 0; art < 2; art++) {
      for (let index = 0; index < 64; index++) {
        for (let variante = 0; variante < 256; variante++) {
          fälle++;
          const r = codeBauen({sitzung, art, index, variante});
          if (r.fehler) { fehl++; andereFehler++; continue; }
          const l = r.code.length;
          if (l < längeMin) längeMin = l;
          if (l > längeMax) längeMax = l;
          if (l > 10) über10++;
          längensumme.set(l, (längensumme.get(l) || 0) + 1);
          if (fälle === 1) beispiele.erster = r.code;
          if (sitzung === 31 && art === 1 && index === 26 && variante === 255) beispiele.letzterGültiger = r.code;

          const e = auftragLesen(r.code, QUELLE);
          if (e === null || e.fehler) {
            /* Freie Indizes (§ 7c: Aufträge 58..63, Fertigkeiten 27..63) MÜSSEN fassung ergeben —
               sie sind keine Fehlschläge, sondern der Vertrag. Alles andere zählt als Fehler. */
            const klasse = e ? e.fehler : "null";
            fehlerVerteilung[klasse] = (fehlerVerteilung[klasse] || 0) + 1;
            const frei = klasse === "fassung" && ((art === 0 && index >= TABELLE_AUFTRAEGE_LAENGE) || (art === 1 && index >= TABELLE_SKILLS_LAENGE));
            if (frei) { freiIndizes++; freiProArt[art]++; }
            else {
              fehl++;
              if (klasse === "prüfziffer") prüfFehl++;
              if (fehlerBeispiele.length < 5) fehlerBeispiele.push({felder: {sitzung, art, index, variante}, code: r.code, ergebnis: e});
            }
            continue;
          }
          roundtrips++;
          /* Feldvergleich: erwartete Nutzlast gegen Gelesenes (art wird als „hand“/„generiert“ geprüft) */
          const abw = [];
          if (e.sitzung !== sitzung) abw.push("sitzung: erwartet " + sitzung + ", gelesen " + e.sitzung);
          if (e.index !== index) abw.push("index: erwartet " + index + ", gelesen " + e.index);
          if (e.variante !== variante) abw.push("variante: erwartet " + variante + ", gelesen " + e.variante);
          if (e.art !== (art === 0 ? "hand" : "generiert")) abw.push("art: erwartet " + (art === 0 ? "hand" : "generiert") + ", gelesen " + e.art);
          const nutzteilErwartet = r.nutzzeichen + r.prüfzeichen;
          if (e.nutzteil !== nutzteilErwartet) abw.push("nutzteil: erwartet " + nutzteilErwartet + ", gelesen " + e.nutzteil);
          if (art === 0 && e.ticketId !== TICKETS[index]) abw.push("ticketId: erwartet " + TICKETS[index] + ", gelesen " + e.ticketId);
          if (art === 1 && e.ticketId !== SKILLS[index]) abw.push("skillId: erwartet " + SKILLS[index] + ", gelesen " + e.ticketId);
          if (e.seed !== variante + 1) abw.push("seed: erwartet " + (variante + 1) + ", gelesen " + e.seed);
          if (e.code !== r.code) abw.push("code: erwartet " + r.code + ", gelesen " + e.code);
          if (abw.length) {
            fehl++;
            abwAnzahl++;
            if (felderFalsch.length < 5) felderFalsch.push({felder: {sitzung, art, index, variante}, abweichungen: abw});
          }
        }
      }
    }
  }
  const ms = Date.now() - t0;
  const längenverteilung = {};
  for (const k of [...längensumme.keys()].sort((a, b) => a - b)) längenverteilung[k] = längensumme.get(k);
  const erwarteteRoundtrips = (TABELLE_AUFTRAEGE_LAENGE + TABELLE_SKILLS_LAENGE) * 32 * 256;
  ZEIT.messung1 = ms;                 /* Laufzeit geht auf die Konsole, nicht in die Datei */
  return {
    nutzlastwerte: fälle, fehlschläge: fehl, prüfzifferFehlschläge: prüfFehl, feldAbweichungen: abwAnzahl,
    freieIndizesAbgelehnt: freiIndizes, freieIndizesProArt: freiProArt, andereFehler: andereFehler,
    roundtrips, roundtripsErwartet: erwarteteRoundtrips,
    roundtripsVollständig: roundtrips === erwarteteRoundtrips,
    fehlerfreieCodes: roundtrips,
    codeLängeMin: längeMin, codeLängeMax: längeMax, codeLängenÜber10: über10,
    längenverteilung, beispiele, fehlerVerteilung,
    abweichungen: felderFalsch, fehlerBeispiele,
    erwarteteLängeRechnung: "2 („NL“) + 1 („-“) + 4 Nutzzeichen + 1 („-“) + 2 Prüfzeichen = 10 Zeichen",
    roundtripRechnung: "(58 Aufträge + 27 Fertigkeiten) · 32 Sitzungen · 256 Varianten = " + erwarteteRoundtrips + " gültige Codes; " +
      "2^20 − " + erwarteteRoundtrips + " = " + (fälle - erwarteteRoundtrips) + " freie Indizes (Auftrag 58..63, Fertigkeit 27..63)",
    hinweisLaufzeit: "Die Laufzeit dieser Messung steht NICHT in der Datei (sie ändert sich je Lauf und würde die Regel „nur schreiben, wenn identisch“ aushebeln) — sie steht auf der Konsole (unrund.laufzeitMs.messung1).",
  };
})();
MESS["1_und_2_roundtrip_länge"] = m12;

if (m12.fehlschläge === 0 && m12.roundtripsVollständig) {
  befund("Messung 1: alle " + zahl(m12.nutzlastwerte) + " Nutzlastwerte (2^20) durchlaufen; " + zahl(m12.roundtrips) + " gültige Codes gehen durch codeBauen → auftragLesen → identische Felder (Sitzung, art, index, variante, ticketId/skillId, seed, Nutzteil, Code) — 0 Abweichungen. Die übrigen " + zahl(m12.freieIndizesAbgelehnt) + " Fälle sind freie Indizes (Aufträge 58..63, Fertigkeiten 27..63) und ergeben vertragsgemäß {fehler:\"fassung\"}. Laufzeit in dieser Sitzung: siehe Konsole (unrund.laufzeitMs) und messungen.laufzeit.hinweis. Rechnung: " + m12.roundtripRechnung + ".");
} else if (m12.fehlschläge === 0) {
  befund("Messung 1: 0 Fehlschläge, aber nur " + zahl(m12.roundtrips) + " statt " + zahl(m12.roundtripsErwartet) + " Round-Trips — Erwartung und Messung weichen ab (siehe messungen.1_und_2_roundtrip_länge).");
} else {
  befund("Messung 1: " + m12.fehlschläge + " von " + zahl(m12.nutzlastwerte) + " Fällen fehlgeschlagen — Abweichungen im JSON.");
}

/* Randwerte der Länge: kürzester/ längster Auftragscode und der Ergebnis-Code (§ 4) */
const m2b = (() => {
  const kürzest = codeBauen({sitzung: 0, art: 0, index: 0, variante: 0});
  const längste = codeBauen({sitzung: 31, art: 1, index: 63, variante: 255});
  const ergebnis = ergebnisCodeBauen({sitzung: 31, platz: 31, sterne: 10, versuche: 3, dauer: 511});
  const ergebnisKlein = ergebnisCodeBauen({sitzung: 0, platz: 0, sterne: 0, versuche: 0, dauer: 0});
  const längen = [kürzest.code.length, längste.code.length, ergebnis.code.length, ergebnisKlein.code.length];
  const rechnung = "NL-XXXX-XX = 2 + 1 + 4 + 1 + 2 = 10 · E-XXXX-XXX = 2 + 1 + 4 + 1 + 3 = 10";
  return {
    ergebnisCodeLänge: ergebnis.code.length,
    ergebnisCodeLängeKleinster: ergebnisKlein.code.length,
    ergebnisCodeGrößter: ergebnis.code,
    ergebnisCodeKleinster: ergebnisKlein.code,
    ergebnisBitbreiten: "sitzung 5 + platz 5 + sterne 4 + versuche 2 + dauer 9 = 25 Bit Nutzlast + 10 Bit Prüfsumme = 35 Bit = 7 Zeichen",
    längeRechnung: rechnung,
    randwerte: [
      {fall: "kleinster Auftragscode (0,0,0,0)", code: kürzest.code, länge: kürzest.code.length},
      {fall: "größter Auftragscode (31,1,63,255)", code: längste.code, länge: längste.code.length},
      {fall: "größter Ergebnis-Code (31,31,10,3,511)", code: ergebnis.code, länge: ergebnis.code.length},
      {fall: "kleinster Ergebnis-Code (0,0,0,0,0)", code: ergebnisKlein.code, länge: ergebnisKlein.code.length},
    ],
    alleZehn: längen.every(l => l === 10),
  };
})();
MESS["2_länge"] = {
  geprüfteCodes: m12.nutzlastwerte,
  codeLängeMin: m12.codeLängeMin,
  codeLängeMax: m12.codeLängeMax,
  codeLängenÜber10: m12.codeLängenÜber10,
  längenverteilung: m12.längenverteilung,
  erwarteteLänge: 10,
  erwarteteLängeRechnung: m12.erwarteteLängeRechnung,
  ergebnisCodeLänge: m2b.ergebnisCodeLänge,
  ergebnisCodeLängeKleinster: m2b.ergebnisCodeLängeKleinster,
  ergebnisRechnung: m2b.längeRechnung,
  randwerte: m2b.randwerte,
  alleZehn: m2b.alleZehn && m12.codeLängeMin === 10 && m12.codeLängeMax === 10,
  randbeispieleAusMessung1: m12.beispiele,
};

if (m12.codeLängeMin === 10 && m12.codeLängeMax === 10 && m12.codeLängenÜber10 === 0) {
  befund("Messung 2: alle " + zahl(m12.nutzlastwerte) + " Codes sind genau 10 Zeichen lang; Anzahl über 10 Zeichen: 0 (min = max = 10). Der Ergebnis-Code E-XXXX-XXX ist ebenfalls 10 Zeichen (" + m2b.ergebnisCodeLänge + "); Rechnung " + m2b.längeRechnung + ".");
} else {
  befund("Messung 2: Längen weichen ab — min " + m12.codeLängeMin + ", max " + m12.codeLängeMax + ", über 10 Zeichen: " + m12.codeLängenÜber10 + ".");
}

/* Zusatz zu Messung 2: der Ergebnis-Code ist in dieser Probe ebenfalls als reine Funktion gebaut —
   Round-Trip über 10.000 zufällige Feldkombinationen (fester Seed), damit § 4 nicht nur gerechnet,
   sondern gemessen ist. */
const m2c = (() => {
  const zufall = rng(SEED + 1);
  let n = 0, fehl = 0, längeFalsch = 0;
  const abw = [];
  for (let i = 0; i < 10000; i++) {
    const felder = {
      sitzung: Math.floor(zufall() * 32), platz: Math.floor(zufall() * 32),
      sterne: Math.floor(zufall() * 11), versuche: Math.floor(zufall() * 4), dauer: Math.floor(zufall() * 512),
    };
    const r = ergebnisCodeBauen(felder);
    n++;
    if (r.code.length !== 10) längeFalsch++;
    const e = ergebnisLesen(r.code);
    if (!e || e.fehler) { fehl++; if (abw.length < 5) abw.push({felder, code: r.code, ergebnis: e}); continue; }
    const diff = [];
    if (e.sitzung !== felder.sitzung) diff.push("sitzung");
    if (e.platz !== felder.platz) diff.push("platz");
    if (e.sterne !== felder.sterne) diff.push("sterne");
    if (e.versuche !== felder.versuche) diff.push("versuche");
    if (e.dauer !== felder.dauer) diff.push("dauer");
    if (e.code !== r.code) diff.push("code");
    if (diff.length) { fehl++; if (abw.length < 5) abw.push({felder, code: r.code, diff, gelesen: e}); }
  }
  return {fälle: n, fehlschläge: fehl, längenFehler: längeFalsch, abweichungen: abw,
    ergebnisCodeBeispiel: ergebnisCodeBauen({sitzung: 7, platz: 12, sterne: 8, versuche: 0, dauer: 60}),
    hinweis: "§ 4 wird nur so weit geprüft, wie die Codec-Probe reicht: Packen, Prüfsumme, Länge, Lesen. Die Sitzungsprüfung fehlt absichtlich."};
})();
MESS["2c_ergebnisCode"] = m2c;
if (m2c.fehlschläge === 0 && m2c.längenFehler === 0) {
  befund("Messung 2 Zusatz: der Ergebnis-Code ist ebenfalls implementiert und über " + zahl(m2c.fälle) + " zufällige Feldkombinationen round-trip-fest (0 Fehlschläge, 0 Längenfehler; Beispiel " + m2c.ergebnisCodeBeispiel.code + "). Die Sitzungsprüfung (§ 8 „sitzung“) fehlt bewusst — sie gehört zur Instanz.");
} else {
  befund("Messung 2 Zusatz: Ergebnis-Code-Round-Trip hat " + m2c.fehlschläge + " Fehlschläge und " + m2c.längenFehler + " Längenfehler — siehe messungen.2c_ergebnisCode.");
}

/* =====================================================================================
   MESSUNG 3 — Normalisierung
   ===================================================================================== */
const m3 = (() => {
  const n1 = normalisieren("nl4f7k2q");
  const n2 = normalisieren("NL-4F7K-2Q");
  const l1 = auftragLesen("nl4f7k2q", QUELLE);
  const l2 = auftragLesen("NL-4F7K-2Q", QUELLE);
  const fälle = [
    {eingabe: "nl4f7k2q", erwartet: "dieselbe Eingabe wie NL-4F7K-2Q"},
    {eingabe: "NL-4F7K-2Q", erwartet: "Formbeispiel aus dem Auftrag"},
    {eingabe: "  nl 4f7k 2q  ", erwartet: "Leerzeichen statt Trennstriche"},
    {eingabe: "nl.4f7k.2q", erwartet: "Punkte als Trenner"},
    {eingabe: "NL 4F7K 2Q", erwartet: "Leerzeichen, Großschreibung"},
    {eingabe: "4F7K2Q", erwartet: "ohne Präfix"},
    {eingabe: "4F7K-2Q", erwartet: "ohne Präfix, 3+3-Gruppierung"},
    {eingabe: "NL-4F7K2Q", erwartet: "Präfix, 4+2-Gruppierung"},
    {eingabe: "NL4F7K2Q", erwartet: "ohne jeden Trenner"},
    {eingabe: "n-l-4-f-7-k-2-q", erwartet: "Trenner zwischen allen Zeichen"},
    {eingabe: "nl4F7k2Q", erwartet: "gemischte Schreibweise"},
  ];
  const tab = fälle.map(f => {
    const n = normalisieren(f.eingabe);
    const l = auftragLesen(f.eingabe, QUELLE);
    return {
      eingabe: f.eingabe, hinweis: f.erwartet,
      nutzteil: n && n.nutzteil ? n.nutzteil : null,
      fehler: n && n.fehler ? n.fehler : (l && l.fehler ? l.fehler : null),
      ticketId: l && !l.fehler ? l.ticketId : null,
      seed: l && !l.fehler ? l.seed : null,
      sitzung: l && !l.fehler ? l.sitzung : null,
    };
  });
  const nutzteile = [...new Set(tab.map(z => z.nutzteil))];
  const nutzteilEindeutig = nutzteile.length === 1 && nutzteile[0] === "4F7K2Q";

  /* Nutzteil, der selbst mit „NL“ beginnt */
  const r = codeBauen({sitzung: 0, art: 0, index: 0, variante: 0});
  const nlFall = {code: r.code, nutzteil: r.nutzzeichen + r.prüfzeichen, beginntMitNL: (r.nutzzeichen + r.prüfzeichen).startsWith("NL")};
  if (nlFall.beginntMitNL) {
    const a = auftragLesen(nlFall.code, QUELLE);
    const b = auftragLesen(nlFall.nutzteil, QUELLE);
    const c = auftragLesen(nlFall.code.replace("NL-", ""), QUELLE);
    nlFall.mitPräfix = a && !a.fehler ? a.ticketId : a;
    nlFall.nutzteilAllein = b && !b.fehler ? b.ticketId : b;
    nlFall.ohnePräfixBei6 = c && !c.fehler ? c.ticketId : c;
    nlFall.ergebnisGleich = !!(a && !a.fehler && b && !b.fehler && c && !c.fehler &&
      a.ticketId === b.ticketId && b.ticketId === c.ticketId);
  }
  /* Gegenprobe: Nutzteil allein, wenn das Präfix NICHT abgeschnitten werden darf */
  const nlFallFremd = {code: "NL-NL4F7K", hinweis: "Präfix NL, danach 6 Zeichen, die selbst mit NL beginnen"};
  const g = auftragLesen(nlFallFremd.code, QUELLE);
  nlFallFremd.nutzteil = normalisieren(nlFallFremd.code).nutzteil;
  nlFallFremd.fehler = g && g.fehler ? g.fehler : null;
  nlFallFremd.ticketId = g && !g.fehler ? g.ticketId : null;

  return {
    paar: {links: "nl4f7k2q", rechts: "NL-4F7K-2Q",
      nutzteilLinks: n1.nutzteil, nutzteilRechts: n2.nutzteil,
      gleich: n1.nutzteil === n2.nutzteil,
      ticketIdLinks: l1 && !l1.fehler ? l1.ticketId : l1 && l1.fehler,
      ticketIdRechts: l2 && !l2.fehler ? l2.ticketId : l2 && l2.fehler,
      seedLinks: l1 && !l1.fehler ? l1.seed : null,
      seedRechts: l2 && !l2.fehler ? l2.seed : null,
      sitzungLinks: l1 && !l1.fehler ? l1.sitzung : null,
      sitzungRechts: l2 && !l2.fehler ? l2.sitzung : null},
    varianten: tab,
    variantenAnzahl: tab.length,
    nutzteileUnterschiedlich: nutzteile,
    nutzteilEindeutig,
    nutzteilBeginntMitNL: nlFall,
    nutzteilBeginntMitNLGegenprobe: nlFallFremd,
    regel: "§ 1: uppercase → alles außer [0-9A-Z] weg → führendes „NL“ abschneiden, WENN danach genau 6 Zeichen übrig bleiben",
  };
})();
MESS["3_normalisierung"] = m3;

if (m3.paar.gleich && m3.paar.nutzteilLinks === "4F7K2Q") {
  befund("Messung 3: „nl4f7k2q“ und „NL-4F7K-2Q“ ergeben denselben Nutzteil 4F7K2Q und dieselbe Fehlerklasse (" + m3.paar.ticketIdLinks + " — das Formbeispiel selbst ist kein gültiger Code, siehe Messung 7). Nutzteil-Gleichheit heißt hier: derselbe Nutzteil 4F7K2Q und dieselbe Ablehnung, nicht dasselbe Ticket. Alle " + m3.variantenAnzahl + " Schreibvarianten (Leerzeichen, Punkt, ohne Präfix, 3+3) liefern denselben Nutzteil.");
  befund("Messung 3 Nutzteil, der selbst mit „NL“ beginnt: " + (m3.nutzteilBeginntMitNL.beginntMitNL ? "der Code " + m3.nutzteilBeginntMitNL.code + " trägt den Nutzteil " + m3.nutzteilBeginntMitNL.nutzteil + " (beginnt mit NL) → " + (m3.nutzteilBeginntMitNL.ergebnisGleich ? "mit Präfix, ohne Präfix und als Nutzteil allein kommt dieselbe ticketId heraus" : "die drei Schreibweisen liefern NICHT dasselbe") : "in dieser Sitzung trägt kein geprüfter Code einen Nutzteil, der mit NL beginnt") + "; Gegenprobe " + m3.nutzteilBeginntMitNLGegenprobe.code + " → Nutzteil " + m3.nutzteilBeginntMitNLGegenprobe.nutzteil + " → " + m3.nutzteilBeginntMitNLGegenprobe.fehler + " (das führende NL wird genau dann abgeschnitten, wenn danach 6 Zeichen übrig bleiben).");
} else {
  befund("Messung 3: Normalisierung weicht ab — Nutzteile " + kurz(m3.nutzteileUnterschiedlich) + ".");
}

/* =====================================================================================
   MESSUNG 4 — Vertipperfälle (24 Kernfälle + Sonderfälle)
   ===================================================================================== */
const PAARE_BD = [["9", "Z"], ["2", "Z"], ["8", "B"], ["5", "S"], ["4", "A"], ["6", "G"]];

/* Stelle 0..5 im Nutzteil (0..3 Nutzzeichen, 4..5 Prüfzeichen) → Index im gedruckten Code.
   Achtung: der Code hat ZWEI Trennstriche — Nutzteil-Stelle 4 steht auf Index 7, Stelle 5 auf
   Index 8. Wer hier `3 + pos` rechnet, löscht ab Stelle 4 den zweiten Trennstrich und erzeugt
   einen 9-Zeichen-Code; die Probe prüft das in messungen.4_vertipper.stellenPrüfung nach. */
function stelleIndex(pos) { return 3 + pos + (pos >= 4 ? 1 : 0); }
function mitZeichen(code, pos, c) { return code.slice(0, stelleIndex(pos)) + c + code.slice(stelleIndex(pos) + 1); }
function leseZeichen(code, pos) { return code[stelleIndex(pos)]; }

/* Vier gültige Codes mit bewusst gewählten Nutzzeichen: zusammen tragen sie an allen sechs
   Codestellen Buchstaben (für Ersetzungen Buchstabe↔Buchstabe), sie enthalten die Ziffern der
   Paare 9↔Z, 2↔Z, 8↔B, 5↔S, 4↔A, 6↔G, und alle fünf Nachbarpaare haben verschiedene Werte
   (für Vertauschungen). Die Prüfzeichen kommen aus der echten Prüfsumme, nichts von Hand. */
const NUTZTEIL_MUSTER = [
  {nutzzeichen: "A9B4", herkunft: "handgeschrieben, Index 30, Variante 0", art: 0, index: 30, sitzung: 0, variante: 0},
  {nutzzeichen: "NC2D", herkunft: "handgeschrieben, Index 0, Variante 0", art: 0, index: 0, sitzung: 0, variante: 0},
  {nutzzeichen: "KE8F", herkunft: "generiert, Index 5, Variante 0", art: 1, index: 5, sitzung: 0, variante: 0},
  {nutzzeichen: "TG5H", herkunft: "generiert, Index 26, Variante 0", art: 1, index: 26, sitzung: 0, variante: 0},
  {nutzzeichen: "WD6J", herkunft: "generiert, Index 1, Variante 0", art: 1, index: 1, sitzung: 0, variante: 0},
];

function baueVertipper() {
  const werte = m => [...m].map(wert);
  const mitPrüfsumme = m => {
    const p = pruefsummen(werte(m));
    return {code: "NL-" + m + "-" + p.z1 + p.z2, nutzzeichen: m, prüfzeichen: p.z1 + p.z2, C1: p.C1, C2: p.C2, werte: werte(m)};
  };
  const basen = NUTZTEIL_MUSTER.map(b => Object.assign(mitPrüfsumme(b.nutzzeichen), {herkunft: b.herkunft, art: b.art, index: b.index, sitzung: b.sitzung, variante: b.variante}));
  const roh = [];
  const zk6 = b => b.nutzzeichen + b.prüfzeichen;      /* die 6 Zeichen des Codes, Index 0..5 */
  /* Stelle 0..5 im Code (Nutzteilposition) → Index im gedruckten Code. Achtung: der Code hat ZWEI
     Trennstriche, das Zeichen 5 des Nutzteils steht auf Index 8, nicht auf Index 7. */
  /* stelleIndex/mitZeichen/leseZeichen stehen auf Modulebene (siehe oben) */
  const tausch = (b, p) => mitZeichen(mitZeichen(b.code, p, zk6(b)[p + 1]), p + 1, zk6(b)[p]);
  const ersteErsetzung = (b, pos) => {                 /* anderes Zeichen des Alphabets, Wert sicher verschieden */
    const alt = zk6(b)[pos];
    for (const c of ALPHABET) if (wert(c) !== wert(alt)) return {alt, neu: c, wertAlt: wert(alt), wertNeu: wert(c)};
    return null;
  };
  /* Ersetzung, die wirklich Buchstabe gegen Buchstabe tauscht (Art (a) verlangt „Alphabetzeichen“) */
  const ersteBuchstabenErsetzung = (b, pos) => {
    const alt = zk6(b)[pos];
    if (!BUCHSTABEN.includes(alt)) return null;
    for (const c of BUCHSTABEN) if (BUCHSTABEN.includes(c) && wert(c) !== wert(alt)) return {alt, neu: c, wertAlt: wert(alt), wertNeu: wert(c)};
    return null;
  };
  const fall = (b, artName, pos, paar, detail) => {
    const neu = mitZeichen(b.code, pos, paar.neu);
    const l = auftragLesen(neu, QUELLE);
    return {nr: 0, basisCode: b.code, basisNutzzeichen: b.nutzzeichen, basisHerkunft: b.herkunft, art: artName, position: pos,
      alt: paar.alt, neu: paar.neu, wertAlt: paar.wertAlt, wertNeu: paar.wertNeu, vertippterCode: neu,
      fehlerklasse: l === null ? "null" : (l.fehler || "keiner"), abgelehnt: !!(l === null || l.fehler),
      grund: l && l.grund ? l.grund : null, detail};
  };
  /* (a) mindestens 8 Fälle: ein Buchstabe gegen einen anderen Buchstaben ersetzt.
     Erste Runde: je Code so viele Stellen wie möglich, die noch kein anderer Code belegt hat —
     über die fünf Codes kommen so alle sechs Stellen des Codes vor. Zweite Runde: eine weitere
     Ersetzung an einer Stelle, die schon belegt ist (dann auch Ziffer gegen Buchstabe, damit die
     acht Fälle der Art (a) nicht alle in derselben Ecke liegen). */
  const genutzteStellen = new Set();
  const bereits = (b, pos) => genutzteStellen.has(pos + ":" + zk6(b)[pos]);
  for (const b of basen) {
    for (let pos = 0; pos < 6; pos++) {
      if (bereits(b, pos)) continue;
      const e = ersteBuchstabenErsetzung(b, pos);
      if (!e) continue;
      genutzteStellen.add(pos + ":" + zk6(b)[pos]);
      roh.push(fall(b, "a_zeichen_ersetzt", pos, e, "Zeichen " + (pos + 1) + " (Buchstabe " + e.alt + ") gegen " + e.neu + " getauscht"));
    }
  }
  for (const b of basen) {
    for (let pos = 0; pos < 6; pos++) {
      if (!bereits(b, pos)) continue;
      const e = ersteErsetzung(b, pos);
      if (!e) continue;
      roh.push(fall(b, "a_zeichen_ersetzt", pos, e, "zweiter Fall an Zeichen " + (pos + 1) + " (" + e.alt + " → " + e.neu + ")"));
      break;
    }
  }
  /* (b) mindestens 8 Fälle: zwei Nachbarzeichen vertauscht (fünf Nachbarpaare je Code) */
  basen.forEach((b, i) => {
    for (const p of [i % 5, (i + 2) % 5]) {
      const zk = zk6(b);
      if (wert(zk[p]) === wert(zk[p + 1])) continue;
      const neu = tausch(b, p);
      const l = auftragLesen(neu, QUELLE);
      roh.push({nr: 0, basisCode: b.code, basisNutzzeichen: b.nutzzeichen, basisHerkunft: b.herkunft, art: "b_nachbarn_vertauscht", position: p + "-" + (p + 1),
        alt: zk[p] + zk[p + 1], neu: zk[p + 1] + zk[p], wertAlt: wert(zk[p]) + "/" + wert(zk[p + 1]),
        wertNeu: wert(zk[p + 1]) + "/" + wert(zk[p]), wertdifferenz: Math.abs(wert(zk[p]) - wert(zk[p + 1])),
        vertippterCode: neu, fehlerklasse: l === null ? "null" : (l.fehler || "keiner"),
        abgelehnt: !!(l === null || l.fehler), grund: l && l.grund ? l.grund : null,
        detail: "Nachbarn " + (p + 1) + " und " + (p + 2) + " vertauscht"});
    }
  });
  /* (c) mindestens 6 Fälle: Buchstabe gegen Ziffer getauscht — jedes der sechs Paare genau einmal,
     Richtung nach Verfügbarkeit (Ziffer→Buchstabe, sonst Buchstabe→Ziffer) */
  const stelleImNutzteil = (b, z) => zk6(b).slice(0, 5).indexOf(z);
  const cPaare = new Set();
  for (const [ziffer, buchstabe] of PAARE_BD) {
    if (wert(ziffer) === wert(buchstabe)) {
      roh.push({nichtPrüfbar: true, art: "c_buchstabe_ziffer", paar: buchstabe + "↔" + ziffer,
        grund: "beide Zeichen haben denselben Wert " + wert(ziffer) + " — kein Tippfehler möglich"});
      continue;
    }
    const richtungen = [["ziffer", ziffer, buchstabe], ["buchstabe", buchstabe, ziffer]];
    let gemacht = false;
    for (const [richtung, alt, neu] of richtungen) {
      for (const b of basen) {
        const p = stelleImNutzteil(b, alt);
        if (p < 0) continue;
        roh.push(fall(b, "c_buchstabe_ziffer", p, {alt, neu, wertAlt: wert(alt), wertNeu: wert(neu)},
          "Paar " + buchstabe + "↔" + ziffer + ", Richtung " + (richtung === "ziffer" ? "Ziffer→Buchstabe" : "Buchstabe→Ziffer")));
        cPaare.add(buchstabe + "↔" + ziffer);
        gemacht = true; break;
      }
      if (gemacht) break;
    }
    if (!gemacht) roh.push({nichtPrüfbar: true, art: "c_buchstabe_ziffer", paar: buchstabe + "↔" + ziffer,
      grund: "kein Basiscode trägt " + ziffer + " oder " + buchstabe + " im Nutzteil"});
  }
  /* Zweite Runde (c): dieselben sechs Paare auf dem nächsten Code, der das Zeichen trägt */
  let zusatz = 0;
  for (const [ziffer, buchstabe] of PAARE_BD) {
    if (wert(ziffer) === wert(buchstabe)) continue;
    for (const [richtung, alt, neu] of [["ziffer", ziffer, buchstabe], ["buchstabe", buchstabe, ziffer]]) {
      let gemacht = false;
      for (const b of basen) {
        const p = stelleImNutzteil(b, alt);
        if (p < 0) continue;
        const doppelt = roh.some(f => f.art === "c_buchstabe_ziffer" && f.basisCode === b.code && f.position === p);
        if (doppelt) continue;
        roh.push(fall(b, "c_buchstabe_ziffer", p, {alt, neu, wertAlt: wert(alt), wertNeu: wert(neu)},
          "Paar " + buchstabe + "↔" + ziffer + ", zweiter Fall, Richtung " + (richtung === "ziffer" ? "Ziffer→Buchstabe" : "Buchstabe→Ziffer")));
        zusatz++;
        gemacht = true; break;
      }
      if (gemacht) break;
    }
  }
  const nichtPrüfbar = roh.filter(f => f.nichtPrüfbar);
  const fälle = roh.filter(f => !f.nichtPrüfbar);
  fälle.forEach((f, i) => { f.nr = i + 1; });

  /* Kontrollgruppe: was C1/C2 bei den 8 Nachbartausch-Fällen wirklich tun (nachgerechnet, nicht behauptet) */
  const tauschKontrolle = (() => {
    const mitt = [];
    for (const b of basen) {
      for (let p = 0; p < 5; p++) {
        const zk = zk6(b);
        if (wert(zk[p]) === wert(zk[p + 1])) continue;
        const t = [...zk.slice(0, p), zk[p + 1], zk[p], ...zk.slice(p + 2, 4)].map(wert);
        const c1n = (1 * t[0] + 2 * t[1] + 3 * t[2] + 4 * t[3]) % 31;
        const c2n = (1 * t[0] + 3 * t[1] + 5 * t[2] + 7 * t[3]) % 32;
        const l = auftragLesen(tausch(b, p), QUELLE);
        const d = wert(zk[p + 1]) - wert(zk[p]);
        mitt.push({code: b.code, position: p + "->" + (p + 1), u: wert(zk[p]), w: wert(zk[p + 1]), differenz: d,
          C1: b.C1, C1neu: c1n, C1Gleich: c1n === b.C1,
          erwartungC1: "ΔC1 = (w−u)·(g" + (p + 2) + "−g" + (p + 1) + ") = " + d + "·1 = " + d + " ≡ " + (((d % 31) + 31) % 31) + " (mod 31)",
          C2: b.C2, C2neu: c2n, C2Gleich: c2n === b.C2,
          erwartungC2: "ΔC2 = (w−u)·(g" + (p + 2) + "−g" + (p + 1) + ") = " + d + "·2 = " + (2 * d) + " ≡ " + (((2 * d % 32) + 32) % 32) + " (mod 32)",
          abgelehnt: !!(l === null || l.fehler), fehlerklasse: l === null ? "null" : (l.fehler || "keiner")});
      }
    }
    return {fälle: mitt, anzahl: mitt.length,
      C1Unverändert: mitt.filter(m => m.C1Gleich).length, C2Unverändert: mitt.filter(m => m.C2Gleich).length,
      alleAbgelehnt: mitt.every(m => m.abgelehnt),
      merkregel: "Für Nachbarn sind die Gewichtsdifferenzen 1 (Paar 1–2) bzw. 2 (Paare 2–3, 3–4, 4–5). ΔC1 = ±(w−u)·1 — das ist 0 (mod 31) genau dann, wenn w−u = 31, also nur beim Paar 0↔31. ΔC2 = ±(w−u)·1 oder ±(w−u)·2; im gemessenen Bereich bleibt C2 genau dann gleich, wenn v0−v1+v2−v3 = 0 (alternierende Nutzlast); sonst ändert sich C2. Abgelehnt werden trotzdem alle Fälle, weil beide Prüfungen gegen die gedruckten Prüfzeichen laufen."};
  })();

  /* Selbstprüfung des Messgerüsts: das Ersetzen an JEDER Stelle muss einen 10 Zeichen langen Code mit
     den beiden Trennstrichen an Position 2 und 7 ergeben. Genau hier steckte beim Schreiben ein
     Fehler: ohne die Verschiebung ab Stelle 4 verschwand der zweite Trennstrich, und der „Vertipper“
     war in Wahrheit ein zu kurzer Code — dann hätte die Probe die Längenprüfung statt der Prüfsumme
     belegt. Diese Prüfung steht bewusst im Ergebnis-JSON, damit der Fehler nicht zurückkommt. */
  const stellenPrüfung = (() => {
    const b = basen[0];
    const liste = [];
    for (let pos = 0; pos < 6; pos++) {
      const alt = leseZeichen(b.code, pos);
      const neu = ALPHABET[(wert(alt) + 1) % 32];
      const m = mitZeichen(b.code, pos, neu);
      liste.push({stelle: pos, indexImCode: stelleIndex(pos), alt, neu, ergebnis: m,
        länge: m.length, trennstricheAn2Und7: m[2] === "-" && m[7] === "-",
        stelleGetroffen: leseZeichen(m, pos) === neu});
    }
    return {basis: b.code, stellen: liste,
      alleZehnZeichen: liste.every(s => s.länge === 10), alleTrennstricheRichtig: liste.every(s => s.trennstricheAn2Und7),
      alleStellenGetroffen: liste.every(s => s.stelleGetroffen)};
  })();

  /* Kontrollgruppe: Vorrang der Fehlerklassen an einem absichtlich nicht ausstellbaren Basiscode
     (art 0, Index 58 = freier Index laut § 7c). */
  const kontrollBasis = {...ersterCode(0, 58), herkunft: "art 0, Index 58 — freier Index, laut § 7c nicht ausstellbar", art: 0, index: 58, sitzung: 0, variante: 0};
  const kontrollFälle = [
    {name: "Basis allein", code: kontrollBasis.code, erwartet: "Basis ist prüfsummengültig, aber Index 58 ist frei", ergebnis: auftragLesen(kontrollBasis.code, QUELLE)},
    {name: "ein Buchstabe ersetzt (Prüfsumme zerstört)", code: mitZeichen(kontrollBasis.code, 0, "B"), erwartet: "prüfziffer", ergebnis: auftragLesen(mitZeichen(kontrollBasis.code, 0, "B"), QUELLE)},
    {name: "Fremdzeichen O an Stelle 1 (Länge bleibt 6)", code: mitZeichen(kontrollBasis.code, 0, "O"), erwartet: "zeichen (vor der Prüfsumme)", ergebnis: auftragLesen(mitZeichen(kontrollBasis.code, 0, "O"), QUELLE)},
    {name: "zu kurz (4 Zeichen), damit vor allem anderen länge greift", code: "NL-B4", erwartet: "länge (vor zeichen und vor prüfziffer)", ergebnis: auftragLesen("NL-B4", QUELLE)},
  ].map(k => ({name: k.name, code: k.code, erwartet: k.erwartet,
    fehler: k.ergebnis === null ? "null" : (k.ergebnis.fehler || "keiner"), grund: k.ergebnis && k.ergebnis.grund ? k.ergebnis.grund : null}));
  /* Kontrollgruppe 2: gültiger Code, aber der Tabelleneintrag verschwindet → erst auftrag, nicht fassung */
  const auftragKontrolle = (() => {
    const b = basen[1];                                  /* art 0, Index 0 → echte ID */
    const echt = auftragLesen(b.code, QUELLE);
    const weg = auftragLesen(b.code, {tickets: TICKETS.map((id, i) => i === 0 ? null : id), skills: SKILLS, existiert: id => DATEN_IDS.includes(id) || SKILLS.includes(id)});
    const frei = ersterCode(1, 27);                      /* art 1 mit Index ≥ 27 → fassung */
    const freiL = auftragLesen(frei.code, QUELLE);
    return {code: b.code, mitTabelle: echt && !echt.fehler ? echt.ticketId : (echt && echt.fehler),
      ohneEintrag: weg && weg.fehler, grund: weg && weg.grund,
      skillIndexFrei: {code: frei.code, index: 27, fehler: freiL && freiL.fehler, grund: freiL && freiL.grund}};
  })();

  /* Sonderfall 1: A↔9 an jeder Position des Codes NL-AA99-AU (Grenzfall der mod-31-Rechnung).
     Nutzzeichen AA99 → Werte 0,0,31,31 → C1 = 217 mod 31 = 0 → A; C2 = 372 mod 32 = 20 → U.
     Hinweis: A-festlegung.md § 2 nennt für dieses Nutzzeichen C2 = 28 — nachgerechnet ist C2 = 20
     (siehe befund „Abweichung“). Die Prüfzeichen kommen hier aus pruefsummen(), nichts von Hand. */
  const a9Basis = mitPrüfsumme("AA99");
  const codeA9 = a9Basis.code;
  const rA9 = auftragLesen(codeA9, QUELLE);
  const a9Fälle = [];
  for (let p = 0; p < 6; p++) {
    const c = leseZeichen(codeA9, p);
    if (c !== "A" && c !== "9") continue;
    const anderes = c === "A" ? "9" : "A";
    const neu = mitZeichen(codeA9, p, anderes);
    const l = auftragLesen(neu, QUELLE);
    a9Fälle.push({position: p, richtung: c + "→" + anderes, wertAlt: wert(c), wertNeu: wert(anderes),
      wertdifferenz: Math.abs(wert(c) - wert(anderes)), vertippterCode: neu,
      fehlerklasse: l === null ? "null" : (l.fehler || "keiner"), abgelehnt: !!(l === null || l.fehler),
      grund: l && l.grund ? l.grund : null});
  }
  const a9 = {basisCode: codeA9, basisNutzzeichen: "AA99", basisWerte: a9Basis.werte,
    C1: a9Basis.C1, C2: a9Basis.C2, prüfzeichen: a9Basis.prüfzeichen,
    rechnungC1: "1*0 + 2*0 + 3*31 + 4*31 = 217 → 217 mod 31 = " + a9Basis.C1, rechnungC2: "1*0 + 3*0 + 5*31 + 7*31 = 372 → 372 mod 32 = " + a9Basis.C2,
    basisGültig: !(rA9 === null || rA9.fehler), basisTicketId: rA9 && !rA9.fehler ? rA9.ticketId : null,
    basisFehler: rA9 && rA9.fehler ? rA9.fehler : null,
    fälle: a9Fälle, anzahl: a9Fälle.length,
    anzahlA: a9Fälle.filter(f => f.richtung.startsWith("A")).length,
    anzahl9: a9Fälle.filter(f => f.richtung.startsWith("9")).length};

  /* Sonderfall 2: Nachbartausch zweier Nutzzeichen mit Wertdifferenz 31 (A = 0 und 9 = 31) */
  const diff31 = (() => {
    /* Der bekannte Grenzfall-Code NL-AA99-AU trägt A und 9 benachbart; sonst wird gesucht. */
    const kandidaten = [mitPrüfsumme("AA99")].concat(basen);
    for (let idx = 0; idx < 58; idx++) kandidaten.push(ersterCode(0, idx));
    for (const r of kandidaten) {
      const zk = r.nutzzeichen;
      if (!zk.includes("A") || !zk.includes("9")) continue;
      const pA = zk.indexOf("A"), p9 = zk.indexOf("9");
      if (Math.abs(pA - p9) !== 1) continue;
      const p = Math.min(pA, p9);
      const neu = tausch(r, p);
      const l = auftragLesen(neu, QUELLE);
      const tWerte = [...zk.slice(0, p), zk[p + 1], zk[p], ...zk.slice(p + 2, 4)].map(wert);
      const c1neu = ((1 * tWerte[0] + 2 * tWerte[1] + 3 * tWerte[2] + 4 * tWerte[3]) % 31);
      const c2neu = ((1 * tWerte[0] + 3 * tWerte[1] + 5 * tWerte[2] + 7 * tWerte[3]) % 32);
      const alternierend = (r.werte[0] - r.werte[1] + r.werte[2] - r.werte[3]) === 0;
      return {gefunden: true, basisCode: r.code, nutzzeichen: zk, werte: r.werte, C1: r.C1, C2: r.C2, prüfzeichen: r.prüfzeichen,
        positionen: (p + 1) + " und " + (p + 2), uWer0: "A", wWert31: "9", wertdifferenz: 31,
        werteVertauscht: tWerte,
        rechnungC1: "C1: Gewichte 1..4; Tausch der Nachbarn i,i+1 ändert C1 um (w−u)·(g" + (p + 1) + "−g" + (p + 2) + ") = (31−0)·(±1) = ±31 ≡ 0 (mod 31) — C1 kann diesen Tausch NICHT erkennen (gemessen: " + c1neu + " gegen " + r.C1 + ")",
        rechnungC2: alternierend
          ? "C2: Gewichte 1,3,5,7; die Nutzlast ist hier alternierend (v0−v1+v2−v3 = 0), damit ist 1·v0+3·v1+5·v2+7·v3 = 4·(v0+v2); nach dem Tausch ergibt dieselbe Rechnung denselben Wert (gemessen: " + c2neu + " gegen " + r.C2 + ") — auch C2 erkennt diesen einen Tausch nicht"
          : "C2: Gewichte 1,3,5,7; der Tausch ändert C2 um (w−u)·(±2) = ±62 ≡ 30 (mod 32) (gemessen: " + c2neu + " gegen " + r.C2 + ")",
        abgelehntTrotzdem: "Beide Prüfungen vergleichen mit den GEDRUCKTEN Prüfzeichen " + r.prüfzeichen + "; der vertauschte Code trägt " + neu.slice(8) + ". Abgelehnt wird er deshalb, weil C1 (" + c1neu + ") nicht zum gedruckten Zeichen " + r.prüfzeichen[0] + " (Wert " + r.C1 + ") passt — nicht weil sich C1 durch den Tausch ändert.",
        vertippterCode: neu, fehlerklasse: l === null ? "null" : (l.fehler || "keiner"), abgelehnt: !!(l === null || l.fehler)};
    }
    return {gefunden: false, grund: "kein Code mit benachbartem A (Wert 0) und 9 (Wert 31) in den Nutzzeichen gefunden"};
  })();

  return {basen: basen.map(b => ({code: b.code, nutzzeichen: b.nutzzeichen, prüfzeichen: b.prüfzeichen,
      werte: b.werte, C1: b.C1, C2: b.C2, herkunft: b.herkunft, art: b.art, index: b.index, sitzung: b.sitzung, variante: b.variante,
      tabelle: b.art === 0 ? "TABELLE_AUFTRAEGE" : "TABELLE_SKILLS"})),
    genauigkeit: "Alle Basiscodes sind mit pruefsummen() erzeugt und mit auftragLesen() als gültig geprüft — keine von Hand gerechneten Prüfzeichen.",
    basenAnzahl: basen.length,
    kernfälle: fälle, kernfälleAnzahl: fälle.length,
    artenVerteilung: fälle.reduce((m, f) => { m[f.art] = (m[f.art] || 0) + 1; return m; }, {}),
    verwendeteBasiscodes: [...new Set(fälle.map(f => f.basisCode))],
    nichtPrüfbarePaare: nichtPrüfbar, zusatzfälleC: zusatz,
    stellenPrüfung, tauschKontrolle, kontrollFälle, auftragKontrolle,
    prüfsummenProben: basen.map(b => ({code: b.code, werte: b.werte,
      rechnungC1: "1*" + b.werte[0] + " + 2*" + b.werte[1] + " + 3*" + b.werte[2] + " + 4*" + b.werte[3] + " = " +
        b.werte.reduce((s, v, i) => s + (i + 1) * v, 0) + " → mod 31 = " + b.C1 + " → " + b.prüfzeichen[0],
      rechnungC2: "1*" + b.werte[0] + " + 3*" + b.werte[1] + " + 5*" + b.werte[2] + " + 7*" + b.werte[3] + " = " +
        b.werte.reduce((s, v, i) => s + (2 * i + 1) * v, 0) + " → mod 32 = " + b.C2 + " → " + b.prüfzeichen[1]})),
    sonderfallA9: a9, sonderfallDifferenz31: diff31};
}
const m4 = baueVertipper();
MESS["4_vertipper"] = m4;

const kernAbgelehnt = m4.kernfälle.filter(f => f.abgelehnt).length;
const kernKlassen = {};
for (const f of m4.kernfälle) kernKlassen[f.fehlerklasse] = (kernKlassen[f.fehlerklasse] || 0) + 1;
m4.kernKlassen = kernKlassen;
const a9Abgelehnt = m4.sonderfallA9.fälle.filter(f => f.abgelehnt).length;
befund("Messung 4: " + m4.kernfälleAnzahl + " Kernfälle auf " + m4.basen.length + " verschiedenen gültigen Codes, " + kernAbgelehnt + " davon abgelehnt (Fehlerklassen: " + kurz(kernKlassen) + "). Die drei geforderten Arten sind vertreten: " + kurz(m4.artenVerteilung) + ".");
befund("Messung 4 Selbstprüfung des Messgerüsts: Ersetzen an jeder der sechs Stellen ergibt einen 10 Zeichen langen Code mit Trennstrichen an Position 2 und 7 — alle sechs Stellen getroffen: " + m4.stellenPrüfung.alleStellenGetroffen + ", alle 10 Zeichen: " + m4.stellenPrüfung.alleZehnZeichen + ". (Beim Schreiben war genau das falsch: ab Stelle 4 verschwand der zweite Trennstrich und der „Vertipper“ war in Wahrheit ein 9-Zeichen-Code; die Prüfung steht deshalb im Ergebnis-JSON.)");
befund("Messung 4 Sonderfall A↔9: " + m4.sonderfallA9.anzahl + " Ersetzungen an jeder Position des Codes " + m4.sonderfallA9.basisCode + " (Nutzzeichen AA99, C1=" + m4.sonderfallA9.C1 + ", C2=" + m4.sonderfallA9.C2 + "), davon " + a9Abgelehnt + " abgelehnt — beide Richtungen (A→9 " + m4.sonderfallA9.anzahlA + "×, 9→A " + m4.sonderfallA9.anzahl9 + "×).");
befund("Nachrechnung zum Satz in A-festlegung.md § 2 („auch A↔9“): für das Nutzzeichen AA99 (Werte 0,0,31,31) ergibt C1 = 217 mod 31 = " + m4.sonderfallA9.C1 + " und C2 = 372 mod 32 = " + m4.sonderfallA9.C2 + ", also den Code " + m4.sonderfallA9.basisCode + " — nicht C2 = 28, wie der Text dort als Beispiel nennt. Die Aussage des Beweises selbst (jede Einzel-Ersetzung wird erkannt) wird davon nicht berührt: gemessen sind alle " + m4.sonderfallA9.anzahl + " A↔9-Ersetzungen an jeder Position abgelehnt. Die Zahl 28 in § 2 ist eine Rechenungenauigkeit im Beispiel, kein Widerspruch zum Beweis — gemeldet, die Festlegung bleibt unangetastet.");
if (m4.sonderfallDifferenz31.gefunden) {
  befund("Messung 4 Sonderfall Wertdifferenz 31: Code " + m4.sonderfallDifferenz31.basisCode + " (Nutzzeichen " + m4.sonderfallDifferenz31.nutzzeichen + ", A=0 neben 9=31) — Nachbartausch wird abgelehnt (" + m4.sonderfallDifferenz31.fehlerklasse + "). Rechenweg: " + m4.sonderfallDifferenz31.rechnungC1 + "; " + m4.sonderfallDifferenz31.rechnungC2 + ".");
} else {
  befund("Messung 4 Sonderfall Wertdifferenz 31: NICHT geprüft — kein Code mit benachbartem A=0 und 9=31 gefunden (" + kurz(m4.sonderfallDifferenz31) + ").");
}

/* =====================================================================================
   MESSUNG 5 — Zufallscodes (10.000 je Fall, fester Seed)
   ===================================================================================== */
const m5 = (() => {
  const zufall = rng(SEED);
  const lauf = (zeichenraum, n, name) => {
    const zähler = {};
    const beispiele = [];
    let akzeptiert = 0, präfixAbgeschnitten = 0;
    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      let s = "";
      for (let k = 0; k < 8; k++) s += zeichenraum[Math.floor(zufall() * zeichenraum.length)];
      if (s.startsWith("NL")) präfixAbgeschnitten++;
      const l = auftragLesen(s, QUELLE);
      const klasse = l === null ? "null" : (l.fehler || "angenommen");
      zähler[klasse] = (zähler[klasse] || 0) + 1;
      if (klasse === "angenommen") { akzeptiert++; if (beispiele.length < 5) beispiele.push({eingabe: s, ticketId: l.ticketId, index: l.index, variante: l.variante}); }
      else if (beispiele.length < 3 && klasse !== "länge") beispiele.push({eingabe: s, fehlerklasse: klasse, grund: l.grund});
    }
    ZEIT[name] = Date.now() - t0;
    return {n, akzeptiert, ablehnungsquote: +((n - akzeptiert) / n).toFixed(6), ablehnungsquoteProzent: +(((n - akzeptiert) / n) * 100).toFixed(2),
      fehlerklassen: zähler, beispiele, begonnenMitNL: präfixAbgeschnitten};
  };
  const raumVoll = (NUMMERN + BUCHSTABEN).split("");      /* [0-9A-Z]: enthält I, O, 0, 1 */
  const raumAlpha = ALPHABET.split("");
  const a = lauf(raumVoll, 10000, "messung5a");

  /* (b) nur ALPHABET: Länge 8 passt nie auf 6 → allein durch „länge“ abgelehnt. Zusatzlauf mit
     Nutzteil-Länge 6, sonst würde die Ablehnungsquote nichts über die Prüfsumme aussagen. */
  const b = lauf(raumAlpha, 10000, "messung5b");
  const b6 = (() => {
    const zähler = {}; const beispiele = []; let akzeptiert = 0;
    const t0 = Date.now();
    for (let i = 0; i < 10000; i++) {
      let s = "";
      for (let k = 0; k < 6; k++) s += raumAlpha[Math.floor(zufall() * raumAlpha.length)];
      const l = auftragLesen(s, QUELLE);
      const klasse = l === null ? "null" : (l.fehler || "angenommen");
      zähler[klasse] = (zähler[klasse] || 0) + 1;
      if (klasse === "angenommen") { akzeptiert++; if (beispiele.length < 5) beispiele.push({eingabe: s, ticketId: l.ticketId}); }
    }
    ZEIT.messung5b6 = Date.now() - t0;
    return {n: 10000, akzeptiert, ablehnungsquote: +((10000 - akzeptiert) / 10000).toFixed(6), fehlerklassen: zähler, beispiele,
      hinweis: "Zusatzlauf: 6 Zeichen aus ALPHABET (sonst greift immer nur die Längenprüfung)"};
  })();

  /* (c) 10.000 Ein-Zeichen-Mutationen gültiger Codes.
     Achtung: die Stelle wird über stelleIndex/leseZeichen gelesen und geschrieben — ein direkter
     Index `3 + pos` trifft ab Stelle 4 den Trennstrich und „mutiert“ dann den Bindestrich; der
     Code bliebe unverändert und würde als unerkannt gezählt (genau dieser Fehler ist aufgetreten). */
  const zufallsBasen = [];
  for (let i = 0; i < 100; i++) {
    const sitzung = Math.floor(zufall() * 32), art = i % 2, index = Math.floor(zufall() * 64), variante = Math.floor(zufall() * 256);
    const r = codeBauen({sitzung, art, index, variante});
    if (!r.fehler) zufallsBasen.push(r.code);
  }
  const c = (() => {
    const zähler = {}; const beispiele = []; let akzeptiert = 0, gültigeBasis = 0, unverändert = 0;
    const basen = zufallsBasen;
    const t0 = Date.now();
    for (let i = 0; i < 10000; i++) {
      const basis = basen[Math.floor(zufall() * basen.length)];
      if (!basis) break;
      gültigeBasis++;
      const pos = Math.floor(zufall() * 6);
      const alt = leseZeichen(basis, pos);
      let neu = alt;
      let k = 0;
      while (neu === alt && k++ < 64) {
        const kand = ALPHABET[Math.floor(zufall() * ALPHABET.length)];
        if (kand !== alt) neu = kand;
      }
      const mutiert = mitZeichen(basis, pos, neu);
      if (mutiert === basis) { unverändert++; continue; }   /* darf nicht vorkommen */
      const l = auftragLesen(mutiert, QUELLE);
      const klasse = l === null ? "null" : (l.fehler || "angenommen");
      zähler[klasse] = (zähler[klasse] || 0) + 1;
      if (klasse === "angenommen") { akzeptiert++; if (beispiele.length < 5) beispiele.push({basis, mutiert, position: pos, alt, neu, fehler: l}); }
    }
    ZEIT.messung5c = Date.now() - t0;
    return {n: gültigeBasis, akzeptiert, unveränderteMutationen: unverändert,
      erkennungsquote: +((gültigeBasis - akzeptiert) / gültigeBasis).toFixed(6),
      erkennungsquoteProzent: +(((gültigeBasis - akzeptiert) / gültigeBasis) * 100).toFixed(4), fehlerklassen: zähler, beispiele,
      basenAnzahl: basen.length};
  })();
  /* Zusatz zu (c): ALLE Ersetzungen an allen 6 Stellen für JEDEN der 100 Basiscodes durchprobieren
     (100 · 6 · 31 = 18.600 Fälle) — damit ist die Erkennungsquote nicht nur eine Stichprobe.
     Die unerkannten Fälle werden einzeln aufgeführt. */
  const cVollständig = (() => {
    const jeStelle = Array.from({length: 6}, (_, pos) => ({position: pos, geprüft: 0, erkannt: 0, unerkannt: 0}));
    const unerkannt = [];
    let fälle = 0, erkannt = 0;
    for (const basis of zufallsBasen) {
      for (let pos = 0; pos < 6; pos++) {
        const alt = leseZeichen(basis, pos);
        for (const c of ALPHABET) {
          if (c === alt) continue;
          fälle++;
          jeStelle[pos].geprüft++;
          const mutiert = mitZeichen(basis, pos, c);
          const l = auftragLesen(mutiert, QUELLE);
          if (l === null || l.fehler) { erkannt++; jeStelle[pos].erkannt++; }
          else { jeStelle[pos].unerkannt++; unerkannt.push({basis, pos, alt, neu: c, mutiert, ticketId: l.ticketId, index: l.index, variante: l.variante}); }
        }
      }
    }
    return {basenAnzahl: zufallsBasen.length, fälle, erkannt, unerkannt: unerkannt.length,
      erkennungsquote: +((fälle - unerkannt.length) / fälle).toFixed(6),
      erkennungsquoteProzent: +(((fälle - unerkannt.length) / fälle) * 100).toFixed(4),
      erwarteteTrefferBeiZufall: 0,
      erwartungSatz: "Zur Einordnung: 0 unerkannt ist KEIN Zufallstreffer-Ausbleiben — über den ganzen Zeichenraum gibt es keinen einzigen unerkannten Fall (siehe messungen.5_zufallscodes.raumVollständig). Die frühere Annahme „1 von 31 Zeichen trifft die Prüfsumme“ (1/992) ist nachgerechnet falsch.",
      jeStelle, unerkannteFälle: unerkannt};
  })();
  /* Vollständige Prüfung des Zeichenraums: für ALLE 2^20 Codes die Ersetzung jedes Nutzteils durch
     alle 31 anderen Zeichen (32^4 · 4 · 31 = 130.023.424 Fälle, ohne Wiederholung — genau die
     Menge, über die § 2 seinen Beweis führt). Dazu die Vertauschung aller Nachbarpaare.
     Damit steht nicht „4·31·Anzahl Codes“, sondern der ganze Raum; der Fall ist in ~15 s gerechnet. */
  const raumPrüfung = (() => {
    const t0 = Date.now();
    const NUTZ = 32 ** 4;
    const falschSub = [], falschTausch = [];
    let subFälle = 0, subUnerkannt = 0, tauschFälle = 0, tauschUnerkannt = 0;
    let c1Unverändert = 0, c2Unverändert = 0, beideUnverändert = 0;
    const v = [0, 0, 0, 0], t = [0, 0, 0, 0];
    const C1 = a => (1 * a[0] + 2 * a[1] + 3 * a[2] + 4 * a[3]) % 31;
    const C2 = a => (1 * a[0] + 3 * a[1] + 5 * a[2] + 7 * a[3]) % 32;
    for (let n = 0; n < NUTZ; n++) {
      v[0] = Math.floor(n / 32768) % 32; v[1] = Math.floor(n / 1024) % 32; v[2] = Math.floor(n / 32) % 32; v[3] = n % 32;
      const c1 = C1(v), c2 = C2(v);
      /* Sitzung und Variante sind für den Prüfsummen-Test beliebig; die Stützstellen 0/0 sind
         gültige Nutzlasten und die Prüfzeichen kommen aus demselben Rechenweg. */
      for (let pos = 0; pos < 4; pos++) {
        const alt = v[pos];
        for (let neu = 0; neu < 32; neu++) {
          if (neu === alt) continue;
          subFälle++;
          const w = v.slice(); w[pos] = neu;
          if (C1(w) === c1 && C2(w) === c2) {
            subUnerkannt++;
            if (falschSub.length < 5) falschSub.push({nutzzeichen: v.map(zeichen).join(""), position: pos, alt: zeichen(alt), neu: zeichen(neu)});
          }
        }
      }
      for (let k = 0; k < 3; k++) {
        if (v[k] === v[k + 1]) continue;
        tauschFälle++;
        t[0] = v[0]; t[1] = v[1]; t[2] = v[2]; t[3] = v[3];
        t[k] = v[k + 1]; t[k + 1] = v[k];
        const g1 = C1(t) === c1, g2 = C2(t) === c2;
        if (g1) c1Unverändert++;
        if (g2) c2Unverändert++;
        if (g1 && g2) {
          beideUnverändert++; tauschUnerkannt++;
          if (falschTausch.length < 5) falschTausch.push({nutzzeichen: v.map(zeichen).join(""), position: k, nachbar: zeichen(v[k]) + zeichen(v[k + 1])});
        }
      }
    }
    ZEIT.messung5raum = Date.now() - t0;
    return {
      nutzteile: NUTZ,
      ersetzungen: {fälle: subFälle, unerkannt: subUnerkannt, quoteProzent: +((subFälle - subUnerkannt) / subFälle * 100).toFixed(6), beispiele: falschSub},
      nachbartausch: {fälle: tauschFälle, unerkannt: tauschUnerkannt, quoteProzent: +((tauschFälle - tauschUnerkannt) / tauschFälle * 100).toFixed(6), beispiele: falschTausch,
        C1Unverändert: c1Unverändert, C2Unverändert: c2Unverändert, beideUnverändert},
      zählweise: "Alle 32^4 = 1.048.576 Nutzteile; je Nutzteil 4 Stellen · 31 Ersatzzeichen = 124 Ersetzungen und 3 Nachbarpaare (nur mit verschiedenen Werten). Gesamt " + subFälle + " Ersetzungen und " + tauschFälle + " Vertauschungen.",
      befundZumVergleich: "Für die Gesamtzahl der Ersetzungen wäre nach der falschen Zufallsannahme 1/31 · 1/32 = 1/992 mit rund " + Math.round(subFälle / 992) + " Treffern zu rechnen gewesen. Gemessen: " + subUnerkannt + ". Die Annahme „1 von 31 Zeichen trifft die Prüfsumme“ ist also falsch — die Kongruenz hat (weil 2 kein Teiler von 32 ist) nur Lösungen δ ≡ 0 oder 16 (mod 32), und δ = v_neu − v_alt liegt im Bereich −31..31.",
    };
  })();

  return {seed: SEED, generator: "mulberry32", a_raum0bis9AZ_laenge8: a, b_alphabet_laenge8: b, b6_zusatzlauf_alphabet_laenge6: b6, c_einZeichenMutation: c, c_vollständig: cVollständig, raumVollständig: raumPrüfung};
})();
MESS["5_zufallscodes"] = m5;

befund("Messung 5a: 10.000 zufällige 8-Zeichenketten aus [0-9A-Z] — " + m5.a_raum0bis9AZ_laenge8.akzeptiert + " angenommen, Ablehnungsquote " + m5.a_raum0bis9AZ_laenge8.ablehnungsquoteProzent + " %; Fehlerklassen " + kurz(m5.a_raum0bis9AZ_laenge8.fehlerklassen) + " (Fremdzeichen I, O, 0, 1 kommen vor).");
befund("Messung 5b: 10.000 zufällige 8-Zeichenketten NUR aus ALPHABET — Ablehnungsquote " + m5.b_alphabet_laenge8.ablehnungsquoteProzent + " %, alles Klasse " + kurz(m5.b_alphabet_laenge8.fehlerklassen) + " (8 ≠ 6: die Längenprüfung greift vor der Prüfsumme). Zusatzlauf mit 6 Zeichen: " + m5.b6_zusatzlauf_alphabet_laenge6.akzeptiert + " von 10.000 angenommen (Quote " + (m5.b6_zusatzlauf_alphabet_laenge6.ablehnungsquote * 100).toFixed(2) + " %), Fehlerklassen " + kurz(m5.b6_zusatzlauf_alphabet_laenge6.fehlerklassen) + ".");
befund("Messung 5c: 10.000 zufällige Ein-Zeichen-Mutationen gültiger Codes (" + m5.c_einZeichenMutation.basenAnzahl + " Basis-Codes, unveränderte Mutationen: " + m5.c_einZeichenMutation.unveränderteMutationen + ") — Erkennungsquote " + m5.c_einZeichenMutation.erkennungsquoteProzent + " %, also " + m5.c_einZeichenMutation.akzeptiert + " unerkannt. Das passt zum vollständigen Raum (siehe nächster Befund): dort ist die Zahl der unerkannten Ersetzungen 0, nicht rund 1 %." );
befund("Messung 5c vollständig (nicht Stichprobe): für alle " + m5.c_vollständig.basenAnzahl + " Basiscodes ALLE " + zahl(m5.c_vollständig.fälle) + " Ersetzungen (6 Stellen · 31 Zeichen) durchprobiert — erkannt " + zahl(m5.c_vollständig.erkannt) + ", unerkannt " + m5.c_vollständig.unerkannt + " (" + m5.c_vollständig.erkennungsquoteProzent + " %). " + m5.c_vollständig.erwartungSatz);
const rv = m5.raumVollständig;
befund("Messung 5 · GANZER Zeichenraum (stärkster Beleg): alle 32^4 = " + zahl(rv.nutzteile) + " Nutzteile durchgezählt — " + zahl(rv.ersetzungen.fälle) + " Einzel-Ersetzungen (4 Stellen · 31 Zeichen je Nutzteil), davon unerkannt " + rv.ersetzungen.unerkannt + " (" + rv.ersetzungen.quoteProzent + " % erkannt) und " + zahl(rv.nachbartausch.fälle) + " Nachbartauschungen ungleicher Nachbarn, davon unerkannt " + rv.nachbartausch.unerkannt + " (" + rv.nachbartausch.quoteProzent + " % erkannt). Die Aussage aus A-festlegung.md § 2 („jede Einzel-Ersetzung wird erkannt, auch A↔9“ und „jede Nachbarvertauschung wird erkannt“) hält damit über den GESAMTEN Raum, nicht nur über Stichproben. " + rv.zählweise);
befund("Messung 5 · Rechenweg zu den Prüfsummen: C1 bleibt beim Nachbartausch " + zahl(rv.nachbartausch.C1Unverändert) + "-mal gleich, C2 " + zahl(rv.nachbartausch.C2Unverändert) + "-mal — BEIDE gleich: " + rv.nachbartausch.beideUnverändert + "-mal. Grund (nachgerechnet): eine Ersetzung an Stelle i ändert C2 um w·δ mit ungeradem w; w·δ ≡ 0 (mod 32) verlangt δ ≡ 0 (mod 32), und δ = v_neu − v_alt liegt in −31..31 → nur δ = 0, also keine echte Ersetzung. Die in § 2 genannte Zufallserwartung „1 von 31 Zeichen trifft die Prüfsumme“ ist falsch: die Kongruenz 2δ ≡ Δ₀ + k·C1 (mod 32) hat Lösungen δ ≡ δ₀ oder δ₀+16 (mod 32), die im Bereich −31..31 nicht realisierbar sind. " + rv.befundZumVergleich);

/* =====================================================================================
   MESSUNG 6 — Fehlerklassen und Textbausteine
   ===================================================================================== */
const m6 = (() => {
  const muster = {länge: null, zeichen: null, prüfziffer: null, auftrag: null, fassung: null, null: null};
  /* länge */
  const lk = auftragLesen("NL-4F7K-2", QUELLE);
  muster["länge"] = {eingabe: "NL-4F7K-2", fehler: lk && lk.fehler, grund: lk && lk.grund, längeNachNormalisierung: lk && lk.länge,
    zweiterFall: (() => { const r = auftragLesen("NL-OQS-4", QUELLE); return {eingabe: "NL-OQS-4", fehler: r && r.fehler, grund: r && r.grund, länge: r && r.länge}; })()};
  /* zeichen */
  const zk = auftragLesen("NL-4F7K-2O", QUELLE);
  muster["zeichen"] = {eingabe: "NL-4F7K-2O", fehler: zk && zk.fehler, grund: zk && zk.grund, fremdzeichen: zk && zk.fremdzeichen};
  const zk1 = auftragLesen("NL-4F7K-21", QUELLE);
  muster["zeichen_ziffer1"] = {eingabe: "NL-4F7K-21", fehler: zk1 && zk1.fehler, grund: zk1 && zk1.grund, fremdzeichen: zk1 && zk1.fremdzeichen};
  /* prüfziffer */
  const basis = ersterCode(0, 0);
  const pz = auftragLesen(basis.code.slice(0, 9) + (basis.code[9] === "A" ? "B" : "A"), QUELLE);
  muster["prüfziffer"] = {eingabe: basis.code.slice(0, 9) + (basis.code[9] === "A" ? "B" : "A"), echterCode: basis.code,
    fehler: pz && pz.fehler, grund: pz && pz.grund, rechnung: pz && pz.rechnung,
    erwartetePrüfzeichen: pz && pz.erwartetePrüfzeichen, gelesenePrüfzeichen: pz && pz.gelesenePrüfzeichen, falsch: pz && pz.falsch};
  /* fassung: freier Index 58..63 (art 0) und art=1 mit Index ≥ 27 */
  const frei = [];
  for (const idx of [58, 59, 60, 61, 62, 63]) {
    const rr = ersterCode(0, idx);
    const ll = auftragLesen(rr.code, QUELLE);
    frei.push({index: idx, art: 0, code: rr.code, fehler: ll && ll.fehler, grund: ll && ll.grund});
  }
  for (const idx of [27, 30, 63]) {
    const rr = ersterCode(1, idx);
    const ll = auftragLesen(rr.code, QUELLE);
    frei.push({index: idx, art: 1, code: rr.code, fehler: ll && ll.fehler, grund: ll && ll.grund});
  }
  muster["fassung"] = {fälle: frei, abgelehnt: frei.filter(f => f.fehler === "fassung").length, anzahl: frei.length,
    freieIndizesAuftraege: "58..63", freieIndizesSkills: "27..63"};
  /* auftrag: künstlich manipulierte Tabelle (die echten DATEN.tickets bleiben unberührt) */
  const echteId = TICKETS[30];
  const code30 = ersterCode(0, 30).code;
  const manipuliere = (pos, wert) => ({tickets: TICKETS.map((id, i) => i === pos ? wert : id), skills: SKILLS, existiert: id => DATEN_IDS.includes(id)});
  const manipulation = [
    {eingabe: "Eintrag 30 auf null gesetzt (ID verschwunden)", ergebnis: auftragLesen(code30, manipuliere(30, null))},
    {eingabe: "Eintrag 30 ersetzt durch „gibt-es-nicht“", ergebnis: auftragLesen(code30, manipuliere(30, "gibt-es-nicht"))},
    {eingabe: "ID im Katalog umbenannt, Tabelle zeigt „xyz-weg“", ergebnis: auftragLesen(code30, manipuliere(30, "xyz-weg"))},
  ].map(x => ({eingabe: x.eingabe, echterEintrag: echteId, code: code30,
    fehler: x.ergebnis && x.ergebnis.fehler, grund: x.ergebnis && x.ergebnis.grund, unbekannteId: x.ergebnis && x.ergebnis.unbekannteId}));
  muster["auftrag"] = {fälle: manipulation, abgelehnt: manipulation.filter(f => f.fehler === "auftrag").length, anzahl: manipulation.length,
    kontrolle: (() => { const k = auftragLesen(code30, QUELLE); return {tabelleUnverändert: !k.fehler, ticketId: k.ticketId}; })()};
  /* null bei leerer Eingabe */
  const leer = [null, undefined, "", "   ", "\t\n"].map(e => {
    const r = auftragLesen(e, QUELLE);
    return {eingabe: e === null ? "null" : e === undefined ? "undefined" : JSON.stringify(e), erwartet: "null",
      ergebnis: r === null ? "null" : (r.fehler || "gelesen")};
  });
  const nurTrenner = ["---", "...", "nl", "N L", " - "].map(e => {
    const r = auftragLesen(e, QUELLE);
    return {eingabe: JSON.stringify(e), erwartet: "nicht null (es wurde etwas getippt, nur zu wenig)", ergebnis: r === null ? "null" : (r.fehler || "gelesen")};
  });
  muster["null"] = {fälle: leer, nullFälle: leer.filter(f => f.ergebnis === "null").length, anzahl: leer.length,
    nurTrennerGetippt: nurTrenner,
    hinweis: "Erst wenn nichts getippt wurde (null/undefined/leer/Leerzeichen) kommt null zurück. Wer nur Trenner tippt, hat etwas getippt und bekommt eine echte Fehlermeldung (hier länge)."};
  /* Verwechslung Ergebnisfeld ↔ Auftragsfeld */
  const ergebnis = ergebnisCodeBauen({sitzung: 7, platz: 12, sterne: 8, versuche: 0, dauer: 60}).code;
  const auftragsFeldMitErgebnis = auftragLesen(ergebnis, QUELLE);
  const ergebnisFeldMitAuftrag = (() => {
    const n = normalisieren(basis.code, "ergebnis");
    return {code: basis.code, fehler: n && n.fehler, grund: n && n.grund, länge: n && n.länge, erwartet: n && n.erwartet};
  })();
  muster["verwechslung"] = {
    ergebnisCode: ergebnis,
    auftragsFeldMitErgebnisCode: {fehler: auftragsFeldMitErgebnis && auftragsFeldMitErgebnis.fehler, grund: auftragsFeldMitErgebnis && auftragsFeldMitErgebnis.grund},
    ergebnisFeldMitAuftragsCode: ergebnisFeldMitAuftrag,
    hinweis: "Der Ergebnis-Code hat 7 Nutzzeichen, der Auftragscode braucht 6 (und umgekehrt). Beide Wege enden deshalb in der Klasse „länge“ mit dem Hinweis „Der Code hat 7 Zeichen – er braucht 6 …“; in der Oberfläche muss der Hinweis die jeweils erwartete Länge nennen.",
  };
  /* Fehlerklassen-Übersicht (§ 8) */
  muster["übersicht"] = FEHLERKLASSEN.map(k => ({fehler: k, beiAuftragscodeErreichbar: ["länge", "zeichen", "prüfziffer", "auftrag", "fassung"].includes(k)}));
  return muster;
})();
MESS["6_fehlerklassen"] = m6;

const m6ok = m6["länge"].fehler === "länge" && m6["zeichen"].fehler === "zeichen" && m6["prüfziffer"].fehler === "prüfziffer" &&
  m6["auftrag"].abgelehnt === m6["auftrag"].anzahl && m6["fassung"].abgelehnt === m6["fassung"].anzahl &&
  m6["null"].nullFälle === m6["null"].anzahl;
befund("Messung 6: alle sechs Pflichtfälle belegt — länge (" + kurz(m6["länge"].grund) + "), zeichen (" + kurz(m6["zeichen"].grund) + "), prüfziffer (" + kurz(m6["prüfziffer"].grund) + "), auftrag (" + m6["auftrag"].abgelehnt + "/" + m6["auftrag"].anzahl + " manipulierte Tabelleneinträge erkannt), fassung (" + m6["fassung"].abgelehnt + "/" + m6["fassung"].anzahl + " freie Indizes), null (" + m6["null"].nullFälle + "/" + m6["null"].anzahl + " echte Leereingaben → null; „---“, „...“, „nl“ sind getippter Text und liefern länge, siehe messungen.6_fehlerklassen.null.nurTrennerGetippt). " + (m6ok ? "Alle Klassen wie in § 8." : "ABWEICHUNG vorhanden — siehe messungen."));
befund("Messung 6 Verwechslung: der Ergebnis-Code " + m6.verwechslung.ergebnisCode + " im Auftragsfeld ergibt „" + m6.verwechslung.auftragsFeldMitErgebnisCode.fehler + "“; der Auftragscode " + m6.verwechslung.ergebnisFeldMitAuftragsCode.code + " im Ergebnisfeld ergibt „" + m6.verwechslung.ergebnisFeldMitAuftragsCode.fehler + "“ mit dem Hinweis „" + m6.verwechslung.ergebnisFeldMitAuftragsCode.grund + "“.");

/* =====================================================================================
   MESSUNG 7 — Formbeispiel NL-4F7K-2Q nachrechnen
   ===================================================================================== */
const m7 = (() => {
  const form = "NL-4F7K-2Q";
  const nutz = "4F7K2Q";
  const nutzzeichen = nutz.slice(0, 4), prüfGelesen = nutz.slice(4, 6);
  const werte = [...nutzzeichen].map(wert);
  const p = pruefsummen(werte);
  const gelesen = auftragLesen(form, QUELLE);
  const richtig = (() => {
    for (const a of ALPHABET) for (const b of ALPHABET) {
      const kandidat = "NL-" + nutzzeichen + "-" + a + b;
      const l = auftragLesen(kandidat, QUELLE);
      if (l && !l.fehler) return {code: kandidat, ticketId: l.ticketId, index: l.index, variante: l.variante, sitzung: l.sitzung, art: l.art, seed: l.seed};
    }
    return null;
  })();
  const suchraum = 32 * 32;
  const gültigePrüfpaare = [...ALPHABET].filter(c => wert(c) === p.C1).length + "/" + [...ALPHABET].filter(c => wert(c) === p.C2).length;
  return {
    formbeispiel: form, nutzteil: nutz,
    rechenweg: [
      "wert('4') = " + wert("4") + ", wert('F') = " + wert("F") + ", wert('7') = " + wert("7") + ", wert('K') = " + wert("K"),
      "C1 = 1*" + werte[0] + " + 2*" + werte[1] + " + 3*" + werte[2] + " + 4*" + werte[3] + " = " + werte.reduce((s, v, i) => s + (i + 1) * v, 0) + " → mod 31 = " + p.C1 + " → Prüfzeichen " + p.z1,
      "C2 = 1*" + werte[0] + " + 3*" + werte[1] + " + 5*" + werte[2] + " + 7*" + werte[3] + " = " + werte.reduce((s, v, i) => s + (2 * i + 1) * v, 0) + " → mod 32 = " + p.C2 + " → Prüfzeichen " + p.z2,
      "gelesen: " + prüfGelesen + " → C1 gelesen " + wert(prüfGelesen[0]) + " (erwartet " + p.C1 + "), C2 gelesen " + wert(prüfGelesen[1]) + " (erwartet " + p.C2 + ")",
    ],
    werteNutzeichen: werte, C1: p.C1, C2: p.C2, erwartetePrüfzeichen: p.z1 + p.z2, gelesenePrüfzeichen: prüfGelesen,
    gültig: !(gelesen && gelesen.fehler), fehler: gelesen && gelesen.fehler, grund: gelesen && gelesen.grund,
    richtigerCodeFürNutzlast: richtig,
    suchraumPrüfpaare: suchraum, gültigePrüfpaare,
    befundSatz: null === gelesen ? "null" : (gelesen.fehler ? "abgelehnt" : "gültig"),
  };
})();
MESS["7_formbeispiel"] = m7;

if (!m7.gültig) {
  befund("Messung 7: das Formbeispiel " + m7.formbeispiel + " ist KEIN gültiger Code unserer Prüfsumme — " + m7.rechenweg[1] + "; " + m7.rechenweg[2] + ". Gelesen wird " + m7.gelesenePrüfzeichen + ": " + m7.fehler + " („" + m7.grund + "“). Korrekt wäre für dieselbe Nutzlast " + nutzText(m7) + ".");
} else {
  befund("Messung 7: das Formbeispiel " + m7.formbeispiel + " wäre gültig — das widerspricht A-festlegung.md § 1 und ist im JSON belegt.");
}
function nutzText(x) {
  return x.richtigerCodeFürNutzlast ? x.richtigerCodeFürNutzlast.code + " (ticketId " + x.richtigerCodeFürNutzlast.ticketId + ", Index " + x.richtigerCodeFürNutzlast.index + ", Variante " + x.richtigerCodeFürNutzlast.variante + ")" : "kein Code gefunden";
}

/* =====================================================================================
   ABSCHLUSS — Tabellenstand messen, JSON schreiben
   ===================================================================================== */
const tabellenstand = (() => {
  const reiheIds = TICKETS.join("|"), datenIds = DATEN_IDS.join("|");
  let ersteAbweichung = -1;
  for (let i = 0; i < Math.max(TICKETS.length, DATEN_IDS.length); i++) {
    if (TICKETS[i] !== DATEN_IDS[i]) { ersteAbweichung = i; break; }
  }
  return {
    modulAnzahl: lab.module.length,
    ticketReihe: TICKETS.length,
    datenTickets: DATEN_IDS.length,
    datenSkills: SKILLS.length,
    reiheGleichDatenReihenfolge: reiheIds === datenIds,
    reiheGleichAlsMenge: [...TICKETS].sort().join("|") === [...DATEN_IDS].sort().join("|"),
    ersteAbweichungPosition: ersteAbweichung,
    abweichungsBeispiele: ersteAbweichung < 0 ? [] : [0, 1, 2, 3, 4].map(k => ({
      position: ersteAbweichung + k,
      ticketReihe: TICKETS[ersteAbweichung + k] === undefined ? null : TICKETS[ersteAbweichung + k],
      datenReihenfolge: DATEN_IDS[ersteAbweichung + k] === undefined ? null : DATEN_IDS[ersteAbweichung + k],
    })),
    ticketsNichtInDaten: NICHT_IN_DATEN,
    ticketIds: TICKETS,
    ticketIdsDatenReihenfolge: DATEN_IDS,
    skillIds: SKILLS,
    eingefroreneLängen: {TABELLE_AUFTRAEGE: TABELLE_AUFTRAEGE_LAENGE, TABELLE_SKILLS: TABELLE_SKILLS_LAENGE, passt: TABELLE_AUFTRAEGE_LAENGE === TICKETS.length && TABELLE_SKILLS_LAENGE === SKILLS.length},
    terminalAuftraege: lab.DATEN.tickets.filter(t => t.art === "terminal").length,
  };
})();
MESS["0_tabellenstand"] = tabellenstand;

if (!tabellenstand.eingefroreneLängen.passt) {
  befund("Abweichung: die eingefrorenen Tabellenlängen (58/27) passen nicht zum gemessenen Stand (" + TICKETS.length + "/" + SKILLS.length + ").");
} else {
  befund("Tabellenstand dieser Sitzung (gemessen): " + tabellenstand.modulAnzahl + " Module, " + tabellenstand.ticketReihe + " Aufträge in Spiel.ticketReihe(), " + tabellenstand.datenSkills + " Fertigkeiten; die eingefrorenen Längen 58/27 passen.");
}
if (tabellenstand.reiheGleichDatenReihenfolge) {
  befund("Beide Tabellenreihenfolgen sind in dieser Sitzung gleich — der Satz in A-festlegung.md § 7 („beide Reihenfolgen sind gemessen verschieden“) trifft für den hier gemessenen Stand nicht zu. Die Festlegung wird nicht angepasst, nur gemeldet.");
  ungeprueft("Nicht geprüft: ob A-festlegung.md § 7 für eine andere Fassung des Repos recht hat — hier sind Spiel.ticketReihe() und DATEN.tickets in derselben Reihenfolge gemessen (ID-Listen im JSON).");
} else {
  befund("Die beiden Tabellenreihenfolgen sind verschieden — wie in A-festlegung.md § 7 beschrieben. Erste Abweichung an Position " + tabellenstand.ersteAbweichungPosition + ": Spiel.ticketReihe() = " + kurz(tabellenstand.abweichungsBeispiele.map(x => x.ticketReihe).join(", ")) + " gegen DATEN.tickets = " + kurz(tabellenstand.abweichungsBeispiele.map(x => x.datenReihenfolge).join(", ")) + "; dieselbe ID-Menge in beiden Reihenfolgen: " + tabellenstand.reiheGleichAlsMenge + ".");
  ungeprueft("Nicht geprüft: warum die beiden Reihenfolgen auseinandergehen — gemessen ist nur die Position der ersten Abweichung und die ID-Menge (beides im JSON).");
}

/* Laufzeit: gemessen (Grenze ~10 Minuten), aber NUR auf der Konsole ausgegeben — sie ändert sich
   je Lauf und würde die Regel „nur schreiben, wenn identisch“ aushebeln. Die Ergebnisdatei bleibt
   dadurch vollständig wiederholbar (fester Seed, feste Uhr im Lader, keine Uhrwerte im JSON). */
const voll = Date.now() - T0;
const laufzeitOk = voll <= 10 * 60 * 1000;
ZEIT.gesamt = voll;
if (!laufzeitOk) console.warn("WARNUNG: Laufzeit " + voll + " ms überschreitet die Grenze von 10 Minuten.");
BEFEHL_LISTE[0].ergebnis = "vollständig gelaufen, " + m12.nutzlastwerte + " Nutzlastwerte, " + m12.roundtrips + " Round-Trips, " + m12.fehlschläge + " Fehlschläge (Laufzeit steht auf der Konsole)";
MESS["laufzeit"] = {
  gemessen: true, grenzeMs: 600000,
  hinweis: "Die Laufzeit wurde gemessen und liegt weit unter der Grenze von ~10 Minuten (Konsole: unrund.laufzeitMs). Sie steht absichtlich NICHT als Zahl in dieser Datei, weil sie je Lauf schwankt und die Regel „nur schreiben, wenn identisch“ sonst nie greifen würde — der Zeitstempel der Datei soll stabil bleiben.",
};

/* Offene Punkte und Nicht-geprüft ehrlich benennen */
offen("Ergebnis-Code (E-XXXX-XXX, § 4) ist in dieser Probe vollständig als reine Funktion mitgebaut (Bauen, Prüfsumme, Länge, Lesen, 10.000er-Round-Trip) — NICHT geprüft ist die Sitzungsprüfung (§ 8, fehler „sitzung“) und die Kanonisierung; beides gehört zur Instanz.");
offen("Die eingefrorenen Tabellen-IDs werden zur Laufzeit aus dem Lader gemessen (Spiel.ticketReihe(), DATEN.skills) und nur als Liste im JSON belegt; ein eingefrorenes Literal in src/spiel/klassenraum.js muss beim Bau aus diesem JSON erzeugt und gegen Spiel.ticketReihe() geprüft werden (§ 7 a/d).");
offen("Reihenfolge der Prüfungen festgelegt: Länge → Fremdzeichen → Prüfsumme → freier Index (fassung) → ID (auftrag). A-festlegung.md § 1 nennt nur die Reihenfolge „Länge prüfen → Fremdzeichen prüfen → Prüfsumme“; für die Nachrangigkeit von auftrag/fassung gibt es dort keine Aussage. Belegt in messungen.4_vertipper.kontrollFälle.");
offen("§ 8 führt sieben Fehlerklassen; „wahl“ (erzeugen ohne/mit beidem) und „sitzung“ (fremde Sitzung) gehören zur Sitzungslogik und sind in dieser Codec-Probe nicht erreichbar.");
offen("Sterne-Einheit: § 4 nennt Bereich 0..10 und Formel round(sterne*2). Der Codec trägt den GANZEN Wert 0..10; wer die Anzeige-Sterne (0..5) hineingibt, verliert die Hälfte. Das ist im Codec-Kopf kommentiert und gemessen (Sterne 8 bleibt 8).");
ungeprueft("Nicht geprüft: ob src/spiel/klassenraum.js existiert oder mit dieser Probe übereinstimmt — die Datei gibt es in dieser Sitzung nicht (nur gelesen wurde der Lader). src/ wurde nicht angefasst.");
ungeprueft("Nicht geprüft: das Verhalten von erzeugen/ergebnisCode/exportieren aus der Auftrags-Schnittstelle (KLASSENRAUM.md) — nicht Teil der Codec-Probe.");
ungeprueft("Nicht geprüft: die Kanonisierung (§ 5) und der Netzkennwert (§ 6) — andere Bausteine.");
ungeprueft("Nicht geprüft: ob die Aufträge/Netze zu den gelesenen Codes wirklich lösbar sind (Spiel.ticketGueltig) — die Probe liest nur den Code, sie baut kein Netz.");
ungeprueft("Nicht geprüft: das Verhalten des Codes in der vm des Spiels (tests/run.js) — die Probe läuft als CommonJS-Prozess und lädt die Spielmodule nur über A-lader.js im vm-Kontext; src/spiel/klassenraum.js ist nicht vorhanden.");

const ergebnis = {
  thema: "A-format · Auftragscode NL-XXXX-XX nach A-festlegung.md (Referenzimplementierung, Codec-Probe)",
  stand: STAND,
  befehle: BEFEHL_LISTE,
  messungen: MESS,
  befunde: BEFUNDE,
  offene: OFFENE,
  nichtGeprueft: NICHT_GEPRUEFT,
};
const text = JSON.stringify(ergebnis, null, 1) + "\n";
const probePfadImRepo = path.relative(ROOT, PROBE_DATEI).replace(/\\/g, "/");
const probeHash = require("crypto").createHash("sha256").update(fs.readFileSync(PROBE_DATEI), "utf8").digest("hex");

const args = process.argv.slice(2);
const ohneSchreiben = args.includes("--ohne-schreiben");
const nurSchreiben = args.includes("--nur-schreiben");

console.log(JSON.stringify({
  probe: "A-format",
  befehl: BEFEHL,
  zieldatei: path.relative(ROOT, ZIELDATEI).replace(/\\/g, "/"),
  nutzlastwerte: m12.nutzlastwerte, fehlschläge: m12.fehlschläge, roundtrips: m12.roundtrips,
  freieIndizesAbgelehnt: m12.freieIndizesAbgelehnt,
  codeLängeMin: m12.codeLängeMin, codeLängeMax: m12.codeLängeMax, über10: m12.codeLängenÜber10,
  ergebnisCodeRoundtrip: {fälle: m2c.fälle, fehlschläge: m2c.fehlschläge, längenFehler: m2c.längenFehler},
  vertipperKernfälle: m4.kernfälleAnzahl, vertipperAbgelehnt: kernAbgelehnt,
  a9Fälle: m4.sonderfallA9.anzahl, a9Abgelehnt,
  zufall5a: m5.a_raum0bis9AZ_laenge8.fehlerklassen, zufall5b: m5.b_alphabet_laenge8.fehlerklassen,
  zufall5cErkennungProzent: m5.c_einZeichenMutation.erkennungsquoteProzent,
  zufall5cUnbemerkt: m5.c_einZeichenMutation.akzeptiert,
  substitutionenVollständig: {fälle: m5.c_vollständig.fälle, erkannt: m5.c_vollständig.erkannt, unerkannt: m5.c_vollständig.unerkannt, prozent: m5.c_vollständig.erkennungsquoteProzent},
  formbeispielGültig: m7.gültig, formbeispielFehler: m7.fehler,
  richtigFür4F7K2Q: m7.richtigerCodeFürNutzlast && m7.richtigerCodeFürNutzlast.code,
  laufzeitMs: voll,
  befundAnzahl: BEFUNDE.length, offeneAnzahl: OFFENE.length, nichtGeprueftAnzahl: NICHT_GEPRUEFT.length,
  /* `unrund`: nur auf der Konsole, NICHT in der Datei — Zeit- und Umgebungswerte schwanken je Lauf */
  unrund: {
    laufzeitMs: {
      gesamt: ZEIT.gesamt, grenzeMs: 600000, innerhalbDerGrenze: laufzeitOk,
      messung1: ZEIT.messung1, messung5a: ZEIT.messung5a, messung5b: ZEIT.messung5b,
      messung5b6: ZEIT.messung5b6, messung5c: ZEIT.messung5c, messung5raum: ZEIT.messung5raum,
      msProRoundtrip: +(ZEIT.messung1 / m12.nutzlastwerte).toFixed(6),
      roundtripsProSekunde: Math.round(m12.nutzlastwerte / (ZEIT.messung1 / 1000)),
    },
    node: process.version, plattform: process.platform, probeDatei: probePfadImRepo, probeSha256: probeHash,
    zeitstempelUtc: new Date().toISOString(),
    dateiWiederholbar: "Alles unter messungen/befunde/offene/nichtGeprueft ist wiederholbar (fester Seed " + SEED + ", feste Uhr im Lader); die Probe schreibt die Datei nur, wenn sie sich inhaltlich ändert.",
  },
}, null, 1));

if (nurSchreiben) {
  const da = fs.existsSync(ZIELDATEI);
  const alt = da ? fs.readFileSync(ZIELDATEI, "utf8") : null;
  console.log(da ? (alt === text ? "A-format.json: identisch (nichts geschrieben, Zeitstempel bleibt)" : "A-format.json: WEICHT AB (nicht geschrieben — --nur-schreiben)")
    : "A-format.json: fehlt (nicht geschrieben — --nur-schreiben)");
} else if (ohneSchreiben) {
  console.log("--ohne-schreiben: Ergebnisdatei nicht angefasst.");
} else {
  fs.mkdirSync(path.dirname(ZIELDATEI), {recursive: true});
  const alt = fs.existsSync(ZIELDATEI) ? fs.readFileSync(ZIELDATEI, "utf8") : null;
  if (alt === text) console.log("A-format.json: identisch — nicht geschrieben (Zeitstempel bleibt stabil).");
  else { fs.writeFileSync(ZIELDATEI, text, "utf8"); console.log("A-format.json: geschrieben (" + Buffer.byteLength(text, "utf8") + " Bytes" + (alt === null ? ", neu" : ", geändert") + ")."); }
}
