"use strict";
/* LERNSTAND-HILFE (src/ui/lernstand-hilfe.js, Baustein H):
   Der Abschnitt „Hilfe und Übung" im Lernstand – je fälliger oder schwacher Fertigkeit Name,
   Leitner-Stufe, die Hilfe der geltenden Bildungsstufe, Üben über Spiel.karriere.training(skill)
   und Wiki über UI.wiki.oeffnen(skill); dazu der sichtbare Stufen-Hinweis. Geprüft wird auch,
   dass die Datei sich selbst in die Lernstand-Ansicht einklinkt (karriere.js bleibt unberührt).
   Vertrag: docs/entwicklung/Hilfestellung – Stufen und Schnittstellen.md § 2, § 5, § 6, § 8.

   Warum ein eigener Kopf: tests/run.js lädt nur die headless-Schichten (bis src/spiel) und baut
   seinen Testbereich OHNE require auf – src/ui ist dort weder geladen noch nachladbar, und
   web/tests.html enthält aus demselben Grund keine src/ui-Datei. Dieser Test lädt die Datei
   deshalb in einem eigenen vm-Bereich mit nachgebildetem DOM (und, wenn require vorhanden ist,
   auch innerhalb von run.js). Steht require im Testbereich nicht zur Verfügung, sagen die
   Testnamen das ausdrücklich – kein stilles Grün.
   Allein lauffähig:  node tests/spiel-lernstand-hilfe.test.js */

/* ================= Umgebung ================= */
function lhHatRequire(){ try { return typeof require === "function"; } catch (e) { return false; } }
const LH_KANN_LADEN = (() => {
  try { return lhHatRequire() && typeof document === "undefined" && typeof Spiel === "object" && Spiel !== null; } catch (e) { return false; }
})();
const LH_ZUSATZ = LH_KANN_LADEN ? "" : " (kein require im Testbereich – nur allein lauffähig: node tests/spiel-lernstand-hilfe.test.js)";

/* ---------------- Allein lauffähig ----------------
   Dieselbe Ladereihenfolge wie tests/run.js (Kopfdateien zuerst, Lernmotor aus der Spielhalle
   oder der Kopie im Repositorium). Danach läuft dieselbe Datei noch einmal – dann mit Spiel,
   mit require und mit diesem DOM-Ersatz. */
function lhAlleinLaden(){
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
  try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "spiel-lernstand-hilfe.test.js"}); }
  catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
  const rot = ergebnisse.filter(e => !e.ok);
  for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
  console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
  process.exit(rot.length ? 1 : 0);
}
if (typeof Spiel === "undefined" && typeof document === "undefined" && lhHatRequire()) lhAlleinLaden();

/* ================= DOM-Ersatz (nur für den vm-Bereich) ================= */
function lhKnoten(tag){
  const el = {
    tag, kinder: [], attrs: {}, className: "", _text: "", eltern: null, listeners: {},
    append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.eltern = el; el.kinder.push(x); } },
    replaceChildren(...k){ el.kinder = []; el.append(...k); },
    remove(){ if (el.eltern) el.eltern.kinder = el.eltern.kinder.filter(x => x !== el); },
    setAttribute(k, v){ el.attrs[k] = String(v); },
    getAttribute(k){ return el.attrs[k]; },
    addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
    click(){ for (const fn of (el.listeners.click || []).slice()) fn({currentTarget: el}); },
    querySelector(sel){ return lhFinde(el, sel)[0] || null; },
    querySelectorAll(sel){ return lhFinde(el, sel); },
    set textContent(v){ el._text = String(v); el.kinder = []; },
    get textContent(){ return el.kinder.length ? el.kinder.map(lhText).join("") : el._text; },
  };
  return el;
}
function lhKlassen(el){ return String(el.className || el.attrs.class || "").split(/\s+/).filter(Boolean); }
function lhFinde(el, sel){
  const klasse = String(sel).replace(/^\./, ""), treffer = [];
  const lauf = k => {
    for (const x of k.kinder) if (x && typeof x === "object" && x.tag) { if (lhKlassen(x).includes(klasse)) treffer.push(x); lauf(x); }
  };
  lauf(el);
  return treffer;
}
function lhText(k){ return k == null ? "" : typeof k === "string" ? k : k.textContent; }
/* h() mit demselben Vertrag wie src/ui/dom.js: class → className, on* → addEventListener. */
function lhH(tag, attrs = {}, ...kinder){
  const el = lhKnoten(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...kinder.flat(Infinity));
  return el;
}

/* ================= Prüfstand ================= */
/* Lernmotor-Ersatz mit genau bekannten Zahlen: fällig sind lab.sub.block (Fach 2) und lab.vlan
   (Fach 1); lab.dhcp ist angefasst, aber nicht sicher und nicht fällig; lab.nat ist sicher;
   k:net-01 gehört einem anderen Spiel und darf nie auftauchen. */
