"use strict";
/* ---------- Kundenakte: Netz-Atlas, Vertrauen, Kapitel, Baustellen (Design – Spielspaß 2.0, Hebel 10; Architektur § 9.7) ----------
   Kunden werden Personen mit Verlauf:
     Atlas      das dokumentierte Netz des Kunden (Plan-Erzeuger aus Phase B); ein Gerät leuchtet, sobald man dort gearbeitet hat
                (geändert, geprüft, per Fernwartung betreut, im Plan-Audit korrigiert). Alle Geräte hell = „komplett betreut“.
     Vertrauen  1–5 aus Punkten: ★ ≥ 4,5 +1 · „sauber“ +1 · Notfall rechtzeitig +1 – ein Provisorium bringt nichts.
                Es sinkt nie (R6: keine Strafe), es wächst nur langsamer.
     Kapitel    drei kurze Geschichten je Kunde (DATEN.geschichten), frei ab Vertrauen 2, 3, 4; je eine Frage (+1 Ruf beim
                ersten richtigen Versuch).
     Baustellen offene Provisorien (Spiel.varianten.schulden), bis ihr Folgeauftrag erledigt ist.
   Vertrauen zahlt aus (Design § 20, F5 – R4 „jede Belohnung öffnet etwas“):
     ab 3  Empfehlung: Der nächste noch verschlossene Kunde kommt eine Stufe früher (braucht nur den Ruf der Stufe davor)
           und schickt gleich einen ersten Auftrag; sind alle offen, bringt die Empfehlung einen Auftrag eines anderen Kunden.
           Jeder Kunde empfiehlt einmal; in der ersten Stunde wartet die Empfehlung, bis die Folge durch ist.
     ab 4  Wartungsvertrag bei diesem Kunden 20 % günstiger.
     st.empfehlungen = { [kunde]: {von, tag} } */
Spiel.VERTRAUEN_SCHWELLEN = [0, 2, 5, 9, 14];        /* Punkte für Vertrauen 1 … 5 */
Spiel.kundenakte = {};
Spiel.kundenakte.alle = (st = Spiel.st) => (st.kundenakte && typeof st.kundenakte === "object" && !Array.isArray(st.kundenakte) ? st.kundenakte : (st.kundenakte = {}));
Spiel.ergaenzer.kundenakte = st => { Spiel.kundenakte.alle(st); };
Spiel.kundenakte.daten = function(kunde, st = Spiel.st){
  const a = Spiel.kundenakte.alle(st);
  const d = (a[kunde] ||= {punkte: 0, atlas: [], gelesen: [], antworten: {}});
  for (const [k, w] of Object.entries({punkte: 0, atlas: [], gelesen: [], antworten: {}})) if (d[k] == null) d[k] = Array.isArray(w) ? [] : typeof w === "object" ? {} : w;
  return d;
};
Spiel.kundenakte.vertrauenAus = punkte => Spiel.VERTRAUEN_SCHWELLEN.reduce((v, s, i) => punkte >= s ? i + 1 : v, 1);
Spiel.kundenakte.vertrauen = kunde => Spiel.kundenakte.vertrauenAus(Spiel.kundenakte.daten(kunde).punkte);
Spiel.kundenakte.naechsteSchwelle = function(kunde){
  const p = Spiel.kundenakte.daten(kunde).punkte, s = Spiel.VERTRAUEN_SCHWELLEN.find(x => x > p);
  return s == null ? null : {punkte: p, bis: s};
};

