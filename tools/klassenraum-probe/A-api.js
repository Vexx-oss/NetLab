"use strict";
/* ---------- Bereich A · API-Probe: Referenzimplementierung `Spiel.klassenraum` ----------
   Auftrag: tools/auftraege/KLASSENRAUM.md (Schnittstelle), verbindlich: tools/klassenraum-probe/A-festlegung.md § 4, § 7-§ 9.

   BEFEHL (portables Node v24.21.0):
     & "$env:LOCALAPPDATA\node-portable\node-v24.21.0-win-x64\node.exe" tools\klassenraum-probe\A-api.js
   Die Probe schreibt Nachweise\Klassenraum\A-api.json und ist wiederholbar: fester Seed, feste Uhr,
   kein Math.random. Sie ändert NICHTS außer dieser einen JSON-Datei (kein src/**, kein tests/**,
   kein git, kein Dateizugriff außer der Ausgabedatei).

   WAS HIER STEHT
     K     Referenzimplementierung der acht Funktionen aus KLASSENRAUM.md auf einem eigenen Objekt
           (NICHT in src/): erzeugen, ausCode, sitzung, ergebnisCode, ergebnisLesen,
           ergebnisEintragen, exportieren, importieren. Sie rechnet GENAU nach A-festlegung.md:
           Alphabet/Form § 1, Prüfsumme § 2, Auftragscode-Bits § 3, Ergebnis-Code-Bits § 4,
           Kanonisierung § 5, Tabellen § 7, Fehlerklassen § 8, Speicherform/Export § 9.
     Blöcke 1-8  die Pflichtmessungen der Aufgabe, jede Zahl in dieser Sitzung gemessen.
     zusatz      Determinismus (Netzkennwert § 6 als Gleichheitszeuge) und § 5-Randfälle.

   SPEICHER: der echte `store` aus dem Lader, Schlüssel "klassenraum" (store.get/set). Headless ist kein
   Schreiber gesetzt (der Lader lädt ohne `window`), deshalb bleibt alles im Speicher-Cache; gemessen wird
   das mit store.sofort() → false und store.stand().art === "schreibt".

   ENTSCHEIDUNGEN (die Festlegung schweigt hier; jede ist in `befunde` begründet und in `offene` gemeldet):
     - dauer: Einheiten à 10 s werden mit Math.round(dauerS/10) gebildet (kleinster Fehler ±5 s, kein
       systematischer Versatz); dauerS = min(5110, max(0, round(zeitMs/1000))).
     - ergebnisLesen liefert sterne in VOLLEN Sternen (halbe/2) — passend zu abnahme.sterne, das der
       Auftrag als sterne = abnahme.sterne vorgibt. Das Register selbst trägt halbe Sterne (0..10).
     - ergebnisLesen liefert zusätzlich versuche, halbeSterne, dauerEinheiten und den kanonischen Code
       (Bereich B braucht die Fehlversuche für die Ampel).
     - Ergebnis-Codes derselben Sitzung und desselben Platzes ERSETZEN sich (ergebnisse ist laut § 9 eine
       Abbildung platz → Satz); ein zweiter Code mit demselben Platz ist also {ok:true,neu:true,ersetzt:true}.
     - importieren vergleicht nur `fassung` (Zahl), nie `programm` — Begründung wie Spiel.importPruefen.
     - Platz-Kennung ist eine Zahl 0..31 (0 = „ohne Platz"), nie ein Name: 5 Bit, im Speicher und im Code
       dieselbe Zahl. Datensparsamkeit ist damit keine Zusage, sondern eine Eigenschaft des Formats.
     - eigene Fehlerklassen der Referenz: eingabe, abnahme, platz, sterne (ergebnisCode) und
       leer, json, format, ergebnisse (importieren); § 8 kennt sie nicht.

   SCHREIBREGEL für A-api.json: neu geschrieben wird nur, wenn sich ein Wert außer den Laufzeitwerten ändert
   (Felder `laufzeit`, `laufzeitMs`, `ms`). Ein Wiederholungslauf misst die Laufzeit neu, lässt die Datei
   samt Zeitstempel aber stehen — in dieser Sitzung dreimal nachgemessen (2. und 3. Lauf: unverändert).
*/
const fs = require("fs"), path = require("path");
const {kontext, WURZEL} = require("./A-lader.js");
const lab = kontext();
const {Spiel, DATEN, Zufall, store, jetzt, LABOR_VERSION} = lab;

const AUSGABE = path.join(WURZEL, "Nachweise", "Klassenraum", "A-api.json");
const BEFEHL = '& "$env:LOCALAPPDATA\\node-portable\\node-v24.21.0-win-x64\\node.exe" tools\\klassenraum-probe\\A-api.js';
const UHR = 1759706400000;                 /* feste Uhr: 2026-10-06 00:00:00 UTC */
const PROBE_SEED = 20261006;               /* fester Seed: die Probe ist wiederholbar */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const KANON_FENSTER = 64;

/* ---------- Prüfsammler ---------- */
const pruefungen = [];
function muss(name, ok, ist, soll){
  pruefungen.push({name, ok: !!ok, ist: ist === undefined ? null : ist, soll: soll === undefined ? null : soll});
  return !!ok;
}
/* Zwei Aufrufformen: gleich(name, ist, soll) vergleicht zwei Werte;
   gleich(name, bedingung, ist, soll) prüft eine Bedingung und legt ist/soll für den Bericht ab. */
function gleich(name, a, b, c){
  if (arguments.length >= 4) return muss(name, !!a, b, c);
  return muss(name, JSON.stringify(a) === JSON.stringify(b), a, b);
}
function ohneAusnahme(fn){ try { return {wert: fn(), ausnahme: null}; } catch (e) { return {wert: null, ausnahme: String((e && e.message) || e)}; } }

/* ---------- Spielstand/Uhr ---------- */
function standFrisch(){
  jetzt.setzen(UHR);                       /* Uhr ZUERST: leererStand schreibt jetzt() in `zuletzt` */
  Spiel._trocken = true;                   /* keine Bus-Ereignisse, kein Speichern, kein Lernmotor */
  Spiel._lz = {};
  Spiel._einst = null;                     /* Einstellungen wieder aus dem Speicher (Standard) lesen */
  Spiel._st = Spiel.leererStand();
}
function speicherLeer(){
  store.set("klassenraum", {fassung: 1, programm: LABOR_VERSION, platz: null, zuletzt: jetzt(), sitzung: null, letzte: null});
}
const speicherText = () => JSON.stringify(store.get("klassenraum", null));

/* =====================================================================================
   K · Referenzimplementierung (A-festlegung.md § 1, § 2, § 4, § 7, § 8, § 9)
   ===================================================================================== */
const K = {};

/* --- § 1 Alphabet --- */
K.ALPHABET = ALPHABET;
K.wert = c => ALPHABET.indexOf(c);
K.zeichen = v => ALPHABET[v];

/* --- § 2 Prüfsumme über die Nutzzeichen (k = 4 Auftrag, k = 5 Ergebnis) --- */
K.pruefsummen = function(werte){
  let c1 = 0, c2 = 0;
  for (let i = 0; i < werte.length; i++){ c1 += (i + 1) * werte[i]; c2 += (2 * i + 1) * werte[i]; }
  return {c1: c1 % 31, c2: c2 % 32};       /* C1 mod 31 (prim), C2 mod 32 (alle Gewichte ungerade) */
};

/* --- § 1 Normalisierung und Prüfung, für beide Code-Arten --- */
K.normalisiere = function(roh, art){
  if (roh === null || roh === undefined) return {leer: true};
  const text = String(roh);
  if (!text.trim()) return {leer: true};
  const s = text.toUpperCase().replace(/[^0-9A-Z]/g, "");     /* Leerzeichen, Bindestriche, Punkte … weg */
  if (!s) return {leer: true};
  const kopf = art === "ergebnis" ? "E" : "NL";
  const laenge = art === "ergebnis" ? 7 : 6;
  let rumpf = s;
  if (s.startsWith(kopf) && s.length - kopf.length === laenge) rumpf = s.slice(kopf.length);
  if (rumpf.length !== laenge){
    /* Häufiger Tippfehler-Fall: die andere Code-Art wurde eingetippt (Auftragscode am Ergebnis-Eingang und umgekehrt) */
    if (art === "ergebnis" && s.startsWith("NL") && s.length - 2 === 6)
      return {fehler: "länge", grund: "Das ist ein Auftragscode (NL-…) – hier wird der Ergebnis-Code (E-…) gebraucht."};
    if (art === "auftrag" && s.startsWith("E") && s.length - 1 === 7)
      return {fehler: "länge", grund: "Das ist ein Ergebnis-Code (E-…) – hier wird der Auftragscode (NL-…) gebraucht."};
    return {fehler: "länge", grund: `Der Code hat ${rumpf.length} Zeichen – er braucht ${laenge} (z. B. ${art === "ergebnis" ? "E-4F7K-2QM" : "NL-4F7K-2Q"}).`};
  }
  /* Nach dem Filter bleiben nur [0-9A-Z]; fremd sind damit genau I, O, 0 und 1 (nicht im Alphabet). */
  const fremd = [...new Set([...rumpf].filter(c => ALPHABET.indexOf(c) < 0))];
  if (fremd.length)
    return {fehler: "zeichen", grund: "Im Code kommt kein I, O, 0 und kein 1 vor – hast du 0 statt O getippt?"};
  const werte = [...rumpf].map(c => ALPHABET.indexOf(c));
  const nutz = werte.slice(0, laenge - 2);
  const p = K.pruefsummen(nutz);
  if (werte[laenge - 2] !== p.c1 || werte[laenge - 1] !== p.c2)
    return {fehler: "prüfziffer", grund: "Die Prüfziffer passt nicht – hast du dich vertippt?"};
  const gedruckt = (art === "ergebnis" ? "E-" : "NL-") + rumpf.slice(0, 4) + "-" + rumpf.slice(4);
  return {werte, nutz, rumpf, gedruckt};
};

/* --- § 3 Auftragscode: n = (sitzung<<15)|(art<<14)|(index<<8)|variante, 4 Nutzzeichen + 2 Prüfzeichen --- */
K.auftragZahl = f => ((f.sitzung & 31) << 15) | ((f.art & 1) << 14) | ((f.index & 63) << 8) | (f.variante & 255);
K.auftragWerte = n => [n >>> 15 & 31, n >>> 10 & 31, n >>> 5 & 31, n & 31];
K.auftragDrucken = function(f){
  const w = K.auftragWerte(K.auftragZahl(f)), p = K.pruefsummen(w);
  const z = w.map(K.zeichen).join("") + K.zeichen(p.c1) + K.zeichen(p.c2);
  return "NL-" + z.slice(0, 4) + "-" + z.slice(4);
};

/* --- § 4 Ergebnis-Code: n = (sitzung<<20)|(platz<<15)|(sterne<<11)|(versuche<<9)|dauer, 25 Bit --- */
K.ergebnisZahl = f => ((f.sitzung & 31) << 20) | ((f.platz & 31) << 15) | ((f.halbe & 15) << 11) | ((f.versuche & 3) << 9) | (f.einheiten & 511);
K.ergebnisWerte = n => [n >>> 20 & 31, n >>> 15 & 31, n >>> 10 & 31, n >>> 5 & 31, n & 31];
K.ergebnisFelder = n => ({sitzung: n >>> 20 & 31, platz: n >>> 15 & 31, halbe: n >>> 11 & 15, versuche: n >>> 9 & 3, einheiten: n & 511});
K.ergebnisDrucken = function(f){
  const w = K.ergebnisWerte(K.ergebnisZahl(f)), p = K.pruefsummen(w);
  const z = w.map(K.zeichen).join("") + K.zeichen(p.c1) + K.zeichen(p.c2);
  return "E-" + z.slice(0, 4) + "-" + z.slice(4);
};

/* --- § 7 Tabellen: Reihenfolge aus dem Programm (die eingefrorene Literalliste gehört nach src/) --- */
const TABELLE_AUFTRAEGE = Spiel.ticketReihe().map(t => t.id);
const TABELLE_SKILLS = (DATEN.skills || []).map(s => s.id);

/* --- § 5 Kanonisierung: gleiche Schleife auf jedem Gerät --- */
K.kanonHand = function(def, seedStart){
  if (!def) return {fehler: "auftrag", grund: "Diesen Auftrag gibt es in dieser Fassung nicht."};
  if (typeof def.fuerSeed !== "function")
    return {fehler: "fassung", grund: "Dieser Auftrag kennt keine Seed-Fassungen (fuerSeed fehlt)."};
  for (let k = 0; k < KANON_FENSTER; k++){
    const s = seedStart + k;
    let d = null;
    try { d = def.fuerSeed(s); } catch (e) { d = null; }
    if (d && d !== def && Spiel.ticketGueltig(d)) return {seed: s, def: d, eigene: true, schritte: k};
  }
  let d0 = null;
  try { d0 = def.fuerSeed(seedStart); } catch (e) { d0 = null; }
  if (d0 && Spiel.ticketGueltig(d0)) return {seed: seedStart, def: d0, eigene: false, schritte: KANON_FENSTER};
  return {fehler: "fassung", grund: "Aus diesem Code lässt sich hier kein spielbarer Auftrag bauen."};
};
K.kanonGeneriert = function(skill, seedStart){
  for (let k = 0; k < KANON_FENSTER; k++){
    let d = null;
    try { d = Spiel.generiere(skill, seedStart + k); } catch (e) { d = null; }
    if (d && Spiel.ticketGueltig(d)) return {seed: seedStart + k, def: d, schritte: k};
  }
  return {fehler: "fassung", grund: "Aus diesem Code lässt sich hier kein spielbarer Auftrag bauen."};
};

/* --- aucode/ausCode: Auftragscode lesen (§ 3, § 5, § 7, § 8) --- */
K.ausCode = function(roh){
  const n = K.normalisiere(roh, "auftrag");
  if (n.leer) return null;
  if (n.fehler) return {fehler: n.fehler, grund: n.grund};
  const [z0, z1, z2, z3] = n.nutz;
  const zahl = (z0 << 15) | (z1 << 10) | (z2 << 5) | z3;
  const sitzung = zahl >>> 15 & 31, artBit = zahl >>> 14 & 1, index = zahl >>> 8 & 63, variante = zahl & 255;
  /* § 7 (c): freie Indizes (Aufträge 58..63, Fertigkeiten 27..63) → fassung */
  const tabelle = artBit ? TABELLE_SKILLS : TABELLE_AUFTRAEGE;
  if (index >= tabelle.length)
    return {fehler: "fassung", grund: `Index ${index} liegt außerhalb dieser Fassung (${artBit ? "Fertigkeiten" : "Aufträge"}: 0..${tabelle.length - 1}).`};
  const id = tabelle[index];
  const seedStart = variante + 1;
  if (artBit){
    const skill = id;
    if (!(DATEN.skills || []).some(s => s.id === skill))
      return {fehler: "auftrag", grund: `Diese Fertigkeit gibt es in dieser Fassung nicht: ${skill}.`};
    const kanon = K.kanonGeneriert(skill, seedStart);
    if (kanon.fehler) return kanon;
    return {ticketId: kanon.def.id, seed: kanon.seed, art: "generiert", skill, sitzung, index, variante, schritte: kanon.schritte, code: n.gedruckt};
  }
  const def = (DATEN.tickets || []).find(t => t.id === id);
  if (!def) return {fehler: "auftrag", grund: `Diesen Auftrag gibt es in dieser Fassung nicht: ${id}.`};
  const kanon = K.kanonHand(def, seedStart);
  if (kanon.fehler) return kanon;
  return {ticketId: id, seed: kanon.seed, art: "hand", sitzung, index, variante, eigene: kanon.eigene, schritte: kanon.schritte, code: n.gedruckt};
};

/* --- erzeugen(§ 3, § 5, § 9): legt die Sitzung in store "klassenraum" an --- */
K.SPEICHER_FELDER = ["fassung", "programm", "platz", "zuletzt", "sitzung", "letzte"];                       /* § 9 */
K.SITZUNG_FELDER = ["id", "titel", "art", "ticketId", "skill", "index", "variante", "seed", "code", "eigene", "dauerMin", "erstellt", "ergebnisse"];
K.SATZ_FELDER = ["platz", "sterne", "dauerS", "versuche", "code", "zeit", "quelle"];

K.erzeugen = function(o){
  if (o === null || o === undefined || typeof o !== "object" || Array.isArray(o))
    return {fehler: "eingabe", grund: "erzeugen erwartet ein Objekt: {ticketId} oder {skill}."};
  const hatTicket = typeof o.ticketId === "string" && o.ticketId.length > 0;
  const hatSkill = typeof o.skill === "string" && o.skill.length > 0;
  if (hatTicket === hatSkill) return {fehler: "wahl", grund: "Bitte genau einen Auftrag oder eine Fertigkeit wählen."};
  let index, art, ticketId = null, skill = null, basis = null;
  if (hatTicket){
    index = TABELLE_AUFTRAEGE.indexOf(o.ticketId);
    if (index < 0) return {fehler: "auftrag", grund: `Diesen Auftrag gibt es in dieser Fassung nicht: ${o.ticketId}.`};
    art = "hand"; ticketId = o.ticketId;
    basis = (DATEN.tickets || []).find(t => t.id === ticketId) || null;
  } else {
    index = TABELLE_SKILLS.indexOf(o.skill);
    if (index < 0) return {fehler: "auftrag", grund: `Diese Fertigkeit gibt es in dieser Fassung nicht: ${o.skill}.`};
    art = "generiert"; skill = o.skill;
  }
  const dauerMin = o.dauerMin === undefined ? 10 : o.dauerMin;
  if (typeof dauerMin !== "number" || !isFinite(dauerMin) || dauerMin < 1 || dauerMin > 600)
    return {fehler: "eingabe", grund: "dauerMin muss eine Zahl zwischen 1 und 600 sein."};
  if (o.titel !== undefined && typeof o.titel !== "string") return {fehler: "eingabe", grund: "titel muss eine Zeichenkette sein."};
  /* Sitzungskennung 1..31 und Variante 0..255: fester Seed hält die Probe wiederholbar (§ 3) */
  const z = Zufall(typeof o.seed === "string" || typeof o.seed === "number" ? o.seed : PROBE_SEED);
  const id = z.zwischen(1, 31);
  const variante = z.zwischen(0, 255);
  const seedStart = variante + 1;
  const kanon = art === "hand" ? K.kanonHand(basis, seedStart) : K.kanonGeneriert(skill, seedStart);
  if (kanon.fehler) return {fehler: kanon.fehler, grund: kanon.grund};
  const code = K.auftragDrucken({sitzung: id, art: art === "generiert" ? 1 : 0, index, variante});
  const titel = typeof o.titel === "string" && o.titel
    ? o.titel
    : (kanon.def && kanon.def.titel) || (art === "generiert" ? ((DATEN.skills || []).find(s => s.id === skill) || {}).name : ticketId) || "Klassenraum-Auftrag";
  const sitzung = {
    id, titel, art, ticketId: art === "hand" ? ticketId : null, skill: art === "generiert" ? skill : null,
    index, variante, seed: kanon.seed, code, eigene: !!kanon.eigene, dauerMin, erstellt: jetzt(), ergebnisse: {},
  };
  const alt = store.get("klassenraum", null) || {};
  store.set("klassenraum", {
    fassung: 1, programm: LABOR_VERSION,
    platz: typeof alt.platz === "number" ? alt.platz : null,        /* eigener Platz dieses Geräts bleibt */
    zuletzt: jetzt(), sitzung, letzte: null,
  });
  return sitzung;
};

/* --- sitzung(): aktuelle Sitzung aus dem Speicher (§ 9) --- */
K.sitzung = function(){
  const k = store.get("klassenraum", null);
  return k && k.sitzung && typeof k.sitzung === "object" && !Array.isArray(k.sitzung) ? k.sitzung : null;
};

/* --- ergebnisCode(inst, abnahme): Werte aus der Wirklichkeit, § 4 --- */
const zeige = x => typeof x === "number" && !isFinite(x) ? String(x) : JSON.stringify(x);
K.ergebnisCode = function(inst, abnahme){
  if (!inst || typeof inst !== "object") return {fehler: "eingabe", grund: "Ohne Auftragsinstanz gibt es keinen Ergebnis-Code."};
  const kr = inst.klassenraum;
  if (!kr || typeof kr !== "object" || Array.isArray(kr))
    return {fehler: "sitzung", grund: "Zu diesem Auftrag läuft keine Sitzung (inst.klassenraum fehlt) – es gibt keinen Ergebnis-Code."};
  if (!Number.isInteger(kr.sitzung) || kr.sitzung < 1 || kr.sitzung > 31)
    return {fehler: "sitzung", grund: `inst.klassenraum.sitzung muss eine Sitzungskennung 1..31 sein (ist: ${zeige(kr.sitzung)}).`};
  if (!Number.isInteger(kr.platz) || kr.platz < 0 || kr.platz > 31)
    return {fehler: "platz", grund: `inst.klassenraum.platz muss 0..31 sein (ist: ${zeige(kr.platz)}).`};
  if (!abnahme || typeof abnahme !== "object") return {fehler: "abnahme", grund: "Ohne Abnahme gibt es kein Ergebnis."};
  if (abnahme.bestanden !== true) return {fehler: "abnahme", grund: "Der Auftrag ist nicht bestanden – es gibt keinen Ergebnis-Code."};
  const sterne = abnahme.sterne;
  if (typeof sterne !== "number" || !isFinite(sterne) || sterne < 0 || sterne > 5)
    return {fehler: "sterne", grund: `abnahme.sterne muss eine Zahl 0..5 sein (ist: ${zeige(sterne)}).`};
  const halbe = Math.max(0, Math.min(10, Math.round(sterne * 2)));              /* 4 Bit: 0..10 halbe Sterne */
  const versuche = Math.max(0, Math.min(3, (inst.abnahmen || 1) - 1));           /* 2 Bit: 0..3, „3+" */
  const dauerS = Math.max(0, Math.min(5110, Math.round((inst.zeitMs || 0) / 1000)));
  const einheiten = Math.max(0, Math.min(511, Math.round(dauerS / 10)));         /* 9 Bit: Einheiten à 10 s */
  return K.ergebnisDrucken({sitzung: kr.sitzung, platz: kr.platz, halbe, versuche, einheiten});
};

