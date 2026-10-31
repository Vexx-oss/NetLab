"use strict";
/* ---------- Verdacht: erst die Hypothese, dann der Eingriff (Design – Spielspaß 2.0, Hebel 2; Architektur § 9.4) ----------
   Der Spieler wählt Schicht → Ursache (vier Fehlerarten: eine richtig, drei glaubwürdig falsch – aus derselben Gruppe
   oder benachbarten Schichten und passend zum Netztyp) → Gerät. Bewertet wird erst beim Abschluss:
     voll    = richtige Ursache am richtigen Gerät     (vor dem ersten Eingriff: +10 % Lohn, zählt für „Spürnase“)
     ursache = richtige Ursache, anderes Gerät · schicht = nur die Schicht stimmt · null = daneben (nie eine Strafe)
   Die Nachbesprechung erklärt den Unterschied. Stufenregeln: Einstieg freiwillig, AP1 ohne Verdacht −½ ★, AP2 −1 ★
   (Spiel.regeln(inst).verdachtAbzug). Projekte (ohne Fehlerart) und die Prüfung kennen keinen Verdacht. */
Spiel.verdacht = {};
Spiel.VERDACHT = {BONUS: 0.1, SCHICHTEN: [[1, "Bitübertragung", "Kabel, Port, Strom"], [2, "Sicherung", "Switch, VLAN, MAC"],
  [3, "Vermittlung", "IP, Maske, Gateway, Routen, NAT"], [4, "Transport", "Ports, TCP/UDP, Filter"], [7, "Anwendung", "DNS, DHCP, Dienste"]]};

Spiel.verdacht.schichtVon = function(inj){
  const code = (inj.gruende || []).find(c => c !== "OFFEN");
  const s = code && typeof Sim !== "undefined" && Sim.GRUENDE[code] ? Sim.GRUENDE[code].schicht : 3;
  return [1, 2, 3, 4, 7].includes(s) ? s : s >= 5 ? 7 : 3;
};
Spiel.verdacht.noetig = function(inst){
  const def = Spiel.defVon(inst);
  return !!def && inst.quelle !== "pruefung" && (def.injektoren || []).some(n => Spiel.INJEKTOREN[n]);
};
/* Was richtig ist: Fehlerarten des Auftrags, ihre Schichten, die Geräte, die vom Soll abweichen */
Spiel.verdacht.richtig = function(inst){
  if (!Spiel.verdacht.noetig(inst)) return null;
  const def = Spiel.defVon(inst);
  const inj = def.injektoren.map(n => Spiel.INJEKTOREN[n]).filter(Boolean);
  const lz = Spiel.laufzeit(inst);
  if (!lz.verdachtGeraete) lz.verdachtGeraete = Spiel.plan.geraeteAus(Spiel.plan.diff(Spiel.plan.sollNetz(inst), Spiel.startNetzVon(inst)));
  return {ursachen: inj.map(i => i.name), schichten: [...new Set(inj.map(Spiel.verdacht.schichtVon))], geraete: lz.verdachtGeraete};
};
Spiel.verdacht.optionen = function(inst){
  const r = Spiel.verdacht.richtig(inst); if (!r) return null;
  const def = Spiel.defVon(inst), haupt = Spiel.INJEKTOREN[r.ursachen[0]];
  const gruppe = Spiel.dex.gruppeVon(haupt).id, schicht = Spiel.verdacht.schichtVon(haupt);
  const z = Zufall(`verdacht:${def.id}:${inst.seed}`);
  const titel = new Set(r.ursachen.map(n => Spiel.INJEKTOREN[n].titel));
  const kandidaten = Object.values(Spiel.INJEKTOREN)
    .filter(i => !r.ursachen.includes(i.name) && !titel.has(i.titel) && (!def.vorlage || i.vorlagen.includes(def.vorlage)))
    .map(i => ({i, wert: (Spiel.dex.gruppeVon(i).id === gruppe ? 0 : 1) + Math.abs(Spiel.verdacht.schichtVon(i) - schicht) * 0.4 + z.kommazahl() * 0.9}))
    .sort((a, b) => a.wert - b.wert);
  const falsch = [];
  for (const k of kandidaten) { if (falsch.length >= 3) break; if (!falsch.some(f => f.titel === k.i.titel)) falsch.push(k.i); }
  const netz = inst.netz;
  return {
    schichten: Spiel.VERDACHT.SCHICHTEN.map(([n, name, text]) => ({n, name, text})),
    ursachen: z.mischen([haupt, ...falsch]).map(i => ({id: i.name, titel: i.titel, schicht: Spiel.verdacht.schichtVon(i)})),
    geraete: Object.values(netz.geraete).filter(g => g.typ !== "internet").map(g => ({id: g.id, name: g.name})).sort((a, b) => a.name.localeCompare(b.name, "de")),
  };
};
/* vor dem ersten Eingriff? (Verschieben, Aufräumen und Zurücksetzen zählen nicht) */
Spiel.verdacht.eingegriffen = inst => (Spiel.verlaufVon(inst).liste || []).some(t => !/verschoben|zurückgesetzt|Aufgeräumt/.test(t));
Spiel.verdacht.setzen = function(inst, {schicht, ursache, geraet}){
  if (!Spiel.verdacht.noetig(inst)) return null;
  inst.verdacht = {schicht: +schicht || null, ursache: ursache || null, geraet: geraet || null, t: jetzt(), vorEingriff: !Spiel.verdacht.eingegriffen(inst), treffer: null};
  Spiel.speichern();
  Spiel.melden("verdacht", {inst});
  return inst.verdacht;
};

