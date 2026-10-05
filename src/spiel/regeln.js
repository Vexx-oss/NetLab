"use strict";
/* ---------- Spiel: Stufenregeln (Design – Spielspaß 2.0, § 6; Architektur § 9.2) ----------
   Erst beibringen, dann abfragen. Das Niveau entscheidet, wie viel das Spiel vorher verrät:
     Einstieg  „!“-Warnungen an, Live-Haken der Ziele mit Grund, Abnahmeversuche frei
     AP1       Warnungen erst ab Hilfestufe 2, Live-Haken ohne Grund, −½ ★ ab dem 2. Abnahmeversuch (einmal)
     AP2       keine Warnungen, Haken erst bei der Abnahme, −1 ★ ab dem 2. Abnahmeversuch (einmal)
   Prüfung: keine Warnungen, keine Live-Haken, kein Versuchsabzug (sie hat eigene Regeln, spiel/pruefung.js).
   Verdacht (Phase B): Einstieg freiwillig, AP1 ohne Verdacht −½ ★, AP2 −1 ★. Netzprüfer (Werkzeug aus dem Shop, am
   Auftrag eingeschaltet): „!“-Warnungen auch im AP-Niveau – bezahlte Hilfe im Sinne von R1.
   Flow-Regler (§ 20 F6): inst.flow "geruest" zeigt Warnungen, Haken und Grund wie im Einstieg, ein zweiter Abnahmeversuch kostet
   nichts; "verwicklung" lässt die „!“-Warnungen weg (außer mit Netzprüfer).
   Spiel.regeln(inst) → {niveau, warnungen, liveHaken, liveGrund, versuchAbzug, verdachtAbzug} */
Spiel.REGELN = {
  E:   {warnungenAbHilfe: 0,    liveHaken: true,  liveGrund: true,  versuchAbzug: 0,   verdachtAbzug: 0},
  AP1: {warnungenAbHilfe: 2,    liveHaken: true,  liveGrund: false, versuchAbzug: 0.5, verdachtAbzug: 0.5},
  AP2: {warnungenAbHilfe: null, liveHaken: false, liveGrund: false, versuchAbzug: 1,   verdachtAbzug: 1},
};

Spiel.regeln = function(inst){
  const niveau = inst ? Spiel.niveauVon(inst) : "E";
  const r = Spiel.REGELN[niveau] || Spiel.REGELN.E;
  const pruefung = !!inst && inst.quelle === "pruefung";
  const hilfe = (inst && inst.hilfeStufe) || 0;
  const pruefer = !!inst && !!inst.netzpruefer && !!Spiel.werkzeug && Spiel.werkzeug.hat("netzpruefer");
  const geruest = !pruefung && !!inst && inst.flow === "geruest", verwicklung = !pruefung && !!inst && inst.flow === "verwicklung";
  return {
    niveau,
    warnungen: !pruefung && (geruest || (!verwicklung && r.warnungenAbHilfe != null && hilfe >= r.warnungenAbHilfe) || pruefer),
    liveHaken: !pruefung && (geruest || r.liveHaken),
    liveGrund: !pruefung && (geruest || r.liveGrund),
    versuchAbzug: pruefung || geruest ? 0 : r.versuchAbzug,
    verdachtAbzug: pruefung ? 0 : r.verdachtAbzug,
    flow: pruefung ? null : (inst && inst.flow) || null,
  };
};
