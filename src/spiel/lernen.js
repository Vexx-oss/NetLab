"use strict";
/* ---------- Spiel: Anbindung an den Lernmotor und Niveau ----------
   Niveau je Ticket: Spiel.einst.wahl "auto" → aus dem Lernstand der Ticket-Fertigkeiten
   (Mittel L.box: < 1 → E, < 3 → AP1, sonst AP2), def.stufe ist die Untergrenze der Prüfungsstrenge.
   Eine manuelle Wahl übersteuert. Das wirksame Niveau steht in Spiel.einst.niveau (store "einst"),
   dort liest es auch das Simulations-Panel. */

Spiel.NIVEAUS = ["E", "AP1", "AP2"];
Spiel.NIVEAU_NAME = {E: "Einstieg", AP1: "AP1", AP2: "AP2"};
Spiel.niveauRang = n => Math.max(0, Spiel.NIVEAUS.indexOf(n));

/* Mittlere Leitner-Stufe (0–5) der Ticket-Fertigkeiten */
Spiel.lernstand = function(def){
  const ids = (def && def.skills) || [];
  if (!ids.length || typeof L === "undefined") return 0;
  return ids.reduce((s, id) => s + L.box(id), 0) / ids.length;
};

Spiel.niveauFuer = function(def){
  const wahl = Spiel.einst.wahl;
  if (wahl && wahl !== "auto" && Spiel.NIVEAUS.includes(wahl)) return wahl;
  const m = Spiel.lernstand(def);
  const ausLernstand = m < 1 ? "E" : m < 3 ? "AP1" : "AP2";
  const boden = Spiel.NIVEAUS.includes(def && def.stufe) ? def.stufe : "E";
  return Spiel.niveauRang(ausLernstand) >= Spiel.niveauRang(boden) ? ausLernstand : boden;
};

/* Niveau einer Instanz; beim Öffnen einmal bestimmt und an der Instanz gemerkt (damit es sich
   mitten im Ticket nicht verschiebt), außer die Wahl wurde geändert */
Spiel.niveauVon = function(inst){
  if (inst && inst.raetsel && Spiel.NIVEAUS.includes(inst.raetsel.niveau)) return inst.raetsel.niveau;   /* Tagesrätsel: für alle gleich */
  const def = Spiel.defVon(inst);
  const soll = Spiel.niveauFuer(def);
  if (!inst.niveau || inst.niveauWahl !== Spiel.einst.wahl) { inst.niveau = soll; inst.niveauWahl = Spiel.einst.wahl; }
  return inst.niveau;
};

Spiel.niveauAktualisieren = function(){
  const inst = Spiel.aktiveInstanz();
  if (!inst) return null;
  const n = Spiel.niveauVon(inst);
  if (Spiel.einst.niveau !== n) Spiel.einstSetzen("niveau", n);
  return n;
};

/* Zählt eine gezogene Hilfe für DIESE Fertigkeit? (task-19, Review-Befund P1-2)
   Quelle ist die Eintragsliste der Instanz (`inst.hilfen`). Jeder Eintrag trägt seit task-19 die
   Fertigkeit, zu der die Sprosse gezogen wurde (`Spiel.hilfe`); Einträge ohne Zuordnung sind Altstände.

   Regeln — bewusst je Fertigkeit, nicht je Ticket:
   · Sprosse >= 4 zu dieser Fertigkeit               → true.  Bezahlte Hilfe: der Leitner-Kasten darf
     nicht steigen (ein Erfolg mit Lösungshinweis ist kein Können), die Wiederholung kommt morgen.
   · irgendeine Sprosse zu dieser Fertigkeit UND der Kasten steht noch auf 0 → true.  Genau der Fall
     aus dem Review: Wer die kostenlose Leiter (Sprosse 1–3) benutzt, hatte den Stoff noch nie — der
     erste Erfolg soll nicht als „gekonnt" in den Wiederholungsplan wandern (sonst überschätzt er die
     Beherrschung genau bei Anfängern).
   · Altstand OHNE Fertigkeit am Eintrag → wie bisher: eine Sprosse >= 4 gilt binär für alle
     Fertigkeiten des Tickets, Sprossen 1–3 ändern nichts. Bestehende Spielstände werden dadurch
     weder strenger noch billiger.
   · ganz ohne Hilfe → false (Kasten steigt wie bisher).
   Kein Wurf: fehlende Listen, fehlende Aufgabe und fehlender Lernmotor sind abgedeckt. */
