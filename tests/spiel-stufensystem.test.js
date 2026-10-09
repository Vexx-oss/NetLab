"use strict";
/* KERN-STUFENSYSTEM (src/spiel/stufensystem.js, src/ui/stufensystem.js):
   Bildungsstand als vierte Achse – Standard "azubi", kein Wurf bei unbekannter Stufe,
   Rang 1..4, Nachziehen der Erklärtiefe, Vorrat an freien Hilfen (je Ticket) und die
   vier Stufen im Einstellungs-Abschnitt „Bildungsstand".
   Vertrag: docs/entwicklung/Hilfestellung – Stufen und Schnittstellen.md § 1–§ 3.

   Der UI-Abschnitt zeichnet mit document.createElement/append (kein h(), keine Datei-Eingabe):
   deshalb läuft dieselbe Prüfung in Node (mit kleinem DOM-Ersatz) UND im Browser (echtes DOM,
   web/tests.html) – ohne Sonderweg. */

/* ---------------- Kleiner DOM-Ersatz ----------------
   Nur so viel, wie src/ui/stufensystem.js benutzt. Im Browser bleibt er unberührt, dort gilt
   das echte document; die Attrappen werden nur erzeugt, wenn kein document da ist. */
function stufeKnoten(tag){
  const el = {
    tagName: String(tag).toUpperCase(), kind: [], _text: "", attribut: {}, horcher: {},
    type: "", value: "",
    append(...kinder){ for (const k of kinder) if (k != null && k !== false) el.kind.push(k); },
    replaceChildren(...kinder){ el.kind = []; el.append(...kinder); },
    setAttribute(k, v){ el.attribut[k] = String(v); },
    getAttribute(k){ return el.attribut[k]; },
    addEventListener(art, fn){ el.horcher[art] = fn; },
    /* Klick auslösen wie ein echter Browser es täte */
    click(){ if (el.horcher.click) el.horcher.click({target: el}); },
    querySelector(sel){ return stufeFinde(el, sel); },
    querySelectorAll(sel){ const l = []; stufeSammle(el, sel, l); return l; },
    classList: {
      toggle(klasse, an){ el.klassenAn = el.klassenAn || {}; if (an === undefined) el.klassenAn[klasse] = !el.klassenAn[klasse]; else el.klassenAn[klasse] = !!an; },
      contains(klasse){ return !!(el.klassenAn && el.klassenAn[klasse]); },
    },
    set textContent(v){ el._text = String(v); el.kind = []; },
    get textContent(){ return el.kind.length ? el.kind.map(stufeText).join("") : el._text; },
    set className(v){ el.attribut.class = String(v); },
    get className(){ return el.attribut.class; },
  };
  return el;
}
function stufeHatKlasse(el, klasse){ return String(el.attribut.class || "").split(" ").includes(klasse); }
function stufeSammle(el, sel, liste){
  if (sel.startsWith(".") && stufeHatKlasse(el, sel.slice(1))) liste.push(el);
  for (const k of el.kind) if (k && k.tagName) stufeSammle(k, sel, liste);
}
function stufeFinde(el, sel){ const l = []; stufeSammle(el, sel, l); return l[0] || null; }
function stufeText(k){ return k == null ? "" : typeof k === "string" ? k : k.textContent; }
function stufeDokument(){
  return {createElement: tag => stufeKnoten(tag)};
}
/* UI-Abschnitt: echten document nehmen, sonst den Ersatz. */
function stufeDokumentFuerTest(){ return typeof document !== "undefined" ? document : stufeDokument(); }

