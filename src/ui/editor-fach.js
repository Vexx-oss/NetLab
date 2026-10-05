"use strict";
/* ---------- Geräte-Fächer (Ausbau 1.2, A1): schmale Leiste mit Kategorien, ein Klick öffnet das Fach daneben ----------
   UI.laborFach.einrichten(Z, F) baut die Leiste in Z.el.geraete und hängt an F:
     F.fachOeffnen(id, fokus?) · F.fachZu() · F.fachOffen() → id|null · F.fachTaste(n) · F.zuletztMerken(typ, skin)
   Regeln: höchstens ein Fach offen; zweiter Klick, Esc oder Klick daneben schließt. Geräte per Ziehen (Zeigerereignisse,
   kein HTML5-DnD) oder Klick → Werkzeug „platzieren“. Platzieren schließt das Fach, außer Umschalt ist gedrückt.
   Tastatur: 1–4 öffnet ein Fach, im offenen Fach wählt 1…n das Gerät, Enter setzt es in die Mitte der Fläche.
   Oben im Fach „Zuletzt benutzt“ (höchstens 3, einst.labor.zuletzt). Klassenpräfix pa- (Palette). */
UI.laborFach = (() => {
  function einrichten(Z, F){
    const leiste = Z.el.geraete;
    let offen = null;
    const einst = () => store.get("einst", {}) || {};
    const gleich = (a, typ, skin) => a.typ === typ && (a.skin || null) === (skin || null);
    const zuletzt = () => (einst().labor?.zuletzt || []).filter(z => z && UI.GERAETE.some(a => gleich(a, z.typ, z.skin))).slice(0, 3);
    function zuletztMerken(typ, skin){
      const e = einst();
      const l = (e.labor?.zuletzt || []).filter(z => z && !gleich(z, typ, skin));
      l.unshift({typ, skin: skin || null});
      e.labor = Object.assign({}, e.labor, {zuletzt: l.slice(0, 3)});
      store.set("einst", e);
    }
    const bild = (typ, skin, b, hoehe) => sv("svg", {viewBox: "-34 -30 68 60", width: b, height: hoehe, "aria-hidden": "true"}, UI.geraetebild(typ, skin));

    const knoepfe = UI.KATEGORIEN.map(k => h("button", {type: "button", class: `pa-kat typ-${k.typ}`, "data-kat": k.id, "aria-haspopup": "dialog", "aria-expanded": "false",
      title: `${k.titel} (Taste ${k.taste}): ${k.text}`, onclick: () => umschalten(k.id)}, bild(k.typ, k.skin, 38, 33), h("span", {}, k.kurz)));
    const fach = h("div", {class: "pa-fach", role: "dialog", hidden: true});
    leiste.replaceChildren(h("div", {class: "lb-geraete-titel"}, "Geräte"), ...knoepfe, fach);
    Z.el.fach = fach;

    function teil(a, nr, klein){
      return h("button", {type: "button", class: `pa-teil typ-${a.typ}` + (klein ? " klein" : ""), "data-typ": a.typ, "data-skin": a.skin || "",
        title: `${a.titel}: ${a.text}\nZiehen oder anklicken und auf die Fläche klicken.`},
        bild(a.typ, a.skin, klein ? 32 : 40, klein ? 28 : 35),
        klein ? h("span", {class: "pa-name"}, a.titel) : h("span", {class: "pa-text"}, h("b", {}, a.titel), h("small", {}, a.kurz)),
        nr ? h("kbd", {}, String(nr)) : null);
    }
    function zeichnen(id){
      const k = UI.KATEGORIEN.find(x => x.id === id);
      const zl = zuletzt().map(z => UI.geraeteArt(z.typ, z.skin));
      fach.replaceChildren(...[
        h("div", {class: "pa-kopf"}, h("strong", {}, k.titel),
          h("button", {type: "button", class: "pa-zu", title: "Schließen (Esc)", "aria-label": "Fach schließen", onclick: () => zu()}, UI.symbol("schliessen", 14))),
        zl.length ? h("div", {class: "pa-zuletzt"}, h("small", {}, "Zuletzt benutzt"), h("div", {class: "pa-zuletzt-reihe"}, zl.map(a => teil(a, null, true)))) : null,
        h("div", {class: "pa-liste", role: "list"}, UI.GERAETE.filter(a => a.kategorie === id).map((a, i) => teil(a, i + 1)))].filter(Boolean));
      fach.setAttribute("aria-label", "Fach " + k.titel);
      markieren();
    }
    /* gewähltes Gerät (Werkzeug „platzieren“) im Fach hervorheben */
    function markieren(){
      for (const b of fach.querySelectorAll(".pa-teil"))
        b.classList.toggle("an", Z.werkzeug === "platzieren" && !!Z.platz && gleich(Z.platz, b.dataset.typ, b.dataset.skin || null));
    }
    function oeffnen(id, fokus){
      if (!UI.KATEGORIEN.some(k => k.id === id)) return;
      offen = id;
      zeichnen(id);
      fach.hidden = false;
      const k = knoepfe.find(b => b.dataset.kat === id);
      fach.style.top = Math.max(6, k.offsetTop - 6) + "px";
      for (const b of knoepfe) { const an = b.dataset.kat === id; b.classList.toggle("an", an); b.setAttribute("aria-expanded", String(an)); }
      UI.juice?.(k, "wahl", 400); UI.klang?.spielen("klick");
      /* Fach darf nicht unten aus dem Fenster ragen */
      const r = fach.getBoundingClientRect(), unten = innerHeight - 8;
      if (r.bottom > unten) fach.style.top = Math.max(6, k.offsetTop - 6 - (r.bottom - unten)) + "px";
      if (fokus) fach.querySelector(".pa-liste .pa-teil")?.focus({preventScroll: true});
      document.addEventListener("pointerdown", aussen, true);
    }
    function zu(){
      if (!offen) return;
      offen = null;
      fach.hidden = true;
      for (const b of knoepfe) { b.classList.remove("an"); b.setAttribute("aria-expanded", "false"); }
      document.removeEventListener("pointerdown", aussen, true);
      if (fach.contains(document.activeElement)) Z.svg?.focus({preventScroll: true});
    }
    function umschalten(id){ if (offen === id) zu(); else oeffnen(id); }
    /* Klick daneben schließt – außer Umschalt beim Platzieren (mehrere Geräte nacheinander) */
    function aussen(e){
      if (leiste.contains(e.target)) return;
      if (e.shiftKey && Z.werkzeug === "platzieren") return;
      zu();
    }
    function taste(n){
      if (!offen) { const k = UI.KATEGORIEN[n - 1]; if (!k) return false; oeffnen(k.id, true); return true; }
      const a = UI.GERAETE.filter(x => x.kategorie === offen)[n - 1]; if (!a) return false;
      waehlen({typ: a.typ, skin: a.skin || null});
      return true;
    }
    function waehlen(platz){
      if (Z.werkzeug === "platzieren" && Z.platz && gleich(Z.platz, platz.typ, platz.skin)) F.platzEnde();
      else F.werkzeug("platzieren", {platz});
      markieren();
    }

    /* ---------- ziehen oder anklicken ---------- */
    leiste.addEventListener("pointerdown", e => {
      const b = e.target.closest(".pa-teil"); if (!b || e.button !== 0) return;
      e.preventDefault();
      const platz = {typ: b.dataset.typ, skin: b.dataset.skin || null};
      let geist = null, bewegt = false;
      const x0 = e.clientX, y0 = e.clientY;
      /* beim Ziehen ist das Fach durchsichtig (pa-fach.zieht) – Loslassen darüber legt das Gerät auf die Fläche darunter */
      const drin = ev => { const r = Z.svg.getBoundingClientRect(); return ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom; };
      const mv = ev => {
        if (!bewegt && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 5) {
          bewegt = true;
          geist = h("div", {class: "lb-geist typ-" + platz.typ}, bild(platz.typ, platz.skin, 64, 56));
          document.body.append(geist);
          fach.classList.add("zieht");
        }
        if (geist) { geist.style.transform = `translate(${ev.clientX - 32}px, ${ev.clientY - 28}px)`; geist.classList.toggle("drin", drin(ev)); }
      };
      const up = ev => {
        document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up); document.removeEventListener("pointercancel", up);
        geist?.remove(); fach.classList.remove("zieht");
        if (!bewegt) { waehlen(platz); return; }
        if (ev.type === "pointercancel" || !drin(ev)) return;   /* zurück ins Fach = abgebrochen */
        const w = F.weltPunkt(ev.clientX, ev.clientY);
        F.geraetAnlegen(platz.typ, platz.skin, w.x, w.y);
        if (!ev.shiftKey) { if (Z.werkzeug === "platzieren") F.platzEnde(); zu(); } else markieren();
      };
      document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up); document.addEventListener("pointercancel", up);
    });
    leiste.addEventListener("keydown", e => {
      const b = e.target.closest(".pa-teil");
      if (e.key === "Escape" && offen) { e.preventDefault(); e.stopPropagation(); const k = knoepfe.find(x => x.dataset.kat === offen); zu(); k?.focus({preventScroll: true}); return; }
      if (!b || (e.key !== "Enter" && e.key !== " ")) return;
      e.preventDefault();
      F.einsetzen(b.dataset.typ, b.dataset.skin || null);
      if (!e.shiftKey) zu();
    });

    Object.assign(F, {fachOeffnen: oeffnen, fachZu: zu, fachOffen: () => offen, fachTaste: taste, fachMarkieren: markieren, zuletztMerken});
  }
  return {einrichten};
})();