/* ---- Vertrauen zahlt aus ---- */
Spiel.VERTRAUEN_LOHN = {empfehlung: 3, rabatt: 4, rabattAnteil: 0.2};
Spiel.kundenakte.empfehlungen = (st = Spiel.st) => (st.empfehlungen && typeof st.empfehlungen === "object" && !Array.isArray(st.empfehlungen) ? st.empfehlungen : (st.empfehlungen = {}));
Spiel.kundenakte.empfohlen = (id, st = Spiel.st) => !!Spiel.kundenakte.empfehlungen(st)[id];
/* ohne Nebenwirkung (legt keine Akte an) – der Vertragspreis fragt das für jeden Kunden */
Spiel.kundenakte.rabatt = kunde => { const a = Spiel.kundenakte.alle()[kunde]; return a && Spiel.kundenakte.vertrauenAus(a.punkte || 0) >= Spiel.VERTRAUEN_LOHN.rabatt ? Spiel.VERTRAUEN_LOHN.rabattAnteil : 0; };
/* Was das Vertrauen bei diesem Kunden schon geöffnet hat und was als Nächstes kommt (für die Akte) */
Spiel.kundenakte.belohnungen = function(kunde){
  const v = Spiel.kundenakte.vertrauen(kunde), d = Spiel.kundenakte.daten(kunde), L = Spiel.VERTRAUEN_LOHN;
  const an = Object.entries(Spiel.kundenakte.empfehlungen()).find(([, e]) => e.von === kunde);
  return [
    {ab: L.empfehlung, art: "empfehlung", da: v >= L.empfehlung && !!d.empfohlen, text: an ? `Empfehlung an ${Spiel.kundenDaten(an[0]).name}` : "Empfehlung an einen neuen Kunden"},
    {ab: L.rabatt, art: "rabatt", da: v >= L.rabatt, text: `Wartungsvertrag −${Math.round(L.rabattAnteil * 100)} %`},
  ];
};
/* Empfehlung aussprechen: nächster verschlossener Kunde (eine Stufe früher) oder Auftrag eines anderen Kunden → Karte */
Spiel.kundenakte.empfehlen = function(von){
  const st = Spiel.st, E = Spiel.kundenakte.empfehlungen(st), K = Spiel.karriere;
  const ids = K.kundenIds().filter(id => id !== von && !K.kunde(id).spaeter && Spiel.vorlagen._fuerKunde[id]);
  const neu = ids.find(id => !K.kundeOffen(id) && !E[id]) || null;
  const zahl = id => (st.erledigt || []).filter(e => e.kunde === id).length;
  const ziel = neu || ids.filter(id => K.kundeOffen(id)).sort((a, b) => zahl(a) - zahl(b))[0];
  if (!ziel) return null;
  if (neu) E[neu] = {von, tag: heute()};
  const z = Zufall(`empfehlung:${von}:${ziel}:${st.naechsteIid}`);
  const formen = Object.keys(Spiel.formGeneratoren || {}).filter(f => (Spiel.FORM_AB[f] || 1) <= Math.max(st.stufe, K.kunde(ziel).stufe - (neu ? 1 : 0)));
  let inst = null;
  for (const form of z.mischen(formen.length ? formen : ["forensik"])) {
    try { inst = Spiel.instanzErstellen({gen: {form, seed: 1 + z.zahl(1000000), opts: {kunde: ziel}}, quelle: "generiert", kunde: ziel}); break; } catch (e) { inst = null; }
  }
  if (inst) inst.empfehlung = von;
  const kv = Spiel.kundenDaten(von), kz = Spiel.kundenDaten(ziel);
  const wer = (kv.ansprechpartner || {}).name || kv.name, an = (kz.ansprechpartner || {}).name || kz.name;
  Spiel.speichern();
  return {id: "empfehlung", sym: "💬", titel: "Empfehlung", aktion: inst ? "neu" : null, iid: inst ? inst.iid : null, kunde: ziel, von, neu: !!neu,
    text: neu ? `${wer} hat dich an ${an} (${kz.name}) empfohlen. ${kz.name} kommt eine Stufe früher${inst ? " – der erste Auftrag liegt im Postfach" : ""}.`
      : `${wer} hat dich bei ${an} (${kz.name}) empfohlen${inst ? " – ein Auftrag liegt im Postfach" : ""}.`,
    warum: `Vertrauen ${Spiel.VERTRAUEN_LOHN.empfehlung} bei ${kv.name}: Zufriedene Kunden empfehlen weiter – im IT-Service die wichtigste Werbung.`};
};

/* Das dokumentierte Netz des Kunden: seine Vorlage mit dem Seed seines ersten Auftrags (gleich für alle Spieler) */
Spiel.kundenakte._netze = {};
Spiel.kundenakte.atlasNetz = function(kunde){
  if (Spiel.kundenakte._netze[kunde]) return Spiel.kundenakte._netze[kunde];
  const v = Spiel.vorlagen._fuerKunde[kunde];
  if (!v) return null;
  const erste = Spiel.ticketReihe().find(t => t.kunde === kunde);
  const seed = (erste && erste.spec && erste.spec.vSeed) || 1;
  return (Spiel.kundenakte._netze[kunde] = Spiel.vorlagen[v].bauen(Zufall(seed), {kunde}).netz);
};
Spiel.kundenakte.atlasGeraete = kunde => { const n = Spiel.kundenakte.atlasNetz(kunde); return n ? Object.values(n.geraete).filter(g => g.typ !== "internet").map(g => g.id).sort() : []; };
Spiel.kundenakte.atlas = function(kunde, {breite} = {}){
  const netz = Spiel.kundenakte.atlasNetz(kunde);
  if (!netz) return null;
  const gesamt = Spiel.kundenakte.atlasGeraete(kunde), hell = Spiel.kundenakte.daten(kunde).atlas.filter(id => gesamt.includes(id));
  return {plan: Spiel.plan.aus(netz, {art: "netzplan", breite}), hell, gesamt, komplett: gesamt.length > 0 && hell.length === gesamt.length};
};

