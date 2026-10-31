"use strict";
/* SUBNETTING-LERNSPIELE (src/ui/subnetz-werkzeuge.js · spiele, Runde 7 / W4)
   Vertrag: docs/entwicklung/Entwurf – Runde 7 (Abteilung Subnetting).md § 2.4, § 8.

   Geprüft wird, was der Vertrag verlangt: genau drei Spiele, deterministische Aufgaben aus dem Seed,
   lerntaugliche Punktelogik (richtig > falsch, Serie, kein Fehlerbonus), die Ergebnisform
   {id, punkte, richtig, falsch, serie, dauerSek, aufgaben[]} und die Verbuchung ausschließlich über
   Spiel.subnetz.antwort (mit genau EINER Rundenbuchung {spiel:{id, punkte}}). Die Spiele laufen in
   einem eigenen vm-Bereich mit nachgebildetem DOM und steuerbarer Uhr (Muster: tests/ui-training.test.js).
   Verbuchung läuft trocken (Spiel._trocken) – der echte Lernstand bleibt unberührt.
   Allein lauffähig:  node tests/subnetz-spiele.test.js */

function sgHatRequire(){ try { return typeof require === "function"; } catch (e) { return false; } }
const SG_KANN_LADEN = (() => {
  try { return sgHatRequire() && typeof document === "undefined" && typeof Spiel === "object" && Spiel !== null; } catch (e) { return false; }
})();
const SG_ZUSATZ = SG_KANN_LADEN ? "" : " (kein require im Testbereich – nur allein lauffähig: node tests/subnetz-spiele.test.js)";

/* ---------------- Allein lauffähig ---------------- */
function sgAlleinLaden(){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const W = path.resolve(__dirname, ".."), SRC = path.join(W, "src");
  const SCH = [["kern", ["basis.js", "netz.js"]], ["@lernmotor", []], ["modell", ["geraete.js"]], ["sim", ["engine.js"]],
               ["cli", ["parser.js"]], ["daten", ["basis.js"]], ["spiel", ["zustand.js"]]];
  const LM = [path.resolve(W, "..", "FISI-Spielhalle", "src", "lernmotor.js"), path.join(W, "fremd", "lernmotor.js")].find(f => fs.existsSync(f));
  const KOPF = /^\/\*\s*=+[\s\S]*?=+\s*\*\/\s*/;
  const code = ['"use strict"; const LABOR_VERSION = "test";'];
  for (const [ordner, kopf] of SCH) {
    if (ordner === "@lernmotor") {
      let t = fs.readFileSync(LM, "utf8");
      if (LM.includes("fremd")) t = t.replace(KOPF, "");
      code.push(t);
      continue;
    }
    const d = path.join(SRC, ordner), alle = fs.readdirSync(d).filter(n => n.endsWith(".js")).sort();
    for (const n of [...kopf.filter(x => alle.includes(x)), ...alle.filter(x => !kopf.includes(x))]) code.push(fs.readFileSync(path.join(d, n), "utf8"));
  }
  code.push(fs.readFileSync(path.join(__dirname, "harness.js"), "utf8"));
  code.push(fs.readFileSync(__filename, "utf8"));
  code.push("testsAusfuehren();");
  const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename});
  let ergebnisse;
  try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "subnetz-spiele.test.js"}); }
  catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
  const rot = ergebnisse.filter(e => !e.ok);
  for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
  console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
  process.exit(rot.length ? 1 : 0);
}
if (typeof Spiel === "undefined" && typeof document === "undefined" && sgHatRequire()) sgAlleinLaden();

/* ================= DOM-Ersatz ================= */
function sgKnoten(tag){
  const el = {
    tag, kinder: [], attrs: {}, className: "", _text: "", eltern: null, listeners: {},
    append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.eltern = el; el.kinder.push(x); } },
    replaceChildren(...k){ el.kinder = []; el.append(...k); },
    remove(){ if (el.eltern) el.eltern.kinder = el.eltern.kinder.filter(x => x !== el); },
    setAttribute(k, v){ el.attrs[k] = String(v); },
    getAttribute(k){ return el.attrs[k]; },
    addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
    click(){ for (const fn of (el.listeners.click || []).slice()) fn({currentTarget: el}); },
    querySelector(sel){ return sgFinde(el, sel)[0] || null; },
    querySelectorAll(sel){ return sgFinde(el, sel); },
    set textContent(v){ el._text = String(v); el.kinder = []; },
    get textContent(){ return el.kinder.length ? el.kinder.map(sgText).join("") : el._text; },
    get hidden(){ return el.attrs.hidden !== undefined; },
  };
  return el;
}
function sgKlassen(el){ return String(el.className || el.attrs.class || "").split(/\s+/).filter(Boolean); }
function sgFinde(el, sel){
  const klasse = String(sel).replace(/^\./, ""), treffer = [];
  const lauf = k => { for (const x of k.kinder) if (x && typeof x === "object" && x.tag) { if (sgKlassen(x).includes(klasse)) treffer.push(x); lauf(x); } };
  lauf(el);
  return treffer;
}
function sgText(k){ return k == null ? "" : typeof k === "string" ? k : k.textContent; }
function sgAlle(el, tag){
  const raus = [];
  const lauf = k => { for (const x of k.kinder) if (x && typeof x === "object" && x.tag) { if (x.tag === tag) raus.push(x); lauf(x); } };
  lauf(el);
  return raus;
}
function sgH(tag, attrs = {}, ...kinder){
  const el = sgKnoten(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...kinder.flat(Infinity));
  return el;
}
const sgAlleKnoepfe = el => (el && el.querySelectorAll(".knopf")) || [];
const sgKnopf = (el, text) => sgAlleKnoepfe(el).find(b => String(b.textContent).includes(text)) || null;
function sgFeuern(el, art, daten = {}){
  const ev = Object.assign({currentTarget: el, target: el}, daten);
  for (const fn of (el.listeners[art] || []).slice()) fn(ev);
}

