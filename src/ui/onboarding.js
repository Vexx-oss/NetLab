"use strict";
/* ---------- Onboarding-Tour (3.1.0, Aufgabe B3/1) ----------
   Einmalige Einführung beim ersten Start: 4 Schritte aus DATEN.leitfaden.tour (inhalt), Overlay statt
   Ansicht (kein R12-Einfluss), Esc = überspringen, store einst.tour = {gesehen:true}; die Einstellungen
   bieten „Einführung wiederholen“. Fehlende/kaputte Tour-Daten: gar keine Tour statt leerem Overlay.
   CSS: stil, Hooks onb-* (onb-huelle/onb-karte/onb-kopf/onb-kicker/onb-titel/onb-text/onb-punkte/
   onb-punkt/onb-fuss + onb-weiter/onb-ueberspringen). Keine fokussierbaren Punkte, keine neuen
   Dauer-Bedienelemente in R12-Ansichten. */
UI.onboarding = (() => {
  const alsText = x => String(x == null ? "" : x);
  function einst(){ return store.get("einst", {}) || {}; }
  function gesehen(){ const t = einst().tour; return !!(t && t.gesehen === true); }
  function merken(){
    const e = einst();
    store.set("einst", Object.assign({}, e, {tour: Object.assign({}, e.tour || {}, {gesehen: true})}));
  }
  /* Form von inhalt (task-125): tour: [{id, titel, text}]. Defensiv: fehlt/falsch → [] (keine Tour). */
  function schritte(){
    try {
      /* inhalt task-125 (final): onboarding[4] {id,titel,lernziel,abnahme,text}; ältere Form tour[…] als Fallback. */
      const lf = DATEN && DATEN.leitfaden;
      const tourDaten = lf && (lf.onboarding || lf.tour);
      if (!Array.isArray(tourDaten)) return [];
      return tourDaten.map(s => ({titel: alsText(s && s.titel), text: alsText(s && s.text)}))
        .filter(s => s.titel || s.text);
    } catch (e) { return []; }
  }
  function offenesTicket(){
    try {
      return !!(typeof Spiel !== "undefined" && Spiel && typeof Spiel.aktiveInstanz === "function" && Spiel.aktiveInstanz());
    } catch (e) { return false; }
  }
  let huelle = null, escHorer = null, vorherFokus = null;
  function schliessen(){
    const zurueck = vorherFokus;
    vorherFokus = null;
    try { if (huelle && document.activeElement && huelle.contains && huelle.contains(document.activeElement) && typeof document.activeElement.blur === "function") document.activeElement.blur(); } catch (e) { /* egal */ }
    if (huelle) { try { huelle.remove(); } catch (e) { /* schon weg */ } huelle = null; }
    if (escHorer) { try { document.removeEventListener("keydown", escHorer); } catch (e) { /* egal */ } escHorer = null; }
    /* Tour-A11y: Fokus nicht im entfernten Overlay lassen — zurück zum Auslöser, wenn er noch lebt. */
    try { if (zurueck && zurueck.isConnected !== false && typeof zurueck.focus === "function") zurueck.focus(); } catch (e) { /* egal */ }
    merken();
  }
  function tour(){
    const liste = schritte();
    if (!liste.length) return false;
    if (huelle) schliessen();
    try { vorherFokus = (typeof document !== "undefined" && document.activeElement) || null; } catch (e) { vorherFokus = null; }
    const kicker = h("span", {class: "onb-kicker"}, "");
    const punkte = h("span", {class: "onb-punkte", "aria-hidden": "true"});
    const titel = h("h2", {class: "onb-titel", id: "onb-titel"});
    const absatz = h("p", {class: "onb-text"});
    const ueberspringen = h("button", {type: "button", class: "knopf geist onb-ueberspringen", onclick: () => schliessen()}, "Überspringen");
    const weiter = h("button", {type: "button", class: "knopf primaer onb-weiter"});
    let index = 0;
    function zeichnen(){
      const s = liste[index] || {titel: "", text: ""};
      kicker.textContent = "Einführung · " + (index + 1) + " / " + liste.length;
      titel.textContent = s.titel;
      absatz.textContent = s.text;
      weiter.textContent = index + 1 >= liste.length ? "Los geht's" : "Weiter";
      punkte.replaceChildren(...liste.map((_, i) => h("i", {class: "onb-punkt" + (i === index ? " an" : "")})));
      try { if (typeof weiter.focus === "function") weiter.focus(); } catch (e) { /* Fokus ist Beiwerk */ }
    }
    const weiterKlick = () => {
      if (index + 1 >= liste.length) { schliessen(); return; }
      index += 1;
      zeichnen();
    };
    /* dom.js h() registriert on*-Attribute als Hörer; hier programmatisch, deshalb explizit. */
    if (typeof weiter.addEventListener === "function") weiter.addEventListener("click", weiterKlick);
    else weiter.onclick = weiterKlick;
    const karte = h("section", {class: "onb-karte", role: "dialog", "aria-modal": "true", "aria-labelledby": "onb-titel"},
      h("div", {class: "onb-kopf"}, kicker, punkte),
      titel, absatz,
      h("div", {class: "onb-fuss"}, ueberspringen, weiter));
    huelle = h("div", {class: "onb-huelle"}, karte);
    escHorer = ereignis => {
      if (!ereignis || ereignis.key !== "Escape") return;
      if (typeof ereignis.preventDefault === "function") ereignis.preventDefault();
      schliessen();
    };
    try { document.addEventListener("keydown", escHorer); } catch (e) { /* ohne Hörer bleibt der Überspringen-Knopf */ }
    document.body.append(huelle);
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => { if (huelle) huelle.classList.add("da"); });
    else huelle.classList.add("da");
    zeichnen();
    return true;
  }
  function beimStart(){
    if (gesehen() || offenesTicket()) return false;
    /* Automatisierte Browser (Rauch/Abnahme, navigator.webdriver) bekommen die Tour nicht automatisch –
       sie würde die gemessenen Hauptaktionen verdecken. Manuell bleibt sie über die Einstellungen da. */
    try { if (typeof navigator !== "undefined" && navigator && navigator.webdriver === true) return false; } catch (e) { /* egal */ }
    /* KEINE Hostnamen-/UA-Erkennung: echte Nutzer auf localhost/EXE/file sehen die Tour.
       Nur das explizite Automationsmerkmal (navigator.webdriver, Playwright/CDP) schaltet sie ab. */
    return tour();
  }
  function zuruecksetzen(){
    const e = einst();
    store.set("einst", Object.assign({}, e, {tour: Object.assign({}, e.tour || {}, {gesehen: false})}));
    return true;
  }
  function einstellungen(){
    const c = h("div", {class: "einst-zeile"},
      h("div", {class: "einst-text"}, h("strong", {}, "Einführung"),
        h("span", {}, "Die vier Schritte vom ersten Start noch einmal ansehen – jederzeit überspringbar.")),
      h("div", {class: "einst-steuer"},
        h("button", {type: "button", class: "knopf", onclick: () => { tour(); }}, "Einführung wiederholen")));
    return c;
  }
  (UI.startHaken ||= []).push(() => {
    try { UI.app.einstellungAbschnitt("Einführung", c => c.append(einstellungen())); } catch (e) { console.error("Onboarding: Einstellungen", e); }
    try { UI.onboarding.beimStart(); } catch (e) { console.error("Onboarding: Start", e); }
  });
  return {tour, gesehen, zuruecksetzen, beimStart, schliessen: () => schliessen(), merken};
})();
