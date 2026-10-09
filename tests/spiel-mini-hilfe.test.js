"use strict";
/* MINI-TICKETS: Denkhilfe und Lernanker (src/spiel/mini.js, src/ui/leiste.js, src/ui/karriere.js).
   Vertrag: docs/entwicklung/Hilfestellung – Stufen und Schnittstellen.md § 2 und § 5.
   Geprüft wird: die Denkhilfe ist nie die Lösung, sie ist stufenweise (azubi zwei Sprossen je Frage ·
   azubi-plus eine · geselle erst nach einer falschen Antwort · meister keine), der Vorrat meldet frei,
   der Anker nennt eine Quelle und verweist auf UI.wiki.oeffnen. Und beides kommt aus dem echten Weg:
   Leiste (UI.leiste.miniHilfe, gefüllt über den Start-Hörer von UI.karriere) und Mini-Overlay.
   Die Bedingung „erst nach einem Fehler" wird NICHT in mini.js nachgebaut, sondern über
   Spiel.stufe.wannPasst erfragt (§ 2.2) – ein Test prüft, dass der Grund von dort kommt. */

/* ---------------- Prüfstand für die Oberfläche ----------------
   tests/run.js lädt nur die headless-Schichten (bis src/spiel); src/ui/*.js fehlen dort. Leiste und
   Mini-Overlay werden deshalb in einem eigenen Bereich (vm) mit nachgebildetem DOM geladen – geprüft
   werden die Dateien, die im Programm laufen, samt Start-Hörer und Klickwegen.
   Im Browser (web/tests.html) fehlen UI und h; dort wird dieser Abschnitt still übersprungen. */
