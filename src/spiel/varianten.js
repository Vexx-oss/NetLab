"use strict";
/* ---------- „Provisorium oder sauber?“ (Design – Spielspaß 2.0, Hebel 9; Plan – Ausbau 1.2, E1; Architektur § 9.6) ----------
   Bei Aufträgen, deren Lösung Router, Switch oder Firewall ändert, wählt man beim ersten Öffnen:
     Provisorium – nur im laufenden Betrieb beheben: Netzziele, kein Neustart-Test, Lohn × 0,6. Das ist eine Schuld:
                   Nach drei weiteren Abschlüssen fällt beim Kunden der Strom aus, die ungesicherte Änderung ist weg, und er
                   meldet sich wieder („Das Provisorium von neulich …“) – derselbe Fehler, diesmal mit Sicherung.
     Sauber      – beheben, sichern (copy running-config startup-config) und dem Kunden eine Änderungsnotiz schreiben:
                   Lohn × 1,2 (und Vertrauen, Welle 3 E2).
   Keine Strafe, nur Konsequenz (R6): Kein Fortschritt geht verloren, der Folgeauftrag ist ein normaler Auftrag. */
/* nur Aufträge, deren Lösung in der running-config steht (nicht z. B. VLANs in vlan.dat) – sonst hielte auch das Provisorium */
Spiel.VARIANTEN_TICKETS = ["salon-05", "baeckerei-03", "buero-04", "praxis-03", "praxis-06", "autohaus-01", "autohaus-04", "mittel-02"];
Spiel.VARIANTE = {
  provisorium: {id: "provisorium", titel: "Provisorium", sym: "🩹", lohnFaktor: 0.6, folgeNach: 3,
    text: "Schnell und nur im laufenden Betrieb – ohne Sicherung, ohne Notiz. 60 % Lohn, und der Kunde meldet sich in ein paar Aufträgen wieder."},
  sauber: {id: "sauber", titel: "Sauber", sym: "🧰", lohnFaktor: 1.2,
    text: "Beheben, sichern und dem Kunden kurz aufschreiben, was geändert wurde. 120 % Lohn."},
};
Spiel.varianten = {};
Spiel.varianten.fuer = def => def && Spiel.VARIANTEN_TICKETS.includes(def.id) ? [Spiel.VARIANTE.provisorium, Spiel.VARIANTE.sauber] : null;

/* Geräte mit Konfiguration (IOS-artig), die die Lösung ändert – die müssen bei „sauber“ gesichert sein */
Spiel.varianten.geraete = function(def){
  const n = def.netz(Zufall(1));
  return [...new Set((def.loesung || []).filter(s => (s.cli || s.setzen) && n.geraete[s.geraet] && Modell.IOS[n.geraete[s.geraet].typ]).map(s => s.geraet))]
    .map(id => ({id, name: n.geraete[id].name}));
};
Spiel.varianten.sicherungsZiele = def => Spiel.varianten.geraete(def).map(g => ({typ: "gespeichert", geraet: g.id, nachAenderung: true, text: `${g.name}: Änderung gesichert (copy running-config startup-config)`}));

/* Ziele der gewählten Variante; ohne Wahl gelten die Grundziele */
Spiel.varianten.ziele = function(inst, def){
  def = def || Spiel.defVon(inst);
  const basis = (def && def.ziele) || [];
  if (!inst || !inst.variante || !Spiel.varianten.fuer(def)) return basis;
  if (inst.variante === "provisorium") return basis.filter(z => z.typ !== "gespeichert");
  const da = new Set(basis.filter(z => z.typ === "gespeichert").map(z => z.geraet));
  return [...basis, ...Spiel.varianten.sicherungsZiele(def).filter(z => !da.has(z.geraet)),
    {typ: "notiz", id: "notiz", min: 20, text: "Änderungsnotiz für den Kunden geschrieben"}];
};
Spiel.varianten.faktor = inst => (inst && inst.variante && Spiel.VARIANTE[inst.variante] ? Spiel.VARIANTE[inst.variante].lohnFaktor : 1);
Spiel.varianten.waehlen = function(inst, id){
  if (!Spiel.VARIANTE[id] || !Spiel.varianten.fuer(Spiel.defVon(inst))) return null;
  inst.variante = id;
  Spiel.speichern();
  Spiel.melden("arbeit-geaendert", {inst});
  return Spiel.VARIANTE[id];
};
Spiel.notizSetzen = function(inst, text){
  inst.notiz = String(text == null ? "" : text).slice(0, 400);
  inst.fortschritt = jetzt();
  Spiel.speichern();
  Spiel.melden("arbeit-geaendert", {inst});
};

