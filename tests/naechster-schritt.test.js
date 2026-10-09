"use strict";
/* NÄCHSTER SCHRITT (Fahrplan 1.3/2.0 · Nutzerauftrag: „Im Labor bzw. dem Baucanvas sollte einem bei
   Bedarf der nächste benötigte Schritt angezeigt werden, z. B. indem ein Computer oder der Menüpunkt
   pulsiert oder ein Pfeil darauf zeigt.")

   WARUM DIE GRUPPENNAMEN „naechster“ IN ASCII SCHREIBEN: der dokumentierte Filter ist eine
   Zeichenkette (`node tests/run.js naechster`, tests/run.js:60) — „Nächster“ mit ä träfe ihn nicht.

   WAS HIER BEWIESEN WIRD
   A. headless (src/spiel/naechster.js) — Quellen sind die vorhandenen Daten, keine neue Wahrheit:
        · Spiel.zieleStatus(inst)         src/spiel/ticket.js:106   → [{ziel, ok, grund, text}]
        · Spiel.plan.abweichungen(inst)   src/spiel/plan.js:193    → gerateAus(diff), :192
        · Spiel.istArbeitsziel(ziel)      src/spiel/arbeitsziele.js:12
      Gemessen (10.10.2026) an `salon-01` ist der Status-Text der Simulation die URSACHE:
      „PC-Kasse → 192.168.178.15:9100: keine Verbindung. An PC-Kasse eth0 steckt kein Kabel. …“ —
      genau das darf der Fingerzeig NICHT sagen (§ 13.3 Punkt 4). Er sagt: „PC-Kasse: „Die Kasse
      druckt Belege auf dem Drucker“ ist noch nicht erreicht.“ Der Fall „Netz-Ziel“ prüft beides:
      dass die Ursache im Status steht (Gegenprobe) und im Fingerzeig fehlt.
   B. Oberfläche (src/ui/netzplan.js): Knopf im Plan, pulsende Marke am Gerät (nst-dran), Zeiger auf
      ein im Labor fehlendes Gerät (nst-zeiger), pulsender Dock-Reiter (nst-puls), Erscheinen NUR auf
      Bedarf (meister nie ungefragt) und Verschwinden, sobald der Schritt getan ist.

   Bauart von tests/ui-training.test.js: die UI-Schicht wird headless NICHT geladen (tests/run.js:42-48
   reicht nur `require` durch) — dieser Test lädt src/ui/netzplan.js selbst in einem vm-Bereich mit
   nachgebildetem DOM. Steht `require` nicht bereit, sagen die Testnamen das ausdrücklich. */

const NST_KANN_LADEN = (() => {
  try { return typeof require === "function" && typeof document === "undefined" && typeof Spiel === "object" && Spiel !== null; }
  catch (e) { return false; }
})();
const NST_ZUSATZ = NST_KANN_LADEN ? "" : " (kein require im Testbereich – UI nur unter node tests/run.js prüfbar)";

