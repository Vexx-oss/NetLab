"use strict";
/* VIS-09 (B, task-90): Der Netz-Atlas in der Kundenakte widersprach sich (Zähler „3 Aufträge /
   zuletzt 28.10.“ bei leerem Atlas „Noch kein Gerät — mit deinem ersten Auftrag …“). Geprüft wird
   die echte akteAnsicht aus src/ui/karriere.js mit echtem Spielstand (Bauart tests/ui-akte.test.js):
   frischer Kunde → ehrlicher Leerzustand; nach ≥1 Auftrag mit Atlas-Gerät → Atlas sichtbar;
   Altstand mit Aufträgen OHNE Atlas-Gerät → ehrliche Begründung statt „erster Auftrag“. */
const KA_LADEN = (() => {
  try { return typeof require === "function" && typeof Spiel === "object" && Spiel !== null && typeof document === "undefined"; }
  catch (e) { return false; }
})();

function kaKnoten(tag){
  const el = {
    nodeType: 1, tag, kinder: [], listeners: {}, attrs: {}, className: "", _text: "", parentNode: null, hidden: false,
    style: {setProperty(){}, removeProperty(){}, getPropertyValue(){ return ""; }},
    append(...k){ for (const x of k) { if (x == null) { el.kinder.push({nodeType: 3, textContent: String(x)}); continue; } if (typeof x === "object") x.parentNode = el; el.kinder.push(x); } },
    replaceChildren(...k){ el.kinder = []; el.append(...k); },
    remove(){ if (el.parentNode) el.parentNode.kinder = el.parentNode.kinder.filter(x => x !== el); },
    setAttribute(k, v){ el.attrs[k] = String(v); },
    getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
    removeAttribute(k){ delete el.attrs[k]; },
    addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
    querySelector(sel){ return kaFinde(el, sel)[0] || null; },
    querySelectorAll(sel){ return kaFinde(el, sel); },
    classList: {add(){}, remove(){}, toggle(){}, contains(){ return false; }},
    get dataset(){ return el.attrs; },
    set textContent(v){ el._text = String(v); el.kinder = []; },
    get textContent(){ return el.kinder.length ? el.kinder.map(kaText).join("") : el._text; },
  };
  return el;
}
function kaText(k){ return k == null ? "" : typeof k === "string" ? k : (k.textContent || ""); }
function kaKlassen(el){ return String(el.className || el.attrs.class || "").split(/\s+/).filter(Boolean); }
function kaPasst(el, sel){
  const teile = String(sel).match(/\.[\w-]+/g) || [];
  return teile.length > 0 && teile.every(t => kaKlassen(el).includes(t.slice(1)));
}
function kaFinde(el, sel){
  const treffer = [];
  const lauf = k => { for (const x of k.kinder || []) if (x && x.tag) { if (kaPasst(x, sel)) treffer.push(x); lauf(x); } };
  lauf(el);
  return treffer;
}

const kaKapsel = fn => {
  const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken, speicher: store.alles()};
  try {
    Spiel._trocken = true; Spiel._lz = {};
    Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
    Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
    return fn();
  } finally {
    if (SPEICHER.timer) { clearTimeout(SPEICHER.timer); SPEICHER.timer = null; }
    for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
    Object.assign(SPEICHER.daten, alt.speicher);
    Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
  }
};

function kaStand(){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const rufe = {kopf: [], ansicht: [], abschnitte: 0};
  const UIstub = {
    symbol: (n, g) => kaKnoten("svg"),
    bento: {
      kopf: (titel, meta) => { rufe.kopf.push([titel, meta]); const k = kaKnoten("header"); k.append({nodeType: 3, textContent: String(titel) + " " + String(meta || "")}); return k; },
      monogramm: name => kaKnoten("span"),
    },
    netzplan: {zeichnung: () => { const b = kaKnoten("div"); b.className = "ka-atlas"; const g = kaKnoten("div"); g.className = "np-geraet"; g.attrs["data-id"] = "x"; b.append(g); return b; }},
    app: {registrieren(){}, einstellungAbschnitt(){ rufe.abschnitte += 1; }, ansicht: n => rufe.ansicht.push(n), aktuell: null},
    startHaken: [], uebergabe: {neuStarten(){}}, toast: () => {},
  };
  const dokument = {
    createElement: tag => kaKnoten(tag), createElementNS: (ns, tag) => kaKnoten(tag),
    createTextNode: t => ({nodeType: 3, textContent: String(t)}),
    body: kaKnoten("body"), documentElement: kaKnoten("html"), activeElement: null,
    addEventListener(){}, removeEventListener(){}, querySelector(){ return null; }, querySelectorAll(){ return []; },
  };
  const bereich = {
    __stub: UIstub, console: {log(){}, error: (...a) => console.error(...a), warn(){}},
    document: dokument, store, SPEICHER, Spiel, DATEN,
    Plattform: {name: "browser", kann: () => ({ja: false, grund: "Prüfstand"}), fenster: {groesse: () => Promise.resolve()}},
    Bus: {an(){}, senden(){}},
    requestAnimationFrame: fn => { try { fn(0); } catch (e) {} return 0; },
    setTimeout: () => 0, clearTimeout(){}, setInterval: () => 0, clearInterval(){},
    L: {}, eur: x => String(x), zahlDe: x => String(x), heute: () => "2026-10-31", datumDe: x => String(x), jetzt: () => 0,
  };
  vm.createContext(bereich);
  const quelle = f => fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8");
  vm.runInContext(quelle("dom.js"), bereich, {filename: "ui/dom.js"});
  vm.runInContext("Object.assign(UI, __stub);", bereich, {filename: "stubs.js"});
  vm.runInContext(quelle("karriere.js"), bereich, {filename: "ui/karriere.js"});
  const A = vm.runInContext("UI.karriere", bereich);
  return {UI: UIstub, K: A, rufe};
}

