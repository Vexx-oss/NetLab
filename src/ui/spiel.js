"use strict";
/* ---------- Spiel-Oberfläche: Ticketfluss (Konzept §§ 3.2, 3.5, 4) ----------
   Postfach (Ansicht „postfach“) · Auftragsleiste mit Live-✓ (#labor-auftrag) · Hilfeleiter mit Lösungsvorführung ·
   Abnahme und Ergebnisbildschirm · Onboarding (salon-01 in 60 Sekunden) · Vorhersage beim Ping · Senior-Angebot.
   Die Logik liegt in spiel/*.js; hier nur Anzeige und Bedienung. Start über Bus „ui-bereit“ (ui/start.js). */
UI.spiel = (() => {
  const S = {inst: null, live: null, liveTimer: null, hilfeOffen: false, hilfeAnsicht: null, demo: null, seniorTimer: null, coach: null, vorhersageGefragt: new Set()};
  const kunde = id => (Spiel.kundenDaten ? Spiel.kundenDaten(id) : (DATEN.kunden || {})[id]) || {name: id || "Kunde", symbol: "✉", farbe: "--accent", ansprechpartner: {name: ""}};
  const NIV = {E: "Einstieg", AP1: "AP1", AP2: "AP2"};
  const sterneText = s => "★".repeat(Math.floor(s)) + (s % 1 ? "½" : "") + "☆".repeat(Math.max(0, 5 - Math.ceil(s)));
  const istTicketNetz = () => S.inst && UI.labor.netz === S.inst.netz;
  const fmtEuro = x => `${eur(x)} €`;
  const absaetze = t => String(t || "").split(/\n{2,}/).map(p => h("p", {}, ...p.split("\n").flatMap((z, i) => i ? [h("br"), z] : [z])));

  /* ---------- Kopfzeile, Tray, Andock-Zähler ---------- */
  function status(){
    if (!Spiel._st) return;
    const st = Spiel.st, offen = Spiel.offen();
    const eph = typeof Spiel.euroProStunde === "function" ? Spiel.euroProStunde() : 0;
    UI.app.status({euro: st.euro, ruf: st.ruf, stufe: st.stufe, offen});
    try { Plattform.abzeichen(offen, `${offen} ${offen === 1 ? "Ticket" : "Tickets"}${eph ? ` · ${eur(eph)} €/h` : ""}`); } catch (e) { /* Plattform ohne Abzeichen */ }
    UI.app.aktualisieren?.();
  }

  /* ---------- Ticket öffnen ---------- */
  function oeffnen(iid, {ansicht = true} = {}){
    const r = Spiel.oeffnen(iid);
    S.inst = r.inst; S.live = null; S.hilfeOffen = false; S.hilfeAnsicht = null; S.demo = null;
    UI.labor.laden(r.netz, {titel: r.def.titel, verlauf: r.verlauf, auftrag: el => auftrag(el)});
    if (ansicht) UI.app.ansicht("labor");
    liveJetzt();
    seniorPlanen();
    if (!Spiel.st.einstieg.fertig && r.def.id === Spiel.EINSTIEG_TICKET) coachStart();
    status();
  }
  function aktiveLaden(){
    const inst = Spiel.aktiveInstanz && Spiel.aktiveInstanz();
    if (inst) oeffnen(inst.iid, {ansicht: false});
  }
  function ticketVerlassen(){
    S.inst = null; S.demo = null; S.coach = null;
    clearInterval(S.seniorTimer); S.seniorTimer = null;
    UI.sandbox?.laden?.();
  }

  /* ---------- Auftragsleiste ---------- */
  function auftrag(el){
    const inst = S.inst;
    if (!inst || !Spiel.instanz(inst.iid)) { el.append(h("div", {class: "lb-auftrag-standard"}, h("strong", {}, "Kein offenes Ticket"))); return; }
    const def = Spiel.defVon(inst), k = kunde(inst.kunde || def.kunde), niveau = Spiel.niveauVon(inst);
    const live = niveau !== "AP2";
    const stand = S.live || {status: (def.ziele || []).map(z => ({ziel: z, ok: null}))};
    const erfuellt = stand.status.filter(s => s.ok).length;
    const naechste = Spiel.naechsteHilfe(inst);
    const kopf = h("div", {class: "sp-auftrag-kopf"},
      h("span", {class: "sp-kunde-sym", style: {"--k": `var(${k.farbe || "--accent"})`}, title: k.name}, k.symbol || "✉"),
      h("div", {class: "sp-auftrag-titel"},
        h("strong", {}, def.titel),
        h("span", {}, `${k.name} · ${NIV[niveau] || niveau}${def.art === "projekt" ? " · Projekt" : ""}`)),
      h("div", {class: "sp-auftrag-knoepfe"},
        h("button", {type: "button", class: "knopf sp-hilfe-knopf" + (S.hilfeOffen ? " an" : ""), title: "Hilfeleiter: vom Hinweis bis zur vorgeführten Lösung", onclick: () => { S.hilfeOffen = !S.hilfeOffen; UI.labor.auftragNeu(); }},
          "🛟 Hilfe", (inst.hilfeStufe || 0) > 0 ? h("small", {}, ` ${inst.hilfeStufe}/6`) : null),
        h("button", {type: "button", class: "knopf primaer sp-abnahme" + (live && stand.status.length && erfuellt === stand.status.length ? " bereit" : ""), onclick: abnahmeAnfordern}, "✓ Abnahme anfordern"),
        h("button", {type: "button", class: "knopf geist", title: "Mehr", onclick: e => menue(e, inst, def)}, "⋯")));
    const ziele = h("ul", {class: "sp-ziele"}, stand.status.map((s, i) => h("li", {class: live ? (s.ok ? "ok" : s.ok === false ? "offen" : "") : "neutral", "data-i": i},
      h("span", {class: "sp-haken", "aria-hidden": "true"}, live ? (s.ok ? "✓" : "○") : "•"),
      h("span", {}, s.ziel.text || s.ziel.typ),
      s.ziel.typ === "blockiert" ? h("small", {class: "sp-blockiert"}, " darf nicht gehen") : null)));
    const zeile = h("div", {class: "sp-auftrag-mitte"},
      h("p", {class: "sp-symptom"}, h("b", {}, "Symptom: "), def.symptom || ""),
      ziele,
      live ? h("span", {class: "sp-fortschritt"}, `${erfuellt}/${stand.status.length} Ziele`) : h("span", {class: "sp-fortschritt"}, "AP2: Ziele prüfst du selbst – die Abnahme sagt, ob es reicht."));
    const ungespeichert = Spiel.speichernErwartet(def, niveau) ? Spiel.ungespeicherteGeraete(inst) : [];
    el.append(h("div", {class: "sp-auftrag", style: {"--k": `var(${k.farbe || "--accent"})`}}, kopf, zeile,
      ungespeichert.length ? h("p", {class: "sp-ungespeichert"}, "💾 Nicht gespeichert: ", ungespeichert.map(g => g.name).join(", "),
        niveau === "AP2" ? " – die Abnahme startet die Geräte neu!" : " – nach einem Neustart wäre die Änderung weg.") : null,
      S.coach ? coachLeiste() : null,
      S.hilfeOffen ? hilfePanel(inst, def, naechste) : null));
  }
  function menue(e, inst, def){
    const r = e.currentTarget.getBoundingClientRect();
    const eintraege = [
      {text: "Ticket zurücksetzen", fn: () => { Spiel.zuruecksetzen(inst); S.live = null; liveJetzt(); UI.labor.einpassen(); UI.toast("Das Ticket steht wieder auf Anfang (Strg+Z holt deinen Stand zurück).", "info"); }},
      {text: "Zum Postfach", fn: () => UI.app.ansicht("postfach")},
    ];
    if (Spiel.niveauVon(inst) !== "AP2" && typeof UI.wiki?.oeffnen === "function") eintraege.unshift({text: "📖 Nachschlagen: " + Spiel.skill((def.skills || [])[0]).name, fn: () => UI.wiki.oeffnen((def.skills || [])[0])});
    if (typeof UI.menue === "function") return UI.menue(r.left, r.bottom + 4, eintraege, {titel: "Ticket"});
    eintraege[0].fn();
  }

  /* ---------- Live-Prüfung (Einstieg und AP1) ---------- */
  function liveJetzt(){
    if (!S.inst) return;
    const niveau = Spiel.niveauVon(S.inst);
    const r = Spiel.zieleLive(S.inst);
    const vorher = S.live;
    S.live = r;
    UI.labor.auftragNeu();
    if (niveau === "AP2") return;
    if (vorher && r.neuOk.length) {
      for (const i of r.neuOk) { const li = document.querySelector(`.sp-ziele li[data-i="${i}"]`); li?.classList.add("frisch"); }
      if (r.alle) {
        UI.toast("Alle Ziele erfüllt! Jetzt „Abnahme anfordern“ – der Kunde prüft selbst nach.", "ok", {id: "ziele", titel: "Geschafft"});
        if (S.coach && S.coach.schritt < 1) coachWeiter(1);
      } else UI.toast(`Ziel erfüllt: ${r.status[r.neuOk[0]].ziel.text}`, "ok", {id: "ziele", dauer: 2600});
    }
  }
  function livePlanen(){
    if (!S.inst) return;
    clearTimeout(S.liveTimer);
    S.liveTimer = setTimeout(liveJetzt, 400);
  }

  /* ---------- Hilfeleiter ---------- */
  function hilfePanel(inst, def, naechste){
    const stufe = inst.hilfeStufe || 0;
    const zeigen = S.hilfeAnsicht ?? stufe;
    const leiter = h("ol", {class: "sp-leiter"}, Spiel.HILFE.slice(1).map(x => h("li", {class: (x.stufe <= stufe ? "frei" : "") + (x.stufe === zeigen ? " an" : "")},
      h("button", {type: "button", disabled: x.stufe > stufe, title: x.name + (x.kosten ? ` (−${x.kosten === 0.5 ? "½" : x.kosten} ★)` : " (frei)"),
        onclick: () => { S.hilfeAnsicht = x.stufe; UI.labor.auftragNeu(); }}, x.stufe), h("span", {}, x.name))));
    const inhalt = h("div", {class: "sp-hilfe-inhalt"});
    if (zeigen === 0) inhalt.append(h("p", {}, "Die Hilfe beginnt kostenlos: Checkliste, Werkzeugtipp, eine Frage vom Senior. Erst danach kostet sie Sterne – und selbst die vorgeführte Lösung ist kein Scheitern."));
    else inhalt.append(hilfeInhalt(inst, Spiel.hilfeInhalt(inst, zeigen)));
    const knopf = naechste ? h("button", {type: "button", class: "knopf" + (naechste.kosten ? "" : " primaer"), onclick: () => {
        const r = Spiel.hilfe(inst); S.hilfeAnsicht = r.stufe;
        if (r.stufe === 4 && r.bereich?.length) UI.labor.hervorheben(r.bereich, 6000);
        if (r.stufe === 6) S.demo = {i: 0, schritte: r.schritte};
        UI.labor.auftragNeu();
      }}, naechste.knopf, naechste.kosten ? h("small", {}, ` −${naechste.kosten === 0.5 ? "½" : naechste.kosten} ★`) : h("small", {}, " frei")) : null;
    return h("section", {class: "sp-hilfe"}, h("div", {class: "sp-hilfe-kopf"}, h("strong", {}, "Hilfeleiter"), leiter), inhalt, h("div", {class: "sp-hilfe-fuss"}, knopf,
      h("button", {type: "button", class: "knopf geist", onclick: () => { S.hilfeOffen = false; UI.labor.auftragNeu(); }}, "Schließen")));
  }
  function hilfeInhalt(inst, r){
    switch (r.stufe) {
      case 1: return h("div", {}, h("p", {class: "sp-leise"}, "Von unten nach oben – hak ab, was du geprüft hast:"),
        h("ul", {class: "sp-check"}, r.leiter.map(s => h("li", {}, h("label", {},
          h("input", {type: "checkbox", checked: s.erledigt, onchange: e => Spiel.leiterHaken(inst, s.id, e.target.checked)}),
          h("span", {}, h("b", {}, s.titel + ": "), s.frage, h("small", {}, " Werkzeug: " + s.werkzeug)))))));
      case 2: return h("div", {}, ...r.werkzeuge.map(w => h("p", {}, "🔧 ", w)), h("p", {class: "sp-leise"}, r.simulation));
      case 3: return h("div", {class: "sp-senior"}, h("span", {class: "sp-senior-sym"}, "🧑‍🔧"), h("div", {}, ...r.fragen.map(f => h("p", {}, "„" + f + "“")), h("small", {}, "— der Senior")));
      case 4: return h("div", {}, h("p", {}, "Schau dir diese Stelle genauer an: ", h("b", {}, r.namen.join(", ") || "—")),
        h("button", {type: "button", class: "knopf klein", onclick: () => UI.labor.hervorheben(r.bereich, 5000)}, "Noch einmal zeigen"));
      case 5: return h("div", {}, ...r.konkret.map(k => h("p", {}, "💡 ", k)));
      case 6: return demoAnsicht(inst, r);
    }
    return h("p", {}, r.name);
  }
  /* Lösung vorführen: Schritt für Schritt sichtbar, jeder Schritt über den Verlauf (rückgängig machbar) */
  function demoAnsicht(inst, r){
    const d = S.demo ||= {i: 0, schritte: r.schritte};
    const alle = d.schritte;
    const liste = h("ol", {class: "sp-demo"}, alle.map((s, i) => h("li", {class: i < d.i ? "fertig" : i === d.i ? "jetzt" : ""},
      h("div", {class: "sp-demo-kopf"}, h("b", {}, s.geraetName ? s.geraetName + ": " : ""), s.text),
      i === d.i && s.art === "cli" ? h("pre", {class: "sp-demo-cli"}, s.zeilen.join("\n")) : null,
      i === d.i && s.art === "setzen" ? h("ul", {class: "sp-demo-felder"}, s.felder.map(f => h("li", {}, h("code", {}, f.pfad), " = ", h("b", {}, JSON.stringify(f.wert)),
        f.entspricht ? h("pre", {class: "sp-demo-cli"}, f.entspricht) : null))) : null)));
    const weiter = d.i < alle.length
      ? h("button", {type: "button", class: "knopf primaer", onclick: () => demoSchritt(inst)}, `Schritt ${d.i + 1} ausführen ▸`)
      : h("p", {class: "sp-ok"}, "✓ Alle Schritte ausgeführt. Jetzt „Abnahme anfordern“. Dieses Thema kommt als Wiederholung wieder – dann löst du es selbst.");
    return h("div", {}, h("p", {class: "sp-leise"}, "Sieh zu, was passiert – jeder Schritt ist ein echter Konfigurationsschritt (Strg+Z macht ihn rückgängig)."), liste, weiter);
  }
  function demoSchritt(inst){
    const d = S.demo; if (!d) return;
    const s = d.schritte[d.i];
    if (s.geraet) { UI.labor.auswaehlen(s.geraet); UI.labor.hervorheben([{geraet: s.geraet}], 2400); }
    if (s.schritt && s.schritt.a) UI.labor.hervorheben([{geraet: s.schritt.a.geraet}, {geraet: s.schritt.b?.geraet}].filter(x => x.geraet), 2400);
    try { Spiel.vorfuehrenSchritt(inst, d.i); } catch (e) { UI.toast("Dieser Schritt ging nicht: " + e.message, "fehler"); return; }
    d.i++;
    UI.labor.auftragNeu();
  }

  /* ---------- Senior bietet Hilfe an (einmal je Ticket, nach 4 min ohne Fortschritt) ---------- */
  function seniorPlanen(){
    clearInterval(S.seniorTimer);
    S.seniorTimer = setInterval(() => {
      const inst = S.inst;
      if (!inst || !istTicketNetz() || UI.app.aktuell !== "labor" || !Spiel.seniorFaellig(inst)) return;
      Spiel.seniorAngeboten(inst);
      const satz = (DATEN.senior?.fehlerTrost || [])[inst.seed % Math.max(1, (DATEN.senior?.fehlerTrost || []).length)] || "Kleiner Tipp gefällig?";
      UI.toast(`„${satz}“ Magst du eine Frage von mir als Denkanstoß?`, "info", {titel: "Der Senior", dauer: 12000, id: "senior",
        aktion: {text: "Ja, gern", fn: () => { S.hilfeOffen = true; while ((inst.hilfeStufe || 0) < 3) Spiel.hilfe(inst); S.hilfeAnsicht = 3; UI.labor.auftragNeu(); }}});
    }, 30000);
  }

  /* ---------- Abnahme und Ergebnis ---------- */
  function abnahmeAnfordern(){
    const inst = S.inst; if (!inst) return;
    const ab = Spiel.abnahme(inst);
    const erg = Spiel.abschliessen(inst, ab);
    if (erg.bestanden) { S.coach = null; ticketFertig(); }
    ergebnisZeigen(erg);
    status();
  }
  function ticketFertig(){
    clearInterval(S.seniorTimer); S.seniorTimer = null;
    S.inst = null; S.demo = null; S.live = null;
  }
  function overlay(inhalt, klasse = ""){
    const o = h("div", {class: "sp-overlay " + klasse, role: "dialog", "aria-modal": "true"}, h("div", {class: "sp-karte"}, inhalt));
    document.body.append(o);
    requestAnimationFrame(() => o.classList.add("da"));
    const zu = () => { o.classList.remove("da"); setTimeout(() => o.remove(), 180); document.removeEventListener("keydown", esc); };
    const esc = e => { if (e.key === "Escape") zu(); };
    document.addEventListener("keydown", esc);
    return zu;
  }
  function ergebnisZeigen(erg){
    const def = erg.def, k = kunde(erg.inst.kunde || def.kunde), niveau = erg.abnahme.niveau;
    if (!erg.bestanden) {
      const ab = erg.abnahme;
      const zu = overlay(h("div", {class: "sp-ergebnis nicht"},
        h("h2", {}, "Noch nicht ganz"),
        h("p", {class: "sp-leise"}, "Die Abnahme hat nachgemessen. Kein Abzug – du kannst weiterarbeiten."),
        h("ul", {class: "sp-pruefliste"},
          ab.ergebnisse.map(e => h("li", {class: e.ok ? "ok" : "offen"}, h("span", {}, e.ok ? "✓" : "✗"), h("div", {},
            h("b", {}, e.ziel.text || e.ziel.typ),
            !e.ok && e.grund ? h("p", {}, Spiel.grundTitel(e.grund) + (niveau !== "AP2" ? " – " + Spiel.grundText(e.grund, niveau) : "")) : !e.ok ? h("p", {}, e.text) : null))),
          ab.kollateral.map(r => h("li", {class: "offen"}, h("span", {}, "⚠"), h("div", {}, h("b", {}, `Kollateralschaden: ${r.vonName} erreicht ${r.nachName} nicht mehr`),
            h("p", {}, "Das ging vorher. Change-Management heißt: Nichts, was lief, darf kaputtgehen. " + Spiel.grundTitel(r.grund))))),
          ab.neustart.verlust && niveau === "AP2" ? h("li", {class: "offen"}, h("span", {}, "💾"), h("div", {}, h("b", {}, "Nach dem Neustart war deine Änderung weg"),
            h("p", {}, "Die Abnahme hat " + ab.neustart.geraete.map(g => g.name).join(", ") + " neu gestartet. Ungespeichertes steht nur im RAM – „copy running-config startup-config“ schreibt es ins NVRAM."))) : null),
        h("div", {class: "sp-knoepfe"},
          h("button", {type: "button", class: "knopf primaer", onclick: () => zu()}, "Zurück ins Labor"),
          h("button", {type: "button", class: "knopf", onclick: () => { zu(); S.hilfeOffen = true; UI.labor.auftragNeu(); }}, "🛟 Hilfe"))));
      return;
    }
    const sterne = erg.sterne;
    const sternEl = h("div", {class: "sp-sterne", "aria-label": `${sterne} von 5 Sternen`}, [1, 2, 3, 4, 5].map(i => h("span", {class: i <= sterne ? "voll" : i - 0.5 <= sterne ? "halb" : "leer", style: {"--i": i}}, "★")));
    const euroEl = h("b", {class: "sp-geld"}, "+0,00 €");
    const lernen = (erg.lernen || []).map(l => {
      const r = h("span", {class: "sp-ring", style: {"--von": l.vorher / 5, "--nach": l.nachher / 5}});
      return h("li", {}, r, h("div", {}, h("b", {}, l.name), h("small", {}, l.nachher > l.vorher ? `Stufe ${l.vorher} → ${l.nachher} · ${l.stufe}` : l.stufe)));
    });
    const zu = overlay(h("div", {class: "sp-ergebnis"},
      h("div", {class: "sp-erg-kopf"}, h("span", {class: "sp-kunde-sym gross", style: {"--k": `var(${k.farbe || "--accent"})`}}, k.symbol || "✉"),
        h("div", {}, h("span", {class: "sp-leise"}, `${k.name} · ${def.titel}`), h("h2", {}, sterne >= 4.5 ? "Hervorragend gelöst!" : sterne >= 3 ? "Gelöst!" : "Gelöst – mit Hilfe"))),
      sternEl,
      h("blockquote", {class: "sp-dank"}, "„" + erg.dank + "“", h("cite", {}, "— " + (k.ansprechpartner?.name || k.name))),
      h("div", {class: "sp-lohn"}, euroEl, h("b", {class: "sp-ruf"}, `+${erg.ruf} Ruf`), erg.lohn.tempo ? h("small", {}, `inkl. ${fmtEuro(erg.lohn.tempo)} Tempo-Bonus`) : null),
      erg.abnahme.abzuege.length ? h("ul", {class: "sp-abzuege"}, erg.abnahme.abzuege.map(a => h("li", {}, `−${a.sterne === 0.5 ? "½" : a.sterne} ★ ${a.text}`))) : null,
      lernen.length ? h("section", {}, h("h3", {}, "Was du geübt hast"), h("ul", {class: "sp-lernen"}, lernen)) : null,
      def.erklaerung ? h("section", {class: "sp-erklaerung"}, h("h3", {}, "Was war los?"), h("p", {}, def.erklaerung),
        def.quelle ? h("small", {class: "sp-leise"}, "Nachlesen: " + def.quelle) : null) : null,
      h("div", {class: "sp-knoepfe"},
        erg.naechstes ? h("button", {type: "button", class: "knopf primaer", onclick: () => { zu(); oeffnen(erg.naechstes); }}, "Nächstes Ticket ▸") : null,
        h("button", {type: "button", class: "knopf" + (erg.naechstes ? "" : " primaer"), onclick: () => { zu(); UI.sandbox?.laden?.(); UI.app.ansicht("postfach"); }}, "Zum Postfach"),
        typeof UI.wiki?.oeffnen === "function" && (def.skills || [])[0] ? h("button", {type: "button", class: "knopf geist", onclick: () => { zu(); UI.wiki.oeffnen(def.skills[0]); }}, "📖 Nachschlagen") : null)), "erfolg");
    zaehlen(euroEl, erg.euro);
  }
  function zaehlen(el, ziel){
    if (UI.bewegung() !== "voll") { el.textContent = `+${fmtEuro(ziel)}`; return; }
    const t0 = performance.now(), dauer = 900;
    const f = t => { const p = Math.min(1, (t - t0) / dauer); el.textContent = `+${fmtEuro(ziel * (1 - Math.pow(1 - p, 3)))}`; if (p < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }

  /* ---------- Postfach ---------- */
  function postfachAnsicht(c){
    const st = Spiel.st;
    const liste = Spiel.postfach();
    const aktiv = S.postfachWahl && liste.find(i => i.iid === S.postfachWahl) ? S.postfachWahl : (liste[0] ? liste[0].iid : null);
    S.postfachWahl = aktiv;
    const leser = h("div", {class: "sp-leser"});
    const karten = liste.map(inst => mailKarte(inst, inst.iid === aktiv, () => { S.postfachWahl = inst.iid; postfachAnsicht(c); }));
    const kopf = h("header", {class: "sp-pf-kopf"},
      h("div", {}, h("h2", {}, "Postfach"), h("p", {class: "sp-leise"}, liste.length ? `${liste.length} ${liste.length === 1 ? "Auftrag wartet" : "Aufträge warten"} · Stufe ${st.stufe} · ${st.erledigt.length} erledigt` : "Alles erledigt.")),
      h("div", {class: "sp-pf-aktionen"},
        UI.tag?.karte ? UI.tag.karte() : null,
        h("button", {type: "button", class: "knopf", onclick: () => { UI.sandbox.laden(); UI.app.ansicht("labor"); }, title: "Ohne Auftrag frei ausprobieren"}, "🧪 Freies Labor")));
    const links = h("div", {class: "sp-pf-liste", role: "list"}, karten.length ? karten : h("div", {class: "sp-leer"},
      h("p", {}, "Keine offenen Aufträge. Gönn dir eine Pause – oder hol dir neue Arbeit."),
      h("button", {type: "button", class: "knopf primaer", onclick: () => { Spiel.nachschub(); status(); postfachAnsicht(c); }}, "Neuen Auftrag holen")));
    c.replaceChildren(h("div", {class: "sp-postfach"}, kopf, h("div", {class: "sp-pf-teile"}, links, leser)));
    if (aktiv) leserZeigen(leser, Spiel.instanz(aktiv));
  }
  function mailKarte(inst, an, wahl){
    const def = Spiel.defVon(inst), k = kunde(inst.kunde || def.kunde);
    const vorschau = String(def.briefing || "").replace(/\s+/g, " ").slice(0, 110);
    const frist = inst.frist ? Math.round((inst.frist - jetzt()) / 60000) : null;
    return h("button", {type: "button", role: "listitem", class: "sp-mail" + (an ? " an" : "") + (inst.gelesen ? "" : " neu") + (frist != null && frist < 15 ? " eilig" : ""),
      style: {"--k": `var(${k.farbe || "--accent"})`}, onclick: wahl},
      h("span", {class: "sp-kunde-sym"}, k.symbol || "✉"),
      h("span", {class: "sp-mail-text"},
        h("span", {class: "sp-mail-von"}, `${k.ansprechpartner?.name || k.name} · ${k.name}`),
        h("b", {}, def.titel),
        h("span", {class: "sp-mail-vorschau"}, vorschau + (String(def.briefing || "").length > 110 ? " …" : "")),
        h("span", {class: "sp-chips"},
          h("span", {class: "sp-chip niv-" + (Spiel.niveauFuer ? Spiel.niveauFuer(def) : def.stufe)}, NIV[Spiel.niveauFuer ? Spiel.niveauFuer(def) : def.stufe] || def.stufe),
          h("span", {class: "sp-chip"}, `~${Spiel.minuten(def)} min`),
          h("span", {class: "sp-chip geld"}, fmtEuro((def.lohn || {}).euro || 0)),
          inst.quelle === "wartung" ? h("span", {class: "sp-chip wartung"}, "Wartung") : null,
          inst.quelle === "wiederholung" ? h("span", {class: "sp-chip wdh"}, "Wiederholung") : null,
          def.art === "projekt" ? h("span", {class: "sp-chip projekt"}, "Projekt") : null,
          frist != null ? h("span", {class: "sp-chip frist"}, frist > 0 ? `⏱ ${frist} min` : "⏱ überfällig") : null)));
  }
  function leserZeigen(el, inst){
    if (!inst) return;
    const def = Spiel.defVon(inst), k = kunde(inst.kunde || def.kunde);
    if (!inst.gelesen) { Spiel.alsGelesen(inst.iid); status(); }
    const angefangen = !!inst.geoeffnet;
    el.replaceChildren(h("article", {class: "sp-brief", style: {"--k": `var(${k.farbe || "--accent"})`}},
      h("header", {}, h("span", {class: "sp-kunde-sym gross"}, k.symbol || "✉"),
        h("div", {}, h("span", {class: "sp-leise"}, `${k.ansprechpartner?.name || ""}${k.ansprechpartner?.rolle ? ", " + k.ansprechpartner.rolle : ""} · ${k.name}`), h("h3", {}, def.titel))),
      h("div", {class: "sp-brief-text"}, absaetze(def.briefing)),
      h("div", {class: "sp-brief-info"},
        h("div", {}, h("small", {}, "Symptom"), h("p", {}, def.symptom || "—")),
        h("div", {}, h("small", {}, "Übt"), h("p", {}, (def.skills || []).map(s => Spiel.skill(s).name).join(" · "))),
        h("div", {}, h("small", {}, "Lohn"), h("p", {}, `${fmtEuro((def.lohn || {}).euro || 0)} · ${(def.lohn || {}).ruf || 0} Ruf`))),
      h("div", {class: "sp-knoepfe"}, h("button", {type: "button", class: "knopf primaer gross", onclick: () => oeffnen(inst.iid)}, angefangen ? "Weiterarbeiten ▸" : "Auftrag annehmen ▸"))));
  }

  /* ---------- Onboarding: erstes Ticket mit Coach-Hinweisen ---------- */
  const COACH = [
    {text: "① Die Kasse hat kein Kabel. Fahr mit der Maus über die Kasse und zieh vom ⊕ zum Switch – oder nimm das Kabel-Werkzeug (Taste K).", zeigen: ["kasse", "sw1"]},
    {text: "② Stark, das Ziel ist grün! Prüf es wie ein Profi: Ping-Werkzeug (Taste P), dann von der Kasse auf den Drucker ziehen.", zeigen: ["kasse", "drucker"]},
    {text: "③ Paket angekommen. Jetzt „Abnahme anfordern“ – der Kunde prüft selbst nach.", zeigen: []},
  ];
  function coachStart(){
    if (Spiel.einst.coach === false) return;
    S.coach = {schritt: 0};
    coachZeigen();
  }
  function coachWeiter(n){ if (!S.coach) return; S.coach.schritt = Math.max(S.coach.schritt, n); coachZeigen(); UI.labor.auftragNeu(); }
  function coachZeigen(){
    const c = S.coach && COACH[S.coach.schritt]; if (!c) return;
    if (c.zeigen.length) setTimeout(() => UI.labor.hervorheben(c.zeigen.map(g => ({geraet: g})), 4500), 250);
  }
  function coachLeiste(){
    const c = COACH[S.coach.schritt];
    return h("div", {class: "sp-coach"}, h("span", {class: "sp-coach-sym"}, "🧑‍🔧"), h("p", {}, c.text),
      h("button", {type: "button", class: "knopf geist klein", onclick: () => { S.coach = null; Spiel.einstSetzen("coach", false); UI.labor.auftragNeu(); }}, "Hinweise aus"));
  }
  function einstiegStarten(){
    const satz = (DATEN.senior?.begruessung || [])[0] || "Willkommen im Systemhaus. Dein erster Kunde wartet schon.";
    const zu = overlay(h("div", {class: "sp-willkommen"},
      h("span", {class: "sp-senior-sym gross"}, "🧑‍🔧"),
      h("h2", {}, "Willkommen im Systemhaus"),
      h("p", {}, "„" + satz + "“"),
      h("p", {class: "sp-leise"}, "Du löst Netzwerk-Aufträge für echte Kunden – in einem Simulator, in dem jedes Paket wirklich unterwegs ist. Hilfe gibt es immer, Fehler kosten nichts."),
      h("button", {type: "button", class: "knopf primaer gross", onclick: () => {
        zu();
        let inst = Spiel.st.postfach.find(i => i.ticketId === Spiel.EINSTIEG_TICKET);
        if (!inst) inst = Spiel.instanzErstellen({ticketId: Spiel.EINSTIEG_TICKET, quelle: "postfach"});
        oeffnen(inst.iid);
      }}, "Erster Auftrag ▸"),
      h("button", {type: "button", class: "knopf geist", onclick: () => { zu(); Spiel.st.einstieg.fertig = true; Spiel.speichern(); UI.app.ansicht("postfach"); }}, "Ich kenne mich aus – zum Postfach")), "willkommen");
  }

  /* ---------- Vorhersage: erst raten, dann sehen (Einstieg und AP1) ---------- */
  function vorhersageEinrichten(){
    const F = UI.labor._f; if (!F || !F.ping || F.ping.__vorhersage) return;
    const original = F.ping;
    const huelle = function(von, nach){
      const inst = S.inst;
      if (!inst || !istTicketNetz() || !Spiel.einst.vorhersage) return original(von, nach);
      const def = Spiel.defVon(inst), niveau = Spiel.niveauVon(inst);
      const schluessel = inst.iid + ":" + von + ">" + nach;
      const fragen = niveau !== "AP2" && (def.vorhersage || !S.vorhersageGefragt.has(inst.iid)) && !S.vorhersageGefragt.has(schluessel);
      if (!fragen) return original(von, nach);
      S.vorhersageGefragt.add(inst.iid); S.vorhersageGefragt.add(schluessel);
      const A = UI.labor.netz.geraete[von], B = UI.labor.netz.geraete[nach];
      const antwort = tipp => {
        zu();
        const r = original(von, nach);
        if (!r || tipp == null) return;
        const ok = (r.antworten || []).some(a => a && a.ok);
        const richtig = tipp === ok;
        if (typeof L !== "undefined") { Spiel.skillsRegistrieren(); L.ueben("lab.ping", richtig); }
        if (richtig) Spiel.gutschreiben(2, 0, "Richtig vorhergesagt");
        setTimeout(() => UI.toast(richtig ? "Richtig vorhergesagt! +2 €" : `Knapp daneben: Du hast auf „${tipp ? "klappt" : "klappt nicht"}“ getippt. Die Simulation zeigt, warum.`,
          richtig ? "ok" : "info", {id: "vorhersage", titel: "Vorhersage"}), 1600);
      };
      const zu = overlay(h("div", {class: "sp-vorhersage"},
        h("small", {class: "sp-leise"}, "Vorhersage – erst raten, dann sehen"),
        h("h3", {}, `Wird der Ping von ${A?.name || von} zu ${B?.name || nach} klappen?`),
        h("div", {class: "sp-knoepfe"},
          h("button", {type: "button", class: "knopf primaer", onclick: () => antwort(true)}, "✓ Ja, klappt"),
          h("button", {type: "button", class: "knopf", onclick: () => antwort(false)}, "✗ Nein"),
          h("button", {type: "button", class: "knopf geist", onclick: () => antwort(null)}, "Überspringen"))), "vorhersage");
      return null;
    };
    huelle.__vorhersage = true;
    F.ping = huelle;
  }

  /* ---------- Bus ---------- */
  Bus.an("netz-geaendert", d => { if (S.inst && d && d.netz === S.inst.netz) livePlanen(); });
  Bus.an("zustand-geaendert", () => status());
  Bus.an("ticket-neu", () => { status(); if (UI.app.aktuell === "postfach") { const c = document.querySelector(".sp-postfach")?.parentElement; if (c) postfachAnsicht(c); } });
  Bus.an("trace", d => { if (S.coach && S.coach.schritt === 1 && d && d.quelle === "ping" && d.ergebnis && (d.ergebnis.antworten || []).some(a => a.ok)) coachWeiter(2); });

  /* ---------- Start ---------- */
  (UI.startHaken ||= []).push(() => {
    UI.app.registrieren("postfach", {titel: "Postfach", symbol: "postfach", zeigen: c => postfachAnsicht(c), wieder: c => postfachAnsicht(c),
      zaehler: () => Spiel._st ? Spiel.ungelesen() : 0});
  });
  Bus.an("ui-bereit", () => {
    try {
      Spiel.laden();
      vorhersageEinrichten();
      status();
      aktiveLaden();
      if (!Spiel.st.einstieg.fertig && !Spiel.st.erledigt.length) einstiegStarten();
      else if (!S.inst) UI.app.ansicht("postfach");
    } catch (e) { console.error("Spielstart", e); UI.toast("Das Spiel konnte nicht starten: " + e.message, "fehler"); }
  });

  return {oeffnen, postfachAnsicht, status, abnahmeAnfordern, einstiegStarten, get inst(){ return S.inst; }, _S: S};
})();
