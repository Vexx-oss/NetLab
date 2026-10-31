"use strict";
/* SHOP ALS WERKSTATTREGAL (src/ui/shop.js, Runde 4 / Strang F)
   Der Shop ist kein Preisformular mehr, sondern ein Bento-Regal mit Warengruppen nach Aufgabe:
   Werkzeuge (Lerninhalt), Automatisierung (Playbooks + Slots), Aussehen (mit echter Token-Probe)
   und Wartungsverträge als Verweis in die Kundenakte (kein zweiter Kaufweg).
   Geprüft werden die Zusagen des Gestaltungsvertrags (§ 3 F):
     · [data-ansicht="shop"] und das .kr-*-Gerüst bleiben; die Ansicht meldet sich als Reiter an;
     · je Artikel Name, ein Satz Nutzen, Preis und ein Zustands-Chip mit Text + FORMA (Symbol, nie nur Farbe);
     · genau eine Aktion je kaufbarem Artikel; gesperrte/zu teure Artikel nennen den echten Grund;
     · Kauf ab Spiel.shop.BESTAETIGUNG_AB als ruhiger Dialog: Esc schließt, Enter bestätigt, Fokus zurück;
     · Empfehlung nur aus echten Daten (günstigster JETZT kaufbarer Artikel), sonst keine;
     · Aussehen-Vorschau = echte Tokens (Farbe aus Spiel.AUSSEHEN, Leistenstil als Mini-Skizze), kein Bild;
     · keine erfundenen Zahlen: Preise, Zähler und Kontostand kommen aus Spiel.shop.liste()/Spiel.st.

   Bauart wie tests/spiel-lernstand-hilfe.test.js: eigene vm-Welt mit nachgebildetem DOM, echte Dateien
   aus src/ui (dom.js, bento.js, app.js, karriere.js, lernstand.js, shop.js) und echtes Spiel. Nur was
   nicht zu diesem Baustein gehört (Symbole, Leiste, Palette, Labor, Toast), ist ersetzt. Die Ansicht
   wird über den echten Weg geöffnet: Start-Haken → Registrierung → Reiter im Andock.

   Allein lauffähig:  node tests/shop-regal.test.js */
