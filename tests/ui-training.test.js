"use strict";
/* TRAININGSANSICHT (src/ui/training.js, Baustein D):
   Die Ansicht „training" – Registrierung über UI.startHaken, Karten je Szenario mit Art, Fertigkeit,
   Minuten, Stand und Quelle, das Gerüst nur für die Stufen, die es hergeben, und die zwei Wege
   Starten/Fortsetzen (UI.spiel.oeffnen) und Abnehmen (Spiel.training.abnehmen) mit sichtbarem Ergebnis.
   Vertrag: docs/entwicklung/Hilfestellung – Stufen und Schnittstellen.md § 2, § 6, § 8.

   Warum ein eigener Kopf: tests/run.js lädt nur die headless-Schichten (bis src/spiel) und baut seinen
   Testbereich OHNE require auf – src/ui ist dort weder geladen noch nachladbar. Dieser Test lädt die
   Datei deshalb in einem eigenen vm-Bereich mit nachgebildetem DOM. Steht require nicht zur Verfügung,
   sagen die Testnamen das ausdrücklich – kein stilles Grün.
   Allein lauffähig:  node tests/ui-training.test.js */

function uiHatRequire(){ try { return typeof require === "function"; } catch (e) { return false; } }
const UI_KANN_LADEN = (() => {
  try { return uiHatRequire() && typeof document === "undefined" && typeof Spiel === "object" && Spiel !== null; } catch (e) { return false; }
})();
const UI_ZUSATZ = UI_KANN_LADEN ? "" : " (kein require im Testbereich – nur allein lauffähig: node tests/ui-training.test.js)";

/* ---------------- Allein lauffähig ----------------
   Dieselbe Ladereihenfolge wie tests/run.js. Danach läuft dieselbe Datei noch einmal – dann mit Spiel,
   mit require und mit dem DOM-Ersatz unten. */
function uiAlleinLaden(){
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
  try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "ui-training.test.js"}); }
  catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
  const rot = ergebnisse.filter(e => !e.ok);
  for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
  console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
  process.exit(rot.length ? 1 : 0);
}
if (typeof Spiel === "undefined" && typeof document === "undefined" && uiHatRequire()) uiAlleinLaden();

/* ================= DOM-Ersatz (nur für den vm-Bereich) ================= */
function uiKnoten(tag){
  const el = {
    tag, kinder: [], attrs: {}, className: "", _text: "", eltern: null, listeners: {},
    append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.eltern = el; el.kinder.push(x); } },
    replaceChildren(...k){ el.kinder = []; el.append(...k); },
    remove(){ if (el.eltern) el.eltern.kinder = el.eltern.kinder.filter(x => x !== el); },
    setAttribute(k, v){ el.attrs[k] = String(v); },
    getAttribute(k){ return el.attrs[k]; },
    addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
    click(){ for (const fn of (el.listeners.click || []).slice()) fn({currentTarget: el}); },
    querySelector(sel){ return uiFinde(el, sel)[0] || null; },
    querySelectorAll(sel){ return uiFinde(el, sel); },
    set textContent(v){ el._text = String(v); el.kinder = []; },
    get textContent(){ return el.kinder.length ? el.kinder.map(uiText).join("") : el._text; },
    get hidden(){ return el.attrs.hidden !== undefined; },
  };
  return el;
}
function uiKlassen(el){ return String(el.className || el.attrs.class || "").split(/\s+/).filter(Boolean); }
function uiFinde(el, sel){
  const klasse = String(sel).replace(/^\./, ""), treffer = [];
  const lauf = k => { for (const x of k.kinder) if (x && typeof x === "object" && x.tag) { if (uiKlassen(x).includes(klasse)) treffer.push(x); lauf(x); } };
  lauf(el);
  return treffer;
}
function uiText(k){ return k == null ? "" : typeof k === "string" ? k : k.textContent; }
/* h() mit demselben Vertrag wie src/ui/dom.js: class → className, on* → addEventListener. */
function uiH(tag, attrs = {}, ...kinder){
  const el = uiKnoten(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...kinder.flat(Infinity));
  return el;
}

/* ================= Prüfstand =================
   Lädt src/ui/training.js in einem eigenen Bereich: echtes Spiel (Spiel aus dieser Datei), nachgebildeter
   App-Rahmen, nachgebildetes DOM. Die Bildungsstufe stellt der Aufrufer über Spiel.stufe (siehe uiKapsel). */
