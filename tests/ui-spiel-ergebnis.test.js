"use strict";
/* ERGEBNIS KOPIEREN (Fahrplan 1.3/2.0, Schritt 0, zweite Hälfte) – die OBERFLÄCHE.
   Geprüft wird der Knopf im ABSCHLUSSFENSTER (`ergebnisZeigen` in src/ui/spiel.js): er steht im
   Knopfblock, sein Klick ruft `UI.kopieren` mit dem Text aus `Spiel.ergebnisText(inst, erg)` und
   meldet Erfolg wie Fehlschlag als Toast (Muster src/ui/hub.js:122-126).

   Der Fall geht den ECHTEN Weg: ein wirklicher Auftrag wird im Wegwerf-Stand gebaut, gelöst und
   abgenommen (`Spiel.instanzErstellen` → `Spiel.oeffnen` → `Spiel.loesung` → `Spiel.abnahme` →
   `Spiel.abschliessen`), und das ECHTE Ergebnis aus src/spiel/abnahme.js geht an das Fenster.
   Nachgebildet ist nur die Funktionsprobe: sie scheitert im Prüfstand absichtlich SOFORT, denn
   `abnahmeAnfordern` zeigt das Ergebnis danach trotzdem (`finally`) – genau der Zweig, der auch im
   Rauchtest mit echter Probe läuft. Dadurch bleibt der Fall synchron prüfbar: `tests/run.js` wartet
   keine Zusagen ab (gemessen: Mikrotasks laufen dort nie, `process.exit` kommt zuerst).
   Der eigene Bereich wird deshalb mit `microtaskMode: "afterEvaluate"` gebaut – nur so ist der Toast
   nach `await UI.kopieren(...)` überhaupt zu sehen (gemessen mit Node 24.21.0).

   Warum ein eigener Kopf: `tests/run.js` lädt die ui-Schicht nicht von selbst (sie braucht `document`),
   gibt dem Testbereich aber `require` mit. Diese Datei holt src/ui/dom.js und src/ui/spiel.js deshalb
   selbst nach – genau die Dateien, die im Programm laufen. Allein lauffähig:
     node tests/ui-spiel-ergebnis.test.js */

function uesHatRequire(){ try { return typeof require === "function"; } catch (e) { return false; } }
const UES_KANN_LADEN = (() => {
  try { return uesHatRequire() && typeof document === "undefined" && typeof Spiel === "object" && Spiel !== null; }
  catch (e) { return false; }
})();
const UES_ZUSATZ = UES_KANN_LADEN ? "" : " (kein require im Testbereich – nur unter node tests/run.js)";

/* ---------------- Allein lauffähig ----------------
   Dieselbe Ladereihenfolge wie tests/run.js (Bauart von tests/ui-training.test.js). Danach läuft
   dieselbe Datei noch einmal – dann mit Spiel, mit require und mit dem DOM-Ersatz unten. */
function uesAlleinLaden(){
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
  try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "ui-spiel-ergebnis.test.js"}); }
  catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
  const rot = ergebnisse.filter(e => !e.ok);
  for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
  console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
  process.exit(rot.length ? 1 : 0);
}
if (typeof Spiel === "undefined" && typeof document === "undefined" && uesHatRequire()) uesAlleinLaden();

/* ================= DOM-Ersatz (nur für den vm-Bereich) =================
   Gerade so viel DOM, wie die echten Dateien brauchen: h() aus src/ui/dom.js legt Knoten an,
   src/ui/spiel.js baut damit das Ergebnis-Overlay samt Knopfblock. */
