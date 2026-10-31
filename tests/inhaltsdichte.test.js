"use strict";
/* ---------- Inhaltsdichte: Matrix Fertigkeit × 8 Zeilen (3.0 · VIS-07, Architektur § 17.4) ----------
   Warum diese Datei: KONZEPT § 4 verlangt für jede neue Einheit Lernziel, Quelle, Test, Dichte-Eintrag
   und Prüfungsbezug; die 3.0-DoD (B2) verschärft das zu einer Prüfungsnähe-Zusage je Fertigkeit.
   Diese Matrix prüft die Dichte je Fertigkeit, nicht die Summe über alles. Acht Zeilen je Fertigkeit:
     Wiki (>=4 Abschnitte) · Lehrtext (E/AP1/AP2) · >=3 Minis · >=1 Training · >=1 Ticket ·
     >=1 Hilfe · >=1 Injektor · Prüfungsnähe (>=1 AP1- UND >=1 AP2-Aufgabe).
   Definition „Aufgabe" (F-D16, Nachweise/3.0/PRUEFKRITERIEN-DIDAKTIK § 5.2): eine Einheit, die die
   Fertigkeit nennt und die Prüfungsstufe AP1 bzw. AP2 trägt – Mini (Feld stufe), Training (Feld niveau)
   oder Handticket (Feld stufe). E-Aufgaben zählen nicht als Prüfungsniveau. Die engere Auslegung
   „nur Handtickets" wäre nach der Messung 11× ohne AP1 und 10× ohne AP2 – sie würde die Aufgabe an
   einer Stelle verlangen, an der sie didaktisch nicht hingehört; „alle Formen" ist die vereinbarte.
   Die Matrix ist DYNAMISCH aus DATEN.skills – keine feste Zahl.
   Ausnahmen gibt es NUR namentlich und nur dort, wo § 17.1 sie erlaubt: Inhalte ohne Paket-/Funk-
   Simulation haben kein Training und keinen Injektor (beides erzeugt eine Sim-Instanz).
   Falsifizierbar: eine eingeschmuggelte Lücke (Gegenprobe-Block) MUSS rot werden; eine Ausnahme,
   die nicht mehr nötig wäre, macht den Test rot, statt still durchzurutschen.
   Ist-Zahlen: der Test druckt die Matrix als Tabelle (eine Zeile je Fertigkeit, 30 × 8). */
