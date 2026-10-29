"use strict";
/* WERKSTATT-GERÜST (Architektur § 16.5; UX-Audit U04/U05/U12/U14)
   Prüft in einem eigenen Bereich mit DOM-Ersatz (Bauart von tests/ui-editor-flaeche.test.js) das
   echte Zusammenspiel von Spiel.werkstatt (reine Logik), UI.werkstatt (Leiste, Palette-Suche,
   Minimap) und dem Editor (Mehrfachauswahl, Duplizieren, Sammellöschung, Gruppenverschieben).
   Selbst lauffähig:  node tests/ui-werkstatt.test.js  ·  im Lauf:  sh tools/test.sh werkstatt

   Die Fälle stehen in WK_FAELLE – die Zahl im Bericht kommt aus dieser Liste, nicht aus dem Text. */
(function(){
function wkHatRequire(){ try { return typeof require === "function"; } catch (e) { return false; } }

/* ---------------- Allein lauffähig ---------------- */
function wkAlleinLaden(){
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
  try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "ui-werkstatt.test.js"}); }
  catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
  const rot = ergebnisse.filter(e => !e.ok);
  for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
  console.log("\n" + (ergebnisse.length - rot.length) + "/" + ergebnisse.length + " grün");
  process.exit(rot.length ? 1 : 0);
}
if (typeof Spiel === "undefined" && typeof document === "undefined" && wkHatRequire()) { wkAlleinLaden(); return; }

const WK_KANN_LADEN = (() => {
  try { return wkHatRequire() && typeof document === "undefined" && typeof Spiel === "object" && Spiel !== null; }
  catch (e) { return false; }
})();
const WK_ZUSATZ = WK_KANN_LADEN ? "" : " (kein require im Testbereich – nur unter node tests/run.js)";

/* ================= DOM-Ersatz (nur im Prüfstand) ================= */
function wkKlassen(el){ return String(el.attrs.class || "").split(/\s+/).filter(Boolean); }
function wkText(k){ return k == null ? "" : typeof k === "string" ? k : String(k.textContent == null ? "" : k.textContent); }
function wkPasst(el, sel){
  let s = String(sel).trim(); if (!s || !el || !el.tag) return false;
  const attrs = s.match(/\[[^\]]+\]/g) || [];
  const klassen = s.match(/\.[\w-]+/g) || [];
  const tag = s.replace(/\[[^\]]+\]|\.[\w-]+/g, "");
  if (tag && !/^[a-z][a-z0-9]*$/i.test(tag)) return false;
  if (tag && el.tag !== tag) return false;
  for (const k of klassen) if (!wkKlassen(el).includes(k.slice(1))) return false;
  for (const a of attrs) {
    const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(a); if (!m) return false;
    const wert = m[1] === "hidden" ? (el.hidden ? "" : undefined) : el.attrs[m[1]];
    if (m[2] === undefined) { if (wert === undefined) return false; }
    else if (String(wert) !== m[2]) return false;
  }
  return !!(tag || klassen.length || attrs.length);
}
function wkFinde(el, sel){
  const treffer = [];
  const lauf = k => { for (const x of (k.kinder || [])) if (x && x.tag) { if (wkPasst(x, sel)) treffer.push(x); lauf(x); } };
  lauf(el);
  return treffer;
}
function wkKnoten(tag){
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
    closest(sel){ let p = el; while (p) { if (p.tag && wkPasst(p, sel)) return p; p = p.parentNode; } return null; },
    setAttribute(k, v){ el.attrs[k] = String(v); if (k.startsWith("data-")) el.dataset[k.slice(5).replace(/-(\w)/g, (x, c) => c.toUpperCase())] = String(v); if (k === "hidden") el.hidden = true; },
    getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
    hasAttribute(k){ return el.attrs[k] !== undefined; },
    removeAttribute(k){ delete el.attrs[k]; if (k === "hidden") el.hidden = false; },
    addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
    removeEventListener(art, fn){ if (el.listeners[art]) el.listeners[art] = el.listeners[art].filter(x => x !== fn); },
    focus(){ if (WK_DOK) WK_DOK.activeElement = el; }, blur(){ if (WK_DOK && WK_DOK.activeElement === el) WK_DOK.activeElement = null; },
    select(){}, setSelectionRange(){}, scrollIntoView(){},
    setPointerCapture(){}, releasePointerCapture(){},
    getClientRects(){ return [{width: 900, height: 600, left: 0, top: 0, right: 900, bottom: 600}]; },
    getBoundingClientRect(){ return {width: 900, height: 600, left: 0, top: 0, right: 900, bottom: 600}; },
    querySelector(sel){ return wkFinde(el, sel)[0] || null; },
    querySelectorAll(sel){ return wkFinde(el, sel); },
    get className(){ return el.attrs.class || ""; },
    set className(v){ el.attrs.class = String(v); },
    get classList(){
      return {
        add(...k){ const l = wkKlassen(el); for (const x of k) if (!l.includes(x)) l.push(x); el.attrs.class = l.join(" "); },
        remove(...k){ el.attrs.class = wkKlassen(el).filter(x => !k.includes(x)).join(" "); },
        contains: x => wkKlassen(el).includes(x),
        toggle(x, an){ const drin = wkKlassen(el).includes(x), soll = an === undefined ? !drin : !!an; if (soll) el.classList.add(x); else el.classList.remove(x); return soll; },
      };
    },
    set textContent(v){ el._text = String(v); el.kinder = []; },
    get textContent(){ return el.kinder.length ? el.kinder.map(wkText).join("") : el._text; },
    get children(){ return el.kinder.filter(k => k && k.tag); },
    get childNodes(){ return el.kinder; },
    get firstChild(){ return el.kinder[0] || null; },
    get isConnected(){ let p = el; while (p.parentNode) p = p.parentNode; return !!p.__imBaum; },
  };
  return el;
}
let WK_DOK = null;
function wkDokument(){
  const body = wkKnoten("body"); body.__imBaum = true;
  WK_DOK = {
    body, documentElement: wkKnoten("html"), activeElement: null, listeners: {},
    createElement: t => wkKnoten(t), createElementNS: (ns, t) => wkKnoten(t),
    createTextNode: t => ({nodeType: 3, textContent: String(t)}),
    getElementById: id => { const alle = wkFinde(body, "[id]"); return alle.find(x => x.attrs.id === id) || null; },
    querySelector: sel => wkFinde(body, sel)[0] || null,
    querySelectorAll: sel => wkFinde(body, sel),
    addEventListener(art, fn){ (WK_DOK.listeners[art] ||= []).push(fn); },
    removeEventListener(art, fn){ if (WK_DOK.listeners[art]) WK_DOK.listeners[art] = WK_DOK.listeners[art].filter(x => x !== fn); },
  };
  return WK_DOK;
}