(function(){
  /* ================= Umgebung ================= */
  const hatRequire = (() => { try { return typeof require === "function"; } catch (e) { return false; } })();
  const KANN_LADEN = (() => {
    try { return hatRequire && typeof document === "undefined" && typeof Spiel === "object" && Spiel !== null; }
    catch (e) { return false; }
  })();
  const ZUSATZ = KANN_LADEN ? "" : " (kein require im Testbereich – nur allein lauffähig: node tests/shop-regal.test.js)";

  /* ---------------- Allein lauffähig: dieselbe Ladereihenfolge wie tests/run.js ---------------- */
  function shopAlleinLaden(){
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
    try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "shop-regal.test.js"}); }
    catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
    const rot = ergebnisse.filter(e => !e.ok);
    for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
    console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
    const ueb = ergebnisse.filter(e => e.ok && e.zusicherungen === 0).length;
    if (ueb) console.log(`davon ${ueb} übersprungen (Test ohne eine einzige Zusicherung)`);
    process.exit(rot.length ? 1 : 0);
  }
  if (!KANN_LADEN && hatRequire && typeof Spiel === "undefined") { shopAlleinLaden(); return; }

  /* ================= DOM-Ersatz ================= */
  let SK_DOC = null;

  function skKlassen(el){ return String((el && el.className) || "").split(/\s+/).filter(Boolean); }
  function skPasst(el, sel){
    if (!el || el.nodeType !== 1) return false;
    const s = String(sel || "").trim();
    if (!s) return false;
    const m = s.match(/^([a-zA-Z][\w-]*)?((?:[.#][\w-]+|\[[^\]]+\])*)$/);
    if (!m) return false;
    if (m[1] && el.tag !== m[1].toLowerCase()) return false;
    for (const t of (m[2].match(/[.#][\w-]+|\[[^\]]+\]/g) || [])) {
      if (t[0] === ".") { if (!skKlassen(el).includes(t.slice(1))) return false; }
      else if (t[0] === "#") { if (el.attrs.id !== t.slice(1)) return false; }
      else {
        const a = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(t);
        if (!a) return false;
        const wert = el.attrs[a[1]];
        if (a[2] === undefined ? wert === undefined : String(wert) !== a[2]) return false;
      }
    }
    return true;
  }
  /* Selektoren: Komma-Liste und Nachfahren (a b c); je Glied tag#id.klasse[attr="wert"]. */
  function skFinde(wurzel, sel){
    const treffer = [];
    const alle = [];
    (function lauf(k){ for (const x of k.kinder) if (x && x.nodeType === 1) { alle.push(x); lauf(x); } })(wurzel);
    for (const teil of String(sel || "").split(",")) {
      const kette = teil.trim().split(/\s+/).filter(Boolean);
      if (!kette.length) continue;
      for (const x of alle) {
        if (!skPasst(x, kette[kette.length - 1])) continue;
        let ok = true, p = x.parentNode;
        for (let i = kette.length - 2; i >= 0 && ok; i--) {
          while (p && p.nodeType === 1 && !skPasst(p, kette[i])) p = p.parentNode;
          if (!p || p.nodeType !== 1) ok = false; else p = p.parentNode;
        }
        if (ok) treffer.push(x);
      }
    }
    return treffer;
  }
  function skText(k){ return k == null ? "" : typeof k === "string" ? k : (k.nodeType === 3 ? k.textContent : (k.textContent || "")); }

  function skKnoten(tag){
    const el = {
      nodeType: 1, tag: String(tag).toLowerCase(), kinder: [], attrs: {}, dataset: {}, listeners: {},
      className: "", _text: "", parentNode: null, hidden: false, value: "", title: "", disabled: false, __baum: false,
      style: {
        _p: {},
        setProperty(k, v){ this._p[k] = v == null ? "" : String(v); },
        removeProperty(k){ delete this._p[k]; },
        getPropertyValue(k){ return this._p[k] || ""; },
      },
      append(...k){ for (const x of k){ if (x == null || x === false) continue; if (typeof x === "object") x.parentNode = el; el.kinder.push(x); } },
      appendChild(x){ el.append(x); return x; },
      prepend(...k){ for (const x of k){ if (x == null || x === false) continue; if (typeof x === "object") x.parentNode = el; el.kinder.unshift(x); } },
      replaceChildren(...k){ el.kinder = []; el.append(...k); },
      remove(){ if (el.parentNode){ el.parentNode.kinder = el.parentNode.kinder.filter(x => x !== el); el.parentNode = null; } },
      contains(x){ let p = x; while (p){ if (p === el) return true; p = p.parentNode; } return false; },
      closest(sel){ let p = el; while (p && p.nodeType === 1){ if (skPasst(p, sel)) return p; p = p.parentNode; } return null; },
      setAttribute(k, v){
        el.attrs[k] = String(v);
        if (k === "class") el.className = String(v);
        if (k === "title") el.title = String(v);
        if (k === "disabled") el.disabled = true;
        if (k === "hidden") el.hidden = true;
        if (k.slice(0, 5) === "data-") el.dataset[k.slice(5).replace(/-(\w)/g, (x, c) => c.toUpperCase())] = String(v);
      },
      getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
      removeAttribute(k){
        delete el.attrs[k];
        if (k === "class") el.className = "";
        if (k === "disabled") el.disabled = false;
        if (k === "hidden") el.hidden = false;
      },
      addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
      removeEventListener(art, fn){ if (el.listeners[art]) el.listeners[art] = el.listeners[art].filter(f => f !== fn); },
      focus(){ if (SK_DOC) SK_DOC.activeElement = el; },
      blur(){ if (SK_DOC && SK_DOC.activeElement === el) SK_DOC.activeElement = null; },
      click(){ skFeuer(el, "click", {target: el, currentTarget: el}); },
      querySelector(sel){ return skFinde(el, sel)[0] || null; },
      querySelectorAll(sel){ return skFinde(el, sel); },
      getBoundingClientRect(){ return {width: 120, height: 40, left: 0, top: 0, right: 120, bottom: 40}; },
      get isConnected(){ let p = el; while (p && p.parentNode) p = p.parentNode; return !!(p && p.__baum); },
      classList: {
        _l(){ return skKlassen(el); },
        _s(l){ el.className = l.join(" "); },
        add(...k){ const l = el.classList._l(); for (const x of k) if (!l.includes(x)) l.push(x); el.classList._s(l); },
        remove(...k){ el.classList._s(el.classList._l().filter(x => !k.includes(x))); },
        toggle(x, an){ const a = an === undefined ? !el.classList.contains(x) : !!an; if (a) el.classList.add(x); else el.classList.remove(x); return a; },
        contains(x){ return el.classList._l().includes(x); },
      },
      set textContent(v){ el._text = String(v); el.kinder = []; },
      get textContent(){ return el.kinder.length ? el.kinder.map(skText).join("") : (el._text || ""); },
      get children(){ return el.kinder.filter(k => k && k.nodeType === 1); },
      get lastElementChild(){ return el.children.slice(-1)[0] || null; },
    };
    return el;
  }
  function skEreignis(ziel, extra){
    return Object.assign({key: "", target: ziel, currentTarget: ziel, preventDefault(){}, stopPropagation(){},
      shiftKey: false, ctrlKey: false, metaKey: false, clientX: 0, clientY: 0, type: "keydown"}, extra);
  }
  function skFeuer(el, art, extra, typ){
    for (const fn of (el.listeners[art] || []).slice()) fn(skEreignis(el, Object.assign({}, extra, {type: typ || art})));
  }
  function skDokument(){
    const body = skKnoten("body");
    body.__baum = true;
    const app = skKnoten("div");
    app.attrs.id = "app";
    body.append(app);
    const doc = {
      body, app, documentElement: Object.assign(skKnoten("html"), {dataset: {}}), activeElement: null, listeners: {},
      createElement: t => skKnoten(t),
      createElementNS: (ns, t) => skKnoten(t),
      createTextNode: t => ({nodeType: 3, textContent: String(t)}),
      getElementById: id => skFinde(body, "#" + id)[0] || null,
      querySelector: sel => skFinde(body, sel)[0] || null,
      querySelectorAll: sel => skFinde(body, sel),
      addEventListener(art, fn){ (doc.listeners[art] ||= []).push(fn); },
      removeEventListener(art, fn){ if (doc.listeners[art]) doc.listeners[art] = doc.listeners[art].filter(f => f !== fn); },
    };
    doc.documentElement.__baum = true;
    SK_DOC = doc;
    return doc;
  }

  /* ================= Prüfstand: echte Ansicht im echten App-Rahmen ================= */
  /* Lädt dom.js, bento.js, app.js, karriere.js, lernstand.js und shop.js in einer eigenen vm-Welt.
     Nur fremde Bausteine (Symbole, Leiste, Palette, Menü, Labor, Toast) sind ersetzt; die Ansicht
     öffnet sich über den echten Weg (Start-Haken → Registrierung → Andock-Reiter). */
  function shopWelt(){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const dokument = skDokument();
    const rufe = [], fehler = [];
    const bereich = {
      console: {log(){}, warn(){}, info(){}, error: (...a) => fehler.push(a.map(x => (x && x.stack) || String(x)).join(" "))},
      document: dokument, innerWidth: 1440, innerHeight: 950,
      requestAnimationFrame: fn => { try { fn(0); } catch (e) { fehler.push("rAF: " + ((e && e.stack) || e)); } return 0; },
      setTimeout: fn => { try { fn(); } catch (e) { fehler.push("Timer: " + ((e && e.stack) || e)); } return 0; },
      clearTimeout(){}, setInterval: () => 0, clearInterval(){},
      Math, JSON, Intl, Date, performance: {now: () => 0},
      matchMedia: () => ({matches: false, addEventListener(){}, removeEventListener(){}}),
      Spiel, L, store, Bus: {an: () => () => {}, aus(){}, senden(){}},
      eur, zahlDe, klemme, heute, datumDe,
      Plattform: {name: "test", kann: () => ({ja: false, grund: ""}), fenster: {modus(){}, immerOben(){}}, datei: {}, autostart(){}},
    };
    bereich.__rufe = rufe;
    vm.createContext(bereich);
    const quelle = f => fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8");
    const lauf = (code, name) => vm.runInContext(code, bereich, {filename: name});
    lauf(quelle("dom.js"), "ui/dom.js");
    lauf([
      'UI.symbol = (n, g) => sv("svg", {class: "sym-" + (n || "info"), width: g || 16, height: g || 16});',
      'UI.toast = (text, art, opt) => __rufe.push(["toast", text, art, opt]);',
      "UI.menue = {zu(){}};",
      "UI.palette = {oeffnen(){}, schliessen(){}, get offen(){ return false; }};",
      "UI.leiste = {aufgebaut: false, aufbauen(){}, abbauen(){}, status(){}};",
      'UI.labor = {zeigen: c => c.replaceChildren(h("div", {class: "labor-ersatz"})), wieder(){}};',
      "UI.spiel = {oeffnen(){}, status(){}};",
      "UI.kopieren = () => Promise.resolve(true);",
    ].join("\n"), "attrappen");
    for (const f of ["bento.js", "app.js", "karriere.js", "lernstand.js", "shop.js"]) lauf(quelle(f), "ui/" + f);
    lauf("globalThis.__shop = {UI: UI};", "abgriff");
    const U = bereich.__shop.UI;
    for (const fn of U.startHaken || []) fn();          /* wie UI.starten: erst die Start-Haken */
    U.modus("voll");                                    /* baut den echten App-Rahmen */
    const zeige = name => { U.app.ansicht(name); return dokument.querySelector('.ansicht[data-ansicht="' + name + '"]'); };
    const reiter = name => dokument.querySelectorAll(".dock-knopf").find(b => b.dataset.ansicht === name) || null;
    return {U, dokument, rufe, fehler, zeige, reiter};
  }

  /* Spielstand-Kapsel: eigener Stand, deterministischer Lernmotor, danach alles zurück. */
  function shopKapsel(fn){
    return () => {
      const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
      const altL = L.st ? JSON.parse(JSON.stringify(L.st)) : null;
      try {
        Spiel._trocken = true; Spiel._lz = {};
        Spiel._st = Spiel.leererStand();
        Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
        if (L.st) { L.st.units = {}; }                  /* alle Fertigkeiten „neu“: Playbooks gesperrt */
        fn();
      } finally {
        Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
        if (altL != null && L.st) { for (const k of Object.keys(L.st)) delete L.st[k]; Object.assign(L.st, altL); }
      }
    };
  }
  /* Baut Spielstand + Welt in einem: stufe/euro wie im echten Spiel, Lernmotor leer. */
  function shopStand(o){
    const st = Spiel._st;
    st.stufe = o.stufe == null ? 3 : o.stufe;
    st.euro = o.euro == null ? 156 : o.euro;
    st.ruf = o.ruf == null ? 14 : o.ruf;
    st.kunden = o.kunden || {};
    return shopWelt();
  }

  /* Kleine Helfer für die Zusicherungen */
  const karten = c => c.querySelectorAll(".kr-ware");
  const karte = (c, id) => c.querySelector('[data-artikel="' + id + '"]');
  const preisVon = e => eur(e.preis) + " €";
  const listeVon = () => Spiel.shop.liste();

  /* ================= Tests ================= */
  gruppe("UI: Shop als Werkstattregal" + ZUSATZ, () => {
    pruefe("Die Ansicht meldet sich als Reiter „Shop“ an und zieht als Regal um" + ZUSATZ, shopKapsel(() => {
      if (!KANN_LADEN) return;
      const W = shopStand({});
      erwarte.gleich(W.fehler, [], "keine Fehler beim Aufbau");
      const eintrag = W.U.app.liste().find(a => a.name === "shop");
      erwarte.wahr(!!eintrag, "die Ansicht ist angemeldet");
      erwarte.gleich(eintrag.titel, "Shop", "der Reiter behält seinen Namen");
      const b = W.reiter("shop");
      erwarte.wahr(!!b, "es gibt genau einen Andock-Knopf für den Shop");
      b.click();                                          /* der Klick des Spielers */
      const c = W.dokument.querySelector('.ansicht[data-ansicht="shop"]');
      erwarte.wahr(!!c, "die Shop-Ansicht ist gebaut");
      erwarte.wahr(!!c.querySelector(".kr-seite"), "das .kr-seite-Gerüst bleibt");
      erwarte.wahr(!!c.querySelector(".kr-kopf"), "der .kr-kopf bleibt");
      erwarte.gleich(c.querySelector(".kr-kopf h2").textContent, "Werkstattregal", "die Fläche heißt Werkstattregal");
      erwarte.enthaelt(c.querySelector(".bn-kicker").textContent, "Werkstatt", "mit Mikrolabel");
      erwarte.enthaelt(c.querySelector(".wr-konto-wert").textContent, preisVon({preis: 156}), "das echte Konto steht im Kopf");
      erwarte.wahr(c.querySelector(".kr-kopf .bn-lead").textContent.length > 20, "und ein Kontextsatz");
      /* Zweiter Blick auf denselben Reiter darf nichts verdoppeln. */
      W.U.app.ansicht("labor");
      W.reiter("shop").click();
      const c2 = W.dokument.querySelector('.ansicht[data-ansicht="shop"]');
      erwarte.gleich(W.dokument.querySelectorAll('.ansicht[data-ansicht="shop"]').length, 1, "nur eine Shop-Ansicht");
      erwarte.gleich(karten(c2).length, karten(c).length, "und dieselbe Zahl Karten");
    }));

    pruefe("Vier Warengruppen nach Aufgabe mit echtem Zähler" + ZUSATZ, shopKapsel(() => {
      if (!KANN_LADEN) return;
      const W = shopStand({euro: 156, stufe: 3});
      const c = W.zeige("shop"), liste = listeVon();
      const gruppen = c.querySelectorAll(".kr-gruppe");
      erwarte.gleich(gruppen.length, 4, "Werkzeuge, Automatisierung, Aussehen, Kunden");
      erwarte.gleich(gruppen.map(g => g.getAttribute("data-gruppe")), ["Werkzeuge", "Automatisierung", "Aussehen", "Kunden"]);
      for (const g of gruppen) {
        erwarte.wahr(!!g.querySelector("h3"), "jede Gruppe hat einen Titel: " + g.getAttribute("data-gruppe"));
        erwarte.wahr((g.querySelector(".wr-gruppe-zahl") || {}).textContent, "und einen Zähler");
        erwarte.wahr((g.querySelector(".wr-gruppe-text") || {}).textContent, "und einen Satz");
      }
      const werkzeuge = liste.filter(e => e.art === "werkzeug"), aussehen = liste.filter(e => e.art === "aussehen");
      const vertraege = liste.filter(e => e.art === "vertrag");
      erwarte.gleich(gruppen[0].querySelector(".wr-gruppe-zahl").textContent, werkzeuge.length + " Artikel", "Werkzeug-Zähler aus den Daten");
      erwarte.enthaelt(gruppen[1].querySelector(".wr-gruppe-zahl").textContent, "/" + Spiel.st.playbooks.slots + " belegt", "Slot-Belegung aus dem Spielstand");
      erwarte.gleich(gruppen[2].querySelector(".wr-gruppe-zahl").textContent,
        aussehen.filter(e => e.zustand === "gekauft" || e.zustand === "aktiv").length + " von " + aussehen.length + " gekauft", "Aussehen-Zähler aus den Daten");
      erwarte.gleich(gruppen[3].querySelector(".wr-gruppe-zahl").textContent,
        vertraege.filter(e => e.zustand === "gekauft").length + " von " + vertraege.length + " Verträgen aktiv", "Vertrags-Zähler aus den Daten");
    }));

    pruefe("Je Artikel Name, ein Satz Nutzen, Preis und Zustands-Chip mit Text und Form" + ZUSATZ, shopKapsel(() => {
      if (!KANN_LADEN) return;
      const W = shopStand({euro: 156, stufe: 3});
      const c = W.zeige("shop"), liste = listeVon();
      const erwartet = liste.filter(e => e.art === "werkzeug" || e.art === "slot" ||
        (e.art === "playbook" && e.zustand !== "gesperrt") || e.art === "aussehen");
      const alle = karten(c);
      erwarte.gleich(alle.length, erwartet.length, "jeder sichtbare Artikel ist eine Karte");
      const TEXT = {kaufbar: "Kaufbar", "zu-teuer": "Zu teuer", gekauft: "Gekauft", aktiv: "Aktiv",
        gesperrt: "Gesperrt", "kein-slot": "Kein Slot frei", veraltet: "Wiederholen"};
      for (const k of alle) {
        const id = k.getAttribute("data-artikel");
        erwarte.wahr(!!k.querySelector(".wr-artikel-name").textContent, "Name fehlt bei " + id);
        const txt = k.querySelector(".wr-artikel-text").textContent;
        erwarte.wahr(txt.length > 10, "Nutzensatz fehlt bei " + id);
        erwarte.gleich(txt.indexOf(". "), -1, "genau ein Satz Nutzen bei " + id + ": " + txt);
        /* Aktive/gekaufte Artikel tragen keinen Preis – „0,00 €“ neben „Aktiv“ wäre irreführend
           (Prüfer-1-Befund). Die Aussage trägt der Zustands-Chip. */
        const zustand = k.getAttribute("data-zustand");
        if (zustand === "aktiv" || zustand === "gekauft") {
          erwarte.gleich(k.querySelector(".wr-preis"), null, "kein Preis am " + zustand + "en Artikel " + id);
        } else {
          erwarte.enthaelt(k.querySelector(".wr-preis").textContent, "€", "Preis fehlt bei " + id);
        }
        const chip = k.querySelector(".wr-chip");
        erwarte.wahr(!!chip, "Zustands-Chip fehlt bei " + id);
        erwarte.gleich(chip.textContent.trim(), TEXT[k.getAttribute("data-zustand")], "Chip-Text passt zum Zustand bei " + id);
        erwarte.gleich(chip.querySelectorAll("svg").length, 1, "der Chip trägt eine Form (Symbol), nicht nur Farbe: " + id);
      }
    }));

    pruefe("Zustände sind ehrlich: „zu teuer“ nennt den fehlenden Betrag, gesperrt den Grund" + ZUSATZ, shopKapsel(() => {
      if (!KANN_LADEN) return;
      const W = shopStand({euro: 0, stufe: 1});
      const c = W.zeige("shop");
      const texte = karten(c).map(k => k.querySelector(".wr-chip").textContent.trim());
      erwarte.wahr(texte.includes("Zu teuer"), "ohne Geld sind Artikel zu teuer");
      erwarte.wahr(texte.includes("Gesperrt"), "zu niedrige Stufe sperrt Artikel");
      erwarte.wahr(texte.includes("Aktiv"), "das Standard-Aussehen ist aktiv");
      /* Karten ohne Aktion sagen leise, warum nichts zu tun ist (Text, keine leere Fläche). */
      const aktiv = karte(c, "aussehen:cyan");
      erwarte.gleich(aktiv.getAttribute("data-zustand"), "aktiv");
      erwarte.gleich(aktiv.querySelectorAll("button").length, 0, "das aktive Aussehen bietet keine Aktion");
      erwarte.enthaelt(aktiv.querySelector(".wr-ruhe").textContent, "Im Leitstand aktiv", "statt einer leeren Fläche steht dort ein echter Satz");
      erwarte.gleich(aktiv.querySelector(".wr-preis"), null, "kein irreführendes „0,00 €“ neben „Aktiv“");
      erwarte.wahr(!!aktiv.querySelector(".wr-chip"), "der Zustands-Chip bleibt");
      const arm = karte(c, "werkzeug:kabeltester");
      erwarte.gleich(arm.getAttribute("data-zustand"), "zu-teuer");
      erwarte.enthaelt(arm.querySelector(".wr-grund").textContent, "fehlen", "der Grund nennt den fehlenden Betrag");
      erwarte.enthaelt(arm.querySelector(".wr-grund").textContent, preisVon({preis: 40}), "und zwar den echten: " + arm.querySelector(".wr-grund").textContent);
      const gesperrt = karte(c, "werkzeug:netzpruefer");
      erwarte.gleich(gesperrt.getAttribute("data-zustand"), "gesperrt");
      erwarte.enthaelt(gesperrt.querySelector(".wr-grund").textContent, "Stufe 2", "der Grund nennt die Stufe");
    }));

    pruefe("Genau eine Aktion je kaufbarem Artikel – nie zwei" + ZUSATZ, shopKapsel(() => {
      if (!KANN_LADEN) return;
      const W = shopStand({euro: 1000, stufe: 3});
      const c = W.zeige("shop");
      const kaufbar = karten(c).filter(k => k.getAttribute("data-zustand") === "kaufbar");
      erwarte.wahr(kaufbar.length > 5, "genug kaufbare Artikel für die Probe: " + kaufbar.length);
      for (const k of kaufbar) {
        const knoepfe = k.querySelectorAll("button");
        erwarte.gleich(knoepfe.length, 1, "genau ein Knopf bei " + k.getAttribute("data-artikel"));
        erwarte.gleich(knoepfe[0].textContent.trim(), "Kaufen", "und zwar der Kauf");
        erwarte.falsch(!!knoepfe[0].getAttribute("disabled"), "der Kauf ist nicht ausgegraut");
      }
      for (const k of karten(c)) {
        if (k.getAttribute("data-zustand") === "kaufbar") continue;
        erwarte.wahr(k.querySelectorAll("button").length <= 1, "höchstens eine Aktion bei " + k.getAttribute("data-artikel"));
      }
      /* Die Empfehlung ist ein Chip, kein zweiter Knopf. */
      const empfohlen = c.querySelectorAll(".wr-empfehlung");
      erwarte.gleich(empfohlen.length, 1, "genau eine Empfehlung");
      erwarte.gleich(empfohlen[0].closest(".kr-ware").querySelectorAll("button").length, 1, "die Empfehlung fügt keine zweite Aktion hinzu");
    }));

    pruefe("Kauf unter 100 € geht direkt (ohne Dialog)" + ZUSATZ, shopKapsel(() => {
      if (!KANN_LADEN) return;
      const W = shopStand({euro: 1000, stufe: 3});
      const c = W.zeige("shop");
      const k = karte(c, "werkzeug:kabeltester"), knopf = k.querySelector(".wr-aktion");
      erwarte.gleich(knopf.textContent.trim(), "Kaufen");
      knopf.click();
      erwarte.gleich(W.dokument.querySelector(".dialog-huelle"), null, "kein Dialog unter der Schwelle");
      erwarte.gleich(Spiel.st.euro, 960, "der echte Preis wurde abgebucht");
      erwarte.wahr(Spiel.werkzeug.hat("kabeltester"), "das Werkzeug ist gekauft");
      const neu = W.dokument.querySelector('.ansicht[data-ansicht="shop"]');
      const k2 = karte(neu, "werkzeug:kabeltester");
      erwarte.gleich(k2.getAttribute("data-zustand"), "gekauft", "die Karte zeigt den neuen Zustand");
      erwarte.gleich(k2.querySelector(".wr-chip").textContent.trim(), "Gekauft");
      erwarte.gleich(k2.querySelectorAll("button").length, 0, "ein gekauftes Werkzeug bietet keine zweite Aktion");
      const toast = W.rufe.filter(r => r[0] === "toast")[0];
      erwarte.wahr(!!toast, "es gibt eine Rückmeldung");
      erwarte.gleich(toast[2], "ok", "als Erfolg gemeldet");
    }));

    pruefe("Kauf ab 100 € fragt nach – Esc schließt und gibt den Fokus zurück" + ZUSATZ, shopKapsel(() => {
      if (!KANN_LADEN) return;
      const W = shopStand({euro: 1000, stufe: 3});
      const c = W.zeige("shop");
      const k = karte(c, "aussehen:schiene");             /* 100 €: genau die Schwelle */
      const knopf = k.querySelector(".wr-aktion");
      erwarte.gleich(Spiel.shop.BESTAETIGUNG_AB, 100, "die Schwelle ist eine Zahl aus dem Spiel");
      knopf.click();
      const huelle = W.dokument.querySelector(".dialog-huelle");
      erwarte.wahr(!!huelle, "der ruhige Dialog steht");
      const dialog = W.dokument.querySelector(".dialog");
      erwarte.enthaelt(dialog.textContent, "Kauf bestätigen", "mit klarem Titel");
      erwarte.enthaelt(dialog.textContent, preisVon({preis: 100}), "mit echtem Preis");
      erwarte.enthaelt(dialog.textContent, preisVon({preis: 900}), "und dem echten Restbetrag");
      erwarte.gleich(Spiel.st.euro, 1000, "vor dem Bestätigen wird nichts abgebucht");
      erwarte.gleich(Spiel.karriere.daten().aussehen.leiste, "standard", "und nichts umgestellt");
      erwarte.gleich(dialog.querySelectorAll(".wr-kauf-knoepfe button").length, 2, "Abbrechen und Kaufen");
      skFeuer(huelle, "keydown", {key: "Escape", target: huelle});
      erwarte.gleich(W.dokument.querySelector(".dialog-huelle"), null, "Esc schließt den Dialog");
      erwarte.gleich(Spiel.st.euro, 1000, "Esc kauft nichts");
      erwarte.wahr(W.dokument.activeElement === knopf, "der Fokus kehrt zum Auslöser zurück");
    }));

    pruefe("Enter bestätigt den Kauf – genau einmal, danach steht der Zustand" + ZUSATZ, shopKapsel(() => {
      if (!KANN_LADEN) return;
      const W = shopStand({euro: 1000, stufe: 3});
      const c = W.zeige("shop");
      karte(c, "aussehen:schiene").querySelector(".wr-aktion").click();
      const dialog = W.dokument.querySelector(".dialog");
      erwarte.wahr(!!dialog, "der Dialog steht");
      skFeuer(dialog, "keydown", {key: "Enter", target: dialog});
      erwarte.gleich(W.dokument.querySelector(".dialog-huelle"), null, "Enter schließt den Dialog");
      erwarte.gleich(Spiel.st.euro, 900, "der Kauf wurde genau einmal gebucht");
      erwarte.gleich(Spiel.karriere.daten().aussehen.leiste, "schiene", "die Leiste ist umgestellt");
      const neu = W.dokument.querySelector('.ansicht[data-ansicht="shop"]');
      const k2 = karte(neu, "aussehen:schiene");
      erwarte.gleich(k2.getAttribute("data-zustand"), "aktiv", "die Karte zeigt „aktiv“");
      erwarte.gleich(k2.querySelector(".wr-chip").textContent.trim(), "Aktiv");
      erwarte.wahr(W.dokument.activeElement === k2, "der Fokus steht auf der gekauften Karte, nicht im Nichts");
      const toast = W.rufe.filter(r => r[0] === "toast")[0];
      erwarte.wahr(!!toast, "es gibt eine Rückmeldung");
      erwarte.gleich(toast[1], "Gekauft.", "mit ruhigem Wortlaut");
    }));

    pruefe("Aussehen-Vorschau ist eine Token-Probe – kein Fake-Bild" + ZUSATZ, shopKapsel(() => {
      if (!KANN_LADEN) return;
      const W = shopStand({euro: 156, stufe: 3});
      const c = W.zeige("shop"), looks = c.querySelectorAll(".wr-look");
      erwarte.gleich(looks.length, Spiel.AUSSEHEN.length, "je Aussehen-Artikel eine Karte");
      for (const a of Spiel.AUSSEHEN) {
        const k = karte(c, "aussehen:" + a.id);
        const probe = k.querySelector(".wr-probe");
        erwarte.wahr(!!probe, "Vorschau fehlt bei " + a.id);
        if (a.art === "akzent") {
          erwarte.gleich(probe.style.getPropertyValue("--wr-farbe"), a.farbe, "die echte Akzentfarbe von " + a.id);
        } else {
          erwarte.gleich(probe.getAttribute("data-stil"), a.id, "der echte Leistenstil von " + a.id);
          erwarte.wahr(!!probe.querySelector(".wr-probe-leiste"), "als Mini-Skizze");
        }
      }
      erwarte.gleich(c.querySelectorAll("img").length, 0, "keine Bilder in der Vorschau");
      erwarte.gleich(c.querySelectorAll(".wr-probe img, .wr-probe canvas").length, 0, "auch kein Bild-Ersatz in der Probe");
    }));

    pruefe("Wartungsverträge und Prüfung sind Verweise – kein zweiter Kaufweg" + ZUSATZ, shopKapsel(() => {
      if (!KANN_LADEN) return;
      const W = shopStand({euro: 156, stufe: 3, kunden: {salon: {vertrag: false, ampel: "gruen", seit: heute(), sterne: [4, 4, 4]}}});
      const c = W.zeige("shop"), liste = listeVon(), vertraege = liste.filter(e => e.art === "vertrag");
      const gruppe = c.querySelectorAll(".kr-gruppe")[3];
      erwarte.gleich(gruppe.getAttribute("data-gruppe"), "Kunden");
      erwarte.gleich(gruppe.querySelectorAll(".kr-ware").length, 0, "keine Vertrags-/Prüfungsartikel (kein zweiter Kaufweg)");
      erwarte.gleich(c.textContent.indexOf("Wartungsvertrag anbieten"), -1, "kein Kauftext im Regal");
      const kacheln = gruppe.querySelectorAll(".bn-k");
      erwarte.gleich(kacheln.length, 2, "zwei Verweis-Kacheln: Verträge und Prüfung");
      const zeilen = kacheln[0].querySelectorAll(".wr-zahlen dd").map(d => d.textContent);
      erwarte.gleich(zeilen, [
        String(vertraege.filter(e => e.zustand === "gekauft").length),
        String(vertraege.filter(e => e.zustand === "kaufbar").length),
        String(vertraege.length)], "die drei Vertragszahlen sind echte Daten");
      const gebuehren = kacheln[1].querySelectorAll(".wr-zahlen dd").map(d => d.textContent);
      erwarte.gleich(gebuehren, [preisVon({preis: Spiel.PRUEFUNG.GEBUEHR.AP1}), preisVon({preis: Spiel.PRUEFUNG.GEBUEHR.AP2}), "gebührenfrei"],
        "die Prüfungsgebühren kommen aus Spiel.PRUEFUNG.GEBUEHR");
      const knoepfe = gruppe.querySelectorAll("button");
      erwarte.gleich(knoepfe.map(k => k.textContent.trim()), ["Kundenakte öffnen", "Zum Lernstand"], "je Kachel genau ein Weg");
      knoepfe[0].click();
      erwarte.gleich(W.U.app.aktuell, "kunden", "der Weg führt in die Kundenansicht");
      erwarte.wahr(!!W.dokument.querySelector('.ansicht[data-ansicht="kunden"]'), "die Kundenansicht ist gebaut");
      const c2 = W.zeige("shop");
      c2.querySelectorAll(".kr-gruppe")[3].querySelectorAll("button")[1].click();
      erwarte.gleich(W.U.app.aktuell, "lernstand", "der zweite Weg führt in den Lernstand");
    }));

    pruefe("Empfehlung nur aus echten Daten – und ohne kaufbaren Artikel keine" + ZUSATZ, shopKapsel(() => {
      if (!KANN_LADEN) return;
      const reich = shopStand({euro: 1000, stufe: 3});
      const c = reich.zeige("shop");
      const kaufbar = listeVon().filter(e => e.zustand === "kaufbar" && e.preis != null).sort((a, b) => a.preis - b.preis);
      const chips = c.querySelectorAll(".wr-empfehlung");
      erwarte.gleich(chips.length, 1, "genau eine Empfehlung");
      erwarte.gleich(chips[0].closest(".kr-ware").getAttribute("data-artikel"), kaufbar[0].id, "der günstigste JETZT kaufbare Artikel");
      erwarte.enthaelt(chips[0].textContent, "Empfohlen");
      erwarte.enthaelt(chips[0].getAttribute("title"), "Günstigster", "der Grund steht am Chip");
      /* Ohne Geld ist nichts kaufbar – dann gibt es auch keine Empfehlung. */
      const leer = shopStand({euro: 0, stufe: 1});
      const c2 = leer.zeige("shop");
      erwarte.gleich(c2.querySelectorAll(".wr-empfehlung").length, 0, "keine Empfehlung ohne kaufbaren Artikel");
    }));

    pruefe("Keine erfundenen Preise: jede Preisangabe stammt aus Spiel.shop.liste()" + ZUSATZ, shopKapsel(() => {
      if (!KANN_LADEN) return;
      const W = shopStand({euro: 1000, stufe: 3});
      const c = W.zeige("shop");
      const echt = new Set(listeVon().filter(e => e.preis != null).map(preisVon));
      const gezeigt = c.querySelectorAll(".wr-preis").map(p => p.textContent.trim());
      erwarte.wahr(gezeigt.length > 5, "es werden Preise gezeigt");
      for (const p of gezeigt) erwarte.wahr(echt.has(p), "unbekannter Preis im Regal: " + p);
      /* Kontostand im Kopf ist der echte Stand. */
      erwarte.enthaelt(c.querySelector(".wr-konto-wert").textContent, preisVon({preis: Spiel.st.euro}), "Konto = Spielstand");
    }));

    pruefe("Playbooks: laufende und fällige stehen als Karte, gesperrte als eine ruhige Zeile" + ZUSATZ, shopKapsel(() => {
      if (!KANN_LADEN) return;
      /* Zwei laufende Playbooks im Spielstand; L.box bleibt leer → der Rest ist gesperrt. */
      Spiel._st.playbooks = {slots: 3, aktiv: ["lab.ip", "lab.link"]};
      const W = shopStand({euro: 1000, stufe: 3});
      const c = W.zeige("shop"), liste = listeVon(), gruppe = c.querySelectorAll(".kr-gruppe")[1];
      const laufend = liste.filter(e => e.art === "playbook" && (e.zustand === "aktiv" || e.zustand === "veraltet"));
      erwarte.wahr(laufend.length >= 2, "die zwei Playbooks laufen: " + laufend.length);
      for (const e of laufend) {
        const k = karte(c, e.id);
        erwarte.wahr(!!k, "laufendes Playbook steht als Karte: " + e.id);
        erwarte.wahr(["Aktiv", "Wiederholen"].includes(k.querySelector(".wr-chip").textContent.trim()), "mit laufendem Zustand");
        erwarte.wahr(k.querySelectorAll(".wr-probe").length === 0, "keine Vorschau-Probe bei Playbooks");
      }
      const gesperrt = liste.filter(e => e.art === "playbook" && e.zustand === "gesperrt").length;
      erwarte.wahr(gesperrt > 0, "es gibt gesperrte Fertigkeiten: " + gesperrt);
      const mehr = gruppe.querySelector(".wr-mehr");
      erwarte.wahr(!!mehr, "sie werden in einer Zeile zusammengefasst");
      erwarte.enthaelt(mehr.textContent, String(gesperrt), "die Zeile nennt die echte Zahl");
      erwarte.gleich(c.querySelectorAll('[data-artikel^="playbook:lab.nat"]').length, 0, "gesperrte Playbooks sind keine Karten");
      /* „Wiederholen“ nimmt den bestehenden Weg in den Lernstand, keinen neuen Kaufweg. */
      const alt = Spiel.karriere.training;
      const gerufen = [];
      try {
        Spiel.karriere.training = skill => { gerufen.push(skill); return {art: "keins", grund: "still"}; };
        const k = karte(c, laufend[0].id);
        if (k && k.querySelector(".wr-aktion")) {
          k.querySelector(".wr-aktion").click();
          erwarte.wahr(gerufen.length <= 1, "höchstens ein Übungsaufruf je Klick");
        }
      } finally { Spiel.karriere.training = alt; }
    }));
  });
})();
