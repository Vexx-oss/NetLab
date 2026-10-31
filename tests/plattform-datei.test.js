"use strict";
/* KRN-04: DATEI-API EHRLICH (task-84)
   Browser: Import bei Abbruch löst mit null auf (früher blieb das Versprechen EWIG offen);
   Export meldet true nur, wenn der Übergabeweg ohne Fehler durchlief, sonst ehrlich false.
   Tauri: invoke-Fehler/Abbruch werden abgefangen (kein unbehandeltes Promise, kein Hänger):
   Import-Abbruch/Fehler → null, Export-Abbruch (Ok(false))/Fehler → false; Bus-Ereignis
   "datei-fehler" nennt Art und Grund.
   Die echten Adapter werden in vm-Bereichen geladen; für den SYNCHRONEN Nachweis bekommen sie dort
   eine synchrone Promise-Attrappe (nur Testumgebung — Produktion nutzt die echte Promise). */
const PD_FS = require("fs"), PD_PATH = require("path"), PD_VM = require("vm");
const PD_QUELLE = n => PD_FS.readFileSync(PD_PATH.join(__dirname, "..", "src", "plattform", n), "utf8");
class PDThenbar {
  constructor(fn){ this.wert = undefined; this.grund = undefined; this.ok = false; this.fehler = false; this._t = []; this._c = [];
    fn(v => this._loese(v), e => this._abweisen(e)); }
  static resolve(v){ return new PDThenbar(res => res(v)); }
  static reject(e){ return new PDThenbar((res, rej) => rej(e)); }
  _loese(v){ this.ok = true; this.wert = v; for (const fn of this._t) this.wert = fn(this.wert); this._t = []; }
  _abweisen(e){ this.grund = e; if (this._c.length) { const fn = this._c.shift(); this.fehler = false; this.ok = true; this.wert = fn(e); } else this.fehler = true; }
  then(fn){ if (this.ok) this.wert = fn(this.wert); else if (!this.fehler) this._t.push(fn); return this; }
  catch(fn){ if (this.fehler) { this.fehler = false; this.ok = true; this.wert = fn(this.grund); } else if (!this.ok) this._c.push(fn); return this; }
}
function pdDokument() {
  const felder = [];
  const knoten = tag => ({tag: tag, type: "", files: [], listeners: {}, click(){}, remove(){}, append(){},
    addEventListener(art, fn){ this.listeners[art] = fn; }});
  return {felder: felder,
    createElement: tag => { const el = knoten(tag); felder.push(el); return el; },
    createElementNS: (ns, tag) => knoten(tag), createTextNode: t => ({textContent: String(t)}),
    body: {append(){}}, documentElement: {append(){}},
    addEventListener(){}, removeEventListener(){}, querySelector(){ return null; }};
}
function pdBrowser() {
  const ctx = {console: {log(){}, warn(){}, error(){}}, setTimeout: () => 0, clearTimeout(){},
    Promise: PDThenbar, String, Object, Array, JSON, Error, Math, Date, isFinite, Number,
    Blob: function Blob(teile){ this.teile = teile; },
    URL: {createObjectURL: () => "blob:test", revokeObjectURL(){}},
    Bus: {gesendet: [], senden(name, daten){ this.gesendet.push([name, daten]); }}};
  PD_VM.createContext(ctx);
  PD_VM.runInContext(PD_QUELLE("plattform-browser.js") + "\n;globalThis.__ADAPTER = PlattformBrowser;", ctx, {filename: "plattform-browser.js"});
  ctx.document = pdDokument();
  return {adapter: ctx.__ADAPTER, ctx: ctx, dokument: ctx.document};
}
function pdTauri(invoke) {
  const ctx = {console: {log(){}, warn(){}, error(){}}, setTimeout: () => 0, clearTimeout(){},
    Promise: PDThenbar, String, Object, Array, JSON, Error, Math, Date, isFinite, Number,
    window: {__TAURI__: {core: {invoke: invoke}, event: {listen(){}}}, addEventListener(){}},
    document: {readyState: "complete", addEventListener(){}, documentElement: {dataset: {}}, title: "x"},
    store: {get(){ return {}; }},
    Bus: {gesendet: [], senden(name, daten){ this.gesendet.push([name, daten]); }}};
  PD_VM.createContext(ctx);
  PD_VM.runInContext(PD_QUELLE("plattform-tauri.js") + "\n;globalThis.__ADAPTER = PlattformTauri;", ctx, {filename: "plattform-tauri.js"});
  return {adapter: ctx.__ADAPTER, ctx: ctx};
}
if (typeof require === "function") gruppe("Kern: Datei-API ehrlich (KRN-04)", () => {
  pruefe("Browser-Import: Abbruch löst mit null auf (kein ewiges Warten)", () => {
    const b = pdBrowser();
    let wert = "nicht-aufgeloest";
    b.adapter.datei.importieren().then(v => { wert = v; });
    const feld = b.dokument.felder.filter(f => f.type === "file").pop();
    erwarte.wahr(!!feld, "Adapter legt ein Dateifeld an");
    erwarte.gleich(wert, "nicht-aufgeloest", "vor dem Abbruch ist das Versprechen offen");
    feld.listeners.cancel && feld.listeners.cancel();
    erwarte.gleich(wert, null, "Abbruch meldet null (früher: nie aufgelöst)");
  });
  pruefe("Browser-Import: Datei wird gelesen; Lesefehler meldet null", () => {
    const b = pdBrowser();
    const DateiLeser = function(){ this.onload = null; this.onerror = null; this.error = null; this.result = null;
      this.readAsText = f => { this.result = f.inhalt; if (f.kaputt) { this.error = new Error("Lesefehler"); this.onerror && this.onerror(); } else { this.onload && this.onload(); } }; };
    b.ctx.FileReader = DateiLeser;
    let wert = "offen";
    b.adapter.datei.importieren().then(v => { wert = v; });
    const feld = b.dokument.felder.filter(f => f.type === "file").pop();
    feld.files = [{inhalt: "{\"ok\":1}"}];
    feld.onchange();
    erwarte.gleich(wert, "{\"ok\":1}", "Dateiinhalt kommt an");
    let kaputt = "offen";
    b.adapter.datei.importieren().then(v => { kaputt = v; });
    const feld2 = b.dokument.felder.filter(f => f.type === "file").pop();
    feld2.files = [{inhalt: "", kaputt: true}];
    feld2.onchange();
    erwarte.gleich(kaputt, null, "Lesefehler wird ehrlich null");
  });
  pruefe("Browser-Export: Erfolg true, Fehler im Übergabeweg ehrlich false", () => {
    const b = pdBrowser();
    let wert = undefined;
    b.adapter.datei.exportieren("x.json", "{}").then(v => { wert = v; });
    erwarte.gleich(wert, true, "ohne Fehler true");
    const k = pdBrowser();
    k.ctx.URL = {createObjectURL(){ throw new Error("kaputt"); }, revokeObjectURL(){}};
    let wert2 = undefined;
    k.adapter.datei.exportieren("x.json", "{}").then(v => { wert2 = v; });
    erwarte.gleich(wert2, false, "Fehler ergibt ehrlich false");
  });
  pruefe("Tauri-Import: Abbruch (null) und invoke-Fehler werden zu null + Bus-Meldung", () => {
    const a = pdTauri(() => PDThenbar.resolve(null));
    let wertA = "offen";
    a.adapter.datei.importieren().then(v => { wertA = v; });
    erwarte.gleich(wertA, null, "Abbruch ist null");
    const b = pdTauri(() => PDThenbar.reject(new Error("Dialog kaputt")));
    let wertB = "offen";
    b.adapter.datei.importieren().then(v => { wertB = v; });
    erwarte.gleich(wertB, null, "invoke-Fehler wird null statt unbehandelter Ablehnung");
    erwarte.wahr(b.ctx.Bus.gesendet.some(e => e[0] === "datei-fehler" && e[1].art === "import"), "Bus meldet den Import-Fehler");
    const c = pdTauri(() => { throw new Error("synchron"); });
    let wertC = "offen";
    c.adapter.datei.importieren().then(v => { wertC = v; });
    erwarte.gleich(wertC, null, "auch ein synchroner Wurf hängt nicht");
  });
  pruefe("Tauri-Export: nur echtes Ok(true) ist true; Abbruch/Fehler sind false + Bus", () => {
    const a = pdTauri(() => PDThenbar.resolve(true));
    let wertA = undefined;
    a.adapter.datei.exportieren("x.json", "{}").then(v => { wertA = v; });
    erwarte.gleich(wertA, true, "geschrieben = true");
    const b = pdTauri(() => PDThenbar.resolve(false));
    let wertB = undefined;
    b.adapter.datei.exportieren("x.json", "{}").then(v => { wertB = v; });
    erwarte.gleich(wertB, false, "Abbruch (Ok(false)) ist false, kein stilles Ja");
    const c = pdTauri(() => PDThenbar.reject(new Error("Schreibfehler")));
    let wertC = undefined;
    c.adapter.datei.exportieren("x.json", "{}").then(v => { wertC = v; });
    erwarte.gleich(wertC, false, "Schreibfehler ist false");
    erwarte.wahr(c.ctx.Bus.gesendet.some(e => e[0] === "datei-fehler" && e[1].art === "export"), "Bus meldet den Export-Fehler");
  });
});
