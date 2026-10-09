"use strict";
/* ---------- Ereignisse (Design – Spielspaß 2.0, Hebel 9; Plan – Ausbau 1.2, E3; Architektur § 9.6) ----------
   Höchstens eines je 15 (normal) bzw. 30 (selten) Minuten AKTIVER Zeit, Einstellung aus/selten/normal (Standard selten).
   Jedes Ereignis erklärt, warum so etwas in echt passiert. Nie Fortschrittsverlust (R6): Stufe, Aufträge, Kunden bleiben;
   Netzänderungen laufen über den Verlauf (Strg+Z). Deterministisch: Wahl aus Spielstand-Zähler, nicht aus Math.random.
   Nicht in Prüfung, Tagesrätsel, Trainingsdurchgang, Klassenraum-Auftrag und im allerersten Auftrag:
   Training und Klassenraum zahlen laut Architektur § 13.3 Punkt 1 KEIN Geld und KEINEN Ruf – der Takt
   würde das über `weiterempfehlung` (Ruf +1, Zeile 87) und „Provider anrufen" (Ruf +1, Zeile 145) sowie
   über die dabei entstehenden Tickets umgehen. Gemessen (diese Sitzung, 40 erzwungene Takte je Quelle,
   gleicher Auftrag): klassenraum 40 Treffer / 8 × Ruf / 16 neue Tickets / Provider-Störung, training
   zeichengleich – nach der Sperre beide 0, der normale Auftrag unverändert 40/8. */
Spiel.EREIGNIS_TAKT = {selten: 30 * 60 * 1000, normal: 15 * 60 * 1000};
Spiel.ereignisse = {};
Spiel.ereignisse.daten = (st = Spiel.st) => {
  if (!st.ereignisse || typeof st.ereignisse !== "object") st.ereignisse = {aktivMs: 0, letzteMs: 0, n: 0, liste: []};
  return st.ereignisse;
};
Spiel.ergaenzer.ereignisse = st => { Spiel.ereignisse.daten(st); };
Spiel.ereignisse.einstellung = () => (Spiel.einst && Spiel.einst.ereignisse) || "selten";
Spiel.ereignisse.aktivZaehlen = ms => { const d = Spiel.ereignisse.daten(); d.aktivMs += Math.max(0, ms || 0); };
Spiel.ereignisse.faellig = function(){
  const takt = Spiel.EREIGNIS_TAKT[Spiel.ereignisse.einstellung()];
  if (!takt) return false;
  const d = Spiel.ereignisse.daten();
  return d.aktivMs - d.letzteMs >= takt;
};

const EREIGNIS_HILFE = {
  ios: inst => Object.values(inst.netz.geraete).filter(g => Modell.IOS[g.typ] && g.an),
  name: (inst, id) => (inst.netz.geraete[id] || {}).name || id,
  /* Kabel zwischen einem Switch und einem Endgerät, das Kabel ist gesteckt */
  kabel: inst => inst.netz.kabel.filter(k => {
    const a = inst.netz.geraete[k.a.geraet], b = inst.netz.geraete[k.b.geraet];
    return a && b && ((a.typ === "switch" && Modell.HOST[b.typ]) || (b.typ === "switch" && Modell.HOST[a.typ]));
  }),
  sichtbar: def => !def.fernwartung && !def.blatt,
};

