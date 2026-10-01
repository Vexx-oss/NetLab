"use strict";
/* ---------- Netz-Editor: Zeiger, Werkzeuge, Menüs, Tastatur ----------
   Nur Zeigerereignisse (kein HTML5-Drag-and-Drop). Wird von UI.labor beim Aufbau eingerichtet:
   UI.laborWerkzeuge.einrichten(Z, F)  (Z = Zustand, F = Helfer aus editor.js)
   Außerdem allgemein nutzbar:
   UI.menue(x, y, eintraege, {titel})  Kontextmenü: eintraege = [{text, sym?, taste?, fn, aus?, gefahr?} | "-"]
   UI.menueZu()                        offenes Menü/Popover schließen */
UI.menue = (() => {
  let offen = null;
  function zu(){ if (offen) { const o = offen; offen = null; o.el.remove(); document.removeEventListener("pointerdown", o.aussen, true); o.zurueck?.focus?.({preventScroll: true}); } }
  function menue(x, y, eintraege, o = {}){
    zu();
    const el = h("div", {class: "menue" + (o.klasse ? " " + o.klasse : ""), role: "menu", "aria-label": o.titel || "Menü"});
    if (o.titel) el.append(h("div", {class: "menue-titel"}, o.titel));
    const knoepfe = [];
    for (const e of eintraege) {
      if (e === "-") { el.append(h("div", {class: "menue-trenner", role: "separator"})); continue; }
      if (!e) continue;
      const b = h("button", {type: "button", role: "menuitem", class: "menue-punkt" + (e.gefahr ? " gefahr" : ""), disabled: !!e.aus, title: e.titel || null,
        onclick: () => { zu(); try { e.fn && e.fn(); } catch (x) { console.error(x); } }},
        e.sym ? UI.symbol(e.sym, 16) : h("span", {class: "menue-leer-sym"}), h("span", {class: "menue-text"}, e.text), e.taste ? h("kbd", {}, e.taste) : null, e.info ? h("span", {class: "menue-info"}, e.info) : null);
      knoepfe.push(b); el.append(b);
    }
    el.addEventListener("keydown", ev => {
      const i = knoepfe.indexOf(document.activeElement);
      const aktiv = knoepfe.filter(b => !b.disabled);
      const j = aktiv.indexOf(document.activeElement);
      if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); zu(); }
      else if (ev.key === "ArrowDown") { ev.preventDefault(); aktiv[(j + 1) % aktiv.length]?.focus(); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); aktiv[(j - 1 + aktiv.length) % aktiv.length]?.focus(); }
      else if (ev.key === "Tab") { ev.preventDefault(); zu(); }
      void i;
    });
    document.body.append(el);
    const r = el.getBoundingClientRect(), W = innerWidth, H = innerHeight;
    el.style.left = Math.max(6, Math.min(x, W - r.width - 6)) + "px";
    el.style.top = Math.max(6, Math.min(y, H - r.height - 6)) + "px";
    const aussen = ev => { if (!el.contains(ev.target)) zu(); };
    offen = {el, aussen, zurueck: document.activeElement};
    setTimeout(() => document.addEventListener("pointerdown", aussen, true), 0);
    (knoepfe.find(b => !b.disabled) || el).focus?.({preventScroll: true});
    return el;
  }
  menue.zu = zu;
  menue.offen = () => !!offen;
  menue.popover = (x, y, inhalt, o = {}) => {
    zu();
    const el = h("div", {class: "menue popover" + (o.klasse ? " " + o.klasse : ""), role: "dialog", "aria-label": o.titel || ""});
    if (o.titel) el.append(h("div", {class: "menue-titel"}, o.titel));
    el.append(inhalt);
    el.addEventListener("keydown", ev => { if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); zu(); } });
    document.body.append(el);
    const r = el.getBoundingClientRect();
    el.style.left = Math.max(6, Math.min(x, innerWidth - r.width - 6)) + "px";
    el.style.top = Math.max(6, Math.min(y, innerHeight - r.height - 6)) + "px";
    const aussen = ev => { if (!el.contains(ev.target)) zu(); };
    offen = {el, aussen, zurueck: document.activeElement};
    setTimeout(() => document.addEventListener("pointerdown", aussen, true), 0);
    el.querySelector("button")?.focus({preventScroll: true});
    return el;
  };
  return menue;
})();
UI.menueZu = () => UI.menue.zu();