/* ================= DOM-Ersatz (nur für den vm-Bereich) ================= */
function nstKnoten(tag){
  const el = {
    nodeType: 1, tag, kinder: [], attrs: {}, listeners: {}, className: "", _text: "", parentNode: null,
    append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.parentNode = el; el.kinder.push(x); } },
    replaceChildren(...k){ el.kinder = []; el.append(...k); },
    remove(){ if (el.parentNode) el.parentNode.kinder = el.parentNode.kinder.filter(x => x !== el); },
    setAttribute(k, v){ el.attrs[k] = String(v); },
    getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
    addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
    click(){ for (const fn of (el.listeners.click || []).slice()) fn({currentTarget: el, target: el, preventDefault(){}, stopPropagation(){}}); },
    querySelector(sel){ return nstFinde(el, sel)[0] || null; },
    querySelectorAll(sel){ return nstFinde(el, sel); },
    get hidden(){ return el.attrs.hidden !== undefined; },
    get children(){ return el.kinder.filter(k => k && k.tag); },
    classList: {
      _l(){ return nstKlassen(el); },
      _s(l){ el.className = l.join(" "); delete el.attrs.class; },
      add(...k){ const l = el.classList._l(); for (const x of k) if (!l.includes(x)) l.push(x); el.classList._s(l); },
      remove(...k){ el.classList._s(el.classList._l().filter(x => !k.includes(x))); },
      contains(x){ return el.classList._l().includes(x); },
    },
    set textContent(v){ el._text = String(v); el.kinder = []; },
    get textContent(){ return el.kinder.length ? el.kinder.map(nstText).join("") : el._text; },
  };
  return el;
}
const nstKlassen = el => String(el.className || (el.attrs && el.attrs.class) || "").split(/\s+/).filter(Boolean);
function nstPasst(el, sel){
  const s = String(sel).trim();
  if (/^[a-z][a-z0-9]*$/i.test(s)) return el.tag === s;
  const teile = s.match(/\.[\w-]+|\[[^\]]+\]/g) || [];
  return teile.length > 0 && teile.every(t => {
    if (t.startsWith(".")) return nstKlassen(el).includes(t.slice(1));
    const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(t);
    return !!m && (m[2] === undefined ? el.attrs[m[1]] !== undefined : el.attrs[m[1]] === m[2]);
  });
}
function nstFinde(el, sel){
  const treffer = [];
  const lauf = k => { for (const x of k.kinder) if (x && x.tag) { if (nstPasst(x, sel)) treffer.push(x); lauf(x); } };
  lauf(el);
  return treffer;
}
function nstText(k){ return k == null ? "" : typeof k === "string" ? k : k.textContent; }
/* h()/sv() mit demselben Vertrag wie src/ui/dom.js: class → className bzw. Attribut, on* → addEventListener. */
function nstH(tag, attrs = {}, ...kinder){
  const el = nstKnoten(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kinder.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : {nodeType: 3, textContent: String(kid)});
  return el;
}
function nstSv(tag, attrs = {}, ...kinder){
  const el = nstKnoten(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "text") el.textContent = v;
    else if (k === "class") el.setAttribute("class", v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (v != null && v !== false) el.setAttribute(k, v);
  }
  for (const kid of kinder.flat(Infinity)) if (kid) el.append(kid.nodeType ? kid : {nodeType: 3, textContent: String(kid)});
  return el;
}

/* ================= Prüfstand (src/ui/netzplan.js in eigenem vm-Bereich) ================= */
function nstPruefstand(inst){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const rufe = [], busHaken = [];
  const ziel = nstKnoten("div");
  const tab = nstKnoten("button");                       /* der Dock-Reiter „Terminal“ */
  tab.setAttribute("data-reiter", "terminal");
  const dokument = {
    createElement: tag => nstKnoten(tag), createElementNS: (ns, tag) => nstKnoten(tag),
    createTextNode: t => ({nodeType: 3, textContent: String(t)}),
    getElementById: () => null, querySelectorAll: () => [],
    querySelector: sel => String(sel).includes("lb-dock-tab") ? tab : null,
    addEventListener(){}, removeEventListener(){},
    body: nstKnoten("body"), documentElement: nstKnoten("html"), activeElement: null,
  };
  const UIstub = {
    labor: {netz: inst.netz, auswahl: null, el: {plan: ziel},
      hervorheben: (liste, ms) => rufe.push(["hervorheben", liste, ms]), dock: id => rufe.push(["dock", id]),
      auswaehlen: id => rufe.push(["auswaehlen", id])},
    spiel: {inst, mappeAuf: reiter => rufe.push(["mappeAuf", reiter])},
    toast: (t, a) => rufe.push(["toast", t, a]),
    geraetebild: () => nstKnoten("g"),
  };
  const bereich = {
    UI: UIstub, h: nstH, sv: nstSv, console,
    document: dokument, Bus: {an: (art, fn) => { busHaken.push({art, fn}); }},
    Spiel, jetzt, requestAnimationFrame: fn => { try { fn(0); } catch (e) { console.error(e); } return 0; },
    setTimeout: () => 0, clearTimeout(){},
  };
  vm.createContext(bereich);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "src", "ui", "netzplan.js"), "utf8"), bereich, {filename: "ui/netzplan.js"});
  return {UI: bereich.UI, ziel, tab, rufe, busHaken, klassen: () => nstKlassen(tab)};
}
const nstKnopf = (el, text) => nstFinde(el, "button").find(b => nstText(b).includes(text)) || null;
const nstRufe = (p, art) => p.rufe.filter(r => r[0] === art);

