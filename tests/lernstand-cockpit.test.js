"use strict";
/* LERNSTAND-COCKPIT (Runde 4, Strang B): src/ui/lernstand.js + src/ui/naechster.js.
   Der Lernstand ist ein Ausbildungs-Cockpit: Kopf mit Mikrolabel und Titel, rechts die
   Prüfungsreife-Kachel; „Nächster Schritt“ prominent mit GENAU EINER Hauptaktion; die
   Kompetenzkarte als Register über die sechs Regionen (Zustand als Text UND Form); Fehlerheft
   mit echtem Fehlertext und Üben-Knopf; „Behalten“ mit ehrlichen „–“; Training-Empfehlungen;
   Prüfungstag und Abzeichen ruhig integriert. Geprüft wird außerdem: keine erfundenen Zahlen
   und kein Emoji aus den Daten im UI-Chrome.
   Vertrag: docs/entwicklung/Entwurf – Runde 4 (Jobdoku & QoL).md § 3 Strang B.

   Warum ein eigener Kopf: tests/run.js lädt nur die headless-Schichten (bis src/spiel) und baut
   seinen Testbereich OHNE require auf – src/ui ist dort weder geladen noch nachladbar. Dieser
   Test lädt die Dateien deshalb in einem eigenen vm-Bereich mit nachgebildetem DOM (Bauart von
   tests/spiel-lernstand-hilfe.test.js). Steht require im Testbereich nicht zur Verfügung, sagen
   die Testnamen das ausdrücklich – kein stilles Grün.
   Allein lauffähig:  node tests/lernstand-cockpit.test.js */

/* ----------------------------- Umgebung ----------------------------- */
function lkHatRequire(){ try { return typeof require === "function"; } catch (e) { return false; } }
const LK_KANN_LADEN = (() => {
  try { return lkHatRequire() && typeof document === "undefined" && typeof Spiel === "object" && Spiel !== null; } catch (e) { return false; }
})();
const LK_ZUSATZ = LK_KANN_LADEN ? "" : " (kein require im Testbereich – nur allein lauffähig: node tests/lernstand-cockpit.test.js)";

/* ----------------------------- Allein lauffähig -----------------------------
   Dieselbe Ladereihenfolge wie tests/run.js (Kopfdateien zuerst, Lernmotor aus der Spielhalle
   oder der Kopie im Repositorium). Danach läuft dieselbe Datei noch einmal – dann mit Spiel,
   mit require und mit diesem DOM-Ersatz. */
function lkAlleinLaden(){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const W = path.resolve(__dirname, ".."), SRC = path.join(W, "src");
  const SCH = [["kern", ["basis.js", "netz.js"]], ["@lernmotor", []], ["modell", ["geraete.js"]], ["sim", ["engine.js"]],
               ["cli", ["parser.js"]], ["daten", ["basis.js"]], ["spiel", ["zustand.js"]]];
  const LM = [path.resolve(W, "..", "FISI-Spielhalle", "src", "lernmotor.js"), path.join(W, "fremd", "lernmotor.js")].find(f => fs.existsSync(f));
  if (!LM) { console.error("LADEFEHLER: kein Lernmotor gefunden"); process.exit(2); }
  const code = ['"use strict"; const LABOR_VERSION = "test";'];
  for (const [ordner, kopf] of SCH) {
    if (ordner === "@lernmotor") { code.push(fs.readFileSync(LM, "utf8")); continue; }
    const d = path.join(SRC, ordner), alle = fs.readdirSync(d).filter(n => n.endsWith(".js")).sort();
    for (const n of [...kopf.filter(x => alle.includes(x)), ...alle.filter(x => !kopf.includes(x))]) code.push(fs.readFileSync(path.join(d, n), "utf8"));
  }
  code.push(fs.readFileSync(path.join(__dirname, "harness.js"), "utf8"));
  code.push(fs.readFileSync(__filename, "utf8"));
  code.push("testsAusfuehren();");
  const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename});
  let ergebnisse;
  try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "lernstand-cockpit.test.js"}); }
  catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
  if (!Array.isArray(ergebnisse)) { console.error("LADEFEHLER: der Testlauf hat keine Ergebnisse geliefert"); process.exit(2); }
  const rot = ergebnisse.filter(e => !e.ok);
  for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
  console.log("\n" + (ergebnisse.length - rot.length) + "/" + ergebnisse.length + " grün");
  process.exit(rot.length ? 1 : 0);
}
if (typeof Spiel === "undefined" && typeof document === "undefined" && lkHatRequire()) lkAlleinLaden();

/* ----------------------------- DOM-Ersatz ----------------------------- */
function lkKlassen(el){ return String(el.className || (el.attrs && el.attrs.class) || "").split(/\s+/).filter(Boolean); }
function lkDatasetName(k){ return k.slice(5).split("-").map((p, i) => i ? p.charAt(0).toUpperCase() + p.slice(1) : p).join(""); }
/* Ein einfacher Selektor: Tag, Klassen und [attribut="wert"] – genau das, was die Ansicht
   und dieser Test brauchen. Nachfahren (Leerzeichen) und Komma-Listen werden unterstützt. */
