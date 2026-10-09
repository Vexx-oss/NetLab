"use strict";
/* Baustein D – Trainingsbereich (Vertrag „Hilfestellung – Stufen und Schnittstellen“ § 6).
   Geprüft wird die Logik aus src/spiel/training.js: Szenarien mit belegter Quelle, Start über den
   bestehenden Weg (Spiel.instanzErstellen mit quelle "training"), Stand, Abnahme –
   und die harte Regel: Training zahlt KEIN Geld und KEINEN Ruf und erscheint nicht in der Karriere-Wertung.

   Zwei Wege werden gemessen:
   · Normalfall: Spiel.TRAINING kommt aus dem Datenpaket DATEN.trainings (src/daten/trainings.js, Baustein G).
   · Rückfall: ohne dieses Paket gilt die eingebaute Liste TRAINING_EIGENE_SZENARIEN in derselben Datei.

   Die Oberfläche (src/ui/training.js) lädt der Node-Lauf nicht; ihre Klassen prüft tools/klassen.py,
   ihr Vorhandensein in der gebauten Seite prüft bauen.py. */
gruppe("Spiel: Training", () => {
  /* Wegwerf-Spielstand wie in tests/spiel-varianten.test.js. Zusätzlich werden der Store (labor/einst)
     und der Lernmotor-Zustand wiederhergestellt: L.ueben wirkt sonst über diesen Test hinaus weiter. */
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

  const sz = (skill, art) => Spiel.TRAINING.find(t => t.skill === skill && (!art || t.art === art)) || null;
  const id = (skill, art) => { const t = sz(skill, art); erwarte.wahr(!!t, `kein Szenario für ${skill}${art ? "/" + art : ""}`); return t.id; };

  /* Ein Durchgang wie im echten Weg: starten → öffnen → (Lösung anwenden) → abnehmen */
  function durchgang(szenarioId, {loesen = true} = {}){
    const r = Spiel.training.starten(szenarioId);
    erwarte.wahr(r.ok, `starten(${szenarioId}): ${r.grund || ""}`);
    const inst = Spiel.instanz(r.iid);
    erwarte.wahr(!!inst, "Instanz liegt im Spielstand");
    Spiel.oeffnen(inst.iid);
    if (loesen) {
      Spiel.loesung(inst.netz, Spiel.defVon(inst).loesung);
      if (typeof Spiel.arbeitszieleErfuellen === "function") Spiel.arbeitszieleErfuellen(inst);
    }
    return inst;
  }
  const zahl = (x, d = 0) => typeof x === "number" && isFinite(x) ? x : d;
  const abbild = r => JSON.stringify(r.abnahme.ergebnisse.map(e => [e.ziel.typ, e.ok, e.grund]));

  /* ---------- Herkunft der Liste ---------- */
  pruefe("Spiel.TRAINING ist die eine öffentliche Liste: Datenpaket, sonst die eingebaute Liste", () => {
    erwarte.wahr(Array.isArray(Spiel.TRAINING) && Spiel.TRAINING.length >= 6, `nur ${Spiel.TRAINING.length} Szenarien`);
    if (Array.isArray(DATEN.trainings) && DATEN.trainings.length) {
      erwarte.gleich(Spiel.TRAINING, DATEN.trainings, "DATEN.trainings (Baustein G) ist die Liste");
    } else {
      erwarte.gleich(Spiel.TRAINING, TRAINING_EIGENE_SZENARIEN, "ohne Datenpaket gilt die eingebaute Liste");
    }
  });

  /* ---------- Form der Szenarien ---------- */
  pruefe("mindestens 6 Szenarien, jedes mit Fertigkeit, Minuten, Art, Gerüst und Beschreibung", () => {
    const fehlt = [];
    const ids = new Set();
    for (const t of Spiel.TRAINING) {
      if (ids.has(t.id)) fehlt.push(t.id + ": doppelte ID");
      ids.add(t.id);
      if (!t.titel) fehlt.push(t.id + ": titel");
      if (!t.beschreibung) fehlt.push(t.id + ": beschreibung");
      if (!DATEN.skills.some(s => s.id === t.skill)) fehlt.push(t.id + ": unbekannte Fertigkeit " + t.skill);
      if (!(t.minuten > 0)) fehlt.push(t.id + ": minuten");
      if (!["basis", "stoerung", "pruefung"].includes(t.art)) fehlt.push(t.id + ": art " + t.art);
      if (!["E", "AP1", "AP2"].includes(t.niveau)) fehlt.push(t.id + ": niveau " + t.niveau);
      if (typeof t.geruest !== "boolean") fehlt.push(t.id + ": geruest");
      if (![null, "host", "switch", "router", "server", "firewall", "alle"].includes(t.geraet)) fehlt.push(t.id + ": geraet " + t.geraet);
    }
    erwarte.gleich(fehlt, []);
  });

  pruefe("die sechs Pflichtthemen sind belegt (Link/Ports · IP und Maske · Gateway und Route · DNS · DHCP · VLAN und Trunk)", () => {
    const skills = new Set(Spiel.TRAINING.map(s => s.skill));
    const noetig = ["lab.link", "lab.ip", "lab.gateway", "lab.route", "lab.dns", "lab.dhcp", "lab.vlan", "lab.trunk"];
    erwarte.gleich(noetig.filter(s => !skills.has(s)), []);
    erwarte.wahr(Spiel.TRAINING.some(s => s.art === "basis") && Spiel.TRAINING.some(s => s.art === "stoerung") && Spiel.TRAINING.some(s => s.art === "pruefung"),
      "alle drei Arten kommen vor");
    erwarte.gleich(Spiel.TRAINING.filter(s => s.art === "pruefung" && s.geruest).map(s => s.id), [], "Prüfungsszenarien haben kein Gerüst");
  });

  pruefe("jede Quelle ist aus dem Bestand belegbar (DATEN.lehrtexte oder DATEN.wiki derselben Fertigkeit)", () => {
    /* Kein Szenario erfindet eine Quelle: jeder Teil der Quellenangabe (getrennt durch „ · “) steht
       wörtlich in einer Quelle zu genau dieser Fertigkeit. */
    const bestand = skill => [
      ...Object.values(DATEN.lehrtexte).filter(l => l.skill === skill).map(l => l.quelle || ""),
      (DATEN.wiki[skill] || {}).quelle || "",
      (DATEN.wiki[skill] || {}).belege || "",
    ].join(" · ");
    const fehlt = [];
    for (const t of Spiel.TRAINING) {
      if (typeof t.quelle !== "string" || t.quelle.trim().length < 20) { fehlt.push(t.id + ": Quelle fehlt oder ist zu knapp"); continue; }
      for (const teil of t.quelle.split(" · ")) if (!bestand(t.skill).includes(teil)) fehlt.push(`${t.id}: „${teil}“ steht in keiner Quelle zu ${t.skill}`);
    }
    erwarte.gleich(fehlt, []);
  });

  /* Für jede Fertigkeit wird aus Injektoren × Vorlagen × Kandidaten ermittelt, welcher Gerätetyp den
     Fehler tragen kann. „host“ = Endgerät (Spiel.HOSTTYPEN), sonst der Gerätetyp; „alle“ = mehrere Klassen. */
  const klassen = (() => {
    const merker = new Map();
    return skill => {
      if (merker.has(skill)) return merker.get(skill);
      const gefunden = new Set();
      for (const inj of Object.values(Spiel.INJEKTOREN).filter(i => (i.skills || []).includes(skill))) {
        for (const name of inj.vorlagen || []) {
          const V = Spiel.vorlagen[name];
          if (!V) continue;
          let w = null, kands = [];
          try { w = V.bauen(Zufall(1), {}); } catch (e) { continue; }
          try { kands = inj.passt(w.netz, w.rollen) || []; } catch (e) { kands = []; }
          for (const k of kands) { const g = w.netz.geraete[k.geraet || k.key]; if (g && g.typ) gefunden.add(Spiel.HOSTTYPEN[g.typ] ? "host" : g.typ); }
        }
      }
      merker.set(skill, gefunden);
      return gefunden;
    };
  })();

  pruefe("„geraet“ kommt unverändert durch und ist in der Sprache der Ansicht benannt", () => {
    /* Die Geräteklasse selbst ist Sache des Datenpakets; ihre Zusicherung steht in
       tests/daten-trainings.test.js (Baustein G), das dieselbe Messung führt. Hier wird geprüft, was diese
       Schicht garantiert: liste() reicht den Wert unverändert durch und benennt nur Klassen, die die
       Ansicht kennt (src/ui/training.js) – sonst stünde „undefined“ auf der Karte. */
    const ERLAUBT = [null, "host", "switch", "router", "server", "firewall", "alle"];
    const liste = Spiel.training.liste();
    const fehlt = [];
    for (const t of Spiel.TRAINING) {
      if (!ERLAUBT.includes(t.geraet)) fehlt.push(`${t.id}: unbekannte Geräteklasse „${t.geraet}“`);
      const e = liste.find(x => x.id === t.id);
      if (!e) fehlt.push(t.id + ": fehlt in liste()");
      else if (e.geraet !== t.geraet) fehlt.push(`${t.id}: liste() verändert geraet (${t.geraet} → ${e.geraet})`);
    }
    erwarte.gleich(fehlt, []);
    /* Bericht (keine Zusicherung, s. o.): was die Injektoren wirklich treffen. */
    const abweichung = [];
    for (const t of Spiel.TRAINING) {
      const k = klassen(t.skill);
      const soll = k.size === 0 ? null : (k.size === 1 ? [...k][0] : "alle");
      if (t.geraet !== soll) abweichung.push(`${t.id} (${t.skill}): geraet „${t.geraet}“, gemessen ${k.size ? [...k].sort().join(",") : "keine Injektoren"}`);
    }
    if (abweichung.length) console.log("Hinweis (Datenprüfung liegt bei tests/daten-trainings.test.js): " + abweichung.join(" | "));
  });

  /* ---------- starten ---------- */
  pruefe("starten liefert genau dann ok, wenn die Fertigkeit einen Injektor hat – sonst den ehrlichen Grund", () => wegwerf(() => {
    const vorher = {euro: Spiel.st.euro, ruf: Spiel.st.ruf, erledigt: Spiel.st.erledigt.length, buch: Spiel.st.buch.length};
    const hatInjektor = t => Object.values(Spiel.INJEKTOREN).some(i => (i.skills || []).includes(t.skill));
    const liste = Spiel.training.liste();
    const fehler = [];
    let gestartet = 0;
    for (const t of Spiel.TRAINING) {
      const e = liste.find(x => x.id === t.id);
      const r = Spiel.training.starten(t.id);
      if (!hatInjektor(t)) {
        /* Kein Injektor: dann weder „offen“ noch startbar – und der Grund muss das sagen. */
        if (e.offen) fehler.push(t.id + ": als offen gemeldet, obwohl kein Injektor existiert");
        if (!/Injektor/.test(e.grund)) fehler.push(t.id + ": grund unklar: " + e.grund);
        if (r.ok) fehler.push(t.id + ": gestartet, obwohl es keinen Injektor gibt");
        else if (!/Injektor/.test(r.grund)) fehler.push(t.id + ": Grund unklar: " + r.grund);
        continue;
      }
      if (!r.ok) { fehler.push(`${t.id}: ${r.grund}`); continue; }
      gestartet++;
      const inst = Spiel.instanz(r.iid);
      if (!inst) { fehler.push(t.id + ": keine Instanz"); continue; }
      if (inst.quelle !== "training") fehler.push(t.id + ": quelle " + inst.quelle);
      if (inst.training !== t.id) fehler.push(t.id + ": Szenario nicht an der Instanz");
      if (!Spiel.defVon(inst)) fehler.push(t.id + ": Aufgabe nicht auflösbar");
      if (inst.kunde && !Spiel.st.kunden[inst.kunde]) fehler.push(t.id + ": Kunde ohne Eintrag");
    }
    erwarte.wahr(gestartet >= 6, `nur ${gestartet} Szenarien startbar`);
    erwarte.gleich(fehler, []);
    erwarte.gleich([Spiel.st.euro, Spiel.st.ruf, Spiel.st.erledigt.length, Spiel.st.buch.length],
      [vorher.euro, vorher.ruf, vorher.erledigt, vorher.buch], "starten zahlt nichts");
  }));

  pruefe("starten ist deterministisch: derselbe Stand ergibt denselben Fall", () => {
    const einmal = () => wegwerf(() => {
      jetzt.setzen(1800000000000);
      const r = Spiel.training.starten(id("lab.trunk"));
      const inst = Spiel.instanz(r.iid);
      return {seed: inst.seed, ticketId: inst.ticketId, defId: Spiel.defVon(inst).id, geraete: Object.keys(inst.netz.geraete).sort()};
    });
    const a = einmal(), b = einmal();
    erwarte.gleich(a, b);
  });

  pruefe("starten weist unbekannte Szenarien ab", () => wegwerf(() => {
    const r = Spiel.training.starten("gibtsnicht");
    erwarte.falsch(r.ok);
    erwarte.enthaelt(r.grund, "Unbekanntes Szenario");
  }));

  pruefe("ein neuer Start ersetzt den offenen Durchgang desselben Szenarios (keine Doppel im Postfach)", () => wegwerf(() => {
    const s = id("lab.dns");
    const a = Spiel.training.starten(s);
    const b = Spiel.training.starten(s);
    erwarte.wahr(a.ok && b.ok);
    erwarte.falsch(a.iid === b.iid, "neuer Durchgang");
    erwarte.gleich(Spiel.st.postfach.filter(i => i.quelle === "training").map(i => i.iid), [b.iid]);
    erwarte.gleich(Spiel.instanz(a.iid), null, "der alte Durchgang ist weg");
    erwarte.gleich(Spiel.training.liste().find(e => e.id === s).laeuft, b.iid);
  }));

  /* ---------- liste / stand ---------- */
  pruefe("liste liefert zu jedem Szenario den Stand, den offenen Durchgang und ob es startbar ist", () => wegwerf(() => {
    const liste = Spiel.training.liste();
    erwarte.gleich(liste.length, Spiel.TRAINING.length);
    const ohneInjektor = t => !Object.values(Spiel.INJEKTOREN).some(i => (i.skills || []).includes(t.skill));
    erwarte.gleich(liste.filter(e => e.offen !== !ohneInjektor(e)).map(e => e.id), [], "„offen“ folgt dem Injektor der Fertigkeit");
    erwarte.gleich(liste.filter(e => (e.grund === "") !== e.offen).map(e => e.id), [], "„grund“ nur, wenn nicht startbar");
    erwarte.gleich(liste.map(e => e.stand), Spiel.TRAINING.map(() => ({versucht: 0, bestanden: 0, sterne: 0})));
    erwarte.gleich(liste.map(e => e.laeuft), Spiel.TRAINING.map(() => null));
    for (const e of liste) {
      erwarte.wahr(!!e.skillName && e.skillName !== e.skill, e.id + ": Name der Fertigkeit");
      erwarte.wahr(e.karriereStufe >= 1, e.id + ": Karriere-Stufe der Fertigkeit");
    }
    const offenes = liste.find(e => e.offen);
    Spiel.training.starten(offenes.id);
    erwarte.gleich(Spiel.training.liste().filter(e => e.laeuft).map(e => e.id), [offenes.id], "genau ein offener Durchgang");
  }));

  /* ---------- Bildungsstand (Baustein A) – defensiv ---------- */
  pruefe("ohne Spiel.stufe gilt „azubi“: geführte Simulation mit Gerüst (Schritte, Werkzeug, Leiter)", () => wegwerf(() => {
    const alt = Spiel.stufe;
    delete Spiel.stufe;                                    /* Baustein A ist noch nicht da */
    try {
      const liste = Spiel.training.liste();
      erwarte.gleich(liste.map(e => e.stufe), liste.map(() => "azubi"));
      erwarte.gleich(liste.filter(e => !e.gefuehrt).map(e => e.id), [], "geführte Simulation angeboten");
      erwarte.gleich(liste.filter(e => e.mitGeruest).map(e => e.id), Spiel.TRAINING.filter(s => s.geruest).map(s => s.id), "Gerüst nur bei geruest:true");
      const g = liste.find(e => e.id === id("lab.vlan"));
      erwarte.gleich(g.hilfen.leiter.length, 6, "die Werkzeugleiter hat sechs Sprossen");
      erwarte.wahr(g.hilfen.leiter.every(s => s.titel && s.frage), "jede Sprosse nennt Titel und Frage");
      erwarte.wahr(g.hilfen.werkzeug.length > 20, "Werkzeughinweis vorhanden");
      erwarte.wahr(g.hilfen.tipp.length > 20, "Denkanstoß vorhanden");
      erwarte.wahr(Array.isArray(g.hilfen.schritte), "Schritte liegen bereit");
      const pruef = liste.find(e => e.art === "pruefung");
      erwarte.gleich(pruef.mitGeruest, false, "Prüfungsszenario ohne Gerüst");
      erwarte.gleich(pruef.hilfen, null);
    } finally { if (alt !== undefined) Spiel.stufe = alt; }
  }));

  pruefe("meister sieht die Liste ohne Gerüst, ein werfendes Spiel.stufe fällt auf „azubi“ zurück", () => wegwerf(() => {
    const alt = Spiel.stufe;
    try {
      Spiel.stufe = {id: () => "meister", darf: () => false, erklaerung: () => "nurcodes"};
      const liste = Spiel.training.liste();
      erwarte.gleich(liste.map(e => e.gefuehrt), liste.map(() => false));
      erwarte.gleich(liste.filter(e => e.mitGeruest).map(e => e.id), [], "kein Gerüst für meister");
      erwarte.gleich(liste.filter(e => e.hilfen !== null).map(e => e.id), []);
      erwarte.gleich(liste.map(e => e.stufe), liste.map(() => "meister"));
      /* Baustein A entsteht gleichzeitig: ein Fehler darin darf das Training nicht mitreißen. */
      Spiel.stufe = {id(){ throw new Error("A kaputt"); }, darf(){ throw new Error("A kaputt"); }, erklaerung(){ throw new Error("A kaputt"); }};
      const zweite = Spiel.training.liste();
      erwarte.gleich(zweite.map(e => e.stufe), zweite.map(() => "azubi"));
      erwarte.wahr(zweite.every(e => e.gefuehrt && (e.mitGeruest === !!e.geruest)), "Rückfall auf azubi");
    } finally {
      if (alt === undefined) delete Spiel.stufe; else Spiel.stufe = alt;
    }
  }));

  /* ---------- abnehmen ---------- */
  pruefe("abnehmen schreibt den Stand, ruft den Lernmotor – und zahlt kein Geld und keinen Ruf", () => wegwerf(() => {
    const s = sz("lab.vlan");
    const inst = durchgang(s.id);
    const ab = Spiel.abnahme(inst);
    erwarte.wahr(ab.bestanden, "Lösung besteht die Abnahme: " + JSON.stringify(ab.ergebnisse.map(e => [e.ziel.typ, e.ok, e.grund])));
    const r = Spiel.training.abnehmen(inst.iid, ab);
    erwarte.wahr(r.ok, r.grund || "");
    erwarte.wahr(r.bestanden);
    erwarte.gleich([r.euro, r.ruf], [0, 0], "Training zahlt nichts");
    erwarte.gleich([Spiel.st.euro, Spiel.st.ruf, Spiel.st.erledigt.length, Spiel.st.buch.length], [0, 0, 0, 0], "keine Gutschrift, keine Karriere-Wertung");
    erwarte.gleich(Spiel.training.stand().je[s.id], {versucht: 1, bestanden: 1, bestes: r.sterne});
    erwarte.gleich(Spiel.instanz(inst.iid), null, "der Durchgang ist abgeschlossen");
    erwarte.gleich(Spiel.training.liste().find(e => e.id === s.id).stand, {versucht: 1, bestanden: 1, sterne: r.sterne});
    erwarte.wahr(r.lernen.length >= 1, "Lernmotor wurde informiert");
    erwarte.wahr(r.lernen.some(l => l.id === s.skill && zahl(l.nachher) > zahl(l.vorher)), `${s.skill} ist gestiegen: ` + JSON.stringify(r.lernen));
    erwarte.wahr(L.versucht(s.skill), "L.ueben hat gezählt");
  }, {trocken: false}));

  pruefe("je ein Szenario der drei Arten ist lösbar und wird bestanden (basis · stoerung · pruefung)", () => wegwerf(() => {
    for (const art of ["basis", "stoerung", "pruefung"]) {
      const t = Spiel.TRAINING.find(x => x.art === art && Object.values(Spiel.INJEKTOREN).some(i => (i.skills || []).includes(x.skill)));
      erwarte.wahr(!!t, "kein startbares Szenario der Art " + art);
      const inst = durchgang(t.id);
      const r = Spiel.training.abnehmen(inst.iid, Spiel.abnahme(inst));
      erwarte.wahr(r.ok && r.bestanden, `${t.id} (${art}): ${r.ok ? abbild(r) : r.grund}`);
      erwarte.gleich(r.stand, {versucht: 1, bestanden: 1, bestes: r.sterne});
      erwarte.gleich([Spiel.st.euro, Spiel.st.ruf], [0, 0]);
    }
    erwarte.gleich(Spiel.st.erledigt.length, 0, "drei Durchgänge, kein Karriere-Eintrag");
  }, {trocken: false}));

  pruefe("ein Fehlversuch zählt als Versuch, bleibt offen und meldet den Lernmotor mit „nicht geübt“", () => wegwerf(() => {
    const s = sz("lab.link");
    const inst = durchgang(s.id, {loesen: false});
    const ab = Spiel.abnahme(inst);
    erwarte.falsch(ab.bestanden, "ohne Lösung nicht bestanden");
    const r = Spiel.training.abnehmen(inst.iid, ab);
    erwarte.wahr(r.ok && !r.bestanden);
    erwarte.gleich([r.euro, r.ruf], [0, 0]);
    erwarte.gleich(Spiel.training.stand().je[s.id], {versucht: 1, bestanden: 0, bestes: 0});
    erwarte.wahr(!!Spiel.instanz(inst.iid), "der Durchgang bleibt offen");
    erwarte.wahr(r.lernen.every(l => zahl(l.nachher) <= zahl(l.vorher)), "kein Aufstieg ohne Lösung");
    erwarte.gleich(Spiel.training.liste().find(e => e.id === s.id).laeuft, inst.iid, "er ist der offene Durchgang");
  }, {trocken: false}));

  pruefe("zwei Durchgänge hintereinander zählen beide (versucht 2, bestanden 1)", () => wegwerf(() => {
    const s = sz("lab.ip");
    const eins = durchgang(s.id, {loesen: false});
    Spiel.training.abnehmen(eins.iid, Spiel.abnahme(eins));
    const zwei = durchgang(s.id);
    const r = Spiel.training.abnehmen(zwei.iid, Spiel.abnahme(zwei));
    erwarte.wahr(r.bestanden, abbild(r));
    erwarte.gleich(Spiel.training.stand().je[s.id], {versucht: 2, bestanden: 1, bestes: r.sterne});
  }));

  pruefe("abnehmen weist fremde Instanzen und unbekannte Durchgänge ab", () => wegwerf(() => {
    const fremd = Spiel.instanzErstellen({ticketId: "salon-01", quelle: "postfach"});
    const a = Spiel.training.abnehmen(fremd.iid, Spiel.abnahme(fremd));
    erwarte.falsch(a.ok);
    erwarte.enthaelt(a.grund, "kein Trainingsdurchgang");
    erwarte.gleich(Spiel.training.stand().je, {}, "ein fremdes Ticket schreibt keinen Trainingsstand");
    const b = Spiel.training.abnehmen("i-gibts-nicht");
    erwarte.falsch(b.ok);
    erwarte.enthaelt(b.grund, "nicht mehr da");
  }));

  pruefe("abnehmen ohne ergebnis holt die Abnahme selbst", () => wegwerf(() => {
    const s = sz("lab.dns");
    const inst = durchgang(s.id);
    const r = Spiel.training.abnehmen(inst.iid);
    erwarte.wahr(r.ok && r.bestanden, r.abnahme ? abbild(r) : r.grund);
    erwarte.gleich(r.stand, {versucht: 1, bestanden: 1, bestes: r.sterne});
  }));

  /* ---------- stand() ---------- */
  pruefe("stand() bringt einen halben Stand in Form, ohne etwas zu erfinden", () => wegwerf(() => {
    const a = Spiel.TRAINING[0].id, b = Spiel.TRAINING[1].id;
    Spiel._st.training = null;
    erwarte.gleich(Spiel.training.stand(), {je: {}});
    Spiel._st.training = {je: {[a]: {versucht: "x"}, kaputt: 42, [b]: {versucht: 2, bestanden: 1, bestes: 3.5}}};
    const s = Spiel.training.stand();
    erwarte.gleich(s.je[a], {versucht: 0, bestanden: 0, bestes: 0});
    erwarte.gleich(s.je.kaputt, undefined, "unbrauchbarer Eintrag wird verworfen");
    erwarte.gleich(s.je[b], {versucht: 2, bestanden: 1, bestes: 3.5});
    erwarte.gleich(Spiel.training.liste().find(e => e.id === b).stand, {versucht: 2, bestanden: 1, sterne: 3.5});
  }));

  /* ---------- Rückfall ohne Datenpaket ---------- */
  pruefe("Rückfall: ohne DATEN.trainings gilt die eingebaute Liste – dieselben Regeln, startbar", () => wegwerf(() => {
    erwarte.wahr(Array.isArray(TRAINING_EIGENE_SZENARIEN) && TRAINING_EIGENE_SZENARIEN.length >= 6, "eingebaute Liste fehlt");
    const alt = Spiel.TRAINING;
    Spiel.TRAINING = TRAINING_EIGENE_SZENARIEN;
    try {
      const skills = new Set(Spiel.TRAINING.map(t => t.skill));
      erwarte.gleich(["lab.link", "lab.ip", "lab.gateway", "lab.route", "lab.dns", "lab.dhcp", "lab.vlan", "lab.trunk"].filter(s => !skills.has(s)), []);
      for (const t of Spiel.TRAINING) {
        erwarte.wahr(DATEN.skills.some(s => s.id === t.skill), t.id + ": unbekannte Fertigkeit");
        erwarte.wahr(t.minuten > 0 && ["basis", "stoerung", "pruefung"].includes(t.art) && ["E", "AP1", "AP2"].includes(t.niveau), t.id + ": Form");
        erwarte.wahr(typeof t.quelle === "string" && t.quelle.length > 20, t.id + ": Quelle");
      }
      const r = Spiel.training.starten("vlan");
      erwarte.wahr(r.ok, "Rückfall-Szenario startbar: " + (r.grund || ""));
      erwarte.gleich(Spiel.training.liste().length, TRAINING_EIGENE_SZENARIEN.length);
      const inst = durchgang("vlan");
      const ab = Spiel.training.abnehmen(inst.iid, Spiel.abnahme(inst));
      erwarte.wahr(ab.ok && ab.bestanden, abbild(ab));
      erwarte.gleich([Spiel.st.euro, Spiel.st.ruf, Spiel.st.erledigt.length], [0, 0, 0]);
    } finally { Spiel.TRAINING = alt; }
  }, {trocken: false}));
});
