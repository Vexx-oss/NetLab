"use strict";
/* FLOW-REGLER (Design – Spielspaß 2.0, Hebel 12 / § 20 F6; Architektur § 9.8): zwei Fehlschläge in einer Fertigkeit → Gerüst
   (Tipp, Haken und Warnungen, kein Versuchsabzug, Generiertes eine Nummer kleiner), drei Glanzergebnisse → Verwicklung (zweiter
   Fehler bzw. eine Nummer größer, keine Warnungen, kein Senior-Angebot). Einstellung „manuell“ schaltet alles ab. */
gruppe("Spiel: Flow-Regler", () => {
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken, gen: Object.assign({}, Spiel.generierte)};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally { Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken; Spiel.generierte = alt.gen; }
  };

  pruefe("Stand je Fertigkeit: zwei Fehlschläge → Gerüst, ein Erfolg → normal, drei Glanz → Verwicklung, Fehlschlag → normal", kapsel(() => {
    const m = a => Spiel.flow.merken("lab.gateway", a).stand;
    erwarte.gleich([m("f"), m("f"), m("n"), m("g"), m("g"), m("g"), m("g"), m("f"), m("f")],
      ["normal", "geruest", "normal", "normal", "normal", "verwicklung", "verwicklung", "normal", "geruest"]);
    erwarte.gleich(Spiel.flow.stand("lab.dns"), "normal", "andere Fertigkeit unberührt");
    erwarte.gleich(Spiel.flow.daten("lab.gateway").letzte.length, Spiel.FLOW.MERKEN, "höchstens fünf gemerkt");
    /* Bewertung: bezahlte Hilfe oder zweiter Versuch = Fehlschlag; 5 ★ im ersten Versuch ohne Senior = Glanz */
    erwarte.gleich([Spiel.flow.bewerten({abnahmen: 1, hilfeStufe: 0}, 5), Spiel.flow.bewerten({abnahmen: 1, hilfeStufe: 2}, 5), Spiel.flow.bewerten({abnahmen: 1, hilfeStufe: 3}, 5),
      Spiel.flow.bewerten({abnahmen: 2, hilfeStufe: 0}, 4.5), Spiel.flow.bewerten({abnahmen: 1, hilfeStufe: 4}, 4.5), Spiel.flow.bewerten({abnahmen: 1, hilfeStufe: 0}, 4.5)],
      ["g", "g", "n", "f", "f", "n"]);
    erwarte.gleich(Spiel.flow.nachAbschluss({quelle: "pruefung"}, {skills: ["lab.gateway"]}, {sterne: 5}), null, "Prüfung zählt nicht");
  }));

  pruefe("Gerüst: Auftrag merkt sich den Stand, Regeln wie im Einstieg (auch AP2), Plan-Audit eine Nummer kleiner – beim Neuladen gleich", kapsel(() => {
    const opts = {kunde: "salon", stufe: "AP1"};
    const normal = Spiel.instanzErstellen({gen: {form: "audit", seed: 4, opts}, quelle: "generiert"});
    const skill = Spiel.defVon(normal).skills[0];
    erwarte.gleich([normal.flow, Spiel.defVon(normal).planFehler.length], [null, 2], "ohne Flow: AP1-Audit mit zwei Fehlern");
    Spiel.flow.daten(skill).stand = "geruest";
    const i = Spiel.instanzErstellen({gen: {form: "audit", seed: 4, opts}, quelle: "generiert"}), def = Spiel.defVon(i);
    erwarte.wahr(i.flow === "geruest" && def.stufe === "E" && def.planFehler.length === 1, JSON.stringify([i.flow, def.stufe, def.planFehler.length]));
    erwarte.gleich(Spiel.ticketDef(i.ticketId, i).id, def.id, "gen.opts tragen die kleinere Fassung");
    Spiel._einst.wahl = "AP2";
    const r = Spiel.regeln(i);
    erwarte.wahr(r.warnungen && r.liveHaken && r.liveGrund && r.versuchAbzug === 0 && r.flow === "geruest", JSON.stringify(r));
    Spiel._einst.anpassung = "manuell";
    erwarte.gleich(Spiel.instanzErstellen({gen: {form: "audit", seed: 4, opts}, quelle: "generiert"}).flow, null, "manuell: keine Anpassung");
  }));

  pruefe("Verwicklung: generierte Störung mit zweitem Fehler, der ein weiteres Ziel bricht; die Lösung behebt beide; keine Warnungen, kein Senior-Angebot", kapsel(() => {
    const ohne = Spiel.generiere("lab.gateway", 3, {stufe: "E"});
    erwarte.gleich(ohne.injektoren.length, 1);
    Spiel.flow.daten("lab.gateway").stand = "verwicklung";
    let geprueft = 0;
    for (const seed of [3, 5, 8, 13]) {
      const i = Spiel.instanzErstellen({gen: {skill: "lab.gateway", seed, opts: {stufe: "E"}}, quelle: "generiert"}), def = Spiel.defVon(i);
      erwarte.wahr(i.flow === "verwicklung" && /-verwicklung$/.test(def.id) && def.injektoren.length === 2, `${seed}: ${def.id} ${def.injektoren}`);
      const vorher = def.ziele.filter(z => z.erwartet).length;
      erwarte.wahr(vorher >= 2, `${seed}: zwei Fehler brechen mindestens zwei Ziele (${vorher})`);
      const n = def.netz(Zufall(1));
      Spiel.loesung(n, def.loesung);
      erwarte.wahr(def.ziele.every(z => Spiel.istArbeitsziel(z) || Sim.pruefeZiel(n, z).ok), `${seed}: Lösung behebt beide`);
      const r = Spiel.regeln(i);
      erwarte.wahr(!r.warnungen && r.flow === "verwicklung", `${seed}: keine Warnungen im Einstieg`);
      i.geoeffnet = 1; i.fortschritt = 1;
      erwarte.falsch(Spiel.seniorFaellig(i), `${seed}: kein Hilfsangebot des Seniors`);
      geprueft++;
    }
    erwarte.gleich(geprueft, 4);
  }));

  pruefe("Abschluss merkt das Ergebnis: zweimal zäh → der nächste Auftrag dieser Fertigkeit kommt mit Gerüst", kapsel(() => {
    Spiel._einst.wahl = "E";
    const zaeh = () => {
      const i = Spiel.instanzErstellen({ticketId: "salon-02", quelle: "postfach"});
      Spiel.oeffnen(i.iid);
      erwarte.falsch(Spiel.abnahme(i).bestanden, "erster Versuch daneben");
      Spiel.aendern(i, "Lösung", n => Spiel.loesung(n, Spiel.defVon(i).loesung));
      return Spiel.abschliessen(i, Spiel.abnahme(i));
    };
    const skill = DATEN.tickets.find(t => t.id === "salon-02").skills[0];
    erwarte.gleich(zaeh().flow.stand, "normal");
    const zwei = zaeh();
    erwarte.wahr(zwei.flow.art === "f" && zwei.flow.stand === "geruest" && zwei.flow.skill === skill, JSON.stringify(zwei.flow));
    erwarte.gleich(Spiel.instanzErstellen({ticketId: "salon-03", quelle: "postfach"}).flow, Spiel.defVon({ticketId: "salon-03"}).skills[0] === skill ? "geruest" : null);
    erwarte.gleich(Spiel.instanzErstellen({ticketId: "salon-02", quelle: "postfach"}).flow, "geruest", "gleiche Fertigkeit: mit Gerüst");
  }));
});
