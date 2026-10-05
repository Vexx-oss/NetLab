"use strict";
/* KUNDENAKTE (Design – Spielspaß 2.0, Hebel 10; Architektur § 9.7): Atlas leuchtet, wo man gearbeitet hat; Vertrauen wächst durch
   saubere Arbeit (Provisorium bringt nichts, nichts sinkt); Kapitel öffnen sich mit dem Vertrauen; Baustellen = offene Provisorien. */
gruppe("Spiel: Kundenakte", () => {
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally { Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken; }
  };
  const loesen = (id, niveau = "E", vorher) => {
    Spiel._einst.wahl = niveau;
    const inst = Spiel.instanzErstellen({ticketId: id, quelle: "postfach"});
    Spiel.oeffnen(inst.iid);
    if (vorher) vorher(inst);
    Spiel.aendern(inst, "Lösung", n => Spiel.loesung(n, Spiel.defVon(inst).loesung));
    Spiel.arbeitszieleErfuellen(inst);
    return Spiel.abschliessen(inst, Spiel.abnahme(inst));
  };

  pruefe("Geschichten: 7 Kunden × 3 Kapitel, frei ab Vertrauen 2/3/4, jede mit Senior-Satz, Frage (3 Antworten), Erklärung und Quelle", () => {
    const kunden = Object.keys(DATEN.kunden).sort();
    erwarte.gleich(Object.keys(DATEN.geschichten).sort(), kunden);
    const f = [];
    for (const k of kunden) {
      const g = DATEN.geschichten[k];
      if (JSON.stringify(g.map(x => [x.nr, x.ab])) !== "[[1,2],[2,3],[3,4]]") f.push(k + ": Nummern/Schwellen");
      for (const x of g) {
        if (!x.titel || !x.text || x.text.length > 420 || !/^„.*“$/.test(x.senior) || !x.quelle) f.push(`${k}/${x.nr}: Text, Senior oder Quelle`);
        if (x.frage.optionen.length !== 3 || !(x.frage.richtig >= 0 && x.frage.richtig < 3) || !x.frage.erklaerung) f.push(`${k}/${x.nr}: Frage`);
      }
    }
    erwarte.gleich(f, []);
    const richtig = kunden.flatMap(k => DATEN.geschichten[k].map(x => x.frage.richtig));
    erwarte.wahr(new Set(richtig).size === 3, "richtige Antwort steht nicht immer an derselben Stelle");
  });

  pruefe("Atlas: dokumentiertes Netz je Kunde (ohne Internet); nach einem Auftrag leuchten die bearbeiteten und geprüften Geräte", kapsel(() => {
    for (const k of Object.keys(DATEN.kunden)) {
      const a = Spiel.kundenakte.atlas(k);
      erwarte.wahr(a && a.gesamt.length >= 4 && a.hell.length === 0 && a.plan.knoten.length > a.gesamt.length - 1, k);
    }
    const erg = loesen("salon-02");                                 /* Tippfehler in der IP der Kasse */
    const ka = erg.kundenakte;
    erwarte.wahr(ka && ka.neuHell.includes("kasse") && ka.hell >= 2 && !ka.komplett, JSON.stringify(ka));
    erwarte.gleich(Spiel.kundenakte.atlas("salon").hell.sort(), ka.neuHell.slice().sort());
  }));

  pruefe("Vertrauen: ★ ≥ 4,5 und „sauber“ zählen, Provisorium nicht; Kapitel öffnen sich; Antwort +1 Ruf nur beim ersten Mal", kapsel(() => {
    erwarte.gleich([0, 1, 2, 4, 5, 8, 9, 13, 14, 99].map(Spiel.kundenakte.vertrauenAus), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    loesen("praxis-03", "AP1", inst => { Spiel.varianten.waehlen(inst, "provisorium"); });
    erwarte.gleich(Spiel.kundenakte.daten("praxis").punkte, 0, "Provisorium: kein Vertrauen");
    erwarte.gleich(Spiel.kundenakte.baustellen("praxis").length, 1, "offene Baustelle");
    const erg = loesen("praxis-03", "E", inst => { Spiel.varianten.waehlen(inst, "sauber"); Spiel.notizSetzen(inst, "Trunk erlaubt wieder VLAN 20, gesichert."); });
    erwarte.wahr(Spiel.kundenakte.daten("praxis").punkte >= 1, "sauber zählt: " + JSON.stringify(erg.kundenakte));
    erwarte.wahr(Spiel.kundenakte.kapitel("praxis").every(k => !k.gelesen));
    Spiel.kundenakte.daten("praxis").punkte = 2;
    const k = Spiel.kundenakte.kapitel("praxis");
    erwarte.gleich(k.map(x => x.frei), [true, false, false], "Vertrauen 2 → Kapitel 1");
    erwarte.gleich(Spiel.kundenakte.lesen("praxis", 2), null, "Kapitel 2 noch zu");
    const ruf = Spiel.st.ruf, g = DATEN.geschichten.praxis[0];
    const a = Spiel.kundenakte.antworten("praxis", 1, g.frage.richtig);
    erwarte.wahr(a.richtig && a.erstes && Spiel.st.ruf === ruf + 1, "+1 Ruf");
    Spiel.kundenakte.antworten("praxis", 1, g.frage.richtig);
    erwarte.gleich(Spiel.st.ruf, ruf + 1, "nur beim ersten Mal");
  }));
});
