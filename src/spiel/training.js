"use strict";
/* ---------- Spiel: Trainingsbereich (Vertrag „Hilfestellung – Stufen und Schnittstellen“ § 6) ----------
   Übungsszenarien ABSEITS der Aufträge. Eigene Ansicht „training“ (src/ui/training.js, Präfix tr-).

   Regeln (Vertrag § 6, verbindlich):
   · Training zahlt KEIN Geld und KEINEN Ruf und erscheint NICHT in der Karriere-Wertung: kein st.erledigt,
     kein st.buch, kein Karriere-Ereignis (also auch kein „ticket-geloest“) – sonst wäre es eine Geldquelle
     statt einer Übung.
   · Es zählt für den Lernmotor: Spiel.lernenNachAbnahme(inst, def, abnahme) → L.ueben je Fertigkeit,
     wie bei einem echten Auftrag (inkl. Fehlerheft bei Fehlschlägen).
   · Keine eigene Simulation und kein eigener Generator: die Instanz entsteht über
     Spiel.instanzErstellen({gen:{skill, seed, opts}, quelle:"training"}) mit stabilem Seed.
   · Deterministisch: kein Math.random, keine Uhr. Der Seed kommt aus Spiel.karriere.seed (fortlaufend,
     im selben Spielstand reproduzierbar), Ersatzweg Spiel.neuerSeed (in Tests über jetzt.setzen steuerbar).
   · Bildungsstand (Baustein A, src/spiel/stufensystem.js): azubi bekommt die geführte Simulation MIT
     Gerüst, azubi-plus angeboten OHNE Gerüst, geselle die Vorratsliste, meister die Liste ohne Gerüst.
     Spiel.stufe wird NIE hart aufgerufen – fehlt der Baustein, gilt „azubi“ (Rückfall).
   · st.training (je Szenario {versucht, bestanden, bestes}) wird in src/spiel/zustand.js migriert;
     stand() prüft die Form trotzdem, damit die Funktion auch mit einem halben Stand läuft.

   Öffentliche Fläche: Spiel.TRAINING, Spiel.training.liste/starten/stand/abnehmen.
   Gerüst-Inhalte kommen aus dem Bestand – Spiel.LEITER (6 Sprossen) und Spiel.WERKZEUGE[skill] –,
   es wird nichts doppelt gepflegt. */

/* Ein Szenario ist ein kleiner Übungsauftrag. Felder wie im Vertrag § 6:
     id, titel, beschreibung, skill, geraet, art, minuten, geruest
   dazu:
   · niveau  Erklärtiefe/Prüfungsstrenge der erzeugten Instanz (opts.stufe des Generators), E | AP1 | AP2.
   · tipp    Denkanstoß fürs Gerüst (nie die Lösung) – nur für Stufen mit Gerüst sichtbar.
   · quelle  belegte Quelle (Vault-Notiz, RFC oder Hersteller-Doku). Die Wortlaute stammen aus
             DATEN.lehrtexte (dort steht je Grundcode dieselbe Quellenangabe).
   geraet: „host“ = Endgerät (Spiel.HOSTTYPEN: PC, Server, NAS) · „switch“ · „router“ · „server“ ·
           „alle“ = mehrere Geräteklassen, das Gerät hängt dann am Seed.
           Die Angabe wird in tests/spiel-training.test.js gegen die Injektoren der Fertigkeit gemessen. */
