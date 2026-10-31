"use strict";
/* ---------- DIDAKTISCHE INVARIANTEN DER GENERIERTEN SUBTETZ-AUFGABEN (Runde 7, Owner W2) ----------
   Prüfgegenstand: Spiel.subnetz (src/spiel/subnetz.js, Owner W1), read-only.
   Verbindlich: docs/entwicklung/Entwurf – Runde 7 (Abteilung Subnetting).md § 2.1 (Form der
   Aufgabe), § 5 (Lernstufen-Matrix) und § 6 (11 Aufgabentypen). Die Matrix steht zusätzlich in
   docs/entwicklung/Subnetting – Lernstufen-Matrix.md.

   Geprüft wird an JEDER vorhandenen Art×Stufe, über gesäte Seeds:
     (1) Vertrag der 11 Typen: IDs, Titel, Fertigkeiten und Stufen genau wie § 6; STUFEN; VERSION.
     (2) Form: Pflichtfelder, frage ohne Füllwörter/Emoji/formelle Sie-Anrede, `lage` trägt alle
         Angaben der Frage (jede IPv4-Adresse und jeder Präfix aus `frage` steht in `lage`),
         `eingabe.art` aus § 2.1, `loesung`, `rechenweg` 3–6 Schritte, der letzte endet in
         `loesung.wert`, `erklaerung` nennt den Rechenweg in Worten, `visual` nur aus den
         Werkzeug-IDs.
     (3) Stufe: Zahlenraum nach § 5 (E /24–/28, AP1 /20–/30, AP2 /16–/31), `hinweis`-Regel
         (E immer, AP1 optional, AP2 nie), keine negativen Fangfragen auf E.
     (4) Antwort: genau eine richtige Option bei `auswahl`, `pruefen` ist formattolerant und nimmt
         nur die richtige Antwort an, `satz` liefert deterministisch eindeutige Aufgaben,
         `antwort` verbucht ohne Wurf (trockener Lauf, Zustand wird zurückgesetzt).
     (5) Abdeckung: Der Test prüft jede Art×Stufe, die W1 schon liefert, und NENNT die fehlenden
         Kombinationen im Protokoll. Er steigt nicht leer aus: mindestens 6 Kombinationen müssen
         vorhanden sein, sonst ist der Lauf rot.
   Kein Math.random, kein Date: alle Proben laufen über feste Seeds. LF-Zeilenenden, kein DOM. */
