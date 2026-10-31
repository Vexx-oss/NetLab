"use strict";
/* ---------- Plattform: Browser (Rückfall und Entwicklung) ----------
   Speichert alles unter einem localStorage-Schlüssel. Fensterfunktionen gibt es hier nicht;
   kann() sagt das mit einem Satz, die Oberfläche blendet die Schalter dann aus.
   Fähigkeitsmatrix (KRN-02, Architektur § 8): JEDE der acht Fähigkeiten ist hier ausdrücklich
   nein MIT Grund; unbekannte Funktionen ebenfalls nein — nie „im Zweifel ja“ (KRN-B07).
   Die Systembenachrichtigung ist bewusst NICHT gebaut (früher eine stille Attrappe). */
const PlattformBrowser = (() => {
  const SCHLUESSEL = "netzwerk-labor";
  const hoerer = {};
  /* Die acht Fähigkeiten aus Architektur § 8 — im Browser ist KEINE verfügbar, jede mit Grund. */
  const NEIN = {
    leiste: "Die Leiste ist Teil des Desktop-Fensters. Im Browser gibt es nur die Vollansicht.",
    immerOben: "Im Browser nicht möglich. Das Desktop-Programm kann die Leiste im Vordergrund halten.",
    tray: "Ein Tray-Symbol gibt es nur im Desktop-Programm.",
    autostart: "Autostart gibt es nur im Desktop-Programm.",
    hotkey: "Globale Tastenkürzel gibt es nur im Desktop-Programm.",
    klickdurch: "Klick-Durchlässigkeit gibt es nur im Desktop-Programm.",
    vollbildErkennen: "Im Browser nicht erkennbar.",
    benachrichtigen: "Systembenachrichtigungen sind nicht eingebaut; das Labor zeigt neue Aufträge im Postfach.",
  };
  const UNBEKANNT = "Diese Funktion kennt das Labor nicht.";
  let basisTitel = null;
  return {
    name: "browser",
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
    autostart(){ return Promise.resolve(false); },
    autostartStatus(){ return Promise.resolve(false); },
    /* Datei-API ehrlich (KRN-04): Import löst auch beim ABBRUCH auf (null), statt ewig offen zu bleiben;
       Export meldet true nur, wenn der Übergabeweg (Blob, URL, Klick) ohne Fehler durchlief — bei einem
       Fehler ehrlich false statt stillem Ja. Ein echter Download ist im Browser nicht belegbar. */
    datei: {
      exportieren(name, text){
        try {
          if (typeof document === "undefined" || typeof URL === "undefined" || typeof Blob === "undefined") return Promise.resolve(false);
          const a = document.createElement("a");
          const url = URL.createObjectURL(new Blob([text], {type: "application/json"}));
          a.href = url; a.download = name;
          (document.body || document.documentElement).append(a);
          a.click();
          setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} try { a.remove(); } catch (e) {} }, 500);
          return Promise.resolve(true);
        } catch (e) {
          try { console.error("Plattform.datei.export", e); } catch (err) {}
          return Promise.resolve(false);
        }
      },
      importieren(){
        if (typeof document === "undefined") return Promise.resolve(null);
        return new Promise(res => {
          let erledigt = false;
          const fertig = wert => { if (!erledigt) { erledigt = true; res(wert); } };
          const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json,application/json";
          inp.onchange = () => {
            const f = inp.files && inp.files[0];
            if (!f) return fertig(null);
            const r = new FileReader();
            r.onload = () => fertig(String(r.result));
            r.onerror = () => { try { console.error("Plattform.datei.import", r.error); } catch (e) {} fertig(null); };
            r.readAsText(f);
          };
          /* Abbruch: moderne Browser feuern "cancel" am Dateifeld; ohne das blieb das Versprechen offen. */
          const abbrechen = () => fertig(null);
          if (inp.addEventListener) inp.addEventListener("cancel", abbrechen);
          inp.oncancel = abbrechen;
          inp.click();
        });
      },
    },
    kann(f){ return {ja: false, grund: NEIN[f] || UNBEKANNT}; },
    an(ereignis, fn){ (hoerer[ereignis] ||= []).push(fn); },
    info(){ return {os: typeof navigator !== "undefined" ? navigator.platform : "?", sitzung: "browser"}; },
  };
})();