function uiPruefstand(){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const rufe = [], registriert = [], startHaken = [], busHaken = [];
  const laborZustand = {inst: {iid: "alt"}, live: {}, demo: {}, hilfeOffen: true};
  const UIstub = {
    startHaken,
    labor: {auftragNeu: () => rufe.push(["auftragNeu"])},
    app: {registrieren: (name, def) => registriert.push({name, def}), aktualisieren: () => rufe.push(["aktualisieren"]),
          ansicht: name => rufe.push(["ansicht", name]), aktuell: null},
    spiel: {oeffnen: iid => rufe.push(["oeffnen", iid]), status: () => rufe.push(["status"]), _S: laborZustand},
    toast: (text, art, opt) => rufe.push(["toast", text, art, opt]),
    /* Seit 07.10.2026 erklärt das Trainingsergebnis je offenem Ziel über UI.erklaeren (Review
       „Lernwirkung", P2-5). Der Prüfstand braucht den Aufruf nachgebildet, sonst ist sein
       Fehlversuchs-Fall rot, obwohl der Produktivcode richtig ist (im Bündel steht
       src/ui/erklaeren.js vor src/ui/training.js). */
    erklaeren: (code, niveau) => { rufe.push(["erklaeren", code, niveau]); return uiKnoten("div"); },
  };
  const bereich = {
    UI: UIstub, h: uiH, console, setTimeout: () => {},
    document: {createElement: uiKnoten, createTextNode: t => ({tag: "#text", textContent: String(t)}), querySelector: () => null},
    Bus: {an: (art, fn) => { busHaken.push({art, fn}); return () => {}; }},
    Spiel,
  };
  vm.createContext(bereich);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "src", "ui", "training.js"), "utf8"), bereich, {filename: "ui/training.js"});
  return {UI: bereich.UI, rufe, registriert, startHaken, busHaken, laborZustand};
}
const uiRufe = (p, art) => p.rufe.filter(r => r[0] === art);
const knopf = (el, text) => el.querySelectorAll(".knopf").find(b => String(b.textContent).includes(text)) || null;

/* Kapsel wie in tests/spiel-*.test.js: eigener Stand, eigene Einstellungen, danach alles zurück. */
function uiKapsel(szenario, fn){
  const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken, stufe: Spiel.stufe,
               gen: Object.assign({}, Spiel.generierte), einstStore: store.get("einst", null)};
  try {
    Spiel._trocken = true; Spiel._lz = {};
    Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
    Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
    if (szenario && szenario.stufe === null) delete Spiel.stufe;
    else if (szenario && szenario.stufe) Spiel.stufe = szenario.stufe;
    return fn();
  } finally {
    Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
    if (alt.stufe === undefined) delete Spiel.stufe; else Spiel.stufe = alt.stufe;
    for (const k of Object.keys(Spiel.generierte)) if (!(k in alt.gen)) delete Spiel.generierte[k];
    store.set("einst", alt.einstStore);
  }
}
const erstesStartbares = () => Spiel.training.liste().find(e => e.offen);