/* --- ergebnisLesen(code) --- */
K.ergebnisLesen = function(roh){
  const n = K.normalisiere(roh, "ergebnis");
  if (n.leer) return null;
  if (n.fehler) return {fehler: n.fehler, grund: n.grund};
  const zahl = n.nutz.reduce((a, v) => a * 32 + v, 0);
  const f = K.ergebnisFelder(zahl);
  return {ok: true, sitzung: f.sitzung, platz: f.platz, sterne: f.halbe / 2, versuche: f.versuche,
          dauerS: f.einheiten * 10, halbeSterne: f.halbe, dauerEinheiten: f.einheiten, code: n.gedruckt};
};

/* --- ergebnisEintragen(code) → {ok, neu} | {fehler}, idempotent (§ 9) --- */
K.ergebnisEintragen = function(roh){
  const gelesen = K.ergebnisLesen(roh);
  if (gelesen === null) return {fehler: "leer", grund: "Es wurde kein Ergebnis-Code eingegeben."};
  if (gelesen.fehler) return {fehler: gelesen.fehler, grund: gelesen.grund};
  const k = store.get("klassenraum", null);
  if (!k || !k.sitzung) return {fehler: "sitzung", grund: "Es läuft keine Sitzung – Ergebnis-Code nicht angenommen."};
  const s = k.sitzung;
  if (gelesen.sitzung !== s.id)
    return {fehler: "sitzung", grund: `Dieser Ergebnis-Code gehört zu Sitzung ${gelesen.sitzung} – hier läuft Sitzung ${s.id}.`};
  const schluessel = String(gelesen.platz);
  const alt = s.ergebnisse ? s.ergebnisse[schluessel] : undefined;
  if (alt && alt.code === gelesen.code) return {ok: true, neu: false};          /* derselbe Code: nichts ändern */
  const satz = {platz: gelesen.platz, sterne: gelesen.sterne, dauerS: gelesen.dauerS, versuche: gelesen.versuche,
                code: gelesen.code, zeit: jetzt(), quelle: "klassenraum"};
  if (!s.ergebnisse || typeof s.ergebnisse !== "object" || Array.isArray(s.ergebnisse)) s.ergebnisse = {};
  s.ergebnisse[schluessel] = satz;
  k.zuletzt = jetzt();
  k.letzte = gelesen.code;
  store.set("klassenraum", k);
  return alt ? {ok: true, neu: true, ersetzt: true} : {ok: true, neu: true};
};

/* --- Blockeingabe: mehrere Codes durch Leerzeichen/Zeilenumbruch/Komma/Semikolon getrennt → je Code ein Ergebnis.
       WICHTIG: Bindestriche trennen NICHT — sie gehören zum Code (E-XXXX-XXX). --- */
K.ergebnisEintragenBlock = function(text){
  const roh = String(text == null ? "" : text).split(/[\s,;]+/).filter(t => t.replace(/[^0-9A-Za-z]/g, "").length > 1);
  const teile = [];
  for (const t of roh){
    const r = K.ergebnisEintragen(t);
    teile.push({eingabe: t, ergebnis: r});
  }
  return {anzahl: teile.length, angenommen: teile.filter(t => t.ergebnis && t.ergebnis.ok).length, teile};
};

/* --- exportieren()/importieren() (§ 9) --- */
K.exportieren = function(){
  const k = store.get("klassenraum", null);
  if (!k || !k.sitzung) return null;                       /* nichts zu exportieren */
  return JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, programm: LABOR_VERSION, zeit: jetzt(), sitzung: k.sitzung});
};

/* Sitzung in die § 9-Form bringen (fehlende Felder ergänzen = Migration); unbekannte Felder bleiben erhalten. */
K.sitzungMigrieren = function(s){
  const raus = {};
  const setze = (feld, wert) => { raus[feld] = wert; };
  setze("id", s.id);
  setze("titel", typeof s.titel === "string" ? s.titel : "Klassenraum-Auftrag");
  setze("art", s.art === "generiert" ? "generiert" : "hand");
  setze("ticketId", s.ticketId === undefined ? null : s.ticketId);
  setze("skill", s.skill === undefined ? null : s.skill);
  setze("index", Number.isInteger(s.index) ? s.index : 0);
  setze("variante", Number.isInteger(s.variante) ? s.variante : 0);
  setze("seed", Number.isInteger(s.seed) ? s.seed : 1);
  setze("code", typeof s.code === "string" ? s.code : "");
  setze("eigene", !!s.eigene);
  setze("dauerMin", typeof s.dauerMin === "number" ? s.dauerMin : 10);
  setze("erstellt", typeof s.erstellt === "number" ? s.erstellt : jetzt());
  const ergebnisse = {};
  for (const [schluessel, satz] of Object.entries(s.ergebnisse || {})){
    ergebnisse[schluessel] = {
      platz: satz.platz, sterne: satz.sterne, dauerS: satz.dauerS, versuche: satz.versuche,
      code: satz.code, zeit: satz.zeit, quelle: typeof satz.quelle === "string" ? satz.quelle : "klassenraum",
    };
    for (const [f, w] of Object.entries(satz)) if (!(f in ergebnisse[schluessel])) ergebnisse[schluessel][f] = w;
  }
  setze("ergebnisse", ergebnisse);
  for (const [f, w] of Object.entries(s)) if (!(f in raus)) raus[f] = w;
  return raus;
};

K.importieren = function(text){
  if (text === null || text === undefined) return {fehler: "leer", grund: "Es wurde kein Text übergeben."};
  if (typeof text !== "string") return {fehler: "eingabe", grund: "importieren erwartet den Text der Datei (String)."};
  const sauber = text.replace(/^\uFEFF/, "").trim();            /* BOM und Leerraum weg (Windows-Editoren) */
  if (!sauber) return {fehler: "leer", grund: "Die Datei ist leer."};
  let d = null;
  try { d = JSON.parse(sauber); }
  catch (e) { return {fehler: "json", grund: "Das ist keine JSON-Datei: " + String((e && e.message) || e)}; }
  if (!d || typeof d !== "object" || Array.isArray(d))
    return {fehler: "format", grund: "Das ist keine Klassenraum-Sitzung (kein Objekt)."};
  if (d.format !== "netzwerk-labor/klassenraum")
    return {fehler: "format", grund: d.format === undefined
      ? 'Das Feld "format" fehlt – erwartet wird "netzwerk-labor/klassenraum".'
      : `Fremdes Format: ${JSON.stringify(d.format)} – erwartet wird "netzwerk-labor/klassenraum".`};
  const fassung = d.fassung === undefined ? 0 : d.fassung;
  if (typeof fassung !== "number" || !Number.isInteger(fassung) || fassung < 0)
    return {fehler: "fassung", grund: `Das Fassungsfeld ist keine ganze Zahl (ist: ${JSON.stringify(d.fassung)}).`};
  if (fassung > 1)
    return {fehler: "fassung", grund: `Diese Datei stammt aus einer neueren Fassung (${fassung}); dieses Programm kennt nur Fassung 1.`};
  const s = d.sitzung;
  if (s === null || s === undefined) return {fehler: "sitzung", grund: "Die Datei enthält keine Sitzung."};
  if (typeof s !== "object" || Array.isArray(s)) return {fehler: "sitzung", grund: "Das Sitzungsfeld ist kein Objekt (weder Array noch Zahl)."};
  if (!Number.isInteger(s.id) || s.id < 1 || s.id > 31)
    return {fehler: "sitzung", grund: `Die Sitzung braucht eine Kennung id 1..31 (ist: ${JSON.stringify(s.id)}).`};
  let ergebnisse = s.ergebnisse === undefined || s.ergebnisse === null ? {} : s.ergebnisse;
  if (typeof ergebnisse !== "object" || Array.isArray(ergebnisse))
    return {fehler: "ergebnisse", grund: "ergebnisse muss eine Abbildung platz → Satz sein (kein Array, kein Text)."};
  for (const [schluessel, satz] of Object.entries(ergebnisse)){
    if (!satz || typeof satz !== "object" || Array.isArray(satz))
      return {fehler: "ergebnisse", grund: `Der Eintrag zu Platz ${schluessel} ist kein Satz.`};
    if (!Number.isInteger(satz.platz) || satz.platz < 0 || satz.platz > 31)
      return {fehler: "ergebnisse", grund: `Der Eintrag zu Platz ${schluessel} hat keinen gültigen platz (0..31).`};
    if (String(satz.platz) !== schluessel)
      return {fehler: "ergebnisse", grund: `Der Eintrag zu Platz ${schluessel} nennt platz ${satz.platz} – Schlüssel und Feld müssen gleich sein.`};
    if (typeof satz.sterne !== "number" || !isFinite(satz.sterne) || satz.sterne < 0 || satz.sterne > 5)
      return {fehler: "ergebnisse", grund: `Der Eintrag zu Platz ${schluessel} hat ungültige sterne.`};
    if (typeof satz.dauerS !== "number" || !isFinite(satz.dauerS) || satz.dauerS < 0 || satz.dauerS > 5110)
      return {fehler: "ergebnisse", grund: `Der Eintrag zu Platz ${schluessel} hat eine dauerS außerhalb 0..5110.`};
    if (!Number.isInteger(satz.versuche) || satz.versuche < 0 || satz.versuche > 3)
      return {fehler: "ergebnisse", grund: `Der Eintrag zu Platz ${schluessel} hat versuche außerhalb 0..3.`};
    if (typeof satz.code !== "string" || !satz.code) return {fehler: "ergebnisse", grund: `Der Eintrag zu Platz ${schluessel} hat keinen code.`};
  }
  const alt = store.get("klassenraum", null) || {};
  const sitzung = K.sitzungMigrieren(Object.assign({}, s, {ergebnisse}));
  store.set("klassenraum", {
    fassung: 1, programm: LABOR_VERSION,
    platz: typeof alt.platz === "number" ? alt.platz : null,
    zuletzt: jetzt(), sitzung, letzte: null,
  });
  const raus = {ok: true, sitzung};
  if (d.programm !== undefined && d.programm !== LABOR_VERSION) raus.fremdesProgramm = d.programm;
  if (fassung < 1) raus.migriert = {von: fassung, nach: 1};
  return raus;
};

/* =====================================================================================
   Netzkennwert nach § 6 — nur als Gleichheitszeuge (die verbindliche Fassung gehört nach
   src/spiel/klassenraum.js; hier bewusst dieselbe Rechnung auf beiden Vergleichsseiten).
   ===================================================================================== */
