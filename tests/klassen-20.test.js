"use strict";
/* KLASSENRAUM: TRÄGT ER EINE SCHULKLASSE? — Trockenlauf mit 20 Geräten und EINEM Auftragscode (task-50).

   Der Klassenraum war bisher nur mit zwei Geräten gemessen (Vorführlauf A/B/C). Hier wird der echte Weg
   zwanzigmal gegangen: die Lehrkraft erzeugt EINEN Code, jedes Gerät liest ihn (`ausCode`), baut seine
   Instanz (`Spiel.instanzErstellen({…, quelle:"klassenraum", ohneFlow:true})`), merkt
   `inst.klassenraum = {sitzung, platz, code}`, löst und liefert einen Ergebnis-Code; die Lehrkraft trägt
   alle zwanzig ein — die Ampel steht auf 20 von 20.

   GEMESSEN WIRD ÜBER `def.id`, NICHT ÜBER DEN NETZKENNWERT (E8): Geräte und Kabelliste sind bei allen
   Geräten gleich, der Abdruck würde eine abweichende Aufgabe also NICHT bemerken (Fahrplan § 2.4).

   Jedes „Gerät" bekommt einen frischen Spielstand, einen frischen Speicher, eine eigene Uhr und einen
   eigenen Zählerstand — nur der Code ist gemeinsam. So ist „dasselbe Ergebnis auf zwanzig Geräten" eine
   echte Aussage und keine Folge geteilten Zustands.

   Die Ampel selbst liegt in der Oberfläche (src/ui/klassenraum.js), die der Node-Lauf nicht lädt; ihre
   Regel (§ 9: fertig = belegte Plätze, offen = plaetze − fertig, Median = OBERER Median) wird hier auf dem
   Spielstand nachgerechnet und die Zeile im Code benannt.

   Ehrlich benannt: Der Lauf prüft zwanzig Geräte in EINEM Prozess nacheinander, nicht zwanzig Prozesse
   gleichzeitig; Nebenläufigkeit (zwei Geräte schreiben gleichzeitig in denselben Speicher) gibt es hier
   nicht — jedes Gerät hat seinen eigenen Speicher, wie in echt. */
