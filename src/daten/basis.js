"use strict";
/* ---------- Daten-Namensraum und Beispielnetze ----------
   DATEN.tickets    Ticket-Definitionen (daten/tickets-*.js)
   DATEN.kunden     Kunden der Karriere (daten/kunden.js)
   DATEN.lehrtexte  Grundcode → {E, AP1, AP2, quelle} (daten/lehrtexte.js)
   DATEN.mini       Mini-Tickets für die Leiste (daten/mini.js)
   DATEN.wiki       Nachschlage-Seiten (daten/wiki.js)
   DATEN.beispiele  Referenznetze für Tests und Entwicklung (hier) */
const DATEN = {tickets: [], kunden: {}, lehrtexte: {}, mini: [], wiki: {}, beispiele: {}};

/* Fertigkeiten des Labors (Lernmotor-Einheiten, Thema „Netzwerk“). stufe = Karriere-Stufe, ab der sie vorkommen.
   Verbindlich: Gründe (Sim.GRUENDE), Tickets, Mini-Tickets, Wiki und Lehrtexte verwenden genau diese IDs. */
DATEN.skills = [
  {id: "lab.link",     name: "Link und Kabel prüfen",              ap: "AP1", stufe: 1},
  {id: "lab.ip",       name: "IP-Adresse und Maske setzen",        ap: "AP1", stufe: 1},
  {id: "lab.netz",     name: "Gleiches Netz? (Maske anwenden)",    ap: "AP1", stufe: 1},
  {id: "lab.gateway",  name: "Standardgateway",                    ap: "AP1", stufe: 1},
  {id: "lab.arp",      name: "ARP: IP zu MAC auflösen",            ap: "AP1", stufe: 1},
  {id: "lab.ping",     name: "Ping und Fehlermeldungen lesen",     ap: "AP1", stufe: 1},
  {id: "lab.switch",   name: "Switch: MAC-Tabelle und Fluten",     ap: "AP1", stufe: 1},
  {id: "lab.subnetz",  name: "Adressplan und Subnetting",          ap: "AP1", stufe: 2},
  {id: "lab.dhcp",     name: "DHCP (DORA, Pool, Relay)",           ap: "AP1", stufe: 2},
  {id: "lab.dns",      name: "DNS-Namensauflösung",                ap: "AP1", stufe: 2},
  {id: "lab.ports",    name: "Ports und Dienste (TCP/UDP)",        ap: "AP1", stufe: 2},
  {id: "lab.tcp",      name: "TCP-Handshake",                      ap: "AP2", stufe: 2},
  {id: "lab.cli",      name: "IOS-Konsole: Modi und Grundbefehle", ap: "AP2", stufe: 2},
  {id: "lab.speichern",name: "running- und startup-config",        ap: "AP2", stufe: 2},
  {id: "lab.vlan",     name: "VLANs und Access-Ports",             ap: "AP1", stufe: 3},
  {id: "lab.trunk",    name: "Trunk und 802.1Q",                   ap: "AP2", stufe: 3},
  {id: "lab.rostick",  name: "Router-on-a-Stick",                  ap: "AP2", stufe: 3},
  {id: "lab.acl",      name: "Access-Listen (ACL)",                ap: "AP2", stufe: 3},
  {id: "lab.route",    name: "Statische Routen und Default-Route", ap: "AP1", stufe: 4},
  {id: "lab.ttl",      name: "TTL und Traceroute",                 ap: "AP2", stufe: 4},
  {id: "lab.nat",      name: "NAT und PAT",                        ap: "AP1", stufe: 4},
  {id: "lab.portfwd",  name: "Port-Weiterleitung",                 ap: "AP2", stufe: 4},
  {id: "lab.fw",       name: "Firewall-Regeln und Zonen",          ap: "AP2", stufe: 5},
  {id: "lab.dmz",      name: "DMZ",                                ap: "AP2", stufe: 5},
  {id: "lab.portsec",  name: "Port-Security",                      ap: "AP2", stufe: 5},
  {id: "lab.stp",      name: "Schleifen und Spanning Tree",        ap: "AP2", stufe: 6},
  {id: "lab.storage",  name: "NAS, SAN und Speichernetze",         ap: "AP2", stufe: 6},
];

