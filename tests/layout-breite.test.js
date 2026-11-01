"use strict";
/* LAYOUT-BREITE — GATE (3.1.0 B3/4; R12-Entscheid 01.11.2026).
   Vertrag (Architektur §27 + Lead): Inspektorbreite per Ziehen an der Kante, persistiert in
   store einst.layout.inspBreite (280–560 px, Default 360), Doppelklick = Reset, Tastatur
   Alt+←/→ (global) bzw. Pfeile am Separator. Der Griff ist ein reiner div.ins-resizer mit
   role="separator" tabindex="0" — KEIN button/input/role=button, also kein R12-Bedienelement.
   Zusätzlich: Integration im Dock (Element + installieren-Aufruf) — bis ui verdrahtet, ist dieser
   Teil des Gates absichtlich rot (TDD; der Modulvertrag selbst ist grün).
   Allein lauffähig:  node tests/layout-breite.test.js  */
(function(){
  function lbAlleinLaden(){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const code = [fs.readFileSync(path.join(__dirname, "harness.js"), "utf8"),
                  fs.readFileSync(__filename, "utf8"), "testsAusfuehren();"];
    const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename});
    let ergebnisse;
    try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "layout-breite.test.js"}); }
    catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
    const rot = ergebnisse.filter(e => !e.ok);
    for (const e of ergebnisse) console.log((e.ok ? "\u2713 " : "\u2717 ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
    console.log("\n" + (ergebnisse.length - rot.length) + "/" + ergebnisse.length + " grün");
    process.exit(rot.length ? 1 : 0);
  }
  if (typeof gruppe === "undefined" && typeof document === "undefined" && typeof require === "function") { lbAlleinLaden(); return; }

  function knoten(art){
    return {
      art, listeners: {}, attrs: {}, className: "",
      style: {__werte: {}, setProperty(k, v){ this.__werte[k] = String(v); }, removeProperty(k){ delete this.__werte[k]; }, getPropertyValue(k){ return this.__werte[k] || ""; }},
      addEventListener(name, fn){ (this.listeners[name] ||= []).push(fn); },
      removeEventListener(){}, setAttribute(k, v){ this.attrs[k] = String(v); }, getAttribute(k){ return this.attrs[k] == null ? null : this.attrs[k]; },
      setPointerCapture(){}, classList: {_s: new Set(), add(k){ this._s.add(k); }, remove(k){ this._s.delete(k); }, contains(k){ return this._s.has(k); }},
    };
  }
  function stand(opt = {}){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const daten = opt.store ? JSON.parse(JSON.stringify(opt.store)) : {};
    const gespeichert = [];
    const store = {
      get: (k, ersatz = null) => (k in daten ? JSON.parse(JSON.stringify(daten[k])) : ersatz),
      set: (k, v) => { daten[k] = JSON.parse(JSON.stringify(v)); gespeichert.push([k, JSON.parse(JSON.stringify(v))]); },
    };
    const root = knoten("labor");
    const listener = [];
    const document = {
      activeElement: null, querySelector: () => root,
      addEventListener: (name, fn) => listener.push([name, fn]),
      removeEventListener(){}, createElement: tag => knoten(tag),
    };
    const ctx = { UI: {}, store, document, console: {log(){}, error(){}, warn(){}}, window: {} };
    vm.createContext(ctx);
    const quelle = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "layout-breite.js"), "utf8");
    vm.runInContext(quelle, ctx, {filename: "ui/layout-breite.js"});
    const UI = vm.runInContext("UI", ctx);
    return {UI, lb: UI.layoutBreite, root, store, daten, gespeichert, listener, document};
  }
  function griff(s){ return knoten("separator"); }
  function tastenEreignis(extra = {}){ return Object.assign({key: "ArrowLeft", altKey: false, preventDefault(){}, target: null}, extra); }

  gruppe("UI: Inspektorbreite per Kante (3.1.0 B3/4)", () => {

    pruefe("Grenzen: MIN 280, MAX 560, STANDARD 360; klemme() klemmt und schützt vor Unsinn", () => {
      const s = stand();
      erwarte.gleich([s.lb.MIN, s.lb.MAX, s.lb.STANDARD], [280, 560, 360], "Grenzen und Default");
      erwarte.gleich(s.lb.lesen(), 360, "ohne gespeicherten Wert: Standard 360");
      const klemme = s.lb._intern.klemme;
      erwarte.gleich(klemme(300), 300, "300 bleibt 300");
      erwarte.gleich(klemme(100), 280, "unter MIN wird auf 280 geklemmt");
      erwarte.gleich(klemme(900), 560, "über MAX wird auf 560 geklemmt");
      erwarte.gleich(klemme(300.7), 301, "gerundet (300.7 -> 301)");
      erwarte.gleich(klemme(123.7), 280, "unter MIN bleibt geklemmt, auch nach Rundung");
      erwarte.gleich(klemme("nope"), 360, "unlesbar -> Standard (kein NaN)");
      erwarte.gleich(klemme(-5), 280, "negativ -> MIN");
    });

    pruefe("Persistenz: schreiben() landet in store einst.layout.inspBreite; lesen() nimmt es wieder", () => {
      const s = stand();
      erwarte.gleich(s.lb.schreiben(420), 420, "schreiben liefert die geklemmte Breite");
      const letzte = s.gespeichert.at(-1);
      erwarte.gleich(letzte[0], "einst", "der EINE store-Schlüssel ist einst");
      erwarte.gleich(letzte[1].layout.inspBreite, 420, "einst.layout.inspBreite = 420");
      const wieder = stand({store: s.daten});
      erwarte.gleich(wieder.lb.lesen(), 420, "frischer Start liest 420 aus dem store");
      erwarte.gleich(wieder.lb.schreiben(999), 560, "schreiben klemmt auf MAX und speichert 560");
      erwarte.gleich(stand({store: {einst: {layout: {inspBreite: 10}}}}).lb.lesen(), 280, "gespeicherter Unsinn wird beim Lesen geklemmt");
    });

    pruefe("anwenden: Default lässt den CSS-Clamp (KEIN Inline --dock-b), Nutzerwert setzt Inline; lb-fern nie", () => {
      const s = stand();
      erwarte.gleich(s.lb.anwenden(s.root), 360, "ohne Nutzerwert: Standard 360 (nur gemeldet)");
      erwarte.wahr(!("--dock-b" in s.root.style.__werte), "ohne Nutzerwert KEIN Inline --dock-b — der CSS-Clamp (editor.css .labor.dock-da) bleibt maßgeblich");
      s.lb.schreiben(500);
      s.lb.anwenden(s.root);
      erwarte.gleich(s.root.style.__werte["--dock-b"], "500px", "gespeicherter Nutzerwert -> Inline 500px");
      erwarte.gleich(s.lb.reset(s.root), 360, "reset() setzt auf 360");
      erwarte.gleich(s.root.style.__werte["--dock-b"], "360px", "Reset (Nutzeraktion) persistiert 360");
      erwarte.gleich(s.lb.lesen(), 360, "Reset ist persistiert (nicht nur Optik)");
      const fern = stand();
      fern.root.classList.add("lb-fern");
      fern.lb.schreiben(500);
      fern.lb.anwenden(fern.root);
      erwarte.wahr(!("--dock-b" in fern.root.style.__werte), "lb-fern (Fernwartung): kein Inline --dock-b — die 58-%-Regel bleibt");
    });

    pruefe("installieren: Hörer am Griff (pointer + dblclick + keydown) und global (Alt-Tasten)", () => {
      const s = stand();
      const sep = griff(s);
      erwarte.gleich(s.lb.installieren(s.root, sep), true, "installieren() meldet Erfolg");
      for (const art of ["pointerdown", "pointermove", "pointerup", "pointercancel", "dblclick", "keydown"]) {
        erwarte.wahr((sep.listeners[art] || []).length >= 1, "Griff hat einen " + art + "-Hörer");
      }
      erwarte.wahr((s.listener || []).some(x => x[0] === "keydown"), "globaler keydown-Hörer (Alt+←/→) ist angemeldet");
      erwarte.wahr((s.listener || []).some(x => x[0] === "pointerup"), "globaler pointerup-Hörer beendet das Ziehen");
      erwarte.gleich(sep.attrs["aria-valuenow"], "360", "aria-valuenow startet auf 360");
    });

    pruefe("Tastatur: Alt+←/→ = 16 px, Pfeile am Griff = 8 px, ohne Alt/ohne Fokus kein Eingriff", () => {
      const s = stand();
      const sep = griff(s);
      s.lb.installieren(s.root, sep);
      const e1 = tastenEreignis({key: "ArrowLeft", altKey: true});
      erwarte.gleich(s.lb.tastatur(e1), true, "Alt+← wird behandelt");
      erwarte.gleich(s.lb.lesen(), 344, "360 - 16 = 344");
      const e2 = tastenEreignis({key: "ArrowRight", altKey: true});
      s.lb.tastatur(e2);
      erwarte.gleich(s.lb.lesen(), 360, "zurück auf 360");
      s.lb.tastatur(tastenEreignis({key: "ArrowLeft", altKey: false, target: sep}));
      erwarte.gleich(s.lb.lesen(), 352, "am fokussierten Griff: 8 px Schritt (360 - 8)");
      const vorher = s.lb.lesen();
      erwarte.gleich(s.lb.tastatur(tastenEreignis({key: "ArrowLeft", altKey: false, target: null})), false, "ohne Alt und ohne Griff-Fokus: nicht behandelt");
      erwarte.gleich(s.lb.lesen(), vorher, "keine Breitenänderung ohne Berechtigung");
      s.lb.schreiben(s.lb.MIN);
      s.lb.tastatur(tastenEreignis({key: "ArrowLeft", altKey: true}));
      erwarte.gleich(s.lb.lesen(), 280, "am MIN geklemmt");
      s.lb.schreiben(s.lb.MAX);
      s.lb.tastatur(tastenEreignis({key: "ArrowRight", altKey: true}));
      erwarte.gleich(s.lb.lesen(), 560, "am MAX geklemmt");
      erwarte.gleich(sep.attrs["aria-valuenow"], "560", "aria-valuenow folgt der Tastatur");
    });

    pruefe("Ziehen: Links-Ziehen vergrößert, Loslassen persistiert; Doppelklick = Reset", () => {
      const s = stand();
      const sep = griff(s);
      s.lb.installieren(s.root, sep);
      sep.listeners.pointerdown[0]({clientX: 500, pointerId: 1, preventDefault(){}});
      sep.listeners.pointermove[0]({clientX: 460});
      erwarte.gleich(s.lb.lesen(), 400, "40 px nach links = +40 Breite (360 -> 400)");
      sep.listeners.pointermove[0]({clientX: 560});
      erwarte.gleich(s.lb.lesen(), 300, "100 px nach rechts = -60 (auf 300)");
      sep.listeners.pointerup[0]({});
      erwarte.gleich(s.lb.lesen(), 300, "Loslassen ohne weitere Bewegung: bleibt 300");
      s.lb.schreiben(500);
      sep.listeners.dblclick[0]({});
      erwarte.gleich(s.lb.lesen(), 360, "Doppelklick setzt auf 360 zurück");
      erwarte.gleich(s.root.style.__werte["--dock-b"], "360px", "Doppelklick wendet den Reset auch an");
    });

    pruefe("R12-neutral: Griff ist div.ins-resizer mit role=separator, KEIN button/input/role=button", () => {
      const fs = require("fs"), path = require("path");
      const quelle = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "layout-breite.js"), "utf8");
      erwarte.falsch(/type\s*:\s*["']range["']/.test(quelle), "kein input[type=range] (würde als input zählen)");
      erwarte.falsch(/h\(\s*["'](button|input|select|textarea|a)["']/.test(quelle), "das Modul erzeugt keine Wähler-Tags");
    });

    pruefe("Integration: div.ins-resizer (role=separator, tabindex=0) im Dock, installieren() verdrahtet", () => {
      const fs = require("fs"), path = require("path");
      const dateien = ["editor.js", "app.js", "leitfaden.js"].map(f => ["src/ui/" + f, fs.readFileSync(path.join(__dirname, "..", "src", "ui", f), "utf8")]);
      const treffer = dateien.filter(([, t]) => /ins-resizer/.test(t));
      erwarte.wahr(treffer.length >= 1, "das Element .ins-resizer wird in der Oberfläche erzeugt (noch nicht verdrahtet)");
      const text = treffer.map(x => x[1]).join("\n");
      erwarte.passt(text, /role\s*:\s*["']separator["']/, "role=separator am Griff");
      erwarte.passt(text, /tabindex\s*:\s*["']0["']/, "tabindex=0 am Griff (Tastatur erreichbar)");
      erwarte.passt(text, /layoutBreite\.installieren\s*\(/, "UI.layoutBreite.installieren(root, separator) wird aufgerufen");
      erwarte.passt(fs.readFileSync(path.join(__dirname, "..", "src", "ui", "layout-breite.js"), "utf8"), /aria-valuenow/, "aria-valuenow wird gepflegt");
      const css = fs.readFileSync(path.join(__dirname, "..", "src", "stil", "editor.css"), "utf8");
      erwarte.passt(css, /\.ins-resizer\s*\{/, "CSS .ins-resizer existiert");
    });
  });
})();