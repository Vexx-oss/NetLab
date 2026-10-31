"use strict";
/* ---------- Karriere-Oberfläche: Kunden + Kundenakte, Wiki, Mini-Tickets, Leiste, Einstellungen ----------
   Seit Runde 4 getrennt: Lernstand (mit Prüfungstag) → src/ui/lernstand.js, Shop → src/ui/shop.js.
   Gemeinsame Helfer für die ausgelagerten Ansichten: UI.karriere._helfer (overlay).
   Logik in spiel/karriere.js, wirtschaft.js, wartung.js, playbooks.js, offline.js, mini.js, tag.js, pruefung.js.
   Takt: Spiel.tick alle 60 s und beim Sichtbarwerden (Zeit über Zeitstempel, nicht über Ticks). */
UI.karriere = (() => {
  const K = {wikiWahl: null, wikiSuche: "", mini: {antwort: null, ergebnis: null, auswahl: [], links: null, hilfe: null}};
  const kd = id => Spiel.karriere.kunde(id);
  const AMPEL = {gruen: ["ok", "●", "läuft"], gelb: ["warn", "▲", "Frist überschritten"], rot: ["bad", "■", "steht – kein Geld"]};
  const NIV = {E: "Einstieg", AP1: "AP1", AP2: "AP2"};

  /* ---------- Kunden: Kundenportfolio (Bento 2.5, Vertrag § 3.2) ----------
     Profilkacheln statt Regenbogenkarten: Monogramm statt Emoji, Branche und Ansprechpartner,
     Vertragsstatus, Stufe, gelöste Aufträge, Ø-Sterne und Vertrauen auf einen Blick.
     Der Kunde mit dem dringendsten Anlass steht als Hauptkachel oben (der Kicker nennt den Grund);
     gesperrte Kunden folgen in einer eigenen ruhigen Sektion – so bleibt das Raster lückenfrei.
     Kundenfarbe nur als leiser Akzent (Monogramm-Tint, 2-px-Rail) – keine Vollflächen. */
  const SEG = 5;
  const branche = k => (k.daten && k.daten.branche) || "";
  const kontakt = k => [k.ansprechpartner, k.rolle].filter(Boolean).join(", ");
  const letzterAuftrag = id => Spiel.st.erledigt.filter(e => e.kunde === id).slice(-1)[0] || null;
  const auftragszahl = id => (Spiel.karriere.sterneBei ? Spiel.karriere.sterneBei(id) : []).length;
  function segmente(wert, gross = false){
    const el = h("span", {class: "kr-seg" + (gross ? " gross" : ""), role: "img", "aria-label": `Vertrauen ${wert} von ${SEG}`});
    for (let i = 1; i <= SEG; i++) el.append(h("i", {class: i <= wert ? "an" : ""}));
    return el;
  }
  function ampelChip(id, mitPreis){
    const k = kd(id), a = AMPEL[Spiel.wartung.ampelBei(id)] || AMPEL.gruen;
    return h("span", {class: "bn-chip " + a[0] + " wert", title: "Wartungsvertrag"}, a[1] + " " + a[2] + (mitPreis ? ` · ${eur(k.euroProStunde)} €/h` : ""));
  }
  function auftragsText(id){
    const s = Spiel.karriere.sterneBei ? Spiel.karriere.sterneBei(id) : [];
    if (!s.length) return null;
    const mittel = Math.round(10 * s.reduce((a, b) => a + b, 0) / s.length) / 10;
    return `${s.length} ${s.length === 1 ? "Auftrag" : "Aufträge"} · Ø ${mittel.toFixed(1).replace(".", ",")} ★`;
  }
  function freischaltSatz(k){
    const def = Spiel.KARRIERE_STUFEN.find(x => x.nr === k.stufe);
    return `Ab Stufe ${k.stufe}${def ? ` (${def.name})` : ""} und ${k.abRuf} Ruf.` + (k.spaeter ? " Kommt in einer späteren Version." : "");
  }
  function kundenChips(id, k, vertrag){
    const s = auftragsText(id), empf = Spiel.kundenakte.empfohlen(id);
    const von = empf ? Spiel.kundenDaten(Spiel.kundenakte.empfehlungen()[id].von) : null;
    return [
      vertrag ? ampelChip(id, true) : h("span", {class: "bn-chip wert"}, "ohne Vertrag"),
      h("span", {class: "bn-chip wert"}, "Stufe " + k.stufe),
      s ? h("span", {class: "bn-chip wert"}, s) : null,
      von ? h("span", {class: "bn-chip iris wert", title: `Empfohlen von ${von.name} – der Kunde kam eine Stufe früher`}, UI.symbol("sprechblase", 12), " empfohlen") : null,
    ];
  }
  function kundenFuss(c, id, vertrag, weit){
    const shopEintrag = vertrag ? null : Spiel.shop.liste().find(e => e.id === "vertrag:" + id);
    return [
      /* EINE Hauptaktion je Bild: nur die Hauptkachel trägt den Primärknopf */
      h("button", {type: "button", class: "knopf" + (weit ? " primaer" : ""), onclick: () => akteAnsicht(c, id)}, "Akte öffnen"),
      shopEintrag ? h("button", {type: "button", class: "knopf klein geist", disabled: shopEintrag.zustand !== "kaufbar", title: shopEintrag.grund || "",
        onclick: () => UI.shop.kaufen(shopEintrag.id, () => kundenAnsicht(c))}, `Wartungsvertrag anbieten · ${eur(shopEintrag.preis)} €`) : null,
    ];
  }
  function zuletztZeile(id){
    const e = letzterAuftrag(id);
    return h("p", {class: "kr-kunde-zuletzt"}, e ? `Zuletzt: ${(Spiel.ticketDef(e.id) || {}).titel || "Auftrag"} · ${datumDe(e.tag)}` : "Noch kein Auftrag gelöst.");
  }
  function kundenKopf(k, offen, weit, kicker){
    return h("header", {class: "kr-kunde-kopf"},
      UI.bento.monogramm(k.name, {farbe: offen ? (k.farbe || "--accent") : "--faint", gross: weit}),
      h("div", {class: "kr-kunde-titel"},
        kicker ? h("span", {class: "bn-kicker"}, kicker) : null,
        h("h3", {}, k.name),
        branche(k) ? h("p", {class: "kr-kunde-branche"}, branche(k)) : null),
      offen ? null : h("span", {class: "kr-schloss", title: "Gesperrt"}, UI.symbol("schloss", 18)));
  }
  /* Wer steht oben? Immer mit echtem Anlass – der Kicker sagt, warum. */
  function hauptkunde(offene){
    const auftrag = offene.find(id => Spiel.postfach().some(i => i.kunde === id));
    if (auftrag) return {id: auftrag, kicker: "Aktuell · Auftrag im Postfach"};
    const wartung = offene.find(id => Spiel.karriere.hatVertrag(id) && (Spiel.wartung.ampelBei(id) === "gelb" || Spiel.wartung.ampelBei(id) === "rot"));
    if (wartung) return {id: wartung, kicker: "Aktuell · Wartung fällig"};
    const bester = offene.slice().sort((a, b) => auftragszahl(b) - auftragszahl(a))[0];
    if (bester && auftragszahl(bester) > 0) return {id: bester, kicker: "Hauptkunde · meiste Aufträge"};
    return offene.length ? {id: offene[0], kicker: "Hauptkunde · erster Kunde"} : null;
  }
  function kundeKarte(c, id, weit, kicker){
    const k = kd(id), offen = Spiel.karriere.kundeOffen(id), vertrag = Spiel.karriere.hatVertrag(id);
    const v = Spiel.kundenakte.vertrauen(id);
    const klasse = "kr-kunde" + (offen ? "" : " zu") + (weit ? " kr-kunde-weit" : "");
    const kopf = kundenKopf(k, offen, weit, kicker);
    const beschreibung = weit && k.beschreibung ? h("p", {class: "kr-kunde-lead"}, k.beschreibung) : null;
    const kontaktZeile = kontakt(k) ? h("p", {class: "kr-kunde-kontakt"}, UI.symbol("kunden", 14), " " + kontakt(k)) : null;
    const chips = h("div", {class: "bn-chips"}, kundenChips(id, k, vertrag));
    const vertrauen = h("div", {class: "kr-kunde-vertrauen"}, h("span", {class: "kr-kunde-label"}, `Vertrauen ${v}/${SEG}`), segmente(v));
    const zuletzt = zuletztZeile(id);
    const fuss = h("div", {class: "ka-zeile"}, kundenFuss(c, id, vertrag, weit));
    return h("article", {class: klasse, style: {"--k": `var(${k.farbe || "--accent"})`}},
      offen
        ? weit
          ? [h("div", {class: "kr-kunde-haupt"}, kopf, kontaktZeile, beschreibung),
            h("div", {class: "kr-kunde-neben"}, chips, vertrauen, zuletzt, fuss)]
          : [kopf, kontaktZeile, chips, vertrauen, zuletzt, fuss]
        : [kopf, h("p", {class: "kr-kunde-gesperrt"}, freischaltSatz(k))]);
  }
  function kundenAnsicht(c){
    const st = Spiel.st;
    const alle = Spiel.karriere.kundenIds();
    const offene = alle.filter(id => Spiel.karriere.kundeOffen(id));
    const gesperrte = alle.filter(id => !Spiel.karriere.kundeOffen(id));
    const haupt = hauptkunde(offene);
    const offeneKarten = offene.map(id => kundeKarte(c, id, !!haupt && haupt.id === id, haupt && haupt.id === id ? haupt.kicker : ""));
    const gesperrteKarten = gesperrte.map(id => kundeKarte(c, id, false, ""));
    c.replaceChildren(h("div", {class: "kr-seite"},
      h("header", {class: "kr-kopf"},
        h("div", {}, h("span", {class: "bn-kicker"}, "Kunden · Bestand"), h("h2", {}, "Kunden")),
        h("p", {class: "bn-lead"}, `Stufe ${st.stufe} · ${st.ruf} Ruf · ${Spiel.karriere.vertragskunden().length} Wartungsverträge · ${eur(Spiel.euroProStunde())} €/h passiv`)),
      h("div", {class: "kr-raster"}, offeneKarten),
      gesperrte.length ? h("section", {class: "kr-gruppe"},
        h("h3", {}, `Gesperrt · ab Stufe ${Math.min(...gesperrte.map(id => kd(id).stufe))}`),
        h("div", {class: "kr-raster"}, gesperrteKarten)) : null));
  }

  /* ---------- Kundenakte (E2, Hebel 10; Präfix ka-) als Dossier ----------
     Kopfkachel, vier Datenkacheln und die großen Kacheln Atlas, Geschichten, Zuletzt, Belohnungen.
     Der Atlas sitzt in einem begrenzten Rahmen (feste Höhe, scrollbar). Ohne betreutes Gerät ist er
     eine schmale ruhige Zeile mit echtem Weg ins Postfach statt einer großen leeren Planfläche.
     Alle Zahlen kommen aus Spiel.kundenakte/Spiel.karriere – nichts erfunden. */
  function kapitelZeile(c, id, x){
    const status = x.frei ? (x.gelesen ? (x.beantwortet ? "✓ gelesen" : "gelesen") : "neu") : `ab Vertrauen ${x.ab}`;
    return h("li", {class: x.frei ? (x.gelesen ? "gelesen" : "frei") : "zu"},
      x.frei
        ? h("button", {type: "button", class: "ka-kapitel-knopf", onclick: () => kapitelLesen(id, x.nr, () => akteAnsicht(c, id))},
          h("span", {}, `${x.nr}. ${x.titel}`), h("small", {}, status))
        : h("span", {class: "ka-kapitel-zu"}, h("span", {}, `${x.nr}. ${x.titel}`), h("small", {}, UI.symbol("schloss", 13), " " + status)));
  }
  function akteAnsicht(c, id){
    const k = kd(id), v = Spiel.kundenakte.vertrauen(id), schwelle = Spiel.kundenakte.naechsteSchwelle(id);
    const daten = Spiel.kundenakte.daten(id);
    const atlas = Spiel.kundenakte.atlas(id, {breite: 720}), bau = Spiel.kundenakte.baustellen(id), kap = Spiel.kundenakte.kapitel(id);
    const verlauf = Spiel.st.erledigt.filter(e => e.kunde === id).slice(-5).reverse();
    const vertrag = Spiel.karriere.hatVertrag(id), shopEintrag = Spiel.shop.liste().find(e => e.id === "vertrag:" + id);
    const sterne = Spiel.karriere.sterneBei(id) || [];
    const mittel = sterne.length ? Math.round(10 * sterne.reduce((a, b) => a + b, 0) / sterne.length) / 10 : null;
    const empf = Spiel.kundenakte.empfohlen(id), von = empf ? Spiel.kundenDaten(Spiel.kundenakte.empfehlungen()[id].von) : null;
    const gegeben = !!daten.empfohlen, belohnungen = Spiel.kundenakte.belohnungen(id);
    const naechste = Spiel.VERTRAUEN_SCHWELLEN.find(x => x > daten.punkte);
    const vorher = Spiel.VERTRAUEN_SCHWELLEN.filter(x => x <= daten.punkte).pop() || 0;
    const prozent = naechste == null ? 100 : Math.round(100 * (daten.punkte - vorher) / Math.max(1, naechste - vorher));
    const gelesen = kap.filter(x => x.gelesen).length;
    let bild = null;
    if (atlas && atlas.hell.length && UI.netzplan.zeichnung) {
      bild = UI.netzplan.zeichnung(atlas.plan, "netzplan", null);
      bild.classList.add("ka-atlas");
      for (const g of bild.querySelectorAll(".np-geraet")) { g.onclick = null; g.onkeydown = null; g.removeAttribute("tabindex"); g.removeAttribute("role"); g.classList.toggle("ka-hell", atlas.hell.includes(g.dataset.id)); }
    }
    const gittern = bn => "ka-block" + (bn ? " " + bn : "");
    const kachelGeschichten = bn => h("section", {class: gittern(bn)},
      UI.bento.kopf("Geschichten", `${gelesen}/${kap.length} gelesen`),
      h("p", {class: "bn-meta"}, "Kapitel öffnen sich mit dem Vertrauen; jede Frage bringt beim ersten richtigen Versuch +1 Ruf."),
      h("ol", {class: "ka-kapitel"}, kap.map(x => kapitelZeile(c, id, x))));
    const kachelZuletzt = bn => h("section", {class: gittern(bn)},
      UI.bento.kopf("Zuletzt", verlauf.length ? `${verlauf.length} ${verlauf.length === 1 ? "Auftrag" : "Aufträge"}` : "Noch nichts"),
      verlauf.length ? h("ul", {class: "ka-verlauf"}, verlauf.map(e => h("li", {},
        h("b", {}, (Spiel.ticketDef(e.id) || {}).titel || "Auftrag"),
        h("small", {}, `${"★".repeat(Math.floor(e.sterne || 0))}${(e.sterne || 0) % 1 ? "½" : ""} · ${datumDe(e.tag)}`)))) : h("p", {class: "bn-meta"}, "Noch kein Auftrag für diesen Kunden."));
    const kachelBelohnungen = bn => h("section", {class: gittern(bn)},
      UI.bento.kopf("Vertrauen", "Belohnungen"),
      h("p", {class: "bn-meta"}, "Was das Vertrauen bei diesem Kunden schon geöffnet hat."),
      h("ul", {class: "ka-lohn"}, belohnungen.map(b => h("li", {class: b.da ? "da" : v >= b.ab ? "bald" : "zu"},
        h("b", {}, b.text),
        h("small", {}, b.da ? "✓ erreicht" : v >= b.ab ? "beim nächsten Auftrag" : `ab Vertrauen ${b.ab}`)))));
    const grosseKacheln = bild
      ? [h("section", {class: "ka-block bn-s8"},
          UI.bento.kopf("Netz-Atlas", atlas.komplett ? "Komplett betreut" : `${atlas.hell.length} von ${atlas.gesamt.length} Geräten`),
          h("p", {class: "bn-meta"}, "Hell sind die Geräte, an denen du schon gearbeitet hast."),
          h("div", {class: "ka-atlas-rahmen"}, bild)),
        h("div", {class: "ka-rechts bn-s4"}, kachelGeschichten(), kachelZuletzt(), kachelBelohnungen())]
      : [h("section", {class: "ka-block bn-s12"},
          UI.bento.kopf("Netz-Atlas", atlas ? "Noch kein Gerät" : "Kein Plan"),
          h("div", {class: "ka-atlas-leer"},
            h("p", {class: "bn-lead"}, atlas
              ? `Der Atlas zeigt das dokumentierte Netz von ${k.name}; mit deinem ersten Auftrag leuchtet hier ein Gerät auf.`
              : "Für diesen Kunden liegt kein dokumentiertes Netz vor."),
            atlas ? h("button", {type: "button", class: "knopf geist klein", onclick: () => UI.app.ansicht("postfach")}, "Zum Postfach") : null)),
        kachelGeschichten("bn-s4"), kachelZuletzt("bn-s4"), kachelBelohnungen("bn-s4")];
    c.replaceChildren(h("div", {class: "kr-seite ka-seite", style: {"--k": `var(${k.farbe || "--accent"})`}},
      h("button", {type: "button", class: "knopf geist ka-zurueck", onclick: () => kundenAnsicht(c)}, "← Alle Kunden"),
      h("div", {class: "bn-raster"},
        /* Kopfkachel: wer der Kunde ist, wie viel Vertrauen da ist und was bis zur nächsten Stufe fehlt */
        h("header", {class: "ka-block ka-kopf bn-s12"},
          h("div", {class: "ka-person"},
            UI.bento.monogramm(k.name, {farbe: k.farbe || "--accent", gross: true}),
            h("div", {class: "ka-person-text"},
              h("h2", {}, k.name),
              h("p", {class: "ka-person-meta"}, [branche(k), kontakt(k)].filter(Boolean).join(" · ")),
              k.beschreibung ? h("p", {class: "ka-person-lead"}, k.beschreibung) : null)),
          h("div", {class: "ka-vertrauen"},
            h("div", {class: "ka-vertrauen-zeile"}, h("span", {class: "kr-kunde-label"}, `Vertrauen ${v}/${SEG}`), segmente(v, true)),
            h("div", {class: "ka-bar", role: "img", "aria-label": `Fortschritt bis zur nächsten Vertrauensstufe: ${prozent} Prozent`}, h("i", {style: {width: prozent + "%"}})),
            h("p", {class: "bn-meta"}, naechste == null || !schwelle ? "Höchstes Vertrauen erreicht." : `Noch ${schwelle.bis - schwelle.punkte} saubere ${schwelle.bis - schwelle.punkte === 1 ? "Arbeit" : "Arbeiten"} bis Vertrauen ${v + 1}.`))),
        /* Datenkacheln: Vertrag, Leistung, Empfehlung, Baustellen */
        h("section", {class: "ka-block bn-s3"},
          UI.bento.kopf("Vertrag", vertrag ? "Wartungsvertrag" : "Ohne Vertrag"),
          vertrag ? h("p", {class: "bn-wert"}, eur(k.euroProStunde), h("small", {}, "€/h")) : h("p", {class: "bn-lead"}, "Ohne Vertrag fließt kein passives €/h."),
          vertrag ? ampelChip(id, false) :
            shopEintrag ? h("button", {type: "button", class: "knopf klein" + (shopEintrag.zustand === "kaufbar" ? " primaer" : ""), disabled: shopEintrag.zustand !== "kaufbar", title: shopEintrag.grund || "",
              onclick: () => UI.shop.kaufen(shopEintrag.id, () => akteAnsicht(c, id))}, `Wartungsvertrag anbieten · ${eur(shopEintrag.preis)} €`) : null,
          !vertrag && shopEintrag && shopEintrag.grund ? h("p", {class: "bn-meta"}, shopEintrag.grund) : null),
        h("section", {class: "ka-block bn-s3"},
          UI.bento.kopf("Leistung", "Aufträge"),
          h("p", {class: "bn-wert"}, String(sterne.length), h("small", {}, sterne.length === 1 ? "Auftrag" : "Aufträge")),
          h("p", {class: "bn-meta"}, mittel == null ? "noch kein Auftrag" : `Ø ${mittel.toFixed(1).replace(".", ",")} ★`),
          verlauf[0] ? h("p", {class: "bn-meta"}, "zuletzt " + datumDe(verlauf[0].tag)) : null),
        h("section", {class: "ka-block bn-s3"},
          UI.bento.kopf("Empfehlung", von ? "Empfohlen" : gegeben ? "Ausgesprochen" : "Noch keine"),
          h("p", {class: von ? "bn-lead" : "bn-meta"}, von ? `von ${von.name}` : gegeben ? (belohnungen[0] || {}).text || "Dieser Kunde hat dich weiterempfohlen." : `Ab Vertrauen ${Spiel.VERTRAUEN_LOHN.empfehlung} spricht dieser Kunde eine Empfehlung aus.`),
          empf ? h("p", {class: "bn-meta"}, "am " + datumDe(Spiel.kundenakte.empfehlungen()[id].tag)) : null),
        h("section", {class: "ka-block bn-s3"},
          UI.bento.kopf("Baustellen", bau.length ? `${bau.length} offen` : "Alles sauber"),
          bau.length ? h("ul", {class: "ka-baustellen"}, bau.map(b => h("li", {},
            h("b", {}, "Provisorium: " + b.titel),
            h("p", {class: "bn-meta"}, b.imPostfach ? "Der Folgeauftrag liegt im Postfach." : b.offen ? `Meldet sich in etwa ${b.offen} ${b.offen === 1 ? "Auftrag" : "Aufträgen"} wieder.` : "Meldet sich bald wieder.")))) : h("p", {class: "bn-meta"}, "Keine offenen Provisorien aus deinen Aufträgen.")),
        /* Große Kacheln */
        ...grosseKacheln)));
  }
  function kapitelLesen(kunde, nr, danach){
    const g = Spiel.kundenakte.lesen(kunde, nr); if (!g) return;
    const ergebnis = h("div", {class: "ka-ergebnis", "aria-live": "polite"});
    const fragen = h("div", {class: "ka-optionen"}, g.frage.optionen.map((o, i) => h("button", {type: "button", class: "knopf", onclick: () => {
      const r = Spiel.kundenakte.antworten(kunde, nr, i);
      for (const b of fragen.querySelectorAll("button")) b.disabled = true;
      fragen.children[g.frage.richtig].classList.add("richtig");
      if (!r.richtig) fragen.children[i].classList.add("falsch");
      ergebnis.replaceChildren(h("p", {}, h("b", {}, r.richtig ? (r.erstes ? "Richtig – +1 Ruf. " : "Richtig. ") : "Nicht ganz. "), r.erklaerung), h("p", {class: "sp-leise"}, "Quelle: " + g.quelle));
      if (danach) danach();
    }}, o)));
    UI.app.dialogOeffnen(`${kd(kunde).name} · ${g.titel}`, h("div", {class: "ka-geschichte"},
      h("p", {class: "ka-text"}, g.text),
      h("p", {class: "ka-senior"}, h("span", {class: "sp-senior-sym", "aria-hidden": "true"}, UI.symbol("senior", 28)), h("span", {}, g.senior, h("small", {}, " — der Senior"))),
      h("p", {class: "ka-frage"}, h("b", {}, g.frage.text)), fragen, ergebnis), "ka-dialog");
    if (danach) danach();                                           /* Akte dahinter frisch: Kapitel ist jetzt gelesen */
  }
  function overlay(inhalt){
    const o = h("div", {class: "sp-overlay", role: "dialog", "aria-modal": "true"}, h("div", {class: "sp-karte"}, inhalt));
    document.body.append(o); requestAnimationFrame(() => o.classList.add("da"));
    const zu = () => { o.classList.remove("da"); setTimeout(() => o.remove(), UI.zeit("dauer")); document.removeEventListener("keydown", esc); };
    /* Escape muss auch hier schließen. Gemessen von „menu-auditor“ am 06.10.2026:
       „Prüfung AP1“ und „Mini-Ticket“ blieben nach Escape offen (Geometrie unverändert),
       während die Overlays aus spiel.js und hub.js korrekt schlossen — die hatten den
       Hörer, dieser Bauer nicht. Gleiche Bauart wie src/ui/spiel.js:434-443. */
    const esc = e => { if (e.key === "Escape") zu(); };
    document.addEventListener("keydown", esc);
    return zu;
  }

  /* ---------- Wiki ---------- */
  /* Zusatzseiten: Nachschlage-Seiten OHNE eigene Fertigkeit (Klassenraum, Übergabe – Leitung
     09.10.2026). Sie stehen in DATEN.wiki wie jede andere Seite, gehören aber nicht zu DATEN.skills –
     die 27er-Tabelle ist gesperrt (Klassenraum-Codec). Eine Zusatzseite hat keine Stufe und kein AP;
     deshalb bekommt sie weder in der Liste noch im Artikel einen Stufenkopf (sie hätte sonst den
     Rückfall „Stufe 1 · AP1“). Die Liste steht in den DATEN (`DATEN.wikiZusatz`) – EINE Quelle der
     Wahrheit; der Literal-Rückfall hält die Ansicht auch mit einer älteren Datenschicht heil. */
  const WIKI_ZUSATZ = (typeof DATEN !== "undefined" && Array.isArray(DATEN.wikiZusatz) && DATEN.wikiZusatz.length)
    ? DATEN.wikiZusatz.slice() : ["klassenraum", "uebergabe"];
  function wikiEintraege(){
    const seiten = (DATEN.wiki || {});
    const fertigkeiten = (DATEN.skills || []).map(s => ({s, w: seiten[s.id], zusatz: false})).filter(x => x.w);
    const zusatz = WIKI_ZUSATZ.map(id => ({s: {id, name: (seiten[id] || {}).titel || id}, w: seiten[id], zusatz: true})).filter(x => x.w);
    return [...fertigkeiten, ...zusatz];
  }
  function wikiAnsicht(c){
    const eintraege = wikiEintraege();
    const q = K.wikiSuche.trim().toLowerCase();
    const treffer = q ? eintraege.filter(x => (x.w.titel + " " + x.w.kurz + " " + x.s.name).toLowerCase().includes(q)) : eintraege;
    const wahl = K.wikiWahl && (DATEN.wiki || {})[K.wikiWahl] ? K.wikiWahl : (treffer[0] && treffer[0].s.id);
    const suche = h("input", {type: "search", class: "in-eingabe", placeholder: "Suchen: VLAN, NAT, Gateway …", value: K.wikiSuche, "aria-label": "Wiki durchsuchen",
      oninput: e => { K.wikiSuche = e.target.value; wikiAnsicht(c); const el = c.querySelector("input[type=search]"); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }});
    const artikel = h("article", {class: "kr-artikel"});
    if (wahl) {
      const w = DATEN.wiki[wahl];
      const e = eintraege.find(x => x.s.id === wahl) || null;
      /* Fertigkeitsseiten tragen „Stufe x · APy“; eine Zusatzseite hat keine Stufe – also kein Kopf. */
      const kopf = e && !e.zusatz ? h("small", {class: "sp-leise"}, `Stufe ${e.s.stufe} · ${e.s.ap}`) : null;
      artikel.append(kopf, h("h2", {}, w.titel), h("p", {class: "kr-kurz"}, w.kurz),
        ...(w.abschnitte || []).map(a => h("section", {}, h("h3", {}, a.titel), h("div", {html: a.html}))),
        w.merksatz ? h("p", {class: "kr-merksatz"}, UI.symbol("idee", 16), " ", w.merksatz) : null,
        w.pruefungstipp ? h("p", {class: "kr-tipp"}, UI.symbol("ziel", 16), " Prüfungstipp: ", w.pruefungstipp) : null,
        (w.siehe || []).length ? h("p", {}, "Siehe auch: ", ...w.siehe.filter(x => DATEN.wiki[x]).flatMap((x, i) => [i ? " · " : "", h("a", {href: "#", onclick: e => { e.preventDefault(); K.wikiWahl = x; wikiAnsicht(c); }}, DATEN.wiki[x].titel)])) : null,
        h("p", {class: "sp-leise"}, "Quelle im Vault: " + (w.quelle || "–")));
    }
    c.replaceChildren(h("div", {class: "kr-wiki"},
      h("aside", {class: "kr-wiki-liste"}, h("h2", {}, "Wiki"), suche,
        h("nav", {}, treffer.map(x => h("button", {type: "button", class: "kr-wiki-punkt" + (x.s.id === wahl ? " an" : ""), onclick: () => { K.wikiWahl = x.s.id; wikiAnsicht(c); }},
          h("span", {}, x.w.titel), ...(x.zusatz ? [] : [h("small", {}, "Stufe " + x.s.stufe)]))))),
      artikel));
  }
  function wikiOeffnen(skill){ K.wikiWahl = skill; UI.app.ansicht("wiki"); }

  /* ---------- Leiste: Status und Mini-Ticket (nur Maus) ----------
     hilfeZiel = UI.leiste.miniHilfe: in der Leiste steht Denkhilfe und Anker in einem eigenen Bereich,
     im Overlay (ohne hilfeZiel) im Kartenrand. Beide Wege zeigen denselben Knopf – genau einen je Zustand. */
  function miniZeichnen(el, {gross = false, hilfeZiel = null, schliessen = null} = {}){
    if (hilfeZiel && hilfeZiel.replaceChildren) hilfeZiel.replaceChildren();
    if (!el || !Spiel._st) return;
    const m = K.mini.ergebnis ? Spiel.mini.von(K.mini.ergebnis.id) : Spiel.mini.naechstes();
    if (!m) { el.replaceChildren(h("p", {class: "mk-leer"}, "Gerade kein Mini-Ticket.")); return; }
    if (K.mini.hilfe && K.mini.hilfe.id !== m.id) K.mini.hilfe = null;
    const neu = () => miniZeichnen(el, {gross, hilfeZiel, schliessen});
    const kopf = h("div", {class: "mk-kopf"}, h("span", {class: "sp-chip niv-" + m.stufe}, NIV[m.stufe]), h("span", {class: "mk-skill"}, Spiel.karriere.skillName(m.skill)));
    const teile = [kopf, h("p", {class: "mk-frage"}, m.frage)];
    if (m.schnappschuss && m.schnappschuss.inhalt) teile.push(h("pre", {class: "mk-schnapp"}, m.schnappschuss.inhalt));
    const fertig = res => { K.mini.ergebnis = Object.assign({id: m.id}, res); K.mini.auswahl = []; K.mini.links = null; K.mini.hilfe = null; neu(); leisteStatus(); UI.spiel?.status?.(); };
    /* Denkhilfe (§ 5): der Text kommt aus Spiel.mini.hilfe – dort steht auch die Stufenregel und der
       Schutz gegen die Lösung. Hier wird nur gezeigt und geklickt; nurSehen verbraucht keine Sprosse. */
    const hilfeTeil = () => {
      const offen = K.mini.hilfe && K.mini.hilfe.id === m.id ? K.mini.hilfe : null;
      const naechste = Spiel.mini.hilfe(m.id, {nurSehen: true});
      if (!offen && !naechste) return null;
      const kinder = [];
      if (offen) kinder.push(h("div", {class: "mk-hilfe" + (offen.frei ? "" : " knapp")},
        h("b", {class: "mk-hilfe-art"}, offen.art === "ausschnitt" ? [UI.symbol("suche", 14), " Ausschnitt aus der Aufgabe"] : [UI.symbol("idee", 14), " Denkhilfe"]),
        h("p", {class: "mk-hilfe-text"}, offen.text),
        offen.frei ? null : h("small", {class: "mk-hilfe-vorrat"}, "Der Vorrat an freien Hilfen ist aufgebraucht – die Hilfe bleibt.")));
      if (naechste) kinder.push(h("button", {type: "button", class: "mk-klein mk-hilfe-knopf", tabindex: "-1",
        onmousedown: e => e.preventDefault(),
        onclick: () => { const naechsterText = Spiel.mini.hilfe(m.id); if (naechsterText) K.mini.hilfe = Object.assign({id: m.id}, naechsterText); neu(); }},
        offen ? "Noch eine Denkhilfe" : "Denkhilfe"));
      return kinder.length ? h("div", {class: "mk-hilfe-bereich"}, ...kinder) : null;
    };
    if (K.mini.ergebnis) {
      const e = K.mini.ergebnis;
      teile.push(h("div", {class: "mk-ergebnis " + (e.richtig ? "ok" : "bad")}, h("b", {}, e.richtig ? `✓ Richtig! +${e.lohn} €` : "✗ Nicht ganz."),
        e.richtig ? null : h("p", {}, "Richtig: " + e.loesung), h("p", {}, e.erklaerung)),
        h("button", {type: "button", class: "mk-knopf", onclick: () => { K.mini.ergebnis = null; K.mini.hilfe = null; neu(); }}, "Nächstes ▸"));
      /* Lernanker: nach der Antwort, mit belegter Quelle und Verweis auf UI.wiki.oeffnen (§ 5). */
      const a = Spiel.mini.anker(m.id);
      const anker = a ? h("div", {class: "mk-anker"},
        h("b", {class: "mk-anker-titel"}, UI.symbol("anker", 14), " Lernanker: " + a.titel),
        h("p", {class: "mk-anker-text"}, a.text),
        a.quelle ? h("p", {class: "mk-anker-quelle"}, "Quelle: " + a.quelle) : null,
        a.wiki ? h("button", {type: "button", class: "mk-klein mk-wiki-knopf", tabindex: "-1", onmousedown: e2 => e2.preventDefault(),
          onclick: () => { if (schliessen) schliessen(); UI.wiki?.oeffnen?.(a.wiki); }}, "Im Wiki nachschlagen") : null) : null;
      if (hilfeZiel) hilfeZiel.replaceChildren(anker || "");
      else if (anker) teile.push(anker);
      el.replaceChildren(h("div", {class: "mk" + (gross ? " gross" : "")}, teile)); return;
    }
    if (m.art === "wahl" || m.art === "vorhersage") {
      teile.push(h("div", {class: "mk-optionen"}, m.optionen.map((o, i) => h("button", {type: "button", class: "mk-knopf", onclick: () => fertig(Spiel.mini.antworten(m.id, i))}, o))));
    } else if (m.art === "reihenfolge") {
      const aus = K.mini.auswahl;
      teile.push(h("p", {class: "mk-hinweis"}, "In der richtigen Reihenfolge antippen:"),
        h("div", {class: "mk-optionen"}, m.optionen.map((o, i) => h("button", {type: "button", class: "mk-knopf" + (aus.includes(i) ? " gewaehlt" : ""), disabled: aus.includes(i),
          onclick: () => { aus.push(i); if (aus.length === m.optionen.length) fertig(Spiel.mini.antworten(m.id, aus.slice())); else neu(); }},
          aus.includes(i) ? `${aus.indexOf(i) + 1}. ${o}` : o))),
        aus.length ? h("button", {type: "button", class: "mk-klein", onclick: () => { K.mini.auswahl = []; neu(); }}, "↺ neu anfangen") : null);
    } else if (m.art === "zuordnen") {
      const paare = K.mini.auswahl, links = m.optionen.links, rechts = m.optionen.rechts;
      const belegtL = new Set(paare.map(p => p[0])), belegtR = new Set(paare.map(p => p[1]));
      teile.push(h("p", {class: "mk-hinweis"}, K.mini.links == null ? "Links antippen, dann das passende Rechts:" : `„${links[K.mini.links]}“ gehört zu …`),
        h("div", {class: "mk-zuordnen"},
          h("div", {}, links.map((o, i) => h("button", {type: "button", class: "mk-knopf" + (K.mini.links === i ? " an" : "") + (belegtL.has(i) ? " gewaehlt" : ""), disabled: belegtL.has(i),
            onclick: () => { K.mini.links = i; neu(); }}, belegtL.has(i) ? `${o} ✓` : o))),
          h("div", {}, rechts.map((o, j) => h("button", {type: "button", class: "mk-knopf" + (belegtR.has(j) ? " gewaehlt" : ""), disabled: belegtR.has(j) || K.mini.links == null,
            onclick: () => { paare.push([K.mini.links, j]); K.mini.links = null; if (paare.length === Math.min(links.length, rechts.length)) fertig(Spiel.mini.antworten(m.id, paare.slice())); else neu(); }}, o)))),
        paare.length ? h("button", {type: "button", class: "mk-klein", onclick: () => { K.mini.auswahl = []; K.mini.links = null; neu(); }}, "↺ neu anfangen") : null);
    }
    const ht = hilfeTeil();
    if (hilfeZiel) hilfeZiel.replaceChildren(ht || "");
    else if (ht) teile.push(ht);
    el.replaceChildren(h("div", {class: "mk" + (gross ? " gross" : "")}, teile));
  }
  function miniDialog(){
    const ziel = h("div", {class: "mk-dialog"});
    const zu = overlay(h("div", {}, h("h2", {}, "Mini-Ticket"), ziel, h("div", {class: "sp-knoepfe"}, h("button", {type: "button", class: "knopf geist", onclick: () => zu()}, "Schließen"))));
    miniZeichnen(ziel, {gross: true, schliessen: zu});
  }
  /* Der Weg der Leiste: Ticket in UI.leiste.miniBereich, Denkhilfe und Anker in UI.leiste.miniHilfe (§ 5). */
  const leisteMini = () => miniZeichnen(UI.leiste.miniBereich, {hilfeZiel: UI.leiste.miniHilfe});
  function leisteStatus(){
    if (!Spiel._st) return;
    const ampeln = Spiel.karriere.vertragskunden().map(id => ({name: kd(id).name, farbe: Spiel.wartung.ampelBei(id), zustand: AMPEL[Spiel.wartung.ampelBei(id)]?.[2] || ""}));
    const offen = Spiel.offen();
    const text = Spiel.einst.unterricht ? "Unterricht: " + Spiel.karriere.skillName(Spiel.einst.unterricht)
      : ampeln.length ? "" : offen ? `${offen} ${offen === 1 ? "Auftrag wartet" : "Aufträge warten"} im Postfach. Verträge (Shop) bringen €/h.` : "Alles erledigt. Löse ein Mini-Ticket oder gönn dir eine Pause.";
    const sd = Spiel.karriere.stufeDef(Spiel.st.stufe);
    UI.leiste.status({ampeln, euroProStunde: Spiel.euroProStunde(), ruf: Spiel.st.ruf, offen, text, titel: `Stufe ${Spiel.st.stufe} · ${sd ? sd.name : ""}`});
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
        /* „Prüfungsstrenge je Ticket" statt „Niveau": der Vertrag (§ 1) unterscheidet drei Achsen, und
           „Erklärtiefe" (src/ui/app.js) hat dieselben Optionen E/AP1/AP2 — zwei gleich aussehende
           Einstellungen mit verschiedenen Namen sind eine Verwechslungsfalle
           (Review Auffindbarkeit, Befund 4). */
        wahl("Prüfungsstrenge je Ticket", "wahl", [["auto", "Automatisch (passt sich an)"], ["E", "Einstieg – erklärt alles"], ["AP1", "AP1 – Prüfungsform"], ["AP2", "AP2 – ohne Live-Ziele, Neustart-Test"]]),
        wahl("Heute im Unterricht", "unterricht", [["", "– kein Thema –"], ...(DATEN.skills || []).filter(s => s.stufe <= 5).map(s => [s.id, s.name])]),
        schalter("Vorhersage vor dem Ping", "vorhersage", "Erst raten, dann sehen (Einstieg/AP1)"),
        schalter("Coach-Hinweise", "coach", "Tipps beim ersten Ticket"),
        /* Anfänger-Hilfe (Runde 4, Strang C): Standard an bei Karrierestufe ≤ 2, sonst aus;
           gespeichert wird nur, was der Spieler ausdrücklich umstellt (store "einst".anfaengerHilfe).
           Der Flugschreiber liest denselben Wert (UI.simpanel.anfaengerHilfe). */
        h("label", {class: "kr-einst"},
          h("span", {}, "Anfänger-Hilfe", h("small", {}, "Hinweise, Highlight des nötigen Werkzeugs und Schritt für Schritt im Flugschreiber")),
          h("input", {type: "checkbox", checked: typeof UI.simpanel?.anfaengerHilfe === "function" ? UI.simpanel.anfaengerHilfe() : e.anfaengerHilfe !== false,
            onchange: ev => { if (typeof UI.simpanel?.anfaengerHilfeSetzen === "function") UI.simpanel.anfaengerHilfeSetzen(!!ev.target.checked); else Spiel.einstSetzen("anfaengerHilfe", !!ev.target.checked); }})));
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
      const pruef = Spiel.importPruefen(d);                 /* fremd oder ZU NEU? alte Stände sind erlaubt (Migration) */
      if (!pruef.ok) { UI.toast(pruef.grund, "fehler", pruef.zuNeu ? {titel: "Zu neuer Spielstand", dauer: 14000} : undefined); return; }
      const lab = d.speicher.labor || {};
      const zu = overlay(h("div", {class: "sp-ergebnis"}, h("h2", {}, "Spielstand importieren?"),
        h("p", {}, `Stand vom ${datumDe(d.datum || heute())}: Stufe ${lab.stufe || 1}, ${eur(lab.euro || 0)} €, ${lab.ruf || 0} Ruf, ${(lab.erledigt || []).length} erledigte Tickets.`),
        h("p", {class: "sp-leise"}, "Dein aktueller Stand wird ersetzt — er bleibt aber als Sicherung im Spielstand erhalten (ein Export ist trotzdem die sichere Ablage)."),
        h("div", {class: "sp-knoepfe"}, h("button", {type: "button", class: "knopf primaer", onclick: () => {
          const vorher = store.get("labor", null);            /* bisheriger Stand, noch vor dem Ersetzen */
          store.initialisieren(d.speicher, SPEICHER.schreiber, null);
          Spiel.sicherungAnlegen(vorher, true);               /* rollierende Zweitsicherung im NEUEN Speicher ablegen */
          store.markieren(); store.sofort(); location.reload();
        }}, "Ersetzen und neu laden"),
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
    UI.klang?.spielen("fanfare");
    const kunden = (f.kunden || []).map(kd);
    const zu = overlay(h("div", {class: "sp-willkommen sp-fest"}, h("span", {class: "sp-senior-sym gross"}, UI.symbol("feier", 56)),
      h("small", {class: "sp-leise"}, "Aufstieg"),
      h("h2", {}, `Stufe ${f.stufe}: ${f.name}`), h("p", {}, "„" + f.satz + "“"),
      kunden.length ? h("p", {}, "Neue Kunden: ", kunden.map(k => `${k.symbol} ${k.name}`).join(", ")) : null,
      (f.geraete || []).length ? h("p", {}, "Neu in der Gerätepalette: " + f.geraete.join(", ")) : null,
      (f.themen || []).length ? h("p", {class: "sp-leise"}, "Neue Themen: " + f.themen.map(s => Spiel.karriere.skillName(s)).join(" · ")) : null,
      h("button", {type: "button", class: "knopf primaer gross", onclick: () => { zu(); Spiel.karriere.festGesehen(); UI.app.ansicht("postfach"); }}, "Weiter ▸")));
  }
  /* Die Feier kommt erst, wenn kein anderes Fenster offen ist (Ergebnis, Offline-Bericht, Willkommen) – nie gestapelt */
  let festTimer = null;
  function festPlanen(ms){
    clearTimeout(festTimer);
    festTimer = setTimeout(() => {
      const f = Spiel._st ? Spiel.karriere.daten().fest : null;
      if (!f || f.gesehen) return;
      if (!UI.buehneFrei()) { festPlanen(900); return; }
      festZeigen(f);
    }, ms);
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
      h("span", {}, UI.symbol("serie", 13), ` ${t.serie} Tag${t.serie === 1 ? "" : "e"} Serie · ${t.erledigtHeute}/${t.ziel} Tickets heute`),
      t.faellig.length ? h("button", {type: "button", class: "knopf klein", onclick: () => { const n = Spiel.tag.bereitschaftStarten(); UI.toast(n.length ? `${n.length} Wiederholung${n.length === 1 ? "" : "en"} als Bereitschaftsdienst im Postfach.` : "Gerade nichts Fälliges mit Ticket.", "info"); UI.spiel.status(); if (UI.app.aktuell === "postfach") UI.app.ansicht("postfach"); }},
        UI.symbol("werkzeug", 14), ` Bereitschaftsdienst (${t.faellig.length} fällig)`) : null,
      h("button", {type: "button", class: "knopf klein geist", onclick: () => miniDialog()}, UI.symbol("blitz", 16), " Mini-Ticket"));
  }

  /* ---------- Anmeldung ---------- */
  (UI.startHaken ||= []).push(() => {
    UI.app.registrieren("kunden", {titel: "Kunden", symbol: "kunden", zeigen: kundenAnsicht, wieder: kundenAnsicht});
    UI.app.registrieren("wiki", {titel: "Wiki", symbol: "wiki", zeigen: wikiAnsicht, wieder: wikiAnsicht});
    /* Lernstand meldet src/ui/lernstand.js an, Shop src/ui/shop.js (Runde 4, ein Schreiber je Datei). */
    abschnitte();
  });
  Bus.an("ui-bereit", () => {
    setTimeout(() => {
      try {
        takt(); offlineZeigen();
        leisteMini();
        festPlanen(600);
      } catch (e) { console.error("Karriere-Start", e); }
    }, 300);
    setInterval(takt, 60000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") takt(); });
  });
  Bus.an("zustand-geaendert", () => leisteStatus());
  Bus.an("aufstieg", () => festPlanen(1200));
  Bus.an("mini", () => { if (!K.mini.ergebnis) leisteMini(); });

  /* Rückwärtskompatibel: die ausgelagerten Ansichten bleiben unter UI.karriere erreichbar
     (Tests und lernstand-hilfe.js nutzen diese Namen). Die Helfer teilen sich die neuen Dateien. */
  return {kundenAnsicht, wikiAnsicht, wikiOeffnen, miniZeichnen, miniDialog, leisteStatus, tagKarte,
    _helfer: {overlay},
    shopAnsicht: c => UI.shop.ansicht(c), kaufen: (id, danach) => UI.shop.kaufen(id, danach),
    lernstandAnsicht: c => UI.lernstand.ansicht(c), training: s => UI.lernstand.training(s),
    pruefungUebersicht: () => UI.lernstand.pruefungUebersicht(), pruefungAbgeben: () => UI.lernstand.pruefungAbgeben()};
})();
UI.wiki = {oeffnen: skill => UI.karriere.wikiOeffnen(skill)};
UI.tag = {karte: () => UI.karriere.tagKarte()};