/* Geräte, an denen in diesem Auftrag gearbeitet wurde – Laufzeit (Startnetz) muss noch da sein */
Spiel.kundenakte.arbeitsGeraete = function(inst, def){
  const ids = new Set(Spiel.geaenderteGeraete(inst));
  for (const z of (Spiel.varianten ? Spiel.varianten.ziele(inst, def) : def.ziele) || []) {
    for (const x of [z.von, z.nach, z.geraet, z.pruefen && z.pruefen.geraet]) if (x && inst.netz.geraete[x]) ids.add(x);
  }
  if (def.fernwartung) ids.add(def.fernwartung);
  for (const f of def.planFehler || []) ids.add(f.geraet);
  return [...ids];
};

/* Nach einem bestandenen Auftrag: Atlas, Vertrauen, freigewordenes Kapitel */
Spiel.kundenakte.nachAbschluss = function(inst, def, {sterne = 0, lohn = {}} = {}){
  const kunde = inst.kunde || def.kunde;
  if (!kunde || !Spiel.kundenakte.atlasNetz(kunde)) return null;
  const d = Spiel.kundenakte.daten(kunde), gesamt = Spiel.kundenakte.atlasGeraete(kunde);
  const neuHell = Spiel.kundenakte.arbeitsGeraete(inst, def).filter(id => gesamt.includes(id) && !d.atlas.includes(id));
  d.atlas.push(...neuHell);
  const vorher = Spiel.kundenakte.vertrauenAus(d.punkte), freiVorher = Spiel.kundenakte.kapitel(kunde).filter(k => k.frei).length;
  if (inst.variante !== "provisorium") {
    if (sterne >= 4.5) d.punkte += 1;
    if (inst.variante === "sauber") d.punkte += 1;
    if (lohn.notfall) d.punkte += 1;
  }
  const nachher = Spiel.kundenakte.vertrauenAus(d.punkte);
  const kapitel = Spiel.kundenakte.kapitel(kunde).filter(k => k.frei).slice(freiVorher)[0] || null;
  /* Vertrauen zahlt aus: ab 3 einmal eine Empfehlung (nicht mitten in der ersten Stunde), ab 4 der Rabatt (nur Meldung) */
  let empfehlung = null;
  if (nachher >= Spiel.VERTRAUEN_LOHN.empfehlung && !d.empfohlen && !(Spiel.ersteStunde && Spiel.ersteStunde.aktiv())) {
    d.empfohlen = true;
    empfehlung = Spiel.kundenakte.empfehlen(kunde);
  }
  const rabatt = vorher < Spiel.VERTRAUEN_LOHN.rabatt && nachher >= Spiel.VERTRAUEN_LOHN.rabatt;
  return {kunde, neuHell, hell: d.atlas.length, gesamt: gesamt.length, komplett: gesamt.length > 0 && gesamt.every(id => d.atlas.includes(id)),
    vertrauen: {vorher, nachher}, kapitel: kapitel && {nr: kapitel.nr, titel: kapitel.titel}, empfehlung, rabatt};
};

/* ---- Kapitel ---- */
Spiel.kundenakte.kapitel = function(kunde){
  const v = Spiel.kundenakte.vertrauen(kunde), d = Spiel.kundenakte.daten(kunde);
  return ((DATEN.geschichten || {})[kunde] || []).map(k => ({nr: k.nr, titel: k.titel, ab: k.ab, frei: v >= k.ab, gelesen: d.gelesen.includes(k.nr), beantwortet: d.antworten[k.nr] != null}));
};
Spiel.kundenakte.lesen = function(kunde, nr){
  const k = ((DATEN.geschichten || {})[kunde] || []).find(x => x.nr === nr);
  if (!k || Spiel.kundenakte.vertrauen(kunde) < k.ab) return null;
  const d = Spiel.kundenakte.daten(kunde);
  if (!d.gelesen.includes(nr)) { d.gelesen.push(nr); Spiel.speichern(); }
  return k;
};
Spiel.kundenakte.antworten = function(kunde, nr, i){
  const k = Spiel.kundenakte.lesen(kunde, nr);
  if (!k) return null;
  const d = Spiel.kundenakte.daten(kunde), erstes = d.antworten[nr] == null, richtig = i === k.frage.richtig;
  if (erstes) {
    d.antworten[nr] = i;
    if (richtig) Spiel.gutschreiben(0, 1, `Kapitel „${k.titel}“ verstanden`);
    else Spiel.speichern();
  }
  return {richtig, erklaerung: k.frage.erklaerung, erstes};
};
Spiel.kundenakte.baustellen = kunde => (Spiel.varianten ? Spiel.varianten.schulden() : []).filter(s => s.kunde === kunde && !s.erledigt)
  .map(s => Object.assign({}, s, {offen: Math.max(0, s.faellig - Spiel.st.erledigt.length), imPostfach: !!(s.folge && Spiel.instanz(s.folge))}));