/* ================= Prüfstand: echter Editor + echte Werkstatt ================= */
function wkStand(){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const dok = wkDokument();
  const haken = {}, fehler = [];
  const Bus = {
    an(art, fn){ (haken[art] ||= []).push(fn); return () => { haken[art] = (haken[art] || []).filter(f => f !== fn); }; },
    aus(art, fn){ haken[art] = (haken[art] || []).filter(f => f !== fn); },
    senden(art, d){ for (const fn of (haken[art] || []).slice()) { try { fn(d); } catch (e) { fehler.push(String((e && e.message) || e)); } } },
  };
  const daten = {};
  const store = {
    get(k, d){ return daten[k] === undefined ? d : JSON.parse(JSON.stringify(daten[k])); },
    set(k, v){ daten[k] = JSON.parse(JSON.stringify(v)); },
    stand: () => ({art: "gesichert"}), sofort(){ return Promise.resolve(); }, schreiberSetzen(){}, markieren(){},
  };
  const sandbox = {netz: null};
  const bereich = {
    console: {log(){}, error(){}, warn(){}, info(){}}, document: dok, innerWidth: 1280, innerHeight: 800, matchMedia: undefined,
    requestAnimationFrame: fn => { try { fn(0); } catch (e) { fehler.push(String((e && e.message) || e)); } return 0; },
    setTimeout: () => 0, clearTimeout(){}, setInterval: () => 0, clearInterval(){},
    performance: {now: () => 0}, Math, JSON, Intl, Date,
    Modell, DATEN, Bus, store, Spiel, UI: undefined,
    L, IP, eur, zahlDe, heute, datumDe, jetzt, klemme, tief,
    getComputedStyle: () => ({overflowX: "visible", overflowY: "visible", visibility: "visible", display: "block"}),
  };
  vm.createContext(bereich);
  const lies = rel => fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
  vm.runInContext(lies("src/ui/dom.js"), bereich, {filename: "src/ui/dom.js"});
  const UI = vm.runInContext("UI", bereich);
  if (!UI || typeof UI !== "object") throw new Error("src/ui/dom.js hat kein UI angelegt");
  UI.toast = function(){ UI.toast.liste.push([].slice.call(arguments)); };
  UI.toast.liste = []; UI.toast.zu = () => {};
  UI.menue = () => wkKnoten("div"); UI.menue.zu = () => {}; UI.menue.offen = () => false; UI.menue.popover = () => wkKnoten("div");
  UI.bewegung = () => "aus"; UI.klang = {spielen(){}}; UI.juice = () => {};
  UI.inspektor = null; UI.simpanel = null; UI.konsole = null; UI.terminal = null;
  UI.laborFach = null; UI.laborPakete = null;
  UI.sandbox = sandbox;
  for (const rel of ["src/ui/geraetebilder.js", "src/ui/ebenen.js", "src/ui/editor.js", "src/ui/editor-werkzeuge.js", "src/ui/werkstatt.js"]) {
    vm.runInContext(lies(rel), bereich, {filename: rel});
  }
  if (!UI.labor || typeof UI.labor.zeigen !== "function") throw new Error("src/ui/editor.js hat sich nicht als UI.labor angemeldet");
  if (!UI.werkstatt || typeof UI.werkstatt.einrichten !== "function") throw new Error("src/ui/werkstatt.js hat sich nicht als UI.werkstatt angemeldet");
  const container = wkKnoten("div"); dok.body.append(container);
  const rufen = code => vm.runInContext(code, bereich, {filename: "werkstatt-pruefstand"});
  return {
    UI, dok, container, bereich, fehler, rufen, sandbox, bus: Bus,
    zeigen(){ UI.labor.zeigen(container); },
    laden(netz, opt){ UI.labor.laden(netz, opt || {}); },
    gezeichnet(){ return rufen("UI.labor._.s.geraete.querySelectorAll('g[data-id]').map(g => g.getAttribute('data-id'))"); },
    leiste(){ return dok.querySelector(".wk-leiste"); },
    ausloesen(el, art, ev){ for (const fn of (el.listeners[art] || []).slice()) fn(ev); },
  };
}
function wkEreignis(art, ziel, opt){
  return Object.assign({type: art, target: ziel, button: 0, pointerId: 1, clientX: 0, clientY: 0,
    shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, preventDefault(){}, stopPropagation(){}}, opt || {});
}