function lhL(o = {}){
  const due = o.due || ["lab.sub.block", "lab.vlan"];
  const standard = {"lab.sub.block": 2, "lab.vlan": 1, "lab.dhcp": 1, "lab.nat": 4};
  const boxen = o.nurBoxen ? Object.assign({}, o.nurBoxen) : Object.assign(standard, o.boxen || {});
  const namen = ["neu", "gesehen", "geübt", "sicher", "gemeistert", "gemeistert ★"];
  const skills = {};
  for (const id of [...due, ...Object.keys(boxen), "k:net-01"]) skills[id] = {id, name: id};
  return {
    SKILLS: skills,
    faelligeIds(filter){ return due.filter(filter || (() => true)); },
    box(id){ return boxen[id] || 0; },
    stufeName(id){ return boxen[id] ? namen[boxen[id]] : "neu"; },
    versucht(id){ return (boxen[id] || 0) > 0; },
    istFaellig(id){ return due.includes(id); },
  };
}

/* Lädt src/ui/lernstand-hilfe.js in einem eigenen Bereich: echtes Spiel, nachgebildeter
   App-Rahmen, nachgebildetes DOM. o.Spiel / o.L ersetzen beides für die Rückfall-Fälle. */
function lhPruefstand(o = {}){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const rufe = [], registriert = [], startHaken = [], busHaken = [];
  const ansicht = lhKnoten("div");
  const UIstub = {
    startHaken,
    app: {registrieren: (name, def) => registriert.push({name, def}), einstellungen: () => rufe.push(["einstellungen"])},
    wiki: {oeffnen: skill => rufe.push(["wiki", skill])},
    spiel: {oeffnen: iid => rufe.push(["spiel", iid])},
    karriere: {lernstandAnsicht: c => rufe.push(["ansicht", c]), miniDialog: () => rufe.push(["miniDialog"])},
    toast: (text, art, opt) => rufe.push(["toast", text, art, opt]),
  };
  const bereich = {
    UI: UIstub, h: lhH, console, setTimeout: () => {},
    document: {createElement: lhKnoten, createTextNode: t => ({tag: "#text", textContent: String(t)}),
               querySelector: sel => (String(sel).includes("data-ansicht") ? ansicht : null)},
    Bus: {an: (art, fn) => { busHaken.push({art, fn}); return () => {}; }},
  };
  if (o.Spiel !== null) bereich.Spiel = o.Spiel || Spiel;
  if (!o.ohneL) bereich.L = o.L || lhL(o.l);
  vm.createContext(bereich);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "src", "ui", "lernstand-hilfe.js"), "utf8"), bereich, {filename: "ui/lernstand-hilfe.js"});
  return {UI: bereich.UI, rufe, registriert, startHaken, busHaken, ansicht};
}
const lhRufe = (p, art) => p.rufe.filter(r => r[0] === art);

/* ================= App-Rahmen =================
   Für den Wirkungs-Nachweis: echtes src/ui/dom.js, echtes src/ui/app.js und – wenn ladbar –
   echtes src/ui/karriere.js. Nur was nicht zu diesem Baustein gehört (Symbole, Leiste, Palette,
   Labor, Toast), ist ersetzt. Lädt karriere.js nicht, tritt für die fremde Ansicht ein Ersatz
   ein; der eigene Weg (Start-Haken → Registrierung → Reiter) bleibt echt. */