gruppe("Spiel: Stufensystem", () => {
  /* Kapsel wie in tests/spiel-*.test.js: eigener Stand, eigene Einstellungen, danach alles zurück. */
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken, speicher: store.get("einst", null)};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand();
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      store.set("einst", alt.speicher || {});
    }
  };
  const ticket = o => Object.assign({iid: "i1", ticketId: "salon-01", hilfen: [], hilfeStufe: 0}, o);

  pruefe('Standard ist „azubi“ – auch wenn einst.stufe fehlt oder Unsinn steht', kapsel(() => {
    erwarte.gleich(Spiel.stufe.id(), "azubi", "Standard");
    erwarte.gleich(Spiel.stufe.rang(), 1, "Standard hat Rang 1");
    for (const unsinn of [undefined, null, "", "Azubi", "AZUBI", "azubi plus", "profi", 3, {}, [], true]) {
      Spiel._einst.stufe = unsinn;
      erwarte.gleich(Spiel.stufe.id(), "azubi", `Rückfall bei ${JSON.stringify(unsinn)}`);
      erwarte.gleich(Spiel.stufe.rang(), 1, `Rang bleibt 1 bei ${JSON.stringify(unsinn)}`);
    }
    delete Spiel._einst.stufe;
    erwarte.gleich(Spiel.stufe.id(), "azubi", "fehlendes Feld");
  }));

  pruefe("Die vier Stufen: Namen, Ränge 1..4 und Rückfall ohne Wurf", kapsel(() => {
    const alle = Spiel.stufe.alle();
    erwarte.gleich(alle.map(s => s.id), ["azubi", "azubi-plus", "geselle", "meister"], "Reihenfolge");
    erwarte.gleich(alle.map(s => s.rang), [1, 2, 3, 4], "Ränge");
    erwarte.gleich(alle.map(s => s.name), ["Azubi (1. Lehrjahr)", "Azubi (fortgeschritten)", "Geselle / Prüfungsvorbereitung", "Meister / Profi"]);
    erwarte.gleich(alle.map(s => s.niveau), ["E", "E", "AP1", "AP2"], "Erklärtiefe je Stufe");
    erwarte.gleich(alle.map(s => s.erklaerung), ["ausfuehrlich", "ausfuehrlich", "knapp", "nurcodes"]);
    for (const s of alle) erwarte.gleich(Spiel.stufe.def(s.id).rang, s.rang, s.id);
    erwarte.gleich(Spiel.stufe.def("gibtsnicht").id, "azubi", "unbekannte ID -> azubi");
    erwarte.gleich(Spiel.stufe.def().id, "azubi", "ohne Argument -> aktuelle Stufe");
    erwarte.gleich(Spiel.stufe.rang("meister"), 4);
    erwarte.gleich(Spiel.stufe.rang("quatsch"), 1, "unbekannt -> Rang 1");
    /* Eine Kopie darf den Vertrag nicht verändern */
    const kopie = Spiel.stufe.alle();
    kopie[0].rang = 99; kopie[1].id = "kaputt"; kopie.push({id: "x"});
    erwarte.gleich(Spiel.stufe.alle().map(s => s.rang), [1, 2, 3, 4], "Original bleibt unberührt");
    erwarte.gleich(Spiel.stufe.alle().length, 4, "und nicht länger");
  }));

  pruefe('setzen: schreibt einst.stufe, zieht einst.niveau nach, meldet stufe und niveau', kapsel(() => {
    const gesehen = [];
    const ab = [
      Bus.an("stufe", v => gesehen.push("stufe:" + v)),
      Bus.an("niveau", v => gesehen.push("niveau:" + v)),
      Bus.an("einst-geaendert", d => gesehen.push("einst:" + d.k + ":" + d.v)),
    ];
    try {
      Spiel._trocken = false;                          /* nur hier: die Meldungen sollen wirklich laufen */
      erwarte.gleich(Spiel._einst.niveau, "E", "Start-Erklärtiefe");
      Spiel.stufe.setzen("geselle");
      erwarte.gleich(Spiel.stufe.id(), "geselle");
      erwarte.gleich(Spiel.einst.niveau, "AP1", "Erklärtiefe wird nachgezogen");
      erwarte.gleich(store.get("einst").stufe, "geselle", "liegt im Speicher (über einstSetzen)");
      erwarte.wahr(gesehen.includes("stufe:geselle"), "Bus stufe: " + gesehen.join(" | "));
      erwarte.wahr(gesehen.includes("niveau:AP1"), "Bus niveau: " + gesehen.join(" | "));
      erwarte.wahr(gesehen.includes("einst:stufe:geselle") || gesehen.includes("einst:niveau:AP1"), "über einstSetzen geschrieben: " + gesehen.join(" | "));
      /* zweimal dieselbe Stufe ändert nichts mehr */
      const vorher = gesehen.length;
      Spiel.stufe.setzen("geselle");
      erwarte.gleich(gesehen.length, vorher, "kein zweites Ereignis bei gleicher Stufe");
      /* Erklärtiefe darf der Mensch danach einzeln verstellen und behalten */
      Spiel.einstSetzen("niveau", "AP2");
      erwarte.gleich(Spiel.einst.niveau, "AP2");
      erwarte.gleich(Spiel.stufe.id(), "geselle", "die Stufe bleibt davon unberührt");
      /* unbekannte ID wirft nicht und fällt auf azubi zurück */
      Spiel.stufe.setzen("gibtsnicht");
      erwarte.gleich(Spiel.stufe.id(), "azubi", "Rückfall statt Wurf");
      erwarte.gleich(Spiel.einst.niveau, "E", "azubi zieht E nach");
      /* still: schreiben, aber nichts melden (relativ gezählt – einstSetzen meldet zusätzlich
         „einst-geaendert", das ist kein Stufen-Ereignis) */
      const ruhig = gesehen.filter(x => x.startsWith("stufe:") || x.startsWith("niveau:")).length;
      Spiel.stufe.setzen("meister", {still: true});
      erwarte.gleich(Spiel.stufe.id(), "meister");
      erwarte.gleich(Spiel.einst.niveau, "AP2");
      erwarte.gleich(gesehen.filter(x => x.startsWith("stufe:") || x.startsWith("niveau:")).length, ruhig, "still meldet weder stufe noch niveau");
    } finally { for (const a of ab) a(); }
  }));

  pruefe("kann() liefert die Tabellenwerte, darf() die Schalter", kapsel(() => {
    const soll = {
      "azubi":      {vorschlaege: 1, leiter: "immer",      tipps: "alle",   niveau: "E",   konto: 6},
      "azubi-plus": {vorschlaege: 2, leiter: "immer",      tipps: "fehler", niveau: "E",   konto: 4},
      "geselle":    {vorschlaege: 1, leiter: "nachfehler", tipps: "fehler", niveau: "AP1", konto: 2},
      "meister":    {vorschlaege: 0, leiter: "nein",       tipps: "keine",  niveau: "AP2", konto: 0},
    };
    for (const [id, s] of Object.entries(soll)) {
      Spiel.stufe.setzen(id);
      for (const [frage, wert] of Object.entries(s)) erwarte.gleich(Spiel.stufe.kann(frage), wert, `${id}.${frage}`);
      erwarte.gleich(Spiel.stufe.erklaerung(), Spiel.stufe.def(id).erklaerung, `${id}: erklaerung()`);
    }
    Spiel.stufe.setzen("azubi");
    erwarte.gleich(["leiter", "anker", "miniHilfe", "training"].map(f => Spiel.stufe.darf(f)), [true, true, true, true], "azubi");
    Spiel.stufe.setzen("azubi-plus");
    erwarte.gleich(["leiter", "anker", "miniHilfe", "training"].map(f => Spiel.stufe.darf(f)), [true, true, true, true], "azubi-plus");
    Spiel.stufe.setzen("geselle");
    erwarte.gleich(["leiter", "anker", "miniHilfe", "training"].map(f => Spiel.stufe.darf(f)), [true, true, true, true], "geselle: sichtbar, die Leiter aber erst nach einem Fehler");
    Spiel.stufe.setzen("meister");
    erwarte.gleich(["leiter", "anker", "miniHilfe", "training"].map(f => Spiel.stufe.darf(f)), [false, false, false, false], "meister: keine ungefragte Hilfe");
    erwarte.gleich(Spiel.stufe.darf("gibtsnicht"), false, "unbekannte Schalterfrage -> false");
  }));

  pruefe('wann(): „erst nach Fehler“ ist je Fläche abfragbar – immer · nachfehler · nein', kapsel(() => {
    /* Die Vertragszeilen „nur nach Fehler" (Leiste/Mini, Werkzeugleiter, „Was geht hier?") sind mit
       darf() allein nicht zu beantworten: darf() sagt nur, OB eine Fläche da ist (Befund B2). */
    const soll = {
      "azubi":      {leiter: "immer", anker: "immer", miniHilfe: "immer", wasGeht: "immer"},
      "azubi-plus": {leiter: "immer", anker: "immer", miniHilfe: "immer", wasGeht: "immer"},
      "geselle":    {leiter: "nachfehler", anker: "nachfehler", miniHilfe: "nachfehler", wasGeht: "nachfehler"},
      "meister":    {leiter: "nein", anker: "nein", miniHilfe: "nein", wasGeht: "nein"},
    };
    for (const [id, flaechen] of Object.entries(soll)) {
      Spiel.stufe.setzen(id, {still: true});
      for (const [flaeche, wert] of Object.entries(flaechen)) erwarte.gleich(Spiel.stufe.wann(flaeche), wert, `${id}.${flaeche}`);
    }
    /* Unbekannte Fläche -> "nein" (im Zweifel nichts verraten), ohne Wurf */
    for (const flaeche of ["gibtsnicht", "", null, undefined, 7]) erwarte.gleich(Spiel.stufe.wann(flaeche), "nein", `unbekannt: ${JSON.stringify(flaeche)}`);
    /* darf() bleibt die Antwort auf „hat die Stufe die Fläche überhaupt?" – geselle hat sie, nur später */
    Spiel.stufe.setzen("geselle", {still: true});
    erwarte.gleich([Spiel.stufe.darf("leiter"), Spiel.stufe.wann("leiter")], [true, "nachfehler"], "geselle: vorhanden UND erst nach Fehler");
  }));

  pruefe("wannPasst(): ohne Fehler nein, nach Fehler ja, ohne Zustand nein – mit Begründung", kapsel(() => {
    for (const [id, erwartet] of [["azubi", true], ["azubi-plus", true], ["geselle", null], ["meister", false]]) {
      Spiel.stufe.setzen(id, {still: true});
      if (erwartet === null) {
        erwarte.gleich(Spiel.stufe.wannPasst("miniHilfe", {fehler: false}).ja, false, `${id}: ohne Fehler noch nicht`);
        erwarte.gleich(Spiel.stufe.wannPasst("miniHilfe", {fehler: true}).ja, true, `${id}: nach einem Fehler schon`);
      } else {
        erwarte.gleich(Spiel.stufe.wannPasst("miniHilfe", {fehler: true}).ja, erwartet, `${id}: mit Fehler`);
        erwarte.gleich(Spiel.stufe.wannPasst("miniHilfe", {fehler: false}).ja, erwartet, `${id}: ohne Fehler gleich`);
      }
    }
    /* Fehlt der Zustand, gilt „noch kein Fehler" – eine Hilfe „nach Fehler" erscheint dann nicht */
    Spiel.stufe.setzen("geselle", {still: true});
    erwarte.gleich(Spiel.stufe.wannPasst("miniHilfe"), {ja: false, grund: "erscheint erst nach einem Fehler"}, "ohne Zustand");
    erwarte.gleich(Spiel.stufe.wannPasst("miniHilfe", {}), {ja: false, grund: "erscheint erst nach einem Fehler"}, "leeres Zustandsobjekt");
    /* „immer" und „nein" brauchen den Zustand nicht */
    Spiel.stufe.setzen("azubi", {still: true});
    erwarte.gleich(Spiel.stufe.wannPasst("miniHilfe"), {ja: true, grund: "immer sichtbar"}, "azubi ohne Zustand");
    Spiel.stufe.setzen("meister", {still: true});
    erwarte.gleich(Spiel.stufe.wannPasst("miniHilfe", {fehler: true}), {ja: false, grund: "diese Stufe will keine Hilfe"}, "meister, auch nach Fehler");
    /* jede Antwort trägt eine Begründung – Flächen müssen die Regel nicht selbst kennen */
    for (const id of ["azubi", "azubi-plus", "geselle", "meister"]) {
      Spiel.stufe.setzen(id, {still: true});
      for (const flaeche of ["leiter", "anker", "miniHilfe", "wasGeht", "gibtsnicht"]) {
        const r = Spiel.stufe.wannPasst(flaeche, {fehler: true});
        erwarte.gleich(typeof r.ja, "boolean", `${id}.${flaeche}: ja ist true/false`);
        erwarte.wahr(typeof r.grund === "string" && r.grund.length > 3, `${id}.${flaeche}: Begründung „${r.grund}“`);
      }
    }
  }));

  pruefe("Die drei neuen Tabellenspalten sind über kann() und darf() abfragbar", kapsel(() => {
    /* wasGeht · geruest · einstieg (Vertrag § 2.3) – vorher musste jede Fläche die Tabelle
       ein zweites Mal auswerten (Befund B3). */
    const soll = {
      "azubi":      {wasGeht: "immer",      geruest: true,     einstieg: true},
      "azubi-plus": {wasGeht: "immer",      geruest: "knapp",  einstieg: true},
      "geselle":    {wasGeht: "nachfehler", geruest: false,    einstieg: false},
      "meister":    {wasGeht: "nein",       geruest: false,    einstieg: false},
    };
    for (const [id, spalten] of Object.entries(soll)) {
      Spiel.stufe.setzen(id, {still: true});
      for (const [spalte, wert] of Object.entries(spalten)) erwarte.gleich(Spiel.stufe.kann(spalte), wert, `kann(${id}.${spalte})`);
    }
    /* darf() beantwortet für Spalten die Ja/Nein-Frage: „gibt es das Gerüst überhaupt?" */
    Spiel.stufe.setzen("azubi", {still: true});
    erwarte.gleich([Spiel.stufe.darf("geruest"), Spiel.stufe.darf("wasGeht")], [true, true], "azubi");
    Spiel.stufe.setzen("azubi-plus", {still: true});
    erwarte.gleich([Spiel.stufe.darf("geruest"), Spiel.stufe.darf("wasGeht")], [true, true], "azubi-plus: knappes Gerüst ist trotzdem ein Gerüst");
    Spiel.stufe.setzen("geselle", {still: true});
    erwarte.gleich([Spiel.stufe.darf("geruest"), Spiel.stufe.darf("wasGeht")], [false, true], "geselle: „Was geht hier?“ ja, Gerüst nein");
    Spiel.stufe.setzen("meister", {still: true});
    erwarte.gleich([Spiel.stufe.darf("geruest"), Spiel.stufe.darf("wasGeht")], [false, false], "meister");
    /* unbekannte Frage bei kann() wirft nicht, sondern liefert undefined */
    erwarte.gleich(Spiel.stufe.kann("gibtsnicht"), undefined, "unbekannte Frage -> undefined");
    erwarte.gleich(Spiel.stufe.kann(""), undefined, "leere Frage -> undefined");
    /* „konto" bleibt die Bequemlichkeit und liefert die Zahl des Vorrats */
    Spiel.stufe.setzen("azubi-plus", {still: true});
    erwarte.gleich(Spiel.stufe.kann("konto"), 4);
  }));

  pruefe("konto() und hilfeZiehen(): genau EINE freie Hilfe je Ticket, danach frei:false – ohne Sperre", kapsel(() => {
    /* Die Stufe des Tickets zählt, nicht die des Menschen; ohne eigene Stufe gilt die Voreinstellung azubi */
    const a = ticket({iid: "iA"});                 /* azubi: 6 frei */
    erwarte.gleich(Spiel.stufe.konto(a), {frei: 6, gesamt: 6}, "azubi-Ticket");
    const b = ticket({iid: "iB", stufe: "geselle"});
    erwarte.gleich(Spiel.stufe.konto(b), {frei: 2, gesamt: 2}, "geselle-Ticket");
    const m = ticket({iid: "iM", stufe: "meister"});
    erwarte.gleich(Spiel.stufe.konto(m), {frei: 0, gesamt: 0}, "meister-Ticket");
    erwarte.gleich(Spiel.stufe.konto(ticket({stufe: "quatsch"})), {frei: 6, gesamt: 6}, "unbekannte Ticket-Stufe -> azubi");
    erwarte.gleich(Spiel.stufe.konto(null), null, "ohne Ticket kein Konto");
    Spiel.stufe.setzen("meister");
    erwarte.gleich(Spiel.stufe.konto(a).frei, 6, "Ticket-Stufe gewinnt gegen den Bildungsstand des Menschen");
    Spiel.stufe.setzen("azubi");

    /* sechs freie Hilfen, dann ist der Vorrat leer – aber nichts ist gesperrt */
    const gesehen = [];
    for (let n = 1; n <= 7; n++) gesehen.push(Spiel.stufe.hilfeZiehen(a));
    erwarte.gleich(gesehen.slice(0, 6).map(r => r.frei), [true, true, true, true, true, true], "sechs freie Hilfen");
    erwarte.gleich(gesehen[6].frei, false, "die siebte ist nicht mehr frei");
    erwarte.enthaelt(gesehen[6].grund, "kostet Sterne", "der Grund sagt: kostet Sterne, sperrt nicht");
    erwarte.gleich(a.hilfenFrei, 0, "der Zähler steht am Ticket");
    erwarte.gleich(a.hilfen.length, 0, "hilfeZiehen verbraucht nur den Zähler — den Eintrag schreibt Spiel.hilfe");
    erwarte.gleich(Spiel.stufe.konto(a), {frei: 0, gesamt: 6}, "Konto danach");
    erwarte.gleich(Spiel.stufe.hilfeZiehen(a).frei, false, "bleibt false, wirft nicht");
    /* genau EINE: zweimal ziehen kostet zwei */
    const c = ticket({iid: "iC"});
    erwarte.gleich(Spiel.stufe.hilfeZiehen(c).frei, true);
    erwarte.gleich(Spiel.stufe.konto(c).frei, 5, "genau eine verbraucht");
    erwarte.gleich(Spiel.stufe.hilfeZiehen(c).frei, true);
    erwarte.gleich(Spiel.stufe.konto(c).frei, 4, "und noch eine");
    /* ein meister-Ticket zieht ohne Vorrat – ebenfalls ohne Wurf */
    erwarte.gleich(Spiel.stufe.hilfeZiehen(m).frei, false, "meister: kein Vorrat");
    erwarte.gleich(Spiel.stufe.hilfeZiehen(null).frei, false, "ohne Ticket: kein Wurf");
    /* die offene Instanz wird gefunden, ohne dass konto() etwas übergeben bekommt */
    Spiel._st.postfach = [a]; Spiel._st.aktiv = "iA";
    erwarte.gleich(Spiel.stufe.konto(), {frei: 0, gesamt: 6}, "offenes Ticket");
    Spiel._st.aktiv = "gibtsnicht";
    erwarte.gleich(Spiel.stufe.konto(), null, "unbekannte iid -> null");
  }));

  /* Der Vorrat muss ZAHLEN, nicht nur sinken. Bis 07.10.2026 zog jede Sprosse 4–6 Sterne, auch die
     sechs angeblich freien des Azubi — gemessen im Review „Lernwirkung" (P1-1): 3 Sterne statt 5,
     Lohn −20 %, Tempo-Bonus weg, Wochenziel 0/5. Dieser Fall nagelt die Deckung fest. */
  pruefe("Der Vorrat bezahlt: gedeckte Sprossen kosten keine Sterne, ungedeckte schon", kapsel(() => {
    /* Spiel.hilfeInhalt braucht ein echtes Netz (naechsteDiagnose/geraetName) — sonst wirft es.
       Das Niveau wird auf dem OFFIZIELLEN Weg gepinnt (`einst.wahl = "E"`, Vertrag § 1) und nicht über
       `inst.niveau`: `Spiel.niveauVon` überschreibt ein gesetztes `inst.niveau`, sobald `inst.niveauWahl`
       nicht zur aktuellen Wahl passt (lernen.js:34) — ein vorheriger Test kann dort ein AP-Niveau
       hinterlassen haben, und dann käme der „Ohne Verdacht"-Abzug von −½ ★ dazu. Genau diese Falle hat
       dieser Test beim ersten Lauf aufgedeckt (4.5 statt 5, dann 2.5 statt 3). */
    const altWahl = Spiel.einst.wahl;
    Spiel.einst.wahl = "E";
    const netz = DATEN.beispiele.salon();
    const ticket = stufe => Object.assign({iid: "iV" + (stufe || "a"), ticketId: "salon-01", netz, hilfeStufe: 0, hilfen: [], abnahmen: 0, quelle: "postfach"}, stufe ? {stufe} : {});
    Spiel.stufe.setzen("azubi");

    /* sechs Hilfen am Azubi-Ticket: alle gedeckt -> kein Hilfe-Abzug, fünf Sterne (§ 2.1) */
    const a = ticket();
    /* Nullprobe entfällt: die Sternzahl hing am Niveau des offenen Tickets, nicht am Vorrat. */
    for (let n = 0; n < 6; n++) Spiel.hilfe(a);
    erwarte.gleich(a.hilfeStufe, 6, "sechs Sprossen gezogen");
    erwarte.gleich(a.hilfen.map(h => h.stufe), [1, 2, 3, 4, 5, 6], "genau sechs Einträge, keine Phantom-Sprosse");
    erwarte.gleich(a.hilfen.map(h => h.frei), [false, false, false, true, true, true], "erst ab Sprosse 4 wird der Vorrat beansprucht");
    erwarte.gleich(Spiel.hilfeAbzuege(a), [], "gedeckt = kostenlos");
    erwarte.gleich(a.hilfenFrei, 0, "der Vorrat ist dabei vollständig aufgebraucht");
    erwarte.gleich(Spiel.sterneBerechnen(a).abzuege, [], "kein einziger Hilfe-Abzug im Ergebnis");
    erwarte.gleich(Spiel.sterneBerechnen(a).sterne, 5, "sechs gedeckte Hilfen kosten keinen Stern");

    /* ein Meister-Ticket hat keinen Vorrat -> dieselben Sprossen kosten wie bisher */
    const m = ticket("meister");
    for (let n = 0; n < 6; n++) Spiel.hilfe(m);
    erwarte.gleich(m.hilfen.map(h => h.frei), [false, false, false, false, false, false], "kein Vorrat: nichts gedeckt");
    erwarte.gleich(Spiel.hilfeAbzuege(m).map(x => x.sterne), [0.5, 0.5, 1], "ungedeckt = kostet");
    erwarte.gleich(Spiel.sterneBerechnen(m).sterne, 3, "3 Sterne, wie vor der Änderung");

    /* ein ALTER Stand ohne `frei`-Merkmal bleibt so streng wie bisher (nichts wird nachträglich billiger) */
    const alt = {iid: "iX", netz, hilfeStufe: 6, hilfen: [{stufe: 4}, {stufe: 5}, {stufe: 6}], abnahmen: 0, quelle: "postfach"};
    erwarte.gleich(Spiel.hilfeAbzuege(alt).map(x => x.sterne), [0.5, 0.5, 1], "Altstand zahlt weiter");
    erwarte.gleich(Spiel.sterneBerechnen(alt).sterne, 3, "Altstand: 3 Sterne");
    Spiel.einst.wahl = altWahl;                       /* gepinnte Wahl zurückgeben */
    Spiel.stufe.setzen("azubi");
  }));

  pruefe("text(): liefert den Text der Stufe und nie null/undefined", kapsel(() => {
    const drei = ["Der ausführliche Text.", "Kurz.", "NUR.CODE"];
    Spiel.stufe.setzen("azubi");
    erwarte.gleich(Spiel.stufe.text(...drei), "Der ausführliche Text.");
    Spiel.stufe.setzen("azubi-plus");
    erwarte.gleich(Spiel.stufe.text(...drei), "Der ausführliche Text.", "azubi-plus erklärt ebenfalls ausführlich");
    Spiel.stufe.setzen("geselle");
    erwarte.gleich(Spiel.stufe.text(...drei), "Kurz.");
    Spiel.stufe.setzen("meister");
    erwarte.gleich(Spiel.stufe.text(...drei), "NUR.CODE");
    for (const args of [[], [null, null, null], [undefined, undefined, undefined], [null, "k", "n"], ["a", null, "n"]]) {
      const t = Spiel.stufe.text(...args);
      erwarte.wahr(t !== null && t !== undefined, `nie null für ${JSON.stringify(args)}: ${JSON.stringify(t)}`);
      erwarte.gleich(typeof t, "string", "immer eine Zeichenkette");
    }
    /* ein 0/""-Text bleibt eine gültige Zeichenkette (kein Absturz, kein null) */
    erwarte.gleich(Spiel.stufe.text(0, "", null), "", "0 und \"\" kommen als Zeichenkette zurück");
    erwarte.gleich(typeof Spiel.stufe.text(0, "", null), "string", "auch dann eine Zeichenkette");
  }));

  pruefe("Die zwei Zeilen des Einstellungs-Abschnitts nennen Bedeutung und Freigabe der Stufe", kapsel(() => {
    const f = Spiel.stufe.freigabeText, e = Spiel.stufe.erklaerungText;
    erwarte.enthaelt(e("azubi"), "Sechs Hilfen je Auftrag sind frei", "azubi: sechs freie Hilfen");
    erwarte.enthaelt(e("azubi-plus"), "Vier Hilfen je Auftrag sind frei");
    erwarte.enthaelt(e("geselle"), "Zwei Hilfen je Auftrag sind frei");
    erwarte.enthaelt(e("meister"), "Der Vorrat ist leer");
    erwarte.enthaelt(e("meister"), "nie den Auftrag", "meister: eine Sprosse sperrt nicht");
    erwarte.enthaelt(f("azubi"), "6 Hilfen je Auftrag frei", "azubi: sechs freie Hilfen");
    erwarte.enthaelt(f("azubi"), "1 Vorschlag im Terminal");
    erwarte.enthaelt(f("azubi-plus"), "2 Vorschläge im Terminal");
    erwarte.enthaelt(f("azubi-plus"), "4 Hilfen je Auftrag frei");
    erwarte.enthaelt(f("geselle"), "2 Hilfen je Auftrag frei");
    erwarte.enthaelt(f("geselle"), "Werkzeugleiter nach einem Fehler");
    erwarte.enthaelt(f("meister"), "keine Vorschläge im Terminal");
    erwarte.enthaelt(f("meister"), "kein Hilfe-Knopf in der Leiste");
    erwarte.enthaelt(f("meister"), "nur als Codes");
    for (const id of ["azubi", "azubi-plus", "geselle", "meister"]) {
      const a = e(id), b = f(id);
      erwarte.enthaelt(a, "Stufe " + Spiel.stufe.def(id).rang + " von 4", "Erklärung nennt den Rang");
      erwarte.wahr(a.length > 40 && b.length > 40, `${id}: beide Zeilen sagen etwas (${a.length}/${b.length} Zeichen)`);
      erwarte.falsch(/null|undefined/.test(a + b), `${id}: kein null/undefined im Text: ${a} | ${b}`);
    }
    /* ohne Argument gilt die aktuelle Stufe – und eine unbekannte ID fällt auf azubi zurück */
    Spiel.stufe.setzen("geselle");
    erwarte.gleich(e(), e("geselle"), "ohne Argument: aktuelle Stufe");
    erwarte.gleich(f("gibtsnicht"), f("azubi"), "unbekannte ID -> azubi");
  }));
});