/* Beim Abschluss: Treffer und ein Erklärsatz für die Nachbesprechung */
Spiel.verdacht.bewerten = function(inst){
  const r = Spiel.verdacht.richtig(inst); if (!r) return null;
  const netz = inst.netz, name = id => (netz.geraete[id] && netz.geraete[id].name) || id;
  const inj = Spiel.INJEKTOREN[r.ursachen[0]];
  const geraete = r.geraete.filter(id => netz.geraete[id] && netz.geraete[id].typ !== "internet").map(name);
  const ort = geraete.length ? ` an ${geraete.slice(0, 2).join(" und ")}` : "";
  const erkennen = Spiel.dex.erkennen(inj)[0] || "–";
  const richtig = {ursache: {id: inj.name, titel: inj.titel}, schicht: r.schichten[0], geraete};
  const v = inst.verdacht;
  if (!v) return {treffer: null, gesetzt: false, richtig, text: `Ohne Verdacht abgeschlossen. Es war: ${inj.titel}${ort} (Schicht ${r.schichten[0]}).`};
  const ursacheOk = r.ursachen.includes(v.ursache), geraetOk = r.geraete.includes(v.geraet), schichtOk = r.schichten.includes(v.schicht);
  const treffer = ursacheOk && geraetOk ? "voll" : ursacheOk ? "ursache" : schichtOk ? "schicht" : null;
  v.treffer = treffer;
  const vTitel = v.ursache && Spiel.INJEKTOREN[v.ursache] ? Spiel.INJEKTOREN[v.ursache].titel : "–";
  const text = treffer === "voll" ? `Volltreffer: ${inj.titel}${ort} – genau das war es.`
    : treffer === "ursache" ? `Ursache richtig (${inj.titel}), aber das Gerät war ein anderes: ${geraete.join(", ") || "–"}.`
    : treffer === "schicht" ? `Schicht ${v.schicht} stimmte. Die Ursache war aber: ${inj.titel}${ort}. Woran man es erkennt: ${erkennen}.`
    : `Du hattest Schicht ${v.schicht || "?"} vermutet (${vTitel}). Tatsächlich: ${inj.titel}${ort} (Schicht ${r.schichten[0]}). Woran man es erkennt: ${erkennen}.`;
  return {treffer, gesetzt: true, vorEingriff: !!v.vorEingriff, richtig, text};
};

