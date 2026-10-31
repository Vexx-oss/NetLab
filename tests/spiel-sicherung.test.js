"use strict";
/* SPL-02 (3.0.0): Sicherung wiederherstellen — der in 2.9.0 geschriebene, aber nie gelesene Rückweg.
   Vertrag: docs/Architektur.md § 7.4 (Sicherung wiederherstellen). Ablauf wie bei einem Import:
   Stand A ist gesichert, Stand B läuft → Wiederherstellen setzt A zurück (Euro/Ruf/erledigt und alle
   übrigen Felder), schreibt den Schlüssel labor sofort und verbraucht die Sicherung. Ein zweiter Ruf
   meldet „keine Sicherung"; Fehlerfälle lassen den laufenden Stand unangetastet. */
gruppe("Spiel: Sicherung wiederherstellen", () => {
  function kapsel(fn){
    const alt = {speicher: store.alles(), schreiber: SPEICHER.schreiber, st: Spiel._st, einst: Spiel._einst,
      lz: Spiel._lz, trocken: Spiel._trocken, uhr: jetzt()};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      return fn();
    } finally {
      if (SPEICHER.timer) { clearTimeout(SPEICHER.timer); SPEICHER.timer = null; }
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, alt.speicher);
      SPEICHER.schreiber = alt.schreiber; SPEICHER.schmutzig = false; SPEICHER.fehler = null;
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      jetzt.setzen(alt.uhr); jetzt.frei();
    }
  }
  const A = () => Object.assign(Spiel.leererStand(), {
    euro: 42, ruf: 7, naechsteIid: 3,
    erledigt: [{id: "salon-01", sterne: 5, tag: "2026-10-01", hilfe: false}, {id: "salon-02", sterne: 4, tag: "2026-10-02", hilfe: true}],
    postfach: [], fremd: {x: 1},
  });
  const B = () => Object.assign(Spiel.leererStand(), {euro: 9, ruf: 1});
  /* Import nachstellen: alter Stand liegt als Sicherung, neuer Stand läuft. */
  function standAMitSicherungB(){
    store.initialisieren({labor: tief(B()), einst: {wahl: "AP2"}}, () => Promise.resolve(true), null);
    Spiel.sicherungAnlegen(tief(A()), true);
    Spiel._st = null;
    Spiel.laden();
  }
  const laborJson = () => JSON.stringify(store.get("labor", null));

  pruefe("Stand A sichern, Stand B importieren, wiederherstellen: A ist zurück und sofort geschrieben", () => kapsel(() => {
    standAMitSicherungB();
    erwarte.gleich(Spiel.st.euro, 9, "vor der Wiederherstellung läuft B");
    const s = Spiel.sicherung();
    erwarte.wahr(!!s && s.stand.euro === 42, "die Sicherung hält A (Euro 42)");
    /* Spiel.laden() füllt das Postfach regulär auf — für den reinen Vergleich A↔A kurz ausstubben. */
    const altFill = Spiel.postfachAuffuellen;
    Spiel.postfachAuffuellen = () => {};
    let r;
    try { r = Spiel.sicherungWiederherstellen(); }
    finally { Spiel.postfachAuffuellen = altFill; }
    erwarte.gleich([r.ok, r.v], [true, Spiel.VERSION], "Wiederherstellung gelingt: " + JSON.stringify(r));
    erwarte.gleich([Spiel.st.euro, Spiel.st.ruf], [42, 7], "Euro und Ruf sind zurück");
    erwarte.gleich(Spiel.st.erledigt, A().erledigt, "erledigte Aufträge sind zurück");
    erwarte.gleich(Spiel.st.postfach, [], "das Postfach ist zurück");
    erwarte.gleich(Spiel.st.fremd, {x: 1}, "auch unbekannte Felder bleiben (verlustfrei)");
    erwarte.gleich(JSON.parse(laborJson()).euro, 42, "der Stand steht sofort im Speicher (labor)");
    erwarte.gleich(Spiel.einst.wahl, "AP2", "die Einstellungen (einst) bleiben erhalten");
    erwarte.gleich(Spiel._lz, {}, "flüchtige Laufzeit ist geleert");
    erwarte.gleich(Spiel.sicherung(), null, "die Sicherung ist verbraucht (Einmal-Rückweg)");
    const nachher = laborJson();
    const zweite = Spiel.sicherungWiederherstellen();
    erwarte.gleich([zweite.fehler, typeof zweite.grund], ["keine-sicherung", "string"], "zweiter Ruf: keine Sicherung mehr: " + JSON.stringify(zweite));
    erwarte.gleich(laborJson(), nachher, "der zweite Ruf ändert nichts");
    console.log("MESSUNG Sicherung: A (Euro 42) <- B (Euro 9) · ok=" + r.ok + " · schreibt labor · 2. Ruf: " + zweite.fehler);
  }));

  pruefe("Fehlerfälle: ohne Sicherung, kaputter Stand, zu neue Fassung – Stand und Sicherung bleiben unangetastet", () => kapsel(() => {
    store.initialisieren({labor: tief(B()), einst: {}}, () => Promise.resolve(true), null);
    Spiel._st = null; Spiel.laden();
    store.set(Spiel.SICHERUNG, null);
    erwarte.gleich(Spiel.sicherungWiederherstellen().fehler, "keine-sicherung", "ohne Sicherung");
    const stand = laborJson();
    store.set(Spiel.SICHERUNG, {v: 3, zeit: 1, stand: null});
    erwarte.gleich(Spiel.sicherungWiederherstellen().fehler, "stand", "Sicherung ohne Stand");
    erwarte.gleich(laborJson(), stand, "der laufende Stand bleibt unverändert");
    erwarte.wahr(!!store.get(Spiel.SICHERUNG, null), "die unbrauchbare Sicherung bleibt im Speicher liegen (kein stilles Löschen)");
    store.set(Spiel.SICHERUNG, {v: Spiel.VERSION + 1, zeit: 1, stand: {v: Spiel.VERSION + 1, euro: 1}});
    const zuNeu = Spiel.sicherungWiederherstellen();
    erwarte.gleich(zuNeu.fehler, "fassung", "zu neue Sicherung");
    erwarte.enthaelt(zuNeu.grund, "neueren Fassung");
    erwarte.gleich(laborJson(), stand, "auch dabei bleibt der Stand unverändert");
    console.log("MESSUNG Sicherung-Fehler: keine-sicherung · stand · fassung — Stand unverändert");
  }));

  pruefe("Alte Sicherung (v:2) wird beim Wiederherstellen wie ein Altstand migriert", () => kapsel(() => {
    store.initialisieren({labor: tief(B()), einst: {}}, () => Promise.resolve(true), null);
    Spiel._st = null; Spiel.laden();
    store.set(Spiel.SICHERUNG, {v: 2, zeit: 1, stand: {v: 2, euro: 5, ruf: 2, postfach: [], kunden: {}, erledigt: []}});
    const r = Spiel.sicherungWiederherstellen();
    erwarte.gleich(r.ok, true, "alte Sicherung wird angenommen: " + JSON.stringify(r));
    erwarte.gleich([Spiel.st.v, Spiel.st.euro, Spiel.st.ruf], [Spiel.VERSION, 5, 2], "migriert und wiederhergestellt");
    console.log("MESSUNG Sicherung-alt: v2 (Euro 5) -> v" + Spiel.st.v + " mit Euro " + Spiel.st.euro);
  }));

});
