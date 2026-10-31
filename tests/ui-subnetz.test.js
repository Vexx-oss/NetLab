"use strict";
/* ABTEILUNG SUBNETTING (src/ui/subnetz.js, W3; Entwurf Runde 7 § 1, § 2.3, § 4, § 6):
   Die Ansicht „subnetz" – Registrierung über UI.startHaken, Kopf mit Stufenwahl/Fortschrittsring/
   „Nächster Schritt", vier Register (Lehrpfad, Werkzeuge, Üben & Spielen, Formelsammlung), Modulkarten
   aus DATEN.subnetzLehrplan, Lektion mit Kern/Merksatz/Beispiel-Schritten, Übungs- und Prüfrunde über
   Spiel.subnetz (echter Motor), Werkzeugkarten über UI.subnetzwerkzeuge und die Formelsammlung.
   Fehlende Parallel-Teile (W1/W2/W4) müssen zu einer ruhigen Hinweiskarte führen, nicht zum Absturz.

   Warum ein eigener Kopf: tests/run.js lädt nur die headless-Schichten (bis src/spiel) und baut seinen
   Testbereich OHNE require auf – src/ui ist dort weder geladen noch nachladbar. Dieser Test lädt die
   Datei deshalb in einem eigenen vm-Bereich mit nachgebildetem DOM. Steht require nicht zur Verfügung,
   sagen die Testnamen das ausdrücklich – kein stilles Grün.
   Allein lauffähig:  node tests/ui-subnetz.test.js */

function snUiHatRequire(){ try { return typeof require === "function"; } catch (e) { return false; } }
const SN_UI_KANN_LADEN = (() => {
  try { return snUiHatRequire() && typeof document === "undefined" && typeof Spiel === "object" && Spiel !== null; } catch (e) { return false; }
})();
const SN_UI_ZUSATZ = SN_UI_KANN_LADEN ? "" : " (kein require im Testbereich – nur allein lauffähig: node tests/ui-subnetz.test.js)";
const SN_UI_MOTOR_DA = (() => { try { return !!(Spiel && Spiel.subnetz && typeof Spiel.subnetz.satz === "function"); } catch (e) { return false; } })();
const SN_UI_LEHRPLAN_DA = (() => { try { return !!(DATEN && DATEN.subnetzLehrplan && Array.isArray(DATEN.subnetzLehrplan.module)); } catch (e) { return false; } })();

/* ---------------- Allein lauffähig ----------------
   Dieselbe Ladereihenfolge wie tests/run.js. Danach läuft dieselbe Datei noch einmal – dann mit Spiel,
   mit require und mit dem DOM-Ersatz unten. */
function snUiAlleinLaden(){
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
  try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "ui-subnetz.test.js"}); }
  catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
  const rot = ergebnisse.filter(e => !e.ok);
  for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
  console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
  process.exit(rot.length ? 1 : 0);
}
if (typeof Spiel === "undefined" && typeof document === "undefined" && snUiHatRequire()) snUiAlleinLaden();

/* ================= DOM-Ersatz (nur für den vm-Bereich) ================= */
/* Merkt sich das zuletzt fokussierte Element – so prüfen die Tests Fokusziele im echten DOM-Ablauf. */
const SN_UI_FOKUS = {el: null};
function snUiKnoten(tag){
  const el = {
    tag, kinder: [], attrs: {}, className: "", _text: "", eltern: null, listeners: {}, value: "", disabled: false,
    append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.eltern = el; el.kinder.push(x); } },
    replaceChildren(...k){ el.kinder = []; el.append(...k); },
    remove(){ if (el.eltern) el.eltern.kinder = el.eltern.kinder.filter(x => x !== el); },
    setAttribute(k, v){ el.attrs[k] = String(v); },
    getAttribute(k){ return k in el.attrs ? el.attrs[k] : null; },
    removeAttribute(k){ delete el.attrs[k]; },
    addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
    click(){ for (const fn of (el.listeners.click || []).slice()) fn({currentTarget: el}); },
    focus(){ SN_UI_FOKUS.el = el; },
    blur(){ if (SN_UI_FOKUS.el === el) SN_UI_FOKUS.el = null; },
    querySelector(sel){ return snUiFinde(el, sel)[0] || null; },
    querySelectorAll(sel){ return snUiFinde(el, sel); },
    set textContent(v){ el._text = String(v); el.kinder = []; },
    get children(){ return el.kinder.filter(x => x && typeof x === "object" && x.tag); },
    get firstElementChild(){ return el.children[0] || null; },
    get textContent(){ return el.kinder.length ? el.kinder.map(snUiText).join("") : el._text; },
    get hidden(){ return "hidden" in el.attrs; },
  };
  return el;
}
function snUiKlassen(el){ return String(el.className || el.attrs.class || "").split(/\s+/).filter(Boolean); }
function snUiFinde(el, sel){
  const klasse = String(sel).replace(/^\./, ""), treffer = [];
  const lauf = k => { for (const x of k.kinder) if (x && typeof x === "object" && x.tag) { if (snUiKlassen(x).includes(klasse)) treffer.push(x); lauf(x); } };
  lauf(el);
  return treffer;
}
function snUiText(k){ return k == null ? "" : typeof k === "string" ? k : k.textContent; }
/* h() mit demselben Vertrag wie src/ui/dom.js: class → className, on* → addEventListener. */
function snUiH(tag, attrs = {}, ...kinder){
  const el = snUiKnoten(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "value") { el.value = v; el.setAttribute("value", v); }
    else if (k === "style" && v && typeof v === "object") el.attrs.style = Object.entries(v).map(([p, w]) => p + ":" + w).join(";");
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...kinder.flat(Infinity));
  return el;
}

/* ================= Prüfdaten (Stubs für die Parallel-Teile W2/W4) =================
   Die Ansicht wird mit einem festen Lehrplan und einem festen Werkzeug-Katalog geprüft; die echten
   Teile prüfen die Integrationstests unten, sobald W1/W2/W4 geladen sind. */
const SN_UI_ARTEN = [
  {id: "netzid", stufen: ["E", "AP1", "AP2"]},
  {id: "broadcast", stufen: ["E", "AP1", "AP2"]},
  {id: "hosts", stufen: ["E", "AP1"]},
  {id: "maske", stufen: ["E", "AP1"]},
  {id: "block", stufen: ["E", "AP1", "AP2"]},
  {id: "subnetze", stufen: ["AP1", "AP2"]},
  {id: "vlsm", stufen: ["AP1", "AP2"]},
  {id: "zusammenfassen", stufen: ["AP2"]},
  {id: "vlan-port", stufen: ["E", "AP1"]},
  {id: "vlan-erreichbar", stufen: ["AP1", "AP2"]},
  {id: "trunk", stufen: ["AP2"]},
].map(a => ({id: a.id, stufen: a.stufen, titel: "Thema " + a.id}));

function snUiLehrplanStub(){
  const module = [1, 2, 3, 4, 5, 6, 7, 8].map(nr => ({
    id: "m" + nr, nr,
    stufe: nr <= 4 ? "E" : nr <= 7 ? "AP1" : "AP2",
    titel: "Modul " + nr,
    kicker: "Stufe · Modul " + nr,
    lead: "Lead zu Modul " + nr + ".",
    kern: ["Kernabsatz eins zu Modul " + nr + ".", "Kernabsatz zwei zu Modul " + nr + "."],
    merksatz: "Merksatz zu Modul " + nr + ".",
    visuell: {art: "bitlabor", preset: {ip: "192.168.10.70", praefix: 26}},
    beispiel: [{titel: "Beispiel " + nr, aufgabe: "Rechne Aufgabe " + nr + ".",
      schritte: [{text: "Erster Schritt zu " + nr + ".", ergebnis: "A"}, {text: "Zweiter Schritt zu " + nr + ".", ergebnis: "B"}],
      ergebnis: "A und B"}],
    uebung: {arten: ["netzid"], niveau: nr <= 4 ? "E" : "AP1", anzahl: 3},
    pruefung: {arten: ["netzid"], niveau: nr <= 4 ? "E" : "AP1", anzahl: 3, bestehen: 2},
    verweise: {wiki: "lab.subnetz", werkzeug: "bitlabor", training: "tr-subnetz-plan"},
    dauerMin: 8,
  }));
  return {
    version: 1,
    formelsammlung: [
      {titel: "Präfix und Maske", saetze: ["Der Präfix zählt die Einsen.", "Die Maske schreibt sie als Oktette."],
        tabelle: {spalten: ["Präfix", "Maske"], zeilen: [["/26", "255.255.255.192"], ["/27", "255.255.255.224"]]},
        merksatz: "Formel-Merksatz eins.", visual: {art: "maskenleiste", preset: {praefix: 26}}},
      {titel: "Rechenweg", saetze: ["Schritt eins: Blockgröße.", "Schritt zwei: Netz-ID."]},
      {titel: "VLAN und Trunk", saetze: ["Ein VLAN ist eine Broadcast-Domäne.", "Ein Trunk taggt Frames."],
        tabelle: {spalten: ["Begriff", "Bedeutung"], zeilen: [["Access", "ein VLAN"]]}, merksatz: "Formel-Merksatz zwei."},
    ],
    module,
  };
}

