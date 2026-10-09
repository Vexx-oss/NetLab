"use strict";
/* ---------- Spiel: Namensraum und Spielstand (Kopfdatei der Schicht spiel/) ----------
   Vertrag: Architektur.md § 7.2. Kein DOM. Zeit nur über jetzt() (in Tests steuerbar).

   Spiel.st        Spielstand (store "labor", v:3) – wird beim ersten Zugriff geladen
   Spiel.einst     Einstellungen (store "einst"); niveau = WIRKSAMES Niveau des offenen Tickets,
                   stufe = Bildungsstand (azubi | azubi-plus | geselle | meister, siehe spiel/stufensystem.js),
                   wahl = "auto"|"E"|"AP1"|"AP2", unterricht, vorhersage, animationen, coach
   Spiel.laden()   Stand laden/migrieren, Fertigkeiten im Lernmotor registrieren, Bus-Hörer, Postfach füllen
   Spiel.speichern(), Spiel.neu(), Spiel.gutschreiben(euro, ruf, grund), Spiel.einstSetzen(k, v)

   Andere Bausteine können den Stand beim Laden ergänzen: Spiel.ergaenzer.<name> = st => { … }
   (wird nach der Migration aufgerufen; so bleibt die Migration an einer Stelle). */
const Spiel = {};

Spiel.VERSION = 3;                 /* v:3 (Hilfestellung): train – Migration ergänzt Standardwerte */
Spiel.EINSTIEG_TICKET = "salon-01";   /* erstes Ticket des Onboardings (Kabel fehlt) */
Spiel.KLASSENRAUM = "klassenraum";   /* eigener Speicher-Schluessel der Klassenraum-Sitzung (Stufe A, Fassung 1; src/spiel/klassenraum.js) */
Spiel.ergaenzer = {};
Spiel._st = null;
Spiel._einst = null;
Spiel._trocken = false;          /* Testlauf: keine Bus-Ereignisse, kein Speichern, kein Lernmotor */
Spiel._hoererAn = false;

/* stufe = BILDUNGSSTAND (Voreinstellung des Menschen: azubi | azubi-plus | geselle | meister).
   Nicht zu verwechseln mit niveau (Erklärtiefe: E | AP1 | AP2) und wahl (Prüfungsstrenge je Ticket).
   Die drei Achsen sind getrennt; verbindlich: docs/entwicklung/Hilfestellung – Stufen und Schnittstellen.md § 1.
   Spiel.stufe (src/spiel/stufensystem.js) liest und schreibt diesen Wert — hier steht nur der Standard,
   damit ein alter Stand ohne das Feld nicht bei jedem Zugriff neu geraten wird. */
Spiel.EINST_STANDARD = {wahl: "auto", niveau: "E", stufe: "azubi", unterricht: null, vorhersage: true, animationen: true, coach: true, ton: "leise", ereignisse: "selten", anpassung: "auto"};

Spiel.leererStand = function(){
  return {
    v: Spiel.VERSION, euro: 0, ruf: 0, stufe: 1,
    kunden: {}, postfach: [], aktiv: null, erledigt: [],
    playbooks: {slots: 1, aktiv: []}, tag: {},
    zuletzt: jetzt(), naechsteIid: 1,
    buch: [],                                  /* letzte Gutschriften {t, euro, ruf, grund} */
    einstieg: {fertig: false, coach: {}},      /* Onboarding und einmalige Coach-Hinweise */
    angebot: [],                               /* Ticket-IDs, die schon einmal angeboten wurden */
    dex: {},                                   /* Fehlerdex: {[injektor]: {gesehen, verstanden}} */
    tagesraetsel: {serie: 0},                  /* {serie, [tag]: {nr, niveau, sterne, sek, hilfe, versuche, ziele, zeile}} */
    tagebuch: [],                              /* Spieltagebuch, höchstens 500 Einträge */
    training: {je: {}},                        /* Trainingsbereich: {je: {[szenarioId]: {versucht, bestanden, bestes}}} */
  };
};

