"use strict";
/* ZENTRALER RESOLVER „FEHLER → ZIEL" (Runde 4, Strang C) — tests/fehlerziel.test.js
   Geprüft wird das ECHTE Modul src/ui/fehlerziel.js in einem eigenen vm-Bereich mit
   nachgebildetem DOM (Bauart von tests/ui-editor-flaeche.test.js). Die UI-Schicht wird
   headless nicht geladen; der Test lädt nur dom.js + fehlerziel.js selbst.

   Fälle (der Zähler kommt aus der Liste, nicht aus dem Text):
     1 · Gerät: Auswahl, Inspektor, Zentrierung, Hervorhebung — und KEIN Fokusklau
     2 · Kabel: beide Enden werden gefunden, gezeigt und hervorgehoben
     3 · Defensiv: ohne Labor, ohne Ziel, unbekanntes Gerät/Kabel → ehrliche Absage, kein Wurf
     4 · Frame: ein Trace-Ereignis wird zum Ziel (Gerät + Port)
     5 · Bewegung aus: nur ruhige Auswahl, kein Puls; Ebene: Ansicht wechseln
     6 · istProblem/kabelEnden/ortText: nur echte Daten, keine Erfindung */

(function(){
function fzHatRequire(){ try { return typeof require === "function"; } catch (e) { return false; } }
function fzAlleinLaden(){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const code = [fs.readFileSync(path.join(__dirname, "harness.js"), "utf8"),
                fs.readFileSync(__filename, "utf8"), "testsAusfuehren();"];
  const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename, process});
  let ergebnisse;
  try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "fehlerziel.test.js"}); }
  catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
  const rot = ergebnisse.filter(e => !e.ok);
  for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
  console.log("\n" + (ergebnisse.length - rot.length) + "/" + ergebnisse.length + " grün");
  process.exit(rot.length ? 1 : 0);
}
if (typeof gruppe === "undefined" && typeof document === "undefined" && fzHatRequire()) { fzAlleinLaden(); return; }

const FZ_KANN_LADEN = (() => {
  try { return fzHatRequire() && typeof document === "undefined" && typeof gruppe === "function"; }
  catch (e) { return false; }
})();
const FZ_ZUSATZ = FZ_KANN_LADEN ? "" : " (kein require im Testbereich – nur unter node tests/run.js)";

/* ================= DOM-Ersatz (nur im Prüfstand) ================= */
function fzKnoten(tag){
  const el = {
    nodeType: 1, tag, kinder: [], attrs: {}, listeners: {}, className: "", _text: "", parentNode: null,
    append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.parentNode = el; el.kinder.push(x); } },
    replaceChildren(...k){ el.kinder = []; el.append(...k); },
    remove(){ if (el.parentNode) el.parentNode.kinder = el.parentNode.kinder.filter(x => x !== el); },
    setAttribute(k, v){ el.attrs[k] = String(v); },
    getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
    addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
    querySelector(){ return null; }, querySelectorAll(){ return []; },
    get hidden(){ return el.attrs.hidden !== undefined; },
    focus(){ el._fokus = true; },
    get isConnected(){ let p = el; while (p.parentNode) p = p.parentNode; return !!p.__imBaum; },
  };
  return el;
}
function fzDokument(){
  const body = fzKnoten("body"); body.__imBaum = true;
  return {
    body, documentElement: fzKnoten("html"), activeElement: null,
    createElement: t => fzKnoten(t), createElementNS: (ns, t) => fzKnoten(t),
    createTextNode: t => ({nodeType: 3, textContent: String(t)}),
    addEventListener(){}, removeEventListener(){},
    querySelector(){ return null; }, querySelectorAll(){ return []; },
  };
}

