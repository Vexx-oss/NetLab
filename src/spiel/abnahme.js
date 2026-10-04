"use strict";
/* ---------- Spiel: Abnahme, Sterne, Abschluss, Durchspiel-Test ----------
   Abnahme (Konzept § 3.5): jedes Ziel ✓/✗ mit Grund, Regression („nichts, was vorher ging, ist kaputt“),
   Neustart-Test (Kopie: alle IOS-Geräte neu starten → nur Gespeichertes bleibt).
   Folgen je Niveau: Neustart-Verlust bei E nur Hinweis, bei AP1 Hinweis und −½ Stern, bei AP2 nicht bestanden.
   Kollateralschaden (ein Basis-Paar geht nicht mehr) = nicht bestanden, mit Erklärung. */

Spiel.TEMPO_BONUS = 0.1;          /* Anteil am Lohn, wenn in der geschätzten Zeit gelöst */

Spiel.geraetName = (netz, id) => (netz && netz.geraete[id] && netz.geraete[id].name) || id;

/* Spiel.abnahme(inst, {neustartTest}) → {ergebnisse, bestanden, regression, kollateral, neustart, sterne, abzuege, niveau, def} */
Spiel.abnahme = function(inst, {neustartTest = true} = {}){
  const def = Spiel.defVon(inst);
  const niveau = Spiel.niveauVon(inst);
  const netz = inst.netz;
  const ergebnisse = Spiel.zieleStatus(inst, netz);
  const regression = Spiel.regressionPruefen(inst, netz);
  const kollateral = regression.filter(r => !r.ok).map(r => Object.assign({}, r, {vonName: Spiel.geraetName(netz, r.von), nachName: Spiel.geraetName(netz, r.nach)}));

  /* Neustart-Test auf einer Kopie: nur sinnvoll, wenn es ungespeicherte IOS-Geräte gibt */
  const neustart = {geprueft: false, verlust: false, geraete: [], ergebnisse: [], verloren: []};
  if (neustartTest) {
    neustart.geprueft = true;
    const kopie = Modell.kopie(netz);
    const ios = Object.values(kopie.geraete).filter(g => Modell.IOS[g.typ]);
    neustart.geraete = ios.filter(g => Modell.ungespeichert(g)).map(g => ({id: g.id, name: g.name}));
    if (neustart.geraete.length) {
      for (const g of ios) Modell.neustart(kopie, g.id);
      neustart.ergebnisse = Spiel.zieleStatus(inst, kopie);
      neustart.verloren = neustart.ergebnisse.map((e, i) => (ergebnisse[i].ok && e.ok === false) ? i : -1).filter(i => i >= 0);
      neustart.verlust = neustart.verloren.length > 0;
    }
  }

  const zieleOk = ergebnisse.length > 0 && ergebnisse.every(e => e.ok === true);
  const bestanden = zieleOk && kollateral.length === 0 && !(niveau === "AP2" && neustart.verlust);
  const {sterne, abzuege} = Spiel.sterneBerechnen(inst, {niveau, neustartVerlust: neustart.verlust});
  const abnahme = {def, niveau, ergebnisse, regression, kollateral, neustart, bestanden, sterne: bestanden ? sterne : 0, abzuege, zeit: jetzt()};
  inst.abnahmen = (inst.abnahmen || 0) + 1;
  return abnahme;
};

/* Sterne: 5, minus Hilfen (Stufe 4: −½, 5: −½, 6: −1), minus ½ bei AP1, wenn ein Neustart die Lösung löschen würde. Mindestens 1. */
Spiel.sterneBerechnen = function(inst, {niveau, neustartVerlust} = {}){
  const abzuege = [];
  const h = inst.hilfeStufe || 0;
  if (h >= 4) abzuege.push({text: "Hilfe: Bereich markiert", sterne: 0.5});
  if (h >= 5) abzuege.push({text: "Hilfe: konkreter Hinweis", sterne: 0.5});
  if (h >= 6) abzuege.push({text: "Hilfe: Lösung vorgeführt", sterne: 1});
  if (neustartVerlust && niveau === "AP1") abzuege.push({text: "Nicht gespeichert: Nach einem Neustart wäre die Änderung weg", sterne: 0.5});
  const summe = abzuege.reduce((s, a) => s + a.sterne, 0);
  return {sterne: Math.max(1, 5 - summe), abzuege};
};

