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
   Einzelklick (Strang D): Klick ohne Ziehen auf Gerät, Port, Kabel oder Zone zeigt die Infos rechts
   (UI.inspektor) und öffnet den Dock-Reiter „Inspektor" – der Werkzeugmodus bleibt unverändert.
   Kabel/Zone: UI.labor.zeigeKabel(id) · UI.labor.zeigeZone(cidr) (auch der Resolver UI.fehlerziel nutzt sie).
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
    info: null,                  /* {art:"kabel", kid} | {art:"zone", cidr} – Infos rechts (Strang D) */
  };
  const F = {};                  /* interne Helfer für editor-werkzeuge.js / editor-pakete.js */
  function bereit(){ if (!F.animiere && UI.laborPakete) UI.laborPakete.einrichten(Z, F); return F; }

  const pos = id => Z.pos.get(id) || Z.netz?.geraete[id] || null;
  const raster = v => Math.round(v / RASTER) * RASTER;
  const einst = () => store.get("einst", {}) || {};
  /* „!“-Warnungen der Live-Prüfung (Modell.pruefen): Stufenregeln entscheiden je Ticket (laden-Option warnungen) */
  const warnungenAn = () => { const w = Z.opt && Z.opt.warnungen; return typeof w === "function" ? !!w() : w !== false; };
  function einstLabor(teil){ const e = einst(); e.labor = Object.assign({}, e.labor, teil); store.set("einst", e); }

  /* ---------- Einzelklick (Strang D): Klick ohne Ziehen zeigt IMMER die Infos rechts ----------
     Der Klick auf Gerät, Port, Kabel, Zone oder Gerätelabel öffnet unabhängig vom aktiven
     Werkzeug den Inspektor – der Werkzeugmodus bleibt unverändert. Der Pfad hängt am pointerup
     des SVGs (nicht am click): die Fläche setzt beim pointerdown den Pointer-Capture, danach
     ginge „click" ans SVG. Ein Ziehen (mehr als 5 px) ist kein Klick. Kein Fokusklau: es wird
     nichts fokussiert, nur ausgewählt und der Dock-Reiter geöffnet. */
  let klickStart = null;
  function klickZiel(el){
    if (!el || typeof el.closest !== "function") return null;
    const kab = el.closest("[data-kabel]");
    if (kab && Z.svg && Z.svg.contains(kab)) return {art: "kabel", kid: kab.dataset.kabel};
    const zone = el.closest(".zone");
    if (zone && Z.svg && Z.svg.contains(zone) && zone.dataset && zone.dataset.cidr) return {art: "zone", cidr: zone.dataset.cidr};
    const port = el.closest("[data-port]");
    if (port && Z.svg && Z.svg.contains(port)) {
      const ger = port.closest("[data-id]");
      return {art: "port", id: ger && ger.dataset ? ger.dataset.id : null, port: port.dataset ? port.dataset.port : null};
    }
    const ger = el.closest("[data-id]");
    if (ger && Z.svg && Z.svg.contains(ger) && ger.dataset) return {art: "geraet", id: ger.dataset.id};
    return null;
  }
  function klickAuswerten(ziel){
    if (!ziel || !Z.netz) return false;
    if (ziel.art === "kabel" && ziel.kid) { dockZeigen("inspektor"); zeigeKabel(ziel.kid); return true; }
    if (ziel.art === "zone" && ziel.cidr) { dockZeigen("inspektor"); zeigeZone(ziel.cidr); return true; }
    if (ziel.art === "port" && ziel.id && Z.netz.geraete[ziel.id]) {
      auswaehlen(ziel.id, ziel.port || undefined); dockZeigen("inspektor"); inspektorZeigen(); return true;
    }
    if (ziel.art === "geraet" && ziel.id && Z.netz.geraete[ziel.id]) {
      auswaehlen(ziel.id); dockZeigen("inspektor"); inspektorZeigen(); return true;
    }
    return false;
  }
  function klickpfadEinrichten(){
    if (!Z.svg || typeof Z.svg.addEventListener !== "function") return;
    Z.svg.addEventListener("pointerdown", e => {
      if (e.button !== 0) { klickStart = null; return; }
      klickStart = {x: e.clientX, y: e.clientY, pid: e.pointerId, ziel: e.target};
    });
    Z.svg.addEventListener("pointerup", e => {
      const s = klickStart; klickStart = null;
      if (!s || e.pointerId !== s.pid) return;
      const dx = (typeof e.clientX === "number" ? e.clientX : s.x) - s.x, dy = (typeof e.clientY === "number" ? e.clientY : s.y) - s.y;
      if (Math.hypot(dx, dy) > 5) return;                       /* Ziehen, kein Klick */
      klickAuswerten(klickZiel(e.target) || klickZiel(s.ziel));
    });
    Z.svg.addEventListener("pointercancel", () => { klickStart = null; });
  }

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
    Z.svg = sv("svg", {class: "lb-svg", tabindex: "0", role: "application", "aria-label": "Netz-Zeichenfläche. Links ziehen verschiebt die Ansicht, Shift+Ziehen wählt mehrere Geräte aus, Klick wählt ein Gerät, F passt ein, Fragezeichen zeigt alle Tasten."});
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
        wz("auswahl", "zeiger", "Auswählen (V): Klick wählt, Ziehen auf freier Fläche verschiebt die Ansicht, Shift+Ziehen zieht einen Auswahlrahmen", "V"),
        wz("kabel", "kabel", "Kabel verlegen (K): vom Gerät zum Gerät ziehen", "K"), wz("ping", "ping", "Ping-Werkzeug (P): von Gerät A auf Gerät B ziehen", "P")),
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

    /* Runde 5: Seit die Auftragsmappe ein eigenes Blatt mit Kopf ist, ruhen Werkzeugleiste und
       Flächentitel, solange sie offen ist (Klasse .mappe-an am .labor, CSS in editor.css bei den
       Leisten) – der frühere Kopfraum-Hack (`--am-kopfraum`) ist damit entfallen. Die gemessene
       Leistenhöhe bleibt als `--leiste-h` erhalten: sie ist die eine Zahl für die schwebende
       Werkzeugleiste (44 px bei grober Zeigereingabe, sonst 48) und wird von der Überlappungs-
       Messung gelesen; ohne Messen wäre sie wieder geschätzt. */
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
    klickpfadEinrichten();
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
    /* Beschriftung (Nutzerentscheidung 30.10.2026): KEINE Zoom-Ausblendung für Knotentexte mehr.
       Name und Adresse bleiben bei jedem Zoom gleich groß, die Rolle erscheint nur bei Platz.
       Portnamen (.kabel-port) bleiben davon unberührt (eigene Regel in kabelEndenAktualisieren). */
    beschriftungenSkalieren();
    kabelEndenAktualisieren();
    /* Zonen hängen an den Node-Boxen (Weltmaß = lokal * s) – bei Skalenwechsel neu zeichnen. */
    if (Z.netz && Z.s.zonen && UI.ebenen.aktuell === "ip") {
      const sk = blockSkala(k);
      if (Z.zonenSkala !== sk) { Z.zonenSkala = sk; Z.s.zonen.replaceChildren(); UI.ebenen.zeichneZonen(Z.s.zonen, Z.netz, pos, {masse: zonenMasse, raum: raumWelt()}); }
    }
    UI.werkstatt?.ansichtGeaendert?.();
  }
  /* ---------- Knoten: Piktogramm + Label-Block als EIN skalierender Block ----------
     Nutzerentscheidung 30.10.2026: Geräteposition = Zentrum des Piktogramms. Label-Block IMMER rechts
     daneben (kein Spiegeln): Name 12,5 px (y=-8), Rolle 11 px (y=+4), Adresse 11 px (y=+17),
     linksbündig, x = iconHalf + 8. Piktogramm 36/30/26 px. Beides wird GEMEINSAM mit
     s = min(2,6; max(1; 1/k)) um den Gerätepunkt skaliert – die Schrift bleibt dadurch unter 100 %
     Zoom konstant groß. Kollisionen: NODE-BOX [x-iconHalf-4, y-24] .. [x+iconHalf+8+110, y+24];
     überlappen sich zwei Node-Boxen, fällt NUR die Rolle weg (Name+Adresse bleiben immer).
     Portnamen haben Nachrang (kabelEndenAktualisieren). */
  const LABEL_BREITE = 110;             /* reservierte Labelbreite im Knoten (Bildschirm-px bei s=1) */
  function blockSkala(k){ return Math.min(2.6, Math.max(1, 1 / (k || 1))); }
  function labelUeber(a, b){ return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1; }
  const LABEL_HALB = 58;                /* halbe Reservierungsbreite für die Beschriftung (px bei s=1) */
  /* Ab dieser Zoomstufe stehen die Adressen ruhig auf der Fläche (Runde 5, § 2 D). Auswahl und
     Hover zeigen die Adresse immer; das Einpassen landet je nach Netz bei 0,55–0,8 – dort bleibt
     die Karte ohne Zahlenregen lesbar, die Adressen stehen im Tooltip und im Inspektor. */
  const IP_ZOOM = 0.85;
  function nodeBoxWelt(g, p, k){
    const s = blockSkala(k), h = ikonPx(g) / 2, halb = Math.max(h + 6, LABEL_HALB);
    return {x1: p.x - halb * s, y1: p.y - (h + 4) * s, x2: p.x + halb * s, y2: p.y + (h + 62) * s};
  }
  function raumWelt(){
    let breite = 900, hoehe = 600;
    try { const r = Z.svg.getBoundingClientRect(); if (r && r.width) { breite = r.width; hoehe = r.height; } } catch (e) { void e; }
    return {x1: -Z.view.tx / Z.view.k, y1: -Z.view.ty / Z.view.k, x2: (breite - Z.view.tx) / Z.view.k, y2: (hoehe - Z.view.ty) / Z.view.k};
  }
  function beschriftungenSkalieren(){
    if (!Z.netz) return;
    const k = Z.view.k || 1, s = blockSkala(k), sTxt = s.toFixed(3);
    const knoten = [];
    for (const [id, el] of Z.gEl) {
      const inhalt = el.querySelector ? el.querySelector("[data-inhalt]") : null;
      if (!inhalt) continue;
      inhalt.setAttribute("transform", "scale(" + sTxt + ")");
      const g = Z.netz.geraete[id], p = pos(id);
      if (!g || !p) continue;
      knoten.push({id: id, el: el, g: g, box: nodeBoxWelt(g, p, k)});
    }
    for (const n of knoten) {
      const rolle = n.el.querySelector ? n.el.querySelector(".ger-rolle") : null;
      const adresse = n.el.querySelector ? n.el.querySelector(".ger-ip") : null;
      if (!rolle && !adresse) continue;
      let stoert = false;
      for (const o of knoten) if (o.id !== n.id && labelUeber(n.box, o.box)) { stoert = true; break; }
      if (rolle) rolle.setAttribute("visibility", stoert ? "hidden" : "visible");
      /* Runde 5 (§ 2 D): Die Adresszeile ist ein Zahlenregen, solange sie überall steht. Sie
         erscheint bei Auswahl/Hover (dann ist sie anklickbar und kopiert) und sonst erst ab
         genügender Zoomstufe; in dichten Lagen fällt sie wie die Rolle dem Decluttering zum Opfer.
         Der Name bleibt immer stehen – er ist die Orientierung. */
      if (adresse) {
        const an = n.id === Z.hover || n.id === Z.geraeteHover || Z.auswahlSet.has(n.id);
        adresse.setAttribute("visibility", an || (k >= IP_ZOOM && !stoert) ? "visible" : "hidden");
      }
    }
    Z.nodeBoxen = knoten.map(n => n.box);
    /* Portnamen haben NACHrang: erst nach dem Setzen der Node-Boxen neu prüfen, sonst lagen sie
       (Befund im Bild 18:36) auf den Labels, weil die Kollisionsliste noch leer/alt war. */
    if (typeof kabelEndenAktualisieren === "function") kabelEndenAktualisieren();
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
      if (ebene === "ip") UI.ebenen.zeichneZonen(Z.s.zonen, netz, pos, {masse: zonenMasse, raum: raumWelt()});
      for (const k of netz.kabel) { const el = kabelGruppe(k); Z.kEl.set(k.id, el); Z.s.kabel.append(el); }
      for (const g of Object.values(netz.geraete)) { const el = geraetGruppe(g); Z.gEl.set(g.id, el); Z.s.geraete.append(el); }
      Z.karten = UI.ebenen.zeichneKarten(Z.s.karten, netz, pos, ebene);
      /* Port-LED/Portnamen liegen über den Karten (eigene Ebene) und werden nach den Geräten gebaut;
         Beschriftungen bekommen sofort die Gegenskalierung des aktuellen Zooms (§ 3.4). */
      kabelEndenBauen();
      beschriftungenSkalieren();
      /* Zonen erneut zeichnen: erst jetzt sind Piktogramm+Label-Boxen bekannt (Hülle, Chips).
         Vorher leeren, sonst stünden zwei Zonenlagen übereinander. */
      if (ebene === "ip") { Z.s.zonen.replaceChildren(); UI.ebenen.zeichneZonen(Z.s.zonen, netz, pos, {masse: zonenMasse, raum: raumWelt()}); }
      Z.gemaltKw = kartenMasse().kw;         /* für den Größenwechsel beim Fenster-Resize */
      Z.el.leer.hidden = Object.keys(netz.geraete).length > 0;
      if (Z.hover && !netz.geraete[Z.hover]) Z.hover = null;
      if (Z.kabelHover && !netz.kabel.some(k => k.id === Z.kabelHover)) Z.kabelHover = null;
      if (Z.geraeteHover && !netz.geraete[Z.geraeteHover]) Z.geraeteHover = null;
      F.hoverZeichnen?.();
      /* Reihenfolge: erst Node-Boxen (Beschriftung), dann Portnamen – sonst liegen Portnamen auf Labels. */
      beschriftungenSkalieren();
      kabelEndenAktualisieren();
      F.cursorSetzen?.();          /* neue Geräte bekommen den richtigen Cursor (pointer/grabbing) */
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
  /* Knoten-Groessen (Nutzerentscheidung 30.10.2026, Piktogramm-Stil): Die Geräte sind reine
     Strichzeichnungen ohne Karte, in KONSTANTER Bildschirmgröße. kartenMasse bleibt als grobes
     Layout-Maß für Chips/Minimap; die echten Anker liefert ikonHalbWelt(). */
  const IKON_PX = {internet: 40, router: 40, firewall: 40, switch: 40, server: 32, nas: 32, pc: 28};
  function ikonPx(g){ return IKON_PX[g && g.typ] || 26; }
  /* Welt-Halbkante: der Block skaliert mit s = blockSkala(k) um den Gerätepunkt. */
  function ikonHalbWelt(g, k){ return ikonPx(g) / 2 * blockSkala(k); }
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
    /* Anker liegen auf dem Piktogramm-Rand (Kabel enden am Symbol, nicht mehr an einer unsichtbaren Karte). */
    const ga = Z.netz?.geraete?.[k.a.geraet], gb = Z.netz?.geraete?.[k.b.geraet];
    const ha = ikonHalbWelt(ga || {typ: "pc"}, Z.view.k), hb = ikonHalbWelt(gb || {typ: "pc"}, Z.view.k);
    const ea = randPunkt(a2, b2, {kw: 2 * ha, kh: 2 * ha}) || {x: A.x, y: A.y, seite: "h"};
    const eb = randPunkt(b2, a2, {kw: 2 * hb, kh: 2 * hb}) || {x: B.x, y: B.y, seite: "h"};
    return {ax: ea.x, ay: ea.y, bx: eb.x, by: eb.y, seiteA: ea.seite, seiteB: eb.seite, ux, uy, nx, ny, len};
  }
  /* ---------- Kabel: direkte Gerade, bei Bedarf EIN weicher Knick (Nutzerentscheidung 30.10.2026) ----------
     „Kein Durchhang, einfach natuerlich": Standard ist die direkte Gerade von Port zu Port (Ray-Box-
     Anker, Port-LED). Nur wenn diese Gerade eine FREMDE Karte schneidet, bekommt sie EINEN Knick
     (diagonal erlaubt) mit weichem Radius 10-14. Kein Catmull-Rom-S, keine 90-Grad-Pflicht. Die
     Route wird bei jeder Bewegung neu gerechnet; kabelPunkt() liefert dieselbe Route fuer die
     Paket-/Ping-Animation. */
  const ELBOW_RADIUS = 12, ELBOW_ABSTAND = 56;
  function streckeSchneidetKarte(ax, ay, bx, by, q){
    const dx = bx - ax, dy = by - ay;
    const p = [-dx, dx, -dy, dy];
    const ab = [ax - q.x1, q.x2 - ax, ay - q.y1, q.y2 - ay];
    let t0 = 0, t1 = 1;
    for (let i = 0; i < 4; i++) {
      if (Math.abs(p[i]) < 1e-9) { if (ab[i] < 0) return false; continue; }
      const t = ab[i] / p[i];
      if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
      else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
    return true;
  }
  function kabelBlockiert(ax, ay, bx, by, k){
    if (!Z.netz) return false;
    for (const g of Object.values(Z.netz.geraete)) {
      if (g.id === k.a.geraet || g.id === k.b.geraet) continue;
      const p = pos(g.id); if (!p) continue;
      const h = ikonHalbWelt(g, Z.view.k) + 6;
      const q = {x1: p.x - h, y1: p.y - h, x2: p.x + h, y2: p.y + h};
      if (streckeSchneidetKarte(ax, ay, bx, by, q)) return true;
    }
    return false;
  }
  /* Route: {art:"gerade"} oder {art:"elbow", p:{x,y}, c1:{x,y}, c2:{x,y}}. */
  function kabelRoute(geo, k){
    const {ax, ay, bx, by} = geo;
    if (!k || !kabelBlockiert(ax, ay, bx, by, k)) return {art: "gerade"};
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    let wahl = null, wahlTreffer = 99;
    for (const abst of [ELBOW_ABSTAND, ELBOW_ABSTAND + 40, ELBOW_ABSTAND + 90]) {
      for (const seite of [1, -1]) {
        const p = {x: (ax + bx) / 2 + nx * abst * seite, y: (ay + by) / 2 + ny * abst * seite};
        let treffer = 0;
        if (!Z.netz) treffer = 9;
        else {
          for (const g of Object.values(Z.netz.geraete)) {
            if (g.id === k.a.geraet || g.id === k.b.geraet) continue;
            const q = pos(g.id); if (!q) continue;
            const h = ikonHalbWelt(g, Z.view.k) + 6;
            const rect = {x1: q.x - h, y1: q.y - h, x2: q.x + h, y2: q.y + h};
            if (streckeSchneidetKarte(ax, ay, p.x, p.y, rect)) treffer++;
            if (streckeSchneidetKarte(p.x, p.y, bx, by, rect)) treffer++;
          }
        }
        if (treffer < wahlTreffer) { wahlTreffer = treffer; wahl = p; if (!treffer) break; }
      }
      if (wahlTreffer === 0) break;
    }
    if (!wahl) return {art: "gerade"};
    const l1 = Math.hypot(wahl.x - ax, wahl.y - ay) || 1, l2 = Math.hypot(bx - wahl.x, by - wahl.y) || 1;
    const r = Math.min(ELBOW_RADIUS, l1 / 2, l2 / 2);
    return {art: "elbow", p: wahl,
      c1: {x: wahl.x - (wahl.x - ax) / l1 * r, y: wahl.y - (wahl.y - ay) / l1 * r},
      c2: {x: wahl.x + (bx - wahl.x) / l2 * r, y: wahl.y + (by - wahl.y) / l2 * r}};
  }
  function kabelPfad(geo, k){
    const route = kabelRoute(geo, k);
    if (route.art === "gerade") return `M${geo.ax.toFixed(1)} ${geo.ay.toFixed(1)} L${geo.bx.toFixed(1)} ${geo.by.toFixed(1)}`;
    return `M${geo.ax.toFixed(1)} ${geo.ay.toFixed(1)} L${route.c1.x.toFixed(1)} ${route.c1.y.toFixed(1)} ` +
      `Q${route.p.x.toFixed(1)} ${route.p.y.toFixed(1)} ${route.c2.x.toFixed(1)} ${route.c2.y.toFixed(1)} ` +
      `L${geo.bx.toFixed(1)} ${geo.by.toFixed(1)}`;
  }
  /* Punkt auf der Kabelroute (0 = A-Ende, 1 = B-Ende) – exakt auf dem gezeichneten Pfad. */
  function kabelPunkt(kabel, t){
    const geo = kabelGeo(kabel); if (!geo) return null;
    const route = kabelRoute(geo, kabel);
    const u = Math.max(0, Math.min(1, Number(t) || 0));
    if (route.art === "gerade") return {x: geo.ax + (geo.bx - geo.ax) * u, y: geo.ay + (geo.by - geo.ay) * u};
    /* Elbow: Laengen der drei Stuecke (Quadratik angenaehert), dann nach Bogenlaenge laufen. */
    const a = {x: geo.ax, y: geo.ay}, b = {x: geo.bx, y: geo.by}, p = route.p, c1 = route.c1, c2 = route.c2;
    const stuecke = [];
    const linie = (q, r) => ({art: "linie", q, r, laenge: Math.hypot(r.x - q.x, r.y - q.y)});
    const quadratikPunkte = [];
    for (let i = 0; i <= 16; i++) {
      const s = i / 16, v = 1 - s;
      quadratikPunkte.push({x: v * v * c1.x + 2 * v * s * p.x + s * s * c2.x, y: v * v * c1.y + 2 * v * s * p.y + s * s * c2.y});
    }
    let quadLaenge = 0;
    for (let i = 1; i < quadratikPunkte.length; i++) quadLaenge += Math.hypot(quadratikPunkte[i].x - quadratikPunkte[i - 1].x, quadratikPunkte[i].y - quadratikPunkte[i - 1].y);
    stuecke.push(linie(a, c1), {art: "quad", punkte: quadratikPunkte, laenge: quadLaenge}, linie(c2, b));
    const gesamt = stuecke.reduce((s, st) => s + st.laenge, 0) || 1;
    let rest = u * gesamt;
    for (const st of stuecke) {
      if (rest > st.laenge) { rest -= st.laenge; continue; }
      const q = st.laenge ? rest / st.laenge : 0;
      if (st.art === "linie") return {x: st.q.x + (st.r.x - st.q.x) * q, y: st.q.y + (st.r.y - st.q.y) * q};
      const pos = q * (st.punkte.length - 1), i = Math.min(st.punkte.length - 2, Math.floor(pos)), f = pos - i;
      return {x: st.punkte[i].x + (st.punkte[i + 1].x - st.punkte[i].x) * f, y: st.punkte[i].y + (st.punkte[i + 1].y - st.punkte[i].y) * f};
    }
    return b;
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
    const d = kabelPfad(geo, k);
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
    /* Knoten-Boxen (Piktogramm + Label) haben Vorrang: Portnamen weichen ihnen aus. */
    const karten = (Z.nodeBoxen || []).slice();
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
    /* Grundzeiger ueber einem Geraet: pointer (Vorgabe Nutzer 30.10.2026). editor-werkzeuge.js
       ueberschreibt ihn bei Shift/Marquee/Ziehen; die CSS-Haelfte kann es spaeter uebernehmen. */
    el.style.cursor = "pointer";
    const art = UI.geraeteArt(g.typ, g.skin);
    /* Piktogramm + Label-Block als EIN Block (Nutzerentscheidung 30.10.2026): keine Karte, kein
       Kasten; Position = Zentrum des Piktogramms; Block um den Nullpunkt skaliert (beschriftungenSkalieren). */
    const ikonH = ikonPx(g) / 2;
    /* Beschriftung UNTER dem Piktogramm, zentriert (Nutzerentscheidung 30.10.2026: keine Kästen,
       klare Leserichtung). Breite = LABEL_HALB*2, damit „R-SALON"/„PC-BEHANDLUNG" sicher passen. */
    const boxL = -Math.max(ikonH + 6, LABEL_HALB), boxR = Math.max(ikonH + 6, LABEL_HALB);
    /* boxU trägt seit Runde 5 die dritte Zeile (Adresse) mit Luft: Baselines 18/33/48 unter der
       Piktogramm-Mitte, unten 14 px Reserve für Unterlängen. */
    const boxO = -ikonH - 4, boxU = ikonH + 62, radius = 12;
    const inhalt = sv("g", {});
    inhalt.setAttribute("data-inhalt", "1");
    inhalt.append(sv("rect", {class: "ger-treffer", x: boxL, y: boxO, width: boxR - boxL, height: boxU - boxO, rx: radius}));
    inhalt.append(sv("rect", {class: "ger-auswahl", x: boxL - 6, y: boxO - 6, width: boxR - boxL + 12, height: boxU - boxO + 12, rx: radius + 2}));
    inhalt.append(sv("rect", {class: "ger-karte", x: boxL, y: boxO, width: boxR - boxL, height: boxU - boxO, rx: radius}));
    inhalt.append(sv("g", {class: "ger-bild"}, UI.geraetebild(g.typ, g.skin, {px: ikonPx(g)})));
    const a = UI.ebenen.adresse(netz, g);
    /* Label-Block mittig unter dem Piktogramm: Name (12,5), Rolle (11), Adresse (11).
       Runde 5 (§ 2 D): Zeilenabstand 15 px statt 13 – die Zeilenkästen überlappten sich sonst um
       2–3 px (gemessen im Audit 31.10.2026, neun Paare). line-height 1,15 steht in editor.css. */
    const x0 = 0, yName = ikonH + 18, yRolle = ikonH + 33, yIP = ikonH + 48;
    const t = sv("g", {class: "ger-text"});
    t.append(sv("text", {class: "ger-name", x: x0, y: yName, "text-anchor": "middle", text: g.name}));
    /* Die Rolle erklärt den Zustand und ist NIE leer (Befund B7); sie weicht, wenn Node-Boxen kollidieren. */
    t.append(sv("text", {class: "ger-rolle", x: x0, y: yRolle, "text-anchor": "middle", text: rollenText(netz, g, art)}));
    /* Auf der Fläche steht NUR die erste gültige Adresse („+N" als gedämpfter Zusatz in derselben Zeile);
       alle Adressen mit Schnittstelle stehen im Tooltip. Ohne Adresse gibt es KEIN .ger-ip-Element –
       die Rolle sagt stattdessen „keine Adresse" / „kein Link" / „DHCP – keine Adresse" (Befund B6/B7). */
    const alleAdr = UI.ebenen.alleAdressen(netz, g) || [];
    let ipText = a.ip ? String(a.ip) : "";
    if (ipText && IP.maskeGueltig(a.maske)) ipText += "/" + IP.praefix(a.maske);
    const mehr = alleAdr.length > 1 ? "+" + (alleAdr.length - 1) : "";
    if (ipText) {
      const adr = sv("text", {class: "ger-ip" + (a.gueltig ? "" : " schwach"), x: x0, y: yIP, "text-anchor": "middle"}, ipText);
      if (mehr) adr.append(sv("tspan", {class: "ger-mehr", text: " " + mehr}));
      /* Adresse anklicken = in die Zwischenablage (Wunsch 05.10.2026: „für easy von hand routing").
         Kopiert wird NUR die Adresse ohne Präfix und ohne „+2" – genau das, was man in eine Route tippt.
         WICHTIG (gemessen 05.10.2026): Der Klick hängt am pointerdown, nicht am click – die Fläche ruft
         beim pointerdown setPointerCapture, danach gehen pointerup/mouseup/click ans SVG. */
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
    inhalt.append(t);
    el.append(inhalt);
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
    /* Badges am Piktogramm (Piktogramm-Stil): eigener Block [data-badges], der wie die Labels gegen
       den Zoom skaliert wird – die Positionen sind Bildschirm-Pixel rund um das Symbol. */
    const w = warnungenAn() ? Z.warn.get(g.id) : null;
    const hb = ikonPx(g) / 2, bo = 12;
    const badges = sv("g", {});
    badges.setAttribute("data-badges", "1");
    if (w && w.length) {
      const b = sv("g", {class: "badge badge-warn", transform: "translate(" + (hb + bo) + " " + (-hb - bo) + ")"});
      b.append(sv("circle", {r: 9.5}), sv("path", {d: "M0 -4.5v5M0 3.6v.1"}), sv("title", {text: "Prüfung meldet:\n• " + w.join("\n• ")}));
      badges.append(b);
    }
    if (Modell.ungespeichert(g)) {
      const b = sv("g", {class: "badge badge-ungespeichert", transform: "translate(" + (-hb - bo) + " " + (-hb - bo) + ")"});
      b.append(sv("circle", {r: 5.5}), sv("title", {text: "Ungespeichert: running-config ≠ startup-config.\nNach einem Neustart wäre die Änderung weg (copy running-config startup-config)."}));
      badges.append(b);
    }
    if (!g.an) {
      const b = sv("g", {class: "badge badge-aus", transform: "translate(0 " + (-hb - 22) + ")"});
      b.append(sv("rect", {x: -16, y: -9, width: 32, height: 18, rx: 9}), sv("text", {x: 0, y: 4, "text-anchor": "middle", text: "aus"}));
      badges.append(b);
    }
    if (badges.childNodes.length) inhalt.append(badges);
    /* Hover am Gerät zeigt seine Portnamen auch unter 90 % Zoom (Vertrag § 3.2). */
    if (typeof el.addEventListener === "function") {
      el.addEventListener("pointerenter", () => { Z.geraeteHover = g.id; kabelEndenAktualisieren(); beschriftungenSkalieren(); });
      el.addEventListener("pointerleave", () => { if (Z.geraeteHover === g.id) Z.geraeteHover = null; kabelEndenAktualisieren(); beschriftungenSkalieren(); });
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
    beschriftungenSkalieren();         /* Kollisions-/Hover-Regel folgt der Bewegung */
    /* Zonen wandern LIVE mit (Nutzerwunsch 30.10.2026: „Wenn ein PC aus der Zone geschoben wird, muss
       die Zone sich mit ihm verschieben"): Hülle/Chip während des Ziehens per rAF neu zeichnen. */
    zonenNeu();
    F.hoverZeichnen?.(true);
  }
  /* Fussabdruck eines Geräts (Welt, relativ zur Mitte) für die Zonen-Hülle: das Piktogramm selbst.
     Die Labels bleiben ausserhalb der Hülle – so bleiben die Zonen klein und überschneiden sich nicht. */
  function zonenMasse(id){
    const g = Z.netz && Z.netz.geraete[id], p = pos(id);
    if (!g || !p) return {x1: -12, y1: -24, x2: 120, y2: 24};
    /* Zonen sind stabile Weltflächen: Node-Box bei s=1 (nicht mit dem Zoom wachsend). */
    const b = nodeBoxWelt(g, p, 1);
    return {x1: b.x1 - p.x, y1: b.y1 - p.y, x2: b.x2 - p.x, y2: b.y2 - p.y};
  }
  let zonenGeplant = false;
  function zonenNeu(){
    if (UI.ebenen.aktuell !== "ip" || zonenGeplant) return;
    zonenGeplant = true;
    requestAnimationFrame(() => { zonenGeplant = false; Z.s.zonen.replaceChildren(); UI.ebenen.zeichneZonen(Z.s.zonen, Z.netz, pos, {masse: zonenMasse, raum: raumWelt()}); beschriftungenSkalieren(); });
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
    const vorher = [...Z.auswahlSet].sort().join("|") + "|" + (Z.auswahl?.geraet || "") + ":" + (Z.auswahl?.port || "");
    const gueltig = [];
    for (const id of ids || []) if (Z.netz?.geraete[id] && !gueltig.includes(id)) gueltig.push(id);
    Z.auswahlSet = new Set(gueltig);
    const primaer = o.primaer && Z.auswahlSet.has(o.primaer) ? o.primaer : gueltig[gueltig.length - 1] || null;
    Z.auswahl = primaer ? {geraet: primaer, port: o.port || null} : null;
    if (gueltig.length) { Z.kabelWahl = null; Z.info = null; }
    for (const el of Z.gEl.values()) {
      const an = Z.auswahlSet.has(el.dataset.id);
      el.classList.toggle("gewaehlt", an);
      el.classList.toggle("primaer", an && el.dataset.id === primaer);
    }
    for (const el of Z.kEl.values()) el.classList.toggle("gewaehlt", el.dataset.kabel === Z.kabelWahl);
    kabelEndenAktualisieren();          /* gewählte Geräte zeigen ihre Portnamen auch unter 90 % Zoom */
    beschriftungenSkalieren();          /* Auswahl hebt Labels hervor (Klasse „vorn") */
    const geaendert = vorher !== [...Z.auswahlSet].sort().join("|") + "|" + (Z.auswahl?.geraet || "") + ":" + (Z.auswahl?.port || "");
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
    if (kid) Z.info = {art: "kabel", kid};
    else Z.info = null;                       /* leerer Klick schließt auch den Zonen-Steckbrief */
    for (const el of Z.kEl.values()) el.classList.toggle("gewaehlt", el.dataset.kabel === Z.kabelWahl);
    kabelEndenAktualisieren();
    if (Z.root) inspektorZeigen();          /* Kabel-Infos rechts (Strang D), ohne den Werkzeugmodus zu ändern */
  }
  function inspektorZeigen(){
    const c = Z.el.inspektor; if (!c || !Z.netz) return;
    const id = Z.auswahl?.geraet;
    try {
      if (id) {
        if (typeof UI.inspektor?.zeigen === "function") return UI.inspektor.zeigen(c, Z.netz, id, Z.verlauf, {port: (Z.auswahl && Z.auswahl.port) || null});
        return platzhalterInspektor(c, Z.netz.geraete[id]);
      }
      if (Z.info && Z.info.art === "kabel" && typeof UI.inspektor?.kabel === "function") return UI.inspektor.kabel(c, Z.netz, Z.info.kid);
      if (Z.info && Z.info.art === "zone" && typeof UI.inspektor?.zone === "function") return UI.inspektor.zone(c, Z.netz, Z.info.cidr);
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
  /* Kabel und Zone in den Inspektor holen – von Strang D und vom zentralen Resolver (UI.fehlerziel) genutzt. */
  function zeigeKabel(kid){
    if (!Z.netz || !kid) return;
    kabelWaehlen(kid);
    dockZeigen("inspektor");
    inspektorZeigen();
  }
  function zeigeZone(cidr){
    if (!Z.netz || !cidr) return;
    if (Z.auswahlSet.size || Z.auswahl) auswahlSetzen([]);
    Z.info = {art: "zone", cidr};
    dockZeigen("inspektor");
    inspektorZeigen();
  }
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
    geraetBewegt, zonenNeu, kabelGeo, kabelGruppe, kabelPunkt, auswaehlen, kabelWaehlen, inspektorZeigen, inspektorUmschalten, simUmschalten, simHoeheSetzen,
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
    zeigeKabel, zeigeZone,
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
