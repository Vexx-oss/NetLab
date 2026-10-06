"use strict";
/* P1 „Speichern sofort und sichtbar": geprüft wird der SCHREIBWEG, nicht nur der Puffer.
   Jeder Test setzt einen eigenen Schreiber (SPEICHER.schreiber) und stellt danach alles wieder her.
   Die Zeitgeber-Probe ist absichtlich synchron: sie prüft, DASS genau ein Zeitgeber wartet und
   dass sofort geschrieben wird — die Millisekunden misst der Browserlauf (Messplatz). */
gruppe("Spiel-Fluss: Speichern", () => {
  const kapsel = (fn, {tickets = null} = {}) => () => {
    const altDaten = store.alles(), altSchreiber = SPEICHER.schreiber, altSt = Spiel._st,
          altEinst = Spiel._einst, altTrocken = Spiel._trocken, altSchmutzig = SPEICHER.schmutzig,
          altFehler = SPEICHER.fehler, altKennung = SPEICHER.standKennung, altErfolg = SPEICHER.letzterErfolg,
          altTickets = DATEN.tickets, altGen = Object.assign({}, Spiel.generierte), uhr = jetzt();
    const geschrieben = [], fehler = [], staende = [];
    const ab = Bus.an("speicher-fehler", f => fehler.push(f));
    const abStand = Bus.an("speicher-stand", s => staende.push(s));
    try {
      jetzt.setzen(Date.UTC(2026, 8, 30, 8, 0, 0));
      if (tickets) DATEN.tickets = tickets();
      store.initialisieren(JSON.parse(JSON.stringify(altDaten)),
        d => { geschrieben.push(JSON.parse(JSON.stringify(d))); return Promise.resolve(); }, null);
      if (SPEICHER.timer) { clearTimeout(SPEICHER.timer); SPEICHER.timer = null; }
      SPEICHER.schmutzig = false; SPEICHER.fehler = null; SPEICHER.standKennung = null; SPEICHER.letzterErfolg = null;
      fn({geschrieben, fehler, staende});
    } finally {
      ab(); abStand();
      if (SPEICHER.timer) { clearTimeout(SPEICHER.timer); SPEICHER.timer = null; }
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, altDaten);
      SPEICHER.schreiber = altSchreiber; SPEICHER.schmutzig = altSchmutzig;
      SPEICHER.fehler = altFehler; SPEICHER.standKennung = altKennung; SPEICHER.letzterErfolg = altErfolg;
      DATEN.tickets = altTickets; Spiel.generierte = altGen;
      Spiel._st = altSt; Spiel._einst = altEinst; Spiel._trocken = altTrocken;
      jetzt.setzen(uhr); jetzt.frei();
    }
  };

  /* Ein frischer Stand mit echtem Postfach — daraus ein lösbarer Auftrag. */
  const mitAuftrag = fn => kapsel(w => {
    Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
    Spiel.postfachAuffuellen();
    const inst = Spiel.postfach()[0];
    if (!inst) throw new Error("kein Auftrag im Postfach");
    fn(inst, w);
  });

  pruefe("sofortSpeichern schreibt wirklich sofort — nicht erst nach der Entprellung", kapsel(({geschrieben}) => {
    Spiel._st = Spiel.leererStand();
    Spiel.gutschreiben(7.5, 1, "Sofortprobe");
    erwarte.gleich(geschrieben.length, 0, "vor dem Ruf ist nichts auf der Platte");
    Spiel.sofortSpeichern();
    erwarte.gleich(geschrieben.length, 1, "genau ein Schreibvorgang, und zwar unmittelbar");
    erwarte.gleich(geschrieben[0].labor.euro, 7.5, "der neue Wert ist mitgeschrieben");
    erwarte.gleich(SPEICHER.schmutzig, false, "danach ist nichts mehr schmutzig");
    erwarte.gleich(SPEICHER.timer, null, "kein Zeitgeber bleibt stehen");
  }));

  pruefe("ein Spiel.speichern() wartet auf die EINE Entprellung (kein zweiter Zeitgeber)", kapsel(({geschrieben}) => {
    Spiel._st = Spiel.leererStand();
    Spiel.speichern();
    erwarte.gleich(geschrieben.length, 0, "nicht sofort geschrieben");
    erwarte.wahr(!!SPEICHER.timer, "ein Zeitgeber wartet");
    erwarte.gleich(SPEICHER.entprellung, 1500, "die eine Entprellung liegt im Store");
    erwarte.gleich(Spiel.AUTOSPEICHERN_MS, 0, "das Spiel hat keine eigene Verzögerung mehr");
    erwarte.falsch(Spiel._autoTimer, "kein zweiter Zeitgeber im Spiel");
    Spiel.autospeichern();
    erwarte.wahr(!!SPEICHER.timer, "der Autosave-Weg setzt denselben einen Zeitgeber");
    erwarte.gleich(geschrieben.length, 0, "und schreibt weiterhin nicht sofort");
  }));

  pruefe("Netzänderung: Stand wird schmutzig gemeldet (Kopfzeile „schreibt“)", kapsel(({staende, geschrieben}) => {
    const inst = Spiel.instanzErstellen({ticketId: DATEN.tickets[0].id});
    /* Die Meldung hängt an einer ECHTEN Zustandsänderung (kein Dauerfeuer) — für die Probe
       den Merker zurücksetzen, damit der nächste Wechsel wieder meldet. */
    SPEICHER.standKennung = null;
    staende.length = 0;
    Spiel.aendern(inst, "Probe", n => { n.zustand = n.zustand || {}; n.zustand._uhr = (n.zustand._uhr || 0) + 1; });
    erwarte.gleich(store.stand().art, "schreibt");
    erwarte.gleich(staende[staende.length - 1].art, "schreibt");
    erwarte.gleich(geschrieben.length, 0, "noch nicht geschrieben");
  }));

  pruefe("Auftrag öffnen und abschließen: beides schreibt sofort", mitAuftrag((inst, {geschrieben}) => {
    Spiel.oeffnen(inst.iid);
    erwarte.gleich(geschrieben.length, 1, "das Öffnen steht sofort auf der Platte");
    erwarte.gleich(geschrieben[0].labor.aktiv, inst.iid);
    const def = Spiel.defVon(inst);
    Spiel.loesung(inst.netz, def.loesung || []);
    Spiel.arbeitszieleErfuellen(inst);
    const vorher = geschrieben.length;
    const erg = Spiel.abschliessen(inst, Spiel.abnahme(inst));
    erwarte.wahr(erg.bestanden, "der Auftrag muss bestehen");
    erwarte.wahr(geschrieben.length > vorher, "der Abschluss schreibt sofort");
    const letzter = geschrieben[geschrieben.length - 1];
    erwarte.gleich(letzter.labor.erledigt.length, 1, "der erledigte Auftrag steht im geschriebenen Stand");
    erwarte.gleich(letzter.labor.erledigt[0].id, def.id);
    erwarte.gleich(geschrieben[geschrieben.length - 1].labor.aktiv, null, "kein offener Auftrag mehr");
  }));

  pruefe("abgelehnter Abschluss (nicht bestanden) schreibt ebenfalls sofort", mitAuftrag((inst, {geschrieben}) => {
    Spiel.oeffnen(inst.iid);                       /* nichts repariert → Abnahme scheitert */
    const vorher = geschrieben.length;
    const erg = Spiel.abschliessen(inst, Spiel.abnahme(inst));
    erwarte.falsch(erg.bestanden, "ohne Reparatur nicht bestanden");
    erwarte.wahr(geschrieben.length > vorher, "auch der Fehlversuch wird sofort geschrieben");
  }));

  pruefe("Schreibfehler: Stand bleibt schmutzig, Bus meldet speicher-fehler, danach geht es weiter", kapsel(({geschrieben, fehler}) => {
    Spiel._st = Spiel.leererStand();
    Spiel.gutschreiben(3, 0, "Fehlerprobe");
    SPEICHER.schreiber = () => { throw Object.assign(new Error("voll"), {name: "QuotaExceededError"}); };
    const p = Spiel.sofortSpeichern();
    if (p && typeof p.catch === "function") p.catch(() => {});
    erwarte.gleich(geschrieben.length, 0, "nichts geschrieben");
    erwarte.gleich(SPEICHER.schmutzig, true, "nichts verloren: der Stand bleibt schmutzig");
    erwarte.gleich(SPEICHER.fehler.name, "QuotaExceededError");
    erwarte.gleich(store.stand().art, "fehler");
    erwarte.gleich(fehler.length, 1, "genau eine Meldung");
    erwarte.gleich(fehler[0].name, "QuotaExceededError");
    SPEICHER.schreiber = d => { geschrieben.push(JSON.parse(JSON.stringify(d))); return Promise.resolve(); };
    const p2 = Spiel.sofortSpeichern();
    if (p2 && typeof p2.catch === "function") p2.catch(() => {});
    erwarte.gleich(geschrieben.length, 1, "der nächste Versuch nimmt den alten Stand mit");
    erwarte.gleich(geschrieben[0].labor.euro, 3);
    erwarte.gleich(SPEICHER.schmutzig, false, "wieder sauber");
    /* Den Fehler räumt der Erfolgszweig des Versprechens weg (Microtask) — das Kennzeichen in der
       Kopfzeile folgt dem Bus. Hier steht nur, dass der Weg wieder frei ist. */
    erwarte.gleich(SPEICHER.fehler.name, "QuotaExceededError", "bis der Erfolg verbucht ist, steht der Fehler noch");
  }));

  pruefe("Kauf schreibt sofort (Wartungsvertrag und Aussehen)", kapsel(({geschrieben}) => {
    Spiel._st = Spiel.leererStand();
    Spiel._st.euro = 99999; Spiel._st.ruf = 999; Spiel._st.stufe = 9;
    for (const id of Spiel.karriere.kundenIds()) Spiel._st.kunden[id] = {sterne: [5, 5, 5, 5, 5], ampel: "gruen"};
    const liste = Spiel.shop.liste();
    const vertrag = liste.find(x => x.art === "vertrag" && x.zustand === "kaufbar");
    erwarte.wahr(!!vertrag, "ein Wartungsvertrag muss kaufbar sein: "
      + JSON.stringify(liste.filter(x => x.art === "vertrag").map(x => [x.id, x.zustand, x.grund])));
    let vorher = geschrieben.length;
    const rv = Spiel.shop.kaufen(vertrag.id);
    erwarte.wahr(rv.ok, "Vertragskauf: " + rv.grund);
    erwarte.gleich(geschrieben.length, vorher + 1, "der bezahlte Vertrag steht sofort auf der Platte");
    erwarte.gleich(SPEICHER.schmutzig, false, "nichts bleibt liegen");

    const aussehen = liste.find(x => x.art === "aussehen" && x.zustand === "kaufbar");
    erwarte.wahr(!!aussehen, "ein Aussehen muss kaufbar sein");
    vorher = geschrieben.length;
    const ra = Spiel.shop.kaufen(aussehen.id);
    erwarte.wahr(ra.ok, "Aussehenkauf: " + ra.grund);
    erwarte.gleich(geschrieben.length, vorher + 1, "auch der Aussehenkauf steht sofort auf der Platte");
    erwarte.gleich(SPEICHER.schmutzig, false);
  }));

  pruefe("Werkzeug-Kauf schreibt sofort", kapsel(({geschrieben}) => {
    Spiel._st = Spiel.leererStand();
    Spiel._st.euro = 500; Spiel._st.stufe = 3;
    const vorher = geschrieben.length;
    const r = Spiel.werkzeug.kaufen("kabeltester");
    erwarte.wahr(r.ok, "Kauf: " + r.grund);
    erwarte.gleich(geschrieben.length, vorher + 1, "das Werkzeug steht sofort auf der Platte");
    erwarte.gleich(SPEICHER.schmutzig, false, "nichts bleibt liegen");
  }));

  pruefe("Playbook-Kauf und Slot-Kauf schreiben sofort", kapsel(({geschrieben}) => {
    Spiel._st = Spiel.leererStand();
    Spiel._st.euro = 9999;
    let vorher = geschrieben.length;
    const rs = Spiel.playbooks.slotKaufen();
    erwarte.wahr(rs.ok, "Slot-Kauf: " + rs.grund);
    erwarte.gleich(geschrieben.length, vorher + 1, "der Slot steht sofort auf der Platte");
    /* kaufen braucht die Lernmotor-Stufe „sicher“ – hier wird nur der Schreibweg geprüft,
       darum die Einstufung gestellt (die Einstufung selbst prüfen die Shop-Tests). */
    const echt = Spiel.playbooks.status;
    try {
      Spiel.playbooks.status = () => ({skill: "lab.link", name: "Link und Kabel prüfen", box: 4, preis: 120, zustand: "kaufbar", text: "Kaufbar für 120 €."});
      vorher = geschrieben.length;
      const rp = Spiel.playbooks.kaufen("lab.link");
      erwarte.wahr(rp.ok, "Playbook-Kauf: " + rp.grund);
      erwarte.gleich(geschrieben.length, vorher + 1, "das Playbook steht sofort auf der Platte");
    } finally { Spiel.playbooks.status = echt; }
    erwarte.gleich(SPEICHER.schmutzig, false);
  }));

  pruefe("Playbook ablegen schreibt sofort (kein Geld, aber eine Entscheidung)", kapsel(({geschrieben}) => {
    Spiel._st = Spiel.leererStand();
    Spiel._st.playbooks.aktiv = ["lab.link"];
    const vorher = geschrieben.length;
    erwarte.wahr(Spiel.playbooks.ablegen("lab.link"), "ablegen");
    erwarte.gleich(geschrieben.length, vorher + 1, "der Slotwechsel steht sofort auf der Platte");
    erwarte.gleich(SPEICHER.schmutzig, false);
  }));

  pruefe("Durchspiel-Testlauf (trocken) schreibt NICHTS — der Speicherweg bleibt draußen", kapsel(({geschrieben}) => {
    const r = Spiel.testlauf({ids: ["salon-01"], niveau: "E"});
    erwarte.gleich(r.map(x => x.bestanden), [true], "der Durchspiel-Testlauf muss bestehen");
    erwarte.gleich(geschrieben.length, 0, "kein Schreibvorgang im Wegwerf-Spielstand");
    erwarte.gleich(SPEICHER.schmutzig, false, "und nichts bleibt schmutzig");
  }));

  pruefe("Meilenstein (Fest gesehen) schreibt sofort", kapsel(({geschrieben}) => {
    Spiel._st = Spiel.leererStand();
    Spiel.karriere.daten().fest = {gesehen: false, stufe: 3};
    const vorher = geschrieben.length;
    Spiel.karriere.festGesehen();
    erwarte.gleich(geschrieben.length, vorher + 1, "das Fest steht sofort auf der Platte");
    erwarte.gleich(Spiel.karriere.daten().fest.gesehen, true);
  }));

  pruefe("Import: fremde und zu neue Stände werden abgewiesen, alte bleiben erlaubt", kapsel(() => {
    erwarte.falsch(Spiel.importPruefen(null).ok);
    erwarte.falsch(Spiel.importPruefen({format: "etwas-anderes", speicher: {}}).ok);
    erwarte.falsch(Spiel.importPruefen({format: "netzwerk-labor"}).ok, "ohne speicher");
    const neu = Spiel.importPruefen({format: "netzwerk-labor", speicher: {labor: {v: Spiel.VERSION + 1}}});
    erwarte.falsch(neu.ok, "zu neuer Stand");
    erwarte.wahr(neu.zuNeu);
    erwarte.enthaelt(neu.grund, "neueren Fassung");
    erwarte.wahr(Spiel.importPruefen({format: "netzwerk-labor", speicher: {labor: {v: Spiel.VERSION}}}).ok);
    erwarte.wahr(Spiel.importPruefen({format: "netzwerk-labor", speicher: {labor: {v: 1}}}).ok, "v1 wird migriert");
    const ohne = Spiel.importPruefen({format: "netzwerk-labor", speicher: {labor: {euro: 5}}});
    erwarte.wahr(ohne.ok, "Altstand ohne v-Feld muss durchgehen");
    erwarte.gleich(ohne.v, 0);
  }));

  pruefe("Import: der bisherige Stand landet als Zweitsicherung im neuen Speicher", kapsel(() => {
    store.set("labor", Object.assign(Spiel.leererStand(), {euro: 42}));
    const vorher = store.get("labor", null);                    /* genau so macht es die Oberfläche */
    store.initialisieren({labor: {v: Spiel.VERSION, euro: 7}, einst: {}}, SPEICHER.schreiber, null);
    erwarte.wahr(Spiel.sicherungAnlegen(vorher, true), "Sicherung angelegt");
    erwarte.gleich(store.get("labor").euro, 7, "der importierte Stand steht vorn");
    erwarte.gleich(Spiel.sicherung().stand.euro, 42, "der Vorzustand liegt in der Sicherung");
    erwarte.falsch(Spiel.sicherungAnlegen({v: 1, euro: 1}), "eine frische Sicherung wird nicht sofort ersetzt");
    erwarte.gleich(Spiel.sicherung().stand.euro, 42, "die Sicherung bleibt der Vorzustand");
  }));

  pruefe("vor der Migration wird der alte Stand als Zweitsicherung weggelegt", kapsel(() => {
    store.set("labor", {v: 1, euro: 5, ruf: 2, postfach: [], kunden: {}, erledigt: [], fremd: {x: 1}});
    store.set(Spiel.SICHERUNG, null);
    Spiel._st = null;
    const st = Spiel.laden();
    erwarte.gleich(st.v, Spiel.VERSION, "migriert");
    erwarte.gleich(st.euro, 5, "Werte bleiben");
    const s = Spiel.sicherung();
    erwarte.wahr(!!s, "Sicherung angelegt");
    erwarte.gleich(s.v, 1, "Version des alten Standes");
    erwarte.gleich(s.stand.euro, 5);
    erwarte.gleich(s.stand.fremd, {x: 1}, "unbekanntes Feld bleibt erhalten");
  }));

  pruefe("kein Zuwachs: bei aktuellem Stand entsteht KEINE Zweitsicherung", kapsel(() => {
    store.set("labor", Object.assign(Spiel.leererStand(), {euro: 9}));
    store.set(Spiel.SICHERUNG, null);
    Spiel._st = null;
    Spiel.laden();
    erwarte.gleich(store.get(Spiel.SICHERUNG, null), null, "nichts zu sichern");
  }));
});