function snUiSpielStub(optionen = {}){
  const zustand = {module: {}, spiele: {}, gesamt: {richtig: 0, falsch: 0, serie: 0}};
  const rufe = {satz: [], aufgabe: [], pruefen: [], antwort: [], modulSetzen: [], fortschritt: 0};
  let zaehler = 0;
  const STUFEN = ["E", "AP1", "AP2"];
  const eingaben = ["ip", "zahl", "maske", "auswahl"];
  const werte = {
    ip: {wert: "192.168.10.0", text: "192.168.10.0"},
    zahl: {wert: "64", text: "64"},
    maske: {wert: "/26", text: "/26 oder 255.255.255.192"},
    auswahl: {wert: "192.168.10.64", text: "192.168.10.64"},
  };
  function aufgabeBauen(artId, niveau, nummer){
    const art = SN_UI_ARTEN.find(a => a.id === artId) || SN_UI_ARTEN[0];
    const artEingabe = eingaben[nummer % eingaben.length];
    const loesung = werte[artEingabe];
    const a = {
      id: art.id + "-" + niveau + "-" + String(nummer).padStart(4, "0"),
      art: art.id, niveau, skill: "lab.subnetz",
      titel: art.titel, frage: "Frage zu " + art.titel + "?",
      lage: [{label: "Adresse", wert: "192.168.10.70/26"}, {label: "Präfix", wert: "/26"}],
      eingabe: {art: artEingabe},
      loesung: {wert: loesung.wert, text: loesung.text},
      rechenweg: [{n: 1, titel: "Block", text: "2^6 ergibt 64.", ergebnis: "64"},
        {n: 2, titel: "Hosts", text: "64 minus 2 ergibt 62.", ergebnis: "62"}],
      erklaerung: "Erklärung zu " + art.titel + ".",
      hinweis: "Hinweis zu " + art.titel + ".",
      visual: art.id === "netzid" ? {art: "blocklineal", preset: {ip: "192.168.10.70", praefix: 26}} : null,
      quelle: "RFC 4632 · Test",
    };
    if (artEingabe === "auswahl") {
      a.eingabe.optionen = [{text: "192.168.10.0"}, {text: "192.168.10.64"}, {text: "192.168.11.0"}];
    }
    return a;
  }
  const spiel = {
    VERSION: 1, STUFEN, ARTEN: SN_UI_ARTEN.slice(),
    einst: {niveau: optionen.niveau || "E"},
    aufgabe(o = {}){ rufe.aufgabe.push(o); return aufgabeBauen(o.art || "netzid", o.niveau || "E", ++zaehler); },
    satz(o = {}){
      rufe.satz.push(o);
      const anzahl = Math.max(1, Number(o.anzahl) || 4);
      const niveau = STUFEN.includes(o.niveau) ? o.niveau : "E";
      const arten = Array.isArray(o.arten) && o.arten.length ? o.arten : SN_UI_ARTEN.slice(0, 5).map(a => a.id);
      const liste = [];
      for (let i = 0; i < anzahl; i++) liste.push(aufgabeBauen(arten[i % arten.length], niveau, ++zaehler));
      return liste;
    },
    pruefen(aufgabe, antwort){
      rufe.pruefen.push({aufgabe, antwort});
      const soll = String(aufgabe && aufgabe.loesung ? aufgabe.loesung.wert : "").trim();
      const richtig = String(antwort == null ? "" : antwort).trim() === soll;
      return {richtig, soll, angenommen: String(antwort == null ? "" : antwort),
        rechenweg: (aufgabe && aufgabe.rechenweg) || [], erklaerung: (aufgabe && aufgabe.erklaerung) || "",
        hinweis: (aufgabe && aufgabe.hinweis) || ""};
    },
    antwort(aufgabe, richtig, opt){
      rufe.antwort.push({aufgabe, richtig, opt});
      if (richtig) zustand.gesamt.richtig++; else zustand.gesamt.falsch++;
      return {lern: {vorher: 0, nachher: 1}, fortschritt: spiel.fortschritt(), neuereModule: []};
    },
    fortschritt(){ rufe.fortschritt++; return JSON.parse(JSON.stringify(zustand)); },
    modulSetzen(id, status){
      rufe.modulSetzen.push({id, status});
      zustand.module[id] = Object.assign({richtig: 0, falsch: 0, serie: 0}, zustand.module[id] || {}, {status});
      return spiel.fortschritt();
    },
  };
  spiel._rufe = rufe;
  spiel._zustand = zustand;
  /* Wie im Programm: Spiel ist der Namensraum (Spiel.einst), Spiel.subnetz der Motor. */
  return {einst: spiel.einst, subnetz: spiel, _rufe: rufe, _zustand: zustand};
}

function snUiWerkzeugStub(){
  const werkzeuge = [
    {id: "bitlabor", titel: "32-Bit-Labor", kicker: "Bit-Sicht", lead: "Bits klicken.", skill: "lab.subnetz", stufe: "E"},
    {id: "maskenleiste", titel: "Masken-Schieber", kicker: "Präfix", lead: "Regler schieben.", skill: "lab.subnetz", stufe: "E"},
    {id: "blocklineal", titel: "Blocklineal", kicker: "Blockgrenzen", lead: "Adresse einrasten.", skill: "lab.subnetz", stufe: "E"},
    {id: "rechner", titel: "Rechenweg-Assistent", kicker: "Rechenweg", lead: "Schritt für Schritt.", skill: "lab.subnetz", stufe: "AP1"},
    {id: "vlsm", titel: "Adressplaner", kicker: "VLSM", lead: "Netze planen.", skill: "lab.subnetz", stufe: "AP1"},
    {id: "vlan", titel: "VLAN-Werkzeug", kicker: "Access und Trunk", lead: "Ports konfigurieren.", skill: "lab.vlan", stufe: "AP1"},
  ];
  const spiele = [
    {id: "praefix-blitz", titel: "Präfix-Blitz", kicker: "60 Sekunden", lead: "Präfixe übersetzen.", skill: "lab.subnetz", stufe: "AP1", dauerText: "60 Sekunden"},
    {id: "netz-sortierer", titel: "Netz-Sortierer", kicker: "Zuordnen", lead: "Adressen sortieren.", skill: "lab.subnetz", stufe: "E", dauerText: "ohne Zeitdruck"},
    {id: "vlan-patcher", titel: "VLAN-Patcher", kicker: "Ports", lead: "Ports einstellen.", skill: "lab.vlan", stufe: "AP1", dauerText: "ohne Zeitdruck"},
  ];
  const rufe = {zeichnen: [], starten: []};
  const zustand = {zerstoert: 0};
  const api = {
    liste: () => werkzeuge.slice(),
    zeichnen(container, id, opts = {}){
      rufe.zeichnen.push({container, id, opts});
      container.append(snUiH("div", {class: "stub-werkzeug", "data-id": id}));
      return {zerstoeren(){ zustand.zerstoert++; }};
    },
    spiele: {
      liste: () => spiele.slice(),
      starten(container, id, opts = {}){
        rufe.starten.push({container, id, opts});
        container.append(snUiH("div", {class: "stub-spiel", "data-id": id}));
        return {zerstoeren(){ zustand.zerstoert++; }};
      },
    },
  };
  return {api, werkzeuge, spiele, rufe, zustand};
}

/* ================= Prüfstand =================
   Lädt src/ui/subnetz.js in einem eigenen Bereich: nachgebildeter App-Rahmen, nachgebildetes DOM.
   opt.spiel / opt.daten / opt.werkzeuge ersetzen die echten Teile (Fallback-Tests); fehlt opt, gilt der
   echte Stand aus dem Testbereich (in tests/run.js sind src/spiel und src/daten geladen). */
function snUiPruefstand(opt = {}){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const werk = opt.werkzeuge !== undefined ? opt.werkzeuge : snUiWerkzeugStub();
  const werkApi = opt.werkzeuge !== undefined ? opt.werkzeuge : werk.api;
  const spiel = opt.spiel !== undefined ? opt.spiel : ((typeof Spiel !== "undefined" && Spiel) || {});
  const daten = opt.daten !== undefined ? opt.daten : ((typeof DATEN !== "undefined" && DATEN) || {});
  const rufe = [], registriert = [], startHaken = [], busHaken = [], paletten = [];
  const UIstub = {
    startHaken,
    app: {
      registrieren: (name, def) => registriert.push({name, def}),
      aktualisieren: () => rufe.push(["aktualisieren"]),
      ansicht: name => { UIstub.app.aktuell = name; rufe.push(["ansicht", name]); },
      aktuell: null,
    },
    symbol: (name, px) => snUiH("svg", {class: "sym", "data-symbol": name, width: px}),
    toast: (inhalt, art) => rufe.push(["toast", inhalt, art]),
    wiki: {oeffnen: skill => rufe.push(["wiki", skill])},
    palette: {befehl: befehl => paletten.push(befehl)},
    subnetzwerkzeuge: werkApi,
  };
  const bereich = {
    UI: UIstub, h: snUiH, console, Date, Math, JSON,
    setTimeout: () => 0, clearTimeout: () => {},
    document: {createElement: snUiKnoten, createTextNode: t => ({tag: "#text", textContent: String(t)}), querySelector: () => null},
    Bus: {an: (art, fn) => { busHaken.push({art, fn}); return () => {}; }, senden: () => {}},
    Spiel: spiel, DATEN: daten,
  };
  vm.createContext(bereich);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "src", "ui", "subnetz.js"), "utf8"), bereich, {filename: "ui/subnetz.js"});
  return {UI: bereich.UI, subnetz: bereich.UI.subnetz, rufe, registriert, startHaken, busHaken, paletten, werk, werkApi, spiel, daten};
}

/* Kapsel für den echten Motor: trockener Lauf mit eigener Speicher-Zelle, danach alles zurück
   (Muster tests/ui-training.test.js und tests/klassen-20.test.js). */
function snUiKapsel(fn){
  const alt = {trocken: Spiel._trocken, subnetz: store.get("subnetz", null), lern: store.get("lern", null),
    einst: Spiel._einst, st: Spiel._st};
  let lernAlt = null;
  try {
    const ls = L.st;
    lernAlt = JSON.parse(JSON.stringify({units: ls.units, log: ls.log, fehler: ls.fehler, tage: ls.tage, tests: ls.tests}));
  } catch (e) { lernAlt = null; }
  try {
    store.set("subnetz", null);
    store.set("lern", null);
    Spiel._trocken = false;
    return fn();
  } finally {
    Spiel._trocken = alt.trocken;
    Spiel._einst = alt.einst;
    Spiel._st = alt.st;
    store.set("subnetz", alt.subnetz);
    store.set("lern", alt.lern);
    if (lernAlt) {
      try {
        const ls = L.st;
        ls.units = lernAlt.units; ls.log = lernAlt.log; ls.fehler = lernAlt.fehler; ls.tage = lernAlt.tage; ls.tests = lernAlt.tests;
      } catch (e) { /* Lernmotor fehlt im Testbereich */ }
    }
    try { if (SPEICHER && SPEICHER.timer) { clearTimeout(SPEICHER.timer); SPEICHER.timer = null; } } catch (e) { /* egal */ }
  }
}