function kanonisch(x){
  if (Array.isArray(x)) return x.map(kanonisch);
  if (x && typeof x === "object"){
    const o = {};
    for (const f of Object.keys(x).sort()) o[f] = kanonisch(x[f]);
    return o;
  }
  return x;
}
function fnv1a32(text){
  const bytes = Buffer.from(text, "utf8");
  let h = 2166136261;
  for (const b of bytes){ h ^= b; h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function netzkennwert(netz){
  const geraete = {};
  for (const id of Object.keys(netz.geraete).sort()) geraete[id] = netz.geraete[id];
  const kabel = (netz.kabel || []).map(k => ({id: k.id, a: {geraet: k.a.geraet, port: k.a.port}, b: {geraet: k.b.geraet, port: k.b.port}}))
    .sort((x, y) => (x.a.geraet + "\u0000" + x.a.port + "\u0000" + x.b.geraet + "\u0000" + x.b.port + "\u0000" + x.id)
                 .localeCompare(y.a.geraet + "\u0000" + y.a.port + "\u0000" + y.b.geraet + "\u0000" + y.b.port + "\u0000" + y.id));
  const text = JSON.stringify(kanonisch({geraete, kabel}));           /* netz.zustand bleibt draußen */
  const h = fnv1a32(text) & 0x3FFFFFFF;
  let raus = "";
  for (let i = 5; i >= 0; i--) raus += ALPHABET[(h >>> (5 * i)) & 31];
  return raus;
}

/* =====================================================================================
   Block 1 · Ergebnis-Code E-XXXX-XXX: Bit-Packung, Round-Trip, Länge, Laufzeit
   ===================================================================================== */
function block1(){
  const t0 = Date.now();
  const felderGleich = (a, b) => a.sitzung === b.sitzung && a.platz === b.platz && a.halbe === b.halbe && a.versuche === b.versuche && a.einheiten === b.einheiten;
  const laengen = {min: Infinity, max: 0, groesser10: 0};
  let geprueft = 0, fehlschlaege = 0, ueber25Bit = 0, kuerzesteProbe = null, ersteBeispiele = [];

  function einLauf(f, zaehleLaenge){
    const zahl = K.ergebnisZahl(f);
    const code = K.ergebnisDrucken(f);
    const gelesen = K.ergebnisLesen(code);
    const rueck = gelesen && gelesen.ok ? {sitzung: gelesen.sitzung, platz: gelesen.platz, halbe: gelesen.halbeSterne, versuche: gelesen.versuche, einheiten: gelesen.dauerEinheiten} : null;
    const gut = !!rueck && felderGleich(rueck, f) && ZahlGleich(zahl, f);
    if (!gut) fehlschlaege++;
    if (zahl >= 33554432) ueber25Bit++;
    geprueft++;
    if (zaehleLaenge){
      if (code.length < laengen.min){ laengen.min = code.length; kuerzesteProbe = code; }
      if (code.length > laengen.max) laengen.max = code.length;
      if (code.length > 10) laengen.groesser10++;
    }
    if (ersteBeispiele.length < 4) ersteBeispiele.push({felder: f, code});
    return code;
  }
  function ZahlGleich(zahl, f){
    return zahl === ((f.sitzung << 20) | (f.platz << 15) | (f.halbe << 11) | (f.versuche << 9) | f.einheiten);
  }

  /* (a) alle Randwert-Kombinationen der fünf Felder */
  const rand = {sitzung: [0, 1, 31], platz: [0, 1, 30, 31], halbe: [0, 1, 9, 10], versuche: [0, 1, 2, 3], einheiten: [0, 1, 510, 511]};
  let randKombis = 0;
  for (const sitzung of rand.sitzung) for (const platz of rand.platz) for (const halbe of rand.halbe)
    for (const versuche of rand.versuche) for (const einheiten of rand.einheiten){
      einLauf({sitzung, platz, halbe, versuche, einheiten}, true); randKombis++;
    }
  const randFehlschlaege = fehlschlaege;

  /* (b) 200.000 Zufallskombinationen, alle Felder im gültigen Bereich */
  const z = Zufall("A-api:block1");
  const N = 200000;
  const t1 = Date.now();
  const codes = new Map();
  for (let i = 0; i < N; i++){
    const f = {sitzung: z.zahl(32), platz: z.zahl(32), halbe: z.zahl(11), versuche: z.zahl(4), einheiten: z.zahl(512)};
    const code = einLauf(f, true);
    if (i % 1000 === 0) codes.set(code, (codes.get(code) || 0) + 1);
  }
  const zufallMs = Date.now() - t1;
  const gesamtMs = Date.now() - t0;

  /* (c) Schreibweisen: derselbe Code klein/ohne Striche */
  let schreibweisenGeprueft = 0, schreibweisenFehler = 0;
  const zz = Zufall("A-api:block1b");
  for (let i = 0; i < 2000; i++){
    const f = {sitzung: zz.zahl(32), platz: zz.zahl(32), halbe: zz.zahl(11), versuche: zz.zahl(4), einheiten: zz.zahl(512)};
    const code = K.ergebnisDrucken(f);
    const g = K.ergebnisLesen(code.toLowerCase().replace(/-/g, ""));
    schreibweisenGeprueft++;
    if (!g || !g.ok || g.sitzung !== f.sitzung || g.platz !== f.platz || g.halbeSterne !== f.halbe || g.versuche !== f.versuche || g.dauerEinheiten !== f.einheiten) schreibweisenFehler++;
  }
  /* (d) Code ohne führendes E (7 Zeichen) — die Festlegung schneidet E nur ab, wenn danach 7 übrig bleiben */
  const ohneKopf = K.ergebnisLesen(K.ergebnisDrucken({sitzung: 7, platz: 3, halbe: 9, versuche: 1, einheiten: 40}).slice(2).replace("-", ""));
  /* (e) Fassungsstrenge: derselbe Nutzinhalt mit anderem Prüfzeichen wird abgewiesen */
  const gueltig = K.ergebnisDrucken({sitzung: 7, platz: 3, halbe: 9, versuche: 1, einheiten: 40});
  const fremdPruef = gueltig.slice(0, -1) + (gueltig.slice(-1) === "A" ? "B" : "A");

  gleich("Block1: Randwert-Kombinationen ohne Fehlschlag", randFehlschlaege === 0, randFehlschlaege, 0);
  gleich("Block1: 200.000 Zufallskombinationen ohne Fehlschlag", fehlschlaege - randFehlschlaege === 0, fehlschlaege - randFehlschlaege, 0);
  gleich("Block1: alle Nutzlasten < 2^25", ueber25Bit === 0, ueber25Bit, 0);
  gleich("Block1: Länge immer 10 (min=max=10)", laengen.min === 10 && laengen.max === 10, laengen, {min: 10, max: 10});
  gleich("Block1: Anzahl Codes länger als 10", laengen.groesser10 === 0, laengen.groesser10, 0);
  gleich("Block1: Schreibweisen klein/ohne Striche", schreibweisenFehler === 0, schreibweisenFehler, 0);
  muss("Block1: Code ohne führendes E lesbar", !!ohneKopf && ohneKopf.ok === true && ohneKopf.sitzung === 7, ohneKopf, {sitzung: 7});
  muss("Block1: falsches Prüfzeichen wird abgewiesen", !!(K.ergebnisLesen(fremdPruef) || {}).fehler, K.ergebnisLesen(fremdPruef), {fehler: "prüfziffer"});

  return {
    bits: {nutzlast: 25, pruefsumme: 10, gesamt: 35, zeichen: 7, gedrucktInklTrennstriche: 10},
    felder: {sitzung: 5, platz: 5, sterne: 4, versuche: 2, dauer: 9},
    moeglicheNutzlasten: 32 * 32 * 11 * 4 * 512,
    randwertKombinationen: randKombis,
    zufallsKombinationen: N,
    geprueft: geprueft,
    fehlschlaege: fehlschlaege,
    nutzlastUeber25Bit: ueber25Bit,
    laenge: {min: laengen.min, max: laengen.max, anzahlGroesser10: laengen.groesser10, kuerzeste: kuerzesteProbe},
    schreibweisen: {geprueft: schreibweisenGeprueft, fehler: schreibweisenFehler},
    ohneFuehrendesE: ohneKopf,
    beispiele: ersteBeispiele,
    laufzeitMs: {randwerteUndZufall: gesamtMs, davonZufall200k: zufallMs},
  };
}

/* =====================================================================================
   Block 2 · Prüfsumme: 5.000 Ein-Zeichen-Mutationen, Fehlerklassen, Grenzfälle A↔9 / 31
   ===================================================================================== */
function block2(){
  const t0 = Date.now();
  const z = Zufall("A-api:block2");
  const zufallsFelder = () => ({sitzung: z.zahl(32), platz: z.zahl(32), halbe: z.zahl(11), versuche: z.zahl(4), einheiten: z.zahl(512)});
  const BUCHSTABEN = [...ALPHABET].filter(c => /[A-Z]/.test(c));
  const ZIFFERN = [...ALPHABET].filter(c => /[0-9]/.test(c));
  const arten = ["ersetzen", "vertauschen", "buchstabe_ziffer"];
  const zaehler = {};
  for (const a of arten) zaehler[a] = {geprueft: 0, erkannt: 0, klassen: {}, positionen: {nutz: {geprueft: 0, erkannt: 0}, pruef: {geprueft: 0, erkannt: 0}}, differenz31: 0, beispiele: []};
  zaehler.vertauschen_nutz_pruef = {geprueft: 0, erkannt: 0, klassen: {}, differenz31: 0, beispiele: []};
  let unerkannt = [], uebersprungen = 0;

  for (let i = 0; i < 5000; i++){
    const art = i % 3 === 0 ? "ersetzen" : i % 3 === 1 ? "vertauschen" : "buchstabe_ziffer";
    const f = zufallsFelder();
    const code = K.ergebnisDrucken(f);
    const rumpf = code.replace(/-/g, "").slice(1);            /* 7 Zeichen: 5 Nutz + 2 Prüf */
    const zeichen = [...rumpf];
    const e = zaehler[art];
    let mutiert = null, diff31 = false, gruppe = null;
    if (art === "ersetzen" || art === "buchstabe_ziffer"){
      let pos;
      if (art === "buchstabe_ziffer"){
        const stellen = zeichen.map((c, n) => ({c, n})).filter(x => /[A-Z]/.test(x.c) || /[0-9]/.test(x.c));
        const buchstabenStellen = stellen.filter(x => /[A-Z]/.test(x.c));
        const ziffernStellen = stellen.filter(x => /[0-9]/.test(x.c));
        const vonBuchstabe = buchstabenStellen.length && z.zahl(2) === 0;
        const quelle = vonBuchstabe ? buchstabenStellen : (ziffernStellen.length ? ziffernStellen : buchstabenStellen);
        pos = quelle[z.zahl(quelle.length)].n;
        const alt = zeichen[pos];
        const ziel = /[A-Z]/.test(alt) ? ZIFFERN.filter(c => c !== alt) : BUCHSTABEN.filter(c => c !== alt);
        zeichen[pos] = ziel[z.zahl(ziel.length)];
        diff31 = Math.abs(ALPHABET.indexOf(zeichen[pos]) - ALPHABET.indexOf(alt)) === 31;
      } else {
        pos = z.zahl(7);
        const alt = zeichen[pos];
        const ziel = [...ALPHABET].filter(c => c !== alt);
        zeichen[pos] = ziel[z.zahl(ziel.length)];
        diff31 = Math.abs(ALPHABET.indexOf(zeichen[pos]) - ALPHABET.indexOf(alt)) === 31;
      }
      gruppe = pos < 5 ? "nutz" : "pruef";
    } else {
      /* Nachbarvertauschung INNERHALB der Nutzzeichen (§ 2). Nur Stellen mit ZWEI VERSCHIEDENEN Zeichen:
         das Vertauschen gleicher Zeichen ändert den Code nicht und ist keine Mutation. */
      const kandidaten = [0, 1, 2, 3].filter(p => zeichen[p] !== zeichen[p + 1]);
      if (!kandidaten.length){ uebersprungen++; continue; }
      const pos = kandidaten[z.zahl(kandidaten.length)];
      const a = zeichen[pos], b = zeichen[pos + 1];
      zeichen[pos] = b; zeichen[pos + 1] = a;
      diff31 = Math.abs(ALPHABET.indexOf(a) - ALPHABET.indexOf(b)) === 31;
      gruppe = "nutz";
    }
    mutiert = zeichen.join("");
    const gedruckt = "E-" + mutiert.slice(0, 4) + "-" + mutiert.slice(4);
    const gelesen = K.ergebnisLesen(gedruckt);
    const erkannt = !!(gelesen && gelesen.fehler);
    e.geprueft++;
    if (erkannt){
      e.erkannt++;
      const klasse = gelesen.fehler;
      e.klassen[klasse] = (e.klassen[klasse] || 0) + 1;
      if (gruppe) { e.positionen[gruppe].geprueft++; e.positionen[gruppe].erkannt++; }
    } else {
      if (gruppe) e.positionen[gruppe].geprueft++;
      if (unerkannt.length < 5) unerkannt.push({art, original: code, mutiert: gedruckt, gelesen});
    }
    if (diff31) e.differenz31++;
    if (e.beispiele.length < 3) e.beispiele.push({original: code, mutiert: gedruckt, klasse: erkannt ? gelesen.fehler : null});
  }

  /* Vierter Fall (Zusatz): Vertauschung Nutzzeichen ↔ Prüfzeichen — nicht der Fall aus § 2, aber ein Tippfehler */
  for (let i = 0; i < 1000; i++){
    const f = zufallsFelder();
    const code = K.ergebnisDrucken(f);
    const zeichen = [...code.replace(/-/g, "").slice(1)];
    if (zeichen[4] === zeichen[5]){ uebersprungen++; continue; }     /* gleiche Zeichen: keine Änderung */
    const a = zeichen[4], b = zeichen[5];
    zeichen[4] = b; zeichen[5] = a;
    const mutiert = zeichen.join("");
    const gedruckt = "E-" + mutiert.slice(0, 4) + "-" + mutiert.slice(4);
    const gelesen = K.ergebnisLesen(gedruckt);
    const erkannt = !!(gelesen && gelesen.fehler);
    const e = zaehler.vertauschen_nutz_pruef;
    e.geprueft++;
    if (erkannt){ e.erkannt++; e.klassen[gelesen.fehler] = (e.klassen[gelesen.fehler] || 0) + 1; }
    if (e.beispiele.length < 2) e.beispiele.push({original: code, mutiert: gedruckt, klasse: erkannt ? gelesen.fehler : null});
  }

  /* Kontrollgruppe: 5.000 gültige Codes dürfen NICHT abgewiesen werden */
  let kontrolle = 0, kontrolleFehler = 0;
  for (let i = 0; i < 5000; i++){
    const f = zufallsFelder();
    const g = K.ergebnisLesen(K.ergebnisDrucken(f));
    kontrolle++;
    if (!g || !g.ok) kontrolleFehler++;
  }

  /* Grenzfall 1: A↔9 als Einzel-Ersetzung — Wertdifferenz 31. C1 ändert sich nicht (31 ≡ 0 mod 31), nur C2. */
  const fA = {sitzung: 0, platz: 5, halbe: 4, versuche: 1, einheiten: 100};      /* z0 = 0 = 'A' */
  const codeA = K.ergebnisDrucken(fA);
  const rumpfA = codeA.replace(/-/g, "").slice(1);
  const werteA = [...rumpfA].map(K.wert);
  const pA = K.pruefsummen(werteA.slice(0, 5));
  const ersetztA = "9" + rumpfA.slice(1);
  const werteA2 = [...ersetztA].map(K.wert);
  const pA2 = K.pruefsummen(werteA2.slice(0, 5));
  const gelesenA = K.ergebnisLesen("E-" + ersetztA.slice(0, 4) + "-" + ersetztA.slice(4));
  const grenzeA = {
    original: codeA, mutiert: "E-" + ersetztA.slice(0, 4) + "-" + ersetztA.slice(4),
    wertVorher: 0, wertNachher: ALPHABET.indexOf("9"), differenz: 31,
    C1Vorher: pA.c1, C1Nachher: pA2.c1, C2Vorher: pA.c2, C2Nachher: pA2.c2,
    C1Gleich: pA.c1 === pA2.c1, C2Gleich: pA.c2 === pA2.c2,
    ergebnis: gelesenA,
  };
  /* Gegenrichtung 9→A */
  const f9 = {sitzung: 31, platz: 5, halbe: 4, versuche: 1, einheiten: 100};     /* z0 = 31 = '9' */
  const code9 = K.ergebnisDrucken(f9);
  const rumpf9 = code9.replace(/-/g, "").slice(1);
  const p9 = K.pruefsummen([...rumpf9].map(K.wert).slice(0, 5));
  const ersetzt9 = "A" + rumpf9.slice(1);
  const p92 = K.pruefsummen([...ersetzt9].map(K.wert).slice(0, 5));
  const grenze9 = {
    original: code9, mutiert: "E-" + ersetzt9.slice(0, 4) + "-" + ersetzt9.slice(4),
    C1Vorher: p9.c1, C1Nachher: p92.c1, C2Vorher: p9.c2, C2Nachher: p92.c2,
    ergebnis: K.ergebnisLesen("E-" + ersetzt9.slice(0, 4) + "-" + ersetzt9.slice(4)),
  };
  /* Grenzfall 2: Nachbarvertauschung mit Wertdifferenz 31 (z0=31 '9', z1=0 'A') */
  const fN = {sitzung: 31, platz: 0, halbe: 4, versuche: 1, einheiten: 100};
  const codeN = K.ergebnisDrucken(fN);
  const rumpfN = codeN.replace(/-/g, "").slice(1);
  const pN = K.pruefsummen([...rumpfN].map(K.wert).slice(0, 5));
  const tauschN = rumpfN[1] + rumpfN[0] + rumpfN.slice(2);
  const pN2 = K.pruefsummen([...tauschN].map(K.wert).slice(0, 5));
  const grenzeN = {
    original: codeN, mutiert: "E-" + tauschN.slice(0, 4) + "-" + tauschN.slice(4),
    paar: "z0=9(31), z1=A(0)", wertdifferenz: 31,
    C1Vorher: pN.c1, C1Nachher: pN2.c1, C2Vorher: pN.c2, C2Nachher: pN2.c2,
    C1Gleich: pN.c1 === pN2.c1, C2Gleich: pN.c2 === pN2.c2,
    ergebnis: K.ergebnisLesen("E-" + tauschN.slice(0, 4) + "-" + tauschN.slice(4)),
  };
  /* Grenzfall 3: Nachbarvertauschung Wertdifferenz 31 am Ende (z3=A(0), z4=9(31)) */
  const fE = {sitzung: 3, platz: 4, halbe: 2, versuche: 0, einheiten: 31};
  const codeE = K.ergebnisDrucken(fE);
  const rumpfE = codeE.replace(/-/g, "").slice(1);
  const tauschE = rumpfE.slice(0, 3) + rumpfE[4] + rumpfE[3] + rumpfE.slice(5);   /* nur die Nutzzeichen 4 und 5 tauschen */
  const pE = K.pruefsummen([...rumpfE].map(K.wert).slice(0, 5));
  const pE2 = K.pruefsummen([...tauschE].map(K.wert).slice(0, 5));
  const grenzeE = {
    original: codeE, mutiert: "E-" + tauschE.slice(0, 4) + "-" + tauschE.slice(4),
    paar: "z3=A(0), z4=9(31)", wertdifferenz: 31,
    C1Vorher: pE.c1, C1Nachher: pE2.c1, C2Vorher: pE.c2, C2Nachher: pE2.c2,
    C1Gleich: pE.c1 === pE2.c1, C2Gleich: pE.c2 === pE2.c2,
    ergebnis: K.ergebnisLesen("E-" + tauschE.slice(0, 4) + "-" + tauschE.slice(4)),
  };
  /* Fremdzeichen I, O, 0, 1 — die Klasse `zeichen` (in den drei Mutationsarten nicht erreichbar) */
  const fremdzeichen = {};
  const gueltigF = K.ergebnisDrucken({sitzung: 7, platz: 3, halbe: 9, versuche: 1, einheiten: 40});
  for (const [name, pos] of [["I", 2], ["O", 3], ["0", 4], ["1", 6]]){
    const r = [...gueltigF.replace(/-/g, "").slice(1)];
    r[pos] = name;
    const gedruckt = "E-" + r.join("").slice(0, 4) + "-" + r.join("").slice(4);
    fremdzeichen[name] = {eingabe: gedruckt, ergebnis: K.ergebnisLesen(gedruckt)};
  }

  for (const a of arten){
    const e = zaehler[a];
    gleich(`Block2: ${a} — jede Mutation erkannt`, e.erkannt === e.geprueft, e.erkannt, e.geprueft);
    const summeKlassen = Object.values(e.klassen).reduce((s, n) => s + n, 0);
    gleich(`Block2: ${a} — Fehlerklassen vollständig gezählt`, summeKlassen === e.erkannt, summeKlassen, e.erkannt);
  }
  gleich("Block2: Vertauschung Nutz↔Prüfzeichen erkannt", zaehler.vertauschen_nutz_pruef.erkannt === zaehler.vertauschen_nutz_pruef.geprueft,
    zaehler.vertauschen_nutz_pruef.erkannt, zaehler.vertauschen_nutz_pruef.geprueft);
  gleich("Block2: gültige Codes werden nicht abgewiesen", kontrolleFehler === 0, kontrolleFehler, 0);
  muss("Block2: A↔9 lässt C1 unberührt", grenzeA.C1Gleich === true, {C1Vorher: grenzeA.C1Vorher, C1Nachher: grenzeA.C1Nachher, C2Gleich: grenzeA.C2Gleich}, {C1Gleich: true, C2Gleich: false});
  muss("Block2: A↔9 wird trotzdem erkannt", grenzeA.ergebnis.fehler === "prüfziffer", grenzeA.ergebnis, {fehler: "prüfziffer"});
  muss("Block2: Vertauschung Differenz 31 lässt C1 unberührt und wird erkannt",
    grenzeN.C1Gleich === true && grenzeN.C2Gleich === false && grenzeN.ergebnis.fehler === "prüfziffer",
    {C1Gleich: grenzeN.C1Gleich, C2Gleich: grenzeN.C2Gleich, ergebnis: grenzeN.ergebnis}, {C1Gleich: true, C2Gleich: false, fehler: "prüfziffer"});
  muss("Block2: A↔9 am Nutzzeichen-Ende erkannt (9→A)", grenze9.ergebnis.fehler === "prüfziffer", grenze9.ergebnis, {fehler: "prüfziffer"});
  muss("Block2: Differenz 31 am Nutzzeichen-Ende (z3/z4) erkannt", grenzeE.C1Gleich === true && grenzeE.ergebnis.fehler === "prüfziffer", grenzeE, {C1Gleich: true, fehler: "prüfziffer"});
  for (const c of ["I", "O", "0", "1"]) muss(`Block2: Fremdzeichen ${c} → zeichen`, (fremdzeichen[c].ergebnis || {}).fehler === "zeichen", fremdzeichen[c].ergebnis, {fehler: "zeichen"});

  return {
    mutationen: zaehler, arten,
    versuche: 5000 + 1000 + 5000,
    uebersprungen,
    anmerkungUebersprungen: "übersprungen: Vertauschungen, bei denen beide Nachbarzeichen gleich sind (keine Änderung, keine Mutation)",
    kontrolle: {geprueft: kontrolle, abgewiesen: kontrolleFehler},
    unerkannteBeispiele: unerkannt,
    grenzfaelle: {A_nach_9: grenzeA, neun_nach_A: grenze9, tausch_differenz31: grenzeN, tausch_differenz31_ende: grenzeE, fremdzeichen},
    laufzeitMs: Date.now() - t0,
  };
}

/* =====================================================================================
   Block 3 · ergebnisCode(inst, abnahme) aus der Wirklichkeit (§ 4)
   ===================================================================================== */
function echterFall(o){
  standFrisch();
  const bau = o.gen ? {gen: {skill: o.gen.skill, seed: o.gen.seed}} : {ticketId: o.ticketId};
  const inst = Spiel.instanzErstellen(Object.assign({}, bau, {seed: o.seed, quelle: "klassenraum", ohneFlow: true}));
  inst.klassenraum = {sitzung: o.sitzung, platz: o.platz};
  const def = Spiel.defVon(inst);
  const kennwertStart = netzkennwert(inst.netz);          /* Startnetz: das vergleichen zwei Geräte */
  Spiel.oeffnen(inst.iid);
  Spiel.loesung(inst.netz, def.loesung);
  Spiel.arbeitszieleErfuellen(inst);
  if (o.weiterMs) jetzt.weiter(o.weiterMs);
  const ab = Spiel.abnahme(inst);
  let abschluss = null, fehler = null;
  try { abschluss = Spiel.abschliessen(inst, ab); } catch (e) { fehler = String((e && e.message) || e); }
  return {inst, def, ab, abschluss, abschlussFehler: fehler, kennwertStart, netzkennwert: netzkennwert(inst.netz)};
}
function block3(){
  const t0 = Date.now();
  const faelle = [];
  const lage = [
    {name: "hand/salon-01", ticketId: "salon-01", seed: 43, sitzung: 7, platz: 3, weiterMs: 90000},
    {name: "hand/zweiter Auftrag", ticketId: TABELLE_AUFTRAEGE[5], seed: 43, sitzung: 12, platz: 0, weiterMs: 7000},
    {name: "generiert/Fertigkeit", gen: {skill: TABELLE_SKILLS[0], seed: 43}, seed: 43, sitzung: 31, platz: 31, weiterMs: 512000},
  ];
  for (const o of lage){
    const f = ohneAusnahme(() => echterFall(o));
    if (f.ausnahme){ faelle.push({name: o.name, ausnahme: f.ausnahme}); continue; }
    const {inst, def, ab, abschluss, abschlussFehler} = f.wert;
    const code = ohneAusnahme(() => K.ergebnisCode(inst, ab));
    const gelesen = code.wert && typeof code.wert === "string" ? K.ergebnisLesen(code.wert) : null;
    /* Der Code trägt 10-s-Einheiten: die rohe Sekundenzahl wird darauf quantisiert (max. ±5 s). */
    const dauerSroh = Math.max(0, Math.min(5110, Math.round((inst.zeitMs || 0) / 1000)));
    const einheiten = Math.max(0, Math.min(511, Math.round(dauerSroh / 10)));
    const erwartet = {sterne: ab.sterne, versuche: Math.max(0, Math.min(3, (inst.abnahmen || 1) - 1)),
                      dauerSroh, einheiten, dauerS: einheiten * 10};
    faelle.push({
      name: o.name, ticketId: inst.ticketId, defId: def.id, seed: inst.seed, quelle: inst.quelle,
      sitzung: o.sitzung, platz: o.platz, netzkennwertStart: f.wert.kennwertStart, netzkennwertNachLoesung: f.wert.netzkennwert,
      abnahme: {bestanden: ab.bestanden, sterne: ab.sterne, niveau: ab.niveau, ziele: ab.ergebnisse.length,
                kollateral: ab.kollateral.length, neustartVerlust: ab.neustart.verlust},
      abnahmen: inst.abnahmen, zeitMs: inst.zeitMs, abschlussBestanden: abschluss ? abschluss.bestanden : null, abschlussFehler,
      code: code.wert, codeAusnahme: code.ausnahme, gelesen,
      erwartet,
      passt: !!gelesen && gelesen.ok === true && gelesen.sterne === erwartet.sterne && gelesen.versuche === erwartet.versuche && gelesen.dauerS === erwartet.dauerS,
      pruefzifferPasst: !!(gelesen && gelesen.ok),
    });
    gleich(`Block3: ${o.name} — Code entsteht ohne Ausnahme`, code.ausnahme === null, code.ausnahme, null);
    muss(`Block3: ${o.name} — Abnahme bestanden`, ab.bestanden === true, ab.bestanden, true);
    if (code.wert && typeof code.wert === "string"){
      gleich(`Block3: ${o.name} — sterne = abnahme.sterne`, gelesen.sterne, erwartet.sterne);
      gleich(`Block3: ${o.name} — versuche = max(0, abnahmen-1)`, gelesen.versuche, erwartet.versuche);
      gleich(`Block3: ${o.name} — dauerS = round(zeitMs/1000) in 10-s-Einheiten (roh ${erwartet.dauerSroh} s, ${erwartet.einheiten} Einheiten)`, gelesen.dauerS, erwartet.dauerS);
      gleich(`Block3: ${o.name} — platz im Code`, gelesen.platz, o.platz);
      gleich(`Block3: ${o.name} — sitzung im Code`, gelesen.sitzung, o.sitzung);
    }
  }

  /* (a)-(d): fehlende Abnahme, nicht bestanden, kein inst.klassenraum, inst null — je {fehler, grund}, keine Ausnahme */
  const basis = faelle.find(f => f.name === "hand/salon-01");
  standFrisch();
  const probeInst = Spiel.instanzErstellen({ticketId: "salon-01", seed: 43, quelle: "klassenraum", ohneFlow: true});
  probeInst.klassenraum = {sitzung: 7, platz: 3};
  const abOk = {bestanden: true, sterne: 4.5};
  const randfaelle = {};
  const faelleListe = [
    ["abnahme_fehlt", () => K.ergebnisCode(probeInst, undefined)],
    ["abnahme_null", () => K.ergebnisCode(probeInst, null)],
    ["abnahme_nicht_bestanden", () => K.ergebnisCode(probeInst, {bestanden: false, sterne: 0})],
    ["abnahme_bestanden_fehlt", () => K.ergebnisCode(probeInst, {sterne: 5})],
    ["klassenraum_fehlt", () => { const i = Object.assign({}, probeInst); delete i.klassenraum; return K.ergebnisCode(i, abOk); }],
    ["klassenraum_null", () => K.ergebnisCode(Object.assign({}, probeInst, {klassenraum: null}), abOk)],
    ["inst_null", () => K.ergebnisCode(null, abOk)],
    ["inst_undefined", () => K.ergebnisCode(undefined, abOk)],
    ["inst_zahl", () => K.ergebnisCode(42, abOk)],
    ["beides_null", () => K.ergebnisCode(null, null)],
    ["sitzung_0", () => K.ergebnisCode(Object.assign({}, probeInst, {klassenraum: {sitzung: 0, platz: 3}}), abOk)],
    ["sitzung_32", () => K.ergebnisCode(Object.assign({}, probeInst, {klassenraum: {sitzung: 32, platz: 3}}), abOk)],
    ["sitzung_text", () => K.ergebnisCode(Object.assign({}, probeInst, {klassenraum: {sitzung: "7", platz: 3}}), abOk)],
    ["platz_32", () => K.ergebnisCode(Object.assign({}, probeInst, {klassenraum: {sitzung: 7, platz: 32}}), abOk)],
    ["platz_negativ", () => K.ergebnisCode(Object.assign({}, probeInst, {klassenraum: {sitzung: 7, platz: -1}}), abOk)],
    ["platz_text", () => K.ergebnisCode(Object.assign({}, probeInst, {klassenraum: {sitzung: 7, platz: "3"}}), abOk)],
    ["sterne_nan", () => K.ergebnisCode(probeInst, {bestanden: true, sterne: NaN})],
    ["sterne_text", () => K.ergebnisCode(probeInst, {bestanden: true, sterne: "5"})],
    ["sterne_negativ", () => K.ergebnisCode(probeInst, {bestanden: true, sterne: -1})],
    ["sterne_12", () => K.ergebnisCode(probeInst, {bestanden: true, sterne: 12})],
    ["sterne_0", () => K.ergebnisCode(probeInst, {bestanden: true, sterne: 0})],
    ["sterne_5_25", () => K.ergebnisCode(probeInst, {bestanden: true, sterne: 5.25})],
    ["klassenraum_array", () => K.ergebnisCode(Object.assign({}, probeInst, {klassenraum: [7, 3]}), abOk)],
  ];
  for (const [name, fn] of faelleListe){
    const r = ohneAusnahme(fn);
    randfaelle[name] = {wert: r.wert, ausnahme: r.ausnahme};
    muss(`Block3: ${name} ohne Ausnahme`, r.ausnahme === null, r.ausnahme, null);
  }
  for (const name of ["abnahme_fehlt", "abnahme_null", "abnahme_nicht_bestanden", "abnahme_bestanden_fehlt", "klassenraum_fehlt", "klassenraum_null", "inst_null", "inst_undefined", "inst_zahl", "beides_null", "sitzung_0", "sitzung_32", "sitzung_text", "platz_32", "platz_negativ", "platz_text", "sterne_nan", "sterne_text", "sterne_negativ", "sterne_12", "klassenraum_array"]){
    const w = randfaelle[name].wert;
    muss(`Block3: ${name} → {fehler, grund}`, !!(w && w.fehler && typeof w.grund === "string" && w.grund.length > 0), w, {fehler: "…", grund: "…"});
  }
  muss("Block3: inst null gewinnt gegen abnahme null (Reihenfolge inst → klassenraum → abnahme → bestanden)",
    randfaelle.beides_null.wert.fehler === "eingabe", randfaelle.beides_null.wert, {fehler: "eingabe"});
  muss("Block3: sterne 0 ist zulässig (Code entsteht)", typeof randfaelle.sterne_0.wert === "string", randfaelle.sterne_0.wert, "E-…");
  const sternNull = K.ergebnisLesen(randfaelle.sterne_0.wert);
  gleich("Block3: sterne 0 kommt als 0 im Code an", {sterne: sternNull.sterne, halbe: sternNull.halbeSterne}, {sterne: 0, halbe: 0});
  /* Sterne-Raster: der Code trägt halbe Sterne (4 Bit). Werte dazwischen werden gerundet. */
  const sterneQuant = [0, 0.25, 0.5, 4.7, 4.75, 4.8, 5].map(s => {
    const c = K.ergebnisCode(probeInst, {bestanden: true, sterne: s});
    const g = typeof c === "string" ? K.ergebnisLesen(c) : null;
    return {eingabe: s, imCode: g && g.ok ? g.sterne : null, halbe: g && g.ok ? g.halbeSterne : null, fehler: g && g.fehler ? g.fehler : null};
  });
  const halbschritt = s => Math.abs(s * 2 - Math.round(s * 2)) < 1e-9;
  const quantFehler = sterneQuant.filter(z => halbschritt(z.eingabe) ? z.imCode !== z.eingabe : z.imCode === z.eingabe).map(z => z.eingabe);
  gleich("Block3: Sterne-Raster — Halbschritte unverändert, andere gerundet (0,25→0,5 · 4,7→4,5 · 4,8→5)", quantFehler, []);

  /* Dauer-Grenzen: nachgestellte Fälle am echten Spielstand (inst.zeitMs gesetzt) */
  standFrisch();
  const dInst = Spiel.instanzErstellen({ticketId: "salon-01", seed: 43, quelle: "klassenraum", ohneFlow: true});
  dInst.klassenraum = {sitzung: 7, platz: 3};
  const dAb = {bestanden: true, sterne: 4.5};
  const dauerTabelle = [];
  for (const zeitMs of [0, 1, 999, 1000, 4999, 5000, 5001, 123456, 5109000, 5110000, 5110001, 999999999, -5000]){
    const vorher = dInst.zeitMs;
    dInst.zeitMs = zeitMs;
    const code = K.ergebnisCode(dInst, dAb);
    const gelesen = typeof code === "string" ? K.ergebnisLesen(code) : null;
    const rohS = Math.max(0, Math.min(5110, Math.round(zeitMs / 1000)));
    const einheiten = Math.max(0, Math.min(511, Math.round(rohS / 10)));
    dauerTabelle.push({zeitMs, rohS, erwarteteEinheiten: einheiten, erwarteterDauerS: einheiten * 10,
                       dauerS: gelesen ? gelesen.dauerS : null, einheiten: gelesen ? gelesen.dauerEinheiten : null,
                       gedeckelt: rohS === 5110, abweichungS: gelesen ? gelesen.dauerS - rohS : null});
    dInst.zeitMs = vorher;
  }
  let dauerFehler = 0;
  for (const z of dauerTabelle) if (z.dauerS !== z.erwarteterDauerS || z.einheiten !== z.erwarteteEinheiten) dauerFehler++;
  gleich("Block3: Dauer-Tabelle stimmt mit der 10-s-Quantisierung von min(5110, round(ms/1000))", dauerFehler === 0, dauerFehler, 0);
  gleich("Block3: 5110 s wird gedeckelt", dauerTabelle.find(z => z.zeitMs === 5110000).dauerS, 5110);
  gleich("Block3: negative Zeit wird 0", dauerTabelle.find(z => z.zeitMs === -5000).dauerS, 0);

  /* Versuchsgrenze 3+ : echte, wiederholte Abnahme am gelösten Auftrag */
  const versuchTabelle = [];
  const vf = faelle.find(f => f.name === "hand/salon-01");
  if (vf){
    standFrisch();
    const vInst = Spiel.instanzErstellen({ticketId: "salon-01", seed: 43, quelle: "klassenraum", ohneFlow: true});
    vInst.klassenraum = {sitzung: 7, platz: 3};
    const vdef = Spiel.defVon(vInst);
    Spiel.oeffnen(vInst.iid);
    Spiel.loesung(vInst.netz, vdef.loesung);
    Spiel.arbeitszieleErfuellen(vInst);
    vInst.zeitMs = 90000;
    for (let n = 1; n <= 5; n++){
      const ab = Spiel.abnahme(vInst);
      const code = K.ergebnisCode(vInst, ab);
      const gelesen = typeof code === "string" ? K.ergebnisLesen(code) : null;
      versuchTabelle.push({abnahmen: vInst.abnahmen, sterne: ab.sterne, bestanden: ab.bestanden,
                           versucheImCode: gelesen ? gelesen.versuche : null, anzeige: gelesen && gelesen.versuche === 3 ? "3+" : String(gelesen ? gelesen.versuche : "?")});
    }
  }
  const versuchSoll = versuchTabelle.map(v => Math.max(0, Math.min(3, v.abnahmen - 1)));
  const versuchIst = versuchTabelle.map(v => v.versucheImCode);
  gleich("Block3: versuche 1..5 → 0,1,2,3,3 (Grenze 3+)", versuchIst, versuchSoll);
  gleich("Block3: letzter Fall zeigt 3+", versuchTabelle[versuchTabelle.length - 1].anzeige, "3+");

  /* Sterne-Grenzen aus dem echten Programm (Spiel.sterneBerechnen) — dann als nachgestellte Abnahme in den Code */
  const sterneTabelle = [];
  if (vf){
    standFrisch();
    const sInst = Spiel.instanzErstellen({ticketId: "salon-01", seed: 43, quelle: "klassenraum", ohneFlow: true});
    sInst.klassenraum = {sitzung: 7, platz: 3};
    sInst.zeitMs = 90000;
    for (let h = 0; h <= 6; h++){
      sInst.hilfeStufe = h;
      sInst.abnahmen = 1;
      const r = Spiel.sterneBerechnen(sInst, {niveau: "E", neustartVerlust: false});
      const code = K.ergebnisCode(sInst, {bestanden: true, sterne: r.sterne});
      const gelesen = typeof code === "string" ? K.ergebnisLesen(code) : null;
      sterneTabelle.push({hilfeStufe: h, sterne: r.sterne, abzuege: r.abzuege.map(a => a.text), imCode: gelesen ? gelesen.sterne : null, halbe: gelesen ? gelesen.halbeSterne : null});
    }
  }
  let sterneFehler = 0;
  for (const z of sterneTabelle) if (z.sterne !== z.imCode) sterneFehler++;
  gleich("Block3: Sterne aus Spiel.sterneBerechnen kommen unverändert im Code an", sterneFehler === 0, sterneFehler, 0);

  return {
    faelle, randfaelle, dauerTabelle, versuchTabelle, sterneTabelle,
    reihenfolgeDerPruefungen: "inst → inst.klassenraum (sitzung, platz) → abnahme → bestanden → sterne",
    laufzeitMs: Date.now() - t0,
  };
}

/* =====================================================================================
   Block 4 · ergebnisEintragen: Idempotenz (Byte-Vergleich), Ersetzen, fremde Sitzung, Blockeingabe
   ===================================================================================== */
function block4(){
  const t0 = Date.now();
  standFrisch();
  speicherLeer();
  const sitzung = K.erzeugen({ticketId: "salon-01", seed: PROBE_SEED});
  const sid = sitzung.id;
  const code1 = K.ergebnisDrucken({sitzung: sid, platz: 3, halbe: 9, versuche: 0, einheiten: 9});
  const code1Anders = K.ergebnisDrucken({sitzung: sid, platz: 3, halbe: 8, versuche: 2, einheiten: 40});
  const codePlatz5 = K.ergebnisDrucken({sitzung: sid, platz: 5, halbe: 10, versuche: 1, einheiten: 12});
  const codeFremd = K.ergebnisDrucken({sitzung: sid === 12 ? 13 : 12, platz: 4, halbe: 9, versuche: 0, einheiten: 9});
  const unsinn = code1.slice(0, -1) + (code1.slice(-1) === "A" ? "B" : "A");

  const vorErstem = speicherText();
  const r1 = ohneAusnahme(() => K.ergebnisEintragen(code1));
  const nachErstem = speicherText();
  jetzt.weiter(60000);                                   /* Uhr weiter: ein Schreibzugriff wäre jetzt sichtbar */
  const r2 = ohneAusnahme(() => K.ergebnisEintragen(code1.toLowerCase().replace(/-/g, "")));
  const nachZweitem = speicherText();
  jetzt.weiter(60000);
  const r3 = ohneAusnahme(() => K.ergebnisEintragen(code1Anders));
  const nachDrittem = speicherText();
  const k3 = store.get("klassenraum");
  const r4 = ohneAusnahme(() => K.ergebnisEintragen(codePlatz5));
  const nachVier = speicherText();
  const r5 = ohneAusnahme(() => K.ergebnisEintragen(codeFremd));
  const nachFremd = speicherText();
  const r6 = ohneAusnahme(() => K.ergebnisEintragen(unsinn));
  const nachUnsinn = speicherText();
  const r7 = ohneAusnahme(() => K.ergebnisEintragen("NL-4F7K-2Q"));
  const r8 = ohneAusnahme(() => K.ergebnisEintragen(""));
  const r9 = ohneAusnahme(() => K.ergebnisEintragen(null));
  const r10 = ohneAusnahme(() => K.ergebnisEintragen(4711));

  /* Keine Sitzung */
  speicherLeer();
  const ohneSitzung = ohneAusnahme(() => K.ergebnisEintragen(code1));
  store.set("klassenraum", null);
  const ohneSchluessel = ohneAusnahme(() => K.ergebnisEintragen(code1));

  /* Blockeingabe: drei Codes in einem Text */
  standFrisch();
  speicherLeer();
  const sitzungB = K.erzeugen({ticketId: "salon-01", seed: PROBE_SEED});
  const blockCodes = [
    K.ergebnisDrucken({sitzung: sitzungB.id, platz: 1, halbe: 10, versuche: 0, einheiten: 20}),
    K.ergebnisDrucken({sitzung: sitzungB.id, platz: 2, halbe: 9, versuche: 1, einheiten: 30}),
    K.ergebnisDrucken({sitzung: sitzungB.id, platz: 3, halbe: 8, versuche: 3, einheiten: 40}),
  ];
  const blockText = `${blockCodes[0]}  ${blockCodes[1]}\n${blockCodes[2].toLowerCase().replace(/-/g, "")}`;
  const block = ohneAusnahme(() => K.ergebnisEintragenBlock(blockText));
  const blockNochmal = ohneAusnahme(() => K.ergebnisEintragenBlock(blockText));
  const blockMitUnsinn = ohneAusnahme(() => K.ergebnisEintragenBlock(blockCodes[0] + " " + unsinn));
  const blockSpeicher = store.get("klassenraum");

  gleich("Block4: erster Eintrag {ok:true,neu:true}", r1.wert, {ok: true, neu: true});
  gleich("Block4: zweiter Eintrag desselben Codes {ok:true,neu:false}", r2.wert, {ok: true, neu: false});
  muss("Block4: Speicher VOR/NACH dem Doppeleintrag byte-identisch (Uhr lief 60 s weiter)", vorErstem !== nachErstem && nachErstem === nachZweitem,
    {gleich: nachErstem === nachZweitem, laenge: nachZweitem.length}, {gleich: true});
  gleich("Block4: gleicher Platz, anderer Code ersetzt ({ok,neu,ersetzt})", r3.wert, {ok: true, neu: true, ersetzt: true});
  gleich("Block4: danach genau EIN Satz zu Platz 3", Object.keys(k3.sitzung.ergebnisse).length, 1);
  gleich("Block4: der neue Satz steht drin (sterne 4, versuche 2, dauerS 400)",
    {platz: k3.sitzung.ergebnisse["3"].platz, sterne: k3.sitzung.ergebnisse["3"].sterne, versuche: k3.sitzung.ergebnisse["3"].versuche, dauerS: k3.sitzung.ergebnisse["3"].dauerS},
    {platz: 3, sterne: 4, versuche: 2, dauerS: 400});
  gleich("Block4: zweiter Platz kommt dazu", r4.wert, {ok: true, neu: true});
  gleich("Block4: fremde Sitzung abgewiesen", {fehler: r5.wert.fehler}, {fehler: "sitzung"});
  muss("Block4: Grund nennt beide Sitzungen", /Sitzung \d+/.test(r5.wert.grund) && r5.wert.grund.indexOf(String(sid)) >= 0, r5.wert.grund, "… Sitzung … hier läuft Sitzung …");
  gleich("Block4: fremde Sitzung ändert den Speicher nicht (byte-identisch)", nachFremd === nachVier, true);
  gleich("Block4: unsinniger Code → prüfziffer (keine Ausnahme)", {fehler: r6.wert.fehler, ausnahme: r6.ausnahme}, {fehler: "prüfziffer", ausnahme: null});
  gleich("Block4: Speicher nach unsinnigem Code unverändert", nachUnsinn === nachFremd, true);
  gleich("Block4: Auftragscode am Ergebnis-Eingang → länge", {fehler: r7.wert.fehler}, {fehler: "länge"});
  muss("Block4: der Grund nennt den Auftragscode beim Namen", /Auftragscode/.test(r7.wert.grund), r7.wert.grund, '…Auftragscode (NL-…)…');
  gleich("Block4: leerer Text → leer", {fehler: r8.wert.fehler}, {fehler: "leer"});
  gleich("Block4: null → leer", {fehler: r9.wert.fehler}, {fehler: "leer"});
  gleich("Block4: Zahl 4711 → länge", {fehler: r10.wert.fehler}, {fehler: "länge"});
  gleich("Block4: keine Sitzung → sitzung", {fehler: ohneSitzung.wert.fehler}, {fehler: "sitzung"});
  gleich("Block4: kein Speicher-Schlüssel → sitzung", {fehler: ohneSchluessel.wert.fehler}, {fehler: "sitzung"});
  gleich("Block4: Blockeingabe zählt 3 Codes", {anzahl: block.wert.anzahl, angenommen: block.wert.angenommen}, {anzahl: 3, angenommen: 3});
  gleich("Block4: Blockeingabe erneut → alle drei {ok:true,neu:false}", blockNochmal.wert.teile.map(t => t.ergebnis), [{ok: true, neu: false}, {ok: true, neu: false}, {ok: true, neu: false}]);
  gleich("Block4: Block mit einem unsinnigen Code → 2 angenommen, 1 abgewiesen",
    {anzahl: blockMitUnsinn.wert.anzahl, angenommen: blockMitUnsinn.wert.angenommen, fehler: blockMitUnsinn.wert.teile[1].ergebnis.fehler},
    {anzahl: 2, angenommen: 1, fehler: "prüfziffer"});
  gleich("Block4: im Speicher stehen 3 Plätze", Object.keys(blockSpeicher.sitzung.ergebnisse).sort(), ["1", "2", "3"]);
  gleich("Block4: letzte/letzter Code im Speicher", blockSpeicher.letzte, blockCodes[2]);

  return {
    sitzung: {id: sid, code: sitzung.code},
    codeBeispiele: {platz3: code1, platz3Anders: code1Anders, platz5: codePlatz5, fremdeSitzung: codeFremd, unsinnig: unsinn},
    ergebnisErsterEintrag: r1.wert, ergebnisDoppeleintrag: r2.wert,
    byteVergleich: {vorErstemLaenge: vorErstem.length, nachErstemLaenge: nachErstem.length, vorGleichNachErstem: vorErstem !== nachErstem,
                    nachZweitemGleichNachErstem: nachZweitem === nachErstem, nachZweitemLaenge: nachZweitem.length},
    ersetzt: {antwort: r3.wert, anzahlSaetze: Object.keys(k3.sitzung.ergebnisse).length},
    fehlerfaelle: {
      fremdeSitzung: r5.wert, unsinnigerCode: r6.wert, auftragscode: r7.wert, leer: r8.wert, null: r9.wert,
      zahl: r10.wert, keineSitzung: ohneSitzung.wert, keinSchluessel: ohneSchluessel.wert,
    },
    block: {text: blockText, anzahl: block.wert.anzahl, angenommen: block.wert.angenommen, teile: block.wert.teile,
            zweiterLauf: blockNochmal.wert.teile.map(t => t.ergebnis), mitUnsinn: blockMitUnsinn.wert},
    laufzeitMs: Date.now() - t0,
  };
}
function equalText(name, a, b){ return gleich(name, a, b); }

/* =====================================================================================
   Block 5 · Datenschema store "klassenraum" gegen § 9
   ===================================================================================== */
function block5(){
  const t0 = Date.now();
  standFrisch();
  store.set("klassenraum", null);                       /* nichts im Speicher */
  const vorErzeugen = store.get("klassenraum", null);
  const sitzung = K.erzeugen({ticketId: "salon-01", seed: PROBE_SEED});
  const k = store.get("klassenraum");
  const felder = Object.keys(k);
  const sitzungFelder = Object.keys(k.sitzung);
  const s2 = K.erzeugen({ticketId: TABELLE_AUFTRAEGE[5], seed: PROBE_SEED + 1, dauerMin: 25});
  const k2 = store.get("klassenraum");
  const felderNachZweitem = Object.keys(k2);
  const alteErgebnisse = Object.keys(k2.sitzung.ergebnisse).length;

  const code = K.ergebnisDrucken({sitzung: k2.sitzung.id, platz: 3, halbe: 9, versuche: 1, einheiten: 12});
  K.ergebnisEintragen(code);
  const k3 = store.get("klassenraum");
  const satz = k3.sitzung.ergebnisse["3"];
  const satzFelder = Object.keys(satz);

  /* keine Klarnamen: alle Zeichenketten des Speichers auflisten und ihre Herkunft prüfen */
  const zeichenketten = [];
  const sammle = (o, pfad) => {
    if (typeof o === "string") { zeichenketten.push({pfad, wert: o.length > 60 ? o.slice(0, 60) + "…" : o}); return; }
    if (Array.isArray(o)) { o.forEach((x, i) => sammle(x, pfad + "[" + i + "]")); return; }
    if (o && typeof o === "object") for (const [f, w] of Object.entries(o)) sammle(w, pfad + "." + f);
  };
  sammle(k3, "klassenraum");
  const verdaechtigeFelder = [];
  const muster = /name|vorname|nachname|schueler|schüler|kunde|email|mail|klasse\b|geburt/i;
  const scanne = (o, pfad) => {
    if (Array.isArray(o)) return o.forEach((x, i) => scanne(x, pfad + "[" + i + "]"));
    if (o && typeof o === "object") for (const [f, w] of Object.entries(o)) { if (muster.test(f)) verdaechtigeFelder.push(pfad + "." + f); scanne(w, pfad + "." + f); }
  };
  scanne(k3, "klassenraum");

  /* platz ∈ 0..31 und Code-Inhalt: nur Zahlen */
  const zz = Zufall("A-api:block5");
  let platzMin = 99, platzMax = -1, codeNichtNumerisch = 0, platzAusserhalb = 0;
  for (let i = 0; i < 5000; i++){
    const f = {sitzung: zz.zahl(32), platz: zz.zahl(32), halbe: zz.zahl(11), versuche: zz.zahl(4), einheiten: zz.zahl(512)};
    const g = K.ergebnisLesen(K.ergebnisDrucken(f));
    platzMin = Math.min(platzMin, g.platz); platzMax = Math.max(platzMax, g.platz);
    if (g.platz < 0 || g.platz > 31) platzAusserhalb++;
    const nutzlastFelder = K.ergebnisFelder(K.ergebnisZahl(f));
    if (Object.values(nutzlastFelder).some(x => typeof x !== "number")) codeNichtNumerisch++;
  }
  const kennungFelder = Object.keys(K.ergebnisFelder(0));

  equalText("Block5: Speicherfelder genau § 9", felder, K.SPEICHER_FELDER);
  equalText("Block5: Sitzungsfelder genau § 9", sitzungFelder, K.SITZUNG_FELDER);
  equalText("Block5: Satzfelder genau § 9", satzFelder, K.SATZ_FELDER);
  equalText("Block5: Feldreihenfolge bleibt beim zweiten erzeugen", felderNachZweitem, K.SPEICHER_FELDER);
  gleich("Block5: vorher kein Speicherinhalt", vorErzeugen, null);
  gleich("Block5: neue Sitzung ersetzt die alte (keine Ergebnisse übrig)", alteErgebnisse, 0);
  gleich("Block5: dauerMin wird übernommen", k2.sitzung.dauerMin, 25);
  gleich("Block5: platz bleibt null (eigenes Gerät)", k3.platz, null);
  gleich("Block5: letzte trägt den kanonischen Code", k3.letzte, code);
  equalText("Block5: ergebnisse ist eine Abbildung (kein Array)", Array.isArray(k3.sitzung.ergebnisse), false);
  equalText("Block5: ergebnisse-Schlüssel ist der Platz als Text", Object.keys(k3.sitzung.ergebnisse), ["3"]);
  gleich("Block5: Satz gehört zu seinem Platz", {platz: satz.platz, code: satz.code}, {platz: 3, code});
  gleich("Block5: keine verdächtigen (Personen-)Felder", verdaechtigeFelder, []);
  gleich("Block5: platz immer 0..31 (5.000 Codes)", {min: platzMin, max: platzMax, ausserhalb: platzAusserhalb}, {min: 0, max: 31, ausserhalb: 0});
  gleich("Block5: Nutzlast eines Codes ist rein numerisch (5 Felder)", {nichtNumerisch: codeNichtNumerisch, felder: kennungFelder},
    {nichtNumerisch: 0, felder: ["sitzung", "platz", "halbe", "versuche", "einheiten"]});
  /* Zeichenketten im Speicher: genau die acht programm-eigenen Felder, keine Eingabe eines Namens */
  gleich("Block5: genau acht Zeichenketten im Speicher (alle Programmfelder)", zeichenketten.length, 8);
  const erlaubteQuellen = {"klassenraum.programm": true, "klassenraum.sitzung.art": true, "klassenraum.sitzung.code": true, "klassenraum.sitzung.ticketId": true, "klassenraum.sitzung.titel": true, "klassenraum.letzte": true, "klassenraum.sitzung.ergebnisse.3.code": true, "klassenraum.sitzung.ergebnisse.3.quelle": true};
  const unbekannteQuellen = zeichenketten.filter(z => !(z.pfad in erlaubteQuellen)).map(z => z.pfad);
  gleich("Block5: nur bekannte Zeichenketten-Felder", unbekannteQuellen, []);
  equalText("Block5: Zeichenketten-Herkunft (Pfade)", zeichenketten.map(z => z.pfad).sort(), Object.keys(erlaubteQuellen).sort());

  return {
    speicherfelder: felder, sitzungsfelder: sitzungFelder, satzfelder: satzFelder,
    sitzungBeispiel: {
      id: k2.sitzung.id, art: k2.sitzung.art, ticketId: k2.sitzung.ticketId, skill: k2.sitzung.skill,
      index: k2.sitzung.index, variante: k2.sitzung.variante, seed: k2.sitzung.seed, code: k2.sitzung.code,
      eigene: k2.sitzung.eigene, dauerMin: k2.sitzung.dauerMin,
    },
    satzBeispiel: satz,
    speicherTextLaenge: speicherText().length,
    zeichenketten,
    verdaechtigeFelder,
    platzPruefung: {geprueft: 5000, min: platzMin, max: platzMax, ausserhalb: platzAusserhalb},
    keineKlarnamen: {personenbezugNurPlatz: true, muster: String(muster)},
    laufzeitMs: Date.now() - t0,
  };
}

/* =====================================================================================
   Block 6 · Export/Import: verlustfrei und Fehlerfälle (§ 9)
   ===================================================================================== */
function block6(){
  const t0 = Date.now();
  /* (1) ohne Ergebnisseinträge */
  standFrisch();
  speicherLeer();
  const sitzung = K.erzeugen({ticketId: "salon-01", seed: PROBE_SEED});
  const text0 = K.exportieren();
  const vorher0 = JSON.stringify(K.sitzung());
  speicherLeer();
  const imp0 = ohneAusnahme(() => K.importieren(text0));
  const nachher0 = JSON.stringify(K.sitzung());
  const exportNachImport0 = K.exportieren();
  const d0 = JSON.parse(text0);

  /* (2) mit drei Ergebnisseinträgen */
  const codes = [
    K.ergebnisDrucken({sitzung: sitzung.id, platz: 1, halbe: 10, versuche: 0, einheiten: 20}),
    K.ergebnisDrucken({sitzung: sitzung.id, platz: 2, halbe: 9, versuche: 1, einheiten: 30}),
    K.ergebnisDrucken({sitzung: sitzung.id, platz: 3, halbe: 8, versuche: 3, einheiten: 40}),
  ];
  for (const c of codes) K.ergebnisEintragen(c);
  const text3 = K.exportieren();
  const vorher3 = JSON.stringify(K.sitzung());
  const d3 = JSON.parse(text3);
  speicherLeer();
  const imp3 = ohneAusnahme(() => K.importieren(text3));
  const nachher3 = JSON.stringify(K.sitzung());
  const exportNachImport3 = K.exportieren();

  gleich("Block6: Export ohne Einträge verlustfrei (JSON-Text der Sitzung gleich)", vorher0 === nachher0 && imp0.ausnahme === null, {gleich: vorher0 === nachher0, ausnahme: imp0.ausnahme}, {gleich: true, ausnahme: null});
  gleich("Block6: Export mit 3 Einträgen verlustfrei", vorher3 === nachher3 && imp3.ausnahme === null, {gleich: vorher3 === nachher3, ausnahme: imp3.ausnahme}, {gleich: true, ausnahme: null});
  gleich("Block6: zweiter Export nach Import identisch (ohne Einträge)", JSON.parse(exportNachImport0).sitzung, d0.sitzung);
  gleich("Block6: zweiter Export nach Import identisch (3 Einträge)", JSON.parse(exportNachImport3).sitzung, d3.sitzung);
  equalText("Block6: Exportform", Object.keys(d3).sort(), ["fassung", "format", "programm", "sitzung", "zeit"]);
  equalText("Block6: Export trägt Format und Fassung", {format: d3.format, fassung: d3.fassung}, {format: "netzwerk-labor/klassenraum", fassung: 1});
  gleich("Block6: Import meldet ok samt Sitzung", {ok: imp3.wert.ok, id: imp3.wert.sitzung.id}, {ok: true, id: sitzung.id});
  gleich("Block6: kein fremdesProgramm bei gleicher Fassung", imp3.wert.fremdesProgramm, undefined);
  gleich("Block6: importierte Ergebnisse bleiben vollständig", Object.keys(JSON.parse(nachher3).ergebnisse).sort(), ["1", "2", "3"]);
  gleich("Block6: Satzwerte überleben den Import", JSON.parse(nachher3).ergebnisse["3"], d3.sitzung.ergebnisse["3"]);

  /* (3) Fehlerfälle */
  const fehlerfaelle = {}, rohTexte = {};
  const faelle = [
    ["leerer_text", ""],
    ["nur_leerzeichen", "  \n\t "],
    ["kein_json", "Das ist keine JSON-Datei"],
    ["json_halbes", '{"format":"netzwerk-labor/klassenraum",'],
    ["json_string", '"nur ein Text"'],
    ["json_array", "[1,2,3]"],
    ["json_zahl", "42"],
    ["fremdes_format", JSON.stringify({format: "netzwerk-labor", fassung: 1, sitzung: sitzung})],
    ["format_fehlt", JSON.stringify({fassung: 1, sitzung: sitzung})],
    ["neuere_fassung", JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 2, sitzung: sitzung})],
    ["fassung_text", JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: "1", sitzung: sitzung})],
    ["fassung_kommazahl", JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1.5, sitzung: sitzung})],
    ["fassung_fehlt", JSON.stringify({format: "netzwerk-labor/klassenraum", sitzung: sitzung})],
    ["fassung_null", JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 0, sitzung: sitzung, ergebnisse: {}})],
    ["sitzung_fehlt", JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1})],
    ["sitzung_null", JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, sitzung: null})],
    ["sitzung_array", JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, sitzung: [7]})],
    ["sitzung_zahl", JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, sitzung: 7})],
    ["sitzung_leer", JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, sitzung: {}})],
    ["sitzung_id_0", JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, sitzung: Object.assign({}, sitzung, {id: 0})})],
    ["sitzung_id_32", JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, sitzung: Object.assign({}, sitzung, {id: 32})})],
    ["sitzung_id_text", JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, sitzung: Object.assign({}, sitzung, {id: "7"})})],
    ["ergebnisse_array", JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, sitzung: Object.assign({}, sitzung, {ergebnisse: []})})],
    ["ergebnisse_text", JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, sitzung: Object.assign({}, sitzung, {ergebnisse: "x"})})],
    ["satz_platz_text", JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, sitzung: Object.assign({}, sitzung, {ergebnisse: {"3": {platz: "drei", sterne: 4, dauerS: 90, versuche: 0, code: codes[0]}}})})],
    ["satz_sterne_9", JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, sitzung: Object.assign({}, sitzung, {ergebnisse: {"3": {platz: 3, sterne: 9, dauerS: 90, versuche: 0, code: codes[0]}}})})],
    ["satz_dauer_zu_gross", JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, sitzung: Object.assign({}, sitzung, {ergebnisse: {"3": {platz: 3, sterne: 4, dauerS: 99999, versuche: 0, code: codes[0]}}})})],
    ["satz_versuche_9", JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, sitzung: Object.assign({}, sitzung, {ergebnisse: {"3": {platz: 3, sterne: 4, dauerS: 90, versuche: 9, code: codes[0]}}})})],
    ["satz_ohne_code", JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, sitzung: Object.assign({}, sitzung, {ergebnisse: {"3": {platz: 3, sterne: 4, dauerS: 90, versuche: 0}}})})],
    ["satz_schluessel_passt_nicht", JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, sitzung: Object.assign({}, sitzung, {ergebnisse: {"3": {platz: 4, sterne: 4, dauerS: 90, versuche: 0, code: codes[0]}}})})],
  ];
  for (const [name, text] of faelle){
    const r = ohneAusnahme(() => K.importieren(text));
    rohTexte[name] = text;
    fehlerfaelle[name] = {eingabe: text.length > 120 ? text.slice(0, 120) + "…" : text, ergebnis: r.wert, ausnahme: r.ausnahme};
  }
  const nichtString = ohneAusnahme(() => K.importieren(null));
  const nichtString2 = ohneAusnahme(() => K.importieren(42));
  const nichtString3 = ohneAusnahme(() => K.importieren({}));
  fehlerfaelle.argument_null = {eingabe: null, ergebnis: nichtString.wert, ausnahme: nichtString.ausnahme};
  fehlerfaelle.argument_zahl = {eingabe: 42, ergebnis: nichtString2.wert, ausnahme: nichtString2.ausnahme};
  fehlerfaelle.argument_objekt = {eingabe: {}, ergebnis: nichtString3.wert, ausnahme: nichtString3.ausnahme};

  const sollFehler = {
    leerer_text: "leer", nur_leerzeichen: "leer", kein_json: "json", json_halbes: "json", json_string: "format",
    json_array: "format", json_zahl: "format", fremdes_format: "format", format_fehlt: "format",
    neuere_fassung: "fassung", fassung_text: "fassung", fassung_kommazahl: "fassung",
    sitzung_fehlt: "sitzung", sitzung_null: "sitzung", sitzung_array: "sitzung", sitzung_zahl: "sitzung",
    sitzung_leer: "sitzung", sitzung_id_0: "sitzung", sitzung_id_32: "sitzung", sitzung_id_text: "sitzung",
    ergebnisse_array: "ergebnisse", ergebnisse_text: "ergebnisse", satz_platz_text: "ergebnisse",
    satz_sterne_9: "ergebnisse", satz_dauer_zu_gross: "ergebnisse", satz_versuche_9: "ergebnisse",
    satz_ohne_code: "ergebnisse", satz_schluessel_passt_nicht: "ergebnisse",
    argument_null: "leer", argument_zahl: "eingabe", argument_objekt: "eingabe",
  };
  for (const [name, soll] of Object.entries(sollFehler)){
    const r = fehlerfaelle[name];
    gleich(`Block6: ${name} → ${soll}`, {fehler: r.ergebnis && r.ergebnis.fehler, ausnahme: r.ausnahme}, {fehler: soll, ausnahme: null});
  }
  /* fassung_fehlt ist ein Sonderfall: fehlende Fassung = 0 → Migration akzeptiert */
  const fassungFehlt = ohneAusnahme(() => { speicherLeer(); return K.importieren(rohTexte.fassung_fehlt); });
  const kleineFassung = ohneAusnahme(() => { speicherLeer(); return K.importieren(rohTexte.fassung_null); });
  const fassungKlein = ohneAusnahme(() => { speicherLeer(); return K.importieren(JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 0, sitzung: {id: 9}})); });
  gleich("Block6: fehlende Fassung → Migration akzeptiert", {ok: fassungFehlt.wert.ok, migriert: fassungFehlt.wert.migriert}, {ok: true, migriert: {von: 0, nach: 1}});
  gleich("Block6: fassung 0 → Migration akzeptiert", {ok: kleineFassung.wert.ok, migriert: kleineFassung.wert.migriert}, {ok: true, migriert: {von: 0, nach: 1}});
  const migriertFelder = Object.keys(store.get("klassenraum").sitzung);
  equalText("Block6: migrierte Sitzung hat die § 9-Felder", migriertFelder, K.SITZUNG_FELDER);
  gleich("Block6: Minimal-Sitzung (nur id) wird ergänzt", {id: store.get("klassenraum").sitzung.id, art: store.get("klassenraum").sitzung.art, dauerMin: store.get("klassenraum").sitzung.dauerMin, ergebnisse: store.get("klassenraum").sitzung.ergebnisse}, {id: 9, art: "hand", dauerMin: 10, ergebnisse: {}});
  gleich("Block6: fassung 0 mit id 9 akzeptiert", {ok: fassungKlein.wert.ok}, {ok: true});

  /* (4) abweichendes programm-Feld: akzeptiert, nur gemeldet; der Speicher trägt die lokale Kennung */
  speicherLeer();
  const fremdProgramm = JSON.parse(text3);
  fremdProgramm.programm = "1.2.99";
  const impFremd = ohneAusnahme(() => K.importieren(JSON.stringify(fremdProgramm)));
  const kFremd = store.get("klassenraum");
  gleich("Block6: abweichendes programm wird akzeptiert und gemeldet", {ok: impFremd.wert.ok, fremdesProgramm: impFremd.wert.fremdesProgramm}, {ok: true, fremdesProgramm: "1.2.99"});
  equalText("Block6: Speicher trägt die lokale Programmkennung", kFremd.programm, LABOR_VERSION);
  equalText("Block6: Sitzung trotzdem vollständig übernommen", JSON.stringify(kFremd.sitzung), vorher3);

  /* (5) BOM und Leerraum */
  const mitBom = "\uFEFF" + text3 + "\r\n";
  const impBom = ohneAusnahme(() => { speicherLeer(); return K.importieren(mitBom); });
  const rohBom = ohneAusnahme(() => JSON.parse(mitBom));
  gleich("Block6: BOM+CRLF werden toleriert (mit BOM direkt würde JSON.parse scheitern)", {ok: impBom.wert.ok, rohBomAusnahme: rohBom.ausnahme !== null}, {ok: true, rohBomAusnahme: true});

  /* (6) ohne Sitzung gibt es nichts zu exportieren */
  speicherLeer();
  const keinExport = K.exportieren();
  store.set("klassenraum", null);
  const keinExport2 = K.exportieren();
  gleich("Block6: exportieren ohne Sitzung → null", {ohneSitzung: keinExport, ohneSchluessel: keinExport2}, {ohneSitzung: null, ohneSchluessel: null});

  /* (7) Import ersetzt eine vorhandene Sitzung */
  standFrisch();
  speicherLeer();
  const alt = K.erzeugen({ticketId: "salon-01", seed: 999});
  K.ergebnisEintragen(K.ergebnisDrucken({sitzung: alt.id, platz: 6, halbe: 10, versuche: 0, einheiten: 7}));
  const vorherAlt = Object.keys(K.sitzung().ergebnisse).length;
  const impErsetzt = ohneAusnahme(() => K.importieren(text3));
  gleich("Block6: Import ersetzt die vorhandene Sitzung", {vorher: vorherAlt, nachher: Object.keys(K.sitzung().ergebnisse).length, id: K.sitzung().id},
    {vorher: 1, nachher: 3, id: sitzung.id});

  return {
    beispielExport: text0,
    beispielExportMitEintraegen: text3,
    verlustfrei: {ohneEintraege: {gleich: vorher0 === nachher0, laenge: vorher0.length}, mitDreiEintraegen: {gleich: vorher3 === nachher3, laenge: vorher3.length}},
    exportForm: {felder: Object.keys(d3).sort(), format: d3.format, fassung: d3.fassung, programm: d3.programm},
    fehlerfaelle,
    fassung: {fehlend: fassungFehlt.wert, null: kleineFassung.wert, klein: fassungKlein.wert, text: fehlerfaelle.fassung_text.ergebnis, neuer: fehlerfaelle.neuere_fassung.ergebnis},
    programmFremd: {antwort: impFremd.wert, speicherProgramm: kFremd.programm},
    bom: {mitBom: impBom.wert, rohParse: rohBom.ausnahme ? "JSON.parse scheitert ohne BOM-Behandlung" : "JSON.parse geht auch roh"},
    ohneSitzung: {exportieren: keinExport},
    ersetzt: {vorher: vorherAlt, nachher: Object.keys(K.sitzung().ergebnisse).length},
    laufzeitMs: Date.now() - t0,
  };
}

