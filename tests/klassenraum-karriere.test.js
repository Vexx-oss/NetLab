"use strict";
/* KLASSENRAUM-AUFTRAG VERFÄLSCHT DIE KARRIERE NICHT (Fahrplan 1.3/2.0 § 2.3, Entwurf § 4.5/E2)

   Befund (im Fahrplan an einem Lauf gemessen, hier nachgemessen): ein Auftrag mit
   `quelle:"klassenraum"` lief bis hierher durch den normalen Weg von `Spiel.abschliessen` –
   +33 €, +1 Ruf, ein `st.erledigt`-Eintrag, Wochenziel-Zähler +1, Kundensterne `[] → [5]`.
   `src/spiel/abnahme.js` leitete NUR `quelle:"training"` um.

   Die Lösung ist EINE Umleitung neben dem Trainingszweig, symmetrisch zu Architektur § 13.3
   Punkt 1: `Spiel.abschliessen` schickt `quelle === "klassenraum"` an `Spiel.klassenraum.abnehmen`
   (`src/spiel/klassenraum.js`), und der ruft `Spiel.lernenNachAbnahme` SELBST – wie
   `Spiel.training.abnehmen` (`training.js:230`), sonst wäre der Lernwert weg.

   Der Kernfall ist eine MESSUNG: derselbe Auftrag (`salon-01`, Seed 7, Lösung angewandt) wird
   abgenommen und VORHER/NACHHER verglichen – Euro, Ruf, `st.erledigt`, Kassenbuch, Wochenziel,
   Kundensterne, Kundenampel, Karriere-Statistik, Tagebuch, Fehlerdex. Dazu die Gegenprobe: ein
   NORMALER Auftrag verändert all das weiterhin (ohne sie prüfte der Test nichts, AGENTS.md).

   Aufbau wie tests/spiel-training.test.js: Wegwerf-Spielstand, Lernmotor wird mit
   wiederhergestellt, `trocken:false` dort, wo wirklich gemessen wird (sonst ist `L.ueben` stumm). */
