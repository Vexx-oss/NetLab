"use strict";
/* ---------- UI: Lernstand-Abschnitt „Hilfe und Übung" (Baustein H) ----------
   Vertrag: docs/entwicklung/Hilfestellung – Stufen und Schnittstellen.md § 2, § 5, § 6, § 8.

   Je fälliger oder schwacher Fertigkeit eine Zeile: Name, Leitner-Stufe, die Hilfe, die der
   Bildungsstand dort gibt, ein Knopf „Üben" über Spiel.karriere.training(skill) – der bestehende
   Weg, keine zweite Übungsquelle – und ein Knopf „Wiki" über UI.wiki.oeffnen(skill). Darüber
   steht sichtbar, welche Stufe gilt und was sie freischaltet, mit Sprung in die Einstellungen.

   Warum diese Datei sich selbst einklinkt (§ 7 Schreibrechte): Der Lernstand wird in
   src/ui/karriere.js angemeldet, und diese Datei gehört Baustein C – sie bleibt unberührt.
   Diese Datei lädt später (bauen.py: karriere.js < lernstand-hilfe.js), hängt sich mit einem
   eigenen UI.startHaken ein und legt ihren Abschnitt hinter die bestehende Ansicht.
   abschnitt() ist doppelt aufrufbar: ruft karriere.js es später selbst auf, entsteht kein
   zweiter Abschnitt. Zusätzlich reicht Bus.an("ansicht") den Abschnitt nach, falls die Ansicht
   ohne diesen Haken gebaut wurde – ein Sicherheitsnetz, kein zweiter Weg für den Spieler.

   Baustein A (Spiel.stufe) und C (Spiel.mini) entstehen gleichzeitig: jeder Zugriff ist geprüft,
   jeder Rückfall ist „azubi" (Vertrag § 3, Regel 1), kein Aufruf wirft. Deterministisch: kein
   Math.random, kein Date.now. */