/* Lohn: Grundlohn × (0,5 + 0,1 × Sterne) + kleiner Tempo-Bonus; Ruf voll ab 3 Sternen, sonst halb */
Spiel.lohnBerechnen = function(inst, def, sterne){
  const lohn = def.lohn || {euro: 20, ruf: 1};
  const grund = Math.round((lohn.euro || 0) * (0.5 + 0.1 * sterne));
  const minuten = Spiel.minuten(def) || 5;
  const tempo = (inst.hilfeStufe || 0) < 6 && (inst.zeitMs || 0) > 0 && inst.zeitMs <= minuten * 60000 ? Math.max(1, Math.round((lohn.euro || 0) * Spiel.TEMPO_BONUS)) : 0;
  const ruf = sterne >= 3 ? (lohn.ruf || 0) : Math.floor((lohn.ruf || 0) / 2);
  return {euro: grund + tempo, grund, tempo, ruf};
};

/* Kundensatz (z. B. Dank) passend zum Ticket, deterministisch je Instanz */
Spiel.kundenSatz = function(kundeId, art, seed){
  const k = Spiel.kundenDaten(kundeId);
  const s = k.saetze && k.saetze[art];
  if (!s) return art === "dank" ? "Danke, läuft wieder!" : "";
  if (typeof s === "string") return s;
  if (Array.isArray(s) && s.length) return s[Math.abs(seed || 0) % s.length];
  return "";
};

/* Spiel.abschliessen(inst, abnahme) → Ergebnis für den Ergebnisbildschirm.
   Nicht bestanden: nichts wird abgezogen, das Ticket bleibt offen (Lernmotor und Fehlerheft werden informiert). */
Spiel.abschliessen = function(inst, abnahme){
  const def = Spiel.defVon(inst);
  abnahme = abnahme || Spiel.abnahme(inst);
  const lz = Spiel.laufzeit(inst);
  if (lz.letzteArbeit) { inst.zeitMs = (inst.zeitMs || 0) + Math.min(jetzt() - lz.letzteArbeit, Spiel.ARBEIT_LUECKE_MS); lz.letzteArbeit = jetzt(); }
  const lernen = Spiel.lernenNachAbnahme(inst, def, abnahme);
  if (!abnahme.bestanden) {
    Spiel.speichern();
    return {bestanden: false, abnahme, lernen, def, inst};
  }
  const st = Spiel.st;
  const sterne = abnahme.sterne;
  const lohn = Spiel.lohnBerechnen(inst, def, sterne);
  st.erledigt.push({id: def.id, sterne, tag: heute(), hilfe: inst.hilfeStufe || 0, quelle: inst.quelle, niveau: abnahme.niveau, zeitMs: inst.zeitMs || 0, kunde: inst.kunde || def.kunde || null});
  if (st.erledigt.length > 2000) st.erledigt.splice(0, st.erledigt.length - 2000);
  if (inst.kunde) {
    const k = Spiel.kunde(inst.kunde);
    k.sterne.push(sterne);
    if (k.sterne.length > 20) k.sterne.splice(0, k.sterne.length - 20);
  }
  Spiel.instanzEntfernen(inst.iid);
  if (!st.einstieg.fertig && def.id === Spiel.EINSTIEG_TICKET) st.einstieg.fertig = true;
  Spiel.gutschreiben(lohn.euro, lohn.ruf, `Ticket „${def.titel}“ (${"★".repeat(Math.floor(sterne))}${sterne % 1 ? "½" : ""})`);
  Spiel.postfachAuffuellen();
  const naechstes = Spiel.postfach()[0] || null;
  const ergebnis = {
    bestanden: true, abnahme, lernen, def, inst, sterne, euro: lohn.euro, ruf: lohn.ruf, lohn,
    dank: Spiel.kundenSatz(inst.kunde, "dank", inst.seed), erklaerung: def.erklaerung || "", quelle: def.quelle || "",
    naechstes: naechstes ? naechstes.iid : null,
  };
  Spiel.geaendert("ticket-geloest");
  Spiel.melden("ticket-geloest", {inst, def, sterne, hilfeStufe: inst.hilfeStufe || 0, skills: def.skills || [], euro: lohn.euro, ruf: lohn.ruf});
  return ergebnis;
};