/* ================= Prüfstand: echtes dom.js + echtes fehlerziel.js ================= */
const FZ_NETZ = () => ({
  geraete: {
    kasse: {id: "kasse", name: "PC-Kasse", typ: "pc", an: true, running: {if: {eth0: {ip: "192.168.10.20"}}}},
    sw1: {id: "sw1", name: "SW1", typ: "switch", an: true, running: {ports: {"Fa0/1": {}}}},
  },
  kabel: [{id: "k1", a: {geraet: "kasse", port: "eth0"}, b: {geraet: "sw1", port: "Fa0/1"}}],
  zustand: {},
});
function fzStand(netz){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const dok = fzDokument();
  const rufe = [];
  const bereich = {
    console, document: dok, window: {document: dok},
    setTimeout: () => 0, clearTimeout(){}, requestAnimationFrame: fn => { fn(0); return 0; },
    Modell: {ports: g => g && g.typ === "pc" ? ["eth0"] : g && g.typ === "switch" ? ["Fa0/1", "Fa0/2"] : []},
    JSON, Math, Date, Intl, isFinite, String, Object, Array,
  };
  vm.createContext(bereich);
  const lies = rel => fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
  vm.runInContext(lies("src/ui/dom.js"), bereich, {filename: "src/ui/dom.js"});
  vm.runInContext(lies("src/ui/fehlerziel.js"), bereich, {filename: "src/ui/fehlerziel.js"});
  const UI = vm.runInContext("UI", bereich);
  if (!UI || !UI.fehlerziel) throw new Error("src/ui/fehlerziel.js hat sich nicht als UI.fehlerziel angemeldet");
  const N = netz || FZ_NETZ();
  UI.bewegung = () => "voll";
  UI.app = {aktuell: "heute", ansicht: name => rufe.push(["ansicht", name])};
  UI.ebenen = {setzen: id => rufe.push(["ebene", id])};
  UI.labor = {
    netz: N,
    auswaehlen: (g, p) => rufe.push(["auswaehlen", g || null, p || null]),
    dock: id => rufe.push(["dock", id]),
    zentrieren: id => rufe.push(["zentrieren", id]),
    hervorheben: (liste, ms) => rufe.push(["hervorheben", liste, ms]),
    zeigeKabel: kid => rufe.push(["zeigeKabel", kid]),
    zeigeZone: cidr => rufe.push(["zeigeZone", cidr]),
    werkzeug: name => rufe.push(["werkzeug", name]),
  };
  return {UI, dok, rufe, netz: N, fokus: fzKnoten("button")};
}
const fzRufe = (p, art) => p.rufe.filter(r => r[0] === art);

/* ================= Die Fälle ================= */
const FZ_FAELLE = ["1 · Gerät: Auswahl/Inspektor/Zentrierung/Highlight ohne Fokusklau",
                   "2 · Kabel: beide Enden gefunden, gezeigt und hervorgehoben",
                   "3 · Defensiv: ohne Labor/Ziel/unbekanntes Gerät → ehrliche Absage, kein Wurf",
                   "4 · Frame: Trace-Ereignis wird zum Ziel (Gerät + Port)",
                   "5 · Bewegung aus: ruhige Auswahl ohne Puls; Ebene wechselt die Ansicht",
                   "6 · Nur echte Daten: istProblem, kabelEnden, ortText"];