function lhRahmenDom(){
  const passt = (el, sel) => {
    if (!el || !el.tag) return false;
    const teile = String(sel).match(/\.[\w-]+|\[[^\]]+\]/g) || [];
    return teile.length > 0 && teile.every(t => {
      if (t.startsWith(".")) return lhKlassen(el).includes(t.slice(1));
      const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(t);
      if (!m) return false;
      const wert = m[1].startsWith("data-") ? el.dataset[m[1].slice(5).replace(/-(\w)/g, (x, c) => c.toUpperCase())] : el.attrs[m[1]];
      return m[2] === undefined ? wert !== undefined : String(wert) === m[2];
    });
  };
  const sammle = (el, sel) => {
    const t = [];
    const lauf = k => { for (const x of k.kinder) if (x && x.tag) { if (passt(x, sel)) t.push(x); lauf(x); } };
    lauf(el);
    return t;
  };
  const mk = tag => {
    const el = {
      nodeType: 1, tag, kinder: [], attrs: {}, dataset: {}, eltern: null, listeners: {}, hidden: false, value: "",
      className: "", _text: "", isConnected: true, offsetWidth: 0,
      style: {setProperty(){}, removeProperty(){}, getPropertyValue(){ return ""; }},
      append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.eltern = el; el.kinder.push(x); } },
      appendChild(x){ el.append(x); return x; },
      replaceChildren(...k){ el.kinder = []; el.append(...k); },
      remove(){ if (el.eltern) el.eltern.kinder = el.eltern.kinder.filter(x => x !== el); },
      setAttribute(k, v){ el.attrs[k] = String(v); if (k.startsWith("data-")) el.dataset[k.slice(5).replace(/-(\w)/g, (x, c) => c.toUpperCase())] = String(v); },
      getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
      removeAttribute(k){ delete el.attrs[k]; },
      addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
      removeEventListener(){},
      click(){ for (const fn of (el.listeners.click || []).slice()) fn({currentTarget: el, target: el, preventDefault(){}, stopPropagation(){}}); },
      focus(){}, blur(){}, closest(){ return null; },
      querySelector(sel){ return sammle(el, sel)[0] || null; },
      querySelectorAll(sel){ return sammle(el, sel); },
      classList: {
        _l(){ return lhKlassen(el); },
        _s(l){ el.className = l.join(" "); },
        add(...k){ const l = el.classList._l(); for (const x of k) if (!l.includes(x)) l.push(x); el.classList._s(l); },
        remove(...k){ el.classList._s(el.classList._l().filter(x => !k.includes(x))); },
        toggle(x, an){ const an2 = an === undefined ? !el.classList.contains(x) : !!an; if (an2) el.classList.add(x); else el.classList.remove(x); return an2; },
        contains(x){ return el.classList._l().includes(x); },
      },
      set textContent(v){ el._text = String(v); el.kinder = []; },
      get textContent(){ return el.kinder.length ? el.kinder.map(lhText).join("") : el._text; },
      set innerHTML(v){ el._text = String(v); el.kinder = []; },
    };
    return el;
  };
  const app = mk("div");
  return {
    app,
    dokument: {
      createElement: mk, createElementNS: (ns, tag) => mk(tag), createTextNode: t => ({nodeType: 3, textContent: String(t)}),
      getElementById: id => (id === "app" ? app : null),
      querySelector: sel => sammle(app, sel)[0] || null, querySelectorAll: sel => sammle(app, sel),
      addEventListener(){}, documentElement: Object.assign(mk("html"), {dataset: {}}), body: mk("body"), activeElement: null,
    },
  };
}

/* Der echte Lernmotor (mit anderen Spielen geteilt) wird für diesen Nachweis auf einen bekannten
   Stand gestellt und danach vollständig zurückgesetzt. */
function lhLKapsel(fn){
  return () => {
    const alt = JSON.parse(JSON.stringify(L.st));
    try { fn(); } finally { for (const k of Object.keys(L.st)) delete L.st[k]; Object.assign(L.st, alt); }
  };
}

/* Kapsel wie in tests/spiel-*.test.js: eigener Stand, eigene Einstellungen, danach alles zurück. */
function lhKapsel(fn){
  return () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken, speicher: store.get("einst", null)};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand();
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      store.set("einst", alt.speicher || {});
    }
  };
}

