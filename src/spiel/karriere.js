"use strict";
/* ---------- Spiel: Karriere (Stufen, Kunden, Ruf-und-Können-Tor) ----------
   Konzept § 3.3 und § 3.5. Kein DOM, Zeit nur über jetzt().

   Aufstieg braucht BEIDES: Ruf-Schwelle der nächsten Stufe und Können auf der aktuellen Stufe
   (Mittel von L.box über die Fertigkeiten dieser Stufe ≥ 2 „geübt“). Kunden öffnen sich nur über Ruf.
   Ruf ist kein Zahlungsmittel.

   Eigene Daten liegen in Spiel.st.karriere (angelegt über Spiel.ergaenzer.karriere, s. u.):
   { v, letzterTick, naechstes:{[kunde]:ms}, zaehler, offen:[Wartung], guthaben, budget, bericht,
     fest, anmeldungen:{AP1,AP2}, pruefung, pruefungen:[], zertifikate:[], aussehen:{…}, mini:{…}, statistik:{…} }
   Außerdem nutzt die Karriere die Felder des Spielstands selbst: stufe, ruf, euro, kunden[k].vertrag/ampel,
   playbooks {slots, aktiv}, tag (Arbeitstag, siehe spiel/tag.js). */

Spiel.karriere = {};

/* Stufen (6 = Storage & Cloud, später). ruf = Ruf-Schwelle, ab der man diese Stufe erreichen kann. */
Spiel.KARRIERE_STUFEN = [
  {nr: 1, name: "Azubi",           ruf: 0,   geraete: ["PC", "Router", "Switch"]},
  {nr: 2, name: "Geselle",         ruf: 10,  geraete: ["Server", "verwaltbarer Switch"]},
  {nr: 3, name: "Fachkraft",       ruf: 28,  geraete: []},
  {nr: 4, name: "Spezialist",      ruf: 55,  geraete: ["Internet-Anschluss"]},
  {nr: 5, name: "Senior",          ruf: 90,  geraete: ["Firewall"]},
  {nr: 6, name: "Storage & Cloud", ruf: 140, geraete: ["NAS"], spaeter: true},
];
Spiel.KARRIERE_MAX = 5;          /* höchste erreichbare Stufe, solange Stufe 6 „später“ ist */
Spiel.KOENNEN_SOLL = 2;          /* Mittel L.box der Stufen-Fertigkeiten, 2 = „geübt“ */

/* Rückfall, falls DATEN.kunden (noch) keinen Eintrag hat. Echte Texte kommen aus daten/kunden.js. */
Spiel.KUNDEN_STANDARD = {
  salon:        {name: "Friseursalon",   stufe: 1, symbol: "✂", vertrag: {euroProStunde: 6}},
  schreibbuero: {name: "Schreibbüro",    stufe: 2, symbol: "✎", vertrag: {euroProStunde: 9}},
  praxis:       {name: "Arztpraxis",     stufe: 3, symbol: "✚", vertrag: {euroProStunde: 13}},
  autohaus:     {name: "Autohaus",       stufe: 4, symbol: "⛟", vertrag: {euroProStunde: 18}},
  mittelstand:  {name: "Mittelstand",    stufe: 5, symbol: "⌂", vertrag: {euroProStunde: 24}},
  storage:      {name: "Storage & Cloud", stufe: 6, symbol: "▤", vertrag: {euroProStunde: 30}, spaeter: true},
};

/* ---------- eigener Teil des Spielstands ---------- */
Spiel.karriere.leer = () => ({
  v: 1, letzterTick: null, naechstes: {}, zaehler: 1, offen: [], guthaben: 0, budget: 0,
  bericht: null, fest: null, anmeldungen: {AP1: false, AP2: false}, pruefung: null, pruefungen: [], zertifikate: [],
  aussehen: {akzent: "cyan", leiste: "standard", gekauft: ["cyan", "standard"]},
  mini: {aktuell: null, zuletzt: [], tag: null, anzahl: 0, bezahlt: 0, stats: {}},
  statistik: {passiv: 0, aktiv: 0, auto: 0, mini: 0},
});

