"use strict";
/* ---------- Prüfungstag / Zertifizierung (Konzept § 3.2) ----------
   Gemischter Satz aus 3 generierten Tickets der erreichten Stufen, Zeitlimit 25 min, keine Hilfen, keine Live-Ziele.
   Bewertung: Anteil erfüllter Ziele je Aufgabe → Punkte (100) → Note nach IHK-Punkteschlüssel:
   100–92 = 1, 91–81 = 2, 80–67 = 3, 66–50 = 4, 49–30 = 5, 29–0 = 6 (Notenschlüssel der IHK-Abschlussprüfungen). */
Spiel.pruefung = {};
Spiel.PRUEFUNG = {MINUTEN: 25, AUFGABEN: 3, GEBUEHR: {AP1: 40, AP2: 80}, BESTANDEN_AB: 50};
Spiel.pruefung.note = function(punkte){
  const p = Math.round(punkte);
  return p >= 92 ? 1 : p >= 81 ? 2 : p >= 67 ? 3 : p >= 50 ? 4 : p >= 30 ? 5 : 6;
};
Spiel.pruefung.NOTEN = {1: "sehr gut", 2: "gut", 3: "befriedigend", 4: "ausreichend", 5: "mangelhaft", 6: "ungenügend"};
Spiel.pruefung.aktiv = () => Spiel.st.pruefung && !Spiel.st.pruefung.ende ? Spiel.st.pruefung : null;

/* ---------- Blueprint, Kandidaten und Aufgabenbau (Architektur § 17.2) ----------
   Früher verengte ein Filter die Prüfung: `(s.stufe || 1) <= Math.min(5, stufe)` und `s.id !== "lab.portsec"`
   schlossen Stufe-6-Fertigkeiten und Port-Security aus (B-Bericht § 3.7). Beides ist entfernt.
   Je Prüfungsart gilt das Fertigkeitsset ihres ap-Felds; zusammen decken beide ALLE vorhandenen Fertigkeiten
   (heute 27, nach S6 30 – nirgends hart codiert). Geplant wird nur, was auch BAUBAR ist: Injektor vorhanden
   ODER ein Handticket MIT dieser Fertigkeit (Architektur § 17.1). Für Inhalte, die (noch) beides nicht haben,
   hält der Fallback den Bogen trotzdem bei genau 3 Aufgaben. */
Spiel.pruefung.BLUEPRINT = { AP1: s => s.ap === "AP1", AP2: s => s.ap === "AP2" };
Spiel.pruefung.blueprint = function(art){
  const f = Spiel.pruefung.BLUEPRINT[art] || (() => true);
  return (DATEN.skills || []).filter(f).map(s => s.id);
};
/* Hat die Fertigkeit einen Sim-Injektor? Dann lässt sich ein generierter Auftrag bauen. */
Spiel.pruefung.hatInjektor = function(skill){
  return Object.values(Spiel.INJEKTOREN || {}).some(i => (i.skills || []).includes(skill));
};
/* Ein Ticket ist eine Prüfungsaufgabe, wenn es etwas zu TUN gibt: Netzziele oder Arbeitsziele
   (notiz/tabelle/audit/befehl/antwort, Architektur § 9.5). Reine Erklär-Aufträge ohne Ziel wären keine Aufgabe. */
Spiel.pruefung.hatAufgabe = function(t){
  if (!t) return false;
  if ((t.ziele || []).length > 0) return true;
  const arb = z => typeof Spiel.istArbeitsziel === "function" ? Spiel.istArbeitsziel(z) : ["notiz", "tabelle", "audit", "befehl", "antwort"].includes(z && z.typ);
  return (t.zusatzZiele || []).some(arb);
};
/* Handtickets, die diese Fertigkeit nennen, zur Prüfungsart passen und eine Aufgabe tragen (Inhalte ohne Injektor, § 17.1). */
Spiel.pruefung.handticketsMitSkill = function(art, skill){
  const artOk = t => art === "AP2" ? (t.stufe === "AP1" || t.stufe === "AP2" || t.stufe === "E") : (t.stufe === "E" || t.stufe === "AP1");
  return (typeof Spiel.ticketReihe === "function" ? Spiel.ticketReihe() : []).filter(t => t && (t.skills || []).includes(skill) && artOk(t) && Spiel.pruefung.hatAufgabe(t));
};
/* Baufähig = Injektor ODER Handticket mit dieser Fertigkeit. Nur solche Aufgaben dürfen im Bogen stehen. */
Spiel.pruefung.buildbar = function(art, skill){
  return Spiel.pruefung.hatInjektor(skill) || Spiel.pruefung.handticketsMitSkill(art, skill).length > 0;
};
/* Kandidaten einer Prüfungsart: Blueprint minus Inhalte, die (noch) nicht baubar sind (S6-Vorbereitung).
   Diese Liste ist die stabile Auskunft für andere Tests (z. B. Dichte-Test), damit Logik nicht dupliziert wird. */
