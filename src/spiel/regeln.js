"use strict";
/* ---------- Spiel: Stufenregeln (Design – Spielspaß 2.0, § 6; Architektur § 9.2) ----------
   Erst beibringen, dann abfragen. Das Niveau entscheidet, wie viel das Spiel vorher verrät:
     Einstieg  „!“-Warnungen an, Live-Haken der Ziele mit Grund, Abnahmeversuche frei
     AP1       Warnungen erst ab Hilfestufe 2, Live-Haken ohne Grund, −½ ★ ab dem 2. Abnahmeversuch (einmal)
     AP2       keine Warnungen, Haken erst bei der Abnahme, −1 ★ ab dem 2. Abnahmeversuch (einmal)
   Prüfung: keine Warnungen, keine Live-Haken, kein Versuchsabzug (sie hat eigene Regeln, spiel/pruefung.js).
   Spiel.regeln(inst) → {niveau, warnungen, liveHaken, liveGrund, versuchAbzug} */
Spiel.REGELN = {
  E:   {warnungenAbHilfe: 0,    liveHaken: true,  liveGrund: true,  versuchAbzug: 0},
  AP1: {warnungenAbHilfe: 2,    liveHaken: true,  liveGrund: false, versuchAbzug: 0.5},
  AP2: {warnungenAbHilfe: null, liveHaken: false, liveGrund: false, versuchAbzug: 1},
};

Spiel.regeln = function(inst){
  const niveau = inst ? Spiel.niveauVon(inst) : "E";
  const r = Spiel.REGELN[niveau] || Spiel.REGELN.E;
  const pruefung = !!inst && inst.quelle === "pruefung";
  const hilfe = (inst && inst.hilfeStufe) || 0;
  return {
    niveau,
    warnungen: !pruefung && r.warnungenAbHilfe != null && hilfe >= r.warnungenAbHilfe,
    liveHaken: !pruefung && r.liveHaken,
    liveGrund: !pruefung && r.liveGrund,
    versuchAbzug: pruefung ? 0 : r.versuchAbzug,
  };
};
