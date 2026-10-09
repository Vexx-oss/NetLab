"use strict";
/* ---------- Streifen entlasten (task-21): im Fehlerfall nur Fehlertext + erster Vorschlag ----------
   Gemessen wurde die Textwand im Terminal-Streifen (Review „Auffindbarkeit", Befund 3):
   im Fehlerfall standen 1 279 Zeichen gleichzeitig im Streifen (azubi) bzw. 1 404 (azubi-plus).
   Eigene Messung vor der Änderung (09.10.2026, mit dem heutigen Stand von Baustein E):
   azubi 1 466 = Kopf 29 · Fehler 298 · Gerüst 210 · Leiter 356 · Vorschlag 265 · Brücke 308.
   NACH der Änderung (dieselbe Messung): azubi 612 = Kopf 29 · Fehler 298 · Vorschlag 265 ·
   Klappzeile 20 · azubi-plus 617 – das ist 58 % weniger, und azubi-plus liest nur noch 5 Zeichen
   mehr als azubi (vorher 125).
   Diese Datei prüft die Entlastung am echten DOM-Weg (src/ui/dom.js + src/ui/hilfe.js in einem
   eigenen vm-Bereich mit nachgebildetem DOM) und NAGELT die sichtbare Zeichenzahl fest: eingeklappte
   Bereiche zählen nicht mit (sie sind einen Klick entfernt), sichtbar ist nur, was ohne Klick dasteht.
   Die Grenzen (620/630) liegen knapp über den gemessenen Werten (612/617): ein Rückfall auf 1 466
   fällt damit sofort auf, eine Wortkorrektur im Fehlertext nicht.
   Vertrag: docs/entwicklung/Hilfestellung – Stufen und Schnittstellen.md § 2, § 2.1, § 4.1.
   Allein lauffähig:  node tests/spiel-hilfe-streifen.test.js */
function stHatRequire(){ try { return typeof require === "function"; } catch (e) { return false; } }
const ST_KANN_LADEN = (() => {
  try { return stHatRequire() && typeof document === "undefined" && typeof Spiel === "object" && Spiel !== null; } catch (e) { return false; }
})();
const ST_ZUSATZ = ST_KANN_LADEN ? "" : " (kein require im Testbereich – nur allein lauffähig: node tests/spiel-hilfe-streifen.test.js)";

/* Dieselbe Ladereihenfolge wie tests/run.js; danach läuft dieselbe Datei noch einmal – dann mit DOM-Ersatz. */
function stAlleinLaden(){
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
  const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename});
  let ergebnisse;
  try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "spiel-hilfe-streifen.test.js"}); }
  catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
  const rot = ergebnisse.filter(e => !e.ok);
  for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
  console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
  process.exit(rot.length ? 1 : 0);
}
if (typeof Spiel === "undefined" && typeof document === "undefined" && stHatRequire()) stAlleinLaden();

