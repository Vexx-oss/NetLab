"use strict";
/* LABOR-AKTIONEN — GATE (3.1.0 B3/3; R12-Entscheid 01.11.2026: K_net = 0, STRIKT).
   Vertrag (Lead + ui, 01.11.2026):
   · EINE Quelle: UI.laborAktionen.liste() → [{id,name,taste,hinweis}], ids konsole · messen ·
     konfigurieren · akte · abnahme (vorhandene Funktionen umgruppiert, keine Doppelung).
   · B-02 (Lead, 01.11.2026): Tastenkürzel NUR wo real belegt — C/P/I für konsole/messen/konfigurieren,
     akte/abnahme tragen taste=null (kein eigenes Kürzel; A/Enter wären falsch). Das Panel zeigt kbd
     genau dann, wenn ein Kürzel existiert; das Menü setzt taste nur wenn vorhanden.
   · Anzeige: UI.leitfaden.panel() hängt UNTEN div.lf-aktionen[role=list] an, je div.lf-aktion[role=listitem]
     mit b (Name) + kbd (Kürzel) — NUR Text, keine Wähler im .ansicht-Kasten (R12-Netto 0).
   · Ausführung: bestehender, bereits gezählter ⋯-Knopf (button.am-mehr) öffnet das body-level Menü
     „Aktionen“ (UI.menue → document.body, zählt nicht); Einträge = UI.laborAktionen.menueEintraege().
   · Baseline tests/r12-stand.json darf NICHT nach oben eingefroren werden: labor 17/17/11/7,
     klassenraum 6/6/6/6 (harter Guard; echte Netto-Messung macht gates: rauch --r12 → ethos --r12).
   Allein lauffähig:  node tests/labor-aktionen.test.js  */
