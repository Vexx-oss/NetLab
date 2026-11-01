"use strict";
/* INS PEKTORBREITE (3.1.0, Aufgabe B3/4): kein input[type=range], kein fokussierbares Handle —
   div.ins-resizer role=separator; Pointer-Drag, Doppelklick-Reset, Alt+←/→; persistiert
   einst.layout.inspBreite (280–560, Default 360). Hier die Logik (layout-breite.js). */
const LB_LADEN = (() => {
  try { return typeof require === "function" && typeof document === "undefined"; } catch (e) { return false; }
})();
const LB_ZUSATZ = LB_LADEN ? "" : " (kein require im Testbereich – nur unter node tests/run.js)";

function lbKnoten(tag){
  const el = {
    tag, kinder: [], listeners: {}, attrs: {}, style: {__w: {}, setProperty(k, v){ el.style.__w[k] = String(v); }, removeProperty(k){ delete el.style.__w[k]; }, getPropertyValue(k){ return el.style.__w[k] || ""; }},
    classList: {_l: [], add(x){ if (!this._l.includes(x)) this._l.push(x); }, remove(x){ this._l = this._l.filter(y => y !== x); }, contains(x){ return this._l.includes(x); }},
    addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
    setAttribute(k, v){ el.attrs[k] = String(v); },
    getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
    append(...k){ el.kinder.push(...k); },
  };
  return el;
}
function lbStand(opt = {}){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const daten = opt.store ? JSON.parse(JSON.stringify(opt.store)) : {};
  const document = {
    listeners: {},
    querySelector(sel){ return sel === ".labor" && opt.root ? opt.root : null; },
    addEventListener(art, fn){ (document.listeners[art] ||= []).push(fn); },
    removeEventListener(){},
  };
  const store = {
    get: (k, ersatz = null) => (k in daten ? JSON.parse(JSON.stringify(daten[k])) : ersatz),
    set: (k, v) => { daten[k] = JSON.parse(JSON.stringify(v)); },
  };
  const bereich = {document, store, console: {log(){}, error(){}, warn(){}}, UI: {}, setTimeout: () => 0, clearTimeout(){}};
  vm.createContext(bereich);
  const lies = f => fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8");
  vm.runInContext(lies("layout-breite.js"), bereich, {filename: "ui/layout-breite.js"});
  const UI = vm.runInContext("UI", bereich);
  return {UI, lb: UI.layoutBreite, document, store, daten};
}