function miniTestBrauchtVM(){
  try { return typeof require === "function" && typeof document === "undefined"; } catch (e) { return false; }
}
function miniTestKnoten(tag){
  const el = {
    tag, kind: [], attrs: {}, _text: "", className: "", disabled: false, value: "", nodeType: 1, parentNode: null,
    style: {setProperty(){}}, dataset: {}, innerHTML: "",
    append(...k){
      for (const roh of k.flat(Infinity)) {
        if (roh == null || roh === false) continue;
        const x = roh && roh.nodeType ? roh : miniTestTextknoten(roh);
        x.parentNode = el; el.kind.push(x);
      }
    },
    replaceChildren(...k){ el.kind = []; el.append(...k); },
    setAttribute(k, v){ el.attrs[k] = String(v); },
    getAttribute(k){ return el.attrs[k] == null ? null : el.attrs[k]; },
    removeAttribute(k){ delete el.attrs[k]; },
    addEventListener(name, fn){ el["on" + name] = fn; },
    removeEventListener(){},
    remove(){ const p = el.parentNode; if (p) { const i = p.kind.indexOf(el); if (i >= 0) p.kind.splice(i, 1); } },
    classList: {add(c){ el.className = (el.className + " " + c).trim(); }, remove(){}, toggle(){}, contains(){ return false; }},
    querySelector(sel){ const l = []; miniTestSammle(el, sel, l); return l[0] || null; },
    querySelectorAll(sel){ const l = []; miniTestSammle(el, sel, l); return l; },
    set textContent(v){ el._text = String(v); el.kind = []; },
    get textContent(){ return el.kind.length ? el.kind.map(miniTestText).join("") : el._text; },
  };
  return el;
}
function miniTestTextknoten(t){ const n = miniTestKnoten("#text"); n.nodeType = 3; n._text = String(t); return n; }
function miniTestKlassen(el){ return String(el.className || el.attrs.class || "").split(/\s+/).filter(Boolean); }
function miniTestSammle(el, sel, liste){
  const kl = sel.startsWith(".") ? sel.slice(1) : null;
  if (kl && miniTestKlassen(el).includes(kl)) liste.push(el);
  for (const k of el.kind || []) if (k && k.nodeType) miniTestSammle(k, sel, liste);
}
function miniTestText(k){ return k == null ? "" : typeof k === "string" ? k : k.textContent; }
function miniTestH(tag, attrs = {}, ...kinder){
  const el = miniTestKnoten(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") el.className = String(v);
    else if (k === "html") el.innerHTML = String(v);
    else if (k === "style" && typeof v === "object") { /* CSS-Variablen: für den Test bedeutungslos */ }
    else if (k.startsWith("on") && typeof v === "function") el["on" + k.slice(2)] = v;
    else if (k === "value") el.value = v;
    else if (k === "disabled") el.disabled = !!v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...kinder);
  return el;
}
/* Lädt Leiste und Karriere-Oberfläche in einem eigenen Bereich mit nachgebildetem DOM. */
function miniTestOberflaeche(){
  if (!miniTestBrauchtVM()) return null;
  const vm = require("vm"), fs = require("fs"), path = require("path");
  const doc = miniTestKnoten("body");
  doc.body = doc; doc.createElement = tag => miniTestKnoten(tag); doc.createElementNS = (ns, tag) => miniTestKnoten(tag);
  doc.createTextNode = miniTestTextknoten; doc.addEventListener = () => {}; doc.removeEventListener = () => {};
  /* querySelector NICHT überschreiben: der Mini-Dialog wird über document.body gesucht, und
     UI.buehneFrei (hier gestubbt) fragt zusammengesetzte Selektoren ab, die von selbst null ergeben. */
  const gerufen = {ansichten: [], timers: []}, hoerer = {}, fehler = [];
  const UI = {app: {registrieren(){}, einstellungAbschnitt(){}, ansicht: n => gerufen.ansichten.push(n)},
    toast(){}, symbol: () => miniTestKnoten("span"), spiel: {status(){}}, klang: {spielen(){}},
    buehneFrei: () => true, modus(){}, netzplan: {}};
  const Bus = {an: (name, fn) => { (hoerer[name] ||= []).push(fn); return () => {}; }, aus(){}, senden(){}};
  const bereich = {
    UI, Bus, Spiel, DATEN, store, document: doc, h: miniTestH, sv: miniTestH,
    Plattform: {name: "browser", kann: () => ({ja: false, grund: "Test"}), fenster: {groesse: () => Promise.resolve()}},
    klemme: (x, a, b) => Math.min(b, Math.max(a, x)), zahlDe: x => String(x), jetzt,
    setTimeout: (fn, ms) => { gerufen.timers.push({fn, ms}); return gerufen.timers.length; },
    clearTimeout(){}, setInterval: () => 0, clearInterval(){}, requestAnimationFrame: fn => { fn(); return 0; },
    console: {log(){}, warn(){}, error: (...a) => fehler.push(a.map(String).join(" "))}, LABOR_VERSION: "test",
  };
  vm.createContext(bereich);
  const laden = f => vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8"), bereich, {filename: "ui/" + f});
  laden("leiste.js");
  laden("karriere.js");
  return {UI: bereich.UI, doc, gerufen, hoerer, fehler, laden};
}