/* ---------- Einsatzakte (Runde 4, Strang A): Anzeigehilfen für das Dossier ----------
   Additiv: die Bewertung oben bleibt unverändert. Gelesen werden ausschließlich echte
   Vorgangsdaten – Beweiskarten (Spiel.akte.liste), die Hypothese, die Änderungen im Netz
   (Spiel.geaenderteGeraete) und die Notiz (inst.notiz). Nichts wird geraten. */

/* Schichtentreppe: je Schicht die Zahl der stützenden Beweise. Karten ohne Schicht
   (z. B. eine Kundenaussage am Telefon) zählen als „ohne“ – die Summe ist immer die Kartenzahl. */
Spiel.akte.schichten = function(inst){
  const karten = Spiel.akte.liste(inst);
  const bekannt = new Set(Spiel.VERDACHT.SCHICHTEN.map(s => s[0]));
  const schichten = Spiel.VERDACHT.SCHICHTEN.map(s => ({n: s[0], name: s[1], text: s[2],
    zahl: karten.filter(k => k.schicht === s[0]).length}));
  return {schichten, ohne: karten.filter(k => !bekannt.has(k.schicht)).length, gesamt: karten.length};
};

/* Fundort einer Beweiskarte für den zentralen Resolver (Strang C, UI.fehlerziel.springen):
   Kabelkarte → die zwei Kabelenden; Ping/Diagnose → das genannte Gerät; Kundenaussage → kein Ziel.
   Es wird nie ein Gerät erfunden: was nicht im Netz der Instanz steht, ergibt null. */
Spiel.akte.fundort = function(inst, karte){
  const netz = inst && inst.netz;
  if (!karte || !netz) return null;
  const teil = wert => {
    const teile = String(wert || "").split(":");
    const geraet = teile[0], port = teile[1] || null;
    return geraet && netz.geraete[geraet] ? {geraet, port} : null;
  };
  if (karte.art === "kabel") {
    const a = teil(karte.von), b = teil(karte.nach);
    if (a && b) return {art: "kabel", kabel: {a, b}};
    const g = a || b;
    return g ? {art: "port", geraet: g.geraet, port: g.port} : null;
  }
  if (karte.art === "ping") {
    /* Das Ziel, das nicht antwortet, ist der Fundort; sonst die messende Seite. */
    const ziel = netz.geraete[karte.nach] ? karte.nach : netz.geraete[karte.von] ? karte.von : null;
    return ziel ? {art: "geraet", geraet: ziel} : null;
  }
  const g = teil(karte.von);          /* Terminalbefehl: von = Gerät; Hotline: von = Kunde ohne Gerät */
  return g ? {art: "geraet", geraet: g.geraet} : null;
};

/* Didaktische Leiter: sechs Sprossen, jede aus einem echten Merkmal der Instanz. */
Spiel.akte.FORTSCHRITT = [
  {id: "beobachten", titel: "Beobachten", satz: "Auftrag gelesen und den Betrieb angesehen"},
  {id: "messen", titel: "Messen", satz: "Eine echte Messung liegt als Beweis vor"},
  {id: "eingrenzen", titel: "Eingrenzen", satz: "Eine Messung schlug fehl und grenzt den Fehler ein"},
  {id: "hypothese", titel: "Hypothese", satz: "Verdacht aus Schicht, Ursache und Gerät festgehalten"},
  {id: "handeln", titel: "Handeln", satz: "Im Labor wurde etwas geändert"},
  {id: "dokumentieren", titel: "Dokumentieren", satz: "Einsatzbericht kopiert oder Notiz geschrieben"},
];
Spiel.akte.fortschritt = function(inst, {kopiert = false} = {}){
  const karten = Spiel.akte.liste(inst);
  const geaendert = typeof Spiel.geaenderteGeraete === "function" ? Spiel.geaenderteGeraete(inst) : [];
  const werte = {
    beobachten: !!inst.gelesen,
    messen: karten.length > 0,
    eingrenzen: karten.some(k => k.ok === false),
    hypothese: !!inst.verdacht,
    handeln: geaendert.length > 0,
    dokumentieren: !!String(inst.notiz || "").trim() || !!kopiert,
  };
  const offen = Spiel.akte.FORTSCHRITT.find(s => !werte[s.id]);
  return Spiel.akte.FORTSCHRITT.map(s => ({id: s.id, titel: s.titel, satz: s.satz,
    erledigt: !!werte[s.id], naechster: !!offen && offen.id === s.id}));
};

