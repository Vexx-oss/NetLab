"use strict";
/* Trainingsszenarien (Baustein G, Vertrag „Hilfestellung – Stufen und Schnittstellen" § 6).

   Geprüft wird DATEN.trainings (src/daten/trainings.js) – Form, Abdeckung und Belegbarkeit.
   Zwei Prüfungen messen gegen den echten Bestand statt zu behaupten:
   · „quelle“: jeder Teil der Quellenangabe muss wörtlich in den Quellen DERSELBEN Fertigkeit stehen
     (DATEN.lehrtexte je Grundcode oder DATEN.wiki[skill].quelle/.belege).
   · „geraet“: die Geräteklasse wird aus den Injektoren der Fertigkeit gemessen (Spiel.INJEKTOREN ×
     Spiel.vorlagen × inj.passt) – dieselbe Messung wie in tests/spiel-training.test.js.
   Zuletzt der Beweis der Wirkung: jedes Szenario wird über den echten Weg (Spiel.instanzErstellen mit
   quelle „training“) wirklich gebaut. Ausnahme sind genau die Fertigkeiten ohne Injektor – sie sind
   Vorratseinträge und stehen als solche namentlich im Test. Reine Daten, kein DOM. */
gruppe("Daten: Trainings", () => {
  const alle = Array.isArray(DATEN.trainings) ? DATEN.trainings : [];
  const skillIds = new Set(DATEN.skills.map(s => s.id));
  const ARTEN = ["basis", "stoerung", "pruefung"];
  const NIVEAU = {basis: "E", stoerung: "AP1", pruefung: "AP2"};
  /* Feldnamen sind der Vertrag: genau diese Felder liest src/spiel/training.js. */
  const PFLICHT = ["id", "titel", "beschreibung", "skill", "geraet", "art", "minuten", "geruest", "niveau", "tipp", "quelle"];
  const ERLAUBT = new Set([...PFLICHT, "schritte"]);

  pruefe("mindestens 12 Szenarien, eindeutige IDs mit Präfix tr-", () => {
    erwarte.wahr(alle.length >= 12, `nur ${alle.length} Szenarien`);
    const f = [];
    const ids = new Set();
    for (const t of alle) {
      if (!t || typeof t !== "object") { f.push("kein Objekt: " + JSON.stringify(t)); continue; }
      if (ids.has(t.id)) f.push("doppelte ID: " + t.id);
      ids.add(t.id);
      if (!/^tr-[a-z0-9-]+$/.test(String(t.id))) f.push(`${t.id}: ID ohne Präfix tr- oder mit Sonderzeichen`);
    }
    erwarte.gleich(f, []);
  });

  pruefe("Feldnamen stimmen: jedes Pflichtfeld vorhanden, kein unbekanntes Feld", () => {
    const f = [];
    for (const t of alle) {
      for (const k of PFLICHT) if (!(k in t)) f.push(`${t.id}: ${k} fehlt`);
      for (const k of Object.keys(t)) if (!ERLAUBT.has(k)) f.push(`${t.id}: unbekanntes Feld „${k}“`);
    }
    erwarte.gleich(f, []);
  });

  pruefe("jede Fertigkeit aus DATEN.skills kommt mindestens einmal vor – keine erfundene", () => {
    const f = [];
    for (const t of alle) if (!skillIds.has(t.skill)) f.push(`${t.id}: unbekannte Fertigkeit ${t.skill}`);
    const genutzt = new Set(alle.map(t => t.skill));
    erwarte.gleich(f, []);
    erwarte.gleich(DATEN.skills.filter(s => !genutzt.has(s.id)).map(s => s.id), [], "Fertigkeit ohne Szenario");
    erwarte.wahr(DATEN.skills.length >= 27, `DATEN.skills hat nur ${DATEN.skills.length} Einträge`);
  });

  pruefe("art, minuten, niveau und geruest stehen im erlaubten Bereich", () => {
    const f = [];
    const arten = new Set();
    for (const t of alle) {
      if (!ARTEN.includes(t.art)) f.push(`${t.id}: art ${t.art}`);
      arten.add(t.art);
      if (!Number.isInteger(t.minuten) || t.minuten < 3 || t.minuten > 15) f.push(`${t.id}: minuten ${t.minuten}`);
      if (typeof t.geruest !== "boolean") f.push(`${t.id}: geruest ${typeof t.geruest}`);
      if (!["E", "AP1", "AP2"].includes(t.niveau)) f.push(`${t.id}: niveau ${t.niveau}`);
      if (NIVEAU[t.art] && t.niveau !== NIVEAU[t.art]) f.push(`${t.id}: niveau ${t.niveau} passt nicht zu art ${t.art}`);
      if (t.art === "pruefung" && t.geruest) f.push(`${t.id}: Prüfung mit Gerüst`);
      if (t.art !== "pruefung" && !t.geruest) f.push(`${t.id}: ${t.art} ohne Gerüst`);
    }
    erwarte.gleich(f, []);
    erwarte.gleich(ARTEN.filter(a => !arten.has(a)), [], "Art ohne Szenario");
  });

  pruefe("Titel und Beschreibung sind gefüllt, die Beschreibung ist der E-Satz", () => {
    const f = [];
    for (const t of alle) {
      if (typeof t.titel !== "string" || t.titel.trim().length < 5 || t.titel.length > 70) f.push(`${t.id}: titel „${t.titel}“`);
      if (typeof t.beschreibung !== "string" || t.beschreibung.trim().length < 80) f.push(`${t.id}: beschreibung zu knapp`);
      if (typeof t.tipp !== "string") f.push(`${t.id}: tipp fehlt`);
      if (t.geruest && t.tipp.trim().length < 20) f.push(`${t.id}: Gerüst ohne Denkanstoß`);
      if (!t.geruest && t.tipp.trim() !== "") f.push(`${t.id}: Prüfung mit Denkanstoß`);
    }
    erwarte.gleich(f, []);
  });

  pruefe("Gerüst und Schritte gehören zusammen: geführte Übung mit Schritten, Prüfung ohne", () => {
    const f = [];
    for (const t of alle) {
      const s = t.schritte;
      if (t.geruest) {
        if (!Array.isArray(s) || s.length < 3) { f.push(`${t.id}: keine Schritte`); continue; }
        for (const z of s) if (typeof z !== "string" || z.trim().length < 10) f.push(`${t.id}: Schritt „${z}“ zu knapp`);
      } else if (s !== undefined) f.push(`${t.id}: Prüfungsszenario mit Schritten`);
    }
    erwarte.gleich(f, []);
  });

  pruefe("jede Quelle ist gefüllt und aus dem Bestand DERSELBEN Fertigkeit belegbar", () => {
    const bestand = skill => [
      ...Object.values(DATEN.lehrtexte).filter(l => l.skill === skill).map(l => l.quelle || ""),
      (DATEN.wiki[skill] || {}).quelle || "",
      (DATEN.wiki[skill] || {}).belege || "",
    ].join(" · ");
    const f = [];
    for (const t of alle) {
      if (typeof t.quelle !== "string" || t.quelle.trim().length < 20) { f.push(`${t.id}: Quelle fehlt oder ist zu knapp`); continue; }
      for (const teil of t.quelle.split(" · ")) if (!bestand(t.skill).includes(teil)) f.push(`${t.id}: „${teil}“ steht in keiner Quelle zu ${t.skill}`);
    }
    erwarte.gleich(f, []);
  });

  pruefe("jede Fertigkeit löst im echten Weg auf: Spiel.skill liefert Name und Karriere-Stufe", () => {
    const f = [];
    for (const t of alle) {
      let s = null;
      try { s = Spiel.skill(t.skill); } catch (e) { f.push(`${t.id}: Spiel.skill wirft (${e && e.message ? e.message : e})`); continue; }
      if (!s || !s.name) { f.push(`${t.id}: Spiel.skill(${t.skill}) ohne Namen`); continue; }
      if (!(s.stufe >= 1)) f.push(`${t.id}: Karriere-Stufe ${s.stufe}`);
    }
    erwarte.gleich(f, []);
  });

  /* Geräteklassen der Fertigkeit aus den Injektoren messen – dieselbe Rechnung wie in
     tests/spiel-training.test.js: „host“ = Endgerät (Spiel.HOSTTYPEN), sonst der Gerätetyp. */
  const klassen = (() => {
    const merker = new Map();
    return skill => {
      if (merker.has(skill)) return merker.get(skill);
      const gefunden = new Set();
      for (const inj of Object.values(Spiel.INJEKTOREN || {}).filter(i => (i.skills || []).includes(skill))) {
        for (const name of inj.vorlagen || []) {
          const V = (Spiel.vorlagen || {})[name];
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

  pruefe("geraet passt zu dem, was die Injektoren der Fertigkeit wirklich treffen (gemessen)", () => {
    const abweichung = [];
    for (const t of alle) {
      const k = klassen(t.skill);
      const soll = k.size === 0 ? null : (k.size === 1 ? [...k][0] : "alle");
      if (t.geraet !== soll) abweichung.push(`${t.id} (${t.skill}): geraet „${t.geraet}“, gemessen ${k.size ? [...k].sort().join(",") : "keine Injektoren"}`);
    }
    erwarte.gleich(abweichung, []);
  });

  pruefe("jedes Szenario mit Injektoren ist über Spiel.instanzErstellen baubar; ohne Injektor ist es Vorrat", () => {
    /* Am 09.10.2026 gemessen: für diese drei Fertigkeiten gibt es noch keinen Injektor (Spiel.INJEKTOREN).
       Ihre Szenarien stehen als Vorrat in der Liste, starten() kann sie erst mit Injektor bauen.
       Kommt ein Injektor dazu, wird dieser Test rot – dann gehört „geraet“ nachgezogen. */
    const OHNE_INJEKTOR = ["lab.portsec", "lab.stp", "lab.storage"];
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      const f = [], vorrat = [];
      for (const t of alle) {
        const ohne = klassen(t.skill).size === 0;
        let ok = false, grund = "";
        try {
          const inst = Spiel.instanzErstellen({gen: {skill: t.skill, seed: 1, opts: {stufe: t.niveau}}, quelle: "training", ohneFlow: true});
          ok = !!(inst && inst.netz && Spiel.defVon(inst));
          if (!ok) grund = "keine auflösbare Instanz";
        } catch (e) { grund = e && e.message ? e.message : String(e); }
        if (ok && ohne) f.push(`${t.id}: baubar, obwohl kein Injektor gemessen wurde – geraet darf dann nicht null sein`);
        if (!ok && !ohne) f.push(`${t.id} (${t.skill}): nicht baubar – ${grund}`);
        if (!ok && ohne) vorrat.push(t.id);
      }
      erwarte.gleich(f, []);
      erwarte.gleich(vorrat.map(id => alle.find(t => t.id === id).skill), OHNE_INJEKTOR, "Vorratseinträge ohne Injektor");
      erwarte.wahr(alle.length - vorrat.length >= 12, `nur ${alle.length - vorrat.length} baubare Szenarien`);
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
    }
  });
});
