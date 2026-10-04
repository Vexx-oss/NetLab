"use strict";
/* EREIGNISSE (Plan – Ausbau 1.2, E3; Architektur § 9.6): Takt nach aktiver Zeit und Einstellung, jedes Ereignis mit Erklärsatz,
   nie Fortschrittsverlust, Stromausfall löscht genau das Ungesicherte, Provider/Praktikant/Kabel sind lösbar, Notfall-Bonus. */
gruppe("Spiel: Ereignisse", () => {
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 5;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally { Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken; }
  };
  const instanz = (id, niveau = "AP1") => { Spiel._einst.wahl = niveau; const i = Spiel.instanzErstellen({ticketId: id, quelle: "postfach"}); Spiel.oeffnen(i.iid); return i; };
  const fortschritt = () => JSON.stringify({stufe: Spiel.st.stufe, erledigt: Spiel.st.erledigt.length, euro: Spiel.st.euro >= 0, kunden: Object.keys(Spiel.st.kunden).sort()});

  pruefe("Takt: aus → nie; selten erst nach 30, normal nach 15 Minuten aktiver Zeit; danach wieder von vorn", kapsel(() => {
    const inst = instanz("salon-05");
    Spiel._einst.ereignisse = "aus"; Spiel.ereignisse.aktivZaehlen(10 * 3600000);
    erwarte.gleich(Spiel.ereignisse.tick({inst}), null, "aus");
    Spiel.st.ereignisse = null;
    Spiel._einst.ereignisse = "selten"; Spiel.ereignisse.aktivZaehlen(29 * 60000);
    erwarte.falsch(Spiel.ereignisse.faellig(), "selten: 29 min");
    Spiel.ereignisse.aktivZaehlen(60000);
    const e = Spiel.ereignisse.tick({inst});
    erwarte.wahr(e && e.text && e.warum, "selten: nach 30 min " + JSON.stringify(e && e.id));
    erwarte.falsch(Spiel.ereignisse.faellig(), "danach Takt von vorn");
    Spiel._einst.ereignisse = "normal"; Spiel.ereignisse.aktivZaehlen(15 * 60000);
    erwarte.wahr(Spiel.ereignisse.faellig(), "normal: 15 min");
  }));

  pruefe("Stromausfall: ungesicherte Reparatur ist weg – mit write memory bleibt sie (Abnahme-Szenario E1)", kapsel(() => {
    const inst = instanz("salon-05");
    const def = Spiel.defVon(inst);
    Spiel.aendern(inst, "nur reparieren", n => Spiel.loesung(n, def.loesung.filter(s => s.aktion !== "speichern")));
    erwarte.wahr(Spiel.zieleStatus(inst).every(s => s.ok), "repariert");
    const e = Spiel.ereignisse.ausloesen("stromausfall", {inst});
    erwarte.wahr(e.weg.length === 1 && /nicht gesichert war, ist weg/.test(e.text), e.text);
    erwarte.wahr(Spiel.zieleStatus(inst).some(s => !s.ok), "Fehler ist zurück");
    Spiel.verlaufVon(inst).zurueck();
    erwarte.wahr(Spiel.zieleStatus(inst).every(s => s.ok), "Strg+Z holt den Stand zurück (nie Fortschrittsverlust)");
    const s = CLI.sitzung(inst.netz, "sw1", {verlauf: Spiel.verlaufVon(inst)});
    CLI.eingabe(s, "enable"); CLI.eingabe(s, "write memory");
    const e2 = Spiel.ereignisse.ausloesen("stromausfall", {inst});
    erwarte.wahr(e2.weg.length === 0 && /nichts verloren/.test(e2.text), e2.text);
    erwarte.wahr(Spiel.zieleStatus(inst).every(s => s.ok), "gesichert = bleibt");
  }));

  pruefe("Jedes Ereignis: Erklärsatz, kein Fortschrittsverlust, und der Auftrag bleibt lösbar", kapsel(() => {
    const vorher = fortschritt();
    for (const id of Object.keys(Spiel.EREIGNISSE)) {
      const inst = instanz("buero-05");
      const e = Spiel.ereignisse.ausloesen(id, {inst});
      erwarte.wahr(e && e.text.length > 20 && e.warum.length > 40, id + ": " + JSON.stringify(e));
      if (["weiterempfehlung", "notfall"].includes(id)) continue;
      /* lösbar: Lösung (inkl. Hilfe-Schritten für den Praktikanten) + Kabel zurück + Provider anrufen */
      if (inst.providerStoerung) Spiel.ereignisse.providerAnrufen(inst);
      if (e.geraet && id === "kabelschaden") Spiel.zuruecksetzen(inst);
      for (const s of Spiel.vorfuehren(inst)) Spiel.vorfuehrenSchritt(inst, s.nr - 1);
      const ab = Spiel.abnahme(inst);
      erwarte.wahr(ab.bestanden, id + ": " + JSON.stringify(ab.ergebnisse.map(x => [x.ok, x.grund]).concat(ab.kollateral.map(k => k.text))));
    }
    const nachher = JSON.parse(fortschritt()), v = JSON.parse(vorher);
    erwarte.wahr(nachher.stufe === v.stufe && nachher.erledigt === v.erledigt, "Stufe und Abschlüsse unverändert");
  }));

  pruefe("Notfall: eigener Auftrag mit 20-min-Frist, rechtzeitig +25 % und +1 Ruf; Weiterempfehlung bringt Auftrag und Ruf", kapsel(() => {
    const inst = instanz("salon-05");
    const e = Spiel.ereignisse.ausloesen("notfall", {inst});
    const n = Spiel.instanz(e.iid);
    erwarte.wahr(n && n.quelle === "notfall" && Math.abs(n.frist - jetzt() - Spiel.NOTFALL_FRIST) < 5000 && n.kunde !== inst.kunde, JSON.stringify(n && {q: n.quelle, k: n.kunde}));
    Spiel.oeffnen(n.iid);
    Spiel.loesung(n.netz, Spiel.defVon(n).loesung);
    const erg = Spiel.abschliessen(n, Spiel.abnahme(n));
    erwarte.wahr(erg.bestanden && erg.lohn.notfall > 0, JSON.stringify(erg.lohn));
    const ruf = Spiel.st.ruf, w = Spiel.ereignisse.ausloesen("weiterempfehlung", {});
    erwarte.wahr(w && Spiel.instanz(w.iid) && Spiel.st.ruf === ruf + 1, JSON.stringify(w));
  }));
});
