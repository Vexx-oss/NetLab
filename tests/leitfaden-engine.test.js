"use strict";
/* 3.1-B2 (task-123): Analyse-Leitfaden-Engine. Verbindliche Didaktik-Spec: Nachweise/3.0/3.1/DIAGNOSTIK.md
   (r-didaktik, task-122): 6 Phasen-ids/Titel/Impulse wörtlich; Schritte 1-6 aus echten Zuständen.
   Schritt 2 ist laut Spec §6 ein PROXY: (inst.befehle||[]).length > 0 — NICHT akte/verdacht/diff,
   sonst erledigen sich 2/3/4/5 in einem Zug. Prüfungsmodus: neutraler Status, impuls:null, kein nächster Schritt.
   Fixtures: echte Instanzen über Spiel.instanzErstellen/oeffnen/verdacht/akte/befehle/loesung/abnahme. */
gruppe("Spiel: Analyse-Leitfaden (3.1-B2)", () => {
  const LF = () => Spiel.leitfaden;
  function kapsel(fn){
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
      speicher: store.alles(), uhr: jetzt(), gen: Object.assign({}, Spiel.generierte), lern: JSON.parse(JSON.stringify(L.st))};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      store.set("einst", {});
      jetzt.setzen(Date.UTC(2026, 10, 1, 8, 0, 0));
      return fn();
    } finally {
      if (SPEICHER.timer) { clearTimeout(SPEICHER.timer); SPEICHER.timer = null; }
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, alt.speicher);
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      Spiel.generierte = alt.gen;
      for (const k of Object.keys(L.st)) delete L.st[k];
      Object.assign(L.st, alt.lern);
      jetzt.setzen(alt.uhr); jetzt.frei();
    }
  }
  function instanz(){
    const inst = Spiel.instanzErstellen({gen: {skill: "lab.link", seed: 9}, quelle: "postfach"});
    Spiel.oeffnen(inst.iid);
    return inst;
  }
  const ids = () => DATEN.leitfaden.phasen.map(p => p.id);
  const status = (st, id) => (st.schritte.find(s => s.id === id) || {}).status;
  const geraet = inst => Object.keys(inst.netz.geraete).find(id => inst.netz.geraete[id].typ !== "internet");

  pruefe("Frisches Ticket: nur Schritt 1 erledigt, Schritt 2 aktuell; Form fürs UI", () => kapsel(() => {
    const inst = instanz();
    const st = LF().stand(inst);
    erwarte.gleich(st.pruefung, false, "kein Prüfungsmodus");
    erwarte.gleich(st.schritte.map(s => s.id), ids(), "6 Phasen-ids wörtlich aus DATEN.leitfaden.phasen");
    erwarte.gleich([status(st, "auftrag-klaeren"), st.aktuell], ["erledigt", "lage-schichten"], "Auftrag geklärt (inst.geoeffnet), Lage als Nächstes");
    erwarte.gleich([typeof st.fortschritt, st.fortschritt > 0 && st.fortschritt < 1], ["number", true], "fortschritt 0..1");
    const aktuell = st.schritte.find(s => s.id === st.aktuell);
    erwarte.wahr(!!aktuell && typeof aktuell.impuls === "string" && aktuell.impuls.length > 0, "aktueller Schritt trägt einen Impuls");
    const andereImpulse = st.schritte.filter(s => s.status !== "aktuell").map(s => s.impuls);
    erwarte.wahr(andereImpulse.length > 0 && andereImpulse.every(x => x === null), "nur der aktuelle Schritt trägt einen Impuls (sonst null): " + JSON.stringify(andereImpulse));
    erwarte.gleich(st.schritte.filter(s => s.status === "aktuell").length, 1, "genau ein aktueller Schritt");
    const n = LF().naechsterSchritt(inst);
    erwarte.gleich([n && n.id, typeof (n && n.text)], ["lage-schichten", "string"], "naechsterSchritt = {id,titel,text}");
    /* Beide Spec-Impulse werden genutzt: Stand zeigt impulse[0], der nächste Schritt impulse[1]. */
    const phase2 = DATEN.leitfaden.phasen.find(p => p.id === "lage-schichten");
    erwarte.gleich(aktuell.impuls, phase2.impulse[0], "Stand zeigt den ersten Spec-Impuls");
    erwarte.gleich(n.text, phase2.impulse[1] || phase2.impulse[0], "naechsterSchritt nutzt den zweiten Spec-Impuls (kein toter Inhalt)");
    erwarte.gleich([LF().phase(inst), typeof LF().fortschritt(inst), LF().pruefungAktiv()], ["lage-schichten", "number", false], "phase/fortschritt/pruefungAktiv");
    console.log("MESSUNG Leitfaden frisch: aktuell=" + st.aktuell + " · fortschritt=" + st.fortschritt);
  }));

  pruefe("Lage-Proxy (Spec §6): VOR dem ersten Befehl offen, danach erledigt – Beweiskarte allein reicht NICHT", () => kapsel(() => {
    const inst = instanz();
    const g = geraet(inst);
    erwarte.gleich(status(LF().stand(inst), "lage-schichten"), "aktuell", "frisch: Lage ist der aktuelle Schritt (noch keine Spur)");
    Spiel.akte.ausBefehl(inst, {geraet: g, befehl: "ipconfig", befund: "Adresse und Maske abgelesen", ok: true});
    let st = LF().stand(inst);
    erwarte.gleich([status(st, "messen"), status(st, "lage-schichten")], ["erledigt", "aktuell"], "Beweiskarte erledigt Messen, NICHT Lage (Proxy fehlt)");
    Spiel.befehle.merken(inst, {geraet: g, befehl: "ipconfig", ok: true});
    st = LF().stand(inst);
    erwarte.gleich(status(st, "lage-schichten"), "erledigt", "erster Befehl erledigt Lage/Schichten (Proxy)");
    erwarte.gleich(status(st, "hypothese"), "aktuell", "Verdacht bleibt offen/aktuell (keine Doppel-Erledigung)");
    console.log("MESSUNG Lage-Proxy: Beweiskarte allein -> lage offen · mit Befehls-Log -> lage erledigt");
  }));

  pruefe("Fortschritt aus echten Aktionen: Hypothese, Messung, Eingriff+Verifikation, Abnahme", () => kapsel(() => {
    const inst = instanz();
    const def = Spiel.defVon(inst), g = geraet(inst);
    Spiel.verdacht.setzen(inst, {schicht: 3, ursache: def.injektoren[0], geraet: g});
    Spiel.befehle.merken(inst, {geraet: g, befehl: "ipconfig", ok: true});
    Spiel.akte.ausBefehl(inst, {geraet: g, befehl: "ipconfig", befund: "Adresse und Maske abgelesen", ok: true});
    Spiel.loesung(inst.netz, def.loesung);
    Spiel.arbeitszieleErfuellen(inst);
    erwarte.wahr(Spiel.geaenderteGeraete(inst).length > 0, "Eingriff ist am Netzdiff sichtbar");
    let st = LF().stand(inst);
    erwarte.gleich([status(st, "lage-schichten"), status(st, "messen")], ["erledigt", "erledigt"], "Lage und Messen erledigt");
    erwarte.wahr(["erledigt", "aktuell"].includes(status(st, "eingreifen-pruefen")), "Eingreifen ist nicht mehr offen");
    Spiel.abnahme(inst);
    st = LF().stand(inst);
    erwarte.gleich(status(st, "dokumentieren-lernen"), "erledigt", "Abnahme erledigt Dokumentieren/Lernen");
    erwarte.gleich([st.aktuell, st.fortschritt], [null, 1], "alles erledigt: aktuell null, Fortschritt 1");
    erwarte.gleich(LF().naechsterSchritt(inst), null, "kein nächster Schritt");
    console.log("MESSUNG Leitfaden fertig: " + st.schritte.map(s => s.id + ":" + s.status).join(" ") + " · fortschritt=" + st.fortschritt);
  }));

  pruefe("Ohne Injektor (Arbeitsziel-Aufträge): Hypothese entfällt; Eingreifen über erfülltes Ziel", () => kapsel(() => {
    const inst = instanz();
    const altNoetig = Spiel.verdacht.noetig;
    Spiel.verdacht.noetig = () => false;
    try {
      let st = LF().stand(inst);
      erwarte.gleich(status(st, "hypothese"), "erledigt", "ohne Injektor ist die Hypothese kein Zwang");
      erwarte.gleich(status(st, "eingreifen-pruefen"), "offen", "ohne Ziel-Nachweis bleibt Eingreifen offen");
      inst.zielErst = [1];                      /* so schreibt Spiel.abnahme ein erfülltes Ziel */
      st = LF().stand(inst);
      erwarte.gleich(status(st, "eingreifen-pruefen"), "erledigt", "ohne Injektor genügt ein erfülltes Ziel");
    } finally { Spiel.verdacht.noetig = altNoetig; }
    console.log("MESSUNG Ohne-Injektor: Hypothese automatisch erledigt · Eingreifen über zielErst");
  }));

  pruefe("Prüfungsmodus: neutraler Status, impuls:null, kein nächster Schritt", () => kapsel(() => {
    const inst = instanz();
    Spiel._st.pruefung = {art: "AP1", start: jetzt(), ende: null, aufgaben: []};
    erwarte.gleich(LF().pruefungAktiv(), true, "laufende Prüfung erkannt");
    const st = LF().stand(inst);
    erwarte.gleich([st.pruefung, st.aktuell], [true, null], "neutraler Status ohne aktuellen Schritt");
    erwarte.gleich(st.schritte.length, 6, "Status bleibt strukturiert (id/titel/status)");
    erwarte.gleich(st.schritte.every(s => s.impuls === null), true, "keine Impulse in der Prüfung (impuls:null)");
    erwarte.gleich(st.schritte.map(s => s.id), ids(), "ids bleiben");
    erwarte.gleich(typeof st.fortschritt, "number", "fortschritt bleibt berechnet");
    erwarte.gleich(LF().naechsterSchritt(inst), null, "kein nächster Schritt in der Prüfung");
    Spiel._st.pruefung = null;
    erwarte.gleich(LF().pruefungAktiv(), false, "nach der Prüfung wieder normal");
    console.log("MESSUNG Prüfung: neutrale Schritte " + st.schritte.length + " · impulslos · naechster=null");
  }));

  pruefe("Kein Leck + keine neuen Spielstände + Lücke dokumentiert", () => kapsel(() => {
    const inst = instanz();
    const texte = [];
    for (const p of DATEN.leitfaden.phasen){ texte.push(p.titel); for (const imp of p.impulse) texte.push(imp); }
    const st = LF().stand(inst);
    for (const s of st.schritte) if (typeof s.impuls === "string") texte.push(s.impuls);
    const n = LF().naechsterSchritt(inst);
    if (n && n.text) texte.push(n.text);
    const lecks = texte.filter(t => /[0-9]/.test(t) || /NL-/.test(t) || /\bkonfig|switchport|ip route|conf t\b/i.test(t));
    erwarte.wahr(texte.length >= 8, "genug Texte geprüft: " + texte.length);
    erwarte.gleich(lecks, [], "keine Zahl/Adresse/Konfig in Titeln oder Impulsen");
    const keysVorher = Object.keys(Spiel.st).sort().join(",");
    LF().stand(inst); LF().stand(inst); LF().naechsterSchritt(inst);
    erwarte.gleich(Object.keys(Spiel.st).sort().join(","), keysVorher, "stand() legt keine Felder im Spielstand an");
    const luecke = (LF().LUECKEN || []).find(x => x.schritt === "lage-schichten");
    erwarte.wahr(!!luecke, "Spec-Lücke für Lage/Schichten ist dokumentiert");
    erwarte.enthaelt(JSON.stringify(luecke), "befehle", "Proxy inst.befehle ist benannt");
    erwarte.enthaelt(JSON.stringify(luecke), "3.2", "inst.gesehen als 3.2-Idee, nicht 3.1.0");
    inst.leitfaden = {alt: true};
    erwarte.gleich(LF().zuruecksetzen(inst), {ok: true}, "zuruecksetzen ok");
    erwarte.gleich("leitfaden" in inst, false, "Altlast entfernt, echte Zustände bleiben");
    console.log("MESSUNG Leck/Speicher: " + texte.length + " Texte · Lecks " + lecks.length + " · keine neuen Felder · Lücke dokumentiert");
  }));
});