Spiel.EREIGNISSE = {
  stromausfall: {titel: "Stromausfall beim Kunden", sym: "⚡", gewicht: 3,
    bedingung: ({inst}) => !!inst && EREIGNIS_HILFE.ios(inst).length > 0,
    ausloesen({inst}){
      const weg = Spiel.ungespeicherteGeraete(inst).map(g => g.name);
      Spiel.aendern(inst, "Stromausfall: alle Netzgeräte neu gestartet", n => { for (const g of Object.values(n.geraete)) if (Modell.IOS[g.typ] && g.an) Modell.neustart(n, g.id); });
      return {weg,
        text: weg.length ? `Beim Kunden war kurz der Strom weg. ${weg.join(", ")} ${weg.length === 1 ? "hat" : "haben"} neu gestartet – was nicht gesichert war, ist weg.`
          : "Beim Kunden war kurz der Strom weg. Alles ist neu gestartet – und nichts verloren, weil alles gesichert war.",
        warum: "Nach einem Neustart lädt ein Router die startup-config. Was nur in der running-config stand, ist weg – deshalb nach jeder Änderung copy running-config startup-config (write memory)."};
    }},
  kabelschaden: {titel: "Kabel herausgerissen", sym: "✂", gewicht: 2,
    bedingung: ({inst, def}) => !!inst && EREIGNIS_HILFE.sichtbar(def) && EREIGNIS_HILFE.kabel(inst).length > 0,
    ausloesen({inst, z}){
      const k = z.wahl(EREIGNIS_HILFE.kabel(inst)), host = Modell.HOST[inst.netz.geraete[k.a.geraet].typ] ? k.a.geraet : k.b.geraet;
      Spiel.aendern(inst, `Kabelschaden: ${EREIGNIS_HILFE.name(inst, host)} getrennt`, n => Modell.trennen(n, k.id));
      return {geraet: host, text: `Die Reinigungskraft ist beim Staubsaugen am Kabel von ${EREIGNIS_HILFE.name(inst, host)} hängen geblieben – es ist raus.`,
        warum: "Kabel werden gezogen, geknickt, angeknabbert. Wenn plötzlich etwas nicht mehr geht: zuerst Schicht 1 – steckt das Kabel, leuchtet der Link?"};
    }},
  provider: {titel: "Provider-Störung", sym: "🌩", gewicht: 2,
    bedingung: ({inst, def}) => !!inst && EREIGNIS_HILFE.sichtbar(def) && Object.values(inst.netz.geraete).some(g => g.typ === "internet" && g.an),
    ausloesen({inst}){
      const inet = Object.values(inst.netz.geraete).find(g => g.typ === "internet");
      Spiel.aendern(inst, "Provider-Störung: Internet beim Kunden weg", n => Modell.geraetSetzen(n, inet.id, "an", false));
      inst.providerStoerung = inet.id;
      return {text: "Beim Kunden ist das Internet weg – diesmal nicht durch dich: Der Provider hat eine Störung.", aktion: "provider",
        warum: "Endet tracert hinter dem eigenen Router, liegt es beim Provider. Dann hilft keine Konfiguration, sondern ein Anruf mit Störungsnummer – und dem Kunden Bescheid sagen."};
    }},
  praktikant: {titel: "„Der Praktikant hat nur kurz …“", sym: "🙈", gewicht: 1,
    bedingung: ({inst, def}) => !!inst && EREIGNIS_HILFE.sichtbar(def) && def.art !== "projekt" && Object.values(inst.netz.geraete).some(g => g.typ === "switch" && g.an),
    ausloesen({inst, z}){
      /* ein Switchport eines Endgeräts per shutdown aus – sichtbar als dunkler Link, lösbar mit no shutdown */
      const kand = EREIGNIS_HILFE.kabel(inst).map(k => inst.netz.geraete[k.a.geraet].typ === "switch" ? {sw: k.a.geraet, port: k.a.port, host: k.b.geraet} : {sw: k.b.geraet, port: k.b.port, host: k.a.geraet})
        .filter(x => (Modell.lesen(inst.netz.geraete[x.sw].running, `ports.${x.port}`) || {}).shutdown !== true);
      if (!kand.length) return null;
      const x = z.wahl(kand);
      Spiel.aendern(inst, `Praktikant: ${EREIGNIS_HILFE.name(inst, x.sw)} ${x.port} abgeschaltet`, n => Modell.setzen(n, x.sw, `ports.${x.port}.shutdown`, true));
      (inst.ereignisLoesung ||= []).push({geraet: x.sw, cli: `conf t\ninterface ${x.port}\nno shutdown\nend`, text: `${EREIGNIS_HILFE.name(inst, x.sw)}: ${x.port} wieder einschalten (no shutdown).`});
      return {geraet: x.sw, text: `Der Praktikant hat am ${EREIGNIS_HILFE.name(inst, x.sw)} „nur kurz aufgeräumt“. Seitdem ist ${EREIGNIS_HILFE.name(inst, x.host)} still.`,
        warum: "Änderungen ohne Absprache sind ein Klassiker. Darum gibt es Änderungsprotokolle – und Rechte, wer am Switch konfigurieren darf."};
    }},
  weiterempfehlung: {titel: "Weiterempfehlung", sym: "💬", gewicht: 2,
    bedingung: () => Object.values(DATEN.kunden || {}).some(k => (k.stufe || 1) <= Spiel.st.stufe && Spiel.vorlagen._fuerKunde[k.id] && k.id !== "storage"),
    ausloesen({z, wunsch = {}}){
      const kunden = Object.values(DATEN.kunden).filter(k => (k.stufe || 1) <= Spiel.st.stufe && Spiel.vorlagen._fuerKunde[k.id] && k.id !== "storage");
      const k = kunden.find(x => x.id === wunsch.kunde) || z.wahl(kunden), form = wunsch.form || z.wahl(["forensik", "audit"]);
      let inst = null;
      try { inst = Spiel.instanzErstellen({gen: {form, seed: 1 + z.zahl(1000000), opts: Object.assign({kunde: k.id}, wunsch.stufe ? {stufe: wunsch.stufe} : {})}, quelle: "generiert", kunde: k.id}); } catch (e) { return null; }
      /* Wer empfiehlt? Der Kunde, für den man bisher am meisten gearbeitet hat – nicht der neue (der kennt einen ja noch nicht) */
      const zahl = {};
      for (const e of Spiel.st.erledigt || []) if (e && e.kunde && e.kunde !== k.id) zahl[e.kunde] = (zahl[e.kunde] || 0) + 1;
      const vonId = Object.keys(zahl).sort((a, b) => zahl[b] - zahl[a])[0], von = vonId ? Spiel.kundenDaten(vonId) : null;
      const vonName = von ? (von.ansprechpartner || {}).name || von.name : "Ein zufriedener Kunde", neuName = (k.ansprechpartner || {}).name || k.name;
      Spiel.gutschreiben(0, 1, `Weiterempfehlung${von ? " durch " + von.name : ""}`);
      return {iid: inst.iid, aktion: "neu", von: vonId || null, text: `${vonName} hat dich weiterempfohlen: ${neuName} (${k.name}) meldet sich mit einem Auftrag. +1 Ruf.`,
        warum: "Im IT-Service kommen viele Aufträge über Empfehlungen: Wer sauber arbeitet und erklärt, was er tut, wird weitergegeben."};
    }},
  notfall: {titel: "Notfall-Anruf", sym: "🚨", gewicht: 2,
    bedingung: ({inst}) => !!inst && Object.values(DATEN.kunden || {}).some(k => (k.stufe || 1) <= Spiel.st.stufe && k.id !== (inst.kunde || "") && Spiel.vorlagen._fuerKunde[k.id] && k.id !== "storage"),
    ausloesen({inst, z}){
      const kunden = Object.values(DATEN.kunden).filter(k => (k.stufe || 1) <= Spiel.st.stufe && k.id !== inst.kunde && Spiel.vorlagen._fuerKunde[k.id] && k.id !== "storage");
      const k = z.wahl(kunden), skills = (Spiel.vorlagen[Spiel.vorlagen._fuerKunde[k.id]].skills || ["lab.link"]).filter(s => s !== "lab.portsec");
      let neu = null;
      for (let v = 0; v < 4 && !neu; v++) {
        try { neu = Spiel.instanzErstellen({gen: {skill: z.wahl(skills), seed: 1 + z.zahl(1000000), opts: {kunde: k.id}}, quelle: "notfall", kunde: k.id, frist: jetzt() + Spiel.NOTFALL_FRIST}); } catch (e) { neu = null; }
      }
      if (!neu) return null;
      return {iid: neu.iid, aktion: "notfall", text: `${(k.ansprechpartner || {}).name || k.name} ruft an: „${Spiel.defVon(neu).titel}“ – bitte in 20 Minuten. Du entscheidest: jetzt wechseln oder erst fertig machen.`,
        warum: "Priorisieren gehört zum Job: Was steht still, was kann warten? Die Frist ist ein Versprechen an den Kunden – wer sie hält, bekommt einen Bonus. Zu spät kostet nichts außer dem Bonus."};
    }},
};
Spiel.NOTFALL_FRIST = 20 * 60 * 1000;
Spiel.NOTFALL_BONUS = 0.25;