/* ================= Kapsel: eigener Spielstand, eigene Einstellungen, Uhr fest ================= */
const NST_T0 = Date.UTC(2026, 9, 10, 9, 0, 0);
function nstKapsel(fn){
  const alt = {speicher: store.alles(), st: Spiel._st, einst: Spiel._einst, trocken: Spiel._trocken,
               uhr: jetzt(), gen: Object.assign({}, Spiel.generierte)};
  try {
    jetzt.setzen(NST_T0);
    store.set("einst", {});
    Spiel._einst = null;
    Spiel._trocken = false;                 /* sonst schreibt Spiel.speichern nicht durch (zustand.js:171) */
    Spiel.neu();
    return fn();
  } finally {
    Spiel.generierte = alt.gen;
    for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
    Object.assign(SPEICHER.daten, alt.speicher);
    Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = {}; Spiel._trocken = alt.trocken;
    jetzt.setzen(alt.uhr); jetzt.frei();
  }
}
/* Ein Auftrag, wie ihn das Spiel öffnet (Vorbild tests/spiel-uebergabe.test.js:43-51). */
function nstAuftrag(ticketId){
  const inst = Spiel.instanzErstellen({ticketId, quelle: "postfach"});
  Spiel.oeffnen(inst.iid);
  return inst;
}

