"use strict";
/* ---------- Prüfungstag: Blueprint, baubare Kandidaten, Erreichbarkeit (2.1 S3, Architektur § 17.2) ----------
   B-Bericht § 3.7 hat zwei Ausschlüsse gemessen: pruefung.js filterte mit (s.stufe || 1) <= Math.min(5, stufe)
   (Stufe-6-Fertigkeiten kamen nie vor) und mit s.id !== "lab.portsec" (Port-Security kam nie vor). Beides ist
   entfernt; je Prüfungsart gilt das Fertigkeitsset ihres ap-Felds, zusammen alle vorhandenen Fertigkeiten.
   Geplant wird nur, was BAUBAR ist (Injektor ODER Handticket mit dieser Fertigkeit, § 17.1) – so startet der
   Bogen IMMER mit genau 3 Aufgaben. Der Test ist DYNAMISCH: keine 27/30 steht hier, er misst DATEN.skills. */
gruppe("Prüfung: Blueprint und Erreichbarkeit", () => {
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken, gen: Spiel.generierte};
    try {
      Spiel._trocken = true; Spiel._lz = {}; Spiel.generierte = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken; Spiel.generierte = alt.gen;
    }
  };
  const alleSkills = () => (DATEN.skills || []).map(s => s.id);
  const ARTEN = ["AP1", "AP2"];

  pruefe("Blueprint: AP1 + AP2 decken ALLE vorhandenen Fertigkeiten ab (dynamisch, keine feste Zahl)", () => {
    const alle = alleSkills(), bp1 = Spiel.pruefung.blueprint("AP1"), bp2 = Spiel.pruefung.blueprint("AP2");
    erwarte.wahr(bp1.length > 0 && bp2.length > 0, "beide Blueprints sind nicht leer");
    erwarte.gleich([...bp1, ...bp2].sort(), alle.slice().sort(), "AP1 ∪ AP2 = DATEN.skills");
    erwarte.gleich(bp1.filter(id => bp2.includes(id)), [], "keine Fertigkeit in beiden Blueprints");
    /* Die früheren Ausschlüsse sind messbar weg: Port-Security und alle Stufe-6-Fertigkeiten sind erreichbar. */
    erwarte.wahr([...bp1, ...bp2].includes("lab.portsec"), "lab.portsec ist im Blueprint (kein Ausschluss mehr)");
    for (const s of DATEN.skills.filter(x => (x.stufe || 1) >= 6))
      erwarte.wahr([...bp1, ...bp2].includes(s.id), "Stufe-6-Fertigkeit im Blueprint: " + s.id);
  });

  pruefe("Kandidaten: nur BAUBARE Fertigkeiten werden geplant – Blueprint bleibt das volle Set", () => {
    const ohneInhalt = [];
    for (const art of ARTEN) {
      const bp = Spiel.pruefung.blueprint(art), kand = Spiel.pruefung.kandidaten(art);
      erwarte.wahr(kand.every(id => bp.includes(id)), art + ": Kandidaten sind Teilmenge des Blueprints");
      erwarte.gleich(kand.filter(id => !Spiel.pruefung.buildbar(art, id)), [], art + ": unbaubarer Kandidat im Bogen");
      for (const id of bp.filter(x => !kand.includes(x))) {
        ohneInhalt.push(id);
        erwarte.wahr(!Spiel.pruefung.hatInjektor(id) && Spiel.pruefung.handticketsMitSkill(art, id).length === 0,
          art + "/" + id + ": aus dem Bogen genommen, obwohl baubar");
      }
    }
    /* Alles, was einen Injektor hat (heute alle 27), MUSS Kandidat seiner Prüfungsart sein – kein stiller Ausschluss. */
    for (const s of DATEN.skills) if (Spiel.pruefung.hatInjektor(s.id)) {
      const art = s.ap === "AP2" ? "AP2" : "AP1";
      erwarte.wahr(Spiel.pruefung.kandidaten(art).includes(s.id), s.id + " mit Injektor ist Kandidat");
    }
    console.log("MESSUNG Prüfung · Fertigkeiten: " + alleSkills().length + " · Kandidaten AP1/AP2: " + Spiel.pruefung.kandidaten("AP1").length + "/" + Spiel.pruefung.kandidaten("AP2").length + " · ohne Inhalt (S6 ausstehend): " + (ohneInhalt.length ? ohneInhalt.join(", ") : "keine"));
  });

  pruefe("Erreichbarkeit: über 200 Seeds je Art liefert jeder Bogen GENAU 3 Aufgaben und deckt alle Kandidaten ab", () => {
    const gesehen = new Set(), fehler = [];
    for (const art of ARTEN) {
      const kand = Spiel.pruefung.kandidaten(art), imBogen = new Set();
      for (let seed = 1; seed <= 200; seed++) {
        const bogen = Spiel.pruefung.bogen(art, Zufall("pruefungstest:" + art + ":" + seed));
        if (bogen.length !== Spiel.PRUEFUNG.AUFGABEN) fehler.push(art + "/" + seed + ": " + bogen.length + " statt 3 Aufgaben");
        for (const d of bogen) {
          if (d.art === "gen") {
            if (!Spiel.pruefung.hatInjektor(d.skill)) fehler.push(art + "/" + seed + ": generierte Aufgabe ohne Injektor (" + d.skill + ")");
            if (!kand.includes(d.skill)) fehler.push(art + "/" + seed + ": " + d.skill + " ist kein Kandidat");
            imBogen.add(d.skill);
          } else {
            const t = (DATEN.tickets || []).find(x => x.id === d.ticketId);
            if (!t) fehler.push(art + "/" + seed + ": Handticket fehlt: " + d.ticketId);
            else if (d.skill && !(t.skills || []).includes(d.skill)) fehler.push(art + "/" + seed + ": Handticket nennt " + d.skill + " nicht");
            if (d.skill) imBogen.add(d.skill);
          }
        }
      }
      erwarte.gleich(fehler.slice(0, 6), [], art + ": Bauplan verletzt Aufgabenzahl/Baubarkeit");
      erwarte.gleich([...imBogen].sort(), kand.slice().sort(), art + ": alle Kandidaten über 200 Seeds erreichbar");
      for (const id of imBogen) gesehen.add(id);
    }
    const alleKand = [...new Set([...Spiel.pruefung.kandidaten("AP1"), ...Spiel.pruefung.kandidaten("AP2")])].sort();
    erwarte.gleich([...gesehen].sort(), alleKand, "alle baubaren Fertigkeiten erreichbar");
    /* Vertrag § 17.2: ALLE vorhandenen Fertigkeiten (dynamisch, heute 30) müssen erreichbar sein – keine Ausnahme. */
    erwarte.gleich(alleKand, alleSkills().sort(), "ALLE vorhandenen Fertigkeiten sind baubar und über 200 Seeds erreichbar");
    console.log("MESSUNG Prüfung · 2 Arten × 200 Seeds × 3 Aufgaben = 1200 geplante Aufgaben · " + alleKand.length + "/" + alleSkills().length + " Fertigkeiten abgedeckt");
    erwarte.gleich(Spiel.PRUEFUNG.AUFGABEN, 3, "3 Aufgaben bleiben (Vertrag)");
    erwarte.gleich(Spiel.PRUEFUNG.MINUTEN, 25, "25 Minuten bleiben (Vertrag)");
  });

  pruefe("Notenschlüssel und Bestehensgrenze unverändert (IHK)", () => {
    const n = Punkte => Spiel.pruefung.note(Punkte);
    erwarte.gleich([100, 92, 91, 81, 80, 67, 66, 50, 49, 30, 29, 0].map(n), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
    erwarte.gleich(Spiel.PRUEFUNG.BESTANDEN_AB, 50);
    erwarte.gleich(Spiel.pruefung.NOTEN[1], "sehr gut");
  });

  pruefe("Handticket-Pool: passt zur Fertigkeit, bevorzugt Skill-Treffer, respektiert ‚verbraucht‘", () => {
    const t1 = Spiel.pruefung.handticketFuer("AP1", "lab.link", Zufall("ht:1"), new Set());
    erwarte.wahr(!!t1, "Handticket für lab.link gefunden");
    erwarte.wahr((t1.skills || []).includes("lab.link"), "Handticket nennt die Fertigkeit: " + JSON.stringify(t1.skills));
    const t2 = Spiel.pruefung.handticketFuer("AP1", "lab.link", Zufall("ht:1"), new Set([t1.id]));
    erwarte.wahr(!t2 || t2.id !== t1.id, "verbrauchtes Handticket wird nicht doppelt gezogen");
    const t3 = Spiel.pruefung.handticketFuer("AP2", "lab.dmz", Zufall("ht:2"), new Set());
    erwarte.wahr(!!t3, "Handticket für AP2 gefunden");
    erwarte.wahr(t3.stufe === "AP1" || t3.stufe === "AP2" || t3.stufe === "E", "Handticket passt zur Prüfungsart: " + t3.stufe);
    /* Stabile Auskunft für andere Tests (Dichte): Fertigkeit mit Injektor ist erreichbar. */
    erwarte.wahr(Spiel.pruefung.erreichbar("lab.link"), "erreichbar(lab.link)");
  });

  pruefe("Echter Bogen: starten liefert 3 spielbare Aufgaben – auch wenn der Generator keine baut", kapsel(() => {
    for (const art of ARTEN) {
      const r = Spiel.pruefung.starten(art);
      erwarte.wahr(r.ok, art + ": " + JSON.stringify(r));
      const p = Spiel.pruefung.aktiv();
      erwarte.gleich(p.aufgaben.length, 3, art + ": 3 Aufgaben");
      for (const iid of p.aufgaben) {
        const inst = Spiel.instanz(iid);
        erwarte.wahr(!!inst, art + ": Instanz fehlt: " + iid);
        erwarte.wahr(!!Spiel.defVon(inst), art + ": Definition fehlt: " + iid);
        erwarte.gleich(inst.quelle, "pruefung", art + ": Quelle");
      }
      Spiel.st.pruefung = null;
    }
  }));

  pruefe("Immer genau 3 Aufgaben: sechs Starts hintereinander", kapsel(() => {
    for (let i = 0; i < 6; i++) {
      const r = Spiel.pruefung.starten("AP1");
      erwarte.wahr(r.ok, "Start " + (i + 1) + ": " + JSON.stringify(r));
      erwarte.gleich(Spiel.pruefung.aktiv().aufgaben.length, 3, "Start " + (i + 1) + ": 3 Aufgaben");
      Spiel.st.pruefung = null;
    }
  }));

  pruefe("S6-Mechanik: fällt der Generator aus, mischt der Bogen Handtickets bei (weiterhin 3 Aufgaben)", kapsel(() => {
    const alt = Spiel.generiere, fehler = [];
    try {
      Spiel.generiere = () => { throw new Error("Test: kein Injektor (S6-Simulation)"); };
      const r = Spiel.pruefung.starten("AP1");
      erwarte.wahr(r.ok, JSON.stringify(r));
      const p = Spiel.pruefung.aktiv();
      erwarte.gleich(p.aufgaben.length, 3, "3 Aufgaben trotz Generator-Ausfall");
      for (const iid of p.aufgaben) {
        const inst = Spiel.instanz(iid), def = inst && Spiel.defVon(inst);
        if (!inst || !def) fehler.push(iid);
        else if (!(def.ziele || []).length) fehler.push(iid + ": keine Ziele");
      }
      erwarte.gleich(fehler, [], "alle Ersatz-Aufgaben sind spielbare Handtickets");
    } finally { Spiel.generiere = alt; }
  }));
});
