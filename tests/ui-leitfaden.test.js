"use strict";
/* ANALYSE-LEITFADEN (3.1.0, Aufgabe B3/2): Panel im Inspektor, NUR TEXT (kein neuer Knopf/Toggle → R12),
   sichtbar bei laufendem Auftrag; Fortschritt als Ring, Schritte mit Status, Impuls, „Nächster Schritt“;
   Prüfungsmodus neutral. Daten: Spiel.leitfaden.stand/naechsterSchritt (spiel task-123). */
const LF_LADEN = (() => {
  try { return typeof require === "function" && typeof document === "undefined"; } catch (e) { return false; }
})();
const LF_ZUSATZ = LF_LADEN ? "" : " (kein require im Testbereich – nur unter node tests/run.js)";

function lfKnoten(tag){
  const el = {
    nodeType: 1, tag, kinder: [], listeners: {}, attrs: {}, className: "", _text: "", eltern: null, parentNode: null,
    style: {__werte: {}, setProperty(k, v){ this.__werte[k] = String(v); }, removeProperty(k){ delete this.__werte[k]; }, getPropertyValue(k){ return this.__werte[k] || ""; }},
    append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") { x.eltern = el; x.parentNode = el; } el.kinder.push(x); } },
    replaceChildren(...k){ el.kinder = []; el.append(...k); },
    remove(){ if (el.eltern) el.eltern.kinder = el.eltern.kinder.filter(x => x !== el); },
    setAttribute(k, v){ el.attrs[k] = String(v); },
    getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
    addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
    click(){ for (const fn of (el.listeners.click || []).slice()) fn({currentTarget: el, target: el, preventDefault(){}, stopPropagation(){}}); },
    querySelector(sel){ return lfFinde(el, sel)[0] || null; },
    querySelectorAll(sel){ return lfFinde(el, sel); },
    get children(){ return el.kinder.filter(x => x && typeof x === "object" && x.tag); },
    set textContent(v){ el._text = String(v); el.kinder = []; },
    get textContent(){ return el.kinder.length ? el.kinder.map(lfText).join("") : el._text; },
  };
  return el;
}
function lfText(k){ return k == null ? "" : typeof k === "string" ? k : (k.textContent || ""); }
function lfKlassen(el){ return String(el.className || (el.attrs && el.attrs.class) || "").split(/\s+/).filter(Boolean); }
function lfPasst(el, sel){
  const s = String(sel).trim();
  if (!s.startsWith(".")) return el.tag === s;
  const ks = s.match(/\.[\w-]+/g) || [];
  return ks.length > 0 && ks.every(k => lfKlassen(el).includes(k.slice(1)));
}
function lfFinde(el, sel){ const t = []; const lauf = k => { for (const x of k.kinder || []) if (x && x.tag) { if (lfPasst(x, sel)) t.push(x); lauf(x); } }; lauf(el); return t; }
function lfAlleKnoten(el, raus = []){ for (const x of el.kinder || []) if (x && x.tag) { raus.push(x); lfAlleKnoten(x, raus); } return raus; }

function lfStand(opt = {}){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const dokument = lfKnoten("body");
  const document = {
    body: dokument, documentElement: lfKnoten("html"), activeElement: null,
    createElement: tag => lfKnoten(tag), createElementNS: (ns, tag) => lfKnoten(tag),
    createTextNode: t => ({nodeType: 3, textContent: String(t)}),
    addEventListener(){}, removeEventListener(){},
    querySelector: sel => lfFinde(dokument, sel)[0] || null,
    querySelectorAll: sel => lfFinde(dokument, sel),
  };
  const leitfaden = opt.leitfaden === undefined ? {
    stand: () => opt.stand || {pruefung: false, fortschritt: 0.5, aktuell: "messen",
      schritte: [
        {id: "auftrag", titel: "Auftrag verstehen", status: "erledigt", impuls: ""},
        {id: "lage", titel: "Lage ansehen", status: "erledigt", impuls: ""},
        {id: "hypothese", titel: "Hypothese stellen", status: "erledigt", impuls: ""},
        {id: "messen", titel: "Messen", status: "aktuell", impuls: "Miss zuerst den betroffenen Pfad."},
        {id: "eingreifen", titel: "Eingreifen", status: "offen", impuls: ""},
        {id: "dokumentieren", titel: "Dokumentieren", status: "offen", impuls: ""},
      ]},
    naechsterSchritt: () => opt.naechster === undefined ? {id: "eingreifen", titel: "Eingreifen", text: "Ändere genau eine Stelle und prüfe die Wirkung."} : opt.naechster,
  } : opt.leitfaden;
  const Spiel = {aktiveInstanz: () => opt.aktiveInstanz === undefined ? {iid: "i1"} : opt.aktiveInstanz, leitfaden};
  if (opt.ohneEngine) delete Spiel.leitfaden;
  const Bus = {an: (art, fn) => { (Bus.horer ||= []).push({art, fn}); }};
  const bereich = {
    console: {log(){}, error(){}, warn(){}}, document, Bus, Spiel,
    UI: {}, setTimeout: fn => { try { fn(); } catch (e) {} return 0; }, clearTimeout(){},
    requestAnimationFrame: fn => { try { fn(0); } catch (e) {} return 0; },
    store: {get: () => ({}), set(){}}, DATEN: {},
  };
  vm.createContext(bereich);
  const lies = f => fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8");
  vm.runInContext(lies("dom.js"), bereich, {filename: "ui/dom.js"});
  vm.runInContext(lies("labor-aktionen.js"), bereich, {filename: "ui/labor-aktionen.js"});
  vm.runInContext(lies("leitfaden.js"), bereich, {filename: "ui/leitfaden.js"});
  const UI = vm.runInContext("UI", bereich);
  return {UI, dokument, leitfaden: UI.leitfaden, Spiel};
}