gruppe("Runde 7: Inhalte Subnetting-Aufgaben", () => {
  const S = Spiel.subnetz;
  const STUFEN = ["E", "AP1", "AP2"];
  /* § 6: genau diese 11 Typen, in dieser Reihenfolge, mit diesen Stufen und Fertigkeiten. */
  const ARTEN_SOLL = [
    {id: "netzid", titel: "Netz-ID bestimmen", skills: ["lab.subnetz"], stufen: ["E", "AP1", "AP2"], eingabe: "ip"},
    {id: "broadcast", titel: "Broadcast bestimmen", skills: ["lab.subnetz"], stufen: ["E", "AP1", "AP2"], eingabe: "ip"},
    {id: "hosts", titel: "Nutzbare Hosts", skills: ["lab.subnetz"], stufen: ["E", "AP1"], eingabe: "zahl"},
    {id: "maske", titel: "Maske ↔ Präfix", skills: ["lab.subnetz"], stufen: ["E", "AP1"], eingabe: "maske"},
    {id: "block", titel: "Blockgröße und Raster", skills: ["lab.subnetz"], stufen: ["E", "AP1", "AP2"], eingabe: "zahl"},
    {id: "subnetze", titel: "Netze schneiden/zählen", skills: ["lab.subnetz"], stufen: ["AP1", "AP2"], eingabe: "zahl"},
    {id: "vlsm", titel: "Adressplan-Schritt (VLSM)", skills: ["lab.subnetz"], stufen: ["AP1", "AP2"], eingabe: "auswahl"},
    {id: "zusammenfassen", titel: "Zusammenfassen (Route)", skills: ["lab.subnetz"], stufen: ["AP2"], eingabe: "auswahl"},
    {id: "vlan-port", titel: "VLAN am Port", skills: ["lab.vlan"], stufen: ["E", "AP1"], eingabe: "auswahl"},
    {id: "vlan-erreichbar", titel: "Gleiches VLAN?", skills: ["lab.vlan"], stufen: ["AP1", "AP2"], eingabe: "auswahl"},
    {id: "trunk", titel: "Trunk und Tagging", skills: ["lab.trunk"], stufen: ["AP2"], eingabe: "auswahl"},
  ];
  const PRAEFIX_SPANNE = {E: [24, 28], AP1: [20, 30], AP2: [16, 31]};
  const WERKZEUGE = ["bitlabor", "maskenleiste", "blocklineal", "rechner", "vlsm", "vlan", "maske"];
  const EINGABE_ARTEN = ["ip", "zahl", "maske", "auswahl"];
  const FUELLWORT = /\b(irgendwie|vielleicht|eventuell|sozusagen)\b/i;
  /* Formelle Anrede erkennen, ohne das Pronomen „Sie" (3. Person Singular) zu treffen:
     „Sie ist die letzte Adresse" ist korrekt, „Sie sind/sollten/Ihnen" ist die Sie-Form. */
  const FORMAL_SIE = /\b(Ihnen|Ihre|Ihren|Ihrem|Ihrer)\b|(^|[.!?]\s+)Sie\s+(sind|haben|können|müssen|sollten|dürfen|brauchen|werden|wollen)\b/;
  const FANGFRAGE = /nicht richtig|nicht korrekt|falsch ist|Welche .* nicht /i;
  const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
  const SEEDS = 12;
  const skillIds = new Set((DATEN.skills || []).map(s => s.id));
  const alleStrings = (wert, raus) => {
    if (typeof wert === "string") { raus.push(wert); return; }
    if (Array.isArray(wert)) { wert.forEach(w => alleStrings(w, raus)); return; }
    if (wert && typeof wert === "object") for (const w of Object.values(wert)) alleStrings(w, raus);
  };
  const texteVon = auf => {
    const raus = [];
    alleStrings([auf.titel, auf.frage, auf.lage, auf.eingabe, auf.loesung, auf.rechenweg, auf.erklaerung, auf.hinweis, auf.visual], raus);
    return raus;
  };
  /* Präfix-Tokens aus einem Text, ohne Portnamen wie „Fa0/8" mitzuzählen:
     gezählt werden CIDR-Adressen („192.168.1.70/26") und freistehende Präfixe („Präfix /26"). */
  const praefixTokens = text => {
    const s = String(text == null ? "" : text), raus = [];
    for (const m of s.matchAll(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/(\d{1,2})(?!\d)/g)) raus.push(Number(m[1]));
    for (const m of s.matchAll(/(?:^|[\s(=])\/(\d{1,2})(?!\d)/g)) raus.push(Number(m[1]));
    return raus;
  };
  /* Alle Präfixe "/p", die in den Aufgabenangaben vorkommen – Grundlage der Zahlenraum-Prüfung. */
  const praefixeVon = auf => {
    const raus = [];
    for (const t of [auf.frage, ...(auf.lage || []).map(z => z.wert), auf.loesung && auf.loesung.text]) raus.push(...praefixTokens(t));
    return raus;
  };
  const ipAdressen = text => [...String(text == null ? "" : text).matchAll(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g)].map(m => m[0]);
  /* Verfügbarkeit: eine Art×Stufe gilt als geliefert, wenn über 8 Seeds mindestens 3 Aufgaben entstehen. */
  const verfuegbarkeit = (art, stufe) => {
    let n = 0;
    for (let seed = 1; seed <= 8; seed++) {
      let a = null;
      try { a = S.aufgabe({art, niveau: stufe, seed}); } catch (e) { a = null; }
      if (a) n++;
    }
    return n;
  };
  /* Eine Aufgabe als falsche Antwort: Zahl + 1, fremde IP, fremder Präfix, sonst Platzhalter. */
  const falscheAntwort = (auf, richtig) => {
    const art = auf.eingabe && auf.eingabe.art;
    if (art === "zahl") { const n = Number(String(richtig).trim()); return String(Number.isFinite(n) ? n + 1 : 1); }
    if (art === "ip") return richtig === "0.0.0.0" ? "255.255.255.255" : "0.0.0.0";
    if (art === "maske") return richtig === "/1" ? "/2" : "/1";
    return "___falsch___";
  };
  const KAPSEL_FELDER = ["_st", "_einst", "_lz", "_trocken"];

  pruefe("Vertrag: die 11 Aufgabentypen, ihre Stufen, Fertigkeiten und die Konstante VERSION", () => {
    erwarte.wahr(!!S && typeof S === "object", "Spiel.subnetz fehlt");
    erwarte.gleich(S.VERSION, 1, "VERSION");
    erwarte.gleich(S.STUFEN, STUFEN, "STUFEN");
    erwarte.gleich(S.ARTEN.map(a => a.id), ARTEN_SOLL.map(a => a.id), "ARTEN in der Reihenfolge von § 6");
    for (const [i, soll] of ARTEN_SOLL.entries()) {
      const ist = S.ARTEN[i];
      erwarte.gleich(ist.stufen, soll.stufen, `${soll.id}: Stufen laut § 6`);
      erwarte.gleich(ist.skills, soll.skills, `${soll.id}: Fertigkeit laut § 6`);
      erwarte.wahr(ist.skills.every(s => skillIds.has(s)), `${soll.id}: Fertigkeit existiert nicht in DATEN.skills`);
      erwarte.wahr(typeof ist.titel === "string" && ist.titel.trim().length >= 5, `${soll.id}: Titel`);
    }
    for (const f of ["aufgabe", "satz", "pruefen", "antwort", "fortschritt", "modulSetzen", "zuruecksetzen",
      "rechnen", "maskeZuPraefix", "praefixZuMaske", "gleichesNetz", "plan", "zusammenfassen"]) {
      erwarte.gleich(typeof S[f], "function", `API ${f} fehlt`);
    }
  });

  pruefe("Form und Sprache jeder vorhandenen Aufgabe: Pflichtfelder, lage vollständig, keine Füllwörter", () => {
    const fehler = [];
    let geprueft = 0;
    for (const soll of ARTEN_SOLL) {
      for (const stufe of soll.stufen) {
        for (let seed = 1; seed <= SEEDS; seed++) {
          const auf = S.aufgabe({art: soll.id, niveau: stufe, seed});
          if (!auf) continue;
          geprueft++;
          const name = `${soll.id}/${stufe}/${seed}`;
          if (auf.art !== soll.id) fehler.push(`${name}: art ${auf.art}`);
          if (auf.niveau !== stufe) fehler.push(`${name}: niveau ${auf.niveau}`);
          if (!skillIds.has(auf.skill) || !soll.skills.includes(auf.skill)) fehler.push(`${name}: skill ${auf.skill}`);
          if (typeof auf.id !== "string" || !auf.id.includes(soll.id) || !auf.id.includes(stufe)) fehler.push(`${name}: id ${auf.id}`);
          if (typeof auf.titel !== "string" || !auf.titel.trim()) fehler.push(`${name}: titel fehlt`);
          if (typeof auf.frage !== "string" || !auf.frage.trim()) fehler.push(`${name}: frage fehlt`);
          else if (auf.frage.length > 220) fehler.push(`${name}: frage ${auf.frage.length} Zeichen (max. 220)`);
          if (typeof auf.quelle !== "string" || !auf.quelle.trim()) fehler.push(`${name}: quelle fehlt`);
          /* `lage` trägt ALLE Angaben (§ 5): jede Adresse und jeder Präfix aus der Frage steht dort. */
          if (!Array.isArray(auf.lage) || auf.lage.length < 1 || auf.lage.length > 4) fehler.push(`${name}: lage ${auf.lage && auf.lage.length} Zeilen (1–4)`);
          else {
            const lageText = auf.lage.map(z => `${z && z.label} ${z && z.wert}`).join(" ");
            for (const z of auf.lage) {
              if (!z || typeof z.label !== "string" || !z.label.trim()) fehler.push(`${name}: lage-Zeile ohne label`);
              if (!z || typeof z.wert !== "string" || !z.wert.trim()) fehler.push(`${name}: lage-Zeile ohne wert`);
            }
            for (const ip of ipAdressen(auf.frage)) if (!lageText.includes(ip)) fehler.push(`${name}: Adresse ${ip} aus der Frage fehlt in lage`);
            for (const p of praefixTokens(auf.frage)) if (!lageText.includes("/" + p)) fehler.push(`${name}: Präfix /${p} aus der Frage fehlt in lage`);
          }
          /* Keine verbotenen Formulierungen, keine Emoji, keine formelle Anrede. */
          for (const t of texteVon(auf)) {
            if (FUELLWORT.test(t)) fehler.push(`${name}: Füllwort in „${t.slice(0, 40)}“`);
            if (FORMAL_SIE.test(t)) fehler.push(`${name}: formelle Sie-Anrede in „${t.slice(0, 40)}“`);
            if (EMOJI.test(t)) fehler.push(`${name}: Emoji in „${t.slice(0, 40)}“`);
          }
          if (stufe === "E" && FANGFRAGE.test(auf.frage)) fehler.push(`${name}: negative Fangfrage auf E: „${auf.frage}“`);
          /* Eingabe (§ 2.1), Lösung und Rechenweg. */
          const ein = auf.eingabe;
          if (!ein || typeof ein !== "object" || !EINGABE_ARTEN.includes(ein.art)) fehler.push(`${name}: eingabe.art fehlt oder ist ungültig (${ein && ein.art})`);
          else if (ein.art !== soll.eingabe) fehler.push(`${name}: eingabe.art ${ein.art}, Vertrag sagt ${soll.eingabe}`);
          if (!auf.loesung || typeof auf.loesung !== "object") fehler.push(`${name}: loesung fehlt`);
          else {
            if (auf.loesung.wert == null || String(auf.loesung.wert).trim() === "") fehler.push(`${name}: loesung.wert fehlt`);
            if (auf.loesung.text == null || String(auf.loesung.text).trim() === "") fehler.push(`${name}: loesung.text fehlt`);
          }
          if (!Array.isArray(auf.rechenweg) || auf.rechenweg.length < 3 || auf.rechenweg.length > 6) fehler.push(`${name}: rechenweg ${auf.rechenweg && auf.rechenweg.length} Schritte (3–6)`);
          else {
            const schritte = auf.rechenweg;
            for (const [j, z] of schritte.entries()) {
              if (!z || z.n !== j + 1) fehler.push(`${name}: Schritt ${j + 1} ohne laufende Nummer`);
              if (!z || typeof z.titel !== "string" || !z.titel.trim()) fehler.push(`${name}: Schritt ${j + 1} ohne titel`);
              if (!z || typeof z.text !== "string" || z.text.trim().length < 10) fehler.push(`${name}: Schritt ${j + 1} ohne Text`);
              if (!z || z.ergebnis == null || String(z.ergebnis).trim() === "") fehler.push(`${name}: Schritt ${j + 1} ohne Ergebnis`);
            }
            /* Der Rechenweg RECHNET nach: er endet in der Lösung (§ 2.1). */
            const letzter = schritte[schritte.length - 1];
            const sollWert = String(auf.loesung && auf.loesung.wert);
            if (letzter && String(letzter.ergebnis) !== sollWert) fehler.push(`${name}: Rechenweg endet in „${letzter.ergebnis}“, Lösung ist „${sollWert}“`);
          }
          /* Die Erklärung nennt den Rechenweg in Worten (§ 5): Rechenaufgaben nennen Zahlen,
             VLAN-Aufgaben benennen das VLAN. Beides ist eigenständig, nicht nur ein Stichwort. */
          if (typeof auf.erklaerung !== "string" || auf.erklaerung.trim().length < 40) fehler.push(`${name}: erklaerung zu knapp`);
          else if (["netzid", "broadcast", "hosts", "maske", "block", "subnetze", "vlsm", "zusammenfassen"].includes(soll.id) && !/\d/.test(auf.erklaerung)) fehler.push(`${name}: erklaerung nennt keine Zahlen (kein Rechenweg in Worten)`);
          else if (["vlan-port", "vlan-erreichbar", "trunk"].includes(soll.id) && !/VLAN/i.test(auf.erklaerung)) fehler.push(`${name}: erklaerung nennt das VLAN nicht`);
          /* Hilfen je Stufe (§ 5): E immer, AP1 optional, AP2 nie. */
          if (typeof auf.hinweis !== "string") fehler.push(`${name}: hinweis ist kein String`);
          else if (stufe === "E" && !auf.hinweis.trim()) fehler.push(`${name}: E-Aufgabe ohne hinweis`);
          else if (stufe === "AP2" && auf.hinweis.trim() !== "") fehler.push(`${name}: AP2-Aufgabe mit hinweis`);
          /* Visuelle Hilfe: keine erfundene Werkzeug-ID. */
          if (auf.visual != null) {
            if (!auf.visual || !WERKZEUGE.includes(auf.visual.art)) fehler.push(`${name}: visual.art ${auf.visual && auf.visual.art} ungültig`);
            else if (!auf.visual.preset || typeof auf.visual.preset !== "object" || Array.isArray(auf.visual.preset)) fehler.push(`${name}: visual.preset fehlt`);
          }
        }
      }
    }
    console.log(`Subnetz-Inhalte · Form/Sprache geprüft → ${geprueft} Aufgaben über alle vorhandenen Art×Stufen`);
    erwarte.wahr(geprueft >= 20, `nur ${geprueft} Aufgaben geprüft – der Motor liefert zu wenig`);
    erwarte.gleich(fehler.slice(0, 12), [], "Form-/Sprachfehler der generierten Aufgaben");
  });

  pruefe("Stufe: Zahlenraum nach § 5 (E /24–/28, AP1 /20–/30, AP2 /16–/31), Hilfen folgen der Stufe", () => {
    const fehler = [];
    let geprueft = 0;
    for (const soll of ARTEN_SOLL) {
      for (const stufe of soll.stufen) {
        const [min, max] = PRAEFIX_SPANNE[stufe];
        for (let seed = 1; seed <= SEEDS; seed++) {
          const auf = S.aufgabe({art: soll.id, niveau: stufe, seed});
          if (!auf) continue;
          geprueft++;
          const name = `${soll.id}/${stufe}/${seed}`;
          for (const p of praefixeVon(auf)) {
            if (p < min || p > max) fehler.push(`${name}: Präfix /${p} außerhalb /${min}–/${max} (Stufe ${stufe})`);
          }
          /* E-Aufgaben bleiben ausschließlich im letzten Oktett: keine /30- oder /31-Fälle vor AP2. */
          if (stufe === "E") {
            const text = [auf.frage, ...(auf.lage || []).map(z => z.wert), auf.erklaerung].join(" ");
            if (/\/30\b|\/31\b/.test(text)) fehler.push(`${name}: E-Aufgabe nennt /30 oder /31 (§ 5)`);
          }
          if (stufe === "AP2" && typeof auf.hinweis === "string" && auf.hinweis.trim()) fehler.push(`${name}: AP2-Aufgabe mit Hilfe`);
          if (stufe !== "AP2" && typeof auf.hinweis !== "string") fehler.push(`${name}: Hilfe ist kein String`);
        }
      }
    }
    erwarte.wahr(geprueft >= 20, `nur ${geprueft} Aufgaben auf Zahlenraum geprüft`);
    erwarte.gleich(fehler.slice(0, 12), [], "Verstöße gegen die Lernstufen-Matrix § 5");
  });

  pruefe("Antwort: genau eine richtige Option, pruefen nimmt nur die richtige Antwort an", () => {
    const fehler = [];
    let geprueft = 0, auswahl = 0;
    for (const soll of ARTEN_SOLL) {
      for (const stufe of soll.stufen) {
        for (let seed = 1; seed <= SEEDS; seed++) {
          const auf = S.aufgabe({art: soll.id, niveau: stufe, seed});
          if (!auf || !auf.eingabe || !auf.loesung) continue;
          geprueft++;
          const name = `${soll.id}/${stufe}/${seed}`;
          const pruef = (antwort) => { try { return S.pruefen(auf, antwort); } catch (e) { return {richtig: null, fehler: String(e && e.message || e)}; } };
          if (auf.eingabe.art === "auswahl") {
            auswahl++;
            const optionen = auf.eingabe.optionen;
            if (!Array.isArray(optionen) || optionen.length < 3 || optionen.length > 4) { fehler.push(`${name}: ${optionen && optionen.length} Optionen (3–4)`); continue; }
            const texte = optionen.map(o => String(o && o.text == null ? "" : o.text).trim());
            if (texte.some(t => !t)) fehler.push(`${name}: leere Option`);
            if (new Set(texte).size !== texte.length) fehler.push(`${name}: doppelte Option`);
            const sollText = String(auf.loesung.text == null ? auf.loesung.wert : auf.loesung.text).trim();
            const treffer = texte.filter(t => t === sollText || t === String(auf.loesung.wert));
            if (treffer.length !== 1) fehler.push(`${name}: ${treffer.length} Optionen passen zur Lösung (genau eine nötig)`);
            const richtigIndex = texte.findIndex(t => t === sollText || t === String(auf.loesung.wert));
            const r = pruef(richtigIndex);
            if (!r || r.richtig !== true) fehler.push(`${name}: pruefen hält die richtige Option ${richtigIndex} nicht für richtig`);
            for (let i = 0; i < texte.length; i++) {
              if (i === richtigIndex) continue;
              const f = pruef(i);
              if (!f || f.richtig !== false) fehler.push(`${name}: Option ${i} („${texte[i]}“) gilt auch als richtig`);
            }
          } else {
            const r = pruef(auf.loesung.wert);
            if (!r || r.richtig !== true) fehler.push(`${name}: pruefen hält die Lösung „${auf.loesung.wert}“ nicht für richtig`);
            const falsch = falscheAntwort(auf, auf.loesung.wert);
            const f = pruef(falsch);
            if (!f || f.richtig !== false) fehler.push(`${name}: falsche Antwort „${falsch}“ gilt als richtig`);
            if (f && typeof f.soll !== "string") fehler.push(`${name}: pruefen liefert kein soll`);
          }
        }
      }
    }
    console.log(`Subnetz-Inhalte · Antworten geprüft → ${geprueft} Aufgaben, davon ${auswahl} mit Auswahl`);
    erwarte.wahr(geprueft >= 20, `nur ${geprueft} Antworten geprüft`);
    erwarte.gleich(fehler.slice(0, 12), [], "Antwort-/Distraktoren-Fehler");
  });

  pruefe("Determinismus: gleicher Seed ⇒ gleiche Aufgabe, verschiedene Seeds ⇒ andere Aufgabe", () => {
    const fehler = [];
    let geprueft = 0;
    for (const soll of ARTEN_SOLL) {
      for (const stufe of soll.stufen) {
        const a = S.aufgabe({art: soll.id, niveau: stufe, seed: 7});
        if (!a) continue;
        geprueft++;
        const b = S.aufgabe({art: soll.id, niveau: stufe, seed: 7});
        if (JSON.stringify(a) !== JSON.stringify(b)) fehler.push(`${soll.id}/${stufe}: zweimal seed 7 ergibt zwei Aufgaben`);
        const c = S.aufgabe({art: soll.id, niveau: stufe, seed: 8});
        if (c && JSON.stringify(a) === JSON.stringify(c)) fehler.push(`${soll.id}/${stufe}: Seed 7 und 8 ergeben dieselbe Aufgabe`);
      }
    }
    erwarte.wahr(geprueft >= 6, `nur ${geprueft} Art×Stufen deterministisch geprüft`);
    erwarte.gleich(fehler.slice(0, 8), [], "Determinismus");
  });

  pruefe("Satz und trockene Verbuchung: satz liefert eindeutige Aufgaben, antwort wirft nicht", () => {
    const fehler = [];
    const verfuegbar = [];
    for (const soll of ARTEN_SOLL) for (const stufe of soll.stufen) if (verfuegbarkeit(soll.id, stufe) >= 3) verfuegbar.push({art: soll.id, stufe});
    erwarte.wahr(verfuegbar.length >= 6, `nur ${verfuegbar.length} vorhandene Art×Stufen – der Motor ist unvollständig`);
    let saetze = 0;
    for (const stufe of STUFEN) {
      const arten = verfuegbar.filter(v => v.stufe === stufe).map(v => v.art);
      if (!arten.length) continue;
      const s1 = S.satz({arten, niveau: stufe, anzahl: 4, seed: 11});
      const s2 = S.satz({arten, niveau: stufe, anzahl: 4, seed: 11});
      saetze++;
      if (!Array.isArray(s1) || s1.length !== 4) { fehler.push(`satz(${stufe}): ${s1 && s1.length} statt 4 Aufgaben`); continue; }
      if (JSON.stringify(s1) !== JSON.stringify(s2)) fehler.push(`satz(${stufe}): nicht deterministisch`);
      const ids = s1.map(x => x.id);
      if (new Set(ids).size !== ids.length) fehler.push(`satz(${stufe}): doppelte IDs`);
      for (const x of s1) {
        if (x.niveau !== stufe) fehler.push(`satz(${stufe}): Aufgabe mit Niveau ${x.niveau}`);
        if (!arten.includes(x.art)) fehler.push(`satz(${stufe}): Art ${x.art} war nicht bestellt`);
      }
    }
    erwarte.wahr(saetze >= 1, "keine Stufe mit bestellbarem Satz");
    /* Trockene Verbuchung: der Zustand wird gespeichert und danach vollständig zurückgesetzt. */
    const alt = {};
    for (const f of KAPSEL_FELDER) alt[f] = Spiel[f];
    try {
      Spiel._trocken = true;
      Spiel._st = Spiel.leererStand();
      Spiel._lz = {};
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      const auf = S.aufgabe({art: verfuegbar[0].art, niveau: verfuegbar[0].stufe, seed: 3});
      const r = S.antwort(auf, true);
      erwarte.wahr(!!r && typeof r === "object", "antwort liefert kein Objekt");
      erwarte.wahr(!!r.fortschritt && typeof r.fortschritt === "object", "antwort liefert keinen Fortschritt");
      erwarte.wahr(Array.isArray(r.neuereModule), "antwort liefert keine neuereModule-Liste");
      erwarte.wahr(!("fehler" in r), "antwort meldet einen Fehler");
    } finally {
      for (const f of KAPSEL_FELDER) Spiel[f] = alt[f];
    }
    erwarte.gleich(fehler.slice(0, 8), [], "satz/antwort");
  });

  pruefe("Abdeckung: jede Art×Stufe aus § 6 wird geprüft oder ausdrücklich als fehlend genannt", () => {
    const fehlend = [], vorhanden = [];
    for (const soll of ARTEN_SOLL) {
      for (const stufe of soll.stufen) {
        const n = verfuegbarkeit(soll.id, stufe);
        (n >= 3 ? vorhanden : fehlend).push(`${soll.id}/${stufe}` + (n >= 3 ? "" : ` (${n}/8 Seeds)`));
      }
    }
    console.log(`Subnetz-Inhalte · Abdeckung → vorhanden: ${vorhanden.join(", ")}`);
    if (fehlend.length) console.log(`Subnetz-Inhalte · noch nicht geliefert (W1 in Arbeit): ${fehlend.join(", ")}`);
    else console.log("Subnetz-Inhalte · Abdeckung vollständig: alle 11 Typen auf allen Stufen aus § 6.");
    erwarte.gleich([...new Set(vorhanden)].length, vorhanden.length, "doppelte Kombination in der Abdeckung");
    erwarte.wahr(vorhanden.length >= 6, `nur ${vorhanden.length} Art×Stufen vorhanden`);
    /* Jeder vorhandene Typ liefert auf JEDER seiner Stufen Aufgaben – keine stille Lücke im Motor. */
    const fehler = [];
    for (const soll of ARTEN_SOLL) {
      const geliefert = vorhanden.filter(v => v.startsWith(soll.id + "/"));
      if (!geliefert.length) continue;
      if (geliefert.length !== soll.stufen.length) fehler.push(`${soll.id}: nur ${geliefert.length} von ${soll.stufen.length} Stufen`);
    }
    erwarte.gleich(fehler, [], "Typen mit Lücken zwischen ihren Stufen");
  });
});
