"use strict";
/* ---------- UI.konsole.zuruecksetzen: die Sitzung neu starten (Review „Testqualität", P2) ----------
   Diese öffentliche Fläche hatte KEINEN Test. Sie hängt am echten Weg (nach Neustart/Strom aus in der
   Oberfläche) und setzt mehr zurück als den Text: die CLI-Sitzung selbst (Modus!), eine offene
   Rückfrage und die Verlaufsposition. Geprüft wird der echte Weg über die DOM-Attrappe:
   UI.konsole.oeffnen → Zeile ausführen → zuruecksetzen → Wirkung im DOM und in der nächsten Zeile.
   Vertrag: docs/entwicklung/Hilfestellung – Stufen und Schnittstellen.md § 4.1 (Streifen zieht nach).
   Allein lauffähig:  node tests/ui-konsole-zuruecksetzen.test.js */
function zkHatRequire(){ try { return typeof require === "function"; } catch (e) { return false; } }
const ZK_KANN_LADEN = (() => {
  try { return zkHatRequire() && typeof document === "undefined" && typeof Spiel === "object" && Spiel !== null; } catch (e) { return false; }
})();
const ZK_ZUSATZ = ZK_KANN_LADEN ? "" : " (kein require im Testbereich – nur allein lauffähig: node tests/ui-konsole-zuruecksetzen.test.js)";

function zkAlleinLaden(){
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
  try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "ui-konsole-zuruecksetzen.test.js"}); }
  catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
  const rot = ergebnisse.filter(e => !e.ok);
  for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
  console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
  process.exit(rot.length ? 1 : 0);
}
if (typeof Spiel === "undefined" && typeof document === "undefined" && zkHatRequire()) zkAlleinLaden();

/* ---------- DOM-Ersatz (nur für den vm-Bereich) ---------- */
const zkKlassen = el => String(el.className || (el.attrs && el.attrs.class) || "").split(/\s+/).filter(Boolean);
function zkFinde(el, sel){
  const klassen = String(sel).split(".").filter(Boolean), treffer = [];
  const lauf = k => {
    for (const x of k.kinder || []) if (x && typeof x === "object" && x.nodeType === 1) {
      if (klassen.every(c => zkKlassen(x).includes(c))) treffer.push(x);
      lauf(x);
    }
  };
  lauf(el);
  return treffer;
}
const zkTextwert = k => k == null ? "" : typeof k === "string" ? k : (k.nodeType === 3 ? k.text : (k.textContent || ""));
function zkKnoten(tag){
  const el = {tag, nodeType: 1, kinder: [], attrs: {}, className: "", value: "", disabled: false, rows: 1,
    isConnected: true, scrollTop: 0, scrollHeight: 0, eltern: null, listeners: {}, style: {setProperty(){}}, _text: ""};
  el.classList = {
    add(...c){ const s = new Set(zkKlassen(el)); for (const x of c) s.add(x); el.className = [...s].join(" "); },
    remove(...c){ const s = new Set(zkKlassen(el)); for (const x of c) s.delete(x); el.className = [...s].join(" "); },
    toggle(c, an){ const will = an === undefined ? !zkKlassen(el).includes(c) : !!an; if (will) el.classList.add(c); else el.classList.remove(c); },
    contains: c => zkKlassen(el).includes(c),
  };
  el.append = (...k) => {
    for (const x of k.flat(Infinity)) {
      if (x == null || x === false) continue;
      const kind = typeof x === "object" && x.nodeType ? x : {nodeType: 3, text: String(x)};
      if (kind.nodeType === 1) kind.eltern = el;
      el.kinder.push(kind);
    }
  };
  el.appendChild = k => { el.append(k); return k; };
  el.replaceChildren = (...k) => { el.kinder = []; el.append(...k); };
  el.remove = () => { if (el.eltern) el.eltern.kinder = el.eltern.kinder.filter(x => x !== el); el.eltern = null; };
  el.setAttribute = (k, v) => { el.attrs[k] = String(v); if (k === "class") el.className = String(v); };
  el.getAttribute = k => (k in el.attrs ? el.attrs[k] : null);
  el.addEventListener = (art, fn) => { (el.listeners[art] ||= []).push(fn); };
  el.feuern = (art, ev) => { for (const fn of (el.listeners[art] || []).slice()) fn(Object.assign({currentTarget: el, target: el, preventDefault(){}, stopPropagation(){}}, ev)); };
  el.click = () => el.feuern("click", {});
  el.focus = () => { if (ZK_DOC) ZK_DOC.activeElement = el; };
  el.setSelectionRange = () => {};
  el.querySelector = sel => zkFinde(el, sel)[0] || null;
  el.querySelectorAll = sel => zkFinde(el, sel);
  Object.defineProperty(el, "hidden", {configurable: true,
    get: () => el.attrs.hidden !== undefined, set: v => { if (v) el.attrs.hidden = ""; else delete el.attrs.hidden; }});
  Object.defineProperty(el, "textContent", {configurable: true,
    get: () => el.kinder.length ? el.kinder.map(zkTextwert).join("") : el._text, set: v => { el._text = String(v); el.kinder = []; }});
  Object.defineProperty(el, "firstChild", {configurable: true, get: () => el.kinder[0] || null});
  return el;
}
let ZK_DOC = null;
const zkDocument = () => (ZK_DOC = {activeElement: null, createElement: t => zkKnoten(t),
  createTextNode: t => ({nodeType: 3, text: String(t)}), querySelector: () => null, querySelectorAll: () => [], body: zkKnoten("body")});

