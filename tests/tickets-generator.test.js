"use strict";
/* Pflicht-Validierung (Konzept § 8.2): Jeder Injektor × passende Vorlage × Seeds:
   (a) Start-Netz bricht ≥ 1 Ziel mit einem erwarteten Grundcode, (b) Lösung erfüllt alle Ziele und die gesunden
   Ziele der Vorlage gelten weiter (Regression), (c) Pflichtfelder gültig. */
function ticketPruefen(def, gruende){
  const fehler = [];
  const skillIds = new Set(DATEN.skills.map(s => s.id));
  for (const f of ["id", "art", "stufe", "karriere", "kunde", "titel", "briefing", "symptom", "skills", "ziele", "hilfen", "loesung", "erklaerung", "quelle", "lohn"]) if (def[f] == null || def[f] === "") fehler.push("Feld fehlt: " + f);
  for (const s of def.skills || []) if (!skillIds.has(s)) fehler.push("unbekannte Fertigkeit " + s);
  const start = def.netz(Zufall(1));
  const erwartet = def.ziele.filter(z => z.erwartet);
  const netzZiele = def.ziele.filter(z => !Spiel.istArbeitsziel(z));
  /* Arbeitsziele (befehl/antwort) sind am Start immer offen – ein Terminal-Auftrag darf ohne Fehler im Netz auskommen */
  if (!erwartet.length && netzZiele.length === def.ziele.length && !def.ziele.some(z => !Sim.pruefeZiel(start, z).ok)) fehler.push("Start-Netz bricht kein Ziel");
  for (const z of def.ziele.filter(Spiel.istArbeitsziel)) {
    if (z.typ === "befehl" && !(z.geraet && z.muster && z.beispiel && new RegExp(z.muster, "i").test(z.beispiel))) fehler.push(`Befehlsziel unvollständig oder Beispiel passt nicht zum Muster: ${z.text}`);
    if (z.typ === "antwort" && !(z.id && z.frage && Spiel.antwortSoll(start, z))) fehler.push(`Antwortziel ohne id/frage oder ohne Wert im Netz: ${z.text}`);
  }
  const gesehen = [];
  for (const z of erwartet) {
    const r = Sim.pruefeZiel(start, z);
    if (r.ok) fehler.push(`Ziel schon im Start erfüllt: ${z.text}`);
    gesehen.push(z.typ === "blockiert" ? "OFFEN" : r.grund);
  }
  if (gruende && erwartet.length && !gesehen.some(g => gruende.includes(g))) fehler.push(`kein Ziel mit erwartetem Grund (${gruende.join("/")}), gesehen: ${gesehen.join(", ")}`);
  if (gruende && erwartet.length && !gruende.includes(gesehen[0])) fehler.push(`erstes Ziel zeigt ${gesehen[0]} statt ${gruende.join("/")}`);
  const netz = def.netz(Zufall(1));
  try { Spiel.loesungAnwenden(netz, def.loesung); } catch (e) { fehler.push("Lösung wirft: " + e.message); return fehler; }
  for (const z of netzZiele) { const r = Sim.pruefeZiel(netz, z); if (!r.ok) fehler.push(`nach Lösung offen: ${z.text} (${r.grund}: ${r.text})`); }
  if (def.vorlage) {
    const V = Spiel.vorlagen[def.vorlage];
    for (const z of V.bauen(Zufall(1), {}).ziele) {
      /* Regression mit denselben Geräten: gesunde Ziele der Vorlage müssen nach der Lösung gelten */
      const zz = Object.assign({}, z);
      const r = Sim.pruefeZiel(netz, zz);
      if (!r.ok && !/^\d/.test(String(zz.nach))) fehler.push(`Regression: ${z.text} (${r.grund})`);
    }
  }
  return fehler;
}

