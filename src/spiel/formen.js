"use strict";
/* ---------- Auftragsformen (Design – Spielspaß 2.0, Hebel 9; Plan – Ausbau 1.2, E1; Architektur § 9.6) ----------
   Jede Form hat ihren eigenen Rhythmus und übt etwas anderes. Handgeschriebene Aufträge tragen ihre Form in art/form,
   generierte Formen (Fernwartung, Plan-Audit, Adressplan) liefern ihre Generatoren in Spiel.formGeneratoren. */
Spiel.FORMEN = {
  stoerung: {titel: "Störung", sym: "🔧", text: "Etwas geht nicht mehr – Ursache finden und beheben."},
  projekt: {titel: "Projekt", sym: "🏗", text: "Etwas Neues aufbauen und abnehmen lassen."},
  terminal: {titel: "Terminal", sym: ">_", text: "Die Arbeit passiert im Terminal eines Rechners."},
  forensik: {titel: "Fernwartung", sym: "🛰", text: "Nur ein Rechner per Fernwartung – das Netz siehst du nicht, nur was die Befehle zeigen."},
  audit: {titel: "Plan-Audit", sym: "📐", text: "Der Netzplan des Kunden hat Fehler – vergleiche mit dem Netz und markiere sie."},
  beratung: {titel: "Adressplan", sym: "🧮", text: "Ein Netz für Abteilungen aufteilen: Adressplan rechnen."},
  hotline: {titel: "Hotline", sym: "☎", text: "Der Kunde ruft an: erst gezielt nachfragen, dann beheben."},
};
/* Form eines Auftrags: def.form, sonst aus der Art (Wartung und Wiederholung sind Störungen) */
Spiel.formVon = def => !def ? "stoerung" : def.form || (def.art === "projekt" || def.art === "terminal" ? def.art : "stoerung");

/* Risiko aus Sicht des Spielers: was ein Fehlversuch kostet (Stufenregeln § 6) */
Spiel.RISIKO = {
  E: {stufe: 1, text: "gering", warum: "Einstieg: Fehlversuche kosten nichts."},
  AP1: {stufe: 2, text: "mittel", warum: "AP1: Ab dem zweiten Abnahmeversuch kostet es ½ Stern."},
  AP2: {stufe: 3, text: "hoch", warum: "AP2: Ab dem zweiten Abnahmeversuch kostet es 1 Stern, ungespeicherte Änderungen fallen durch."},
};
Spiel.risikoVon = def => Spiel.RISIKO[(Spiel.niveauFuer ? Spiel.niveauFuer(def) : def && def.stufe) || "E"] || Spiel.RISIKO.E;

/* Generatoren je Form (spiel/forensik.js, audit.js, beratung.js tragen sich ein – sie laden vor dieser Datei) */
Spiel.formGeneratoren = Spiel.formGeneratoren || {};
Spiel.FORM_AB = {forensik: 1, audit: 1, beratung: 2};       /* ab welcher Karriere-Stufe eine generierte Form angeboten wird */
Spiel.generierte = Spiel.generierte || {};
Spiel.generiereForm = function(form, seed, opts = {}){
  const id = `form-${form}-${seed}`;
  if (Spiel.generierte[id]) return Spiel.generierte[id];
  const g = Spiel.formGeneratoren[form];
  if (!g) throw new Error("Keine generierbare Form: " + form);
  const def = g(seed, opts, id);
  if (!def) throw new Error(`Form ${form}: kein Auftrag für Seed ${seed}`);
  Object.assign(def, {id, form, generiert: true});
  Spiel.generierte[id] = def;
  return def;
};

/* Formen der letzten Abschlüsse (ohne Prüfung und Tagesrätsel) – für Mischer und Tagebuch */
Spiel.formVerlauf = (st = Spiel.st) => (st.erledigt || []).filter(e => e.quelle !== "pruefung" && e.quelle !== "raetsel").slice(-12).map(e => e.form || "stoerung");
