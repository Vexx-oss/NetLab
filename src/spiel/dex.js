"use strict";
/* ---------- Fehlerdex: Fehlerarten als Sammlung (Design – Spielspaß 2.0, Hebel 3; Architektur § 9.3) ----------
   Jede Fehlerart (Spiel.INJEKTOREN) ist ein Eintrag: unbekannt → gesehen (Auftrag damit bestanden) → verstanden
   (bestanden ohne bezahlte Hilfe, Hilfestufe < 4 – dieselbe Grenze wie im Lernmotor). Erfasst wird erst beim
   Abschluss: Ein offener Auftrag verrät seine Ursache nie über den Dex (R1 „Erkenntnis vor Belohnung“).
   Neue Fehlerarten (Phase D) erscheinen automatisch; die Gruppe ergibt sich aus der Hauptfertigkeit. */
Spiel.dex = {};
Spiel.DEX_HILFE_GRENZE = 4;

Spiel.DEX_GRUPPEN = [
  {id: "schicht1", titel: "Kabel und Ports",      ehrentitel: "Schicht-1-Profi", skills: ["lab.link", "lab.portsec"]},
  {id: "adressen", titel: "Adressen am Rechner",  ehrentitel: "Adress-Detektiv", skills: ["lab.ip", "lab.netz", "lab.gateway", "lab.arp", "lab.subnetz"]},
  {id: "dienste",  titel: "DNS, DHCP und Dienste", ehrentitel: "Dienst-Doktor",  skills: ["lab.dns", "lab.dhcp", "lab.ports", "lab.tcp"]},
  {id: "vlan",     titel: "VLAN und Trunk",       ehrentitel: "VLAN-Lotse",      skills: ["lab.vlan", "lab.trunk", "lab.rostick", "lab.switch"]},
  {id: "routing",  titel: "Routing",              ehrentitel: "Routen-Planer",   skills: ["lab.route", "lab.ttl"]},
  {id: "nat",      titel: "NAT und Weiterleitung", ehrentitel: "Übersetzer",     skills: ["lab.nat", "lab.portfwd"]},
  {id: "filter",   titel: "ACL und Firewall",     ehrentitel: "Türsteher",       skills: ["lab.acl", "lab.fw", "lab.dmz"]},
  {id: "betrieb",  titel: "Betrieb",              ehrentitel: "Sorgfältige Hand", skills: ["lab.speichern", "lab.cli", "lab.stp", "lab.storage"]},
];

/* Symptom aus Kundensicht – so klingt der Fehler am Telefon (kein Fachbegriff, keine Ursache) */
Spiel.DEX_SYMPTOM = {
  "kabel-fehlt":        "„Ein Gerät ist komplett offline – nicht mal der Drucker nebenan geht.“",
  "switchport-aus":     "„Das Kabel steckt, aber das Lämpchen am Switch bleibt dunkel.“",
  "routerport-aus":     "„Untereinander geht alles, aber niemand kommt mehr ins Internet.“",
  "ip-tippfehler":      "„Seit jemand ‚nur kurz‘ was eingestellt hat, findet der Rechner niemanden.“",
  "maske-falsch":       "„Manche Kollegen erreicht er, andere nicht – und Internet geht auch nicht.“",
  "gateway-falsch":     "„Drucken im Haus geht, Internet nicht.“",
  "gateway-fehlt":      "„Im Büro geht alles, nach draußen nichts – nur bei diesem einen Rechner.“",
  "doppelte-ip":        "„Mal geht es, mal nicht – und Windows meckert über einen Adresskonflikt.“",
  "drucker-umgezogen":  "„Der Drucker ist an und hat Papier, aber niemand kann mehr drucken.“",
  "dns-fehlt":          "„Webseiten laden nicht – aber der Techniker sagt, die Leitung steht.“",
  "dns-eintrag-fehlt":  "„Das Intranet geht nur noch über die Zahlenadresse, nicht über den Namen.“",
  "dienst-aus":         "„Der Server ist an und antwortet, aber die Anwendung startet nicht.“",
  "dhcp-aus":           "„Neu gestartete Rechner haben plötzlich eine komische 169er-Adresse.“",
  "helper-fehlt":       "„Im Server-Raum klappt alles, in der anderen Abteilung bekommt keiner eine Adresse.“",
  "vlan-falsch":        "„Der neue Platz sieht die falschen Kollegen und kommt nicht ins Internet.“",
  "vlan-fehlt":         "„Eine ganze Abteilung ist offline, obwohl alle Kabel stecken.“",
  "trunk-vlan-fehlt":   "„Hinter dem zweiten Switch ist eine Abteilung abgeschnitten.“",
  "trunk-access":       "„Seit dem Umbau kommt nur noch eine Abteilung ins Netz.“",
  "subif-vlan-falsch":  "„Eine Abteilung kommt weder zu den anderen noch ins Internet.“",
  "acl-reihenfolge":    "„Die Sperre für die Gäste ist eingerichtet – und wirkt trotzdem nicht.“",
  "acl-richtung":       "„Wir haben eine Sperre gesetzt, aber die Gäste kommen weiter überall hin.“",
  "acl-zu-streng":      "„Seit der neuen Sperre geht auch das nicht mehr, was gehen soll.“",
  "default-fehlt":      "„Intern läuft alles, aber kein einziger Rechner kommt ins Internet.“",
  "route-fehlt":        "„Der andere Standort ist nicht erreichbar, das Internet schon.“",
  "rueckroute-fehlt":   "„Vom anderen Standort kommt einfach keine Antwort – keine Fehlermeldung, nichts.“",
  "schleife":           "„Seit dem Router-Umbau hängt die Verbindung zum anderen Standort.“",
  "nat-vertauscht":     "„Seit der Router neu eingestellt wurde, kommt niemand mehr ins Internet.“",
  "nat-fehlt":          "„Kein Rechner kommt ins Internet – der Router selbst aber schon.“",
  "nat-acl-falsch":     "„Ein Standort hat Internet, der andere nicht.“",
  "gespeichert-kaputt": "„Nach dem Stromausfall ist ein Problem wieder da, das schon behoben war.“",
  "fw-regel-fehlt":     "„Ein Dienst ist von innen nicht erreichbar, obwohl der Server läuft.“",
  "fw-reihenfolge":     "„Eine Freigabe ist eingerichtet – und wird trotzdem gesperrt.“",
  "portfwd-falsch":     "„Der Webshop ist von außen nicht erreichbar, intern schon.“",
  "dmz-regel-fehlt":    "„Von außen erreicht niemand unseren Webserver.“",
};

