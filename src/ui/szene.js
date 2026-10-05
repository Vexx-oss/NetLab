"use strict";
/* ---------- Funktionsprobe-Szene (Design – Spielspaß 2.0, Hebel 1; Architektur § 9.2) ----------
   UI.szene.abspielen(zeilen, {geaendert, kunde, satz, kurz, form, aufdecken}) → Promise<{dauer, uebersprungen, gezeigt}>
     zeilen   aus Spiel.szene(inst, abnahme): je Ziel {art, pfad, von, ende, text}
     geaendert  Geräte, die kurz pulsieren (Vorher/Nachher, Spiel.geaenderteGeraete)
     kunde/satz die Kundenzeile als Sprechblase an dem Gerät, das der Kunde zuerst nutzt
     kurz     AP1/AP2: höchstens 2 Ziele, schneller (Einstieg: bis 4, ausführlicher)
     form     Spiel.szeneForm(inst): eigene Probe je Form, zusammen höchstens ~3 s (§ 20 F4) – Hotline legt auf (statt
              Sprechblase), Fernwartung trennt erst die Sitzung und deckt dann das Netz auf (aufdecken), Plan-Audit stempelt,
              Adressplan leuchtet (beide ohne Paketfahrt)
   Läuft 2–6 s auf der Zeichenfläche, überspringbar mit Klick, Esc oder Leertaste. Bei reduzierter Bewegung:
   ruhige Haken-Liste (1,2 s). UI.szene.laeuft() → bool, UI.szene.letzte → Messwerte der letzten Probe.
   Klassenpräfix sz-. */
