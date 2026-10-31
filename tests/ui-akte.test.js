"use strict";
/* UIL-07 (berichte/frontend-lernen.md): Die Einsatzakte (src/ui/akte.js, 274 Zeilen) hatte als einzige
   Lernfläche 0 UI-Tests — der Renderpfad (Leerzustand, Karten, Hypothese, Filter, Bericht-Kopie) war
   ohne Wirkungsnachweis. Dieser Test lädt die echte UI-Datei in einem vm-Bereich (Bauart
   tests/ui-klassenraum.test.js) mit echtem Spiel/Store und nachgebildetem Labor-DOM; jede Aktion
   bekommt mindestens eine Zusicherung. Kein Produktionscode geändert (Test-Paket). */
const AK_LADEN = (() => {
  try { return typeof require === "function" && typeof Spiel === "object" && Spiel !== null && typeof document === "undefined"; }
  catch (e) { return false; }
})();

/* ================= DOM-Ersatz (nur was akte.js braucht) ================= */
function akKnoten(tag){
  const el = {
    nodeType: 1, tag, kinder: [], listeners: {}, attrs: {}, className: "", _text: "", parentNode: null, hidden: false, disabled: false,
    append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.parentNode = el; el.kinder.push(x); } },
    replaceChildren(...k){ el.kinder = []; el.append(...k); },
    remove(){ if (el.parentNode) el.parentNode.kinder = el.parentNode.kinder.filter(x => x !== el); },
    setAttribute(k, v){ el.attrs[k] = String(v); },
    getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
    removeAttribute(k){ delete el.attrs[k]; },
    addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
    querySelector(sel){ return akFinde(el, sel)[0] || null; },
    querySelectorAll(sel){ return akFinde(el, sel); },
    classList: {add(){}, remove(){}, toggle(){}, contains(){ return false; }},
    set textContent(v){ el._text = String(v); el.kinder = []; },
    get textContent(){ return el.kinder.length ? el.kinder.map(akText).join("") : el._text; },
  };
  return el;
}
function akText(k){ return k == null ? "" : typeof k === "string" ? k : (k.textContent || ""); }
function akKlassen(el){ return String(el.className || el.attrs.class || "").split(/\s+/).filter(Boolean); }
function akPasst(el, sel){
  const teile = String(sel).match(/\.[\w-]+/g) || [];
  return teile.length > 0 && teile.every(t => akKlassen(el).includes(t.slice(1)));
}
function akFinde(el, sel){
  const treffer = [];
  const lauf = k => { for (const x of k.kinder || []) if (x && x.tag) { if (akPasst(x, sel)) treffer.push(x); lauf(x); } };
  lauf(el);
  return treffer;
}
function akH(tag, attrs = {}, ...kinder){
  const el = akKnoten(tag);
  for (const [k, v] of Object.entries(attrs || {})){
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : String(v));
  }
  el.append(...kinder.flat(Infinity));
  return el;
}
const akKnopf = (el, text) => (el && el.querySelectorAll(".knopf") || []).find(b => String(b.textContent).includes(text)) || null;
function akKlick(el){ for (const fn of (el.listeners.click || []).slice()) fn({currentTarget: el, target: el, preventDefault(){}, stopPropagation(){}}); }

/* ================= Kapsel: echter Spielstand, alles danach zurück ================= */
function akKapsel(fn){
  const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken, speicher: store.alles()};
  try {
    Spiel._trocken = true; Spiel._lz = {};
    Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
    Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
    return fn();
  } finally {
    if (SPEICHER.timer) { clearTimeout(SPEICHER.timer); SPEICHER.timer = null; }
    for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
    Object.assign(SPEICHER.daten, alt.speicher);
    Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
  }
}
function akInstanz(ticketId, niveau){
  Spiel._einst.wahl = niveau || "E";
  const inst = Spiel.instanzErstellen({ticketId: ticketId || "baeckerei-01", quelle: "postfach"});
  Spiel.oeffnen(inst.iid);
  return inst;
}

