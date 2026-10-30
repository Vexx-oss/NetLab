/* ---------- Vorführ-Fassung: Vorlauf (im <head>, VOR allen Spielskripten) ----------
   Eingehängt von tools/kiosk.py — der normale Bau enthält diese Datei NICHT.
   Aufgabe: bevor das Spiel den Spielstand aus dem localStorage liest, entscheiden, ob
   dieser Besuch bei 0 beginnen soll. Das ist der Unterschied zwischen „Vorführung" und
   „Spiel": Wer den Rechner neu öffnet (neuer Tab, neues Fenster, neuer Besucher) bekommt
   einen frischen Spielstand; ein Neuladen (F5) innerhalb derselben Sitzung behält ihn.
   Abgelaufene Stunde: ebenfalls frisch.

   Die Fassung benutzt einen EIGENEN Speicherplatz (`__APP_KEY__`), damit ein Spielstand
   der normalen Fassung auf demselben Rechner unberührt bleibt. Gelesen und geschrieben
   wird hier nur der Browser-Speicher; das Spiel selbst wird nicht angefasst. */
(function(){
  "use strict";
  var MINUTEN = __MINUTEN__;
  var DAUER = Math.round(MINUTEN * 60000);
  var APP_KEY = "__APP_KEY__";
  var START_KEY = "__START_KEY__";
  var SITZUNG_KEY = "__SITZUNG_KEY__";
  var start = 0, frisch = false, fehler = null;

  function zahl(wert){
    var n = parseInt(wert, 10);
    return isFinite(n) && n > 0 ? n : 0;
  }

  /* Laufende Sitzung? Ein Fehler beim Zugriff (z. B. blockierter Speicher) wird als
     „laufende Sitzung" gewertet: dann wird nur nach Ablauf zurückgesetzt und niemals
     bei jedem Neuladen der Fortschritt gelöscht. */
  var sitzung = true;
  try { sitzung = sessionStorage.getItem(SITZUNG_KEY) === "1"; }
  catch(e){ sitzung = true; }

  try {
    var jetzt = Date.now();
    var alt = zahl(localStorage.getItem(START_KEY));
    frisch = !sitzung || !alt || alt + DAUER <= jetzt;
    if (frisch) {
      try { localStorage.removeItem(APP_KEY); } catch(e){ fehler = String((e && e.message) || e); }
      start = jetzt;
      try { localStorage.setItem(START_KEY, String(start)); } catch(e){ fehler = String((e && e.message) || e); }
    } else {
      start = alt;
    }
    try { sessionStorage.setItem(SITZUNG_KEY, "1"); } catch(e){ /* ohne Sitzungsspeicher: nur Ablauf */ }
  } catch (e) {
    /* Kein Speicher verfügbar: die Vorführung läuft dann nur im Arbeitsspeicher dieser Seite. */
    start = Date.now();
    frisch = true;
    fehler = String((e && e.message) || e);
  }

  window.__vorfuehrung = {
    minuten: MINUTEN, dauer: DAUER, start: start, frisch: frisch, fehler: fehler,
    appKey: APP_KEY, startKey: START_KEY, sitzungKey: SITZUNG_KEY,
  };
})();
