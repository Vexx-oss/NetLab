"use strict";
/* ---------- Plattform: Desktop-Programm (Tauri 2) ----------
   Die Rust-Hülle stellt vor allen Seitenskripten window.__LABOR_SPEICHER__ (Spielstand) und
   window.__LABOR_PLATTFORM__ (was auf diesem System geht, mit Begründung) bereit. Befehle über invoke.
   Ereignisse der Hülle über window.__TAURI__.event — gebrückt werden (KRN-02):
   fenster-modus → modus-extern, zweiter-start, ruhe, labor-beenden,
   tray-klick, hotkey, oeffnen (die Hülle emittiert sie in fenster::umschalten mit der Quelle
   als Ereignisnamen, shell/src-tauri/src/fenster.rs:327) — damit sind die Abos in
   src/ui/start.js:102-105 KEINE toten Abos.
   Fähigkeiten (kann) kommen AUSSCHLIESSLICH aus window.__LABOR_PLATTFORM__.kann/gruende; ohne
   ermittelte Angaben ist die Antwort nein mit Grund — nie „im Zweifel ja“ (KRN-B07). */
const PlattformTauri = (() => {
  const T = () => window.__TAURI__;
  const invoke = (cmd, args) => T().core.invoke(cmd, args || {});
  const hoerer = {};
  /* Datei-Fehler sichtbar machen (KRN-04): Bus-Ereignis für die Oberfläche + Konsole. */
  function dateiFehler(art, e){
    const fehler = {name: (e && e.name) || "Fehler", text: String((e && e.message) || e || "unbekannt")};
    try { if (typeof Bus !== "undefined" && Bus && typeof Bus.senden === "function") Bus.senden("datei-fehler", {art, fehler}); } catch (err) {}
    try { console.error("Plattform.datei." + art, fehler.text); } catch (err) {}
  }
  const melden = (name, daten) => { for (const fn of hoerer[name] || []) { try { fn(daten); } catch (e) { console.error("Plattform", name, e); } } };
  let info = (typeof window !== "undefined" && window.__LABOR_PLATTFORM__) || null;

  function einrichten(){
    if (typeof window === "undefined" || !T() || einrichten.fertig) return;
    einrichten.fertig = true;
    const ev = T().event;
    /* Rust hat das Fenster schon umgeschaltet (Tray, Tastenkürzel, Ruhe) – die Seite baut nur noch ihre Ansicht um */
    ev.listen("fenster-modus", e => melden("modus-extern", e.payload));
    ev.listen("zweiter-start", e => melden("zweiter-start", e.payload));
    ev.listen("ruhe", e => melden("ruhe", e.payload));
    /* Die Hülle emittiert diese drei selbst (fenster.rs:327 emit(quelle)) — hier an die Seite reichen.
       Ohne diese Brücke wären die Abos in src/ui/start.js:102-105 toter Code (Befund KRN-B06). */
    ev.listen("tray-klick", e => melden("tray-klick", e.payload));
    ev.listen("hotkey", e => melden("hotkey", e.payload));
    ev.listen("oeffnen", e => melden("oeffnen", e.payload));
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
    autostart: an => invoke("autostart", {an: !!an}),
    autostartStatus: () => invoke("autostart_status"),
    /* Datei-API ehrlich (KRN-04): invoke-Fehler werden abgefangen und über den Bus gemeldet, statt als
       unbehandelte Promise-Ablehnung zu enden. Import-Abbruch/Fehler → null, Export nur bei echtem
       Ok(true) true — Ok(false) (Dialog abgebrochen) und Schreibfehler sind ehrlich false. */
    datei: {
      exportieren(name, text){
        let p;
        try { p = invoke("exportieren", {name, inhalt: text}); }
        catch (e) { dateiFehler("export", e); return Promise.resolve(false); }
        return p.then(ok => ok === true).catch(e => { dateiFehler("export", e); return false; });
      },
      importieren(){
        let p;
        try { p = invoke("importieren"); }
        catch (e) { dateiFehler("import", e); return Promise.resolve(null); }
        return p.then(t => (t == null ? null : String(t))).catch(e => { dateiFehler("import", e); return null; });
      },
    },
    /* Ehrliche Fähigkeitsmatrix (KRN-02): bekannte Funktion → info.kann; unbekannt → nein. */
    kann(f){
      if (!info || !info.kann) return {ja: false, grund: "Plattform-Fähigkeiten sind noch nicht ermittelt."};
      if (!(f in info.kann)) return {ja: false, grund: "Diese Funktion kennt das Labor nicht."};
      const ja = !!info.kann[f];
      return {ja, grund: ja ? null : ((info.gruende && info.gruende[f]) || "Auf diesem System nicht verfügbar.")};
    },
    an(ereignis, fn){ (hoerer[ereignis] ||= []).push(fn); },
    info: () => info || {os: "?", sitzung: "?"},
    ruhe: an => invoke("ruhe", {an: !!an}),
    selbsttest: erg => invoke("selbsttest_ergebnis", {json: JSON.stringify(erg || {})}),
  };
})();
