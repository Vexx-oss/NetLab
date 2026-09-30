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

Spiel.pruefung.starten = function(art){
  if (Spiel.pruefung.aktiv()) return {ok: false, grund: "Es läuft schon eine Prüfung."};
  const gebuehr = Spiel.PRUEFUNG.GEBUEHR[art] || 0;
  const erste = !(Spiel.st.zertifikate || []).length && !(Spiel.st.pruefungen || []).length;
  if (!erste && gebuehr && !(Spiel.karriere && Spiel.karriere.bezahlen(gebuehr, `Prüfungsgebühr ${art}`))) return {ok: false, grund: `Die Prüfungsgebühr beträgt ${gebuehr} €.`};
  const stufe = Spiel.st.stufe;
  const skills = (DATEN.skills || []).filter(s => (s.stufe || 1) <= Math.min(5, stufe) && s.id !== "lab.portsec" && (art === "AP2" || s.ap === "AP1" || (s.stufe || 1) <= 2)).map(s => s.id);
  const z = Zufall(Spiel.neuerSeed("pruefung:" + art));
  const gewaehlt = z.mischen(skills).slice(0, Spiel.PRUEFUNG.AUFGABEN);
  const aufgaben = [];
  for (const skill of gewaehlt) {
    try { const inst = Spiel.instanzErstellen({gen: {skill, seed: Spiel.neuerSeed("pr:" + skill), opts: {stufe: art}}, quelle: "pruefung"}); aufgaben.push(inst.iid); }
    catch (e) { /* nächste Fertigkeit */ }
  }
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