/* Salon: ein LAN, ein Router mit NAT ins Internet. Alles funktioniert. */
DATEN.beispiele.salon = function(){
  const n = Modell.neu();
  Modell.geraet(n, "internet", {id: "inet", x: 760, y: 120});
  Modell.geraet(n, "router", {id: "r1", name: "R1", x: 560, y: 120});
  Modell.geraet(n, "switch", {id: "sw1", name: "SW1", x: 360, y: 260});
  Modell.geraet(n, "pc", {id: "kasse", name: "PC-Kasse", skin: "kasse", x: 180, y: 380});
  Modell.geraet(n, "pc", {id: "buero", name: "PC-Buero", x: 360, y: 420});
  Modell.geraet(n, "pc", {id: "drucker", name: "Drucker", skin: "drucker", x: 540, y: 380});
  Modell.verbinden(n, {geraet: "kasse"}, {geraet: "sw1", port: "Fa0/1"});
  Modell.verbinden(n, {geraet: "buero"}, {geraet: "sw1", port: "Fa0/2"});
  Modell.verbinden(n, {geraet: "drucker"}, {geraet: "sw1", port: "Fa0/3"});
  Modell.verbinden(n, {geraet: "sw1", port: "Gi0/1"}, {geraet: "r1", port: "Gi0/0"});
  Modell.verbinden(n, {geraet: "r1", port: "Gi0/1"}, {geraet: "inet", port: "wan0"});
  const host = (id, ip) => { for (const [f, w] of Object.entries({ip, maske: "255.255.255.0", gw: "192.168.1.1", dns: "198.51.100.53"})) Modell.setzen(n, id, "if.eth0." + f, w); };
  host("kasse", "192.168.1.10"); host("buero", "192.168.1.11"); host("drucker", "192.168.1.20");
  Modell.setzen(n, "drucker", "dienste.druck", {an: true});
  const r = (p, w) => Modell.setzen(n, "r1", p, w);
  r("if.Gi0/0.ip", "192.168.1.1"); r("if.Gi0/0.maske", "255.255.255.0"); r("if.Gi0/0.shutdown", false); r("if.Gi0/0.nat", "inside");
  r("if.Gi0/1.ip", "203.0.113.2"); r("if.Gi0/1.maske", "255.255.255.252"); r("if.Gi0/1.shutdown", false); r("if.Gi0/1.nat", "outside");
  r("routen", [{netz: "0.0.0.0", maske: "0.0.0.0", nh: "203.0.113.1", aus: null, ad: 1}]);
  r("acls", {"1": {typ: "standard", benannt: false, regeln: [{aktion: "permit", proto: "ip", quelle: {ip: "192.168.1.0", wc: "0.0.0.255"}, ziel: null, zielPort: null, quellPort: null, icmpTyp: null}]}});
  r("nat", {statisch: [], dynamisch: [{acl: "1", aus: "Gi0/1", overload: true}]});
  Modell.setzen(n, "inet", "if.wan0.ip", "203.0.113.1"); Modell.setzen(n, "inet", "if.wan0.maske", "255.255.255.252");
  for (const id of ["r1", "sw1"]) Modell.speichern(n.geraete[id]);
  return n;
};

