"use strict";
/* ---------- Spiel: Wartungsverträge und Takt (Idle-Schicht, Konzept § 3.4) ----------
   Alles über Zeitstempel-Differenzen (jetzt()), kein Zählen von Ticks: Spiel.tick() rechnet immer die
   Spanne seit dem letzten Takt nach – ob 60 s (Programm offen) oder 3 Tage (Programm war zu; dann
   höchstens 8 h angerechnet).

   Pro Vertragskunde:
   - Einnahmen €/h (DATEN.kunden[k].vertrag.euroProStunde), NUR solange die Ampel grün ist.
   - Etwa alle 20–40 min ein Ereignis: ein Wartungs-Ticket (Spiel.generiere, Fertigkeit passend zu Kunde
     und Können, fällige bevorzugt, Unterrichtsmodus zuerst), Frist 60 min echte Zeit.
     Frist überschritten → gelb; nach weiteren 60 min → rot. Niemand kündigt.
   - Hat die Fertigkeit ein aktives Playbook (nicht veraltet), erledigt es das Ereignis für 60 % Ertrag.
   Balancing: passives Einkommen (Verträge + Playbooks) läuft über ein Budget, das mit PASSIV_ANTEIL ×
   „aktive €/h“ nachfüllt. So bleibt passiv ≤ etwa ein Drittel von aktiv, egal wie die Inhalte gewichtet sind. */

/* Justierbare Konstanten */
Spiel.WARTUNG = {
  INTERVALL_MIN: 20 * 60e3,      /* Abstand zweier Ereignisse je Kunde */
  INTERVALL_MAX: 40 * 60e3,
  FRIST: 60 * 60e3,              /* Frist eines Wartungs-Tickets */
  ROT_NACH: 60 * 60e3,           /* so lange nach Fristende gelb, danach rot */
  WARTESCHLANGE: 5,              /* höchstens so viele offene Wartungs-Tickets insgesamt */
  OFFLINE_MAX: 8 * 3600e3,       /* höchstens so viel Abwesenheit wird angerechnet */
  OFFLINE_BERICHT_AB: 10 * 60e3, /* ab dieser Lücke gibt es einen Offline-Bericht */
  PLAYBOOK_ANTEIL: 0.6,          /* Playbook-Ertrag in Anteilen des Ticket-Lohns */
  PASSIV_ANTEIL: 1 / 3,          /* passives €/h höchstens so viel mal aktives €/h */
  BUDGET_STUNDEN: 1,             /* Budget-Vorrat höchstens so viele Stunden */
  AKTIV_RUECKFALL: 300,          /* €/h aktiv, falls die Tickets keine Werte liefern */
  LOHN: {1: 20, 2: 24, 3: 30, 4: 36, 5: 42, 6: 48},   /* Lohn eines Wartungs-Tickets je Kundenstufe (falls Generator keinen nennt) */
  UNTERRICHT_ANTEIL: 0.6,        /* so oft zieht ein Ereignis das Unterrichtsthema, wenn es passt */
  FAELLIG_ANTEIL: 0.7,           /* so oft eine fällige Fertigkeit, wenn es welche gibt */
};

Spiel.wartung = {};

/* Aktives Einkommen je Stunde, geschätzt aus den Tickets bis zur aktuellen Stufe (Lohn / Minuten) */
Spiel.wartung.aktivProStunde = function(){
  const stufe = Spiel.st.stufe;
  let euro = 0, min = 0;
  for (const t of DATEN.tickets || []) {
    if (!t || t.entwurf || t.art === "mini" || (t.karriere || 1) > stufe || !t.lohn || !(t.lohn.euro > 0)) continue;
    const m = typeof Spiel.minuten === "function" ? Spiel.minuten(t) : (t.minuten || 5);
    if (!(m > 0)) continue;
    euro += t.lohn.euro; min += m;
  }
  return min >= 5 ? euro / min * 60 : Spiel.WARTUNG.AKTIV_RUECKFALL;
};
Spiel.wartung.budgetRate = () => Spiel.WARTUNG.PASSIV_ANTEIL * Spiel.wartung.aktivProStunde();   /* €/h */

