"use strict";
/* ---------- Netz-Editor: die Labor-Ansicht (Konzept § 7 „Fläche“, Architektur § 9) ----------
   UI.labor = { netz, verlauf, auswahl:{geraet, port}|null,
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
    auswahl: null, kabelWahl: null,
    werkzeug: "auswahl", platz: null, pingVon: null,
    gEl: new Map(), kEl: new Map(), karten: new Map(), versatz: new Map(),
    warn: new Map(), ohne: new Set(),
    pos: new Map(),              /* id → {x, y} während Ziehen/Animation (überschreibt das Modell nur optisch) */
    hover: null, geplant: false, einpassenAusstehend: true,
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
    Z.inspWartet = Z.inspWartet ?? true; Z.simWartet = Z.simWartet ?? true;
    Z.dock ||= {reiter: "inspektor", zu: false}; Z.dockDa ||= {};

    /* Geräteleiste: vier Kategorien, Klick öffnet ein Fach (editor-fach.js) */
    const leiste = h("aside", {class: "lb-geraete", "aria-label": "Geräte"});
    Z.el.geraete = leiste;

    /* Fläche */
    Z.svg = sv("svg", {class: "lb-svg", tabindex: "0", role: "application", "aria-label": "Netz-Zeichenfläche. Pfeiltasten verschieben die Ansicht, F passt ein, Fragezeichen zeigt alle Tasten."});
    const defs = sv("defs", {},
      sv("pattern", {id: "lb-raster", width: RASTER, height: RASTER, patternUnits: "userSpaceOnUse"},
        sv("circle", {cx: 0, cy: 0, r: 1.1, class: "lb-raster-punkt"}), sv("circle", {cx: RASTER, cy: 0, r: 1.1, class: "lb-raster-punkt"}),
        sv("circle", {cx: 0, cy: RASTER, r: 1.1, class: "lb-raster-punkt"}), sv("circle", {cx: RASTER, cy: RASTER, r: 1.1, class: "lb-raster-punkt"})));
    Z.raster = sv("rect", {class: "lb-raster", x: 0, y: 0, width: "100%", height: "100%", fill: "url(#lb-raster)"});
    Z.welt = sv("g", {class: "lb-welt"});
    for (const n of ["zonen", "kabel", "geraete", "karten", "ueber", "pakete", "band"]) Z.welt.append(Z.s[n] = sv("g", {class: "lb-s-" + n}));
    Z.svg.append(defs, Z.raster, Z.welt);

    Z.el.ansicht = h("button", {type: "button", class: "lb-ansicht", "aria-haspopup": "menu", title: "Ansicht: welche Ebene die Fläche zeigt (Umschalt+1 … 5)",
      onclick: e => ansichtMenue(e.currentTarget)}, UI.symbol("ebenen", 17), h("span", {class: "lb-ansicht-text"}), UI.symbol("pfeilUnten", 14));
    const wz = (name, sym, titel) => h("button", {type: "button", class: "lb-wz", "data-wz": name, title: titel, "aria-label": titel,
      onclick: () => werkzeug(name)}, UI.symbol(sym, 19));
    const knopf = (sym, titel, fn, cls = "") => h("button", {type: "button", class: "lb-knopf " + cls, title: titel, "aria-label": titel, onclick: fn}, UI.symbol(sym, 18));
    Z.el.zurueck = knopf("zurueck", "Rückgängig (Strg+Z)", () => rueckgaengig());
    Z.el.vor = knopf("vor", "Wiederholen (Strg+Y)", () => wiederholen());
    Z.el.zoomText = h("button", {type: "button", class: "lb-zoomtext", "aria-haspopup": "menu", title: "Zoom und Anordnung (Mausrad zoomt, F passt ein)",
      onclick: e => zoomMenue(e.currentTarget)}, "100 %");
    Z.el.ansichtGruppe = h("div", {class: "lb-gruppe"}, Z.el.ansicht);
    Z.el.verlaufGruppe = h("div", {class: "lb-gruppe", hidden: true}, Z.el.zurueck, Z.el.vor);   /* erst sichtbar, wenn es etwas rückgängig zu machen gibt */
    const oben = h("div", {class: "lb-leiste-oben"},
      h("div", {class: "lb-gruppe lb-werkzeuge", role: "toolbar", "aria-label": "Werkzeuge"},
        wz("auswahl", "zeiger", "Auswählen und verschieben (V)"), wz("kabel", "kabel", "Kabel verlegen (K): vom Gerät zum Gerät ziehen"), wz("ping", "ping", "Ping-Werkzeug (P): von Gerät A auf Gerät B ziehen")),
      Z.el.ansichtGruppe,
      h("div", {class: "lb-luecke"}),
      Z.el.verlaufGruppe);
    const unten = h("div", {class: "lb-leiste-unten"}, h("div", {class: "lb-gruppe"}, Z.el.zoomText));
    Z.el.hinweis = h("div", {class: "lb-hinweis", "aria-live": "polite"});
    Z.el.leer = h("div", {class: "lb-leer", hidden: true},
      h("strong", {}, "Die Fläche ist leer."),
      h("p", {}, "Öffne links ein Fach und zieh ein Gerät hierher – oder doppelklicke auf die Fläche."));
    /* Fernwartung (E1): Die Fläche ist verdeckt – man sieht nur, was die Befehle des einen Rechners zeigen */
    Z.el.fern = h("div", {class: "lb-fern-schild", hidden: true});
    Z.el.blatt = h("div", {class: "lb-blatt", hidden: true});                 /* Arbeitsblatt statt Fläche (E1: Adressplan) */
    const leinwand = h("div", {class: "lb-leinwand"}, Z.svg, oben, unten, Z.el.hinweis, Z.el.leer, Z.el.fern, Z.el.blatt);
    Z.el.leinwand = leinwand;

    /* Dock rechts (K1): Inspektor · Simulation · Plan · Akte in EINEM Bereich mit Reitern – die Fläche behält die volle Höhe
       und ≥ 60 % der Breite (CSS: clamp(250px, 40 % − 88px, 440px)). Die Simulation liegt nicht mehr unten. */
    Z.el.dockReiter = h("div", {class: "lb-dock-reiter", role: "tablist", "aria-label": "Dock"});
    Z.el.dockInhalt = h("div", {class: "lb-dock-inhalt"}, Z.el.inspektor, Z.el.sim, Z.el.terminal, Z.el.plan, Z.el.akte);
    Z.el.dock = h("aside", {class: "lb-dock", "aria-label": "Dock"}, Z.el.dockReiter, Z.el.dockInhalt);

    const mitte = h("div", {class: "lb-mitte"}, Z.el.auftrag, leinwand);
    Z.root.append(leiste, mitte, Z.el.dock);
    container.replaceChildren(Z.root);

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
    Z.el.dockReiter.replaceChildren(...da.map(r => {
      const an = !Z.dock.zu && r.id === Z.dock.reiter, z = Z.dockZahl?.[r.id];
      return h("button", {type: "button", role: "tab", class: "lb-dock-tab" + (an ? " an" : ""), "data-reiter": r.id, "aria-selected": String(an),
        title: an ? `${r.titel} einklappen` : r.titel, onclick: () => an ? dockZu() : dockZeigen(r.id)},
        UI.symbol(r.symbol, 17), h("span", {class: "lb-dock-titel"}, r.titel), z ? h("b", {class: "lb-dock-zahl"}, z > 99 ? "99+" : String(z)) : null);
    }), da.length && !Z.dock.zu ? h("button", {type: "button", class: "lb-dock-einklappen", title: "Dock einklappen", "aria-label": "Dock einklappen", onclick: () => dockZu()}, UI.symbol("pfeil", 16)) : null);
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
    Z.svg?.classList.toggle("klein", k < 0.6);
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
  function ansichtAnimieren(ziel, ms = 260){
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
    const extra = UI.ebenen.aktuell === "mac" || UI.ebenen.aktuell === "routen" ? 190 : 0;
    return {x1: x1 - 80, y1: y1 - 80, x2: x2 + 80 + extra, y2: y2 + 90};
  }
  function einpassen(animiert = true){
    if (!Z.svg) return;
    const r = Z.svg.getBoundingClientRect(), b = grenzen();
    if (!r.width || !r.height) { Z.einpassenAusstehend = true; return; }
    let ziel;
    if (!b) ziel = {k: 1, tx: r.width / 2 - 400, ty: r.height / 2 - 260};
    else {
      /* Ränder für die schwebenden Leisten oben/unten – auf niedriger Fläche (Hilfe/Simulation offen) anteilig kleiner */
      const randOben = Math.min(64, Math.round(r.height * 0.13)), randUnten = Math.min(84, Math.round(r.height * 0.15));
      const bw = b.x2 - b.x1, bh = b.y2 - b.y1, hNutz = Math.max(100, r.height - randOben - randUnten);
      const k = klemme(Math.min((r.width - 40) / bw, hNutz / bh), 0.25, 1.1);
      ziel = {k, tx: (r.width - bw * k) / 2 - b.x1 * k, ty: randOben + (hNutz - bh * k) / 2 - b.y1 * k};
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
  function zeichnen(){
    if (!Z.svg || !Z.netz || !Z.root?.isConnected) return;
    const netz = Z.netz, ebene = UI.ebenen.aktuell;
    Z.root.dataset.ebene = ebene;
    const eb = UI.ebenen.LISTE.find(l => l.id === ebene), et = Z.el.ansicht?.querySelector(".lb-ansicht-text");
    if (et) et.textContent = eb ? eb.name : ebene;
    Z.warn = new Map();
    try { for (const w of Modell.pruefen(netz)) { if (!Z.warn.has(w.geraet)) Z.warn.set(w.geraet, []); const l = Z.warn.get(w.geraet); if (!l.includes(w.text)) l.push(w.text); } }
    catch (e) { console.error("Modell.pruefen", e); }
    Z.ohne = UI.ebenen.zonen(netz).ohne;
    versatzBerechnen();
    for (const n of ["zonen", "kabel", "geraete", "karten"]) Z.s[n].replaceChildren();
    Z.gEl.clear(); Z.kEl.clear();
    if (ebene === "ip") UI.ebenen.zeichneZonen(Z.s.zonen, netz, pos);
    for (const k of netz.kabel) { const el = kabelGruppe(k); Z.kEl.set(k.id, el); Z.s.kabel.append(el); }
    for (const g of Object.values(netz.geraete)) { const el = geraetGruppe(g); Z.gEl.set(g.id, el); Z.s.geraete.append(el); }
    Z.karten = UI.ebenen.zeichneKarten(Z.s.karten, netz, pos, ebene);
    Z.el.leer.hidden = Object.keys(netz.geraete).length > 0;
    if (Z.hover && !netz.geraete[Z.hover]) Z.hover = null;
    F.hoverZeichnen?.();
    knoepfeAktualisieren();
  }
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
  function kabelGeo(k){
    const A = pos(k.a.geraet), B = pos(k.b.geraet); if (!A || !B) return null;
    const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const off = Z.versatz.get(k.id) || 0;
    return {ax: A.x + nx * off, ay: A.y + ny * off, bx: B.x + nx * off, by: B.y + ny * off, ux, uy, nx, ny, len};
  }
  function statusSymbol(x, y, status, titel){
    const g = sv("g", {class: "ps ps-" + status});
    g.append(sv("circle", {class: "ps-grund", cx: x, cy: y, r: 7.5}));
    if (status === "oben") g.append(sv("path", {d: `M${x - 4.5} ${y + 3.5}L${x} ${y - 4.5}L${x + 4.5} ${y + 3.5}Z`}));
    else if (status === "unten") g.append(sv("path", {d: `M${x - 4.5} ${y - 3.5}L${x} ${y + 4.5}L${x + 4.5} ${y - 3.5}Z`}));
    else g.append(sv("rect", {x: x - 3.6, y: y - 3.6, width: 7.2, height: 7.2, rx: 1}));
    g.append(sv("title", {text: titel}));
    return g;
  }
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
    const {ax, ay, bx, by, ux, uy, nx, ny, len} = geo;
    const na = netz.geraete[k.a.geraet]?.name || k.a.geraet, nb = netz.geraete[k.b.geraet]?.name || k.b.geraet;
    const grund = (sa.status !== "oben" ? sa : sb).grund;
    const titel = `${na} ${k.a.port} ↔ ${nb} ${k.b.port}\n${klasse === "oben" ? "Link oben" : (klasse === "aus" ? "Port abgeschaltet" : "Link unten") + (grund ? ": " + grundText(grund) : "")}` +
      (trunk ? `\nTrunk (802.1Q), erlaubt: ${UI.ebenen.erlaubtText((va?.art === "trunk" ? va : vb).erlaubt)}` : "");
    g.append(sv("line", {class: "kabel-treffer", x1: ax, y1: ay, x2: bx, y2: by}, sv("title", {text: titel + "\nKlicken zum Auswählen, Entf trennt."})));
    if (trunk) {
      g.append(sv("line", {class: "kabel-trunk-aussen", x1: ax, y1: ay, x2: bx, y2: by}));
      g.append(sv("line", {class: "kabel-trunk-innen", x1: ax, y1: ay, x2: bx, y2: by}));
    } else g.append(sv("line", {class: "kabel-linie", x1: ax, y1: ay, x2: bx, y2: by}));
    /* Enden: Statussymbol + Portname. Verlässt das Kabel das Gerät nach unten, beginnt es unter der Beschriftung. */
    const ende = (x, y, s, richtung, port, titelPort) => {
      const abwaerts = uy * richtung > 0.45;
      const basis = abwaerts ? 66 : 38;
      const dSym = Math.min(basis + 8, len * 0.36), dTxt = Math.min(basis + 24, len * 0.46);
      g.append(statusSymbol(x + ux * dSym * richtung, y + uy * dSym * richtung, s.status, `${titelPort}: ${STATUS_TEXT[s.status] || s.status}${s.grund && s.status !== "oben" ? " – " + grundText(s.grund) : ""}`));
      const ox = nx * 9, oy = ny * 9, senkrecht = Math.abs(ux) < 0.55;
      const tx = x + ux * dTxt * richtung + ox, ty = y + uy * dTxt * richtung + oy + 3.5;
      g.append(sv("text", {class: "kabel-port", x: tx.toFixed(1), y: ty.toFixed(1), "text-anchor": senkrecht ? (ox >= 0 ? "start" : "end") : "middle", text: port}));
    };
    ende(ax, ay, sa, 1, k.a.port, `${na} ${k.a.port}`);
    ende(bx, by, sb, -1, k.b.port, `${nb} ${k.b.port}`);
    /* VLAN-Schilder an Switch-Ports */
    if (ebene === "vlan") {
      const beide = !!(va && vb);
      const schild = (x, y, v, richtung) => {
        if (!v) return;
        const d = len * (beide ? 0.34 : 0.5), cx = x + ux * d * richtung, cy = y + uy * d * richtung;
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
  function geraetGruppe(g){
    const p = pos(g.id), netz = Z.netz;
    const klassen = ["ger", "typ-" + g.typ];
    if (!g.an) klassen.push("aus");
    if (Z.auswahl?.geraet === g.id) klassen.push("gewaehlt");
    if (UI.ebenen.aktuell === "ip" && Z.ohne.has(g.id)) klassen.push("ohne-ip");
    const el = sv("g", {class: klassen.join(" "), "data-id": g.id, transform: `translate(${p.x} ${p.y})`});
    const art = UI.geraeteArt(g.typ, g.skin);
    el.append(sv("rect", {class: "ger-treffer", x: -34, y: -32, width: 68, height: 64, rx: 14}));
    el.append(sv("circle", {class: "ger-auswahl", cx: 0, cy: 0, r: 38}));
    el.append(UI.geraetebild(g.typ, g.skin));
    const a = UI.ebenen.adresse(netz, g);
    el.append(sv("text", {class: "ger-name", x: 0, y: g.typ === "internet" ? 38 : 44, "text-anchor": "middle", text: g.name}));
    if (a.text) el.append(sv("text", {class: "ger-ip" + (a.gueltig || !a.ip && g.typ === "switch" ? "" : " schwach"), x: 0, y: g.typ === "internet" ? 52 : 58, "text-anchor": "middle", text: a.text}));
    el.append(sv("title", {text: `${g.name} – ${art.titel}${g.an ? "" : " (ausgeschaltet)"}\n${a.text || ""}\nZiehen = verschieben · Doppelklick = Inspektor · Rechtsklick = Menü`.trim()}));
    const w = warnungenAn() ? Z.warn.get(g.id) : null;
    if (w && w.length) {
      const b = sv("g", {class: "badge badge-warn", transform: "translate(24 -24)"});
      b.append(sv("circle", {r: 9.5}), sv("path", {d: "M0 -4.5v5M0 3.6v.1"}), sv("title", {text: "Prüfung meldet:\n• " + w.join("\n• ")}));
      el.append(b);
    }
    if (Modell.ungespeichert(g)) {
      const b = sv("g", {class: "badge badge-ungespeichert", transform: "translate(-24 -24)"});
      b.append(sv("circle", {r: 5.5}), sv("title", {text: "Ungespeichert: running-config ≠ startup-config.\nNach einem Neustart wäre die Änderung weg (copy running-config startup-config)."}));
      el.append(b);
    }
    if (!g.an) {
      const b = sv("g", {class: "badge badge-aus", transform: "translate(0 -34)"});
      b.append(sv("rect", {x: -16, y: -9, width: 32, height: 18, rx: 9}), sv("text", {x: 0, y: 4, "text-anchor": "middle", text: "aus"}));
      el.append(b);
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
    F.hoverZeichnen?.(true);
  }
  let zonenGeplant = false;
  function zonenNeu(){
    if (UI.ebenen.aktuell !== "ip" || zonenGeplant) return;
    zonenGeplant = true;
    requestAnimationFrame(() => { zonenGeplant = false; Z.s.zonen.replaceChildren(); UI.ebenen.zeichneZonen(Z.s.zonen, Z.netz, pos); });
  }

  /* ---------- Auswahl, Inspektor ---------- */
  function auswaehlen(id, port){
    if (id && !Z.netz?.geraete[id]) id = null;
    const alt = Z.auswahl?.geraet || null;
    Z.auswahl = id ? {geraet: id, port: port || null} : null;
    if (id) Z.kabelWahl = null;
    for (const el of Z.gEl.values()) el.classList.toggle("gewaehlt", el.dataset.id === id);
    for (const el of Z.kEl.values()) el.classList.toggle("gewaehlt", el.dataset.kabel === Z.kabelWahl);
    Bus.senden("auswahl", {geraet: id || null, port: port || null});
    if (alt !== id) inspektorZeigen();
    /* Auswahl zeigt den Inspektor – außer Plan oder Akte sind gerade offen (dort gehört die Auswahl zum Vergleich) */
    if (id && alt !== id && !(dockOffen("plan") || dockOffen("akte"))) dockZeigen("inspektor");
    else if (id && Z.inspWartet) { Z.inspWartet = false; layoutAnwenden(); }
  }
  function kabelWaehlen(kid){
    Z.kabelWahl = kid || null;
    if (kid && Z.auswahl) auswaehlen(null);
    for (const el of Z.kEl.values()) el.classList.toggle("gewaehlt", el.dataset.kabel === Z.kabelWahl);
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
    const t0 = performance.now(), MS = 520;
    const schritt = t => {
      if (!Z.root?.isConnected) return fertig();
      const p = Math.min(1, (t - t0) / MS), e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      for (const id of ids) Z.pos.set(id, {x: start[id].x + (ziel[id].x - start[id].x) * e, y: start[id].y + (ziel[id].y - start[id].y) * e});
      for (const id of ids) { const el = Z.gEl.get(id), q = Z.pos.get(id); el?.setAttribute("transform", `translate(${q.x} ${q.y})`); }
      for (const k of netz.kabel) { const neu = kabelGruppe(k), altEl = Z.kEl.get(k.id); if (altEl) altEl.replaceWith(neu); Z.kEl.set(k.id, neu); }
      if (Z.karten.size) UI.ebenen.platzieren(Z.karten, pos);
      zonenNeu();
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
    Z.auswahl = null; Z.kabelWahl = null; Z.pos.clear(); Z.hover = null; Z.pingVon = null;
    if (Z.werkzeug !== "auswahl") Z.werkzeug = "auswahl";
    Z.einpassenAusstehend = true;
    Z.inspWartet = true; Z.simWartet = true; Z.simZu = true;
    Z.dock = {reiter: "inspektor", zu: false}; Z.dockDa = {}; Z.dockZahl = {};
    F.fachZu?.();
    UI.ebenen.setzen(opt.ebene || UI.ebenen.gemerkt(), {merken: false});
    if (Z.el.ansichtGruppe) Z.el.ansichtGruppe.hidden = opt.ansichtMenue === false;
    fernwartung(opt.fernwartung && netz.geraete[opt.fernwartung] ? opt.fernwartung : null);
    blatt(typeof opt.blatt === "function" ? opt.blatt : null);
    if (Z.root?.isConnected) {
      layoutAnwenden(); auftragZeichnen(); werkzeugAnzeigen(); zeichnen(); inspektorZeigen(); simLeer();
      requestAnimationFrame(() => { einpassen(false); Z.einpassenAusstehend = false; });
    }
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
    grundText, layoutAnwenden, STATUS_TEXT, zoomSchritt, dockZeigen, dockZu, dockOffen, dockReiter});

  const api = {
    get netz(){ return Z.netz; },
    get verlauf(){ return Z.verlauf; },
    get auswahl(){ return Z.auswahl ? {...Z.auswahl} : null; },
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
