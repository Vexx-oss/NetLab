"use strict";
/* LERNVERBUCHUNG JE FERTIGKEIT (task-19, Review „Lernwirkung" Befund P1-2).

   Vorher: `inst.hilfen` trug `{stufe, frei, t}` — keinen Fertigkeitsbezug. Der Lernmotor sah nur
   `inst.hilfeStufe >= 4` als binäres `{hilfe:true}` für ALLE Fertigkeiten des Tickets. Folge (gemessen):
   eine mit der kostenlosen OSI-Checkliste (Sprosse 1) gelöste Aufgabe stieg im Leitner-Plan wie eine
   selbst gelöste — Kasten 0 → 1.

   Geprüft wird die WIRKUNG, nicht nur die Form: Was steht danach in `L.box`/`L.get(id).due`, und was
   meldet der echte Weg (`Spiel.abschliessen` → `Spiel.lernenNachAbnahme`)? Die reinen Entscheidungen
   werden zusätzlich direkt an `Spiel.hilfeFuerSkill` gemessen.

   Die zwei Fallen, die der Lead genannt hat, sind hier umgangen: `Spiel.einst.wahl` wird gepinnt, statt
   `inst.niveau` zu setzen (Spiel.niveauVon überschreibt es, lernen.js), und Tickets kommen aus dem
   Generator (echtes Netz) statt aus einer Attrappe ohne `netz.geraete`. */
