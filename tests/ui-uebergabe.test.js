"use strict";
/* ÜBERGABE — DIE OBERFLÄCHE (Fahrplan 1.3/2.0, Schritt 0, „Wirkung vor Grün“).
   `tests/spiel-uebergabe.test.js` prüft die Logik (kein DOM). Diese Datei prüft, dass die
   Oberfläche sie WIRKLICH aufruft: dass der Knopf im Einstellungs-Abschnitt steht, dass der
   Dialog öffnet, dass „Behalten“/„Löschen“ mit der richtigen Entscheidung durchkommen — und
   dass die Seite danach neu geladen wird (ohne den Neuladen wäre die Übergabe wirkungslos,
   weil `src/ui/spiel.js` den alten Auftrag weiterhielte).

   Geladen wird die Datei, die im Programm läuft: `src/ui/uebergabe.js`, in einem eigenen
   Bereich mit echtem `Spiel` und nachgebildetem DOM (Bauart von tests/spiel-leiste-hilfe.test.js). */

const UEB_KANN_LADEN = (() => {
  try { return typeof require === "function" && typeof document === "undefined" && typeof Spiel === "object" && Spiel !== null; }
  catch (e) { return false; }
})();
const UEB_ZUSATZ = UEB_KANN_LADEN ? "" : " (kein require im Testbereich – nur unter node tests/run.js)";

/* ================= DOM-Ersatz ================= */
function uebKnoten(tag){
  const el = {
    nodeType: 1, tag, kinder: [], attrs: {}, dataset: {}, listeners: {}, className: "", _text: "", hidden: false, title: "",
    parentNode: null,
    style: {setProperty(){}, removeProperty(){}, getPropertyValue(){ return ""; }},
    append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.parentNode = el; el.kinder.push(x); } },
    replaceChildren(...k){ el.kinder = []; el.append(...k); },
    remove(){ if (el.parentNode) el.parentNode.kinder = el.parentNode.kinder.filter(x => x !== el); },
    setAttribute(k, v){ el.attrs[k] = String(v); if (k.startsWith("data-")) el.dataset[k.slice(5).replace(/-(\w)/g, (x, c) => c.toUpperCase())] = String(v); if (k === "hidden") el.hidden = true; },
    getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
    removeAttribute(k){ delete el.attrs[k]; if (k === "hidden") el.hidden = false; },
    addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
    click(){ for (const fn of (el.listeners.click || []).slice()) fn({currentTarget: el, target: el, preventDefault(){}, stopPropagation(){}}); },
    querySelector(sel){ return uebFinde(el, sel)[0] || null; },
    querySelectorAll(sel){ return uebFinde(el, sel); },
    classList: {
      _l(){ return String(el.className || "").split(/\s+/).filter(Boolean); },
      _s(l){ el.className = l.join(" "); },
      add(...k){ const l = el.classList._l(); for (const x of k) if (!l.includes(x)) l.push(x); el.classList._s(l); },
      remove(...k){ el.classList._s(el.classList._l().filter(x => !k.includes(x))); },
      toggle(x, an){ const a = an === undefined ? !el.classList.contains(x) : !!an; if (a) el.classList.add(x); else el.classList.remove(x); return a; },
      contains(x){ return el.classList._l().includes(x); },
    },
    set textContent(v){ el._text = String(v); el.kinder = []; },
    get textContent(){ return el.kinder.length ? el.kinder.map(uebText).join("") : el._text; },
    get lastElementChild(){ return el.kinder.filter(k => k && k.tag).slice(-1)[0] || null; },
    get children(){ return el.kinder.filter(k => k && k.tag); },
  };
  return el;
}
function uebPasst(el, sel){
  const s = String(sel).trim();
  if (/^[a-z][a-z0-9]*$/i.test(s)) return el.tag === s;
  const teile = s.match(/\.[\w-]+|\[[^\]]+\]/g) || [];
  return teile.length > 0 && teile.every(t => {
    if (t.startsWith(".")) return String(el.className || "").split(/\s+/).includes(t.slice(1));
    const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(t);
    if (!m) return false;
    const wert = m[1] === "hidden" ? (el.hidden ? "" : undefined) : (m[1].startsWith("data-") ? el.dataset[m[1].slice(5)] : el.attrs[m[1]]);
    return m[2] === undefined ? wert !== undefined : String(wert) === m[2];
  });
}
function uebFinde(el, sel){
  const treffer = [];
  const lauf = k => { for (const x of k.kinder) if (x && x.tag) { if (uebPasst(x, sel)) treffer.push(x); lauf(x); } };
  lauf(el);
  return treffer;
}
function uebText(k){ return k == null ? "" : typeof k === "string" ? k : k.textContent; }

