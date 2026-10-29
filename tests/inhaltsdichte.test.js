"use strict";
/* ---------- Inhaltsdichte: Matrix Fertigkeit × 8 Zeilen (2.1 S5, Architektur § 17.4) ----------
   Warum diese Datei: KONZEPT § 4 verlangt für jede neue Einheit Lernziel, Quelle, Test, Dichte-Eintrag
   und Prüfungsbezug. Diese Matrix prüft die Dichte je Fertigkeit, nicht die Summe über alles:
     Wiki (>=3 Abschnitte, Ziel >=4) · Lehrtext (E/AP1/AP2) · >=3 Minis · >=1 Training ·
     >=1 Ticket · >=1 Hilfe · >=1 Senior-Frage · >=1 Prüfungsfrage.
   Die Matrix ist DYNAMISCH aus DATEN.skills (27 vor S6, 30 nach S6a/S6b) – keine feste Zahl.
   Ausnahmen gibt es NUR namentlich und nur dort, wo §17.1 sie erlaubt: kein Training für Inhalte,
   die nicht paketweise simuliert werden (Trainings erzeugen eine Sim-Instanz über einen Injektor).
   Vorbild ist der „kein toter Lehrtext"-Test (tests/tickets-hand.test.js): eine Ausnahme, die nicht
   mehr nötig wäre, macht den Test rot, statt still durchzurutschen.
   Ist-Zahlen: der Test druckt die Matrix als Tabelle (eine Zeile je Fertigkeit). */
