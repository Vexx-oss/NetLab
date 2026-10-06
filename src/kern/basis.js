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
   {lern:{…Lernmotor…}, labor:{…Spielstand…}, einst:{…}}. Plattform.ladenSync() füllt ihn beim Start.

   EINE Entprellung: 1500 ms nach der letzten Änderung wird geschrieben (SPEICHER.entprellung).
   Vorher lagen ZWEI Schichten übereinander — 400 ms im Spiel (Spiel.autospeichern) und 2000 ms
   hier. Gemessen (06.10.2026, Edge headless, 1366×768, Einzeldatei-Fassung): einfacher
   Spiel.speichern()-Ruf 2010 ms, Netzwechsel 2415 ms, Auftragsabschluss 2436 ms bis zum
   Schreibvorgang. Wer nicht warten will, ruft store.sofort() (im Spiel: Spiel.sofortSpeichern)
   — das schreibt augenblicklich.

   Zustand für die Kopfzeile (store.stand()): "schreibt" | "gesichert" | "fehler". Jede Änderung
   meldet der Bus als "speicher-stand"; ein gescheiterter Schreibvorgang zusätzlich als
   "speicher-fehler" (das Spiel zeigt daraus einen Hinweis — vorher blieb er stumm). */
const SPEICHER = { daten: {}, meldung: null, schmutzig: false, timer: null, schreiber: null,
                   entprellung: 1500, letzterErfolg: null, fehler: null, standKennung: null };
const store = {
  get(k, d){ const v = SPEICHER.daten[k]; return v === undefined ? d : tief(v); },
  set(k, v){ SPEICHER.daten[k] = tief(v); store.markieren(); },
  markieren(){
    SPEICHER.schmutzig = true;
    if (!SPEICHER.schreiber || typeof setTimeout === "undefined") { store.standMelden(); return; }
    if (SPEICHER.timer) clearTimeout(SPEICHER.timer);
    /* Der Zeitgeber fängt seine Ablehnung selbst ab: sonst stünde bei vollem Speicher eine
       unbehandelte Promise-Ablehnung in der Konsole und niemand erführe davon. */
    SPEICHER.timer = setTimeout(() => { SPEICHER.timer = null; store.sofort().catch(() => {}); }, SPEICHER.entprellung);
    store.standMelden();
  },
  /* sofort schreiben (beim Schließen, Moduswechsel, Export, Auftragsabschluss) */
  sofort(){
    if (SPEICHER.timer) { clearTimeout(SPEICHER.timer); SPEICHER.timer = null; }
    if (!SPEICHER.schmutzig || !SPEICHER.schreiber) { store.standMelden(); return Promise.resolve(false); }
    SPEICHER.schmutzig = false;
    /* scheitern merkt den Fehler und gibt ihn zurück — geworfen wird erst im Versprechen,
       sonst flöge ein synchroner Wurf aus sofort() heraus (im Test aufgefallen). */
    const scheitern = e => {
      SPEICHER.schmutzig = true;                 /* nichts geht verloren: der nächste Versuch nimmt ihn mit */
      SPEICHER.fehler = {name: (e && e.name) || "Fehler", text: String((e && e.message) || e || "unbekannt")};
      store.standMelden();
      return e instanceof Error ? e : new Error(String(e));
    };
    let p;
    try { p = Promise.resolve(SPEICHER.schreiber(SPEICHER.daten)); }
    catch (e) { return Promise.reject(scheitern(e)); }
    return p.then(() => { SPEICHER.letzterErfolg = Date.now(); SPEICHER.fehler = null; store.standMelden(); return true; },
                  e => { throw scheitern(e); });
  },
  /* Zustand des Speicherns: art = "schreibt" | "gesichert" | "fehler" (+ Fehlertext, Zeitpunkt) */
  stand(){
    if (SPEICHER.fehler) return {art: "fehler", fehler: SPEICHER.fehler, zeit: SPEICHER.letzterErfolg};
    if (SPEICHER.schmutzig || SPEICHER.timer) return {art: "schreibt", fehler: null, zeit: SPEICHER.letzterErfolg};
    return {art: "gesichert", fehler: null, zeit: SPEICHER.letzterErfolg};
  },
  /* Stand melden — nur bei echter Änderung, damit der Bus nicht bei jedem Tastendruck feuert */
  standMelden(){
    const s = store.stand(), k = s.art + "|" + (s.fehler ? s.fehler.name : "");
    if (k === SPEICHER.standKennung) return s;
    SPEICHER.standKennung = k;
    Bus.senden("speicher-stand", s);
    if (s.art === "fehler") Bus.senden("speicher-fehler", s.fehler);
    return s;
  },
  /* vom Start aufgerufen, bevor der Lernmotor lädt */
  initialisieren(daten, schreiber, meldung){
    if (SPEICHER.timer) { clearTimeout(SPEICHER.timer); SPEICHER.timer = null; }
    SPEICHER.daten = daten && typeof daten === "object" ? daten : {};
    SPEICHER.schreiber = schreiber || null;
    SPEICHER.meldung = meldung || null;
    SPEICHER.fehler = null; SPEICHER.standKennung = null;
    store.standMelden();
  },
  alles(){ return tief(SPEICHER.daten); },
  schreiberSetzen(fn){ SPEICHER.schreiber = fn || null; if (SPEICHER.schmutzig) store.markieren(); },
  get meldung(){ return SPEICHER.meldung; },
  get entprellungMs(){ return SPEICHER.entprellung; },
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
