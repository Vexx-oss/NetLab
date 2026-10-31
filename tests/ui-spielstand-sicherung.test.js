"use strict";
/* TASK-33 / SPL-02b (W2): Sicherung im Abschnitt „Spielstand“ wiederherstellen.
   Befund (berichte/spiel-core.md § SPL-02): Die Sicherung wurde geschrieben, aber nie gelesen —
   es gab keinen Weg zurück. Hier wird der ECHTE UI-Weg geprüft: src/ui/karriere.js in einem
   eigenen vm-Bereich (Bauart tests/kern-import.test.js), aber mit dem ECHTEN Spielstand
   (store/Spiel aus dem Testbereich) — die Wiederherstellung wirkt also wirklich.
   Verbindlich (Lead): Datum aus Spiel.sicherung().zeit VOR dem Aufruf lesen (danach ist die
   Sicherung verbraucht); Aufrufpfad Spiel.sicherungWiederherstellen( in src/ui. */
const US_LADEN = (() => {
  try { return typeof require === "function" && typeof Spiel === "object" && Spiel !== null && typeof document === "undefined"; }
  catch (e) { return false; }
})();

/* ================= DOM-Ersatz (nur so viel, wie karriere.js im Spielstand-Abschnitt braucht) ================= */
function usKnoten(tag){
  const el = {
    nodeType: 1, tag, kinder: [], listeners: {}, attrs: {}, className: "", _text: "", parentNode: null,
    style: {setProperty(){}, removeProperty(){}, getPropertyValue(){ return ""; }},
    /* W2-05: echte DOM-Semantik — append(null) erzeugt sichtbaren Text „null“. Genau dieser Fall
       (bedingtes Anhängen im Sicherung-Leerzustand) soll im Test auffallen, nicht verdeckt werden. */
    append(...k){ for (const x of k) { if (x == null) { el.kinder.push({nodeType: 3, textContent: String(x)}); continue; } if (typeof x === "object") x.parentNode = el; el.kinder.push(x); } },
    replaceChildren(...k){ el.kinder = []; el.append(...k); },
    remove(){ if (el.parentNode) el.parentNode.kinder = el.parentNode.kinder.filter(x => x !== el); },
    setAttribute(k, v){ el.attrs[k] = String(v); },
    getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
    removeAttribute(k){ delete el.attrs[k]; },
    addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
    querySelector(){ return null; }, querySelectorAll(){ return []; },
    classList: {add(){}, remove(){}, toggle(){}, contains(){ return false; }},
    set textContent(v){ el._text = String(v); el.kinder = []; },
    get textContent(){ return el.kinder.length ? el.kinder.map(usText).join("") : el._text; },
  };
  return el;
}
function usText(k){ return k == null ? "" : typeof k === "string" ? k : (k.textContent || ""); }
function usAlle(el, raus = []){ for (const k of el.kinder || []) if (k && k.tag) { raus.push(k); usAlle(k, raus); } return raus; }
function usKnopf(el, text){
  return usAlle(el).find(k => (k.listeners.click || []).length && String(k.textContent).includes(text)) || null;
}
function usThen(wert){ return {then(fn){ fn(wert); return this; }, catch(){ return this; }}; }

/* ================= Kapsel: echter Speicher, alles danach zurück ================= */
function usKapsel(fn){
  const alt = {speicher: store.alles(), schreiber: SPEICHER.schreiber, st: Spiel._st, einst: Spiel._einst,
    lz: Spiel._lz, trocken: Spiel._trocken, uhr: jetzt()};
  try {
    Spiel._trocken = true; Spiel._lz = {};
    return fn();
  } finally {
    if (SPEICHER.timer) { clearTimeout(SPEICHER.timer); SPEICHER.timer = null; }
    for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
    Object.assign(SPEICHER.daten, alt.speicher);
    SPEICHER.schreiber = alt.schreiber; SPEICHER.schmutzig = false; SPEICHER.fehler = null;
    Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
    jetzt.setzen(alt.uhr); jetzt.frei();
  }
}