/* Arztpraxis: drei VLANs, Router-on-a-Stick, Server in VLAN 10, Gäste per ACL vom Verwaltungsnetz getrennt. */
DATEN.beispiele.praxis = function(){
  const n = Modell.neu();
  Modell.geraet(n, "router", {id: "r1", name: "R1", x: 420, y: 100});
  Modell.geraet(n, "switch", {id: "sw1", name: "SW1", x: 420, y: 260});
  Modell.geraet(n, "server", {id: "srv", name: "Server", x: 160, y: 260});
  Modell.geraet(n, "pc", {id: "empfang", name: "PC-Empfang", x: 220, y: 420});
  Modell.geraet(n, "pc", {id: "behandlung", name: "PC-Behandlung", x: 420, y: 440});
  Modell.geraet(n, "pc", {id: "gast", name: "Gast-Laptop", skin: "laptop", x: 620, y: 420});
  Modell.vlan(n, "sw1", 10, "Verwaltung"); Modell.vlan(n, "sw1", 20, "Behandlung"); Modell.vlan(n, "sw1", 30, "Gaeste");
  Modell.verbinden(n, {geraet: "srv"}, {geraet: "sw1", port: "Fa0/1"});
  Modell.verbinden(n, {geraet: "empfang"}, {geraet: "sw1", port: "Fa0/2"});
  Modell.verbinden(n, {geraet: "behandlung"}, {geraet: "sw1", port: "Fa0/11"});
  Modell.verbinden(n, {geraet: "gast"}, {geraet: "sw1", port: "Fa0/21"});
  Modell.verbinden(n, {geraet: "sw1", port: "Gi0/1"}, {geraet: "r1", port: "Gi0/0"});
  const acc = (p, v) => Modell.setzen(n, "sw1", `ports.${p}.accessVlan`, v);
  acc("Fa0/1", 10); acc("Fa0/2", 10); acc("Fa0/11", 20); acc("Fa0/21", 30);
  Modell.setzen(n, "sw1", "ports.Gi0/1.modus", "trunk");
  const host = (id, ip, net) => { for (const [f, w] of Object.entries({ip, maske: "255.255.255.0", gw: `192.168.${net}.1`, dns: "192.168.10.5"})) Modell.setzen(n, id, "if.eth0." + f, w); };
  host("srv", "192.168.10.5", 10); host("empfang", "192.168.10.21", 10); host("behandlung", "192.168.20.21", 20); host("gast", "192.168.30.21", 30);
  Modell.setzen(n, "srv", "dienste.datei", {an: true});
  Modell.setzen(n, "srv", "dienste.dns", {an: true, eintraege: [{name: "server.praxis.local", ip: "192.168.10.5"}]});
  Modell.setzen(n, "r1", "if.Gi0/0.shutdown", false);
  for (const v of [10, 20, 30]) {
    Modell.setzen(n, "r1", `if.Gi0/0.${v}`, Object.assign(Modell.subIf(v), {ip: `192.168.${v}.1`, maske: "255.255.255.0"}));
  }
  Modell.setzen(n, "r1", "acls", {"GAST": {typ: "erweitert", benannt: true, regeln: [
    {aktion: "deny", proto: "ip", quelle: {ip: "192.168.30.0", wc: "0.0.0.255"}, ziel: {ip: "192.168.10.0", wc: "0.0.0.255"}, zielPort: null, quellPort: null, icmpTyp: null},
    {aktion: "deny", proto: "ip", quelle: {ip: "192.168.30.0", wc: "0.0.0.255"}, ziel: {ip: "192.168.20.0", wc: "0.0.0.255"}, zielPort: null, quellPort: null, icmpTyp: null},
    {aktion: "permit", proto: "ip", quelle: {ip: "0.0.0.0", wc: "255.255.255.255"}, ziel: {ip: "0.0.0.0", wc: "255.255.255.255"}, zielPort: null, quellPort: null, icmpTyp: null},
  ]}});
  Modell.setzen(n, "r1", "if.Gi0/0.30.aclIn", "GAST");
  for (const id of ["r1", "sw1"]) Modell.speichern(n.geraete[id]);
  return n;
};

/* Handgeschriebene Tickets als Bauplan (Vorlage + Fehler + Texte). Netz, Ziele, Lösung und Hilfen werden erst beim
   ersten Zugriff über Spiel.ticketBauen berechnet (die Spielschicht lädt nach den Daten) und dann gemerkt.
   Statische Felder (id, art, stufe, karriere, kunde, titel, reihe, skills, lohn, minuten) stehen sofort bereit.
   P2 „Auftragsvielfalt“: def.fuerSeed(seed) liefert dieselbe Definition für GENAU diesen Instanz-Seed – das Netz
   entsteht dann aus dem Seed statt aus dem festen vSeed. Ergebnis wird je (id, seed) gemerkt, damit eine Wiederholung
   identisch bleibt und nichts doppelt gerechnet wird. Besteht eine Seed-Fassung die Selbstprüfung nicht (z. B. weil
   eine handgeschriebene Lösung eine feste Adresse nennt), bleibt die feste Fassung: der Auftrag ist immer spielbar.
   Terminal-Aufträge (art „terminal“) bleiben grundsätzlich fest: Sie arbeiten per Fernwartung auf dem einen echten
   Rechner, und ihre Befehlsmuster und Lösungsschritte nennen konkrete Werte (baeckerei-terminal: netsh mit
   192.168.10.17/.254). Ein gewürfeltes Netz machte sie nur zufällig spielbar. */