gruppe("Spiel: Klassenraum-Karriere", () => {
  /* Wegwerf-Spielstand (Muster tests/spiel-training.test.js): Spielstand, Einstellungen, Speicher
     und Lernmotor werden danach wiederhergestellt – L.ueben wirkt sonst über diesen Test hinaus. */
  function wegwerf(fn, {trocken = true} = {}){
    const alt = {
      st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
      labor: store.get("labor", null), einstStore: store.get("einst", null),
      gen: Object.assign({}, Spiel.generierte),
    };
    const lern = L.st;
    const lernAlt = JSON.parse(JSON.stringify({units: lern.units, log: lern.log, fehler: lern.fehler, tage: lern.tage, tests: lern.tests}));
    try {
      Spiel._trocken = trocken; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      return fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      store.set("labor", alt.labor); store.set("einst", alt.einstStore);
      for (const k of Object.keys(Spiel.generierte)) if (!(k in alt.gen)) delete Spiel.generierte[k];
      lern.units = lernAlt.units; lern.log = lernAlt.log; lern.fehler = lernAlt.fehler; lern.tage = lernAlt.tage; lern.tests = lernAlt.tests;
      store.set("lern", lern);
      jetzt.frei();
    }
  }

  /* Ein Auftrag wie im echten Weg: anlegen (Öffnungsweg nach Architektur § 12: quelle klassenraum,
     ohneFlow), öffnen, Lösung anwenden. `loesen:false` lässt den Fehler stehen. */
  function auftrag(quelle, {loesen = true, ticketId = "salon-01", seed = 7} = {}){
    const inst = Spiel.instanzErstellen({ticketId, seed, quelle, ohneFlow: true});
    Spiel.oeffnen(inst.iid);
    if (loesen) {
      Spiel.loesung(inst.netz, Spiel.defVon(inst).loesung);
      if (typeof Spiel.arbeitszieleErfuellen === "function") Spiel.arbeitszieleErfuellen(inst);
    }
    return inst;
  }

  /* Alles, was ein Auftrag an der Karriere verändern KANN – eine Quelle für Vorher und Nachher. */
  function karriereStand(){
    const st = Spiel.st, kunde = st.kunden.salon || null;
    const w = Spiel.woche.stand();
    return {
      euro: st.euro, ruf: st.ruf,
      erledigt: st.erledigt.length,
      buch: st.buch.length,
      woche: w ? w.ist : null,
      kundensterne: kunde ? kunde.sterne.slice() : null,
      kundenampel: kunde ? kunde.ampel : null,
      kundenvertrag: kunde ? !!kunde.vertrag : null,
      karriereAktiv: Spiel.karriere.daten().statistik.aktiv,
      tagebuch: (st.tagebuch || []).length,
      dex: Object.keys(st.dex || {}).length,
      einstiegFertig: !!st.einstieg.fertig,
    };
  }

  const WOCHE = () => ({woche: Spiel.woche.montag(), id: "ohneHilfe", erreicht: false});   /* wie Spiel.woche.waehlen es setzt */

  /* ---------- Der Kernfall: die Messung ---------- */
  pruefe("Kernmessung: ein Klassenraum-Auftrag lässt JEDE Karriere-Zahl unverändert – der Lernstand steigt trotzdem", () => wegwerf(() => {
    const inst = auftrag("klassenraum");
    const def = Spiel.defVon(inst), skill = def.skills[0];
    Spiel.st.wochenziel = WOCHE();
    const vorher = karriereStand();
    const rVorher = (L.get(skill) || {}).r || 0;
    const ab = Spiel.abnahme(inst);
    erwarte.wahr(ab.bestanden, "die Lösung besteht die Abnahme: " + JSON.stringify(ab.ergebnisse.map(e => [e.ziel.typ, e.ok, e.grund])));
    const erg = Spiel.abschliessen(inst, ab);
    const nachher = karriereStand();

    erwarte.gleich(nachher, vorher, "keine einzige Karriere-Zahl ändert sich (Euro, Ruf, erledigt, Buch, Woche, Kunden, Statistik, Tagebuch, Dex, Einstieg)");
    erwarte.gleich([erg.euro, erg.ruf], [0, 0], "das Ergebnis nennt 0 € und 0 Ruf");
    erwarte.gleich(erg.woche, null, "kein Wochenziel-Bonus im Ergebnis");
    erwarte.gleich([erg.raetsel, erg.kundenakte, erg.dex.length, erg.naechstes], [null, null, 0, null], "keine Rätsel-, Akten-, Dex- oder Nachfolge-Wirkung");
    erwarte.enthaelt(erg.hinweis, "kein Geld", "das Ergebnis sagt ehrlich, dass es nichts zahlt");

    /* Die Auflage: der Lernwert bleibt (sonst wäre die Umleitung ein Rückschritt). */
    erwarte.gleich(((L.get(skill) || {}).r || 0), rVorher + 1, `${skill}: L.ueben hat die richtige Antwort gezählt`);
    erwarte.wahr(erg.lernen.some(l => l.id === skill), "lernenNachAbnahme wurde gerufen: " + JSON.stringify(erg.lernen));
    erwarte.wahr(L.versucht(skill), "der Lernmotor kennt die Fertigkeit");
    erwarte.wahr(L.heuteZahl() >= 1, "der Übungstag wurde gezählt");

    erwarte.gleich(Spiel.instanz(inst.iid), null, "der gelöste Auftrag ist aus dem Postfach");
  }, {trocken: false}));

  /* ---------- Wochenziel: der Zähler, der die Karriere am schnellsten verfälscht ---------- */
  pruefe("Wochenziel: vier Aufträge stehen, der fünfte ist ein Klassenraum-Auftrag – das Ziel bleibt offen, kein +1 Ruf", () => wegwerf(() => {
    Spiel.st.wochenziel = WOCHE();
    for (let i = 0; i < 4; i++) Spiel.st.erledigt.push({id: "geprueft-" + i, sterne: 5, tag: heute(), hilfe: 0, quelle: "postfach", form: "stoerung"});
    erwarte.gleich(Spiel.woche.stand().ist, 4, "vier Aufträge zählen");
    const inst = auftrag("klassenraum");
    Spiel.abschliessen(inst, Spiel.abnahme(inst));
    erwarte.gleich([Spiel.woche.stand().ist, Spiel.woche.stand().erreicht, Spiel.st.ruf], [4, false, 0], "der Klassenraum-Auftrag zählt nicht mit");
  }, {trocken: false}));

  /* ---------- Kein Karriere-Ereignis: der Bus bleibt still ---------- */
  pruefe("Kein Karriere-Ereignis: Klassenraum meldet kein „ticket-geloest“ – ein normaler Auftrag schon", () => wegwerf(() => {
    Spiel.karriere.hoererAnmelden();                       /* was Spiel.laden tut (idempotent) */
    const inst = auftrag("klassenraum");
    let klasse = 0;
    const abH = Bus.an("ticket-geloest", () => klasse++);
    Spiel.abschliessen(inst, Spiel.abnahme(inst));
    abH();
    let normal = 0;
    const z = auftrag("postfach");
    const abH2 = Bus.an("ticket-geloest", () => normal++);
    Spiel.abschliessen(z, Spiel.abnahme(z));
    abH2();
    erwarte.gleich([klasse, normal], [0, 1], "Klassenraum meldet nichts, der normale Auftrag meldet genau einmal");
    erwarte.gleich(Spiel.karriere.daten().statistik.aktiv, Spiel.st.euro, "die Karriere-Statistik zählt nur den normalen Lohn");
    erwarte.wahr(Spiel.st.euro > 0 && Spiel.st.ruf > 0, `der normale Auftrag zahlt weiterhin: ${Spiel.st.euro} € / ${Spiel.st.ruf} Ruf`);
  }, {trocken: false}));

  /* ---------- Die Umleitung steht vor JEDEM Nebeneffekt ---------- */
  pruefe("Die Umleitung steht vor jedem Nebeneffekt: kein Kassenbuch, kein Fehlerdex, kein Tagebuch, keine neuen Postfach-Aufträge", () => wegwerf(() => {
    const inst = auftrag("klassenraum");
    const postfachVorher = Spiel.st.postfach.length, angebotVorher = Spiel.st.angebot.length;
    Spiel.abschliessen(inst, Spiel.abnahme(inst));
    erwarte.gleich(Spiel.st.buch, [], "keine Gutschrift im Kassenbuch");
    erwarte.gleich(Spiel.st.dex, {}, "kein Fehlerdex-Eintrag");
    erwarte.gleich((Spiel.st.tagebuch || []).length, 0, "kein Tagebuch-Eintrag");
    erwarte.gleich(Spiel.st.postfach.length, postfachVorher - 1, "der gelöste Auftrag ist weg – und es kommt keiner nach");
    erwarte.gleich(Spiel.st.angebot.length, angebotVorher, "kein neues Angebot");
  }, {trocken: false}));

  /* ---------- Gegenprobe: der normale Weg verändert weiterhin alles ---------- */
  pruefe("Gegenprobe: ein normaler Auftrag verändert Euro, Ruf, erledigt, Wochenziel und Kundensterne weiterhin", () => wegwerf(() => {
    Spiel.st.wochenziel = WOCHE();
    const inst = auftrag("postfach");
    const vorher = karriereStand();
    const ab = Spiel.abnahme(inst);
    erwarte.wahr(ab.bestanden, "die Lösung besteht die Abnahme: " + JSON.stringify(ab.ergebnisse.map(e => [e.ziel.typ, e.ok, e.grund])));
    const erg = Spiel.abschliessen(inst, ab);
    const nachher = karriereStand();
    erwarte.wahr(nachher.euro > vorher.euro, `Euro steigt: ${vorher.euro} → ${nachher.euro}`);
    erwarte.wahr(nachher.ruf > vorher.ruf, `Ruf steigt: ${vorher.ruf} → ${nachher.ruf}`);
    erwarte.gleich([nachher.erledigt, nachher.buch, nachher.woche], [1, 1, 1], "erledigt, Kassenbuch und Wochenziel-Zähler wachsen");
    erwarte.gleich(nachher.kundensterne, [ab.sterne], "die Kundensterne bekommen den Auftrag");
    erwarte.gleich(nachher.euro, erg.euro, "die Gutschrift entspricht dem Lohn");
    erwarte.wahr(!!erg.dank, "der Kunde bedankt sich");
  }, {trocken: false}));

  /* ---------- Symmetrie: der Trainingsweg, über denselben Aufruf ---------- */
  pruefe("Symmetrie: auch Training läuft über Spiel.abschliessen und lässt jede Karriere-Zahl in Ruhe", () => wegwerf(() => {
    Spiel.st.wochenziel = WOCHE();
    const s = Spiel.TRAINING.find(t => Object.values(Spiel.INJEKTOREN).some(i => (i.skills || []).includes(t.skill)));
    erwarte.wahr(!!s, "kein startbares Trainingsszenario gefunden");
    const r = Spiel.training.starten(s.id);
    erwarte.wahr(r.ok, "Training startet: " + (r.grund || ""));
    const inst = Spiel.instanz(r.iid);
    Spiel.oeffnen(inst.iid);
    Spiel.loesung(inst.netz, Spiel.defVon(inst).loesung);
    if (typeof Spiel.arbeitszieleErfuellen === "function") Spiel.arbeitszieleErfuellen(inst);
    const vorher = karriereStand();
    const skill = Spiel.defVon(inst).skills[0];
    const rVorher = (L.get(skill) || {}).r || 0;
    const erg = Spiel.abschliessen(inst, Spiel.abnahme(inst));
    erwarte.wahr(erg.bestanden, "der Trainingsdurchgang wird bestanden");
    erwarte.gleich(karriereStand(), vorher, "Training lässt jede Karriere-Zahl in Ruhe");
    erwarte.gleich([erg.euro, erg.ruf, erg.woche], [0, 0, null]);
    erwarte.gleich(((L.get(skill) || {}).r || 0), rVorher + 1, "und zahlt trotzdem in den Lernstand ein");
  }, {trocken: false}));

  /* ---------- Ein Fehlversuch bleibt offen ---------- */
  pruefe("Ein Fehlversuch bleibt offen, zahlt nichts und meldet den Lernmotor mit „nicht geübt“", () => wegwerf(() => {
    const inst = auftrag("klassenraum", {loesen: false});
    const skill = Spiel.defVon(inst).skills[0];
    const fVorher = (L.get(skill) || {}).f || 0;
    const ab = Spiel.abnahme(inst);
    erwarte.falsch(ab.bestanden, "ohne Lösung nicht bestanden");
    const erg = Spiel.abschliessen(inst, ab);
    erwarte.gleich([erg.bestanden, erg.euro, erg.ruf, erg.sterne], [false, 0, 0, 0]);
    erwarte.wahr(!!Spiel.instanz(inst.iid), "der Auftrag bleibt offen");
    erwarte.gleich([Spiel.st.euro, Spiel.st.ruf, Spiel.st.erledigt.length, (Spiel.st.tagebuch || []).length], [0, 0, 0, 0]);
    erwarte.gleich(((L.get(skill) || {}).f || 0), fVorher + 1, "L.ueben(false) hat gezählt");
  }, {trocken: false}));

  /* ---------- Die neue Fläche weist Fremdes ab ---------- */
  pruefe("abnehmen weist fremde Aufträge und unbekannte Kennungen ab, ohne etwas zu schreiben", () => wegwerf(() => {
    const fremd = Spiel.instanzErstellen({ticketId: "salon-01", quelle: "postfach"});
    const a = Spiel.klassenraum.abnehmen(fremd, Spiel.abnahme(fremd));
    erwarte.falsch(a.ok, "ein Postfach-Auftrag ist kein Klassenraum-Auftrag");
    erwarte.enthaelt(a.grund, "kein Klassenraum-Auftrag");
    const b = Spiel.klassenraum.abnehmen("i-gibts-nicht");
    erwarte.falsch(b.ok);
    erwarte.enthaelt(b.grund, "nicht mehr da");
    const c = Spiel.klassenraum.abnehmen();
    erwarte.falsch(c.ok, "ohne Instanz kein Absturz, sondern eine Abweisung");
    erwarte.gleich([Spiel.st.euro, Spiel.st.ruf, Spiel.st.erledigt.length, Spiel.st.buch.length], [0, 0, 0, 0]);
  }));

  /* ---------- E1 (task-21): sichtbares Postfach und die Zähler ----------
     Entscheidung E1 des Fahrplans: „Filtern wie `training`". Ein Klassenraum-Auftrag liegt weiterhin in
     `st.postfach` (damit `Spiel.oeffnen`/`Spiel.instanz` ihn finden), gehört aber nicht in die sichtbare
     Liste und nicht in die Zähler – genau wie ein Trainingsdurchgang seit dem 07.10.2026. */
  pruefe("E1: ein Klassenraum-Auftrag steht NICHT im sichtbaren Postfach und hebt keinen Zähler – ein normaler Auftrag schon", () => wegwerf(() => {
    const ungelesenVorher = Spiel.ungelesen();
    const inst = auftrag("klassenraum");
    erwarte.gleich(Spiel.postfach().filter(i => i.quelle === "klassenraum").length, 0, "nicht in der sichtbaren Liste");
    erwarte.gleich(Spiel.offen(), 0, "der Offen-Zähler bleibt bei 0");
    erwarte.gleich(Spiel.ungelesen(), ungelesenVorher, "der Ungelesen-Zähler bleibt unverändert");
    erwarte.gleich((Spiel.instanz(inst.iid) || {}).iid, inst.iid, "Spiel.instanz findet ihn weiterhin – sonst wäre er nicht mehr spielbar");
    console.log(`MESSUNG E1 Klassenraum: sichtbar=${Spiel.postfach().filter(i => i.quelle === "klassenraum").length} · offen=${Spiel.offen()} · ungelesen=${Spiel.ungelesen()}`);
    erwarte.gleich((Spiel.aktiveInstanz() || {}).iid, inst.iid, "Spiel.aktiveInstanz findet ihn weiterhin");
    /* Gegenprobe: der normale Weg zählt weiterhin */
    const n = Spiel.instanzErstellen({ticketId: "salon-02", seed: 3, quelle: "postfach", ohneFlow: true});
    erwarte.gleich(Spiel.postfach().filter(i => i.quelle === "postfach").length, 1, "der normale Auftrag ist sichtbar");
    erwarte.gleich(Spiel.postfach().some(i => i.iid === n.iid), true, "und zwar er");
    erwarte.gleich(Spiel.offen(), 1, "und zählt im Offen-Zähler");
    erwarte.wahr(Spiel.ungelesen() > ungelesenVorher, "und als ungelesen");
    /* Die Heute-Kachel nimmt die AKTIVE Instanz, nicht die sichtbare Liste (hub.js:54): gemessen zeigt sie
       weiterhin den offenen Klassenraum-Auftrag, obwohl der nicht mehr im Postfach steht. Dass daraus keine
       Karrierewirkung entsteht, belegt der eigene Fall unten. */
    /* Die Heute-Kachel nimmt die AKTIVE Instanz – seit task-30 aber nicht mehr training/klassenraum
       (der eigene Fall unten misst das ausführlich). Hier: sie zeigt den sichtbaren, nicht den verborgenen. */
    const hub = Spiel.hub.naechster();
    erwarte.falsch(hub.iid === inst.iid, "die Kachel schlägt den verborgenen Klassenraum-Auftrag nicht vor");
    erwarte.gleich(hub.iid, n.iid, "sondern den sichtbaren normalen Auftrag");
    console.log(`MESSUNG E1 normaler Auftrag: sichtbar=${Spiel.postfach().filter(i => i.quelle === "postfach").length} · offen=${Spiel.offen()} · ungelesen=${Spiel.ungelesen()} · Hub=${Spiel.hub.naechster().iid}`);
  }));

  /* Der zweite Teil der E1-Begründung, nachgemessen: „sonst blockiert es seine eigene `ticketId`"
     (Fahrplan § 7). `Spiel.postfachAuffuellen` bildet `imPostfach` aus `st.postfach` (postfach.js:162),
     NICHT aus `Spiel.postfach()` – die eine Filterzeile ändert daran nichts. Der Entwurf behauptet,
     beide Nebenwirkungen entfielen mit dem Filter; das gilt nur für den Offen-Zähler.
     Wird die Blockade später beseitigt (z. B. `imPostfach` ohne Klassenraum-Instanzen), ist dieser
     Fall mitzuziehen: er hält den heute gemessenen Zustand fest, er fordert ihn nicht. */
  pruefe("gemessen: die ticketId-Blockade bleibt – ein Klassenraum-Auftrag verhindert dasselbe reguläre Ticket", () => {
    const ids = () => Spiel.postfach().filter(i => i.quelle === "postfach").map(i => i.ticketId).sort();
    let erster = null;
    const ohne = wegwerf(() => {
      Spiel._st.stufe = 1;
      erster = Spiel.ticketReihe().find(t => (t.karriere || 1) <= 1 && !Spiel.istErledigt(t.id));
      Spiel.postfachAuffuellen();
      return ids();
    });
    erwarte.wahr(!!erster && ohne.includes(erster.id), `ohne Klassenraum-Auftrag wird „${erster && erster.id}“ angeboten: ` + JSON.stringify(ohne));
    const mit = wegwerf(() => {
      Spiel._st.stufe = 1;
      Spiel.instanzErstellen({ticketId: erster.id, seed: 5, quelle: "klassenraum", ohneFlow: true});
      Spiel.postfachAuffuellen();
      return ids();
    });
    erwarte.gleich(mit.includes(erster.id), false, `mit einem Klassenraum-Auftrag „${erster.id}“ ist es blockiert: ` + JSON.stringify(mit));
    erwarte.gleich(mit.length, ohne.length, "andere Aufträge kommen trotzdem nach: " + JSON.stringify(mit));
    console.log(`MESSUNG ticketId-Blockade: ohne=${JSON.stringify(ohne)} · mit=${JSON.stringify(mit)}`);
  });

  /* ---------- Der 20-s-Ereignistakt (ereignisse.js:129, ui/ereignisse.js:16) ----------
     VORHER gemessen (task-21; 40 erzwungene Takte je Quelle, gleicher Auftrag `salon-02`):
     klassenraum 40 Treffer / 8 × +1 Ruf · training 40/8 · postfach 40/8 – die Ereignisfolge war
     ZEICHENGLEICH. Die Wirkung hing also an „ein Auftrag ist offen", nicht an der Quelle; damit war
     Architektur § 13.3 Punkt 1 („Training zahlt nichts. Kein Geld, kein Ruf …") über den Ereignisweg
     umgangen: `weiterempfehlung` zahlt sofort Ruf (ereignisse.js:87), „Provider anrufen" ebenfalls
     (:145), und beide legen neue Tickets an. NACHHER (task-30): `tick` nimmt `training` und
     `klassenraum` aus – wie `pruefung`, `raetsel` und den Einstiegsauftrag. Auftrag ist `salon-02`:
     `salon-01` ist `Spiel.EINSTIEG_TICKET` (zustand.js:17) und wird aus einem ANDEREN Grund gesperrt.
     Fällig ist der Takt nur nach aktiver Zeit (30 min „selten"); hier wird er je Takt erzwungen, damit
     die Frage „ist die Quelle gesperrt?" beantwortet wird und nicht „ist gerade zufällig Zeit?". */
  pruefe("Ereignistakt: Training und Klassenraum sind still (kein Ruf, keine Tickets) – der normale Auftrag zahlt weiterhin", () => wegwerf(() => {
    function takte(quelle){
      const inst = auftrag(quelle, {loesen: false, ticketId: "salon-02", seed: 3});
      Spiel.st.euro = 0; Spiel.st.ruf = 0; Spiel.st.buch.length = 0; Spiel.st.erledigt.length = 0;
      let treffer = 0, ruf = 0, neueTickets = 0; const ids = [];
      for (let i = 0; i < 40; i++) {
        Spiel.st.ereignisse = {aktivMs: 1e9, letzteMs: 0, n: i, liste: []};      /* fällig erzwingen */
        const vorRuf = Spiel.st.ruf, vorPost = Spiel.st.postfach.length;
        const e = Spiel.ereignisse.tick({inst});
        if (e) { treffer++; ids.push(e.id); if (Spiel.st.ruf > vorRuf) ruf++; if (Spiel.st.postfach.length > vorPost) neueTickets++; }
      }
      return {treffer, ruf, neueTickets, provider: !!inst.providerStoerung, ereignisse: ids};
    }
    const k = takte("klassenraum");
    const t = takte("training");
    const n = takte("postfach");
    erwarte.gleich([k.treffer, k.ruf, k.neueTickets, k.provider], [0, 0, 0, false], "Klassenraum ist still: " + JSON.stringify(k));
    erwarte.gleich([t.treffer, t.ruf, t.neueTickets, t.provider], [0, 0, 0, false], "Training ist still: " + JSON.stringify(t));
    /* Gegenprobe – ohne sie prüfte der Fall nichts: der normale Auftrag bekommt weiter Ereignisse */
    erwarte.wahr(n.treffer > 0, "der normale Auftrag bekommt weiterhin Ereignisse: " + JSON.stringify(n));
    erwarte.wahr(n.ruf > 0, `… und der Takt zahlt dort weiterhin Ruf (${n.ruf} von ${n.treffer})`);
    erwarte.wahr(n.neueTickets > 0, `… und legt weiterhin Tickets an (${n.neueTickets} Takte)`);
    console.log("MESSUNG Ereignistakt (40 erzwungene Takte je Quelle): " + JSON.stringify({klassenraum: k, training: t, normal: n}));
  }, {trocken: false}));

  /* ---------- Die „Heute"-Kachel (hub.js:54) ----------
     VORHER (task-21) gemessen: `Spiel.hub.naechster()` nahm die AKTIVE Instanz ohne Quellfilter, zeigte
     den offenen Klassenraum-Auftrag als „weiter" und nannte seinen Lohn (30 € als Anzeige), obwohl der
     Klassenraum nichts zahlt und seit E1 nicht mehr im Postfach steht – eine falsche Zusage in genau der
     Fläche, die „was jetzt dran ist" verspricht. Karriere-Zahlen änderten sich dabei nicht (gemessen).
     ENTSCHEIDUNG (task-30): `training` und `klassenraum` werden dort ausgenommen – dieselbe Ausnahme wie
     `pruefung`/`raetsel`. Die Übung findet man in ihrer Übungs-/Klassenraum-Ansicht wieder, nicht als
     Karriere-Auftrag mit Lohnversprechen. */
  pruefe("Heute-Kachel (hub.js:54): schlägt keinen Trainings-/Klassenraum-Auftrag vor, aber jeden sichtbaren – und schreibt nichts", () => wegwerf(() => {
    const inst = auftrag("klassenraum");
    const vorher = karriereStand();
    const ohne = Spiel.hub.naechster();
    erwarte.gleich(ohne.art, "leer", "ohne sichtbaren Auftrag ist die Kachel leer, nicht der verborgene Klassenraum-Auftrag");
    console.log(`MESSUNG Heute-Kachel, nur Klassenraum offen: art=${ohne.art} iid=${ohne.iid === undefined ? "–" : ohne.iid}`);
    const n = Spiel.instanzErstellen({ticketId: "salon-02", seed: 3, quelle: "postfach", ohneFlow: true});
    const mit = Spiel.hub.naechster();
    erwarte.gleich(mit.iid, n.iid, "der sichtbare normale Auftrag wird vorgeschlagen");
    erwarte.wahr(mit.euro > 0, `und er nennt dessen Lohn (${mit.euro} €) – bei einem echten Auftrag ist das keine falsche Zusage`);
    erwarte.gleich(karriereStand(), vorher, "die Kachel schreibt nichts: keine Karriere-Zahl ändert sich");
    erwarte.gleich(Spiel.hub.weitere().some(x => x.iid === inst.iid), false, "in der Wahl-Liste steht der Klassenraum-Auftrag nicht");
    console.log(`MESSUNG Heute-Kachel, sichtbarer Auftrag: art=${mit.art} iid=${mit.iid} euro=${mit.euro} · weitere=${Spiel.hub.weitere().length}`);
  }));
});
