"use strict";
/* ---------- Terminal im Dock (Plan – Ausbau 1.2, C1; Architektur § 9.5, Präfix tm-) ----------
   UI.terminal.oeffnen(geraetId, {eingabe?, notiz?})  Reiter „Terminal“ im Dock, eine Sitzung je Gerät (Reiterchen oben, × schließt);
     eingabe steht vorbereitet in der Zeile (Enter führt aus), notiz sagt, woher sie kommt
   UI.terminal.schliessen(geraetId)
   Öffnen: Doppelklick auf ein Gerät, Taste T oder C, Rechtsklick „Konsole öffnen“, Knopf im Inspektor-Kopf.
   Die Konsole selbst (Eingabe, Verlauf, Tab, ?) ist UI.konsole; deren Sitzungen leben je Netz weiter, auch wenn der
   Reiter wechselt. Befehle mit Aufzeichnung spielen das Paket auf der Fläche ab und bieten „Pakete ansehen ▸“. */
UI.terminal = (() => {
  const T = {netz: null, sitzungen: [], aktiv: null};
  const OS = {windows: "cmd", linux: "bash", ios: "IOS"};
  const netz = () => UI.labor.netz;
  function abgleichen(){
    const n = netz();
    if (T.netz !== n) { T.netz = n; T.sitzungen = []; T.aktiv = null; }
    if (n) T.sitzungen = T.sitzungen.filter(id => n.geraete[id]);
    if (!T.sitzungen.includes(T.aktiv)) T.aktiv = T.sitzungen[T.sitzungen.length - 1] || null;
  }
  function oeffnen(id, {eingabe, notiz} = {}){
    const n = netz(), g = n && n.geraete[id];
    if (!g || g.typ === "internet") { if (g) UI.toast("Das Internet ist Kulisse und hat keine Konsole.", "info", {dauer: 2600}); return; }
    abgleichen();
    if (!T.sitzungen.includes(id)) T.sitzungen.push(id);
    T.aktiv = id; T.frisch = true;
    UI.labor.dockReiter("terminal", true);
    UI.labor.dock("terminal");
    zeichnen({eingabe, notiz, fokus: true});
  }
  function schliessen(id){
    abgleichen();
    T.sitzungen = T.sitzungen.filter(x => x !== id);
    if (T.aktiv === id) T.aktiv = T.sitzungen[T.sitzungen.length - 1] || null;
    if (!T.sitzungen.length) { UI.labor.dockReiter("terminal", false); return; }
    zeichnen({fokus: true});
  }
  function zeichnen({eingabe, notiz, fokus = false} = {}){
    const c = UI.labor.el?.terminal, n = netz();
    if (!c || !n) return;
    abgleichen();
    if (!T.aktiv) { c.replaceChildren(h("p", {class: "tm-leer"}, "Doppelklick auf ein Gerät öffnet hier sein Terminal.")); return; }
    const reiter = h("div", {class: "tm-reiter", role: "tablist", "aria-label": "Terminal-Sitzungen"}, T.sitzungen.map(id => {
      const g = n.geraete[id], an = id === T.aktiv;
      return h("div", {class: "tm-tab" + (an ? " an" : "")},
        h("button", {type: "button", role: "tab", class: "tm-tab-name", "aria-selected": String(an), title: `${g.name} (${OS[Modell.osVon(g)] || ""})`,
          onclick: () => { T.aktiv = id; zeichnen({fokus: true}); }}, g.name, h("small", {class: "tm-os"}, OS[Modell.osVon(g)] || "")),
        h("button", {type: "button", class: "tm-tab-zu", title: "Sitzung schließen", "aria-label": `Sitzung ${g.name} schließen`, onclick: () => schliessen(id)}, "×"));
    }));
    const flaeche = h("div", {class: "tm-flaeche"});
    c.replaceChildren(h("div", {class: "tm"}, T.sitzungen.length > 1 ? reiter : null, flaeche));   /* Reiterleiste erst ab zwei Sitzungen */
    /* Den aktiven Reiter ins Bild holen. Gemessen von „menu-auditor“ am 06.10.2026
       (720 × 640): der dritte Reiter „PC-Kasse“ lag bei scrollWidth 388 in 249 px
       vollständig außerhalb und war nicht anklickbar. `scrollIntoView({inline:"nearest"})`
       allein genügte nicht — selbst gemessen: bei 1280 × 800 blieb der aktive Reiter
       rechts draußen (x 1146…1270 in einem Scrollfenster bis 1270, Rollbalken 10 px).
       Deshalb den Bildlauf ausdrücklich setzen; `Math.max(0, …)` fängt ab, dass der linke
       Rand vor den Inhalt rutscht (bei zwei Reitern in 239 px passiert: der erste Reiter
       stand auf x 466, also links außerhalb). */
    const aktiverReiter = reiter.querySelector(".tm-tab.an");
    if (aktiverReiter) {
      const links = aktiverReiter.offsetLeft, rechtsKante = links + aktiverReiter.offsetWidth;
      if (links < reiter.scrollLeft) reiter.scrollLeft = Math.max(0, links - 4);
      else if (rechtsKante > reiter.scrollLeft + reiter.clientWidth) reiter.scrollLeft = rechtsKante - reiter.clientWidth + 4;
    }
    UI.konsole.oeffnen(flaeche, n, T.aktiv, UI.labor.verlauf, {fokus, eingabe: eingabe || undefined, notiz});
  }
  Bus.an("labor-geladen", () => { T.netz = null; abgleichen(); });
  Bus.an("dock", d => { if (d && d.reiter === "terminal") requestAnimationFrame(() => { if (T.frisch) { T.frisch = false; return; } zeichnen({fokus: true}); }); });
  return {oeffnen, schliessen, zeichnen, get sitzungen(){ return T.sitzungen.slice(); }, get aktiv(){ return T.aktiv; }};
})();
