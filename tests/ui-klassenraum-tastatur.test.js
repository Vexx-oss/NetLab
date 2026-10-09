"use strict";
/* ---------- Tastatur-Audit: ist der Klassenraum ohne Maus bedienbar? (Bauart wie tests/ui-escape.test.js) ----------
   ANLASS: Der Escape-Audit hat gezeigt, dass die Overlays auf Escape hören. Hier geht es um dieselbe Frage
   für die TASTATUR: Erreicht ein Azubi (oder eine Lehrkraft) jede Fläche ohne Maus, und tut Enter das,
   was der Code verspricht? Geprüft wird die ECHTE Datei `src/ui/klassenraum.js` in einem vm-Bereich mit
   nachgebildetem DOM; geöffnet wird über den echten Öffner der Datei (`startZeile`, `startEinhaengen`,
   `lehrerZeigen`, `schuelerZeigen`, `ergebnisToast`).

   DIE FÜNF FRAGEN DES AUFTRAGS UND WO SIE BEANTWORTET WERDEN
     1. Startseiten-Zeile: Feld erreichbar, Enter löst „Öffnen“ aus ……… Fälle 1, 2
     2. Ansicht „Klasse“: select, „Code anzeigen“, „Code kopieren“ per Tab … Fälle 3, 4
     3. Ansicht „Auftrag“: Code, Platz, „Auftrag öffnen“ per Tab und Enter … Fälle 5, 6
     4. Ergebnis-Toast: Kopier-Knopf erreichbar, bevor er verschwindet ……… Fälle 8, 9
     5. Fokus nach dem Öffnen …………………………………………………… Fall 7 (+ benannt: N2)

   WAS NICHT PRÜFBAR IST, WIRD BENANNT UND GEZÄHLT (letzter Fall, wie beim Escape-Audit):
     N1 Die echte Tabulator-Reihenfolge des Browsers (inkl. Fokusfallen des Rahmens). Gemessen wird die
        DOM-Reihenfolge der fokussierbaren Elemente — der Browser läuft sie in dieser Reihenfolge ab,
        solange kein `tabindex` dazwischenfunkt; dass hier KEIN `tabindex` steht, wird mitgemessen.
     N2 Wohin der Fokus NACH dem Ansichtswechsel fällt (`UI.spiel.oeffnen` → Labor): das braucht den
        vollen App-Rahmen. Gemessen ist, dass die Klassenraum-Datei keinen Fokus setzt, stiehlt oder in
        ein unsichtbares Element legt; `src/ui/spiel.js` enthält ebenfalls keinen `focus(`-Aufruf (grep).
     N3 Das implizite Absenden eines `<form>` durch Enter ist Browser-Verhalten. Geprüft sind der
        `submit`-Hörer und `type="submit"` — die Tastenfolge des Browsers selbst ist nicht nachgebildet.

   Keine Zusicherung im Gruppenrumpf, kein `wirftNicht`. Geändert wird NICHTS (nur gelesen und gemessen):
   `src/ui/klassenraum.js` gehört `uebergabe-ui`. */
