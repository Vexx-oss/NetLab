"use strict";
/* ---------- Netz-Editor: die Labor-Ansicht (Konzept § 7 „Fläche“, Architektur § 9) ----------
   UI.labor = { netz, verlauf, auswahl:{geraet, port}|null, auswahlMehr() → [ids],
                laden(netz, {titel, verlauf?, auftrag?(el)}), auswaehlen(id, port?), hervorheben(liste, ms?),
                animiere(ereignis, {ms}?), zeigeTrace(trace), neuZeichnen(),
                einpassen(), aufraeumen(), werkzeug(name), zentrieren(id), ping(vonId, nachId), konsole(id),
                zeigen(container)  (von UI.app), el:{auftrag, inspektor, sim} }
   Andockbereiche (für andere Bausteine): #labor-auftrag (oben) und das Dock rechts (K1, Phase B) mit den Reitern
   #labor-inspektor · #labor-sim · #labor-plan · #labor-akte – ein Reiter erscheint erst, wenn er Inhalt hat.
   UI.labor.dock(id|null) zeigt einen Reiter (oder klappt ein), UI.labor.dockReiter(id, verfuegbar) gibt Plan/Akte frei.
   Ruhe beim Start (Ausbau 1.2, A3): Inspektor erscheint erst mit der ersten Auswahl, die Simulation erst mit der ersten
   Aufzeichnung (und klappt dann einmal auf). laden(netz, {ebene, ansichtMenue:false}) – das Ticket legt die Ebene fest.
   Geräte-Fächer: editor-fach.js (UI.laborFach).
   Änderungen laufen nur über verlauf.aendern(); gezeichnet wird nach Bus „netz-geaendert“ (gebündelt per rAF).
   Werkzeuge/Zeiger: editor-werkzeuge.js (UI.laborWerkzeuge), Pakete/Ping: editor-pakete.js (UI.laborPakete). */