/* Die Fälle stehen hier – die Zahl im Bericht kommt aus dieser Liste. */
const WK_FAELLE = [
  "1 · Module laden und melden sich an",
  "2 · Palette-Suche filtert unscharf",
  "3 · freierName vergibt -2/-3",
  "4 · dupliziere: Kopien ohne Kabel, Vorlage unverändert, deterministisch",
  "5 · netzGueltig und kennwerte",
  "6 · Vorlagen sind gültige Netze",
  "7 · Duplizieren ist EIN Verlaufsschritt",
  "8 · keine Kabelkollision und frische MACs",
  "9 · Auswahl-Menge: Umschalten, Rahmen, Gruppe in einem Schritt",
  "10 · Werkstatt-Leiste nur im Sandbox-Kontext (echter Weg aus start.js)",
  "11 · Minimap-Datenquelle und Minimap im DOM",
  "12 · fünf Geräte in unter drei Minuten baubar",
];

gruppe("UI: Werkstatt-Gerüst" + WK_ZUSATZ, () => {
  if (!WK_KANN_LADEN) {
    pruefe("Werkstatt: nur unter node tests/run.js prüfbar", () => { erwarte.wahr(false, "require fehlt"); });
    return;
  }

  pruefe(WK_FAELLE[0], () => {
    erwarte.gleich(typeof Spiel.werkstatt, "object", "Spiel.werkstatt ist geladen");
    for (const f of ["vorlagen", "netzGueltig", "freierName", "dupliziere", "kennwerte"]) erwarte.gleich(typeof Spiel.werkstatt[f], "function", "Spiel.werkstatt." + f);
    const w = wkStand();
    for (const f of ["suchen", "leiste", "einrichten", "sandboxModus", "vorlageLaden", "minimapDaten"]) erwarte.gleich(typeof w.UI.werkstatt[f], "function", "UI.werkstatt." + f);
    erwarte.gleich(w.UI.werkstatt.ZOOMSTUFEN, [50, 75, 100, 150, 200], "Zoomstufen 50/75/100/150/200");
    erwarte.gleich(w.fehler, [], "keine Fehler beim Laden");
  });

  pruefe(WK_FAELLE[1], () => {
    const w = wkStand();
    const treffer = w.UI.werkstatt.suchen("druck");
    erwarte.gleich(treffer[0] && treffer[0].titel, "Drucker", "Drucker ist der erste Treffer zu druck");
    erwarte.wahr(treffer.every(a => a.titel !== "Switch"), "Switch fällt bei druck heraus");
    const unscharf = w.UI.werkstatt.suchen("drck");
    erwarte.wahr(unscharf.some(a => a.titel === "Drucker"), "unscharf: drck findet Drucker");
    erwarte.gleich(w.UI.werkstatt.suchen("gibtesnicht"), [], "kein Treffer bei Unsinn");
    erwarte.gleich(w.UI.werkstatt.suchen("").length, w.UI.GERAETE.length, "leere Suche zeigt das ganze Fach");
    /* Das Suchfeld in der Leiste filtert beim Tippen wirklich die Trefferliste. */
    const leiste = w.UI.werkstatt.leiste();
    const feld = leiste.querySelector(".wk-suche-feld");
    erwarte.wahr(!!feld, "Suchfeld hängt in der Leiste");
    feld.value = "switch";
    w.ausloesen(feld, "input", {});
    const liste = leiste.querySelector(".wk-treffer");
    erwarte.gleich(liste.hidden, false, "Trefferliste ist bei Eingabe offen");
    const punkte = liste.querySelectorAll(".wk-punkt");
    erwarte.wahr(punkte.length >= 1, "mindestens ein Treffer in der Liste");
    erwarte.enthaelt(punkte[0].textContent, "Switch", "erster Punkt ist der Switch");
    feld.value = "";
    w.ausloesen(feld, "input", {});
    erwarte.gleich(leiste.querySelector(".wk-treffer").hidden, true, "leeres Feld schließt die Trefferliste");
  });

  pruefe(WK_FAELLE[2], () => {
    const n = Modell.neu();
    Modell.geraet(n, "pc", {id: "pc1", name: "PC1"});
    Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
    erwarte.gleich(Spiel.werkstatt.freierName(n, "PC1"), "PC1-2", "erste Kopie bekommt -2");
    Modell.geraet(n, "pc", {id: "pc2", name: "PC1-2"});
    erwarte.gleich(Spiel.werkstatt.freierName(n, "PC1"), "PC1-3", "nächste Kopie bekommt -3");
    erwarte.gleich(Spiel.werkstatt.freierName(n, "PC1-2"), "PC1-3", "Duplikat eines Duplikats zählt fort statt -2-2");
    erwarte.gleich(Spiel.werkstatt.freierName(n, "Server"), "Server", "freier Name bleibt unverändert");
  });

  pruefe(WK_FAELLE[3], () => {
    const vorlage = DATEN.beispiele.salon();
    const vorher = JSON.stringify(vorlage);
    const kabelVorher = vorlage.kabel.length;
    const delta = Spiel.werkstatt.dupliziere(vorlage, ["kasse", "buero"]);
    erwarte.gleich(delta.geraete.length, 2, "zwei Kopien");
    erwarte.gleich(delta.geraete.map(g => g.name), ["PC-Kasse-2", "PC-Buero-2"], "Namen mit Suffix -2");
    erwarte.gleich(delta.ids.length, 2, "zwei neue IDs");
    erwarte.gleich(delta.netz.kabel.length, kabelVorher, "Kabel werden nicht mitdupliziert");
    for (const id of delta.ids) {
      erwarte.wahr(!delta.netz.kabel.some(k => k.a.geraet === id || k.b.geraet === id), "Kopie " + id + " hängt an keinem Kabel");
      erwarte.wahr(!!delta.netz.geraete[id], "Kopie steht im neuen Netz");
    }
    erwarte.gleich(JSON.stringify(vorlage), vorher, "die Vorlage bleibt unverändert (reine Funktion)");
    const zweimal = JSON.stringify(Spiel.werkstatt.dupliziere(vorlage, ["kasse", "buero"]));
    erwarte.gleich(zweimal, JSON.stringify(delta), "zwei Aufrufe liefern dasselbe Ergebnis (deterministisch)");
    /* Konfiguration wird mitgenommen: die Kopie der Kasse hat dieselbe IP wie das Original. */
    const kopieKasse = delta.netz.geraete[delta.ids[0]];
    erwarte.gleich(kopieKasse.running.if.eth0.ip, vorlage.geraete.kasse.running.if.eth0.ip, "Konfiguration der Kopie stimmt");
    erwarte.gleich(kopieKasse.running.hostname, "PC-Kasse-2", "Hostname folgt dem neuen Namen");
    /* Internet lässt sich nicht duplizieren (das Modell kennt genau eines). */
    erwarte.gleich(Spiel.werkstatt.dupliziere(vorlage, ["inet"]).geraete.length, 0, "Internet wird nicht dupliziert");
  });

  pruefe(WK_FAELLE[4], () => {
    erwarte.wahr(Spiel.werkstatt.netzGueltig(DATEN.beispiele.salon()), "Salon ist gültig");
    erwarte.wahr(Spiel.werkstatt.netzGueltig(Modell.neu()), "leeres Netz ist gültig");
    erwarte.falsch(Spiel.werkstatt.netzGueltig(null), "null ist ungültig");
    erwarte.falsch(Spiel.werkstatt.netzGueltig({}), "{} ist ungültig");
    erwarte.falsch(Spiel.werkstatt.netzGueltig({geraete: {}, kabel: {}}), "Kabel als Objekt ist ungültig");
    const kaputt = DATEN.beispiele.salon();
    kaputt.kabel.push({id: "kx", a: {geraet: "gibtsnicht", port: "eth0"}, b: {geraet: "kasse", port: "eth0"}});
    erwarte.falsch(Spiel.werkstatt.netzGueltig(kaputt), "Kabel auf unbekanntes Gerät ist ungültig");
    const mitZusatz = DATEN.beispiele.salon();
    mitZusatz.name = "Mein Netz"; mitZusatz.vorlage = "salon"; mitZusatz.unbekannt = {a: 1};
    erwarte.wahr(Spiel.werkstatt.netzGueltig(mitZusatz), "unbekannte Felder stören nicht (alte Stände bleiben lesbar)");
    erwarte.gleich(Spiel.werkstatt.kennwerte(DATEN.beispiele.salon()), {geraete: 6, kabel: 5, vlans: 0}, "Salon: 6 Geräte, 5 Kabel, 0 VLANs");
    erwarte.gleich(Spiel.werkstatt.kennwerte(DATEN.beispiele.praxis()), {geraete: 6, kabel: 5, vlans: 3}, "Praxis: 6 Geräte, 5 Kabel, 3 VLANs");
    erwarte.gleich(Spiel.werkstatt.kennwerte(Modell.neu()), {geraete: 0, kabel: 0, vlans: 0}, "leeres Netz: lauter Nullen");
  });

  pruefe(WK_FAELLE[5], () => {
    const vorlagen = Spiel.werkstatt.vorlagen();
    erwarte.gleich(vorlagen.length, 4, "vier Vorlagen");
    erwarte.gleich(vorlagen.map(v => v.id), ["leer", "salon", "buero", "praxis"], "feste Reihenfolge");
    for (const v of vorlagen) {
      const netz = v.bauen();
      erwarte.wahr(Spiel.werkstatt.netzGueltig(netz), "Vorlage " + v.id + " ist ein gültiges Netz");
      erwarte.gleich(JSON.stringify(v.bauen()), JSON.stringify(netz), "Vorlage " + v.id + " baut deterministisch");
    }
    erwarte.gleich(Spiel.werkstatt.kennwerte(vorlagen[1].bauen()).geraete, 6, "Salon-Vorlage hat sechs Geräte (fünf Endgeräte/Infrastruktur + Internet)");
  });

  pruefe(WK_FAELLE[6], () => {
    const w = wkStand(); w.zeigen();
    const netz = DATEN.beispiele.salon();
    w.sandbox.netz = netz;
    w.laden(netz, {sandbox: true});
    const v = w.UI.labor.verlauf;
    w.UI.labor.auswahlMehrSetzen(["kasse", "buero"]);
    const schritteVorher = v.liste.length, geraeteVorher = Object.keys(w.UI.labor.netz.geraete).length;
    const ids = w.UI.labor.duplizieren();
    erwarte.gleich(ids.length, 2, "zwei Duplikate");
    erwarte.gleich(v.liste.length, schritteVorher + 1, "Duplizieren ist genau EIN Verlaufsschritt");
    erwarte.gleich(Object.keys(w.UI.labor.netz.geraete).length, geraeteVorher + 2, "zwei Geräte mehr im laufenden Netz");
    erwarte.gleich(w.UI.labor.netz.kabel.length, 5, "Kabelzahl unverändert");
    w.UI.labor.neuZeichnen();                       /* der Prüfstand teilt den Bus der Modelle nicht – hier ausdrücklich zeichnen */
    erwarte.gleich(w.gezeichnet().length, geraeteVorher + 2, "die Fläche zeigt die Kopien");
    v.zurueck();
    erwarte.gleich(Object.keys(w.UI.labor.netz.geraete).length, geraeteVorher, "ein Rückgängig nimmt beide Kopien zurück");
    erwarte.gleich(w.fehler, [], "keine Fehler im Bereich");
  });

  pruefe(WK_FAELLE[7], () => {
    const w = wkStand(); w.zeigen();
    const netz = DATEN.beispiele.salon();
    w.sandbox.netz = netz;
    w.laden(netz, {sandbox: true});
    w.UI.labor.auswahlMehrSetzen(["kasse", "drucker"]);
    const vorher = JSON.stringify(w.UI.labor.netz);
    w.UI.labor.duplizieren();
    const nachher = w.UI.labor.netz;
    const ids = Object.keys(nachher.geraete);
    erwarte.gleich(ids.length, 8, "acht Geräte nach zwei Kopien");
    for (const k of nachher.kabel) {
      erwarte.wahr(!!nachher.geraete[k.a.geraet] && !!nachher.geraete[k.b.geraet], "Kabel " + k.id + " zeigt auf vorhandene Geräte");
    }
    const kopieIds = ids.filter(id => !JSON.parse(vorher).geraete[id]);
    erwarte.gleich(kopieIds.length, 2, "genau zwei neue Geräte-IDs");
    for (const id of kopieIds) erwarte.wahr(!nachher.kabel.some(k => k.a.geraet === id || k.b.geraet === id), "Kopie " + id + " hat kein Kabel");
    /* MACs bleiben netzweit eindeutig – auch die frisch vergebenen der Kopien. */
    const macs = [];
    for (const g of Object.values(nachher.geraete)) for (const m of Object.values(g.hw.macs)) macs.push(m);
    erwarte.gleich(new Set(macs).size, macs.length, "alle MAC-Adressen sind eindeutig");
    const origKasse = JSON.parse(vorher).geraete.kasse, kopieKasse = nachher.geraete[kopieIds[0]];
    erwarte.wahr(JSON.stringify(origKasse.hw.macs) !== JSON.stringify(kopieKasse.hw.macs), "die Kopie hat eigene MAC-Adressen");
  });

  pruefe(WK_FAELLE[8], () => {
    const w = wkStand(); w.zeigen();
    const netz = DATEN.beispiele.salon();
    w.sandbox.netz = netz;
    w.laden(netz, {sandbox: true});
    const labor = w.UI.labor, v = labor.verlauf;
    /* Umschalten wie Shift-/Strg-Klick (die Geste ruft genau diese Funktion). */
    const F = w.rufen("UI.labor._f");
    F.auswahlUmschalten("kasse");
    F.auswahlUmschalten("buero");
    F.auswahlUmschalten("sw1");
    erwarte.gleich(labor.auswahlMehr().slice().sort(), ["buero", "kasse", "sw1"], "drei Geräte in der Menge");
    /* Marquee: das Rechteck aus dem gezogenen Rahmen wählt die Geräte darin. */
    F.auswahlImRechteck({x1: 100, y1: 200, x2: 500, y2: 500}, false);
    erwarte.gleich(labor.auswahlMehr().slice().sort(), ["buero", "kasse", "sw1"], "Rahmen wählt Kasse, Büro und Switch");
    F.auswahlImRechteck({x1: 500, y1: 100, x2: 900, y2: 300}, true);
    erwarte.gleich(labor.auswahlMehr().slice().sort(), ["buero", "inet", "kasse", "r1", "sw1"], "additiver Rahmen ergänzt Router und Internet");
    /* Gruppe verschieben: EIN Schritt für alle. */
    F.auswahlImRechteck({x1: 100, y1: 200, x2: 500, y2: 500}, false);
    const schritte = v.liste.length;
    const vorher = {kasse: {x: labor.netz.geraete.kasse.x, y: labor.netz.geraete.kasse.y}, buero: {x: labor.netz.geraete.buero.x, y: labor.netz.geraete.buero.y}};
    F.verschiebenMehr([...labor.auswahlMehr()], 20, 0);
    erwarte.gleich(v.liste.length, schritte + 1, "Gruppenverschieben ist EIN Verlaufsschritt");
    erwarte.gleich(labor.netz.geraete.kasse.x, vorher.kasse.x + 20, "Kasse mitgewandert");
    erwarte.gleich(labor.netz.geraete.buero.x, vorher.buero.x + 20, "Büro mitgewandert");
    /* Strg+D über die Tastatur: ein Schritt. */
    const geraete = Object.keys(labor.netz.geraete).length, schritte2 = v.liste.length;
    erwarte.wahr(labor.taste({key: "d", ctrlKey: true, shiftKey: false, altKey: false, metaKey: false, preventDefault(){}}), "Strg+D wird angenommen");
    erwarte.gleich(Object.keys(labor.netz.geraete).length, geraete + labor.auswahlMehr().length, "Strg+D dupliziert die Auswahl");
    erwarte.gleich(v.liste.length, schritte2 + 1, "Strg+D ist EIN Verlaufsschritt");
    /* Entf als Sammellöschung: ein Schritt, Rückgängig holt alles zurück. */
    const schritte3 = v.liste.length, geloescht = labor.loeschenMehr();
    erwarte.gleich(geloescht, 3, "Sammellöschung löscht alle drei gewählten Geräte");
    const nachLoeschen = Object.keys(labor.netz.geraete).length;
    erwarte.gleich(v.liste.length, schritte3 + 1, "Sammellöschung ist EIN Verlaufsschritt");
    v.zurueck();
    erwarte.gleich(Object.keys(labor.netz.geraete).length > nachLoeschen, true, "Rückgängig holt die gelöschten Geräte zurück");
    erwarte.gleich(w.fehler, [], "keine Fehler im Bereich");
  });

  pruefe(WK_FAELLE[9], () => {
    const fs = require("fs"), path = require("path");
    /* Der echte Weg: start.js lädt die Sandbox mit sandbox:true – der Beleg steht im Quelltext,
       und der Test fährt genau diesen Aufruf (UI.sandbox setzt vorher sein Netz). */
    const startJs = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "start.js"), "utf8");
    erwarte.enthaelt(startJs, "sandbox: true", "start.js gibt UI.labor.laden sandbox:true mit");
    const w = wkStand(); w.zeigen();
    const salon = DATEN.beispiele.salon();
    w.sandbox.netz = salon;
    const lauf = Modell.verlauf(salon);
    w.laden(salon, {titel: "Freies Labor", verlauf: lauf, auftrag: () => {}, sandbox: true});
    const leiste = w.leiste();
    erwarte.wahr(!!leiste, "die Werkstatt-Leiste hängt im DOM");
    erwarte.gleich(leiste.hidden, false, "im Sandbox-Kontext ist sie sichtbar");
    erwarte.wahr(!!w.dok.querySelector(".wk-suche-feld"), "Palette-Suchfeld ist da");
    erwarte.wahr(!!w.dok.querySelector(".wk-kennwerte") && w.dok.querySelector(".wk-kennwerte").textContent.indexOf("6 Geräte") >= 0, "Kennwerte zeigen 6 Geräte");
    /* Vorlage laden: EIN Schritt, das laufende Netz wird ersetzt. */
    const leer = Modell.neu();
    w.laden(leer, {titel: "Freies Labor", sandbox: true});
    w.sandbox.netz = leer;
    const schritte = w.UI.labor.verlauf.liste.length;
    const geladen = w.UI.werkstatt.vorlageLaden(w.UI.werkstatt.vorlagen()[1]);
    erwarte.wahr(!!geladen, "Salon-Vorlage wurde geladen");
    erwarte.gleich(Object.keys(w.UI.labor.netz.geraete).length, 6, "sechs Geräte im laufenden Netz");
    erwarte.gleich(w.UI.labor.verlauf.liste.length, schritte + 1, "Vorlage laden ist EIN Verlaufsschritt");
    /* Der Ereignisweg selbst (ohne app.js/start.js): „ansicht" hängt die Leiste wieder ein,
       solange das geladene Netz das Sandbox-Netz ist – so ist sie auch nach einem Neuaufbau da. */
    w.UI.werkstatt.sandboxModus(false);
    erwarte.gleich(w.leiste().hidden, true, "Vorbedingung: Leiste ist ausgeblendet");
    w.bus.senden("ansicht", "labor");
    erwarte.gleich(w.leiste().hidden, false, "Ansichts-Ereignis hängt die Leiste aus dem echten Weg wieder ein");
    /* Außerhalb der Sandbox (Karriere-Auftrag): Leiste verschwindet. */
    const ticketNetz = DATEN.beispiele.praxis();
    w.laden(ticketNetz, {titel: "Auftrag"});
    erwarte.gleich(w.leiste().hidden, true, "außerhalb des Sandbox-Kontexts ist die Leiste ausgeblendet");
    erwarte.gleich(w.fehler, [], "keine Fehler im Bereich");
  });

  pruefe(WK_FAELLE[10], () => {
    const w = wkStand(); w.zeigen();
    const salon = DATEN.beispiele.salon();
    w.sandbox.netz = salon;
    w.laden(salon, {sandbox: true});
    const d = w.UI.werkstatt.minimapDaten(salon, ["kasse"]);
    erwarte.gleich(d.geraete.length, 6, "Datenquelle kennt alle sechs Geräte");
    erwarte.gleich(d.kabel.length, 5, "Datenquelle kennt alle fünf Kabel");
    erwarte.gleich(d.auswahl, ["kasse"], "Auswahl steht in der Datenquelle");
    erwarte.gleich(d.geraete.filter(g => g.gewaehlt).map(g => g.id), ["kasse"], "genau die Kasse ist als gewählt markiert");
    erwarte.wahr(!!d.rahmen && d.rahmen.x1 < 180 && d.rahmen.x2 > 760, "der Rahmen umfasst alle Geräte");
    erwarte.gleich(w.UI.werkstatt.minimapDaten(Modell.neu()).rahmen, null, "leeres Netz hat keinen Rahmen");
    const mini = w.dok.querySelector(".wk-mini");
    erwarte.wahr(!!mini, "Minimap hängt in der Ansicht");
    erwarte.gleich(w.dok.querySelectorAll(".wk-mini-punkt").length, 6, "sechs Punkte in der Minimap");
    erwarte.gleich(w.dok.querySelectorAll(".wk-mini-kabel-linie").length, 5, "fünf Kabellinien in der Minimap");
    /* Klick zentriert: der Punkt (rahmen-Mitte) landet in der Mitte der Fläche. */
    const svg = w.dok.querySelector(".wk-mini-svg");
    const vorher = w.rufen("JSON.stringify(UI.labor._.view)");
    w.ausloesen(svg, "pointerdown", wkEreignis("pointerdown", svg, {clientX: 100, clientY: 80}));
    const nachher = w.rufen("JSON.stringify(UI.labor._.view)");
    erwarte.wahr(vorher !== nachher, "Klick auf die Minimap zentriert die Fläche neu");
    erwarte.wahr(w.UI.labor.zoomProzent() > 25 && w.UI.labor.zoomProzent() <= 300, "Zoom-Prozent ist abfragbar");
    w.UI.labor.zoomAufProzent(150);
    erwarte.gleich(w.UI.labor.zoomProzent(), 150, "Zoomstufe 150 % gesetzt");
    erwarte.gleich(w.fehler, [], "keine Fehler im Bereich");
  });

  pruefe(WK_FAELLE[11], () => {
    const w = wkStand(); w.zeigen();
    const leer = Modell.neu();
    w.sandbox.netz = leer;
    w.laden(leer, {titel: "Freies Labor", sandbox: true});
    const t0 = Date.now();
    for (let i = 0; i < 5; i++) w.UI.labor.einsetzen("pc");
    const ms = Date.now() - t0;
    erwarte.gleich(Object.keys(w.UI.labor.netz.geraete).length, 5, "fünf Geräte über die Oberflächen-API gesetzt");
    erwarte.wahr(ms < 180000, "5-Geräte-Netz in " + ms + " ms gebaut (< 180000 ms)");
    w.UI.labor.neuZeichnen();
    erwarte.gleich(w.gezeichnet().length, 5, "alle fünf stehen auf der Fläche");
    console.log("MESSUNG Werkstatt: 5 Geräte über UI.labor.einsetzen in " + ms + " ms");
  });
});
})();