gruppe("Mini: Denkhilfe und Anker", () => {
  /* Kapsel wie in tests/spiel-*.test.js: eigener Stand, eigene Einstellungen, danach alles zurück. */
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken, speicher: store.get("einst", null)};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand();
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      store.set("einst", alt.speicher || {});
      if (hatStufe()) Spiel.stufe.setzen("azubi", {still: true});
    }
  };
  const hatStufe = () => typeof Spiel.stufe !== "undefined" && Spiel.stufe && typeof Spiel.stufe.setzen === "function";
  const stufe = id => { if (hatStufe()) Spiel.stufe.setzen(id, {still: true}); else Spiel._einst.stufe = id; };
  const klein = x => String(x == null ? "" : x).toLowerCase().replace(/\s+/g, " ").trim();
  /* Nennt der Text die Option wörtlich? Punkt, Schrägstrich und Bindestrich zählen mit, sonst
     schlüge „192.168.1.0“ in „192.168.1.0/24“ falsch an. */
  const nenntOption = (text, option) => {
    const w = klein(option);
    if (w.length < 4) return false;
    return new RegExp("(^|[^a-z0-9./-])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9./-]|$)").test(klein(text));
  };
  const falscheAntwort = m => m.art === "wahl" || m.art === "vorhersage" ? (m.richtig + 1) % m.optionen.length : m.richtig;
  const wahles = id => Spiel.mini.von(id) || Spiel.mini.alle().find(m => m.art === "wahl");
  const optionen = m => m.art === "zuordnen" ? [...m.optionen.links, ...m.optionen.rechts] : m.optionen;

  pruefe("hilfe() ist nie die Lösung – für jedes Mini und jede Sprosse", kapsel(() => {
    stufe("azubi");
    const fehler = [];
    let gesehen = 0, ausschnitte = 0, denkhilfen = 0, rueckfaelle = 0;
    for (const m of Spiel.mini.alle()) {
      const loesung = klein(Spiel.mini.loesungText(m));
      for (let n = 0; n < 3; n++) {
        const h = Spiel.mini.hilfe(m.id);
        if (!h) break;
        gesehen++;
        if (h.text === Spiel.MINI.DENKANSTOSS) rueckfaelle++;
        if (h.art === "ausschnitt") ausschnitte++; else if (h.art === "denkhilfe") denkhilfen++; else fehler.push(`${m.id}: unbekannte Art ${h.art}`);
        if (typeof h.frei !== "boolean") fehler.push(`${m.id}: frei ist ${typeof h.frei}`);
        if (!h.text || !String(h.text).trim()) fehler.push(`${m.id}: leerer Text`);
        if (loesung && klein(h.text).includes(loesung)) fehler.push(`${m.id}: Hilfe verrät die Lösung „${Spiel.mini.loesungText(m)}“`);
        if (h.art === "denkhilfe") {
          /* Eine Denkhilfe darf keine Option wörtlich nennen – sonst ist sie die halbe Lösung. */
          for (const o of optionen(m)) if (nenntOption(h.text, o)) fehler.push(`${m.id}: Denkhilfe nennt die Option „${o}“ wörtlich`);
        } else {
          /* Ein Ausschnitt muss aus der Aufgabe selbst stammen (Frage oder Schnappschuss). */
          const aufgabe = klein([m.frage, m.schnappschuss ? m.schnappschuss.inhalt : ""].join(" \n "));
          if (!aufgabe.includes(klein(String(h.text).split("\n")[0]))) fehler.push(`${m.id}: Ausschnitt stammt nicht aus der Aufgabe`);
        }
      }
      /* azubi hat zwei Sprossen – mehr darf es nicht geben */
      if (Spiel.mini.hilfe(m.id)) fehler.push(`${m.id}: mehr als zwei Sprossen`);
    }
    erwarte.gleich(fehler, []);
    erwarte.wahr(gesehen > 100, `jedes Mini hat Hilfen (${gesehen})`);
    erwarte.wahr(ausschnitte >= 1 && denkhilfen >= 1, `beide Arten kommen vor: ${denkhilfen} Denkhilfen, ${ausschnitte} Ausschnitte`);
    erwarte.wahr(rueckfaelle < 30, `der allgemeine Rückfall bleibt die Ausnahme (${rueckfaelle} von ${gesehen})`);
  }));

  pruefe("stufenweise: azubi zwei Sprossen, azubi-plus eine, meister keine", kapsel(() => {
    const alle = Spiel.mini.alle();
    stufe("azubi");
    erwarte.wahr(!!Spiel.mini.hilfe(alle[0].id), "azubi: erste Sprosse");
    erwarte.wahr(!!Spiel.mini.hilfe(alle[0].id), "azubi: zweite Sprosse");
    erwarte.gleich(Spiel.mini.hilfe(alle[0].id), null, "azubi: danach ist die Frage erschöpft");
    stufe("azubi-plus");
    erwarte.wahr(!!Spiel.mini.hilfe(alle[1].id), "azubi-plus: eine Sprosse");
    erwarte.gleich(Spiel.mini.hilfe(alle[1].id), null, "azubi-plus: keine zweite");
    if (hatStufe()) {
      stufe("meister");
      erwarte.gleich(Spiel.mini.hilfe(alle[2].id), null, "meister: keine Hilfe");
      erwarte.gleich(Spiel.mini.anker(alle[2].id), null, "meister: kein Anker (§ 2)");
    }
  }));

  pruefe("geselle bekommt die Denkhilfe erst nach einer falschen Antwort", kapsel(() => {
    if (!hatStufe()) return;                      /* ohne Baustein A gilt der Rückfall azubi (eigener Test) */
    stufe("geselle");
    const m = wahles("mini-ip-1");
    erwarte.gleich(Spiel.mini.hilfe(m.id), null, "vor der Antwort keine Hilfe");
    erwarte.gleich(Spiel.mini.anker(m.id), null, "vor der Antwort kein Anker");
    const r = Spiel.mini.antworten(m.id, falscheAntwort(m));
    erwarte.falsch(r.richtig, "die Antwort war wirklich falsch");
    const h = Spiel.mini.hilfe(m.id);
    erwarte.wahr(!!h, "nach der falschen Antwort gibt es eine Denkhilfe");
    erwarte.gleich(Spiel.mini.hilfe(m.id), null, "geselle: genau eine Sprosse");
    erwarte.wahr(!!Spiel.mini.anker(m.id), "nach der falschen Antwort gibt es den Anker");
    /* Die Begründung stammt aus dem Stufensystem, nicht aus dieser Datei (Gegenprüfungsbefund B2). */
    if (typeof Spiel.stufe.wannPasst === "function") {
      erwarte.gleich(h.grund, Spiel.stufe.wannPasst("miniHilfe", {fehler: true}).grund, "grund kommt aus Spiel.stufe.wannPasst");
    }
  }));

  pruefe("wannPasst entscheidet, wann die Hilfe erscheint – keine eigene Fehler-Regel mehr", kapsel(() => {
    if (!hatStufe() || typeof Spiel.stufe.wannPasst !== "function") return;   /* ältere Fassung: Rückfall azubi, eigener Test */
    const m1 = wahles("mini-ip-1");
    const m2 = Spiel.mini.alle().find(x => x.art === "wahl" && x.id !== m1.id);
    /* geselle: erst nach einem Fehler */
    stufe("geselle");
    erwarte.gleich(Spiel.stufe.wannPasst("miniHilfe", {fehler: false}).ja, false, "Stufensystem: geselle ohne Fehler");
    erwarte.gleich(Spiel.mini.hilfe(m1.id), null, "geselle ohne Fehler: kein Hilfe-Knopf");
    Spiel.mini.antworten(m1.id, falscheAntwort(m1));
    const h = Spiel.mini.hilfe(m1.id);
    erwarte.wahr(!!h, "geselle nach dem Fehler: Hilfe da");
    erwarte.gleich(h.grund, Spiel.stufe.wannPasst("miniHilfe", {fehler: true}).grund, "den Grund liefert das Stufensystem");
    /* meister: nie, auch nicht nach einem Fehler */
    stufe("meister");
    erwarte.gleich(Spiel.mini.hilfe(m2.id), null, "meister: keine Hilfe");
    erwarte.gleich(Spiel.mini.anker(m2.id), null, "meister: kein Anker");
    /* azubi-plus: sofort, ohne Fehler */
    stufe("azubi-plus");
    erwarte.wahr(!!Spiel.mini.hilfe(m2.id), "azubi-plus: sofort eine Sprosse");
  }));

  pruefe("ohne Baustein A: Rückfall azubi statt Wurf – auch ohne wannPasst", kapsel(() => {
    if (!hatStufe()) return;
    const m = Spiel.mini.alle()[0];
    /* (a) Baustein A ist da, würfelt aber */
    const echt = {rang: Spiel.stufe.rang, darf: Spiel.stufe.darf, wannPasst: Spiel.stufe.wannPasst};
    Spiel.stufe.rang = () => { throw new Error("Baustein A fehlt"); };
    Spiel.stufe.darf = () => { throw new Error("Baustein A fehlt"); };
    Spiel.stufe.wannPasst = () => { throw new Error("Baustein A fehlt"); };
    try {
      erwarte.wahr(!!Spiel.mini.hilfe(m.id), "Hilfe greift auf azubi zurück");
      erwarte.wahr(!!Spiel.mini.anker(m.id), "Anker greift auf azubi zurück");
    } finally { Object.assign(Spiel.stufe, echt); }
    /* (b) Spiel.stufe fehlt ganz */
    const ganz = Spiel.stufe;
    try {
      Spiel.stufe = undefined;
      const h = Spiel.mini.hilfe(m.id);
      erwarte.wahr(!!h, "ohne Spiel.stufe gibt es die azubi-Hilfe");
      erwarte.wahr(!!Spiel.mini.anker(m.id), "ohne Spiel.stufe gibt es den Anker");
      erwarte.gleich(typeof h.text, "string", "und der Text ist brauchbar");
    } finally { Spiel.stufe = ganz; }
  }));

  pruefe("frei meldet den Vorrat der Mini-Runde; nurSehen verbraucht nichts", kapsel(() => {
    stufe("azubi");
    const alle = Spiel.mini.alle();
    const konto = (Spiel.HILFE_KONTO && typeof Spiel.HILFE_KONTO.azubi === "number") ? Spiel.HILFE_KONTO.azubi : Spiel.MINI.HILFE_KONTO.azubi;
    const vorher = Spiel.mini.stand().hilfen.length;
    Spiel.mini.hilfe(alle[0].id, {nurSehen: true});
    Spiel.mini.hilfe(alle[0].id, {nurSehen: true});
    erwarte.gleich(Spiel.mini.stand().hilfen.length, vorher, "nurSehen zählt nicht");
    const gesehen = [];
    for (const m of alle) {
      for (let n = 0; n < 2 && gesehen.length < konto + 1; n++) { const h = Spiel.mini.hilfe(m.id); if (h) gesehen.push(h.frei); }
      if (gesehen.length >= konto + 1) break;
    }
    erwarte.gleich(gesehen.length, konto + 1, `genug Hilfen für den Vorrat (${konto})`);
    erwarte.gleich(gesehen.slice(0, konto), Array(konto).fill(true), "die ersten Hilfen sind frei");
    erwarte.gleich(gesehen[konto], false, "danach ist der Vorrat leer – die Hilfe bleibt trotzdem");
    erwarte.wahr(!!Spiel.mini.hilfe(alle[alle.length - 1].id), "ein leerer Vorrat sperrt nichts");
  }));

  pruefe("anker(): Titel, Text, belegte Quelle und Wiki-Verweis – ohne Wiki-Eintrag kein Wurf", kapsel(() => {
    stufe("azubi");
    const m = wahles("mini-ip-1");
    const a = Spiel.mini.anker(m.id);
    erwarte.wahr(!!a, "es gibt einen Anker");
    erwarte.gleich(a.wiki, m.skill, "verweist auf die Fertigkeit");
    erwarte.gleich(a.quelle, m.quelle, "nennt die Quelle des Tickets");
    erwarte.wahr(a.titel.length > 2 && a.text.length > 20, `Titel und Text sagen etwas (${a.titel} | ${a.text.length})`);
    /* Ohne Wiki-Eintrag: kein Wurf, Quelle bleibt, Wiki-Verweis fällt weg. */
    const gemerkt = DATEN.wiki[m.skill];
    delete DATEN.wiki[m.skill];
    try {
      const b = Spiel.mini.anker(m.id);
      erwarte.wahr(!!b, "auch ohne Wiki-Eintrag gibt es einen Anker");
      erwarte.gleich(b.wiki, null, "ohne Wiki-Eintrag kein Verweis");
      erwarte.gleich(b.quelle, m.quelle, "die Quelle bleibt");
    } finally { DATEN.wiki[m.skill] = gemerkt; }
    erwarte.gleich(Spiel.mini.anker("gibtsnicht"), null, "unbekanntes Ticket -> null");
    erwarte.gleich(Spiel.mini.hilfe("gibtsnicht"), null, "unbekanntes Ticket -> null");
  }));

  pruefe("kein neuer Lernmotor-Aufruf: hilfe() und anker() rühren L.ueben nicht an", kapsel(() => {
    stufe("azubi");
    const m = wahles("mini-ip-1");
    const echt = {ueben: L.ueben, fehler: L.fehler, speichern: Spiel.speichern, melden: Spiel.melden,
      gutschreiben: Spiel.gutschreiben, registrieren: Spiel.skillsRegistrieren};
    let n = 0;
    L.ueben = () => { n++; }; L.fehler = () => {};
    Spiel.speichern = () => {}; Spiel.melden = () => {}; Spiel.gutschreiben = () => {}; Spiel.skillsRegistrieren = () => {};
    try {
      Spiel.mini.hilfe(m.id); Spiel.mini.hilfe(m.id); Spiel.mini.anker(m.id);
      erwarte.gleich(n, 0, "Hilfe und Anker üben nicht mit");
      Spiel._trocken = false;
      Spiel.mini.antworten(m.id, (m.richtig || 0) === 0 ? 1 : 0);
      erwarte.gleich(n, 1, "die Antwort übt genau einmal – der bestehende Weg bleibt");
    } finally {
      Spiel._trocken = true;
      L.ueben = echt.ueben; L.fehler = echt.fehler; Spiel.speichern = echt.speichern; Spiel.melden = echt.melden;
      Spiel.gutschreiben = echt.gutschreiben; Spiel.skillsRegistrieren = echt.registrieren;
    }
  }));
});

