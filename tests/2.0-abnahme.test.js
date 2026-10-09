"use strict";
/* ABNAHME DES 2.0-FUNDAMENTS (task-15) — EINE Datei, die das ZUSAMMENSPIEL prüft.
   Die einzelnen Teammates haben ihre Bausteine selbst geprüft; hier geht es um die Zusage im
   ECHTEN FLUSS, nicht um die Einzeltabelle:

     1. ÜBERGABE       — zwei Azubis nacheinander am selben Rechner.
     2. ERGEBNIS       — `Spiel.ergebnisText` liefert nichtleeren, stabilen Klartext.
     3. KLASSENRAUM    — keine Karrierewirkung, mit dem normalen Auftrag als Kontrolle.
     4. DETERMINISMUS  — derselbe Code + Seed ⇒ derselbe Auftrag, unabhängig vom Flow-Stand.
     5. HILFEVORRAT    — der Vorrat folgt dem Bildungsstand, nie still dem Standard.
     6. DENKHILFEN     — jeder Eintrag kommt wörtlich zurück; `mini-link-2` bleibt bewusst leer.
     7. TRAININGSKARTEN— offen heißt startbar, gesperrt heißt ehrlich abgelehnt.

   Kein DOM, kein Browser: alles läuft headless in `node tests/run.js`. Die Datei ist zusätzlich
   ALLEIN lauffähig (`node tests/2.0-abnahme.test.js`) — sie lädt dann dieselben Schichten wie
   `tests/run.js` selbst nach (Bauart von tests/ui-training.test.js).

   Jeder Fall führt den ECHTEN Weg: `Spiel.instanzErstellen` → `Spiel.oeffnen` → Lösung →
   `Spiel.abnahme` → `Spiel.abschliessen` (Vorbild tests/spiel-durchspiel.test.js). Jede Zusicherung
   steht in einem `pruefe(...)`-Rumpf; im Gruppenrumpf steht keine — ein Wurf dort wäre Exit 2 für
   den ganzen Lauf. */

function a2HatRequire(){ try { return typeof require === "function"; } catch (e) { return false; } }

/* ---------------- Allein lauffähig ----------------
   Dieselbe Ladereihenfolge wie tests/run.js: alle headless-Schichten, dann der Rahmen, dann diese
   Datei. Danach läuft dieselbe Datei noch einmal — dann mit Spiel, require und Umgebung. */
function a2AlleinLaden(){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const W = path.resolve(__dirname, ".."), SRC = path.join(W, "src");
  const SCH = [["kern", ["basis.js", "netz.js"]], ["@lernmotor", []], ["modell", ["geraete.js"]], ["sim", ["engine.js"]],
               ["cli", ["parser.js"]], ["daten", ["basis.js"]], ["spiel", ["zustand.js"]]];
  const LM = [path.resolve(W, "..", "FISI-Spielhalle", "src", "lernmotor.js"), path.join(W, "fremd", "lernmotor.js")].find(f => fs.existsSync(f));
  const KOPF = /^\/\*\s*=+[\s\S]*?=+\s*\*\/\s*/;
  const code = ['"use strict"; const LABOR_VERSION = "test";'];
  for (const [ordner, kopf] of SCH) {
    if (ordner === "@lernmotor") { let t = fs.readFileSync(LM, "utf8"); if (LM.includes("fremd")) t = t.replace(KOPF, ""); code.push(t); continue; }
    const d = path.join(SRC, ordner), alle = fs.readdirSync(d).filter(n => n.endsWith(".js")).sort();
    for (const n of [...kopf.filter(x => alle.includes(x)), ...alle.filter(x => !kopf.includes(x))]) code.push(fs.readFileSync(path.join(d, n), "utf8"));
  }
  code.push(fs.readFileSync(path.join(__dirname, "harness.js"), "utf8"));
  code.push(fs.readFileSync(__filename, "utf8"));
  code.push("testsAusfuehren();");
  const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename});
  let ergebnisse;
  try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "2.0-abnahme.test.js"}); }
  catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
  const rot = ergebnisse.filter(e => !e.ok);
  for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
  console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
  process.exit(rot.length ? 1 : 0);
}
if (typeof Spiel === "undefined" && typeof document === "undefined" && a2HatRequire()) a2AlleinLaden();

