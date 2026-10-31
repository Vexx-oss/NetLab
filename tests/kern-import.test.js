"use strict";
/* KERN-05: IMPORT IM DESKTOP-PROGRAMM OHNE STAND-RÜCKSCHRITT (task-16/task-31)
   WARUM: In Tauri ist location.reload() kein Neustart des Spielstands — die Rust-Hülle reicht beim
   Reload ihren Startstand als window.__LABOR_SPEICHER__ erneut hinein (shell/src-tauri/src/main.rs,
   Initialisierungsskript). Der importierte Stand würde also vom Altstand verdrängt und beim nächsten
   Autosave überschrieben. Der Fix: im Desktop-Programm den neuen Stand im laufenden Prozess
   aufbauen (Spiel.laden), sofort schreiben, dann die Ansichten ohne Neuladen neu aufbauen
   (UI.uebergabe.neuStarten). Im Browser bleibt der Reload.
   GEPRÜFT WIRD DER ECHTE WEG: src/ui/karriere.js (Import-Knopf im Abschnitt „Spielstand“) in einem
   eigenen vm-Bereich mit Fake-Plattform, Fake-Store und DOM-Ersatz (Bauart tests/ui-uebergabe.test.js);
   zusätzlich, dass src/ui/uebergabe.js neuStarten wirklich exportiert und ausführt. */
const KI_LADEN = (() => {
  try { return typeof require === "function" && typeof Spiel === "object" && Spiel !== null && typeof document === "undefined"; }
  catch (e) { return false; }
})();

/* ================= DOM-Ersatz (nur so viel wie karriere.js/overlay brauchen) ================= */
function kiKnoten(tag){
  const el = {
    nodeType: 1, tag, kinder: [], listeners: {}, attrs: {}, className: "", _text: "", parentNode: null,
    style: {setProperty(){}, removeProperty(){}, getPropertyValue(){ return ""; }},
    append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.parentNode = el; el.kinder.push(x); } },
    replaceChildren(...k){ el.kinder = []; el.append(...k); },
    remove(){ if (el.parentNode) el.parentNode.kinder = el.parentNode.kinder.filter(x => x !== el); },
    setAttribute(k, v){ el.attrs[k] = String(v); },
    getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
    removeAttribute(k){ delete el.attrs[k]; },
    addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
    querySelector(){ return null; }, querySelectorAll(){ return []; },
    classList: {add(){}, remove(){}, toggle(){}, contains(){ return false; }},
    set textContent(v){ el._text = String(v); el.kinder = []; },
    get textContent(){ return el.kinder.length ? el.kinder.map(kiText).join("") : el._text; },
  };
  return el;
}
function kiText(k){ return k == null ? "" : typeof k === "string" ? k : (k.textContent || ""); }
function kiAlle(el, raus = []){
  for (const k of el.kinder || []) if (k && k.tag) { raus.push(k); kiAlle(k, raus); }
  return raus;
}
function kiKlick(el, text){
  const treffer = kiAlle(el).find(k => (k.listeners.click || []).length && String(k.textContent).includes(text));
  if (!treffer) throw new Error("Knopf „" + text + "“ nicht gefunden");
  for (const fn of treffer.listeners.click.slice()) fn({currentTarget: treffer, target: treffer, preventDefault(){}, stopPropagation(){}});
  return treffer;
}
function kiThen(wert){ return {then(fn){ fn(wert); return this; }, catch(){ return this; }}; }

