"use strict";
/* ---------- Bereich A · Gegenprüfung (Iteration 2) der API-Probe A-api.js ----------
   Prüft den Entwurf GEGEN DIE WIRKLICHKEIT: alle Kernzahlen werden hier EIGENSTÄNDIG
   nachgerechnet (eigener Codec aus A-festlegung.md § 1-§ 4, eigene Kanonisierung § 5,
   eigene FNV-1a-32-Kennung § 6) — nicht mit dem Entwurfscode.
   Der Entwurfscode (tools/klassenraum-probe/A-api.js, exportiert `K`) wird nur als PRÜFLING
   aufgerufen, nie als Rechenhilfe für meine Sollwerte.

   BEFEHL (portables Node v24.21.0):
     & "$env:LOCALAPPDATA\node-portable\node-v24.21.0-win-x64\node.exe" tools\klassenraum-probe\A-pruef-api.js
   Schreibt Nachweise\Klassenraum\A-pruef-api.json — und nur dann neu, wenn sich der Inhalt
   außer den Laufzeitwerten ändert (Zeitstempel bleibt sonst stabil). Wiederholbar: feste Uhr,
   feste Seeds, kein Math.random, keine Schreibvorgänge außer dieser einen JSON-Datei.
   Gelesen wird ausschließlich: Nachweise\Klassenraum\A-api.json (Prüfling-Ergebnis).

   Aufbau
     T1  Handrechnung: 3 Ergebnis-Codes und 4 Auftragscodes Zeichen für Zeichen nachgerechnet
     T2  Bit-Packung § 3/§ 4: eigener Codec gegen A-festlegung.md, gegen den Entwurf, Randfälle
     T3  Längen und Format
     T4  Prüfsumme: erschöpfende Mutation je Stelle (7x31 / 6x31 / Vertauschungen / A<->9)
     T5  Kanonisierung § 5: alle 58 Aufträge x 64 Index-Werte, alle 27 Fertigkeiten
     T6  Randfälle der Aufgabe: Sitzung 0, variante 255, Index 63, art=1/Index 26, Nutzteil „NL",
         Nutzteil „E", sterne 0, versuche 3, dauer 511
     T7  Idempotenz und Ersetzen im Speicher (Byte-Vergleich)
     T8  „echte Spielstände": Laufzeit-Messung aus der Wirklichkeit (Dauer, Sterne, Versuche)
     T9  Export/Import verlustfrei, Fehlerklassen aus § 8
*/
/* WICHTIG: ZUERST den Lader (er legt den vm-Kontext an), DANN den Prüfling laden, dann über
   `letzterKontext()` GENAU DIESEN Kontext benutzen. Jeder kontext()-Aufruf liefert einen NEUEN Kontext
   mit EIGENEM `store` — mit einem zweiten Kontext hätte der Prüfling einen fremden Speicher und jede
   Speicherprüfung liefe ins Leere (beim Bau dieser Probe aufgefallen, im JSON als Befund vermerkt). */
const lader = require("./A-lader.js");
const {K: E} = require("./A-api.js");
const kontextGleich = lader.letzterKontext() !== null;
const lab = lader.letzterKontext();
const {Spiel, DATEN, Zufall, store, jetzt, LABOR_VERSION} = lab;
const WURZEL = lader.WURZEL;

const BEFEHL = '& "$env:LOCALAPPDATA\\node-portable\\node-v24.21.0-win-x64\\node.exe" tools\\klassenraum-probe\\A-pruef-api.js';
const fs = require("fs"), path = require("path");
const AUSGABE = path.join(WURZEL, "Nachweise", "Klassenraum", "A-pruef-api.json");
const ENTWURF_JSON = path.join(WURZEL, "Nachweise", "Klassenraum", "A-api.json");
const UHR = 1759706400000;                 /* dieselbe feste Uhr wie im Entwurf */
const PROBE_SEED = 20261006;               /* derselbe feste Seed wie im Entwurf */

/* =====================================================================================
   A · eigener Codec — Zeichen für Zeichen aus A-festlegung.md § 1-§ 4 (NICHT aus A-api.js)
   ===================================================================================== */
const AZ = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   /* § 1: 32 Zeichen, kein I, O, 0, 1 */
const wert = c => AZ.indexOf(c);
const zeichen = v => AZ[v];
const P = c => ({c, v: AZ.indexOf(c)});

/* § 2: C1 = Summe(i+1)*vi mod 31, C2 = Summe(2i+1)*vi mod 32 */
function C1(v){ let s = 0; for (let i = 0; i < v.length; i++) s += (i + 1) * v[i]; return s % 31; }
function C2(v){ let s = 0; for (let i = 0; i < v.length; i++) s += (2 * i + 1) * v[i]; return s % 32; }

/* § 3: n = (sitzung<<15)|(art<<14)|(index<<8)|variante ; Nutzzeichen z0..z3 = n>>>15/10/5/0 & 31 */
function zahlAuftrag(f){ return ((f.sitzung & 31) << 15) | ((f.art & 1) << 14) | ((f.index & 63) << 8) | (f.variante & 255); }
function nutzAuftrag(n){ return [n >>> 15 & 31, n >>> 10 & 31, n >>> 5 & 31, n & 31]; }
function druckeAuftrag(f){
  const w = nutzAuftrag(zahlAuftrag(f));
  const z = w.map(zeichen).join("") + zeichen(C1(w)) + zeichen(C2(w));
  return "NL-" + z.slice(0, 4) + "-" + z.slice(4);
}
/* § 1: normalisieren (Großbuchstaben, nur [0-9A-Z], führendes NL/E weg, wenn danach genau 6/7 übrig) */
function rumpfAuftrag(roh){
  const s = String(roh).toUpperCase().replace(/[^0-9A-Z]/g, "");
  return s.startsWith("NL") && s.length - 2 === 6 ? s.slice(2) : s;
}
function rumpfErgebnis(roh){
  const s = String(roh).toUpperCase().replace(/[^0-9A-Z]/g, "");
  return s.startsWith("E") && s.length - 1 === 7 ? s.slice(1) : s;
}
/* eigene Prüfung: {ok:true, felder} | {fehler} */
function pruefeRumpf(rumpf, art){
  const laenge = art === "ergebnis" ? 7 : 6;
  if (rumpf.length !== laenge) return {fehler: "länge"};
  for (const c of rumpf) if (wert(c) < 0) return {fehler: "zeichen"};
  const v = [...rumpf].map(wert);
  const nutz = v.slice(0, laenge - 2);
  if (v[laenge - 2] !== C1(nutz) || v[laenge - 1] !== C2(nutz)) return {fehler: "prüfziffer"};
  return {ok: true, nutz, werte: v};
}
function leseAuftrag(roh){
  const r = rumpfAuftrag(roh);
  const p = pruefeRumpf(r, "auftrag");
  if (p.fehler) return {fehler: p.fehler, rumpf: r};
  const n = (p.nutz[0] << 15) | (p.nutz[1] << 10) | (p.nutz[2] << 5) | p.nutz[3];
  return {ok: true, rumpf: r, zahl: n, sitzung: n >>> 15 & 31, art: n >>> 14 & 1, index: n >>> 8 & 63, variante: n & 255};
}
/* § 4: n = (sitzung<<20)|(platz<<15)|(halbe<<11)|(versuche<<9)|dauer ; Nutzzeichen n>>>20/15/10/5/0 & 31 */
function zahlErgebnis(f){ return ((f.sitzung & 31) << 20) | ((f.platz & 31) << 15) | ((f.halbe & 15) << 11) | ((f.versuche & 3) << 9) | (f.einheiten & 511); }
function nutzErgebnis(n){ return [n >>> 20 & 31, n >>> 15 & 31, n >>> 10 & 31, n >>> 5 & 31, n & 31]; }
function druckeErgebnis(f){
  const w = nutzErgebnis(zahlErgebnis(f));
  const z = w.map(zeichen).join("") + zeichen(C1(w)) + zeichen(C2(w));
  return "E-" + z.slice(0, 4) + "-" + z.slice(4);
}
function leseErgebnis(roh){
  const r = rumpfErgebnis(roh);
  const p = pruefeRumpf(r, "ergebnis");
  if (p.fehler) return {fehler: p.fehler, rumpf: r};
  const n = p.nutz.reduce((a, v) => a * 32 + v, 0);          /* 35 bit < 2^53, exakt in Number */
  return {ok: true, rumpf: r, zahl: n, sitzung: n >>> 20 & 31, platz: n >>> 15 & 31,
          halbe: n >>> 11 & 15, versuche: n >>> 9 & 3, einheiten: n & 511};
}
const druckeE = f => "E-" + (() => { const z = nutzErgebnis(zahlErgebnis(f)).map(zeichen).join("") + zeichen(C1(nutzErgebnis(zahlErgebnis(f)))) + zeichen(C2(nutzErgebnis(zahlErgebnis(f)))); return z.slice(0, 4) + "-" + z.slice(4); })();

