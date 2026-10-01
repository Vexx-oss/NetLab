"use strict";
/* ABZEICHEN: vergeben genau einmal, Zähler, Reparatur kaputter Stände, Trockenlauf vergibt nichts.
   Läuft in einer Kapsel wie spiel-fluss-zustand: Speicher, Lernstand und Spielstand werden danach wiederhergestellt. */
gruppe("Spiel: Abzeichen", () => {
  const kapsel = fn => () => {
    const altSpeicher = store.alles(), altLern = tief(L.st), altSt = Spiel._st, altEinst = Spiel._einst, uhr = jetzt();
    try {
      jetzt.setzen(Date.UTC(2026, 9, 1, 8, 0, 0));
      store.set("einst", {});
      Spiel._einst = null;
      Spiel.neu();
      fn();
    } finally {
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, altSpeicher);
      const s = L.st; for (const k of Object.keys(s)) delete s[k]; Object.assign(s, altLern);
      Spiel._st = altSt; Spiel._einst = altEinst; Spiel._lz = {};
      jetzt.setzen(uhr); jetzt.frei();
    }
  };
  const erledigt = (o = {}) => Object.assign({id: "t", sterne: 3, tag: heute(), hilfe: 0, quelle: "postfach", niveau: "E", zeitMs: 1}, o);

  pruefe("Liste vollständig, eindeutig, jedes Abzeichen erklärt, was es lehrt", kapsel(() => {
    const l = Spiel.abzeichen.liste();
    erwarte.wahr(l.length >= 12, "genug Abzeichen");
    erwarte.gleich(new Set(l.map(a => a.id)).size, l.length, "IDs eindeutig");
    for (const a of l) {
      erwarte.wahr(a.sym && a.titel && a.text && a.lehrt && a.lehrt.length > 20, "Texte: " + a.id);
      erwarte.wahr(a.soll >= 1 && a.ist >= 0 && a.ist <= a.soll, "Stand im Rahmen: " + a.id);
    }
    erwarte.gleich(l.filter(a => a.erhalten).length, 0, "frischer Stand hat keine Abzeichen");
  }));

  pruefe("erstes Ticket → „Erster Kunde“ genau einmal, abholen leert die Liste", kapsel(() => {
    Spiel.st.erledigt.push(erledigt());
    const neu = Spiel.abzeichen.pruefen().map(a => a.id);
    erwarte.wahr(neu.includes("erster-kunde"), "vergeben");
    erwarte.wahr(!neu.includes("selbst-gefunden"), "5 ohne Hilfe noch nicht erreicht");
    erwarte.gleich(Spiel.abzeichen.pruefen(), [], "kein zweites Mal");
    erwarte.wahr(Spiel.abzeichen.abholen().some(a => a.id === "erster-kunde"), "ungezeigt abholbar");
    erwarte.gleich(Spiel.abzeichen.abholen(), [], "danach leer");
    erwarte.wahr(Spiel.abzeichen.liste().find(a => a.id === "erster-kunde").erhalten > 0, "mit Zeitpunkt");
  }));

  pruefe("Prüfungstickets zählen nicht, Hilfe zählt nicht als „selbst gefunden“", kapsel(() => {
    for (let i = 0; i < 5; i++) Spiel.st.erledigt.push(erledigt({quelle: "pruefung"}));
    for (let i = 0; i < 5; i++) Spiel.st.erledigt.push(erledigt({hilfe: 2}));
    const neu = Spiel.abzeichen.pruefen().map(a => a.id);
    erwarte.wahr(!neu.includes("selbst-gefunden"), "mit Hilfe gelöst");
    erwarte.gleich(Spiel.abzeichen.liste().find(a => a.id === "tagwerk").ist, 3, "Tagwerk: 5 Tickets am Tag, gedeckelt auf 3");
  }));

  pruefe("Zähler: 10 richtige Vorhersagen → „Hellseher“", kapsel(() => {
    for (let i = 0; i < 9; i++) Spiel.abzeichen.zaehlen("vorhersageRichtig");
    erwarte.wahr(!Spiel.abzeichen.pruefen().some(a => a.id === "hellseher"), "9 reichen nicht");
    Spiel.abzeichen.zaehlen("vorhersageRichtig");
    erwarte.wahr(Spiel.abzeichen.pruefen().some(a => a.id === "hellseher"), "10 reichen");
  }));

  pruefe("kaputter Abzeichen-Stand wird repariert, Trockenlauf vergibt nichts", kapsel(() => {
    Spiel.st.abzeichen = [1, 2];
    const d = Spiel.abzeichen.daten();
    erwarte.wahr(d.erhalten && Array.isArray(d.neu) && d.zaehler, "repariert");
    Spiel.st.erledigt.push(erledigt());
    Spiel._trocken = true;
    try { erwarte.gleich(Spiel.abzeichen.pruefen(), []); } finally { Spiel._trocken = false; }
  }));
});

gruppe("Spiel: Feierabend-Bilanz", () => {
  pruefe("zählt nur heutige Tickets und Buchungen, Prüfung zählt nicht", () => {
    const altSt = Spiel._st, uhr = jetzt(), altSpeicher = store.alles();
    try {
      jetzt.setzen(Date.UTC(2026, 9, 1, 10, 0, 0));
      Spiel._st = Spiel.migrieren({});
      const st = Spiel._st, t = heute();
      st.erledigt.push({id: "a", sterne: 5, tag: t, hilfe: 0, quelle: "postfach"}, {id: "b", sterne: 3, tag: t, hilfe: 2, quelle: "postfach"},
        {id: "c", sterne: 4, tag: plusTage(t, -1), hilfe: 0, quelle: "postfach"}, {id: "p", sterne: 5, tag: t, hilfe: 0, quelle: "pruefung"});
      st.buch.push({t: jetzt(), euro: 40, ruf: 2, grund: "x"}, {t: jetzt() - 3 * 864e5, euro: 99, ruf: 9, grund: "alt"}, {t: jetzt(), euro: -10, ruf: 0, grund: "Gebühr"});
      const b = Spiel.tag.bilanz();
      erwarte.gleich(b.tickets, 2); erwarte.gleich(b.ohneHilfe, 1); erwarte.gleich(b.sterne, 4);
      erwarte.gleich(b.euro, 40, "nur heutige Einnahmen, Ausgaben nicht abgezogen"); erwarte.gleich(b.ruf, 2);
      erwarte.wahr(Array.isArray(b.morgenFaellig));
    } finally {
      Spiel._st = altSt;
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, altSpeicher);
      jetzt.setzen(uhr); jetzt.frei();
    }
  });
});
