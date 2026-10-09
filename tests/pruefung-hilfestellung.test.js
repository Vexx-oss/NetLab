"use strict";
/* ================= GEGENPRÜFUNG V1: Stufen, Rückfall, Grenzen =================
   Unabhängige Prüfung gegen docs/entwicklung/Hilfestellung – Stufen und Schnittstellen.md.
   Dies ist KEIN Baustein-Test: die Fälle sind hier eigenständig formuliert, nicht aus den
   Testdateien der Bausteine übernommen. Wo die Prüfung vom Vertrag abweicht, steht das als
   BEFUND im Kommentar unten und als eigener, klar benannter Testfall (grün, weil er den
   gemessenen Ist-Stand festhält – ein Befund ohne Reproduktion zählt nicht).

   ---------------------------------------------------------------------------------------
   BEFUNDE (gemessen am 07.10.2026, node v24.21.0, Arbeitsbaum „ausbau-1.2")
   NACHTRAG 07.10.2026, abends (Lead): B2 und B3 sind BEHOBEN, B1 ist ENTSCHIEDEN.
   Die Testfälle weiter unten prüfen deshalb nicht mehr den Ist-Stand von damals,
   sondern die Behebung — so fällt ein Rückfall auf. Der Wortlaut der Befunde bleibt
   unverändert stehen, damit nachvollziehbar ist, was gefunden wurde.
   ---------------------------------------------------------------------------------------
   B1 · UNKLAR → ENTSCHIEDEN — der Vertrag widersprach sich bei „azubi-plus".
     Vertrag § 2, Zeile „Simulation: Gründe in Klartext": azubi-plus = „knapp (AP1)";
     Zeile „Terminal: Tipp zu falschem Befehl": azubi-plus = „knapp".
     Vertrag § 3, Codeblock Spiel.STUFE: azubi-plus = niveau „E", erklaerung „ausfuehrlich".
     Code folgt § 3 (src/spiel/stufensystem.js).
     ENTSCHEIDUNG: Die Erklärtiefe ist eine eigene Achse (§ 1) und wird vom Bildungsstand nur
     MITGEZOGEN. „azubi-plus" unterscheidet sich nicht durch kürzere Texte, sondern durch mehr
     und knappere Vorschläge und einen kleineren Vorrat. § 2 wurde entsprechend gezogen
     (Zeile „Simulation: Gründe in Klartext" heißt jetzt für azubi UND azubi-plus „ausführlich"),
     § 2 trägt dazu einen Nachtrag.

   B2 · UNKLAR → BEHOBEN — „erst nach Fehler" war über darf() nicht abfragbar.
     Vertrag § 2: geselle bekommt „Leiste/Mini: Hilfe-Knopf … nur nach falscher Antwort",
     „Anker … nur bei Fehler", „Werkzeugleiste … erst nach Fehler", „Terminal: Vorschläge …
     nur nach Fehler". Vertrag § 3 nannte darf(frage) als „true/false für Schalterfragen"
     – ohne Fehler-Kontext. Die Bedingung „nach Fehler" baute jede Fläche selbst nach
     (Baustein C: src/spiel/mini.js; Aufgabe I in src/cli/parser.js) → zwei Wahrheiten.
     BEHEBUNG: `Spiel.stufe.wann(flaeche)` → "immer" | "nachfehler" | "nein" und
     `Spiel.stufe.wannPasst(flaeche, {fehler})` → {ja, grund}. Vertrag § 2.2 regelt ausdrücklich,
     dass darf() und wann() zwei verschiedene Fragen sind; alle Flächen fragen wannPasst.
     `Spiel.mini.hilfe` und `Spiel.mini.anker` sind nachgezogen.

   B3 · LUECKE → BEHOBEN — zwei Zeilen der Tabelle § 2 hatten keinen Abfrageweg.
     Vertrag § 2: „Terminal: ‚Was geht hier?' | immer sichtbar | sichtbar | nach Fehler | nein"
     und „Terminal: Befehls-Gerüst (zeige) | ja … | ja, knapper Text | nein | nein".
     Vertrag § 3 zählte die öffentliche Fläche auf; ein Schalter dafür fehlte.
     Reproduktion von damals (für ALLE vier Stufen, auch azubi):
       Spiel.stufe.kann("geruest") → undefined        Spiel.stufe.darf("geruest") → false
       Spiel.stufe.kann("wasGeht") → undefined        Spiel.stufe.kann("einstieg") → undefined
     BEHEBUNG: Die Tabelle hat die drei Spalten `wasGeht`, `geruest`, `einstieg`, erreichbar über
     `kann()`; `darf("geruest")` ist ein eigener Schalter (weil „knapp" vorhanden, aber nicht true ist),
     `darf("wasGeht")` wird aus `kann("wasGeht") !== "nein"` ABGELEITET statt doppelt geführt.
     Vertrag § 2.3 hält die Abfragewege fest.

   GEPRÜFT, KEIN BEFUND (damit die Prüfung nachvollziehbar bleibt):
   · § 3 Regel 4 „kein Date.now": jetzt() wird in hilfeZiehen benutzt (src/spiel/stufensystem.js:139) –
     das ist die setzbare Projektuhr und trägt den Zeitstempel der bestehenden Liste inst.hilfen = {stufe, t}
     (§ 2.1). Math.random und Date.now kommen in der Datei nicht vor.
   · § 5 „nie die richtige Option": über alle Minis, beide Sprossen, geprüft gegen
     Spiel.mini.loesungText(m) und die richtige Option – ohne Treffer.
   · § 6 „Training zahlt kein Geld/Ruf" und „erscheint nie im Postfach": hält (Spiel.postfach()
     filtert quelle "training" in src/spiel/postfach.js:127).
   · § 1/§ 3 „setzen zieht die Erklärtiefe nach": hält; der einzige Fremdschreiber auf einst.stufe
     (src/spiel/erstestunde.js:201) ist der dokumentierte Rückfall ohne Baustein A und läuft im
     Normalfall über Spiel.stufe.setzen (Zeile 198).

   ABNAHME (selbst gemessen, 07.10.2026): diese Datei 16/16 grün, auch dreimal hintereinander und
   zusammen mit tests/spiel-mini-hilfe.test.js (26/26); voller Lauf tests/run.js dreimal 390/390,
   391/391, 391/391 grün · python tools/ethos.py GRÜN · python bauen.py läuft durch (116 Module).
   --------------------------------------------------------------------------------------- */

