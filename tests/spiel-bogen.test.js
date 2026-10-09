"use strict";
/* WELLE 1, SITZUNG S2 „Bogen“ (Architektur § 9.3): Fehlerdex, Tagesrätsel, Hub „Heute“, Spieltagebuch.
   Kapsel wie spiel-post: echter Speicher (Neustart über Spiel.laden), danach ist alles wie vorher. */
gruppe("Spiel: Bogen (S2)", () => {
  const T0 = Date.UTC(2026, 9, 8, 9, 0, 0);          /* Donnerstag, 08.10.2026 */
  const kapsel = fn => () => {
    const altSpeicher = store.alles(), altLern = tief(L.st), altSt = Spiel._st, altEinst = Spiel._einst, uhr = jetzt();
    const altGen = Object.assign({}, Spiel.generierte);
    try {
      jetzt.setzen(T0);
      store.set("einst", {});
      Spiel._einst = null;
      Spiel.neu();
      fn();
    } finally {
      Spiel.generierte = altGen;
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, altSpeicher);
      const s = L.st; for (const k of Object.keys(s)) delete s[k]; Object.assign(s, altLern);
      Spiel._st = altSt; Spiel._einst = altEinst; Spiel._lz = {};
      jetzt.setzen(uhr); jetzt.frei();
    }
  };
  /* Auftrag erstellen, öffnen, (optional erst einmal falsch abnehmen,) lösen, abnehmen */
  const loesen = (o, {hilfe = 0, fehlversuch = false} = {}) => {
    const inst = o.iid ? o : Spiel.instanzErstellen(Object.assign({quelle: "postfach"}, o));
    Spiel.oeffnen(inst.iid);
    if (fehlversuch) erwarte.falsch(Spiel.abschliessen(inst, Spiel.abnahme(inst)).bestanden, "Fehlversuch");
    inst.hilfeStufe = hilfe;
    Spiel.loesung(inst.netz, Spiel.defVon(inst).loesung);
    const erg = Spiel.abschliessen(inst, Spiel.abnahme(inst));
    erwarte.wahr(erg.bestanden, `${inst.ticketId} bestanden`);
    return erg;
  };

  /* ---------- Fehlerdex ---------- */
  /* Fehlerarten des Ausbaus 1.3 – sie heben die Zahl der Dex-Einträge von 36 auf 39. Belegt in
     tests/injektoren-neu.test.js (Wirkung) und tests/tickets-generator.test.js (je ein Fall); ihre Gruppe
     ergibt sich aus skills[0] (src/spiel/dex.js: DEX_GRUPPEN), ihr Symptom steht in DEX_SYMPTOM. */
  const DEX_NEU = ["portsec-fremde-mac", "stp-doppelkabel", "nas-ohne-adresse"];
  pruefe("Fehlerdex: genau die 39 Fehlerarten, jede mit Gruppe, Symptom, Erkennungszeichen", kapsel(() => {
    const ids = Object.keys(Spiel.INJEKTOREN).sort(), liste = Spiel.dex.liste();
    erwarte.gleich(ids.length, 36 + DEX_NEU.length, "36 Fehlerarten bis 1.2 + die drei neuen");
    erwarte.gleich(DEX_NEU.filter(n => !ids.includes(n)), [], "die drei neuen Fehlerarten stehen im Dex");
    erwarte.gleich(liste.map(e => e.id).sort(), ids, "Dex = Injektoren");
    erwarte.gleich(liste.filter(e => e.gruppe === "weitere").map(e => e.id), [], "jede Fehlerart hat eine Gruppe");
    erwarte.gleich(liste.filter(e => !e.symptom || !e.erkennen.length || !e.erklaerung).map(e => e.id), [], "Symptom, Erkennen, Erklärung");
    erwarte.wahr(liste.every(e => e.zustand === "unbekannt" && e.ab >= 1), "frisch: alles unbekannt, mit Stufe");
    erwarte.gleich(Spiel.dex.gruppen().reduce((s, g) => s + g.gesamt, 0), 36 + DEX_NEU.length, "Gruppen decken alles ab");
  }));

  pruefe("Fehlerdex: erst beim Abschluss, ohne bezahlte Hilfe = verstanden, übersteht Neustart", kapsel(() => {
    const z = id => Spiel.dex.liste().find(e => e.id === id).zustand;
    const inst = Spiel.instanzErstellen({ticketId: "salon-01", quelle: "postfach"});
    Spiel.oeffnen(inst.iid);
    erwarte.gleich(z("kabel-fehlt"), "unbekannt", "offener Auftrag verrät nichts");
    const e1 = loesen(inst);
    erwarte.gleich(e1.dex.neu.map(n => [n.id, n.zustand]), [["kabel-fehlt", "verstanden"]]);
    const e2 = loesen({ticketId: "salon-02"}, {hilfe: 4});
    erwarte.gleich(e2.dex.neu.map(n => [n.id, n.zustand]), [["ip-tippfehler", "gesehen"]]);
    Spiel.sofortSpeichern(); Spiel._st = null; Spiel.laden();
    erwarte.gleich([z("kabel-fehlt"), z("ip-tippfehler"), z("maske-falsch")], ["verstanden", "gesehen", "unbekannt"], "nach Neustart");
    erwarte.gleich(Spiel.dex.zaehlen(), {gesamt: 36 + DEX_NEU.length, gesehen: 2, verstanden: 1});
  }));

  pruefe("Fehlerdex: Gruppe komplett verstanden → Ehrentitel genau einmal", kapsel(() => {
    /* Die Gruppe „Betrieb" hat seit dem Ausbau 1.3 drei Fehlerarten: gespeichert-kaputt (lab.speichern),
       stp-doppelkabel (lab.stp) und nas-ohne-adresse (lab.storage). Geprüft wird über den ECHTEN Weg
       (Spiel.instanzErstellen → Spiel.oeffnen → Spiel.abschliessen) – nicht mehr über eine Attrappe:
       der Titel darf erst fallen, wenn alle drei Karten wirklich verstanden sind, und dann genau einmal. */
    const betrieb = Object.values(Spiel.INJEKTOREN).filter(i => Spiel.dex.gruppeVon(i).id === "betrieb").map(i => i.name).sort();
    erwarte.gleich(betrieb, ["gespeichert-kaputt", "nas-ohne-adresse", "stp-doppelkabel"], "Fehlerarten der Gruppe Betrieb");
    /* Je Fehlerart ein echter Auftrag: die Hauptfertigkeit bestimmt den Injektor, der Seed die Fehlerstelle.
       Die Suche ist begrenzt und wird geprüft – findet sie nichts, ist der Fall rot und nicht still grün. */
    const auftragMit = name => {
      const skill = (Spiel.INJEKTOREN[name].skills || [])[0];
      for (let seed = 1; seed <= 40; seed++) {
        const inst = Spiel.instanzErstellen({gen: {skill, seed, opts: {stufe: "E"}}, quelle: "postfach", ohneFlow: true});
        if ((Spiel.defVon(inst).injektoren || []).includes(name)) return inst;
      }
      return null;
    };
    const titel = [];
    for (const name of betrieb) {
      const inst = auftragMit(name);
      erwarte.wahr(!!inst, `echter Auftrag mit dem Injektor ${name}`);
      if (!inst) continue;
      const erg = loesen(inst, {hilfe: 0});
      erwarte.gleich(erg.dex.neu.map(n => [n.id, n.zustand]), [[name, "verstanden"]], `${name} ist ohne bezahlte Hilfe verstanden`);
      titel.push(erg.dex.titel);
    }
    /* Vor der letzten Karte fällt kein Titel, mit der letzten genau einmal. */
    erwarte.gleich(titel.slice(0, -1), [[], []], "die ersten zwei Karten vergeben noch keinen Ehrentitel");
    erwarte.gleich(titel[titel.length - 1], ["Sorgfältige Hand"], "die dritte Karte schließt die Gruppe ab – der Titel fällt");
    const g = Spiel.dex.gruppen().find(x => x.id === "betrieb");
    erwarte.gleich([g.gesamt, g.verstanden, g.fertig], [3, 3, true], "die Gruppe ist vollständig verstanden");
    /* Ein weiterer ECHTER Abschluss (andere Gruppe) gibt ihn kein zweites Mal. */
    const danach = loesen({ticketId: "salon-01"}, {hilfe: 0});
    erwarte.gleich(danach.dex.titel, [], "kein zweites Mal");
    erwarte.gleich(Spiel.dex.titel(), ["Sorgfältige Hand"], "der Ehrentitel steht genau einmal");
  }));

  /* ---------- Tagesrätsel ---------- */
  pruefe("Tagesrätsel: gleicher Tag + Niveau → gleiches Netz (ohne Spielstand), Nummer ab 01.10.2026", kapsel(() => {
    const netzVon = (tag, niv) => { Spiel.generierte = {}; const w = Spiel.raetsel.wahl(tag, niv); return {skill: w.skill, netz: JSON.stringify(Spiel.startNetz(w.def, w.seed))}; };
    erwarte.gleich(Spiel.raetsel.nummer("2026-10-04"), 4);
    for (const niv of ["E", "AP1", "AP2"]) {
      const a = netzVon("2026-10-08", niv);
      Spiel.st.stufe = 5; Spiel.st.euro = 999; Spiel.einstSetzen("wahl", "AP2");          /* Spielstand darf nichts ändern */
      erwarte.gleich(netzVon("2026-10-08", niv), a, niv + ": deterministisch");
      Spiel.einstSetzen("wahl", "auto");
      const skills = new Set();
      for (let i = 0; i < 14; i++) { const w = Spiel.raetsel.wahl(plusTage("2026-10-08", i), niv); erwarte.wahr(w && w.def, `${niv} Tag ${i}: Rätsel baubar`); skills.add(w.skill); }
      erwarte.wahr(skills.size >= 3, `${niv}: Abwechslung über zwei Wochen (${[...skills]})`);
    }
  }));

  pruefe("Tagesrätsel: nicht im Postfach, Niveau fest, Teilen-Text ohne Ursache, einmal am Tag, verfällt am Folgetag", kapsel(() => {
    Spiel.einstSetzen("wahl", "AP1");
    const inst = Spiel.raetsel.starten();
    erwarte.wahr(inst && inst.quelle === "raetsel", "Instanz");
    erwarte.wahr(!Spiel.postfach().includes(inst), "nicht im Postfach");
    erwarte.gleich(Spiel.raetsel.starten(), inst, "zweimal starten = dasselbe Rätsel");
    Spiel.einstSetzen("wahl", "E");
    erwarte.gleich(Spiel.niveauVon(inst), "AP1", "Niveau bleibt das des Rätsels");
    const erg = loesen(inst, {fehlversuch: true});
    erwarte.wahr(erg.raetsel, "Ergebnis festgehalten");
    const text = Spiel.raetsel.teilen();
    erwarte.wahr(/^Netzwerk-Labor · Tagesrätsel #8 · AP1\n[★½☆]{5} · \d+:\d\d · Hilfe 0 · 2 Versuche\n[🟩🟨⬜]+$/u.test(text), text);
    erwarte.wahr(text.includes("🟨") && !text.includes("⬜"), "Ziele erst im 2. Versuch erfüllt: gelb");
    for (const n of Spiel.defVon({ticketId: inst.ticketId, gen: inst.gen}).injektoren) erwarte.falsch(text.includes(Spiel.INJEKTOREN[n].titel), "Ursache steht nicht im Text");
    erwarte.gleich(Spiel.raetsel.starten(), null, "heute schon gelöst");
    erwarte.gleich(Spiel.raetsel.heute().serie, 1, "Rätsel-Serie");
    /* morgen: neues Rätsel; ein angefangenes von gestern verfällt beim Start */
    jetzt.setzen(T0 + 86400000);
    const morgen = Spiel.raetsel.starten();
    erwarte.wahr(morgen && morgen.raetsel.nr === 9, "Rätsel #9");
    jetzt.setzen(T0 + 2 * 86400000);
    Spiel.sofortSpeichern(); Spiel._st = null; Spiel.laden();
    erwarte.gleich(Spiel.st.postfach.filter(i => i.quelle === "raetsel").length, 0, "verfallen");
    erwarte.gleich(Spiel.raetsel.heute().serie, 1, "Serie reißt nicht am Folgetag (Urlaubstag)");
  }));

  /* ---------- Hub ---------- */
  pruefe("Hub: Serie mit zwei Urlaubstagen je Woche, heute zählt erst aktiv, Willkommen zurück", kapsel(() => {
    const s = (tage, tag = "2026-10-08") => Spiel.hub.serie(new Set(tage), tag);
    erwarte.gleich(s(["2026-10-08", "2026-10-07", "2026-10-05", "2026-10-02", "2026-10-01"]), {tage: 5, urlaub: 1, frei: 1}, "Di fehlt, Wochenende frei, Mi 30.09. reißt");
    erwarte.gleich(s(["2026-10-07", "2026-10-06"]).tage, 2, "heute noch nicht aktiv: kein Fehltag");
    erwarte.gleich(s(["2026-10-08", "2026-10-04", "2026-10-03", "2026-10-02"]).tage, 1, "Mo–Mi dieser Woche fehlen: der dritte Fehltag reißt");
    erwarte.gleich(s([]), {tage: 0, urlaub: 0, frei: 2});
    erwarte.gleich(s(["2026-10-08"]), {tage: 1, urlaub: 0, frei: 2}, "Fehltage vor dem Beginn der Serie verbrauchen keinen Urlaub");
    erwarte.gleich(s(["2026-10-06"], "2026-10-08"), {tage: 1, urlaub: 1, frei: 1}, "gestern gefehlt, heute noch offen: Serie lebt mit einem Urlaubstag");
    erwarte.gleich(Spiel.hub.wochenstart("2026-10-11"), "2026-10-05", "Sonntag gehört zur Woche ab Montag");
    erwarte.wahr(Spiel.hub.zurueck(new Set(["2026-10-05"]), "2026-10-08"), "drei Tage weg → Willkommen zurück");
    erwarte.falsch(Spiel.hub.zurueck(new Set(["2026-10-07"]), "2026-10-08"), "gestern da → nichts");
  }));

  pruefe("Hub: nächster Auftrag (angefangen zuerst), Aufwärmen, Feierabend mit Ausblick nach dem Tagesziel", kapsel(() => {
    Spiel.postfachAuffuellen();
    let st = Spiel.hub.stand();
    erwarte.wahr(st.naechster.art === "neu" && st.naechster.titel && st.naechster.euro > 0, "neuer Auftrag");
    erwarte.gleich(st.feierabend, null);
    const zweiter = Spiel.postfach()[1];
    Spiel.oeffnen(zweiter.iid);
    st = Spiel.hub.stand();
    erwarte.gleich([st.naechster.art, st.naechster.iid], ["weiter", zweiter.iid], "angefangener zuerst");
    Spiel.hub.aufgewaermt(); Spiel.hub.aufgewaermt();
    erwarte.gleich(Spiel.hub.stand().aufwaermen, {ziel: 3, erledigt: 2});
    for (let i = 0; i < 3; i++) Spiel.st.erledigt.push({id: "x" + i, sterne: 5, tag: heute()});
    st = Spiel.hub.stand();
    erwarte.wahr(st.feierabend && /^Morgen /.test(st.feierabend.ausblick), "Feierabend: " + (st.feierabend && st.feierabend.ausblick));
    erwarte.gleich(st.tagesziel, {erledigt: 3, ziel: 3});
  }));

  /* ---------- Spieltagebuch ---------- */
  pruefe("Spieltagebuch: Sitzung, Auftragsende, Weiterspiel-Rate, übersteht Neustart, höchstens 500", kapsel(() => {
    Spiel.tagebuch.sitzung();
    loesen({ticketId: "salon-01"});
    jetzt.setzen(T0 + 60000);
    loesen({ticketId: "salon-02"}, {fehlversuch: true});          /* binnen 1 min weiter → weiter = true */
    jetzt.setzen(T0 + 20 * 60000);
    const dritter = Spiel.instanzErstellen({ticketId: "salon-03", quelle: "postfach"});
    Spiel.oeffnen(dritter.iid);                                    /* 19 min später → weiter = false */
    const auf = Spiel.tagebuch.daten().filter(e => e.art === "auftrag-ende");
    erwarte.gleich(auf.map(e => [e.id, e.versuche, e.weiter]), [["salon-01", 1, true], ["salon-02", 2, false]]);
    erwarte.wahr(auf.every(e => e.form === "stoerung" && e.niveau && typeof e.sek === "number" && e.sterne >= 1), "Felder");
    const s = Spiel.tagebuch.daten().find(e => e.art === "sitzung");
    erwarte.gleich(s.bis, T0 + 20 * 60000, "Sitzung bis zur letzten Handlung");
    Spiel.sofortSpeichern(); Spiel._st = null; Spiel.laden();
    erwarte.gleich(Spiel.tagebuch.daten().filter(e => e.art === "auftrag-ende").length, 2, "nach Neustart");
    const text = Spiel.tagebuch.auswertung();
    for (const t of ["Spieltagebuch", "Sitzungen 1", "Aufträge 2", "Erstversuch 50 %", "Weiterspiel-Rate 50 %", "Fehlerdex"]) erwarte.wahr(text.includes(t), `„${t}“ in:\n${text}`);
    for (let i = 0; i < 600; i++) Spiel.tagebuch.daten().push({t: T0, art: "sitzung", bis: T0});
    Spiel.tagebuch.sitzung();
    erwarte.gleich(Spiel.tagebuch.daten().length, 500, "höchstens 500");
  }));
});
