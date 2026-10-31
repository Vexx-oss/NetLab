"use strict";
/* KLR-05a (3.0.0): Diagnose-Aggregat — anonyme Zähler je Schritt, keine Platz→Schritt-Zuordnung.
   Vertrag: docs/Architektur.md § 12.1 (16. Sitzungsfeld diagnose) und § 12.2 (diagnoseZaehlen, diagnose).
   Abnahme aus berichte/klassenraum.md § KLR-05: 20 H-Codes (5/7/8 je Schritt) → Zählung 5/7/8;
   Gegenprobe mit Personenfeld wird rot; der Speicher enthält keine Einzelzuordnung. */
gruppe("Spiel: Klassenraum-Diagnose (KLR-05a)", () => {
  const K = () => Spiel.klassenraum;
  const CODE = "H";
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
  const hilfe = (id, platz, schritt) => KlassenraumCodec.hilfeBauen({sitzung: id, platz, schritt, offen: Math.max(0, 5 - schritt)});
  /* Personenbezug: Feldnamen, die in einem anonymen Aggregat NICHTS zu suchen haben. */
  const PERSON = /name|schueler|schüler|note|zensur|rang|bewertung|platz|kennung/i;
  const personenFelder = obj => Object.keys(obj || {}).filter(k => PERSON.test(k));

  pruefe("20 H-Codes (5/7/8 je Schritt) werden anonym zu 5/7/8 gezählt", () => kapsel(() => {
    const s = K().erzeugen({ticketId: "salon-06", seed: 7, plaetze: 20});
    erwarte.falsch(!!s.fehler, "Sitzung angelegt: " + JSON.stringify(s && s.grund));
    const plan = [];
    for (let i = 0; i < 5; i++) plan.push([i + 1, 1]);
    for (let i = 0; i < 7; i++) plan.push([6 + i, 2]);
    for (let i = 0; i < 8; i++) plan.push([13 + i, 3]);
    const zurueck = [];
    for (const [platz, schritt] of plan){
      const r = K().diagnoseZaehlen(hilfe(s.id, platz, schritt));
      if (r.ok) zurueck.push(r);
    }
    erwarte.gleich(zurueck.length, 20, "20 gültige H-Codes wurden gezählt");
    const d = K().diagnose();
    erwarte.gleich(d.schritte, [{schritt: 1, anzahl: 5}, {schritt: 2, anzahl: 7}, {schritt: 3, anzahl: 8}], "Histogramm 5/7/8: " + JSON.stringify(d.schritte));
    erwarte.gleich([d.gesamt, d.plaetze], [20, 20], "gesamt 20, Nenner 20 (fuer Schritt k: n von 20)");
    erwarte.gleich(zurueck[0], {ok: true, schritt: 1, anzahl: 1}, "Rückgabe je Code: schritt + neuer Stand");
    console.log("MESSUNG Diagnose: 20 Codes -> " + JSON.stringify(d.schritte) + " · gesamt " + d.gesamt + " von " + d.plaetze);
  }));

  pruefe("Keine Einzelzuordnung, kein Personenbezug — Diagnose ist reine Zählung je Schritt", () => kapsel(() => {
    const s = K().erzeugen({ticketId: "salon-06", seed: 7, plaetze: 20});
    K().diagnoseZaehlen(hilfe(s.id, 1, 2));
    K().diagnoseZaehlen(hilfe(s.id, 7, 3));
    const roh = store.get("klassenraum");
    const ses = roh.sitzungen.find(x => x.id === s.id);
    erwarte.wahr(!!ses.diagnose && typeof ses.diagnose === "object" && !Array.isArray(ses.diagnose), "diagnose ist ein Objekt");
    erwarte.gleich(Object.keys(ses.diagnose).sort(), ["2", "3"], "Schlüssel sind nur Schritte");
    erwarte.gleich(personenFelder(ses.diagnose), [], "kein Personen-/Platzfeld in der Diagnose");
    const text = JSON.stringify(ses.diagnose);
    erwarte.falsch(/name|platz|schueler|schüler|note|rang/i.test(text), "serialisierte Diagnose ohne Personenbezug: " + text);
    /* Gegenprobe: ein eingeschmuggeltes Personenfeld macht die Prüfung ROT. */
    const kaputt = Object.assign({}, ses.diagnose, {name: 1});
    erwarte.gleich(personenFelder(kaputt), ["name"], "Gegenprobe: name wird erkannt (rot)");
    const kaputt2 = Object.assign({}, ses.diagnose, {"platz": 3});
    erwarte.gleich(personenFelder(kaputt2), ["platz"], "Gegenprobe: platz wird erkannt (rot)");
  }));

  pruefe("Fehlerfälle: unlesbarer Code und fremde Sitzung ändern nichts; ohne Sitzung leere Diagnose", () => kapsel(() => {
    const s = K().erzeugen({ticketId: "salon-06", seed: 7, plaetze: 20});
    K().diagnoseZaehlen(hilfe(s.id, 1, 1));
    const vorher = JSON.stringify(store.get("klassenraum"));
    const unlesbar = K().diagnoseZaehlen("H-GIBT-ES");
    erwarte.wahr(["länge", "zeichen", "prüfziffer"].includes(unlesbar.fehler), "unlesbarer Code: Codec-Fehlerklasse (" + unlesbar.fehler + ")");
    erwarte.gleich(JSON.stringify(store.get("klassenraum")), vorher, "Fehlversuch ändert den Speicher nicht");
    const fremd = (s.id % 31) + 1;
    erwarte.gleich(K().diagnoseZaehlen(hilfe(fremd, 1, 1)).fehler, "sitzung", "fremde Sitzung: sitzung");
    store.set("klassenraum", null);
    erwarte.gleich(K().diagnose(), {plaetze: 0, gesamt: 0, schritte: []}, "ohne Sitzung leere Diagnose");
  }));

  pruefe("Altstand ohne diagnose-Feld und Export/Import: Zähler bleiben erhalten", () => kapsel(() => {
    const alt = {fassung: 2, programm: "test", platz: null, zuletzt: 1, aktiv: 4, letzte: null, zaehler: 1,
      sitzungen: [{id: 4, titel: "Alt", art: "hand", ticketId: "salon-06", skill: null, index: 0, variante: 0, seed: 1,
        eigene: false, schritte: 0, code: "NL-AAAA-AA", dauerMin: 10, plaetze: 20, erstellt: 1, ergebnisse: {}}]};
    store.set("klassenraum", alt);
    erwarte.gleich(K().diagnoseZaehlen(hilfe(4, 2, 2)).ok, true, "Altstand ohne diagnose-Feld wird nachgezogen");
    const d = K().diagnose();
    erwarte.gleich([d.gesamt, d.schritte], [1, [{schritt: 2, anzahl: 1}]], "Zähler da, kein Datenverlust");
    const text = K().exportieren();
    store.set("klassenraum", null);
    erwarte.gleich(K().importieren(text).ok, true, "Export/Import gelingt");
    erwarte.gleich(K().diagnose().schritte, [{schritt: 2, anzahl: 1}], "Diagnose überlebt Export/Import");
    const felder = Object.keys(K().sitzung()).sort();
    erwarte.wahr(felder.includes("diagnose"), "die Sitzung trägt das 16. Feld diagnose: " + felder.join(","));
  }));
});
