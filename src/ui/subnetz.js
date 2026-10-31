"use strict";
/* ---------- Abteilung „Subnetting": die Ansicht `subnetz` (Entwurf Runde 7 § 1, § 2.3, § 4) ----------
   Eine eigene Abteilung mit vier Registern – Lehrpfad, Werkzeuge, Üben & Spielen, Formelsammlung.
   Der Kopf trägt Titel, Zweck, Stufenwahl (E · AP1 · AP2, Voreinstellung aus Spiel.einst.niveau),
   Fortschrittsring (sicher/8) und die Zeile „Nächster Schritt".

   Aufgabenverteilung der Runde: Die Ansicht gehört W3 (diese Datei + src/stil/subnetz.css). Sie rechnet
   NICHTS selbst nach:
     · Rechenkern und Aufgabenmotor: Spiel.subnetz (W1, § 2.1) – prüfen/antwort/fortschritt/modulSetzen.
     · Lehrplan und Texte: DATEN.subnetzLehrplan (W2, § 2.2).
     · Werkzeuge und Lernspiele: UI.subnetzwerkzeuge (W4, § 2.4) – zeichnen()/liste()/spiele.
   Alle drei entstehen parallel. Deshalb greift JEDER Zugriff erst in Funktionen (Ladereihenfolge!),
   und fehlt ein Teil, steht an seiner Stelle eine ruhige Hinweiskarte statt eines Absturzes.

   Bedienung: Register wechseln ohne Ansichtswechsel; ein Klick auf eine Modulkarte öffnet die Lektion
   (Text · visuelle Hilfe · geführtes Beispiel · Übungsrunde · Prüfrunde); Esc führt eine Ebene zurück.
   Verbucht wird ausschließlich über Spiel.subnetz.antwort() und Spiel.subnetz.modulSetzen() – nie über
   `store` direkt. Kein Geld, kein Ruf: Lernen ist hier freiwillig und kostenlos.
   Gestaltung: nur Tokens aus basis.css, Bento-Bausteine .bn-*, eigene Klassen mit Präfix sn-*. */