/* ================= Prüfstand: echter karriere.js-Code im vm-Bereich ================= */
function kiStand(name){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const spy = {init: [], sicherung: [], laden: 0, sofort: 0, neu: 0, reloads: 0, order: [], writer: [], toasts: []};
  const zustand = {daten: {labor: {v: 3, euro: 100, erledigt: []}, einst: {}}};
  const dokument = {
    createElement: tag => kiKnoten(tag), createElementNS: (ns, tag) => kiKnoten(tag),
    createTextNode: t => ({nodeType: 3, textContent: String(t)}),
    body: kiKnoten("body"), documentElement: kiKnoten("html"), activeElement: null,
    addEventListener(){}, removeEventListener(){}, querySelector(){ return null; }, querySelectorAll(){ return []; },
    visibilityState: "visible",
  };
  const store = {
    get(k, d){ return k === "labor" ? (zustand.daten[k] === undefined ? d : zustand.daten[k]) : (zustand.daten[k] === undefined ? d : zustand.daten[k]); },
    initialisieren(daten, schreiber, meldung){ spy.init.push(JSON.parse(JSON.stringify(daten))); zustand.daten = daten; spy.order.push("initialisieren"); },
    markieren(){ spy.order.push("markieren"); },
    sofort(){ spy.sofort++; spy.order.push("sofort"); spy.writer.push(JSON.parse(JSON.stringify(zustand.daten))); return kiThen(true); },
    alles(){ return JSON.parse(JSON.stringify(zustand.daten)); },
  };
  const SpielFake = {
    importPruefen: Spiel.importPruefen,
    VERSION: Spiel.VERSION,
    sicherungAnlegen(roh, erzwingen){ spy.sicherung.push([roh, erzwingen]); spy.order.push("sicherung"); },
    laden(){ spy.laden++; spy.order.push("laden"); zustand.daten.labor = {v: 3, euro: zustand.daten.labor.euro}; },
  };
  const plattform = {name: name, fenster: {}, datei: {
    importieren(){ const t = ctx.__importText; return kiThen(t === undefined ? null : t); },
    exportieren(){ return kiThen(true); },
  }};
  const ctx = {
    console: {log(){}, error(){}, warn(){}}, document: dokument,
    requestAnimationFrame: fn => { fn(0); return 0; }, setTimeout: () => 0, clearTimeout(){}, setInterval: () => 0,
    location: {reload(){ spy.reloads++; spy.order.push("reload"); }},
    store, SPEICHER: {schreiber() {}}, Spiel: SpielFake, Plattform: plattform,
    Bus: {an(){ return () => {}; }, senden(){}}, DATEN: {}, L: {}, LABOR_VERSION: "test",
    eur, zahlDe, heute, datumDe, jetzt,
    __spy: spy, __toasts: spy.toasts, __importText: null, __spielstand: null, __zustand: zustand,
  };
  vm.createContext(ctx);
  const quelle = f => fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8");
  vm.runInContext(quelle("dom.js"), ctx, {filename: "ui/dom.js"});
  vm.runInContext([
    "UI.symbol = (n, g) => h('span', {class: 'sym-' + n});",
    "UI.toast = (t, a, o) => { __toasts.push([t, a, o]); };",
    "UI.app = {einstellungAbschnitt(titel, fn){ if (titel !== 'Spielstand') return; const el = h('div', {}); fn(el); __spielstand = el; }, registrieren(){}, ansicht(){}, aktuell: null};",
    "UI.startHaken = [];",
    "UI.uebergabe = {neuStarten(){ __spy.neu++; __spy.order.push('neuStarten'); }};",
  ].join("\n"), ctx, {filename: "stubs.js"});
  vm.runInContext(quelle("karriere.js"), ctx, {filename: "ui/karriere.js"});
  vm.runInContext("for (const f of UI.startHaken) f();", ctx, {filename: "start.js"});
  return {
    spy, zustand, dokument,
    importText(t){ ctx.__importText = t; },
    abschnitt(){ return ctx.__spielstand; },
    importieren(){ kiKlick(ctx.__spielstand, "Importieren"); },
    ersetzen(){ kiKlick(dokument.body, "Ersetzen und neu laden"); },
  };
}
function kiDaten(v, euro, datum){
  return JSON.stringify({format: "netzwerk-labor", version: "test", datum: datum || "2026-10-30",
    speicher: {labor: {v: v, euro: euro, ruf: 7, erledigt: []}, einst: {klang: false}}});
}