function lkSelektorPasst(el, sel){
  if (!el || el.nodeType !== 1) return false;
  const s = String(sel).trim();
  const teile = s.match(/\.[\w-]+|\[[^\]]+\]/g) || [];
  if (!teile.length) return el.tag === s;
  return teile.every(t => {
    if (t.charAt(0) === ".") return lkKlassen(el).includes(t.slice(1));
    const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(t);
    if (!m) return false;
    const wert = m[1].slice(0, 5) === "data-" ? el.dataset[lkDatasetName(m[1])] : el.attrs[m[1]];
    return m[2] === undefined ? wert !== undefined : String(wert) === m[2];
  });
}
function lkVorfahrePasst(el, kette, index){
  if (index < 0) return true;
  let p = el.eltern;
  while (p && p.nodeType === 1) {
    if (lkSelektorPasst(p, kette[index]) && lkVorfahrePasst(p, kette, index - 1)) return true;
    p = p.eltern;
  }
  return false;
}
function lkFinde(el, sel){
  const alle = [];
  const lauf = k => { for (const x of k.kinder) if (x && x.nodeType === 1) { alle.push(x); lauf(x); } };
  lauf(el);
  const treffer = [];
  for (const teil of String(sel).split(",")) {
    const kette = teil.trim().split(/\s+/).filter(Boolean);
    if (!kette.length) continue;
    for (const x of alle) if (lkSelektorPasst(x, kette[kette.length - 1]) && lkVorfahrePasst(x, kette, kette.length - 2)) treffer.push(x);
  }
  return treffer;
}
function lkText(k){ return k == null ? "" : typeof k === "string" ? k : (k.nodeType === 3 ? k.textContent : (k.textContent || "")); }
function lkKnoten(tag){
  const el = {
    nodeType: 1, tag, kinder: [], attrs: {}, dataset: {}, listeners: {}, className: "", _text: "", eltern: null, hidden: false,
    style: {setProperty(k, v){ el.style[k] = v; }, removeProperty(k){ delete el.style[k]; }, getPropertyValue(k){ return el.style[k] || ""; }},
    append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.eltern = el; el.kinder.push(x); } },
    appendChild(x){ el.append(x); return x; },
    replaceChildren(...k){ el.kinder = []; el.append(...k); },
    remove(){ if (el.eltern) el.eltern.kinder = el.eltern.kinder.filter(x => x !== el); },
    setAttribute(k, v){
      el.attrs[k] = String(v);
      if (k === "class") el.className = String(v);
      if (k.slice(0, 5) === "data-") el.dataset[lkDatasetName(k)] = String(v);
      if (k === "hidden") el.hidden = true;
    },
    getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
    removeAttribute(k){ delete el.attrs[k]; if (k === "hidden") el.hidden = false; },
    addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
    removeEventListener(art, fn){ if (el.listeners[art]) el.listeners[art] = el.listeners[art].filter(x => x !== fn); },
    click(){ for (const fn of (el.listeners.click || []).slice()) fn({currentTarget: el, target: el, preventDefault(){}, stopPropagation(){}}); },
    focus(){}, blur(){}, closest(){ return null; },
    getBoundingClientRect(){ return {left: 0, top: 0, right: 240, bottom: 40, width: 240, height: 40}; },
    querySelector(sel){ return lkFinde(el, sel)[0] || null; },
    querySelectorAll(sel){ return lkFinde(el, sel); },
    classList: {
      _l(){ return lkKlassen(el); },
      _s(l){ el.className = l.join(" "); },
      add(...k){ const l = el.classList._l(); for (const x of k) if (!l.includes(x)) l.push(x); el.classList._s(l); },
      remove(...k){ el.classList._s(el.classList._l().filter(x => !k.includes(x))); },
      toggle(x, an){ const a = an === undefined ? !el.classList.contains(x) : !!an; if (a) el.classList.add(x); else el.classList.remove(x); return a; },
      contains(x){ return el.classList._l().includes(x); },
    },
    set textContent(v){ el._text = String(v); el.kinder = []; },
    get textContent(){ return el.kinder.length ? el.kinder.map(lkText).join("") : el._text; },
  };
  return el;
}
/* h() mit demselben Vertrag wie src/ui/dom.js: class → className, style-Objekt, on* → Hörer. */
function lkH(tag, attrs = {}, ...kinder){
  const el = lkKnoten(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") el.className = v;
    else if (k === "style" && v && typeof v === "object") { for (const [p, w] of Object.entries(v)) { if (p.slice(0, 2) === "--") el.style.setProperty(p, w == null ? "" : String(w)); else el.style[p] = w; } }
    else if (k.slice(0, 2) === "on" && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kinder.flat(Infinity)) if (kid != null && kid !== false) el.append(kid);
  return el;
}
function lkDokument(){
  const body = lkKnoten("body");
  return {
    body, documentElement: lkKnoten("html"), activeElement: null,
    createElement: t => lkKnoten(t), createElementNS: (ns, t) => lkKnoten(t),
    createTextNode: t => ({nodeType: 3, textContent: String(t)}),
    addEventListener(){}, removeEventListener(){},
    querySelector(sel){ return lkFinde(body, sel)[0] || null; },
    querySelectorAll(sel){ return lkFinde(body, sel); },
  };
}

/* ----------------------------- Daten-Ersatz -----------------------------
   Bekannte Namen und Werte: jede Zahl in der Ansicht ist damit nachrechenbar. */
const LK_NAMEN = {"lab.ip": "IP-Adresse und Maske setzen", "lab.netz": "Gleiches Netz? (Maske anwenden)",
  "lab.vlan": "VLANs und Access-Ports", "lab.dhcp": "DHCP (DORA, Pool, Relay)", "lab.trunk": "Trunk und 802.1Q"};

function lkL(o = {}){
  const due = o.due || ["lab.ip", "lab.vlan"];
  const boxen = Object.assign({"lab.ip": 2, "lab.vlan": 1, "lab.dhcp": 1, "lab.nat": 4}, o.boxen || {});
  const namen = ["neu", "gesehen", "geübt", "sicher", "gemeistert", "gemeistert ★"];
  const skills = {};
  for (const id of [...due, ...Object.keys(boxen), "k:net-01"]) skills[id] = {id, name: LK_NAMEN[id] || id};
  return {
    SKILLS: skills,
    INTERVALL: [0, 1, 3, 7, 14, 30],
    st: {fehler: o.fehler || []},
    faelligeIds(filter){ return due.filter(filter || (() => true)); },
    box(id){ return boxen[id] || 0; },
    stufeName(id){ return boxen[id] ? namen[boxen[id]] : "neu"; },
    versucht(id){ return (boxen[id] || 0) > 0; },
    istFaellig(id){ return due.indexOf(id) >= 0; },
    behalten(){ return o.behalten || {"1": [0, 0], "3": [0, 0], "7": [0, 0]}; },
    serie(){ return o.serie == null ? 3 : o.serie; },
    heuteZahl(){ return o.heute == null ? 2 : o.heute; },
  };
}
function lkStandardKarte(){
  return {sichtbar: 3, gesamt: 4, regionen: [
    {id: "adressierung", titel: "Adressierung", sym: "🔢", felder: [
      {id: "lab.ip", name: "IP-Adresse und Maske setzen", stufe: 1, ap: "AP1", zustand: "geübt", box: 2},
      {id: "lab.netz", name: "Gleiches Netz? (Maske anwenden)", stufe: 1, ap: "AP1", zustand: "offen", box: 0},
    ]},
    {id: "switching", titel: "Switching & VLAN", sym: "🔀", felder: [
      {id: "lab.vlan", name: "VLANs und Access-Ports", stufe: 1, ap: "AP1", zustand: "gesehen", box: 1},
      {id: "lab.trunk", name: "Trunk und 802.1Q", stufe: 2, ap: "AP1", zustand: "nebel", box: 0},
    ]},
  ]};
}
function lkKarteOhneOffen(){
  const k = lkStandardKarte();
  for (const r of k.regionen) for (const f of r.felder) f.zustand = f.zustand === "offen" ? "sicher" : f.zustand;
  return k;
}
function lkSpiel(o = {}, rufs = {}){
  const st = Object.assign({stufe: 2, ruf: 14, euro: 0, zertifikate: [], pruefungen: []}, o.st || {});
  const info = o.info === null ? null : Object.assign({
    stufe: 2, name: "Fachkraft", naechste: {nr: 3, name: "Geselle"},
    ruf: {ist: 14, soll: 55, ok: false, fehlt: 41},
    koennen: {summe: 3, sollSumme: 8, ok: false, fehlPunkte: 5, fehlend: []},
    bereit: false, max: false,
  }, o.info || {});
  const trainingRufe = rufs.trainingRufe || [], pruefungRufe = rufs.pruefungRufe || [];
  return {
    st, stufeInfo: () => info,
    PRUEFUNG: {MINUTEN: 25, AUFGABEN: 3, GEBUEHR: {AP1: 40, AP2: 80}, BESTANDEN_AB: 50},
    pruefung: Object.assign({
      aktiv: () => o.aktiv || null,
      restMs: () => 0,
      starten: art => { pruefungRufe.push(art); return {ok: true, gebuehrErlassen: false}; },
      abgeben: () => null,
    }, o.pruefung || {}),
    abzeichen: {pruefen(){}, liste: () => o.abzeichen || []},
    karriere: {skillName: id => LK_NAMEN[id] || id,
      training: skill => { trainingRufe.push(skill); return {art: "keins", grund: "Kein Training im Test."}; }},
    kompetenz: {karte: () => o.karte || lkStandardKarte()},
    instanz: () => null, defVon: () => null,
    skill: id => ({id, name: LK_NAMEN[id] || id}),
  };
}

/* ----------------------------- Prüfstand -----------------------------
   Lädt karriere.js (dort stehen die gemeinsamen Helfer und die Registrierungen), danach
   lernstand.js und – in der gebauten Fassung immer vorhanden – naechster.js in einem eigenen
   Bereich mit nachgebildetem DOM. o.Spiel / o.L ersetzen die Daten, o.echt nutzt das echte Spiel. */
function lkPruefstand(o = {}){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const rufe = [], registriert = [], startHaken = [], busHaken = [], trainingRufe = [], pruefungRufe = [], ansichten = [];
  const dok = lkDokument();
  const UIstub = {
    startHaken,
    app: {registrieren: (name, def) => { registriert.push({name, def}); }, einstellungAbschnitt(){}, ansicht: n => ansichten.push(n), aktualisieren(){}},
    toast: (text, art, opt) => rufe.push(["toast", text, art, opt]),
    menue: (...a) => rufe.push(["menue"].concat(a)),
    symbol: (n, g) => lkH("svg", {class: "sym-" + n}),
    spiel: {oeffnen: iid => rufe.push(["spiel", iid])},
  };
  const bereich = {
    console: {log(){}, warn(){}, error(){}, info(){}},
    UI: UIstub, h: lkH, document: dok,
    requestAnimationFrame: fn => { try { fn(0); } catch (e) { /* im Test egal */ } return 0; },
    setTimeout: () => 0, clearTimeout(){}, setInterval: () => 0, clearInterval(){},
    Date, Math, JSON, Intl,
    datumDe: t => String(t).split("-").reverse().join("."),
    zahlDe: x => String(x),
    heute: () => "2026-10-31",
    eur: x => String(x),
    klemme: (x, lo, hi) => Math.max(lo, Math.min(hi, x)),
    Bus: {an: (art, fn) => { busHaken.push({art, fn}); return () => {}; }, aus(){}, senden(){}},
  };
  if (o.echt) { bereich.Spiel = Spiel; bereich.L = L; }
  else {
    if (o.ohneL !== true) bereich.L = o.L || lkL(o.l || {});
    if (o.ohneSpiel !== true) bereich.Spiel = o.Spiel || lkSpiel(Object.assign({}, o, o.s || {}), {trainingRufe, pruefungRufe});
  }
  vm.createContext(bereich);
  const quelle = f => fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8");
  const lauf = (f, text) => vm.runInContext(text == null ? quelle(f) : text, bereich, {filename: "ui/" + f});
  lauf("karriere.js");
  lauf("lernstand.js");
  if (!o.ohneNaechster) lauf("naechster.js");
  return {UI: bereich.UI, bereich, rufe, registriert, startHaken, busHaken, trainingRufe, pruefungRufe, ansichten, dok, lauf};
}
/* Die Ansicht so bauen, wie src/ui/app.js sie baut: zeigen(container). */
function lkZeichnen(p){
  const c = lkKnoten("div");
  p.UI.lernstand.ansicht(c);
  return c;
}
const lkTexte = (el, sel) => el.querySelectorAll(sel).map(x => x.textContent);

/* Kapsel wie in tests/spiel-*.test.js: eigener Spielstand, danach alles zurück. */
function lkKapsel(fn){
  return () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      if (!Spiel._st) Spiel._st = Spiel.leererStand();
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
    }
  };
}
function lkLKapsel(fn){
  return () => {
    const alt = JSON.parse(JSON.stringify(L.st));
    try { fn(); } finally { for (const k of Object.keys(L.st)) delete L.st[k]; Object.assign(L.st, alt); }
  };
}