/* Vertragsrate eines Kunden (€/h, ohne Ampel) */
Spiel.wartung.rate = id => Spiel.karriere.kunde(id).euroProStunde;

/* Ampel zu einem Zeitpunkt: grün, solange keine Frist überschritten ist */
Spiel.wartung.ampelBei = function(id, t = jetzt()){
  if (!Spiel.karriere.hatVertrag(id)) return null;
  const m = Spiel.wartung.fruehesteFrist(id);
  if (m == null || t < m) return "gruen";
  return t < m + Spiel.WARTUNG.ROT_NACH ? "gelb" : "rot";
};
Spiel.wartung.fruehesteFrist = function(id){
  let m = null;
  for (const o of Spiel.karriere.daten().offen) if (o.kunde === id && (m == null || o.frist < m)) m = o.frist;
  return m;
};
Spiel.wartung.offene = id => Spiel.karriere.daten().offen.filter(o => !id || o.kunde === id);

/* Grüne Millisekunden eines Kunden in [a, b] bei den aktuell offenen Tickets */
Spiel.wartung.gruenMs = function(id, a, b){
  const m = Spiel.wartung.fruehesteFrist(id);
  if (m == null) return Math.max(0, b - a);
  return Math.max(0, Math.min(b, Math.max(a, m)) - a);
};

/* Aktuelles passives €/h (Anzeige): Summe der grünen Vertragskunden, höchstens die Budget-Rate */
Spiel.euroProStunde = function(t = jetzt()){
  let s = 0;
  for (const id of Spiel.karriere.vertragskunden()) if (Spiel.wartung.ampelBei(id, t) === "gruen") s += Spiel.wartung.rate(id);
  return Math.round(Math.min(s, Spiel.wartung.budgetRate()) * 10) / 10;
};

/* Nächster Abstand (deterministisch aus dem Karriere-Zähler) */
Spiel.wartung.intervall = function(id){
  const W = Spiel.WARTUNG;
  return W.INTERVALL_MIN + Zufall(Spiel.karriere.seed("intervall:" + id)).zahl(W.INTERVALL_MAX - W.INTERVALL_MIN + 1);
};

/* Welche Fertigkeiten kann der Generator? (Spiel.vorlagen: Objekt je Fertigkeit oder Liste mit .skill) */
Spiel.wartung.generierbar = function(skill){
  const v = Spiel.vorlagen;
  if (!v) return true;
  if (Array.isArray(v)) return v.some(x => x && (x.skill === skill || (Array.isArray(x.skills) && x.skills.includes(skill))));
  if (typeof v === "object") {
    if (v[skill]) return true;
    return Object.values(v).some(x => x && (x.skill === skill || (Array.isArray(x.skills) && x.skills.includes(skill))));
  }
  return true;
};

/* Fertigkeit für ein Ereignis: passend zu Kunde (Stufe, ggf. dessen Themen) und Können (schon geübt);
   Unterrichtsthema bevorzugt, dann fällige, sonst gleichmäßig. null = nichts Passendes (kein Ereignis). */
Spiel.wartung.skillWaehlen = function(id, z){
  const W = Spiel.WARTUNG;
  const kunde = Spiel.karriere.kunde(id);
  const max = Math.min(kunde.stufe, Spiel.st.stufe);
  let kandidaten = Spiel.karriere.skills().filter(s => (s.stufe || 1) <= max && Spiel.karriere.versucht(s.id) && Spiel.wartung.generierbar(s.id)).map(s => s.id);
  if (kunde.skills) { const eigen = kandidaten.filter(s => kunde.skills.includes(s)); if (eigen.length) kandidaten = eigen; }
  if (!kandidaten.length) return null;
  const u = Spiel.einst && Spiel.einst.unterricht;
  if (u && kandidaten.includes(u) && z.kommazahl() < W.UNTERRICHT_ANTEIL) return u;
  const faellig = Spiel.karriere.faelligeIds().filter(s => kandidaten.includes(s));
  if (faellig.length && z.kommazahl() < W.FAELLIG_ANTEIL) return z.wahl(faellig.slice(0, 3));
  return z.wahl(kandidaten);
};