/* =====================================================================================
   Block 7 · API-Vertragstabelle als Datenstruktur (Grundlage für Bereich B/C)
   ===================================================================================== */
function block7(bloecke){
  const tabelle = [
    {
      funktion: "erzeugen",
      signatur: "erzeugen({ticketId?, skill?, seed?, dauerMin?, titel?}) → sitzung | {fehler, grund}",
      eingabe: "genau eines von ticketId (ID aus Spiel.ticketReihe()) oder skill (ID aus DATEN.skills); seed bestimmt Sitzungskennung und Variante; dauerMin 1..600 (Standard 10); titel überschreibt den Ticket-Titel",
      rueckgabe: "die Sitzung aus § 9: {id, titel, art, ticketId, skill, index, variante, seed, code, eigene, dauerMin, erstellt, ergebnisse}",
      fehler: [
        {fehler: "wahl", grund: "Bitte genau einen Auftrag oder eine Fertigkeit wählen.", ausgeloest: "keines oder beide von ticketId/skill"},
        {fehler: "auftrag", grund: "Diesen Auftrag gibt es in dieser Fassung nicht: <id>.", ausgeloest: "unbekannte ticketId/skill"},
        {fehler: "fassung", grund: "Aus diesem Code lässt sich hier kein spielbarer Auftrag bauen.", ausgeloest: "Kanonisierungsfenster erfolglos (§ 5)"},
        {fehler: "eingabe", grund: "dauerMin muss eine Zahl zwischen 1 und 600 sein.", ausgeloest: "falscher Argumenttyp"},
      ],
      randfaelle: [
        {fall: "null/undefined/Array", ergebnis: {fehler: "eingabe"}},
        {fall: "ticketId und skill zusammen", ergebnis: {fehler: "wahl"}},
        {fall: "unbekannte ticketId", ergebnis: {fehler: "auftrag"}},
        {fall: "Terminal-Auftrag (art terminal)", ergebnis: "eigene:false, seed = variante+1 (feste Fassung, § 5)"},
        {fall: "dauerMin fehlt", ergebnis: "10 (fester Standard, gemessen: § 9-Beispiel nennt für salon-01 ebenfalls 10)"},
        {fall: "seed fehlt", ergebnis: "die Probe nimmt den festen Probeseed; im Programm muss eine Quelle gewählt werden (offener Punkt)"},
      ],
      nebenwirkung: "schreibt store \"klassenraum\" vollständig neu (6 Felder § 9); eine vorhandene Sitzung samt Ergebnissen wird ersetzt; platz des Geräts bleibt erhalten",
      belegt: "messungen.block5_datenschema, messungen.block7_api_vertrag.erzeugenErgebnisse, messungen.zusatz_determinismus.kanonisierung",
    },
    {
      funktion: "ausCode",
      signatur: "ausCode(code) → {ticketId, seed, art, sitzung, index, variante, eigene?, schritte, code} | {fehler, grund} | null",
      eingabe: "Auftragscode NL-XXXX-XX in beliebiger Schreibweise (Kleinbuchstaben, ohne Striche, mit Leerzeichen)",
      rueckgabe: "art ist \"hand\" oder \"generiert\"; bei \"hand\" öffnet B mit Spiel.instanzErstellen({ticketId, seed, quelle:\"klassenraum\", ohneFlow:true}), bei \"generiert\" mit {gen:{skill, seed}} — ticketId allein genügt dort NICHT",
      fehler: [
        {fehler: "länge", grund: "Der Code hat n Zeichen – er braucht 6 (z. B. NL-4F7K-2Q).", ausgeloest: "Nutzteil ≠ 6 Zeichen"},
        {fehler: "zeichen", grund: "Im Code kommt kein I, O, 0 und kein 1 vor – hast du 0 statt O getippt?", ausgeloest: "I, O, 0 oder 1 im Code"},
        {fehler: "prüfziffer", grund: "Die Prüfziffer passt nicht – hast du dich vertippt?", ausgeloest: "Prüfsumme falsch"},
        {fehler: "auftrag", grund: "Diesen Auftrag gibt es in dieser Fassung nicht: <id>.", ausgeloest: "ID fehlt in DATEN"},
        {fehler: "fassung", grund: "Index n liegt außerhalb dieser Fassung (Aufträge: 0..57).", ausgeloest: "Index außerhalb der Tabelle (§ 7c)"},
        {fehler: "fassung", grund: "Aus diesem Code lässt sich hier kein spielbarer Auftrag bauen.", ausgeloest: "Kanonisierung erfolglos (§ 5)"},
      ],
      randfaelle: [
        {fall: "null/undefined/leer", ergebnis: null},
        {fall: "fremder Code (Auftragscode eines anderen Programms)", ergebnis: {fehler: "prüfziffer"} },
        {fall: "Code aus anderer Fassung (Index 58..63 bzw. 27..63)", ergebnis: {fehler: "fassung"}},
        {fall: "Code ohne führendes NL, z. B. 4F7K2Q", ergebnis: "gültig — das führende NL ist optional"},
        {fall: "klein geschrieben, ohne Striche", ergebnis: "gültig (nl4f7k2q = NL-4F7K-2Q)"},
      ],
      nebenwirkung: "keine (reine Rechnung); ruft Spiel.ticketGueltig/Spiel.generiere und füllt damit Spiel.generierte für generierte Fälle",
      belegt: "messungen.block7_api_vertrag.ausCodeErgebnisse, messungen.zusatz_determinismus",
    },
    {
      funktion: "sitzung",
      signatur: "sitzung() → sitzung | null",
      eingabe: "keine",
      rueckgabe: "die Sitzung aus store \"klassenraum\".sitzung oder null",
      fehler: ["keine — fehlender Speicher, fehlende Sitzung und sitzung:null ergeben null"],
      randfaelle: [
        {fall: "kein Speicher-Schlüssel", ergebnis: null},
        {fall: "sitzung: null", ergebnis: null},
        {fall: "sitzung ist ein Array", ergebnis: null},
      ],
      nebenwirkung: "keine (liest nur, store.get liefert eine tiefe Kopie)",
      belegt: "messungen.block4_ergebnisEintragen, messungen.block5_datenschema",
    },
    {
      funktion: "ergebnisCode",
      signatur: "ergebnisCode(inst, abnahme) → \"E-XXXX-XXX\" | {fehler, grund}",
      eingabe: "inst mit inst.klassenraum = {sitzung, platz}, inst.abnahmen, inst.zeitMs; abnahme mit bestanden und sterne",
      rueckgabe: "10 Zeichen inkl. Trennstriche; trägt sitzung, platz, halbe Sterne, Fehlversuche (3 = \"3+\") und Dauer in 10-s-Einheiten (≤ 511 → 5110 s)",
      fehler: [
        {fehler: "eingabe", grund: "Ohne Auftragsinstanz gibt es keinen Ergebnis-Code.", ausgeloest: "inst null/undefined/Zahl"},
        {fehler: "sitzung", grund: "Zu diesem Auftrag läuft keine Sitzung (inst.klassenraum fehlt) …", ausgeloest: "inst.klassenraum fehlt/null/Array"},
        {fehler: "sitzung", grund: "inst.klassenraum.sitzung muss eine Sitzungskennung 1..31 sein …", ausgeloest: "sitzung 0, 32, \"7\""},
        {fehler: "platz", grund: "inst.klassenraum.platz muss 0..31 sein …", ausgeloest: "platz 32, -1, \"3\""},
        {fehler: "abnahme", grund: "Ohne Abnahme gibt es kein Ergebnis.", ausgeloest: "abnahme fehlt/null"},
        {fehler: "abnahme", grund: "Der Auftrag ist nicht bestanden – es gibt keinen Ergebnis-Code.", ausgeloest: "abnahme.bestanden false/fehlt"},
        {fehler: "sterne", grund: "abnahme.sterne muss eine Zahl 0..5 sein …", ausgeloest: "NaN, \"5\", -1, 12"},
      ],
      randfaelle: [
        {fall: "inst null und abnahme null", ergebnis: {fehler: "eingabe"}, hinweis: "Reihenfolge inst → klassenraum → abnahme → bestanden → sterne"},
        {fall: "abnahme.sterne 0", ergebnis: "gültiger Code (halbe = 0)"},
        {fall: "abnahme.sterne 5,25", ergebnis: "wird auf halbe Sterne gerundet (5,5)"},
        {fall: "inst.zeitMs 5.110.000", ergebnis: "dauerS 5110 (gedeckelt)"},
        {fall: "inst.zeitMs negativ", ergebnis: "dauerS 0"},
        {fall: "inst.abnahmen 4", ergebnis: "versuche 3 → Anzeige \"3+\""},
      ],
      nebenwirkung: "keine (reine Rechnung, kein store-Zugriff)",
      belegt: "messungen.block3_ergebnisCode",
    },
    {
      funktion: "ergebnisLesen",
      signatur: "ergebnisLesen(code) → {ok, sitzung, platz, sterne, versuche, dauerS, halbeSterne, dauerEinheiten, code} | {fehler, grund} | null",
      eingabe: "Ergebnis-Code in beliebiger Schreibweise",
      rueckgabe: "sterne in VOLLEN Sternen (halbe/2), dauerS in Sekunden (Einheiten × 10), platz 0 = „ohne Platz“, code = kanonische Schreibweise E-XXXX-XXX",
      fehler: [
        {fehler: "länge", grund: "Der Code hat n Zeichen – er braucht 7 (z. B. E-4F7K-2QM).", ausgeloest: "Nutzteil ≠ 7"},
        {fehler: "zeichen", grund: "…kein I, O, 0 und kein 1…", ausgeloest: "I, O, 0, 1"},
        {fehler: "prüfziffer", grund: "Die Prüfziffer passt nicht – hast du dich vertippt?", ausgeloest: "jede Einzeländerung (gemessen: 5.000/5.000 erkannt)"},
      ],
      randfaelle: [
        {fall: "null/undefined/leer", ergebnis: null},
        {fall: "Auftragscode NL-4F7K-2Q", ergebnis: {fehler: "länge"}},
        {fall: "Code einer anderen Fassung", ergebnis: "nicht erkennbar — der Ergebnis-Code trägt kein Fassungsfeld; nur Sitzung/Platz passen oder nicht"},
      ],
      nebenwirkung: "keine",
      belegt: "messungen.block1_ergebnis_code, messungen.block2_pruefsumme",
    },
    {
      funktion: "ergebnisEintragen",
      signatur: "ergebnisEintragen(code) → {ok, neu} | {ok, neu, ersetzt} | {fehler, grund}",
      eingabe: "ein Ergebnis-Code; mehrere Codes zerlegt die Oberfläche (siehe ergebnisEintragenBlock)",
      rueckgabe: "neu:true beim ersten Mal, neu:false beim zweiten Mal mit demselben Code (Speicher byte-identisch)",
      fehler: [
        {fehler: "leer", grund: "Es wurde kein Ergebnis-Code eingegeben.", ausgeloest: "null/leerer Text"},
        {fehler: "länge", grund: "…", ausgeloest: "zu kurz/lang"},
        {fehler: "zeichen", grund: "…", ausgeloest: "I, O, 0, 1"},
        {fehler: "prüfziffer", grund: "Die Prüfziffer passt nicht – hast du dich vertippt?", ausgeloest: "Vertipper"},
        {fehler: "sitzung", grund: "Es läuft keine Sitzung – Ergebnis-Code nicht angenommen.", ausgeloest: "kein Speicher/keine Sitzung"},
        {fehler: "sitzung", grund: "Dieser Ergebnis-Code gehört zu Sitzung X – hier läuft Sitzung Y.", ausgeloest: "fremde Sitzung"},
      ],
      randfaelle: [
        {fall: "derselbe Code zweimal (auch andere Schreibweise)", ergebnis: {ok: true, neu: false}},
        {fall: "gleicher Platz, anderer Code", ergebnis: {ok: true, neu: true, ersetzt: true}, hinweis: "§ 9: ergebnisse ist eine Abbildung platz → Satz; die letzte Abgabe gewinnt"},
        {fall: "anderer Platz", ergebnis: {ok: true, neu: true}},
        {fall: "unsinniger Code", ergebnis: {fehler: "prüfziffer"}, hinweis: "keine Ausnahme"},
      ],
      nebenwirkung: "bei neu:true genau ein Satz {platz,sterne,dauerS,versuche,code,zeit,quelle} unter sitzung.ergebnisse[platz]; zuletzt und letzte werden gesetzt; bei neu:false und bei jedem Fehler bleibt der Speicher unverändert",
      belegt: "messungen.block4_ergebnisEintragen",
    },
    {
      funktion: "exportieren",
      signatur: "exportieren() → JSON-String | null",
      eingabe: "keine",
      rueckgabe: "{\"format\":\"netzwerk-labor/klassenraum\",\"fassung\":1,\"programm\":…,\"zeit\":…,\"sitzung\":{…}}",
      fehler: ["keine — ohne Sitzung kommt null (nichts zu exportieren)"],
      randfaelle: [
        {fall: "keine Sitzung", ergebnis: null},
        {fall: "3 Ergebnisseinträge", ergebnis: "vollständig im Text enthalten (gemessen: Import stellt sie byte-gleich wieder her)"},
      ],
      nebenwirkung: "keine",
      belegt: "messungen.block6_export_import",
    },
    {
      funktion: "importieren",
      signatur: "importieren(text) → {ok, sitzung, fremdesProgramm?, migriert?} | {fehler, grund}",
      eingabe: "Text der Exportdatei; BOM und umgebender Leerraum werden toleriert",
      rueckgabe: "übernimmt die Sitzung in store \"klassenraum\"; platz des Geräts bleibt, letzte wird null",
      fehler: [
        {fehler: "leer", grund: "Die Datei ist leer.", ausgeloest: "leerer Text/Leerraum/null"},
        {fehler: "eingabe", grund: "importieren erwartet den Text der Datei (String).", ausgeloest: "Zahl/Objekt"},
        {fehler: "json", grund: "Das ist keine JSON-Datei: …", ausgeloest: "kaputtes JSON"},
        {fehler: "format", grund: "Fremdes Format: … – erwartet wird \"netzwerk-labor/klassenraum\".", ausgeloest: "anderes/fremdes Format, Array, Zahl"},
        {fehler: "fassung", grund: "Diese Datei stammt aus einer neueren Fassung (n); dieses Programm kennt nur Fassung 1.", ausgeloest: "fassung > 1 oder keine Zahl"},
        {fehler: "sitzung", grund: "Die Datei enthält keine Sitzung.", ausgeloest: "sitzung fehlt/null/Array/Zahl/ohne id 1..31"},
        {fehler: "ergebnisse", grund: "ergebnisse muss eine Abbildung platz → Satz sein …", ausgeloest: "Array/Text oder ungültiger Satz"},
      ],
      randfaelle: [
        {fall: "fassung fehlt oder 0", ergebnis: {ok: true, migriert: {von: 0, nach: 1}}},
        {fall: "fassung 1", ergebnis: {ok: true}},
        {fall: "fassung > 1", ergebnis: {fehler: "fassung"}},
        {fall: "programm abweichend", ergebnis: {ok: true, fremdesProgramm: "<wert>"}, hinweis: "programm wird nie verglichen (Begründung: Spiel.importPruefen vergleicht nur die Schemaversion; Programmkennungen wie dev oder Datumsbauten sind unzuverlässig)"},
        {fall: "vorhandene Sitzung überschreiben", ergebnis: "wird ersetzt (gemessen: 1 alter Satz → 3 Sätze der Datei)"},
      ],
      nebenwirkung: "schreibt store \"klassenraum\" neu (fassung/programm/platz/zuletzt/sitzung/letzte); die alte Sitzung ist danach weg",
      belegt: "messungen.block6_export_import",
    },
  ];
  /* Messwerte, auf die sich die Tabelle stützt, direkt daneben legen (ohne die großen Blöcke zu doppeln) */
  return {
    hinweis: "Die Tabelle ist die Umsetzungsvorlage für Bereich B/C: Signatur, Rückgabe, Fehlerobjekte, Randfälle, Nebenwirkung. Alle Beispiele sind in dieser Sitzung gemessen (siehe belegt).",
    tabelle,
    erzeugenErgebnisse: bloecke.erzeugen || null,
    ausCodeErgebnisse: bloecke.ausCode || null,
    storeWirkungen: bloecke.storeWirkungen,
    achtFunktionen: tabelle.map(t => t.funktion),
  };
}

