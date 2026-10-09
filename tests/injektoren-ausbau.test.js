"use strict";
/* Ausbau 3.0, task-54: sechs neue Fehlerbilder mit je einer Trainingskarte.

   Warum diese Datei: „Wirkung vor Grün" — ein Injektor zählt erst, wenn er im Netz wirklich etwas
   bricht UND die Lösung es wieder heilt. Je Injektor wird deshalb gemessen:
     (a) ein erwartetes Ziel ist im Startnetz wirklich nicht mehr erreichbar (Grund aus `gruende`),
     (b) nach `Spiel.loesungAnwenden` ist jedes Netz-Ziel wieder erfüllt,
     (c) die zugehörige Trainingskarte ist offen, startbar und mit ihrer Lösung bestehbar.

   Vier der sechs Fälle lösen Grundcodes aus, die vorher KEIN Injektor auslöste: DEVICE_OFF,
   DHCP_POOL_EMPTY, DHCP_RESERVED_BUSY, DHCP_CONFLICT (gemessen über `i.gruende` gegen `Sim.GRUENDE`).
   Kein neuer Grundcode, keine Änderung an `src/sim/` — nur neue Störungen. */
gruppe("Injektoren: Ausbau 3.0", () => {
  /* Wegwerf-Spielstand wie in tests/injektoren-neu.test.js: eigene Karten legen Instanzen an. */
  function kapsel(fn){
    return () => {
      const alt = {
        st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
        gen: Object.assign({}, Spiel.generierte), speicher: store.alles(), uhr: jetzt(),
      };
      const lern = L.st;
      const lernAlt = JSON.parse(JSON.stringify({units: lern.units, log: lern.log, fehler: lern.fehler, tage: lern.tage, tests: lern.tests}));
      try {
        Spiel._trocken = true; Spiel._lz = {};
        Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
        Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
        jetzt.setzen(Date.UTC(2026, 9, 8, 9, 0, 0));
        return fn();
      } finally {
        Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
        for (const k of Object.keys(Spiel.generierte)) if (!(k in alt.gen)) delete Spiel.generierte[k];
        for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
        Object.assign(SPEICHER.daten, alt.speicher);
        lern.units = lernAlt.units; lern.log = lernAlt.log; lern.fehler = lernAlt.fehler; lern.tage = lernAlt.tage; lern.tests = lernAlt.tests;
        jetzt.setzen(alt.uhr); jetzt.frei();
      }
    };
  }

  /* Die sechs neuen Fälle: Injektor, Vorlage, gemessener Grund des ersten gebrochenen Ziels, Karte.
     Der genannte Grund ist der, den die Messung (siehe Bericht) wirklich zeigt — nicht der Wunsch. */
  const NEU = [
    {name: "geraet-stromlos", vorlage: "buero", grund: "DEVICE_OFF", karte: "tr-strom-aus"},
    {name: "dhcp-pool-zu-klein", vorlage: "buero", grund: "DHCP_POOL_EMPTY", karte: "tr-dhcp-pool-leer"},
    {name: "dhcp-adresse-reserviert", vorlage: "buero", grund: "DHCP_RESERVED_BUSY", karte: "tr-dhcp-reserviert"},
    {name: "dhcp-adresskonflikt", vorlage: "buero", grund: "DHCP_CONFLICT", karte: "tr-dhcp-konflikt"},
    {name: "route-maske-falsch", vorlage: "standorte", grund: "TIMEOUT", karte: "tr-route-maske"},
    {name: "dns-eintrag-falsch", vorlage: "buero", grund: "PORT_CLOSED", karte: "tr-dns-falsches-geraet"},
  ];

  for (const f of NEU) {
    pruefe(`Neuer Injektor ${f.name}: bricht wirklich (${f.grund}), Lösung heilt, Karte ${f.karte} ist offen`, () => {
      const inj = Spiel.INJEKTOREN[f.name];
      erwarte.wahr(!!inj, `${f.name} ist nicht angemeldet`);
      let gebaut = 0;
      for (let seed = 1; seed <= 2; seed++) {
        const wo = `${f.name}/Seed ${seed}`;
        const def = Spiel.ticketBauen({id: `ausbau-${f.name}-${seed}`, vorlage: f.vorlage, vSeed: seed * 101,
          injektoren: [{name: f.name, wahl: seed}], stufe: "E"});
        erwarte.wahr(!!def, `${wo}: kein Ticket gebaut`);
        const erwartet = def.ziele.filter(z => z.erwartet);
        erwarte.wahr(erwartet.length >= 1, `${wo}: kein gebrochenes Ziel`);
        erwarte.wahr((inj.gruende || []).includes(erwartet[0].erwartet), `${wo}: erster Grund ${erwartet[0].erwartet} steht nicht in gruende`);
        const start = def.netz(Zufall(1));
        erwarte.falsch(Sim.pruefeZiel(start, erwartet[0]).ok, `${wo}: Startnetz bricht das erste Ziel nicht`);
        erwarte.gleich(Spiel.ticketGueltig(def), true, `${wo}: ticketGueltig false`);
        const heil = def.netz(Zufall(1));
        Spiel.loesungAnwenden(heil, def.loesung);
        const offen = def.ziele.filter(z => !Spiel.istArbeitsziel(z))
          .filter(z => { try { return !Sim.pruefeZiel(heil, z).ok; } catch (e) { return true; } })
          .map(z => z.text);
        erwarte.gleich(offen, [], `${wo}: Lösung heilt nicht`);
        gebaut++;
      }
      erwarte.gleich(gebaut, 2, `${f.name}: nur ${gebaut} Fälle geprüft`);
      const karte = Spiel.TRAINING.find(t => t.id === f.karte);
      erwarte.wahr(!!karte, `${f.karte} fehlt in der Trainingsliste`);
      erwarte.gleich(karte.skill, (inj.skills || [])[0], `${f.karte}: andere Fertigkeit als der Injektor`);
      erwarte.gleich(Spiel.training.liste().find(e => e.id === f.karte).offen, true, `${f.karte} ist nicht offen`);
    });
  }

  pruefe("Vier vorher ungenutzte Grundcodes sind jetzt von Injektoren belegt", () => {
    const genutzt = new Set();
    for (const i of Object.values(Spiel.INJEKTOREN)) for (const g of i.gruende || []) genutzt.add(g);
    const vorher = ["DEVICE_OFF", "DHCP_POOL_EMPTY", "DHCP_RESERVED_BUSY", "DHCP_CONFLICT"];
    erwarte.gleich(vorher.filter(c => !genutzt.has(c)), [], "Grundcode ohne Injektor");
    erwarte.wahr(vorher.every(c => Sim.GRUENDE[c]), "jeder Code steht in Sim.GRUENDE");
    erwarte.wahr(Object.keys(Spiel.INJEKTOREN).length >= 45, `nur ${Object.keys(Spiel.INJEKTOREN).length} Injektoren`);
    erwarte.wahr(DATEN.trainings.length >= 40, `nur ${DATEN.trainings.length} Trainingskarten`);
    /* Kein neuer Grundcode: die vier standen schon in Sim.GRUENDE (Architektur § 5.3 unberührt). */
    erwarte.gleich(vorher.filter(c => !(c in Sim.GRUENDE)), [], "neuer Grundcode nötig gewesen");
  });

  pruefe("Jede der sechs neuen Karten öffnet, startet und besteht die Abnahme", kapsel(() => {
    const fehler = [];
    for (const f of NEU) {
      const r = Spiel.training.starten(f.karte);
      if (!r || !r.ok) { fehler.push(`${f.karte}: startet nicht – ${(r && r.grund) || "kein ok"}`); continue; }
      const inst = Spiel.instanz(r.iid);
      const def = Spiel.defVon(inst);
      if (!inst || !def) { fehler.push(`${f.karte}: keine auflösbare Instanz`); continue; }
      Spiel.oeffnen(inst.iid);
      Spiel.loesung(inst.netz, def.loesung);
      Spiel.arbeitszieleErfuellen(inst);
      const ab = Spiel.abnahme(inst);
      if (!ab.bestanden) {
        fehler.push(`${f.karte}: Abnahme nicht bestanden – offen ${JSON.stringify(ab.ergebnisse.filter(e => !e.ok).map(e => [e.ziel.typ, e.grund]))}, Kollateral ${JSON.stringify(ab.kollateral.map(k => [k.von, k.nach, k.grund]))}`);
      }
    }
    if (fehler.length) console.log(fehler.join(String.fromCharCode(10)));
    erwarte.gleich(fehler, [], "sechs Karten über den echten Trainingsweg");
  }));
});