gruppe("UI: Trainingsansicht", () => {
  pruefe("Der Start-Haken meldet die Ansicht „training“ an – mit Titel, Symbol, Zeigen/Wieder und Zähler" + UI_ZUSATZ, () => {
    if (!UI_KANN_LADEN) return;
    uiKapsel({stufe: null}, () => {
      const p = uiPruefstand();
      erwarte.gleich(p.startHaken.length, 1, "genau ein eigener Start-Haken");
      p.startHaken[0]();
      erwarte.gleich(p.busHaken.map(b => b.art), ["training"], "und ein Bus-Hörer auf „training“");
      erwarte.gleich(p.registriert.length, 1, "genau eine Registrierung");
      const r = p.registriert[0];
      erwarte.gleich(r.name, "training", "eigene Ansicht, keine fremde wird beerbt");
      erwarte.gleich([r.def.titel, r.def.symbol], ["Training", "lernen"]);
      erwarte.gleich([typeof r.def.zeigen, typeof r.def.wieder, typeof r.def.zaehler], ["function", "function", "function"]);
      erwarte.gleich(r.def.zaehler(), 0, "ohne Durchgang kein Zähler");
      const e = erstesStartbares();
      Spiel.training.starten(e.id);
      erwarte.gleich(r.def.zaehler(), 1, "ein angefangener Durchgang zählt am Dock-Knopf");
    });
  });

  pruefe("zeigen() zeichnet je Szenario eine Karte mit Art, Fertigkeit, Minuten, Stand und Quelle" + UI_ZUSATZ, () => {
    if (!UI_KANN_LADEN) return;
    uiKapsel({stufe: null}, () => {
      const p = uiPruefstand();
      p.startHaken[0]();
      const def = p.registriert[0].def;
      const c = uiKnoten("div");
      def.zeigen(c);
      erwarte.wahr(!!c.querySelector(".tr-seite"), "die Seite steht");
      const karten = c.querySelectorAll(".tr-karte");
      erwarte.gleich(karten.length, Spiel.TRAINING.length, "eine Karte je Szenario");
      const ohneQuelle = karten.filter(k => !(k.querySelector(".tr-quelle") || {}).textContent);
      erwarte.gleich(ohneQuelle.length, 0, "jede Karte nennt ihre Quelle");
      const texte = karten.map(k => k.textContent).join("\n");
      for (const t of Spiel.TRAINING.slice(0, 3)) {
        erwarte.enthaelt(texte, t.titel, "Titel steht auf der Karte");
        erwarte.wahr(karten.some(k => k.textContent.includes(Spiel.skill(t.skill).name)), t.skill + ": Fertigkeit steht auf der Karte");
      }
      erwarte.enthaelt(texte, "Quelle:", "die Quellenzeile ist beschriftet");
      erwarte.wahr(karten.every(k => !!knopf(k, "Starten") || !!knopf(k, "Fortsetzen")), "jede Karte hat einen Weg hinein");
      /* Wiederaufbau (Rückkehr auf den Reiter) zeichnet dieselbe Ansicht neu. */
      const c2 = uiKnoten("div");
      def.wieder(c2);
      erwarte.gleich(c2.querySelectorAll(".tr-karte").length, karten.length);
    });
  });

  pruefe("Gerüst nur für Stufen, die es hergeben: azubi mit Schritten, meister ohne" + UI_ZUSATZ, () => {
    if (!UI_KANN_LADEN) return;
    const mitGeruest = () => Spiel.TRAINING.filter(t => t.geruest).length;
    uiKapsel({stufe: null}, () => {
      const p = uiPruefstand();
      p.startHaken[0]();
      const c = uiKnoten("div");
      p.registriert[0].def.zeigen(c);
      erwarte.gleich(c.querySelectorAll(".tr-geruest").length, mitGeruest(), "azubi sieht das Gerüst");
      const mitSchritten = c.querySelectorAll(".tr-schritte");
      erwarte.gleich(mitSchritten.length, Spiel.TRAINING.filter(t => t.geruest && (t.schritte || []).length).length, "geführte Übungen zeigen ihre Schritte");
      erwarte.enthaelt(c.textContent, "Gerüst:", "das Gerüst ist benannt");
      erwarte.enthaelt(c.textContent, "Werkzeug:", "das Werkzeug steht dabei");
    });
    uiKapsel({stufe: {id: () => "meister", darf: () => false, erklaerung: () => "nurcodes"}}, () => {
      const p = uiPruefstand();
      p.startHaken[0]();
      const c = uiKnoten("div");
      p.registriert[0].def.zeigen(c);
      erwarte.gleich(c.querySelectorAll(".tr-geruest").length, 0, "meister bekommt kein Gerüst");
      erwarte.gleich(c.querySelectorAll(".tr-karte").length, Spiel.TRAINING.length, "die Liste bleibt");
    });
  });

  pruefe("Klick auf „Starten“ legt eine echte Trainingsinstanz an und öffnet sie im Labor" + UI_ZUSATZ, () => {
    if (!UI_KANN_LADEN) return;
    uiKapsel({stufe: null}, () => {
      const p = uiPruefstand();
      p.startHaken[0]();
      const c = uiKnoten("div");
      p.registriert[0].def.zeigen(c);
      const e = erstesStartbares();
      const karte = c.querySelectorAll(".tr-karte").find(k => k.textContent.includes(e.titel));
      const b = knopf(karte, "Starten");
      erwarte.wahr(!!b, "Start-Knopf vorhanden");
      b.click();
      const oeffnen = uiRufe(p, "oeffnen");
      erwarte.gleich(oeffnen.length, 1, "genau ein Aufruf von UI.spiel.oeffnen");
      const inst = Spiel.instanz(oeffnen[0][1]);
      erwarte.wahr(!!inst, "die geöffnete Instanz liegt im Spielstand");
      erwarte.gleich(inst.quelle, "training");
      erwarte.gleich(inst.training, e.id, "sie gehört zu diesem Szenario");
      erwarte.gleich([Spiel.st.euro, Spiel.st.ruf, Spiel.st.erledigt.length], [0, 0, 0], "Starten zahlt nichts");
      /* Nach dem Start zeigt die Karte den offenen Durchgang mit Fortsetzen und Abnehmen. */
      const c2 = uiKnoten("div");
      p.registriert[0].def.zeigen(c2);
      const k2 = c2.querySelectorAll(".tr-karte").find(k => k.textContent.includes(e.titel));
      erwarte.wahr(!!knopf(k2, "Fortsetzen") && !!knopf(k2, "Abnehmen"), "Fortsetzen und Abnehmen stehen bereit");
    });
  });

  pruefe("Klick auf „Abnehmen“ schreibt den Stand, zeigt das Ergebnis – und das Labor lässt den Durchgang los" + UI_ZUSATZ, () => {
    if (!UI_KANN_LADEN) return;
    uiKapsel({stufe: null}, () => {
      const p = uiPruefstand();
      p.startHaken[0]();
      const e = erstesStartbares();
      const r = Spiel.training.starten(e.id);
      const inst = Spiel.instanz(r.iid);
      Spiel.oeffnen(inst.iid);
      Spiel.loesung(inst.netz, Spiel.defVon(inst).loesung);          /* wie im Spiel: erst reparieren */
      if (typeof Spiel.arbeitszieleErfuellen === "function") Spiel.arbeitszieleErfuellen(inst);
      const c = uiKnoten("div");
      p.registriert[0].def.zeigen(c);
      const karte = c.querySelectorAll(".tr-karte").find(k => k.textContent.includes(e.titel));
      knopf(karte, "Abnehmen").click();
      const stand = Spiel.training.stand().je[e.id];
      erwarte.gleich([stand.versucht, stand.bestanden], [1, 1], "ein Versuch, bestanden");
      erwarte.wahr(stand.bestes > 0, "Sterne stehen im Stand");
      erwarte.gleich([Spiel.st.euro, Spiel.st.ruf, Spiel.st.erledigt.length, Spiel.st.buch.length], [0, 0, 0, 0], "Training zahlt nichts");
      erwarte.gleich(Spiel.instanz(r.iid), null, "der Durchgang ist abgeschlossen");
      const c2 = uiKnoten("div");
      p.registriert[0].def.zeigen(c2);
      erwarte.wahr(!!c2.querySelector(".tr-ergebnis"), "das Ergebnis steht in der Ansicht");
      erwarte.wahr(!!c2.querySelector(".tr-lernen"), "der Lernstand des Durchgangs steht darunter");
      erwarte.enthaelt(c2.querySelector(".tr-ergebnis").textContent, "Bestanden");
      erwarte.wahr(p.laborZustand.inst === null, "das Labor kennt keinen Durchgang mehr");
      erwarte.wahr(uiRufe(p, "auftragNeu").length >= 1, "die Auftragszeile im Labor wird neu gezeichnet");
      erwarte.wahr(uiRufe(p, "toast").some(t => /Bestanden/.test(t[1])), "und es wird gemeldet");
      /* „Zum Lernstand“ führt in die Lernstand-Ansicht. */
      const zl = knopf(c2.querySelector(".tr-ergebnis"), "Zum Lernstand");
      erwarte.wahr(!!zl, "der Weg in den Lernstand ist da");
      zl.click();
      erwarte.gleich(uiRufe(p, "ansicht"), [["ansicht", "lernstand"]], "der Knopf öffnet den Lernstand");
    });
  });

  pruefe("Ohne Lösung bleibt der Durchgang offen: die Ansicht sagt es, statt zu gratulieren" + UI_ZUSATZ, () => {
    if (!UI_KANN_LADEN) return;
    uiKapsel({stufe: null}, () => {
      const p = uiPruefstand();
      p.startHaken[0]();
      const e = erstesStartbares();
      const r = Spiel.training.starten(e.id);
      Spiel.oeffnen(r.iid);                                          /* nichts repariert */
      const c = uiKnoten("div");
      p.registriert[0].def.zeigen(c);
      const karte = c.querySelectorAll(".tr-karte").find(k => k.textContent.includes(e.titel));
      knopf(karte, "Abnehmen").click();
      erwarte.gleich(Spiel.training.stand().je[e.id], {versucht: 1, bestanden: 0, bestes: 0});
      erwarte.wahr(!!Spiel.instanz(r.iid), "der Durchgang bleibt offen");
      erwarte.wahr(p.laborZustand.inst !== null, "das Labor bleibt im Durchgang");
      const c2 = uiKnoten("div");
      p.registriert[0].def.zeigen(c2);
      const erg = c2.querySelector(".tr-ergebnis");
      erwarte.wahr(!!erg, "das Ergebnis steht da");
      erwarte.enthaelt(erg.textContent, "Noch nicht bestanden");
      erwarte.wahr(!!c2.querySelector(".tr-offen"), "und nennt die offenen Ziele");
      erwarte.wahr(!!knopf(c2.querySelectorAll(".tr-karte").find(k => k.textContent.includes(e.titel)), "Fortsetzen"), "Weiterarbeiten ist möglich");
    });
  });
});
