"use strict";
/* ONBOARDING-TOUR — A11Y-GATE (3.1.0 B3/1; Lead-Auftrag 01.11.2026: 44-px-Buttons, Fokus, aria).
   Die Tour ist body-level (außerhalb .ansicht) und wird von R12 NICHT gesehen — darum braucht sie
   ein eigenes Gate:
   · Mount: Overlay hängt an document.body, nicht im .ansicht-Kasten (R12-Netto 0).
   · ARIA: role=dialog, aria-modal=true, aria-labelledby zeigt auf den SICHTBAREN Titel (je Schritt aktuell).
   · Fokus: Startfokus auf der primären Aktion; bleibt beim Schrittwechsel in der Karte; nach dem
     Schließen darf kein Fokus in einem entfernten Overlay bleiben (WAI-ARIA-Dialogmuster).
   · 44-px: Tour-Knöpfe tragen die .knopf-Basisklasse; rahmen.css garantiert .knopf min-height >= 44px.
   · Esc schließt und meldet den Hörer ab.
   Nicht geprüft (ehrlich): Tab-Falle/inert im Hintergrund und Screenreader-Ausgabe — dafür fehlt ein
   echter Browser; das ist als offener Rest im Bericht benannt, keine Behauptung.
   Allein lauffähig:  node tests/onboarding-tour-a11y.test.js  */
