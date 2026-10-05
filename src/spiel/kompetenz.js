"use strict";
/* ---------- Kompetenzkarte (Design – Spielspaß 2.0, Hebel 11a; Architektur § 9.7) ----------
   Die 27 Fertigkeiten als Landkarte in sechs Regionen. Zustand je Feld:
     nebel   weder geübt noch freigeschaltet (Karriere-Stufe) noch neben einem schon geübten Feld – man sieht nur „?“
     offen   sichtbar, noch nie geübt
     danach  die Stufe des Lernmotors: angefangen · gesehen · geübt · sicher · gemeistert · gemeistert ★ (Box 0–5)
   Nachbarn: innerhalb einer Region die Reihe, dazu fachliche Brücken zwischen Regionen (KOMPETENZ_BRUECKEN). */
Spiel.KOMPETENZ_REGIONEN = [
  {id: "adressierung", titel: "Adressierung", sym: "🔢", skills: ["lab.ip", "lab.netz", "lab.subnetz", "lab.gateway", "lab.arp"]},
  {id: "switching", titel: "Switching & VLAN", sym: "🔀", skills: ["lab.link", "lab.switch", "lab.vlan", "lab.trunk", "lab.stp"]},
  {id: "routing", titel: "Routing", sym: "🧭", skills: ["lab.route", "lab.ttl", "lab.rostick", "lab.nat", "lab.portfwd"]},
  {id: "dienste", titel: "Dienste", sym: "🛎", skills: ["lab.ping", "lab.dhcp", "lab.dns", "lab.ports", "lab.tcp"]},
  {id: "sicherheit", titel: "Sicherheit", sym: "🛡", skills: ["lab.acl", "lab.fw", "lab.dmz", "lab.portsec"]},
  {id: "betrieb", titel: "Betrieb & Storage", sym: "🗄", skills: ["lab.cli", "lab.speichern", "lab.storage"]},
];
Spiel.KOMPETENZ_BRUECKEN = [
  ["lab.ip", "lab.dhcp"], ["lab.gateway", "lab.route"], ["lab.arp", "lab.switch"], ["lab.link", "lab.ping"], ["lab.netz", "lab.vlan"],
  ["lab.trunk", "lab.rostick"], ["lab.nat", "lab.fw"], ["lab.portfwd", "lab.dmz"], ["lab.ports", "lab.acl"], ["lab.switch", "lab.portsec"],
  ["lab.switch", "lab.cli"], ["lab.ports", "lab.storage"], ["lab.ttl", "lab.ping"],
];
Spiel.KOMPETENZ_STUFEN = ["angefangen", "gesehen", "geübt", "sicher", "gemeistert", "gemeistert ★"];
Spiel.kompetenz = {};
Spiel.kompetenz.nachbarn = (() => {
  let cache = null;
  return id => {
    if (!cache) {
      cache = {};
      const add = (a, b) => { (cache[a] ||= new Set()).add(b); (cache[b] ||= new Set()).add(a); };
      for (const r of Spiel.KOMPETENZ_REGIONEN) r.skills.forEach((s, i) => { if (i) add(s, r.skills[i - 1]); });
      for (const [a, b] of Spiel.KOMPETENZ_BRUECKEN) add(a, b);
    }
    return [...(cache[id] || [])].sort();
  };
})();
/* lm = {versucht(id), box(id)} – im Spiel der Lernmotor L, im Test ein Ersatz */
Spiel.kompetenz.karte = function(lm, stufe = Spiel.st ? Spiel.st.stufe : 1){
  lm = lm || (typeof L !== "undefined" ? {versucht: id => L.versucht(id), box: id => L.box(id)} : {versucht: () => false, box: () => 0});
  const skill = id => (DATEN.skills || []).find(s => s.id === id) || {id, name: id, stufe: 1};
  const geuebt = id => !!lm.versucht(id);
  let sichtbar = 0;
  const regionen = Spiel.KOMPETENZ_REGIONEN.map(r => ({id: r.id, titel: r.titel, sym: r.sym, felder: r.skills.map(id => {
    const s = skill(id), nachbarn = Spiel.kompetenz.nachbarn(id), box = geuebt(id) ? Math.max(0, Math.min(5, lm.box(id) || 0)) : 0;
    const zustand = geuebt(id) ? Spiel.KOMPETENZ_STUFEN[box] : ((s.stufe || 1) <= stufe || nachbarn.some(geuebt)) ? "offen" : "nebel";
    if (zustand !== "nebel") sichtbar++;
    return {id, name: s.name, stufe: s.stufe || 1, ap: s.ap, zustand, box, nachbarn};
  })}));
  const gesamt = regionen.reduce((n, r) => n + r.felder.length, 0);
  return {regionen, gesamt, sichtbar, nebel: gesamt - sichtbar};
};