if (!KA_LADEN) {
  pruefe("Kundenakte-Atlas: nur unter node tests/run.js prüfbar", () => { erwarte.wahr(false, "require fehlt"); });
} else gruppe("UI: Kundenakte-Atlas (VIS-09 B)", () => {

  pruefe("VIS-09 B: frischer Kunde — ehrlicher Leerzustand, kein Widerspruch", () => kaKapsel(() => {
    const s = kaStand();
    const c = kaKnoten("div");
    s.K.akteAnsicht(c, "salon");
    const leer = kaFinde(c, ".ka-atlas-leer");
    erwarte.wahr(leer.length === 1, "der Leerzustand steht da");
    rowChecker: {
      /* kein erfundener Zähler: Zuletzt = „Noch nichts“, Atlas = „Noch kein Gerät“ */
      erwarte.enthaelt(kaText(c), "Noch kein Gerät", "der Atlas nennt ehrlich „Noch kein Gerät“");
    }
    erwarte.gleich(kaFinde(c, ".ka-atlas-rahmen").length, 0, "kein Atlas-Bild ohne Gerät");
    erwarte.enthaelt(kaText(leer[0]), "mit deinem ersten Auftrag", "ohne Aufträge ist „erster Auftrag“ korrekt");
    erwarte.enthaelt(kaText(c), "Noch nichts", "Zuletzt ist ehrlich leer");
  }));

  pruefe("VIS-09 B: nach einem Auftrag mit Atlas-Gerät zeigt der Atlas mindestens ein Gerät (DOM)", () => kaKapsel(() => {
    const geraete = Spiel.kundenakte.atlasGeraete("salon");
    erwarte.wahr(geraete.length > 0, "der Kunde hat dokumentierte Atlas-Geräte");
    Spiel.kundenakte.daten("salon").atlas = [geraete[0]];
    Spiel._st.erledigt = [{id: "salon-01", kunde: "salon", tag: "2026-10-01", sterne: 5, hilfe: false}];
    const a = Spiel.kundenakte.atlas("salon", {breite: 720});
    erwarte.wahr(a.hell.length >= 1, "Daten: mindestens ein helles Gerät nach dem Auftrag");
    const s = kaStand();
    const c = kaKnoten("div");
    s.K.akteAnsicht(c, "salon");
    erwarte.gleich(kaFinde(c, ".ka-atlas-rahmen").length, 1, "der Atlas-Rahmen ist sichtbar (kein Leerzustand)");
    erwarte.wahr(kaFinde(c, ".ka-atlas").length >= 1, "ein Atlas-Bild ist eingehängt");
    erwarte.gleich(kaFinde(c, ".ka-atlas-leer").length, 0, "kein Leerzustand mehr");
    erwarte.enthaelt(kaText(c), "Geräten", "der Kopf nennt den Geräte-Zähler");
    erwarte.enthaelt(kaText(c), "1 Auftrag", "Zuletzt zeigt den einen Auftrag");
  }));

  pruefe("VIS-09 B: Altstand mit Aufträgen OHNE Atlas-Gerät — ehrliche Begründung statt „erster Auftrag“", () => kaKapsel(() => {
    Spiel.kundenakte.daten("salon").atlas = [];
    Spiel._st.erledigt = [
      {id: "salon-01", kunde: "salon", tag: "2026-10-01", sterne: 5, hilfe: false},
      {id: "salon-02", kunde: "salon", tag: "2026-10-02", sterne: 4, hilfe: false},
      {id: "salon-03", kunde: "salon", tag: "2026-10-03", sterne: 4, hilfe: true},
    ];
    const s = kaStand();
    const c = kaKnoten("div");
    s.K.akteAnsicht(c, "salon");
    const leer = kaFinde(c, ".ka-atlas-leer");
    erwarte.wahr(leer.length === 1, "der Leerzustand steht da");
    const text = kaText(leer[0]);
    erwarte.enthaelt(text, "bisherigen 3 Aufträgen", "die Begründung nennt die vorhandenen Aufträge ehrlich");
    erwarte.enthaelt(text, "kein Gerät hell", "und sagt, warum der Atlas leer ist");
    erwarte.falsch(text.includes("ersten Auftrag"), "kein falsches Versprechen „mit deinem ersten Auftrag“");
    erwarte.enthaelt(kaText(c), "3 Aufträge", "Zuletzt zählt die drei Aufträge — der Widerspruch ist erklärt");
  }));

});
