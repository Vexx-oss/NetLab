"use strict";
/* EINZELKLICK IM LABOR (Runde 4, Strang D) — tests/inspektor-einzelklick.test.js
   BEFUND: Ist ein Werkzeug aktiv (Kabel, Ping, Verschieben …), verbraucht der Klick seine
   Bedeutung; der Inspektor bleibt zu oder zeigt den letzten Stand. JETZT: Ein Klick OHNE Ziehen
   auf Gerät, Port, Kabel oder Zone öffnet die passenden Infos rechts und lässt den Werkzeugmodus
   unverändert (Aufgabe Strang D, editor.js-Klickpfad).

   Geprüft wird das ECHTE src/ui/editor.js in einem eigenen vm-Bereich mit DOM-Ersatz
   (Bauart von tests/ui-editor-flaeche.test.js). Die UI-Schicht wird headless nicht geladen.

   Fälle:
     1 · Gerät anklicken bei aktivem Kabelwerkzeug: Inspektor öffnet, Werkzeug bleibt „kabel"
     2 · Port anklicken: der gewählte Port wird an den Inspektor gemeldet
     3 · Kabel anklicken: Kabel-Steckbrief wird gezeigt (UI.inspektor.kabel)
     4 · Zone anklicken: Zonen-Steckbrief wird gezeigt (UI.inspektor.zone)
     5 · Ziehen ist kein Klick (kein Inspektor-Wechsel), Esc-freier Pfad ohne Fokusklau */

(function(){
function ieHatRequire(){ try { return typeof require === "function"; } catch (e) { return false; } }
function ieAlleinLaden(){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const W = path.resolve(__dirname, ".."), SRC = path.join(W, "src");
  const SCH = [["kern", ["basis.js", "netz.js"]], ["@lernmotor", []], ["modell", ["geraete.js"]],
               ["sim", ["engine.js"]], ["cli", ["parser.js"]], ["daten", ["basis.js"]], ["spiel", ["zustand.js"]]];
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
  try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "inspektor-einzelklick.test.js"}); }
  catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
  const rot = ergebnisse.filter(e => !e.ok);
  for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
  console.log("\n" + (ergebnisse.length - rot.length) + "/" + ergebnisse.length + " grün");
  process.exit(rot.length ? 1 : 0);
}
if (typeof gruppe === "undefined" && typeof document === "undefined" && ieHatRequire()) { ieAlleinLaden(); return; }

const IE_KANN_LADEN = (() => {
  try { return ieHatRequire() && typeof document === "undefined" && typeof gruppe === "function"; }
  catch (e) { return false; }
})();
const IE_ZUSATZ = IE_KANN_LADEN ? "" : " (kein require im Testbereich – nur unter node tests/run.js)";