/* Beliebigen (alten, halben, kaputten) Stand in die aktuelle Form bringen. Unbekannte Felder bleiben erhalten. */
Spiel.migrieren = function(roh){
  const leer = Spiel.leererStand();
  if (!roh || typeof roh !== "object" || Array.isArray(roh)) return leer;
  const st = Object.assign(leer, tief(roh));
  const zahl = (x, d) => typeof x === "number" && isFinite(x) ? x : d;
  st.v = Math.max(zahl(st.v, 0), Spiel.VERSION);
  st.euro = zahl(st.euro, 0); st.ruf = zahl(st.ruf, 0); st.stufe = Math.max(1, zahl(st.stufe, 1));
  st.naechsteIid = Math.max(1, zahl(st.naechsteIid, 1));
  if (!st.kunden || typeof st.kunden !== "object" || Array.isArray(st.kunden)) st.kunden = {};
  for (const [id, k] of Object.entries(st.kunden)) {
    if (!k || typeof k !== "object") { delete st.kunden[id]; continue; }
    if (!Array.isArray(k.sterne)) k.sterne = [];
    k.ampel ||= "gruen";
  }
  for (const f of ["postfach", "erledigt", "buch", "angebot", "tagebuch"]) if (!Array.isArray(st[f])) st[f] = [];
  for (const f of ["dex", "tagesraetsel"]) if (!st[f] || typeof st[f] !== "object" || Array.isArray(st[f])) st[f] = f === "tagesraetsel" ? {serie: 0} : {};
  if (st.tagebuch.length > 500) st.tagebuch = st.tagebuch.slice(-500);
  if (!st.playbooks || typeof st.playbooks !== "object") st.playbooks = {slots: 1, aktiv: []};
  if (!Array.isArray(st.playbooks.aktiv)) st.playbooks.aktiv = [];
  if (!st.tag || typeof st.tag !== "object") st.tag = {};
  if (!st.einstieg || typeof st.einstieg !== "object") st.einstieg = {fertig: false, coach: {}};
  st.einstieg.coach ||= {};
  /* Trainingsbereich (v:3): je Szenario ein kleiner Stand. Alte Stände (v:2 und früher) bekommen ihn leer. */
  if (!st.training || typeof st.training !== "object" || Array.isArray(st.training)) st.training = {je: {}};
  if (!st.training.je || typeof st.training.je !== "object" || Array.isArray(st.training.je)) st.training.je = {};
  for (const [id, e] of Object.entries(st.training.je)) {
    if (!e || typeof e !== "object") { delete st.training.je[id]; continue; }
    e.versucht = Math.max(0, zahl(e.versucht, 0));
    e.bestanden = Math.max(0, zahl(e.bestanden, 0));
    e.bestes = zahl(e.bestes, 0);
  }
  /* Instanzen: Pflichtfelder ergänzen, Unbrauchbares verwerfen */
  st.postfach = st.postfach.filter(i => i && typeof i === "object" && i.ticketId && i.netz && i.netz.geraete).map((i, n) => {
    i.iid ||= "i" + (st.naechsteIid++);
    i.hilfeStufe = zahl(i.hilfeStufe, 0);
    if (!Array.isArray(i.hilfen)) i.hilfen = [];
    i.quelle ||= "postfach";
    i.start = zahl(i.start, jetzt());
    i.zeitMs = zahl(i.zeitMs, 0);
    i.frist = typeof i.frist === "number" ? i.frist : null;
    if (!i.leiter || typeof i.leiter !== "object") i.leiter = {};
    return i;
  });
  const iids = new Set(); st.postfach = st.postfach.filter(i => !iids.has(i.iid) && iids.add(i.iid));
  if (st.aktiv && !iids.has(st.aktiv)) st.aktiv = null;
  st.erledigt = st.erledigt.filter(e => e && e.id);
  if (st.buch.length > 50) st.buch = st.buch.slice(-50);
  return st;
};

Object.defineProperty(Spiel, "st", {
  enumerable: true,
  get(){ return Spiel._st || Spiel.laden(); },
  set(v){ Spiel._st = v; },
});
Object.defineProperty(Spiel, "einst", {
  enumerable: true,
  get(){ if (!Spiel._einst) Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD, store.get("einst", {}) || {}); return Spiel._einst; },
  set(v){ Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD, v || {}); },
});

/* Fertigkeiten des Labors im Lernmotor anmelden (idempotent) */
Spiel.skillsRegistrieren = function(){
  if (typeof L === "undefined" || !DATEN.skills) return;
  for (const s of DATEN.skills) if (!L.SKILLS[s.id]) L.skill(s.id, s.name, "Netzwerk", s.ap, "labor");
};
Spiel.skill = id => (DATEN.skills || []).find(s => s.id === id) || {id, name: id, ap: "AP1", stufe: 1};

/* Rollierende Zweitsicherung: der bisherige Stand wird unter einem zweiten Schlüssel weggelegt
   (< "labor-sicherung"). Ohne `erzwingen` nur vor einer echten Migration (v < Spiel.VERSION) —
   sonst wüchse der Spielstand bei jedem Start um eine Kopie. Eine Generation, gemessen 26.554 B.
   `erzwingen = true` legt immer ab (vor einem Import, dort gibt es keine Versionsgrenze). */
