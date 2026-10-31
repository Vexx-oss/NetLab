"use strict";
/* ---------- Simulations-Panel „Flugschreiber" (Runde 7: Aufmerksamkeitsführung) ----------
   RUNDE 7 — eine ruhige Lesespalte, drei Ebenen, ein Hauptweg:
     Ebene 1 · Ergebnis: Mikrolabel (FLUGSCHREIBER · Kunde), eine große Urteilszeile und EINE ruhige
               Zahlenzeile; außer dem Format-Umschalter steht hier kein Knopf, keine Fläche.
     Ebene 2 · Befund: erster echter Fehler als Rail-Zeile (2-px-Balken links), Mikrolabel
               „ERSTER FEHLER", Gerät · Code, EIN Erklärungssatz, rechts der leise Weg „Zum Fundort →".
     Ebene 3 · Nächster Schritt: Anfänger-Hilfe als ruhige, numerierte Liste mit hängendem Einzug
               (Mikrolabels „Nächste Diagnose"/„Prüfen") und einem leisen Verweis „Gerät zeigen →".
   Knopfregel: höchstens EIN visuell primärer Knopf je Zustand (leer: „Ping-Werkzeug wählen →",
   Ergebnis-Ansicht: „Schritt für Schritt ansehen →"); alles andere ist Ghost (32 px, keine Füllfläche).
   Die 44-px-Trefferflächenregel bleibt nur als unsichtbare Trefferfläche für Transport/Filter/Tempo
   erhalten (Test ui-trefferflaechen) — sichtbar sind es leise Text-/Icon-Zeilen.
   Testhaken .si-*, Verhalten, Transport, Zeitachse und PDU bleiben unverändert.
   UI.simpanel.zeigen(container, trace)
     Spielt eine Trace (Architektur § 5.2) ab – es rechnet nichts nach, es zeigt nur, was die Simulation
     aufgezeichnet hat. Der Kopf nennt Kunde (aus dem offenen Auftrag), Ergebnis groß und „Was/Wo";
     darunter der Warnbanner mit dem ERSTEN echten Fehler und „Zum Fundort" (zentraler Resolver
     UI.fehlerziel.springen), die Transportleiste (Play/Pause, Schritt, Tempo – alle ≥ 44 px), der
     Format-Umschalter Ergebnis / Schritt für Schritt und die Zeitachse mit Schichtbändern.
     JEDE Fehler-/Warnmeldung ist anklickbar und springt über denselben Resolver ins Ziel
     (Gerät, Port, Kabel, Ebene) – kein Fokusklau, „Bewegung aus" respektiert.
   Anfänger-Hilfe (store „einst".anfaengerHilfe, Standard an bei Karrierestufe ≤ 2):
     an  = Hinweise, Highlight des benötigten Interaktionselements und Schritt für Schritt aus
           Spiel.naechsteDiagnose / Spiel.hilfe.anfaengerSchritte (nur vorhandene Daten, keine Lösung);
     aus = ruhige Profi-Sicht. Der Umschalter sitzt im Panel-Kopf; die Einstellungen spiegeln ihn.
   Die Anzeige ruft UI.labor.animiere(ereignis) für „senden"-Ereignisse und UI.pdu.zeigen für den Rahmen.
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
  const zeit = t => t == null ? "" : Number(t).toLocaleString("de-DE", {maximumFractionDigits: 1}) + " ms";
  /* Genau EIN Erklärungssatz für Ebene 2 – nie der ganze Hinweistext. */
  function ersterSatz(text){
    const t = String(text == null ? "" : text).replace(/\s+/g, " ").trim();
    if (!t) return "";
    const m = t.match(/^.*?[.!?](?=\s|$)/);
    return m ? m[0] : t;
  }

  /* ---------- Anfänger-Hilfe (Strang C): gespeicherte Wahl, Standard nach Karrierestufe ---------- */
  const einst = () => (store.get("einst", {}) || {});
  function karriereStufe(){ try { return +(Spiel && Spiel.st && Spiel.st.stufe) || 1; } catch (e) { return 1; } }
  function standardHilfe(){ try { return karriereStufe() <= 2; } catch (e) { return true; } }
  function anfaengerHilfe(){ const e = einst(); return typeof e.anfaengerHilfe === "boolean" ? e.anfaengerHilfe : standardHilfe(); }
  function anfaengerHilfeSetzen(an){ const e = einst(); e.anfaengerHilfe = !!an; store.set("einst", e); }
  function instanz(){ try { return (typeof Spiel !== "undefined" && UI.spiel && UI.spiel.inst) || null; } catch (e) { return null; } }
  function kundeName(){
    try {
      const I = instanz();
      if (!I) return null;
      const def = typeof Spiel.defVon === "function" ? Spiel.defVon(I) : null;
      const kid = I.kunde || (def && def.kunde) || null;
      if (!kid) return null;
      const k = (typeof Spiel.kundenDaten === "function" ? Spiel.kundenDaten(kid) : null) || (typeof DATEN !== "undefined" && DATEN.kunden ? DATEN.kunden[kid] : null);
      return k && k.name ? String(k.name) : null;
    } catch (e) { return null; }
  }
  const sym = (name, px) => (typeof UI.symbol === "function" ? UI.symbol(name, px)
    : sv("svg", {viewBox: "0 0 24 24", width: px, height: px, "aria-hidden": "true"},
      sv("path", {d: "M4 12h16M12 4v16", fill: "none", stroke: "currentColor", "stroke-width": "1.6"})));

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

  /* ---------- Schichtbänder (Zeitachse, Strang C) ---------- */
  const SCHICHT = {
    2: {name: "Sicherung", kurz: "L2"}, 3: {name: "Vermittlung", kurz: "L3"},
    4: {name: "Transport", kurz: "L4"}, 7: {name: "Anwendung", kurz: "L7"},
  };
  function schichtVon(e){
    const f = (e && e.frame) || {};
    if (f.app) return 7;
    if (f.tcp || f.udp) return 4;
    if (f.icmp || f.ip) return 3;
    if (f.arp || f.eth) return 2;
    return 2;
  }

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
  /* Erster echter Fehler der Trace – nie erfunden; ohne ihn gibt es keinen Warnbanner. */
  function erstesProblem(z){
    if (z.trace && z.trace.abbruch === "STORM") return {e: null, grund: "STORM"};
    const ev = z.ereignisse;
    for (let i = 0; i < ev.length; i++) if (ev[i].art === "verwerfen" && ev[i].grund) return {e: ev[i], i};
    for (let i = 0; i < ev.length; i++) if (istMeldung(ev[i])) return {e: ev[i], i};
    return null;
  }
  /* Eine Zeile „Was/Wo" – nur aus der Trace abgeleitet. */
  function wasWo(z, ok){
    const ev = z.ereignisse, teile = [];
    const send = ev.find(e => e.art === "senden" && e.geraet);
    if (send) teile.push("von " + geraetName(send.geraet));
    const zielIp = send && send.frame && send.frame.ip ? send.frame.ip.dst : null;
    if (zielIp) teile.push("nach " + zielIp);
    const drop = !ok && z.hatGrund ? ev.find(e => e.art === "verwerfen" && e.grund) : null;
    if (drop) teile.push("hängt bei " + geraetName(drop.geraet) + (drop.port ? " " + drop.port : ""));
    else { const letzt = [...ev].reverse().find(e => e.geraet); if (letzt && send && letzt.geraet !== send.geraet) teile.push("bis " + geraetName(letzt.geraet)); }
    return teile.join(" · ");
  }

  /* Zentraler Sprung zum Fundort. Der Resolver entscheidet; fehlt er, bleibt die ruhige Auswahl. */
  function springe(e){
    const ziel = (typeof UI.fehlerziel !== "undefined" && UI.fehlerziel && typeof UI.fehlerziel.zielAusEreignis === "function") ? UI.fehlerziel.zielAusEreignis(e) : null;
    try {
      if (ziel && typeof UI.fehlerziel.springen === "function") {
        const r = UI.fehlerziel.springen(ziel);
        if (r && r.ok) return true;
      }
      if (e && e.geraet) { labor()?.auswaehlen?.(e.geraet, e.port || undefined); labor()?.zentrieren?.(e.geraet); return true; }
    } catch (x) { console.error("Fehlerziel", x); }
    return false;
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
    container.classList.add("si");
    container.dataset.breite = container.clientWidth && container.clientWidth < 720 ? "schmal" : "breit";
    bauen(z);
  }

  function sichtbar(z){
    const f = z.filter;
    return z.ereignisse.filter(e => (!f.size || f.has(e.proto)) && (!z.nurProbleme || istProblem(z, e)));
  }

  /* Ebene-3-Schalter: kleiner Ghost-Knopf mit Punkt – kein zweiter Hauptknopf. */
  function hilfeKnopf(z){
    const an = anfaengerHilfe();
    return h("button", {type: "button", class: "si-hilfe-knopf" + (an ? " an" : ""), "aria-pressed": String(an),
      title: an ? "Anfänger-Hilfe ausschalten – ruhige Profi-Sicht" : "Anfänger-Hilfe einschalten: Hinweise und der nächste Schritt",
      onclick: () => { anfaengerHilfeSetzen(!anfaengerHilfe()); anhalten(z); bauen(z); }},
      h("span", {class: "si-hilfe-punkt", "aria-hidden": "true"}), h("span", {}, an ? "Hilfe an" : "Hilfe aus"));
  }
  function bauen(z){
    const c = z.container;
    c.replaceChildren();
    if (!z.trace) {
      c.append(h("div", {class: "si-leer"},
        h("div", {class: "si-kopf-oben"}, h("span", {class: "si-kicker"}, "FLUGSCHREIBER"), hilfeKnopf(z)),
        h("strong", {class: "si-leer-titel"}, "Noch keine Aufzeichnung."),
        h("p", {class: "si-leer-text"}, "Starte einen Ping oder eine Prüfung. Hier siehst du dann jedes Paket: wer sendet, wer weiterleitet, wo etwas verworfen wird – und warum."),
        anfaengerHilfe() ? h("p", {class: "si-leer-tipp"}, "Anfänger-Hilfe ist an: Sobald ein Auftrag offen ist, nennt sie den nächsten Schritt.") : null,
        h("div", {class: "si-leer-aktionen"},
          h("button", {type: "button", class: "si-knopf haupt", onclick: () => { try { labor()?.werkzeug?.("ping"); } catch (e) { /* Anzeige */ } }}, "Ping-Werkzeug wählen →"))));
      return;
    }
    const ok = erfolg(z.trace), ev = z.ereignisse;
    c.classList.toggle("si-hilfe-an", anfaengerHilfe());
    c.append(h("p", {class: "si-veraltet", hidden: !z.veraltet, role: "status"},
      h("span", {class: "si-sym", "aria-hidden": "true"}, "!"), "Das Netz wurde seitdem geändert – diese Aufzeichnung zeigt den Stand davor. Starte die Prüfung neu."));
    const p = erstesProblem(z);
    /* Ebene 2 (Befund-Rail) nur in der Schritt-Ansicht: die Ergebnis-Ansicht zeigt ihre Befunde
       bereits als eigene Rail-Zeilen – keine zweite, gleich laute Zeile. */
    const rail = !!p && z.modus !== "ergebnis";
    c.append(kopf(z, ok, rail));
    if (rail) c.append(warnBanner(z, p));
    if (anfaengerHilfe()) c.append(hilfeBox(z));
    if (z.modus === "ergebnis") { c.append(ergebnisAnsicht(z, ok)); return; }
    z.liste = sichtbar(z);
    c.append(h("div", {class: "si-leiste"}, steuerung(z), filterLeiste(z)));
    const liste = h("div", {class: "si-liste", role: "listbox", tabindex: "0", "aria-label": "Ereignisliste der Simulation"});
    z.listeEl = liste;
    const zeig = z.liste.slice(0, MAX_ZEILEN);
    zeig.forEach((e, i) => liste.append(zeile(z, e, i)));
    if (z.liste.length > MAX_ZEILEN) liste.append(h("p", {class: "si-hinweis"}, "… " + zahlDe(z.liste.length - MAX_ZEILEN) + " weitere Ereignisse nicht angezeigt (Filter eingrenzen)."));
    if (!z.liste.length) liste.append(h("p", {class: "si-hinweis"}, ev.length ? "Kein Ereignis passt zum Filter." : "Die Aufzeichnung ist leer."));
    liste.addEventListener("keydown", e => listenTaste(z, e));
    z.pduEl = h("div", {class: "si-pdu", tabindex: "0", "aria-label": "PDU-Inspektor"});
    c.append(h("div", {class: "si-haupt"}, liste, z.pduEl));
    UI.pdu.zeigen(z.pduEl, null, null);
    c.onkeydown = e => panelTaste(z, e);
    if (z.pos >= 0) markieren(z, z.pos, {leise: true});
  }

  /* Ebene 1 – Ergebnis: Mikrolabel, EINE große Urteilszeile, EINE ruhige Zahlenzeile, Segment-Leiste.
     Kein Rahmen, keine Fläche, kein zusätzlicher Knopf (Runde 7 § 1). */
  function kopf(z, ok, mitBanner){
    const t = z.trace, ev = z.ereignisse;
    const kunde = kundeName();
    const meldung = ev.find(istMeldung), drops = ev.filter(e => e.art === "verwerfen");
    const zeile2 = [];
    if (!mitBanner) {
      if (t.abbruch === "STORM") zeile2.push(h("span", {class: "si-kennung bad"}, "Broadcast-Sturm: nach " + zahlDe(ev.length) + " Ereignissen abgebrochen"));
      else if (meldung) zeile2.push(h("span", {class: "si-kennung gemeldet"}, "↩ gemeldet: " + ICMPTEXT[meldung.frame.icmp.typ] + " von " + geraetName(meldung.geraet)));
      else if (!ok && drops.length) zeile2.push(h("span", {class: "si-kennung still"}, "… ohne Fehlermeldung zurück (Timeout)"));
    }
    const dauer = ev.length ? (ev[ev.length - 1].t ?? 0) - (ev[0].t ?? 0) : 0;
    const geraete = new Set(ev.map(e => e.geraet)).size;
    const zusammen = String(t.zusammenfassung || "").replace(/^[✓✔✗✕×]\s*/, "").trim();
    const ww = wasWo(z, ok);
    /* EINE ruhige Zahlenzeile: bei Fehlern nur die harten Zahlen (der Befund darunter trägt den Satz). */
    const zahlen = [];
    if (ok) zahlen.push(zusammen || ww || "Die Pakete sind angekommen.");
    zahlen.push(zahlDe(ev.length) + " " + (ev.length === 1 ? "Ereignis" : "Ereignisse"),
      geraete + (geraete === 1 ? " Gerät" : " Geräte"),
      zeit(dauer) + " virtuelle Zeit");
    return h("header", {class: "si-kopf " + (ok ? "ok" : "bad")},
      h("div", {class: "si-kopf-oben"},
        h("span", {class: "si-kicker"}, "FLUGSCHREIBER" + (kunde ? " · " + kunde : "")),
        hilfeKnopf(z)),
      h("div", {class: "si-kopf-urteil"},
        h("span", {class: "si-gross", "aria-hidden": "true"}, ok ? "✓" : "✗"),
        h("div", {class: "si-zus"}, h("strong", {}, ok ? "Hat geklappt" : "Hat nicht geklappt"))),
      h("p", {class: "si-statistik", title: zahlen.join(" · ")}, zahlen.join(" · ")),
      zeile2.length ? h("p", {class: "si-zeile2"}, zeile2) : null,
      h("div", {class: "si-kopf-unten"},
        h("div", {class: "si-modus", role: "radiogroup", "aria-label": "Ansicht"},
          modusKnopf(z, "ergebnis", "Ergebnis"), modusKnopf(z, "schritt", "Schritt für Schritt"))));
  }
  function modusKnopf(z, m, text){
    const an = z.modus === m;
    return h("button", {type: "button", role: "radio", "aria-checked": String(an), class: an ? "an" : "", tabindex: an ? "0" : "-1",
      onclick: () => { if (z.modus === m) return; anhalten(z); z.modus = modusMerk = m; bauen(z); $(".si-modus [aria-checked=\"true\"]", z.container)?.focus(); },
      onkeydown: e => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); const n = m === "ergebnis" ? "schritt" : "ergebnis"; anhalten(z); z.modus = modusMerk = n; bauen(z); $(".si-modus [aria-checked=\"true\"]", z.container)?.focus(); } }}, text);
  }
  /* Ebene 2 – Befund: ruhige Zeile mit 2-px-Rail in der Fehlerfarbe, EIN Erklärungssatz,
     rechts der leise Sprung. Kein Warnbanner, keine Fläche (Runde 7 § 1). */
  function warnBanner(z, p){
    const e = p.e, nv = niveau();
    const geraet = e && e.geraet ? geraetName(e.geraet) + (e.port ? " " + e.port : "") : null;
    const code = e && e.grund ? e.grund : null;
    const voll = e && e.grund ? erklaerung(e.grund) : "Die Simulation hat das Ereignis-Budget überschritten.";
    const satz = ersterSatz(voll) || voll || "";
    const ort = geraet ? geraet + (code && nv !== "AP2" ? " · " + code : "") : (code || "Abbruch");
    return h("section", {class: "si-warn", role: "status", title: voll},
      h("div", {class: "si-warn-kopf"},
        h("span", {class: "si-sym bad", "aria-hidden": "true"}, "✕"),
        h("span", {class: "si-kicker"}, "ERSTER FEHLER"),
        h("span", {class: "si-warn-ort"}, ort),
        e && e.geraet ? h("button", {type: "button", class: "si-knopf klein si-zumfundort",
          title: "Zum Fundort: Gerät auswählen, Inspektor zeigen, hervorheben",
          onclick: ev => { ev.stopPropagation(); springe(e); }}, "Zum Fundort →") : null),
      h("p", {class: "si-warn-text"}, satz));
  }

  /* Anfänger-Hilfe: nur vorhandene Daten (naechsteDiagnose, naechster, handlungsHinweise), keine Lösung. */
  function hilfeDaten(){
    const I = instanz();
    if (!I) return {schritte: [], ort: null};
    const schritte = [];
    try {
      const d = typeof Spiel.naechsteDiagnose === "function" ? Spiel.naechsteDiagnose(I) : null;
      if (d) schritte.push({art: "diagnose", titel: "Nächste Diagnose", text: d});
    } catch (e) { /* Anzeige */ }
    try {
      if (Spiel.hilfe && typeof Spiel.hilfe.anfaengerSchritte === "function") {
        for (const s of Spiel.hilfe.anfaengerSchritte(I) || []) {
          const text = String(s.text || "");
          if (text && !schritte.some(x => x.text === text)) schritte.push({art: s.art, titel: s.art === "leiter" ? "Prüfen" : "Schritt", text});
        }
      }
    } catch (e) { /* Anzeige */ }
    let ort = null;
    try { if (typeof Spiel.naechsterOrt === "function") ort = Spiel.naechsterOrt(I); } catch (e) { /* Anzeige */ }
    return {schritte: schritte.slice(0, 2), ort};
  }
  const DOCK_NAME = {terminal: "Terminal", plan: "Plan", postfach: "Postfach", inspektor: "Inspektor"};
  function hilfeBox(z){
    const {schritte, ort} = hilfeDaten();
    const aktionen = [];
    if (ort && ort.geraet) aktionen.push(h("button", {type: "button", class: "si-knopf klein",
      onclick: () => { try { labor()?.hervorheben?.([{geraet: ort.geraet}], 2200); labor()?.auswaehlen?.(ort.geraet); } catch (e) { /* Anzeige */ } }}, "Gerät zeigen →"));
    if (ort && ort.dock) aktionen.push(h("button", {type: "button", class: "si-knopf klein",
      onclick: () => { try { labor()?.dock?.(ort.dock); } catch (e) { /* Anzeige */ } }}, "Zum " + (DOCK_NAME[ort.dock] || ort.dock) + " →"));
    /* Benötigtes Interaktionselement hervorheben (kein Fokusklau): Dock-Reiter pulsieren lassen. */
    if (ort && ort.dock && typeof document !== "undefined" && document.querySelector) {
      try {
        const tab = document.querySelector(".lb-dock-tab[data-reiter=\"" + ort.dock + "\"]");
        if (tab && tab.classList) { tab.classList.add("si-hilfe-puls"); setTimeout(() => tab.classList.remove("si-hilfe-puls"), 3600); }
      } catch (e) { /* Anzeige */ }
    }
    return h("section", {class: "si-hilfe", "aria-label": "Anfänger-Hilfe"},
      h("div", {class: "si-hilfe-kopf"},
        h("span", {class: "si-kicker"}, "NÄCHSTER SCHRITT"),
        h("span", {class: "si-hilfe-meta"}, "Hinweise, keine Lösung")),
      schritte.length
        ? h("ol", {class: "si-hilfe-liste"}, schritte.map((s, i) => h("li", {class: "si-hilfe-schritt", title: s.text},
            h("span", {class: "si-hilfe-nr", "aria-hidden": "true"}, String(i + 1)),
            h("span", {class: "si-hilfe-titel"}, s.titel),
            h("span", {}, s.text))))
        : h("p", {class: "si-hilfe-leer"}, instanz() ? "Gerade ist alles erledigt – kein offener Schritt." : "Öffne einen Auftrag: Dann zeigt die Hilfe den nächsten Schritt."),
      aktionen.length ? h("div", {class: "si-hilfe-aktionen"}, aktionen) : null);
  }

  function ergebnisAnsicht(z, ok){
    const ev = z.ereignisse, box = h("div", {class: "si-ergebnis"});
    const alle = ev.map((e, i) => ({e, i})).filter(x => x.e.art === "verwerfen");
    const drops = z.hatGrund ? alle.filter(x => x.e.grund) : ok ? [] : alle;
    if (z.trace.abbruch === "STORM") box.append(problem(z, {art: "verwerfen", grund: "STORM", geraet: null, text: "Die Simulation hat das Ereignis-Budget überschritten."}, null));
    if (drops.length) {
      box.append(h("h4", {}, drops.length === 1 ? "Hier hängt es" : "Hier hängt es (" + drops.length + " Stellen)"));
      for (const {e, i} of drops.slice(0, 4)) box.append(problem(z, e, meldungZu(ev, i)));
      if (drops.length > 4) box.append(h("p", {class: "si-hinweis"}, "… und " + (drops.length - 4) + " weitere. Alle stehen in der Schritt-für-Schritt-Ansicht."));
    } else if (ok && alle.length) box.append(h("p", {class: "si-hinweis"}, "Das Ziel wurde erreicht. Unterwegs wurden " + alle.length + " Rahmen verworfen, ohne dass etwas kaputt ist: Geräte ignorieren Rahmen, die nicht für sie bestimmt sind (z. B. fremde ARP- und DHCP-Broadcasts), und ein Router verwirft das erste Paket, solange er per ARP nachfragt."));
    else if (ok) box.append(h("p", {class: "si-hinweis"}, "Kein Paket wurde verworfen. In der Schritt-für-Schritt-Ansicht siehst du den Weg jedes einzelnen Rahmens."));
    box.append(h("button", {type: "button", class: "si-knopf haupt", onclick: () => { z.modus = modusMerk = "schritt"; bauen(z); }}, "Schritt für Schritt ansehen"));
    return box;
  }
  function problem(z, e, meldung){
    const nv = niveau();
    const karte = h("div", {class: "si-problem"},
      h("div", {class: "si-problem-kopf"},
        h("span", {class: "si-sym bad", "aria-hidden": "true"}, "✕"),
        h("strong", {}, e.geraet ? geraetName(e.geraet) + (e.port ? " " + e.port : "") + " verwirft" : "Abbruch"),
        e.proto ? UI.pdu.chip(e.proto) : null,
        e.grund && nv !== "AP2" ? h("code", {class: "si-grund"}, e.grund) : null),
      e.text ? h("p", {}, e.text) : null,
      e.grund ? h("p", {class: "si-erklaerung"}, erklaerung(e.grund)) : null,
      e.geraet ? h("p", {class: meldung ? "si-kennung gemeldet" : "si-kennung still"}, meldung
        ? geraetName(meldung.geraet) + " meldet es zurück: " + ICMPTEXT[meldung.frame.icmp.typ]
        : "Still verworfen – niemand schickt eine Fehlermeldung zurück.") : null);
    if (e.geraet) karte.append(h("div", {class: "si-zeile-knoepfe"},
      h("button", {type: "button", class: "si-knopf klein", onclick: () => labor()?.hervorheben?.([{geraet: e.geraet, port: e.port || null}], 2000)}, "Gerät zeigen →"),
      h("button", {type: "button", class: "si-knopf klein si-zumfundort", onclick: () => springe(e)}, "Zum Fundort →")));
    return karte;
  }

  function steuerung(z){
    const k = (name, label, fn, taste) => h("button", {type: "button", class: "si-steuer-knopf", "aria-label": label, title: label + (taste ? " (" + taste + ")" : ""), onclick: fn}, icon(name));
    z.playEl = k(z.spielt ? "pause" : "play", z.spielt ? "Pause" : "Abspielen", () => umschalten(z), "Leertaste");
    z.posEl = h("span", {class: "si-pos", "aria-live": "off"});
    const tempo = h("div", {class: "si-tempo", role: "radiogroup", "aria-label": "Tempo"},
      TEMPI.map(t => h("button", {type: "button", role: "radio", "aria-checked": String(tempoMerk === t), class: tempoMerk === t ? "an" : "",
        onclick: ev => { tempoMerk = t; for (const b of $$("button", ev.currentTarget.parentNode)) { const an = b === ev.currentTarget; b.classList.toggle("an", an); b.setAttribute("aria-checked", String(an)); } if (z.spielt) { anhalten(z, true); planen(z); } }},
        String(t).replace(".", ",") + "×")));
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
      h("span", {class: "si-filter-titel"}, "FILTER"),
      protos.map(p => {
        const an = z.filter.size > 0 && z.filter.has(p);
        const b = h("button", {type: "button", class: "si-filter-knopf" + (an ? " an" : ""), "aria-pressed": String(z.filter.has(p)), title: "Nur " + p + " zeigen (mehrere wählbar)",
          onclick: () => { anhalten(z); if (z.filter.has(p)) z.filter.delete(p); else z.filter.add(p); if (z.filter.size === protos.length) z.filter.clear(); z.pos = -1; bauen(z); }},
          h("span", {}, p), h("span", {class: "si-anzahl"}, String(anzahl(p))));
        return b;
      }),
      z.filter.size ? h("button", {type: "button", class: "si-filter-knopf", onclick: () => { z.filter.clear(); z.pos = -1; bauen(z); }}, "alle") : null,
      drops ? h("button", {type: "button", class: "si-filter-knopf" + (z.hatGrund ? " probleme" : "") + (z.nurProbleme ? " an" : ""), "aria-pressed": String(z.nurProbleme),
        onclick: () => { anhalten(z); z.nurProbleme = !z.nurProbleme; z.pos = -1; bauen(z); }},
        z.hatGrund ? h("span", {class: "si-sym bad", "aria-hidden": "true"}, "✕") : null, z.hatGrund ? "nur Probleme (" + drops + ")" : "nur verworfene (" + drops + ")") : null);
    return leiste;
  }

  /* Eine Zeile der Zeitachse: Schichtband, Nr., Zeit, Gerät/Port, Art, Protokoll, Kurztext.
     Fehler-/Warnmeldungen tragen einen „Zum Fundort"-Knopf (zentraler Resolver) – der Zeilenklick
     wählt und hebt weiterhin nur hervor. */
  function zeile(z, e, i){
    const nv = niveau();
    const drop = e.art === "verwerfen" && istProblem(z, e);
    const ignoriert = e.art === "verwerfen" && !drop;
    const schicht = schichtVon(e), sInfo = SCHICHT[schicht] || SCHICHT[2];
    const meld = istMeldung(e);
    const zielzeile = drop || meld;
    const el = h("div", {class: "si-zeile art-" + e.art + (drop ? " drop" : "") + (ignoriert || e.art === "lernen" || e.art === "info" ? " leise" : ""),
      role: "option", id: "sp-" + zid(z) + "-" + i, "aria-selected": "false", "data-i": i, "data-schicht": String(schicht),
      title: zielzeile ? "Klick: Zum Fundort springen" : null,
      onclick: () => { anhalten(z); markieren(z, i, {klick: true}); if (zielzeile) springe(e); }},
      h("span", {class: "si-band", "aria-hidden": "true"}),
      h("span", {class: "si-n"}, String(e.n ?? i + 1)),
      h("span", {class: "si-t"}, zeit(e.t)),
      h("span", {class: "si-g"}, geraetName(e.geraet), e.port ? h("span", {class: "si-port"}, " " + e.port) : null),
      artSymbol(e.art),
      h("span", {class: "si-p"}, e.proto ? UI.pdu.chip(e.proto) : null, h("span", {class: "si-schicht", title: "Schicht " + schicht + " · " + sInfo.name}, sInfo.kurz)),
      h("span", {class: "si-x"}, e.text || ""));
    if (drop || meld || (e.grund && e.art !== "lernen")) {
      const m = drop ? meldungZu(z.ereignisse, z.idx.get(e)) : null;
      const sk = nv === "E" ? skillName(e.grund) : null;
      const lt = typeof DATEN !== "undefined" ? DATEN.lehrtexte?.[e.grund] : null;
      const ex = nv !== "AP2" && lt ? UI.erklaeren?.(e.grund, nv) : null;
      el.append(h("div", {class: "si-grundzeile"},
        e.grund && nv !== "AP2" ? h("code", {class: "si-grund"}, e.grund) : null,
        h("span", {class: "si-erklaerung"}, ex ? (sim()?.GRUENDE?.[e.grund]?.titel || e.grund) : erklaerung(e.grund) || ""),
        drop ? h("span", {class: m ? "si-kennung gemeldet" : "si-kennung still"}, m ? "↩ gemeldet von " + geraetName(m.geraet) : "still verworfen") : null,
        meld ? h("span", {class: "si-kennung gemeldet"}, "↩ ICMP-Fehlermeldung") : null,
        sk ? h("span", {class: "si-skill"}, "Fertigkeit: " + sk) : null,
        ex || (lt?.quelle && nv !== "AP2" ? h("span", {class: "si-quelle"}, "Quelle: " + lt.quelle) : null)));
    }
    return el;
  }
  let zaehler = 0;
  const zid = z => z.id ||= ++zaehler;

  function posText(z){
    if (!z.posEl) return;
    const n = z.liste ? z.liste.length : 0;
    z.posEl.textContent = (z.spielt ? "läuft · " : "") + (z.pos < 0 ? "–" : String(z.pos + 1)) + " / " + n;
  }
  function markieren(z, i, o = {}){
    const liste = z.liste || [];
    z.pos = Math.max(-1, Math.min(i, liste.length - 1));
    posText(z);
    if (z.listeEl) {
      for (const el of $$(".si-zeile.aktuell", z.listeEl)) { el.classList.remove("aktuell"); el.setAttribute("aria-selected", "false"); }
      const el = z.pos >= 0 ? $("[data-i=\"" + z.pos + "\"]", z.listeEl) : null;
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
    z.spielt = false; playKnopf(z); posText(z);
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

  return {zeigen, erfolg, anfaengerHilfe, anfaengerHilfeSetzen};
})();
