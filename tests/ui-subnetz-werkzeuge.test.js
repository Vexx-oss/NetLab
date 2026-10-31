"use strict";
/* SUBNETTING-WERKZEUGE (src/ui/subnetz-werkzeuge.js, Runde 7 / W4)
   Vertrag: docs/entwicklung/Entwurf – Runde 7 (Abteilung Subnetting).md § 2.4, § 3, § 7.

   Warum ein eigener Kopf: tests/run.js lädt nur die headless-Schichten (bis src/spiel) und baut
   seinen Testbereich OHNE require auf – src/ui ist dort weder geladen noch nachladbar. Dieser Test
   lädt die Datei deshalb in einem eigenen vm-Bereich mit nachgebildetem DOM (Muster:
   tests/ui-training.test.js). Alle Subnetz-Zahlen kommen aus dem ECHTEN Spiel.subnetz (W1) –
   der Test rechnet die Erwartung nicht nach, er prüft die Anzeige gegen die API und gegen die
   fachlich festen Werte des Vertrags (z. B. /26 → 255.255.255.192, Block 64, Hosts 62).
   Allein lauffähig:  node tests/ui-subnetz-werkzeuge.test.js */

function w4HatRequire(){ try { return typeof require === "function"; } catch (e) { return false; } }
const W4_KANN_LADEN = (() => {
  try { return w4HatRequire() && typeof document === "undefined" && typeof Spiel === "object" && Spiel !== null; } catch (e) { return false; }
})();
const W4_ZUSATZ = W4_KANN_LADEN ? "" : " (kein require im Testbereich – nur allein lauffähig: node tests/ui-subnetz-werkzeuge.test.js)";

/* ---------------- Allein lauffähig ----------------
   Dieselbe Ladereihenfolge wie tests/run.js; die eigentliche UI-Datei lädt w4Pruefstand() nach. */
function w4AlleinLaden(){
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
  try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "ui-subnetz-werkzeuge.test.js"}); }
  catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
  const rot = ergebnisse.filter(e => !e.ok);
  for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
  console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
  process.exit(rot.length ? 1 : 0);
}
if (typeof Spiel === "undefined" && typeof document === "undefined" && w4HatRequire()) w4AlleinLaden();

/* ================= DOM-Ersatz (nur für den vm-Bereich) ================= */
function w4Knoten(tag){
  const el = {
    tag, kinder: [], attrs: {}, className: "", _text: "", eltern: null, listeners: {},
    append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.eltern = el; el.kinder.push(x); } },
    replaceChildren(...k){ el.kinder = []; el.append(...k); },
    remove(){ if (el.eltern) el.eltern.kinder = el.eltern.kinder.filter(x => x !== el); },
    setAttribute(k, v){ el.attrs[k] = String(v); },
    getAttribute(k){ return el.attrs[k]; },
    addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
    click(){ for (const fn of (el.listeners.click || []).slice()) fn({currentTarget: el}); },
    querySelector(sel){ return w4Finde(el, sel)[0] || null; },
    querySelectorAll(sel){ return w4Finde(el, sel); },
    set textContent(v){ el._text = String(v); el.kinder = []; },
    get textContent(){ return el.kinder.length ? el.kinder.map(w4Text).join("") : el._text; },
    get hidden(){ return el.attrs.hidden !== undefined; },
  };
  return el;
}
function w4Klassen(el){ return String(el.className || el.attrs.class || "").split(/\s+/).filter(Boolean); }
function w4Finde(el, sel){
  const klasse = String(sel).replace(/^\./, ""), treffer = [];
  const lauf = k => { for (const x of k.kinder) if (x && typeof x === "object" && x.tag) { if (w4Klassen(x).includes(klasse)) treffer.push(x); lauf(x); } };
  lauf(el);
  return treffer;
}
function w4Text(k){ return k == null ? "" : typeof k === "string" ? k : k.textContent; }
function w4Alle(el, tag){
  const raus = [];
  const lauf = k => { for (const x of k.kinder) if (x && typeof x === "object" && x.tag) { if (x.tag === tag) raus.push(x); lauf(x); } };
  lauf(el);
  return raus;
}
/* h() mit demselben Vertrag wie src/ui/dom.js: class → className, on* → addEventListener. */
function w4H(tag, attrs = {}, ...kinder){
  const el = w4Knoten(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...kinder.flat(Infinity));
  return el;
}
const w4Knopf = (el, text) => (el && el.querySelectorAll(".knopf") || []).find(b => String(b.textContent).includes(text)) || null;
const w4AlleKnoepfe = el => (el && el.querySelectorAll(".knopf")) || [];
function w4Feuern(el, art, daten = {}){
  const ev = Object.assign({currentTarget: el, target: el}, daten);
  for (const fn of (el.listeners[art] || []).slice()) fn(ev);
}
function w4IpZuZahl(ip){ return String(ip).split(".").reduce((a, b) => a * 256 + Number(b), 0); }

