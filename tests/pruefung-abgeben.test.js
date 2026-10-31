"use strict";
/* LRN-04 (3.0.0): Fehlende Prüfungsaufgabe zählt 0. Vertrag: Architektur § 17.2.
   Befund: `if (!inst) continue` + Division durch teile.length — 2 von 3 gelöst ergab 100 Punkte/Note 1.
   Soll: Teil mit {fehlt:true, anteil:0}; Nenner bleibt PRUEFUNG.AUFGABEN; voll gelöst bleibt 100/Note 1. */
gruppe("Prüfung: Fehlende Aufgabe zählt 0 (LRN-04)", () => {
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
      speicher: store.alles(), uhr: jetzt(), defVon: Spiel.defVon, abnahme: Spiel.abnahme};
    const lern = L.st, lernAlt = JSON.parse(JSON.stringify({units: lern.units, log: lern.log, fehler: lern.fehler, tage: lern.tage, tests: lern.tests}));
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      jetzt.setzen(Date.UTC(2026, 10, 1, 8, 0, 0));
      return fn();
    } finally {
      Spiel.defVon = alt.defVon; Spiel.abnahme = alt.abnahme;
      if (SPEICHER.timer) { clearTimeout(SPEICHER.timer); SPEICHER.timer = null; }
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, alt.speicher);
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      lern.units = lernAlt.units; lern.log = lernAlt.log; lern.fehler = lernAlt.fehler; lern.tage = lernAlt.tage; lern.tests = lernAlt.tests;
      jetzt.setzen(alt.uhr); jetzt.frei();
    }
  };
  /* Prüfung mit drei Instanzen; je nach Fall fehlt eine davon (beim Laden bereinigt). */
  function aufbau({fehlt = null} = {}){
    Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
    Spiel._st.pruefung = {art: "AP1", start: jetzt(), ende: null, aufgaben: ["p1", "p2", "p3"]};
    Spiel._st.postfach = ["p1", "p2", "p3"].map(iid => ({iid, ticketId: "salon-01", seed: 1,
      netz: {geraete: {}, kabel: []}, quelle: "pruefung", hilfeStufe: 0, hilfen: [], start: 1, zeitMs: 0, leiter: {}}));
    if (fehlt) Spiel._st.postfach = Spiel._st.postfach.filter(i => i.iid !== fehlt);
    /* Nur die Bewertung wird gestubbt; die Abgabe-Logik ist die echte. */
    Spiel.defVon = () => ({titel: "Testaufgabe", skills: ["lab.link"], loesung: []});
    Spiel.abnahme = () => ({ergebnisse: [{ok: true}, {ok: true}], kollateral: [], neustart: {verlust: false}, bestanden: true});
  }

  pruefe("Voll gelöst: 3 Teile, 100 Punkte, Note 1, bestanden", kapsel(() => {
    aufbau();
    const r = Spiel.pruefung.abgeben();
    erwarte.gleich([r.teile.length, r.punkte, r.note, r.bestanden], [3, 100, 1, true], "voll gelöst bleibt 100/Note 1");
    erwarte.gleich(r.teile.filter(t => t.fehlt).length, 0, "kein fehlender Teil");
    console.log("MESSUNG LRN-04 voll: 3 Teile · " + r.punkte + " Punkte · Note " + r.note);
  }));

  pruefe("Eine von drei Instanzen fehlt: Teile 3, fehlt:true, Zähler 0, punkte <= 67, Note 4", kapsel(() => {
    aufbau({fehlt: "p2"});
    const r = Spiel.pruefung.abgeben();
    erwarte.gleich(r.teile.length, 3, "der Nenner bleibt PRUEFUNG.AUFGABEN (3 Teile)");
    const fehlt = r.teile.find(t => t.fehlt === true);
    erwarte.wahr(!!fehlt, "die fehlende Aufgabe hat einen Teil-Eintrag mit fehlt:true");
    erwarte.gleich([fehlt.anteil, fehlt.bestanden], [0, false], "fehlende Aufgabe zählt 0 und ist nicht bestanden");
    erwarte.wahr(r.punkte <= 67 && r.punkte > 66, "punkte <= 67 (ist " + r.punkte + ")");
    erwarte.gleich(r.note, 4, "2 von 3 gelöst = Note 4, nicht 1");
    console.log("MESSUNG LRN-04 fehlt: 3 Teile (1 fehlt) · " + r.punkte + " Punkte · Note " + r.note);
  }));
});