gruppe("UI: Lernstand-Hilfe", () => {
  pruefe("Der Start-Haken meldet die Lernstand-Ansicht an und zeichnet den Abschnitt mit" + LH_ZUSATZ, () => {
    if (!LH_KANN_LADEN) return;
    const p = lhPruefstand();
    erwarte.gleich(p.startHaken.length, 1, "genau ein eigener Start-Haken");
    const def = p.startHaken[0]();
    erwarte.gleich(p.registriert.length, 1, "genau eine Registrierung");
    erwarte.gleich(p.registriert[0].name, "lernstand", "die bestehende Ansicht wird beerbt, nicht ersetzt");
    erwarte.gleich(p.registriert[0].def.titel, "Lernstand", "der Andock-Knopf behält seinen Namen");
    erwarte.gleich(typeof p.registriert[0].def.wieder, "function", "und den Wiederaufbau");
    const c = lhKnoten("div");
    def.zeigen(c);
    erwarte.gleich(lhRufe(p, "ansicht").length, 1, "die bestehende Lernstand-Ansicht wird gezeichnet");
    erwarte.wahr(lhRufe(p, "ansicht")[0][1] === c, "und zwar in denselben Container");
    erwarte.wahr(!!c.querySelector(".lh-abschnitt"), "dahinter steht der Hilfe-Abschnitt");
    /* Der zweite Weg in dieselbe Ansicht (Rückkehr zum Reiter) muss ihn ebenfalls zeigen. */
    const c2 = lhKnoten("div");
    def.wieder(c2);
    erwarte.wahr(!!c2.querySelector(".lh-abschnitt"), "auch beim Wiederaufbau");
  });

  pruefe("Der Andock-Zähler bleibt der Lernstand: fällige Fertigkeiten" + LH_ZUSATZ, () => {
    if (!LH_KANN_LADEN) return;
    const p = lhPruefstand();
    const def = p.startHaken[0]();
    erwarte.gleich(def.zaehler(), 2, "zwei fällige Fertigkeiten");
    erwarte.gleich(p.UI.lernstandHilfe.faelligeIds(), ["lab.sub.block", "lab.vlan"]);
  });

  pruefe("Je fälliger oder schwacher Fertigkeit genau eine Zeile mit genau einem Üben-Knopf" + LH_ZUSATZ, () => {
    if (!LH_KANN_LADEN) return;
    const p = lhPruefstand();                       /* fällig: 2 · wackelt: lab.dhcp · sicher: lab.nat (nein) */
    const c = lhKnoten("div");
    p.UI.lernstandHilfe.abschnitt(c);
    const zeilen = c.querySelectorAll(".lh-zeile"), ueben = c.querySelectorAll(".lh-ueben"), wiki = c.querySelectorAll(".lh-wiki");
    erwarte.gleich(zeilen.length, 3, "drei Zeilen");
    erwarte.gleich(zeilen.map(z => z.getAttribute("data-skill")), ["lab.sub.block", "lab.vlan", "lab.dhcp"], "fällig zuerst, dann das Schwache");
    erwarte.gleich(ueben.length, 3, "je Zeile genau ein Üben-Knopf");
    erwarte.gleich(wiki.length, 3, "je Zeile genau ein Wiki-Knopf");
    erwarte.gleich(ueben.map(b => b.textContent), ["Üben", "Üben", "Üben"]);
    erwarte.falsch(p.UI.lernstandHilfe.fertigkeiten().includes("lab.nat"), "„sicher“ (Fach 4) steht nicht in der Liste");
    erwarte.falsch(p.UI.lernstandHilfe.fertigkeiten().includes("k:net-01"), "Fertigkeiten anderer Spiele bleiben draußen");
  });

  pruefe("Die Zeile nennt Name und Leitner-Stufe (L.box, L.stufeName)" + LH_ZUSATZ, () => {
    if (!LH_KANN_LADEN) return;
    const p = lhPruefstand();
    const c = lhKnoten("div");
    p.UI.lernstandHilfe.abschnitt(c);
    erwarte.gleich(c.querySelectorAll(".lh-box").map(b => b.textContent),
      ["Leitner-Stufe 2 von 5 · geübt", "Leitner-Stufe 1 von 5 · gesehen", "Leitner-Stufe 1 von 5 · gesehen"], "Fach und Name aus dem Lernmotor");
    const name = c.querySelector(".lh-name").textContent;
    erwarte.wahr(!!name, "ein Name steht da");
    erwarte.falsch(/^lab\./.test(name), "kein roher Schlüssel: " + name);
    /* Ohne Karriere-Weg fällt der Name auf den Schlüssel ohne Präfix zurück – nie auf leer. */
    const ohne = lhPruefstand({Spiel: {einst: {}, karriere: {}, skill: () => null}});
    const c2 = lhKnoten("div");
    ohne.UI.lernstandHilfe.abschnitt(c2);
    erwarte.gleich(c2.querySelectorAll(".lh-name").map(n => n.textContent), ["sub.block", "vlan", "dhcp"]);
  });

  pruefe("„Üben“ nimmt den bestehenden Weg: Spiel.karriere.training(skill)" + LH_ZUSATZ, () => {
    if (!LH_KANN_LADEN) return;
    const gerufen = [];
    const SpielStub = Object.assign({}, Spiel, {karriere: Object.assign({}, Spiel.karriere,
      {training: skill => { gerufen.push(skill); return {art: "ticket", inst: {iid: "i7"}}; }})});
    const p = lhPruefstand({Spiel: SpielStub});
    const c = lhKnoten("div");
    p.UI.lernstandHilfe.abschnitt(c);
    c.querySelectorAll(".lh-ueben")[0].click();
    erwarte.gleich(gerufen, ["lab.sub.block"], "die Fertigkeit der Zeile, kein Sammelaufruf");
    erwarte.gleich(lhRufe(p, "spiel").map(r => r[1]), ["i7"], "der Auftrag wird geöffnet");
    c.querySelectorAll(".lh-ueben")[2].click();
    erwarte.gleich(gerufen, ["lab.sub.block", "lab.dhcp"], "jede Zeile übt ihre eigene Fertigkeit");
  });

  pruefe("Mini-Ticket und „keins“ enden in einer Meldung, nie in einem Wurf" + LH_ZUSATZ, () => {
    if (!LH_KANN_LADEN) return;
    const mini = lhPruefstand({Spiel: Object.assign({}, Spiel, {karriere: Object.assign({}, Spiel.karriere, {training: () => ({art: "mini", mini: {id: "m1"}})})})});
    const c1 = lhKnoten("div");
    mini.UI.lernstandHilfe.abschnitt(c1);
    c1.querySelector(".lh-ueben").click();
    const toast = lhRufe(mini, "toast")[0];
    erwarte.wahr(!!toast, "eine Meldung statt eines stillen Klicks");
    erwarte.enthaelt(toast[1], "Mini-Ticket");
    erwarte.gleich(typeof toast[3].aktion.fn, "function", "mit Aktion „Jetzt lösen“");
    toast[3].aktion.fn();
    erwarte.gleich(lhRufe(mini, "miniDialog").length, 1, "die Aktion öffnet das Mini-Ticket der Karriere");

    const keins = lhPruefstand({Spiel: Object.assign({}, Spiel, {karriere: Object.assign({}, Spiel.karriere, {training: () => ({art: "keins", grund: "Kein Training für diese Fertigkeit."})})})});
    const c2 = lhKnoten("div");
    keins.UI.lernstandHilfe.abschnitt(c2);
    c2.querySelector(".lh-ueben").click();
    erwarte.gleich(lhRufe(keins, "toast").map(r => r[1]), ["Kein Training für diese Fertigkeit."]);

    /* Wirft die Karriere, bleibt es bei einer Meldung – kein Absturz der Ansicht. */
    const kaputt = lhPruefstand({Spiel: Object.assign({}, Spiel, {karriere: Object.assign({}, Spiel.karriere, {training: () => { throw new Error("kaputt"); }})})});
    const c3 = lhKnoten("div");
    kaputt.UI.lernstandHilfe.abschnitt(c3);
    c3.querySelector(".lh-ueben").click();
    erwarte.gleich(lhRufe(kaputt, "toast").length, 1, "auch ein Fehler wird gemeldet, nicht geworfen");
  });

  pruefe("Wiki-Knopf ruft UI.wiki.oeffnen(skill)" + LH_ZUSATZ, () => {
    if (!LH_KANN_LADEN) return;
    const p = lhPruefstand();
    const c = lhKnoten("div");
    p.UI.lernstandHilfe.abschnitt(c);
    c.querySelectorAll(".lh-wiki")[0].click();
    c.querySelectorAll(".lh-wiki")[1].click();
    erwarte.gleich(lhRufe(p, "wiki").map(r => r[1]), ["lab.sub.block", "lab.vlan"]);
    /* Ohne Wiki gibt es eine Meldung statt eines stillen Klicks. */
    const ohne = lhPruefstand();
    ohne.UI.wiki = null;
    const c2 = lhKnoten("div");
    ohne.UI.lernstandHilfe.abschnitt(c2);
    c2.querySelector(".lh-wiki").click();
    erwarte.gleich(lhRufe(ohne, "toast").length, 1, "Wiki fehlt: gemeldet");
  });

  pruefe("Der sichtbare Hinweis nennt Stufe, Vorrat und Freigaben" + LH_ZUSATZ, lhKapsel(() => {
    if (!LH_KANN_LADEN) return;
    Spiel.stufe.setzen("azubi", {still: true});
    const p = lhPruefstand();
    const c = lhKnoten("div");
    p.UI.lernstandHilfe.abschnitt(c);
    const hinweis = c.querySelector(".lh-stufe").textContent;
    erwarte.gleich(c.querySelector(".lh-abschnitt").getAttribute("data-lh-stufe"), "azubi", "die Fläche trägt die Stufe");
    erwarte.enthaelt(hinweis, "Stufe 1 von 4", "der Rang steht da");
    erwarte.enthaelt(hinweis, "Azubi (1. Lehrjahr)", "und der Name");
    erwarte.enthaelt(hinweis, "1 Vorschlag mit Syntax im Terminal");
    erwarte.enthaelt(hinweis, "Werkzeugleiter immer sichtbar");
    erwarte.enthaelt(hinweis, "Hilfe-Knopf im Mini-Ticket (6 frei)", "der Vorrat aus § 2.1");
    erwarte.gleich(hinweis, p.UI.lernstandHilfe.freigabeText(), "die Zeile kommt aus einer Quelle");
    for (const z of c.querySelectorAll(".lh-hilfe")) erwarte.enthaelt(z.textContent, "Hilfe hier: ", "jede Zeile sagt, was die Stufe hier gibt");
    /* Der Hinweis ist sichtbarer Text, kein Tooltip: er steht im DOM und in keiner title-Eigenschaft. */
    erwarte.falsch(/^\s*$/.test(hinweis), "kein leerer Hinweis");
  }));

  pruefe("Der Hinweis folgt dem Bildungsstand und führt in die Einstellungen" + LH_ZUSATZ, lhKapsel(() => {
    if (!LH_KANN_LADEN) return;
    const p = lhPruefstand();
    const zeige = id => {
      Spiel.stufe.setzen(id, {still: true});
      const c = lhKnoten("div");
      p.UI.lernstandHilfe.abschnitt(c);
      return c;
    };
    const geselle = zeige("geselle");
    erwarte.enthaelt(geselle.querySelector(".lh-stufe").textContent, "Stufe 3 von 4", "Geselle ist Rang 3");
    erwarte.enthaelt(geselle.querySelector(".lh-stufe").textContent, "Geselle / Prüfungsvorbereitung");
    erwarte.enthaelt(geselle.querySelector(".lh-stufe").textContent, "Werkzeugleiter nach einem Fehler");
    erwarte.enthaelt(geselle.querySelector(".lh-stufe").textContent, "(2 frei)", "zwei freie Hilfen");
    const meister = zeige("meister");
    const text = meister.querySelector(".lh-stufe").textContent;
    erwarte.enthaelt(text, "Stufe 4 von 4");
    erwarte.enthaelt(text, "Meister / Profi");
    erwarte.enthaelt(text, "kein Vorschlag im Terminal");
    erwarte.enthaelt(text, "keine Werkzeugleiter");
    erwarte.enthaelt(text, "kein Hilfe-Knopf");
    erwarte.gleich(meister.querySelector(".lh-abschnitt").getAttribute("data-lh-stufe"), "meister");
    /* Der Übungsweg bleibt auch für den Meister sichtbar – nur die ungefragte Hilfe verschwindet. */
    erwarte.gleich(meister.querySelectorAll(".lh-ueben").length, 3, "Üben bleibt offen");
    meister.querySelector(".lh-einstellungen").click();
    erwarte.gleich(lhRufe(p, "einstellungen").length, 1, "„Bildungsstand ändern“ öffnet die Einstellungen");
  }));

  pruefe("Ohne Lernmotor baut er auf, ohne zu werfen – und sagt es" + LH_ZUSATZ, () => {
    if (!LH_KANN_LADEN) return;
    const p = lhPruefstand({ohneL: true});
    const c = lhKnoten("div");
    const kasten = p.UI.lernstandHilfe.abschnitt(c);
    erwarte.wahr(!!kasten, "der Abschnitt entsteht trotzdem");
    erwarte.gleich(p.UI.lernstandHilfe.fertigkeiten(), null, "null heißt: kein Lernmotor (nicht: nichts fällig)");
    erwarte.gleich(c.querySelectorAll(".lh-zeile").length, 0, "keine erfundenen Zeilen");
    erwarte.gleich(c.querySelectorAll(".lh-ueben").length, 0);
    erwarte.enthaelt(c.querySelector(".lh-leer").textContent, "Lernmotor");
    erwarte.wahr(!!c.querySelector(".lh-stufe"), "die Stufe steht auch ohne Lernmotor da");
    /* Ein halb geladener Lernmotor ist kein Wurf, sondern „nichts bekannt“. */
    const halb = lhPruefstand({L: {}});
    const c2 = lhKnoten("div");
    halb.UI.lernstandHilfe.abschnitt(c2);
    erwarte.gleich(halb.UI.lernstandHilfe.fertigkeiten(), []);
    erwarte.enthaelt(c2.querySelector(".lh-leer").textContent, "nichts fällig");
  });

  pruefe("Ohne Spiel.stufe fällt er auf „azubi“ zurück – auch wenn die Stufe wirft" + LH_ZUSATZ, () => {
    if (!LH_KANN_LADEN) return;
    /* Baustein A fehlt: keine Spiel.stufe, kein Spiel.HILFE_KONTO – es gelten die Vertragszahlen. */
    const ohneA = lhPruefstand({Spiel: {einst: {}, karriere: {}, skill: () => null}});
    const c1 = lhKnoten("div");
    ohneA.UI.lernstandHilfe.abschnitt(c1);
    erwarte.gleich(c1.querySelector(".lh-abschnitt").getAttribute("data-lh-stufe"), "azubi");
    erwarte.enthaelt(c1.querySelector(".lh-stufe").textContent, "Stufe 1 von 4");
    erwarte.enthaelt(c1.querySelector(".lh-stufe").textContent, "Azubi (1. Lehrjahr)");
    erwarte.enthaelt(c1.querySelector(".lh-stufe").textContent, "(6 frei)", "die Vertragszahl aus § 2.1");
    /* Baustein A da, aber kaputt: ebenfalls azubi bzw. die eingestellte Stufe – nie ein Wurf. */
    const wirft = lhPruefstand({Spiel: {einst: {stufe: "geselle"}, karriere: {}, skill: () => null,
      stufe: {id(){ throw new Error("kaputt"); }, def(){ throw new Error("kaputt"); }, kann(){ throw new Error("kaputt"); }, darf(){ throw new Error("kaputt"); }}}});
    const c2 = lhKnoten("div");
    wirft.UI.lernstandHilfe.abschnitt(c2);
    erwarte.gleich(c2.querySelector(".lh-abschnitt").getAttribute("data-lh-stufe"), "geselle", "Rückfall auf einst.stufe");
    erwarte.enthaelt(c2.querySelector(".lh-stufe").textContent, "Stufe 3 von 4");
    erwarte.enthaelt(c2.querySelector(".lh-stufe").textContent, "(2 frei)");
  });

  pruefe("Ohne offene Instanz, ohne Container und doppelt aufgerufen wirft nichts" + LH_ZUSATZ, lhKapsel(() => {
    if (!LH_KANN_LADEN) return;
    const p = lhPruefstand();
    erwarte.gleich(Spiel.stufe.konto(), null, "kein offenes Ticket in dieser Kapsel");
    erwarte.gleich(p.UI.lernstandHilfe.abschnitt(null), null, "ohne Container: nichts");
    erwarte.gleich(p.UI.lernstandHilfe.abschnitt(), null, "ohne Argument: nichts");
    erwarte.gleich(p.UI.lernstandHilfe.abschnitt({}), null, "ohne append: nichts");
    const c = lhKnoten("div");
    const a = p.UI.lernstandHilfe.abschnitt(c);
    const b = p.UI.lernstandHilfe.abschnitt(c);
    erwarte.gleich(c.querySelectorAll(".lh-abschnitt").length, 1, "zweimal aufgerufen gibt es ihn nur einmal");
    erwarte.falsch(a === b, "der zweite Aufruf liefert den neuen Kasten");
    erwarte.gleich(c.querySelectorAll(".lh-zeile").length, 3, "und die Zeilen sind nicht gestapelt");
  }));

  pruefe("Der Bus reicht den Abschnitt nach, falls die Ansicht ohne den Haken gebaut wurde" + LH_ZUSATZ, () => {
    if (!LH_KANN_LADEN) return;
    const p = lhPruefstand();
    erwarte.gleich(p.busHaken.length, 1, "genau ein Bus-Hörer");
    erwarte.gleich(p.busHaken[0].art, "ansicht");
    p.busHaken[0].fn("labor");
    erwarte.gleich(p.ansicht.querySelectorAll(".lh-abschnitt").length, 0, "andere Ansichten bleiben unberührt");
    p.busHaken[0].fn("lernstand");
    erwarte.gleich(p.ansicht.querySelectorAll(".lh-abschnitt").length, 1, "der Lernstand bekommt ihn");
    p.busHaken[0].fn("lernstand");
    erwarte.gleich(p.ansicht.querySelectorAll(".lh-abschnitt").length, 1, "und zwar nur einmal");
  });

  pruefe("Mehr als sechs Fällige: sechs Zeilen und ein Sammelhinweis" + LH_ZUSATZ, () => {
    if (!LH_KANN_LADEN) return;
    const viele = ["lab.link", "lab.ip", "lab.netz", "lab.gateway", "lab.arp", "lab.ping", "lab.switch", "lab.subnetz"];
    const boxen = {}; for (const id of viele) boxen[id] = 1;
    const p = lhPruefstand({L: lhL({due: viele, nurBoxen: boxen})});
    const c = lhKnoten("div");
    p.UI.lernstandHilfe.abschnitt(c);
    erwarte.gleich(p.UI.lernstandHilfe.fertigkeiten().length, 8, "acht sind fällig");
    erwarte.gleich(c.querySelectorAll(".lh-zeile").length, p.UI.lernstandHilfe.MAX_ZEILEN, "sechs Zeilen");
    erwarte.gleich(c.querySelectorAll(".lh-ueben").length, 6);
    erwarte.enthaelt(c.querySelectorAll(".lh-fuss").map(f => f.textContent).join(" | "), "2 weitere Fertigkeiten");
  });

  /* ---------------- Wirkung: der echte Weg in der laufenden Ansicht ----------------
     Kein Aufruf der eigenen Funktion, sondern der Weg des Spielers: App-Rahmen aufbauen,
     Reiter „Lernstand“ klicken (genau das tut der Andock-Knopf), und dann im DOM der
     gebauten Ansicht nachsehen. Geprüft wird die Datei, die gebaut wird – nicht ein Ersatz. */
  pruefe("Wirkung: der Reiter „Lernstand“ im echten App-Rahmen zeigt den Abschnitt", lhKapsel(lhLKapsel(() => {
    if (!LH_KANN_LADEN) return;
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const quelle = f => fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8");
    const {dokument} = lhRahmenDom();
    const fehler = [];
    const still = {log(){}, warn(){}, info(){}, error: (...a) => fehler.push(a.map(x => (x && x.stack) || String(x)).join(" "))};
    const bereich = {console: still, setTimeout: () => 0, clearTimeout(){}, Date, Math, JSON, Intl, document: dokument,
      matchMedia: () => ({matches: false, addEventListener(){}, removeEventListener(){}}),
      requestAnimationFrame: () => 0, performance: {now: () => 0},
      store, Bus, Spiel, L, eur, zahlDe, klemme, heute, datumDe};
    vm.createContext(bereich);
    vm.runInContext(quelle("dom.js"), bereich, {filename: "ui/dom.js"});
    /* Rahmen-Ersatz: alles, was nicht zu diesem Baustein gehört. */
    vm.runInContext([
      "UI.symbol = (n, g) => sv('svg', {class: 'sym-' + n, width: g || 20});",
      /* `status` gehört dazu: `src/ui/karriere.js:533` hängt einen `zustand-geaendert`-Hörer an,
         der `UI.leiste.status({...})` ruft (karriere.js:405). Fehlte die Methode, warf der Hörer bei
         JEDEM gemeldeten Zustand einen TypeError, den `src/kern/basis.js:35` still verschluckt —
         gemessen 52× auf stderr in einem Testlauf (Befund von `terminal-hilfe`, 09.10.2026).
         Ein Fehler, der 52× verschluckt wird, versteckt echte Fehler. */
      "UI.leiste = {aufgebaut: false, aufbauen(){}, abbauen(){}, status(){}};",
      "UI.palette = {oeffnen(){}, schliessen(){}, get offen(){ return false; }};",
      "UI.menue = {zu(){}};",
      "UI.labor = {zeigen: c => c.replaceChildren(h('div', {class: 'labor-ersatz'}))};",
      "UI.toast = () => {};",
      "UI.spiel = {oeffnen(){}};",
    ].join("\n"), bereich);
    vm.runInContext(quelle("app.js"), bereich, {filename: "ui/app.js"});
    /* Baustein C ist fremd: er wird geladen, wenn er sich laden lässt. */
    let fremdeAnsicht = "karriere.js";
    try { vm.runInContext(quelle("karriere.js"), bereich, {filename: "ui/karriere.js"}); }
    catch (e) { fremdeAnsicht = "Ersatz"; }
    if (fremdeAnsicht === "Ersatz") vm.runInContext("UI.karriere = {lernstandAnsicht: c => c.replaceChildren(h('header', {class: 'kr-kopf'}, h('h2', {}, 'Lernstand')))}; UI.wiki = {oeffnen(){}};", bereich);
    vm.runInContext(quelle("lernstand-hilfe.js"), bereich, {filename: "ui/lernstand-hilfe.js"});
    vm.runInContext("globalThis.__p = {UI: UI};", bereich);
    const U = bereich.__p.UI;
    /* Bekannter Lernstand: genau eine fällige Fertigkeit des Labors. */
    L.st.units = {"lab.ip": {box: 1, due: heute(), r: 1, f: 0, last: heute(), sf: 0}};
    /* Wie UI.starten: erst die Start-Haken (dort melden sich die Ansichten an). */
    erwarte.gleich((U.startHaken || []).length, 2, "karriere.js und lernstand-hilfe.js melden sich an");
    for (const fn of U.startHaken || []) fn();
    U.modus("voll");                                            /* baut den echten App-Rahmen */
    const reiter = dokument.querySelectorAll(".dock-knopf").filter(b => b.dataset.ansicht === "lernstand");
    erwarte.gleich(reiter.length, 1, "genau ein Reiter „Lernstand“ im Andock");
    reiter[0].click();                                          /* der Klick des Spielers */
    const c = dokument.querySelector('.ansicht[data-ansicht="lernstand"]');
    erwarte.wahr(!!c, "die Lernstand-Ansicht ist gebaut");
    erwarte.wahr(!!c.querySelector(".lh-abschnitt"), "der Abschnitt steht in der laufenden Ansicht");
    erwarte.wahr(!!c.querySelector(".kr-kopf"), "und die Lernstand-Ansicht steht daneben (" + fremdeAnsicht + ")" + (fehler.length ? " – gemeldeter Fehler: " + fehler.join(" | ") : ""));
    /* Der Andock-Knopf trägt dasselbe data-ansicht und steht im DOM davor: der Abschnitt darf
       nie in ihm landen (genau das tat das Sicherheitsnetz, bevor der Selektor .ansicht hatte). */
    erwarte.gleich(reiter[0].querySelectorAll(".lh-abschnitt").length, 0, "nicht im Andock-Knopf");
    erwarte.gleich(reiter[0].querySelectorAll(".lh-zeile").length, 0, "und keine Zeile darin");
    erwarte.gleich(c.querySelectorAll(".lh-zeile").length, 1, "eine fällige Fertigkeit");
    erwarte.gleich(c.querySelectorAll(".lh-zeile")[0].getAttribute("data-skill"), "lab.ip");
    erwarte.gleich(c.querySelectorAll(".lh-ueben").length, 1, "genau ein Üben-Knopf");
    erwarte.gleich(c.querySelectorAll(".lh-wiki").length, 1, "genau ein Wiki-Knopf");
    erwarte.gleich(c.querySelectorAll(".lh-name")[0].textContent, "IP-Adresse und Maske setzen", "der echte Fertigkeitsname");
    erwarte.enthaelt(c.querySelector(".lh-stufe").textContent, "Stufe 1 von 4", "die Stufe wird genannt");
    erwarte.enthaelt(c.querySelector(".lh-stufe").textContent, "Azubi (1. Lehrjahr)");
    /* Zweiter Blick auf denselben Reiter (Rückkehr) darf nichts verdoppeln. */
    U.app.ansicht("labor");
    reiter[0].click();
    const c2 = dokument.querySelector('.ansicht[data-ansicht="lernstand"]');
    erwarte.gleich(c2.querySelectorAll(".lh-abschnitt").length, 1, "beim Wiederaufbau nur einmal");
    erwarte.gleich(c2.querySelectorAll(".lh-ueben").length, 1);
  })));
});