Spiel.SICHERUNG = "labor-sicherung";
Spiel.SICHERUNG_FRISCH_MS = 60 * 1000;         /* so lange bleibt eine frische Sicherung stehen */
Spiel.sicherungAnlegen = function(roh, erzwingen = false){
  if (!roh || typeof roh !== "object" || Array.isArray(roh)) return false;
  const v = typeof roh.v === "number" && isFinite(roh.v) ? roh.v : 0;
  if (!erzwingen && v >= Spiel.VERSION) return false;
  /* Eine gerade angelegte Sicherung (vor einem Import) wird nicht sofort überschrieben: sonst
     ersetzte die Migration direkt nach dem Neuladen genau die Sicherung, die den Vorzustand hält. */
  const alt = store.get(Spiel.SICHERUNG, null);
  if (alt && typeof alt.zeit === "number" && jetzt() - alt.zeit < Spiel.SICHERUNG_FRISCH_MS) return false;
  store.set(Spiel.SICHERUNG, {v, zeit: jetzt(), stand: roh});
  return true;
};
Spiel.sicherung = function(){
  const s = store.get(Spiel.SICHERUNG, null);
  return s && s.stand ? s : null;
};
/* Einen eingelesenen Spielstand prüfen, BEVOR er den laufenden ersetzt.
   Abgewiesen werden FREMDES (falsches Format) und ZU NEUES (Standversion über der des Programms).
   Ein ALTER Stand ist ausdrücklich erlaubt — auch ohne v-Feld (Stände vor v:2): die Migration holt
   ihn herein. Geprüft wird die Schemaversion (labor.v), nicht die Programmversion der Datei:
   Programmkennungen wie „dev" oder Datumsbauten sind als Vergleich zu unzuverlässig. */
Spiel.importPruefen = function(d){
  if (!d || typeof d !== "object" || d.format !== "netzwerk-labor" || !d.speicher || typeof d.speicher !== "object")
    return {ok: false, grund: "Das ist kein Netzwerk-Labor-Spielstand."};
  const lab = d.speicher.labor;
  const v = lab && typeof lab.v === "number" && isFinite(lab.v) ? lab.v : 0;
  if (v > Spiel.VERSION)
    return {ok: false, zuNeu: true, v, grund: `Dieser Spielstand stammt aus einer neueren Fassung (Stand v${v}); dieses Programm kennt nur v${Spiel.VERSION}.`};
  return {ok: true, v};
};

Spiel.laden = function({neu = false} = {}){
  Spiel.skillsRegistrieren();
  const roh = neu ? null : store.get("labor", null);
  Spiel.sicherungAnlegen(roh);                 /* vor der Migration: den alten Stand weglegen */
  Spiel._st = neu ? Spiel.leererStand() : Spiel.migrieren(roh);
  Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD, store.get("einst", {}) || {});
  for (const [name, fn] of Object.entries(Spiel.ergaenzer)) {
    try { fn(Spiel._st); } catch (e) { typeof console !== "undefined" && console.error("Spiel.ergaenzer." + name, e); }
  }
  Spiel._lz = {};
  if (typeof Spiel.hoererAnmelden === "function") Spiel.hoererAnmelden();
  if (typeof Spiel.instanzenPruefen === "function") Spiel.instanzenPruefen();
  if (typeof Spiel.postfachAuffuellen === "function") Spiel.postfachAuffuellen({still: true});
  Spiel.speichern();
  Spiel.melden("spiel-geladen", {st: Spiel._st});
  return Spiel._st;
};

Spiel.speichern = function(){
  if (Spiel._trocken || !Spiel._st) return;
  Spiel._st.zuletzt = jetzt();
  store.set("labor", Spiel._st);
};

/* Spielstand komplett zurücksetzen (Lernstand bleibt, der gehört dem Lernmotor) */
Spiel.neu = function(){
  Spiel._lz = {};
  store.set("labor", Spiel.leererStand());
  return Spiel.laden();
};

Spiel.gutschreiben = function(euro, ruf, grund){
  const st = Spiel.st;
  euro = Math.round((+euro || 0) * 100) / 100; ruf = +ruf || 0;
  st.euro = Math.round((st.euro + euro) * 100) / 100;
  st.ruf = Math.max(0, st.ruf + ruf);
  st.buch.push({t: jetzt(), euro, ruf, grund: grund || ""});
  if (st.buch.length > 50) st.buch.splice(0, st.buch.length - 50);
  Spiel.geaendert("gutschrift");
  return {euro: st.euro, ruf: st.ruf};
};

Spiel.einstSetzen = function(k, v){
  const e = Spiel.einst;
  if (e[k] === v) return;
  e[k] = v;
  /* in einen frischen Stand schreiben: „einst“ teilen sich Spiel und Oberfläche (Thema, Labor, Leiste …);
     der Zwischenspeicher Spiel._einst wäre dafür zu alt */
  if (!Spiel._trocken) { const frisch = store.get("einst", {}) || {}; frisch[k] = v; store.set("einst", frisch); }
  Spiel.melden("einst-geaendert", {k, v});
  if (k === "wahl" && Spiel._st && Spiel._st.aktiv && typeof Spiel.niveauAktualisieren === "function") Spiel.niveauAktualisieren();
};

/* Bus-Ereignis senden (im Testlauf stumm) */
Spiel.melden = function(name, daten){ if (!Spiel._trocken) Bus.senden(name, daten); };

/* Zustand geändert: speichern und Bescheid geben (Kopfzeile, Leiste, Tray) */
Spiel.geaendert = function(grund){
  Spiel.speichern();
  Spiel.melden("zustand-geaendert", {grund: grund || ""});
};

/* Offene Tickets, die im Postfach sichtbar sind (Zähler für Kopfzeile, Leiste, Tray) */
Spiel.offen = function(){ return typeof Spiel.postfach === "function" ? Spiel.postfach().length : Spiel.st.postfach.length; };