gruppe("Gegenprüfung: Stufen und Rückfall (§ 1–§ 3)", () => {
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
      speicher: store.get("einst", null), einstSetzen: Spiel.einstSetzen, speichern: Spiel.speichern, melden: Spiel.melden};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand();
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      Spiel.einstSetzen = alt.einstSetzen; Spiel.speichern = alt.speichern; Spiel.melden = alt.melden;
      store.set("einst", alt.speicher || {});
    }
  };
  const ticket = o => Object.assign({iid: "v1", hilfen: [], hilfeStufe: 0}, o);

  /* § 3: der Codeblock des Vertrags, hier unabhängig abgeschrieben (er ist die Zahlenseite des Vertrags).
     Nachgetragen 07.10.2026: Der Vertrag wurde um die drei Spalten `wasGeht`, `geruest`, `einstieg`
     erweitert (§ 2.3) — sie schließen den Gegenprüfungsbefund B3. Die Tabelle ist damit vollständig
     abfragbar; genau das prüft dieser Fall. */
  pruefe("§ 3: Spiel.STUFE und Spiel.HILFE_KONTO entsprechen dem Codeblock", kapsel(() => {
    erwarte.gleich(Spiel.stufe.alle(), [
      {id: "azubi",      rang: 1, name: "Azubi (1. Lehrjahr)",            kurz: "Azubi",   niveau: "E",   tipps: "alle",   vorschlaege: 1, leiter: "immer",       erklaerung: "ausfuehrlich", wasGeht: "immer",      geruest: true,    einstieg: true},
      {id: "azubi-plus", rang: 2, name: "Azubi (fortgeschritten)",        kurz: "Azubi+",  niveau: "E",   tipps: "fehler", vorschlaege: 2, leiter: "immer",       erklaerung: "ausfuehrlich", wasGeht: "immer",      geruest: "knapp", einstieg: true},
      {id: "geselle",    rang: 3, name: "Geselle / Prüfungsvorbereitung", kurz: "Geselle", niveau: "AP1", tipps: "fehler", vorschlaege: 1, leiter: "nachfehler", erklaerung: "knapp",        wasGeht: "nachfehler", geruest: false,   einstieg: false},
      {id: "meister",    rang: 4, name: "Meister / Profi",                kurz: "Meister", niveau: "AP2", tipps: "keine",  vorschlaege: 0, leiter: "nein",        erklaerung: "nurcodes",     wasGeht: "nein",       geruest: false,   einstieg: false},
    ]);
    erwarte.gleich(Spiel.HILFE_KONTO, {azubi: 6, "azubi-plus": 4, geselle: 2, meister: 0});
    /* Die Kopie darf den Vertrag nicht verändern (§ 3 „Kopie, nie das Original"). */
    const kopie = Spiel.stufe.alle();
    kopie[0].rang = 9; kopie.length = 0;
    erwarte.gleich(Spiel.stufe.alle().map(s => s.rang), [1, 2, 3, 4]);
  }));

  /* § 2, linke Spaltenhälfte: die Werte, die kann() beantwortet. */
  pruefe("§ 2: kann() liefert je Stufe Vorschläge, Tipps, Leiter, Erklärtiefe und Vorrat", kapsel(() => {
    const soll = {
      "azubi":      {vorschlaege: 1, tipps: "alle",   leiter: "immer",      niveau: "E",   erklaerung: "ausfuehrlich", konto: 6},
      "azubi-plus": {vorschlaege: 2, tipps: "fehler", leiter: "immer",      niveau: "E",   erklaerung: "ausfuehrlich", konto: 4},
      "geselle":    {vorschlaege: 1, tipps: "fehler", leiter: "nachfehler", niveau: "AP1", erklaerung: "knapp",        konto: 2},
      "meister":    {vorschlaege: 0, tipps: "keine",  leiter: "nein",       niveau: "AP2", erklaerung: "nurcodes",     konto: 0},
    };
    for (const [id, werte] of Object.entries(soll)) {
      Spiel.stufe.setzen(id, {still: true});
      for (const [frage, wert] of Object.entries(werte)) erwarte.gleich(Spiel.stufe.kann(frage), wert, `${id}: kann("${frage}")`);
      erwarte.gleich(Spiel.stufe.rang(), Spiel.stufe.def(id).rang, `${id}: rang()`);
      erwarte.gleich(Spiel.stufe.id(), id, `${id}: id()`);
    }
  }));

  /* § 2, rechte Spaltenhälfte: die Schalter, die darf() beantwortet. */
  pruefe("§ 2: darf() liefert je Stufe die Schalter (bei meister alle vier aus)", kapsel(() => {
    const soll = {
      "azubi":      [true, true, true, true],
      "azubi-plus": [true, true, true, true],
      "geselle":    [true, true, true, true],     /* sichtbar – die Bedingung „erst nach Fehler" fehlt hier (Befund B2) */
      "meister":    [false, false, false, false],
    };
    for (const [id, werte] of Object.entries(soll)) {
      Spiel.stufe.setzen(id, {still: true});
      erwarte.gleich([Spiel.stufe.darf("leiter"), Spiel.stufe.darf("anker"), Spiel.stufe.darf("miniHilfe"), Spiel.stufe.darf("training")], werte, id);
    }
    Spiel.stufe.setzen("azubi", {still: true});
    erwarte.gleich(Spiel.stufe.darf("gibtsnicht"), false, "unbekannte Schalterfrage rät nicht");
    erwarte.gleich(Spiel.stufe.kann("gibtsnicht"), undefined, "unbekannte Tabellenfrage wirft nicht");
  }));

  /* § 3, Regel 1: kein Wurf, immer „azubi". */
  pruefe("§ 3: fehlend/null/Array/Unsinn in einst.stufe → immer azubi, kein Wurf", kapsel(() => {
    for (const unsinn of [undefined, null, "", "GIBTSNICHT", "azubi plus", 3, true, [], {}, ["geselle"], {id: "meister"}]) {
      Spiel._einst.stufe = unsinn;
      const was = [];
      const falle = [];
      const rufe = [
        ["id", () => Spiel.stufe.id()], ["rang", () => Spiel.stufe.rang()], ["def", () => Spiel.stufe.def()],
        ["alle", () => Spiel.stufe.alle().length], ["kann", () => Spiel.stufe.kann("vorschlaege")],
        ["darf", () => Spiel.stufe.darf("miniHilfe")], ["erklaerung", () => Spiel.stufe.erklaerung()],
        ["konto", () => Spiel.stufe.konto(ticket())], ["hilfeZiehen", () => Spiel.stufe.hilfeZiehen(ticket())],
        ["text", () => Spiel.stufe.text("a", "k", "n")], ["freigabeText", () => Spiel.stufe.freigabeText()],
      ];
      for (const [name, f] of rufe) { try { was.push([name, f()]); } catch (e) { falle.push(name + ": " + e.message); } }
      erwarte.gleich(falle, [], `Wurf bei einst.stufe = ${JSON.stringify(unsinn)}`);
      erwarte.gleich(was[0][1], "azubi", `id() bei ${JSON.stringify(unsinn)}`);
      erwarte.gleich(was[1][1], 1, `rang() bei ${JSON.stringify(unsinn)}`);
      erwarte.gleich(was[4][1], 1, `kann("vorschlaege") bei ${JSON.stringify(unsinn)}`);
      erwarte.gleich(was[5][1], true, `darf("miniHilfe") bei ${JSON.stringify(unsinn)}`);
      erwarte.gleich(was[6][1], "ausfuehrlich", `erklaerung() bei ${JSON.stringify(unsinn)}`);
    }
    delete Spiel._einst.stufe;
    erwarte.gleich(Spiel.stufe.id(), "azubi", "fehlendes Feld");
  }));

  /* § 1/§ 3: setzen zieht die Erklärtiefe nach und schreibt über Spiel.einstSetzen. */
  pruefe("§ 3: setzen geht über Spiel.einstSetzen und zieht nur das niveau nach", kapsel(() => {
    const gerufen = [];
    const echt = Spiel.einstSetzen;
    Spiel.einstSetzen = (k, v) => { gerufen.push([k, v]); Spiel._einst[k] = v; };
    try {
      Spiel.stufe.setzen("geselle");
      erwarte.gleich(gerufen, [["stufe", "geselle"], ["niveau", "AP1"]], "genau zwei Schreibvorgänge, in dieser Reihenfolge");
      /* Die Erklärtiefe darf danach einzeln verstellt werden und bleibt stehen (§ 1). */
      Spiel.einstSetzen("niveau", "AP2");
      erwarte.gleich(Spiel.stufe.id(), "geselle", "die Stufe bleibt davon unberührt");
      erwarte.gleich(Spiel.einst.niveau, "AP2");
      /* Ohne eigenen Schreibweg darf setzen nichts in den Speicher schreiben. */
      Spiel.einstSetzen = () => {};
      const vorher = JSON.stringify(store.get("einst", {}));
      Spiel.stufe.setzen("meister");
      erwarte.gleich(JSON.stringify(store.get("einst", {})), vorher, "kein Schreiben am einstSetzen vorbei");
    } finally { Spiel.einstSetzen = echt; }
  }));

  /* § 2.1: der Vorrat hängt am Ticket, nicht am Menschen – und sperrt nie. */
  pruefe("§ 2.1: hilfeZiehen verbraucht genau eine freie Hilfe je Ticket und sperrt nichts", kapsel(() => {
    const a = ticket({iid: "vA"});
    erwarte.gleich(Spiel.HILFE_KONTO, {azubi: 6, "azubi-plus": 4, geselle: 2, meister: 0}, "Vertragszahlen");
    erwarte.gleich(Spiel.stufe.konto(a), {frei: 6, gesamt: 6}, "azubi-Ticket");
    Spiel.stufe.setzen("meister", {still: true});                 /* der Mensch steht auf meister … */
    erwarte.gleich(Spiel.stufe.konto(a), {frei: 6, gesamt: 6}, "… das Ticket behält seinen Vorrat");
    Spiel.stufe.setzen("azubi", {still: true});
    const gezogen = [];
    for (let n = 0; n < 8; n++) gezogen.push(Spiel.stufe.hilfeZiehen(a));
    erwarte.gleich(gezogen.slice(0, 6).map(r => r.frei), Array(6).fill(true), "sechs freie Hilfen");
    erwarte.gleich(gezogen.slice(6).map(r => r.frei), [false, false], "danach nur noch nicht-frei");
    erwarte.gleich(a.hilfen.length, 6, "genau sechs Einträge in inst.hilfen");
    erwarte.gleich(Spiel.stufe.hilfeZiehen(a).grund.includes("kostet Sterne"), true, "der Grund nennt die Kosten, nicht eine Sperre");
    /* Ein meister-Ticket hat keinen Vorrat – die Sprosse bleibt trotzdem offen (kein Wurf, kein Riegel). */
    const m = ticket({iid: "vM", stufe: "meister"});
    erwarte.gleich([Spiel.stufe.konto(m), Spiel.stufe.hilfeZiehen(m).frei], [{frei: 0, gesamt: 0}, false]);
    erwarte.gleich(Spiel.stufe.hilfeZiehen(null).frei, false, "ohne Ticket kein Wurf");
    erwarte.gleich(Spiel.stufe.konto(null), null, "ohne Ticket kein Konto");
  }));

  /* § 3, Regel 2 und 4: kein Lernmotor, kein Zufall, keine Uhr – statisch und im Verhalten.
     „jetzt()" ist die setzbare Projektuhr (kern/basis.js) und trägt in hilfeZiehen den Zeitstempel
     der bestehenden Liste inst.hilfen = {stufe, t} (§ 2.1) – verboten sind Math.random und Date.now. */
  pruefe("§ 3: stufensystem.js liest kein L, keinen Zufall und keine Uhr", () => {
    const quelle = require("fs").readFileSync(require("path").join(__dirname, "..", "src", "spiel", "stufensystem.js"), "utf8");
    const ohneKommentar = quelle.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
    erwarte.falsch(/\bL\s*[.[(]/.test(ohneKommentar), "kein Zugriff auf den Lernmotor");
    erwarte.falsch(/Math\.random/.test(ohneKommentar), "kein Math.random");
    erwarte.falsch(/Date\.now|new Date/.test(ohneKommentar), "keine Uhr");
  });

  /* § 3: text() ist nie null – auch bei null/undefined/0. */
  pruefe("§ 3: text() liefert nie null, auch bei leeren Eingaben", kapsel(() => {
    for (const id of ["azubi", "azubi-plus", "geselle", "meister"]) {
      Spiel.stufe.setzen(id, {still: true});
      for (const args of [[], [null, null, null], [undefined, undefined, undefined], ["A", null, "C"], [0, false, ""]]) {
        const t = Spiel.stufe.text(...args);
        erwarte.wahr(t !== null && t !== undefined, `${id}: text(${JSON.stringify(args)}) ist ${t}`);
        erwarte.gleich(typeof t, "string", `${id}: text() liefert eine Zeichenkette`);
      }
    }
  }));

  /* ---------- Befunde aus der Gegenprüfung vom 07.10.2026 ----------
     Die drei Fälle unten hielten den damals gemessenen Ist-Stand fest. **B2 und B3 sind inzwischen
     behoben** — der Vertrag wurde um § 2.2 (wann erscheint eine Hilfe) und § 2.3 (Abfragewege) erweitert,
     `Spiel.stufe.wann`/`wannPasst` und die drei Tabellenspalten `wasGeht`/`geruest`/`einstieg` kamen dazu.
     Die Fälle prüfen deshalb jetzt die **Behebung**, damit ein Rückfall auffällt. B1 bleibt ein
     Vertragsproblem und ist in § 2 als Nachtrag entschieden (Erklärtiefe ist eine eigene Achse). */
  pruefe("B1 (entschieden): azubi-plus unterscheidet sich durch Vorschläge und Vorrat, nicht durch Texte", kapsel(() => {
    Spiel.stufe.setzen("azubi-plus", {still: true});
    erwarte.gleich(Spiel.stufe.def("azubi-plus").niveau, "E", "§ 3: niveau");
    erwarte.gleich(Spiel.stufe.erklaerung(), "ausfuehrlich", "§ 3: erklaerung (und tipps: " + Spiel.stufe.kann("tipps") + ")");
    /* Der Unterschied zu azubi liegt genau hier – das ist der entschiedene Kern von B1. */
    erwarte.gleich([Spiel.stufe.kann("vorschlaege"), Spiel.stufe.kann("konto"), Spiel.stufe.kann("tipps")], [2, 4, "fehler"], "mehr Vorschläge, kleinerer Vorrat, knappere Tipps als azubi");
    erwarte.gleich(Spiel.stufe.erklaerung(), Spiel.stufe.def("azubi").erklaerung, "die Erklärtiefe ist NICHT der Unterschied");
  }));

  pruefe("B2 (behoben): wannPasst() beantwortet „erst nach Fehler“ – keine zweite Wahrheit mehr", kapsel(() => {
    Spiel.stufe.setzen("geselle", {still: true});
    erwarte.gleich(Spiel.stufe.darf("miniHilfe"), true, "darf() sagt nur: verfügbar");
    erwarte.gleich(Spiel.stufe.wann("miniHilfe"), "nachfehler", "wann() nennt die Bedingung");
    erwarte.gleich(Spiel.stufe.wannPasst("miniHilfe", {fehler: false}).ja, false, "ohne Fehler noch nicht");
    erwarte.gleich(Spiel.stufe.wannPasst("miniHilfe", {fehler: true}).ja, true, "nach einem Fehler schon");
    erwarte.gleich(Spiel.stufe.wannPasst("miniHilfe").ja, false, "fehlt der Zustand, gilt „noch kein Fehler“ (nichts verraten)");
    Spiel.stufe.setzen("azubi", {still: true});
    erwarte.gleich(Spiel.stufe.wann("miniHilfe"), "immer", "azubi sieht sie sofort");
    Spiel.stufe.setzen("meister", {still: true});
    erwarte.gleich(Spiel.stufe.wannPasst("miniHilfe", {fehler: true}), {ja: false, grund: "diese Stufe will keine Hilfe"}, "meister nie");
  }));

  pruefe("B3 (behoben): „Was geht hier?“ und „Befehls-Gerüst“ sind über Spiel.stufe abfragbar", kapsel(() => {
    const werte = {};
    for (const id of ["azubi", "azubi-plus", "geselle", "meister"]) {
      Spiel.stufe.setzen(id, {still: true});
      werte[id] = [Spiel.stufe.kann("geruest"), Spiel.stufe.darf("geruest"), Spiel.stufe.kann("wasGeht")];
    }
    erwarte.gleich(werte, {
      "azubi":      [true,    true,  "immer"],
      "azubi-plus": ["knapp", true,  "immer"],
      "geselle":    [false,   false, "nachfehler"],
      "meister":    [false,   false, "nein"],
    }, "jede Zeile der Tabelle § 2 hat einen Abfrageweg");
  }));
});