Spiel.karriere.migrieren = function(st){
  const leer = Spiel.karriere.leer();
  const k = st.karriere && typeof st.karriere === "object" && !Array.isArray(st.karriere) ? st.karriere : {};
  for (const [f, w] of Object.entries(leer)) if (k[f] === undefined || k[f] === null && w !== null) k[f] = w;
  if (!Array.isArray(k.offen)) k.offen = [];
  k.offen = k.offen.filter(o => o && o.iid && o.kunde && typeof o.frist === "number");
  if (!k.naechstes || typeof k.naechstes !== "object") k.naechstes = {};
  for (const f of ["pruefungen", "zertifikate"]) if (!Array.isArray(k[f])) k[f] = [];
  k.anmeldungen = Object.assign({AP1: false, AP2: false}, k.anmeldungen || {});
  k.aussehen = Object.assign(leer.aussehen, k.aussehen || {});
  if (!Array.isArray(k.aussehen.gekauft)) k.aussehen.gekauft = ["cyan", "standard"];
  k.mini = Object.assign(leer.mini, k.mini || {});
  if (!Array.isArray(k.mini.zuletzt)) k.mini.zuletzt = [];
  k.statistik = Object.assign(leer.statistik, k.statistik || {});
  for (const f of ["guthaben", "budget", "zaehler"]) if (typeof k[f] !== "number" || !isFinite(k[f])) k[f] = leer[f];
  st.karriere = k;
  if (!st.playbooks || typeof st.playbooks !== "object") st.playbooks = {slots: 1, aktiv: []};
  if (typeof st.playbooks.slots !== "number") st.playbooks.slots = 1;
  if (!Array.isArray(st.playbooks.aktiv)) st.playbooks.aktiv = [];
  if (!st.tag || typeof st.tag !== "object") st.tag = {};
  st.stufe = klemme(Math.round(st.stufe || 1), 1, Spiel.KARRIERE_MAX);
  return k;
};

/* Beim Laden (FLUSS ruft alle Spiel.ergaenzer nach der Migration): Stand ergänzen, Hörer anmelden */
Spiel.ergaenzer.karriere = function(st){
  Spiel.karriere.migrieren(st);
  Spiel.karriere.hoererAnmelden();
};

/* Zugriff mit Absicherung (falls ein Stand ohne Ergänzer entstand) */
Spiel.karriere.daten = function(){
  const st = Spiel.st;
  if (!st.karriere || st.karriere.v !== 1 || !st.karriere.mini) Spiel.karriere.migrieren(st);
  return st.karriere;
};

/* ---------- Bus-Hörer (idempotent) ---------- */
Spiel.karriere._hoerer = null;
Spiel.karriere.hoererAnmelden = function(){
  if (Spiel.karriere._hoerer) return;
  Spiel.karriere._hoerer = {
    geloest: d => Spiel.karriere.ticketGeloest(d || {}),
  };
  Bus.an("ticket-geloest", Spiel.karriere._hoerer.geloest);
};

/* Ein Ticket ist gelöst (Bus von FLUSS): Wartung abhaken, Arbeitstag, Prüfung, Aufstieg */
Spiel.karriere.ticketGeloest = function(d){
  const inst = d.inst || {};
  const k = Spiel.karriere.daten();
  if (typeof d.euro === "number" && d.euro > 0 && inst.quelle !== "pruefung") k.statistik.aktiv += d.euro;
  if (inst.quelle === "wartung" && typeof Spiel.wartung !== "undefined") Spiel.wartung.erledigt(inst.iid, d);
  if (inst.quelle === "pruefung" && typeof Spiel.pruefung !== "undefined") Spiel.pruefung.geloestGemeldet(inst, d);
  if (typeof Spiel.tag !== "undefined" && Spiel.tag.geloest) Spiel.tag.geloest(inst, d);
  Spiel.karriere.pruefeAufstieg();
};

/* ---------- Lernmotor-Zugriff (robust, falls L fehlt) ---------- */
Spiel.karriere.box = id => typeof L !== "undefined" ? L.box(id) : 0;
Spiel.karriere.versucht = id => typeof L !== "undefined" && typeof L.versucht === "function" ? L.versucht(id) : Spiel.karriere.box(id) > 0;
Spiel.karriere.faellig = id => typeof L !== "undefined" ? L.istFaellig(id) : false;
Spiel.karriere.stufeName = id => typeof L !== "undefined" ? L.stufeName(id) : "neu";
Spiel.karriere.faelligeIds = () => typeof L !== "undefined" ? L.faelligeIds(id => id.startsWith("lab.")) : [];
Spiel.karriere.skills = () => DATEN.skills || [];
Spiel.karriere.skillName = id => (Spiel.karriere.skills().find(s => s.id === id) || {name: id}).name;

/* ---------- Kunden ---------- */
Spiel.karriere.kundenIds = function(){
  const ids = Object.keys(DATEN.kunden || {});
  for (const id of Object.keys(Spiel.KUNDEN_STANDARD)) if (!ids.includes(id)) ids.push(id);
  return ids.sort((a, b) => Spiel.karriere.kunde(a).stufe - Spiel.karriere.kunde(b).stufe);
};