gruppe("Generator", () => {
  pruefe("Jeder Injektor × passende Vorlage × 8 Seeds: Fehler bricht mit erwartetem Grund, Lösung heilt alles", () => {
    const fehler = []; let gebaut = 0, leer = 0;
    for (const inj of Object.values(Spiel.INJEKTOREN)) for (const v of inj.vorlagen) for (let s = 1; s <= 8; s++) {
      let def;
      try { def = Spiel.ticketBauen({id: `t-${inj.name}-${v}-${s}`, vorlage: v, vSeed: s * 101, injektoren: [{name: inj.name, wahl: s}], stufe: "E"}); }
      catch (e) { fehler.push(`${inj.name}/${v}/${s}: wirft ${e.message}`); continue; }
      if (!def) { leer++; continue; }
      gebaut++;
      for (const f of ticketPruefen(def, inj.gruende)) fehler.push(`${inj.name}/${v}/${s}: ${f}`);
    }
    if (fehler.length) console.log(fehler.join(String.fromCharCode(10))); erwarte.gleich(fehler.length, 0, `${gebaut} gebaut, ${leer} ohne Wirkung`);
    erwarte.wahr(gebaut > 150, `nur ${gebaut} Tickets gebaut`);
  });
  pruefe("Jede Fertigkeit der Stufen 1–5 ist generierbar – Port-Security eingeschlossen", () => {
    /* Bis 1.3 stand hier „außer Port-Security“: Die Fertigkeit hatte keinen Injektor. Seit dem Injektor
       portsec-fremde-mac (Ausbau 1.3) gilt die Ausnahme nicht mehr. */
    const fehlt = [];
    for (const s of DATEN.skills.filter(x => x.stufe <= 5)) {
      try { const d = Spiel.generiere(s.id, 42); if (!d.ziele.length) fehlt.push(s.id); } catch (e) { fehlt.push(s.id + ": " + e.message); }
    }
    erwarte.gleich(fehlt, []);
  });
  pruefe("generiere ist deterministisch und liefert gültige Tickets für 60 Seeds", () => {
    const fehler = [];
    for (let s = 1; s <= 60; s++) {
      const skill = DATEN.skills[s % 24].id;
      delete Spiel.generierte[`gen-${skill}-${s}`];
      const a = Spiel.generiere(skill, s); delete Spiel.generierte[a.id];
      const b = Spiel.generiere(skill, s);
      if (JSON.stringify(a.netz(Zufall(1))) !== JSON.stringify(b.netz(Zufall(1)))) fehler.push(`${skill}/${s}: nicht deterministisch`);
      for (const f of ticketPruefen(b, null)) fehler.push(`${b.id}: ${f}`);
    }
    /* Die drei Fertigkeiten der Ausbau-1.3-Injektoren kommen bei `s % 24` nicht vor (Index 24–26 der
       Fertigkeitenliste) – hier ausdrücklich, je Injektor ein Seed. */
    for (const skill of ["lab.portsec", "lab.stp", "lab.storage"]) {
      delete Spiel.generierte[`gen-${skill}-7`];
      const a = Spiel.generiere(skill, 7); delete Spiel.generierte[a.id];
      const b = Spiel.generiere(skill, 7);
      if (JSON.stringify(a.netz(Zufall(1))) !== JSON.stringify(b.netz(Zufall(1)))) fehler.push(`${skill}/7: nicht deterministisch`);
      for (const f of ticketPruefen(b, null)) fehler.push(`${b.id}: ${f}`);
    }
    erwarte.gleich(fehler.slice(0, 6), []);
  });

  /* ---------- Die drei Injektoren, die je eine gesperrte Trainingskarte geöffnet haben (Ausbau 1.3) ----------
     Je Injektor ein namentlicher Fall: Das Ticket wird gebaut, das erste Ziel bricht mit dem erwarteten Grund,
     die Lösung heilt alle Netzziele, und die gesunden Ziele der Vorlage gelten weiter (ticketPruefen). Die
     Wirkung IM Netz (Port wirklich err-disabled, Lauf wirklich mit STORM, NAS wirklich ohne Adresse) und die
     drei Trainingskarten prüft tests/injektoren-neu.test.js. */
  const neuerFall = (name, vorlage) => {
    const def = Spiel.ticketBauen({id: `neu-${name}`, vorlage, vSeed: 101, injektoren: [{name, wahl: 1}], stufe: "E"});
    erwarte.wahr(!!def, `${name}/${vorlage}: kein Ticket gebaut`);
    const erwartet = def.ziele.filter(z => z.erwartet);
    erwarte.wahr(erwartet.length >= 1, `${name}: kein gebrochenes Ziel`);
    erwarte.gleich(ticketPruefen(def, Spiel.INJEKTOREN[name].gruende), [], `${name}/${vorlage}`);
    return def;
  };

  pruefe("Neuer Injektor portsec-fremde-mac: Ziel bricht mit PORTSEC_VIOLATION, Lösung heilt (4 Vorlagen)", () => {
    for (const v of ["lan", "praxis", "standorte", "dmz"]) {
      const def = neuerFall("portsec-fremde-mac", v);
      erwarte.gleich(def.ziele.filter(z => z.erwartet)[0].erwartet, "PORTSEC_VIOLATION", v + ": Grund des ersten Ziels");
    }
  });
  pruefe("Neuer Injektor stp-doppelkabel: Ziel bricht mit STORM, der Rückbau der Zusatzleitungen heilt", () => {
    const def = neuerFall("stp-doppelkabel", "standorte");
    erwarte.gleich(def.ziele.filter(z => z.erwartet)[0].erwartet, "STORM", "Grund des ersten Ziels");
    erwarte.gleich(def.fehlerstellen, [{injektor: "stp-doppelkabel", stelle: "sw1|sw2"}], "Fehlerstelle nachprüfbar");
  });
  pruefe("Neuer Injektor nas-ohne-adresse: Ziel bricht mit NO_IP, die Adresse des alten Servers heilt", () => {
    const def = neuerFall("nas-ohne-adresse", "standorte");
    erwarte.gleich(def.ziele.filter(z => z.erwartet)[0].erwartet, "NO_IP", "Grund des ersten Ziels");
    erwarte.gleich(def.fehlerstellen, [{injektor: "nas-ohne-adresse", stelle: "srv"}], "Fehlerstelle nachprüfbar");
  });
});