/* ================= Prüfstand mit steuerbarer Uhr ================= */
function sgPruefstand(){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const uhren = [];
  let naechsteUhr = 0;
  const setTimeoutF = (fn, ms) => { const id = ++naechsteUhr; uhren.push({id, fn, ms: Number(ms) || 0}); return id; };
  const clearTimeoutF = id => { const i = uhren.findIndex(u => u.id === id); if (i >= 0) uhren.splice(i, 1); };
  const bereich = {
    UI: {}, h: sgH, console, Spiel,
    document: {createElement: sgKnoten, createTextNode: t => ({tag: "#text", textContent: String(t)}), querySelector: () => null},
    setTimeout: setTimeoutF, clearTimeout: clearTimeoutF,
  };
  vm.createContext(bereich);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "src", "ui", "subnetz-werkzeuge.js"), "utf8"), bereich, {filename: "ui/subnetz-werkzeuge.js"});
  return {
    UI: bereich.UI,
    uhren,
    uhrLauf(ms, max = 200){
      let n = 0;
      for (let i = 0; i < max; i++) {
        const stelle = uhren.findIndex(u => u.ms === ms);
        if (stelle < 0) break;
        const u = uhren.splice(stelle, 1)[0];
        u.fn();
        n += 1;
      }
      return n;
    },
  };
}
function sgKapsel(fn){
  const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
  const altAntwort = typeof Spiel.subnetz === "object" && Spiel.subnetz ? Spiel.subnetz.antwort : null;
  const buchungen = [];
  try {
    Spiel._trocken = true; Spiel._lz = {};
    Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
    Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
    if (altAntwort) {
      Spiel.subnetz.antwort = function(aufgabe, richtig, optionen){
        buchungen.push({aufgabe, richtig: !!richtig, optionen: Object.assign({}, optionen)});
        return altAntwort.apply(Spiel.subnetz, arguments);
      };
    }
    return fn(buchungen);
  } finally {
    if (altAntwort) Spiel.subnetz.antwort = altAntwort;
    Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
  }
}
function sgSpiel(p, id, opts){
  const c = sgKnoten("div");
  const griff = p.UI.subnetzwerkzeuge.spiele.starten(c, id, opts || {});
  return {c, griff, root: c.kinder[0] || null};
}
function pruefeErgebnisForm(e, id){
  erwarte.wahr(e && typeof e === "object", id + ": kein Ergebnis");
  erwarte.gleich(e.id, id, id + ": falsche ID im Ergebnis");
  for (const feld of ["punkte", "richtig", "falsch", "serie", "dauerSek"]) {
    erwarte.wahr(typeof e[feld] === "number" && Number.isFinite(e[feld]), id + ": " + feld + " ist keine Zahl");
  }
  erwarte.wahr(e.richtig >= 0 && e.falsch >= 0 && e.dauerSek >= 0, id + ": Zähler sind plausibel");
  erwarte.wahr(Array.isArray(e.aufgaben) && e.aufgaben.length > 0, id + ": aufgaben fehlt");
  for (const a of e.aufgaben) {
    erwarte.wahr(a && typeof a.frage === "string" && a.frage.length > 0, id + ": Aufgabe ohne Frage");
    erwarte.wahr(typeof a.richtig === "boolean", id + ": richtig ist kein Wahrheitswert");
    erwarte.wahr(typeof a.soll === "string" && a.soll.length > 0, id + ": Lösung fehlt");
  }
}
/* Antwort der laufenden Präfix-Blitz-Karte aus Frage und Rechenkern bestimmen (kein Raten). */
function praefixAntwort(frage){
  if (/^Welche Maske gehört zu Präfix/.test(frage)) {
    const p = Number((/Präfix \/(\d+)/.exec(frage) || [])[1]);
    return Spiel.subnetz.praefixZuMaske(p);
  }
  if (/^Welcher Präfix gehört zur Maske/.test(frage)) {
    const maske = (/Maske ([\d.]+)\?/.exec(frage) || [])[1];
    return "/" + Spiel.subnetz.maskeZuPraefix(maske);
  }
  if (/nutzbare Hosts hat Präfix/.test(frage)) {
    const p = Number((/Präfix \/(\d+)/.exec(frage) || [])[1]);
    return String(Spiel.subnetz.rechnen("192.168.0.0", p).hosts);
  }
  return null;
}
/* Weiter-Weg nach einer Antwort (S11): der Knopf „Weiter“ ist immer da; die Auto-Zeit (1,8 s)
   greift nur bei richtiger Antwort. Beides wird hier gemessen statt angenommen. */