/* Lohn eines Wartungs-Tickets für einen Kunden */
Spiel.wartung.lohn = id => Spiel.WARTUNG.LOHN[Spiel.karriere.kunde(id).stufe] || Spiel.WARTUNG.LOHN[1];

/* Wartungs-Ticket anlegen (FLUSS: Spiel.instanzErstellen). null, wenn kein Generator/keine Instanz möglich. */
Spiel.wartung.ticketAnlegen = function(id, skill, t){
  if (typeof Spiel.instanzErstellen !== "function" || typeof Spiel.generiere !== "function") return null;
  const kunde = Spiel.karriere.kunde(id);
  try {
    const inst = Spiel.instanzErstellen({
      gen: {skill, seed: Spiel.karriere.seed("wartung:" + id + ":" + skill), opts: {stufe: Spiel.karriere.niveau(), karriere: kunde.stufe, kunde: id, art: "wartung"}},
      quelle: "wartung", frist: t + Spiel.WARTUNG.FRIST, kunde: id,
    });
    if (inst && Spiel.st.postfach && !Spiel.st.postfach.some(i => i.iid === inst.iid)) Spiel.st.postfach.push(inst);
    return inst || null;
  } catch (e) {
    typeof console !== "undefined" && console.warn("Wartung: kein Ticket für", skill, e && e.message);
    return null;
  }
};

/* Playbook bezahlen: aus dem Passiv-Budget, höchstens so viel wie da ist */
Spiel.wartung.ausBudget = function(euro){
  const k = Spiel.karriere.daten();
  const b = Math.max(0, Math.min(euro, k.budget));
  k.budget -= b;
  return b;
};

/* Budget nachfüllen und Vertragseinnahmen für [a, b] buchen (bei den aktuell offenen Tickets) */
Spiel.wartung.einnahmen = function(a, b, prot){
  if (b <= a) return;
  const W = Spiel.WARTUNG, k = Spiel.karriere.daten();
  const rate = Spiel.wartung.budgetRate();
  k.budget = Math.min(rate * W.BUDGET_STUNDEN, k.budget + rate * (b - a) / 3600e3);
  let roh = 0;
  for (const id of Spiel.karriere.vertragskunden()) roh += Spiel.wartung.rate(id) * Spiel.wartung.gruenMs(id, a, b) / 3600e3;
  const euro = Spiel.wartung.ausBudget(roh);
  k.guthaben += euro;
  prot.vertragEuro += euro;
};

/* Ein Ereignis bei Kunde id zur Zeit t */
Spiel.wartung.ereignis = function(id, t, prot){
  const W = Spiel.WARTUNG, k = Spiel.karriere.daten();
  const z = Zufall(Spiel.karriere.seed("ereignis:" + id));
  const skill = Spiel.wartung.skillWaehlen(id, z);
  if (!skill) return null;
  if (Spiel.playbooks && Spiel.playbooks.aktiv(skill)) {
    const euro = Spiel.wartung.ausBudget(Spiel.wartung.lohn(id) * W.PLAYBOOK_ANTEIL);
    k.guthaben += euro;
    prot.playbookEuro += euro;
    prot.auto.push({kunde: id, skill, euro: Math.round(euro * 100) / 100, t});
    k.statistik.auto++;
    return {auto: true, skill};
  }
  if (k.offen.length >= W.WARTESCHLANGE) { prot.verpasst++; return null; }
  const inst = Spiel.wartung.ticketAnlegen(id, skill, t);
  if (!inst) return null;
  k.offen.push({iid: inst.iid, kunde: id, skill, erstellt: t, frist: t + W.FRIST});
  prot.neu.push({kunde: id, skill, iid: inst.iid, t});
  return {auto: false, skill, inst};
};

