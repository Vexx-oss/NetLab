"use strict";
/* DIE FLÄCHE DARF NIE VERALTETES ZEIGEN (task-45).
   Nutzerbefund: „Die Topologie wird nicht immer gewechselt wenn man den Auftrag wechselt — nur die
   Auftragszeile oben wechselt, die Fläche nicht." Die Leitung hat den Ladeweg gemessen und
   ausgeschlossen (58/58 Aufträge zeigen das geführte Netz) — die MÖGLICHKEIT im Code wird hier
   zugemacht: `src/ui/editor.js` darf nie halb zeichnen und muss nachziehen, wenn das Labor wieder
   sichtbar wird. Geprüft wird am echten Modul in einem eigenen Bereich mit DOM-Ersatz
   (Bauart von tests/spiel-einstieg-stufe.test.js und tests/ui-klassenraum-tastatur.test.js).

   Drei Fälle, ihre Zahl steht in der Registrierung (`FAELLE`), nicht fest im Text:
     1 · veraltete Zeichnung: Netz A gezeichnet, `Z.netz` auf B gesetzt, Labor wird sichtbar → B.
     2 · Fehler beim Zeichnen: keine alte Topologie, sichtbarer Hinweis.
     3 · alle Handaufträge (Zahl aus `DATEN.tickets`): jeder landet vollständig auf der Fläche. */

(function(){
function flHatRequire(){ try { return typeof require === "function"; } catch (e) { return false; } }

/* ---------------- Allein lauffähig ---------------- */
function flAlleinLaden(){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const W = path.resolve(__dirname, ".."), SRC = path.join(W, "src");
  const SCH = [["kern", ["basis.js", "netz.js"]], ["@lernmotor", []], ["modell", ["geraete.js"]], ["sim", ["engine.js"]],
               ["cli", ["parser.js"]], ["daten", ["basis.js"]], ["spiel", ["zustand.js"]]];
  const LM = [path.resolve(W, "..", "FISI-Spielhalle", "src", "lernmotor.js"), path.join(W, "fremd", "lernmotor.js")].find(f => fs.existsSync(f));
  const KOPF = /^\/\*\s*=+[\s\S]*?=+\s*\*\/\s*/;
  const code = ['"use strict"; const LABOR_VERSION = "test";'];
  for (const [ordner, kopf] of SCH) {
    if (ordner === "@lernmotor") { let t = fs.readFileSync(LM, "utf8"); if (LM.includes("fremd")) t = t.replace(KOPF, ""); code.push(t); continue; }
    const d = path.join(SRC, ordner), alle = fs.readdirSync(d).filter(n => n.endsWith(".js")).sort();
    for (const n of [...kopf.filter(x => alle.includes(x)), ...alle.filter(x => !kopf.includes(x))]) code.push(fs.readFileSync(path.join(d, n), "utf8"));
  }
  code.push(fs.readFileSync(path.join(__dirname, "harness.js"), "utf8"));
  code.push(fs.readFileSync(__filename, "utf8"));
  code.push("testsAusfuehren();");
  const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename, process});
  let ergebnisse;
  try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "ui-editor-flaeche.test.js"}); }
  catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
  const rot = ergebnisse.filter(e => !e.ok);
  for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
  console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
  process.exit(rot.length ? 1 : 0);
}
if (typeof Spiel === "undefined" && typeof document === "undefined" && flHatRequire()) { flAlleinLaden(); return; }

const FL_KANN_LADEN = (() => {
  try { return flHatRequire() && typeof document === "undefined" && typeof Spiel === "object" && Spiel !== null; }
  catch (e) { return false; }
})();
const FL_ZUSATZ = FL_KANN_LADEN ? "" : " (kein require im Testbereich – nur unter node tests/run.js)";

