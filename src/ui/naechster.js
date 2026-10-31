"use strict";
/* ---------- Lernstand: „Nächster Schritt" (Runde 4, Strang B – Ausbildungs-Cockpit) ----------
   Die prominenteste Kachel des Lernstands beantwortet genau eine Frage: was ist JETZT dran?
   Sie liest ausschließlich vorhandene Daten und erfindet nichts:
     1. laufende Prüfung        → „Prüfung öffnen"          Spiel.pruefung.aktiv()
     2. fällige Wiederholung    → „Üben"                    L.istFaellig / L.faelligeIds
     3. wackelige Fertigkeit    → „Üben"                    L.box < 3 nach L.versucht
     4. Aufstieg steht an       → „Postfach öffnen"         Spiel.stufeInfo().bereit
     5. offenes Kompetenzfeld   → „Üben"                    Spiel.kompetenz.karte().zustand === "offen"
     6. Prüfungstag möglich     → „Prüfung starten"         Spiel.PRUEFUNG + Zertifikate/Verlauf
     7. nichts davon            → „Trainingsbereich öffnen"
   Die Kachel trägt GENAU EINE Hauptaktion (knopf primaer); alle übrigen Wege (Empfehlungen,
   Fehlerheft, Prüfungstermine) stehen in eigenen Kacheln des Cockpits und rufen dieselben
   bestehenden Funktionen auf (Spiel.karriere.training, Spiel.pruefung.starten, UI.app.ansicht).
   Kein neuer Spielzustand, kein Math.random, keine Uhr: die Logik ist eine reine Ableitung.
   Stile: src/stil/naechster.css, Abschnitt „Lernstand: Nächster Schritt" (nst-kachel …).
   Die bestehenden nst-Regeln der Labor-Führung (netzplan.js) bleiben unberührt. */