/* =====================================================================================
   Block 8 · Nebenwirkungen im Spielstand: quelle "klassenraum" gegen "postfach"
   ===================================================================================== */
function block8(){
  const t0 = Date.now();
  const zustand = () => ({
    angebot: Spiel.st.angebot.length,
    angebotIds: Spiel.st.angebot.slice(-3),
    postfach: Spiel.st.postfach.length,
    erledigt: Spiel.st.erledigt.length,
    postfachZiel: Spiel.postfachZiel(),
    sichtbar: Spiel.postfach().length,
    ungelesen: Spiel.ungelesen(),
    kunden: Object.keys(Spiel.st.kunden).length,
    regulaer: Spiel.st.postfach.filter(i => i.quelle === "postfach" || i.quelle === "generiert").length,
  });
  const messungen = [];

  for (const quelle of ["klassenraum", "postfach", "pruefung"]){
    for (const ohneFlow of [true, false]){
      standFrisch();
      const vorher = zustand();
      const inst = Spiel.instanzErstellen({ticketId: "salon-01", seed: 43, quelle, ohneFlow});
      const nachher = zustand();
      messungen.push({
        quelle, ohneFlow, ticketId: inst.ticketId, iid: inst.iid, instQuelle: inst.quelle, flow: inst.flow,
        netzkennwert: netzkennwert(inst.netz),
        vorher, nachher,
        delta: {angebot: nachher.angebot - vorher.angebot, postfach: nachher.postfach - vorher.postfach,
                erledigt: nachher.erledigt - vorher.erledigt, sichtbar: nachher.sichtbar - vorher.sichtbar,
                ziel: nachher.postfachZiel - vorher.postfachZiel, kunden: nachher.kunden - vorher.kunden},
        imPostfachSichtbar: Spiel.postfach().some(i => i.iid === inst.iid),
        inAngebot: Spiel.st.angebot.includes(inst.ticketId),
      });
    }
  }

  /* generierter Auftrag mit Flow-Zustand „geruest": ohne ohneFlow entsteht ein ANDERES Ticket */
  const skill = TABELLE_SKILLS[0];
  const seed = 43;
  const kanonDef = Spiel.generiere(skill, seed, {});
  const kanonKennwert = netzkennwert(Spiel.startNetz(kanonDef, seed));
  const defKennung = def => ({id: def.id, titel: def.titel, ziele: (def.ziele || []).length, loesung: (def.loesung || []).length});
  const kanonKennung = defKennung(kanonDef);
  const flowFaelle = [];
  for (const ohneFlow of [true, false]){
    standFrisch();
    Spiel.st.flow = {[skill]: {letzte: ["f", "f"], stand: "geruest"}};      /* wie nach zwei Fehlschlägen */
    const vorher = zustand();
    const inst = Spiel.instanzErstellen({gen: {skill, seed}, quelle: "klassenraum", ohneFlow});
    const nachher = zustand();
    const kennung = defKennung(Spiel.defVon(inst));
    flowFaelle.push({
      ohneFlow, ticketId: inst.ticketId, flow: inst.flow, kanonischeId: kanonDef.id, kanonKennung,
      defKennung: kennung, defGleich: JSON.stringify(kennung) === JSON.stringify(kanonKennung),
      netzkennwert: netzkennwert(inst.netz), kanonKennwert, gleichKanonisch: netzkennwert(inst.netz) === kanonKennwert,
      vorher, nachher, delta: {angebot: nachher.angebot - vorher.angebot, postfach: nachher.postfach - vorher.postfach, regulaer: nachher.regulaer - vorher.regulaer},
      imPostfachSichtbar: Spiel.postfach().some(i => i.iid === inst.iid),
    });
  }
  const flowOhne = flowFaelle.find(f => f.ohneFlow === false);
  const flowMit = flowFaelle.find(f => f.ohneFlow === true);
  muss("Block8: ohne ohneFlow liefert der Flow-Regler ein anderes Ticket (andere ID, andere Ziele)",
    flowOhne.ticketId !== kanonDef.id && flowOhne.defGleich === false,
    {ticketId: flowOhne.ticketId, kanonischeId: kanonDef.id, defGleich: flowOhne.defGleich, ziele: flowOhne.defKennung.ziele, zieleKanonisch: kanonKennung.ziele},
    {ticketId: "…-geruest", defGleich: false});
  muss("Block8: mit ohneFlow entsteht genau das kanonische Ticket (ID und Ziele gleich)",
    flowMit.ticketId === kanonDef.id && flowMit.defGleich === true && flowMit.flow === null,
    {ticketId: flowMit.ticketId, defGleich: flowMit.defGleich, flow: flowMit.flow}, {ticketId: kanonDef.id, defGleich: true, flow: null});

  /* Nachschub-Rechnung: zählt ein klassenraum-Auftrag als „regulär"? */
  standFrisch();
  const vorAuffuellen = zustand();
  const instK = Spiel.instanzErstellen({ticketId: "salon-01", seed: 43, quelle: "klassenraum", ohneFlow: true});
  const nachInstanz = zustand();
  const auffuellenFehler = ohneAusnahme(() => Spiel.postfachAuffuellen({still: true}));
  const nachAuffuellen = zustand();
  const nachschub = {
    vorAuffuellen, nachInstanz, nachAuffuellen,
    auffuellenAusnahme: auffuellenFehler.ausnahme,
    klassenraumZaehltNichtAlsRegulaer: nachInstanz.regulaer === vorAuffuellen.regulaer,
    postfachNachAuffuellen: Spiel.st.postfach.map(i => ({quelle: i.quelle, ticketId: i.ticketId})),
  };
  muss("Block8: der Klassenraum-Auftrag zählt nicht als regulärer Postfach-Auftrag", nachschub.klassenraumZaehltNichtAlsRegulaer === true, nachInstanz.regulaer, vorAuffuellen.regulaer);

  for (const m of messungen){
    gleich(`Block8: ${m.quelle}/ohneFlow=${m.ohneFlow} — erledigt unverändert`, m.delta.erledigt, 0);
    gleich(`Block8: ${m.quelle}/ohneFlow=${m.ohneFlow} — postfachZiel unverändert`, m.delta.ziel, 0);
    gleich(`Block8: ${m.quelle}/ohneFlow=${m.ohneFlow} — postfach +1`, m.delta.postfach, 1);
  }
  const kl = messungen.find(m => m.quelle === "klassenraum" && m.ohneFlow);
  const pf = messungen.find(m => m.quelle === "postfach" && m.ohneFlow);
  const pr = messungen.find(m => m.quelle === "pruefung" && m.ohneFlow);
  equalText("Block8: klassenraum und postfach wirken auf den Spielstand gleich", JSON.stringify(kl.delta), JSON.stringify(pf.delta));
  gleich("Block8: klassenraum-Auftrag ist in Spiel.postfach() sichtbar", kl.imPostfachSichtbar, true);
  gleich("Block8: postfach-Auftrag ist in Spiel.postfach() sichtbar", pf.imPostfachSichtbar, true);
  gleich("Block8: pruefung-Auftrag ist NICHT sichtbar", pr.imPostfachSichtbar, false);
  gleich("Block8: angebot wächst beim Handauftrag um 1 (quelle-unabhängig)", {kl: kl.delta.angebot, pf: pf.delta.angebot, pr: pr.delta.angebot}, {kl: 1, pf: 1, pr: 1});

  return {
    erklaerung: "Gemessen wird je (quelle, ohneFlow) ein frischer Spielstand: Spiel._st = Spiel.leererStand(), Spiel._trocken = true, feste Uhr.",
    handauftrag: messungen,
    generiertMitFlowZustand: {kanonischeId: kanonDef.id, kanonKennwert, faelle: flowFaelle},
    nachschub,
    folgerung: "quelle \"klassenraum\" verhält sich im Spielstand wie \"postfach\" (gleiches delta, gleiche Sichtbarkeit) und unterscheidet sich nur im Etikett inst.quelle; \"pruefung\" wäre falsch (nicht sichtbar). ohneFlow:true ist für generierte Aufträge Pflicht, sonst baut der Flow-Regler ein anderes Ticket als der Code meint.",
    laufzeitMs: Date.now() - t0,
  };
}

