"use strict";
/* ---------- Toasts: kurze Rückmeldungen unten mittig (im Labor: oben rechts auf der Zeichenfläche) ----------
   UI.toast(text, art = "info"|"ok"|"warn"|"fehler", {aktion:{text, fn}|[…], dauer, titel, id})
     → {schliessen()}   Maus darüber hält den Toast an. Mit Aktion bleibt er länger stehen.
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
  /* In der Laboransicht schmal oben rechts auf der Zeichenfläche (unter Rückgängig/Wiederholen): Dort liegen meist
     Router und Internet, selten das, was man gerade anklickt. Unten mittig verdeckten die Meldungen genau die PCs,
     die man als Nächstes anpingen soll; rechts daneben liegt der Inspektor mit Konfig und „entspricht“. */
  function ausrichten(st){
    const m = document.querySelector(".lb-leinwand");
    const r = m && m.getClientRects().length ? m.getBoundingClientRect() : null;
    const labor = !!(r && r.width > 300 && r.height > 200);
    st.classList.toggle("im-labor", labor);
    if (labor) Object.assign(st.style, {left: "auto", right: `${Math.round(innerWidth - r.right + 14)}px`, top: `${Math.round(r.top + 78)}px`, bottom: "auto",
      width: `min(400px, ${Math.round(r.width - 28)}px)`});
    else for (const k of ["left", "right", "top", "bottom", "width"]) st.style[k] = "";
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
    requestAnimationFrame(() => el.classList.add("da"));
    let rest = o.dauer ?? (aktionen.length ? 8000 : art === "fehler" ? 6500 : 4200), timer = null, t0 = 0;
    const starten = () => { if (rest === Infinity) return; t0 = performance.now(); timer = setTimeout(() => schliessen(), rest); };
    const halten = () => { if (timer) { clearTimeout(timer); timer = null; rest = Math.max(1200, rest - (performance.now() - t0)); } };
    el.addEventListener("pointerenter", halten);
    el.addEventListener("pointerleave", starten);
    let zu = false;
    function schliessen(sofort, verdraengt){
      if (zu) return; zu = true; halten();
      if (!verdraengt && warten.length) { const w = warten.shift(); setTimeout(() => toast(w.text, w.art, Object.assign({}, w.o, {dauer: 5000})), 260); }
      if (sofort || wenigBewegung()) { el.remove(); return; }
      el.classList.remove("da"); el.classList.add("weg");
      setTimeout(() => el.remove(), 220);
    }
    el._schliessen = schliessen;
    if (aktionen.length && !o.nachgeholt) el._nachholen = {text, art, o: Object.assign({}, o, {nachgeholt: true})};
    starten();
    return {schliessen, el};
  }
  return toast;
})();
