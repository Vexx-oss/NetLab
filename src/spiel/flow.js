"use strict";
/* ---------- Flow-Regler (Design – Spielspaß 2.0, Hebel 12 / § 20 F6; Architektur § 9.8) ----------
   Die Schwierigkeit hängt nicht mehr nur am Niveau: Je Fertigkeit merkt sich das Spiel die letzten Ergebnisse.
     zwei Fehlschläge in Folge  → Gerüst       Der nächste Auftrag dieser Fertigkeit beginnt mit der Frage des Seniors (frei),
                                               zeigt Haken und Warnungen wie im Einstieg, ein zweiter Abnahmeversuch kostet nichts,
                                               und Generiertes kommt eine Nummer kleiner (ein Niveau tiefer, ein Ziel).
     drei Glanzergebnisse       → Verwicklung  Der nächste generierte Auftrag dieser Fertigkeit hat einen zweiten Fehler bzw. ist
                                               eine Nummer größer; „!“-Warnungen und das Hilfsangebot des Seniors bleiben aus.
   Fehlschlag = bezahlte Hilfe (ab „Bereich zeigen“) oder mehr als ein Abnahmeversuch. Glanz = 5 Sterne im ersten Versuch,
   ohne den Senior zu fragen. Ein gewöhnlicher Erfolg setzt beides zurück. Nie Fortschrittsverlust (R6): Es ändert sich nur,
   wie der nächste Auftrag gebaut und begleitet wird.
   Einstellung einst.anpassung = "auto" (Standard) | "manuell" (nichts passt sich an).
   st.flow = { [skill]: {letzte:["f"|"n"|"g"] (höchstens 5), stand:"normal"|"geruest"|"verwicklung"} }
   inst.flow = "geruest"|"verwicklung"|null – beim Erstellen festgehalten, ändert sich mitten im Auftrag nicht. */
Spiel.FLOW = {GERUEST_NACH: 2, VERWICKLUNG_NACH: 3, MERKEN: 5};
Spiel.flow = (() => {
  const alle = (st = Spiel.st) => (st.flow && typeof st.flow === "object" && !Array.isArray(st.flow) ? st.flow : (st.flow = {}));
  const an = () => ((Spiel.einst && Spiel.einst.anpassung) || "auto") !== "manuell";
  const daten = (skill, st = Spiel.st) => { const a = alle(st); return (a[skill] ||= {letzte: [], stand: "normal"}); };
  const NIVEAUS = ["E", "AP1", "AP2"];
  const schieben = (stufe, um) => NIVEAUS[Math.max(0, Math.min(2, NIVEAUS.indexOf(NIVEAUS.includes(stufe) ? stufe : "E") + um))];

  /* Ergebnis eines Auftrags: "f" Fehlschlag, "g" Glanz, "n" gewöhnlich */
  function bewerten(inst, sterne){
    const versuche = inst.abnahmen || 1, hilfe = inst.hilfeStufe || 0;
    if (hilfe >= 4 || versuche >= 2) return "f";
    if (sterne >= 5 && versuche <= 1 && hilfe < 3) return "g";
    return "n";
  }
  function merken(skill, art){
    if (!skill || !["f", "n", "g"].includes(art)) return null;
    const d = daten(skill), vorher = d.stand, F = Spiel.FLOW;
    d.letzte.push(art);
    if (d.letzte.length > F.MERKEN) d.letzte.splice(0, d.letzte.length - F.MERKEN);
    const zuletzt = (n, x) => d.letzte.length >= n && d.letzte.slice(-n).every(y => y === x);
    if (art === "f") d.stand = zuletzt(F.GERUEST_NACH, "f") ? "geruest" : "normal";
    else if (art === "g") d.stand = zuletzt(F.VERWICKLUNG_NACH, "g") ? "verwicklung" : "normal";
    else d.stand = "normal";
    return {skill, vorher, stand: d.stand, art};
  }
  /* Stand für einen neuen Auftrag (Hauptfertigkeit); "manuell" oder normal → null */
  function fuer(def){
    if (!an() || !def) return null;
    const skill = (def.skills || [])[0];
    if (!skill) return null;
    const s = (alle()[skill] || {}).stand;
    return s === "geruest" || s === "verwicklung" ? s : null;
  }
  /* Generiertes eine Nummer kleiner (Gerüst) oder größer (Verwicklung) bauen → {gen, def} | null (geht nicht anders) */
  function anpassen(gen, def, stand){
    if (!gen || !def || !stand) return null;
    try {
      if (gen.form) {
        const stufe = schieben(def.stufe, stand === "geruest" ? -1 : 1);
        if (stufe === def.stufe) return null;
        const opts = Object.assign({}, gen.opts, {stufe});
        return {gen: Object.assign({}, gen, {opts}), def: Spiel.generiereForm(gen.form, gen.seed, opts)};
      }
      if (gen.skill) {
        const opts = Object.assign({}, gen.opts, {flow: stand});
        const neu = Spiel.generiere(gen.skill, gen.seed, opts);
        return neu ? {gen: Object.assign({}, gen, {opts}), def: neu} : null;
      }
    } catch (e) { return null; }
    return null;
  }
  /* Nach einem bestandenen Auftrag: Ergebnis merken → {skill, vorher, stand, art} (Prüfung, Tagesrätsel: nichts) */
  function nachAbschluss(inst, def, {sterne = 0} = {}){
    if (!inst || !def || inst.quelle === "pruefung" || inst.quelle === "raetsel") return null;
    const skill = (def.skills || [])[0];
    return skill ? merken(skill, bewerten(inst, sterne)) : null;
  }
  return {alle, daten, an, bewerten, merken, fuer, anpassen, nachAbschluss, schieben,
    stand: skill => (alle()[skill] || {}).stand || "normal"};
})();
