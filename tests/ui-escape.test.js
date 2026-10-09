"use strict";
/* ---------- Escape-Audit: schließt Escape JEDES Overlay? (Befund vom 06.10.2026) ----------
   ANLASS: In `src/ui/uebergabe.js:13-15` und `src/ui/karriere.js:283-286` steht als Lehre, dass
   „Prüfung AP1“ und „Mini-Ticket“ nach Escape OFFEN blieben, während spiel.js und hub.js korrekt
   schlossen — dort fehlte der Hörer. Seither gibt es keinen Test, der das für ALLE Overlays beweist.
   Diese Datei ist dieser Test. Sie ändert NICHTS am Programm; sie misst nur.

   INVENTUR (Suche nach role:"dialog" / aria-modal / overlay / dialogOeffnen / keydown in src/ui/):
     A src/ui/app.js:246-265        `dialogOeffnen` — Hörer auf der Hülle, :252-253
       Aufrufer: app.js:352 (Einstellungen) · app.js:365 (Tastenkürzel) · hub.js:148 (Auftragsdetail)
                 · karriere.js:90 (Kundengeschichte) · klassenraum.js:224 (Klassenraum-Datei)
     B src/ui/hub.js:13-21          `overlay` — Hörer auf document, :17-19
       Aufrufer: hub.js:76 (Wochenziel) · hub.js:97 (Aufwärmen) · hub.js:114 (Tagesrätsel)
     C src/ui/karriere.js:279-290   `overlay` — Hörer auf document, :287-288 (der reparierte Fall)
       Aufrufer: karriere.js:264 (Prüfung AP1) · :270 (Prüfungsergebnis) · :393 (Mini-Ticket)
                 · :454 (Import) · :477 (Aufstiegsfeier)
     D src/ui/spiel.js:437-445      `overlay` — Hörer auf document, :441-443
       Aufrufer: spiel.js:462 (Ergebnis nicht bestanden) · :515 (Ergebnis) · :617 (Blatt)
                 · :799 (Vorhersage)
     E src/ui/uebergabe.js:16-24    `overlay` — Hörer auf document, :20-22
       Aufrufer: uebergabe.js:48 (Rechner übergeben)
     F src/ui/palette.js:96         `pal-kasten` role="dialog" — Hörer auf der Eingabe, :120-126
     G src/ui/editor-werkzeuge.js:61 `menue popover` role="dialog" — Hörer am Element, :64
     H src/ui/editor-werkzeuge.js:13 `menue` (Kontextmenü, role="menu", kein Dialog) — Hörer :24-33
     I src/ui/editor-fach.js:27     `pa-fach` role="dialog" — Hörer an der Leiste, :125-127
     J src/ui/spiel.js:185          `am-mappe` role="dialog" — Hörer auf document (capture), :831-834

   GEPRÜFT werden A–J über den ECHTEN Weg (der Öffner der jeweiligen Datei, nicht der Hörer allein),
   jeweils mit einem Negativ-Fall: eine andere Taste schließt NICHT. Findet sich ein Overlay im Test
   nicht wieder, sagt der letzte Test die Zahl — geprüft / nicht prüfbar — ausdrücklich.
   NICHT prüfbar: der `overlay`-Bauer in src/ui/spiel.js:437-445 (D). Er hängt am Abnahmepfad
   (`abnahmeAnfordern` → `ergebnisZeigen`): offene Instanz, bestandene Abnahme, Funktionsprobe.
   Der Grund steht unten in `NICHT_PRUEFBAR` und wird im Schlusstest genannt.

   Geladen wird die Datei, die im Programm läuft, in einem eigenen vm-Bereich mit nachgebildetem DOM
   (Bauart von tests/ui-uebergabe.test.js). Kein `wirftNicht`: geprüft wird mit wahr/falsch/gleich/
   enthaelt/passt. Alle Zusicherungen stehen in `pruefe`-Rümpfen, nie im Gruppenrumpf. */