Spiel.hilfeFuerSkill = function(inst, def, id){
  const eintraege = inst && Array.isArray(inst.hilfen) ? inst.hilfen : [];
  const eigene = eintraege.filter(e => e && e.skill === id);
  const alt = eintraege.filter(e => e && !e.skill);
  const stufe = liste => liste.reduce((m, e) => Math.max(m, Number(e && e.stufe) || 0), 0);
  if (stufe(eigene) >= 4) return true;
  if (stufe(alt) >= 4) return true;
  const kasten = typeof L !== "undefined" && L.box ? L.box(id) : 0;
  return stufe(eigene) >= 1 && kasten === 0;
};

/* Lernmotor nach einer Abnahme. bestanden → je Fertigkeit L.ueben(id, true, {hilfe}); nicht bestanden →
   einmal je Instanz L.ueben(id, false) und je fehlgeschlagenem Ziel ein Eintrag im Fehlerheft.
   Die Hilfe wird JE FERTIGKEIT entschieden (task-19): früher galt „hilfeStufe >= 4" für alle
   Fertigkeiten des Tickets gleich — eine mit der OSI-Checkliste gelöste Fertigkeit stieg damit im
   Leitner-Plan wie eine selbst gelöste. */
Spiel.lernenNachAbnahme = function(inst, def, abnahme){
  const skills = def.skills || [];
  const ergebnis = [];
  if (Spiel._trocken || typeof L === "undefined") return skills.map(id => ({id, name: Spiel.skill(id).name, vorher: 0, nachher: 0, stufe: "neu"}));
  Spiel.skillsRegistrieren();
  if (abnahme.bestanden) {
    for (const id of skills) {
      const r = L.ueben(id, true, {hilfe: Spiel.hilfeFuerSkill(inst, def, id)});
      ergebnis.push({id, name: Spiel.skill(id).name, vorher: r.vorher, nachher: r.nachher, stufe: L.stufeName(id)});
    }
  } else {
    inst.lernFehler ||= [];
    const schonGewertet = inst.lernFehler.includes("#ueben");
    for (const id of skills) {
      const vorher = L.box(id);
      const r = schonGewertet ? {vorher, nachher: vorher} : L.ueben(id, false);
      ergebnis.push({id, name: Spiel.skill(id).name, vorher: r.vorher, nachher: r.nachher, stufe: L.stufeName(id)});
    }
    if (!schonGewertet) inst.lernFehler.push("#ueben");
    for (const f of Spiel.fehlschlaege(abnahme)) {
      const schluessel = f.skill + "|" + f.text;
      if (inst.lernFehler.includes(schluessel)) continue;
      inst.lernFehler.push(schluessel);
      L.fehler("labor", f.skill, f.text);
    }
  }
  return ergebnis;
};

/* Fehlschläge einer Abnahme als {skill, text} fürs Fehlerheft */
Spiel.fehlschlaege = function(abnahme){
  const liste = [];
  const skillZu = (grund, fallback) => {
    const g = grund && typeof Sim !== "undefined" && Sim.GRUENDE && Sim.GRUENDE[grund];
    return (g && g.skill) || fallback;
  };
  const erster = (abnahme.def && abnahme.def.skills && abnahme.def.skills[0]) || "lab.ping";
  for (const e of abnahme.ergebnisse || []) if (e.ok === false) liste.push({skill: skillZu(e.grund, erster), text: `${abnahme.def ? abnahme.def.titel + ": " : ""}${e.ziel.text || e.ziel.typ} – ${Spiel.grundTitel(e.grund)}`});
  for (const r of abnahme.kollateral || []) liste.push({skill: skillZu(r.grund, erster), text: `Kollateralschaden: ${r.vonName} erreicht ${r.nachName} nicht mehr – ${Spiel.grundTitel(r.grund)}`});
  if (abnahme.neustart && abnahme.neustart.verlust && abnahme.niveau === "AP2") liste.push({skill: "lab.speichern", text: "Nach dem Neustart war die Änderung weg (nicht gespeichert)."});
  return liste;
};

/* Kurzer Titel zu einem Grundcode */
Spiel.grundTitel = function(code){
  if (!code) return "Grund unbekannt";
  const g = typeof Sim !== "undefined" && Sim.GRUENDE && Sim.GRUENDE[code];
  if (g && g.titel) return g.titel;
  return Spiel.EIGENE_GRUENDE[code] ? Spiel.EIGENE_GRUENDE[code].titel : code;
};

