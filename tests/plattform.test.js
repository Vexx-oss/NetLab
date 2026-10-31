"use strict";
/* KRN-02: PLATTFORM-FÄHIGKEITSMATRIX UND TOTE VERTRÄGE (task-62)
   GEPRÜFT WIRD DER ECHTE WEG: src/plattform/plattform-browser.js und -tauri.js werden in eigenen
   vm-Bereichen mit einer Tauri-Attrappe geladen (window.__TAURI__.event.listen + core.invoke),
   die Fassade src/plattform/plattform.js darüber. Geprüft werden:
   1. Die Fähigkeitsmatrix (§8: immerOben, tray, autostart, hotkey, leiste, klickdurch,
      vollbildErkennen, benachrichtigen) liefert in BEIDEN Adaptern {ja:boolean, grund:string|null}.
   2. Unbekannte Funktionen sind JA:FALSE — nie „im Zweifel ja“ (KRN-B07).
   3. Tauri ohne ermittelte Fähigkeiten lügt nicht: unbekannt = nein mit Grund.
   4. Tauri übernimmt die Matrix aus der Hülle (window.__LABOR_PLATTFORM__.kann/gruende).
   5. Tote Exporte sind weg: ladenSync und benachrichtigen existieren weder im Adapter noch in
      der Fassade (0 Aufrufer, 0 Exporte; grep-Beleg im Fall „keine toten Exporte“).
   6. Die Tray-/Hotkey-/Menü-Ereignisse der Hülle sind GEBRÜCKT: fenster.rs emittiert
      „tray-klick“, „hotkey“, „oeffnen“ (emit(quelle) in umschalten, fenster.rs:327) — die Abos
      in src/ui/start.js:102-105 sind damit KEINE toten Abos mehr.
   Browser: alles AUSGENOMMEN der Fensterfunktionen ist dort nicht verfügbar; die Matrix nennt
   für jede der 8 Fähigkeiten einen Grund. */
const PF_KANN = ["immerOben", "tray", "autostart", "hotkey", "leiste", "klickdurch", "vollbildErkennen", "benachrichtigen"];
const PF_RUST_KANN = {leiste: true, immerOben: true, tray: true, autostart: true, hotkey: false, klickdurch: false, vollbildErkennen: true, benachrichtigen: false};
const PF_RUST_GRUENDE = {hotkey: "Das Tastenkürzel Strg+Alt+L ist schon belegt.", klickdurch: "Noch nicht eingebaut.", benachrichtigen: "Systemmitteilungen sind nicht eingebaut."};
const PF_FS = (() => { try { return require("fs"), require("path"); } catch (e) { return null; } })();
function pfQuelle(name) {
  const path = require("path");
  return require("fs").readFileSync(path.join(__dirname, "..", "src", "plattform", name), "utf8");
}
const PF_GLOBALE = {"plattform-browser.js": "PlattformBrowser", "plattform-tauri.js": "PlattformTauri", "plattform.js": "Plattform"};
function pfLade(name, bereich) {
  const vm = require("vm");
  vm.createContext(bereich);
  vm.runInContext(pfQuelle(name) + "\n;globalThis.__ADAPTER = " + PF_GLOBALE[name] + ";", bereich, {filename: "plattform/" + name});
  return bereich.__ADAPTER;
}
function pfBrowser() {
  return pfLade("plattform-browser.js", {
    console: {log(){}, error(){}, warn(){}}, setTimeout, clearTimeout,
    localStorage: {getItem(){ return null; }, setItem(){}}, navigator: {platform: "test"},
    Bus: {senden(){}},
  });
}
function pfTauri({info, invokeAntwort, mitEinrichten = true} = {}) {
  const ereignisse = {listener: {}, gemeldet: []};
  const bereich = {
    console: {log(){}, error(){}, warn(){}}, clearTimeout,
    setTimeout: mitEinrichten ? (fn => { fn(); return 0; }) : (() => 0),
    window: {__TAURI__: {
      event: {listen(name, fn){ ereignisse.listener[name] = fn; }},
      core: {invoke(cmd){ if (cmd === "plattform_info") return invokeAntwort ? Promise.resolve(invokeAntwort) : new Promise(() => {}); return Promise.resolve({}); }},
    }, addEventListener(){}},
    document: {readyState: "complete", addEventListener(){}, documentElement: {dataset: {}}, title: "x"},
    store: {get(){ return {}; }},
  };
  if (info) bereich.window.__LABOR_PLATTFORM__ = info;
  const adapter = pfLade("plattform-tauri.js", bereich);
  return {adapter, ereignisse};
}
function pfFassade(tauri, browser) {
  const vm = require("vm");
  const bereich = {console: {log(){}, error(){}}, setTimeout, clearTimeout, window: {},
    PlattformTauri: tauri, PlattformBrowser: browser, LABOR_VERSION: "test"};
  vm.createContext(bereich);
  vm.runInContext(pfQuelle("plattform.js") + "\n;globalThis.__P = Plattform;", bereich, {filename: "plattform/plattform.js"});
  return bereich.__P;
}

