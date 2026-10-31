"use strict";
/* KLR-04a (3.0.0): Sitzungs-Korrektur und Grenzen — loeschen mit Quittung, kein stilles Klemmen.
   Vertrag: docs/Architektur.md § 12.2 (sitzungLoeschen, erzeugen/bestaetigen, plaetze-Grenze).
   Rot-Beleg vor dem Code: sitzungLoeschen fehlte (TypeError), plaetze:32 wurde still auf 0 geklemmt. */
gruppe("Spiel: Klassenraum-Korrektur (KLR-04a)", () => {
  const K = () => Spiel.klassenraum;
  function kapsel(fn){
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
      speicher: store.alles(), uhr: jetzt()};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      store.set("klassenraum", null);
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
  const wurzel = () => store.get("klassenraum", null);
  const sess = (id, ergebnisse) => ({id, titel: "T" + id, art: "hand", ticketId: "salon-06", skill: null, index: 0,
    variante: 0, seed: 1, eigene: false, schritte: 0, code: "NL-AAAA-AA", dauerMin: 10, plaetze: 0,
    erstellt: 1, ergebnisse: ergebnisse || {}});
  const voll = ids => ({fassung: 2, programm: "test", platz: null, zuletzt: 1, sitzungen: ids.map(id => sess(id)),
    aktiv: ids[ids.length - 1], letzte: null, zaehler: 31});
  const ergebnis = platz => ({platz, sterne: 4, dauerS: 60, versuche: 0, code: "E-AAAA-AAA", zeit: 1, quelle: "eingabe"});

  pruefe("32. Sitzung: klarer Fehler (sitzung) ohne Änderung", () => kapsel(() => {
    /* § 12.2 (3.0.0): die Namensliste wächst — nicht auf eine harte Zahl prüfen, sondern auf die Namen. */
    const namen = ["erzeugen", "sitzung", "sitzungen", "sitzungWaehlen", "sitzungLoeschen", "ergebnisEintragen", "exportieren", "importieren"];
    erwarte.gleich(namen.filter(n => typeof K()[n] !== "function"), [], "alle §12.2-Namen sind Funktionen");
    erwarte.wahr(Object.keys(K()).length >= 22, "§12.2: mindestens 22 öffentliche Namen (ist " + Object.keys(K()).length + ")");
    erwarte.wahr(typeof K().migrierenStand === "function", "migrierenStand bleibt interner Helfer für Spiel.laden (nicht §12.2) — die Zahl zählt nur öffentliche Namen");
    store.set("klassenraum", voll(Array.from({length: 31}, (_, i) => i + 1)));
    const vorher = JSON.stringify(wurzel());
    const r = K().erzeugen({ticketId: "salon-06", seed: 7});
    erwarte.gleich(r.fehler, "sitzung", "32. Sitzung wird abgewiesen: " + JSON.stringify(r));
    erwarte.wahr(typeof r.grund === "string" && r.grund.length > 0, "mit Begründung");
    erwarte.gleich(JSON.stringify(wurzel()), vorher, "der Speicher bleibt unverändert");
  }));

  pruefe("sitzungLoeschen: unbekannt = Fehler; Ergebnisse nur mit bestaetigen; aktiv wird sauber nachgezogen", () => kapsel(() => {
    store.set("klassenraum", voll([1, 2, 3]));
    store.set("klassenraum", Object.assign({}, wurzel(), {aktiv: 2}));
    erwarte.gleich(K().sitzungLoeschen(99).fehler, "sitzung", "unbekannte Kennung ist ein Fehler");
    /* Sitzung 2 ist aktiv und hat ein Ergebnis. */
    const k = wurzel(); k.sitzungen[1].ergebnisse = {"1": ergebnis(1)}; store.set("klassenraum", k);
    const vorher = JSON.stringify(wurzel());
    const ohne = K().sitzungLoeschen(2);
    erwarte.gleich(ohne.warnung, "sitzung-hat-ergebnisse", "ohne bestaetigen nur die Warnung: " + JSON.stringify(ohne));
    erwarte.gleich(JSON.stringify(wurzel()), vorher, "und keine Änderung");
    const mit = K().sitzungLoeschen(2, {bestaetigen: true});
    erwarte.gleich([mit.ok, mit.geloescht, mit.aktiv], [true, 2, 3], "mit bestaetigen: gelöscht, aktiv = zuletzt angelegte verbleibende (3)");
    erwarte.gleich(K().sitzungen().map(s => s.id), [1, 3], "Sitzung 2 ist aus der Liste");
    /* Ergebnislose Sitzung darf ohne Quittung weg. */
    const r1 = K().sitzungLoeschen(1);
    erwarte.gleich([r1.ok, r1.geloescht, r1.aktiv], [true, 1, 3], "ergebnislose Sitzung ohne Quittung löschbar");
    /* Löschen der letzten Sitzung: aktiv wird null. */
    const r3 = K().sitzungLoeschen(3);
    erwarte.gleich([r3.ok, K().sitzung(), K().sitzungen().length], [true, null, 0], "leere Liste: keine aktive Sitzung mehr");
    console.log("MESSUNG KLR-04a: 32. verweigert · löschen ohne Quittung verweigert · mit Quittung ok · aktiv nachgezogen");
  }));

  pruefe("Kein stilles Klemmen: plaetze 32/-1/1.5 = Fehler (wahl), 0 bleibt nicht eingestellt", () => kapsel(() => {
    const vorher = JSON.stringify(wurzel());
    for (const wert of [32, -1, 1.5]){
      const r = K().erzeugen({ticketId: "salon-06", seed: 7, plaetze: wert});
      erwarte.gleich(r.fehler, "wahl", "plaetze=" + wert + " wird abgewiesen: " + JSON.stringify(r));
    }
    erwarte.gleich(JSON.stringify(wurzel()), vorher, "kein Fehlversuch legt eine Sitzung an");
    const ok = K().erzeugen({ticketId: "salon-06", seed: 7, plaetze: 0});
    erwarte.gleich([ok.fehler === undefined, ok.plaetze], [true, 0], "0 = nicht eingestellt ist erlaubt");
  }));

  pruefe("Eine gelöschte Kennung wird wieder vergeben (Gegenprobe zur Sperre)", () => kapsel(() => {
    store.set("klassenraum", voll(Array.from({length: 31}, (_, i) => i + 1)));
    erwarte.gleich(K().erzeugen({ticketId: "salon-06", seed: 7}).fehler, "sitzung", "voll belegt");
    const r = K().sitzungLoeschen(17);
    erwarte.gleich([r.ok, r.geloescht], [true, 17], "Sitzung 17 gelöscht");
    const neu = K().erzeugen({ticketId: "salon-06", seed: 7});
    erwarte.gleich([neu.fehler === undefined, neu.id], [true, 17], "die freie Kennung 17 wird wieder vergeben: " + JSON.stringify(neu));
    erwarte.gleich(K().sitzungen().length, 31, "wieder 31 Sitzungen");
  }));
});
