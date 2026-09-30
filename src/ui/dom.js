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
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
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
const wenigBewegung = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