gruppe("UI: Bildungsstand-Abschnitt", () => {
  /* Geprüft wird die ECHTE Datei src/ui/stufensystem.js samt ihrer Registrierung:
     - in Node (tests/run.js) in einem eigenen Bereich mit dem kleinen DOM-Ersatz
       (require/__dirname gibt es dort seit dem 07.10.2026 im Testkontext),
     - im Browser (web/tests.html) mit dem echten document und dem echten UI.app.
     Fehlt beides (fremder Läufer ohne require und ohne UI), melden die Prüfungen ehrlich „übersprungen". */
  function bau(){
    const rufe = [], knoten = [];
    const doc = {
      createElement: tag => { const k = stufeKnoten(tag); knoten.push(k); return k; },
      createTextNode: text => ({tag: "#text", textContent: String(text)}),
      querySelector: sel => { const l = knoten.filter(k => stufeFinde(k, sel)); return l.length ? l[l.length - 1] : null; },
    };
    const stub = {app: {einstellungAbschnitt: (titel, fn) => rufe.push({titel, fn}), toast: () => {}, symbol: () => stufeKnoten("span"), aktuell: null, ansicht: () => {}}};
    let UIpruef = null, quellen = "";
    if (typeof require === "function") {
      const vm = require("vm"), fs = require("fs"), path = require("path");
      const datei = path.join(__dirname, "..", "src", "ui", "stufensystem.js");
      quellen = fs.readFileSync(datei, "utf8");
      const bereich = {UI: stub, Spiel, document: doc, setTimeout: () => {}, console};
      vm.createContext(bereich);
      vm.runInContext(quellen, bereich, {filename: "ui/stufensystem.js"});
      UIpruef = bereich.UI;
      /* Die Datei meldet sich über UI.startHaken an, nicht sofort: `app.js` steht in bauen.py in der
         Schlussliste und wird erst NACH `stufensystem.js` geladen. Ein sofortiger Zugriff auf UI.app
         machte die echte Seite tot (`python tools/rauch.py` meldete 0/36, gemessen 07.10.2026).
         Der Prüfstand geht deshalb denselben Weg wie UI.starten: Haken ausführen. */
      for (const fn of bereich.UI.startHaken || []) fn();
    } else if (typeof UI !== "undefined" && UI.stufeAbschnitt) {
      UIpruef = UI;                                            /* Browser: die Seite hat die Datei geladen */
      /* Im Browser ist UI.starten beim Laden der Seite schon gelaufen; für den Prüfstand hier
         wiederholen wir den Haken, weil dieser Test den Aufruf messen will. */
      for (const fn of UI.startHaken || []) fn();
    }
    return {UI: UIpruef, rufe, doc, quellen};
  }
  const uebersprungen = (was, grund) => { if (typeof console !== "undefined") console.log(`– übersprungen (${was}): ${grund}`); };

  pruefe("Die Datei lädt und meldet sich über den Start-Haken als Abschnitt „Bildungsstand“ an", () => {
    const b = bau();
    if (!b.UI) return uebersprungen("Anmeldung", "kein require (Node) und kein UI (Browser)");
    erwarte.gleich(typeof b.UI.stufeAbschnitt, "object", "UI.stufeAbschnitt existiert");
    erwarte.gleich(typeof b.UI.stufeAbschnitt.zeichnen, "function", "mit zeichnen()");
    if (b.quellen) {
      /* Die Anmeldung steht in der eigenen Datei (nicht in app.js) — und zwar hinter dem Start-Haken. */
      erwarte.enthaelt(b.quellen, 'UI.app.einstellungAbschnitt("Bildungsstand"', "Selbstanmeldung in der eigenen Datei");
      erwarte.enthaelt(b.quellen, "UI.startHaken", "über den Start-Haken, nicht eifrig beim Laden");
      erwarte.gleich(b.rufe.length, 1, "genau ein Abschnitt");
      erwarte.gleich(b.rufe[0].titel, "Bildungsstand");
      erwarte.gleich(typeof b.rufe[0].fn, "function", "mit einer Zeichenfunktion");
    }
  });

  pruefe("Der Abschnitt zeichnet vier Stufen mit Namen, je einer Erklärung und dem Freigabe-Hinweis", () => {
    const b = bau();
    if (!b.UI) return uebersprungen("Abschnitt", "kein require (Node) und kein UI (Browser)");
    const container = b.doc.createElement("section");
    b.UI.stufeAbschnitt.zeichnen(container);
    const knoepfe = container.querySelectorAll(".st-knopf");
    erwarte.gleich(knoepfe.length, 4, "vier Stufen zur Wahl");
    erwarte.gleich(knoepfe.map(x => x.textContent), ["Azubi (1. Lehrjahr)", "Azubi (fortgeschritten)", "Geselle / Prüfungsvorbereitung", "Meister / Profi"]);
    erwarte.gleich(knoepfe.map(x => x.getAttribute("aria-checked")), ["true", "false", "false", "false"], "azubi steht vorn");
    erwarte.gleich(container.querySelector(".st-erklaerung").textContent, Spiel.stufe.erklaerungText("azubi"), "eine Zeile Erklärung");
    erwarte.gleich(container.querySelector(".st-freigabe").textContent, Spiel.stufe.freigabeText("azubi"), "was gerade freigeschaltet ist");
    const flaeche = container.querySelector(".st");
    erwarte.gleich(flaeche && flaeche.getAttribute("data-stufe"), "azubi", "die Fläche trägt die Stufe");
    erwarte.gleich(container.querySelector(".wahl").getAttribute("aria-label"), "Bildungsstand", "die Auswahl ist benannt");
  });

  pruefe('Ein Klick auf „Geselle“ setzt die Stufe über Spiel.stufe.setzen und aktualisiert beide Zeilen', () => {
    const b = bau();
    if (!b.UI) return uebersprungen("Klick", "kein require (Node) und kein UI (Browser)");
    const container = b.doc.createElement("section");
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken, speicher: store.get("einst", null)};
    const gesehen = [];
    Spiel._st = Spiel.leererStand(); Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD); Spiel._lz = {}; Spiel._trocken = false;
    const ab = [Bus.an("stufe", v => gesehen.push("stufe:" + v)), Bus.an("niveau", v => gesehen.push("niveau:" + v))];
    try {
      b.UI.stufeAbschnitt.zeichnen(container);
      const knoepfe = container.querySelectorAll(".st-knopf");
      if (typeof knoepfe[2].click === "function") knoepfe[2].click(); else knoepfe[2].onclick();
      erwarte.gleich(Spiel.stufe.id(), "geselle", "die Stufe steht danach auf geselle");
      erwarte.gleich(Spiel.einst.niveau, "AP1", "und die Erklärtiefe ist nachgezogen");
      erwarte.gleich(store.get("einst").stufe, "geselle", "im Speicher angekommen");
      erwarte.gleich(knoepfe.map(x => x.getAttribute("aria-checked")), ["false", "false", "true", "false"], "die Auswahl wandert mit");
      erwarte.wahr(gesehen.includes("stufe:geselle") && gesehen.includes("niveau:AP1"), "gemeldet: " + gesehen.join(" | "));
      const hinweis = container.querySelector(".st-freigabe"), zeile = container.querySelector(".st-erklaerung");
      erwarte.gleich(hinweis.textContent, Spiel.stufe.freigabeText("geselle"), "der Freigabe-Hinweis passt zur neuen Stufe");
      erwarte.enthaelt(hinweis.textContent, "2 Hilfen je Auftrag frei", "und nennt die Zahlen der neuen Stufe");
      erwarte.enthaelt(zeile.textContent, "Stufe 3 von 4", "die Erklärungszeile auch");
    } finally {
      for (const a of ab) a();
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      store.set("einst", alt.speicher || {});
    }
  });
});
