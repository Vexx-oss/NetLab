"use strict";
/* Klassenraum-Aufträge: „adressierbar" allein genügt nicht — jeder Auftrag muss auch LÖSBAR sein.
   (Auftrag: unabhängige Gegenprüfung der Zahl „27 von 27" aus docs/Architektur.md § 12.2.)

   Geprüft wird über den VERTRAGLICHEN Weg (A – Codec § 5 / Architektur § 12.2):
     Spiel.instanzErstellen({gen:{skill, seed}, quelle:"klassenraum", ohneFlow:true})
   und über den ECHTEN Weg der Lehrkraft:
     Spiel.klassenraum.erzeugen({skill}) → Code → ausCode(code) → instanzErstellen → lösen → abnehmen.

   Je Fall wird nicht die Form, sondern die Wirkung gemessen:
     · es gibt einen Fehlerinjektor (sonst gibt es nichts zu finden) und mindestens ein Ziel,
     · im Startnetz ist wirklich ein erwartetes Ziel gebrochen,
     · Spiel.ticketGueltig(def) — das Haus-Gate: Start bricht, Lösung heilt, Regression hält,
     · die hinterlegte Lösung heilt auf einer NetzKOPIE jedes Netz-Ziel (unabhängig nachgerechnet).

   Was dieser Test bewusst NICHT leistet (ehrlich benannt): Er prüft zwei Seeds je Fertigkeit, nicht alle
   256 Varianten. Die volle Messung daneben (nicht Teil der Suite) ergab: Seeds 1..16 × 27 Fertigkeiten =
   432/432 Fälle in Ordnung, 27/27 Skills mit vollem Feld, 0 Befunde; der Codec-Weg 54/54 bestanden (Wahl E
   UND AP2, inkl. Regression, Neustart-Test und Ergebnis-Code). */