gruppe("Inhaltsdichte", () => {
  const ZEILEN = ["Wiki", "Lehrtext", "Minis", "Training", "Ticket", "Hilfe", "Senior-Frage", "Prüfungsfrage"];

  /* Namentliche Ausnahmen (§17.1): ohne Simulation gibt es kein Training. lab.betrieb bekommt ein
     echtes Training über vorhandene Störungs-Injektoren (O4, „gespeichert-kaputt"/„geraet-stromlos"). */
  const AUSNAHME_TRAINING = {
    "lab.ipv6": "§17.1: IPv6 wird inhaltlich geübt (Adressierung, Planung, Konfiguration), nicht paketweise simuliert – ein Training erzeugt eine Sim-Instanz.",
    "lab.wlan": "§17.1: WLAN wird inhaltlich geübt, nicht paketweise simuliert – Funk hat kein Sim-Modell, ein Training erzeugt eine Sim-Instanz.",
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

  const hilfeZahl = id => ((DATEN.hilfen && DATEN.hilfen.VORSCHLAEGE) || []).filter(v => (v.skills || []).includes(id)).length;

  const senior = id => {
    const f = (typeof Spiel !== "undefined" && Spiel.SENIOR_FRAGEN) || null;
    const wert = f && f[id];
    if (!wert) return false;
    return String(Array.isArray(wert) ? wert.join(" ") : wert).trim().length > 0;
  };

  /* Prüfungsfrage: S3 liefert die Wahrheit als API (pruefung.js: blueprint/kandidaten/erreichbar).
     Keine Logik hier duplizieren: erreichbar(skill) wählt die Art über das ap-Feld. Der Rückfall unten
     gilt nur für den Fall, dass die API (noch) fehlt. */
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

  const matrix = () => {
    const p = pruefungsSkills();
    return skills().map(id => ({
      id,
      wiki: wikiAbschnitte(id),
      lehrtext: !!lehrtext(id),
      minis: miniZahl(id),
      training: trainingZahl(id),
      ticket: ticketsFuer().set.has(id),
      hilfe: hilfeZahl(id),
      senior: senior(id),
      pruefung: p.set.has(id),
    }));
  };

  const zeile = z => [
    z.wiki, z.lehrtext ? "ja" : "–", z.minis, z.training, z.ticket ? "ja" : "–",
    z.hilfe, z.senior ? "ja" : "–", z.pruefung ? "ja" : "–",
  ];

  pruefe("Inhaltsdichte: 8 Zeilen je Fertigkeit definiert, Matrix 30 Fertigkeiten × 8 Zeilen", () => {
    erwarte.gleich(ZEILEN.length, 8, "acht Pflichtzeilen");
    erwarte.gleich(skills().length, new Set(skills()).size, "doppelte Fertigkeit in DATEN.skills");
    erwarte.wahr(skills().length >= 27, "mindestens die 27 Fertigkeiten der Basis (S6 ergänzt)");
    const p = pruefungsSkills();
    erwarte.wahr(p.set.size > 0, "die Prüfungszeile hat eine nicht-leere Quelle: " + p.quelle);
    console.log("Inhaltsdichte · Prüfungszeile aus: " + p.quelle);
  });

  pruefe("Inhaltsdichte: jede Fertigkeit erfüllt alle acht Zeilen (Ausnahmen nur namentlich)", () => {
    const fehlt = [];
    const p = pruefungsSkills();
    for (const z of matrix()) {
      if (z.wiki < 3) fehlt.push(z.id + ": Wiki " + z.wiki + " Abschnitte (<3)");
      if (!z.lehrtext) fehlt.push(z.id + ": kein Lehrtext mit E/AP1/AP2");
      if (z.minis < 3) fehlt.push(z.id + ": " + z.minis + " Minis (<3)");
      if (z.training < 1 && !AUSNAHME_TRAINING[z.id]) fehlt.push(z.id + ": kein Training");
      if (!z.ticket) fehlt.push(z.id + ": kein Handticket");
      if (z.hilfe < 1) fehlt.push(z.id + ": kein Hilfe-Vorschlag");
      if (!z.senior) fehlt.push(z.id + ": keine Senior-Frage");
      if (!z.pruefung) fehlt.push(z.id + ": keine Prüfungsfrage (" + p.quelle + ")");
    }
    /* Ist-Zahlen je Fertigkeit ausgeben – die Abnahme verlangt sie ausdrücklich. */
    const tabelle = matrix().map(z => z.id.padEnd(16) + " | " + zeile(z).map(x => String(x).padStart(2)).join(" | "));
    console.log("Inhaltsdichte · Fertigkeit       | Wiki | Lehrtext | Minis | Training | Ticket | Hilfe | Senior | Prüfung");
    for (const t of tabelle) console.log("Inhaltsdichte · " + t);
    if (fehlt.length) console.log("Inhaltsdichte · offen:\n" + fehlt.map(f => "  - " + f).join("\n"));
    erwarte.gleich(fehlt, [], "Fertigkeiten mit offenen Dichte-Zeilen");
  });

  pruefe("Inhaltsdichte: Trainings-Ausnahmen sind echte Ausnahmen und namentlich begründet", () => {
    const ids = new Set(skills());
    const falsch = [];
    for (const [id, grund] of Object.entries(AUSNAHME_TRAINING)) {
      if (!ids.has(id)) falsch.push(id + ": keine Fertigkeit in DATEN.skills");
      if (!grund || String(grund).trim().length < 20) falsch.push(id + ": Begründung fehlt/zu kurz");
      if (trainingZahl(id) > 0) falsch.push(id + ": hat inzwischen ein Training – Ausnahme entfernen");
    }
    /* Gegenprobe: KEINE andere Fertigkeit darf ohne Training dastehen (sonst ist die Ausnahme unvollständig). */
    for (const id of ids) if (trainingZahl(id) < 1 && !AUSNAHME_TRAINING[id]) falsch.push(id + ": unbegründet ohne Training");
    erwarte.gleich(falsch, [], "Trainings-Ausnahmen");
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
    const mitVier = skills().filter(id => wikiAbschnitte(id) >= 4).length;
    console.log("Inhaltsdichte · Wiki mit >=4 Abschnitten: " + mitVier + "/" + skills().length + " (Ziel §17.4; harte Grenze sind 3)");
  });

  pruefe("Inhaltsdichte: jedes Handticket meldet seine Fertigkeiten ohne Fehler", () => {
    const {fehler} = ticketsFuer();
    erwarte.gleich(fehler, [], "Tickets, deren skills-Feld nicht baubar ist");
    erwarte.wahr(DATEN.tickets.length >= 58, "Handticket-Bestand (Ist: " + DATEN.tickets.length + ")");
  });
});
