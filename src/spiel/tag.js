"use strict";
/* ---------- „Heute dran“: Arbeitstag und Bereitschaftsdienst (Konzept § 3.1 Meso) ----------
   Spiel.tag.heute() → {tag, faellig:[skill], bereitschaft:[iid], erledigtHeute, serie, heuteUebungen, ziel, fertig}
   Spiel.tag.bereitschaftStarten() legt fällige Wiederholungen als Wartungs-Tickets ins Postfach (höchstens 3).
   Spiel.tag.bilanz() → {tickets, ohneHilfe, sterne, euro, ruf, uebungen, serie, morgenFaellig:[skill]} (Feierabend)
   Ein verpasster Tag löscht nichts; die Serie zählt Lerntage in Folge (Lernmotor). */
Spiel.tag = {};
Spiel.TAG = {ZIEL_TICKETS: 3, BEREITSCHAFT_MAX: 3};

Spiel.tag.daten = function(){
  const st = Spiel.st;
  if (!st.tag || st.tag.tag !== heute()) st.tag = {tag: heute(), bereitschaft: [], abschlussGezeigt: false};
  return st.tag;
};
Spiel.tag.heute = function(){
  const d = Spiel.tag.daten(), st = Spiel.st;
  const faellig = typeof L !== "undefined" ? L.faelligeIds(id => String(id).startsWith("lab.")) : [];
  const erledigtHeute = st.erledigt.filter(e => e.tag === d.tag).length;
  const offenBereitschaft = d.bereitschaft.filter(iid => Spiel.instanz && Spiel.instanz(iid));
  return {tag: d.tag, faellig, bereitschaft: offenBereitschaft, erledigtHeute, ziel: Spiel.TAG.ZIEL_TICKETS,
    serie: typeof L !== "undefined" ? L.serie() : 0, heuteUebungen: typeof L !== "undefined" ? L.heuteZahl() : 0,
    fertig: erledigtHeute >= Spiel.TAG.ZIEL_TICKETS, abschlussGezeigt: d.abschlussGezeigt};
};
Spiel.tag.bereitschaftStarten = function(){
  const d = Spiel.tag.daten();
  const faellig = typeof L !== "undefined" ? L.faelligeIds(id => String(id).startsWith("lab.")) : [];
  const neu = [];
  for (const skill of faellig) {
    if (neu.length + d.bereitschaft.length >= Spiel.TAG.BEREITSCHAFT_MAX) break;
    try {
      const inst = Spiel.instanzErstellen({gen: {skill, seed: Spiel.neuerSeed("bereitschaft:" + skill), opts: {art: "wartung", stufe: Spiel.karriere ? Spiel.karriere.niveau() : "E"}}, quelle: "wiederholung"});
      d.bereitschaft.push(inst.iid); neu.push(inst);
    } catch (e) { /* für diese Fertigkeit gibt es kein Ticket – weiter */ }
  }
  Spiel.speichern();
  Spiel.melden("zustand-geaendert", {grund: "bereitschaft"});
  return neu;
};
Spiel.tag.abschlussGesehen = function(){ Spiel.tag.daten().abschlussGezeigt = true; Spiel.speichern(); };

/* Feierabend-Bilanz des Tages: was geschafft ist und was morgen fällig wird (Wiederholung an verschiedenen Tagen).
   Euro/Ruf aus dem Kassenbuch (letzte 50 Buchungen) – an sehr vollen Tagen ist das eine Untergrenze. */
Spiel.tag.bilanz = function(){
  const st = Spiel.st, t = heute(), morgen = plusTage(t, 1);
  const tickets = st.erledigt.filter(e => e.tag === t && e.quelle !== "pruefung");
  const buchungen = st.buch.filter(b => b && heute(new Date(b.t)) === t);
  const plus = f => Math.round(buchungen.reduce((s, b) => s + (b[f] > 0 ? b[f] : 0), 0) * 100) / 100;
  const morgenFaellig = typeof L === "undefined" ? [] : Object.keys(L.st.units || {})
    .filter(id => String(id).startsWith("lab.") && (L.get(id) || {}).due === morgen);
  return {
    tag: t, tickets: tickets.length, ohneHilfe: tickets.filter(e => !e.hilfe).length,
    sterne: tickets.length ? Math.round(10 * tickets.reduce((s, e) => s + (e.sterne || 0), 0) / tickets.length) / 10 : 0,
    euro: plus("euro"), ruf: plus("ruf"),
    uebungen: typeof L !== "undefined" ? L.heuteZahl() : 0, serie: typeof L !== "undefined" ? L.serie() : 0,
    morgenFaellig,
  };
};