/* Lädt die echten Dateien der Konsole: dom.js (h), hilfe.js (Streifen), konsole.js (UI.konsole). */
function zkPruefstand(){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const doc = zkDocument();
  const bereich = {console, setTimeout: () => {}, clearTimeout: () => {}, Date, Math, JSON, Intl,
    document: doc, Bus: {an: () => () => {}, aus: () => {}, senden: () => {}}, Spiel, CLI, Modell, DATEN, store};
  vm.createContext(bereich);
  const quellen = ["src/ui/dom.js", "src/ui/hilfe.js", "src/ui/konsole.js"].map(rel => fs.readFileSync(path.join(__dirname, "..", rel), "utf8"));
  const UI_OBJ = vm.runInContext(quellen.join("\n;\n") + "\n;UI", bereich, {filename: "ui-konsole.js"});
  vm.runInContext("UI.labor = {netz: null, zeigeTrace: function(){}, dock: function(){}};", bereich);
  return {document: doc, UI: UI_OBJ};
}

gruppe("UI: Konsole zurücksetzen", () => {
  const netz = () => {
    const n = Modell.neu();
    Modell.geraet(n, "router", {id: "r1", name: "R1"});
    Modell.setzen(n, "r1", "if.Gi0/0.ip", "192.168.10.1");
    Modell.setzen(n, "r1", "if.Gi0/0.maske", "255.255.255.0");
    Modell.setzen(n, "r1", "if.Gi0/0.shutdown", false);
    return n;
  };
  const oeffnen = (p, n) => {
    const container = p.document.createElement("div");
    p.UI.konsole.oeffnen(container, n, "r1", null, {fokus: false});
    return container;
  };
  const tippen = (container, zeile) => {
    const eingabe = container.querySelector(".ko-eingabe");
    eingabe.value = zeile;
    eingabe.feuern("keydown", {key: "Enter", shiftKey: false});
    return eingabe;
  };
  const prompt = container => container.querySelector(".ko-prompt").textContent;
  const letzterBlock = container => {
    const bloecke = container.querySelectorAll(".ko-block");
    return bloecke.length ? bloecke[bloecke.length - 1] : null;
  };
  const kapsel = fn => {
    const altEinst = store.get("einst", {}), altIntern = Spiel._einst, altStufe = Spiel.stufe;
    try { fn(); }
    finally { store.set("einst", altEinst); Spiel._einst = altIntern; Spiel.stufe = altStufe; }
  };

  pruefe("Neustart: neue Sitzung im Benutzermodus, Meldung im Block und im offenen Terminal" + ZK_ZUSATZ, () => {
    if (!ZK_KANN_LADEN) return;
    kapsel(() => {
      const p = zkPruefstand(), n = netz(), container = oeffnen(p, n);
      tippen(container, "enable");
      erwarte.gleich(prompt(container), "R1#", "vor dem Neustart im privilegierten Modus");
      p.UI.konsole.zuruecksetzen(n, "r1", "— Probelauf —");
      erwarte.gleich(prompt(container), "R1>", "nach dem Neustart wieder im Benutzermodus");
      const block = letzterBlock(container);
      erwarte.wahr(!!block, "es gibt einen Block");
      erwarte.enthaelt(block.textContent, "— Probelauf —", "die Meldung steht im Terminal");
      erwarte.wahr(zkKlassen(block).includes("info"), "als Hinweis, nicht als Geräteausgabe");
      /* Der echte Beweis: die NÄCHSTE Zeile läuft in der neuen Sitzung. */
      tippen(container, "show ip interface brief");
      erwarte.enthaelt(letzterBlock(container).textContent, "Interface", "die neue Sitzung antwortet");
      erwarte.gleich(prompt(container), "R1>", "und bleibt im Benutzermodus");
    });
  });

  pruefe("Ohne Text kommt die Standardmeldung, und die alte Ausgabe bleibt stehen" + ZK_ZUSATZ, () => {
    if (!ZK_KANN_LADEN) return;
    kapsel(() => {
      const p = zkPruefstand(), n = netz(), container = oeffnen(p, n);
      tippen(container, "show version");
      const vorher = container.querySelectorAll(".ko-block").length;
      p.UI.konsole.zuruecksetzen(n, "r1");
      erwarte.enthaelt(letzterBlock(container).textContent, "Sitzung neu gestartet", "die Standardmeldung");
      erwarte.gleich(container.querySelectorAll(".ko-block").length, vorher + 1, "genau ein Block kommt dazu");
    });
  });

  pruefe("Eine offene Rückfrage wird verworfen – die nächste Zeile ist wieder ein Befehl" + ZK_ZUSATZ, () => {
    if (!ZK_KANN_LADEN) return;
    kapsel(() => {
      const p = zkPruefstand(), n = netz(), container = oeffnen(p, n);
      tippen(container, "enable");
      tippen(container, "copy running-config startup-config");
      erwarte.enthaelt(prompt(container), "Destination filename", "die Rückfrage steht");
      p.UI.konsole.zuruecksetzen(n, "r1", "— neu —");
      erwarte.gleich(prompt(container), "R1>", "die Rückfrage ist weg");
      tippen(container, "show clock");
      erwarte.falsch(/Destination filename/.test(prompt(container)), "die Zeile wurde nicht als Antwort geschluckt");
      erwarte.gleich(prompt(container), "R1>");
      erwarte.falsch(/Dateiname/.test(letzterBlock(container).textContent), "und nichts wurde gespeichert");
    });
  });

  pruefe("Netz ohne Sitzung und unbekanntes Gerät: kein Wurf, nichts passiert" + ZK_ZUSATZ, () => {
    if (!ZK_KANN_LADEN) return;
    kapsel(() => {
      const p = zkPruefstand(), fremd = netz();
      p.UI.konsole.zuruecksetzen(fremd, "r1", "x");                       /* nie geöffnet */
      p.UI.konsole.zuruecksetzen(null, "r1");
      p.UI.konsole.zuruecksetzen(fremd, "gibtsnicht");
      /* Danach lässt sich das Netz normal öffnen – nichts ist kaputt gegangen. */
      const container = oeffnen(p, fremd);
      erwarte.gleich(prompt(container), "R1>", "die Konsole startet normal");
      erwarte.falsch(/— x —/.test(container.textContent), "die Meldung eines fremden Netzes taucht nicht auf");
    });
  });

  pruefe("Ohne offenes Terminal wird der Stand trotzdem zurückgesetzt" + ZK_ZUSATZ, () => {
    if (!ZK_KANN_LADEN) return;
    kapsel(() => {
      const p = zkPruefstand(), n = netz(), container = oeffnen(p, n);
      tippen(container, "enable");
      container.isConnected = false;                                     /* Terminal ist zu */
      p.UI.konsole.zuruecksetzen(n, "r1", "— zu —");
      container.isConnected = true;
      const neu = oeffnen(p, n);                                          /* wieder aufbauen */
      erwarte.enthaelt(neu.textContent, "— zu —", "die Meldung kommt aus dem gespeicherten Verlauf");
      erwarte.gleich(prompt(neu), "R1>", "und die Sitzung ist neu");
    });
  });

  pruefe("Nach dem Neustart ziehen Vorschlag und Streifen nach (der echte Weg aus § 4.1)" + ZK_ZUSATZ, () => {
    if (!ZK_KANN_LADEN) return;
    kapsel(() => {
      const p = zkPruefstand(), n = netz(), container = oeffnen(p, n);
      tippen(container, "enable");
      tippen(container, "show ip interface brief");
      p.UI.konsole.zuruecksetzen(n, "r1", "— neu —");
      const zeile = container.querySelector(".ko-vorschlag");
      erwarte.gleich(zeile.hidden, false, "der Einstiegs-Vorschlag steht wieder da");
      /* Der Vorschlag kommt aus Spiel.hilfe und kennt den Verlauf dieser Sitzung. */
      const soll = Spiel.hilfe.passend({netz: n, id: "r1", modus: "user", verlauf: ["enable", "show ip interface brief"]})[0];
      erwarte.gleich(zeile.querySelector(".ko-vorschlag-knopf").textContent, soll.befehl, "aus Spiel.hilfe (eine Quelle)");
      /* Der Streifen ist mit der NEUEN Sitzung gezeichnet: das Gerüst gehört jetzt zum Benutzermodus. */
      const geruest = container.querySelector(".hl-geruest");
      erwarte.wahr(!!geruest, "der Streifen ist neu gezeichnet");
      erwarte.enthaelt(geruest.textContent, "Angemeldet", "das Gerüst des Benutzermodus (privilegiert stünde dort „Zeigen, prüfen, sichern“)");
    });
  });
});
