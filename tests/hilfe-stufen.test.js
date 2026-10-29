"use strict";
/* HILFELEITER: SENIOR_FRAGEN 30/30 UND STUFE 5 OHNE LÖSUNGSTEXTE (Welle 2 · S4, Architektur § 17.3)
   BEFUND (B-auftraege.md § 4): Stufe 5 („konkreter Hinweis") fiel ohne eigenes hilfen-Feld auf
   def.loesung.map(s => s.text) zurück – also auf die vollständige Lösung zum halben Sternpreis.
   JETZT: Ohne eigenes hilfen.konkret gibt es Handlungshinweise aus der Fehlersuche-Leiter (Spiel.LEITER);
   Stufe 6 bleibt „Lösung vorführen".
   Zusätzlich: SENIOR_FRAGEN hat für JEDE der 30 Fertigkeiten eine Gegenfrage (vorher 13/27). */
gruppe("Hilfe: SENIOR_FRAGEN und Stufe 5 (S4)", () => {
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand();
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
    }
  };
  const norm = s => String(s == null ? "" : s).toLowerCase().replace(/\s+/g, " ").trim();
  const fehler = [];
  const ohneHilfenFall = inst => {
    const def = Spiel.defVon(inst) || {};
    return !(def.hilfen && def.hilfen.konkret && def.hilfen.konkret.length);
  };

  pruefe("SENIOR_FRAGEN: 30 Einträge, deckungsgleich mit DATEN.skills, jede eine Gegenfrage (keine Lösung)", () => {
    const ids = DATEN.skills.map(s => s.id);
    const sf = Spiel.SENIOR_FRAGEN || {};
    erwarte.gleich(ids.filter(id => !Object.prototype.hasOwnProperty.call(sf, id)), [], "Fertigkeit ohne Senior-Frage");
    erwarte.gleich(Object.keys(sf).filter(id => !ids.includes(id)), [], "Senior-Frage ohne Fertigkeit");
    erwarte.gleich(Object.keys(sf).length, 30, "SENIOR_FRAGEN-Einträge");
    for (const id of ids) {
      const frage = String(sf[id] || "").trim();
      erwarte.wahr(frage.length >= 20, id + ": Senior-Frage zu kurz");
      erwarte.wahr(/\?$/.test(frage), id + ": Senior-Frage ist keine Frage");
    }
  });

  pruefe("Stufe 5: für KEIN Ticket Lösungstexte, nie leer (Handtickets + generierte Instanzen)", kapsel(() => {
    let geprueft = 0;
    const hand = DATEN.tickets.map(t => ({id: t.id, inst: Spiel.instanzErstellen({ticketId: t.id})}));
    const gen = [];
    for (const s of DATEN.skills) for (const seed of [1, 2, 3]) {
      try { gen.push({id: s.id + "#" + seed, inst: Spiel.instanzErstellen({gen: {skill: s.id, seed}})}); } catch (e) { /* ohne Generator */ }
    }
    for (const fall of [...hand, ...gen]) {
      const inst = fall.inst;
      if (!inst) continue;
      geprueft++;
      const r = Spiel.hilfeInhalt(inst, 5);
      const hinweise = (r && r.konkret) || [];
      if (!hinweise.length) { fehler.push(fall.id + ": Stufe 5 ist leer"); continue; }
      const def = Spiel.defVon(inst) || {};
      const loesungen = (def.loesung || []).map(s => norm(s.text)).filter(x => x.length > 25);
      for (const l of loesungen) if (hinweise.some(h => norm(h).includes(l))) fehler.push(fall.id + ": Lösungstext in Stufe 5");
      for (const e of (inst.ereignisLoesung || [])) if (hinweise.some(h => norm(h).includes(norm(e.text)))) fehler.push(fall.id + ": Ereignis-Lösungstext in Stufe 5");
    }
    if (fehler.length) console.log(fehler.slice(0, 20).join(String.fromCharCode(10)));
    erwarte.gleich(fehler, [], "Stufe-5-Verstöße");
    erwarte.wahr(geprueft >= 60, "zu wenige Instanzen geprüft: " + geprueft);
  }));

  pruefe("Fallback ohne eigenes hilfen.konkret: Handlungshinweise aus der Leiter, keine Lösung", kapsel(() => {
    const loesungstext = "Die Regel in der richtigen Reihenfolge eintragen und die Konfiguration sichern.";
    const synth = {
      id: "s4-synthetisch-ohne-hilfen", art: "stoerung", stufe: "E", karriere: 1, kunde: "salon",
      titel: "Synthetisches Ticket ohne Hilfen", briefing: "Hallo", symptom: "Der Weg von innen in die DMZ ist zu, bitte prüfen.",
      skills: ["lab.fw", "lab.dmz"],
      netz: () => { const n = DATEN.beispiele.salon(); Modell.trennen(n, Modell.kabelAn(n, "kasse", "eth0").kabel.id); return n; },
      ziele: [{typ: "erreichbar", von: "kasse", nach: "drucker", proto: "icmp", text: "Kasse erreicht Drucker"}],
      hilfen: {frage: [], bereich: [], konkret: []},
      loesung: [{text: loesungstext}],
      erklaerung: "Testticket.", quelle: "Test", lohn: {euro: 10, ruf: 1}, minuten: 2,
    };
    const alt = DATEN.tickets.slice();
    DATEN.tickets.push(synth);
    try {
      const inst = Spiel.instanzErstellen({ticketId: synth.id});
      erwarte.wahr(ohneHilfenFall(inst), "Testticket hat unerwartet eigene konkret-Hinweise");
      const r = Spiel.hilfeInhalt(inst, 5);
      erwarte.wahr(r.konkret.length > 0, "Stufe-5-Fallback ist leer");
      for (const h of r.konkret) {
        erwarte.passt(String(h), /^Prüfe zuerst /, "Fallback ist kein Handlungshinweis: " + h);
        erwarte.falsch(norm(h).includes(norm(loesungstext)), "Fallback enthält den Lösungstext");
      }
      /* Ein dazugekommener Vorfall wird benannt, aber nicht als Lösung vorgelesen. */
      inst.ereignisLoesung = [{geraet: "kasse", text: "Kabel der Kasse am Switch einstecken und Port prüfen."}];
      const r2 = Spiel.hilfeInhalt(inst, 5);
      erwarte.wahr(r2.konkret.some(h => /^Neuer Vorfall: Prüfe zuerst /.test(String(h))), "Ereignis wird nicht als Hinweis genannt");
      erwarte.falsch(r2.konkret.some(h => norm(h).includes(norm(inst.ereignisLoesung[0].text))), "Ereignis-Lösung wird vorgelesen");
    } finally {
      DATEN.tickets.length = 0;
      for (const t of alt) DATEN.tickets.push(t);
    }
  }));

  pruefe("Stufe 6 bleibt „Lösung vorführen“ – mit allen Lösungsschritten", kapsel(() => {
    const def0 = DATEN.tickets.find(t => t.id === "buero-01");
    const inst = Spiel.instanzErstellen({ticketId: def0.id});
    const def = Spiel.defVon(inst);
    const r = Spiel.hilfeInhalt(inst, 6);
    erwarte.wahr(Array.isArray(r.schritte), "Stufe 6 liefert keine Schritte");
    erwarte.gleich(r.schritte.length, (def.loesung || []).length, "Stufe 6 zeigt nicht alle Lösungsschritte");
    erwarte.wahr(r.schritte.every(s => s.text || s.zeilen || s.felder), "Schritt ohne Inhalt");
    erwarte.gleich(r.name, "Lösung vorführen", "Stufe 6 heißt anders");
    erwarte.gleich(r.kosten, 1, "Stufe 6 kostet nicht mehr 1 Stern");
  }));
});