/* ================= DOM-Ersatz (nur im Prüfstand) ================= */
function flKlassen(el){ return String(el.attrs.class || "").split(/\s+/).filter(Boolean); }
function flText(k){ return k == null ? "" : typeof k === "string" ? k : String(k.textContent == null ? "" : k.textContent); }
function flPasst(el, sel){
  let s = String(sel).trim(); if (!s || !el || !el.tag) return false;
  const nicht = [];
  s = s.replace(/:not\(([^)]*)\)/g, (m, innen) => { nicht.push(innen.trim()); return ""; });
  let ok;
  if (/^[a-z][a-z0-9]*$/i.test(s)) ok = el.tag === s;
  else {
    const teile = s.match(/\.[\w-]+|\[[^\]]+\]/g) || [];
    ok = teile.length > 0 && teile.every(t => {
      if (t.startsWith(".")) return flKlassen(el).includes(t.slice(1));
      const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(t);
      if (!m) return false;
      const wert = m[1] === "hidden" ? (el.hidden ? "" : undefined) : el.attrs[m[1]];
      return m[2] === undefined ? wert !== undefined : String(wert) === m[2];
    });
  }
  if (!ok) return false;
  for (const n of nicht) for (const t of (n.match(/\.[\w-]+|\[[^\]]+\]/g) || [])) {
    if (t.startsWith(".") && flKlassen(el).includes(t.slice(1))) return false;
    const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(t);
    if (m && m[2] === undefined && el.attrs[m[1]] !== undefined) return false;
  }
  return true;
}
function flFinde(el, sel){
  const treffer = [];
  for (const teil of String(sel).split(",")) {
    const s = teil.trim(); if (!s) continue;
    const lauf = k => { for (const x of (k.kinder || [])) if (x && x.tag) { if (flPasst(x, s)) treffer.push(x); lauf(x); } };
    lauf(el);
  }
  return treffer;
}
function flKnoten(tag){
  const el = {
    nodeType: 1, tag, kinder: [], attrs: {}, dataset: {}, listeners: {}, _text: "", hidden: false, disabled: false, value: "",
    parentNode: null, __imBaum: false,
    style: {setProperty(){}, removeProperty(){}, getPropertyValue(){ return ""; }},
    append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.parentNode = el; el.kinder.push(x); } },
    prepend(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.parentNode = el; el.kinder.unshift(x); } },
    replaceChildren(...k){ el.kinder = []; el.append(...k); },
    replaceWith(neu){ if (el.parentNode) { const i = el.parentNode.kinder.indexOf(el); if (typeof neu === "object") neu.parentNode = el.parentNode; if (i >= 0) el.parentNode.kinder.splice(i, 1, neu); } },
    remove(){ if (el.parentNode) { el.parentNode.kinder = el.parentNode.kinder.filter(x => x !== el); el.parentNode = null; } },
    contains(x){ let p = x; while (p) { if (p === el) return true; p = p.parentNode; } return false; },
    closest(sel){ let p = el; while (p) { if (p.tag && flPasst(p, sel)) return p; p = p.parentNode; } return null; },
    setAttribute(k, v){ el.attrs[k] = String(v); if (k.startsWith("data-")) el.dataset[k.slice(5).replace(/-(\w)/g, (x, c) => c.toUpperCase())] = String(v); if (k === "hidden") el.hidden = true; },
    getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
    hasAttribute(k){ return el.attrs[k] !== undefined; },
    removeAttribute(k){ delete el.attrs[k]; if (k === "hidden") el.hidden = false; },
    addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
    removeEventListener(art, fn){ if (el.listeners[art]) el.listeners[art] = el.listeners[art].filter(x => x !== fn); },
    focus(){ DOK.activeElement = el; }, blur(){ if (DOK.activeElement === el) DOK.activeElement = null; },
    select(){}, setSelectionRange(){}, scrollIntoView(){},
    getClientRects(){ return [{width: 900, height: 600, left: 0, top: 0, right: 900, bottom: 600}]; },
    getBoundingClientRect(){ return {width: 900, height: 600, left: 0, top: 0, right: 900, bottom: 600}; },
    querySelector(sel){ return flFinde(el, sel)[0] || null; },
    querySelectorAll(sel){ return flFinde(el, sel); },
    get className(){ return el.attrs.class || ""; },
    set className(v){ el.attrs.class = String(v); },
    get classList(){
      return {
        add(...k){ const l = flKlassen(el); for (const x of k) if (!l.includes(x)) l.push(x); el.attrs.class = l.join(" "); },
        remove(...k){ el.attrs.class = flKlassen(el).filter(x => !k.includes(x)).join(" "); },
        contains: x => flKlassen(el).includes(x),
        toggle(x, an){ const drin = flKlassen(el).includes(x), soll = an === undefined ? !drin : !!an; if (soll) el.classList.add(x); else el.classList.remove(x); return soll; },
      };
    },
    set textContent(v){ el._text = String(v); el.kinder = []; },
    get textContent(){ return el.kinder.length ? el.kinder.map(flText).join("") : el._text; },
    get children(){ return el.kinder.filter(k => k && k.tag); },
    get childNodes(){ return el.kinder; },
    get firstChild(){ return el.kinder[0] || null; },
    get lastElementChild(){ return el.kinder.filter(k => k && k.tag).slice(-1)[0] || null; },
    get isConnected(){ let p = el; while (p.parentNode) p = p.parentNode; return !!p.__imBaum; },
  };
  return el;
}
let DOK = null;
function flDokument(){
  const body = flKnoten("body"); body.__imBaum = true;
  DOK = {
    body, documentElement: flKnoten("html"), activeElement: null, listeners: {},
    createElement: t => flKnoten(t), createElementNS: (ns, t) => flKnoten(t),
    createTextNode: t => ({nodeType: 3, textContent: String(t)}),
    getElementById: id => flFinde(body, "#" + id)[0] || null,
    querySelector: sel => flFinde(body, sel)[0] || null,
    querySelectorAll: sel => flFinde(body, sel),
    addEventListener(art, fn){ (DOK.listeners[art] ||= []).push(fn); },
    removeEventListener(art, fn){ if (DOK.listeners[art]) DOK.listeners[art] = DOK.listeners[art].filter(x => x !== fn); },
  };
  return DOK;
}

