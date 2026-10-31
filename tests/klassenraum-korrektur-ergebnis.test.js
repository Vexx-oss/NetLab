"use strict";
/* KLR-04a (3.0.0): Ergebnis-Korrektur — Ersetzen nur mit Quittung, Entfernen mit Fehlerklassen.
   Vertrag: docs/Architektur.md § 12.2 (ergebnisEintragen mit {ersetzen,bestaetigen}, ergebnisEntfernen).
   Der ui-Dialog [Abbrechen][Ersetzen][Entfernen] (task-41) baut auf diese API. */
gruppe("Spiel: Klassenraum-Ergebnis-Korrektur (KLR-04a)", () => {
  const K = () => Spiel.klassenraum;
  const SITZUNG = 5;
  function kapsel(fn){
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
      speicher: store.alles(), uhr: jetzt()};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      jetzt.setzen(Date.UTC(2026, 10, 1, 8, 0, 0));
      return fn();
    } finally {
      if (SPEICHER.timer) { clearTimeout(SPEICHER.timer); SPEICHER.timer = null; }
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, alt.speicher);
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      jetzt.setzen(alt.uhr); jetzt.frei();
    }
  }
  const code = (platz, sterne) => KlassenraumCodec.ergebnisBauen({sitzung: SITZUNG, platz, sterne, versuche: 0, dauerS: 60});
  function mitSitzung(ergebnisse){
    const k = {fassung: 2, programm: "test", platz: null, zuletzt: 1, aktiv: SITZUNG, letzte: null, zaehler: 1,
      sitzungen: [{id: SITZUNG, titel: "T", art: "hand", ticketId: "salon-06", skill: null, index: 0, variante: 0,
        seed: 1, eigene: false, schritte: 0, code: "NL-AAAA-AA", dauerMin: 10, plaetze: 0, erstellt: 1, ergebnisse: ergebnisse || {}}]};
    store.set("klassenraum", k);
    return k;
  }
  const aktiv = () => { const k = store.get("klassenraum", null); return k.sitzungen.find(s => s.id === k.aktiv); };

  pruefe("Ersetzen am selben Platz: derselbe Code idempotent, anderer Code nur mit {ersetzen:true, bestaetigen:true}", () => kapsel(() => {
    const erst = code(1, 3), zweit = code(1, 5);
    mitSitzung({"1": {platz: 1, sterne: 3, dauerS: 60, versuche: 0, code: erst, zeit: 1, quelle: "eingabe"}});
    const gleich = K().ergebnisEintragen(erst);
    erwarte.gleich([gleich.ok, gleich.neu, gleich.grund], [true, false, "doppelt"], "derselbe Code bleibt idempotent");
    const vorher = JSON.stringify(store.get("klassenraum"));
    const ohne = K().ergebnisEintragen(zweit);
    erwarte.gleich(ohne.warnung, "platz-hat-ergebnis", "anderer Code ohne Quittung: nur Warnung");
    erwarte.gleich(JSON.stringify(store.get("klassenraum")), vorher, "und keine Änderung");
    erwarte.gleich(K().ergebnisEintragen(zweit, {ersetzen: true}).warnung, "platz-hat-ergebnis", "nur ersetzen:true reicht NICHT");
    erwarte.gleich(K().ergebnisEintragen(zweit, {bestaetigen: true}).warnung, "platz-hat-ergebnis", "nur bestaetigen:true reicht NICHT");
    const ersetzt = K().ergebnisEintragen(zweit, {ersetzen: true, bestaetigen: true});
    erwarte.gleich([ersetzt.ok, ersetzt.neu, ersetzt.ersetzt, ersetzt.platz], [true, false, true, 1], "mit beiden wird ersetzt: " + JSON.stringify(ersetzt));
    erwarte.gleich(aktiv().ergebnisse["1"].code, zweit, "der neue Code steht im Speicher");
    erwarte.gleich(aktiv().ergebnisse["1"].sterne, 5, "samt neuen Sternen");
    console.log("MESSUNG Ergebnis-Korrektur: idempotent · Warnung ohne Quittung · Ersetzen mit beiden ok");
  }));

  pruefe("Ergebnis Entfernen: unbekannter Platz = Fehler, Platz 32/ungültig = {fehler:wahl}", () => kapsel(() => {
    const c = code(1, 4);
    mitSitzung({"1": {platz: 1, sterne: 4, dauerS: 60, versuche: 0, code: c, zeit: 1, quelle: "eingabe"}});
    erwarte.gleich([K().ergebnisEntfernen(32).fehler, K().ergebnisEntfernen(-1).fehler, K().ergebnisEntfernen(1.5).fehler], ["wahl", "wahl", "wahl"], "unzulässige Plätze: wahl");
    erwarte.gleich(K().ergebnisEntfernen(2).fehler, "platz", "Platz ohne Eintrag: platz (kein stilles Nichts)");
    const ok = K().ergebnisEntfernen(1);
    erwarte.gleich([ok.ok, ok.entfernt], [true, 1], "der Eintrag wird entfernt");
    erwarte.gleich(Object.keys(aktiv().ergebnisse).length, 0, "die Ergebnisliste ist leer");
    erwarte.gleich(K().ergebnisEntfernen(1).fehler, "platz", "zweites Entfernen: platz");
    store.set("klassenraum", {fassung: 2, programm: "test", platz: null, zuletzt: 1, aktiv: null, letzte: null, zaehler: 0, sitzungen: []});
    erwarte.gleich(K().ergebnisEntfernen(1).fehler, "sitzung", "ohne Sitzung: sitzung");
    console.log("MESSUNG Ergebnis-Entfernen: 32/-1/1.5 -> wahl · leerer Platz -> platz · Eintrag weg");
  }));

  pruefe("Entfernen wirkt nur auf die AKTIVE Sitzung (fremde Sitzung bleibt unberührt)", () => kapsel(() => {
    const c = code(1, 4);
    mitSitzung({"1": {platz: 1, sterne: 4, dauerS: 60, versuche: 0, code: c, zeit: 1, quelle: "eingabe"}});
    const k = store.get("klassenraum");
    k.sitzungen.push({id: 7, titel: "Zwei", art: "hand", ticketId: "salon-06", skill: null, index: 0, variante: 0,
      seed: 1, eigene: false, schritte: 0, code: "NL-BBBB-BB", dauerMin: 10, plaetze: 0, erstellt: 2,
      ergebnisse: {"1": {platz: 1, sterne: 2, dauerS: 30, versuche: 0, code: code(1, 2), zeit: 2, quelle: "eingabe"}}});
    store.set("klassenraum", k);
    erwarte.gleich(K().ergebnisEntfernen(1).ok, true, "Eintrag der aktiven Sitzung 5 wird entfernt");
    const nach = store.get("klassenraum");
    erwarte.gleich(Object.keys(nach.sitzungen.find(s => s.id === 5).ergebnisse).length, 0, "Sitzung 5: leer");
    erwarte.gleich(Object.keys(nach.sitzungen.find(s => s.id === 7).ergebnisse).length, 1, "Sitzung 7 bleibt unberührt");
  }));
});