gruppe("Klassenraum: 20 Geräte", () => {
  const BASIS = Date.UTC(2026, 9, 9, 9, 0, 0);
  const K = () => Spiel.klassenraum;

  /* Kapsel: Spielstand, Einstellungen, GANZER Speicher, Lernmotor und Uhr werden wiederhergestellt
     (Muster tests/klassenraum-loesbarkeit.test.js – `erzeugen` schreibt in store "klassenraum"). */
  function kapsel(fn){
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
      gen: Object.assign({}, Spiel.generierte), speicher: store.alles(), uhr: jetzt()};
    const lern = L.st;
    const lernAlt = JSON.parse(JSON.stringify({units: lern.units, log: lern.log, fehler: lern.fehler, tage: lern.tage, tests: lern.tests}));
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      Spiel._einst.wahl = "E";
      jetzt.setzen(BASIS);
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

  /* Ein Gerät: frischer Stand, eigener Speicher, eigene Uhr, eigener Zähler – nur der Code ist gemeinsam. */
  function geraet(code, platz, {loesen = true} = {}){
    Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99; Spiel._st.naechsteIid = 1000 + platz * 13;
    Spiel._lz = {}; store.set("klassenraum", null);
    jetzt.setzen(BASIS + platz * 7000);
    const c = K().ausCode(code);
    if (!c || c.fehler) return {fehler: c ? c.grund : "leerer Code"};
    const inst = Spiel.instanzErstellen(c.skill
      ? {gen: {skill: c.skill, seed: c.seed}, quelle: "klassenraum", ohneFlow: true}
      : {ticketId: c.ticketId, seed: c.seed, quelle: "klassenraum", ohneFlow: true});
    inst.klassenraum = {sitzung: c.sitzung, platz, code: c.code};
    Spiel.oeffnen(inst.iid);
    if (loesen){
      Spiel.loesung(inst.netz, Spiel.defVon(inst).loesung);
      if (typeof Spiel.arbeitszieleErfuellen === "function") Spiel.arbeitszieleErfuellen(inst);
    }
    return {c, inst};
  }

  /* Die Ampel-Regel der Ansicht (src/ui/klassenraum.js:58-82) auf dem Spielstand nachgerechnet. */
  function ampel(s){
    const werte = Object.keys(s.ergebnisse || {}).map(k => s.ergebnisse[k]).filter(x => x && typeof x === "object");
    const plaetze = Math.max(0, Number(s.plaetze) || 0);
    const fertig = werte.length;
    const ohne = werte.filter(x => !(Number(x.platz) >= 1) || (plaetze > 0 && Number(x.platz) > plaetze)).length;
    const dauern = werte.map(x => x.dauerS).filter(d => typeof d === "number" && d > 0).sort((a, b) => a - b);
    return {farbe: !fertig ? "" : (plaetze > 0 && fertig >= plaetze && !ohne) ? "kl-gruen" : "kl-gelb",
      fertig, plaetze, offen: plaetze > 0 ? Math.max(0, plaetze - fertig) : null, ohne,
      median: dauern.length ? dauern[Math.floor(dauern.length / 2)] : null};
  }
  const zahlen = n => Array.from({length: n}, (_, i) => i + 1);
  const namen = obj => Object.keys(obj).sort().join("|");

  /* ---------- 1 · Der Trockenlauf ---------- */
  pruefe("Trockenlauf: EIN Code, 20 Geräte, derselbe Auftrag (über def.id) – Ampel 20 von 20", () => kapsel(() => {
    const lehrer = K().erzeugen({ticketId: "salon-06", seed: 7});
    erwarte.falsch(!!lehrer.fehler, "erzeugen: " + (lehrer.grund || ""));
    erwarte.gleich(K().plaetzeSetzen(20), {ok: true, plaetze: 20}, "Klassenstärke 20");
    let lehrerStand = store.get("klassenraum", null);

    const t0 = Date.now();
    const fehler = [], ids = [], saaten = [], indizes = [], plaetze = [], codes = [];
    for (const platz of zahlen(20)){
      const g = geraet(lehrer.code, platz);
      if (g.fehler){ fehler.push(`Platz ${platz}: ${g.fehler}`); continue; }
      const def = Spiel.defVon(g.inst);
      ids.push(def.id); saaten.push(g.c.seed); indizes.push(g.c.index + "/" + g.c.variante);
      plaetze.push(g.inst.klassenraum.platz);
      if (Spiel.postfach().some(x => x.iid === g.inst.iid)) fehler.push(`Platz ${platz}: im sichtbaren Postfach (E1)`);
      g.inst.zeitMs = (60 + platz * 10) * 1000;                       /* Arbeitszeit, wie die Uhr sie bucht */
      const ab = Spiel.abnahme(g.inst);
      if (!ab.bestanden) fehler.push(`Platz ${platz}: Abnahme nicht bestanden ` + JSON.stringify(ab.ergebnisse.filter(e => !e.ok).map(e => e.grund)));
      const code = K().ergebnisCode(g.inst, ab);
      if (typeof code !== "string") fehler.push(`Platz ${platz}: Ergebnis-Code ${JSON.stringify(code)}`);
      else codes.push(code);
      store.set("klassenraum", lehrerStand);                          /* zurück auf das Lehrergerät */
      const e = typeof code === "string" ? K().ergebnisEintragen(code) : null;
      if (!e || !e.ok || !e.neu) fehler.push(`Platz ${platz}: Eintrag ${JSON.stringify(e)}`);
      lehrerStand = store.get("klassenraum", null);
    }
    const ms = Date.now() - t0;

    erwarte.gleich(fehler, [], "kein Gerät scheitert");
    erwarte.gleich(codes.length, 20, "20 Ergebnis-Codes");
    erwarte.gleich(new Set(ids).size, 1, "alle 20 bauen DENSELBEN Auftrag (def.id): " + JSON.stringify([...new Set(ids)]));
    erwarte.gleich(ids[0], lehrer.ticketId, "und zwar den angesagten Auftrag");
    erwarte.gleich([new Set(saaten).size, new Set(indizes).size], [1, 1], "gleicher Seed, gleicher Index/dieselbe Variante: " + JSON.stringify([...new Set(indizes)]));
    erwarte.gleich(new Set(codes).size, 20, "20 verschiedene Ergebnis-Codes");
    erwarte.gleich(new Set(plaetze).size, 20, "20 verschiedene Plätze");
    erwarte.gleich(plaetze.slice().sort((a, b) => a - b), zahlen(20), "Plätze 1..20");

    const s = lehrerStand.sitzung;
    const a = ampel(s);
    erwarte.gleich([a.farbe, a.fertig, a.plaetze, a.offen, a.ohne], ["kl-gruen", 20, 20, 0, 0], "Ampel 20 von 20 (Regel src/ui/klassenraum.js:58-82)");
    erwarte.gleich(Object.keys(s.ergebnisse).map(Number).sort((x, y) => x - y), zahlen(20), "alle 20 Plätze belegt");
    erwarte.gleich(a.median, 170, "oberer Median der Dauern 70..260 s");
    erwarte.wahr(ms < 60000, "Laufzeit im Rahmen: " + ms + " ms");
    console.log(`MESSUNG Trockenlauf: 20 Geräte · ${codes.length} Ergebnis-Codes · Ampel ${a.fertig}/${a.plaetze} (${a.farbe}) · Median ${a.median} s · ${ms} ms`);
  }));

  /* ---------- 2 · Grenze des Platzfelds (5 Bit) ---------- */
  pruefe("Platzfeld: 20 reichen; 31 ist die Grenze, 32 klemmt still auf 31 (Befund)", () => kapsel(() => {
    const s = K().erzeugen({ticketId: "salon-06", seed: 7});
    const probe = platz => KlassenraumCodec.ergebnisLesen(KlassenraumCodec.ergebnisBauen({sitzung: s.id, platz, sterne: 4, versuche: 0, dauerS: 60})).platz;
    erwarte.gleich(probe(1), 1, "Platz 1");
    erwarte.gleich(probe(20), 20, "20 Plätze passen");
    erwarte.gleich(probe(31), 31, "31 ist die Obergrenze des 5-Bit-Felds");
    erwarte.gleich(probe(32), 31, "32 wird STILL auf 31 geklemmt (Befund: zwei Geräte auf Platz 32 träfen Platz 31)");
    /* Die API weist einen unmöglichen Platz ab, bevor ein Code entsteht. */
    const g = geraet(s.code, 1);
    g.inst.klassenraum.platz = 32;
    const r = K().ergebnisCode(g.inst, Spiel.abnahme(g.inst));
    erwarte.gleich([r.fehler, typeof r.grund], ["auftrag", "string"], "ergebnisCode weist Platz 32 ab: " + JSON.stringify(r));
    console.log(`MESSUNG Platzfeld: 31 ok · 32 -> ${probe(32)} (Codec klemmt still) · API-Abweisung: ${r.fehler}`);
  }));

  /* ---------- 3 · Zwei Geräte auf demselben Platz ---------- */
  pruefe("Zwei Geräte auf demselben Platz: der erste Eintrag gewinnt, die Ampel bleibt bei 1 von 2", () => kapsel(() => {
    const lehrer = K().erzeugen({ticketId: "salon-06", seed: 7});
    K().plaetzeSetzen(2);
    let lehrerStand = store.get("klassenraum", null);
    const ergebnis = [];
    for (const dauer of [60, 120]){                       /* zwei Geräte, beide auf Platz 1, verschiedene Zeiten */
      const g = geraet(lehrer.code, 1);
      g.inst.zeitMs = dauer * 1000;
      const ab = Spiel.abnahme(g.inst);
      const code = K().ergebnisCode(g.inst, ab);
      store.set("klassenraum", lehrerStand);
      const e = K().ergebnisEintragen(code);
      ergebnis.push({code, e});
      lehrerStand = store.get("klassenraum", null);
    }
    const s = lehrerStand.sitzung;
    const a = ampel(s);
    erwarte.gleich([ergebnis[0].e.ok, ergebnis[0].e.neu], [true, true], "das erste Gerät trägt ein");
    erwarte.gleich([ergebnis[1].e.ok, ergebnis[1].e.neu, ergebnis[1].e.grund], [true, false, "platz-schon-da"], "das zweite wird abgewiesen, ohne etwas zu ändern");
    erwarte.gleich([Object.keys(s.ergebnisse).length, a.fertig, a.offen, a.farbe], [1, 1, 1, "kl-gelb"], "die Ampel bleibt bei 1 von 2");
    erwarte.gleich(s.ergebnisse["1"].code, ergebnis[0].code, "es gilt der ZUERST eingetragene Code");
    erwarte.gleich(s.ergebnisse["1"].dauerS, 60, "und seine Dauer");
    console.log(`MESSUNG Doppelplatz: Gerät A ok/neu=${ergebnis[0].e.neu} · Gerät B ${ergebnis[1].e.grund} · Ampel ${a.fertig}/${a.plaetze}`);
  }));

  /* ---------- 4 · Zwei Sitzungen ---------- */
  pruefe("Zwei Sitzungen gleichzeitig gehen nicht: die zweite verdrängt die erste (Befund für 3.0)", () => kapsel(() => {
    const eins = K().erzeugen({ticketId: "salon-06", seed: 7});
    const lehrerStand1 = store.get("klassenraum", null);
    const g = geraet(eins.code, 1);
    g.inst.zeitMs = 60000;
    const codeEins = K().ergebnisCode(g.inst, Spiel.abnahme(g.inst));
    store.set("klassenraum", lehrerStand1);                    /* zurück auf das Lehrergerät der ersten Sitzung */
    const exportEins = K().exportieren();
    erwarte.wahr(typeof exportEins === "string", "Sitzung 1 lässt sich sichern: " + JSON.stringify(exportEins));
    const zwei = K().erzeugen({ticketId: "salon-02", seed: 3});
    const laufend = K().sitzung();
    erwarte.gleich([zwei.id === eins.id, laufend.id, laufend.code], [false, zwei.id, zwei.code], "die zweite Sitzung hat die erste verdrängt");
    const eAlt = K().ergebnisEintragen(codeEins);
    erwarte.gleich([eAlt.fehler, typeof eAlt.grund], ["sitzung", "string"], "ein Code der verdrängten Sitzung wird abgewiesen: " + JSON.stringify(eAlt));
    erwarte.enthaelt(eAlt.grund, "Sitzung " + eins.id, "und der Grund nennt die Sitzung des Codes");
    store.set("klassenraum", null);                            /* frischer Rechner: die Sitzung ist weg … */
    erwarte.gleich(K().sitzung(), null, "ohne Datei ist die Sitzung weg");
    const imp = K().importieren(exportEins);                   /* … aber die gesicherte Datei bringt sie zurück */
    const nachImport = K().sitzung();
    erwarte.wahr(imp.ok, "Import: " + JSON.stringify(imp && imp.grund));
    erwarte.gleich([nachImport.id, nachImport.code], [eins.id, eins.code], "nach dem Import läuft wieder Sitzung 1");
    erwarte.gleich(K().ergebnisEintragen(codeEins).ok, true, "und ihr Code wird wieder angenommen");
    console.log(`MESSUNG Sitzungen: S1=${eins.id} (${eins.code}) · S2=${zwei.id} (${zwei.code}) verdrängt S1 · Code aus S1 gegen S2: ${eAlt.fehler} · nach Import läuft S${nachImport.id}`);
  }));

  /* ---------- 5 · Keine Bewertung, kein Personenbezug, keine Rangfolge ---------- */
  pruefe("Keine Bewertung, kein Personenbezug, keine Rangfolge: nur Platz-Zahlen in Speicher und Export", () => kapsel(() => {
    const lehrer = K().erzeugen({ticketId: "salon-06", seed: 7, titel: "Kasse ohne Netz"});
    K().plaetzeSetzen(2);
    let lehrerStand = store.get("klassenraum", null);
    for (const platz of [1, 2]){
      const g = geraet(lehrer.code, platz);
      g.inst.zeitMs = (60 + platz * 10) * 1000;
      const code = K().ergebnisCode(g.inst, Spiel.abnahme(g.inst));
      store.set("klassenraum", lehrerStand);
      K().ergebnisEintragen(code);
      lehrerStand = store.get("klassenraum", null);
    }
    const s = lehrerStand.sitzung;
    const eintrag = s.ergebnisse["1"];
    erwarte.gleich(namen(eintrag), "code|dauerS|platz|quelle|sterne|versuche|zeit", "ein Ergebnis trägt genau diese Felder");
    const verboten = /name|schueler|schüler|note|zensur|rang|bewertung|punkte/i;
    erwarte.gleich(Object.keys(s).filter(k => verboten.test(k)), [], "kein Feld der Sitzung ist personenbezogen: " + Object.keys(s).join(", "));
    erwarte.gleich(Object.keys(eintrag).filter(k => verboten.test(k)), [], "kein Feld eines Ergebnisses ist personenbezogen");
    const gelesen = K().ergebnisLesen(eintrag.code);
    erwarte.gleich(Object.keys(gelesen).filter(k => verboten.test(k)), [], "auch der gelesene Ergebnis-Code trägt nichts davon");
    erwarte.gleich([gelesen.platz, typeof gelesen.sterne], [1, "number"], "nur Platz und Sterne kommen zurück");
    const text = K().exportieren();
    erwarte.gleich(JSON.parse(text).sitzung.ergebnisse["1"].platz, 1, "der Export trägt Platz-Zahlen");
    erwarte.falsch(verboten.test(text), "und keine personenbezogenen Feldnamen: " + (text.match(verboten) || []).join(", "));
    const a = ampel(s);
    erwarte.gleich([a.fertig, a.plaetze, a.offen], [2, 2, 0], "die Ampel zählt nur (2 von 2), sie bewertet nicht");
    console.log(`MESSUNG Zusage: Felder Sitzung=${Object.keys(s).length} · Felder Ergebnis=${Object.keys(eintrag).length} · Ampel ${a.fertig}/${a.plaetze} · Export ${text.length} Zeichen`);
  }));
});
