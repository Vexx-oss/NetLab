"use strict";
/* ---------- Analyse-Leitfaden (3.1.0, Aufgabe B3/2) ----------
   Panel im rechten Inspektor, NUR TEXT (keine Knöpfe → R12 bleibt), sichtbar bei laufendem Auftrag.
   Daten: Spiel.leitfaden.stand(inst) → {pruefung, fortschritt, aktuell, schritte:[{id,titel,status,impuls}]};
   naechsterSchritt(inst) → {id,titel,text}|null. Status: "erledigt"|"aktuell"|"offen".
   Prüfungsmodus: neutraler Hinweis, keine Impulse, kein Leck. Fehlende Engine/Ticket: kein Panel.
   CSS: stil (leitfaden.css: .lf-panel/.lf-kopf/.lf-ring/.lf-kicker/.lf-titel/.lf-schritte/
   .lf-schritt+ok/jetzt/offen/.lf-status/.lf-text/.lf-impuls/.lf-naechster). */
UI.leitfaden = (() => {
  const alsText = x => String(x == null ? "" : x);
  function instanz(){
    try { return typeof Spiel !== "undefined" && Spiel && typeof Spiel.aktiveInstanz === "function" ? Spiel.aktiveInstanz() : null; }
    catch (e) { return null; }
  }
  function engine(){
    try { return (typeof Spiel !== "undefined" && Spiel && Spiel.leitfaden) || null; } catch (e) { return null; }
  }
  function daten(){
    const e = engine(), i = instanz();
    if (!e || !i || typeof e.stand !== "function") return null;
    try {
      const stand = e.stand(i);
      if (!stand || typeof stand !== "object") return null;
      const naechster = typeof e.naechsterSchritt === "function" ? e.naechsterSchritt(i) : null;
      return {stand, naechster};
    } catch (fehler) { console.error("Leitfaden: stand", fehler); return null; }
  }
  const anteil = wert => Math.max(0, Math.min(1, Number(wert) || 0));
  function prozent(wert){ return Math.round(anteil(wert) * 100) + " %"; }
  function statusKlasse(status){
    return status === "erledigt" ? "ok" : status === "aktuell" ? "jetzt" : "offen";
  }
  function panel(){
    const d = daten();
    if (!d) return null;
    const stand = d.stand, naechster = d.naechster;
    const pruefung = !!stand.pruefung;
    const kopf = h("header", {class: "lf-kopf"},
      h("div", {class: "lf-ring", style: {"--p": String(anteil(stand.fortschritt))}, "aria-hidden": "true"},
        h("span", {class: "lf-ring-wert"}, prozent(stand.fortschritt))),
      h("div", {},
        h("p", {class: "lf-kicker"}, "Analyse-Leitfaden"),
        h("h3", {class: "lf-titel"}, pruefung ? "Prüfung läuft" : "Deine Analyse")));
    const kinder = [kopf];
    if (pruefung){
      kinder.push(h("p", {class: "lf-impuls"}, "Im Prüfungsmodus gibt es keine Impulse – nur den Status deiner Arbeit."));
    } else {
      const schritte = Array.isArray(stand.schritte) ? stand.schritte : [];
      if (schritte.length) {
        kinder.push(h("ol", {class: "lf-schritte", "aria-label": "Leitfaden: sechs Schritte"},
          schritte.map(s => h("li", {class: "lf-schritt " + statusKlasse(s && s.status), "data-schritt": alsText(s && s.id)},
            h("span", {class: "lf-status", "aria-hidden": "true"}),
            h("div", {class: "lf-text"}, h("b", {}, alsText(s && s.titel)))))));
        const aktuell = schritte.find(s => s && s.status === "aktuell");
        if (aktuell && aktuell.impuls) kinder.push(h("p", {class: "lf-impuls"}, alsText(aktuell.impuls)));
      }
      if (naechster && naechster.text) kinder.push(h("p", {class: "lf-naechster"}, "Nächster Schritt: " + alsText(naechster.text)));
    }
    /* Kernaktionen NUR als Text (Name + Kürzel) — ausgeführt über das bestehende ⋯-Menü „Aktionen“. */
    const aktionen = (typeof UI !== "undefined" && UI.laborAktionen && typeof UI.laborAktionen.liste === "function") ? UI.laborAktionen.liste() : [];
    if (aktionen.length) {
      kinder.push(h("div", {class: "lf-aktionen", role: "list", "aria-label": "Kernaktionen (über das Menü Aktionen ausführbar)"},
        aktionen.map(a => h("div", {class: "lf-aktion", role: "listitem"},
          h("b", {}, alsText(a.name)), a.taste ? h("kbd", {}, alsText(a.taste)) : null))));
    }
    return h("aside", {class: "lf-panel", "aria-label": "Analyse-Leitfaden"}, kinder);
  }
  /* Live-Aktualisierung ohne Neuzeichnen der ganzen Ansicht: vorhandene Panels neu füllen. */
  function aktualisieren(){
    let ziele = [];
    try { ziele = [...document.querySelectorAll(".lf-panel")]; } catch (e) { ziele = []; }
    for (const el of ziele) {
      const neu = panel();
      /* echtes DOM: kein .kinder – Stub-Tests haben .kinder. Beides unterstützen. */
      if (neu && el.replaceChildren) {
        const kopie = Array.isArray(neu.kinder) ? [...neu.kinder] : [...(neu.childNodes || [])];
        el.replaceChildren(...kopie);
      }
    }
  }
  try {
    Bus.an("zustand-geaendert", aktualisieren);
    Bus.an("netz-geaendert", aktualisieren);
  } catch (e) { /* ohne Bus bleibt das Panel beim nächsten Inspektor-Zeichnen aktuell */ }
  return {panel, aktualisieren, _intern: {daten, anteil, prozent, statusKlasse}};
})();
