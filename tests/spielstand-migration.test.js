"use strict";
/* SPL-10 (3.0.0): Spielstand-Migration 2.9.0 → 3.0.0. Vertrag: docs/Architektur.md § 7.2/§ 7.4.
   End-to-End statt Einzelfunktion: ein echter 2.9.0-Stand (v:3) bleibt unverändert, ein alter Stand
   (v:1) wird vor der Migration gesichert und repariert, eine ganze 2.9.0-Exportdatei wird über
   store.initialisieren + Spiel.laden() übernommen (inkl. klassenraum-Schlüssel fassung:1 → 2),
   zu neue Stände weist importPruefen ab, und die Gegenprobe zeigt, dass die Pflichtfeld-Prüfung rot wird.
   Zahlen werden nicht geschätzt: Testdaten sind fest, Versionen kommen aus Spiel.VERSION. */
gruppe("Spiel: Spielstand-Migration 2.9 → 3.0", () => {
  function kapsel(fn, {trocken = true} = {}){
    const alt = {speicher: store.alles(), schreiber: SPEICHER.schreiber, st: Spiel._st, einst: Spiel._einst,
      lz: Spiel._lz, trocken: Spiel._trocken, uhr: jetzt(), gen: Object.assign({}, Spiel.generierte)};
    const lern = L.st, lernAlt = JSON.parse(JSON.stringify({units: lern.units, log: lern.log, fehler: lern.fehler, tage: lern.tage, tests: lern.tests}));
    try {
      Spiel._trocken = trocken; Spiel._lz = {};
      jetzt.setzen(Date.UTC(2026, 9, 31, 8, 0, 0));
      return fn();
    } finally {
      if (SPEICHER.timer) { clearTimeout(SPEICHER.timer); SPEICHER.timer = null; }
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, alt.speicher);
      SPEICHER.schreiber = alt.schreiber; SPEICHER.schmutzig = false; SPEICHER.fehler = null;
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      Spiel.generierte = alt.gen;
      lern.units = lernAlt.units; lern.log = lernAlt.log; lern.fehler = lernAlt.fehler; lern.tage = lernAlt.tage; lern.tests = lernAlt.tests;
      jetzt.setzen(alt.uhr); jetzt.frei();
    }
  }
  /* Ein echter 2.9.0-Stand: v:3, mit Inhalt in Postfach, Kunden, Kasse und Training. */
  function stand290(){
    Spiel._st = Spiel.leererStand();
    Spiel._st.stufe = 3;
    Spiel._st.euro = 42; Spiel._st.ruf = 7;
    Spiel.postfachAuffuellen();
    Spiel.st.kunden.salon = {vertrag: true, ampel: "gruen", seit: "2026-10-01", sterne: [4]};
    Spiel.st.buch.push({t: 1, euro: 20, ruf: 1, grund: "Migrationstest"});
    Spiel.st.training.je["s1"] = {versucht: 2, bestanden: 1, bestes: 3};
    Spiel.st.tagebuch.push({tag: "2026-10-01", text: "erster Tag"});
    Spiel.st.fremd27 = {x: 1};
    return JSON.parse(JSON.stringify(Spiel.st));
  }
  const PFLICHT = ["v", "euro", "ruf", "stufe", "kunden", "postfach", "aktiv", "erledigt", "playbooks", "tag", "zuletzt", "buch", "training", "einstieg", "tagesraetsel", "dex", "tagebuch"];
  const fehlendePflichtfelder = st => PFLICHT.filter(f => !(f in (st || {})));

  pruefe("Echter 2.9.0-Stand (v:3) lädt unverändert – Postfach, Erledigtes, Training und Unbekanntes bleiben", () => kapsel(() => {
    const a = stand290();
    const iid = a.postfach[0] && a.postfach[0].iid;
    store.set("labor", a);
    Spiel._st = null;
    const st = Spiel.laden();
    erwarte.gleich([st.v, st.euro, st.ruf, st.stufe], [Spiel.VERSION, 42, 7, 3], "Kernwerte bleiben");
    erwarte.gleich(!!Spiel.instanz(iid), true, "die 2.9.0-Postfach-Instanz überlebt: " + iid);
    erwarte.gleich(st.training.je.s1, {versucht: 2, bestanden: 1, bestes: 3}, "Trainingsstand bleibt");
    erwarte.gleich(st.tagebuch.length >= 1, true, "Spieltagebuch bleibt");
    erwarte.gleich(st.fremd27, {x: 1}, "unbekannte Felder bleiben (verlustfrei)");
    erwarte.gleich(fehlendePflichtfelder(st), [], "alle Pflichtfelder sind da");
    console.log("MESSUNG Migration290: v" + st.v + " · Euro " + st.euro + " · Postfach " + st.postfach.length + " · Pflichtfelder alle da");
  }));

  pruefe("Alter Stand (v:1) wird VOR der Migration gesichert und repariert", () => kapsel(() => {
    store.set(Spiel.SICHERUNG, null);
    store.set("labor", {v: 1, euro: 5, ruf: 2, stufe: 0, kunden: {salon: {vertrag: true}},
      postfach: [{kaputt: true}, null], erledigt: [{id: "a", sterne: 4}, {}], fremd: {x: 1}});
    Spiel._st = null;
    const st = Spiel.laden();
    erwarte.gleich([st.v, st.euro, st.ruf, st.stufe], [Spiel.VERSION, 5, 2, 1], "migriert, Werte bleiben");
    erwarte.gleich(st.postfach.some(i => !i.iid || !i.ticketId || !i.quelle), false, "keine unbrauchbaren Postfach-Einträge mehr");
    erwarte.gleich(st.erledigt.length, 1, "erledigt repariert");
    erwarte.gleich(st.fremd, {x: 1}, "unbekanntes Feld bleibt");
    erwarte.gleich([st.training, st.einstieg !== undefined, st.tagebuch], [{je: {}}, true, []], "v:3-Felder ergänzt");
    const s = Spiel.sicherung();
    erwarte.wahr(!!s, "vor der Migration liegt eine Sicherung");
    erwarte.gleich([s.v, s.stand.euro], [1, 5], "die Sicherung hält den ALTEN Stand (v:1, Euro 5)");
    console.log("MESSUNG MigrationAlt: v1 -> v" + st.v + " · Sicherung v" + s.v + " mit Euro " + s.stand.euro);
  }));

  pruefe("Ganze 2.9.0-Exportdatei wird übernommen – inkl. klassenraum fassung:1 → 2 und erhaltener Sicherung", () => kapsel(() => {
    const a = stand290();
    const klasse = {fassung: 1, programm: "2.9.0", platz: 4, letzte: null, zuletzt: 1, zaehler: 2,
      sitzung: {id: 5, titel: "Altstand", art: "hand", ticketId: "salon-06", skill: null, index: 0, variante: 0,
        seed: 7, eigene: false, schritte: 0, code: "NL-XXXX-XX", dauerMin: 10, plaetze: 20, erstellt: 1,
        ergebnisse: {"1": {platz: 1, sterne: 4, dauerS: 60, versuche: 0, code: "E-XXXX-XXX", zeit: 1, quelle: "eingabe"}}}};
    const datei = {format: "netzwerk-labor", version: "2.9.0", datum: "2026-10-31",
      speicher: {labor: a, einst: {wahl: "AP1"}, klassenraum: klasse,
        "labor-sicherung": {v: 3, zeit: 123, stand: {v: 3, euro: 777}}}};
    erwarte.wahr(Spiel.importPruefen(datei).ok, "2.9.0-Datei wird angenommen: " + JSON.stringify(Spiel.importPruefen(datei)));
    store.initialisieren(tief(datei.speicher), SPEICHER.schreiber, null);
    Spiel._st = null;
    Spiel.laden();
    erwarte.gleich([Spiel.st.euro, Spiel.st.ruf], [42, 7], "Spielstand übernommen");
    erwarte.gleich(Spiel.einst.wahl, "AP1", "Einstellungen übernommen");
    const sitzung = Spiel.klassenraum.sitzung();
    erwarte.gleich([sitzung.id, sitzung.titel], [5, "Altstand"], "Klassenraum-Sitzung aus 2.9.0 ist da (fassung:1 gelesen)");
    erwarte.gleich(JSON.parse(Spiel.klassenraum.exportieren()).fassung, 2, "und wird als fassung:2 weitergegeben");
    erwarte.gleich(store.get("klassenraum", null).fassung, 2, "der Schlüssel klassenraum steht nach dem Laden auf fassung:2");
    erwarte.gleich("sitzung" in store.get("klassenraum", null), false, "das Altfeld sitzung ist aufgelöst");
    const sicherung = store.get(Spiel.SICHERUNG, null);
    erwarte.gleich([sicherung && sicherung.stand && sicherung.stand.euro], [777], "die mitgelieferte Sicherung bleibt Sicherung (wird nicht laufender Stand)");
    console.log("MESSUNG MigrationDatei: 2.9.0-Export übernommen · Klasse fassung " + store.get("klassenraum").fassung + " · Sicherung Euro " + sicherung.stand.euro);
  }));

  pruefe("Fehlerfälle: zu neuer Stand abgewiesen, Stand ohne v migriert, Müll wird zum leeren Stand", () => kapsel(() => {
    const zuNeu = Spiel.importPruefen({format: "netzwerk-labor", speicher: {labor: {v: Spiel.VERSION + 1}}});
    erwarte.gleich([zuNeu.ok, zuNeu.zuNeu, zuNeu.v], [false, true, Spiel.VERSION + 1], "zu neuer Stand abgewiesen");
    const ohneV = Spiel.importPruefen({format: "netzwerk-labor", speicher: {labor: {euro: 5}}});
    erwarte.gleich([ohneV.ok, ohneV.v], [true, 0], "Stand ganz ohne v gilt als v:0 und wird migriert");
    store.set("labor", "kaputt");
    Spiel._st = null;
    const st = Spiel.laden();
    erwarte.gleich(st.v, Spiel.VERSION, "Müll wird zum leeren Stand der aktuellen Fassung");
    erwarte.gleich([st.euro, Array.isArray(st.postfach), st.postfach.every(i => i.iid && i.ticketId)], [0, true, true], "und hat keine Altlasten");
    console.log("MESSUNG MigrationFehler: zuNeu=" + zuNeu.zuNeu + " · ohneV=v" + ohneV.v + " · Müll -> v" + st.v);
  }));

  pruefe("Gegenprobe: die Pflichtfeld-Prüfung wird rot, wenn ein Pflichtfeld fehlt", () => kapsel(() => {
    const st = Spiel.migrieren({v: 2, euro: 3, ruf: 1, postfach: [], erledigt: []});
    erwarte.gleich(fehlendePflichtfelder(st), [], "der migrierte Stand ist vollständig");
    const kaputt = Object.assign({}, st);
    delete kaputt.euro;
    erwarte.gleich(fehlendePflichtfelder(kaputt), ["euro"], "fehlt euro, meldet die Prüfung genau dieses Feld (rot)");
    const kaputt2 = Object.assign({}, st);
    delete kaputt2.playbooks;
    erwarte.gleich(fehlendePflichtfelder(kaputt2), ["playbooks"], "auch playbooks wird erkannt");
  }));
});
