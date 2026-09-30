"use strict";
/* ---------- Toasts: kurze Rückmeldungen unten mittig ----------
   UI.toast(text, art = "info"|"ok"|"warn"|"fehler", {aktion:{text, fn}|[…], dauer, titel, id})
     → {schliessen()}   Maus darüber hält den Toast an. Mit Aktion bleibt er länger stehen.
   Gleiche id ersetzt einen noch sichtbaren Toast (z. B. wiederholte Pings). */
UI.toast = (() => {
  const SYMBOL = {ok: "ok", warn: "warnung", fehler: "warnung", info: "info"};
  let stapel = null;
  function stapelHolen(){
    if (stapel && stapel.isConnected) return stapel;
    stapel = h("div", {class: "toast-stapel", role: "status", "aria-live": "polite"});
    document.body.append(stapel);
    return stapel;
  }
  function toast(text, art = "info", o = {}){
    if (typeof document === "undefined") return {schliessen(){}};
    const st = stapelHolen();
    if (o.id) for (const alt of $$(".toast", st)) if (alt.dataset.id === o.id) alt._schliessen?.(true);
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
    function schliessen(sofort){
      if (zu) return; zu = true; halten();
      if (sofort || wenigBewegung()) { el.remove(); return; }
      el.classList.remove("da"); el.classList.add("weg");
      setTimeout(() => el.remove(), 220);
    }
    el._schliessen = schliessen;
    /* höchstens 4 gleichzeitig */
    const alle = $$(".toast:not(.weg)", st);
    if (alle.length > 4) alle[0]._schliessen?.();
    starten();
    return {schliessen, el};
  }
  return toast;
})();