/* ---------- DOM-Ersatz (nur für den vm-Bereich) ---------- */
const stKlassen = el => String(el.className || (el.attrs && el.attrs.class) || "").split(/\s+/).filter(Boolean);
function stFinde(el, sel){
  const klassen = String(sel).split(".").filter(Boolean), treffer = [];
  const lauf = k => {
    for (const x of k.kinder || []) if (x && typeof x === "object" && x.nodeType === 1) {
      if (klassen.every(c => stKlassen(x).includes(c))) treffer.push(x);
      lauf(x);
    }
  };
  lauf(el);
  return treffer;
}
const stTextwert = k => k == null ? "" : typeof k === "string" ? k : (k.nodeType === 3 ? k.text : (k.textContent || ""));
function stKnoten(tag){
  const el = {tag, nodeType: 1, kinder: [], attrs: {}, className: "", value: "", disabled: false, isConnected: true, eltern: null,
    listeners: {}, style: {setProperty(){}}, _text: ""};
  el.classList = {
    add(...c){ const s = new Set(stKlassen(el)); for (const x of c) s.add(x); el.className = [...s].join(" "); },
    remove(...c){ const s = new Set(stKlassen(el)); for (const x of c) s.delete(x); el.className = [...s].join(" "); },
    toggle(c, an){ const will = an === undefined ? !stKlassen(el).includes(c) : !!an; if (will) el.classList.add(c); else el.classList.remove(c); },
    contains: c => stKlassen(el).includes(c),
  };
  el.append = (...k) => {
    for (const x of k.flat(Infinity)) {
      if (x == null || x === false) continue;
      const kind = typeof x === "object" && x.nodeType ? x : {nodeType: 3, text: String(x)};
      if (kind.nodeType === 1) kind.eltern = el;
      el.kinder.push(kind);
    }
  };
  el.appendChild = k => { el.append(k); return k; };
  el.replaceChildren = (...k) => { el.kinder = []; el.append(...k); };
  el.remove = () => { if (el.eltern) el.eltern.kinder = el.eltern.kinder.filter(x => x !== el); el.eltern = null; };
  el.setAttribute = (k, v) => { el.attrs[k] = String(v); if (k === "class") el.className = String(v); };
  el.getAttribute = k => (k in el.attrs ? el.attrs[k] : null);
  el.addEventListener = (art, fn) => { (el.listeners[art] ||= []).push(fn); };
  el.feuern = (art, ev) => { for (const fn of (el.listeners[art] || []).slice()) fn(Object.assign({currentTarget: el, target: el, preventDefault(){}, stopPropagation(){}}, ev)); };
  el.click = () => el.feuern("click", {});
  el.focus = () => { if (ST_DOC) ST_DOC.activeElement = el; };
  el.setSelectionRange = () => {};
  el.querySelector = sel => stFinde(el, sel)[0] || null;
  el.querySelectorAll = sel => stFinde(el, sel);
  Object.defineProperty(el, "hidden", {configurable: true,
    get: () => el.attrs.hidden !== undefined, set: v => { if (v) el.attrs.hidden = ""; else delete el.attrs.hidden; }});
  Object.defineProperty(el, "textContent", {configurable: true,
    get: () => el.kinder.length ? el.kinder.map(stTextwert).join("") : el._text, set: v => { el._text = String(v); el.kinder = []; }});
  Object.defineProperty(el, "firstChild", {configurable: true, get: () => el.kinder[0] || null});
  return el;
}
let ST_DOC = null;
const stDocument = () => (ST_DOC = {activeElement: null, createElement: t => stKnoten(t),
  createTextNode: t => ({nodeType: 3, text: String(t)}), querySelector: () => null, querySelectorAll: () => [], body: stKnoten("body")});

/* Sichtbare Zeichen: eingeklappte (hidden) Bereiche zählen NICHT – sie stehen einen Klick entfernt. */
function stSichtbar(el){
  if (!el || typeof el !== "object") return 0;
  if (el.nodeType === 3) return String(el.text).length;
  if (el.attrs && el.attrs.hidden !== undefined) return 0;
  if (!(el.kinder || []).length) return String(el._text || "").length;    /* Text direkt am Element (z. B. Knopfbeschriftung) */
  let n = 0;
  for (const k of el.kinder || []) n += stSichtbar(k);
  return n;
}
const stZeichen = (wurzel, sel) => { const e = wurzel.querySelector(sel); return e ? stSichtbar(e) : 0; };
/* Die Blöcke, die OHNE Klick dastehen (Reihenfolge im DOM). */
function stOffeneBloecke(streifen){
  return (streifen.kinder || []).filter(k => k.nodeType === 1 && !(k.attrs && k.attrs.hidden !== undefined))
    .map(k => stKlassen(k)[0]);
}

function stPruefstand(){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const doc = stDocument();
  const bereich = {console, setTimeout: () => {}, clearTimeout: () => {}, Date, Math, JSON, Intl,
    document: doc, Spiel, Modell, DATEN, CLI, store};
  vm.createContext(bereich);
  const quellen = ["src/ui/dom.js", "src/ui/hilfe.js"].map(rel => fs.readFileSync(path.join(__dirname, "..", rel), "utf8"));
  const UI_OBJ = vm.runInContext(quellen.join("\n;\n") + "\n;UI", bereich, {filename: "ui-hilfe.js"});
  return {document: doc, UI: UI_OBJ};
}