if (PF_FS) gruppe("Kern: Plattform-Fähigkeitsmatrix (KRN-02)", () => {
  pruefe("beide Adapter: Matrix liefert für alle 8 Fähigkeiten {ja:boolean, grund:string|null}", () => {
    const browser = pfBrowser();
    const {adapter: tauri} = pfTauri({info: {os: "test", sitzung: "windows", kann: PF_RUST_KANN, gruende: PF_RUST_GRUENDE}});
    for (const f of PF_KANN) {
      for (const [wer, wie] of [["Browser", browser], ["Tauri", tauri]]) {
        const k = wie.kann(f);
        erwarte.wahr(k && typeof k.ja === "boolean", wie.name + ": " + f + " liefert kein ja:boolean");
        erwarte.wahr(k.grund === null || typeof k.grund === "string", wie.name + ": " + f + " Grund ist weder null noch Text");
        erwarte.gleich(PF_KANN.includes(f), true, "Matrixname " + f);
      }
    }
    const bUngueltig = PF_KANN.filter(f => browser.kann(f).ja);
    erwarte.gleich(bUngueltig, [], "Browser darf keine Desktop-Fähigkeit als verfügbar melden");
    erwarte.gleich(PF_KANN.filter(f => browser.kann(f).grund ? false : true), [], "Browser nennt für jede Fähigkeit einen Grund");
  });
  pruefe("Unbekannte Funktionen sind in beiden Adaptern ja:false (nie „im Zweifel ja“)", () => {
    const browser = pfBrowser();
    const {adapter: tauri} = pfTauri({info: {kann: PF_RUST_KANN, gruende: PF_RUST_GRUENDE}});
    for (const [wer, wie] of [["Browser", browser], ["Tauri", tauri]]) {
      const k = wie.kann("gibtsnicht");
      erwarte.gleich(k.ja, false, wer + ": unbekannt muss nein sein");
      erwarte.wahr(typeof k.grund === "string" && k.grund.length > 0, wer + ": unbekannt braucht einen Grund");
    }
  });
  pruefe("Tauri ohne ermittelte Fähigkeiten lügt nicht (unbekannt = nein mit Grund)", () => {
    const {adapter} = pfTauri({info: null, invokeAntwort: null});
    const k = adapter.kann("immerOben");
    erwarte.gleich(k.ja, false, "ohne plattform_info kein Ja");
    erwarte.enthaelt(String(k.grund), "ermittelt", "Grund nennt die fehlende Ermittlung");
  });
  pruefe("Tauri übernimmt die Matrix der Hülle (kann + gruende)", () => {
    const {adapter} = pfTauri({info: {kann: PF_RUST_KANN, gruende: PF_RUST_GRUENDE}});
    erwarte.gleich(adapter.kann("immerOben"), {ja: true, grund: null}, "verfügbare Fähigkeit");
    erwarte.gleich(adapter.kann("leiste"), {ja: true, grund: null}, "leiste");
    const hk = adapter.kann("hotkey");
    erwarte.gleich(hk.ja, false, "hotkey nicht verfügbar");
    erwarte.enthaelt(String(hk.grund), "belegt", "Grund kommt aus der Hülle");
  });
  pruefe("tote Exporte entfernt: ladenSync und benachrichtigen fehlen in Adaptern und Fassade", () => {
    const browser = pfBrowser();
    const {adapter: tauri} = pfTauri({info: {kann: PF_RUST_KANN, gruende: PF_RUST_GRUENDE}});
    const fassade = pfFassade(tauri, browser);
    for (const [wer, wie] of [["Browser", browser], ["Tauri", tauri], ["Fassade", fassade]]) {
      erwarte.gleich(typeof wie.ladenSync, "undefined", wer + ": ladenSync ist toter Vertrag");
      erwarte.gleich(typeof wie.benachrichtigen, "undefined", wer + ": benachrichtigen ist toter Vertrag");
    }
  });
  pruefe("Ereignisbrücke: tray-klick/hotkey/oeffnen/… kommen bei den Abos an", () => {
    const {adapter, ereignisse} = pfTauri({info: {kann: PF_RUST_KANN, gruende: PF_RUST_GRUENDE}});
    const empfangen = [];
    for (const name of ["tray-klick", "hotkey", "oeffnen", "zweiter-start", "ruhe", "modus-extern"]) adapter.an(name, daten => empfangen.push([name, daten]));
    erwarte.gleich(Object.keys(ereignisse.listener).sort(), ["fenster-modus", "hotkey", "labor-beenden", "oeffnen", "ruhe", "tray-klick", "zweiter-start"], "gebückte Hüllen-Ereignisse");
    ereignisse.listener["tray-klick"]({payload: {sichtbar: true}});
    ereignisse.listener["hotkey"]({payload: {sichtbar: false}});
    ereignisse.listener["oeffnen"]({payload: {sichtbar: true}});
    ereignisse.listener["zweiter-start"]({payload: {args: []}});
    ereignisse.listener["ruhe"]({payload: {}});
    ereignisse.listener["fenster-modus"]({payload: "leiste"});
    erwarte.gleich(empfangen.filter(e => e[0] === "tray-klick").length, 1, "tray-klick erreicht das Abo");
    erwarte.gleich(empfangen.filter(e => e[0] === "hotkey").length, 1, "hotkey erreicht das Abo");
    erwarte.gleich(empfangen.filter(e => e[0] === "oeffnen").length, 1, "oeffnen erreicht das Abo");
    erwarte.gleich(empfangen.filter(e => e[0] === "modus-extern")[0][1], "leiste", "fenster-modus wird als modus-extern gemeldet");
  });
  pruefe("keine toten Exporte im Quelltext: 0 ladenSync, 0 Plattform.benachrichtigen", () => {
    const path = require("path"), fs = require("fs");
    const dateien = fs.readdirSync(path.join(__dirname, "..", "src", "plattform")).filter(n => n.endsWith(".js"));
    let ladenSync = 0, plattformBenachrichtigen = 0;
    for (const n of dateien) {
      const text = fs.readFileSync(path.join(__dirname, "..", "src", "plattform", n), "utf8");
      ladenSync += (text.match(/ladenSync/g) || []).length;
      plattformBenachrichtigen += (text.match(/Plattform\.benachrichtigen/g) || []).length;
    }
    erwarte.gleich(ladenSync, 0, "ladenSync-Vorkommen in src/plattform");
    erwarte.gleich(plattformBenachrichtigen, 0, "Plattform.benachrichtigen-Vorkommen in src/plattform");
  });
  pruefe("Fassade reicht kann() an den richtigen Adapter weiter", () => {
    const browser = pfBrowser();
    const {adapter: tauri} = pfTauri({info: {kann: PF_RUST_KANN, gruende: PF_RUST_GRUENDE}});
    const fassadeBrowser = pfFassade(tauri, browser);
    erwarte.gleich(fassadeBrowser.name, "browser", "ohne __TAURI__ ist der Browser-Adapter dran");
    erwarte.gleich(fassadeBrowser.kann("tray").ja, false, "Browser über die Fassade");
    const bereich = {console: {log(){}, error(){}}, setTimeout, clearTimeout, window: {__TAURI__: {}},
      PlattformTauri: tauri, PlattformBrowser: browser, LABOR_VERSION: "test"};
    const vm = require("vm"); vm.createContext(bereich);
    vm.runInContext(pfQuelle("plattform.js") + "\n;globalThis.__P = Plattform;", bereich, {filename: "plattform/plattform.js"});
    erwarte.gleich(bereich.__P.name, "tauri", "mit __TAURI__ ist der Tauri-Adapter dran");
    erwarte.gleich(bereich.__P.kann("leiste").ja, true, "Tauri-Fähigkeit über die Fassade");
  });
});
