"use strict";
/* ---------- Bento 2.5: gemeinsame kleine Bausteine für die Arbeitsplatz-Ansichten ----------
   Vertrag: docs/Architektur.md § 22. Gehört der Leitung (Integration); Bereichs-Dateien rufen die
   Funktionen auf, ändern diese Datei aber nicht.
   UI.bento.monogramm(name, {farbe, gross, klein})  – Initialen-Marke statt Emoji
   UI.bento.initialen(name)                        – „Salon Lockenwerk" -> „SL"
   UI.bento.kachel(klasse, ...kinder)              – section.bn-k
   UI.bento.kopf(kicker, titel, ...rechts)         – header.bn-kopf mit Mikrolabel + Titel
   Alle Klassen stehen in src/stil/bento.css. */
UI.bento = (() => {
  const STUMM = /^(der|die|das|gmbH|GmbH|AG|und|&)$/i;
  function initialen(name){
    const worte = String(name || "").replace(/[^\p{L}\p{N} .&/-]/gu, " ").split(/[\s/&.-]+/).filter(Boolean);
    const gut = worte.filter(w => !STUMM.test(w));
    const quelle = gut.length ? gut : worte;
    return (quelle.slice(0, 2).map(w => w[0]).join("") || "?").toUpperCase();
  }
  function monogramm(name, {farbe = "--accent", gross = false, klein = false} = {}){
    const el = h("span", {class: "bn-marke" + (gross ? " gross" : klein ? " klein" : ""), style: {"--bn-f": `var(${farbe})`}, "aria-hidden": "true"});
    el.textContent = initialen(name);
    return el;
  }
  function kachel(klasse, ...kinder){
    return h("section", {class: "bn-k" + (klasse ? " " + klasse : "")}, ...kinder);
  }
  function kopf(kicker, titel, ...rechts){
    return h("header", {class: "bn-kopf"},
      h("div", {}, h("span", {class: "bn-kicker"}, kicker), h("h3", {class: "bn-titel"}, titel)),
      ...rechts);
  }
  return {initialen, monogramm, kachel, kopf};
})();
