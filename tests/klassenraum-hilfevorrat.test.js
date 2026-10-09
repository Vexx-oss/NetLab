"use strict";
/* KLASSENRAUM: HILFEVORRAT UND TICKET-STUFE (task-4, Fahrplan „1.3 und 2.0" § 2.5).

   DER BEFUND (gemessen, vor der Behebung):
   `Spiel.stufe.konto(inst)` lieferte für ein Ticket ohne eigene `stufe` immer `{frei:6, gesamt:6}` —
   auch wenn der Mensch auf „meister" stand. Ursache war `alsTicketId` in `src/spiel/stufensystem.js`:
   der Rückfall las `Spiel.EINST_STANDARD.stufe`, also eine stille Konstante statt des Bildungsstands
   auf dem Gerät. Folge: sechs Sprossen waren kostenlos (`Spiel.hilfeAbzuege` blieb leer), und
   derselbe Auftrag war auf jedem Gerät gleich billig.

   WAS HIER GEMESSEN WIRD (kein Prompt-Test, der echte Weg):
   `Spiel.instanzErstellen` → `Spiel.oeffnen` → `Spiel.stufe.konto()` (so fragt die Oberfläche,
   `src/ui/hilfe.js:32`) und `Spiel.hilfe(inst)` → `Spiel.hilfeAbzuege(inst)`.

   VERTRAG, DER UNBERÜHRT BLEIBT (Architektur § 13.2, Hilfestellung § 2.1):
   · Gezählt wird JE TICKET; ein späteres Umstellen des Menschen ändert den Vorrat eines Tickets nicht.
   · Ein leerer Vorrat SPERRT NICHT – die nächste Sprosse kostet Sterne.
   · `Spiel.stufe.rang` bleibt 1..4, unbekannte Stufen fallen auf `azubi` zurück (kein Wurf). */
