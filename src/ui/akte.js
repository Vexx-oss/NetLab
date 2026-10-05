"use strict";
/* ---------- Akte und Verdacht im Dock (Design – Spielspaß 2.0, Hebel 2; Architektur § 9.4, Präfix ak-) ----------
   Oben der Verdacht (Schicht → Ursache → Gerät), darunter die Beweiskarten, neueste zuerst. Der Reiter erscheint mit
   der ersten Karte (erster Ping/Kabeltest) oder über das ⋯-Menü „Akte und Verdacht“ – der Start bleibt ruhig (R5).
   Grund und Schicht einer Karte zeigt nur der Einstieg (R1); im AP-Niveau steht dort, was ein echtes Werkzeug zeigt. */
UI.akte = (() => {
  const S = {schicht: null, ursache: null, geraet: null, aendern: false, hinweis: new Set()};
  const inst = () => { const i = UI.spiel?.inst; return i && UI.labor.netz === i.netz ? i : null; };
  const SYM = {ping: "📡", kabel: "🔌", trace: "🧭", befehl: "⌨", plan: "🗺"};

  function zeichnen(){
    const c = UI.labor.el?.akte, i = inst();
    if (!c || c.hidden || !i) return;
    const niveau = Spiel.niveauVon(i), karten = Spiel.akte.liste(i).slice().sort((a, b) => b.t - a.t);
    c.replaceChildren(h("div", {class: "ak"}, verdachtBlock(i, niveau),
      h("section", {class: "ak-karten"}, h("h3", {}, "Beweise ", h("small", {}, karten.length ? `${karten.length}` : "")),
        karten.length ? h("ol", {class: "ak-liste"}, karten.map(k => karte(i, k, niveau)))
          : h("p", {class: "ak-leer"}, "Noch keine Beweise. Jeder Ping (und jeder Kabeltest) landet hier als Karte."))));
  }
  function karte(i, k, niveau){
    return h("li", {class: "ak-karte" + (k.ok == null ? " aussage" : k.ok ? " ok" : " nicht") + (k.wichtig ? " wichtig" : "")},
      h("span", {class: "ak-sym", "aria-hidden": "true"}, SYM[k.art] || "•"),
      h("div", {class: "ak-text"},
        h("b", {}, k.titel || k.art, k.anzahl > 1 ? h("small", {}, ` ${k.anzahl}×`) : null),
        h("span", {class: "ak-befund"}, (k.ok == null ? "„" : k.ok ? "✓ " : "✗ ") + k.befund + (k.ok == null ? "“" : "")),   /* Kundenaussage (Hotline): weder ✓ noch ✗ */
        niveau === "E" && k.grund ? h("small", {class: "ak-grund"}, `${Spiel.grundTitel(k.grund)}${k.schicht ? ` · Schicht ${k.schicht}` : ""}`) : null),
      h("button", {type: "button", class: "ak-stern" + (k.wichtig ? " an" : ""), title: k.wichtig ? "Markierung entfernen" : "Als wichtig markieren", "aria-pressed": String(!!k.wichtig),
        onclick: () => { Spiel.akte.stern(i, k.n); zeichnen(); }}, k.wichtig ? "★" : "☆"));
  }

  /* ---------- Verdacht ---------- */
  function verdachtBlock(i, niveau){
    const o = Spiel.verdacht.optionen(i);
    if (!o) return h("section", {class: "ak-verdacht ruhig"}, h("p", {class: "ak-leer"}, "Bauauftrag – hier gibt es keine Ursache zu finden, nur ein Ziel."));
    const regel = Spiel.regeln(i).verdachtAbzug;
    const pflicht = regel ? `${niveau}: ohne Verdacht −${regel === 0.5 ? "½" : regel} ★` : "freiwillig – Volltreffer vor dem Eingriff bringt +10 % Lohn";
    const v = i.verdacht;
    if (v && !S.aendern) {
      const u = o.ursachen.find(x => x.id === v.ursache), g = o.geraete.find(x => x.id === v.geraet);
      return h("section", {class: "ak-verdacht gesetzt"},
        h("div", {class: "ak-v-kopf"}, h("h3", {}, "🔎 Dein Verdacht"), h("button", {type: "button", class: "knopf klein geist", onclick: () => { S.aendern = true; Object.assign(S, {schicht: v.schicht, ursache: v.ursache, geraet: v.geraet}); zeichnen(); }}, "ändern")),
        h("p", {class: "ak-v-satz"}, `Schicht ${v.schicht} · ${u ? u.titel : "–"} · ${g ? g.name : "–"}`),
        h("small", {class: "ak-v-zeit" + (v.vorEingriff ? " gut" : "")}, v.vorEingriff ? "✓ vor dem ersten Eingriff festgehalten" : "nach dem ersten Eingriff festgehalten – zählt, bringt aber keinen Bonus"));
    }
    const bereit = S.schicht && S.ursache && S.geraet;
    const chip = (an, text, fn, titel) => h("button", {type: "button", class: "ak-chip" + (an ? " an" : ""), "aria-pressed": String(!!an), title: titel || null, onclick: fn}, text);
    return h("section", {class: "ak-verdacht"},
      h("div", {class: "ak-v-kopf"}, h("h3", {}, "🔎 Dein Verdacht"), h("small", {}, pflicht)),
      h("p", {class: "ak-schritt"}, "1 · Welche Schicht?"),
      h("div", {class: "ak-chips"}, o.schichten.map(s => chip(S.schicht === s.n, `${s.n} ${s.name}`, () => { S.schicht = s.n; zeichnen(); }, s.text))),
      h("p", {class: "ak-schritt"}, "2 · Welche Ursache?"),
      h("div", {class: "ak-chips ak-ursachen"}, o.ursachen.map(u => chip(S.ursache === u.id, u.titel, () => { S.ursache = u.id; zeichnen(); }))),
      h("p", {class: "ak-schritt"}, "3 · An welchem Gerät?"),
      h("select", {class: "in-auswahl ak-geraet", "aria-label": "Gerät", onchange: e => { S.geraet = e.target.value || null; zeichnen(); }},
        h("option", {value: ""}, "– Gerät wählen –"), o.geraete.map(g => h("option", {value: g.id, selected: S.geraet === g.id}, g.name))),
      h("div", {class: "ak-v-fuss"},
        S.aendern ? h("button", {type: "button", class: "knopf klein geist", onclick: () => { S.aendern = false; zeichnen(); }}, "Abbrechen") : null,
        h("button", {type: "button", class: "knopf", disabled: !bereit, onclick: () => festhalten(i)}, "Verdacht festhalten")));
  }
  function festhalten(i){
    const v = Spiel.verdacht.setzen(i, {schicht: S.schicht, ursache: S.ursache, geraet: S.geraet});
    S.aendern = false;
    UI.klang?.spielen("haken");
    UI.toast(v.vorEingriff ? "Verdacht festgehalten – jetzt eingreifen und prüfen." : "Verdacht festgehalten (nach dem ersten Eingriff).", "ok", {dauer: 2600});
    zeichnen();
  }

  /* ---------- Reiter freigeben, Karten aus Bus-Ereignissen ---------- */
  function freigeben(zeigen){
    const i = inst(); if (!i) return;
    UI.labor.dockReiter("akte", true, {zahl: Spiel.akte.liste(i).length || null});
    if (zeigen) UI.labor.dock("akte");
    zeichnen();
  }
  function neuerAuftrag(){
    Object.assign(S, {schicht: null, ursache: null, geraet: null, aendern: false});
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
    UI.toast(`Halte deinen Verdacht in der Akte fest – im ${Spiel.niveauVon(i)}-Niveau gehört die Hypothese vor den Eingriff.`, "info",
      {id: "verdacht", titel: "Verdacht", dauer: 7000, aktion: {text: "Zur Akte", fn: () => freigeben(true)}});
  });
  Bus.an("ticket-geoeffnet", () => requestAnimationFrame(neuerAuftrag));
  /* Klick auf ein Gerät im Labor füllt Schritt 3 des Verdachts vor */
  Bus.an("auswahl", d => { const i = inst(); if (d && d.geraet && i && (!i.verdacht || S.aendern) && UI.labor.dockOffen?.("akte")) S.geraet = d.geraet; });
  for (const e of ["dock", "verdacht", "auswahl"]) Bus.an(e, () => requestAnimationFrame(zeichnen));

  return {zeichnen, freigeben};
})();