/* ================= Prüfstand =================
   Lädt src/ui/subnetz-werkzeuge.js in einem eigenen Bereich: echtes Spiel aus dieser Datei,
   nachgebildetes DOM, steuerbare Uhr (setTimeout wird gesammelt und im Test gezielt ausgelöst). */
function w4Pruefstand(){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const uhren = [];
  let naechsteUhr = 0;
  const setTimeoutF = (fn, ms) => { const id = ++naechsteUhr; uhren.push({id, fn, ms: Number(ms) || 0}); return id; };
  const clearTimeoutF = id => { const i = uhren.findIndex(u => u.id === id); if (i >= 0) uhren.splice(i, 1); };
  const bereich = {
    UI: {}, h: w4H, console, Spiel,
    document: {createElement: w4Knoten, createTextNode: t => ({tag: "#text", textContent: String(t)}), querySelector: () => null},
    setTimeout: setTimeoutF, clearTimeout: clearTimeoutF,
  };
  vm.createContext(bereich);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "src", "ui", "subnetz-werkzeuge.js"), "utf8"), bereich, {filename: "ui/subnetz-werkzeuge.js"});
  return {
    UI: bereich.UI,
    uhren,
    /* Timer mit genau dieser Verzögerung der Reihe nach auslösen (jeder Lauf darf neue planen). */
    uhrLauf(ms, max = 200){
      let n = 0;
      for (let i = 0; i < max; i++) {
        const stelle = uhren.findIndex(u => u.ms === ms);
        if (stelle < 0) break;
        const u = uhren.splice(stelle, 1)[0];
        u.fn();
        n += 1;
      }
      return n;
    },
  };
}
/* Spielstand-Kapsel wie in tests/spiel-*.test.js: eigener Stand, trocken, danach alles zurück. */
function w4Kapsel(fn){
  const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
               gen: Object.assign({}, Spiel.generierte)};
  try {
    Spiel._trocken = true; Spiel._lz = {};
    Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
    Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
    return fn();
  } finally {
    Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
    for (const k of Object.keys(Spiel.generierte)) if (!(k in alt.gen)) delete Spiel.generierte[k];
  }
}
function w4Werkzeug(p, id, opts){
  const c = w4Knoten("div");
  const griff = p.UI.subnetzwerkzeuge.zeichnen(c, id, opts || {});
  return {c, griff, root: c.kinder[0] || null};
}
function w4ElternText(el){ return el ? el.textContent : ""; }

