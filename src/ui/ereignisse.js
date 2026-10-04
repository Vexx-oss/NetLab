"use strict";
/* ---------- Ereignisse: Karte im Labor (E1; Architektur § 9.6, Präfix ev-) ----------
   Alle 20 s fragt die Oberfläche, ob ein Ereignis fällig ist (Spiel.ereignisse.tick zählt nur aktive Zeit) – nur im
   offenen Auftrag, wenn die Bühne frei ist, höchstens eine Karte. Die Karte nennt immer das Warum; Provider-Störung und
   Notfall haben einen Knopf (anrufen bzw. jetzt wechseln). Schließen geht immer – nichts läuft weg. */
UI.ereignisse = (() => {
  const E = {karte: null};
  function pruefen(){
    if (UI.app.aktuell !== "labor" || (UI.modus && UI.modus() === "leiste") || E.karte) return;
    const inst = UI.spiel && UI.spiel.inst;
    if (!inst || !Spiel.instanz(inst.iid) || UI.labor.netz !== inst.netz) return;
    if (UI.buehneFrei && !UI.buehneFrei()) return;
    let e = null;
    try { e = Spiel.ereignisse.tick({inst}); } catch (err) { console.error("Ereignis", err); }
    if (e) zeigen(e);
  }
  function zeigen(e){
    zu();
    const inst = UI.spiel && UI.spiel.inst;
    const aktion = e.aktion === "provider" ? h("button", {type: "button", class: "knopf klein", onclick: () => {
        if (Spiel.ereignisse.providerAnrufen(inst)) UI.toast("Störung gemeldet – das Internet ist wieder da. +1 Ruf fürs Erkennen.", "ok", {dauer: 3800});
        zu(); UI.labor.auftragNeu?.(); }}, "📞 Provider anrufen")
      : e.aktion === "notfall" && e.iid ? h("button", {type: "button", class: "knopf klein", onclick: () => { zu(); UI.spiel.oeffnen(e.iid); }}, "Jetzt hin ▸") : null;
    E.karte = h("aside", {class: "ev-karte", role: "status", "aria-live": "polite"},
      h("div", {class: "ev-kopf"}, h("span", {class: "ev-sym", "aria-hidden": "true"}, e.sym), h("strong", {}, e.titel),
        h("button", {type: "button", class: "ev-zu", title: "Schließen", "aria-label": "Schließen", onclick: zu}, "×")),
      h("p", {class: "ev-text"}, e.text),
      h("p", {class: "ev-warum"}, h("b", {}, "Warum? "), e.warum),
      aktion ? h("div", {class: "ev-fuss"}, aktion) : null);
    document.body.append(E.karte);
    UI.klang?.spielen?.("nochnicht");
    UI.labor.auftragNeu?.();
  }
  function zu(){ if (E.karte) E.karte.remove(); E.karte = null; }
  Bus.an("ui-bereit", () => setInterval(pruefen, 20000));
  Bus.an("labor-geladen", () => zu());
  return {pruefen, zeigen, zu, get offen(){ return !!E.karte; }};
})();
