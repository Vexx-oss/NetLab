"use strict";
/* ---------- Funktionsprobe-Szene (Design – Spielspaß 2.0, Hebel 1; Architektur § 9.2) ----------
   UI.szene.abspielen(zeilen, {geaendert, kunde, satz, kurz}) → Promise<{dauer, uebersprungen, gezeigt}>
     zeilen   aus Spiel.szene(inst, abnahme): je Ziel {art, pfad, von, ende, text}
     geaendert  Geräte, die kurz pulsieren (Vorher/Nachher, Spiel.geaenderteGeraete)
     kunde/satz die Kundenzeile als Sprechblase an dem Gerät, das der Kunde zuerst nutzt
     kurz     AP1/AP2: höchstens 2 Ziele, schneller (Einstieg: bis 4, ausführlicher)
   Läuft 2–6 s auf der Zeichenfläche, überspringbar mit Klick, Esc oder Leertaste. Bei reduzierter Bewegung:
   ruhige Haken-Liste (1,2 s). UI.szene.laeuft() → bool, UI.szene.letzte → Messwerte der letzten Probe.
   Klassenpräfix sz-. */
UI.szene = (() => {
  let aktiv = null;
  const pause = (ms, st) => new Promise(res => { const t = setTimeout(res, ms); st.weiter.push(() => { clearTimeout(t); res(); }); });
  const SYMBOL = {druckt: "🧾", seite: "🌐", adresse: "🏷", gesperrt: "⛔", haken: "✓", sicherung: "💾"};

  /* HTML-Element über einem Gerät (Bildschirmposition auf der Leinwand) */
  function anGeraet(buehne, id, el, versatzY = -58){
    const p = UI.labor.bildschirm(id); if (!p) return null;
    buehne.append(el);
    /* über dem Gerät, aber nie aus der Fläche ragen (transform: -50 % / -100 % → left = Mitte, top = Unterkante) */
    const b = el.offsetWidth, hoehe = el.offsetHeight, W = buehne.clientWidth, H = buehne.clientHeight;
    const x = Math.max(b / 2 + 6, Math.min(W - b / 2 - 6, p.x)), y = Math.max(hoehe + 6, Math.min(H - 6, p.y + versatzY * Math.max(.6, Math.min(1.2, p.k))));
    el.style.left = Math.round(x) + "px";
    el.style.top = Math.round(y) + "px";
    return el;
  }

  function reaktion(buehne, z){
    const el = h("div", {class: `sz-reaktion sz-${z.art}`},
      h("span", {class: "sz-sym", "aria-hidden": "true"}, SYMBOL[z.art] || "✓"), h("span", {}, z.text),
      z.art === "seite" ? h("span", {class: "sz-balken"}, h("i")) : null);
    if (!anGeraet(buehne, z.ende, el)) return;
    const g = UI.labor.geraetEl?.(z.ende);
    if (z.art !== "gesperrt") { UI.juice?.(g, "atmen"); UI.labor.erfolg?.(z.ende); }
    else UI.juice?.(g, "sperre");
    UI.klang?.spielen(z.art === "gesperrt" ? "sperre" : z.art === "druckt" ? "druck" : "haken");
  }

  /* Paket Station für Station über den Pfad der Abnahme */
  async function fahren(z, msGesamt, st){
    const hops = Math.max(1, z.pfad.length - 1), ms = Math.max(110, Math.min(340, Math.round(msGesamt / hops)));
    for (let i = 1; i < z.pfad.length; i++) {
      if (st.ende) return;
      await Promise.race([UI.labor.paket(z.pfad[i - 1], z.pfad[i], {ms, proto: z.art === "adresse" ? "DHCP" : "TCP"}), pause(ms + 60, st)]);
    }
  }

  function liste(buehne, zeilen, o){
    buehne.classList.add("sz-ruhig");
    buehne.append(h("div", {class: "sz-liste", role: "status"},
      h("ul", {}, zeilen.map(z => h("li", {}, h("span", {class: "sz-haken", "aria-hidden": "true"}, "✓"), h("span", {}, z.text)))),
      o.satz ? h("p", {class: "sz-satz"}, `„${o.satz}“`, h("small", {}, " — " + (o.kunde?.name || "Kunde"))) : null));
  }

  async function abspielen(zeilen, o = {}){
    if (aktiv) aktiv.ende = true;
    const leinwand = UI.labor.leinwand;
    if (!leinwand || !zeilen || !zeilen.length) return {dauer: 0, uebersprungen: false, gezeigt: 0};
    const t0 = performance.now(), ruhig = UI.bewegung() !== "voll";
    const max = o.kurz ? 2 : 4, gezeigt = zeilen.slice(0, max), rest = zeilen.length - gezeigt.length;
    const st = aktiv = {ende: false, weiter: [], uebersprungen: false};
    const buehne = h("div", {class: "sz-buehne", role: "presentation", title: "Klick, Esc oder Leertaste: weiter"},
      h("span", {class: "sz-weiter"}, "Weiter: Klick"));
    leinwand.append(buehne);
    const stopp = () => { if (st.ende) return; st.ende = true; st.uebersprungen = true; for (const f of st.weiter.splice(0)) f(); };
    const taste = e => { if (e.key === "Escape" || e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); stopp(); } };
    buehne.addEventListener("pointerdown", e => { e.preventDefault(); stopp(); });
    document.addEventListener("keydown", taste, true);
    try {
      if (ruhig) {
        liste(buehne, zeilen, o);
        await pause(1200, st);
      } else {
        if (o.geaendert && o.geaendert.length) UI.labor.hervorheben(o.geaendert.map(id => ({geraet: id})), 1500);
        await pause(o.kurz ? 150 : 300, st);
        const proZiel = o.kurz ? 650 : 950;
        for (const z of gezeigt) {
          if (st.ende || performance.now() - t0 > 4300) break;
          await fahren(z, proZiel, st);
          if (st.ende) break;
          reaktion(buehne, z);
          await pause(o.kurz ? 220 : 420, st);
        }
        if (!st.ende && o.satz) {
          const bei = gezeigt[0] ? gezeigt[0].von : null;
          const blase = h("div", {class: "sz-blase", style: {"--k": `var(${o.kunde?.farbe || "--accent"})`}},
            h("span", {class: "sz-kunde", "aria-hidden": "true"}, o.kunde?.symbol || "✉"),
            h("span", {}, h("b", {}, (o.kunde?.name || "Kunde") + ": "), o.satz),
            rest > 0 ? h("small", {class: "sz-rest"}, `+ ${rest} weitere${rest === 1 ? "s Ziel" : " Ziele"} ✓`) : null);
          if (bei && anGeraet(buehne, bei, blase, -70)) { UI.klang?.spielen("blase"); await pause(o.kurz ? 1100 : 1500, st); }
        }
        const rest2 = 2000 - (performance.now() - t0);
        if (!st.ende && rest2 > 0) await pause(rest2, st);           /* nie kürzer als 2 s – sonst wirkt es wie ein Flackern */
      }
    } finally {
      document.removeEventListener("keydown", taste, true);
      buehne.classList.add("weg");
      setTimeout(() => buehne.remove(), wenigBewegung() ? 0 : 180);
      if (aktiv === st) aktiv = null;
    }
    const erg = {dauer: Math.round(performance.now() - t0), uebersprungen: st.uebersprungen, gezeigt: ruhig ? zeilen.length : gezeigt.length, ruhig};
    api.letzte = erg;
    return erg;
  }
  const api = {abspielen, laeuft: () => !!aktiv, letzte: null};
  return api;
})();