/* Einsatzbericht zum Kopieren: nur, was der Spieler selbst sieht oder angelegt hat.
   Kein innerer Grund, keine richtige Schicht und keine Lösung – auch im Einstieg nicht,
   denn der Bericht wird weitergegeben. Die Zeile „Ergebnis der Hypothese“ erscheint nur,
   wenn die Bewertung bereits feststeht (inst.verdacht.treffer, gesetzt von Spiel.verdacht.bewerten). */
Spiel.akte.bericht = function(inst){
  const def = Spiel.defVon(inst);
  if (!def) return "";
  const niveau = Spiel.niveauVon(inst);
  const kunde = Spiel.kundenDaten(inst.kunde || def.kunde);
  const karten = Spiel.akte.liste(inst).slice().sort((a, b) => (a.t || 0) - (b.t || 0));
  const name = id => (inst.netz.geraete[id] && inst.netz.geraete[id].name) || id;
  const zz = n => (n < 10 ? "0" : "") + n;
  const uhr = ms => {
    const n = Number(ms);
    if (!Number.isFinite(n)) return "–";
    const d = new Date(n);
    return zz(d.getHours()) + ":" + zz(d.getMinutes());
  };
  const treffer = {voll: "Volltreffer", ursache: "Ursache stimmt", schicht: "Schicht stimmt"};
  const zeilen = ["Einsatzakte · " + kunde.name,
    "Vorgang: " + (inst.ticketId || "–") + " · Niveau: " + (Spiel.NIVEAU_NAME[niveau] || niveau) + " · Beginn: " + uhr(inst.start),
    "Auftrag: " + (def.titel || "–"), ""];
  zeilen.push(karten.length ? "Beweise (" + karten.length + "):" : "Beweise: noch keine Messung erfasst.");
  for (const k of karten) zeilen.push("- " + uhr(k.t) + " " + (k.titel || k.art) + (k.anzahl > 1 ? " (" + k.anzahl + "×)" : "") + " · " + k.befund);
  zeilen.push("");
  const v = inst.verdacht;
  if (v) {
    const o = Spiel.verdacht.optionen(inst);
    const uz = o && o.ursachen.find(x => x.id === v.ursache), gz = o && o.geraete.find(x => x.id === v.geraet);
    zeilen.push("Deine Hypothese: Schicht " + (v.schicht || "–") + " · " + (uz ? uz.titel : "–") + " · " + (gz ? gz.name : "–") + " (" + (v.vorEingriff ? "vor" : "nach") + " dem ersten Eingriff festgehalten)");
  } else zeilen.push("Deine Hypothese: noch keine festgehalten.");
  if (v && typeof v.treffer === "string" && treffer[v.treffer]) zeilen.push("Ergebnis der Hypothese: " + treffer[v.treffer]);
  const geaendert = typeof Spiel.geaenderteGeraete === "function" ? Spiel.geaenderteGeraete(inst) : [];
  zeilen.push("Geänderte Geräte: " + (geaendert.length ? geaendert.map(name).join(", ") : "noch keine"));
  if (String(inst.notiz || "").trim()) zeilen.push("Notiz: " + String(inst.notiz).trim());
  return zeilen.join("\n");
};