/* Ein Ereignis auslösen (Tests, Abnahme) – ctx = {inst?}. Gibt {id, titel, sym, text, warum, …} oder null */
/* ctx: {inst?} – ohne inst gilt der gerade offene Auftrag (ein Stromausfall braucht einen Kunden mit Netz);
   {form, kunde, stufe} sind Wünsche, die passende Ereignisse beachten (Weiterempfehlung in der ersten Stunde) */
Spiel.ereignisse.ausloesen = function(id, ctx = {}){
  const E = Spiel.EREIGNISSE[id]; if (!E) return null;
  const d = Spiel.ereignisse.daten();
  const inst = ctx.inst || (Spiel.aktiveInstanz && Spiel.aktiveInstanz()) || null, def = inst ? Spiel.defVon(inst) : null;
  const c = {inst, def, z: Zufall(`ereignis:${id}:${d.n}:${Spiel.st.naechsteIid}`), wunsch: {form: ctx.form || null, kunde: ctx.kunde || null, stufe: ctx.stufe || null}};
  if (!E.bedingung(c)) return null;
  const r = E.ausloesen(c);
  if (!r) return null;
  d.n++; d.letzteMs = d.aktivMs;
  d.liste.push({t: jetzt(), id, kunde: (inst && inst.kunde) || null, text: r.text});
  if (d.liste.length > 50) d.liste.splice(0, d.liste.length - 50);
  Spiel.speichern();
  return Object.assign({id, titel: E.titel, sym: E.sym}, r);
};
/* Takt: ist ein Ereignis fällig, wählt der Zähler eines der passenden (gewichtet) */
Spiel.ereignisse.tick = function({inst} = {}){
  if (Spiel.ersteStunde && Spiel.ersteStunde.ruhig()) return null;        /* erste Stunde: das erste Ereignis ist ein harmloses */
  if (!Spiel.ereignisse.faellig()) return null;
  /* Sperre je Quelle: Prüfung, Tagesrätsel, TRAINING und KLASSENRAUM bleiben still – die beiden letzten
     zahlen laut Architektur § 13.3 Punkt 1 kein Geld und keinen Ruf, `weiterempfehlung` (Zeile 87) und
     „Provider anrufen" (Zeile 145) würden genau das tun (gemessen: 8 × +1 Ruf in 40 Takten) und dabei
     noch Karriere-Tickets anlegen. Der Einstiegsauftrag bleibt aus einem eigenen Grund still. */
  if (inst && (inst.quelle === "pruefung" || inst.quelle === "raetsel" || inst.quelle === "training" || inst.quelle === "klassenraum" || Spiel.defVon(inst).id === Spiel.EINSTIEG_TICKET)) return null;
  const d = Spiel.ereignisse.daten(), def = inst ? Spiel.defVon(inst) : null;
  const z = Zufall(`ereignis-wahl:${d.n}:${Spiel.st.erledigt.length}`);
  const passend = Object.entries(Spiel.EREIGNISSE).filter(([, E]) => { try { return E.bedingung({inst, def, z}); } catch (e) { return false; } });
  if (!passend.length) return null;
  const summe = passend.reduce((s, [, E]) => s + E.gewicht, 0);
  let r = (z.zahl(1000000) / 1000000) * summe, wahl = passend[passend.length - 1][0];
  for (const [id, E] of passend) { r -= E.gewicht; if (r < 0) { wahl = id; break; } }
  return Spiel.ereignisse.ausloesen(wahl, {inst});
};
/* Provider-Störung beenden („Provider anrufen“) – das Internet kommt zurück, +1 Ruf fürs Erkennen */
Spiel.ereignisse.providerAnrufen = function(inst){
  if (!inst || !inst.providerStoerung) return false;
  const id = inst.providerStoerung;
  Spiel.aendern(inst, "Provider: Störung behoben", n => Modell.geraetSetzen(n, id, "an", true));
  delete inst.providerStoerung;
  Spiel.gutschreiben(0, 1, "Provider-Störung erkannt und gemeldet");
  Spiel.speichern();
  return true;
};