gruppe("2.0-Abnahme: das Fundament im echten Fluss", () => {
  const T0 = Date.UTC(2026, 9, 9, 9, 0, 0);

  /* ---------- Zwei Kapseln ----------
     (a) ECHTER Speicher: für die Übergabe. Sie verspricht, dass Einstellungen im Speicher bleiben
         und der Lernstand des Motors wirklich geleert wird — mit `_trocken` (das `store.set`
         überspringt, zustand.js:200) wäre das nicht messbar. Danach wird alles zurückgelegt.
     (b) TROCKENER Stand: für alles andere. Kein Speichern, keine Bus-Ereignisse, alles zurück. */
  const kapselEcht = fn => () => {
    const altSpeicher = store.alles(), altLern = tief(L.st), altSt = Spiel._st, altEinst = Spiel._einst,
          altLz = Spiel._lz, altGen = Spiel.generierte, uhr = jetzt();
    try {
      jetzt.setzen(T0);
      store.set("einst", {});
      Spiel._einst = null;
      Spiel.neu();
      fn();
    } finally {
      Spiel.generierte = altGen;
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, altSpeicher);
      const s = L.st; for (const k of Object.keys(s)) delete s[k]; Object.assign(s, altLern);
      Spiel._st = altSt; Spiel._einst = altEinst; Spiel._lz = altLz;
      jetzt.setzen(uhr); jetzt.frei();
    }
  };
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken, gen: Spiel.generierte,
                 standardStufe: Spiel.EINST_STANDARD.stufe, einstStore: store.get("einst", null), uhr: jetzt()};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      Spiel.generierte = alt.gen;
      Spiel.EINST_STANDARD.stufe = alt.standardStufe;
      store.set("einst", alt.einstStore);
      jetzt.setzen(alt.uhr); jetzt.frei();
    }
  };

  /* Ein Auftrag geht den ECHTEN Weg bis zum Ergebnis — wie in Spiel.testlauf (abnahme.js:216-230),
     nur ohne `quelle:"pruefung"`, damit die Karrierewege wirklich laufen. */
  function a2Auftrag(o = {}){
    const inst = Spiel.instanzErstellen(Object.assign({ticketId: o.ticketId || "salon-05", seed: o.seed}, o.quelle ? {quelle: o.quelle} : {}));
    Spiel._einst.wahl = Spiel.defVon(inst).stufe || "E";
    Spiel.oeffnen(inst.iid);
    const def = Spiel.defVon(inst);
    Spiel.loesung(inst.netz, def.loesung);
    Spiel.arbeitszieleErfuellen(inst);
    const ab = Spiel.abnahme(inst);
    const erg = Spiel.abschliessen(inst, ab);
    return {inst, def, ab, erg};
  }
  /* Das Karriere-Bild: genau die Größen, die ein Klassenraum-Auftrag NICHT anfassen darf. */
  const a2Bild = () => JSON.stringify({euro: Spiel.st.euro, ruf: Spiel.st.ruf, erledigt: Spiel.st.erledigt.length,
    buch: Spiel.st.buch.length, kunden: Spiel.st.kunden, wochenziel: Spiel.st.wochenziel});

  /* ================= 1. ÜBERGABE ================= */
  pruefe("ÜBERGABE: Azubi 1 spielt durch, Azubi 2 bekommt einen freien Rechner mit gefülltem Postfach", kapselEcht(() => {
    /* Azubi 1 arbeitet wirklich: ein Auftrag bis zum Abschluss (nicht von Hand in `erledigt` geschoben). */
    const erster = a2Auftrag({ticketId: "salon-01"});
    erwarte.wahr(erster.erg.bestanden === true, "der Auftrag des Vorgängers ist bestanden");
    erwarte.wahr(Spiel.st.euro > 0 && Spiel.st.erledigt.length === 1, "der Rechner ist benutzt: Geld da, ein erledigter Auftrag");
    /* Einstellungen, wie die Oberfläche sie setzt */
    Spiel.einstSetzen("stufe", "geselle");
    Spiel.einstSetzen("ton", "aus");
    /* Lernstand: der Motor schreibt wirklich mit */
    L.ueben("lab.link", true);
    const box = L.box("lab.link");
    erwarte.wahr(box > 0, "der Lernstand des Vorgängers steht");
    /* Und der OFFENE Auftrag — genau der, in dem Azubi 2 vorher stecken blieb. */
    const offen = Spiel.instanzErstellen({ticketId: "salon-02"});
    Spiel.oeffnen(offen.iid);
    erwarte.gleich(Spiel.aktiveInstanz() && Spiel.aktiveInstanz().iid, offen.iid, "vor der Übergabe steckt ein Auftrag offen");

    const r = Spiel.uebergabe();
    erwarte.gleich(r.ok, true, "die Übergabe gelingt");
    erwarte.gleich(Spiel.aktiveInstanz(), null, "KEIN offener Auftrag mehr");
    erwarte.gleich(Spiel.st.aktiv, null, "auch im Spielstand steht keiner mehr");
    erwarte.gleich(Spiel.st.postfach.includes(offen), false, "der offene Auftrag des Vorgängers ist aus dem Postfach");
    erwarte.wahr(Spiel.postfach().length > 0, "das Postfach ist wieder gefüllt");
    erwarte.gleich(Spiel.einst.stufe, "geselle", "der Bildungsstand bleibt");
    erwarte.gleich(Spiel.einst.ton, "aus", "die Klang-Einstellung bleibt");
    erwarte.gleich(store.get("einst", {}).stufe, "geselle", "und im Speicher, nicht nur im Zwischenspeicher");
    erwarte.gleich(L.box("lab.link"), box, "der Lernstand bleibt (Standard: behalten)");

    /* DER PRAXISBEWEIS: Azubi 2 fängt sofort an — der erste Posten lässt sich öffnen. */
    const posten = Spiel.postfach()[0];
    const zwei = Spiel.oeffnen(posten.iid);
    erwarte.wahr(!!zwei.inst, "Azubi 2 öffnet den ersten Auftrag");
    erwarte.gleich(Spiel.aktiveInstanz().iid, posten.iid, "und er ist wirklich der aktive Auftrag");
  }));

  pruefe("ÜBERGABE: „Lernstand löschen“ geht über den MOTOR (L.reset) — nicht am Motor vorbei", kapselEcht(() => {
    L.ueben("lab.link", true); L.ueben("lab.link", true);
    const box = L.box("lab.link");
    erwarte.wahr(box > 0, "vorher steht etwas im Lernstand");
    /* Der Spion beweist den Weg: `L.reset()` schreibt über den Motor (fremd/lernmotor.js:109).
       Wer stattdessen den Speicherschlüssel löscht, verliert die Zusage — der Motor hält seinen
       Stand im Verschluss und schreibt ihn beim nächsten Speichern zurück. */
    const echt = L.reset;
    let gerufen = 0;
    L.reset = function(){ gerufen++; return echt.apply(L, arguments); };
    let r;
    try { r = Spiel.uebergabe({lernstandBehalten: false}); } finally { L.reset = echt; }
    erwarte.gleich(r.ok, true, "die Übergabe gelingt");
    erwarte.gleich(gerufen, 1, "L.reset() wurde genau einmal gerufen");
    erwarte.gleich(L.box("lab.link"), 0, "der Kasten steht wieder auf 0");
    erwarte.gleich(Object.keys(L.st.units), [], "keine Einheiten mehr im Motor");
    const gespeichert = store.get("lern", null);
    erwarte.gleich(gespeichert && gespeichert.units, {}, "und der gespeicherte Lernstand ist wirklich leer");
    erwarte.gleich(Spiel.uebergabeLetzte() && Spiel.uebergabeLetzte().lernstandBehalten, false, "die Entscheidung steht im Spielstand");
  }));

  /* ================= 2. ERGEBNIS ================= */
  pruefe("ERGEBNIS: der Klartext eines echten Auftrags ist nicht leer, stabil und ohne DOM", kapsel(() => {
    const {inst, def, erg} = a2Auftrag({ticketId: "salon-05"});
    erwarte.wahr(erg.bestanden === true, "der Auftrag ist bestanden");
    const mitErg = Spiel.ergebnisText(inst, erg);
    erwarte.wahr(typeof mitErg === "string" && mitErg.trim().length > 0, "ergebnisText ist nicht leer");
    erwarte.gleich(Spiel.ergebnisText(inst, erg), mitErg, "zweimal aufgerufen: derselbe Text");
    erwarte.enthaelt(mitErg, def.titel, "der Auftragstitel steht darin");
    erwarte.wahr(mitErg.split("\n").length >= 3, "der Text ist mehrzeilig");
    /* Die Schnittstelle erlaubt den Aufruf OHNE Ergebnisobjekt (src/spiel/ergebnis.js:104-108):
       dann wird nichts erfunden — aber der Text bleibt Text und bleibt stabil. */
    const ohneErg = Spiel.ergebnisText(inst);
    erwarte.wahr(ohneErg.trim().length > 0, "auch ohne Ergebnisobjekt nicht leer");
    erwarte.gleich(Spiel.ergebnisText(inst), ohneErg, "und stabil");
    const kurz = Spiel.ergebnisKurz(inst, erg);
    erwarte.wahr(kurz.trim().length > 0, "ergebnisKurz ist nicht leer");
    erwarte.falsch(kurz.includes("\n"), "und wirklich eine Zeile");
    /* Kein DOM: dieser Aufruf lief in einem Bereich OHNE `document` (headless) durch — ein
       DOM-Zugriff hätte hier geworfen. Im Browser (`web/tests.html`, von bauen.py erzeugt) ist das
       nicht messbar; dort behauptet der Fall es auch nicht. */
    erwarte.wahr(mitErg !== ohneErg, "ein Ergebnisobjekt ändert den Text wirklich (sonst wäre der Parameter wirkungslos)");
  }));

  /* ================= 3. KLASSENRAUM ================= */
  pruefe("KLASSENRAUM: kein Geld, kein Ruf, kein Karriere-Eintrag — der normale Auftrag ändert alles", kapsel(() => {
    /* Das Wochenziel wird gesetzt, damit die Zeile „Wochenziel“ nicht bloß null vergleicht. */
    const wahl = Spiel.woche.vorschlaege()[0];
    Spiel.woche.waehlen(wahl.id);
    const leer = a2Bild();

    /* KONTROLLE ZUERST: der normale Auftrag verändert die Karriere wirklich — sonst prüfte der Fall nichts. */
    const normal = a2Auftrag({ticketId: "salon-05"});
    erwarte.wahr(normal.erg.bestanden === true, "der normale Auftrag ist bestanden");
    const nachNormal = a2Bild();
    erwarte.wahr(Spiel.st.euro > 0, "der normale Auftrag zahlt Geld");
    erwarte.wahr(Spiel.st.ruf > 0, "und Ruf");
    erwarte.gleich(Spiel.st.erledigt.length, 1, "und trägt sich in st.erledigt ein");
    erwarte.falsch(nachNormal === leer, "die Karriere hat sich wirklich verändert");

    /* JETZT DER KLASSENRAUM-Auftrag: alles bleibt, wie es war. */
    const vorher = a2Bild();
    const kr = a2Auftrag({ticketId: "salon-05", quelle: "klassenraum", seed: 77});
    erwarte.wahr(kr.erg.bestanden === true, "der Klassenraum-Auftrag ist bestanden");
    erwarte.gleich(kr.erg.euro, 0, "kein Geld");
    erwarte.gleich(kr.erg.ruf, 0, "kein Ruf");
    erwarte.gleich(kr.erg.woche, null, "kein Wochenziel-Ergebnis");
    erwarte.gleich(a2Bild(), vorher, "Euro, Ruf, erledigt, Buch, Kundenakte und Wochenziel sind unverändert");
    /* Und die Wirkung fürs Lernen bleibt (die eine Auflage des Klassenraums, klassenraum.js:40). */
    erwarte.wahr(kr.erg.lernen && typeof kr.erg.lernen === "object", "der Lernwert wird trotzdem verbucht");
  }));

  /* ================= 4. DETERMINISMUS ================= */
  pruefe("DETERMINISMUS: derselbe Klassenraum-Code ergibt denselben Auftrag — egal welchen Flow-Stand das Gerät hat", kapsel(() => {
    const SKILL = "lab.vlan", SEED = 5, STAENDE = ["normal", "geruest", "verwicklung"];
    /* Ein „Gerät“ der Klasse: eigener Stand, eigener Generator-Zwischenspeicher, eigener Flow-Stand. */
    const geraet = (stand, quelle) => {
      Spiel._st = Spiel.leererStand(); Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      Spiel.generierte = {};
      if (stand !== "normal") Spiel.flow.daten(SKILL).stand = stand;
      const inst = Spiel.instanzErstellen({gen: {skill: SKILL, seed: SEED}, quelle: quelle || "klassenraum"});
      const def = Spiel.defVon(inst);
      return {id: def.id, ziele: def.ziele.map(z => z.text).join(" | "), flow: inst.flow, seed: inst.seed,
              geraete: Object.keys(inst.netz.geraete).sort().join(",")};
    };
    const laeufe = STAENDE.map(s => geraet(s));
    erwarte.gleich([...new Set(laeufe.map(x => x.id))], [laeufe[0].id],
      "ein def.id für alle drei Flow-Stände: " + laeufe.map(x => x.id).join(" / "));
    erwarte.gleich([...new Set(laeufe.map(x => x.ziele))].length, 1, "dieselben Ziele");
    erwarte.gleich([...new Set(laeufe.map(x => x.geraete))].length, 1, "dieselben Geräte");
    erwarte.gleich(laeufe.map(x => x.flow), [null, null, null], "kein Flow-Regler am Klassenraum-Auftrag");
    erwarte.gleich([...new Set(laeufe.map(x => x.seed))], [SEED], "der Seed kommt aus dem Code, nicht aus dem Gerät");
    /* POSITIVKONTROLLE: mit einer normalen Quelle sieht derselbe Aufbau drei verschiedene Aufträge —
       der Fall kann den Unterschied also wirklich sehen (sonst wäre er kein Test). */
    const normal = STAENDE.map(s => geraet(s, "generiert"));
    erwarte.gleich([...new Set(normal.map(x => x.id))].length, 3,
      "dort greift der Regler (gewollt): " + normal.map(x => x.id).join(" / "));
  }));

  /* ================= 5. HILFEVORRAT ================= */
  pruefe("HILFEVORRAT: der Vorrat folgt dem eingestellten Bildungsstand — nie still dem Standard", kapsel(() => {
    const ERWARTET = {azubi: {frei: 6, gesamt: 6}, "azubi-plus": {frei: 4, gesamt: 4}, geselle: {frei: 2, gesamt: 2}, meister: {frei: 0, gesamt: 0}};
    const gesehen = {}, amTicket = {};
    for (const id of Object.keys(ERWARTET)) {
      Spiel.stufe.setzen(id, {still: true});
      const inst = Spiel.instanzErstellen({ticketId: "salon-01", seed: 43, quelle: "klassenraum", ohneFlow: true});
      Spiel.oeffnen(inst.iid);
      gesehen[id] = Spiel.stufe.konto();          /* der Weg der Oberfläche: das OFFENE Ticket (src/ui/hilfe.js:32) */
      amTicket[id] = inst.stufe;
    }
    erwarte.gleich(gesehen, ERWARTET, "6/4/2/0 je Bildungsstand");
    erwarte.gleich(amTicket, {azubi: "azubi", "azubi-plus": "azubi-plus", geselle: "geselle", meister: "meister"},
      "die Stufe steht AUSDRÜCKLICH am Ticket — nicht nur im Rückfall");
    /* DER BEFUND (Fahrplan § 2.5): früher kam hier immer {frei:6, gesamt:6} — auch am Meister-Gerät. */
    erwarte.falsch(gesehen.meister.gesamt === 6, "am Meister-Gerät steht NICHT der Standard-Vorrat (der alte Fehler)");
    /* Und der stille Standard ist keine Quelle: selbst wenn er auf „meister“ steht, gilt die Wahl des Menschen. */
    Spiel.EINST_STANDARD.stufe = "meister";
    Spiel.stufe.setzen("azubi", {still: true});
    const frisch = Spiel.instanzErstellen({ticketId: "salon-01", seed: 44, quelle: "klassenraum", ohneFlow: true});
    erwarte.gleich(Spiel.stufe.konto(frisch), {frei: 6, gesamt: 6}, "EINST_STANDARD ist NICHT die Quelle");
  }));

  /* ================= 6. DENKHILFEN ================= */
  pruefe("DENKHILFEN: jeder Eintrag kommt über Spiel.mini.hilfe wörtlich zurück — mini-link-2 bleibt leer", kapsel(() => {
    Spiel.stufe.setzen("azubi", {still: true});      /* azubi: zwei Sprossen, Sprosse 1 ist der Denkanstoß */
    const paket = DATEN.miniDenkhilfen || {};
    const ids = Object.keys(paket);
    erwarte.wahr(ids.length >= 60, `das Datenpaket ist gefüllt (${ids.length} Einträge)`);
    const falsch = [], ohneMini = [];
    for (const id of ids) {
      const m = Spiel.mini.von(id);
      if (!m) { ohneMini.push(id); continue; }
      const h = Spiel.mini.hilfe(id, {nurSehen: true});          /* nurSehen: verbraucht keine Sprosse */
      const soll = String(paket[id] && paket[id].denkhilfe || "").trim();
      if (!h) { falsch.push(id + ": keine Denkhilfe"); continue; }
      if (h.art !== "denkhilfe") falsch.push(id + ": art ist " + h.art);
      if (h.text !== soll) falsch.push(id + ": Text weicht ab");
    }
    erwarte.gleich(ohneMini, [], "jede id im Paket gehört zu einem echten Mini");
    erwarte.gleich(falsch, [], "jeder Eintrag kommt wörtlich zurück — nicht der Fertigkeitssatz");
    /* mini-link-2 ist für den Gegenbeweis reserviert: OHNE Eintrag.
       Daran hängt tests/spiel-mini-denktexte.test.js:103-107 (mindestens ein Mini ohne Eintrag). */
    erwarte.gleich(paket["mini-link-2"], undefined, "mini-link-2 hat keinen Eintrag");
    const m2 = Spiel.mini.von("mini-link-2");
    erwarte.wahr(!!m2, "den Mini gibt es");
    const h2 = Spiel.mini.hilfe("mini-link-2", {nurSehen: true});
    erwarte.wahr(!!h2, "die Hilfe gibt es trotzdem — über den Rückfall");
    const rueckfall = String((Spiel.SENIOR_FRAGEN && Spiel.SENIOR_FRAGEN[m2.skill]) || (Spiel.WERKZEUGE && Spiel.WERKZEUGE[m2.skill]) || Spiel.MINI.DENKANSTOSS).trim();
    erwarte.gleich(h2.text, rueckfall, "und zwar der Fertigkeitssatz, kein erfundener Eintrag");
  }));

  /* ================= 7. TRAININGSKARTEN ================= */
  pruefe("TRAININGSKARTEN: jede offene Karte ist wirklich spielbar — gesperrt heißt ehrlich abgelehnt", kapsel(() => {
    const liste = Spiel.training.liste();
    erwarte.wahr(liste.length >= 5, `die Kartentabelle steht (${liste.length} Karten)`);
    const offen = liste.filter(k => k.offen);
    erwarte.wahr(offen.length > 0, "mindestens eine Karte ist offen (sonst prüfte der Fall nichts)");

    /* (a) „Startbar“ allein genügt nicht: eine Karte, aus der kein LÖSBARER Fall wird, wäre eine
       Lüge in der Liste (genau das befürchtet der Fahrplan bei `lab.stp`). Jede offene Karte wird
       deshalb gestartet, geöffnet, mit ihrer hinterlegten Lösung gelöst und abgenommen. */
    const fehler = [];
    for (const k of offen) {
      const r = Spiel.training.starten(k.id);
      if (!r || r.ok !== true) { fehler.push(k.id + ": startet nicht (" + ((r && r.grund) || "kein ok") + ")"); continue; }
      const inst = Spiel.instanz(r.iid);
      if (!inst || inst.quelle !== "training" || inst.training !== k.id) { fehler.push(k.id + ": Instanz falsch"); continue; }
      try {
        Spiel._einst.wahl = Spiel.defVon(inst).stufe || "E";
        Spiel.oeffnen(inst.iid);                       /* der echte Weg: die Oberfläche öffnet den Durchgang */
        const def = Spiel.defVon(inst);
        Spiel.loesung(inst.netz, def.loesung);
        Spiel.arbeitszieleErfuellen(inst);
        const ab = Spiel.abnahme(inst);
        if (!ab.bestanden) { fehler.push(k.id + ": die hinterlegte Lösung besteht die Abnahme nicht"); continue; }
        const erg = Spiel.training.abnehmen(inst.iid, ab);
        if (!erg || erg.ok !== true || erg.bestanden !== true) fehler.push(k.id + ": Abnahme liefert kein Ergebnis");
        else if (erg.euro !== 0 || erg.ruf !== 0) fehler.push(k.id + ": Training zahlt (" + erg.euro + " € / " + erg.ruf + " Ruf)");
      } catch (e) { fehler.push(k.id + ": " + String(e && e.message || e)); }
    }
    erwarte.gleich(fehler, [], "jede offene Karte startet UND ist mit ihrer Lösung bestehbar");

    /* (b) Die Sperrseite. Heute ist möglicherweise KEINE Karte gesperrt — die Zusage „gesperrt heißt
       ehrlich abgelehnt“ wird deshalb als Gegenprobe gemessen: einem Szenario wird für die Dauer
       des Falls sein Fehler-Injektor genommen. Genau daraus bildet `liste()` `offen`
       (training.js:129/166), und `starten` lehnt mit demselben Grund ab (training.js:198). */
    const probe = liste[0];
    const gemerkt = Object.entries(Spiel.INJEKTOREN || {}).filter(([, i]) => (i.skills || []).includes(probe.skill));
    erwarte.wahr(gemerkt.length > 0, "die Probekarte hat Injektoren, die sich wegnehmen lassen");
    try {
      for (const [name] of gemerkt) delete Spiel.INJEKTOREN[name];
      const zu = Spiel.training.liste().find(k => k.id === probe.id);
      erwarte.gleich(zu.offen, false, "ohne Injektor gilt die Karte als gesperrt");
      erwarte.falsch(String(zu.grund || "").trim() === "", "und die Liste nennt den Grund");
      const gesperrt = Spiel.training.starten(probe.id);
      erwarte.gleich(gesperrt.ok, false, "starten lehnt ab");
      erwarte.enthaelt(String(gesperrt.grund), "Injektor", "mit dem echten Grund");
    } finally {
      for (const [name, wert] of gemerkt) Spiel.INJEKTOREN[name] = wert;
    }
    /* Und die wirklich gesperrten Karten der Liste (falls es welche gibt) lehnen ebenfalls ab. */
    const sperrFehler = [];
    for (const k of liste.filter(x => !x.offen)) {
      const r = Spiel.training.starten(k.id);
      if (!r || r.ok !== false) sperrFehler.push(k.id + ": startet, obwohl gesperrt");
      else if (!String(r.grund || "").trim()) sperrFehler.push(k.id + ": ohne Grund");
    }
    erwarte.gleich(sperrFehler, [], "jede gesperrte Karte lehnt ehrlich ab");
  }));
});