/* Nur für die VORHER-Messung von Hand: `FL_EDITOR_REF=HEAD node tests/ui-editor-flaeche.test.js`
   lädt `src/ui/editor.js` aus dieser Git-Fassung statt aus dem Arbeitsbaum (lesend, kein Schreiben).
   Unter `node tests/run.js` gibt es kein `process` — dort wird immer der Arbeitsbaum geladen. */
const FL_QUELLE = (() => {
  try {
    if (typeof process === "undefined" || !process.env || !process.env.FL_EDITOR_REF) return null;
    return require("child_process").execFileSync("git", ["show", process.env.FL_EDITOR_REF + ":src/ui/editor.js"], {encoding: "utf8"});
  } catch (e) { return null; }
})();

/* ================= Prüfstand =================
   Eigener Bus im Bereich: `Bus.senden("ansicht", …)` erreicht genau die Hörer DIESES Bereichs und
   stört keine fremden Tests (app.js:102 sendet dasselbe Ereignis im Programm). */
function flStand(){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const dok = flDokument();
  const haken = {}, fehler = [];
  const Bus = {
    an(art, fn){ (haken[art] ||= []).push(fn); return () => { haken[art] = (haken[art] || []).filter(f => f !== fn); }; },
    aus(art, fn){ haken[art] = (haken[art] || []).filter(f => f !== fn); },
    senden(art, d){ for (const fn of (haken[art] || []).slice()) { try { fn(d); } catch (e) { fehler.push(String(e && e.message || e)); } } },
  };
  const bereich = {
    console: {log(){}, error(){}, warn(){}, info(){}},
    document: dok, innerWidth: 1280, innerHeight: 800, matchMedia: undefined,
    requestAnimationFrame: fn => { try { fn(0); } catch (e) { fehler.push(String(e && e.message || e)); } return 0; },
    setTimeout: () => 0, clearTimeout(){}, setInterval: () => 0, clearInterval(){},
    performance: {now: () => 0}, Math, JSON, Intl, Date,
    Modell, DATEN, Bus, store, Spiel, UI: undefined,
    /* Die Kern-Globale, die ui/ebenen.js und ui/geraetebilder.js beim Zeichnen brauchen (im Programm
       kommen sie aus src/kern/basis.js und src/kern/netz.js). */
    L, IP, eur, zahlDe, heute, datumDe, jetzt, klemme,
    getComputedStyle: () => ({overflowX: "visible", overflowY: "visible", zIndex: "auto", visibility: "visible", display: "block"}),
  };
  vm.createContext(bereich);
  const lies = rel => fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
  vm.runInContext(lies("src/ui/dom.js"), bereich, {filename: "src/ui/dom.js"});
  const UI = vm.runInContext("UI", bereich);
  if (!UI || typeof UI !== "object") throw new Error("src/ui/dom.js hat kein UI angelegt");
  /* Nur das Nötigste nebenbei; gezeichnet wird mit dem ECHTEN editor.js. */
  UI.symbol = () => flKnoten("span");
  UI.toast = () => {};
  UI.toast.zu = () => {};
  UI.menue = () => flKnoten("div");
  UI.bewegung = () => "aus";                     /* ohne Animationspfade: kein Bedarf an Zeiten */
  UI.klang = {spielen(){}};
  UI.juice = () => {};
  UI.inspektor = null; UI.simpanel = null; UI.konsole = null; UI.terminal = null;
  UI.laborFach = null; UI.laborWerkzeuge = null; UI.laborPakete = null;
  vm.runInContext(lies("src/ui/geraetebilder.js"), bereich, {filename: "src/ui/geraetebilder.js"});
  vm.runInContext(lies("src/ui/ebenen.js"), bereich, {filename: "src/ui/ebenen.js"});
  vm.runInContext(FL_QUELLE || lies("src/ui/editor.js"), bereich, {filename: "src/ui/editor.js"});
  if (!UI.labor || typeof UI.labor.zeigen !== "function") throw new Error("src/ui/editor.js hat sich nicht als UI.labor angemeldet");
  const container = flKnoten("div"); dok.body.append(container);
  const rufen = (code, name) => vm.runInContext(code, bereich, {filename: name || "pruefstand"});
  return {
    UI, dok, container, bereich, fehler, rufen,
    zeigen(){ UI.labor.zeigen(container); },
    laden(netz){ UI.labor.laden(netz); },
    ansicht(name){ Bus.senden("ansicht", name); },
    gezeichnet(){ return rufen("UI.labor._.s.geraete.querySelectorAll('g[data-id]').map(g => g.getAttribute('data-id'))"); },
    hinweis(){ return rufen("String(UI.labor._.el.hinweis ? UI.labor._.el.hinweis.textContent : '')"); },
    zonenBrechen(){ rufen("globalThis.__flZonen = UI.ebenen.zonen; UI.ebenen.zonen = () => { throw new Error('Probe: zonen kaputt'); };"); },
    zonenReparieren(){ rufen("if (globalThis.__flZonen) UI.ebenen.zonen = globalThis.__flZonen;"); },
    abmelden(){ for (const art of Object.keys(haken)) { haken[art] = []; } },
  };
}

