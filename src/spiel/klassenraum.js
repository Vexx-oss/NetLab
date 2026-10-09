"use strict";
/* ---------- Spiel: Klassenraum (Stufe A, 2.0-Fundament; Architektur § 12, A – Codec und Determinismus § 5-§ 7) ----------
   Ein Auftrag entsteht aus einem ANGESAGTEN CODE: die Lehrkraft erzeugt ihn hier, jedes Gerät baut denselben
   Fall aus demselben Code. Kein Konto, kein Server, kein Netz (Server = Stufe C, QR = Stufe D – beide später).

   ÖFFNUNGSWEG (§ 5, wörtlich):
     const c = Spiel.klassenraum.ausCode(eingabe);
     if (!c) return;                                  // nichts eingetippt
     if (c.fehler) return zeigeHinweis(c.grund);      // Tippfehler, fremde Fassung …
     const inst = c.skill
       ? Spiel.instanzErstellen({gen: {skill: c.skill, seed: c.seed}, quelle: "klassenraum", ohneFlow: true})
       : Spiel.instanzErstellen({ticketId: c.ticketId, seed: c.seed, quelle: "klassenraum", ohneFlow: true});
     inst.klassenraum = {sitzung: c.sitzung, platz: Spiel.klassenraum.platz() ?? 0, code: c.code};
     Spiel.oeffnen(inst.iid);
   `ohneFlow: true` schadet nie und hält den Vertrag; `postfach.js` schließt die Quelle inzwischen selbst aus.
   `opts.stufe` wird NIE übergeben (das wäre eine lokale Einstellung und machte den Auftrag je Gerät anders).

   ZWEI ENTSCHEIDUNGEN DES LEADS (sie gelten, auch wo ältere Texte anderes sagen):
   1. E1: der Auftrag ist im Postfach UNSICHTBAR (Spiel.postfach(), Offen-Zähler, „Heute"-Kachel, Ereignistakt –
      postfach.js, hub.js, ereignisse.js). Die ältere Messzeile in „A – Codec und Determinismus" § 5
      („Auftrag ist trotzdem im Postfach sichtbar") ist damit ÜBERHOLT; der Widerspruch ist dem Lead gemeldet.
      Spiel.instanz(iid)/Spiel.oeffnen(iid) finden den Auftrag weiterhin.
   2. KEINE BEWERTUNG: der Ergebnis-Code trägt Sterne, Fehlversuche und Dauer – kein Hilfe-Feld, keine Note.

   Der Codec (`KlassenraumCodec`, src/spiel/klassenraum-codec.js) ist eine eigene Datei und wird hier NUR
   aufgerufen (Code bauen/lesen, Abdruck, Kanonisierung, Tabellen). Diese Datei baut keinen zweiten Codec.

   Die eingefrorenen Tabellen (§ 2.3 Regel 1) stehen als Literal HIER; sie wurden in dieser Sitzung gegen die
   Wirklichkeit gemessen: 58 Auftrags-IDs in Spiel.ticketReihe()-Reihenfolge, 27 Fertigkeiten in
   DATEN.skills-Reihenfolge, jede mit ersterSeed 1 (alle 27 liefern bei Seed 1 einen gültigen Auftrag –
   lab.portsec/lab.stp/lab.storage sind seit den Injektoren aus task-5 adressierbar; ältere Belege nennen
   dort 24 von 27). Ein Test wacht über Reihenfolge und Präfix (§ 2.3 Regel 4).

   `sitzung.plaetze` (Leitungsentscheidung L6, bewusst gegen A § 7.1, das „genau diese 14 Felder" sagt):
   0 = „nicht eingestellt", sonst 1..31 – die Ampel der Lehrkraft rechnet „offen" als plaetze − eingetragen.

   Kein Eintrag in store "labor": der Spielstand bleibt unberührt. Eigener Schlüssel Spiel.KLASSENRAUM
   (zustand.js) mit `fassung: 1`. */
