"use strict";
/* AUFTRAGSFORMEN (Plan – Ausbau 1.2, E1; Architektur § 9.6): Jede generierte Form liefert für jeden passenden Kunden gültige,
   deterministische Aufträge, die mit der hinterlegten Arbeit bestehen – und ohne sie nicht. */
gruppe("Spiel: Auftragsformen", () => {
  const KUNDEN = ["salon", "baeckerei", "schreibbuero", "praxis", "autohaus", "mittelstand"];
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally { Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken; }
  };
  const pflicht = ["id", "art", "stufe", "karriere", "kunde", "titel", "briefing", "symptom", "skills", "ziele", "hilfen", "loesung", "erklaerung", "quelle", "lohn"];

  pruefe("Fernwartung: je Kunde 4 Seeds – gültig, deterministisch, Fehler bricht ein Netzziel, nur per Befehl lösbar", kapsel(() => {
    const fehler = [], arten = new Set();
    for (const kunde of KUNDEN) for (let s = 1; s <= 4; s++) {
      const seed = 7000 + 10 * s + KUNDEN.indexOf(kunde);
      let def;
      try { def = Spiel.generiereForm("forensik", seed, {kunde}); } catch (e) { fehler.push(`${kunde}/${s}: ${e.message}`); continue; }
      for (const f of pflicht) if (def[f] == null || def[f] === "") fehler.push(`${def.id}: Feld ${f}`);
      if (Spiel.formVon(def) !== "forensik" || !def.fernwartung) fehler.push(`${def.id}: Form/Fernwartung fehlt`);
      if (!def.ziele.some(z => z.erwartet)) fehler.push(`${def.id}: kein gebrochenes Netzziel`);
      if (def.ziele.filter(z => z.typ === "befehl").some(z => z.geraet !== def.fernwartung)) fehler.push(`${def.id}: Befehl auf anderem Gerät`);
      if (/(falsch|fehlt|aus|Tippfehler|Maske|Gateway|DNS-Server)/i.test(def.titel) && !/nicht/.test(def.titel)) fehler.push(`${def.id}: Titel verrät die Ursache: ${def.titel}`);
      delete Spiel.generierte[def.id];
      const zweimal = Spiel.generiereForm("forensik", seed, {kunde});
      if (JSON.stringify(zweimal.netz(Zufall(1))) !== JSON.stringify(def.netz(Zufall(1)))) fehler.push(`${def.id}: nicht deterministisch`);
      arten.add(def.injektoren[0]);
      const r = Spiel.testlauf({ids: [def.id]})[0];
      if (!r.bestanden) fehler.push(`${def.id}: Durchspiel ${r.fehler.join("; ")}`);
      const inst = Spiel.instanzErstellen({gen: {form: "forensik", seed, opts: {kunde}}, quelle: "generiert"});
      Spiel.oeffnen(inst.iid);
      Spiel.loesung(inst.netz, def.loesung);                         /* Netz repariert, aber nichts im Terminal getan */
      if (Spiel.abnahme(inst).bestanden) fehler.push(`${def.id}: besteht ohne Befehle`);
    }
    erwarte.gleich(fehler, []);
    erwarte.wahr(arten.size >= 5, "Fehlerarten: " + [...arten].join(", "));
  }));

  pruefe("Instanz einer generierten Form überlebt Speichern und Laden (inst.gen = {form, seed, opts})", kapsel(() => {
    const inst = Spiel.instanzErstellen({gen: {form: "forensik", seed: 4242, opts: {kunde: "praxis"}}, quelle: "generiert"});
    const id = inst.ticketId;
    delete Spiel.generierte[id];                                     /* wie nach einem Neustart: nur der Spielstand ist da */
    const def = Spiel.defVon(JSON.parse(JSON.stringify(inst)));
    erwarte.wahr(def && def.id === id && def.form === "forensik", id);
  }));
});
