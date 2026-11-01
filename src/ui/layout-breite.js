"use strict";
/* ---------- Inspektorbreite per Kante (3.1.0, Aufgabe B3/4) ----------
   KEIN input[type=range], KEIN fokussierbares Handle: ein reiner div.ins-resizer mit
   role="separator" tabindex="0" (zählt laut R12-Entscheid nicht). Pointer-Drag auf der Kante,
   persistiert store einst.layout.inspBreite (280–560, Default 360), Doppelklick = Reset,
   Tastatur Alt+←/→ (global) bzw. Pfeile am Separator. */
UI.layoutBreite = (() => {
  const MIN = 280, MAX = 560, STANDARD = 360;
  function einst(){ try { return store.get("einst", {}) || {}; } catch (e) { return {}; } }
  function klemme(px){
    const n = Math.round(Number(px));
    if (!Number.isFinite(n)) return STANDARD;
    return Math.min(MAX, Math.max(MIN, n));
  }
  function gespeichert(){
    const l = einst().layout;
    const n = l && Number(l.inspBreite);
    return Number.isFinite(n) ? klemme(n) : null;
  }
  function lesen(){
    const n = gespeichert();
    return n == null ? STANDARD : n;
  }
  function schreiben(px){
    const breite = klemme(px);
    const e = einst();
    try { store.set("einst", Object.assign({}, e, {layout: Object.assign({}, e.layout || {}, {inspBreite: breite})})); }
    catch (fehler) { console.error("Layout: speichern", fehler); }
    return breite;
  }
  function anwenden(root, px){
    /* Nur ein vom Nutzer gesetzter Wert wird als Inline-Breite aufgedrückt — sonst bleibt der
       CSS-Clamp (editor.css .labor.dock-da) maßgeblich. px != null = Nutzeraktion (Drag/Reset/Tastatur). */
    const breite = px == null ? lesen() : schreiben(px);
    const nutzerWert = px != null || gespeichert() != null;
    if (root && root.style && typeof root.style.setProperty === "function") {
      /* Fernwartung setzt per CSS 58 % (editor.css .labor.lb-fern) — dort keine Inline-Breite erzwingen. */
      if (!nutzerWert || (root.classList && root.classList.contains && root.classList.contains("lb-fern"))) root.style.removeProperty("--dock-b");
      else root.style.setProperty("--dock-b", breite + "px");
    }
    return breite;
  }
  function reset(root){ return anwenden(root, STANDARD); }
  function arbeitsflaeche(){ try { return document.querySelector(".labor"); } catch (e) { return null; } }
  let zustand = null;      /* {root, separator, drag} – eine Installation pro Bereich */
  let tastenHorer = null;
  function ariaSetzen(){
    if (!zustand || !zustand.separator) return;
    try { zustand.separator.setAttribute("aria-valuenow", String(lesen())); } catch (e) { /* egal */ }
  }
  function tastatur(e){
    if (!e || !zustand) return false;
    const amSeparator = e.target === zustand.separator || (typeof document !== "undefined" && document.activeElement === zustand.separator);
    if (!(e.altKey || amSeparator)) return false;
    let richtung = 0;
    if (e.key === "ArrowLeft") richtung = -1;
    else if (e.key === "ArrowRight") richtung = 1;
    else return false;
    if (typeof e.preventDefault === "function") e.preventDefault();
    const schritt = e.altKey ? 16 : 8;
    anwenden(zustand.root, lesen() + richtung * schritt);
    ariaSetzen();
    return true;
  }
  function dragStarten(e){
    if (!zustand || !zustand.separator) return;
    zustand.drag = {x: e.clientX == null ? 0 : e.clientX, breite: lesen()};
    if (typeof zustand.separator.setPointerCapture === "function" && e.pointerId != null) { try { zustand.separator.setPointerCapture(e.pointerId); } catch (x) { /* egal */ } }
    zustand.separator.classList.add("zieht");
    if (typeof e.preventDefault === "function") e.preventDefault();
  }
  function dragBewegen(e){
    if (!zustand || !zustand.drag) return;
    const dx = (e.clientX == null ? 0 : e.clientX) - zustand.drag.x;
    /* rechte Leiste: nach links ziehen vergrößert die Breite */
    anwenden(zustand.root, zustand.drag.breite - dx);
  }
  function dragEnde(){
    if (!zustand || !zustand.drag) return;
    const breite = lesen();
    zustand.drag = null;
    if (zustand.separator) zustand.separator.classList.remove("zieht");
    schreiben(breite);
    ariaSetzen();
  }
  function installieren(root, separator){
    if (!root || !separator) return false;
    zustand = {root, separator, drag: null};
    if (typeof separator.addEventListener === "function") {
      separator.addEventListener("pointerdown", dragStarten);
      separator.addEventListener("pointermove", e => { if (zustand && zustand.drag) dragBewegen(e); });
      separator.addEventListener("pointerup", dragEnde);
      separator.addEventListener("pointercancel", dragEnde);
      separator.addEventListener("dblclick", () => { reset(root); ariaSetzen(); });
      separator.addEventListener("keydown", tastatur);
    }
    if (!tastenHorer && typeof document !== "undefined" && typeof document.addEventListener === "function") {
      tastenHorer = e => tastatur(e);
      document.addEventListener("keydown", tastenHorer);
      document.addEventListener("pointerup", () => dragEnde());
    }
    anwenden(root);
    ariaSetzen();
    return true;
  }
  function werkzeug(){ return zustand; }
  return {MIN, MAX, STANDARD, lesen, schreiben, anwenden, reset, installieren, tastatur, _intern: {klemme, arbeitsflaeche}, get _zustand(){ return zustand; }};
})();