/* Normalisierte Sicht auf einen Kunden (Daten + Rückfall + Spielstand) */
Spiel.karriere.kunde = function(id){
  const d = (DATEN.kunden && DATEN.kunden[id]) || {};
  const s = Spiel.KUNDEN_STANDARD[id] || {};
  const stufe = +(d.stufe ?? d.karriere ?? s.stufe ?? 1);
  const stufeDef = Spiel.KARRIERE_STUFEN.find(x => x.nr === stufe);
  const vertrag = Object.assign({}, s.vertrag || {}, d.vertrag || {});
  const eph = +(vertrag.euroProStunde ?? 0) || 0;
  const person = d.ansprechpartner ?? d.kontakt ?? d.person ?? null;
  return {
    id, stufe, daten: d,
    name: d.name || d.titel || s.name || id,
    kurz: d.kurz || d.kurzname || null,
    symbol: d.symbol || s.symbol || "✉",
    farbe: d.farbe || null,
    ansprechpartner: typeof person === "string" ? person : person && (person.name || person.anrede) || null,
    rolle: d.rolle || (person && typeof person === "object" ? person.rolle : null) || null,
    beschreibung: d.beschreibung || d.text || d.kurzbeschreibung || "",
    abRuf: +(d.abRuf ?? d.ruf ?? (stufeDef ? stufeDef.ruf : 0)),
    spaeter: !!(d.spaeter ?? s.spaeter ?? (stufeDef && stufeDef.spaeter)),
    euroProStunde: eph,
    vertragPreisVoll: +(vertrag.preis ?? Math.round(eph * Spiel.WIRTSCHAFT_VERTRAG_STUNDEN / 10) * 10),
    vertragRabatt: Spiel.kundenakte && Spiel._st ? Spiel.kundenakte.rabatt(id) : 0,              /* Vertrauen 4: −20 % (§ 20 F5) */
    get vertragPreis(){ return Math.round(this.vertragPreisVoll * (1 - this.vertragRabatt)); },
    skills: Array.isArray(d.skills) ? d.skills : null,
    saetze: d.saetze || {},
  };
};
Spiel.WIRTSCHAFT_VERTRAG_STUNDEN = 20;   /* Vertragsangebot kostet so viele Stunden Vertragseinnahmen (amortisiert sich) */

Spiel.karriere.kundeOffen = function(id){
  const k = Spiel.karriere.kunde(id);
  if (k.spaeter) return false;
  /* Empfehlung (Vertrauen 3 bei einem anderen Kunden): eine Stufe früher – es reicht der Ruf der Stufe davor */
  const frueher = Spiel.kundenakte && Spiel.kundenakte.empfohlen(id) ? ((Spiel.KARRIERE_STUFEN.find(x => x.nr === k.stufe - 1) || {}).ruf ?? 0) : null;
  return Spiel.st.ruf >= (frueher != null ? Math.min(frueher, k.abRuf) : k.abRuf);
};
Spiel.karriere.kundeStand = id => (typeof Spiel.kunde === "function" ? Spiel.kunde(id) : (Spiel.st.kunden[id] ||= {vertrag: false, ampel: "gruen", seit: heute(), sterne: []}));
Spiel.karriere.hatVertrag = id => !!(Spiel.st.kunden[id] && Spiel.st.kunden[id].vertrag);
Spiel.karriere.vertragskunden = () => Spiel.karriere.kundenIds().filter(id => Spiel.karriere.hatVertrag(id));

/* Sterne bei einem Kunden: bevorzugt die Liste im Spielstand (FLUSS), sonst aus st.erledigt hergeleitet */
Spiel.karriere.sterneBei = function(id){
  const eintrag = Spiel.st.kunden[id];
  if (eintrag && Array.isArray(eintrag.sterne) && eintrag.sterne.length) {
    return eintrag.sterne.map(s => typeof s === "number" ? s : +(s && (s.sterne ?? s.n)) || 0);
  }
  const liste = [];
  for (const e of Spiel.st.erledigt) {
    const def = typeof Spiel.ticketDef === "function" ? Spiel.ticketDef(e.id) : null;
    if ((e.kunde || (def && def.kunde)) === id) liste.push(+e.sterne || 0);
  }
  return liste;
};

/* ---------- Stufe und Aufstieg ---------- */
Spiel.karriere.stufeDef = nr => Spiel.KARRIERE_STUFEN.find(s => s.nr === nr) || Spiel.KARRIERE_STUFEN[0];