UI.subnetz = (() => {
  const TABS = [
    {id: "lehrpfad", titel: "Lehrpfad"},
    {id: "werkzeuge", titel: "Werkzeuge"},
    {id: "ueben", titel: "Üben & Spielen"},
    {id: "formeln", titel: "Formelsammlung"},
  ];
  const STUFEN = ["E", "AP1", "AP2"];
  /* Rückfall, falls der Motor einmal ohne ARTEN lädt: genau die elf Aufgabentypen aus § 6. */
  const ARTEN_FALLBACK = [
    {id: "netzid", titel: "Netz-ID bestimmen"},
    {id: "broadcast", titel: "Broadcast bestimmen"},
    {id: "hosts", titel: "Nutzbare Hosts"},
    {id: "maske", titel: "Maske und Präfix"},
    {id: "block", titel: "Blockgröße und Raster"},
    {id: "subnetze", titel: "Netze schneiden"},
    {id: "vlsm", titel: "Adressplan (VLSM)"},
    {id: "zusammenfassen", titel: "Zusammenfassen"},
    {id: "vlan-port", titel: "VLAN am Port"},
    {id: "vlan-erreichbar", titel: "Gleiches VLAN?"},
    {id: "trunk", titel: "Trunk und Tagging"},
  ];
  /* Werkzeug → passender Aufgabentyp für „Aufgabe dazu" (§ 7/§ 6). */
  const TOOL_ART = {bitlabor: "maske", maskenleiste: "maske", blocklineal: "block", rechner: "netzid", vlsm: "vlsm", vlan: "vlan-port"};
  const STATUS_TEXT = {neu: "neu", gelesen: "gelesen", geuebt: "geübt", sicher: "sicher"};
  const STATUS_CHIP = {neu: "", gelesen: "iris", geuebt: "warn", sicher: "ok"};

  /* Zustand dieser Ansicht. Er lebt im Modul, damit er beim Wiederbetreten erhalten bleibt:
     gewähltes Register, offene Lektion (und eine laufende Runde). */
  let flaeche = null;
  let register = "lehrpfad";
  let offeneLektion = null;
  let stufe = null;
  let runde = null;
  let werkzeugOffen = null;
  let spielOffen = null;
  let startWerkzeug = null;
  let liveEl = null;
  let meldung = null;
  let fokusZiel = null;        /* Fokus nach dem nächsten Zeichnen: Selektor oder Funktion (B2) */
  let generatorFehler = null;  /* sichtbarer Hinweis, wenn der Motor für die Auswahl keine Aufgabe liefert (S8) */
  let seedZaehler = 1;
  let montagen = [];
  let abraeumer = [];

  /* ---------- Defensive Zugriffe (alles erst in Funktionen, nie beim Laden) ---------- */
  const liste = x => Array.isArray(x) ? x : [];
  const text = x => x == null ? "" : String(x);
  const hatFunktion = (obj, name) => !!obj && typeof obj[name] === "function";
  function spielMotor(){
    try { return (typeof Spiel !== "undefined" && Spiel && Spiel.subnetz) || null; } catch (e) { return null; }
  }
  function lehrplan(){
    try {
      const d = (typeof DATEN !== "undefined" && DATEN) || null;
      const p = d && d.subnetzLehrplan;
      return p && typeof p === "object" ? p : null;
    } catch (e) { return null; }
  }
  function moduleListe(){ return liste((lehrplan() || {}).module); }
  function werkzeugApi(){
    try {
      const u = (typeof UI !== "undefined" && UI && UI.subnetzwerkzeuge) || null;
      return u && typeof u === "object" ? u : null;
    } catch (e) { return null; }
  }
  function werkzeugListe(){
    const a = werkzeugApi();
    try { return a && hatFunktion(a, "liste") ? liste(a.liste()) : []; } catch (e) { console.error("Subnetting: Werkzeugliste", e); return []; }
  }
  function spieleApi(){
    const a = werkzeugApi();
    return a && a.spiele && typeof a.spiele === "object" ? a.spiele : null;
  }
  function spieleListe(){
    const s = spieleApi();
    try { return s && hatFunktion(s, "liste") ? liste(s.liste()) : []; } catch (e) { console.error("Subnetting: Spieleliste", e); return []; }
  }
  function feldWert(el, rueckfall){
    try { if (el && el.value != null && el.value !== "") return String(el.value); } catch (e) { /* Rückfall */ }
    return rueckfall;
  }
  function seed(){
    const uhr = (typeof Date !== "undefined" && Date.now) ? Date.now() : 0;
    return (uhr + (seedZaehler++ * 2654435761)) >>> 0;
  }
  function stufeJetzt(){
    if (stufe && STUFEN.includes(stufe)) return stufe;
    try {
      const n = (typeof Spiel !== "undefined" && Spiel && Spiel.einst) ? Spiel.einst.niveau : null;
      if (STUFEN.includes(n)) return n;
    } catch (e) { /* Rückfall */ }
    return "E";
  }
  function symbol(name, px){
    try { return (typeof UI !== "undefined" && hatFunktion(UI, "symbol")) ? UI.symbol(name, px) : null; } catch (e) { return null; }
  }

  /* ---------- Fortschritt (nur lesen aus Spiel.subnetz) ---------- */
  function fortschritt(){
    const m = spielMotor();
    try {
      if (m && hatFunktion(m, "fortschritt")) {
        const f = m.fortschritt();
        if (f && typeof f === "object") return f;
      }
    } catch (e) { console.error("Subnetting: Fortschritt", e); }
    return {module: {}, spiele: {}, gesamt: {richtig: 0, falsch: 0, serie: 0}};
  }
  function statusIn(stand, id){
    const e = stand && stand.module && stand.module[id];
    return e && STATUS_TEXT[e.status] ? e.status : "neu";
  }
  function modulSetzen(id, status){
    const m = spielMotor();
    try {
      if (m && hatFunktion(m, "modulSetzen")) return m.modulSetzen(id, status);
    } catch (e) { console.error("Subnetting: Modulstatus", e); }
    return null;
  }

  /* ---------- Gemeinsame Bausteine ---------- */
  function hinweisKarte(titel, inhalt){
    return h("section", {class: "bn-leer sn-leer"},
      h("span", {class: "bn-kicker"}, "Hinweis"),
      h("h3", {class: "bn-titel"}, text(titel)),
      h("p", {class: "bn-lead"}, text(inhalt)),
      h("p", {class: "bn-meta"}, "Die Abteilung bleibt ruhig stehen – nichts geht verloren, bis die Teile geladen sind."));
  }
  function feldbereich(bschrift, feld){
    return h("label", {class: "sn-feldbereich"}, h("span", {class: "bn-kicker"}, bschrift), feld);
  }
  function chip(klasse, inhalt){
    return h("span", {class: "bn-chip" + (klasse ? " " + klasse : "")}, text(inhalt));
  }
  function melden(inhalt){ meldung = inhalt == null ? null : String(inhalt); liveMelden(meldung); }
  function liveMelden(inhalt){
    if (!liveEl) return;
    try { liveEl.textContent = inhalt == null ? "" : String(inhalt); } catch (e) { /* Anzeige darf nie stören */ }
  }

  /* ---------- Montagen: Werkzeuge und Spiele werden nach dem Einhängen gezeichnet ----------
     W4s Flächen dürfen das DOM messen; deshalb erst einhängen (App-Rahmen macht das), dann zeichnen.
     Jede Fläche liefert {zerstoeren()} – beim Verlassen und vor jedem Neuzeichnen wird sie geräumt. */
  function montageMerken(container, art, opts){ montagen.push({container, art, opts: opts || {}, spiel: false}); }
  function spielMerken(container, id, opts){ montagen.push({container, art: id, opts: opts || {}, spiel: true}); }
  function montagenAusfuehren(){
    const warteschlange = montagen;
    montagen = [];
    for (const m of warteschlange) {
      try {
        const api = werkzeugApi();
        if (!api) throw new Error("UI.subnetzwerkzeuge ist nicht geladen");
        const griff = m.spiel
          ? (spieleApi() && hatFunktion(spieleApi(), "starten") ? spieleApi().starten(m.container, m.art, m.opts) : null)
          : (hatFunktion(api, "zeichnen") ? api.zeichnen(m.container, m.art, m.opts) : null);
        if (m.spiel && !griff) throw new Error("UI.subnetzwerkzeuge.spiele.starten fehlt");
        if (!m.spiel && !griff) throw new Error("UI.subnetzwerkzeuge.zeichnen fehlt");
        if (griff && typeof griff.zerstoeren === "function") abraeumer.push(griff);
      } catch (e) {
        console.error("Subnetting: Fläche", e);
        try { m.container.replaceChildren(h("p", {class: "bn-meta"}, "Diese Fläche ist in dieser Fassung noch nicht geladen.")); } catch (ignoriert) { /* egal */ }
      }
    }
  }
  function aufraeumen(){
    for (const griff of abraeumer) {
      try { griff.zerstoeren(); } catch (e) { console.error("Subnetting: Fläche räumen", e); }
    }
    abraeumer = [];
    montagen = [];
  }

  /* ---------- Kopf ---------- */
  function naechstesModul(stand, module){
    return module.find(m => statusIn(stand, m.id) !== "sicher") || null;
  }
  function naechsterText(stand, module){
    if (!lehrplan()) return "Der Lehrplan wird geladen …";
    if (!module.length) return "Noch keine Module eingetragen.";
    const m = naechstesModul(stand, module);
    if (!m) return "Alle Module sicher – jetzt die Prüfungsfälle im letzten Modul wiederholen.";
    return `Lektion ${String(Number(m.nr) || 0).padStart(2, "0")}: ${text(m.titel)} · Stufe ${text(m.stufe) || "E"}`;
  }
  function kopf(stand, module){
    const sicher = module.filter(m => statusIn(stand, m.id) === "sicher").length;
    const prozent = module.length ? Math.round(sicher / module.length * 100) : 0;
    return h("header", {class: "sn-kopf"},
      h("div", {class: "sn-kopf-text"},
        h("span", {class: "bn-kicker"}, "Abteilung · Verstehen und üben"),
        h("h2", {class: "sn-titel"}, "Subnetting"),
        h("p", {class: "sn-zweck"}, "Vom Bit bis zum Adressplan: Rechnen verstehen, mit Werkzeugen ausprobieren und in eigenen Runden sichern – freiwillig und ohne Kosten.")),
      h("div", {class: "sn-kopf-rechts"},
        h("label", {class: "sn-stufe"},
          h("span", {class: "bn-kicker"}, "Stufe"),
          h("select", {class: "sn-stufe-wahl", "aria-label": "Lernstufe", onchange: e => stufeSetzen(feldWert(e && e.currentTarget, stufeJetzt()))},
            STUFEN.map(s => h("option", {value: s, selected: s === stufeJetzt()}, s)))),
        h("span", {class: "sn-ring", role: "img", "aria-label": `${sicher} von ${module.length} Modulen sicher`,
          style: {"--sn-p": prozent}},
          h("span", {class: "sn-ring-wert"}, `${sicher}/${module.length}`)),
        h("div", {class: "sn-naechster"},
          h("span", {class: "bn-kicker"}, "Nächster Schritt"),
          h("span", {class: "sn-naechster-text"}, naechsterText(stand, module)))));
  }

  /* ---------- Register (vollständiges Tablist-Muster: S5) ---------- */
  function registerLeiste(){
    return h("div", {class: "sn-register", role: "tablist", "aria-label": "Register der Abteilung"},
      TABS.map(t => {
        const an = t.id === register;
        return h("button", {type: "button", role: "tab", class: "sn-register-knopf",
          id: "sn-tab-" + t.id, "data-register": t.id, "aria-selected": String(an),
          "aria-controls": "sn-panel-" + t.id, tabindex: an ? "0" : "-1",
          onclick: () => registerWechseln(t.id),
          onkeydown: ereignis => tabTaste(ereignis, t.id)}, t.titel);
      }));
  }
  /* Pfeil-/Pos1-/Ende-Tasten wie im ARIA-Tablist-Muster: Auswahl folgt dem Fokus. */
  function tabTaste(ereignis, id){
    if (!ereignis) return;
    const tasten = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!tasten.includes(ereignis.key)) return;
    if (typeof ereignis.preventDefault === "function") ereignis.preventDefault();
    const i = TABS.findIndex(t => t.id === id);
    const n = TABS.length;
    const j = ereignis.key === "Home" ? 0 : ereignis.key === "End" ? n - 1
      : ereignis.key === "ArrowRight" ? (i + 1) % n : (i - 1 + n) % n;
    if (TABS[j].id === id) { fokusSetzen(fokusRegister(id)); zeichnen(); return; }
    registerWechseln(TABS[j].id);
  }
  function registerWechseln(id){
    if (!TABS.some(t => t.id === id)) return;
    /* Klick auf das schon offene Register führt aus der Lektion zurück zur Übersicht. */
    if (id === register && id === "lehrpfad" && offeneLektion) {
      offeneLektion = null;
      fokusSetzen(fokusRegister("lehrpfad"));
      zeichnen();
      return;
    }
    register = id;
    fokusSetzen(fokusRegister(id));
    zeichnen();
  }
  function registerSetzen(id){ if (TABS.some(t => t.id === id)) register = id; }

  /* ---------- Lehrpfad: 8 Modulkarten ---------- */
  function lehrpfad(stand){
    if (offeneLektion) {
      const modul = moduleListe().find(m => m.id === offeneLektion);
      if (modul) return [lektion(modul, stand)];
      offeneLektion = null;
    }
    if (!lehrplan()) return [hinweisKarte("Lehrpfad", "Der Lehrplan ist noch nicht geladen. Sobald die Inhalte da sind, stehen hier acht Module in drei Stufen.")];
    if (!moduleListe().length) return [hinweisKarte("Lehrpfad", "Der Lehrplan enthält noch keine Module.")];
    return [h("div", {class: "bn-raster"}, moduleListe().map(m => modulKarte(m, statusIn(stand, m.id))))];
  }
  function modulKarte(m, status){
    return h("button", {type: "button", class: "bn-k sn-modul bn-s4", "data-modul": text(m.id), "data-status": status,
      onclick: () => lektionOeffnen(m.id)},
      h("span", {class: "sn-modul-kopf"},
        h("span", {class: "sn-modul-nr"}, String(Number(m.nr) || 0).padStart(2, "0")),
        chip("", text(m.stufe) || "E"),
        chip(STATUS_CHIP[status] || "", STATUS_TEXT[status] || "neu")),
      h("span", {class: "sn-modul-titel"}, text(m.titel)),
      h("span", {class: "sn-modul-lead"}, text(m.lead)),
      h("span", {class: "sn-modul-fuss"},
        h("span", {class: "sn-modul-dauer"}, m.dauerMin ? `${text(m.dauerMin)} min` : "Lektion"),
        h("span", {class: "sn-modul-weg"}, "Lektion öffnen")));
  }
  function lektionOeffnen(id){
    if (!moduleListe().some(m => m.id === id)) return;
    offeneLektion = id;
    registerSetzen("lehrpfad");
    /* Beim ersten Öffnen gilt das Modul als gelesen – „sicher" wird es erst nach der Prüfrunde. */
    if (statusIn(fortschritt(), id) === "neu") modulSetzen(id, "gelesen");
    fokusSetzen(".sn-zurueck");
    zeichnen();
  }

  /* ---------- Lektion ---------- */
  function lektion(m, stand){
    const status = statusIn(stand, m.id);
    const visual = h("div", {class: "sn-visual"});
    if (m.visuell && m.visuell.art) montageMerken(visual, m.visuell.art, {preset: m.visuell.preset, kompakt: true, niveau: stufeJetzt()});
    else visual.append(h("p", {class: "bn-meta"}, "Für dieses Modul ist keine visuelle Hilfe hinterlegt."));

    const kinder = [
      h("header", {class: "sn-lektion-kopf"},
        h("div", {class: "sn-kopf-text"},
          h("span", {class: "bn-kicker"}, `Lektion ${String(Number(m.nr) || 0).padStart(2, "0")} · Stufe ${text(m.stufe) || "E"}`),
          h("h2", {class: "sn-lektion-titel"}, text(m.titel)),
          m.lead ? h("p", {class: "sn-zweck"}, text(m.lead)) : null),
        h("div", {class: "sn-knoepfe"},
          chip(STATUS_CHIP[status] || "", STATUS_TEXT[status] || "neu"),
          h("button", {type: "button", class: "knopf geist sn-zurueck",
            onclick: () => { offeneLektion = null; fokusSetzen(fokusRegister("lehrpfad")); zeichnen(); }}, "Zurück zum Lehrpfad"))),
      h("div", {class: "bn-raster"},
        h("section", {class: "bn-k bn-s6"},
          h("header", {class: "bn-kopf"}, h("div", {}, h("span", {class: "bn-kicker"}, "Kern"), h("h3", {class: "bn-titel"}, "Worum es geht"))),
          h("div", {class: "sn-kern"}, liste(m.kern).map(absatz => h("p", {}, text(absatz)))),
          m.merksatz ? h("p", {class: "sn-merksatz"}, text(m.merksatz)) : null),
        h("aside", {class: "bn-k bn-s6"},
          h("header", {class: "bn-kopf"}, h("div", {}, h("span", {class: "bn-kicker"}, "Visuelle Hilfe"), h("h3", {class: "bn-titel"}, "Sehen, wie es rechnet"))),
          visual,
          h("p", {class: "bn-meta"}, m.visuell && m.visuell.art
            ? "Das Werkzeug rechnet mit denselben Regeln wie die Übungen – du kannst daran drehen und klicken."
            : "Ohne visuelle Hilfe bleibt der Rechenweg im Text."),
          m.verweise ? verweise(m.verweise) : null)),
    ];
    for (const b of liste(m.beispiel)) kinder.push(beispielBlock(b));
    kinder.push(uebungsBlock(m, stand));
    return h("div", {class: "sn-lektion"}, ...kinder);
  }

  function verweise(v){
    const knoepfe = [];
    if (v.wiki) knoepfe.push(h("button", {type: "button", class: "knopf geist", onclick: () => wikiOeffnen(v.wiki)}, "Im Wiki nachschlagen"));
    if (v.werkzeug) knoepfe.push(h("button", {type: "button", class: "knopf geist", onclick: () => werkzeugOeffnen(v.werkzeug)}, "Werkzeug dazu"));
    knoepfe.push(h("button", {type: "button", class: "knopf geist", onclick: () => ansichtWechseln("labor")}, "Im Labor anwenden"));
    knoepfe.push(h("button", {type: "button", class: "knopf geist", onclick: () => ansichtWechseln("training")}, "Ins Training"));
    return h("div", {class: "sn-verweise"}, knoepfe);
  }
  function ansichtWechseln(name){
    try { if (UI.app && hatFunktion(UI.app, "ansicht")) UI.app.ansicht(name); } catch (e) { console.error("Subnetting: Ansicht", e); }
  }
  function wikiOeffnen(skill){
    try {
      if (UI.wiki && hatFunktion(UI.wiki, "oeffnen")) { UI.wiki.oeffnen(skill); return; }
    } catch (e) { console.error("Subnetting: Wiki", e); }
    ansichtWechseln("wiki");
  }

  /* Geführtes Beispiel: alle Schritte stehen im DOM (versteckt), „Schritt zeigen" deckt einen nach dem
     anderen auf. Wer nicht klickt, sieht die Aufgabe und kann selbst rechnen. */
  function beispielBlock(b){
    const schritte = liste(b.schritte);
    const offen = {n: 0};
    const zaehler = h("span", {class: "bn-chip"}, `0 / ${schritte.length} Schritte`);
    const listeEl = h("div", {class: "sn-beispiel-schritte"},
      schritte.map((s, i) => h("div", {class: "sn-beispiel-schritt", hidden: true},
        h("span", {class: "sn-beispiel-schritt-titel"}, text(s.titel) || `Schritt ${i + 1}`),
        h("span", {}, text(s.text)),
        s.ergebnis ? h("b", {}, "→ " + text(s.ergebnis)) : null)));
    const ergebnis = h("p", {class: "sn-beispiel-ergebnis", hidden: true}, b.ergebnis ? "Ergebnis: " + text(b.ergebnis) : "");
    const knopf = h("button", {type: "button", class: "knopf", onclick: () => schrittZeigen()}, "Schritt zeigen");
    const schrittZeigen = () => {
      if (offen.n >= schritte.length) return;
      const zeile = listeEl.children[offen.n];
      if (zeile && typeof zeile.removeAttribute === "function") zeile.removeAttribute("hidden");
      offen.n++;
      zaehler.textContent = `${offen.n} / ${schritte.length} Schritte`;
      if (offen.n >= schritte.length) {
        if (typeof ergebnis.removeAttribute === "function") ergebnis.removeAttribute("hidden");
        knopf.setAttribute("hidden", "");
      }
    };
    return h("section", {class: "bn-k sn-beispiel"},
      h("header", {class: "bn-kopf"},
        h("div", {}, h("span", {class: "bn-kicker"}, "Geführtes Beispiel"),
          h("h3", {class: "bn-titel"}, text(b.titel) || "Vorgerechnet")),
        zaehler),
      b.aufgabe ? h("p", {class: "sn-beispiel-aufgabe"}, text(b.aufgabe)) : null,
      listeEl, ergebnis,
      h("div", {class: "sn-beispiel-knoepfe"}, knopf));
  }

  /* Übungs- und Prüfrunde eines Moduls: Knöpfe oder die laufende Runde. */
  function uebungsBlock(m, stand){
    const aktiv = runde && (runde.kontext === "lektion" || runde.kontext === "pruefung") && runde.modulId === m.id ? runde : null;
    const kinder = [];
    if (aktiv) {
      kinder.push(rundeInhalt(aktiv, stand));
    } else if (!spielMotor()) {
      kinder.push(hinweisKarte("Üben und prüfen", "Der Übungsmotor ist noch nicht geladen – die Runden erscheinen, sobald er bereitsteht."));
    } else {
      const uebung = m.uebung || {}, pruefung = m.pruefung || {};
      if (generatorFehler) kinder.push(h("p", {class: "sn-hinweis", tabindex: "-1"}, generatorFehler));
      kinder.push(h("div", {class: "sn-knoepfe"},
        h("button", {type: "button", class: "knopf primaer",
          onclick: () => rundeStarten({kontext: "lektion", modulId: m.id, titel: `Übungsrunde · ${text(m.titel)}`,
            arten: liste(uebung.arten), niveau: uebung.niveau || stufeJetzt(), anzahl: Number(uebung.anzahl) || 4, bestehen: Number(uebung.bestehen) || null})},
          "Übungsrunde starten"),
        h("button", {type: "button", class: "knopf",
          onclick: () => rundeStarten({kontext: "pruefung", modulId: m.id, titel: `Prüfrunde · ${text(m.titel)}`,
            arten: liste(pruefung.arten), niveau: pruefung.niveau || stufeJetzt(), anzahl: Number(pruefung.anzahl) || 4,
            bestehen: Number(pruefung.bestehen) || Math.max(1, Math.ceil((Number(pruefung.anzahl) || 4) * 0.75))})},
          "Prüfrunde starten")));
      kinder.push(h("p", {class: "bn-meta"}, "Die Prüfrunde schaltet das Modul auf „sicher“ – erst danach gilt es als abgeschlossen. Fehler sind kostenlos."));
    }
    return h("section", {class: "bn-k"},
      h("header", {class: "bn-kopf"},
        h("div", {}, h("span", {class: "bn-kicker"}, "Üben und prüfen"),
          h("h3", {class: "bn-titel"}, "Erst üben, dann sichern")),
        chip("", STATUS_TEXT[statusIn(stand, m.id)] || "neu")),
      kinder);
  }

  /* ---------- Runde ---------- */
  function rundeStarten(cfg){
    const m = spielMotor();
    if (!m) { melden("Der Übungsmotor ist noch nicht geladen."); return; }
    const anzahl = Math.max(1, Math.round(Number(cfg.anzahl) || 4));
    const niveau = STUFEN.includes(cfg.niveau) ? cfg.niveau : stufeJetzt();
    const arten = liste(cfg.arten).filter(a => typeof a === "string" && a);
    let aufgaben = [];
    try {
      if (hatFunktion(m, "satz")) {
        aufgaben = liste(m.satz(Object.assign({niveau, anzahl, seed: seed()}, arten.length ? {arten} : {})));
      }
      if (!aufgaben.length && hatFunktion(m, "aufgabe") && arten.length) {
        for (let i = 0; i < anzahl; i++) {
          const a = m.aufgabe({art: arten[i % arten.length], niveau, seed: seed() + i});
          if (a) aufgaben.push(a);
        }
      }
    } catch (e) {
      console.error("Subnetting: Runde", e);
      aufgaben = [];
    }
    if (!aufgaben.length) {
      runde = null;
      generatorFehler = "Für diese Auswahl gibt es gerade keine Aufgabe. Wähle ein anderes Thema oder eine andere Stufe.";
      fokusSetzen(ersterSichtbarerHinweis());
      zeichnen();
      return;
    }
    generatorFehler = null;
    runde = {
      kontext: cfg.kontext || "frei",
      modulId: cfg.modulId || null,
      cfg: {kontext: cfg.kontext || "frei", modulId: cfg.modulId || null, titel: cfg.titel || null,
        arten: arten.slice(), niveau, anzahl, bestehen: cfg.bestehen != null ? cfg.bestehen : null},
      titel: cfg.titel || "Übungsrunde",
      niveau,
      aufgaben,
      index: 0,
      richtig: 0,
      falsch: 0,
      antworten: [],
      beantwortet: null,
      hilfeGezeigt: false,
      hilfeRunde: false,
      bestehen: cfg.bestehen != null ? cfg.bestehen : null,
      ergebnis: null,
    };
    if (cfg.kontext === "werkzeug") registerSetzen("werkzeuge");
    else if (cfg.kontext === "frei") registerSetzen("ueben");
    else registerSetzen("lehrpfad");
    fokusSetzen(erstesEingabe());
    zeichnen();
  }

  /* Kleine visuelle Hilfe zur Aufgabe (W1 liefert aufgabe.visual): dasselbe Werkzeug wie in der Lektion. */
  function visualAufgabe(aufgabe){
    const box = h("div", {class: "sn-visual"});
    montageMerken(box, aufgabe.visual.art, {preset: aufgabe.visual.preset, kompakt: true, niveau: stufeJetzt()});
    return box;
  }

  function rundeInhalt(r, stand){
    if (!r) return null;
    if (r.ergebnis) return ergebnisInhalt(r, stand);
    const aufgabe = r.aufgaben[r.index];
    if (!aufgabe) return null;
    const eingabe = aufgabe.eingabe || {};
    const art = eingabe.art || "zahl";
    const optionen = liste(eingabe.optionen).map(o => (o && typeof o === "object") ? text(o.text) : text(o));
    const beantwortet = r.beantwortet;
    let gewaehlt = null;
    const feld = art === "auswahl" ? null : h("input", {type: "text", class: "sn-feld", autocomplete: "off", spellcheck: "false",
      placeholder: text(eingabe.platzhalter) || (art === "ip" ? "z. B. 192.168.10.64" : art === "maske" ? "z. B. /26 oder 255.255.255.192" : "Zahl"),
      "aria-label": "Antwort",
      onkeydown: e => { if (e && e.key === "Enter") { if (typeof e.preventDefault === "function") e.preventDefault(); pruefen(); } }});
    const auswahl = [];
    if (art === "auswahl" && optionen.length) {
      auswahl.push(h("div", {class: "sn-auswahl", role: "group", "aria-label": "Antwortmöglichkeiten"},
        optionen.map((o, i) => {
          const knopf = h("button", {type: "button", class: "sn-auswahl-knopf", "aria-pressed": "false", "data-option": String(i), onclick: () => {
            gewaehlt = i;
            for (const b of auswahl[0].children) if (b && typeof b.setAttribute === "function") b.setAttribute("aria-pressed", String(b === knopf));
          }}, o);
          return knopf;
        })));
    }
    const hinweisBox = h("p", {class: "sn-hinweis", hidden: true, tabindex: "-1"});
    const knoepfe = [];
    /* Sichtbare Meldung am Feld (S8): kein Neuzeichnen, kein Sprung, Fokus bleibt beim Bedienen. */
    function fehlerZeigen(inhalt){
      hinweisBox.textContent = inhalt;
      if (typeof hinweisBox.removeAttribute === "function") hinweisBox.removeAttribute("hidden");
      liveMelden(inhalt);
      if (art === "auswahl") fokussiere(auswahl[0] && auswahl[0].children[0]);
      else fokussiere(feld);
    }
    function pruefen(){
      if (beantwortet) return;
      let antwort = "";
      if (art === "auswahl") {
        if (gewaehlt == null) { fehlerZeigen("Bitte zuerst eine Antwortmöglichkeit auswählen."); return; }
        antwort = optionen[gewaehlt];
      } else {
        antwort = feldWert(feld, "");
      }
      if (!antwort.trim()) {
        fehlerZeigen("Bitte zuerst eine " + (art === "ip" ? "Adresse" : art === "maske" ? "Maske" : "Zahl") + " eintragen.");
        return;
      }
      let rueck = null;
      try { rueck = spielMotor() && hatFunktion(spielMotor(), "pruefen") ? spielMotor().pruefen(aufgabe, antwort) : null; } catch (e) { console.error("Subnetting: prüfen", e); }
      if (!rueck || typeof rueck !== "object") { fehlerZeigen("Diese Antwort konnte nicht geprüft werden – bitte die Eingabe prüfen."); return; }
      let verbuchung = null;
      try {
        verbuchung = spielMotor() && hatFunktion(spielMotor(), "antwort")
          ? spielMotor().antwort(aufgabe, !!rueck.richtig, {hilfe: !!r.hilfeGezeigt}) : null;
      } catch (e) { console.error("Subnetting: antwort", e); }
      r.beantwortet = {antwort, rueck, verbuchung};
      r.antworten.push({frage: text(aufgabe.frage), richtig: !!rueck.richtig, soll: rueck.soll, angenommen: rueck.angenommen != null ? rueck.angenommen : antwort});
      if (rueck.richtig) r.richtig++; else r.falsch++;
      if (r.hilfeGezeigt) r.hilfeRunde = true;
      r.hilfeGezeigt = false;
      melden(rueck.richtig ? "Richtig. Rechenweg und Erklärung stehen unter der Aufgabe." : "Noch nicht richtig. Der Rechenweg zeigt, wie es geht.");
      fokusSetzen(".sn-rueckmeldung");
      zeichnen();
    }
    knoepfe.push(h("div", {class: "sn-knoepfe"},
      h("button", {type: "button", class: "knopf primaer", onclick: pruefen}, "Prüfen"),
      aufgabe.hinweis ? h("button", {type: "button", class: "knopf geist", onclick: () => {
        r.hilfeGezeigt = true;
        r.hilfeRunde = true;
        hinweisBox.textContent = "Tipp: " + text(aufgabe.hinweis);
        if (typeof hinweisBox.removeAttribute === "function") hinweisBox.removeAttribute("hidden");
      }}, "Hinweis") : null));
    return h("div", {class: "sn-runde", "data-index": String(r.index),
      tabindex: "-1"},
      h("header", {class: "sn-runde-kopf"},
        h("span", {class: "bn-kicker"}, `${r.titel} · Aufgabe ${r.index + 1} von ${r.aufgaben.length}`),
        h("span", {class: "sn-punkte"}, "Richtig ", h("span", {class: "sn-punkte-wert"}, String(r.richtig)))),
      h("div", {class: "sn-aufgabe"},
        liste(aufgabe.lage).length ? h("div", {class: "sn-lage"}, liste(aufgabe.lage).map(z => h("div", {class: "sn-lage-zeile"},
          h("span", {class: "sn-lage-label"}, text(z && z.label)),
          h("span", {class: "sn-lage-wert"}, text(z && z.wert))))) : null,
        h("p", {class: "sn-frage"}, text(aufgabe.frage)),
        beantwortet || !aufgabe.visual || !aufgabe.visual.art ? null : visualAufgabe(aufgabe),
        feld,
        auswahl.length ? auswahl[0] : null,
        beantwortet ? rueckmeldung(r, aufgabe, beantwortet) : null,
        beantwortet ? null : knoepfe[0],
        hinweisBox));
  }

  function rueckmeldung(r, aufgabe, beantwortet){
    const rueck = beantwortet.rueck || {};
    const rechenweg = liste(rueck.rechenweg).length ? liste(rueck.rechenweg) : liste(aufgabe.rechenweg);
    const weiterText = r.index + 1 >= r.aufgaben.length ? "Runde auswerten" : "Nächste Aufgabe";
    return h("div", {class: "sn-rueckmeldung" + (rueck.richtig ? "" : " sn-falsch"), tabindex: "-1"},
      h("p", {class: "sn-rueckmeldung-text"}, rueck.richtig ? "Richtig." : "Noch nicht richtig."),
      rueck.soll != null ? h("p", {class: "sn-soll"},
        "Soll: " + text(typeof rueck.soll === "object" ? JSON.stringify(rueck.soll) : rueck.soll)
        + " · Deine Antwort: " + text(beantwortet.angenommen || beantwortet.antwort)) : null,
      rechenweg.length ? h("ol", {class: "sn-rechenweg"}, rechenweg.map(s => h("li", {class: "sn-rechenweg-schritt"},
        h("b", {}, (s && s.titel ? text(s.titel) + ": " : "") + text(s && s.text)),
        s && s.ergebnis ? h("span", {}, " → " + text(s.ergebnis)) : null))) : null,
      rueck.erklaerung ? h("p", {class: "sn-erklaerung"}, text(rueck.erklaerung)) : null,
      rueck.hinweis ? h("p", {class: "sn-hinweis"}, "Tipp: " + text(rueck.hinweis)) : null,
      h("div", {class: "sn-knoepfe"},
        h("button", {type: "button", class: "knopf primaer", onclick: () => weiter()}, weiterText)));
  }

  function weiter(){
    if (!runde) return;
    runde.beantwortet = null;
    runde.index++;
    if (runde.index >= runde.aufgaben.length) rundeAbschliessen();
    fokusSetzen(runde.ergebnis ? ".sn-ergebnis" : erstesEingabe());
    zeichnen();
  }
  function rundeAbschliessen(){
    const r = runde;
    if (!r || r.ergebnis) return;
    const gesamt = r.aufgaben.length;
    const ohneHilfe = !r.hilfeRunde;
    const bestanden = r.bestehen != null ? r.richtig >= r.bestehen : r.richtig >= Math.ceil(gesamt * 0.75);
    r.ergebnis = {richtig: r.richtig, falsch: r.falsch, gesamt, bestanden, ohneHilfe, sicher: bestanden && ohneHilfe, punkte: r.richtig};
    /* Vertrag § 2.1: „sicher“ nur mit bestandener Prüfrunde OHNE Hilfe. Mit Hilfe bleibt es bei „geübt“. */
    if (r.modulId && r.kontext === "pruefung") {
      if (bestanden && ohneHilfe) modulSetzen(r.modulId, "sicher");
      else if (bestanden && !ohneHilfe) modulSetzen(r.modulId, "geuebt");
    }
    if (r.modulId && r.kontext === "lektion" && r.richtig > 0 && statusIn(fortschritt(), r.modulId) !== "sicher") modulSetzen(r.modulId, "geuebt");
    melden(`Runde ausgewertet: ${r.richtig} von ${gesamt} richtig.`);
    if (r.modulId && r.kontext === "pruefung") melden(bestanden && ohneHilfe
      ? `Prüfrunde bestanden – Modul auf „sicher“ gesetzt (${r.richtig} von ${gesamt}).`
      : bestanden
        ? `Prüfrunde mit Hilfe bestanden (${r.richtig} von ${gesamt}) – noch nicht sicher. Ohne Hinweis wiederholen.`
        : `Prüfrunde noch nicht bestanden (${r.richtig} von ${gesamt}) – Rechenweg ansehen und erneut versuchen.`);
  }

  function ergebnisInhalt(r, stand){
    const e = r.ergebnis || {richtig: r.richtig, falsch: r.falsch, gesamt: r.aufgaben.length, bestanden: false};
    const modul = r.modulId ? moduleListe().find(m => m.id === r.modulId) : null;
    const knoepfe = [];
    const nochmal = () => rundeStarten((r.cfg && r.cfg.arten) ? r.cfg : {kontext: "frei", titel: r.titel, niveau: r.niveau, anzahl: r.aufgaben.length});
    if (r.kontext === "frei" || r.kontext === "werkzeug") {
      knoepfe.push(h("button", {type: "button", class: "knopf primaer", onclick: nochmal}, "Neue Runde"));
      knoepfe.push(h("button", {type: "button", class: "knopf geist", onclick: () => {
        runde = null;
        if (r.kontext === "frei") { registerSetzen("ueben"); fokusSetzen(fokusRegister("ueben")); }
        else fokusSetzen(".sn-zurueck");
        zeichnen();
      }}, r.kontext === "frei" ? "Andere Runde zusammenstellen" : "Zurück zum Werkzeug"));
    } else {
      knoepfe.push(h("button", {type: "button", class: "knopf primaer", onclick: nochmal}, r.kontext === "pruefung" ? "Prüfrunde wiederholen" : "Übungsrunde wiederholen"));
      knoepfe.push(h("button", {type: "button", class: "knopf geist", onclick: () => { runde = null; fokusSetzen(".sn-zurueck"); zeichnen(); }}, "Zurück zur Lektion"));
    }
    return h("div", {class: "sn-ergebnis", tabindex: "-1"},
      h("header", {class: "sn-runde-kopf"},
        h("span", {class: "bn-kicker"}, "Ergebnis · " + r.titel),
        h("span", {class: "sn-punkte"}, "Punkte ", h("span", {class: "sn-punkte-wert"}, `${e.richtig} / ${e.gesamt}`))),
      h("p", {class: "sn-ergebnis-wert"}, e.bestanden
        ? (r.kontext === "pruefung" && e.ohneHilfe === false ? "Bestanden – aber mit Hilfe." : "Bestanden.")
        : "Noch nicht bestanden."),
      h("p", {class: "bn-meta"}, e.bestanden
        ? `Du hast ${e.richtig} von ${e.gesamt} Aufgaben richtig – ${e.falsch ? `${e.falsch} Fehler stehen zum Nachlesen unten.` : "ohne Fehler."}`
        : `${e.falsch} von ${e.gesamt} Aufgaben noch einmal ansehen; die Erklärungen stehen unten.`),
      modul && r.kontext === "pruefung" ? h("p", {class: "bn-meta"}, e.bestanden && e.ohneHilfe
        ? `Modul „${text(modul.titel)}“ ist als sicher verbucht.`
        : e.bestanden
          ? `Prüfrunde mit Hilfe bestanden – das Modul bleibt auf „geübt“. Wiederhole sie ohne Hinweis, dann wird es sicher.`
          : `Modul „${text(modul.titel)}“ bleibt auf „geübt“ – die Prüfrunde lässt sich sofort wiederholen.`) : null,
      liste(r.antworten).length ? h("ol", {class: "sn-ergebnis-liste"}, r.antworten.map(a => h("li", {class: "sn-ergebnis-zeile"},
        h("b", {}, a.richtig ? "Richtig" : "Falsch"),
        h("span", {}, text(a.frage)),
        a.soll != null ? h("small", {}, "Soll: " + text(typeof a.soll === "object" ? JSON.stringify(a.soll) : a.soll)) : null))) : null,
      h("div", {class: "sn-knoepfe"}, knoepfe));
  }

  /* ---------- Werkzeuge ---------- */
  function werkzeuge(stand){
    const tools = werkzeugListe();
    if (startWerkzeug) { werkzeugOffen = startWerkzeug; startWerkzeug = null; }
    if (werkzeugOffen) {
      const tool = tools.find(t => t.id === werkzeugOffen) || {id: werkzeugOffen, titel: werkzeugOffen};
      return [werkzeugSeite(tool, stand)];
    }
    if (!werkzeugApi()) return [hinweisKarte("Werkzeuge", "Die interaktiven Werkzeuge werden gerade gebaut. Bis dahin trägt der Lehrpfad die Rechenwege und die Übungsrunden.")];
    if (!tools.length) return [hinweisKarte("Werkzeuge", "Es sind noch keine Werkzeuge eingetragen.")];
    return [h("div", {class: "bn-raster"}, tools.map(t => h("button", {type: "button", class: "bn-k sn-werkzeug bn-s4", "data-werkzeug": text(t.id),
      onclick: () => werkzeugOeffnen(t.id)},
      h("span", {class: "bn-kicker"}, text(t.kicker) || "Werkzeug"),
      h("span", {class: "sn-werkzeug-titel"}, text(t.titel)),
      h("span", {class: "sn-werkzeug-lead"}, text(t.lead)),
      h("span", {class: "sn-modul-fuss"},
        chip("", text(t.stufe) || "E"),
        h("span", {class: "sn-modul-weg"}, "Werkzeug öffnen")))))];
  }
  function werkzeugOeffnen(id){
    werkzeugOffen = id;
    registerSetzen("werkzeuge");
    runde = null;
    fokusSetzen(".sn-zurueck");
    zeichnen();
  }
  function werkzeugSeite(tool, stand){
    const flaecheEl = h("div", {class: "sn-flaeche", "data-werkzeug": text(tool.id)});
    montageMerken(flaecheEl, tool.id, {niveau: stufeJetzt(), onErgebnis: ereignis => werkzeugErgebnis(tool, ereignis)});
    const rundenBlock = runde && runde.kontext === "werkzeug" ? h("section", {class: "bn-k"}, rundeInhalt(runde, stand)) : null;
    return h("div", {class: "sn-werkzeug-seite"},
      h("header", {class: "sn-lektion-kopf"},
        h("div", {class: "sn-kopf-text"},
          h("span", {class: "bn-kicker"}, text(tool.kicker) || "Werkzeug"),
          h("h2", {class: "sn-lektion-titel"}, text(tool.titel)),
          tool.lead ? h("p", {class: "sn-zweck"}, text(tool.lead)) : null),
        h("div", {class: "sn-knoepfe"},
          h("button", {type: "button", class: "knopf primaer", onclick: () => aufgabeDazu(tool)}, "Aufgabe dazu"),
          h("button", {type: "button", class: "knopf geist sn-zurueck",
            onclick: () => { werkzeugOffen = null; runde = null; fokusSetzen(fokusRegister("werkzeuge")); zeichnen(); }}, "Zurück zu den Werkzeugen"))),
      flaecheEl,
      rundenBlock);
  }
  function aufgabeDazu(tool){
    const art = TOOL_ART[tool && tool.id];
    rundeStarten({kontext: "werkzeug", titel: "Aufgabe dazu", niveau: stufeJetzt(), arten: art ? [art] : [], anzahl: 3});
  }
  /* Werkzeug meldet ein Ergebnis: gelöste Fläche wird als Lernen MIT Hilfe verbucht (Vertrag § 4),
     sonst passiert nichts. Die Ringanzeige oben zieht nach, ohne die Fläche neu zu zeichnen. */
  function werkzeugErgebnis(tool, ereignis){
    if (!ereignis || typeof ereignis !== "object") return;
    const geloest = !!ereignis.geloest;
    if (geloest) verbucheWerkzeug(tool, ereignis);
    liveMelden(geloest
      ? `Werkzeug „${text(tool.titel)}" gelöst – mit Hilfe im Lernstand verbucht.`
      : `Werkzeug „${text(tool.titel)}": noch nicht gelöst – die Fläche bleibt stehen.`);
  }
  function verbucheWerkzeug(tool, ereignis){
    const motor = spielMotor();
    if (!motor || !hatFunktion(motor, "antwort")) return;
    const art = TOOL_ART[tool && tool.id] || "netzid";
    const id = text(ereignis.id || (tool && tool.id) || "werkzeug");
    const aufgabe = {id: "werkzeug-" + id, art, niveau: stufeJetzt(), titel: text(tool && tool.titel) || "Werkzeug"};
    try {
      const antwort = motor.antwort(aufgabe, true, {hilfe: true});
      if (antwort && antwort.fortschritt) ringAktualisieren(antwort.fortschritt);
    } catch (e) { console.error("Subnetting: Werkzeug verbuchen", e); }
  }
  function ringAktualisieren(stand){
    try {
      if (!flaeche) return;
      const module = moduleListe();
      const sicher = module.filter(m => statusIn(stand, m.id) === "sicher").length;
      const prozent = module.length ? Math.round(sicher / module.length * 100) : 0;
      const wert = flaeche.querySelector(".sn-ring-wert");
      if (wert) wert.textContent = `${sicher}/${module.length}`;
      const ring = flaeche.querySelector(".sn-ring");
      if (ring) {
        ring.setAttribute("aria-label", `${sicher} von ${module.length} Modulen sicher`);
        if (ring.style && typeof ring.style.setProperty === "function") ring.style.setProperty("--sn-p", String(prozent));
      }
    } catch (e) { /* Anzeige darf nie stören */ }
  }

  /* ---------- Üben & Spielen ---------- */
  function ueben(stand){
    if (runde && runde.kontext === "frei") return [h("section", {class: "bn-k"}, rundeInhalt(runde, stand))];
    if (spielOffen) {
      const spiel = spieleListe().find(s => s.id === spielOffen) || {id: spielOffen, titel: spielOffen};
      return [spielSeite(spiel)];
    }
    const inhalt = [];
    if (!spielMotor()) inhalt.push(hinweisKarte("Üben & Spielen", "Der Übungsmotor ist noch nicht geladen – sobald er bereitsteht, lassen sich hier Runden zusammenstellen."));
    else inhalt.push(generator());
    inhalt.push(spielKarten());
    return [h("div", {class: "bn-raster"}, ...inhalt)];
  }
  function motorArten(){
    const m = spielMotor();
    const arten = m && Array.isArray(m.ARTEN) ? m.ARTEN : null;
    return arten && arten.length ? arten : ARTEN_FALLBACK;
  }
  function generator(){
    const niveau = stufeJetzt();
    /* Generator-Themen nach Stufe filtern: nur Themen, die für die gewählte Stufe Aufgaben liefern (§ 5). */
    const arten = motorArten().filter(a => !Array.isArray(a.stufen) || a.stufen.includes(niveau));
    const themaFeld = h("select", {class: "sn-feld", "aria-label": "Thema", "data-feld": "thema"},
      [h("option", {value: "gemischt", selected: true}, "Gemischt (passende Themen)")].concat(arten.map(a => h("option", {value: text(a.id)}, text(a.titel) || text(a.id)))));
    const stufeFeld = h("select", {class: "sn-feld", "aria-label": "Stufe", "data-feld": "stufe",
      onchange: ereignis => {
        const wert = feldWert(ereignis && ereignis.currentTarget, niveau);
        if (!STUFEN.includes(wert)) return;
        stufe = wert;
        fokusSetzen(fokusGeneratorStufe());
        zeichnen();
      }},
      STUFEN.map(s => h("option", {value: s, selected: s === niveau}, s)));
    const anzahlFeld = h("select", {class: "sn-feld", "aria-label": "Anzahl der Aufgaben", "data-feld": "anzahl"},
      [4, 6, 8].map(n => h("option", {value: String(n), selected: n === 6}, `${n} Aufgaben`)));
    return h("section", {class: "bn-k bn-s5 sn-generator"},
      h("header", {class: "bn-kopf"}, h("div", {}, h("span", {class: "bn-kicker"}, "Übungsgenerator"), h("h3", {class: "bn-titel"}, "Runde zusammenstellen"))),
      h("p", {class: "bn-lead"}, "Thema, Stufe und Anzahl wählen – Aufgabe für Aufgabe mit Rückmeldung, Rechenweg und Erklärung."),
      h("div", {class: "sn-generator-felder"},
        feldbereich("Thema", themaFeld),
        feldbereich("Stufe", stufeFeld),
        feldbereich("Anzahl", anzahlFeld)),
      generatorFehler ? h("p", {class: "sn-hinweis", tabindex: "-1"}, generatorFehler) : null,
      h("div", {class: "sn-knoepfe"},
        h("button", {type: "button", class: "knopf primaer", onclick: () => {
          const thema = feldWert(themaFeld, "gemischt");
          rundeStarten({kontext: "frei", titel: "Übungsrunde", niveau: feldWert(stufeFeld, niveau),
            arten: thema && thema !== "gemischt" ? [thema] : [], anzahl: Number(feldWert(anzahlFeld, "6")) || 6});
        }}, "Runde starten")),
      h("p", {class: "bn-meta"}, `${arten.length} Themen für Stufe ${niveau}; jede Antwort wird im Lernstand verbucht – Geld und Ruf bleiben unberührt.`));
  }
  function fokusGeneratorStufe(){
    return () => {
      if (!flaeche) return null;
      try {
        return [...flaeche.querySelectorAll(".sn-feld")].find(f => f.getAttribute("data-feld") === "stufe") || null;
      } catch (e) { return null; }
    };
  }
  function spielKarten(){
    const kinder = [];
    if (!spieleApi()) kinder.push(hinweisKarte("Lernspiele", "Die Lernspiele werden parallel gebaut – sobald sie geladen sind, stehen sie hier zum Starten bereit."));
    else if (!spieleListe().length) kinder.push(hinweisKarte("Lernspiele", "Es sind noch keine Lernspiele eingetragen."));
    else kinder.push(h("div", {class: "sn-spiele"}, spieleListe().map(s => h("button", {type: "button", class: "sn-spiel", "data-spiel": text(s.id),
      onclick: () => { spielOffen = s.id; runde = null; registerSetzen("ueben"); zeichnen(); }},
      h("span", {class: "sn-spiel-titel"}, text(s.titel)),
      h("span", {class: "sn-spiel-lead"}, text(s.lead)),
      h("span", {class: "sn-spiel-dauer"}, [text(s.stufe) || "E", text(s.dauerText) || "kurz"].join(" · "))))));
    return h("section", {class: "bn-k bn-s7"},
      h("header", {class: "bn-kopf"}, h("div", {}, h("span", {class: "bn-kicker"}, "Lernspiele"), h("h3", {class: "bn-titel"}, "Spielen und dabei lernen"))),
      ...kinder);
  }
  function spielSeite(spiel){
    const flaecheEl = h("div", {class: "sn-flaeche", "data-spiel": text(spiel.id)});
    const ergebnis = h("div", {class: "sn-spiel-ergebnis"});
    spielMerken(flaecheEl, spiel.id, {niveau: stufeJetzt(),
      onEnde: e => spielEnde(spiel, e, ergebnis),
      onErgebnis: e => liveMelden(e && e.geloest ? `Spiel „${text(spiel.titel)}": Aufgabe gelöst.` : `Spiel „${text(spiel.titel)}": Aufgabe noch nicht gelöst.`)});
    return h("div", {class: "sn-werkzeug-seite"},
      h("header", {class: "sn-lektion-kopf"},
        h("div", {class: "sn-kopf-text"},
          h("span", {class: "bn-kicker"}, text(spiel.kicker) || "Lernspiel"),
          h("h2", {class: "sn-lektion-titel"}, text(spiel.titel)),
          spiel.lead ? h("p", {class: "sn-zweck"}, text(spiel.lead)) : null),
        h("div", {class: "sn-knoepfe"},
          h("button", {type: "button", class: "knopf geist sn-zurueck",
            onclick: () => { spielOffen = null; fokusSetzen(fokusRegister("ueben")); zeichnen(); }}, "Zurück zu den Spielen"))),
      flaecheEl,
      ergebnis);
  }
  function spielEnde(spiel, e, ziel){
    if (!e || typeof e !== "object" || !ziel) return;
    const richtig = Number(e.richtig) || 0, falsch = Number(e.falsch) || 0;
    const zeilen = liste(e.aufgaben).map(a => h("li", {class: "sn-ergebnis-zeile"},
      h("b", {}, a && a.richtig ? "Richtig" : "Falsch"),
      h("span", {}, text(a && a.frage)),
      a && a.soll != null ? h("small", {}, "Soll: " + text(a.soll)) : null));
    ziel.replaceChildren(h("section", {class: "bn-k sn-ergebnis", tabindex: "-1"},
      h("header", {class: "sn-runde-kopf"},
        h("span", {class: "bn-kicker"}, "Ergebnis · " + text(spiel.titel)),
        h("span", {class: "sn-punkte"}, "Punkte ", h("span", {class: "sn-punkte-wert"}, `${richtig} / ${richtig + falsch}`))),
      h("p", {class: "sn-ergebnis-wert"}, `${richtig} richtig, ${falsch} falsch`),
      e.serie != null ? h("p", {class: "bn-meta"}, "Beste Serie: " + text(e.serie)) : null,
      zeilen.length ? h("ol", {class: "sn-ergebnis-liste"}, zeilen) : null,
      h("p", {class: "bn-meta"}, "Das Ergebnis ist im eigenen Fortschritt und im Lernstand verbucht – jede Aufgabe zählt für die Fertigkeit.")));
    liveMelden(`Spiel beendet: ${richtig} richtig, ${falsch} falsch.`);
    try { if (typeof ziel.focus === "function") setTimeout(() => ziel.focus(), 0); } catch (e) { /* Fokus ist Beiwerk */ }
  }

  /* ---------- Formelsammlung ---------- */
  function formeln(stand){
    const p = lehrplan();
    if (!p) return [hinweisKarte("Formelsammlung", "Die Formelsammlung ist noch nicht geladen – sie erscheint mit dem Lehrplan.")];
    const eintraege = liste(p.formelsammlung);
    if (!eintraege.length) return [hinweisKarte("Formelsammlung", "Für die Formelsammlung sind noch keine Einträge hinterlegt.")];
    return [h("div", {class: "bn-raster"}, eintraege.map((e, i) => formelKarte(e, i, stand)))];
  }
  function formelKarte(eintrag, nummer, stand){
    const kinder = [
      h("header", {class: "bn-kopf"},
        h("div", {}, h("span", {class: "bn-kicker"}, `Formel ${String(nummer + 1).padStart(2, "0")}`),
          h("h3", {class: "sn-formel-titel"}, text(eintrag.titel)))),
    ];
    const saetze = liste(eintrag.saetze);
    if (saetze.length) kinder.push(h("ul", {class: "sn-formel-saetze"}, saetze.map(s => h("li", {}, text(s)))));
    const tabelle = eintrag.tabelle;
    if (tabelle && liste(tabelle.zeilen).length) {
      kinder.push(h("table", {class: "sn-tabelle"},
        h("thead", {}, h("tr", {}, liste(tabelle.spalten).map(spalte => h("th", {}, text(spalte))))),
        h("tbody", {}, liste(tabelle.zeilen).map(zeile => h("tr", {}, liste(zeile).map(zelle => h("td", {}, text(zelle))))))));
    }
    if (eintrag.merksatz) kinder.push(h("p", {class: "sn-merksatz"}, text(eintrag.merksatz)));
    if (eintrag.visual && eintrag.visual.art) {
      const visual = h("div", {class: "sn-visual"});
      montageMerken(visual, eintrag.visual.art, {preset: eintrag.visual.preset, kompakt: true, niveau: stufeJetzt()});
      kinder.push(visual);
    }
    return h("section", {class: "bn-k bn-s6 sn-formel", "data-formel": String(nummer), "data-stand": String(liste(stand && stand.module && Object.keys(stand.module)).length)}, kinder);
  }

  /* ---------- Seite, Zeichnen, Fokus, Tasten ---------- */
  function seite(){
    const stand = fortschritt();
    const module = moduleListe();
    liveEl = h("div", {class: "sn-live", role: "status", "aria-live": "polite", "aria-atomic": "true"});
    /* Vollständiges Tab-Muster (S5): ein Panel je Register mit Label und tabpanel-Rolle. */
    const panel = h("div", {class: "sn-panel", id: "sn-panel-" + register, role: "tabpanel",
      "aria-labelledby": "sn-tab-" + register, tabindex: "-1"});
    if (register === "lehrpfad") panel.append(...lehrpfad(stand));
    else if (register === "werkzeuge") panel.append(...werkzeuge(stand));
    else if (register === "ueben") panel.append(...ueben(stand));
    else panel.append(...formeln(stand));
    return h("div", {class: "sn-seite", onkeydown: tasten},
      kopf(stand, module),
      registerLeiste(),
      panel,
      liveEl);
  }
  function zeichnen(container){
    if (container) flaeche = container;
    if (!flaeche) return;
    aufraeumen();
    if (startWerkzeug) { werkzeugOffen = startWerkzeug; registerSetzen("werkzeuge"); runde = null; startWerkzeug = null; fokusSetzen(".sn-zurueck"); }
    /* Scrollposition des Scrollbereichs erhalten: sonst springt jede Antwort nach oben (B2/S8). */
    const alt = flaeche.querySelector(".sn-seite");
    const scroll = alt && typeof alt.scrollTop === "number" ? alt.scrollTop : 0;
    try {
      flaeche.replaceChildren(seite());
    } catch (e) {
      console.error("Subnetting: Ansicht", e);
      try { flaeche.replaceChildren(hinweisKarte("Subnetting", "Die Abteilung konnte gerade nicht aufgebaut werden – der Rest des Labors läuft weiter.")); } catch (ignoriert) { /* egal */ }
      return;
    }
    montagenAusfuehren();
    if (meldung && liveEl) { try { liveEl.textContent = meldung; } catch (e) { /* egal */ } meldung = null; }
    const neu = flaeche.querySelector(".sn-seite");
    if (neu && typeof neu.scrollTop === "number") { try { neu.scrollTop = scroll; } catch (e) { /* egal */ } }
    fokusAnwenden();
  }
  function wieder(container){
    if (container) flaeche = container;
    zeichnen();
  }
  function verlassen(){
    aufraeumen();
    flaeche = null;
    liveEl = null;
    fokusZiel = null;
    generatorFehler = null;
  }
  /* Fokus nach jedem Neuzeichnen (B2): jede Aktion setzt ihr Ziel, `fokusAnwenden` führt es aus.
     Wichtig: `querySelectorAll` liefert eine NodeList – die hat kein `.find` (vorher still verschluckt). */
  function fokusSetzen(ziel){ fokusZiel = ziel || null; }
  function fokussiere(el){
    try { if (el && typeof el.focus === "function") el.focus(); } catch (e) { /* Fokus ist Beiwerk */ }
  }
  function fokusRegister(id){
    return () => {
      if (!flaeche) return null;
      try { return [...flaeche.querySelectorAll(".sn-register-knopf")].find(k => k.getAttribute("data-register") === id) || null; }
      catch (e) { return null; }
    };
  }
  function erstesEingabe(){
    return () => {
      if (!flaeche) return null;
      try { return flaeche.querySelector(".sn-feld") || flaeche.querySelector(".sn-auswahl-knopf"); }
      catch (e) { return null; }
    };
  }
  function ersterSichtbarerHinweis(){
    return () => {
      if (!flaeche) return null;
      try { return [...flaeche.querySelectorAll(".sn-hinweis")].find(hinweis => hinweis.getAttribute("hidden") == null) || null; }
      catch (e) { return null; }
    };
  }
  function fokusAnwenden(){
    const ziel = fokusZiel;
    fokusZiel = null;
    if (!flaeche || !ziel) return;
    try {
      const el = typeof ziel === "function" ? ziel() : flaeche.querySelector(ziel);
      fokussiere(el);
    } catch (e) { console.error("Subnetting: Fokus", e); }
  }
  function stufeSetzen(wert){
    if (!STUFEN.includes(wert)) return;
    stufe = wert;
    fokusSetzen(".sn-stufe-wahl");
    zeichnen();
  }
  function tasten(ereignis){
    if (!ereignis || ereignis.key !== "Escape") return;
    if (runde) { runde = null; registerSetzen(register); fokusSetzen(fokusRegister(register)); }
    else if (offeneLektion) { offeneLektion = null; registerSetzen("lehrpfad"); fokusSetzen(fokusRegister("lehrpfad")); }
    else if (werkzeugOffen) { werkzeugOffen = null; registerSetzen("werkzeuge"); fokusSetzen(fokusRegister("werkzeuge")); }
    else if (spielOffen) { spielOffen = null; registerSetzen("ueben"); fokusSetzen(fokusRegister("ueben")); }
    else return;
    if (typeof ereignis.stopPropagation === "function") ereignis.stopPropagation();
    if (typeof ereignis.preventDefault === "function") ereignis.preventDefault();
    zeichnen();
  }

  /* ---------- Anmeldung und Befehlspalette ---------- */
  function paletteBefehle(){
    try {
      if (!UI.palette || !hatFunktion(UI.palette, "befehl")) return;
      for (const tool of werkzeugListe()) {
        UI.palette.befehl({name: "subnetz-werkzeug-" + text(tool.id), text: "Subnetting: Werkzeug " + text(tool.titel),
          gruppe: "Subnetting", sym: "werkzeug",
          aktion: () => { startWerkzeug = tool.id; ansichtWechseln("subnetz"); }});
      }
    } catch (e) { console.error("Subnetting: Befehlspalette", e); }
  }
  (UI.startHaken ||= []).push(() => {
    UI.app.registrieren("subnetz", {titel: "Subnetting", kurz: "Subnetz", symbol: "subnetz", zeigen: zeichnen, wieder, verlassen});
    Bus.an("subnetz", () => { try { if (UI.app && UI.app.aktuell === "subnetz") wieder(flaeche); } catch (e) { console.error("Subnetting: Bus", e); } });
    paletteBefehle();
  });

  return {
    zeichnen,
    wieder,
    verlassen,
    register: () => TABS.map(t => ({id: t.id, titel: t.titel})),
    werkzeug: id => { werkzeugOeffnen(id); },
    /* Nur lesen, für Tests und Diagnose: die laufende Runde (Aufgaben aus Spiel.subnetz). */
    get runde(){ return runde; },
  };
})();
