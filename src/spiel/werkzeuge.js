"use strict";
/* ---------- Werkzeuge: Euro kauft Fähigkeiten (Design – Spielspaß 2.0, Hebel 8, Welle 2 v1; Architektur § 9.4) ----------
   Zusätze, die man spürt – nie die Kernwerkzeuge (Simulation, Inspektor, Konsole, Hilfe und Wiki bleiben frei):
     Kabeltester  Rechtsklick auf ein Kabel → „Kabel testen“: Link oben/unten, Ergebnis als Beweiskarte in der Akte
     Netzprüfer   im AP-Niveau am Auftrag zuschaltbar (⋯-Menü): die „!“-Hinweise am Gerät erscheinen wieder –
                  bezahlte Hilfe im Sinne von R1, ohne Sternabzug
   st.werkzeuge = {kabeltester:bool, netzpruefer:bool} */
Spiel.werkzeug = {};
Spiel.WERKZEUGE = {
  kabeltester: {titel: "Kabeltester", preis: 40, ab: 1, text: "Rechtsklick auf ein Kabel: Hat es Link? Das Ergebnis landet als Beweis in der Akte."},
  netzpruefer: {titel: "Netzprüfer", preis: 150, ab: 2, text: "Schaltet im AP-Niveau die „!“-Hinweise an den Geräten zu (⋯-Menü im Auftrag) – Hilfe gegen Euro statt gegen Sterne."},
};
Spiel.werkzeug.daten = function(st = Spiel.st){
  if (!st.werkzeuge || typeof st.werkzeuge !== "object" || Array.isArray(st.werkzeuge)) st.werkzeuge = {};
  return st.werkzeuge;
};
Spiel.werkzeug.hat = id => !!(Spiel._st && Spiel.werkzeug.daten()[id]);
Spiel.werkzeug.kaufen = function(id){
  const w = Spiel.WERKZEUGE[id];
  if (!w) return {ok: false, grund: "Unbekanntes Werkzeug."};
  if (Spiel.werkzeug.hat(id)) return {ok: false, grund: "Hast du schon."};
  if (Spiel.st.stufe < w.ab) return {ok: false, grund: `Ab Stufe ${w.ab}.`};
  if (!Spiel.karriere.bezahlen(w.preis, "Werkzeug: " + w.titel)) return {ok: false, grund: `Dir fehlen ${eur(w.preis - Spiel.st.euro)} €.`};
  Spiel.werkzeug.daten()[id] = true;
  Spiel.geaendert("werkzeug");
  Spiel.melden("werkzeug", {id});
  return {ok: true, satz: id === "kabeltester" ? "Ab jetzt: Rechtsklick auf ein Kabel – „Kabel testen“." : "Im AP-Niveau: ⋯-Menü im Auftrag – „Netzprüfer einschalten“."};
};
/* Netzprüfer am offenen Auftrag ein-/ausschalten (nur mit Werkzeug, nur AP-Niveaus – im Einstieg sind die Hinweise ohnehin an) */
Spiel.werkzeug.netzpruefer = function(inst, an){
  if (!Spiel.werkzeug.hat("netzpruefer") || !inst) return false;
  inst.netzpruefer = an == null ? !inst.netzpruefer : !!an;
  Spiel.speichern();
  return inst.netzpruefer;
};
Spiel.ergaenzer.werkzeuge = st => { Spiel.werkzeug.daten(st); };
