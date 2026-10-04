"use strict";
/* KUNDENPOST (spiel/post.js): Lob nach dem 2. und 5. Ticket je Kunde, Notiz vom Senior bei neuem Kunden –
   jeder Auslöser genau einmal; gelesen/abgelegt; Trockenlauf erzeugt nichts. Kapsel wie spiel-abzeichen. */
gruppe("Spiel: Kundenpost", () => {
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

  pruefe("Lob nach dem 2. Ticket genau einmal, zählt als ungelesen, gelesen/abgelegt wirken", kapsel(() => {
    const id = Object.keys(DATEN.kunden).find(k => ((DATEN.kunden[k].saetze || {}).lob || []).length);
    erwarte.wahr(id, "ein Kunde mit Lob-Sätzen");
    erwarte.gleich(Spiel.post.pruefen().filter(n => n.art === "lob"), [], "frischer Stand: kein Lob");
    Spiel.kunde(id).sterne.push(4, 5);
    const neu = Spiel.post.pruefen().filter(n => n.art === "lob");
    erwarte.gleich(neu.length, 1, "ein Lob nach zwei Tickets");
    erwarte.gleich(neu[0].kunde, id);
    erwarte.wahr(Spiel.post.ungelesen() >= 1 && Spiel.ungelesen() >= Spiel.post.ungelesen(), "Zähler im Postfach");
    erwarte.gleich(Spiel.post.pruefen().filter(n => n.art === "lob"), [], "kein zweites Mal");
    Spiel.post.gelesen(neu[0].id);
    erwarte.wahr(Spiel.post.von(neu[0].id).gelesen, "gelesen");
    Spiel.post.ablegen(neu[0].id);
    erwarte.wahr(!Spiel.post.liste().some(n => n.id === neu[0].id), "abgelegt = nicht mehr in der Liste");
  }));

  pruefe("kaputter Stand wird repariert, Trockenlauf erzeugt nichts", kapsel(() => {
    Spiel.st.post = [1, 2];
    const d = Spiel.post.daten();
    erwarte.wahr(Array.isArray(d.liste) && d.schon && typeof d.schon === "object", "repariert");
    const id = Object.keys(DATEN.kunden)[0];
    Spiel.kunde(id).sterne.push(5, 5, 5, 5, 5);
    Spiel._trocken = true;
    try { erwarte.gleich(Spiel.post.pruefen(), []); } finally { Spiel._trocken = false; }
  }));
});
