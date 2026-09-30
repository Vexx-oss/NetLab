"use strict";
/* ---------- Mini-Tickets für die Leiste (Konzept § 3.2 „Mini“, § 3.4) ----------
   Spiel.mini.naechstes() → Mini (Auswahl: Unterrichtsthema → fällige Fertigkeiten → häufige Fehler → schwächste der Stufe)
   Spiel.mini.antworten(id, antwort) → {richtig, erklaerung, lohn, loesung}   (Lernmotor + kleiner Lohn)
   Spiel.mini.fuerSkill(skill), Spiel.mini.setzen(id)   (Training aus Lernstand und Playbooks)
   Antwortformen: wahl/vorhersage = Index · reihenfolge = Indexliste · zuordnen = Paare [links, rechts]. */
Spiel.mini = {};
Spiel.MINI = {LOHN: {E: 2, AP1: 3, AP2: 5}, SPERRE: 25};

Spiel.mini.stand = function(){
  const st = Spiel.st;
  st.mini ||= {aktuell: null, zuletzt: [], richtig: 0, falsch: 0};
  return st.mini;
};
Spiel.mini.alle = () => (DATEN.mini || []).filter(m => m && m.id && m.skill);
Spiel.mini.von = id => Spiel.mini.alle().find(m => m.id === id) || null;

/* passend zum Niveau: E-Spieler bekommen E und AP1, AP2-Spieler alles */
Spiel.mini.passtNiveau = function(m){
  const n = typeof Spiel.karriere !== "undefined" && Spiel.karriere.niveau ? Spiel.karriere.niveau() : "E";
  if (n === "E") return m.stufe !== "AP2";
  return true;
};
Spiel.mini.fuerSkill = function(skill, {ohne = []} = {}){
  const s = Spiel.mini.stand();
  const kand = Spiel.mini.alle().filter(m => m.skill === skill && !ohne.includes(m.id));
  if (!kand.length) return null;
  const frisch = kand.filter(m => !s.zuletzt.includes(m.id) && Spiel.mini.passtNiveau(m));
  const liste = frisch.length ? frisch : kand;
  return liste[Zufall(skill + ":" + s.richtig + ":" + s.falsch + ":" + heute()).zahl(liste.length)];
};
Spiel.mini.setzen = function(id){ Spiel.mini.stand().aktuell = id; Spiel.speichern(); };

Spiel.mini.naechstes = function(){
  const s = Spiel.mini.stand();
  if (s.aktuell && Spiel.mini.von(s.aktuell)) return Spiel.mini.von(s.aktuell);
  const st = Spiel.st;
  const freigegeben = (DATEN.skills || []).filter(x => (x.stufe || 1) <= Math.max(1, st.stufe)).map(x => x.id);
  const vorhanden = new Set(Spiel.mini.alle().map(m => m.skill));
  const kandidaten = [];
  const u = Spiel.einst && Spiel.einst.unterricht;
  if (u) kandidaten.push(u);
  if (typeof L !== "undefined") {
    kandidaten.push(...L.faelligeIds(id => id.startsWith("lab.")));
    kandidaten.push(...L.haeufigeFehler(14).map(f => f.id).filter(id => String(id).startsWith("lab.")));
    kandidaten.push(...freigegeben.slice().sort((a, b) => L.box(a) - L.box(b)));
  } else kandidaten.push(...freigegeben);
  for (const skill of kandidaten) {
    if (!vorhanden.has(skill)) continue;
    const m = Spiel.mini.fuerSkill(skill);
    if (m && !s.zuletzt.slice(-6).includes(m.id)) { s.aktuell = m.id; Spiel.speichern(); return m; }
  }
  const rest = Spiel.mini.alle().filter(m => !s.zuletzt.includes(m.id));
  const m = rest.length ? rest[Zufall("rest:" + s.richtig + s.falsch).zahl(rest.length)] : Spiel.mini.alle()[0] || null;
  if (m) { s.aktuell = m.id; Spiel.speichern(); }
  return m;
};

Spiel.mini.pruefen = function(m, antwort){
  if (m.art === "wahl" || m.art === "vorhersage") return +antwort === +m.richtig;
  if (m.art === "reihenfolge") return Array.isArray(antwort) && JSON.stringify(antwort.map(Number)) === JSON.stringify(m.richtig.map(Number));
  if (m.art === "zuordnen") {
    if (!Array.isArray(antwort)) return false;
    const soll = new Set(m.richtig.map(p => p.join("-"))), ist = new Set(antwort.map(p => p.join("-")));
    return soll.size === ist.size && [...soll].every(x => ist.has(x));
  }
  return false;
};
Spiel.mini.loesungText = function(m){
  if (m.art === "wahl" || m.art === "vorhersage") return m.optionen[m.richtig];
  if (m.art === "reihenfolge") return m.richtig.map(i => m.optionen[i]).join(" → ");
  if (m.art === "zuordnen") return m.richtig.map(([l, r]) => `${m.optionen.links[l]} ↔ ${m.optionen.rechts[r]}`).join(" · ");
  return "";
};
Spiel.mini.antworten = function(id, antwort){
  const m = Spiel.mini.von(id); if (!m) return null;
  const s = Spiel.mini.stand();
  const richtig = Spiel.mini.pruefen(m, antwort);
  s.aktuell = null;
  s.zuletzt.push(m.id); if (s.zuletzt.length > Spiel.MINI.SPERRE) s.zuletzt.splice(0, s.zuletzt.length - Spiel.MINI.SPERRE);
  if (richtig) s.richtig++; else s.falsch++;
  let lohn = 0;
  if (!Spiel._trocken && typeof L !== "undefined") {
    Spiel.skillsRegistrieren();
    L.ueben(m.skill, richtig);
    if (!richtig) L.fehler("labor-mini", m.skill, m.frage);
  }
  if (richtig) { lohn = Spiel.MINI.LOHN[m.stufe] || 2; Spiel.gutschreiben(lohn, 0, "Mini-Ticket"); }
  else Spiel.speichern();
  Spiel.melden("mini", {m, richtig});
  return {richtig, erklaerung: m.erklaerung, lohn, loesung: Spiel.mini.loesungText(m), quelle: m.quelle};
};