UI.lernstandHilfe = (() => {
  const SICHER_AB = 3;      /* ab L.box 3 gilt eine Fertigkeit als „sicher" – darunter wackelt sie */
  const MAX_ZEILEN = 6;     /* sechs Zeilen, dann ein Sammelhinweis – die Kompetenzkarte zeigt alle */

  /* ---------- Bildungsstand: über Spiel.stufe, sonst dieselben Zahlen wie Vertrag § 2 ----------
     Der Rückfall ist keine Schätzung: es sind die Vertragszahlen, damit der Abschnitt auch ohne
     Baustein A das Richtige sagt (und nicht gar nichts). */
  const RUECKFALL = [
    {id: "azubi",      rang: 1, name: "Azubi (1. Lehrjahr)",             vorschlaege: 1, leiter: "immer",      konto: 6},
    {id: "azubi-plus", rang: 2, name: "Azubi (fortgeschritten)",         vorschlaege: 2, leiter: "immer",      konto: 4},
    {id: "geselle",    rang: 3, name: "Geselle / Prüfungsvorbereitung",  vorschlaege: 1, leiter: "nachfehler", konto: 2},
    {id: "meister",    rang: 4, name: "Meister / Profi",                 vorschlaege: 0, leiter: "nein",       konto: 0},
  ];
  const SCHALTER_AZUBI = {leiter: true, anker: true, miniHilfe: true, training: true};

  const stufensystem = () => (typeof Spiel !== "undefined" && Spiel.stufe ? Spiel.stufe : null);

  function stufeId(){
    const s = stufensystem();
    if (s && typeof s.id === "function") {
      try { const id = s.id(); if (id) return String(id); } catch (e) { /* Rückfall unten */ }
    }
    const e = typeof Spiel !== "undefined" && Spiel.einst ? Spiel.einst : null;
    return e && typeof e.stufe === "string" && e.stufe ? e.stufe : "azubi";
  }

  function stufeDef(id){
    const s = stufensystem();
    if (s && typeof s.def === "function") {
      try { const d = s.def(id); if (d && d.id) return d; } catch (e) { /* Rückfall unten */ }
    }
    const gesucht = id || stufeId();
    return Object.assign({}, RUECKFALL.find(x => x.id === gesucht) || RUECKFALL[0]);
  }

  function stufeKann(frage, rueckfall){
    const s = stufensystem();
    if (s && typeof s.kann === "function") {
      try { const w = s.kann(frage); if (w !== undefined && w !== null) return w; } catch (e) { /* Rückfall unten */ }
    }
    return rueckfall;
  }

  function stufeDarf(frage, rueckfall){
    const s = stufensystem();
    if (s && typeof s.darf === "function") {
      try { return !!s.darf(frage); } catch (e) { /* Rückfall unten */ }
    }
    return !!rueckfall;
  }

  /* Vorrat an freien Hilfen dieser Stufe – je Auftrag, aus Spiel.HILFE_KONTO (§ 2.1). */
  function hilfeKonto(id){
    const k = typeof Spiel !== "undefined" && Spiel.HILFE_KONTO ? Spiel.HILFE_KONTO[id] : undefined;
    if (typeof k === "number") return k;
    const d = RUECKFALL.find(x => x.id === id);
    return d ? d.konto : 0;
  }

  /* „Was gibt die geltende Stufe hier an Hilfe?" – die Stufe gilt global, deshalb für jede Zeile
     dieselbe Antwort. Sie kommt aus kann()/darf() und nicht aus einer zweiten Wahrheitstabelle. */
  /* Der Satz kommt aus Spiel.stufe.freigabeText – EINE Quelle statt zweier Wahrheiten (task-23, E).
     Die Oberfläche hängt nur noch „Stufe N von 4 · Name – " davor. Ohne Baustein A (oder wenn er
     würfelt) baut der Rückfall unten denselben Satz aus denselben Vertragszahlen. */
  function stufenSatz(){
    const s = stufensystem();
    if (s && typeof s.freigabeText === "function") {
      try { const t = s.freigabeText(); if (t && String(t).trim()) return String(t).trim(); } catch (e) { /* Rückfall unten */ }
    }
    return null;
  }

  function hilfeKurz(){
    const satz = stufenSatz();
    if (satz) return satz;
    const d = stufeDef(), teile = [];
    const v = Number(stufeKann("vorschlaege", d.vorschlaege)) || 0;
    teile.push(v > 0 ? `${v} ${v === 1 ? "Vorschlag" : "Vorschläge"} mit Syntax im Terminal` : "kein Vorschlag im Terminal");
    if (stufeDarf("leiter", SCHALTER_AZUBI.leiter)) teile.push(String(stufeKann("leiter", d.leiter)) === "immer" ? "Werkzeugleiter immer sichtbar" : "Werkzeugleiter nach einem Fehler");
    else teile.push("keine Werkzeugleiter");
    const frei = hilfeKonto(d.id);
    if (stufeDarf("miniHilfe", SCHALTER_AZUBI.miniHilfe)) teile.push(frei > 0 ? `Hilfe-Knopf im Mini-Ticket (${frei} frei)` : "Hilfe-Knopf im Mini-Ticket (Vorrat leer, kostet Sterne)");
    else teile.push("kein Hilfe-Knopf");
    if (stufeDarf("anker", SCHALTER_AZUBI.anker)) teile.push("Lernanker nach der Antwort");
    if (stufeDarf("training", SCHALTER_AZUBI.training)) teile.push("geführte Simulation im Trainingsbereich");
    return teile.join(" · ");
  }

  /* Der sichtbare Hinweis: welche Stufe gilt und was sie freischaltet.
     Der Inhalt ist der Satz aus Spiel.stufe (hilfeKurz) – hier steht nur die Überschrift davor. */
  function freigabeText(){
    const d = stufeDef();
    const kern = String(hilfeKurz() || "").replace(/\.\s*$/, "");
    return `Stufe ${d.rang} von 4 · ${d.name} – ${kern}.`;
  }

  /* ---------- Lernstand: fällig zuerst, dann was noch wackelt ---------- */
  const lernmotor = () => { try { return typeof L !== "undefined" && L ? L : null; } catch (e) { return null; } };

  /* Fällige Fertigkeiten des Labors – derselbe Filter, den Leiste und Postfach benutzen. */
  function faelligeIds(){
    const l = lernmotor();
    if (!l || typeof l.faelligeIds !== "function") return [];
    try {
      const ids = l.faelligeIds(id => String(id).startsWith("lab."));
      return Array.isArray(ids) ? ids.slice() : [];
    } catch (e) { return []; }
  }

  /* Schwach = schon angefasst, aber noch nicht „sicher" (L.box < 3) und nicht ohnehin fällig. */
  function schwacheIds(){
    const l = lernmotor();
    if (!l || !l.SKILLS || typeof l.box !== "function") return [];
    const ids = [];
    try {
      for (const id of Object.keys(l.SKILLS)) {
        if (!String(id).startsWith("lab.")) continue;
        if (typeof l.versucht === "function" && !l.versucht(id)) continue;
        if ((Number(l.box(id)) || 0) >= SICHER_AB) continue;
        if (typeof l.istFaellig === "function" && l.istFaellig(id)) continue;
        ids.push(id);
      }
    } catch (e) { return []; }
    return ids.sort((a, b) => (Number(l.box(a)) || 0) - (Number(l.box(b)) || 0) || (a < b ? -1 : a > b ? 1 : 0));
  }

  /* null heißt „kein Lernmotor geladen" – nicht „nichts fällig". Der Unterschied steht im Abschnitt. */
  function fertigkeiten(){
    if (!lernmotor()) return null;
    const ids = faelligeIds();
    for (const id of schwacheIds()) if (!ids.includes(id)) ids.push(id);
    return ids;
  }

  function skillName(id){
    try {
      if (typeof Spiel !== "undefined" && Spiel.karriere && typeof Spiel.karriere.skillName === "function") {
        const n = Spiel.karriere.skillName(id);
        if (n && n !== id) return String(n);
      }
      if (typeof Spiel !== "undefined" && typeof Spiel.skill === "function") {
        const s = Spiel.skill(id);
        if (s && s.name && s.name !== id) return String(s.name);
      }
    } catch (e) { /* Rückfall unten */ }
    return String(id).replace(/^lab\./, "");
  }

  function box(id){
    const l = lernmotor();
    if (l && typeof l.box === "function") {
      try { const b = Number(l.box(id)); if (isFinite(b)) return Math.max(0, Math.min(5, Math.round(b))); } catch (e) { /* Rückfall unten */ }
    }
    return 0;
  }

  function boxName(id){
    const l = lernmotor();
    if (l && typeof l.stufeName === "function") {
      try { const n = l.stufeName(id); if (n) return String(n); } catch (e) { /* Rückfall unten */ }
    }
    return "neu";
  }

  /* ---------- Die zwei Wege aus einer Zeile ---------- */
  function melden(text){
    if (typeof UI !== "undefined" && typeof UI.toast === "function") UI.toast(text, "info");
  }

  /* Üben bleibt der bestehende Weg der Karriere: Mini-Ticket oder generierter Auftrag. */
  function ueben(skill){
    let r = null;
    try {
      if (typeof Spiel !== "undefined" && Spiel.karriere && typeof Spiel.karriere.training === "function") r = Spiel.karriere.training(skill);
    } catch (e) { r = null; }
    if (!r) { melden("Für diese Fertigkeit gibt es gerade kein passendes Training."); return; }
    if (r.art === "ticket" && r.inst && r.inst.iid != null) {
      if (typeof UI !== "undefined" && UI.spiel && typeof UI.spiel.oeffnen === "function") UI.spiel.oeffnen(r.inst.iid);
      else melden("Der Auftrag steht im Postfach.");
      return;
    }
    if (r.art === "mini") {
      const dialog = typeof UI !== "undefined" && UI.karriere && typeof UI.karriere.miniDialog === "function" ? UI.karriere.miniDialog : null;
      if (dialog && typeof UI.toast === "function") UI.toast("Ein Mini-Ticket wartet in der Leiste – oder direkt hier.", "info", {aktion: {text: "Jetzt lösen", fn: () => dialog()}});
      else melden("Ein Mini-Ticket wartet in der Leiste.");
      return;
    }
    melden(r.grund || "Für diese Fertigkeit gibt es gerade kein passendes Training.");
  }

  function nachschlagen(skill){
    if (typeof UI !== "undefined" && UI.wiki && typeof UI.wiki.oeffnen === "function") { UI.wiki.oeffnen(skill); return; }
    melden("Das Wiki ist gerade nicht erreichbar.");
  }

  function einstellungen(){
    if (typeof UI !== "undefined" && UI.app && typeof UI.app.einstellungen === "function") UI.app.einstellungen();
  }

  /* ---------- Der Abschnitt ---------- */
  function zeile(id, kurz){
    const name = skillName(id), fach = box(id);
    return h("div", {class: "lh-zeile", "data-skill": id},
      h("div", {class: "lh-text"},
        h("b", {class: "lh-name"}, name),
        h("small", {class: "lh-box"}, `Leitner-Stufe ${fach} von 5 · ${boxName(id)}`),
        h("small", {class: "lh-hilfe"}, "Hilfe hier: " + kurz)),
      h("div", {class: "lh-knoepfe"},
        h("button", {type: "button", class: "knopf klein primaer lh-ueben", title: `Üben: ${name}`, onclick: () => ueben(id)}, "Üben"),
        h("button", {type: "button", class: "knopf klein geist lh-wiki", title: `Im Wiki nachschlagen: ${name}`, onclick: () => nachschlagen(id)}, "Wiki")));
  }

  /* Baut den Abschnitt in einen vorhandenen Container. Doppelt aufrufbar, wirft nie,
     und ohne Container passiert nichts (Rückgabe null). */
  function abschnitt(container){
    if (!container || typeof container.append !== "function") return null;
    if (typeof container.querySelectorAll === "function") {
      for (const alt of Array.from(container.querySelectorAll(".lh-abschnitt"))) if (alt && typeof alt.remove === "function") alt.remove();
    }
    const d = stufeDef(), ids = fertigkeiten(), kurz = hilfeKurz();
    const gezeigt = ids ? ids.slice(0, MAX_ZEILEN) : [];
    const rest = ids ? ids.length - gezeigt.length : 0;
    const kasten = h("section", {class: "lh-abschnitt", "data-lh-stufe": d.id},
      h("div", {class: "lh-kopf"},
        h("h3", {}, "Hilfe und Übung"),
        h("p", {class: "lh-stufe"}, freigabeText()),
        h("p", {class: "lh-hinweis"}, "Der Bildungsstand ist deine Voreinstellung und ändert sich nie von selbst – er steuert Vorschläge, Werkzeugleiter, Hilfe-Knopf und Trainingsbereich. Üben und Nachschlagen sind immer frei."),
        h("button", {type: "button", class: "knopf klein geist lh-einstellungen", onclick: () => einstellungen()}, "Bildungsstand ändern")),
      ids === null
        ? h("p", {class: "lh-leer"}, "Der Lernmotor ist in dieser Fassung nicht geladen – Hilfe und Wiki bleiben trotzdem offen.")
        : gezeigt.length
          ? h("div", {class: "lh-zeilen"}, gezeigt.map(id => zeile(id, kurz)))
          : h("p", {class: "lh-leer"}, "Gerade ist nichts fällig und nichts wackelt – gute Zeit für ein Ticket aus dem Postfach oder eine Simulation im Trainingsbereich."),
      rest > 0 ? h("p", {class: "lh-fuss"}, `… und ${rest} weitere ${rest === 1 ? "Fertigkeit" : "Fertigkeiten"} – die Kompetenzkarte zeigt alle.`) : null,
      ids === null ? null : h("p", {class: "lh-fuss"}, "Fällig zuerst, dann was noch wackelt. „Üben“ nimmt den bestehenden Weg (Mini-Ticket oder Auftrag)."));
    container.append(kasten);
    return kasten;
  }

  /* ---------- Eigener Weg in die Ansicht (karriere.js bleibt unberührt) ---------- */
  function einhaengen(){
    if (typeof UI === "undefined" || !UI.app || typeof UI.app.registrieren !== "function") return null;
    const vorhanden = UI.karriere && typeof UI.karriere.lernstandAnsicht === "function" ? UI.karriere.lernstandAnsicht : null;
    const zeigen = c => {
      /* Erst die Lernstand-Ansicht, dann der Abschnitt. Scheitert die Ansicht, steht der Abschnitt
         trotzdem – und der Fehler steht im Protokoll statt still zu verschwinden. */
      if (vorhanden) { try { vorhanden(c); } catch (e) { console.error("Lernstand", e); } }
      abschnitt(c);
    };
    const def = {titel: "Lernstand", symbol: "lernstand", zeigen, wieder: zeigen, zaehler: () => faelligeIds().length};
    UI.app.registrieren("lernstand", def);
    return def;
  }

  /* Sicherheitsnetz: wird die Ansicht ohne diesen Haken gebaut (andere Ladereihenfolge), reicht
     der Bus den Abschnitt nach. Angehängt wird nur der eigene Abschnitt, nichts Fremdes.
     Wichtig ist der Selektor `.ansicht[...]`: der Andock-Knopf trägt dasselbe data-ansicht und
     steht im DOM davor – ohne `.ansicht` landete der Abschnitt im Reiter statt in der Ansicht. */
  function nachreichen(){
    if (typeof document === "undefined" || typeof document.querySelector !== "function") return;
    const c = document.querySelector('.ansicht[data-ansicht="lernstand"]');
    if (!c) return;
    if (typeof c.querySelector === "function" && c.querySelector(".lh-abschnitt")) return;
    abschnitt(c);
  }

  return {abschnitt, einhaengen, nachreichen, hilfeKurz, freigabeText, fertigkeiten, faelligeIds, MAX_ZEILEN};
})();

/* Beim Laden anmelden – app.js und karriere.js werden dafür nicht angefasst. */
if (typeof UI !== "undefined") {
  (UI.startHaken ||= []).push(() => UI.lernstandHilfe.einhaengen());
  if (typeof Bus !== "undefined" && Bus && typeof Bus.an === "function") {
    Bus.an("ansicht", name => { if (name === "lernstand") UI.lernstandHilfe.nachreichen(); });
  }
}