gruppe("Spiel: naechster Schritt", () => {
  pruefe("Arbeitsziel: der Schritt ist das erste offene Ziel — mit Gerät, Bereich und Auftrag", () => nstKapsel(() => {
    const inst = nstAuftrag("salon-terminal");
    const offen = Spiel.zieleStatus(inst).filter(s => s.ok !== true);
    const n = Spiel.naechster(inst);
    erwarte.gleich(offen.length, 3, "drei Ziele sind offen");
    erwarte.wahr(!!n, "es gibt einen nächsten Schritt");
    erwarte.gleich(n.ziel, offen[0].ziel, "es ist das erste offene Ziel in der Reihenfolge des Auftrags");
    erwarte.gleich(n.geraet, "kasse", "das Gerät steht am Ziel (arbeitsziele.js:7)");
    erwarte.gleich(n.bereich, "terminal", "ein Befehlsziel gehört ins Terminal");
    erwarte.enthaelt(n.text, "PC-Kasse", "der Text nennt das Gerät");
    erwarte.enthaelt(n.text, "noch nicht ausgeführt", "und was noch zu tun ist");
  }));

  pruefe("Netz-Ziel: der Fingerzeig zeigt auf das abweichende Gerät — und nennt NICHT die Ursache", () => nstKapsel(() => {
    const inst = nstAuftrag("salon-01");
    const n = Spiel.naechster(inst);
    const status = Spiel.zieleStatus(inst).find(s => s.ok !== true);
    erwarte.gleich(n.bereich, "labor", "ein Netz-Ziel gehört ins Labor");
    erwarte.gleich(Spiel.plan.abweichungen(inst)[0], "kasse", "Quelle der Geräte ist der Plan-Vergleich (plan.js:192-193)");
    erwarte.gleich(n.geraet, "kasse", "das Ziel nennt kein Gerät — der Plan schon");
    /* Gegenprobe zuerst: die Ursache STEHT im Status-Text der Simulation … */
    const verraeter = ["kein Kabel", "Medium getrennt"].filter(x => String(status.text).includes(x));
    erwarte.wahr(verraeter.length > 0, "der Status-Text nennt die Ursache (Gegenprobe, sonst prüft der Fall nichts)");
    /* … und im Fingerzeig darf sie NICHT stehen (§ 13.3 Punkt 4). */
    for (const x of verraeter) erwarte.falsch(n.text.includes(x), `„${x}“ steht nicht im Fingerzeig`);
    erwarte.falsch(n.text.includes("192.168.178.15"), "auch keine Adresse aus der Diagnose");
    erwarte.enthaelt(n.text, "noch nicht erreicht", "sondern nur: das Ziel ist offen");
  }));

  pruefe("Nichts offen → ehrlich null (und keine Führung, auch nicht angefordert)", () => nstKapsel(() => {
    const inst = nstAuftrag("salon-terminal");
    Spiel.arbeitszieleErfuellen(inst);
    erwarte.gleich(Spiel.zieleStatus(inst).filter(s => s.ok !== true).length, 0, "alle drei Ziele erfüllt");
    erwarte.gleich(Spiel.naechster(inst), null, "kein nächster Schritt");
    const b = Spiel.naechsterBedarf(inst, {jetztMs: jetzt() + 100 * Spiel.FUEHRUNG_NACH_MS, angefordert: true});
    erwarte.gleich(b.ja, false, "auch angefordert nichts");
    erwarte.gleich(b.schritt, null, "und kein Schritt erfunden");
    erwarte.enthaelt(b.grund, "Nichts offen", "der Grund sagt es ehrlich");
  }));

  pruefe("Deterministisch: zweimal gefragt, zweimal dasselbe (keine Uhr, kein Würfel)", () => nstKapsel(() => {
    const inst = nstAuftrag("salon-01");
    erwarte.gleich(JSON.stringify(Spiel.naechster(inst)), JSON.stringify(Spiel.naechster(inst)), "zweimal gleich");
    erwarte.gleich(Spiel.naechsterWartezeit(inst, jetzt()), 0, "gerade geöffnet: keine Wartezeit");
    erwarte.gleich(Spiel.naechsterWartezeit(inst, jetzt() + 5 * 60 * 1000), 5 * 60 * 1000, "sie ist eine reine Rechnung");
    erwarte.gleich(Spiel.naechsterWartezeit({}, undefined), 0, "ohne Uhr keine Wartezeit");
  }));

  pruefe("Nur auf Bedarf: azubi nach Wartezeit, geselle nach Fehler, meister nie — gefragt bekommt sie jeder", () => nstKapsel(() => {
    const inst = nstAuftrag("salon-terminal");
    const t = jetzt(), spaet = t + 10 * Spiel.FUEHRUNG_NACH_MS;
    Spiel.stufe.setzen("azubi", {still: true});
    erwarte.gleich(Spiel.naechsterBedarf(inst, {jetztMs: t}).ja, false, "azubi: gerade erst angefangen, nichts ungefragt");
    erwarte.gleich(Spiel.naechsterBedarf(inst, {jetztMs: t + Spiel.FUEHRUNG_NACH_MS - 1}).ja, false, "eine Millisekunde zu früh");
    erwarte.gleich(Spiel.naechsterBedarf(inst, {jetztMs: t + Spiel.FUEHRUNG_NACH_MS}).ja, true, "nach der Wartezeit");
    erwarte.enthaelt(Spiel.naechsterBedarf(inst, {jetztMs: t + Spiel.FUEHRUNG_NACH_MS}).grund, "kein Fortschritt", "mit Grund");
    Spiel.stufe.setzen("geselle", {still: true});
    erwarte.gleich(Spiel.naechsterBedarf(inst, {jetztMs: spaet}).ja, false, "geselle: ohne Fehler nichts");
    erwarte.gleich(Spiel.naechsterBedarf(inst, {jetztMs: spaet, fehler: true}).ja, true, "geselle: nach einem Fehler");
    Spiel.stufe.setzen("meister", {still: true});
    erwarte.gleich(Spiel.naechsterWann(), "nein", "meister steht in der Tabelle auf „nie ungefragt“");
    erwarte.gleich(Spiel.naechsterBedarf(inst, {jetztMs: spaet, fehler: true}).ja, false, "meister: nie ungefragt (§ 13.3 Punkt 3)");
    erwarte.gleich(Spiel.naechsterBedarf(inst, {jetztMs: spaet, angefordert: true}).ja, true, "auf Knopfdruck schon — gefragt ist nicht verraten");
    /* Rückfall ohne Baustein A: dann gilt die Einstellung des Menschen, Unbekanntes ist azubi
       (stufensystem.js:52). Der Rückfall wird AUSDRÜCKLICH geprüft, weil er sonst niemand merkt. */
    const echt = Spiel.stufe;
    try {
      delete Spiel.stufe;
      Spiel._einst.stufe = "azubi";
      erwarte.gleich(Spiel.naechsterStufe(), "azubi", "ohne Baustein A gilt die Einstellung");
      erwarte.gleich(Spiel.naechsterWann(), "nachzeit", "azubi sieht sie nach der Wartezeit");
      Spiel._einst.stufe = "gibtsnicht";
      erwarte.gleich(Spiel.naechsterStufe(), "azubi", "unbekannte Stufe → Vertragsrückfall azubi");
      erwarte.gleich(Spiel.naechsterWann(), "nachzeit", "und nie eine geratene Stufe");
      erwarte.gleich(Spiel.naechsterWann("geselle"), "nachfehler", "die Tabelle kennt jede Stufe");
    } finally { Spiel.stufe = echt; }
  }));
});