UI.szene = (() => {
  let aktiv = null;
  const pause = (ms, st) => new Promise(res => { const t = setTimeout(res, ms); st.weiter.push(() => { clearTimeout(t); res(); }); });
  const SYMBOL = {druckt: "🧾", seite: "🌐", adresse: "🏷", gesperrt: "⛔", haken: "✓", sicherung: "💾"};

  /* Setzt ein Element an eine Bildschirmstelle (transform: -50 % / -100 % → left = Mitte, top = Unterkante) und hält
     es dabei innerhalb der Bühne. px/py sind bereits die endgültige Position. */
  function setzeAn(buehne, el, px, py){
    const b = el.offsetWidth, hoehe = el.offsetHeight, W = buehne.clientWidth, H = buehne.clientHeight;
    el.style.left = Math.round(Math.max(b / 2 + 6, Math.min(W - b / 2 - 6, px))) + "px";
    el.style.top = Math.round(Math.max(hoehe + 6, Math.min(H - 6, py))) + "px";
    return el;
  }

  /* Liegt an dieser Stelle etwas anderes im Weg? Geprüft wird, was wirklich obenauf liegt (elementFromPoint), samt
     allen Vorfahren – so zählt das Element selbst nicht als Hindernis, auch wenn es dort schon steht. */
  function verdecktEtwas(buehne, el){
    const r = el.getBoundingClientRect(), b = buehne.getBoundingClientRect();
    for (let i = 1; i <= 6; i++) for (let j = 1; j <= 4; j++){
      const x = r.left + r.width * i / 7, y = r.top + r.height * j / 5;
      if (x < b.left + 2 || x > b.right - 2 || y < b.top + 2 || y > b.bottom - 2) continue;   /* außerhalb ist kein Verdeckungsfall */
      const t = document.elementFromPoint(x, y);
      if (t && t !== el && !el.contains(t) && buehne.contains(t)) return t;
    }
    return null;
  }

  /* HTML-Element über einem Gerät (Bildschirmposition auf der Leinwand).
     ausweichen: weitere Stellen [[x-Versatz in Einheiten à 34 px, y-Versatz]], die der Reihe nach probiert werden, wenn
     die Stelle belegt ist (Design § 22, G3: die Sprechblase lag auf der Pille „Beleg kommt raus“). Findet sich keine
     freie Stelle, bleibt es beim ersten Versatz – lieber wie bisher als ganz ohne Blase. */
  function anGeraet(buehne, id, el, versatzY = -58, ausweichen = null){
    const p = UI.labor.bildschirm(id); if (!p) return null;
    buehne.append(el);
    const versatz = (v) => p.y + v * Math.max(.6, Math.min(1.2, p.k));
    const stellen = [[0, versatzY]].concat(ausweichen || []).map(([dx, v]) => [p.x + (dx || 0) * 34, versatz(v)]);
    for (const [x, y] of stellen){
      setzeAn(buehne, el, x, y);
      if (!verdecktEtwas(buehne, el)) return el;
    }
    setzeAn(buehne, el, stellen[0][0], stellen[0][1]);
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

  /* ---------- Eigene Probe je Form (§ 20 F4) ---------- */
  function formKarte(buehne, klasse, ...inhalt){ const el = h("div", {class: "sz-form " + klasse, role: "status"}, ...inhalt); buehne.append(el); return el; }
  async function formProbe(buehne, f, st, o, ruhig){
    if (f.art === "fernwartung") {
      UI.labor.fernFertig?.(); UI.klang?.spielen("haken");
      await pause(ruhig ? 900 : 1200, st);
      o.aufdecken?.();                                      /* jetzt zeigt sich das Netz, das man blind repariert hat */
      return;
    }
    if (f.art === "hotline") {
      const el = formKarte(buehne, "sz-auflegen", h("span", {class: "sz-hoerer", "aria-hidden": "true"}, "☎"),
        h("div", {class: "sz-form-text"}, h("b", {}, f.person), h("small", {}, `Gespräch beendet · ${f.minuten} min`), f.satz ? h("p", {}, `„${f.satz}“`) : null));
      el.style.setProperty("--k", `var(${f.farbe || "--accent"})`);
      UI.klang?.spielen("blase");
      await pause(ruhig ? 1200 : 1600, st);
      return;
    }
    if (f.art === "audit") {
      let bild = null;
      try { const netz = UI.labor.netz; if (netz) bild = UI.netzplan.zeichnung(Spiel.plan.aus(netz, {art: "skizze"}), "skizze"); } catch (e) { bild = null; }
      const el = formKarte(buehne, "sz-audit", h("div", {class: "sz-form-kopf"}, "📐 ", h("b", {}, "Netzplan"), ` · ${f.kunde}`),
        h("div", {class: "sz-plan"}, bild || h("span", {class: "sz-plan-leer", "aria-hidden": "true"}, "🗺")),
        h("div", {class: "sz-stempel", "aria-label": "Geprüft"}, h("b", {}, "GEPRÜFT ✓"), h("small", {}, datumDe(f.tag))),
        h("p", {class: "sz-form-fuss"}, `${f.korrigiert} ${f.korrigiert === 1 ? "Wert" : "Werte"} korrigiert – der Plan stimmt wieder`));
      await pause(ruhig ? 0 : 420, st);
      el.classList.add("gestempelt"); UI.klang?.spielen("druck");
      await pause(ruhig ? 1200 : 1500, st);
      return;
    }
    if (f.art === "adressplan") {
      const n = f.bereiche.length;
      formKarte(buehne, "sz-adressplan", h("div", {class: "sz-form-kopf"}, "🧮 ", h("b", {}, "Adressplan"), ` · ${f.basis}`),
        h("div", {class: "sz-adressen", "aria-hidden": "true"}, f.bereiche.map((b, i) => h("i", {style: {left: b.links + "%", width: b.breite + "%", "--i": i, "--f": `var(--vlan-${(i % 7) + 2})`}}))),
        h("ul", {class: "sz-legende"}, f.bereiche.map((b, i) => h("li", {style: {"--i": i, "--f": `var(--vlan-${(i % 7) + 2})`}}, h("b", {}, b.name), ` ${b.netz}${b.praefix}`))));
      UI.klang?.spielen("haken");
      await pause(ruhig ? 1200 : 300 + n * 280 + 1100, st);
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
    const leinwand = UI.labor.leinwand, f = o.form || null;
    if (!leinwand || ((!zeilen || !zeilen.length) && !f)) { o.aufdecken?.(); return {dauer: 0, uebersprungen: false, gezeigt: 0}; }
    zeilen = zeilen || [];
    const t0 = performance.now(), ruhig = UI.bewegung() !== "voll";
    const nurForm = !!f && (f.art === "audit" || f.art === "adressplan");          /* Arbeitsblatt und Plan: keine Paketfahrt */
    const max = nurForm ? 0 : f ? 1 : o.kurz ? 2 : 4, gezeigt = zeilen.slice(0, max), rest = zeilen.length - gezeigt.length;
    const st = aktiv = {ende: false, weiter: [], uebersprungen: false};
    const buehne = h("div", {class: "sz-buehne", role: "presentation", title: "Klick, Esc oder Leertaste: weiter"},
      h("span", {class: "sz-weiter"}, "Weiter: Klick"));
    leinwand.append(buehne);
    const stopp = () => { if (st.ende) return; st.ende = true; st.uebersprungen = true; for (const f of st.weiter.splice(0)) f(); };
    const taste = e => { if (e.key === "Escape" || e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); stopp(); } };
    buehne.addEventListener("pointerdown", e => { e.preventDefault(); stopp(); });
    document.addEventListener("keydown", taste, true);
    try {
      if (ruhig && f) {
        await formProbe(buehne, f, st, o, true);
      } else if (ruhig) {
        liste(buehne, zeilen, o);
        await pause(1200, st);
      } else {
        if (f && f.art === "fernwartung") await formProbe(buehne, f, st, o, false);   /* erst die Sitzung beenden, dann das Netz */
        if (o.geaendert && o.geaendert.length && !nurForm) UI.labor.hervorheben(o.geaendert.map(id => ({geraet: id})), 1500);
        if (gezeigt.length) await pause(o.kurz || f ? 150 : 300, st);
        const proZiel = o.kurz || f ? 650 : 950;
        for (const z of gezeigt) {
          if (st.ende || performance.now() - t0 > (f ? 2200 : 4300)) break;
          await fahren(z, proZiel, st);
          if (st.ende) break;
          reaktion(buehne, z);
          await pause(o.kurz || f ? 220 : 420, st);
        }
        if (!st.ende && f && f.art !== "fernwartung") await formProbe(buehne, f, st, o, false);   /* Hotline legt auf, Audit stempelt, Adressplan leuchtet */
        if (!st.ende && o.satz && !f) {
          /* Die Reaktionspillen haben ihre Zeit gehabt (die letzte stand ~420 ms) und liegen als später angehängte
             Elemente über allem. Die Sprechblase ist der Schlusssatz – dafür treten die Pillen ab (Design § 22, G3:
             die Blase lag auf der Pille „Beleg kommt raus“, und weil die Pille danach eingefügt wurde, half ein
             Verschieben der Blase allein nicht). Sie gehen sofort, nicht mit Übergang: die Blase wird gleich vermessen,
             und ein noch ausblendendes Element wäre dabei weiter im Weg. */
          for (const pille of [...buehne.querySelectorAll(".sz-reaktion")]) pille.remove();
          await pause(20, st);
          const bei = gezeigt[0] ? gezeigt[0].von : null;
          const blase = h("div", {class: "sz-blase", style: {"--k": `var(${o.kunde?.farbe || "--accent"})`}},
            h("span", {class: "sz-kunde", "aria-hidden": "true"}, o.kunde?.symbol || "✉"),
            h("span", {}, h("b", {}, (o.kunde?.name || "Kunde") + ": "), o.satz),
            rest > 0 ? h("small", {class: "sz-rest"}, `+ ${rest} weitere${rest === 1 ? "s Ziel" : " Ziele"} ✓`) : null);
          /* Ausweichstellen gegen alles, was sonst noch über der Fläche steht: erst höher, dann tiefer, dann neben das
             Gerät. Die Stelle unter dem Gerät bleibt frei, damit die Blase nicht auf der Kundenzeile des Geräts landet. */
          const ausweichen = [[0, -96], [0, -30], [0, 60], [-1, -70], [1, -70], [-1.6, -70], [1.6, -70]];
          if (bei && anGeraet(buehne, bei, blase, -70, ausweichen)) { UI.klang?.spielen("blase"); await pause(o.kurz ? 1100 : 1500, st); }
        }
        const rest2 = 2000 - (performance.now() - t0);
        if (!st.ende && rest2 > 0 && !f) await pause(rest2, st);    /* nie kürzer als 2 s – sonst wirkt es wie ein Flackern */
      }
    } finally {
      if (f && f.art === "fernwartung") o.aufdecken?.();        /* auch beim Überspringen: das Netz zeigt sich */
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