gruppe("Klassenraum: Lösbarkeit", () => {
  /* Kapsel wie in tests/spiel-bogen.test.js: eigener Spielstand, eigener Store, danach alles zurück.
     `erzeugen` schreibt in store "klassenraum" – ohne diese Kapsel bliebe eine Sitzung stehen.
     Gibt eine HÜLLE zurück (nicht das Ergebnis), damit `pruefe` sie später aufruft. */
  function kapsel(fn){
    return () => {
      const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
        gen: Object.assign({}, Spiel.generierte), speicher: store.alles(), uhr: jetzt()};
      try {
        Spiel._trocken = true; Spiel._lz = {};
        Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
        Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
        Spiel._einst.wahl = "E";                       /* die Abnahme rechnet sonst mit der lokalen Wahl */
        jetzt.setzen(Date.UTC(2026, 9, 8, 9, 0, 0));   /* erzeugen ohne Seed: neuerSeed liest die Uhr */
        return fn();
      } finally {
        Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
        for (const k of Object.keys(Spiel.generierte)) if (!(k in alt.gen)) delete Spiel.generierte[k];
        for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
        Object.assign(SPEICHER.daten, alt.speicher);
        jetzt.setzen(alt.uhr); jetzt.frei();
      }
    };
  }

  const hatInjektor = skill => Object.values(Spiel.INJEKTOREN || {}).some(i => (i.skills || []).includes(skill));
  const SEEDS = [1, 2];

  pruefe("alle 27 Fertigkeiten: Injektor + Ziel, im Startnetz wirklich gebrochen, gültig und lösbar", kapsel(() => {
    const fehler = [];
    for (const s of DATEN.skills) for (const seed of SEEDS) {
      const wo = `${s.id}/Seed ${seed}`;
      let inst = null, def = null;
      try {
        inst = Spiel.instanzErstellen({gen: {skill: s.id, seed}, quelle: "klassenraum", ohneFlow: true});
        def = Spiel.defVon(inst);
      } catch (e) { fehler.push(`${wo}: wirft – ${e && e.message ? e.message : e}`); continue; }
      if (!inst || !def) { fehler.push(`${wo}: keine auflösbare Aufgabe`); continue; }
      if (!(def.injektoren || []).length) { fehler.push(`${wo}: kein Fehlerinjektor`); continue; }
      if (!(def.ziele || []).length) { fehler.push(`${wo}: kein Ziel`); continue; }
      const erwartet = def.ziele.filter(z => z.erwartet);
      const gebrochen = erwartet.filter(z => { try { return !Sim.pruefeZiel(inst.netz, z).ok; } catch (e) { return false; } });
      if (!gebrochen.length) { fehler.push(`${wo}: kein erwartetes Ziel ist im Startnetz gebrochen (${erwartet.length} erwartet)`); continue; }
      if (Spiel.ticketGueltig(def) !== true) { fehler.push(`${wo}: Spiel.ticketGueltig ist false`); continue; }
      const kopie = Modell.kopie(inst.netz);
      let wirft = null;
      try { Spiel.loesungAnwenden(kopie, def.loesung); } catch (e) { wirft = e && e.message ? e.message : String(e); }
      const offen = wirft ? [wirft]
        : def.ziele.filter(z => !Spiel.istArbeitsziel(z))
            .filter(z => { try { return !Sim.pruefeZiel(kopie, z).ok; } catch (e) { return true; } })
            .map(z => `${z.typ}: ${z.text}`);
      if (offen.length) fehler.push(`${wo}: Lösung heilt nicht – ${offen.join(" | ")}`);
    }
    if (fehler.length) console.log(fehler.join(String.fromCharCode(10)));
    erwarte.gleich(fehler.length, 0, `${DATEN.skills.length * SEEDS.length} Fälle (${DATEN.skills.length} Fertigkeiten × Seeds ${SEEDS.join(",")})`);
  }));

  pruefe("die eingefrorene Tabelle sagt die Wahrheit: tauglich genau dort, wo wirklich ein Auftrag entsteht", () => {
    const T = Spiel.klassenraum.tabellen();
    erwarte.wahr(!!T, "die Tabelle des Codec fehlt");
    const ids = DATEN.skills.map(s => s.id);
    erwarte.gleich(T.skills.laenge, ids.length, "27 Fertigkeiten in der Tabelle");
    erwarte.gleich(T.skills.ids, ids, "Reihenfolge wie DATEN.skills (Regel 2: nur anhängen)");
    /* Keine Zusage ohne Deckung: jedes `tauglich: true` braucht einen Injektor, und keine Fertigkeit mit
       Injektor darf gesperrt sein (das war der Stand vor dem Ausbau 1.3: 24 von 27). */
    const ohneDeckung = [], unnoetigGesperrt = [];
    for (const s of DATEN.skills) {
      const i = T.skills.index(s.id), tauglich = T.skills.tauglich(i);
      if (tauglich && !hatInjektor(s.id)) ohneDeckung.push(s.id);
      if (!tauglich && hatInjektor(s.id)) unnoetigGesperrt.push(s.id);
    }
    erwarte.gleich(ohneDeckung, [], "tauglich ohne Injektor");
    erwarte.gleich(unnoetigGesperrt, [], "mit Injektor, aber gesperrt");
    /* Dieselbe Zahl über die öffentliche Fläche der Verwaltung (filtert zusätzlich über hatInjektor). */
    const taug = Spiel.klassenraum.tauglicheFertigkeiten();
    erwarte.gleich(taug.length, DATEN.skills.length, "27 taugliche Fertigkeiten");
    erwarte.gleich(taug.map(x => x.skill), ids, "und zwar alle, in Reihenfolge");
    erwarte.gleich(DATEN.skills.filter(s => !hatInjektor(s.id)).map(s => s.id), [], "keine Fertigkeit ohne Injektor");
    /* Die Tabelle behauptet für jede Fertigkeit `ersterSeed 1`. Der Codec rechnet den k-ten Kandidaten als
       `variante + 1 + k` (klassenraum-codec.js: kanonSeed) – Variante 0 beginnt also bei Seed 1. Genau das
       prüft der Fall unten mit `seed: 0` nach: 0 Kanonisierungsschritte. */
    erwarte.gleich(DATEN.skills.map(s => T.skills.ersterSeed(T.skills.index(s.id))), DATEN.skills.map(() => 1), "ersterSeed 1 für alle 27");
  });

  pruefe("der echte Weg der Lehrkraft: erzeugen → Code → ausCode → lösen → Abnahme besteht (alle 27)", kapsel(() => {
    const fehler = [];
    for (const s of DATEN.skills) {
      /* `seed: 0` = Variante 0 = das Kanonisierungsfenster beginnt bei Seed 1 (die Tabelle sagt ersterSeed 1). */
      const sz = Spiel.klassenraum.erzeugen({skill: s.id, seed: 0});
      if (!sz || sz.fehler) { fehler.push(`${s.id}: erzeugen – ${(sz && sz.grund) || "kein Ergebnis"}`); continue; }
      if (typeof sz.code !== "string" || !sz.code) { fehler.push(`${s.id}: kein Auftragscode`); continue; }
      if (sz.schritte !== 0) fehler.push(`${s.id}: ${sz.schritte} Kanonisierungsschritte statt 0 (die Tabelle sagt ersterSeed 1)`);
      const c = Spiel.klassenraum.ausCode(sz.code);
      if (!c || c.fehler) { fehler.push(`${s.id}: ausCode – ${(c && c.grund) || "null"}`); continue; }
      if (c.skill !== s.id) { fehler.push(`${s.id}: ausCode liefert ${c.skill}`); continue; }
      const inst = Spiel.instanzErstellen({gen: {skill: c.skill, seed: c.seed}, quelle: "klassenraum", ohneFlow: true});
      inst.klassenraum = {sitzung: c.sitzung, platz: Spiel.klassenraum.platz() ?? 0, code: c.code};
      Spiel.oeffnen(inst.iid);
      const def = Spiel.defVon(inst);
      Spiel.loesung(inst.netz, def.loesung);
      Spiel.arbeitszieleErfuellen(inst);
      const ab = Spiel.abnahme(inst);
      if (!ab.bestanden) {
        fehler.push(`${s.id}: Abnahme nicht bestanden – offen ${JSON.stringify(ab.ergebnisse.filter(e => !e.ok).map(e => [e.ziel.typ, e.grund]))}, Kollateral ${JSON.stringify(ab.kollateral.map(k => [k.von, k.nach, k.grund]))}`);
        continue;
      }
      const ec = Spiel.klassenraum.ergebnisCode(inst, ab);
      if (typeof ec !== "string" || !ec) fehler.push(`${s.id}: Ergebnis-Code – ${JSON.stringify(ec)}`);
    }
    if (fehler.length) console.log(fehler.join(String.fromCharCode(10)));
    erwarte.gleich(fehler.length, 0, "27 Aufträge über den Codec-Weg");
  }));
});
