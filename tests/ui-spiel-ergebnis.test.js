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
    /* Maße nur, wenn der Fall sie setzt (`__rect`): sonst bleibt der Ersatz maßlos wie bisher. */
    getClientRects(){ return el.__rect ? [el.__rect] : []; },
    getBoundingClientRect(){ return el.__rect || {width: 200, height: 40, left: 0, top: 0, right: 200, bottom: 40}; },
    contains(x){ let p = x; while (p) { if (p === el) return true; p = p.parentNode; } return false; },
    focus(){}, blur(){},
    get isConnected(){ let p = el; while (p.parentNode) p = p.parentNode; return !!p.__imBaum; },
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
  koerper.__imBaum = true;                      /* damit `isConnected` stimmt (toast.js fragt es ab) */
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
function uesWelt(opt = {}){
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
    innerWidth: 1366, innerHeight: 768,                 /* wie im gemessenen Rauchtest-Fall (1366 × 768) */
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
  /* Der Labor-Aufbau wird ECHT gefahren: `UI.spiel.oeffnen` ruft `UI.labor.laden(netz, {auftrag})`,
     `auftragNeu` zeichnet die Auftragszeile samt Mappe neu — nur so lässt sich die Auftragsmappe
     (`.am-mappe`) prüfen, statt sie nachzubauen. */
  const labor = {netz: null, fern: null, aufbau: null, zeile: uesKnoten("div"), werkzeug(){}, auffrischen(){}, fernwartung(){},
    laden(netz, o){ labor.netz = netz; labor.aufbau = o || null; labor.zeile = uesKnoten("div"); dokument.body.append(labor.zeile);
      if (labor.aufbau?.auftrag) labor.aufbau.auftrag(labor.zeile); },
    auftragNeu(){ if (labor.aufbau?.auftrag) { labor.zeile.replaceChildren(); labor.aufbau.auftrag(labor.zeile); } }};
  UI.labor = labor;
  UI.symbol = () => uesKnoten("span");
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
  /* `echterToast`: die echte src/ui/toast.js laden (für die Platzierung des Hinweises); sonst die Attrappe. */
  if (opt.echterToast) vm.runInContext(lies("src/ui/toast.js"), bereich, {filename: "src/ui/toast.js"});
  else { UI.toast = (text, art, opt2) => { toasts.push([text, art, opt2]); }; UI.toast.zu = () => {}; }
  /* `UI.klassenraum.hilfeKnopf()` ist die öffentliche Fläche des „Ich hänge"-Knopfes (geprüft in
     tests/ui-klassenraum.test.js, samt Klickweg und ehrlicher Absage). HIER wird nur die VERDRAHTUNG
     geprüft: hängt spiel.js den gelieferten Knopf wirklich in die Mappe — und nur EINEN? Die Attrappe
     gibt deshalb einen MARKIERTEN Knopf zurück, den der Test im DOM wiederfindet. */
  UI.klassenraum = {hilfeKnopf: () => { const b = dokument.createElement("button"); b.className = "knopf kl-hilfe";
    b.textContent = "Ich hänge"; b.setAttribute("data-attrappe", "hilfe"); return b; }};
  vm.runInContext(lies("src/ui/spiel.js"), bereich, {filename: "src/ui/spiel.js"});
  if (!UI.spiel || typeof UI.spiel !== "object") throw new Error("src/ui/spiel.js hat sich nicht als UI.spiel angemeldet");
  return {
    UI, dokument, kopiert, toasts, ansichten, zustand, labor,
    /* Klick im Bereich auslösen: nur dort fließen die Mikrotasks ab (siehe microtaskMode oben) */
    knopfKlick(text){
      const alle = uesFinde(dokument.body, "button");
      const k = alle.find(b => uesText(b).trim() === text);
      if (!k) throw new Error(`Knopf „${text}“ nicht gefunden. Da sind: ${alle.map(b => uesText(b).trim()).join(" | ")}`);
      bereich.__uesKnopf = k;
      vm.runInContext("globalThis.__uesKnopf.klick();", bereich);
    },
    fensterOeffnen(){ vm.runInContext("UI.spiel.abnahmeAnfordern();", bereich); },
    /* Der echte Weg in den Auftrag: `oeffnen` zeichnet die Auftragszeile über `UI.labor.laden`. */
    spielOeffnen(iid){ bereich.__uesIid = iid; vm.runInContext("UI.spiel.oeffnen(globalThis.__uesIid);", bereich); },
    mappeAuf(reiter = "brief"){ bereich.__uesReiter = reiter; vm.runInContext("UI.spiel.mappeAuf(globalThis.__uesReiter);", bereich); },
    /* Postfach aufschlagen — der echte Weg: UI.spiel.postfachAnsicht(container) */
    postfach(container){ bereich.__uesC = container; vm.runInContext("UI.spiel.postfachAnsicht(globalThis.__uesC);", bereich); },
    /* Der Hinweis, wie er in der Führung steht: Titel + Text + Aktion (mit echtem Edge gemessen 89 px hoch) */
    toastZeigen(){ vm.runInContext("UI.toast('Neues Abzeichen – du hast den ersten Auftrag ohne Warnung abgeschlossen und alle Ziele erfüllt.', 'ok', {titel: 'Neues Abzeichen', dauer: 600000, aktion: {text: 'Ansehen', fn(){}}});", bereich); },
    bus(name, daten){ BusLeih.senden(name, daten); },
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

/* ================= Gruppe: Klassenraum im geöffneten Auftrag =================
   Befund (mit echtem Edge gemessen, von `injektoren`): Im geöffneten Auftrag war der Platz nicht
   sichtbar — `src/ui/spiel.js` kannte `inst.klassenraum` nicht. Genau das ist der Klassenraum-Fall:
   ein Code, 20 Geräte, jeder mit seinem Platz. Geprüft wird am ECHTEN Weg: `UI.spiel.oeffnen` baut die
   Auftragszeile über `UI.labor.laden`, `UI.spiel.mappeAuf("brief")` öffnet die Mappe (wie der Knopf
   „Auftrag lesen“). Platz und Netz-Abdruck müssen im Brief stehen — und beim normalen Auftrag NICHT. */
gruppe("UI: Klassenraum-Auftrag im Labor" + UES_ZUSATZ, () => {
  if (!UES_KANN_LADEN) {
    pruefe("UI-Klassenraum: nur unter node tests/run.js prüfbar", () => { erwarte.wahr(false, "require fehlt"); });
    return;
  }
  const KNOEPFE = "button, input, select, textarea, [role=button]";
  /* Kapsel wie in der Gruppe oben; die Welten melden sich am Ende selbst ab. */
  const kapsel = fn => () => {
    const welten = [];
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand();
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn(welten);
    } finally {
      for (const w of welten) w.abmelden();
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      if (jetzt && typeof jetzt.frei === "function") jetzt.frei();
    }
  };
  /* Einen Auftrag öffnen und die Mappe aufschlagen: `quelle` entscheidet Klassenraum oder normal. */
  function karte(quelle, welten){
    const welt = uesWelt(); welten.push(welt);
    const o = {ticketId: "salon-05", seed: 5};
    if (quelle === "klassenraum") o.quelle = "klassenraum";
    const inst = Spiel.instanzErstellen(o);
    if (quelle === "klassenraum") inst.klassenraum = {sitzung: 3, platz: 7, code: "NL-XXXX-XX"};
    Spiel._einst.wahl = Spiel.defVon(inst).stufe || "E";     /* wie Spiel.testlauf: das Niveau des Tickets */
    welt.UI.spiel._S.inst = inst;
    welt.spielOeffnen(inst.iid);
    welt.mappeAuf("brief");
    const mappe = uesFinde(welt.dokument.body, ".am-mappe")[0] || null;
    return {welt, inst, mappe, text: mappe ? uesText(mappe) : "", knoepfe: mappe ? uesFinde(mappe, KNOEPFE).length : -1};
  }

  pruefe("Der geöffnete Klassenraum-Auftrag zeigt Platz und Netz-Abdruck — ein normaler Auftrag nicht", kapsel(welten => {
    const normal = karte("postfach", welten);
    const kl = karte("klassenraum", welten);
    erwarte.wahr(!!normal.mappe, "die Mappe des normalen Auftrags steht im Dokument");
    erwarte.wahr(!!kl.mappe, "die Mappe des Klassenraum-Auftrags steht im Dokument");
    erwarte.gleich(kl.inst.quelle, "klassenraum", "die Quelle der geprüften Instanz ist klassenraum");
    const abdruck = Spiel.klassenraum.netzkennwert(kl.inst.netz);
    erwarte.wahr(typeof abdruck === "string" && abdruck.length === 6, `der Abdruck ist sechs Zeichen (ist ${abdruck})`);
    /* (a) Klassenraum: Platz UND Abdruck im Brief */
    erwarte.enthaelt(kl.text, "Klassenraum-Auftrag", "der Brief nennt den Klassenraum-Auftrag");
    erwarte.enthaelt(kl.text, "Platz 7", "der Platz steht im Brief (der Azubi tippt ihn später in die Ampel)");
    erwarte.enthaelt(kl.text, abdruck, "der Netz-Abdruck steht im Brief (der Vergleich „B und C messen denselben Abdruck“)");
    /* (b) Gegenprobe: der normale Auftrag zeigt nichts davon */
    erwarte.falsch(normal.text.includes("Klassenraum"), "Gegenprobe: kein Klassenraum im Brief");
    erwarte.falsch(normal.text.includes("Platz 7"), "Gegenprobe: kein Platz im Brief");
    erwarte.falsch(normal.text.includes("Netz-Abdruck"), "Gegenprobe: kein Abdruck im Brief");
    /* (c) Seit 09.10.2026 trägt die Zeile GENAU EINEN Knopf: „Ich hänge" (3.0, Säule 5, Weg A) —
       er zeigt den Hilfecode und kopiert ihn beim Klick. Vorher war die Zeile reiner Text; die
       Entscheidung der Leitung setzt die Hilfe in die MAPPE (dort hängt der Azubi), nicht in die
       Ansicht „Auftrag" (die hat ihre eigene Grenze 3, B § 2.2). Die Laboransicht ist keine
       R12-Ansicht — trotzdem bleibt es bei EINEM Bedienelement statt zweien. */
    const hilfe = uesFinde(kl.mappe, KNOEPFE).find(k => uesText(k).includes("Ich hänge")) || null;
    erwarte.wahr(!!hilfe, 'die Mappe des Klassenraum-Auftrags trägt den Knopf „Ich hänge"');
    erwarte.gleich(hilfe && hilfe.getAttribute("data-attrappe"), "hilfe",
      "und es ist GENAU der Knopf aus UI.klassenraum.hilfeKnopf() (die Verdrahtung, nicht ein Nachbau)");
    erwarte.falsch(normal.text.includes("Ich hänge"), "Gegenprobe: der normale Auftrag hat ihn nicht");
    erwarte.wahr(normal.knoepfe > 0, `die Mappe hat Bedienelemente (${normal.knoepfe}) — sonst prüfte der Vergleich nichts`);
    console.log(`MESSUNG Mappe im Labor: Bedienelemente normal=${normal.knoepfe} · Klassenraum=${kl.knoepfe} · Brieftext ${normal.text.length}→${kl.text.length} Zeichen · Abdruck ${abdruck}`);
    erwarte.gleich(kl.knoepfe, normal.knoepfe + 1,
      `Bedienelemente in der Mappe: Klassenraum ${kl.knoepfe}, normal ${normal.knoepfe} — GENAU der eine Hilfeknopf kommt dazu`);
  }));
});

/* ================= Gruppe: Postfach — der Hinweis verdeckt die Hauptaktion nicht =================
   Rauchtest-Befund 09.10.2026: „✗ 1366 px Postfach „Auftrag annehmen ▸" ← Hauptaktion verdeckt von
   toast-titel". Ursache (mit echtem Edge gemessen): Der im LABOR entstandene Hinweis behielt seine
   Labormaße beim Ansichtswechsel (`inset: auto auto 12px 166px; width: 470px` → Rechteck x 166…636)
   und lag damit über dem Knopf (x 539…743, y 690…738). Die längeren Berichte machen den Leser höher,
   die Hauptaktion rutscht in die Zone des Hinweises. Der Hinweis steht deshalb im Postfach über der
   LISTE; die Zahlen unten sind die gemessenen Rechtecke (1366 × 768, langer Bericht `praxis-04`). */
gruppe("UI: Postfach — der Hinweis verdeckt die Hauptaktion nicht" + UES_ZUSATZ, () => {
  if (!UES_KANN_LADEN) {
    pruefe("UI-Postfach: nur unter node tests/run.js prüfbar", () => { erwarte.wahr(false, "require fehlt"); });
    return;
  }
  const LISTE = {left: 98, top: 134, width: 400, height: 616, right: 498, bottom: 750};      /* gemessen */
  const AKTION = {left: 539, top: 690, width: 204, height: 48, right: 743, bottom: 738};      /* gemessen */
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    const welten = [];
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand();
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn(welten);
    } finally {
      for (const w of welten) w.abmelden();
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      if (jetzt && typeof jetzt.frei === "function") jetzt.frei();
    }
  };
  /* Ein Postfach mit einem echten Auftrag aufschlagen und die gemessenen Maße setzen. */
  function postfachMit(lang, welten){
    const welt = uesWelt({echterToast: true}); welten.push(welt);
    const kandidaten = DATEN.tickets.map(d => ({d, n: String(d.symptom || "").length}));
    const ext = lang ? Math.max(...kandidaten.map(k => k.n)) : Math.min(...kandidaten.map(k => k.n));
    const ziel = kandidaten.find(k => k.n === ext);
    const inst = Spiel.instanzErstellen({ticketId: ziel.d.id});
    Spiel._einst.wahl = Spiel.defVon(inst).stufe || "E";
    welt.UI.spiel._S.postfachWahl = inst.iid;
    const c = uesKnoten("div"); welt.dokument.body.append(c);
    welt.postfach(c);
    const liste = uesFinde(welt.dokument.body, ".sp-pf-liste")[0] || null;
    if (liste) liste.__rect = Object.assign({}, LISTE);
    const leser = uesFinde(welt.dokument.body, ".sp-leser")[0] || null;
    const aktion = leser ? uesFinde(leser, ".knopf.primaer")[0] || null : null;
    if (aktion) aktion.__rect = Object.assign({}, AKTION);
    welt.toastZeigen();
    const stapel = uesFinde(welt.dokument.body, ".toast-stapel")[0] || null;
    return {welt, ziel, liste, aktion, stapel, symptom: ext,
      links: stapel ? parseFloat(stapel.style.left) : NaN, breite: stapel ? parseFloat(stapel.style.width) : NaN};
  }

  pruefe("Langer Bericht (längstes echtes Symptom): der Hinweis steht über der Liste, nicht über der Aktion", kapsel(welten => {
    const p = postfachMit(true, welten);
    erwarte.wahr(!!p.liste, "die Auftragsliste steht im Postfach");
    erwarte.wahr(!!p.aktion, "die Hauptaktion steht im Leser");
    erwarte.wahr(p.symptom >= 415, `der längste echte Symptom-Text misst ${p.symptom} Zeichen (keine erfundene Zahl)`);
    erwarte.gleich(p.links, LISTE.left, "der Hinweis beginnt an der Listenspalte");
    erwarte.wahr(p.links + p.breite <= LISTE.right, `der Hinweis endet in der Listenspalte (${p.links + p.breite} ≤ ${LISTE.right})`);
    erwarte.wahr(p.links + p.breite < AKTION.left,
      `waagerecht disjunkt zur Hauptaktion (${p.links + p.breite} < ${AKTION.left}): eine Überdeckung ist damit bei JEDER Hinweishöhe ausgeschlossen`);
    console.log(`MESSUNG Postfach: Symptom ${p.symptom} Zeichen · Hinweis x ${p.links}…${p.links + p.breite} · Aktion x ${AKTION.left}…${AKTION.right}`);
  }));

  pruefe("Gegenprobe: beim kürzesten echten Bericht ebenso wenig verdeckt", kapsel(welten => {
    const p = postfachMit(false, welten);
    erwarte.wahr(!!p.aktion, "die Hauptaktion steht im Leser");
    erwarte.wahr(p.symptom > 0 && p.symptom < 415, `der kürzeste echte Symptom-Text misst ${p.symptom} Zeichen`);
    erwarte.gleich(p.links, LISTE.left, "auch hier beginnt der Hinweis an der Listenspalte");
    erwarte.wahr(p.links + p.breite < AKTION.left, "und bleibt links der Hauptaktion");
  }));

  pruefe("Ein im Labor entstandener Hinweis zieht beim Ansichtswechsel ins Postfach um", kapsel(welten => {
    const welt = uesWelt({echterToast: true}); welten.push(welt);
    /* Labor sichtbar (Leinwand mit Maß) – der Hinweis entsteht dort, wie in der Führung. */
    const leinwand = uesKnoten("div"); leinwand.attrs.class = "lb-leinwand";
    leinwand.__rect = {left: 150, top: 120, width: 800, height: 600, right: 950, bottom: 720};
    welt.dokument.body.append(leinwand);
    welt.toastZeigen();
    const stapel = uesFinde(welt.dokument.body, ".toast-stapel")[0];
    erwarte.gleich(parseFloat(stapel.style.left), 162, "im Labor steht der Hinweis am Rand der Zeichenfläche (150 + 12)");
    /* Ansicht wechseln: Leinwand weg (hidden liefert keine rects), Postfach da. */
    leinwand.__rect = null;
    const c = uesKnoten("div"); welt.dokument.body.append(c);
    welt.postfach(c);
    const liste = uesFinde(welt.dokument.body, ".sp-pf-liste")[0];
    if (liste) liste.__rect = Object.assign({}, LISTE);
    welt.bus("ansicht", "postfach");
    erwarte.gleich(parseFloat(stapel.style.left), LISTE.left,
      "nach dem Ansichtswechsel steht er über der Liste — nicht mehr mit den Laboramaßen über der Aktion");
    erwarte.wahr(parseFloat(stapel.style.left) + parseFloat(stapel.style.width) < AKTION.left, "und damit frei von der Hauptaktion");
  }));
});