/* ================= DOM-Ersatz ================= */
function ieKlassen(el){ return String(el.attrs.class || "").split(/\s+/).filter(Boolean); }
function ieText(k){ return k == null ? "" : typeof k === "string" ? k : String(k.textContent == null ? "" : k.textContent); }
function iePasst(el, sel){
  let s = String(sel).trim(); if (!s || !el || !el.tag) return false;
  if (/^[a-z][a-z0-9]*$/i.test(s)) return el.tag === s;
  const teile = s.match(/\.[\w-]+|\[[^\]]+\]/g) || [];
  return teile.length > 0 && teile.every(t => {
    if (t.startsWith(".")) return ieKlassen(el).includes(t.slice(1));
    const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(t);
    if (!m) return false;
    const wert = m[1] === "hidden" ? (el.hidden ? "" : undefined) : el.attrs[m[1]];
    return m[2] === undefined ? wert !== undefined : String(wert) === m[2];
  });
}
function ieFinde(el, sel){
  const treffer = [];
  for (const teil of String(sel).split(",")) {
    const s = teil.trim(); if (!s) continue;
    const lauf = k => { for (const x of (k.kinder || [])) if (x && x.tag) { if (iePasst(x, s)) treffer.push(x); lauf(x); } };
    lauf(el);
  }
  return treffer;
}
function ieKnoten(tag){
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
    closest(sel){ let p = el; while (p) { if (p.tag && iePasst(p, sel)) return p; p = p.parentNode; } return null; },
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
    querySelector(sel){ return ieFinde(el, sel)[0] || null; },
    querySelectorAll(sel){ return ieFinde(el, sel); },
    get className(){ return el.attrs.class || ""; },
    set className(v){ el.attrs.class = String(v); },
    get classList(){
      return {
        add(...k){ const l = ieKlassen(el); for (const x of k) if (!l.includes(x)) l.push(x); el.attrs.class = l.join(" "); },
        remove(...k){ el.attrs.class = ieKlassen(el).filter(x => !k.includes(x)).join(" "); },
        contains: x => ieKlassen(el).includes(x),
        toggle(x, an){ const drin = ieKlassen(el).includes(x), soll = an === undefined ? !drin : !!an; if (soll) el.classList.add(x); else el.classList.remove(x); return soll; },
      };
    },
    set textContent(v){ el._text = String(v); el.kinder = []; },
    get textContent(){ return el.kinder.length ? el.kinder.map(ieText).join("") : el._text; },
    get children(){ return el.kinder.filter(k => k && k.tag); },
    get childNodes(){ return el.kinder; },
    get firstChild(){ return el.kinder[0] || null; },
    get lastElementChild(){ return el.kinder.filter(k => k && k.tag).slice(-1)[0] || null; },
    get isConnected(){ let p = el; while (p.parentNode) p = p.parentNode; return !!p.__imBaum; },
  };
  return el;
}
let DOK = null;
function ieDokument(){
  const body = ieKnoten("body"); body.__imBaum = true;
  DOK = {
    body, documentElement: ieKnoten("html"), activeElement: null, listeners: {},
    createElement: t => ieKnoten(t), createElementNS: (ns, t) => ieKnoten(t),
    createTextNode: t => ({nodeType: 3, textContent: String(t)}),
    getElementById: id => ieFinde(body, "#" + id)[0] || null,
    querySelector: sel => ieFinde(body, sel)[0] || null,
    querySelectorAll: sel => ieFinde(body, sel),
    addEventListener(art, fn){ (DOK.listeners[art] ||= []).push(fn); },
    removeEventListener(art, fn){ if (DOK.listeners[art]) DOK.listeners[art] = DOK.listeners[art].filter(x => x !== fn); },
  };
  return DOK;
}

