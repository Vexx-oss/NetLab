"use strict";
/* DOKU-ZIELE (Welle 2 · S4, Architektur § 17.3; Befund B-auftraege.md § 3.5)
   BEFUND: 17 von 58 Briefings fordern ausdrücklich „Protokoll", „Wartungsbuch" oder „Betriebshandbuch"
   (plus „zwei Sätze/Zeilen") – aber KEIN Handticket hatte ein Dokumentationsziel. Der Kunde bat also um
   eine Leistung, die das Spiel nicht abnahm.
   JETZT: jedes dieser Briefings trägt ein Arbeitsziel notiz (min. 20 Zeichen), ohne neue Datenform.
   Geprüft wird über die ECHTE Abnahme (Spiel.abnahme), nicht nur über das Datenfeld:
     · ohne Notiz ist das Ziel OFFEN (der Test schreibt absichtlich keine),
     · mit Notiz ist es erfüllt und erscheint als Ergebnis mit ok:true.
   Die Liste der 17 Briefings wird aus dem Briefing selbst abgeleitet (Stichwörter), damit ein neues
   Doku-Briefing ohne Ziel den Test rot macht. */
gruppe("Tickets: Doku-Ziele (S4)", () => {
  const DOC = /Protokoll|Wartungsbuch|Betriebshandbuch|zwei S(ä|ae)tze[^n]|zwei Zeilen/i;
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand();
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
    }
  };
  const dokuTickets = () => DATEN.tickets.filter(t => DOC.test(String(t.briefing || "")));
  const dokuZiel = def => (def.ziele || []).find(z => z && (z.typ === "notiz" || z.typ === "tabelle" || z.typ === "audit"));

  pruefe("Die 17 Doku-Briefings tragen je ein prüfbares Doku-Ziel (notiz min. 20 Zeichen / tabelle / audit)", () => {
    const ts = dokuTickets();
    erwarte.gleich(ts.length, 17, "Zahl der Doku-Briefings");
    const fehlt = ts.filter(t => !dokuZiel(t)).map(t => t.id);
    erwarte.gleich(fehlt, [], "Doku-Briefing ohne Doku-Ziel");
    for (const t of ts) {
      const z = dokuZiel(t);
      erwarte.wahr(!!z.text && z.text.length >= 10, t.id + ": Doku-Ziel ohne Zieltext");
      if (z.typ === "notiz") erwarte.wahr((z.min || 0) >= 20, t.id + ": notiz.min < 20");
    }
  });

  pruefe("Doku-Ziel erscheint in der echten Abnahme – und bleibt ohne Notiz offen", kapsel(() => {
    const offen = [], erfuellt = [];
    for (const def0 of dokuTickets()) {
      const ziel = dokuZiel(def0);
      /* 1) echt durchspielen: Lösung anwenden, Arbeit erledigen, abnehmen */
      const i1 = Spiel.instanzErstellen({ticketId: def0.id});
      const d1 = Spiel.defVon(i1);
      Spiel._einst.wahl = d1.stufe;
      Spiel.oeffnen(i1.iid);
      Spiel.loesung(i1.netz, d1.loesung);
      Spiel.arbeitszieleErfuellen(i1);
      const ab1 = Spiel.abnahme(i1);
      const e1 = (ab1.ergebnisse || []).find(e => e.ziel && dokuZiel({ziele: [e.ziel]}));
      if (e1 && e1.ok === true) erfuellt.push(d1.id); else offen.push(d1.id + " (mit Notiz nicht erfüllt)");
      /* 2) Gegenprobe: exakt dieselbe Abnahme OHNE Notiz -> Ziel muss offen sein */
      const i2 = Spiel.instanzErstellen({ticketId: def0.id});
      const d2 = Spiel.defVon(i2);
      Spiel._einst.wahl = d2.stufe;
      Spiel.oeffnen(i2.iid);
      Spiel.loesung(i2.netz, d2.loesung);
      Spiel.arbeitszieleErfuellen(i2);
      i2.notiz = "";
      const ab2 = Spiel.abnahme(i2);
      const e2 = (ab2.ergebnisse || []).find(e => e.ziel && dokuZiel({ziele: [e.ziel]}));
      if (!e2 || e2.ok !== false) offen.push(d2.id + " (ohne Notiz NICHT offen)");
    }
    erwarte.gleich(offen, [], "Doku-Ziel nicht in der Abnahme wirksam");
    erwarte.gleich(erfuellt.length, 17, "Doku-Ziele in der Abnahme erfüllt");
  }));
});
