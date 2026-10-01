"use strict";
/* ---------- Plattform-Schnittstelle ----------
   Der Kern kennt nur dieses Objekt, nie Tauri direkt (Architektur.md § 8).
   PlattformTauri (plattform-tauri.js) und PlattformBrowser (plattform-browser.js) setzen es um. */
const Plattform = (() => {
  const echt = () => (typeof window !== "undefined" && window.__TAURI__ && typeof PlattformTauri !== "undefined") ? PlattformTauri : PlattformBrowser;
  let impl = null;
  const p = {
    get impl(){ return impl ||= echt(); },
    get name(){ return p.impl.name; },
    get version(){ return typeof LABOR_VERSION !== "undefined" ? LABOR_VERSION : "dev"; },
    ladenSync(){ return p.impl.ladenSync(); },
    speichern(daten){ return p.impl.speichern(daten); },
    fenster: {
      modus: m => p.impl.fenster.modus(m),
      immerOben: b => p.impl.fenster.immerOben(b),
      position: e => p.impl.fenster.position?.(e),
      groesse: (b, hoehe) => p.impl.fenster.groesse ? p.impl.fenster.groesse(b, hoehe) : Promise.resolve(),
      zeigen: () => p.impl.fenster.zeigen?.(),
      verstecken: () => p.impl.fenster.verstecken?.(),
      beenden: () => p.impl.fenster.beenden?.(),
      zustand: () => p.impl.fenster.zustand ? p.impl.fenster.zustand() : Promise.resolve(null),
    },
    abzeichen: (n, text) => p.impl.abzeichen(n, text),
    benachrichtigen: text => p.impl.benachrichtigen(text),
    autostart: b => p.impl.autostart(b),
    autostartStatus: () => p.impl.autostartStatus ? p.impl.autostartStatus() : Promise.resolve(false),
    datei: {
      exportieren: (name, text) => p.impl.datei.exportieren(name, text),
      importieren: () => p.impl.datei.importieren(),
    },
    kann: f => p.impl.kann(f),
    an: (ereignis, fn) => p.impl.an(ereignis, fn),
    info: () => p.impl.info ? p.impl.info() : {os: "unbekannt"},
  };
  return p;
})();