(function(){
  const KANN_LADEN = (() => {
    try { return typeof require === "function" && typeof document === "undefined" && typeof Spiel === "object" && Spiel !== null; }
    catch (e) { return false; }
  })();
  const ZUSATZ = KANN_LADEN ? "" : " (kein require im Testbereich – nur unter node tests/run.js)";

  /* Ohne Testbereich die Schichten selbst laden – Reihenfolge wie tests/run.js. */
  function ktAlleinLaden(){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const W = path.resolve(__dirname, ".."), SRC = path.join(W, "src");
    const SCH = [["kern", ["basis.js", "netz.js"]], ["@lernmotor", []], ["modell", ["geraete.js"]], ["sim", ["engine.js"]],
                 ["cli", ["parser.js"]], ["daten", ["basis.js"]], ["spiel", ["zustand.js"]]];
    const LM = [path.resolve(W, "..", "FISI-Spielhalle", "src", "lernmotor.js"), path.join(W, "fremd", "lernmotor.js")].find(f => fs.existsSync(f));
    if (!LM) { console.error("LADEFEHLER: kein Lernmotor gefunden"); process.exit(2); }
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
    try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "ui-klassenraum-tastatur.test.js"}); }
    catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
    const rot = ergebnisse.filter(e => !e.ok);
    for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
    console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
    const ueb = ergebnisse.filter(e => e.ok && e.zusicherungen === 0).length;
    if (ueb) console.log(`davon ${ueb} übersprungen (Test ohne eine einzige Zusicherung)`);
    process.exit(rot.length ? 1 : 0);
  }
  if (!KANN_LADEN && typeof require === "function") { ktAlleinLaden(); return; }

  /* ================= DOM-Ersatz (mit :not(), Zeitgeber-Liste und Fokus-Zähler) ================= */
  function ktKlassen(el){ return String(el.className || "").split(/\s+/).filter(Boolean); }
  function ktPasst(el, sel){
    let s = String(sel).trim();
    if (!s) return false;
    const nicht = [];
    s = s.replace(/:not\(([^)]*)\)/g, (m, innen) => { nicht.push(innen.trim()); return ""; });
    if (/^[a-z][a-z0-9]*$/i.test(s)) { if (el.tag !== s) return false; }
    else {
      const teile = s.match(/\.[\w-]+|\[[^\]]+\]/g) || [];
      if (!teile.length) return false;
      for (const t of teile) {
        if (t.startsWith(".")) { if (!ktKlassen(el).includes(t.slice(1))) return false; }
        else {
          const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(t);
          if (!m) return false;
          const wert = m[1] in el.attrs ? el.attrs[m[1]] : undefined;
          if (m[2] === undefined ? wert === undefined : String(wert) !== m[2]) return false;
        }
      }
    }
    for (const n of nicht) for (const t of (n.match(/\.[\w-]+|\[[^\]]+\]/g) || []))
      if (t.startsWith(".") && ktKlassen(el).includes(t.slice(1))) return false;
    return true;
  }
  function ktFinde(wurzel, sel){
    const treffer = [];
    const lauf = k => { for (const x of k.kinder) if (x && x.nodeType === 1) { if (ktPasst(x, sel)) treffer.push(x); lauf(x); } };
    lauf(wurzel);
    return treffer;
  }
  function ktSuche(wurzel, sel){
    for (const teil of String(sel).split(",")) { const t = ktFinde(wurzel, teil.trim()); if (t.length) return t[0]; }
    return null;
  }
  function ktKnoten(tag){
    const el = {
      nodeType: 1, tag, kinder: [], attrs: {}, dataset: {}, listeners: {}, className: "", value: "", disabled: false,
      hidden: false, title: "", id: "", parentNode: null, type: "", placeholder: "",
      style: {setProperty(){}, removeProperty(){}, getPropertyValue(){ return ""; }},
      append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.parentNode = el; el.kinder.push(x); } },
      prepend(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.parentNode = el; el.kinder.unshift(x); } },
      insertBefore(neu, vor){ const i = el.kinder.indexOf(vor); if (typeof neu === "object") neu.parentNode = el; if (i < 0) el.kinder.push(neu); else el.kinder.splice(i, 0, neu); return neu; },
      replaceChildren(...k){ el.kinder = []; el.append(...k); },
      remove(){ if (el.parentNode) { el.parentNode.kinder = el.parentNode.kinder.filter(x => x !== el); el.parentNode = null; } },
      contains(x){ let p = x; while (p) { if (p === el) return true; p = p.parentNode; } return false; },
      closest(sel){ let p = el; while (p) { if (p.nodeType === 1 && ktPasst(p, sel)) return p; p = p.parentNode; } return null; },
      setAttribute(k, v){ el.attrs[k] = String(v); if (k.startsWith("data-")) el.dataset[k.slice(5).replace(/-(\w)/g, (x, c) => c.toUpperCase())] = String(v); if (k === "hidden") el.hidden = true; if (k === "type") el.type = String(v); },
      getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
      removeAttribute(k){ delete el.attrs[k]; if (k === "hidden") el.hidden = false; },
      addEventListener(art, fn, opt){ (el.listeners[art] ||= []).push({fn, capture: !!(opt === true || (opt && opt.capture)), opt}); },
      removeEventListener(art, fn){ if (el.listeners[art]) el.listeners[art] = el.listeners[art].filter(x => x.fn !== fn); },
      focus(){ FOKUS.push(el); if (KT_DOC) KT_DOC.activeElement = el; },
      blur(){ if (KT_DOC && KT_DOC.activeElement === el) KT_DOC.activeElement = null; },
      click(){ ktFeuer(el, "click", {}, "click"); },
      select(){}, setSelectionRange(){}, scrollIntoView(){},
      getClientRects(){ return []; },
      getBoundingClientRect(){ return {width: 200, height: 40, left: 0, top: 0, right: 200, bottom: 40}; },
      querySelector(sel){ return ktSuche(el, sel); },
      querySelectorAll(sel){ const aus = []; for (const teil of String(sel).split(",")) aus.push(...ktFinde(el, teil.trim())); return aus; },
      classList: {
        _l(){ return ktKlassen(el); },
        _s(l){ el.className = l.join(" "); },
        add(...k){ const l = el.classList._l(); for (const x of k) if (!l.includes(x)) l.push(x); el.classList._s(l); },
        remove(...k){ el.classList._s(el.classList._l().filter(x => !k.includes(x))); },
        toggle(x, an){ const a = an === undefined ? !el.classList.contains(x) : !!an; if (a) el.classList.add(x); else el.classList.remove(x); return a; },
        contains(x){ return el.classList._l().includes(x); },
      },
      set textContent(v){ el._text = String(v); el.kinder = []; },
      get textContent(){ return el.kinder.length ? el.kinder.map(ktText).join("") : (el._text || ""); },
      get lastElementChild(){ return el.kinder.filter(k => k && k.nodeType === 1).slice(-1)[0] || null; },
      get children(){ return el.kinder.filter(k => k && k.nodeType === 1); },
      get isConnected(){ let p = el; while (p.parentNode) p = p.parentNode; return !!p.__imBaum; },
      get firstChild(){ return el.kinder[0] || null; },
    };
    return el;
  }
  function ktText(k){ return k == null ? "" : typeof k === "string" ? k : (k.nodeType === 3 ? k.textContent : (k.textContent || "")); }
  let KT_DOC = null;
  const FOKUS = [];                       /* jede focus()-Berührung wird gezählt (Frage 5) */
  function ktDokument(){
    const body = ktKnoten("body");
    body.__imBaum = true;
    const dok = {
      body, documentElement: Object.assign(ktKnoten("html"), {dataset: {}}), activeElement: null, listeners: {},
      createElement: t => ktKnoten(t), createElementNS: (ns, t) => ktKnoten(t),
      createTextNode: t => ({nodeType: 3, textContent: String(t)}),
      getElementById: id => { const t = ktFinde(body, "body"); void t; return null; },
      querySelector: sel => ktSuche(body, sel),
      querySelectorAll: sel => { const aus = []; for (const teil of String(sel).split(",")) aus.push(...ktFinde(body, teil.trim())); return aus; },
      addEventListener(art, fn, opt){ (dok.listeners[art] ||= []).push({fn, capture: !!(opt === true || (opt && opt.capture)), opt}); },
      removeEventListener(art, fn){ if (dok.listeners[art]) dok.listeners[art] = dok.listeners[art].filter(x => x.fn !== fn); },
    };
    dok.documentElement.__imBaum = true;
    KT_DOC = dok;
    return dok;
  }
  function ktEreignis(ziel, extra){
    return Object.assign({key: "", target: ziel, currentTarget: ziel, preventDefault(){}, stopPropagation(){},
      shiftKey: false, ctrlKey: false, metaKey: false, pointerType: "key", type: "keydown"}, extra);
  }
  function ktFeuer(el, art, extra, typ){
    for (const h of (el.listeners[art] || []).slice()) h.fn(ktEreignis(el, Object.assign({}, extra, {type: typ || art})));
  }

  /* ================= Prüfstand =================
     `Spiel` geht als Hülle in den Bereich (Object.create): Lesen fällt auf das ECHTE Spiel durch,
     Schreiben der Attrappen bleibt auf der Hülle — das geteilte Spiel des Testbereichs bleibt unberührt.
     `sofort:false` hält die Zeitgeber fest (Liste `timer`), damit der Toast-Fall sie selbst auslösen kann. */
  function ktStand(dateien, vor = [], {sofort = true} = {}){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const dok = ktDokument();
    const timer = [];
    const bereich = {
      console: {log(){}, error(){}, warn(){}, info(){}},
      document: dok, innerWidth: 1280, innerHeight: 800, matchMedia: undefined,
      requestAnimationFrame: fn => { try { fn(0); } catch (e) {} return 0; },
      setTimeout: (fn, ms) => { const t = {fn, ms, tot: false}; timer.push(t); if (sofort) { try { fn(); } catch (e) {} } return t; },
      clearTimeout: t => { if (t && typeof t === "object") t.tot = true; },
      clearInterval(){}, setInterval: () => null,
      Math, JSON, Intl, Date, performance: {now: () => 0},
      Spiel: Object.create(Spiel), DATEN, store, CLI, Modell, L, IP, eur, heute, datumDe, jetzt,
      Bus: {an: () => () => {}, aus(){}, senden(){}},
      location: {reload(){}}, Plattform: {name: "test", datei: {exportieren: () => Promise.resolve(true), importieren: () => Promise.resolve(null)}},
    };
    vm.createContext(bereich);
    const quelle = f => fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8");
    const lauf = (code, name) => vm.runInContext(code, bereich, {filename: name});
    lauf(quelle("dom.js"), "ui/dom.js");
    lauf("UI.symbol = (n, g) => sv('svg', {class: 'sym-' + (n || 'x'), width: g || 16});", "attrappen");
    for (const s of vor) lauf(s, "vorbereitung");
    for (const d of dateien) lauf(quelle(d), "ui/" + d);
    lauf("globalThis.__kt = {UI: UI, aufrufe: (typeof __ktAufrufe === 'undefined' ? null : __ktAufrufe)};", "abgriff");
    const tick = (n = 40) => { for (let i = 0; i < n; i++) { const offen = timer.filter(t => !t.tot && !t.gelaufen); if (!offen.length) return i; for (const t of offen) { t.gelaufen = true; try { t.fn(); } catch (e) { console.error(e); } } } return n; };
    return {UI: bereich.__kt.UI, aufrufe: bereich.__kt.aufrufe, dok, lauf, timer, tick, fokus: FOKUS, offen: () => timer.filter(t => !t.tot && !t.gelaufen)};
  }
  /* Die fokussierbaren Elemente in DOM-Reihenfolge – das ist die Reihenfolge, die der Browser abläuft,
     solange kein tabindex dazwischenfunkt (wird mitgemessen). EIN Baumlauf, damit die Reihenfolge stimmt
     (querySelectorAll mit Komma-Liste würde nach Selektoren gruppieren, nicht nach Dokumentposition). */
  const fokussierbar = wurzel => {
    const aus = [];
    const lauf = k => {
      for (const x of k.kinder) if (x && x.nodeType === 1) {
        const tag = String(x.tag).toLowerCase();
        if (tag === "button" || tag === "input" || tag === "select" || tag === "textarea" || (tag === "a" && x.attrs.href != null)) aus.push(x);
        lauf(x);
      }
    };
    lauf(wurzel);
    return aus;
  };
  const beschriftung = el => {
    const label = el.attrs["aria-label"] || el.attrs.title || "";
    const text = String(el.textContent || "").trim();
    /* `type=button` ist die Voreinstellung und wird nicht gezeigt; `submit` schon (das ist die Aussage). */
    const typ = el.attrs.type && el.attrs.type !== "button" ? "[" + el.attrs.type + "]" : "";
    return `${el.tag}${typ}:${label || text || el.attrs.placeholder || el.attrs.id || "?"}`;
  };

  /* Attrappen für den Klassenraum-Codec (Bereich A) — die echten 27 Fälle prüft tests/klassenraum*.test.js. */
  const KODEC = [
    "Spiel.klassenraum = {",
    "  ausCode: t => { const s = String(t || '').trim(); if (!s) return null;",
    "    globalThis.__ktAufrufe.ausCode.push(s);",
    "    if (s === 'NL-4F7K-2Q') return {fehler: true, grund: 'Prüfzeichen stimmt nicht.'};",
    "    return {code: s.toUpperCase(), ticketId: 'salon-01', seed: 7, sitzung: 9, skill: null}; },",
    "  erzeugen: o => { globalThis.__ktAufrufe.erzeugen.push(o); return {ok: true, code: 'NL-JBJH-AE'}; },",
    "  sitzung: () => globalThis.__ktSitzung,",
    "  netzkennwert: () => 'E462RY',",
    "  plaetze: () => 0, platz: () => 0, plaetzeSetzen: n => { globalThis.__ktAufrufe.plaetzeSetzen.push(n); return {ok: true}; },",
    "  platzSetzen: n => { globalThis.__ktAufrufe.platzSetzen.push(n); return {ok: true}; },",
    "  ergebnisEintragen: () => ({neu: true, platz: 1, sterne: 5}),",
    "  hilfeCode: inst => (inst && inst.klassenraum ? 'H-4F7K-2Q' : null),",
    "};",
  ].join("\n");

  /* ================= Zählung (der Schlusstest nennt die Zahlen) ================= */
  const GEPRUEFT = [];
  const NICHT_PRUEFBAR = [
    {stelle: "Browser-Tabulator selbst", grund: "gemessen wird die DOM-Reihenfolge der fokussierbaren Elemente (kein tabindex im Weg); die Tastenfolge des Browsers inkl. Fokusfallen des Rahmens ist hier nicht nachgebildet"},
    {stelle: "Fokus nach dem Ansichtswechsel (UI.spiel.oeffnen → Labor)", grund: "braucht den vollen App-Rahmen; gemessen ist nur, dass src/ui/klassenraum.js keinen Fokus setzt/stiehlt und nichts Unsichtbares fokussiert (src/ui/spiel.js hat ebenfalls keinen focus(-Aufruf)"},
    {stelle: "implizites Absenden des <form> durch Enter", grund: "Browser-Verhalten; geprüft sind der submit-Hörer (klassenraum.js:263) und type=submit am Knopf (:266)"},
  ];
  /* GEMESSENE MÄNGEL — beide am 10.10.2026 vom Eigentümer von `src/ui/toast.js` BEHOBEN (ui-spiel):
       · `focusin`/`focusout` halten den Zeitgeber jetzt auch bei Tastaturfokus an (toast.js:67-68),
       · `fokusRetten()` gibt den Fokus VOR dem Entfernen zurück (toast.js:74-88).
     Sie stehen deshalb NICHT mehr als offener Befund hier, sondern als Soll-Zustand in Fall 9 —
     ein Befund, der behoben ist, gehört als Zusicherung in den Test, nicht als Zählung daneben.
     Die Liste bleibt als Zählung erhalten (0), damit ein künftiger Befund hier nicht still verschwindet. */
  const BEFUNDE = [];

  /* Der Name dieser Gruppe an EINER Stelle: die Vollständigkeitsprüfung leitet daraus die Zahl der
     registrierten Fälle ab (statt eine Zahl festzunageln, die beim nächsten Ausbau bricht). */
  const KT_GRUPPE = "UI: Klassenraum mit der Tastatur";

  gruppe(KT_GRUPPE + ZUSATZ, () => {
    /* ---------- 1 · Startseiten-Zeile: Feld, Label, Enter ---------- */
    pruefe("1 · Startseiten-Zeile: hängt sich ein, Feld ist beschriftet, Enter öffnet den Auftrag" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      /* Die Aufrufe der Attrappen werden aus dem vm-Bereich gelesen (st.aufrufe). */
      const st = ktStand(["klassenraum.js"], [
        "globalThis.__ktAufrufe = {ausCode: [], erzeugen: [], geoeffnet: [], platzSetzen: [], plaetzeSetzen: []};",
        "globalThis.__ktSitzung = null;",
        KODEC,
        "Spiel.instanzErstellen = o => { globalThis.__ktAufrufe.instanz = o; return {iid: 'k1', netz: null, klassenraum: null}; };",
        "Spiel._st = {erledigt: []};",
        "Spiel.ticketReihe = () => [];",
        "Spiel.defVon = () => ({titel: 'Testauftrag', skills: []});",
        "UI.spiel = {inst: null, oeffnen: iid => globalThis.__ktAufrufe.geoeffnet.push(iid)};",
        "UI.toast = () => ({schliessen(){}});",
        "UI.hub = {kopieren: (t) => globalThis.__ktAufrufe.kopiert = t};",
      ]);
      /* Die echte Einhänge-Stelle: hub.js baut .hb-seite mit .hb-kacheln (B § 4) */
      const seite = ktKnotenDoku(st, "div", "hb-seite");
      const kacheln = ktKnotenDoku(st, "div", "hb-kacheln");
      seite.append(kacheln); st.dok.body.append(seite);
      erwarte.gleich(st.UI.klassenraum.startEinhaengen(), true, "die Zeile hängt sich in .hb-seite (klassenraum.js:338-348)");
      const zeile = seite.querySelector(".kl-start");
      erwarte.wahr(!!zeile, "und steht danach dort");
      erwarte.gleich(seite.kinder.indexOf(zeile) < seite.kinder.indexOf(kacheln), true, "über den Kacheln (insertBefore, :345)");
      const feld = zeile.querySelector(".kl-start-feld");
      const label = zeile.querySelector("label");
      erwarte.wahr(!!feld && !!label, "Feld und Beschriftung stehen da");
      erwarte.gleich(label.attrs.for, feld.attrs.id, "das Label zeigt auf das Feld (for = id, :333)");
      erwarte.gleich(feld.attrs.type, "text", "ein Textfeld");
      erwarte.gleich(typeof feld.listeners.keydown, "object", "das Feld hat einen Tasten-Hörer (klassenraum.js:331)");
      /* Enter löst „Öffnen“ aus – der Kern der Frage */
      feld.value = "NL-WBJH-NS";
      ktFeuer(feld, "keydown", {key: "Enter"});
      erwarte.gleich(st.aufrufe.ausCode, ["NL-WBJH-NS"], "Enter hat den Code gelesen (ausCode, klassenraum.js:302)");
      erwarte.gleich(st.aufrufe.geoeffnet.length, 1, "und den Auftrag geöffnet (UI.spiel.oeffnen, :316)");
      erwarte.gleich(st.aufrufe.instanz.quelle, "klassenraum", "über die vierte Quelle (klassenraum.js:314)");
      GEPRUEFT.push("1 Startseiten-Zeile: Einhängen, Label, Enter öffnet");
    });

    /* ---------- 2 · Startseiten-Zeile: der Knopf tut dasselbe ---------- */
    pruefe("2 · Startseiten-Zeile: der Knopf „Öffnen“ nimmt denselben Weg wie Enter" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      /* Die Aufrufe der Attrappen werden aus dem vm-Bereich gelesen (st.aufrufe). */
      const st = ktStand(["klassenraum.js"], [
        "globalThis.__ktAufrufe = {ausCode: [], erzeugen: [], geoeffnet: [], platzSetzen: [], plaetzeSetzen: []};",
        "globalThis.__ktSitzung = null;",
        KODEC,
        "Spiel.instanzErstellen = o => ({iid: 'k1', netz: null, klassenraum: null});",
        "Spiel._st = {erledigt: []};",
        "Spiel.ticketReihe = () => [];",
        "Spiel.defVon = () => ({titel: 'Testauftrag', skills: []});",
        "UI.spiel = {inst: null, oeffnen: iid => globalThis.__ktAufrufe.geoeffnet.push(iid)};",
        "UI.toast = () => ({schliessen(){}});",
        "UI.hub = {kopieren: () => {}};",
      ]);
      const zeile = st.UI.klassenraum.startZeile();
      erwarte.wahr(!!zeile, "die Zeile wird gebaut");
      const knopf = zeile.querySelector(".kl-start-knopf");
      erwarte.gleich(knopf.tag, "button", "„Öffnen“ ist ein Knopf");
      erwarte.gleich(knopf.attrs.type, "button", "type=button – ein Knopf, der auf Enter und Leertaste hört");
      zeile.querySelector(".kl-start-feld").value = "NL-WBJH-NS";
      knopf.click();
      erwarte.gleich(st.aufrufe.geoeffnet.length, 1, "der Klick bzw. Enter auf dem Knopf öffnet ebenso (klassenraum.js:335)");
      /* Ein falscher Code wird gemeldet, nicht abgewiesen: Feld markiert, Hinweis steht da */
      zeile.querySelector(".kl-start-feld").value = "NL-4F7K-2Q";
      ktFeuer(zeile.querySelector(".kl-start-feld"), "keydown", {key: "Enter"});
      erwarte.gleich(zeile.querySelector(".kl-start-feld").attrs["aria-invalid"], "true", "ein falscher Code markiert das Feld (markieren, :87)");
      erwarte.enthaelt(zeile.textContent, "Prüfzeichen", "und der Grund steht als Hinweis da");
      GEPRUEFT.push("2 Startseiten-Zeile: Knopf „Öffnen“ + Fehlermeldung am Feld");
    });

    /* ---------- 3 · Ansicht „Klasse“: Tab-Reihenfolge ---------- */
    pruefe("3 · Ansicht „Klasse“: select → „Code anzeigen“ → „Code kopieren“ → Eintragen → Datei… (DOM-Reihenfolge)" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const st = ktStand(["klassenraum.js"], [
        "globalThis.__ktAufrufe = {ausCode: [], erzeugen: [], geoeffnet: [], platzSetzen: [], plaetzeSetzen: []};",
        "globalThis.__ktSitzung = null;",
        KODEC,
        "Spiel.ticketReihe = () => [{id: 'salon-01', titel: 'Der Salon'}, {id: 'salon-02', titel: 'Die Kasse'}];",
        "Spiel.defVon = () => ({titel: 'Testauftrag', skills: []});",
        "UI.spiel = {inst: null, oeffnen: () => {}};",
        "UI.toast = () => ({schliessen(){}});",
        "UI.hub = {kopieren: () => {}};",
      ]);
      const c = st.dok.createElement("div");
      st.UI.klassenraum.lehrerZeigen(c);
      const f = fokussierbar(c);
      const folge = f.map(beschriftung);
      erwarte.gleich(f.length >= 5, true, "mindestens fünf fokussierbare Elemente, sind " + f.length);
      erwarte.gleich(folge[0], "select:Auftrag", "zuerst die Auftragsauswahl (klassenraum.js:105)");
      erwarte.gleich(folge[1], "button:Code anzeigen", "dann „Code anzeigen“ (:123)");
      erwarte.gleich(folge[2], "button:Code kopieren", "dann „Code kopieren“ (:128)");
      erwarte.enthaelt(folge.slice(3).join(" | "), "textarea:Ergebnis-Codes", "danach das Codefeld (:114)");
      erwarte.enthaelt(folge.join(" | "), "button:Eintragen", "und „Eintragen“ (:137)");
      erwarte.enthaelt(folge.join(" | "), "button:Datei…", "und „Datei…“ (:138)");
      /* Nichts ist gesperrt oder versteckt – sonst wäre es per Tab nicht erreichbar */
      for (const el of f) { erwarte.falsch(!!el.disabled, "nicht gesperrt: " + beschriftung(el)); erwarte.falsch(!!el.hidden, "nicht versteckt: " + beschriftung(el)); }
      erwarte.gleich(f.filter(x => x.attrs.tabindex != null).length, 0, "kein tabindex – die DOM-Reihenfolge gilt (Quelle und Ziel zugleich)");
      GEPRUEFT.push("3 Ansicht Klasse: Tab-Reihenfolge (6 Elemente, kein tabindex, nichts gesperrt)");
    });

    /* ---------- 4 · Ansicht „Klasse“: „Code anzeigen“ wirkt ---------- */
    pruefe("4 · Ansicht „Klasse“: „Code anzeigen“ erzeugt den Code, „Code kopieren“ kopiert ihn" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      /* Die Aufrufe der Attrappen werden aus dem vm-Bereich gelesen (st.aufrufe). */
      const st = ktStand(["klassenraum.js"], [
        "globalThis.__ktAufrufe = {ausCode: [], erzeugen: [], geoeffnet: [], platzSetzen: [], plaetzeSetzen: []};",
        "globalThis.__ktSitzung = null;",
        KODEC,
        "Spiel.ticketReihe = () => [{id: 'salon-01', titel: 'Der Salon'}];",
        "Spiel.defVon = () => ({titel: 'Testauftrag', skills: []});",
        "UI.spiel = {inst: null, oeffnen: () => {}};",
        "UI.toast = () => ({schliessen(){}});",
        "UI.hub = {kopieren: (t) => { globalThis.__ktAufrufe.kopiert = t; }};",
      ]);
      const c = st.dok.createElement("div");
      st.UI.klassenraum.lehrerZeigen(c);
      const wahl = c.querySelector("select");
      wahl.value = "id:salon-01";
      c.querySelectorAll("button").find(b => String(b.textContent).includes("Code anzeigen")).click();
      erwarte.gleich(st.aufrufe.erzeugen.length, 1, "„Code anzeigen“ ruft den Codec (klassenraum.js:164)");
      erwarte.gleich(st.aufrufe.erzeugen[0].ticketId, "salon-01", "mit dem gewählten Auftrag");
      /* Ohne Sitzung meldet „Code kopieren“ ehrlich – und ruft das Kopieren NICHT */
      c.querySelectorAll("button").find(b => String(b.textContent).includes("Code kopieren")).click();
      erwarte.wahr(st.aufrufe.kopiert == null, "ohne Sitzung wird nicht kopiert, sondern gemeldet (klassenraum.js:171)");
      erwarte.enthaelt(c.textContent, "Noch keine Sitzung", "die Meldung steht in der Ansicht");
      /* Mit Sitzung kopiert es wirklich */
      st.lauf("globalThis.__ktSitzung = {code: 'NL-JBJH-AE', ergebnisse: {}, plaetze: 0};", "sitzung");
      c.querySelectorAll("button").find(b => String(b.textContent).includes("Code anzeigen")).click();
      c.querySelectorAll("button").find(b => String(b.textContent).includes("Code kopieren")).click();
      erwarte.gleich(st.aufrufe.kopiert, "NL-JBJH-AE", "mit Sitzung geht der Code an UI.hub.kopieren (klassenraum.js:173)");
      GEPRUEFT.push("4 Ansicht Klasse: „Code anzeigen“ + „Code kopieren“ wirken über den Knopf");
    });

    /* ---------- 5 · Ansicht „Auftrag“: Tab-Reihenfolge ---------- */
    pruefe("5 · Ansicht „Auftrag“: Code → Platz → „Auftrag öffnen“ (type=submit)" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const st = ktStand(["klassenraum.js"], [
        "globalThis.__ktAufrufe = {ausCode: [], erzeugen: [], geoeffnet: [], platzSetzen: [], plaetzeSetzen: []};",
        "globalThis.__ktSitzung = null;",
        KODEC,
        "Spiel.defVon = () => ({titel: 'Testauftrag', skills: []});",
        "UI.spiel = {inst: null, oeffnen: () => {}};",
        "UI.toast = () => ({schliessen(){}});",
        "UI.hub = {kopieren: () => {}};",
      ]);
      const c = st.dok.createElement("div");
      st.UI.klassenraum.schuelerZeigen(c);
      const f = fokussierbar(c);
      const folge = f.map(beschriftung);
      erwarte.gleich(folge, ["input[text]:Auftragscode", "input[text]:Platz", "button[submit]:Auftrag öffnen"], "genau drei Stationen in dieser Reihenfolge");
      const form = c.querySelector("form");
      erwarte.wahr(!!form, "die drei stehen in einem <form> (klassenraum.js:263)");
      erwarte.wahr(f.every(x => form.contains(x)), "und das Formular umschließt sie");
      erwarte.gleich(f[2].attrs.type, "submit", "der Knopf ist type=submit (:266) – damit löst Enter im Feld das Absenden aus (N3)");
      erwarte.gleich(f[1].attrs.inputmode, "numeric", "das Platzfeld ist für Zahlen eingerichtet (:259)");
      erwarte.gleich(f[1].attrs.maxlength, "2", "höchstens zwei Ziffern");
      GEPRUEFT.push("5 Ansicht Auftrag: Tab-Reihenfolge (Code → Platz → Auftrag öffnen), type=submit");
    });

    /* ---------- 6 · Ansicht „Auftrag“: Absenden öffnet ---------- */
    pruefe("6 · Ansicht „Auftrag“: das Absenden öffnet den Auftrag und merkt den Platz" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      /* Die Aufrufe der Attrappen werden aus dem vm-Bereich gelesen (st.aufrufe). */
      const st = ktStand(["klassenraum.js"], [
        "globalThis.__ktAufrufe = {ausCode: [], erzeugen: [], geoeffnet: [], platzSetzen: [], plaetzeSetzen: []};",
        "globalThis.__ktSitzung = null;",
        KODEC,
        "Spiel.instanzErstellen = o => ({iid: 'k1', netz: null, klassenraum: null});",
        "Spiel._st = {erledigt: []};",
        "Spiel.defVon = () => ({titel: 'Testauftrag', skills: []});",
        "UI.spiel = {inst: null, oeffnen: iid => globalThis.__ktAufrufe.geoeffnet.push(iid)};",
        "UI.toast = () => ({schliessen(){}});",
        "UI.hub = {kopieren: () => {}};",
      ]);
      const c = st.dok.createElement("div");
      st.UI.klassenraum.schuelerZeigen(c);
      const form = c.querySelector("form");
      c.querySelectorAll("input")[0].value = "NL-WBJH-NS";
      c.querySelectorAll("input")[1].value = "3";
      ktFeuer(form, "submit", {});
      erwarte.gleich(st.aufrufe.platzSetzen, [3], "der Platz wird zuerst gemerkt (klassenraum.js:295)");
      erwarte.gleich(st.aufrufe.ausCode, ["NL-WBJH-NS"], "dann wird der Code gelesen");
      erwarte.gleich(st.aufrufe.geoeffnet.length, 1, "und der Auftrag geöffnet");
      /* Ein leerer Platz ändert nichts (B: leer heißt „nicht ändern“) */
      c.querySelectorAll("input")[0].value = "NL-WBJH-NS";
      c.querySelectorAll("input")[1].value = "";
      ktFeuer(form, "submit", {});
      erwarte.gleich(st.aufrufe.platzSetzen, [3], "ohne Eingabe bleibt der Platz unangetastet (:294)");
      erwarte.gleich(st.aufrufe.geoeffnet.length, 2, "geöffnet wird trotzdem");
      GEPRUEFT.push("6 Ansicht Auftrag: submit öffnet, Platz kommt an, leerer Platz ändert nichts");
    });

    /* ---------- 7 · Fokus ---------- */
    pruefe("7 · Fokus: die Klassenraum-Flächen setzen keinen Fokus und enthalten nichts Unsichtbares" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const st = ktStand(["klassenraum.js"], [
        "globalThis.__ktAufrufe = {ausCode: [], erzeugen: [], geoeffnet: [], platzSetzen: [], plaetzeSetzen: []};",
        "globalThis.__ktSitzung = null;",
        KODEC,
        "Spiel.instanzErstellen = o => ({iid: 'k1', netz: null, klassenraum: null});",
        "Spiel._st = {erledigt: []};",
        "Spiel.ticketReihe = () => [{id: 'salon-01', titel: 'Der Salon'}];",
        "Spiel.defVon = () => ({titel: 'Testauftrag', skills: []});",
        "UI.spiel = {inst: null, oeffnen: (iid) => globalThis.__ktAufrufe.geoeffnet.push(iid)};",
        "UI.toast = () => ({schliessen(){}});",
        "UI.hub = {kopieren: () => {}};",
      ]);
      const vorher = st.fokus.length;
      const seite = ktKnotenDoku(st, "div", "hb-seite");
      st.dok.body.append(seite);
      st.UI.klassenraum.startEinhaengen();
      const kl = st.dok.createElement("div"), auf = st.dok.createElement("div");
      st.UI.klassenraum.lehrerZeigen(kl);
      st.UI.klassenraum.schuelerZeigen(auf);
      st.dok.body.append(kl, auf);                       /* wie der Rahmen: die Ansichten hängen im Dokument */
      erwarte.gleich(st.fokus.length, vorher, "beim Aufbau der drei Flächen wird kein einziges Mal focus() gerufen");
      const alle = [...fokussierbar(st.dok.body)];
      erwarte.wahr(alle.length >= 9, "fokussierbare Elemente insgesamt: " + alle.length);
      for (const el of alle) {
        erwarte.falsch(!!el.hidden, "nichts Verstecktes fokussierbar: " + beschriftung(el));
        erwarte.falsch(!!el.disabled, "nichts Gesperrtes fokussierbar: " + beschriftung(el));
        erwarte.gleich(el.closest("[inert]"), null, "nichts in einem inert-Bereich: " + beschriftung(el));
      }
      /* Öffnen über die Startseiten-Zeile: der Fokus bleibt, wo er war – nichts Unsichtbares bekommt ihn */
      const feld = st.dok.querySelector(".kl-start-feld");
      feld.focus();
      erwarte.wahr(st.dok.activeElement === feld, "das Feld ist fokussiert");
      feld.value = "NL-WBJH-NS";
      ktFeuer(feld, "keydown", {key: "Enter"});
      erwarte.wahr(st.dok.activeElement === feld, "auch nach dem Öffnen bleibt der Fokus auf dem sichtbaren Feld (klassenraum.js setzt keinen Fokus)");
      erwarte.gleich(st.fokus.length, vorher + 1, "genau EIN focus() – das des Tests, keines aus der Datei");
      GEPRUEFT.push("7 Fokus: kein Fokusklau, nichts Unsichtbares fokussierbar, Fokus bleibt am Feld");
    });

    /* ---------- 8 · Ergebnis-Toast: Kopier-Knopf und Fenster ---------- */
    pruefe("8 · Ergebnis-Toast: der Kopier-Knopf ist ein echter Knopf, das Fenster beträgt 20 s" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      /* Die Aufrufe der Attrappen werden aus dem vm-Bereich gelesen (st.aufrufe). */
      const st = ktStand(["toast.js", "klassenraum.js"], [
        "globalThis.__ktAufrufe = {ausCode: [], erzeugen: [], geoeffnet: [], platzSetzen: [], plaetzeSetzen: []};",
        "globalThis.__ktSitzung = null;",
        KODEC,
        "Spiel.ticketReihe = () => [];",
        "UI.spiel = {inst: null, oeffnen: () => {}};",
        "UI.hub = {kopieren: (t) => { globalThis.__ktAufrufe.kopiert = t; }};",
      ], {sofort: false});
      const code = st.UI.klassenraum.ergebnisToast({code: "E-7DWA-ACL"});
      erwarte.gleich(code, "E-7DWA-ACL", "der Code kommt zurück (klassenraum.js:360)");
      const toast = st.dok.querySelector(".toast");
      erwarte.wahr(!!toast, "ein Toast steht im Dokument (UI.toast)");
      erwarte.enthaelt(toast.textContent, "E-7DWA-ACL", "mit dem Ergebnis-Code");
      const knopf = toast.querySelector(".toast-knopf");
      erwarte.wahr(!!knopf, "der Kopier-Knopf ist da");
      erwarte.gleich(knopf.tag, "button", "und ist ein echter Knopf (toast.js:52) – per Tab erreichbar");
      erwarte.gleich(knopf.attrs.type, "button", "type=button");
      erwarte.enthaelt(String(knopf.textContent), "Kopieren", "er heißt „Kopieren“");
      const zuKnopf = toast.querySelector(".toast-zu");
      erwarte.wahr(!!zuKnopf, "daneben der Schließen-Knopf (toast.js:54)");
      const offen = st.offen();
      erwarte.gleich(offen.length, 1, "genau ein laufender Zeitgeber, sind " + offen.length);
      erwarte.gleich(offen[0].ms, 20000, "das Fenster beträgt 20 s (klassenraum.js:358) – genug Zeit, um mit Tab hinzukommen");
      knopf.click();
      erwarte.gleich(st.aufrufe.kopiert, "E-7DWA-ACL", "ein Klick/Enter kopiert den Code über UI.hub.kopieren (:359)");
      GEPRUEFT.push("8 Ergebnis-Toast: Kopier-Knopf ist ein echter Knopf, Fenster 20000 ms, Klick kopiert");
    });

    /* ---------- 9 · Ergebnis-Toast: erreichbar, bevor er verschwindet ---------- */
    pruefe("9 · Ergebnis-Toast: der Kopier-Knopf ist erreichbar, während der Toast steht (Maus hält an)" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const st = ktStand(["toast.js", "klassenraum.js"], [
        "globalThis.__ktAufrufe = {ausCode: [], erzeugen: [], geoeffnet: [], platzSetzen: [], plaetzeSetzen: []};",
        "globalThis.__ktSitzung = null;",
        KODEC,
        "Spiel.ticketReihe = () => [];",
        "UI.spiel = {inst: null, oeffnen: () => {}};",
        "UI.hub = {kopieren: () => {}};",
      ], {sofort: false});
      st.UI.klassenraum.ergebnisToast({code: "E-7DWA-ACL"});
      const toast = st.dok.querySelector(".toast");
      erwarte.wahr(!!toast, "der Toast steht");
      /* Die Maus hält ihn an (toast.js:61) — und der Kopier-Knopf bleibt dabei stehen */
      erwarte.wahr(!!toast.listeners.pointerenter, "der Toast hört auf die Maus (toast.js:61)");
      ktFeuer(toast, "pointerenter", {});
      erwarte.gleich(st.offen().length, 0, "Maus darüber hält den Zeitgeber an (gemessen: kein laufender Zeitgeber)");
      const knopf = toast.querySelector(".toast-knopf");
      erwarte.wahr(!!knopf, "der Kopier-Knopf steht noch da");
      erwarte.gleich(knopf.isConnected, true, "und hängt im Dokument");
      /* Fokussieren ist möglich; der Toast bleibt dabei stehen (er verschwindet nicht „vorher“) */
      knopf.focus();
      erwarte.wahr(st.dok.activeElement === knopf, "der Knopf lässt sich fokussieren");
      erwarte.gleich(knopf.isConnected, true, "der fokussierte Knopf ist noch da – der Toast ist nicht vorher verschwunden");
      erwarte.gleich(!!knopf.attrs.disabled, false, "und ist nicht gesperrt");
      ktFeuer(toast, "pointerleave", {});
      erwarte.gleich(st.offen().length, 1, "Maus weg: der Zeitgeber läuft wieder (das 20-s-Fenster aus Fall 8)");
      erwarte.gleich(knopf.isConnected, true, "der Knopf steht weiterhin");
      /* Die TASTATUR wird wie die Maus behandelt (der frühere Befund, behoben am 10.10.2026):
         `focusin` hält an, `focusout` lässt weiterlaufen (toast.js:67-68). */
      erwarte.wahr(!!toast.listeners.focusin, "der Toast hört jetzt auch auf den Tastaturfokus (toast.js:67)");
      erwarte.wahr(!!toast.listeners.focusout, "und auf das Verlassen (toast.js:68)");
      knopf.focus();
      ktFeuer(toast, "focusin", {});
      erwarte.gleich(st.offen().length, 0, "Fokus im Toast hält den Zeitgeber an – wie die Maus");
      ktFeuer(toast, "focusout", {relatedTarget: null});
      erwarte.gleich(st.offen().length, 1, "Fokus hinaus: der Zeitgeber läuft wieder");
      /* Und beim Ablauf fällt der Fokus NICHT ins Leere (der zweite frühere Befund): `fokusRetten`
         gibt ihn vor dem Entfernen zurück (toast.js:74-88). */
      knopf.focus();
      erwarte.wahr(st.dok.activeElement === knopf, "der Knopf hat den Fokus");
      st.tick();
      erwarte.gleich(knopf.isConnected, false, "der Toast ist nach dem Ablauf entfernt");
      erwarte.wahr(st.dok.activeElement !== knopf, "der Fokus zeigt nicht mehr auf den entfernten Knopf");
      erwarte.wahr(!!st.dok.activeElement && st.dok.activeElement.isConnected !== false, "sondern auf ein Element, das noch im Dokument steht (fokusRetten, toast.js:88)");
      GEPRUEFT.push("9 Ergebnis-Toast: Kopier-Knopf erreichbar; Maus UND Tastatur halten an; Fokus wird gerettet");
    });

    /* ---------- 10 · Die Mappe: „Ich hänge" (3.0, Säule 5, Weg A) ----------
       Der Knopf ist am 10.10.2026 aus der Ansicht „Auftrag" (Grenze 3) in die Auftragsmappe des Labors
       umgezogen. Gebaut wird er von `UI.klassenraum.hilfeKnopf()` (klassenraum.js:397-420, exportiert
       :509); die Mappe hängt genau diesen Bauer ein (spiel.js:205). Hier wird DERSELBE Knopf wirklich
       gebaut und bedient — was der Mappen-Rahmen drumherum tut, steht unten als „nicht prüfbar“. */
    pruefe("10 · Mappe: „Ich hänge“ ist ein echter Knopf, tut das Richtige und sagt ehrlich ab" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const st = ktStand(["klassenraum.js"], [
        "globalThis.__ktAufrufe = {ausCode: [], erzeugen: [], geoeffnet: [], platzSetzen: [], plaetzeSetzen: [], toasts: []};",
        "globalThis.__ktSitzung = null;",
        KODEC,
        "Spiel.ticketReihe = () => [];",
        "UI.spiel = {inst: null, oeffnen: () => {}};",
        "UI.hub = {kopieren: t => globalThis.__ktAufrufe.kopiert = t};",
        "UI.toast = (text, art, o) => { globalThis.__ktAufrufe.toasts.push({text: String(text), art, id: o && o.id}); return {schliessen(){}}; };",
      ]);
      erwarte.gleich(typeof st.UI.klassenraum.hilfeKnopf, "function", "UI.klassenraum.hilfeKnopf ist die öffentliche Fläche (klassenraum.js:509)");
      const spielQuelle = require("fs").readFileSync(require("path").join(__dirname, "..", "src", "ui", "spiel.js"), "utf8");
      erwarte.enthaelt(spielQuelle, "UI.klassenraum?.hilfeKnopf", "die Mappe hängt ihn ein (spiel.js:205)");
      const k = st.UI.klassenraum.hilfeKnopf();
      erwarte.gleich(k.tag, "button", "ein echter Knopf – per Tab erreichbar");
      erwarte.gleich(k.attrs.type, "button", "type=button");
      erwarte.gleich(k.attrs.tabindex, undefined, "ohne tabindex (die DOM-Reihenfolge gilt)");
      erwarte.enthaelt(String(k.attrs["aria-label"]), "Ich hänge", "mit sprechender Beschriftung: " + k.attrs["aria-label"]);
      erwarte.gleich(fokussierbar({ nodeType: 1, kinder: [k] }).length, 1, "und er zählt als fokussierbares Element");
      const letzterToast = () => st.aufrufe.toasts[st.aufrufe.toasts.length - 1] || {};
      /* (1) Ohne offenen Auftrag: ehrliche Absage, kein erfundener Code (klassenraum.js:408) */
      k.click();
      erwarte.gleich(letzterToast().art, "warn", "ohne Auftrag kommt eine Warnung");
      erwarte.enthaelt(letzterToast().text, "kein Klassenraum-Auftrag offen", "mit dem ehrlichen Grund");
      erwarte.enthaelt(String(k.textContent), "Ich hänge", "und der Knopf zeigt keinen erfundenen Code");
      erwarte.wahr(st.aufrufe.kopiert == null, "und kopiert nichts");
      /* (2) Mit offenem Auftrag: der echte Code steht IM Knopf und ist gleich kopiert (:415-417) */
      st.lauf("UI.spiel.inst = {klassenraum: {sitzung: 1, platz: 3, code: 'NL-4F7K-2Q'}};", "auftrag");
      k.click();
      erwarte.gleich(String(k.textContent), "H-4F7K-2Q", "der Hilfecode steht im Knopf");
      erwarte.gleich(st.aufrufe.kopiert, "H-4F7K-2Q", "und ist gleich kopiert");
      erwarte.gleich(k.classList.contains("kl-hilfe-code"), true, "der Knopf schaltet in die Code-Schrift");
      /* (3) Zweiter Klick kopiert denselben Code noch einmal (:406) */
      st.aufrufe.kopiert = null;
      k.click();
      erwarte.gleich(st.aufrufe.kopiert, "H-4F7K-2Q", "ein zweiter Klick kopiert erneut");
      /* (4) Fehlweg Codec: der Grund kommt durch, nichts wird erfunden (:411-412) */
      st.lauf("Spiel.klassenraum.hilfeCode = () => ({fehler: 'x', grund: 'Kein Platz gemeldet.', hinweis: 'Sag den Platz.'});", "fehlweg");
      st.UI.klassenraum.hilfeKnopf().click();
      erwarte.enthaelt(letzterToast().text, "Kein Platz gemeldet.", "ein Codec-Fehler wird mit seinem Grund gemeldet");
      erwarte.enthaelt(letzterToast().text, "Sag den Platz.", "samt Hinweis");
      /* (5) Fehlweg API: ehrliche Absage statt leerer Anzeige (:409) */
      st.lauf("delete Spiel.klassenraum.hilfeCode;", "ohne-api");
      st.UI.klassenraum.hilfeKnopf().click();
      erwarte.enthaelt(letzterToast().text, "kann diese Fassung noch nicht", "fehlt der Codec, sagt der Knopf das ehrlich");
      GEPRUEFT.push("10 Mappe „Ich hänge“: echter Knopf, Code im Knopf + kopiert, drei ehrliche Absagen");
    });

    /* ---------- Gegenprobe: der Test misst wirklich die Tasten-Hörer ---------- */
    pruefe("Gegenprobe: ohne die Hörer tun Enter und Absenden nichts — der Test misst die Hörer" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const vorherGezaehlt = GEPRUEFT.length;   /* abgeleitet: die Gegenprobe darf NICHTS hinzufügen */
      const st = ktStand(["klassenraum.js"], [
        "globalThis.__ktAufrufe = {ausCode: [], erzeugen: [], geoeffnet: [], platzSetzen: [], plaetzeSetzen: []};",
        "globalThis.__ktSitzung = null;",
        KODEC,
        "Spiel.ticketReihe = () => [];",
        "Spiel.defVon = () => ({titel: 'Testauftrag', skills: []});",
        "UI.spiel = {inst: null, oeffnen: iid => globalThis.__ktAufrufe.geoeffnet.push(iid)};",
        "UI.toast = () => ({schliessen(){}});",
        "UI.hub = {kopieren: () => {}};",
      ]);
      const zeile = st.UI.klassenraum.startZeile();
      const feld = zeile.querySelector(".kl-start-feld");
      feld.value = "NL-WBJH-NS";
      feld.listeners.keydown = [];                      /* den Enter-Hörer wegnehmen */
      ktFeuer(feld, "keydown", {key: "Enter"});
      erwarte.gleich(st.aufrufe.ausCode, [], "ohne Hörer liest Enter den Code nicht — Fall 1 misst also den Hörer");
      erwarte.gleich(st.aufrufe.geoeffnet.length, 0, "und öffnet nichts");
      const c = st.dok.createElement("div");
      st.UI.klassenraum.schuelerZeigen(c);
      const form = c.querySelector("form");
      c.querySelectorAll("input")[0].value = "NL-WBJH-NS";
      form.listeners.submit = [];                       /* den submit-Hörer wegnehmen */
      ktFeuer(form, "submit", {});
      erwarte.gleich(st.aufrufe.ausCode, [], "ohne Hörer öffnet auch das Absenden nichts — Fall 6 misst den Hörer");
      erwarte.gleich(GEPRUEFT.length, vorherGezaehlt, "die Gegenprobe zählt nicht als eigener geprüfter Punkt (vorher " + vorherGezaehlt + ")");
    });

    /* ---------- Schluss: die Zahlen ----------
       KEINE festgenagelte Fallzahl: die Sollzahl wird aus den Fällen ABGELEITET, die in dieser Gruppe
       wirklich registriert sind (Rahmen des Testlaufs: `TESTS.liste`). Ein neuer Fall erhöht die Zahl
       damit von selbst; fällt ein Fall aus (wie am 10.10.2026 „5 · Ansicht Auftrag“ bei fünf statt drei
       Stationen), meldet genau diese Zusicherung ihn — statt einer Konstante, die still veraltet. */
    pruefe("Vollständigkeit: geprüfte, nicht prüfbare und gemessene Befunde werden gezählt" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const registriert = (typeof TESTS !== "undefined" && Array.isArray(TESTS.liste) ? TESTS.liste : [])
        .map(t => String(t.name)).filter(n => n.indexOf(KT_GRUPPE) === 0);
      const istRahmen = n => /Gegenprobe:/.test(n) || /Vollständigkeit:/.test(n);
      const rahmen = registriert.filter(istRahmen), inhalt = registriert.filter(n => !istRahmen(n));
      erwarte.wahr(inhalt.length >= 9, "inhaltliche Fälle in dieser Gruppe: " + inhalt.length + " – " + inhalt.join(" · "));
      erwarte.gleich(rahmen.length, 2, "die zwei Rahmenfälle (Gegenprobe, Vollständigkeit): " + rahmen.length);
      /* Der Kern: JEDER registrierte inhaltliche Fall hat sich beim Laufen auch angemeldet. */
      erwarte.gleich(GEPRUEFT.length, inhalt.length, "jeder inhaltliche Fall hat sich angemeldet (" + inhalt.length + " registriert, " + GEPRUEFT.length + " gemeldet): " + GEPRUEFT.join(" · "));
      erwarte.gleich(NICHT_PRUEFBAR.length, 3, "nicht prüfbare Punkte (3 erwartet): " + NICHT_PRUEFBAR.map(x => x.stelle).join(" · "));
      for (const n of NICHT_PRUEFBAR) erwarte.wahr(n.grund.length > 20, "Grund benannt für " + n.stelle);
      /* Offene Befunde: KEINE. Die beiden vom 09.10.2026 sind am 10.10.2026 behoben und in Fall 9
         als Soll-Zustand zugesichert (focusin/focusout, fokusRetten) — hier bleibt nur die Zählung. */
      erwarte.gleich(BEFUNDE.length, 0, "offene Befunde (0 erwartet): " + BEFUNDE.map(x => x.stelle).join(" · "));
      /* Das geteilte Spiel darf durch die Attrappen nicht angefasst sein (Object.create-Hülle im Prüfstand). */
      erwarte.wahr(typeof Spiel.klassenraum === "object" && typeof Spiel.klassenraum.ausCode === "function", "Spiel.klassenraum ist unverändert das echte Modul");
      erwarte.wahr(typeof Spiel.ticketReihe === "function", "Spiel.ticketReihe ist unverändert");
    });
  });

  function ktKnotenDoku(st, tag, klasse){
    const el = st.dok.createElement(tag);
    el.className = klasse;
    return el;
  }
})();
