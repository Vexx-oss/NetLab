"use strict";
/* AUFTRAGSTEXTE MESSEN (Befund des Nutzers: „die Aufgabentexte sind teilweise richtig schlecht
   geschrieben"). Dieses Werkzeug URTEILT NICHT — es legt Zahlen vor: Länge je Feld, Satzlängen,
   Wiederholungen über Aufträge hinweg, Füllwörter, Platzhalter. Erst danach wird geschrieben.

   Aufruf:  <node> tools/texte-messen.js [--alle]
   Lädt die Datenschichten genau wie tests/run.js in EINEN Kontext (sonst fehlen Querverweise). */
const fs = require("fs"), path = require("path"), vm = require("vm");
const W = path.resolve(__dirname, ".."), SRC = path.join(W, "src");
const SCH = [["kern", ["basis.js", "netz.js"]], ["@lernmotor", []], ["modell", ["geraete.js"]],
             ["sim", ["engine.js"]], ["cli", ["parser.js"]], ["daten", ["basis.js"]], ["spiel", ["zustand.js"]]];
const LM = [path.resolve(W, "..", "FISI-Spielhalle", "src", "lernmotor.js"), path.join(W, "fremd", "lernmotor.js")].find(f => fs.existsSync(f));
const KOPF = /^\/\*\s*=+[\s\S]*?=+\s*\*\/\s*/;
const code = ['"use strict"; const LABOR_VERSION = "messen";'];
for (const [ordner, kopf] of SCH) {
  if (ordner === "@lernmotor") { let t = fs.readFileSync(LM, "utf8"); if (LM.includes("fremd")) t = t.replace(KOPF, ""); code.push(t); continue; }
  const d = path.join(SRC, ordner), alle = fs.readdirSync(d).filter(n => n.endsWith(".js")).sort();
  for (const n of [...kopf.filter(x => alle.includes(x)), ...alle.filter(x => !kopf.includes(x))]) code.push(fs.readFileSync(path.join(d, n), "utf8"));
}
code.push("globalThis.DATEN = DATEN; globalThis.Spiel = typeof Spiel !== 'undefined' ? Spiel : null;" +
          "globalThis.Zufall = typeof Zufall !== 'undefined' ? Zufall : null;");
const ctx = vm.createContext({ console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename });
vm.runInContext(code.join("\n"), ctx, { filename: "labor-daten.js" });
const DATEN = ctx.DATEN, Spiel = ctx.Spiel, Zufall = ctx.Zufall;

/* ---------- Textfelder einsammeln ---------- */
const FELDER = ["titel", "symptom", "brief", "text", "anruf", "hinweis", "kundenhinweis", "auftrag"];
const kurz = s => (s || "").replace(/\s+/g, " ").trim();
const saetze = t => kurz(t).split(/(?<=[.!?])\s+/).filter(s => s.length > 1);
const woerter = t => kurz(t).split(/\s+/).filter(Boolean);

const alle = Object.entries(DATEN.tickets || {}).map(([k, d]) => ({ key: k, id: d.id || k, def: d }));
const lang = [], zeilen = [];
for (const t of alle) {
  let summe = 0, felder = [];
  for (const f of FELDER) {
    const v = t.def[f];
    if (typeof v === "string" && v.trim()) { summe += kurz(v).length; felder.push([f, kurz(v)]); }
  }
  const ziele = Array.isArray(t.def.ziele) ? t.def.ziele : [];
  for (const z of ziele) if (z.text) summe += kurz(z.text).length;
  lang.push({ t, summe, felder, ziele: ziele.length, stufe: t.def.stufe || "?", skills: (t.def.skills || []).join(",") });
  zeilen.push({ id: t.id, titel: kurz(t.def.titel), symptom: kurz(t.def.symptom), gesamt: summe, felder });
}