/* Erklärtext zu einem Grundcode in der Tiefe des Niveaus (DATEN.lehrtexte[code][niveau]) */
Spiel.grundText = function(code, niveau){
  if (!code) return "";
  const lt = DATEN.lehrtexte && DATEN.lehrtexte[code];
  if (lt) return lt[niveau] || lt.AP1 || lt.E || "";
  if (Spiel.EIGENE_GRUENDE[code]) return Spiel.EIGENE_GRUENDE[code][niveau] || Spiel.EIGENE_GRUENDE[code].E;
  return "";
};

/* Gründe, die nur die Abnahme kennt (keine Simulationscodes) */
Spiel.EIGENE_GRUENDE = {
  UNSAVED: {
    titel: "Nicht gespeichert",
    E: "Die laufende Konfiguration (running-config) steht nur im Arbeitsspeicher (RAM). Nach einem Neustart lädt das Gerät die gespeicherte startup-config aus dem NVRAM. Mit „copy running-config startup-config“ (oder „write memory“) sicherst du deine Änderungen.",
    AP1: "running-config (RAM) ≠ startup-config (NVRAM). Sichern: copy running-config startup-config.",
    AP2: "startup-config veraltet.",
    quelle: "Cisco IOS Configuration Fundamentals: running-config liegt im RAM, startup-config im NVRAM",
  },
  KONFIG: {
    titel: "Konfiguration weicht ab",
    E: "Der geforderte Wert ist noch nicht eingestellt. Schau im Inspektor oder mit show running-config nach.",
    AP1: "Konfigurationswert weicht von der Vorgabe ab.",
    AP2: "Vorgabe nicht erfüllt.",
  },
  BEFEHL_FEHLT: {
    titel: "Befehl fehlt",
    E: "Dieses Ziel prüft deine Arbeit im Terminal: Doppelklick auf das Gerät (oder Taste T) öffnet es. Tipp den geforderten Befehl ein – jeder fehlerfrei ausgeführte Befehl zählt.",
    AP1: "Der geforderte Befehl lief im Terminal des Geräts noch nicht.",
    AP2: "Befehl nicht ausgeführt.",
  },
  ANTWORT_FEHLT: {
    titel: "Antwort fehlt",
    E: "Lies den Wert im Terminal ab (zum Beispiel mit ipconfig) und trag ihn in der Auftragsmappe unter „Ziele“ ein.",
    AP1: "Wert noch nicht in der Mappe eingetragen.",
    AP2: "Antwort fehlt.",
  },
  ANTWORT_FALSCH: {
    titel: "Antwort stimmt nicht",
    E: "Der eingetragene Wert passt nicht zu dem, was das Gerät gerade zeigt. Schau die Ausgabe noch einmal an: Steht der Wert in der richtigen Zeile (IPv4-Adresse, Subnetzmaske, Standardgateway)?",
    AP1: "Eingetragener Wert weicht von der Ausgabe des Geräts ab.",
    AP2: "Antwort falsch.",
  },
  NOTIZ_FEHLT: {
    titel: "Änderungsnotiz fehlt",
    E: "Zur sauberen Arbeit gehört eine kurze Notiz für den Kunden: was du geändert hast, an welchem Gerät und warum. Das Feld steht in der Auftragsmappe unter „Ziele“.",
    AP1: "Änderungsnotiz fehlt oder ist zu knapp.",
    AP2: "Dokumentation fehlt.",
  },
  AUDIT_OFFEN: {
    titel: "Plan noch nicht vollständig geprüft",
    E: "Noch sind nicht alle falschen Werte markiert – oder ein richtiger ist versehentlich markiert. Vergleiche Gerät für Gerät: Was zeigt das Gerät selbst (Inspektor, ipconfig), was steht im Plan?",
    AP1: "Markierung stimmt noch nicht (fehlende oder zu viele).",
    AP2: "Audit unvollständig.",
  },
  TABELLE_OFFEN: {
    titel: "Adressplan noch nicht fertig",
    E: "Noch nicht alle Felder stimmen. Rechne Zeile für Zeile: Geräte + 2 Adressen, aufrunden auf eine Zweierpotenz – das ist die Blockgröße. Das nächste Netz beginnt direkt nach dem Broadcast des vorigen.",
    AP1: "Mindestens ein Feld weicht ab (Blockgröße, Grenze oder Reihenfolge prüfen).",
    AP2: "Adressplan fehlerhaft.",
  },
  FEHLER: {titel: "Prüfung nicht möglich", E: "Die Prüfung konnte nicht laufen.", AP1: "Prüfung nicht möglich.", AP2: "Prüfung nicht möglich."},
};