Spiel.pruefung.kandidaten = function(art){
  return Spiel.pruefung.blueprint(art).filter(id => Spiel.pruefung.buildbar(art, id));
};
/* Erreichbarkeit einer Fertigkeit im jeweiligen Prüfungsbogen (für Dichte-/Abdeckungstests). */
Spiel.pruefung.erreichbar = function(skill){
  const s = (DATEN.skills || []).find(x => x.id === skill);
  const art = s && s.ap === "AP2" ? "AP2" : "AP1";
  return Spiel.pruefung.buildbar(art, skill);
};
/* Aufgaben-Fertigkeiten eines Bogens – nur baubare Kandidaten, deterministisch über den Zufall. */
Spiel.pruefung.plan = function(art, z){
  const pool = Spiel.pruefung.kandidaten(art);
  return z.mischen(pool).slice(0, Math.min(Spiel.PRUEFUNG.AUFGABEN, pool.length));
};
/* Handticket-Pool für Inhalte ohne Injektor: bevorzugt eines, dessen skills die Fertigkeit nennen,
   sonst eines derselben Prüfungsart. Deterministisch, keine neue Datenform. */
Spiel.pruefung.handticketFuer = function(art, skill, z, verbraucht){
  const da = new Set(verbraucht || []);
  const mitSkill = Spiel.pruefung.handticketsMitSkill(art, skill || "").filter(t => !da.has(t.id));
  const artOk = t => art === "AP2" ? (t.stufe === "AP1" || t.stufe === "AP2" || t.stufe === "E") : (t.stufe === "E" || t.stufe === "AP1");
  const rest = (typeof Spiel.ticketReihe === "function" ? Spiel.ticketReihe() : []).filter(t => t && !da.has(t.id) && artOk(t));
  const kandidaten = mitSkill.length ? mitSkill : rest;
  return kandidaten.length ? z.wahl(kandidaten) : null;
};
/* Der reine Bauplan eines Bogens (ohne Instanzen – billig testbar): immer genau AUFGABEN Einträge.
   {art:"gen", skill} = generierter Auftrag · {art:"ticket", ticketId, skill?} = Handticket. */
Spiel.pruefung.bogen = function(art, z){
  const bogen = [], verbraucht = new Set(), genutzt = new Set();
  const nimm = d => { bogen.push(d); if (d.skill) genutzt.add(d.skill); if (d.ticketId) verbraucht.add(d.ticketId); };
  const baue = skill => {
    if (Spiel.pruefung.hatInjektor(skill)) return {art: "gen", skill};
    const t = z.wahl(Spiel.pruefung.handticketsMitSkill(art, skill));
    return t ? {art: "ticket", ticketId: t.id, skill} : null;
  };
  for (const skill of Spiel.pruefung.plan(art, z)) {
    const d = baue(skill);
    if (d) nimm(d);
  }
  /* Freie Plätze mit weiteren BAUBAREN Kandidaten auffüllen (kein unbaubarer Skill im Bogen). */
  if (bogen.length < Spiel.PRUEFUNG.AUFGABEN) {
    for (const skill of z.mischen(Spiel.pruefung.kandidaten(art))) {
      if (bogen.length >= Spiel.PRUEFUNG.AUFGABEN) break;
      if (genutzt.has(skill)) continue;
      const d = baue(skill);
      if (d) nimm(d);
    }
  }
  /* Letzte Reserve (Architektur § 17.1): irgendein art-passendes Handticket, damit der Bogen 3 Aufgaben hält. */
  while (bogen.length < Spiel.PRUEFUNG.AUFGABEN) {
    const t = Spiel.pruefung.handticketFuer(art, null, z, verbraucht);
    if (!t) break;
    nimm({art: "ticket", ticketId: t.id, skill: null});
  }
  return bogen;
};
/* Aufgaben eines Bogens bauen: Bauplan ausführen; scheitert ein Eintrag, mit baubaren Handtickets auffüllen. */
Spiel.pruefung.bauen = function(art, z){
  const aufgaben = [], verbraucht = new Set();
  const nimm = d => {
    try {
      const inst = d.art === "gen"
        ? Spiel.instanzErstellen({gen: {skill: d.skill, seed: Spiel.neuerSeed("pr:" + d.skill), opts: {stufe: art}}, quelle: "pruefung"})
        : Spiel.instanzErstellen({ticketId: d.ticketId, quelle: "pruefung"});
      aufgaben.push(inst.iid); return true;
    } catch (e) { return false; }
  };
  for (const d of Spiel.pruefung.bogen(art, z)) {
    if (d.ticketId) verbraucht.add(d.ticketId);
    if (!nimm(d)) {
      const t = Spiel.pruefung.handticketFuer(art, d.skill, z, verbraucht);
      if (!t) continue;
      verbraucht.add(t.id);
      nimm({art: "ticket", ticketId: t.id});
    }
  }
  while (aufgaben.length < Spiel.PRUEFUNG.AUFGABEN) {
    const t = Spiel.pruefung.handticketFuer(art, null, z, verbraucht);
    if (!t) break;
    verbraucht.add(t.id);
    if (!nimm({art: "ticket", ticketId: t.id})) verbraucht.add(t.id);
  }
  return aufgaben;
};