gruppe("Klassenraum: Hilfevorrat", () => {
  /* Eigener Stand, eigene Einstellungen, eigener Speicher – danach alles zurück.
     ACHTUNG: gibt eine Funktion zurück (der Rahmen ruft sie im eigenen try/catch); ein sofort
     ausgeführter Rumpf brächte den ganzen Lauf mit LADEFEHLER (exit 2) zum Stehen. */
  const kapsel = fn => () => {
    const alt = {
      st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
      labor: store.get("labor", null), einstStore: store.get("einst", null),
      standardStufe: Spiel.EINST_STANDARD.stufe, gen: Object.assign({}, Spiel.generierte), uhr: jetzt(),
    };
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      Spiel.EINST_STANDARD.stufe = alt.standardStufe;
      store.set("labor", alt.labor); store.set("einst", alt.einstStore);
      for (const k of Object.keys(Spiel.generierte)) if (!(k in alt.gen)) delete Spiel.generierte[k];
      jetzt.setzen(alt.uhr); jetzt.frei();
    }
  };
  const STUFEN = ["azubi", "azubi-plus", "geselle", "meister"];
  /* Ein echter Klassenraum-Auftrag: Handticket, kanonisch (ohneFlow wie im Klassenraum-Weg). */
  function auftrag(){
    const inst = Spiel.instanzErstellen({ticketId: "salon-01", seed: 43, quelle: "klassenraum", ohneFlow: true});
    Spiel.oeffnen(inst.iid);
    return inst;
  }

  pruefe("Stufe und Vorrat je Bildungsstand: das offene Ticket trägt seine Stufe ausdrücklich", kapsel(() => {
    const vorrat = {}, amTicket = {};
    for (const id of STUFEN) {
      Spiel.stufe.setzen(id, {still: true});
      const inst = auftrag();
      vorrat[id] = Spiel.stufe.konto();                  /* der Weg der Oberfläche (ohne Instanz) */
      amTicket[id] = inst.stufe;
    }
    erwarte.gleich(vorrat, {
      "azubi":      {frei: 6, gesamt: 6},
      "azubi-plus": {frei: 4, gesamt: 4},
      "geselle":    {frei: 2, gesamt: 2},
      "meister":    {frei: 0, gesamt: 0},
    }, "Vorrat je Bildungsstand (6/4/2/0 aus § 2.1)");
    erwarte.gleich(amTicket, {"azubi": "azubi", "azubi-plus": "azubi-plus", "geselle": "geselle", "meister": "meister"},
      "die Stufe steht AUSDRÜCKLICH am Ticket – nicht nur im Rückfall");
    /* § 2.1: ein späteres Umstellen des Menschen ändert den Vorrat eines Tickets nicht.
       Dafür wird ein FRISCHES Azubi-Ticket geöffnet – das zuletzt geöffnete war das Meister-Ticket. */
    Spiel.stufe.setzen("azubi", {still: true});
    auftrag();
    erwarte.gleich(Spiel.stufe.konto(), {frei: 6, gesamt: 6}, "das offene Azubi-Ticket hat 6 frei");
    Spiel.stufe.setzen("meister", {still: true});
    erwarte.gleich(Spiel.stufe.konto(), {frei: 6, gesamt: 6}, "das Umstellen des Menschen ändert diesen Vorrat nicht mehr");
  }));

  pruefe("Hilfevorrat und Stufe: sechs Sprossen am Meister-Ticket kosten Sterne, am Azubi-Ticket nicht", kapsel(() => {
    Spiel.stufe.setzen("meister", {still: true});
    const m = auftrag();
    for (let n = 0; n < 6; n++) Spiel.hilfe(m);
    erwarte.gleich(m.hilfen.map(h => h.stufe), [1, 2, 3, 4, 5, 6], "sechs Sprossen");
    erwarte.gleich(m.hilfen.map(h => h.frei), [false, false, false, false, false, false], "meister: kein Vorrat deckt");
    erwarte.gleich(Spiel.hilfeAbzuege(m).map(x => x.sterne), [0.5, 0.5, 1], "und die Abzüge stehen wirklich da");
    erwarte.gleich(Spiel.stufe.hilfenFrei(), 0, "der Vorrat des offenen Tickets ist leer");

    Spiel.stufe.setzen("azubi", {still: true});
    const a = auftrag();
    for (let n = 0; n < 6; n++) Spiel.hilfe(a);
    erwarte.gleich(a.hilfen.map(h => h.frei), [false, false, false, true, true, true], "azubi: erst ab Sprosse 4 wird der Vorrat beansprucht");
    erwarte.gleich(Spiel.hilfeAbzuege(a), [], "gedeckt = kostenlos");
    erwarte.gleich(Spiel.stufe.hilfeZiehen(a), {frei: false, grund: "Keine freie Hilfe mehr – die nächste Sprosse kostet Sterne."},
      "hilfeZiehen meldet den leeren Vorrat, ohne zu werfen");
  }));

  pruefe("Ein leerer Vorrat sperrt NICHT (Architektur § 13.2): die siebte Sprosse bleibt offen", kapsel(() => {
    Spiel.stufe.setzen("meister", {still: true});
    const m = auftrag();
    for (let n = 0; n < 6; n++) Spiel.hilfe(m);
    erwarte.gleich(Spiel.stufe.hilfeZiehen(m).frei, false, "kein Vorrat");
    erwarte.enthaelt(Spiel.stufe.hilfeZiehen(m).grund, "kostet Sterne", "der Grund nennt die Kosten, nicht eine Sperre");
    const inhalt = Spiel.hilfeInhalt(m, 6);
    erwarte.wahr(!!inhalt && Array.isArray(inhalt.schritte) && inhalt.schritte.length > 0, "die sechste Sprosse hat Inhalt (Vorführung)");
    erwarte.gleich(m.hilfeStufe, 6, "die Sprosse wurde gezogen, nicht verweigert");
  }));

  pruefe("Vertrag § 2.1 und § 3 bleiben: fremde Attrappen ohne Stufe sind azubi – nie der stille Standard", kapsel(() => {
    const fremd = {iid: "iF", ticketId: "salon-01", hilfen: [], hilfeStufe: 0};
    Spiel.stufe.setzen("meister", {still: true});
    erwarte.gleich(Spiel.stufe.konto(fremd), {frei: 6, gesamt: 6}, "ohne eigene Stufe: Rückfall azubi");
    erwarte.gleich(fremd.stufe, undefined, "eine fremde Attrappe bekommt nichts geschrieben");
    /* Der stille Standard ist als Quelle entfallen – auch wenn er selbst auf „meister" steht. */
    Spiel.EINST_STANDARD.stufe = "meister";
    erwarte.gleich(Spiel.stufe.konto(fremd), {frei: 6, gesamt: 6}, "EINST_STANDARD ist NICHT die Quelle");
    erwarte.gleich(Spiel.stufe.konto({stufe: "quatsch"}), {frei: 6, gesamt: 6}, "unbekannte Ticket-Stufe -> azubi");
    erwarte.gleich(Spiel.stufe.konto({stufe: "geselle"}), {frei: 2, gesamt: 2}, "eine gesetzte Ticket-Stufe gilt");
    erwarte.gleich([Spiel.stufe.rang("meister"), Spiel.stufe.rang("gibtsnicht")], [4, 1],
      "rang bleibt 1..4, Rückfall azubi (kein Wurf)");
    Spiel.stufe.setzen("azubi", {still: true});
    erwarte.gleich(Spiel.stufe.rang(), 1, "ohne Argument gilt der Bildungsstand des Menschen");
  }));

  pruefe("ticketStufeSetzen(): die Stufe wird ausdrücklich gesetzt – eine Klassenraum-Ansage gewinnt", kapsel(() => {
    Spiel.stufe.setzen("meister", {still: true});
    const inst = {iid: "iK", ticketId: "salon-01", hilfen: [], hilfeStufe: 0};
    erwarte.gleich(Spiel.stufe.ticketStufeSetzen(inst, "azubi"), "azubi", "die Ansage gewinnt gegen den Bildungsstand des Menschen");
    erwarte.gleich(inst.stufe, "azubi", "und steht AM TICKET");
    erwarte.gleich(Spiel.stufe.konto(inst), {frei: 6, gesamt: 6}, "der Vorrat folgt der Ticket-Stufe");
    erwarte.gleich(Spiel.stufe.ticketStufeSetzen(inst, "geselle"), "azubi", "steht sie schon, bleibt sie (§ 2.1)");
    erwarte.gleich(Spiel.stufe.ticketStufeSetzen({}, undefined), "meister", "ohne id gilt der Bildungsstand des Menschen");
    erwarte.gleich(Spiel.stufe.ticketStufeSetzen({}, "quatsch"), "azubi", "unbekannte id -> azubi");
    erwarte.gleich(Spiel.stufe.ticketStufeSetzen(null), "meister", "ohne Ticket kein Wurf");
  }));
});