const TRAINING_EIGENE_SZENARIEN = [
  { id: "link-port", titel: "Kein Link: Kabel und Ports", skill: "lab.link", geraet: "alle",
    art: "basis", minuten: 4, geruest: true, niveau: "E",
    beschreibung: "Ein Gerät ist nicht erreichbar, obwohl alle Adressen stimmen. Übe die Fehlersuche von unten: Kabel, Port, Status.",
    tipp: "Von unten nach oben: erst der Link (hängt eine Leitung dran?), dann die Adresse. Ein abgeschalteter Port sieht aus wie ein fehlendes Kabel.",
    quelle: "Fragen – Netzwerke planen (Fehlersuche nach OSI von unten) · Cisco IOS Interface Command Reference (show ip interface brief)" },

  { id: "ip-maske", titel: "IP-Adresse und Maske", skill: "lab.ip", geraet: "host",
    art: "basis", minuten: 5, geruest: true, niveau: "E",
    beschreibung: "Ein Rechner hat eine Adresse, kommt aber nicht ins Netz. Finde den Zahlendreher in der Adresse oder die falsche Maske.",
    tipp: "Vergleich Adresse und Maske mit den Nachbarn im selben Netz. Rechne nach, wo für dieses Gerät sein eigenes Netz endet – gehört das Gateway noch dazu?",
    quelle: "Network – Lernfassung (§ 7 IPv4-Adressen) · Cisco IOS IP Addressing Command Reference (ip address)" },

  { id: "gateway", titel: "Standardgateway", skill: "lab.gateway", geraet: "alle",
    art: "stoerung", minuten: 5, geruest: true, niveau: "AP1",
    beschreibung: "Im eigenen Netz geht alles, nach draußen nichts. Finde heraus, woran das Gateway scheitert.",
    tipp: "Wohin schickt ein Rechner ein Paket für ein fremdes Netz – und gibt es diese Adresse im eigenen Netz wirklich? Ping zuerst das Gateway selbst.",
    quelle: "Network – Lernfassung (§ 8 Subnetting, § 9 Gateway) · 04-AP1-Netzwerk · Network – Lernfassung (§ 9: Liegt das Ziel in einem anderen Netz?)" },

  { id: "route", titel: "Route und Default-Route", skill: "lab.route", geraet: "router",
    art: "stoerung", minuten: 8, geruest: true, niveau: "AP1",
    beschreibung: "Zwei Netze sollen sich erreichen. Einem Router fehlt die Route zum Ziel – oder der Rückweg.",
    tipp: "Ein Ping braucht Hin- und Rückweg. Welches Netz fehlt in welcher Routingtabelle, und was meldet der Router dem Absender?",
    quelle: "RFC 792 (Destination Unreachable) · Network – Lernfassung (§ 0: die Antwort braucht ebenfalls einen Weg) · Cisco IOS IP Routing: Static Routing Configuration Guide" },

  { id: "dns", titel: "DNS-Namensauflösung", skill: "lab.dns", geraet: "host",
    art: "stoerung", minuten: 5, geruest: true, niveau: "AP1",
    beschreibung: "Der Ping auf die Adresse klappt, der Ping auf den Namen nicht. Übe die zwei Fragen der Namensauflösung.",
    tipp: "Zwei Fragen: Kennt der Client einen DNS-Server, und kennt der Server den Namen? Vergleiche ping mit Adresse und ping mit Namen.",
    quelle: "Network – Lernfassung (§ 9 DNS) · RFC 1034 · RFC 1035" },

  { id: "dhcp", titel: "DHCP: Adresse per DORA", skill: "lab.dhcp", geraet: "alle",
    art: "stoerung", minuten: 6, geruest: true, niveau: "AP1",
    beschreibung: "Ein Client hat eine Adresse aus 169.254.x.x. Übe den Ablauf Discover – Offer – Request – Ack.",
    tipp: "Verfolg die vier Pakete in der Simulation. Wo endet der Ablauf – kommt ein Angebot überhaupt beim Client an?",
    quelle: "Network – Lernfassung (§ 7 Besondere Adressen, § 9 DORA) · RFC 2131 · RFC 3927" },

  { id: "dienst-port", titel: "Dienst und Port", skill: "lab.ports", geraet: "alle",
    art: "pruefung", minuten: 5, geruest: false, niveau: "AP2",
    beschreibung: "Der Server antwortet auf Ping, aber die Anwendung kommt nicht durch. Prüfungsszenario: Ports, Dienste, TCP-Abbruch.",
    tipp: "",
    quelle: "04-AP1-Netzwerk (Ports) · VLAN – Visuelle Lernnotiz (§ 1 Port ist nicht gleich Port) · RFC 792 · RFC 9293" },

  { id: "vlan", titel: "VLAN und Access-Ports", skill: "lab.vlan", geraet: "switch",
    art: "basis", minuten: 6, geruest: true, niveau: "AP1",
    beschreibung: "Zwei Rechner am selben Switch erreichen sich nicht, obwohl beide eine Adresse haben. Übe Access-Ports und VLAN-Zuordnung.",
    tipp: "„show vlan brief“ zeigt, welcher Port in welchem VLAN ist. Vergleich das mit dem Netz, in dem die Adresse des Rechners liegt.",
    quelle: "VLAN – Lernfassung · VLAN – Visuelle Lernnotiz (§ 7 Zwischen VLANs routen) · IEEE 802.1Q" },

  { id: "trunk", titel: "Trunk und 802.1Q", skill: "lab.trunk", geraet: "switch",
    art: "pruefung", minuten: 8, geruest: false, niveau: "AP2",
    beschreibung: "Ein VLAN kommt über die Uplink-Strecke nicht durch. Prüfungsszenario ohne Gerüst: Trunk, erlaubte VLANs, 802.1Q.",
    tipp: "",
    quelle: "VLAN – Lernfassung (§ 2 Befehle) · Cisco Catalyst Software Configuration Guide: Configuring VLAN Trunks" },
];