/* Offene Wartungen mit dem Postfach abgleichen (verschwundene Instanzen fallen weg) */
Spiel.wartung.abgleichen = function(){
  const k = Spiel.karriere.daten();
  const da = new Set((Spiel.st.postfach || []).map(i => i.iid));
  k.offen = k.offen.filter(o => da.has(o.iid));
};

/* Offene Wartungen, für die inzwischen ein aktives Playbook da ist, erledigt das Playbook (nicht das gerade offene Ticket) */
Spiel.wartung.playbooksAnwenden = function(t, prot){
  const k = Spiel.karriere.daten(), W = Spiel.WARTUNG;
  if (!Spiel.playbooks) return;
  for (const o of k.offen.slice()) {
    if (o.geloest || Spiel.st.aktiv === o.iid || !Spiel.playbooks.aktiv(o.skill)) continue;
    const euro = Spiel.wartung.ausBudget(Spiel.wartung.lohn(o.kunde) * W.PLAYBOOK_ANTEIL);
    k.guthaben += euro; prot.playbookEuro += euro;
    prot.auto.push({kunde: o.kunde, skill: o.skill, euro: Math.round(euro * 100) / 100, t});
    k.statistik.auto++;
    k.offen = k.offen.filter(x => x.iid !== o.iid);
    if (typeof Spiel.instanzEntfernen === "function") Spiel.instanzEntfernen(o.iid);
    else Spiel.st.postfach = Spiel.st.postfach.filter(i => i.iid !== o.iid);
  }
};

/* Ereignisse und Einnahmen für [a, b] in zeitlicher Reihenfolge nachrechnen */
Spiel.wartung.simulieren = function(a, b, prot){
  const k = Spiel.karriere.daten();
  const kunden = Spiel.karriere.vertragskunden();
  for (const id of kunden) {
    if (typeof k.naechstes[id] !== "number") k.naechstes[id] = a + Spiel.wartung.intervall(id);
    else if (k.naechstes[id] < a) k.naechstes[id] = a + Zufall(Spiel.karriere.seed("versatz:" + id)).zahl(Spiel.WARTUNG.INTERVALL_MIN);
  }
  let cursor = a;
  for (let schutz = 0; schutz < 2000; schutz++) {
    let id = null;
    for (const x of kunden) if (k.naechstes[x] <= b && (id == null || k.naechstes[x] < k.naechstes[id])) id = x;
    if (id == null) break;
    const t = k.naechstes[id];
    Spiel.wartung.einnahmen(cursor, t, prot);
    cursor = t;
    Spiel.wartung.ereignis(id, t, prot);
    k.naechstes[id] = t + Spiel.wartung.intervall(id);
  }
  Spiel.wartung.einnahmen(cursor, b, prot);
};

/* Ampeln in den Spielstand schreiben; true, wenn sich eine geändert hat */
Spiel.wartung.ampelnSetzen = function(t){
  let geaendert = false;
  for (const id of Spiel.karriere.vertragskunden()) {
    const a = Spiel.wartung.ampelBei(id, t);
    const e = Spiel.karriere.kundeStand(id);
    if (e.ampel !== a) { e.ampel = a; geaendert = true; }
  }
  return geaendert;
};

/* Ganze Euro aus dem Guthaben gutschreiben (keine Cent-Flut in der Buchhaltung) */
Spiel.wartung.auszahlen = function(prot){
  const k = Spiel.karriere.daten();
  const ganz = Math.floor(k.guthaben + 1e-9);
  if (ganz < 1) return 0;
  k.guthaben -= ganz;
  k.statistik.passiv += ganz;
  Spiel.karriere.gutschreiben(ganz, 0, prot.auto.length ? "Wartungsverträge und Playbooks" : "Wartungsverträge");
  return ganz;
};

