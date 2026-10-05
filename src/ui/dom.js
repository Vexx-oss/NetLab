"use strict";
/* ---------- UI-Grundbausteine: DOM-Helfer, Namensraum UI ----------
   h("div", {class:"x", onclick:fn}, kinder…)  sv("rect", {x:1})  $(sel)  $$(sel) */
const UI = {};
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
function h(tag, attrs = {}, ...kids){
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    /* CSS-Variablen (--k, --i …) gehen nur über setProperty – Object.assign(el.style, …) überging sie still (Kundenfarben wirkten nie) */
    else if (k === "style" && typeof v === "object") { for (const [p, w] of Object.entries(v || {})) { if (p.startsWith("--")) el.style.setProperty(p, w == null ? "" : String(w)); else el.style[p] = w; } }
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}
const SVGNS = "http://www.w3.org/2000/svg";
function sv(tag, attrs = {}, ...kids){
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "text") el.textContent = v;
    else if (k === "class") el.setAttribute("class", v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (v != null && v !== false) el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) if (kid) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}
/* Ist die Bühne frei für eine Meldung (Abzeichen, Kundenpost, Aufstiegsfeier)? Nicht während Dialogen und der Funktionsprobe */
UI.buehneFrei = () => !document.querySelector(".sp-overlay:not(.vorhersage), .sz-buehne");
/* Text in die Zwischenablage (Teilen-Text, Auswertung) – mit Rückfall für ältere WebViews. Nur auf Klick des Spielers (R8). */
UI.kopieren = async function(text){
  try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(String(text)); return true; } } catch (e) { /* Rückfall */ }
  try {
    const t = h("textarea", {readonly: true, style: {position: "fixed", left: "-9999px", top: "0", opacity: "0"}});
    t.value = String(text); document.body.append(t); t.select();
    const ok = document.execCommand("copy"); t.remove(); return !!ok;
  } catch (e) { return false; }
};
const wenigBewegung = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