if (!LF_LADEN) {
  pruefe("Leitfaden: nur unter node tests/run.js prüfbar", () => { erwarte.wahr(false, "require fehlt"); });
} else gruppe("UI: Analyse-Leitfaden-Panel (3.1.0 B3/2)", () => {

  pruefe("Ohne laufenden Auftrag bzw. ohne Engine: kein Panel (kein Absturz)", () => {
    const ohneTicket = lfStand({aktiveInstanz: null});
    erwarte.gleich(ohneTicket.leitfaden.panel(), null, "ohne Auftrag kein Panel");
    const ohneEngine = lfStand({ohneEngine: true});
    erwarte.gleich(ohneEngine.leitfaden.panel(), null, "ohne Spiel.leitfaden kein Panel");
  });

  pruefe("Panel zeigt Fortschritt, sechs Schritte mit Status, Impuls und „Nächster Schritt“", () => {
    const s = lfStand();
    const panel = s.leitfaden.panel();
    erwarte.wahr(!!panel, "das Panel steht");
    erwarte.wahr(lfKlassen(panel).includes("lf-panel"), "aside.lf-panel");
    erwarte.gleich(panel.tag, "aside", "Panel ist ein aside");
    const kopf = lfFinde(panel, ".lf-kopf")[0];
    erwarte.wahr(!!kopf, "Kopf steht");
    const ring = lfFinde(panel, ".lf-ring")[0];
    erwarte.wahr(!!ring, "Fortschrittsring steht");
    erwarte.gleich(ring.style.getPropertyValue("--p"), "0.5", "Ring-Anteil 0.5 (Token --p)");
    erwarte.enthaelt(lfText(lfFinde(panel, ".lf-ring-wert")[0]), "50 %", "Ring nennt 50 %");
    erwarte.enthaelt(lfText(lfFinde(panel, ".lf-kicker")[0]), "Analyse-Leitfaden", "Kopf nennt den Leitfaden");
    const schritte = lfFinde(panel, ".lf-schritt");
    erwarte.gleich(schritte.length, 6, "genau sechs Schritte");
    erwarte.gleich(schritte.map(x => lfKlassen(x).includes("ok") ? "ok" : lfKlassen(x).includes("jetzt") ? "jetzt" : "offen"),
      ["ok", "ok", "ok", "jetzt", "offen", "offen"], "Status: drei erledigt, einer aktuell, zwei offen");
    erwarte.gleich(lfFinde(panel, ".lf-status").length, 6, "je Schritt ein Statuspunkt");
    const impulse = lfFinde(panel, ".lf-impuls");
    erwarte.gleich(impulse.length, 1, "genau EIN Impuls-Absatz (kein Duplikat)");
    erwarte.enthaelt(lfText(impulse[0]), "Miss zuerst den betroffenen Pfad.", "Impuls-Text unverändert");
    erwarte.gleich(lfFinde(panel, "small").length, 0, "kein Impuls-Duplikat in der Schrittliste (P2 r-didaktik)");
    /* Kernaktionsliste: NUR Text (Name + kbd), ausgeführt über das ⋯-Menü „Aktionen". */
    const aktionen = lfFinde(panel, ".lf-aktion");
    erwarte.gleich(aktionen.length, 5, "fünf Kernaktionen in der Textliste");
    for (const a of aktionen) erwarte.wahr((a.kinder || []).some(x => x.tag === "b"), "Aktion trägt einen Namen");
    const kuerzel = lfFinde(panel, "kbd").map(k => lfText(k).trim());
    erwarte.gleich(kuerzel, ["C", "P", "I"], "nur die REAL belegten Kürzel (Konsole C, Ping P, Inspektor I)");
    erwarte.falsch(kuerzel.includes("A") || kuerzel.includes("⏎"), "kein falsches Kürzel „A“/„⏎“ (B-02)")
    erwarte.enthaelt(lfText(lfFinde(panel, ".lf-naechster")[0]), "Nächster Schritt: Ändere genau eine Stelle", "Nächster Schritt als Text");
  });

  pruefe("NUR TEXT: keine Knöpfe/Wähler/Fokusziele im Panel (R12 bleibt unverändert)", () => {
    const s = lfStand();
    const panel = s.leitfaden.panel();
    const interaktiv = lfAlleKnoten(panel).filter(el => ["button", "input", "select", "textarea", "a"].includes(el.tag));
    erwarte.gleich(interaktiv.length, 0, "kein Bedienelement im Panel");
    erwarte.gleich(lfFinde(panel, "input").length + lfFinde(panel, "button").length, 0, "auch keine versteckten Wähler");
    erwarte.falsch(!!lfFinde(panel, "[role=button]").length, "keine role=button-Elemente");
  });

  pruefe("Prüfungsmodus: neutraler Hinweis, keine Impulse, keine Schritte, kein „Nächster Schritt“", () => {
    const s = lfStand({stand: {pruefung: true, fortschritt: 0, aktuell: null, schritte: []}, naechster: null});
    const panel = s.leitfaden.panel();
    erwarte.wahr(!!panel, "Panel bleibt sichtbar (nur Text)");
    erwarte.enthaelt(lfText(panel), "Prüfungsmodus", "neutraler Hinweis nennt den Prüfungsmodus");
    erwarte.enthaelt(lfText(panel), "keine Impulse", "und sagt, dass es keine Impulse gibt");
    erwarte.gleich(lfFinde(panel, ".lf-schritte").length, 0, "keine Schrittliste im Prüfungsmodus");
    const impulsBox = lfFinde(panel, ".lf-impuls")[0];
    erwarte.wahr(!!impulsBox, "der neutrale Hinweis nutzt die Hinweisfläche");
    erwarte.falsch(lfText(impulsBox).includes("Miss "), "kein Schritt-Impuls im Prüfungsmodus");
    erwarte.falsch(lfText(panel).includes("Nächster Schritt"), "kein „Nächster Schritt“ in der Prüfung");
  });

  pruefe("aktualisieren() füllt ein gemountetes Panel live neu (ohne Neuzeichnen der Ansicht)", () => {
    const s = lfStand();
    const alt = s.leitfaden.panel();
    s.dokument.append(alt);
    erwarte.gleich(lfFinde(s.dokument, ".lf-panel").length, 1, "ein Panel ist gemountet");
    s.Spiel.leitfaden = {
      stand: () => ({pruefung: false, fortschritt: 1, aktuell: null, schritte: [
        {id: "auftrag", titel: "Auftrag verstehen", status: "erledigt", impuls: ""},
        {id: "lage", titel: "Lage ansehen", status: "erledigt", impuls: ""},
        {id: "hypothese", titel: "Hypothese stellen", status: "erledigt", impuls: ""},
        {id: "messen", titel: "Messen", status: "erledigt", impuls: ""},
        {id: "eingreifen", titel: "Eingreifen", status: "erledigt", impuls: ""},
        {id: "dokumentieren", titel: "Dokumentieren", status: "erledigt", impuls: ""},
      ]}),
      naechsterSchritt: () => null,
    };
    s.leitfaden.aktualisieren();
    const neu = lfFinde(s.dokument, ".lf-panel")[0];
    erwarte.wahr(!!neu, "das Panel bleibt gemountet");
    erwarte.enthaelt(lfText(lfFinde(neu, ".lf-ring-wert")[0]), "100 %", "Fortschritt ist auf 100 % nachgezogen");
    erwarte.gleich(lfFinde(neu, ".lf-schritt.jetzt").length, 0, "kein aktueller Schritt mehr");
    erwarte.gleich(lfFinde(neu, ".lf-naechster").length, 0, "kein „Nächster Schritt“ mehr");
  });

  pruefe("Defensiv: wirft stand(), bleibt das Panel weg statt die Ansicht zu brechen", () => {
    const s = lfStand({leitfaden: {stand: () => { throw new Error("kaputt"); }, naechsterSchritt: () => null}});
    erwarte.gleich(s.leitfaden.panel(), null, "kein Panel bei kaputter Engine");
  });

});