/* Ein Wartungs-Ticket wurde gelöst (Bus ticket-geloest): erst bis jetzt nachrechnen, dann abhaken */
Spiel.wartung.erledigt = function(iid){
  const k = Spiel.karriere.daten();
  const eintrag = k.offen.find(o => o.iid === iid);
  if (!eintrag) return false;
  eintrag.geloest = true;                       /* bis jetzt noch offen rechnen, aber kein Playbook mehr */
  Spiel.tick(jetzt(), {ohneAbgleich: true});
  const o = k.offen.find(x => x.iid === iid);
  k.offen = k.offen.filter(x => x.iid !== iid);
  if (o) {
    const e = Spiel.karriere.kundeStand(o.kunde);
    const vorher = e.ampel;
    e.ampel = Spiel.wartung.ampelBei(o.kunde, jetzt());
    if (vorher !== e.ampel) Spiel.melden("ampel", {kunde: o.kunde, ampel: e.ampel, vorher});
  }
  Spiel.speichern();
  Spiel.melden("zustand-geaendert", {grund: "wartung-erledigt"});
  return true;
};

/* ---------- Takt ----------
   Spiel.tick(zeit = jetzt()) – zeit ist ein ZEITPUNKT in ms (kein Zeitschritt).
   → Protokoll {von, bis, angerechnet, offline, vertragEuro, playbookEuro, auto:[], neu:[], verpasst, ausgezahlt} */
Spiel.tick = function(zeit, {ohneAbgleich = false} = {}){
  if (Spiel._trocken) return null;
  const t = typeof zeit === "number" && zeit > 1e12 ? zeit : jetzt();
  const k = Spiel.karriere.daten(), W = Spiel.WARTUNG;
  const prot = {von: k.letzterTick, bis: t, angerechnet: 0, offline: false, vertragEuro: 0, playbookEuro: 0, auto: [], neu: [], verpasst: 0, ausgezahlt: 0};
  if (!ohneAbgleich) Spiel.wartung.abgleichen();
  if (k.letzterTick == null || t < k.letzterTick) {
    k.letzterTick = t;
    Spiel.wartung.ampelnSetzen(t);
    Spiel.speichern();
    return prot;
  }
  const luecke = t - k.letzterTick;
  const a = Math.max(k.letzterTick, t - W.OFFLINE_MAX);
  prot.angerechnet = t - a;
  prot.offline = luecke >= W.OFFLINE_BERICHT_AB;
  Spiel.wartung.simulieren(a, t, prot);
  Spiel.wartung.playbooksAnwenden(t, prot);
  k.letzterTick = t;
  const ampelNeu = Spiel.wartung.ampelnSetzen(t);
  prot.ausgezahlt = Spiel.wartung.auszahlen(prot);
  if (prot.offline && typeof Spiel.offline !== "undefined") Spiel.offline.merken(prot, luecke);
  if (Spiel.pruefung && Spiel.pruefung.zeitPruefen) Spiel.pruefung.zeitPruefen(t);
  const aufstieg = Spiel.karriere.pruefeAufstieg();
  Spiel.speichern();
  if (!aufstieg && (ampelNeu || prot.neu.length || prot.auto.length) && !prot.ausgezahlt) Spiel.melden("zustand-geaendert", {grund: "takt"});
  return prot;
};

/* Vertrag abschließen (von Spiel.shop.kaufen genutzt; hier ohne Bezahlung) */
Spiel.wartung.vertragStarten = function(id){
  const e = Spiel.karriere.kundeStand(id);
  const k = Spiel.karriere.daten();
  if (k.letzterTick == null) k.letzterTick = jetzt();
  else Spiel.tick(jetzt());
  e.vertrag = true; e.vertragSeit = jetzt(); e.ampel = "gruen";
  k.naechstes[id] = jetzt() + Spiel.wartung.intervall(id);
  Spiel.speichern();
  return e;
};
