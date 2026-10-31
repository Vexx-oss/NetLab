"use strict";
/* ---------- Einsatzakte: Verdacht und Jobdoku im Dock (Runde 4, Strang A; Architektur § 9.4, Präfix ak-) ----------
   Das Dock zeigt den Auftrag als Dossier: Aktenkopf (Kunde, Vorgang, Niveau, Beginn), didaktische Leiter,
   Hypothese als Stempel bzw. ruhige Auswahlzeilen (Schicht → Ursache → Gerät, ohne select), Schichtentreppe
   mit Beweiszahl und Filter, Beweistimeline mit Zeit/Quelle/Befund und ★ sowie der aufklappbare
   Dokumentationsblock mit „Einsatzbericht kopieren“.
   Grund und Schicht einer Karte zeigt nur der Einstieg (R1); im AP-Niveau steht dort nur, was ein echtes
   Werkzeug zeigt. Die Datenhilfen (Schichtensummen, Fundort, Fortschritt, Bericht) liegen additiv in
   src/spiel/verdacht.js (Spiel.akte.*) und sind headless geprüft (tests/akte-dossier.test.js).
   Der Reiter erscheint mit der ersten Karte (erster Ping/Kabeltest) oder über das ⋯-Menü „Akte und Verdacht“ –
   der Start bleibt ruhig (R5). */
