"use strict";
/* ---------- Arbeitsblatt auf der Fläche (E1: Form „Adressplan“; Präfix bl-) ----------
   Statt der Netzfläche liegt ein Blatt mit der Tabelle: Bereich · Geräte · Netzadresse · Präfix · erster/letzter Host ·
   Broadcast. Jede Zelle wird beim Verlassen geprüft (Spiel.tabelleSetzen); ✓/✗ je Zelle nur, wo das Niveau Live-Haken
   zeigt (Einstieg, AP1) – im AP2 sagt erst die Abnahme, ob es reicht. Kein Neuzeichnen beim Tippen: Fokus bleibt. */
UI.blatt = (() => {
  function zeichnen(el, inst){
    const def = Spiel.defVon(inst), ziel = def && (def.ziele || []).find(z => z.typ === "tabelle");
    if (!ziel) { el.replaceChildren(); return; }
    const live = Spiel.regeln(inst).liveHaken, werte = inst.tabelle || {}, K = Spiel.kundenDaten(inst.kunde || def.kunde);
    const soll = Spiel.beratung.soll(ziel);
    const stand = h("p", {class: "bl-stand", "aria-live": "polite"});
    const standZeigen = () => { if (!live) return; const p = Spiel.beratung.pruefen(inst, ziel); stand.textContent = `${p.richtig} von ${p.gesamt} Feldern richtig`; };
    const zelle = (z, s) => {
      const key = z.name + "." + s, td = h("td", {class: "bl-zelle"});
      const markieren = w => { td.classList.remove("ok", "falsch"); if (live && String(w || "").trim()) td.classList.add(Spiel.beratung.gleich(s, w, soll[z.name][s]) ? "ok" : "falsch"); };
      const feld = h("input", {type: "text", class: "bl-feld", value: werte[key] || "", spellcheck: "false", autocomplete: "off", inputmode: s === "praefix" ? "numeric" : "decimal",
        "aria-label": `${z.name}: ${Spiel.beratung.SPALTEN[s]}`, placeholder: s === "praefix" ? "/__" : "",
        onkeydown: e => { e.stopPropagation(); if (e.key === "Enter") e.target.blur(); },
        onchange: e => { Spiel.tabelleSetzen(inst, ziel, key, e.target.value); markieren(e.target.value); standZeigen(); }});
      markieren(werte[key]);
      td.append(feld);
      return td;
    };
    const tabelle = h("table", {class: "bl-tabelle"},
      h("thead", {}, h("tr", {}, h("th", {}, "Bereich"), h("th", {}, "Geräte"), ...ziel.spalten.map(s => h("th", {}, Spiel.beratung.SPALTEN[s])))),
      h("tbody", {}, ziel.zeilen.map(z => h("tr", {}, h("th", {scope: "row"}, z.name), h("td", {class: "bl-zahl"}, String(z.hosts)), ...ziel.spalten.map(s => zelle(z, s))))));
    const gleich = ziel.zeilen.every(z => z.praefix != null);
    el.replaceChildren(h("div", {class: "bl-blatt"},
      h("h2", {}, `Adressplan · ${K.name}`),
      h("p", {class: "bl-vorgabe"}, `Basisnetz ${ziel.basis} · ${gleich ? `vier gleich große Netze (/${ziel.zeilen[0].praefix})` : "so knapp wie möglich: größter Bereich zuerst, lückenlos"}`),
      h("div", {class: "bl-rahmen"}, tabelle),
      stand,
      h("p", {class: "bl-tipp"}, "Adressen je Netz = Geräte + 2, aufgerundet auf eine Zweierpotenz (2^(32 − Präfix)).")));
    standZeigen();
  }
  return {zeichnen};
})();
