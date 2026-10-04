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
    UI.app.status({euro: st.euro, ruf: st.ruf, stufe: st.stufe, offen, fortschritt: stufeFortschritt()});
    try { Plattform.abzeichen(offen, `${offen} ${offen === 1 ? "Ticket" : "Tickets"}${eph ? ` · ${eur(eph)} €/h` : ""}`); } catch (e) { /* Plattform ohne Abzeichen */ }
    UI.app.aktualisieren?.();
  }

  /* Kopfzeile: wie weit bis zur nächsten Stufe? Beide Bedingungen zählen, der knappere Anteil bestimmt den Balken. */
  function stufeFortschritt(){
    try {
      const i = Spiel.stufeInfo();
      if (i.max) return {anteil: 1, text: `Stufe ${i.stufe} · ${i.name} – höchste Stufe erreicht`};
      const r = i.ruf.soll ? Math.min(1, i.ruf.ist / i.ruf.soll) : 1;
      const k = i.koennen.sollSumme ? Math.min(1, i.koennen.summe / i.koennen.sollSumme) : 1;
      const text = `Stufe ${i.stufe} · ${i.name} → ${i.naechste.name}: Ruf ${zahlDe(Math.round(i.ruf.ist))}/${i.ruf.soll} · Können ${i.koennen.summe}/${i.koennen.sollSumme}` + (i.bereit ? " – bereit zum Aufstieg!" : " (Klick: Lernstand)");
      return {anteil: Math.min(r, k), text, bereit: i.bereit};
    } catch (e) { return null; }
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
    if (inst.quelle === "pruefung") return pruefungsLeiste(el, inst, def);
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
  /* Prüfungstag: keine Hilfe, keine Live-Ziele, Restzeit sichtbar */
  function pruefungsLeiste(el, inst, def){
    const p = Spiel.pruefung && Spiel.pruefung.aktiv();
    const rest = p ? Spiel.pruefung.restMs(p) : 0, mm = Math.floor(rest / 60000), ss = String(Math.floor(rest / 1000) % 60).padStart(2, "0");
    const nr = p ? p.aufgaben.indexOf(inst.iid) + 1 : 0;
    el.append(h("div", {class: "sp-auftrag pruefung"},
      h("div", {class: "sp-auftrag-kopf"}, h("span", {class: "sp-kunde-sym"}, "🎓"),
        h("div", {class: "sp-auftrag-titel"}, h("strong", {}, def.titel), h("span", {}, `Prüfung ${p ? p.art : ""} · Aufgabe ${nr}/${p ? p.aufgaben.length : "?"} · Restzeit ${mm}:${ss}`)),
        h("div", {class: "sp-auftrag-knoepfe"}, h("button", {type: "button", class: "knopf primaer", onclick: () => UI.karriere?.pruefungUebersicht?.()}, "Zur Prüfungsübersicht"))),
      h("div", {class: "sp-auftrag-mitte"}, h("p", {class: "sp-symptom"}, h("b", {}, "Aufgabe: "), def.symptom || ""),
        h("ul", {class: "sp-ziele"}, (def.ziele || []).map(z => h("li", {class: "neutral"}, h("span", {class: "sp-haken"}, "•"), h("span", {}, z.text || z.typ)))))));
    clearTimeout(S.pruefTimer);
    if (p) S.pruefTimer = setTimeout(() => { if (Spiel.pruefung.aktiv() && S.inst === inst) UI.labor.auftragNeu(); else if (!Spiel.pruefung.aktiv()) UI.toast("Die Prüfungszeit ist abgelaufen – die Prüfung wurde abgegeben.", "info"); }, 1000);
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
        if (!S.coach) UI.toast("Alle Ziele erfüllt! Jetzt „Abnahme anfordern“ – der Kunde prüft selbst nach.", "ok", {id: "ziele", titel: "Geschafft"});   /* mit Coach sagt die Coach-Leiste das schon */
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
    /* Tagesziel gerade erreicht? Dann gehört die Feierabend-Bilanz ins Ergebnis – einmal am Tag */
    const tagStand = erg.inst.quelle !== "pruefung" ? Spiel.tag.heute() : null;
    const feierabend = !!(tagStand && tagStand.fertig && !tagStand.abschlussGezeigt);
    if (feierabend) Spiel.tag.abschlussGesehen();
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
      abzeichenBlock(),
      feierabend ? feierabendBlock() : null,
      def.erklaerung ? h("section", {class: "sp-erklaerung"}, h("h3", {}, "Was war los?"), h("p", {}, def.erklaerung),
        def.quelle ? h("small", {class: "sp-leise"}, "Nachlesen: " + def.quelle) : null) : null,
      h("div", {class: "sp-knoepfe"},
        erg.naechstes ? h("button", {type: "button", class: "knopf primaer", onclick: () => { zu(); oeffnen(erg.naechstes); }}, "Nächstes Ticket ▸") : null,
        h("button", {type: "button", class: "knopf" + (erg.naechstes ? "" : " primaer"), onclick: () => { zu(); UI.sandbox?.laden?.(); UI.app.ansicht("postfach"); }}, "Zum Postfach"),
        feierabend ? h("button", {type: "button", class: "knopf", title: "Das Programm wird zur kleinen Leiste am Bildschirmrand", onclick: () => { zu(); UI.modus("leiste"); }}, "🌙 Feierabend: zur Leiste") : null,
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
    const liste = Spiel.postfach(), post = Spiel.post.liste();
    const gibt = id => liste.some(i => i.iid === id) || post.some(n => n.id === id);
    const aktiv = S.postfachWahl && gibt(S.postfachWahl) ? S.postfachWahl : (liste[0] ? liste[0].iid : post[0] ? post[0].id : null);
    S.postfachWahl = aktiv;
    const leser = h("div", {class: "sp-leser"});
    const karten = liste.map(inst => mailKarte(inst, inst.iid === aktiv, () => { S.postfachWahl = inst.iid; postfachAnsicht(c); }));
    if (post.length) karten.push(h("div", {class: "sp-pf-trenner", role: "presentation"}, "Nachrichten"),
      ...post.map(n => postKarte(n, n.id === aktiv, () => { S.postfachWahl = n.id; postfachAnsicht(c); })));
    const kopf = h("header", {class: "sp-pf-kopf"},
      h("div", {}, h("h2", {}, "Postfach"), h("p", {class: "sp-leise"}, liste.length ? `${liste.length} ${liste.length === 1 ? "Auftrag wartet" : "Aufträge warten"} · Stufe ${st.stufe} · ${st.erledigt.length} erledigt` : "Alles erledigt.")),
      h("div", {class: "sp-pf-aktionen"},
        UI.tag?.karte ? UI.tag.karte() : null,
        h("button", {type: "button", class: "knopf", onclick: () => { UI.sandbox.laden(); UI.app.ansicht("labor"); }, title: "Ohne Auftrag frei ausprobieren"}, "🧪 Freies Labor")));
    const links = h("div", {class: "sp-pf-liste", role: "list"}, karten.length ? karten : h("div", {class: "sp-leer"},
      h("p", {}, "Keine offenen Aufträge. Gönn dir eine Pause – oder hol dir neue Arbeit."),
      h("button", {type: "button", class: "knopf primaer", onclick: () => { Spiel.nachschub(); status(); postfachAnsicht(c); }}, "Neuen Auftrag holen")));
    c.replaceChildren(h("div", {class: "sp-postfach"}, kopf, h("div", {class: "sp-pf-teile"}, links, leser)));
    if (aktiv && String(aktiv).startsWith("post-")) postLesen(leser, Spiel.post.von(aktiv), c);
    else if (aktiv) leserZeigen(leser, Spiel.instanz(aktiv));
  }
  /* Kundenpost: Nachricht ohne Auftrag (Lob vom Kunden oder Notiz vom Senior) */
  function postAbsender(n){
    const k = kunde(n.kunde);
    return n.art === "senior" ? {sym: "🧑‍🔧", name: "Der Senior", zusatz: "Notiz", farbe: "--accent"}
      : {sym: k.symbol || "✉", name: k.ansprechpartner?.name || k.name, zusatz: k.name, farbe: k.farbe || "--accent"};
  }
  function postKarte(n, an, wahl){
    const a = postAbsender(n), text = String(n.text).replace(/\s+/g, " ");
    return h("button", {type: "button", role: "listitem", class: "sp-mail sp-post" + (an ? " an" : "") + (n.gelesen ? "" : " neu"), style: {"--k": `var(${a.farbe})`}, onclick: wahl},
      h("span", {class: "sp-kunde-sym"}, a.sym),
      h("span", {class: "sp-mail-text"},
        h("span", {class: "sp-mail-von"}, `${a.name} · ${a.zusatz}`),
        h("span", {class: "sp-mail-vorschau"}, text.slice(0, 110) + (text.length > 110 ? " …" : "")),
        h("span", {class: "sp-chips"}, h("span", {class: "sp-chip"}, n.art === "senior" ? "Notiz" : "Nachricht"))));
  }
  function postLesen(el, n, c){
    if (!n) return;
    if (!n.gelesen) { Spiel.post.gelesen(n.id); status(); }
    const a = postAbsender(n);
    el.replaceChildren(h("article", {class: "sp-brief", style: {"--k": `var(${a.farbe})`}},
      h("header", {}, h("span", {class: "sp-kunde-sym gross"}, a.sym),
        h("div", {}, h("span", {class: "sp-leise"}, a.zusatz), h("h3", {}, a.name))),
      h("div", {class: "sp-brief-text"}, absaetze(n.text)),
      h("div", {class: "sp-knoepfe"},
        n.art === "senior" ? h("button", {type: "button", class: "knopf", onclick: () => UI.app.ansicht("kunden")}, "Zu den Kunden") : null,
        h("button", {type: "button", class: "knopf geist", onclick: () => { Spiel.post.ablegen(n.id); S.postfachWahl = null; postfachAnsicht(c); }}, "Ablegen"))));
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
    {text: "① Die Kasse hat kein Kabel. Das Kabel-Werkzeug ist schon gewählt: Zieh mit der Maus von der Kasse zum Switch.", taste: "K", werkzeug: "kabel", zeigen: ["kasse", "sw1"]},
    {text: "② Stark, das Ziel ist grün! Prüf es wie ein Profi – das Ping-Werkzeug ist gewählt: Zieh von der Kasse auf den Drucker.", taste: "P", werkzeug: "ping", zeigen: ["kasse", "drucker"]},
    {text: "③ Paket angekommen. Jetzt „Abnahme anfordern“ – der Kunde prüft selbst nach.", werkzeug: "auswahl", zeigen: []},
  ];
  function coachStart(){
    if (Spiel.einst.coach === false) return;
    S.coach = {schritt: 0};
    coachZeigen();
    UI.labor.auftragNeu();          /* Leiste sofort zeigen – vor dem Einpassen im nächsten Frame */
  }
  function coachWeiter(n){ if (!S.coach) return; S.coach.schritt = Math.max(S.coach.schritt, n); coachZeigen(); UI.labor.auftragNeu(); }
  function coachZeigen(){
    const c = S.coach && COACH[S.coach.schritt]; if (!c) return;
    /* Einsteiger ziehen sonst Geräte herum statt zu verkabeln: passendes Werkzeug vorwählen */
    if (c.werkzeug && UI.labor.werkzeugName !== c.werkzeug) UI.labor.werkzeug(c.werkzeug);
    if (c.zeigen.length) setTimeout(() => UI.labor.hervorheben(c.zeigen.map(g => ({geraet: g})), 4500), 250);
  }
  function coachLeiste(){
    const c = COACH[S.coach.schritt];
    return h("div", {class: "sp-coach"}, h("span", {class: "sp-coach-sym"}, "🧑‍🔧"), h("p", {}, c.text, c.taste ? h("span", {class: "sp-leise"}, ` (Taste ${c.taste})`) : null),
      h("button", {type: "button", class: "knopf geist klein", onclick: () => { S.coach = null; Spiel.einstSetzen("coach", false); UI.labor.auftragNeu(); }}, "Hinweise aus"));
  }
  function einstiegStarten(){
    const satz = "Schön, dass du da bist. Ich bin der Senior hier. Ich sag dir selten, was falsch ist – ich frag dich so lange, bis du es selbst findest. Dein erster Kunde wartet schon.";
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
        if (richtig) { Spiel.abzeichen.zaehlen("vorhersageRichtig"); Spiel.gutschreiben(2, 0, "Richtig vorhergesagt"); }
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

  /* ---------- Abzeichen: im Ergebnisfenster oder als Toast – nie unsichtbar hinter einem Dialog ---------- */
  let abzTimer = null;
  function abzeichenPlanen(ms){ clearTimeout(abzTimer); abzTimer = setTimeout(abzeichenZeigen, ms); }
  function abzeichenZeigen(){
    if (document.querySelector(".sp-overlay:not(.vorhersage)")) { abzeichenPlanen(1500); return; }
    const neu = Spiel.abzeichen.abholen(); if (!neu.length) return;
    const ansehen = {text: "Ansehen", fn: () => UI.app.ansicht("lernstand")};
    if (neu.length > 2) UI.toast(neu.map(a => a.sym + " " + a.titel).join(" · "), "ok", {titel: `${neu.length} neue Abzeichen`, aktion: ansehen});
    else for (const a of neu) UI.toast(`${a.sym} ${a.titel} – ${a.text}`, "ok", {titel: "Neues Abzeichen", aktion: ansehen});
  }
  function feierabendBlock(){
    const b = Spiel.tag.bilanz();
    const namen = b.morgenFaellig.slice(0, 3).map(id => Spiel.skill(id).name);
    return h("section", {class: "sp-feierabend"},
      h("h3", {}, `🎉 Tagesziel geschafft – ${b.tickets} Tickets heute`),
      h("p", {class: "sp-bilanz"}, `+${fmtEuro(b.euro)} · +${zahlDe(b.ruf)} Ruf · ${b.uebungen} ${b.uebungen === 1 ? "Übung" : "Übungen"} · 🔥 ${b.serie} ${b.serie === 1 ? "Tag" : "Tage"} Serie`
        + (b.ohneHilfe ? ` · ${b.ohneHilfe} ohne Hilfe` : "")),
      h("p", {class: "sp-leise"}, namen.length
        ? `Morgen fällig: ${namen.join(", ")}${b.morgenFaellig.length > 3 ? ` und ${b.morgenFaellig.length - 3} weitere` : ""} – kurz wiederholen, kurz bevor du es vergisst, dann sitzt es.`
        : "Weiterspielen geht immer. Am meisten bringt dir aber die Wiederholung an einem anderen Tag – bis morgen!"));
  }
  /* Neue Kundenpost: leiser Hinweis in der Vollansicht, erst wenn kein Dialog offen ist (die Leiste zeigt nur den Zähler) */
  function postMelden(neu, versuch = 0){
    if (UI.modus() !== "voll") return;
    if (document.querySelector(".sp-overlay:not(.vorhersage)") && versuch < 40) { setTimeout(() => postMelden(neu, versuch + 1), 1500); return; }
    const n = neu[neu.length - 1], a = postAbsender(n);
    UI.toast(neu.length > 1 ? `${neu.length} neue Nachrichten im Postfach.` : `${a.name}: ${String(n.text).split("\n")[0].slice(0, 90)}${String(n.text).length > 90 ? " …" : ""}`, "info",
      {titel: "✉ Neue Nachricht", id: "post", aktion: {text: "Lesen", fn: () => { S.postfachWahl = n.id; UI.app.ansicht("postfach"); }}});
  }
  function abzeichenBlock(){
    Spiel.abzeichen.pruefen();
    const neu = Spiel.abzeichen.abholen(); if (!neu.length) return null;
    return h("section", {class: "sp-abzeichen-neu"}, h("h3", {}, neu.length === 1 ? "Neues Abzeichen" : "Neue Abzeichen"),
      neu.map(a => h("div", {class: "sp-abz"}, h("span", {class: "sp-abz-sym"}, a.sym), h("div", {}, h("b", {}, a.titel), h("small", {}, a.lehrt)))));
  }

  /* ---------- Bus ---------- */
  Bus.an("netz-geaendert", d => { if (S.inst && d && d.netz === S.inst.netz) livePlanen(); });
  Bus.an("zustand-geaendert", () => {
    status();
    if (Spiel.abzeichen.pruefen().length) abzeichenPlanen(400);
    const neuePost = Spiel.post.pruefen();
    if (neuePost.length) { status(); postMelden(neuePost); }
  });
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
      /* Desktop: Rust hat das Fenster umgeschaltet (Tray-Klick, Strg+Alt+L, Ruhe) – Ansicht nachziehen */
      Plattform.an("modus-extern", m => { if (UI.modus() !== m) UI.modus(m); });
      status();
      aktiveLaden();
      if (!Spiel.st.einstieg.fertig && !Spiel.st.erledigt.length) einstiegStarten();
      else if (!S.inst) UI.app.ansicht("postfach");
    } catch (e) { console.error("Spielstart", e); UI.toast("Das Spiel konnte nicht starten: " + e.message, "fehler"); }
  });

  return {oeffnen, postfachAnsicht, status, abnahmeAnfordern, einstiegStarten, get inst(){ return S.inst; }, _S: S};
})();
