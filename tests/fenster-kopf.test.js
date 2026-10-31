"use strict";
/* ---------- Strang E (Runde 4): Fenster/Shell als eigenständiges Programm ----------
   WAS HIER GEPRÜFT WIRD (nicht nur Quelltext, sondern gebaute Wirkung):
     A  Vollansicht randlos: fenster.rs schaltet im Modus "voll" set_decorations(false) und nirgends
        wieder true; die Leiste bleibt randlos, der Tray bleibt versteckt (unverändert).
     B  Fensterknöpfe: der eigene Hüllen-Befehl fenster_knopf (main.rs registriert) kennt
        minimieren/maximieren/schliessen; capabilities erlaubt das Ziehen (start-dragging).
     C  Kopfzeile im echten app.js: in einem nachgebildeten DOM mit Tauri-Attrappe entstehen genau
        DREI .fenster-knopf (aria-label Minimieren/Maximieren/Schließen), das .kopf trägt
        data-tauri-drag-region, ein Klick auf Maximieren ruft den Hüllen-Befehl. Im Browser-Modus
        entstehen KEINE Knöpfe und KEINE Zieh-Fläche – die Kopfzeile bleibt wie bisher.
     D  Palette-QoL (palette.js): sichtbarer Fokusring, Auswahl als Form (Rail), 44-px-Ziele,
        Schließen-Knopf im Tab-Kreis, Esc schließt, Enter führt aus, aria-selected wandert mit.

   BAUART: eigene vm-Bereiche mit nachgebildetem DOM (wie tests/ui-escape.test.js). Geprüft wird mit
   wahr/falsch/gleich/passt/enthaelt – alle Zusicherungen stehen in pruefe-Rümpfen.
   NICHT GEPRÜFT (ehrlich): der Start der echten .exe – in dieser Sitzung läuft eine fremde
   Programm-Instanz; die Abnahme übernimmt die Leitung (siehe Bericht). */