gruppe("UI: Streifen entlasten", () => {
  /* Ein kleines Netz mit einem Router – dieselbe Form wie in tests/spiel-hilfe-vorschlaege.test.js. */
  const netz = () => {
    const n = Modell.neu();
    Modell.geraet(n, "router", {id: "r1", name: "R1"});
    Modell.setzen(n, "r1", "if.Gi0/0.ip", "192.168.10.1");
    Modell.setzen(n, "r1", "if.Gi0/0.maske", "255.255.255.0");
    Modell.setzen(n, "r1", "if.Gi0/0.shutdown", false);
    return n;
  };
  /* Ein echter Fehler aus der echten CLI – so kommt der Fehlertext (Baustein E) wie im Programm. */
  const echterFehler = n => {
    const s = CLI.sitzung(n, "r1");
    CLI.eingabe(s, "enable");
    const r = CLI.eingabe(s, "ip adress 10.0.0.1");
    return {s, r};
  };
  const kapsel = fn => {
    const altEinst = store.get("einst", {}), altIntern = Spiel._einst, altStufe = Spiel.stufe;
    try { fn(); }
    finally { store.set("einst", altEinst); Spiel._einst = altIntern; Spiel.stufe = altStufe; }
  };
  /* Stufen-Attrappe mit denselben Vertragszahlen (§ 2) und wählbarem Vorrat (§ 2.1). */
  const mitStufe = (id, konto, fn) => kapsel(() => {
    const zahlen = {"azubi": {rang: 1, vorschlaege: 1, leiter: "immer"}, "azubi-plus": {rang: 2, vorschlaege: 2, leiter: "immer"},
                    "geselle": {rang: 3, vorschlaege: 1, leiter: "nachfehler"}, "meister": {rang: 4, vorschlaege: 0, leiter: "nein"}}[id];
    const alt = Spiel.stufe;
    Spiel.stufe = {id: () => id, rang: () => zahlen.rang, kann: f => zahlen[f], def: () => ({id, kurz: id}),
      erklaerung: () => "ausfuehrlich", konto: () => konto, text: a => a};
    try { fn(); } finally { Spiel.stufe = alt; }
  });
  const zeichne = (p, n, o) => {
    const container = p.document.createElement("div");
    p.UI.hilfe.zeichnen(container, Object.assign({netz: n, geraetId: "r1", sitzung: {modus: "priv", historie: []}}, o));
    return container;
  };

  pruefe("Im Fehlerfall stehen genau zwei Blöcke offen: Fehlertext und der erste Vorschlag" + ST_ZUSATZ, () => {
    if (!ST_KANN_LADEN) return;
    mitStufe("azubi", {frei: 6, gesamt: 6}, () => {
      const p = stPruefstand(), n = netz(), {s, r} = echterFehler(n);
      const container = zeichne(p, n, {modus: s.modus, letzterFehler: r, text: "ip adress 10.0.0.1"});
      const streifen = container.querySelector(".hl-streifen");
      erwarte.wahr(!!streifen, "der Streifen wird gezeichnet");
      /* ZUERST die Zeichenzahl: so nennt jeder Fehlschlag dieser Datei die gemessenen Zahlen. */
      const sichtbar = stSichtbar(streifen);
      const teile = ["Kopf " + stZeichen(streifen, ".hl-kopf"), "Fehler " + stZeichen(streifen, ".hl-fehler"),
        "Gerüst " + stZeichen(streifen, ".hl-geruest"), "Leiter " + stZeichen(streifen, ".hl-leiter"),
        "Vorschlag " + stZeichen(streifen, ".hl-vorschlaege"), "Brücke " + stZeichen(streifen, ".hl-bruecke"),
        "Klappzeile " + stZeichen(streifen, ".hl-klappe")].join(" · ");
      erwarte.wahr(sichtbar <= 620, `sichtbare Zeichen im Fehlerfall (azubi): ${sichtbar} (${teile}); vorher waren es 1466`);
      erwarte.gleich(stOffeneBloecke(streifen), ["hl-kopf", "hl-fehler", "hl-vorschlaege", "hl-mehr"],
        "offen sind nur Kopf, Fehlertext, der erste Vorschlag und die Klappzeile");
      /* Die Klappzeile selbst zeigt nur den Knopf – der Rest liegt in .hl-klappinhalt (hidden). */
      erwarte.gleich(stOffeneBloecke(container.querySelector(".hl-mehr")), ["hl-klappe"], "in der Klappzeile steht nur der Knopf");
      erwarte.wahr(!container.querySelector(".hl-fehler").hidden, "der Fehlertext steht da");
      erwarte.gleich(container.querySelectorAll(".hl-vorschlag").length, 1, "genau ein Vorschlag ist offen");
      erwarte.wahr(!container.querySelector(".hl-vorschlaege").hidden, "die Vorschlagsliste ist offen");
      const klappe = container.querySelector(".hl-klappe");
      erwarte.wahr(!!klappe, "für den Rest gibt es eine Aufklapp-Zeile");
      erwarte.gleich(klappe.getAttribute("aria-expanded"), "false", "eingeklappt: aria-expanded=false");
      erwarte.wahr(container.querySelector(".hl-klappinhalt").hidden, "der Klappinhalt ist versteckt");
    });
  });

  pruefe("Ohne Fehler bleibt es wie heute: Gerüst, Werkzeugleiter und Vorschläge sind offen" + ST_ZUSATZ, () => {
    if (!ST_KANN_LADEN) return;
    mitStufe("azubi", {frei: 6, gesamt: 6}, () => {
      const p = stPruefstand(), n = netz();
      const container = zeichne(p, n, {modus: "priv", letzterFehler: null, verlauf: []});
      const streifen = container.querySelector(".hl-streifen");
      erwarte.wahr(!container.querySelector(".hl-geruest").hidden, "das Gerüst ist offen");
      erwarte.wahr(!container.querySelector(".hl-leiter").hidden, "die Werkzeugleiter ist offen");
      erwarte.gleich(container.querySelectorAll(".hl-sprosse").length, 6, "alle sechs Sprossen stehen da");
      erwarte.gleich(stOffeneBloecke(streifen), ["hl-kopf", "hl-geruest", "hl-leiter", "hl-vorschlaege"],
        "ohne Fehler bleibt die Reihenfolge von heute");
      erwarte.gleich(container.querySelectorAll(".hl-klappe").length, 0, "ohne Fehler gibt es nichts einzuklappen");
    });
  });

  pruefe("Ein Mausklick klappt die Werkzeugleiter auf und setzt aria-expanded" + ST_ZUSATZ, () => {
    if (!ST_KANN_LADEN) return;
    mitStufe("azubi", {frei: 6, gesamt: 6}, () => {
      const p = stPruefstand(), n = netz(), {s, r} = echterFehler(n);
      const sinnbild = p.document.createElement("button");
      p.document.activeElement = sinnbild;
      const container = zeichne(p, n, {modus: s.modus, letzterFehler: r, text: "ip adress 10.0.0.1"});
      erwarte.wahr(p.document.activeElement === sinnbild, "das Zeichnen klaut keinen Fokus");
      const klappe = container.querySelector(".hl-klappe"), inhalt = container.querySelector(".hl-klappinhalt");
      erwarte.enthaelt(klappe.textContent, "Werkzeugleiter", "die Zeile benennt, was aufgeklappt wird");
      klappe.click();
      erwarte.gleich(klappe.getAttribute("aria-expanded"), "true", "aufgeklappt: aria-expanded=true");
      erwarte.falsch(inhalt.hidden, "der Inhalt ist sichtbar");
      erwarte.wahr(!container.querySelector(".hl-leiter").hidden, "die Werkzeugleiter ist offen");
      erwarte.gleich(container.querySelectorAll(".hl-sprosse").length, 6, "alle sechs Sprossen");
      erwarte.wahr(!container.querySelector(".hl-bruecke").hidden, "auch die Syntax-Brücke kommt mit");
      const auf = stSichtbar(container.querySelector(".hl-streifen"));
      erwarte.wahr(auf > 900, "aufgeklappt steht wieder alles da (" + auf + " Zeichen)");
      klappe.click();
      erwarte.gleich(klappe.getAttribute("aria-expanded"), "false", "wieder eingeklappt");
      erwarte.wahr(inhalt.hidden, "der Inhalt ist wieder versteckt");
    });
  });

  pruefe("Bei leerem Vorrat nennt der Kopf die Vertragszeile „ab jetzt kostet es Sterne“" + ST_ZUSATZ, () => {
    if (!ST_KANN_LADEN) return;
    mitStufe("azubi", {frei: 6, gesamt: 6}, () => {
      const p = stPruefstand(), n = netz();
      const voll = zeichne(p, n, {modus: "priv", letzterFehler: null, verlauf: []});
      erwarte.enthaelt(voll.querySelector(".hl-konto").textContent, "noch 6 von 6 Hilfen", "voller Vorrat");
    });
    mitStufe("azubi", {frei: 0, gesamt: 6}, () => {
      const p = stPruefstand(), n = netz(), {s, r} = echterFehler(n);
      const leer = zeichne(p, n, {modus: s.modus, letzterFehler: r, text: "ip adress 10.0.0.1"});
      const konto = leer.querySelector(".hl-konto");
      erwarte.wahr(!!konto, "der Konto-Text steht im Kopf");
      erwarte.enthaelt(konto.textContent, "ab jetzt kostet es Sterne", "die Vertragszeile aus § 2.1");
      erwarte.falsch(/noch 0 von 6/.test(konto.textContent), "kein „noch 0 von 6“");
    });
  });

  pruefe("„Ausführen“ gibt es nur beim ersten Vorschlag (azubi-plus spart einen Knopf)" + ST_ZUSATZ, () => {
    if (!ST_KANN_LADEN) return;
    mitStufe("azubi-plus", {frei: 4, gesamt: 4}, () => {
      const p = stPruefstand(), n = netz(), {s, r} = echterFehler(n);
      const container = zeichne(p, n, {modus: s.modus, letzterFehler: r, text: "ip adress 10.0.0.1", ausfuehren: () => {}});
      const vorschlaege = container.querySelectorAll(".hl-vorschlag");
      erwarte.wahr(vorschlaege.length >= 2, "azubi-plus sieht zwei Vorschläge (offen + eingeklappt): " + vorschlaege.length);
      erwarte.gleich(container.querySelectorAll(".hl-lauf").length, 1, "genau ein Ausführen-Knopf");
      erwarte.wahr(!!vorschlaege[0].querySelector(".hl-lauf"), "und zwar am ERSTEN Vorschlag");
      erwarte.gleich(vorschlaege[1].querySelectorAll(".hl-lauf").length, 0, "der zweite hat nur „in die Eingabe“");
    });
  });

  pruefe("Die sichtbare Zeichenzahl im Fehlerfall bleibt unter der festgenagelten Grenze" + ST_ZUSATZ, () => {
    if (!ST_KANN_LADEN) return;
    for (const [id, konto, grenze] of [["azubi", {frei: 6, gesamt: 6}, 620], ["azubi-plus", {frei: 4, gesamt: 4}, 630]]) {
      mitStufe(id, konto, () => {
        const p = stPruefstand(), n = netz(), {s, r} = echterFehler(n);
        const container = zeichne(p, n, {modus: s.modus, letzterFehler: r, text: "ip adress 10.0.0.1"});
        const streifen = container.querySelector(".hl-streifen");
        const sichtbar = stSichtbar(streifen);
        const teile = ["Kopf " + stZeichen(streifen, ".hl-kopf"), "Fehler " + stZeichen(streifen, ".hl-fehler"),
          "Vorschlag " + stZeichen(streifen, ".hl-vorschlaege"), "Klappzeile " + stZeichen(streifen, ".hl-klappe")].join(" · ");
        erwarte.wahr(sichtbar <= grenze, `${id}: ${sichtbar} sichtbare Zeichen (${teile}), Grenze ${grenze}; vorher 1466/1404`);
        console.log(`Streifen im Fehlerfall · ${id}: ${sichtbar} sichtbare Zeichen (${teile})`);
      });
    }
  });

  pruefe("aktualisieren(K, {letzterFehler}) behält die Signatur und zeichnet in K.hilfeEl" + ST_ZUSATZ, () => {
    if (!ST_KANN_LADEN) return;
    mitStufe("azubi", {frei: 6, gesamt: 6}, () => {
      const p = stPruefstand(), n = netz(), {s, r} = echterFehler(n);
      const hilfeEl = p.document.createElement("div");
      const eingabe = {value: "", disabled: false, focus(){ p.document.activeElement = eingabe; }, setSelectionRange(){}};
      const K = {netz: n, id: "r1", hilfeEl, eingabeEl: eingabe, S: {sitzung: s, hist: [], letzterFehler: null, entwurf: ""}};
      erwarte.gleich(typeof p.UI.hilfe.zeichnen, "function", "zeichnen bleibt öffentlich");
      erwarte.gleich(typeof p.UI.hilfe.aktualisieren, "function", "aktualisieren bleibt öffentlich");
      p.UI.hilfe.aktualisieren(K, {letzterFehler: r, text: "ip adress 10.0.0.1"});
      erwarte.wahr(!!hilfeEl.querySelector(".hl-streifen"), "der Streifen steht in K.hilfeEl");
      erwarte.gleich(hilfeEl.querySelectorAll(".hl-vorschlag").length, 1, "Fehlerfall: ein Vorschlag");
      erwarte.wahr(!!hilfeEl.querySelector(".hl-klappe"), "Fehlerfall: eingeklappt");
      /* Klick auf den Vorschlag setzt den Befehl über den Weg der Konsole in die Eingabe. */
      const knopf = hilfeEl.querySelector(".hl-knopf");
      knopf.click();
      erwarte.gleich(eingabe.value, knopf.textContent, "der Klick setzt den Befehl in die Eingabe");
      erwarte.wahr(p.document.activeElement === eingabe, "und legt den Fokus in die Eingabe");
      /* Ohne Fehler: offene Leiter, kein Konto-Problem. */
      p.UI.hilfe.aktualisieren(K, {letzterFehler: null});
      erwarte.gleich(hilfeEl.querySelectorAll(".hl-klappe").length, 0, "ohne Fehler nichts einzuklappen");
      erwarte.wahr(!hilfeEl.querySelector(".hl-leiter").hidden, "die Leiter ist offen");
    });
  });
});
