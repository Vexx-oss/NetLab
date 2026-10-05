"use strict";
/* ---------- Ereignisse: Karte im Labor (E1; Architektur § 9.6, Präfix ev-) ----------
   Alle 20 s fragt die Oberfläche, ob ein Ereignis fällig ist (Spiel.ereignisse.tick zählt nur aktive Zeit) – nur im
   offenen Auftrag, wenn die Bühne frei ist, höchstens eine Karte. Die Karte nennt das Warum; Provider-Störung und
   Notfall haben einen Knopf (anrufen bzw. jetzt wechseln). Schließen geht immer – nichts läuft weg.
   Erste Stunde (§ 20 F3): Anruf („Das Telefon klingelt“, Knopf „Rangehen ▸“) und Weiterempfehlung („Ansehen ▸“) kommen
   als Karte, sobald das Ergebnis geschlossen ist – UI.ereignisse.vormerken(e) wartet, bis kein Dialog mehr offen ist. */
UI.ereignisse = (() => {
  const E = {karte: null, wartend: null, t: null};
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
      : e.aktion === "notfall" && e.iid ? h("button", {type: "button", class: "knopf klein", onclick: () => { zu(); UI.spiel.oeffnen(e.iid); }}, "Jetzt hin ▸")
      : e.aktion === "abheben" && e.iid ? h("button", {type: "button", class: "knopf klein ev-rangehen", onclick: () => { zu(); UI.spiel.oeffnen(e.iid); }}, "Rangehen ▸")
      : e.aktion === "neu" && e.iid ? h("button", {type: "button", class: "knopf klein", onclick: () => { zu(); UI.spiel.imPostfach(e.iid); }}, "Ansehen ▸") : null;
    E.karte = h("aside", {class: "ev-karte" + (e.aktion === "abheben" ? " ev-anruf" : ""), role: "status", "aria-live": "polite"},
      h("div", {class: "ev-kopf"}, h("span", {class: "ev-sym", "aria-hidden": "true"}, e.sym), h("strong", {}, e.titel),
        h("button", {type: "button", class: "ev-zu", title: e.aktion === "abheben" ? "Später – der Anruf wartet im Postfach" : "Schließen", "aria-label": "Schließen", onclick: zu}, "×")),
      h("p", {class: "ev-text"}, e.text),
      e.warum ? h("p", {class: "ev-warum"}, h("b", {}, "Warum? "), e.warum) : null,
      aktion ? h("div", {class: "ev-fuss"}, aktion) : null);
    document.body.append(E.karte);
    UI.klang?.spielen?.(e.aktion === "abheben" ? "klingeln" : "nochnicht");
    UI.labor.auftragNeu?.();
  }
  function zu(){ if (E.karte) E.karte.remove(); E.karte = null; }
  /* Karte zeigen, sobald kein Dialog (Ergebnis) und keine Funktionsprobe mehr läuft */
  function vormerken(e){ if (!e) return; E.wartend = e; warten(); }
  function warten(){
    clearTimeout(E.t);
    if (!E.wartend) return;
    if (document.querySelector(".sp-overlay") || (UI.szene && UI.szene.laeuft && UI.szene.laeuft())) { E.t = setTimeout(warten, 500); return; }
    const e = E.wartend; E.wartend = null;
    zeigen(e);
  }
  Bus.an("ui-bereit", () => setInterval(pruefen, 20000));
  Bus.an("labor-geladen", () => { if (!E.karte || !E.karte.classList.contains("ev-anruf")) zu(); });
  return {pruefen, zeigen, zu, vormerken, get offen(){ return !!E.karte; }};
})();
