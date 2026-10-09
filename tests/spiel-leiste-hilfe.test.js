"use strict";
/* LEISTE-ERREICHBARKEIT + TRAININGSERKLÄRUNG (task-22, P2):
   A) Der Hilfe-Knopf steht in der STATUSZEILE (`.lk-zeile`) und ist damit ohne Mausberührung im DOM
      und anklickbar; ein sichtbares Zeichen „Mini" erscheint genau dann, wenn ein Mini-Ticket auf
      Antwort wartet (Review Auffindbarkeit, Befund 5).
   B) Das Trainingsergebnis erklärt einen Fehlversuch: je offenem Ziel `UI.erklaeren(code, niveau)`
      wie im normalen Ergebnisbildschirm, dazu die Gründe über `Spiel.fehlschlaege` JE FERTIGKEIT
      gruppiert (Review Lernwirkung, P2-5). Reine Anzeige – Training zahlt weiter kein Geld und keinen Ruf.

   Geprüft wird die Datei, die im Programm läuft: `src/ui/leiste.js` und `src/ui/training.js` werden in
   einem eigenen Bereich mit echtem `Spiel` und nachgebildetem DOM geladen (tests/run.js gibt dem
   Testbereich seit dem 07.10.2026 `require` mit). Fehlt `require`, sagen die Testnamen das ausdrücklich. */

/* ================= Umgebung ================= */
const LH2_KANN_LADEN = (() => {
  try { return typeof require === "function" && typeof document === "undefined" && typeof Spiel === "object" && Spiel !== null; }
  catch (e) { return false; }
})();
const LH2_ZUSATZ = LH2_KANN_LADEN ? "" : " (kein require im Testbereich – nur unter node tests/run.js)";

/* ================= DOM-Ersatz (nur für den vm-Bereich) ================= */
function lh2Knoten(tag){
  const el = {
    nodeType: 1, tag, kinder: [], attrs: {}, dataset: {}, listeners: {}, className: "", _text: "", hidden: false, title: "",
    parentNode: null,
    style: {setProperty(){}, removeProperty(){}, getPropertyValue(){ return ""; }},
    append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.parentNode = el; el.kinder.push(x); } },
    replaceChildren(...k){ el.kinder = []; el.append(...k); },
    remove(){ if (el.parentNode) el.parentNode.kinder = el.parentNode.kinder.filter(x => x !== el); },
    setAttribute(k, v){ el.attrs[k] = String(v); if (k.startsWith("data-")) el.dataset[k.slice(5).replace(/-(\w)/g, (x, c) => c.toUpperCase())] = String(v); if (k === "hidden") el.hidden = true; },
    getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
    removeAttribute(k){ delete el.attrs[k]; if (k === "hidden") el.hidden = false; },
    addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
    click(){ for (const fn of (el.listeners.click || []).slice()) fn({currentTarget: el, target: el, preventDefault(){}, stopPropagation(){}}); },
    querySelector(sel){ return lh2Finde(el, sel)[0] || null; },
    querySelectorAll(sel){ return lh2Finde(el, sel); },
    classList: {
      _l(){ return String(el.className || "").split(/\s+/).filter(Boolean); },
      _s(l){ el.className = l.join(" "); },
      add(...k){ const l = el.classList._l(); for (const x of k) if (!l.includes(x)) l.push(x); el.classList._s(l); },
      remove(...k){ el.classList._s(el.classList._l().filter(x => !k.includes(x))); },
      toggle(x, an){ const an2 = an === undefined ? !el.classList.contains(x) : !!an; if (an2) el.classList.add(x); else el.classList.remove(x); return an2; },
      contains(x){ return el.classList._l().includes(x); },
    },
    set textContent(v){ el._text = String(v); el.kinder = []; },
    get textContent(){ return el.kinder.length ? el.kinder.map(lh2Text).join("") : el._text; },
    get lastElementChild(){ return el.kinder.filter(k => k && k.tag).slice(-1)[0] || null; },
    get children(){ return el.kinder.filter(k => k && k.tag); },
  };
  return el;
}
function lh2Passt(el, sel){
  const s = String(sel).trim();
  if (/^[a-z][a-z0-9]*$/i.test(s)) return el.tag === s;                   /* reiner Tag-Name, z. B. h4 */
  const teile = s.match(/\.[\w-]+|\[[^\]]+\]/g) || [];
  return teile.length > 0 && teile.every(t => {
    if (t.startsWith(".")) return String(el.className || "").split(/\s+/).includes(t.slice(1));
    const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(t);
    if (!m) return false;
    const wert = m[1] === "hidden" ? (el.hidden ? "" : undefined) : (m[1].startsWith("data-") ? el.dataset[m[1].slice(5)] : el.attrs[m[1]]);
    return m[2] === undefined ? wert !== undefined : String(wert) === m[2];
  });
}
function lh2Finde(el, sel){
  const treffer = [];
  const lauf = k => { for (const x of k.kinder) if (x && x.tag) { if (lh2Passt(x, sel)) treffer.push(x); lauf(x); } };
  lauf(el);
  return treffer;
}
function lh2Text(k){ return k == null ? "" : typeof k === "string" ? k : k.textContent; }

