"use strict";
/* ONBOARDING-TOUR (3.1.0, Aufgabe B3/1): Overlay beim ersten Start nach Spiel.laden, nur ohne offenes
   Ticket; 4 Schritte aus DATEN.leitfaden.tour; [Überspringen][Weiter][Los geht's]; Esc = überspringen;
   store einst.tour = {gesehen:true}; Einstellungen: „Einführung wiederholen". Kein R12-Einfluss (Overlay).
   Geprüft wird die Datei, die im Programm läuft: src/ui/onboarding.js + src/ui/dom.js in eigenem vm-Bereich. */
const ONB_LADEN = (() => {
  try { return typeof require === "function" && typeof document === "undefined"; } catch (e) { return false; }
})();
const ONB_ZUSATZ = ONB_LADEN ? "" : " (kein require im Testbereich – nur unter node tests/run.js)";

function onbKnoten(tag){
  const el = {
    nodeType: 1, tag, kinder: [], listeners: {}, attrs: {}, className: "", _text: "", eltern: null,
    style: {setProperty(){}, removeProperty(){}, getPropertyValue(){ return ""; }},
    append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.eltern = el; el.kinder.push(x); } },
    replaceChildren(...k){ el.kinder = []; el.append(...k); },
    remove(){ if (el.eltern) el.eltern.kinder = el.eltern.kinder.filter(x => x !== el); },
    setAttribute(k, v){ el.attrs[k] = String(v); },
    getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
    removeAttribute(k){ delete el.attrs[k]; },
    addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
    removeEventListener(art, fn){ if (el.listeners[art]) el.listeners[art] = el.listeners[art].filter(x => x !== fn); },
    click(){ for (const fn of (el.listeners.click || []).slice()) fn({currentTarget: el, target: el, preventDefault(){}, stopPropagation(){}}); },
    focus(){ bereichFokus = el; }, blur(){ if (bereichFokus === el) bereichFokus = null; },
    querySelector(sel){ return onbFinde(el, sel)[0] || null; },
    querySelectorAll(sel){ return onbFinde(el, sel); },
    get children(){ return el.kinder.filter(x => x && typeof x === "object" && x.tag); },
    set textContent(v){ el._text = String(v); el.kinder = []; },
    get textContent(){ return el.kinder.length ? el.kinder.map(onbText).join("") : el._text; },
    get isConnected(){ let x = el; while (x.eltern) x = x.eltern; return !!x.__imBaum; },
  };
  return el;
}
let bereichFokus = null;
function onbText(k){ return k == null ? "" : typeof k === "string" ? k : (k.textContent || ""); }
function onbKlassen(el){ return String(el.className || (el.attrs && el.attrs.class) || "").split(/\s+/).filter(Boolean); }
function onbPasst(el, sel){ const s = String(sel); if (!s.startsWith(".")) return el.tag === s; const ks = s.match(/\.[\w-]+/g) || []; return ks.length > 0 && ks.every(k => onbKlassen(el).includes(k.slice(1))); }
function onbFinde(el, sel){ const t = []; const lauf = k => { for (const x of k.kinder || []) if (x && x.tag) { if (onbPasst(x, sel)) t.push(x); lauf(x); } }; lauf(el); return t; }
function onbKnopf(el, text){ return onbFinde(el, "button").find(b => String(b.textContent).includes(text)) || null; }

function onbStand(opt = {}){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const gespeichert = [];
  const abschnitte = [];
  const startHaken = [];
  const dokument = onbKnoten("body"); dokument.__imBaum = true;
  const document = {
    body: dokument, documentElement: onbKnoten("html"), activeElement: null,
    createElement: tag => onbKnoten(tag), createElementNS: (ns, tag) => onbKnoten(tag),
    createTextNode: t => ({nodeType: 3, textContent: String(t)}),
    addEventListener(art, fn){ (dokument.listeners[art] ||= []).push(fn); },
    removeEventListener(art, fn){ if (dokument.listeners[art]) dokument.listeners[art] = dokument.listeners[art].filter(x => x !== fn); },
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  };
  const storeDaten = opt.store ? JSON.parse(JSON.stringify(opt.store)) : {};
  const store = {
    get: (k, ersatz = null) => (k in storeDaten ? JSON.parse(JSON.stringify(storeDaten[k])) : ersatz),
    set: (k, v) => { storeDaten[k] = JSON.parse(JSON.stringify(v)); gespeichert.push([k, v]); },
  };
  const UIstub = {startHaken, app: {einstellungAbschnitt: (titel, fn) => abschnitte.push({titel, fn})}};
  const bereich = {
    __stub: UIstub, console: {log(){}, error(){}, warn(){}}, document, store, window: {},
    navigator: opt.webdriver ? {webdriver: true} : {},
    location: opt.location || {hostname: "127.0.0.1", href: "http://127.0.0.1/index.html"},
    DATEN: opt.daten !== undefined ? opt.daten : {leitfaden: {onboarding: [
      {titel: "Willkommen", text: "Das Labor ist dein Arbeitsplatz."},
      {titel: "Die Lage", text: "Links siehst du das Netz, rechts den Inspektor."},
      {titel: "Die Konsole", text: "Unten tippst du Befehle wie auf einem echten Gerät."},
      {titel: "Dein erster Auftrag", text: "Im Postfach wartet der erste Kunde."},
    ]}},
    Spiel: {aktiveInstanz: () => opt.aktiveInstanz || null},
    setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; }, clearTimeout(){},
    requestAnimationFrame: fn => { try { fn(0); } catch (e) {} return 0; },
  };
  vm.createContext(bereich);
  const lies = f => fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8");
  vm.runInContext(lies("dom.js"), bereich, {filename: "ui/dom.js"});
  vm.runInContext("Object.assign(UI, __stub);", bereich, {filename: "stubs.js"});
  vm.runInContext(lies("onboarding.js"), bereich, {filename: "ui/onboarding.js"});
  const UI = vm.runInContext("UI", bereich);
  return {UI, dokument, gespeichert, abschnitte, startHaken, storeDaten, onb: UI.onboarding};
}

