"use strict";
/* ---------- Wochenziel (Design – Spielspaß 2.0, § 20 F7; Architektur § 9.8) ----------
   Ein frei wählbares Ziel für die laufende Kalenderwoche: drei Vorschläge, eins davon wählt man (oder keins – nichts geht
   verloren, R7: keine Pflicht, keine Serien-Schuld). Gezählt wird nur, was in dieser Woche passiert ist; geschafft → +1 Ruf.
   st.wochenziel = {woche:"2026-10-05" (Montag), id, erreicht:false} */
Spiel.WOCHENZIELE = [
  {id: "dex", text: "3 Fehlerarten verstehen", kurz: "Fehlerarten", soll: 3,
   ist: (st, w) => Object.values(st.dex || {}).filter(e => e && e.verstanden && e.verstanden >= w).length},
  {id: "ohneHilfe", text: "5 Aufträge ohne Hilfe", kurz: "ohne Hilfe", soll: 5,
   ist: (st, w) => (st.erledigt || []).filter(e => e.tag >= w && !e.hilfe && e.quelle !== "pruefung" && e.quelle !== "raetsel").length},
  {id: "formen", text: "3 verschiedene Auftragsformen", kurz: "Formen", soll: 3,
   ist: (st, w) => new Set((st.erledigt || []).filter(e => e.tag >= w && e.form && e.quelle !== "pruefung" && e.quelle !== "raetsel").map(e => e.form)).size},
  {id: "raetsel", text: "An 3 Tagen das Tagesrätsel lösen", kurz: "Rätsel", soll: 3,
   ist: (st, w) => Object.keys(st.tagesraetsel || {}).filter(k => /^\d{4}-\d\d-\d\d$/.test(k) && k >= w).length},
  {id: "glanz", text: "3 Aufträge mit 5 Sternen ohne Hilfe", kurz: "Glanz", soll: 3,
   ist: (st, w) => (st.erledigt || []).filter(e => e.tag >= w && (e.sterne || 0) >= 5 && !e.hilfe && e.quelle !== "pruefung" && e.quelle !== "raetsel").length},
];
Spiel.woche = (() => {
  const montag = (tag = heute()) => Spiel.hub.wochenstart(tag);
  const ziel = id => Spiel.WOCHENZIELE.find(z => z.id === id) || null;
  const daten = (st = Spiel.st) => {
    const d = st.wochenziel && typeof st.wochenziel === "object" ? st.wochenziel : null;
    return d && d.woche === montag() ? d : null;                     /* letzte Woche zählt nicht mehr */
  };
  /* drei Vorschläge je Woche, für alle gleich (Seed = Montag), ohne Zufall im Spielstand */
  function vorschlaege(){
    const z = Zufall("woche:" + montag());
    return z.mischen(Spiel.WOCHENZIELE.slice()).slice(0, 3).map(x => ({id: x.id, text: x.text, soll: x.soll}));
  }
  function waehlen(id){
    if (!ziel(id) || !vorschlaege().some(v => v.id === id)) return null;
    Spiel.st.wochenziel = {woche: montag(), id, erreicht: false};
    Spiel.speichern();
    return stand();
  }
  function stand(){
    const d = daten(); if (!d) return null;
    const z = ziel(d.id); if (!z) return null;
    const ist = Math.min(z.soll, z.ist(Spiel.st, d.woche));
    return {woche: d.woche, id: z.id, text: z.text, kurz: z.kurz, soll: z.soll, ist, erreicht: !!d.erreicht || ist >= z.soll};
  }
  /* nach einem Abschluss: geschafft? → einmal +1 Ruf und eine Zeile fürs Ergebnis */
  function pruefen(){
    const d = daten(), s = stand();
    if (!d || !s || d.erreicht || s.ist < s.soll) return null;
    d.erreicht = true;
    Spiel.gutschreiben(0, 1, "Wochenziel: " + s.text);
    return {text: s.text, ruf: 1};
  }
  return {montag, vorschlaege, waehlen, stand, pruefen};
})();
