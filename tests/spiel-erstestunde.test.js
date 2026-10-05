"use strict";
/* ERSTE STUNDE (Design – Spielspaß 2.0, § 20 F3; Architektur § 9.8): Ein neuer Spielstand bekommt eine gestaltete Folge der ersten
   sechs Aufträge – Kabel · Störung · Hotline · Fernwartung · Provisorium oder sauber · Weiterempfehlung mit Plan-Audit –, im Postfach
   immer die nächsten zwei Schritte. Danach mischt der Mischer. Alte Spielstände bleiben, wie sie sind. */
gruppe("Spiel: erste Stunde", () => {
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand();
      Spiel.ergaenzer.ersteStunde(Spiel._st);                      /* wie ein neuer Spielstand beim Laden */
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD, {wahl: "E"});
      Spiel.ersteStunde.abholen();
      fn();
    } finally { Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken; }
  };
  const regulaer = () => Spiel.st.postfach.filter(i => i.quelle === "postfach" || i.quelle === "generiert");
  /* den obersten Auftrag im Postfach so abschließen, wie es ein Spieler mit Lösung täte (Variante: sauber) */
  const obersten = () => {
    const inst = Spiel.postfach()[0];
    Spiel.oeffnen(inst.iid);
    const def = Spiel.defVon(inst);
    if (Spiel.varianten.fuer(def)) Spiel.varianten.waehlen(inst, "sauber");
    Spiel.aendern(inst, "Lösung", n => Spiel.loesung(n, def.loesung));
    Spiel.arbeitszieleErfuellen(inst);
    const ab = Spiel.abnahme(inst);
    erwarte.wahr(ab.bestanden, `${def.id} besteht: ` + JSON.stringify(ab.ergebnisse.filter(e => !e.ok).map(e => [e.ziel.typ, e.grund, e.text])));
    return {def, inst, erg: Spiel.abschliessen(inst, ab)};
  };

  pruefe("neuer Spielstand: im Postfach liegen genau die ersten zwei Schritte (Kabel, Störung); alter Spielstand bleibt beim Mischer", kapsel(() => {
    erwarte.wahr(Spiel.ersteStunde.aktiv(), "aktiv");
    Spiel.postfachAuffuellen();
    erwarte.gleich(regulaer().map(i => [i.ticketId, i.kuratiert]), [["salon-01", 1], ["salon-02", 2]]);
    erwarte.gleich(Spiel.postfach()[0].ticketId, Spiel.EINSTIEG_TICKET, "Einstieg zuerst");
    /* alter Stand: zwei Aufträge erledigt, kein Feld ersteStunde → vorbei, der Mischer füllt wie gewohnt */
    const alt = Spiel.leererStand();
    alt.erledigt.push({id: "salon-01", sterne: 5, tag: heute(), form: "stoerung"}, {id: "salon-02", sterne: 5, tag: heute(), form: "stoerung"});
    Spiel.ergaenzer.ersteStunde(alt);
    erwarte.falsch(Spiel.ersteStunde.aktiv(alt), "alter Stand: vorbei");
    erwarte.falsch(Spiel.ersteStunde.aktiv(Spiel.leererStand()), "Stand ohne Feld (Tests, Migration): vorbei");
  }));

  pruefe("die ersten sechs Abschlüsse zeigen ≥ 4 Formen; Anruf und Weiterempfehlung kommen als Karte, zufällige Ereignisse schweigen bis dahin", kapsel(() => {
    Spiel.postfachAuffuellen();
    const d = Spiel.ereignisse.daten(); d.aktivMs = 99 * 60 * 60 * 1000;           /* ein zufälliges Ereignis wäre längst fällig … */
    const karten = [], folge = [];
    let empfehlung = null;
    for (let n = 1; n <= 6; n++) {
      erwarte.gleich(Spiel.ereignisse.tick({inst: Spiel.postfach()[0]}), null, `… schweigt aber vor Abschluss ${n}`);
      if (Spiel.ersteStunde.daten().ereignis) break;
      const {def, erg} = obersten();
      folge.push(Spiel.formVon(def));
      if (erg.ereignis) karten.push([n, erg.ereignis.id]);
      if (erg.ereignis && erg.ereignis.id === "weiterempfehlung") empfehlung = erg.ereignis;
      erwarte.wahr(regulaer().length >= 1 && regulaer().length <= 2, `nach ${n}: ein bis zwei Angebote (${regulaer().length})`);
    }
    erwarte.gleich(folge.length, 4, "nach vier Abschlüssen kam die Weiterempfehlung");
    erwarte.gleich(karten, [[1, "anruf"], [4, "weiterempfehlung"]], JSON.stringify(karten));
    erwarte.wahr(/^Mira Kaya hat dich weiterempfohlen: .+ \(Bäckerei/.test(empfehlung.text), "Mira empfiehlt weiter: " + empfehlung.text);
    const angebote = Spiel.postfach().map(i => [i.kuratiertId, Spiel.formVon(Spiel.defVon(i))]);
    erwarte.gleich(angebote, [["variante", "stoerung"], ["empfehlung", "audit"]], JSON.stringify(angebote));
    for (let n = 5; n <= 6; n++) folge.push(Spiel.formVon(obersten().def));
    erwarte.gleich(folge, ["stoerung", "stoerung", "hotline", "forensik", "stoerung", "audit"], folge.join(" · "));
    erwarte.wahr(new Set(folge).size >= 4, "mindestens vier Formen");
    erwarte.falsch(Spiel.ersteStunde.aktiv(), "vorbei");
    erwarte.wahr(regulaer().length >= Spiel.postfachZiel(), `danach füllt der Mischer (${regulaer().length})`);
    erwarte.falsch(Spiel.ersteStunde.ruhig(), "zufällige Ereignisse dürfen wieder");
  }));

  pruefe("Hotline-Schritt klingelt; ein geöffneter Anruf klingelt nicht mehr", kapsel(() => {
    Spiel.postfachAuffuellen();
    obersten();                                                        /* Kabel → jetzt Störung und Hotline */
    const anruf = Spiel.st.postfach.find(i => i.kuratiertId === "hotline");
    erwarte.wahr(anruf && anruf.klingelt, "klingelt");
    erwarte.gleich(Spiel.hub.naechster().klingelt, false, "Hub zeigt zuerst die Störung");
    Spiel.oeffnen(anruf.iid);
    erwarte.falsch(Spiel.hub.naechster().klingelt, "geöffnet: klingelt nicht mehr");
  }));

  pruefe("Ereignisse: ohne Auftrag gilt der offene (Stromausfall), Wünsche zu Form und Kunde zählen (Weiterempfehlung)", kapsel(() => {
    Spiel.ersteStunde.daten().fertig = true;
    erwarte.gleich(Spiel.ereignisse.ausloesen("stromausfall"), null, "kein Auftrag offen → kein Kunde, kein Strom");
    const inst = Spiel.instanzErstellen({ticketId: "baeckerei-01", quelle: "postfach"});
    Spiel.oeffnen(inst.iid);
    const s = Spiel.ereignisse.ausloesen("stromausfall");
    erwarte.wahr(s && s.id === "stromausfall", "mit offenem Auftrag");
    const w = Spiel.ereignisse.ausloesen("weiterempfehlung", {form: "forensik", kunde: "salon"});
    const neu = Spiel.instanz(w.iid);
    erwarte.wahr(neu && neu.kunde === "salon" && Spiel.formVon(Spiel.defVon(neu)) === "forensik" && w.aktion === "neu", JSON.stringify(w));
  }));
});