/* ================= Prüfstand: echte akte.js im vm-Bereich ================= */
function akPruefstand(inst){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const rufe = {toasts: [], kopiert: [], ansicht: [], dock: []};
  const akteEl = akKnoten("div");
  akteEl.hidden = false;
  const UIstub = {
    labor: {el: {akte: akteEl}, netz: inst ? inst.netz : null,
      dock: n => rufe.dock.push(n), dockReiter: (n, an, o) => rufe.dock.push([n, an, o]), dockOffen: () => true,
      auswaehlen: id => rufe.dock.push("auswaehlen:" + id), werkzeug: n => rufe.dock.push("werkzeug:" + n)},
    spiel: {inst: inst || null},
    symbol: (n, s) => akH("svg", {class: "sym-" + n, width: s}),
    bento: {monogramm: (name, o) => akH("span", {class: "mono"}, String(name || "").slice(0, 1))},
    klang: {spielen(){}},
    toast: (...a) => rufe.toasts.push(a),
    kopieren: t => { rufe.kopiert.push(t); return {then(fn){ fn(true); return this; }, catch(){ return this; }}; },
    app: {ansicht: n => rufe.ansicht.push(n)},
  };
  const busHaken = [];
  /* src/ui/dom.js legt SEINEN Namensraum `const UI = {}` an (lexikalisch im vm-Bereich);
     deshalb den Stub NACH dom.js hineinmischen statt ihn vorher als globale Eigenschaft zu setzen. */
  const bereich = {__stub: UIstub, console, document: {createElement: akKnoten, createTextNode: t => ({nodeType: 3, textContent: String(t)})},
    Bus: {an: (art, fn) => { busHaken.push({art, fn}); return () => {}; }, senden(){}},
    Spiel, requestAnimationFrame: fn => { fn(0); return 0; }, setTimeout: () => 0, clearTimeout(){}, Date, Math, JSON, Intl};
  vm.createContext(bereich);
  const quelle = f => fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8");
  vm.runInContext(quelle("dom.js"), bereich, {filename: "ui/dom.js"});
  vm.runInContext("Object.assign(UI, __stub);", bereich, {filename: "stubs.js"});
  vm.runInContext(quelle("akte.js"), bereich, {filename: "ui/akte.js"});
  const A = vm.runInContext("UI.akte", bereich);
  return {UI: UIstub, A, akteEl, rufe, busHaken, setInst(i){ UIstub.spiel.inst = i; UIstub.labor.netz = i ? i.netz : null; }};
}

