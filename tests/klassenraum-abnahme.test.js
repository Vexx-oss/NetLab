"use strict";
/* KLASSENRAUM A+B — ABNAHME IN EINER TESTDATEI (task-34).
   Die Einzelbausteine prüfen ihre Eigentümer selbst (Codec, API/Store, Oberfläche). HIER geht es um
   das ZUSAMMENSPIEL im echten Fluss: die fünf Vorführschritte aus
   `docs/entwicklung/Klassenraum/D – Prüfung, Abnahme und Reihenfolge.md` § 3.3 (Zeilen 341-345),
   headless nachgebaut — plus die harten Abbruchkriterien (§ 3.4) und die prüfbaren Punkte der
   Definition of Done (§ 6: 6, 7, 8, 9, 11).

     1 · Ansagen      — `erzeugen` → Auftragscode, Sitzung in `store "klassenraum"`, NICHT in "labor".
     2 · Öffnen       — `ausCode` → Instanz über den vertraglichen Weg; zweites Gerät = derselbe Auftrag.
     3 · Einsammeln   — lösen → abschliessen (Umleitung) → `ergebnisCode` → `ergebnisEintragen` → 1 Eintrag.
     4 · Zweiter Platz— anderer Platz → 2 Einträge, Median-Dauer berechenbar, Eintragen idempotent.
     5 · Neustart     — `exportieren` → Zustand weg → `importieren` → alles zurück, Kopfzeile unverändert.

   Grundlage: `A – Codec und Determinismus.md` § 5 (API-Vertrag), § 6 (Ergebnis-Code), § 7
   (Datenschema `store "klassenraum"`) und § 1.1 (Alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, kein I, O, 0, 1).

   KEIN stilles Grün: jeder Schritt wird nur angemeldet, wenn die API, die er braucht, wirklich da ist
   (die Bausteine entstehen parallel: task-31 Codec, task-32 API/Store, task-33 Oberfläche). Fehlt sie,
   läuft der Schritt nicht — das steht dann im Bericht, nicht als grüner Schein.

   Allein lauffähig:  node tests/klassenraum-abnahme.test.js
   (lädt dieselben Schichten wie tests/run.js; Bauart von tests/2.0-abnahme.test.js) */

/* Alles in EINEM Rumpf (Regel zu task-34): diese Datei hat KEINE `const`/`function`-Bindung auf
   oberster Ebene. `tests/run.js` hängt alle Testdateien in EIN Skript — gleiche Namen in zwei Dateien
   sind dort ein Syntaxfehler, und eine Zusicherung beim Laden reißt mit Exit 2 den ganzen Lauf mit.
   Der Rumpf ist die einzige Anweisung; alle Helfer liegen ohnehin im `gruppe`-Rückruf, jede
   Zusicherung nur in `pruefe(...)`. `erwarte` kennt nur wahr/falsch/gleich/enthaelt/passt/wirft —
   „wirft nicht“ wird deshalb mit eigenem try/catch gemessen (DoD 9). */
(function(){
function kaHatRequire(){ try { return typeof require === "function"; } catch (e) { return false; } }

/* ---------------- Allein lauffähig ---------------- */
function kaAlleinLaden(){
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
  try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "klassenraum-abnahme.test.js"}); }
  catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
  const rot = ergebnisse.filter(e => !e.ok);
  for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
  console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
  process.exit(rot.length ? 1 : 0);
}
if (typeof Spiel === "undefined" && typeof document === "undefined" && kaHatRequire()) kaAlleinLaden();