/* =====================================================================================
   Zusatz · Determinismus (Netzkennwert § 6) und § 5-Randfälle
   ===================================================================================== */
function zusatzDeterminismus(){
  const t0 = Date.now();
  const faelle = [];
  const pruefe = (name, o) => {
    standFrisch();
    const sitzung = K.erzeugen(o);
    if (!sitzung || !sitzung.code) throw new Error("Zusatz/" + name + ": erzeugen lieferte keine Sitzung: " + JSON.stringify(sitzung));
    const aus = K.ausCode(sitzung.code);
    if (!aus || aus.fehler) throw new Error("Zusatz/" + name + ": ausCode(" + sitzung.code + ") → " + JSON.stringify(aus));
    /* Instanz wie der Auftrag beschreibt */
    standFrisch();
    const bau = aus.art === "generiert" ? {gen: {skill: aus.skill, seed: aus.seed}} : {ticketId: aus.ticketId};
    const inst = Spiel.instanzErstellen(Object.assign({}, bau, {seed: aus.seed, quelle: "klassenraum", ohneFlow: true}));
    const kennwertInstanz = netzkennwert(inst.netz);
    /* zweite, unabhängige Herleitung aus dem Code allein */
    const kanon = aus.art === "generiert"
      ? K.kanonGeneriert(aus.skill, aus.variante + 1)
      : K.kanonHand((DATEN.tickets || []).find(t => t.id === aus.ticketId), aus.variante + 1);
    const kennwertAusCode = netzkennwert(Spiel.startNetz(kanon.def, kanon.seed));
    /* Gegenprobe: derselbe Code auf einem „anderen Gerät" (frischer Stand, andere Karriere/Einstellungen) */
    standFrisch();
    Spiel._st.stufe = 99;
    Spiel._st.euro = 12345;
    Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD, {wahl: "AP2", anpassung: "auto"});
    const bau2 = aus.art === "generiert" ? {gen: {skill: aus.skill, seed: aus.seed}} : {ticketId: aus.ticketId};
    const inst2 = Spiel.instanzErstellen(Object.assign({}, bau2, {seed: aus.seed, quelle: "klassenraum", ohneFlow: true, kunde: "salon"}));
    const kennwertAnderesGeraet = netzkennwert(inst2.netz);
    const f = {
      name, eingabe: o, code: sitzung.code, ausCode: aus,
      sitzungSeed: sitzung.seed, kanonSeed: kanon.seed, seedGleich: sitzung.seed === kanon.seed,
      kennwertInstanz, kennwertAusCode, kennwertAnderesGeraet,
      gleich: kennwertInstanz === kennwertAusCode, gleichAnderesGeraet: kennwertInstanz === kennwertAnderesGeraet,
      ticketIdGleich: inst.ticketId === aus.ticketId, netzGleich: JSON.stringify(inst.netz) === JSON.stringify(inst2.netz),
    };
    faelle.push(f);
    gleich(`Zusatz: ${name} — ausCode → derselbe Seed wie erzeugen`, f.seedGleich, f.sitzungSeed, f.kanonSeed);
    gleich(`Zusatz: ${name} — Netzkennwert Instanz = aus dem Code hergeleitet`, f.gleich, {instanz: f.kennwertInstanz, ausCode: f.kennwertAusCode}, {gleich: true});
    gleich(`Zusatz: ${name} — Netzkennwert auf einem anderen Gerät identisch`, f.gleichAnderesGeraet, {a: f.kennwertInstanz, b: f.kennwertAnderesGeraet}, {gleich: true});
  };
  pruefe("hand/salon-01", {ticketId: "salon-01", seed: PROBE_SEED});
  pruefe("hand/Terminal-Auftrag", {ticketId: TABELLE_AUFTRAEGE.find(id => (DATEN.tickets.find(t => t.id === id) || {}).art === "terminal") || TABELLE_AUFTRAEGE[0], seed: PROBE_SEED});
  pruefe("generiert", {skill: TABELLE_SKILLS[0], seed: PROBE_SEED});

  /* § 5-Randfälle: Kanonisierungsfenster erfolglos (synthetischer def), Terminal-Rückfall (echter Auftrag) */
  const synthetisch = K.kanonHand({id: "probe-synthetisch", fuerSeed: () => ({})}, 1);
  const ohneFuerSeed = K.kanonHand({id: "probe-ohne-fuerSeed"}, 1);
  const terminalId = TABELLE_AUFTRAEGE.find(id => (DATEN.tickets.find(t => t.id === id) || {}).art === "terminal");
  let terminalKanon = null;
  if (terminalId){
    const def = Spiel.ticketDef(terminalId);
    terminalKanon = Object.assign({ticketId: terminalId, art: "terminal"}, K.kanonHand(def, 7));
    terminalKanon = {ticketId: terminalId, art: "terminal", seed: terminalKanon.seed, eigene: terminalKanon.eigene, schritte: terminalKanon.schritte, defGleichFester: terminalKanon.def === def};
  }
  /* freier Index (§ 7c): Auftragsindex 58 und Fertigkeitsindex 27 */
  const freierAuftrag = K.ausCode(K.auftragDrucken({sitzung: 5, art: 0, index: 58, variante: 3}));
  const freierSkill = K.ausCode(K.auftragDrucken({sitzung: 5, art: 1, index: 27, variante: 3}));
  const auftragscodeOhneKopf = K.ausCode(K.auftragDrucken({sitzung: 5, art: 0, index: 0, variante: 3}).slice(3).replace("-", ""));
  const fremdcode = K.ausCode("NL-4F7K-2Q");
  const ergebnisAmAuftragsEingang = K.ausCode(K.ergebnisDrucken({sitzung: 7, platz: 3, halbe: 9, versuche: 1, einheiten: 12}));
  const leerCode = K.ausCode(null);
  gleich("Zusatz: § 5 erfolgloses Fenster → fassung (synthetischer def)", synthetisch.fehler, "fassung");
  gleich("Zusatz: § 5 ohne fuerSeed → fassung", ohneFuerSeed.fehler, "fassung");
  gleich("Zusatz: § 7c Auftragsindex 58 → fassung", freierAuftrag.fehler, "fassung");
  gleich("Zusatz: § 7c Fertigkeitsindex 27 → fassung", freierSkill.fehler, "fassung");
  gleich("Zusatz: Code ohne führendes NL ist gültig",
    {ticketId: auftragscodeOhneKopf.ticketId, imFenster: auftragscodeOhneKopf.seed >= 4 && auftragscodeOhneKopf.seed <= 4 + KANON_FENSTER, art: auftragscodeOhneKopf.art},
    {ticketId: TABELLE_AUFTRAEGE[0], imFenster: true, art: "hand"});
  gleich("Zusatz: Formbeispiel NL-4F7K-2Q aus dem Auftrag ist KEIN gültiger Code", fremdcode.fehler, "prüfziffer");
  gleich("Zusatz: Ergebnis-Code am Auftrags-Eingang → länge, Grund nennt ihn",
    {fehler: ergebnisAmAuftragsEingang.fehler, nenntErgebnisCode: /Ergebnis-Code/.test(ergebnisAmAuftragsEingang.grund)},
    {fehler: "länge", nenntErgebnisCode: true});
  gleich("Zusatz: null → null", leerCode, null);
  if (terminalKanon) gleich("Zusatz: Terminal-Auftrag fällt auf die feste Fassung zurück", {eigene: terminalKanon.eigene, seed: terminalKanon.seed, defGleich: terminalKanon.defGleichFester}, {eigene: false, seed: 7, defGleich: true});

  /* Kanonisierungskosten: wie viele Fensterschritte braucht ein Handauftrag? (Teilmenge, Laufzeit beachten) */
  const kosten = [];
  for (const id of TABELLE_AUFTRAEGE.slice(0, 6)){
    const def = (DATEN.tickets || []).find(t => t.id === id);
    const t1 = Date.now();
    const r = K.kanonHand(def, 43);
    kosten.push({ticketId: id, art: def.art, schritte: r.schritte, eigene: r.eigene, fehler: r.fehler || null, seed: r.seed, laufzeitMs: Date.now() - t1});
  }
  return {
    faelle,
    kanonisierung: {synthetisch, ohneFuerSeed, terminal: terminalKanon, freierAuftrag, freierSkill, fremdcode, ergebnisAmAuftragsEingang, auftragscodeOhneKopf, kostenTeilmenge: kosten},
    tabellen: {auftraege: TABELLE_AUFTRAEGE.length, skills: TABELLE_SKILLS.length,
               ersteAuftraege: TABELLE_AUFTRAEGE.slice(0, 3), letzteAuftraege: TABELLE_AUFTRAEGE.slice(-3), ersteSkills: TABELLE_SKILLS.slice(0, 3)},
    netzkennwertHinweis: "§ 6 hier als Gleichheitszeuge umgesetzt (UTF-8-Bytes, FNV1a32, netz.zustand außen vor); die verbindliche Fassung gehört nach src/spiel/klassenraum.js.",
    laufzeitMs: Date.now() - t0,
  };
}

