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

  pruefe("Adressplan: E/AP1/AP2 je Kunde – Blöcke an ihren Grenzen, lückenlos, in der Basis; mit Tabelle bestanden, leer nicht", kapsel(() => {
    const fehler = [];
    for (const kunde of KUNDEN) for (const stufe of ["E", "AP1", "AP2"]) for (let s = 1; s <= 3; s++) {
      const def = Spiel.generiereForm("beratung", 900 + 31 * s + KUNDEN.indexOf(kunde), {kunde, stufe});
      const z = def.ziele[0], soll = Spiel.beratung.soll(z), b = IP.ausCidr(z.basis);
      let erwartet = IP.zuZahl(b.netz);
      for (const r of z.zeilen) {
        const x = soll[r.name], p = Number(x.praefix.slice(1)), groesse = 2 ** (32 - p);
        if (IP.zuZahl(x.netz) !== erwartet) fehler.push(`${def.id}: ${r.name} nicht lückenlos`);
        if (IP.zuZahl(x.netz) % groesse !== 0) fehler.push(`${def.id}: ${r.name} nicht an der Blockgrenze`);
        if (groesse - 2 < r.hosts || (r.praefix == null && groesse / 2 - 2 >= r.hosts)) fehler.push(`${def.id}: ${r.name} Block ${groesse} passt nicht zu ${r.hosts}`);
        if (x.broadcast !== IP.broadcast(x.netz, IP.maske(p))) fehler.push(`${def.id}: Broadcast ${x.broadcast}`);
        erwartet += groesse;
      }
      if (erwartet > IP.zuZahl(b.netz) + 2 ** (32 - b.praefix)) fehler.push(`${def.id}: passt nicht in ${z.basis}`);
      const r = Spiel.testlauf({ids: [def.id], niveau: stufe})[0];
      if (!r.bestanden) fehler.push(`${def.id}: Durchspiel ${r.fehler.join("; ")}`);
      const inst = Spiel.instanzErstellen({gen: {form: "beratung", seed: 900 + 31 * s + KUNDEN.indexOf(kunde), opts: {kunde, stufe}}, quelle: "generiert"});
      Spiel.oeffnen(inst.iid);
      if (Spiel.abnahme(inst).bestanden) fehler.push(`${def.id}: besteht leer`);
    }
    erwarte.gleich(fehler.slice(0, 8), []);
    erwarte.wahr(Spiel.beratung.gleich("praefix", "255.255.255.192", "/26") && Spiel.beratung.gleich("praefix", " 26", "/26") && !Spiel.beratung.gleich("praefix", "/25", "/26"), "Präfix-Schreibweisen");
  }));

  pruefe("Instanz einer generierten Form überlebt Speichern und Laden (inst.gen = {form, seed, opts})", kapsel(() => {
    const inst = Spiel.instanzErstellen({gen: {form: "forensik", seed: 4242, opts: {kunde: "praxis"}}, quelle: "generiert"});
    const id = inst.ticketId;
    delete Spiel.generierte[id];                                     /* wie nach einem Neustart: nur der Spielstand ist da */
    const def = Spiel.defVon(JSON.parse(JSON.stringify(inst)));
    erwarte.wahr(def && def.id === id && def.form === "forensik", id);
  }));
});
