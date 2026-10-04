"use strict";
/* ---------- Spiel: Ton-Regel (Design – Spielspaß 2.0, Hebel 6 und R7 „Ruhe“; Architektur § 9.2) ----------
   Spiel.tonPegel(ton, {modus, fokus}) → Lautstärke 0..1 für ui/klang.js
     ton    Einstellung "aus" | "leise" (Standard) | "normal"
     modus  "voll" | "leiste" | "tray" – nur die Vollansicht klingt; Leiste und Tray bleiben IMMER stumm
     fokus  false, wenn das Fenster im Hintergrund ist → stumm (kein Geräusch aus dem Nichts) */
Spiel.TON_PEGEL = {aus: 0, leise: 0.18, normal: 0.4};

Spiel.tonPegel = function(ton, {modus = "voll", fokus = true} = {}){
  if (modus !== "voll" || !fokus) return 0;
  const p = Spiel.TON_PEGEL[ton];
  return typeof p === "number" ? p : Spiel.TON_PEGEL.leise;
};