gruppe("Spiel: Hilfe-Lernverbuchung", () => {
  /* Wegwerf-Stand wie in den anderen Spieltests; zusätzlich wird der LERNMOTOR auf einen frischen
     Zustand gesetzt und danach wiederhergestellt (L.ueben wirkt sonst über diesen Test hinaus). */
  function kapsel(fn, {trocken = true} = {}){
    const alt = {
      st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
      labor: store.get("labor", null), einstStore: store.get("einst", null),
      gen: Object.assign({}, Spiel.generierte),
    };
    const lern = L.st;
    const lernAlt = JSON.parse(JSON.stringify({units: lern.units, log: lern.log, fehler: lern.fehler, tage: lern.tage, tests: lern.tests}));
    try {
      Spiel._trocken = trocken; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      lern.units = {}; lern.log = []; lern.fehler = []; lern.tage = {};      /* frischer Lernstand */
      return fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      store.set("labor", alt.labor); store.set("einst", alt.einstStore);
      for (const k of Object.keys(Spiel.generierte)) if (!(k in alt.gen)) delete Spiel.generierte[k];
      lern.units = lernAlt.units; lern.log = lernAlt.log; lern.fehler = lernAlt.fehler; lern.tage = lernAlt.tage; lern.tests = lernAlt.tests;
      store.set("lern", lern);
      jetzt.frei();
    }
  }

  /* Ein echter Auftrag mit ZWEI Fertigkeiten: der Generator hängt an die gewünschte Fertigkeit die des
     Injektors an (`skills: [skill, …].slice(0, 2)`, generator.js:212). */
  function zweiSkills(){
    for (const [skill, seed] of [["lab.vlan", 1], ["lab.vlan", 2], ["lab.link", 3], ["lab.gateway", 1], ["lab.dhcp", 1]]) {
      let inst = null;
      try { inst = Spiel.instanzErstellen({gen: {skill, seed, opts: {stufe: "E"}}, quelle: "postfach", ohneFlow: true}); }
      catch (e) { continue; }
      const def = Spiel.defVon(inst);
      if (def && (def.skills || []).length >= 2 && def.skills[0] === skill) return {inst, def};
    }
    return null;
  }
  const fertig = (inst, def) => {
    Spiel.oeffnen(inst.iid);
    Spiel.loesung(inst.netz, def.loesung);
    if (typeof Spiel.arbeitszieleErfuellen === "function") Spiel.arbeitszieleErfuellen(inst);
    Spiel._einst.wahl = "E";                       /* Niveau pinnen — nicht inst.niveau (Lead-Falle) */
    return Spiel.abnahme(inst);
  };

  pruefe("Spiel.hilfe trägt die Fertigkeit ein — und lässt die Deckung (P1-1) unverändert", () => kapsel(() => {
    const p = zweiSkills();
    erwarte.wahr(!!p, "kein generiertes Ticket mit zwei Fertigkeiten gefunden");
    const {inst, def} = p;
    for (let n = 0; n < 6; n++) Spiel.hilfe(inst);
    erwarte.gleich(inst.hilfen.map(h => h.stufe), [1, 2, 3, 4, 5, 6], "sechs Sprossen, keine Phantom-Sprosse");
    erwarte.gleich(inst.hilfen.map(h => h.skill), Array(6).fill(def.skills[0]), "ohne zweiten Parameter: die Hauptfertigkeit");
    erwarte.gleich(inst.hilfen.map(h => h.frei), [false, false, false, true, true, true], "Deckung erst ab Sprosse 4 (P1-1 unberührt)");
    erwarte.wahr(inst.hilfen.every(h => typeof h.t === "number" && h.t > 0), "jeder Eintrag hat einen Zeitstempel");
    /* Der zweite Parameter ist optional und gewinnt gegen die Hauptfertigkeit. */
    const q = zweiSkills();
    Spiel.hilfe(q.inst, {skill: "lab.cli"});
    erwarte.gleich(q.inst.hilfen[0].skill, "lab.cli", "zweiter Parameter gewinnt");
  }));

  pruefe("je Fertigkeit entschieden: sechs Hilfen zur einen, die andere steigt normal (echter Weg)", () => kapsel(() => {
    const p = zweiSkills();
    erwarte.wahr(!!p, "kein Ticket mit zwei Fertigkeiten");
    const {inst, def} = p;
    const [a, b] = def.skills;
    for (let n = 0; n < 6; n++) Spiel.hilfe(inst);          /* alle sechs zur Hauptfertigkeit a */
    erwarte.wahr(Spiel.hilfeFuerSkill(inst, def, a), "geholfene Fertigkeit: Hilfe zählt");
    erwarte.falsch(Spiel.hilfeFuerSkill(inst, def, b), "zweite Fertigkeit ohne eigene Hilfe: zählt nicht");
    const ab = fertig(inst, def);
    erwarte.wahr(ab.bestanden, "Lösung besteht die Abnahme");
    const erg = Spiel.abschliessen(inst, ab);               /* ruft Spiel.lernenNachAbnahme */
    const von = id => erg.lernen.find(l => l.id === id) || {};
    erwarte.gleich([von(a).vorher, von(a).nachher], [0, 0], "geholfene Fertigkeit: Kasten bleibt stehen");
    erwarte.gleich([von(b).vorher, von(b).nachher], [0, 1], "unbeteiligte Fertigkeit: Kasten steigt");
    erwarte.gleich([L.box(a), L.box(b)], [0, 1], "so steht es im Lernmotor");
    erwarte.gleich(L.get(a).due, plusTage(heute(), 1), "die Wiederholung kommt morgen");
    /* Und der Plan merkt den Unterschied auch beim nächsten Mal: a bleibt bei 1 Tag, b geht auf 3. */
    jetzt.setzen(new Date(L.get(a).due + "T12:00:00").getTime());
    const a2 = L.ueben(a, true, {hilfe: Spiel.hilfeFuerSkill(inst, def, a)});
    const b2 = L.ueben(b, true, {hilfe: Spiel.hilfeFuerSkill(inst, def, b)});
    erwarte.gleich([a2.vorher, a2.nachher], [0, 0], "mit Hilfe: zweiter Erfolg hebt den Kasten nicht");
    erwarte.gleich([b2.vorher, b2.nachher], [1, 2], "ohne Hilfe: der Kasten steigt weiter");
    erwarte.gleich([tageZwischen(heute(), L.get(a).due), tageZwischen(heute(), L.get(b).due)], [1, 3], "Abstand 1 Tag gegen 3 Tage");
  }, {trocken: false}));

  pruefe("Sprosse 1–3 (kostenlose Leiter) heben den Kasten nicht — ganz ohne Hilfe steigt er", () => kapsel(() => {
    const p = zweiSkills();
    erwarte.wahr(!!p, "kein Ticket mit zwei Fertigkeiten");
    const {inst, def} = p;
    const a = def.skills[0];
    Spiel.hilfe(inst);                                       /* genau eine Sprosse: die Checkliste */
    erwarte.gleich(inst.hilfen.map(h => h.stufe), [1]);
    erwarte.gleich(inst.hilfen[0].frei, false, "Sprosse 1 verbraucht keinen Vorrat");
    erwarte.wahr(Spiel.hilfeFuerSkill(inst, def, a), "leichter Hinweis bei Kasten 0 zählt als Hilfe");
    const mit = Spiel.lernenNachAbnahme(inst, def, {bestanden: true, ergebnisse: []});
    erwarte.gleich([mit[0].vorher, mit[0].nachher], [0, 0], "Kasten bleibt stehen (Sprosse 1)");
    /* Kontrolle: derselbe Ausgangspunkt, dieselbe Fertigkeit, aber ohne jede Hilfe. */
    L.st.units = {};
    const ohne = Spiel.lernenNachAbnahme({hilfen: [], hilfeStufe: 0, netz: inst.netz}, def, {bestanden: true, ergebnisse: []});
    erwarte.gleich([ohne[0].vorher, ohne[0].nachher], [0, 1], "ohne Hilfe steigt der Kasten");
  }, {trocken: false}));

  pruefe("Altstand ohne Fertigkeit am Eintrag verhält sich wie bisher (binär ab Sprosse 4)", () => kapsel(() => {
    const p = zweiSkills();
    erwarte.wahr(!!p, "kein Ticket mit zwei Fertigkeiten");
    const {inst, def} = p;
    const [a, b] = def.skills;
    const alt = {hilfen: [{stufe: 1}, {stufe: 2}, {stufe: 3}], hilfeStufe: 3, netz: inst.netz};
    erwarte.gleich([Spiel.hilfeFuerSkill(alt, def, a), Spiel.hilfeFuerSkill(alt, def, b)], [false, false], "1–3 allein ändern nichts (wie bisher)");
    alt.hilfen.push({stufe: 4}); alt.hilfeStufe = 4;
    erwarte.gleich([Spiel.hilfeFuerSkill(alt, def, a), Spiel.hilfeFuerSkill(alt, def, b)], [true, true], "ab Sprosse 4 gilt sie für alle (wie bisher)");
    /* Ein Stand mit Zuordnung: nur die zugeordnete Fertigkeit ist betroffen. */
    const neu = {hilfen: [{stufe: 6, skill: b}], hilfeStufe: 6, netz: inst.netz};
    erwarte.gleich([Spiel.hilfeFuerSkill(neu, def, b), Spiel.hilfeFuerSkill(neu, def, a)], [true, false], "Zuordnung wirkt nur für ihre Fertigkeit");
    /* Und ein Eintrag mit ausdrücklichem null (kein auflösbares Ticket) zählt als Altstand, nicht als Zuordnung. */
    const leer = {hilfen: [{stufe: 5, skill: null}], hilfeStufe: 5, netz: inst.netz};
    erwarte.wahr(Spiel.hilfeFuerSkill(leer, def, a), "skill:null = Altstand → binär");
  }));

  pruefe("ohne Hilfe steigt jede Fertigkeit normal; fehlende Listen werfen nicht", () => kapsel(() => {
    const p = zweiSkills();
    erwarte.wahr(!!p, "kein Ticket mit zwei Fertigkeiten");
    const {inst, def} = p;
    erwarte.gleich(def.skills.map(id => Spiel.hilfeFuerSkill(inst, def, id)), [false, false], "keine Hilfe, kein Hilfe-Flag");
    erwarte.gleich([Spiel.hilfeFuerSkill(null, def, "lab.vlan"), Spiel.hilfeFuerSkill({}, def, "lab.vlan"),
      Spiel.hilfeFuerSkill({hilfen: null}, def, "lab.vlan"), Spiel.hilfeFuerSkill({hilfen: []}, null, "lab.vlan")], [false, false, false, false], "kein Wurf bei halben Eingaben");
    const r = Spiel.lernenNachAbnahme(inst, def, {bestanden: true, ergebnisse: []});
    erwarte.gleich(r.map(x => [x.vorher, x.nachher]), [[0, 1], [0, 1]], "beide Fertigkeiten steigen");
  }, {trocken: false}));

  pruefe("Flow: Sprosse 6 gibt sofort Gerüst, 4–5 bleiben Fehlschlag, 1–2 bleiben wie bisher Glanz", () => kapsel(() => {
    const skill = "lab.vlan";
    const zurueck = () => { const d = Spiel.flow.daten(skill); d.letzte = []; d.stand = "normal"; };
    const nach = h => Spiel.flow.nachAbschluss({quelle: "postfach", abnahmen: 1, hilfeStufe: h}, {skills: [skill]}, {sterne: 5});
    /* Jeden Fall GENAU EINMAL auswerten: jeder Aufruf ist ein Ereignis im Flow-Verlauf. */
    const fall = h => { zurueck(); const r = nach(h); return [r.art, r.stand]; };
    erwarte.gleich(fall(6), ["f", "geruest"], "Lösung vorgeführt → sofort Gerüst");
    erwarte.gleich(fall(5), ["f", "normal"], "Sprosse 5: Fehlschlag, Gerüst erst nach zwei");
    erwarte.gleich(fall(2), ["g", "normal"], "Sprosse 1–2: heute Glanz (tests/spiel-flow.test.js:23-25 pinnt das)");
    erwarte.gleich(fall(0), ["g", "normal"], "ohne Hilfe unverändert");
    zurueck(); Spiel.flow.merken(skill, "f");
    erwarte.gleich(Spiel.flow.stand(skill), "normal", "ein einzelner Fehlschlag gibt noch kein Gerüst");
    Spiel.flow.merken(skill, "f");
    erwarte.gleich(Spiel.flow.stand(skill), "geruest", "zwei in Folge wie bisher");
  }));

  pruefe("Spiel.hilfe bleibt ohne zweiten Parameter aufrufbar (Rückwärtsverträglichkeit der Aufrufer)", () => kapsel(() => {
    const inst = Spiel.instanzErstellen({ticketId: "salon-01", quelle: "postfach"});
    const def = Spiel.defVon(inst);
    const r = Spiel.hilfe(inst);                              /* so rufen ui/spiel.js und ui/netzplan.js */
    erwarte.gleich(r.stufe, 1, "wie bisher der Inhalt der Sprosse");
    erwarte.gleich(inst.hilfen[0].skill, (def.skills || [])[0] || null, "Fertigkeit automatisch aus der Aufgabe");
    erwarte.gleich(inst.hilfeStufe, 1);
    const zwei = Spiel.hilfe(inst, {skill: "lab.cli"});
    erwarte.gleich([zwei.stufe, inst.hilfen[1].skill], [2, "lab.cli"]);
    /* Schutz gegen die frühere Phantom-Sprosse: sechs Züge ergeben genau sechs Einträge. */
    for (let n = 0; n < 4; n++) Spiel.hilfe(inst);
    erwarte.gleich(inst.hilfen.map(h => h.stufe), [1, 2, 3, 4, 5, 6], "keine Sprosse 7");
    erwarte.gleich(Spiel.hilfe(inst).stufe, 6, "über Sprosse 6 hinaus bleibt es bei 6");
    erwarte.gleich(inst.hilfen.length, 6, "und es kommt kein weiterer Eintrag dazu");
  }));
});