Spiel.ergaenzer.schulden = st => { if (!Array.isArray(st.schulden)) st.schulden = []; };

/* ---- Schulden und Folgeauftrag ---- */
Spiel.varianten.schulden = (st = Spiel.st) => (Array.isArray(st.schulden) ? st.schulden : (st.schulden = []));
Spiel.varianten.schuldAnlegen = function(inst, def){
  const l = Spiel.varianten.schulden(), n = Spiel.st.erledigt.length;
  const s = {id: "s" + (l.length + 1), ticket: def.id, kunde: inst.kunde || def.kunde, titel: def.titel, seit: n, faellig: n + Spiel.VARIANTE.provisorium.folgeNach, folge: null, erledigt: false};
  l.push(s);
  return s;
};
/* Fällige Schulden werden Folgeaufträge (nach drei weiteren Abschlüssen) */
Spiel.varianten.faelligeAusloesen = function(){
  const neu = [], n = Spiel.st.erledigt.length;
  for (const s of Spiel.varianten.schulden()) {
    if (s.erledigt || s.folge || n < s.faellig) continue;
    try {
      const inst = Spiel.instanzErstellen({ticketId: s.ticket + "-folge", quelle: "folge", kunde: s.kunde});
      s.folge = inst.iid;
      neu.push(inst);
    } catch (e) { typeof console !== "undefined" && console.error("Folgeauftrag", s, e); }
  }
  return neu;
};
Spiel.varianten.folgeErledigt = function(def){
  for (const s of Spiel.varianten.schulden()) if (!s.erledigt && def.id === s.ticket + "-folge") s.erledigt = true;
};
/* Der Folgeauftrag: dasselbe Netz mit demselben Fehler (die ungesicherte Änderung ist nach dem Stromausfall weg), jetzt mit Sicherung */
Spiel.varianten.folgeDef = function(basis){
  if (!basis) return null;
  const id = basis.id + "-folge";
  if (Spiel.generierte[id]) return Spiel.generierte[id];
  const K = Spiel.kundenDaten(basis.kunde), ap = K.ansprechpartner || {};
  const da = new Set((basis.ziele || []).filter(z => z.typ === "gespeichert").map(z => z.geraet));
  const def = Object.assign({}, basis, {
    id, reihe: undefined, generiert: true, folgeVon: basis.id, varianten: undefined,
    titel: `Das Provisorium von neulich: ${basis.titel}`,
    briefing: `Erinnerst du dich an „${basis.titel}“? Heute Nacht war bei uns der Strom weg – und jetzt ist genau derselbe Fehler wieder da. Diesmal bitte so, dass es hält.\n\n${ap.name || K.name}, ${K.name}`,
    symptom: `Nach einem Stromausfall ist der Fehler von „${basis.titel}“ zurück.`,
    ziele: [...(basis.ziele || []), ...Spiel.varianten.sicherungsZiele(basis).filter(z => !da.has(z.geraet))],
    erklaerung: "Die running-config steht nur im Arbeitsspeicher. Nach einem Neustart lädt das Gerät die startup-config – was nicht gesichert war, ist weg. Ein Provisorium spart heute fünf Minuten und kostet beim nächsten Stromausfall einen zweiten Einsatz.",
    quelle: basis.quelle || "Cisco IOS Configuration Fundamentals",
  });
  /* Lösung + Sicherung: bei IOS-Geräten gehört das Speichern dazu */
  const gespeichert = new Set((def.loesung || []).filter(s => s.aktion === "speichern").map(s => s.geraet));
  def.loesung = [...(basis.loesung || []), ...Spiel.varianten.geraete(basis).filter(g => !gespeichert.has(g.id)).map(g => ({aktion: "speichern", geraet: g.id, text: `${g.name}: copy running-config startup-config`}))];
  Spiel.generierte[id] = def;
  return def;
};
