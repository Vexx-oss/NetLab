"use strict";
/* Die drei Injektoren des Ausbaus 1.3, die je eine gesperrte Trainingskarte geöffnet haben:
   portsec-fremde-mac (lab.portsec), stp-doppelkabel (lab.stp), nas-ohne-adresse (lab.storage).

   Warum diese Datei: „Grüne Tests ohne Aufruf gelten als nicht fertig." Geprüft wird deshalb die WIRKUNG im
   Netz, nicht die Form des Tickets – der Switchport geht wirklich in err-disabled, der Lauf bricht wirklich
   mit „Broadcast-Sturm" ab (abbruch === "STORM"), das NAS steht wirklich ohne Adresse da, und jede der drei
   Karten läuft über den echten Trainingsweg (starten → lösen → abnehmen) bis zum Bestehen.
   Die Ticket-Form (Pflichtfelder, Grund des ersten Ziels, Lösung heilt, Regression) prüft
   tests/tickets-generator.test.js mit einem Fall je Injektor. */
gruppe("Injektoren: neu", () => {
  /* Wegwerf-Spielstand wie in tests/spiel-training.test.js: eigener Stand, danach alles zurück –
     die Karten unten legen Instanzen an und schreiben den Trainingsstand. */
  function wegwerf(fn){
    const alt = {
      st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
      gen: Object.assign({}, Spiel.generierte), einstStore: store.get("einst", null),
    };
    const lern = L.st;
    const lernAlt = JSON.parse(JSON.stringify({units: lern.units, log: lern.log, fehler: lern.fehler, tage: lern.tage, tests: lern.tests}));
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      return fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      store.set("einst", alt.einstStore);
      for (const k of Object.keys(Spiel.generierte)) if (!(k in alt.gen)) delete Spiel.generierte[k];
      lern.units = lernAlt.units; lern.log = lernAlt.log; lern.fehler = lernAlt.fehler; lern.tage = lernAlt.tage; lern.tests = lernAlt.tests;
      jetzt.frei();
    }
  }

  const bau = (name, vorlage) => {
    const def = Spiel.ticketBauen({id: `neu-${name}`, vorlage, vSeed: 101, injektoren: [{name, wahl: 1}], stufe: "E"});
    erwarte.wahr(!!def, `${name}/${vorlage}: kein Ticket gebaut`);
    return def;
  };
  const portMitPortSecurity = netz => {
    for (const g of Object.values(netz.geraete)) {
      if (g.typ !== "switch") continue;
      for (const [port, c] of Object.entries(g.running.ports)) if (c.portSecurity) return {geraet: g.id, port, ps: c.portSecurity};
    }
    return null;
  };
  const KARTEN = ["tr-portsec-dose", "tr-stp-schleife", "tr-storage-nas-san"];

  pruefe("die drei Injektoren tragen ihre Fertigkeit an erster Stelle (skills[0] bindet die Karte)", () => {
    const soll = [["portsec-fremde-mac", "lab.portsec"], ["stp-doppelkabel", "lab.stp"], ["nas-ohne-adresse", "lab.storage"]];
    const falsch = soll.filter(([n, s]) => !(Spiel.INJEKTOREN[n] && Spiel.INJEKTOREN[n].skills[0] === s)).map(([n]) => n);
    erwarte.gleich(falsch, []);
    erwarte.gleich(soll.filter(([, s]) => !Object.values(Spiel.INJEKTOREN).some(i => (i.skills || []).includes(s))).map(([, s]) => s), []);
  });

  pruefe("portsec-fremde-mac: der Port geht wirklich in err-disabled (PORTSEC_VIOLATION), die Lösung gibt ihn frei", () => {
    const def = bau("portsec-fremde-mac", "standorte");
    const ziel = def.ziele.filter(z => z.erwartet)[0];
    erwarte.gleich(ziel.erwartet, "PORTSEC_VIOLATION", "Grund des ersten Ziels");
    const netz = def.netz(Zufall(1));
    const p = portMitPortSecurity(netz);
    erwarte.wahr(!!p, "kein Switchport mit Port-Security im gebauten Netz");
    const host = netz.geraete[def.fehlerstellen[0].stelle];
    erwarte.wahr(!!host, "das Gerät der Fehlerstelle fehlt");
    erwarte.falsch((p.ps.macs || []).includes(host.hw.macs.eth0), "die erlaubte MAC ist nicht die des angeschlossenen Geräts");
    erwarte.gleich(netz.zustand[p.geraet]?.errdisabled, undefined, "am Start ist der Port noch nicht gesperrt – die Sperre entsteht im Lauf");
    /* Vier Pakete wie in der Live-Prüfung: Das erste geht beim ARP verloren, danach greift der Verstoß. */
    const a = Sim.ping(netz, ziel.von, ziel.nach);
    erwarte.gleich(a.grund, "PORTSEC_VIOLATION", a.text);
    erwarte.gleich(netz.zustand[p.geraet].errdisabled[p.port], true, "der Port ist err-disabled");
    const heil = def.netz(Zufall(1));
    Spiel.loesungAnwenden(heil, def.loesung);
    erwarte.wahr(Sim.ping(heil, ziel.von, ziel.nach).ok, "nach der Lösung ist der Weg wieder frei");
    erwarte.wahr(Modell.portAn(heil, p.geraet, p.port).an, "der Port ist wieder oben");
  });

  pruefe("stp-doppelkabel: der Lauf bricht wirklich mit STORM ab, der Rückbau der Zusatzleitungen heilt", () => {
    const def = bau("stp-doppelkabel", "standorte");
    const ziel = def.ziele.filter(z => z.erwartet)[0];
    erwarte.gleich(ziel.erwartet, "STORM", "Grund des ersten Ziels");
    const netz = def.netz(Zufall(1));
    const doppelt = netz.kabel.filter(k => (k.a.geraet === "sw1" && k.b.geraet === "sw2") || (k.a.geraet === "sw2" && k.b.geraet === "sw1"));
    erwarte.gleich(doppelt.length, 2, "zwei Leitungen zwischen den beiden Switches");
    const a = Sim.ping(netz, ziel.von, ziel.nach, {anzahl: 1});
    erwarte.gleich(a.trace.abbruch, "STORM", a.text);
    erwarte.gleich(a.grund, "STORM");
    erwarte.wahr(a.trace.ereignisse.length <= Sim.BUDGET, `Ereignis-Budget eingehalten (${a.trace.ereignisse.length})`);
    erwarte.enthaelt((a.trace.ereignisse[a.trace.ereignisse.length - 1] || {}).text, "Broadcast-Sturm");
    const heil = def.netz(Zufall(1));
    Spiel.loesungAnwenden(heil, def.loesung);
    /* Beide Zusatzleitungen sind weg: Nur so stimmt das Netz wieder mit dem Netzplan überein
       (Spiel.plan.abweichungen zählt auch Kabel – tests/spiel-plan.test.js, Fall „Injektor × Vorlage"). */
    erwarte.gleich(heil.kabel.filter(k => (k.a.geraet === "sw1" && k.b.geraet === "sw2") || (k.a.geraet === "sw2" && k.b.geraet === "sw1")).length, 0, "keine Zusatzleitung mehr");
    erwarte.wahr(Sim.ping(heil, ziel.von, ziel.nach).ok, "nach dem Zurückbauen der Leitungen trägt das Netz wieder");
  });

  pruefe("nas-ohne-adresse: das NAS steht wirklich ohne Adresse, die Lösung bringt die Freigabe zurück", () => {
    const def = bau("nas-ohne-adresse", "standorte");
    const ziel = def.ziele.filter(z => z.erwartet)[0];
    erwarte.gleich(ziel.erwartet, "NO_IP", "Grund des ersten Ziels");
    const netz = def.netz(Zufall(1));
    const nas = Object.values(netz.geraete).find(g => g.typ === "nas");
    erwarte.wahr(!!nas, "kein NAS im gebauten Netz");
    erwarte.gleich(nas.running.if.eth0.ip, "", "das NAS hat keine Adresse");
    erwarte.gleich(nas.running.dienste.datei.an, true, "die Freigabe (SMB) ist eingeschaltet");
    erwarte.gleich(Sim.tcp(netz, ziel.von, ziel.nach, 445).grund, "NO_IP", "ohne Adresse ist die Freigabe unerreichbar");
    const heil = def.netz(Zufall(1));
    Spiel.loesungAnwenden(heil, def.loesung);
    const b = Sim.tcp(heil, ziel.von, nas.id, 445);
    erwarte.wahr(b.ok, "nach dem Eintragen der Adresse ist die Freigabe erreichbar: " + b.text);
  });

  pruefe("die drei früheren Sperrkarten sind offen: liste() meldet offen, starten() legt einen Durchgang an", () => wegwerf(() => {
    const liste = Spiel.training.liste();
    erwarte.gleich(liste.filter(e => !e.offen).map(e => e.id), [], "Karte ohne Injektor");
    erwarte.gleich(liste.filter(e => e.grund !== "").map(e => e.id), [], "Karte mit Sperrgrund");
    for (const id of KARTEN) {
      const e = liste.find(x => x.id === id);
      erwarte.wahr(!!e, id + ": Karte fehlt in liste()");
      erwarte.wahr(e.offen, id + ": nicht offen");
      const r = Spiel.training.starten(id);
      erwarte.wahr(r.ok, id + ": startet nicht – " + (r.grund || ""));
      const inst = Spiel.instanz(r.iid);
      erwarte.wahr(!!inst && inst.quelle === "training" && inst.training === id, id + ": falsche Instanz");
      erwarte.wahr(!!Spiel.defVon(inst), id + ": Aufgabe nicht auflösbar");
    }
  }));

  pruefe("die drei Karten werden bis zum Bestehen gespielt – und zahlen kein Geld und keinen Ruf", () => wegwerf(() => {
    jetzt.setzen(1800000000000);
    for (const id of KARTEN) {
      const r = Spiel.training.starten(id);
      erwarte.wahr(r.ok, id + ": startet nicht – " + (r.grund || ""));
      const inst = Spiel.instanz(r.iid);
      const def = Spiel.defVon(inst);
      Spiel.oeffnen(inst.iid);
      Spiel.loesung(inst.netz, def.loesung);
      const ab = Spiel.abnahme(inst);
      erwarte.wahr(ab.bestanden, `${id}: Lösung besteht die Abnahme nicht – ` + JSON.stringify(ab.ergebnisse.map(e => [e.ziel.typ, e.ok, e.grund])));
      const e = Spiel.training.abnehmen(inst.iid, ab);
      erwarte.wahr(e.ok && e.bestanden, `${id}: Abnahme – ` + (e.grund || ""));
      erwarte.gleich([e.euro, e.ruf], [0, 0], id + ": Training zahlt nichts");
      erwarte.gleich(Spiel.training.stand().je[id].bestanden, 1, id + ": Stand");
    }
    erwarte.gleich([Spiel.st.euro, Spiel.st.ruf, Spiel.st.erledigt.length], [0, 0, 0], "kein Karriere-Eintrag");
  }));
});