/* ================= Werkzeuge ================= */
gruppe("UI: Subnetting-Werkzeuge", () => {
  pruefe("Werkzeugliste: genau sechs Werkzeuge mit Titel, Kicker, Lernziel, Fertigkeit und Stufe" + W4_ZUSATZ, () => {
    if (!W4_KANN_LADEN) return;
    const p = w4Pruefstand();
    const liste = p.UI.subnetzwerkzeuge.liste();
    erwarte.gleich(liste.map(w => w.id), ["bitlabor", "maskenleiste", "blocklineal", "rechner", "vlsm", "vlan"],
      "feste Reihenfolge aus § 7");
    erwarte.gleich(new Set(liste.map(w => w.titel)).size, 6, "sechs eigene Titel");
    for (const w of liste) {
      for (const feld of ["id", "titel", "kicker", "lead", "skill", "stufe"]) {
        erwarte.wahr(typeof w[feld] === "string" && w[feld].length > 0, w.id + ": " + feld + " fehlt");
      }
      erwarte.wahr(w.lead.length >= 30, w.id + ": Lernziel ist ein ganzer Satz");
      erwarte.wahr(["E", "AP1", "AP2"].includes(w.stufe), w.id + ": unbekannte Stufe");
      erwarte.wahr(w.skill === "lab.subnetz" || w.skill === "lab.vlan", w.id + ": Fertigkeit passt nicht");
    }
    erwarte.gleich(liste.filter(w => w.skill === "lab.vlan").map(w => w.id), ["vlan"], "VLAN-Werkzeug trägt lab.vlan");
  });

  pruefe("Jedes Werkzeug rendert einen vollständigen Rahmen und lässt sich wieder abbauen" + W4_ZUSATZ, () => {
    if (!W4_KANN_LADEN) return;
    const p = w4Pruefstand();
    for (const meta of p.UI.subnetzwerkzeuge.liste()) {
      const {c, griff, root} = w4Werkzeug(p, meta.id, {});
      erwarte.wahr(!!root, meta.id + ": kein Wurzelelement");
      erwarte.wahr(w4Klassen(root).includes("sw"), meta.id + ": Wurzelklasse sw- fehlt");
      erwarte.gleich(root.getAttribute("data-werkzeug"), meta.id, meta.id + ": Kennung am DOM");
      erwarte.wahr(!!root.querySelector(".sw-titel"), meta.id + ": Titel fehlt");
      erwarte.enthaelt(root.querySelector(".sw-titel").textContent, meta.titel, meta.id + ": falscher Titel");
      erwarte.wahr(!!root.querySelector(".sw-lernziel"), meta.id + ": Lernziel fehlt");
      erwarte.enthaelt(root.querySelector(".sw-lernziel").textContent, "Lernziel:", meta.id + ": Lernziel nicht benannt");
      const ergebnis = root.querySelector(".sw-ergebnis");
      erwarte.wahr(!!ergebnis, meta.id + ": Ergebnisanzeige fehlt");
      erwarte.gleich(ergebnis.getAttribute("aria-live"), "polite", meta.id + ": Ergebnisanzeige ohne aria-live");
      /* Eigenständiger Aufruf (ohne onErgebnis/kompakt): voller Kopf, aber KEINE toten
         Fußaktionen – in der Abteilung trägt die Kopfzeile die Aktionen (S1). */
      erwarte.wahr(!root.querySelector(".sw-fuss"), meta.id + ": keine toten Fußaktionen");
      erwarte.wahr(typeof griff.zerstoeren === "function", meta.id + ": zerstoeren fehlt");
      griff.zerstoeren();
      erwarte.gleich(c.kinder.length, 0, meta.id + ": zerstoeren räumt den Container");
    }
  });

  pruefe("Masken-Schieber: Präfix 26 zeigt 255.255.255.192, Block 64 und 62 Hosts; 30 zeigt 255.255.255.252" + W4_ZUSATZ, () => {
    if (!W4_KANN_LADEN) return;
    const p = w4Pruefstand();
    const {root} = w4Werkzeug(p, "maskenleiste", {praefix: 26});
    const ergebnis = root.querySelector(".sw-ergebnis");
    erwarte.enthaelt(ergebnis.textContent, "255.255.255.192", "Maske zu /26");
    erwarte.enthaelt(ergebnis.textContent, "64", "Blockgröße zu /26");
    erwarte.enthaelt(ergebnis.textContent, "62", "nutzbare Hosts zu /26");
    erwarte.enthaelt(ergebnis.textContent, Spiel.subnetz.praefixZuMaske(26), "Anzeige = API-Ausgabe");
    const mbits = root.querySelectorAll(".sw-mbit");
    erwarte.gleich(mbits.length, 32, "32 Maskenbits");
    erwarte.gleich(root.querySelectorAll(".sw-mbit-netz").length, 26, "26 Netzbita");
    /* Regler auf 30 ziehen: Anzeige rechnet sofort neu. */
    const regler = root.querySelector(".sw-regler");
    erwarte.wahr(!!regler, "Regler fehlt");
    regler.value = "30";
    w4Feuern(regler, "input");
    erwarte.enthaelt(root.querySelector(".sw-ergebnis").textContent, "255.255.255.252", "Maske zu /30");
    erwarte.enthaelt(root.querySelector(".sw-ergebnis").textContent, "2", "Hosts zu /30");
    erwarte.gleich(root.querySelector(".sw-regler-wert").textContent, "30", "Reglerwert wird angezeigt");
    /* -1/+1 sind echte Knöpfe und ändern den Präfix. */
    w4Knopf(root, "+1").click();
    erwarte.gleich(root.querySelector(".sw-regler-wert").textContent, "31", "+1 erhöht den Präfix");
  });

  pruefe("Bitlabor: 32 klickbare Bits, Oktett-Dezimalwert reagiert, Maske überlagert 26 Netzbita" + W4_ZUSATZ, () => {
    if (!W4_KANN_LADEN) return;
    const p = w4Pruefstand();
    const {root} = w4Werkzeug(p, "bitlabor", {ip: "192.168.10.0", praefix: 26});
    const bits = root.querySelectorAll(".sw-bit");
    erwarte.gleich(bits.length, 32, "32 Bitknöpfe");
    erwarte.gleich(bits.filter(b => w4Klassen(b).includes("sw-bit-netz")).length, 26, "26 Bit als Netzanteil markiert");
    erwarte.gleich(bits.filter(b => w4Klassen(b).includes("sw-bit-host")).length, 6, "6 Bit als Hostanteil markiert");
    const werte = root.querySelectorAll(".sw-oktett-wert").map(w => w.textContent);
    erwarte.gleich(werte, ["192", "168", "10", "0"], "Oktett-Dezimalwerte stimmen");
    erwarte.enthaelt(root.querySelector(".sw-legende-text").textContent, "Netzanteil: 26 Bit");
    erwarte.enthaelt(root.querySelector(".sw-ergebnis").textContent, Spiel.subnetz.rechnen("192.168.10.0", 26).netz, "Netz-ID vom Rechenkern");
    const raster = root.querySelector(".sw-ergebnis").querySelector(".sw-werte");
    erwarte.wahr(!!raster, "Ergebnis ist ein Werte-Raster (S2)");
    erwarte.gleich(raster.querySelectorAll(".sw-wert").length, 10, "zehn Werte im Raster");
    /* Das höchstwertige Bit (128) ist bei 192 gesetzt; ein Klick nimmt es weg: 192 → 64. */
    const erstes = bits[0];
    erwarte.gleich(erstes.getAttribute("aria-pressed"), "true", "Bit 128 von 192 startet an");
    erstes.click();
    erwarte.gleich(erstes.getAttribute("aria-pressed"), "false", "Klick schaltet das Bit aus");
    erwarte.gleich(root.querySelectorAll(".sw-oktett-wert")[0].textContent, "64", "Dezimalwert des Oktetts folgt dem Bit");
    erwarte.enthaelt(root.querySelector(".sw-ergebnis").textContent, Spiel.subnetz.rechnen("64.168.10.0", 26).netz, "Ergebnis rechnet mit der neuen Adresse");
    erwarte.wahr(w4Klassen(erstes).includes("sw-bit-netz"), "Bit bleibt als Netzanteil gekennzeichnet");
  });

  pruefe("Blocklineal: /26 ergibt vier Blöcke, Marker folgt, Einrasten springt auf die Netz-ID" + W4_ZUSATZ, () => {
    if (!W4_KANN_LADEN) return;
    const p = w4Pruefstand();
    const {root} = w4Werkzeug(p, "blocklineal", {ip: "192.168.10.70", praefix: 26});
    erwarte.gleich(root.querySelectorAll(".sw-block").length, 4, "vier Blöcke bei 64 Adressen");
    erwarte.wahr(String(root.querySelector(".sw-block").attrs.style).includes("width:25%"), "Blockbreite proportional (S9)");
    erwarte.wahr(String(root.querySelector(".sw-marker").attrs.style).includes("left:"), "Marker sitzt prozentual (S9)");
    const leiste = root.querySelector(".sw-adressleiste");
    erwarte.wahr(!!leiste, "Adressleiste fehlt");
    erwarte.gleich(leiste.value, "70", "Adressleiste startet auf 70");
    leiste.value = "100";
    w4Feuern(leiste, "input");
    erwarte.enthaelt(root.querySelector(".sw-ergebnis").textContent, "192.168.10.100", "Adresse folgt der Leiste");
    w4Knopf(root, "Einrasten").click();
    const okt = root.querySelectorAll(".sw-adresse-oktett").map(b => b.textContent);
    erwarte.gleich(okt.join("."), "192.168.10.64", "Einrasten setzt die Netz-ID");
    const ergebnis = root.querySelector(".sw-ergebnis").textContent;
    erwarte.enthaelt(ergebnis, "192.168.10.64", "Netz-ID im Ergebnis");
    erwarte.enthaelt(ergebnis, "192.168.10.127", "Broadcast im Ergebnis");
    /* Blockende setzt die Adresse auf die letzte Adresse des Blocks. */
    w4Knopf(root, "Blockende").click();
    erwarte.gleich(root.querySelectorAll(".sw-adresse-oktett").map(b => b.textContent).join("."), "192.168.10.127", "Blockende = Broadcast");
  });

  pruefe("Rechenweg-Assistent: zeigt die Schritte des Kerns nacheinander und prüft Selbstrechnen" + W4_ZUSATZ, () => {
    if (!W4_KANN_LADEN) return;
    const p = w4Pruefstand();
    const ereignisse = [];
    const {root} = w4Werkzeug(p, "rechner", {ip: "192.168.10.70", praefix: 26,
      onErgebnis: e => ereignisse.push(e)});
    const schritteBox = root.querySelector(".sw-schritte");
    erwarte.gleich(schritteBox.getAttribute("aria-live"), "polite", "aufgedeckte Schritte werden angesagt (S10)");
    erwarte.gleich(schritteBox.getAttribute("role"), "log", "Schrittliste ist eine Log-Region (S10)");
    const erwartet = Spiel.subnetz.rechnen("192.168.10.70", 26);
    erwarte.wahr(erwartet.schritte.length >= 4, "Rechenkern liefert die Schritte");
    erwarte.gleich(root.querySelectorAll(".sw-schritt").length, 0, "vor dem Klick kein Schritt");
    for (let i = 0; i < erwartet.schritte.length; i++) w4Knopf(root, "Nächster Schritt").click();
    erwarte.gleich(root.querySelectorAll(".sw-schritt").length, erwartet.schritte.length, "alle Schritte sichtbar");
    const schritteText = root.querySelector(".sw-schritte").textContent;
    for (const s of erwartet.schritte) erwarte.enthaelt(schritteText, s.titel, "Schritt „" + s.titel + "“ fehlt");
    erwarte.enthaelt(root.querySelector(".sw-fortschritt").textContent, String(erwartet.schritte.length), "Fortschritt nennt die Schrittzahl");
    const ergebnis = root.querySelector(".sw-ergebnis").textContent;
    erwarte.enthaelt(ergebnis, erwartet.netz, "Netz-ID im Ergebnis");
    erwarte.enthaelt(ergebnis, erwartet.broadcast, "Broadcast im Ergebnis");
    erwarte.enthaelt(ergebnis, erwartet.maske, "Maske im Ergebnis");
    /* Selbstrechnen: falsch, dann richtig. */
    const selbst = root.querySelector(".sw-selbst");
    const felder = selbst.querySelectorAll(".sw-ip-feld");
    erwarte.gleich(felder.length, 2, "zwei Felder zum Selbstrechnen");
    felder[0].value = "192.168.10.0";
    felder[1].value = "192.168.10.200";
    w4Knopf(selbst, "Prüfen").click();
    erwarte.enthaelt(root.querySelector(".sw-rueckmeldung").textContent, "stimmt nicht", "falsche Eingabe wird benannt");
    erwarte.wahr(w4Klassen(root.querySelector(".sw-rueckmeldung")).includes("sw-bad"), "falsche Eingabe ist als Fehler markiert");
    felder[0].value = erwartet.netz;
    felder[1].value = erwartet.broadcast;
    w4Knopf(selbst, "Prüfen").click();
    erwarte.enthaelt(root.querySelector(".sw-rueckmeldung").textContent, "Richtig", "richtige Eingabe wird bestätigt");
    erwarte.wahr(w4Klassen(root.querySelector(".sw-rueckmeldung")).includes("sw-ok"), "richtige Eingabe ist als Erfolg markiert");
    erwarte.gleich(ereignisse.length, 1, "ein Ergebnis-Ereignis beim Selbstrechnen");
    erwarte.gleich([ereignisse[0].art, ereignisse[0].id, ereignisse[0].geloest, ereignisse[0].hilfe],
      ["werkzeug", "rechner", true, false], "Ereignisform für das Selbstrechnen");
  });

  pruefe("Adressplaner: drei Bedarfszeilen ergeben einen überlappungsfreien Plan mit Balken und Reserve" + W4_ZUSATZ, () => {
    if (!W4_KANN_LADEN) return;
    const p = w4Pruefstand();
    const {root} = w4Werkzeug(p, "vlsm", {});
    w4Knopf(root, "Plan erzeugen").click();
    const zeilen = w4Alle(root.querySelector(".sw-plan-tabelle"), "tr").filter(tr => tr.attrs["data-netz"]);
    erwarte.gleich(zeilen.length, 3, "drei Planzeilen");
    const bereiche = zeilen.map(tr => {
      const netz = tr.attrs["data-netz"], praefix = Number(tr.attrs["data-praefix"]);
      const r = Spiel.subnetz.rechnen(netz, praefix);
      return {netz: w4IpZuZahl(r.netz), broadcast: w4IpZuZahl(r.broadcast), praefix, name: netz};
    }).sort((a, b) => a.netz - b.netz);
    for (let i = 1; i < bereiche.length; i++) {
      erwarte.wahr(bereiche[i].netz > bereiche[i - 1].broadcast,
        "Plan ohne Überlappung: " + bereiche[i - 1].name + " endet vor " + bereiche[i].name);
    }
    for (let i = 1; i < bereiche.length; i++) {
      erwarte.wahr(bereiche[i].praefix >= bereiche[i - 1].praefix, "vom größten zum kleinsten Bedarf sortiert");
    }
    erwarte.gleich(root.querySelectorAll(".sw-plan-teil").length, 3, "drei Balkenabschnitte");
    erwarte.wahr(root.querySelectorAll(".sw-plan-teil")[0].attrs.style.includes("flex:"), "Balkenbreite folgt dem Bedarf");
    erwarte.enthaelt(root.querySelector(".sw-plan").textContent, "Reserve", "Reserve ist beschriftet");
    const ergebnisText = root.querySelector(".sw-ergebnis").textContent;
    erwarte.enthaelt(ergebnisText, "Reserve", "Reserve steht im Ergebnis");
    /* D2: Standardplan 64 + 32 + 16 = 112 belegt, Basis /24 = 256 → 144 frei. */
    erwarte.enthaelt(ergebnisText, "144", "Reserve ist mit der API gerechnet (144 Adressen frei)");
    erwarte.enthaelt(ergebnisText, "112", "belegte Adressen 112");
    erwarte.falsch(ergebnisText.includes("überbucht"), "gültiger Plan ist nicht überbucht");
    const reserveBalken = root.querySelector(".sw-plan-reserve");
    erwarte.wahr(!!reserveBalken, "Reservebalken ist gezeichnet");
    erwarte.enthaelt(String(reserveBalken.attrs.style), "144", "Reservebalken hat die Breite 144 (D2)");
    erwarte.enthaelt(reserveBalken.textContent, "144", "Reservebalken ist beschriftet");
    /* Zu großer Bedarf: klare Rückmeldung statt Absturz. */
    const basisFeld = root.querySelector(".sw-ip-feld");
    const hostsFelder = root.querySelectorAll(".sw-hosts-feld");
    basisFeld.value = "192.168.10.0/30";
    hostsFelder[0].value = "200";
    w4Knopf(root, "Plan erzeugen").click();
    erwarte.wahr(w4Klassen(root.querySelector(".sw-rueckmeldung")).includes("sw-bad"), "unmöglicher Plan ist als Fehler markiert");
    erwarte.enthaelt(root.querySelector(".sw-rueckmeldung").textContent, "Kein Plan möglich", "Fehler wird erklärt");
  });

  pruefe("VLAN-Werkzeug: acht Ports klickbar, Moduswechsel ändert Zustand, Matrix und Frames folgen" + W4_ZUSATZ, () => {
    if (!W4_KANN_LADEN) return;
    const p = w4Pruefstand();
    const {root} = w4Werkzeug(p, "vlan", {});
    const ports = root.querySelectorAll(".sw-port");
    erwarte.gleich(ports.length, 8, "acht Switch-Ports");
    erwarte.gleich(root.querySelectorAll(".sw-matrix-zelle").length, 64, "8 × 8 Erreichbarkeitsmatrix");
    erwarte.gleich(root.querySelectorAll(".sw-frame").length, 4, "vier Frames mit Tag");
    const tags = root.querySelectorAll(".sw-tag").map(t => t.textContent);
    erwarte.wahr(tags.some(t => t.includes("VLAN")), "Frames tragen eine VLAN-Nummer");
    /* Port 3 auswählen und als Trunk setzen (die Portfläche wird neu gezeichnet). */
    ports[2].click();
    erwarte.gleich(root.querySelectorAll(".sw-port")[2].getAttribute("aria-pressed"), "true", "Port 3 ist ausgewählt");
    erwarte.enthaelt(root.querySelector(".sw-port-panel").textContent, "Port 3", "Panel gehört zu Port 3");
    w4Knopf(root.querySelector(".sw-port-panel"), "Trunk").click();
    erwarte.enthaelt(root.querySelectorAll(".sw-port")[2].textContent, "Trunk", "Port 3 trägt jetzt Trunk");
    const frameB = root.querySelectorAll(".sw-frame").find(f => f.textContent.includes("Frame B"));
    erwarte.wahr(!!frameB, "Frame B vorhanden");
    erwarte.enthaelt(frameB.textContent, "kommt an", "Trunk erreicht das Ziel-VLAN");
    /* Access-VLAN an Port 6 wechseln: Matrix und Status ziehen nach. */
    root.querySelectorAll(".sw-port")[5].click();
    const vlan4 = w4AlleKnoepfe(root.querySelector(".sw-port-panel")).find(b => String(b.textContent).trim() === "VLAN 4");
    erwarte.wahr(!!vlan4, "VLAN-4-Knopf vorhanden");
    vlan4.click();
    erwarte.enthaelt(root.querySelectorAll(".sw-port")[5].textContent, "VLAN 4", "Port 6 steht auf VLAN 4");
    erwarte.enthaelt(root.querySelector(".sw-ergebnis").textContent, "Access-VLANs", "Ergebnis fasst die VLAN-Lage zusammen");
    const matrixText = root.querySelector(".sw-matrix").textContent;
    erwarte.enthaelt(matrixText, "ja", "Matrix zeigt erreichbare Wege");
    erwarte.enthaelt(matrixText, "–", "Matrix zeigt getrennte Wege");
  });

  pruefe("Werkzeugseite und Lektion: kein doppelter Kopf, keine toten Aktionen (S1)" + W4_ZUSATZ, () => {
    if (!W4_KANN_LADEN) return;
    const p = w4Pruefstand();
    for (const meta of p.UI.subnetzwerkzeuge.liste()) {
      /* Werkzeugseite der Abteilung: W3 liefert Kopf und Aktionen, das Werkzeug nur die Bühne. */
      const seite = w4Werkzeug(p, meta.id, {onErgebnis: () => { /* Ereignisse der Fläche */ }});
      erwarte.wahr(w4Klassen(seite.root).includes("sw-eingebettet"), meta.id + ": eingebettet-Klasse");
      erwarte.wahr(!seite.root.querySelector(".sw-kopf"), meta.id + ": kein zweiter Kopf auf der Werkzeugseite");
      erwarte.wahr(!seite.root.querySelector(".sw-titel"), meta.id + ": Titel steht nicht doppelt");
      erwarte.wahr(!seite.root.querySelector(".sw-fuss"), meta.id + ": kein Fuß mit toten Aktionen");
      erwarte.wahr(!!seite.root.querySelector(".sw-buehne"), meta.id + ": Bühne bleibt bedienbar");
      /* Lektion: eine Mikrozeile statt eines zweiten Kopfes, kein Fuß. */
      const lektion = w4Werkzeug(p, meta.id, {kompakt: true});
      const mikro = lektion.root.querySelector(".sw-kopf-mikro");
      erwarte.wahr(!!mikro, meta.id + ": Mikrozeile in der Lektion");
      erwarte.enthaelt(mikro.textContent, meta.titel, meta.id + ": Mikrozeile nennt den Titel");
      erwarte.enthaelt(mikro.textContent, meta.kicker, meta.id + ": Mikrozeile nennt den Kicker");
      erwarte.wahr(!lektion.root.querySelector(".sw-lernziel"), meta.id + ": kein zweites Lernziel in der Lektion");
      erwarte.wahr(!lektion.root.querySelector(".sw-fuss"), meta.id + ": kein Fuß in der Lektion");
    }
  });

  pruefe("Optionen: ip/praefix werden übernommen, kompakt schaltet die dichte Bauform" + W4_ZUSATZ, () => {
    if (!W4_KANN_LADEN) return;
    const p = w4Pruefstand();
    const kompakt = w4Werkzeug(p, "maskenleiste", {praefix: 30, kompakt: true});
    erwarte.wahr(w4Klassen(kompakt.root).includes("sw-kompakt"), "kompakt-Klasse gesetzt");
    erwarte.enthaelt(kompakt.root.querySelector(".sw-ergebnis").textContent, "255.255.255.252", "praefix 30 übernommen");
    const rechner = w4Werkzeug(p, "rechner", {ip: "10.0.0.5", praefix: 24});
    for (let i = 0; i < 6; i++) w4Knopf(rechner.root, "Nächster Schritt").click();
    erwarte.enthaelt(rechner.root.querySelector(".sw-ergebnis").textContent, "10.0.0.0", "IP und Präfix werden übernommen");
    const bit = w4Werkzeug(p, "bitlabor", {ip: "10.20.30.40", praefix: 20});
    erwarte.gleich(bit.root.querySelectorAll(".sw-oktett-wert").map(w => w.textContent), ["10", "20", "30", "40"], "opts.ip gesetzt");
  });

  pruefe("/31 und /32: keine falsche Netz-ID/Broadcast-Beschriftung (D1)" + W4_ZUSATZ, () => {
    if (!W4_KANN_LADEN) return;
    const p = w4Pruefstand();
    const labels = root => root.querySelectorAll(".sw-wert-label").map(l => l.textContent);
    /* Bitlabor /31 */
    const bit = w4Werkzeug(p, "bitlabor", {ip: "192.168.65.0", praefix: 31});
    const bitLabels = labels(bit.root);
    erwarte.wahr(bitLabels.includes("Endpunkt A") && bitLabels.includes("Endpunkt B"), "/31: Endpunkte statt Netz-ID/Broadcast");
    erwarte.falsch(bitLabels.includes("Broadcast"), "/31: kein Broadcast-Etikett im Bitlabor");
    erwarte.enthaelt(bit.root.querySelector(".sw-ergebnis").textContent, "RFC 3021", "/31: RFC-3021-Hinweis im Bitlabor");
    /* Blocklineal /31 */
    const block = w4Werkzeug(p, "blocklineal", {ip: "192.168.65.0", praefix: 31});
    erwarte.wahr(labels(block.root).includes("Endpunkt A"), "/31: Endpunkt A im Blocklineal");
    erwarte.falsch(labels(block.root).includes("Broadcast"), "/31: kein Broadcast-Etikett im Blocklineal");
    /* Rechner /31 (alle Schritte aufdecken) */
    const rechner = w4Werkzeug(p, "rechner", {ip: "192.168.65.0", praefix: 31});
    for (let i = 0; i < 6; i++) w4Knopf(rechner.root, "Nächster Schritt").click();
    erwarte.wahr(labels(rechner.root).includes("Endpunkt A"), "/31: Endpunkt A im Rechner");
    erwarte.falsch(labels(rechner.root).includes("Broadcast"), "/31: kein Broadcast-Etikett im Rechner");
    erwarte.enthaelt(rechner.root.querySelector(".sw-selbst").textContent, "Endpunkt A", "/31: Selbstrechnen fragt Endpunkte");
    /* /32: eine Adresse, kein Broadcast */
    const bit32 = w4Werkzeug(p, "bitlabor", {ip: "10.0.0.1", praefix: 32});
    const labels32 = labels(bit32.root);
    erwarte.falsch(labels32.includes("Broadcast"), "/32: kein Broadcast-Etikett");
    erwarte.enthaelt(bit32.root.querySelector(".sw-ergebnis").textContent, "/32", "/32: Hinweis steht im Ergebnis");
  });

  pruefe("Presets aus Lektion/Formelsammlung kommen an (Didaktik S10)" + W4_ZUSATZ, () => {
    if (!W4_KANN_LADEN) return;
    const p = w4Pruefstand();
    const block = w4Werkzeug(p, "blocklineal", {preset: {ip: "192.168.10.0", praefix: 27}, kompakt: true});
    erwarte.gleich(block.root.querySelectorAll(".sw-block").length, 8, "/27 ergibt acht Blöcke");
    erwarte.gleich(block.root.querySelectorAll(".sw-adresse-oktett").map(b => b.textContent).join("."), "192.168.10.0", "Preset-IP im Lineal");
    const rechner = w4Werkzeug(p, "rechner", {preset: {ip: "192.168.100.0", praefix: 24}, kompakt: true});
    erwarte.gleich(rechner.root.querySelector(".sw-ip-feld").value, "192.168.100.0", "Preset-IP im Rechner");
    for (let i = 0; i < 6; i++) w4Knopf(rechner.root, "Nächster Schritt").click();
    erwarte.enthaelt(rechner.root.querySelector(".sw-ergebnis").textContent, "192.168.100.0", "Rechenweg nutzt das Preset");
    const bit = w4Werkzeug(p, "bitlabor", {preset: {ip: "192.168.100.0", praefix: 24}, kompakt: true});
    erwarte.gleich(bit.root.querySelectorAll(".sw-oktett-wert").map(w => w.textContent), ["192", "168", "100", "0"], "Preset-IP im Bitlabor");
  });

  pruefe("Unbekannte Werkzeug-ID und fehlender Rechenkern: ruhiger Hinweis statt Ausnahme" + W4_ZUSATZ, () => {
    if (!W4_KANN_LADEN) return;
    const p = w4Pruefstand();
    const unbekannt = w4Werkzeug(p, "gibtsnicht", {});
    erwarte.enthaelt(unbekannt.root.textContent, "gibt es nicht", "unbekannte ID wird erklärt");
    const altar = Spiel.subnetz;
    try {
      delete Spiel.subnetz;
      const ohne = w4Werkzeug(p, "maskenleiste", {});
      erwarte.enthaelt(ohne.root.querySelector(".sw-ergebnis").textContent, "Rechenkern", "fehlender Kern wird erklärt");
      erwarte.gleich(ohne.root.querySelectorAll(".sw-mbit").length, 32, "Rahmen bleibt bedienbar");
    } finally {
      Spiel.subnetz = altar;
    }
  });
});