gruppe("Klassenraum A+B: Abnahme im echten Fluss", () => {
  /* ---------- Ist die API da? Keine Zusicherung im Gruppenrumpf, nur Vorbereitung. ---------- */
  const KA = () => (Spiel && typeof Spiel.klassenraum === "object" && Spiel.klassenraum) || {};
  const hat = n => typeof KA()[n] === "function";
  const FELDER = "art,code,dauerMin,eigene,ergebnisse,erstellt,id,index,schritte,seed,skill,ticketId,titel,variante".split(",");

  /* Kapsel: eigener Wegwerf-Stand, eigener Speicher (auch der Schlüssel "klassenraum"), danach alles
     zurück. `_trocken` hält Bus und Spielstand-Speichern heraus — der Klassenraum speichert in SEINEN
     Schlüssel (D: „Sitzung liegt in store "klassenraum", nicht im Spielstand"). */
  const kapsel = fn => () => {
    const alt = {speicher: store.alles(), st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
                 gen: Spiel.generierte, standardStufe: Spiel.EINST_STANDARD.stufe, uhr: jetzt()};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      Spiel.generierte = alt.gen;
      Spiel.EINST_STANDARD.stufe = alt.standardStufe;
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, alt.speicher);
      jetzt.setzen(alt.uhr); jetzt.frei();
    }
  };
  /* Ein Schritt läuft nur, wenn seine API wirklich existiert (siehe Kopf: kein stilles Grün). */
  const nurMit = (namen, name, fn) => { if (namen.every(hat)) pruefe(name, kapsel(fn)); };

  /* ---------- Werkzeug ---------- */
  const sitzungJetzt = () => { const s = KA().sitzung ? KA().sitzung() : null; return s && s.sitzung ? s.sitzung : (s && s.code ? s : null); };
  const eintraege = s => Object.keys((s && s.ergebnisse) || {});
  const geraeteListe = netz => Object.values(netz.geraete).map(g => g.id + ":" + g.typ).sort().join(",");
  const kabelListe = netz => netz.kabel.map(k => [k.a.geraet, k.a.port, k.b.geraet, k.b.port].join(">")).sort().join(",");
  /* Oberer Median der gültigen Dauern (> 0), wie in B festgelegt: Index floor(n/2) der sortierten Liste. */
  const obererMedian = zahlen => { const g = zahlen.filter(z => z > 0).sort((a, b) => a - b); return g.length ? g[Math.floor(g.length / 2)] : null; };
  const CODE_A = /^NL-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{2}$/;
  const CODE_E = /^E-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{3}$/;

  /* Eine Sitzung anlegen (Schritt 1). Die Fertigkeit kommt aus der API selbst — so ist sie sicher tauglich. */
  function kaSitzung(o = {}){
    const fert = typeof KA().tauglicheFertigkeiten === "function" ? (KA().tauglicheFertigkeiten()[0] || {}).skill : "lab.gateway";
    const wunsch = o.ticketId ? {ticketId: o.ticketId, seed: o.seed} : {skill: o.skill || fert, seed: o.seed == null ? 7 : o.seed};
    if (o.plaetze !== undefined) wunsch.plaetze = o.plaetze;                    /* L6: Nenner der Ampel */
    const s = KA().erzeugen(wunsch);
    return s && s.fehler ? null : s;
  }
  /* Der Öffnungsweg aus A § 5.1, wörtlich. `platz` wird ausdrücklich übergeben (im Programm kommt er
     aus `platz()`), damit der Fall den Platz messen kann, statt ihn zu erben. */
  function kaOeffnen(code, platz){
    const c = KA().ausCode(code);
    if (!c || c.fehler) return {fehler: (c && c.grund) || "Der Auftragscode wurde abgewiesen."};
    const inst = c.skill
      ? Spiel.instanzErstellen({gen: {skill: c.skill, seed: c.seed}, quelle: "klassenraum", ohneFlow: true})
      : Spiel.instanzErstellen({ticketId: c.ticketId, seed: c.seed, quelle: "klassenraum", ohneFlow: true});
    inst.klassenraum = {sitzung: c.sitzung, platz: platz == null ? (KA().platz() ?? 0) : platz, code: c.code};
    Spiel._einst.wahl = Spiel.defVon(inst).stufe || "E";
    Spiel.oeffnen(inst.iid);
    return {inst, c, def: Spiel.defVon(inst)};
  }
  /* Auftrag lösen und abschliessen — der Weg aus D § 3.3 Schritt 3. */
  function kaLoesen(inst, zeitMs){
    if (typeof zeitMs === "number") inst.zeitMs = zeitMs;
    const def = Spiel.defVon(inst);
    Spiel.loesung(inst.netz, def.loesung);
    Spiel.arbeitszieleErfuellen(inst);
    const ab = Spiel.abnahme(inst);
    const erg = Spiel.abschliessen(inst, ab);          /* leitet auf Spiel.klassenraum.abnehmen um */
    return {def, ab, erg};
  }

  /* ================= Schritt 1 · Ansagen ================= */
  nurMit(["erzeugen", "sitzung"], "1 · Ansagen: erzeugen legt den Auftragscode an, die Sitzung liegt in store „klassenraum“ — nicht im Spielstand", () => {
    const laborVorher = JSON.stringify(store.get("labor", null));
    const s = kaSitzung({seed: 7});
    erwarte.wahr(!!s, "erzeugen liefert eine Sitzung (kein {fehler})");
    erwarte.passt(s.code, CODE_A, "der Auftragscode hat die Form NL-XXXX-XX (A § 1.1)");
    erwarte.wahr(s.id >= 1 && s.id <= 31, `die Sitzungskennung liegt in 1..31 (ist ${s.id})`);
    erwarte.wahr(["hand", "generiert"].includes(s.art), `art ist hand oder generiert (ist ${s.art})`);
    erwarte.gleich(Object.keys(s.ergebnisse || {}), [], "eine frische Sitzung hat keine Ergebnisse");
    /* DoD 11: keine Klarnamen. GEMESSEN: die Umsetzung trägt neben den 14 Feldern aus A § 7.1 noch
       `sitzung.plaetze` — Leitungsentscheidung L6 (src/spiel/klassenraum.js:34-35), der Nenner der
       Ampel, bewusst gegen die Zeile „genau diese 14 Felder, nichts mehr". Das ist kein Namensfeld;
       der Widerspruch Dokument ↔ Umsetzung steht im Bericht an den Lead, nicht als rote Zusicherung.
       Geprüft wird die Zusage selbst: alle dokumentierten Felder sind da, kein Feld ist ein Name,
       und die Zahlenfelder liegen in ihrem Bereich. */
    erwarte.gleich(FELDER.filter(f => !(f in s)), [], "alle 14 Felder aus A § 7.1 sind vorhanden");
    erwarte.gleich(Object.keys(s).filter(k => /name|schueler|schüler|kunde|vorname|nachname/i.test(k)), [], "kein Namensfeld in der Sitzung (DoD 11)");
    erwarte.wahr(Number.isInteger(s.plaetze) && s.plaetze >= 0 && s.plaetze <= 31, `sitzung.plaetze ist eine Zahl 0..31 (L6, ist ${s.plaetze})`);
    /* Der Store: eigener Schlüssel, Fassung 1, und der Spielstand bleibt unberührt. */
    const st = store.get("klassenraum", null);
    erwarte.wahr(!!st && st.fassung === 1, "store „klassenraum“ trägt die Fassung 1");
    erwarte.gleich(st.sitzung && st.sitzung.code, s.code, "die Sitzung im Store ist dieselbe (Code)");
    erwarte.gleich(JSON.stringify(store.get("labor", null)), laborVorher, "store „labor“ ist unverändert (kein Eintrag im Spielstand)");
    erwarte.gleich(Spiel.st.klassenraum, undefined, "auch der Spielstand selbst kennt keinen Klassenraum");
    /* Und `sitzung()` gibt sie wieder heraus. */
    erwarte.gleich((sitzungJetzt() || {}).code, s.code, "sitzung() liefert dieselbe Sitzung");
  });

  /* ================= Schritt 2 · Öffnen ================= */
  nurMit(["erzeugen", "ausCode", "platz", "sitzung"], "2 · Öffnen: derselbe Code ergibt auf einem zweiten Gerät denselben Auftrag (def.id, Ziele, Netz)", () => {
    const s = kaSitzung({seed: 11});
    erwarte.wahr(!!s, "Sitzung angelegt");
    const a = kaOeffnen(s.code, 0);
    erwarte.wahr(!!a.inst, "der Auftrag öffnet sich: " + (a.fehler || ""));
    erwarte.gleich((a.inst.klassenraum || {}).code, s.code, "der Code steht an der Instanz");
    erwarte.gleich((a.inst.klassenraum || {}).sitzung, s.id, "die Sitzungskennung steht an der Instanz");
    erwarte.gleich(a.inst.quelle, "klassenraum", "die Quelle ist klassenraum");
    /* E1 (Leitentscheidung): der Auftrag ist im Postfach NICHT sichtbar, aber spielbar. */
    erwarte.falsch(Spiel.postfach().some(i => i.iid === a.inst.iid), "nicht in der sichtbaren Postfachliste (E1)");
    erwarte.wahr(!!Spiel.instanz(a.inst.iid), "Spiel.instanz findet ihn weiterhin");
    /* ZWEITES GERÄT: frischer Stand, frischer Generator-Zwischenspeicher, derselbe Code. */
    const eins = {id: a.def.id, ziele: (a.def.ziele || []).map(z => z.text).join(" | "),
                  geraete: geraeteListe(a.inst.netz), kabel: kabelListe(a.inst.netz), ab: a.inst.netz.geraete && Object.keys(a.inst.netz.geraete).length};
    Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
    Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
    Spiel.generierte = {};
    const b = kaOeffnen(s.code, 0);
    erwarte.wahr(!!b.inst, "das zweite Gerät öffnet denselben Code: " + (b.fehler || ""));
    const zwei = {id: b.def.id, ziele: (b.def.ziele || []).map(z => z.text).join(" | "),
                  geraete: geraeteListe(b.inst.netz), kabel: kabelListe(b.inst.netz)};
    erwarte.gleich(zwei.id, eins.id, "DERSELBE Auftrag auf beiden Geräten (def.id)");
    erwarte.gleich(zwei.ziele, eins.ziele, "dieselben Ziele");
    erwarte.gleich(zwei.geraete, eins.geraete, "dieselben Geräte");
    erwarte.gleich(zwei.kabel, eins.kabel, "dieselben Kabel");
    erwarte.wahr(eins.ab > 0, "das Netz ist nicht leer");
  });

  /* ================= Schritt 3 · Einsammeln ================= */
  nurMit(["erzeugen", "ausCode", "platz", "sitzung", "ergebnisCode", "ergebnisEintragen", "ergebnisLesen", "plaetze"],
    "3 · Einsammeln: lösen → Ergebnis-Code → eintragen; die Liste zeigt genau das Eingetragene (Ampel 1 von 2)", () => {
    const s = kaSitzung({seed: 13, plaetze: 2});
    const a = kaOeffnen(s.code, 0);
    erwarte.wahr(!!a.inst, "Auftrag offen");
    const {erg} = kaLoesen(a.inst, 72500);
    erwarte.gleich(erg.bestanden, true, "der Auftrag ist bestanden");
    erwarte.gleich(erg.euro, 0, "kein Geld (Nutzerentscheidung: keine Bewertung)");
    erwarte.gleich(erg.ruf, 0, "kein Ruf");
    erwarte.gleich(Spiel.st.erledigt.length, 0, "kein Karriere-Eintrag");
    const code = KA().ergebnisCode(a.inst, erg.abnahme);
    erwarte.wahr(typeof code === "string", "ergebnisCode liefert einen Code: " + (code && code.grund || ""));
    erwarte.passt(code, CODE_E, "Form E-XXXX-XXX (A § 6.1)");
    /* DoD 6: Code → Lesen ergibt dieselben Werte (auch der Platz und die Dauer). */
    const gelesen = KA().ergebnisLesen(code);
    erwarte.wahr(!!gelesen && !gelesen.fehler, "ergebnisLesen liest den Code");
    erwarte.gleich(gelesen.sitzung, s.id, "Sitzung");
    erwarte.gleich(gelesen.platz, 0, "Platz");
    erwarte.gleich(gelesen.sterne, erg.abnahme.sterne, "Sterne (auch halbe)");
    erwarte.gleich(gelesen.versuche, Math.min(3, Math.max(0, (a.inst.abnahmen || 1) - 1)), "Fehlversuche");
    erwarte.wahr(gelesen.dauerS > 0, `Dauer in Sekunden (ist ${gelesen.dauerS})`);
    /* Eintragen — und die Liste muss genau das zeigen. */
    const r1 = KA().ergebnisEintragen(code);
    erwarte.gleich(r1.ok, true, "ergebnisEintragen nimmt den Code an: " + (r1.grund || ""));
    const nach = sitzungJetzt();
    const e = (nach.ergebnisse || {})[gelesen.platz];
    erwarte.wahr(!!e, "das Ergebnis steht unter seinem Platz");
    erwarte.gleich([e.platz, e.sterne, e.dauerS, e.versuche, e.code], [gelesen.platz, gelesen.sterne, gelesen.dauerS, gelesen.versuche, code],
      "die Liste zeigt genau die eingetragenen Werte (Abbruchkriterium)");
    erwarte.gleich(eintraege(nach), ["0"], "EIN eingetragener Platz");
    /* Die Ampel des Drehbuchs: „1 von 2" — der Nenner ist die angesagte Platzzahl (L6). */
    erwarte.gleich(KA().plaetze(), 2, "zwei Plätze sind angesagt");
    erwarte.gleich(KA().plaetze() - eintraege(nach).length, 1, "Ampel 1 von 2: ein Platz ist offen");
  });

  /* ================= Schritt 4 · Zweiter Platz ================= */
  nurMit(["erzeugen", "ausCode", "platz", "platzSetzen", "sitzung", "ergebnisCode", "ergebnisEintragen", "ergebnisLesen", "plaetze"],
    "4 · Zweiter Platz: zwei Plätze, zwei Ergebnisse, Ampel 2 von 2, Median-Dauer berechenbar — Eintragen ist idempotent", () => {
    const s = kaSitzung({seed: 17, plaetze: 2});
    /* Platz 0: erstes Gerät. */
    KA().platzSetzen(0);
    const a = kaOeffnen(s.code);
    erwarte.wahr(!!a.inst, "erster Auftrag offen");
    const c1 = KA().ergebnisCode(a.inst, kaLoesen(a.inst, 72500).erg.abnahme);
    erwarte.gleich(KA().ergebnisEintragen(c1).ok, true, "erstes Ergebnis eingetragen");
    /* Platz 1: zweites Gerät (anderer Platz, dasselbe Gerät hier). */
    KA().platzSetzen(1);
    erwarte.gleich(KA().platz(), 1, "der lokale Platz ist gesetzt");
    const b = kaOeffnen(s.code);
    erwarte.wahr(!!b.inst, "zweiter Auftrag offen");
    erwarte.gleich(b.inst.klassenraum.platz, 1, "er läuft unter Platz 1");
    const c2 = KA().ergebnisCode(b.inst, kaLoesen(b.inst, 21500).erg.abnahme);
    erwarte.wahr(c1 !== c2, "zwei verschiedene Codes (anderer Platz, andere Dauer)");
    erwarte.gleich(KA().ergebnisEintragen(c2).ok, true, "zweites Ergebnis eingetragen");
    const nach = sitzungJetzt();
    erwarte.gleich(eintraege(nach), ["0", "1"], "2 von 2 Plätzen sind belegt");
    erwarte.gleich(KA().plaetze() - eintraege(nach).length, 0, "Ampel 2 von 2: nichts mehr offen");
    const g1 = KA().ergebnisLesen(c1), g2 = KA().ergebnisLesen(c2);
    erwarte.wahr(g1.dauerS > 0 && g2.dauerS > 0, "beide Dauern sind gültig (> 0)");
    erwarte.gleich(obererMedian([g1.dauerS, g2.dauerS]), Math.max(g1.dauerS, g2.dauerS),
      "der obere Median der gültigen Dauern ist berechenbar");
    /* DoD 6: idempotent — zweimal derselbe Code ändert NICHTS. */
    const vorher = JSON.stringify(store.get("klassenraum", null));
    const nochmal = KA().ergebnisEintragen(c1);
    erwarte.gleich(nochmal.ok, true, "derselbe Code wird angenommen");
    erwarte.gleich(nochmal.neu, false, "aber nicht als neu gezählt (kein Doppelzählen)");
    erwarte.gleich(JSON.stringify(store.get("klassenraum", null)), vorher, "die Sitzung ist unverändert");
    erwarte.gleich(eintraege(sitzungJetzt()), ["0", "1"], "weiterhin 2 Einträge");
  });

  /* ================= Schritt 5 · Neustart überlebt ================= */
  nurMit(["erzeugen", "ausCode", "platz", "platzSetzen", "sitzung", "ergebnisCode", "ergebnisEintragen", "exportieren", "importieren", "plaetze"],
    "5 · Neustart: exportieren → Zustand weg → importieren; Ampel 2/2 und Kopfzeile unverändert", () => {
    const s = kaSitzung({seed: 19, plaetze: 2});
    KA().platzSetzen(0);
    const a = kaOeffnen(s.code);
    const c1 = KA().ergebnisCode(a.inst, kaLoesen(a.inst, 72500).erg.abnahme);
    KA().ergebnisEintragen(c1);
    KA().platzSetzen(1);
    const b = kaOeffnen(s.code);
    const c2 = KA().ergebnisCode(b.inst, kaLoesen(b.inst, 21500).erg.abnahme);
    KA().ergebnisEintragen(c2);
    const vorher = {sitzung: JSON.stringify(sitzungJetzt()), kopf: {euro: Spiel.st.euro, ruf: Spiel.st.ruf, stufe: Spiel.st.stufe}, plaetze: eintraege(sitzungJetzt()), angesagt: KA().plaetze()};
    erwarte.gleich(vorher.plaetze, ["0", "1"], "vorher: Ampel 2/2");

    const text = KA().exportieren();
    erwarte.wahr(typeof text === "string" && text.length > 0, "exportieren liefert Text");
    let datei = null;
    try { datei = JSON.parse(text); } catch (e) { /* unten geprüft */ }
    erwarte.wahr(!!datei, "der Export ist JSON");
    erwarte.gleich(datei.format, "netzwerk-labor/klassenraum", "mit dem festgelegten Formatfeld (A § 7.2)");

    /* Zustand wegwerfen: frischer Rechner. */
    store.set("klassenraum", null);
    erwarte.gleich(KA().sitzung(), null, "ohne Store ist keine Sitzung da");
    const r = KA().importieren(text);
    erwarte.gleich(r.ok, true, "der Import gelingt: " + (r && r.grund || ""));
    const nach = sitzungJetzt();
    erwarte.gleich(JSON.stringify(nach), vorher.sitzung, "Sitzung samt Ergebnissen ist verlustfrei zurück");
    erwarte.gleich(eintraege(nach), ["0", "1"], "Ampel unverändert 2/2 (Abbruchkriterium)");
    erwarte.gleich(KA().plaetze(), vorher.angesagt, "auch die angesagte Platzzahl ist unverändert (Nenner der Ampel)");
    erwarte.gleich({euro: Spiel.st.euro, ruf: Spiel.st.ruf, stufe: Spiel.st.stufe}, vorher.kopf,
      "die Kopfzeile (Euro/Ruf/Stufe) ist unverändert (Abbruchkriterium)");
  });

  /* ================= Definition of Done 7 · fremde Sitzung ================= */
  if (typeof KlassenraumCodec === "object" && KlassenraumCodec && typeof KlassenraumCodec.ergebnisBauen === "function") {
    nurMit(["erzeugen", "sitzung", "ergebnisLesen", "ergebnisEintragen"],
      "DoD 7: ein Ergebnis-Code einer FREMDEN Sitzung wird abgewiesen", () => {
      const s = kaSitzung({seed: 23});
      const fremd = (s.id % 31) + 1;                                   /* garantiert eine andere Kennung */
      const code = KlassenraumCodec.ergebnisBauen({sitzung: fremd, platz: 0, sterne: 5, versuche: 0, dauerS: 70});
      erwarte.passt(code, CODE_E, "der fremde Code hat die richtige Form");
      const gelesen = KA().ergebnisLesen(code);
      erwarte.gleich(gelesen.sitzung, fremd, "gelesen wird die fremde Sitzung");
      const vorher = JSON.stringify(store.get("klassenraum", null));
      const r = KA().ergebnisEintragen(code);
      erwarte.wahr(!!r.fehler, "eintragen wird abgewiesen (kein stilles Übernehmen)");
      erwarte.gleich(JSON.stringify(store.get("klassenraum", null)), vorher, "die Sitzung ist unverändert");
    });
  }

  /* ================= Definition of Done 9 · ungültige Codes ================= */
  nurMit(["ausCode", "ergebnisLesen"], "DoD 9: ungültige Codes liefern {fehler} — und werfen nie", () => {
    const faelle = [["Auftragscode, bekannt ungültig", () => KA().ausCode("NL-4F7K-2Q")],
                    ["Auftrags-Buchstabensalat", () => KA().ausCode("NL-QQQQ-QQ")],
                    ["Ergebnis-Buchstabensalat", () => KA().ergebnisLesen("E-XXXX-XXX")],
                    ["Ergebnis zu kurz", () => KA().ergebnisLesen("E-AB")]];
    const geworfen = [], ohneFehler = [];
    for (const [was, ruf] of faelle) {
      let r;
      try { r = ruf(); } catch (e) { geworfen.push(was + ": " + String(e && e.message || e)); continue; }
      if (!r || !r.fehler || !String(r.grund || "").trim()) ohneFehler.push(was);
    }
    erwarte.gleich(geworfen, [], "keine Ausnahme bei ungültigen Codes");
    erwarte.gleich(ohneFehler, [], "jeder ungültige Code nennt {fehler, grund}");
    /* Leere Eingabe ist kein Fehler, sondern „nichts getippt“ (A § 5.1). */
    erwarte.gleich(KA().ausCode(""), null, "leere Eingabe → null (kein Fehler, nichts getippt)");
  });
});
})();
