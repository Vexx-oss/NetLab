"use strict";
/* ---------- Spiel-Oberfläche: Ticketfluss (Konzept §§ 3.2, 3.5, 4) ----------
   Postfach (Ansicht „postfach“) · Auftragszeile mit Live-✓ und Auftragsmappe (#labor-auftrag) · Hilfeleiter mit Lösungsvorführung ·
   Abnahme und Ergebnisbildschirm · Onboarding (salon-01 in 60 Sekunden) · Vorhersage beim Ping · Senior-Angebot.
   Die Logik liegt in spiel/*.js; hier nur Anzeige und Bedienung. Start über Bus „ui-bereit“ (ui/start.js). */
UI.spiel = (() => {
  const S = {inst: null, live: null, liveTimer: null, hilfeOffen: false, hilfeAnsicht: null, demo: null, seniorTimer: null, coach: null, vorhersageGefragt: new Set(),
    mappe: {offen: false, reiter: "brief", mehr: false, erstes: false, rein: false},
    weg: {iid: null, liste: []}, probe: false};
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
    const vorher = Spiel.instanz(iid), erstesMal = !!vorher && !vorher.geoeffnet, briefGelesen = !!vorher?.gelesen;
    const r = Spiel.oeffnen(iid);
    S.inst = r.inst; S.live = null; S.hilfeOffen = false; S.hilfeAnsicht = null; S.demo = null; S.coach = null;
    S.mappe = {offen: false, reiter: "brief", mehr: false, erstes: false, rein: false};
    const niveau = Spiel.niveauVon(r.inst);
    UI.labor.laden(r.netz, {titel: r.def.titel, verlauf: r.verlauf, auftrag: el => auftrag(el),
      ebene: UI.ebenen.fuerSkills(r.def.skills), ansichtMenue: niveau !== "E", fernwartung: r.def.fernwartung || null,
      blatt: r.def.blatt ? el => UI.blatt.zeichnen(el, r.inst) : null,
      warnungen: () => Spiel.regeln(r.inst).warnungen});          /* Stufenregeln: „!“ je Niveau und Hilfestufe */
    if (ansicht) UI.app.ansicht("labor");
    liveJetzt();
    seniorPlanen();
    const coach = !Spiel.st.einstieg.fertig && r.def.id === Spiel.EINSTIEG_TICKET && coachStart();
    /* Beim ersten Öffnen klappt die Mappe einmal auf (Brief, oder Ziele, wenn der Brief im Postfach schon gelesen wurde).
       Im ersten Auftrag übernehmen Willkommen und Coach diese Rolle. Prüfung: keine Mappe. */
    if (erstesMal && !coach && r.inst.quelle !== "pruefung") mappeAuf(r.def.hotline ? "anruf" : briefGelesen ? "ziele" : "brief", true);
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

  /* ---------- Auftragszeile (eine Zeile) + Auftragsmappe (Ausbau 1.2, A2) ----------
     Zeile: Kunde · Titel · Ziele x/y · [Auftrag lesen] · [Abnahme] · ⋯ (Hilfe, Nachschlagen, Zurücksetzen, Postfach).
     Genau ein Hauptknopf: die Abnahme – außer ein offenes Feld (Mappe, Hilfeleiter) hat einen eigenen. */
  function auftrag(el){
    const inst = S.inst;
    if (!inst || !Spiel.instanz(inst.iid)) {
      /* gerade abgenommen (Funktionsprobe läuft): Titel bleibt stehen, mit Haken */
      const f = S.fertig;
      el.append(f ? h("div", {class: "am-zeile am-fertig"}, h("span", {class: "sp-kunde-sym", style: {"--k": `var(${f.farbe || "--accent"})`}}, f.symbol || "✉"),
          h("div", {class: "am-titel"}, h("strong", {}, "✓ " + f.titel), h("span", {class: "am-kunde"}, "abgenommen – Funktionsprobe")))
        : h("div", {class: "lb-auftrag-standard"}, h("strong", {}, "Kein offenes Ticket")));
      return;
    }
    const def = Spiel.defVon(inst), k = kunde(inst.kunde || def.kunde), niveau = Spiel.niveauVon(inst);
    if (inst.quelle === "pruefung") return pruefungsLeiste(el, inst, def);
    const regel = Spiel.regeln(inst), live = regel.liveHaken;
    const stand = S.live || {status: (def.ziele || []).map(z => ({ziel: z, ok: null}))};
    const n = stand.status.length, erfuellt = stand.status.filter(s => s.ok).length, alle = live && n > 0 && erfuellt === n;
    const naechste = Spiel.naechsteHilfe(inst);
    const abnahme = h("button", {type: "button", class: "knopf primaer sp-abnahme" + (alle ? " bereit" : ""), title: "Abnahme anfordern: Der Kunde prüft selbst nach.", onclick: abnahmeAnfordern}, "✓ Abnahme");
    const zeile = h("div", {class: "am-zeile"},
      h("span", {class: "sp-kunde-sym", style: {"--k": `var(${k.farbe || "--accent"})`}, title: k.name}, k.symbol || "✉"),
      h("div", {class: "am-titel"}, h("strong", {}, def.titel), h("span", {class: "am-kunde"}, inst.raetsel ? `🧩 Tagesrätsel #${inst.raetsel.nr} · ${Spiel.NIVEAU_NAME[inst.raetsel.niveau] || inst.raetsel.niveau}` : k.name)),
      h("span", {class: "am-ziele" + (alle ? " fertig" : ""), title: live ? "Erfüllte Ziele – Liste in der Mappe" : "AP2: Ziele prüfst du selbst"},
        live ? `Ziele ${erfuellt}/${n}` : `${n} ${n === 1 ? "Ziel" : "Ziele"}`),
      h("div", {class: "am-knoepfe"},
        h("button", {type: "button", class: "knopf am-lesen" + (S.mappe.offen ? " an" : ""), "aria-expanded": String(S.mappe.offen), title: "Auftragsmappe: Brief und Ziele",
          onclick: () => S.mappe.offen ? mappeZu() : mappeAuf("brief")}, UI.symbol("mappe", 17), "Auftrag lesen"),
        abnahme,
        h("button", {type: "button", class: "knopf geist am-mehr", title: "Mehr: Hilfe, Nachschlagen, Zurücksetzen", "aria-label": "Mehr", onclick: e => menue(e, inst, def)}, "⋯")));
    const ungespeichert = Spiel.speichernErwartet(def, niveau) ? Spiel.ungespeicherteGeraete(inst) : [];
    el.append(h("div", {class: "sp-auftrag", style: {"--k": `var(${k.farbe || "--accent"})`}}, zeile,
      ungespeichert.length ? h("p", {class: "sp-ungespeichert"}, "💾 Nicht gespeichert: ", ungespeichert.map(g => g.name).join(", "),
        niveau === "AP2" ? " – die Abnahme startet die Geräte neu!" : " – nach einem Neustart wäre die Änderung weg.") : null,
      S.coach ? coachLeiste() : null,
      S.hilfeOffen ? hilfePanel(inst, def, naechste) : null));
    if (S.mappe.offen) el.append(mappe(def, k, stand, live, regel.liveGrund));
    if (el.querySelectorAll(".primaer").length > 1) abnahme.classList.remove("primaer");
    S.mappe.rein = false;
  }
  function mappeAuf(reiter = "brief", erstes = false){
    Object.assign(S.mappe, {offen: true, reiter, erstes, rein: true});
    UI.labor.auftragNeu();
  }
  function mappeZu(){
    if (!S.mappe.offen) return;
    S.mappe.offen = false; S.mappe.erstes = false;
    UI.labor.auftragNeu();
  }
  function mappe(def, k, stand, live, mitGrund){
    const m = S.mappe, n = stand.status.length, erfuellt = stand.status.filter(s => s.ok).length;
    const reiter = h("div", {class: "am-reiter", role: "tablist"},
      [def.hotline ? ["anruf", "Anruf"] : ["brief", "Brief"], ["ziele", live ? `Ziele ${erfuellt}/${n}` : "Ziele"], def.fernwartung || def.blatt ? null : ["plan", "Plan"]].filter(Boolean).map(([id, titel]) =>
        h("button", {type: "button", role: "tab", class: "am-tab" + (m.reiter === id ? " an" : ""), "aria-selected": String(m.reiter === id),
          onclick: () => { m.reiter = id; UI.labor.auftragNeu(); }}, titel)),
      h("button", {type: "button", class: "am-zu", title: "Schließen (Esc)", "aria-label": "Mappe schließen", onclick: () => mappeZu()}, UI.symbol("schliessen", 15)));
    let inhalt;
    if (def.hotline && m.reiter === "brief") m.reiter = "anruf";
    if (m.reiter === "anruf" && def.hotline) inhalt = anrufAnsicht(def, k);
    else if (m.reiter === "plan") {
      /* Netzplan (Phase B): aus dem Soll-Netz; „Neben das Labor heften“ legt ihn als Reiter ins Dock */
      inhalt = h("div", {class: "am-plan"});
      UI.netzplan.zeichnen(inhalt, S.inst, {mappe: true});
    } else if (m.reiter === "ziele") {
      inhalt = h("div", {class: "am-ziele-liste"},
        h("ul", {class: "sp-ziele"}, stand.status.map((s, i) => h("li", {class: live ? (s.ok ? "ok" : s.ok === false ? "offen" : "") : "neutral", "data-i": i},
          h("span", {class: "sp-haken", "aria-hidden": "true"}, live ? (s.ok ? "✓" : "○") : "•"),
          h("span", {class: "am-ziel-text"}, s.ziel.typ === "antwort" ? s.ziel.frage : s.ziel.text || s.ziel.typ,
            mitGrund && s.ok === false && s.grund ? h("small", {class: "am-grund"}, Spiel.grundTitel(s.grund)) : null,
            s.ziel.typ === "antwort" ? antwortFeld(s.ziel) : null, s.ziel.typ === "notiz" ? notizFeld(s.ziel) : null),
          s.ziel.typ === "blockiert" ? h("small", {class: "sp-blockiert"}, " darf nicht gehen") : null,
          s.ziel.typ === "befehl" && !s.ok ? h("button", {type: "button", class: "knopf geist klein am-terminal", title: "Terminal dieses Geräts öffnen (Doppelklick auf das Gerät geht auch)",
            onclick: () => { mappeZu(); UI.terminal.oeffnen(s.ziel.geraet); }}, "Terminal ▸") : null))),
        live ? null : h("p", {class: "sp-leise"}, "AP2: Ob die Ziele erreicht sind, prüfst du selbst – die Abnahme sagt, ob es reicht."));
    } else {
      /* höchstens ~60 Wörter sichtbar, der Rest auf „mehr“ */
      const text = String(def.briefing || ""), woerter = text.split(/\s+/).filter(Boolean);
      const kurz = !m.mehr && woerter.length > 70;
      let sichtbar = text;
      if (kurz) { let z = 0, i = 0; for (const t of text.split(/(\s+)/)) { if (t.trim()) z++; if (z > 60) break; i += t.length; } sichtbar = text.slice(0, i).trimEnd() + " …"; }
      const ap = k.ansprechpartner || {};
      inhalt = h("div", {class: "am-brief"},
        h("div", {class: "am-absender"}, h("span", {class: "sp-kunde-sym", style: {"--k": `var(${k.farbe || "--accent"})`}}, k.symbol || "✉"),
          h("span", {}, h("b", {}, ap.name || k.name), ap.rolle ? `, ${ap.rolle}` : "", ` · ${k.name}`)),
        h("div", {class: "am-text"}, absaetze(sichtbar)),
        kurz ? h("button", {type: "button", class: "knopf geist klein", onclick: () => { m.mehr = true; UI.labor.auftragNeu(); }}, "mehr lesen") : null,
        def.symptom ? h("p", {class: "am-symptom"}, h("b", {}, "Symptom: "), def.symptom) : null,
        variantenWahl(def));
    }
    const fuss = h("div", {class: "am-fuss"},
      h("button", {type: "button", class: "knopf primaer", onclick: () => mappeZu()}, m.erstes ? "Los geht’s ▸" : "Zurück ins Labor"));
    return h("section", {class: "am-mappe" + (m.rein ? " rein" : ""), role: "dialog", "aria-label": "Auftragsmappe"}, reiter, h("div", {class: "am-inhalt"}, inhalt), fuss);
  }
  /* E1 „Provisorium oder sauber?“: zwei Karten im Brief; nach der Wahl eine Zeile (bis zur ersten Abnahme änderbar) */
  function variantenWahl(def){
    const inst = S.inst, v = Spiel.varianten.fuer(def);
    if (!v || !inst) return null;
    const gewaehlt = inst.variante && Spiel.VARIANTE[inst.variante], aenderbar = !(inst.abnahmen > 0);
    const waehlen = id => { Spiel.varianten.waehlen(inst, id); liveJetzt(); };
    if (gewaehlt && !S.mappe.wahlOffen) return h("div", {class: "am-variante gewaehlt"}, h("span", {}, `${gewaehlt.sym} ${gewaehlt.titel}: `, h("small", {}, gewaehlt.text)),
      aenderbar ? h("button", {type: "button", class: "knopf geist klein", onclick: () => { S.mappe.wahlOffen = true; UI.labor.auftragNeu(); }}, "ändern") : null);
    return h("div", {class: "am-variante"}, h("p", {class: "am-variante-frage"}, h("b", {}, "Wie gehst du vor?")),
      h("div", {class: "am-variante-karten"}, v.map(x => h("button", {type: "button", class: "am-variante-karte" + (inst.variante === x.id ? " an" : ""),
        onclick: () => { S.mappe.wahlOffen = false; waehlen(x.id); }}, h("b", {}, `${x.sym} ${x.titel}`), h("small", {}, x.text)))));
  }
  /* Änderungsnotiz (Zielart „notiz“, Variante „sauber“) */
  function notizFeld(ziel){
    const inst = S.inst;
    return h("textarea", {class: "am-notiz", rows: "2", placeholder: "Was hast du an welchem Gerät geändert – und warum?", "aria-label": ziel.text,
      onkeydown: e => e.stopPropagation(), onchange: e => { Spiel.notizSetzen(inst, e.target.value); liveJetzt(); }}, (inst && inst.notiz) || "");
  }
  /* Hotline (E1): Anruf als Gesprächsverlauf, drei Rückfragen zur Wahl, nach dem Auflegen die Bewertung mit Begründung */
  function anrufAnsicht(def, k){
    const inst = S.inst, st = Spiel.hotline.stand(inst), wer = (k.ansprechpartner || {}).name || k.name;
    const blase = (von, text, kl) => h("div", {class: "ht-blase " + kl}, h("b", {}, von), h("span", {}, text));
    const verlauf = [blase(wer, def.briefing, "kunde")];
    for (const id of st.gefragt) { const f = st.def.fragen.find(x => x.id === id); if (f) verlauf.push(blase("Du", f.text, "du"), blase(wer, f.antwort, "kunde")); }
    const neu = () => { UI.labor.auftragNeu(); requestAnimationFrame(() => { const v = document.querySelector(".ht-verlauf"); if (v) v.scrollTop = v.scrollHeight; }); };
    const fragen = st.fertig ? null : h("div", {class: "ht-fragen"},
      h("p", {class: "ht-rest"}, `Noch ${st.rest} ${st.rest === 1 ? "Frage" : "Fragen"} – frag gezielt:`),
      ...st.def.fragen.filter(f => !st.gefragt.includes(f.id)).map(f => h("button", {type: "button", class: "ht-frage", onclick: () => { Spiel.hotline.fragen(inst, f.id); neu(); }}, f.text)),
      h("button", {type: "button", class: "knopf geist klein", onclick: () => { Spiel.hotline.auflegen(inst); neu(); }}, "Auflegen – ich schau selbst nach"));
    const b = st.fertig ? Spiel.hotline.bewertung(inst) : null;
    return h("div", {class: "ht-anruf"}, h("div", {class: "ht-verlauf"}, ...verlauf), fragen,
      b ? h("div", {class: "ht-bewertung"}, h("p", {}, h("b", {}, "☎ " + b.text)), ...b.hinweise.map(t => h("p", {class: "sp-leise"}, t))) : null);
  }
  /* Zielart „antwort“ (C4): Wert aus der Terminal-Ausgabe eintragen; geprüft wird gegen das Netz (Haken nur, wo das Niveau ihn zeigt) */
  function antwortFeld(ziel){
    const inst = S.inst, wert = ((inst && inst.antworten) || {})[Spiel.antwortSchluessel(ziel)] || "";
    const eintragen = () => { if (!S.inst) return; Spiel.antwortSetzen(S.inst, ziel, feld.value); liveJetzt(); };
    const feld = h("input", {type: "text", class: "am-antwort", value: wert, placeholder: "Wert aus der Ausgabe", spellcheck: "false", autocomplete: "off", "aria-label": ziel.frage,
      onkeydown: e => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); eintragen(); } }});
    return h("span", {class: "am-antwort-zeile"}, feld, h("button", {type: "button", class: "knopf klein", onclick: eintragen}, wert ? "Ändern" : "Eintragen"));
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
    const r = e.currentTarget.getBoundingClientRect(), stufe = inst.hilfeStufe || 0;
    const eintraege = [
      {text: S.hilfeOffen ? "Hilfeleiter schließen" : "Hilfe", sym: "hilfe", info: stufe ? `Stufe ${stufe}/6` : "vom Hinweis bis zur Lösung",
        fn: () => { S.hilfeOffen = !S.hilfeOffen; if (S.hilfeOffen) S.mappe.offen = false; UI.labor.auftragNeu(); }},
    ];
    if (!def.fernwartung && !def.blatt) eintraege.push({text: "Netzplan neben dem Labor", sym: "plan", fn: () => UI.netzplan.anheften(inst)});
    if (Spiel.verdacht.noetig(inst)) eintraege.push({text: "Akte und Verdacht", sym: "akte", info: inst.verdacht ? "festgehalten" : null, fn: () => UI.akte.freigeben(true)});
    if (Spiel.werkzeug.hat("netzpruefer") && Spiel.niveauVon(inst) !== "E")
      eintraege.push({text: inst.netzpruefer ? "Netzprüfer ausschalten" : "Netzprüfer einschalten", sym: "warnung", info: "Werkzeug",
        fn: () => { Spiel.werkzeug.netzpruefer(inst); UI.labor.auffrischen?.(); UI.labor.auftragNeu(); }});
    if (Spiel.niveauVon(inst) !== "AP2" && typeof UI.wiki?.oeffnen === "function" && (def.skills || [])[0])
      eintraege.push({text: "Nachschlagen: " + Spiel.skill(def.skills[0]).name, sym: "wiki", fn: () => UI.wiki.oeffnen(def.skills[0])});
    eintraege.push("-",
      {text: "Ticket zurücksetzen", sym: "neustart", fn: () => { Spiel.zuruecksetzen(inst); S.live = null; liveJetzt(); UI.labor.einpassen(); UI.toast("Das Ticket steht wieder auf Anfang (Strg+Z holt deinen Stand zurück).", "info"); }},
      {text: "Zum Postfach", sym: "postfach", fn: () => UI.app.ansicht("postfach")});
    return UI.menue(r.right - 250, r.bottom + 4, eintraege, {titel: "Ticket"});
  }

  /* ---------- Live-Prüfung (Einstieg und AP1) ---------- */
  function liveJetzt(){
    if (!S.inst) return;
    const r = Spiel.zieleLive(S.inst);
    const vorher = S.live;
    S.live = r;
    UI.labor.auftragNeu();
    if (!Spiel.regeln(S.inst).liveHaken) return;            /* AP2: Haken erst bei der Abnahme */
    if (vorher && r.neuOk.length) {
      for (const i of r.neuOk) { const li = document.querySelector(`.sp-ziele li[data-i="${i}"]`); li?.classList.add("frisch"); }
      UI.juice?.(document.querySelector(".am-ziele"), "haken", 700);
      UI.klang?.spielen("haken");
      if (r.alle) {
        if (!S.coach) UI.toast("Alle Ziele erfüllt – jetzt die Abnahme anfordern.", "ok", {id: "ziele", titel: "Geschafft"});   /* mit Coach sagt die Coach-Zeile das schon */
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
        UI.labor.auffrischen?.();                              /* AP1: ab Hilfestufe 2 erscheinen die „!“-Warnungen */
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
      case 2: return h("div", {}, r.naechste ? h("p", {class: "sp-naechste"}, h("b", {}, "Nächste Diagnose: "), r.naechste) : null,
        ...r.werkzeuge.map(w => h("p", {}, "🔧 ", w)), h("p", {class: "sp-leise"}, r.simulation));
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
      i === d.i && (s.art === "cli" || s.art === "terminal") ? h("pre", {class: "sp-demo-cli"}, s.zeilen.join("\n")) : null,
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
    if (s.art === "terminal") UI.terminal.oeffnen(s.geraet, {eingabe: s.zeilen.join("\n"), notiz: "Aus der Vorführung übernommen."});
    else try { Spiel.vorfuehrenSchritt(inst, d.i); } catch (e) { UI.toast("Dieser Schritt ging nicht: " + e.message, "fehler"); return; }
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
        aktion: {text: "Ja, gern", fn: () => { S.hilfeOffen = true; while ((inst.hilfeStufe || 0) < 3) Spiel.hilfe(inst); S.hilfeAnsicht = 3; UI.labor.auftragNeu(); UI.labor.auffrischen?.(); }}});
    }, 30000);
  }

  /* ---------- Abnahme und Ergebnis ---------- */
  async function abnahmeAnfordern(){
    const inst = S.inst; if (!inst || S.probe) return;
    const ab = Spiel.abnahme(inst);
    /* vor dem Abschluss lesen: danach ist die Laufzeit (Startnetz, Verlauf) der Instanz weg */
    const geaendert = ab.bestanden ? Spiel.geaenderteGeraete(inst) : [];
    const weg = ab.bestanden ? wegChips(inst) : null;
    if (!ab.bestanden) wegMerken(inst, {art: "abnahme", ok: false});
    const erg = Spiel.abschliessen(inst, ab);
    status();
    if (!erg.bestanden) { UI.klang?.spielen("nochnicht"); ergebnisZeigen(erg); return; }
    S.coach = null; ticketFertig();
    if (UI.labor.fern) UI.labor.fernwartung(null);         /* Fernwartung: jetzt zeigt sich das Netz, das man blind repariert hat */
    UI.toast.zu?.("ziele");                                /* „Alle Ziele erfüllt – jetzt die Abnahme“ ist erledigt */
    const kd = kunde(erg.inst.kunde || erg.def.kunde);
    S.fertig = {titel: erg.def.titel, symbol: kd.symbol, farbe: kd.farbe};
    UI.labor.werkzeug("auswahl");
    UI.labor.auftragNeu();
    erg.weg = weg;
    erg.wahl = Spiel.st.erledigt.length === 1;        /* nach dem ersten Auftrag: Postfach mit zwei Angeboten zur Wahl */
    if (S.mess) S.mess.erfolg ??= Math.round(performance.now());
    const k = kunde(erg.inst.kunde || erg.def.kunde);
    S.probe = true;
    try {
      await UI.szene.abspielen(Spiel.szene(erg.inst, ab), {geaendert, satz: erg.dank, kurz: ab.niveau !== "E",
        kunde: {name: k.ansprechpartner?.name || k.name, symbol: k.symbol, farbe: k.farbe}});
    } catch (e) { console.error("Funktionsprobe", e); }
    finally { S.probe = false; S.fertig = null; }
    ergebnisZeigen(erg);
  }
  /* „Dein Weg“: was der Spieler getan hat – Diagnose (Ping), Eingriffe (Verlauf), Probe */
  function wegMerken(inst, eintrag){
    if (S.weg.iid !== inst.iid) S.weg = {iid: inst.iid, liste: []};
    S.weg.liste.push(eintrag);
    if (S.weg.liste.length > 40) S.weg.liste.shift();
  }
  function wegChips(inst){
    const eig = S.weg.iid === inst.iid ? S.weg.liste : [];
    const chips = [];
    const diag = eig.find(e => e.art === "ping" || e.art === "befehl");   /* erste Diagnose: Ping-Werkzeug oder Terminalbefehl */
    if (diag) chips.push({text: diag.text, ok: diag.ok});
    const fehl = eig.filter(e => e.art === "abnahme" && !e.ok).length;
    const eingriffe = (Spiel.verlaufVon(inst).liste || []).filter(t => !/verschoben|zurückgesetzt|Aufgeräumt/.test(t));
    for (const t of eingriffe.slice(-2)) chips.push({text: t.length > 46 ? t.slice(0, 45) + "…" : t, ok: null});
    if (eingriffe.length > 2) chips.splice(chips.length - 2, 0, {text: `+${eingriffe.length - 2} Schritte`, ok: null});
    chips.push({text: fehl ? `Probe ✓ im ${fehl + 1}. Versuch` : "Probe ✓", ok: true});
    return chips.slice(-4);
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
        h("p", {class: "sp-leise"}, versuchText(erg.inst, niveau)),
        h("ul", {class: "sp-pruefliste"},
          ab.ergebnisse.map(e => h("li", {class: e.ok ? "ok" : "offen"}, h("span", {}, e.ok ? "✓" : "✗"), h("div", {},
            h("b", {}, e.ziel.text || e.ziel.typ),
            !e.ok && e.grund ? h("p", {}, Spiel.grundTitel(e.grund)) : !e.ok ? h("p", {}, e.text) : null,
            !e.ok && e.grund && niveau !== "AP2" ? UI.erklaeren(e.grund, niveau) : null))),
          ab.kollateral.map(r => h("li", {class: "offen"}, h("span", {}, "⚠"), h("div", {}, h("b", {}, `Kollateralschaden: ${r.vonName} erreicht ${r.nachName} nicht mehr`),
            h("p", {}, "Das ging vorher. Change-Management heißt: Nichts, was lief, darf kaputtgehen. " + Spiel.grundTitel(r.grund))))),
          ab.neustart.verlust && niveau === "AP2" ? h("li", {class: "offen"}, h("span", {}, "💾"), h("div", {}, h("b", {}, "Nach dem Neustart war deine Änderung weg"),
            h("p", {}, "Die Abnahme hat " + ab.neustart.geraete.map(g => g.name).join(", ") + " neu gestartet. Ungespeichertes steht nur im RAM – „copy running-config startup-config“ schreibt es ins NVRAM."))) : null),
        h("div", {class: "sp-knoepfe"},
          h("button", {type: "button", class: "knopf primaer", onclick: () => zu()}, "Zurück ins Labor"),
          h("button", {type: "button", class: "knopf", onclick: () => { zu(); S.hilfeOffen = true; UI.labor.auftragNeu(); }}, "🛟 Hilfe"))));
      return;
    }
    /* Nachbesprechung in höchstens drei Blöcken (Design – Spielspaß 2.0, Hebel 1):
       ① Sterne + Lohn (Abzüge, Abzeichen, Tagesziel, Fertigkeit nur als kurze Zeile, wenn es sie gibt) · ② Dein Weg · ③ Merke */
    const sterne = erg.sterne;
    const tagStand = erg.inst.quelle !== "pruefung" ? Spiel.tag.heute() : null;
    const feierabend = !!(tagStand && tagStand.fertig && !tagStand.abschlussGezeigt);
    if (feierabend) Spiel.tag.abschlussGesehen();
    const sternEl = h("div", {class: "sp-sterne" + (UI.bewegung() === "voll" ? " jc-sterne" : ""), "aria-label": `${sterne} von 5 Sternen`}, [1, 2, 3, 4, 5].map(i => h("span", {class: i <= sterne ? "voll" : i - 0.5 <= sterne ? "halb" : "leer", style: {"--i": i}}, "★")));
    const euroEl = h("b", {class: "sp-geld"}, "+0,00 €");
    Spiel.abzeichen.pruefen();
    const abz = Spiel.abzeichen.abholen();
    const besser = (erg.lernen || []).find(l => l.nachher > l.vorher);
    const zeilen = [
      erg.abnahme.abzuege.length ? h("p", {class: "sp-zeile leise"}, erg.abnahme.abzuege.map(a => `−${a.sterne === 0.5 ? "½" : a.sterne} ★ ${a.text}`).join(" · ")) : null,
      abz.length ? h("p", {class: "sp-zeile"}, "🏅 ", h("b", {}, abz.length === 1 ? "Neues Abzeichen: " : "Neue Abzeichen: "), abz.map(a => `${a.sym} ${a.titel}`).join(" · ")) : null,
      besser ? h("p", {class: "sp-zeile"}, "📈 ", h("b", {}, besser.name + ": "), `Stufe ${besser.vorher} → ${besser.nachher}`) : null,
      feierabend ? feierabendZeile() : null,
      ...dexZeilen(erg.dex),
      erg.raetsel ? h("p", {class: "sp-zeile sp-raetsel"}, "🧩 ", h("b", {}, `Tagesrätsel #${erg.raetsel.nr}: `), h("span", {class: "sp-raetsel-zeile"}, erg.raetsel.zeile), " ",
        h("button", {type: "button", class: "knopf klein", onclick: () => UI.hub.kopieren(Spiel.raetsel.teilen(), "Ergebnis kopiert – einfach einfügen.")}, "Ergebnis kopieren")) : null,
    ].filter(Boolean);
    const merke = merkeText(def, erg.abnahme.niveau);
    const skill = (def.skills || [])[0];
    const weiterKnopf = erg.wahl
      ? h("button", {type: "button", class: "knopf primaer", onclick: () => { zu(); UI.sandbox?.laden?.(); UI.app.ansicht("postfach"); }}, "Nächsten Auftrag wählen ▸")
      : erg.naechstes ? h("button", {type: "button", class: "knopf primaer", onclick: () => { zu(); oeffnen(erg.naechstes); }}, "Nächstes Ticket ▸") : null;
    const zu = overlay(h("div", {class: "sp-ergebnis"},
      h("section", {class: "sp-block sp-block-lohn"},
        h("div", {class: "sp-erg-kopf"}, h("span", {class: "sp-kunde-sym gross", style: {"--k": `var(${k.farbe || "--accent"})`}}, k.symbol || "✉"),
          h("div", {}, h("span", {class: "sp-leise"}, `${k.name} · ${def.titel}`), h("h2", {}, sterne >= 4.5 ? "Hervorragend gelöst!" : sterne >= 3 ? "Gelöst!" : "Gelöst – mit Hilfe"))),
        h("div", {class: "sp-lohn-reihe"}, sternEl,
          h("div", {class: "sp-lohn"}, euroEl, h("b", {class: "sp-ruf"}, `+${erg.ruf} Ruf`),
            erg.lohn.tempo || erg.lohn.verdacht || erg.lohn.variante ? h("small", {}, "inkl. " + [erg.lohn.tempo ? `${fmtEuro(erg.lohn.tempo)} Tempo-Bonus` : "", erg.lohn.verdacht ? `${fmtEuro(erg.lohn.verdacht)} für den Verdacht` : "",
              erg.lohn.variante ? `${erg.lohn.variante.id === "sauber" ? "Aufschlag für saubere Arbeit" : "Abschlag fürs Provisorium"} (× ${String(erg.lohn.variante.faktor).replace(".", ",")})` : ""].filter(Boolean).join(" und ")) : null)),
        ...zeilen),
      erg.weg && erg.weg.length ? h("section", {class: "sp-block sp-weg"}, h("h3", {}, "Dein Weg"),
        h("ol", {class: "sp-weg-chips"}, erg.weg.map((c, i) => [i ? h("li", {class: "sp-pfeil", "aria-hidden": "true"}, "→") : null,
          h("li", {class: c.ok === true ? "ok" : c.ok === false ? "nicht" : ""}, c.text)])),
        erg.verdacht && erg.verdacht.gesetzt ? h("p", {class: "sp-verdacht " + (erg.verdacht.treffer || "daneben")},
          {voll: "🎯 ", ursache: "🔎 ", schicht: "🔎 "}[erg.verdacht.treffer] || "💭 ", erg.verdacht.text) : null,
        erg.hotline ? h("p", {class: "sp-hotline"}, "☎ " + erg.hotline.text) : null,
        erg.schuld ? h("p", {class: "sp-schuld"}, `🩹 Provisorium: In etwa drei Aufträgen meldet sich ${kunde(erg.inst.kunde || def.kunde).ansprechpartner?.name || "der Kunde"} wieder – die Änderung ist nicht gesichert.`) : null) : null,
      merke ? h("section", {class: "sp-block sp-merke"}, h("h3", {}, "Merke"), h("p", {}, merke),
        h("div", {class: "sp-merke-fuss"},
          def.quelle ? h("small", {class: "sp-leise"}, "Quelle: " + def.quelle) : null,
          typeof UI.wiki?.oeffnen === "function" && skill ? h("button", {type: "button", class: "knopf geist klein", onclick: () => { zu(); UI.wiki.oeffnen(skill); }}, "📖 Nachlesen") : null)) : null,
      h("div", {class: "sp-knoepfe"},
        weiterKnopf,
        h("button", {type: "button", class: "knopf" + (weiterKnopf ? "" : " primaer"), onclick: () => { zu(); UI.sandbox?.laden?.(); UI.app.ansicht("heute"); }}, "Übersicht"),
        feierabend ? h("button", {type: "button", class: "knopf", title: "Das Programm wird zur kleinen Leiste am Bildschirmrand", onclick: () => { zu(); UI.modus("leiste"); }}, "🌙 Feierabend: zur Leiste") : null)), "erfolg");
    zaehlen(euroEl, erg.euro);
    UI.klang?.spielen("sterne");
  }
  /* Fehlerdex: neu gesehen/verstanden und Ehrentitel – je eine kurze Zeile (Abschluss, also kein Verraten) */
  function dexZeilen(dex){
    if (!dex) return [];
    const neu = dex.neu || [], z = [];
    if (neu.length) z.push(h("p", {class: "sp-zeile"}, "📕 ", h("b", {}, "Fehlerdex: "),
      neu.map(d => `${d.titel} – ${d.zustand === "verstanden" ? "verstanden" : "gesehen"}`).join(" · ")));
    if ((dex.titel || []).length) z.push(h("p", {class: "sp-zeile"}, "🏆 ", h("b", {}, "Ehrentitel: "), dex.titel.join(" · ")));
    return z;
  }
  /* Tagesziel: eine Zeile mit offenem Faden für morgen (die ausführliche Bilanz steht im Hub „Heute“) */
  function feierabendZeile(){
    const b = Spiel.tag.bilanz(), morgen = b.morgenFaellig[0] ? Spiel.skill(b.morgenFaellig[0]).name : null;
    return h("p", {class: "sp-zeile"}, "🎉 ", h("b", {}, "Tagesziel geschafft"), ` – ${b.tickets} Aufträge heute` + (morgen ? ` · morgen fällig: ${morgen}` : ""));
  }
  /* Merke: Einstieg erklärt (bis drei Sätze), AP1/AP2 bekommen nur die Regel – den letzten Satz der Erklärung */
  function merkeText(def, niveau){
    const saetze = String(def.erklaerung || "").split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ„])/).map(s => s.trim()).filter(Boolean);
    if (!saetze.length) return "";
    return niveau === "E" ? saetze.slice(0, 3).join(" ") : saetze[saetze.length - 1];
  }
  /* Stufenregeln: Einstieg probiert frei; AP1/AP2 zählen den ersten Versuch wie in der Prüfung */
  function versuchText(inst, niveau){
    const abzug = Spiel.regeln(inst).versuchAbzug;
    if (!abzug) return "Die Abnahme hat nachgemessen. Kein Abzug – du kannst weiterarbeiten.";
    return `Die Abnahme hat nachgemessen. Jetzt kein Abzug – die bestandene Abnahme kostet dann ${abzug === 0.5 ? "½ Stern" : "1 Stern"} (${niveau}: Der erste Versuch zählt wie in der Prüfung). Prüf vorher selbst nach.`;
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
      h("div", {}, h("h2", {}, "Postfach"), h("p", {class: "sp-leise"}, liste.length === Spiel.POSTFACH_WAHL && st.erledigt.length === 1
        ? "Wähle deinen nächsten Auftrag – Lohn, Zeit und Thema unterscheiden sich."
        : liste.length ? `${liste.length} ${liste.length === 1 ? "Auftrag wartet" : "Aufträge warten"} · Stufe ${st.stufe} · ${st.erledigt.length} erledigt` : "Alles erledigt.")),
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
          formChip(def),
          h("span", {class: "sp-chip niv-" + (Spiel.niveauFuer ? Spiel.niveauFuer(def) : def.stufe), title: "Risiko: " + Spiel.risikoVon(def).warum},
            `${NIV[Spiel.niveauFuer ? Spiel.niveauFuer(def) : def.stufe] || def.stufe} · Risiko ${Spiel.risikoVon(def).text}`),
          h("span", {class: "sp-chip"}, `~${Spiel.minuten(def)} min`),
          h("span", {class: "sp-chip geld"}, fmtEuro((def.lohn || {}).euro || 0)),
          (def.skills || [])[0] ? h("span", {class: "sp-chip uebt", title: "Das übst du dabei"}, "Übt: " + Spiel.skill(def.skills[0]).name) : null,
          inst.quelle === "wartung" ? h("span", {class: "sp-chip wartung"}, "Wartung") : null,
          inst.quelle === "wiederholung" ? h("span", {class: "sp-chip wdh"}, "Wiederholung") : null,
          inst.quelle === "folge" ? h("span", {class: "sp-chip folge", title: "Ein Provisorium von neulich hat nicht gehalten"}, "↩ Folgeauftrag") : null,
          Spiel.varianten.fuer(def) ? h("span", {class: "sp-chip wahl", title: "Du entscheidest: Provisorium (schnell, 60 % Lohn, kommt wieder) oder sauber (gesichert und dokumentiert, 120 %)"}, "🩹/🧰 Wahl") : null,

          frist != null ? h("span", {class: "sp-chip frist"}, frist > 0 ? `⏱ ${frist} min` : "⏱ überfällig") : null)));
  }
  /* Auftragsform als kleine Marke (Symbol + Wort), E1 */
  function formChip(def){
    const form = Spiel.formVon(def), F = Spiel.FORMEN[form] || Spiel.FORMEN.stoerung;
    return h("span", {class: "sp-chip form form-" + form, title: F.text}, `${F.sym} ${F.titel}`);
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
  /* Textdiät (A4): je Schritt genau ein Satz und ein Knopf; das passende Werkzeug ist schon gewählt.
     Einstieg in 90 s (Hebel 7): statt Willkommensfenster spricht der Senior in zwei kurzen Blasen (zusammen ≤ 25 Wörter);
     die zweite Blase kommt nach 2,6 s oder auf Klick. */
  const COACH = [
    {blasen: [k => `Hallo, ich bin der Senior. ${(k.ansprechpartner?.name || k.name).split(" ")[0]} vom ${k.name} braucht uns!`,
              () => "Ihre Kasse hat kein Kabel – zieh eins von der Kasse zum Switch."], werkzeug: "kabel", zeigen: ["kasse", "sw1"]},
    {text: "Prüf es wie ein Profi: Zieh mit dem Ping-Werkzeug von der Kasse auf den Drucker.", werkzeug: "ping", zeigen: ["kasse", "drucker"]},
    {text: "Paket angekommen – jetzt fehlt nur noch die Abnahme.", werkzeug: "auswahl", zeigen: []},
  ];
  function coachStart(){
    if (Spiel.einst.coach === false) return false;
    S.coach = {schritt: 0, blase: 0, neu: true};
    coachZeigen();
    UI.labor.auftragNeu();          /* Zeile sofort zeigen – vor dem Einpassen im nächsten Frame */
    S.coach.timer = setTimeout(() => coachBlase(1), 2600);
    return true;
  }
  function coachBlase(n){
    const c = S.coach && COACH[S.coach.schritt];
    if (!c || !c.blasen || (S.coach.blase || 0) >= n) return;
    clearTimeout(S.coach.timer);
    S.coach.blase = n; S.coach.neu = true;
    coachZeigen(); UI.labor.auftragNeu(); UI.klang?.spielen("blase");
  }
  function coachWeiter(n){ if (!S.coach) return; clearTimeout(S.coach.timer); S.coach.schritt = Math.max(S.coach.schritt, n); S.coach.blase = 0; S.coach.neu = true; coachZeigen(); UI.labor.auftragNeu(); }
  function coachZeigen(){
    const c = S.coach && COACH[S.coach.schritt]; if (!c) return;
    /* Einsteiger ziehen sonst Geräte herum statt zu verkabeln: passendes Werkzeug vorwählen */
    if (c.werkzeug && UI.labor.werkzeugName !== c.werkzeug) UI.labor.werkzeug(c.werkzeug);
    const letzte = !c.blasen || (S.coach.blase || 0) >= c.blasen.length - 1;    /* Geräte erst zeigen, wenn die Aufgabe dasteht */
    if (letzte && c.zeigen.length) setTimeout(() => UI.labor.hervorheben(c.zeigen.map(g => ({geraet: g})), 4500), 250);
  }
  function coachLeiste(){
    const c = COACH[S.coach.schritt];
    const def = S.inst ? Spiel.defVon(S.inst) : null, k = kunde(S.inst?.kunde || def?.kunde);
    const text = c.blasen ? c.blasen[S.coach.blase || 0](k) : c.text;
    const mehr = !!c.blasen && (S.coach.blase || 0) < c.blasen.length - 1;
    const el = h("div", {class: "sp-coach" + (S.coach.neu ? " neu" : "") + (mehr ? " weiter" : ""), "data-hinweisquelle": "coach",
      title: mehr ? "Klick: weiter" : null, onclick: mehr ? () => coachBlase((S.coach.blase || 0) + 1) : null},
      h("span", {class: "sp-coach-sym", "aria-hidden": "true"}, "🧑‍🔧"), h("p", {class: "sp-blase"}, text),
      h("button", {type: "button", class: "knopf geist klein", onclick: e => { e.stopPropagation(); clearTimeout(S.coach?.timer); S.coach = null; Spiel.einstSetzen("coach", false); UI.labor.auftragNeu(); }}, "Hinweise aus"));
    S.coach.neu = false;
    return el;
  }
  /* Einstieg in 90 s (Hebel 7): kein Fenster vorab – das Spiel öffnet sofort den ersten Auftrag, der Senior spricht
     dort in zwei kurzen Blasen. Messpunkte (für die Abnahme): S.mess = {t0, ersteHandlung, erfolg} in ms seit Seitenstart. */
  function einstiegStarten(){
    let inst = Spiel.st.postfach.find(i => i.ticketId === Spiel.EINSTIEG_TICKET);
    if (!inst) inst = Spiel.instanzErstellen({ticketId: Spiel.EINSTIEG_TICKET, quelle: "postfach"});
    S.mess = {t0: Math.round(performance.now()), ersteHandlung: null, erfolg: null};
    oeffnen(inst.iid);
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
    if (!UI.buehneFrei() || S.probe) { abzeichenPlanen(1500); return; }
    const neu = Spiel.abzeichen.abholen(); if (!neu.length) return;
    const ansehen = {text: "Ansehen", fn: () => UI.app.ansicht("lernstand")};
    if (neu.length > 2) UI.toast(neu.map(a => a.sym + " " + a.titel).join(" · "), "ok", {titel: `${neu.length} neue Abzeichen`, aktion: ansehen});
    else for (const a of neu) UI.toast(`${a.sym} ${a.titel} – ${a.text}`, "ok", {titel: "Neues Abzeichen", aktion: ansehen});
  }
  /* Neue Kundenpost: leiser Hinweis in der Vollansicht, erst wenn kein Dialog offen ist (die Leiste zeigt nur den Zähler) */
  function postMelden(neu, versuch = 0){
    if (UI.modus() !== "voll") return;
    if ((!UI.buehneFrei() || S.probe) && versuch < 40) { setTimeout(() => postMelden(neu, versuch + 1), 1500); return; }
    const n = neu[neu.length - 1], a = postAbsender(n);
    UI.toast(neu.length > 1 ? `${neu.length} neue Nachrichten im Postfach.` : `${a.name}: ${String(n.text).split("\n")[0].slice(0, 90)}${String(n.text).length > 90 ? " …" : ""}`, "info",
      {titel: "✉ Neue Nachricht", id: "post", aktion: {text: "Lesen", fn: () => { S.postfachWahl = n.id; UI.app.ansicht("postfach"); }}});
  }

  document.addEventListener("keydown", e => {
    if (e.key !== "Escape" || !S.mappe.offen || UI.app.aktuell !== "labor" || UI.menue?.offen?.() || document.querySelector(".sp-overlay, .dialog-huelle")) return;
    e.preventDefault(); e.stopPropagation(); mappeZu();
  }, true);

  /* ---------- Bus ---------- */
  Bus.an("netz-geaendert", d => {
    if (S.inst && d && d.netz === S.inst.netz) livePlanen();
    if (S.mess && S.mess.ersteHandlung == null) S.mess.ersteHandlung = Math.round(performance.now());
  });
  Bus.an("arbeit-geaendert", d => { if (S.inst && d && d.inst === S.inst) livePlanen(); });   /* Antwort, Tabelle, Notiz, Audit */
  Bus.an("befehl-gemerkt", d => {
    if (!S.inst || !d || d.inst !== S.inst) return;
    const b = (S.inst.befehle || []).slice(-1)[0], name = b && (S.inst.netz.geraete[b.geraet]?.name || b.geraet);
    if (b) wegMerken(S.inst, {art: "befehl", ok: b.ok, text: `${name}> ${b.befehl.length > 28 ? b.befehl.slice(0, 27) + "…" : b.befehl}`});
    livePlanen();
  });
  Bus.an("zustand-geaendert", () => {
    status();
    if (Spiel.abzeichen.pruefen().length) abzeichenPlanen(400);
    const neuePost = Spiel.post.pruefen();
    if (neuePost.length) { status(); setTimeout(() => postMelden(neuePost), 400); }   /* erst nach dem Start der Probe prüfen, ob die Bühne frei ist */
  });
  Bus.an("ticket-neu", () => { status(); if (UI.app.aktuell === "postfach") { const c = document.querySelector(".sp-postfach")?.parentElement; if (c) postfachAnsicht(c); } });
  Bus.an("trace", d => {
    if (S.inst && d && d.quelle === "ping" && d.ergebnis && UI.labor.netz === S.inst.netz) {
      const ok = (d.ergebnis.antworten || []).some(a => a.ok), n = id => UI.labor.netz.geraete[id]?.name || id;
      wegMerken(S.inst, {art: "ping", ok, text: `Ping ${n(d.von)} → ${n(d.nach)} ${ok ? "✓" : "✗"}`});
    }
    if (S.coach && S.coach.schritt === 1 && d && d.quelle === "ping" && d.ergebnis && (d.ergebnis.antworten || []).some(a => a.ok)) coachWeiter(2);
  });

  /* ---------- Start ---------- */
  (UI.startHaken ||= []).push(() => {
    UI.app.registrieren("postfach", {titel: "Postfach", symbol: "postfach", zeigen: c => postfachAnsicht(c), wieder: c => postfachAnsicht(c),
      zaehler: () => Spiel._st ? Spiel.ungelesen() : 0});
  });
  Bus.an("ui-bereit", () => {
    try {
      Spiel.laden();
      Spiel.tagebuch.sitzung();                     /* Spieltagebuch: eine Sitzung je Programmstart */
      vorhersageEinrichten();
      /* Desktop: Rust hat das Fenster umgeschaltet (Tray-Klick, Strg+Alt+L, Ruhe) – Ansicht nachziehen */
      Plattform.an("modus-extern", m => { if (UI.modus() !== m) UI.modus(m); });
      status();
      aktiveLaden();
      if (!Spiel.st.einstieg.fertig && !Spiel.st.erledigt.length) { if (!S.inst) einstiegStarten(); else UI.app.ansicht("labor"); }
      else UI.app.ansicht("heute");                /* Hub „Heute“ ist die Startansicht (S2); ein offener Auftrag wartet dort */
    } catch (e) { console.error("Spielstart", e); UI.toast("Das Spiel konnte nicht starten: " + e.message, "fehler"); }
  });

  return {oeffnen, postfachAnsicht, status, abnahmeAnfordern, einstiegStarten, mappeAuf, mappeZu, get inst(){ return S.inst; }, get mess(){ return S.mess || null; }, _S: S};
})();
