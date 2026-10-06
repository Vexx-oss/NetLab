"use strict";
/* AUFTRAGSVIELFALT (task-14, P2): Das Netz eines Handauftrags entsteht aus dem INSTANZ-Seed statt aus dem festen vSeed.
   Geprüft wird: Vielfalt je Auftrag, Determinismus je (id, seed), Fehlerstelle je Seed ohne Dopplung, der Rückfall
   auf die feste Fassung bei nicht spielbaren Seeds, die Selbstprüfung, das Feld vielfalt im Spielstand (Migration)
   und ein Massendurchspiel der Handaufträge mit Seed-Netzen. */
gruppe("Spiel: Auftragsvielfalt", () => {
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally { Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken; }
  };
  const SEEDS = [1, 2, 5, 8];
  const tickets = () => DATEN.tickets.filter(t => !t.entwurf);
  const netzText = d => JSON.stringify(d.netz(Zufall(1)));

  pruefe("jeder Handauftrag bekommt je Seed sein eigenes Netz; gleicher (id, seed) bleibt gleich", kapsel(() => {
    const alle = new Set(), fehler = [], ohneVielfalt = [];
    const drehbuch = tickets().filter(t => t.art !== "terminal");       /* Terminal-Aufträge bleiben fest (konkrete Befehle) */
    for (const t of drehbuch) {
      const hier = new Set();
      for (const s of SEEDS) {
        const d = Spiel.ticketDef(t.id, {seed: s, vielfalt: true});
        const a = netzText(d), b = netzText(Spiel.ticketDef(t.id, {seed: s, vielfalt: true}));
        if (a !== b) fehler.push(`${t.id}#${s}: nicht deterministisch`);
        if (!Spiel.ticketGueltig(d)) fehler.push(`${t.id}#${s}: Fassung besteht die Selbstprüfung nicht`);
        hier.add(a); alle.add(a);
      }
      if (hier.size <= 1) ohneVielfalt.push(t.id);
    }
    erwarte.gleich(fehler.slice(0, 5), []);
    erwarte.wahr(alle.size > drehbuch.length * 3, `nur ${alle.size} verschiedene Netze aus ${drehbuch.length} Aufträgen`);
    erwarte.wahr(ohneVielfalt.length <= Math.max(1, drehbuch.length / 20), `zu viele feste Aufträge: ${ohneVielfalt.join(", ")}`);
    for (const t of tickets().filter(x => x.art === "terminal")) {
      const d = Spiel.ticketDef(t.id, {seed: 4242, vielfalt: true});
      erwarte.wahr(d === DATEN.tickets.find(x => x.id === t.id), `${t.id}: Terminal-Auftrag muss auf dem festen Netz bleiben`);
    }
  }));

  pruefe("neue Instanz: Netz aus dem Instanz-Seed, vielfalt im Spielstand, Migration behält beides", kapsel(() => {
    const inst = Spiel.instanzErstellen({ticketId: "salon-02", seed: 4711, quelle: "pruefung"});
    erwarte.wahr(inst.vielfalt === true, "neue Instanz trägt vielfalt nicht");
    const def = DATEN.tickets.find(t => t.id === "salon-02");
    const fest = JSON.stringify(Spiel.startNetz(def, 4711));
    erwarte.falsch(JSON.stringify(inst.netz) === fest, "neue Instanz hat das feste Netz (keine Vielfalt)");
    const mig = Spiel.migrieren(JSON.parse(JSON.stringify(Spiel.st)));
    const kopie = mig.postfach.find(i => i.iid === inst.iid);
    erwarte.wahr(!!kopie && kopie.vielfalt === true, "vielfalt fehlt nach der Migration");
    erwarte.gleich(netzText(Spiel.defVon(kopie)), JSON.stringify(inst.netz), "Netz nach der Migration anders");
  }));

  pruefe("Alt-Instanz ohne vielfalt behält ihr Netz (kein stiller Netzwechsel)", kapsel(() => {
    const inst = Spiel.instanzErstellen({ticketId: "salon-02", seed: 4711, quelle: "pruefung"});
    const def = DATEN.tickets.find(t => t.id === "salon-02");
    delete inst.vielfalt;                                          /* so sieht ein Stand von vor dem Umbau aus */
    erwarte.wahr(Spiel.defVon(inst) === def, "Alt-Instanz bekommt nicht die feste Fassung");
    erwarte.gleich(JSON.stringify(Spiel.startNetzVon(inst)), JSON.stringify(Spiel.startNetz(def, inst.seed)), "Alt-Instanz: Netz weicht ab");
  }));

  pruefe("Laufzeit-Überschreibung an der Definition gilt auch in der Seed-Fassung", kapsel(() => {
    /* Grund (Vertrag seit 06.10.2026): Der Durchspiel-Test ersetzt d.loesung durch eine Fassung ohne Speichern und
       erwartet, dass AP2 dann durchfällt. Prüft er die feste Fassung, während das Spiel die Seed-Fassung nutzt,
       prüfte er eine andere Lösung als das Spiel. */
    const d = DATEN.tickets.find(t => t.id === "salon-05");
    const voll = d.loesung;
    Object.defineProperty(d, "loesung", {value: voll.filter(x => x.aktion !== "speichern"), configurable: true, enumerable: true});
    try {
      const inst = Spiel.instanzErstellen({ticketId: "salon-05", seed: 4711, quelle: "pruefung"});
      erwarte.wahr(inst.vielfalt === true, "salon-05 muss die Seed-Fassung nutzen");
      erwarte.falsch(Spiel.defVon(inst).loesung.some(x => x.aktion === "speichern"), "Überschreibung erreicht die Seed-Fassung nicht");
    } finally { Object.defineProperty(d, "loesung", {value: voll, configurable: true, enumerable: true}); }
  }));

  pruefe("Fehlerstelle je Seed, derselbe Fehler nie zweimal im Auftrag", kapsel(() => {
    const doppelt = [], unpassend = [];
    for (const t of tickets()) for (const s of SEEDS) {
      const d = Spiel.ticketDef(t.id, {seed: s, vielfalt: true});
      const f = d.fehlerstellen || [];
      if (f.length !== (d.injektoren || []).length) unpassend.push(`${t.id}#${s}: ${f.length} zu ${(d.injektoren || []).length}`);
      const paare = f.map(x => `${x.injektor}@${x.stelle}`);
      if (new Set(paare).size !== paare.length) doppelt.push(`${t.id}#${s}: ${paare.join(",")}`);
    }
    erwarte.gleich(doppelt.slice(0, 3), []);
    erwarte.gleich(unpassend.slice(0, 3), []);
    const stellen = new Set();
    for (let s = 1; s <= 30; s++) stellen.add(JSON.stringify((Spiel.ticketDef("baeckerei-02", {seed: s * 991 + 7, vielfalt: true}).fehlerstellen || [])));
    erwarte.wahr(stellen.size >= 2, "die Fehlerstelle wandert nicht mit dem Seed");
  }));

  pruefe("Selbstprüfung erkennt nicht spielbare Fassungen", kapsel(() => {
    const spec = {id: "probe-vielfalt", vorlage: "lan", vSeed: 5, injektoren: [{name: "gateway-fehlt", ziel: "buero"}], stufe: "E"};
    const gut = Spiel.ticketBauen(spec, 123456);
    erwarte.wahr(Spiel.ticketGueltig(gut), "gültige Fassung wurde abgelehnt");
    erwarte.falsch(Spiel.ticketGueltig(Object.assign({}, gut, {loesung: []})), "fehlende Lösung fiel nicht auf");
    erwarte.falsch(Spiel.ticketGueltig(Object.assign({}, gut, {ziele: []})), "leere Ziele fielen nicht auf");
  }));

  pruefe("Massendurchspiel: Handaufträge mit Seed-Netz bestehen die Abnahme (AP2, drei Seeds)", kapsel(() => {
    const rot = [];
    Spiel._einst.wahl = "AP2";
    for (const t of Spiel.ticketReihe()) for (const s of [3, 11, 29]) {
      const seed = 7919 * s + 3;
      try {
        const inst = Spiel.instanzErstellen({ticketId: t.id, quelle: "pruefung", seed});
        const def = Spiel.defVon(inst);
        Spiel.oeffnen(inst.iid);
        if (!Spiel.zieleStatus(inst).some(e => e.ok === false)) rot.push(`${t.id}#${seed}: Start erfüllt schon alle Ziele`);
        Spiel.loesung(inst.netz, def.loesung);
        Spiel.arbeitszieleErfuellen(inst);
        const ab = Spiel.abnahme(inst);
        if (!ab.bestanden) rot.push(`${t.id}#${seed}: ${Spiel.fehlschlaege(ab).map(f => f.text).slice(0, 1).join("")}`);
        else Spiel.abschliessen(inst, ab);
      } catch (e) { rot.push(`${t.id}#${seed}: ${e && e.message || e}`); }
    }
    erwarte.gleich(rot.slice(0, 5), []);
  }));
});
