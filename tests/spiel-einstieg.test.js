"use strict";
/* Sanftes Onboarding beim ersten Start (Bau P7): Begrüßungskarte (Station 1), Anweisung am ersten
   Auftrag (Station 2), Abschluss-Feedback (Station 3).
   Geprüft wird die LOGIK (src/spiel/erstestunde.js, ohne DOM): wann die Einführung kommt, dass sie
   genau EINMAL kommt, und dass ein alter Spielstand nie etwas davon zu sehen bekommt.
   Die Karten selbst zeichnet src/ui/spiel.js; der Rauchtest (tools/rauch.py) prüft, dass sie die
   erste Handlung nicht blockieren. */
gruppe("Spiel: Einstieg", () => {
  const T = Spiel.EINSTIEG_TEXTE;
  /* Wie im Spiel: ein frischer Stand, wie ihn Spiel.laden() aus einem leeren Speicher macht */
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand();
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally { Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken; }
  };
  const saetze = t => String(t).split(/[.!?]+\s/).filter(s => s.trim()).length;

  pruefe("Station 1: die Begrüßung kommt auf einem frischen Stand genau einmal", kapsel(() => {
    const st = Spiel.st;
    erwarte.wahr(Spiel.einstieg.begruessungNoetig(st), "frischer Stand: Begrüßung nötig");
    erwarte.gleich(Spiel.einstieg.waehlen("auftrag", st), "auftrag", "Wahl „Zeig mir den ersten Auftrag“");
    erwarte.gleich(st.einstieg.begruessung, "auftrag", "die Wahl steht im Spielstand");
    erwarte.falsch(Spiel.einstieg.begruessungNoetig(st), "danach nie wieder");
    /* Ein zweiter Aufruf ändert die getroffene Wahl nicht mehr – auch nicht auf „umsehen“ */
    erwarte.gleich(Spiel.einstieg.waehlen("umsehen", st), "auftrag", "die Wahl ist endgültig");
  }));

  pruefe("Station 1: „Erst umsehen“ wird ebenso vermerkt und kommt nur einmal", kapsel(() => {
    const st = Spiel.st;
    erwarte.gleich(Spiel.einstieg.waehlen("umsehen", st), "umsehen");
    erwarte.falsch(Spiel.einstieg.begruessungNoetig(st));
    erwarte.gleich(st.einstieg.begruessung, "umsehen");
  }));

  pruefe("Alter Spielstand: das Onboarding kommt NIE (fertig oder erledigte Aufträge)", kapsel(() => {
    /* (a) Stand, der den Einstieg hinter sich hat */
    const a = Spiel.leererStand();
    a.einstieg.fertig = true;
    erwarte.falsch(Spiel.einstieg.begruessungNoetig(a), "fertiger Einstieg: keine Begrüßung");
    erwarte.falsch(Spiel.einstieg.abschlussNoetig(a), "und kein Abschluss-Feedback");
    /* (b) Stand mit erledigten Aufträgen, aber ohne gesetztes fertig-Flag (so sehen alte Stände aus) */
    const b = Spiel.leererStand();
    b.erledigt = [{id: "salon-01", sterne: 5}];
    erwarte.falsch(Spiel.einstieg.begruessungNoetig(b), "wer schon Aufträge gelöst hat, bekommt keine Begrüßung");
    /* (c) sehr alter Stand ganz ohne `einstieg` – die Migration ergänzt das Feld, er bleibt aussen vor */
    const c = Spiel.migrieren({euro: 10, erledigt: [{id: "salon-02", sterne: 3}], postfach: []});
    erwarte.gleich(c.einstieg.begruessung, undefined, "die Migration erfindet keine Wahl");
    erwarte.falsch(Spiel.einstieg.begruessungNoetig(c), "auch er sieht nichts");
    /* (d) „durchgespielt, ohne dass je eine Begrüßung lief“: kein Abschluss-Feedback */
    const d = Spiel.leererStand();
    d.einstieg.fertig = true;
    erwarte.falsch(Spiel.einstieg.abschlussNoetig(d), "ohne Begrüßung kein Abschluss");
  }));

  pruefe("Station 2: die Anweisung nennt den Weg, nicht die Lösung", () => {
    const def = {id: Spiel.EINSTIEG_TICKET};
    const hinweis = Spiel.einstieg.hinweisFuer(def);
    erwarte.gleich(hinweis, T.HINWEIS, "der Einstiegsauftrag bekommt die Anweisung");
    erwarte.enthaelt(hinweis, "Kabel-Werkzeug", "das Werkzeug wird genannt");
    /* Das Ziel von salon-01 ist „Die Kasse druckt auf dem Drucker“ – genau dieses Paar darf nicht
       im Text stehen; der Spieler soll selbst sehen, welches Gerät keinen Link hat. „Switch“ ist
       die Richtung (der Verteiler in der Zeichnung), nicht die Diagnose. */
    for (const spoiler of ["Kasse", "kasse", "Drucker", "drucker"]) {
      erwarte.falsch(hinweis.includes(spoiler), `die Anweisung verrät „${spoiler}“ nicht`);
    }
    erwarte.gleich(Spiel.einstieg.hinweisFuer({id: "salon-02"}), null, "nur der Einstiegsauftrag");
    erwarte.gleich(Spiel.einstieg.hinweisFuer(null), null, "ohne Auftrag kein Hinweis");
  });

  pruefe("Station 3: das Abschluss-Feedback kommt nach dem ersten Auftrag genau einmal", kapsel(() => {
    const st = Spiel.st;
    Spiel.einstieg.waehlen("auftrag", st);
    erwarte.falsch(Spiel.einstieg.abschlussNoetig(st), "vor dem ersten bestandenen Auftrag nicht");
    st.einstieg.fertig = true;                       /* so setzt es die Abnahme (src/spiel/abnahme.js) */
    erwarte.wahr(Spiel.einstieg.abschlussNoetig(st), "nach dem ersten Auftrag: einmal zeigen");
    erwarte.wahr(Spiel.einstieg.abschlussZeigen(st), "erster Aufruf zeigt es");
    erwarte.gleich(st.einstieg.abschluss, true, "der Stand kennt es danach");
    erwarte.falsch(Spiel.einstieg.abschlussZeigen(st), "zweiter Aufruf zeigt nichts mehr");
    erwarte.falsch(Spiel.einstieg.abschlussNoetig(st), "und es bleibt vorbei");
  }));

  pruefe("Texte: je Karte höchstens zwei Sätze, Begrüßung ≤ 180 Zeichen, kein Bindestrich-Wirrwarr", () => {
    erwarte.wahr(T.BEGRUESSUNG.length <= 180, `Begrüßung ${T.BEGRUESSUNG.length} Zeichen ≤ 180`);
    erwarte.wahr(T.BEGRUESSUNG.length > 60, "die Begrüßung sagt auch etwas");
    for (const [name, text] of Object.entries({BEGRUESSUNG: T.BEGRUESSUNG, HINWEIS: T.HINWEIS, SCHLUSS_LERNEN: T.SCHLUSS_LERNEN, SCHLUSS_WEG: T.SCHLUSS_WEG}))
      erwarte.wahr(saetze(text) <= 2, `${name}: höchstens zwei Sätze (${saetze(text)})`);
    /* Der Abschluss sind zwei Sätze – einer fürs Gelernte, einer für den Ablauf. */
    erwarte.enthaelt(T.SCHLUSS_LERNEN, "Kabel", "der erste Satz sagt, was gelernt wurde");
    erwarte.enthaelt(T.SCHLUSS_WEG, "Postfach", "der zweite sagt, wie es hier läuft");
    erwarte.enthaelt(T.SCHLUSS_WEG, "Labor", "… und wo gelöst wird");
    erwarte.enthaelt(T.SCHLUSS_WEG, "Abnahme", "… und was danach kommt");
  });
});