gruppe("Gegenprüfung: Grenzen von Mini und Training (§ 5, § 6)", () => {
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, trocken: Spiel._trocken, speicher: store.get("einst", null)};
    try {
      Spiel._trocken = true;
      Spiel._st = Spiel.leererStand();
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._trocken = alt.trocken;
      store.set("einst", alt.speicher || {});
      if (typeof Spiel.stufe !== "undefined" && Spiel.stufe) Spiel.stufe.setzen("azubi", {still: true});
    }
  };
  const klein = x => String(x == null ? "" : x).toLowerCase().replace(/\s+/g, " ").trim();
  /* „wörtlich" heißt: als eigenes Wort. Punkt, Schrägstrich, Bindestrich zählen mit, damit
     „192.168.1.77" nicht in „192.168.1.77/24" anschlägt – und umgekehrt. */
  const nennt = (text, option) => {
    const w = klein(option);
    if (w.length < 4) return false;
    return new RegExp("(^|[^a-z0-9./-])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9./-]|$)").test(klein(text));
  };
  const richtigeOptionen = m => {
    if (!m || !m.optionen) return [];
    if (m.art === "wahl" || m.art === "vorhersage") return [m.optionen[m.richtig]];
    if (m.art === "zuordnen") return m.richtig.flatMap(([l, r]) => [m.optionen.links[l], m.optionen.rechts[r]]);
    if (m.art === "reihenfolge") return [...new Set(m.richtig)].map(i => m.optionen[i]);
    return [];
  };
  const falsch = m => m.art === "wahl" || m.art === "vorhersage" ? (m.richtig + 1) % m.optionen.length : m.richtig;
  /* Alle Hilfetexte eines Minis einsammeln – je Stufe, so oft wie der Vertrag Sprossen erlaubt. */
  const hilfen = m => {
    const raus = [];
    for (let n = 0; n < 4; n++) { const h = Spiel.mini.hilfe(m.id); if (!h) break; raus.push(h); }
    return raus;
  };

  pruefe("§ 5: hilfe() liefert nie den Lösungstext – alle Minis, alle vier Stufen", kapsel(() => {
    const treffer = [];
    for (const stufe of ["azubi", "azubi-plus", "geselle", "meister"]) {
      for (const m of Spiel.mini.alle()) {
        Spiel.stufe.setzen(stufe, {still: true});
        if (stufe === "geselle") Spiel.mini.antworten(m.id, falsch(m));   /* geselle: erst nach falscher Antwort */
        for (const h of hilfen(m)) {
          const loesung = Spiel.mini.loesungText(m);
          if (loesung && klein(h.text).includes(klein(loesung))) treffer.push(`${m.id}/${stufe}: „${loesung}“`);
          if (!h.text || !String(h.text).trim()) treffer.push(`${m.id}/${stufe}: leerer Text`);
        }
      }
    }
    erwarte.gleich(treffer.slice(0, 12), []);
  }));

  pruefe("§ 5: hilfe() nennt nie die richtige Option wörtlich", kapsel(() => {
    Spiel.stufe.setzen("azubi", {still: true});
    const treffer = [];
    for (const m of Spiel.mini.alle()) {
      for (const h of hilfen(m)) {
        for (const o of richtigeOptionen(m)) if (o && nennt(h.text, o)) treffer.push(`${m.id} (${h.art}): „${o}“`);
      }
    }
    /* Wenn hier etwas steht, ist es ein Befund gegen § 5 („Nie die richtige Option") – kein Testfehler. */
    erwarte.gleich(treffer.slice(0, 12), []);
  }));

  pruefe("§ 6: Training zahlt kein Geld und keinen Ruf", kapsel(() => {
    let gestartet = null;
    for (const def of Spiel.TRAINING) { const r = Spiel.training.starten(def.id); if (r && r.ok) { gestartet = {def, iid: r.iid}; break; } }
    erwarte.wahr(!!gestartet, "mindestens ein Szenario lässt sich im Testlauf starten");
    const vorher = {euro: Spiel.st.euro, ruf: Spiel.st.ruf};
    const ergebnis = Spiel.training.abnehmen(gestartet.iid, {ergebnisse: [], bestanden: true, sterne: 2});
    erwarte.wahr(ergebnis.ok !== false, "die Abnahme läuft: " + JSON.stringify(ergebnis.grund || ""));
    erwarte.gleich({euro: Spiel.st.euro, ruf: Spiel.st.ruf}, vorher, "kein Euro, kein Ruf");
    erwarte.gleich([ergebnis.euro, ergebnis.ruf], [0, 0], "das Ergebnis weist 0/0 aus");
  }));

  pruefe("§ 6: Training zählt für den Lernmotor, aber weiterhin ohne Geld und Ruf", kapsel(() => {
    const echt = {ueben: L.ueben, fehler: L.fehler, speichern: Spiel.speichern, melden: Spiel.melden, sofort: Spiel.sofortSpeichern};
    let geuebt = 0;
    try {
      /* Nur die Speicherwege stillegen – der Lernmotor soll hier wirklich zählen. */
      Spiel.speichern = () => {}; Spiel.melden = () => {}; Spiel.sofortSpeichern = () => Promise.resolve(false);
      let gestartet = null;
      for (const def of Spiel.TRAINING) { const r = Spiel.training.starten(def.id); if (r && r.ok) { gestartet = {def, iid: r.iid}; break; } }
      erwarte.wahr(!!gestartet, "mindestens ein Szenario lässt sich im Testlauf starten");
      L.ueben = () => { geuebt++; return {vorher: 0, nachher: 1}; };
      L.fehler = () => {};
      Spiel._trocken = false;                       /* nur für diese Abnahme */
      const e = Spiel.training.abnehmen(gestartet.iid, {ergebnisse: [], bestanden: true, sterne: 3});
      erwarte.wahr(e.ok !== false, "die Abnahme läuft");
      erwarte.wahr(geuebt >= 1, `L.ueben wurde gerufen (${geuebt}×)`);
      erwarte.gleich({euro: Spiel.st.euro, ruf: Spiel.st.ruf}, {euro: 0, ruf: 0}, "trotzdem kein Euro und kein Ruf");
    } finally {
      Spiel._trocken = true;
      L.ueben = echt.ueben; L.fehler = echt.fehler;
      Spiel.speichern = echt.speichern; Spiel.melden = echt.melden; Spiel.sofortSpeichern = echt.sofort;
    }
  }));

  pruefe("§ 6: eine Trainingsinstanz erscheint nicht im Postfach", kapsel(() => {
    let gestartet = null;
    for (const def of Spiel.TRAINING) { const r = Spiel.training.starten(def.id); if (r && r.ok) { gestartet = {def, iid: r.iid}; break; } }
    erwarte.wahr(!!gestartet, "mindestens ein Szenario lässt sich im Testlauf starten");
    const sichtbar = Spiel.postfach().map(i => i.iid);
    erwarte.falsch(sichtbar.includes(gestartet.iid), `Trainingsdurchgang ${gestartet.iid} steht im Postfach`);
    erwarte.gleich(Spiel.offen(), Spiel.postfach().length, "und zählt nicht als offenes Ticket");
    /* Der Durchgang liegt trotzdem im Spielstand – sonst fände Spiel.oeffnen ihn nicht. */
    erwarte.wahr(Spiel.st.postfach.some(i => i.iid === gestartet.iid), "die Instanz liegt im Spielstand");
    erwarte.gleich(Spiel.st.postfach.find(i => i.iid === gestartet.iid).quelle, "training", "mit quelle training");
  }));
});
