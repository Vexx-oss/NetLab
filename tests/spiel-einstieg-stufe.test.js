"use strict";
/* BAUSTEIN F · EINSTIEG: Bildungsstand wählen in Begrüßung und erster Stunde
   (src/spiel/erstestunde.js, src/ui/start.js, src/stil/start.css).
   Vertrag: docs/entwicklung/Hilfestellung – Stufen und Schnittstellen.md § 1, § 2, § 8.

   Zwei Gruppen:
   1. „Spiel: Einstieg Stufenwahl“ – die LOGIK (src/spiel/erstestunde.js, headless): die vier Stufen
      mit je einem Satz, Standard „azubi“, die Wahl über Spiel.stufe.setzen nach einst.stufe, und die
      Anweisungszeile der ersten Stunde je Stufe (azubi: der Weg ausgeschrieben, azubi-plus: derselbe
      Weg knapper, geselle/meister: keine ungefragte Anweisung). Läuft in `node tests/run.js`.
   2. „UI: Stufenwahl in der Begrüßung“ – die OBERFLÄCHE. Sie prüft die ECHTE Begrüßungskarte:
      src/ui/dom.js, src/ui/spiel.js und src/ui/start.js werden in einen eigenen Bereich geladen
      (nachgebildetes DOM) und der echte Weg gegangen – UI.spiel.oeffnen() zeichnet die Karte, der
      Start-Haken aus start.js hängt die vier Stufen hinein, ein Klick setzt den Bildungsstand.

      `node tests/run.js` lädt die ui-Schicht nicht von selbst (SCHICHTEN ohne src/ui), gibt dem
      Testbereich aber seit 07.10.2026 `require`, `__dirname` und `__filename` mit – damit holt sich
      diese Datei die drei ui-Dateien selbst nach und prüft genau die Dateien, die im Programm laufen.
      Ohne `require` (reine Browser-Seite wie web/tests.html, die die ui-Schicht nicht enthält) wird
      der zweite Block übersprungen; er behauptet dann nichts. Lässt sich der Prüfstand bauen und
      scheitert trotzdem, wirft er – ein stiller Sprung wäre grün, ohne geprüft zu haben. */

/* Nur wo `require` da ist, lassen sich die ui-Dateien nachladen (Node-Prüfstand, tests/run.js).
   Auf einer reinen Seite ohne die ui-Schicht ist der zweite Block nicht prüfbar und wird übersprungen. */
function esVM(){
  try { return typeof require === "function"; } catch (e) { return false; }
}

/* ---------------- Nachgebildetes DOM (nur im Prüfstand) ----------------
   Gerade so viel DOM, wie die echten Dateien brauchen: h() aus src/ui/dom.js legt Knoten an,
   src/ui/spiel.js baut damit die Auftragszeile samt Begrüßungskarte. */
