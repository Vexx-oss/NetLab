"use strict";
/* FLUSS: Spielstand, Migration, Einstellungen, Gutschrift, Postfach-Auffüllen.
   Alles läuft in einer Kapsel: Speicher, Lernstand, DATEN.tickets und Spielstand werden danach wiederhergestellt. */
gruppe("Spiel-Fluss: Zustand", () => {
  /* Kapsel: fn läuft mit frischem Spielstand; danach ist alles wie vorher */
  const kapsel = (fn, {tickets = null} = {}) => () => {
    const altSpeicher = store.alles(), altLern = tief(L.st), altTickets = DATEN.tickets, altGen = Object.assign({}, Spiel.generierte);
    const altSt = Spiel._st, altEinst = Spiel._einst, uhr = jetzt();
    try {
      jetzt.setzen(Date.UTC(2026, 8, 30, 8, 0, 0));
      if (tickets) DATEN.tickets = tickets();
      store.set("einst", {});
      Spiel._einst = null;
      Spiel.neu();
      fn();
    } finally {
      DATEN.tickets = altTickets; Spiel.generierte = altGen;
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, altSpeicher);
      const s = L.st; for (const k of Object.keys(s)) delete s[k]; Object.assign(s, altLern);
      Spiel._st = altSt; Spiel._einst = altEinst; Spiel._lz = {};
      jetzt.setzen(uhr); jetzt.frei();
    }
  };
  /* Kleines Testticket: Kasse ohne Kabel (Salon-Beispielnetz) */
  const ticket = (id, o = {}) => Object.assign({
    id, art: "stoerung", stufe: "E", karriere: 1, kunde: "salon", titel: "Test " + id, briefing: "Hallo", symptom: "Kasse druckt nicht",
    skills: ["lab.link"],
    netz: () => { const n = DATEN.beispiele.salon(); Modell.trennen(n, Modell.kabelAn(n, "kasse", "eth0").kabel.id); return n; },
    ziele: [{typ: "erreichbar", von: "kasse", nach: "drucker", proto: "icmp", text: "Kasse erreicht Drucker"}],
    hilfen: {frage: ["Steckt das Kabel?"], bereich: [{geraet: "kasse"}], konkret: ["Verbinde die Kasse mit dem Switch."]},
    loesung: [], erklaerung: "Ohne Link kein Frame.", lohn: {euro: 40, ruf: 2}, minuten: 2,
  }, o);

  pruefe("leerer Stand hat die Felder aus Architektur § 7.2", kapsel(() => {
    const st = Spiel.st;
    for (const f of ["v", "euro", "ruf", "stufe", "kunden", "postfach", "aktiv", "erledigt", "playbooks", "tag", "zuletzt"]) erwarte.wahr(f in st, "Feld " + f);
    erwarte.gleich(st.v, Spiel.VERSION); erwarte.gleich(st.euro, 0); erwarte.gleich(st.stufe, 1);
    erwarte.wahr(Array.isArray(st.playbooks.aktiv));
    erwarte.gleich([st.dex, st.tagesraetsel, st.tagebuch], [{}, {serie: 0}, []], "v:2-Felder (§ 9.3)");
  }));

  pruefe("Migration repariert kaputte Stände und behält Unbekanntes", kapsel(() => {
    const netz = DATEN.beispiele.salon();
    const roh = {v: 1, euro: "viel", ruf: 3, stufe: 0, kunden: {salon: {vertrag: true}}, fremd: {x: 1},
      postfach: [{ticketId: "x1", netz}, {kaputt: true}, null, {ticketId: "x2", netz, iid: "i9", hilfen: "nein"}], erledigt: [{id: "a", sterne: 4}, {}]};
    const st = Spiel.migrieren(roh);
    erwarte.gleich(st.euro, 0); erwarte.gleich(st.ruf, 3); erwarte.gleich(st.stufe, 1);
    erwarte.gleich(st.fremd, {x: 1}, "unbekanntes Feld bleibt");
    erwarte.gleich(st.postfach.length, 2);
    erwarte.wahr(st.postfach.every(i => i.iid && Array.isArray(i.hilfen) && i.hilfeStufe === 0 && i.quelle === "postfach"));
    erwarte.gleich(st.kunden.salon.sterne, []);
    erwarte.gleich(st.erledigt.length, 1);
    erwarte.gleich(Spiel.migrieren(null).v, Spiel.VERSION);
    erwarte.gleich(st.v, 2, "v:1 wird zu v:2");
    erwarte.gleich([st.dex, st.tagesraetsel, st.tagebuch], [{}, {serie: 0}, []], "v:2-Felder ergänzt");
    const kaputt = Spiel.migrieren({v: 2, dex: [1], tagesraetsel: "x", tagebuch: {a: 1}});
    erwarte.gleich([kaputt.dex, kaputt.tagesraetsel, kaputt.tagebuch], [{}, {serie: 0}, []], "kaputte v:2-Felder repariert");
    erwarte.gleich(Spiel.migrieren([1, 2]).postfach, []);
  }));

  pruefe("laden/speichern: Stand überlebt einen Neustart, Ergänzer laufen", kapsel(() => {
    let aufgerufen = 0;
    Spiel.ergaenzer._test = st => { aufgerufen++; st.testfeld ||= 7; };
    try {
      Spiel.gutschreiben(12.5, 1, "Test");
      Spiel.speichern();
      Spiel._st = null;
      const st = Spiel.laden();
      erwarte.gleich(st.euro, 12.5); erwarte.gleich(st.ruf, 1);
      erwarte.gleich(st.testfeld, 7);
      erwarte.wahr(aufgerufen >= 1);
      erwarte.gleich(store.get("labor").euro, 12.5);
      erwarte.gleich(st.buch[st.buch.length - 1].grund, "Test");
    } finally { delete Spiel.ergaenzer._test; }
  }));

  pruefe("Instanzen ohne auflösbares Ticket werden beim Laden entfernt", kapsel(() => {
    const st = Spiel.st;
    st.postfach.push({iid: "i50", ticketId: "gibt-es-nicht", netz: DATEN.beispiele.salon(), hilfen: [], hilfeStufe: 0, quelle: "postfach", start: jetzt()});
    st.aktiv = "i50";
    Spiel.speichern(); Spiel._st = null;
    const neu = Spiel.laden();
    erwarte.falsch(neu.postfach.some(i => i.iid === "i50"));
    erwarte.gleich(neu.aktiv, null);
  }));

  pruefe("Einstellungen: Standard, einstSetzen speichert in store „einst“", kapsel(() => {
    erwarte.gleich(Spiel.einst.wahl, "auto"); erwarte.gleich(Spiel.einst.vorhersage, true);
    let gemeldet = null; const ab = Bus.an("einst-geaendert", d => { gemeldet = d; });
    try {
      Spiel.einstSetzen("vorhersage", false);
      erwarte.gleich(store.get("einst").vorhersage, false);
      erwarte.gleich(gemeldet, {k: "vorhersage", v: false});
      Spiel._einst = null;
      erwarte.gleich(Spiel.einst.vorhersage, false, "nach Neuladen");
    } finally { ab(); }
  }));

  pruefe("gutschreiben zählt Euro und Ruf, meldet zustand-geaendert", kapsel(() => {
    let n = 0; const ab = Bus.an("zustand-geaendert", () => n++);
    try {
      Spiel.gutschreiben(10, 2, "a"); Spiel.gutschreiben(-3.25, 0, "b");
      erwarte.gleich(Spiel.st.euro, 6.75); erwarte.gleich(Spiel.st.ruf, 2); erwarte.wahr(n >= 2);
    } finally { ab(); }
  }));

  pruefe("Postfach als Wahl (ab dem 2. erledigten Auftrag): 3 Angebote, der nächste Story-Auftrag ist dabei, keine Entwürfe, nichts über der Stufe", kapsel(() => {
    /* zwei verschiedene Formen zuletzt – sonst wäre „Störung“ gesperrt (nie dreimal dieselbe Form) */
    Spiel.st.erledigt.push({id: "x1", sterne: 5, tag: heute(), hilfe: 0, form: "audit"}, {id: "x2", sterne: 5, tag: heute(), hilfe: 0, form: "stoerung"});
    Spiel.st.postfach = []; Spiel.postfachAuffuellen();
    const l = Spiel.postfach().map(i => i.ticketId);
    erwarte.gleich(l.length, 3, l.join(", "));
    erwarte.wahr(l.includes("t1"), "nächster Story-Auftrag: " + l.join(", "));
    erwarte.falsch(l.some(id => ["t0", "t5", "m1", "t2", "t3"].includes(id)), "keine Entwürfe, nichts über der Stufe, je Form nur der nächste: " + l.join(", "));
    erwarte.wahr(new Set(Spiel.postfach().map(i => Spiel.formVon(Spiel.defVon(i)))).size >= 2, "verschiedene Formen");
  }, {tickets: () => [ticket("t1"), ticket("t2"), ticket("t3"), ticket("t4"), ticket("t5", {karriere: 2}), ticket("t0", {entwurf: true, karriere: 0}), ticket("m1", {art: "mini"})]}));

  pruefe("Postfach: erste Wahl – zwei Angebote, verschiedene Kunden zuerst (vorher und nach dem ersten Auftrag)", kapsel(() => {
    erwarte.gleich(Spiel.postfach().map(i => i.ticketId).sort(), ["t1", "t3"], "Start: erster Auftrag + anderer Kunde");
    Spiel.st.erledigt.push({id: "t1", sterne: 5, tag: heute(), hilfe: 0});
    Spiel.st.postfach = Spiel.st.postfach.filter(i => i.ticketId !== "t1"); Spiel.postfachAuffuellen();
    const l = Spiel.postfach();
    erwarte.gleich(l.length, 2, "zwei zur Wahl");
    erwarte.gleich(new Set(l.map(i => i.kunde)).size, 2, "zwei verschiedene Kunden");
  }, {tickets: () => [ticket("t1"), ticket("t2"), ticket("t3", {kunde: "baeckerei"}), ticket("t4")]}));

  pruefe("Postfach: gelöste Tickets kommen nicht wieder, Nachschub hält es gefüllt", kapsel(() => {
    Spiel.st.erledigt.push({id: "t1", sterne: 5, tag: heute(), hilfe: 0});
    Spiel.st.postfach = []; Spiel.postfachAuffuellen();
    erwarte.gleich(Spiel.postfach().map(i => i.ticketId), ["t2"]);
    Spiel.st.erledigt.push({id: "t2", sterne: 3, tag: heute(), hilfe: 0});
    Spiel.st.postfach = []; Spiel.postfachAuffuellen();
    erwarte.wahr(Spiel.postfach().length >= 1, "nie leer");
  }, {tickets: () => [ticket("t1"), ticket("t2"), ticket("t9", {karriere: 3})]}));

  pruefe("Postfach: Fristen zuerst, dann Ungelesenes; spätere (ab) unsichtbar", kapsel(() => {
    const a = Spiel.instanzErstellen({ticketId: "t1", quelle: "wartung", frist: jetzt() + 3600e3});
    const b = Spiel.instanzErstellen({ticketId: "t2", quelle: "wiederholung", ab: jetzt() + 60e3});
    const liste = Spiel.postfach();
    erwarte.gleich(liste[0].iid, a.iid);
    erwarte.falsch(liste.some(i => i.iid === b.iid), "ab in der Zukunft");
    jetzt.weiter(61e3);
    erwarte.wahr(Spiel.postfach().some(i => i.iid === b.iid), "nach Ablauf sichtbar");
  }, {tickets: () => [ticket("t1"), ticket("t2")]}));

  pruefe("instanzErstellen: Seed macht das Start-Netz reproduzierbar, Bus ticket-neu", kapsel(() => {
    let neu = null; const ab = Bus.an("ticket-neu", d => { neu = d; });
    try {
      const i = Spiel.instanzErstellen({ticketId: "t1", seed: 42});
      erwarte.gleich(neu.inst.iid, i.iid); erwarte.gleich(neu.def.id, "t1");
      erwarte.wahr(Modell.gleich(Spiel.startNetz(Spiel.ticketDef("t1"), 42), i.netz));
      erwarte.gleich(i.kunde, "salon"); erwarte.wahr(!!Spiel.st.kunden.salon);
    } finally { ab(); }
  }, {tickets: () => [ticket("t1")]}));
});