/* Nichts fällig und nichts wackelig: alle Labor-Fertigkeiten stehen auf Leitner-Fach 3 oder höher. */
const L_SICHER = {"lab.ip": 3, "lab.vlan": 3, "lab.dhcp": 3, "lab.nat": 4};

/* ----------------------------- Prüfungen ----------------------------- */
gruppe("UI: Lernstand-Cockpit (Runde 4, Strang B)", () => {
  pruefe("Start-Haken meldet die Ansicht „lernstand“ an und baut das Cockpit" + LK_ZUSATZ, () => {
    if (!LK_KANN_LADEN) return;
    const p = lkPruefstand();
    for (const haken of p.startHaken.slice()) haken();
    const def = p.registriert.find(r => r.name === "lernstand");
    erwarte.wahr(!!def, "die Ansicht „lernstand“ wird angemeldet");
    if (!def) return;
    erwarte.gleich(def.def.titel, "Lernstand", "der Andock-Knopf behält seinen Namen");
    erwarte.gleich(typeof def.def.zeigen, "function", "es gibt einen Zeichner");
    erwarte.gleich(def.def.zaehler(), 2, "der Zähler zeigt fällige Labor-Fertigkeiten");
    const c = lkKnoten("div");
    def.def.zeigen(c);
    erwarte.wahr(!!c.querySelector(".kr-seite"), "die Seite steht (.kr-seite bleibt Haken)");
    erwarte.wahr(!!c.querySelector(".kr-kopf"), "der Kopf steht (.kr-kopf bleibt Haken)");
    erwarte.wahr(!!c.querySelector(".lern-raster"), "das Cockpit-Raster ist gebaut");
    erwarte.gleich(c.querySelectorAll(".bn-k").length >= 7, true, "die Kacheln tragen den Bento-Baustein bn-k");
  });

  pruefe("Kopf: Mikrolabel, Titel und Kontext aus echten Werten" + LK_ZUSATZ, () => {
    if (!LK_KANN_LADEN) return;
    const c = lkZeichnen(lkPruefstand());
    erwarte.gleich(c.querySelector(".kr-kopf .bn-kicker").textContent, "Ausbildung · Überblick", "das Mikrolabel steht im Kopf");
    erwarte.gleich(c.querySelector(".kr-kopf h2").textContent, "Lernstand", "der Titel ist „Lernstand“");
    const kontext = c.querySelector(".lern-kontext").textContent;
    erwarte.enthaelt(kontext, "Stufe 2 · Fachkraft", "die Stufe aus Spiel.stufeInfo");
    erwarte.enthaelt(kontext, "Ruf 14", "der echte Ruf");
    erwarte.enthaelt(kontext, "Serie: 3 Tage", "die Serie aus dem Lernmotor");
    erwarte.enthaelt(kontext, "heute 2 Übungen", "die heutigen Übungen");
    erwarte.enthaelt(kontext, "2 Wiederholungen fällig", "die fälligen Wiederholungen");
  });

  pruefe("Prüfungsreife-Kachel: Ruf, Können, Prüfungstag – echte Werte, keine Prognose" + LK_ZUSATZ, () => {
    if (!LK_KANN_LADEN) return;
    const p = lkPruefstand();
    const c = lkZeichnen(p);
    const reife = c.querySelector(".lern-reife");
    erwarte.wahr(!!reife, "die Prüfungsreife-Kachel steht");
    erwarte.gleich(reife.querySelector(".bn-kicker").textContent, "Prüfungsreife");
    erwarte.gleich(reife.querySelector(".lern-reife-wert").textContent, "Noch nicht bereit für Stufe 3", "der Status nennt die nächste Stufe");
    erwarte.gleich(lkTexte(reife, ".lern-reife-label"), ["Ruf", "Können Stufe 2", "Prüfungstag"], "drei Voraussetzungszeilen");
    erwarte.gleich(lkTexte(reife, ".lern-reife-stand"), ["14 / 55", "3 / 8", "noch nicht abgelegt"], "die Werte kommen aus stufeInfo, nicht aus einer Schätzung");
    erwarte.falsch(/%/.test(reife.textContent), "keine Prozent-Prognose in der Reife-Kachel");
    const kopieren = c.querySelector(".lern-kopf .lern-kopieren");
    erwarte.wahr(!!kopieren, "„Auswertung kopieren“ bleibt als Geist-Knopf im Kopf erreichbar");
    /* Der Geist-Knopf ruft den bestehenden Weg (UI.hub.tagebuchKopieren). */
    p.UI.hub = {tagebuchKopieren: () => p.rufe.push(["tagebuch"])};
    kopieren.click();
    erwarte.gleich(p.rufe.filter(r => r[0] === "tagebuch").length, 1, "der Klick kopiert über den bestehenden Weg");
  });

  pruefe("Nächster Schritt: prominent, genau eine Hauptaktion, echter Übungsweg" + LK_ZUSATZ, () => {
    if (!LK_KANN_LADEN) return;
    const p = lkPruefstand();
    const c = lkZeichnen(p);
    erwarte.gleich(p.UI.naechster.schritt().art, "faellig", "die höchste Priorität ist die fällige Wiederholung");
    erwarte.gleich(p.UI.naechster.schritt().skill, "lab.ip", "und zwar die erste fällige Fertigkeit");
    const kachel = c.querySelector(".nst-kachel");
    erwarte.wahr(!!kachel, "die Kachel „Nächster Schritt“ steht (nst-* bleibt Haken)");
    if (!kachel) return;
    erwarte.gleich(kachel.getAttribute("data-art"), "faellig", "die Kachel trägt ihren Anlass");
    erwarte.enthaelt(kachel.textContent, "Nächster Schritt", "das Mikrolabel ist eindeutig");
    erwarte.enthaelt(kachel.textContent, "IP-Adresse und Maske setzen", "der echte Fertigkeitsname");
    erwarte.enthaelt(kachel.textContent, "fällig", "der Grund steht als Text");
    erwarte.enthaelt(kachel.textContent, "Leitner-Stufe 2 von 5", "die echte Leitner-Stufe");
    erwarte.enthaelt(kachel.textContent, "die nächste Wiederholung ist in 7 Tagen fällig", "der nächste Termin aus L.INTERVALL (Fach 2 → Fach 3 = 7 Tage)");
    erwarte.gleich(kachel.querySelectorAll("button").length, 1, "genau eine Aktion in der Kachel");
    erwarte.gleich(c.querySelectorAll(".knopf.primaer").length, 1, "genau eine Hauptaktion in der ganzen Ansicht");
    kachel.querySelector(".nst-aktion").click();
    erwarte.gleich(p.trainingRufe, ["lab.ip"], "die Hauptaktion nimmt den bestehenden Übungsweg");
    erwarte.gleich(p.rufe.filter(r => r[0] === "toast").length, 1, "das Ergebnis wird gemeldet, nicht verschluckt");
  });

  pruefe("„Danach“: nur die restlichen fälligen/wackeligen Fertigkeiten, je Zeile ein Üben-Knopf" + LK_ZUSATZ, () => {
    if (!LK_KANN_LADEN) return;
    const p = lkPruefstand();
    const c = lkZeichnen(p);
    const kachel = c.querySelector(".lern-training");
    erwarte.wahr(!!kachel, "die Training-Kachel steht");
    erwarte.gleich(lkTexte(kachel, ".lern-zahl"), ["2 fällig · 1 wackelt"], "die Kachel zählt fällig und wackelig");
    const zeilen = kachel.querySelectorAll(".lern-empfehlung");
    erwarte.gleich(zeilen.map(z => z.getAttribute("data-skill")), ["lab.vlan", "lab.dhcp"], "der nächste Schritt steht oben, danach folgt der Rest");
    erwarte.gleich(zeilen.map(z => z.querySelector(".lern-empfehlung-grund").textContent),
      ["fällig – Wiederholung steht an", "wackelt – Leitner-Stufe 1 von 5"], "jede Zeile nennt ihren echten Grund");
    erwarte.gleich(kachel.querySelectorAll(".knopf").length, 3, "je Zeile ein Üben-Knopf plus der Weg in den Trainingsbereich");
    zeilen[0].querySelector(".lern-empfehlung-ueben").click();
    erwarte.gleich(p.trainingRufe, ["lab.vlan"], "die Zeile übt ihre eigene Fertigkeit");
  });

  pruefe("Fehlerheft: echter Fehlertext, Datum und Üben-Knopf" + LK_ZUSATZ, () => {
    if (!LK_KANN_LADEN) return;
    const p = lkPruefstand({l: {fehler: [
      {t: "2026-10-29", spiel: "labor", unit: "lab.dhcp", text: "Ziel 2 nicht erreicht – PORT_CLOSED"},
      {t: "2026-10-30", spiel: "labor", unit: "lab.ip", text: "Antwort falsch: Maske geprüft"},
      {t: "2026-10-30", spiel: "fisi", unit: "k:net-01", text: "gehört einem anderen Spiel"},
    ]}});
    const c = lkZeichnen(p);
    const zeilen = c.querySelectorAll(".lern-fehler-zeile");
    erwarte.gleich(zeilen.length, 2, "nur Fehler des Labors stehen im Register");
    erwarte.enthaelt(zeilen[0].textContent, "DHCP (DORA, Pool, Relay)", "der Name der Fertigkeit");
    erwarte.enthaelt(zeilen[0].textContent, "Ziel 2 nicht erreicht – PORT_CLOSED", "der echte Fehlertext, kein Stichpunkt");
    erwarte.enthaelt(zeilen[0].textContent, "notiert am 29.10.2026", "das echte Datum");
    zeilen[0].querySelector(".lern-fehler-ueben").click();
    erwarte.gleich(p.trainingRufe, ["lab.dhcp"], "der Üben-Knopf nimmt den bestehenden Weg");
  });

  pruefe("Fehlerheft leer und ohne Lernmotor: ehrlicher Zustand statt erfundener Zeilen" + LK_ZUSATZ, () => {
    if (!LK_KANN_LADEN) return;
    const leer = lkZeichnen(lkPruefstand());
    erwarte.gleich(leer.querySelectorAll(".lern-fehler-zeile").length, 0, "ohne Einträge keine Zeilen");
    erwarte.enthaelt(leer.querySelector(".lern-fehler-leer").textContent, "Noch kein Fehler notiert", "der Leerzustand sagt es");
    const ohne = lkZeichnen(lkPruefstand({ohneL: true}));
    erwarte.enthaelt(ohne.querySelector(".lern-fehler-leer").textContent, "Lernmotor", "ohne Lernmotor wird das gesagt, nicht erfunden");
    erwarte.gleich(ohne.querySelectorAll(".lern-fehler-zeile").length, 0);
  });

  pruefe("Behalten: ehrliche „–“, wo nichts gemessen ist" + LK_ZUSATZ, () => {
    if (!LK_KANN_LADEN) return;
    const c = lkZeichnen(lkPruefstand());
    const kachel = c.querySelector(".lern-behalten");
    erwarte.gleich(lkTexte(kachel, ".lern-quote-wert"), ["–", "–", "–"], "drei ehrliche Striche statt geschätzter Zahlen");
    erwarte.gleich(lkTexte(kachel, ".lern-quote-meta"), ["keine Messung", "keine Messung", "keine Messung"]);
    erwarte.gleich(kachel.querySelector(".lern-zahl").textContent, "keine Messung");
    erwarte.falsch(/%/.test(kachel.textContent), "keine Prozentzahl ohne Messung");
    erwarte.gleich(kachel.querySelectorAll(".lern-quote-bar").length, 0, "ohne Messung auch kein erfundener Balken");
  });

  pruefe("Behalten: Quoten rechnet die Ansicht aus L.behalten aus" + LK_ZUSATZ, () => {
    if (!LK_KANN_LADEN) return;
    const c = lkZeichnen(lkPruefstand({l: {behalten: {"1": [2, 3], "3": [1, 4], "7": [0, 2]}}}));
    const kachel = c.querySelector(".lern-behalten");
    erwarte.gleich(lkTexte(kachel, ".lern-quote-wert"), ["67 %", "25 %", "0 %"], "dieselbe Rechnung wie L.behalten");
    erwarte.gleich(lkTexte(kachel, ".lern-quote-meta"), ["2 von 3 richtig", "1 von 4 richtig", "0 von 2 richtig"]);
    erwarte.gleich(kachel.querySelector(".lern-zahl").textContent, "9 Messungen", "die Summe der echten Messungen");
    erwarte.gleich(kachel.querySelectorAll(".lern-quote-bar").length, 3, "mit Messung gibt es einen Balken");
  });

  pruefe("Kompetenzkarte: sechs Regionen als Register, Zustand als Text und Form" + LK_ZUSATZ, () => {
    if (!LK_KANN_LADEN) return;
    const c = lkZeichnen(lkPruefstand());
    const karte = c.querySelector(".kk-karte");
    erwarte.wahr(!!karte, "die Kompetenzkarte bleibt Baustein (kk-*)");
    erwarte.gleich(karte.querySelectorAll(".kk-region").length, 2, "je Region ein Register");
    erwarte.gleich(lkTexte(karte, ".kk-region-nr"), ["01", "02"], "die Register sind numeriert");
    erwarte.gleich(lkTexte(karte, ".kk-region h4"), ["Adressierung", "Switching & VLAN"], "die Regionstitel");
    erwarte.gleich(karte.querySelectorAll(".kk-feld").length, 4, "jedes Feld ist eine Zeile");
    erwarte.gleich(lkTexte(karte, ".kk-stufe"), ["fällig", "neu", "fällig", "im Nebel"], "der Zustand steht als Text");
    erwarte.gleich(karte.querySelectorAll(".kk-feld .kk-form").length, 4, "und als Form");
    erwarte.gleich(lkTexte(karte, ".kk-name"), ["IP-Adresse und Maske setzen", "Gleiches Netz? (Maske anwenden)", "VLANs und Access-Ports", "?"], "der Nebel bleibt Nebel");
    erwarte.gleich(karte.querySelectorAll(".kk-legende-punkt").length, 8, "die Zustandslegende erklärt alle Formen");
    erwarte.falsch(/🔢|🔀/.test(karte.textContent), "kein Emoji aus den Daten im UI-Chrome");
  });

  pruefe("Abzeichen: ruhiges Register, Zustand als Text und Form, kein Emoji aus den Daten" + LK_ZUSATZ, () => {
    if (!LK_KANN_LADEN) return;
    const p = lkPruefstand({s: {abzeichen: [
      {id: "erster-kunde", sym: "🎫", titel: "Erster Kunde", text: "Das erste Ticket abgenommen.", lehrt: "Schicht 1 zuerst.", ist: 1, soll: 1, erhalten: 1730000000000},
      {id: "dranbleiber", sym: "🔥", titel: "Dranbleiber", text: "An 3 Tagen geübt.", lehrt: "Verteiltes Üben.", ist: 1, soll: 3, erhalten: null},
    ]}});
    const c = lkZeichnen(p);
    const kachel = c.querySelector(".lern-abzeichen");
    erwarte.gleich(kachel.querySelectorAll(".lern-abz").length, 2, "alle Abzeichen stehen");
    erwarte.gleich(kachel.querySelectorAll(".lern-abz.hat").length, 1, "erhaltene sind als erhalten markiert");
    erwarte.gleich(kachel.querySelector(".lern-zahl").textContent, "1 von 2", "die echte Zahl");
    erwarte.gleich(kachel.querySelectorAll(".lern-abz-chip").length, 1, "erhaltene Abzeichen stehen offen als Chip");
    erwarte.enthaelt(kachel.querySelector(".lern-abz-chip").textContent, "Erster Kunde", "mit ihrem echten Titel");
    erwarte.enthaelt(kachel.querySelector(".lern-abz-summary").textContent, "Alle 2 Abzeichen ansehen", "das vollständige Register ist zugeklappt erreichbar");
    erwarte.enthaelt(kachel.textContent, "erhalten am 31.10.2026", "das echte Datum");
    erwarte.enthaelt(kachel.textContent, "1 / 3", "der echte Fortschritt des offenen Abzeichens");
    erwarte.falsch(/🎫|🔥/.test(c.textContent), "kein Emoji aus den Daten im UI-Chrome");
  });

  pruefe("Prüfungstag: echte Termine und Gebühren, laufende Prüfung erreichbar" + LK_ZUSATZ, () => {
    if (!LK_KANN_LADEN) return;
    const p = lkPruefstand();
    const c = lkZeichnen(p);
    const kachel = c.querySelector(".lern-pruefung");
    erwarte.enthaelt(kachel.textContent, "3 Aufgaben, 25 Minuten, keine Hilfe", "die echten Prüfungsdaten");
    erwarte.gleich(lkTexte(kachel, ".lern-pruefung-knoepfe .knopf"),
      ["Prüfung AP1 starten (gebührenfrei)", "AP2 (gebührenfrei)"], "die erste Prüfung ist frei – für beide Bögen (Regel aus Spiel.pruefung.starten)");
    kachel.querySelector(".lern-pruefung-start").click();
    erwarte.gleich(p.pruefungRufe, ["AP1"], "der Startknopf nimmt den bestehenden Weg");
    /* Mit Verlauf ist auch AP1 nicht mehr frei. */
    const nach = lkZeichnen(lkPruefstand({s: {st: {pruefungen: [{art: "AP1", punkte: 40, note: 5}]}}}));
    erwarte.gleich(lkTexte(nach.querySelector(".lern-pruefung"), ".lern-pruefung-knoepfe .knopf"),
      ["Prüfung AP1 starten (40 €)", "AP2 (80 €)"], "nach dem ersten Versuch gelten die echten Gebühren");
    /* Mit Zertifikat steht das Ergebnis im Register. */
    const mit = lkZeichnen(lkPruefstand({s: {st: {zertifikate: [{art: "AP1", note: 2, tag: "2026-10-30"}]}}}));
    erwarte.enthaelt(mit.querySelector(".lern-pruefung .kr-zertifikat").textContent, "AP1 · Note 2 · 30.10.2026", "das Zertifikat steht im Prüfungsregister");
    /* Eine laufende Prüfung bekommt genau den Weg zurück in die Übersicht. */
    const laufend = lkPruefstand({pruefung: {aktiv: () => ({art: "AP1", aufgaben: []})}});
    const cl = lkZeichnen(laufend);
    erwarte.gleich(lkTexte(cl.querySelector(".lern-pruefung"), ".lern-pruefung-knoepfe .knopf"), ["Laufende Prüfung AP1 öffnen"]);
    cl.querySelector(".lern-pruefung-oeffnen").click();
    erwarte.enthaelt(laufend.dok.body.textContent, "Prüfung AP1", "der Klick öffnet die bestehende Prüfungsübersicht");
  });

  pruefe("Nächster Schritt: Prioritäten und Rückfälle (Prüfung, Aufstieg, offen, leer)" + LK_ZUSATZ, () => {
    if (!LK_KANN_LADEN) return;
    /* Laufende Prüfung schlägt alles andere. */
    const exam = lkPruefstand({pruefung: {aktiv: () => ({art: "AP1", aufgaben: []})}});
    const ce = lkZeichnen(exam);
    erwarte.gleich(ce.querySelector(".nst-kachel").getAttribute("data-art"), "pruefung-laeuft");
    ce.querySelector(".nst-aktion").click();
    erwarte.enthaelt(exam.dok.body.textContent, "Prüfung AP1", "„Prüfung öffnen“ führt in die bestehende Übersicht");
    /* Aufstieg steht an: die Hauptaktion führt ins Postfach (dort kommt der nächste Auftrag). */
    const auf = lkPruefstand({l: {due: [], boxen: L_SICHER}, s: {info: {bereit: true}}});
    const ca = lkZeichnen(auf);
    const ka = ca.querySelector(".nst-kachel");
    erwarte.gleich(ka.getAttribute("data-art"), "aufstieg", "bereit für die nächste Stufe");
    erwarte.enthaelt(ka.textContent, "Aufstieg nach Stufe 3", "die nächste Stufe steht im Titel");
    erwarte.gleich(lkTexte(ka, ".nst-wert"), ["14 / 55", "3 / 8"], "die erreichten Werte, keine Prognose");
    ka.querySelector(".nst-aktion").click();
    erwarte.gleich(auf.ansichten, ["postfach"], "die Hauptaktion führt ins Postfach");
    /* Nichts fällig, aber ein offenes Feld: das erste offene Feld ist der nächste Schritt. */
    const off = lkPruefstand({l: {due: [], boxen: L_SICHER}});
    const co = lkZeichnen(off);
    const ko = co.querySelector(".nst-kachel");
    erwarte.gleich(ko.getAttribute("data-art"), "offen");
    erwarte.enthaelt(ko.textContent, "Gleiches Netz? (Maske anwenden)", "das erste offene Feld");
    /* Prüfer-1-Befund: ein nie geübtes Feld hat keinen Wiederholungstermin. */
    erwarte.falsch(/Wiederholung ist (morgen|in \d+ Tagen)/.test(ko.textContent), "kein Wiederholungstermin für ein nie geübtes Feld");
    erwarte.enthaelt(ko.textContent, "Erster Versuch – ein Wiederholungstermin entsteht erst danach.", "der Satz sagt ehrlich, dass es der erste Versuch ist");
    erwarte.gleich(ko.querySelector(".nst-aktion").textContent, "Jetzt anfangen", "die Hauptaktion sagt, was jetzt zu tun ist");
    ko.querySelector(".nst-aktion").click();
    erwarte.gleich(off.trainingRufe, ["lab.netz"], "auch dieses Feld nimmt den bestehenden Übungsweg");
    /* Nichts offen, keine Prüfung abgelegt: der Prüfungstag ist möglich. */
    const pr = lkPruefstand({l: {due: [], boxen: L_SICHER}, s: {karte: lkKarteOhneOffen()}});
    const cp = lkZeichnen(pr);
    const kp = cp.querySelector(".nst-kachel");
    erwarte.gleich(kp.getAttribute("data-art"), "pruefung", "der Prüfungstag ist der nächste echte Schritt");
    erwarte.enthaelt(kp.querySelector(".nst-aktion").textContent, "Prüfung AP1 starten (gebührenfrei)", "mit der echten Gebührenlage");
    kp.querySelector(".nst-aktion").click();
    erwarte.gleich(pr.pruefungRufe, ["AP1"], "der Weg ist der bestehende Prüfungsstart");
    /* Beides bestanden, nichts offen: ehrlicher Leerzustand mit einem Weg. */
    const le = lkPruefstand({l: {due: [], boxen: L_SICHER},
      s: {karte: lkKarteOhneOffen(), st: {zertifikate: [{art: "AP1", note: 2, tag: "2026-10-30"}, {art: "AP2", note: 3, tag: "2026-10-30"}]}}});
    const cl = lkZeichnen(le);
    const kl = cl.querySelector(".nst-kachel");
    erwarte.gleich(kl.getAttribute("data-art"), "leer", "nichts fällig, nichts offen");
    kl.querySelector(".nst-aktion").click();
    erwarte.gleich(le.ansichten, ["training"], "die letzte Hauptaktion führt in den Trainingsbereich");
  });

  pruefe("Keine erfundenen Zahlen: alle Anzeigen sind nachrechenbar" + LK_ZUSATZ, () => {
    if (!LK_KANN_LADEN) return;
    const p = lkPruefstand();
    const c = lkZeichnen(p);
    const text = c.textContent;
    erwarte.enthaelt(c.querySelector(".lern-reife").textContent, "14 / 55", "Ruf ist der echte Wert");
    erwarte.enthaelt(c.querySelector(".lern-reife").textContent, "3 / 8", "Können ist der echte Wert");
    erwarte.enthaelt(c.querySelector(".lern-training").textContent, "2 fällig · 1 wackelt", "die Zählung stammt aus dem Lernmotor");
    erwarte.falsch(/99[.,]9|SLA|Reaktionszeit|Prognose/i.test(text), "keine erfundenen Kennzahlen");
    erwarte.falsch(/%/.test(text), "ohne Messung steht nirgends eine Prozentzahl");
  });

  /* ---------------- Wirkung: das echte Spiel, der echte Lernmotor ----------------
     Kein Ersatz für Spiel oder L: die Ansicht liest den echten Spielstand und den echten
     Lernmotor. Geprüft wird, dass die Zahlen der Ansicht die Zahlen des Stands sind. */
  pruefe("Wirkung: mit echtem Spiel und Lernmotor zeigt das Cockpit echte Werte", lkKapsel(lkLKapsel(() => {
    if (!LK_KANN_LADEN) return;
    Spiel._st = Spiel.leererStand();
    Spiel._st.stufe = 2; Spiel._st.ruf = 14;
    for (const k of Object.keys(L.st)) delete L.st[k];
    Object.assign(L.st, {v: 1, units: {}, log: [], fehler: [], tage: {}, tests: []});
    L.st.units["lab.ip"] = {box: 2, due: heute(), r: 2, f: 0, last: heute(), sf: 0};
    L.st.fehler = [{t: heute(), spiel: "labor", unit: "lab.ip", text: "Ziel 1 nicht erreicht – ROUTE"}];
    L.st.log = [{d: heute(), id: "lab.ip", ok: true, abst: 1}];
    const p = lkPruefstand({echt: true});
    const c = lkZeichnen(p);
    const name = Spiel.karriere.skillName("lab.ip");
    erwarte.enthaelt(c.querySelector(".lern-kontext").textContent, "Stufe 2", "die Stufe kommt aus dem echten Stand");
    erwarte.gleich(c.querySelector(".nst-kachel").getAttribute("data-art"), "faellig", "die echte fällige Fertigkeit ist der nächste Schritt");
    erwarte.enthaelt(c.querySelector(".nst-titel").textContent, name, "mit dem echten Fertigkeitsnamen");
    erwarte.enthaelt(c.querySelector(".lern-fehler-zeile").textContent, "Ziel 1 nicht erreicht – ROUTE", "der echte Fehlertext steht im Register");
    erwarte.enthaelt(c.querySelector(".lern-fehler-zeile").textContent, "notiert am " + datumDe(heute()), "mit dem echten Datum");
    erwarte.gleich(lkTexte(c, ".lern-quote-wert"), ["100 %", "–", "–"], "die echte Behaltensmessung (eine Antwort nach 1–2 Tagen)");
    erwarte.enthaelt(c.querySelector(".lern-behalten").textContent, "1 Messung", "die Summe der echten Messungen");
    const info = Spiel.stufeInfo();
    erwarte.enthaelt(c.querySelector(".lern-reife").textContent, info.ruf.ist + " / " + info.ruf.soll, "der echte Ruf im Verhältnis");
    erwarte.gleich(c.querySelectorAll(".knopf.primaer").length, 1, "auch mit echten Daten genau eine Hauptaktion");
  })));
});
