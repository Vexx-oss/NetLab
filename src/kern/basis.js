"use strict";
/* ---------- Kern: Speicher, Zeit, Ereignisse, Zufall ----------
   Läuft im Programm (Tauri), im Browser und headless in Node (tests/run.js).
   Kein DOM-Zugriff. Der Speicher ist ein Cache mit Durchschreiben: store.get/set bleiben
   synchron (der Lernmotor der Spielhalle braucht das), geschrieben wird verzögert über die Plattform. */

/* Zeit: alles außerhalb von sim/ und cli/ holt die Uhr hier, damit Tests sie steuern können */
const jetzt = (() => {
  let fest = null;
  const f = () => fest != null ? fest : Date.now();
  f.setzen = ms => { fest = ms; };
  f.weiter = ms => { fest = (fest != null ? fest : Date.now()) + ms; };
  f.frei = () => { fest = null; };
  return f;
})();

/* Datum als YYYY-MM-DD in lokaler Zeit (wie Spielhalle; der Lernmotor nutzt diese drei) */
const heute = (d = new Date(jetzt())) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const plusTage = (tag, n) => { const [y,m,d] = tag.split("-").map(Number); return heute(new Date(y, m-1, d+n)); };
const tageZwischen = (a, b) => Math.round((new Date(b+"T12:00") - new Date(a+"T12:00")) / 864e5);
const datumDe = tag => tag.split("-").reverse().join(".");

/* Tiefe Kopie für reine Daten (Netze, Konfig, Frames) */
const tief = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* Ereignisbus: lose Kopplung zwischen UI, Spiel und Modell */
const Bus = (() => {
  const hoerer = {};
  return {
    an(name, fn){ (hoerer[name] ||= []).push(fn); return () => Bus.aus(name, fn); },
    aus(name, fn){ hoerer[name] = (hoerer[name] || []).filter(f => f !== fn); },
    senden(name, daten){
      for (const fn of (hoerer[name] || []).slice()) {
        try { fn(daten); } catch (e) { (typeof console !== "undefined") && console.error("Bus", name, e); }
      }
    },
  };
})();

/* Deterministischer Zufall (mulberry32). sim/ und Generatoren nutzen nur diesen, nie Math.random. */
function Zufall(seed){
  let a = (typeof seed === "string" ? [...seed].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0, 1779033703) : (seed >>> 0)) || 1;
  const kommazahl = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const zahl = n => Math.floor(kommazahl() * n);
  const wahl = arr => arr[zahl(arr.length)];
  const mischen = arr => { const b = arr.slice(); for (let i = b.length-1; i > 0; i--) { const j = zahl(i+1); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const zwischen = (min, max) => min + zahl(max - min + 1);
  return {kommazahl, zahl, wahl, mischen, zwischen, get seed(){ return a; }};
}

/* Speicher: Cache mit Durchschreiben. SPEICHER hält alles, was gespeichert wird:
   {lern:{…Lernmotor…}, labor:{…Spielstand…}, einst:{…}}. Plattform.ladenSync() füllt ihn beim Start. */
const SPEICHER = { daten: {}, meldung: null, schmutzig: false, timer: null, schreiber: null };
const store = {
  get(k, d){ const v = SPEICHER.daten[k]; return v === undefined ? d : tief(v); },
  set(k, v){ SPEICHER.daten[k] = tief(v); store.markieren(); },
  markieren(){
    SPEICHER.schmutzig = true;
    if (!SPEICHER.schreiber || typeof setTimeout === "undefined") return;
    if (SPEICHER.timer) clearTimeout(SPEICHER.timer);
    SPEICHER.timer = setTimeout(store.sofort, 2000);
  },
  /* sofort schreiben (beim Schließen, Moduswechsel, Export) */
  sofort(){
    if (SPEICHER.timer) { clearTimeout(SPEICHER.timer); SPEICHER.timer = null; }
    if (!SPEICHER.schmutzig || !SPEICHER.schreiber) return Promise.resolve();
    SPEICHER.schmutzig = false;
    return Promise.resolve(SPEICHER.schreiber(SPEICHER.daten)).catch(e => { SPEICHER.schmutzig = true; throw e; });
  },
  /* vom Start aufgerufen, bevor der Lernmotor lädt */
  initialisieren(daten, schreiber, meldung){
    SPEICHER.daten = daten && typeof daten === "object" ? daten : {};
    SPEICHER.schreiber = schreiber || null;
    SPEICHER.meldung = meldung || null;
  },
  alles(){ return tief(SPEICHER.daten); },
  schreiberSetzen(fn){ SPEICHER.schreiber = fn; if (SPEICHER.schmutzig) store.markieren(); },
  get meldung(){ return SPEICHER.meldung; },
};

/* Frühstart: Der Lernmotor liest store schon beim Laden seines Skripts. Deshalb füllt dieser Block den
   Speicher sofort – im Programm aus window.__LABOR_SPEICHER__ (setzt die Rust-Seite per Initialisierungsskript
   vor allen Seitenskripten), im Browser aus localStorage. Den Schreiber setzt ui/start.js (Plattform.speichern). */
(function fruehstart(){
  if (typeof window === "undefined") return;
  try {
    const s = window.__LABOR_SPEICHER__;
    if (s) { store.initialisieren(s.daten, null, s.meldung || null); return; }
    const roh = window.localStorage ? window.localStorage.getItem("netzwerk-labor") : null;
    store.initialisieren(roh ? JSON.parse(roh) : {}, null, null);
  } catch (e) {
    store.initialisieren({}, null, "Der gespeicherte Stand war nicht lesbar. Das Labor startet leer.");
  }
})();

/* Kleine Helfer, die auch headless gebraucht werden */
const eur = x => (Math.round(x*100)/100).toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2});
const zahlDe = x => Number(x).toLocaleString("de-DE");
const klemme = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