UI.laborWerkzeuge = (() => {
  function einrichten(Z, F){
    const svg = Z.svg;
    let G = null;                 /* laufende Geste */
    let rafGeplant = false;

    /* ---------- Trefferbestimmung ---------- */
    function ziel(el){
      const t = el && el.closest ? el.closest("[data-port],[data-griff],[data-id],[data-kabel]") : null;
      if (!t || !svg.contains(t)) return {art: "leer"};
      if (t.dataset.port) return {art: "port", id: t.closest("[data-id]")?.dataset.id, port: t.dataset.port};
      if (t.dataset.griff) return {art: "griff", id: t.closest("[data-id]")?.dataset.id};
      if (t.dataset.id) return {art: "geraet", id: t.dataset.id};
      if (t.dataset.kabel) return {art: "kabel", kabel: t.dataset.kabel};
      return {art: "leer"};
    }
    const zielAn = (x, y) => ziel(document.elementFromPoint(x, y));

    /* ---------- Hover: Port-Punkte und Kabelgriff ---------- */
    function portPanel(id, mitGriff){
      const g = Z.netz.geraete[id], p = F.pos(id); if (!g || !p) return null;
      const grp = sv("g", {class: "ports", "data-id": id, transform: `translate(${p.x} ${p.y})`});
      const ports = Modell.ports(g), n = ports.length;
      const eintrag = (port, cx, cy, r) => {
        const s = Modell.portStatus(Z.netz, id, port), ka = Modell.kabelAn(Z.netz, id, port);
        const gegen = ka ? `${Z.netz.geraete[ka.gegen.geraet]?.name || "?"} ${ka.gegen.port}` : "";
        const c = sv("circle", {class: `pd pd-${s.status}` + (G?.art === "kabel" && G.zielPort === port && G.zielId === id ? " ziel" : ""), cx, cy, r, "data-port": port});
        c.append(sv("title", {text: `${port} – ${ka ? "verbunden mit " + gegen + " (" + (F.STATUS_TEXT[s.status] || s.status) + ")" : "frei"}${ka ? "" : "\nZiehen: Kabel von genau diesem Port"}`}));
        return c;
      };
      if (n <= 4) {
        const ab = 26, x0 = -(n - 1) * ab / 2, y = g.typ === "internet" ? -36 : -44;
        grp.append(sv("rect", {class: "ports-platte", x: x0 - 17, y: y - 21, width: (n - 1) * ab + 34, height: 32, rx: 9}));
        ports.forEach((port, i) => {
          grp.append(sv("text", {class: "pd-name", x: x0 + i * ab, y: y - 9, "text-anchor": "middle", text: port.replace(/^Gi/, "").replace(/^wan/, "w")}));
          grp.append(eintrag(port, x0 + i * ab, y, 5.5));
        });
      } else {
        const proReihe = Math.ceil(n / 2), ab = 11, x0 = -(proReihe - 1) * ab / 2;
        grp.append(sv("rect", {class: "ports-platte", x: x0 - 10, y: -58, width: (proReihe - 1) * ab + 20, height: 27, rx: 8}));
        ports.forEach((port, i) => grp.append(eintrag(port, x0 + (i % proReihe) * ab, i < proReihe ? -51 : -38, 4.3)));
      }
      if (mitGriff) {
        const gr = sv("g", {class: "griff", "data-griff": "1", transform: `translate(${g.typ === "internet" ? 44 : 40} 0)`});
        gr.append(sv("circle", {r: 11}), sv("path", {d: "M-4.5 0h9M0 -4.5v9"}),
          sv("title", {text: "Ziehen, um ein Kabel zu verlegen.\nDer nächste freie passende Port wird gewählt (Shift beim Loslassen: Port aussuchen).\nGerades oder gekreuztes Kabel? Egal – Auto-MDI-X erkennt das selbst."}));
        grp.append(gr);
      }
      return grp;
    }
    function hoverZeichnen(nurPosition){
      if (nurPosition) { for (const el of Z.s.ueber.querySelectorAll(".ports")) { const p = F.pos(el.dataset.id); if (p) el.setAttribute("transform", `translate(${p.x} ${p.y})`); } return; }
      for (const el of [...Z.s.ueber.querySelectorAll(".ports")]) el.remove();
      if (!Z.netz) return;
      const ids = [];
      if (G && (G.art === "kabel") && G.von) ids.push(G.von.geraet);
      if (G && (G.art === "kabel" || G.art === "ping") && G.zielId && !ids.includes(G.zielId)) ids.push(G.zielId);
      if (!G && Z.hover && Z.werkzeug !== "platzieren") ids.push(Z.hover);
      for (const id of ids) {
        if (G?.art === "ping") continue;
        const el = portPanel(id, !G && Z.werkzeug === "auswahl");
        if (el) Z.s.ueber.append(el);
      }
    }
    function hoverSetzen(id){
      if (Z.hover === id) return;
      Z.hover = id || null;
      for (const el of Z.gEl.values()) el.classList.toggle("hover", el.dataset.id === Z.hover);
      hoverZeichnen();
    }

    /* ---------- Gummiband (Kabel/Ping) und Platzier-Vorschau ---------- */
    function bandLeeren(){ Z.s.band.replaceChildren(); }
    function band(von, x, y, art){
      bandLeeren();
      const p = F.pos(von); if (!p) return;
      Z.s.band.append(sv("line", {class: "band band-" + art, x1: p.x, y1: p.y, x2: x, y2: y}));
      if (art === "ping") Z.s.band.append(sv("circle", {class: "band-paket", cx: x, cy: y, r: 7}), sv("text", {class: "band-text", x: x + 12, y: y - 10, text: "ICMP"}));
      else Z.s.band.append(sv("circle", {class: "band-stecker", cx: x, cy: y, r: 6}));
    }
    function vorschau(w){
      bandLeeren();
      if (Z.werkzeug !== "platzieren" || !Z.platz) return;
      const g = sv("g", {class: "vorschau typ-" + Z.platz.typ, transform: `translate(${F.raster(w.x)} ${F.raster(w.y)})`});
      g.append(UI.geraetebild(Z.platz.typ, Z.platz.skin));
      Z.s.band.append(g);
    }

    /* ---------- Zeiger auf der Fläche ---------- */
    svg.addEventListener("pointerdown", e => {
      if (e.button === 2) return;
      UI.menue.zu();
      svg.focus({preventScroll: true});
      const t = ziel(e.target), w = F.weltPunkt(e.clientX, e.clientY);
      const basis = {x0: e.clientX, y0: e.clientY, bewegt: false, pid: e.pointerId};
      if (e.button === 1) { G = {...basis, art: "pan", view: {...Z.view}}; }
      else if (Z.werkzeug === "platzieren" && Z.platz) {
        const pl = Z.platz;
        F.geraetAnlegen(pl.typ, pl.skin, w.x, w.y);
        if (!e.shiftKey) F.werkzeug("auswahl"); else F.werkzeugAnzeigen();
        bandLeeren();
        return;
      }
      else if (Z.werkzeug === "ping" && t.id) G = {...basis, art: "ping", von: t.id};
      else if (Z.werkzeug === "kabel" && t.id) G = {...basis, art: "kabel", von: {geraet: t.id, port: t.art === "port" ? t.port : null}};
      else if (t.art === "port") G = {...basis, art: "kabel", von: {geraet: t.id, port: t.port}, vonPort: true};
      else if (t.art === "griff") G = {...basis, art: "kabel", von: {geraet: t.id, port: null}};
      else if (t.art === "geraet") { const g = Z.netz.geraete[t.id]; G = {...basis, art: "geraet", id: t.id, start: {x: g.x, y: g.y}}; }
      else if (t.art === "kabel") { F.kabelWaehlen(t.kabel); G = {...basis, art: "pan", view: {...Z.view}, kabelKlick: true}; }
      else G = {...basis, art: "pan", view: {...Z.view}};
      try { svg.setPointerCapture(e.pointerId); } catch {}
      if (G.art === "pan") svg.classList.add("greift");
    });
    svg.addEventListener("pointermove", e => {
      if (!G) {
        if (Z.werkzeug === "platzieren") { vorschau(F.weltPunkt(e.clientX, e.clientY)); return; }
        const t = ziel(e.target);
        hoverSetzen(t.id || null);
        return;
      }
      if (e.pointerId !== G.pid) return;
      const dx = e.clientX - G.x0, dy = e.clientY - G.y0;
      if (!G.bewegt && Math.hypot(dx, dy) > 4) {
        G.bewegt = true;
        if (G.art === "geraet") { hoverSetzen(null); svg.classList.add("zieht"); F.auswaehlen(G.id); }
        if (G.art === "kabel" || G.art === "ping") { hoverSetzen(null); hoverZeichnen(); }
      }
      if (!G.bewegt) return;
      G.letzt = e;
      if (rafGeplant) return;
      rafGeplant = true;
      requestAnimationFrame(() => { rafGeplant = false; if (G && G.letzt) bewegen(G.letzt); });
    });
    function bewegen(e){
      const dx = e.clientX - G.x0, dy = e.clientY - G.y0;
      if (G.art === "pan") { Z.eingepasst = false; Z.view.tx = G.view.tx + dx; Z.view.ty = G.view.ty + dy; F.ansichtSetzen(); return; }
      if (G.art === "geraet") {
        const p = {x: F.raster(G.start.x + dx / Z.view.k), y: F.raster(G.start.y + dy / Z.view.k)};
        const alt = Z.pos.get(G.id);
        if (alt && alt.x === p.x && alt.y === p.y) return;
        Z.pos.set(G.id, p);
        F.geraetBewegt(G.id); F.zonenNeu();
        return;
      }
      if (G.art === "kabel" || G.art === "ping") {
        const w = F.weltPunkt(e.clientX, e.clientY);
        const t = zielAn(e.clientX, e.clientY);
        const zielId = t.id && t.id !== (G.von.geraet || G.von) ? t.id : null;
        const zielPort = t.art === "port" ? t.port : null;
        const neu = zielId !== G.zielId || zielPort !== G.zielPort;
        G.zielId = zielId; G.zielPort = zielPort;
        for (const el of Z.gEl.values()) el.classList.toggle("zielt", el.dataset.id === zielId);
        if (neu) hoverZeichnen();
        const zp = zielId ? F.pos(zielId) : null;
        band(G.art === "ping" ? G.von : G.von.geraet, zp && !zielPort ? zp.x : w.x, zp && !zielPort ? zp.y : w.y, G.art);
      }
    }
    function ende(e, abbruch){
      if (!G) return;
      const g = G; G = null;
      svg.classList.remove("greift", "zieht");
      try { svg.releasePointerCapture(g.pid); } catch {}
      for (const el of Z.gEl.values()) el.classList.remove("zielt");
      bandLeeren();
      if (abbruch) { Z.pos.delete(g.id); F.zeichnen(); return; }
      if (g.art === "pan") {
        if (!g.bewegt && !g.kabelKlick) { F.auswaehlen(null); F.kabelWaehlen(null); if (Z.werkzeug === "ping" && Z.pingVon) { Z.pingVon = null; F.werkzeugAnzeigen(); } }
        return;
      }
      if (g.art === "geraet") {
        if (!g.bewegt) { F.auswaehlen(g.id); return; }
        const p = Z.pos.get(g.id);
        Z.pos.delete(g.id);
        const geraet = Z.netz.geraete[g.id];
        if (p && geraet && (p.x !== geraet.x || p.y !== geraet.y)) F.aendern(`${geraet.name} verschoben`, n => { n.geraete[g.id].x = p.x; n.geraete[g.id].y = p.y; });
        else F.zeichnen();
        return;
      }
      if (g.art === "kabel") {
        if (!g.bewegt) {
          if (g.vonPort) F.auswaehlen(g.von.geraet, g.von.port);
          else if (Z.werkzeug === "kabel") F.werkzeugAnzeigen("Ziehen, nicht klicken: vom Gerät bis auf das Zielgerät, dort loslassen.");
          hoverZeichnen();
          return;
        }
        const t = zielAn(e.clientX, e.clientY);
        if (!t.id || t.id === g.von.geraet) { hoverZeichnen(); return; }
        if (t.art === "port") kabelFertig(g.von, {geraet: t.id, port: t.port});
        else if (e.shiftKey) portWahl(t.id, e.clientX, e.clientY, port => kabelFertig(g.von, {geraet: t.id, port}));
        else kabelFertig(g.von, {geraet: t.id});
        return;
      }
      if (g.art === "ping") {
        if (!g.bewegt) {
          if (Z.pingVon && Z.pingVon !== g.von) { const von = Z.pingVon; Z.pingVon = null; F.werkzeugAnzeigen(); F.ping(von, g.von); }
          else { Z.pingVon = g.von; F.werkzeugAnzeigen(); F.hervorheben?.([{geraet: g.von}], 900); }
          return;
        }
        const t = zielAn(e.clientX, e.clientY);
        if (t.id && t.id !== g.von) F.ping(g.von, t.id);
      }
    }
    svg.addEventListener("pointerup", e => { if (G && e.pointerId === G.pid) { if (G.letzt) bewegen(G.letzt); ende(e); } });
    svg.addEventListener("pointercancel", e => { if (G && e.pointerId === G.pid) ende(e, true); });
    svg.addEventListener("pointerleave", () => { if (!G) { hoverSetzen(null); if (Z.werkzeug === "platzieren") bandLeeren(); } });
    svg.addEventListener("lostpointercapture", e => { if (G && e.pointerId === G.pid) ende(e, G.art === "geraet" && !G.bewegt ? false : false); });

    function kabelFertig(a, b){
      const k = F.verbinden(a, b);
      hoverZeichnen();
      if (!k || k.fehler) return;
      const e = store.get("einst", {}) || {};
      if (!e.tipps?.mdix) {
        e.tipps = Object.assign({}, e.tipps, {mdix: true}); store.set("einst", e);
        UI.toast(`${Z.netz.geraete[k.a.geraet].name} ${k.a.port} ↔ ${Z.netz.geraete[k.b.geraet].name} ${k.b.port} verbunden. Gerades oder gekreuztes Kabel musst du nicht wählen: Heutige Ports erkennen das per Auto-MDI-X selbst.`, "ok", {titel: "Kabel verlegt", dauer: 7000});
      }
    }
    function portWahl(id, x, y, fn){
      const g = Z.netz.geraete[id]; if (!g) return;
      UI.menue(x, y, Modell.ports(g).map(p => {
        const ka = Modell.kabelAn(Z.netz, id, p);
        return {text: p, info: ka ? `belegt: ${Z.netz.geraete[ka.gegen.geraet]?.name} ${ka.gegen.port}` : "frei", aus: !!ka, fn: () => fn(p)};
      }), {titel: `Port an ${g.name} wählen`, klasse: "menue-ports"});
    }

    /* ---------- Mausrad: Zoom um den Zeiger ---------- */
    svg.addEventListener("wheel", e => {
      e.preventDefault();
      if (e.shiftKey && !e.ctrlKey) { Z.eingepasst = false; Z.view.tx -= e.deltaY; F.ansichtSetzen(); return; }
      const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      F.zoomUm(Math.exp(-d * (e.ctrlKey ? 0.01 : 0.0016)), e.clientX, e.clientY);
    }, {passive: false});

    /* ---------- Doppelklick: Schnellauswahl bzw. Inspektor ---------- */
    svg.addEventListener("dblclick", e => {
      const t = ziel(e.target);
      if (t.id) { F.auswaehlen(t.id); F.inspektorUmschalten(false); return; }
      if (t.art === "leer") schnellwahl(e.clientX, e.clientY, F.weltPunkt(e.clientX, e.clientY));
    });
    function schnellwahl(x, y, w){
      const raster = h("div", {class: "schnellwahl"},
        UI.GERAETE.map(a => h("button", {type: "button", class: "sw-teil typ-" + a.typ, title: a.text,
          onclick: () => { UI.menue.zu(); F.geraetAnlegen(a.typ, a.skin, w.x, w.y); }},
          sv("svg", {viewBox: "-34 -30 68 60", width: 40, height: 35, "aria-hidden": "true"}, UI.geraetebild(a.typ, a.skin)), h("span", {}, a.titel))));
      raster.addEventListener("keydown", ev => {
        const b = [...raster.querySelectorAll("button")], i = b.indexOf(document.activeElement);
        const d = {ArrowRight: 1, ArrowLeft: -1, ArrowDown: 4, ArrowUp: -4}[ev.key];
        if (d != null && i >= 0) { ev.preventDefault(); b[Math.max(0, Math.min(b.length - 1, i + d))].focus(); }
      });
      UI.menue.popover(x - 20, y - 20, raster, {titel: "Gerät hier einsetzen"});
    }

    /* ---------- Rechtsklick-Menü ---------- */
    svg.addEventListener("contextmenu", e => {
      e.preventDefault();
      const t = ziel(e.target), netz = Z.netz;
      if (t.id) {
        const g = netz.geraete[t.id]; F.auswaehlen(t.id);
        const unges = Modell.ungespeichert(g);
        UI.menue(e.clientX, e.clientY, [
          {text: "Konsole öffnen", sym: "konsole", taste: "C", fn: () => F.konsole(t.id), aus: g.typ === "internet"},
          {text: "Ping von hier …", sym: "ping", fn: () => { F.werkzeug("ping", {von: t.id}); }},
          "-",
          {text: g.an ? "Ausschalten" : "Einschalten", sym: "strom", fn: () => strom(t.id)},
          {text: "Neustart", sym: "neustart", fn: () => neustart(t.id), info: unges ? "ungespeichert!" : null},
          "-",
          {text: "Löschen", sym: "loeschen", taste: "Entf", gefahr: true, fn: () => F.loeschen(t.id)},
        ], {titel: g.name});
      } else if (t.art === "kabel") {
        F.kabelWaehlen(t.kabel);
        UI.menue(e.clientX, e.clientY, [{text: "Kabel trennen", sym: "trennen", taste: "Entf", gefahr: true, fn: () => F.kabelTrennen(t.kabel)}], {titel: "Kabel"});
      } else {
        const w = F.weltPunkt(e.clientX, e.clientY);
        UI.menue(e.clientX, e.clientY, [
          {text: "Gerät hier einsetzen …", sym: "plus", fn: () => schnellwahl(e.clientX, e.clientY, w)},
          {text: "Aufräumen", sym: "aufraeumen", taste: "A", fn: () => F.aufraeumen()},
          {text: "Alles einpassen", sym: "einpassen", taste: "F", fn: () => F.einpassen(true)},
          "-",
          {text: "Rückgängig", sym: "zurueck", taste: "Strg+Z", aus: !Z.verlauf?.kannZurueck, fn: () => F.rueckgaengig()},
          {text: "Wiederholen", sym: "vor", taste: "Strg+Y", aus: !Z.verlauf?.kannVor, fn: () => F.wiederholen()},
        ]);
      }
    });
    function strom(id){
      const g = Z.netz.geraete[id]; if (!g) return;
      const an = !g.an;
      F.aendern(`${g.name} ${an ? "eingeschaltet" : "ausgeschaltet"}`, n => Modell.geraetSetzen(n, id, "an", an));
      try { UI.konsole?.zuruecksetzen?.(Z.netz, id, an ? null : `${g.name} wurde ausgeschaltet.`); } catch (e) { console.error(e); }
    }
    function neustart(id){
      const g = Z.netz.geraete[id]; if (!g) return;
      const verliert = Modell.ungespeichert(g);
      F.aendern(`${g.name} neu gestartet`, n => Modell.neustart(n, id));
      try { UI.konsole?.zuruecksetzen?.(Z.netz, id, `${g.name} wurde neu gestartet.`); } catch (e) { console.error(e); }
      if (verliert) UI.toast(`${g.name} neu gestartet: Die ungespeicherten Änderungen sind weg – nach dem Start gilt die startup-config. Speichern geht mit „copy running-config startup-config“.`, "warn",
        {titel: "Neustart", aktion: {text: "Rückgängig", fn: F.rueckgaengig}});
      else UI.toast(`${g.name} neu gestartet.`, "info", {dauer: 2500});
    }
    F.strom = strom; F.neustart = neustart;

    /* ---------- Geräteleiste: ziehen oder anklicken ---------- */
    Z.el.geraete.addEventListener("pointerdown", e => {
      const b = e.target.closest(".lb-teil"); if (!b || e.button !== 0) return;
      e.preventDefault();
      const platz = {typ: b.dataset.typ, skin: b.dataset.skin || null};
      let geist = null, bewegt = false;
      const x0 = e.clientX, y0 = e.clientY;
      const mv = ev => {
        if (!bewegt && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 5) {
          bewegt = true;
          geist = h("div", {class: "lb-geist typ-" + platz.typ}, sv("svg", {viewBox: "-34 -30 68 60", width: 64, height: 56}, UI.geraetebild(platz.typ, platz.skin)));
          document.body.append(geist);
        }
        if (geist) {
          geist.style.transform = `translate(${ev.clientX - 32}px, ${ev.clientY - 28}px)`;
          const r = svg.getBoundingClientRect(), drin = ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom;
          geist.classList.toggle("drin", drin);
        }
      };
      const up = ev => {
        document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up); document.removeEventListener("pointercancel", up);
        geist?.remove();
        if (!bewegt) {
          if (Z.werkzeug === "platzieren" && Z.platz && Z.platz.typ === platz.typ && Z.platz.skin === platz.skin) F.werkzeug("auswahl");
          else { F.werkzeug("platzieren", {platz}); }
          return;
        }
        if (ev.type === "pointercancel") return;
        const r = svg.getBoundingClientRect();
        if (ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom) {
          const w = F.weltPunkt(ev.clientX, ev.clientY);
          F.geraetAnlegen(platz.typ, platz.skin, w.x, w.y);
        }
      };
      document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up); document.addEventListener("pointercancel", up);
    });
    Z.el.geraete.addEventListener("keydown", e => {
      const b = e.target.closest(".lb-teil"); if (!b || (e.key !== "Enter" && e.key !== " ")) return;
      e.preventDefault();
      /* Tastatur: in der Mitte der sichtbaren Fläche einsetzen */
      const r = svg.getBoundingClientRect(), w = F.weltPunkt(r.left + r.width / 2, r.top + r.height / 2);
      F.geraetAnlegen(b.dataset.typ, b.dataset.skin || null, w.x, w.y);
    });

    /* ---------- Simulation: Höhe ziehen ---------- */
    Z.el.simGriff.addEventListener("pointerdown", e => {
      if (Z.simZu) return;
      e.preventDefault();
      const y0 = e.clientY, h0 = Z.simHoehe;
      Z.el.simGriff.setPointerCapture(e.pointerId);
      Z.root.classList.add("sim-zieht");
      const mv = ev => F.simHoeheSetzen(h0 - (ev.clientY - y0));
      const up = ev => { Z.el.simGriff.removeEventListener("pointermove", mv); Z.el.simGriff.removeEventListener("pointerup", up); Z.root.classList.remove("sim-zieht"); F.simHoeheSetzen(h0 - (ev.clientY - y0), true); };
      Z.el.simGriff.addEventListener("pointermove", mv); Z.el.simGriff.addEventListener("pointerup", up);
    });

    /* ---------- Tastatur (von UI.app weitergereicht, nie in Eingabefeldern) ---------- */
    function taste(e){
      const strg = e.ctrlKey || e.metaKey, k = e.key;
      if (strg && !e.altKey) {
        if (k === "z" || k === "Z") { e.shiftKey ? F.wiederholen() : F.rueckgaengig(); return true; }
        if (k === "y" || k === "Y") { F.wiederholen(); return true; }
        return false;
      }
      if (e.altKey) return false;
      const sel = Z.auswahl?.geraet;
      switch (k) {
        case "Escape":
          if (UI.menue.offen()) { UI.menue.zu(); return true; }
          if (G) { ende(e, true); return true; }
          if (Z.werkzeug !== "auswahl") { F.werkzeug("auswahl"); return true; }
          if (Z.auswahl || Z.kabelWahl) { F.auswaehlen(null); F.kabelWaehlen(null); return true; }
          return false;
        case "v": case "V": F.werkzeug("auswahl"); return true;
        case "k": case "K": F.werkzeug(Z.werkzeug === "kabel" ? "auswahl" : "kabel"); return true;
        case "p": case "P": F.werkzeug(Z.werkzeug === "ping" ? "auswahl" : "ping", sel ? {von: sel} : {}); return true;
        case "f": case "F": F.einpassen(true); return true;
        case "a": case "A": F.aufraeumen(); return true;
        case "c": case "C": if (sel) { F.konsole(sel); return true; } return false;
        case "i": case "I": F.inspektorUmschalten(); return true;
        case "s": case "S": F.simUmschalten(); return true;
        case "+": case "=": F.zoomSchritt(1.25); return true;
        case "-": F.zoomSchritt(1 / 1.25); return true;
        case "0": F.ansichtAnimieren({...Z.view, k: 1}); return true;
        case "Delete": case "Backspace":
          if (sel) { F.loeschen(sel); return true; }
          if (Z.kabelWahl) { F.kabelTrennen(Z.kabelWahl); Z.kabelWahl = null; return true; }
          return false;
        case "Enter": if (sel) { F.inspektorUmschalten(false); return true; } return false;
        case "ArrowLeft": case "ArrowRight": case "ArrowUp": case "ArrowDown": {
          const dx = k === "ArrowLeft" ? -1 : k === "ArrowRight" ? 1 : 0, dy = k === "ArrowUp" ? -1 : k === "ArrowDown" ? 1 : 0;
          if (sel) {
            const g = Z.netz.geraete[sel], s = e.shiftKey ? 100 : 20;
            F.aendern(`${g.name} verschoben`, n => { n.geraete[sel].x = F.raster(g.x + dx * s); n.geraete[sel].y = F.raster(g.y + dy * s); });
          } else { Z.eingepasst = false; Z.view.tx -= dx * 80; Z.view.ty -= dy * 80; F.ansichtSetzen(); }
          return true;
        }
      }
      if (/^[1-5]$/.test(k)) { UI.ebenen.setzen(UI.ebenen.LISTE[+k - 1].id); return true; }
      return false;
    }

    Object.assign(F, {hoverZeichnen, bandLeeren, taste, schnellwahl, portWahl});
  }
  return {einrichten};
})();