(function(){
  function a11yAlleinLaden(){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const code = [fs.readFileSync(path.join(__dirname, "harness.js"), "utf8"),
                  fs.readFileSync(__filename, "utf8"), "testsAusfuehren();"];
    const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename});
    let ergebnisse;
    try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "onboarding-tour-a11y.test.js"}); }
    catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
    const rot = ergebnisse.filter(e => !e.ok);
    for (const e of ergebnisse) console.log((e.ok ? "\u2713 " : "\u2717 ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
    console.log("\n" + (ergebnisse.length - rot.length) + "/" + ergebnisse.length + " grün");
    process.exit(rot.length ? 1 : 0);
  }
  if (typeof gruppe === "undefined" && typeof document === "undefined" && typeof require === "function") { a11yAlleinLaden(); return; }

  /* ---------- winziger DOM-Ersatz (nur was onboarding.js/dom.js anfassen) ---------- */
  let fokus = null, aktivesDokument = null;
  function knoten(tag){
    const el = {
      nodeType: 1, tagName: String(tag).toUpperCase(), kinder: [], listeners: {}, attrs: {}, className: "",
      _text: "", eltern: null, __imBaum: false,
      style: {setProperty(){}, removeProperty(){}, getPropertyValue(){ return ""; }},
      append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.eltern = el; el.kinder.push(x); } },
      replaceChildren(...k){ el.kinder = []; el.append(...k); },
      remove(){ if (el.eltern) el.eltern.kinder = el.eltern.kinder.filter(x => x !== el); el.eltern = null; },
      setAttribute(k, v){ el.attrs[k] = String(v); },
      getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
      removeAttribute(k){ delete el.attrs[k]; },
      addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
      removeEventListener(art, fn){ if (el.listeners[art]) el.listeners[art] = el.listeners[art].filter(x => x !== fn); },
      click(){ for (const fn of (el.listeners.click || []).slice()) fn({currentTarget: el, target: el, preventDefault(){}, stopPropagation(){}}); },
      focus(){ fokus = el; if (aktivesDokument) aktivesDokument.activeElement = el; },
      blur(){ if (fokus === el) fokus = null; if (aktivesDokument && aktivesDokument.activeElement === el) aktivesDokument.activeElement = null; },
      contains(k){ if (k === el) return true; return (el.kinder || []).some(x => x && typeof x === "object" && x.contains && x.contains(k)); },
      get children(){ return el.kinder.filter(x => x && typeof x === "object" && x.tagName); },
      set textContent(v){ el._text = String(v); el.kinder = []; },
      get textContent(){ return el.kinder.length ? el.kinder.map(text).join("") : el._text; },
      get isConnected(){ let x = el; while (x.eltern) x = x.eltern; return !!x.__imBaum; },
      get classList(){ return {add(n){ const s = new Set(String(el.className).split(/\s+/).filter(Boolean)); s.add(n); el.className = [...s].join(" "); },
                                remove(n){ el.className = String(el.className).split(/\s+/).filter(x => x && x !== n).join(" "); },
                                contains(n){ return String(el.className).split(/\s+/).includes(n); }}; },
    };
    return el;
  }
  function text(k){ return k == null ? "" : typeof k === "string" ? k : (k.textContent || ""); }
  function alle(el){ const t = []; const lauf = k => { for (const x of k.kinder || []) if (x && x.tagName) { t.push(x); lauf(x); } }; lauf(el); return t; }
  function klasse(el, name){ return String(el.className || "").split(/\s+/).includes(name); }
  function nachKlasse(el, name){ return alle(el).filter(x => klasse(x, name)); }
  function knopf(el, beschriftung){ return alle(el).find(x => x.tagName === "BUTTON" && String(x.textContent).includes(beschriftung)) || null; }
  function idEl(el, id){ return alle(el).find(x => x.attrs && x.attrs.id === id) || null; }

  function stand(opt = {}){
    fokus = null;
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const gespeichert = [];
    const body = knoten("body"); body.__imBaum = true;
    const document = {
      body, documentElement: knoten("html"), activeElement: null,
      createElement: tag => knoten(tag), createElementNS: (ns, tag) => knoten(tag),
      createTextNode: t => ({nodeType: 3, textContent: String(t)}),
      addEventListener(art, fn){ (body.listeners[art] ||= []).push(fn); },
      removeEventListener(art, fn){ if (body.listeners[art]) body.listeners[art] = body.listeners[art].filter(x => x !== fn); },
      getElementById(id){ return alle(body).find(x => x.attrs && x.attrs.id === id) || null; },
      querySelector(){ return null; }, querySelectorAll(){ return []; },
    };
    const storeDaten = opt.store ? JSON.parse(JSON.stringify(opt.store)) : {};
    const store = { get: (k, ersatz = null) => (k in storeDaten ? JSON.parse(JSON.stringify(storeDaten[k])) : ersatz),
                    set: (k, v) => { storeDaten[k] = JSON.parse(JSON.stringify(v)); gespeichert.push([k, v]); } };
    const startHaken = [];
    const UIstub = { startHaken, app: { einstellungAbschnitt(){} } };
    const daten = opt.daten !== undefined ? opt.daten : {leitfaden: {tour: [
      {id: "a", titel: "Willkommen", text: "Das Labor ist dein Arbeitsplatz."},
      {id: "b", titel: "Die Karte", text: "Links siehst du das Netz."},
      {id: "c", titel: "Der Leitfaden", text: "Er zeigt den nächsten Schritt."},
      {id: "d", titel: "Die Abnahme", text: "Erst messen, dann ändern."},
    ]}};
    aktivesDokument = document;
    const ctx = { __stub: UIstub, console: {log(){}, error(){}, warn(){}}, document, store, window: {}, navigator: {},
      DATEN: daten, Spiel: {aktiveInstanz: () => opt.aktiveInstanz || null},
      setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; }, clearTimeout(){},
      requestAnimationFrame: fn => { try { fn(0); } catch (e) {} return 0; } };
    vm.createContext(ctx);
    const lies = f => fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8");
    vm.runInContext(lies("dom.js"), ctx, {filename: "ui/dom.js"});
    vm.runInContext("Object.assign(UI, __stub);", ctx, {filename: "stubs.js"});
    vm.runInContext(lies("onboarding.js"), ctx, {filename: "ui/onboarding.js"});
    const UI = vm.runInContext("UI", ctx);
    return { UI, onb: UI.onboarding, body, dokument: document, gespeichert, startHaken, listeners: body.listeners, fokus: () => fokus };
  }
  function overlay(s){ return nachKlasse(s.body, "onb-huelle")[0] || null; }

  gruppe("UI: Onboarding-Tour (3.1.0) — A11y-Gate", () => {

    pruefe("Mount: Overlay hängt an document.body (außerhalb .ansicht, R12-neutral)", () => {
      const s = stand();
      erwarte.gleich(s.onb.tour(), true, "tour() startet");
      const h = overlay(s);
      erwarte.wahr(!!h, "Overlay steht im DOM");
      erwarte.wahr(h && h.eltern === s.body, "Overlay hängt direkt an document.body (nicht im .ansicht-Kasten)");
      erwarte.gleich(nachKlasse(s.body, "onb-huelle").length, 1, "genau ein Overlay");
    });

    pruefe("ARIA: role=dialog, aria-modal, aria-labelledby auf den sichtbaren Titel", () => {
      const s = stand(); s.onb.tour();
      const h = overlay(s); const karte = nachKlasse(h, "onb-karte")[0];
      erwarte.wahr(!!karte, ".onb-karte fehlt");
      erwarte.gleich(karte.attrs.role, "dialog", "role=dialog");
      erwarte.gleich(karte.attrs["aria-modal"], "true", "aria-modal=true");
      const id = karte.attrs["aria-labelledby"];
      erwarte.wahr(!!id, "aria-labelledby fehlt");
      const titel = id ? idEl(karte, id) : null;
      erwarte.wahr(!!titel, "aria-labelledby zeigt auf ein Element in der Karte (id " + id + ")");
      erwarte.wahr(!!titel && String(titel.textContent).trim().length > 0, "der referenzierte Titel hat Text");
      erwarte.enthaelt(String(titel && titel.textContent), "Willkommen", "Titel ist der aktuelle Tour-Schritt");
      /* Schrittwechsel: dieselbe id zeigt auf den neuen Titel (kein toter Verweis). */
      knopf(h, "Weiter").click();
      const nach = idEl(nachKlasse(overlay(s), "onb-karte")[0], id);
      erwarte.wahr(!!nach && String(nach.textContent).includes("Die Karte"), "aria-labelledby bleibt beim Schrittwechsel gültig");
    });

    pruefe("Fokus: Start auf der primären Aktion, bleibt beim Schrittwechsel in der Karte", () => {
      const s = stand(); s.onb.tour();
      const h = overlay(s); const weiter = knopf(h, "Weiter");
      erwarte.wahr(!!weiter, "Weiter-Knopf fehlt");
      erwarte.wahr(s.fokus() === weiter, "Startfokus liegt auf der primären Aktion (Weiter)");
      weiter.click();
      erwarte.wahr(s.fokus() === weiter, "Fokus bleibt nach dem Schrittwechsel auf der primären Aktion");
      erwarte.wahr(weiter.isConnected, "fokussiertes Element ist noch im Dokument");
    });

    pruefe("Fokus nach Schließen: kein Fokus in einem entfernten Overlay (Esc)", () => {
      const s = stand(); s.onb.tour();
      const h = overlay(s); const weiter = knopf(h, "Weiter");
      erwarte.wahr(!!weiter && s.fokus() === weiter, "Vorbedingung: Fokus liegt auf Weiter");
      const hörer = (s.listeners.keydown || []).slice(-1)[0];
      erwarte.wahr(typeof hörer === "function", "Esc-Hörer ist angemeldet");
      hörer({key: "Escape", preventDefault(){}});
      erwarte.gleich(nachKlasse(s.body, "onb-huelle").length, 0, "Esc schließt das Overlay");
      erwarte.wahr(s.fokus() === null || !h.contains(s.fokus()), "nach dem Schließen liegt der Fokus NICHT mehr in der entfernten Hülle");
      erwarte.wahr(s.dokument.activeElement === null || !h.contains(s.dokument.activeElement), "document.activeElement zeigt nicht mehr auf das entfernte Overlay");
      erwarte.gleich((s.listeners.keydown || []).length, 0, "Esc-Hörer ist abgemeldet");
    });

    pruefe("Fokus kehrt nach Esc zum Auslöser zurück (vorheriges Element)", () => {
      const s = stand();
      const ausloeser = s.dokument.createElement("button");
      ausloeser.textContent = "Einführung ansehen";
      s.dokument.body.append(ausloeser);
      ausloeser.focus();
      erwarte.wahr(s.dokument.activeElement === ausloeser, "Vorbedingung: Auslöser hat den Fokus (document.activeElement)");
      s.onb.tour();
      const hörer = (s.listeners.keydown || []).slice(-1)[0];
      hörer({key: "Escape", preventDefault(){}});
      erwarte.gleich(nachKlasse(s.body, "onb-huelle").length, 0, "Esc schließt das Overlay");
      erwarte.wahr(s.fokus() === ausloeser, "der Fokus kehrt zum Auslöser zurück (nicht ins Nichts)");
      erwarte.wahr(s.dokument.activeElement === ausloeser, "auch document.activeElement zeigt wieder auf den Auslöser");
    });

    pruefe("44-px: Tour-Knöpfe tragen .knopf; die Basisregel in rahmen.css garantiert >= 44 px", () => {
      const s = stand(); s.onb.tour();
      const h = overlay(s);
      const knoepfe = alle(h).filter(x => x.tagName === "BUTTON");
      erwarte.gleich(knoepfe.length, 2, "genau zwei Tour-Knöpfe (Überspringen, Weiter)");
      for (const b of knoepfe) {
        erwarte.wahr(klasse(b, "knopf"), "Knopf \u201e" + text(b) + "\u201c trägt die .knopf-Basisklasse (44-px-Zusage)");
      }
      const ueber = knoepfe.find(b => String(b.textContent).includes("Überspringen"));
      const weiter = knoepfe.find(b => String(b.textContent).includes("Weiter"));
      erwarte.wahr(!!ueber && klasse(ueber, "onb-ueberspringen"), "Überspringen trägt den CSS-Hook onb-ueberspringen");
      erwarte.wahr(!!weiter && klasse(weiter, "onb-weiter"), "Weiter trägt den CSS-Hook onb-weiter");
      const fs = require("fs"), path = require("path");
      const css = fs.readFileSync(path.join(__dirname, "..", "src", "stil", "rahmen.css"), "utf8");
      const regel = /(^|[\s}])\.knopf\{([^}]*)\}/.exec(css);
      erwarte.wahr(!!regel, "Basisregel .knopf in rahmen.css gefunden");
      const mh = regel ? /min-height\s*:\s*(\d+(?:\.\d+)?)px/.exec(regel[2]) : null;
      erwarte.wahr(!!mh && Number(mh[1]) >= 44, ".knopf garantiert min-height >= 44px (gemessen: " + (mh ? mh[1] : "?") + ")");
      const fokussierbar = alle(h).filter(x => ["A", "INPUT", "SELECT", "TEXTAREA"].includes(x.tagName) || x.tagName === "BUTTON" || x.attrs.tabindex != null);
      erwarte.gleich(fokussierbar.length, 2, "nur die zwei Knöpfe sind fokussierbar (Punkte sind reine Anzeige)");
    });

    pruefe("Anzeige: Punkte aria-hidden, Fortschritt als Text (1 / 4)", () => {
      const s = stand(); s.onb.tour();
      const h = overlay(s);
      const punkte = nachKlasse(h, "onb-punkte")[0];
      erwarte.wahr(!!punkte, ".onb-punkte fehlt");
      erwarte.gleich(punkte && punkte.attrs["aria-hidden"], "true", "Punkte sind für Screenreader ausgeblendet (aria-hidden)");
      const kicker = nachKlasse(h, "onb-kicker")[0];
      erwarte.enthaelt(String(kicker && kicker.textContent), "1 / 4", "Fortschritt steht als Text da");
    });

    pruefe("Ohne offenes Ticket startet die Tour über den echten Start-Haken; mit Ticket nicht", () => {
      const frisch = stand(); frisch.startHaken.forEach(fn => fn());
      erwarte.gleich(nachKlasse(frisch.body, "onb-huelle").length, 1, "frischer Start zeigt die Tour (einmalig)");
      const offen = stand({aktiveInstanz: {iid: "t1"}}); offen.startHaken.forEach(fn => fn());
      erwarte.gleich(nachKlasse(offen.body, "onb-huelle").length, 0, "mit offenem Ticket keine Tour");
    });
  });
})();