Spiel.pruefung.starten = function(art){
  if (Spiel.pruefung.aktiv()) return {ok: false, grund: "Es läuft schon eine Prüfung."};
  const gebuehr = Spiel.PRUEFUNG.GEBUEHR[art] || 0;
  const erste = !(Spiel.st.zertifikate || []).length && !(Spiel.st.pruefungen || []).length;
  if (!erste && gebuehr && !(Spiel.karriere && Spiel.karriere.bezahlen(gebuehr, `Prüfungsgebühr ${art}`))) return {ok: false, grund: `Die Prüfungsgebühr beträgt ${gebuehr} €.`};
  const z = Zufall(Spiel.neuerSeed("pruefung:" + art));
  const aufgaben = Spiel.pruefung.bauen(art, z);
  Spiel.st.pruefung = {art, start: jetzt(), ende: null, aufgaben, ergebnis: null};
  Spiel.speichern();
  Spiel.melden("pruefung", {art, start: true});
  return {ok: true, pruefung: Spiel.st.pruefung, gebuehrErlassen: erste};
};
Spiel.pruefung.restMs = p => Math.max(0, (p || Spiel.pruefung.aktiv() || {start: 0}).start + Spiel.PRUEFUNG.MINUTEN * 60000 - jetzt());
Spiel.pruefung.zeitPruefen = function(){ const p = Spiel.pruefung.aktiv(); if (p && Spiel.pruefung.restMs(p) <= 0) Spiel.pruefung.abgeben(); };

Spiel.pruefung.abgeben = function(){
  const p = Spiel.pruefung.aktiv(); if (!p) return null;
  const teile = [];
  for (const iid of p.aufgaben) {
    const inst = Spiel.instanz(iid);
    if (!inst) continue;
    const def = Spiel.defVon(inst);
    const ab = Spiel.abnahme(inst, {neustartTest: p.art === "AP2"});
    const ziele = ab.ergebnisse.length || 1;
    let anteil = ab.ergebnisse.filter(e => e.ok).length / ziele;
    if (ab.kollateral.length) anteil = Math.max(0, anteil - 0.25);
    if (p.art === "AP2" && ab.neustart.verlust) anteil = Math.max(0, anteil - 0.5);
    teile.push({titel: def.titel, skills: def.skills || [], anteil, bestanden: ab.bestanden, gruende: ab.ergebnisse.filter(e => !e.ok).map(e => e.grund).filter(Boolean)});
    if (typeof L !== "undefined") for (const s of def.skills || []) L.ueben(s, ab.bestanden);
    Spiel.instanzEntfernen(iid);
  }
  const punkte = teile.length ? Math.round(100 * teile.reduce((a, t) => a + t.anteil, 0) / teile.length) : 0;
  const note = Spiel.pruefung.note(punkte);
  const bestanden = punkte >= Spiel.PRUEFUNG.BESTANDEN_AB;
  const schwach = [...new Set(teile.filter(t => t.anteil < 1).flatMap(t => t.skills))];
  p.ende = jetzt(); p.ergebnis = {punkte, note, bestanden, teile, schwach};
  (Spiel.st.pruefungen ||= []).push({art: p.art, tag: heute(), punkte, note});
  if (bestanden) { (Spiel.st.zertifikate ||= []); if (!Spiel.st.zertifikate.some(z => z.art === p.art)) Spiel.st.zertifikate.push({art: p.art, tag: heute(), note}); }
  if (typeof L !== "undefined") L.test("Labor " + p.art, punkte / 100, note);
  if (bestanden) Spiel.gutschreiben(p.art === "AP2" ? 150 : 80, p.art === "AP2" ? 8 : 4, `Prüfung ${p.art} bestanden (Note ${note})`);
  Spiel.speichern();
  Spiel.melden("pruefung", {art: p.art, ende: true, ergebnis: p.ergebnis});
  Spiel.melden("zustand-geaendert", {grund: "pruefung"});
  return p.ergebnis;
};
