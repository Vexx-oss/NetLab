"use strict";
/* ---------- Spiel: ein Ticket bearbeiten ----------
   Start-Netz bauen (Fabrik + Fehler), Instanz öffnen, Verlauf (Rückgängig) je Instanz im Speicher,
   Autospeichern nach jeder Änderung, Ziele live prüfen, Regressions-Grundlinie messen, zurücksetzen. */

Spiel._lz = Spiel._lz || {};                  /* Laufzeit je Instanz (nicht gespeichert): {verlauf, netz, startNetz, ziele} */
Spiel.AUTOSPEICHERN_MS = 400;
Spiel.ARBEIT_LUECKE_MS = 2 * 60 * 1000;       /* längere Pausen zählen nicht als Arbeitszeit */
Spiel.REGRESSION_MAX = 45;                    /* höchstens so viele Paare messen */

/* Start-Netz einer Instanz: z = Zufall(seed); netz = def.netz(z); dann def.fehler mit demselben z.
   Der Generator (Spiel.fehlerAnwenden) setzt die Fehler; ohne ihn bleibt das Netz, wie die Fabrik es liefert. */
Spiel.startNetz = function(def, seed){
  const z = Zufall(seed);
  const netz = typeof def.netz === "function" ? def.netz(z) : tief(def.netz || Modell.neu());
  if (!netz.zustand) netz.zustand = {_uhr: 0};
  if (def.fehler && def.fehler.length) {
    if (typeof Spiel.fehlerAnwenden === "function") Spiel.fehlerAnwenden(netz, def.fehler, z);
    else typeof console !== "undefined" && console.warn("Spiel.fehlerAnwenden fehlt – Fehler von " + def.id + " nicht gesetzt.");
  }
  return netz;
};

/* Laufzeitdaten einer Instanz; der Verlauf hängt am Netz-Objekt und wird neu gebaut, wenn es ausgetauscht wurde */
Spiel.laufzeit = function(inst){
  const lz = (Spiel._lz[inst.iid] ||= {});
  if (lz.netz !== inst.netz) { lz.netz = inst.netz; lz.verlauf = Modell.verlauf(inst.netz); }
  return lz;
};
Spiel.verlaufVon = inst => Spiel.laufzeit(inst).verlauf;
Spiel.startNetzVon = function(inst){
  const lz = Spiel.laufzeit(inst);
  if (!lz.startNetz) lz.startNetz = Spiel.startNetz(Spiel.defVon(inst), inst.seed);
  return lz.startNetz;
};
/* Zu welcher Instanz gehört dieses Netz-Objekt? */
Spiel.instanzVonNetz = netz => netz ? Spiel.st.postfach.find(i => i.netz === netz) || null : null;

/* Ticket öffnen: aktiv setzen, gelesen, Niveau bestimmen, Grundlinie für den Regressionstest messen */
Spiel.oeffnen = function(iid){
  const inst = Spiel.instanz(iid);
  if (!inst) throw new Error("Ticket nicht im Postfach: " + iid);
  const def = Spiel.defVon(inst);
  const st = Spiel.st;
  st.aktiv = iid;
  inst.gelesen = true;
  inst.geoeffnet ||= jetzt();
  inst.fortschritt ||= jetzt();
  const lz = Spiel.laufzeit(inst);
  lz.letzteArbeit = jetzt();
  Spiel.tagebuch.weiter();                    /* Weiterspiel-Rate: nächster Auftrag binnen 2 min? */
  Spiel.niveauAktualisieren();
  if (!inst.basis) Spiel.basisMessen(inst);
  Spiel.geaendert("ticket-geoeffnet");
  Spiel.melden("ticket-geoeffnet", {inst, def});
  return {inst, def, netz: inst.netz, verlauf: lz.verlauf};
};

/* Ticket auf den Anfangszustand zurücksetzen – als ein Schritt im Verlauf, also selbst rückgängig machbar */
Spiel.zuruecksetzen = function(inst){
  const frisch = tief(Spiel.startNetzVon(inst));
  Spiel.verlaufVon(inst).aendern("Ticket zurückgesetzt", netz => {
    for (const k of Object.keys(netz)) delete netz[k];
    Object.assign(netz, frisch);
  });
  inst.fortschritt = jetzt();
  Spiel.speichern();
  return inst;
};

/* Eine Änderung am Instanz-Netz über den Verlauf ausführen (für Vorführen, Coach, Tests) */
Spiel.aendern = function(inst, beschreibung, fn){ return Spiel.verlaufVon(inst).aendern(beschreibung, fn); };