/* ================= Prüfstand: echter karriere.js-Code im vm-Bereich ================= */
const US_T = Date.UTC(2026, 9, 10, 9, 0, 0);          /* feste Uhr: 10.10.2026 */
function usStand(){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const toasts = [];
  const dokument = {
    createElement: tag => usKnoten(tag), createElementNS: (ns, tag) => usKnoten(tag),
    createTextNode: t => ({nodeType: 3, textContent: String(t)}),
    body: usKnoten("body"), documentElement: usKnoten("html"), activeElement: null,
    addEventListener(){}, removeEventListener(){}, querySelector(){ return null; }, querySelectorAll(){ return []; },
    visibilityState: "visible",
  };
  const plattform = {name: "browser", fenster: {}, datei: {
    importieren(){ return usThen(null); }, exportieren(){ return usThen(true); }}};
  const ctx = {
    console: {log(){}, error: (...a) => console.error(...a), warn(){}},
    document: dokument,
    requestAnimationFrame: fn => { fn(0); return 0; }, setTimeout: () => 0, clearTimeout(){}, setInterval: () => 0,
    location: {reload(){ throw new Error("darf im Test nicht neu laden"); }},
    store, SPEICHER, Spiel, Plattform: plattform, Bus: {an(){ return () => {}; }, senden(){}},
    DATEN, L: (typeof L !== "undefined" ? L : {}), LABOR_VERSION: "test",
    eur, zahlDe, heute, datumDe, jetzt,
    __toasts: toasts,
  };
  vm.createContext(ctx);
  const quelle = f => fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8");
  vm.runInContext(quelle("dom.js"), ctx, {filename: "ui/dom.js"});
  vm.runInContext([
    "UI.symbol = (n, g) => h('span', {class: 'sym-' + n});",
    "UI.toast = (t, a, o) => { __toasts.push([t, a, o]); };",
    "UI.app = {einstellungAbschnitt(titel, fn){ if (titel !== 'Spielstand') return; const el = h('div', {}); fn(el); __abschnitt = el; }, registrieren(){}, ansicht(){}, aktuell: null};",
    "UI.startHaken = [];",
    "UI.uebergabe = {neuStarten(){}};",
  ].join("\n"), ctx, {filename: "stubs.js"});
  vm.runInContext(quelle("karriere.js"), ctx, {filename: "ui/karriere.js"});
  vm.runInContext("for (const f of UI.startHaken) f();", ctx, {filename: "start.js"});
  return {toasts, dokument, abschnitt: () => ctx.__abschnitt};
}
const US_A = () => Object.assign(Spiel.leererStand(), {euro: 42, ruf: 7, fremd: {x: 1}});
const US_B = () => Object.assign(Spiel.leererStand(), {euro: 9, ruf: 1});
/* Laufender Stand B, Sicherung A liegt vor (Zustand nach einem Import). */
function usMitSicherung(){
  store.initialisieren({labor: tief(US_B()), einst: {}}, () => Promise.resolve(true), null);
  Spiel._st = null;
  Spiel.laden();
  jetzt.setzen(US_T);
  Spiel.sicherungAnlegen(tief(US_A()), true);
  Spiel._st = null;
  Spiel.laden();
}