/* Baustein G liefert die Szenarien als Datenpaket: src/daten/trainings.js → DATEN.trainings
   (34 Szenarien, jede Fertigkeit aus DATEN.skills, Gerüst mit Schritten). Ist es geladen – der Normalfall –,
   gilt es; fehlt es, bleibt die eingebaute Liste oben. So ist der Trainingsbereich in beiden Fällen
   vollständig, und Spiel.TRAINING bleibt die eine öffentliche Liste (Vertrag § 6).
   Beide Wege prüft tests/spiel-training.test.js. */
Spiel.TRAINING = (typeof DATEN !== "undefined" && Array.isArray(DATEN.trainings) && DATEN.trainings.length)
  ? DATEN.trainings : TRAINING_EIGENE_SZENARIEN;

Spiel.training = (() => {
  /* Rückfall, wenn Baustein A (src/spiel/stufensystem.js) fehlt oder wirft: die Stufe „azubi“ (§ 2). */
  const RUECKFALL = {id: "azubi", training: true, erklaerung: "ausfuehrlich"};

  function stufeId(){
    if (typeof Spiel.stufe !== "undefined" && Spiel.stufe && typeof Spiel.stufe.id === "function") {
      try { return Spiel.stufe.id() || RUECKFALL.id; } catch (e) { /* Rückfall */ }
    }
    return RUECKFALL.id;
  }
  function stufeDarf(frage){
    if (typeof Spiel.stufe !== "undefined" && Spiel.stufe && typeof Spiel.stufe.darf === "function") {
      try { return !!Spiel.stufe.darf(frage); } catch (e) { /* Rückfall */ }
    }
    return !!RUECKFALL[frage];
  }
  function stufeErklaerung(){
    if (typeof Spiel.stufe !== "undefined" && Spiel.stufe && typeof Spiel.stufe.erklaerung === "function") {
      try { return Spiel.stufe.erklaerung() || RUECKFALL.erklaerung; } catch (e) { /* Rückfall */ }
    }
    return RUECKFALL.erklaerung;
  }
  /* Geführte Simulation bietet nur azubi/azubi-plus an (§ 2); das Gerüst selbst bekommt nur die
     ausführliche Erklärtiefe (azubi). Alles andere sieht die Vorratsliste. */
  const gefuehrt = () => stufeDarf("training");
  const mitGeruest = def => !!(gefuehrt() && def && def.geruest && stufeErklaerung() === "ausfuehrlich");

  const szenario = id => Spiel.TRAINING.find(t => t && t.id === id) || null;
  const generatorDa = () => typeof Spiel.generiere === "function" && typeof Spiel.instanzErstellen === "function";
  /* Gibt es für diese Fertigkeit überhaupt einen Fehler-Injektor? Ohne ihn kann kein Übungsfall entstehen. */
  const injektorDa = skill => Object.values(Spiel.INJEKTOREN || {}).some(i => (i.skills || []).includes(skill));
  const OHNE_INJEKTOR = "Für diese Fertigkeit gibt es keinen Fehler-Injektor – sie wird in den Aufträgen geübt, nicht im Training.";

  /* Stabiler Seed je Start. Spiel.karriere.seed zählt fort (k.zaehler) – zwei Starts desselben Szenarios
     ergeben also zwei verschiedene Übungen, derselbe Spielstand aber immer dieselbe Reihenfolge. */
  function seedFuer(id, versuch){
    const zusatz = "training:" + id + ":" + versuch;
    if (Spiel.karriere && typeof Spiel.karriere.seed === "function") return Spiel.karriere.seed(zusatz);
    if (typeof Spiel.neuerSeed === "function") return Spiel.neuerSeed(zusatz);
    return 1;
  }

  /* Trainingsstand: {je: {[szenarioId]: {versucht, bestanden, bestes}}} (Vertrag § 6).
     Fehlt oder hakt das Feld, wird es hier in Form gebracht – die Migration in zustand.js bleibt die erste Stelle. */
  function stand(){
    const st = Spiel.st;
    if (!st.training || typeof st.training !== "object" || Array.isArray(st.training)) st.training = {je: {}};
    if (!st.training.je || typeof st.training.je !== "object" || Array.isArray(st.training.je)) st.training.je = {};
    for (const [id, e] of Object.entries(st.training.je)) {
      if (!e || typeof e !== "object") { delete st.training.je[id]; continue; }
      if (typeof e.versucht !== "number" || !isFinite(e.versucht)) e.versucht = 0;
      if (typeof e.bestanden !== "number" || !isFinite(e.bestanden)) e.bestanden = 0;
      if (typeof e.bestes !== "number" || !isFinite(e.bestes)) e.bestes = 0;
    }
    return st.training;
  }
  const eintrag = (s, id) => (s.je[id] ||= {versucht: 0, bestanden: 0, bestes: 0});
  /* Offener Durchgang eines Szenarios (angefangen, noch nicht bestanden) */
  const laufend = id => (Spiel.st.postfach || []).find(i => i && i.quelle === "training" && i.training === id) || null;

  /* Spiel.training.liste() → [{…Szenario, stand:{versucht,bestanden,sterne}, offen, grund, …}] */
  function liste(){
    const s = stand();
    const stufe = (Spiel.st && Spiel.st.stufe) || 1;
    return Spiel.TRAINING.map(def => {
      const e = s.je[def.id] || {versucht: 0, bestanden: 0, bestes: 0};
      const skill = Spiel.skill(def.skill);
      const offen = generatorDa() && injektorDa(def.skill);
      const laeuft = laufend(def.id);
      const geruest = mitGeruest(def);
      const eintragListe = Object.assign({}, def, {
        skillName: skill.name,
        karriereStufe: skill.stufe || 1,
        empfohlen: stufe >= (skill.stufe || 1),          /* Hinweis, kein Riegel: Üben darf jeder */
        stand: {versucht: e.versucht, bestanden: e.bestanden, sterne: e.bestes},
        offen,
        grund: offen ? "" : (generatorDa() ? OHNE_INJEKTOR : "Ohne Ticket-Generator lässt sich dieses Szenario nicht bauen."),
        laeuft: laeuft ? laeuft.iid : null,
        stufe: stufeId(),                                /* Bildungsstand, nach dem sich das Gerüst richtet */
        gefuehrt: gefuehrt(),
        mitGeruest: geruest,
        hilfen: geruest ? {
          leiter: (Spiel.LEITER || []).map(s2 => ({id: s2.id, titel: s2.titel, frage: s2.frage, werkzeug: s2.werkzeug})),
          werkzeug: (Spiel.WERKZEUGE || {})[def.skill] || "",
          tipp: def.tipp || "",
          schritte: Array.isArray(def.schritte) ? def.schritte.slice() : [],
        } : null,
      });
      return eintragListe;
    });
  }

  /* Spiel.training.starten(id) → {ok:true, iid} | {ok:false, grund}
     Legt eine Instanz mit quelle "training" an. Höchstens EIN offener Durchgang je Szenario:
     ein neuer Start ersetzt den alten (Übung, kein Auftrag – nichts geht verloren, was zählt, steht im Stand). */
  function starten(id){
    const def = szenario(id);
    if (!def) return {ok: false, grund: "Unbekanntes Szenario: " + id};
    if (!generatorDa()) return {ok: false, grund: "Ohne Ticket-Generator lässt sich dieses Szenario nicht bauen."};
    if (!injektorDa(def.skill)) return {ok: false, grund: OHNE_INJEKTOR};
    Spiel.skillsRegistrieren();
    const s = stand();
    const versuch = (s.je[id] && s.je[id].versucht) || 0;
    for (const alt of (Spiel.st.postfach || []).slice()) if (alt && alt.quelle === "training" && alt.training === id) Spiel.instanzEntfernen(alt.iid);
    let letzter = null;
    for (let v = 0; v < 4; v++) {
      try {
        const inst = Spiel.instanzErstellen({gen: {skill: def.skill, seed: seedFuer(id, versuch + v), opts: {stufe: def.niveau}}, quelle: "training", ohneFlow: true});
        inst.training = id;                       /* gehört zu diesem Szenario (nicht zur Karriere) */
        Spiel.speichern();
        return {ok: true, iid: inst.iid};
      } catch (e) { letzter = e; }
    }
    return {ok: false, grund: `Für „${def.titel}“ ließ sich gerade kein Fall bauen${letzter && letzter.message ? " (" + letzter.message + ")" : ""}.`};
  }

  /* Spiel.training.abnehmen(iid, ergebnis) → Ergebnis in der Form von Spiel.abschliessen.
     ergebnis ist die Abnahme aus Spiel.abnahme(inst); fehlt sie, wird sie hier geholt.
     Schreibt den Trainingsstand und den Lernmotor (L.ueben). KEIN Euro, KEIN Ruf, KEIN st.erledigt,
     kein Karriere-Ereignis – der Durchgang verschwindet nach dem Bestehen aus st.postfach. */
  function abnehmen(iid, ergebnis){
    const inst = Spiel.instanz(iid);
    if (!inst) return {ok: false, grund: "Dieser Trainingsdurchgang ist nicht mehr da."};
    if (inst.quelle !== "training") return {ok: false, grund: "Das ist kein Trainingsdurchgang."};
    const def = Spiel.defVon(inst);
    if (!def) return {ok: false, grund: "Zu diesem Durchgang fehlt die Aufgabe."};
    const sz = szenario(inst.training);
    const ab = ergebnis && typeof ergebnis === "object" && Array.isArray(ergebnis.ergebnisse) ? ergebnis : Spiel.abnahme(inst);
    const s = stand();
    const e = eintrag(s, sz ? sz.id : def.id);
    e.versucht++;
    const lernen = Spiel.lernenNachAbnahme(inst, def, ab);
    if (ab.bestanden) {
      e.bestanden++;
      e.bestes = Math.max(e.bestes, ab.sterne || 0);
      Spiel.instanzEntfernen(iid);
    }
    const ergebnisDaten = {
      ok: true, training: sz ? sz.id : null,
      bestanden: !!ab.bestanden, sterne: ab.bestanden ? (ab.sterne || 0) : 0,
      abnahme: ab, lernen, def, inst, stand: e,
      euro: 0, ruf: 0, lohn: {euro: 0, grund: 0, tempo: 0, ruf: 0},
      dank: "", erklaerung: def.erklaerung || "", quelle: def.quelle || "",
      naechstes: null, dex: [], raetsel: null, woche: null, verdacht: null, hotline: null, kundenakte: null, flow: null,
      hinweis: "Training zahlt kein Geld und keinen Ruf – es zählt für den Lernstand.",
    };
    Spiel.melden("training", {szenario: ergebnisDaten.training, iid, bestanden: ergebnisDaten.bestanden, sterne: ergebnisDaten.sterne, stand: e});
    Spiel.geaendert("training");
    Spiel.sofortSpeichern();
    return ergebnisDaten;
  }

  return {liste, starten, stand, abnehmen};
})();
