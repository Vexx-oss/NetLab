"use strict";
/* ---------- Arbeitsblatt auf der Fläche (E1: Form „Adressplan“; Präfix bl-) ----------
   Statt der Netzfläche liegt ein Blatt mit der Tabelle: Bereich · Geräte · Netzadresse · Präfix · erster/letzter Host ·
   Broadcast. Gerechnet wird Zeile für Zeile (VLSM ist der Reihe nach: das nächste Netz beginnt nach dem Broadcast des
   vorigen) – nur die aktuelle Zeile hat Eingabefelder, fertige Zeilen stehen als Text da und lassen sich per Klick wieder
   öffnen (Platzbudget R5: höchstens fünf Felder zugleich). Eine Zeile ist fertig, wenn sie stimmt (Live-Haken: Einstieg,
   AP1) bzw. vollständig ausgefüllt ist (AP2 – ob sie stimmt, sagt erst die Abnahme). Kein Neuzeichnen beim Tippen. */
UI.blatt = (() => {
  const B = {iid: null, offen: null};            /* von Hand wieder geöffnete Zeile (Index) */
  function zeichnen(el, inst){
    const def = Spiel.defVon(inst), ziel = def && (def.ziele || []).find(z => z.typ === "tabelle");
    if (!ziel) { el.replaceChildren(); return; }
    if (B.iid !== inst.iid) { B.iid = inst.iid; B.offen = null; }
    const live = Spiel.regeln(inst).liveHaken;
    const wert = key => (inst.tabelle || {})[key];                     /* immer frisch – inst.tabelle entsteht erst beim ersten Eintrag */
    const soll = Spiel.beratung.soll(ziel);
    const stimmt = (z, s) => Spiel.beratung.gleich(s, wert(z.name + "." + s), soll[z.name][s]);
    const voll = (z, s) => String(wert(z.name + "." + s) || "").trim() !== "";
    const fertig = z => ziel.spalten.every(s => live ? stimmt(z, s) : voll(z, s));
    const ersteOffene = ziel.zeilen.findIndex(z => !fertig(z));
    const aktiv = B.offen != null ? B.offen : ersteOffene;            /* -1 = alles fertig */
    const neu = (fokus = true) => { zeichnen(el, inst); if (fokus) requestAnimationFrame(() => el.querySelector(".bl-feld")?.focus()); };

    const feldZelle = (z, s) => {
      const key = z.name + "." + s, td = h("td", {class: "bl-zelle"});
      const markieren = w => { td.classList.remove("ok", "falsch"); if (live && String(w || "").trim()) td.classList.add(Spiel.beratung.gleich(s, w, soll[z.name][s]) ? "ok" : "falsch"); };
      const feld = h("input", {type: "text", class: "bl-feld", value: wert(key) || "", spellcheck: "false", autocomplete: "off", inputmode: s === "praefix" ? "numeric" : "decimal",
        "aria-label": `${z.name}: ${Spiel.beratung.SPALTEN[s]}`, placeholder: s === "praefix" ? "/__" : "",
        onkeydown: e => { e.stopPropagation(); if (e.key === "Enter") e.target.blur(); },
        onchange: e => {
          Spiel.tabelleSetzen(inst, ziel, key, e.target.value); markieren(e.target.value);
          if (fertig(z)) { B.offen = null; neu(); }                    /* Zeile fertig → nächste Zeile bekommt die Felder */
        }});
      markieren(wert(key));
      td.append(feld);
      return td;
    };
    const textZelle = (z, s) => h("td", {class: "bl-wert" + (live ? (stimmt(z, s) ? " ok" : " falsch") : "")}, wert(z.name + "." + s) || "–");
    const zeile = (z, i) => {
      const kopf = [h("th", {scope: "row"}, z.name), h("td", {class: "bl-zahl"}, String(z.hosts))];
      if (i === aktiv) return h("tr", {class: "bl-aktiv"}, ...kopf, ...ziel.spalten.map(s => feldZelle(z, s)));
      if (aktiv === -1 || i < aktiv || fertig(z)) return h("tr", {class: "bl-fertig", title: "Klick: Zeile wieder bearbeiten", onclick: () => { B.offen = i; neu(); }}, ...kopf, ...ziel.spalten.map(s => textZelle(z, s)));
      return h("tr", {class: "bl-spaeter"}, ...kopf, ...ziel.spalten.map(() => h("td", {class: "bl-leer"}, "…")));
    };
    const tabelle = h("table", {class: "bl-tabelle"},
      h("thead", {}, h("tr", {}, h("th", {}, "Bereich"), h("th", {}, "Geräte"), ...ziel.spalten.map(s => h("th", {}, Spiel.beratung.SPALTEN[s])))),
      h("tbody", {}, ziel.zeilen.map(zeile)));
    const gleich = ziel.zeilen.every(z => z.praefix != null);
    const p = Spiel.beratung.pruefen(inst, ziel), angefangen = p.richtig + p.falsch.length > 0;
    el.replaceChildren(h("div", {class: "bl-blatt"},
      h("h2", {}, "Adressplan"),                                     /* Kunde und Titel stehen schon in der Auftragszeile */
      h("p", {class: "bl-vorgabe"}, `Basis ${ziel.basis} · ${gleich ? `${ziel.zeilen.length} × /${ziel.zeilen[0].praefix}` : "größter Bereich zuerst, lückenlos"}`),
      h("div", {class: "bl-rahmen"}, tabelle),
      live && angefangen ? h("p", {class: "bl-stand", "aria-live": "polite"}, `${p.richtig} von ${p.gesamt} Feldern richtig`) : null,
      B.offen != null ? h("button", {type: "button", class: "knopf geist klein", onclick: () => { B.offen = null; neu(); }}, "Zurück zur nächsten offenen Zeile") : null));
  }
  return {zeichnen};
})();