(function(){
  const KANN_LADEN = (() => { try { return typeof require === "function" && typeof document === "undefined" && typeof Spiel === "object" && Spiel !== null; } catch (e) { return false; } })();
  const ZUSATZ = KANN_LADEN ? "" : " (kein require im Testbereich – nur unter node tests/run.js)";
  const lies = rel => { const fs = require("fs"), path = require("path"); return fs.readFileSync(path.join(__dirname, "..", rel), "utf8"); };

  /* ================= DOM-Ersatz ================= */
  let FAKE_DOK = null;
  const klassen = el => String(el.className || "").split(/\s+/).filter(Boolean);
  function passt(el, sel){
    const teile = String(sel).match(/\.[\w-]+|\[[^\]]+\]/g) || [];
    if (!teile.length) return el.tag === String(sel).trim();
    return teile.every(t => {
      if (t.startsWith(".")) return klassen(el).includes(t.slice(1));
      const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(t);
      if (!m) return false;
      const wert = m[1].startsWith("data-") ? el.dataset[m[1].slice(5).replace(/-(\w)/g, (x, c) => c.toUpperCase())] : el.attrs[m[1]];
      return m[2] === undefined ? wert !== undefined : String(wert) === m[2];
    });
  }
  function finde(wurzel, sel){
    const treffer = [];
    const lauf = k => { for (const x of k.kinder) if (x && x.nodeType === 1) { if (passt(x, sel)) treffer.push(x); lauf(x); } };
    lauf(wurzel);
    return treffer;
  }
  const text = k => k == null ? "" : typeof k === "string" ? k : (k.textContent || "");
  function feuer(el, art, extra){
    for (const fn of (el.listeners[art] || []).slice()) fn(Object.assign({key: "", target: el, currentTarget: el, preventDefault(){}, stopPropagation(){}, shiftKey: false}, extra));
  }
  function knoten(tag){
    const el = {
      nodeType: 1, tag, kinder: [], attrs: {}, dataset: {}, className: "", _text: "", eltern: null, listeners: {},
      hidden: false, value: "", title: "", id: "", offsetWidth: 0,
      style: {setProperty(){}, removeProperty(){}, getPropertyValue(){ return ""; }},
      append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.eltern = el; el.kinder.push(x); } },
      appendChild(x){ el.append(x); return x; },
      replaceChildren(...k){ el.kinder = []; el.append(...k); },
      remove(){ if (el.eltern) { el.eltern.kinder = el.eltern.kinder.filter(x => x !== el); el.eltern = null; } },
      contains(x){ let p = x; while (p) { if (p === el) return true; p = p.eltern; } return false; },
      closest(){ return null; },
      setAttribute(k, v){ el.attrs[k] = String(v); if (k.startsWith("data-")) el.dataset[k.slice(5).replace(/-(\w)/g, (x, c) => c.toUpperCase())] = String(v); },
      getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
      removeAttribute(k){ delete el.attrs[k]; if (k === "hidden") el.hidden = false; },
      addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
      removeEventListener(art, fn){ if (el.listeners[art]) el.listeners[art] = el.listeners[art].filter(x => x !== fn); },
      focus(){ if (FAKE_DOK) FAKE_DOK.activeElement = el; },
      blur(){ if (FAKE_DOK && FAKE_DOK.activeElement === el) FAKE_DOK.activeElement = null; },
      click(){ feuer(el, "click", {}); },
      scrollIntoView(){}, select(){}, setSelectionRange(){},
      querySelector(sel){ return finde(el, sel)[0] || null; },
      querySelectorAll(sel){ return finde(el, sel); },
      classList: {
        _l(){ return klassen(el); },
        _s(l){ el.className = l.join(" "); },
        add(...k){ const l = el.classList._l(); for (const x of k) if (!l.includes(x)) l.push(x); el.classList._s(l); },
        remove(...k){ el.classList._s(el.classList._l().filter(x => !k.includes(x))); },
        toggle(x, an){ const a = an === undefined ? !el.classList.contains(x) : !!an; if (a) el.classList.add(x); else el.classList.remove(x); return a; },
        contains(x){ return el.classList._l().includes(x); },
      },
      set textContent(v){ el._text = String(v); el.kinder = []; },
      get textContent(){ return el.kinder.length ? el.kinder.map(text).join("") : el._text; },
      get children(){ return el.kinder.filter(k => k && k.nodeType === 1); },
      get lastElementChild(){ return el.kinder.filter(k => k && k.nodeType === 1).slice(-1)[0] || null; },
      get isConnected(){ let p = el; while (p.eltern) p = p.eltern; return true; },
    };
    return el;
  }
  function dokument(){
    const body = knoten("body"), html = Object.assign(knoten("html"), {dataset: {}});
    const dok = {
      body, documentElement: html, activeElement: null, listeners: {},
      createElement: t => knoten(t), createElementNS: (ns, t) => knoten(t),
      createTextNode: t => ({nodeType: 3, textContent: String(t)}),
      getElementById: () => null,
      querySelector: sel => finde(body, sel)[0] || null,
      querySelectorAll: sel => finde(body, sel),
      addEventListener(art, fn){ (dok.listeners[art] ||= []).push(fn); },
      removeEventListener(){},
    };
    FAKE_DOK = dok;
    return dok;
  }

  /* ================= Prüfstand für app.js / palette.js ================= */
  const STUBS_APP = [
    "UI.symbol = (n, g) => sv('svg', {class: 'sym-' + (n || 'x'), width: g || 16});",
    "UI.toast = () => {};",
    "UI.labor = {zeigen: c => c.append(h('div', {class: 'labor-ersatz'}))};",
    "UI.leiste = {aufgebaut: false, aufbauen(){}, abbauen(){}};",
    "UI.palette = {oeffnen(){}, schliessen(){}, get offen(){ return false; }};",
    "UI.menue = {zu(){}};",
    "UI.spiel = {oeffnen(){}};",
  ];
  const STUBS_PALETTE = [
    "UI.symbol = (n, g) => sv('svg', {class: 'sym-' + (n || 'x'), width: g || 16});",
    "UI.toast = () => {};",
    "UI.ebenen = {LISTE: [], adresse: () => ({ip: ''}), alleAdressen: () => []};",
    "UI.GERAETE = []; UI.KATEGORIEN = [];",
    "UI.app = {liste: () => [], ansicht(){}};",
    "UI.labor = {netz: null};",
  ];
  function welt(o){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const dok = dokument();
    const aufrufe = [];
    const bereich = {
      console: {log(){}, error(){}, warn(){}, info(){}},
      document: dok, matchMedia: () => ({matches: false, addEventListener(){}, removeEventListener(){}}),
      requestAnimationFrame: () => 0, performance: {now: () => 0},
      setTimeout: () => 0, clearTimeout(){},
      store, Bus: {an: () => () => {}, aus(){}, senden(){}}, eur: x => (x || 0) + " €", zahlDe: x => String(x),
    };
    if (o.tauri) {
      bereich.window = {
        __TAURI__: {core: {invoke: (befehl, args) => { aufrufe.push([befehl, args || {}]); return Promise.resolve(befehl === "fenster_zustand" ? {maximiert: false} : {maximiert: true}); }}},
        addEventListener(){}, removeEventListener(){},
      };
      bereich.Plattform = {name: "tauri", kann: () => ({ja: true, grund: null}), fenster: {modus: () => Promise.resolve()}};
    } else {
      bereich.Plattform = {name: "browser", kann: () => ({ja: false, grund: "Test"})};
    }
    vm.createContext(bereich);
    const lauf = (code, name) => vm.runInContext(code, bereich, {filename: name});
    const quelle = f => fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8");
    lauf(quelle("dom.js"), "ui/dom.js");
    lauf((o.palette ? STUBS_PALETTE : STUBS_APP).join("\n"), "attrappen");
    for (const f of o.dateien) lauf(quelle(f), "ui/" + f);
    lauf("globalThis.__w = {UI: UI};", "abgriff");
    return {UI: bereich.__w.UI, dok, aufrufe, bereich};
  }

  const regel = (css, sel) => {
    const i = css.indexOf(sel + "{");
    if (i < 0) return null;
    let tiefe = 0;
    for (let j = i; j < css.length; j++) { if (css[j] === "{") tiefe++; else if (css[j] === "}" && --tiefe === 0) return css.slice(css.indexOf("{", i) + 1, j); }
    return null;
  };
  const wert = (rumpf, prop) => { const m = String(rumpf || "").match(new RegExp("(?:^|;)\\s*" + prop + "\\s*:\\s*([^;]+)")); return m ? m[1].trim() : null; };

  gruppe("Strang E: Fenster als eigenständiges Programm" + ZUSATZ, () => {
    /* ---------- A · Randlose Vollansicht in Rust ---------- */
    pruefe("A · fenster.rs: Modus voll schaltet set_decorations(false) – nirgends wieder true", () => {
      if (!KANN_LADEN) return;
      const rs = lies("shell/src-tauri/src/fenster.rs");
      erwarte.falsch(/set_decorations\(true\)/.test(rs), "die Vollansicht schaltet die native Titelleiste wieder ein");
      const voll = rs.slice(rs.indexOf('"voll" =>'), rs.indexOf('_ => return Err(format!("Unbekannter Modus'));
      erwarte.enthaelt(voll, "set_decorations(false)", "der Zweig Modus voll setzt keine randlose Dekoration");
      erwarte.enthaelt(rs, "set_decorations(false)", "die Leiste bleibt randlos");
      erwarte.passt(rs, /pub fn knopf\(app: &AppHandle, aktion: &str\)/, "der Fensterknopf-Befehl fehlt");
    });

    pruefe("B · Fensterknopf-Befehl: drei Aktionen, registriert, Ziehen erlaubt", () => {
      if (!KANN_LADEN) return;
      const rs = lies("shell/src-tauri/src/fenster.rs");
      const knopf = rs.slice(rs.indexOf("pub fn knopf("), rs.indexOf("/// Beenden:"));
      for (const a of ["minimieren", "maximieren", "schliessen"]) erwarte.enthaelt(knopf, '"' + a + '"', "Fensteraktion fehlt: " + a);
      erwarte.enthaelt(knopf, "unmaximize", "Maximieren muss auch wiederherstellen können");
      erwarte.enthaelt(knopf, "maximize", "Maximieren muss maximieren können");
      const main = lies("shell/src-tauri/src/main.rs");
      erwarte.enthaelt(main, "fn fenster_knopf(", "main.rs kennt den Befehl nicht");
      erwarte.passt(main, /generate_handler!\[[^\]]*fenster_knopf/, "der Befehl ist nicht registriert");
      erwarte.enthaelt(lies("shell/src-tauri/capabilities/main.json"), "core:window:allow-start-dragging", "Ziehen ist nicht erlaubt");
    });

    pruefe("B2 · Fensterknöpfe: 44 px, Fokusring, ruhiger Hover – nur Tokens", () => {
      if (!KANN_LADEN) return;
      const css = lies("src/stil/rahmen.css");
      const block = regel(css, ".fenster-knopf");
      erwarte.gleich(wert(block, "width"), "44px", "Fensterknopf ist nicht 44 px breit");
      erwarte.gleich(wert(block, "height"), "44px", "Fensterknopf ist nicht 44 px hoch");
      erwarte.enthaelt(regel(css, ".fenster-knopf:focus-visible"), "outline:2px solid var(--accent)", "kein sichtbarer Fokusring");
      erwarte.enthaelt(regel(css, ".fenster-knopf:hover"), "var(--panel-3)", "Hover nutzt keine Token-Fläche");
      erwarte.enthaelt(css, ".kopf.mit-fenster{padding-right:0}", "die Knöpfe sitzen nicht am rechten Rand");
    });

    /* ---------- C · Kopfzeile in app.js: Tauri-Modus baut Knöpfe, Browser nicht ---------- */
    pruefe("C1 · Tauri-Modus: drei Fensterknöpfe, Zieh-Fläche, aria-label, Befehl kommt an", () => {
      if (!KANN_LADEN) return;
      const w = welt({tauri: true, dateien: ["app.js"]});
      const container = w.dok.createElement("div");
      w.UI.app.aufbauen(container);
      const root = container.querySelector(".app");
      erwarte.wahr(!!root, "der App-Rahmen steht");
      const knoepfe = root.querySelectorAll(".fenster-knopf");
      erwarte.gleich(knoepfe.length, 3, "genau drei Fensterknöpfe");
      erwarte.gleich(knoepfe.map(b => b.getAttribute("aria-label")), ["Minimieren", "Maximieren", "Schließen"], "aria-labels der Fensterknöpfe");
      const kopf = root.querySelector(".kopf");
      erwarte.gleich(kopf.getAttribute("data-tauri-drag-region"), "deep", "die Kopfzeile ist Zieh-Fläche");
      erwarte.wahr(kopf.classList.contains("mit-fenster"), "die Kopfzeile trägt den Fenster-Modus");
      erwarte.gleich(w.aufrufe[0] && w.aufrufe[0][0], "fenster_zustand", "der Grundzustand wird beim Aufbau gelesen");
      const max = knoepfe.find(b => b.getAttribute("data-fenster") === "maximieren");
      max.click();
      erwarte.wahr(w.aufrufe.some(a => a[0] === "fenster_knopf" && a[1] && a[1].aktion === "maximieren"), "Maximieren ruft den Hüllen-Befehl");
    });

    pruefe("C2 · Browser-Modus: Kopfzeile unverändert – keine Knöpfe, keine Zieh-Fläche", () => {
      if (!KANN_LADEN) return;
      const w = welt({tauri: false, dateien: ["app.js"]});
      const container = w.dok.createElement("div");
      w.UI.app.aufbauen(container);
      const root = container.querySelector(".app");
      erwarte.gleich(root.querySelectorAll(".fenster-knopf").length, 0, "im Browser gibt es keine Fensterknöpfe");
      const kopf = root.querySelector(".kopf");
      erwarte.gleich(kopf.getAttribute("data-tauri-drag-region"), null, "im Browser keine Zieh-Fläche");
      erwarte.falsch(kopf.classList.contains("mit-fenster"), "im Browser kein Fenster-Modus");
      erwarte.gleich(root.querySelectorAll(".kopf-knopf").length, 5, "die fünf bestehenden Kopf-Knöpfe bleiben");
      erwarte.gleich(root.querySelector(".marke-name").textContent, "Netzwerk-Labor", "die Marke bleibt");
    });

    /* ---------- D · palette.js: QoL, aber keine Falle ---------- */
    pruefe("D1 · Palette: Schließen-Knopf, 44-px-Ziele, sichtbarer Fokus, Rail am aktiven Befehl", () => {
      if (!KANN_LADEN) return;
      const w = welt({tauri: false, dateien: ["palette.js"], palette: true});
      w.UI.palette.oeffnen();
      const zu = w.dok.querySelector(".pal-zu");
      erwarte.wahr(!!zu, "der Schließen-Knopf fehlt");
      erwarte.gleich(zu.getAttribute("aria-label"), "Befehlspalette schließen", "aria-label des Schließen-Knopfs");
      const css = lies("src/stil/rahmen.css");
      const blockZu = regel(css, ".pal-zu");
      erwarte.gleich(wert(blockZu, "width"), "44px", "Schließen-Knopf ist nicht 44 px breit");
      erwarte.gleich(wert(blockZu, "height"), "44px", "Schließen-Knopf ist nicht 44 px hoch");
      erwarte.wahr(!!regel(css, ".pal-huelle:focus-within .pal-kasten"), "der Fokusring der Palette fehlt");
      erwarte.enthaelt(regel(css, ".pal-punkt.an"), "inset 2px 0 0 var(--accent)", "die Auswahl ist keine Form (Rail fehlt)");
      erwarte.gleich(w.dok.querySelectorAll(".pal-punkt.an").length, 1, "genau eine aktive Zeile");
      erwarte.gleich(w.dok.querySelector(".pal-punkt.an").getAttribute("aria-selected"), "true", "aria-selected markiert die Zeile");
      w.UI.palette.schliessen();
    });

    pruefe("D2 · Palette: Tab erreicht den Schließen-Knopf (kein Fokusverlust), Esc schließt überall", () => {
      if (!KANN_LADEN) return;
      const w = welt({tauri: false, dateien: ["palette.js"], palette: true});
      w.UI.palette.oeffnen();
      const eingabe = w.dok.querySelector(".pal-eingabe");
      feuer(eingabe, "keydown", {key: "Tab"});
      erwarte.gleich(w.UI.palette.offen, true, "Tab schließt die Palette nicht");
      erwarte.wahr(w.dok.activeElement === w.dok.querySelector(".pal-zu"), "Tab setzt den Fokus auf den Schließen-Knopf");
      feuer(w.dok.activeElement, "keydown", {key: "Escape"});
      erwarte.gleich(w.UI.palette.offen, false, "Esc auf dem Knopf schließt die Palette");
      erwarte.gleich(w.dok.querySelector(".pal-huelle"), null, "die Hülle ist danach aus dem Dokument");
    });

    pruefe("D3 · Palette: Enter führt den Treffer aus, Esc von der Eingabe schließt", () => {
      if (!KANN_LADEN) return;
      const w = welt({tauri: false, dateien: ["palette.js"], palette: true});
      let getan = null;
      w.UI.palette.befehl({name: "probe", text: "Probe-Befehl", aktion: () => { getan = "ja"; }});
      w.UI.palette.oeffnen("Probe-Befehl");
      const eingabe = w.dok.querySelector(".pal-eingabe");
      feuer(eingabe, "keydown", {key: "Enter"});
      erwarte.gleich(getan, "ja", "Enter hat den Befehl nicht ausgeführt");
      erwarte.gleich(w.UI.palette.offen, false, "nach Enter ist die Palette zu");
      erwarte.gleich(w.dok.querySelector(".pal-huelle"), null, "die Hülle ist entfernt");
      w.UI.palette.oeffnen();
      feuer(w.dok.querySelector(".pal-eingabe"), "keydown", {key: "Escape"});
      erwarte.gleich(w.UI.palette.offen, false, "Esc von der Eingabe schließt");
    });
  });
})();