UI.akte = (() => {
  const S = {schicht: null, ursache: null, geraet: null, aendern: false, hinweis: new Set(), filter: null, kopiert: new Set(), doku: false};
  const inst = () => { const i = UI.spiel?.inst; return i && UI.labor.netz === i.netz ? i : null; };
  const SYM = {ping: "ping", kabel: "kabel", trace: "trace", befehl: "tastatur", plan: "plan"};   /* U01: SVG-Glyphen statt Emoji */
  const imEinstieg = niveau => niveau === "E";
  const zz = n => (n < 10 ? "0" : "") + n;
  const uhr = ms => { const n = Number(ms); if (!Number.isFinite(n)) return null; const d = new Date(n); return zz(d.getHours()) + ":" + zz(d.getMinutes()); };
  const lang = ms => { const n = Number(ms); return Number.isFinite(n) ? new Date(n).toLocaleString("de-DE") : null; };
  const kundeVon = i => { const def = Spiel.defVon(i) || {}; return Spiel.kundenDaten(i.kunde || def.kunde); };
  const geraeteName = (i, id) => (i.netz.geraete[id] && i.netz.geraete[id].name) || id;
  const KACHEL = klasse => "bn-k flach " + klasse;

  /* ---------- Das ganze Dossier ---------- */
  function zeichnen(){
    const c = UI.labor.el?.akte, i = inst();
    if (!c || c.hidden) return;
    if (!i) { c.replaceChildren(h("div", {class: "ak"}, ohneAuftrag())); return; }
    const niveau = Spiel.niveauVon(i);
    const karten = Spiel.akte.liste(i).slice().sort((a, b) => b.t - a.t);
    const register = Spiel.akte.schichten(i);
    c.replaceChildren(h("div", {class: "ak"},
      aktenkopf(i, niveau),
      leiter(i),
      schichtentreppe(i, niveau, register),
      beweise(i, niveau, karten),
      hypothese(i, niveau),
      dokumentation(i)));
  }

  /* ---------- Aktenkopf: Mikrolabel · Titel · Vorgang/Beginn · Niveau ---------- */
  function aktenkopf(i, niveau){
    /* Der Auftragstitel steht schon in der Auftragszeile (Hero). Der Aktendeckel wiederholt ihn nicht:
       Kunde als Titel, Vorgang im Mikrolabel, Beginn als Meta, Niveau als Chip (Prüfer-1-Befund, Runde 4). */
    const k = kundeVon(i), beginn = uhr(i.start);
    const marke = UI.bento && typeof UI.bento.monogramm === "function" ? UI.bento.monogramm(k.name, {farbe: k.farbe || "--accent"}) : null;
    return h("header", {class: "bn-k akzent ak-kopf"},
      h("div", {class: "ak-kopf-oben"},
        h("div", {class: "ak-kopf-text"},
          h("span", {class: "bn-kicker"}, "Einsatzakte · Vorgang " + (i.ticketId || "–")),
          h("h2", {class: "ak-titel"}, k.name),
          h("p", {class: "bn-meta"}, beginn ? "Beginn " + beginn : "Beginn unbekannt")),
        h("div", {class: "ak-kopf-rechts"}, marke,
          h("span", {class: "bn-chip wert", title: "Bearbeitungsniveau"}, Spiel.NIVEAU_NAME[niveau] || niveau))));
  }

  /* ---------- Didaktische Leiter als Fortschrittsband (aus echten Daten) ---------- */
  function leiter(i){
    const sprossen = Spiel.akte.fortschritt(i, {kopiert: S.kopiert.has(i.iid)});
    return h("section", {class: KACHEL("ak-leiter")},
      h("span", {class: "bn-kicker"}, "Dein Weg"),
      h("div", {class: "ak-sprossen"}, sprossen.map(s => h("span", {
        class: "ak-sprosse" + (s.erledigt ? " erledigt" : "") + (s.naechster ? " naechster" : ""),
        title: s.satz, "aria-current": s.naechster ? "step" : null},
        s.erledigt ? UI.symbol("ok", 13) : h("span", {class: "ak-punkt", "aria-hidden": "true"}),
        h("span", {}, s.titel)))));
  }

  /* ---------- Hypothese: ruhige Auswahlzeilen oder Stempel ---------- */
  function hypothese(i, niveau){
    const o = Spiel.verdacht.optionen(i);
    if (!o) return h("section", {class: KACHEL("ak-verdacht ruhig")},
      h("span", {class: "bn-kicker"}, "Hypothese"),
      h("p", {class: "ak-leer"}, "Bauauftrag – hier gibt es keine Ursache zu finden, nur ein Ziel."));
    const regel = Spiel.regeln(i).verdachtAbzug;
    const pflicht = regel ? niveau + ": ohne Verdacht −" + (regel === 0.5 ? "½" : regel) + " ★" : "freiwillig – Volltreffer vor dem Eingriff bringt +10 % Lohn";
    const v = i.verdacht;
    if (v && !S.aendern) return stempel(i, v, o);
    const bereit = S.schicht && S.ursache && S.geraet;
    const chip = (an, text, fn, titel) => h("button", {type: "button", class: "ak-chip" + (an ? " an" : ""), "aria-pressed": String(!!an), title: titel || null, onclick: fn}, text);
    return h("section", {class: KACHEL("ak-verdacht")},
      h("header", {class: "ak-v-kopf"},
        h("div", {}, h("span", {class: "bn-kicker"}, "Hypothese"), h("h3", {}, UI.symbol("suche", 18), " Dein Verdacht")),
        h("small", {}, pflicht)),
      h("p", {class: "ak-schritt"}, "1 · Welche Schicht?"),
      h("div", {class: "ak-chips"}, o.schichten.map(s => chip(S.schicht === s.n, s.n + " " + s.name, () => { S.schicht = s.n; zeichnen(); }, s.text))),
      h("p", {class: "ak-schritt"}, "2 · Welche Ursache?"),
      h("div", {class: "ak-chips ak-ursachen"}, o.ursachen.map(u => chip(S.ursache === u.id, u.titel, () => { S.ursache = u.id; zeichnen(); }))),
      h("p", {class: "ak-schritt"}, "3 · An welchem Gerät?"),
      h("div", {class: "ak-chips ak-geraet", role: "group", "aria-label": "Gerät"}, o.geraete.map(g => chip(S.geraet === g.id, g.name, () => { S.geraet = g.id; zeichnen(); }))),
      h("div", {class: "ak-v-fuss"},
        S.aendern ? h("button", {type: "button", class: "knopf klein geist", onclick: () => { S.aendern = false; zeichnen(); }}, "Abbrechen") : null,
        h("button", {type: "button", class: "knopf", disabled: !bereit, onclick: () => festhalten(i)}, "Verdacht festhalten")));
  }
  function stempel(i, v, o){
    const u = o.ursachen.find(x => x.id === v.ursache), g = o.geraete.find(x => x.id === v.geraet);
    const ergebnis = typeof v.treffer === "string" ? ({voll: ["ziel", "Volltreffer"], ursache: ["suche", "Ursache stimmt"], schicht: ["suche", "Schicht stimmt"]})[v.treffer] : null;
    return h("section", {class: KACHEL("ak-verdacht ak-stempel gesetzt")},
      h("header", {class: "ak-v-kopf"},
        h("div", {}, h("span", {class: "bn-kicker"}, "Hypothese"), h("h3", {}, UI.symbol("suche", 18), " Dein Verdacht")),
        h("button", {type: "button", class: "knopf klein geist", onclick: () => { S.aendern = true; Object.assign(S, {schicht: v.schicht, ursache: v.ursache, geraet: v.geraet}); zeichnen(); }}, "ändern")),
      h("p", {class: "ak-v-satz"}, "Schicht " + (v.schicht || "–") + " · " + (u ? u.titel : "–") + " · " + (g ? g.name : "–")),
      h("small", {class: "ak-v-zeit" + (v.vorEingriff ? " gut" : "")}, v.vorEingriff ? "✓ vor dem ersten Eingriff festgehalten" : "nach dem ersten Eingriff festgehalten – zählt, bringt aber keinen Bonus"),
      ergebnis ? h("p", {class: "ak-ergebnis"}, UI.symbol(ergebnis[0], 15), " " + ergebnis[1]) : null);
  }
  function festhalten(i){
    const v = Spiel.verdacht.setzen(i, {schicht: S.schicht, ursache: S.ursache, geraet: S.geraet});
    if (!v) return;
    S.aendern = false;
    UI.klang?.spielen("haken");
    UI.toast(v.vorEingriff ? "Verdacht festgehalten – jetzt eingreifen und prüfen." : "Verdacht festgehalten (nach dem ersten Eingriff).", "ok", {dauer: 2600});
    zeichnen();
  }

  /* ---------- Schichtentreppe: Register mit Beweiszahl, Klick filtert nur die Sichtbarkeit ---------- */
  function schichtentreppe(i, niveau, register){
    const e = imEinstieg(niveau);
    const an = sch => S.filter === sch.n;
    return h("section", {class: KACHEL("ak-register")},
      h("div", {class: "ak-register-kopf"},
        h("span", {class: "bn-kicker"}, "Schichtentreppe"),
        h("small", {class: "bn-meta"}, e ? "Klick filtert die Beweise" : "Im AP-Niveau ohne Schichtbezug")),
      h("div", {class: "ak-treppe"}, register.schichten.map(sch => h("button", {
        type: "button", class: "ak-schicht" + (an(sch) ? " an" : ""), "aria-pressed": String(an(sch)),
        disabled: !e || sch.zahl === 0,
        title: "Schicht " + sch.n + " " + sch.name + (e ? ": " + sch.zahl + " stützende Beweise – filtert die Liste" : " (im AP-Niveau ohne Beweiszahl)"),
        onclick: () => { S.filter = an(sch) ? null : sch.n; zeichnen(); }},
        h("b", {class: "ak-schicht-nr"}, String(sch.n)),
        h("span", {class: "ak-schicht-zahl"}, e ? String(sch.zahl) : "–")))),
      e && S.filter != null ? h("button", {type: "button", class: "knopf klein geist", onclick: () => { S.filter = null; zeichnen(); }}, "Filter aufheben") : null,
      e && register.ohne ? h("p", {class: "bn-meta"}, register.ohne + (register.ohne === 1 ? " Beweis" : " Beweise") + " ohne Schichtbezug (z. B. Kundenaussage)") : null);
  }

  /* ---------- Beweistimeline: Zeit · Quelle · Befund · Schicht-Rail; Karte führt zum Fundort ---------- */
  function beweise(i, niveau, karten){
    const e = imEinstieg(niveau);
    if (!karten.length) return leereBeweise();
    const sichtbar = S.filter == null ? karten : karten.filter(k => k.schicht === S.filter);
    return h("section", {class: KACHEL("ak-karten")},
      h("div", {class: "ak-karten-kopf"},
        h("h3", {}, "Beweise ", h("small", {}, sichtbar.length === karten.length ? String(karten.length) : sichtbar.length + " von " + karten.length)),
        S.filter != null ? h("span", {class: "bn-chip"}, "Schicht " + S.filter) : null),
      h("ol", {class: "ak-liste"}, sichtbar.map(k => karte(i, k, e))),
      !sichtbar.length ? h("p", {class: "ak-leer"}, "Kein Beweis in dieser Schicht. „Filter aufheben“ zeigt alle Karten.") : null);
  }
  function karte(i, k, e){
    const ziel = Spiel.akte.fundort(i, k);
    const inhalt = [
      h("span", {class: "ak-sym", "aria-hidden": "true"}, UI.symbol(SYM[k.art] || "info", 17)),
      h("span", {class: "ak-zeit", title: lang(k.t)}, uhr(k.t) || ""),
      h("div", {class: "ak-text"},
        h("b", {}, k.titel || k.art, k.anzahl > 1 ? h("small", {}, " " + k.anzahl + "×") : null),
        h("span", {class: "ak-befund"}, (k.ok == null ? "„" : k.ok ? "✓ " : "✗ ") + k.befund + (k.ok == null ? "“" : "")),
        e && k.grund ? h("small", {class: "ak-grund"}, Spiel.grundTitel(k.grund) + (k.schicht ? " · Schicht " + k.schicht : "")) : null),
      e && k.schicht ? h("span", {class: "ak-rail", title: "Schicht " + k.schicht}, String(k.schicht)) : null,
    ];
    const klassen = "ak-karte" + (k.ok == null ? " aussage" : k.ok ? " ok" : " nicht") + (k.wichtig ? " wichtig" : "");
    return h("li", {class: klassen},
      ziel ? h("button", {type: "button", class: "ak-ziel", title: "Zum Fundort springen", onclick: () => springen(ziel)}, inhalt)
        : h("span", {class: "ak-ziel statisch"}, inhalt),
      h("button", {type: "button", class: "ak-stern" + (k.wichtig ? " an" : ""), title: k.wichtig ? "Markierung entfernen" : "Als wichtig markieren", "aria-pressed": String(!!k.wichtig),
        onclick: () => { Spiel.akte.stern(i, k.n); zeichnen(); }}, k.wichtig ? "★" : "☆"));
  }
  /* Zentraler Resolver aus Strang C. Solange er fehlt, bleibt der Weg trotzdem offen: Gerät auswählen und
     Inspektor zeigen. Der Aufruf ist defensiv gekapselt – ein Fehler dort darf die Akte nicht umwerfen. */
  function springen(ziel){
    const F = UI.fehlerziel && typeof UI.fehlerziel.springen === "function" ? UI.fehlerziel.springen : null;
    if (F) { try { F(ziel); return; } catch (e) { console.error("Fundort", e); } }
    const id = ziel && ziel.geraet;
    if (!id || !UI.labor.netz || !UI.labor.netz.geraete[id]) return;
    try { UI.labor.auswaehlen(id); UI.labor.dock("inspektor"); } catch (e) { console.error("Fundort", e); }
  }

  /* ---------- Dokumentation: aufklappbar, nur echte Vorgangsdaten, Bericht zum Kopieren ---------- */
  function dokumentation(i){
    const v = i.verdacht, o = Spiel.verdacht.optionen(i);
    const u = v && o ? o.ursachen.find(x => x.id === v.ursache) : null;
    const g = v && o ? o.geraete.find(x => x.id === v.geraet) : null;
    const ergebnis = v && typeof v.treffer === "string" ? ({voll: "Volltreffer", ursache: "Ursache stimmt", schicht: "Schicht stimmt"})[v.treffer] : null;
    const geaendert = (typeof Spiel.geaenderteGeraete === "function" ? Spiel.geaenderteGeraete(i) : []).map(id => geraeteName(i, id));
    const zeile = (titel, wert) => h("div", {class: "ak-doku-zeile"}, h("b", {}, titel), h("span", {}, wert));
    const teile = [
      zeile("Vorgang", i.ticketId || "–"),
      zeile("Beweise", String(Spiel.akte.liste(i).length)),
      zeile("Hypothese", v ? "Schicht " + (v.schicht || "–") + " · " + (u ? u.titel : "–") + " · " + (g ? g.name : "–") : "noch keine festgehalten"),
      zeile("Geänderte Geräte", geaendert.length ? geaendert.join(", ") : "noch keine"),
      ergebnis ? zeile("Ergebnis", ergebnis) : null,
      String(i.notiz || "").trim() ? zeile("Notiz", String(i.notiz).trim()) : null,
    ].filter(Boolean);
    return h("section", {class: KACHEL("ak-doku")},
      h("details", {open: !!S.doku, ontoggle: e => { S.doku = !!e.target.open; }},
        h("summary", {class: "ak-doku-kopf"}, UI.symbol("mappe", 16), h("span", {}, "Dokumentation"),
          h("span", {class: "ak-doku-pfeil"}, UI.symbol("pfeilUnten", 14))),
        h("div", {class: "ak-doku-inhalt"},
          h("p", {class: "bn-meta"}, "Nur echte Vorgangsdaten: Messungen, deine Hypothese, deine Änderungen. Der Bericht verrät keine Lösung."),
          teile,
          h("button", {type: "button", class: "knopf ak-kopieren", onclick: () => kopieren(i)}, "Einsatzbericht kopieren"))));
  }
  async function kopieren(i){
    const ok = await UI.kopieren(Spiel.akte.bericht(i));
    if (ok) S.kopiert.add(i.iid);
    UI.toast(ok ? "Einsatzbericht kopiert – einfach einfügen." : "Kopieren ging nicht – markier den Text und kopier ihn selbst.", ok ? "ok" : "warn", {id: "einsatzbericht", dauer: 3000});
    zeichnen();
  }

  /* ---------- Leerzustände: ruhige Kacheln mit ehrlichem Satz und einem Weg ---------- */
  function ohneAuftrag(){
    return h("section", {class: "bn-k flach ak-leer-kachel"},
      h("span", {class: "bn-kicker"}, "Einsatzakte"),
      h("h2", {class: "ak-titel"}, "Keine Akte offen"),
      h("p", {class: "bn-lead"}, "Sobald du einen Auftrag im Postfach öffnest, entsteht hier die Einsatzakte: Beweise, Hypothese, Bericht."),
      h("div", {class: "bn-fuss"}, h("button", {type: "button", class: "knopf", onclick: () => UI.app.ansicht("postfach")}, "Zum Postfach")));
  }
  function leereBeweise(){
    return h("section", {class: KACHEL("ak-karten ak-leer-kachel")},
      h("h3", {}, "Beweise ", h("small", {}, "")),
      h("p", {class: "bn-lead"}, "Noch keine Beweise. Jeder Ping, jeder Kabeltest und jeder Terminalbefehl landet hier als Karte."),
      h("div", {class: "bn-fuss"}, h("button", {type: "button", class: "knopf", onclick: () => { try { UI.labor.werkzeug("ping"); } catch (e) { console.error(e); } }},
        UI.symbol("ping", 16), " Ping-Werkzeug wählen")));
  }

  /* ---------- Reiter freigeben, Karten aus Bus-Ereignissen ---------- */
  function freigeben(zeigen){
    const i = inst(); if (!i) return;
    UI.labor.dockReiter("akte", true, {zahl: Spiel.akte.liste(i).length || null});
    if (zeigen) UI.labor.dock("akte");
    zeichnen();
  }
  function neuerAuftrag(){
    Object.assign(S, {schicht: null, ursache: null, geraet: null, aendern: false, filter: null, doku: false});
    const i = inst();
    if (i && Spiel.akte.liste(i).length) freigeben(false);         /* angefangener Auftrag: Akte ist schon da */
  }
  Bus.an("trace", d => {
    const i = inst();
    if (!i || !d || d.quelle !== "ping" || !d.ergebnis) return;
    Spiel.akte.ausPing(i, {von: d.von, nach: d.nach, ergebnis: d.ergebnis, netz: i.netz});
    freigeben(false);
  });
  /* Terminal (Phase C): Diagnosebefehle mit Befund werden Beweiskarten; jeder Befehl zählt für Ziele „befehl“ */
  Bus.an("befehl", d => {
    const i = inst();
    if (!i || !d || d.netz !== i.netz) return;
    Spiel.befehle.merken(i, {geraet: d.id, befehl: d.befehl, ok: Spiel.befehle.gelaufen(d.ergebnis)});
    if (d.ergebnis && d.ergebnis.befund) { Spiel.akte.ausBefehl(i, {geraet: d.id, befehl: d.befehl, befund: d.ergebnis.befund, ok: d.ergebnis.ok !== false, netz: i.netz}); freigeben(false); }
  });
  Bus.an("kabeltest", d => {
    const i = inst(); if (!i || !d) return;
    Spiel.akte.ausKabeltest(i, {a: d.a, b: d.b, oben: d.oben, grund: d.grund, netz: i.netz});
    freigeben(false);
  });
  /* AP-Niveau: einmal je Auftrag erinnern, wenn vor dem Verdacht eingegriffen wird */
  Bus.an("netz-geaendert", d => {
    const i = inst();
    if (!i || !d || d.netz !== i.netz || i.verdacht || S.hinweis.has(i.iid) || !Spiel.verdacht.noetig(i) || !Spiel.regeln(i).verdachtAbzug) return;
    if (!Spiel.verdacht.eingegriffen(i)) return;
    S.hinweis.add(i.iid);
    UI.toast("Halte deinen Verdacht in der Akte fest – im " + Spiel.niveauVon(i) + "-Niveau gehört die Hypothese vor den Eingriff.", "info",
      {id: "verdacht", titel: "Verdacht", dauer: 7000, aktion: {text: "Zur Akte", fn: () => freigeben(true)}});
  });
  Bus.an("netz-geaendert", () => requestAnimationFrame(zeichnen));      /* „Handeln“ und „geänderte Geräte“ mitziehen */
  Bus.an("arbeit-geaendert", () => requestAnimationFrame(zeichnen));    /* Notiz im Auftrag → „Dokumentieren“ */
  Bus.an("ticket-geoeffnet", () => requestAnimationFrame(neuerAuftrag));
  Bus.an("ticket-geloest", () => {
    Object.assign(S, {filter: null, doku: false, aendern: false, schicht: null, ursache: null, geraet: null});
    UI.labor.dockReiter("akte", true, {zahl: null});
    requestAnimationFrame(zeichnen);
  });
  /* Klick auf ein Gerät im Labor füllt Schritt 3 des Verdachts vor */
  Bus.an("auswahl", d => { const i = inst(); if (d && d.geraet && i && (!i.verdacht || S.aendern) && UI.labor.dockOffen?.("akte")) S.geraet = d.geraet; });
  for (const e of ["dock", "verdacht", "auswahl"]) Bus.an(e, () => requestAnimationFrame(zeichnen));

  return {zeichnen, freigeben};
})();