/* ================= Prüfstand ================= */
/* Lädt src/ui/dom.js (echtes h/sv), src/ui/leiste.js und src/ui/training.js in einem eigenen Bereich. */
function lh2Stand(){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const rufe = [], groessen = [], startHaken = [], erklaerungen = [];
  const behaelter = lh2Knoten("div");
  const dokument = {
    createElement: tag => lh2Knoten(tag), createElementNS: (ns, tag) => lh2Knoten(tag),
    createTextNode: t => ({nodeType: 3, textContent: String(t)}),
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    addEventListener(){}, documentElement: Object.assign(lh2Knoten("html"), {dataset: {}}), body: lh2Knoten("body"), activeElement: null,
  };
  const bereich = {
    console: {log(){}, error(){}, warn(){}, info(){}},
    document: dokument, store, Bus, Spiel, L, DATEN, eur, zahlDe, klemme, heute, datumDe, jetzt,
    requestAnimationFrame: fn => { try { fn(0); } catch (e) {} return 0; },
    setTimeout: () => 0, clearTimeout(){},
    Plattform: {name: "browser", kann: () => ({ja: false, grund: "Prüfstand"}), fenster: {groesse: (b, h) => { groessen.push([b, h]); return Promise.resolve(); }}},
  };
  vm.createContext(bereich);
  Object.assign(bereich, {__modus: rufe, __toasts: [], __startHaken: startHaken, __erklaerungen: erklaerungen});
  const quelle = f => fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8");
  vm.runInContext(quelle("dom.js"), bereich, {filename: "ui/dom.js"});
  /* Rahmen-Ersatz: Symbole, Moduswechsel, Toast und Erklärtexte gehören nicht zu diesem Baustein.
     `UI.erklaeren` wird als Attrappe geführt, damit die Verdrahtung (Code + Niveau + DOM) messbar ist. */
  vm.runInContext([
    "UI.symbol = (n, g) => sv('svg', {class: 'sym-' + n, width: g || 16});",
    "UI.modus = m => { globalThis.__modus.push(m); return m; };",
    "UI.toast = (t, a, o) => { globalThis.__toasts.push([t, a, o]); };",
    "UI.erklaeren = (code, niveau) => { globalThis.__erklaerungen.push([code, niveau]); return h('span', {class: 'ex'}); };",
    "UI.app = {registrieren: (n, d) => { globalThis.__startHaken.push(n); }, aktualisieren(){}, ansicht: n => { globalThis.__modus.push('ansicht:' + n); }};",
    "UI.spiel = {oeffnen(iid){ globalThis.__modus.push('spiel:' + iid); }, _S: null, status(){}};",
    "UI.labor = {auftragNeu(){}};",
  ].join("\n"), bereich);
  vm.runInContext(quelle("leiste.js"), bereich, {filename: "ui/leiste.js"});
  vm.runInContext(quelle("training.js"), bereich, {filename: "ui/training.js"});
  vm.runInContext("globalThis.__p = {UI: UI};", bereich);
  return {UI: bereich.__p.UI, behaelter, rufe, groessen, startHaken, erklaerungen, toasts: bereich.__toasts};
}

