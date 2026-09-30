"use strict";
/* ---------- Plattform: Browser (Rückfall und Entwicklung) ----------
   Speichert alles unter einem localStorage-Schlüssel. Fensterfunktionen gibt es hier nicht;
   kann() sagt das mit einem Satz, die Oberfläche blendet die Schalter dann aus. */
const PlattformBrowser = (() => {
  const SCHLUESSEL = "netzwerk-labor";
  const hoerer = {};
  const NEIN = {
    immerOben: "Im Browser nicht möglich. Das Desktop-Programm kann die Leiste im Vordergrund halten.",
    tray: "Ein Tray-Symbol gibt es nur im Desktop-Programm.",
    autostart: "Autostart gibt es nur im Desktop-Programm.",
    hotkey: "Globale Tastenkürzel gibt es nur im Desktop-Programm.",
    klickdurch: "Klick-Durchlässigkeit gibt es nur im Desktop-Programm.",
    vollbildErkennen: "Im Browser nicht erkennbar.",
  };
  let basisTitel = null;
  return {
    name: "browser",
    ladenSync(){
      try {
        const roh = localStorage.getItem(SCHLUESSEL);
        return {daten: roh ? JSON.parse(roh) : null, meldung: null};
      } catch (e) {
        return {daten: null, meldung: "Der gespeicherte Stand im Browser war nicht lesbar und wurde nicht geladen."};
      }
    },
    speichern(daten){
      try { localStorage.setItem(SCHLUESSEL, JSON.stringify(daten)); return Promise.resolve(); }
      catch (e) { return Promise.reject(e); }
    },
    fenster: {
      modus(m){ Bus.senden("fenster-modus", m); return Promise.resolve(); },
      immerOben(){ return Promise.resolve(false); },
      position(){ return Promise.resolve(); },
    },
    abzeichen(n, text){
      if (typeof document === "undefined") return;
      basisTitel ??= document.title;
      document.title = n > 0 ? `(${n}) ${basisTitel}` : basisTitel;
    },
    benachrichtigen(){ /* bewusst still: kein Pop-up im Browser */ },
    autostart(){ return Promise.resolve(false); },
    autostartStatus(){ return Promise.resolve(false); },
    datei: {
      exportieren(name, text){
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([text], {type: "application/json"}));
        a.download = name; document.body.append(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        return Promise.resolve(true);
      },
      importieren(){
        return new Promise(res => {
          const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json,application/json";
          inp.onchange = () => { const f = inp.files[0]; if (!f) return res(null); const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => res(null); r.readAsText(f); };
          inp.click();
        });
      },
    },
    kann(f){ return f in NEIN ? {ja: false, grund: NEIN[f]} : {ja: true, grund: null}; },
    an(ereignis, fn){ (hoerer[ereignis] ||= []).push(fn); },
    info(){ return {os: typeof navigator !== "undefined" ? navigator.platform : "?", sitzung: "browser"}; },
  };
})();
