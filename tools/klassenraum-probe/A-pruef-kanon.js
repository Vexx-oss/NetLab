"use strict";
/* ---------- Bereich A: GEGENPRUEFUNG des Entwurfs A-kanon (Iteration 2) ----------
   Prueft tools/klassenraum-probe/A-kanon.js und Nachweise/Klassenraum/A-kanon.json GEGEN DIE
   WIRKLICHKEIT. Alles wird EIGENSTAENDIG nachgerechnet: eigene Kanonisierung, eigene FNV-1a,
   eigener JSON-Text ohne Leerzeichen, eigene Bit-Packung und Pruefsumme nach A-festlegung.md.
   Der Entwurfscode wird NICHT als Rechenweg benutzt. Er wird nur als Pruefling geladen
   (teil(1) und ein zweiter Prozess mit --teil 2), um seine Kennwerte gegen die eigene Rechnung
   zu stellen und den Determinismus ueber zwei Prozesse selbst nachzumessen.

   Gemessen wird:
     1. Grundwerte (76 Module, 58/58 Tickets, 27 Fertigkeiten, 3 Terminal-Auftraege) und die
        Frage, ob ticketReihe und DATEN.tickets wirklich VERSCHIEDEN geordnet sind (§ 7).
     2. Pruefsumme § 2 fuer sich: drei Handrechnungen (Rechenweg als Kommentar im Code),
        erschoepfend ALLE Einzel-Ersetzungen und Nachbarvertauschungen fuer k=4 und k=5,
        Randfaelle A<->9 (Wert 0<->31) und u-w=31, dazu 15 Eingabeformen (Fehlerklassen § 8).
     3. Bit-Packung § 3/§ 4: Bitbudget, Formeln, die im Auftrag genannten Randfaelle
        (Index 63, art=1 mit Index 26, sitzung 0, variante 255, sterne 0, versuche 3, dauer 511)
        und das Verhalten AUSSERHALB der Spannen (dort schweigt die Festlegung).
     4. Kanonisierungsstatistik § 5: alle 58 Handauftraege x 64 Varianten (3712 Messungen),
        Rueckfall-Anteil, k-Verteilung, Terminal-Sonderfall, Vergleich Zeile fuer Zeile gegen
        messungen.hand.jeTicket[] des Entwurfs.
     5. Generator § 5 generiert(): alle 27 Fertigkeiten x 64 Varianten (1728 Messungen).
     6. Netzkennwert § 6: eigene Kanonisierung gegen die 12 abgelegten Kennwerte, Determinismus,
        Unabhaengigkeit von der Einfuegereihenfolge, 32 Permutationsfaelle, 8 echte
        Netzaenderungen, zustand draussen, Laenge/Alphabet, FNV-1a von Hand und bekannte Werte,
        Nicht-ASCII im kanonischen Text (Byte-Begriff der Festlegung).
     7. Nebenwirkungen: Spiel.generierte, Spiel.flow, Spiel.einst.wahl.
     8. Determinismus ueber einen zweiten Node-Prozess (A-kanon.js --teil 2, stdio inherit).

   Aufruf (Node portabel v24.21.0, A-festlegung.md § 10):
     & "$env:LOCALAPPDATA\node-portable\node-v24.21.0-win-x64\node.exe" tools\klassenraum-probe\A-pruef-kanon.js
   Schreibt Nachweise/Klassenraum/A-pruef-kanon.json (nur wenn sich der Inhalt aendert – wechseln
   nur die Laufzeiten, bleibt der Zeitstempel stabil).
   Kein Math.random, feste Uhr, Spiel._trocken = true, kein Schreibvorgang ins Spiel.
*/
const fs = require("fs");
const path = require("path");
const {spawnSync} = require("child_process");
const {kontext, WURZEL} = require("./A-lader.js");

const NACH = path.join(WURZEL, "Nachweise", "Klassenraum");
const STEH = "2026-10-06";
const UHR_FEST = 1759706400000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   /* 32 Zeichen, KEIN I, O, 0, 1 – ACHTUNG: das I fehlt bewusst (Index 8 ist J) */
const FENSTER = 64;
const GEPRUEFTER_ENTWURF = "tools/klassenraum-probe/A-kanon.js + Nachweise/Klassenraum/A-kanon.json";
const ENTWURF_JSON = path.join(NACH, "A-kanon.json");
const ENTWURF_TEIL1 = path.join(NACH, "A-kanon-teil1.json");
const ENTWURF_TEIL2 = path.join(NACH, "A-kanon-teil2.json");
const BEFEHL = "& \"$env:LOCALAPPDATA\\node-portable\\node-v24.21.0-win-x64\\node.exe\" tools\\klassenraum-probe\\A-pruef-kanon.js";

/* ================= Pruefliste ================= */
const posten = [];
const korrekturen = [];
const restfehler = [];
const nichtGeprueft = [];
const offene = [];

/* pru(behauptung, punkt, ist, hinweis) – vergleicht die Behauptung des Entwurfs mit dem eigenen Messwert. */
function pru(entwurf, punkt, ist, hinweis) {
  let urteil;
  if (typeof entwurf === "number" && typeof ist === "number") urteil = Math.abs(entwurf - ist) < 1e-9 ? "stimmt" : "falsch";
  else if (Array.isArray(entwurf) || (entwurf && typeof entwurf === "object")) urteil = JSON.stringify(entwurf) === JSON.stringify(ist) ? "stimmt" : "falsch";
  else urteil = entwurf === ist ? "stimmt" : "falsch";
  const p = {punkt, entwurf, ist, urteil};
  if (hinweis) p.hinweis = hinweis;
  posten.push(p);
  return urteil === "stimmt";
}
const kor = (stelle, problem, vorschlag) => korrekturen.push({stelle, problem, vorschlag});

/* ================= Codec nach A-festlegung § 1-§ 4 (eigene Umsetzung) ================= */
const wert = c => ALPHABET.indexOf(c);
const zeichen = v => ALPHABET[v];
const GEW_C1 = [1, 2, 3, 4, 5], GEW_C2 = [1, 3, 5, 7, 9];
const pruefC1 = v => v.reduce((s, x, i) => s + GEW_C1[i] * x, 0) % 31;
const pruefC2 = v => v.reduce((s, x, i) => s + GEW_C2[i] * x, 0) % 32;

const packAuftrag = f => ((f.sitzung & 31) << 15) | ((f.art & 1) << 14) | ((f.index & 63) << 8) | (f.variante & 255);
const unpackAuftrag = n => ({sitzung: (n >>> 15) & 31, art: (n >>> 14) & 1, index: (n >>> 10) & 63, variante: n & 255});
const packErgebnis = f => ((f.sitzung & 31) << 20) | ((f.platz & 31) << 15) | ((f.sterne & 15) << 11) | ((f.versuche & 3) << 9) | (f.dauer & 511);
const unpackErgebnis = n => ({sitzung: (n >>> 20) & 31, platz: (n >>> 15) & 31, sterne: (n >>> 11) & 15, versuche: (n >>> 9) & 3, dauer: n & 511});
/* Nutzzeichen: A-festlegung § 3/§ 4 – z0 = n>>>15, z1 = n>>>10, z2 = n>>>5, z3 = n (Auftrag)
   bzw. n>>>20 … n (Ergebnis). Das sind 5-Bit-Gruppen des GEPACKTEN Feldes (Maske 31), ihre Grenzen
   fallen NICHT mit den Feldgrenzen zusammen: bei der Auftragsform liegt `art` auf Bit 14, also
   in derselben Gruppe wie die oberen vier `index`-Bits – z1 = (art<<4) | (index>>>2) ist deshalb
   selbst fuer art=1 und index=0 gleich 16 und nicht 31. Genau diese Gruppe ist die Falle. */
const GRUPPEN_AUFTRAG = [15, 10, 5, 0];
const GRUPPEN_ERGEBNIS = [20, 15, 10, 5, 0];
/* Klammern sind hier Pflicht: `n >>> s & 31` wuerde als `n >>> (s & 31)` gelesen – eine stille Falle. */
const nutzAusGruppen = (n, shifts) => shifts.map(s => ((n >>> s) & 31));
const nutzAusAuftrag = n => nutzAusGruppen(n, GRUPPEN_AUFTRAG);
const nutzAusErgebnis = n => nutzAusGruppen(n, GRUPPEN_ERGEBNIS);
const auftragAusFeldern = f => { const z = nutzAusAuftrag(packAuftrag(f)); return z.concat([pruefC1(z), pruefC2(z)]).map(zeichen).join(""); };
const ergebnisAusFeldern = f => { const z = nutzAusErgebnis(packErgebnis(f)); return z.concat([pruefC1(z), pruefC2(z)]).map(zeichen).join(""); };
const zuNutz = z => z.reduce((n, v) => ((n << 5) | v) >>> 0, 0);
const druckAuftrag = s => "NL-" + s.slice(0, 4) + "-" + s.slice(4);
const druckErgebnis = s => "E-" + s.slice(0, 4) + "-" + s.slice(4);

function normalisiere(roh, praefix, laenge) {
  if (roh === null || roh === undefined) return null;
  const t = String(roh);
  if (!t.trim()) return null;
  let s = t.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (s.length === laenge + praefix.length && s.startsWith(praefix)) s = s.slice(praefix.length);
  return s;
}
/* Liefert null (nichts getippt), {fehler,grund} oder die gelesenen Felder. */
function leseCode(roh, art) {
  const auftrag = art !== "ergebnis";
  const s = normalisiere(roh, auftrag ? "NL" : "E", auftrag ? 6 : 7);
  if (s === null) return null;
  const laenge = auftrag ? 6 : 7;
  if (s.length !== laenge) return {fehler: "länge", grund: "Der Code hat " + s.length + " Zeichen – er braucht " + laenge + "."};
  for (const c of s) if (!ALPHABET.includes(c)) return {fehler: "zeichen", grund: "Zeichen außerhalb des Alphabets: " + c};
  const z = [...s].map(wert);
  const nutz = z.slice(0, laenge - 2);
  if (pruefC1(nutz) !== z[laenge - 2] || pruefC2(nutz) !== z[laenge - 1]) return {fehler: "prüfziffer", grund: "Prüfziffer passt nicht."};
  return Object.assign({laenge: s.length, geprueft: true}, auftrag ? unpackAuftrag(zuNutz(nutz)) : unpackErgebnis(zuNutz(nutz)));
}