/* ================= Prüfstand ================= */
function uebStand(){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const abschnitte = [], uebergaben = [], toasts = [], exporte = [];
  let neuladungen = 0;              /* zählt `location.reload()` — Begründung an der Attrappe unten */
  const dokument = {
    createElement: tag => uebKnoten(tag), createElementNS: (ns, tag) => uebKnoten(tag),
    createTextNode: t => ({nodeType: 3, textContent: String(t)}),
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    addEventListener(){}, removeEventListener(){},
    documentElement: Object.assign(uebKnoten("html"), {dataset: {}}), body: uebKnoten("body"), activeElement: null,
  };
  const bereich = {
    console: {log(){}, error(){}, warn(){}, info(){}},
    document: dokument, store, Bus, Spiel, L, DATEN, eur, zahlDe, heute, datumDe, jetzt,
    LABOR_VERSION: "1.2.4",
    requestAnimationFrame: fn => { try { fn(0); } catch (e) {} return 0; },
    setTimeout: () => 0, clearTimeout(){},
    /* `location` gibt es in einem vm-Bereich nicht — hier als Attrappe, damit MESSBAR wird,
       dass die Übergabe neu lädt. Ohne den Neuladen bliebe der alte Auftrag stehen.
       Der Zähler liegt bewusst in DIESEM Bereich: `globalThis` in dieser Funktion zeigt auf den
       Bereich, in dem sie gebaut wird (den Testbereich), NICHT auf den vm-Bereich `bereich` —
       `globalThis.__reloads++` zählte deshalb ins Leere und `reloads()` blieb 0 (gemessen). */
    location: {reload(){ neuladungen++; }},
    Plattform: {name: "browser", datei: {exportieren: (name, text) => { exporte.push([name, text]); return Promise.resolve(true); }}},
  };
  vm.createContext(bereich);
  /* Die drei Sammler MÜSSEN im Bereich selbst liegen: die Attrappen unten laufen IM vm-Bereich und
     schreiben über `globalThis.__abschnitte` / `__uebergaben` / `__toasts`. Fehlen sie dort, ist das
     Ziel `undefined` und schon der Aufbau bricht mit „Cannot read properties of undefined (reading
     'push')“ ab — dann ist kein einziger der acht Fälle prüfbar (gemessen, siehe Meldung).
     Bauart wie tests/spiel-leiste-hilfe.test.js:92. */
  Object.assign(bereich, {__abschnitte: abschnitte, __uebergaben: uebergaben, __toasts: toasts});
  const quelle = f => fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8");
  vm.runInContext(quelle("dom.js"), bereich, {filename: "ui/dom.js"});
  vm.runInContext([
    "UI.symbol = (n, g) => sv('svg', {class: 'sym-' + n, width: g || 16});",
    "UI.toast = (t, a, o) => { globalThis.__toasts.push([t, a, o]); };",
    /* Der Rahmen: `einstellungAbschnitt` sammelt die Abschnitte ein — genau wie app.js es tut. */
    "UI.app = {einstellungAbschnitt: (titel, fn) => { const c = h('div', {class: 'in-abschnitt'}); fn(c); globalThis.__abschnitte.push([titel, c]); }, aktualisieren(){}, ansicht(){}};",
    "UI.startHaken = [];",
    /* Attrappe der Logik: die ECHTE wird in tests/spiel-uebergabe.test.js geprüft. Hier zählt,
       dass die Oberfläche sie mit der richtigen Entscheidung ruft. */
    "Spiel.uebergabe = o => { globalThis.__uebergaben.push(o); return {ok: true, lernstandBehalten: !!(o && o.lernstandBehalten)}; };",
    "Spiel.uebergabeLetzte = () => null;",
    "Spiel.gutschreiben = (e, r) => { Spiel.st.euro += e; Spiel.st.ruf += r; };",
  ].join("\n"), bereich);
  vm.runInContext(quelle("uebergabe.js"), bereich, {filename: "ui/uebergabe.js"});
  /* Die Start-Haken ausführen (app.js ruft sie beim Aufbau) */
  vm.runInContext("for (const f of UI.startHaken) f();", bereich);
  vm.runInContext("globalThis.__p = {UI: UI};", bereich);
  return {UI: bereich.__p.UI, abschnitte, uebergaben, toasts, exporte, reloads: () => neuladungen, behaelter: dokument.body};
}