if (!US_LADEN) {
  pruefe("Spielstand-Sicherung: nur unter node tests/run.js prüfbar", () => { erwarte.wahr(false, "require fehlt"); });
} else gruppe("UI: Spielstand-Sicherung (SPL-02b)", () => {

  pruefe("Spielstand: ohne Sicherung gibt es KEINEN Wiederherstellen-Knopf (ehrlich)", () => usKapsel(() => {
    store.initialisieren({labor: tief(US_B()), einst: {}}, () => Promise.resolve(true), null);
    Spiel._st = null; Spiel.laden();
    store.set(Spiel.SICHERUNG, null);
    const s = usStand();
    const el = s.abschnitt();
    erwarte.wahr(!!el, "der Abschnitt „Spielstand“ ist gebaut");
    erwarte.wahr(!!usKnopf(el, "Exportieren") && !!usKnopf(el, "Importieren"), "Export und Import bleiben");
    erwarte.gleich(usKnopf(el, "Sicherung wiederherstellen"), null, "ohne Sicherung kein Knopf");
  }));

  pruefe("Spielstand: Sicherung vorhanden → Knopf mit Datum, Klick stellt wieder her, zweiter Ruf meldet „keine Sicherung“", () => usKapsel(() => {
    usMitSicherung();
    const s = usStand();
    let rufe = 0;
    const echt = Spiel.sicherungWiederherstellen;
    Spiel.sicherungWiederherstellen = () => { rufe++; return echt(); };
    try {
      const el = s.abschnitt();
      const knopf = usKnopf(el, "Sicherung wiederherstellen");
      erwarte.wahr(!!knopf, "die Sicherung bietet einen Weg zurück");
      erwarte.enthaelt(String(el.textContent), "10.10.2026", "das Datum der Sicherung steht dabei (vor dem Aufruf gelesen)");
      knopf.listeners.click[0]({currentTarget: knopf, target: knopf, preventDefault(){}, stopPropagation(){}});
      erwarte.gleich(rufe, 1, "der Klick ruft Spiel.sicherungWiederherstellen");
      erwarte.gleich(Spiel.sicherung(), null, "die Sicherung ist verbraucht (Einmal-Rückweg)");
      erwarte.gleich(Spiel.st.euro, 42, "der gesicherte Stand läuft wieder (Euro 42)");
      erwarte.gleich(JSON.parse(JSON.stringify(store.get("labor", null))).euro, 42, "und steht sofort im Speicher");
      erwarte.enthaelt(s.toasts.map(t => String(t[0])).join(" | "), "wiederhergestellt", "ein Toast bestätigt die Wiederherstellung");
      erwarte.enthaelt(s.toasts.map(t => String(t[0])).join(" | "), "10.10.2026", "der Toast nennt das Datum von VOR dem Verbrauch");
      erwarte.gleich(usKnopf(el, "Sicherung wiederherstellen"), null, "nach Erfolg ist der Knopf weg (Sicherung verbraucht)");
      knopf.listeners.click[0]({currentTarget: knopf, target: knopf, preventDefault(){}, stopPropagation(){}});
      erwarte.gleich(rufe, 2, "auch der zweite Klick geht über die API");
      erwarte.enthaelt(s.toasts.map(t => String(t[0])).join(" | "), "keine Sicherung", "der zweite Ruf meldet ehrlich „keine Sicherung“");
      erwarte.gleich(Spiel.st.euro, 42, "der zweite Ruf ändert den Stand nicht");
    } finally { Spiel.sicherungWiederherstellen = echt; }
  }));

  /* W2-05 (vision P2): Der Leerzustand „keine Sicherung“ zeigte sichtbar „null“ (bedingtes
     append(null)). Der Abschnitt darf nur vorhandene Zeilen anhängen. */
  pruefe("Spielstand-Leerzustand: ohne Sicherung steht kein „null“ im DOM (W2-05)", () => usKapsel(() => {
    store.initialisieren({labor: tief(US_B()), einst: {}}, () => Promise.resolve(true), null);
    Spiel._st = null; Spiel.laden();
    store.set(Spiel.SICHERUNG, null);
    const s = usStand();
    const el = s.abschnitt();
    const text = String(el.textContent);
    erwarte.falsch(text.includes("null"), "kein „null“ im Leerzustand: " + text);
    erwarte.enthaelt(text, "Exportieren", "der Abschnitt bleibt benutzbar");
    erwarte.wahr(usKnopf(el, "Sicherung wiederherstellen") === null, "kein Wiederherstellen-Knopf ohne Sicherung");
  }));

  pruefe("Spielstand: Fehlerfall (zu neue Sicherung) bleibt stehen, Knopf bleibt, Stand unverändert", () => usKapsel(() => {
    store.initialisieren({labor: tief(US_B()), einst: {}}, () => Promise.resolve(true), null);
    Spiel._st = null; Spiel.laden();
    store.set(Spiel.SICHERUNG, {v: Spiel.VERSION + 1, zeit: US_T, stand: {v: Spiel.VERSION + 1, euro: 1}});
    const s = usStand();
    const el = s.abschnitt();
    const knopf = usKnopf(el, "Sicherung wiederherstellen");
    erwarte.wahr(!!knopf, "auch eine unbrauchbare Sicherung wird angeboten (kein stilles Löschen)");
    knopf.listeners.click[0]({currentTarget: knopf, target: knopf, preventDefault(){}, stopPropagation(){}});
    const toast = s.toasts.map(t => String(t[0])).join(" | ");
    erwarte.enthaelt(toast, "neueren Fassung", "der Fehler nennt den Grund");
    erwarte.wahr(!!store.get(Spiel.SICHERUNG, null), "die Sicherung bleibt im Speicher liegen");
    erwarte.gleich(Spiel.st.euro, 9, "der laufende Stand bleibt unangetastet");
    erwarte.wahr(!!usKnopf(el, "Sicherung wiederherstellen"), "der Knopf bleibt für einen zweiten Versuch");
  }));

});