function praefixWeiter(p, root){
  const weiter = root.querySelector(".sg-weiter");
  if (weiter) { weiter.click(); return "knopf"; }
  p.uhrLauf(1800);
  return "uhr";
}
function praefixAntworten(p, root, richtig, anzahl){
  for (let i = 0; i < anzahl; i++) {
    const frage = root.querySelector(".sg-frage").textContent;
    const soll = praefixAntwort(frage);
    erwarte.wahr(typeof soll === "string" && soll.length > 0, "Frage ist aus Lage und Rechenkern lösbar: " + frage);
    const optionen = root.querySelectorAll(".sg-option");
    erwarte.gleich(optionen.length, 4, "vier Antwortkarten");
    const ziel = richtig
      ? optionen.find(o => String(o.textContent) === soll)
      : optionen.find(o => String(o.textContent) !== soll);
    erwarte.wahr(!!ziel, richtig ? "richtige Karte vorhanden" : "falsche Karte vorhanden");
    ziel.click();
    praefixWeiter(p, root);
  }
}
function netzSpielZeichnen(p, root){
  const regel = root.querySelector(".sg-regel").textContent;
  const m = /Basis: ([\d.]+)\/(\d+)/.exec(regel);
  erwarte.wahr(!!m, "Basisnetz steht in der Regelzeile");
  return {praefix: Number(m[2])};
}
function netzSortieren(p, root, richtig){
  const {praefix} = netzSpielZeichnen(p, root);
  const adressen = root.querySelectorAll(".sg-adresse-name").map(n => n.textContent).filter((x, i, a) => a.indexOf(x) === i);
  for (const ip of adressen) {
    const chip = root.querySelectorAll(".sg-adresse").find(c => {
      const name = c.querySelector(".sg-adresse-name");
      return name && name.textContent === ip;
    });
    erwarte.wahr(!!chip, "Adresschip " + ip + " vorhanden");
    chip.click();
    const ziele = root.querySelectorAll(".sg-netz");
    const netz = richtig
      ? Spiel.subnetz.rechnen(ip, praefix).netz
      : ziele[0].querySelector(".sg-netz-name").textContent.split("/")[0];
    const ziel = ziele.find(z => String(z.querySelector(".sg-netz-name").textContent).split("/")[0] === netz);
    erwarte.wahr(!!ziel, "Netzspalte " + netz + " vorhanden");
    /* Zuordnung über den echten Knopf – derselbe Weg wie Enter/Leertaste (B3). */
    const wahl = ziel.querySelector(".sg-netz-wahl");
    erwarte.wahr(!!wahl, "Ziel-Knopf „In Netz … ablegen“ vorhanden");
    erwarte.falsch(!!wahl.disabled, "Ziel-Knopf ist nach der Adresswahl aktiv");
    wahl.click();
  }
}
function patcherKonfigurieren(p, root){
  const zeilen = root.querySelectorAll(".sg-anforderung-zeile").map(z => z.textContent);
  erwarte.gleich(zeilen.length, 8, "acht Anforderungen");
  zeilen.forEach((text, i) => {
    const port = root.querySelectorAll(".sg-port").find(b => {
      const name = b.querySelector(".sg-port-name");
      return name && name.textContent === "P" + (i + 1);
    });
    erwarte.wahr(!!port, "Port " + (i + 1) + " vorhanden");
    port.click();
    if (/Trunk/.test(text)) {
      sgKnopf(root.querySelector(".sg-port-panel"), "Trunk").click();
    } else {
      sgKnopf(root.querySelector(".sg-port-panel"), "Access").click();
      const vlan = Number((/VLAN (\d+)/.exec(text) || [])[1]);
      const knopf = sgAlleKnoepfe(root.querySelector(".sg-port-panel")).find(b => String(b.textContent).trim() === "VLAN " + vlan);
      erwarte.wahr(!!knopf, "VLAN-" + vlan + "-Knopf vorhanden");
      knopf.click();
    }
  });
}