Spiel.karriere.koennen = function(nr){
  const soll = Spiel.KOENNEN_SOLL;
  const skills = Spiel.karriere.skills().filter(s => (s.stufe || 1) === nr).map(s => ({
    id: s.id, name: s.name, box: Spiel.karriere.box(s.id), stufeName: Spiel.karriere.stufeName(s.id), faellig: Spiel.karriere.faellig(s.id),
  }));
  const summe = skills.reduce((a, s) => a + s.box, 0);
  const sollSumme = soll * skills.length;
  const mittel = skills.length ? summe / skills.length : soll;
  const fehlend = skills.filter(s => s.box < soll).map(s => Object.assign({}, s, {fehlt: soll - s.box})).sort((a, b) => a.box - b.box);
  return {skills, summe, sollSumme, mittel, soll, ok: mittel >= soll, fehltPunkte: Math.max(0, sollSumme - summe), fehlend};
};

/* Alles, was die Oberfläche zum Stand der Karriere braucht – inklusive dessen, was genau noch fehlt */
Spiel.stufeInfo = function(){
  const st = Spiel.st, nr = st.stufe;
  const def = Spiel.karriere.stufeDef(nr);
  const naechsteDef = nr < Spiel.KARRIERE_MAX ? Spiel.karriere.stufeDef(nr + 1) : null;
  const koennen = Spiel.karriere.koennen(nr);
  const rufSoll = naechsteDef ? naechsteDef.ruf : null;
  const ruf = {ist: st.ruf, soll: rufSoll, ok: rufSoll == null || st.ruf >= rufSoll, fehlt: rufSoll == null ? 0 : Math.max(0, rufSoll - st.ruf)};
  const neueKunden = naechsteDef ? Spiel.karriere.kundenIds().filter(id => Spiel.karriere.kunde(id).stufe === naechsteDef.nr).map(Spiel.karriere.kunde) : [];
  const neueThemen = naechsteDef ? Spiel.karriere.skills().filter(s => (s.stufe || 1) === naechsteDef.nr) : [];
  const fehlt = [];
  if (naechsteDef && !ruf.ok) fehlt.push(`Noch ${ruf.fehlt} Ruf (${ruf.ist} von ${ruf.soll}). Ruf gibt es für gelöste Kundentickets.`);
  if (naechsteDef && !koennen.ok) {
    const teile = koennen.fehlend.slice(0, 4).map(s => `${s.name} (${s.stufeName} → geübt)`);
    fehlt.push(`Noch ${koennen.fehltPunkte} Können-Schritt${koennen.fehltPunkte === 1 ? "" : "e"} auf Stufe ${nr}: ${teile.join(", ")}${koennen.fehlend.length > 4 ? " …" : "."}`);
  }
  return {
    stufe: nr, name: def.name, geraete: def.geraete,
    naechste: naechsteDef ? {nr: naechsteDef.nr, name: naechsteDef.name, ruf: naechsteDef.ruf, geraete: naechsteDef.geraete} : null,
    ruf, koennen, bereit: !!naechsteDef && ruf.ok && koennen.ok, max: !naechsteDef,
    neueKunden, neueThemen, fehlt,
    hinweis: "Eine Fertigkeit steigt höchstens einmal je Fälligkeit: Üben an verschiedenen Tagen bringt dich weiter, nicht Wiederholen am selben Tag.",
  };
};

/* Aufstieg prüfen und – wenn Ruf UND Können reichen – feiern. Nie Druck: kein Zeitlimit, nichts geht verloren. */
Spiel.karriere.pruefeAufstieg = function(){
  if (Spiel._trocken) return null;
  const info = Spiel.stufeInfo();
  if (!info.bereit) return null;
  return Spiel.karriere.aufsteigen();
};

Spiel.karriere.aufsteigen = function(){
  const st = Spiel.st, k = Spiel.karriere.daten();
  const info = Spiel.stufeInfo();
  if (!info.naechste) return null;
  const vorher = st.stufe;
  st.stufe = info.naechste.nr;
  const kunden = info.neueKunden.filter(x => Spiel.karriere.kundeOffen(x.id)).map(x => x.id);
  for (const id of kunden) Spiel.karriere.kundeStand(id);
  k.fest = {
    stufe: st.stufe, name: info.naechste.name, vorher, t: jetzt(), gesehen: false,
    kunden, themen: info.neueThemen.map(s => s.id), geraete: info.naechste.geraete || [],
    satz: Spiel.karriere.seniorSatz("stufeAufstieg", {stufe: st.stufe, name: info.naechste.name}),
  };
  if (typeof Spiel.postfachAuffuellen === "function") { try { Spiel.postfachAuffuellen({still: true}); } catch (e) { /* Postfach ist Sache von FLUSS */ } }
  Spiel.speichern();
  Spiel.melden("aufstieg", k.fest);
  Spiel.melden("zustand-geaendert", {grund: "aufstieg"});
  return k.fest;
};
Spiel.karriere.festGesehen = function(){
  const k = Spiel.karriere.daten();
  if (k.fest) { k.fest.gesehen = true; Spiel.speichern(); }
};

