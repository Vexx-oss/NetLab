"use strict";
/* ---------- Toasts: kurze Rückmeldungen unten mittig (im Labor: oben rechts auf der Zeichenfläche) ----------
   UI.toast(text, art = "info"|"ok"|"warn"|"fehler", {aktion:{text, fn}|[…], dauer, titel, id})
     → {schliessen()}   Maus darüber ODER Tastaturfokus darin hält den Toast an. Mit Aktion bleibt er länger stehen.  UI.toast.zu(id) schließt.
   Gleiche id ersetzt einen noch sichtbaren Toast (z. B. wiederholte Pings).
   Ausbau 1.2 (A4): höchstens EIN Toast gleichzeitig – der neue ersetzt den alten. Ein verdrängter Toast mit Aktion
   (z. B. „Rückgängig“) kommt danach noch einmal kurz, damit die Aktion nicht verloren geht. */
UI.toast = (() => {
  const SYMBOL = {ok: "ok", warn: "warnung", fehler: "warnung", info: "info"};
  let stapel = null;
  const warten = [];
  function stapelHolen(){
    if (stapel && stapel.isConnected) return stapel;
    stapel = h("div", {class: "toast-stapel", role: "status", "aria-live": "polite"});
    document.body.append(stapel);
    return stapel;
  }
  /* In der Laboransicht unten links im freien Rand der Zeichenfläche (K6, Spielspaß 2.0): Den Rand hält das Einpassen
     frei, also liegt die Meldung nicht über Geräten und Beschriftungen. Oben rechts verdeckte sie Router und Internet,
     unten mittig die PCs. Rechts unten bleibt der Zoom-Knopf frei; der Werkzeug-Hinweis schweigt, solange sie steht. */
  function ausrichten(st){
    const m = document.querySelector(".lb-leinwand");
    const r = m && m.getClientRects().length ? m.getBoundingClientRect() : null;
    const labor = !!(r && r.width > 300 && r.height > 200);
    st.classList.toggle("im-labor", labor);
    if (labor) Object.assign(st.style, {left: `${Math.round(r.left + 12)}px`, right: "auto", top: "auto", bottom: `${Math.round(innerHeight - r.bottom + 12)}px`,
      width: `min(470px, ${Math.round(r.width - 120)}px)`});
    else for (const k of ["left", "right", "top", "bottom", "width"]) st.style[k] = "";
  }
  /* Werkzeug-Hinweis (gleicher Platz) stummschalten, solange eine Meldung im Labor steht */
  function hinweisStill(st){
    const m = document.querySelector(".lb-leinwand");
    m?.classList.toggle("unter-toast", st.classList.contains("im-labor") && !!st.querySelector(".toast:not(.weg)"));
  }
  function toast(text, art = "info", o = {}){
    if (typeof document === "undefined") return {schliessen(){}};
    const st = stapelHolen();
    ausrichten(st);
    if (o.id) for (const alt of $$(".toast", st)) if (alt.dataset.id === o.id) alt._schliessen?.(true, true);
    for (const alt of $$(".toast:not(.weg)", st)) {
      if (alt._nachholen && !warten.some(w => w.id && w.id === alt._nachholen.o.id)) warten.push(alt._nachholen);
      alt._schliessen?.(true, true);
    }
    const aktionen = (Array.isArray(o.aktion) ? o.aktion : o.aktion ? [o.aktion] : []).filter(Boolean);
    const el = h("div", {class: `toast toast-${art}`, "data-id": o.id || ""});
    const inhalt = h("div", {class: "toast-inhalt"});
    if (o.titel) inhalt.append(h("strong", {class: "toast-titel"}, o.titel));
    inhalt.append(h("span", {class: "toast-text"}, text));
    el.append(h("span", {class: "toast-sym"}, UI.symbol(SYMBOL[art] || "info", 18)), inhalt);
    for (const a of aktionen) {
      const name = a.text || a.name || "OK", fn = a.fn || a.aktion;
      el.append(h("button", {type: "button", class: "toast-knopf", onclick: () => { schliessen(); try { fn && fn(); } catch (e) { console.error(e); } }}, name));
    }
    el.append(h("button", {type: "button", class: "toast-zu", title: "Schließen", "aria-label": "Meldung schließen", onclick: () => schliessen()}, UI.symbol("schliessen", 14)));
    st.append(el);
    hinweisStill(st);
    requestAnimationFrame(() => el.classList.add("da"));
    let rest = o.dauer ?? (aktionen.length ? 8000 : art === "fehler" ? 6500 : 4200), timer = null, t0 = 0;
    const starten = () => { if (rest === Infinity) return; t0 = performance.now(); timer = setTimeout(() => schliessen(), rest); };
    const halten = () => { if (timer) { clearTimeout(timer); timer = null; rest = Math.max(1200, rest - (performance.now() - t0)); } };
    el.addEventListener("pointerenter", halten);
    el.addEventListener("pointerleave", starten);
    /* Die TASTATUR wird wie die Maus behandelt (Befund tests/ui-klassenraum-tastatur.test.js:251):
       `focusin`/`focusout` blubbern – anders als focus/blur – und halten den Zeitgeber an, solange der
       Fokus im Toast steht. Ohne das hätte, wer per Tab zum Kopier-Knopf fährt, nur das nackte
       Fenster; beim Ablauf verschwände der Knopf unter dem Finger. */
    el.addEventListener("focusin", halten);
    el.addEventListener("focusout", e => { if (!zu && !(e.relatedTarget && el.contains(e.relatedTarget))) starten(); });
    /* Fokus, der im Toast steht, darf beim Schließen nicht ins Leere fallen (Befund :64-71).
       Vorbild ist UI.menue (src/ui/editor-werkzeuge.js:21/63): das Element, das den Toast ausgelöst
       hat, bekommt ihn zurück – erst dann der nächste sinnvolle Nachbar, zuletzt der Rumpf.
       Steht der Fokus woanders, wird er NICHT angefasst (kein Fokusklau). */
    const zurueck = document.activeElement || null;
    function fokusRetten(){
      const a = document.activeElement;
      if (!a || (a !== el && !el.contains(a))) return;
      const nachbar = el.nextElementSibling?.querySelector?.("button") || el.previousElementSibling?.querySelector?.("button") || null;
      for (const z of [zurueck, nachbar, document.body]) {
        if (!z || z === el || el.contains(z) || typeof z.focus !== "function" || z.isConnected === false) continue;
        try { z.focus({preventScroll: true}); } catch (e) { try { z.focus(); } catch (e2) { continue; } }
        return;
      }
      try { a.blur?.(); } catch (e) { /* ohne Ziel bleibt nur das Lösen des Fokus */ }
    }
    let zu = false;
    function schliessen(sofort, verdraengt){
      if (zu) return; zu = true; halten();
      fokusRetten();                                  /* VOR dem Entfernen – sonst zeigt der Fokus ins Nichts */
      if (!verdraengt && warten.length) { const w = warten.shift(); setTimeout(() => toast(w.text, w.art, Object.assign({}, w.o, {dauer: 5000})), 260); }
      if (sofort || wenigBewegung()) { el.remove(); hinweisStill(st); return; }
      el.classList.remove("da"); el.classList.add("weg");
      hinweisStill(st);
      setTimeout(() => { el.remove(); hinweisStill(st); }, 220);
    }
    el._schliessen = schliessen;
    if (aktionen.length && !o.nachgeholt) el._nachholen = {text, art, o: Object.assign({}, o, {nachgeholt: true})};
    starten();
    return {schliessen, el};
  }
  /* Meldung mit dieser id schließen (z. B. „Alle Ziele erfüllt“, sobald die Abnahme läuft) */
  toast.zu = id => { if (stapel) for (const alt of $$(".toast", stapel)) if (alt.dataset.id === id) alt._schliessen?.(false, true); };
  return toast;
})();