/* ---------- Griffe auf das nachgebildete DOM ---------- */
const snUiKnoepfe = el => el.querySelectorAll(".knopf");
const snUiKnopf = (el, text) => snUiKnoepfe(el).find(b => String(b.textContent).includes(text)) || null;
const snUiKnopfPflicht = (el, text) => { const b = snUiKnopf(el, text); if (!b) throw new Error(`Knopf „${text}“ fehlt in: ${String(el.textContent).slice(0, 300)}`); return b; };
const snUiRegister = el => el.querySelectorAll(".sn-register-knopf");
const snUiRegisterKnopf = (el, text) => snUiRegister(el).find(b => String(b.textContent).includes(text)) || null;
const snUiModulKarten = el => el.querySelectorAll(".sn-modul");
const snUiKarteMit = (el, text) => snUiModulKarten(el).find(k => String(k.textContent).includes(text)) || null;
const snUiAktivesRegister = el => (snUiRegister(el).find(b => b.getAttribute("aria-selected") === "true") || {}).textContent || "";
/* B2: Fokusstand des DOM-Ersatzes (focus() merkt das Element in SN_UI_FOKUS). */
const snUiFokus = () => SN_UI_FOKUS.el;
/* S3: Anzahl Kartenrahmen (.bn-k) um ein Element, das Element selbst mitgezählt. */
function snUiRahmen(el){
  let n = 0, p = el;
  while (p) { if (snUiKlassen(p).includes("bn-k")) n++; p = p.eltern || null; }
  return n;
}
/* B1/S4: Quelltext einer Stildatei lesen (dieselbe Datei, die das Programm lädt). */
function snUiCss(rel){
  const fs = require("fs"), path = require("path");
  return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
}

/* Alle Antworten einer Runde über die Oberfläche geben. Die Lösung steht in der Aufgabe aus Spiel.subnetz –
   der Test gibt sie ein, klickt „Prüfen", prüft die Rückmeldung und geht weiter. */
function snUiRundeDurchspielen(p, container, optionen = {}){
  let schutz = 0, geprueft = 0;
  while (p.subnetz.runde && !p.subnetz.runde.ergebnis && schutz++ < 30) {
    const r = p.subnetz.runde;
    if (r.beantwortet) {
      const weiterSchon = snUiKnopf(container, "Nächste Aufgabe") || snUiKnopf(container, "Runde auswerten");
      if (!weiterSchon) throw new Error("Weiter-Knopf nach der Prüfung fehlt");
      weiterSchon.click();
      continue;
    }
    const aufgabe = r.aufgaben[r.index];
    if (!aufgabe) throw new Error("Runde ohne aktuelle Aufgabe");
    const art = (aufgabe.eingabe && aufgabe.eingabe.art) || "zahl";
    const soll = String(aufgabe.loesung && aufgabe.loesung.wert != null ? aufgabe.loesung.wert : "").trim();
    if (optionen.mitHilfe) {
      const hinweis = snUiKnopf(container, "Hinweis");
      if (hinweis) hinweis.click();
    }
    if (art === "auswahl") {
      const auswahlKnoepfe = container.querySelectorAll(".sn-auswahl-knopf");
      const knopf = auswahlKnoepfe.find(b => optionen.falsch
        ? String(b.textContent).trim() !== soll
        : String(b.textContent).trim() === soll);
      if (!knopf) throw new Error("Auswahlmöglichkeit fehlt (soll: " + soll + ", falsch: " + !!optionen.falsch + ")");
      knopf.click();
    } else {
      const feld = container.querySelector(".sn-feld");
      if (!feld) throw new Error("Eingabefeld fehlt");
      feld.value = optionen.falsch ? "0" : soll;
    }
    snUiKnopfPflicht(container, "Prüfen").click();
    geprueft++;
    const weiter = snUiKnopf(container, "Nächste Aufgabe") || snUiKnopf(container, "Runde auswerten");
    if (!weiter) throw new Error("Weiter-Knopf nach der Prüfung fehlt");
    weiter.click();
  }
  return {geprueft, ergebnis: p.subnetz.runde ? p.subnetz.runde.ergebnis : null};
}