/* ================= Prüfstand: echtes editor.js, Inspektor als Aufzeichner ================= */
function ieStand(){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const dok = ieDokument(), rufe = [], haken = {}, fehler = [];
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
    L, IP, eur, zahlDe, heute, datumDe, jetzt, klemme, esc,
    getComputedStyle: () => ({overflowX: "visible", overflowY: "visible", zIndex: "auto", visibility: "visible", display: "block"}),
  };
  vm.createContext(bereich);
  const lies = rel => fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
  vm.runInContext(lies("src/ui/dom.js"), bereich, {filename: "src/ui/dom.js"});
  const UI = vm.runInContext("UI", bereich);
  UI.symbol = () => ieKnoten("span");
  UI.toast = () => {};
  UI.menue = () => ieKnoten("div");
  UI.bewegung = () => "aus";
  UI.zeit = () => 160;
  UI.klang = {spielen(){}};
  UI.juice = () => {};
  UI.laborFach = null; UI.laborWerkzeuge = null; UI.laborPakete = null; UI.werkstatt = null;
  UI.inspektor = {
    zeigen: (c, netz, id, verlauf, opt) => rufe.push(["zeigen", id, (opt && opt.port) || null]),
    leeren: () => rufe.push(["leeren"]),
    reiter: () => rufe.push(["reiter"]),
    kabel: (c, netz, kid) => rufe.push(["kabel", kid]),
    zone: (c, netz, cidr) => rufe.push(["zone", cidr]),
  };
  UI.simpanel = null; UI.konsole = null; UI.terminal = null;
  vm.runInContext(lies("src/ui/geraetebilder.js"), bereich, {filename: "src/ui/geraetebilder.js"});
  vm.runInContext(lies("src/ui/editor.js"), bereich, {filename: "src/ui/editor.js"});
  if (!UI.labor || typeof UI.labor.zeigen !== "function") throw new Error("src/ui/editor.js hat sich nicht als UI.labor angemeldet");
  const container = ieKnoten("div"); dok.body.append(container);
  const rufen2 = (code, name) => vm.runInContext(code, bereich, {filename: name || "pruefstand"});
  return {UI, dok, container, bereich, rufe, fehler, rufen: rufen2,
    zeigen(){ UI.labor.zeigen(container); },
    ladenNetz(netz){ rufen2("globalThis.__netz = null; UI.labor._.netz = globalThis.__netz;"); UI.labor._.netz = netz; },
    feuer(el, art, ev){ for (const fn of (el.listeners[art] || []).slice()) fn(ev); }};
}
/* Klick ohne Ziehen: pointerdown + pointerup an derselben Stelle auf dem Ziel. */
function ieKlick(w, ziel, art){
  const svg = w.UI.labor._.svg;
  const basis = {button: 0, pointerId: 7, clientX: 120, clientY: 90, target: ziel};
  w.feuer(svg, "pointerdown", basis);
  w.feuer(svg, "pointerup", Object.assign({}, basis, {clientX: 121, clientY: 91}));
  void art;
}
/* Ein DOM-Knoten mit Attribute im SVG-Ebenenbaum des Editors. */
function ieZiel(w, tag, attrs, eltern){
  const el = w.dok.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
  (eltern || w.UI.labor._.s.geraete).append(el);
  return el;
}
const IE_NETZ = () => ({
  geraete: {
    kasse: {id: "kasse", name: "PC-Kasse", typ: "pc", an: true, running: {if: {eth0: {ip: "192.168.10.20", maske: "255.255.255.0"}}}},
    sw1: {id: "sw1", name: "SW1", typ: "switch", an: true, running: {ports: {"Fa0/1": {modus: "access", accessVlan: 1}}}, flash: {vlans: {}}},
  },
  kabel: [{id: "k1", a: {geraet: "kasse", port: "eth0"}, b: {geraet: "sw1", port: "Fa0/1"}}],
  zustand: {},
});

const IE_FAELLE = ["1 · Gerät anklicken bei aktivem Kabelwerkzeug: Inspektor öffnet, Werkzeug bleibt",
                   "2 · Port anklicken: der gewählte Port kommt beim Inspektor an",
                   "3 · Kabel anklicken: Kabel-Steckbrief statt Geräte-Reiter",
                   "4 · Zone anklicken: Zonen-Steckbrief in der rechten Sidebar",
                   "5 · Ziehen ist kein Klick; kein Fokusklau beim Klickpfad"];

