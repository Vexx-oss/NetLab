"use strict";
/* ---------- „Erklär mir das“ (Ausbau 1.2, A4: Textdiät) ----------
   UI.erklaeren(code, niveau) → Element | null
   Lehrtexte (DATEN.lehrtexte[code] = {E, AP1, AP2, quelle}) erscheinen erst auf Klick, Stufe für Stufe: zuerst in der
   Tiefe des eigenen Niveaus, dann auf Wunsch ausführlicher (AP1 → Einstieg); am Ende die Quelle. Ohne Lehrtext: null.
   Genutzt im Simulations-Panel und im Ergebnis „Noch nicht ganz“. Klassenpräfix ex-. */
UI.erklaeren = function(code, niveau = "E"){
  const lt = (typeof DATEN !== "undefined" && DATEN.lehrtexte && DATEN.lehrtexte[code]) || null;
  if (!lt) return null;
  const STUFEN = ["AP2", "AP1", "E"];
  const reihe = STUFEN.slice(Math.max(0, STUFEN.indexOf(niveau))).filter(n => lt[n]);
  if (!reihe.length) return null;
  const text = h("div", {class: "ex-text", hidden: true});
  let i = 0;
  const knopf = h("button", {type: "button", class: "ex-knopf", onclick: ev => {
    ev.stopPropagation();
    text.hidden = false;
    text.append(h("p", {}, lt[reihe[i++]]));
    if (i < reihe.length) knopf.textContent = "Ausführlicher";
    else { knopf.remove(); if (lt.quelle) text.append(h("small", {class: "ex-quelle"}, "Quelle: " + lt.quelle)); }
  }}, "Erklär mir das");
  return h("span", {class: "ex"}, knopf, text);
};
