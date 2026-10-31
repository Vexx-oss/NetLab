"use strict";
/* KLR-08a (3.0.0): 20-Übersicht als DATEN — Platzliste, Restzeit, Klassenstärke.
   Vertrag: docs/Architektur.md § 12.2 (uebersicht, Klassenstärke-Erbe). Die Anzeige baut ui (task-45).
   Abnahme: plaetze 20, Ergebnisse auf 1/2/5, T+2 min bei dauerMin 10 -> fertig 3, offen 17, restMinuten 8;
   Grenzfälle (0 Plätze, alle abgegeben, abgelaufen, keine Sitzung) ehrlich; Stärke wird geerbt. */
gruppe("Spiel: Klassenraum-20-Übersicht (KLR-08a)", () => {
  const K = () => Spiel.klassenraum;
  const T0 = Date.UTC(2026, 10, 1, 8, 0, 0);
  function kapsel(fn){
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
      speicher: store.alles(), uhr: jetzt()};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      store.set("klassenraum", null);
      jetzt.setzen(T0);
      return fn();
    } finally {
      if (SPEICHER.timer) { clearTimeout(SPEICHER.timer); SPEICHER.timer = null; }
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, alt.speicher);
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      jetzt.setzen(alt.uhr); jetzt.frei();
    }
  }
  const eintrag = platz => ({platz, sterne: 4, dauerS: 60, versuche: 0, code: "E-AAAA-AAA", zeit: T0, quelle: "eingabe"});
  function sitzung(o){
    const s = Object.assign({id: 5, titel: "T", art: "hand", ticketId: "salon-06", skill: null, index: 0, variante: 0,
      seed: 1, eigene: false, schritte: 0, code: "NL-AAAA-AA", dauerMin: 10, plaetze: 20, erstellt: T0,
      ergebnisse: {}, diagnose: {}}, o);
    store.set("klassenraum", {fassung: 2, programm: "test", platz: null, zuletzt: 1, aktiv: s.id, letzte: null, zaehler: 1, sitzungen: [s]});
    return s;
  }

  pruefe("20 Plätze, Ergebnisse auf 1/2/5, T+2 min: fertig 3, offen 17, Restzeit 8 min", () => kapsel(() => {
    sitzung({ergebnisse: {"1": eintrag(1), "2": eintrag(2), "5": eintrag(5)}});
    jetzt.setzen(T0 + 2 * 60000);
    const u = K().uebersicht();
    erwarte.wahr(!!u, "uebersicht liefert Daten");
    erwarte.gleich([u.plaetze, u.eingerichtet, u.fertig, u.offenAnzahl], [20, true, 3, 17], "3 abgegeben / 17 offen von 20");
    erwarte.gleich(u.abgegeben, [1, 2, 5], "abgegebene Plätze aufsteigend");
    erwarte.gleich(u.offen, [3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], "offene Plätze 3,4,6..20");
    erwarte.gleich([u.restMinuten, u.abgelaufen, u.dauerMin], [8, false, 10], "noch 8 Minuten bei 10 min Dauer");
    erwarte.gleich(u.ohnePlatz, 0, "keine Einträge ohne gültigen Platz");
    console.log("MESSUNG Übersicht: " + u.fertig + " abgegeben / " + u.offenAnzahl + " offen · " + u.restMinuten + " min übrig · offen=" + JSON.stringify(u.offen));
  }));

  pruefe("Grenzfälle: 0 Plätze, alle abgegeben, abgelaufen — ehrlich statt erfunden", () => kapsel(() => {
    sitzung({plaetze: 0, ergebnisse: {"1": eintrag(1)}});
    const u0 = K().uebersicht();
    erwarte.gleich([u0.plaetze, u0.eingerichtet, u0.offen, u0.offenAnzahl], [0, false, [], 0], "ohne Klassengröße kein erfundener Nenner");
    erwarte.gleich(u0.abgegeben, [1], "abgegebene Plätze bleiben sichtbar");
    const alle = {}; for (let p = 1; p <= 20; p++) alle[String(p)] = eintrag(p);
    sitzung({ergebnisse: alle});
    const uA = K().uebersicht();
    erwarte.gleich([uA.fertig, uA.offenAnzahl, uA.offen], [20, 0, []], "alle 20 abgegeben: offen leer");
    sitzung({ergebnisse: {}});
    jetzt.setzen(T0 + 11 * 60000);
    const uT = K().uebersicht();
    erwarte.gleich([uT.restMinuten, uT.abgelaufen], [0, true], "nach Ablauf: 0 min und abgelaufen");
    /* Einträge ohne gültigen Platz werden ehrlich gezählt, nicht als offen/fertig verbucht. */
    sitzung({ergebnisse: {"0": eintrag(0), "1": eintrag(1)}});
    const uO = K().uebersicht();
    erwarte.gleich([uO.fertig, uO.ohnePlatz], [1, 1], "Platz 0: ohnePlatz statt fertig");
    store.set("klassenraum", null);
    erwarte.gleich(K().uebersicht(), null, "ohne Sitzung: null (kein erfundener Stand)");
    console.log("MESSUNG Grenzfälle: plaetze0 eingerichtet=" + u0.eingerichtet + " · alle fertig · abgelaufen=" + uT.abgelaufen + " · ohnePlatz " + uO.ohnePlatz);
  }));

  pruefe("Klassenstärke wird beim Anlegen geerbt (sichtbar statt still 0), ausdrückliche Angabe gewinnt", () => kapsel(() => {
    const eins = K().erzeugen({ticketId: "salon-06", seed: 7, plaetze: 20});
    erwarte.gleich(eins.plaetze, 20, "erste Sitzung mit 20 Plätzen");
    const zwei = K().erzeugen({ticketId: "salon-02", seed: 3});
    erwarte.gleich([zwei.fehler === undefined, zwei.plaetze], [true, 20], "zweite Sitzung erbt die Klassengröße");
    erwarte.gleich(K().plaetze(), 20, "die aktive Sitzung nennt 20 Plätze (sichtbar)");
    const drei = K().erzeugen({ticketId: "salon-01", seed: 5, plaetze: 7});
    erwarte.gleich(drei.plaetze, 7, "ausdrückliche Angabe gewinnt");
    const vier = K().erzeugen({ticketId: "salon-01", seed: 5, plaetze: 0});
    erwarte.gleich(vier.plaetze, 0, "ausdrückliche 0 bleibt 0 (nicht eingestellt)");
    console.log("MESSUNG Stärke-Erbe: 20 -> geerbt 20 · explizit 7 · explizit 0");
  }));
});
