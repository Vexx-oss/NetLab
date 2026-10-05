"use strict";
/* KUNDENAKTE (Design – Spielspaß 2.0, Hebel 10; Architektur § 9.7): Atlas leuchtet, wo man gearbeitet hat; Vertrauen wächst durch
   saubere Arbeit (Provisorium bringt nichts, nichts sinkt); Kapitel öffnen sich mit dem Vertrauen; Baustellen = offene Provisorien. */
gruppe("Spiel: Kompetenzkarte", () => {
  pruefe("27 Felder in 6 Regionen = genau DATEN.skills; Nebel lichtet sich durch Stufe und geübte Nachbarn; Stufen aus dem Lernmotor", () => {
    const ids = Spiel.KOMPETENZ_REGIONEN.flatMap(r => r.skills);
    erwarte.gleich(ids.length, 27);
    erwarte.gleich(ids.slice().sort(), DATEN.skills.map(s => s.id).sort(), "jede Fertigkeit genau einmal");
    erwarte.gleich(Spiel.KOMPETENZ_REGIONEN.length, 6);
    for (const [a, b] of Spiel.KOMPETENZ_BRUECKEN) erwarte.wahr(ids.includes(a) && ids.includes(b), a + "–" + b);
    const leer = Spiel.kompetenz.karte({versucht: () => false, box: () => 0}, 1);
    const stufe1 = DATEN.skills.filter(s => s.stufe === 1).length;
    erwarte.gleich([leer.gesamt, leer.sichtbar], [27, stufe1], "Start: nur Stufe 1 sichtbar, Rest Nebel");
    const geuebt = new Set(["lab.gateway"]);
    const k = Spiel.kompetenz.karte({versucht: id => geuebt.has(id), box: () => 3}, 1);
    const feld = id => k.regionen.flatMap(r => r.felder).find(f => f.id === id);
    erwarte.gleich(feld("lab.gateway").zustand, "sicher", "Box 3 = sicher");
    erwarte.gleich(feld("lab.route").zustand, "offen", "Nachbar über die Brücke lichtet den Nebel (Routing ist Stufe 4)");
    erwarte.gleich(feld("lab.dmz").zustand, "nebel");
    const erwartet = new Set([...DATEN.skills.filter(s => s.stufe === 1).map(s => s.id), ...Spiel.kompetenz.nachbarn("lab.gateway")]);
    erwarte.gleich(k.sichtbar, erwartet.size, "sichtbar = Stufe 1 + Nachbarn des geübten Felds (lab.subnetz, lab.route)");
  });
});

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

  /* § 20 F5: Vertrauen zahlt aus – ab 3 eine Empfehlung (nächster verschlossener Kunde eine Stufe früher), ab 4 −20 % Wartung */
  const stufe1 = fn => kapsel(() => { Spiel._st.stufe = 1; Spiel._st.ruf = 0; fn(); });
  pruefe("Vertrauen 3: Empfehlung – das Schreibbüro kommt eine Stufe früher und schickt gleich einen Auftrag; nur einmal", stufe1(() => {
    erwarte.falsch(Spiel.karriere.kundeOffen("schreibbuero"), "vorher zu (Ruf 10 nötig)");
    erwarte.falsch(Spiel.mischer.kandidaten().some(k => k.kunde === "schreibbuero"), "vorher keine Aufträge vom Schreibbüro");
    Spiel.kundenakte.daten("salon").punkte = 4;                                   /* Vertrauen 2, ein Glanzauftrag fehlt */
    const erg = loesen("salon-02");
    const e = erg.kundenakte.empfehlung;
    erwarte.wahr(erg.sterne >= 4.5 && e && e.neu && e.kunde === "schreibbuero" && e.von === "salon", JSON.stringify(e));
    erwarte.wahr(/^Mira Kaya hat dich an Konrad Albers \(Schreibbüro Wortgenau\) empfohlen/.test(e.text), e.text);
    erwarte.wahr(Spiel.st.ruf < 10 && Spiel.karriere.kundeOffen("schreibbuero"), "offen mit Ruf " + Spiel.st.ruf);
    const auftrag = Spiel.instanz(e.iid);
    erwarte.wahr(auftrag && auftrag.kunde === "schreibbuero" && auftrag.empfehlung === "salon", "Auftrag im Postfach");
    erwarte.wahr(erg.karten.includes(e), "Karte nach dem Ergebnis");
    erwarte.wahr(Spiel.mischer.kandidaten().some(k => k.kunde === "schreibbuero" && k.gen), "der Mischer kennt jetzt das Schreibbüro");
    erwarte.wahr(Spiel.kundenakte.belohnungen("salon")[0].da, "Akte: Empfehlung erledigt");
    erwarte.gleich(loesen("salon-03").kundenakte.empfehlung, null, "jeder Kunde empfiehlt nur einmal");
  }));

  pruefe("in der ersten Stunde wartet die Empfehlung, danach kommt sie beim nächsten Auftrag dieses Kunden", stufe1(() => {
    Spiel._st.ersteStunde = {fertig: false, ereignis: false};
    Spiel.kundenakte.daten("salon").punkte = 4;
    erwarte.gleich(loesen("salon-03").kundenakte.empfehlung, null, "erste Stunde: noch nicht");
    Spiel._st.ersteStunde.fertig = true;
    erwarte.wahr(loesen("salon-04").kundenakte.empfehlung, "danach");
  }));

  pruefe("Vertrauen 4: Wartungsvertrag 20 % günstiger – im Shop-Eintrag, den auch der Kauf bezahlt", stufe1(() => {
    const voll = Spiel.karriere.kunde("salon").vertragPreis;
    erwarte.gleich(Spiel.karriere.kunde("salon").vertragRabatt, 0, "Vertrauen 1: kein Rabatt");
    Spiel.kundenakte.daten("salon").punkte = Spiel.VERTRAUEN_SCHWELLEN[3];         /* Vertrauen 4 */
    const k = Spiel.karriere.kunde("salon");
    erwarte.wahr(k.vertragRabatt === 0.2 && k.vertragPreis === Math.round(voll * 0.8) && k.vertragPreisVoll === voll, JSON.stringify([voll, k.vertragPreis]));
    const e = Spiel.shop.liste().find(x => x.id === "vertrag:salon");
    erwarte.wahr(e.preis === k.vertragPreis && /−20 % für Vertrauen 4/.test(e.text), JSON.stringify(e));
    erwarte.gleich(Spiel.kundenakte.daten("baeckerei").punkte, 0, "der Preis fragt keine Akte an (keine Nebenwirkung)");
  }));

  pruefe("Feierabend-Ausblick: Folgeauftrag vor Notfall vor Kapitel vor Postfach („Morgen: …“)", stufe1(() => {
    Spiel.kundenakte.daten("salon").punkte = 1;                                     /* eine saubere Arbeit bis Vertrauen 2 = Kapitel 1 */
    erwarte.wahr(/^Morgen: Noch ein sauberer Auftrag bei Mira Kaya – dann wartet Kapitel 1: „/.test(Spiel.hub.ausblick()), Spiel.hub.ausblick());
    const n = Spiel.instanzErstellen({ticketId: "baeckerei-01", quelle: "notfall", frist: jetzt() + 20 * 60e3});
    erwarte.wahr(/^Morgen zuerst: Notfall bei Bäckerei Kornblume/.test(Spiel.hub.ausblick()), Spiel.hub.ausblick());
    Spiel.varianten.schulden().push({id: "s1", ticket: "salon-05", kunde: "salon", titel: "Das Lämpchen blinkt nicht", seit: 0, faellig: 3, folge: null, erledigt: false});
    erwarte.wahr(/^Morgen: Das Provisorium bei Mira Kaya \(„Das Lämpchen blinkt nicht“\) meldet sich in etwa 3 Aufträgen\.$/.test(Spiel.hub.ausblick()), Spiel.hub.ausblick());
    Spiel.instanzEntfernen(n.iid);
  }));
});