/* Senior-Satz: DATEN.senior[schluessel] darf Text, Liste oder Funktion sein */
Spiel.karriere.SENIOR_RUECKFALL = {
  stufeAufstieg: ["Glückwunsch, das hast du dir erarbeitet: Ruf bei den Kunden und Können im Kopf. Auf die nächste Stufe!"],
  tagesabschluss: ["Feierabend. Was du heute geübt hast, sitzt morgen ein Stück fester."],
  pruefungBestanden: ["Bestanden. Das Zertifikat hängt jetzt im Lernstand."],
  pruefungNichtBestanden: ["Nicht bestanden, aber jetzt weißt du genau, wo du ansetzt. Die Schwachstellen stehen unten."],
};
Spiel.karriere.seniorSatz = function(schluessel, ctx = {}, seed){
  const quelle = (DATEN.senior && DATEN.senior[schluessel]) || Spiel.karriere.SENIOR_RUECKFALL[schluessel] || [""];
  let w = quelle;
  if (typeof w === "function") { try { w = w(ctx); } catch (e) { w = ""; } }
  if (Array.isArray(w)) w = w.length ? w[Zufall(seed ?? (schluessel + ":" + (ctx.stufe || "") + ":" + heute())).zahl(w.length)] : "";
  if (w && typeof w === "object") w = w.text || w[Spiel.einst.niveau] || "";
  return String(w || "").replace(/\{(\w+)\}/g, (m, f) => ctx[f] != null ? ctx[f] : m);
};

/* Kleines Training für eine Fertigkeit: erst ein Mini (schnell, nur Maus), sonst ein generiertes Ticket.
   → {art:"mini", mini} | {art:"ticket", inst} | {art:"keins", grund} */
Spiel.karriere.training = function(skill, {bevorzugt = "mini"} = {}){
  const mini = bevorzugt === "mini" && Spiel.mini && Spiel.mini.fuerSkill ? Spiel.mini.fuerSkill(skill) : null;
  if (mini) { Spiel.mini.setzen(mini.id); return {art: "mini", mini}; }
  if (typeof Spiel.instanzErstellen === "function" && typeof Spiel.generiere === "function") {
    try {
      const inst = Spiel.instanzErstellen({gen: {skill, seed: Spiel.karriere.seed("training:" + skill), opts: {stufe: Spiel.karriere.niveau(), art: "stoerung"}}, quelle: "wiederholung"});
      return {art: "ticket", inst};
    } catch (e) { /* weiter unten */ }
  }
  const fallback = bevorzugt !== "mini" && Spiel.mini && Spiel.mini.fuerSkill ? Spiel.mini.fuerSkill(skill) : null;
  if (fallback) { Spiel.mini.setzen(fallback.id); return {art: "mini", mini: fallback}; }
  return {art: "keins", grund: "Für diese Fertigkeit gibt es gerade kein passendes Training."};
};

/* Gewähltes Niveau für neue Tickets (auto → wirksames Niveau) */
Spiel.karriere.niveau = function(){
  const e = Spiel.einst || {};
  return e.wahl && e.wahl !== "auto" ? e.wahl : (e.niveau || "E");
};

/* Stabiler, fortlaufender Seed für Karriere-Zufall (deterministisch unter jetzt.setzen) */
Spiel.karriere.seed = function(zusatz){
  const k = Spiel.karriere.daten();
  const n = k.zaehler++;
  let h = 2166136261 ^ n;
  for (const c of String(zusatz || "") + ":" + n) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) || 1;
};

/* Euro und Ruf gutschreiben (FLUSS), mit Rückfall */
Spiel.karriere.gutschreiben = function(euro, ruf, grund){
  if (typeof Spiel.gutschreiben === "function") return Spiel.gutschreiben(euro, ruf, grund);
  const st = Spiel.st; st.euro += euro; st.ruf += ruf; return {euro: st.euro, ruf: st.ruf};
};
Spiel.karriere.bezahlen = function(euro, grund){
  if (Spiel.st.euro + 1e-9 < euro) return false;
  Spiel.karriere.gutschreiben(-euro, 0, grund);
  return true;
};
