/* ---------- Vorführ-Fassung: Anzeige und Rücksetzung (nach dem Spiel, im <body>) ----------
   Eingehängt von tools/kiosk.py — der normale Bau enthält diese Datei NICHT.
   Der Vorlauf (tools/kiosk/vorlauf.js, im <head>) hat den Startzeitpunkt gesetzt und beim
   ersten Öffnen bzw. nach Ablauf einen leeren Spielstand hinterlassen. Hier steht nur noch:
   ein kleiner Chip mit der Restzeit, die Rücksetzung nach Ablauf und die Messhaken.

   Rücksetzung im Browser: den eigenen Speicherplatz dieses Rechners löschen und die Seite
   neu laden — der Vorlauf erkennt die laufende Sitzung und setzt nicht doppelt zurück.
   Nichts am Spiel selbst wird dafür angefasst. */
(function(){
  "use strict";
  var V = window.__vorfuehrung;
  if (!V || !V.dauer) return;
  var DAUER = V.dauer;
  var START = V.start;
  var laeuft = false, ticker = null, chip = null, label = null;

  function jetzt(){ return Date.now(); }
  function rest(){ return Math.max(0, Math.min(DAUER, START + DAUER - jetzt())); }
  function zwei(n){ return n < 10 ? "0" + n : String(n); }
  function restText(ms){
    if (ms > 60000) return Math.ceil(ms / 60000) + " Min";
    var s = Math.ceil(ms / 1000);
    return Math.floor(s / 60) + ":" + zwei(s % 60);
  }

  function stil(){
    var st = document.createElement("style");
    st.textContent =
      "#vf-chip{position:fixed;left:50%;bottom:calc(28px + 12px);transform:translateX(-50%);" +
      "z-index:2147483000;display:flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;" +
      "background:rgba(8,16,14,.82);color:#E8F4ED;border:1px solid rgba(48,229,139,.35);" +
      "font:600 12px/1.2 system-ui,'Segoe UI',sans-serif;letter-spacing:.04em;pointer-events:none;" +
      "box-shadow:0 6px 24px rgba(0,0,0,.35)}" +
      "#vf-chip i{width:7px;height:7px;border-radius:50%;background:#30E58B;box-shadow:0 0 8px #30E58B}" +
      "@media (prefers-color-scheme:light){#vf-chip{background:rgba(242,246,243,.92);color:#0B1512;" +
      "border-color:rgba(11,122,75,.35)}}" +
      "@media (max-width:540px){#vf-chip{font-size:11px;padding:5px 10px}}" +
      "#vf-reset{position:fixed;inset:0;z-index:2147483001;display:grid;place-items:center;" +
      "background:rgba(4,7,10,.94);color:#E8F4ED;font:400 16px/1.5 system-ui,'Segoe UI',sans-serif;" +
      "text-align:center;padding:24px}" +
      "#vf-reset .vf-karte{max-width:460px}" +
      "#vf-reset h2{margin:0 0 8px;font:800 24px/1.2 system-ui,'Segoe UI',sans-serif}" +
      "#vf-reset p{margin:0 0 16px;color:#A9C3B6}" +
      "#vf-reset .vf-balken{width:180px;height:3px;margin:0 auto;border-radius:999px;" +
      "background:rgba(163,255,214,.14);overflow:hidden}" +
      "#vf-reset .vf-balken i{display:block;height:100%;width:40%;border-radius:inherit;" +
      "background:#30E58B;animation:vf-lade 1.1s ease-in-out infinite}" +
      "@keyframes vf-lade{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}" +
      "@media (prefers-reduced-motion:reduce){#vf-reset .vf-balken i{animation:none;width:100%;opacity:.6}}";
    document.head.append(st);
  }

  function chipBauen(){
    chip = document.createElement("div");
    chip.id = "vf-chip";
    chip.title = "Vorführ-Fassung: Dieser Rechner setzt sich " + V.minuten +
                 " Minuten nach dem Start auf einen frischen Spielstand zurück.";
    var punkt = document.createElement("i");
    punkt.setAttribute("aria-hidden", "true");
    label = document.createElement("span");
    chip.append(punkt, label);
    document.body.append(chip);
  }

  /* Nach Ablauf: Karte zeigen, dann neu laden. Im Browser ist das der ganze Weg; das
     Spiel selbst bekommt davon nichts mit und muss dafür nichts können. */
  function auslaufen(){
    if (laeuft) return;
    laeuft = true;
    try { clearTimeout(ticker); } catch(e){}
    if (label) label.textContent = "Vorführung · beendet";
    var overlay = document.createElement("div");
    overlay.id = "vf-reset";
    var karte = document.createElement("div");
    karte.className = "vf-karte";
    var titel = document.createElement("h2");
    titel.textContent = "Vorführung beendet";
    var text = document.createElement("p");
    text.textContent = "Die Stunde ist um — dieser Rechner bekommt einen frischen Spielstand für den nächsten Besuch.";
    var balken = document.createElement("div");
    balken.className = "vf-balken";
    balken.append(document.createElement("i"));
    karte.append(titel, text, balken);
    overlay.append(karte);
    document.body.append(overlay);

    if (typeof window.__TAURI__ !== "undefined") { programmZuruecksetzen(); return; }

    try { localStorage.removeItem(V.appKey); } catch(e){}
    try { localStorage.setItem(V.startKey, String(Date.now())); } catch(e){}
    setTimeout(function(){ location.reload(); }, 1400);
  }

  /* Falls die Vorführ-Fassung je in der .exe landet: dort liegt der Spielstand in der
     Rust-Hülle, ein Seiten-Neuladen brächte den alten Stand zurück. Deshalb derselbe Weg
     wie „Von 0 anfangen" (src/ui/uebergabe.js): Spiel zurücksetzen, Oberfläche im
     laufenden Prozess neu aufbauen. In DIESER Sitzung nicht gemessen — die Vorführ-Fassung
     wird als Browserdatei ausgeliefert. */
  function programmZuruecksetzen(){
    try { Spiel.uebergabe({lernstandBehalten: false}); } catch(e){}
    try {
      delete SPEICHER.daten["sandbox"];
      delete SPEICHER.daten["labor-sicherung"];
      delete SPEICHER.daten["klassenraum"];
      store.markieren();
    } catch(e){}
    try { store.sofort(); } catch(e){}
    try { UI.app && UI.app.dialogZu && UI.app.dialogZu(); } catch(e){}
    try { UI.menue && UI.menue.zu && UI.menue.zu(); } catch(e){}
    try { UI.palette && UI.palette.schliessen && UI.palette.schliessen(); } catch(e){}
    try {
      var S = UI.spiel && UI.spiel._S;
      if (S) { S.inst = null; S.live = null; S.demo = null; S.hilfeOffen = false; S.postfachWahl = null; S.fertig = null; }
    } catch(e){}
    try { UI.labor && UI.labor.auftragNeu && UI.labor.auftragNeu(); } catch(e){}
    try { UI.spiel && UI.spiel.status && UI.spiel.status(); } catch(e){}
    try { UI.app && UI.app.aktualisieren && UI.app.aktualisieren(); } catch(e){}
    try { UI.app && UI.app.ansicht && UI.app.ansicht("heute"); } catch(e){}
    try { localStorage.setItem(V.startKey, String(Date.now())); } catch(e){}
    var karte = document.getElementById("vf-reset");
    if (karte) karte.remove();
    if (label) label.textContent = "Vorführung · neu";
    laeuft = false;
    tick();
  }

  function tick(){
    var r = rest();
    if (label) label.textContent = "Vorführung · " + restText(r);
    if (r <= 0) { auslaufen(); return; }
    /* Minutenanzeige reicht; nur in der letzten Minute jede Sekunde. */
    ticker = setTimeout(tick, r > 61000 ? 15000 : 1000);
  }

  function starten(){
    if (!document.body || laeuft) return;
    stil();
    chipBauen();
    tick();
  }

  /* Messhaken (nur lesend bzw. für die Prüfung in tools/kiosk.py --messen). */
  window.__vorfuehrung.rest = rest;
  window.__vorfuehrung.restText = function(){ return restText(rest()); };
  window.__vorfuehrung.chipText = function(){ return label ? label.textContent : null; };
  window.__vorfuehrung.zuruecksetzen = auslaufen;

  if (document.readyState === "complete") starten();
  else window.addEventListener("load", starten);
})();