UI.naechster = (() => {
  const SICHER_AB = 3;                 /* ab Leitner-Fach 3 gilt eine Fertigkeit als sicher – wie lernstand-hilfe.js */
  const MAX_EMPFEHLUNGEN = 3;          /* so viele Zeilen hat die Kachel „Danach" im Lernstand */
  const LABOR = id => String(id).startsWith("lab.");
  const MOTOR = () => { try { return typeof L !== "undefined" && L ? L : null; } catch (e) { return null; } };
  const SPIEL = () => { try { return typeof Spiel !== "undefined" && Spiel ? Spiel : null; } catch (e) { return null; } };

  /* ---------- Kleine Leser: jeder Zugriff ist geprüft, jeder Rückfall ist ehrlich (leer, nicht geschätzt) ---------- */
  function skillName(id){
    const S = SPIEL();
    try {
      if (S && S.karriere && typeof S.karriere.skillName === "function") {
        const n = S.karriere.skillName(id);
        if (n && n !== id) return String(n);
      }
    } catch (e) { /* Rückfall unten */ }
    return String(id == null ? "" : id).replace(/^lab\./, "");
  }
  function box(id){
    const M = MOTOR();
    try {
      if (M && typeof M.box === "function") {
        const b = Number(M.box(id));
        if (Number.isFinite(b)) return Math.max(0, Math.min(5, Math.round(b)));
      }
    } catch (e) { /* Rückfall unten */ }
    return 0;
  }
  function faelligeIds(){
    const M = MOTOR();
    try {
      if (M && typeof M.faelligeIds === "function") {
        const ids = M.faelligeIds(LABOR);
        return Array.isArray(ids) ? ids.slice() : [];
      }
    } catch (e) { /* Rückfall unten */ }
    return [];
  }
  function schwacheIds(){
    const M = MOTOR();
    if (!M || !M.SKILLS || typeof M.box !== "function") return [];
    const ids = [];
    try {
      for (const id of Object.keys(M.SKILLS)) {
        if (!LABOR(id)) continue;
        if (typeof M.versucht === "function" && !M.versucht(id)) continue;
        if ((Number(M.box(id)) || 0) >= SICHER_AB) continue;
        if (typeof M.istFaellig === "function" && M.istFaellig(id)) continue;
        ids.push(id);
      }
      ids.sort((a, b) => (Number(M.box(a)) || 0) - (Number(M.box(b)) || 0) || (a < b ? -1 : a > b ? 1 : 0));
    } catch (e) { return []; }
    return ids;
  }
  function offeneFelder(){
    const S = SPIEL();
    try {
      if (!S || !S.kompetenz || typeof S.kompetenz.karte !== "function") return [];
      const k = S.kompetenz.karte();
      const felder = [];
      for (const r of k.regionen || []) for (const f of r.felder || []) {
        if (f && f.zustand === "offen") felder.push({id: f.id, name: f.name, region: r.titel});
      }
      return felder;
    } catch (e) { return []; }
  }
  function stufeInfo(){
    const S = SPIEL();
    try { return S && typeof S.stufeInfo === "function" ? S.stufeInfo() : null; } catch (e) { return null; }
  }
  function pruefungAktiv(){
    const S = SPIEL();
    try { return S && S.pruefung && typeof S.pruefung.aktiv === "function" ? S.pruefung.aktiv() : null; } catch (e) { return null; }
  }
  /* Prüfungstag: der nächste offene Bogen und seine echte Gebühr (die erste Prüfung ist gebührenfrei –
     dieselbe Regel wie Spiel.pruefung.starten: ohne Zertifikat UND ohne Verlauf). */
  function pruefungStand(){
    const S = SPIEL(), st = (S && S.st) || {};
    const zert = Array.isArray(st.zertifikate) ? st.zertifikate.filter(z => z && z.art) : [];
    const verlauf = Array.isArray(st.pruefungen) ? st.pruefungen : [];
    const erste = !zert.length && !verlauf.length;
    const naechste = !zert.some(z => z.art === "AP1") ? "AP1" : !zert.some(z => z.art === "AP2") ? "AP2" : null;
    const gebuehr = !S || !S.PRUEFUNG || !S.PRUEFUNG.GEBUEHR || !naechste ? 0 : (+S.PRUEFUNG.GEBUEHR[naechste] || 0);
    return {zert, verlauf, erste, naechste, gebuehr: erste ? 0 : gebuehr, kostenlos: erste};
  }

  /* Nächster Wiederholungstermin nach einer richtigen Antwort ohne Hilfe – dieselbe Regel wie
     der Lernmotor (src/fremd/lernmotor.js: INTERVALL = 0/1/3/7/14/30 Tage, Fach steigt um eins).
     NUR für eine echte WIEDERHOLUNG: ist die Fertigkeit noch nie versucht worden, gibt es keinen
     Termin, der genannt werden könnte (Prüfer-1-Befund). Lieber nichts als eine erfundene Zahl. */
  function naechsterTermin(id){
    const M = MOTOR();
    if (!M || typeof M.versucht !== "function" || !M.versucht(id)) return "";
    const faecher = M && Array.isArray(M.INTERVALL) ? M.INTERVALL : null;
    if (!faecher) return "";
    const ziel = Math.min(faecher.length - 1, box(id) + 1);
    const tage = Number(faecher[ziel]);
    if (!Number.isFinite(tage)) return "";
    return tage === 1 ? "Richtig ohne Hilfe: die nächste Wiederholung ist morgen fällig."
      : "Richtig ohne Hilfe: die nächste Wiederholung ist in " + tage + " Tagen fällig.";
  }

  /* Grund einer Empfehlung – als Text, damit die Zeile ohne Farbe lesbar bleibt. */
  function grund(id, due){
    if (due) return "fällig – Wiederholung steht an";
    const fach = box(id);
    return `wackelt – Leitner-Stufe ${fach} von 5`;
  }

  /* ---------- Die Empfehlungen: fällig zuerst, dann was wackelt (dieselbe Quelle wie lernstand-hilfe.js) ---------- */
  function empfehlungen(anzahl = MAX_EMPFEHLUNGEN, ohne = null){
    const due = faelligeIds();
    const ids = due.slice();
    for (const id of schwacheIds()) if (!ids.includes(id)) ids.push(id);
    return ids.filter(id => id != null && id !== ohne).slice(0, Math.max(0, Number(anzahl) || 0)).map(id => ({
      id, name: skillName(id), box: box(id), faellig: due.includes(id), grund: grund(id, due.includes(id)),
    }));
  }

  /* ---------- Der eine nächste Schritt ---------- */
  function schritt(){
    const p = pruefungAktiv();
    if (p) {
      const aufgaben = Array.isArray(p.aufgaben) ? p.aufgaben.length : 0;
      return {
        art: "pruefung-laeuft",
        kicker: "Nächster Schritt",
        titel: `Prüfung ${p.art} fortsetzen`,
        lead: "Der Prüfungstag läuft: keine Hilfe, keine Live-Ziele. Löse die Aufgaben in beliebiger Reihenfolge.",
        chips: [{text: "Prüfung läuft", ton: "warn"}],
        zeilen: [{label: "Aufgaben", wert: String(aufgaben)}],
        aktion: {art: "pruefung-oeffnen", text: "Prüfung öffnen"},
        skill: null,
      };
    }
    const due = faelligeIds();
    if (due.length) {
      const id = due[0];
      return {
        art: "faellig",
        kicker: "Nächster Schritt",
        titel: skillName(id),
        lead: "Diese Wiederholung ist heute fällig – kurz üben, dann kommt der nächste Termin.",
        nach: naechsterTermin(id),
        chips: [{text: "fällig", ton: "warn"}, {text: `Leitner-Stufe ${box(id)} von 5`, ton: ""}],
        zeilen: [],
        aktion: {art: "ueben", text: "Üben"},
        skill: id,
      };
    }
    const schwach = schwacheIds();
    if (schwach.length) {
      const id = schwach[0];
      return {
        art: "festigen",
        kicker: "Nächster Schritt",
        titel: skillName(id),
        lead: "Noch nicht sicher: eine kurze Übung festigt die Fertigkeit, bevor Neues dazukommt.",
        nach: naechsterTermin(id),
        chips: [{text: "wackelt", ton: "info"}, {text: `Leitner-Stufe ${box(id)} von 5`, ton: ""}],
        zeilen: [],
        aktion: {art: "ueben", text: "Üben"},
        skill: id,
      };
    }
    const info = stufeInfo();
    if (info && info.bereit && info.naechste) {
      return {
        art: "aufstieg",
        kicker: "Nächster Schritt",
        titel: `Aufstieg nach Stufe ${info.naechste.nr}`,
        lead: "Ruf und Können reichen. Mit dem nächsten abgenommenen Auftrag steigst du auf.",
        chips: [{text: "bereit", ton: "ok"}],
        zeilen: [
          {label: "Ruf", wert: `${info.ruf.ist} / ${info.ruf.soll == null ? "–" : info.ruf.soll}`, ok: true},
          {label: `Können Stufe ${info.stufe}`, wert: `${info.koennen.summe} / ${info.koennen.sollSumme}`, ok: true},
        ],
        aktion: {art: "postfach", text: "Postfach öffnen"},
        skill: null,
      };
    }
    const offen = offeneFelder();
    if (offen.length) {
      const f = offen[0];
      return {
        art: "offen",
        kicker: "Nächster Schritt",
        titel: f.name,
        lead: `Noch nie geübt – das Feld in „${f.region}" wartet auf den ersten Versuch.`,
        nach: "Erster Versuch – ein Wiederholungstermin entsteht erst danach.",
        chips: [{text: "neu", ton: ""}],
        zeilen: [],
        aktion: {art: "ueben", text: "Jetzt anfangen"},
        skill: f.id,
      };
    }
    const ps = pruefungStand();
    if (ps.naechste) {
      return {
        art: "pruefung",
        kicker: "Nächster Schritt",
        titel: "Prüfungstag ablegen",
        lead: "Nichts ist gerade fällig. Der Prüfungstag prüft unter Zeitdruck und ohne Hilfe – der nächste echte Schritt.",
        chips: [{text: "Prüfung möglich", ton: "info"}],
        zeilen: [],
        aktion: {
          art: "pruefung-starten",
          text: ps.kostenlos ? `Prüfung ${ps.naechste} starten (gebührenfrei)` : `Prüfung ${ps.naechste} starten (${ps.gebuehr} €)`,
          pruefung: ps.naechste,
        },
        skill: null,
      };
    }
    return {
      art: "leer",
      kicker: "Nächster Schritt",
      titel: "Alles im grünen Bereich",
      lead: "Nichts fällig, nichts offen. Ein Training im Trainingsbereich hält den Rhythmus.",
      chips: [{text: "nichts fällig", ton: "ok"}],
      zeilen: [],
      aktion: {art: "training", text: "Trainingsbereich öffnen"},
      skill: null,
    };
  }

  /* ---------- Die Kachel: eine hervorgehobene Fläche, eine Hauptaktion ----------
     opt.ueben(skill) · opt.pruefung() · opt.starten(art) · opt.ansicht(name) sind die bestehenden
     Wege des Lernstands; fehlt ein Rückruf, wird ehrlich gemeldet statt still nichts zu tun. */
  function kachel(opt = {}){
    const s = schritt();
    const o = opt || {};
    const melden = text => { try { if (typeof UI !== "undefined" && typeof UI.toast === "function") UI.toast(text, "warn"); } catch (e) { /* auch das Melden darf nicht werfen */ } };
    const handeln = () => {
      const a = s.aktion || {};
      try {
        if (a.art === "ueben") {
          if (s.skill && typeof o.ueben === "function") o.ueben(s.skill);
          else melden("Für diesen Schritt fehlt der Übungsweg.");
        } else if (a.art === "pruefung-oeffnen") {
          if (typeof o.pruefung === "function") o.pruefung();
          else melden("Die Prüfungsübersicht ist gerade nicht erreichbar.");
        } else if (a.art === "pruefung-starten") {
          if (typeof o.starten === "function") o.starten(a.pruefung);
          else melden("Der Prüfungstag ist gerade nicht erreichbar.");
        } else if (a.art === "postfach" || a.art === "training") {
          if (typeof o.ansicht === "function") o.ansicht(a.art);
          else melden("Die Ansicht ist gerade nicht erreichbar.");
        }
      } catch (e) { melden("Der nächste Schritt ließ sich nicht öffnen."); }
    };
    const chips = (s.chips || []).map(c => h("span", {class: "nst-chip" + (c.ton ? " " + c.ton : "")}, c.text));
    const zeilen = (s.zeilen || []).length
      ? h("dl", {class: "nst-zeilen"}, (s.zeilen || []).flatMap(z => [
          h("dt", {class: "nst-label"}, z.label),
          h("dd", {class: "nst-wert" + (z.ok ? " ok" : "")}, z.wert)]))
      : null;
    return h("section", {class: "nst-kachel bn-k akzent bn-s7", "data-art": s.art},
      h("header", {class: "nst-kopf"},
        h("span", {class: "bn-kicker"}, s.kicker || "Nächster Schritt"),
        chips.length ? h("span", {class: "nst-chips"}, chips) : null),
      h("h3", {class: "nst-titel"}, s.titel),
      s.lead ? h("p", {class: "nst-lead"}, s.lead) : null,
      s.nach ? h("p", {class: "nst-nach"}, s.nach) : null,
      zeilen,
      h("div", {class: "nst-fuss"},
        h("button", {type: "button", class: "knopf primaer nst-aktion", onclick: handeln},
          s.aktion ? s.aktion.text : "Weiter")));
  }

  return {schritt, kachel, empfehlungen, faelligeIds, schwacheIds, offeneFelder, pruefungStand, MAX_EMPFEHLUNGEN, SICHER_AB};
})();
