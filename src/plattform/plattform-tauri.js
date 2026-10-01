"use strict";
/* ---------- Plattform: Desktop-Programm (Tauri 2) ----------
   Die Rust-Hülle stellt vor allen Seitenskripten window.__LABOR_SPEICHER__ (Spielstand) und
   window.__LABOR_PLATTFORM__ (was auf diesem System geht, mit Begründung) bereit. Befehle über invoke,
   Ereignisse der Hülle (fenster-modus, zweiter-start, ruhe, labor-beenden) über window.__TAURI__.event. */
const PlattformTauri = (() => {
  const T = () => window.__TAURI__;
  const invoke = (cmd, args) => T().core.invoke(cmd, args || {});
  const hoerer = {};
  const melden = (name, daten) => { for (const fn of hoerer[name] || []) { try { fn(daten); } catch (e) { console.error("Plattform", name, e); } } };
  let info = (typeof window !== "undefined" && window.__LABOR_PLATTFORM__) || null;
  let letzteMeldung = 0;

  function einrichten(){
    if (typeof window === "undefined" || !T() || einrichten.fertig) return;
    einrichten.fertig = true;
    const ev = T().event;
    /* Rust hat das Fenster schon umgeschaltet (Tray, Tastenkürzel, Ruhe) – die Seite baut nur noch ihre Ansicht um */
    ev.listen("fenster-modus", e => melden("modus-extern", e.payload));
    ev.listen("zweiter-start", e => melden("zweiter-start", e.payload));
    ev.listen("ruhe", e => melden("ruhe", e.payload));
    ev.listen("labor-beenden", () => {
      Promise.resolve(typeof store !== "undefined" ? store.sofort() : null).catch(() => {}).finally(() => invoke("beenden"));
    });
    if (!info) invoke("plattform_info").then(i => { info = i; }).catch(() => {});
    /* Selbsttest (LABOR_SELBSTTEST=1): Ergebnis nach dem Laden an die Hülle melden */
    if (info && info.selbsttest) setTimeout(() => { try { window.__LABOR_SELBSTTEST__?.(); } catch (e) { console.error(e); } }, 3000);
  }
  const fehlerSammlung = [];
  if (typeof window !== "undefined") {
    window.addEventListener("error", e => fehlerSammlung.push(String(e.message || e.error)));
    window.addEventListener("unhandledrejection", e => fehlerSammlung.push("Promise: " + String(e.reason && e.reason.message || e.reason)));
    window.__LABOR_SELBSTTEST__ = () => {
      const ergebnis = {
        zeit: new Date().toISOString(), titel: document.title, modus: document.documentElement.dataset.modus || null,
        fehler: fehlerSammlung.slice(0, 20), version: typeof LABOR_VERSION !== "undefined" ? LABOR_VERSION : "?",
        spiel: typeof Spiel !== "undefined" && Spiel._st ? {stufe: Spiel.st.stufe, offen: Spiel.offen(), tickets: DATEN.tickets.length} : null,
        sim: typeof Sim !== "undefined" && typeof Sim.ping === "function" ? Sim.ping(DATEN.beispiele.salon(), "kasse", "www.beispiel.de").ok : null,
        tests: typeof window.TESTERGEBNIS !== "undefined" ? window.TESTERGEBNIS : null,
      };
      return invoke("selbsttest_ergebnis", {json: JSON.stringify(ergebnis)});
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", einrichten); else setTimeout(einrichten, 0);
  }

  return {
    name: "tauri",
    ladenSync(){
      const s = (typeof window !== "undefined" && window.__LABOR_SPEICHER__) || {};
      return {daten: s.daten || null, meldung: s.meldung || null};
    },
    speichern(daten){ return invoke("speichern", {json: JSON.stringify(daten)}); },
    fenster: {
      modus: m => invoke("fenster_modus", {modus: m}),
      immerOben: an => invoke("immer_oben", {an: !!an}),
      groesse: (b, hoehe) => invoke("fenster_groesse", {b, h: hoehe}),
      position: ecke => invoke("fenster_ecke", {ecke}),
      zeigen: () => Promise.resolve(),            /* zweiter Start: Rust holt bereits das richtige Fenster nach vorn (Vollansicht bleibt Vollansicht) */
      verstecken: () => invoke("fenster_modus", {modus: "tray"}),
      beenden: () => Promise.resolve(typeof store !== "undefined" ? store.sofort() : null).finally(() => invoke("beenden")),
      zustand: () => invoke("fenster_zustand"),
    },
    abzeichen(n, text){ invoke("abzeichen", {n: Math.max(0, n | 0), text: String(text || "")}).catch(() => {}); },
    benachrichtigen(text){
      /* bewusst still: höchstens eine je 30 min, nur wenn eingeschaltet und die Plattform es kann */
      const e = (typeof store !== "undefined" && store.get("einst", {})) || {};
      if (!e.benachrichtigen || Date.now() - letzteMeldung < 30 * 60000 || !(info && info.kann && info.kann.benachrichtigen)) return;
      letzteMeldung = Date.now();
    },
    autostart: an => invoke("autostart", {an: !!an}),
    autostartStatus: () => invoke("autostart_status"),
    datei: {
      exportieren: (name, text) => invoke("exportieren", {name, inhalt: text}),
      importieren: () => invoke("importieren"),
    },
    kann(f){
      if (!info || !info.kann || !(f in info.kann)) return {ja: true, grund: null};
      const ja = !!info.kann[f];
      return {ja, grund: (info.gruende && info.gruende[f]) || (ja ? null : "Auf diesem System nicht verfügbar.")};
    },
    an(ereignis, fn){ (hoerer[ereignis] ||= []).push(fn); },
    info: () => info || {os: "?", sitzung: "?"},
    ruhe: an => invoke("ruhe", {an: !!an}),
    selbsttest: erg => invoke("selbsttest_ergebnis", {json: JSON.stringify(erg || {})}),
  };
})();
