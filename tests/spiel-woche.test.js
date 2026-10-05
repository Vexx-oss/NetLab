"use strict";
/* HUB-WAHL UND WOCHENZIEL (Design – Spielspaß 2.0, § 20 F7; Architektur § 9.8): Der Hub zeigt neben der Hauptkarte zwei weitere
   Aufträge (die Wahl aus dem Postfach) und ein frei wählbares Wochenziel aus drei Vorschlägen. */
gruppe("Spiel: Hub-Wahl und Wochenziel", () => {
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken, uhr: jetzt()};
    try {
      jetzt.setzen(Date.UTC(2026, 9, 7, 9, 0, 0));                      /* Mittwoch, 7. Oktober 2026 – Woche ab Montag, 5. Oktober */
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD, {wahl: "E"});
      fn();
    } finally { Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken; jetzt.setzen(alt.uhr); jetzt.frei(); }
  };

  pruefe("Hub: zwei weitere Aufträge neben der Hauptkarte, Titel höchstens drei Wörter, nie die Hauptkarte doppelt", kapsel(() => {
    for (const id of ["salon-02", "salon-hotline", "baeckerei-01", "salon-03"]) Spiel.instanzErstellen({ticketId: id, quelle: "postfach"});
    const s = Spiel.hub.stand();
    erwarte.gleich(s.weitere.length, 2);
    erwarte.falsch(s.weitere.some(w => w.iid === s.naechster.iid), "Hauptkarte nicht doppelt");
    for (const w of s.weitere) erwarte.wahr(w.titel.replace(" …", "").split(/\s+/).length <= 3 && w.voll && Spiel.FORMEN[w.form], JSON.stringify(w));
    erwarte.wahr(s.weitere.some(w => w.voll === "Mira ruft an: Mal geht’s, mal nicht" && w.titel === "Mira ruft an: …"), JSON.stringify(s.weitere));
  }));

  pruefe("Wochenziel: drei Vorschläge je Woche (für alle gleich), Wahl zählt nur diese Woche, geschafft → einmal +1 Ruf", kapsel(() => {
    erwarte.gleich(Spiel.woche.montag(), "2026-10-05");
    const v = Spiel.woche.vorschlaege();
    erwarte.gleich(v.length, 3); erwarte.gleich(JSON.stringify(Spiel.woche.vorschlaege()), JSON.stringify(v), "gleiche Woche → gleiche Vorschläge");
    erwarte.gleich(Spiel.woche.stand(), null, "ohne Wahl kein Ziel");
    erwarte.gleich(Spiel.woche.waehlen(Spiel.WOCHENZIELE.find(z => !v.some(x => x.id === z.id)).id), null, "nur einer der drei Vorschläge");
    /* „3 verschiedene Auftragsformen“ ist nicht in jeder Woche dabei – direkt wählen, Zählung prüfen */
    Spiel.st.wochenziel = {woche: "2026-10-05", id: "formen", erreicht: false};
    Spiel.st.erledigt.push({id: "alt", tag: "2026-10-04", form: "hotline"}, {id: "a", tag: "2026-10-05", form: "stoerung"}, {id: "b", tag: "2026-10-06", form: "hotline"});
    erwarte.gleich([Spiel.woche.stand().ist, Spiel.woche.stand().erreicht], [2, false], "Sonntag davor zählt nicht");
    erwarte.gleich(Spiel.woche.pruefen(), null, "noch nicht");
    Spiel.st.erledigt.push({id: "c", tag: "2026-10-07", form: "audit"});
    const ruf = Spiel.st.ruf, p = Spiel.woche.pruefen();
    erwarte.wahr(p && p.ruf === 1 && Spiel.st.ruf === ruf + 1 && Spiel.woche.stand().erreicht, JSON.stringify(p));
    erwarte.gleich(Spiel.woche.pruefen(), null, "nur einmal");
    jetzt.setzen(Date.UTC(2026, 9, 12, 9, 0, 0));
    erwarte.gleich(Spiel.woche.stand(), null, "neue Woche: neues Ziel wählen");
    const w = Spiel.woche.vorschlaege()[0];
    erwarte.wahr(Spiel.woche.waehlen(w.id).ist === 0, "frisch gewählt");
  }));

  pruefe("Abschluss meldet das geschaffte Wochenziel im Ergebnis", kapsel(() => {
    Spiel.st.wochenziel = {woche: "2026-10-05", id: "ohneHilfe", erreicht: false};
    for (let k = 0; k < 4; k++) Spiel.st.erledigt.push({id: "x" + k, tag: "2026-10-06", hilfe: 0, form: "stoerung"});
    const i = Spiel.instanzErstellen({ticketId: "salon-02", quelle: "postfach"});
    Spiel.oeffnen(i.iid);
    Spiel.aendern(i, "Lösung", n => Spiel.loesung(n, Spiel.defVon(i).loesung));
    const erg = Spiel.abschliessen(i, Spiel.abnahme(i));
    erwarte.wahr(erg.woche && erg.woche.text === "5 Aufträge ohne Hilfe", JSON.stringify(erg.woche));
  }));
});
