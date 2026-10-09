"use strict";
/* KLASSENRAUM — DERSELBE CODE MUSS DENSELBEN AUFTRAG ERGEBEN (Fahrplan § 2.4; Entwurf – Klassenraum-Umsetzung § 4.4/E8, Testfall Nr. 41)
   Die Zusage des Klassenraums lautet: die Lehrkraft sagt EINEN Code an, jedes Gerät baut denselben Auftrag.
   Der Flow-Regler (src/spiel/flow.js) ist dagegen ein Regler des EINZELNEN Geräts: er hängt am lokalen
   Lernstand (st.flow[fertigkeit].stand). Ein Auftrag aus einem Klassenraum-Code darf davon nicht abhängen —
   sonst bekäme der Azubi einen anderen Auftrag als seine Nachbarin.

   GEMESSEN vor der Behebung (drei Geräte, Code {skill:"lab.vlan", seed:5}, quelle "klassenraum", ohne `ohneFlow`):
     def.id   „gen-lab.vlan-5“ / „gen-lab.vlan-5-geruest“ / „gen-lab.vlan-5-verwicklung“
     Ziele    2 / 1 / 3        (ein Vergleich über die Ziele bemerkt es also sehr wohl)
     inst.flow null / „geruest“ / „verwicklung“
   und dabei: Geräteliste (id:typ:name) und Kabelliste sind in ALLEN drei Fällen GLEICH — ein Klassenraum-Abdruck
   über {geraete, kabel} würde die Abweichung NICHT bemerken. Darum läuft dieser Beweis über `def.id` (E8).

   Die Wahl des Flow-Stands ist NICHT aus (Code, Seed) ableitbar: `Spiel.flow.fuer(def)` liest allein
   st.flow[fertigkeit].stand (flow.js:52-56) — also die Lern-Geschichte des Geräts. Deshalb schließt
   `Spiel.instanzErstellen` die Quelle „klassenraum“ genauso aus wie „pruefung“ und „raetsel“ (postfach.js:84).
   Für alle übrigen Quellen bleibt der Regler unverändert wirksam — dafür stehen unten Positivkontrollen:
   ein Test, der den Unterschied gar nicht sehen KÖNNTE, wäre kein Test. */