function uesKnoten(tag){
  const el = {
    tag, nodeType: 1, kinder: [], attrs: {}, _text: "", _an: {}, hidden: false, dataset: {}, parentNode: null,
    style: {setProperty(){}, removeProperty(){}, getPropertyValue(){ return ""; }},
    append(...k){ for (const x of k) if (x != null && x !== false) { if (x && typeof x === "object") x.parentNode = el; el.kinder.push(x); } },
    replaceChildren(...k){ el.kinder = []; el.append(...k); },
    remove(){ if (el.parentNode) el.parentNode.kinder = el.parentNode.kinder.filter(x => x !== el); },
    setAttribute(k, v){ el.attrs[k] = String(v); if (k.startsWith("data-")) el.dataset[k.slice(5).replace(/-(\w)/g, (x, c) => c.toUpperCase())] = String(v); },
    getAttribute(k){ return k in el.attrs ? el.attrs[k] : null; },
    hasAttribute(k){ return k in el.attrs; },
    removeAttribute(k){ delete el.attrs[k]; if (k === "hidden") el.hidden = false; },
    addEventListener(art, fn){ (el._an[art] ||= []).push(fn); },
    removeEventListener(art, fn){ el._an[art] = (el._an[art] || []).filter(f => f !== fn); },
    /* Klick wie mit der Maus: löst genau den Hörer aus, den h()/addEventListener gesetzt hat */
    klick(){ for (const fn of (el._an.click || []).slice()) fn({currentTarget: el, target: el, preventDefault(){}, stopPropagation(){}}); },
    querySelector(sel){ return uesFinde(el, sel)[0] || null; },
    querySelectorAll(sel){ return uesFinde(el, sel); },
    get className(){ return el.attrs.class || ""; },
    set className(v){ el.attrs.class = String(v); },
    get classList(){
      return {
        add(...k){ const l = uesKlassen(el); for (const x of k) if (!l.includes(x)) l.push(x); el.attrs.class = l.join(" "); },
        remove(...k){ el.attrs.class = uesKlassen(el).filter(x => !k.includes(x)).join(" "); },
        contains: k => uesKlassen(el).includes(k),
        toggle(k, an){ const drin = uesKlassen(el).includes(k), soll = an === undefined ? !drin : !!an; if (soll) el.classList.add(k); else el.classList.remove(k); return soll; },
      };
    },
    set textContent(v){ el._text = String(v); el.kinder = []; },
    get textContent(){ return el.kinder.length ? el.kinder.map(uesText).join("") : el._text; },
    get lastElementChild(){ return el.kinder.filter(k => k && k.tag).slice(-1)[0] || null; },
    get children(){ return el.kinder.filter(k => k && k.tag); },
  };
  return el;
}
function uesKlassen(el){ return String((el && el.attrs && el.attrs.class) || "").split(/\s+/).filter(Boolean); }
function uesText(k){ return k == null ? "" : typeof k === "string" ? k : String(k.textContent == null ? "" : k.textContent); }
function uesPasst(el, sel){
  const s = String(sel).trim();
  if (!el || !el.tag || !s) return false;
  if (/^[a-z][a-z0-9]*$/i.test(s)) return el.tag === s;
  const teile = s.match(/\.[\w-]+|#[\w-]+|\[[^\]]+\]/g) || [];
  return teile.length > 0 && teile.every(t => {
    if (t[0] === ".") return uesKlassen(el).includes(t.slice(1));
    if (t[0] === "#") return el.attrs.id === t.slice(1);
    const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(t);
    if (!m) return false;
    const wert = m[1] === "hidden" ? (el.hidden ? "" : undefined) : (m[1].startsWith("data-") ? el.dataset[m[1].slice(5).replace(/-(\w)/g, (x, c) => c.toUpperCase())] : el.attrs[m[1]]);
    return m[2] === undefined ? wert !== undefined : String(wert) === m[2];
  });
}
/* Selektoren des Spiels: tag, .klasse, #id, [attribut="wert"] – und Kommalisten (`.sp-overlay, .dialog-huelle`). */
function uesFinde(el, sel){
  const treffer = [];
  for (const teil of String(sel).split(",")) {
    const s = teil.trim(); if (!s) continue;
    const lauf = k => { for (const x of (k.kinder || [])) if (x && x.tag) { if (uesPasst(x, s)) treffer.push(x); lauf(x); } };
    lauf(el);
  }
  return treffer;
}
function uesDocument(){
  const koerper = uesKnoten("body");
  return {
    readyState: "complete", body: koerper, documentElement: uesKnoten("html"), activeElement: null,
    createElement: tag => uesKnoten(tag), createElementNS: (ns, tag) => uesKnoten(tag),
    createTextNode: t => ({nodeType: 3, textContent: String(t)}),
    addEventListener(){}, removeEventListener(){},
    getElementById: id => uesFinde(koerper, "#" + id)[0] || null,
    querySelector: sel => uesFinde(koerper, sel)[0] || null,
    querySelectorAll: sel => uesFinde(koerper, sel),
  };
}

/* ================= Prüfstand =================
   Lädt die echten Dateien in einen eigenen Bereich: ui/dom.js (h, UI) und ui/spiel.js (das
   Abschlussfenster). `Spiel` ist eine Ableitung des echten Spiels (Object.create): alles Reale wird
   geerbt, nur die vier Stellen, die den echten Ablauf noch einmal starten würden, sind ersetzt –
   `Spiel.abschliessen` liefert das bereits ECHT berechnete Ergebnis, `Spiel.abnahme` die echte
   Abnahme dazu. So bleibt der echte Spielstand unberührt und das Fenster bekommt echte Daten. */
function uesWelt(){
  const vm = require("vm"), fs = require("fs"), path = require("path");
  const dokument = uesDocument();
  const kopiert = [], toasts = [], ansichten = [];
  const zustand = {kopierOk: true, erg: null, ab: null, form: {art: "buero"}};
  const haken = [];
  const BusLeih = {
    an(name, fn){ const weg = Bus.an(name, fn); haken.push(weg); return weg; },
    aus: (name, fn) => Bus.aus(name, fn),
    senden: (name, daten) => Bus.senden(name, daten),
  };
  const SpielStub = Object.create(Spiel);
  SpielStub.abnahme = () => zustand.ab;
  SpielStub.abschliessen = () => zustand.erg;
  SpielStub.szeneForm = () => zustand.form;
  SpielStub.szene = () => ({});
  const bereich = {
    document: dokument, console: {log(){}, error(){}, warn(){}, info(){}, debug(){}}, LABOR_VERSION: "test",
    Spiel: SpielStub, DATEN, Bus: BusLeih, store, L, eur, zahlDe, heute, datumDe, jetzt,
    Plattform: {name: "browser", abzeichen(){}, an(){}, kann: () => ({ja: false}), fenster: {zeigen(){}}},
    setTimeout: () => 0, clearTimeout(){}, setInterval: () => 0, clearInterval(){},
    requestAnimationFrame: fn => { try { fn(0); } catch (e) {} return 0; },
    performance: {now: () => 0},
  };
  /* `microtaskMode: "afterEvaluate"` lässt die Mikrotasks nach jedem runInContext abfließen –
     ohne das bliebe der Toast hinter `await UI.kopieren(...)` für immer unsichtbar (gemessen). */
  vm.createContext(bereich, {microtaskMode: "afterEvaluate"});
  const lies = rel => fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
  vm.runInContext(lies("src/ui/dom.js"), bereich, {filename: "src/ui/dom.js"});
  /* `const UI = {}` in ui/dom.js ist eine lexikalische Bindung der Skript-Umgebung, keine Eigenschaft
     des Kontext-Objekts: nur der Name `UI` trifft sie (Bauart von tests/spiel-einstieg-stufe.test.js:143-148). */
  const UI = vm.runInContext("UI", bereich);
  if (!UI || typeof UI !== "object") throw new Error("src/ui/dom.js hat kein UI angelegt");
  UI.app = {aktuell: "labor", status(){}, aktualisieren(){}, registrieren(){}, einstellungAbschnitt(){}, dialogOeffnen(){}, dialogZu(){},
    ansicht(n){ UI.app.aktuell = n; ansichten.push(n); }};
  UI.labor = {netz: null, laden(){}, auftragNeu(){}, werkzeug(){}, auffrischen(){}, fern: null, fernwartung(){}};
  UI.ebenen = {fuerSkills: () => null}; UI.blatt = {zeichnen(){}}; UI.wiki = {oeffnen(){}};
  UI.bewegung = () => "aus";                                   /* ohne Zähl-Animation: keine Uhr im Test */
  UI.klang = {spielen(){}}; UI.erklaeren = () => uesKnoten("div"); UI.ereignisse = {vormerken(){}};
  UI.sandbox = null;
  UI.szene = {abspielen: () => { throw new Error("Funktionsprobe im Prüfstand nicht ausgeführt"); }};
  /* Die Zusage muss im BEREICH entstehen: `await` hängt seine Fortsetzung an die Warteschlange der
     Zusage. Eine Zusage aus dem Testbereich flösse dort nie ab (tests/run.js wartet nicht) – der Toast
     bliebe unsichtbar. Mit einer Zusage aus dem Bereich greift `microtaskMode: "afterEvaluate"`. */
  const vmZusage = vm.runInContext("(wert) => Promise.resolve(wert)", bereich);
  UI.kopieren = text => { kopiert.push(text); return vmZusage(zustand.kopierOk); };
  UI.toast = (text, art, opt) => { toasts.push([text, art, opt]); };
  UI.toast.zu = () => {};
  vm.runInContext(lies("src/ui/spiel.js"), bereich, {filename: "src/ui/spiel.js"});
  if (!UI.spiel || typeof UI.spiel !== "object") throw new Error("src/ui/spiel.js hat sich nicht als UI.spiel angemeldet");
  return {
    UI, dokument, kopiert, toasts, ansichten, zustand,
    /* Klick im Bereich auslösen: nur dort fließen die Mikrotasks ab (siehe microtaskMode oben) */
    knopfKlick(text){
      const alle = uesFinde(dokument.body, "button");
      const k = alle.find(b => uesText(b).trim() === text);
      if (!k) throw new Error(`Knopf „${text}“ nicht gefunden. Da sind: ${alle.map(b => uesText(b).trim()).join(" | ")}`);
      bereich.__uesKnopf = k;
      vm.runInContext("globalThis.__uesKnopf.klick();", bereich);
    },
    fensterOeffnen(){ vm.runInContext("UI.spiel.abnahmeAnfordern();", bereich); },
    abmelden(){ for (const weg of haken.splice(0)) { try { weg(); } catch (e) { /* war schon abgemeldet */ } } },
  };
}

/* ================= Gruppe ================= */
gruppe("UI: Ergebnis kopieren" + UES_ZUSATZ, () => {
  if (!UES_KANN_LADEN) {
    pruefe("UI-Ergebnis: nur unter node tests/run.js prüfbar", () => { erwarte.wahr(false, "require fehlt"); });
    return;
  }
  const ueber = welt => uesFinde(welt.dokument.body, ".sp-overlay")[0] || null;
  const offen = welt => { const o = ueber(welt); return !!o && uesKlassen(o).includes("da"); };

  /* Kapsel wie in tests/spiel-*.test.js: eigener Wegwerf-Stand, danach alles zurück (auch der
     geliehene Bus – die geladenen Dateien melden Hörer an, die sonst in fremde Tests feuerten). */
  function uesFenster(fn){
    const welt = uesWelt();
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand();
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      const inst = Spiel.instanzErstellen({ticketId: "salon-05"});
      Spiel._einst.wahl = Spiel.defVon(inst).stufe || "E";          /* wie Spiel.testlauf: das Niveau des Tickets */
      Spiel.oeffnen(inst.iid);
      const def = Spiel.defVon(inst);
      Spiel.loesung(inst.netz, def.loesung);
      Spiel.arbeitszieleErfuellen(inst);
      const ab = Spiel.abnahme(inst);
      const erg = Spiel.abschliessen(inst, ab);
      erwarte.wahr(ab.bestanden === true && erg.bestanden === true, "der Auftrag ist bestanden (sonst prüfte der Fall das falsche Fenster)");
      welt.zustand.ab = ab; welt.zustand.erg = erg;
      welt.UI.spiel._S.inst = inst;                                 /* der Auftrag, den das Fenster abschließt */
      welt.fensterOeffnen();
      const fenster = uesFinde(welt.dokument.body, ".sp-ergebnis")[0];
      erwarte.wahr(!!fenster, "das Abschlussfenster ist aufgeschlagen");
      fn({welt, fenster, inst, def, ab, erg});
    } finally {
      welt.abmelden();
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      if (jetzt && typeof jetzt.frei === "function") jetzt.frei();
    }
  }

  pruefe("Der Knopf „Ergebnis kopieren“ steht im Abschlussfenster, im Knopfblock", () => uesFenster(({fenster}) => {
    const knoepfe = uesFinde(fenster, "button").map(b => uesText(b).trim());
    erwarte.gleich(knoepfe.filter(t => t === "Ergebnis kopieren").length, 1, "genau ein Kopierknopf");
    const block = uesFinde(fenster, ".sp-knoepfe")[0];
    erwarte.wahr(!!block, "der Knopfblock steht da");
    erwarte.wahr(uesFinde(block, "button").some(b => uesText(b).trim() === "Ergebnis kopieren"), "der Kopierknopf sitzt im Knopfblock");
    erwarte.wahr(knoepfe.includes("Übersicht"), "die anderen Wege bleiben");
  }));

  /* Wirkung vor Grün (task-27): `Spiel.ergebnisKurz` hatte KEINEN Aufrufer im Programm — nur Tests
     (Befund der Gegenprüfung task-14). Geprüft wird die Zeile deshalb im ECHTEN Weg: das Fenster wird
     über `abnahmeAnfordern` aufgeschlagen, die Zeile muss darin stehen und genau den Text der echten
     Funktion tragen. */
  pruefe("Die Kurzfassung aus Spiel.ergebnisKurz steht als sichtbare Zeile im Abschlussfenster", () => uesFenster(({fenster, inst, def, erg}) => {
    const kurz = Spiel.ergebnisKurz(erg.inst, erg);
    erwarte.wahr(typeof kurz === "string" && kurz.trim().length > 0, "die echte Funktion liefert eine Zeile");
    erwarte.falsch(kurz.includes("\n"), "und wirklich nur eine Zeile");
    erwarte.gleich(Spiel.ergebnisKurz(erg.inst, erg), kurz, "zweimal aufgerufen: derselbe Text");
    const treffer = uesFinde(fenster, "p").filter(p => uesText(p).trim() === kurz.trim());
    erwarte.gleich(treffer.length, 1, "genau EINE Zeile im Fenster trägt die Kurzfassung");
    /* Sie steht im Kopf des Fensters, unter der Überschrift — nicht in einem versteckten Bereich. */
    const kopf = uesFinde(fenster, ".sp-erg-kopf")[0];
    erwarte.wahr(!!kopf, "der Kopf des Fensters steht da");
    erwarte.wahr(uesFinde(kopf, "p").some(p => uesText(p).trim() === kurz.trim()), "und die Zeile steht darin, unter der Überschrift");
    /* Nichts Neues: Titel und Kunde zeigt das Fenster ohnehin (Dauer und Hilfestufe stehen nur in der
       Kurzfassung — das sind Zahlen dieses Auftrags, keine Lösung). */
    const k = Spiel.kundenDaten(inst.kunde || def.kunde);
    erwarte.enthaelt(kurz, def.titel, "der Auftragstitel steht darin");
    erwarte.enthaelt(kurz, k.name, "und der Kundenname");
    /* Und das Fenster bleibt danach benutzbar: der Kopierknopf hängt an `ergebnisText`, nicht an der Zeile. */
    erwarte.wahr(uesFinde(fenster, "button").some(b => uesText(b).trim() === "Ergebnis kopieren"), "der Kopierknopf ist unberührt");
  }));

  pruefe("Ein Klick kopiert den Klartext aus Spiel.ergebnisText(inst, erg) und meldet Erfolg", () => uesFenster(({welt, inst, def, erg}) => {
    const text = Spiel.ergebnisText(erg.inst, erg);
    erwarte.wahr(typeof text === "string" && text.length > 0, "die echte Funktion liefert Text");
    erwarte.gleich(erg.inst, inst, "das Ergebnis trägt die Instanz");
    welt.knopfKlick("Ergebnis kopieren");
    erwarte.gleich(welt.kopiert.length, 1, "genau ein Kopieraufruf");
    erwarte.gleich(welt.kopiert[0], text, "kopiert wird Spiel.ergebnisText(erg.inst, erg)");
    erwarte.gleich(welt.kopiert[0], Spiel.ergebnisText(inst, erg), "derselbe Text, wenn die Instanz zuerst steht");
    erwarte.enthaelt(welt.kopiert[0], def.titel, "der Auftragstitel steht im kopierten Text");
    erwarte.wahr(welt.kopiert[0].split("\n").length >= 3, "der Text ist mehrzeilig");
    const t = welt.toasts.find(x => x[2] && x[2].id === "kopieren");
    erwarte.wahr(!!t, "es gibt eine Meldung mit id „kopieren“");
    erwarte.gleich(t[1], "ok", "Erfolg wird als ok gemeldet");
    erwarte.enthaelt(String(t[0]), "kopiert", "die Meldung sagt, dass kopiert wurde");
    erwarte.gleich(t[2].dauer, 3000, "Meldung wie in hub.js (3 s sichtbar)");
    erwarte.wahr(offen(welt), "das Fenster bleibt offen");
  }));

  pruefe("Scheitert das Kopieren, kommt die Warnung statt der Erfolgsmeldung", () => uesFenster(({welt, erg}) => {
    welt.zustand.kopierOk = false;
    welt.knopfKlick("Ergebnis kopieren");
    erwarte.gleich(welt.kopiert.length, 1, "UI.kopieren wurde trotzdem gerufen");
    erwarte.gleich(welt.kopiert[0], Spiel.ergebnisText(erg.inst, erg), "mit demselben Text");
    const t = welt.toasts.find(x => x[2] && x[2].id === "kopieren");
    erwarte.wahr(!!t, "es gibt eine Meldung");
    erwarte.gleich(t[1], "warn", "Fehlschlag wird als Warnung gemeldet, nicht als Erfolg");
    erwarte.enthaelt(String(t[0]), "Kopieren ging nicht", "die Meldung sagt, dass es nicht ging");
    erwarte.falsch(String(t[0]).includes("kopiert"), "keine Erfolgsmeldung im Fehlschlag");
    erwarte.wahr(offen(welt), "das Fenster bleibt auch dann offen");
  }));

  /* Auftrag Punkt 2: Der Knopfblock wird VOR `const zu = overlay(...)` gebaut. Gemessen wird, was das
     wirklich bedeutet: ein dort gebauter Klick-Hörer darf `zu` sehr wohl rufen – er liest es erst beim
     Klick, und dann ist es initialisiert (der Nachbar „Übersicht“ tut genau das und funktioniert).
     Der Kopierknopf ruft `zu` trotzdem nicht: das Fenster bleibt zum Lesen offen. */
  pruefe("Der Kopierknopf lässt das Fenster offen – der Nachbar „Übersicht“ schließt es", () => uesFenster(({welt}) => {
    erwarte.wahr(offen(welt), "offen vor dem Klick");
    welt.knopfKlick("Ergebnis kopieren");
    erwarte.wahr(offen(welt), "nach dem Kopieren noch offen");
    welt.knopfKlick("Übersicht");
    erwarte.falsch(offen(welt), "„Übersicht“ (genauso vor `zu` gebaut) schließt das Fenster – `zu` ist erreichbar");
    erwarte.wahr(welt.ansichten.includes("heute"), "und führt zur Übersicht");
  }));

  /* Auftrag Punkt 3: Braucht das Fenster eine Ausnahme für `quelle:"klassenraum"`?
     Gemessen wird die Ursache: wird der Klassenraum-Auftrag in src/spiel/abnahme.js VOR jedem
     Nebeneffekt umgeleitet, entsteht kein `st.erledigt`-Eintrag – und genau den lesen `Spiel.tag.heute()`
     und `Spiel.tag.bilanz()`. Bleibt die Tagesbilanz unberührt, wäre eine Sonderbehandlung an der
     `tagStand`-Zeile des Fensters toter Vorsorge-Code und bleibt deshalb weg.
     Der Fall ist nur angemeldet, solange die Umleitung wirklich da ist (task-2). */
  if (Spiel.klassenraum && typeof Spiel.klassenraum.abnehmen === "function") {
    pruefe("Klassenraum: die Tagesbilanz bleibt unberührt – das Fenster braucht dafür keine Ausnahme", () => {
      const welt = uesWelt();
      const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
      try {
        Spiel._trocken = true; Spiel._lz = {};
        Spiel._st = Spiel.leererStand();
        Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
        const vorher = Spiel.tag.heute().erledigtHeute;
        const inst = Spiel.instanzErstellen({ticketId: "salon-05", quelle: "klassenraum"});
        Spiel._einst.wahl = Spiel.defVon(inst).stufe || "E";
        Spiel.oeffnen(inst.iid);
        const def = Spiel.defVon(inst);
        Spiel.loesung(inst.netz, def.loesung);
        Spiel.arbeitszieleErfuellen(inst);
        const ab = Spiel.abnahme(inst);
        const erg = Spiel.abschliessen(inst, ab);
        erwarte.wahr(erg.bestanden === true, "der Klassenraum-Auftrag ist bestanden");
        erwarte.gleich(Spiel.st.erledigt.length, 0, "kein Eintrag in st.erledigt (die Umleitung greift vorher)");
        erwarte.gleich(Spiel.tag.heute().erledigtHeute, vorher, "erledigtHeute bleibt unverändert");
        erwarte.gleich([erg.euro, erg.ruf], [0, 0], "kein Geld, kein Ruf");
        welt.zustand.ab = ab; welt.zustand.erg = erg;
        welt.UI.spiel._S.inst = inst;
        welt.fensterOeffnen();
        const fenster = uesFinde(welt.dokument.body, ".sp-ergebnis")[0];
        erwarte.wahr(!!fenster, "das Fenster zeigt den Klassenraum-Auftrag");
        erwarte.falsch(uesText(fenster).includes("Tagesziel geschafft"), "keine Tagesziel-Zeile aus der Karriere");
        welt.knopfKlick("Ergebnis kopieren");
        erwarte.gleich(welt.kopiert[0], Spiel.ergebnisText(erg.inst, erg), "der Kopierknopf arbeitet auch hier");
      } finally {
        welt.abmelden();
        Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
        if (jetzt && typeof jetzt.frei === "function") jetzt.frei();
      }
    });
  }
});