gruppe("Inhaltsdichte", () => {
  const ZEILEN = ["Wiki", "Lehrtext", "Minis", "Training", "Ticket", "Hilfe", "Injektor", "AP1+AP2"];

  /* Namentliche Ausnahmen (§ 17.1): ohne Simulation gibt es weder Training noch Injektor.
     lab.betrieb bekommt beides über vorhandene Störungs-Injektoren (O4) – nicht in der Ausnahme. */
  const AUSNAHME_SIMULATION = {
    "lab.ipv6": "§17.1: IPv6 wird inhaltlich geübt (Adressierung, Planung, Konfiguration), nicht paketweise simuliert – Training und Injektor erzeugen eine Sim-Instanz.",
    "lab.wlan": "§17.1: WLAN wird inhaltlich geübt; Funk hat kein Sim-Modell – Training und Injektor erzeugen eine Sim-Instanz.",
  };

  const skills = () => (DATEN.skills || []).map(s => s.id);
  const wikiPage = id => (DATEN.wiki && DATEN.wiki[id]) || null;
  const wikiAbschnitte = id => { const p = wikiPage(id); return p && Array.isArray(p.abschnitte) ? p.abschnitte.length : 0; };

  /* Lehrtext zählt, wenn ein Sim-Code-Text (Feld skill) ODER der Skill-Schlüssel (DATEN.lehrtexte[skill])
     alle drei Tiefen trägt – die Form des Bestands, kein Textvergleich. */
  const lehrtext = id => {
    const obj = DATEN.lehrtexte || {};
    const passt = t => t && t.skill === id && t.E && t.AP1 && t.AP2;
    if (passt(obj[id])) return obj[id];
    return Object.values(obj).find(passt) || null;
  };
  const miniZahl = id => (DATEN.mini || []).filter(m => m.skill === id).length;
  const trainingZahl = id => (DATEN.trainings || []).filter(t => t.skill === id).length;
  const injektorZahl = id => Object.values((typeof Spiel !== "undefined" && Spiel.INJEKTOREN) || {})
    .filter(i => ((i && i.skills) || []).includes(id)).length;

  /* Tickets bauen ihr skills-Feld erst beim Zugriff (daten/basis.js: ticketSpec-Getter); ein Fehler
     in einem Ticket darf die Dichte-Matrix nicht still verfälschen, deshalb wird er gemeldet. */
  let ticketSkills = null;
  const ticketsFuer = () => {
    if (ticketSkills) return ticketSkills;
    const set = new Set(), fehler = [];
    for (const def of DATEN.tickets || []) {
      let ss = null;
      try { ss = def.skills; } catch (e) { fehler.push(def.id); }
      for (const s of ss || []) set.add(s);
    }
    ticketSkills = {set, fehler};
    return ticketSkills;
  };

  /* Prüfungsstufe AP1/AP2 je Aufgabe: die drei inhaltsführenden Formen; E zählt nicht. */
  const aufgaben = (id, stufe) => {
    const treffer = [];
    for (const m of DATEN.mini || []) if (m.skill === id && m.stufe === stufe) treffer.push("Mini " + m.id);
    for (const t of DATEN.trainings || []) if (t.skill === id && t.niveau === stufe) treffer.push("Training " + t.id);
    for (const def of DATEN.tickets || []) {
      let ss = [];
      try { ss = def.skills || []; } catch (e) { continue; }
      if (def.stufe === stufe && ss.includes(id)) treffer.push("Ticket " + def.id);
    }
    return treffer;
  };

  const hilfeZahl = id => ((DATEN.hilfen && DATEN.hilfen.VORSCHLAEGE) || []).filter(v => (v.skills || []).includes(id)).length;

  const senior = id => {
    const f = (typeof Spiel !== "undefined" && Spiel.SENIOR_FRAGEN) || null;
    const wert = f && f[id];
    if (!wert) return false;
    return String(Array.isArray(wert) ? wert.join(" ") : wert).trim().length > 0;
  };

  /* Prüfungsfrage: S3 liefert die Wahrheit als API (pruefung.js: blueprint/kandidaten/erreichbar).
     Keine Logik hier duplizieren: erreichbar(skill) wählt die Art über das ap-Feld. */
  const pruefungsSkills = () => {
    try {
      if (typeof Spiel !== "undefined" && Spiel.pruefung && typeof Spiel.pruefung.erreichbar === "function") {
        const set = new Set(skills().filter(id => { try { return !!Spiel.pruefung.erreichbar(id); } catch (e) { return false; } }));
        return {set, quelle: "Spiel.pruefung.erreichbar(skill)"};
      }
    } catch (e) { /* Rückfall unten */ }
    const set = new Set();
    for (const inj of Object.values((typeof Spiel !== "undefined" && Spiel.INJEKTOREN) || {})) for (const s of (inj && inj.skills) || []) set.add(s);
    for (const s of ticketsFuer().set) set.add(s);
    return {set, quelle: "Rückfall: Injektor ODER Handticket (§17.2)"};
  };

  const matrix = () => skills().map(id => ({
    id,
    wiki: wikiAbschnitte(id),
    lehrtext: !!lehrtext(id),
    minis: miniZahl(id),
    training: trainingZahl(id),
    ticket: ticketsFuer().set.has(id),
    hilfe: hilfeZahl(id),
    injektor: injektorZahl(id),
    ap1: aufgaben(id, "AP1"),
    ap2: aufgaben(id, "AP2"),
  }));

  const zeile = z => [
    z.wiki, z.lehrtext ? "ja" : "–", z.minis, z.training, z.ticket ? "ja" : "–",
    z.hilfe, z.injektor, z.ap1.length + "/" + z.ap2.length,
  ];

  /* DIE Prüfung der acht Zeilen – rein und wiederverwendbar, damit die Gegenprobe dieselbe
     Funktion mit einer eingeschmuggelten Lücke fährt (keine zweite Wahrheit im Test). */
  const luecken = m => {
    const fehlt = [];
    for (const z of m) {
      if (z.wiki < 4) fehlt.push(z.id + ": Wiki " + z.wiki + " Abschnitte (<4)");
      if (!z.lehrtext) fehlt.push(z.id + ": kein Lehrtext mit E/AP1/AP2");
      if (z.minis < 3) fehlt.push(z.id + ": " + z.minis + " Minis (<3)");
      if (z.training < 1 && !AUSNAHME_SIMULATION[z.id]) fehlt.push(z.id + ": kein Training");
      if (!z.ticket) fehlt.push(z.id + ": kein Handticket");
      if (z.hilfe < 1) fehlt.push(z.id + ": kein Hilfe-Vorschlag");
      if (z.injektor < 1 && !AUSNAHME_SIMULATION[z.id]) fehlt.push(z.id + ": kein Injektor");
      if (!z.ap1.length) fehlt.push(z.id + ": keine AP1-Aufgabe");
      if (!z.ap2.length) fehlt.push(z.id + ": keine AP2-Aufgabe");
    }
    return fehlt;
  };

  pruefe("Inhaltsdichte: 8 Zeilen je Fertigkeit definiert, Matrix 30 Fertigkeiten × 8 Zeilen", () => {
    erwarte.gleich(ZEILEN.length, 8, "acht Pflichtzeilen");
    erwarte.gleich(skills().length, new Set(skills()).size, "doppelte Fertigkeit in DATEN.skills");
    erwarte.wahr(skills().length >= 27, "mindestens die 27 Fertigkeiten der Basis (S6 ergänzt)");
    erwarte.gleich(matrix().length, skills().length, "eine Matrixzeile je Fertigkeit");
    const p = pruefungsSkills();
    erwarte.wahr(p.set.size > 0, "die Prüfungszeile hat eine nicht-leere Quelle: " + p.quelle);
    console.log("Inhaltsdichte · Prüfungszeile aus: " + p.quelle);
  });

  pruefe("Inhaltsdichte: jede Fertigkeit erfüllt alle acht Zeilen (Wiki>=4, Injektor>=1, AP1+AP2)", () => {
    const m = matrix();
    const fehlt = luecken(m);
    /* Ist-Zahlen je Fertigkeit ausgeben – die Abnahme verlangt die 30×8-Matrix im Log. */
    const tabelle = m.map(z => z.id.padEnd(16) + " | " + zeile(z).map(x => String(x).padStart(2)).join(" | "));
    console.log("Inhaltsdichte · Fertigkeit       | Wiki | Lehrtext | Minis | Training | Ticket | Hilfe | Injektor | AP1/AP2");
    for (const t of tabelle) console.log("Inhaltsdichte · " + t);
    console.log("Inhaltsdichte · Wiki mit >=4 Abschnitten: " + m.filter(z => z.wiki >= 4).length + "/" + m.length);
    if (fehlt.length) console.log("Inhaltsdichte · offen:\n" + fehlt.map(f => "  - " + f).join("\n"));
    erwarte.gleich(fehlt, [], "Fertigkeiten mit offenen Dichte-Zeilen");
  });

  pruefe("Inhaltsdichte: Ausnahmen sind echte, namentlich begründete Ausnahmen (lab.ipv6, lab.wlan)", () => {
    const ids = new Set(skills());
    const falsch = [];
    for (const [id, grund] of Object.entries(AUSNAHME_SIMULATION)) {
      if (!ids.has(id)) falsch.push(id + ": keine Fertigkeit in DATEN.skills");
      if (!grund || String(grund).trim().length < 20) falsch.push(id + ": Begründung fehlt/zu kurz");
      if (trainingZahl(id) > 0) falsch.push(id + ": hat inzwischen ein Training – Ausnahme entfernen");
      if (injektorZahl(id) > 0) falsch.push(id + ": hat inzwischen einen Injektor – Ausnahme entfernen");
    }
    /* Gegenprobe: KEINE andere Fertigkeit darf ohne Training/Injektor dastehen. */
    for (const id of ids) {
      if (!AUSNAHME_SIMULATION[id] && trainingZahl(id) < 1) falsch.push(id + ": unbegründet ohne Training");
      if (!AUSNAHME_SIMULATION[id] && injektorZahl(id) < 1) falsch.push(id + ": unbegründet ohne Injektor");
    }
    erwarte.gleich(falsch, [], "Ausnahmen Training/Injektor (§17.1)");
    erwarte.gleich(Object.keys(AUSNAHME_SIMULATION).length, 2, "genau zwei benannte Ausnahmen");
  });

  /* Gegenprobe: dieselbe Prüffunktion MUSS eine künstlich eingeschmuggelte Lücke erkennen –
     sonst wäre das Gate blind („grün ohne Wirkung"). */
  pruefe("Inhaltsdichte: eingeschmuggelte Lücke macht rot (Gegenprobe an luecken)", () => {
    /* Synthetische volle Zeile: die Gegenprobe hängt nicht an der echten Datenlage. */
    const voll = () => ({id: "lab.link", wiki: 4, lehrtext: true, minis: 3, training: 1, ticket: true, hilfe: 1, injektor: 1, ap1: ["Mini x"], ap2: ["Mini y"]});
    erwarte.gleich(luecken([voll()]), [], "eine vollständige Zeile ist grün");
    const faelle = [
      ["Wiki", z => { z.wiki = 3; }],
      ["Injektor", z => { z.injektor = 0; }],
      ["Training", z => { z.training = 0; }],
      ["Minis", z => { z.minis = 2; }],
      ["AP1-Aufgabe", z => { z.ap1 = []; }],
      ["AP2-Aufgabe", z => { z.ap2 = []; }],
    ];
    for (const [name, aendere] of faelle) {
      const ziel = voll();
      aendere(ziel);
      const gefunden = luecken([ziel]);
      erwarte.wahr(gefunden.some(f => f.indexOf(ziel.id + ":") === 0), "Gegenprobe " + name + " wurde nicht erkannt: " + gefunden.join(" | "));
    }
    /* Ausnahmen wirken nur namentlich: ohne Eintrag zählt die Zeile, mit Eintrag nicht. */
    const ohneAusnahme = voll(); ohneAusnahme.training = 0; ohneAusnahme.injektor = 0;
    erwarte.gleich(luecken([ohneAusnahme]).length, 2, "ohne Ausnahme sind Training und Injektor zwei Lücken");
    erwarte.gleich(luecken([Object.assign({}, ohneAusnahme, {id: "lab.ipv6"})]), [], "für lab.ipv6 sind Training und Injektor namentlich ausgenommen");
  });

  pruefe("Inhaltsdichte: Senior-Fragen 30/30 und Prüfungsfrage je Fertigkeit (Säule §17.3/§17.2)", () => {
    const fehlt = matrix().filter(z => !senior(z.id)).map(z => z.id + ": keine Senior-Frage");
    const p = pruefungsSkills();
    for (const z of matrix()) if (!p.set.has(z.id)) fehlt.push(z.id + ": keine Prüfungsfrage (" + p.quelle + ")");
    erwarte.gleich(fehlt, [], "Senior-Frage und Prüfungsfrage je Fertigkeit");
  });

  pruefe("Inhaltsdichte: Lehrtexte haben drei Tiefen und eine Quelle (46 Texte, 30 Fertigkeiten)", () => {
    const texte = Object.entries(DATEN.lehrtexte || {});
    const fehler = [];
    for (const [key, t] of texte) {
      if (!t || !t.skill) { fehler.push(key + ": skill fehlt"); continue; }
      for (const n of ["E", "AP1", "AP2"]) if (!t[n] || !String(t[n]).trim()) fehler.push(key + ": " + n + " fehlt");
      if (!t.quelle || String(t.quelle).trim().length < 10) fehler.push(key + ": Quelle fehlt");
      if (!t.titel) fehler.push(key + ": Titel fehlt");
    }
    erwarte.gleich(fehler.slice(0, 10), [], "Lehrtext-Form");
    erwarte.wahr(texte.length >= 46, "46 Lehrtexte (Ist: " + texte.length + ")");
    erwarte.gleich(skills().filter(id => !lehrtext(id)), [], "Fertigkeiten ohne Lehrtext");
  });

  pruefe("Inhaltsdichte: jedes Handticket meldet seine Fertigkeiten ohne Fehler", () => {
    const {fehler} = ticketsFuer();
    erwarte.gleich(fehler, [], "Tickets, deren skills-Feld nicht baubar ist");
    erwarte.wahr(DATEN.tickets.length >= 58, "Handticket-Bestand (Ist: " + DATEN.tickets.length + ")");
  });

  /* W1 · INH-01 (31.10.2026): Elf Handtickets trugen keine Fertigkeit – alle vier Projekte,
     praxis-09/10, autohaus-09/10 und buero-sicherheit-3/4/5. Ursache: generator.js:102 leitet
     `skills` ohne eigenen Eintrag nur aus den Injektoren ab (`spec.skills || …`); ein Projekt
     ohne Injektor hat dort `injektoren: []` und damit keine Lernverbuchung (lernen.js:79 verbucht
     nur `def.skills`). Der Test hält die Lücke zu, statt sie im grünen Lauf zu verstecken. */
  pruefe("Inhaltsdichte: jedes Handticket nennt mindestens eine Fertigkeit (Lernmotor)", () => {
    const bekannt = new Set((DATEN.skills || []).map(s => s.id));
    const ohneSkills = [], unbekannt = [];
    for (const def of DATEN.tickets || []) {
      const ss = def.skills || [];
      if (!ss.length) { ohneSkills.push(def.id); continue; }
      for (const s of ss) if (!bekannt.has(s)) unbekannt.push(def.id + ": " + s);
    }
    console.log("Inhaltsdichte · Tickets ohne Fertigkeit: " + ohneSkills.length + "/" + (DATEN.tickets || []).length);
    erwarte.gleich(ohneSkills, [], "Handtickets ohne Fertigkeit (Lernmotor verbucht dort nichts)");
    erwarte.gleich(unbekannt, [], "unbekannte Fertigkeiten in Tickets");
  });
});