gruppe("Klassenraum: Determinismus", () => {
  const SKILL = "lab.vlan", SEED = 5, TICKET = "autohaus-08";   /* Handauftrag mit lab.vlan als Hauptfertigkeit */
  const STAENDE = ["normal", "geruest", "verwicklung"];
  const CODE = "gen-" + SKILL + "-" + SEED;

  /* Kapsel wie in spiel-flow.test.js: eigener Spielstand, trocken (kein Speichern, kein Bus), alles zurück. */
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken, gen: Object.assign({}, Spiel.generierte), uhr: jetzt()};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      Spiel.generierte = alt.gen;
      jetzt.setzen(alt.uhr); jetzt.frei();
    }
  };

  /* Der „Klassenraum-Abdruck“ dieses Tests: Geräteliste und Kabelliste, kanonisch sortiert.
     (Die Spezifikation rechnet ihn über {v, geraete, kabel}; hier zählt nur, was er SEHEN kann.) */
  const geraeteListe = netz => Object.values(netz.geraete).map(g => g.id + ":" + g.typ + ":" + g.name).sort();
  const kabelListe = netz => netz.kabel.map(k => [k.id, k.a.geraet, k.a.port, k.b.geraet, k.b.port].join(">")).sort();
  const abdruck = netz => JSON.stringify([geraeteListe(netz), kabelListe(netz)]);

  /* EIN Gerät der Klasse: eigener Spielstand, eigener Generator-Zwischenspeicher, eigener lokaler Flow-Stand.
     Derselbe Code ({skill: SKILL, seed: SEED} bzw. {ticketId: TICKET, seed: SEED}) geht den Weg, den ein
     vergessener Wächter nimmt — `ohneFlow` wird nur dort gesetzt, wo es ausdrücklich geprüft wird. */
  function geraet(lokalerStand, o = {}){
    Spiel._st = Spiel.leererStand();
    Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
    Spiel.generierte = {};                       /* je Gerät ein frischer Generator: kein Zwischenspeicher-Treffer */
    if (lokalerStand && lokalerStand !== "normal") Spiel.flow.daten(SKILL).stand = lokalerStand;
    const code = o.ticketId ? {ticketId: o.ticketId, seed: SEED} : {gen: {skill: SKILL, seed: SEED}};
    const inst = Spiel.instanzErstellen(Object.assign({}, code, {quelle: o.quelle || "klassenraum", ohneFlow: o.ohneFlow}));
    const def = Spiel.defVon(inst);
    return {inst, def, netz: inst.netz, flow: inst.flow, id: def && def.id, ziele: def ? def.ziele.map(z => z.text) : null};
  }
  const alleGleich = (liste, was) => {
    erwarte.wahr(liste.length && liste.every(x => x != null), was + ": auflösbar – " + JSON.stringify(liste));
    erwarte.gleich([...new Set(liste)], [liste[0]], was);
  };

  pruefe('Klassenraum: derselbe Code und derselbe Seed ergeben denselben Auftrag, egal welchen Flow-Stand das Gerät hat', kapsel(() => {
    const laeufe = STAENDE.map(s => geraet(s));
    alleGleich(laeufe.map(x => x.id), "def.id je Gerät (Flow-Stand " + STAENDE.join("/") + ")");
    erwarte.gleich(laeufe.map(x => x.ziele), [laeufe[0].ziele, laeufe[0].ziele, laeufe[0].ziele], "dieselben Ziele");
    erwarte.gleich(laeufe.map(x => x.flow), [null, null, null], "kein Flow-Regler am Klassenraum-Auftrag");
    /* Positivkontrolle im selben Aufbau: mit einer NORMALEN Quelle ergibt derselbe Dreiklang drei verschiedene
       Aufträge — der Test kann den Unterschied also sehen (sonst wäre er kein Test). */
    const normal = STAENDE.map(s => geraet(s, {quelle: "generiert"}));
    erwarte.gleich(normal.map(x => x.id), [CODE, CODE + "-geruest", CODE + "-verwicklung"], "dort greift der Regler (gewollt): drei Aufträge");
  }));

  pruefe('Der vorgesehene Öffnungsweg mit `ohneFlow: true` und der Weg ohne ergeben denselben Auftrag', kapsel(() => {
    const mitWaechter = STAENDE.map(s => geraet(s, {ohneFlow: true}));
    const ohneWaechter = STAENDE.map(s => geraet(s));
    alleGleich([...mitWaechter, ...ohneWaechter].map(x => x.id), "ein Auftrag für alle sechs Geräte/Wächter-Kombinationen");
    erwarte.gleich(mitWaechter.map(x => x.id), [CODE, CODE, CODE], "der Wächter-Weg liefert die gewöhnliche Fassung");
  }));

  pruefe('Auch ein Handauftrag im Klassenraum bleibt ohne Flow-Regler — drei Geräte, ein Auftrag', kapsel(() => {
    const laeufe = STAENDE.map(s => geraet(s, {ticketId: TICKET}));
    alleGleich(laeufe.map(x => x.id), "def.id je Gerät");
    erwarte.gleich(laeufe.map(x => x.flow), [null, null, null], "kein Flow-Regler am Klassenraum-Auftrag");
    erwarte.gleich(laeufe.map(x => x.ziele), [laeufe[0].ziele, laeufe[0].ziele, laeufe[0].ziele], "dieselben Ziele");
    /* Positivkontrolle: derselbe Handauftrag mit einer normalen Quelle steht sehr wohl unter dem Regler.
       Die feste Fassung selbst wechselt dabei nicht — hier baut der Regler nichts um, er begleitet nur. */
    const normal = STAENDE.map(s => geraet(s, {ticketId: TICKET, quelle: "postfach"}));
    erwarte.gleich(normal.map(x => x.flow), [null, "geruest", "verwicklung"], "dort steht der Stand am Auftrag");
    erwarte.gleich([...new Set(normal.map(x => x.id))], [TICKET], "die Fassung des Handauftrags bleibt dieselbe");
  }));

  pruefe('Der Beweis muss über `def.id` laufen: Geräte und Kabel allein verraten den Unterschied nicht', kapsel(() => {
    /* Gemessen an einer NORMALEN Quelle, wo der Regler absichtlich greift: dasselbe (skill, seed) mit dem lokalen
       Stand „normal“ gegen „geruest“ ergibt zwei verschiedene Fassungen — bei GLEICHER Geräte- und Kabelliste.
       Die Zielzahl unterscheidet sich hier (2 gegen 1); blind ist also der Geräte-/Kabel-Vergleich, nicht der
       Ziel-Vergleich. Genau deshalb ist `def.id` der scharfe Vergleich und der Abdruck der blinde. */
    const a = geraet("normal", {quelle: "generiert"});
    const b = geraet("geruest", {quelle: "generiert"});
    erwarte.wahr(a.id && b.id, "zwei Aufträge: " + a.id + " / " + b.id);
    erwarte.falsch(a.id === b.id, "verschiedene Fassungen: " + a.id + " / " + b.id);
    erwarte.falsch(a.ziele.length === b.ziele.length, "die Zielzahl verrät es hier: " + a.ziele.length + " gegen " + b.ziele.length);
    erwarte.gleich(abdruck(a.netz), abdruck(b.netz), "Geräte- und Kabelliste sind gleich — der Abdruck sieht nichts");
    /* Und derselbe Abdruck für die drei Klassenraum-Geräte: auch dort in allen drei Fällen gleich. */
    const laeufe = STAENDE.map(s => geraet(s));
    erwarte.gleich(laeufe.map(x => abdruck(x.netz)), [abdruck(laeufe[0].netz), abdruck(laeufe[0].netz), abdruck(laeufe[0].netz)],
      "auch im Klassenraum: ein Abdruck über {geraete, kabel} ist in allen drei Fällen gleich");
    erwarte.gleich(laeufe.map(x => geraeteListe(x.netz).length), [geraeteListe(laeufe[0].netz).length, geraeteListe(laeufe[0].netz).length, geraeteListe(laeufe[0].netz).length],
      "und die Geräteliste ist nicht etwa leer");
  }));

  pruefe('Der Flow-Regler bleibt für die normalen Quellen wirksam (Nebenwirkung der Behebung ausgeschlossen)', kapsel(() => {
    erwarte.gleich(geraet("geruest", {quelle: "postfach"}).id, CODE + "-geruest", "Postfach: Gerüst-Fassung");
    erwarte.gleich(geraet("verwicklung", {quelle: "generiert"}).id, CODE + "-verwicklung", "Generiert: Verwicklungs-Fassung");
    erwarte.gleich(geraet("geruest", {quelle: "postfach"}).flow, "geruest", "der Stand steht weiterhin am Auftrag");
    erwarte.gleich(geraet("geruest", {quelle: "generiert", ohneFlow: true}).flow, null, "`ohneFlow: true` schaltet ihn weiterhin ab");
    /* flow.js selbst ist unverändert: `fuer` liest den lokalen Stand — die Quellen-Entscheidung fällt in postfach.js. */
    const def = {skills: [SKILL]};
    Spiel._st = Spiel.leererStand();                       /* frisches Gerät: kein Stand gemerkt */
    erwarte.gleich(Spiel.flow.fuer(def), null, "frischer Stand: kein Regler");
    Spiel.flow.daten(SKILL).stand = "geruest";
    erwarte.gleich(Spiel.flow.fuer(def), "geruest", "der Regler liest den lokalen Stand …");
    Spiel._einst.anpassung = "manuell";
    erwarte.gleich(Spiel.flow.fuer(def), null, "… und die Einstellung „manuell“ schaltet ihn ab");
    erwarte.gleich([Spiel.FLOW.GERUEST_NACH, Spiel.FLOW.VERWICKLUNG_NACH, Spiel.FLOW.MERKEN], [2, 3, 5],
      "Stände und Schwellen: geruest nach 2 Fehlschlägen, verwicklung nach 3 Glanz-Ergebnissen, 5 gemerkt");
  }));

  pruefe('Derselbe Code zu zwei verschiedenen Uhrzeiten ergibt denselben Auftrag', kapsel(() => {
    jetzt.setzen(Date.UTC(2026, 9, 1, 8, 0, 0));
    const frueh = geraet("normal");
    jetzt.setzen(Date.UTC(2027, 2, 17, 21, 30, 0));
    const spaet = geraet("normal");
    erwarte.wahr(frueh.id && spaet.id, "zwei auflösbare Definitionen: " + frueh.id + " / " + spaet.id);
    erwarte.gleich(spaet.id, frueh.id, "die Uhr steckt nicht im Auftrag");
    erwarte.gleich(spaet.inst.seed, frueh.inst.seed, "der Seed kommt aus dem Code, nicht aus der Uhr");
    /* Positivkontrolle: OHNE Seed aus dem Code zieht der Spielstand die Uhr heran (Spiel.neuerSeed, postfach.js) —
       dort ist das gewollt (jeder neue Auftrag im Einzelspiel ist anders); der Klassenraum-Code trägt seinen Seed. */
    const ohneSeed = t => { jetzt.setzen(t); Spiel._st = Spiel.leererStand(); Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD); Spiel.generierte = {};
      return Spiel.instanzErstellen({gen: {skill: SKILL}, quelle: "klassenraum"}).seed; };
    erwarte.falsch(ohneSeed(Date.UTC(2026, 9, 1, 8, 0, 0)) === ohneSeed(Date.UTC(2027, 2, 17, 21, 30, 0)),
      "ohne Seed im Code kommt die Uhr herein — darum muss der Code den Seed tragen");
  }));
});