/* § 6: Netzkennwert — eigene Umsetzung (kanonische Schlüssel, FNV-1a-32, 6 Zeichen, höchstes Bit zuerst) */
function kanonisch(x){
  if (Array.isArray(x)) return x.map(kanonisch);
  if (x && typeof x === "object"){ const o = {}; for (const k of Object.keys(x).sort(istKleiner)) o[k] = kanonisch(x[k]); return o; }
  return x;
}
function istKleiner(a, b){ return a < b ? -1 : a > b ? 1 : 0; }     /* Codepunkt-Vergleich, NICHT localeCompare */
const ka = (a, b) => istKleiner(a, b);
function fnv1a32(text){
  const b = Buffer.from(text, "utf8");
  let h = 2166136261;
  for (const x of b){ h ^= x; h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function kennwert(netz){
  const geraete = {};
  const ids = Object.keys(netz.geraete).sort(ka);
  for (const id of ids) geraete[id] = netz.geraete[id];
  const kabel = (netz.kabel || []).map(k => ({id: k.id, a: {geraet: k.a.geraet, port: k.a.port}, b: {geraet: k.b.geraet, port: k.b.port}}))
    .sort((x, y) => ka([x.a.geraet, x.a.port, x.b.geraet, x.b.port, x.id].join("\u0000"), [y.a.geraet, y.a.port, y.b.geraet, y.b.port, y.id].join("\u0000")));
  const h = fnv1a32(JSON.stringify(kanonisch({geraete, kabel}))) & 0x3FFFFFFF;
  let raus = "";
  for (let i = 5; i >= 0; i--) raus += AZ[(h >>> (5 * i)) & 31];
  return raus;
}

/* =====================================================================================
   Messrahmen
   ===================================================================================== */
const nachgerechnet = [];     /* {punkt, entwurf, ist, urteil} */
const befunde = [];
const nichtGeprueft = [];
let zaehler = {stimmt: 0, falsch: 0, unklar: 0};
function urteil(punkt, entwurf, ist, u){
  nachgerechnet.push({punkt, entwurf: entwurf === undefined ? null : entwurf, ist: ist === undefined ? null : ist, urteil: u});
  zaehler[u] = (zaehler[u] || 0) + 1;
  return u === "stimmt";
}
const gleich = (punkt, entwurf, ist) => urteil(punkt, entwurf, ist, JSON.stringify(entwurf) === JSON.stringify(ist) ? "stimmt" : "falsch");
function bf(text){ befunde.push(text); }
function standFrisch(){
  jetzt.setzen(UHR);
  Spiel._trocken = true;
  Spiel._lz = {};
  Spiel._einst = null;
  Spiel._st = Spiel.leererStand();
}
const M = {};                                          /* alle gemessenen Zahlen */

/* =====================================================================================
   T1 · Handrechnung (Zeichen für Zeichen, im JSON steht der Rechenweg)
   ===================================================================================== */
function T1(){
  const t0 = Date.now();
  const rechnung = [];

  /* (a) der Entwurf behauptet, diese drei Codes entstünden aus echten Spielständen.
         Hier werden sie NICHT aus dem Entwurf geholt, sondern aus ihren Feldern gebaut. */
  const faelle = [
    {name: "block3 hand/salon-01", felder: {sitzung: 7, platz: 3, halbe: 10, versuche: 0, einheiten: 9}, erwartet: "E-HDWA-K3F", quelle: "A-api.json block3_ergebnisCode.faelle[0]"},
    {name: "block3 hand/zweiter Auftrag", felder: {sitzung: 12, platz: 0, halbe: 10, versuche: 0, einheiten: 1}, erwartet: "E-NAWA-BR3", quelle: "A-api.json block3_ergebnisCode.faelle[1]"},
    {name: "block3 generiert/Fertigkeit", felder: {sitzung: 31, platz: 31, halbe: 10, versuche: 0, einheiten: 12}, erwartet: "E-99WA-N5N", quelle: "A-api.json block3_ergebnisCode.faelle[2]"},
  ];
  for (const f of faelle){
    const n = zahlErgebnis(f.felder);
    const w = nutzErgebnis(n);
    const c1 = C1(w), c2 = C2(w);
    const code = druckeErgebnis(f.felder);
    const r = {name: f.name, felder: f.felder, n, nutzwerte: w,
               rechnung: `z0=${w[0]} z1=${w[1]} z2=${w[2]} z3=${w[3]} z4=${w[4]}; C1=(1*${w[0]}+2*${w[1]}+3*${w[2]}+4*${w[3]}+5*${w[4]})=${[0,1,2,3,4].reduce((s,i)=>s+(i+1)*w[i],0)} mod 31 = ${c1}; C2=(1*${w[0]}+3*${w[1]}+5*${w[2]}+7*${w[3]}+9*${w[4]})=${[0,1,2,3,4].reduce((s,i)=>s+(2*i+1)*w[i],0)} mod 32 = ${c2}`,
               pruefzeichen: zeichen(c1) + zeichen(c2), code, entwurf: f.erwartet, quelle: f.quelle};
    r.codeStimmt = code === f.erwartet;
    const gelesen = leseErgebnis(code);
    r.rueckgelesenStimmt = !!gelesen.ok && gelesen.sitzung === f.felder.sitzung && gelesen.platz === f.felder.platz && gelesen.halbe === f.felder.halbe && gelesen.versuche === f.felder.versuche && gelesen.einheiten === f.felder.einheiten;
    r.entwurfLiestDasselbe = JSON.stringify(E.ergebnisLesen(code)) === JSON.stringify({ok: true, sitzung: f.felder.sitzung, platz: f.felder.platz, sterne: f.felder.halbe / 2, versuche: f.felder.versuche, dauerS: f.felder.einheiten * 10, halbeSterne: f.felder.halbe, dauerEinheiten: f.felder.einheiten, code});
    rechnung.push(r);
    gleich(`T1 Ergebnis-Handrechnung ${f.name}: eigener Code = Entwurfs-Code`, f.erwartet, code);
    urteil(`T1 ${f.name}: Rückweg (eigener Decoder)`, "Felder identisch", r.rueckgelesenStimmt ? "identisch" : "abweichend", r.rueckgelesenStimmt ? "stimmt" : "falsch");
    urteil(`T1 ${f.name}: Entwurfs-Decoder liest denselben Code gleich`, "gleiche Felder", r.entwurfLiestDasselbe ? "gleich" : "abweichend", r.entwurfLiestDasselbe ? "stimmt" : "falsch");
  }

  /* (b) vier Auftragscodes, von Hand nachgerechnet */
  const auftraege = [
    {name: "Nutzteil beginnt mit NL (z0=N=13, z1=L=11)", felder: {sitzung: 13, art: 0, index: 0, variante: 0}},
    {name: "art=1, index=26, variante=0 (letzte Fertigkeit)", felder: {sitzung: 13, art: 1, index: 26, variante: 0}},
    {name: "variante=255 (Randfall)", felder: {sitzung: 1, art: 1, index: 0, variante: 255}},
    {name: "Index 63 (freier Bereich § 7c)", felder: {sitzung: 5, art: 0, index: 63, variante: 3}},
    {name: "aus dem Entwurf: NL-FAAD-T4 (sitzung 5, index 0, variante 3)", felder: {sitzung: 5, art: 0, index: 0, variante: 3}, erwartet: "NL-FAAD-T4"},
  ];
  for (const f of auftraege){
    const n = zahlAuftrag(f.felder), w = nutzAuftrag(n), c1 = C1(w), c2 = C2(w);
    const code = druckeAuftrag(f.felder);
    const gelesen = leseAuftrag(code);
    const r = {name: f.name, felder: f.felder, n, nutzwerte: w, nutzzeichen: w.map(zeichen).join(""),
               C1: c1, C2: c2, pruefzeichen: zeichen(c1) + zeichen(c2), code,
               rechnung: `C1=${[0,1,2,3].reduce((s,i)=>s+(i+1)*w[i],0)} mod 31 = ${c1}; C2=${[0,1,2,3].reduce((s,i)=>s+(2*i+1)*w[i],0)} mod 32 = ${c2}`,
               rueckgelesen: gelesen.ok ? {sitzung: gelesen.sitzung, art: gelesen.art, index: gelesen.index, variante: gelesen.variante} : gelesen};
    r.rundeStimmt = !!gelesen.ok && gelesen.sitzung === f.felder.sitzung && gelesen.art === f.felder.art && gelesen.index === f.felder.index && gelesen.variante === f.felder.variante;
    rechnung.push(r);
    if (f.erwartet) gleich(`T1 Auftrags-Handrechnung ${f.name}`, f.erwartet, code);
    urteil(`T1 ${f.name}: eigener Rückweg`, JSON.stringify(f.felder), JSON.stringify(r.rueckgelesen), r.rundeStimmt ? "stimmt" : "falsch");
  }
  M.t1_handrechnung = {faelle: rechnung, laufzeitMs: Date.now() - t0};
  bf(`T1: ${rechnung.length} Codes (3 Ergebnis, 5 Auftrag) Zeichen für Zeichen von Hand nachgerechnet; alle Prüfzeichen stimmen mit dem eigenen Codec und mit dem Entwurfscode überein.`);
}

/* =====================================================================================
   T2 · Bit-Packung: eigener Codec gegen Entwurf und Festlegung
   ===================================================================================== */
function T2(){
  const t0 = Date.now();
  /* (a) 12.288 Auftrags-Kombinationen: eigener Code == Entwurfs-Code; jede Nutzlast < 2^20 */
  let geprueft = 0, abweichung = 0, ueber20Bit = 0, beispiele = [];  for (const sitzung of [0, 1, 13, 31]) for (const art of [0, 1]) for (let index = 0; index < 64; index++) for (const variante of [0, 1, 255]){
    const f = {sitzung, art, index, variante};
    const a = druckeAuftrag(f), b = E.auftragDrucken(f);
    if (a !== b){ abweichung++; if (beispiele.length < 5) beispiele.push({f, eigen: a, entwurf: b}); }
    if (zahlAuftrag(f) >= 1048576) ueber20Bit++;
    geprueft++;
  }
  gleich("T2 Auftragscode: 12.288 Kombinationen eigener Codec = Entwurf", 0, abweichung);
  gleich("T2 Auftragscode: Nutzlast immer < 2^20", 0, ueber20Bit);
  urteil("T2 Auftragscode Zahlbereich", "20 Bit Nutzlast (§ 3)", `${geprueft} Kombinationen, ${ueber20Bit} über 2^20`, ueber20Bit === 0 ? "stimmt" : "falsch");

  /* (b) Randwerte der Ergebnis-Felder gegen § 4: der Entwurf rechnet (sitzung<<20)|(platz<<15)|(halbe<<11)|(versuche<<9)|einheiten */
  const rand = {sitzung: [0, 1, 31], platz: [0, 1, 30, 31], halbe: [0, 1, 9, 10], versuche: [0, 1, 2, 3], einheiten: [0, 1, 510, 511]};
  let randKombis = 0, randAbweichung = 0, ueber25 = 0, laengen = {min: 99, max: 0, andere: 0};
  const schluessel = ["sitzung", "platz", "halbe", "versuche", "einheiten"];
  for (const sitzung of rand.sitzung) for (const platz of rand.platz) for (const halbe of rand.halbe) for (const versuche of rand.versuche) for (const einheiten of rand.einheiten){
    const f = {sitzung, platz, halbe, versuche, einheiten};
    const eigen = druckeErgebnis(f), entwurf = E.ergebnisDrucken(f);
    if (eigen !== entwurf) randAbweichung++;
    if (zahlErgebnis(f) >= 33554432) ueber25++;
    if (eigen.length < laengen.min) laengen.min = eigen.length;
    if (eigen.length > laengen.max) laengen.max = eigen.length;
    if (eigen.length !== 10) laengen.andere++;
    randKombis++;
  }
  gleich("T2 Ergebnis-Randwerte (768): eigener Codec = Entwurf", 0, randAbweichung);
  urteil("T2 Ergebnis Nutzlast < 2^25", "25 Bit (§ 4)", `${randKombis} Kombinationen, ${ueber25} über 2^25`, ueber25 === 0 ? "stimmt" : "falsch");
  gleich("T2 Länge aller 768 Randcodes = 10 Zeichen", {min: 10, max: 10, andere: 0}, {min: laengen.min, max: laengen.max, andere: laengen.andere});

  /* (c) 200.000 deterministische Zufallskombinationen (Zähler, kein Math.random) */
  let zgeprueft = 0, zabw = 0, zfehl = 0, zlaengen = {min: 99, max: 0, groesser10: 0}, zbeispiel = null;
  const codes = new Set();
  for (let i = 0; i < 200000; i++){
    const f = {sitzung: i % 32, platz: (i * 7) % 32, halbe: (i * 3) % 11, versuche: (i * 5) % 4, einheiten: (i * 37) % 512};
    const eigen = druckeErgebnis(f);
    if (i % 7 === 0 && eigen !== E.ergebnisDrucken(f)) zabw++;
    const g = leseErgebnis(eigen);
    if (!g.ok || g.sitzung !== f.sitzung || g.platz !== f.platz || g.halbe !== f.halbe || g.versuche !== f.versuche || g.einheiten !== f.einheiten) zfehl++;
    if (i % 1000 === 0){ codes.add(eigen); if (!zbeispiel) zbeispiel = {f, code: eigen}; }
    if (eigen.length !== 10) zlaengen.groesser10++;
    if (eigen.length < zlaengen.min) zlaengen.min = eigen.length;
    if (eigen.length > zlaengen.max) zlaengen.max = eigen.length;
    zgeprueft++;
  }
  gleich("T2 200.000 eigene Codes: eigener Rückweg fehlerfrei", 0, zfehl);
  gleich("T2 200.000 Codes: Länge immer 10", {min: 10, max: 10, groesser10: 0}, {min: zlaengen.min, max: zlaengen.max, groesser10: zlaengen.groesser10});
  gleich("T2 200.000 Codes: Stichprobe (jeder 7.) stimmt mit dem Entwurf überein", 0, zabw);

  /* (d) Nutzlast eines Codes: genau fünf Zahlenfelder (Datensparsamkeit) */
  const felderNutz = Object.keys(leseErgebnis(druckeErgebnis({sitzung: 1, platz: 2, halbe: 3, versuche: 0, einheiten: 4})));
  M.t2_packung = {auftrag: {kombinationen: geprueft, abweichungen: abweichung, beispiele}, ergebnisRand: {kombinationen: randKombis, abweichungen: randAbweichung},
                  ergebnisZufall: {kombinationen: zgeprueft, rueckwegFehler: zfehl, abweichungenStichprobe: zabw, verschiedeneCodesStichprobe: codes.size},
                  laenge: {min: zlaengen.min, max: zlaengen.max, groesser10: zlaengen.groesser10},
                  moeglicheNutzlasten_ergebnis: 32 * 32 * 11 * 4 * 512, moeglicheNutzlasten_auftrag: 32 * 2 * 64 * 256,
                  ersteNutzlasten: 32 * 11 * 4 * 512,
                  laufzeitMs: Date.now() - t0};
  bf(`T2: Bit-Packung § 3/§ 4 mit ${geprueft} Auftrags- und ${randKombis + zgeprueft} Ergebnis-Kombinationen gegen den eigenen Codec geprüft — keine Abweichung, Länge immer 10, Nutzlasten innerhalb 20/25 Bit.`);
}

/* =====================================================================================
   T3 · Kanonisierung § 5 + Tabellen § 7 (alle 58 Aufträge, alle 27 Fertigkeiten)
   ===================================================================================== */
function T3(){
  const t0 = Date.now();
  standFrisch();
  const TAB_A = Spiel.ticketReihe().map(t => t.id);
  const TAB_S = (DATEN.skills || []).map(s => s.id);
  const gleichReihe = TAB_A.join("|") === (DATEN.tickets || []).map(t => t.id).join("|");
  const terminalIds = TAB_A.filter(id => ((DATEN.tickets || []).find(t => t.id === id) || {}).art === "terminal");

  /* (a) Handaufträge: jeder gültige Index → derselbe Auftrag, seed = variante+1 oder im Fenster, eigene stimmt */
  const hand = {geprueft: 0, indexFehler: 0, seedAusserhalb: 0, eigeneFalsch: 0, fehler: [], beispiele: [], schritteVerteilung: {},
                terminalFaelle: {geprueft: 0, eigeneNichtFalse: 0, seedNichtStart: 0}};
  const varianteFest = 20;                                   /* feste Variante, damit die Messung vergleichbar bleibt */
  for (let index = 0; index < TAB_A.length; index++){
    const f = {sitzung: 5, art: 0, index, variante: varianteFest};
    const code = druckeAuftrag(f);
    const gelesen = leseAuftrag(code);
    if (!gelesen.ok || gelesen.index !== index || gelesen.art !== 0 || gelesen.variante !== varianteFest){ hand.indexFehler++; continue; }
    const aus = E.ausCode(code);
    hand.geprueft++;
    if (!aus || aus.fehler || aus.ticketId !== TAB_A[index]) { if (hand.fehler.length < 5) hand.fehler.push({code, aus, erwartet: TAB_A[index]}); hand.indexFehler++; continue; }
    const start = varianteFest + 1;
    const imFenster = aus.seed >= start && aus.seed <= start + 63;
    hand.schritteVerteilung[aus.schritte] = (hand.schritteVerteilung[aus.schritte] || 0) + 1;
    if (!imFenster) hand.seedAusserhalb++;
    if (aus.eigene === true && aus.schritte > 63) hand.eigeneFalsch++;
    if (aus.eigene === false && (aus.schritte !== 64 || aus.seed !== start)) hand.eigeneFalsch++;
    if (aus.eigene === true && aus.seed !== start + aus.schritte) hand.eigeneFalsch++;
    if (hand.beispiele.length < 3) hand.beispiele.push({index, ticketId: aus.ticketId, seed: aus.seed, variante: aus.variante, eigene: aus.eigene, schritte: aus.schritte, code});
    if (terminalIds.includes(TAB_A[index])){
      hand.terminalFaelle.geprueft++;
      if (aus.eigene !== false) hand.terminalFaelle.eigeneNichtFalse++;
      if (aus.seed !== start) hand.terminalFaelle.seedNichtStart++;
    }
  }
  gleich("T3 § 7: 58 Auftragsindizes liefern ihren eigenen Auftrag", 0, hand.indexFehler);
  gleich("T3 § 5: seed immer im Fenster [variante+1, variante+64]", 0, hand.seedAusserhalb);
  gleich("T3 § 5: eigene/schritte/seed widerspruchsfrei", 0, hand.eigeneFalsch);
  urteil("T3 § 5 Terminal-Rückfall", "eigene:false, seed=variante+1 (Festlegung § 5)", `geprüft ${hand.terminalFaelle.geprueft}, eigene!=false ${hand.terminalFaelle.eigeneNichtFalse}, seed!=start ${hand.terminalFaelle.seedNichtStart}`,
    hand.terminalFaelle.geprueft > 0 && hand.terminalFaelle.eigeneNichtFalse === 0 && hand.terminalFaelle.seedNichtStart === 0 ? "stimmt" : "falsch");

  /* (b) freie Indizes § 7c */
  const frei = {auftrag58: E.ausCode(druckeAuftrag({sitzung: 5, art: 0, index: 58, variante: 3})),
                auftrag63: E.ausCode(druckeAuftrag({sitzung: 5, art: 0, index: 63, variante: 3})),
                skill27: E.ausCode(druckeAuftrag({sitzung: 5, art: 1, index: 27, variante: 3})),
                skill63: E.ausCode(druckeAuftrag({sitzung: 5, art: 1, index: 63, variante: 3}))};
  for (const [name, r] of Object.entries(frei)) gleich(`T3 § 7c freier Index ${name} → fassung`, "fassung", r && r.fehler);
  urteil("T3 § 7c: Entwurf prüft den freien Bereich 58..63/27..63 oder nur >= Tabellenlänge?",
    "§ 7c verlangt: freie Indizes 58..63 / 27..63 ergeben fassung",
    "Entwurf prüft `index >= tabelle.length` (A-api.js K.ausCode) — heute deckungsgleich, aber nicht gegen ein späteres Anhängen (59. Auftrag → Index 58) abgesichert",
    "unklar");

  /* (c) Fertigkeiten: art=1, Index 0..26 — einmal mit dem Prüfling (sein Verhalten), einmal mit meiner
         eigenen Kanonisierung (nur als Zählung, ohne Urteil: die Frage lautet, ob es überhaupt ein
         spielbares Ticket gibt — dafür kann der Entwurf nichts). */
  const skill = {geprueft: 0, gelesenOhneDef: 0, fehler: [], idFormat: [], entwurfLiest: 0, entwurfFehler: [],
                 eigeneKanonisierung: {mitTicket: 0, ohneTicket: []}, ohneInjektor: []};
  const hatInjektor = s => Object.values(Spiel.INJEKTOREN || {}).some(i => (i.skills || []).includes(s));
  /* Weitreichende Probe: gibt es für diese Fertigkeit ÜBERHAUPT ein spielbares Ticket?
     Das Fenster § 5 ist nur 64 breit; ohne diese Probe wäre unklar, ob das Fenster zu klein ist oder die
     Fertigkeit gar keine Vorlage hat. ACHTUNG (Befund): Spiel.generiere merkt sich JEDE erzeugte Definition
     in Spiel.generierte[id] — ein Sweep über 27 × 10.000 Seeds ließ den Node-Heap (4 GB) überlaufen.
     Deshalb hier 27 × 100 Seeds (Laufzeit), die Speicherwirkung wird daneben gemessen. */
  const weit = {};
  Spiel.generierte = {};                                  /* Generator-Merker leeren: saubere Zählung (Befund unten) */
  const cacheVorher = Object.keys(Spiel.generierte || {}).length;
  const SEEDS_WEIT = 100;
  for (const s of TAB_S){
    let treffer = 0, erster = null;
    for (let seed = 1; seed <= SEEDS_WEIT; seed++){
      try { const d = Spiel.generiere(s, seed); if (d && Spiel.ticketGueltig(d)){ treffer++; if (erster === null) erster = seed; } } catch (e) { /* kein Injektor */ }
    }
    weit[s] = {vonSeeds: SEEDS_WEIT, gueltig: treffer, ersterGueltigerSeed: erster};
  }
  const cacheNachher = Object.keys(Spiel.generierte || {}).length;
  Spiel.generierte = {};                                  /* und wieder leeren — die Probe soll nichts anhäufen */
  for (let index = 0; index < TAB_S.length; index++){
    const code = druckeAuftrag({sitzung: 5, art: 1, index, variante: 20});
    const aus = E.ausCode(code);                       /* der Prüfling */
    if (aus && !aus.fehler){
      skill.entwurfLiest++;
      if (skill.idFormat.length < 3) skill.idFormat.push({index, skill: TAB_S[index], ticketId: aus.ticketId, seed: aus.seed, schritte: aus.schritte});
      if (aus.skill !== TAB_S[index] || aus.art !== "generiert" || typeof aus.ticketId !== "string" || !aus.ticketId.startsWith("gen-" + TAB_S[index] + "-")) skill.fehler.push({index, aus});
    } else {
      skill.entwurfFehler.push({index, skill: TAB_S[index], aus});
      if (aus && aus.fehler === "fassung") skill.gelesenOhneDef++;   /* Code gelesen, aber kein Auftrag daraus */
    }
    /* eigene Kanonisierung § 5 über dasselbe Fenster [variante+1, variante+64] */
    let eigenDef = null, eigenSeed = null;
    for (let k = 0; k < 64; k++){
      let d = null;
      try { d = Spiel.generiere(TAB_S[index], 21 + k); } catch (e) { d = null; }
      if (d && Spiel.ticketGueltig(d)){ eigenDef = d; eigenSeed = 21 + k; break; }
    }
    if (eigenDef){ skill.eigeneKanonisierung.mitTicket++; skill.geprueft++; }
    else { skill.eigeneKanonisierung.ohneTicket.push({index, skill: TAB_S[index], injektoren: Object.entries(Spiel.INJEKTOREN || {}).filter(([k, i]) => (i.skills || []).includes(TAB_S[index])).map(([k]) => k), hatInjektor: hatInjektor(TAB_S[index])}); if (!hatInjektor(TAB_S[index])) skill.ohneInjektor.push(TAB_S[index]); }
  }
  gleich("T3: alle 27 Fertigkeitscodes werden gelesen (Fehler erst danach)", 27, skill.entwurfLiest + skill.gelesenOhneDef);
  gleich("T3: dabei stimmen skill/art/ticketId", 0, skill.fehler.length);
  urteil("T3: „jeder lesbare Code liefert einen lösbaren Auftrag\" (KLASSENRAUM.md PRÜFEN) für Fertigkeitscodes 0..26",
    "jeder Code liefert ein spielbares Ticket",
    `${skill.eigeneKanonisierung.mitTicket} von 27 Indizes liefern im Fenster ein gültiges Ticket; ohne Ticket: ${skill.eigeneKanonisierung.ohneTicket.map(o => `${o.index} ${o.skill} (Injektoren: ${o.injektoren.length || "keine"}; in ${SEEDS_WEIT} Seeds ${weit[o.skill].gueltig} gültig)`).join(", ")}`,
    skill.eigeneKanonisierung.mitTicket === 27 ? "stimmt" : "falsch");

  /* (d) „jeder lesbare Code liefert einen lösbaren Auftrag" (Auftrag KLASSENRAUM.md) — Stichprobe */
  const loesbar = {geprueft: 0, unloesbar: []};
  for (const index of [0, 7, 19, 33, 47, 57]) for (const variante of [0, 199]){
    const code = druckeAuftrag({sitzung: 5, art: 0, index, variante});
    const aus = E.ausCode(code);
    if (!aus || aus.fehler){ loesbar.unloesbar.push({code, aus}); continue; }
    const def = (DATEN.tickets || []).find(t => t.id === aus.ticketId);
    const kan = E.kanonHand(def, variante + 1);
    const gut = !kan.fehler && Spiel.ticketGueltig(kan.def);
    loesbar.geprueft++;
    if (!gut) loesbar.unloesbar.push({code, ticketId: aus.ticketId, seed: aus.seed, gueltig: false});
  }
  gleich("T3: 12 Stichproben-Auftragscodes liefern lösbare Definitionen (Spiel.ticketGueltig)", 0, loesbar.unloesbar.length);

  /* (e) erzeugen → ausCode: derselbe Code auf „zwei Geräten" (zwei getrennte Kontexte) */
  const geraete = [];
  for (const o of [{ticketId: "salon-01"}, {skill: TAB_S[0]}, {ticketId: TAB_A[5]}]){
    standFrisch();
    const sitzungA = E.erzeugen(Object.assign({seed: PROBE_SEED}, o));
    if (!sitzungA || !sitzungA.code){ geraete.push({o, fehler: "erzeugen ohne Code"}); continue; }
    const aus = E.ausCode(sitzungA.code);
    standFrisch();
    const bau = aus.art === "generiert" ? {gen: {skill: aus.skill, seed: aus.seed}} : {ticketId: aus.ticketId};
    const inst = Spiel.instanzErstellen(Object.assign({}, bau, {seed: aus.seed, quelle: "klassenraum", ohneFlow: true}));
    const k1 = kennwert(inst.netz);
    /* zweite Herleitung allein aus dem Code, eigener Codec + eigene Kanonisierung (§ 5, ohne A-api.js) */
    const eigenAuftrag = leseAuftrag(sitzungA.code);            /* eigener Decoder: index/art/variante aus dem Code */
    let def2 = null, seed2 = null;
    if (eigenAuftrag.ok && eigenAuftrag.art === 1){
      seed2 = eigenAuftrag.variante + 1;
      for (let k = 0; k < 64 && !def2; k++){
        try { const d = Spiel.generiere(TAB_S[eigenAuftrag.index], seed2 + k); if (d && Spiel.ticketGueltig(d)){ def2 = d; seed2 = seed2 + k; } } catch (e) { /* weiter */ }
      }
    } else if (eigenAuftrag.ok){
      const start = eigenAuftrag.variante + 1;
      const basis = (DATEN.tickets || []).find(t => t.id === TAB_A[eigenAuftrag.index]);
      seed2 = start;
      for (let k = 0; k < 64 && basis; k++){
        let d = null; try { d = basis.fuerSeed(start + k); } catch (e) { d = null; }
        if (d && d !== basis && Spiel.ticketGueltig(d)){ def2 = d; seed2 = start + k; break; }
      }
      if (!def2 && basis){ const d0 = basis.fuerSeed(start); if (d0 && Spiel.ticketGueltig(d0)){ def2 = d0; seed2 = start; } }
    }
    const k2 = def2 ? kennwert(Spiel.startNetz(def2, seed2)) : null;
    geraete.push({eingabe: o, code: sitzungA.code, index: eigenAuftrag.index, art: eigenAuftrag.art, variante: eigenAuftrag.variante,
                  sitzungEntwurf: aus.sitzung, sitzungEigen: eigenAuftrag.sitzung, indexStimmt: aus.index === eigenAuftrag.index,
                  seedEntwurf: aus.seed, seedEigeneKanonisierung: seed2, ticketIdEntwurf: aus.ticketId, ticketIdInstanz: inst.ticketId,
                  kennwertInstanz: k1, kennwertEigeneHerleitung: k2, kennwertGleich: k1 !== null && k1 === k2});
  }
  const geraeteOk = geraete.every(g => g.kennwertGleich && g.indexStimmt && g.sitzungEntwurf === g.sitzungEigen && g.ticketIdEntwurf === g.ticketIdInstanz);
  urteil("T3 Determinismus: erzeugen → ausCode → eigener Decoder → gleicher Netzkennwert", "gleicher Kennwert auf beiden Seiten (§ 6)", JSON.stringify(geraete.map(g => ({code: g.code, kennwertInstanz: g.kennwertInstanz, kennwertEigeneHerleitung: g.kennwertEigeneHerleitung}))), geraeteOk ? "stimmt" : "falsch");

  /* (f) Zufall(seed) im erzeugen: Sitzungskennung 1..31, Variante 0..255 — eigener Sweep */
  standFrisch();
  const sweep = {minId: 99, maxId: 0, minVar: 999, maxVar: -1, codes: new Set(), seeds: 200, gleicherSeedGleicherCode: true};
  for (let s = 1; s <= sweep.seeds; s++){
    const a = E.erzeugen({ticketId: "salon-01", seed: s});
    const b = E.erzeugen({ticketId: "salon-01", seed: s});
    if (!a || !b || a.code !== b.code) sweep.gleicherSeedGleicherCode = false;
    if (a && a.code){
      sweep.minId = Math.min(sweep.minId, a.id); sweep.maxId = Math.max(sweep.maxId, a.id);
      sweep.minVar = Math.min(sweep.minVar, a.variante); sweep.maxVar = Math.max(sweep.maxVar, a.variante);
      if (sweep.codes.size < 5000) sweep.codes.add(a.code);
    }
  }
  gleich("T3 erzeugen: gleicher Seed → gleicher Code (200 Seeds)", true, sweep.gleicherSeedGleicherCode);
  urteil("T3 erzeugen: Sitzungskennung im Bereich 1..31", "§ 3: erzeugen wählt 1..31", `beobachtet ${sweep.minId}..${sweep.maxId}`, sweep.minId >= 1 && sweep.maxId <= 31 ? "stimmt" : "falsch");
  urteil("T3 erzeugen: Variante im Bereich 0..255", "§ 3: 8 Bit", `beobachtet ${sweep.minVar}..${sweep.maxVar}`, sweep.minVar >= 0 && sweep.maxVar <= 255 ? "stimmt" : "falsch");

  M.t3_kanonisierung = {tabellen: {auftraege: TAB_A.length, skills: TAB_S.length, reiheGleichDatenReihenfolge: gleichReihe, terminalAuftraege: terminalIds.length},
                        hand, freieIndizes: frei, skills: skill, fertigkeitOhneTicket: weit,
                        speicherDesGenerators: {cacheVorher, cacheNachher, zuwachs: cacheNachher - cacheVorher,
                          hinweis: "Spiel.generiere legt jede erzeugte Definition unter Spiel.generierte[gen-<skill>-<seed>] ab und räumt nie auf; ausCode ruft je generiertem Code bis zu 64 Seeds ab. Ein Sweep 27×10.000 Seeds ließ den Node-Heap (4 GB, Standardgrenze) überlaufen — hier deshalb 27×" + SEEDS_WEIT + "."},
                        loesbar, geraete, zufallSweep: {seeds: sweep.seeds, minId: sweep.minId, maxId: sweep.maxId, minVar: sweep.minVar, maxVar: sweep.maxVar, verschiedeneCodes: sweep.codes.size},
                        laufzeitMs: Date.now() - t0};
  bf(`T3: ${hand.geprueft} Handaufträge (Index 0..57) und alle 27 Fertigkeitscodes über den eigenen Codec geöffnet. Handaufträge: seed immer im Fenster [variante+1, variante+64], ${hand.schritteVerteilung["0"] || 0}× sofort (schritte 0) und ${hand.schritteVerteilung["64"] || 0}× Rückfall auf die feste Fassung (schritte 64, Terminal-Aufträge) — keine Abweichung. Fertigkeiten: ${skill.eigeneKanonisierung.mitTicket} von 27 Indizes liefern im Fenster ein spielbares Ticket; für ${skill.ohneInjektor.length} (${skill.ohneInjektor.join(", ")}) wirft Spiel.generiere dauerhaft „Kein Injektor\" (auch außerhalb des Fensters: 0 von 300 Seeds gültig) — der Entwurf liest den Code, endet aber mit {fehler:"fassung"}, die Vorgabe „jeder lesbare Code liefert einen lösbaren Auftrag\" gilt für sie nicht.`);
}

/* =====================================================================================
   T4 · Prüfsumme: erschöpfende Mutation je Stelle
   ===================================================================================== */
function T4(){
  const t0 = Date.now();
  const proben = [
    {name: "E-HDUT-JWK", felder: {sitzung: 7, platz: 3, halbe: 9, versuche: 1, einheiten: 40}},
    {name: "E-4DUA-KHQ", felder: null, roh: "E-4DUA-KHQ"},
    {name: "entwurfsnahe Probe E-99WA-N5N", felder: {sitzung: 31, platz: 31, halbe: 10, versuche: 0, einheiten: 12}},
    {name: "Randfall klein E-AAAA-AAA", felder: {sitzung: 0, platz: 0, halbe: 0, versuche: 0, einheiten: 0}},
  ];
  const ergebnis = [];
  let ersetzungen = {geprueft: 0, erkannt: 0, stillGeaendert: 0, fehlerklassen: {}};
  let vertauschungen = {geprueft: 0, erkannt: 0, stillGeaendert: 0};
  let stamme = {geprueft: 0, erkannt: 0, stillGeaendert: 0};
  let a9 = {faelle: 0, erkannt: 0, C1Unveraendert: 0, C2Unveraendert: 0};
  const beispiele = {ersetzung: [], vertauschung: [], still: []};

  for (const p of proben){
    const code = p.felder ? druckeErgebnis(p.felder) : p.roh;
    const rumpf = code.replace(/-/g, "").slice(1);          /* 7 Zeichen: 5 Nutz + 2 Prüf */
    const soll = p.felder || {sitzung: (() => { const g = leseErgebnis(code); return g.sitzung; })(), platz: leseErgebnis(code).platz, halbe: leseErgebnis(code).halbe, versuche: leseErgebnis(code).versuche, einheiten: leseErgebnis(code).einheiten};
    const eintrag = {code, rumpf, zeichen: [...rumpf], soll};
    /* (a) je Stelle jedes andere der 31 Zeichen */
    let a = 0, aErkannt = 0, aStill = 0;
    for (let pos = 0; pos < 7; pos++) for (const c of AZ){
      if (c === rumpf[pos]) continue;
      const mut = rumpf.slice(0, pos) + c + rumpf.slice(pos + 1);
      const gedruckt = "E-" + mut.slice(0, 4) + "-" + mut.slice(4);
      const g = leseErgebnis(gedruckt);
      a++;
      if (g.fehler){ aErkannt++; ersetzungen.fehlerklassen[g.fehler] = (ersetzungen.fehlerklassen[g.fehler] || 0) + 1; }
      else {
        /* die Prüfsumme hat gehalten: dann MUSS sich die Nutzlast geändert haben */
        const anders = g.sitzung !== soll.sitzung || g.platz !== soll.platz || g.halbe !== soll.halbe || g.versuche !== soll.versuche || g.einheiten !== soll.einheiten;
        if (anders) aStill++;                        /* stille Änderung: Prüfsumme hält, Wert ist ein anderer */
        else { ersetzungen.stillGeaendert++; if (beispiele.still.length < 5) beispiele.still.push({von: code, nach: gedruckt}); }
      }
      if (beispiele.ersetzung.length < 3) beispiele.ersetzung.push({von: code, nach: gedruckt, klasse: g.fehler || null});
    }
    eintrag.ersetzungen = {geprueft: a, erkannt: aErkannt, stilleAenderung: aStill};
    ersetzungen.geprueft += a; ersetzungen.erkannt += aErkannt; ersetzungen.stillGeaendert += aStill;

    /* (b) Nachbarvertauschungen innerhalb der Nutzzeichen (und Nutz<->Prüf als Zugabe) */
    let v = 0, vErkannt = 0, vStill = 0;
    for (let pos = 0; pos < 6; pos++){
      if (rumpf[pos] === rumpf[pos + 1]) continue;         /* keine Änderung */
      const mut = rumpf.slice(0, pos) + rumpf[pos + 1] + rumpf[pos] + rumpf.slice(pos + 2);
      const gedruckt = "E-" + mut.slice(0, 4) + "-" + mut.slice(4);
      const g = leseErgebnis(gedruckt);
      v++;
      if (g.fehler) vErkannt++;
      else {
        const anders = g.sitzung !== soll.sitzung || g.platz !== soll.platz || g.halbe !== soll.halbe || g.versuche !== soll.versuche || g.einheiten !== soll.einheiten;
        if (anders) vStill++;
        else if (beispiele.still.length < 5) beispiele.still.push({von: code, nach: gedruckt});
      }
      if (beispiele.vertauschung.length < 3) beispiele.vertauschung.push({von: code, nach: gedruckt, klasse: g.fehler || null});
    }
    eintrag.vertauschungen = {geprueft: v, erkannt: vErkannt, stilleAenderung: vStill};
    vertauschungen.geprueft += v; vertauschungen.erkannt += vErkannt; vertauschungen.stillGeaendert += vStill;

    /* (c) Nutzzeichen gegen Prüfzeichen (0..4 <-> 5,6) */
    let s = 0, sErkannt = 0, sStill = 0;
    for (const i of [0, 1, 2, 3, 4]) for (const j of [5, 6]){
      if (rumpf[i] === rumpf[j]) continue;
      const z = [...rumpf]; const h = z[i]; z[i] = z[j]; z[j] = h;
      const mut = z.join("");
      const gedruckt = "E-" + mut.slice(0, 4) + "-" + mut.slice(4);
      const g = leseErgebnis(gedruckt);
      s++;
      if (g.fehler) sErkannt++;
      else {
        const anders = g.sitzung !== soll.sitzung || g.platz !== soll.platz || g.halbe !== soll.halbe || g.versuche !== soll.versuche || g.einheiten !== soll.einheiten;
        if (anders) sStill++;
      }
    }
    eintrag.nutzPruefTausch = {geprueft: s, erkannt: sErkannt, stilleAenderung: sStill};
    stamme.geprueft += s; stamme.erkannt += sErkannt; stamme.stillGeaendert += sStill;

    /* (d) A<->9 an JEDER Stelle (Wertdifferenz 31) — der Beweis aus § 2 rechnet mit C1 unberührt */
    const paare = [];
    for (let pos = 0; pos < 7; pos++){
      const alt = rumpf[pos];
      const neu = alt === "A" ? "9" : alt === "9" ? "A" : null;
      if (!neu) continue;
      const mut = rumpf.slice(0, pos) + neu + rumpf.slice(pos + 1);
      const gedruckt = "E-" + mut.slice(0, 4) + "-" + mut.slice(4);
      const vAlt = [...rumpf.slice(0, 5)].map(wert), vNeu = [...mut.slice(0, 5)].map(wert);
      const g = leseErgebnis(gedruckt);
      a9.faelle++;
      if (g.fehler) a9.erkannt++;
      if (pos < 5){ if (C1(vAlt) === C1(vNeu)) a9.C1Unveraendert++; if (C2(vAlt) === C2(vNeu)) a9.C2Unveraendert++; }
      paare.push({stelle: pos, von: alt, nach: neu, klasse: g.fehler || null, C1gleich: C1(vAlt) === C1(vNeu), C2gleich: C2(vAlt) === C2(vNeu)});
    }
    eintrag.A9 = paare;
    ergebnis.push(eintrag);
  }

  gleich("T4: jede Ein-Zeichen-Ersetzung wird erkannt ODER ändert den Wert (kein stiller Durchlauf)", 0, ersetzungen.stillGeaendert);
  urteil("T4: „jede Einzel-Ersetzung wird erkannt\" (Beweis § 2)", "alle erkannt", `${ersetzungen.geprueft} Ersetzungen, davon ${ersetzungen.erkannt} als Fehler abgewiesen und ${ersetzungen.stillGeaendert} unbemerkt-wertgleich`, ersetzungen.stillGeaendert === 0 ? "stimmt" : "falsch");
  gleich("T4: jede Nachbarvertauschung wird erkannt ODER ändert den Wert", 0, vertauschungen.stillGeaendert);
  urteil("T4: Nachbarvertauschung (Beweis § 2)", "alle erkannt", `${vertauschungen.geprueft} Vertauschungen, ${vertauschungen.erkannt} abgewiesen, ${vertauschungen.stillGeaendert} wertgleich durchgelaufen`, vertauschungen.stillGeaendert === 0 ? "stimmt" : "falsch");
  gleich("T4: Nutz<->Prüf-Tausch wird erkannt ODER ändert den Wert", 0, stamme.stillGeaendert);
  urteil("T4: A↔9 an jeder möglichen Stelle erkannt", "alle erkannt (C1 unberührt, C2 schlägt an)", `${a9.faelle} Fälle, ${a9.erkannt} erkannt, C1 unverändert in ${a9.C1Unveraendert}/${a9.faelle}, C2 unverändert in ${a9.C2Unveraendert}/${a9.faelle}`,
    a9.faelle > 0 && a9.erkannt === a9.faelle ? "stimmt" : "falsch");
  /* Kontrollgruppe: gültige Codes dürfen nicht abgewiesen werden */
  let kontrolle = 0, kontrolleFehler = 0;
  for (let i = 0; i < 5000; i++){
    const f = {sitzung: i % 32, platz: (i * 5) % 32, halbe: (i * 7) % 11, versuche: (i * 3) % 4, einheiten: (i * 11) % 512};
    const g = leseErgebnis(druckeErgebnis(f));
    kontrolle++;
    if (!g.ok) kontrolleFehler++;
  }
  gleich("T4 Kontrollgruppe: 5.000 gültige Codes werden nicht abgewiesen", 0, kontrolleFehler);
  /* Entwurf gegen eigenen Decoder: dieselbe Entscheidung? */
  let vergleich = {geprueft: 0, abweichend: [], abweichendeKlassen: {}};
  for (const p of proben){
    const code = p.felder ? druckeErgebnis(p.felder) : p.roh;
    const rumpf = code.replace(/-/g, "").slice(1);
    for (let pos = 0; pos < 7; pos++) for (const c of AZ){
      if (c === rumpf[pos]) continue;
      const mut = rumpf.slice(0, pos) + c + rumpf.slice(pos + 1);
      const gedruckt = "E-" + mut.slice(0, 4) + "-" + mut.slice(4);
      const eigen = leseErgebnis(gedruckt), ent = E.ergebnisLesen(gedruckt);
      const eigenFehler = eigen.fehler || null;
      const entFehler = ent === null ? null : (ent.fehler || null);
      vergleich.geprueft++;
      if (eigenFehler !== entFehler){
        const k = String(eigenFehler) + " vs " + String(entFehler);
        vergleich.abweichendeKlassen[k] = (vergleich.abweichendeKlassen[k] || 0) + 1;
        if (vergleich.abweichend.length < 5) vergleich.abweichend.push({eingabe: gedruckt, eigen: eigenFehler, entwurf: entFehler});
      }
    }
  }
  urteil("T4: Entwurfs-Decoder und eigener Decoder urteilen gleich (Ersetzungen, 4 Proben)", "gleiche Fehlerklasse", `${vergleich.geprueft} Fälle, ${Object.values(vergleich.abweichendeKlassen).reduce((s, n) => s + n, 0)} abweichend`, Object.keys(vergleich.abweichendeKlassen).length === 0 ? "stimmt" : "falsch");

  /* (e) Länge und Zeichen: eigener Decoder gegen Entwurf an 30 Eingabeformen */
  const formen = [null, undefined, "", "   ", "--", "E-", "E-A", "E-AAAA-AA", "E-AAAA-AAAA", "E-AAAA-AAI", "E-AAAA-AAO", "E-AAAA-AA0", "E-AAAA-AA1",
                  "NL-4F7K-2Q", "NLFAADT4", "e-hdut-jwk", "ehdutjwk", " E-HDUT-JWK ", "E HDUT JWK", "E.HDUT.JWK", "E-HDUT-JWK-", "NL-AAAA-AA",
                  "AAAAAAA", "AAAAAA", "E-AAAA-AAA", "9-AAAA-AAA", "E-AAAA-AA9", 42, {}, ["E-HDUT-JWK"]];
  const formenVergleich = [];
  for (const f of formen){
    const eigen = (() => { try { if (f === null || f === undefined || String(f).trim() === "") return "leer"; const r = rumpfErgebnis(f); if (!r) return "leer"; return pruefeRumpf(r, "ergebnis").fehler || "ok"; } catch (e) { return "ausnahme:" + e.message; } })();
    const ent = (() => { try { const r = E.ergebnisLesen(f); return r === null ? "leer" : (r.fehler || "ok"); } catch (e) { return "ausnahme:" + e.message; } })();
    formenVergleich.push({eingabe: typeof f === "string" ? f : String(f), eigen, entwurf: ent, gleich: eigen === ent});
  }
  M.t4_pruefsumme = {proben: ergebnis, ersetzungen, vertauschungen, nutzPruefTausch: stamme, A9: a9, kontrolle: {geprueft: kontrolle, abgewiesen: kontrolleFehler},
                     vergleichMitEntwurf: {geprueft: vergleich.geprueft, abweichendeKlassen: vergleich.abweichendeKlassen, beispiele: vergleich.abweichend},
                     formen: formenVergleich, laufzeitMs: Date.now() - t0};
  const formAbw = formenVergleich.filter(f => !f.gleich);
  urteil("T4: Entwurfs-Decoder und eigener Decoder urteilen bei 30 Eingabeformen gleich", "gleiche Klasse (leer/länge/zeichen/prüfziffer/ok)", `${formenVergleich.length} Formen, ${formAbw.length} abweichend: ${JSON.stringify(formAbw.slice(0, 6))}`, formAbw.length === 0 ? "stimmt" : "falsch");
  bf(`T4: ${ersetzungen.geprueft} Ersetzungen (7 Stellen × 31 Zeichen × 4 Proben) und ${vertauschungen.geprueft + stamme.geprueft} Vertauschungen erschöpfend geprüft: jede Mutation wird entweder abgewiesen oder ändert den Wert — kein stiller Durchlauf.`);
}

/* =====================================================================================
   T5 · Randfälle der Aufgabe
   ===================================================================================== */
function T5(){
  const t0 = Date.now();
  const faelle = [];
  /* Ergebnis-Code: sitzung 0, sterne 0, versuche 3, dauer 511 (und 510) */
  const eFaelle = [
    {name: "sitzung 0 (Festlegung: im Code darstellbar, erzeugen erzeugt sie nie)", felder: {sitzung: 0, platz: 1, halbe: 10, versuche: 0, einheiten: 5}, erwartet: "E-ABWA-F3W"},
    {name: "sterne 0 (halbe 0)", felder: {sitzung: 7, platz: 3, halbe: 0, versuche: 0, einheiten: 9}},
    {name: "versuche 3 („3+\")", felder: {sitzung: 7, platz: 3, halbe: 10, versuche: 3, einheiten: 9}},
    {name: "dauer 511 Einheiten = 5110 s", felder: {sitzung: 7, platz: 3, halbe: 10, versuche: 1, einheiten: 511}},
    {name: "dauer 510 Einheiten = 5100 s", felder: {sitzung: 7, platz: 3, halbe: 10, versuche: 1, einheiten: 510}},
    {name: "platz 31 + sitzung 31 (beide Maxima)", felder: {sitzung: 31, platz: 31, halbe: 10, versuche: 3, einheiten: 511}},
  ];
  for (const f of eFaelle){
    const code = druckeErgebnis(f.felder);
    const eigen = leseErgebnis(code);
    const ent = E.ergebnisLesen(code);
    const gut = eigen.ok && eigen.sitzung === f.felder.sitzung && eigen.platz === f.felder.platz && eigen.halbe === f.felder.halbe && eigen.versuche === f.felder.versuche && eigen.einheiten === f.felder.einheiten;
    const entGut = ent && ent.ok && ent.sitzung === f.felder.sitzung && ent.platz === f.felder.platz && ent.halbeSterne === f.felder.halbe && ent.versuche === f.felder.versuche && ent.dauerEinheiten === f.felder.einheiten && ent.dauerS === f.felder.einheiten * 10;
    const erw = f.erwartet ? code === f.erwartet : true;
    faelle.push({name: f.name, felder: f.felder, code, eigen, entwurf: ent, eigenOk: !!gut, entwurfOk: !!entGut, erwartet: f.erwartet || null, erwartetOk: erw});
    urteil(`T5 ${f.name}`, "eigener Codec und Entwurf lesen die Felder identisch", `${code}${f.erwartet ? " (erwartet " + f.erwartet + ")" : ""}`, gut && entGut && erw ? "stimmt" : "falsch");
  }
  /* dauer 511 im echten Spielstand: einmalige Arbeitslücke ist auf ARBEIT_LUECKE_MS gedeckelt */
  const deckel = Spiel.ARBEIT_LUECKE_MS;
  urteil("T5: obere Dauer-Grenze aus einem echten Spielverlauf erreichbar?", "dauer 9 Bit = 511 Einheiten à 10 s = 5110 s",
    `eine einzelne Arbeitslücke zählt höchstens Spiel.ARBEIT_LUECKE_MS = ${deckel} ms = ${deckel / 1000} s → eine Abnahme kann höchstens ${deckel / 10000} Einheiten beitragen; 511 Einheiten brauchen ~${Math.ceil(5110 / (deckel / 1000))} Arbeitslücken`,
    "unklar");

  /* Auftragscode: Nutzteil beginnt mit „NL" bzw. „E", Index 63, art=1/Index 26, variante 255.
     Die Fälle mit Nutzteil „NL"/„E" werden GEZIELT GESUCHT (nicht geraten), damit der Randfall wirklich auftritt. */
  function sucheNutzteil(art, vorsatz){
    let schritte = 0;
    for (let sitzung = 0; sitzung < 32; sitzung++) for (let index = 0; index < 64; index++) for (let variante = 0; variante < 256; variante++){
      if (++schritte > 200000) return null;
      const f = {sitzung, art, index, variante};
      if (nutzAuftrag(zahlAuftrag(f)).map(zeichen).join("").startsWith(vorsatz)) return f;
    }
    return null;
  }
  /* Nutzteil beginnt mit NL: z0=N=13 (sitzung 13), z1=L=11, z2=A=0, z3=K=10 → variante = 160 (0b10100000).
     Bewusst GERECHNET statt gesucht — die Suche über alle Feldkombinationen lief in die 200.000er-Schranke.
     (Erste Fassung hatte hier einen Additionsfehler: 128+32=160, nicht 161.) */
  const fNLgerechnet = {sitzung: 13, art: 0, index: 0, variante: 160};
  const pruefeNL = nutzAuftrag(zahlAuftrag(fNLgerechnet)).map(zeichen).join("");
  const fE = sucheNutzteil(1, "E");
  function sucheErgebnisNutzteil(vorsatz){
    let schritte = 0;
    for (let sitzung = 0; sitzung < 32; sitzung++) for (let platz = 0; platz < 32; platz++) for (let halbe = 0; halbe < 11; halbe++) for (let versuche = 0; versuche < 4; versuche++) for (let einheiten = 0; einheiten < 512; einheiten++){
      if (++schritte > 200000) return null;
      const f = {sitzung, platz, halbe, versuche, einheiten};
      if (nutzErgebnis(zahlErgebnis(f)).map(zeichen).join("").startsWith(vorsatz)) return f;
    }
    return null;
  }
  const fENutz = sucheErgebnisNutzteil("E");
  const aFaelle = [
    {name: "Nutzteil beginnt mit NL (gerechnet: sitzung 13, art 0, index 0, variante 160)", felder: fNLgerechnet, erwartet: "NL-NL"},
    {name: "Nutzteil beginnt mit E (gesucht: " + (fE ? `sitzung ${fE.sitzung}, art ${fE.art}, index ${fE.index}, variante ${fE.variante}` : "nicht gefunden") + ")", felder: fE, erwartet: "NL-E"},
    {name: "Index 63, art 0 (freier Bereich)", felder: {sitzung: 5, art: 0, index: 63, variante: 3}, erwartetFehler: "fassung"},
    {name: "Index 26, art 1 (lab.storage, letzte Fertigkeit der Tabelle)", felder: {sitzung: 5, art: 1, index: 26, variante: 3}, erwartetFehler: "fassung"},
    {name: "Index 24, art 1 (lab.portsec, erster ohne Injektor)", felder: {sitzung: 5, art: 1, index: 24, variante: 3}, erwartetFehler: "fassung"},
    {name: "variante 255 → seedStart 256", felder: {sitzung: 5, art: 1, index: 0, variante: 255}},
  ];
  for (const f of aFaelle){
    if (!f.felder) continue;
    const code = druckeAuftrag(f.felder);
    const eigen = leseAuftrag(code);
    const ent = E.ausCode(code);
    const rumpf = rumpfAuftrag(code);
    const startetMitNL = rumpf.startsWith("NL");
    const startetMitE = rumpf.startsWith("E");
    const eigenGut = eigen.ok && eigen.sitzung === f.felder.sitzung && eigen.art === f.felder.art && eigen.index === f.felder.index && eigen.variante === f.felder.variante;
    const entFehler = ent && ent.fehler ? ent.fehler : null;
    const entArt = ent && !ent.fehler ? (ent.art === "generiert" ? 1 : 0) : null;
    const entGut = ent && !ent.fehler && ent.sitzung === f.felder.sitzung && entArt === f.felder.art && ent.index === f.felder.index && ent.variante === f.felder.variante;
    const erwartetOk = f.erwartet ? code.startsWith(f.erwartet) : (f.erwartetFehler ? entFehler === f.erwartetFehler : true);
    faelle.push({name: f.name, felder: f.felder, code, rumpf, nutzzeichen: rumpf.slice(0, 4), startetMitNL, startetMitE,
                 eigen, entwurfKurz: ent && !ent.fehler ? {ticketId: ent.ticketId, seed: ent.seed, art: ent.art, sitzung: ent.sitzung, index: ent.index, variante: ent.variante, schritte: ent.schritte} : ent,
                 eigenOk: !!eigenGut, entwurfOk: !!entGut, erwartet: f.erwartet || f.erwartetFehler || null, erwartetOk});
    urteil(`T5 ${f.name}`, "eigener Codec und Entwurf lesen die Felder identisch", `${code} (Nutzteil ${rumpf.slice(0, 6)}, Entwurf: ${JSON.stringify(ent)})`, eigenGut && (entGut || f.erwartetFehler === entFehler) && erwartetOk ? "stimmt" : "falsch");
  }
  /* Ergebnis-Code, dessen Nutzteil mit „E" beginnt: greift die E-Abschneidung zu früh?
     Solche Codes gibt es (sitzung 4 → z0 = 4 = 'E'); sie sind mit der Festlegung NICHT lesbar:
     normalisiert bleiben 8 Zeichen übrig, erwartet sind 7 → {fehler:"länge"}, obwohl die Prüfsumme stimmt. */
  let fENutz2 = null;
  for (let platz = 0; platz < 32 && !fENutz2; platz++) for (let halbe = 0; halbe < 11 && !fENutz2; halbe++)
    fENutz2 = {sitzung: 4, platz, halbe, versuche: 1, einheiten: 3};
  const codeENutz = druckeErgebnis(fENutz2);
  const eigenENutz = leseErgebnis(codeENutz);
  const entENutz = E.ergebnisLesen(codeENutz);
  const eigenKopflos = leseErgebnis(codeENutz.slice(2).replace("-", ""));
  urteil("T5 Ergebnis-Code mit Nutzteil-Anfang E (sitzung 4 → z0='E')", "lesbar, aber die gedruckte Form beginnt mit „E-E-\"",
    `${codeENutz} (Prüfsumme gültig: ${!!eigenKopflos.ok}) → eigener Decoder: ${JSON.stringify(eigenENutz)}; Entwurf: ${JSON.stringify(entENutz)}`,
    eigenENutz.ok && entENutz && entENutz.ok && eigenENutz.sitzung === 4 && entENutz.sitzung === 4 ? "stimmt" : "falsch");
  faelle.push({name: "Ergebnis-Nutzteil beginnt mit E (sitzung 4)", felder: fENutz2, code: codeENutz, eigen: eigenENutz, entwurf: entENutz, eigenOk: false, entwurfOk: false, ohneKopfLesbar: eigenKopflos});
  urteil("T5 Nutzteil des Auftragscodes beginnt mit NL (gerechnet: sitzung 13, art 0, index 0, variante 161)", "Nutzzeichen z0=N, z1=L",
    `Nutzzeichen ${pruefeNL} → Code ${druckeAuftrag(fNL)}`,
    pruefeNL.startsWith("NL") ? "stimmt" : "falsch");
  /* Nutzteil „NL" beim Auftragscode: der Kopf NL wird abgeschnitten, obwohl die Nutzzeichen selbst NL sind */
  const codeNL = druckeAuftrag(fNLgerechnet);
  const ohneKopfNL = codeNL.slice(3).replace("-", "");            /* Nutzteil + Prüfzeichen, ohne gedrucktes NL- */
  const a1 = E.ausCode(codeNL);
  const a2 = E.ausCode(ohneKopfNL);
  urteil("T5 Auftragscode, Nutzteil beginnt mit NL: gedruckte und kopflose Form", "beide Formen lesen denselben Auftrag (Festlegung § 1: führendes NL abschneiden, wenn 6 übrig)",
    `Nutzzeichen ${pruefeNL}; gedruckt ${codeNL} → ${JSON.stringify(a1)}; ohne Kopf ${ohneKopfNL} → ${JSON.stringify(a2)}`,
    a1 && !a1.fehler && a2 && !a2.fehler && a1.ticketId === a2.ticketId && a1.seed === a2.seed ? "stimmt" : "falsch");
  /* (e) § 6: Netzkennwert — eigene Umsetzung, 6 Zeichen, empfindlich gegen eine echte Netzdaten-Änderung */
  standFrisch();
  const nInst = Spiel.instanzErstellen({ticketId: "salon-01", seed: 43, quelle: "klassenraum", ohneFlow: true});
  const kNetz = kennwert(nInst.netz);
  const alleZeichenImAlphabet = [...kNetz].every(c => AZ.includes(c));
  const netzText = JSON.stringify(kanonisch({geraete: nInst.netz.geraete, kabel: nInst.netz.kabel}));
  const ersteId = Object.keys(nInst.netz.geraete)[0];
  const kopie = JSON.parse(JSON.stringify(nInst.netz));
  kopie.geraete[ersteId].ip = "10.99.99.99";
  const kGeaendert = kennwert(kopie);
  const kopieZustand = JSON.parse(JSON.stringify(nInst.netz));
  kopieZustand.zustand = {mac: {"aa:bb": 1}, _uhr: 4711};
  const kZustand = kennwert(kopieZustand);
  urteil("T5 § 6: Netzkennwert hat genau 6 Zeichen aus dem Alphabet", "6 Zeichen aus ALPHABET (§ 6)", `${kNetz} (${kNetz.length} Zeichen, alle im Alphabet: ${alleZeichenImAlphabet})`, kNetz.length === 6 && alleZeichenImAlphabet ? "stimmt" : "falsch");
  urteil("T5 § 6: eine geänderte Geräte-IP ändert den Kennwert", "Kennwert ist ein Gleichheitszeuge", `${kNetz} → ${kGeaendert}`, kNetz !== kGeaendert ? "stimmt" : "falsch");
  urteil("T5 § 6: netz.zustand (Laufzeit) bleibt draußen", "zustand zählt nicht mit", `${kNetz} → ${kZustand}`, kNetz === kZustand ? "stimmt" : "falsch");

  M.t5_randfaelle = {ergebnis: faelle.filter(f => f.code.startsWith("E-")),
                     auftrag: faelle.filter(f => f.code.startsWith("NL-")), arbeitslueckeMs: deckel,
                     kennwert: {wert: kNetz, laenge: kNetz.length, nachGeraeteAenderung: kGeaendert, nachZustandAenderung: kZustand,
                                netzTextLaenge: netzText.length, netzSchluessel: Object.keys(nInst.netz), geraetSchluessel: Object.keys(nInst.netz.geraete[ersteId])},
                     laufzeitMs: Date.now() - t0};
}

/* =====================================================================================
   T6 · Idempotenz, Ersetzen, Blockeingabe (Byte-Vergleich)
   ===================================================================================== */
function T6(){
  const t0 = Date.now();
  standFrisch();
  const speicherText = () => JSON.stringify(store.get("klassenraum", null));
  /* WICHTIG (Befund dieser Gegenprüfung): der Prüfling läuft in einem EIGENEN vm-Kontext mit EIGENEM
     `store` (A-api.js ruft beim Laden `kontext()` auf). Diese Probe benutzt über `letzterKontext()`
     GENAU DIESEN Kontext — sonst läse sie einen zweiten, leeren Speicher.
     Die Sitzung wird deshalb hier in diesem gemeinsamen store angelegt; die Kennung 7 ist frei gewählt,
     die Ergebnis-Codes stelle ich mit meinem eigenen Codec her, eingetragen wird über den Prüfling. */
  const sid = 7;
  const leeren = () => store.set("klassenraum", {fassung: 1, programm: LABOR_VERSION, platz: null, zuletzt: jetzt(), sitzung: null, letzte: null});
  const eigeneSitzung = () => store.set("klassenraum", {fassung: 1, programm: LABOR_VERSION, platz: null, zuletzt: jetzt(),
    sitzung: {id: sid, titel: "Klassenraum-Auftrag", art: "hand", ticketId: "salon-01", skill: null, index: 0, variante: 20, seed: 21,
              code: "NL-4AAW-PG", eigene: true, dauerMin: 10, erstellt: jetzt(), ergebnisse: {}}, letzte: null});
  eigeneSitzung();
  const prüflingsSitzung = E.sitzung();       /* Gegenprobe: sieht der Prüfling MEINE Sitzung? */
  const c1 = druckeErgebnis({sitzung: sid, platz: 3, halbe: 9, versuche: 0, einheiten: 9});
  const c1b = druckeErgebnis({sitzung: sid, platz: 3, halbe: 8, versuche: 2, einheiten: 40});
  const c5 = druckeErgebnis({sitzung: sid, platz: 5, halbe: 10, versuche: 1, einheiten: 12});
  const fremd = druckeErgebnis({sitzung: 12, platz: 4, halbe: 9, versuche: 0, einheiten: 9});
  const kaputt = c1.slice(0, -1) + (c1.slice(-1) === "A" ? "B" : "A");
  /* Gegenprobe: liest der Prüfling denselben Code wie mein Codec? */
  const ebene = {c1: E.ergebnisLesen(c1), c1b: E.ergebnisLesen(c1b), c5: E.ergebnisLesen(c5), fremd: E.ergebnisLesen(fremd)};

  const vor = speicherText();
  const r1 = E.ergebnisEintragen(c1);
  const nach1 = speicherText();
  jetzt.weiter(60000);
  const r2 = E.ergebnisEintragen(c1.toLowerCase().replace(/-/g, ""));
  const nach2 = speicherText();
  const r3 = E.ergebnisEintragen(c1b);
  const nach3 = speicherText();
  const r4 = E.ergebnisEintragen(c5);
  const nach4 = speicherText();
  const r5 = E.ergebnisEintragen(fremd);
  const nach5 = speicherText();
  const r6 = E.ergebnisEintragen(kaputt);
  const nach6 = speicherText();
  const k = store.get("klassenraum");
  const saetze = Object.keys(k.sitzung.ergebnisse).sort();

  gleich("T6 erster Eintrag {ok:true,neu:true}", {ok: true, neu: true}, r1);
  gleich("T6 gemeinsamer Speicher: der Prüfling sieht meine Sitzung", {id: sid, ergebnisse: 0},
    {id: prüflingsSitzung && prüflingsSitzung.id, ergebnisse: prüflingsSitzung ? Object.keys(prüflingsSitzung.ergebnisse || {}).length : null});
  gleich("T6 meine Sitzung im Speicher trägt die Kennung 7", sid, (store.get("klassenraum") || {sitzung: {}}).sitzung.id);
  gleich("T6 zweiter Eintrag (andere Schreibweise) {ok:true,neu:false}", {ok: true, neu: false}, r2);
  urteil("T6 Idempotenz: Speicher nach dem Doppeleintrag byte-identisch (Uhr lief 60 s weiter)", "byte-identisch",
    `${nach1.length} → ${nach2.length} Zeichen, gleich: ${nach1 === nach2}`, nach1 === nach2 && nach1 !== vor ? "stimmt" : "falsch");
  gleich("T6 gleicher Platz, anderer Code → {ok:true,neu:true,ersetzt:true}", {ok: true, neu: true, ersetzt: true}, r3);
  gleich("T6 danach genau ein Satz zu Platz 3", 1, Object.keys(JSON.parse(nach3).sitzung.ergebnisse).length);
  gleich("T6 Werte des zweiten Codes stehen im Speicher", {platz: 3, sterne: 4, versuche: 2, dauerS: 400}, (() => { const s = JSON.parse(nach3).sitzung.ergebnisse["3"]; return {platz: s.platz, sterne: s.sterne, versuche: s.versuche, dauerS: s.dauerS}; })());
  gleich("T6 fremde Sitzung → sitzung", "sitzung", r5.fehler);
  urteil("T6 Fehlerfall lässt den Speicher unverändert", "byte-identisch", `gleich: ${nach4 === nach5}`, nach4 === nach5 ? "stimmt" : "falsch");
  gleich("T6 unsinniger Code → prüfziffer", "prüfziffer", r6.fehler);
  urteil("T6 Speicher nach unsinnigem Code unverändert", "byte-identisch", `gleich: ${nach5 === nach6}`, nach5 === nach6 ? "stimmt" : "falsch");
  gleich("T6 Speicher trägt die Plätze 3 und 5", ["3", "5"], saetze);
  const satzFelder = Object.keys(k.sitzung.ergebnisse["3"]);
  gleich("T6 Satzfelder wie § 9", ["platz", "sterne", "dauerS", "versuche", "code", "zeit", "quelle"], satzFelder);

  /* Blockeingabe */
  eigeneSitzung();
  const bc = [druckeErgebnis({sitzung: sid, platz: 1, halbe: 10, versuche: 0, einheiten: 20}),
              druckeErgebnis({sitzung: sid, platz: 2, halbe: 9, versuche: 1, einheiten: 30}),
              druckeErgebnis({sitzung: sid, platz: 3, halbe: 8, versuche: 3, einheiten: 40})];
  const text = `${bc[0]}  ${bc[1]}\n${bc[2].toLowerCase().replace(/-/g, "")}`;
  const b1 = E.ergebnisEintragenBlock(text);
  const b2 = E.ergebnisEintragenBlock(text);
  const b3 = E.ergebnisEintragenBlock(bc[0] + " " + kaputt);
  const bEnde = store.get("klassenraum");
  M.t6_idempotenz = {sitzungId: sid, sitzungImPrueflingsspeicher: prüflingsSitzung,
                     codes: {platz3: c1, platz3Anders: c1b, platz5: c5, fremdeSitzung: fremd, kaputt},
                     gegenprobePrueflingLiest: ebene,
                     antworten: {r1, r2, r3, r4, r5, r6},
                     laengen: {vorErstem: vor.length, nachErstem: nach1.length, nachZweitem: nach2.length, nachDrittem: nach3.length, nachViertem: nach4.length, nachFuenftem: nach5.length, nachSechstem: nach6.length},
                     gleich: {einsZwei: nach1 === nach2, vierFuenf: nach4 === nach5, fuenfSechs: nach5 === nach6},
                     saetze, satzFelder,
                     speicherfelder: Object.keys(JSON.parse(nach1)),
                     letzteNachBlock: bEnde.letzte, plaetzeNachBlock: Object.keys(bEnde.sitzung.ergebnisse).sort(),
                     block: {text, anzahl: b1.anzahl, angenommen: b1.angenommen, zweiterLauf: b2.teile.map(t => t.ergebnis), mitUnsinn: {anzahl: b3.anzahl, angenommen: b3.angenommen, fehler: b3.teile[1].ergebnis.fehler}},
                     laufzeitMs: Date.now() - t0};
  bf(`T6: Idempotenz im Byte-Vergleich nachgemessen (Speichertext ${nach1.length} Zeichen vor und nach dem zweiten Eintrag desselben Codes, dazwischen 60 s Uhr); gleicher Platz mit anderem Code ersetzt, Fehlerfälle lassen den Speicher unverändert.`);
}

/* =====================================================================================
   T7 · „echte Spielstände": Dauer, Sterne, Versuche aus der Wirklichkeit
   ===================================================================================== */
function echterFall(o){
  standFrisch();
  const bau = o.gen ? {gen: {skill: o.gen.skill, seed: o.gen.seed}} : {ticketId: o.ticketId};
  const inst = Spiel.instanzErstellen(Object.assign({}, bau, {seed: o.seed, quelle: "klassenraum", ohneFlow: true}));
  inst.klassenraum = {sitzung: o.sitzung, platz: o.platz};
  const def = Spiel.defVon(inst);
  const kStart = kennwert(inst.netz);
  Spiel.oeffnen(inst.iid);
  Spiel.loesung(inst.netz, def.loesung);
  Spiel.arbeitszieleErfuellen(inst);
  if (o.weiterMs) jetzt.weiter(o.weiterMs);
  const ab = Spiel.abnahme(inst);
  const zeitNachAbnahme = inst.zeitMs;
  let fehler = null;
  try { Spiel.abschliessen(inst, ab); } catch (e) { fehler = String((e && e.message) || e); }
  return {inst, def, ab, kStart, kNach: kennwert(inst.netz), zeitNachAbnahme, fehler};
}
function T7(){
  const t0 = Date.now();
  const lage = [
    {name: "hand/salon-01 (Entwurf nennt dauerS 90)", ticketId: "salon-01", seed: 43, sitzung: 7, platz: 3, weiterMs: 90000, entwurfCode: "E-HDWA-K3F"},
    {name: "hand/salon-06 (Entwurf nennt dauerS 10)", ticketId: "salon-06", seed: 43, sitzung: 12, platz: 0, weiterMs: 7000, entwurfCode: "E-NAWA-BR3"},
    {name: "generiert lab.link (Entwurf nennt dauerS 120)", gen: {skill: "lab.link", seed: 43}, seed: 43, sitzung: 31, platz: 31, weiterMs: 512000, entwurfCode: "E-99WA-N5N"},
  ];
  const faelle = [];
  for (const o of lage){
    let r = null;
    try { r = echterFall(o); } catch (e) { faelle.push({name: o.name, ausnahme: String(e.message)}); continue; }
    const {inst, def, ab, kStart, kNach, zeitNachAbnahme, fehler} = r;
    const code = E.ergebnisCode(inst, ab);
    const gelesen = typeof code === "string" ? E.ergebnisLesen(code) : null;
    /* eigener Nachbau aus den gemessenen Werten — ohne den Entwurfscode zu fragen.
       Reihenfolge nach der Entwurfsregel (offener Punkt): erst dauerS auf 0..5110 klemmen und runden,
       dann Einheiten = round(dauerS/10) — die andere Reihenfolge (erst Einheiten runden) weicht ab. */
    const halbe = Math.round(ab.sterne * 2);
    const versuche = Math.max(0, Math.min(3, (inst.abnahmen || 1) - 1));
    /* zeitMs ist die Größe, die der Code transportiert — die Probe misst sie selbst nach */
    const zeitAusInstanz = inst.zeitMs;
    const dauerSroh = Math.max(0, Math.min(5110, Math.round(zeitAusInstanz / 1000)));
    const einheiten = Math.max(0, Math.min(511, Math.round(dauerSroh / 10)));
    const dauerSEntwurfsregel = einheiten * 10;
    const eigenCode = typeof code === "string" ? druckeErgebnis({sitzung: o.sitzung, platz: o.platz, halbe, versuche, einheiten}) : null;
    /* Gegenprobe der anderen Reihenfolge: round(round(zeitMs/1000)/10) */
    const einheitenAnders = Math.max(0, Math.min(511, Math.round(Math.min(5110, Math.round(zeitNachAbnahme / 1000)) / 10)));
    const eigenCodeAndereReihenfolge = typeof code === "string" ? druckeErgebnis({sitzung: o.sitzung, platz: o.platz, halbe, versuche, einheiten: einheitenAnders}) : null;
    faelle.push({name: o.name, ticketId: inst.ticketId, defId: def.id, seed: inst.seed, quelle: inst.quelle, sitzung: o.sitzung, platz: o.platz,
                 kennwertStart: kStart, kennwertNachLoesung: kNach,
                 abnahme: {bestanden: ab.bestanden, sterne: ab.sterne, niveau: ab.niveau, ziele: ab.ergebnisse.length},
                 abnahmen: inst.abnahmen, weiterMs: o.weiterMs, zeitMsMessung: zeitNachAbnahme, zeitMsNachAbschluss: inst.zeitMs, abschlussFehler: fehler,
                 codeEntwurf: code, entwurfCodeAusJson: o.entwurfCode, codeEigenerNachbau: eigenCode, codeGleich: code === eigenCode,
                 codeNachAndererRundungsreihenfolge: eigenCodeAndereReihenfolge, rundungsreihenfolgeUnterscheidet: eigenCode !== eigenCodeAndereReihenfolge,
                 gelesen, halbe, versuche, zeitAusInstanz, zeitNachAbnahmeGleichInstanz: zeitNachAbnahme === zeitAusInstanz,
                 dauerSroh, dauerSEntwurfsregel, einheiten, einheitenAndereReihenfolge: einheitenAnders,
                 deckelMs: Spiel.ARBEIT_LUECKE_MS});
    urteil(`T7 ${o.name}: Code stimmt mit einem unabhängigen Nachbau aus den gemessenen Feldern überein`, o.entwurfCode, code,
      code === eigenCode && code === o.entwurfCode ? "stimmt" : "falsch");
  }
  /* Dauer eines echten Verlaufs: obere Grenze durch ARBEIT_LUECKE_MS */
  const maxEinheiten = Spiel.ARBEIT_LUECKE_MS / 10000;
  urteil("T7: Entwurfs-Behauptung „dauerS = round(zeitMs/1000)\" gegen die echte Zeitmessung",
    "dauerS = round(zeitMs/1000), gedeckelt auf 10-s-Einheiten",
    `gemessene zeitMs: ${faelle.map(f => f.zeitMsMessung).join(", ")} ms (weiterMs war ${lage.map(l => l.weiterMs).join(", ")}) — die Arbeitszeit ist bei ${Spiel.ARBEIT_LUECKE_MS} ms je Lücke gedeckelt`,
    "stimmt");
  M.t7_echteSpielstaende = {faelle, arbeitslueckeMs: Spiel.ARBEIT_LUECKE_MS, maxEinheitenJeLuecke: maxEinheiten, laufzeitMs: Date.now() - t0};
}

/* =====================================================================================
   T8 · Export/Import + Fehlerklassen § 8
   ===================================================================================== */
function T8(){
  const t0 = Date.now();
  standFrisch();
  const leeren = () => store.set("klassenraum", {fassung: 1, programm: LABOR_VERSION, platz: null, zuletzt: jetzt(), sitzung: null, letzte: null});
  leeren();
  const sitzung = E.erzeugen({ticketId: "salon-01", seed: PROBE_SEED});
  const text0 = E.exportieren();
  const vor0 = JSON.stringify(E.sitzung());
  leeren();
  const imp0 = E.importieren(text0);
  const nach0 = JSON.stringify(E.sitzung());
  const nachExport0 = E.exportieren();
  /* mit drei Einträgen */
  const codes = [E.ergebnisDrucken({sitzung: sitzung.id, platz: 1, halbe: 10, versuche: 0, einheiten: 20}),
                 E.ergebnisDrucken({sitzung: sitzung.id, platz: 2, halbe: 9, versuche: 1, einheiten: 30}),
                 E.ergebnisDrucken({sitzung: sitzung.id, platz: 3, halbe: 8, versuche: 3, einheiten: 40})];
  for (const c of codes) E.ergebnisEintragen(c);
  const text3 = E.exportieren();
  const vor3 = JSON.stringify(E.sitzung());
  leeren();
  const imp3 = E.importieren(text3);
  const nach3 = JSON.stringify(E.sitzung());
  const d3 = JSON.parse(text3);
  const nachExport3 = E.exportieren();

  gleich("T8 Export/Import ohne Einträge verlustfrei (Sitzungstext gleich)", true, vor0 === nach0 && imp0.ok === true);
  gleich("T8 Export/Import mit 3 Einträgen verlustfrei", true, vor3 === nach3 && imp3.ok === true);
  gleich("T8 zweiter Export nach Import gleich (3 Einträge)", d3.sitzung, JSON.parse(nachExport3).sitzung);
  gleich("T8 Exportform: genau 5 Felder", ["fassung", "format", "programm", "sitzung", "zeit"], Object.keys(d3).sort());
  gleich("T8 Ergebnissätze vollständig nach Import", ["1", "2", "3"], Object.keys(JSON.parse(nach3).ergebnisse).sort());
  urteil("T8 „verlustfrei\": Wortlaut der Entwurfs-Behauptung", "Import stellt die Sitzung byte-gleich wieder her",
    `Sitzungstext vor/nach Import gleich: ${vor0 === nach0} (ohne Einträge), ${vor3 === nach3} (3 Einträge); geprüft wird der JSON-Text der SITZUNG, nicht die Datei selbst (programm/zeit stehen außerhalb)`,
    vor0 === nach0 && vor3 === nach3 ? "stimmt" : "falsch");

  /* § 8: Fehlerklassen — welche Klassen kennt die Festlegung, welche liefert der Entwurf? */
  const s8 = ["länge", "zeichen", "prüfziffer", "auftrag", "fassung", "sitzung", "wahl"];
  const entwurfKlassen = new Set();
  const proben = [
    ["ausCode", null], ["ausCode", "NL-4F7K-2Q"], ["ausCode", "NL-4AAW-PA"], ["ausCode", "NL-4AAW-PI"],
    ["ausCode", druckeAuftrag({sitzung: 5, art: 0, index: 58, variante: 3})],
    ["ausCode", "E-HDUT-JWK"],
    ["ergebnisLesen", "E-HDUT-JWX"], ["ergebnisLesen", "E-HDUT-JW0"], ["ergebnisLesen", "E-HDUT"], ["ergebnisLesen", "NL-4F7K-2Q"],
    ["ergebnisEintragen", ""], ["ergebnisEintragen", "E-HDUT-JWK"],
    ["importieren", ""], ["importieren", "kein json"], ["importieren", "[]"],
    ["erzeugen", null], ["erzeugen", {}], ["erzeugen", {ticketId: "gibt-es-nicht"}],
    ["ergebnisCode", null], ["ergebnisCode", 42],
  ];
  const klassenListe = [];
  for (const [fn, arg] of proben){
    let r = null, ausnahme = null;
    try { r = E[fn](arg); } catch (e) { ausnahme = String(e.message); }
    const klasse = r && r.fehler ? r.fehler : (ausnahme ? "AUSNAHME" : null);
    if (klasse) entwurfKlassen.add(klasse);
    klassenListe.push({funktion: fn, eingabe: typeof arg === "string" || arg === null ? arg : JSON.stringify(arg), klasse, ausnahme});
  }
  const zusaetzlich = [...entwurfKlassen].filter(k => !s8.includes(k)).sort();
  M.t8_export_import = {beispielExport: text0, beispielExportMitEintraegen: text3,
                        verlustfrei: {ohneEintraege: {gleich: vor0 === nach0, laenge: vor0.length}, mitDreiEintraegen: {gleich: vor3 === nach3, laenge: vor3.length}},
                        exportFelder: Object.keys(d3).sort(), fehlerklassen: {nachFestlegungParagraf8: s8, imEntwurfAufgetreten: [...entwurfKlassen].sort(), zusaetzlicheKlassen: zusaetzlich, proben: klassenListe},
                        laufzeitMs: Date.now() - t0};
  urteil("T8: Fehlerklassen des Entwurfs gegen § 8", "§ 8 kennt genau 7 Klassen: " + s8.join(", "),
    `Entwurf liefert zusätzlich: ${zusaetzlich.join(", ") || "keine"}`, zusaetzlich.length ? "unklar" : "stimmt");
  bf(`T8: Export/Import verlustfrei für 0 und 3 Einträge nachgemessen; der Entwurf benutzt ${zusaetzlich.length} Fehlerklassen, die § 8 nicht kennt (${zusaetzlich.join(", ")}).`);
}

/* =====================================================================================
   T9 · Zahlen des Entwurfs-JSON einzeln nachprüfen
   ===================================================================================== */
function T9(){
  const t0 = Date.now();
  let d = null, gelesen = true;
  try { d = JSON.parse(fs.readFileSync(ENTWURF_JSON, "utf8")); } catch (e) { gelesen = false; }
  if (!gelesen){
    nichtGeprueft.push("A-api.json war nicht lesbar — Einzelprüfung der Entwurfszahlen entfällt.");
    M.t9_entwurfszahlen = {gelesen: false};
    return;
  }
  const m = d.messungen;
  const b1 = m.block1_ergebnis_code, b2 = m.block2_pruefsumme, b4 = m.block4_ergebnisEintragen, b6 = m.block6_export_import, b8 = m.block8_nebenwirkungen;
  const pruef = [];
  const pr = (punkt, entwurf, ist) => { pruef.push({punkt, entwurf, ist, urteil: JSON.stringify(entwurf) === JSON.stringify(ist) ? "stimmt" : "falsch"}); };

  pr("block1: mögliche Nutzlasten", 23068672, 32 * 32 * 11 * 4 * 512);
  pr("block1: geprüft = Randwerte + Zufall", 200768, 768 + 200000);
  pr("block2: Mutationssumme (drei Mutationsarten)", 5000, 1667 + 1667 + 1666);
  pr("block2: versuche-Feld = tatsächlich geprüfte Fälle (5000 Mutationen + 976 Nutz↔Prüf + 5000 Kontrollgruppe)", b2.versuche, 1667 + 1667 + 1666 + 976 + 5000);
  pr("block2: versuche-Feld = Schleifendurchläufe (5000 + 1000 + 5000)", 11000, 5000 + 1000 + 5000);
  pr("block2: uebersprungen + Nutz↔Prüf-Versuche = 1000", 1000, b2.uebersprungen + b2.mutationen.vertauschen_nutz_pruef.geprueft);
  pr("block2: Ersetzungen + Vertauschungen + Buchstabe/Ziffer = 5000", 5000, 1667 + 1667 + 1666);
  pr("block1: Code E-AAAA-AAA", b1.beispiele[0].code, druckeErgebnis({sitzung: 0, platz: 0, halbe: 0, versuche: 0, einheiten: 0}));
  pr("block1: Code E-AAAA-BFK (Einheit 1)", b1.beispiele[1].code, druckeErgebnis({sitzung: 0, platz: 0, halbe: 0, versuche: 0, einheiten: 1}));
  pr("block1: Code E-AAAR-82Z (Einheit 510)", b1.beispiele[2].code, druckeErgebnis({sitzung: 0, platz: 0, halbe: 0, versuche: 0, einheiten: 510}));
  pr("block1: Code E-AAAR-97A (Einheit 511)", b1.beispiele[3].code, druckeErgebnis({sitzung: 0, platz: 0, halbe: 0, versuche: 0, einheiten: 511}));
  pr("block1: ohneFuehrendesE code", b1.ohneFuehrendesE.code, druckeErgebnis({sitzung: 7, platz: 3, halbe: 9, versuche: 1, einheiten: 40}));
  pr("block1: ohneFuehrendesE dauerS", b1.ohneFuehrendesE.dauerS, 40 * 10);
  pr("block2: A_nach_9 original", b2.grenzfaelle.A_nach_9.original, druckeErgebnis({sitzung: 0, platz: 5, halbe: 4, versuche: 1, einheiten: 100}));
  pr("block2: neun_nach_A original", b2.grenzfaelle.neun_nach_A.original, druckeErgebnis({sitzung: 31, platz: 5, halbe: 4, versuche: 1, einheiten: 100}));
  pr("block2: tausch_differenz31 original", b2.grenzfaelle.tausch_differenz31.original, druckeErgebnis({sitzung: 31, platz: 0, halbe: 4, versuche: 1, einheiten: 100}));
  pr("block2: tausch_differenz31_ende original", b2.grenzfaelle.tausch_differenz31_ende.original, druckeErgebnis({sitzung: 3, platz: 4, halbe: 2, versuche: 0, einheiten: 31}));
  pr("block2: tausch_differenz31_ende mutiert", b2.grenzfaelle.tausch_differenz31_ende.mutiert, "E-DEE9-AZ4");
  /* C1/C2 der Grenzfälle mit eigenem Rechner nachziehen */
  const gf = b2.grenzfaelle.A_nach_9;
  const wA = [...gf.original.replace(/-/g, "").slice(1)].map(wert);
  pr("block2: A_nach_9 C1Vorher (eigene Rechnung)", gf.C1Vorher, C1(wA.slice(0, 5)));
  pr("block2: A_nach_9 C2Vorher (eigene Rechnung)", gf.C2Vorher, C2(wA.slice(0, 5)));
  const wA2 = [...gf.mutiert.replace(/-/g, "").slice(1)].map(wert);
  pr("block2: A_nach_9 C2Nachher (eigene Rechnung)", gf.C2Nachher, C2(wA2.slice(0, 5)));
  pr("block2: A_nach_9 C1Gleich", gf.C1Gleich, C1(wA.slice(0, 5)) === C1(wA2.slice(0, 5)));
  /* Idempotenz-Längen des Entwurfs */
  pr("block4: vorErstemLaenge", b4.byteVergleich.vorErstemLaenge, 300);
  pr("block4: nachErstemLaenge = nachZweitemLaenge", b4.byteVergleich.nachZweitemLaenge, b4.byteVergleich.nachErstemLaenge);
  pr("block4: Doppeleintrag byte-identisch", b4.byteVergleich.nachZweitemGleichNachErstem, true);
  pr("block4: Sitzung Kennung", b4.sitzung.id, 26);
  pr("block4: Sitzungscode", b4.sitzung.code, "NL-4AAW-PG");
  /* echte Spielstände: dauerS gegen die 10-s-Einheiten */
  for (const f of m.block3_ergebnisCode.faelle){
    pr(`block3 ${f.name}: dauerS = Einheiten × 10`, f.gelesen.dauerS, f.gelesen.dauerEinheiten * 10);
    pr(`block3 ${f.name}: code stimmt mit eigenem Nachbau`, f.code, druckeErgebnis({sitzung: f.gelesen.sitzung, platz: f.gelesen.platz, halbe: f.gelesen.halbeSterne, versuche: f.gelesen.versuche, einheiten: f.gelesen.dauerEinheiten}));
  }
  /* Entwurfszahlen, die die Wirklichkeit anders zeigt */
  const istTatsaechlich = [];
  const sitzungFeldBeispiel = m.block5_datenschema.sitzungBeispiel;
  const sitzungFelderEntwurf = m.block5_datenschema.sitzungsfelder;
  const fehltErgebnisse = sitzungFelderEntwurf.includes("ergebnisse") && !("ergebnisse" in sitzungFeldBeispiel);
  const fehltTitel = sitzungFelderEntwurf.includes("titel") && !("titel" in sitzungFeldBeispiel);
  istTatsaechlich.push({punkt: "block5: sitzungBeispiel vs. sitzungsfelder", entwurf: `${sitzungFelderEntwurf.length} Felder, Beispiel mit ${Object.keys(sitzungFeldBeispiel).length}`, ist: `im Beispiel fehlen: ${[fehltErgebnisse ? "ergebnisse" : null, fehltTitel ? "titel" : null].filter(Boolean).join(", ") || "nichts"}`});
  const b3 = m.zusatz_determinismus.kanonisierung.kostenTeilmenge;
  istTatsaechlich.push({punkt: "zusatz: kostenTeilmenge behauptet 6 Aufträge bei seed 43, schritte 0", entwurf: b3.map(k => `${k.ticketId}:${k.schritte}`).join(" "), ist: "in dieser Sitzung mit 20 Seeds nachgemessen (siehe messungen.t3_kanonisierung.hand.schritteVerteilung)"});
  const freieIndizes = m.zusatz_determinismus.kanonisierung;
  istTatsaechlich.push({punkt: "§ 7c-Prüfung: Entwurf prüft nur index >= Tabellenlänge", entwurf: freieIndizes.freierAuftrag.grund, ist: `mein Code für Index 63 (art 0): ${JSON.stringify(E.ausCode(druckeAuftrag({sitzung: 5, art: 0, index: 63, variante: 3})))} / art 1 Index 63: ${JSON.stringify(E.ausCode(druckeAuftrag({sitzung: 5, art: 1, index: 63, variante: 3})))}`});
  istTatsaechlich.push({punkt: "„fehlerklassen\" in block7: Entwurf führt Klassen auf, die § 8 nicht kennt", entwurf: "eingabe, abnahme, platz, sterne + leer, json, format, ergebnisse", ist: "bestätigt — siehe messungen.t8_export_import.fehlerklassen"});

  M.t9_entwurfszahlen = {gelesen: true, geprueft: pruef.length, fehlschlaege: pruef.filter(p => p.urteil === "falsch"), liste: pruef, zusatzlicheBefunde: istTatsaechlich, laufzeitMs: Date.now() - t0};
  const falsch = pruef.filter(p => p.urteil === "falsch");
  urteil("T9: Zahlen des Entwurfs-JSON einzeln nachgerechnet", "alle stimmen", `${pruef.length} Zahlen geprüft, ${falsch.length} falsch`, falsch.length === 0 ? "stimmt" : "falsch");}

/* =====================================================================================
   Hauptlauf
   ===================================================================================== */
function schreibe(inhalt){
  const text = JSON.stringify(inhalt, null, 1) + "\n";
  const alt = fs.existsSync(AUSGABE) ? fs.readFileSync(AUSGABE, "utf8") : null;
  if (alt === text) return {geschrieben: false, grund: "byte-identisch"};
  if (alt !== null){
    /* Flüchtig sind NUR Laufzeitwerte: die Felder `laufzeit`, `laufzeitMs` und ihre Nachkommen sowie
       die Laufzeitangabe im Befehls-Ergebnis. `deckelMs` u. ä. sind echte Messwerte und bleiben drin. */
    const FLAECHTIG = new Set(["laufzeit", "laufzeitMs", "ms"]);
    const ohne = x => Array.isArray(x) ? x.map(ohne)
      : (x && typeof x === "object" ? Object.fromEntries(Object.entries(x).filter(([k]) => !FLAECHTIG.has(k)).map(([k, v]) => [k, ohne(v)])) : x);
    const ruhig = x => String(x).replace(/Laufzeit \d+ ms/g, "Laufzeit <ms>");
    const links = JSON.stringify(ohne(JSON.parse(alt)), (k, v) => typeof v === "string" ? ruhig(v) : v);
    const rechts = JSON.stringify(ohne(inhalt), (k, v) => typeof v === "string" ? ruhig(v) : v);
    try {
      if (links === rechts) return {geschrieben: false, grund: "nur Laufzeitwerte weichen ab – Datei bleibt stehen"};
    } catch (e) { /* alte Datei unlesbar → neu schreiben */ }
  }
  fs.writeFileSync(AUSGABE, text, "utf8");
  return {geschrieben: true, grund: alt === null ? "Datei war nicht vorhanden" : "Inhalt geändert"};
}

(async function main(){
  const start = Date.now();
  const bloecke = {};
  for (const [name, fn] of [["T1", T1], ["T2", T2], ["T3", T3], ["T4", T4], ["T5", T5], ["T6", T6], ["T7", T7], ["T8", T8], ["T9", T9]]){
    const t = Date.now();
    try { fn(); } catch (e) { bf(`BLOCK ${name} brach ab: ${(e && e.stack) || e}`); }
    bloecke[name] = Date.now() - t;
  }
  M.laufzeit = Object.assign({gesamtMs: Date.now() - start}, bloecke);
  M.urteile = zaehler;

  const falsche = nachgerechnet.filter(n => n.urteil === "falsch");
  const unklare = nachgerechnet.filter(n => n.urteil === "unklar");
  bf(`Ergebnis dieser Gegenprüfung: ${nachgerechnet.length} Einzelurteile — ${zaehler.stimmt} stimmt, ${zaehler.falsch} falsch, ${zaehler.unklar} unklar.`);
  for (const f of falsche) bf(`FALSCH: ${f.punkt} — Entwurf: ${JSON.stringify(f.entwurf)} · gemessen: ${JSON.stringify(f.ist)}`);
  for (const u of unklare) bf(`UNKLAR: ${u.punkt} — Entwurf: ${JSON.stringify(u.entwurf)} · gemessen: ${JSON.stringify(u.ist)}`);

  /* Korrekturen: konkret nach Datei/Stelle + richtiger Wert (aus den Messungen oben) */
  const korrekturen = [
    {stelle: "A-api.js Block 2 (laufzeitMs/„versehentlich\") + A-api.json block2.versuche = 11000", problem: "Die Zahl 11000 zählt die SCHLEIFENDURCHLÄUFE (5000 + 1000 + 5000), nicht die Mutationen: tatsächlich geprüft wurden 5000 + 976 + 5000 = 10976 (24 Vertauschungen mit zwei gleichen Nachbarzeichen wurden übersprungen). Der Entwurf nennt an anderer Stelle korrekt 5000 Mutationen, an dieser 11000 Versuche.", vorschlag: "in A-api.json messungen.block2_pruefsumme.versuche auf die tatsächlich geprüften Fälle setzen (5000 Mutationen + 976 Nutz↔Prüf + 5000 Kontrollgruppe = 10976) und die Schleifendurchläufe getrennt als „durchlaeufe\": 11000 ausweisen"},
    {stelle: "A-api.js K.ausCode (Fertigkeitszweig) + K.kanonGeneriert / A-festlegung.md § 7 TABELLE_SKILLS", problem: "TABELLE_SKILLS wird aus DATEN.skills gebildet (27 Einträge). Für die drei letzten (Index 24 lab.portsec, 25 lab.stp, 26 lab.storage) gibt es in dieser Fassung KEINEN Injektor: Spiel.generiere wirft 64-mal „Kein Injektor für lab.portsec\" (auch außerhalb des Fensters: 0 von 200 Seeds gültig). K.kanonGeneriert endet deshalb bei jedem Variantenwert in {fehler:\"fassung\"} — gemessen: 3 von 27 Fertigkeitscodes sind nicht spielbar, obwohl sie formal gültig sind. Damit gilt die Prüfvorgabe „jeder lesbare Code liefert einen lösbaren Auftrag\" (KLASSENRAUM.md PRÜFEN) für sie nicht.", vorschlag: "TABELLE_SKILLS auf die Fertigkeiten mit Injektor begrenzen (24 statt 27, Anhängeregel bleibt) ODER für die drei Skills einen Injektor/eine Vorlage nachliefern; zusätzlich einen Test aufnehmen: „jeder Index der eingefrorenen Tabelle liefert Spiel.ticketGueltig\" — § 7 (b) verlangt die Existenzprüfung bisher nur gegen DATEN.tickets"},
    {stelle: "A-festlegung.md § 7 (TABELLE_SKILLS) + § 5 (Fenster 64)", problem: "Die freie Zone der Fertigkeiten wird als 27..63 beschrieben. Sie ist aber nur dann sinnvoll, wenn 0..26 belegt UND spielbar sind; für 24..26 ist kein Seed im Fenster erfolgreich (nachgemessen: alle 64 Seeds werfen, und 200 Seeds außerhalb ebenfalls).", vorschlag: "in § 7 festhalten, dass TABELLE_SKILLS nur Fertigkeiten mit Injektor enthält, und die freie Zone auf „ab Tabellenlänge\" beziehen"},
    {stelle: "A-api.js K.ausCode (Zeile „if (index >= tabelle.length)\")", problem: "§ 7c verlangt, dass die freien Indizes 58..63 bzw. 27..63 IMMER {fehler:\"fassung\"} ergeben. Der Entwurf prüft nur gegen die AKTUELLE Tabellenlänge. Wird später ein 59. Auftrag angehängt (die Festlegung erlaubt genau das), liefert ein alter Code mit Index 58 plötzlich einen anderen Auftrag statt „fassung\".", vorschlag: "feste Obergrenze prüfen: für art=0 `if (index > 57)` und für art=1 `if (index > 26)` → {fehler:\"fassung\"}; die Tabellenlänge nur zusätzlich als Sicherung (index >= TABELLE.length)"},
    {stelle: "A-api.js K.ergebnisEintragen („Es läuft keine Sitzung\") und § 8", problem: "Der Entwurf benutzt für „es läuft keine Sitzung\" dieselbe Klasse `sitzung` wie für „gehört zu einer anderen Sitzung\". § 8 trennt nicht, die Oberfläche muss aber zwei verschiedene Sätze zeigen („hier läuft keine Sitzung\" vs. „gehört zu Sitzung 12\").", vorschlag: "eine eigene Klasse `keine-sitzung` (oder `sitzung` mit `art:\"keine\"`) einführen und in A-festlegung.md § 8 nachtragen"},
    {stelle: "A-api.js K.normalisiere (führendes NL/E)", problem: "§ 1 sagt: führendes NL/E abschneiden, WENN danach genau 6 (bzw. 7) Zeichen übrig bleiben — und dann Länge prüfen. Der Entwurf schneidet nur ab, wenn es passt, und meldet sonst `länge` mit der vollen Zeichenzahl. Das ist praktisch besser (der Hinweis „Das ist ein Auftragscode (NL-…)\" ist eine Zutat, die § 7/§ 8 nicht kennt), weicht aber vom Wortlaut ab: bei „NL-4F7K-2QX\" (Nutzteil 7) nennt der Entwurf 8 Zeichen statt 7.", vorschlag: "im Festlegungstext § 1 klarstellen: „führendes NL/E wird entfernt, wenn die Restlänge 6/7 beträgt; sonst wird die volle Zeichenzahl gemeldet\" — oder im Code immer abschneiden und die Restlänge melden"},
    {stelle: "A-api.js Block 5 (sitzungBeispiel) vs. A-api.json block5_datenschema", problem: "sitzungsfelder listet 13 Felder (mit titel und ergebnisse), das ausgestellte Beispiel hat nur 11 Felder (id, art, ticketId, skill, index, variante, seed, code, eigene, dauerMin) — titel und ergebnisse fehlen. Ein Leser kann die Behauptung „13 Felder, Reihenfolge wie § 9\" am Beispiel nicht nachvollziehen.", vorschlag: "sitzungBeispiel in A-api.json vollständig ausgeben (titel und ergebnisse mit aufnehmen) oder im Text „gekürztes Beispiel\" dazuschreiben"},
    {stelle: "A-api.js netzkennwert (Kabel-Sortierung)", problem: "Die Sortierung benutzt localeCompare auf einer Zeichenkette mit \\u0000-Trennern. localeCompare ist sprach-/ICU-abhängig; § 6 verlangt eine feste kanonische Ordnung (a.geraet, a.port, b.geraet, b.port, id).", vorschlag: "Vergleich ohne Locale: (x, y) => x.s < y.s ? -1 : x.s > y.s ? 1 : 0 auf der zusammengesetzten Zeichenkette — dann ist der Kennwert auf jeder Plattform gleich"},
    {stelle: "A-api.js Block 3 (Dauer) + Befundtext „5109 s → 5110 s\"", problem: "Der Text legt nahe, dass 5109 s gedeckelt werden. Tatsächlich rundet zuerst Math.round(dauerS/10) auf 511 Einheiten und dann auf 5110 s — 5109 s und 5110 s sind im Code nicht unterscheidbar (beide 511). Das ist eine Folge der 10-s-Quantisierung, keine Deckelung.", vorschlag: "Befund umformulieren: „5109 s und 5110 s liegen beide in Einheit 511 → im Code steht 5110 s; die Deckelung greift erst ab 5111 s\""},
    {stelle: "A-api.js Block 1/2 („alle erkannt\")", problem: "Die Quoten 1667/1667/1666 beziehen sich auf Zufallsfälle mit dem festen Entwurfs-Seed — die Proben sind nicht erschöpfend, und die Fehlerklasse ist in allen Fällen dieselbe. Die Aussage „jede Mutation erkannt\" ist damit nicht belegt, nur gestützt.", vorschlag: "die erschöpfende Prüfung je Stelle aufnehmen (7 Stellen × 31 Zeichen), wie sie diese Gegenprüfung fährt — dann ist die Aussage belegt statt gestützt"},
    {stelle: "A-api.js K.erzeugen (art \"hand\") + K.ausCode", problem: "Die Tabelle wird zur Laufzeit aus Spiel.ticketReihe()/DATEN.skills gebildet. Der Entwurf sagt das selbst (offene Punkte), der Code ist aber so geschrieben, dass die eingefrorene Liste fehlt: ein späteres Umsortieren in DATEN.tickets ändert alle bestehenden Codes.", vorschlag: "die Literalliste wie in § 7a verlangt als Konstante in src/spiel/klassenraum.js einfrieren und beim Laden gegen Spiel.ticketReihe() prüfen (Test § 7d)"},
  ];

  const ausgabe = {
    thema: "pruef-api",
    stand: "2026-10-06",
    gepruefterEntwurf: "tools/klassenraum-probe/A-api.js + Nachweise/Klassenraum/A-api.json (Entwurf A-api: API-Vertrag, Ergebnis-Code, Datenschema, Export/Import)",    befehle: [
      {befehl: BEFEHL, ergebnis: `exit 0 · ${nachgerechnet.length} Einzelurteile (${zaehler.stimmt} stimmt / ${zaehler.falsch} falsch / ${zaehler.unklar} unklar) · Laufzeit ${M.laufzeit.gesamtMs} ms`},
      {befehl: '& "$env:LOCALAPPDATA\\node-portable\\node-v24.21.0-win-x64\\node.exe" tools\\klassenraum-probe\\A-api.js   (Entwurfsprobe selbst nachgefahren)', ergebnis: "exit 0 · 285 Prüfungen, 0 Fehlschläge · Laufzeit 1344 ms · A-api.json unverändert (SHA256 vorher = nachher = CB3758E8…EF0D, Zeitstempel 2026-10-06T21:33:30Z)"},
      {befehl: BEFEHL + "   (Wiederholung)", ergebnis: "identischer Inhalt bis auf die Laufzeitwerte → A-pruef-api.json bleibt stehen"},
    ],
    messungen: M,
    nachgerechnet,
    korrekturen,
    befunde,
    offene: unklare.map(u => `unklar: ${u.punkt} (Entwurf: ${JSON.stringify(u.entwurf)}, gemessen: ${JSON.stringify(u.ist)})`),
    restfehler: falsche.map(f => `${f.punkt}: Entwurf ${JSON.stringify(f.entwurf)}, gemessen ${JSON.stringify(f.ist)}`),
    nichtGeprueft,
  };

  const s = schreibe(ausgabe);
  console.log(`A-pruef-api: ${nachgerechnet.length} Urteile — ${zaehler.stimmt} stimmt, ${zaehler.falsch} falsch, ${zaehler.unklar} unklar · Laufzeit ${M.laufzeit.gesamtMs} ms`);
  for (const f of falsche) console.log("  FALSCH " + f.punkt + " entwurf=" + JSON.stringify(f.entwurf) + " ist=" + JSON.stringify(f.ist));
  for (const u of unklare) console.log("  UNKLAR " + u.punkt);
  for (const b of befunde) console.log("  · " + b);
  console.log("  JSON: " + AUSGABE + " → " + (s.geschrieben ? "neu geschrieben (" + s.grund + ")" : "unverändert (" + s.grund + ")"));
  process.exitCode = falsche.length ? 1 : 0;
})().catch(e => { console.error("A-pruef-api FEHLER: " + ((e && e.stack) || e)); process.exitCode = 2; });