/* =====================================================================================
   Hauptlauf
   ===================================================================================== */
function befehlsErgebnis(){
  const fehlschlaege = pruefungen.filter(p => !p.ok);
  return `exit 0 · ${pruefungen.length} Prüfungen, ${fehlschlaege.length} Fehlschläge · Messblöcke 1-8 vollständig · Laufzeit in messungen.laufzeit`;
}

/* Flüchtige Werte: alles, was nur die Laufzeit beschreibt. Beim Vergleich zweier Ausgaben werden Felder
   mit diesen Namen übersprungen, damit ein Wiederholungslauf die Datei nicht neu schreibt. */
const FLAECHTIG = new Set(["laufzeit", "laufzeitMs", "ms"]);
function ohneFluechtige(x){
  if (Array.isArray(x)) return x.map(ohneFluechtige);
  if (x && typeof x === "object"){
    const o = {};
    for (const [k, v] of Object.entries(x)) if (!FLAECHTIG.has(k)) o[k] = ohneFluechtige(v);
    return o;
  }
  return x;
}

function schreibeJson(inhalt){
  const text = JSON.stringify(inhalt, null, 1) + "\n";
  const alt = fs.existsSync(AUSGABE) ? fs.readFileSync(AUSGABE, "utf8") : null;
  if (alt === text) return {geschrieben: false, grund: "byte-identisch"};
  if (alt !== null){
    let a = null, b = null;
    try { a = JSON.stringify(ohneFluechtige(JSON.parse(alt))); b = JSON.stringify(ohneFluechtige(inhalt)); } catch (e) { a = null; }
    if (a !== null && a === b) return {geschrieben: false, grund: "nur Laufzeitwerte weichen ab – Datei bleibt stehen"};
  }
  fs.writeFileSync(AUSGABE, text, "utf8");
  return {geschrieben: true, grund: alt === null ? "Datei war nicht vorhanden" : "Inhalt geändert"};
}

