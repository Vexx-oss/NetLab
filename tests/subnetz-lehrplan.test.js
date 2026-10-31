"use strict";
/* ---------- Prüfung des Lehrplans der Abteilung Subnetting (Runde 7, Owner W2) ----------
   Datenquelle: src/daten/subnetz-lehrplan.js → DATEN.subnetzLehrplan.
   Verbindlicher Vertrag: docs/entwicklung/Entwurf – Runde 7 (Abteilung Subnetting).md § 2.2
   (Form und Reihenfolge der 8 Module), § 5 (Lernstufen-Matrix) und § 6 (11 Aufgabentypen).

   Geprüft wird am Datenbestand, nicht am Augenschein:
     (1) Form: version, Formelsammlung, genau 8 Module in fester Reihenfolge (bits, maske, block,
         netzid, schneiden, vlsm, vlan, pruefung), keine fremden Felder, keine leeren Texte.
     (2) Sprache und Stufe: Deutsch, Du-Form, keine Emoji, keine Füllwörter, keine formelle
         Sie-Anrede; Stufenfolge E → E → E → E → AP1 → AP1 → AP1 → AP2; E-Module reden nicht
         über /30 oder /31 (das ist AP2-Stoff, § 5) – einzige Ausnahme ist die ausdrückliche
         RFC-3021-Ausnahme in Modul 4 (Didaktik-Review S4), die ein Satz mit „RFC 3021" markiert.
     (3) Inhalt: kern mit 3–6 Sätzen, GENAU ein merksatz, mindestens ein geführtes Beispiel, dessen
         letzter Schritt im ausgerechneten Ergebnis endet; fachliche Pflichtaussagen je Modul
         (Blockgröße 2 hoch (32 minus Präfix), VLAN gleich Broadcast-Domäne, /30-/31-Regel, VLSM
         vom größten zum kleinsten).
     (4) Verweise: wiki aus lab.subnetz/lab.vlan und als Seite vorhanden, Werkzeug aus § 7, Training
         aus DATEN.trainings und mit derselben Fertigkeit wie der Wiki-Verweis; visuell-Art aus § 7
         und je Modul passend zur Tabelle in § 2.2.
     (5) Formelsammlung: Präfix-/Masken-/Host-Tabelle wird ZELLENWEISE nachgerechnet (Maske,
         Blockgröße, Hosts, /31- und /32-Ausnahme), Blockgrößen-Tabelle gegen das Maskenoktett
         geprüft, Rechenweg mit genau 5 Schritten, VLAN-Merkblatt und Fehlerfallen vorhanden.
   Keine Abschwächung: jede Zusicherung ist echt. LF-Zeilenenden, kein DOM. */