/* ---------- Kennzahlen ---------- */
const zahlen = a => { const s = [...a].sort((x, y) => x - y); return { min: s[0], median: s[Math.floor(s.length / 2)], max: s[s.length - 1], mittel: Math.round(s.reduce((p, c) => p + c, 0) / s.length) }; };
console.log(`Aufträge: ${zeilen.length}`);
console.log(`Titellänge   : ${JSON.stringify(zahlen(zeilen.map(z => z.titel.length)))}`);
console.log(`Symptomlänge : ${JSON.stringify(zahlen(zeilen.map(z => z.symptom.length)))}`);
console.log(`Text gesamt  : ${JSON.stringify(zahlen(zeilen.map(z => z.gesamt)))}`);
console.log();

/* ---------- Wiederholungen: Sätze und Satzanfänge, die mehrfach vorkommen ---------- */
const satzZaehler = new Map(), anfangZaehler = new Map(), titelWorte = new Map();
for (const z of zeilen) {
  for (const f of z.felder) for (const s of saetze(f[1])) {
    const k = s.toLowerCase().replace(/[^a-zäöüß0-9 ]/g, "");
    satzZaehler.set(k, (satzZaehler.get(k) || 0) + 1);
    const a = k.split(" ").slice(0, 3).join(" ");
    anfangZaehler.set(a, (anfangZaehler.get(a) || 0) + 1);
  }
  for (const w of woerter(z.titel).map(w => w.toLowerCase().replace(/[^a-zäöüß0-9]/g, ""))) if (w.length > 3) titelWorte.set(w, (titelWorte.get(w) || 0) + 1);
}
const mehrfach = [...satzZaehler.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
console.log(`Sätze, die WÖRTLICH mehrfach vorkommen: ${mehrfach.length}`);
for (const [s, n] of mehrfach.slice(0, 12)) console.log(`  ${n}x  „${s.slice(0, 90)}“`);
console.log();
console.log(`Häufigste Satzanfänge: ${[...anfangZaehler.entries()].filter(([, n]) => n > 2).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([a, n]) => `${n}x „${a}…“`).join(" · ")}`);
console.log(`Häufigste Titelwörter: ${[...titelWorte.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([w, n]) => `${w}(${n})`).join(" · ")}`);
console.log();

/* ---------- Auffälligkeiten je Auftrag ---------- */
const FUll = /\b(irgendwie|halt|eben|einfach mal|sozusagen|gewissermaßen|quasi|eventuell vielleicht)\b/i;
const auffaellig = [];
for (const z of zeilen) {
  const gruende = [];
  /* Jedes Feld EINZELN prüfen – vorher wurden Titel und Symptom ohne Trenner verkettet, und die
     Satzprüfung erfand daraus Sätze, die im Text nicht stehen (Befund von denkhilfen-2, 09.10.2026). */
  const gesamtText = z.felder.map(f => f[1]).join(" ");
  const felderSätze = z.felder.flatMap(f => saetze(f[1]));
  if (z.titel.length > 46) gruende.push(`Titel ${z.titel.length} Zeichen`);
  if (z.titel.length < 15) gruende.push(`Titel nur ${z.titel.length} Zeichen`);
  if (z.symptom.length < 30) gruende.push(`Symptom nur ${z.symptom.length} Zeichen`);
  if (z.gesamt < 120) gruende.push(`Auftragstext gesamt nur ${z.gesamt} Zeichen`);
  if (!/[.!?]$/.test(z.symptom)) gruende.push("Symptom endet ohne Satzzeichen");
  if (FUll.test(gesamtText)) gruende.push("Füllwort");
  if (/\bTODO|XXX|lorem|\?\?\?/.test(gesamtText)) gruende.push("Platzhalter");
  const langerSatz = felderSätze.find(s => woerter(s).length > 24);
  if (langerSatz) gruende.push(`Satz mit ${woerter(langerSatz).length} Wörtern (in einem Feld)`);
  const woerterGesamt = z.felder.reduce((p, f) => p + woerter(f[1]).length, 0);
  if (felderSätze.length && woerterGesamt / felderSätze.length > 20) gruende.push("Sätze im Mittel sehr lang");
  if (gruende.length) auffaellig.push({ id: z.id, titel: z.titel, gruende });
}
console.log(`Aufträge mit Auffälligkeit: ${auffaellig.length} von ${zeilen.length}`);
for (const a of auffaellig) console.log(`  ${a.id.padEnd(16)} ${(a.titel || "").padEnd(34)} ${a.gruende.join(" · ")}`);

/* ---------- Tor: die Regeln des Stilfadens prüfen (--tor) ----------
   Rückgabewert 1, wenn ein Auftrag eine Regel verletzt. Die Regeln stehen in
   `docs/entwicklung/Stilfaden – Auftragstexte.md` § 1/§ 2/§ 5 und sind ABSICHTLICH hier
   nachgerechnet: das Tor muss dieselbe Zahl liefern wie der Bericht. */
/* Die vier Bausteine werden mit WEITEN Wortlisten gesucht. Sie sind eine Heuristik, kein Beweis:
   die erste, zu enge Fassung meldete gute Texte als Verstoß (Befund 09.10.2026 – „nachgeschaut"
   und „keine Termine, keine Besprechungen" fehlten). Was hier anschlägt, ist ein HINWEIS zum
   Nachlesen; hart geprüft werden Länge, Satzzahl, Ursachenwörter und Titellänge. */
const ZEIT = /\b(seit|gestern|heute|heute morgen|heute früh|heute nachmittag|heute vormittag|vorgestern|nach dem|nach der|beim|letzte woche|letzten|am wochenende|über nacht|seitdem|vorhin|eben|gerade eben|nacht|zum ersten|am montag|am dienstag|am mittwoch|am donnerstag|am freitag)\b/i;
const FOLGE = /\b(können|kann|können wir|kann ich|können keine|steht still|steht|warten|müssen warten|geht nicht raus|kommt nicht raus|geht nichts|keine (?:karten)?zahlung|fällt aus|geht nur noch|müssen (?:wir )?(?:per hand|von hand|händisch)|keine bestellungen|kommt nicht (?:mehr )?(?:durch|raus|rein)|bleibt (?:die )?arbeit liegen|bleibt liegen|verdienen kein geld|läuft nicht mehr|keine termine|keine besprechungen|schlange|die hälfte|geht die hälfte|ohne (?:die|das|den) \w+ geht|sonst steht|steht die \w+ still|liegen bleibt|nicht rausschicken|nicht raus|kommt nicht an|nicht mehr an die|kostet|verlieren|fällt die \w+ aus)\b/i;
const VERSUCH = /\b(neu(?:ge)?startet|neu gestartet|neu starten|neustart|neu eingerichtet|neu aufgesetzt|probiert|versucht|getauscht|umgesteckt|umgesteckt|gezogen|abgezogen|gesteckt|eingesteckt|angeschlossen|gefragt|nachgesehen|nachgeschaut|ausprobiert|resettet|zurückgesetzt|an- und ausgeschaltet|ab- und wieder angeschaltet|nachgetragen|zweimal|dreimal|mehrmals|extra)\b/i;
const URSACHE = /\b(VLAN|Subnetzmaske|Subnet|Präfix|Gateway|Standardgateway|Route|Routing|DNS-Eintrag|DNS-Server|Trunk|Spanning Tree|STP|DHCP-Pool|DHCP-Server|Lease|Reservierung|Portsicherheit|Port-Security|ACL|NAT|Firewall-Regel|Doppelvergabe|Adresskonflikt|falsche Maske|Port ist down|VLAN-Fehler|Konfigurationsfehler)\b/i;
const FUELLWORT = /\b(irgendwie|quasi|halt|eben mal|sozusagen|gewissermaßen|eventuell vielleicht|wie gesagt)\b/i;

if (process.argv.includes("--tor")) {
  const verstoesse = [], hinweise = [];
  for (const z of zeilen) {
    const s = kurz((z.felder.find(f => f[0] === "symptom") || ["", ""])[1]);
    const hart = [], weich = [];
    /* ---------- HART: diese Regeln entscheiden (messbar, nicht auslegbar) ---------- */
    if (s.length < 180) hart.push(`Symptom nur ${s.length} Zeichen (Soll 180–420)`);
    if (s.length > 420) hart.push(`Symptom ${s.length} Zeichen (Soll 180–420)`);
    const ss = saetze(s);
    if (ss.length < 2) hart.push(`nur ${ss.length} Satz (Soll 2–4)`);
    if (ss.length > 4) hart.push(`${ss.length} Sätze (Soll 2–4)`);
    if (z.titel.length < 15) hart.push(`Titel nur ${z.titel.length} Zeichen (Soll 15–46)`);
    if (z.titel.length > 46) hart.push(`Titel ${z.titel.length} Zeichen (Soll 15–46)`);
    const f = s.match(FUELLWORT);
    if (f) hart.push(`Füllwort: „${f[0]}“`);
    /* Ursachenwörter: erlaubt ist, was der Kunde ABLIEST (zitierte Bildschirmmeldung, „von wegen …“,
       „es steht …“). Verboten ist die eigene Deutung des Erzählers – ein Kunde diagnostiziert nicht. */
    for (const m of s.matchAll(new RegExp(URSACHE.source, "gi"))) {
      const davor = s.slice(Math.max(0, m.index - 40), m.index).toLowerCase();
      const abgelesen = /(meldung|meldet|steht|zeigt|sagt|von wegen|an, dass|angesagt|bildschirm|display|fehlertext)/.test(davor);
      if (!abgelesen) hart.push(`Ursache genannt (nicht abgelesen): „${m[0]}“`);
    }
    /* ---------- WEICH: Hinweise zum Nachlesen. Die vier Bausteine sind Sprache – eine Regex kann
       sie nicht beweisen (Befund 09.10.2026: eine zu enge Fassung meldete sieben GUTE Texte). ---------- */
    if (!ZEIT.test(s)) weich.push("kein Anlass/Zeitmarke gefunden (Hinweis)");
    if (!FOLGE.test(s)) weich.push("keine Folge für den Betrieb gefunden (Hinweis)");
    if (!VERSUCH.test(s)) weich.push("kein ‚schon versucht‘ gefunden (Hinweis)");
    if (hart.length) verstoesse.push({ id: z.id, titel: z.titel, g: hart });
    if (weich.length) hinweise.push({ id: z.id, titel: z.titel, g: weich });
  }
  console.log(`\n===== TOR (Stilfaden) =====`);
  console.log(`Aufträge: ${zeilen.length} · ohne Verstoß: ${zeilen.length - verstoesse.length} · mit hartem Verstoß: ${verstoesse.length}`);
  for (const v of verstoesse) console.log(`  ✗ ${v.id.padEnd(18)} ${(v.titel || "").padEnd(30)} ${v.g.join(" · ")}`);
  const je = new Map();
  for (const v of verstoesse) for (const g of v.g) { const k = g.replace(/\d+/g, "N").split(" (")[0].split(":")[0]; je.set(k, (je.get(k) || 0) + 1); }
  console.log(`Harte Verstöße: ${[...je.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} (${n})`).join(" · ") || "keine"}`);
  console.log(`\nHinweise (kein Verstoß, zum Nachlesen): ${hinweise.length} Aufträge`);
  for (const h of hinweise) console.log(`  · ${h.id.padEnd(18)} ${(h.titel || "").padEnd(30)} ${h.g.join(" · ")}`);
  process.exitCode = verstoesse.length ? 1 : 0;
}

/* ---------- --pruefen: Stil-Gate für generierte Tickets und Handtickets (Architektur § 17.2) ----------
   Prüft 100 Seeds je Form (Prüfung, Tagesrätsel, Postfach) und alle Handtickets. Die Muster kommen aus
   Spiel.STIL (src/spiel/generator.js) – EINE Quelle mit dem Generator; nur wenn sie fehlt, gilt die Kopie oben.
   Exit 1 bei einem harten Verstoß. Der Lauf enthält die GEGENPROBE: ein künstlich schlechter Text MUSS rot
   werden, sonst wäre das Tor blind. Aufruf in tests/texte-stil.test.js (läuft bei jedem Testlauf/CI mit). */
if (process.argv.includes("--pruefen")) {
  const ST = (Spiel && Spiel.STIL) || {};
  const ST_URSACHE = ST.URSACHE || URSACHE, ST_FUELL = ST.FUELLWORT || FUELLWORT;
  const ST_ZEIT = ST.ZEIT || ZEIT, ST_FOLGE = ST.FOLGE || FOLGE, ST_VERSUCH = ST.VERSUCH || VERSUCH;
  const TITEL_MIN = ST.TITEL_MIN || 15, TITEL_MAX = ST.TITEL_MAX || 46;
  const SYM_MIN = ST.SYMPTOM_MIN || 180, SYM_MAX = ST.SYMPTOM_MAX || 420;
  const SATZ_MIN = ST.SAETZE_MIN || 2, SATZ_MAX = ST.SAETZE_MAX || 4;

  function stilPruefen(id, titel, symptom, briefing, generiert){
    const hart = [], weich = [];
    const s = kurz(symptom), t = kurz(titel);
    if (s.length < SYM_MIN) hart.push("Symptom " + s.length + " Zeichen (Soll " + SYM_MIN + "–" + SYM_MAX + ")");
    if (s.length > SYM_MAX) hart.push("Symptom " + s.length + " Zeichen (Soll " + SYM_MIN + "–" + SYM_MAX + ")");
    const ss = saetze(s);
    if (ss.length < SATZ_MIN) hart.push("nur " + ss.length + " Satz (Soll " + SATZ_MIN + "–" + SATZ_MAX + ")");
    if (ss.length > SATZ_MAX) hart.push(ss.length + " Sätze (Soll " + SATZ_MIN + "–" + SATZ_MAX + ")");
    if (t.length < TITEL_MIN) hart.push("Titel nur " + t.length + " Zeichen (Soll " + TITEL_MIN + "–" + TITEL_MAX + ")");
    if (t.length > TITEL_MAX) hart.push("Titel " + t.length + " Zeichen (Soll " + TITEL_MIN + "–" + TITEL_MAX + ")");
    if (!/[.!?]$/.test(s)) hart.push("Symptom endet ohne Satzzeichen");
    if (ST_FUELL.test(s)) { const f = s.match(ST_FUELL); hart.push("Füllwort: „" + f[0] + "“"); }
    /* Ursachenwort: erlaubt ist, was der Kunde ABLIEST (zitierte Bildschirmmeldung) – wie im --tor-Lauf. */
    for (const m of s.matchAll(new RegExp(ST_URSACHE.source, "gi"))) {
      const davor = s.slice(Math.max(0, m.index - 40), m.index).toLowerCase();
      if (!/(meldung|meldet|steht|zeigt|sagt|von wegen|an, dass|angesagt|bildschirm|display|fehlertext)/.test(davor)) { hart.push("Ursache genannt: „" + m[0] + "“"); break; }
    }
    if (ST_URSACHE.test(t)) { const m = t.match(ST_URSACHE); hart.push("Ursache im Titel: „" + m[0] + "“"); }
    const bausteine = (text, ziel) => {
      if (!ziel.test(text)) hart.push("Baustein fehlt");
    };
    if (generiert) {
      bausteine(s, ST_ZEIT);
      bausteine(s, ST_FOLGE);
      bausteine(s, ST_VERSUCH);
      if (briefing && !kurz(briefing).includes(s)) hart.push("Briefing enthält das Symptom nicht");
      if (briefing && ST_URSACHE.test(briefing)) { const m = briefing.match(ST_URSACHE); hart.push("Ursache im Briefing: „" + m[0] + "“"); }
    } else {
      if (!ST_ZEIT.test(s)) weich.push("kein Anlass/Zeitmarke (Hinweis)");
      if (!ST_FOLGE.test(s)) weich.push("keine Folge für den Betrieb (Hinweis)");
      if (!ST_VERSUCH.test(s)) weich.push("kein ‚schon versucht‘ (Hinweis)");
    }
    return {id, titel: t, hart, weich};
  }

  /* Texte je Form und Nummer (1..100) – genau der Weg, den die Form im Spiel nimmt.
     Prüfung: 3 Aufgaben; fehlt der Injektor (S6-Vorbereitung), mischt Spiel.pruefung.bauen ein Handticket bei. */
  function tagPlus(i){ return new Date(Date.UTC(2026, 9, 1) + (i - 1) * 86400000).toISOString().slice(0, 10); }
  function eintrag(id, def, generiert, ersatz){
    return {id, titel: def.titel, symptom: def.symptom, briefing: def.briefing, generiert: !!generiert, ersatz: ersatz || null};
  }
  /* Generierbare Fertigkeiten einmal messen: Für Inhalte ohne Injektor (S6-Vorbereitung) gibt es im
     Postfach-Nachschub KEINEN generierten Auftrag – die Form wird nur dort gemessen, wo der Generator liefert. */
  let GENERIERBAR = null;
  function generierbareSkills(){
    if (GENERIERBAR) return GENERIERBAR;
    const ok = [], ohne = [];
    for (const s of DATEN.skills || []) {
      try { Spiel.generiere(s.id, 1, {stufe: s.ap === "AP2" ? "AP1" : "E"}); ok.push(s); }
      catch (e) { ohne.push(s.id); }
    }
    return (GENERIERBAR = {ok, ohne});
  }
  function texteFuer(form, i){
    if (form === "Pruefung") {
      /* Den ECHTEN Bogen der Prüfung messen: Spiel.pruefung.bogen plant nur baubare Aufgaben und
         füllt notfalls mit Handtickets auf (§ 17.1) – genau diese Texte sieht der Prüfling. */
      const art = i % 2 ? "AP1" : "AP2";
      const z = Zufall("mess:pruefung:" + i);
      const bogen = Spiel.pruefung && Spiel.pruefung.bogen ? Spiel.pruefung.bogen(art, z)
        : (Spiel.pruefung && Spiel.pruefung.plan ? Spiel.pruefung.plan(art, z).map(s => ({art: "gen", skill: s})) : []);
      const liste = [];
      for (const d of bogen) {
        if (d.art === "gen") {
          const def = Spiel.generiere(d.skill, i, {stufe: art});
          if (!def) throw new Error("kein generierter Auftrag für " + d.skill);
          liste.push(eintrag(def.id, def, true));
        } else {
          const t = (DATEN.tickets || []).find(x => x.id === d.ticketId);
          if (!t) throw new Error("Handticket fehlt: " + d.ticketId);
          liste.push(eintrag("Ticket " + t.id, t, false, d.skill || null));
        }
      }
      if (liste.length !== Spiel.PRUEFUNG.AUFGABEN) throw new Error("Bogen hat " + liste.length + " statt 3 Aufgaben");
      return liste;
    }
    if (form === "Tagesraetsel") {
      const tag = tagPlus(i), niveau = ["E", "AP1", "AP2"][(i - 1) % 3];
      const w = Spiel.raetsel.wahl(tag, niveau);
      if (!w || !w.def) throw new Error("kein Rätsel für " + tag);
      return [eintrag("raetsel:" + tag, w.def, true)];
    }
    const {ok} = generierbareSkills();
    for (let v = 0; v < ok.length; v++) {
      const skill = ok[(i - 1 + v) % ok.length], stufe = skill.ap === "AP2" ? "AP1" : "E";
      try { const def = Spiel.generiere(skill.id, i, {stufe}); if (def) return [eintrag(def.id, def, true)]; } catch (e) { /* nächste Fertigkeit */ }
    }
    throw new Error("kein Nachschub-Ticket");
  }

  console.log("\n===== STIL-GATE (--pruefen, Architektur § 17.2) =====");
  const OHNE_INJEKTOR = generierbareSkills().ohne;
  if (OHNE_INJEKTOR.length) console.log("Ohne Injektor (Postfach-Nachschub misst sie nicht, Prüfung mischt Handtickets bei): " + OHNE_INJEKTOR.join(", "));
  let fehler = 0;
  for (const form of ["Pruefung", "Tagesraetsel", "Postfach"]) {
    Spiel.generierte = {};                                   /* je Form frisch bauen: 100 Seeds */
    let imStil = 0, ersatz = 0; const verstoesse = [];
    for (let i = 1; i <= 100; i++) {
      let liste;
      try { liste = texteFuer(form, i); } catch (e) { verstoesse.push(form + "/" + i + ": " + String(e && e.message || e)); continue; }
      let ok = true;
      for (const x of liste) {
        if (!x.generiert) ersatz++;
        const r = stilPruefen(x.id, x.titel, x.symptom, x.briefing, x.generiert);
        if (r.hart.length) { ok = false; verstoesse.push(x.id + (x.ersatz ? " (Handticket für " + x.ersatz + ")" : "") + ": " + r.hart.join(" · ")); }
      }
      if (ok) imStil++;
    }
    console.log("Form " + form.padEnd(12) + ": " + imStil + "/100 Seeds im Stilfaden" + (ersatz ? " · " + ersatz + " Handticket-Aufgaben (S6-Vorbereitung)" : "") + (verstoesse.length ? " · " + verstoesse.length + " Verstoß(e)" : ""));
    for (const v of verstoesse.slice(0, 8)) console.log("  ✗ " + v);
    fehler += verstoesse.length;
  }

  /* Handtickets: unverändert im Stil (harte Regeln); fehlende Bausteine sind Hinweise, kein Verstoß. */
  let hImStil = 0, hHinweise = 0; const hVer = [];
  /* --gegentest hängt EINEN absichtlich schlechten Text an die gemessene Liste: Der Lauf MUSS rot werden.
     Das ist die Gegenprobe zum Gate (tests/texte-stil.test.js misst den Exit-Code). */
  const hListe = (DATEN.tickets || []).slice();
  if (process.argv.includes("--gegentest")) hListe.push({id: "GEGENTEST", titel: "VLAN", symptom: "Der Router hat ein Problem.", briefing: ""});
  for (const t of hListe) {
    const r = stilPruefen("Ticket " + t.id, t.titel, t.symptom, t.briefing, false);
    if (r.hart.length) hVer.push(t.id + ": " + r.hart.join(" · ")); else hImStil++;
    if (r.weich.length) hHinweise++;
  }
  console.log("Handtickets  : " + hImStil + "/" + (DATEN.tickets || []).length + " im Stilfaden" + (hVer.length ? " · " + hVer.length + " Verstoß(e)" : "") + " · " + hHinweise + " Hinweise (nicht hart)");
  for (const v of hVer.slice(0, 8)) console.log("  ✗ " + v);
  fehler += hVer.length;

  /* Determinismus: derselbe Seed ergibt denselben Text (kein Math.random, kein Datum im Text). */
  const text = liste => JSON.stringify(liste.map(x => [x.id, x.titel, x.symptom, x.briefing]));
  let detProben = 0, detVer = 0;
  for (const form of ["Pruefung", "Tagesraetsel", "Postfach"]) for (let i = 1; i <= 3; i++) {
    try {
      Spiel.generierte = {};
      const a = text(texteFuer(form, i));
      Spiel.generierte = {};
      const b = text(texteFuer(form, i));
      detProben++;
      if (a !== b) { detVer++; console.log("  ✗ nicht deterministisch: " + form + "/" + i); }
    } catch (e) { detVer++; console.log("  ✗ Determinismus-Probe " + form + "/" + i + ": " + String(e && e.message || e)); }
  }
  console.log("Determinismus: " + (detProben - detVer) + "/" + detProben + " Proben identisch");
  fehler += detVer;

  /* Gegenprobe: dieser Text verletzt fast jede Regel – das Tor MUSS ihn rot sehen. */
  const gegen = stilPruefen("GEGENTEST", "VLAN", "Der Router hat ein Problem.", "", true);
  if (!gegen.hart.length) { console.log("✗ Gegenprobe: künstlicher Stilverstoß wurde NICHT erkannt – das Tor ist blind."); fehler++; }
  else console.log("Gegenprobe   : künstlicher Stilverstoß rot erkannt (" + gegen.hart.length + " harte Verstöße)");
  console.log("Ergebnis: " + (fehler ? "ROT – " + fehler + " Verstoß(e)" : "GRUEN – 300/300 Seed-Texte und " + hImStil + "/" + (DATEN.tickets || []).length + " Handtickets im Stilfaden"));
  process.exitCode = fehler ? 1 : 0;
}

if (process.argv.includes("--alle")) {
  console.log("\n===== ALLE TEXTE IM WORTLAUT =====");
  for (const z of zeilen) {
    console.log(`\n--- ${z.id} · ${z.titel} (${z.gesamt} Zeichen)`);
    for (const [f, t] of z.felder) console.log(`  [${f}] ${t}`);
  }
}

if (process.argv.includes("--doppelt")) {
  /* Steht im Kundenbrief (`briefing`) dasselbe wie im Bericht (`symptom`)? Beide erscheinen im
     Auftragsdetail untereinander (Befund von wiki-2, 09.10.2026). Gemessen wird die Überschneidung
     der Wörter (ohne Stoppwörter) – ein Wert über 0,5 heißt: die Texte erzählen dasselbe. */
  const STOPP = new Set(("der die das den dem des ein eine einen einem eines und oder aber wir ich sie er es uns unser unsere mein meine ihr ihre ist sind war waren hat haben habe hatte hatten sein zu zum zur mit von für auf an in im am beim nach bei dass nicht kein keine auch noch schon nur mal so wie was wer wo sich uns euch mich dich the a of to and").split(" "));
  const worte = t => new Set(woerter(kurz(t).toLowerCase()).map(w => w.replace(/[^a-zäöüß0-9]/g, "")).filter(w => w.length > 3 && !STOPP.has(w)));
  const werte = [];
  for (const z of alle) {
    const br = z.def.briefing || z.def.mail || "";
    const sy = z.def.symptom || "";
    if (!br || !sy) continue;
    const a = worte(sy), b = worte(br);
    let gemeinsam = 0; for (const w of a) if (b.has(w)) gemeinsam++;
    const quote = a.size ? gemeinsam / a.size : 0;
    werte.push({ id: z.id, zeichenBrief: kurz(br).length, zeichenSymptom: kurz(sy).length, gemeinsam, quote: Math.round(quote * 100) / 100 });
  }
  werte.sort((x, y) => y.quote - x.quote);
  console.log(`\n===== ÜBERSCHNEIDUNG Kundenbrief ↔ Bericht (${werte.length} Aufträge mit beidem) =====`);
  console.log(`Median der Überschneidung: ${werte.length ? werte[Math.floor(werte.length / 2)].quote : "—"}`);
  console.log(`Über 0,50 (erzählen dasselbe): ${werte.filter(w => w.quote > 0.5).length}`);
  for (const w of werte.slice(0, 10)) console.log(`  ${w.id.padEnd(18)} Brief ${String(w.zeichenBrief).padStart(4)} Z · Bericht ${String(w.zeichenSymptom).padStart(4)} Z · gemeinsam ${String(w.gemeinsam).padStart(3)} Wörter = ${(w.quote * 100).toFixed(0)}%`);
}

if (process.argv.includes("--minis")) {
  const minis = DATEN.mini || [];
  console.log(`\n===== MINI-TICKETS: ${minis.length} =====`);
  if (minis[0]) console.log(`Felder eines Minis: ${Object.keys(minis[0]).join(" · ")}`);
  const frage = m => kurz(m.frage || m.f || "");
  const opts = m => { const o = m.optionen || m.antworten || m.a || []; return Array.isArray(o) ? o : Object.values(o); };
  const fl = minis.map(m => frage(m).length);
  console.log(`Fragelänge: ${JSON.stringify(zahlen(fl))}`);
  const ohnePunkt = minis.filter(m => !/[?!.]$/.test(frage(m))).length;
  console.log(`Fragen ohne Satzzeichen am Ende: ${ohnePunkt}`);
  const duplikate = new Map();
  for (const m of minis) { const k = frage(m).toLowerCase(); duplikate.set(k, (duplikate.get(k) || 0) + 1); }
  console.log(`Fragen, die wörtlich doppelt vorkommen: ${[...duplikate.values()].filter(n => n > 1).length}`);
  console.log(`Fragen unter 40 Zeichen: ${minis.filter(m => frage(m).length < 40).length}`);
  for (const m of minis.slice(0, 8)) {
    console.log(`  [${m.id}] ${frage(m)}`);
    console.log(`        Optionen: ${opts(m).map(o => kurz(typeof o === "string" ? o : o.text || JSON.stringify(o))).join(" · ")}`);
  }
}
