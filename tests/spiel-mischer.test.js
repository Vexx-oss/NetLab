"use strict";
/* MISCHER (Plan – Ausbau 1.2, E1/E2; Architektur § 9.6): Postfach als Wahl. 1000 simulierte Postfächer mit je 12 Abschlüssen:
   nie dieselbe Form mehr als zweimal in Folge, nie gezwungen dazu, neue Angebote möglichst verschiedener Form und Kunden. */
gruppe("Spiel: Mischer", () => {
  pruefe("1000 Postfächer: nie dieselbe Form > 2× in Folge, Angebote in Form (und möglichst Kunde) verschieden", () => {
    const FORMEN = ["stoerung", "projekt", "terminal", "forensik", "audit", "beratung", "hotline"];
    const KUNDEN = ["salon", "baeckerei", "schreibbuero", "praxis", "autohaus"];
    const z = Zufall("mischer-test");
    let dreifach = 0, gezwungen = 0, einfalt = 0, kundenGleich = 0, saetze = 0, runden = 0;
    for (let p = 0; p < 1000; p++) {
      const formen = FORMEN.slice(0, 2 + z.zahl(6)), kunden = KUNDEN.slice(0, 1 + z.zahl(5));
      const kandidaten = [];
      for (const f of formen) for (const k of kunden) kandidaten.push({form: f, kunde: k, gewicht: 1 + z.zahl(3), schluessel: f + ":" + k});
      let offen = [];
      const verlauf = [];
      for (let r = 0; r < 12; r++) {
        const neu = Spiel.mischer.waehlen({kandidaten: kandidaten.filter(k => !offen.includes(k)), offen, verlauf, n: 4 - offen.length, z});
        if (!offen.length) {
          saetze++;
          if (new Set(neu.map(x => x.form)).size < Math.min(neu.length, formen.length)) einfalt++;
          if (kunden.length >= neu.length && formen.length >= neu.length && new Set(neu.map(x => x.kunde)).size < neu.length) kundenGleich++;
        }
        offen = [...offen, ...neu];
        const sperre = Spiel.mischer.gesperrt(verlauf);
        const erlaubt = offen.filter(o => o.form !== sperre);
        if (!erlaubt.length) { gezwungen++; break; }
        const nimm = z.zahl(2) ? erlaubt[0] : erlaubt[z.zahl(erlaubt.length)];      /* Hub-Vorschlag oder freie Wahl */
        offen = offen.filter(o => o !== nimm);
        verlauf.push(nimm.form);
        runden++;
        const n = verlauf.length;
        if (n >= 3 && verlauf[n - 1] === verlauf[n - 2] && verlauf[n - 2] === verlauf[n - 3]) dreifach++;
      }
    }
    erwarte.gleich({dreifach, gezwungen, einfalt}, {dreifach: 0, gezwungen: 0, einfalt: 0}, `${runden} Abschlüsse in 1000 Postfächern`);
    erwarte.wahr(kundenGleich / saetze < 0.02, `Kunden doppelt in ${kundenGleich} von ${saetze} ersten Angeboten`);
  });

  pruefe("Sperre: zweimal dieselbe Form → keine neuen Angebote dieser Form, im Postfach steht sie unten", () => {
    const kand = ["stoerung", "audit"].flatMap(f => ["salon", "baeckerei"].map(k => ({form: f, kunde: k, schluessel: f + k})));
    for (let s = 1; s <= 50; s++) {
      const w = Spiel.mischer.waehlen({kandidaten: kand, verlauf: ["audit", "stoerung", "stoerung"], n: 3, z: Zufall(s)});
      erwarte.wahr(w.length === 2 && w.every(k => k.form === "audit"), JSON.stringify(w));
    }
    erwarte.gleich(Spiel.mischer.gesperrt(["audit", "stoerung"]), null);
  });

  pruefe("Story stockt nie: Liegt kein Story-Auftrag im Postfach, ist der nächste (kleinster Rang, nicht gesperrt) dabei", () => {
    const formen = ["stoerung", "projekt", "terminal", "forensik", "audit", "beratung", "hotline"];
    for (let s = 1; s <= 200; s++) {
      const z = Zufall("story" + s);
      const kand = formen.map((f, i) => ({form: f, kunde: "k" + (i % 3), schluessel: f, story: i < 3, rang: (i * 7 + s) % 11}));
      const verlauf = [z.wahl(formen), z.wahl(formen)];
      const w = Spiel.mischer.waehlen({kandidaten: kand, offen: [], verlauf, n: 3, z});
      const sperre = Spiel.mischer.gesperrt(verlauf);
      const erwartet = kand.filter(k => k.story && k.form !== sperre).sort((a, b) => a.rang - b.rang)[0];
      erwarte.gleich(w[0] && w[0].schluessel, erwartet.schluessel, "Seed " + s);
      erwarte.gleich(new Set(w.map(k => k.form)).size, 3, "drei Formen");
    }
  });
});
