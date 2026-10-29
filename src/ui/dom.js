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

/* ---------- Zeit-Tokens: die EINE Quelle für Dauern in JS (Architektur §16.4, UX-Audit U07) ----------
   Die vier Stufen und der Zähler stehen in basis.css (--dauer-kurz/-dauer/-mittel/-lang/--dauer-zaehler).
   UI.zeit(name) liest sie über getComputedStyle und gibt Millisekunden zurück; ohne DOM (headless-Test,
   Browser ohne geladenes CSS) gelten die Fallbacks — sie sind mit basis.css identisch und werden vom Test
   tests/ui-zeit.test.js gegengeprüft. Aufruf: UI.zeit("kurz"|"dauer"|"mittel"|"lang"|"zaehler"). */
UI.zeit = (() => {
  const FALLBACK = {kurz: 80, dauer: 160, mittel: 240, lang: 320, zaehler: 700};
  const TOKEN = {kurz: "--dauer-kurz", dauer: "--dauer", mittel: "--dauer-mittel", lang: "--dauer-lang", zaehler: "--dauer-zaehler"};
  return function zeit(name){
    const roh = String(name == null ? "dauer" : name).trim().replace(/^--/, "");
    const schluessel = roh === "dauer" ? "dauer" : roh.replace(/^dauer-/, "");
    const fallback = FALLBACK[schluessel];
    if (fallback == null) throw new Error("UI.zeit: unbekannte Dauer „" + name + "“ (erlaubt: kurz, dauer, mittel, lang, zaehler)");
    try {
      if (typeof document === "undefined" || typeof getComputedStyle !== "function") return fallback;
      const wert = getComputedStyle(document.documentElement).getPropertyValue(TOKEN[schluessel]).trim();
      const ms = parseFloat(wert);
      return Number.isFinite(ms) && ms > 0 ? ms : fallback;
    } catch (e) { return fallback; }
  };
})();