async function main(){
  const start = Date.now();
  standFrisch();
  speicherLeer();

  /* Umgebung: alles gemessen, was die Probe voraussetzt. store.sofort() liefert false, wenn KEIN Schreiber
     gesetzt ist (src/kern/basis.js:86-88) — damit ist der Speicher reiner Cache, kein Dateizugriff. */
  const tSchreiber = Date.now();
  store.set("klassenraum", {fassung: 1, programm: LABOR_VERSION, platz: null, zuletzt: jetzt(), sitzung: null, letzte: null});
  const sofortErgebnis = await store.sofort();
  const standNachSetzen = store.stand();
  const schreiberMs = Date.now() - tSchreiber;

  const laufzeit = {};
  const block1Erg = block1(); laufzeit.block1_ergebnis_code = block1Erg.laufzeitMs;
  const block2Erg = block2(); laufzeit.block2_pruefsumme = block2Erg.laufzeitMs;
  const block3Erg = block3(); laufzeit.block3_ergebnisCode = block3Erg.laufzeitMs;
  const block4Erg = block4(); laufzeit.block4_ergebnisEintragen = block4Erg.laufzeitMs;
  const block5Erg = block5(); laufzeit.block5_datenschema = block5Erg.laufzeitMs;
  const block6Erg = block6(); laufzeit.block6_export_import = block6Erg.laufzeitMs;
  const block8Erg = block8(); laufzeit.block8_nebenwirkungen = block8Erg.laufzeitMs;
  const zusatzErg = zusatzDeterminismus(); laufzeit.zusatz_determinismus = zusatzErg.laufzeitMs;
  /* erzeugen: Antworten für die API-Tabelle (je Fehlerfall ein echtes Beispiel) */
  const block7T0 = Date.now();
  standFrisch(); speicherLeer();
  const erzeugenBeispiele = {};
  const erzeugenProben = [
    ["ticketId", () => K.erzeugen({ticketId: "salon-01", seed: PROBE_SEED})],
    ["skill", () => K.erzeugen({skill: TABELLE_SKILLS[0], seed: PROBE_SEED})],
    ["beide", () => K.erzeugen({ticketId: "salon-01", skill: TABELLE_SKILLS[0], seed: PROBE_SEED})],
    ["keiner", () => K.erzeugen({seed: PROBE_SEED})],
    ["leer", () => K.erzeugen({})],
    ["null", () => K.erzeugen(null)],
    ["array", () => K.erzeugen([1, 2])],
    ["unbekanntes_ticket", () => K.erzeugen({ticketId: "gibt-es-nicht"})],
    ["unbekannter_skill", () => K.erzeugen({skill: "gibt-es-nicht"})],
    ["dauerMin_text", () => K.erzeugen({ticketId: "salon-01", dauerMin: "10"})],
    ["dauerMin_0", () => K.erzeugen({ticketId: "salon-01", dauerMin: 0})],
    ["dauerMin_601", () => K.erzeugen({ticketId: "salon-01", dauerMin: 601})],
    ["titel_zahl", () => K.erzeugen({ticketId: "salon-01", titel: 7})],
    ["mit_titel", () => K.erzeugen({ticketId: "salon-01", seed: PROBE_SEED, titel: "Klassenraum-Auftrag", dauerMin: 15})],
    ["terminal", () => K.erzeugen({ticketId: TABELLE_AUFTRAEGE.find(id => (DATEN.tickets.find(t => t.id === id) || {}).art === "terminal") || "salon-01", seed: PROBE_SEED})],
  ];
  for (const [name, fn] of erzeugenProben){
    const r = ohneAusnahme(fn);
    erzeugenBeispiele[name] = {ergebnis: r.wert, ausnahme: r.ausnahme};
  }
  /* ausCode: dieselben Randfälle als echte Antworten (Grundlage für die API-Tabelle) */
  const gutesCodePaar = erzeugenBeispiele.mit_titel.ergebnis.code;
  const ausProben = [
    ["null", null], ["undefined", undefined], ["leer", ""], ["nur_striche", "--"],
    ["formbeispiel_aus_dem_auftrag", "NL-4F7K-2Q"],
    ["gueltig", gutesCodePaar],
    ["gueltig_klein_ohne_striche", String(gutesCodePaar).toLowerCase().replace(/-/g, "")],
    ["gueltig_mit_leerzeichen", "  " + gutesCodePaar + "  "],
    ["fremdzeichen_I", String(gutesCodePaar).slice(0, -1) + "I"],
    ["pruefziffer_falsch", String(gutesCodePaar).slice(0, -1) + (String(gutesCodePaar).slice(-1) === "A" ? "B" : "A")],
    ["freier_index_auftrag", K.auftragDrucken({sitzung: 5, art: 0, index: 58, variante: 3})],
    ["freier_index_fertigkeit", K.auftragDrucken({sitzung: 5, art: 1, index: 27, variante: 3})],
    ["ergebnis_code_am_auftragseingang", K.ergebnisDrucken({sitzung: 7, platz: 3, halbe: 9, versuche: 1, einheiten: 12})],
  ];
  const ausCodeBeispiele = {};
  for (const [name, eingabe] of ausProben){
    const r = ohneAusnahme(() => K.ausCode(eingabe));
    ausCodeBeispiele[name] = {eingabe: eingabe === undefined ? "undefined" : eingabe, ergebnis: r.wert, ausnahme: r.ausnahme};
  }
  /* Speicherwirkungen von erzeugen/ergebnisEintragen, sauber vorher/nachher */
  standFrisch(); speicherLeer();
  const wirkung = {};
  wirkung.speicherVorErzeugen = store.get("klassenraum", null);
  const s1 = K.erzeugen({ticketId: "salon-01", seed: PROBE_SEED});
  wirkung.nachErzeugen = Object.keys(store.get("klassenraum"));
  const textVorEintrag = speicherText();
  const codeE = K.ergebnisDrucken({sitzung: s1.id, platz: 3, halbe: 10, versuche: 0, einheiten: 9});
  const e1 = K.ergebnisEintragen(codeE);
  const textNachEintrag = speicherText();
  const e2 = K.ergebnisEintragen(codeE);
  const textNachDoppel = speicherText();
  const e3 = K.ergebnisEintragen(K.ergebnisDrucken({sitzung: 12 !== s1.id ? 12 : 13, platz: 3, halbe: 10, versuche: 0, einheiten: 9}));
  const textNachFehler = speicherText();
  wirkung.ergebnisEintragen = {
    erster: e1, doppelter: e2, fremdeSitzung: e3,
    vorherLaenge: textVorEintrag.length, nachErstemLaenge: textNachEintrag.length,
    doppelUnveraendert: textNachEintrag === textNachDoppel, fehlerUnveraendert: textNachDoppel === textNachFehler,
    satzFelder: Object.keys(store.get("klassenraum").sitzung.ergebnisse["3"]),
    speicherfelder: Object.keys(store.get("klassenraum")),
  };
  const block7Erg = block7({erzeugen: erzeugenBeispiele, ausCode: ausCodeBeispiele, storeWirkungen: wirkung});

  /* Prüfungen zu erzeugen und den Speicherwirkungen gehören in den Prüfsammler */
  for (const name of ["beide", "keiner", "leer", "null", "array"]){
    const w = erzeugenBeispiele[name].ergebnis;
    muss(`Block7: erzeugen/${name} → {fehler, grund}`, !!(w && w.fehler && w.grund), w, {fehler: "…"});
  }
  gleich("Block7: erzeugen/{beide,keiner} → wahl", {a: erzeugenBeispiele.beide.ergebnis.fehler, b: erzeugenBeispiele.keiner.ergebnis.fehler}, {a: "wahl", b: "wahl"});
  gleich("Block7: erzeugen/unbekanntes_ticket → auftrag", erzeugenBeispiele.unbekanntes_ticket.ergebnis.fehler, "auftrag");
  gleich("Block7: erzeugen/unbekannter_skill → auftrag", erzeugenBeispiele.unbekannter_skill.ergebnis.fehler, "auftrag");
  gleich("Block7: erzeugen/dauerMin_text → eingabe", erzeugenBeispiele.dauerMin_text.ergebnis.fehler, "eingabe");
  gleich("Block7: erzeugen/null → eingabe", erzeugenBeispiele.null.ergebnis.fehler, "eingabe");
  gleich("Block7: erzeugen/mit_titel übernimmt Titel und dauerMin",
    {titel: erzeugenBeispiele.mit_titel.ergebnis.titel, dauerMin: erzeugenBeispiele.mit_titel.ergebnis.dauerMin}, {titel: "Klassenraum-Auftrag", dauerMin: 15});
  gleich("Block7: erzeugen/terminal liefert eigene:false", erzeugenBeispiele.terminal.ergebnis.eigene, false);
  gleich("Block7: erzeugen/ticketId liefert art hand + skill null",
    {art: erzeugenBeispiele.ticketId.ergebnis.art, skill: erzeugenBeispiele.ticketId.ergebnis.skill},
    {art: "hand", skill: null});
  const sT = erzeugenBeispiele.ticketId.ergebnis;
  muss("Block7: seed liegt im Kanonisierungsfenster [variante+1, variante+65)",
    Number.isInteger(sT.seed) && sT.seed >= sT.variante + 1 && sT.seed <= sT.variante + KANON_FENSTER,
    {seed: sT.seed, variante: sT.variante}, "variante+1 … variante+64");
  muss("Block7: eigene:false bedeutet seed = variante+1 (Rückfall § 5)",
    sT.eigene !== false || sT.seed === sT.variante + 1, {eigene: sT.eigene, seed: sT.seed, variante: sT.variante}, "seed = variante+1");
  gleich("Block7: Sitzungskennung liegt 1..31", sT.id >= 1 && sT.id <= 31, true);
  gleich("Block7: erzeugen/skill liefert art generiert + ticketId null",
    {art: erzeugenBeispiele.skill.ergebnis.art, ticketId: erzeugenBeispiele.skill.ergebnis.ticketId, index: erzeugenBeispiele.skill.ergebnis.index},
    {art: "generiert", ticketId: null, index: 0});
  gleich("Block7: dauerMin Standard ist 10", erzeugenBeispiele.ticketId.ergebnis.dauerMin, 10);
  /* Idempotenz der Speicherwirkung */
  muss("Block7: Doppeleintrag lässt den Speicher byte-identisch", wirkung.ergebnisEintragen.doppelUnveraendert === true, wirkung.ergebnisEintragen.doppelUnveraendert, true);
  muss("Block7: Fehlerfall lässt den Speicher unverändert", wirkung.ergebnisEintragen.fehlerUnveraendert === true, wirkung.ergebnisEintragen.fehlerUnveraendert, true);
  equalText("Block7: Satz hat genau die § 9-Felder", wirkung.ergebnisEintragen.satzFelder, K.SATZ_FELDER);
  equalText("Block7: Speicher hat genau die § 9-Felder", wirkung.ergebnisEintragen.speicherfelder, K.SPEICHER_FELDER);
  /* ausCode: gemessene Antworten der Randfälle */
  for (const name of Object.keys(ausCodeBeispiele)){
    const r = ausCodeBeispiele[name];
    muss(`Block7: ausCode/${name} ohne Ausnahme`, r.ausnahme === null, r.ausnahme, null);
  }
  const sT2 = erzeugenBeispiele.mit_titel.ergebnis;
  const aT = ausCodeBeispiele.gueltig.ergebnis;
  gleich("Block7: ausCode/null → null", ausCodeBeispiele.null.ergebnis, null);
  gleich("Block7: ausCode/undefined → null", ausCodeBeispiele.undefined.ergebnis, null);
  gleich("Block7: ausCode/leer → null", ausCodeBeispiele.leer.ergebnis, null);
  gleich("Block7: ausCode/nur Striche → null", ausCodeBeispiele.nur_striche.ergebnis, null);
  gleich("Block7: ausCode/gültig → ticketId, seed, art, sitzung wie erzeugen",
    {ticketId: aT.ticketId, seed: aT.seed, art: aT.art, sitzung: aT.sitzung},
    {ticketId: sT2.ticketId, seed: sT2.seed, art: sT2.art, sitzung: sT2.id});
  equalText("Block7: ausCode/klein ohne Striche liefert dasselbe", ausCodeBeispiele.gueltig_klein_ohne_striche.ergebnis, aT);
  equalText("Block7: ausCode/mit Leerzeichen liefert dasselbe", ausCodeBeispiele.gueltig_mit_leerzeichen.ergebnis, aT);
  gleich("Block7: ausCode/Formbeispiel NL-4F7K-2Q → prüfziffer", ausCodeBeispiele.formbeispiel_aus_dem_auftrag.ergebnis.fehler, "prüfziffer");
  gleich("Block7: ausCode/fremdzeichen I → zeichen", ausCodeBeispiele.fremdzeichen_I.ergebnis.fehler, "zeichen");
  gleich("Block7: ausCode/falsches Prüfzeichen → prüfziffer", ausCodeBeispiele.pruefziffer_falsch.ergebnis.fehler, "prüfziffer");
  gleich("Block7: ausCode/freie Indizes (Auftrag 58, Fertigkeit 27) → fassung",
    {auftrag: ausCodeBeispiele.freier_index_auftrag.ergebnis.fehler, fertigkeit: ausCodeBeispiele.freier_index_fertigkeit.ergebnis.fehler},
    {auftrag: "fassung", fertigkeit: "fassung"});
  gleich("Block7: ausCode/Ergebnis-Code → länge mit Hinweis auf die Code-Art",
    {fehler: ausCodeBeispiele.ergebnis_code_am_auftragseingang.ergebnis.fehler, nenntErgebnisCode: /Ergebnis-Code/.test(ausCodeBeispiele.ergebnis_code_am_auftragseingang.ergebnis.grund)},
    {fehler: "länge", nenntErgebnisCode: true});
  laufzeit.block7_api_vertrag = Date.now() - block7T0;

  const fehlschlaege = pruefungen.filter(p => !p.ok);
  const messungen = {
    umgebung: {
      befehl: BEFEHL,
      node: process.version,
      module: lab.module.length,
      auftraege: {tabelle: TABELLE_AUFTRAEGE.length, datenTickets: (DATEN.tickets || []).length, reiheGleichDaten: TABELLE_AUFTRAEGE.join("|") === (DATEN.tickets || []).map(t => t.id).join("|")},
      skills: TABELLE_SKILLS.length,
      laborVersionImLader: LABOR_VERSION,
      uhr: UHR,
      probeSeed: PROBE_SEED,
      operatoren: "ALPHABET " + ALPHABET.length + " Zeichen, " + (ALPHABET.indexOf("I") < 0 && ALPHABET.indexOf("O") < 0 && ALPHABET.indexOf("0") < 0 && ALPHABET.indexOf("1") < 0 ? "ohne I, O, 0, 1" : "MIT I/O/0/1"),
    },
    speicher: {
      schluessel: "klassenraum",
      schreiberVorhanden: sofortErgebnis !== false,
      storeSofortErgebnis: sofortErgebnis,
      storeStandNachSetzen: standNachSetzen,
      begruendung: "kein Schreiber gesetzt (der Lader lädt ohne window/__LABOR_SPEICHER__, die Frühstart-Regel in src/kern/basis.js:137-147 greift nicht); store.set bleibt im Cache, store.sofort() liefert false → die Probe schreibt keine Speicherdatei",
      ms: schreiberMs,
    },
    block1_ergebnis_code: block1Erg,
    block2_pruefsumme: block2Erg,
    block3_ergebnisCode: block3Erg,
    block4_ergebnisEintragen: block4Erg,
    block5_datenschema: block5Erg,
    block6_export_import: block6Erg,
    block7_api_vertrag: block7Erg,
    block8_nebenwirkungen: block8Erg,
    zusatz_determinismus: zusatzErg,
    pruefungen: {gesamt: pruefungen.length, fehlschlaege: fehlschlaege.length, liste: fehlschlaege},
    laufzeit: Object.assign({gesamtMs: Date.now() - start}, laufzeit),
    schreibregel: "A-api.json wird nur neu geschrieben, wenn sich ein Wert außer den Laufzeitwerten ändert (Felder messungen.laufzeit, laufzeitMs, ms). Die Laufzeit des Laufs, der die Datei geschrieben hat, steht darin; spätere Läufe messen neu, lassen die Datei aber stehen (Zeitstempel stabil).",
  };

  const befunde = [];
  befunde.push(`Ergebnis-Code: ${block1Erg.geprueft} Codes (${block1Erg.randwertKombinationen} Randwert-Kombinationen + ${block1Erg.zufallsKombinationen} Zufallskombinationen) im Round-Trip fehlerfrei (${block1Erg.fehlschlaege} Fehlschläge); Länge immer ${block1Erg.laenge.min} Zeichen, keiner länger als 10; Nutzlast 25 Bit = ${block1Erg.moeglicheNutzlasten} mögliche Werte.`);
  befunde.push(`Laufzeit: siehe messungen.laufzeit — die ${block1Erg.zufallsKombinationen} Zufallskombinationen stellen dort den größten Einzelposten; die Grenze der Aufgabe (~10 Minuten) wird weit unterschritten (Node ${process.version}).`);
  const mz = block2Erg.mutationen;
  befunde.push(`Prüfsumme: ${mz.ersetzen.geprueft} Ersetzungen, ${mz.vertauschen.geprueft} Nachbarvertauschungen, ${mz.buchstabe_ziffer.geprueft} Buchstabe↔Ziffer — alle erkannt (jede Quote 100 %), Fehlerklasse immer "prüfziffer"; ${mz.vertauschen_nutz_pruef.geprueft} zusätzliche Vertauschungen Nutz↔Prüfzeichen ebenfalls alle erkannt.`);
  befunde.push(`A↔9 = Wertdifferenz 31: C1 bleibt unverändert (31 ≡ 0 mod 31), nur C2 schlägt an — deshalb wird selbst dieser Fall erkannt (${block2Erg.grenzfaelle.A_nach_9.original} → ${block2Erg.grenzfaelle.A_nach_9.mutiert}, C1 ${block2Erg.grenzfaelle.A_nach_9.C1Vorher} → ${block2Erg.grenzfaelle.A_nach_9.C1Nachher}, C2 ${block2Erg.grenzfaelle.A_nach_9.C2Vorher} → ${block2Erg.grenzfaelle.A_nach_9.C2Nachher}).`);
  befunde.push(`Nachbarvertauschung mit Wertdifferenz 31 (z0=9/z1=A) und (z3=A/z4=9): C1 unverändert, C2 ändert sich, beide erkannt — der Beweis aus § 2 hält der Messung stand.`);
  const b3 = block3Erg.faelle.filter(f => f.code);
  befunde.push(`ergebnisCode aus drei echten Spielständen (${b3.map(f => f.name).join(", ")}): sterne = abnahme.sterne, versuche = max(0, abnahmen-1), dauerS = round(zeitMs/1000) — in allen Fällen gleich (Codes ${b3.map(f => f.code).join(" ")}; Startnetz-Kennwerte ${b3.map(f => f.netzkennwertStart).join(", ")}). Die Abnahme war in allen drei Fällen bestanden und der Abschluss lief ohne Fehler durch.`);
  befunde.push(`Fehlversuche: abnahmen 1..5 → versuche 0,1,2,3,3 (Grenze 3 = Anzeige „3+"); die Grenze ist im Code selbst nicht sichtbar, dort steht nur die Zahl 3.`);
  befunde.push(`Dauer-Einheit 10 s (gemessene Quantisierung): 1 ms → 0 s, 999 ms → 0 s, 7 s → 10 s (+3 s), 123 s → 120 s (−3 s), 5109 s → 5110 s, 5.110.000 ms → 5110 s (gedeckelt, 511 Einheiten), negative Zeit → 0 s. Die Festlegung schweigt zur Rundung; gewählt ist Math.round(dauerS/10) — größter Fehler ±5 s und kein systematischer Versatz gegenüber floor (−9 s) oder ceil (+9 s).`);
  befunde.push(`Idempotenz belegt per Byte-Vergleich: derselbe Code zweimal, dazwischen lief die Uhr 60 s weiter — der Speichertext ist vorher/nachher identisch (${block4Erg.byteVergleich.nachZweitemLaenge} Zeichen), zweites Ergebnis {ok:true,neu:false}.`);
  befunde.push(`Gleicher Platz, anderer Code: § 9 legt ergebnisse als Abbildung platz → Satz fest, deshalb ERSETZT die zweite Abgabe (${JSON.stringify(block4Erg.ersetzt.antwort)}); danach steht genau ein Satz zu Platz 3 mit den Werten des zweiten Codes.`);
  befunde.push(`Fremde Sitzung und fehlende Sitzung ergeben {fehler:"sitzung"} mit sprechendem Grund („Dieser Ergebnis-Code gehört zu Sitzung X – hier läuft Sitzung Y."), ein unsinniger Code {fehler:"prüfziffer"} — alle ohne Ausnahme, der Speicher bleibt unverändert.`);
  befunde.push(`Blockeingabe: drei Codes durch Leerzeichen/Zeilenumbruch getrennt ergeben drei Einträge; ein zweiter Durchlauf meldet alle drei {ok:true,neu:false}; ein unsinniger Code im Block wird einzeln abgewiesen (2 angenommen, 1 abgewiesen).`);
  befunde.push(`Datenschema: erzeugen legt im Speicher genau ${block5Erg.speicherfelder.length} Felder an (${block5Erg.speicherfelder.join(", ")}), die Sitzung genau ${block5Erg.sitzungsfelder.length} (${block5Erg.sitzungsfelder.join(", ")}), ein Ergebnissatz genau ${block5Erg.satzfelder.length} (${block5Erg.satzfelder.join(", ")}) — Reihenfolge und Umfang wie § 9.`);
  befunde.push(`Keine Klarnamen: die Platz-Kennung ist eine ZAHL 0..31 (0 = „ohne Platz", 31 Plätze je Sitzung) und steht so im Speicher und im Ergebnis-Code; gemessen 5.000 Codes: platz ${block5Erg.platzPruefung.min}..${block5Erg.platzPruefung.max}, ${block5Erg.platzPruefung.ausserhalb} außerhalb. Die Nutzlast eines Codes sind genau die fünf Zahlenfelder sitzung/platz/halbe/versuche/einheiten; im Speicher kommen keine Felder mit Namensbezug vor (${block5Erg.verdaechtigeFelder.length} Treffer bei der Suche nach name/kunde/schueler/…). Ein Name passt auch technisch nicht hinein: 5 Bit tragen 32 Werte.`);
  befunde.push(`Export/Import verlustfrei: JSON.stringify der Sitzung vor dem Export und nach dem Import ist gleich — ohne Einträge (${block6Erg.verlustfrei.ohneEintraege.laenge} Zeichen) und mit drei Einträgen (${block6Erg.verlustfrei.mitDreiEintraegen.laenge} Zeichen); ein zweiter Export nach dem Import liefert dieselbe Sitzung.`);
  befunde.push(`Import-Fehlerfälle vollständig mit Beispiel belegt: leerer Text/Leerraum → leer, kaputtes JSON → json, fremdes Format/Array/Zahl → format, fassung > 1 oder keine Zahl → fassung, fehlende/falsche Sitzung → sitzung, ergebnisse als Array oder ungültiger Satz → ergebnisse.`);
  befunde.push(`Fassung: gleiche Fassung → ok; fehlende Fassung und fassung 0 → Migration akzeptiert ({ok:true, migriert:{von:0,nach:1}}, fehlende § 9-Felder werden ergänzt); größere Fassung → {fehler:"fassung"}.`);
  befunde.push(`Abweichendes programm-Feld: akzeptiert und als fremdesProgramm gemeldet, nicht verglichen — Begründung: Spiel.importPruefen (src/spiel/zustand.js:126-134) vergleicht bewusst nur die Schemaversion, weil Programmkennungen wie „dev" oder Datumsbauten unzuverlässig sind; die Sitzung wird byte-gleich übernommen und der Speicher trägt die lokale Kennung (${LABOR_VERSION}).`);
  befunde.push(`Nebenwirkungen: quelle "klassenraum" verhält sich im Spielstand genau wie "postfach" (postfach +1, angebot +1 beim Handauftrag, erledigt und postfachZiel unverändert, in Spiel.postfach() sichtbar); "pruefung" wäre falsch, der Auftrag wäre dort nicht sichtbar. Der Klassenraum-Auftrag zählt nicht als regulärer Postfach-Auftrag (Nachschub-Rechnung unverändert).`);
  const flowO = block8Erg.generiertMitFlowZustand.faelle.find(f => !f.ohneFlow);
  const flowM = block8Erg.generiertMitFlowZustand.faelle.find(f => f.ohneFlow);
  befunde.push(`ohneFlow:true ist Pflicht: mit Flow-Zustand „geruest" baut Spiel.instanzErstellen ohne ohneFlow über Spiel.flow.anpassen ein ANDERES Ticket (${flowO.ticketId} statt ${flowM.ticketId}, Ziele ${flowO.defKennung.ziele} statt ${flowM.defKennung.ziele}). Der Netzkennwert allein zeigte den Unterschied NICHT (beide ${flowO.netzkennwert}) — es ändern sich Kennung und Ziele, nicht das Netz; eine Prüfung muss deshalb Kennung und Ziele vergleichen. Mit ohneFlow:true entsteht genau das kanonische Ticket (inst.flow === null). Bei Handaufträgen ohne Flow-Zustand ist der Unterschied 0 (gemessen).`);
  befunde.push(`Determinismus: erzeugen → ausCode → nicht nur derselbe Seed, sondern derselbe Netzkennwert; auch auf einem „anderen Gerät" (anderer Spielstand, anderes Niveau, anderer Kunde) byte-gleiches Netz (${zusatzErg.faelle.length} Fälle).`);
  befunde.push(`Tabellen § 7: ${zusatzErg.tabellen.auftraege} Aufträge und ${zusatzErg.tabellen.skills} Fertigkeiten; freie Indizes (Auftrag 58, Fertigkeit 27) ergeben {fehler:"fassung"}; das Formbeispiel NL-4F7K-2Q aus dem Auftragstext ist kein gültiger Code ({fehler:"prüfziffer"}).`);
  befunde.push(`Kanonisierung § 5: Terminal-Aufträge fallen auf die feste Fassung zurück (eigene:false, seed = variante+1); ein erfolgloses Fenster ergibt {fehler:"fassung"} (mit synthetischem def belegt, als synthetisch gekennzeichnet).`);
  const okOhneKopf = block1Erg.ohneFuehrendesE;
  befunde.push(`Zeichen-Schreibweise: Kleinbuchstaben, fehlende Striche und Leerzeichen sind gleichwertig (2.000 Codes belegt); das führende E bzw. NL ist optional — "${okOhneKopf.code}" und "${okOhneKopf.code.slice(2).replace("-", "")}" lesen sich gleich, ebenso "${zusatzErg.kanonisierung.auftragscodeOhneKopf.code}" und "${String(zusatzErg.kanonisierung.auftragscodeOhneKopf.code).slice(3).replace("-", "")}" (gemessen).`);
  befunde.push(`Sitzungskennung 0: der Ergebnis-Code kann sie darstellen (5 Bit, im Round-Trip geprüft), ergebnisCode erzeugt sie aber nie und lehnt inst.klassenraum.sitzung = 0 als {fehler:"sitzung"} ab — eine Abgabe ohne Sitzung gibt es nicht.`);
  befunde.push(`Prüfungen: ${pruefungen.length} Behauptungen geprüft, ${fehlschlaege.length} Fehlschläge (${fehlschlaege.map(f => f.name).join("; ") || "keine"}).`);
  befunde.push(`Alle Zahlen dieser Datei stammen aus dem Lauf, der sie geschrieben hat; messungen.laufzeit und die laufzeitMs-Felder sind die einzigen flüchtigen Werte. Ein Wiederholungslauf ändert sie, schreibt die Datei deshalb aber nicht neu (Zeitstempel bleibt stehen, nachgemessen).`);

  const offene = [
    "Rundung der Dauer ist in der Festlegung offen: hier Math.round(dauerS/10). B/C müssen dieselbe Regel benutzen, sonst zeigt die Ampel bei gleicher Zeit andere Sekunden (maximal ±5 s je Eintrag).",
    "ergebnisLesen liefert sterne in vollen Sternen (halbe/2). Wenn B/C halbe Sterne erwarten, ist das eine Vertragsänderung in Architektur.md — bitte dort festschreiben.",
    "Zusatzfelder über den Auftragstext hinaus: ausCode liefert sitzung/index/variante/eigene/schritte/code, ergebnisLesen versuche/halbeSterne/dauerEinheiten/code, ergebnisEintragen ersetzt/ersetzt-Flag. Vorschlag: in Architektur.md nachtragen.",
    "Gleicher Platz + anderer Code = Ersetzen (Abbildungssemantik § 9). Wenn stattdessen „die beste Abgabe gewinnt\" gelten soll, muss die Festlegung das sagen (Stern-/Dauer-Vergleich nötig).",
    "quelle-Wert im Ergebnissatz ist hier \"klassenraum\"; für C1 (Server) wäre \"server\" sinnvoll — Festlegung fehlt.",
    "platz (eigener Platz des Geräts) und letzte (letzter eingetragener Code) im Speicher sind in § 9 nur als Felder genannt, nicht in ihrer Bedeutung. Hier: platz bleibt beim erzeugen/importieren erhalten, letzte wird beim erzeugen/importieren null und beim Eintragen gesetzt.",
    "Neue Fehlerklassen der Referenz (eingabe, abnahme, platz, sterne, leer, json, format, ergebnisse) fehlen in § 8; die Oberfläche braucht sie für deutsche Texte.",
    "erzeugen ohne seed: die Probe nimmt den festen Probeseed. Im Programm muss die Quelle festgelegt werden (Vorschlag: Spiel.neuerSeed(\"klassenraum\") wie postfach.js:56-59).",
    "dauerMin steht in keinem Code — die Lehrkraft plant damit nur; im Ergebnis-Code steckt die echte Dauer. Wenn dauerMin später in den Auftragscode soll, ist das Bit-Budget (20 Bit) zu prüfen.",
    "Die eingefrorene Literalliste der Tabelle (§ 7a) gehört in src/spiel/klassenraum.js; in dieser Probe wird die Reihenfolge aus Spiel.ticketReihe()/DATEN.skills gebildet und nur gezählt.",
  ];

  const nichtGeprueft = [
    "src/** und tests/** wurden nicht angefasst und nicht ausgeführt: die Umsetzung von Spiel.klassenraum in src/spiel/klassenraum.js, die UI (src/ui/klassenraum.js), CSS, Rauchtest, ethos/klassen/sim-stand — nicht Teil dieser Probe.",
    "tests/run.js, sh tools/test.sh, python tools/rauch.py, python tools/klassen.py, python tools/ethos.py wurden in dieser Sitzung NICHT ausgeführt (nicht nötig für diese Probe; keine Aussage über ihren Stand).",
    "Browser-/Einzeldatei-/Tauri-/Android-Weg (DOM, QR, Server C1/C2) nicht geprüft — headless Probe ohne Oberfläche.",
    "Der Netzkennwert ist hier eine eigene Umsetzung von § 6 (UTF-8, FNV1a32, sortierte Schlüssel) nur als Gleichheitszeuge; die verbindliche Fassung in src/spiel/klassenraum.js (A-kanon) wurde nicht gegengeprüft.",
    "Verhalten von Spiel.flow in echten Spielverläufen: der Zustand \"geruest\" wurde konstruiert (st.flow gesetzt), nicht durch zwei echte Fehlschläge erzeugt.",
    "Die Reihenfolge der Prüfungen in ergebnisCode (inst → klassenraum → abnahme → bestanden → sterne) ist eine Entscheidung dieser Referenz, keine Vorgabe der Festlegung.",
    "Nicht geprüft: ob ein Ergebnis-Code aus einer anderen Programmfassung erkennbar ist — der Code trägt kein Fassungsfeld (nur sitzung/platz/sterne/versuche/dauer).",
    "Nicht geprüft: Mehrfach-Sitzungen gleichzeitig, Sitzung ohne Platz, Sperr-/Zeitlogik — der Auftrag schließt das aus.",
  ];

  const ausgabe = {
    thema: "Klassenraum A · API-Probe: Referenzimplementierung Spiel.klassenraum nach A-festlegung.md § 4, § 7-§ 9 (acht Funktionen, Codec, Prüfsumme, Kanonisierung, Speicherform, Export/Import, Nebenwirkungen)",
    stand: "2026-10-06",
    befehle: [
      {befehl: BEFEHL, ergebnis: befehlsErgebnis()},
      {befehl: BEFEHL + "   (Wiederholungsläufe 2 und 3)", ergebnis: "Inhalt bis auf die Laufzeitwerte identisch → Datei nicht neu geschrieben, Zeitstempel der JSON bleibt stehen (in der Sitzung vom 2026-10-06 dreimal nachgemessen)"},
    ],
    messungen,
    befunde,
    offene,
    nichtGeprueft,
  };

  const schreib = schreibeJson(ausgabe);
  console.log("A-api: " + pruefungen.length + " Prüfungen, " + fehlschlaege.length + " Fehlschläge, Laufzeit " + messungen.laufzeit.gesamtMs + " ms");
  for (const f of fehlschlaege) console.log("  FEHLSCHLAG " + f.name + " ist=" + JSON.stringify(f.ist) + " soll=" + JSON.stringify(f.soll));
  console.log("  JSON: " + AUSGABE + " → " + (schreib.geschrieben ? "neu geschrieben (" + schreib.grund + ")" : "unverändert (" + schreib.grund + ")"));
  process.exitCode = fehlschlaege.length ? 1 : 0;
}

if (require.main === module) main().catch(e => { console.error("A-api FEHLER: " + ((e && e.stack) || e)); process.exitCode = 2; });
module.exports = {K, ALPHABET};