gruppe("UI: Einzelklick zeigt immer Infos (Strang D)" + IE_ZUSATZ, () => {
  if (!IE_KANN_LADEN) { pruefe("Einzelklick: nur unter node tests/run.js prüfbar", () => { erwarte.wahr(false, "require fehlt"); }); return; }

  pruefe(IE_FAELLE[0], () => {
    const w = ieStand();
    w.zeigen();
    w.ladenNetz(IE_NETZ());
    w.UI.labor.werkzeug("kabel");
    const ger = ieZiel(w, "g", {"data-id": "kasse"});
    const fokusVorher = w.dok.activeElement = ieZiel(w, "button", {});
    ieKlick(w, ger);
    const zeigt = w.rufe.filter(r => r[0] === "zeigen");
    erwarte.wahr(zeigt.length >= 1, "der Inspektor wird geöffnet");
    erwarte.gleich(zeigt[zeigt.length - 1][1], "kasse", "und zwar für das angeklickte Gerät");
    erwarte.gleich(w.UI.labor.werkzeugName, "kabel", "der Werkzeugmodus bleibt unverändert");
    erwarte.wahr(w.dok.activeElement === fokusVorher, "kein Fokusklau: der Fokus bleibt, wo er war");
    erwarte.gleich(w.fehler, [], "keine Fehler im Bereich");
  });

  pruefe(IE_FAELLE[1], () => {
    const w = ieStand();
    w.zeigen();
    w.ladenNetz(IE_NETZ());
    w.UI.labor.werkzeug("kabel");
    const ger = ieZiel(w, "g", {"data-id": "kasse"});
    const port = ieZiel(w, "circle", {"data-port": "eth0"}, ger);
    ieKlick(w, port);
    const zeigt = w.rufe.filter(r => r[0] === "zeigen");
    erwarte.wahr(zeigt.length >= 1, "der Inspektor wird geöffnet");
    erwarte.gleich(zeigt[zeigt.length - 1][2], "eth0", "der Port wird an den Inspektor gemeldet");
    erwarte.gleich(w.UI.labor.werkzeugName, "kabel", "das Kabelwerkzeug bleibt aktiv");
  });

  pruefe(IE_FAELLE[2], () => {
    const w = ieStand();
    w.zeigen();
    w.ladenNetz(IE_NETZ());
    w.UI.labor.werkzeug("ping");
    const kab = ieZiel(w, "path", {"data-kabel": "k1"}, w.UI.labor._.s.kabel);
    ieKlick(w, kab);
    const kabel = w.rufe.filter(r => r[0] === "kabel");
    erwarte.wahr(kabel.length >= 1, "der Kabel-Steckbrief wird gezeigt");
    erwarte.gleich(kabel[kabel.length - 1][1], "k1", "mit der richtigen Kabel-Id");
    erwarte.gleich(w.UI.labor.werkzeugName, "ping", "das Ping-Werkzeug bleibt aktiv");
    erwarte.gleich(w.UI.labor._.info && w.UI.labor._.info.art, "kabel", "die Kabel-Info steht im Zustand");
  });

  pruefe(IE_FAELLE[3], () => {
    const w = ieStand();
    w.zeigen();
    w.ladenNetz(IE_NETZ());
    w.UI.labor.werkzeug("kabel");
    const zone = ieZiel(w, "g", {"class": "zone zone-a", "data-cidr": "192.168.10.0/24"}, w.UI.labor._.s.zonen);
    ieKlick(w, zone);
    const zonen = w.rufe.filter(r => r[0] === "zone");
    erwarte.wahr(zonen.length >= 1, "der Zonen-Steckbrief wird gezeigt");
    erwarte.gleich(zonen[zonen.length - 1][1], "192.168.10.0/24", "mit dem richtigen CIDR");
    erwarte.gleich(w.UI.labor.werkzeugName, "kabel", "der Werkzeugmodus bleibt unverändert");
  });

  pruefe(IE_FAELLE[4], () => {
    const w = ieStand();
    w.zeigen();
    w.ladenNetz(IE_NETZ());
    w.UI.labor.werkzeug("kabel");
    const ger = ieZiel(w, "g", {"data-id": "kasse"});
    const svg = w.UI.labor._.svg;
    /* Ziehen (mehr als 5 px): kein Klick, kein Inspektor-Wechsel. */
    w.feuer(svg, "pointerdown", {button: 0, pointerId: 9, clientX: 100, clientY: 100, target: ger});
    w.feuer(svg, "pointerup", {button: 0, pointerId: 9, clientX: 260, clientY: 100, target: ger});
    erwarte.gleich(w.rufe.filter(r => r[0] === "zeigen").length, 0, "Ziehen öffnet keinen Inspektor");
    /* Fokusklau-Prüfung des Klickpfads: ein fokussiertes Feld bleibt fokussiert. */
    const feld = ieZiel(w, "input", {});
    w.dok.activeElement = feld;
    ieKlick(w, ger);
    erwarte.wahr(w.rufe.filter(r => r[0] === "zeigen").length >= 1, "der Klick danach öffnet den Inspektor");
    erwarte.wahr(w.dok.activeElement === feld, "und klaut dem Feld nicht den Fokus");
    erwarte.gleich(w.fehler, [], "keine Fehler im Bereich");
  });
});
})();