if (!AK_LADEN) {
  pruefe("Einsatzakte-UI: nur unter node tests/run.js prüfbar", () => { erwarte.wahr(false, "require fehlt"); });
} else gruppe("UI: Einsatzakte (UIL-07)", () => {

  pruefe("Akte ÖFFNEN: Kunde, Vorgang, Weg, Schichtentreppe und Beweise aus echten Daten", () => akKapsel(() => {
    const inst = akInstanz("baeckerei-01");
    Spiel.akte.hinzu(inst, {art: "ping", titel: "Ping Kasse → Drucker", befund: "4/4 Antworten", ok: true});
    const p = akPruefstand(inst);
    p.A.zeichnen();
    const el = p.akteEl;
    erwarte.wahr(!!akFinde(el, ".ak")[0], "das Dossier wird gezeichnet");
    erwarte.enthaelt(akText(el), "Vorgang baeckerei-01", "der Vorgang steht im Kopf");
    erwarte.enthaelt(akText(el), Spiel.kundenDaten("baeckerei").name, "der Kunde ist der Titel");
    erwarte.gleich(akFinde(el, ".ak-karte").length, Spiel.akte.liste(inst).length, "Beweiskarten = echte Kartenzahl");
    erwarte.wahr(!!akFinde(el, ".ak-leiter")[0], "der Weg (didaktische Leiter) steht");
    erwarte.wahr(!!akFinde(el, ".ak-register")[0], "die Schichtentreppe steht");
  }));

  pruefe("Akte FILTERN: Klick auf eine Schicht filtert die sichtbaren Beweise, Aufheben zeigt alle", () => akKapsel(() => {
    const inst = akInstanz("baeckerei-01");
    Spiel.akte.hinzu(inst, {art: "kabel", titel: "Kabeltest", befund: "Kein Link", ok: false, schicht: 1});
    Spiel.akte.hinzu(inst, {art: "ping", titel: "Ping Internet", befund: "Keine Antwort", ok: false, schicht: 3});
    Spiel.akte.hinzu(inst, {art: "befehl", titel: "ipconfig", befund: "gelesen", ok: true});
    const p = akPruefstand(inst);
    p.A.zeichnen();
    const el = p.akteEl;
    const kartenVorher = akFinde(el, ".ak-karte").length;
    erwarte.gleich(kartenVorher, 3, "drei Beweise vor dem Filter");
    const schichten = akFinde(el, ".ak-schicht");
    erwarte.wahr(schichten.length >= 1, "Schichtknöpfe stehen");
    akKlick(schichten[0]);                                  /* Schicht 1 hat einen Beweis */
    erwarte.gleich(akFinde(el, ".ak-karte").length, 1, "der Filter zeigt nur die Karten der Schicht");
    const aufheben = akKnopf(el, "Filter aufheben");
    erwarte.wahr(!!aufheben, "„Filter aufheben“ wird angeboten");
    akKlick(aufheben);
    erwarte.gleich(akFinde(el, ".ak-karte").length, kartenVorher, "nach dem Aufheben sind alle Beweise zurück");
  }));

  pruefe("Akte HYPOTHESE: Schicht/Ursache/Gerät wählen, festhalten (echte Daten) und wieder ÄNDERN", () => akKapsel(() => {
    const inst = akInstanz("baeckerei-01");
    const p = akPruefstand(inst);
    p.A.zeichnen();
    const el = p.akteEl;
    const festVorher = akKnopf(el, "Verdacht festhalten");
    erwarte.gleich(festVorher.getAttribute("disabled"), "", "ohne Auswahl ist Festhalten gesperrt");
    const schichtChips = akFinde(akFinde(el, ".ak-chips")[0], ".ak-chip");
    erwarte.wahr(schichtChips.length >= 3, "Schicht-Auswahl steht");
    akKlick(schichtChips[0]);
    akKlick(akFinde(el, ".ak-ursachen")[0].querySelectorAll(".ak-chip")[0]);
    akKlick(akFinde(el, ".ak-geraet")[0].querySelectorAll(".ak-chip")[0]);
    const fest = akKnopf(el, "Verdacht festhalten");
    erwarte.gleich(fest.getAttribute("disabled"), null, "mit allen drei Angaben ist Festhalten möglich");
    akKlick(fest);
    erwarte.wahr(!!inst.verdacht, "der Verdacht liegt in den echten Daten");
    erwarte.wahr(!!akFinde(el, ".ak-stempel")[0], "die Akte zeigt den Stempel");
    erwarte.enthaelt(p.rufe.toasts.map(t => String(t[0])).join(" | "), "festgehalten", "ein Toast bestätigt");
    /* ÄNDERN: Stempel -> Auswahl -> Abbrechen führt zurück zum Stempel. */
    akKlick(akKnopf(el, "ändern"));
    erwarte.wahr(akFinde(el, ".ak-chips").length >= 2, "„ändern“ öffnet die Auswahl wieder");
    akKlick(akKnopf(el, "Abbrechen"));
    erwarte.wahr(!!akFinde(el, ".ak-stempel")[0], "Abbrechen führt zurück zum Stempel");
  }));

  pruefe("Akte SCHLIESSEN (Leerzustand): ohne Auftrag ehrliche Kachel mit Weg ins Postfach", () => akKapsel(() => {
    const p = akPruefstand(null);
    p.A.zeichnen();
    erwarte.enthaelt(akText(p.akteEl), "Keine Akte offen", "der Leerzustand ist ehrlich");
    const postfach = akKnopf(p.akteEl, "Zum Postfach");
    erwarte.wahr(!!postfach, "es gibt einen Weg zurück ins Postfach");
    akKlick(postfach);
    erwarte.gleich(p.rufe.ansicht, ["postfach"], "der Knopf öffnet das Postfach");
  }));

  pruefe("Akte BERICHT + STERN: Kopieren ruft die echte Bericht-Funktion; Stern markiert den Beweis", () => akKapsel(() => {
    const inst = akInstanz("baeckerei-01");
    Spiel.akte.hinzu(inst, {art: "ping", titel: "Ping Kasse → Drucker", befund: "4/4 Antworten", ok: true});
    const p = akPruefstand(inst);
    p.A.zeichnen();
    const el = p.akteEl;
    const stern = akFinde(el, ".ak-stern")[0];
    erwarte.wahr(!!stern, "der Stern-Knopf steht am Beweis");
    akKlick(stern);
    erwarte.gleich(akText(akFinde(el, ".ak-stern")[0]), "★", "der Stern ist gesetzt (echte Daten)");
    akKlick(akKnopf(el, "Einsatzbericht kopieren"));
    erwarte.gleich(p.rufe.kopiert.length, 1, "Kopieren ruft die Bericht-Funktion genau einmal");
    erwarte.enthaelt(String(p.rufe.kopiert[0]), "Einsatzakte", "kopiert wird der echte Einsatzbericht");
  }));

});