/* ================= Tests ================= */
gruppe("UI: Subnetting-Lernspiele", () => {
  pruefe("Spieleliste: genau drei Lernspiele mit Titel, Kicker, Lernziel, Fertigkeit, Stufe und Dauer" + SG_ZUSATZ, () => {
    if (!SG_KANN_LADEN) return;
    const p = sgPruefstand();
    const liste = p.UI.subnetzwerkzeuge.spiele.liste();
    erwarte.gleich(liste.map(s => s.id), ["praefix-blitz", "netz-sortierer", "vlan-patcher"], "feste Reihenfolge aus § 8");
    erwarte.gleich(new Set(liste.map(s => s.titel)).size, 3, "drei eigene Titel");
    for (const s of liste) {
      for (const feld of ["id", "titel", "kicker", "lead", "skill", "stufe", "dauerText"]) {
        erwarte.wahr(typeof s[feld] === "string" && s[feld].length > 0, s.id + ": " + feld + " fehlt");
      }
      erwarte.wahr(s.lead.length >= 30, s.id + ": Lernziel ist ein ganzer Satz");
      erwarte.wahr(["E", "AP1", "AP2"].includes(s.stufe), s.id + ": unbekannte Stufe");
    }
    const blitz = liste.find(s => s.id === "praefix-blitz");
    erwarte.enthaelt(blitz.dauerText, "60", "Präfix-Blitz nennt die 60 Sekunden");
    erwarte.gleich(liste.find(s => s.id === "vlan-patcher").skill, "lab.vlan", "VLAN-Patcher übt lab.vlan");
  });

  pruefe("Jedes Lernspiel startet in einem Rahmen und zerstoeren räumt ihn wieder ab" + SG_ZUSATZ, () => {
    if (!SG_KANN_LADEN) return;
    const p = sgPruefstand();
    for (const meta of p.UI.subnetzwerkzeuge.spiele.liste()) {
      const {c, griff, root} = sgSpiel(p, meta.id, {});
      erwarte.wahr(!!root, meta.id + ": kein Wurzelelement");
      erwarte.wahr(sgKlassen(root).includes("sg"), meta.id + ": Wurzelklasse sg- fehlt");
      erwarte.gleich(root.getAttribute("data-spiel"), meta.id, meta.id + ": Kennung am DOM");
      erwarte.wahr(!!root.querySelector(".sg-titel"), meta.id + ": Titel fehlt");
      erwarte.enthaelt(root.querySelector(".sg-titel").textContent, meta.titel, meta.id + ": falscher Titel");
      erwarte.wahr(!!root.querySelector(".sg-lead"), meta.id + ": Lernziel fehlt");
      erwarte.wahr(!!root.querySelector(".sg-beenden"), meta.id + ": kein Weg aus dem Spiel");
      erwarte.wahr(typeof griff.zerstoeren === "function", meta.id + ": zerstoeren fehlt");
      griff.zerstoeren();
      erwarte.gleich(c.kinder.length, 0, meta.id + ": zerstoeren räumt den Container");
    }
  });

  pruefe("Präfix-Blitz: Kartenfolge und Antworten sind aus dem Seed deterministisch" + SG_ZUSATZ, () => {
    if (!SG_KANN_LADEN) return;
    sgKapsel(() => {
      const p = sgPruefstand();
      const a = sgSpiel(p, "praefix-blitz", {niveau: "AP1"});
      const b = sgSpiel(p, "praefix-blitz", {niveau: "AP1"});
      erwarte.gleich(a.root.querySelector(".sg-frage").textContent, b.root.querySelector(".sg-frage").textContent, "gleiche erste Frage");
      const optA = a.root.querySelectorAll(".sg-option").map(o => o.textContent);
      const optB = b.root.querySelectorAll(".sg-option").map(o => o.textContent);
      erwarte.gleich(optA, optB, "gleiche Antwortkarten");
      erwarte.gleich(optA.length, 4, "vier Antwortkarten");
      erwarte.gleich(a.root.querySelector(".sg-zeit").textContent, "60 s", "Start bei 60 Sekunden");
      /* Erste Karte in beiden Runden gleich beantworten, dann die zweite Frage vergleichen. */
      a.root.querySelectorAll(".sg-option")[0].click();
      b.root.querySelectorAll(".sg-option")[0].click();
      praefixWeiter(p, a.root);
      praefixWeiter(p, b.root);
      erwarte.gleich(a.root.querySelector(".sg-frage").textContent, b.root.querySelector(".sg-frage").textContent, "gleiche zweite Frage");
      erwarte.gleich(a.root.querySelectorAll(".sg-option").map(o => o.textContent),
        b.root.querySelectorAll(".sg-option").map(o => o.textContent), "gleiche zweite Antwortkarten");
    });
  });

  pruefe("Präfix-Blitz: richtige Antworten geben Punkte und Serie, Fehler kosten die Serie – Endauswertung über antwort" + SG_ZUSATZ, () => {
    if (!SG_KANN_LADEN) return;
    sgKapsel(buchungen => {
      const p = sgPruefstand();
      let ergebnis = null, ereignis = null;
      const {root} = sgSpiel(p, "praefix-blitz", {niveau: "AP1",
        onEnde: e => { ergebnis = e; }, onErgebnis: e => { ereignis = e; }});
      praefixAntworten(p, root, true, 4);
      erwarte.gleich(p.uhren.filter(u => u.ms === 1000).length, 1, "die Rundenuhr läuft");
      p.uhrLauf(1000, 80);
      erwarte.wahr(!!ergebnis, "onEnde wurde gerufen");
      pruefeErgebnisForm(ergebnis, "praefix-blitz");
      erwarte.wahr(ergebnis.richtig >= 4, "mindestens vier richtige Karten");
      erwarte.gleich(ergebnis.falsch, 0, "keine Fehler in der richtigen Runde");
      erwarte.wahr(ergebnis.serie >= 4, "Serie zählt die richtigen Karten");
      erwarte.wahr(ergebnis.punkte > 0, "richtige Antworten geben Punkte");
      erwarte.gleich(ergebnis.punkte, ergebnis.richtig * 10 + ergebnis.serie * 2, "Punkteform: richtig × 10 + beste Serie × 2");
      erwarte.gleich(ergebnis.dauerSek, 60, "die Runde lief 60 Sekunden");
      erwarte.gleich(ergebnis.aufgaben.length, 4, "vier Aufgaben im Protokoll");
      erwarte.wahr(!!root.querySelector(".sg-ergebnis"), "Ergebnis steht in der Ansicht");
      erwarte.wahr(!!root.querySelector(".sg-auswertung"), "Fehlerauswertung steht bereit");
      erwarte.enthaelt(root.querySelector(".sg-ergebnis").textContent, "Bestwert", "Bestwert wird über die API gelesen");
      erwarte.gleich([ereignis.art, ereignis.id, ereignis.geloest, ereignis.hilfe], ["spiel", "praefix-blitz", true, false], "onErgebnis-Form");
      erwarte.gleich(buchungen.length, 4, "vier Verbuchungen über Spiel.subnetz.antwort");
      erwarte.wahr(buchungen.every(b => b.optionen.hilfe === false), "Verbucht ohne Hilfe");
      const spielBuchungen = buchungen.filter(b => b.optionen.spiel);
      erwarte.gleich(spielBuchungen.length, 1, "genau EINE Rundenbuchung");
      erwarte.gleich(spielBuchungen[0].optionen.spiel, {id: "praefix-blitz", punkte: ergebnis.punkte}, "Rundenbuchung enthält ID und Punkte");
      erwarte.gleich(p.uhren.length, 0, "nach dem Ende laufen keine Uhren mehr");
    });
  });

  pruefe("Präfix-Blitz: eine Runde mit Fehlern bekommt weniger Punkte als eine richtige Runde" + SG_ZUSATZ, () => {
    if (!SG_KANN_LADEN) return;
    sgKapsel(() => {
      const p = sgPruefstand();
      let ergebnis = null;
      const {root} = sgSpiel(p, "praefix-blitz", {niveau: "AP1", onEnde: e => { ergebnis = e; }});
      praefixAntworten(p, root, false, 2);
      p.uhrLauf(1000, 80);
      erwarte.wahr(!!ergebnis, "onEnde wurde gerufen");
      pruefeErgebnisForm(ergebnis, "praefix-blitz");
      erwarte.gleich(ergebnis.richtig, 0, "beide Karten waren falsch");
      erwarte.gleich(ergebnis.falsch, 2, "zwei Fehler gezählt");
      erwarte.gleich(ergebnis.serie, 0, "Fehler setzt die Serie auf null");
      erwarte.gleich(ergebnis.punkte, 0, "Fehler zahlen keine Punkte");
      const auswertung = root.querySelector(".sg-auswertung");
      erwarte.wahr(!!auswertung, "Fehlerauswertung steht bereit");
      erwarte.gleich(auswertung.querySelectorAll(".sg-auswertung-zeile").length, 2, "je Fehler eine Zeile");
    });
  });

  pruefe("Netz-Sortierer: acht Adressen sicher zuordnen – richtige Runde ergibt 80 Punkte und acht Verbuchungen" + SG_ZUSATZ, () => {
    if (!SG_KANN_LADEN) return;
    sgKapsel(buchungen => {
      const p = sgPruefstand();
      let ergebnis = null, ereignis = null;
      const {root} = sgSpiel(p, "netz-sortierer", {onEnde: e => { ergebnis = e; }, onErgebnis: e => { ereignis = e; }});
      erwarte.gleich(root.querySelectorAll(".sg-adresse").length, 8, "acht Adressen im Vorrat");
      erwarte.gleich(root.querySelectorAll(".sg-netz").length, 3, "drei Zielnetze");
      netzSortieren(p, root, true);
      sgKnopf(root, "Prüfen").click();
      erwarte.wahr(!!ergebnis, "onEnde wurde gerufen");
      pruefeErgebnisForm(ergebnis, "netz-sortierer");
      erwarte.gleich([ergebnis.richtig, ergebnis.falsch, ergebnis.punkte, ergebnis.serie], [8, 0, 80, 0], "alle acht richtig");
      erwarte.gleich(ergebnis.aufgaben.length, 8, "acht Aufgaben im Ergebnis");
      erwarte.gleich(root.querySelectorAll(".sg-auswertung-zeile").length, 8, "Auflösung für jede Adresse");
      erwarte.enthaelt(root.querySelector(".sg-auswertung").textContent, "Netz-ID", "Auflösung nennt die Netz-ID");
      erwarte.wahr(!!root.querySelector(".sg-ergebnis"), "Ergebnis steht in der Ansicht");
      erwarte.gleich([ereignis.art, ereignis.id, ereignis.geloest, ereignis.hilfe], ["spiel", "netz-sortierer", true, false], "onErgebnis-Form");
      erwarte.gleich(buchungen.length, 8, "acht Verbuchungen");
      erwarte.gleich(buchungen.filter(b => b.optionen.spiel).length, 1, "genau eine Rundenbuchung");
      erwarte.gleich(buchungen.filter(b => b.optionen.spiel)[0].optionen.spiel.id, "netz-sortierer", "Runden-ID stimmt");
      erwarte.wahr(buchungen.every(b => b.optionen.hilfe === false), "ohne Hilfe verbucht");
    });
  });

  pruefe("Netz-Sortierer: falsche Zuordnung wird aufgelöst und ist schwächer als die richtige Runde" + SG_ZUSATZ, () => {
    if (!SG_KANN_LADEN) return;
    sgKapsel(() => {
      const p = sgPruefstand();
      let ergebnis = null;
      const {root} = sgSpiel(p, "netz-sortierer", {onEnde: e => { ergebnis = e; }});
      netzSortieren(p, root, false);
      sgKnopf(root, "Prüfen").click();
      erwarte.wahr(!!ergebnis, "onEnde wurde gerufen");
      pruefeErgebnisForm(ergebnis, "netz-sortierer");
      erwarte.gleich(ergebnis.richtig + ergebnis.falsch, 8, "alle acht Adressen bewertet");
      erwarte.wahr(ergebnis.falsch > 0, "falsche Zuordnungen werden gezählt");
      erwarte.gleich(ergebnis.punkte, ergebnis.richtig * 10, "Punkte nur für richtige Zuordnungen");
      erwarte.wahr(ergebnis.punkte < 80, "falsche Runde bleibt unter der richtigen Runde");
      erwarte.gleich(root.querySelectorAll(".sg-auswertung-zeile").length, 8, "Auflösung bleibt vollständig");
    });
  });

  pruefe("VLAN-Patcher: Anforderung konfigurieren, Prüfen zeigt keine Abweichung, Abgeben verbucht acht Ports" + SG_ZUSATZ, () => {
    if (!SG_KANN_LADEN) return;
    sgKapsel(buchungen => {
      const p = sgPruefstand();
      let ergebnis = null, ereignis = null;
      const {root} = sgSpiel(p, "vlan-patcher", {onEnde: e => { ergebnis = e; }, onErgebnis: e => { ereignis = e; }});
      erwarte.gleich(root.querySelectorAll(".sg-port").length, 8, "acht Ports");
      erwarte.gleich(root.querySelectorAll(".sg-anforderung-zeile").length, 8, "acht Anforderungen");
      patcherKonfigurieren(p, root);
      sgKnopf(root, "Prüfen").click();
      const rueck = root.querySelector(".sg-rueckmeldung");
      erwarte.enthaelt(rueck.textContent, "Keine Abweichung", "Prüfen bestätigt die richtige Konfiguration");
      erwarte.wahr(sgKlassen(rueck).includes("sg-ok"), "Rückmeldung ist als Erfolg markiert");
      sgKnopf(root, "Abgeben").click();
      erwarte.wahr(!!ergebnis, "onEnde wurde gerufen");
      pruefeErgebnisForm(ergebnis, "vlan-patcher");
      erwarte.gleich([ergebnis.richtig, ergebnis.falsch, ergebnis.punkte], [8, 0, 80], "alle acht Ports richtig");
      erwarte.gleich(ergebnis.aufgaben.length, 8, "acht Port-Aufgaben");
      erwarte.enthaelt(root.querySelector(".sg-auswertung").textContent, "Soll:", "Auflösung nennt die Soll-Konfiguration");
      erwarte.gleich([ereignis.art, ereignis.id, ereignis.geloest, ereignis.hilfe], ["spiel", "vlan-patcher", true, false], "onErgebnis-Form");
      erwarte.gleich(buchungen.length, 8, "acht Verbuchungen");
      erwarte.gleich(buchungen.filter(b => b.optionen.spiel).length, 1, "genau eine Rundenbuchung");
      erwarte.gleich(buchungen.filter(b => b.optionen.spiel)[0].optionen.spiel.id, "vlan-patcher", "Runden-ID stimmt");
    });
  });

  pruefe("VLAN-Patcher: unveränderte Ports ergeben null Punkte und eine benannte Differenz" + SG_ZUSATZ, () => {
    if (!SG_KANN_LADEN) return;
    sgKapsel(() => {
      const p = sgPruefstand();
      let ergebnis = null;
      const {root} = sgSpiel(p, "vlan-patcher", {onEnde: e => { ergebnis = e; }});
      sgKnopf(root, "Prüfen").click();
      erwarte.enthaelt(root.querySelector(".sg-rueckmeldung").textContent, "weichen", "Prüfen nennt die Abweichungen");
      erwarte.wahr(root.querySelectorAll(".sg-diff-zeile").length > 0, "Differenzliste ist gefüllt");
      sgKnopf(root, "Abgeben").click();
      erwarte.wahr(!!ergebnis, "onEnde wurde gerufen");
      pruefeErgebnisForm(ergebnis, "vlan-patcher");
      erwarte.gleich([ergebnis.richtig, ergebnis.punkte], [0, 0], "unveränderte Ports geben keine Punkte");
      erwarte.gleich(ergebnis.falsch, 8, "acht Abweichungen gezählt");
    });
  });

  pruefe("VLAN-Patcher: Szenario und Anforderungen sind aus dem Seed deterministisch" + SG_ZUSATZ, () => {
    if (!SG_KANN_LADEN) return;
    sgKapsel(() => {
      const p = sgPruefstand();
      const a = sgSpiel(p, "vlan-patcher", {});
      const b = sgSpiel(p, "vlan-patcher", {});
      erwarte.gleich(a.root.querySelector(".sg-auftrag-text").textContent, b.root.querySelector(".sg-auftrag-text").textContent, "gleiches Szenario");
      erwarte.gleich(a.root.querySelector(".sg-anforderung").textContent, b.root.querySelector(".sg-anforderung").textContent, "gleiche Anforderung");
      const n = sgSpiel(p, "netz-sortierer", {});
      const m = sgSpiel(p, "netz-sortierer", {});
      erwarte.gleich(n.root.querySelector(".sg-regel").textContent, m.root.querySelector(".sg-regel").textContent, "gleiches Sortier-Szenario");
      erwarte.gleich(n.root.querySelectorAll(".sg-adresse").map(c => c.textContent),
        m.root.querySelectorAll(".sg-adresse").map(c => c.textContent), "gleiche Adressliste");
    });
  });

  pruefe("Abbrechen: zerstoeren beendet die Runde ohne Ergebnis und räumt die Uhr" + SG_ZUSATZ, () => {
    if (!SG_KANN_LADEN) return;
    sgKapsel(() => {
      const p = sgPruefstand();
      let ergebnis = null;
      const {c, griff, root} = sgSpiel(p, "praefix-blitz", {niveau: "AP1", onEnde: e => { ergebnis = e; }});
      erwarte.wahr(p.uhren.length > 0, "die Runde hat eine Uhr");
      sgKnopf(root, "Spiel beenden").click();
      erwarte.gleich(c.kinder.length, 0, "Container ist leer");
      erwarte.gleich(p.uhren.length, 0, "keine Uhr läuft weiter");
      erwarte.gleich(ergebnis, null, "Abbruch erzeugt kein Ergebnis");
      erwarte.wahr(typeof griff.zerstoeren === "function", "zerstoeren bleibt aufrufbar");
      griff.zerstoeren();
      erwarte.gleich(c.kinder.length, 0, "doppeltes zerstoeren bleibt harmlos");
    });
  });

  pruefe("Netz-Sortierer: Adressen und Zielnetze sind echte Knöpfe mit Tastaturweg (B3)" + SG_ZUSATZ, () => {
    if (!SG_KANN_LADEN) return;
    sgKapsel(() => {
      const p = sgPruefstand();
      const {root} = sgSpiel(p, "netz-sortierer", {});
      const chips = root.querySelectorAll(".sg-adresse");
      erwarte.gleich(chips.length, 8, "acht Adress-Knöpfe");
      erwarte.wahr(chips.every(c => c.tag === "button"), "jede Adresse ist ein echter Knopf (Enter/Leertaste)");
      erwarte.wahr(chips.every(c => c.getAttribute("tabindex") !== "-1"), "Adressen sind per Tab erreichbar");
      const ziele = root.querySelectorAll(".sg-netz");
      erwarte.gleich(ziele.length, 3, "drei Zielnetze");
      const wahlen = root.querySelectorAll(".sg-netz-wahl");
      erwarte.gleich(wahlen.length, 3, "drei Ziel-Knöpfe");
      erwarte.wahr(wahlen.every(w => w.tag === "button"), "Zielnetze sind echte Knöpfe");
      erwarte.wahr(wahlen.every(w => w.getAttribute("tabindex") !== "-1"), "Zielnetze sind per Tab erreichbar");
      erwarte.wahr(wahlen.every(w => w.disabled === true), "ohne Adresswahl sind die Ziel-Knöpfe gesperrt");
      const ip = chips[0].querySelector(".sg-adresse-name").textContent;
      chips[0].click();
      const praefix = netzSpielZeichnen(p, root).praefix;
      const netz = Spiel.subnetz.rechnen(ip, praefix).netz;
      const ziel = root.querySelectorAll(".sg-netz").find(z => String(z.querySelector(".sg-netz-name").textContent).split("/")[0] === netz);
      const wahl = ziel.querySelector(".sg-netz-wahl");
      erwarte.falsch(wahl.disabled, "nach der Adresswahl ist der Ziel-Knopf aktiv");
      erwarte.enthaelt(wahl.textContent, netz, "Ziel-Knopf nennt sein Netz");
      erwarte.wahr(String(wahl.getAttribute("aria-label") || "").length > 0, "Ziel-Knopf hat ein aria-label");
      wahl.click();
      erwarte.gleich(root.querySelector(".sg-adressen").querySelectorAll(".sg-adresse").length, 7, "die Adresse ist aus dem Vorrat genommen");
      erwarte.gleich(root.querySelectorAll(".sg-netz-zone").reduce((n, z) => n + z.querySelectorAll(".sg-adresse").length, 0), 1, "die Adresse liegt in der Netz-Zone");
      erwarte.enthaelt(root.querySelector(".sg-rueckmeldung").textContent, "Enter", "die Ansage nennt den Tastaturweg");
    });
  });

  pruefe("Präfix-Blitz: Rückmeldung und Rechenweg bleiben stehen, „Weiter“ führt weiter (S11)" + SG_ZUSATZ, () => {
    if (!SG_KANN_LADEN) return;
    sgKapsel(() => {
      const p = sgPruefstand();
      const {root} = sgSpiel(p, "praefix-blitz", {niveau: "AP1"});
      /* Richtige Antwort: Rückmeldung + Rechenweg sichtbar, Auto-Weiter nach 1,8 s, Weiter-Knopf sofort. */
      const soll = praefixAntwort(root.querySelector(".sg-frage").textContent);
      const richtig = root.querySelectorAll(".sg-option").find(o => String(o.textContent) === soll);
      richtig.click();
      erwarte.wahr(!!root.querySelector(".sg-rechenweg"), "Rechenweg steht nach der Antwort");
      erwarte.wahr(!!root.querySelector(".sg-weiter"), "Weiter-Knopf ist da");
      erwarte.gleich(p.uhren.filter(u => u.ms === 1800).length, 1, "Auto-Weiter nach 1,8 s statt 900 ms");
      erwarte.gleich(p.uhren.filter(u => u.ms === 900).length, 0, "kein 900-ms-Timer mehr");
      const ersteFrage = root.querySelector(".sg-frage").textContent;
      root.querySelector(".sg-weiter").click();
      erwarte.wahr(root.querySelector(".sg-frage").textContent !== ersteFrage, "Weiter führt zur nächsten Karte");
      /* Falsche Antwort: kein Auto-Weiter; Rückmeldung samt Rechenweg bleibt bis zum Klick. */
      const soll2 = praefixAntwort(root.querySelector(".sg-frage").textContent);
      const falsch = root.querySelectorAll(".sg-option").find(o => String(o.textContent) !== soll2);
      falsch.click();
      erwarte.wahr(!!root.querySelector(".sg-rechenweg"), "Rechenweg bleibt auch im Fehlerfall stehen");
      erwarte.gleich(p.uhren.filter(u => u.ms === 1800).length, 0, "im Fehlerfall kein Auto-Weiter");
      erwarte.wahr(!!root.querySelector(".sg-weiter"), "Weiter-Knopf bleibt im Fehlerfall");
      const vorher = root.querySelector(".sg-frage").textContent;
      root.querySelector(".sg-weiter").click();
      erwarte.wahr(root.querySelector(".sg-frage").textContent !== vorher, "Weiter führt nach dem Fehler zur nächsten Karte");
    });
  });

  pruefe("Netz-Sortierer: alle drei Szenarien bauen drei Netze (Didaktik: Filiale)" + SG_ZUSATZ, () => {
    if (!SG_KANN_LADEN) return;
    sgKapsel(() => {
      const p = sgPruefstand();
      for (const seed of [0, 1, 2]) {
        const {root} = sgSpiel(p, "netz-sortierer", {seed});
        erwarte.wahr(!!root.querySelector(".sg-regel"), "Seed " + seed + ": Szenario gebaut");
        erwarte.gleich(root.querySelectorAll(".sg-netz").length, 3, "Seed " + seed + ": drei Zielnetze");
        erwarte.gleich(root.querySelectorAll(".sg-adresse").length, 8, "Seed " + seed + ": acht Adressen");
      }
    });
  });

  pruefe("Unbekanntes Spiel und fehlender Rechenkern: ruhiger Hinweis statt Ausnahme" + SG_ZUSATZ, () => {
    if (!SG_KANN_LADEN) return;
    const p = sgPruefstand();
    const unbekannt = sgSpiel(p, "gibtsnicht", {});
    erwarte.enthaelt(unbekannt.root.textContent, "gibt es nicht", "unbekannte Spiel-ID wird erklärt");
    erwarte.enthaelt(unbekannt.root.textContent, "praefix-blitz", "verfügbare Spiele werden genannt");
    const altar = Spiel.subnetz;
    try {
      delete Spiel.subnetz;
      const ohne = sgSpiel(p, "praefix-blitz", {});
      erwarte.enthaelt(ohne.root.querySelector(".sg-buehne").textContent, "Rechenkern", "fehlender Kern wird erklärt");
      erwarte.gleich(ohne.root.querySelectorAll(".sg-option").length, 0, "kein Spiel ohne Rechenkern");
    } finally {
      Spiel.subnetz = altar;
    }
  });
});