if (!LB_LADEN) {
  pruefe("Inspektorbreite: nur unter node tests/run.js prüfbar", () => { erwarte.wahr(false, "require fehlt"); });
} else gruppe("UI: Inspektorbreite per Kante (3.1.0 B3/4)", () => {

  pruefe("Default 360, Grenzen 280/560, Persistenz in einst.layout.inspBreite", () => {
    const s = lbStand();
    erwarte.gleich(s.lb.lesen(), 360, "Default 360");
    erwarte.gleich(s.lb.schreiben(100), 280, "unter der Grenze → 280");
    erwarte.gleich(s.lb.schreiben(900), 560, "über der Grenze → 560");
    erwarte.gleich(s.lb.schreiben(420), 420, "gültiger Wert");
    erwarte.gleich(s.daten.einst.layout.inspBreite, 420, "persistiert in store einst.layout.inspBreite");
    const zweiter = lbStand({store: s.daten});
    erwarte.gleich(zweiter.lb.lesen(), 420, "gelesen aus dem Store");
  });

  pruefe("anwenden setzt Inline---dock-b am .labor, reset auf 360", () => {
    const root = lbKnoten("div");
    const s = lbStand();
    s.lb.anwenden(root, 480);
    erwarte.gleich(root.style.getPropertyValue("--dock-b"), "480px", "--dock-b als px am .labor");
    s.lb.reset(root);
    erwarte.gleich(root.style.getPropertyValue("--dock-b"), "360px", "Reset = Standard 360");
    erwarte.gleich(s.lb.lesen(), 360, "Reset persistiert");
  });

  pruefe("installieren ohne Nutzerwert: KEINE Inline-Breite (CSS-Clamp bleibt maßgeblich)", () => {
    const root = lbKnoten("div"), sep = lbKnoten("div");
    const s = lbStand();
    s.lb.installieren(root, sep);
    erwarte.gleich(root.style.getPropertyValue("--dock-b"), "", "kein Inline --dock-b, solange der Nutzer nichts geändert hat");
    erwarte.gleich(s.lb.lesen(), 360, "Anzeige-Default bleibt 360");
  });

  pruefe("installieren: Pointer-Drag auf der Kante ändert und persistiert, Doppelklick reset", () => {
    const root = lbKnoten("div"), sep = lbKnoten("div");
    const s = lbStand();
    erwarte.wahr(s.lb.installieren(root, sep) === true, "installiert");
    const start = (sep.listeners.pointerdown || [])[0], move = (sep.listeners.pointermove || [])[0], up = (sep.listeners.pointerup || [])[0];
    erwarte.wahr(typeof start === "function" && typeof move === "function" && typeof up === "function", "Pointer-Hörer hängen");
    start({clientX: 800, pointerId: 1, preventDefault(){}});
    erwarte.wahr(sep.classList.contains("zieht"), "während des Ziehens Klasse zieht");
    move({clientX: 740});          /* nach links = breiter */
    erwarte.gleich(root.style.getPropertyValue("--dock-b"), "420px", "Startbreite 360 + 60 = 420");
    up({});
    erwarte.falsch(sep.classList.contains("zieht"), "nach dem Ziehen keine zieht-Klasse");
    erwarte.gleich(s.daten.einst.layout.inspBreite, 420, "Breite nach dem Ziehen persistiert");
    erwarte.gleich(sep.getAttribute("aria-valuenow"), "420", "aria-valuenow nachgezogen");
    const dbl = (sep.listeners.dblclick || [])[0];
    dbl({});
    erwarte.gleich(s.daten.einst.layout.inspBreite, 360, "Doppelklick = Reset auf 360");
    erwarte.gleich(root.style.getPropertyValue("--dock-b"), "360px", "und angewendet");
  });

  pruefe("Tastatur: Alt+←/→ global um 16, Pfeile am Separator um 8, preventDefault", () => {
    const root = lbKnoten("div"), sep = lbKnoten("div");
    const s = lbStand();
    s.lb.installieren(root, sep);
    const key = (sep.listeners.keydown || [])[0];
    erwarte.wahr(typeof key === "function", "Keydown-Hörer am Separator");
    const e1 = {key: "ArrowRight", altKey: true, preventDefault(){ e1.verhindert = true; }};
    erwarte.wahr(s.lb.tastatur(e1) === true, "Alt+→ wird behandelt");
    erwarte.wahr(e1.verhindert === true, "preventDefault");
    erwarte.gleich(s.lb.lesen(), 376, "360 + 16");
    const e2 = {key: "ArrowLeft", altKey: false, target: sep, preventDefault(){}};
    erwarte.wahr(s.lb.tastatur(e2) === true, "Pfeil am Separator wird behandelt");
    erwarte.gleich(s.lb.lesen(), 368, "376 − 8");
    const global = (s.document.listeners.keydown || [])[0];
    erwarte.wahr(typeof global === "function", "globaler Alt-Hörer angemeldet");
    const e3 = {key: "ArrowLeft", altKey: true, preventDefault(){}};
    erwarte.wahr(s.lb.tastatur(e3) === true, "Alt+← global");
    erwarte.gleich(s.lb.lesen(), 352, "368 − 16");
  });

  pruefe("Kein input[type=range] und kein fokussierbares Handle im Resizer-Markup", () => {
    const q = require("fs").readFileSync(require("path").join(__dirname, "..", "src", "ui", "editor.js"), "utf8");
    const lq = require("fs").readFileSync(require("path").join(__dirname, "..", "src", "ui", "layout-breite.js"), "utf8");
    erwarte.falsch(/type:\s*["']range["']/.test(q + lq), "kein input[type=range]");
    erwarte.enthaelt(q, 'role: "separator"', "Resizer ist role=separator");
    erwarte.enthaelt(q, 'class: "ins-resizer"', "Resizer ist div.ins-resizer");
    erwarte.enthaelt(lq, "--dock-b", "Breite setzt --dock-b");
    erwarte.enthaelt(q, "layoutBreite.installieren", "der Konstruktor wird im Dock-Aufbau aufgerufen");
  });

});
