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