/* Wegwerf-Spielstand wie in tests/spiel-training.test.js (Training legt echte Instanzen an). */
function lh2Kapsel(fn){
  return () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
                 labor: store.get("labor", null), einstStore: store.get("einst", null)};
    const lern = L.st;
    const lernAlt = JSON.parse(JSON.stringify({units: lern.units, log: lern.log, fehler: lern.fehler, tage: lern.tage, tests: lern.tests}));
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      return fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      store.set("labor", alt.labor); store.set("einst", alt.einstStore);
      lern.units = lernAlt.units; lern.log = lernAlt.log; lern.fehler = lernAlt.fehler; lern.tage = lernAlt.tage; lern.tests = lernAlt.tests;
      store.set("lern", lern);
      jetzt.frei();
    }
  };
}
/* Ein Mini, wie Baustein C es zeichnet: Frage plus Antwortknöpfe – oder (nach der Antwort) das Ergebnis. */
function lh2Mini(art){
  const mk = lh2Knoten("div"); mk.className = "mk";
  const frage = lh2Knoten("p"); frage.className = "mk-frage"; frage.textContent = "Was passiert mit der running-config?";
  const teil = lh2Knoten("div"); teil.className = art;
  mk.append(frage, teil);
  return mk;
}

gruppe("UI: Leiste + Trainingserklärung (task-22)", () => {
  pruefe("Der Hilfe-Knopf steht zugeklappt in der Statuszeile (nicht in .lk-auf) und trägt ein aria-label" + LH2_ZUSATZ, () => {
    if (!LH2_KANN_LADEN) return;
    const p = lh2Stand();
    p.UI.leiste.aufbauen(p.behaelter);
    const zeile = p.behaelter.querySelector(".lk-zeile"), auf = p.behaelter.querySelector(".lk-auf");
    const knoepfe = zeile.querySelectorAll(".lk-hilfe-knopf");
    erwarte.gleich(knoepfe.length, 1, "genau ein Hilfe-Knopf in der Statuszeile");
    erwarte.gleich(auf.querySelectorAll(".lk-hilfe-knopf").length, 0, "und keiner im aufgeklappten Bereich");
    erwarte.gleich(knoepfe[0].getAttribute("aria-label"), "Denkhilfe und Lernanker öffnen");
    erwarte.gleich(knoepfe[0].getAttribute("tabindex"), "-1", "nur Maus, kein Fokusklau");
    erwarte.falsch(!!knoepfe[0].hidden, "zugeklappt sichtbar – nicht hidden");
    erwarte.wahr(!!knoepfe[0].getAttribute("title"), "mit Titel als Hilfe");
  });

  pruefe("Ein Klick auf den Hilfe-Knopf klappt die Leiste auf (320 × 300)" + LH2_ZUSATZ, () => {
    if (!LH2_KANN_LADEN) return;
    const p = lh2Stand();
    p.UI.leiste.aufbauen(p.behaelter);
    const karte = p.behaelter.querySelector(".leiste-karte");
    erwarte.falsch(karte.classList.contains("auf"), "zugeklappt zu Beginn");
    erwarte.gleich(p.groessen, [[300, 56]], "zugeklappt ist 300 × 56 gesetzt");
    p.behaelter.querySelector(".lk-hilfe-knopf").click();
    erwarte.wahr(karte.classList.contains("auf"), "nach dem Klick aufgeklappt");
    erwarte.gleich(p.groessen[p.groessen.length - 1], [320, 300], "und die Fenstergröße zieht nach");
    erwarte.wahr(!!p.UI.leiste.miniHilfe, "der vorhandene Hilfe-Bereich ist da (Inhalt kommt von Baustein C)");
  });

  pruefe("Das „Mini“-Zeichen erscheint nur, wenn ein Mini-Ticket auf Antwort wartet" + LH2_ZUSATZ, () => {
    if (!LH2_KANN_LADEN) return;
    const p = lh2Stand();
    p.UI.leiste.aufbauen(p.behaelter);
    const zeichen = p.behaelter.querySelector(".lk-mini-wartet");
    erwarte.wahr(!!zeichen, "das Zeichen gibt es");
    erwarte.wahr(!!zeichen.hidden, "ohne Mini: versteckt");
    erwarte.gleich(zeichen.getAttribute("aria-label"), "Mini-Ticket wartet auf Antwort");
    erwarte.gleich(zeichen.getAttribute("tabindex"), "-1");
    erwarte.gleich(zeichen.textContent, "Mini");
    /* Antwortknöpfe im Mini-Bereich = es wartet eine Frage. */
    p.UI.leiste.miniBereich.replaceChildren(lh2Mini("mk-optionen"));
    p.UI.leiste.status({offen: 1});
    erwarte.falsch(!!zeichen.hidden, "wartendes Mini: Zeichen sichtbar");
    /* Nach der Antwort zeigt der Bereich das Ergebnis – dann verschwindet das Zeichen. */
    p.UI.leiste.miniBereich.replaceChildren(lh2Mini("mk-ergebnis"));
    p.UI.leiste.status({offen: 1});
    erwarte.wahr(!!zeichen.hidden, "beantwortet: wieder versteckt");
    /* Und der Bereich wird geleert (z. B. anderer Reiter) – ebenfalls kein Zeichen. */
    p.UI.leiste.miniBereich.replaceChildren();
    p.UI.leiste.status({});
    erwarte.wahr(!!zeichen.hidden, "leerer Bereich: versteckt");
  });

  pruefe("Das Zeichen steht in der Statuszeile und klappt beim Klick auf" + LH2_ZUSATZ, () => {
    if (!LH2_KANN_LADEN) return;
    const p = lh2Stand();
    p.UI.leiste.aufbauen(p.behaelter);
    const zeichen = p.behaelter.querySelector(".lk-zeile").querySelector(".lk-mini-wartet");
    erwarte.wahr(!!zeichen, "in .lk-zeile, nicht im aufgeklappten Bereich");
    erwarte.gleich(p.behaelter.querySelector(".lk-auf").querySelector(".lk-mini-wartet"), null);
    zeichen.click();
    erwarte.wahr(p.behaelter.querySelector(".leiste-karte").classList.contains("auf"), "Klick klappt auf");
  });

  pruefe("Die zwei neuen Flächen sind beim Aufbau da und die Zeile bleibt ohne Überlauf-Bedarf" + LH2_ZUSATZ, () => {
    if (!LH2_KANN_LADEN) return;
    const p = lh2Stand();
    p.UI.leiste.aufbauen(p.behaelter);
    const zeile = p.behaelter.querySelector(".lk-zeile");
    /* Reihenfolge: Griff, Ampeln, Werte, Mini-Zeichen, Hilfe, öffnen – die zwei Neuen sitzen VOR „öffnen“. */
    erwarte.gleich(zeile.children.map(k => k.className), ["lk-griff", "lk-ampeln", "lk-werte", "lk-mini-wartet", "lk-hilfe-knopf", "lk-oeffnen"]);
    /* Kein Fokusklau: alle vier Bedienelemente der Statuszeile wollen keinen Tastaturfokus. */
    for (const k of ["lk-hilfe-knopf", "lk-mini-wartet", "lk-oeffnen", "lk-klein"]) {
      const el = p.behaelter.querySelector("." + k);
      if (el) erwarte.gleich(el.getAttribute("tabindex"), "-1", k + " ohne Tastaturfokus");
    }
    /* Abbauen und neu aufbauen darf keine zweite Zeile hinterlassen. */
    p.UI.leiste.abbauen();
    p.UI.leiste.aufbauen(p.behaelter);
    erwarte.gleich(p.behaelter.querySelectorAll(".lk-zeile").length, 1, "ein Neubau, eine Zeile");
    erwarte.gleich(p.behaelter.querySelectorAll(".lk-hilfe-knopf").length, 1);
    erwarte.gleich(p.behaelter.querySelectorAll(".lk-mini-wartet").length, 1);
  });

  pruefe("Das Trainingsergebnis erklärt jeden offenen Punkt (UI.erklaeren je Grund)" + LH2_ZUSATZ, lh2Kapsel(() => {
    if (!LH2_KANN_LADEN) return;
    const p = lh2Stand();
    p.UI.training.ansicht(p.behaelter);
    const s = Spiel.TRAINING.find(t => t.art === "basis") || Spiel.TRAINING[0];
    const start = Spiel.training.starten(s.id);
    erwarte.wahr(start.ok, "Durchgang startet: " + (start.grund || ""));
    p.UI.training.abnehmen(start.iid);                    /* echter Weg über die Oberfläche */
    const karte = p.behaelter.querySelector(".tr-ergebnis");
    erwarte.wahr(!!karte, "die Ergebniskarte steht in der Ansicht");
    const ab = p.UI.training.letztes.abnahme;             /* dieselbe Abnahme, die die Karte zeigt */
    erwarte.falsch(p.UI.training.letztes.bestanden, "ohne Lösung nicht bestanden");
    const offenMitGrund = ab.ergebnisse.filter(e => e.ok === false && e.grund).length;
    erwarte.wahr(offenMitGrund >= 1, "mindestens ein offener Punkt trägt einen Grund: " + JSON.stringify(ab.ergebnisse.map(e => [e.ok, e.grund])));
    erwarte.gleich(p.erklaerungen.length, offenMitGrund, "je offenem Ziel mit Grund genau eine Erklärung");
    erwarte.gleich(p.erklaerungen.map(e => e[1]), Array(offenMitGrund).fill(ab.niveau), "in der Tiefe des Niveaus");
    erwarte.gleich(karte.querySelectorAll(".ex").length, offenMitGrund, "und die Erklärung hängt im DOM");
    const liste = karte.querySelector(".tr-offen");
    /* Titelzeile je Ziel bleibt, jetzt als eigener Absatz (vorher an den Titel geklebt). */
    erwarte.gleich(liste.children.length, ab.ergebnisse.filter(e => e.ok === false).length);
    erwarte.gleich(liste.querySelectorAll(".tr-grund").length, offenMitGrund, "Kurztitel als eigener Absatz");
  }));

  pruefe("Die Gründe sind nach Fertigkeit gruppiert (Spiel.fehlschlaege)" + LH2_ZUSATZ, lh2Kapsel(() => {
    if (!LH2_KANN_LADEN) return;
    const p = lh2Stand();
    const echte = Spiel.fehlschlaege;
    try {
      Spiel.fehlschlaege = () => [
        {skill: "lab.ip", text: "Ziel A – keine Adresse"},
        {skill: "lab.ip", text: "Ziel B – falsche Maske"},
        {skill: "lab.vlan", text: "Ziel C – VLAN fehlt"},
      ];
      p.UI.training.ansicht(p.behaelter);
      const s = Spiel.TRAINING[0];
      const start = Spiel.training.starten(s.id);
      p.UI.training.abnehmen(start.iid);
      const gruppen = p.behaelter.querySelectorAll(".tr-fehler-gruppe");
      erwarte.gleich(gruppen.length, 2, "zwei Fertigkeiten, zwei Gruppen");
      erwarte.gleich(gruppen.map(g => g.getAttribute("data-skill")), ["lab.ip", "lab.vlan"]);
      erwarte.gleich(gruppen.map(g => g.querySelector("h4").textContent), ["IP-Adresse und Maske setzen", "VLANs und Access-Ports"], "Klartextname je Fertigkeit");
      const texte = gruppen.flatMap(g => g.querySelector(".tr-fehler-liste").children.map(li => li.textContent));
      erwarte.gleich(texte, ["Ziel A – keine Adresse", "Ziel B – falsche Maske", "Ziel C – VLAN fehlt"], "alle Gründe, gruppiert");
      erwarte.enthaelt(p.behaelter.querySelector(".tr-fehler").querySelector("summary").textContent, "2 Fertigkeiten");
      erwarte.falsch(p.behaelter.querySelector(".tr-fehler").getAttribute("open") === null, "die Zuordnung ist offen sichtbar");
    } finally { Spiel.fehlschlaege = echte; }
  }));

  pruefe("Das Trainingsergebnis zahlt weiterhin kein Geld und keinen Ruf" + LH2_ZUSATZ, lh2Kapsel(() => {
    if (!LH2_KANN_LADEN) return;
    const p = lh2Stand();
    p.UI.training.ansicht(p.behaelter);
    const start = Spiel.training.starten(Spiel.TRAINING[0].id);
    const vorher = {euro: Spiel.st.euro, ruf: Spiel.st.ruf, erledigt: Spiel.st.erledigt.length};
    p.UI.training.abnehmen(start.iid);
    erwarte.gleich({euro: Spiel.st.euro, ruf: Spiel.st.ruf, erledigt: Spiel.st.erledigt.length}, vorher, "die Anzeige ändert an der Gutschrift nichts");
    erwarte.enthaelt(p.behaelter.querySelector(".tr-ergebnis").textContent, "Training zahlt kein Geld und keinen Ruf");
  }));
});