/* ---- Ziele ---- */
Spiel.simDa = () => typeof Sim !== "undefined" && typeof Sim.pruefeZiel === "function";

/* Ein Ziel prüfen. Sim.pruefeZiel deckt alle Netz-Zieltypen ab; „konfig“ und „gespeichert“ haben hier einen
   eigenen Rückfall (reine Konfigurationsprüfung), falls die Simulation sie (noch) nicht kennt. Arbeitsziele
   („befehl“, „antwort“) hängen am Auftrag, nicht am Netz – ohne inst bleiben sie offen (ok: null). */
Spiel.zielPruefen = function(netz, ziel, inst){
  if (Spiel.istArbeitsziel(ziel)) return inst ? Spiel.arbeitsziel(inst, ziel, netz) : {ok: null, grund: null, trace: null, text: "Wird im Auftrag geprüft"};
  /* „Änderung gesichert“ (E1, Variante sauber/Folgeauftrag): gespeichert UND die startup-config ist nicht mehr die vom Start */
  if (ziel.typ === "gespeichert" && ziel.nachAenderung && inst) {
    const g = netz.geraete[ziel.geraet], s = Spiel.startNetzVon(inst).geraete[ziel.geraet];
    if (g && s && Modell.gleich(g.startup, s.startup)) return {ok: false, grund: "UNSAVED", trace: null, text: `${g.name}: Noch ist keine Änderung gesichert.`};
  }
  if (ziel.typ === "konfig" || ziel.typ === "gespeichert") {
    if (Spiel.simDa()) { try { const r = Sim.pruefeZiel(netz, ziel); if (r && typeof r.ok === "boolean") return r; } catch (e) { /* Rückfall */ } }
    const g = netz.geraete[ziel.geraet];
    if (!g) return {ok: false, grund: "DEVICE_OFF", trace: null, text: "Gerät fehlt"};
    if (ziel.typ === "konfig") {
      const ok = JSON.stringify(Modell.lesen(g.running, ziel.pfad)) === JSON.stringify(ziel.wert);
      return {ok, grund: ok ? null : "KONFIG", trace: null, text: ok ? "passt" : "Konfiguration weicht ab"};
    }
    const ok = !Modell.ungespeichert(g);
    return {ok, grund: ok ? null : "UNSAVED", trace: null, text: ok ? "gespeichert" : "running-config ist nicht gespeichert"};
  }
  if (!Spiel.simDa()) return {ok: null, grund: null, trace: null, text: "Simulation nicht geladen"};
  try { return Sim.pruefeZiel(netz, ziel); }
  catch (e) { return {ok: false, grund: "FEHLER", trace: null, text: "Prüfung fehlgeschlagen: " + (e && e.message || e)}; }
};

/* Alle Ziele eines Tickets prüfen → [{ziel, ok, grund, text, trace}] */
Spiel.zieleStatus = function(inst, netz){
  const def = Spiel.defVon(inst);
  netz = netz || inst.netz;
  const ziele = Spiel.varianten ? Spiel.varianten.ziele(inst, def) : (def.ziele || []);      /* E1: Provisorium/sauber ändern die Ziele */
  return ziele.map(ziel => { const r = Spiel.zielPruefen(netz, ziel, inst) || {}; return {ziel, ok: r.ok, grund: r.grund || null, text: r.text || "", trace: r.trace || null}; });
};

/* Live-Stand merken; meldet, wenn mehr Ziele erfüllt sind als vorher (Fortschritt, für Senior-Angebot und ✓-Animation) */
Spiel.zieleLive = function(inst){
  const lz = Spiel.laufzeit(inst);
  const status = Spiel.zieleStatus(inst);
  const n = status.filter(s => s.ok).length;
  const vorher = lz.zieleOk ?? null;
  lz.zieleOk = n; lz.ziele = status;
  if (vorher != null && n > vorher) { inst.fortschritt = jetzt(); }
  const neuOk = vorher == null ? [] : status.map((s, i) => s.ok && !(lz.letzte && lz.letzte[i]) ? i : -1).filter(i => i >= 0);
  lz.letzte = status.map(s => !!s.ok);
  return {status, erfuellt: n, gesamt: status.length, neuOk, alle: status.length > 0 && n === status.length};
};

/* ---- Regression: was im Start-Netz ging, muss nachher noch gehen ---- */
Spiel.HOSTTYPEN = {pc: true, server: true, nas: true};

