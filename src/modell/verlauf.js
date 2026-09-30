"use strict";
/* ---------- Rückgängig/Wiederholen ----------
   Schnappschuss-basiert: Das Netz ist klein (JSON), deshalb speichert jeder Schritt das ganze Netz davor.
   Jede Änderung aus Oberfläche oder Konsole läuft über aendern(); danach meldet der Bus „netz-geaendert“. */
Modell.verlauf = function(netz, {max = 100} = {}){
  const zurueckStapel = [], vorStapel = [];
  const ersetzen = (ziel, quelle) => { for (const k of Object.keys(ziel)) delete ziel[k]; Object.assign(ziel, tief(quelle)); };
  const v = {
    netz,
    aendern(beschreibung, fn){
      const vorher = tief(netz);
      let ergebnis;
      try { ergebnis = fn(netz); }
      catch (e) { ersetzen(netz, vorher); throw e; }
      if (Modell.gleich(vorher, netz)) return ergebnis;          /* nichts geändert → kein Schritt */
      zurueckStapel.push({beschreibung, netz: vorher});
      if (zurueckStapel.length > max) zurueckStapel.shift();
      vorStapel.length = 0;
      Bus.senden("netz-geaendert", {netz, beschreibung});
      return ergebnis;
    },
    zurueck(){
      const s = zurueckStapel.pop(); if (!s) return null;
      vorStapel.push({beschreibung: s.beschreibung, netz: tief(netz)});
      ersetzen(netz, s.netz);
      Bus.senden("netz-geaendert", {netz, beschreibung: "Rückgängig: " + s.beschreibung, rueckgaengig: true});
      return s.beschreibung;
    },
    vor(){
      const s = vorStapel.pop(); if (!s) return null;
      zurueckStapel.push({beschreibung: s.beschreibung, netz: tief(netz)});
      ersetzen(netz, s.netz);
      Bus.senden("netz-geaendert", {netz, beschreibung: "Wiederholen: " + s.beschreibung});
      return s.beschreibung;
    },
    get kannZurueck(){ return zurueckStapel.length > 0; },
    get kannVor(){ return vorStapel.length > 0; },
    get liste(){ return zurueckStapel.map(s => s.beschreibung); },
    leeren(){ zurueckStapel.length = 0; vorStapel.length = 0; },
  };
  return v;
};