if (KI_LADEN) gruppe("Kern: Import ohne Stand-Rückschritt (KRN-05)", () => {
  pruefe("Tauri: importierter Stand ersetzt den alten ohne Reload und ohne Datenverlust", () => {
    const s = kiStand("tauri");
    s.importText(kiDaten(3, 777));
    s.importieren();
    s.ersetzen();
    erwarte.gleich(s.spy.init.length, 1, "genau ein initialisieren");
    erwarte.gleich(s.spy.init[0].labor.euro, 777, "der importierte Speicher wird gesetzt");
    erwarte.gleich(s.spy.sicherung.length, 1, "Sicherung des Vorzustands");
    erwarte.gleich(s.spy.sicherung[0][0].euro, 100, "gesichert wird der ALTE Stand");
    erwarte.gleich(s.spy.sicherung[0][1], true, "Import sichert erzwungen");
    erwarte.gleich(s.spy.laden, 1, "Spiel.laden baut den neuen Stand im Prozess auf");
    erwarte.gleich(s.spy.reloads, 0, "KEIN Neuladen im Desktop-Programm");
    erwarte.gleich(s.spy.neu, 1, "Ansichten werden in-process neu aufgebaut");
    const i = s.spy.order;
    erwarte.wahr(i.indexOf("initialisieren") < i.indexOf("laden"), "initialisieren vor laden");
    erwarte.wahr(i.indexOf("laden") < i.indexOf("sofort"), "laden vor sofort");
    erwarte.wahr(i.indexOf("sofort") < i.indexOf("neuStarten"), "sofort vor dem Neuaufbau");
    erwarte.gleich(s.spy.writer.length ? s.spy.writer[s.spy.writer.length - 1].labor.euro : null, 777, "geschrieben wird der importierte Stand (kein Altstand)");
  });
  pruefe("Browser: Import lädt weiterhin neu (Reload 1), kein In-Process-Neuaufbau", () => {
    const s = kiStand("browser");
    s.importText(kiDaten(3, 500));
    s.importieren();
    s.ersetzen();
    erwarte.gleich(s.spy.reloads, 1, "Browser lädt neu");
    erwarte.gleich(s.spy.neu, 0, "kein In-Process-Neuaufbau");
    erwarte.gleich(s.spy.laden, 0, "kein Spiel.laden im Browserweg");
    erwarte.wahr(s.spy.sofort >= 1, "vor dem Neuladen wird sofort geschrieben");
  });
  pruefe("Zu neuer Stand wird abgelehnt: Toast, kein Schreiben, kein Reload", () => {
    const s = kiStand("tauri");
    s.importText(kiDaten(Spiel.VERSION + 1, 999));
    s.importieren();
    erwarte.gleich(s.spy.init.length, 0, "kein initialisieren");
    erwarte.gleich(s.spy.sofort, 0, "kein Schreiben");
    erwarte.gleich(s.spy.reloads, 0, "kein Reload");
    erwarte.gleich(s.spy.neu, 0, "kein Neuaufbau");
    erwarte.gleich(s.spy.toasts.length, 1, "genau eine Meldung");
    erwarte.enthaelt(String(s.spy.toasts[0][0]), "neueren Fassung", "Meldung nennt die zu neue Fassung");
  });
  pruefe("Alter Stand (v:2) wird angenommen und migriert (kein Ablehnen)", () => {
    const alt = {format: "netzwerk-labor", version: "2.9.0", datum: "2026-10-01",
      speicher: {labor: {v: 2, euro: 250, erledigt: []}, einst: {}}};
    erwarte.gleich(Spiel.importPruefen(alt).ok, true, "importPruefen lässt alte Stände zu");
    const s = kiStand("tauri");
    s.importText(JSON.stringify(alt));
    s.importieren();
    s.ersetzen();
    erwarte.gleich(s.spy.init[0].labor.v, 2, "der alte Speicher wird übernommen");
    erwarte.gleich(s.spy.laden, 1, "Spiel.laden migriert den alten Stand");
    erwarte.gleich(s.spy.reloads, 0, "kein Reload");
  });
  pruefe("Abbrechen der Dateiauswahl ändert nichts", () => {
    const s = kiStand("tauri");
    s.importText(null);
    s.importieren();
    erwarte.gleich(s.spy.init.length, 0, "kein initialisieren");
    erwarte.gleich(s.spy.toasts.length, 0, "keine Meldung");
    erwarte.gleich(s.dokument.body.kinder.length, 0, "kein Dialog");
  });
  pruefe("ui/uebergabe.js exportiert und führt neuStarten aus", () => {
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const dokument = {
      createElement: tag => kiKnoten(tag), createElementNS: (ns, tag) => kiKnoten(tag),
      createTextNode: t => ({nodeType: 3, textContent: String(t)}),
      body: kiKnoten("body"), documentElement: kiKnoten("html"), activeElement: null,
      addEventListener(){}, removeEventListener(){}, querySelector(){ return null; }, querySelectorAll(){ return []; },
    };
    const toasts = [];
    const ctx = {
      console: {log(){}, error(){}, warn(){}}, document: dokument,
      requestAnimationFrame: fn => { fn(0); return 0; }, setTimeout: () => 0, clearTimeout(){},
      UI: {}, Spiel: {st: {stufe: 1, euro: 0, ruf: 0, erledigt: []}}, store: {set(){}, get(){ return null; }},
      Bus: {an(){}}, LABOR_VERSION: "test", eur, heute, datumDe, jetzt, __toasts: toasts,
    };
    vm.createContext(ctx);
    const quelle = f => fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8");
    vm.runInContext(quelle("dom.js"), ctx, {filename: "ui/dom.js"});
    vm.runInContext("UI.app = {einstellungAbschnitt(){}, dialogZu(){}, aktualisieren(){}, ansicht(){}}; UI.startHaken = []; UI.toast = (t, a) => __toasts.push([t, a]);", ctx, {filename: "stubs.js"});
    vm.runInContext(quelle("uebergabe.js"), ctx, {filename: "ui/uebergabe.js"});
    vm.runInContext("globalThis.__neu = UI.uebergabe.neuStarten;", ctx, {filename: "pruefung.js"});
    erwarte.gleich(typeof ctx.__neu, "function", "neuStarten wird exportiert");
    ctx.__neu();
    erwarte.gleich(toasts.length >= 1, true, "neuStarten meldet den neuen Spielstand");
  });
});