gruppe("UI: fehlerziel — Zentraler Resolver Fehler→Ziel (Runde 4, Strang C)" + FZ_ZUSATZ, () => {
  if (!FZ_KANN_LADEN) { pruefe("Fehler→Ziel: nur unter node tests/run.js prüfbar", () => { erwarte.wahr(false, "require fehlt"); }); return; }

  pruefe(FZ_FAELLE[0], () => {
    const p = fzStand();
    p.dok.activeElement = p.fokus;
    const r = p.UI.fehlerziel.springen({art: "geraet", geraet: "kasse"});
    erwarte.gleich(r.ok, true, "der Sprung gelingt");
    erwarte.gleich(r.ort, "PC-Kasse", "der Ort ist der Gerätename");
    erwarte.gleich(fzRufe(p, "ansicht"), [["ansicht", "labor"]], "das Labor wird geöffnet");
    erwarte.gleich(fzRufe(p, "auswaehlen"), [["auswaehlen", "kasse", null]], "das Gerät wird gewählt");
    erwarte.gleich(fzRufe(p, "dock").map(x => x[1]), ["inspektor"], "der Inspektor wird gezeigt");
    erwarte.gleich(fzRufe(p, "zentrieren").map(x => x[1]), ["kasse"], "das Gerät wird zentriert");
    const h = fzRufe(p, "hervorheben");
    erwarte.gleich(h.length, 1, "genau ein Highlight");
    erwarte.gleich(h[0][1], [{geraet: "kasse", port: null}], "das Gerät wird hervorgehoben");
    erwarte.wahr(h[0][2] >= 1, "mit sichtbarer Dauer");
    erwarte.gleich(p.dok.activeElement, p.fokus, "KEIN Fokusklau: der Fokus bleibt");
    erwarte.gleich(p.fokus._fokus, undefined, "und das Element wurde nicht fokussiert");
  });

  pruefe(FZ_FAELLE[1], () => {
    const p = fzStand();
    const r = p.UI.fehlerziel.springen({art: "kabel", kabel: {a: {geraet: "kasse", port: "eth0"}, b: {geraet: "sw1", port: "Fa0/1"}}});
    erwarte.gleich(r.ok, true, "der Sprung zum Kabel gelingt");
    erwarte.enthaelt(r.ort, "PC-Kasse eth0", "der Ort nennt das erste Ende");
    erwarte.enthaelt(r.ort, "SW1 Fa0/1", "und das zweite Ende");
    erwarte.gleich(fzRufe(p, "zeigeKabel").map(x => x[1]), ["k1"], "der Inspektor bekommt die Kabel-Id");
    erwarte.gleich(fzRufe(p, "auswaehlen"), [["auswaehlen", "kasse", "eth0"]], "das erste Ende wird gewählt");
    const h = fzRufe(p, "hervorheben");
    erwarte.gleich(h.length, 1, "ein Highlight für das Kabel");
    erwarte.gleich(h[0][1].length, 2, "beide Enden leuchten");
    erwarte.gleich(h[0][1][1], {geraet: "sw1", port: "Fa0/1"}, "das zweite Ende ist SW1 Fa0/1");
    /* Dasselbe Kabel als Id (so rufen die Karten der Akte) */
    const q = fzStand();
    erwarte.gleich(q.UI.fehlerziel.springen({art: "kabel", kabel: "k1"}).ok, true, "auch eine Kabel-Id wird aufgelöst");
  });

  pruefe(FZ_FAELLE[2], () => {
    const p = fzStand();
    /* Ohne Ziel und ohne Labor: keine Ausnahme, ehrlicher Grund. */
    let geworfen = null;
    let r1 = null, r2 = null, r3 = null, r4 = null, r5 = null;
    try {
      r1 = p.UI.fehlerziel.springen(null);
      r2 = p.UI.fehlerziel.springen("kasse");
      r3 = p.UI.fehlerziel.springen({art: "geraet", geraet: "gibtsnicht"});
      r4 = p.UI.fehlerziel.springen({art: "kabel", kabel: {a: {geraet: "x"}, b: {geraet: "y"}}});
      const laborAlt = p.UI.labor;
      p.UI.labor = undefined;
      r5 = p.UI.fehlerziel.springen({art: "geraet", geraet: "kasse"});
      p.UI.labor = laborAlt;
    } catch (e) { geworfen = String(e && e.message || e); }
    erwarte.gleich(geworfen, null, "der Resolver wirft nie");
    erwarte.gleich(r1.ok, false, "ohne Ziel keine Ausnahme, nur eine Absage");
    erwarte.wahr(!!r1.grund, "mit Grund");
    erwarte.gleich(r2.ok, false, "kein Objekt = kein Ziel");
    erwarte.gleich(r3.ok, false, "unbekanntes Gerät wird nicht erfunden");
    erwarte.enthaelt(r3.grund, "gibtsnicht", "der Grund nennt das gesuchte Gerät");
    erwarte.gleich(r4.ok, false, "unbekanntes Kabel wird nicht erfunden");
    erwarte.enthaelt(r4.grund, "Kabel", "der Grund nennt das Kabel");
    erwarte.gleich(r5.ok, false, "ohne Labor kein Sprung");
    erwarte.enthaelt(r5.grund, "Labor", "der Grund sagt es ehrlich");
    erwarte.gleich(p.rufe.length, 0, "keine halben Sprünge ohne Ziel");
  });

  pruefe(FZ_FAELLE[3], () => {
    const p = fzStand();
    const ereignis = {geraet: "kasse", port: "eth0", art: "verwerfen", grund: "LINK_DOWN", proto: "ICMP", frame: {eth: {src: "aa", dst: "bb"}}};
    const ziel = p.UI.fehlerziel.zielAusEreignis(ereignis);
    erwarte.gleich(ziel.art, "frame", "ein Ereignis mit Rahmen wird als Frame-Ziel geführt");
    erwarte.gleich(ziel.geraet, "kasse", "das Gerät kommt aus dem Ereignis");
    erwarte.gleich(ziel.port, "eth0", "der Port auch");
    const r = p.UI.fehlerziel.springen(ziel);
    erwarte.gleich(r.ok, true, "der Sprung zum Frame gelingt");
    erwarte.gleich(fzRufe(p, "auswaehlen"), [["auswaehlen", "kasse", "eth0"]], "Gerät und Port werden gewählt");
    erwarte.gleich(p.UI.fehlerziel.zielAusEreignis(null), null, "ohne Ereignis kein Ziel");
    erwarte.gleich(p.UI.fehlerziel.zielAusEreignis({art: "lernen"}), null, "ohne Gerät kein Ziel (keine Erfindung)");
  });

  pruefe(FZ_FAELLE[4], () => {
    const p = fzStand();
    p.UI.bewegung = () => "aus";
    const r = p.UI.fehlerziel.springen({art: "port", geraet: "kasse", port: "eth0"});
    erwarte.gleich(r.ok, true, "auch bei Bewegung aus wird gesprungen");
    erwarte.gleich(fzRufe(p, "auswaehlen"), [["auswaehlen", "kasse", "eth0"]], "Auswahl bleibt sichtbar");
    erwarte.gleich(fzRufe(p, "hervorheben").length, 0, "kein Puls bei Bewegung aus");
    /* Ebene: nur die Ansicht wechseln, kein Gerät erfinden. */
    const q = fzStand();
    const eb = q.UI.fehlerziel.springen({art: "ebene", ebene: "physik"});
    erwarte.gleich(eb.ok, true, "die Ebene lässt sich wechseln");
    erwarte.gleich(fzRufe(q, "ebene"), [["ebene", "physik"]], "genau die genannte Ebene");
    erwarte.gleich(fzRufe(q, "auswaehlen").length, 0, "dabei wird kein Gerät gewählt");
    /* Unbekannter Port: Gerät wird gewählt, der Port ehrlich verworfen. */
    const w = fzStand();
    const up = w.UI.fehlerziel.springen({art: "port", geraet: "kasse", port: "eth9"});
    erwarte.gleich(up.ok, true, "das Gerät bleibt erreichbar");
    erwarte.enthaelt(up.grund, "eth9", "der unbekannte Port wird benannt");
    erwarte.gleich(fzRufe(w, "auswaehlen"), [["auswaehlen", "kasse", null]], "ohne erfundenen Port");
  });

  pruefe(FZ_FAELLE[5], () => {
    const p = fzStand();
    erwarte.gleich(p.UI.fehlerziel.istProblem({art: "verwerfen", grund: "ROUTE"}), true, "verwerfen mit Grund ist ein Problem");
    erwarte.gleich(p.UI.fehlerziel.istProblem({art: "verwerfen"}), false, "stilles Ignorieren ist keines");
    erwarte.gleich(p.UI.fehlerziel.istProblem({art: "senden", frame: {icmp: {typ: "unreachable"}}}), true, "ICMP-Fehlermeldung ist eines");
    erwarte.gleich(p.UI.fehlerziel.istProblem({art: "senden", frame: {icmp: {typ: "echo-request"}}}), false, "ein Echo ist keines");
    erwarte.gleich(p.UI.fehlerziel.istProblem(null), false, "ohne Ereignis keines");
    const enden = p.UI.fehlerziel.kabelEnden("k1");
    erwarte.gleich(enden.a, {geraet: "kasse", port: "eth0"}, "Ende A aus echten Daten");
    erwarte.gleich(enden.b, {geraet: "sw1", port: "Fa0/1"}, "Ende B aus echten Daten");
    erwarte.gleich(p.UI.fehlerziel.kabelEnden("gibtsnicht"), null, "unbekanntes Kabel → null");
    erwarte.gleich(p.UI.fehlerziel.ortText({art: "geraet", geraet: "kasse"}), "PC-Kasse", "Ortstext Gerät");
    erwarte.gleich(p.UI.fehlerziel.ortText({art: "geraet", geraet: "kasse", port: "eth0"}), "PC-Kasse eth0", "Ortstext mit Port");
    erwarte.gleich(p.UI.fehlerziel.ortText({art: "geraeet"}), "", "unbekanntes Ziel → leer, nicht erfunden");
  });
});
})();