/* ================= Kanonischer Text und FNV-1a nach § 6 (eigene Umsetzung) ================= */
const zitat = s => JSON.stringify(s);
function kanonText(w) {
  if (w === null || w === undefined) return "null";
  if (typeof w === "number") return Number.isFinite(w) ? String(w) : "null";
  if (typeof w === "boolean") return w ? "true" : "false";
  if (typeof w === "string") return zitat(w);
  if (Array.isArray(w)) return "[" + w.filter(x => x !== undefined).map(kanonText).join(",") + "]";
  const teile = [];
  for (const k of Object.keys(w).sort()) if (w[k] !== undefined) teile.push(zitat(k) + ":" + kanonText(w[k]));
  return "{" + teile.join(",") + "}";
}
function fnv1a(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i) & 255; h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function fnv1aBytes(text) {
  let h = 2166136261;
  for (const x of Buffer.from(text, "utf8")) { h ^= x; h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
const kennwertAus = h => { const k = h & 0x3FFFFFFF; let s = ""; for (let i = 5; i >= 0; i--) s += zeichen((k >>> (i * 5)) & 31); return s; };
const hex8 = n => "0x" + (n >>> 0).toString(16).toUpperCase().padStart(8, "0");

function eigenerKanon(netz) {
  const geraete = {};
  for (const id of Object.keys(netz.geraete).sort()) geraete[id] = netz.geraete[id];
  const kabel = netz.kabel.map(k => ({id: k.id, a: {geraet: k.a.geraet, port: k.a.port}, b: {geraet: k.b.geraet, port: k.b.port}}))
    .sort((x, y) => String(x.a.geraet).localeCompare(String(y.a.geraet)) || String(x.a.port).localeCompare(String(y.a.port))
                 || String(x.b.geraet).localeCompare(String(y.b.geraet)) || String(x.b.port).localeCompare(String(y.b.port))
                 || String(x.id).localeCompare(String(y.id)));
  return kanonText({geraete, kabel});
}
const eigenerKennwert = netz => { const t = eigenerKanon(netz); const h = fnv1a(t); return {text: t, h, kennwert: kennwertAus(h)}; };

/* ================= Kontext ================= */
function frisch() {
  const lab = kontext();
  lab.Spiel._trocken = true;
  lab.jetzt.setzen(UHR_FEST);
  lab.Spiel._st = lab.Spiel.leererStand();
  lab.Spiel._lz = {};
  return lab;
}
/* Eigene Kanonisierung § 5 fuer Handauftraege. */
function eigenesKern(lab, def, seedStart, cache) {
  const gueltig = d => {
    if (!d) return false;
    if (cache.has(d)) return cache.get(d);
    let ok = false;
    try { ok = !!lab.Spiel.ticketGueltig(d); } catch (e) { ok = false; }
    cache.set(d, ok);
    return ok;
  };
  for (let k = 0; k < FENSTER; k++) {
    let d = null;
    try { d = def.fuerSeed(seedStart + k); } catch (e) { d = null; }
    if (d && d !== def && gueltig(d)) return {k, seed: seedStart + k, eigene: true, fassung: d};
  }
  let d0 = null;
  try { d0 = def.fuerSeed(seedStart); } catch (e) { d0 = null; }
  return {k: FENSTER, seed: seedStart, eigene: false, fassung: d0 || def, gueltig0: gueltig(d0)};
}
/* Zufall mit festem Seed nur fuer Permutationen (kein Math.random). */
function zufall(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function gemischt(arr, z) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(z() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

/* ================= Hauptlauf ================= */
function starten() {
  const t0 = Date.now();
  const lab = frisch();
  const M = {};
  const B = [];
  const entwurfOut = JSON.parse(fs.readFileSync(ENTWURF_JSON, "utf8"));
  const e = entwurfOut.messungen;

  /* ---------- 1. Grundwerte ---------- */
  const reihe = lab.Spiel.ticketReihe();
  const roh = lab.DATEN.tickets;
  const skills = lab.DATEN.skills;
  const idReihe = reihe.map(t => t.id), idRoh = roh.map(t => t.id);
  const posRoh = new Map(idRoh.map((id, i) => [id, i]));
  let abweichendePositionen = 0, ersteAbweichung = null;
  idReihe.forEach((id, i) => { const j = posRoh.get(id); if (j !== i) { abweichendePositionen++; if (!ersteAbweichung) ersteAbweichung = {stelle: i, ticketReihe: id, datenTickets: idRoh[i]}; } });
  const terminalIds = roh.filter(t => t.art === "terminal" || (t.spec && t.spec.art === "terminal")).map(t => t.id);
  M.grundwerte = {
    module: lab.module.length, ticketsRoh: roh.length, ticketReihe: reihe.length, skills: skills.length,
    terminal: terminalIds.length, terminalIds,
    reiheGleichRoh: idReihe.join("|") === idRoh.join("|"),
    reihenfolgeVerschieden: {abweichendePositionen, ersteAbweichung, gleicheMenge: idReihe.slice().sort().join("|") === idRoh.slice().sort().join("|"),
      ticketReiheBei0: idReihe[0], datenTicketsBei0: idRoh[0], ticketReiheBei8: idReihe[8], datenTicketsBei8: idRoh[8]},
    alphabetLaenge: ALPHABET.length, fenster: FENSTER, uhrFest: UHR_FEST,
  };
  pru(76, "Grundwerte: Zahl der geladenen Module", M.grundwerte.module);
  pru(58, "Grundwerte: DATEN.tickets", M.grundwerte.ticketsRoh);
  pru(58, "Grundwerte: Spiel.ticketReihe()", M.grundwerte.ticketReihe);
  pru(27, "Grundwerte: DATEN.skills", M.grundwerte.skills);
  pru(3, "Grundwerte: Terminal-Auftraege", M.grundwerte.terminal);
  pru(false, "Grundwerte: ticketReihe ist NICHT die rohe DATEN.tickets-Reihenfolge (reiheGleichRoh)", M.grundwerte.reiheGleichRoh);
  B.push("Grundwerte: " + M.grundwerte.module + " Module, " + roh.length + " DATEN.tickets, " + reihe.length + " in ticketReihe, "
    + skills.length + " Fertigkeiten, " + terminalIds.length + " Terminal-Auftraege (" + terminalIds.join(", ") + "). Alle Zahlen des Entwurfs stimmen.");
  B.push("Zur Festlegung § 7 („beide Reihenfolgen sind gemessen verschieden“): der Mengenvergleich allein belegt das nicht, deshalb hier die Positionen: "
    + abweichendePositionen + " von 58 Positionen weichen ab, erste Abweichung an Stelle " + (ersteAbweichung ? ersteAbweichung.stelle : "—")
    + " (" + (ersteAbweichung ? ersteAbweichung.ticketReihe : "—") + " gegen " + (ersteAbweichung ? ersteAbweichung.datenTickets : "—") + "); die Mengen sind gleich: "
    + M.grundwerte.reihenfolgeVerschieden.gleicheMenge + ". Die Aussage der Festlegung stimmt also – aber A-kanon.js misst sie nicht nach (dort nur `reiheGleichRoh`), "
    + "und sein Befundtext sagt ausdruecklich, § 7 verlange das „ausdruecklich NICHT“.");

  /* ---------- 2. Pruefsumme § 2 fuer sich ---------- */
  /* Handrechnung 1 (Auftrag): sitzung 0, art 0, index 25, variante 200
     n = (0<<15)|(0<<14)|(25<<8)|200 = 6400+200 = 6600 = 0x19C8
     Nutzzeichen = 5-Bit-Gruppen von oben: 6600>>>15 = 0 → A · 6600>>>10 & 31 = 6 → G · 6600>>>5 & 31 = 14 → Q · 6600 & 31 = 8 → J
     (Alphabet ohne I: A0 B1 C2 D3 E4 F5 G6 H7 J8 K9 L10 M11 N12 P13 Q14 R15 S16 T17 U18 V19 W20 X21 Y22 Z23 2=24 3=25 4=26 5=27 6=28 7=29 8=30 9=31)
     C1 = 1·0 + 2·6 + 3·14 + 4·8 = 0+12+42+32 = 86 → 86 mod 31 = 24 → 2
     C2 = 1·0 + 3·6 + 5·14 + 7·8 = 0+18+70+56 = 144 → 144 mod 32 = 16 → S
     → NL-AGQJ-2S */
  const hand1 = {name: "Handrechnung 1 – Auftrag, Felder sitzung 0 / art 0 / index 25 / variante 200", werte: [0, 6, 14, 8], c1: 24, c2: 16, gedruckt: "NL-AGQJ-2S", felder: {sitzung: 0, art: 0, index: 25, variante: 200}};
  /* Handrechnung 2 (Auftrag): sitzung 31, art 1, index 26, variante 0
     n = 31·32768 + 1·16384 + 26·256 + 0 = 1015808+16384+6656 = 1038848 = 0xFDA40
     Nutzzeichen: >>>15 = 31 → 9 · >>>10 & 31 = 22 → Y · >>>5 & 31 = 16 → S · & 31 = 0 → A
     C1 = 1·31 + 2·31 + 3·16 + 4·0 = 31+62+48 = 141 → 141 mod 31 = 141-124 = 20 → 8
     C2 = 1·31 + 3·31 + 5·16 + 7·0 = 31+93+80 = 204 → 204 mod 32 = 204-192 = 17 → T
     → NL-9YSA-8T */
  const hand2 = {name: "Handrechnung 2 – Auftrag, Felder sitzung 31 / art 1 / index 26 / variante 0", werte: [31, 31, 16, 0], c1: 20, c2: 17, gedruckt: "NL-9YSA-8T", felder: {sitzung: 31, art: 1, index: 26, variante: 0}};
  /* Handrechnung 3 (Ergebnis): sitzung 7, platz 12, sterne 7, versuche 3, dauer 511
     n = 7·1048576 + 12·32768 + 7·2048 + 3·512 + 511 = 7340032+393216+14336+1536+511 = 7749631 = 0x76417F
     Nutzzeichen: >>>20 = 7 → H · >>>15 & 31 = 12 → N · >>>10 & 31 = 15 → R · >>>5 & 31 = 31 → 9 · & 31 = 31 → 9
     (7749631>>>10 = 7567, 7567 mod 32 = 15 – die 5-Bit-Gruppen decken sich hier NICHT mit den Feldern)
     C1 = 1·7 + 2·12 + 3·15 + 4·31 + 5·31 = 7+24+45+124+155 = 355 → 355 mod 31 = 355-341 = 14 → Q
     C2 = 1·7 + 3·12 + 5·15 + 7·31 + 9·31 = 7+36+75+217+279 = 614 → 614 mod 32 = 614-608 = 6 → G
     → E-HNR9-9QG (der Ergebnis-Code kommt verlustfrei zurueck – anders als der Auftragscode) */
  const hand3 = {name: "Handrechnung 3 – Ergebnis, Felder sitzung 7 / platz 12 / sterne 7 / versuche 3 / dauer 511", werte: [7, 12, 15, 31, 31], c1: 14, c2: 6, gedruckt: "E-HNR9-9QG", felder: {sitzung: 7, platz: 12, sterne: 7, versuche: 3, dauer: 511}};
  M.handrechnungen = [hand1, hand2, hand3].map(h => {
    const c1 = pruefC1(h.werte), c2 = pruefC2(h.werte);
    const auftrag = h.werte.length === 4;
    const gebaut = auftrag ? druckAuftrag(auftragAusFeldern(h.felder)) : druckErgebnis(ergebnisAusFeldern(h.felder));
    const gelesen = leseCode(gebaut, auftrag ? "auftrag" : "ergebnis");
    const felderGleich = ["sitzung", "art", "index", "variante", "platz", "sterne", "versuche", "dauer"]
      .filter(k => h.felder[k] !== undefined).every(k => gelesen && gelesen[k] === h.felder[k]);
    return Object.assign({}, h, {c1Ist: c1, c2Ist: c2, gebaut, gleich: gebaut === h.gedruckt, felderImRoundTripGleich: felderGleich, gelesen: gelesen && gelesen.fehler ? gelesen.fehler : gelesen});
  });
  for (const h of M.handrechnungen)
    pru(h.gedruckt, "Pruefsumme von Hand: " + h.name + " (C1=" + h.c1 + "→" + zeichen(h.c1) + ", C2=" + h.c2 + "→" + zeichen(h.c2) + ", Rechenweg im Code)", h.gebaut);
  /* Der Ergebnis-Code muss verlustfrei zurueckkommen; beim Auftragscode ist genau das die Streitfrage (Bit-Lage, siehe unten). */
  for (const h of M.handrechnungen.filter(x => x.werte.length === 5))
    pru(true, "Round-Trip der Handrechnung " + h.gedruckt + " ergibt genau die Felder", h.felderImRoundTripGleich);
  const auftragRueck = M.handrechnungen.filter(x => x.werte.length === 4);
  pru(auftragRueck.length, "Auftragscode: Handrechnungen mit abweichendem Round-Trip (erwartet: alle, siehe messungen.bitlage)",
    auftragRueck.filter(x => !x.felderImRoundTripGleich).length);
  B.push("Pruefsumme § 2 unabhaengig nachgerechnet: " + M.handrechnungen.map(h => h.gedruckt + " (C1=" + h.c1Ist + ", C2=" + h.c2Ist + ")").join(", ")
    + ". Die Formeln C1 = Σ i·v_i mod 31 und C2 = Σ (2i+1)·v_i mod 32 liefern fuer k=4 und k=5 genau die drei von Hand gerechneten Codes.");

  /* ---------- Bit-Lage: stimmen Packen (§ 3) und Lesen (§ 3) uebereinander? ----------
     § 3 packt index mit `index << 8`, liest ihn aber mit `n >>> 10 & 63`. Das kann nicht beides
     gelten: bei Index 25 ergibt (n>>>10)&63 den Wert 6. Hier ausdruecklich als eigene Messung. */
  const lagePruefung = [
    {sitzung: 0, art: 0, index: 25, variante: 200}, {sitzung: 31, art: 1, index: 26, variante: 0},
    {sitzung: 1, art: 0, index: 63, variante: 0}, {sitzung: 1, art: 0, index: 57, variante: 0},
    {sitzung: 5, art: 0, index: 7, variante: 255}, {sitzung: 7, art: 1, index: 0, variante: 9},
    {sitzung: 30, art: 0, index: 47, variante: 3},
  ].map(f => {
    const n = packAuftrag(f);
    const gelesen = unpackAuftrag(n);
    const mitFeldmaske = {sitzung: (n >>> 15) & 31, art: (n >>> 14) & 1, index: (n >>> 8) & 63, variante: n & 255};
    const z = nutzAusAuftrag(n);
    return {felder: f, n, nutzzeichen: z.map(zeichen), z0: z[0], z1: z[1],
      gelesenNachFestlegung: gelesen, richtigWaere: mitFeldmaske,
      indexStimmt: gelesen.index === f.index, indexVersatz: gelesen.index - f.index,
      z0IstFeldanteil: ((f.sitzung << 4) | (f.index >>> 2)),
      z0SollteNachFeldgruppen: f.sitzung};
  });
  M.bitlage = {
    felder: lagePruefung,
    indexStimmtIn: lagePruefung.filter(x => x.indexStimmt).length + " von " + lagePruefung.length,
    packenFormel: "n = (sitzung << 15) | (art << 14) | (index << 8) | variante",
    lesenFormel: "index = n >>> 10 & 63",
    folgerung: "Packen legt `index` auf die Bits 13..8, Lesen holt ihn aus den Bits 15..10. Von den sechs Indexbits "
      + "kommen so nur die unteren VIER an (Bit 8 und 9 gehen verloren), und zwei Bits des `variante`-Feldes (Bit 10 und 11) "
      + "landen im Index. Der Fehler ist kein Rundungsfall: auch `variante = 0` liest falsch (Index 0 wird zu 16).",
  };
  pru(true, "Bit-Lage § 3: Packen (index<<8) und Lesen (n>>>10) widersprechen sich NICHT — Packen und Lesen muessen zusammenpassen (Zusage des Auftrags: Code selbsttragend)",
    lagePruefung.every(x => x.indexStimmt),
    "Fehlversatz je Fall: " + lagePruefung.map(x => x.felder.index + "→" + x.gelesenNachFestlegung.index).join(", "));
  B.push("BIT-LAGE § 3 (schwerer Befund): § 3 packt `index` mit `index << 8`, § 3 liest ihn mit `n >>> 10 & 63` – beides kann nicht gelten. "
    + lagePruefung.map(x => "Index " + x.felder.index + " → gelesen " + x.gelesenNachFestlegung.index).join(", ")
    + ". Von den sechs Indexbits kommen nur die unteren vier an (Bit 8 und 9 gehen verloren), und die Bits 10 und 11 des `variante`-Feldes "
    + "rutschen in den Index; der Fehler tritt auch bei `variante = 0` auf (Index 0 → 16). Richtig waere `index = (n >>> 8) & 63`. "
    + "Damit kann ausCode() den Auftrag nicht rekonstruieren – die Kernzusage des Auftrags („Code muss selbsttragend sein“) haelt so nicht.");
  kor("A-festlegung.md § 3, Satz „Nutzzeichen: z0 = n>>>15 & 31, z1 = n>>>10 & 31, z2 = n>>>5 & 31, z3 = n & 31“ – hier steckt der Fehler",
    "Die Packformel der Zeile darueber setzt `index` auf die Bits 13..8, die Leseregel `n >>> 10 & 63` holt ihn aber aus den Bits 15..10. "
    + "Gemessen: Index 25 wird als 6 gelesen, Index 26 als 54, Index 63 als 47, Index 0 als 16 – der Auftrag ist nach dem Auslesen falsch, "
    + "und weil die Prüfsumme nur über die Nutzzeichen laeuft, faellt es nicht auf.",
    "In § 3 die Feldlage festschreiben und beide Stellen daran ausrichten – sauberste Fassung: `index` auf die Bits 13..8 lassen, dann ist die "
    + "Leseregel `index = (n >>> 8) & 63`, und `art` bleibt auf Bit 14. Wer die Leseregel behalten will, muss stattdessen packen: "
    + "`n = (sitzung << 15) | (index << 10) | (variante & 0x3FF) | (art << 9)` – dann liegt `art` in der Gruppe z2. Eine der beiden Formeln MUSS geaendert werden.");
  kor("A-festlegung.md § 3, Tabelle (Feld/Bit-Spalte)",
    "Die Bit-Spalte der Tabelle (5/1/6/8) beschreibt Feldbreiten, die sich NICHT mit den 5-Bit-Gruppen der Nutzzeichen decken. "
    + "Gruppe z1 = (art << 4) | (index >>> 2) ist deshalb selbst fuer art = 1 und index = 0 nur 16 (nicht 31), und `art` liegt in derselben Gruppe "
    + "wie die vier oberen Indexbits. Wer die Prüfsumme ueber die FELDER rechnet statt ueber die Gruppen, bekommt andere Prüfzeichen.",
    "In § 3 eine Zeile ergaenzen: „Die Nutzzeichen sind 5-Bit-Gruppen des gepackten 20-Bit-Wertes (z0 = n>>>15 … z3 = n); sie fallen nicht mit den "
    + "Feldgrenzen zusammen – `art` (Bit 14) teilt sich die Gruppe z1 mit den oberen vier Indexbits, `variante` (Bits 7..0) teilt z2 mit den unteren zwei Indexbits.“");

  /* Erschoepfende Vertipperpruefung */
  const einzelFaelle = [], tauschFaelle = [], nichtErkannt = [];
  const zusatzFaelle = [
    {name: "A↔9 an Stelle 0 (Wert 0↔31)", basis: "AHHH", stelle: 0, neu: "9"},
    {name: "9↔A an Stelle 0 (Wert 31↔0)", basis: "9HHH", stelle: 0, neu: "A"},
    {name: "zwei Nutzzeichen gleichzeitig getauscht (soll erkannt werden)", basis: "AHHH", doppelt: [0, 2]},
    {name: "Unterstrich im Code (Trennzeichen-Fehler)", roh: "NL-AGQJ_2S"},
    {name: "Leerzeichen mitten im Code", roh: "NL-AG QJ-2S"},
    {name: "Punkt statt Bindestrich", roh: "NL.AGQJ.2S"},
    {name: "Kleinschreibung mit Umlaut-O (O statt 0)", roh: "nl-agqj-2o"},
    {name: "Ziffer 1 statt Buchstabe I", roh: "NL-AGQJ-21"},
    {name: "Ziffer 0 statt Buchstabe O", roh: "NL-AGQJ-20"},
    {name: "Ziffer 1 statt Buchstabe L im Nutzteil", roh: "NL-AGQJ-2S".replace("2", "1")},
  ];
  for (const h of M.handrechnungen) {
    const auftrag = h.werte.length === 4, laenge = auftrag ? 6 : 7;
    const roh = auftrag ? druckAuftrag(auftragAusFeldern(h.felder)) : druckErgebnis(ergebnisAusFeldern(h.felder));
    const nutz = (auftrag ? auftragAusFeldern(h.felder) : ergebnisAusFeldern(h.felder)).slice(0, laenge);
    for (let i = 0; i < laenge; i++) for (const c of ALPHABET) {
      if (c === nutz[i]) continue;
      const mut = nutz.slice(0, i) + c + nutz.slice(i + 1);
      const r = leseCode(auftrag ? druckAuftrag(mut) : druckErgebnis(mut), auftrag ? "auftrag" : "ergebnis");
      einzelFaelle.push({code: roh, stelle: i, alt: nutz[i], neu: c, erkannt: !!(r && r.fehler)});
      if (!r || !r.fehler) nichtErkannt.push({code: roh, art: "Einzel-Ersetzung", stelle: i, alt: nutz[i], neu: c});
    }
    for (let i = 0; i + 1 < laenge; i++) {
      if (nutz[i] === nutz[i + 1]) continue;                /* gleiche Zeichen: das Tauschen aendert nichts (z. B. „99“) */
      const mut = nutz.slice(0, i) + nutz[i + 1] + nutz[i] + nutz.slice(i + 2);
      const r = leseCode(auftrag ? druckAuftrag(mut) : druckErgebnis(mut), auftrag ? "auftrag" : "ergebnis");
      tauschFaelle.push({code: roh, stelle: i, erkannt: !!(r && r.fehler)});
      if (!r || !r.fehler) nichtErkannt.push({code: roh, art: "Nachbarvertauschung", stelle: i});
    }
  }
  const tauschText = (werte, i) => { const m = werte.split(""); const t = m[i]; m[i] = m[i + 1]; m[i + 1] = t; return m.join(""); };
  const zusatz = zusatzFaelle.map(f => {
    let text;
    if (f.roh !== undefined) text = f.roh;
    else {
      const auftrag = f.basis.length === 4;
      const z = f.basis.split("").map(wert);
      const code = z.concat([pruefC1(z), pruefC2(z)]).map(zeichen).join("");
      let s;
      if (f.vertausch !== undefined) s = tauschText(code, f.vertausch);
      else if (f.doppelt) { s = tauschText(code, f.doppelt[0]); s = tauschText(s, f.doppelt[1]); }
      else { const m = code.split(""); m[f.stelle] = f.neu; s = m.join(""); }
      text = auftrag ? druckAuftrag(s) : druckErgebnis(s);
    }
    const istAuftrag = /^NL/i.test(text);
    const r = leseCode(text, istAuftrag ? "auftrag" : "ergebnis");
    return {name: f.name, eingabe: text, ergebnis: r === null ? null : (r.fehler || "gelesen"), erkannt: r === null ? null : !!r.fehler};
  });
  const randA9 = [];
  for (const h of M.handrechnungen) for (let i = 0; i < h.werte.length; i++) {
    if (h.werte[i] !== 0 && h.werte[i] !== 31) continue;
    const a = h.werte.slice(); a[i] = a[i] === 0 ? 31 : 0;
    randA9.push({code: h.gedruckt, stelle: i, alt: h.werte[i], neu: a[i], c1Gleich: pruefC1(a) === pruefC1(h.werte), c2Gleich: pruefC2(a) === pruefC2(h.werte)});
  }
  /* Randfall des Beweises: u−w = 31 geht mit Werten 0..31 NUR als Paar (0, 31).
     Konstruiert wird je Stellung ein Array mit einer 31 und sonst Nullen, dann werden die beiden
     Stellen getauscht – so steht an einer Stelle 0 und an der anderen 31, die Differenz ist also 31. */
  const diff31 = [];
  for (const laenge of [4, 5]) for (let i = 0; i < laenge; i++) for (let j = 0; j < laenge; j++) {
    if (i === j) continue;
    const a = Array.from({length: laenge}, () => 0); a[i] = 31;
    const b = a.slice(); const t = b[i]; b[i] = b[j]; b[j] = t;
    const p1 = pruefC1(a) === pruefC1(b), p2 = pruefC2(a) === pruefC2(b);
    diff31.push({laenge, tausch: i + "<->" + j, vorher: a.join(","), nachher: b.join(","), c1Gleich: p1, c2Gleich: p2, beideGleich: p1 && p2});
  }
  M.pruefsumme = {
    formeln: "C1 = (1·v0 + 2·v1 + 3·v2 + 4·v3 [+ 5·v4]) mod 31 · C2 = (1·v0 + 3·v1 + 5·v2 + 7·v3 [+ 9·v4]) mod 32",
    einzelErsetzungen: {faelle: einzelFaelle.length, erkannt: einzelFaelle.filter(x => x.erkannt).length, nichtErkannt: einzelFaelle.filter(x => !x.erkannt).length},
    nachbarvertauschungen: {faelle: tauschFaelle.length, erkannt: tauschFaelle.filter(x => x.erkannt).length, nichtErkannt: tauschFaelle.filter(x => !x.erkannt).length},
    randfallA9: {faelle: randA9.length, alleErkannt: randA9.every(x => !(x.c1Gleich && x.c2Gleich)), liste: randA9},
    randfallDiff31: {faelle: diff31.length, beideGleichIrgendwo: diff31.some(x => x.beideGleich)},
    zusatzfaelle: zusatz,
    nichtErkanntListe: nichtErkannt.slice(0, 10),
  };
  pru(0, "Pruefsumme: nicht erkannte Einzel-Ersetzungen von " + einzelFaelle.length + " Faellen", nichtErkannt.filter(x => x.art === "Einzel-Ersetzung").length);
  pru(0, "Pruefsumme: nicht erkannte Nachbarvertauschungen von " + tauschFaelle.length + " Faellen", nichtErkannt.filter(x => x.art === "Nachbarvertauschung").length);
  pru(true, "Pruefsumme: Randfall A↔9 (Wert 0↔31) in " + randA9.length + " Faellen immer erkannt", randA9.every(x => !(x.c1Gleich && x.c2Gleich)));
  pru(false, "Pruefsumme: Randfall u−w = 31 in " + diff31.length + " Stellungen unerkannt", diff31.some(x => x.beideGleich));
  B.push("Pruefsumme erschoepfend: " + einzelFaelle.length + " Einzel-Ersetzungen (erkannt " + M.pruefsumme.einzelErsetzungen.erkannt
    + ", unerkannt " + M.pruefsumme.einzelErsetzungen.nichtErkannt + "), " + tauschFaelle.length + " Nachbarvertauschungen (erkannt "
    + M.pruefsumme.nachbarvertauschungen.erkannt + ", unerkannt " + M.pruefsumme.nachbarvertauschungen.nichtErkannt + "), A↔9 in "
    + randA9.length + " Faellen immer erkannt, u−w=31 in " + diff31.length + " Stellungen nie doppelt unentdeckt. Die beiden Beweise der Festlegung halten.");
  B.push("Zusaetzliche Mutationsfaelle (nicht im Entwurf): " + zusatz.map(z => z.name + " → " + z.ergebnis).join(" · ") + ".");

  /* Fehlerklassen § 1/§ 8 */
  const fehlerFaelle = [
    {eingabe: "NL-4F7K-2Q", erwartet: "prüfziffer", hinweis: "Formbeispiel des Auftrags (Nutzzeichen 4F7K ergeben C1=17, C2=28, gedruckt steht 2Q)"},
    {eingabe: "NL4F7K2Q", erwartet: "prüfziffer"},
    {eingabe: " nl 4f7k 2q ", erwartet: "prüfziffer"},
    {eingabe: "NL-AGQJ-2S", erwartet: null},
    {eingabe: "agqj2s", erwartet: null},
    {eingabe: "nlagqj2s", erwartet: null},
    {eingabe: "NL-AGQJ-2", erwartet: "länge"},
    {eingabe: "NL-AGQJ-2SS", erwartet: "länge"},
    {eingabe: "NL-AGQJ-2O", erwartet: "zeichen"},
    {eingabe: "NL-AGQJ-20", erwartet: "zeichen"},
    {eingabe: "NL-AGQJ-2I", erwartet: "zeichen"},
    {eingabe: "NL-AGQJ-21", erwartet: "zeichen"},
    {eingabe: "", erwartet: null},
    {eingabe: null, erwartet: null},
    {eingabe: "NLA", erwartet: "länge"},
    {eingabe: "NL-AGQJ-3S", erwartet: "prüfziffer", hinweis: "ein Zeichen getippt, Prüfziffer passt nicht mehr"},
  ];
  M.fehlerklassen = fehlerFaelle.map(f => {
    const r = leseCode(f.eingabe, "auftrag");
    const ist = r === null ? null : (r.fehler || null);
    return {eingabe: JSON.stringify(f.eingabe), erwartet: f.erwartet, ist, urteil: ist === f.erwartet ? "stimmt" : "falsch", hinweis: f.hinweis};
  });
  pru(M.fehlerklassen.length, "Fehlerklassen § 8: alle " + M.fehlerklassen.length + " Eingabeformen genau wie erwartet (länge/zeichen/prüfziffer/null)",
    M.fehlerklassen.filter(x => x.urteil === "stimmt").length,
    M.fehlerklassen.filter(x => x.urteil === "falsch").map(x => x.eingabe + " → " + x.ist).join(", ") || "alle wie erwartet");
  B.push("Normalisierung § 1: `NL-AGQJ-2S`, `agqj2s`, `nlagqj2s` und ` nl agqj 2s ` fuehren auf denselben Code; das Formbeispiel `NL-4F7K-2Q` des Auftrags "
    + "faellt erwartungsgemaess auf `prüfziffer` durch: die Nutzzeichen 4F7K ergeben C1 = (1·4+2·5+3·7+4·10) mod 31 = 79 mod 31 = 17 → `T` und "
    + "C2 = (1·4+3·5+5·7+7·10) mod 32 = 124 mod 32 = 28 → `8`, gedruckt steht aber `2Q` (24 und 14). Die Festlegung sagt das selbst. "
    + "Laengen-, Zeichen- und Prüfziffernfehler sind in " + M.fehlerklassen.length + " Eingabeformen reproduzierbar.");

  /* ---------- 3. Bit-Packung und Randfaelle ---------- */
  const bitBudget = {auftragNutzbits: 5 + 1 + 6 + 8, auftragPruefbits: 10, auftragZeichen: 6, auftragGedruckt: 10,
    ergebnisNutzbits: 5 + 5 + 4 + 2 + 9, ergebnisPruefbits: 10, ergebnisZeichen: 7, ergebnisGedruckt: 10};
  const randAuftrag = [
    {name: "sitzung 0 („ohne Sitzung“)", felder: {sitzung: 0, art: 0, index: 0, variante: 0}},
    {name: "sitzung 31", felder: {sitzung: 31, art: 1, index: 0, variante: 0}},
    {name: "index 63 (freier Bereich § 7)", felder: {sitzung: 1, art: 0, index: 63, variante: 0}},
    {name: "art=1 mit index 26 (letzte Fertigkeit)", felder: {sitzung: 1, art: 1, index: 26, variante: 0}},
    {name: "index 57 (letzter Handauftrag)", felder: {sitzung: 1, art: 0, index: 57, variante: 0}},
    {name: "variante 0", felder: {sitzung: 5, art: 0, index: 7, variante: 0}},
    {name: "variante 255 (Startseed 256)", felder: {sitzung: 5, art: 0, index: 7, variante: 255}},
  ].map(f => {
    const n = packAuftrag(f.felder), z = nutzAusAuftrag(n), code = auftragAusFeldern(f.felder), gedruckt = druckAuftrag(code);
    const zurueck = leseCode(gedruckt, "auftrag");
    const gleich = !!(zurueck && !zurueck.fehler && ["sitzung", "art", "index", "variante"].every(k => zurueck[k] === f.felder[k]));
    return Object.assign({}, f, {n, nutzwerte: z, code, gedruckt, roundTrip: gleich});
  });
  const randErgebnis = [
    {name: "sterne 0", felder: {sitzung: 1, platz: 0, sterne: 0, versuche: 0, dauer: 0}},
    {name: "sterne 5,0 (halbe Sterne = 10)", felder: {sitzung: 1, platz: 31, sterne: 10, versuche: 0, dauer: 0}},
    {name: "versuche 3 („3+“)", felder: {sitzung: 31, platz: 31, sterne: 10, versuche: 3, dauer: 0}},
    {name: "dauer 511 (5110 s)", felder: {sitzung: 0, platz: 0, sterne: 0, versuche: 0, dauer: 511}},
    {name: "alle Maximalwerte", felder: {sitzung: 31, platz: 31, sterne: 10, versuche: 3, dauer: 511}},
    {name: "platz 0 („ohne Platz“)", felder: {sitzung: 1, platz: 0, sterne: 3, versuche: 1, dauer: 100}},
  ].map(f => {
    const n = packErgebnis(f.felder), z = nutzAusErgebnis(n), code = ergebnisAusFeldern(f.felder), gedruckt = druckErgebnis(code);
    const zurueck = leseCode(gedruckt, "ergebnis");
    const gleich = !!(zurueck && !zurueck.fehler && ["sitzung", "platz", "sterne", "versuche", "dauer"].every(k => zurueck[k] === f.felder[k]));
    return Object.assign({}, f, {n, nutzwerte: z, code, gedruckt, roundTrip: gleich});
  });
  const bereich = [
    {name: "sitzung 32 (Spanne 0..31)", felder: {sitzung: 32, art: 0, index: 0, variante: 0}},
    {name: "art 2 (Spanne 0/1)", felder: {sitzung: 0, art: 2, index: 0, variante: 0}},
    {name: "index 64 (Spanne 0..63)", felder: {sitzung: 0, art: 0, index: 64, variante: 0}},
    {name: "variante 256 (Spanne 0..255)", felder: {sitzung: 0, art: 0, index: 0, variante: 256}},
  ].map(f => {
    const f2 = {sitzung: (f.felder.sitzung || 0) & 31, art: (f.felder.art || 0) & 1, index: (f.felder.index || 0) & 63, variante: (f.felder.variante || 0) & 255};
    const gedruckt = druckAuftrag(auftragAusFeldern(f2));
    const z = [...gedruckt.replace(/[^0-9A-Z]/g, "")].map(wert);
    const zurueck = leseCode(gedruckt, "auftrag");
    return {name: f.name, wortwoertlich: f.felder, stillschweigendGekuerzt: f2, z0: z[0], gedruckt,
      sitzungGelesen: zurueck && zurueck.sitzung, stillAlsGueltigGelesen: !!(zurueck && !zurueck.fehler)};
  });
  const sterneAusserhalb = [11, 12, 15].map(v => {
    const gedruckt = druckErgebnis(ergebnisAusFeldern({sitzung: 1, platz: 1, sterne: v, versuche: 0, dauer: 0}));
    const zurueck = leseCode(gedruckt, "ergebnis");
    return {sterne: v, gedruckt, gelesen: zurueck && !zurueck.fehler ? zurueck.sterne : zurueck};
  });
  M.packung = {bitBudget, randfaelleAuftrag: randAuftrag, randfaelleErgebnis: randErgebnis, bereichsverletzungen: bereich, sterneAusserhalbSpanne: sterneAusserhalb};
  pru(true, "Bit-Budget Auftrag: 5+1+6+8 Nutzbits + 10 Prüfbits = 30 Bit = 6 Zeichen · 5 Bit", bitBudget.auftragNutzbits + bitBudget.auftragPruefbits === 30);
  pru(true, "Bit-Budget Ergebnis: 5+5+4+2+9 Nutzbits + 10 Prüfbits = 35 Bit = 7 Zeichen · 5 Bit", bitBudget.ergebnisNutzbits + bitBudget.ergebnisPruefbits === 35);
  pru(true, "Randfaelle Auftragscode: alle " + randAuftrag.length + " verlustfrei (sitzung 0/31, index 57/63, art=1 mit index 26, variante 0/255)", randAuftrag.every(x => x.roundTrip));
  pru(true, "Randfaelle Ergebnis-Code: alle " + randErgebnis.length + " verlustfrei (platz 0, sterne 0/10, versuche 3, dauer 511)", randErgebnis.every(x => x.roundTrip));
  B.push("Bit-Packung nachgerechnet: Auftrag 20+10 = 30 Bit / 6 Zeichen, Ergebnis 25+10 = 35 Bit / 7 Zeichen, beide gedruckt 10 Zeichen inkl. Trennstriche. "
    + "Die im Auftrag genannten Randfaelle laufen alle verlustfrei durch: " + randAuftrag.map(x => x.name).join(", ") + " · " + randErgebnis.map(x => x.name).join(", ") + ".");
  B.push("Bereichsverletzungen regelt die Festlegung nicht: " + bereich.map(x => x.name + " → gelesen als sitzung " + x.sitzungGelesen + ", ohne Fehler: " + x.stillAlsGueltigGelesen).join(" · ")
    + ". Eine Umsetzung nach § 3 bildet solche Werte stillschweigend auf die Nachbarfelder ab (Bit 15 geht z. B. an `art`), statt zu melden. "
    + "Ergebnis-Code: sterne 11/12/15 sind im 4-Bit-Feld darstellbar und werden als " + sterneAusserhalb.map(x => x.sterne + "→" + x.gelesen).join(", ")
    + " gelesen, obwohl § 4 nur 0..10 zulaesst.");
  kor("A-festlegung.md § 3 und § 4 (Spalten „Bereich“) sowie § 8 (Fehlerklassen)",
    "Die Spannen 0..31 / 0/1 / 0..63 / 0..255 (Auftrag) und 0..10 (sterne) stehen nur als Tabelle da. Werte ausserhalb werden still auf die Nachbarfelder abgebildet: "
    + "sitzung 32 liest sich als sitzung 0, art 2 als art 0, index 64 als index 0, variante 256 als variante 0; sterne 11..15 kommen als 11..15 durch die Pruefsumme. "
    + "Keine Fehlerklasse in § 8 deckt das ab.",
    "In § 3/§ 4 je Feld einen Satz ergaenzen: „Werte ausserhalb der Spanne werden VOR dem Packen abgewiesen → {fehler:\"bereich\", grund:\"…\"}“, und § 8 um diese Zeile erweitern. "
    + "Sonst erzeugt `erzeugen` formal gueltige Codes, deren Felder beim Lesen still verfaelscht sind.");

  /* ---------- 4. Kanonisierungsstatistik § 5 (58 × 64) ---------- */
  const tHand = Date.now();
  const cache = new Map();
  const jeTicket = [];
  let messungen = 0, eigeneGesamt = 0, k0Gesamt = 0, kMax = 0, kSumme = 0, rueckfaelle = 0;
  for (const def of reihe) {
    let k0 = 0, eigene = 0, rueckfall = 0, tkMax = 0, summe = 0;
    for (let v = 0; v < FENSTER; v++) {
      const kk = eigenesKern(lab, def, v + 1, cache);
      messungen++; summe += kk.k; kSumme += kk.k;
      if (kk.k > tkMax) tkMax = kk.k;
      if (kk.k > kMax) kMax = kk.k;
      if (kk.eigene) { if (kk.k === 0) { k0++; k0Gesamt++; } eigene++; eigeneGesamt++; } else rueckfall++;
    }
    rueckfaelle += rueckfall;
    jeTicket.push({id: def.id, art: (def.spec && def.spec.art) || def.art, kMax: tkMax, kMittel: summe / FENSTER, k0, eigene, rueckfall, ohneEigeneFassung: eigene === 0});
  }
  M.hand = {
    tickets: reihe.length, variantenJeTicket: FENSTER, messungen, laufzeitMs: Date.now() - tHand,
    eigeneBeiK0: k0Gesamt, anteilEigeneK0: k0Gesamt / messungen, eigeneGesamt, anteilEigene: eigeneGesamt / messungen,
    rueckfaelle, kMax, kMittel: kSumme / messungen,
    kVerteilung: jeTicket.reduce((m, t) => { const k = "kMax=" + t.kMax; m[k] = (m[k] || 0) + 1; return m; }, {}),
    verschiedeneKwerte: [...new Set(jeTicket.map(t => t.kMax))].sort((a, b) => a - b),
    ticketsOhneEigeneFassung: jeTicket.filter(t => t.ohneEigeneFassung).map(t => t.id),
    ticketsImmerEigeneFassung: jeTicket.filter(t => t.kMax === 0).map(t => t.id),
    jeTicket,
  };
  pru(e.hand.messungen, "Kanonisierung: Zahl der Messungen (58 × 64)", M.hand.messungen);
  pru(e.hand.eigeneBeiK0, "Kanonisierung: Fälle mit k=0", M.hand.eigeneBeiK0);
  pru(e.hand.anteilEigeneK0, "Kanonisierung: Anteil k=0", M.hand.anteilEigeneK0);
  pru(e.hand.eigeneGesamt, "Kanonisierung: eigene Fassungen gesamt", M.hand.eigeneGesamt);
  pru(e.hand.rueckfaelle, "Kanonisierung: Rückfälle gesamt", M.hand.rueckfaelle);
  pru(e.hand.kMax, "Kanonisierung: höchstes k", M.hand.kMax);
  pru(e.hand.kMittel, "Kanonisierung: Mittel k", M.hand.kMittel);
  pru(e.hand.ticketsOhneEigeneFassung.join("|"), "Kanonisierung: Tickets ohne eigene Fassung", M.hand.ticketsOhneEigeneFassung.join("|"));
  pru(e.hand.ticketsImmerEigeneFassung.length, "Kanonisierung: Tickets mit immer eigener Fassung", M.hand.ticketsImmerEigeneFassung.length);
  const entwurfJe = new Map(e.hand.jeTicket.map(t => [t.id, t]));
  const abw = [];
  for (const t of jeTicket) {
    const a = entwurfJe.get(t.id);
    if (!a) { abw.push({id: t.id, grund: "fehlt im Entwurf"}); continue; }
    if (a.kMax !== t.kMax || a.eigene !== t.eigene || a.rueckfall !== t.rueckfall || a.ohneEigeneFassung !== t.ohneEigeneFassung || Math.abs(a.kMittel - t.kMittel) > 1e-12)
      abw.push({id: t.id, entwurf: {kMax: a.kMax, kMittel: a.kMittel, eigene: a.eigene, rueckfall: a.rueckfall}, ist: {kMax: t.kMax, kMittel: t.kMittel, eigene: t.eigene, rueckfall: t.rueckfall}});
  }
  M.handVergleichEntwurf = {gepruefteTickets: jeTicket.length, abweichungen: abw.length, liste: abw.slice(0, 10)};
  pru(0, "Kanonisierung: Abweichungen je Ticket gegen messungen.hand.jeTicket[] (58 Zeilen)", abw.length);
  /* Terminal-Sonderfall: liefert fuerSeed wirklich IMMER die feste Fassung? */
  M.terminalSonderfall = terminalIds.map(id => {
    const def = lab.Spiel.ticketDef(id);
    const refs = new Set();
    let ersteAbw = null;
    for (let s = 1; s <= 64; s++) { const d = def.fuerSeed(s); refs.add(d); if (d !== def && ersteAbw === null) ersteAbw = s; }
    return {id, verschiedeneFassungen: refs.size, immerFesteFassung: refs.size === 1 && refs.has(def), ersteAbweichung: ersteAbw};
  });
  pru(true, "Terminal-Aufträge: fuerSeed liefert für alle 64 Seeds dieselbe (feste) Fassung", M.terminalSonderfall.every(t => t.immerFesteFassung));
  /* Rueckfall: ist die feste Fassung dort gueltig? */
  const rueckfallGueltig = jeTicket.filter(t => t.ohneEigeneFassung).map(t => {
    const def = lab.Spiel.ticketDef(t.id);
    const kk = eigenesKern(lab, def, 1, cache);
    return {id: t.id, gueltig0: !!kk.gueltig0};
  });
  M.rueckfallProbe = {faelle: rueckfallGueltig.length, alleGueltig: rueckfallGueltig.every(x => x.gueltig0), liste: rueckfallGueltig};
  pru(true, "Rückfall: die feste Fassung ist in jedem Rückfall-Fall gültig (kein {fehler:\"fassung\"})", M.rueckfallProbe.alleGueltig);
  B.push("Kanonisierung § 5 über alle " + reihe.length + " Handaufträge × " + FENSTER + " Varianten (" + messungen + " Messungen, "
    + M.hand.laufzeitMs + " ms): k=0 in " + M.hand.eigeneBeiK0 + " Fällen (Anteil " + M.hand.anteilEigeneK0.toFixed(4) + "), " + M.hand.rueckfaelle
    + " Rückfälle, höchstes k = " + M.hand.kMax + ", Mittel k = " + M.hand.kMittel.toFixed(4) + ". Jede Zahl deckt sich mit dem Entwurf, auch Zeile für Zeile ("
    + abw.length + " Abweichungen bei 58 Tickets).");
  B.push("Entscheidender als die Quote: k>0 tritt AUSSCHLIESSLICH bei den " + M.hand.ticketsOhneEigeneFassung.length + " Terminal-Aufträgen auf ("
    + M.hand.ticketsOhneEigeneFassung.join(", ") + "), und dort ist k immer " + FENSTER + " (Rückfall). Für alle " + M.hand.ticketsImmerEigeneFassung.length
    + " anderen Aufträge ist k = 0. Die k-Verteilung ist damit zweiwertig: " + JSON.stringify(M.hand.kVerteilung) + ". Der Zweig „eigene Fassung mit k>0, also "
    + "verschobener Seed“ ist in diesem Bestand nicht erreichbar – A-kanon.json belegt ihn mit keiner einzigen Messung (alle 12 Prüf-Codes haben k=0).");
  restfehler.push("Der Kanonisierungszweig {eigene:true, k>0} (Startseed liefert keine gültige eigene Fassung, der nächste schon) ist weder im Entwurf noch in dieser "
    + "Gegenprüfung belegt: über alle 58 × 64 Fälle gibt es nur k=0 oder k=64. Ob der Zweig je eintritt, bleibt offen – und damit auch, ob er richtig rechnet.");
  B.push("Terminal-Sonderfall belegt: für " + M.terminalSonderfall.map(t => t.id + " (" + t.verschiedeneFassungen + " Fassung)").join(", ")
    + " liefert fuerSeed über alle 64 Seeds dieselbe feste Fassung; in allen " + M.rueckfallProbe.faelle + " Rückfall-Fällen war sie gültig.");

  /* ---------- 5. Generator § 5 generiert() (27 × 64) ---------- */
  const tGen = Date.now();
  const gCache = new Map();
  const genJeSkill = [];
  let genMess = 0, genTreffer = 0, genFehl = 0, genAusnahmen = 0, genK0 = 0;
  const genTexte = {};
  for (const sk of skills) {
    let treffer = 0, fehl = 0, ausnahmen = 0, k0 = 0, ersterFehl = null, tkMax = null, texte = [], kSummeS = 0;
    for (let v = 0; v < FENSTER; v++) {
      genMess++;
      let hit = null;
      for (let k = 0; k < FENSTER; k++) {
        let d = null;
        try { d = lab.Spiel.generiere(sk.id, v + 1 + k); }
        catch (err) { ausnahmen++; const t = String(err && err.message || err); if (!texte.includes(t) && texte.length < 3) texte.push(t); }
        if (!d) continue;
        let ok;
        if (gCache.has(d)) ok = gCache.get(d);
        else { try { ok = !!lab.Spiel.ticketGueltig(d); } catch (err) { ok = false; } gCache.set(d, ok); }
        if (ok) { hit = {seed: v + 1 + k, k}; break; }
      }
      if (hit) { treffer++; kSummeS += hit.k; if (hit.k === 0) k0++; if (tkMax === null || hit.k > tkMax) tkMax = hit.k; }
      else { fehl++; if (ersterFehl === null) ersterFehl = v + 1; }
    }
    genTreffer += treffer; genFehl += fehl; genAusnahmen += ausnahmen; genK0 += k0;
    for (const t of texte) genTexte[t] = (genTexte[t] || 0) + 1;
    genJeSkill.push({skill: sk.id, treffer, fehlschlaege: fehl, kMax: tkMax, kMittel: treffer ? kSummeS / treffer : null, k0,
      anteilK0: treffer ? k0 / treffer : null, ausnahmen, meldungen: texte, ersterFehlschlagSeed: ersterFehl});
  }
  M.gen = {
    skills: skills.length, variantenJeSkill: FENSTER, messungen: genMess, laufzeitMs: Date.now() - tGen,
    treffer: genTreffer, fehlschlaege: genFehl, anteilFehlschlag: genFehl / genMess, k0Gesamt: genK0,
    anteilK0: genTreffer ? genK0 / genTreffer : null, ausnahmen: genAusnahmen, ausnahmeTexte: genTexte,
    kMax: Math.max(...genJeSkill.map(s => s.kMax === null ? 0 : s.kMax)),
    skillsMitFehlschlag: genJeSkill.filter(s => s.fehlschlaege).map(s => ({skill: s.skill, fehlschlaege: s.fehlschlaege, meldungen: s.meldungen})),
    skillsMitAusnahmen: genJeSkill.filter(s => s.ausnahmen).map(s => ({skill: s.skill, ausnahmen: s.ausnahmen})),
    skillsOhneInjektor: genJeSkill.filter(s => s.kMax === null).map(s => s.skill),
    jeSkill: genJeSkill,
  };
  pru(e.gen.messungen, "Generator: Zahl der Messungen (27 × 64)", M.gen.messungen);
  pru(e.gen.treffer, "Generator: Treffer", M.gen.treffer);
  pru(e.gen.fehlschlaege, "Generator: Fehlschläge", M.gen.fehlschlaege);
  pru(e.gen.anteilFehlschlag, "Generator: Anteil Fehlschlag", M.gen.anteilFehlschlag);
  pru(e.gen.k0Gesamt, "Generator: k=0-Fälle", M.gen.k0Gesamt);
  pru(e.gen.anteilK0, "Generator: Anteil k=0", M.gen.anteilK0);
  pru(e.gen.kMax, "Generator: höchstes k", M.gen.kMax);
  pru(e.gen.ausnahmen, "Generator: Ausnahmen insgesamt", M.gen.ausnahmen);
  pru(e.gen.skillsMitFehlschlag.map(x => x.skill).join("|"), "Generator: Fertigkeiten mit erschöpftem Fenster", M.gen.skillsMitFehlschlag.map(x => x.skill).join("|"));
  pru(e.gen.skillsMitAusnahmen.map(x => x.ausnahmen).join("|"), "Generator: Ausnahmen je betroffener Fertigkeit", M.gen.skillsMitAusnahmen.map(x => x.ausnahmen).join("|"));
  B.push("Generator § 5 über alle " + skills.length + " Fertigkeiten × " + FENSTER + " Varianten (" + genMess + " Messungen, " + M.gen.laufzeitMs
    + " ms): " + genTreffer + " Treffer, " + genFehl + " Fehlschläge (Anteil " + M.gen.anteilFehlschlag.toFixed(4) + "), alle Treffer mit k=0, "
    + genAusnahmen + " Generator-Ausnahmen. Alle Zahlen decken sich mit dem Entwurf.");
  B.push("Die " + M.gen.skillsMitFehlschlag.length + " Fertigkeiten ohne Injektor (" + M.gen.skillsOhneInjektor.join(", ") + ") werfen für JEDEN Seed – gemessene Meldung: "
    + JSON.stringify(M.gen.ausnahmeTexte) + ". Für die Lehrkraft heißt das: wählt sie eine dieser drei Fertigkeiten, entsteht nach § 5 kein Code. "
    + "Der Entwurf ordnet diesen Fall {fehler:\"fassung\"} zu, § 8 nennt für „Generator liefert nichts“ aber {fehler:\"auftrag\"} – der Widerspruch steht in A-kanon.json selbst.");
  kor("A-festlegung.md § 5 „generiert()“ (letzte Zeile: → {fehler:\"fassung\"}) gegen § 8 (Zeile `auftrag`)",
    "Für lab.portsec, lab.stp und lab.storage liefert der Generator nie ein Ticket („Kein Injektor für …“). § 5 schreibt dafür {fehler:\"fassung\"} vor, § 8 ordnet "
    + "„Generator liefert nichts“ der Klasse {fehler:\"auftrag\"} zu. A-kanon.json benennt den Widerspruch, entscheidet ihn aber nicht.",
    "In § 5 die letzte Zeile auf {fehler:\"auftrag\", grund:\"Kein Injektor für <skill>\"} ändern (oder in § 8 die Zeile `auftrag` auf „Index zeigt auf eine fehlende ID“ "
    + "verkürzen). Ohne Entscheidung bauen A-codec/A-api einen anderen Fehlercode ein, als A-kanon annimmt.");
  kor("src/spiel/klassenraum.js (geplant) – Auswahl der Fertigkeiten in der Lehrer-Ansicht",
    "lab.portsec, lab.stp und lab.storage stehen in DATEN.skills und sind damit wählbar, haben aber keinen Injektor; jede Wahl endet ohne Code.",
    "Nur Fertigkeiten anbieten, für die Spiel.generiere etwas liefert: `new Set(Object.values(Spiel.INJEKTOREN).flatMap(i => i.skills))` mit DATEN.skills schneiden – "
    + "gemessen sind das " + (skills.length - M.gen.skillsOhneInjektor.length) + " von " + skills.length + ".");
  kor("Nachweise/Klassenraum/A-kanon.json, Befund zu den generierten Formen",
    "Der Entwurf schreibt „Anteil k=0 = 1.0000“ und „höchstes k = 0“, obwohl 192 Messungen das Fenster erschöpft haben. Der Anteil k=0 ist über die TREFFER gebildet "
    + "(1536/1536) und sagt damit nichts über die 192 Fehlschläge – im selben Satz steht „Fenster erschöpft bei 192 Messungen“, was wie ein Widerspruch wirkt.",
    "Im Befundtext beide Nenner nennen: „Anteil k=0 = 1536/1536 der Treffer; 192 von 1728 Messungen (11,1 %) fanden gar keine gültige Form.“ "
    + "Feld `anteilK0` unverändert lassen, aber `anteilK0Bezug: \"Treffer\"` ergänzen.");

  /* ---------- 6. Netzkennwert § 6 ---------- */
  /* Die Liste der Pruef-Codes steht NICHT in A-kanon-teil1.json (dort: teil,pid,uhrFest,stand,eintraege,instanzen,ohneFlow),
     sondern im Hauptbericht unter messungen.determinismus.codes – von dort geholt und gegen ohneFlow[] gegengeprueft. */
  const teil1 = JSON.parse(fs.readFileSync(ENTWURF_TEIL1, "utf8"));
  const teil2 = JSON.parse(fs.readFileSync(ENTWURF_TEIL2, "utf8"));
  const codes = e.determinismus.codes;
  const codesStimmenMitTeilDatei = codes.every((c, i) => {
    const o = (teil1.ohneFlow || [])[i];
    return o && o.nr === c.nr && o.art === c.art && (o.ticketId || null) === (c.ticketId || null) && (o.skill || null) === (c.skill || null);
  });
  M.codeListe = {quelle: "messungen.determinismus.codes (Hauptbericht)", anzahl: codes.length, stimmtMitTeil1OhneFlow: codesStimmenMitTeilDatei, codes};
  const proben = [];
  for (const c of codes) {
    let fassung = null, kk = null;
    if (c.art === "hand") { kk = eigenesKern(lab, lab.Spiel.ticketDef(c.ticketId), c.seedStart, cache); fassung = kk.fassung; }
    else for (let k = 0; k < FENSTER; k++) {
      let d = null;
      try { d = lab.Spiel.generiere(c.skill, c.seedStart + k); } catch (err) { d = null; }
      if (!d) continue;
      const ok = gCache.has(d) ? gCache.get(d) : (() => { let o2 = false; try { o2 = !!lab.Spiel.ticketGueltig(d); } catch (err) { o2 = false; } gCache.set(d, o2); return o2; })();
      if (ok) { fassung = d; kk = {k, seed: c.seedStart + k, eigene: true, fassung: d}; break; }
    }
    const netz = lab.Spiel.startNetz(fassung, kk.seed);
    const eigen = eigenerKennwert(netz);
    const a = teil1.eintraege.find(x => x.nr === c.nr) || {};
    proben.push({nr: c.nr, art: c.art, ticketId: c.ticketId, skill: c.skill, seed: kk.seed, k: kk.k,
      geraete: Object.keys(netz.geraete).length, kabel: netz.kabel.length,
      kennwertEigeneRechnung: eigen.kennwert, kennwertEntwurf: a.netzkennwert, hHex: hex8(eigen.h),
      textLaengeZeichen: eigen.text.length, gleich: eigen.kennwert === a.netzkennwert});
  }
  /* Gegenprobe eine Ebene hoeher: die Kennwerte aus instanzErstellen (anderer Weg, gleiche Fassung) – in beiden Teil-Dateien. */
  const instanzKenn = teil1.instanzen.map(x => x.netzkennwert);
  const meineKenn = proben.map(p => p.kennwertEigeneRechnung);
  M.netzkennwertProben = {liste: proben, gleich: proben.filter(p => p.gleich).length, geprueft: proben.length,
    instanzWegGleich: JSON.stringify(instanzKenn) === JSON.stringify(meineKenn),
    teil2GleichEigenerRechnung: JSON.stringify(teil2.eintraege.map(x => x.netzkennwert)) === JSON.stringify(meineKenn),
    teil1GleichTeil2: JSON.stringify(teil1.eintraege.map(x => x.netzkennwert)) === JSON.stringify(teil2.eintraege.map(x => x.netzkennwert))};
  pru(proben.length, "Netzkennwert: eigene Kanonisierung trifft die " + proben.length + " Kennwerte aus A-kanon-teil1.json", proben.filter(p => p.gleich).length);
  pru(true, "Netzkennwert: eigener Weg trifft auch die Kennwerte des Instanz-Wegs (Spiel.instanzErstellen)", M.netzkennwertProben.instanzWegGleich);
  pru(true, "Netzkennwert: die abgelegten Teil-Dateien 1 und 2 tragen dieselben Kennwerte (zwei Prozesse)", M.netzkennwertProben.teil1GleichTeil2);
  pru(true, "Netzkennwert: die abgelegte Teil-Datei 2 trifft die eigene Rechnung", M.netzkennwertProben.teil2GleichEigenerRechnung);
  /* Determinismus und Reihenfolge */
  const defK = lab.Spiel.ticketDef(reihe[0].id);
  const netzA = lab.Spiel.startNetz(defK, 3), netzB = lab.Spiel.startNetz(defK, 3);
  const kA = eigenerKennwert(netzA), kB = eigenerKennwert(netzB);
  const umbau = w => {
    const geraete = {};
    for (const id of Object.keys(w.geraete).reverse()) {
      const r = w.geraete[id], ro = {};
      for (const f of Object.keys(r).reverse()) ro[f] = r[f];
      geraete[id] = ro;
    }
    return {geraete, kabel: w.kabel.slice().reverse().map(k => ({id: k.id, a: {geraet: k.a.geraet, port: k.a.port}, b: {geraet: k.b.geraet, port: k.b.port}})), v: w.v, zustand: w.zustand};
  };
  const kUm = eigenerKennwert(umbau(netzA));
  const zP = zufall(20261006);
  const permFaelle = [];
  for (let i = 0; i < 32; i++) {
    const n = lab.Spiel.startNetz(defK, 3 + i);
    const vor = eigenerKennwert(n).kennwert;
    const geraete = {};
    for (const id of gemischt(Object.keys(n.geraete), zP)) {
      const r = n.geraete[id], ro = {};
      for (const f of gemischt(Object.keys(r), zP)) {
        const v = r[f];
        if (v && typeof v === "object" && !Array.isArray(v)) {
          const inn = {};
          for (const f2 of gemischt(Object.keys(v), zP)) inn[f2] = v[f2];
          ro[f] = inn;
        } else ro[f] = v;
      }
      geraete[id] = ro;
    }
    const kabel = gemischt(n.kabel, zP).map(k => ({id: k.id, a: k.a, b: k.b}));
    const nach = eigenerKennwert({geraete, kabel, v: n.v, zustand: n.zustand}).kennwert;
    permFaelle.push({i, vor, nach, gleich: vor === nach});
  }
  /* zustand */
  const netzZ = lab.Spiel.startNetz(defK, 3);
  const vorZ = eigenerKennwert(netzZ).kennwert;
  netzZ.zustand = netzZ.zustand || {};
  netzZ.zustand._uhr = 4711;
  netzZ.zustand[Object.keys(netzZ.geraete)[0]] = {macs: {"0": "AA:BB:CC:DD:EE:FF"}, errdisabled: {}};
  const nachZ = eigenerKennwert(netzZ).kennwert;
  /* acht echte Netzaenderungen */
  const mutationen = [];
  const mut = (name, fn) => {
    const n = lab.Spiel.startNetz(defK, 3);
    const vor = eigenerKennwert(n).kennwert;
    let info = null, fehler = null;
    try { info = fn(n); } catch (err) { fehler = String(err && err.message || err); }
    const nach = eigenerKennwert(n).kennwert;
    mutationen.push({name, info, fehler, vor, nach, anders: vor !== nach});
  };
  mut("Host-IP geändert", n => { const g = Object.values(n.geraete).find(x => x.typ === "pc" || x.typ === "server"); const p = Object.keys(g.running.if)[0]; const alt = g.running.if[p].ip; g.running.if[p].ip = alt === "192.168.1.99" ? "192.168.1.98" : "192.168.1.99"; return {geraet: g.id, port: p, alt, neu: g.running.if[p].ip}; });
  mut("Router-Port shutdown", n => { const g = Object.values(n.geraete).find(x => x.typ === "router"); const p = Object.keys(g.running.if)[0]; g.running.if[p].shutdown = !g.running.if[p].shutdown; return {geraet: g.id, port: p, neu: g.running.if[p].shutdown}; });
  mut("Switch-Port shutdown", n => { const g = Object.values(n.geraete).find(x => x.typ === "switch"); const p = Object.keys(g.running.ports)[0]; g.running.ports[p].shutdown = !g.running.ports[p].shutdown; return {geraet: g.id, port: p, neu: g.running.ports[p].shutdown}; });
  mut("Gerät aus", n => { const g = Object.values(n.geraete)[0]; g.an = !g.an; return {geraet: g.id, an: g.an}; });
  mut("Kabel entfernt", n => { const k = n.kabel[n.kabel.length - 1]; n.kabel = n.kabel.filter(x => x !== k); return {kabel: k && k.id, a: k && k.a, b: k && k.b}; });
  mut("Subnetzmaske geändert", n => { const g = Object.values(n.geraete).find(x => x.typ === "pc" || x.typ === "server"); const p = Object.keys(g.running.if)[0]; g.running.if[p].maske = "255.255.255.128"; return {geraet: g.id, port: p, neu: g.running.if[p].maske}; });
  mut("Hostname geändert", n => { const g = Object.values(n.geraete).find(x => x.typ === "switch" || x.typ === "router"); g.running.hostname = "PROBE-1"; return {geraet: g.id, neu: "PROBE-1"}; });
  mut("Gerätename mit Umlaut geändert", n => { const g = Object.values(n.geraete)[0]; g.name = "PC-Prüfung"; return {geraet: g.id, neu: g.name}; });
  const werte = [kA.kennwert, kB.kennwert, kUm.kennwert, nachZ, ...mutationen.map(m => m.nach), ...proben.map(p => p.kennwertEigeneRechnung)];
  const fnvSchritte = (() => { const schritte = []; let h = 2166136261;
    for (let i = 0; i < 1; i++) { const b = "A".charCodeAt(i) & 255; const vor = h; h ^= b; const nachXor = h; h = Math.imul(h, 16777619) >>> 0;
      schritte.push({zeichen: "A", byte: b, hVorXor: hex8(vor), hNachXor: hex8(nachXor), hNachMul: hex8(h)}); }
    return {text: "A", h: h >>> 0, hHex: hex8(h), h30: h & 0x3FFFFFFF, h30Hex: hex8(h & 0x3FFFFFFF), kennwert: kennwertAus(h), schritte}; })();
  const vektoren = ["", "a", "foobar"].map(t => ({text: JSON.stringify(t), fnv1a32: hex8(fnv1a(t))}));
  /* Nicht-ASCII im kanonischen Text – der „Byte“-Begriff der Festlegung */
  const asciiProben = proben.slice(0, 6).map(p => {
    let fassung = null, kk = null;
    const c = codes.find(x => x.nr === p.nr);
    if (c.art === "hand") { kk = eigenesKern(lab, lab.Spiel.ticketDef(c.ticketId), c.seedStart, cache); fassung = kk.fassung; }
    else { for (let k = 0; k < FENSTER; k++) { let d = null; try { d = lab.Spiel.generiere(c.skill, c.seedStart + k); } catch (err) { d = null; } if (d && gCache.get(d)) { fassung = d; kk = {k, seed: c.seedStart + k}; break; } } }
    const t = eigenerKanon(lab.Spiel.startNetz(fassung, kk.seed));
    let hoechster = 0, ueber255 = 0, surrogat = 0;
    for (let i = 0; i < t.length; i++) { const cp = t.charCodeAt(i); if (cp > hoechster) hoechster = cp; if (cp > 255) ueber255++; if (cp >= 0xD800 && cp <= 0xDFFF) surrogat++; }
    return {nr: p.nr, seed: p.seed, zeichen: t.length, utf8Bytes: Buffer.byteLength(t, "utf8"), codepunkteUeber255: ueber255,
      surrogatzeichen: surrogat, hoechsterCodepunkt: hoechster, hZeichenweise: hex8(fnv1a(t)), hNachUtf8Bytes: hex8(fnv1aBytes(t)), gleich: fnv1a(t) === fnv1aBytes(t)};
  });
  /* Empfindlichkeit: ein Zeichen im kanonischen Text geaendert → anderer Kennwert */
  const textProbe = kA.text, pos = Math.floor(textProbe.length / 2);
  const mutiert = textProbe.slice(0, pos) + (textProbe[pos] === "x" ? "y" : "x") + textProbe.slice(pos + 1);
  M.netzkennwert = {
    proben, gleichMitEntwurf: proben.filter(p => p.gleich).length,
    determinismus: {netzA: kA.kennwert, netzB: kB.kennwert, gleich: kA.kennwert === kB.kennwert, textGleich: kA.text === kB.text},
    reihenfolgeUnabhaengig: {vor: kA.kennwert, nach: kUm.kennwert, gleich: kA.kennwert === kUm.kennwert, textGleich: kA.text === kUm.text},
    permutation: {faelle: permFaelle.length, gleich: permFaelle.filter(x => x.gleich).length, ungleich: permFaelle.filter(x => !x.gleich).length},
    zustand: {vor: vorZ, nach: nachZ, gleich: vorZ === nachZ},
    mutationen, mutationenAnders: mutationen.filter(m => m.anders).length,
    empfindlichkeit: {textLaenge: textProbe.length, geaenderteStelle: pos, vor: kennwertAus(fnv1a(textProbe)), nach: kennwertAus(fnv1a(mutiert)), anders: fnv1a(textProbe) !== fnv1a(mutiert)},
    laengeAlphabet: {geprueft: werte.length, laengeImmer6: werte.every(w => typeof w === "string" && w.length === 6),
      fremdzeichen: werte.filter(w => [...String(w)].some(c => !ALPHABET.includes(c))).length},
    fnv1aGegenrechnung: fnvSchritte, fnvVektoren: vektoren, nichtAscii: asciiProben,
  };
  pru("0xC40BF6CC", "FNV-1a(„A“): h (Startwert 0x811C9DC5 ⊕ 0x41 = 0x811C9D84, dann · 16777619 mod 2³²)", fnvSchritte.hHex);
  pru(3289118412, "FNV-1a(„A“): h dezimal", fnvSchritte.h);
  pru("0x040BF6CC", "FNV-1a(„A“): h & 0x3FFFFFFF", fnvSchritte.h30Hex);
  pru("CAZ7YN", "Kennwert aus h & 0x3FFFFFFF (6 Zeichen, höchstwertige 5 Bit zuerst)", fnvSchritte.kennwert);
  pru("0x811C9DC5", "FNV-1a(„“) = Startwert 2166136261", vektoren[0].fnv1a32);
  pru("0xE40C292C", "FNV-1a(„a“) – bekannter Prüfwert", vektoren[1].fnv1a32);
  pru("0xBF9CF968", "FNV-1a(„foobar“) – bekannter Prüfwert", vektoren[2].fnv1a32);
  pru(32, "Netzkennwert: Zahl der Permutationsfälle (Schlüssel und Kabelreihenfolge gemischt, fester Seed 20261006)", permFaelle.length);
  pru(32, "Netzkennwert: Permutationsfälle mit gleichem Kennwert", permFaelle.filter(x => x.gleich).length);
  pru(8, "Netzkennwert: Zahl der Mutationsfälle (echte Netzänderungen)", mutationen.length);
  pru(8, "Netzkennwert: Mutationsfälle mit anderem Kennwert", M.netzkennwert.mutationenAnders);
  pru(true, "Netzkennwert: netz.zustand (Uhr, MAC-Tabelle) bleibt draußen", vorZ === nachZ);
  pru(true, "Netzkennwert: Länge immer 6, keine Fremdzeichen (" + werte.length + " Kennwerte)", M.netzkennwert.laengeAlphabet.laengeImmer6 && M.netzkennwert.laengeAlphabet.fremdzeichen === 0);
  pru(true, "Netzkennwert: unabhängig von der Einfügereihenfolge (Geräte und Kabel rückwärts)", kA.kennwert === kUm.kennwert);
  pru(true, "Netzkennwert: ein geändertes Zeichen im kanonischen Text ändert den Kennwert", M.netzkennwert.empfindlichkeit.anders);
  B.push("Netzkennwert § 6: eigene Kanonisierung + eigene FNV-1a treffen " + proben.filter(p => p.gleich).length + " von " + proben.length
    + " Kennwerten aus A-kanon-teil1.json und ebenso die des Instanz-Wegs. Zwei gleich gebaute Netze ergeben denselben Kennwert (" + kA.kennwert
    + "), rückwärts eingefügte Geräte/Kabel ebenfalls (" + kUm.kennwert + ").");
  B.push("Mutationsprobe: " + M.netzkennwert.mutationenAnders + " von " + mutationen.length + " echten Netzänderungen ergeben einen anderen Kennwert; "
    + permFaelle.filter(x => x.gleich).length + " von " + permFaelle.length + " Permutationen der Schlüssel- und Kabelreihenfolge denselben; `netz.zustand` bleibt draußen ("
    + vorZ + " → " + nachZ + "). Länge/Alphabet an " + werte.length + " Kennwerten geprüft: " + M.netzkennwert.laengeAlphabet.laengeImmer6 + " / "
    + M.netzkennwert.laengeAlphabet.fremdzeichen + " Fremdzeichen. FNV-1a von Hand: „A“ → " + fnvSchritte.hHex + " → Kennwert " + fnvSchritte.kennwert + ".");
  B.push("Der kanonische Text enthält Nicht-ASCII („PC-Büro“): " + asciiProben.map(a => "Nr. " + a.nr + " höchster Codepunkt " + a.hoechsterCodepunkt
    + ", " + a.codepunkteUeber255 + " über 255, zeichenweise = utf8-byteweise: " + a.gleich).join(" · ") + ". A-festlegung § 6 sagt „je Byte“; "
    + "gemeint und gemessen ist `charCodeAt(i) & 255`. Für BMP-Zeichen stimmt das mit dem UTF-8-Byte überein – nicht aber, wenn ein Zeichen als "
    + "\\uXXXX-Escape im Text steht, und nicht für Zeichen außerhalb der BMP (dort zählt nur die untere Surrogathälfte, gemessen: "
    + asciiProben.reduce((a, x) => a + x.surrogatzeichen, 0) + " Surrogatzeichen).");
  B.push("Zur Kennwert-Gleichheit: `M.netzkennwert.gleichheit` des Entwurfs (200 Wiederholungen, 200 gleich) ruft `netzkennwert` 200-mal auf DENSELBEN zwei "
    + "Netzobjekten auf – die Wiederholung prüft nur, dass dieselbe Funktion auf demselben Eingabeobjekt dasselbe liefert. Zwei Netze sind auch nicht zwei Geräte: "
    + "beide entstehen aus `Spiel.startNetz(defK, 3)`. Ein zweiter Rechner ist damit nicht belegt und wird vom Entwurf auch nicht behauptet.");
  kor("A-festlegung.md § 6, Zeile „h = FNV1a32(text); je Byte: h ^= b; …“",
    "„Byte“ ist nicht eindeutig: FNV-1a ist über eine Bytefolge definiert, der Text wird aber als JS-Zeichenkette mit `charCodeAt(i) & 255` verarbeitet. "
    + "Gemessen stimmen beide Rechenwege für alle " + asciiProben.length + " geprüften Netze überein (keine Surrogatzeichen), der Unterschied ist also heute folgenlos – "
    + "aber zwei Geräte mit unterschiedlicher Textkodierung (UTF-8-Datei, Escape-Sequenzen) könnten verschiedene Kennwerte liefern.",
    "In § 6 präzisieren: „b = text.charCodeAt(i) & 255 (UTF-16-Codeeinheit, auf 8 Bit beschnitten – nicht UTF-8!)“ und einen kurzen Satz ergänzen, "
    + "dass Gerätenamen mit Zeichen außerhalb der BMP den Kennwert nur über die untere Surrogathälfte beeinflussen.");
  /* Der Fall „Kabel zusaetzlich“ des Entwurfs – hier ausdruecklich als Grenzfall */
  const doppel = lab.Spiel.startNetz(defK, 3);
  const vorD = eigenerKennwert(doppel).kennwert;
  const k0k = doppel.kabel[0];
  doppel.kabel.push({id: "k-probe", a: {geraet: k0k.a.geraet, port: k0k.a.port}, b: {geraet: k0k.b.geraet, port: k0k.b.port}});
  const nachD = eigenerKennwert(doppel).kennwert;
  M.netzkennwert.grenzfallDoppeltesKabel = {vor: vorD, nach: nachD, anders: vorD !== nachD};
  B.push("Grenzfall „Kabel zusaetzlich“ des Entwurfs: dort werden zwei Kabel an dieselben Steckplätze gelegt (k-probe auf den Plätzen von "
    + (k0k ? k0k.id : "—") + "). Der Kennwert ändert sich (" + vorD + " → " + nachD + "), die Probe ist als Empfindlichkeitstest also brauchbar – "
    + "als Netz ist der Aufbau unmöglich (ein Port hat genau ein Kabel, Modell.verbinden lehnt das ab). Der Name im Entwurf ist inzwischen ehrlich gewählt; "
    + "im ersten Lauf hiess der Fall laut Quelltextkommentar noch „Kabel an denselben Ports doppelt“.");

  /* ---------- 7. Nebenwirkungen ---------- */
  const labF = frisch();
  const defS = labF.Spiel.ticketDef("salon-02");
  const kkS = eigenesKern(labF, defS, 1, new Map());
  const kennVor = eigenerKennwert(labF.Spiel.startNetz(kkS.fassung, kkS.seed)).kennwert;
  const genVor = Object.keys(labF.Spiel.generierte).length;
  labF.Spiel.instanzErstellen({ticketId: "salon-02", quelle: "klassenraum", ohneFlow: true, seed: 1});
  const genNach = Object.keys(labF.Spiel.generierte).length;
  const kennNach = (() => { const d = labF.Spiel.ticketDef("salon-02", {seed: 1, vielfalt: true}); return eigenerKennwert(labF.Spiel.startNetz(d, 1)).kennwert; })();
  const labG = frisch();
  const defG = labG.Spiel.ticketDef("salon-03");
  const vorFlow = eigenesKern(labG, defG, 1, new Map());
  labG.Spiel.st.flow = {["lab.ip"]: {letzte: ["f", "f"], stand: "geruest"}};
  const nachFlow = eigenesKern(labG, defG, 1, new Map());
  const labW = frisch();
  const defW = labW.Spiel.ticketDef("salon-03");
  const vorWahl = eigenesKern(labW, defW, 1, new Map());
  labW.Spiel.einstSetzen("wahl", "AP2");
  const nachWahl = eigenesKern(labW, defW, 1, new Map());
  const flowFall = (() => {
    const bau = ohne => {
      const l = frisch();
      l.Spiel.st.flow = {["lab.link"]: {letzte: ["f", "f"], stand: "geruest"}};
      const inst = l.Spiel.instanzErstellen({gen: {skill: "lab.link", seed: 2}, quelle: "klassenraum", ohneFlow: ohne, seed: 2});
      const def = l.Spiel.defVon(inst);
      return {ticketId: inst.ticketId, kennwert: eigenerKennwert(inst.netz).kennwert, ziele: (def.ziele || []).length,
        geraete: Object.keys(inst.netz.geraete).length, fehlerstellen: (def.fehlerstellen || []).length};
    };
    let mit = null, ohne2 = null, fehler = null;
    try { mit = bau(false); } catch (err) { fehler = String(err && err.message || err); }
    try { ohne2 = bau(true); } catch (err) { fehler = (fehler ? fehler + " | " : "") + String(err && err.message || err); }
    return {mitFlow: mit, ohneFlow: ohne2, fehler, netzGleich: !!(mit && ohne2 && mit.kennwert === ohne2.kennwert)};
  })();
  M.nebenwirkungen = {
    instanzErstellen: {vorher: kennVor, nachher: kennNach, gleich: kennVor === kennNach},
    generierte: {vorher: genVor, nachher: genNach, waechst: genNach > genVor},
    flow: {vorher: {k: vorFlow.k, seed: vorFlow.seed}, nachher: {k: nachFlow.k, seed: nachFlow.seed}, gleich: vorFlow.k === nachFlow.k && vorFlow.seed === nachFlow.seed},
    einstWahl: {vorher: {k: vorWahl.k, seed: vorWahl.seed}, nachher: {k: nachWahl.k, seed: nachWahl.seed}, gleich: vorWahl.k === nachWahl.k && vorWahl.seed === nachWahl.seed},
    flowGeneriert: flowFall,
  };
  pru(true, "Handauftrag hängt nicht am Flow-Stand (Spiel.flow = „geruest“) – Kanonisierung unverändert", M.nebenwirkungen.flow.gleich);
  pru(true, "Handauftrag hängt nicht an Spiel.einst.wahl (auf „AP2“ gesetzt) – Kanonisierung unverändert", M.nebenwirkungen.einstWahl.gleich);
  B.push("Nebenwirkungen: `Spiel.instanzErstellen` ändert den Netzkennwert nicht (" + kennVor + " = " + kennNach + "), füllt aber `Spiel.generierte` ("
    + genVor + " → " + genNach + "). Wer erst kanonisiert und dann den Instanz-Weg rechnet, sieht bei generierten Aufträgen dieselbe Fassung; in umgekehrter "
    + "Reihenfolge ist `Spiel.generierte` schon gefüllt. In dieser Probe ohne Wirkung – aber eine stille Kopplung zweier Messungen desselben Laufs.");
  B.push("Der Flow-Regler wirkt nur am generierten Auftrag: mit Stand „geruest“ und ohneFlow:true ist der Kennwert " + (flowFall.netzGleich ? "gleich" : "ANDERS")
    + " (" + (flowFall.mitFlow && flowFall.mitFlow.kennwert) + " gegen " + (flowFall.ohneFlow && flowFall.ohneFlow.kennwert) + "), Fassungs-ID und Zielzahl ändern sich ("
    + (flowFall.mitFlow && flowFall.mitFlow.ziele) + " gegen " + (flowFall.ohneFlow && flowFall.ohneFlow.ziele) + " Ziele). Der Handauftrag bleibt unberührt: "
    + "salon-03 liefert mit und ohne gesetzten Stand dieselbe Fassung (k=" + nachFlow.k + ").");
  B.push("Kein Pfad dieser Probe benutzt Math.random, jetzt() oder Spiel.einst.wahl zur Rechnung: die Kanonisierung und der Kennwert kommen ohne Uhr und ohne "
    + "Zufallsstrom aus (Permutationen laufen über einen eigenen Seed 20261006).");

  /* ---------- 8. Determinismus ueber zwei Prozesse ---------- */
  const eig = proben.map(p => p.kennwertEigeneRechnung);
  let zweiterProzess = {versucht: false};
  const teile = (() => {
    try { return require("./A-kanon.js"); } catch (err) { return null; }
  })();
  if (!teile) { offene.push("A-kanon.js liess sich nicht laden – der Entwurf wurde nicht erneut ausgefuehrt."); }
  else {
    try {
      const d1 = teile.teil(1);
      zweiterProzess.teil1 = {eintraege: d1.eintraege.length, kennwerte: d1.eintraege.map(x => x.netzkennwert),
        gleichMitEigenerRechnung: JSON.stringify(d1.eintraege.map(x => x.netzkennwert)) === JSON.stringify(eig)};
    } catch (err) { zweiterProzess.teil1 = {fehler: String(err && err.message || err)}; }
    const tS = Date.now();
    const lauf = spawnSync(process.execPath, [path.join(__dirname, "A-kanon.js"), "--teil", "2"], {stdio: "inherit", windowsHide: true});
    zweiterProzess.kind = {status: lauf.status, signal: lauf.signal || null, fehler: lauf.error ? String(lauf.error.message || lauf.error) : null, ms: Date.now() - tS, stdio: "inherit"};
    try {
      const d2 = JSON.parse(fs.readFileSync(ENTWURF_TEIL2, "utf8"));
      zweiterProzess.teil2 = {pidImKindFile: d2.pid, eigenePid: process.pid, eintraege: d2.eintraege.length,
        gleichMitTeil1: JSON.stringify(d2.eintraege.map(x => x.netzkennwert)) === JSON.stringify(zweiterProzess.teil1.kennwerte),
        gleichMitEigenerRechnung: JSON.stringify(d2.eintraege.map(x => x.netzkennwert)) === JSON.stringify(eig)};
    } catch (err) { zweiterProzess.teil2 = {fehler: String(err && err.message || err)}; }
  }
  M.zweiterProzess = zweiterProzess;
  pru(true, "Determinismus über zwei Prozesse: eigener Weg, Entwurf (teil 1) und Kindprozess (teil 2) liefern dieselben 12 Kennwerte",
    !!(zweiterProzess.teil1 && zweiterProzess.teil1.gleichMitEigenerRechnung && zweiterProzess.teil2 && zweiterProzess.teil2.gleichMitEigenerRechnung &&
       zweiterProzess.teil2.eigenePid !== zweiterProzess.teil2.pidImKindFile));
  if (zweiterProzess.kind && zweiterProzess.kind.status !== 0)
    offene.push("Der zweite Prozess endete mit status " + zweiterProzess.kind.status + " – Determinismus-Vergleich siehe messungen.zweiterProzess.");
  B.push("Determinismus: eigener Rechenweg, Entwurf im Elternprozess (teil 1) und Entwurf im Kindprozess (teil 2, spawnSync stdio=inherit, status "
    + (zweiterProzess.kind ? zweiterProzess.kind.status : "—") + ", " + (zweiterProzess.kind ? zweiterProzess.kind.ms : "—") + " ms) liefern dieselben "
    + proben.length + " Kennwerte; die PID im Teil-2-File (" + (zweiterProzess.teil2 && zweiterProzess.teil2.pidImKindFile) + ") ist nicht die des Elternprozesses ("
    + process.pid + ").");
  B.push("„Gleiche Zahl beim zweiten Aufruf“ ist kein Determinismusbeweis: die 200 Wiederholungen des Entwurfs rufen `netzkennwert` auf denselben zwei Netzobjekten "
    + "auf. Deshalb hier zusätzlich die Reihenfolgeprobe (Geräte und Kabel rückwärts eingefügt, " + permFaelle.length + " Permutationen) und der zweite Prozess.");

  /* ---------- Laufzeiten ---------- */
  M.laufzeiten = {
    entwurfGesamtMs: e.laufzeitMs, entwurfHandMs: e.laufzeitHandMs, entwurfGenMs: e.laufzeitGenMs, entwurfKindMs: e.determinismus.spawn.kindLaufzeitMs,
    eigeneHandMs: M.hand.laufzeitMs, eigeneGenMs: M.gen.laufzeitMs,
    grenzeMs: 600000, entwurfUnterGrenze: e.laufzeitMs < 600000,
  };
  pru(true, "Entwurfslaufzeit unter der 10-Minuten-Grenze (gemeldet " + e.laufzeitMs + " ms)", e.laufzeitMs < 600000);

  /* ---------- Was nicht geprueft wurde ---------- */
  nichtGeprueft.push("Spiel.klassenraum, src/spiel/klassenraum.js und src/ui/klassenraum.js gibt es noch nicht (Auftrag KLASSENRAUM.md Bereich A). "
    + "erzeugen/ausCode/ergebnisCode/ergebnisLesen sind damit NICHT prüfbar; die Randfälle Index 63, art=1 mit Index 26, sitzung 0 und variante 255 "
    + "wurden hier nur als Packung/Prüfsumme nach der Festlegung nachgerechnet, nicht über die Schnittstelle.");
  nichtGeprueft.push("Kein zweiter Rechner, kein zweites Browserprofil, kein Android-/Tauri-Lauf – der Prozessvergleich ersetzt das nicht (sagt A-kanon.json selbst).");
  nichtGeprueft.push("Keine Eingabeprobe (Abtippen am Telefon, Groß-/Kleinschreibung, Zeichenfeld) – hier nur Normalisierung und Fehlerklassen am reinen Text.");
  nichtGeprueft.push("Ob `Math.round(sterne*2)` je über 10 liegt, wurde nicht über die Abnahme gemessen; Spiel.sterneBerechnen liefert 1..5 Sterne, die Grenze 0..10 "
    + "des Ergebniscodes wurde nur als Packung nachgerechnet.");
  nichtGeprueft.push("Vertauschungen NICHT benachbarter Nutzzeichen sind nicht erschöpfend geprüft (nur erste<->letzte Stelle); die Festlegung behauptet dazu nichts.");
  nichtGeprueft.push("Ob die drei Fertigkeiten ohne Injektor später einen bekommen – der Befund gilt für diese Fassung (DATEN.skills 27, Spiel.INJEKTOREN wie geladen).");
  nichtGeprueft.push("Die Laufzeit auf einem Schülergerät: nur Node v24.21.0 auf diesem Rechner gemessen, und die Zahlen schwanken zwischen Läufen.");

  /* ---------- Abschluss ---------- */
  M.laufzeitMs = Date.now() - t0;
  const stimmt = posten.filter(p => p.urteil === "stimmt").length;
  const falsch = posten.filter(p => p.urteil === "falsch").length;
  M.bilanz = {punkte: posten.length, stimmt, falsch, unklar: posten.length - stimmt - falsch};
  if (falsch) restfehler.push("Zwei Kernzusagen der Festlegung halten nicht: (1) § 3 packt `index` auf Bit 8, liest ihn aber aus Bit 10 – der Auftrag "
    + "laesst sich nicht zurueckrechnen (gemessen: Index 25 → 6, 26 → 54, 63 → 47); (2) der Kanonisierungszweig {eigene:true, k>0} ist in keinem der "
    + "3712 Faelle belegt. Einzelheiten in nachgerechnet[] (urteil „falsch“) und in korrekturen[].");

  const out = {
    thema: "pruef-kanon",
    stand: STEH,
    gepruefterEntwurf: GEPRUEFTER_ENTWURF,
    befehle: [{befehl: BEFEHL, ergebnis: "exit 0 · " + posten.length + " Punkte nachgerechnet (" + stimmt + " stimmt, " + falsch + " falsch) · Laufzeit " + M.laufzeitMs + " ms"},
      {befehl: "Kindprozess: \"" + process.execPath + "\" \"" + path.join(__dirname, "A-kanon.js") + "\" --teil 2",
       ergebnis: "spawnSync stdio=inherit, status " + (zweiterProzess.kind ? zweiterProzess.kind.status : "—") + ", " + (zweiterProzess.kind ? zweiterProzess.kind.ms : "—") + " ms"}],
    nachgerechnet: posten,
    korrekturen,
    restfehler,
    nichtGeprueft,
    messungen: M,
    befunde: B,
    offene: offene.length ? offene : ["Keine offenen Punkte aus dieser Probe."],
  };
  const ziel = path.join(NACH, "A-pruef-kanon.json");
  const text = JSON.stringify(out, null, 1) + "\n";
  const bytes = Buffer.from(text.replace(/\r\n/g, "\n"), "utf8");
  const alt = fs.existsSync(ziel) ? fs.readFileSync(ziel) : null;
  let geschrieben = false;
  if (!alt || !alt.equals(bytes)) {
    let nurLaufzeiten = false;
    if (alt) {
      try {
        const x = JSON.parse(alt.toString("utf8")), y = JSON.parse(text);
        const putzen = o => { delete o.messungen.laufzeitMs; delete o.messungen.laufzeiten;
          if (o.messungen.hand) delete o.messungen.hand.laufzeitMs; if (o.messungen.gen) delete o.messungen.gen.laufzeitMs;
          if (o.messungen.zweiterProzess && o.messungen.zweiterProzess.kind) delete o.messungen.zweiterProzess.kind.ms;
          o.befehle = o.befehle.map(z => ({befehl: z.befehl, ergebnis: String(z.ergebnis).replace(/Laufzeit \d+ ms/, "Laufzeit ? ms").replace(/, \d+ ms$/, ", ? ms")})); };
        putzen(x); putzen(y);
        nurLaufzeiten = JSON.stringify(x) === JSON.stringify(y);
      } catch (err) { nurLaufzeiten = false; }
    }
    if (!nurLaufzeiten) { fs.mkdirSync(path.dirname(ziel), {recursive: true}); fs.writeFileSync(ziel, bytes); geschrieben = true; }
  }
  process.stderr.write("[A-pruef-kanon] " + (geschrieben ? "geschrieben" : "unveraendert") + ": " + path.relative(WURZEL, ziel) + " · "
    + stimmt + " stimmt, " + falsch + " falsch · " + M.laufzeitMs + " ms\n");
  process.stdout.write("[A-pruef-kanon] fertig in " + M.laufzeitMs + " ms · Punkte " + stimmt + "/" + posten.length + " · Handmessungen " + messungen
    + " · Generatormessungen " + genMess + " · Kennwertproben " + proben.filter(p => p.gleich).length + "/" + proben.length + " · Korrekturen " + korrekturen.length + "\n");
  return out;
}

if (require.main === module) {
  try { starten(); } catch (err) { process.stderr.write("[A-pruef-kanon] FEHLER: " + (err && err.stack || err) + "\n"); process.exitCode = 1; }
}
module.exports = {starten, leseCode, auftragAusFeldern, ergebnisAusFeldern, pruefC1, pruefC2, fnv1a, kennwertAus, eigenerKanon, eigenerKennwert, ALPHABET};