/* Die Fälle stehen hier — die Zahl im Bericht kommt aus dieser Liste. */
const FAELLE = ["1 · Veraltete Zeichnung wird nachgezogen", "2 · Fehler lässt keine alte Topologie stehen", "3 · Alle Handaufträge landen vollständig auf der Fläche"];

gruppe("UI: Die Fläche zeigt nie Veraltetes" + FL_ZUSATZ, () => {
  if (!FL_KANN_LADEN) {
    pruefe("UI-Fläche: nur unter node tests/run.js prüfbar", () => { erwarte.wahr(false, "require fehlt"); });
    return;
  }
  /* Kapsel: eigener Wegwerf-Stand für die echten `Spiel.instanzErstellen`-Aufrufe. */
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    const welten = [];
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand();
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn(welten);
    } finally {
      for (const w of welten) w.abmelden();
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      if (jetzt && typeof jetzt.frei === "function") jetzt.frei();
    }
  };
  const netzVon = id => Spiel.instanzErstellen({ticketId: id}).netz;

  pruefe(FAELLE[0], kapsel(welten => {
    const w = flStand(); welten.push(w);
    const a = netzVon("salon-01");
    /* Netz B als Abzug von A ohne EIN Gerät: die Menge der `data-id` unterscheidet sich damit sicher —
       die Handaufträge teilen sich dieselbe Geräteschar (gemessen: salon-01 und salon-02 sind gleich). */
    const b = JSON.parse(JSON.stringify(a));
    const weg = Object.keys(b.geraete)[0];
    delete b.geraete[weg];
    b.kabel = (b.kabel || []).filter(k => k.a.geraet !== weg && k.b.geraet !== weg);
    const idsA = Object.keys(a.geraete).sort(), idsB = Object.keys(b.geraete).sort();
    erwarte.wahr(idsA.length > 1 && idsB.length > 0, "beide Netze haben Geräte");
    erwarte.falsch(idsA.join(",") === idsB.join(","), `die zwei Netze sind verschieden (A ${idsA.length}, B ${idsB.length} Geräte)`);
    w.zeigen();
    w.laden(a);
    erwarte.gleich(w.gezeichnet().slice().sort(), idsA, "nach dem Laden steht Netz A auf der Fläche");
    /* DER BEFUND: `Z.netz` zeigt auf B, die Fläche aber noch auf A (es wurde nicht gezeichnet). */
    w.bereich.__flNetz = b;
    w.rufen("UI.labor._.netz = globalThis.__flNetz;");
    erwarte.gleich(w.gezeichnet().slice().sort(), idsA, "VOR dem Nachziehen zeigt die Fläche noch A — genau der gemeldete Mangel");
    /* Das Labor wird sichtbar: app.js:102 sendet „ansicht"; die Fläche muss nachziehen. */
    w.ansicht("labor");
    erwarte.gleich(w.gezeichnet().slice().sort(), idsB, "NACH dem Sichtbarwerden zeigt die Fläche B (nachgezogen)");
    erwarte.gleich(w.fehler, [], "dabei keine Fehler im Bereich");
  }));

  pruefe(FAELLE[1], kapsel(welten => {
    const w = flStand(); welten.push(w);
    const a = netzVon("salon-01"), idsA = Object.keys(a.geraete).sort();
    w.zeigen();
    w.laden(a);
    erwarte.gleich(w.gezeichnet().slice().sort(), idsA, "Netz A steht auf der Fläche");
    w.zonenBrechen();
    w.rufen("UI.labor._.warn = new Map(); UI.labor._f.zeichnen();");
    erwarte.gleich(w.gezeichnet(), [], "beim Fehler bleibt KEINE alte Topologie stehen (Fläche ist leer)");
    erwarte.enthaelt(w.hinweis(), "ließ sich nicht zeichnen", "der Fehler steht sichtbar auf der Fläche");
    w.zonenReparieren();
    w.rufen("UI.labor._f.zeichnen();");
    erwarte.gleich(w.gezeichnet().slice().sort(), idsA, "nach der Reparatur zeichnet sie wieder vollständig");
    erwarte.gleich(w.hinweis(), "", "und der Fehlerhinweis ist wieder weg");
  }));

  pruefe(FAELLE[2], kapsel(welten => {
    const w = flStand(); welten.push(w);
    w.zeigen();
    const auftraege = DATEN.tickets.slice();                  /* Zahl aus der Registrierung, nicht fest im Text */
    erwarte.wahr(auftraege.length >= 58, `alle Handaufträge (${auftraege.length})`);
    const abweichungen = [];
    const t0 = Date.now();
    for (const def of auftraege) {
      const inst = Spiel.instanzErstellen({ticketId: def.id});
      w.laden(inst.netz);
      const soll = Object.keys(inst.netz.geraete).slice().sort().join(",");
      const ist = w.gezeichnet().slice().sort().join(",");
      if (soll !== ist) abweichungen.push(`${def.id}: ${ist || "leer"} ≠ ${soll}`);
      Spiel.instanzEntfernen(inst.iid);
    }
    const ms = Date.now() - t0;
    console.log(`MESSUNG Fläche: ${auftraege.length} Handaufträge in ${ms} ms gezeichnet · Abweichungen ${abweichungen.length}`);
    erwarte.gleich(abweichungen, [], "jeder Handauftrag steht vollständig auf der Fläche");
    erwarte.gleich(w.fehler, [], "keine Fehler im Bereich");
  }));
});
})();