if (!ONB_LADEN) {
  pruefe("Onboarding: nur unter node tests/run.js prüfbar", () => { erwarte.wahr(false, "require fehlt"); });
} else gruppe("UI: Onboarding-Tour (3.1.0 B3/1)", () => {

  pruefe("Tour: 4 Schritte aus DATEN.leitfaden.tour, Weiter/Los geht's, danach gesehen" , () => {
    const s = onbStand();
    erwarte.wahr(!!s.onb, "UI.onboarding steht");
    erwarte.gleich(s.onb.gesehen(), false, "frischer Stand: nicht gesehen");
    erwarte.wahr(s.onb.tour() === true, "tour() startet");
    const huelle = onbFinde(s.dokument, ".onb-huelle")[0];
    erwarte.wahr(!!huelle, "das Overlay steht im DOM");
    erwarte.gleich(onbFinde(s.dokument, ".onb-huelle").length, 1, "genau ein Overlay");
    let karte = onbFinde(huelle, ".onb-karte")[0];
    erwarte.enthaelt(onbText(karte), "1 / 4", "Fortschritt zeigt Schritt 1 von 4");
    erwarte.enthaelt(onbText(karte), "Willkommen", "Titel des ersten Schritts");
    erwarte.enthaelt(onbText(karte), "Das Labor ist dein Arbeitsplatz.", "Text des ersten Schritts");
    erwarte.wahr(!!onbKnopf(huelle, "Überspringen"), "Überspringen-Knopf steht da");
    erwarte.wahr(!!onbKnopf(huelle, "Weiter"), "Weiter-Knopf steht da");
    onbKnopf(huelle, "Weiter").click();
    karte = onbFinde(huelle, ".onb-karte")[0];
    erwarte.enthaelt(onbText(karte), "2 / 4", "Schritt 2");
    erwarte.enthaelt(onbText(karte), "Die Lage", "Titel Schritt 2");
    onbKnopf(huelle, "Weiter").click();
    onbKnopf(huelle, "Weiter").click();
    karte = onbFinde(huelle, ".onb-karte")[0];
    erwarte.enthaelt(onbText(karte), "4 / 4", "Schritt 4");
    erwarte.wahr(!!onbKnopf(huelle, "Los geht's"), "letzter Schritt: „Los geht's“");
    onbKnopf(huelle, "Los geht's").click();
    erwarte.gleich(onbFinde(s.dokument, ".onb-huelle").length, 0, "Overlay danach geschlossen");
    erwarte.gleich(s.onb.gesehen(), true, "gesehen ist gespeichert");
    const einst = s.gespeichert.filter(x => x[0] === "einst").at(-1);
    erwarte.wahr(!!einst && einst[1].tour && einst[1].tour.gesehen === true, "store einst.tour.gesehen = true");
  });

  pruefe("Esc überspringt die Tour und merkt „gesehen“", () => {
    const s = onbStand();
    s.onb.tour();
    const listener = (s.dokument.listeners.keydown || []).slice(-1)[0];
    erwarte.wahr(typeof listener === "function", "ein Esc-Hörer ist angemeldet");
    listener({key: "Escape", preventDefault(){}});
    erwarte.gleich(onbFinde(s.dokument, ".onb-huelle").length, 0, "Esc schließt das Overlay");
    erwarte.gleich(s.onb.gesehen(), true, "Esc zählt als übersprungen");
  });

  pruefe("Überspringen schließt sofort und merkt „gesehen“", () => {
    const s = onbStand();
    s.onb.tour();
    const huelle = onbFinde(s.dokument, ".onb-huelle")[0];
    onbKnopf(huelle, "Überspringen").click();
    erwarte.gleich(onbFinde(s.dokument, ".onb-huelle").length, 0, "Overlay weg");
    erwarte.gleich(s.onb.gesehen(), true, "gesehen gespeichert");
  });

  pruefe("beimStart: einmalig, nur ohne offenes Ticket (echter Start-Haken)", () => {
    const s = onbStand();
    s.startHaken.forEach(fn => fn());
    erwarte.wahr(s.startHaken.length >= 1, "die Tour hängt sich an UI.startHaken");
    erwarte.wahr(onbFinde(s.dokument, ".onb-huelle").length === 1, "frischer Start zeigt die Tour");
    s.onb.merken && s.onb.merken();
    const zweiter = onbStand({store: {einst: {tour: {gesehen: true}}}});
    zweiter.startHaken.forEach(fn => fn());
    erwarte.gleich(onbFinde(zweiter.dokument, ".onb-huelle").length, 0, "zweiter Start zeigt keine Tour");
    s.onb.schliessen && s.onb.schliessen();
    const offen = onbStand({aktiveInstanz: {iid: "x"}});
    offen.startHaken.forEach(fn => fn());
    erwarte.gleich(onbFinde(offen.dokument, ".onb-huelle").length, 0, "mit offenem Ticket keine Tour");
  });

  pruefe("Einstellungen: „Einführung wiederholen“ startet die Tour erneut", () => {
    const s = onbStand({store: {einst: {tour: {gesehen: true}}}});
    s.startHaken.forEach(fn => fn());
    const abschnitt = s.abschnitte.find(a => /Einführung/i.test(a.titel));
    erwarte.wahr(!!abschnitt, "der Einstellungs-Abschnitt ist angemeldet");
    const c = onbKnoten("div");
    abschnitt.fn(c);
    const knopf = onbKnopf(c, "Einführung wiederholen");
    erwarte.wahr(!!knopf, "der Wiederholen-Knopf steht im Abschnitt");
    knopf.click();
    erwarte.gleich(onbFinde(s.dokument, ".onb-huelle").length, 1, "Klick startet die Tour erneut (auch wenn gesehen)");
  });

  pruefe("Ohne Tour-Daten: keine Tour, kein Absturz (ehrlich leer)", () => {
    const s = onbStand({daten: {leitfaden: {tour: []}}});
    erwarte.wahr(s.onb.tour() === false, "tour() meldet ehrlich false");
    erwarte.gleich(onbFinde(s.dokument, ".onb-huelle").length, 0, "kein leeres Overlay");
    const kaputt = onbStand({daten: {}});
    erwarte.wahr(kaputt.onb.tour() === false, "fehlende DATEN.leitfaden: keine Tour");
  });

  pruefe("Automatisierte Browser (navigator.webdriver) bekommen keine Auto-Tour, manuell schon", () => {
    const s = onbStand({webdriver: true});
    s.startHaken.forEach(fn => fn());
    erwarte.gleich(onbFinde(s.dokument, ".onb-huelle").length, 0, "keine Auto-Tour im automatisierten Browser (Rauch misst sonst die verdeckte Hauptaktion)");
    erwarte.wahr(s.onb.tour() === true, "manuell startbar bleibt sie");
    /* KEIN Hostname-/UA-Schutz: echte Nutzer auf localhost/EXE sehen die Tour. */
    const lokal = onbStand({location: {hostname: "127.0.0.1"}});
    lokal.startHaken.forEach(fn => fn());
    erwarte.gleich(onbFinde(lokal.dokument, ".onb-huelle").length, 1, "localhost ohne webdriver: Tour erscheint (echter Nutzer)");
  });

  pruefe("Echte Daten: DATEN.leitfaden.onboarding hat vier Schritte mit titel/text", () => {
    if (typeof DATEN !== "object" || !DATEN || !DATEN.leitfaden) { erwarte.wahr(false, "DATEN.leitfaden fehlt im Testbereich"); return; }
    const liste = DATEN.leitfaden.onboarding || DATEN.leitfaden.tour;
    erwarte.wahr(Array.isArray(liste), "onboarding ist eine Liste");
    erwarte.gleich(liste.length, 4, "vier Tour-Schritte (inhalts task-125 final)");
    for (const eintrag of liste) erwarte.wahr(!!eintrag && !!eintrag.titel && !!eintrag.text, "titel/text gesetzt: " + JSON.stringify(eintrag && eintrag.id));
    const s = onbStand({daten: JSON.parse(JSON.stringify(DATEN))});
    erwarte.wahr(s.onb.tour() === true, "die Tour startet mit den echten Daten");
    const karte = onbFinde(s.dokument, ".onb-karte")[0];
    erwarte.enthaelt(onbText(karte), liste[0].titel, "erster Titel kommt aus den echten Daten");
    erwarte.enthaelt(onbText(karte), "1 / 4", "vier Schritte werden durchgezählt");
  });

});
