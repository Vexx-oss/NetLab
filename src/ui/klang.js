"use strict";
/* ---------- Klang (Design – Spielspaß 2.0, Hebel 6; Architektur § 9.2) ----------
   UI.klang.spielen(name) → true, wenn hörbar gespielt. Alle Klänge werden mit WebAudio erzeugt – keine Dateien.
   Namen: klick · link · ping · haken · druck · sperre · blase · sterne · nochnicht · fanfare · klingeln
   Lautstärke aus Spiel.tonPegel(einst.ton, {modus, fokus}): Standard leise; Leiste/Tray und Fenster im Hintergrund
   immer stumm. Klänge erst nach der ersten Nutzer-Handlung (Autoplay-Regel), nie nur über Klang verständlich.
   UI.klang.zaehler {gespielt, stumm} und UI.klang.letzte {name, pegel, gespielt} – für Tests im Programm. */
UI.klang = (() => {
  let ctx = null, freigegeben = false;
  const zuletzt = {};
  const zaehler = {gespielt: 0, stumm: 0};
  if (typeof document !== "undefined") for (const t of ["pointerdown", "keydown"]) document.addEventListener(t, () => { freigegeben = true; }, {capture: true, passive: true});

  /* je Klang: Töne {f, f2?, typ, start, dauer, laut} – kurz, weich, nie schrill */
  const T = (f, o = {}) => Object.assign({f, typ: "sine", start: 0, dauer: .1, laut: .5}, o);
  const KLAENGE = {
    klick:     [T(1250, {dauer: .035, laut: .3})],
    link:      [T(523, {typ: "triangle", dauer: .08}), T(784, {typ: "triangle", start: .07, dauer: .12})],
    ping:      [T(1046, {f2: 1318, dauer: .13, laut: .4})],
    haken:     [T(660, {f2: 990, typ: "triangle", dauer: .12})],
    druck:     [0, .06, .12].map(s => T(170, {typ: "square", start: s, dauer: .035, laut: .12})),
    sperre:    [T(247, {typ: "triangle", dauer: .17, laut: .4})],
    blase:     [T(659, {dauer: .07, laut: .35}), T(880, {start: .06, dauer: .1, laut: .35})],
    sterne:    [523, 659, 784, 1046].map((f, i) => T(f, {typ: "triangle", start: i * .075, dauer: .16, laut: .4})),
    nochnicht: [T(220, {f2: 175, dauer: .24, laut: .35})],
    fanfare:   [523, 659, 784, 1046, 1318].map((f, i) => T(f, {typ: "triangle", start: i * .1, dauer: i === 4 ? .45 : .14, laut: .45})),
    klingeln:  [0, .07, .14, .21, .55, .62, .69, .76].map((s, i) => T(i % 2 ? 740 : 880, {start: s, dauer: .06, laut: .28})),   /* zweimal kurz, wie ein Tischtelefon */
  };
  function kontext(){
    if (!ctx) { const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext); if (!AC) return null; ctx = new AC(); }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }
  function ton(c, ziel, t){
    const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + t.start + .005;
    o.type = t.typ;
    o.frequency.setValueAtTime(t.f, t0);
    if (t.f2) o.frequency.exponentialRampToValueAtTime(t.f2, t0 + t.dauer);
    g.gain.setValueAtTime(.0001, t0);
    g.gain.exponentialRampToValueAtTime(t.laut, t0 + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + t.dauer);
    o.connect(g).connect(ziel);
    o.start(t0); o.stop(t0 + t.dauer + .03);
  }
  function pegel(){
    const e = (typeof store !== "undefined" && store.get("einst", {})) || {};
    const fokus = typeof document !== "undefined" && document.hasFocus() && !document.hidden;
    return Spiel.tonPegel(e.ton, {modus: UI.modus ? UI.modus() : "voll", fokus});
  }
  function spielen(name){
    const p = pegel(), jetztMs = typeof performance !== "undefined" ? performance.now() : 0;
    const gespielt = !!(p && KLAENGE[name] && freigegeben && !(zuletzt[name] && jetztMs - zuletzt[name] < 70));
    api.letzte = {name, pegel: p, gespielt: false};
    if (!gespielt) { zaehler.stumm++; return false; }
    const c = kontext(); if (!c) { zaehler.stumm++; return false; }
    zuletzt[name] = jetztMs;
    try {
      const master = c.createGain(); master.gain.value = p; master.connect(c.destination);
      for (const t of KLAENGE[name]) ton(c, master, t);
    } catch (e) { zaehler.stumm++; return false; }
    zaehler.gespielt++; api.letzte.gespielt = true;
    return true;
  }
  const api = {spielen, pegel, zaehler, letzte: null, NAMEN: Object.keys(KLAENGE)};
  return api;
})();