/* Paare, die für den Regressionstest in Frage kommen: Endgeräte untereinander (ICMP), ohne Geräte,
   die laut Ticket absichtlich ausgesperrt werden (von-Seite eines „blockiert“-Ziels). def.regression:false schaltet ab. */
Spiel.regressionsPaare = function(def, netz){
  if (def.regression === false) return [];
  const ohne = new Set([...(def.ziele || []).filter(z => z.typ === "blockiert").map(z => z.von), ...(def.regressionOhne || [])]);
  const hosts = Object.values(netz.geraete).filter(g => Spiel.HOSTTYPEN[g.typ] && !ohne.has(g.id)).map(g => g.id).sort();
  const paare = [];
  for (let i = 0; i < hosts.length; i++) for (let j = i + 1; j < hosts.length; j++) paare.push({von: hosts[i], nach: hosts[j]});
  return paare.slice(0, Spiel.REGRESSION_MAX);
};

Spiel.basisMessen = function(inst){
  if (!Spiel.simDa()) return null;
  const def = Spiel.defVon(inst);
  const start = Spiel.startNetzVon(inst);
  const basis = [];
  for (const p of Spiel.regressionsPaare(def, start)) {
    const r = Spiel.zielPruefen(start, {typ: "erreichbar", von: p.von, nach: p.nach, proto: "icmp"});
    if (r && r.ok) basis.push(p);
  }
  inst.basis = basis;
  return basis;
};

/* Regressionstest auf einem Netz: [{von, nach, ok, grund, text, trace}] für alle Basis-Paare */
Spiel.regressionPruefen = function(inst, netz){
  if (!inst.basis) Spiel.basisMessen(inst);
  const liste = [];
  for (const p of inst.basis || []) {
    if (!netz.geraete[p.von] || !netz.geraete[p.nach]) { liste.push({von: p.von, nach: p.nach, ok: false, grund: "DEVICE_OFF", text: "Gerät entfernt", trace: null}); continue; }
    const r = Spiel.zielPruefen(netz, {typ: "erreichbar", von: p.von, nach: p.nach, proto: "icmp"}) || {};
    liste.push({von: p.von, nach: p.nach, ok: r.ok !== false, grund: r.grund || null, text: r.text || "", trace: r.trace || null});
  }
  return liste;
};

/* ---- Autospeichern und Arbeitszeit ---- */
Spiel.hoererAnmelden = function(){
  if (Spiel._hoererAn) return;
  Spiel._hoererAn = true;
  Bus.an("netz-geaendert", d => {
    if (Spiel._trocken) return;
    const inst = Spiel.instanzVonNetz(d && d.netz);
    if (!inst) return;
    const lz = Spiel.laufzeit(inst), t = jetzt();
    const luecke = lz.letzteArbeit ? t - lz.letzteArbeit : 0;
    inst.zeitMs = (inst.zeitMs || 0) + Math.min(luecke, Spiel.ARBEIT_LUECKE_MS);
    if (Spiel.ereignisse) Spiel.ereignisse.aktivZaehlen(Math.min(luecke, Spiel.ARBEIT_LUECKE_MS));   /* Ereignis-Takt zählt nur aktive Zeit */
    lz.letzteArbeit = t;
    Spiel.tagebuch.aktiv();
    Spiel.autospeichern();
  });
};
Spiel.autospeichern = function(){
  if (typeof setTimeout === "undefined") return Spiel.speichern();
  if (Spiel._autoTimer) clearTimeout(Spiel._autoTimer);
  Spiel._autoTimer = setTimeout(() => { Spiel._autoTimer = null; Spiel.speichern(); }, Spiel.AUTOSPEICHERN_MS);
};
Spiel.sofortSpeichern = function(){
  if (Spiel._autoTimer) { clearTimeout(Spiel._autoTimer); Spiel._autoTimer = null; }
  Spiel.speichern();
};

/* Geräte, die der Spieler geändert und nicht gespeichert hat (für den „Ungespeichert“-Hinweis) */
Spiel.ungespeicherteGeraete = function(inst){
  const start = Spiel.startNetzVon(inst);
  return Object.values(inst.netz.geraete).filter(g => Modell.IOS[g.typ] && Modell.ungespeichert(g) &&
    !(start.geraete[g.id] && Modell.gleich(start.geraete[g.id].running, g.running)));
};
/* Soll der Hinweis erscheinen? Ticket verlangt Speichern oder Niveau AP1/AP2 */
Spiel.speichernErwartet = function(def, niveau){
  return (def.ziele || []).some(z => z.typ === "gespeichert") || (def.skills || []).includes("lab.speichern") || niveau === "AP1" || niveau === "AP2";
};
