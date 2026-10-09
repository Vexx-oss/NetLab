"use strict";
/* KLASSENRAUM Stufe A (task-32): Spiel.klassenraum — die elf Funktionen, der Store "klassenraum" und der
   Öffnungsweg (A – Codec und Determinismus § 5, § 7).

   Der Codec (`KlassenraumCodec`, src/spiel/klassenraum-codec.js) ist eine eigene Datei und wird hier NICHT
   nachgebaut – die Fälle prüfen die API, die auf ihm aufsetzt. Gemessen wird die WIRKUNG:
   erzeugen → ausCode ergibt denselben Auftrag (über `def.id` und den Netzkennwert zweier Geräte),
   Vertipper und fremde Fassungen werden markiert, Export/Import ist verlustfrei, der Ergebnis-Code
   geht hin und zurück (idempotent, erster Eintrag gewinnt), und E1 gilt: der Auftrag ist im Postfach
   unsichtbar (die ältere Zeile in A § 5 „Auftrag ist trotzdem im Postfach sichtbar" ist damit überholt). */
gruppe("Spiel: Klassenraum", () => {
  /* Wegwerf-Umgebung: eigener Store-Schlüssel, Spielstand, Einstellungen und Lernmotor werden
     wiederhergestellt (Muster tests/spiel-training.test.js). */
  function wegwerf(fn, {trocken = true} = {}){
    const alt = {
      st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
      labor: store.get("labor", null), einstStore: store.get("einst", null), kl: store.get("klassenraum", null),
      gen: Object.assign({}, Spiel.generierte),
    };
    const lern = L.st;
    const lernAlt = JSON.parse(JSON.stringify({units: lern.units, log: lern.log, fehler: lern.fehler, tage: lern.tage, tests: lern.tests}));
    try {
      Spiel._trocken = trocken; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      store.set("klassenraum", null);                          /* kein Altstand aus einem anderen Test */
      return fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      store.set("labor", alt.labor); store.set("einst", alt.einstStore); store.set("klassenraum", alt.kl);
      for (const k of Object.keys(Spiel.generierte)) if (!(k in alt.gen)) delete Spiel.generierte[k];
      lern.units = lernAlt.units; lern.log = lernAlt.log; lern.fehler = lernAlt.fehler; lern.tage = lernAlt.tage; lern.tests = lernAlt.tests;
      store.set("lern", lern);
      jetzt.frei();
    }
  }
  const K = () => Spiel.klassenraum;

  /* Der Öffnungsweg (§ 5) als Helfer: Code lesen → Instanz bauen → klassenraum merken → öffnen. */
  function oeffnen(code, {platz = 0, loesen = true} = {}){
    const c = K().ausCode(code);
    if (!c || c.fehler) return {c};
    const inst = Spiel.instanzErstellen(c.skill
      ? {gen: {skill: c.skill, seed: c.seed}, quelle: "klassenraum", ohneFlow: true}
      : {ticketId: c.ticketId, seed: c.seed, quelle: "klassenraum", ohneFlow: true});
    inst.klassenraum = {sitzung: c.sitzung, platz, code: c.code};
    Spiel.oeffnen(inst.iid);
    if (loesen) {
      Spiel.loesung(inst.netz, Spiel.defVon(inst).loesung);
      if (typeof Spiel.arbeitszieleErfuellen === "function") Spiel.arbeitszieleErfuellen(inst);
    }
    return {c, inst};
  }

  /* ---------- Die eingefrorene Tabelle (§ 2.3) ---------- */
  pruefe("Die eingefrorene Tabelle ist die lebende Reihenfolge: 58 Aufträge, 27 Fertigkeiten, Codec da", () => wegwerf(() => {
    const t = K().tabellen();
    erwarte.wahr(!!t, "der Codec liefert die Tabellen");
    erwarte.gleich(t.auftraege.laenge, 58, "58 eingefrorene Aufträge");
    erwarte.gleich(t.skills.laenge, 27, "27 Fertigkeiten");
    const reihe = Spiel.ticketReihe().map(x => x.id);
    erwarte.gleich(t.auftraege.ids.join("|"), reihe.slice(0, 58).join("|"), "Präfix der lebenden Spielreihenfolge (§ 2.3 Regel 4)");
    erwarte.gleich(t.skills.ids.join("|"), (DATEN.skills || []).map(s => s.id).join("|"), "Fertigkeitsreihenfolge = DATEN.skills");
    /* jede eingefrorene ID existiert noch */
    const fehlt = t.auftraege.ids.filter(id => !(DATEN.tickets || []).some(x => x.id === id));
    erwarte.gleich(fehlt, [], "keine tote ID in der Tabelle");
    console.log(`MESSUNG Tabelle: Auftraege=${t.auftraege.laenge} · Skills=${t.skills.laenge} · taugliche=${K().tauglicheFertigkeiten().length}`);
  }));

  /* ---------- erzeugen → ausCode: derselbe Auftrag, auf jedem Gerät dasselbe Netz ---------- */
  pruefe("erzeugen → ausCode ergibt denselben Auftrag (def.id, Seed) – hand und generiert, zwei Geräte ein Netz", () => wegwerf(() => {
    const hand = K().erzeugen({ticketId: "salon-06", seed: 7});
    erwarte.falsch(!!hand.fehler, "erzeugen(hand): " + (hand.grund || ""));
    const h = K().ausCode(hand.code);
    erwarte.gleich([h.ticketId, h.seed, h.art, h.sitzung, h.index, h.variante],
      [hand.ticketId, hand.seed, hand.art, hand.id, hand.index, hand.variante], "der Leser findet die Sitzung wieder");
    erwarte.wahr(Spiel.ticketGueltig(h._def), "die kanonische Fassung ist spielbar");
    const e1 = oeffnen(hand.code, {platz: 3});
    const e2 = oeffnen(hand.code, {platz: 4});
    erwarte.gleich(Spiel.defVon(e1.inst).id, hand.ticketId, "das Gerät baut genau diesen Auftrag");
    erwarte.gleich(K().netzkennwert(e1.inst.netz), K().netzkennwert(e2.inst.netz), "zwei Geräte, dasselbe Netz (Klassenraum-Abdruck)");
    erwarte.gleich([e1.inst.klassenraum.sitzung, e1.inst.klassenraum.platz, e1.inst.klassenraum.code], [hand.id, 3, hand.code]);

    const gen = K().erzeugen({skill: "lab.vlan", seed: 3});
    erwarte.falsch(!!gen.fehler, "erzeugen(generiert): " + (gen.grund || ""));
    const g = K().ausCode(gen.code);
    erwarte.gleich([g.skill, g.art, g.seed, g.ticketId], [gen.skill, "generiert", gen.seed, gen.ticketId], "generierter Auftrag ebenso");
    const g2 = oeffnen(gen.code);
    erwarte.gleich(Spiel.defVon(g2.inst).id, gen.ticketId, "auch generiert baut dasselbe");
    console.log(`MESSUNG Auftrag: hand=${hand.code} index=${hand.index} seed=${hand.seed} eigene=${hand.eigene} schritte=${hand.schritte} · generiert=${gen.code} seed=${gen.seed}`);
  }));

  /* ---------- Fehlerfälle des Lesens ---------- */
  pruefe("Ein vertippter Code wird markiert – leer ist null, ein Ergebniscode im Auftragsfeld wird erkannt", () => wegwerf(() => {
    const s = K().erzeugen({ticketId: "salon-06", seed: 7});
    const letzte = s.code.slice(-1);
    const kaputt = s.code.slice(0, -1) + (letzte === "A" ? "B" : "A");
    erwarte.gleich(K().ausCode(kaputt).fehler, "prüfziffer", "eine geänderte Prüfziffer wird erkannt");
    erwarte.gleich(K().ausCode(""), null, "nichts eingetippt = keine Fehlermeldung");
    erwarte.gleich(K().ausCode(null), null);
    const beispiel = K().ausCode("NL-HC3L-CS");
    erwarte.wahr(!beispiel.fehler && typeof beispiel.ticketId === "string", "das gültige Beispiel aus A § 1.3 wird gelesen: " + JSON.stringify(beispiel.ticketId));
    const e = K().ausCode("E-KFWS-HZM");
    erwarte.gleich(e.fehler, "länge");
    erwarte.enthaelt(e.grund, "8 Zeichen", "die Länge steht im Grund");
    erwarte.enthaelt(e.hinweis, "Ergebnis-Code", "mit Hinweis, wo der Code hingehört");
    const frei = KlassenraumCodec.auftragBauen({sitzung: 1, art: "hand", index: 58, variante: 0});
    erwarte.gleich(K().ausCode(frei).fehler, "fassung", "ein freier Index ist eine fremde Fassung");
  }));

  /* ---------- erzeugen: Grenzen und Fehlerklassen ---------- */
  pruefe("erzeugen verlangt genau eine Quelle, klemmt dauerMin auf 1..120 und nimmt Plätze an", () => wegwerf(() => {
    erwarte.gleich(K().erzeugen({}).fehler, "wahl");
    erwarte.gleich(K().erzeugen(null).fehler, "wahl");
    erwarte.gleich(K().erzeugen({ticketId: "salon-06", skill: "lab.vlan"}).fehler, "wahl");
    erwarte.gleich(K().erzeugen({ticketId: "gibts-nicht"}).fehler, "auftrag");
    erwarte.gleich(K().erzeugen({skill: "gibts-nicht"}).fehler, "auftrag");
    const s = K().erzeugen({ticketId: "salon-06", seed: 7, dauerMin: 999, plaetze: 24});
    erwarte.gleich([s.dauerMin, s.plaetze, s.titel.length > 0], [120, 24, true], "dauerMin geklemmt, plaetze übernommen, Titel da");
    erwarte.gleich(K().erzeugen({ticketId: "salon-06", seed: 7, dauerMin: 0}).dauerMin, 1);
    erwarte.gleich(K().erzeugen({ticketId: "salon-06", seed: 7}).dauerMin, 10, "Standard 10");
    /* die Sitzung liegt im eigenen Store und trägt die 14 Felder + plaetze */
    const felder = Object.keys(K().sitzung()).sort();
    erwarte.gleich(felder, ["art", "code", "dauerMin", "eigene", "ergebnisse", "erstellt", "id", "index", "plaetze", "schritte", "seed", "skill", "ticketId", "titel", "variante"]);
    erwarte.gleich(K().sitzung().skill, null, "ein Handauftrag hat keine Fertigkeit");
  }));

  /* ---------- Der Öffnungsweg und E1 ---------- */
  pruefe("Der Öffnungsweg baut den Auftrag – und E1 gilt: er bleibt im Postfach unsichtbar", () => wegwerf(() => {
    const s = K().erzeugen({ticketId: "salon-06", seed: 7});
    const {inst} = oeffnen(s.code, {platz: 2});
    erwarte.gleich((Spiel.instanz(inst.iid) || {}).iid, inst.iid, "Spiel.instanz findet ihn");
    erwarte.gleich(Spiel.postfach().some(i => i.iid === inst.iid), false, "Spiel.postfach zeigt ihn NICHT (E1)");
    erwarte.gleich(Spiel.offen(), 0, "Offen-Zähler bleibt 0");
    erwarte.gleich(Spiel.hub.naechster().art, "leer", "die Heute-Kachel zeigt ihn nicht");
    erwarte.gleich(inst.quelle, "klassenraum");
    erwarte.gleich([inst.klassenraum.sitzung, inst.klassenraum.platz], [s.id, 2]);
  }));

  /* ---------- Ergebnis-Code: bilden, lesen, eintragen (idempotent) ---------- */
  pruefe("Ergebnis-Code: bilden, lesen, eintragen – idempotent, der erste Eintrag gewinnt", () => wegwerf(() => {
    const s = K().erzeugen({ticketId: "salon-06", seed: 7});
    const {c, inst} = oeffnen(s.code, {platz: 5});
    const ab = Spiel.abnahme(inst);
    erwarte.wahr(ab.bestanden, "die Lösung besteht: " + JSON.stringify(ab.ergebnisse.map(e => [e.ziel.typ, e.ok, e.grund])));
    const code = K().ergebnisCode(inst, ab);
    erwarte.wahr(typeof code === "string" && code.length === 10, "Ergebnis-Code: " + JSON.stringify(code));
    const gelesen = K().ergebnisLesen(code);
    erwarte.gleich([gelesen.sitzung, gelesen.platz, gelesen.sterne, gelesen.versuche, gelesen.ok], [c.sitzung, 5, ab.sterne, 0, true]);
    const vorher = JSON.stringify(store.get("klassenraum"));
    const eins = K().ergebnisEintragen(code);
    erwarte.gleich([eins.ok, eins.neu, eins.platz], [true, true, 5]);
    const zwei = K().ergebnisEintragen(code);
    erwarte.gleich([zwei.ok, zwei.neu, zwei.grund], [true, false, "doppelt"], "derselbe Code noch einmal");
    const nachDoppelt = JSON.stringify(store.get("klassenraum"));
    const anderer = KlassenraumCodec.ergebnisBauen({sitzung: c.sitzung, platz: 5, sterne: 2, versuche: 1, dauerS: 20});
    const drei = K().ergebnisEintragen(anderer);
    erwarte.gleich([drei.ok, drei.neu, drei.grund], [true, false, "platz-schon-da"], "anderer Code auf demselben Platz ändert nichts");
    erwarte.gleich(nachDoppelt === JSON.stringify(store.get("klassenraum")), true, "Speicher nach den Doppel-Einträgen unverändert");
    erwarte.wahr(nachDoppelt !== vorher, "der erste Eintrag hat wirklich geschrieben");
    /* fremde Sitzung, keine Sitzung, Unsinn */
    const fremd = KlassenraumCodec.ergebnisBauen({sitzung: c.sitzung === 31 ? 30 : c.sitzung + 1, platz: 9, sterne: 3, versuche: 0, dauerS: 30});
    erwarte.gleich(K().ergebnisEintragen(fremd).fehler, "sitzung");
    store.set("klassenraum", null);
    erwarte.gleich(K().ergebnisEintragen(code).grund, "Es läuft keine Sitzung – erst einen Auftrag erzeugen.");
    erwarte.gleich(K().ergebnisEintragen("").fehler, "länge");
    erwarte.gleich(K().ergebnisEintragen("NL-HC3L-CS").fehler, "länge");
    console.log(`MESSUNG Ergebnis: code=${code} · gelesen(platz=${gelesen.platz}, sterne=${gelesen.sterne}, dauerS=${gelesen.dauerS}) · Einträge=${Object.keys(JSON.parse(nachDoppelt).sitzung.ergebnisse).length}`);
  }));

  /* ---------- Export / Import ---------- */
  pruefe("Export/Import ist verlustfrei, prüft die Fassung und wirft nie", () => wegwerf(() => {
    const s = K().erzeugen({ticketId: "salon-06", seed: 7, plaetze: 24});
    const text = K().exportieren();
    erwarte.wahr(typeof text === "string", "Export ohne Sitzung wäre ein Fehler gewesen");
    const roh = JSON.parse(text);
    erwarte.gleich([roh.format, roh.fassung, roh.sitzung.code], ["netzwerk-labor/klassenraum", 1, s.code]);
    const r = K().importieren(text);
    erwarte.wahr(r.ok, "Import: " + JSON.stringify(r));
    erwarte.gleich(Object.keys(r.sitzung).sort(), Object.keys(s).sort(), "dieselben Felder");
    erwarte.gleich([r.sitzung.code, r.sitzung.seed, r.sitzung.plaetze, r.sitzung.index], [s.code, s.seed, 24, s.index]);
    erwarte.gleich(JSON.parse(K().exportieren()).sitzung, roh.sitzung, "verlustfrei (Sitzung gleich)");
    const kaputt = JSON.parse(text); kaputt.fassung = 2;
    erwarte.gleich(K().importieren(JSON.stringify(kaputt)).fehler, "fassung");
    erwarte.enthaelt(K().importieren(JSON.stringify(kaputt)).grund, "Stand 2");
    const ohne = JSON.parse(text); delete ohne.sitzung;
    erwarte.gleich(K().importieren(JSON.stringify(ohne)).grund, "In der Datei fehlt die Sitzung.");
    erwarte.gleich(K().importieren("").grund, "Die Datei ist leer.");
    erwarte.gleich(K().importieren("{kaputt").grund, "Das ist keine JSON-Datei.");
    erwarte.gleich(K().importieren("[]").grund, "Das ist keine Klassenraum-Datei.");
    erwarte.gleich(K().importieren(JSON.stringify({format: "netzwerk-labor", speicher: {}})).grund, "Das ist keine Klassenraum-Datei (format fehlt).");
    erwarte.gleich(K().importieren(JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: 1, sitzung: []})).grund, "Die Sitzung in der Datei ist unbrauchbar.");
    const liste = JSON.parse(text); liste.sitzung.ergebnisse = [];
    erwarte.gleich(K().importieren(JSON.stringify(liste)).grund, "Die Ergebnisliste in der Datei ist unbrauchbar (Abbildung Platz → Ergebnis erwartet).");
    const alt = JSON.parse(text); alt.programm = "1.0.0";
    erwarte.wahr(K().importieren(JSON.stringify(alt)).ok, "abweichendes programm wird angenommen (Schemaversion entscheidet)");
    erwarte.gleich(K().exportieren().length > 0, true);
  }));

  /* ---------- Platz und Plätze ---------- */
  pruefe("platz und plaetze: Grenzen 0..31, 0 heißt „nicht eingestellt“", () => wegwerf(() => {
    erwarte.gleich(K().platz(), null, "am Anfang kein Platz");
    erwarte.gleich(K().platzSetzen(7).platz, 7);
    erwarte.gleich(K().platz(), 7);
    erwarte.gleich([K().platzSetzen(32).fehler, K().platzSetzen(-1).fehler, K().platzSetzen(1.5).fehler], ["wahl", "wahl", "wahl"]);
    erwarte.gleich(K().plaetze(), 0, "ohne Sitzung nicht eingestellt");
    const s = K().erzeugen({ticketId: "salon-06", seed: 7});
    erwarte.gleich(K().plaetze(), 0, "ohne Angabe nicht eingestellt");
    erwarte.gleich(K().plaetzeSetzen(24).plaetze, 24);
    erwarte.gleich([K().plaetze(), K().sitzung().plaetze], [24, 24], "steht in der Sitzung");
    erwarte.gleich(K().exportieren().includes('"plaetze":24'), true, "und im Export");
    erwarte.gleich(K().plaetzeSetzen(0).ok, true, "0 schaltet ab");
    erwarte.gleich(K().plaetze(), 0);
    erwarte.gleich(K().plaetzeSetzen(32).fehler, "wahl");
    console.log(`MESSUNG Plätze: code=${s.code} plaetze=${K().sitzung().plaetze} platz=${K().platz()}`);
  }));

  /* ---------- Nebenwirkungen: Spielstand unberührt, Determinismus ---------- */
  pruefe("Der Spielstand bleibt unberührt (kein store labor) – und derselbe Code ergibt zweimal dasselbe", () => wegwerf(() => {
    const vorher = JSON.stringify(store.get("labor", null));
    const s1 = K().erzeugen({ticketId: "salon-06", seed: 9});
    const a1 = K().ausCode(s1.code), a2 = K().ausCode(s1.code);
    erwarte.gleich([a1.ticketId, a1.seed, a1.index, a1.variante, a1.sitzung], [a2.ticketId, a2.seed, a2.index, a2.variante, a2.sitzung], "zweimal gelesen = dasselbe");
    erwarte.gleich([a1.ticketId, a1.seed], [s1.ticketId, s1.seed], "die Sitzung trägt genau den Seed, den der Leser findet");
    const s2 = K().erzeugen({ticketId: "salon-06", seed: 9});
    const a3 = K().ausCode(s2.code);
    erwarte.gleich([a3.ticketId, a3.seed], [a1.ticketId, a1.seed], "gleicher Wunsch → gleicher Auftrag (nur die Sitzung ist neu)");
    erwarte.gleich(K().ausCode(s1.code).code, s1.code, "der gelesene Code ist die kanonische Druckform");
    erwarte.gleich(JSON.stringify(store.get("labor", null)), vorher, "store labor unverändert");
    erwarte.gleich(JSON.parse(K().exportieren()).sitzung.id, s2.id);
  }));

  /* ---------- Netzkennwert und taugliche Fertigkeiten ---------- */
  pruefe("Netzkennwert (6 Zeichen) und taugliche Fertigkeiten kommen aus der Wirklichkeit", () => wegwerf(() => {
    const s = K().erzeugen({skill: "lab.vlan", seed: 3});
    const {c, inst} = oeffnen(s.code, {loesen: false});
    erwarte.gleich(c.skill, "lab.vlan");
    erwarte.gleich(K().netzkennwert(inst.netz).length, 6);
    erwarte.gleich(K().netzkennwert(inst.netz), KlassenraumCodec.abdruck(inst.netz), "= Codec-Abdruck");
    const zweite = Spiel.instanzErstellen({gen: {skill: c.skill, seed: c.seed}, quelle: "klassenraum", ohneFlow: true});
    erwarte.gleich(K().netzkennwert(zweite.netz), K().netzkennwert(inst.netz), "Nachbarrechner: dasselbe Netz");
    const taug = K().tauglicheFertigkeiten();
    erwarte.wahr(taug.length >= 24, "mindestens die belegten 24 Fertigkeiten, gemessen: " + taug.length);
    erwarte.gleich(taug.every(x => typeof x.skill === "string" && Number.isInteger(x.index) && Number.isInteger(x.ersterSeed)), true, "Form {skill, index, ersterSeed}");
    const unbaubar = taug.filter(x => !!K().erzeugen({skill: x.skill, seed: x.ersterSeed}).fehler).map(x => x.skill);
    erwarte.gleich(unbaubar, [], "jede angebotene Fertigkeit baut wirklich einen Auftrag");
    console.log(`MESSUNG Fertigkeiten: taugliche=${taug.length} · Abdruck=${K().netzkennwert(inst.netz)} · Code=${s.code}`);
  }));

  /* ---------- ergebnisCode: Fehlerfälle ohne Ausnahme ---------- */
  pruefe("ergebnisCode ohne Auftrag, ohne Klassenraum-Herkunft, ohne Abnahme und ohne Bestehen – nie eine Ausnahme", () => wegwerf(() => {
    erwarte.gleich(K().ergebnisCode(null).fehler, "auftrag");
    erwarte.gleich(K().ergebnisCode(null, {bestanden: true, sterne: 5}).grund, "Kein Auftrag übergeben.");
    const fremd = Spiel.instanzErstellen({ticketId: "salon-06", seed: 7, quelle: "postfach"});
    const f = K().ergebnisCode(fremd, {bestanden: true, sterne: 5});
    erwarte.gleich([f.fehler, f.grund], ["auftrag", "Dieser Auftrag kam nicht über einen Klassenraum-Code."]);
    const s = K().erzeugen({ticketId: "salon-06", seed: 7});
    const {inst} = oeffnen(s.code, {platz: 1, loesen: false});
    erwarte.gleich(K().ergebnisCode(inst, null).fehler, "abnahme");
    const ab = Spiel.abnahme(inst);
    erwarte.falsch(ab.bestanden, "ohne Lösung nicht bestanden");
    erwarte.gleich(K().ergebnisCode(inst, ab).fehler, "abnahme");
    const erg = Spiel.abschliessen(inst, ab);
    erwarte.gleich([erg.bestanden, erg.euro, erg.ruf, erg.sterne], [false, 0, 0, 0]);
    erwarte.wahr(!!Spiel.instanz(inst.iid), "der Auftrag bleibt offen");
  }, {trocken: false}));

  /* ---------- Die Bus-Meldung trägt den fertigen Ergebnis-Code ---------- */
  pruefe("Die Bus-Meldung „klassenraum“ trägt den Ergebnis-Code – gebildet, bevor die Instanz entfernt wird", () => wegwerf(() => {
    const s = K().erzeugen({ticketId: "salon-06", seed: 7});
    const {inst} = oeffnen(s.code, {platz: 3});
    const ab = Spiel.abnahme(inst);
    const erwartet = K().ergebnisCode(inst, ab);
    const meldungen = [];
    const abH = Bus.an("klassenraum", d => meldungen.push(d));
    const erg = Spiel.abschliessen(inst, ab);
    abH();
    erwarte.wahr(erg.bestanden, "bestanden");
    const letzte = meldungen[meldungen.length - 1];
    erwarte.gleich(letzte.code, erwartet, "der Code steht in der Meldung");
    erwarte.gleich(K().ergebnisLesen(letzte.code).platz, 3, "und trägt den Platz dieses Geräts");
    erwarte.gleich(Spiel.instanz(inst.iid), null, "die Instanz ist danach weg – der Code musste vorher entstehen");
    console.log(`MESSUNG Bus: code=${letzte.code} bestanden=${letzte.bestanden} sterne=${letzte.sterne}`);
  }, {trocken: false}));
});