/* Lösungsschritt anwenden. Vorrang hat der Generator (Spiel.schrittAnwenden, kennt auch „aktion“);
   dieser Rückfall kann nur die beiden Formen aus Architektur § 7.1: setzen und cli. */
Spiel.schrittAnwendenRueckfall = function(netz, schritt){
  if (schritt.setzen) for (const [pfad, wert] of Object.entries(schritt.setzen)) Modell.setzen(netz, schritt.geraet, pfad, wert);
  if (schritt.cli) {
    if (typeof CLI === "undefined" || typeof CLI.anwenden !== "function") throw new Error("Konsole (CLI.anwenden) fehlt");
    const r = CLI.anwenden(netz, schritt.geraet, schritt.cli);
    if (r && r.ok === false) throw new Error("CLI: " + (r.fehler || []).join("; "));
  }
  if (!schritt.setzen && !schritt.cli) throw new Error("Schritt ohne setzen/cli braucht Spiel.schrittAnwenden (Generator)");
};
Spiel.schritt = (netz, schritt) => (typeof Spiel.schrittAnwenden === "function" ? Spiel.schrittAnwenden : Spiel.schrittAnwendenRueckfall)(netz, schritt);
Spiel.loesung = function(netz, loesung){
  if (typeof Spiel.loesungAnwenden === "function") return Spiel.loesungAnwenden(netz, loesung);
  for (const s of loesung || []) Spiel.schrittAnwendenRueckfall(netz, s);
};

/* Durchspiel-Test (Konzept § 10.5): Tickets automatisch durchspielen – Instanz erstellen → öffnen → Lösung
   anwenden → Abnahme → abschließen – in einem Wegwerf-Spielstand. Der echte Spielstand, der Lernstand und
   der Bus bleiben unberührt. Spiel.testlauf({ids?, niveau?, gen?:[{skill, seed}]}) → [{id, bestanden, sterne, fehler, startVerletzt}] */
Spiel.testlauf = function({ids, niveau, gen} = {}){
  const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken, gen: Object.assign({}, Spiel.generierte)};
  const ergebnisse = [];
  try {
    Spiel._trocken = true; Spiel._lz = {};
    Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
    Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
    const auftraege = [...(ids || (gen ? [] : Spiel.ticketReihe().map(t => t.id))).map(id => ({ticketId: id})), ...(gen || []).map(g => ({gen: g}))];
    for (const a of auftraege) {
      const r = {id: a.ticketId || (a.gen.skill + "#" + a.gen.seed), bestanden: false, sterne: 0, fehler: [], startVerletzt: null};
      try {
        const inst = Spiel.instanzErstellen(Object.assign({quelle: "pruefung"}, a));
        const def = Spiel.defVon(inst);
        r.id = def.id;
        Spiel._einst.wahl = niveau || def.stufe || "E";
        Spiel.oeffnen(inst.iid);
        const vorher = Spiel.zieleStatus(inst);
        r.startVerletzt = vorher.some(e => e.ok === false);
        if (!r.startVerletzt) r.fehler.push("Das Start-Netz erfüllt schon alle Ziele.");
        Spiel.loesung(inst.netz, def.loesung);
        const ab = Spiel.abnahme(inst);
        r.bestanden = ab.bestanden; r.sterne = ab.sterne; r.niveau = ab.niveau;
        if (!ab.bestanden) for (const f of Spiel.fehlschlaege(ab)) r.fehler.push(f.text);
        const erg = Spiel.abschliessen(inst, ab);
        if (ab.bestanden && !erg.bestanden) r.fehler.push("Abschluss fehlgeschlagen");
      } catch (e) { r.fehler.push(String(e && e.message || e)); }
      ergebnisse.push(r);
    }
  } finally {
    Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
  }
  return ergebnisse;
};