UI.labor = (() => {
  const RASTER = 20;
  const Z = {
    netz: null, verlauf: null, opt: {}, titel: "Labor",
    root: null, svg: null, welt: null, s: {}, el: {},
    view: {tx: 0, ty: 0, k: 1},
    auswahl: null, auswahlSet: new Set(), kabelWahl: null,
    werkzeug: "auswahl", platz: null, pingVon: null,
    gEl: new Map(), kEl: new Map(), karten: new Map(), versatz: new Map(),
    warn: new Map(), ohne: new Set(),
    pos: new Map(),              /* id → {x, y} während Ziehen/Animation (überschreibt das Modell nur optisch) */
    hover: null, geplant: false, einpassenAusstehend: true,
    ende: [],                    /* Port-LEDs und Portnamen in Z.s.ueber; Aufbau in kabelEndenBauen() */
    kabelHover: null, geraeteHover: null,
  };
  const F = {};                  /* interne Helfer für editor-werkzeuge.js / editor-pakete.js */
  function bereit(){ if (!F.animiere && UI.laborPakete) UI.laborPakete.einrichten(Z, F); return F; }

  const pos = id => Z.pos.get(id) || Z.netz?.geraete[id] || null;
  const raster = v => Math.round(v / RASTER) * RASTER;
  const einst = () => store.get("einst", {}) || {};
  /* „!“-Warnungen der Live-Prüfung (Modell.pruefen): Stufenregeln entscheiden je Ticket (laden-Option warnungen) */
  const warnungenAn = () => { const w = Z.opt && Z.opt.warnungen; return typeof w === "function" ? !!w() : w !== false; };
  function einstLabor(teil){ const e = einst(); e.labor = Object.assign({}, e.labor, teil); store.set("einst", e); }

  /* ---------- Aufbau ---------- */
  function zeigen(container){
    Z.root = h("div", {class: "labor"});
    Z.el.auftrag = h("div", {id: "labor-auftrag", class: "lb-auftrag"});
    Z.el.inspektor = h("div", {id: "labor-inspektor", class: "lb-inspektor"});
    Z.el.sim = h("div", {id: "labor-sim", class: "lb-sim-inhalt"});
    Z.el.plan = h("div", {id: "labor-plan", class: "lb-plan"});
    Z.el.akte = h("div", {id: "labor-akte", class: "lb-akte"});
    Z.el.terminal = h("div", {id: "labor-terminal", class: "lb-terminal"});
    const SCHMAL = typeof innerWidth === "number" && innerWidth < 1100;
  Z.inspWartet = Z.inspWartet ?? SCHMAL; Z.simWartet = Z.simWartet ?? true;  /* A: Inspektor ab 1100 px immer da */
    Z.dock ||= {reiter: "inspektor", zu: SCHMAL}; Z.dockDa ||= {};

    /* Geräteleiste: vier Kategorien, Klick öffnet ein Fach (editor-fach.js) */
    const leiste = h("aside", {class: "lb-geraete", "aria-label": "Geräte"});
    Z.el.geraete = leiste;

    /* Fläche */
    Z.svg = sv("svg", {class: "lb-svg", tabindex: "0", role: "application", "aria-label": "Netz-Zeichenfläche. Pfeiltasten verschieben die Ansicht, F passt ein, Fragezeichen zeigt alle Tasten."});
  /* POLARIS: Die Karten sind größer – ändert sich die Fläche (Begrüßung klappt zu, Dock öffnet),
     wird neu eingepasst, sonst läge ein Gerät außerhalb der Zeichenfläche (Rauchtest 720 px). */
  if (typeof ResizeObserver === "function") {
    let letzteGroesse = "";
    const beobachter = new ResizeObserver(() => {
      const r = Z.svg.getBoundingClientRect(), jetzt = Math.round(r.width) + "x" + Math.round(r.height);
      if (jetzt === letzteGroesse || !Z.netz || !r.width || !r.height) return;
      letzteGroesse = jetzt;
      /* Wechselt das Fenster über die 900-px-Grenze, aendern sich die Knotenmaße (160x76 / 118x64).
         Ohne Neuzeichnen behielten die alten Karten ihre Maße und der Kanten-Anker passte nicht mehr. */
      if (Z.gemaltKw && Z.gemaltKw !== kartenMasse().kw) { neuZeichnen(); }
      einpassen(false);
    });
    beobachter.observe(Z.svg);
  }
    const defs = sv("defs", {},
      sv("pattern", {id: "lb-raster", width: RASTER, height: RASTER, patternUnits: "userSpaceOnUse"},
        sv("circle", {cx: 0, cy: 0, r: 1.1, class: "lb-raster-punkt"}), sv("circle", {cx: RASTER, cy: 0, r: 1.1, class: "lb-raster-punkt"}),
        sv("circle", {cx: 0, cy: RASTER, r: 1.1, class: "lb-raster-punkt"}), sv("circle", {cx: RASTER, cy: RASTER, r: 1.1, class: "lb-raster-punkt"})));
    Z.raster = sv("rect", {class: "lb-raster", x: 0, y: 0, width: "100%", height: "100%", fill: "url(#lb-raster)"});
    Z.welt = sv("g", {class: "lb-welt"});
    for (const n of ["zonen", "kabel", "geraete", "karten", "ueber", "pakete", "band"]) Z.welt.append(Z.s[n] = sv("g", {class: "lb-s-" + n}));
    /* Port-LED und Portname gehören ÜBER die Karten (Befund B4: sie lagen unter der Karte und blieben
       unsichtbar). Eigene Untergruppe in Z.s.ueber; editor-werkzeuge.js hängt seine Hover-Ports später
       an, sie liegen damit weiter oben. */
    Z.el.kabelEnden = sv("g", {});
    Z.s.ueber.append(Z.el.kabelEnden);
    Z.svg.append(defs, Z.raster, Z.welt);

    Z.el.ansicht = h("button", {type: "button", class: "lb-ansicht", "aria-haspopup": "menu", title: "Ansicht: welche Ebene die Fläche zeigt (Umschalt+1 … 5)",
      onclick: e => ansichtMenue(e.currentTarget)}, UI.symbol("ebenen", 17), h("span", {class: "lb-ansicht-text"}), UI.symbol("pfeilUnten", 14));
    /* Die Taste steht sichtbar im Knopf, nicht nur im Tooltip (Rückmeldung 05.10.2026: „Werkzeuge,
       arbeitsmodi wie ping oder so sollten Hotkeys für besseren workflow erhalten"). Die Kürzel gab es
       schon – man fand sie nur nicht. Ein <kbd> im Knopf ist kein zusätzliches Bedienelement, das
       Platzbudget (≤ 12) bleibt also unberührt. */
    const wz = (name, sym, titel, taste) => h("button", {type: "button", class: "lb-wz", "data-wz": name, title: titel, "aria-label": titel,
      onclick: () => werkzeug(name)}, UI.symbol(sym, 19), taste ? h("kbd", {class: "lb-wz-taste"}, taste) : null);
    const knopf = (sym, titel, fn, cls = "") => h("button", {type: "button", class: "lb-knopf " + cls, title: titel, "aria-label": titel, onclick: fn}, UI.symbol(sym, 18));
    Z.el.zurueck = knopf("zurueck", "Rückgängig (Strg+Z)", () => rueckgaengig());
    Z.el.vor = knopf("vor", "Wiederholen (Strg+Y)", () => wiederholen());
    Z.el.zoomText = h("button", {type: "button", class: "lb-zoomtext", "aria-haspopup": "menu", title: "Zoom und Anordnung (Mausrad zoomt, F passt ein)",
      onclick: e => zoomMenue(e.currentTarget)}, "100 %");
    Z.el.ansichtGruppe = h("div", {class: "lb-gruppe"}, Z.el.ansicht);
    Z.el.verlaufGruppe = h("div", {class: "lb-gruppe", hidden: true}, Z.el.zurueck, Z.el.vor);   /* erst sichtbar, wenn es etwas rückgängig zu machen gibt */
    const oben = h("div", {class: "lb-leiste-oben"},
      h("div", {class: "lb-gruppe lb-werkzeuge", role: "toolbar", "aria-label": "Werkzeuge"},
        wz("auswahl", "zeiger", "Auswählen und verschieben (V)", "V"), wz("kabel", "kabel", "Kabel verlegen (K): vom Gerät zum Gerät ziehen", "K"), wz("ping", "ping", "Ping-Werkzeug (P): von Gerät A auf Gerät B ziehen", "P")),
      Z.el.ansichtGruppe,
      h("div", {class: "lb-luecke"}),
      Z.el.verlaufGruppe);
    const unten = h("div", {class: "lb-leiste-unten"}, Z.el.zoomGruppe = h("div", {class: "lb-gruppe"}, Z.el.zoomText));
    Z.el.hinweis = h("div", {class: "lb-hinweis", "aria-live": "polite"});
    /* § 18: Szenen-Legende wie im Prototyp (unten links) */
    Z.el.legende = h("div", {class: "lb-legende", "aria-hidden": "true"},
      h("span", {class: "lg lg-verbunden"}, "VERBUNDEN"),
      h("span", {class: "lg lg-getrennt"}, "GETRENNT"),
      h("span", {class: "lg lg-kein"}, "KEIN LINK"));
    Z.el.leer = h("div", {class: "lb-leer", hidden: true},
      h("strong", {}, "Die Fläche ist leer."),
      h("p", {}, "Öffne links ein Fach und zieh ein Gerät hierher – oder doppelklicke auf die Fläche."));
    /* Fernwartung (E1): Die Fläche ist verdeckt – man sieht nur, was die Befehle des einen Rechners zeigen */
    Z.el.fern = h("div", {class: "lb-fern-schild", hidden: true});
    Z.el.blatt = h("div", {class: "lb-blatt", hidden: true});                 /* Arbeitsblatt statt Fläche (E1: Adressplan) */
    const leinwand = h("div", {class: "lb-leinwand"}, Z.svg, oben, unten, Z.el.hinweis, Z.el.leer, Z.el.fern, Z.el.blatt, Z.el.legende);
    Z.el.leinwand = leinwand;

    /* Dock rechts (K1): Inspektor · Simulation · Plan · Akte in EINEM Bereich mit Reitern – die Fläche behält die volle Höhe
       und ≥ 60 % der Breite (CSS: clamp(250px, 40 % − 88px, 440px)). Die Simulation liegt nicht mehr unten. */
    Z.el.dockReiter = h("div", {class: "lb-dock-reiter", role: "tablist", "aria-label": "Dock"});
    Z.el.dockInhalt = h("div", {class: "lb-dock-inhalt"}, Z.el.inspektor, Z.el.sim, Z.el.terminal, Z.el.plan, Z.el.akte);
    Z.el.dock = h("aside", {class: "lb-dock", "aria-label": "Dock"}, Z.el.dockReiter, Z.el.dockInhalt);

    const mitte = h("div", {class: "lb-mitte"}, Z.el.auftrag, leinwand);
    Z.root.append(leiste, mitte, Z.el.dock);
    container.replaceChildren(Z.root);

    /* Die Auftragsmappe hängt als Overlay unter der Auftragsleiste und überdeckt damit den
       oberen Rand der Fläche – genau dort schwebt die Werkzeugleiste (`top:10px`, z-index 20).
       Die Mappe liegt in `.lb-auftrag` (z-index 10) und kommt aus diesem Stapelkontext nicht
       heraus; ihre 30 helfen ihr nicht. Gemessen am 09.10.2026 (1200x760): Werkzeugleiste
       y=121–169, Mappen-Reiter y=120–164 – der Text lag exakt darunter und die Lücken der
       Leiste ließen ihn durchscheinen („Tools überlappen Text", Rückmeldung des Nutzers).
       Deshalb misst ein Beobachter die Höhe der Leiste und stellt sie als `--leiste-h` bereit;
       `spiel.css` gibt der Mappe damit genau so viel Kopfraum, dass ihr Inhalt darunter beginnt.
       Gemessen statt geschätzt: die Leiste ist bei grober Zeigereingabe 44 px hoch, sonst 48. */
    const setzeLeisteHoehe = () => {
      const hh = oben.offsetHeight;
      if (hh) Z.root.style.setProperty("--leiste-h", hh + "px");
    };
    setzeLeisteHoehe();
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(setzeLeisteHoehe).observe(oben);

    if (typeof ResizeObserver !== "undefined") {
      let alt = null;
      new ResizeObserver(() => {
        const r = Z.svg.getBoundingClientRect();
        /* Solange niemand selbst gezoomt oder verschoben hat, bleibt das Netz eingepasst (Coach-, Ziel- und Simulationszeilen ändern die Höhe) */
        if (alt && alt.w && alt.h && r.width && r.height) {
          if (Z.eingepasst && Z.netz) einpassen(false);
          else { Z.view.tx += (r.width - alt.w) / 2; Z.view.ty += (r.height - alt.h) / 2; ansichtSetzen(); }
        }
        else if (r.width && Z.einpassenAusstehend && Z.netz) { Z.einpassenAusstehend = false; einpassen(false); }
        alt = {w: r.width, h: r.height};
      }).observe(leinwand);
    }
    UI.laborFach?.einrichten(Z, F);
    UI.laborWerkzeuge?.einrichten(Z, F);
    bereit();
    layoutAnwenden();
    auftragZeichnen();
    werkzeugAnzeigen();
    if (Z.netz) { zeichnen(); inspektorZeigen(); }
    simLeer();
    /* Werkstatt (Architektur § 16.5): Leiste nur im Sandbox-Kontext, Minimap immer – reine Ansicht. */
    if (UI.werkstatt?.einrichten?.(Z.root, {sandbox: !!Z.opt.sandbox}) && Z.el.zoomGruppe) Z.el.zoomGruppe.hidden = true;
    requestAnimationFrame(() => { if (Z.einpassenAusstehend || !Z.gesehen) { einpassen(false); Z.einpassenAusstehend = false; Z.gesehen = true; } else ansichtSetzen(); });
  }
  /* Wiederanzeige nach Ansichtswechsel (DOM blieb erhalten) */
  function wieder(){ if (Z.netz) zeichnen(); }

  /* ---------- Dock (K1) ---------- */
  const DOCK = [
    {id: "inspektor", titel: "Inspektor", symbol: "inspektor", el: () => Z.el.inspektor, da: () => !Z.inspWartet},
    {id: "sim", titel: "Simulation", symbol: "sim", el: () => Z.el.sim, da: () => !Z.simWartet},
    {id: "terminal", titel: "Terminal", symbol: "konsole", el: () => Z.el.terminal, da: () => !!Z.dockDa?.terminal},
    {id: "plan", titel: "Plan", symbol: "plan", el: () => Z.el.plan, da: () => !!Z.dockDa?.plan},
    {id: "akte", titel: "Akte", symbol: "akte", el: () => Z.el.akte, da: () => !!Z.dockDa?.akte},
  ];
  const dockOffen = id => !!Z.root && !Z.dock.zu && Z.dock.reiter === id && DOCK.some(r => r.id === id && r.da());
  function layoutAnwenden(){
    if (!Z.root) return;
    const da = DOCK.filter(r => r.da());
    if (da.length && !da.some(r => r.id === Z.dock.reiter)) Z.dock.reiter = da[0].id;
    Z.inspektorZu = !dockOffen("inspektor"); Z.simZu = !dockOffen("sim");
    Z.root.classList.toggle("dock-da", da.length > 0);
    Z.root.classList.toggle("dock-zu", !!Z.dock.zu);
    Z.root.classList.toggle("sim-zu", Z.simZu);              /* ältere Abfragen (Paketanzeige) */
    for (const r of DOCK) { const el = r.el(); if (el) el.hidden = !r.da() || Z.dock.zu || r.id !== Z.dock.reiter; }
    if (!Z.el.dockReiter) return;
    /* `.filter(Boolean)` ist Pflicht: `replaceChildren` macht aus einem `null`-Argument den
       TEXT „null" (die DOM-Umwandlung nimmt `undefined` als leeren String, `null` aber als
       „null"). Gemessen von „mobil-verifier“ am 06.10.2026 im eingeklappten Reiterstreifen:
       dort stand sichtbar „null" (DOM: ["lb-dock-tab", TEXT:"null"]) — der Einklapp-Knopf
       fehlt ja, wenn das Dock zu ist, und die Bedingung lieferte genau dieses `null`. */
    Z.el.dockReiter.replaceChildren(...[...da.map(r => {
      const an = !Z.dock.zu && r.id === Z.dock.reiter, z = Z.dockZahl?.[r.id];
      return h("button", {type: "button", role: "tab", class: "lb-dock-tab" + (an ? " an" : ""), "data-reiter": r.id, "aria-selected": String(an),
        title: an ? `${r.titel} einklappen` : r.titel, onclick: () => an ? dockZu() : dockZeigen(r.id)},
        UI.symbol(r.symbol, 17), h("span", {class: "lb-dock-titel"}, r.titel), z ? h("b", {class: "lb-dock-zahl"}, z > 99 ? "99+" : String(z)) : null);
    }), da.length && !Z.dock.zu ? h("button", {type: "button", class: "lb-dock-einklappen", title: "Dock einklappen", "aria-label": "Dock einklappen", onclick: () => dockZu()}, UI.symbol("pfeil", 16)) : null].filter(Boolean));
  }
  function dockZeigen(id){
    if (!DOCK.some(r => r.id === id)) return;
    if (id === "inspektor") Z.inspWartet = false;
    if (id === "sim") Z.simWartet = false;
    Z.dock.reiter = id; Z.dock.zu = false;
    layoutAnwenden();
    Bus.senden("dock", {reiter: id});
  }
  function dockZu(){ Z.dock.zu = true; layoutAnwenden(); Bus.senden("dock", {reiter: null}); }
  /* Reiter freigeben/sperren (Plan, Akte); zahl = kleine Zählmarke am Reiter */
  function dockReiter(id, verfuegbar, {zahl} = {}){
    Z.dockDa ||= {}; Z.dockZahl ||= {};
    if (verfuegbar != null) Z.dockDa[id] = !!verfuegbar;
    if (zahl !== undefined) Z.dockZahl[id] = zahl;
    layoutAnwenden();
  }
  function laschenText(){}
  function inspektorUmschalten(zu = dockOffen("inspektor")){ if (zu) { if (dockOffen("inspektor")) dockZu(); } else dockZeigen("inspektor"); }
  /* Simulation: startet in jedem geladenen Netz unsichtbar; die erste Aufzeichnung zeigt sie einmal im Dock */
  function simUmschalten(zu = dockOffen("sim")){ if (zu) { if (dockOffen("sim")) dockZu(); } else dockZeigen("sim"); }
  function simHoeheSetzen(){}

  function auftragZeichnen(){
    const el = Z.el.auftrag; if (!el) return;
    el.replaceChildren();
    if (typeof Z.opt.auftrag === "function") { try { Z.opt.auftrag(el); werkzeugAnzeigen(); return; } catch (e) { console.error("Auftragsleiste", e); } }
    el.append(h("div", {class: "lb-auftrag-standard"}, h("strong", {}, Z.titel || "Labor")));
  }

  /* ---------- Ansicht (Zoom/Verschieben) ---------- */
  function ansichtSetzen(){
    const {tx, ty, k} = Z.view;
    Z.welt?.setAttribute("transform", `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(4)})`);
    const pat = Z.svg?.querySelector("#lb-raster");
    pat?.setAttribute("patternTransform", `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(4)})`);
    Z.raster?.classList.toggle("fein", k < 0.5);
    if (Z.el.zoomText) Z.el.zoomText.textContent = Math.round(k * 100) + " %";
    /* Lesbarkeit mit dem Zoom (Vertrag Lagebild 2.0 § 3.4, Befund B1/B6): Statt bei jedem Zoom zu
       schrumpfen, werden die Beschriftungen gegenskaliert (s = min(1,6; max(1; 1/k))). Die drei
       Stufen am <svg> blenden danach nur, was nicht mehr in die Karte passt; sichtbar bleiben immer
       der Name und die Zonen-Chips – deren Container wird NIE per CSS versteckt. */
    Z.svg?.classList.toggle("wenig-text", k < 0.8);
    Z.svg?.classList.toggle("klein", k < 0.7);
    Z.svg?.classList.toggle("sehr-klein", k < 0.4);
    beschriftungenSkalieren();
    kabelEndenAktualisieren();
    UI.werkstatt?.ansichtGeaendert?.();
  }
  /* Gegenskalierung der Beschriftungen: s = min(1,6; max(1; 1/k)). Skaliert wird um den Textanker
     (x0, yOff) bzw. um den Chip-Anker – so bleibt die linke obere Ecke stehen. Der Vertrag notiert die
     Formel mit x=0; ohne den x0-Anteil wanderte die Textkante beim Zoomen waagerecht weg. */
  /* Obergrenze 1,12 (Vorgabe der Leitung 30.10.2026): Bei 1,6 sprengte der Textblock die Karte
     (gemessen: k=0,65 -> s=1,54 -> Unterkante +57 Welt statt +38). Mit 1,12 bleibt der Block bei
     jeder Zoomstufe innerhalb des Rahmens; unter k=0,8 fällt die Rolle weg, unter 0,7 die Adresse. */
  function skalaFuerZoom(pk){ return Math.min(1.12, Math.max(1, 1 / (pk || 1))); }
  function beschriftungenSkalieren(){
    if (!Z.netz) return;
    const s = skalaFuerZoom(Z.view.k), sTxt = s.toFixed(3);
    for (const el of Z.gEl.values()) {
      const t = el.querySelector ? el.querySelector(".ger-text") : null;
      if (!t) continue;
      const x0 = Number(t.getAttribute("data-x")) || 0, yOff = Number(t.getAttribute("data-y")) || 0;
      t.setAttribute("transform", `translate(${x0.toFixed(1)} ${yOff.toFixed(1)}) scale(${sTxt}) translate(${(-x0).toFixed(1)} ${(-yOff).toFixed(1)})`);
    }
    for (const el of Z.s.zonen.querySelectorAll(".zone-label")) {
      const x = Number(el.getAttribute("data-x")) || 0, y = Number(el.getAttribute("data-y")) || 0;
      el.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${sTxt})`);
    }
  }
  function weltPunkt(clientX, clientY){
    const r = Z.svg.getBoundingClientRect();
    return {x: (clientX - r.left - Z.view.tx) / Z.view.k, y: (clientY - r.top - Z.view.ty) / Z.view.k};
  }
  function zoomUm(faktor, cx, cy){
    const r = Z.svg.getBoundingClientRect();
    const mx = cx - r.left, my = cy - r.top, alt = Z.view.k;
    const k = klemme(alt * faktor, 0.25, 3);
    Z.eingepasst = false;
    Z.view.tx = mx - (mx - Z.view.tx) * (k / alt);
    Z.view.ty = my - (my - Z.view.ty) * (k / alt);
    Z.view.k = k;
    ansichtSetzen();
  }
  function zoomSchritt(f){ const r = Z.svg.getBoundingClientRect(); Z.eingepasst = false; ansichtAnimieren(zielZoom(Z.view.k * f, r.left + r.width / 2, r.top + r.height / 2)); }
  function zoomAuf(k){ const r = Z.svg.getBoundingClientRect(); Z.eingepasst = false; ansichtAnimieren(zielZoom(k, r.left + r.width / 2, r.top + r.height / 2)); }
  function zielZoom(kNeu, cx, cy){
    const r = Z.svg.getBoundingClientRect(), mx = cx - r.left, my = cy - r.top, k = klemme(kNeu, 0.25, 3);
    return {k, tx: mx - (mx - Z.view.tx) * (k / Z.view.k), ty: my - (my - Z.view.ty) * (k / Z.view.k)};
  }
  let ansichtAnim = 0;
  function ansichtAnimieren(ziel, ms = UI.zeit("mittel")){      /* Zeit-Token statt 260-ms-Literal (U07) */
    const start = {...Z.view}, id = ++ansichtAnim;
    if (UI.bewegung?.() !== "voll" || ms <= 0) { Object.assign(Z.view, ziel); ansichtSetzen(); return; }
    const t0 = performance.now();
    const schritt = t => {
      if (id !== ansichtAnim) return;
      const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      Z.view.tx = start.tx + (ziel.tx - start.tx) * e; Z.view.ty = start.ty + (ziel.ty - start.ty) * e; Z.view.k = start.k + (ziel.k - start.k) * e;
      ansichtSetzen();
      if (p < 1) requestAnimationFrame(schritt);
    };
    requestAnimationFrame(schritt);
  }
  function grenzen(ids){
    const liste = (ids || Object.keys(Z.netz?.geraete || {})).map(pos).filter(Boolean);
    if (!liste.length) return null;
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const p of liste) { x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y); x2 = Math.max(x2, p.x); y2 = Math.max(y2, p.y); }
    /* Rand um die Geräte: Karten sind 160x76, Zonen-Inseln +30/+26, Portnamen +12. Die alten
       Werte (-112/+112, -96/+122) waren zu großzügig und drückten den Einpasszoom (gemessen 65 %). */
    const extra = UI.ebenen.aktuell === "mac" || UI.ebenen.aktuell === "routen" ? 190 : 0;
    return {x1: x1 - 96, y1: y1 - 84, x2: x2 + 104 + extra, y2: y2 + 104};
  }
  /* Die Minimap schwebt unten rechts auf der Fläche (werkstatt.js). Ohne Reservierung lag sie im Bild
     über Geräten (Befund der Leitung, 30.10.2026). Sie wird nicht entfernt – das Einpassen rechnet
     ihren Platz frei, solange sie sichtbar im DOM hängt. Gemessen wird nur, wenn die Werte plausibel
     sind; der DOM-Ersatz der Tests liefert für jedes Element 900x600, dann gelten die Maße aus
     werkstatt.css (184x112). */
  function minimapRand(){
    const mini = UI.werkstatt?.mini;
    if (!mini || !mini.isConnected) return {rechts: 0, schieb: 0};
    try { const cs = typeof getComputedStyle === "function" ? getComputedStyle(mini) : null; if (cs && (cs.display === "none" || cs.visibility === "hidden")) return {rechts: 0, schieb: 0}; } catch (e) { /* dann reservieren */ }
    let b = null; try { b = mini.getBoundingClientRect ? mini.getBoundingClientRect() : null; } catch (e) { b = null; }
    /* Die Minimap ist 148x92 (werkstatt.css) plus Rahmen/Padding (gemessen 162x192 inkl. Fußzeile).
       Reserviert wird nur die BREITE; die Höhe NICHT voll abziehen, sonst schrumpfte das Netz auf
       65 % (gemessen 30.10.2026). Stattdessen schiebt ein 40-px-Versatz das Netz nach oben – die
       Minimap sitzt unten rechts, dort ist dann frei. */
    const breit = b && b.width > 0 && b.width < 400 ? Math.ceil(b.width) : 164;
    return {rechts: breit + 16, schieb: 40};
  }
  function einpassen(animiert = true, ids = null){
    if (!Z.svg) return;
    const r = Z.svg.getBoundingClientRect(), b = grenzen(ids && ids.length ? ids : undefined);
    if (!r.width || !r.height) { Z.einpassenAusstehend = true; return; }
    const mini = minimapRand();
    let ziel;
    if (!b) ziel = {k: 1, tx: r.width / 2 - 400, ty: r.height / 2 - 260};
    else {
      /* Ränder für die schwebenden Leisten oben/unten – auf niedriger Fläche (Hilfe/Simulation offen) anteilig kleiner */
      const randOben = Math.min(64, Math.round(r.height * 0.13)), randUnten = Math.min(84, Math.round(r.height * 0.15));
      const randRechts = Math.max(20, mini.rechts);
      const bw = b.x2 - b.x1, bh = b.y2 - b.y1, hNutz = Math.max(100, r.height - randOben - randUnten), bNutz = Math.max(140, r.width - 20 - randRechts);
      const k = klemme(Math.min(bNutz / bw, hNutz / bh), 0.25, 1.1);
      /* Der Sichtrahmen soll das Minimum-Maß des Netzes treffen, nicht die Kartenmitte: links 20 px,
         oben randOben, restliche Breite/Höhe zentriert. Der Minimap-Versatz schiebt nach oben. */
      let ty = randOben + (hNutz - bh * k) / 2 - b.y1 * k - (mini.schieb || 0);
      const minTy = 8 - b.y1 * k;                    /* nicht unter die obere Leiste schieben */
      if (ty < minTy) ty = minTy;
      ziel = {k, tx: 20 + (bNutz - bw * k) / 2 - b.x1 * k, ty};
    }
    ansichtAnimieren(ziel, animiert ? 320 : 0);
    Z.eingepasst = true;
  }
  /* Gerät in den sichtbaren Bereich holen (sanft), ohne Zoom zu ändern */
  function sichtbarMachen(id, mittig){
    const p = pos(id); if (!p || !Z.svg) return;
    const r = Z.svg.getBoundingClientRect(), {tx, ty, k} = Z.view;
    const sx = p.x * k + tx, sy = p.y * k + ty, rand = 90;
    if (!mittig && sx > rand && sx < r.width - rand && sy > rand && sy < r.height - rand) return;
    Z.eingepasst = false;
    ansichtAnimieren({k, tx: r.width / 2 - p.x * k, ty: r.height / 2 - p.y * k});
  }

  /* ---------- Zeichnen ---------- */
  function neuZeichnen(){
    if (Z.geplant) return;
    Z.geplant = true;
    requestAnimationFrame(() => { Z.geplant = false; zeichnen(); });
  }
  /* Ein Fehler beim Zeichnen darf NIE die Zeichnung des VORIGEN Auftrags stehen lassen. Deshalb:
     erst leeren, dann in EINEM Schutz zeichnen. Scheitert es, ist die Fläche leer UND der Fehler steht
     als Hinweis darauf (`.lb-hinweis`, aria-live) — statt stillschweigend der alten Topologie
     (Befund des Nutzers: „nur die Auftragszeile oben wechselt, die Fläche nicht"). */
  function zeichenFehler(e){
    if (!Z.el.hinweis) return;
    Z.zeichenFehlerAktiv = true;
    Z.el.hinweis.textContent = "Die Fläche ließ sich nicht zeichnen: " + ((e && e.message) || e || "unbekannter Fehler") + " – bitte den Auftrag neu öffnen.";
  }
  function zeichnen(){
    if (!Z.svg || !Z.netz || !Z.root?.isConnected) return;
    const netz = Z.netz, ebene = UI.ebenen.aktuell;
    /* ZUERST leeren: ab hier steht keine alte Topologie mehr auf der Fläche. Auch die Port-Ebene
       (Z.s.ueber) muss leer – sonst blieben bei einem Zeichenfehler alte LEDs und Portnamen stehen. */
    for (const n of ["zonen", "kabel", "geraete", "karten"]) Z.s[n].replaceChildren();
    if (Z.el.kabelEnden) Z.el.kabelEnden.replaceChildren();
    Z.ende = [];
    Z.gEl.clear(); Z.kEl.clear();
    try {
      Z.root.dataset.ebene = ebene;
      const eb = UI.ebenen.LISTE.find(l => l.id === ebene), et = Z.el.ansicht?.querySelector(".lb-ansicht-text");
      if (et) et.textContent = eb ? eb.name : ebene;
      Z.warn = new Map();
      try { for (const w of Modell.pruefen(netz)) { if (!Z.warn.has(w.geraet)) Z.warn.set(w.geraet, []); const l = Z.warn.get(w.geraet); if (!l.includes(w.text)) l.push(w.text); } }
      catch (e) { console.error("Modell.pruefen", e); }
      Z.ohne = UI.ebenen.zonen(netz).ohne;
      versatzBerechnen();
      if (ebene === "ip") UI.ebenen.zeichneZonen(Z.s.zonen, netz, pos);
      for (const k of netz.kabel) { const el = kabelGruppe(k); Z.kEl.set(k.id, el); Z.s.kabel.append(el); }
      for (const g of Object.values(netz.geraete)) { const el = geraetGruppe(g); Z.gEl.set(g.id, el); Z.s.geraete.append(el); }
      Z.karten = UI.ebenen.zeichneKarten(Z.s.karten, netz, pos, ebene);
      /* Port-LED/Portnamen liegen über den Karten (eigene Ebene) und werden nach den Geräten gebaut;
         Beschriftungen bekommen sofort die Gegenskalierung des aktuellen Zooms (§ 3.4). */
      kabelEndenBauen();
      beschriftungenSkalieren();
      Z.gemaltKw = kartenMasse().kw;         /* für den Größenwechsel beim Fenster-Resize */
      Z.el.leer.hidden = Object.keys(netz.geraete).length > 0;
      if (Z.hover && !netz.geraete[Z.hover]) Z.hover = null;
      if (Z.kabelHover && !netz.kabel.some(k => k.id === Z.kabelHover)) Z.kabelHover = null;
      if (Z.geraeteHover && !netz.geraete[Z.geraeteHover]) Z.geraeteHover = null;
      F.hoverZeichnen?.();
      knoepfeAktualisieren();
      if (Z.zeichenFehlerAktiv && Z.el.hinweis) { Z.el.hinweis.textContent = ""; Z.zeichenFehlerAktiv = false; }
    } catch (e) {
      console.error("Zeichnen", e);
      zeichenFehler(e);
    }
    UI.werkstatt?.netzGeaendert?.();
  }
  /* Zeigt die Fläche wirklich das geladene Netz? Merkmal sind die `data-id` der gezeichneten Geräte
     gegen `Z.netz.geraete` (Vorgabe der Leitung). */
  function zeigtGeladenesNetz(){
    if (!Z.svg || !Z.netz || !Z.root?.isConnected) return false;
    const gezeichnet = new Set([...Z.s.geraete.querySelectorAll("g[data-id]")].map(g => g.getAttribute("data-id")));
    const soll = Object.keys(Z.netz.geraete);
    return soll.length > 0 && gezeichnet.size === soll.length && soll.every(id => gezeichnet.has(id));
  }
  /* Ein wieder sichtbar gewordenes Labor zieht nach: `laden()` zeichnet nicht, wenn die Ansicht gerade
     nicht da ist (`Z.root?.isConnected`), und `zeigen()`/`wieder()` decken nur ihre eigenen Wege ab.
     Der Haken hängt am Bus-Ereignis „ansicht" (app.js:102) — ohne Fremdeingriff in app.js. */
  function nachziehen(){
    if (!Z.netz || !Z.svg || !Z.root?.isConnected) return;
    if (zeigtGeladenesNetz()) return;
    zeichnen();
    einpassen(false);
  }
  Bus.an("ansicht", name => { if (name === "labor") requestAnimationFrame(() => nachziehen()); });
  function knoepfeAktualisieren(){
    const v = Z.verlauf; if (!v || !Z.el.zurueck) return;
    const l = v.liste || [];
    Z.el.zurueck.disabled = !v.kannZurueck; Z.el.vor.disabled = !v.kannVor;
    if (Z.el.verlaufGruppe) Z.el.verlaufGruppe.hidden = !v.kannZurueck && !v.kannVor;
    Z.el.zurueck.title = v.kannZurueck ? `Rückgängig: ${l[l.length - 1]} (Strg+Z)` : "Nichts rückgängig zu machen";
    Z.el.vor.title = v.kannVor ? "Wiederholen (Strg+Y)" : "Nichts zu wiederholen";
  }
  function versatzBerechnen(){
    Z.versatz.clear();
    const paare = new Map();
    for (const k of Z.netz.kabel) { const s = [k.a.geraet, k.b.geraet].sort().join("|"); if (!paare.has(s)) paare.set(s, []); paare.get(s).push(k); }
    for (const liste of paare.values()) if (liste.length > 1) liste.forEach((k, i) => {
      const richtung = k.a.geraet < k.b.geraet ? 1 : -1;
      Z.versatz.set(k.id, (i - (liste.length - 1) / 2) * 12 * richtung);
    });
  }
  /* Kartenmaße des Knotens (Vertrag § 3.1, Geometrie der Leitung vom 30.10.2026): 160x76 auf breiten,
     118x64 auf schmalen Fenstern. Dieselben Maße braucht der Kanten-Anker – deshalb EINE Funktion. */
  function kartenMasse(){
    const breit = !(typeof innerWidth === "number" && innerWidth < 900);
    return breit ? {kw: 160, kh: 76} : {kw: 118, kh: 64};
  }
  /* Schnittpunkt des Strahls p→q mit dem Kartenrechteck um p (Ray-Box, Vertrag § 3.2).
     seite "h" = linke/rechte Rahmenlinie (waagerechter Austritt), "v" = obere/untere. */
  function randPunkt(p, q, m){
    const dx = q.x - p.x, dy = q.y - p.y;
    if (!dx && !dy) return null;
    const hw = (m.kw || 140) / 2, hh = (m.kh || 76) / 2;
    let t = Infinity, seite = "h";
    if (dx) { const tx = hw / Math.abs(dx); if (tx < t) { t = tx; seite = "h"; } }
    if (dy) { const ty = hh / Math.abs(dy); if (ty < t) { t = ty; seite = "v"; } }
    if (!Number.isFinite(t)) return null;
    return {x: p.x + dx * t, y: p.y + dy * t, seite};
  }
  function kabelGeo(k){
    const A = pos(k.a.geraet), B = pos(k.b.geraet); if (!A || !B) return null;
    const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const off = Z.versatz.get(k.id) || 0;
    /* Mehrfachkabel: der Versatz verschiebt den STRAHL, nicht den Gerätepunkt – die Enden bleiben auf
       dem Rahmen des eigenen Geräts (vorher ein Punkt 12 px neben der Mitte, oft unter der Karte). */
    const a2 = {x: A.x + nx * off, y: A.y + ny * off}, b2 = {x: B.x + nx * off, y: B.y + ny * off};
    const m = kartenMasse();
    const ea = randPunkt(a2, b2, m) || {x: A.x, y: A.y, seite: "h"};
    const eb = randPunkt(b2, a2, m) || {x: B.x, y: B.y, seite: "h"};
    return {ax: ea.x, ay: ea.y, bx: eb.x, by: eb.y, seiteA: ea.seite, seiteB: eb.seite, ux, uy, nx, ny, len};
  }
  /* Polylinie mit 6-px-Rundungen: gerade Strecken bleiben gerade, Ecken laufen als kurze Quadratik um
     (Vertrag § 3.2). Der Radius wird auf die halbe Segmentlänge begrenzt, damit kurze Stücke nicht
     überschwingen. Doppelte Punkte fliegen raus – sonst entstünde ein Naht-Knick. */
  function pfadMitRundung(punkte, r = 6){
    const p = [];
    for (const q of punkte) { const l = p[p.length - 1]; if (!l || Math.abs(q[0] - l[0]) > 0.01 || Math.abs(q[1] - l[1]) > 0.01) p.push(q); }
    if (p.length < 2) return "";
    let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
    for (let i = 1; i < p.length - 1; i++) {
      const a = p[i - 1], b = p[i], c = p[i + 1];
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const gerade = Math.abs((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) < 0.01;
      if (gerade || !l1 || !l2) { d += ` L${b[0].toFixed(1)} ${b[1].toFixed(1)}`; continue; }
      const rr = Math.min(r, l1 / 2, l2 / 2);
      const s1x = (b[0] - a[0]) / l1, s1y = (b[1] - a[1]) / l1, s2x = (c[0] - b[0]) / l2, s2y = (c[1] - b[1]) / l2;
      d += ` L${(b[0] - s1x * rr).toFixed(1)} ${(b[1] - s1y * rr).toFixed(1)} Q${b[0].toFixed(1)} ${b[1].toFixed(1)} ${(b[0] + s2x * rr).toFixed(1)} ${(b[1] + s2y * rr).toFixed(1)}`;
    }
    const e = p[p.length - 1];
    return d + ` L${e[0].toFixed(1)} ${e[1].toFixed(1)}`;
  }
  function kabelPfad(geo){
    const {ax, ay, bx, by, seiteA, seiteB} = geo;
    const waagerecht = Math.abs(ay - by) < 0.6, senkrecht = Math.abs(ax - bx) < 0.6;
    let punkte;
    if (waagerecht && seiteA === "h" && seiteB === "h") punkte = [[ax, ay], [bx, by]];
    else if (senkrecht && seiteA === "v" && seiteB === "v") punkte = [[ax, ay], [bx, by]];
    else if (seiteA === "h" && seiteB === "h") { const mx = (ax + bx) / 2; punkte = [[ax, ay], [mx, ay], [mx, by], [bx, by]]; }
    else if (seiteA === "v" && seiteB === "v") { const my = (ay + by) / 2; punkte = [[ax, ay], [ax, my], [bx, my], [bx, by]]; }
    else if (seiteA === "h") punkte = [[ax, ay], [bx, ay], [bx, by]];
    else punkte = [[ax, ay], [ax, by], [bx, by]];
    return pfadMitRundung(punkte);
  }
  /* Statusglyphen (.ps) und Steckerplastik (.kabel-stecker) sind entfallen: Die Port-LED übernimmt den
     Status als Farbe (Vertrag § 3.2), das Kabel endet exakt auf dem Kartenrahmen statt im Freiraum
     (Befund B5). Damit gibt es auch die „Gekritzel“-Statussymbole unter den Karten nicht mehr (B4/B8). */
  const STATUS_TEXT = {oben: "Link oben", unten: "Link unten", aus: "Port abgeschaltet", frei: "kein Kabel"};
  function grundText(code){
    if (!code) return "";
    const t = (typeof Sim !== "undefined" && Sim.GRUENDE?.[code]?.titel) || {DEVICE_OFF: "Gerät ist aus", PORT_SHUTDOWN: "Port ist per shutdown abgeschaltet",
      PORTSEC_VIOLATION: "Port-Security hat den Port gesperrt (err-disabled)", LINK_DOWN: "kein Link"}[code];
    return t || code;
  }
  function kabelZustand(k){
    const sa = Modell.portStatus(Z.netz, k.a.geraet, k.a.port), sb = Modell.portStatus(Z.netz, k.b.geraet, k.b.port);
    let klasse = "oben";
    if (sa.status !== "oben" || sb.status !== "oben") klasse = [sa, sb].some(s => s.status === "aus" && s.grund === "PORT_SHUTDOWN") ? "aus" : "unten";
    return {sa, sb, klasse};
  }
  function kabelGruppe(k){
    const netz = Z.netz, geo = kabelGeo(k);
    const g = sv("g", {class: "kabel", "data-kabel": k.id});
    if (!geo) return g;
    let {sa, sb, klasse} = kabelZustand(k);
    /* R1: Die Ursache steht am Kabel nur, wo das Niveau Hinweise zeigt (Einstieg, AP1 ab Hilfestufe 2, Netzprüfer).
       Sonst zeigt es, was eine Port-LED zeigt: Link oder kein Link – ob „shutdown“, err-disabled oder Gegenstelle aus,
       klärt erst die Diagnose (show ip interface brief, Inspektor). */
    if (!warnungenAn()) {
      const led = s => ({status: s.status === "aus" ? "unten" : s.status, grund: null});
      sa = led(sa); sb = led(sb); if (klasse === "aus") klasse = "unten";
    }
    const ebene = UI.ebenen.aktuell;
    const va = UI.ebenen.vlanPort(netz, k.a.geraet, k.a.port), vb = UI.ebenen.vlanPort(netz, k.b.geraet, k.b.port);
    const trunk = va?.art === "trunk" || vb?.art === "trunk";
    g.classList.add("k-" + klasse);
    if (trunk) g.classList.add("trunk");
    if (Z.kabelWahl === k.id) g.classList.add("gewaehlt");
    if (ebene === "vlan") {
      const acc = [va, vb].find(v => v && v.art === "access");
      if (acc && !trunk) { g.style.setProperty("--kf", UI.ebenen.vlanFarbe(acc.vlan)); g.classList.add("vlan-farbe"); }
      else if (trunk) g.classList.add("vlan-trunk");
    }
    const {ax, ay, bx, by} = geo;
    const na = netz.geraete[k.a.geraet]?.name || k.a.geraet, nb = netz.geraete[k.b.geraet]?.name || k.b.geraet;
    const grund = (sa.status !== "oben" ? sa : sb).grund;
    const titel = `${na} ${k.a.port} ↔ ${nb} ${k.b.port}\n${klasse === "oben" ? "Link oben" : (klasse === "aus" ? "Port abgeschaltet" : "Link unten") + (grund ? ": " + grundText(grund) : "")}` +
      (trunk ? `\nTrunk (802.1Q), erlaubt: ${UI.ebenen.erlaubtText((va?.art === "trunk" ? va : vb).erlaubt)}` : "");
    const d = kabelPfad(geo);
    if (!d) return g;
    /* Die Trefferlinie folgt dem sichtbaren Pfad – vorher lag sie Mitte→Mitte unter den Karten. */
    g.append(sv("path", {class: "kabel-treffer", d, fill: "none"}, sv("title", {text: titel + "\nKlicken zum Auswählen, Entf trennt."})));
    g.append(sv("path", {class: "kabel-huelle", d}));
    if (trunk) {
      g.append(sv("path", {class: "kabel-trunk-aussen", d}));
      g.append(sv("path", {class: "kabel-trunk-innen", d}));
    } else g.append(sv("path", {class: "kabel-linie", d}));
    /* Port-LED und Portname stehen NICHT hier, sondern in Z.s.ueber (kabelEndenBauen) – sonst lägen sie
       wie bisher unter der Karte (Befund B4). Hover am Kabel zeigt seine Namen auch unter 90 % Zoom;
       das geht nur über Ereignisse, weil die Namen außerhalb dieser Gruppe hängen. */
    if (typeof g.addEventListener === "function") {
      g.addEventListener("pointerenter", () => { Z.kabelHover = k.id; kabelEndenAktualisieren(); });
      g.addEventListener("pointerleave", () => { if (Z.kabelHover === k.id) Z.kabelHover = null; kabelEndenAktualisieren(); });
    }
    /* VLAN-Schilder an Switch-Ports */
    if (ebene === "vlan") {
      const beide = !!(va && vb);
      const schild = (x, y, v, richtung) => {
        if (!v) return;
        /* auf der Sichtstrecke zwischen den Rahmenpunkten, nicht zwischen den Mittelpunkten */
        const f = (beide ? 0.34 : 0.5) * richtung, cx = x + (bx - ax) * f, cy = y + (by - ay) * f;
        const text = v.art === "trunk" ? `Trunk ${UI.ebenen.erlaubtText(v.erlaubt)}` : `VLAN ${v.vlan}`;
        const b = text.length * 6.4 + 12;
        const s = sv("g", {class: "vlan-schild" + (v.art === "trunk" ? " trunk" : "")});
        if (v.art === "access") s.style.setProperty("--kf", UI.ebenen.vlanFarbe(v.vlan));
        s.append(sv("rect", {x: cx - b / 2, y: cy - 9, width: b, height: 18, rx: 9}), sv("text", {x: cx, y: cy + 4, "text-anchor": "middle", text}));
        g.append(s);
      };
      schild(ax, ay, va, 1); schild(bx, by, vb, -1);
    }
    return g;
  }
  /* ---------- Port-LED und Portname (in Z.s.ueber, ÜBER den Karten) ----------
     Befund B4: Namen und Statussymbole lagen 28–78 px von der Gerätemitte und verschwanden unter der
     Karte. Jetzt sitzt die LED (r 2,6) exakt auf der Rahmenlinie, der Name 12 px außerhalb. Beides wird
     nur gezeigt, wenn der Zoom >= 0,9 ist oder Gerät/Kabel gewählt/gehovert sind (Vertrag § 3.2); der
     Name zusätzlich nur, wenn er nirgends aufliegt (einfache, deterministische Kollisionsliste). Die
     alten Statussymbole entfallen: Die Farbe der LED trägt den Zustand. */
  const PORT_ZEICHEN = 6.5;      /* 11-px-Mono + Sperrsatz .04em, in Edge gemessen: 6,49 px/Zeichen */
  function portNameOrt(led, o, seite){
    /* 12 px außerhalb des Rahmens, Richtung = NORMALEDER RAHMENKANTE (nicht die Verbindungsrichtung):
       So liegt der Name nie halb auf der eigenen Karte. Waagerechte Kante: Name neben der LED;
       obere/untere Kante: darüber/darunter, mittig. */
    const waagerecht = seite === "h";
    if (waagerecht) { const r = o.x >= 0 ? 1 : -1; return {x: led.x + r * 14, y: led.y + 4, anker: r > 0 ? "start" : "end"}; }
    const unten = o.y > 0;
    return {x: led.x, y: led.y + (unten ? 18 : -10), anker: "middle"};
  }
  function textKasten(ort, breite){
    const x = ort.anker === "start" ? ort.x : ort.anker === "end" ? ort.x - breite : ort.x - breite / 2;
    return {x1: x, y1: ort.y - 10, x2: x + breite, y2: ort.y + 3};
  }
  function kabelEndenBauen(){
    const schicht = Z.el.kabelEnden;
    if (!schicht) return;
    schicht.replaceChildren();
    Z.ende = [];
    if (!Z.netz) return;
    for (const k of Z.netz.kabel) {
      const geo = kabelGeo(k); if (!geo) continue;
      const zustand = kabelZustand(k);
      const liste = [
        {geraet: k.a.geraet, port: k.a.port, x: geo.ax, y: geo.ay, o: {x: geo.ux, y: geo.uy}, seite: geo.seiteA, z: zustand.sa},
        {geraet: k.b.geraet, port: k.b.port, x: geo.bx, y: geo.by, o: {x: -geo.ux, y: -geo.uy}, seite: geo.seiteB, z: zustand.sb},
      ];
      for (const l of liste) {
        if (!Z.netz.geraete[l.geraet]) continue;
        /* R1 wie am Kabel: Wo das Niveau keine Ursachen zeigt, sieht die LED nur Link/kein Link. */
        const status = !warnungenAn() && l.z.status === "aus" ? "unten" : l.z.status;
        const grund = warnungenAn() ? l.z.grund : null;
        const ort = portNameOrt({x: l.x, y: l.y}, l.o, l.seite);
        const el = sv("g", {class: "kabel-ende", "data-kabel": k.id, "data-geraet": l.geraet});
        el.append(sv("circle", {class: "port-led pd-" + status, cx: l.x.toFixed(1), cy: l.y.toFixed(1), r: 2.6},
          sv("title", {text: `${l.port} – ${STATUS_TEXT[status] || status}${grund && status !== "oben" ? " – " + grundText(grund) : ""}`})));
        el.append(sv("text", {class: "kabel-port", x: ort.x.toFixed(1), y: ort.y.toFixed(1), "text-anchor": ort.anker, text: l.port}));
        schicht.append(el);
        Z.ende.push({el, kabel: k.id, geraet: l.geraet, ort, breite: l.port.length * PORT_ZEICHEN});
      }
    }
    kabelEndenAktualisieren();
  }
  function kabelEndenAktualisieren(){
    if (!Z.el.kabelEnden || !Z.netz) return;
    const k = Z.view.k || 1, grundSichtbar = k >= 0.9;
    const m = kartenMasse(), karten = [];
    for (const g of Object.values(Z.netz.geraete)) {
      const p = pos(g.id); if (!p) continue;
      karten.push({x1: p.x - m.kw / 2 - 4, y1: p.y - m.kh / 2 - 4, x2: p.x + m.kw / 2 + 4, y2: p.y + m.kh / 2 + 4});
    }
    const namen = [];
    const ueber = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
    for (const e of Z.ende) {
      const an = grundSichtbar || e.geraet === Z.hover || e.geraet === Z.geraeteHover || Z.auswahlSet.has(e.geraet) ||
        Z.kabelWahl === e.kabel || Z.kabelHover === e.kabel;
      e.el.classList.toggle("an", an);
      if (!an) { e.el.classList.remove("ohne-name"); continue; }
      const b = textKasten(e.ort, e.breite);
      if (karten.some(q => ueber(b, q)) || namen.some(q => ueber(b, q))) e.el.classList.add("ohne-name");
      else { e.el.classList.remove("ohne-name"); namen.push(b); }
    }
  }
  /* Kurze Rolle aus Typ + Zusatz (Vertrag § 3.1) – nie leer (Befund B7: „Switch ohne IP" zeigte nichts). */
  function rollenText(netz, g, art){
    const titel = (art && art.titel) || g.typ;
    let zusatz = "";
    if (g.typ === "internet") zusatz = "Provider";
    else if (g.typ === "switch") {
      const vlans = Object.keys(g.flash?.vlans || {}).filter(n => /^\d+$/.test(n) && String(+n) !== "1").sort((x, y) => +x - +y);
      zusatz = vlans.length ? "VLAN " + vlans.slice(0, 3).join(",") + (vlans.length > 3 ? ",…" : "") : "L2";
    } else if (g.typ === "router" || g.typ === "firewall") {
      const netze = new Set();
      for (const x of UI.ebenen.alleAdressen(netz, g)) { const c = IP.cidr(x.ip, x.maske); if (c) netze.add(c); }
      zusatz = netze.size ? netze.size + (netze.size === 1 ? " Netz" : " Netze") : "keine Adresse";
    } else if (Modell.HOST[g.typ]) {
      const a = UI.ebenen.adresse(netz, g), kabel = Modell.ports(g).some(p => Modell.kabelAn(netz, g.id, p));
      if (a.quelle === "dhcp") zusatz = a.ip ? "DHCP" : "DHCP – keine Adresse";
      else if (!a.ip) zusatz = kabel ? "keine Adresse" : "kein Link";
      else if (g.skin === "drucker") {
        const dienst = Object.entries(g.running?.dienste || {}).find(([d, w]) => w && w.an && Modell.DIENSTPORTS && Modell.DIENSTPORTS[d]);
        if (dienst) zusatz = "Dienst " + Modell.DIENSTPORTS[dienst[0]].port;
      }
    }
    return zusatz ? titel + " · " + zusatz : titel;
  }

  function geraetGruppe(g){
    const p = pos(g.id), netz = Z.netz;
    const klassen = ["ger", "typ-" + g.typ];
    if (!g.an) klassen.push("aus");
    if (Z.auswahl?.geraet === g.id) klassen.push("gewaehlt");
    /* ohne-ip gilt in JEDER Ebene: Der gestrichelte Koralle-Rahmen ist die ruhige Erklärung „hier fehlt
       eine Adresse" (Befund B7), kein Fehlerbild der IP-Ebene. */
    if (Z.ohne.has(g.id)) klassen.push("ohne-ip");
    const el = sv("g", {class: klassen.join(" "), "data-id": g.id, transform: `translate(${p.x} ${p.y})`});
    const art = UI.geraeteArt(g.typ, g.skin);
    /* Knotenmaße nach Vertrag § 3.1: 140x76 (breit) / 110x64 (schmal). Die Karte ist nur noch
       Haarlinien-Rahmen; die Typfarbe steckt in der kleinen Platte links. */
    const {kw: KW, kh: KH} = kartenMasse();
    const radius = KW >= 120 ? 12 : 10;
    el.append(sv("rect", {class: "ger-treffer", x: -KW / 2, y: -KH / 2, width: KW, height: KH, rx: radius}));
    el.append(sv("rect", {class: "ger-auswahl", x: -KW / 2 - 6, y: -KH / 2 - 6, width: KW + 12, height: KH + 12, rx: radius + 2}));
    el.append(sv("rect", {class: "ger-karte", x: -KW / 2, y: -KH / 2, width: KW, height: KH, rx: radius}));
    /* Icon-Platte 28x28 links: UI.geraetebild zeichnet 52x52, 0,538 ergibt 28. Keine neue Platten-Klasse –
       die vorhandene .gb-kachel wird nur skaliert und von der CSS-Hälfte gestylt. */
    el.append(sv("g", {class: "ger-bild", transform: "translate(" + (-KW / 2 + 24) + " 0) scale(.538)"}, UI.geraetebild(g.typ, g.skin)));
    const a = UI.ebenen.adresse(netz, g);
    /* Beschriftung als eigener Block: wird mit dem Zoom gegenskaliert (§ 3.4). Die Breiten werden VOR
       dem Setzen deterministisch aus der Zeichenzahl geschätzt (Faktor unten, im Browser gemessen), damit
       nie Text über den Rahmen läuft (Befund B6); nur sehr lange Texte enden mit „…".
       Textfläche: x0 bis KW/2 - 8 = 104 px (breit) bzw. 62 px (schmal). Gemessen in Edge mit der
       Mono-Ersatzschrift (Consolas): 11 px = 6,05 px/Zeichen; Name 12,5 px + Sperrsatz .04em = 7,37 px
       (gerechnet wird mit 7,7 als Sicherheitszuschlag, damit nichts über den Rahmen läuft). */
    const x0 = -KW / 2 + 48, yOff = -KH / 2 + 14;
    const maxB = KW / 2 - 8 - x0;                       /* 104 px breit, 62 px schmal */
    /* Schmal (KW<140) rechnet die Leitung mit 6,05 px/Zeichen fuer den Namen (Vorgabe 30.10.2026):
       dann passen "PC-Empfang" (10) und knapp "Gast-Laptop" eher in die 62-px-Textflaeche. Auf breiten
       Karten bleibt 7,7 (12,5 px + Sperrsatz) als Sicherheitszuschlag. */
    /* Schmal (KW<140): 7,7 statt 6,05 (Vorgabe der Leitung war 6,05). GEMESSEN: 12,5-px-Monospace
       ist real 7,37 px/Zeichen; mit 6,05 blieben "PC-Empfang"/"Gast-Laptop" ungekuerzt und liefen bei
       k=0,73 durch die Gegenskalierung (s=1,12) 9,2 Bildschirm-px ueber den Kartenrahmen. Mit 7,7
       bleiben sie gekuerzt, aber im Rahmen (gemessen 0 Ueberlauf). */
    const ZEICHEN_11 = 6.05, ZEICHEN_NAME = KW < 140 ? 7.7 : 7.7;
    const kuerze = (text, faktor, max) => {
      const t = String(text == null ? "" : text);
      if (!t || t.length * faktor <= max) return t;
      const platz = Math.max(1, Math.floor(max / faktor) - 1);
      return t.slice(0, platz) + "…";
    };
    const t = sv("g", {class: "ger-text"});
    t.setAttribute("data-x", x0.toFixed(1));
    t.setAttribute("data-y", yOff.toFixed(1));
    t.append(sv("text", {class: "ger-name", x: x0, y: -10, "text-anchor": "start", text: kuerze(g.name, ZEICHEN_NAME, maxB)}));
    /* Die Rolle erklärt den Zustand und ist NIE leer (Befund B7: „Switch ohne IP" zeigte nichts). Bei
       Überlauf erst der Zusatz ohne Typ („VLAN 10,20,30" statt „Switch · VLAN 10,20,30"), dann „…". */
    let rolle = rollenText(netz, g, art);
    if (rolle.length * ZEICHEN_11 > maxB) {
      const zusatz = rolle.includes(" · ") ? rolle.slice(rolle.indexOf(" · ") + 3) : rolle;
      rolle = zusatz.length * ZEICHEN_11 <= maxB ? zusatz : kuerze(rolle, ZEICHEN_11, maxB);
    }
    t.append(sv("text", {class: "ger-rolle", x: x0, y: 4, "text-anchor": "start", text: rolle}));
    /* Auf der Fläche steht NUR die erste gültige Adresse (Kurzform „+N" als eigener gedämpfter Zusatz);
       alle Adressen mit Schnittstelle stehen im Tooltip. Ohne Adresse gibt es KEIN .ger-ip-Element –
       die Rolle sagt stattdessen „keine Adresse" / „kein Link" / „DHCP – keine Adresse" (Befund B6/B7). */
    const alleAdr = UI.ebenen.alleAdressen(netz, g) || [];
    let ipText = a.ip ? String(a.ip) : "";
    if (ipText && IP.maskeGueltig(a.maske)) ipText += "/" + IP.praefix(a.maske);
    /* „+N" bekommt eine eigene Ecke oben rechts, damit das Präfix am Knoten bleiben kann (Lehrinhalt). */
    const mehr = alleAdr.length > 1 ? "+" + (alleAdr.length - 1) : "";
    if (ipText) {
      const adr = sv("text", {class: "ger-ip" + (a.gueltig ? "" : " schwach"), x: x0, y: 18, "text-anchor": "start"}, kuerze(ipText, ZEICHEN_11, maxB));
      /* Adresse anklicken = in die Zwischenablage (Wunsch 05.10.2026: „für easy von hand routing").
         Kopiert wird NUR die Adresse ohne Präfix und ohne „+2" – genau das, was man in eine Route tippt.

         WICHTIG (gemessen 05.10.2026, tools/zeiger-probe.py): Der Klick darf NICHT am „click" hängen.
         Die Fläche ruft beim pointerdown setPointerCapture, danach gehen pointerup, mouseup UND click ans
         SVG – der Text bekommt nur das pointerdown. Ereignisreihenfolge mit echter Maus:
             pointerdown@ger-ip  → pointerup@lb-svg → mouseup@lb-svg → click@lb-svg
         Deshalb hängt das Kopieren am pointerdown; stopPropagation verhindert zugleich, dass die Fläche
         das Gerät auswählt und den Inspektor öffnet. */
      const blank = String(a.text).split(" ")[0].split("/")[0];
      if (IP.gueltig(blank)) {
        adr.setAttribute("class", adr.getAttribute("class") + " kopierbar");
        adr.setAttribute("role", "button");
        adr.setAttribute("tabindex", "0");
        adr.append(sv("title", {text: `Klicken kopiert ${blank} – für Routing, Ping oder Konfiguration von Hand.`}));
        const kopieren = async e => {
          if (e) { e.stopPropagation(); e.preventDefault?.(); }
          const ok = await UI.kopieren(blank);
          UI.toast(ok ? `${blank} kopiert – jetzt in Route, Ping oder Konfiguration einfügen.`
                      : "Kopieren ging nicht – die Adresse steht auch im Inspektor.", ok ? "ok" : "warn");
        };
        adr.addEventListener("pointerdown", kopieren);
        adr.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") kopieren(e); });
      }
      t.append(adr);
    }
    /* Eigene Ecke oben rechts; mit den neuen Zeilen (Name y=-10) vier Pixel hoeher als zuerst
       geplant, sonst ueberlappt der Zusatz den Namen. */
    if (mehr) t.append(sv("text", {class: "ger-mehr", x: KW / 2 - 16, y: -KH / 2 + 16, "text-anchor": "end", text: mehr}));
    el.append(t);
    /* Alle Adressen in den Tooltip: Auf der Fläche steht nur die erste (sonst wird es unleserlich) – hier muss
       vollständig stehen, welche Adresse zu welcher Schnittstelle gehört. Sonst findet der Spieler die Adressen
       der übrigen Subnetze nirgends (Befund 05.10.2026: Router zeigte nur „192.168.10.1/24 +2“). */
    const alle = (UI.ebenen.alleAdressen(netz, g) || []).map(x => {
      const p = IP.maskeGueltig(x.maske) ? IP.praefix(x.maske) : null;
      return `${x.ip}${p != null ? "/" + p : ""}${x.port ? " · " + x.port : ""}`;
    });
    el.append(sv("title", {text: [g.name + " – " + art.titel + (g.an ? "" : " (ausgeschaltet)"),
      alle.length ? (alle.length > 1 ? alle.map(z => "  " + z).join("\n") : "  " + alle[0]) : (a.text ? "  " + a.text : ""),
      "Ziehen = verschieben · Doppelklick = Inspektor · Rechtsklick = Menü"].filter(Boolean).join("\n")}));
    const w = warnungenAn() ? Z.warn.get(g.id) : null;
    if (w && w.length) {
      const b = sv("g", {class: "badge badge-warn", transform: "translate(46 -32)"});
      b.append(sv("circle", {r: 9.5}), sv("path", {d: "M0 -4.5v5M0 3.6v.1"}), sv("title", {text: "Prüfung meldet:\n• " + w.join("\n• ")}));
      el.append(b);
    }
    if (Modell.ungespeichert(g)) {
      const b = sv("g", {class: "badge badge-ungespeichert", transform: "translate(-46 -32)"});
      b.append(sv("circle", {r: 5.5}), sv("title", {text: "Ungespeichert: running-config ≠ startup-config.\nNach einem Neustart wäre die Änderung weg (copy running-config startup-config)."}));
      el.append(b);
    }
    if (!g.an) {
      const b = sv("g", {class: "badge badge-aus", transform: "translate(0 -52)"});
      b.append(sv("rect", {x: -16, y: -9, width: 32, height: 18, rx: 9}), sv("text", {x: 0, y: 4, "text-anchor": "middle", text: "aus"}));
      el.append(b);
    }
    /* Hover am Gerät zeigt seine Portnamen auch unter 90 % Zoom (Vertrag § 3.2). */
    if (typeof el.addEventListener === "function") {
      el.addEventListener("pointerenter", () => { Z.geraeteHover = g.id; kabelEndenAktualisieren(); });
      el.addEventListener("pointerleave", () => { if (Z.geraeteHover === g.id) Z.geraeteHover = null; kabelEndenAktualisieren(); });
    }
    return el;
  }
  /* nur ein Gerät + seine Kabel + Kärtchen neu setzen (Ziehen, Animation) */
  function geraetBewegt(id){
    const p = pos(id), el = Z.gEl.get(id);
    if (el && p) el.setAttribute("transform", `translate(${p.x} ${p.y})`);
    for (const k of Z.netz.kabel) if (k.a.geraet === id || k.b.geraet === id) {
      const alt = Z.kEl.get(k.id), neu = kabelGruppe(k);
      if (alt) alt.replaceWith(neu); else Z.s.kabel.append(neu);
      Z.kEl.set(k.id, neu);
    }
    if (Z.karten.size) UI.ebenen.platzieren(Z.karten, pos, id);
    kabelEndenBauen();                 /* LED/Portnamen sitzen auf dem Rahmen und wandern mit */
    F.hoverZeichnen?.(true);
  }
  let zonenGeplant = false;
  function zonenNeu(){
    if (UI.ebenen.aktuell !== "ip" || zonenGeplant) return;
    zonenGeplant = true;
    requestAnimationFrame(() => { zonenGeplant = false; Z.s.zonen.replaceChildren(); UI.ebenen.zeichneZonen(Z.s.zonen, Z.netz, pos); beschriftungenSkalieren(); });
  }

  /* ---------- Auswahl, Inspektor ----------
     Auswahl ist seit 3.0 eine MENGE (Z.auswahlSet, Architektur § 16.5). Z.auswahl bleibt als
     Einzelgerät-Kompatibilität bestehen: Inspektor, Konsole, Befehlspalette und andere Bausteine
     lesen weiterhin {geraet, port}; gezeigt wird dort das ZULETZT gewählte Gerät („primär"). */
  function auswaehlen(id, port){
    if (id && !Z.netz?.geraete[id]) id = null;
    auswahlSetzen(id ? [id] : [], {primaer: id, port});
  }
  /* Kern aller Auswahlwege: setzt die Menge, zeichnet die Ringe, meldet den Bus, öffnet den Inspektor. */
  function auswahlSetzen(ids, o = {}){
    const vorher = [...Z.auswahlSet].sort().join("|");
    const gueltig = [];
    for (const id of ids || []) if (Z.netz?.geraete[id] && !gueltig.includes(id)) gueltig.push(id);
    Z.auswahlSet = new Set(gueltig);
    const primaer = o.primaer && Z.auswahlSet.has(o.primaer) ? o.primaer : gueltig[gueltig.length - 1] || null;
    Z.auswahl = primaer ? {geraet: primaer, port: o.port || null} : null;
    if (gueltig.length) Z.kabelWahl = null;
    for (const el of Z.gEl.values()) {
      const an = Z.auswahlSet.has(el.dataset.id);
      el.classList.toggle("gewaehlt", an);
      el.classList.toggle("primaer", an && el.dataset.id === primaer);
    }
    for (const el of Z.kEl.values()) el.classList.toggle("gewaehlt", el.dataset.kabel === Z.kabelWahl);
    kabelEndenAktualisieren();          /* gewählte Geräte zeigen ihre Portnamen auch unter 90 % Zoom */
    const geaendert = vorher !== [...Z.auswahlSet].sort().join("|");
    if (!geaendert) return gueltig;
    Bus.senden("auswahl", {geraet: primaer || null, port: Z.auswahl?.port || null, geraete: gueltig.slice(), mehr: gueltig.length});
    /* Auswahl zeigt den Inspektor – außer Plan oder Akte sind gerade offen (dort gehört die Auswahl zum Vergleich) */
    if (Z.auswahlSet.size && !(dockOffen("plan") || dockOffen("akte"))) dockZeigen("inspektor");
    else if (Z.auswahlSet.size && Z.inspWartet) { Z.inspWartet = false; layoutAnwenden(); }
    inspektorZeigen();
    return gueltig;
  }
  /* Shift-/Strg-Klick: Gerät zur Menge hinzufügen oder herausnehmen. */
  function auswahlUmschalten(id){
    if (!Z.netz?.geraete[id]) return [...Z.auswahlSet];
    const jetzt = [...Z.auswahlSet];
    const i = jetzt.indexOf(id);
    if (i >= 0) jetzt.splice(i, 1); else jetzt.push(id);
    return auswahlSetzen(jetzt, {primaer: i >= 0 ? jetzt[jetzt.length - 1] : id});
  }
  function auswahlAlle(){ return Z.netz ? auswahlSetzen(Object.keys(Z.netz.geraete)) : []; }
  /* Geräte, deren Mittelpunkt im Welt-Rechteck liegt (Marquee). */
  function geraeteImRechteck(b){
    const ids = [];
    if (!b || !Z.netz) return ids;
    for (const g of Object.values(Z.netz.geraete)) {
      const p = pos(g.id);
      if (p && p.x >= b.x1 && p.x <= b.x2 && p.y >= b.y1 && p.y <= b.y2) ids.push(g.id);
    }
    return ids;
  }
  function auswahlImRechteck(b, additiv){
    const drin = geraeteImRechteck(b);
    return auswahlSetzen(additiv ? [...Z.auswahlSet, ...drin] : drin, {primaer: drin[drin.length - 1]});
  }
  /* Beim Aufziehen: schon zeigen, was dazukäme – ohne die Auswahl (und damit den Inspektor) bei jeder Mausbewegung zu ändern. */
  function auswahlVorschau(ids){
    const set = new Set(ids || []);
    for (const el of Z.gEl.values()) el.classList.toggle("vorschau", set.has(el.dataset.id) && !Z.auswahlSet.has(el.dataset.id));
  }
  /* Gruppe verschieben (Pfeiltasten, Ziehen): EIN Verlaufsschritt. */
  function verschiebenMehr(ids, dx, dy){
    const ziele = (ids && ids.length ? ids : [...Z.auswahlSet]).filter(id => Z.netz?.geraete[id]);
    if (!ziele.length) return 0;
    const text = ziele.length === 1 ? Z.netz.geraete[ziele[0]].name + " verschoben" : ziele.length + " Geräte verschoben";
    aendern(text, n => { for (const id of ziele) { const g = n.geraete[id]; if (g) { g.x = raster(g.x + dx); g.y = raster(g.y + dy); } } });
    return ziele.length;
  }
  /* Sammellöschung: EIN Verlaufsschritt, Rückgängig holt alle zurück. */
  function loeschenMehr(ids){
    const ziele = (ids && ids.length ? ids : [...Z.auswahlSet]).filter(id => Z.netz?.geraete[id]);
    if (!ziele.length) return 0;
    const namen = ziele.map(id => Z.netz.geraete[id].name);
    const text = ziele.length === 1 ? namen[0] + " gelöscht" : ziele.length + " Geräte gelöscht";
    auswahlSetzen([]);
    aendern(text, n => { for (const id of ziele) Modell.entfernen(n, id); });
    UI.toast(text + ".", "info", {id: "loeschen", aktion: {text: "Rückgängig", fn: rueckgaengig}});
    return ziele.length;
  }
  /* Duplizieren (Strg+D, Kontextmenü): Spiel.werkstatt.dupliziere liefert neue Geräte ohne Kabel;
     eingesetzt werden sie in EINEM Verlaufsschritt. Namen mit Suffix -2/-3, Ports frei. */
  function duplizieren(ids){
    if (!Z.netz) return [];
    const ziele = (ids && ids.length ? ids : [...Z.auswahlSet]).filter(id => Z.netz.geraete[id] && Z.netz.geraete[id].typ !== "internet");
    if (!ziele.length) return [];
    let delta;
    try { delta = Spiel.werkstatt.dupliziere(Z.netz, ziele); }
    catch (e) { UI.toast("Duplizieren ging nicht: " + ((e && e.message) || e), "fehler", {id: "duplizieren"}); return []; }
    const text = delta.geraete.length === 1 ? delta.geraete[0].name + " dupliziert" : delta.geraete.length + " Geräte dupliziert";
    aendern(text, n => { for (const g of delta.geraete) n.geraete[g.id] = g; });
    auswahlSetzen(delta.ids);
    UI.toast(text + " – Rückgängig (Strg+Z) nimmt es zurück.", "ok", {id: "duplizieren", dauer: 2600});
    return delta.ids;
  }
  /* Auf die Auswahl einpassen (⇧F); ohne Auswahl wie „alles einpassen". */
  function einpassenAuswahl(){
    const ids = [...Z.auswahlSet];
    einpassen(true, ids.length ? ids : null);
  }
  /* Klick auf die Minimap: diesen Weltpunkt in die Mitte holen. */
  function mitteAufWelt(x, y){
    if (!Z.svg) return;
    const r = Z.svg.getBoundingClientRect();
    Z.eingepasst = false;
    ansichtAnimieren({k: Z.view.k, tx: r.width / 2 - x * Z.view.k, ty: r.height / 2 - y * Z.view.k});
  }
  function zoomAufProzent(p){
    if (!Z.svg) return;
    const r = Z.svg.getBoundingClientRect();
    const k = klemme((Number(p) || 100) / 100, 0.25, 3);
    Z.eingepasst = false;
    ansichtAnimieren(zielZoom(k, r.left + r.width / 2, r.top + r.height / 2));
  }
  function zoomProzent(){ return Math.round(Z.view.k * 100); }
  /* Sichtbarer Weltausschnitt der Fläche (für den Rahmen in der Minimap). */
  function sichtbereich(){
    if (!Z.svg) return null;
    const r = Z.svg.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return {x1: (0 - Z.view.tx) / Z.view.k, y1: (0 - Z.view.ty) / Z.view.k, x2: (r.width - Z.view.tx) / Z.view.k, y2: (r.height - Z.view.ty) / Z.view.k};
  }
  function kabelWaehlen(kid){
    Z.kabelWahl = kid || null;
    if (kid && Z.auswahlSet.size) auswahlSetzen([]);
    for (const el of Z.kEl.values()) el.classList.toggle("gewaehlt", el.dataset.kabel === Z.kabelWahl);
    kabelEndenAktualisieren();
  }
  function inspektorZeigen(){
    const c = Z.el.inspektor; if (!c || !Z.netz) return;
    const id = Z.auswahl?.geraet;
    try {
      if (id) {
        if (typeof UI.inspektor?.zeigen === "function") return UI.inspektor.zeigen(c, Z.netz, id, Z.verlauf);
        return platzhalterInspektor(c, Z.netz.geraete[id]);
      }
      if (typeof UI.inspektor?.leeren === "function") return UI.inspektor.leeren(c);
    } catch (e) { console.error("Inspektor", e); }
    c.replaceChildren(h("div", {class: "lb-insp-leer"},
      h("div", {class: "lb-insp-leer-sym"}, UI.symbol("inspektor", 28)),
      h("strong", {}, "Nichts ausgewählt"),
      h("p", {}, "Klick ein Gerät an, um es hier einzustellen."),
      h("ul", {class: "lb-tipps"},
        h("li", {}, h("kbd", {}, "P"), " Ping: von A nach B ziehen"),
        h("li", {}, h("kbd", {}, "K"), " Kabel verlegen"),
        h("li", {}, h("kbd", {}, "Strg"), "+", h("kbd", {}, "K"), " Befehlspalette"),
        h("li", {}, h("kbd", {}, "?"), " alle Tastenkürzel"))));
  }
  function platzhalterInspektor(c, g){
    if (!g) return;
    const a = UI.ebenen.adresse(Z.netz, g), art = UI.geraeteArt(g.typ, g.skin);
    const ports = Modell.ports(g).filter(p => Modell.kabelAn(Z.netz, g.id, p));
    c.replaceChildren(h("div", {class: "lb-insp-platz"},
      h("div", {class: "lb-insp-kopf"}, sv("svg", {viewBox: "-34 -30 68 60", width: 48, height: 42, class: "typ-" + g.typ}, UI.geraetebild(g.typ, g.skin)),
        h("div", {}, h("h3", {}, g.name), h("span", {class: "lb-insp-art"}, art.titel + (g.an ? "" : " · aus")))),
      h("p", {class: "mono"}, a.text || "—"),
      h("p", {class: "lb-insp-hinweis"}, "Der ausführliche Inspektor (Schnittstellen, VLAN, Routing, Dienste, Konsole) wird gerade eingebaut."),
      ports.length ? h("ul", {class: "lb-insp-ports"}, ports.map(p => {
        const ka = Modell.kabelAn(Z.netz, g.id, p), s = Modell.portStatus(Z.netz, g.id, p), gg = Z.netz.geraete[ka.gegen.geraet];
        return h("li", {}, h("span", {class: "mono"}, p), " → ", `${gg?.name || "?"} ${ka.gegen.port}`, h("span", {class: "lb-st st-" + s.status}, " " + (STATUS_TEXT[s.status] || s.status)));
      })) : h("p", {class: "lb-insp-hinweis"}, "Noch kein Kabel angeschlossen.")));
  }

  /* ---------- Änderungen ---------- */
  function aendern(beschreibung, fn){
    if (!Z.verlauf) return;
    try { return Z.verlauf.aendern(beschreibung, fn); }
    catch (e) { if (e && e.still) UI.toast?.(e.message, "warn"); else { console.error(e); UI.toast?.(`Das ging nicht: ${e.message || e}`, "fehler"); } }
  }
  function rueckgaengig(){
    const b = Z.verlauf?.zurueck();
    if (b) UI.toast(`Rückgängig: ${b}`, "info", {id: "verlauf", dauer: 2600, aktion: {text: "Wiederholen", fn: wiederholen}});
    else UI.toast("Nichts mehr rückgängig zu machen.", "info", {id: "verlauf", dauer: 2000});
  }
  function wiederholen(){
    const b = Z.verlauf?.vor();
    if (b) UI.toast(`Wiederholt: ${b}`, "info", {id: "verlauf", dauer: 2400});
  }
  Bus.an("netz-geaendert", d => {
    if (!d || d.netz !== Z.netz) return;
    if (Z.auswahl && !Z.netz.geraete[Z.auswahl.geraet]) auswaehlen(null);
    for (const id of [...Z.auswahlSet]) if (!Z.netz.geraete[id]) Z.auswahlSet.delete(id);
    if (!Z.auswahlSet.size) Z.auswahl = null;
    if (Z.kabelWahl && !Z.netz.kabel.some(k => k.id === Z.kabelWahl)) Z.kabelWahl = null;
    for (const id of [...Z.pos.keys()]) if (!Z.netz.geraete[id]) Z.pos.delete(id);
    neuZeichnen();
  });

  /* ---------- Werkzeug ---------- */
  /* Textdiät (A4): Auswählen braucht keinen Dauertext; spricht gerade der Coach (data-hinweisquelle), schweigt die Fläche */
  const HINWEISE = {
    auswahl: "",
    kabel: "Kabel: vom Gerät zum Zielgerät ziehen – Umschalt beim Loslassen wählt den Port.",
    ping: "Ping: von Gerät A auf Gerät B ziehen. Esc beendet.",
    platzieren: "auf die Fläche klicken – Umschalt hält das Gerät fest, Esc bricht ab.",
  };
  function werkzeug(name, o = {}){
    if (!(name in HINWEISE)) name = "auswahl";
    if (name === "platzieren" && Z.werkzeug !== "platzieren") Z.vorPlatz = Z.werkzeug;   /* Platzieren ist ein Zwischenschritt */
    Z.werkzeug = name;
    if (name !== "platzieren") Z.platz = null; else Z.platz = o.platz || Z.platz;
    if (name !== "ping") Z.pingVon = null; else if (o.von) Z.pingVon = o.von;
    werkzeugAnzeigen();
    F.bandLeeren?.();
  }
  /* nach dem Platzieren (oder Esc) zurück zum Werkzeug davor – z. B. Kabel, wenn der Coach es gewählt hatte */
  function platzEnde(){ const v = Z.vorPlatz && Z.vorPlatz !== "platzieren" ? Z.vorPlatz : "auswahl"; Z.vorPlatz = null; werkzeug(v); }
  function werkzeugAnzeigen(text){
    if (!Z.root) return;
    if (Z.root.dataset.werkzeug && Z.root.dataset.werkzeug !== Z.werkzeug && Z.werkzeug !== "platzieren") {
      UI.juice?.($(`.lb-wz[data-wz="${Z.werkzeug}"]`, Z.root), "wahl", 400); UI.klang?.spielen("klick");
    }
    Z.root.dataset.werkzeug = Z.werkzeug;
    for (const b of $$(".lb-wz", Z.root)) { const an = b.dataset.wz === Z.werkzeug; b.classList.toggle("an", an); b.setAttribute("aria-pressed", String(an)); }
    F.fachMarkieren?.();
    let t = text || HINWEISE[Z.werkzeug];
    if (!text && Z.werkzeug === "ping" && Z.pingVon) t = `Ping von ${Z.netz?.geraete[Z.pingVon]?.name || Z.pingVon}: jetzt das Ziel anklicken. Esc bricht ab.`;
    if (!text && Z.werkzeug === "platzieren" && Z.platz) t = `${UI.geraeteArt(Z.platz.typ, Z.platz.skin).titel}: ` + t;
    if (!text && Z.el.auftrag?.querySelector("[data-hinweisquelle]")) t = "";
    Z.el.hinweis.textContent = t;
  }

  /* ---------- Gerät anlegen ---------- */
  const SKIN_NAME = {laptop: "Laptop", drucker: "Drucker", kasse: "Kasse", tablet: "Tablet"};
  const TYP_NAME = {pc: "PC", server: "Server", switch: "SW", router: "R", firewall: "FW", nas: "NAS"};
  function freierName(basis){
    const namen = new Set(Object.values(Z.netz.geraete).map(g => g.name));
    if (!namen.has(basis)) return basis;
    let i = 2; while (namen.has(basis + i)) i++; return basis + i;
  }
  function geraetAnlegen(typ, skin, x, y){
    if (!Z.netz) return null;
    if (typ === "internet" && Object.values(Z.netz.geraete).some(g => g.typ === "internet")) {
      UI.toast("Es gibt schon ein Internet in diesem Netz. Eins reicht – es steht für den Provider und alles dahinter.", "info");
      return null;
    }
    let neu = null;
    const o = {x: raster(x), y: raster(y), skin: skin || null};
    if (skin && SKIN_NAME[skin]) o.name = freierName(SKIN_NAME[skin]);
    else if (TYP_NAME[typ]) { const namen = new Set(Object.values(Z.netz.geraete).map(g => g.name)); let i = 1; while (namen.has(TYP_NAME[typ] + i)) i++; o.name = TYP_NAME[typ] + i; }
    aendern(`${o.name || UI.geraeteArt(typ, skin).titel} hinzugefügt`, n => { neu = Modell.geraet(n, typ, o); });
    if (neu) {
      auswaehlen(neu.id); F.zuletztMerken?.(typ, skin);
      UI.klang?.spielen("klick");
      requestAnimationFrame(() => requestAnimationFrame(() => UI.juice?.(Z.gEl.get(neu.id), "plop", 500)));   /* nach dem Neuzeichnen */
    }
    return neu;
  }
  /* in die Mitte der sichtbaren Fläche (Tastatur, Befehlspalette) */
  function einsetzen(typ, skin){
    if (!Z.svg) return null;
    const r = Z.svg.getBoundingClientRect(), w = weltPunkt(r.left + r.width / 2, r.top + r.height / 2);
    return geraetAnlegen(typ, skin || null, w.x, w.y);
  }
  function loeschen(id){
    const g = Z.netz?.geraete[id]; if (!g) return;
    aendern(`${g.name} gelöscht`, n => Modell.entfernen(n, id));
    UI.toast(`${g.name} gelöscht.`, "info", {id: "loeschen", aktion: {text: "Rückgängig", fn: rueckgaengig}});
  }
  function kabelTrennen(kid){
    const k = Z.netz?.kabel.find(x => x.id === kid); if (!k) return;
    const na = Z.netz.geraete[k.a.geraet]?.name, nb = Z.netz.geraete[k.b.geraet]?.name;
    aendern(`Kabel ${na} ${k.a.port} ↔ ${nb} ${k.b.port} getrennt`, n => Modell.trennen(n, kid));
    UI.toast(`Kabel ${na} ↔ ${nb} getrennt.`, "info", {id: "loeschen", aktion: {text: "Rückgängig", fn: rueckgaengig}});
  }
  function verbinden(a, b){
    let erg = null;
    const na = Z.netz.geraete[a.geraet]?.name, nb = Z.netz.geraete[b.geraet]?.name;
    aendern(`Kabel ${na} ↔ ${nb}`, n => { erg = Modell.verbinden(n, a, b); if (erg && erg.fehler) throw Object.assign(new Error(erg.fehler), {still: true}); });
    return erg;
  }

  /* ---------- Aufräumen (Auto-Layout nach Schichten) ----------
     Internet oben, darunter Firewall/Router, dann Switches, unten die Hosts – jeder Switch mit seinen Hosts als Block
     direkt darunter (so kreuzen sich kaum Kabel). Obere Reihen stehen über dem Schwerpunkt ihrer Nachbarn. */
  function aufraeumen(){
    const netz = Z.netz; if (!netz) return;
    const ids = Object.keys(netz.geraete); if (!ids.length) return;
    const REIHE = {internet: 0, firewall: 1, router: 1, switch: 2, pc: 3, server: 3, nas: 3};
    const reihe = id => REIHE[netz.geraete[id].typ] ?? 3;
    const nachbarn = id => netz.kabel.filter(k => k.a.geraet === id || k.b.geraet === id).map(k => k.a.geraet === id ? k.b : k.a);
    const HOEHE = 190, SPALTE = 130, ZEILE = 120, LUECKE = 40;
    const ziel = {};
    const alt = grenzen() || {x1: 0, y1: 0, x2: 800, y2: 600};
    const portNr = p => { const m = /(\d+)$/.exec(String(p)); return m ? +m[1] : 0; };
    /* Eltern der Hosts: erster Switch, sonst erster Router/Firewall */
    const kinder = new Map(), ohneEltern = [];
    for (const id of ids.filter(i => reihe(i) === 3)) {
      const nb = nachbarn(id);
      const e = nb.find(x => netz.geraete[x.geraet]?.typ === "switch") || nb.find(x => reihe(x.geraet) === 1);
      if (e) { if (!kinder.has(e.geraet)) kinder.set(e.geraet, []); kinder.get(e.geraet).push({id, port: portNr(e.port)}); }
      else ohneEltern.push({id, port: 0});
    }
    const yR = [0, HOEHE, 2 * HOEHE, 3 * HOEHE];
    if (!ids.some(i => reihe(i) === 0)) { yR[1] = 0; yR[2] = HOEHE; yR[3] = 2 * HOEHE; }
    if (!ids.some(i => reihe(i) === 1)) { yR[2] -= HOEHE; yR[3] -= HOEHE; }
    if (!ids.some(i => reihe(i) === 2)) { yR[3] -= HOEHE; }
    /* Blöcke: Switches (mit Hosts), dann Router mit direkt angeschlossenen Hosts, dann lose Hosts */
    let cursor = 0;
    const block = (elternId, liste) => {
      liste.sort((a, b) => a.port - b.port || a.id.localeCompare(b.id));
      const n = liste.length, proZeile = n <= 5 ? Math.max(1, n) : Math.ceil(n / Math.ceil(n / 5));
      const breite = Math.max(1, Math.min(n, proZeile)) * SPALTE;
      liste.forEach((h, i) => { ziel[h.id] = {x: cursor + (i % proZeile + 0.5) * SPALTE, y: yR[3] + Math.floor(i / proZeile) * ZEILE}; });
      if (elternId && reihe(elternId) === 2) ziel[elternId] = {x: cursor + breite / 2, y: yR[2]};
      cursor += breite + LUECKE;
      return cursor - breite / 2 - LUECKE;
    };
    const switches = ids.filter(i => reihe(i) === 2).sort((a, b) => netz.geraete[a].x - netz.geraete[b].x || a.localeCompare(b));
    for (const sw of switches) {
      const l = kinder.get(sw) || [];
      if (l.length) block(sw, l);
      else { ziel[sw] = {x: cursor + 75, y: yR[2]}; cursor += 150 + LUECKE; }
    }
    const obenKinder = new Map();
    for (const r of ids.filter(i => reihe(i) === 1).sort((a, b) => netz.geraete[a].x - netz.geraete[b].x)) {
      const l = kinder.get(r); if (l && l.length) obenKinder.set(r, block(null, l));
    }
    if (ohneEltern.length) block(null, ohneEltern);
    /* obere Reihen: über dem Schwerpunkt der Nachbarn unten, mit Mindestabstand */
    const verteilen = (liste, y) => {
      const w = liste.map(id => {
        const unten = nachbarn(id).map(x => x.geraet).filter(x => ziel[x] && reihe(x) > reihe(id));
        let x = unten.length ? unten.reduce((s, x) => s + ziel[x].x, 0) / unten.length : (obenKinder.get(id) ?? null);
        return {id, x};
      });
      /* ohne Nachbarn weiter unten: neben einen Nachbarn derselben Reihe (z. B. Firewall neben Router), sonst ans Ende */
      let rechts = Math.max(0, ...Object.values(ziel).map(p => p.x));
      for (let runde = 0; runde < 3; runde++) for (const e of w) {
        if (e.x != null) continue;
        const gleich = nachbarn(e.id).map(x => w.find(v => v.id === x.geraet && v.x != null)).find(Boolean);
        if (gleich) e.x = gleich.x + 150;
      }
      for (const e of w) if (e.x == null) e.x = (rechts += 150);
      w.sort((a, b) => a.x - b.x || a.id.localeCompare(b.id));
      const soll = w.map(e => e.x);
      for (let i = 1; i < w.length; i++) w[i].x = Math.max(w[i].x, w[i - 1].x + 150);
      const versatz = w.reduce((s, e, i) => s + e.x - soll[i], 0) / (w.length || 1);
      for (const e of w) ziel[e.id] = {x: e.x - versatz, y};
    };
    verteilen(ids.filter(i => reihe(i) === 1), yR[1]);
    verteilen(ids.filter(i => reihe(i) === 0), yR[0]);
    /* ins Raster, links oben wie vorher */
    const x1 = Math.min(...Object.values(ziel).map(p => p.x)), y1 = Math.min(...Object.values(ziel).map(p => p.y));
    for (const p of Object.values(ziel)) { p.x = raster(p.x - x1 + alt.x1 + 80); p.y = raster(p.y - y1 + alt.y1 + 80); }
    const geaendert = ids.some(id => netz.geraete[id].x !== ziel[id].x || netz.geraete[id].y !== ziel[id].y);
    if (!geaendert) { UI.toast("Schon aufgeräumt.", "info", {dauer: 1800}); return; }
    const fertig = () => {
      Z.pos.clear();
      aendern("Aufgeräumt", n => { for (const id of ids) if (n.geraete[id]) { n.geraete[id].x = ziel[id].x; n.geraete[id].y = ziel[id].y; } });
      requestAnimationFrame(() => einpassen(true));
    };
    if (UI.bewegung?.() !== "voll") return fertig();
    const start = {}; for (const id of ids) start[id] = {x: netz.geraete[id].x, y: netz.geraete[id].y};
    const t0 = performance.now(), MS = UI.zeit("lang");        /* Zeit-Token statt 520-ms-Literal (U07) */
    const schritt = t => {
      if (!Z.root?.isConnected) return fertig();
      const p = Math.min(1, (t - t0) / MS), e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      for (const id of ids) Z.pos.set(id, {x: start[id].x + (ziel[id].x - start[id].x) * e, y: start[id].y + (ziel[id].y - start[id].y) * e});
      for (const id of ids) { const el = Z.gEl.get(id), q = Z.pos.get(id); el?.setAttribute("transform", `translate(${q.x} ${q.y})`); }
      for (const k of netz.kabel) { const neu = kabelGruppe(k), altEl = Z.kEl.get(k.id); if (altEl) altEl.replaceWith(neu); Z.kEl.set(k.id, neu); }
      if (Z.karten.size) UI.ebenen.platzieren(Z.karten, pos);
      zonenNeu();
      kabelEndenBauen();
      if (p < 1) requestAnimationFrame(schritt); else fertig();
    };
    requestAnimationFrame(schritt);
  }

  /* ---------- Ansicht- und Zoom-Menü (je ein Knopf statt fünf Ebenen-Reitern und fünf Zoomknöpfen) ---------- */
  function ansichtMenue(knopf){
    const r = knopf.getBoundingClientRect(), jetzt = UI.ebenen.aktuell;
    UI.menue(r.left, r.bottom + 6, UI.ebenen.LISTE.map(l => ({text: l.name, sym: l.id === jetzt ? "ok" : null, taste: "⇧" + l.taste, titel: l.text, fn: () => UI.ebenen.setzen(l.id)})),
      {titel: "Ansicht"});
  }
  function zoomMenue(knopf){
    const r = knopf.getBoundingClientRect();
    UI.menue(r.right - 230, r.top - 6, [
      {text: "Vergrößern", sym: "plus", taste: "+", fn: () => zoomSchritt(1.25)},
      {text: "Verkleinern", sym: "minus", taste: "−", fn: () => zoomSchritt(1 / 1.25)},
      {text: "Zoom 100 %", sym: "suche", taste: "0", fn: () => zoomAuf(1)},
      {text: "50 %", fn: () => zoomAufProzent(50)}, {text: "75 %", fn: () => zoomAufProzent(75)},
      {text: "150 %", fn: () => zoomAufProzent(150)}, {text: "200 %", fn: () => zoomAufProzent(200)},
      "-",
      {text: "Alles einpassen", sym: "einpassen", taste: "F", fn: () => einpassen(true)},
      {text: "Aufräumen", sym: "aufraeumen", taste: "A", fn: () => aufraeumen()},
    ], {titel: "Zoom", oben: true});
  }

  /* ---------- Laden ---------- */
  function laden(netz, opt = {}){
    Z.netz = netz;
    Z.verlauf = opt.verlauf || Modell.verlauf(netz);
    Z.titel = opt.titel || "Labor";
    Z.opt = opt;
    Z.auswahl = null; Z.auswahlSet = new Set(); Z.kabelWahl = null; Z.pos.clear(); Z.hover = null; Z.pingVon = null;
    Z.ende = []; Z.kabelHover = null; Z.geraeteHover = null;
    if (Z.werkzeug !== "auswahl") Z.werkzeug = "auswahl";
    Z.einpassenAusstehend = true;
    Z.inspWartet = typeof innerWidth === "number" && innerWidth < 1100; Z.simWartet = true; Z.simZu = true;  /* A: Inspektor bleibt sichtbar (breit) */
    Z.dock = {reiter: "inspektor", zu: false}; Z.dockDa = {}; Z.dockZahl = {};
    F.fachZu?.();
    UI.ebenen.setzen(opt.ebene || UI.ebenen.gemerkt(), {merken: false});
    if (Z.el.ansichtGruppe) Z.el.ansichtGruppe.hidden = opt.ansichtMenue === false;
    fernwartung(opt.fernwartung && netz.geraete[opt.fernwartung] ? opt.fernwartung : null);
    blatt(typeof opt.blatt === "function" ? opt.blatt : null);
    if (Z.root?.isConnected) {
      layoutAnwenden(); auftragZeichnen(); werkzeugAnzeigen(); zeichnen(); inspektorZeigen(); simLeer();
      requestAnimationFrame(() => { einpassen(false); Z.einpassenAusstehend = false; });
      /* POLARIS: rechts steht der Inspektor dauerhaft – auf breiten Ansichten das erste
         Infrastruktur-Gerät vorwählen, damit dort echte Werte stehen statt des Leerzustands. */
      if (typeof innerWidth === "number" && innerWidth >= 1100 && !Z.auswahl && !opt.fernwartung && !Z.fern && !opt.sandbox) {
        const liste = Object.values(netz.geraete || {});
        const erstes = liste.find(g => g.typ === "switch") || liste.find(g => g.typ === "router") || liste[0];
        if (erstes) auswaehlen(erstes.id);
      }
    }
    UI.werkstatt?.sandboxModus?.(!!opt.sandbox);
    Bus.senden("labor-geladen", {netz, titel: Z.titel});
    if (Z.fern) setTimeout(() => { if (Z.fern && Z.netz === netz) UI.terminal?.oeffnen(Z.fern); }, 0);
  }
  /* Funktionsprobe der Fernwartung (§ 20 F4): Bildschirm des Kunden zeigt ✓, die Sitzung endet, der PC ist online */
  function fernFertig(){
    const el = Z.el.fern; if (!el || el.hidden || !Z.fern) return;
    el.classList.add("fertig");
    const x = el.querySelector(".lb-fern-x"); if (x) x.textContent = "✓";
    const s = el.querySelector(".lb-fern-status"); if (s) s.replaceChildren(h("i", {class: "lb-fern-punkt", "aria-hidden": "true"}), "Verbindung getrennt");
    el.querySelector(".lb-fern-geraet")?.append(h("small", {class: "lb-fern-online"}, "online ✓"));
  }
  /* Arbeitsblatt an (Zeichenfunktion) oder aus (null): Fläche, Werkzeuge und Geräteleiste verdeckt, Blatt darüber */
  function blatt(fn){
    Z.blattFn = fn || null;
    Z.root?.classList.toggle("lb-blatt-an", !!fn);
    const el = Z.el.blatt; if (!el) return;
    el.hidden = !fn;
    if (fn) fn(el); else el.replaceChildren();
  }
  /* Fernwartung an (Geräte-ID) oder aus (null): Fläche, Werkzeuge und Geräteleiste verdeckt. Links steht statt Leere ein
     Sitzungsfenster (Design § 20, F2): Verbindung, der Bildschirm des Kunden mit dem Symptom als Bild, das Gerät und wer die
     Sitzung freigegeben hat (opt.fernInfo = {person, symbol, farbe, symptom, ziel:{typ?, skin?, sym?, text}}). Das Terminal rechts bekommt
     mehr als die Hälfte der Breite (CSS). Nach bestandener Abnahme hebt das Spiel sie auf – dann sieht man das Netz, das man
     blind repariert hat. Wenige Wörter mit Absicht: Platzbudget R5 (≤ 40 Wörter beim Start). */
  function fernwartung(id){
    Z.fern = id || null;
    Z.root?.classList.toggle("lb-fern", !!Z.fern);
    const el = Z.el.fern; if (!el) return;
    el.hidden = !Z.fern;
    el.classList.remove("fertig");                          /* „getrennt“ aus der Probe der vorigen Sitzung nicht mitnehmen */
    if (!Z.fern) return el.replaceChildren();
    const g = Z.netz.geraete[Z.fern], info = (Z.opt && Z.opt.fernInfo) || {}, ziel = info.ziel || {};
    el.replaceChildren(
      h("div", {class: "lb-fern-kopf"}, h("span", {class: "lb-fern-sym", "aria-hidden": "true"}, "🛰"), h("strong", {}, "Fernwartung"),
        h("span", {class: "lb-fern-status", title: "Die Sitzung steht – du arbeitest im Terminal rechts"}, h("i", {class: "lb-fern-punkt", "aria-hidden": "true"}), "verbunden")),
      h("div", {class: "lb-fern-schirm", title: info.symptom || null},
        h("div", {class: "lb-fern-symptom"},
          ziel.typ ? sv("svg", {class: "lb-fern-zielbild typ-" + ziel.typ, viewBox: "-28 -28 56 56", "aria-hidden": "true"}, UI.geraetebild(ziel.typ, ziel.skin))
            : h("span", {class: "lb-fern-symptom-sym", "aria-hidden": "true"}, ziel.sym || "⚠"),
          h("b", {class: "lb-fern-x", "aria-hidden": "true"}, "✗")),
        ziel.text ? h("span", {class: "lb-fern-symptom-text"}, ziel.text) : null),
      h("div", {class: "lb-fern-geraet"}, sv("svg", {class: "lb-fern-bild typ-" + g.typ, viewBox: "-28 -28 56 56", "aria-hidden": "true"}, UI.geraetebild(g.typ, g.skin)), h("strong", {}, g.name)),
      info.person ? h("p", {class: "lb-fern-kunde", style: info.farbe ? {"--k": `var(${info.farbe})`} : null},
        h("span", {class: "lb-fern-kunde-sym", "aria-hidden": "true"}, info.symbol || "✉"), "Freigabe: ", h("b", {}, info.person)) : null);
  }
  function simLeer(){
    const c = Z.el.sim; if (!c) return;
    if (typeof UI.simpanel?.zeigen === "function") { try { UI.simpanel.zeigen(c, null); } catch (e) { console.error(e); } }
    else c.replaceChildren(h("p", {class: "lb-sim-platz"}, "Hier erscheint die Aufzeichnung eines Pings: jedes Paket, jede Station, und warum etwas verworfen wird."));
  }
  function zentrieren(id){ if (!Z.netz?.geraete[id]) return; auswaehlen(id); sichtbarMachen(id, true); F.hervorheben?.([{geraet: id}], 1400); }
  function konsole(id){
    const g = Z.netz?.geraete[id]; if (!g) return;
    if (UI.terminal) { auswaehlen(id); UI.terminal.oeffnen(id); return; }          /* Phase C: Terminal im Dock */
    auswaehlen(id);
    if (Z.inspektorZu) inspektorUmschalten(false);
    const c = Z.el.inspektor;
    if (typeof UI.inspektor?.reiter === "function") { try { UI.inspektor.reiter(c, "konsole"); return; } catch (e) { console.error(e); } }
    if (typeof UI.konsole?.oeffnen !== "function") { UI.toast("Die Konsole wird gerade eingebaut.", "info"); return; }
    const ziel = h("div", {class: "lb-konsole"});
    c.replaceChildren(h("div", {class: "lb-konsole-kopf"},
      h("strong", {}, `Konsole · ${g.name}`),
      h("button", {type: "button", class: "lb-knopf-klein", onclick: () => inspektorZeigen()}, "Zurück zum Inspektor")), ziel);
    UI.konsole.oeffnen(ziel, Z.netz, id, Z.verlauf, {fokus: true});
  }

  Object.assign(F, {pos, raster, weltPunkt, zoomUm, ansichtSetzen, ansichtAnimieren, einpassen, sichtbarMachen, zeichnen, neuZeichnen,
    geraetBewegt, zonenNeu, kabelGeo, kabelGruppe, auswaehlen, kabelWaehlen, inspektorZeigen, inspektorUmschalten, simUmschalten, simHoeheSetzen,
    aendern, rueckgaengig, wiederholen, werkzeug, werkzeugAnzeigen, platzEnde, geraetAnlegen, einsetzen, loeschen, kabelTrennen, verbinden, aufraeumen, konsole,
    grundText, layoutAnwenden, STATUS_TEXT, zoomSchritt, dockZeigen, dockZu, dockOffen, dockReiter,
    auswahlSetzen, auswahlUmschalten, auswahlAlle, auswahlImRechteck, geraeteImRechteck, auswahlVorschau,
    verschiebenMehr, loeschenMehr, duplizieren, einpassenAuswahl, mitteAufWelt, zoomAufProzent, zoomProzent, sichtbereich});

  const api = {
    get netz(){ return Z.netz; },
    get verlauf(){ return Z.verlauf; },
    get auswahl(){ return Z.auswahl ? {...Z.auswahl} : null; },
    /* Mehrfachauswahl (Architektur § 16.5): Lese- und Schreib-API für andere Bausteine/Tests.
       auswahlMehr() liefert die ids in Auswahlreihenfolge (letztes = primär), auswahlMehrSetzen(ids)
       setzt sie ohne Verlaufsschritt – Auswahl ist UI-Zustand, kein Netzzustand. */
    auswahlMehr: () => [...Z.auswahlSet],
    auswahlMehrSetzen: ids => auswahlSetzen(ids),
    duplizieren: ids => duplizieren(ids),
    loeschenMehr: ids => loeschenMehr(ids),
    verschiebenMehr: (ids, dx, dy) => verschiebenMehr(ids, dx, dy),
    auswahlAlle: () => auswahlAlle(),
    einpassenAuswahl: () => einpassenAuswahl(),
    zoomAufProzent: p => zoomAufProzent(p),
    zoomProzent: () => zoomProzent(),
    mitteAufWelt: (x, y) => mitteAufWelt(x, y),
    sichtbereich: () => sichtbereich(),
    get titel(){ return Z.titel; },
    get el(){ return {auftrag: Z.el.auftrag || null, inspektor: Z.el.inspektor || null, sim: Z.el.sim || null, plan: Z.el.plan || null, akte: Z.el.akte || null, terminal: Z.el.terminal || null}; },
    get werkzeugName(){ return Z.werkzeug; },
    zeigen, wieder, laden, auswaehlen, neuZeichnen, einpassen, aufraeumen, werkzeug, zentrieren, konsole, einsetzen,
    rueckgaengig, wiederholen, loeschen,
    hervorheben: (liste, ms) => bereit().hervorheben?.(liste, ms),
    animiere: (e, o) => bereit().animiere ? F.animiere(e, o) : Promise.resolve(),
    zeigeTrace: (t, o) => bereit().zeigeTrace?.(t, o),
    ping: (von, nach) => bereit().ping?.(von, nach),
    taste: e => F.taste ? F.taste(e) : false,
    inspektor: zu => inspektorUmschalten(zu),
    simulation: zu => simUmschalten(zu),
    dock: id => id ? dockZeigen(id) : dockZu(),
    dockReiter: (id, verfuegbar, o) => dockReiter(id, verfuegbar, o),
    dockOffen: id => dockOffen(id),
    get dockStand(){ return {reiter: Z.dock?.reiter || null, zu: !!Z.dock?.zu, da: DOCK.filter(r => r.da()).map(r => r.id)}; },
    auftragNeu: () => auftragZeichnen(),
    warnungenAn,
    fernwartung: id => { fernwartung(id); if (!id) { zeichnen(); einpassen(false); } },
    fernFertig: () => fernFertig(),
    get fern(){ return Z.fern || null; },
    auffrischen: () => { zeichnen(); inspektorZeigen(); },
    /* für Szenen (ui/szene.js): Weltposition, Bildschirmposition auf der Leinwand, Paket zwischen zwei Geräten */
    pos: id => { const p = pos(id); return p ? {x: p.x, y: p.y} : null; },
    bildschirm: id => { const p = pos(id); return p ? {x: p.x * Z.view.k + Z.view.tx, y: p.y * Z.view.k + Z.view.ty, k: Z.view.k} : null; },
    get leinwand(){ return Z.el.leinwand || null; },
    get geraetEl(){ return id => Z.gEl.get(id) || null; },
    paket: (von, nach, o = {}) => bereit().animiere ? F.animiere({art: "senden", geraet: von, port: null, nach: {geraet: nach}, proto: o.proto || "TCP", frame: {}}, {ms: o.ms, beschriften: false}) : Promise.resolve(),
    erfolg: id => bereit().erfolgEffekt ? F.erfolgEffekt(id) : Promise.resolve(),
    _: Z, _f: F,
  };
  return api;
})();
