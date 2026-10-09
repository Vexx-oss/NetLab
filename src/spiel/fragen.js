"use strict";
/* ---------- Fragen-Generator: aus geprüften Vorlagen immer neue Aufgaben (task-18) ----------
   Spiel.fragen.erzeuge(vorlageId, seed)        → ein vollständiges Mini (Form wie src/daten/mini.js:10-12)
                                                  {id, skill, stufe, art, frage, optionen, richtig,
                                                   erklaerung, quelle} (+ schnappschuss:null, generiert:true)
   Spiel.fragen.erzeugeVoll(vorlageId, seed)    → {mini, parameter, vorlage} – dieselbe Frage samt den
                                                  Zahlen, aus denen sie gerechnet ist (für Tests und Fehlersuche)
   Spiel.fragen.alle()                          → die Vorlagen (id, titel, skill, stufe, quelle)
   Spiel.fragen.fuerSkill(skill, {ohne, seed})  → eine generierte Frage zu dieser Fertigkeit oder null
   Spiel.fragen.merken(m) / .von(id)            → Zwischenspeicher für die zuletzt erzeugten Fragen
   Spiel.fragen.ausId(id)                       → baut eine Frage aus ihrer ID neu (die ID trägt Vorlage + Seed)

   DETERMINISTISCH. Der Zufall kommt ausschließlich aus Zufall() (src/kern/basis.js, mulberry32):
   kein Math.random, kein Sprachmodell, kein Netz. Derselbe (vorlageId, seed) ergibt Zeichen für
   Zeichen dieselbe Frage – auch die Reihenfolge der Optionen. Verschiedene Seeds ergeben andere
   Zahlen und eine andere Reihenfolge.

   DIE LÖSUNG IST BEWIESEN, NICHT GERATEN. Die Rechenregel steht in der Vorlage (src/daten/
   fragen-vorlagen.js): `loesung(p)` und `pruefe(p, text)` rechnen den Wert unabhängig voneinander
   aus. Dieser Baustein nimmt eine Frage nur an, wenn
     · genau drei verschiedene falsche Antworten vorliegen,
     · genau EINE der vier Optionen `pruefe` besteht – und zwar die aus `loesung`,
     · Frage und Optionen in die Leiste passen (≤ 140 bzw. ≤ 60 Zeichen).
   Sonst kommt null heraus. Eine Frage mit falscher Lösung ist ein Datenfehler, kein Feature:
   lieber keine Frage als eine falsche. tests/fragen-generator.test.js rechnet über 200 Seeds je
   Vorlage mit eigener Bit-Arithmetik nach.

   OHNE SEITENWIRKUNG. Der Generator schreibt nichts in DATEN.mini, nichts in den Spielstand und
   nichts in den Speicher: er ist eine reine Funktion. Deshalb kann ihn jeder Aufrufer gefahrlos
   ausprobieren.

   ANBINDUNG (noch NICHT eingehängt – src/spiel/mini.js gehört dem Task „Wiederholungssperre“;
   der Lead koordiniert die Reihenfolge). Vorgesehen ist genau eine Stelle:
     in Spiel.mini.fuerSkill(skill, {ohne}) nach dem Datenbestand:
       const g = Spiel.fragen.fuerSkill(skill, {ohne, seed: <eine Zahl aus dem Spielstand>});
       if (g) return Spiel.fragen.merken(g);
     und in Spiel.mini.von(id) als zweiter Blick:
       … || Spiel.fragen.von(id)
   `von(id)` baut eine gemerkte Frage aus ihrer ID neu – die ID ist `gf-<vorlage>-<seed>`, also
   übersteht die Frage auch einen Neustart, ohne im Spielstand zu liegen.
   LF-Zeilenenden, kein DOM. */