DATEN.ticketSpec = function(spec){
  const FELDER = ["netz", "ziele", "loesung", "hilfen", "erklaerung", "briefing", "symptom", "quelle", "vorlage", "injektoren", "gruende", "fehlerstellen", "regression", "regressionOhne", "skills", "lohn", "minuten", "vorhersage", "entwurf"];
  const entwurf = () => ({entwurf: true, ziele: [], loesung: [], hilfen: {frage: [], bereich: [], konkret: []}, netz: () => Modell.neu(), erklaerung: "", briefing: spec.briefing || "", symptom: spec.symptom || ""});
  /* Hat die feste Fassung ein Feld als eigenen WERT überschrieben (statt Getter, z. B. im Durchspiel-Test „Lösung
     ohne Speichern“), gilt diese Laufzeit-Überschreibung auch für die Seed-Fassung – aber nur, solange sie wirklich
     vom Bauplan abweicht: Derselbe Test stellt den alten Wert danach wieder her, und dann gilt wieder das Netz der
     Instanz. Passt eine Überschreibung nicht zum Seed-Netz (z. B. eine Lösung mit den Adressen des festen Netzes),
     fällt die Selbstprüfung durch und es bleibt die feste Fassung – der Auftrag ist immer spielbar. */
  const ueberschreibungen = new Map();                          /* Feld → {wert, ist} */
  const ueberschrieben = (f) => {
    const de = Object.getOwnPropertyDescriptor(feste, f);
    if (!de || de.get || de.value === undefined) return false;
    const da = ueberschreibungen.get(f);
    if (da && da.wert === de.value) return da.ist;
    const roh = fest();
    const ist = !roh || JSON.stringify(de.value) !== JSON.stringify(roh[f]);
    ueberschreibungen.set(f, {wert: de.value, ist});
    return ist;
  };
  /* Eine Definition um ein gemerktes Bauergebnis herum; ohne seed bleibt bau() der bisherige Weg. */
  const machen = (roh) => {
    let gebaut = null;
    const bau = () => {
      if (gebaut) return gebaut;
      try { gebaut = roh(); } catch (e) { gebaut = null; typeof console !== "undefined" && console.error("Ticket " + spec.id, e); }
      if (!gebaut) gebaut = entwurf();
      return gebaut;
    };
    const def = {id: spec.id, art: spec.art || "stoerung", stufe: spec.stufe || "E", karriere: spec.karriere || 1, kunde: spec.kunde, titel: spec.titel,
                 reihe: spec.reihe, spec};
    for (const f of ["skills", "lohn", "minuten", "vorhersage", "form", "hotline", "varianten"]) if (spec[f] !== undefined) def[f] = spec[f];
    for (const f of FELDER) {
      if (Object.prototype.hasOwnProperty.call(def, f)) continue;
      Object.defineProperty(def, f, {enumerable: true, configurable: true, get(){ return ueberschrieben(f) ? feste[f] : bau()[f]; }});
    }
    return def;
  };
  /* Feste Fassung (vSeed) – der Rückfall, wenn es keinen Seed gibt oder die Seed-Fassung nicht spielbar wäre. */
  let festRoh = null, festVersucht = false;
  const fest = () => { if (!festVersucht) { festVersucht = true; try { festRoh = Spiel.ticketBauen(spec) || null; } catch (e) { festRoh = null; typeof console !== "undefined" && console.error("Ticket " + spec.id, e); } } return festRoh; };
  const feste = machen(fest);
  const proSeed = new Map();                                    /* seed → Definition (auch der Rückfall wird gemerkt) */
  Object.defineProperty(feste, "fuerSeed", {enumerable: false, configurable: true, value(seed){
    if (spec.art === "terminal") return feste;                  /* Terminal-Aufträge bleiben auf dem festen Netz */
    const s = (seed >>> 0) || 1;
    const da = proSeed.get(s);
    if (da) return da;
    let d = null;
    try {
      const roh = Spiel.ticketBauen(spec, s);
      if (roh) {                                                /* die Fassung samt Laufzeit-Überschreibungen prüfen */
        const fassung = machen(() => roh);
        if (typeof Spiel.ticketGueltig !== "function" || Spiel.ticketGueltig(fassung)) d = fassung;
      }
    } catch (e) { d = null; }
    if (!d) d = feste;                                          /* Seed-Fassung taugt nicht → die feste bleibt spielbar */
    if (proSeed.size >= 32) proSeed.delete(proSeed.keys().next().value);
    proSeed.set(s, d);
    return d;
  }});
  return feste;
};