Spiel.klassenraum = (() => {
  const SCHLUESSEL = () => Spiel.KLASSENRAUM || "klassenraum";
  const FASSUNG = 1;
  const KANON_FENSTER = 64;

  /* ---------- Der Codec ---------- */
  const C = () => (typeof KlassenraumCodec !== "undefined" && KlassenraumCodec) || null;
  const OHNE_CODEC = {fehler: "fassung", grund: "Der Codec fehlt (src/spiel/klassenraum-codec.js) – ohne ihn lässt sich kein Klassenraum-Code bauen."};

  /* ---------- Die eingefrorenen Tabellen (§ 2.3) ---------- */
  const TABELLE_AUFTRAEGE = ["salon-01", "salon-02", "salon-03", "salon-04", "salon-05", "salon-06", "salon-hotline", "salon-projekt", "salon-terminal", "baeckerei-01", "baeckerei-02", "baeckerei-hotline", "baeckerei-03", "baeckerei-terminal", "buero-01", "buero-02", "buero-03", "buero-hotline", "buero-sicherheit-1", "buero-04", "buero-sicherheit-2", "buero-05", "buero-terminal", "buero-sicherheit-3", "buero-06", "buero-sicherheit-4", "buero-07", "buero-sicherheit-5", "salon-07", "praxis-01", "praxis-02", "praxis-03", "praxis-04", "praxis-hotline", "praxis-05", "praxis-06", "praxis-07", "praxis-projekt", "praxis-08", "praxis-09", "praxis-10", "autohaus-01", "autohaus-02", "autohaus-03", "autohaus-04", "autohaus-05", "autohaus-06", "autohaus-projekt", "autohaus-08", "autohaus-09", "autohaus-10", "mittel-01", "mittel-02", "mittel-03", "mittel-04", "storage-01", "storage-02", "storage-03"];
  const TABELLE_SKILLS = [
    {id: "lab.link", tauglich: true, ersterSeed: 1}, {id: "lab.ip", tauglich: true, ersterSeed: 1},
    {id: "lab.netz", tauglich: true, ersterSeed: 1}, {id: "lab.gateway", tauglich: true, ersterSeed: 1},
    {id: "lab.arp", tauglich: true, ersterSeed: 1}, {id: "lab.ping", tauglich: true, ersterSeed: 1},
    {id: "lab.switch", tauglich: true, ersterSeed: 1}, {id: "lab.subnetz", tauglich: true, ersterSeed: 1},
    {id: "lab.dhcp", tauglich: true, ersterSeed: 1}, {id: "lab.dns", tauglich: true, ersterSeed: 1},
    {id: "lab.ports", tauglich: true, ersterSeed: 1}, {id: "lab.tcp", tauglich: true, ersterSeed: 1},
    {id: "lab.cli", tauglich: true, ersterSeed: 1}, {id: "lab.speichern", tauglich: true, ersterSeed: 1},
    {id: "lab.vlan", tauglich: true, ersterSeed: 1}, {id: "lab.trunk", tauglich: true, ersterSeed: 1},
    {id: "lab.rostick", tauglich: true, ersterSeed: 1}, {id: "lab.acl", tauglich: true, ersterSeed: 1},
    {id: "lab.route", tauglich: true, ersterSeed: 1}, {id: "lab.ttl", tauglich: true, ersterSeed: 1},
    {id: "lab.nat", tauglich: true, ersterSeed: 1}, {id: "lab.portfwd", tauglich: true, ersterSeed: 1},
    {id: "lab.fw", tauglich: true, ersterSeed: 1}, {id: "lab.dmz", tauglich: true, ersterSeed: 1},
    {id: "lab.portsec", tauglich: true, ersterSeed: 1}, {id: "lab.stp", tauglich: true, ersterSeed: 1},
    {id: "lab.storage", tauglich: true, ersterSeed: 1},
  ];

  /* Die Tabelle des Codec wird EINMAL aus diesen Listen gebaut (§ 2.3 Regel 1: die Reihenfolge ist bindend,
     der Codec sortiert nie um). Sie ist die einzige Quelle für Index → ID und wird auch dem Leser übergeben. */
  let tabellenMerker = null;
  function tabellen(){
    if (tabellenMerker) return tabellenMerker;
    const c = C();
    if (!c || typeof c.tabellen !== "function") return null;
    try {
      tabellenMerker = c.tabellen({ticketIds: TABELLE_AUFTRAEGE.slice(), skillIds: TABELLE_SKILLS.map(x => Object.assign({}, x))});
    } catch (e) { tabellenMerker = null; }
    return tabellenMerker;
  }
  const hatInjektor = skill => Object.values(Spiel.INJEKTOREN || {}).some(i => (i.skills || []).includes(skill));

  /* ---------- Kanonisierung (§ 3.1): dieselbe Schleife auf jedem Gerät ----------
     Der Rückfall wird über den OBJEKTVERGLEICH erkannt: `fuerSeed` gibt bei „Fassung taugt nicht"
     dasselbe Objekt zurück (daten/basis.js), bei gelungener Seed-Fassung ein neues. */
  function kanonHand(def, variante){
    const c = C();
    if (!def) return {fehler: "auftrag", grund: "Diesen Auftrag gibt es in dieser Fassung nicht."};
    if (typeof def.fuerSeed !== "function") return {fehler: "fassung", grund: "Dieser Auftrag kennt keine Seed-Fassungen (fuerSeed fehlt)."};
    for (let k = 0; k < KANON_FENSTER; k++) {
      const s = c.kanonSeed(variante, k);
      let d = null;
      try { d = def.fuerSeed(s); } catch (e) { d = null; }
      if (d && d !== def && Spiel.ticketGueltig(d)) return {seed: s, def: d, eigene: true, schritte: k};
    }
    const s0 = c.kanonSeed(variante, 0);
    let d0 = null;
    try { d0 = def.fuerSeed(s0); } catch (e) { d0 = null; }
    if (d0 && Spiel.ticketGueltig(d0)) return {seed: s0, def: d0, eigene: false, schritte: KANON_FENSTER};
    return {fehler: "auftrag", grund: "Aus diesem Code lässt sich hier kein spielbarer Auftrag bauen."};
  }
  function kanonGeneriert(skill, variante){
    const c = C();
    for (let k = 0; k < KANON_FENSTER; k++) {
      const s = c.kanonSeed(variante, k);
      let d = null;
      /* KEIN opts.stufe: das kommt aus Spiel.einst.wahl (lokale Einstellung) und machte den Auftrag je Gerät anders. */
      try { d = Spiel.generiere(skill, s); } catch (e) { d = null; }
      if (d && Spiel.ticketGueltig(d)) return {seed: s, def: d, schritte: k};
    }
    return {fehler: "auftrag", grund: "Aus diesem Code lässt sich hier kein spielbarer Auftrag bauen."};
  }

  /* ---------- Speicher (store "klassenraum", § 7.1) ---------- */
  const version = () => (typeof LABOR_VERSION === "string" ? LABOR_VERSION : "");
  const leer = () => ({fassung: FASSUNG, programm: version(), sitzung: null, platz: null, letzte: null, zuletzt: jetzt(), zaehler: 0});
  function lies(){
    const k = store.get(SCHLUESSEL(), null);
    return k && typeof k === "object" && !Array.isArray(k) ? k : null;
  }
  function schreib(k){
    k.fassung = FASSUNG;
    k.programm = version();
    k.zuletzt = jetzt();
    store.set(SCHLUESSEL(), k);
    if (typeof Spiel.sofortSpeichern === "function") Spiel.sofortSpeichern();   /* eine Sitzung steht sofort auf der Platte */
    return k;
  }
  const sitzungVon = k => (k && k.sitzung && typeof k.sitzung === "object" && !Array.isArray(k.sitzung)) ? k.sitzung : null;
  const platzzahl = x => (Number.isInteger(x) && x >= 0 && x <= 31) ? x : null;

  /* ---------- erzeugen (§ 5) ---------- */
  function erzeugen(o){
    if (o === null || o === undefined || typeof o !== "object" || Array.isArray(o))
      return {fehler: "wahl", grund: "erzeugen erwartet ein Objekt mit genau einer Quelle: {ticketId} oder {skill}."};
    const c = C(), tab = tabellen();
    if (!c || !tab) return OHNE_CODEC;
    const hatTicket = typeof o.ticketId === "string" && o.ticketId.length > 0;
    const hatSkill = typeof o.skill === "string" && o.skill.length > 0;
    if (hatTicket === hatSkill) return {fehler: "wahl", grund: "Bitte genau einen Auftrag oder eine Fertigkeit wählen."};
    let art, index, ticketId = null, skill = null, basis = null;
    if (hatTicket) {
      art = "hand"; ticketId = o.ticketId;
      index = tab.auftraege.index(ticketId);
      if (index < 0) return {fehler: "auftrag", grund: `Diesen Auftrag gibt es in dieser Fassung nicht: ${ticketId}.`};
      basis = (DATEN.tickets || []).find(t => t.id === ticketId) || null;
      if (!basis) return {fehler: "auftrag", grund: `Diesen Auftrag gibt es in dieser Fassung nicht: ${ticketId}.`};
    } else {
      art = "generiert"; skill = o.skill;
      index = tab.skills.index(skill);
      if (index < 0) return {fehler: "auftrag", grund: `Diese Fertigkeit gibt es in dieser Fassung nicht: ${skill}.`};
      if (!tab.skills.tauglich(index) || !hatInjektor(skill))
        return {fehler: "auftrag", grund: `Für diese Fertigkeit lässt sich kein Auftrag bauen: ${skill}.`};
    }
    const dauerMin = Math.max(1, Math.min(120, typeof o.dauerMin === "number" && isFinite(o.dauerMin) ? Math.round(o.dauerMin) : 10));
    /* Zähler lesen: er speist Sitzungskennung und Wunsch-Variante (kein Math.random, § 5).
       Spiel.neuerSeed liest jetzt() und Spiel.st.naechsteIid – Spiel.st lädt den Stand bei Bedarf selbst. */
    const alt = lies() || leer();
    const zaehler = Number.isInteger(alt.zaehler) && alt.zaehler >= 0 ? alt.zaehler : 0;
    const id = 1 + (Spiel.neuerSeed("klassenraum-id:" + zaehler) % 31);                        /* 1..31 */
    const wunsch = typeof o.seed === "number" && isFinite(o.seed) ? (o.seed >>> 0) : Spiel.neuerSeed("klassenraum-variante:" + zaehler);
    const variante = wunsch % 256;                                                            /* 0..255 */
    const kanon = art === "hand" ? kanonHand(basis, variante) : kanonGeneriert(skill, variante);
    if (kanon.fehler) return {fehler: kanon.fehler, grund: kanon.grund};
    const code = c.auftragBauen({sitzung: id, art, index, variante});
    if (typeof code !== "string" || !code) return {fehler: "fassung", grund: "Der Codec konnte keinen Auftragscode bauen."};
    const titel = typeof o.titel === "string" && o.titel ? o.titel
      : (kanon.def && kanon.def.titel) || (art === "generiert" ? ((DATEN.skills || []).find(s => s.id === skill) || {}).name : ticketId) || "Klassenraum-Auftrag";
    const sitzung = {
      id, titel, art, ticketId: art === "hand" ? ticketId : kanon.def.id, skill: art === "generiert" ? skill : null,
      index, variante, seed: kanon.seed, eigene: art === "hand" ? !!kanon.eigene : false, schritte: kanon.schritte,
      code, dauerMin, plaetze: platzzahl(o.plaetze) ?? 0, erstellt: jetzt(), ergebnisse: {},
    };
    schreib(Object.assign({}, alt, {
      sitzung, zaehler: zaehler + 1,
      platz: platzzahl(alt.platz),                                 /* eigener Platz dieses Geräts bleibt */
      letzte: typeof alt.letzte === "string" ? alt.letzte : null,
    }));
    /* NICHT `code` nennen: der Bus-Hörer der Ansicht deutet jedes `code` als ERGEBNIS-Code und zeigt
       dafür 20 s lang einen Toast (src/ui/klassenraum.js:353-358) – beim Anlegen der Sitzung ist das
       der Auftragscode und damit schlicht falsch. Gemessen im Vorführlauf: der Toast verdeckte danach
       die Knöpfe „Eintragen"/„Datei…". */
    Spiel.melden("klassenraum", {art: "erzeugt", sitzung: sitzung.id, auftragscode: code});
    return tief(sitzung);
  }

  /* ---------- ausCode (§ 5: reine Rechnung, keine Ausnahme, keine Speicheränderung) ---------- */
  function ausCode(eingabe){
    const c = C(), tab = tabellen();
    if (!c || !tab) return OHNE_CODEC;
    let r = null;
    try { r = c.auftragLesen(eingabe, tab); } catch (e) { return {fehler: "prüfziffer", grund: "Der Code ließ sich nicht lesen."}; }
    if (r === null || r === undefined) return null;                    /* nichts eingetippt = keine Fehlermeldung */
    if (r.ok !== true) {
      /* Der Codec liefert zu jeder Fehlerklasse einen Hinweis (z. B. „das sieht nach einem Ergebnis-Code aus") –
         der gehört zur Oberfläche, § 1.5. */
      const e = {fehler: r.fehler || "prüfziffer", grund: r.grund || "Dieser Code ist nicht gültig."};
      if (typeof r.hinweis === "string" && r.hinweis) e.hinweis = r.hinweis;
      return e;
    }
    const variante = r.variante, seedStart = c.kanonSeed(variante, 0);
    let ticketId, skill = null, eigene = false, schritte = 0, def = null, seed = seedStart;
    if (r.art === "generiert") {
      skill = r.skill;
      const kanon = kanonGeneriert(skill, variante);
      if (kanon.fehler) return {fehler: "auftrag", grund: kanon.grund};
      ticketId = kanon.def.id; def = kanon.def; seed = kanon.seed; schritte = kanon.schritte;
    } else {
      ticketId = r.ticketId;
      const d = (DATEN.tickets || []).find(t => t.id === ticketId) || null;
      if (!d) return {fehler: "auftrag", grund: `Diesen Auftrag gibt es in dieser Fassung nicht: ${ticketId}.`};
      const kanon = kanonHand(d, variante);
      if (kanon.fehler) return {fehler: "auftrag", grund: kanon.grund};
      def = kanon.def; eigene = !!kanon.eigene; seed = kanon.seed; schritte = kanon.schritte;
    }
    return {ticketId, seed, art: r.art, sitzung: r.sitzung, index: r.index, variante, skill, eigene, schritte,
      code: r.code, _def: def};
  }

  /* ---------- sitzung / ergebnisCode / ergebnisLesen / ergebnisEintragen (§ 5, § 6) ---------- */
  function sitzung(){ const s = sitzungVon(lies()); return s ? tief(s) : null; }

  function ergebnisCode(inst, abnahme){
    if (!inst || typeof inst !== "object") return {fehler: "auftrag", grund: "Kein Auftrag übergeben."};
    const kr = inst.klassenraum;
    if (!kr || typeof kr !== "object" || Array.isArray(kr)) return {fehler: "auftrag", grund: "Dieser Auftrag kam nicht über einen Klassenraum-Code."};
    if (!Number.isInteger(kr.sitzung) || kr.sitzung < 1 || kr.sitzung > 31)
      return {fehler: "auftrag", grund: `inst.klassenraum.sitzung muss 1..31 sein (ist: ${JSON.stringify(kr.sitzung)}).`};
    const platz = Number.isInteger(kr.platz) ? kr.platz : 0;
    if (platz < 0 || platz > 31) return {fehler: "auftrag", grund: `inst.klassenraum.platz muss 0..31 sein (ist: ${JSON.stringify(kr.platz)}).`};
    if (!abnahme || typeof abnahme !== "object") return {fehler: "abnahme", grund: "Ohne Abnahme gibt es keinen Ergebnis-Code."};
    if (abnahme.bestanden !== true) return {fehler: "abnahme", grund: "Der Auftrag ist noch nicht bestanden."};
    const sterne = typeof abnahme.sterne === "number" && isFinite(abnahme.sterne) ? Math.max(0, Math.min(5, abnahme.sterne)) : 0;
    const versuche = Math.max(0, Math.min(3, (inst.abnahmen || 1) - 1));                     /* 2 Bit: Fehlversuche, „3+" */
    const dauerS = Math.max(0, Math.min(5110, Math.round((inst.zeitMs || 0) / 1000)));        /* 9 Bit in 10-s-Einheiten */
    const c = C();
    if (!c || typeof c.ergebnisBauen !== "function") return OHNE_CODEC;
    let code = null;
    try { code = c.ergebnisBauen({sitzung: kr.sitzung, platz, sterne, versuche, dauerS}); } catch (e) { code = null; }
    if (typeof code !== "string" || !code) return {fehler: "fassung", grund: "Der Codec konnte keinen Ergebnis-Code bauen."};
    return code;
  }

  function ergebnisLesen(eingabe){
    const c = C();
    if (!c || typeof c.ergebnisLesen !== "function") return OHNE_CODEC;
    let r = null;
    try { r = c.ergebnisLesen(eingabe); } catch (e) { return {fehler: "prüfziffer", grund: "Der Ergebnis-Code ließ sich nicht lesen."}; }
    if (r === null || r === undefined) return null;
    if (r.ok !== true) return {fehler: r.fehler || "prüfziffer", grund: r.grund || "Dieser Ergebnis-Code ist nicht gültig."};
    return {ok: true, sitzung: r.sitzung, platz: r.platz, sterne: r.sterne, dauerS: r.dauerS, versuche: r.versuche, code: r.code || null};
  }

  /* ---------- Hilfecode (Säule 5, Architektur § 12.4): der Azubi sagt, wo er hängt ----------
     Der Code trägt Sitzung, Platz und zwei Zählerstände – sonst nichts: kein Name, keine Bewertung,
     keine Rangfolge. Die Lehrkraft tippt ihn in ihr BESTEHENDES Feld „Ergebnis-Codes" (kein neues
     Bedienelement, R12 bleibt 6).
     Die Zähler kommen aus `Spiel.zieleStatus(inst)` (ticket.js:106-111): eine Liste je Ziel mit
     `ok = true | false | null` (null, wenn die Simulation fehlt). `schritt` = erfüllte Ziele,
     `offen` = alles Übrige — so gilt immer `schritt + offen = gesamt`, und ein nicht beweisbares Ziel
     zählt NICHT als geschafft. Bewusst die reine `zieleStatus`, nicht `zieleLive` (das schreibt Laufzeit). */
  function hilfeCode(inst){
    if (!inst || typeof inst !== "object") return {fehler: "auftrag", grund: "Kein Auftrag übergeben."};
    const kr = inst.klassenraum;
    if (!kr || typeof kr !== "object" || Array.isArray(kr)) return {fehler: "auftrag", grund: "Dieser Auftrag kam nicht über einen Klassenraum-Code."};
    if (!Number.isInteger(kr.sitzung) || kr.sitzung < 1 || kr.sitzung > 31)
      return {fehler: "sitzung", grund: `inst.klassenraum.sitzung muss 1..31 sein (ist: ${JSON.stringify(kr.sitzung)}).`};
    const platz = Number.isInteger(kr.platz) ? kr.platz : 0;
    if (platz < 0 || platz > 31) return {fehler: "auftrag", grund: `inst.klassenraum.platz muss 0..31 sein (ist: ${JSON.stringify(kr.platz)}).`};
    const status = typeof Spiel.zieleStatus === "function" ? (Spiel.zieleStatus(inst) || []) : [];
    const gesamt = status.length;
    if (!gesamt) return {fehler: "auftrag", grund: "Zu diesem Auftrag gibt es keine Ziele – ein Hilfecode hätte nichts zu sagen."};
    const schritt = status.filter(s => s && s.ok === true).length;
    const offen = Math.max(0, gesamt - schritt);
    if (schritt > 31 || offen > 31)
      return {fehler: "fassung", grund: `Dieser Auftrag hat ${gesamt} Ziele – das 5-Bit-Feld des Hilfecodes trägt höchstens 31.`};
    const c = C();
    if (!c || typeof c.hilfeBauen !== "function") return OHNE_CODEC;
    const code = c.hilfeBauen({sitzung: kr.sitzung, platz, schritt, offen});
    if (typeof code !== "string" || !code) return {fehler: "fassung", grund: "Der Codec konnte keinen Hilfecode bauen."};
    return code;
  }

  function hilfeLesen(eingabe){
    const c = C();
    if (!c || typeof c.hilfeLesen !== "function") return OHNE_CODEC;
    let r = null;
    try { r = c.hilfeLesen(eingabe); } catch (e) { return {fehler: "prüfziffer", grund: "Der Hilfecode ließ sich nicht lesen."}; }
    if (r === null || r === undefined) return null;
    if (r.ok !== true) {
      const e = {fehler: r.fehler || "prüfziffer", grund: r.grund || "Dieser Hilfecode ist nicht gültig."};
      if (typeof r.hinweis === "string" && r.hinweis) e.hinweis = r.hinweis;
      return e;
    }
    return {ok: true, sitzung: r.sitzung, platz: r.platz, schritt: r.schritt, offen: r.offen, code: r.code};
  }

  /* Idempotent: Schlüssel ist der PLATZ, der erste Eintrag gewinnt (§ 5.1, § 6.2). */
  function ergebnisEintragen(eingabe){
    const gelesen = ergebnisLesen(eingabe);
    if (gelesen === null) return {fehler: "länge", grund: "Es wurde kein Ergebnis-Code eingegeben."};
    if (gelesen.fehler) return {fehler: gelesen.fehler, grund: gelesen.grund};
    const k = lies();
    const s = sitzungVon(k);
    if (!s) return {fehler: "sitzung", grund: "Es läuft keine Sitzung – erst einen Auftrag erzeugen."};
    if (gelesen.sitzung !== s.id)
      return {fehler: "sitzung", grund: `Dieser Ergebnis-Code gehört zu Sitzung ${gelesen.sitzung} – hier läuft Sitzung ${s.id}.`};
    if (!s.ergebnisse || typeof s.ergebnisse !== "object" || Array.isArray(s.ergebnisse)) s.ergebnisse = {};
    const schluessel = String(gelesen.platz);
    const alt = s.ergebnisse[schluessel];
    if (alt) return alt.code === gelesen.code
      ? {ok: true, neu: false, grund: "doppelt", platz: gelesen.platz, sterne: gelesen.sterne}
      : {ok: true, neu: false, grund: "platz-schon-da", platz: gelesen.platz, sterne: alt.sterne};
    s.ergebnisse[schluessel] = {platz: gelesen.platz, sterne: gelesen.sterne, dauerS: gelesen.dauerS, versuche: gelesen.versuche,
      code: gelesen.code, zeit: jetzt(), quelle: "eingabe"};
    k.letzte = gelesen.code;
    schreib(k);
    Spiel.melden("klassenraum", {art: "ergebnis", platz: gelesen.platz});
    return {ok: true, neu: true, platz: gelesen.platz, sterne: gelesen.sterne};
  }

  /* ---------- Export / Import (§ 7.2: verlustfrei, mit Fassungsprüfung, wirft nie) ---------- */
  function exportieren(){
    const s = sitzungVon(lies());
    if (!s) return {fehler: "sitzung", grund: "Es läuft keine Sitzung – nichts zu exportieren."};
    return JSON.stringify({format: "netzwerk-labor/klassenraum", fassung: FASSUNG, programm: version(), zeit: jetzt(), sitzung: tief(s)});
  }

  function importieren(text){
    if (typeof text !== "string" || !text.trim()) return {fehler: "format", grund: "Die Datei ist leer."};
    let roh = null;
    try { roh = JSON.parse(text); } catch (e) { return {fehler: "format", grund: "Das ist keine JSON-Datei."}; }
    if (!roh || typeof roh !== "object" || Array.isArray(roh)) return {fehler: "format", grund: "Das ist keine Klassenraum-Datei."};
    if (roh.format !== "netzwerk-labor/klassenraum") return {fehler: "format", grund: "Das ist keine Klassenraum-Datei (format fehlt)."};
    const f = Number.isInteger(roh.fassung) ? roh.fassung : FASSUNG;
    if (f > FASSUNG) return {fehler: "fassung", grund: `Die Datei stammt aus einer neueren Fassung (Stand ${f}); dieses Programm kennt nur ${FASSUNG}.`};
    if (!("sitzung" in roh)) return {fehler: "format", grund: "In der Datei fehlt die Sitzung."};
    const s = roh.sitzung;
    if (!s || typeof s !== "object" || Array.isArray(s)) return {fehler: "format", grund: "Die Sitzung in der Datei ist unbrauchbar."};
    if (s.ergebnisse != null && (typeof s.ergebnisse !== "object" || Array.isArray(s.ergebnisse)))
      return {fehler: "format", grund: "Die Ergebnisliste in der Datei ist unbrauchbar (Abbildung Platz → Ergebnis erwartet)."};
    /* Pflichtfelder bekommen Standardwerte, unbekannte Felder bleiben erhalten (verlustfrei). */
    const neu = Object.assign({}, s);
    if (!Number.isInteger(neu.id)) neu.id = 1;
    if (neu.art !== "hand" && neu.art !== "generiert") neu.art = "hand";
    if (!Number.isInteger(neu.index)) neu.index = 0;
    if (!Number.isInteger(neu.variante)) neu.variante = 0;
    if (!Number.isInteger(neu.seed) || neu.seed < 1) neu.seed = 1;
    if (typeof neu.eigene !== "boolean") neu.eigene = false;
    if (!Number.isInteger(neu.schritte)) neu.schritte = 0;
    if (typeof neu.code !== "string") neu.code = "";
    if (typeof neu.titel !== "string") neu.titel = "";
    if (neu.ticketId == null) neu.ticketId = null;
    if (neu.skill == null) neu.skill = null;
    if (!Number.isInteger(neu.dauerMin)) neu.dauerMin = 10;
    if (!Number.isInteger(neu.plaetze)) neu.plaetze = 0;
    if (!Number.isInteger(neu.erstellt)) neu.erstellt = jetzt();
    if (!neu.ergebnisse || typeof neu.ergebnisse !== "object") neu.ergebnisse = {};
    const alt = lies() || leer();
    const k = Object.assign({}, alt, {
      fassung: FASSUNG,
      programm: typeof roh.programm === "string" ? roh.programm : version(),   /* abweichendes programm wird angenommen */
      sitzung: neu, zaehler: Number.isInteger(alt.zaehler) ? alt.zaehler : 0,
      platz: platzzahl(alt.platz),
    });
    schreib(k);
    Spiel.melden("klassenraum", {art: "import", sitzung: neu.id});
    return {ok: true, sitzung: tief(neu)};
  }

  /* ---------- Zusatzfläche (§ 5): Netzkennwert, taugliche Fertigkeiten, Platz, Plätze ---------- */
  function netzkennwert(netz){
    const c = C();
    if (!c || typeof c.abdruck !== "function") return "";
    try { return c.abdruck(netz); } catch (e) { return ""; }
  }
  function tauglicheFertigkeiten(){
    const tab = tabellen();
    const liste = tab ? tab.tauglicheFertigkeiten() : TABELLE_SKILLS.map((x, index) => ({skill: x.id, index, ersterSeed: x.ersterSeed}));
    return liste.filter(x => hatInjektor(x.skill));    /* angeboten wird nur, was hier wirklich baubar ist */
  }
  function platz(){ const k = lies(); return k ? platzzahl(k.platz) : null; }
  function platzSetzen(zahl){
    if (!Number.isInteger(zahl) || zahl < 0 || zahl > 31) return {fehler: "wahl", grund: "Der Platz muss eine ganze Zahl von 0 bis 31 sein."};
    const k = Object.assign(leer(), lies() || {});
    k.platz = zahl;
    schreib(k);
    return {ok: true, platz: zahl};
  }
  /* Plätze der Sitzung (L6): Nenner der Ampel. 0 = „nicht eingestellt" (nicht 0 Plätze); gültig 1..31,
     weil `platz` im Code 5 Bit hat. „Offen" wird gerechnet (plaetze − eingetragen), nirgends gespeichert. */
  function plaetze(){ const s = sitzungVon(lies()); return s && Number.isInteger(s.plaetze) && s.plaetze >= 1 && s.plaetze <= 31 ? s.plaetze : 0; }
  function plaetzeSetzen(zahl){
    if (!Number.isInteger(zahl) || zahl < 0 || zahl > 31) return {fehler: "wahl", grund: "Die Platzzahl muss eine ganze Zahl von 0 bis 31 sein (0 = nicht eingestellt)."};
    const k = lies();
    const s = sitzungVon(k);
    if (!s) return {fehler: "sitzung", grund: "Es läuft keine Sitzung – erst einen Auftrag erzeugen."};
    s.plaetze = zahl;
    schreib(k);
    Spiel.melden("klassenraum", {art: "plaetze", plaetze: zahl});
    return {ok: true, plaetze: zahl};
  }

  /* ---------- abnehmen (task-2/task-21): die Annahmehälfte ----------
     `Spiel.abschliessen` leitet `quelle === "klassenraum"` hierher um: kein Geld, kein Ruf, kein
     `st.erledigt`, keine Wochenwertung, keine Abzeichen, kein Karriere-Ereignis – aber der Lernwert
     bleibt (`Spiel.lernenNachAbnahme`), genau wie beim Training.
     Die Bus-Meldung trägt den FERTIGEN Ergebnis-Code: er wird VOR dem Entfernen der Instanz gebildet
     (danach findet Spiel.instanz(iid) nichts mehr) – die Oberfläche zeigt ihn als Toast mit Kopierknopf. */
  const abnahmeVon = (inst, ergebnis) => (ergebnis && typeof ergebnis === "object" && Array.isArray(ergebnis.ergebnisse))
    ? ergebnis : Spiel.abnahme(inst);

  function abnehmen(instanz, ergebnis){
    const inst = typeof instanz === "string" ? Spiel.instanz(instanz) : instanz;
    if (!inst) return {ok: false, grund: "Dieser Klassenraum-Auftrag ist nicht mehr da."};
    if (inst.quelle !== "klassenraum") return {ok: false, grund: "Das ist kein Klassenraum-Auftrag."};
    const def = Spiel.defVon(inst);
    if (!def) return {ok: false, grund: "Zu diesem Auftrag fehlt die Aufgabe."};
    const ab = abnahmeVon(inst, ergebnis);
    const lernen = Spiel.lernenNachAbnahme(inst, def, ab);     /* der Lernwert – die eine Auflage */
    const ergebnisText = ab.bestanden ? ergebnisCode(inst, ab) : null;
    if (ab.bestanden) Spiel.instanzEntfernen(inst.iid);        /* gelöst: der Auftrag ist durch (wie beim Training) */
    const daten = {
      ok: true, klassenraum: inst.klassenraum || null,
      bestanden: !!ab.bestanden, sterne: ab.bestanden ? (ab.sterne || 0) : 0,
      abnahme: ab, lernen, def, inst,
      euro: 0, ruf: 0, lohn: {euro: 0, grund: 0, tempo: 0, ruf: 0},
      dank: "", erklaerung: def.erklaerung || "", quelle: def.quelle || "",
      naechstes: null, dex: [], raetsel: null, woche: null, verdacht: null, hotline: null, kundenakte: null, flow: null,
      hinweis: "Klassenraum-Auftrag: zahlt kein Geld und keinen Ruf und zählt nicht zur Karriere – er zählt für den Lernstand.",
    };
    Spiel.melden("klassenraum", {iid: inst.iid, bestanden: daten.bestanden, sterne: daten.sterne,
      code: typeof ergebnisText === "string" ? ergebnisText : null});
    Spiel.geaendert("klassenraum");
    Spiel.sofortSpeichern();
    return daten;
  }

  return {erzeugen, ausCode, sitzung, ergebnisCode, ergebnisLesen, ergebnisEintragen, hilfeCode, hilfeLesen,
    exportieren, importieren, netzkennwert, tauglicheFertigkeiten, platz, platzSetzen, plaetze, plaetzeSetzen,
    abnehmen, tabellen};
})();