(function(){
  const KANN_LADEN = (() => {
    try { return typeof require === "function" && typeof document === "undefined" && typeof Spiel === "object" && Spiel !== null; }
    catch (e) { return false; }
  })();
  const ZUSATZ = KANN_LADEN ? "" : " (kein require im Testbereich – nur unter node tests/run.js)";

  /* Ohne Testbereich (z. B. von Hand gestartet) die Schichten selbst laden – Reihenfolge wie tests/run.js. */
  function escAlleinLaden(){
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
    try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "ui-escape.test.js"}); }
    catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
    const rot = ergebnisse.filter(e => !e.ok);
    for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
    console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
    const ueb = ergebnisse.filter(e => e.ok && e.zusicherungen === 0).length;
    if (ueb) console.log(`davon ${ueb} übersprungen (Test ohne eine einzige Zusicherung)`);
    process.exit(rot.length ? 1 : 0);
  }
  if (!KANN_LADEN && typeof require === "function") { escAlleinLaden(); return; }

  /* ================= DOM-Ersatz ================= */
  function escKlassen(el){ return String(el.className || "").split(/\s+/).filter(Boolean); }
  function escPasst(el, sel){
    const s = String(sel).trim();
    if (!s) return false;
    if (/^[a-z][a-z0-9]*$/i.test(s)) return el.tag === s;
    const teile = s.match(/\.[\w-]+|\[[^\]]+\]/g) || [];
    return teile.length > 0 && teile.every(t => {
      if (t.startsWith(".")) return escKlassen(el).includes(t.slice(1));
      const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(t);
      if (!m) return false;
      const wert = m[1] in el.attrs ? el.attrs[m[1]] : undefined;
      return m[2] === undefined ? wert !== undefined : String(wert) === m[2];
    });
  }
  function escFinde(wurzel, sel){
    const treffer = [];
    const lauf = k => { for (const x of k.kinder) if (x && x.nodeType === 1) { if (escPasst(x, sel)) treffer.push(x); lauf(x); } };
    lauf(wurzel);
    return treffer;
  }
  /* Komma-Listen wie `document.querySelector(".sp-overlay, .dialog-huelle")` (spiel.js:832) */
  function escSuche(wurzel, sel){
    for (const teil of String(sel).split(",")) { const t = escFinde(wurzel, teil.trim()); if (t.length) return t[0]; }
    return null;
  }
  function escKnoten(tag){
    const el = {
      nodeType: 1, tag, kinder: [], attrs: {}, dataset: {}, listeners: {}, className: "", value: "", disabled: false,
      hidden: false, title: "", id: "", parentNode: null,
      style: {setProperty(){}, removeProperty(){}, getPropertyValue(){ return ""; }},
      append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.parentNode = el; el.kinder.push(x); } },
      prepend(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.parentNode = el; el.kinder.unshift(x); } },
      replaceChildren(...k){ el.kinder = []; el.append(...k); },
      remove(){ if (el.parentNode) { el.parentNode.kinder = el.parentNode.kinder.filter(x => x !== el); el.parentNode = null; } },
      contains(x){ let p = x; while (p) { if (p === el) return true; p = p.parentNode; } return false; },
      closest(sel){ let p = el; while (p) { if (p.nodeType === 1 && escPasst(p, sel)) return p; p = p.parentNode; } return null; },
      setAttribute(k, v){ el.attrs[k] = String(v); if (k.startsWith("data-")) el.dataset[k.slice(5).replace(/-(\w)/g, (x, c) => c.toUpperCase())] = String(v); if (k === "hidden") el.hidden = true; },
      getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
      removeAttribute(k){ delete el.attrs[k]; if (k === "hidden") el.hidden = false; },
      addEventListener(art, fn, opt){ (el.listeners[art] ||= []).push({fn, capture: !!(opt === true || (opt && opt.capture)), opt}); },
      removeEventListener(art, fn){ if (el.listeners[art]) el.listeners[art] = el.listeners[art].filter(x => x.fn !== fn); },
      focus(){ if (ESC_DOC) ESC_DOC.activeElement = el; },
      blur(){ if (ESC_DOC && ESC_DOC.activeElement === el) ESC_DOC.activeElement = null; },
      click(){ escFeuer(el, "click", {}, "click"); },
      select(){}, setSelectionRange(){}, scrollIntoView(){},
      getBoundingClientRect(){ return {width: 120, height: 40, left: 0, top: 0, right: 120, bottom: 40}; },
      querySelector(sel){ return escSuche(el, sel); },
      querySelectorAll(sel){ const aus = []; for (const teil of String(sel).split(",")) aus.push(...escFinde(el, teil.trim())); return aus; },
      classList: {
        _l(){ return escKlassen(el); },
        _s(l){ el.className = l.join(" "); },
        add(...k){ const l = el.classList._l(); for (const x of k) if (!l.includes(x)) l.push(x); el.classList._s(l); },
        remove(...k){ el.classList._s(el.classList._l().filter(x => !k.includes(x))); },
        toggle(x, an){ const a = an === undefined ? !el.classList.contains(x) : !!an; if (a) el.classList.add(x); else el.classList.remove(x); return a; },
        contains(x){ return el.classList._l().includes(x); },
      },
      set textContent(v){ el._text = String(v); el.kinder = []; },
      get textContent(){ return el.kinder.length ? el.kinder.map(escText).join("") : (el._text || ""); },
      get lastElementChild(){ return el.kinder.filter(k => k && k.nodeType === 1).slice(-1)[0] || null; },
      get children(){ return el.kinder.filter(k => k && k.nodeType === 1); },
      get isConnected(){ let p = el; while (p.parentNode) p = p.parentNode; return !!p.__imBaum; },
      get firstChild(){ return el.kinder[0] || null; },
    };
    return el;
  }
  function escText(k){ return k == null ? "" : typeof k === "string" ? k : (k.nodeType === 3 ? k.textContent : (k.textContent || "")); }
  let ESC_DOC = null;
  function escDokument(){
    const body = escKnoten("body");
    body.__imBaum = true;
    const dok = {
      body, documentElement: Object.assign(escKnoten("html"), {dataset: {}}), activeElement: null,
      listeners: {},
      createElement: t => escKnoten(t), createElementNS: (ns, t) => escKnoten(t),
      createTextNode: t => ({nodeType: 3, textContent: String(t)}),
      getElementById: id => escFinde(body, "#" + id)[0] || null,
      querySelector: sel => escSuche(body, sel), querySelectorAll: sel => { const aus = []; for (const teil of String(sel).split(",")) aus.push(...escFinde(body, teil.trim())); return aus; },
      addEventListener(art, fn, opt){ (dok.listeners[art] ||= []).push({fn, capture: !!(opt === true || (opt && opt.capture)), opt}); },
      removeEventListener(art, fn){ if (dok.listeners[art]) dok.listeners[art] = dok.listeners[art].filter(x => x.fn !== fn); },
    };
    dok.documentElement.__imBaum = true;
    ESC_DOC = dok;
    return dok;
  }
  function escEreignis(ziel, extra){
    return Object.assign({key: "", target: ziel, currentTarget: ziel, preventDefault(){}, stopPropagation(){},
      shiftKey: false, ctrlKey: false, metaKey: false, clientX: 0, clientY: 0, type: "keydown"}, extra);
  }
  /* Eine Taste an EIN Element schicken (dessen eigene Hörer) … */
  function escFeuer(el, art, extra, typ){
    for (const h of (el.listeners[art] || []).slice()) h.fn(escEreignis(el, Object.assign({}, extra, {type: typ || art})));
  }
  /* … und an das ganze Dokument (die Hörer aus hub/karriere/spiel/uebergabe). */
  function escAnDokument(dok, art, extra){ for (const h of (dok.listeners[art] || []).slice()) h.fn(escEreignis(dok.body, extra)); }

  /* ================= Prüfstand =================
     `Spiel` geht als Hülle in den Bereich (Object.create): Lesen fällt auf das ECHTE Spiel durch,
     Schreiben (`Spiel.hub = …`, `Spiel.pruefung = …`, `Spiel.uebergabeLetzte = …`) landet auf der Hülle.
     Ohne diese Hülle schrieben die Attrappen in das geteilte Spiel des Testbereichs und brächen die
     Tests, die danach laufen — der Schlusstest misst nach, dass das echte Spiel unberührt bleibt. */
  function escStand(dateien, vor = [], nach = []){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const dok = escDokument();
    let gezaehlt = 0;
    const bereich = {
      console: {log(){}, error(){}, warn(){}, info(){}},
      document: dok, innerWidth: 1280, innerHeight: 800,
      requestAnimationFrame: fn => { try { fn(0); } catch (e) {} return 0; },
      /* Zeitgeber sofort ausführen, aber gedeckelt: das Overlay räumt sich nach 180 ms selbst weg —
         genau das soll der Test sehen. Die Deckelung verhindert eine Endlosschleife. */
      setTimeout: fn => { if (++gezaehlt < 200) { try { fn(); } catch (e) {} } return 0; },
      clearTimeout(){}, clearInterval(){}, setInterval: () => 0,
      Math, JSON, Intl, Date, performance: {now: () => 0},
      Spiel: Object.create(Spiel), DATEN, store, CLI, Modell, L, IP, eur, heute, datumDe, jetzt,
      Bus: {an: () => () => {}, aus(){}, senden(){}},
      location: {reload(){ }}, Plattform: {name: "test", datei: {exportieren: () => Promise.resolve(true)}},
    };
    vm.createContext(bereich);
    const quelle = f => fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8");
    const lauf = (code, name) => vm.runInContext(code, bereich, {filename: name});
    lauf(quelle("dom.js"), "ui/dom.js");
    lauf("UI.symbol = (n, g) => sv('svg', {class: 'sym-' + (n || 'x'), width: g || 16}); UI.toast = () => {}; UI.kopieren = () => Promise.resolve(true);", "attrappen");
    for (const s of vor) lauf(s, "vorbereitung");
    for (const d of dateien) lauf(quelle(d), "ui/" + d);
    for (const s of nach) lauf(s, "zusatz");
    lauf("globalThis.__esc = {UI: UI};", "abgriff");
    return {UI: bereich.__esc.UI, dok, lauf};
  }
  const overlays = dok => escFinde(dok.body, ".sp-overlay");
  const offeneDialoge = dok => dok.querySelectorAll(".sp-overlay, .dialog-huelle, .pal-huelle, .menue, .pa-fach");

  /* ================= Zählung (der Schlusstest nennt die Zahlen) ================= */
  const GEPRUEFT = [];
  const NICHT_PRUEFBAR = [{
    stelle: "src/ui/spiel.js:437-445 (overlay-Bauer; Aufrufer :462, :515, :617, :799)",
    grund: "nur über den Abnahmepfad erreichbar (abnahmeAnfordern → ergebnisZeigen): offene Instanz, bestandene Abnahme, Funktionsprobe – in diesem Test nicht geöffnet",
  }];
  /* Vor dem ersten Fall gemerkt: der Schlusstest prüft, dass die Attrappen das echte Spiel nicht anfassen. */
  const ECHT_VORHER = {hub: Spiel.hub, pruefung: Spiel.pruefung, uebergabeLetzte: Spiel.uebergabeLetzte};

  gruppe("UI: Escape schließt jedes Overlay" + ZUSATZ, () => {
    /* ---------- A · Hausdialog (app.js:246-265) ---------- */
    pruefe("A · Hausdialog (app.js:246): Escape schließt, eine andere Taste nicht" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const st = escStand(["app.js"]);
      const kasten = st.UI.app.dialogOeffnen("Testtitel", st.dok.createElement("div"));
      erwarte.wahr(!!kasten, "dialogOeffnen liefert den Kasten");
      const huelle = st.dok.querySelector(".dialog-huelle");
      erwarte.wahr(!!huelle, "die Hülle hängt am Dokument");
      escFeuer(huelle, "keydown", {key: "Enter"});
      erwarte.wahr(!!st.dok.querySelector(".dialog-huelle"), "Enter schließt den Hausdialog nicht");
      escFeuer(huelle, "keydown", {key: "Escape"});
      erwarte.gleich(st.dok.querySelector(".dialog-huelle"), null, "Escape schließt den Hausdialog (app.js:252-253)");
      GEPRUEFT.push("A Hausdialog app.js:246-265 (5 Aufrufer: app.js:352, app.js:365, hub.js:148, karriere.js:90, klassenraum.js:224)");
    });

    /* ---------- B · hub.js overlay ---------- */
    pruefe("B · Aufwärm-Overlay (hub.js:97): Escape schließt es" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const st = escStand(["hub.js"], [
        "Spiel.hub = Object.assign({}, Spiel.hub, {stand: () => ({aufwaermen: {erledigt: 0}}), aufgewaermt(){}});",
        "UI.karriere = {miniZeichnen(){}};",
        "UI.spiel = {status(){}, oeffnen(){}};",
      ]);
      st.UI.hub.aufwaermen();
      erwarte.gleich(overlays(st.dok).length, 1, "das Aufwärm-Overlay steht (hub.js:97)");
      escAnDokument(st.dok, "keydown", {key: "Enter"});
      erwarte.gleich(overlays(st.dok).length, 1, "Enter schließt es nicht");
      escAnDokument(st.dok, "keydown", {key: "Escape"});
      erwarte.gleich(overlays(st.dok).length, 0, "Escape schließt es (hub.js:17-19)");
      GEPRUEFT.push("B hub.js:13-21 overlay (Aufrufer :76, :97, :114)");
    });

    /* ---------- C · karriere.js overlay — die zwei historisch kaputten Fälle ---------- */
    pruefe("C1 · „Prüfung AP1“ (karriere.js:264): Escape schließt — der Befund vom 06.10.2026" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const st = escStand(["karriere.js"], [
        "Spiel.pruefung = Object.assign({}, Spiel.pruefung, {aktiv: () => ({art: 'AP1', aufgaben: []}), restMs: () => 0});",
        "UI.spiel = {oeffnen(){}, status(){}};",
      ]);
      st.UI.karriere.pruefungUebersicht();
      const ov = overlays(st.dok);
      erwarte.gleich(ov.length, 1, "das Prüfungs-Overlay steht (karriere.js:264)");
      erwarte.enthaelt(ov[0].textContent, "Prüfung AP1", "und es ist die Prüfungsübersicht");
      escFeuer(ov[0], "keydown", {key: "Enter"});
      erwarte.gleich(overlays(st.dok).length, 1, "Enter schließt es nicht");
      escAnDokument(st.dok, "keydown", {key: "Escape"});
      erwarte.gleich(overlays(st.dok).length, 0, "Escape schließt die Prüfungsübersicht (karriere.js:287-288)");
      GEPRUEFT.push("C1 karriere.js:279-290 overlay — Prüfungsübersicht :264");
    });

    pruefe("C2 · „Mini-Ticket“ (karriere.js:393): Escape schließt — der zweite Befund vom 06.10.2026" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const st = escStand(["karriere.js"], ["UI.spiel = {oeffnen(){}, status(){}};"]);
      st.UI.karriere.miniDialog();
      const ov = overlays(st.dok);
      erwarte.gleich(ov.length, 1, "das Mini-Ticket-Overlay steht (karriere.js:393)");
      erwarte.enthaelt(ov[0].textContent, "Mini-Ticket", "und es ist das Mini-Ticket");
      escFeuer(ov[0], "keydown", {key: " "});
      erwarte.gleich(overlays(st.dok).length, 1, "Leertaste schließt es nicht");
      escAnDokument(st.dok, "keydown", {key: "Escape"});
      erwarte.gleich(overlays(st.dok).length, 0, "Escape schließt das Mini-Ticket (karriere.js:287-288)");
      GEPRUEFT.push("C2 karriere.js:279-290 overlay — Mini-Ticket :393");
    });

    /* ---------- E · uebergabe.js overlay ---------- */
    pruefe("E · „Rechner übergeben“ (uebergabe.js:48): Escape schließt" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const st = escStand(["uebergabe.js"], [
        "Spiel.uebergabeLetzte = () => null;",
        "UI.app = {einstellungAbschnitt(){}, aktualisieren(){}};",
        "UI.startHaken = [];",
      ]);
      st.UI.uebergabe.zeigen();
      erwarte.gleich(overlays(st.dok).length, 1, "das Übergabe-Overlay steht (uebergabe.js:48)");
      escAnDokument(st.dok, "keydown", {key: "Escape"});
      erwarte.gleich(overlays(st.dok).length, 0, "Escape schließt es (uebergabe.js:20-22)");
      GEPRUEFT.push("E uebergabe.js:16-24 overlay (Aufrufer :48)");
    });

    /* ---------- F · palette.js ---------- */
    pruefe("F · Befehlspalette (palette.js:96): Escape schließt" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const st = escStand(["palette.js"], [
        "UI.ebenen = {LISTE: [], adresse: () => ({ip: ''}), alleAdressen: () => []};",
        "UI.GERAETE = []; UI.KATEGORIEN = [];",
        "UI.app = {liste: () => [], ansicht(){}};",
        "UI.labor = {netz: null};",
      ]);
      st.UI.palette.oeffnen();
      erwarte.gleich(st.UI.palette.offen, true, "die Palette ist offen (palette.js:89)");
      const eingabe = st.dok.querySelector(".pal-eingabe");
      erwarte.wahr(!!eingabe, "die Eingabe steht im Kasten");
      escFeuer(eingabe, "keydown", {key: "Tab"});
      erwarte.gleich(st.UI.palette.offen, true, "Tab schließt die Palette nicht (es hält nur den Fokus)");
      escFeuer(eingabe, "keydown", {key: "Escape"});
      erwarte.gleich(st.UI.palette.offen, false, "Escape schließt die Palette (palette.js:126)");
      erwarte.gleich(st.dok.querySelector(".pal-huelle"), null, "und die Hülle ist aus dem Dokument");
      GEPRUEFT.push("F palette.js:96 pal-kasten, Escape :120-126");
    });

    /* ---------- G · editor-werkzeuge.js popover ---------- */
    pruefe("G · Menü-Popover (editor-werkzeuge.js:61): Escape schließt" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const st = escStand(["editor-werkzeuge.js"]);
      st.UI.menue.popover(10, 10, st.dok.createElement("div"));
      erwarte.gleich(st.UI.menue.offen(), true, "das Popover ist offen (editor-werkzeuge.js:59)");
      const el = st.dok.querySelector(".menue");
      erwarte.wahr(!!el, "und hängt am Dokument");
      escFeuer(el, "keydown", {key: "ArrowDown"});
      erwarte.gleich(st.UI.menue.offen(), true, "Pfeil unten schließt das Popover nicht");
      escFeuer(el, "keydown", {key: "Escape"});
      erwarte.gleich(st.UI.menue.offen(), false, "Escape schließt das Popover (editor-werkzeuge.js:64)");
      GEPRUEFT.push("G editor-werkzeuge.js:61 menue popover, Escape :64");
    });

    /* ---------- H · editor-werkzeuge.js Kontextmenü (kein Dialog, aber ein Aufsatz) ---------- */
    pruefe("H · Kontextmenü (editor-werkzeuge.js:13, role=menu): Escape schließt" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const st = escStand(["editor-werkzeuge.js"]);
      st.UI.menue(10, 10, [{text: "Punkt", fn(){}}]);
      erwarte.gleich(st.UI.menue.offen(), true, "das Menü ist offen (editor-werkzeuge.js:11)");
      const el = st.dok.querySelector(".menue");
      erwarte.wahr(!!el, "und hängt am Dokument");
      escFeuer(el, "keydown", {key: "Escape"});
      erwarte.gleich(st.UI.menue.offen(), false, "Escape schließt das Menü (editor-werkzeuge.js:28)");
      GEPRUEFT.push("H editor-werkzeuge.js:13 menue (role=menu, kein Dialog), Escape :24-33");
    });

    /* ---------- I · editor-fach.js „Fach“ ---------- */
    pruefe("I · Gerätefach (editor-fach.js:27): Escape schließt" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const st = escStand(["editor-fach.js"], [
        "UI.KATEGORIEN = [{id: 'pc', typ: 'pc', skin: null, titel: 'PC', taste: '1', text: 'Arbeitsplatz', kurz: 'PC'}];",
        "UI.GERAETE = [{typ: 'pc', skin: null, kategorie: 'pc', titel: 'PC', text: 'Arbeitsplatz', kurz: 'PC'}];",
        "UI.geraetebild = () => sv('svg', {});",
        "UI.geraeteArt = (typ) => ({typ, titel: typ, text: ''});",
      ]);
      const Z = {el: {geraete: st.dok.createElement("div")}, werkzeug: "auswahl", platz: null};
      const F = {};
      st.UI.laborFach.einrichten(Z, F);
      erwarte.gleich(typeof F.fachOeffnen, "function", "das Fach meldet seinen Öffner (editor-fach.js:134)");
      F.fachOeffnen("pc", false);
      erwarte.wahr(F.fachOffen(), "das Fach ist offen");
      escFeuer(Z.el.geraete, "keydown", {key: "Enter"});
      erwarte.wahr(F.fachOffen(), "Enter schließt das Fach nicht (es setzt ein Gerät)");
      escFeuer(Z.el.geraete, "keydown", {key: "Escape"});
      erwarte.falsch(F.fachOffen(), "Escape schließt das Fach (editor-fach.js:125-127)");
      GEPRUEFT.push("I editor-fach.js:27 pa-fach, Escape :125-127");
    });

    /* ---------- J · spiel.js Auftragsmappe ---------- */
    pruefe("J · Auftragsmappe (spiel.js:185): Escape schließt" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const st = escStand(["spiel.js"], [
        "UI.app = {aktuell: 'labor', liste: () => [], ansicht(){}};",
        "UI.menue = {offen: () => false, zu(){}};",
        "UI.labor = {auftragNeu(){}, netz: null};",
        "UI.ebenen = {LISTE: [], adresse: () => ({ip: ''}), alleAdressen: () => []};",
        "UI.GERAETE = []; UI.KATEGORIEN = [];",
      ]);
      st.UI.spiel.mappeAuf("brief", false);
      erwarte.gleich(st.UI.spiel._S.mappe.offen, true, "die Mappe ist offen (spiel.js:132-135)");
      /* Der Mappen-Hörer hängt mit capture am document (spiel.js:831-834) */
      escAnDokument(st.dok, "keydown", {key: "Escape"});
      erwarte.gleich(st.UI.spiel._S.mappe.offen, false, "Escape schließt die Mappe (spiel.js:831-834)");
      GEPRUEFT.push("J spiel.js:185 am-mappe, Escape :831-834");
    });

    /* ---------- Gegenprobe: der Test misst wirklich den Hörer ---------- */
    pruefe("Gegenprobe: ohne den Hörer bleibt das Overlay offen — der Test misst den Hörer, nicht irgendetwas" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const st = escStand(["hub.js"], [
        "Spiel.hub = Object.assign({}, Spiel.hub, {stand: () => ({aufwaermen: {erledigt: 0}}), aufgewaermt(){}});",
        "UI.karriere = {miniZeichnen(){}};",
        "UI.spiel = {status(){}, oeffnen(){}};",
      ]);
      st.UI.hub.aufwaermen();
      erwarte.gleich(overlays(st.dok).length, 1, "das Overlay steht");
      st.dok.listeners.keydown = [];                     /* den Escape-Hörer wegnehmen */
      escAnDokument(st.dok, "keydown", {key: "Escape"});
      erwarte.gleich(overlays(st.dok).length, 1, "ohne Hörer schließt Escape nicht — die Fälle oben messen also den Hörer");
      erwarte.gleich(GEPRUEFT.length, 10, "die Gegenprobe zählt nicht als eigener Overlay-Fall");
    });

    /* ---------- Schluss: die Zahlen, ausdrücklich ---------- */
    pruefe("Vollständigkeit: geprüfte und nicht prüfbare Fälle werden gezählt" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      erwarte.gleich(GEPRUEFT.length, 10, "geprüfte Fälle (10 erwartet): " + GEPRUEFT.join(" · "));
      erwarte.gleich(NICHT_PRUEFBAR.length, 1, "nicht prüfbare Fälle: " + NICHT_PRUEFBAR.map(x => x.stelle).join(" · "));
      erwarte.enthaelt(NICHT_PRUEFBAR[0].stelle, "spiel.js", "der nicht prüfbare Fall ist der spiel.js-overlay-Bauer");
      erwarte.wahr(NICHT_PRUEFBAR[0].grund.length > 20, "und sein Grund steht dabei: " + NICHT_PRUEFBAR[0].grund);
      /* Die Attrappen dürfen das geteilte Spiel NICHT angefasst haben (Object.create-Hülle im Prüfstand). */
      erwarte.gleich(Spiel.hub, ECHT_VORHER.hub, "Spiel.hub ist unverändert (keine Attrappe zurückgeblieben)");
      erwarte.gleich(Spiel.pruefung, ECHT_VORHER.pruefung, "Spiel.pruefung ist unverändert");
      erwarte.gleich(Spiel.uebergabeLetzte, ECHT_VORHER.uebergabeLetzte, "Spiel.uebergabeLetzte ist unverändert");
    });
  });
})();