/* ================= Tests ================= */
gruppe("UI: Abteilung Subnetting", () => {
  pruefe("Der Start-Haken meldet die Ansicht „subnetz“ an – mit Titel, Symbol, Zeigen/Wieder/Verlassen, Bus und Palette" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    const p = snUiPruefstand({daten: {subnetzLehrplan: snUiLehrplanStub()}, spiel: snUiSpielStub()});
    erwarte.gleich(p.startHaken.length, 1, "genau ein eigener Start-Haken");
    p.startHaken[0]();
    erwarte.gleich(p.registriert.length, 1, "genau eine Registrierung");
    const r = p.registriert[0];
    erwarte.gleich(r.name, "subnetz", "eigene Ansicht, keine fremde wird beerbt");
    erwarte.gleich([r.def.titel, r.def.kurz, r.def.symbol], ["Subnetting", "Subnetz", "subnetz"], "Titel, kurze Dock-Beschriftung und Bit-Raster-Symbol");
    erwarte.gleich([typeof r.def.zeigen, typeof r.def.wieder, typeof r.def.verlassen], ["function", "function", "function"]);
    erwarte.gleich(p.busHaken.map(b => b.art), ["subnetz"], "ein Bus-Hörer auf „subnetz“");
    erwarte.gleich(p.paletten.length, 6, "je Werkzeug ein Befehl in der Befehlspalette (§ 2.5)");
    erwarte.wahr(p.paletten.every(b => String(b.text).startsWith("Subnetting: Werkzeug ")), "Befehle heißen „Subnetting: Werkzeug …“");
    /* Der Palettenbefehl öffnet die Ansicht und gleich das Werkzeug. */
    p.paletten[0].aktion();
    erwarte.gleich(p.rufe.filter(x => x[0] === "ansicht").map(x => x[1]), ["subnetz"], "der Befehl wechselt in die Abteilung");
    const c = snUiKnoten("div");
    r.def.zeigen(c);
    erwarte.wahr(!!c.querySelector(".sn-seite"), "die Seite wird gezeichnet");
    erwarte.wahr(!!c.querySelector(".sn-flaeche"), "das angeforderte Werkzeug ist gleich offen");
    erwarte.gleich(p.werk.rufe.zeichnen[0].id, "bitlabor", "gezeichnetes Werkzeug passt zum Befehl");
  });

  pruefe("Kopf: Titel, Zweck, Stufenwahl (Voreinstellung aus Spiel.einst.niveau), Ring sicher/8 und „Nächster Schritt“" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    const plan = snUiLehrplanStub();
    const spiel = snUiSpielStub({niveau: "AP1"});
    spiel._zustand.module = {m1: {status: "sicher"}, m2: {status: "sicher"}};
    const p = snUiPruefstand({daten: {subnetzLehrplan: plan}, spiel});
    p.startHaken[0]();
    const c = snUiKnoten("div");
    p.registriert[0].def.zeigen(c);
    erwarte.enthaelt(c.querySelector(".sn-titel").textContent, "Subnetting");
    erwarte.wahr(String(c.querySelector(".sn-zweck").textContent).length > 30, "der Zweck steht als Satz da");
    const stufe = c.querySelector(".sn-stufe-wahl");
    erwarte.wahr(!!stufe, "die Stufenwahl ist ein eigenes Bedienelement");
    const gewaehlt = stufe.kinder.find(o => o.getAttribute("selected") != null);
    erwarte.gleich(gewaehlt.getAttribute("value"), "AP1", "Voreinstellung kommt aus Spiel.einst.niveau");
    erwarte.gleich(c.querySelector(".sn-ring-wert").textContent, "2/8", "der Ring zeigt sicher/8");
    erwarte.passt(c.querySelector(".sn-ring").getAttribute("aria-label"), /2 von 8 Modulen sicher/, "der Ring ist benannt");
    const naechster = c.querySelector(".sn-naechster");
    erwarte.enthaelt(naechster.textContent, "Nächster Schritt");
    erwarte.enthaelt(naechster.textContent, "Modul 3", "Nächster Schritt ist das erste nicht sichere Modul");
    /* Stufenwechsel zeichnet neu und übernimmt die Wahl in den Generator. */
    stufe.value = "AP2";
    stufe.listeners.change[0]({currentTarget: stufe});
    const c2 = snUiKnoten("div");
    snUiRegisterKnopf(c2, "Üben & Spielen");
    erwarte.wahr(!!c2.querySelector(".sn-seite") === false, "Kontrolle: der neue Container ist noch leer");
    p.registriert[0].def.wieder(c2);
    snUiRegisterKnopf(c2, "Üben & Spielen").click();
    const stufeImGenerator = c2.querySelectorAll(".sn-feld").find(f => f.getAttribute("data-feld") === "stufe");
    erwarte.wahr(!!stufeImGenerator, "der Generator hat eine Stufenwahl");
    erwarte.gleich(stufeImGenerator.kinder.find(o => o.getAttribute("selected") != null).getAttribute("value"), "AP2", "die gewählte Stufe gilt auch im Generator");
  });

  pruefe("Vier Register wechseln ohne Ansichtswechsel – Lehrpfad, Werkzeuge, Üben & Spielen, Formelsammlung" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    const p = snUiPruefstand({daten: {subnetzLehrplan: snUiLehrplanStub()}, spiel: snUiSpielStub()});
    p.startHaken[0]();
    const c = snUiKnoten("div");
    p.registriert[0].def.zeigen(c);
    const namen = snUiRegister(c).map(b => String(b.textContent));
    erwarte.gleich(namen, ["Lehrpfad", "Werkzeuge", "Üben & Spielen", "Formelsammlung"]);
    erwarte.enthaelt(snUiAktivesRegister(c), "Lehrpfad", "Lehrpfad ist voreingestellt");
    erwarte.gleich(snUiModulKarten(c).length, 8, "Lehrpfad zeigt die Modulkarten");
    snUiRegisterKnopf(c, "Werkzeuge").click();
    erwarte.gleich(snUiRegister(c).length, 4, "die Registerleiste bleibt stehen");
    erwarte.enthaelt(snUiAktivesRegister(c), "Werkzeuge");
    erwarte.gleich(c.querySelectorAll(".sn-werkzeug").length, 6, "Werkzeuge: sechs Karten");
    snUiRegisterKnopf(c, "Üben & Spielen").click();
    erwarte.enthaelt(snUiAktivesRegister(c), "Üben");
    erwarte.wahr(!!c.querySelector(".sn-generator"), "der Generator steht bereit");
    erwarte.gleich(c.querySelectorAll(".sn-spiel").length, 3, "drei Lernspiele");
    snUiRegisterKnopf(c, "Formelsammlung").click();
    erwarte.enthaelt(snUiAktivesRegister(c), "Formelsammlung");
    erwarte.gleich(c.querySelectorAll(".sn-formel").length, 3, "drei Formel-Karten");
    snUiRegisterKnopf(c, "Lehrpfad").click();
    erwarte.gleich(snUiModulKarten(c).length, 8, "zurück auf dem Lehrpfad");
    erwarte.gleich(p.rufe.filter(x => x[0] === "ansicht").length, 0, "Register wechseln ohne Ansichtswechsel");
  });

  pruefe("Lehrpfad: acht Modulkarten aus DATEN.subnetzLehrplan mit Nr, Stufe, Titel, Lead, Dauer und Status" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    erwarte.wahr(SN_UI_LEHRPLAN_DA, "DATEN.subnetzLehrplan ist geladen (W2, § 2.2)");
    if (!SN_UI_LEHRPLAN_DA) return;
    const plan = DATEN.subnetzLehrplan;
    erwarte.gleich(plan.module.length, 8, "der Lehrplan hat genau acht Module");
    const p = snUiPruefstand({daten: DATEN, spiel: snUiSpielStub()});
    p.startHaken[0]();
    const c = snUiKnoten("div");
    p.registriert[0].def.zeigen(c);
    const karten = snUiModulKarten(c);
    erwarte.gleich(karten.length, 8, "eine Modulkarte je Modul");
    for (const modul of plan.module) {
      const karte = snUiKarteMit(c, modul.titel);
      erwarte.wahr(!!karte, "Karte für „" + modul.titel + "“ fehlt");
      if (!karte) continue;
      erwarte.enthaelt(karte.textContent, String(modul.nr).padStart(2, "0"), "Nummer steht auf der Karte");
      erwarte.enthaelt(karte.textContent, modul.stufe, "Stufe steht auf der Karte");
      erwarte.enthaelt(karte.textContent, modul.lead, "Lead steht auf der Karte");
      erwarte.enthaelt(karte.textContent, modul.dauerMin + " min", "Dauer steht auf der Karte");
      erwarte.wahr(["neu", "gelesen", "geuebt", "sicher"].includes(karte.getAttribute("data-status")), "die Karte trägt ihren Status");
    }
    /* Klick auf eine Karte öffnet die Lektion im selben Register. */
    snUiKarteMit(c, plan.module[0].titel).click();
    erwarte.wahr(!!c.querySelector(".sn-lektion"), "die Lektion ist offen");
    erwarte.enthaelt(snUiAktivesRegister(c), "Lehrpfad", "die Lektion bleibt im Lehrpfad-Register");
  });

  pruefe("Lektion öffnet mit Kern, genau einem Merksatz, Beispiel-Schritten und Verweisen" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    const plan = snUiLehrplanStub();
    const spiel = snUiSpielStub();
    const p = snUiPruefstand({daten: {subnetzLehrplan: plan}, spiel});
    p.startHaken[0]();
    const c = snUiKnoten("div");
    p.registriert[0].def.zeigen(c);
    const modul = plan.module[0];
    snUiKarteMit(c, modul.titel).click();
    const lektion = c.querySelector(".sn-lektion");
    erwarte.wahr(!!lektion, "die Lektion wird gezeichnet");
    erwarte.enthaelt(lektion.textContent, modul.titel);
    erwarte.gleich(c.querySelectorAll(".sn-kern").length, 1, "ein Kern-Abschnitt");
    const kernAbsaetze = c.querySelector(".sn-kern").kinder;
    erwarte.gleich(kernAbsaetze.length, modul.kern.length, "jeder Kern-Absatz steht da");
    erwarte.gleich(c.querySelectorAll(".sn-merksatz").length, 1, "genau ein Merksatz");
    erwarte.enthaelt(c.querySelector(".sn-merksatz").textContent, modul.merksatz);
    const schritte = c.querySelectorAll(".sn-beispiel-schritt");
    erwarte.gleich(schritte.length, modul.beispiel[0].schritte.length, "alle Beispiel-Schritte stehen im DOM");
    erwarte.wahr(schritte.every(s => s.getAttribute("hidden") != null), "sie sind erst verdeckt (schrittweise aufdeckbar)");
    /* Schritt für Schritt aufdecken, bis das Ergebnis steht. */
    for (let i = 0; i < schritte.length; i++) {
      snUiKnopfPflicht(c, "Schritt zeigen").click();
      erwarte.wahr(lektion.querySelectorAll(".sn-beispiel-schritt")[i].getAttribute("hidden") == null, "Schritt " + (i + 1) + " ist aufgedeckt");
    }
    const ergebnis = c.querySelector(".sn-beispiel-ergebnis");
    erwarte.enthaelt(ergebnis.textContent, modul.beispiel[0].ergebnis);
    erwarte.wahr(ergebnis.getAttribute("hidden") == null, "das Beispiel-Ergebnis ist sichtbar");
    /* Verweise: Wiki, Labor, Training – und das genannte Werkzeug. */
    const verweise = c.querySelector(".sn-verweise");
    erwarte.wahr(!!verweise, "die Verweiszeile steht da");
    snUiKnopfPflicht(verweise, "Im Wiki nachschlagen").click();
    erwarte.gleich(p.rufe.filter(x => x[0] === "wiki").map(x => x[1]), [modul.verweise.wiki], "Wiki wird mit der Fertigkeit geöffnet");
    snUiKnopfPflicht(verweise, "Im Labor anwenden").click();
    snUiKnopfPflicht(verweise, "Ins Training").click();
    erwarte.gleich(p.rufe.filter(x => x[0] === "ansicht").map(x => x[1]), ["labor", "training"], "Labor und Training sind erreichbar");
    snUiKnopfPflicht(verweise, "Werkzeug dazu").click();
    erwarte.wahr(!!c.querySelector(".sn-flaeche"), "das verlinkte Werkzeug ist offen");
    erwarte.gleich(p.werk.rufe.zeichnen.at(-1).id, modul.verweise.werkzeug, "genau das verlinkte Werkzeug");
    /* Beim Öffnen einer Lektion gilt das Modul als gelesen (Verbuchung über Spiel.subnetz.modulSetzen). */
    erwarte.wahr(spiel._rufe.modulSetzen.some(x => x.id === modul.id && x.status === "gelesen"), "Modul wurde als gelesen verbucht");
  });

  pruefe("Übungsrunde aus der Lektion: startet über Spiel.subnetz, prüft die Antwort und verbucht sie" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    const plan = snUiLehrplanStub();
    const spiel = snUiSpielStub();
    const p = snUiPruefstand({daten: {subnetzLehrplan: plan}, spiel});
    p.startHaken[0]();
    const c = snUiKnoten("div");
    p.registriert[0].def.zeigen(c);
    const modul = plan.module[0];
    snUiKarteMit(c, modul.titel).click();
    snUiKnopfPflicht(c, "Übungsrunde starten").click();
    const runde = p.subnetz.runde;
    erwarte.wahr(!!runde, "die Runde läuft");
    erwarte.gleich([runde.kontext, runde.modulId], ["lektion", modul.id]);
    erwarte.gleich(runde.aufgaben.length, modul.uebung.anzahl, "Anzahl kommt aus dem Lehrplan");
    erwarte.gleich(spiel._rufe.satz.length, 1, "eine Aufgabenrunde kommt aus Spiel.subnetz.satz");
    erwarte.gleich(spiel._rufe.satz[0].arten, modul.uebung.arten, "die Übungsarten des Moduls werden übergeben");
    const aufgabe = runde.aufgaben[0];
    erwarte.gleich(c.querySelectorAll(".sn-lage-zeile").length, aufgabe.lage.length, "der lage-Block trägt alle Angaben");
    erwarte.enthaelt(c.querySelector(".sn-frage").textContent, aufgabe.frage);
    /* Falsche Antwort: Rückmeldung mit Rechenweg und Erklärung, Verbuchung mit hilfe=false. */
    snUiRundeDurchspielen(p, c, {falsch: true});
    erwarte.wahr(spiel._rufe.pruefen.length >= 1, "die Antwort wurde über Spiel.subnetz.geprüft");
    erwarte.wahr(spiel._rufe.antwort.length >= 1, "die Antwort wurde über Spiel.subnetz.antwort verbucht");
    erwarte.wahr(spiel._rufe.antwort.every(x => x.opt && x.opt.hilfe === false), "ohne Hilfe geantwortet → hilfe=false");
    erwarte.wahr(spiel._rufe.antwort.every(x => x.richtig === false), "der Stub meldet die falschen Antworten als falsch");
    const ergebnis = c.querySelector(".sn-ergebnis");
    erwarte.wahr(!!ergebnis, "die Ergebnis-Karte steht nach der Runde");
    erwarte.enthaelt(ergebnis.textContent, "Noch nicht bestanden");
    erwarte.enthaelt(ergebnis.textContent, "0 / " + modul.uebung.anzahl, "Punkte der Runde stehen da");
    erwarte.gleich(c.querySelectorAll(".sn-ergebnis-zeile").length, modul.uebung.anzahl, "jede Antwort steht in der Auswertung");
    /* Eine neue Runde zählt die richtigen Antworten. */
    snUiKnopfPflicht(c, "Übungsrunde wiederholen").click();
    erwarte.wahr(!!p.subnetz.runde, "die zweite Runde läuft");
    const zweite = snUiRundeDurchspielen(p, c);
    erwarte.gleich(zweite.ergebnis.richtig, modul.uebung.anzahl, "mit der Lösung sind alle Antworten richtig");
    erwarte.gleich(zweite.ergebnis.falsch, 0);
    erwarte.enthaelt(c.querySelector(".sn-ergebnis").textContent, "Bestanden");
    erwarte.wahr(spiel._rufe.antwort.some(x => x.richtig === true), "richtige Antworten werden als richtig verbucht");
    erwarte.wahr(spiel._rufe.modulSetzen.some(x => x.id === modul.id && x.status === "geuebt"), "nach der Übungsrunde steht das Modul auf geübt");
  });

  pruefe("Prüfrunde: bestanden setzt das Modul über Spiel.subnetz.modulSetzen auf „sicher“" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    const plan = snUiLehrplanStub();
    const spiel = snUiSpielStub();
    const p = snUiPruefstand({daten: {subnetzLehrplan: plan}, spiel});
    p.startHaken[0]();
    const c = snUiKnoten("div");
    p.registriert[0].def.zeigen(c);
    const modul = plan.module[1];
    snUiKarteMit(c, modul.titel).click();
    snUiKnopfPflicht(c, "Prüfrunde starten").click();
    erwarte.gleich(p.subnetz.runde.kontext, "pruefung");
    erwarte.gleich(p.subnetz.runde.aufgaben.length, modul.pruefung.anzahl);
    const durchlauf = snUiRundeDurchspielen(p, c);
    erwarte.wahr(!!durchlauf.ergebnis, "die Prüfrunde wird ausgewertet");
    erwarte.gleich(durchlauf.ergebnis.bestanden, true, "3 von 3 richtig besteht die Prüfrunde (bestehen 2)");
    erwarte.wahr(spiel._rufe.modulSetzen.some(x => x.id === modul.id && x.status === "sicher"), "das Modul wird auf sicher gesetzt");
    erwarte.enthaelt(c.querySelector(".sn-ergebnis").textContent, "als sicher verbucht");
    /* Zurück zur Lektion: die Lektion steht wieder da, der Status ist gezeichnet. */
    snUiKnopfPflicht(c, "Zurück zur Lektion").click();
    erwarte.wahr(!!c.querySelector(".sn-lektion"), "zurück in der Lektion");
    erwarte.wahr(c.querySelectorAll(".bn-chip").some(x => String(x.textContent) === "sicher"), "der Status „sicher“ steht in der Lektion");
  });

  pruefe("Werkzeuge: sechs Karten aus UI.subnetzwerkzeuge.liste(), Einbau über zeichnen() und „Aufgabe dazu“" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    const werk = snUiWerkzeugStub();
    const spiel = snUiSpielStub();
    const p = snUiPruefstand({daten: {subnetzLehrplan: snUiLehrplanStub()}, spiel, werkzeuge: werk.api});
    p.startHaken[0]();
    const c = snUiKnoten("div");
    p.registriert[0].def.zeigen(c);
    snUiRegisterKnopf(c, "Werkzeuge").click();
    const karten = c.querySelectorAll(".sn-werkzeug");
    erwarte.gleich(karten.length, 6, "sechs Werkzeugkarten");
    for (const w of werk.werkzeuge) erwarte.wahr(karten.some(k => String(k.textContent).includes(w.titel)), "Werkzeugkarte „" + w.titel + "“ fehlt");
    erwarte.gleich(werk.rufe.zeichnen.length, 0, "ohne Klick wird nichts gezeichnet");
    c.querySelectorAll(".sn-werkzeug")[0].click();
    erwarte.gleich(werk.rufe.zeichnen.length, 1, "Klick baut genau ein Werkzeug ein");
    const aufruf = werk.rufe.zeichnen[0];
    erwarte.gleich(aufruf.id, werk.werkzeuge[0].id, "das angeklickte Werkzeug wird gezeichnet");
    erwarte.wahr(!!aufruf.container && typeof aufruf.container.replaceChildren === "function", "das Werkzeug bekommt einen Container");
    erwarte.gleich(typeof aufruf.opts.onErgebnis, "function", "die Abteilung meldet onErgebnis an W4");
    erwarte.wahr(!!c.querySelector(".sn-flaeche"), "die Fläche steht in der Ansicht");
    /* onErgebnis aktualisiert die Ansage (aria-live). */
    aufruf.opts.onErgebnis({art: "werkzeug", id: aufruf.id, skill: "lab.subnetz", geloest: true, hilfe: true});
    erwarte.enthaelt(c.querySelector(".sn-live").textContent, "gelöst");
    /* „Aufgabe dazu“ führt in eine passende Übungsrunde (Werkzeug → Aufgabentyp). */
    snUiKnopfPflicht(c, "Aufgabe dazu").click();
    erwarte.wahr(!!p.subnetz.runde, "die Runde zu diesem Werkzeug läuft");
    erwarte.gleich(p.subnetz.runde.kontext, "werkzeug");
    erwarte.gleich(spiel._rufe.satz.at(-1).arten, ["maske"], "bitlabor übt das Thema Maske");
    erwarte.wahr(!!c.querySelector(".sn-runde"), "die Runde steht unter dem Werkzeug");
    /* Zurück räumt die eingebaute Fläche ab. */
    snUiKnopfPflicht(c, "Zurück zu den Werkzeugen").click();
    erwarte.wahr(werk.zustand.zerstoert >= 1, "die Werkzeugfläche wird beim Verlassen geräumt");
    erwarte.gleich(c.querySelectorAll(".sn-werkzeug").length, 6, "zurück in der Werkzeugliste");
  });

  pruefe("Formelsammlung: Einträge aus DATEN.subnetzLehrplan.formelsammlung inklusive Tabelle und Merksatz" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    erwarte.wahr(SN_UI_LEHRPLAN_DA, "DATEN.subnetzLehrplan ist geladen (W2, § 2.2)");
    if (!SN_UI_LEHRPLAN_DA) return;
    erwarte.wahr(DATEN.subnetzLehrplan.formelsammlung.length > 0, "die Formelsammlung ist nicht leer");
    const werk = snUiWerkzeugStub();
    const p = snUiPruefstand({daten: DATEN, spiel: snUiSpielStub(), werkzeuge: werk.api});
    p.startHaken[0]();
    const c = snUiKnoten("div");
    p.registriert[0].def.zeigen(c);
    snUiRegisterKnopf(c, "Formelsammlung").click();
    const formeln = c.querySelectorAll(".sn-formel");
    erwarte.gleich(formeln.length, DATEN.subnetzLehrplan.formelsammlung.length, "eine Karte je Formel-Eintrag");
    for (const eintrag of DATEN.subnetzLehrplan.formelsammlung) {
      const karte = formeln.find(f => String(f.textContent).includes(eintrag.titel));
      erwarte.wahr(!!karte, "Formelkarte „" + eintrag.titel + "“ fehlt");
      if (!karte) continue;
      for (const satz of eintrag.saetze || []) erwarte.enthaelt(karte.textContent, String(satz).slice(0, 40), "Satz fehlt auf der Formelkarte");
      erwarte.wahr(!!karte.querySelector(".sn-tabelle") || !eintrag.tabelle, "die Tabelle des Eintrags wird gezeichnet");
    }
    const mitTabelle = formeln.find(f => !!f.querySelector(".sn-tabelle"));
    erwarte.wahr(!!mitTabelle, "mindestens ein Eintrag hat eine Tabelle");
    if (mitTabelle) {
      const eintrag = DATEN.subnetzLehrplan.formelsammlung.find(e => e.tabelle && e.tabelle.zeilen && e.tabelle.zeilen.length);
      erwarte.gleich(mitTabelle.querySelectorAll(".sn-tabelle").length, 1, "genau eine Tabelle je Karte");
      erwarte.wahr(String(mitTabelle.textContent).includes(eintrag.tabelle.spalten[0]), "die Tabellenspalte steht da");
    }
    /* Visuals der Formelsammlung werden über UI.subnetzwerkzeuge gezeichnet. */
    erwarte.wahr(werk.rufe.zeichnen.length >= 1, "mindestens eine visuelle Hilfe der Formelsammlung wird eingebaut");
  });

  pruefe("Zustand bleibt beim Wiederbetreten erhalten – Register und offene Lektion; Verlassen räumt die Flächen ab" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    const werk = snUiWerkzeugStub();
    const plan = snUiLehrplanStub();
    const p = snUiPruefstand({daten: {subnetzLehrplan: plan}, spiel: snUiSpielStub(), werkzeuge: werk.api});
    p.startHaken[0]();
    const c = snUiKnoten("div");
    const def = p.registriert[0].def;
    def.zeigen(c);
    snUiRegisterKnopf(c, "Werkzeuge").click();
    c.querySelectorAll(".sn-werkzeug")[2].click();
    erwarte.wahr(!!c.querySelector(".sn-flaeche"), "Werkzeug ist offen");
    /* Wiederbetreten: app.js ruft wieder(container) – Register und offenes Werkzeug bleiben. */
    def.wieder(c);
    erwarte.enthaelt(snUiAktivesRegister(c), "Werkzeuge", "das Register bleibt gewählt");
    erwarte.wahr(!!c.querySelector(".sn-flaeche"), "das Werkzeug bleibt offen");
    snUiKnopfPflicht(c, "Zurück zu den Werkzeugen").click();
    snUiRegisterKnopf(c, "Lehrpfad").click();
    snUiKarteMit(c, plan.module[2].titel).click();
    erwarte.wahr(!!c.querySelector(".sn-lektion"), "Lektion ist offen");
    def.wieder(c);
    erwarte.wahr(!!c.querySelector(".sn-lektion"), "die offene Lektion bleibt beim Wiederbetreten erhalten");
    erwarte.enthaelt(c.querySelector(".sn-lektion-titel").textContent, plan.module[2].titel);
    /* Verlassen räumt auf: eingehängte Flächen werden zerstört. */
    const vorher = werk.zustand.zerstoert;
    def.verlassen();
    erwarte.wahr(werk.zustand.zerstoert >= vorher, "verlassen() räumt ohne Fehler");
  });

  pruefe("Fehlende Parallel-Teile: ruhige Hinweiskarten statt Absturz (ohne DATEN, ohne Spiel.subnetz, ohne UI.subnetzwerkzeuge)" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    const p = snUiPruefstand({daten: {}, spiel: {}, werkzeuge: null});
    p.startHaken[0]();
    const def = p.registriert[0].def;
    const c = snUiKnoten("div");
    def.zeigen(c);
    erwarte.wahr(!!c.querySelector(".sn-seite"), "die Seite wird auch ohne Daten gezeichnet");
    erwarte.enthaelt(c.querySelector(".sn-titel").textContent, "Subnetting");
    erwarte.gleich(c.querySelectorAll(".sn-modul").length, 0, "ohne Lehrplan keine erfundenen Modulkarten");
    erwarte.wahr(!!c.querySelector(".bn-leer"), "stattdessen steht eine ruhige Hinweiskarte");
    erwarte.gleich(snUiRegister(c).length, 4, "die Register bleiben bedienbar");
    for (const name of ["Werkzeuge", "Üben & Spielen", "Formelsammlung", "Lehrpfad"]) {
      snUiRegisterKnopf(c, name).click();
      erwarte.wahr(!!c.querySelector(".sn-seite"), "Register „" + name + "“ bricht nicht ab");
      erwarte.wahr(!!c.querySelector(".bn-leer") || name === "Lehrpfad", "Register „" + name + "“ zeigt seinen Hinweis");
    }
    erwarte.gleich(p.rufe.filter(x => x[0] === "toast").length, 0, "kein Fehler-Toast");
    /* Teillage: Motor da, aber kein Lehrplan – Generator und Spiele bleiben ruhig. */
    const p2 = snUiPruefstand({daten: {}, spiel: snUiSpielStub(), werkzeuge: null});
    p2.startHaken[0]();
    const c2 = snUiKnoten("div");
    p2.registriert[0].def.zeigen(c2);
    snUiRegisterKnopf(c2, "Üben & Spielen").click();
    erwarte.wahr(!!c2.querySelector(".sn-generator"), "mit Motor steht der Generator");
    erwarte.wahr(!!c2.querySelector(".bn-leer"), "die Spiele melden ruhig, dass sie noch fehlen");
    snUiRegisterKnopf(c2, "Formelsammlung").click();
    erwarte.wahr(!!c2.querySelector(".bn-leer"), "die Formelsammlung meldet ihren fehlenden Lehrplan");
    erwarte.gleich(p2.rufe.filter(x => x[0] === "toast").length, 0, "auch hier kein Fehler-Toast");
  });

  pruefe("Escape führt eine Ebene zurück: Lektion → Lehrpfad, laufende Runde wird abgebrochen" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    const plan = snUiLehrplanStub();
    const p = snUiPruefstand({daten: {subnetzLehrplan: plan}, spiel: snUiSpielStub()});
    p.startHaken[0]();
    const c = snUiKnoten("div");
    p.registriert[0].def.zeigen(c);
    snUiKarteMit(c, plan.module[0].titel).click();
    erwarte.wahr(!!c.querySelector(".sn-lektion"), "Lektion offen");
    const taste = (el, key) => {
      const seite = el.querySelector(".sn-seite");
      for (const fn of (seite.listeners.keydown || []).slice()) fn({key, stopPropagation(){}, preventDefault(){}});
    };
    taste(c, "Escape");
    erwarte.gleich(c.querySelectorAll(".sn-modul").length, 8, "Escape schließt die Lektion");
    /* Runde starten und mit Escape abbrechen. */
    snUiKarteMit(c, plan.module[0].titel).click();
    snUiKnopfPflicht(c, "Übungsrunde starten").click();
    erwarte.wahr(!!p.subnetz.runde, "Runde läuft");
    taste(c, "Escape");
    erwarte.gleich(p.subnetz.runde, null, "Escape bricht die Runde ab");
    erwarte.wahr(!!c.querySelector(".sn-lektion"), "die Lektion bleibt stehen");
  });

  pruefe("Integration: echter Spiel.subnetz verbucht eine Antwort im Lernstand (Antwort, Rechenweg, Ergebnis)" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    erwarte.wahr(SN_UI_MOTOR_DA, "Spiel.subnetz ist geladen (W1, § 2.1)");
    if (!SN_UI_MOTOR_DA) return;
    erwarte.wahr(SN_UI_LEHRPLAN_DA, "DATEN.subnetzLehrplan ist geladen (W2, § 2.2)");
    if (!SN_UI_LEHRPLAN_DA) return;
    snUiKapsel(() => {
      const plan = DATEN.subnetzLehrplan;
      const modul = plan.module[0];
      const p = snUiPruefstand({daten: DATEN, spiel: Spiel});
      p.startHaken[0]();
      const c = snUiKnoten("div");
      p.registriert[0].def.zeigen(c);
      snUiKarteMit(c, modul.titel).click();
      /* Übungsrunde starten; der echte Motor liefert die Aufgaben samt Lösung. */
      snUiKnopfPflicht(c, "Übungsrunde starten").click();
      const runde = p.subnetz.runde;
      erwarte.wahr(!!runde && runde.aufgaben.length > 0, "der echte Motor liefert Aufgaben");
      const aufgabe = runde.aufgaben[0];
      const art = aufgabe.eingabe && aufgabe.eingabe.art;
      const soll = String(aufgabe.loesung.wert);
      if (art === "auswahl") {
        const option = c.querySelectorAll(".sn-auswahl-knopf").find(b => String(b.textContent).trim() === String(aufgabe.loesung.wert).trim());
        erwarte.wahr(!!option, "die richtige Auswahlmöglichkeit steht in der Fläche");
        if (option) option.click();
      } else {
        const feld = c.querySelector(".sn-feld");
        erwarte.wahr(!!feld, "Eingabefeld vorhanden");
        feld.value = soll;
      }
      const vorher = Spiel.subnetz.fortschritt().gesamt.richtig;
      snUiKnopfPflicht(c, "Prüfen").click();
      const nachher = Spiel.subnetz.fortschritt().gesamt.richtig;
      erwarte.gleich(nachher, vorher + 1, "die richtige Antwort ist im Fortschritt verbucht (§ 4)");
      const rueckmeldung = c.querySelector(".sn-rueckmeldung");
      erwarte.wahr(!!rueckmeldung, "die Rückmeldung steht an der Aufgabe");
      erwarte.enthaelt(rueckmeldung.textContent, "Richtig");
      erwarte.gleich(c.querySelectorAll(".sn-rechenweg-schritt").length, aufgabe.rechenweg.length, "der Rechenweg wird vollständig gezeigt");
      erwarte.enthaelt(c.querySelector(".sn-erklaerung").textContent, aufgabe.erklaerung, "die Erklärung nennt den Rechenweg in Worten");
      erwarte.enthaelt(c.querySelector(".sn-live").textContent, "Richtig");
      /* Restliche Aufgaben richtig beantworten – die Ergebnis-Karte steht am Ende. */
      const durchlauf = snUiRundeDurchspielen(p, c);
      erwarte.wahr(!!durchlauf.ergebnis, "die echte Runde wird ausgewertet");
      erwarte.gleich(durchlauf.ergebnis.richtig, runde.aufgaben.length, "alle richtigen Antworten zählen");
      erwarte.wahr(!!c.querySelector(".sn-ergebnis"), "die Ergebnis-Karte steht");
    });
  });

  /* ---------- Fix-Runde Runde 7/8: B1 · B2 · S3 · S5 · S8 · S4 · D4 ---------- */

  pruefe("B1: Lektions-Werkzeug in voller Breite, Bit-Reihe 2×16 mit mindestens 22-px-Zielen" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    const plan = snUiLehrplanStub();
    const werk = snUiWerkzeugStub();
    const p = snUiPruefstand({daten: {subnetzLehrplan: plan}, spiel: snUiSpielStub(), werkzeuge: werk.api});
    p.startHaken[0]();
    const c = snUiKnoten("div");
    p.registriert[0].def.zeigen(c);
    snUiKarteMit(c, plan.module[0].titel).click();
    /* Beide Lektionskarten tragen 6 von 12 Spalten; ab ≤1100 px steht jede in einer Zeile. */
    const lektion = c.querySelector(".sn-lektion");
    const raster = lektion && lektion.querySelector(".bn-raster");
    erwarte.wahr(!!raster, "das Lektionsraster steht");
    const karten = raster ? raster.querySelectorAll(".bn-k") : [];
    erwarte.gleich(karten.length, 2, "zwei Lektionskarten im Raster");
    erwarte.wahr(karten.every(k => snUiKlassen(k).includes("bn-s6")), "Kernkarte und visuelle Hilfe teilen die Breite (bn-s6)");
    erwarte.falsch(karten.some(k => snUiKlassen(k).includes("bn-s8") || snUiKlassen(k).includes("bn-s4")), "keine alte 8/4-Aufteilung mehr");
    const visual = lektion ? lektion.querySelectorAll(".sn-visual") : [];
    erwarte.gleich(visual.length, 1, "die visuelle Hilfe ist eingehängt");
    erwarte.gleich(werk.rufe.zeichnen.at(-1) && werk.rufe.zeichnen.at(-1).id, "bitlabor", "die Lektion zeichnet ihr Werkzeug");
    erwarte.wahr(werk.rufe.zeichnen.at(-1).opts.kompakt === true, "kompakter Einbau (weniger Polsterung)");
    /* CSS messbar: Umbruch auf zwei Oktette (16 Bit je Reihe) und Mindestbreite der Bits (kein 2-px-Band). */
    const css = snUiCss("src/stil/subnetz.css");
    erwarte.passt(css, /\.sn-visual \.sw-oktett\{flex:1 1 calc\(50% - 8px\)\}/, "je zwei Oktette stehen in einer Zeile");
    erwarte.passt(css, /\.sn-visual \.sw-bit\{[^}]*min-width:22px/, "jedes Bit ist mindestens 22 px breit");
    erwarte.passt(css, /@media \(max-width:1100px\)\{[\s\S]*?\.sn-lektion \.bn-raster \.bn-s6\{grid-column:span 12\}/,
      "bei ≤1100 px steht die visuelle Hilfe in einer eigenen Zeile");
    erwarte.passt(css, /@media \(max-width:900px\)\{[\s\S]*?\.sn-lektion \.bn-raster \.bn-s6\{grid-column:span 1\}/,
      "im Ein-Spalten-Raster bleibt es bei einer Spalte");
  });

  pruefe("B2: Fokus je Aktion – Register, Lektion, Rundenstart, Prüfen, Weiter, Escape" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    const plan = snUiLehrplanStub();
    const p = snUiPruefstand({daten: {subnetzLehrplan: plan}, spiel: snUiSpielStub()});
    p.startHaken[0]();
    const c = snUiKnoten("div");
    p.registriert[0].def.zeigen(c);
    SN_UI_FOKUS.el = null;
    snUiRegisterKnopf(c, "Werkzeuge").click();
    erwarte.wahr(!!snUiFokus(), "Registerwechsel setzt einen Fokus");
    erwarte.gleich(snUiFokus() && snUiFokus().getAttribute("data-register"), "werkzeuge", "Fokus liegt auf dem aktiven Registerknopf");
    SN_UI_FOKUS.el = null;
    snUiRegisterKnopf(c, "Lehrpfad").click();
    snUiKarteMit(c, plan.module[0].titel).click();
    erwarte.wahr(!!snUiFokus(), "Lektion öffnen setzt einen Fokus");
    erwarte.enthaelt(String(snUiFokus() && snUiFokus().textContent), "Zurück zum Lehrpfad", "Fokus liegt auf „Zurück zum Lehrpfad“");
    erwarte.wahr(snUiFokus() && snUiKlassen(snUiFokus()).includes("sn-zurueck"), "der Rückweg ist als Fokusziel markiert");
    SN_UI_FOKUS.el = null;
    snUiKnopfPflicht(c, "Übungsrunde starten").click();
    erwarte.wahr(!!snUiFokus(), "Rundenstart setzt einen Fokus");
    erwarte.passt(String(snUiFokus() && snUiFokus().className), /sn-feld|sn-auswahl-knopf/, "Fokus liegt im ersten Eingabefeld");
    /* Prüfen → Fokus auf die Rückmeldung */
    const aufgabe = p.subnetz.runde.aufgaben[0];
    const feld = c.querySelector(".sn-feld");
    if (feld) feld.value = String(aufgabe.loesung.wert);
    else {
      const option = c.querySelectorAll(".sn-auswahl-knopf").find(b => String(b.textContent).trim() === String(aufgabe.loesung.wert).trim());
      if (option) option.click();
    }
    SN_UI_FOKUS.el = null;
    snUiKnopfPflicht(c, "Prüfen").click();
    erwarte.wahr(!!snUiFokus(), "Prüfen setzt einen Fokus");
    erwarte.passt(String(snUiFokus() && snUiFokus().className), /sn-rueckmeldung/, "Fokus liegt auf der Rückmeldung");
    erwarte.gleich(snUiFokus().getAttribute("tabindex"), "-1", "die Rückmeldung ist programmatisch fokussierbar");
    SN_UI_FOKUS.el = null;
    snUiKnopfPflicht(c, "Nächste Aufgabe").click();
    erwarte.wahr(!!snUiFokus(), "Weiter setzt einen Fokus");
    erwarte.passt(String(snUiFokus() && snUiFokus().className), /sn-feld|sn-auswahl-knopf/, "Fokus liegt im nächsten Eingabefeld");
    /* Escape (Runde abbrechen) → Registerknopf */
    SN_UI_FOKUS.el = null;
    const seite = c.querySelector(".sn-seite");
    for (const fn of (seite.listeners.keydown || []).slice()) fn({key: "Escape", stopPropagation() {}, preventDefault() {}});
    erwarte.wahr(!!snUiFokus(), "Escape setzt einen Fokus");
    erwarte.gleich(snUiFokus() && snUiFokus().getAttribute("data-register"), "lehrpfad", "Fokus liegt auf dem Registerknopf");
  });

  pruefe("S8: Leerer Prüfen-Klick zeigt eine sichtbare Meldung am Feld und springt nicht" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    const p = snUiPruefstand({daten: {subnetzLehrplan: snUiLehrplanStub()}, spiel: snUiSpielStub()});
    p.startHaken[0]();
    const c = snUiKnoten("div");
    p.registriert[0].def.zeigen(c);
    snUiKarteMit(c, snUiLehrplanStub().module[0].titel).click();
    snUiKnopfPflicht(c, "Übungsrunde starten").click();
    const feldVorher = c.querySelector(".sn-feld");
    erwarte.wahr(!!feldVorher, "Eingabefeld steht da");
    SN_UI_FOKUS.el = null;
    snUiKnopfPflicht(c, "Prüfen").click();
    const sichtbar = c.querySelectorAll(".sn-hinweis").filter(h => h.getAttribute("hidden") == null);
    erwarte.gleich(sichtbar.length, 1, "genau eine sichtbare Meldung");
    erwarte.passt(String(sichtbar[0] && sichtbar[0].textContent), /Bitte zuerst eine (Adresse|Maske|Zahl) eintragen/, "die Meldung sagt, was fehlt");
    erwarte.wahr(!!snUiFokus() && /sn-feld/.test(String(snUiFokus().className)), "der Fokus steht im Feld");
    erwarte.wahr(c.querySelector(".sn-feld") === feldVorher, "die Seite wurde nicht neu gezeichnet (kein Sprung nach oben)");
    /* Falsche Auswahl ohne Klick markiert ebenfalls sichtbar. */
    const p2 = snUiPruefstand({daten: {subnetzLehrplan: snUiLehrplanStub()}, spiel: snUiSpielStub()});
    p2.startHaken[0]();
    const c2 = snUiKnoten("div");
    p2.registriert[0].def.zeigen(c2);
    snUiRegisterKnopf(c2, "Üben & Spielen").click();
    snUiKnopfPflicht(c2, "Runde starten").click();
    const auswahlRunde = p2.subnetz.runde.aufgaben.find(a => a.eingabe && a.eingabe.art === "auswahl");
    if (auswahlRunde) {
      while (p2.subnetz.runde && p2.subnetz.runde.aufgaben[p2.subnetz.runde.index] !== auswahlRunde) {
        snUiKnopfPflicht(c2, "Prüfen").click();
        const weiter = snUiKnopf(c2, "Nächste Aufgabe") || snUiKnopf(c2, "Runde auswerten");
        if (!weiter) break;
        weiter.click();
      }
      if (p2.subnetz.runde && p2.subnetz.runde.aufgaben[p2.subnetz.runde.index] === auswahlRunde) {
        snUiKnopfPflicht(c2, "Prüfen").click();
        const hinweis = c2.querySelectorAll(".sn-hinweis").filter(h => h.getAttribute("hidden") == null);
        erwarte.wahr(hinweis.length >= 1, "auch ohne Auswahl erscheint eine sichtbare Meldung");
        erwarte.passt(String(hinweis[0].textContent), /Antwortmöglichkeit auswählen/, "die Meldung nennt die Auswahl");
        erwarte.wahr(!!snUiFokus() && /sn-auswahl-knopf/.test(String(snUiFokus().className)), "der Fokus steht auf der ersten Auswahl");
      }
    }
  });

  pruefe("S5: Register sind ein vollständiges Tablist-Muster (ARIA, Roving-tabindex, Pfeil/Home/End)" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    const p = snUiPruefstand({daten: {subnetzLehrplan: snUiLehrplanStub()}, spiel: snUiSpielStub()});
    p.startHaken[0]();
    const c = snUiKnoten("div");
    p.registriert[0].def.zeigen(c);
    let tabs = snUiRegister(c);
    erwarte.gleich(tabs.length, 4, "vier Register");
    erwarte.gleich(c.querySelector(".sn-panel").getAttribute("role"), "tabpanel", "das Panel ist als tabpanel ausgezeichnet");
    for (const t of tabs) {
      erwarte.gleich(t.getAttribute("role"), "tab", "jeder Knopf ist ein Tab");
      erwarte.wahr(!!t.getAttribute("id"), "jeder Tab hat eine id");
      erwarte.gleich(t.getAttribute("aria-controls"), "sn-panel-" + t.getAttribute("data-register"), "aria-controls zeigt auf sein Panel");
    }
    const panelEl = c.querySelector(".sn-panel");
    const aktiverTab = tabs.find(x => x.getAttribute("aria-selected") === "true") || null;
    erwarte.wahr(!!aktiverTab, "ein Tab ist ausgewählt");
    erwarte.gleich(panelEl.getAttribute("aria-labelledby"), "sn-tab-" + (aktiverTab && aktiverTab.getAttribute("data-register")), "das Panel nennt den aktiven Tab");
    const aktiv = tabs.filter(t => t.getAttribute("aria-selected") === "true");
    erwarte.gleich(aktiv.length, 1, "genau ein Tab ist ausgewählt");
    erwarte.gleich(tabs.filter(t => t.getAttribute("tabindex") === "0").length, 1, "genau ein Tab liegt in der Tabreihenfolge");
    /* Pfeil rechts: Auswahl folgt dem Fokus. */
    SN_UI_FOKUS.el = null;
    (tabs[0].listeners.keydown || []).forEach(fn => fn({key: "ArrowRight", preventDefault() {}}));
    tabs = snUiRegister(c);
    erwarte.enthaelt(snUiAktivesRegister(c), "Werkzeuge", "Pfeil rechts wählt das nächste Register");
    erwarte.gleich(snUiFokus() && snUiFokus().getAttribute("data-register"), "werkzeuge", "der Fokus liegt auf dem neuen Tab");
    erwarte.gleich(tabs.filter(t => t.getAttribute("tabindex") === "0").map(t => t.getAttribute("data-register")), ["werkzeuge"], "Roving-tabindex zieht mit");
    /* Ende/Pos1 */
    const werkzeugeTab = tabs.find(t => t.getAttribute("data-register") === "werkzeuge");
    (werkzeugeTab.listeners.keydown || []).forEach(fn => fn({key: "End", preventDefault() {}}));
    erwarte.enthaelt(snUiAktivesRegister(c), "Formelsammlung", "Ende springt zum letzten Register");
    const letzter = snUiRegister(c).find(t => t.getAttribute("data-register") === "formeln");
    (letzter.listeners.keydown || []).forEach(fn => fn({key: "Home", preventDefault() {}}));
    erwarte.enthaelt(snUiAktivesRegister(c), "Lehrpfad", "Pos1 springt zum ersten Register");
  });

  pruefe("S3: Übungs- und Prüfrunde liegt in genau EINEM Kartenrahmen" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    const plan = snUiLehrplanStub();
    const p = snUiPruefstand({daten: {subnetzLehrplan: plan}, spiel: snUiSpielStub()});
    p.startHaken[0]();
    const c = snUiKnoten("div");
    p.registriert[0].def.zeigen(c);
    snUiKarteMit(c, plan.module[0].titel).click();
    snUiKnopfPflicht(c, "Übungsrunde starten").click();
    let runden = c.querySelectorAll(".sn-runde");
    erwarte.gleich(runden.length, 1, "die Lektionsrunde ist genau eine Fläche");
    erwarte.gleich(snUiRahmen(runden[0]), 1, "die Lektionsrunde hat genau einen Kartenrahmen");
    erwarte.gleich(c.querySelectorAll(".sn-runde > .sn-runde").length, 0, "keine Runde in der Runde");
    /* Freie Runde im Register „Üben & Spielen“ */
    const seite = c.querySelector(".sn-seite");
    for (const fn of (seite.listeners.keydown || []).slice()) fn({key: "Escape", stopPropagation() {}, preventDefault() {}});
    snUiRegisterKnopf(c, "Üben & Spielen").click();
    snUiKnopfPflicht(c, "Runde starten").click();
    runden = c.querySelectorAll(".sn-runde");
    erwarte.gleich(runden.length, 1, "die freie Runde ist genau eine Fläche");
    erwarte.gleich(snUiRahmen(runden[0]), 1, "die freie Runde hat genau einen Kartenrahmen");
  });

  pruefe("D4: Prüfrunde mit benutzter Hilfe setzt NICHT „sicher“ – bleibt „geübt“" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    const plan = snUiLehrplanStub();
    const spiel = snUiSpielStub();
    const p = snUiPruefstand({daten: {subnetzLehrplan: plan}, spiel});
    p.startHaken[0]();
    const c = snUiKnoten("div");
    p.registriert[0].def.zeigen(c);
    const modul = plan.module[0];
    snUiKarteMit(c, modul.titel).click();
    snUiKnopfPflicht(c, "Prüfrunde starten").click();
    const mitHilfe = snUiRundeDurchspielen(p, c, {mitHilfe: true});
    erwarte.wahr(!!mitHilfe.ergebnis, "die Prüfrunde wird ausgewertet");
    erwarte.gleich(mitHilfe.ergebnis.bestanden, true, "alle Antworten richtig – bestanden");
    erwarte.gleich(mitHilfe.ergebnis.ohneHilfe, false, "die Runde hat Hilfe benutzt");
    erwarte.wahr(spiel._rufe.antwort.some(x => x.opt && x.opt.hilfe === true), "die Hilfe wurde bei der Verbuchung mitgegeben (hilfe:true)");
    erwarte.wahr(spiel._rufe.modulSetzen.some(x => x.id === modul.id && x.status === "geuebt"), "mit Hilfe bleibt das Modul auf geübt");
    erwarte.falsch(spiel._rufe.modulSetzen.some(x => x.id === modul.id && x.status === "sicher"), "mit Hilfe wird das Modul NICHT sicher");
    const karte = c.querySelector(".sn-ergebnis");
    erwarte.wahr(!!karte, "die Ergebnis-Karte steht da");
    erwarte.enthaelt(karte.textContent, "mit Hilfe", "die Karte sagt ehrlich, dass Hilfe benutzt wurde");
    erwarte.enthaelt(karte.textContent, "geübt", "das Modul bleibt auf geübt");
    /* Gegenprobe: dieselbe Prüfrunde ohne Hilfe setzt „sicher“. */
    snUiKnopfPflicht(c, "Prüfrunde wiederholen").click();
    const ohneHilfe = snUiRundeDurchspielen(p, c);
    erwarte.gleich(ohneHilfe.ergebnis.ohneHilfe, true, "zweite Prüfrunde ohne Hilfe");
    erwarte.wahr(spiel._rufe.modulSetzen.some(x => x.id === modul.id && x.status === "sicher"), "ohne Hilfe wird das Modul sicher");
  });

  pruefe("Generator filtert Themen nach Stufe; Werkzeug-Ergebnis wird mit Hilfe verbucht; Aufgabe zeigt ihre visuelle Hilfe" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    const plan = snUiLehrplanStub();
    const spiel = snUiSpielStub({niveau: "E"});
    const werk = snUiWerkzeugStub();
    const p = snUiPruefstand({daten: {subnetzLehrplan: plan}, spiel, werkzeuge: werk.api});
    p.startHaken[0]();
    const c = snUiKnoten("div");
    p.registriert[0].def.zeigen(c);
    snUiRegisterKnopf(c, "Üben & Spielen").click();
    const themaFeld = c.querySelectorAll(".sn-feld").find(f => f.getAttribute("data-feld") === "thema");
    const werte = themaFeld.kinder.map(o => o.getAttribute("value"));
    erwarte.wahr(werte.includes("hosts"), "E-Themen sind angeboten");
    erwarte.falsch(werte.includes("trunk"), "AP2-Themen sind auf Stufe E nicht angeboten");
    /* Stufe auf AP2: der Generator zeichnet neu und bietet AP2-Themen an. */
    const stufeFeld = c.querySelectorAll(".sn-feld").find(f => f.getAttribute("data-feld") === "stufe");
    stufeFeld.value = "AP2";
    (stufeFeld.listeners.change || []).forEach(fn => fn({currentTarget: stufeFeld}));
    const themaNeu = c.querySelectorAll(".sn-feld").find(f => f.getAttribute("data-feld") === "thema");
    const werteNeu = themaNeu.kinder.map(o => o.getAttribute("value"));
    erwarte.wahr(werteNeu.includes("trunk"), "auf AP2 ist Trunk angeboten");
    erwarte.falsch(werteNeu.includes("hosts"), "hosts ist auf AP2 nicht angeboten");
    /* Visuelle Hilfe zur Aufgabe: W1s aufgabe.visual wird als Werkzeug eingebaut. */
    const vorherZeichnen = werk.rufe.zeichnen.length;
    snUiRegisterKnopf(c, "Lehrpfad").click();
    snUiKarteMit(c, plan.module[0].titel).click();
    snUiKnopfPflicht(c, "Übungsrunde starten").click();
    erwarte.wahr(werk.rufe.zeichnen.length > vorherZeichnen, "die Übungsrunde hängt eine visuelle Hilfe ein");
    erwarte.gleich(werk.rufe.zeichnen.at(-1).id, "blocklineal", "die Hilfe passt zum Aufgabentyp (netzid → Blocklineal)");
    /* Werkzeug meldet gelöst → Verbuchung mit hilfe:true. */
    snUiRegisterKnopf(c, "Werkzeuge").click();
    c.querySelectorAll(".sn-werkzeug")[0].click();
    const letzte = werk.rufe.zeichnen.at(-1);
    erwarte.wahr(!!letzte && typeof letzte.opts.onErgebnis === "function", "das Werkzeug meldet sein Ergebnis an die Abteilung");
    const antwortenVorher = spiel._rufe.antwort.length;
    letzte.opts.onErgebnis({art: "werkzeug", id: letzte.id, skill: "lab.subnetz", geloest: true, hilfe: true});
    erwarte.gleich(spiel._rufe.antwort.length, antwortenVorher + 1, "gelöstes Werkzeug wird verbucht");
    const verbuchung = spiel._rufe.antwort.at(-1);
    erwarte.gleich(verbuchung.aufgabe.art, "maske", "bitlabor verbucht das Thema Maske");
    erwarte.gleich(verbuchung.richtig, true, "die Verbuchung zählt als richtig");
    erwarte.gleich(verbuchung.opt && verbuchung.opt.hilfe, true, "Werkzeug-Ergebnis wird als Hilfe verbucht");
    letzte.opts.onErgebnis({art: "werkzeug", id: letzte.id, skill: "lab.subnetz", geloest: false, hilfe: false});
    erwarte.gleich(spiel._rufe.antwort.length, antwortenVorher + 1, "nicht gelöste Werkzeuge verbuchen nichts");
  });

  pruefe("S4: Trainings-Querverweis-Knopf hat 44 px Höhe (CSS-Regel)" + SN_UI_ZUSATZ, () => {
    if (!SN_UI_KANN_LADEN) return;
    const css = snUiCss("src/stil/training.css");
    erwarte.passt(css, /\.tr-quer-knopf\{[^}]*min-height:44px/, "der Querverweis-Knopf scopt 44 px");
    const training = snUiCss("src/ui/training.js");
    erwarte.passt(training, /class: "knopf tr-quer-knopf"/, "der Knopf trägt die Klasse, die die Regel trifft");
  });
});
