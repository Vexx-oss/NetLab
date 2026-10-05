"use strict";
/* ---------- Simulations-Panel (Konzept § 7 „Simulation“, § 4 Diagnosetiefe, § 5.4) ----------
   UI.simpanel.zeigen(container, trace)
     Spielt eine Trace (Architektur § 5.2) ab – es rechnet nichts nach, es zeigt nur, was die Simulation
     aufgezeichnet hat. Oben die Zusammenfassung mit großem ✓/✗, darunter wahlweise
       „Ergebnis“            nur Ergebnis und die Stelle, an der es hängt (wie Echtzeit in Packet Tracer)
       „Schritt für Schritt“ Ereignisliste mit Filter, Play/Pause, Schritt, Tempo, PDU-Inspektor daneben.
     Klick auf eine Zeile lässt das Gerät aufleuchten (UI.labor.hervorheben) und zeigt den Frame (UI.pdu).
     Die Wiedergabe ruft UI.labor.animiere(ereignis) für „senden“-Ereignisse.
   Erklärtiefe je Niveau: DATEN.lehrtexte[code][niveau] (E erklärt, AP1 knapp, AP2 nur Gerätemeldung),
   sonst Sim.GRUENDE[code].titel, sonst der Code. */
UI.simpanel = (() => {
  const Z = new WeakMap();
  const TEMPI = [0.5, 1, 2, 4];
  const SCHRITT_MS = 900;            /* Dauer eines Schritts bei 1× */
  const MAX_ZEILEN = 1500;           /* Schutz bei Broadcast-Sturm (bis 5000 Ereignisse) */
  let modusMerk = "schritt", tempoMerk = 1;

  const niveau = () => (store.get("einst", {}) || {}).niveau || "E";
  const sim = () => typeof Sim !== "undefined" ? Sim : null;
  const labor = () => UI.labor || null;
  const geraetName = id => { const g = labor()?.netz?.geraete?.[id]; return g ? g.name : (id || "?"); };
  const zeit = t => t == null ? "" : `${Number(t).toLocaleString("de-DE", {maximumFractionDigits: 1})} ms`;

  const ART = {
    senden:       {text: "sendet",        d: "M2 8h10M8 4l4 4-4 4"},
    empfangen:    {text: "empfängt",      d: "M2 8h8M7 5l3 3-3 3M13 3v10"},
    weiterleiten: {text: "leitet weiter", d: "M3 4l4 4-4 4M8 4l4 4-4 4"},
    fluten:       {text: "flutet",        d: "M2 8h5M7 8l6-5M7 8h6M7 8l6 5"},
    verwerfen:    {text: "verwirft",      d: "M4 4l8 8M12 4l-8 8"},
    antworten:    {text: "antwortet",     d: "M13 3v4a3 3 0 0 1-3 3H3M6 7l-3 3 3 3"},
    lernen:       {text: "lernt",         d: "M3 3h10v10H3zM8 5v6M5 8h6"},
    info:         {text: "Hinweis",       d: "M8 2.5a5.5 5.5 0 1 0 0 11a5.5 5.5 0 1 0 0-11M8 7v4M8 5h.01"},
  };
  function artSymbol(art){
    const a = ART[art] || ART.info;
    return h("span", {class: "si-art", "data-art": art},
      sv("svg", {viewBox: "0 0 16 16", width: 14, height: 14, "aria-hidden": "true"}, sv("path", {d: a.d})),
      h("span", {}, a.text));
  }
  const ICON = {
    anfang: "M3 3v10M13 3L6 8l7 5z", zurueck: "M11 3L5 8l6 5z", vor: "M5 3l6 5-6 5z",
    play: "M4 2.5l9 5.5-9 5.5z", pause: "M4 3h3v10H4zM9 3h3v10H9z",
  };
  const icon = n => sv("svg", {viewBox: "0 0 16 16", width: 16, height: 16, "aria-hidden": "true"}, sv("path", {d: ICON[n]}));

  /* --- Auswertung der Trace (nur lesen) --- */
  function erfolg(t){
    if (typeof t.ok === "boolean") return t.ok;
    if (t.abbruch) return false;
    const z = String(t.zusammenfassung || "").trim();
    if (/^(✓|✔)/.test(z)) return true;
    if (/^(✗|✕|×)/.test(z)) return false;
    return !(t.ereignisse || []).some(e => e.art === "verwerfen" && e.grund);
  }
  const istMeldung = e => { const c = e.frame?.icmp; return !!c && (c.typ === "unreachable" || c.typ === "time-exceeded") && (e.art === "senden" || e.art === "antworten"); };
  /* Verwerfen ohne Grund-Code ist normales Verhalten (Host ignoriert fremden Broadcast, Router verwirft das erste
     Paket während ARP). Echte Probleme tragen einen Grund. Gibt es keine mit Grund, zählen alle Verwerfungen. */
  const mitGrund = ev => ev.some(e => e.art === "verwerfen" && e.grund);
  const istProblem = (z, e) => z.hatGrund ? ((e.art === "verwerfen" && !!e.grund) || istMeldung(e)) : e.art === "verwerfen";
  /* Meldet jemand den Verlust (ICMP-Fehler), oder wird still verworfen? */
  function meldungZu(liste, i){
    const ev = liste[i];
    for (let j = i + 1; j < liste.length && j < i + 60; j++) if (istMeldung(liste[j]) && liste[j].geraet === ev.geraet) return liste[j];
    return null;
  }
  function erklaerung(code){
    if (!code) return null;
    const nv = niveau(), lt = typeof DATEN !== "undefined" ? DATEN.lehrtexte?.[code] : null;
    return lt?.[nv] || sim()?.GRUENDE?.[code]?.titel || code;
  }
  function skillName(code){
    const s = sim()?.GRUENDE?.[code]?.skill; if (!s) return null;
    return (typeof DATEN !== "undefined" && DATEN.skills?.find(x => x.id === s)?.name) || s;
  }
  const ICMPTEXT = {unreachable: "Destination unreachable (ICMP Typ 3)", "time-exceeded": "Time exceeded (ICMP Typ 11)"};

  /* vorige Etappe desselben Pakets (für die Hervorhebung geänderter Felder im PDU-Inspektor) */
  function voriges(liste, i){
    const k = UI.pdu.paket(liste[i]?.frame); if (!k) return null;
    for (let j = i - 1; j >= 0; j--) if (liste[j].frame && UI.pdu.paket(liste[j].frame) === k) return liste[j];
    return null;
  }

  /* --- Zustand je Container --- */
  function zeigen(container, trace){
    if (!container) return;
    let z = Z.get(container);
    if (z) anhalten(z);
    else {
      z = {container, filter: new Set(), nurProbleme: false, abmelden: null};
      Z.set(container, z);
      z.abmelden = Bus.an("netz-geaendert", () => {
        if (!container.isConnected) { z.abmelden?.(); Z.delete(container); anhalten(z); return; }
        if (z.trace && !z.veraltet) { z.veraltet = true; const b = $(".si-veraltet", container); if (b) b.hidden = false; }
      });
      if (typeof ResizeObserver !== "undefined") {
        z.ro = new ResizeObserver(() => { container.dataset.breite = container.clientWidth < 720 ? "schmal" : "breit"; });
        z.ro.observe(container);
      }
    }
    z.trace = trace || null;
    z.ereignisse = (trace && Array.isArray(trace.ereignisse)) ? trace.ereignisse : [];
    z.idx = new Map(z.ereignisse.map((e, i) => [e, i]));
    z.filter = new Set(); z.nurProbleme = false; z.pos = -1; z.gewaehlt = null; z.spielt = false; z.veraltet = false;
    z.hatGrund = mitGrund(z.ereignisse);
    z.modus = modusMerk;
    container.classList.add("si");   /* eigenes Präfix si- (sp- gehört dem Spiel: .sp-ergebnis, .sp-erklaerung …) */
    container.dataset.breite = container.clientWidth && container.clientWidth < 720 ? "schmal" : "breit";
    bauen(z);
  }

  function sichtbar(z){
    const f = z.filter;
    return z.ereignisse.filter(e => (!f.size || f.has(e.proto)) && (!z.nurProbleme || istProblem(z, e)));
  }

  function bauen(z){
    const c = z.container;
    c.replaceChildren();
    if (!z.trace) {
      c.append(h("div", {class: "si-leer"},
        h("strong", {}, "Noch keine Aufzeichnung."),
        h("p", {}, "Starte einen Ping oder eine Prüfung. Hier siehst du dann jedes Paket: wer sendet, wer weiterleitet, wo etwas verworfen wird – und warum.")));
      return;
    }
    const ok = erfolg(z.trace), ev = z.ereignisse;
    c.append(h("p", {class: "si-veraltet", hidden: !z.veraltet, role: "status"},
      h("span", {class: "si-sym", "aria-hidden": "true"}, "!"), "Das Netz wurde seitdem geändert – diese Aufzeichnung zeigt den Stand davor. Starte die Prüfung neu."));
    c.append(kopf(z, ok));
    if (z.modus === "ergebnis") { c.append(ergebnisAnsicht(z, ok)); return; }
    z.liste = sichtbar(z);
    c.append(h("div", {class: "si-leiste"}, steuerung(z), filterLeiste(z)));   /* eine Zeile: Platz für die Liste */
    const liste = h("div", {class: "si-liste", role: "listbox", tabindex: "0", "aria-label": "Ereignisliste der Simulation"});
    z.listeEl = liste;
    const zeig = z.liste.slice(0, MAX_ZEILEN);
    zeig.forEach((e, i) => liste.append(zeile(z, e, i)));
    if (z.liste.length > MAX_ZEILEN) liste.append(h("p", {class: "si-hinweis"}, `… ${zahlDe(z.liste.length - MAX_ZEILEN)} weitere Ereignisse nicht angezeigt (Filter eingrenzen).`));
    if (!z.liste.length) liste.append(h("p", {class: "si-hinweis"}, ev.length ? "Kein Ereignis passt zum Filter." : "Die Aufzeichnung ist leer."));
    liste.addEventListener("keydown", e => listenTaste(z, e));
    z.pduEl = h("div", {class: "si-pdu", "aria-label": "PDU-Inspektor"});
    c.append(h("div", {class: "si-haupt"}, liste, z.pduEl));
    UI.pdu.zeigen(z.pduEl, null, null);
    c.onkeydown = e => panelTaste(z, e);
    if (z.pos >= 0) markieren(z, z.pos, {leise: true});
  }

  function kopf(z, ok){
    const t = z.trace, ev = z.ereignisse;
    const zeile2 = [];
    const meldung = ev.find(istMeldung), drops = ev.filter(e => e.art === "verwerfen");
    if (t.abbruch === "STORM") zeile2.push(h("span", {class: "si-kennung bad"}, "Broadcast-Sturm: nach ", zahlDe(ev.length), " Ereignissen abgebrochen"));
    else if (meldung) zeile2.push(h("span", {class: "si-kennung gemeldet"}, h("span", {"aria-hidden": "true"}, "↩ "),
      `Gemeldet: ${ICMPTEXT[meldung.frame.icmp.typ]} von ${geraetName(meldung.geraet)}`));
    else if (!ok && drops.length) zeile2.push(h("span", {class: "si-kennung still"}, h("span", {"aria-hidden": "true"}, "… "),
      "Still verworfen: keine Fehlermeldung zurück – der Absender wartet vergeblich (Timeout)"));
    const dauer = ev.length ? (ev[ev.length - 1].t ?? 0) - (ev[0].t ?? 0) : 0;
    const geraete = new Set(ev.map(e => e.geraet)).size;
    return h("div", {class: "si-kopf " + (ok ? "ok" : "bad")},
      h("div", {class: "si-gross", "aria-hidden": "true"}, ok ? "✓" : "✗"),
      h("div", {class: "si-zus"},
        h("strong", {}, ok ? "Hat geklappt" : "Hat nicht geklappt"),
        h("p", {}, t.zusammenfassung || (ok ? "Die Pakete sind angekommen." : "Unterwegs ist etwas verworfen worden.")),
        zeile2.length ? h("p", {class: "si-zeile2"}, zeile2) : null,
        h("p", {class: "si-statistik"}, `${zahlDe(ev.length)} Ereignisse · ${geraete} Geräte · ${zeit(dauer)} virtuelle Zeit`)),
      h("div", {class: "si-modus", role: "radiogroup", "aria-label": "Ansicht"},
        modusKnopf(z, "ergebnis", "Ergebnis"), modusKnopf(z, "schritt", "Schritt für Schritt")));
  }
  function modusKnopf(z, m, text){
    const an = z.modus === m;
    return h("button", {type: "button", role: "radio", "aria-checked": String(an), class: an ? "an" : "", tabindex: an ? "0" : "-1",
      onclick: () => { if (z.modus === m) return; anhalten(z); z.modus = modusMerk = m; bauen(z); $(`.si-modus [aria-checked="true"]`, z.container)?.focus(); },
      onkeydown: e => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); const n = m === "ergebnis" ? "schritt" : "ergebnis"; anhalten(z); z.modus = modusMerk = n; bauen(z); $(`.si-modus [aria-checked="true"]`, z.container)?.focus(); } }}, text);
  }

  function ergebnisAnsicht(z, ok){
    const ev = z.ereignisse, box = h("div", {class: "si-ergebnis"});
    const alle = ev.map((e, i) => ({e, i})).filter(x => x.e.art === "verwerfen");
    const drops = z.hatGrund ? alle.filter(x => x.e.grund) : ok ? [] : alle;
    if (z.trace.abbruch === "STORM") box.append(problem(z, {art: "verwerfen", grund: "STORM", geraet: null, text: "Die Simulation hat das Ereignis-Budget überschritten."}, null));
    if (drops.length) {
      box.append(h("h4", {}, drops.length === 1 ? "Hier hängt es" : `Hier hängt es (${drops.length} Stellen)`));
      for (const {e, i} of drops.slice(0, 4)) box.append(problem(z, e, meldungZu(ev, i)));
      if (drops.length > 4) box.append(h("p", {class: "si-hinweis"}, `… und ${drops.length - 4} weitere. Alle stehen in der Schritt-für-Schritt-Ansicht.`));
    } else if (ok && alle.length) box.append(h("p", {class: "si-hinweis"}, `Das Ziel wurde erreicht. Unterwegs wurden ${alle.length} Rahmen verworfen, ohne dass etwas kaputt ist: Geräte ignorieren Rahmen, die nicht für sie bestimmt sind (z. B. fremde ARP- und DHCP-Broadcasts), und ein Router verwirft das erste Paket, solange er per ARP nachfragt.`));
    else if (ok) box.append(h("p", {class: "si-hinweis"}, "Kein Paket wurde verworfen. In der Schritt-für-Schritt-Ansicht siehst du den Weg jedes einzelnen Rahmens."));
    box.append(h("button", {type: "button", class: "si-knopf haupt", onclick: () => { z.modus = modusMerk = "schritt"; bauen(z); }}, "Schritt für Schritt ansehen"));
    return box;
  }
  function problem(z, e, meldung){
    const nv = niveau();
    const karte = h("div", {class: "si-problem"},
      h("div", {class: "si-problem-kopf"},
        h("span", {class: "si-sym bad", "aria-hidden": "true"}, "✕"),
        h("strong", {}, e.geraet ? `${geraetName(e.geraet)}${e.port ? " " + e.port : ""} verwirft` : "Abbruch"),
        e.proto ? UI.pdu.chip(e.proto) : null,
        e.grund && nv !== "AP2" ? h("code", {class: "si-grund"}, e.grund) : null),
      e.text ? h("p", {}, e.text) : null,
      e.grund ? h("p", {class: "si-erklaerung"}, erklaerung(e.grund)) : null,
      e.geraet ? h("p", {class: meldung ? "si-kennung gemeldet" : "si-kennung still"}, meldung
        ? `${geraetName(meldung.geraet)} meldet es zurück: ${ICMPTEXT[meldung.frame.icmp.typ]}`
        : "Still verworfen – niemand schickt eine Fehlermeldung zurück.") : null);
    if (e.geraet) karte.append(h("button", {type: "button", class: "si-knopf", onclick: () => labor()?.hervorheben?.([{geraet: e.geraet, port: e.port || null}], 2000)}, "Gerät zeigen"));
    return karte;
  }

  function steuerung(z){
    const k = (name, label, fn, taste) => h("button", {type: "button", class: "si-steuer-knopf", "aria-label": label, title: `${label}${taste ? " (" + taste + ")" : ""}`, onclick: fn}, icon(name));
    z.playEl = k(z.spielt ? "pause" : "play", z.spielt ? "Pause" : "Abspielen", () => umschalten(z), "Leertaste");
    z.posEl = h("span", {class: "si-pos", "aria-live": "off"});
    const tempo = h("div", {class: "si-tempo", role: "radiogroup", "aria-label": "Tempo"},
      TEMPI.map(t => h("button", {type: "button", role: "radio", "aria-checked": String(tempoMerk === t), class: tempoMerk === t ? "an" : "",
        onclick: ev => { tempoMerk = t; for (const b of $$("button", ev.currentTarget.parentNode)) { const an = b === ev.currentTarget; b.classList.toggle("an", an); b.setAttribute("aria-checked", String(an)); } if (z.spielt) { anhalten(z, true); planen(z); } }},
        `${String(t).replace(".", ",")}×`)));
    const leiste = h("div", {class: "si-steuer"},
      k("anfang", "An den Anfang", () => { anhalten(z); z.pos = -1; markieren(z, -1); }, "Pos1"),
      k("zurueck", "Schritt zurück", () => { anhalten(z); schritt(z, -1); }, "←"),
      z.playEl,
      k("vor", "Schritt vor", () => { anhalten(z); schritt(z, +1); }, "→"),
      z.posEl, tempo);
    posText(z);
    return leiste;
  }
  function filterLeiste(z){
    const protos = [...new Set(z.ereignisse.map(e => e.proto).filter(Boolean))];
    const anzahl = p => z.ereignisse.filter(e => e.proto === p).length;
    const drops = z.ereignisse.filter(e => istProblem(z, e)).length;
    const leiste = h("div", {class: "si-filter", role: "group", "aria-label": "Filter"},
      h("span", {class: "si-filter-titel"}, "Filter:"),
      protos.map(p => {
        const an = !z.filter.size || z.filter.has(p);
        const b = h("button", {type: "button", class: "si-filter-knopf" + (an ? " an" : ""), "aria-pressed": String(z.filter.has(p)), title: `Nur ${p} zeigen (mehrere wählbar)`,
          onclick: () => { anhalten(z); if (z.filter.has(p)) z.filter.delete(p); else z.filter.add(p); if (z.filter.size === protos.length) z.filter.clear(); z.pos = -1; bauen(z); }},
          UI.pdu.chip(p), h("span", {class: "si-anzahl"}, String(anzahl(p))));
        return b;
      }),
      z.filter.size ? h("button", {type: "button", class: "si-filter-knopf", onclick: () => { z.filter.clear(); z.pos = -1; bauen(z); }}, "alle") : null,
      drops ? h("button", {type: "button", class: "si-filter-knopf" + (z.hatGrund ? " probleme" : "") + (z.nurProbleme ? " an" : ""), "aria-pressed": String(z.nurProbleme),
        onclick: () => { anhalten(z); z.nurProbleme = !z.nurProbleme; z.pos = -1; bauen(z); }},
        z.hatGrund ? h("span", {class: "si-sym bad", "aria-hidden": "true"}, "✕") : null, z.hatGrund ? `nur Probleme (${drops})` : `nur verworfene (${drops})`) : null);
    return leiste;
  }

  function zeile(z, e, i){
    const nv = niveau();
    const drop = e.art === "verwerfen" && istProblem(z, e);       /* normales Ignorieren ist kein „Drop“ im Sinne eines Fehlers */
    const ignoriert = e.art === "verwerfen" && !drop;
    const el = h("div", {class: `si-zeile art-${e.art}${drop ? " drop" : ""}${ignoriert || e.art === "lernen" || e.art === "info" ? " leise" : ""}`,
      role: "option", id: `sp-${zid(z)}-${i}`, "aria-selected": "false", "data-i": i,
      onclick: () => { anhalten(z); markieren(z, i, {klick: true}); }},
      h("span", {class: "si-n"}, String(e.n ?? i + 1)),
      h("span", {class: "si-t"}, zeit(e.t)),
      h("span", {class: "si-g"}, geraetName(e.geraet), e.port ? h("span", {class: "si-port"}, " " + e.port) : null),
      artSymbol(e.art),
      h("span", {class: "si-p"}, e.proto ? UI.pdu.chip(e.proto) : null),
      h("span", {class: "si-x"}, e.text || ""));
    if (drop || (e.grund && e.art !== "lernen")) {
      const m = drop ? meldungZu(z.ereignisse, z.idx.get(e)) : null;
      const sk = nv === "E" ? skillName(e.grund) : null;
      const lt = typeof DATEN !== "undefined" ? DATEN.lehrtexte?.[e.grund] : null;
      /* Textdiät (A4): Einstieg/AP1 sehen den Titel, der Lehrtext kommt erst auf „Erklär mir das“; AP2 sieht die Gerätemeldung */
      const ex = nv !== "AP2" && lt ? UI.erklaeren?.(e.grund, nv) : null;
      el.append(h("div", {class: "si-grundzeile"},
        e.grund && nv !== "AP2" ? h("code", {class: "si-grund"}, e.grund) : null,
        h("span", {class: "si-erklaerung"}, ex ? (sim()?.GRUENDE?.[e.grund]?.titel || e.grund) : erklaerung(e.grund) || ""),
        drop ? h("span", {class: m ? "si-kennung gemeldet" : "si-kennung still"}, m ? `↩ gemeldet von ${geraetName(m.geraet)}` : "still verworfen") : null,
        sk ? h("span", {class: "si-skill"}, `Fertigkeit: ${sk}`) : null,
        ex || (lt?.quelle && nv !== "AP2" ? h("span", {class: "si-quelle"}, `Quelle: ${lt.quelle}`) : null)));
    }
    return el;
  }
  let zaehler = 0;
  const zid = z => z.id ||= ++zaehler;

  function posText(z){
    if (!z.posEl) return;
    z.posEl.textContent = `${z.pos < 0 ? "–" : z.pos + 1} / ${z.liste ? z.liste.length : 0}`;
  }
  function markieren(z, i, o = {}){
    const liste = z.liste || [];
    z.pos = Math.max(-1, Math.min(i, liste.length - 1));
    posText(z);
    if (z.listeEl) {
      for (const el of $$(".si-zeile.aktuell", z.listeEl)) { el.classList.remove("aktuell"); el.setAttribute("aria-selected", "false"); }
      const el = z.pos >= 0 ? $(`[data-i="${z.pos}"]`, z.listeEl) : null;
      if (el) {
        el.classList.add("aktuell"); el.setAttribute("aria-selected", "true");
        z.listeEl.setAttribute("aria-activedescendant", el.id);
        const lr = z.listeEl.getBoundingClientRect(), er = el.getBoundingClientRect();
        if (er.top < lr.top || er.bottom > lr.bottom) el.scrollIntoView({block: "nearest", behavior: wenigBewegung() ? "auto" : "smooth"});
      } else { z.listeEl.removeAttribute("aria-activedescendant"); z.listeEl.scrollTop = 0; }
    }
    const e = z.pos >= 0 ? liste[z.pos] : null;
    if (z.pduEl) UI.pdu.zeigen(z.pduEl, e, e ? voriges(z.ereignisse, z.idx.get(e)) : null);
    if (!e || o.leise) return;
    const dauer = o.klick ? 1600 : Math.round(SCHRITT_MS / tempoMerk * 1.1);
    try { if (e.geraet) labor()?.hervorheben?.([{geraet: e.geraet, port: e.port || null}], dauer); } catch (x) { console.error(x); }
    if (o.animieren && e.art === "senden") { try { labor()?.animiere?.(e); } catch (x) { console.error(x); } }
  }
  function schritt(z, d){
    const n = (z.liste || []).length; if (!n) return false;
    const neu = z.pos + d;
    if (neu < 0 || neu >= n) return false;
    markieren(z, neu, {animieren: d > 0});
    return true;
  }
  function planen(z){
    z.timer = setTimeout(() => {
      if (!z.container.isConnected) return anhalten(z);
      if (!schritt(z, +1)) return anhalten(z);
      planen(z);
    }, SCHRITT_MS / tempoMerk);
  }
  function umschalten(z){
    if (z.spielt) return anhalten(z);
    if (!(z.liste || []).length) return;
    if (z.pos >= z.liste.length - 1) markieren(z, -1, {leise: true});
    z.spielt = true; playKnopf(z);
    if (schritt(z, +1)) planen(z); else anhalten(z);
  }
  function anhalten(z, still){
    if (z.timer) { clearTimeout(z.timer); z.timer = null; }
    if (still) return;
    z.spielt = false; playKnopf(z);
  }
  function playKnopf(z){
    if (!z.playEl) return;
    z.playEl.replaceChildren(icon(z.spielt ? "pause" : "play"));
    z.playEl.setAttribute("aria-label", z.spielt ? "Pause" : "Abspielen");
    z.playEl.title = (z.spielt ? "Pause" : "Abspielen") + " (Leertaste)";
  }
  function listenTaste(z, e){
    const n = (z.liste || []).length; if (!n) return;
    const nach = {ArrowDown: z.pos + 1, ArrowUp: z.pos - 1, Home: 0, End: n - 1, PageDown: z.pos + 10, PageUp: z.pos - 10}[e.key];
    if (nach == null) return;
    e.preventDefault(); e.stopPropagation(); anhalten(z);
    markieren(z, Math.max(0, Math.min(n - 1, nach)), {klick: true});
  }
  function panelTaste(z, e){
    const t = e.target, tag = t && t.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === " " && tag !== "BUTTON") { e.preventDefault(); e.stopPropagation(); umschalten(z); }
    else if (e.key === "ArrowRight" && tag !== "BUTTON") { e.preventDefault(); e.stopPropagation(); anhalten(z); schritt(z, +1); }
    else if (e.key === "ArrowLeft" && tag !== "BUTTON") { e.preventDefault(); e.stopPropagation(); anhalten(z); schritt(z, -1); }
  }

  return {zeigen, erfolg};
})();
