"use strict";
/* ---------- Spielgefühl (Design – Spielspaß 2.0, Hebel 6 „Juice“; Architektur § 9.2) ----------
   UI.juice(el, art, ms?) setzt kurz die Klasse jc-<art> (Animation in stil/juice.css) und nimmt sie wieder weg.
   Nichts bei Bewegung „reduziert“/„aus“ – dort bleibt die ruhige Rückmeldung (Farbe, Text) der jeweiligen Stelle.
   Stellen (≈ 12): Gerät gesetzt (plop) · Kabel rastet ein + Port-LEDs (einrasten) · Gerät antwortet (atmen) ·
   Fehler wackelt sanft statt rot zu blitzen (wackeln) · Sperre greift (sperre) · Ziel-Haken (haken) · Werkzeug und
   Fach gewählt (wahl) · Euro kommt an (geld) · Sterne glänzen (sterne) · Knöpfe geben nach (Druck, nur CSS) ·
   dazu vorhanden: Euro zählt hoch, Abnahme-Knopf pulsiert, Aufstiegsfeier. */
UI.juice = function(el, art, ms = 1000){
  if (!el || !art || !el.classList || UI.bewegung() !== "voll") return false;
  const k = "jc-" + art;
  el.classList.remove(k);
  void el.getBoundingClientRect();              /* Neustart der Animation, wenn sie gerade läuft */
  el.classList.add(k);
  el._jc ||= {};
  clearTimeout(el._jc[k]);
  el._jc[k] = setTimeout(() => el.classList.remove(k), ms);
  return true;
};