Spiel.fragen = (() => {
  const F = {};
  /* Zuletzt erzeugte Fragen – nur für die Anbindung (Spiel.mini.von), NICHT Teil des Spielstands. */
  F._register = {};

  const text = x => String(x == null ? "" : x).trim();
  const vorlagen = () => (typeof DATEN !== "undefined" && DATEN.fragenVorlagen) || {};
  const saat = (vorlageId, seed) => `frage:${vorlageId}:${seed}`;
  const kennung = seed => typeof seed === "number" && isFinite(seed) ? String(seed) : String(seed).replace(/[^A-Za-z0-9_.-]/g, "_");

  F.alle = function(){
    return Object.values(vorlagen()).map(v => ({id: v.id, titel: v.titel, skill: v.skill, stufe: v.stufe, quelle: v.quelle}));
  };
  F.anzahl = () => Object.keys(vorlagen()).length;
  F.id = (vorlageId, seed) => `gf-${vorlageId}-${kennung(seed)}`;

  /* Die Kernfunktion: reine Funktion von (vorlageId, seed) auf eine fertige Frage. */
  F.erzeugeVoll = function(vorlageId, seed){
    const V = vorlagen()[vorlageId];
    if (!V || typeof V.zahlen !== "function" || typeof V.frage !== "function" ||
        typeof V.loesung !== "function" || typeof V.pruefe !== "function" || typeof V.ablenker !== "function") return null;
    const z = Zufall(saat(vorlageId, seed));
    let p = null;
    try { p = V.zahlen(z); } catch (e) { return null; }
    if (!p || typeof p !== "object") return null;
    const richtig = text(V.loesung(p));
    if (!richtig) return null;
    /* Die falschen Antworten: eigene Denkfehler-Werte der Vorlage, gemischt, ohne Doppelte. */
    const roh = [];
    for (const d of (V.ablenker(p) || [])) {
      const t = text(d && typeof d === "object" ? d.text : d);
      if (t && !roh.includes(t)) roh.push(t);
    }
    const falsch = [];
    for (const t of z.mischen(roh)) { if (t !== richtig && !falsch.includes(t)) falsch.push(t); if (falsch.length === 3) break; }
    if (falsch.length < 3) return null;                       /* Datenfehler: zu wenige brauchbare Ablenker */
    const optionen = z.mischen([richtig, ...falsch]);
    /* Selbstprüfung: genau eine Option besteht `pruefe` – und es ist die aus `loesung`. */
    let treffer = null;
    for (const o of optionen) {
      let ok = false;
      try { ok = V.pruefe(p, o) === true; } catch (e) { ok = false; }
      if (ok) { if (treffer !== null) return null; treffer = o; }
    }
    if (treffer !== richtig) return null;
    const mini = {
      id: F.id(vorlageId, seed), skill: V.skill, stufe: V.stufe, art: V.art || "wahl",
      frage: text(V.frage(p)), schnappschuss: null, optionen,
      richtig: optionen.indexOf(richtig), erklaerung: text(V.erklaerung(p)), quelle: text(V.quelle),
      generiert: true, vorlage: vorlageId,
    };
    /* Längengrenzen der Leiste – gelten für generierte Fragen genauso wie für die festen Minis. */
    if (!mini.frage || !mini.erklaerung || !mini.skill) return null;
    if (mini.frage.length > 140) return null;
    if (optionen.some(o => o.length > 60)) return null;
    if (!(Number.isInteger(mini.richtig) && mini.richtig >= 0 && mini.richtig < optionen.length)) return null;
    return {mini, parameter: p, vorlage: V};
  };

  F.erzeuge = function(vorlageId, seed){
    const x = F.erzeugeVoll(vorlageId, seed);
    return x ? x.mini : null;
  };

  /* Aus der ID zurück zur Frage: die ID trägt Vorlage und Seed (`gf-<vorlage>-<seed>`). */
  F.ausId = function(id){
    const m = /^gf-(.+)-(-?\d+)$/.exec(String(id == null ? "" : id));
    return m ? F.erzeuge(m[1], Number(m[2])) : null;
  };

  F.merken = function(m){
    if (m && m.id) F._register[m.id] = m;
    return m || null;
  };
  F.von = id => F._register[id] || F.ausId(id) || null;

  /* Eine generierte Frage zu einer Fertigkeit – die kleine, klar benannte Anbindung.
     Deterministisch in (skill, seed); `ohne` überspringt bereits gezeigte IDs. Reine Auswahl,
     kein Einhängen in den Datenbestand (das macht der Aufrufer). */
  F.fuerSkill = function(skill, {ohne = [], seed = 1} = {}){
    const kand = Object.values(vorlagen()).filter(v => v.skill === skill);
    if (!kand.length) return null;
    /* Ein unbrauchbarer Seed (Text, NaN) fällt auf 1 zurück – nie auf einen Zufallswert. */
    const basis = Number.isFinite(Number(seed)) ? Number(seed) : 1;
    const z = Zufall(`fuerSkill:${skill}:${basis}`);
    for (let versuch = 0; versuch < kand.length * 4; versuch++) {
      const V = kand[z.zahl(kand.length)];
      const m = F.erzeuge(V.id, basis + versuch * 1013);
      if (m && !ohne.includes(m.id)) return m;
    }
    return null;
  };

  return F;
})();
