"use strict";
/* STUFENREGELN (spiel/regeln.js, Design – Spielspaß 2.0 § 6): Matrix Niveau × Hilfestufe, Prüfung, und der
   Versuchsabzug in einer echten Abnahme (salon-01, Einstiegs-Ticket, auf jedem Niveau gespielt). */
gruppe("Spiel: Stufenregeln", () => {
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally { Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken; }
  };
  const instanz = (niveau, o = {}) => {
    Spiel._einst.wahl = niveau;
    const inst = Spiel.instanzErstellen(Object.assign({ticketId: "salon-01", quelle: "postfach"}, o));
    Spiel.oeffnen(inst.iid);
    return inst;
  };

  pruefe("Matrix: Warnungen, Live-Haken, Grund, Versuchsabzug je Niveau und Hilfestufe", kapsel(() => {
    const soll = {
      E:   {warn: [true, true, true, true],     haken: true,  grund: true,  abzug: 0},
      AP1: {warn: [false, false, true, true],   haken: true,  grund: false, abzug: 0.5},
      AP2: {warn: [false, false, false, false], haken: false, grund: false, abzug: 1},
    };
    for (const [niveau, s] of Object.entries(soll)) {
      const inst = instanz(niveau);
      for (let h = 0; h <= 3; h++) {
        inst.hilfeStufe = h;
        const r = Spiel.regeln(inst);
        erwarte.gleich(r.niveau, niveau, "Niveau");
        erwarte.gleich(r.warnungen, s.warn[h], `${niveau}, Hilfestufe ${h}: Warnungen`);
        erwarte.gleich(r.liveHaken, s.haken, `${niveau}: Live-Haken`);
        erwarte.gleich(r.liveGrund, s.grund, `${niveau}: Grund`);
        erwarte.gleich(r.versuchAbzug, s.abzug, `${niveau}: Versuchsabzug`);
      }
    }
  }));

  pruefe("Prüfung: keine Warnungen, keine Live-Haken, kein Versuchsabzug – auf jedem Niveau", kapsel(() => {
    for (const niveau of ["E", "AP1", "AP2"]) {
      const inst = instanz(niveau, {quelle: "pruefung"});
      inst.hilfeStufe = 3;
      const r = Spiel.regeln(inst);
      erwarte.gleich([r.warnungen, r.liveHaken, r.liveGrund, r.versuchAbzug], [false, false, false, 0], niveau);
    }
  }));

  /* mit Verdacht (Phase B), damit nur der Versuchsabzug zählt */
  const verdacht = inst => { const o = Spiel.verdacht.optionen(inst); Spiel.verdacht.setzen(inst, {schicht: 1, ursache: "kabel-fehlt", geraet: "kasse"}); return o; };
  pruefe("Abnahme: erster Versuch voll, zweiter kostet in AP1 ½ und in AP2 1 Stern, Einstieg nichts", kapsel(() => {
    for (const [niveau, sterne] of [["E", 5], ["AP1", 4.5], ["AP2", 4]]) {
      /* gleich richtig: volle Sterne */
      const a = instanz(niveau);
      verdacht(a);
      Spiel.loesung(a.netz, Spiel.defVon(a).loesung);
      erwarte.gleich(Spiel.abnahme(a).sterne, 5, `${niveau}, erster Versuch`);
      /* erst daneben, dann richtig */
      const b = instanz(niveau);
      verdacht(b);
      const fehl = Spiel.abnahme(b);
      erwarte.falsch(fehl.bestanden, `${niveau}: Start-Netz besteht nicht`);
      Spiel.loesung(b.netz, Spiel.defVon(b).loesung);
      const ab = Spiel.abnahme(b);
      erwarte.wahr(ab.bestanden, `${niveau}: Lösung besteht`);
      erwarte.gleich(ab.sterne, sterne, `${niveau}, zweiter Versuch`);
      erwarte.gleich(ab.abzuege.some(x => /Abnahmeversuch/.test(x.text)), sterne < 5, `${niveau}: Abzug benannt`);
    }
  }));

  pruefe("Verdacht: ohne Verdacht kostet AP1 ½ und AP2 1 Stern, Einstieg und Prüfung nichts; Projekte brauchen keinen", kapsel(() => {
    for (const [niveau, sterne] of [["E", 5], ["AP1", 4.5], ["AP2", 4]]) {
      const a = instanz(niveau);
      Spiel.loesung(a.netz, Spiel.defVon(a).loesung);
      const ab = Spiel.abnahme(a);
      erwarte.gleich(ab.sterne, sterne, `${niveau} ohne Verdacht`);
      erwarte.gleich(ab.abzuege.some(x => /Ohne Verdacht/.test(x.text)), sterne < 5, `${niveau}: Abzug benannt`);
      erwarte.gleich(Spiel.regeln(a).verdachtAbzug, {E: 0, AP1: 0.5, AP2: 1}[niveau]);
    }
    const p = instanz("AP2", {quelle: "pruefung"});
    erwarte.gleich(Spiel.regeln(p).verdachtAbzug, 0, "Prüfung");
    const proj = instanz("AP2", {ticketId: "salon-projekt"});
    erwarte.falsch(Spiel.verdacht.noetig(proj), "Projekt: kein Verdacht");
    Spiel.loesung(proj.netz, Spiel.defVon(proj).loesung);
    erwarte.falsch(Spiel.abnahme(proj).abzuege.some(x => /Ohne Verdacht/.test(x.text)), "Projekt: kein Abzug");
  }));
});