function esKlassen(el){ return String((el.attribut && el.attribut.class) || "").split(/\s+/).filter(Boolean); }
function esText(k){ return k == null ? "" : typeof k === "string" ? k : String(k.textContent == null ? "" : k.textContent); }
function esKnoten(tag){
  const el = {
    tag, nodeType: 1, kind: [], attribut: {}, _text: "", _an: {}, hidden: false, dataset: {}, style: {setProperty(){}},
    append(...kinder){ for (const k of kinder) if (k != null && k !== false) el.kind.push(k); },
    replaceChildren(...kinder){ el.kind = []; el.append(...kinder); },
    remove(){ el._weg = true; },
    setAttribute(k, v){ el.attribut[k] = String(v); },
    getAttribute(k){ return k in el.attribut ? el.attribut[k] : null; },
    hasAttribute(k){ return k in el.attribut; },
    removeAttribute(k){ delete el.attribut[k]; },
    addEventListener(art, fn){ el._an[art] = fn; },
    removeEventListener(art){ delete el._an[art]; },
    /* Klick wie mit der Maus: löst genau den Hörer aus, den h()/addEventListener gesetzt hat */
    klick(){ if (el._an.click) el._an.click({stopPropagation(){}, preventDefault(){}}); },
    querySelector(sel){ return esSuche(el, sel, true); },
    querySelectorAll(sel){ return esSuche(el, sel, false); },
    get classList(){
      return {
        toggle: (k, an) => {
          const s = esKlassen(el), drin = s.includes(k), soll = an === undefined ? !drin : !!an;
          if (soll && !drin) s.push(k);
          if (!soll && drin) s.splice(s.indexOf(k), 1);
          el.setAttribute("class", s.join(" "));
          return soll;
        },
        add: k => { const s = esKlassen(el); if (!s.includes(k)) { s.push(k); el.setAttribute("class", s.join(" ")); } },
        remove: k => el.setAttribute("class", esKlassen(el).filter(x => x !== k).join(" ")),
        contains: k => esKlassen(el).includes(k),
      };
    },
    set textContent(v){ el._text = String(v); el.kind = []; },
    get textContent(){ return el.kind.length ? el.kind.map(esText).join("") : el._text; },
  };
  Object.defineProperty(el, "className", {get: () => el.attribut.class || "", set: v => el.setAttribute("class", v)});
  return el;
}
/* Selektoren, die im Spiel vorkommen: tag, .klasse, #id, [attribut="wert"] und Kombinationen. */
function esPasst(el, sel){
  const attrs = String(sel).match(/\[[^\]]+\]/g) || [];
  const teile = String(sel).replace(/\[[^\]]+\]/g, "").match(/^([a-zA-Z][\w-]*)?((?:[.#][\w-]+)*)$/);
  if (!teile) return false;
  if (teile[1] && el.tag !== teile[1]) return false;
  for (const t of (teile[2] || "").match(/[.#][\w-]+/g) || []) {
    if (t[0] === ".") { if (!esKlassen(el).includes(t.slice(1))) return false; }
    else if (el.attribut.id !== t.slice(1)) return false;
  }
  for (const a of attrs) {
    const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(a);
    if (!m) return false;
    if (m[2] === undefined) { if (!(m[1] in el.attribut)) return false; }
    else if (String(el.attribut[m[1]] == null ? "" : el.attribut[m[1]]) !== m[2]) return false;
  }
  return true;
}
function esSuche(el, sel, einer){
  const liste = [];
  const geh = k => { if (!k || !k.tag) return; if (esPasst(k, sel)) liste.push(k); for (const kind of k.kind) geh(kind); };
  for (const kind of el.kind) geh(kind);
  return einer ? (liste[0] || null) : liste;
}
function esDocument(){
  const alle = [];
  return {
    readyState: "loading", body: esKnoten("body"), documentElement: esKnoten("html"), _alle: alle,
    createElement(tag){ const k = esKnoten(tag); alle.push(k); return k; },
    createElementNS(ns, tag){ const k = esKnoten(tag); alle.push(k); return k; },
    createTextNode(text){ return {nodeType: 3, textContent: String(text)}; },
    addEventListener(){}, removeEventListener(){},
    querySelector(sel){ for (let i = alle.length - 1; i >= 0; i--) if (esPasst(alle[i], sel)) return alle[i]; return null; },
    querySelectorAll(sel){ return alle.filter(k => esPasst(k, sel)); },
  };
}

/* ---------------- Prüfstand der Oberfläche ----------------
   Lädt die echten Dateien in einen eigenen Bereich: ui/dom.js (h, sv, UI), ui/spiel.js
   (Auftragszeile und Begrüßungskarte) und ui/start.js (die Wahl und ihr Start-Haken).
   Den Andockbereich UI.labor stellt sonst ui/editor.js – hier zeichnet ihn der Prüfstand nach,
   mit auftragNeu als der einen Stelle, an der #labor-auftrag entsteht.
   Gibt null zurück, wo das nicht geht (kein require/fs/vm) – dann wird der Fall übersprungen. */
function esWelt(){
  if (!esVM()) return null;
  let vm, fs, path;
  try { vm = require("vm"); fs = require("fs"); path = require("path"); } catch (e) { return null; }

  const document = esDocument();
  const labor = {netz: null, _opt: null, knoten: null, werkzeugName: "auswahl"};
  labor.zeichnen = () => { if (!labor._opt) return; const k = esKnoten("div"); k.setAttribute("id", "labor-auftrag"); labor.knoten = k; labor._opt.auftrag(k); };
  labor.laden = (netz, opt) => { labor.netz = netz; labor._opt = opt; labor.zeichnen(); };
  labor.auftragNeu = () => labor.zeichnen();
  labor.werkzeug = n => { labor.werkzeugName = n; };
  labor.hervorheben = () => {}; labor.auffrischen = () => {}; labor.einpassen = () => {};

  /* Der Bus wird geliehen: die geladenen Dateien melden Hörer an („ticket-neu“, „trace“, „ui-bereit“).
     Blieben die im gemeinsamen Testkontext stehen, feuerten sie später weiter – auch in fremden Tests.
     Jede Anmeldung wird gemerkt und nach dem Fall wieder abgemeldet. */
  const ab = [];
  const BusLeih = {
    an(name, fn){ const weg = Bus.an(name, fn); ab.push(weg); return weg; },
    aus: (name, fn) => Bus.aus(name, fn),
    senden: (name, daten) => Bus.senden(name, daten),
  };
  const bereich = {
    document, console, Spiel, DATEN, Bus: BusLeih, store, Modell, eur, zahlDe, Zufall, tief, jetzt,
    Plattform: {abzeichen(){}, an(){}, kann: () => ({ja: false}), fenster: {zeigen(){}}},
    setTimeout: () => 0, clearTimeout(){}, setInterval: () => 0, clearInterval(){}, requestAnimationFrame: () => 0,
  };
  const lies = rel => fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
  vm.createContext(bereich);
  vm.runInContext(lies("src/ui/dom.js"), bereich, {filename: "ui/dom.js"});
  /* `const UI = {}` in ui/dom.js wird zu einer LEXIKALISCHEN Bindung der Skript-Umgebung. Sie ist
     keine Eigenschaft des Kontext-Objekts: `bereich.UI` und `this.UI` sind beide `undefined`, nur der
     Name `UI` trifft sie. Deshalb wird sie über den Namen geholt (gemessen 07.10.2026: this.UI =
     undefined, UI = object). Schlägt das fehl, ist das ein Fehler – nicht stillschweigend überspringen:
     ein übersprungener Fall wäre grün, ohne etwas geprüft zu haben. */
  const UI = vm.runInContext("UI", bereich);
  if (!UI || typeof UI !== "object") throw new Error("ui/dom.js hat kein UI im Bereich angelegt");
  UI.labor = labor;
  UI.app = {aktuell: "labor", status(){}, aktualisieren(){}, registrieren(){}, einstellungAbschnitt(){},
    ansicht(n){ UI.app.aktuell = n; }, dialogOeffnen(){}, dialogZu(){}};
  UI.toast = () => {}; UI.symbol = () => esKnoten("span");
  UI.ebenen = {fuerSkills: () => null}; UI.blatt = {zeichnen(){}}; UI.wiki = {oeffnen(){}};
  vm.runInContext(lies("src/ui/spiel.js"), bereich, {filename: "ui/spiel.js"});
  const vorher = (UI.startHaken || []).length;
  vm.runInContext(lies("src/ui/start.js"), bereich, {filename: "ui/start.js"});
  if (typeof UI.spiel !== "object" || typeof UI.einstiegStufe !== "object") throw new Error("ui/spiel.js oder ui/start.js hat sich nicht angemeldet");
  return {document, UI, labor, haken: (UI.startHaken || []).slice(vorher),
    abmelden(){ for (const weg of ab.splice(0)) { try { weg(); } catch (e) { /* war schon abgemeldet */ } } }};
}

/* Baut die Welt, führt den Fall aus und meldet danach die geliehenen Bus-Hörer ab – damit bleibt die
   Gruppe unabhängig von der Reihenfolge der Testdateien. Ohne `require` (reine Seite ohne ui-Schicht)
   ist der Fall nicht prüfbar und wird übersprungen; lässt er sich bauen und scheitert, wirft es. */
function mitWelt(fn){
  const welt = esWelt();
  if (!welt) return;
  try { fn(welt); } finally { welt.abmelden(); }
}

gruppe("Spiel: Einstieg Stufenwahl", () => {
  /* Kapsel wie in tests/spiel-*.test.js: eigener Stand, eigene Einstellungen, danach alles zurück. */
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken, speicher: store.get("einst", null)};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand();
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      Spiel._einst.stufe = undefined;
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      store.set("einst", alt.speicher || {});
    }
  };
  const saetze = t => String(t).split(/[.!?]+\s/).filter(s => s.trim()).length;

  pruefe("Die vier Stufen stehen zur Wahl – jede mit genau einem Satz, Standard ist azubi", kapsel(() => {
    erwarte.gleich(Spiel.einstiegStufe(), "azubi", "ohne Wahl gilt der Standard");
    const liste = Spiel.einstieg.stufen();
    erwarte.gleich(liste.map(s => s.id), ["azubi", "azubi-plus", "geselle", "meister"], "die vier Stufen in Vertragsreihenfolge");
    erwarte.gleich(liste.map(s => s.rang), [1, 2, 3, 4], "Rang 1..4 (Zahlen sind Vertrag)");
    erwarte.gleich(liste.map(s => s.kurz), ["Azubi", "Azubi+", "Geselle", "Meister"], "Kurznamen für die Knöpfe");
    erwarte.gleich(liste.map(s => s.name), ["Azubi (1. Lehrjahr)", "Azubi (fortgeschritten)", "Geselle / Prüfungsvorbereitung", "Meister / Profi"],
      "Namen wie in Spiel.STUFE (Baustein A)");
    for (const s of liste) {
      erwarte.wahr(typeof s.satz === "string" && s.satz.length > 30, `${s.id}: ein Satz, was sich ändert`);
      erwarte.wahr(saetze(s.satz) <= 2, `${s.id}: höchstens zwei Sätze (${saetze(s.satz)})`);
      erwarte.gleich(Spiel.einstieg.stufeSatz(s.id), s.satz, `${s.id}: stufeSatz liefert genau diesen Satz`);
    }
    /* Eine Kopie darf die Liste nicht verändern */
    const kopie = Spiel.einstieg.stufen();
    kopie[0].satz = "kaputt"; kopie[1].id = "quatsch"; kopie.push({id: "x"});
    erwarte.gleich(Spiel.einstieg.stufen().length, 4, "die Liste bleibt vier Stufen lang");
    erwarte.gleich(Spiel.einstieg.stufen()[0].satz, liste[0].satz, "und unverändert");
    /* Unbekannte Stufe -> Satz von azubi, ohne Wurf */
    erwarte.gleich(Spiel.einstieg.stufeSatz("gibtsnicht"), liste[0].satz, "Rückfall azubi");
    erwarte.gleich(Spiel.einstieg.stufeSatz(), liste[0].satz, "ohne Argument der Standard");
    Spiel.stufe.setzen("geselle");
    erwarte.gleich(Spiel.einstieg.stufeSatz(), liste[2].satz, "ohne Argument die eingestellte Stufe");
  }));

  pruefe("stufeWaehlen schreibt über Spiel.stufe.setzen nach einst.stufe (und zieht die Erklärtiefe nach)", kapsel(() => {
    const echtes = Spiel.stufe.setzen, gerufen = [];
    Spiel.stufe.setzen = function(id, o){ gerufen.push(id); return echtes.call(Spiel.stufe, id, o); };
    try {
      erwarte.gleich(Spiel.einstieg.stufeWaehlen("meister"), "meister", "die Wahl wird bestätigt");
      erwarte.gleich(gerufen, ["meister"], "genau ein Aufruf, und zwar über Spiel.stufe.setzen (nie direkt in den Store)");
      erwarte.gleich(Spiel.einst.stufe, "meister", "sie steht in einst.stufe");
      erwarte.gleich(Spiel.einst.niveau, "AP2", "die Erklärtiefe ist mitgezogen");
      erwarte.gleich(Spiel.einstiegStufe(), "meister", "der Baustein liest dieselbe Stufe");
      /* Unbekannte oder fehlende ID -> azubi, kein Wurf */
      erwarte.gleich(Spiel.einstieg.stufeWaehlen("gibtsnicht"), "azubi", "Rückfall statt Wurf");
      erwarte.gleich(Spiel.einst.stufe, "azubi");
      erwarte.gleich(Spiel.einstieg.stufeWaehlen(), "azubi", "auch ohne Argument kein Wurf");
      erwarte.gleich(gerufen, ["meister", "azubi", "azubi"], "jede Wahl ging über Baustein A");
    } finally { Spiel.stufe.setzen = echtes; }
  }));

  pruefe("Ohne Baustein A: die Wahl schreibt über den offiziellen Setter und fällt auf azubi zurück", kapsel(() => {
    const echtes = Spiel.stufe;
    try {
      delete Spiel.stufe;
      erwarte.gleich(typeof Spiel.stufe, "undefined", "Baustein A ist weg");
      erwarte.gleich(Spiel.einstiegStufe(), "azubi", "Rückfall azubi statt Wurf");
      erwarte.gleich(Spiel.einstieg.stufen().length, 4, "die vier Namen stehen auch ohne A bereit");
      erwarte.wahr(Spiel.einstieg.stufen()[3].satz.length > 30, "mit Satz");
      erwarte.gleich(Spiel.einstieg.stufeWaehlen("geselle"), "geselle", "die Wahl greift trotzdem");
      erwarte.gleich(Spiel.einst.stufe, "geselle", "über Spiel.einstSetzen in einst.stufe");
      erwarte.gleich(Spiel.einstieg.hinweisFuer({id: Spiel.EINSTIEG_TICKET}), null, "geselle bekommt keine ungefragte Anweisung");
      /* einst.stufe auf Unsinn: es bleibt bei azubi, nichts wirft */
      Spiel._einst.stufe = "profi";
      erwarte.gleich(Spiel.einstiegStufe(), "azubi", "Unsinn fällt auf azubi zurück");
    } finally { Spiel.stufe = echtes; }
  }));

  pruefe("Die Wahl steht auf der Begrüßungskarte – danach nie wieder", kapsel(() => {
    const st = Spiel.st;
    erwarte.wahr(Spiel.einstieg.stufeNoetig(st), "frischer Stand: die Karte und damit die Wahl kommen");
    Spiel.einstieg.stufeWaehlen("azubi-plus");
    erwarte.wahr(Spiel.einstieg.stufeNoetig(st), "die Wahl allein schließt die Karte nicht");
    erwarte.gleich(Spiel.einstieg.waehlen("auftrag", st), "auftrag", "erst der Weg schließt sie");
    erwarte.falsch(Spiel.einstieg.stufeNoetig(st), "danach nie wieder");
    /* Ein alter Stand (Einstieg vorbei oder Aufträge erledigt) sieht die Wahl nicht */
    const alt = Spiel.migrieren({euro: 10, erledigt: [{id: "salon-02", sterne: 3}], postfach: []});
    erwarte.falsch(Spiel.einstieg.stufeNoetig(alt), "wer schon gespielt hat, bekommt keine Wahlkarte");
    const fertig = Spiel.leererStand();
    fertig.einstieg.fertig = true;
    erwarte.falsch(Spiel.einstieg.stufeNoetig(fertig), "fertiger Einstieg: keine Wahlkarte");
  }));

  pruefe("Anweisungszeile: azubi den Weg, azubi-plus knapper, geselle und meister keine", kapsel(() => {
    const T = Spiel.EINSTIEG_TEXTE, def = {id: Spiel.EINSTIEG_TICKET};
    Spiel.stufe.setzen("azubi");
    erwarte.gleich(Spiel.einstieg.anweisung(def), {stufe: "azubi", text: T.HINWEIS}, "azubi: der Weg ausgeschrieben");
    erwarte.gleich(Spiel.einstieg.hinweisFuer(def), T.HINWEIS, "hinweisFuer bleibt für azubi wie bisher");
    Spiel.stufe.setzen("azubi-plus");
    erwarte.gleich(Spiel.einstieg.anweisung(def), {stufe: "azubi-plus", text: T.HINWEIS_KNAPP}, "azubi-plus: derselbe Weg, knapper");
    erwarte.wahr(T.HINWEIS_KNAPP.length < T.HINWEIS.length, "und wirklich kürzer");
    for (const id of ["geselle", "meister"]) {
      Spiel.stufe.setzen(id);
      erwarte.gleich(Spiel.einstieg.anweisung(def), null, `${id}: keine ungefragte Anweisung`);
      erwarte.gleich(Spiel.einstieg.hinweisFuer(def), null, `${id}: auch hinweisFuer schweigt`);
    }
    /* Nur der Einstiegsauftrag hat diese Zeile */
    Spiel.stufe.setzen("azubi");
    erwarte.gleich(Spiel.einstieg.anweisung({id: "salon-02"}), null, "andere Aufträge bekommen sie nicht");
    erwarte.gleich(Spiel.einstieg.anweisung(null), null, "ohne Auftrag kein Hinweis");
  }));

  pruefe("Die erste Stunde kennt ihre Anweisungszeile: der Kabel-Schritt, sonst keiner", kapsel(() => {
    const T = Spiel.EINSTIEG_TEXTE;
    Spiel.stufe.setzen("azubi");
    erwarte.gleich(Spiel.ersteStunde.anweisung(), {stufe: "azubi", text: T.HINWEIS}, "ohne Argument: der erste offene Schritt (Kabel)");
    erwarte.gleich(Spiel.ersteStunde.anweisung("kabel"), {stufe: "azubi", text: T.HINWEIS}, "Schritt „kabel“ (Ticket salon-01)");
    for (const id of ["stoerung", "hotline", "fernwartung", "variante", "empfehlung"])
      erwarte.gleich(Spiel.ersteStunde.anweisung(id), null, `Schritt „${id}“ erklärt sich selbst`);
    Spiel.stufe.setzen("meister");
    erwarte.gleich(Spiel.ersteStunde.anweisung("kabel"), null, "meister bekommt auch hier keine Anweisung");
    Spiel.stufe.setzen("azubi-plus");
    erwarte.gleich(Spiel.ersteStunde.anweisung("kabel").text, T.HINWEIS_KNAPP, "azubi-plus: knapper Weg");
  }));

  pruefe("Kein Hinweistext verrät die Lösung (Kasse/Drucker) – und keiner ist eine Textwand", kapsel(() => {
    const T = Spiel.EINSTIEG_TEXTE;
    for (const stufe of ["azubi", "azubi-plus"]) {
      Spiel.stufe.setzen(stufe);
      const text = Spiel.einstieg.anweisung({id: Spiel.EINSTIEG_TICKET}).text;
      erwarte.enthaelt(text, "Kabel", `${stufe}: das Werkzeug wird genannt`);
      for (const spoiler of ["Kasse", "kasse", "Drucker", "drucker"])
        erwarte.falsch(text.includes(spoiler), `${stufe}: die Anweisung verrät „${spoiler}“ nicht`);
      erwarte.wahr(saetze(text) <= 2, `${stufe}: höchstens zwei Sätze`);
    }
    erwarte.wahr(saetze(T.STUFE_FRAGE) <= 2, `die Frage über der Wahl bleibt kurz (${saetze(T.STUFE_FRAGE)})`);
    erwarte.falsch(/null|undefined/.test(T.STUFE_FRAGE), "kein null/undefined im Text");
  }));
});

gruppe("UI: Stufenwahl in der Begrüßung", () => {
  /* Läuft nur, wo die ui-Schicht geladen und der Prüfstand baubar ist (require/fs/vm).
     Sonst wird der Fall still übersprungen – siehe Kasten im Dateikopf. */
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken, speicher: store.get("einst", null)};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand();
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      Spiel._einst.stufe = undefined;
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      store.set("einst", alt.speicher || {});
    }
  };
  const oeffnen = welt => { const i = Spiel.instanzErstellen({ticketId: Spiel.EINSTIEG_TICKET, quelle: "postfach"}); welt.UI.spiel.oeffnen(i.iid, {ansicht: false}); return i; };

  pruefe("Die vier Stufen stehen in der ECHTEN Begrüßungskarte (Weg: UI.spiel.oeffnen)", kapsel(() => mitWelt(welt => {
    /* Der Start-Haken aus start.js ist registriert und richtet den Anschluss ein – so wie UI.starten es tut */
    erwarte.gleich(welt.haken.length, 1, "start.js meldet genau einen Start-Haken an");
    welt.haken.forEach(fn => fn());
    erwarte.gleich(welt.labor.auftragNeu.__einstiegStufe, true, "der Anschluss hängt an UI.labor.auftragNeu");

    oeffnen(welt);
    const karte = welt.labor.knoten.querySelector(".sp-einstieg-start");
    erwarte.wahr(!!karte, "die Begrüßungskarte steht in der Auftragszeile");
    erwarte.enthaelt(karte.textContent, Spiel.EINSTIEG_TEXTE.BEGRUESSUNG, "mit der bestehenden Begrüßung");
    const wahl = karte.querySelector(".sp-stufe");
    erwarte.wahr(!!wahl, "die Wahl sitzt IN dieser Karte, nicht daneben");
    erwarte.gleich(wahl.getAttribute("data-stufe"), "azubi", "sie startet auf azubi");
    const knoepfe = karte.querySelectorAll(".sp-stufe-knopf");
    erwarte.gleich(knoepfe.length, 4, "vier Stufen zur Wahl");
    erwarte.gleich(knoepfe.map(b => b.textContent), ["Azubi", "Azubi+", "Geselle", "Meister"]);
    erwarte.gleich(knoepfe.map(b => b.getAttribute("aria-checked")), ["true", "false", "false", "false"], "azubi steht vorn");
    erwarte.gleich(karte.querySelectorAll(".sp-stufe-satz").length, 1, "genau EIN Satz zur Stufe");
    erwarte.enthaelt(karte.querySelector(".sp-stufe-satz").textContent, "sechs Hilfen", "und er nennt, was sich ändert");
    erwarte.enthaelt(karte.querySelector(".sp-stufe-frage").textContent, "Umstellen", "mit dem Hinweis, dass es umstellbar bleibt");
    const wegen = karte.querySelectorAll("button").filter(b => b.textContent === Spiel.EINSTIEG_TEXTE.WEG_AUFTRAG || b.textContent === Spiel.EINSTIEG_TEXTE.WEG_UMSEHEN);
    erwarte.gleich(wegen.length, 2, "die zwei bestehenden Wege bleiben unberührt");
    erwarte.gleich(karte.querySelectorAll("button").length, 6, "vier Stufen + die zwei Wege, sonst nichts");
  })));

  pruefe("Ein Klick auf „Meister“ setzt die Stufe über Spiel.stufe.setzen – die Karte bleibt stehen", kapsel(() => mitWelt(welt => {
    welt.haken.forEach(fn => fn());
    oeffnen(welt);
    const karte = welt.labor.knoten.querySelector(".sp-einstieg-start");
    const knoepfe = karte.querySelectorAll(".sp-stufe-knopf");

    const echtes = Spiel.stufe.setzen, gerufen = [];
    Spiel.stufe.setzen = function(id, o){ gerufen.push(id); return echtes.call(Spiel.stufe, id, o); };
    try { knoepfe[3].klick(); } finally { Spiel.stufe.setzen = echtes; }
    erwarte.gleich(gerufen, ["meister"], "die Wahl geht über Spiel.stufe.setzen");
    erwarte.gleich(Spiel.einst.stufe, "meister", "und landet in einst.stufe");
    erwarte.gleich(Spiel.einst.niveau, "AP2", "die Erklärtiefe zieht nach");
    erwarte.gleich(knoepfe.map(b => b.getAttribute("aria-checked")), ["false", "false", "false", "true"], "die Auswahl wandert mit");
    erwarte.gleich(knoepfe[3].getAttribute("class"), "sp-stufe-knopf an", "der gewählte Knopf ist sichtbar markiert");
    erwarte.enthaelt(karte.querySelector(".sp-stufe-satz").textContent, "ohne Netz", "der Satz der neuen Stufe steht da");
    erwarte.wahr(!!welt.labor.knoten.querySelector(".sp-einstieg-start"), "die Begrüßungskarte bleibt stehen (erst der Weg schließt sie)");
  })));

  pruefe("„Zeig mir den ersten Auftrag“ schließt die Karte – die Wahl kommt nie wieder", kapsel(() => mitWelt(welt => {
    welt.haken.forEach(fn => fn());
    oeffnen(welt);
    const karte = welt.labor.knoten.querySelector(".sp-einstieg-start");
    Spiel.einstieg.stufeWaehlen("azubi-plus");
    const weg = karte.querySelectorAll("button").find(b => b.textContent === Spiel.EINSTIEG_TEXTE.WEG_AUFTRAG);
    erwarte.wahr(!!weg, "der bestehende Weg-Knopf ist noch da");
    weg.klick();
    erwarte.gleich(Spiel.einstieg.daten().begruessung, "auftrag", "die Wahl des Wegs steht im Spielstand");
    erwarte.falsch(Spiel.einstieg.stufeNoetig(), "die Wahl ist damit vorbei");
    erwarte.gleich(welt.labor.knoten.querySelector(".sp-einstieg-start"), null, "und die Karte ist aus der Auftragszeile verschwunden");
    erwarte.gleich(Spiel.einst.stufe, "azubi-plus", "die Stufe bleibt gesetzt (Voreinstellung, kein Kartenzustand)");
  })));

  pruefe("Anweisungszeile der ersten Stunde im Programm: azubi unverändert, azubi-plus knapper, geselle/meister still", kapsel(() => mitWelt(welt => {
    welt.haken.forEach(fn => fn());
    const T = Spiel.EINSTIEG_TEXTE;
    const zeigen = stufe => {
      /* Stand wie nach Station 1: die Begrüßung ist entschieden, der erste Auftrag läuft mit Coach */
      Spiel._st = Spiel.leererStand();
      Spiel._st.einstieg.begruessung = "auftrag";
      Spiel._lz = {};
      Spiel.stufe.setzen(stufe);
      oeffnen(welt);
      const coach = welt.labor.knoten.querySelector(".sp-coach[data-hinweisquelle=\"coach\"]");
      const blase = coach ? coach.querySelector(".sp-blase") : null;
      return {coach, text: blase ? blase.textContent : null};
    };
    const a = zeigen("azubi");
    erwarte.wahr(!!a.coach, "azubi: die Anweisungszeile steht");
    erwarte.gleich(a.text, T.HINWEIS, "azubi: der Weg, unverändert");
    erwarte.falsch(a.coach.hidden === true, "azubi: sichtbar");

    const p = zeigen("azubi-plus");
    erwarte.gleich(p.text, T.HINWEIS_KNAPP, "azubi-plus: derselbe Weg, knapper");

    const g = zeigen("geselle");
    erwarte.wahr(!!g.coach, "geselle: der Coach bleibt im Baum (nur die Anweisung verstummt)");
    erwarte.gleich(g.coach.hidden, true, "geselle: keine ungefragte Anweisung");

    const m = zeigen("meister");
    erwarte.gleich(m.coach.hidden, true, "meister: keine ungefragte Anweisung");
  })));

  pruefe("Keine Begrüßung (alter Stand): die Wahl wird nicht angehängt", kapsel(() => mitWelt(welt => {
    welt.haken.forEach(fn => fn());
    Spiel._st.einstieg.fertig = true;                       /* so sieht ein alter Spielstand aus */
    oeffnen(welt);
    erwarte.gleich(welt.labor.knoten.querySelector(".sp-einstieg-start"), null, "keine Begrüßungskarte");
    erwarte.gleich(welt.labor.knoten.querySelector(".sp-stufe"), null, "und damit auch keine Wahl");
  })));

  pruefe("Die Wahl hängt sich nur einmal ein (ein zweiter Aufruf ändert nichts)", kapsel(() => mitWelt(welt => {
    welt.haken.forEach(fn => fn());
    oeffnen(welt);
    const karte = welt.labor.knoten.querySelector(".sp-einstieg-start");
    erwarte.falsch(welt.UI.einstiegStufe.einhaengen(welt.labor.knoten), "ein zweites Einhängen wird abgelehnt");
    erwarte.gleich(karte.querySelectorAll(".sp-stufe").length, 1, "es bleibt bei einer Wahlfläche");
  })));
});
