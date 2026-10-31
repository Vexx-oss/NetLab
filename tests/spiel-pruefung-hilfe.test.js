"use strict";
/* LRN-01 (3.0.0): Prüfung ist hilfefrei — zentrale Sperre an allen Hilfe-Flächen.
   Vertrag: Architektur § 17.2 (Prüfungsregeln, nachgezogen): zentrale Bedingung
   Spiel.pruefung.hilfeGesperrt(inst, optionen); vier Flächen leer/null, Umwege gesperrt.
   Rot-Beleg vor dem Code: in der Prüfung lieferten passend/geruest/leiter/vorfuehren weiter Hilfe. */
gruppe("Spiel: Prüfungs-Hilfe gesperrt (LRN-01)", () => {
  const P = () => Spiel.pruefung;
  function kapsel(fn){
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
      speicher: store.alles(), uhr: jetzt(), gen: Object.assign({}, Spiel.generierte)};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      store.set("einst", {});
      Spiel._einst = null;
      Spiel._st = Spiel.leererStand();
      Spiel._st.pruefung = null;
      jetzt.setzen(Date.UTC(2026, 10, 1, 8, 0, 0));
      return fn();
    } finally {
      if (SPEICHER.timer) { clearTimeout(SPEICHER.timer); SPEICHER.timer = null; }
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, alt.speicher);
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      Spiel.generierte = alt.gen;
      jetzt.setzen(alt.uhr); jetzt.frei();
    }
  }
  const examen = () => { Spiel._st.pruefung = {art: "AP1", start: jetzt(), ende: null, aufgaben: []}; return Spiel._st.pruefung; };
  /* Ein Gerät wählen, für das es wirklich Vorschläge/Gerüst gibt (nicht "internet"). */
  const netzId = inst => {
    const ids = Object.keys(inst.netz.geraete);
    const passend = ids.find(k => {
      const g = inst.netz.geraete[k];
      if (!g) return false;
      if (g.typ === "firewall") return true;
      try { return !!(typeof Modell !== "undefined" && Modell && ((Modell.IOS && Modell.IOS[g.typ]) || (Modell.HOST && Modell.HOST[g.typ]))); } catch (e) { return false; }
    });
    return {netz: inst.netz, id: passend || ids[0]};
  };

  pruefe("In der Prüfung: vier Flächen leer und Umwege gesperrt — außerhalb unverändert", () => kapsel(() => {
    /* Grundlinie mit einem NORMALEN Auftrag; die Prüfung wird erst danach aktiviert. */
    const inst = Spiel.instanzErstellen({ticketId: "salon-06", seed: 7, ohneFlow: true});
    const o = netzId(inst);
    /* Grundlinie OHNE Prüfung: Hilfe ist da, sonst wäre die Gegenprobe wertlos. */
    const p0 = Spiel.hilfe.passend(Object.assign({}, o, {modus: "cli"}));
    const g0 = Spiel.hilfe.geruest(Object.assign({}, o, {modus: "cli"}));
    const l0 = Spiel.hilfe.leiter(Object.assign({}, o, {modus: "cli"}));
    const v0 = Spiel.vorfuehren(inst);
    /* passend ist je nach Bildungsstand leer (azubi) — die Sperre wird trotzdem geprüft. */
    erwarte.wahr(!!g0, "Grundlinie: Gerüst vorhanden");
    erwarte.gleich(l0.length, 6, "Grundlinie: sechs Leitersprossen");
    erwarte.wahr(v0.length > 0, "Grundlinie: Vorführschritte vorhanden (" + v0.length + ")");
    /* Prüfung aktiv: dieselben Aufrufe müssen leer sein. */
    examen();
    erwarte.gleich(Spiel.hilfe.passend(Object.assign({}, o, {modus: "cli"})), [], "passend -> []");
    erwarte.gleich(Spiel.hilfe.leiter(Object.assign({}, o, {modus: "cli"})), [], "leiter -> []");
    erwarte.gleich(Spiel.hilfe.geruest(Object.assign({}, o, {modus: "cli"})), null, "geruest -> null");
    erwarte.gleich(Spiel.hilfe.syntaxBruecke(Object.assign({}, o, {modus: "cli", text: "show ip interface brief"})), null, "syntaxBruecke -> null");
    const h = Spiel.hilfe(inst);
    erwarte.gleich(h.fehler, "prüfung", "Sprossen-Weg gesperrt: " + JSON.stringify(h));
    erwarte.gleich(Spiel.vorfuehren(inst), [], "Lösung vorführen -> []");
    erwarte.gleich(Spiel.vorfuehrenSchritt(inst, 0), null, "Vorführschritt -> null");
    erwarte.gleich(Spiel.seniorFaellig(inst), false, "Senior-Frage -> false");
    erwarte.gleich(Spiel.hilfe.anfaengerSchritte(inst), [], "Anfänger-Hilfe -> []");
    /* Prüfung zu Ende: außerhalb unverändert. */
    Spiel._st.pruefung.ende = jetzt();
    const l1 = Spiel.hilfe.leiter(Object.assign({}, o, {modus: "cli"}));
    erwarte.gleich(l1.length, 6, "nach der Prüfung ist die Hilfe wieder da (Leiter)");
    const v1 = Spiel.vorfuehren(inst);
    erwarte.wahr(v1.length > 0, "auch die Vorführung ist wieder offen (" + v1.length + ")");
    console.log("MESSUNG LRN-01: außerhalb " + p0.length + " Vorschläge / " + l0.length + " Sprossen / " + v0.length + " Schritte · in Prüfung alles leer/gesperrt · danach wieder da");
  }));

  pruefe("Option pruefung:true sperrt auch ohne laufenden Prüfungstag; inst.quelle pruefung ebenso", () => kapsel(() => {
    const inst = Spiel.instanzErstellen({ticketId: "salon-06", seed: 7, quelle: "pruefung", ohneFlow: true});
    const o = netzId(inst);
    erwarte.gleich(Spiel.hilfe.passend(Object.assign({}, o, {modus: "cli", pruefung: true})), [], "Flag pruefung:true -> []");
    erwarte.gleich(Spiel.hilfe.leiter(Object.assign({}, o, {modus: "cli", pruefung: true})), [], "leiter mit Flag -> []");
    erwarte.gleich(Spiel.hilfe.geruest(Object.assign({}, o, {modus: "cli", pruefung: true})), null, "geruest mit Flag -> null");
    erwarte.wahr(!!P().hilfeGesperrt(inst, null), "inst.quelle pruefung sperrt ohne Flag");
    erwarte.wahr(!!P().hilfeGesperrt(null, {pruefung: true}), "Flag sperrt ohne Instanz");
    const normal = Spiel.instanzErstellen({ticketId: "salon-06", seed: 7, ohneFlow: true});
    erwarte.falsch(!!P().hilfeGesperrt(normal, null), "ein normaler Auftrag ist nicht gesperrt");
    console.log("MESSUNG LRN-01-Flag: pruefung:true und inst.quelle=pruefung sperren zentral");
  }));
});