Spiel.dex.daten = function(){
  const st = Spiel.st;
  if (!st.dex || typeof st.dex !== "object" || Array.isArray(st.dex)) st.dex = {};
  return st.dex;
};
Spiel.dex.gruppeVon = function(inj){
  const skill = (inj && inj.skills || [])[0];
  return Spiel.DEX_GRUPPEN.find(g => g.skills.includes(skill)) || {id: "weitere", titel: "Weitere", ehrentitel: "Allrounder", skills: []};
};
/* Ab welcher Karriere-Stufe taucht die Fehlerart auf? (Stufe der Hauptfertigkeit) */
Spiel.dex.ab = inj => Math.max(1, ...(inj.skills || []).slice(0, 1).map(s => Spiel.skill(s).stufe || 1));
Spiel.dex.erkennen = function(inj){
  return (inj.gruende || []).slice(0, 3).map(c => c === "OFFEN" ? "Etwas ist erreichbar, das gesperrt sein soll" : Spiel.grundTitel ? Spiel.grundTitel(c) : c);
};

Spiel.dex.liste = function(){
  const d = Spiel.dex.daten();
  return Object.values(Spiel.INJEKTOREN).map(inj => {
    const e = d[inj.name] || {};
    return {id: inj.name, titel: inj.titel, gruppe: Spiel.dex.gruppeVon(inj).id,
      zustand: e.verstanden ? "verstanden" : e.gesehen ? "gesehen" : "unbekannt",
      ab: Spiel.dex.ab(inj), symptom: Spiel.DEX_SYMPTOM[inj.name] || "", erkennen: Spiel.dex.erkennen(inj),
      erklaerung: inj.erklaerung || "", quelle: inj.quelle || "", gesehen: e.gesehen || null, verstanden: e.verstanden || null};
  });
};
Spiel.dex.gruppen = function(){
  const liste = Spiel.dex.liste();
  const gruppen = [...Spiel.DEX_GRUPPEN, {id: "weitere", titel: "Weitere", ehrentitel: "Allrounder", skills: []}];
  return gruppen.map(g => {
    const eintraege = liste.filter(e => e.gruppe === g.id);
    const verstanden = eintraege.filter(e => e.zustand === "verstanden").length;
    return {id: g.id, titel: g.titel, ehrentitel: g.ehrentitel, ids: eintraege.map(e => e.id), eintraege,
      verstanden, gesehen: eintraege.filter(e => e.zustand !== "unbekannt").length, gesamt: eintraege.length,
      fertig: eintraege.length > 0 && verstanden === eintraege.length};
  }).filter(g => g.gesamt > 0);
};
Spiel.dex.zaehlen = function(){
  const l = Spiel.dex.liste();
  return {gesamt: l.length, gesehen: l.filter(e => e.zustand !== "unbekannt").length, verstanden: l.filter(e => e.zustand === "verstanden").length};
};
Spiel.dex.titel = () => Spiel.dex.gruppen().filter(g => g.fertig).map(g => g.ehrentitel);

/* Nach einer bestandenen Abnahme: Fehlerarten des Auftrags eintragen → was ist neu? */
Spiel.dex.erfassen = function(inst, def){
  const d = Spiel.dex.daten(), neu = [], tag = heute();
  const titelVorher = new Set(Spiel.dex.titel());
  const ohneHilfe = (inst.hilfeStufe || 0) < Spiel.DEX_HILFE_GRENZE;
  for (const name of new Set((def && def.injektoren) || [])) {
    const inj = Spiel.INJEKTOREN[name]; if (!inj) continue;
    const e = d[name] ||= {gesehen: null, verstanden: null};
    if (!e.gesehen) { e.gesehen = tag; if (!ohneHilfe) neu.push({id: name, titel: inj.titel, zustand: "gesehen"}); }
    if (ohneHilfe && !e.verstanden) { e.verstanden = tag; neu.push({id: name, titel: inj.titel, zustand: "verstanden"}); }
  }
  const titel = Spiel.dex.titel().filter(t => !titelVorher.has(t));
  return {neu, titel};
};
