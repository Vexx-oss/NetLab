"use strict";
/* KLR-01a (3.0.0): Sitzungsverwaltung — mehrere Sitzungen, fassung 2, Export/Import ALLER Sitzungen.
   Vertrag: docs/Architektur.md § 12.1 (Datenform), § 12.2 (API). Entscheidungen des Leads (31.10.2026):
   fassung 2 = mehrere Sitzungen + eine aktive; Migration 1→2 beim Lesen; IDs eindeutig 1..31;
   ergebnisEintragen schreibt in die per Code adressierte Sitzung (auch wenn sie nicht aktiv ist);
   sitzungen() liefert tiefe Kopien; erzeugen ersetzt eine aktive Sitzung mit Ergebnissen erst mit
   `bestaetigen:true`. Die ALT-Erwartung ("die zweite verdrängt die erste", tests/klassen-20.test.js)
   ist damit überholt — dieser Test hält das 3.0-Soll fest. */
gruppe("Spiel: Klassenraum-Sitzungen", () => {
  const K = () => Spiel.klassenraum;

  /* Wegwerf-Umgebung (Muster tests/klassenraum.test.js): Spielstand, Einstellungen, GANZER Speicher,
     Lernmotor und Uhr werden wiederhergestellt. */
  function kapsel(fn){
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
      gen: Object.assign({}, Spiel.generierte), speicher: store.alles(), uhr: jetzt()};
    const lern = L.st;
    const lernAlt = JSON.parse(JSON.stringify({units: lern.units, log: lern.log, fehler: lern.fehler, tage: lern.tage, tests: lern.tests}));
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      store.set("klassenraum", null);
      jetzt.setzen(Date.UTC(2026, 9, 30, 8, 0, 0));
      return fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      for (const k of Object.keys(Spiel.generierte)) if (!(k in alt.gen)) delete Spiel.generierte[k];
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, alt.speicher);
      lern.units = lernAlt.units; lern.log = lernAlt.log; lern.fehler = lernAlt.fehler; lern.tage = lernAlt.tage; lern.tests = lernAlt.tests;
      store.set("lern", lern);
      jetzt.setzen(alt.uhr); jetzt.frei();
    }
  }

  /* Der Öffnungsweg (§ 12.2): Code lesen → Instanz bauen → klassenraum merken → lösen. */
  function oeffnen(code, {platz = 0} = {}){
    const c = K().ausCode(code);
    if (!c || c.fehler) return {c};
    const inst = Spiel.instanzErstellen(c.skill
      ? {gen: {skill: c.skill, seed: c.seed}, quelle: "klassenraum", ohneFlow: true}
      : {ticketId: c.ticketId, seed: c.seed, quelle: "klassenraum", ohneFlow: true});
    inst.klassenraum = {sitzung: c.sitzung, platz, code: c.code};
    Spiel.oeffnen(inst.iid);
    Spiel.loesung(inst.netz, Spiel.defVon(inst).loesung);
    if (typeof Spiel.arbeitszieleErfuellen === "function") Spiel.arbeitszieleErfuellen(inst);
    return {c, inst};
  }
  /* Einen ECHTEN Ergebnis-Code bauen und eintragen. */
  function eintragen(s, platz){
    const {inst} = oeffnen(s.code, {platz});
    inst.zeitMs = 60000;
    const ab = Spiel.abnahme(inst);
    const code = K().ergebnisCode(inst, ab);
    return {code, r: K().ergebnisEintragen(code)};
  }
  const wurzel = () => store.get("klassenraum", null);
  const aktivIn = k => (k && Array.isArray(k.sitzungen)) ? (k.sitzungen.find(s => s.id === k.aktiv) || null) : null;
  const felder = s => Object.keys(s).sort();

  /* ---------- 1 · Zwei Sitzungen parallel (P0-Kern) ---------- */
  pruefe("Zwei Sitzungen parallel: keine verdrängt die andere, jede behält ihre Ergebnisse", () => kapsel(() => {
    const s1 = K().erzeugen({ticketId: "salon-06", seed: 7, plaetze: 2});
    erwarte.falsch(!!s1.fehler, "Sitzung 1 angelegt: " + JSON.stringify(s1 && s1.grund));
    const e1 = eintragen(s1, 1);
    erwarte.gleich([e1.r.ok, e1.r.neu], [true, true], "Sitzung 1 nimmt ein Ergebnis an: " + JSON.stringify(e1.r));
    const vorher = JSON.stringify(wurzel());

    const ohne = K().erzeugen({ticketId: "salon-02", seed: 3});
    erwarte.gleich(ohne.warnung, "sitzung-hat-ergebnisse", "ohne bestaetigen kommt NUR die Warnung: " + JSON.stringify(ohne));
    erwarte.gleich(JSON.stringify(wurzel()), vorher, "und der Speicher bleibt unverändert");

    const s2 = K().erzeugen({ticketId: "salon-02", seed: 3, bestaetigen: true});
    erwarte.falsch(!!s2.fehler || !!s2.warnung, "mit bestaetigen:true wird die neue Sitzung angelegt: " + JSON.stringify(s2));
    erwarte.gleich(K().sitzung().id, s2.id, "die neue Sitzung ist aktiv");
    const liste = K().sitzungen();
    erwarte.gleich(liste.length, 2, "beide Sitzungen sind gespeichert (KLR-01a)");
    erwarte.gleich([liste[0].id, liste[1].id], [s1.id, s2.id], "Reihenfolge = Anlage");
    erwarte.gleich([liste[0].aktiv, liste[1].aktiv], [false, true], "genau eine ist aktiv");
    erwarte.gleich(Object.keys(liste[0].ergebnisse).length, 1, "Sitzung 1 behält ihr Ergebnis");
    erwarte.gleich(Object.keys(liste[1].ergebnisse).length, 0, "Sitzung 2 beginnt leer");
    const w = K().sitzungWaehlen(s1.id);
    erwarte.gleich([w.ok, K().sitzung().id], [true, s1.id], "sitzungWaehlen setzt die aktive Sitzung");
    erwarte.gleich(K().sitzungWaehlen(99).fehler, "sitzung", "unbekannte id ist ein Fehler, kein stilles Ersetzen");
    console.log(`MESSUNG Sitzungen: S1=${s1.id} (${s1.code}) mit 1 Ergebnis · S2=${s2.id} (${s2.code}) · Warnung ohne bestaetigen: ${ohne.warnung}`);
  }));

  /* ---------- 2 · ergebnisEintragen adressiert die Code-Sitzung (auch ohne aktiv) ---------- */
  pruefe("Ein Ergebnis-Code landet in SEINER Sitzung, auch wenn eine andere aktiv ist", () => kapsel(() => {
    const s1 = K().erzeugen({ticketId: "salon-06", seed: 7});
    eintragen(s1, 1);
    const s2 = K().erzeugen({ticketId: "salon-02", seed: 3, bestaetigen: true});
    erwarte.gleich(K().sitzung().id, s2.id, "S2 ist aktiv");
    const e2 = eintragen(s2, 2);
    erwarte.gleich([e2.r.ok, e2.r.neu], [true, true], "S2 nimmt ein Ergebnis an");
    /* S2 bleibt aktiv; ein Code für S1 muss trotzdem in S1 landen (Lead-Entscheid 2). */
    erwarte.gleich(K().sitzung().id, s2.id, "die aktive Sitzung bleibt S2");
    const codeS1 = KlassenraumCodec.ergebnisBauen({sitzung: s1.id, platz: 3, sterne: 4, versuche: 0, dauerS: 120});
    const vorherS2 = JSON.stringify(K().sitzungen().find(x => x.id === s2.id).ergebnisse);
    const e3 = K().ergebnisEintragen(codeS1);
    erwarte.gleich([e3.ok, e3.neu, e3.platz], [true, true, 3], "Code der NICHT aktiven Sitzung 1 wird angenommen: " + JSON.stringify(e3));
    erwarte.gleich(JSON.stringify(K().sitzungen().find(x => x.id === s2.id).ergebnisse), vorherS2, "Sitzung 2 bleibt unberührt");
    erwarte.gleich(Object.keys(K().sitzungen().find(x => x.id === s1.id).ergebnisse).length, 2, "Sitzung 1 trägt jetzt zwei Ergebnisse");
    const unbekannt = KlassenraumCodec.ergebnisBauen({sitzung: 31, platz: 3, sterne: 4, versuche: 0, dauerS: 60});
    if (s1.id !== 31 && s2.id !== 31){
      erwarte.gleich(K().ergebnisEintragen(unbekannt).fehler, "sitzung", "unbekannte Sitzung = Fehler, kein stilles Anlegen");
    }
    /* idempotent bleibt: derselbe Code noch einmal ändert nichts. */
    const nochmal = K().ergebnisEintragen(codeS1);
    erwarte.gleich([nochmal.ok, nochmal.neu, nochmal.grund], [true, false, "doppelt"], "Idempotenz bleibt");
  }));

  /* ---------- 3 · Export/Import ALLER Sitzungen (fassung 2) ---------- */
  pruefe("Export fassung:2 enthält alle Sitzungen + aktiv; Import stellt beide her", () => kapsel(() => {
    const s1 = K().erzeugen({ticketId: "salon-06", seed: 7, plaetze: 3});
    eintragen(s1, 1);
    const s2 = K().erzeugen({ticketId: "salon-02", seed: 3, bestaetigen: true});
    eintragen(s2, 2);
    const text = K().exportieren();
    erwarte.wahr(typeof text === "string", "Export liefert Text");
    const roh = JSON.parse(text);
    erwarte.gleich([roh.format, roh.fassung], ["netzwerk-labor/klassenraum", 2], "Format und Schemaversion 2");
    erwarte.wahr(Array.isArray(roh.sitzungen) && roh.sitzungen.length === 2, "beide Sitzungen im Export: " + (roh.sitzungen || []).length);
    erwarte.gleich([roh.sitzungen[0].id, roh.sitzungen[1].id], [s1.id, s2.id], "Reihenfolge bleibt (Anlage)");
    erwarte.gleich(roh.aktiv, s2.id, "die aktive Sitzung steht im Export");
    erwarte.falsch("sitzung" in roh, "kein Altfeld sitzung mehr im 2er-Export");

    store.set("klassenraum", null);
    erwarte.gleich(K().sitzung(), null, "frischer Rechner: keine Sitzung");
    const r = K().importieren(text);
    erwarte.gleich(r.ok, true, "Import: " + JSON.stringify(r && r.grund));
    erwarte.gleich((r.sitzungen || []).length, 2, "Import meldet beide Sitzungen: " + JSON.stringify(Object.keys(r)));
    erwarte.gleich(r.aktiv, s2.id, "Import stellt die aktive Sitzung her");
    erwarte.gleich(K().sitzungen().length, 2, "beide liegen im Speicher");
    erwarte.gleich(K().sitzung().id, s2.id, "S2 ist nach dem Import aktiv");
    erwarte.gleich(Object.keys(K().sitzungen().find(x => x.id === s1.id).ergebnisse).length, 1, "S1-Ergebnis überstand den Weg");
    erwarte.gleich(K().ergebnisEintragen(KlassenraumCodec.ergebnisBauen({sitzung: s1.id, platz: 9, sterne: 5, versuche: 0, dauerS: 60})).ok, true, "nach dem Import ist auch S1 adressierbar");
    /* tiefe Kopien: Änderungen an der Übersicht ändern den Speicher nicht (Lead-Entscheid 3). */
    const kopie = K().sitzungen();
    kopie[0].titel = "KAPUTT"; kopie[0].ergebnisse["999"] = {platz: 9};
    erwarte.wahr(K().sitzungen()[0].titel !== "KAPUTT", "sitzungen() liefert tiefe Kopien");
    erwarte.gleich(Object.keys(K().sitzungen()[0].ergebnisse).includes("999"), false, "auch die ergebnisse-Map ist eine Kopie");
    console.log(`MESSUNG Export/Import: 2 Sitzungen, aktiv=${r.aktiv}, fassung=${roh.fassung}, ${text.length} Zeichen`);
  }));

  /* ---------- 4 · Alt-JSON fassung:1 wird migriert (kein Datenverlust) ---------- */
  pruefe("Altstand fassung:1 wird beim Lesen auf fassung:2 migriert – verlustfrei", () => kapsel(() => {
    const alt1 = {
      format: "netzwerk-labor/klassenraum",
      fassung: 1, programm: "2.9.0", platz: 5, letzte: "E-GGGG-GGG", zuletzt: 1759706400000, zaehler: 4,
      sitzung: {id: 9, titel: "Altstand", art: "hand", ticketId: "salon-06", skill: null, index: 0, variante: 0, seed: 7,
        eigene: false, schritte: 0, code: "NL-HC3L-CS", dauerMin: 10, plaetze: 21, erstellt: 1759706400000,
        ergebnisse: {"1": {platz: 1, sterne: 4, dauerS: 60, versuche: 0, code: "E-ABCD-EFG", zeit: 1759706400000, quelle: "eingabe"}},
        fremd: "bleibt"},
    };
    store.set("klassenraum", JSON.parse(JSON.stringify(alt1)));
    const s = K().sitzung();
    erwarte.gleich([s.id, s.titel, s.plaetze], [9, "Altstand", 21], "die alte Sitzung lebt: " + JSON.stringify(s));
    erwarte.gleich(K().sitzungen().length, 1, "als sitzungen[]-Liste gelesen");
    erwarte.gleich(K().sitzungen()[0].aktiv, true, "und ist die aktive Sitzung");
    erwarte.gleich(K().platz(), 5, "der Geräteplatz bleibt erhalten");
    const roh = JSON.parse(K().exportieren());
    erwarte.gleich([roh.fassung, roh.sitzungen.length, roh.sitzungen[0].id], [2, 1, 9], "Export nach Migration: fassung 2, eine Sitzung");
    erwarte.gleich(roh.sitzungen[0].fremd, "bleibt", "unbekannte Sitzungsfelder bleiben erhalten");
    erwarte.gleich(Object.keys(roh.sitzungen[0].ergebnisse).length, 1, "Ergebnisse bleiben erhalten");
    /* auch der Import nimmt fassung:1 an */
    store.set("klassenraum", null);
    const r = K().importieren(JSON.stringify(alt1));
    erwarte.gleich(r.ok, true, "Import nimmt fassung:1 an: " + JSON.stringify(r && r.grund));
    erwarte.gleich([K().sitzung().id, K().sitzungen().length], [9, 1], "Altdatei wird auf 2 migriert");
    erwarte.gleich(JSON.parse(K().exportieren()).fassung, 2, "und als fassung:2 weitergegeben");
    console.log(`MESSUNG Alt-JSON: v1-Sitzung ${alt1.sitzung.id} → ${K().sitzungen().length} Sitzung(en), fassung ${JSON.parse(K().exportieren()).fassung}, fremd=${roh.sitzungen[0].fremd}`);
  }));

  /* ---------- 5 · Zu neue Fassung wird abgewiesen, nicht umgeschrieben ---------- */
  pruefe("fassung:3 wird abgewiesen – Import und Lesen ändern nichts", () => kapsel(() => {
    const s = K().erzeugen({ticketId: "salon-06", seed: 7});
    const text = JSON.parse(K().exportieren());
    text.fassung = 3;
    const vorher = JSON.stringify(wurzel());
    const r = K().importieren(JSON.stringify(text));
    erwarte.gleich(r.fehler, "fassung");
    erwarte.enthaelt(r.grund, "Stand 3");
    erwarte.gleich(JSON.stringify(wurzel()), vorher, "ein zu neuer Import ändert den Speicher nicht");
    /* Ein zu neuer STORE wird gelesen abgewiesen und nicht überschrieben. */
    const fremd = {fassung: 3, programm: "3.9.0", sitzungen: [s], aktiv: s.id, platz: null, letzte: null, zuletzt: 1, zaehler: 1};
    store.set("klassenraum", JSON.parse(JSON.stringify(fremd)));
    const vorherFremd = JSON.stringify(wurzel());
    erwarte.gleich(K().sitzung(), null, "ein zu neuer Store liefert keine Sitzung");
    const e = K().erzeugen({ticketId: "salon-02", seed: 3});
    erwarte.gleich(e.fehler, "fassung", "erzeugen schreibt einen zu neuen Store nicht um: " + JSON.stringify(e));
    erwarte.gleich(JSON.stringify(wurzel()), vorherFremd, "der zu neue Stand bleibt unangetastet");
    console.log(`MESSUNG fassung:3: Import ${r.fehler} · erzeugen ${e.fehler} · Store unverändert`);
  }));

  /* ---------- 6 · Sitzungs-IDs sind eindeutig 1..31 ---------- */
  pruefe("Sitzungs-IDs: kollisionsfrei, freie ID wird im Kreis gesucht, volle Belegung ist ein Fehler", () => kapsel(() => {
    const sess = id => ({id, titel: "T" + id, art: "hand", ticketId: "salon-06", skill: null, index: 0, variante: 0,
      seed: 1, eigene: false, schritte: 0, code: "", dauerMin: 10, plaetze: 0, erstellt: 0, ergebnisse: {}});
    const voll = ids => ({fassung: 2, programm: "test", platz: null, zuletzt: 1, sitzungen: ids.map(sess), aktiv: 1, letzte: null, zaehler: 0});
    store.set("klassenraum", voll(Array.from({length: 31}, (_, i) => i + 1)));
    const vorher = JSON.stringify(wurzel());
    const e = K().erzeugen({ticketId: "salon-06", seed: 7});
    erwarte.gleich(e.fehler, "sitzung", "alle 31 Kennungen belegt: " + JSON.stringify(e));
    erwarte.gleich(JSON.stringify(wurzel()), vorher, "der Speicher bleibt unverändert");
    /* eine Lücke: die freie Kennung wird gefunden (Kreis-Suche) */
    const frei = Array.from({length: 31}, (_, i) => i + 1).filter(id => id !== 17);
    store.set("klassenraum", voll(frei));
    const neu = K().erzeugen({ticketId: "salon-06", seed: 7});
    erwarte.gleich(neu.id, 17, "genau die freie Kennung 17 wird vergeben: " + JSON.stringify(neu));
    erwarte.gleich(K().sitzungen().length, 31, "31 Sitzungen liegen im Speicher");
    /* zwei normale Sitzungen bekommen verschiedene Kennungen */
    store.set("klassenraum", null);
    const a = K().erzeugen({ticketId: "salon-06", seed: 7});
    const b = K().erzeugen({ticketId: "salon-02", seed: 3, bestaetigen: true});
    erwarte.wahr(a.id !== b.id, "zwei Sitzungen haben verschiedene Kennungen: " + a.id + " / " + b.id);
    console.log(`MESSUNG IDs: voll → ${e.fehler} · Lücke → ${neu.id} · normal ${a.id}/${b.id}`);
  }));
});
