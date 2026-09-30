"use strict";
/* ---------- Karriere-Oberfläche: Kunden, Shop, Lernstand (mit Prüfungstag), Wiki, Leiste, Einstellungen ----------
   Logik in spiel/karriere.js, wirtschaft.js, wartung.js, playbooks.js, offline.js, mini.js, tag.js, pruefung.js.
   Takt: Spiel.tick alle 60 s und beim Sichtbarwerden (Zeit über Zeitstempel, nicht über Ticks). */
UI.karriere = (() => {
  const K = {wikiWahl: null, wikiSuche: "", mini: {antwort: null, ergebnis: null, auswahl: [], links: null}};
  const kd = id => Spiel.karriere.kunde(id);
  const AMPEL = {gruen: ["ok", "●", "läuft"], gelb: ["warn", "▲", "Frist überschritten"], rot: ["bad", "■", "steht – kein Geld"]};
  const NIV = {E: "Einstieg", AP1: "AP1", AP2: "AP2"};

  /* ---------- Kunden ---------- */
  function kundenAnsicht(c){
    const st = Spiel.st;
    const karten = Spiel.karriere.kundenIds().map(id => {
      const k = kd(id), offen = Spiel.karriere.kundeOffen(id), vertrag = Spiel.karriere.hatVertrag(id);
      const ampel = vertrag ? Spiel.wartung.ampelBei(id) : null, a = AMPEL[ampel] || null;
      const sterne = Spiel.karriere.sterneBei ? Spiel.karriere.sterneBei(id) : null;
      const shopEintrag = Spiel.shop.liste().find(e => e.id === "vertrag:" + id);
      return h("article", {class: "kr-kunde" + (offen ? "" : " zu"), style: {"--k": `var(${k.farbe || "--accent"})`}},
        h("header", {}, h("span", {class: "sp-kunde-sym gross"}, k.symbol),
          h("div", {}, h("h3", {}, k.name), h("span", {class: "sp-leise"}, [k.ansprechpartner, k.rolle].filter(Boolean).join(", ")))),
        h("p", {class: "kr-text"}, offen ? k.beschreibung : `Ab Stufe ${k.stufe} (${Spiel.KARRIERE_STUFEN.find(x => x.nr === k.stufe)?.name || ""}) und ${k.abRuf} Ruf. ${k.spaeter ? "Kommt in einer späteren Version." : ""}`),
        offen ? h("div", {class: "kr-kunde-fuss"},
          h("span", {class: "sp-chip"}, "Stufe " + k.stufe),
          sterne && sterne.anzahl ? h("span", {class: "sp-chip geld", title: `${sterne.anzahl} Tickets`}, `★ ${String(sterne.schnitt ?? sterne.mittel ?? "").replace(".", ",")}`) : null,
          vertrag ? h("span", {class: "kr-ampel " + a[0]}, a[1] + " Vertrag: " + a[2] + ` · ${eur(k.euroProStunde)} €/h`) :
            shopEintrag ? h("button", {type: "button", class: "knopf klein" + (shopEintrag.zustand === "kaufbar" ? " primaer" : ""), disabled: shopEintrag.zustand !== "kaufbar", title: shopEintrag.grund || "",
              onclick: () => kaufen(shopEintrag.id, () => kundenAnsicht(c))}, `Wartungsvertrag anbieten · ${eur(shopEintrag.preis)} €`) : null) : h("span", {class: "kr-schloss"}, "🔒"));
    });
    c.replaceChildren(h("div", {class: "kr-seite"}, h("header", {class: "kr-kopf"}, h("h2", {}, "Kunden"),
      h("p", {class: "sp-leise"}, `Stufe ${st.stufe} · ${st.ruf} Ruf · ${Spiel.karriere.vertragskunden().length} Wartungsverträge · ${eur(Spiel.euroProStunde())} €/h passiv`)),
      h("div", {class: "kr-raster"}, karten)));
  }
  function kaufen(id, danach){
    const r = Spiel.shop.kaufen(id);
    if (r && r.ok) UI.toast(r.satz ? `„${r.satz}“` : "Gekauft.", "ok", {titel: "Erledigt"});
    else UI.toast((r && r.grund) || "Das ging nicht.", "warn");
    danach && danach();
  }

  /* ---------- Shop ---------- */
  function shopAnsicht(c){
    const liste = Spiel.shop.liste();
    const gruppen = {};
    for (const e of liste) (gruppen[e.gruppe || "Sonstiges"] ||= []).push(e);
    const ZUSTAND = {kaufbar: "", "zu-teuer": "teuer", gekauft: "gekauft", aktiv: "gekauft", veraltet: "veraltet", gesperrt: "gesperrt"};
    c.replaceChildren(h("div", {class: "kr-seite"},
      h("header", {class: "kr-kopf"}, h("h2", {}, "Shop"), h("p", {class: "sp-leise"}, `Du hast ${eur(Spiel.st.euro)} €. Werkzeuge, Simulation und Hilfe sind immer frei – hier gibt es Automatisierung, Verträge und Aussehen.`)),
      ...Object.entries(gruppen).map(([g, es]) => h("section", {class: "kr-gruppe"}, h("h3", {}, g),
        h("div", {class: "kr-raster klein"}, es.map(e => h("article", {class: "kr-ware " + (ZUSTAND[e.zustand] ?? "")},
          h("b", {}, e.titel), h("p", {}, e.text || ""),
          h("div", {class: "kr-ware-fuss"},
            e.preis != null && e.zustand !== "gekauft" && e.zustand !== "aktiv" ? h("span", {class: "kr-preis"}, eur(e.preis) + " €") : h("span", {}),
            e.zustand === "kaufbar" ? h("button", {type: "button", class: "knopf klein primaer", onclick: () => kaufen(e.id, () => shopAnsicht(c))}, "Kaufen") :
            e.zustand === "veraltet" ? h("button", {type: "button", class: "knopf klein", onclick: () => training(e.skill)}, "Wiederholung jetzt") :
            h("span", {class: "kr-status"}, {gekauft: "✓ gekauft", aktiv: "✓ läuft", "zu-teuer": e.grund || "zu teuer", gesperrt: "🔒 " + (e.grund || "gesperrt")}[e.zustand] || ""))))))),
      h("p", {class: "sp-leise kr-fuss"}, "Playbooks lösen Wartungs-Tickets ihrer Fertigkeit automatisch (60 % Ertrag, ohne Lernwirkung). Ist die Fertigkeit im Lernstand fällig, pausiert das Playbook, bis du die Wiederholung gemacht hast.")));
  }
  function training(skill){
    const r = Spiel.karriere.training(skill);
    if (r.art === "mini") { UI.toast("Ein Mini-Ticket wartet in der Leiste – oder direkt hier.", "info", {aktion: {text: "Jetzt lösen", fn: () => miniDialog()}}); }
    else if (r.art === "ticket") { UI.spiel.oeffnen(r.inst.iid); }
    else UI.toast(r.grund, "info");
  }

  /* ---------- Lernstand ---------- */
  function lernstandAnsicht(c){
    const info = Spiel.stufeInfo(), st = Spiel.st;
    const stufen = [1, 2, 3, 4, 5, 6].map(nr => {
      const skills = (DATEN.skills || []).filter(s => (s.stufe || 1) === nr);
      const def = Spiel.karriere.stufeDef(nr);
      return h("section", {class: "kr-stufe" + (nr > st.stufe ? " zu" : "") + (nr === st.stufe ? " jetzt" : "")},
        h("h3", {}, `Stufe ${nr} · ${def.name}`, nr > st.stufe ? h("small", {}, ` ab ${def.ruf} Ruf`) : null),
        h("div", {class: "kr-ringe"}, skills.map(s => {
          const box = typeof L !== "undefined" ? L.box(s.id) : 0, faellig = typeof L !== "undefined" && L.istFaellig(s.id);
          return h("button", {type: "button", class: "kr-skill" + (faellig ? " faellig" : ""), title: `${s.name}: ${typeof L !== "undefined" ? L.stufeName(s.id) : "neu"}${faellig ? " – fällig" : ""}`,
            onclick: () => nr <= st.stufe ? training(s.id) : UI.wiki.oeffnen(s.id)},
            h("span", {class: "sp-ring", style: {"--von": box / 5, "--nach": box / 5}}), h("span", {class: "kr-skill-name"}, s.name),
            h("small", {}, faellig ? "fällig" : typeof L !== "undefined" ? L.stufeName(s.id) : "neu"));
        })));
    });
    const fehler = typeof L !== "undefined" ? L.st.fehler.filter(f => String(f.spiel).startsWith("labor")).slice(0, 8) : [];
    const beh = typeof L !== "undefined" ? L.behalten() : null;
    const quote = k => beh && beh[k][1] ? `${Math.round(100 * beh[k][0] / beh[k][1])} %` : "–";
    const p = Spiel.pruefung.aktiv();
    c.replaceChildren(h("div", {class: "kr-seite"},
      h("header", {class: "kr-kopf"}, h("h2", {}, "Lernstand"), h("p", {class: "sp-leise"}, `Serie: ${typeof L !== "undefined" ? L.serie() : 0} Tage · heute ${typeof L !== "undefined" ? L.heuteZahl() : 0} Übungen`)),
      h("section", {class: "kr-karriere"},
        h("div", {}, h("small", {}, "Karriere"), h("h3", {}, `Stufe ${info.stufe} · ${info.name}`)),
        info.naechste ? h("div", {class: "kr-balken"},
          h("label", {}, `Ruf ${info.ruf.ist} / ${info.ruf.soll}`, h("span", {class: "kr-bar"}, h("i", {style: {width: Math.min(100, 100 * info.ruf.ist / Math.max(1, info.ruf.soll)) + "%"}}))),
          h("label", {}, `Können Stufe ${info.stufe}: ${info.koennen.summe} / ${info.koennen.sollSumme}`, h("span", {class: "kr-bar koennen"}, h("i", {style: {width: Math.min(100, 100 * info.koennen.summe / Math.max(1, info.koennen.sollSumme)) + "%"}})))) : h("p", {}, "Höchste Stufe erreicht."),
        info.fehlt.length ? h("ul", {class: "kr-fehlt"}, info.fehlt.map(f => h("li", {}, f))) : info.naechste ? h("p", {class: "sp-ok"}, "Bereit für den Aufstieg!") : null,
        h("p", {class: "sp-leise"}, info.hinweis)),
      h("section", {class: "kr-pruefung"}, h("h3", {}, "Zertifizierung (Prüfungstag)"),
        h("p", {class: "sp-leise"}, `3 Aufgaben, ${Spiel.PRUEFUNG.MINUTEN} Minuten, keine Hilfe – Note nach IHK-Punkteschlüssel. Die erste Prüfung ist gebührenfrei.`),
        p ? h("button", {type: "button", class: "knopf primaer", onclick: () => pruefungUebersicht()}, `Laufende Prüfung ${p.art} öffnen`) :
          h("div", {class: "sp-knoepfe"}, ["AP1", "AP2"].map(art => h("button", {type: "button", class: "knopf", onclick: () => pruefungStarten(art)}, `Prüfung ${art} starten (${Spiel.PRUEFUNG.GEBUEHR[art]} €)`))),
        (st.zertifikate || []).length ? h("div", {class: "kr-zert"}, st.zertifikate.map(z => h("span", {class: "kr-zertifikat"}, `🎓 ${z.art} · Note ${z.note} · ${datumDe(z.tag)}`))) : null,
        (st.pruefungen || []).length ? h("p", {class: "sp-leise"}, "Bisher: " + st.pruefungen.slice(-5).map(x => `${x.art} ${x.punkte} P. (Note ${x.note})`).join(" · ")) : null),
      ...stufen,
      h("section", {class: "kr-zwei"},
        h("div", {}, h("h3", {}, "Fehlerheft"), fehler.length ? h("ul", {class: "kr-fehlerheft"}, fehler.map(f => h("li", {}, h("b", {}, Spiel.karriere.skillName(f.unit) + ": "), f.text))) : h("p", {class: "sp-leise"}, "Noch leer.")),
        h("div", {}, h("h3", {}, "Behalten"), h("p", {class: "sp-leise"}, "Trefferquote bei fälligen Wiederholungen – die ehrliche Messung, ob es hängen bleibt."),
          h("dl", {class: "kr-behalten"}, h("dt", {}, "nach 1–2 Tagen"), h("dd", {}, quote("1")), h("dt", {}, "nach 3–6 Tagen"), h("dd", {}, quote("3")), h("dt", {}, "nach 7+ Tagen"), h("dd", {}, quote("7")))))));
  }

  /* ---------- Prüfungstag ---------- */
  function pruefungStarten(art){
    const r = Spiel.pruefung.starten(art);
    if (!r.ok) { UI.toast(r.grund, "warn"); return; }
    if (r.gebuehrErlassen) UI.toast("Die erste Prüfung ist gebührenfrei. Viel Erfolg!", "info");
    pruefungUebersicht();
  }
  let pruefZu = null;
  function pruefungUebersicht(){
    const p = Spiel.pruefung.aktiv(); if (!p) return;
    pruefZu?.();
    const rest = Spiel.pruefung.restMs(p), mm = Math.floor(rest / 60000), ss = String(Math.floor(rest / 1000) % 60).padStart(2, "0");
    const karte = h("div", {class: "sp-ergebnis"},
      h("h2", {}, `Prüfung ${p.art}`), h("p", {class: "sp-leise"}, `Restzeit ${mm}:${ss} · Keine Hilfe, keine Live-Ziele. Löse die Aufgaben in beliebiger Reihenfolge.`),
      h("ol", {class: "kr-aufgaben"}, p.aufgaben.map((iid, i) => { const inst = Spiel.instanz(iid); const def = inst && Spiel.defVon(inst);
        return def ? h("li", {}, h("div", {}, h("b", {}, def.titel), h("p", {class: "sp-leise"}, def.symptom)),
          h("button", {type: "button", class: "knopf klein", onclick: () => { pruefZu?.(); UI.spiel.oeffnen(iid); }}, `Aufgabe ${i + 1} öffnen`)) : null; })),
      h("div", {class: "sp-knoepfe"}, h("button", {type: "button", class: "knopf primaer", onclick: () => { pruefZu?.(); pruefungAbgeben(); }}, "Prüfung abgeben"),
        h("button", {type: "button", class: "knopf geist", onclick: () => pruefZu?.()}, "Weiterarbeiten")));
    pruefZu = overlay(karte);
  }
  function pruefungAbgeben(){
    const e = Spiel.pruefung.abgeben(); if (!e) return;
    const satz = Spiel.karriere.seniorSatz(e.bestanden ? "pruefungBestanden" : "pruefungNichtBestanden");
    UI.sandbox?.laden?.();
    const zu = overlay(h("div", {class: "sp-ergebnis"},
      h("h2", {}, e.bestanden ? `Bestanden – Note ${e.note} (${Spiel.pruefung.NOTEN[e.note]})` : `Nicht bestanden – Note ${e.note}`),
      h("div", {class: "kr-punkte"}, h("b", {}, e.punkte), h("span", {}, "von 100 Punkten")),
      h("ul", {class: "sp-pruefliste"}, e.teile.map(t => h("li", {class: t.anteil >= 1 ? "ok" : "offen"}, h("span", {}, t.anteil >= 1 ? "✓" : "✗"),
        h("div", {}, h("b", {}, t.titel), h("p", {}, `${Math.round(t.anteil * 100)} % · ${t.gruende.map(g => Spiel.grundTitel(g)).join(", ") || "alles erfüllt"}`))))),
      h("blockquote", {class: "sp-dank"}, "„" + satz + "“", h("cite", {}, "— der Senior")),
      e.schwach.length ? h("div", {}, h("h3", {}, "Schwachstellen – direkt trainieren"), h("div", {class: "sp-knoepfe"}, e.schwach.map(s => h("button", {type: "button", class: "knopf klein", onclick: () => { zu(); training(s); }}, Spiel.karriere.skillName(s))))) : null,
      h("div", {class: "sp-knoepfe"}, h("button", {type: "button", class: "knopf primaer", onclick: () => { zu(); UI.app.ansicht("lernstand"); }}, "Zum Lernstand")))) ;
  }
  function overlay(inhalt){
    const o = h("div", {class: "sp-overlay", role: "dialog", "aria-modal": "true"}, h("div", {class: "sp-karte"}, inhalt));
    document.body.append(o); requestAnimationFrame(() => o.classList.add("da"));
    return () => { o.classList.remove("da"); setTimeout(() => o.remove(), 180); };
  }

  /* ---------- Wiki ---------- */
  function wikiAnsicht(c){
    const eintraege = (DATEN.skills || []).map(s => ({s, w: (DATEN.wiki || {})[s.id]})).filter(x => x.w);
    const q = K.wikiSuche.trim().toLowerCase();
    const treffer = q ? eintraege.filter(x => (x.w.titel + " " + x.w.kurz + " " + x.s.name).toLowerCase().includes(q)) : eintraege;
    const wahl = K.wikiWahl && (DATEN.wiki || {})[K.wikiWahl] ? K.wikiWahl : (treffer[0] && treffer[0].s.id);
    const suche = h("input", {type: "search", class: "in-eingabe", placeholder: "Suchen: VLAN, NAT, Gateway …", value: K.wikiSuche, "aria-label": "Wiki durchsuchen",
      oninput: e => { K.wikiSuche = e.target.value; wikiAnsicht(c); const el = c.querySelector("input[type=search]"); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }});
    const artikel = h("article", {class: "kr-artikel"});
    if (wahl) {
      const w = DATEN.wiki[wahl], s = Spiel.skill(wahl);
      artikel.append(h("small", {class: "sp-leise"}, `Stufe ${s.stufe} · ${s.ap}`), h("h2", {}, w.titel), h("p", {class: "kr-kurz"}, w.kurz),
        ...(w.abschnitte || []).map(a => h("section", {}, h("h3", {}, a.titel), h("div", {html: a.html}))),
        w.merksatz ? h("p", {class: "kr-merksatz"}, "💡 ", w.merksatz) : null,
        w.pruefungstipp ? h("p", {class: "kr-tipp"}, "🎯 Prüfungstipp: ", w.pruefungstipp) : null,
        (w.siehe || []).length ? h("p", {}, "Siehe auch: ", ...w.siehe.filter(x => DATEN.wiki[x]).flatMap((x, i) => [i ? " · " : "", h("a", {href: "#", onclick: e => { e.preventDefault(); K.wikiWahl = x; wikiAnsicht(c); }}, DATEN.wiki[x].titel)])) : null,
        h("p", {class: "sp-leise"}, "Quelle im Vault: " + (w.quelle || "–")));
    }
    c.replaceChildren(h("div", {class: "kr-wiki"},
      h("aside", {class: "kr-wiki-liste"}, h("h2", {}, "Wiki"), suche,
        h("nav", {}, treffer.map(x => h("button", {type: "button", class: "kr-wiki-punkt" + (x.s.id === wahl ? " an" : ""), onclick: () => { K.wikiWahl = x.s.id; wikiAnsicht(c); }},
          h("span", {}, x.w.titel), h("small", {}, "Stufe " + x.s.stufe))))),
      artikel));
  }
  function wikiOeffnen(skill){ K.wikiWahl = skill; UI.app.ansicht("wiki"); }

  /* ---------- Leiste: Status und Mini-Ticket (nur Maus) ---------- */
  function leisteStatus(){
    if (!Spiel._st) return;
    const ampeln = Spiel.karriere.vertragskunden().map(id => ({name: kd(id).name, farbe: Spiel.wartung.ampelBei(id), zustand: AMPEL[Spiel.wartung.ampelBei(id)]?.[2] || ""}));
    UI.leiste.status({ampeln, euroProStunde: Spiel.euroProStunde(), ruf: Spiel.st.ruf, offen: Spiel.offen(), text: Spiel.einst.unterricht ? "Unterricht: " + Spiel.karriere.skillName(Spiel.einst.unterricht) : ""});
  }
  function miniZeichnen(el, {gross = false} = {}){
    if (!el || !Spiel._st) return;
    const m = K.mini.ergebnis ? Spiel.mini.von(K.mini.ergebnis.id) : Spiel.mini.naechstes();
    if (!m) { el.replaceChildren(h("p", {class: "mk-leer"}, "Gerade kein Mini-Ticket.")); return; }
    const kopf = h("div", {class: "mk-kopf"}, h("span", {class: "sp-chip niv-" + m.stufe}, NIV[m.stufe]), h("span", {class: "mk-skill"}, Spiel.karriere.skillName(m.skill)));
    const teile = [kopf, h("p", {class: "mk-frage"}, m.frage)];
    if (m.schnappschuss && m.schnappschuss.inhalt) teile.push(h("pre", {class: "mk-schnapp"}, m.schnappschuss.inhalt));
    const fertig = res => { K.mini.ergebnis = Object.assign({id: m.id}, res); K.mini.auswahl = []; K.mini.links = null; miniZeichnen(el, {gross}); leisteStatus(); UI.spiel?.status?.(); };
    if (K.mini.ergebnis) {
      const e = K.mini.ergebnis;
      teile.push(h("div", {class: "mk-ergebnis " + (e.richtig ? "ok" : "bad")}, h("b", {}, e.richtig ? `✓ Richtig! +${e.lohn} €` : "✗ Nicht ganz."),
        e.richtig ? null : h("p", {}, "Richtig: " + e.loesung), h("p", {}, e.erklaerung)),
        h("button", {type: "button", class: "mk-knopf", onclick: () => { K.mini.ergebnis = null; miniZeichnen(el, {gross}); }}, "Nächstes ▸"));
      el.replaceChildren(h("div", {class: "mk" + (gross ? " gross" : "")}, teile)); return;
    }
    if (m.art === "wahl" || m.art === "vorhersage") {
      teile.push(h("div", {class: "mk-optionen"}, m.optionen.map((o, i) => h("button", {type: "button", class: "mk-knopf", onclick: () => fertig(Spiel.mini.antworten(m.id, i))}, o))));
    } else if (m.art === "reihenfolge") {
      const aus = K.mini.auswahl;
      teile.push(h("p", {class: "mk-hinweis"}, "In der richtigen Reihenfolge antippen:"),
        h("div", {class: "mk-optionen"}, m.optionen.map((o, i) => h("button", {type: "button", class: "mk-knopf" + (aus.includes(i) ? " gewaehlt" : ""), disabled: aus.includes(i),
          onclick: () => { aus.push(i); if (aus.length === m.optionen.length) fertig(Spiel.mini.antworten(m.id, aus.slice())); else miniZeichnen(el, {gross}); }},
          aus.includes(i) ? `${aus.indexOf(i) + 1}. ${o}` : o))),
        aus.length ? h("button", {type: "button", class: "mk-klein", onclick: () => { K.mini.auswahl = []; miniZeichnen(el, {gross}); }}, "↺ neu anfangen") : null);
    } else if (m.art === "zuordnen") {
      const paare = K.mini.auswahl, links = m.optionen.links, rechts = m.optionen.rechts;
      const belegtL = new Set(paare.map(p => p[0])), belegtR = new Set(paare.map(p => p[1]));
      teile.push(h("p", {class: "mk-hinweis"}, K.mini.links == null ? "Links antippen, dann das passende Rechts:" : `„${links[K.mini.links]}“ gehört zu …`),
        h("div", {class: "mk-zuordnen"},
          h("div", {}, links.map((o, i) => h("button", {type: "button", class: "mk-knopf" + (K.mini.links === i ? " an" : "") + (belegtL.has(i) ? " gewaehlt" : ""), disabled: belegtL.has(i),
            onclick: () => { K.mini.links = i; miniZeichnen(el, {gross}); }}, belegtL.has(i) ? `${o} ✓` : o))),
          h("div", {}, rechts.map((o, j) => h("button", {type: "button", class: "mk-knopf" + (belegtR.has(j) ? " gewaehlt" : ""), disabled: belegtR.has(j) || K.mini.links == null,
            onclick: () => { paare.push([K.mini.links, j]); K.mini.links = null; if (paare.length === Math.min(links.length, rechts.length)) fertig(Spiel.mini.antworten(m.id, paare.slice())); else miniZeichnen(el, {gross}); }}, o)))),
        paare.length ? h("button", {type: "button", class: "mk-klein", onclick: () => { K.mini.auswahl = []; K.mini.links = null; miniZeichnen(el, {gross}); }}, "↺ neu anfangen") : null);
    }
    el.replaceChildren(h("div", {class: "mk" + (gross ? " gross" : "")}, teile));
  }
  function miniDialog(){
    const ziel = h("div", {class: "mk-dialog"});
    const zu = overlay(h("div", {}, h("h2", {}, "Mini-Ticket"), ziel, h("div", {class: "sp-knoepfe"}, h("button", {type: "button", class: "knopf geist", onclick: () => zu()}, "Schließen"))));
    miniZeichnen(ziel, {gross: true});
  }

  /* ---------- Einstellungen ---------- */
  function abschnitte(){
    UI.app.einstellungAbschnitt("Lernen", el => {
      const e = Spiel.einst;
      const wahl = (titel, key, optionen) => h("label", {class: "kr-einst"}, h("span", {}, titel),
        h("select", {class: "in-auswahl", onchange: ev => { Spiel.einstSetzen(key, ev.target.value || null); UI.spiel?.status?.(); }},
          optionen.map(([w, t]) => h("option", {value: w, selected: String(e[key] ?? "") === String(w)}, t))));
      const schalter = (titel, key, text) => h("label", {class: "kr-einst"}, h("span", {}, titel, h("small", {}, text)),
        h("input", {type: "checkbox", checked: e[key] !== false, onchange: ev => Spiel.einstSetzen(key, ev.target.checked)}));
      el.append(
        wahl("Niveau", "wahl", [["auto", "Automatisch (passt sich an)"], ["E", "Einstieg – erklärt alles"], ["AP1", "AP1 – Prüfungsform"], ["AP2", "AP2 – ohne Live-Ziele, Neustart-Test"]]),
        wahl("Heute im Unterricht", "unterricht", [["", "– kein Thema –"], ...(DATEN.skills || []).filter(s => s.stufe <= 5).map(s => [s.id, s.name])]),
        schalter("Vorhersage vor dem Ping", "vorhersage", "Erst raten, dann sehen (Einstieg/AP1)"),
        schalter("Coach-Hinweise", "coach", "Tipps beim ersten Ticket"));
    });
    UI.app.einstellungAbschnitt("Desktop", el => {
      const zeile = (titel, f, an, fn) => { const k = Plattform.kann(f); return h("label", {class: "kr-einst" + (k.ja ? "" : " aus")}, h("span", {}, titel, k.ja ? null : h("small", {}, k.grund)),
        h("input", {type: "checkbox", checked: !!an, disabled: !k.ja, onchange: ev => fn(ev.target.checked)})); };
      const d = store.get("einst", {}) || {};
      el.append(
        zeile("Leiste immer im Vordergrund", "immerOben", d.immerOben !== false, v => { const x = store.get("einst", {}) || {}; x.immerOben = v; store.set("einst", x); Plattform.fenster.immerOben(v); }),
        zeile("Mit dem System starten (still im Tray)", "autostart", d.autostart, v => { const x = store.get("einst", {}) || {}; x.autostart = v; store.set("einst", x); Plattform.autostart(v); }),
        zeile("Systembenachrichtigung bei neuen Tickets (höchstens alle 30 min)", "benachrichtigen", d.benachrichtigen, v => { const x = store.get("einst", {}) || {}; x.benachrichtigen = v; store.set("einst", x); }));
    });
    UI.app.einstellungAbschnitt("Spielstand", el => {
      el.append(h("div", {class: "sp-knoepfe"},
        h("button", {type: "button", class: "knopf", onclick: exportieren}, "Exportieren"),
        h("button", {type: "button", class: "knopf", onclick: importieren}, "Importieren …")),
        h("p", {class: "sp-leise"}, "Export sichert Spielstand und Lernstand in einer Datei (z. B. für einen anderen Rechner)."));
    });
  }
  function exportieren(){
    store.sofort();
    const daten = {format: "netzwerk-labor", version: LABOR_VERSION, datum: heute(), speicher: store.alles()};
    Plattform.datei.exportieren(`netzwerk-labor-${heute()}.json`, JSON.stringify(daten, null, 1)).then(ok => ok !== false && UI.toast("Spielstand exportiert.", "ok"));
  }
  function importieren(){
    Plattform.datei.importieren().then(text => {
      if (!text) return;
      let d; try { d = JSON.parse(text); } catch (e) { UI.toast("Die Datei ist kein gültiger Spielstand.", "fehler"); return; }
      if (!d || d.format !== "netzwerk-labor" || !d.speicher) { UI.toast("Das ist kein Netzwerk-Labor-Spielstand.", "fehler"); return; }
      const lab = d.speicher.labor || {};
      const zu = overlay(h("div", {class: "sp-ergebnis"}, h("h2", {}, "Spielstand importieren?"),
        h("p", {}, `Stand vom ${datumDe(d.datum || heute())}: Stufe ${lab.stufe || 1}, ${eur(lab.euro || 0)} €, ${lab.ruf || 0} Ruf, ${(lab.erledigt || []).length} erledigte Tickets.`),
        h("p", {class: "sp-leise"}, "Dein aktueller Stand wird ersetzt. Exportiere ihn vorher, wenn du ihn behalten willst."),
        h("div", {class: "sp-knoepfe"}, h("button", {type: "button", class: "knopf primaer", onclick: () => { store.initialisieren(d.speicher, SPEICHER.schreiber, null); store.markieren(); store.sofort(); location.reload(); }}, "Ersetzen und neu laden"),
          h("button", {type: "button", class: "knopf geist", onclick: () => zu()}, "Abbrechen"))));
    });
  }

  /* ---------- Offline-Bericht, Aufstieg, Takt ---------- */
  function offlineZeigen(){
    const r = Spiel.offlineBericht(); if (!r) return;
    UI.toast(r.text, r.rot && r.rot.length ? "warn" : "info", {titel: "Während du weg warst", dauer: 12000, aktion: r.wartend ? {text: "Zum Postfach", fn: () => UI.app.ansicht("postfach")} : null});
    Spiel.offlineBerichtGesehen && Spiel.offlineBerichtGesehen();
  }
  function festZeigen(f){
    if (!f || f.gesehen) return;
    const kunden = (f.kunden || []).map(kd);
    const zu = overlay(h("div", {class: "sp-willkommen"}, h("span", {class: "sp-senior-sym gross"}, "🎉"),
      h("h2", {}, `Stufe ${f.stufe}: ${f.name}`), h("p", {}, "„" + f.satz + "“"),
      kunden.length ? h("p", {}, "Neue Kunden: ", kunden.map(k => `${k.symbol} ${k.name}`).join(", ")) : null,
      (f.themen || []).length ? h("p", {class: "sp-leise"}, "Neue Themen: " + f.themen.map(s => Spiel.karriere.skillName(s)).join(" · ")) : null,
      h("button", {type: "button", class: "knopf primaer gross", onclick: () => { zu(); Spiel.karriere.festGesehen(); UI.app.ansicht("postfach"); }}, "Weiter ▸")));
  }
  function takt(){
    if (!Spiel._st) return;
    try { Spiel.tick(jetzt()); } catch (e) { console.error("Takt", e); }
    leisteStatus();
  }

  /* ---------- „Heute dran“-Karte (im Postfach-Kopf) ---------- */
  function tagKarte(){
    if (!Spiel._st) return null;
    const t = Spiel.tag.heute();
    return h("div", {class: "kr-tag", title: "Heute dran"},
      h("span", {}, `🔥 ${t.serie} Tag${t.serie === 1 ? "" : "e"} Serie · ${t.erledigtHeute}/${t.ziel} Tickets heute`),
      t.faellig.length ? h("button", {type: "button", class: "knopf klein", onclick: () => { const n = Spiel.tag.bereitschaftStarten(); UI.toast(n.length ? `${n.length} Wiederholung${n.length === 1 ? "" : "en"} als Bereitschaftsdienst im Postfach.` : "Gerade nichts Fälliges mit Ticket.", "info"); UI.spiel.status(); if (UI.app.aktuell === "postfach") UI.app.ansicht("postfach"); }},
        `🛠 Bereitschaftsdienst (${t.faellig.length} fällig)`) : null,
      h("button", {type: "button", class: "knopf klein geist", onclick: () => miniDialog()}, "⚡ Mini-Ticket"));
  }

  /* ---------- Anmeldung ---------- */
  (UI.startHaken ||= []).push(() => {
    UI.app.registrieren("kunden", {titel: "Kunden", symbol: "kunden", zeigen: kundenAnsicht, wieder: kundenAnsicht});
    UI.app.registrieren("wiki", {titel: "Wiki", symbol: "wiki", zeigen: wikiAnsicht, wieder: wikiAnsicht});
    UI.app.registrieren("lernstand", {titel: "Lernstand", symbol: "lernstand", zeigen: lernstandAnsicht, wieder: lernstandAnsicht,
      zaehler: () => typeof L !== "undefined" ? L.faelligeIds(id => String(id).startsWith("lab.")).length : 0});
    UI.app.registrieren("shop", {titel: "Shop", symbol: "euro", zeigen: shopAnsicht, wieder: shopAnsicht});
    abschnitte();
  });
  Bus.an("ui-bereit", () => {
    setTimeout(() => {
      try {
        takt(); offlineZeigen();
        miniZeichnen(UI.leiste.miniBereich);
        const f = Spiel.karriere.daten().fest; if (f && !f.gesehen) festZeigen(f);
      } catch (e) { console.error("Karriere-Start", e); }
    }, 300);
    setInterval(takt, 60000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") takt(); });
  });
  Bus.an("zustand-geaendert", () => leisteStatus());
  Bus.an("aufstieg", f => setTimeout(() => festZeigen(f), 1200));
  Bus.an("mini", () => { if (!K.mini.ergebnis) miniZeichnen(UI.leiste.miniBereich); });

  return {kundenAnsicht, shopAnsicht, lernstandAnsicht, wikiAnsicht, wikiOeffnen, miniZeichnen, miniDialog, pruefungUebersicht, pruefungAbgeben, leisteStatus, tagKarte, training};
})();
UI.wiki = {oeffnen: skill => UI.karriere.wikiOeffnen(skill)};
UI.tag = {karte: () => UI.karriere.tagKarte()};