gruppe("UI: naechster Schritt" + NST_ZUSATZ, () => {
  if (!NST_KANN_LADEN) { pruefe("UI-Nächster-Schritt: nur unter node tests/run.js prüfbar", () => { erwarte.wahr(false, "require fehlt"); }); return; }

  pruefe("Der Knopf steht im Plan — die Führung erst auf Knopfdruck", () => nstKapsel(() => {
    const inst = nstAuftrag("salon-terminal");
    const p = nstPruefstand(inst);
    p.UI.netzplan.zeichnen(p.ziel, inst);
    const k = nstKnopf(p.ziel, "Nächster Schritt");
    erwarte.wahr(!!k, "der Knopf steht im Fuß des Plans");
    erwarte.gleich(nstFinde(p.ziel, ".nst-hinweis").length, 0, "ungefragt und ohne Wartezeit: keine Führung");
    erwarte.gleich(p.busHaken.filter(b => b.art === "befehl").length, 1, "und ein Ohr am Terminal (Fehler-Zustand für geselle)");
  }));

  pruefe("Auf Knopfdruck: Gerät pulsiert im Labor und im Plan, der Menüpunkt leuchtet — erledigt ist alles wieder weg", () => nstKapsel(() => {
    const inst = nstAuftrag("salon-terminal");
    const p = nstPruefstand(inst);
    p.UI.netzplan.zeichnen(p.ziel, inst);
    nstKnopf(p.ziel, "Nächster Schritt").click();
    erwarte.gleich(nstFinde(p.ziel, ".nst-hinweis").length, 1, "die Führung steht da");
    erwarte.enthaelt(nstFinde(p.ziel, ".nst-hinweis")[0].textContent, "PC-Kasse", "mit dem Gerät");
    erwarte.enthaelt(nstFinde(p.ziel, ".nst-hinweis")[0].textContent, "noch nicht ausgeführt", "und dem offenen Schritt");
    const geraet = nstFinde(p.ziel, ".np-geraet").find(g => nstKlassen(g).includes("nst-dran"));
    erwarte.wahr(!!geraet, "genau ein Gerät ist im Plan markiert");
    erwarte.gleich(geraet.getAttribute("data-id"), "kasse", "und es ist das richtige");
    erwarte.gleich(nstRufe(p, "hervorheben").length, 1, "das Labor hebt einmal hervor");
    erwarte.gleich(nstRufe(p, "hervorheben")[0][1][0].geraet, "kasse", "am selben Gerät");
    erwarte.gleich(nstRufe(p, "dock").map(r => r[1]), ["terminal"], "der Menüpunkt wird geöffnet");
    erwarte.wahr(p.klassen().includes("nst-puls"), "und pulsiert");
    /* Schritt getan: der nächste Azubi-Schritt ist keiner mehr → alles verschwindet. */
    Spiel.arbeitszieleErfuellen(inst);
    p.UI.netzplan.zeichnen(p.ziel, inst);
    erwarte.gleich(nstFinde(p.ziel, ".nst-hinweis").length, 0, "erledigt: die Führung ist weg");
    erwarte.gleich(nstFinde(p.ziel, ".nst-dran").length, 0, "nichts pulsiert im Plan");
    erwarte.falsch(p.klassen().includes("nst-puls"), "der Menüpunkt leuchtet nicht mehr");
  }));

  pruefe("Ungefragt erst nach der Wartezeit — und meister bekommt sie nie ungefragt", () => nstKapsel(() => {
    const inst = nstAuftrag("salon-terminal");
    const p = nstPruefstand(inst);
    p.UI.netzplan.zeichnen(p.ziel, inst);
    erwarte.gleich(nstFinde(p.ziel, ".nst-hinweis").length, 0, "azubi, gerade angefangen: nichts");
    jetzt.setzen(NST_T0 + Spiel.FUEHRUNG_NACH_MS + 1);          /* die Uhr des Prüfstands ist dieselbe */
    p.UI.netzplan.zeichnen(p.ziel, inst);
    erwarte.gleich(nstFinde(p.ziel, ".nst-hinweis").length, 1, "nach der Wartezeit erscheint sie von selbst");
    erwarte.gleich(nstFinde(p.ziel, ".nst-dran").length, 1, "das Gerät pulsiert");
    /* Weggemacht bleibt weggemacht: derselbe Stillstand zeigt sie nicht in Schleife. */
    nstKnopf(p.ziel, "Alles klar").click();
    p.UI.netzplan.zeichnen(p.ziel, inst);
    erwarte.gleich(nstFinde(p.ziel, ".nst-hinweis").length, 0, "weggeklickt bleibt weg");
    /* meister: keine ungefragte Führung, aber der Knopf bleibt ehrlich. */
    jetzt.setzen(NST_T0 + 3 * Spiel.FUEHRUNG_NACH_MS);
    Spiel.stufe.setzen("meister", {still: true});
    const q = nstPruefstand(inst);
    q.UI.netzplan.zeichnen(q.ziel, inst);
    erwarte.gleich(nstFinde(q.ziel, ".nst-hinweis").length, 0, "meister: nichts ungefragt");
    nstKnopf(q.ziel, "Nächster Schritt").click();
    erwarte.gleich(nstFinde(q.ziel, ".nst-hinweis").length, 1, "auf Knopfdruck bekommt auch meister den Fingerzeig");
  }));

  pruefe("Fehlt das Gerät im Labor, zeigt ein Zeiger im Plan darauf", () => nstKapsel(() => {
    const inst = nstAuftrag("salon-01");
    const p = nstPruefstand(inst);
    /* Den Punkt der Anzeige herstellen: der Schritt hängt an einem Gerät, das es im Labor nicht gibt. */
    erwarte.wahr(!!Spiel.naechster(inst), "es gibt einen Schritt");
    const weg = Object.keys(inst.netz.geraete).find(id => id !== Spiel.naechster(inst).geraet);
    delete inst.netz.geraete[weg];                    /* ein Gerät aus dem Labor entfernen */
    const echt = Spiel.naechster;
    Spiel.naechster = () => ({geraet: weg, ziel: null, text: "Gerät fehlt im Labor.", bereich: "labor"});
    try {
      p.UI.netzplan.zeichnen(p.ziel, inst);
      nstKnopf(p.ziel, "Nächster Schritt").click();
    } finally { Spiel.naechster = echt; }
    erwarte.gleich(nstFinde(p.ziel, ".nst-zeiger").length, 1, "genau ein Zeiger");
    erwarte.gleich(nstRufe(p, "hervorheben").length, 0, "im Labor gibt es nichts hervorzuheben");
    erwarte.enthaelt(nstFinde(p.ziel, ".nst-hinweis")[0].textContent, "fehlt im Labor", "und der Satz sagt es");
  }));
});