function uebKapsel(fn){
  return () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
                 labor: store.get("labor", null), einstStore: store.get("einst", null)};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand();
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      return fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      store.set("labor", alt.labor); store.set("einst", alt.einstStore);
      jetzt.frei();
    }
  };
}
/* Text aller Knöpfe im Overlay — damit die Prüfung die Beschriftung nennt, die der Azubi sieht. */
function uebKnoepfe(knoten){ return uebFinde(knoten, "button").map(k => uebText(k).trim()); }

gruppe("UI: Übergabe" + UEB_ZUSATZ, () => {
  if (!UEB_KANN_LADEN) {
    pruefe("UI-Übergabe: nur unter node tests/run.js prüfbar", () => { erwarte.wahr(false, "require fehlt"); });
    return;
  }

  pruefe("Der Einstellungs-Abschnitt „Rechner übergeben“ steht da, mit Knopf", uebKapsel(() => {
    const s = uebStand();
    const e = s.abschnitte.find(a => a[0] === "Rechner übergeben");
    erwarte.wahr(!!e, "Abschnitt angemeldet");
    erwarte.gleich(uebKnoepfe(e[1]), ["Rechner übergeben …"], "genau ein Knopf im Abschnitt");
  }));

  pruefe("Klick öffnet den Dialog — mit beiden Wegen und dem Sichern davor", uebKapsel(() => {
    const s = uebStand();
    const abschnitt = s.abschnitte.find(a => a[0] === "Rechner übergeben")[1];
    uebFinde(abschnitt, "button")[0].click();
    const knoepfe = uebKnoepfe(s.behaelter);
    erwarte.enthaelt(knoepfe.join(" | "), "Behalten", "Weg „Behalten“");
    erwarte.enthaelt(knoepfe.join(" | "), "Löschen", "Weg „Löschen“");
    erwarte.enthaelt(knoepfe.join(" | "), "Erst sichern", "Sichern davor");
    erwarte.enthaelt(knoepfe.join(" | "), "Abbrechen", "Abbrechen");
    erwarte.passt(s.behaelter.textContent, /Geht verloren.*Geld, Ruf, Aufträge/s, "sagt, was verloren geht");
    erwarte.passt(s.behaelter.textContent, /Bleibt.*Einstellungen/s, "sagt, was bleibt");
  }));

  pruefe("Ein Aufruf = genau EIN Dialog (nicht zwei übereinander)", uebKapsel(() => {
    const s = uebStand();
    const abschnitt = s.abschnitte.find(a => a[0] === "Rechner übergeben")[1];
    uebFinde(abschnitt, "button")[0].click();
    const dialoge = uebFinde(s.behaelter, ".sp-overlay");
    erwarte.gleich(dialoge.length, 1, "ein Overlay");
  }));

  pruefe("„Behalten“ übergibt mit lernstandBehalten:true und lädt neu", uebKapsel(() => {
    const s = uebStand();
    uebFinde(s.abschnitte.find(a => a[0] === "Rechner übergeben")[1], "button")[0].click();
    const k = uebFinde(s.behaelter, "button").find(b => uebText(b).includes("Behalten"));
    k.click();
    erwarte.gleich(s.uebergaben.length, 1, "genau ein Aufruf");
    erwarte.gleich(s.uebergaben[0].lernstandBehalten, true, "mit behalten");
    erwarte.gleich(s.reloads(), 1, "die Seite lädt neu");
  }));

  pruefe("„Löschen“ übergibt mit lernstandBehalten:false und lädt neu", uebKapsel(() => {
    const s = uebStand();
    uebFinde(s.abschnitte.find(a => a[0] === "Rechner übergeben")[1], "button")[0].click();
    const k = uebFinde(s.behaelter, "button").find(b => uebText(b).includes("Löschen"));
    k.click();
    erwarte.gleich(s.uebergaben[0].lernstandBehalten, false, "mit löschen");
    erwarte.gleich(s.reloads(), 1, "die Seite lädt neu");
  }));

  pruefe("Abbrechen übergibt NICHT und lädt NICHT neu", uebKapsel(() => {
    const s = uebStand();
    uebFinde(s.abschnitte.find(a => a[0] === "Rechner übergeben")[1], "button")[0].click();
    uebFinde(s.behaelter, "button").find(b => uebText(b).includes("Abbrechen")).click();
    erwarte.gleich(s.uebergaben.length, 0, "kein Aufruf");
    erwarte.gleich(s.reloads(), 0, "kein Neuladen");
  }));

  pruefe("„Erst sichern“ schreibt eine Datei und übergibt NICHT", uebKapsel(() => {
    const s = uebStand();
    Spiel.st.euro = 42; Spiel.st.ruf = 3;
    /* So liegt der Stand im Programm im Speicher: Spiel.geaendert() → Spiel.speichern() →
       store.set("labor", …) (src/spiel/zustand.js:170-174). Im Prüfstand ist `Spiel._trocken` an
       und `Spiel.speichern()` steigt sofort aus — deshalb legt der Test den Stand ausdrücklich ab.
       Ohne diesen Schritt exportierte `exportieren()` (store.alles(), wie karriere.js:442-444)
       einen leeren Speicher: die Prüfung „der Stand steht in der Datei“ prüfte dann nichts. */
    store.set("labor", Spiel.st);
    uebFinde(s.abschnitte.find(a => a[0] === "Rechner übergeben")[1], "button")[0].click();
    uebFinde(s.behaelter, "button").find(b => uebText(b).includes("Erst sichern")).click();
    erwarte.gleich(s.exporte.length, 1, "eine Datei geschrieben");
    erwarte.passt(s.exporte[0][0], /^netzwerk-labor-\d{4}-\d{2}-\d{2}\.json$/, "Dateiname mit Datum");
    const inhalt = JSON.parse(s.exporte[0][1]);
    erwarte.gleich(inhalt.speicher.labor.euro, 42, "der Stand steht in der Datei");
    erwarte.gleich(s.uebergaben.length, 0, "noch nicht übergeben");
    erwarte.gleich(s.reloads(), 0, "noch nicht neu geladen");
  }));

  pruefe("Scheitert die Übergabe, wird NICHT neu geladen — und der Grund steht als Meldung da", uebKapsel(() => {
    const s = uebStand();
    /* Die Attrappe scheitern lassen: so wird geprüft, dass die Oberfläche den Fehlerweg geht. */
    const echt = Spiel.uebergabe;
    Spiel.uebergabe = () => ({ok: false, grund: "Kein Lernmotor geladen."});
    try {
      uebFinde(s.abschnitte.find(a => a[0] === "Rechner übergeben")[1], "button")[0].click();
      uebFinde(s.behaelter, "button").find(b => uebText(b).includes("Behalten")).click();
    } finally { Spiel.uebergabe = echt; }
    erwarte.gleich(s.reloads(), 0, "kein Neuladen");
    erwarte.wahr(s.toasts.some(t => String(t[0]).includes("Kein Lernmotor")), "der Grund wird gemeldet");
    erwarte.wahr(s.toasts.some(t => t[1] === "fehler"), "als Fehler, nicht als Erfolg");
  }));
});
