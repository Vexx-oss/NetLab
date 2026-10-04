"use strict";
/* PROVISORIUM ODER SAUBER? (Design – Spielspaß 2.0, Hebel 9; Architektur § 9.6): Wahl ändert Ziele und Lohn, das Provisorium
   wird eine Schuld, die nach drei weiteren Abschlüssen als Folgeauftrag zurückkommt – derselbe Fehler, diesmal mit Sicherung. */
gruppe("Spiel: Provisorium oder sauber", () => {
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally { Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken; }
  };
  const instanz = (id, niveau = "AP1") => { Spiel._einst.wahl = niveau; const i = Spiel.instanzErstellen({ticketId: id, quelle: "postfach"}); Spiel.oeffnen(i.iid); return i; };
  const loesen = inst => Spiel.aendern(inst, "Lösung", n => Spiel.loesung(n, Spiel.defVon(inst).loesung));

  pruefe("acht Aufträge bieten die Wahl; bei jedem ist die Reparatur ohne Sicherung nach einem Neustart weg (sonst hielte das Provisorium)", kapsel(() => {
    erwarte.gleich(Spiel.VARIANTEN_TICKETS.length, 8);
    for (const id of Spiel.VARIANTEN_TICKETS) {
      const def = DATEN.tickets.find(t => t.id === id);
      erwarte.wahr(def && Spiel.varianten.fuer(def) && Spiel.varianten.geraete(def).length >= 1, id);
      const n = def.netz(Zufall(1));
      Spiel.loesung(n, def.loesung.filter(s => s.aktion !== "speichern"));
      erwarte.wahr(def.ziele.every(z => Sim.pruefeZiel(n, z).ok), id + ": Lösung ohne Sicherung wirkt");
      for (const g of Object.values(n.geraete)) if (Modell.IOS[g.typ]) Modell.neustart(n, g.id);
      erwarte.wahr(def.ziele.some(z => !Sim.pruefeZiel(n, z).ok), id + ": nach dem Neustart ist der Fehler zurück");
    }
    erwarte.gleich(Spiel.varianten.fuer(DATEN.tickets.find(t => t.id === "salon-01")), null);
  }));

  pruefe("sauber: Netzziele + „Änderung gesichert“ (am Start offen) + Notiz; bestanden mit Sicherung und Notiz, Lohn × 1,2", kapsel(() => {
    const inst = instanz("praxis-03");
    Spiel.varianten.waehlen(inst, "sauber");
    const s0 = Spiel.zieleStatus(inst);
    erwarte.wahr(s0.some(s => s.ziel.typ === "gespeichert" && s.ok === false) && s0.some(s => s.ziel.typ === "notiz" && s.grund === "NOTIZ_FEHLT"), JSON.stringify(s0.map(s => [s.ziel.typ, s.ok])));
    loesen(inst);
    erwarte.falsch(Spiel.abnahme(inst).bestanden, "ohne Notiz nicht bestanden");
    Spiel.notizSetzen(inst, "SW-Praxis: VLAN wieder auf dem Trunk erlaubt, gesichert.");
    const ab = Spiel.abnahme(inst);
    erwarte.wahr(ab.bestanden, JSON.stringify(ab.ergebnisse.map(e => [e.ziel.typ, e.ok, e.grund])));
    const erg = Spiel.abschliessen(inst, ab);
    const v = erg.lohn.variante;
    erwarte.wahr(v && v.faktor === 1.2 && erg.euro === Math.round((erg.euro - v.differenz) * 1.2), "Aufschlag: " + JSON.stringify(erg.lohn));
    erwarte.gleich(Spiel.varianten.schulden().length, 0, "keine Schuld");
  }));

  pruefe("Provisorium: ohne Sicherung bestanden (auch im AP2), Lohn × 0,6, Schuld → nach drei Abschlüssen Folgeauftrag, der mit Sicherung besteht", kapsel(() => {
    const inst = instanz("autohaus-01", "AP2");
    Spiel.varianten.waehlen(inst, "provisorium");
    Spiel.aendern(inst, "nur die Netzänderung", n => Spiel.loesung(n, Spiel.defVon(inst).loesung.filter(s => s.aktion !== "speichern")));
    const ab = Spiel.abnahme(inst);
    erwarte.wahr(ab.bestanden && !ab.neustart.geprueft, "Provisorium besteht ohne Neustart-Test");
    const erg = Spiel.abschliessen(inst, ab);
    const v = erg.lohn.variante;
    erwarte.wahr(v && v.faktor === 0.6 && erg.euro === Math.max(1, Math.round((erg.euro - v.differenz) * 0.6)), "Abschlag: " + JSON.stringify(erg.lohn));
    const s = Spiel.varianten.schulden()[0];
    erwarte.wahr(s && s.ticket === "autohaus-01" && s.faellig === Spiel.st.erledigt.length + 3 && erg.schuld === s, JSON.stringify(s));
    for (let k = 0; k < 2; k++) Spiel.st.erledigt.push({id: "x" + k, sterne: 5, tag: heute(), hilfe: 0, form: "stoerung"});
    erwarte.gleich(Spiel.varianten.faelligeAusloesen(), [], "nach zwei Abschlüssen noch nicht");
    Spiel.st.erledigt.push({id: "x2", sterne: 5, tag: heute(), hilfe: 0, form: "audit"});
    const [folge] = Spiel.varianten.faelligeAusloesen();
    erwarte.wahr(folge && folge.quelle === "folge" && folge.ticketId === "autohaus-01-folge", JSON.stringify(folge && folge.ticketId));
    const def = Spiel.defVon(folge);
    erwarte.wahr(/Provisorium von neulich/.test(def.titel) && def.ziele.some(z => z.typ === "gespeichert" && z.nachAenderung), def.titel);
    erwarte.wahr(Spiel.zieleStatus(folge).some(e => e.ok === false), "der Fehler ist wieder da");
    erwarte.gleich(Spiel.varianten.faelligeAusloesen(), [], "nur einmal");
    Spiel.oeffnen(folge.iid);
    loesen(folge);
    const ab2 = Spiel.abnahme(folge);
    erwarte.wahr(ab2.bestanden, JSON.stringify(ab2.ergebnisse.map(e => [e.ziel.typ, e.ok])));
    Spiel.abschliessen(folge, ab2);
    erwarte.wahr(Spiel.varianten.schulden()[0].erledigt, "Schuld beglichen");
  }));

  pruefe("Folgeaufträge aller acht: gültig – der Fehler wirkt, die Lösung samt Sicherung heilt alles (Durchspiel AP2)", kapsel(() => {
    const ids = Spiel.VARIANTEN_TICKETS.map(id => id + "-folge");
    const r = Spiel.testlauf({ids, niveau: "AP2"});
    erwarte.gleich(r.filter(x => !x.bestanden || !x.startVerletzt).map(x => x.id + ": " + x.fehler.join("; ")), []);
  }));
});