gruppe("Runde 7: Lehrplan Subnetting", () => {
  const LP = DATEN.subnetzLehrplan;
  const MODUL_IDS = ["bits", "maske", "block", "netzid", "schneiden", "vlsm", "vlan", "pruefung"];
  const MODUL_TITEL = ["Bits und Oktette", "Netzanteil und Hostanteil", "Blockgröße",
    "Netz-ID, Broadcast, Hosts", "Netze schneiden", "Adressplan (VLSM)", "VLAN und Subnetz", "Prüfungsfälle"];
  const MODUL_STUFEN = ["E", "E", "E", "E", "AP1", "AP1", "AP1", "AP2"];
  const STUFEN = ["E", "AP1", "AP2"];
  /* § 6: die 11 Aufgabentypen mit ihren zugelassenen Stufen. */
  const ARTEN = {
    netzid: ["E", "AP1", "AP2"], broadcast: ["E", "AP1", "AP2"], hosts: ["E", "AP1"],
    maske: ["E", "AP1"], block: ["E", "AP1", "AP2"], subnetze: ["AP1", "AP2"],
    vlsm: ["AP1", "AP2"], zusammenfassen: ["AP2"], "vlan-port": ["E", "AP1"],
    "vlan-erreichbar": ["AP1", "AP2"], trunk: ["AP2"],
  };
  /* § 7: die sechs Werkzeug-IDs. */
  const WERKZEUGE = ["bitlabor", "maskenleiste", "blocklineal", "rechner", "vlsm", "vlan"];
  /* § 2.2: Wiki-Verweis je Modul ist entweder lab.subnetz oder lab.vlan. */
  const WIKI = ["lab.subnetz", "lab.vlan"];
  /* § 2.2, Spalte „Visuell": das Hauptwerkzeug je Modul (Modul 8: VLAN, Blocklineal im Beispiel). */
  const VIS_MAP = {bits: "bitlabor", maske: "maskenleiste", block: "blocklineal", netzid: "blocklineal",
    schneiden: "blocklineal", vlsm: "rechner", vlan: "vlan", pruefung: "vlan"};

  /* ---------- unabhängige Rechenhelfer (eigene Bit-Arithmetik, nicht aus src/kern/netz.js) ---------- */
  const maskeAus = p => {
    let n = 0;
    for (let i = 0; i < 32; i++) n = n * 2 + (i < p ? 1 : 0);
    return [Math.floor(n / 16777216) % 256, Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join(".");
  };
  const blockAus = p => Math.pow(2, 32 - p);
  const hostsAus = p => p === 32 ? 1 : p === 31 ? 2 : blockAus(p) - 2;   /* RFC 3021 (/31); /32 = Einzeladresse */
  const istIPv4 = s => /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(String(s)) &&
    String(s).split(".").every(t => Number(t) <= 255);

  /* ---------- Text- und Form-Helfer ---------- */
  const saetze = t => String(t || "").replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/).filter(s => s.length > 1);
  const textBlatt = (wert, pfad, raus) => {
    if (typeof wert === "string") { if (!wert.trim()) raus.push(`${pfad}: leerer Text`); return; }
    if (Array.isArray(wert)) { wert.forEach((w, i) => textBlatt(w, `${pfad}[${i}]`, raus)); return; }
    if (wert && typeof wert === "object") for (const [k, w] of Object.entries(wert)) textBlatt(w, `${pfad}.${k}`, raus);
  };
  const alleTexte = [];
  const alleStrings = (wert, raus) => {
    if (typeof wert === "string") { raus.push(wert); return; }
    if (Array.isArray(wert)) { wert.forEach(w => alleStrings(w, raus)); return; }
    if (wert && typeof wert === "object") for (const w of Object.values(wert)) alleStrings(w, raus);
  };
  const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
  const FUELLWORT = /\b(irgendwie|vielleicht|eventuell|sozusagen)\b/i;
  const FORMAL_SIE = /(^|[.!?]\s+)Sie\s/;
  const modulText = m => [m.titel, m.kicker, m.lead, ...m.kern,
    ...(m.beispiel || []).flatMap(b => [b.titel, b.aufgabe, ...b.schritte.flatMap(s => [s.text, s.ergebnis]), b.ergebnis])].join("\n");
  const modulVon = id => (LP.module || []).find(m => m.id === id);

  pruefe("Lehrplan: version, Formelsammlung und genau 8 Module in der festen Reihenfolge", () => {
    erwarte.wahr(!!LP && typeof LP === "object", "DATEN.subnetzLehrplan fehlt");
    erwarte.gleich(LP.version, 1, "version");
    erwarte.gleich(Object.keys(LP).sort(), ["formelsammlung", "module", "version"], "nur die drei Vertragsfelder");
    erwarte.wahr(Array.isArray(LP.formelsammlung), "formelsammlung ist eine Liste");
    erwarte.wahr(Array.isArray(LP.module), "module ist eine Liste");
    erwarte.gleich(LP.module.length, 8, "genau 8 Module");
    erwarte.gleich(LP.module.map(m => m.id), MODUL_IDS, "Modul-IDs in fester Reihenfolge (§ 2.2)");
    erwarte.gleich(LP.module.map(m => m.nr), [1, 2, 3, 4, 5, 6, 7, 8], "Nummern 1 bis 8");
    erwarte.gleich(LP.module.map(m => m.titel), MODUL_TITEL, "Titel laut § 2.2");
    erwarte.gleich(LP.module.map(m => m.stufe), MODUL_STUFEN, "Stufenfolge E → AP1 → AP2");
    /* Jedes Modul trägt genau die Vertragsfelder – kein stilles Zusatzfeld, das W3 nicht kennt. */
    const FELDER = ["beispiel", "dauerMin", "id", "kern", "kicker", "lead", "merksatz", "nr", "pruefung",
      "quelle", "stufe", "titel", "uebung", "verweise", "visuell"];
    for (const m of LP.module) erwarte.gleich(Object.keys(m).sort(), FELDER, `${m.id}: Felder`);
  });

  pruefe("Lehrplan: keine leeren Texte, keine Emoji, keine Füllwörter und keine formelle Sie-Anrede", () => {
    const leer = [];
    textBlatt({formelsammlung: LP.formelsammlung, module: LP.module}, "lehrplan", leer);
    erwarte.gleich(leer.slice(0, 8), [], "leere Texte");
    alleStrings({formelsammlung: LP.formelsammlung, module: LP.module}, alleTexte);
    const emoji = alleTexte.filter(t => EMOJI.test(t));
    erwarte.gleich(emoji.slice(0, 5), [], "Emoji im Lehrplan");
    const fuell = alleTexte.filter(t => FUELLWORT.test(t));
    erwarte.gleich(fuell.slice(0, 5), [], "Füllwörter im Lehrplan");
    const sie = alleTexte.filter(t => FORMAL_SIE.test(t));
    erwarte.gleich(sie.slice(0, 5), [], "formelle Sie-Anrede (Lehrplan ist in Du-Form)");
    /* Du-Form: jedes Modul redet die Lernenden direkt an. */
    for (const m of LP.module) erwarte.passt(modulText(m), /\b(du|dein|deine|deinem|dich)\b/i, `${m.id}: Du-Form`);
    /* Abkürzungen werden beim ersten Gebrauch aufgelöst (§ 5 Wortregeln). */
    const gesamt = alleTexte.join(" ");
    erwarte.enthaelt(gesamt, "Variable Length Subnet Masking", "VLSM nicht aufgelöst");
    erwarte.enthaelt(gesamt, "Virtual Local Area Network", "VLAN nicht aufgelöst");
    erwarte.enthaelt(gesamt, "Classless Inter-Domain Routing", "CIDR nicht aufgelöst");
  });

  pruefe("Lehrplan: kern hat 3–6 Sätze, genau ein merksatz, Längen bleiben in der Fläche", () => {
    const fehler = [], merksatzFehler = [];
    for (const m of LP.module) {
      for (const feld of ["kicker", "lead", "titel"]) {
        if (typeof m[feld] !== "string" || !m[feld].trim()) fehler.push(`${m.id}: ${feld} fehlt`);
      }
      if (m.titel.length > 70) fehler.push(`${m.id}: titel ${m.titel.length} Zeichen`);
      if (m.kicker.length > 60) fehler.push(`${m.id}: kicker ${m.kicker.length} Zeichen`);
      if (m.lead.length < 40 || m.lead.length > 240) fehler.push(`${m.id}: lead ${m.lead.length} Zeichen`);
      const kern = Array.isArray(m.kern) ? m.kern : [];
      if (kern.length < 3 || kern.length > 6) fehler.push(`${m.id}: kern mit ${kern.length} Einträgen (3–6 Sätze)`);
      for (const s of kern) {
        if (typeof s !== "string" || !s.trim()) { fehler.push(`${m.id}: leerer Kern-Satz`); continue; }
        if (saetze(s).length !== 1) fehler.push(`${m.id}: Kern-Eintrag mit ${saetze(s).length} Sätzen: „${s.slice(0, 40)}…“`);
        if (s.length < 30 || s.length > 240) fehler.push(`${m.id}: Kern-Satz ${s.length} Zeichen`);
      }
      /* GENAU ein merksatz: ein nicht-leerer String, kein zweites Merksatz-Feld, kein Duplikat. */
      if (typeof m.merksatz !== "string" || !m.merksatz.trim()) merksatzFehler.push(`${m.id}: merksatz fehlt oder ist kein String`);
      else {
        if (m.merksatz.length < 20 || m.merksatz.length > 200) merksatzFehler.push(`${m.id}: merksatz ${m.merksatz.length} Zeichen`);
        if (kern.includes(m.merksatz)) merksatzFehler.push(`${m.id}: merksatz ist nur ein Kern-Satz`);
      }
    }
    erwarte.gleich(fehler.slice(0, 8), [], "Form/Längen der Modulköpfe");
    erwarte.gleich(merksatzFehler, [], "merksatz: genau einer je Modul, nicht leer");
    const merksatzZahl = LP.module.filter(m => typeof m.merksatz === "string" && m.merksatz.trim()).length;
    erwarte.gleich(merksatzZahl, 8, "alle 8 Module haben ihren Merksatz");
  });

  pruefe("Lehrplan: jedes Beispiel endet mit seinem ausgerechneten Ergebnis in der letzten Zeile", () => {
    const fehler = [];
    for (const m of LP.module) {
      const bs = Array.isArray(m.beispiel) ? m.beispiel : [];
      if (bs.length < 1) { fehler.push(`${m.id}: kein geführtes Beispiel`); continue; }
      for (const [i, b] of bs.entries()) {
        const name = `${m.id}/${i + 1}`;
        for (const k of ["titel", "aufgabe", "ergebnis"]) if (typeof b[k] !== "string" || !b[k].trim()) fehler.push(`${name}: ${k} fehlt`);
        if (b.titel.length > 80) fehler.push(`${name}: titel ${b.titel.length} Zeichen`);
        if (b.aufgabe.length < 10 || b.aufgabe.length > 240) fehler.push(`${name}: aufgabe ${b.aufgabe.length} Zeichen`);
        const s = Array.isArray(b.schritte) ? b.schritte : [];
        if (s.length < 2 || s.length > 6) fehler.push(`${name}: ${s.length} Schritte (2–6)`);
        for (const [j, z] of s.entries()) {
          if (typeof z.text !== "string" || z.text.trim().length < 10) fehler.push(`${name}: Schritt ${j + 1} ohne Text`);
          if (typeof z.ergebnis !== "string" || !z.ergebnis.trim()) fehler.push(`${name}: Schritt ${j + 1} ohne Ergebnis`);
          for (const k of Object.keys(z)) if (!["text", "ergebnis"].includes(k)) fehler.push(`${name}: Schritt ${j + 1} hat Feld ${k}`);
        }
        /* Der letzte Schritt RECHNET nach: sein Ergebnis ist das Ergebnis des Beispiels. */
        const letzter = s[s.length - 1];
        if (letzter && letzter.ergebnis !== b.ergebnis) fehler.push(`${name}: letzter Schritt endet in „${letzter.ergebnis}“, Beispiel-Ergebnis ist „${b.ergebnis}“`);
        /* Ein ausgerechnetes Ergebnis enthält immer eine Ziffer (Zahl, Adresse, Präfix). */
        if (!/\d/.test(String(b.ergebnis))) fehler.push(`${name}: Ergebnis „${b.ergebnis}“ sieht nicht ausgerechnet aus`);
      }
    }
    erwarte.gleich(fehler.slice(0, 8), [], "Beispiel-Schritte enden nicht im Ergebnis");
  });

  pruefe("Lehrplan: visuell zeigt je Modul das Werkzeug aus § 2.2, preset ist eine gültige Optionsliste", () => {
    const fehler = [];
    for (const m of LP.module) {
      const v = m.visuell;
      if (!v || typeof v !== "object") { fehler.push(`${m.id}: visuell fehlt`); continue; }
      erwarte.gleich(Object.keys(v).sort(), ["art", "preset"], `${m.id}: visuell-Felder`);
      if (!WERKZEUGE.includes(v.art)) { fehler.push(`${m.id}: visuell.art ${v.art} ist kein Werkzeug aus § 7`); continue; }
      if (v.art !== VIS_MAP[m.id]) fehler.push(`${m.id}: visuell.art ${v.art}, erwartet ${VIS_MAP[m.id]} (§ 2.2)`);
      if (!v.preset || typeof v.preset !== "object" || Array.isArray(v.preset) || Object.keys(v.preset).length === 0) {
        fehler.push(`${m.id}: visuell.preset fehlt`); continue;
      }
      for (const k of Object.keys(v.preset)) if (!["ip", "praefix", "niveau", "kompakt"].includes(k)) fehler.push(`${m.id}: preset-Feld ${k} (§ 2.4)`);
      if (v.preset.ip !== undefined && !istIPv4(v.preset.ip)) fehler.push(`${m.id}: preset.ip „${v.preset.ip}“ ist keine IPv4-Adresse`);
      if (v.preset.praefix !== undefined && !(Number.isInteger(v.preset.praefix) && v.preset.praefix >= 0 && v.preset.praefix <= 32)) fehler.push(`${m.id}: preset.praefix ${v.preset.praefix}`);
      if (v.preset.niveau !== undefined && !STUFEN.includes(v.preset.niveau)) fehler.push(`${m.id}: preset.niveau ${v.preset.niveau}`);
      if (v.art === "vlan" && v.preset.niveau === undefined) fehler.push(`${m.id}: VLAN-Werkzeug ohne niveau`);
    }
    erwarte.gleich(fehler.slice(0, 8), [], "visuell-Referenzen");
  });

  pruefe("Lehrplan: uebung und pruefung nennen nur Arten aus § 6, die ihre Stufe wirklich haben", () => {
    const fehler = [];
    for (const m of LP.module) {
      for (const feld of ["uebung", "pruefung"]) {
        const x = m[feld];
        if (!x || typeof x !== "object") { fehler.push(`${m.id}: ${feld} fehlt`); continue; }
        const erlaubt = feld === "uebung" ? ["anzahl", "arten", "niveau"] : ["anzahl", "arten", "bestehen", "niveau"];
        const felder = Object.keys(x).sort();
        if (JSON.stringify(felder) !== JSON.stringify(erlaubt)) fehler.push(`${m.id}: ${feld}-Felder ${felder.join(",")}`);
        if (x.niveau !== m.stufe) fehler.push(`${m.id}: ${feld}.niveau ${x.niveau} statt Modulstufe ${m.stufe}`);
        const arten = Array.isArray(x.arten) ? x.arten : [];
        if (arten.length < 1) fehler.push(`${m.id}: ${feld}.arten leer`);
        if (new Set(arten).size !== arten.length) fehler.push(`${m.id}: ${feld}.arten doppelt`);
        for (const a of arten) {
          if (!Object.prototype.hasOwnProperty.call(ARTEN, a)) fehler.push(`${m.id}: ${feld} nennt unbekannte Art „${a}“`);
          else if (!ARTEN[a].includes(m.stufe)) fehler.push(`${m.id}: Art „${a}“ ist auf Stufe ${m.stufe} nicht vorgesehen (§ 6)`);
        }
        if (!Number.isInteger(x.anzahl) || x.anzahl < 3 || x.anzahl > 8) fehler.push(`${m.id}: ${feld}.anzahl ${x.anzahl}`);
      }
      /* § 2.1: „Modul sicher" heißt Prüfrunde bestanden mit mindestens 4 von 5 richtigen Antworten. */
      if (m.pruefung.anzahl !== 5) fehler.push(`${m.id}: Prüfrunde mit ${m.pruefung.anzahl} Aufgaben statt 5 (§ 2.1)`);
      if (m.pruefung.bestehen !== 4) fehler.push(`${m.id}: bestehen ${m.pruefung.bestehen} statt 4 von 5 (§ 2.1)`);
      if (!(m.pruefung.bestehen > 0 && m.pruefung.bestehen <= m.pruefung.anzahl)) fehler.push(`${m.id}: bestehen > anzahl`);
    }
    /* Modul 8 ist laut § 2.2 „gemischt (§ 6)": mindestens sechs verschiedene Typen. */
    const gemischt = modulVon("pruefung");
    erwarte.wahr(gemischt.uebung.arten.length >= 6, "Modul 8 übt weniger als 6 Typen");
    erwarte.wahr(gemischt.pruefung.arten.length >= 6, "Modul 8 prüft weniger als 6 Typen");
    erwarte.gleich(fehler.slice(0, 8), [], "uebung/pruefung");
  });

  pruefe("Lehrplan: verweise zeigen auf vorhandene Wiki-Seiten, Werkzeuge und Trainings derselben Fertigkeit", () => {
    const fehler = [];
    const trainings = new Map((DATEN.trainings || []).map(t => [t.id, t]));
    for (const m of LP.module) {
      const v = m.verweise;
      if (!v || typeof v !== "object") { fehler.push(`${m.id}: verweise fehlt`); continue; }
      erwarte.gleich(Object.keys(v).sort(), ["training", "werkzeug", "wiki"], `${m.id}: verweise-Felder`);
      if (!WIKI.includes(v.wiki)) fehler.push(`${m.id}: wiki „${v.wiki}“ ist nicht lab.subnetz oder lab.vlan`);
      else if (!(DATEN.wiki || {})[v.wiki]) fehler.push(`${m.id}: Wiki-Seite ${v.wiki} fehlt in DATEN.wiki`);
      if (!WERKZEUGE.includes(v.werkzeug)) fehler.push(`${m.id}: Werkzeug „${v.werkzeug}“ fehlt in § 7`);
      const tr = trainings.get(v.training);
      if (!tr) fehler.push(`${m.id}: Training „${v.training}“ fehlt in DATEN.trainings`);
      else if (tr.skill !== v.wiki) fehler.push(`${m.id}: Training ${v.training} hat Fertigkeit ${tr.skill}, Wiki-Verweis ist ${v.wiki}`);
    }
    /* Die Reihenfolge der Stufen ist auch über uebung.niveau monoton (E → AP1 → AP2). */
    const rang = LP.module.map(m => STUFEN.indexOf(m.stufe));
    erwarte.gleich(rang, [...rang].sort((a, b) => a - b), "Modulstufen laufen nicht rückwärts");
    erwarte.gleich(fehler.slice(0, 8), [], "Verweise");
  });

  pruefe("Lehrplan: dauerMin je Modul plausibel, Gesamtlehrpfad in einer Sitzung schaffbar", () => {
    const fehler = [];
    let summe = 0;
    for (const m of LP.module) {
      if (!Number.isInteger(m.dauerMin) || m.dauerMin < 5 || m.dauerMin > 20) fehler.push(`${m.id}: dauerMin ${m.dauerMin}`);
      if (typeof m.quelle !== "string" || m.quelle.trim().length < 20) fehler.push(`${m.id}: quelle fehlt oder ist zu knapp`);
      summe += Number(m.dauerMin) || 0;
    }
    erwarte.gleich(fehler.slice(0, 8), [], "dauerMin/quelle");
    erwarte.wahr(summe >= 60 && summe <= 120, `Gesamtdauer ${summe} Minuten liegt nicht zwischen 60 und 120`);
  });

  pruefe("Lehrplan: fachliche Pflichtaussagen je Modul (Blockgröße, VLAN, /30-/31, VLSM)", () => {
    const text = id => modulText(modulVon(id));
    const pflicht = [
      ["bits", /255/, "Bits und Oktette ohne 255"],
      ["maske", /Eins/, "Netzanteil ohne Einsen-Zählung"],
      ["block", /2 hoch \(32 minus Präfix\)/, "Blockgröße nicht als 2 hoch (32 minus Präfix) erklärt"],
      ["netzid", /Broadcast/, "Netz-ID-Modul ohne Broadcastadresse"],
      ["schneiden", /Leihbits|Netzbits/, "Teilen ohne Netzbits"],
      ["vlsm", /größten[\s\S]*kleinsten/, "VLSM nicht vom größten zum kleinsten"],
      ["vlsm", /Reserve/, "VLSM ohne Reserve"],
      ["vlan", /Broadcast-Domäne/, "VLAN nicht als Broadcast-Domäne erklärt"],
      ["vlan", /Access-Port/, "VLAN ohne Access-Port"],
      ["vlan", /802\.1Q/, "VLAN ohne 802.1Q-Tag"],
      ["pruefung", /\/30/, "Prüfungsmodul ohne /30"],
      ["pruefung", /\/31/, "Prüfungsmodul ohne /31"],
      ["pruefung", /RFC 3021/, "Prüfungsmodul ohne RFC 3021"],
      ["pruefung", /Trunk/, "Prüfungsmodul ohne Trunk"],
      ["pruefung", /Native/, "Prüfungsmodul ohne Native VLAN"],
    ];
    const fehler = pflicht.filter(([id, re]) => !re.test(text(id))).map(([, , name]) => name);
    erwarte.gleich(fehler, [], "fachliche Pflichtaussagen");
    /* § 5: E-Module (bits, maske, block, netzid) bleiben beim letzten Oktett und bei /24 bis /28 –
       /30 und /31 sind AP2-Stoff. Einzige, fachlich verlangte Ausnahme: Modul 4 nennt /31 als
       RFC-3021-Ausnahme ausdrücklich, damit der absolute Satz „nie an einen Rechner" nicht hängen
       bleibt (Didaktik-Review S4). Sätze mit RFC 3021 sind von der E-Rasterprüfung ausgenommen;
       alle übrigen Sätze der E-Module bleiben im Raster /24–/28. */
    const eRoh = ["bits", "maske", "block", "netzid"].map(text).join("\n");
    erwarte.wahr(/RFC 3021/.test(eRoh), "Modul 4 nennt die /31-Ausnahme nach RFC 3021 nicht (Review S4)");
    const eText = saetze(eRoh).filter(s => !/RFC 3021/.test(s)).join(" ");
    erwarte.falsch(/\/30/.test(eText), "E-Modul spricht über /30 (erst AP2, § 5)");
    erwarte.falsch(/\/31/.test(eText), "E-Modul spricht über /31 (erst AP2, § 5)");
    const ePraefixe = [...eText.matchAll(/\/(\d{1,2})\b/g)].map(m => Number(m[1]));
    erwarte.gleich(ePraefixe.filter(p => p < 24 || p > 28), [], "E-Module mit Präfix außerhalb /24–/28");
    /* Modul 8 verlangt Prüfungsfälle: mindestens 3 geführte Beispiele. */
    erwarte.wahr(modulVon("pruefung").beispiel.length >= 3, "Prüfungsmodul mit weniger als 3 Beispielen");
  });

  /* ---------- Formelsammlung: Register 4 der Abteilung ---------- */
  const fsEintrag = titelTeil => LP.formelsammlung.find(e => String(e.titel).includes(titelTeil));
  const tabellePruefen = (e, pflichtSpalten) => {
    const fehler = [];
    const t = e.tabelle;
    if (!t || !Array.isArray(t.spalten) || !Array.isArray(t.zeilen)) return [`${e.titel}: keine Tabelle`];
    for (const s of pflichtSpalten) if (!t.spalten.includes(s)) fehler.push(`${e.titel}: Spalte „${s}“ fehlt`);
    for (const [i, z] of t.zeilen.entries()) {
      if (!Array.isArray(z) || z.length !== t.spalten.length) { fehler.push(`${e.titel}: Zeile ${i + 1} hat ${z && z.length} Zellen statt ${t.spalten.length}`); continue; }
      for (const zelle of z) if (String(zelle == null ? "" : zelle).trim() === "") fehler.push(`${e.titel}: leere Zelle in Zeile ${i + 1}`);
    }
    return fehler;
  };

  pruefe("Formelsammlung: Präfix-/Masken-/Host-Tabelle wird zellenweise nachgerechnet (inkl. /31 und /32)", () => {
    erwarte.wahr(Array.isArray(LP.formelsammlung) && LP.formelsammlung.length >= 4, "mindestens 4 Einträge (Tabelle, Rechenweg, VLAN, Fehlerfallen)");
    const e = fsEintrag("Präfix");
    erwarte.wahr(!!e, "Eintrag mit Präfix-Tabelle fehlt");
    const fehler = tabellePruefen(e, ["Präfix", "Maske", "Blockgröße", "Nutzbare Hosts"]);
    const sp = e.tabelle.spalten, iP = sp.indexOf("Präfix"), iM = sp.indexOf("Maske"),
      iB = sp.indexOf("Blockgröße"), iH = sp.indexOf("Nutzbare Hosts");
    const praefixe = [];
    for (const [i, z] of e.tabelle.zeilen.entries()) {
      const m = String(z[iP]).match(/^\/(\d{1,2})$/);
      if (!m) { fehler.push(`${e.titel}: Präfix „${z[iP]}“ in Zeile ${i + 1}`); continue; }
      const p = Number(m[1]);
      if (p < 0 || p > 32) { fehler.push(`${e.titel}: Präfix /${p} unmöglich`); continue; }
      praefixe.push(p);
      if (String(z[iM]) !== maskeAus(p)) fehler.push(`${e.titel}: /${p} Maske „${z[iM]}“, gerechnet ${maskeAus(p)}`);
      if (Number(z[iB]) !== blockAus(p)) fehler.push(`${e.titel}: /${p} Blockgröße „${z[iB]}“, gerechnet ${blockAus(p)}`);
      if (Number(z[iH]) !== hostsAus(p)) fehler.push(`${e.titel}: /${p} nutzbare Hosts „${z[iH]}“, gerechnet ${hostsAus(p)}`);
    }
    erwarte.gleich(fehler.slice(0, 8), [], "Tabelle enthält falsche Zeilen");
    erwarte.gleich(praefixe, [...praefixe].sort((a, b) => a - b), "Präfixe in der Tabelle sind nicht aufsteigend");
    for (const p of [24, 25, 26, 27, 28, 29, 30]) erwarte.wahr(praefixe.includes(p), `Tabelle deckt /${p} nicht ab`);
    /* /31 und /32 sind die Prüfungs-Ausnahmen: RFC 3021 zwei nutzbare Endpunkte, /32 eine Adresse. */
    erwarte.gleich(hostsAus(31), 2, "/31 hat nach RFC 3021 zwei nutzbare Adressen");
    erwarte.gleich(hostsAus(32), 1, "/32 ist genau eine Adresse");
  });

  pruefe("Formelsammlung: Blockgrößen-Tabelle passt zum letzten Maskenoktett – 256 minus Oktett", () => {
    const e = fsEintrag("Blockgröße im Oktett");
    erwarte.wahr(!!e, "Eintrag „Blockgröße im Oktett ablesen“ fehlt");
    const fehler = tabellePruefen(e, ["Letztes Maskenoktett", "Blockgröße", "Präfix"]);
    const sp = e.tabelle.spalten;
    const iO = sp.indexOf("Letztes Maskenoktett"), iB = sp.indexOf("Blockgröße"), iP = sp.indexOf("Präfix");
    for (const [i, z] of e.tabelle.zeilen.entries()) {
      const oktett = Number(z[iO]), block = Number(z[iB]);
      const p = Number(String(z[iP]).replace("/", ""));
      if (256 - oktett !== block) fehler.push(`${e.titel}: 256 minus ${oktett} ist ${256 - oktett}, Tabelle sagt ${block}`);
      const letztes = Number(maskeAus(p).split(".")[3]);
      if (letztes !== oktett) fehler.push(`${e.titel}: /${p} hat letztes Maskenoktett ${letztes}, Tabelle sagt ${oktett}`);
    }
    erwarte.gleich(fehler.slice(0, 8), [], "Blockgrößen-Tabelle");
  });

  pruefe("Formelsammlung: Rechenweg hat genau 5 Schritte, VLAN-Merkblatt und Fehlerfallen sind da", () => {
    const fehler = [];
    const ERLAUBT = ["merksatz", "saetze", "tabelle", "titel", "visual"];
    for (const e of LP.formelsammlung) {
      for (const k of Object.keys(e)) if (!ERLAUBT.includes(k)) fehler.push(`${e.titel}: unbekanntes Feld ${k}`);
      if (typeof e.titel !== "string" || e.titel.trim().length < 5) fehler.push("Eintrag ohne Titel");
      if (!Array.isArray(e.saetze) || e.saetze.length < 1) { fehler.push(`${e.titel}: keine Sätze`); continue; }
      if (e.saetze.length > 8) fehler.push(`${e.titel}: ${e.saetze.length} Sätze (zu lang für die Fläche)`);
      for (const s of e.saetze) if (typeof s !== "string" || s.trim().length < 20) fehler.push(`${e.titel}: Satz zu knapp`);
      if (e.merksatz !== undefined && (typeof e.merksatz !== "string" || e.merksatz.trim().length < 15)) fehler.push(`${e.titel}: merksatz zu knapp`);
      if (e.visual !== undefined) {
        if (!e.visual || !WERKZEUGE.includes(e.visual.art)) fehler.push(`${e.titel}: visual.art ungültig`);
        else if (!e.visual.preset || typeof e.visual.preset !== "object") fehler.push(`${e.titel}: visual.preset fehlt`);
      }
    }
    erwarte.gleich(fehler.slice(0, 8), [], "Formelsammlung-Form");
    const rechenweg = fsEintrag("Rechenweg");
    erwarte.wahr(!!rechenweg, "Eintrag „Rechenweg in fünf Schritten“ fehlt");
    erwarte.gleich(rechenweg.saetze.length, 5, "Rechenweg hat genau fünf Schritte");
    for (let i = 1; i <= 5; i++) erwarte.passt(rechenweg.saetze[i - 1], new RegExp("^Schritt " + i + ":"), `Schritt ${i} fehlt oder ist falsch nummeriert`);
    const vlan = fsEintrag("VLAN");
    erwarte.wahr(!!vlan, "VLAN-/Trunk-Merkblatt fehlt");
    erwarte.wahr(tabellePruefen(vlan, ["Begriff", "Bedeutung"]).length === 0, "VLAN-Merkblatt ohne vollständige Tabelle");
    const fehlerfallen = fsEintrag("Fehlerfallen");
    erwarte.wahr(!!fehlerfallen, "Eintrag „Typische Fehlerfallen“ fehlt");
    erwarte.wahr(fehlerfallen.saetze.length >= 4, "Fehlerfallen mit weniger als 4 Fällen");
    const mitMerksatz = LP.formelsammlung.filter(e => typeof e.merksatz === "string" && e.merksatz.trim()).length;
    erwarte.wahr(mitMerksatz >= 2, "zu wenige Merksätze in der Formelsammlung");
    const mitTabelle = LP.formelsammlung.filter(e => e.tabelle).length;
    erwarte.wahr(mitTabelle >= 2, `nur ${mitTabelle} Tabellen in der Formelsammlung`);
  });
});