gruppe("UI: Mini-Denkhilfe in Leiste und Overlay", () => {
  const oberflaecheKapsel = fn => () => {
    const o = miniTestOberflaeche();
    if (!o) return;                                   /* Browser ohne UI-Module (web/tests.html) */
    const alt = {st: Spiel._st, einst: Spiel._einst, trocken: Spiel._trocken, speicher: store.get("einst", null)};
    try {
      Spiel._trocken = true;
      Spiel._st = Spiel.leererStand();
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn(o);
      erwarte.gleich(o.fehler, [], "kein Fehler im echten Weg");
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._trocken = alt.trocken;
      store.set("einst", alt.speicher || {});
      if (typeof Spiel.stufe !== "undefined" && Spiel.stufe && typeof Spiel.stufe.setzen === "function") Spiel.stufe.setzen("azubi", {still: true});
    }
  };
  /* Der Start der Leiste: UI.leiste aufbauen, dann den echten „ui-bereit"-Hörer aus UI.karriere laufen lassen. */
  const leisteStarten = o => {
    const container = miniTestKnoten("div");
    o.UI.leiste.aufbauen(container);
    for (const fn of o.hoerer["ui-bereit"] || []) fn();
    const t = o.gerufen.timers.find(x => x.ms === 300);
    if (t) t.fn();
    return container;
  };
  const klick = el => { erwarte.wahr(!!el && typeof el.onclick === "function", "Klickziel vorhanden"); el.onclick({preventDefault(){}}); };

  pruefe("Die Leiste hat den Hilfe-Bereich; der echte Start füllt Ticket und Denkhilfe", oberflaecheKapsel(o => {
    erwarte.wahr(!!o.UI.leiste.miniBereich, "UI.leiste.miniBereich");
    erwarte.wahr(!!o.UI.leiste.miniHilfe, "UI.leiste.miniHilfe (§ 5)");
    Spiel.mini.stand().aktuell = "mini-ip-1";
    leisteStarten(o);
    const mini = o.UI.leiste.miniBereich, hilfe = o.UI.leiste.miniHilfe;
    erwarte.wahr(!!mini.querySelector(".mk-frage"), "das Ticket steht in der Leiste");
    erwarte.enthaelt(mini.textContent, Spiel.mini.von("mini-ip-1").frage, "und zeigt die richtige Frage");
    erwarte.gleich(hilfe.querySelectorAll(".mk-hilfe-knopf").length, 1, "genau ein Hilfe-Knopf");
    erwarte.gleich(mini.querySelectorAll(".mk-hilfe-knopf").length, 0, "nicht doppelt im Ticket-Bereich");
  }));

  pruefe("Hilfe-Klick zeigt die Denkhilfe, die Antwort den Lernanker samt Wiki-Weg", oberflaecheKapsel(o => {
    Spiel.mini.stand().aktuell = "mini-ip-1";
    leisteStarten(o);
    const mini = o.UI.leiste.miniBereich, hilfe = o.UI.leiste.miniHilfe;
    const m = Spiel.mini.von("mini-ip-1");
    klick(hilfe.querySelector(".mk-hilfe-knopf"));
    const text = hilfe.querySelector(".mk-hilfe-text");
    erwarte.wahr(!!text, "die Denkhilfe steht da");
    const loesung = String(Spiel.mini.loesungText(m)).toLowerCase();
    erwarte.falsch(String(text.textContent).toLowerCase().includes(loesung), "und verrät die Lösung nicht");
    erwarte.gleich(hilfe.querySelectorAll(".mk-hilfe-knopf").length, 1, "azubi darf eine zweite Sprosse holen");
    klick(hilfe.querySelector(".mk-hilfe-knopf"));
    erwarte.gleich(hilfe.querySelectorAll(".mk-hilfe-knopf").length, 0, "danach ist die Frage erschöpft");
    /* richtig antworten -> Ergebnis und Lernanker */
    const optionen = mini.querySelector(".mk-optionen");
    klick(optionen.kind[m.richtig]);
    erwarte.wahr(!!mini.querySelector(".mk-ergebnis"), "das Ergebnis steht da");
    erwarte.gleich(hilfe.querySelectorAll(".mk-hilfe-knopf").length, 0, "im Ergebnis-Zustand kein Hilfe-Knopf");
    erwarte.wahr(!!hilfe.querySelector(".mk-anker"), "der Lernanker steht nach der Antwort da");
    erwarte.wahr(String(hilfe.querySelector(".mk-anker-quelle").textContent).includes(m.quelle), "mit belegter Quelle");
    const wiki = hilfe.querySelector(".mk-wiki-knopf");
    erwarte.wahr(!!wiki, "mit Wiki-Knopf");
    klick(wiki);
    erwarte.gleich(o.gerufen.ansichten.slice(-1), ["wiki"], "UI.wiki.oeffnen führt in die Wiki-Ansicht");
  }));

  pruefe("Das Mini-Overlay zeigt genau einen Hilfe-Knopf und danach den Anker", oberflaecheKapsel(o => {
    Spiel.mini.stand().aktuell = "mini-ip-1";
    leisteStarten(o);                                     /* Leiste und Overlay teilen sich den Spielstand */
    o.UI.karriere.miniDialog();
    const dialog = o.doc.querySelector(".mk-dialog");
    erwarte.wahr(!!dialog && !!dialog.querySelector(".mk-frage"), "das Overlay zeigt das Ticket");
    erwarte.gleich(dialog.querySelectorAll(".mk-hilfe-knopf").length, 1, "genau ein Hilfe-Knopf im Overlay");
    klick(dialog.querySelector(".mk-hilfe-knopf"));
    erwarte.wahr(!!dialog.querySelector(".mk-hilfe-text"), "die Denkhilfe steht im Overlay");
    const m = Spiel.mini.von("mini-ip-1");
    const optionen = dialog.querySelector(".mk-optionen");
    klick(optionen.kind[m.richtig]);
    erwarte.wahr(!!dialog.querySelector(".mk-anker"), "der Anker steht im Overlay");
    klick(dialog.querySelector(".mk-wiki-knopf"));
    erwarte.gleich(o.gerufen.ansichten.slice(-1), ["wiki"], "der Wiki-Knopf öffnet das Wiki");
  }));
});
