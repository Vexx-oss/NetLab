"use strict";
/* KLASSENRAUM — DIE OBERFLÄCHE (Bereich B): Lehrkräfte-Ansicht `klassenraum` und Azubi-Ansicht `mitarbeit`.
   Verbindlich: docs/entwicklung/Klassenraum/B – Oberfläche und Ablauf.md
     § 1.2 Anmeldung        § 2.1/2.2 DOM      § 4 Startseiten-Zeile (Haken auf Bus „ansicht“)
     § 6.1 Öffnungsweg      § 7 Ergebnis-Toast § 8 Block-Eingabe   § 9 Ampel   § 10 Datei…   § 11 Einstellungen

   WAS HIER BEWIESEN WIRD (jeder Fall nennt seinen Abschnitt):
     · beide Ansichten angemeldet (Titel/Symbole), Einstellungsabschnitt, Bus-Hörer
     · die Lehrkraft erzeugt eine Sitzung, sieht den Code GROSS und kopiert ihn
     · genau sechs Bedienelemente in der Lehrkraft-Ansicht, drei beim Azubi (R12, B § 2.1/2.2)
     · die Ampel rechnet richtig: oberer Median, „Plätze nicht eingestellt“, gelb/grün (B § 9.2)
     · die Ergebnis-Eingabe nimmt einen Block, erkennt Doppelte und füllt die Tafel (B § 8)
     · der Azubi: Tippfehler wird MARKIERT und öffnet NICHT; gültiger Code öffnet über den echten Weg
     · der Bildungsstand bleibt unangetastet (E3)
     · der Ergebnis-Toast hängt am Kanal „klassenraum“ (B § 7)
     · „Datei…“ benutzt den Hausdialog (app.js:246-265, mit Escape) statt eines eigenen Overlays

   KEIN GÜLTIGER CODE WIRD ERFUNDEN: `NL-4F7K-2Q` ist das FORMBEISPIEL aus A § 1.4 und ausdrücklich
   KEIN gültiger Code (er steht nur als Platzhalter im Feld). Jeder Code in diesem Test kommt aus
   `Spiel.klassenraum.erzeugen` oder `ergebnisCode` — dann kann er nicht veralten.

   DIE UI-SCHICHT WIRD HEADLESS NICHT GELADEN (tests/run.js:42-48 reicht nur `require` durch) — dieser
   Test lädt src/ui/klassenraum.js selbst in einem vm-Bereich mit nachgebildetem DOM.

   Auf oberster Ebene steht NUR die gekapselte Fähigkeitsprobe (der Gruppenname braucht sie vorher);
   alle Helfer liegen im `gruppe`-Rückruf, und im Gruppenrumpf steht keine Zusicherung — sonst reißt
   eine Ausnahme den ganzen Lauf mit LADEFEHLER (Exit 2) mit. */

const KL_KLAR = (() => {
  try {
    const laden = typeof require === "function" && typeof document === "undefined" && typeof Spiel === "object" && Spiel !== null;
    const codec = laden && typeof Spiel.klassenraum === "object" && typeof Spiel.klassenraum.ausCode === "function";
    return {laden, codec, zusatz: laden ? "" : " (kein require im Testbereich – nur unter node tests/run.js)"};
  } catch (e) { return {laden: false, codec: false, zusatz: " (Testbereich nicht lesbar)"}; }
})();