(function(){
  function laAlleinLaden(){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const code = [fs.readFileSync(path.join(__dirname, "harness.js"), "utf8"),
                  fs.readFileSync(__filename, "utf8"), "testsAusfuehren();"];
    const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename});
    let ergebnisse;
    try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "labor-aktionen.test.js"}); }
    catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
    const rot = ergebnisse.filter(e => !e.ok);
    for (const e of ergebnisse) console.log((e.ok ? "\u2713 " : "\u2717 ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
    console.log("\n" + (ergebnisse.length - rot.length) + "/" + ergebnisse.length + " grün");
    process.exit(rot.length ? 1 : 0);
  }
  if (typeof gruppe === "undefined" && typeof document === "undefined" && typeof require === "function") { laAlleinLaden(); return; }

  const R12_WAEHLER = "button,[role=button],input,select,textarea,a[href]";
  const ERWARTET = [
    {id: "konsole", name: "Konsole", taste: "C"},
    {id: "messen", name: "Messen (Ping)", taste: "P"},
    {id: "konfigurieren", name: "Konfigurieren", taste: "I"},
    {id: "akte", name: "Akte", taste: null},
    {id: "abnahme", name: "Abnahme", taste: null},
  ];

  /* ---------- winziger DOM-Ersatz (nur was dom.js/leitfaden.js anfassen) ---------- */
  function knoten(tag){
    const el = {
      nodeType: 1, tag, kinder: [], listeners: {}, attrs: {}, className: "", _text: "", eltern: null,
      style: {setProperty(){}, removeProperty(){}, getPropertyValue(){ return ""; }},
      append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.eltern = el; el.kinder.push(x); } },
      replaceChildren(...k){ el.kinder = []; el.append(...k); },
      remove(){ if (el.eltern) el.eltern.kinder = el.eltern.kinder.filter(x => x !== el); },
      setAttribute(k, v){ el.attrs[k] = String(v); },
      getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
      removeAttribute(k){ delete el.attrs[k]; },
      addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
      removeEventListener(art, fn){ if (el.listeners[art]) el.listeners[art] = el.listeners[art].filter(x => x !== fn); },
      click(){ for (const fn of (el.listeners.click || []).slice()) fn({currentTarget: el, target: el, preventDefault(){}, stopPropagation(){}}); },
      focus(){}, blur(){},
      contains(k){ if (k === el) return true; return (el.kinder || []).some(x => x && typeof x === "object" && x.contains && x.contains(k)); },
      querySelector(){ return null; }, querySelectorAll(){ return []; },
      get children(){ return el.kinder.filter(x => x && typeof x === "object" && x.tag); },
      set textContent(v){ el._text = String(v); el.kinder = []; },
      get textContent(){ return el.kinder.length ? el.kinder.map(alsText).join("") : el._text; },
    };
    return el;
  }
  function alsText(k){ return k == null ? "" : typeof k === "string" ? k : (k.textContent || ""); }
  function alle(el){ const t = []; const lauf = k => { for (const x of k.kinder || []) if (x && x.tag) { t.push(x); lauf(x); } }; lauf(el); return t; }
  function klasse(el, name){ return String(el.className || "").split(/\s+/).includes(name); }
  function nachKlasse(el, name){ return alle(el).filter(x => klasse(x, name)); }
  function rolle(el){ return el.attrs && el.attrs.role; }
  function passtR12(el){
    if (["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(String(el.tag).toUpperCase())) return true;
    if (String(el.tag).toLowerCase() === "a" && el.attrs && el.attrs.href != null) return true;
    return rolle(el) === "button";
  }

  function stand(opt = {}){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const body = knoten("body");
    const document = {
      body, documentElement: knoten("html"), activeElement: null,
      createElement: tag => knoten(tag), createElementNS: (ns, tag) => knoten(tag),
      createTextNode: t => ({nodeType: 3, textContent: String(t)}),
      addEventListener(){}, removeEventListener(){}, getElementById(){ return null; },
      querySelector(){ return null; }, querySelectorAll(){ return []; },
    };
    const aufrufe = [];
    const lfStand = opt.lfStand !== undefined ? opt.lfStand : {
      pruefung: false, fortschritt: 0.4, aktuell: "messen",
      schritte: [
        {id: "ticket", titel: "Auftrag klären", status: "erledigt", impuls: ""},
        {id: "lage", titel: "Lage und Schichten", status: "erledigt", impuls: ""},
        {id: "hypothese", titel: "Hypothese", status: "erledigt", impuls: ""},
        {id: "messen", titel: "Messen", status: "aktuell", impuls: "Miss zuerst den Pfad."},
        {id: "eingreifen", titel: "Eingreifen und prüfen", status: "offen", impuls: ""},
        {id: "dokumentieren", titel: "Dokumentieren und lernen", status: "offen", impuls: ""},
      ]};
    const labor = opt.labor || {
      auswahl: {geraet: "pc1"},
      konsole: id => aufrufe.push(["konsole", id]),
      werkzeug: w => aufrufe.push(["werkzeug", w]),
      dock: d => aufrufe.push(["dock", d]),
      inspektor: an => aufrufe.push(["inspektor", an]),
    };
    const UIstub = {
      toast: (text, art) => aufrufe.push(["toast", text, art || ""]),
      labor, akte: opt.akte || {freigeben: () => aufrufe.push(["akte"])},
      spiel: opt.spiel || {abnahmeAnfordern: () => aufrufe.push(["abnahme"])},
    };
    const Spielstub = {
      aktiveInstanz: () => (opt.instanz === undefined ? {iid: "i1"} : opt.instanz),
      leitfaden: opt.leitfaden === undefined ? {stand: () => lfStand, naechsterSchritt: () => ({id: "messen", titel: "Messen", text: "Miss zuerst den Pfad."})} : opt.leitfaden,
    };
    const ctx = { UI: undefined, __stub: UIstub, console: {log(){}, error(){}, warn(){}}, document, store: {get(){ return {}; }, set(){}},
      window: {}, navigator: {}, DATEN: {}, Spiel: Spielstub, Bus: {an(){}, senden(){}},
      requestAnimationFrame: fn => { try { fn(0); } catch (e) {} return 0; }, setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; }, clearTimeout(){} };
    vm.createContext(ctx);
    const lies = f => fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8");
    vm.runInContext(lies("dom.js"), ctx, {filename: "ui/dom.js"});
    vm.runInContext("Object.assign(UI, __stub);", ctx, {filename: "stubs.js"});
    vm.runInContext(lies("labor-aktionen.js"), ctx, {filename: "ui/labor-aktionen.js"});
    vm.runInContext(lies("leitfaden.js"), ctx, {filename: "ui/leitfaden.js"});
    const UI = vm.runInContext("UI", ctx);
    return {UI, body, aufrufe};
  }

  gruppe("UI: Labor-Aktionen (3.1.0 B3/3) — Textliste, Menü, R12-Netto", () => {

    pruefe("Eine Quelle: liste() liefert genau die fünf Kernaktionen {id,name,taste,hinweis}", () => {
      const s = stand();
      erwarte.wahr(!!(s.UI.laborAktionen && typeof s.UI.laborAktionen.liste === "function"), "UI.laborAktionen.liste() fehlt");
      const l = s.UI.laborAktionen.liste();
      erwarte.gleich(l.map(a => a.id), ERWARTET.map(a => a.id), "IDs und Reihenfolge der Kernaktionen");
      for (const [i, a] of l.entries()) {
        const e = ERWARTET[i] || {};
        erwarte.gleich(a.name, e.name, "Name von " + a.id);
        erwarte.gleich(a.taste === undefined ? null : a.taste, e.taste, "Tastenkürzel von " + a.id + " (nur wo real belegt; akte/abnahme ohne Kürzel)");
        erwarte.wahr(typeof a.hinweis === "string" && a.hinweis.trim().length >= 8, a.id + ": hinweis fehlt/zu knapp");
        erwarte.wahr(!("ausfuehren" in a), a.id + ": liste() gibt keine Funktionen nach außen (eine Quelle = Datensicht)");
      }
      erwarte.gleich(new Set(l.map(a => a.id)).size, l.length, "keine doppelten IDs");
    });

    pruefe("Panel: Textliste .lf-aktionen/.lf-aktion (b + kbd), KEINE Wähler im .lf-panel", () => {
      const s = stand();
      const panel = s.UI.leitfaden.panel();
      erwarte.wahr(!!panel, "UI.leitfaden.panel() liefert kein Panel");
      const kiste = nachKlasse(panel, "lf-aktionen")[0];
      erwarte.wahr(!!kiste, ".lf-aktionen fehlt im Panel");
      erwarte.gleich(rolle(kiste), "list", ".lf-aktionen trägt role=list");
      const zeilen = nachKlasse(kiste, "lf-aktion");
      erwarte.gleich(zeilen.length, ERWARTET.length, "eine Textzeile je Kernaktion");
      for (const [i, zeile] of zeilen.entries()) {
        const e = ERWARTET[i];
        erwarte.gleich(rolle(zeile), "listitem", "Zeile " + e.id + ": role=listitem");
        const b = alle(zeile).find(x => String(x.tag).toLowerCase() === "b");
        const k = alle(zeile).find(x => String(x.tag).toLowerCase() === "kbd");
        erwarte.wahr(!!b, e.id + ": Name als b fehlt");
        erwarte.gleich(String(b && b.textContent), e.name, e.id + ": Name stimmt mit der Quelle");
        if (e.taste) {
          erwarte.wahr(!!k, e.id + ": Tastenkürzel als kbd fehlt (Kürzel " + e.taste + " belegt)");
          erwarte.gleich(String(k && k.textContent), e.taste, e.id + ": Kürzel stimmt mit der Quelle");
        } else {
          erwarte.wahr(!k, e.id + ": KEIN kbd — diese Aktion hat kein real belegtes Kürzel (B-02)");
        }
        erwarte.gleich(alle(zeile).filter(x => x.listeners && Object.keys(x.listeners).length).length, 0, e.id + ": keine Listener auf der Textzeile");
      }
      const kbds = alle(kiste).filter(x => String(x.tag).toLowerCase() === "kbd");
      erwarte.gleich(kbds.length, 3, "genau 3 kbd (C/P/I) — akte/abnahme ohne erfundene Kürzel");
      const waehler = alle(panel).filter(passtR12);
      erwarte.gleich(waehler.map(x => x.tag + "." + x.className), [], "Panel enthält KEINE R12-Wähler (button/[role=button]/input/select/textarea/a[href])");
    });

    pruefe("Panel erscheint nur bei laufendem Auftrag (ohne Engine/Instanz kein Panel)", () => {
      const ohne = stand({instanz: null});
      erwarte.gleich(ohne.UI.leitfaden.panel(), null, "ohne offene Instanz: kein Panel (kein leerer Textkasten)");
      const ohneEngine = stand({leitfaden: null});
      erwarte.gleich(ohneEngine.UI.leitfaden.panel(), null, "ohne Engine: kein Panel");
    });

    pruefe("Menü-Einträge: fünf Einträge {text,taste,fn}, deren fn die echten Wege aufruft", () => {
      const s = stand();
      const eintraege = s.UI.laborAktionen.menueEintraege();
      erwarte.gleich(eintraege.length, ERWARTET.length, "ein Menüeintrag je Kernaktion");
      for (const [i, e] of eintraege.entries()) {
        const soll = ERWARTET[i];
        erwarte.wahr(String(e.text).includes(soll.name), soll.id + ": Menütext nennt den Namen (" + e.text + ")");
        if (soll.taste) erwarte.gleich(e.taste, soll.taste, soll.id + ": Menüeintrag trägt das belegte Kürzel");
        else erwarte.wahr(!e.taste, soll.id + ": Menüeintrag OHNE Kürzel (B-02: nicht erfinden)");
        erwarte.wahr(typeof e.fn === "function", soll.id + ": fn fehlt");
        e.fn();
      }
      erwarte.gleich(s.aufrufe.map(a => a[0] + (a[1] != null ? ":" + a[1] : "")),
        ["konsole:pc1", "werkzeug:ping", "dock:inspektor", "inspektor:true", "akte", "abnahme"],
        "alle fünf Aktionen laufen über die vorhandenen UI-Wege");
      const ohneAuswahl = stand({labor: {auswahl: {}, konsole(){}, werkzeug(){}, dock(){}, inspektor(){}}});
      ohneAuswahl.UI.laborAktionen.menueEintraege()[0].fn();
      erwarte.wahr(ohneAuswahl.aufrufe.some(a => a[0] === "toast" && /Gerät/.test(a[1])), "ohne Gerätewahl erklärt die Konsole das ehrlich (Toast)");
      erwarte.gleich(s.UI.laborAktionen.ausfuehren("gibtsnicht"), false, "unbekannte ID: ausfuehren() meldet false");
    });

    pruefe("Auslöser: bestehender ⋯-Knopf (am-mehr) öffnet body-level Menü „Aktionen“ — nichts Neues im .ansicht", () => {
      const fs = require("fs"), path = require("path");
      const quelle = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "spiel.js"), "utf8");
      erwarte.enthaelt(quelle, 'class: "knopf geist am-mehr"', "der bestehende, bereits gezählte ⋯-Knopf existiert");
      erwarte.enthaelt(quelle, "UI.laborAktionen.menueEintraege()", "das Menü nutzt die EINE Quelle der Kernaktionen");
      erwarte.passt(quelle, /UI\.menue\([^;]*titel:\s*"Aktionen"/s, "body-level Menü über UI.menue mit Kopf „Aktionen“");
      const menue = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "editor-werkzeuge.js"), "utf8");
      erwarte.passt(menue, /document\.body\.append\(el\)/, "UI.menue hängt das Menü an document.body (außerhalb .ansicht → R12 0)");
    });

    pruefe("R12-Baseline bleibt im freigegebenen Rahmen (labor 17/17/11|12/7|8; klassenraum 6/6/6/6)", () => {
      const fs = require("fs"), path = require("path");
      const stand12 = JSON.parse(fs.readFileSync(path.join(__dirname, "r12-stand.json"), "utf8"));
      erwarte.gleich(stand12.grenzen, {standard: 6, mitarbeit: 3}, "Grenzen unverändert (6 / mitarbeit 3)");
      const labor = stand12.ansichten && stand12.ansichten.labor || {};
      erwarte.gleich([labor["1440"], labor["1366"]], [17, 17], "Labor 1440/1366 bleibt 17/17");
      erwarte.wahr([11, 12].includes(labor["960"]), "Labor @960 ist 11 (alt) oder 12 (B-02-Freigabe 01.11.2026) — nicht mehr");
      erwarte.wahr([7, 8].includes(labor["720"]), "Labor @720 ist 7 (alt) oder 8 (B-02-Freigabe 01.11.2026) — nicht mehr");
      const kl = stand12.ansichten && stand12.ansichten.klassenraum;
      erwarte.gleich(kl, {"1440": 6, "1366": 6, "960": 6, "720": 6}, "klassenraum bleibt 6/6/6/6 (harter Vertrag)");
      const mit = stand12.ansichten && stand12.ansichten.mitarbeit;
      erwarte.gleich(mit, {"1440": 3, "1366": 3, "960": 3, "720": 3}, "mitarbeit bleibt 3/3/3/3 (Sondervertrag)");
      /* Die Textliste selbst darf die Zahl nicht erhöhen: ihre Knoten sind div/b/kbd mit role list/listitem. */
      const s = stand();
      const panel = s.UI.leitfaden.panel();
      erwarte.gleich(alle(panel).filter(passtR12).length, 0, "Textliste bringt 0 R12-Wähler (netto 0 im .ansicht-Kasten)");
    });
  });
})();