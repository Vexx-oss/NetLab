"use strict";
/* ---------- Die Leiste: kompakte Ansicht am Bildschirmrand (Konzept § 9.7) ----------
   UI.leiste.aufbauen(container) / abbauen()      (UI.modus ruft das auf)
   UI.leiste.status({ampeln:[{name, farbe:"gruen"|"gelb"|"rot", zustand}], euroProStunde, ruf, offen, text})
   UI.leiste.miniBereich   DOM-Element für ein Mini-Ticket (Inhalt kommt vom Spiel; bleibt über Umbauten erhalten)
   Regeln: nur Maus, keine Tastatur, kein Ton, kein Fokusklau. 55 % deckend ohne Maus (einstellbar), voll deckend mit Maus,
   klappt bei Maus darüber auf (320×300) und 5 s nach dem Verlassen wieder zu (300×56). Ziehbar über die Griffleiste. */
UI.leiste = (() => {
  const ZU = [300, 56], AUF = [320, 300];     /* aufgeklappt: Platz für ein ganzes Mini-Ticket ohne Scrollen */
  const zustand = {ampeln: [], euroProStunde: null, ruf: null, offen: 0, text: "", titel: ""};
  let root = null, karte = null, el = {}, auf = false, zuTimer = null, aufTimer = null, groesseMarke = 0;
  let mini = null;                 /* erst bei Bedarf anlegen (keine Aufrufe beim Laden) */
  const miniEl = () => mini ||= h("div", {class: "lk-mini", "aria-label": "Mini-Ticket"});

  const einstLeiste = () => Object.assign({deckkraft: 0.55, ecke: "ol"}, (store.get("einst", {}) || {}).leiste);
  const FARBE = {gruen: "ok", ok: "ok", green: "ok", gelb: "warn", warn: "warn", yellow: "warn", orange: "warn", rot: "bad", bad: "bad", red: "bad"};
  function ampelSymbol(farbe){
    const f = FARBE[farbe] || "ok";
    const s = sv("svg", {viewBox: "0 0 12 12", width: 12, height: 12, class: "lk-ampel-sym f-" + f, "aria-hidden": "true"});
    if (f === "ok") s.append(sv("circle", {cx: 6, cy: 6, r: 5}));
    else if (f === "warn") s.append(sv("path", {d: "M6 1l5 9.5H1z"}));
    else s.append(sv("rect", {x: 1.5, y: 1.5, width: 9, height: 9, rx: 1}));
    return s;
  }
  const euroText = x => x == null || isNaN(x) ? "–" : `${Math.round(x).toLocaleString("de-DE")} €/h`;

  function aufbauen(container){
    abbauen();
    root = h("div", {class: "leiste-wurzel" + (Plattform.name === "browser" ? " im-browser" : "")});
    const drag = {"data-tauri-drag-region": ""};
    el.ampeln = h("div", {class: "lk-ampeln", ...drag});
    el.euro = h("span", {class: "lk-wert lk-euro", title: "Einnahmen je Stunde aus Wartungsverträgen", ...drag});
    el.ruf = h("span", {class: "lk-wert lk-ruf", title: "Ruf", ...drag});
    el.offen = h("span", {class: "lk-offen", title: "Offene Tickets", ...drag});
    el.text = h("p", {class: "lk-text"});
    const oeffnen = h("button", {type: "button", class: "lk-oeffnen", tabindex: "-1", title: "Vollansicht öffnen",
      onmousedown: e => e.preventDefault(), onclick: () => UI.modus("voll")}, UI.symbol("oeffnen", 18), h("span", {}, "öffnen"));
    const tray = Plattform.kann("tray");
    const ausblenden = tray.ja ? h("button", {type: "button", class: "lk-klein", tabindex: "-1", title: "Ins Tray ausblenden", onmousedown: e => e.preventDefault(),
      onclick: () => UI.modus("tray")}, "ausblenden") : null;
    karte = h("div", {class: "leiste-karte"},
      h("div", {class: "lk-zeile"},
        h("div", {class: "lk-griff", title: "Ziehen, um die Leiste zu verschieben", ...drag}, UI.symbol("griff", 16)),
        el.ampeln, h("div", {class: "lk-werte", ...drag}, el.euro, el.ruf, el.offen), oeffnen),
      h("div", {class: "lk-auf"}, el.text, miniEl(), h("div", {class: "lk-fuss"}, h("span", {class: "lk-marke"}, "Netzwerk-Labor"), ausblenden)));
    root.append(karte);
    karte.addEventListener("pointerenter", () => {
      karte.classList.add("hover");
      clearTimeout(zuTimer); zuTimer = null;
      if (!auf && !aufTimer) aufTimer = setTimeout(() => { aufTimer = null; aufklappen(); }, 280);
    });
    karte.addEventListener("pointerleave", () => {
      karte.classList.remove("hover");
      clearTimeout(aufTimer); aufTimer = null;
      clearTimeout(zuTimer);
      zuTimer = setTimeout(zuklappen, 5000);
    });
    container.replaceChildren(root);
    auf = false;
    darstellen();
    zeichnen();
    groesse(ZU);
  }
  function abbauen(){
    clearTimeout(zuTimer); clearTimeout(aufTimer); zuTimer = aufTimer = null;
    if (mini && mini.parentNode) mini.remove();
    root?.remove(); root = null; karte = null; el = {}; auf = false;
  }
  function groesse([b, hh]){
    const m = ++groesseMarke;
    try { Promise.resolve(Plattform.fenster.groesse(b, hh)).catch(e => { if (m === groesseMarke) console.warn("Leiste Größe", e); }); } catch (e) { console.warn(e); }
  }
  function aufklappen(){
    if (!karte || auf) return;
    auf = true;
    groesse(AUF);
    requestAnimationFrame(() => karte?.classList.add("auf"));
  }
  function zuklappen(){
    zuTimer = null;
    if (!karte || !auf || karte.classList.contains("hover")) return;
    auf = false;
    karte.classList.remove("auf");
    setTimeout(() => { if (!auf && karte) groesse(ZU); }, 200);
  }
  /* Deckkraft/Ecke aus den Einstellungen */
  function darstellen(){
    if (!root) return;
    const e = einstLeiste();
    root.style.setProperty("--leiste-deckkraft", String(klemme(+e.deckkraft || 0.55, 0.3, 1)));
    root.dataset.ecke = ["ol", "or", "ul", "ur"].includes(e.ecke) ? e.ecke : "ol";
  }
  function zeichnen(){
    if (!root) return;
    const z = zustand;
    el.ampeln.replaceChildren();
    if (z.ampeln && z.ampeln.length) {
      for (const a of z.ampeln.slice(0, 6)) el.ampeln.append(h("span", {class: "lk-ampel", title: `${a.name}: ${a.zustand || ""}`.trim(), "data-tauri-drag-region": ""}, ampelSymbol(a.farbe)));
      if (z.ampeln.length > 6) el.ampeln.append(h("span", {class: "lk-mehr"}, `+${z.ampeln.length - 6}`));
    } else el.ampeln.append(h("span", {class: "lk-keine", "data-tauri-drag-region": ""}, z.titel || "Netzwerk-Labor"));
    el.euro.textContent = euroText(z.euroProStunde);
    el.ruf.replaceChildren(UI.symbol("stern", 13), h("span", {}, z.ruf == null ? "–" : zahlDe(z.ruf)));
    const n = +z.offen || 0;
    el.offen.classList.toggle("hat", n > 0);
    el.offen.replaceChildren(h("span", {class: "lk-punkt"}), h("span", {}, String(n)));
    el.offen.title = n === 1 ? "1 offenes Ticket" : `${n} offene Tickets`;
    el.text.textContent = z.text || (z.ampeln?.length ? "" : "Noch keine Kunden. Öffne das Labor und probier dich aus.");
  }
  function status(s){ if (s && typeof s === "object") Object.assign(zustand, s); zeichnen(); }

  return {aufbauen, abbauen, status, darstellen, aufklappen, zuklappen,
          get miniBereich(){ return typeof document !== "undefined" ? miniEl() : null; }, get aufgebaut(){ return !!root; }, get offenAuf(){ return auf; }, get zustand(){ return {...zustand}; }};
})();