gruppe("UI: Klassenraum" + KL_KLAR.zusatz, () => {
  /* ================= DOM-Ersatz (nur für den vm-Bereich) ================= */
  function klKnoten(tag){
    const el = {
      nodeType: 1, tag, kinder: [], attrs: {}, listeners: {}, className: "", _text: "", parentNode: null, value: "",
      append(...k){ for (const x of k) if (x != null && x !== false) { if (typeof x === "object") x.parentNode = el; el.kinder.push(x); } },
      replaceChildren(...k){ el.kinder = []; el.append(...k); },
      remove(){ if (el.parentNode) el.parentNode.kinder = el.parentNode.kinder.filter(x => x !== el); },
      setAttribute(k, v){ el.attrs[k] = String(v); },
      getAttribute(k){ return el.attrs[k] === undefined ? null : el.attrs[k]; },
      removeAttribute(k){ delete el.attrs[k]; },
      addEventListener(art, fn){ (el.listeners[art] ||= []).push(fn); },
      click(){ for (const fn of (el.listeners.click || []).slice()) fn({currentTarget: el, target: el, preventDefault(){}, stopPropagation(){}}); },
      ausloesen(art, o){ for (const fn of (el.listeners[art] || []).slice()) fn(Object.assign({currentTarget: el, target: el, preventDefault(){}, stopPropagation(){}}, o)); },
      insertBefore(neu, vor){ const i = el.kinder.indexOf(vor); el.kinder.splice(i < 0 ? el.kinder.length : i, 0, neu); neu.parentNode = el; return neu; },
      querySelector(sel){ return klFinde(el, sel)[0] || null; },
      querySelectorAll(sel){ return klFinde(el, sel); },
      classList: {
        _l(){ return klKlassen(el); },
        _s(l){ el.className = l.join(" "); delete el.attrs.class; },
        add(...k){ const l = el.classList._l(); for (const x of k) if (!l.includes(x)) l.push(x); el.classList._s(l); },
        remove(...k){ el.classList._s(el.classList._l().filter(x => !k.includes(x))); },
        toggle(x, an){ const a = an === undefined ? !el.classList.contains(x) : !!an; if (a) el.classList.add(x); else el.classList.remove(x); return a; },
        contains(x){ return el.classList._l().includes(x); },
      },
      get hidden(){ return el.attrs.hidden !== undefined; },
      get children(){ return el.kinder.filter(k => k && k.tag); },
      set textContent(v){ el._text = String(v); el.kinder = []; },
      get textContent(){ return el.kinder.length ? el.kinder.map(klText).join("") : el._text; },
    };
    return el;
  }
  const klKlassen = el => String(el.className || (el.attrs && el.attrs.class) || "").split(/\s+/).filter(Boolean);
  function klPasst(el, sel){
    const s = String(sel).trim();
    if (/^[a-z][a-z0-9]*$/i.test(s)) return el.tag === s;
    const teile = s.match(/\.[\w-]+|\[[^\]]+\]/g) || [];
    return teile.length > 0 && teile.every(t => {
      if (t.startsWith(".")) return klKlassen(el).includes(t.slice(1));
      const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(t);
      return !!m && (m[2] === undefined ? el.attrs[m[1]] !== undefined : el.attrs[m[1]] === m[2]);
    });
  }
  function klFinde(el, sel){
    const treffer = [];
    const lauf = k => { for (const x of k.kinder) if (x && x.tag) { if (klPasst(x, sel)) treffer.push(x); lauf(x); } };
    lauf(el);
    return treffer;
  }
  function klText(k){ return k == null ? "" : typeof k === "string" ? k : (k.textContent || ""); }
  /* h() mit demselben Vertrag wie src/ui/dom.js:7-20 */
  function klH(tag, attrs = {}, ...kinder){
    const el = klKnoten(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") el.className = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k === "value") el.value = v;
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : String(v));
    }
    for (const kid of kinder.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : {nodeType: 3, textContent: String(kid)});
    return el;
  }
  const klKnopf = (el, text) => klFinde(el, "button").find(b => klText(b).includes(text)) || null;

  /* ================= Prüfstand ================= */
  function klPruefstand(){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const registriert = [], abschnitte = [], busHaken = [], rufe = [], dialoge = [], exporte = [];
    const seite = klKnoten("div");                          /* der Hub (.hb-seite) für die Startzeile */
    seite.className = "hb-seite";
    const dokument = {
      createElement: tag => klKnoten(tag), createElementNS: (ns, tag) => klKnoten(tag),
      createTextNode: t => ({nodeType: 3, textContent: String(t)}),
      getElementById: () => null, querySelectorAll: () => [], listeners: {},
      querySelector: sel => String(sel).includes("hb-seite") ? seite : null,
      addEventListener(){}, removeEventListener(){},
      body: klKnoten("body"), documentElement: klKnoten("html"), activeElement: null,
    };
    /* Plattform als Attrappe (im Testbereich gibt es sie nicht): „tauri“ zeigt den Server-Schalter. */
    const Plattform = {name: "tauri", datei: {
      exportieren: (name, text) => { exporte.push([name, text]); return Promise.resolve(true); },
      importieren: () => Promise.resolve(null)}};
    const UIstub = {
      startHaken: [],
      app: {
        registrieren: (name, def) => { registriert.push({name, def}); return def; },
        einstellungAbschnitt: (titel, fn) => abschnitte.push({titel, fn}),
        /* wie app.js:246-265: Dialog mit Escape-Hörer */
        dialogOeffnen: (titel, inhalt) => { dialoge.push({titel, inhalt, zu: false});
          const esc = e => { if (e.key === "Escape") dialoge[dialoge.length - 1].zu = true; };
          dokument.listeners.keydown = (dokument.listeners.keydown || []).concat(esc);
          return dialoge.length - 1; },
        dialogZu: () => { if (dialoge.length) dialoge[dialoge.length - 1].zu = true; },
        aktuell: "heute",
      },
      spiel: {oeffnen: iid => rufe.push(["spiel-oeffnen", iid]), get inst(){ return rufe.inst || null; }},
      hub: {kopieren: (text, ok) => rufe.push(["kopieren", text, ok])},
      toast: (text, art, opt) => rufe.push(["toast", text, art, opt]),
    };
    const bereich = {
      UI: UIstub, h: klH, console, document: dokument,
      Bus: {an: (art, fn) => { busHaken.push({art, fn}); return () => {}; }},
      Spiel, store, Plattform, jetzt, heute,
      requestAnimationFrame: fn => { try { fn(0); } catch (e) {} return 0; },
      setTimeout: () => 0, clearTimeout(){},
    };
    vm.createContext(bereich);
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "src", "ui", "klassenraum.js"), "utf8"), bereich, {filename: "ui/klassenraum.js"});
    return {UI: bereich.UI, K: bereich.UI.klassenraum, registriert, abschnitte, busHaken, rufe, dialoge, exporte, seite, dokument,
      zeige: i => { const c = klKnoten("div"); registriert[i].def.zeigen(c); return c; },
      start: () => { for (const fn of UIstub.startHaken) fn(); }};
  }

  /* ================= Kapsel ================= */
  const KL_T0 = Date.UTC(2026, 9, 10, 9, 0, 0);
  function klKapsel(fn){
    const alt = {speicher: store.alles(), st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
                 uhr: jetzt(), gen: Object.assign({}, Spiel.generierte)};
    try {
      jetzt.setzen(KL_T0);
      store.set("einst", {});
      Spiel._einst = null; Spiel._trocken = false; Spiel.neu();
      return fn();
    } finally {
      Spiel.generierte = alt.gen;
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, alt.speicher);
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = {}; Spiel._trocken = alt.trocken;
      jetzt.setzen(alt.uhr); jetzt.frei();
    }
  }
  /* Eine Sitzung anlegen, wie es die Lehrkraft tut (echter Codec, echter Speicher). */
  function klSitzung(ticketId){
    const s = Spiel.klassenraum.erzeugen({ticketId: ticketId || "salon-terminal"});
    if (!s || s.fehler) throw new Error("Sitzung ließ sich nicht anlegen: " + ((s && s.grund) || "?"));
    return s;
  }
  /* Einen ECHTEN Ergebnis-Code bauen (A: `ergebnisCode(inst, abnahme)`) – nie einen erfundenen. */
  const klErgebnis = (sitzung, platz, sterne, zeitMs, abnahmen) =>
    Spiel.klassenraum.ergebnisCode({klassenraum: {sitzung, platz}, zeitMs, abnahmen: abnahmen || 1}, {bestanden: true, sterne});

  if (!KL_KLAR.laden) { pruefe("Klassenraum-Ansichten: nur unter node tests/run.js prüfbar", () => { erwarte.wahr(false, "require fehlt"); }); return; }

  pruefe("Der Codec aus Bereich A ist da — ohne ihn prüft diese Datei nichts", () => klKapsel(() => {
    erwarte.wahr(KL_KLAR.codec, "Spiel.klassenraum.ausCode fehlt (src/spiel/klassenraum.js)");
    erwarte.gleich(typeof Spiel.klassenraum.erzeugen, "function", "erzeugen");
    erwarte.gleich(typeof Spiel.klassenraum.ergebnisEintragen, "function", "ergebnisEintragen");
  }));

  pruefe("Beide Ansichten melden sich in EINEM Haken an — Titel, Symbole, Einstellungen, Bus (B § 1.2, § 11)", () => klKapsel(() => {
    const p = klPruefstand();
    p.start();
    erwarte.gleich(p.registriert.map(r => r.name), ["klassenraum", "mitarbeit"], "Lehrkraft zuerst, dann der Azubi");
    const lehrer = p.registriert[0].def, schueler = p.registriert[1].def;
    erwarte.gleich([lehrer.titel, lehrer.symbol], ["Klasse", "kunden"], "Andock-Knopf der Lehrkraft");
    erwarte.gleich([schueler.titel, schueler.symbol], ["Auftrag", "akte"], "Andock-Knopf des Azubi");
    erwarte.gleich([typeof lehrer.zeigen, typeof lehrer.wieder, typeof schueler.zeigen, typeof schueler.wieder],
      ["function", "function", "function", "function"], "zeigen und wieder für beide");
    erwarte.gleich(p.abschnitte.map(a => a.titel), ["Klassenraum"], "der Einstellungsabschnitt");
    erwarte.gleich(p.busHaken.map(b => b.art), ["ansicht", "zustand-geaendert", "spiel-geladen", "klassenraum"], "die Bus-Hörer");
  }));

  pruefe("Lehrkraft: Sitzung anlegen zeigt den Code GROSS, kopierbar — und er kommt aus erzeugen (B § 2.1)", () => klKapsel(() => {
    const p = klPruefstand();
    p.start();
    const c = p.zeige(0);
    erwarte.gleich(klFinde(c, "button").length, 4, "vier Knöpfe: Code anzeigen, Code kopieren, Eintragen, Datei…");
    p.K._L.auftrag.value = "id:salon-terminal";
    klKnopf(c, "Code anzeigen").click();
    const s = Spiel.klassenraum.sitzung();
    erwarte.wahr(!!s, "die Sitzung läuft");
    erwarte.passt(s.code, /^NL-[0-9A-Z]{4}-[0-9A-Z]{2}$/, "der gedruckte Code hat die Form NL-XXXX-XX");
    const gross = klFinde(c, ".kl-gross")[0];
    erwarte.wahr(!!gross, "die Beamer-Zeile steht da");
    erwarte.gleich(klText(gross), s.code, "und zeigt genau den Code aus erzeugen");
    klKnopf(c, "Code kopieren").click();
    erwarte.gleich(p.rufe.filter(r => r[0] === "kopieren").map(r => r[1]), [s.code], "kopiert wird derselbe Code");
  }));

  pruefe("Lehrkraft: sechs sichtbare Bedienelemente, Azubi: drei — ein siebtes gibt es nicht (B § 2.1/2.2, R12)", () => klKapsel(() => {
    const p = klPruefstand();
    p.start();
    const steuer = c => klFinde(c, "button").length + klFinde(c, "select").length + klFinde(c, "input").length + klFinde(c, "textarea").length;
    erwarte.gleich(steuer(p.zeige(0)), 6, "select, Code anzeigen, Code kopieren, textarea, Eintragen, Datei…");
    erwarte.gleich(steuer(p.zeige(1)), 3, "Auftragscode, Platz, Auftrag öffnen");
  }));

  pruefe("Ampel: 0 Ergebnisse dunkel, halb voll gelb, alles grün — Median ist der OBERERE (B § 9)", () => klKapsel(() => {
    const K = klPruefstand().K;
    const leer = K.ampel({ergebnisse: {}, plaetze: 4});
    erwarte.gleich([leer.farbe, leer.summe], ["", "Ampel: noch keine Ergebnisse"], "ohne Ergebnis dunkel");
    const zwei = K.ampel({plaetze: 4, ergebnisse: {5: {platz: 5, sterne: 4, dauerS: 250}, 9: {platz: 9, sterne: 5, dauerS: 260}}});
    erwarte.gleich(zwei.farbe, "kl-gelb", "halb voll ist gelb");
    erwarte.enthaelt(zwei.summe, "fertig 2", "zwei Plätze belegt");
    erwarte.enthaelt(zwei.summe, "offen 2", "zwei fehlen");
    erwarte.enthaelt(zwei.summe, "Median 4:20", "oberer Median (250, 260) → 4:20, nicht 4:15");
    /* grün: so viele Ergebnisse wie Plätze, keins außerhalb 1..plaetze */
    const voll = K.ampel({plaetze: 2, ergebnisse: {1: {platz: 1, sterne: 4, dauerS: 110}, 2: {platz: 2, sterne: 5, dauerS: 70}}});
    erwarte.gleich([voll.farbe, voll.offen], ["kl-gruen", 0], "alle Plätze belegt ist grün");
    const ohne = K.ampel({ergebnisse: {5: {platz: 5, sterne: 4}}});
    erwarte.gleich(ohne.farbe, "kl-gelb", "ohne Platzzahl bleibt gelb");
    erwarte.enthaelt(ohne.summe, "Plätze nicht eingestellt", "und sagt das, statt zu raten");
    const ausfall = K.ampel({plaetze: 8, ergebnisse: {0: {platz: 0, sterne: 1}, 5: {platz: 5, sterne: 4, dauerS: 110}, 7: {platz: 7, sterne: 4, dauerS: 0}}});
    erwarte.enthaelt(ausfall.summe, "1 Ergebnis ohne gültigen Platz", "Platz 0 zählt als ausgefallen (Einzahl)");
    erwarte.enthaelt(ausfall.summe, "Median 1:50", "eine fehlende Dauer (0) zählt nicht für den Median");
    erwarte.gleich(ausfall.farbe, "kl-gelb", "mit Ausfall nicht grün");
  }));

  pruefe("Block-Eingabe: Zerlegung, Doppelte, Tafel und Summenzeile (B § 8, § 3.4)", () => klKapsel(() => {
    const p = klPruefstand();
    /* Diese Zeichenketten werden NUR zerlegt (Trenner, Zeilennummern) – sie werden nie eingetragen,
       also nie gegen den Codec geprüft. Die echten Codes weiter unten kommen aus `erzeugen`. */
    const stuecke = p.K.zerlegen("E-CBUD-RX5, E-KFWS-HZM\n\nE-AAAA-BBB;E-CCCC-DDD");
    erwarte.gleich(stuecke.map(s => s.stueck), ["E-CBUD-RX5", "E-KFWS-HZM", "E-AAAA-BBB", "E-CCCC-DDD"], "Bindestriche sind keine Trenner");
    erwarte.gleich(stuecke.map(s => s.zeile), [1, 1, 3, 3], "die Zeilennummer ist die Fehleradresse");
    p.start();
    const c = p.zeige(0);
    const s = klSitzung("salon-terminal");
    p.K.lehrerWieder();
    const e5 = klErgebnis(s.id, 5, 4.5, 110000, 2), e9 = klErgebnis(s.id, 9, 5, 70000, 1);
    p.K._L.codes.value = `${e5}\n${e5}\n${e9}\nE-CCCC-DDD`;
    klKnopf(c, "Eintragen").click();
    const hinweis = klFinde(c, ".kl-hinweis").map(x => klText(x)).join(" | ");
    erwarte.enthaelt(hinweis, "2 eingetragen", "zwei gültige Codes");
    erwarte.enthaelt(hinweis, "doppelt", "derselbe Code zweimal ist doppelt");
    erwarte.enthaelt(hinweis, "1 unlesbar", "der kaputte Code wird als unlesbar gezählt");
    const zeilen = klFinde(c, ".kl-zeile");
    erwarte.gleich(zeilen.length, 2, "die Tafel zeigt zwei Ergebnisse");
    erwarte.enthaelt(klText(zeilen[0]), "Platz 5", "erste Zeile: Platz 5");
    erwarte.enthaelt(klText(zeilen[0]), "1:50", "mit Dauer 1:50 (110 s)");
    erwarte.enthaelt(klText(zeilen[0]), "1 Fehlversuch", "und dem Fehlversuch");
    erwarte.enthaelt(klText(zeilen[1]), "★★★★★", "zweite Zeile: fünf Sterne");
    erwarte.enthaelt(klText(zeilen[1]), "1:10", "und 70 s");
    erwarte.gleich(p.K._L.codes.value, "", "das Feld ist danach leer");
    /* Gegenprobe: der zweite Durchgang ist gefahrlos (idempotent) */
    p.K._L.codes.value = e5;
    klKnopf(c, "Eintragen").click();
    erwarte.enthaelt(klFinde(c, ".kl-hinweis").map(x => klText(x)).join(" | "), "0 eingetragen · 1 doppelt", "derselbe Code ändert nichts");
  }));

  pruefe("Azubi: Tippfehler wird MARKIERT und öffnet NICHT — gültiger Code öffnet über den echten Weg (B § 6.1)", () => klKapsel(() => {
    const p = klPruefstand();
    p.start();
    const c = p.zeige(1);
    const form = klFinde(c, "form")[0];
    erwarte.wahr(!!form, "das Formular steht da");
    erwarte.gleich(klFinde(c, "input").map(i => i.getAttribute("type")), ["text", "text"], "zwei Textfelder, KEIN type=search");
    const s = klSitzung("salon-terminal");
    const kaputt = s.code.slice(0, -1) + (s.code.endsWith("A") ? "B" : "A");
    /* Tippfehler: markiert, A's Grund wörtlich, nichts geöffnet */
    p.K._A.code.value = kaputt;
    form.ausloesen("submit");
    erwarte.gleich(p.rufe.filter(r => r[0] === "spiel-oeffnen").length, 0, "kein Auftrag geöffnet");
    erwarte.gleich(p.K._A.code.getAttribute("aria-invalid"), "true", "das Feld ist markiert");
    const grund = Spiel.klassenraum.ausCode(kaputt).grund;
    erwarte.enthaelt(klText(p.K._A.hinweis), String(grund).slice(0, 24), "A's Grund steht wörtlich da (keine zweite Wahrheit)");
    /* Das FORMBEISPIEL aus A § 1.4 ist kein gültiger Code — es muss die Fehlermeldung zeigen. */
    p.K._A.code.value = "NL-4F7K-2Q";
    form.ausloesen("submit");
    erwarte.gleich(p.rufe.filter(r => r[0] === "spiel-oeffnen").length, 0, "das Formbeispiel öffnet nichts");
    erwarte.gleich(p.K._A.code.getAttribute("aria-invalid"), "true", "und wird markiert");
    /* leer: keine Meldung, kein Öffnen */
    p.K._A.code.value = "   ";
    form.ausloesen("submit");
    erwarte.gleich(p.rufe.filter(r => r[0] === "spiel-oeffnen").length, 0, "leer öffnet nichts");
    /* gültig: der echte Weg */
    p.K._A.code.value = s.code;
    p.K._A.platz.value = "7";
    form.ausloesen("submit");
    erwarte.gleich(p.rufe.filter(r => r[0] === "spiel-oeffnen").length, 1, "genau ein Auftrag geöffnet");
    const inst = Spiel.st.postfach[Spiel.st.postfach.length - 1];
    erwarte.gleich(inst.quelle, "klassenraum", "vierte Quelle");
    erwarte.gleich(inst.klassenraum.platz, 7, "der Platz aus dem Feld steht an der Instanz");
    erwarte.gleich(inst.klassenraum.code, s.code, "der Code steht an der Instanz");
    erwarte.gleich(Spiel.klassenraum.platz(), 7, "und ist im Speicher gemerkt (für den Ergebnis-Code)");
  }));

  pruefe("Bildungsstand bleibt unangetastet (E3) — die Ansage überstimmt ihn nicht", () => klKapsel(() => {
    const p = klPruefstand();
    p.start();
    Spiel.stufe.setzen("geselle", {still: true});
    const c = p.zeige(1);
    const s = klSitzung("salon-terminal");
    p.K._A.code.value = s.code;
    klFinde(c, "form")[0].ausloesen("submit");
    erwarte.gleich(Spiel.stufe.id(), "geselle", "der Bildungsstand ist unverändert");
    erwarte.gleich(p.rufe.filter(r => r[0] === "spiel-oeffnen").length, 1, "und der Auftrag ist trotzdem offen");
  }));

  pruefe("Startseiten-Zeile hängt sich in den Hub — über den Bus, ohne hub.js (B § 4, L5)", () => klKapsel(() => {
    const p = klPruefstand();
    p.start();
    erwarte.gleich(klFinde(p.seite, ".kl-start").length, 1, "die Zeile steht in .hb-seite");
    erwarte.gleich(klFinde(p.seite, ".kl-start-feld")[0].getAttribute("placeholder"), "NL-4F7K-2Q", "mit dem Code-Platzhalter");
    const knopf = klFinde(p.seite, "button")[0];
    erwarte.gleich(knopf.className.split(" ").includes("primaer"), false, "kein primaer (Rauchtest haupt())");
    erwarte.gleich(knopf.className.split(" ").includes("hb-annehmen"), false, "und kein hb-annehmen");
    p.K.startEinhaengen();
    erwarte.gleich(klFinde(p.seite, ".kl-start").length, 1, "zweimal einhängen ergibt eine Zeile");
    const feld = klFinde(p.seite, ".kl-start-feld")[0];
    const s = klSitzung("salon-terminal");
    feld.value = s.code.slice(0, -1) + (s.code.endsWith("A") ? "B" : "A");
    knopf.click();
    erwarte.gleich(p.rufe.filter(r => r[0] === "toast").length, 0, "kein Toast auf der Startseite");
    erwarte.gleich(klFinde(p.seite, ".kl-hinweis").length, 1, "die Fehlerzeile steht unter dem Feld");
    erwarte.enthaelt(klText(klFinde(p.seite, ".kl-hinweis")[0]), "Prüfziffer", "mit A's Grund");
    feld.value = s.code;
    knopf.click();
    erwarte.gleich(p.rufe.filter(r => r[0] === "spiel-oeffnen").length, 1, "gültiger Code öffnet auch von hier");
    /* Neuaufbau des Hubs wirft die Zeile weg — der Haken hängt sie frisch wieder ein (Spiel.neu). */
    p.seite.replaceChildren();
    erwarte.gleich(klFinde(p.seite, ".kl-start").length, 0, "nach dem Neuaufbau ist sie weg");
    p.busHaken.find(b => b.art === "zustand-geaendert").fn();
    erwarte.gleich(klFinde(p.seite, ".kl-start").length, 1, "der Haken hängt sie wieder ein");
  }));

  pruefe("„Datei…“ benutzt den Hausdialog mit Escape statt eines eigenen Overlays (B § 10, app.js:246-265)", () => klKapsel(() => {
    const p = klPruefstand();
    p.start();
    const c = p.zeige(0);
    klSitzung("salon-terminal");
    klKnopf(c, "Datei…").click();
    erwarte.gleich(p.dialoge.length, 1, "genau ein Dialog");
    erwarte.gleich(klFinde(c, ".sp-overlay").length, 0, "kein eigenes Overlay in der Ansicht");
    erwarte.gleich(p.dialoge[0].titel, "Klassenraum-Datei", "mit Titel");
    erwarte.wahr(!!klKnopf(p.dialoge[0].inhalt, "Exportieren"), "Export im Dialog");
    erwarte.wahr(!!klKnopf(p.dialoge[0].inhalt, "Importieren"), "Import im selben Dialog");
    klKnopf(p.dialoge[0].inhalt, "Exportieren").click();
    erwarte.gleich(p.exporte.length, 1, "der Export schreibt eine Datei");
    erwarte.passt(p.exporte[0][0], /^klassenraum-\d{4}-\d{2}-\d{2}\.json$/, "Name mit Datum (B § 10.2)");
    erwarte.gleich(JSON.parse(p.exporte[0][1]).format, "netzwerk-labor/klassenraum", "und dem Format der Sitzung");
    p.dokument.listeners.keydown[0]({key: "Escape"});
    erwarte.gleich(p.dialoge[0].zu, true, "Escape schließt den Dialog");
  }));

  pruefe("Ergebnis-Code kommt über den Bus-Kanal „klassenraum“ — dezent als Toast (B § 7)", () => klKapsel(() => {
    const p = klPruefstand();
    p.start();
    const s = klSitzung("salon-terminal");
    const code = klErgebnis(s.id, 5, 5, 110000, 1);
    p.busHaken.find(b => b.art === "klassenraum").fn({code});
    const toasts = p.rufe.filter(r => r[0] === "toast");
    erwarte.gleich(toasts.length, 1, "genau ein Toast");
    erwarte.enthaelt(toasts[0][1], code, "mit dem fertigen Code");
    erwarte.gleich(toasts[0][2], "ok", "als Erfolg, nicht als Fehler");
    erwarte.gleich(toasts[0][3].id, "klassenraum-code", "feste id: ein zweiter ersetzt den ersten");
    erwarte.gleich(toasts[0][3].titel, "Für die Lehrkraft", "mit Titel");
    toasts[0][3].aktion.fn();
    erwarte.gleich(p.rufe.filter(r => r[0] === "kopieren").map(r => r[1]), [code], "der Kopier-Knopf kopiert den Code");
    /* Ohne Code im Ereignis: kein Toast, kein Fehler (kein Verrat, keine Erfindung) */
    p.busHaken.find(b => b.art === "klassenraum").fn({art: "erzeugt", code: null});
    erwarte.gleich(p.rufe.filter(r => r[0] === "toast").length, 1, "ohne Code bleibt es still");
  }));

  pruefe("Einstellungsabschnitt „Klassenraum“ baut Haus-DOM und schreibt die Einstellung (B § 11)", () => klKapsel(() => {
    const p = klPruefstand();
    p.start();
    const el = klKnoten("div");
    p.abschnitte[0].fn(el);
    erwarte.gleich(klFinde(el, ".einst-zeile").length, 1, "eine Haus-Zeile");
    erwarte.enthaelt(klText(el), "Klassenraum-Server (nur Desktop)", "mit dem Titel aus § 3.5");
    erwarte.enthaelt(klText(el), "Firewall", "und dem Firewall-Hinweis");
    const schalter = klFinde(el, ".schalter")[0];
    erwarte.gleich(schalter.getAttribute("aria-checked"), "false", "Standard ist aus");
    schalter.click();
    erwarte.gleich(store.get("einst", {}).klassenraumServer, true, "eingeschaltet wird gespeichert");
    erwarte.gleich(schalter.getAttribute("aria-checked"), "true", "und der Schalter zeigt es");
  }));

  pruefe("Der Abdruck der Lehrkraft sagt, WESSEN Netz er zeigt (Vorführlauf-Befund 10.10.2026)", () => klKapsel(() => {
    const p = klPruefstand();
    p.start();
    const c = p.zeige(0);
    const detail = klFinde(c, ".kl-detail").map(x => klText(x));
    erwarte.enthaelt(detail.join(" | "), "Klassenraum-Abdruck (dein geladenes Netz)", "die Beschriftung nennt das eigene Netz");
    const hinweis = klFinde(c, ".kl-hinweis").map(x => klText(x)).join(" | ");
    erwarte.enthaelt(hinweis, "eigenes Labor", "und der Hinweis sagt, wessen Abdruck das ist");
    erwarte.enthaelt(hinweis, "dasselbe Auftragsnetz geladen", "mit der Bedingung, wann beide gleich sind");
    /* die Zahl der Bedienelemente bleibt bei sechs — die Ehrlichkeit kostet keinen Knopf (R12) */
    const steuer = klFinde(c, "button").length + klFinde(c, "select").length + klFinde(c, "input").length + klFinde(c, "textarea").length;
    erwarte.gleich(steuer, 6, "weiterhin sechs sichtbare Bedienelemente");
  }));

  pruefe("Auftrag erzeugen meldet KEINEN Ergebnis-Code — auch kein NL-… in `code` (B § 7, Kanal kontrakt)", () => klKapsel(() => {
    const p = klPruefstand();
    p.start();
    const s = klSitzung("salon-terminal");
    const kanal = d => p.busHaken.find(b => b.art === "klassenraum").fn(d);
    const toasts = () => p.rufe.filter(r => r[0] === "toast").length;
    kanal({art: "erzeugt", sitzung: s.id, auftragscode: s.code});        /* so meldet die Quelle den Auftragscode */
    erwarte.gleich(toasts(), 0, "Auftrag erzeugen ist kein Ergebnis");
    kanal({art: "ergebnis", platz: 5});                                  /* Ergebnis eingetragen, aber ohne Code */
    erwarte.gleich(toasts(), 0, "das Eintragen meldet keinen Code");
    kanal({art: "import", sitzung: s.id});
    kanal({art: "plaetze", plaetze: 9});
    erwarte.gleich(toasts(), 0, "Import und Platzzahl erst recht nicht");
    /* die alte, irreführende Form: Auftragscode im Feld `code` — genau der Vorführlauf-Befund */
    kanal({art: "erzeugt", sitzung: s.id, code: s.code});
    erwarte.gleich(toasts(), 0, "ein NL-…-Code wird vom Codec als Ergebnis abgewiesen");
    kanal({bestanden: false, sterne: 0, code: null});                    /* nicht bestanden: kein Code */
    erwarte.gleich(toasts(), 0, "ohne Bestehen gibt es keinen Ergebnis-Code");
  }));

  pruefe("Abnahme bestanden: GENAU EIN Toast, und zwar mit dem E-…-Code aus `code` (B § 7)", () => klKapsel(() => {
    const p = klPruefstand();
    p.start();
    const s = klSitzung("salon-terminal");
    const code = klErgebnis(s.id, 5, 4.5, 110000, 2);
    erwarte.passt(code, /^E-[0-9A-Z]{4}-[0-9A-Z]{3}$/, "der Codec baut einen Ergebnis-Code der gedruckten Form");
    /* Die Abnahme-Meldung trägt BEIDES: den Auftragscode (neues Feld) und den Ergebnis-Code (`code`) */
    p.busHaken.find(b => b.art === "klassenraum").fn({iid: "i1", bestanden: true, sterne: 4.5, auftragscode: s.code, code});
    const toasts = p.rufe.filter(r => r[0] === "toast");
    erwarte.gleich(toasts.length, 1, "genau ein Toast");
    erwarte.enthaelt(toasts[0][1], code, "mit dem Ergebnis-Code");
    erwarte.falsch(String(toasts[0][1]).includes(s.code), "nicht mit dem Auftragscode");
    erwarte.gleich(toasts[0][2], "ok", "als Erfolg");
    erwarte.gleich(toasts[0][3].id, "klassenraum-code", "mit fester id");
    erwarte.gleich(toasts[0][3].titel, "Für die Lehrkraft", "und Titel");
  }));
});
