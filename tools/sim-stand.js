/* Referenzstand der Simulation: spielt feste Szenarien und legt ihre Ereignisse als JSON ab.
 *
 * Warum: Die Golden-Tests (tests/sim-golden.test.js) haben KEINE Snapshot-Datei – ihre Sollwerte stehen als
 * erwarte.* im Code und werden von Hand gepflegt. Für die DHCP-Arbeit (D1) braucht es aber einen Vergleich, der
 * zeigt, was sich in der Simulation wirklich geändert hat.
 *
 * Aufruf:
 *   <node> tools/sim-stand.js --schreiben [pfad]   Referenzstand aufnehmen
 *   <node> tools/sim-stand.js [pfad]               Vergleich gegen den Referenzstand
 *
 * Ausgabe beim Vergleich: je Szenario Zahl der Ereignisse, neue/verschwundene Gründe und Protokolle, und die
 * erste abweichende Stelle im Klartext. Rückgabewert 1, wenn sich etwas geändert hat.
 *
 * Umfang (SIM-03, 3.0): 43 Szenarien über VLAN/Trunk, Adressierung/Routing, NAT/PAT, ACL/Firewall, Dienste,
 * DHCP (auch Relay und Pool), DNS, /31 und Broadcast-Sturm; 28 der 34 Grundcodes kommen darin vor, dazu die
 * Protokolle TCP und HTTP. Die Abweichung zum Stand 2.9.0 (12 Szenarien, 4/34 Codes) ist bewusst: der
 * Referenzstand wird neu erzeugt und im CHANGELOG begründet (Architektur § 16.3).
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const HIER = path.resolve(__dirname, "..");
/* Die Referenz liegt in tests/ und ist damit versioniert (Design § 24, Befund M3): in Nachweise/ – das nicht im
   Git liegt – wäre sie in einem frischen Klon nicht vorhanden und der Vergleich liefe ins Leere. */
const STD = path.join(HIER, "tests", "sim-stand.json");

/* Module genau wie tests/run.js in einen gemeinsamen Kontext laden – sonst fehlen Querverweise (Sim, Modell, IP).
   Die Reihenfolge je Schicht ist dieselbe wie dort (Kopfdateien zuerst). */
const SCHICHTEN = [
  ["kern", ["basis.js", "netz.js"]], ["@lernmotor", []], ["modell", ["geraete.js"]],
  ["sim", ["engine.js"]], ["cli", ["parser.js"]], ["daten", ["basis.js"]], ["spiel", ["zustand.js"]],
];

/* Lernmotor: Quelle daneben hat Vorrang, sonst die Kopie im Repositorium (wie in bauen.py und
   tests/run.js). Ohne den Rückfall liefe dieser Vergleich in einem frischen Klon ins Leere. */
const LM_QUELLE = path.resolve(HIER, "..", "FISI-Spielhalle", "src", "lernmotor.js");
const LM_KOPIE = path.join(HIER, "fremd", "lernmotor.js");
const LM = fs.existsSync(LM_QUELLE) ? { pfad: LM_QUELLE, kopie: false }
       : fs.existsSync(LM_KOPIE) ? { pfad: LM_KOPIE, kopie: true }
       : null;
if (!LM) throw new Error("Kein Lernmotor gefunden: weder " + LM_QUELLE + " noch " + LM_KOPIE);
const LM_KOPF = /^\/\*\s*=+[\s\S]*?=+\s*\*\/\s*/;

function inhalt(f) {
  const t = fs.readFileSync(f, "utf8");
  return f === LM.pfad && LM.kopie ? t.replace(LM_KOPF, "") : t;
}

function moduleListe() {
  const liste = [];
  for (const [ordner, kopf] of SCHICHTEN) {
    if (ordner === "@lernmotor") { liste.push(LM.pfad); continue; }
    const d = path.join(HIER, "src", ordner);
    if (!fs.existsSync(d)) continue;
    const alle = fs.readdirSync(d).filter((n) => n.endsWith(".js")).sort();
    const reihe = [...kopf.filter((n) => alle.includes(n)), ...alle.filter((n) => !kopf.includes(n))];
    for (const n of reihe) liste.push(path.join(d, n));
  }
  return liste;
}

function laden() {
  const ctx = vm.createContext({ console, setTimeout, clearTimeout, Date, Math, JSON, Intl });
  /* Die Module deklarieren mit const/function auf oberster Ebene – das landet in keinem Objekt. Deshalb wird der
     ganze Stapel in eine Funktion gepackt, die die gebrauchten Namensräume zurückgibt. */
  const code = [
    '"use strict"; const LABOR_VERSION = "stand";',
    "(function () {",
    ...moduleListe().map((f) => `/* ${path.relative(HIER, f)} */\n` + inhalt(f)),
    "return Object.fromEntries([['Modell', typeof Modell !== 'undefined' ? Modell : null]," +
      "['Sim', typeof Sim !== 'undefined' ? Sim : null], ['IP', typeof IP !== 'undefined' ? IP : null]," +
      "['CLI', typeof CLI !== 'undefined' ? CLI : null], ['DATEN', typeof DATEN !== 'undefined' ? DATEN : null]," +
      "['Spiel', typeof Spiel !== 'undefined' ? Spiel : null], ['Kern', typeof Kern !== 'undefined' ? Kern : null]]);",
    "})",
  ];
  return vm.runInContext(code.join("\n;\n"), ctx, { filename: "labor-stand.js" })();
}

const K = laden();
const Modell = K.Modell, Sim = K.Sim, Daten = K.DATEN;
if (!Modell || !Sim || !Daten) {
  console.error("Module nicht greifbar – Modell:", !!Modell, "Sim:", !!Sim, "Daten:", !!Daten, "| Schlüssel:", Object.keys(K).join(", "));
  process.exit(2);
}

/* ---------- Testnetze – 1:1 wie die Helfer T.host/T.kabel/T.rif in tests/sim-golden.test.js ----------
   Wichtig: Kabel immer mit {geraet, port}-Objekten legen und die Rückgabe auf fehler prüfen – mit den früheren
   fünf Einzelargumenten hat Modell.verbinden still nichts getan, deshalb kamen fast keine Ereignisse heraus.
   Router-Schnittstellen sind standardmäßig shutdown:true und müssen mit shutdown:false aufgehen. */
function host(n, id, ip, gw, dns) {
  Modell.geraet(n, "pc", { id, name: id.toUpperCase() });
  if (ip != null) Modell.setzen(n, id, "if.eth0.ip", ip);
  Modell.setzen(n, id, "if.eth0.maske", "255.255.255.0");
  if (gw) Modell.setzen(n, id, "if.eth0.gw", gw);
  if (dns) Modell.setzen(n, id, "if.eth0.dns", dns);
  return n.geraete[id];
}
function kabel(n, a, pa, b, pb) {
  const k = Modell.verbinden(n, { geraet: a, port: pa }, { geraet: b, port: pb });
  if (!k || k.fehler) throw new Error(`Kabel ${a}/${pa} – ${b}/${pb}: ${(k && k.fehler) || "keine Verbindung"}`);
  return k;
}
function rif(n, r, port, ip, maske) {
  Modell.setzen(n, r, `if.${port}.ip`, ip);
  Modell.setzen(n, r, `if.${port}.maske`, maske || "255.255.255.0");
  Modell.setzen(n, r, `if.${port}.shutdown`, false);
}

/* PC1 .10, PC2 .11, PC3 .12 an SW1 Fa0/1..3 – Gateway .1 ist gesetzt, sonst kein Ping aus dem LAN heraus */
function lan() {
  const n = Modell.neu();
  Modell.geraet(n, "switch", { id: "sw1", name: "SW1" });
  host(n, "pc1", "192.168.1.10", "192.168.1.1");
  host(n, "pc2", "192.168.1.11", "192.168.1.1");
  host(n, "pc3", "192.168.1.12", "192.168.1.1");
  kabel(n, "pc1", "eth0", "sw1", "Fa0/1");
  kabel(n, "pc2", "eth0", "sw1", "Fa0/2");
  kabel(n, "pc3", "eth0", "sw1", "Fa0/3");
  return n;
}

/* PCA 10.0.1.10 – SW1 – R1 – SW2 – PCB 10.0.2.10 (wie T.zweiNetze) */
function zweiNetze() {
  const n = Modell.neu();
  Modell.geraet(n, "router", { id: "r1", name: "R1" });
  Modell.geraet(n, "switch", { id: "sw1", name: "SW1" });
  Modell.geraet(n, "switch", { id: "sw2", name: "SW2" });
  host(n, "pca", "10.0.1.10", "10.0.1.1");
  host(n, "pcb", "10.0.2.10", "10.0.2.1");
  kabel(n, "pca", "eth0", "sw1", "Fa0/1");
  kabel(n, "sw1", "Gi0/1", "r1", "Gi0/0");
  kabel(n, "r1", "Gi0/1", "sw2", "Gi0/1");
  kabel(n, "pcb", "eth0", "sw2", "Fa0/1");
  rif(n, "r1", "Gi0/0", "10.0.1.1");
  rif(n, "r1", "Gi0/1", "10.0.2.1");
  return n;
}

/* PCA – SW1 – R1 =(10.0.12.0/30)= R2 – SW2 – PCB, statische Routen in beide Richtungen (wie T.zweiRouter) */
function zweiRouter() {
  const n = Modell.neu();
  Modell.geraet(n, "router", { id: "r1", name: "R1" });
  Modell.geraet(n, "router", { id: "r2", name: "R2" });
  Modell.geraet(n, "switch", { id: "sw1", name: "SW1" });
  Modell.geraet(n, "switch", { id: "sw2", name: "SW2" });
  host(n, "pca", "10.0.1.10", "10.0.1.1");
  host(n, "pcb", "10.0.2.10", "10.0.2.1");
  kabel(n, "pca", "eth0", "sw1", "Fa0/1");
  kabel(n, "sw1", "Gi0/1", "r1", "Gi0/0");
  kabel(n, "r1", "Gi0/1", "r2", "Gi0/1");
  kabel(n, "r2", "Gi0/0", "sw2", "Gi0/1");
  kabel(n, "pcb", "eth0", "sw2", "Fa0/1");
  rif(n, "r1", "Gi0/0", "10.0.1.1");
  rif(n, "r1", "Gi0/1", "10.0.12.1", "255.255.255.252");
  rif(n, "r2", "Gi0/0", "10.0.2.1");
  rif(n, "r2", "Gi0/1", "10.0.12.2", "255.255.255.252");
  Modell.setzen(n, "r1", "routen", [{ netz: "10.0.2.0", maske: "255.255.255.0", nh: "10.0.12.2", aus: null, ad: 1 }]);
  Modell.setzen(n, "r2", "routen", [{ netz: "10.0.1.0", maske: "255.255.255.0", nh: "10.0.12.1", aus: null, ad: 1 }]);
  return n;
}

/* LAN mit DHCP-Server auf dem Router + Client PC3, der sich eine Adresse holt (wie sim-gruende, DHCP-Fall).
   Der Pool beginnt bewusst bei .10: ohne start fängt poolsVonHost bei Netz+1 an und trifft die reservierten .10–.12. */
function dhcpLAN() {
  const n = lan();
  Modell.geraet(n, "router", { id: "r1", name: "R1" });
  kabel(n, "r1", "Gi0/0", "sw1", "Gi0/1");
  rif(n, "r1", "Gi0/0", "192.168.1.1");
  Modell.setzen(n, "r1", "dhcp", {
    ausgeschlossen: [{ von: "192.168.1.1", bis: "192.168.1.9" }],
    pools: [{ name: "LAN", netz: "192.168.1.0", maske: "255.255.255.0", gw: "192.168.1.1", dns: "192.168.1.1", start: "192.168.1.10", anzahl: 50 }],
  });
  Modell.setzen(n, "pc3", "if.eth0.ip", "");
  Modell.setzen(n, "pc3", "if.eth0.gw", "");
  Modell.setzen(n, "pc3", "if.eth0.dhcp", true);
  return n;
}

/* Netz mit erschöpftem Pool: ZweiNetze + PCC am LAN2, Ausschluss 10.0.2.1–253 lässt nur .254 frei (wie sim-gruende) */
function poolLeer() {
  const n = zweiNetze();
  host(n, "pcc", null, null);
  kabel(n, "pcc", "eth0", "sw2", "Fa0/2");
  Modell.setzen(n, "pcb", "if.eth0.dhcp", true);
  Modell.setzen(n, "pcc", "if.eth0.dhcp", true);
  Modell.setzen(n, "r1", "dhcp", {
    ausgeschlossen: [{ von: "10.0.2.1", bis: "10.0.2.253" }],
    pools: [{ name: "LAN2", netz: "10.0.2.0", maske: "255.255.255.0", gw: "10.0.2.1", dns: "" }],
  });
  return n;
}

/* Kleines LAN mit eigenem DNS-Server (SRV .5) – PCA fragt ihn nach PCB (wie DATEN.beispiele.praxis) */
function dnsLAN() {
  const n = Modell.neu();
  Modell.geraet(n, "switch", { id: "sw1", name: "SW1" });
  Modell.geraet(n, "server", { id: "srv", name: "SRV" });
  host(n, "pca", "192.168.1.10", "192.168.1.1", "192.168.1.5");
  host(n, "pcb", "192.168.1.11", "192.168.1.1");
  Modell.setzen(n, "srv", "if.eth0.ip", "192.168.1.5");
  Modell.setzen(n, "srv", "if.eth0.maske", "255.255.255.0");
  Modell.setzen(n, "srv", "if.eth0.gw", "192.168.1.1");
  Modell.setzen(n, "srv", "dienste.dns", { an: true, eintraege: [{ name: "pcb.labor.local", ip: "192.168.1.11" }] });
  kabel(n, "pca", "eth0", "sw1", "Fa0/1");
  kabel(n, "pcb", "eth0", "sw1", "Fa0/2");
  kabel(n, "srv", "eth0", "sw1", "Fa0/3");
  return n;
}

/* DHCP über Relay: Server im Netz 10.0.1.0/24, PCB im Netz 10.0.2.0/24, R1 mit ip helper-address (wie sim-golden) */
function relayLAN() {
  const n = zweiNetze();
  Modell.geraet(n, "server", { id: "srv", name: "SRV" });
  kabel(n, "srv", "eth0", "sw1", "Fa0/2");
  for (const [k, v] of Object.entries({ ip: "10.0.1.5", maske: "255.255.255.0", gw: "10.0.1.1" })) Modell.setzen(n, "srv", "if.eth0." + k, v);
  Modell.setzen(n, "srv", "dienste.dhcp", { an: true, pools: [
    { name: "Netz1", netz: "10.0.1.0", maske: "255.255.255.0", gw: "10.0.1.1", dns: "10.0.1.5", start: "10.0.1.100", anzahl: 50 },
    { name: "Netz2", netz: "10.0.2.0", maske: "255.255.255.0", gw: "10.0.2.1", dns: "10.0.1.5", start: "10.0.2.100", anzahl: 50 }] });
  Modell.setzen(n, "pcb", "if.eth0.dhcp", true);
  Modell.setzen(n, "pcb", "if.eth0.ip", "");
  Modell.setzen(n, "r1", "if.Gi0/1.helper", ["10.0.1.5"]);
  return n;
}


/* ---------- Netze aus den Beispieldaten (Daten) ----------
   Dieselben Netze benutzen die Tests (DATEN.beispiele.praxis/salon): Router-on-a-Stick mit VLAN 10/20/30,
   ACL und NAT (praxis) sowie NAT/PAT ins Internet (salon). Jeder Aufruf baut ein frisches Netz. */
function praxis() { return Daten.beispiele.praxis(); }
function salon() { return Daten.beispiele.salon(); }

/* VLAN-Trennung: PC1 und PC3 in VLAN 10, PC2 in VLAN 20 (wie tests/sim-golden.test.js) */
function lanVlan() {
  const n = lan();
  Modell.vlan(n, "sw1", 10, "A"); Modell.vlan(n, "sw1", 20, "B");
  Modell.setzen(n, "sw1", "ports.Fa0/1.accessVlan", 10);
  Modell.setzen(n, "sw1", "ports.Fa0/2.accessVlan", 20);
  Modell.setzen(n, "sw1", "ports.Fa0/3.accessVlan", 10);
  return n;
}

/* Trunk zwischen zwei Switches, VLAN 10 getaggt (wie tests/sim-golden.test.js) */
function trunkLAN() {
  const n = Modell.neu();
  Modell.geraet(n, "switch", {id: "sw1", name: "SW1"}); Modell.geraet(n, "switch", {id: "sw2", name: "SW2"});
  for (const s of ["sw1", "sw2"]) { Modell.vlan(n, s, 10, "Buero"); Modell.setzen(n, s, "ports.Gi0/1.modus", "trunk"); Modell.setzen(n, s, "ports.Fa0/1.accessVlan", 10); }
  host(n, "pc1", "192.168.10.10"); host(n, "pc2", "192.168.10.20");
  kabel(n, "pc1", "eth0", "sw1", "Fa0/1"); kabel(n, "pc2", "eth0", "sw2", "Fa0/1"); kabel(n, "sw1", "Gi0/1", "sw2", "Gi0/1");
  return n;
}

/* Trunk, der VLAN 10 nicht erlaubt (wie tests/sim-gruende.test.js) → TRUNK_NOT_ALLOWED */
function trunkVerboten() {
  const n = Modell.neu();
  Modell.geraet(n, "switch", {id: "sw1", name: "SW1"}); Modell.geraet(n, "switch", {id: "sw2", name: "SW2"});
  for (const s of ["sw1", "sw2"]) { Modell.vlan(n, s, 10, "A"); Modell.setzen(n, s, "ports.Gi0/1.modus", "trunk"); Modell.setzen(n, s, "ports.Gi0/1.trunkErlaubt", [1, 20]); Modell.setzen(n, s, "ports.Fa0/1.accessVlan", 10); }
  host(n, "pc1", "192.168.10.10"); host(n, "pc2", "192.168.10.20");
  kabel(n, "pc1", "eth0", "sw1", "Fa0/1"); kabel(n, "pc2", "eth0", "sw2", "Fa0/1"); kabel(n, "sw1", "Gi0/1", "sw2", "Gi0/1");
  return n;
}

/* Native-VLAN-Mismatch auf dem Trunk (wie tests/sim-gruende.test.js, bau(1)): CDP-Warnung + ARP_NO_REPLY */
function nativeMismatch() {
  const n = Modell.neu();
  Modell.geraet(n, "switch", {id: "sw1", name: "SW1"}); Modell.geraet(n, "switch", {id: "sw2", name: "SW2"});
  Modell.vlan(n, "sw2", 99, "Native");
  for (const s of ["sw1", "sw2"]) Modell.setzen(n, s, "ports.Gi0/1.modus", "trunk");
  Modell.setzen(n, "sw2", "ports.Gi0/1.nativeVlan", 99);
  host(n, "pc1", "192.168.1.10"); host(n, "pc2", "192.168.1.20");
  kabel(n, "pc1", "eth0", "sw1", "Fa0/1"); kabel(n, "pc2", "eth0", "sw2", "Fa0/1"); kabel(n, "sw1", "Gi0/1", "sw2", "Gi0/1");
  return n;
}

/* /31 als Punkt-zu-Punkt-Strecke zwischen zwei Routern (10.0.12.2/31 – 10.0.12.3/31) */
function netz31() {
  const n = Modell.neu();
  Modell.geraet(n, "router", {id: "r1", name: "R1"}); Modell.geraet(n, "router", {id: "r2", name: "R2"});
  Modell.geraet(n, "switch", {id: "sw1", name: "SW1"}); Modell.geraet(n, "switch", {id: "sw2", name: "SW2"});
  host(n, "pca", "10.0.1.10", "10.0.1.1"); host(n, "pcb", "10.0.2.10", "10.0.2.1");
  kabel(n, "pca", "eth0", "sw1", "Fa0/1"); kabel(n, "sw1", "Gi0/1", "r1", "Gi0/0");
  kabel(n, "r1", "Gi0/1", "r2", "Gi0/1");
  kabel(n, "r2", "Gi0/0", "sw2", "Gi0/1"); kabel(n, "pcb", "eth0", "sw2", "Fa0/1");
  rif(n, "r1", "Gi0/0", "10.0.1.1"); rif(n, "r1", "Gi0/1", "10.0.12.2", "255.255.255.254");
  rif(n, "r2", "Gi0/0", "10.0.2.1"); rif(n, "r2", "Gi0/1", "10.0.12.3", "255.255.255.254");
  Modell.setzen(n, "r1", "routen", [{netz: "10.0.2.0", maske: "255.255.255.0", nh: "10.0.12.3", aus: null, ad: 1}]);
  Modell.setzen(n, "r2", "routen", [{netz: "10.0.1.0", maske: "255.255.255.0", nh: "10.0.12.2", aus: null, ad: 1}]);
  return n;
}

/* Schleife zwischen zwei Switches (wie tests/sim-golden.test.js) → Broadcast-Sturm */
function sturmLAN() {
  const n = lan();
  Modell.geraet(n, "switch", {id: "sw2", name: "SW2"});
  kabel(n, "sw1", "Gi0/1", "sw2", "Gi0/1"); kabel(n, "sw1", "Gi0/2", "sw2", "Gi0/2");
  return n;
}

/* Firewall-Netz (wie tests/sim-gruende.test.js): PCI – FW(innen) · FW(aussen) – Internet · FW(dmz) – WEB */
function fwNetz() {
  const n = Modell.neu();
  Modell.geraet(n, "firewall", {id: "fw", name: "FW1"}); Modell.geraet(n, "internet", {id: "inet"});
  host(n, "pci", "192.168.1.10", "192.168.1.1");
  Modell.setzen(n, "pci", "if.eth0.dns", "198.51.100.53");
  Modell.geraet(n, "server", {id: "web", name: "WEB"});
  Modell.setzen(n, "web", "if.eth0.ip", "172.16.0.10"); Modell.setzen(n, "web", "if.eth0.maske", "255.255.255.0"); Modell.setzen(n, "web", "if.eth0.gw", "172.16.0.1");
  kabel(n, "pci", "eth0", "fw", "Gi0/0"); kabel(n, "fw", "Gi0/1", "inet", "wan0"); kabel(n, "web", "eth0", "fw", "Gi0/2");
  const fi = (p, ip, m, zone) => { Modell.setzen(n, "fw", `if.${p}.ip`, ip); Modell.setzen(n, "fw", `if.${p}.maske`, m); Modell.setzen(n, "fw", `if.${p}.zone`, zone); };
  fi("Gi0/0", "192.168.1.1", "255.255.255.0", "innen"); fi("Gi0/1", "203.0.113.2", "255.255.255.252", "aussen"); fi("Gi0/2", "172.16.0.1", "255.255.255.0", "dmz");
  Modell.setzen(n, "fw", "routen", [{netz: "0.0.0.0", maske: "0.0.0.0", nh: "203.0.113.1", aus: null, ad: 1}]);
  Modell.setzen(n, "fw", "regeln", [
    {id: "r1", von: "innen", nach: "aussen", proto: "ip", quelle: "any", ziel: "any", port: null, aktion: "erlauben", aktiv: true, text: "Surfen"},
    {id: "r2", von: "aussen", nach: "dmz", proto: "tcp", quelle: "any", ziel: "172.16.0.10/32", port: 80, aktion: "erlauben", aktiv: true, text: "Webserver"}]);
  Modell.setzen(n, "fw", "nat", {quellNat: [{von: "innen", nach: "aussen"}], weiterleitung: [{proto: "tcp", aussenPort: 80, ziel: "172.16.0.10", zielPort: 80}]});
  Modell.setzen(n, "inet", "if.wan0.ip", "203.0.113.1"); Modell.setzen(n, "inet", "if.wan0.maske", "255.255.255.252");
  return n;
}

/* ---------- Szenarien ----------
   Die Netze werden in jedem Szenario neu gebaut – kein Zustand wandert zwischen den Läufen.
   Aufgenommen wird jeweils das letzte Ergebnis (bei dhcp-* also der DHCP-Lauf selbst).
   SIM-03 (3.0): erweitert von 12 auf über 20 Szenarien; Abdeckung aller Flächen, an denen 3.0 baut.
   Die Abweichung zum Stand 2.9.0 ist bewusst und im CHANGELOG begründet (Architektur § 16.3). */
const SZENARIEN = {
  /* --- Grundlagen (Bestand seit 2.1) --- */
  "ping-lan": () => Sim.ping(lan(), "pc1", "192.168.1.11", { anzahl: 1 }),
  "ping-zwei-netze": () => Sim.ping(zweiNetze(), "pca", "10.0.2.10", { anzahl: 2 }),
  /* drei Pakete: R1 und R2 verwerfen je eines, solange sie die MAC des nächsten Hops per ARP suchen */
  "ping-zwei-router": () => Sim.ping(zweiRouter(), "pca", "10.0.2.10", { anzahl: 3 }),
  "ping-kein-arp": () => Sim.ping(lan(), "pc1", "192.168.1.99", { anzahl: 1 }),
  "dhcp-lease": () => Sim.dhcp(dhcpLAN(), "pc3", "eth0"),
  "dhcp-zweimal": () => {
    const n = dhcpLAN();
    Sim.dhcp(n, "pc3", "eth0");
    return Sim.dhcp(n, "pc3", "eth0");
  },
  "dhcp-kein-server": () => {
    const n = lan();
    Modell.setzen(n, "pc3", "if.eth0.ip", "");
    Modell.setzen(n, "pc3", "if.eth0.dhcp", true);
    return Sim.dhcp(n, "pc3", "eth0");
  },
  "dhcp-pool-leer": () => {
    const n = poolLeer();
    Sim.dhcp(n, "pcb");          /* verbraucht die letzte freie Adresse (.254) */
    return Sim.dhcp(n, "pcc");   /* findet nichts mehr → DHCP_POOL_EMPTY */
  },
  "dhcp-relay": () => Sim.dhcp(relayLAN(), "pcb", "eth0"),
  "dns-name": () => Sim.dns(dnsLAN(), "pca", "pcb.labor.local"),
  "dns-kein-server": () => Sim.dns(lan(), "pc1", "server.local"),
  "traceroute": () => Sim.traceroute(zweiRouter(), "pca", "10.0.2.10"),

  /* --- VLAN und Trunk --- */
  "vlan-trennt": () => Sim.ping(lanVlan(), "pc1", "192.168.1.11", { anzahl: 1 }),
  "vlan-gleiches-vlan": () => Sim.ping(lanVlan(), "pc1", "192.168.1.12", { anzahl: 1 }),
  "trunk-getaggt": () => Sim.ping(trunkLAN(), "pc1", "192.168.10.20", { anzahl: 1 }),
  "trunk-verboten": () => Sim.ping(trunkVerboten(), "pc1", "192.168.10.20", { anzahl: 1 }),
  "nativ-mismatch": () => Sim.ping(nativeMismatch(), "pc1", "192.168.1.99", { anzahl: 1 }),
  "portsec": () => {
    const n = lan();
    Modell.setzen(n, "sw1", "ports.Fa0/1.portSecurity", {max: 1, verstoss: "shutdown", macs: ["02:00:00:00:00:99"]});
    return Sim.ping(n, "pc1", "192.168.1.11", { anzahl: 1 });
  },
  "sturm": () => Sim.ping(sturmLAN(), "pc1", "192.168.1.11", { anzahl: 1 }),

  /* --- Adressierung, Link und Routing --- */
  "link-down": () => {
    const n = lan();
    Modell.trennen(n, Modell.kabelAn(n, "pc1", "eth0").kabel.id);
    return Sim.ping(n, "pc1", "192.168.1.11", { anzahl: 1 });
  },
  "port-down": () => {
    const n = lan();
    Modell.setzen(n, "sw1", "ports.Fa0/2.shutdown", true);
    return Sim.ping(n, "pc1", "192.168.1.11", { anzahl: 1 });
  },
  "device-off": () => {
    const n = lan();
    Modell.geraetSetzen(n, "pc2", "an", false);
    return Sim.ping(n, "pc1", "192.168.1.11", { anzahl: 1 });
  },
  "no-ip": () => {
    const n = lan();
    Modell.setzen(n, "pc1", "if.eth0.ip", "");
    return Sim.ping(n, "pc1", "192.168.1.11", { anzahl: 1 });
  },
  "no-gateway": () => {
    const n = lan();
    Modell.setzen(n, "pc1", "if.eth0.gw", "");
    return Sim.ping(n, "pc1", "10.9.9.9", { anzahl: 1 });
  },
  "gw-wrong-subnet": () => {
    const n = lan();
    Modell.setzen(n, "pc1", "if.eth0.gw", "10.0.0.1");
    return Sim.ping(n, "pc1", "10.9.9.9", { anzahl: 1 });
  },
  "gw-unreachable": () => Sim.ping(lan(), "pc1", "10.9.9.9", { anzahl: 1 }),
  "wrong-mask": () => {
    const n = zweiNetze();
    Modell.setzen(n, "pca", "if.eth0.maske", "255.255.0.0");
    return Sim.ping(n, "pca", "10.0.2.10", { anzahl: 1 });
  },
  "no-route": () => Sim.ping(zweiNetze(), "pca", "10.9.9.9", { anzahl: 2 }),
  "no-return-route": () => {
    const n = zweiRouter();
    Modell.setzen(n, "r2", "routen", []);
    return Sim.ping(n, "pca", "10.0.2.10", { anzahl: 4 });
  },
  "ttl-expired": () => {
    const n = zweiRouter();
    Modell.setzen(n, "r1", "routen", [{netz: "0.0.0.0", maske: "0.0.0.0", nh: "10.0.12.2", aus: null, ad: 1}]);
    Modell.setzen(n, "r2", "routen", [{netz: "0.0.0.0", maske: "0.0.0.0", nh: "10.0.12.1", aus: null, ad: 1}]);
    return Sim.ping(n, "pca", "10.9.9.9", { anzahl: 2 });
  },
  "netz-31": () => Sim.ping(netz31(), "pca", "10.0.2.10", { anzahl: 3 }),
  "dup-ip": () => {
    const n = lan();
    Modell.setzen(n, "pc3", "if.eth0.ip", "192.168.1.11");
    return Sim.ping(n, "pc1", "pc2", { anzahl: 2 });
  },

  /* --- NAT/PAT und Internet --- */
  "nat-pat": () => Sim.ping(salon(), "kasse", "198.51.100.10", { anzahl: 2 }),
  "http-internet": () => Sim.http(salon(), "kasse", "http://www.beispiel.de"),
  "nat-fehlt": () => {
    const n = salon();
    Modell.setzen(n, "r1", "if.Gi0/0.nat", null);
    return Sim.ping(n, "kasse", "198.51.100.10", { anzahl: 4 });
  },
  "host-unreachable": () => Sim.ping(salon(), "kasse", "198.51.100.99", { anzahl: 4 }),

  /* --- ACL, Firewall, Dienste, DNS --- */
  "acl-deny": () => Sim.ping(praxis(), "gast", "srv"),
  "acl-deny-tcp": () => Sim.tcp(praxis(), "gast", "srv", 445),
  "fw-deny": () => Sim.ping(fwNetz(), "pci", "172.16.0.10", { anzahl: 1 }),
  "fw-portweiterleitung": () => Sim.tcp(fwNetz(), "inet", "203.0.113.2", 80),
  "port-closed": () => Sim.tcp(lan(), "pc1", "192.168.1.11", 80),
  "service-off": () => {
    const n = praxis();
    Modell.setzen(n, "srv", "dienste.http.an", false);
    return Sim.tcp(n, "empfang", "srv", 80);
  },
  "dns-fail": () => Sim.dns(praxis(), "behandlung", "gibtsnicht.praxis.local"),
};

/* ---------- Ereignisse auf das Prüfbare eindampfen ---------- */
function eindampfen(ereignisse) {
  return ereignisse.map((e) => ({
    art: e.art,
    geraet: e.geraet,
    port: e.port ?? null,
    proto: e.proto ?? null,
    grund: e.grund ?? null,
    nach: e.nach ? `${e.nach.geraet}/${e.nach.port}` : null,
    /* Frame-Felder als Pfade, damit neue Felder auffallen */
    felder: e.frame ? Object.keys(e.frame).sort() : [],
    app: e.frame && e.frame.app ? `${e.frame.app.proto}#${e.frame.app.info || ""}` : null,
    /* Die FELDER INNERHALB der Anwendung mitzählen – sonst bliebe z. B. eine neue DHCP-Option unsichtbar.
       Nur die Schlüssel, nicht die Werte: ein neuer Wert bei gleichem Schlüssel ist meist gewollt (andere IP),
       ein neuer Schlüssel dagegen ist eine Formatänderung und soll auffallen. */
    appFelder: e.frame && e.frame.app && e.frame.app.felder ? Object.keys(e.frame.app.felder).sort() : [],
    text: e.text ?? null,
    /* Architektur § 5.2: normales Verwerfen ohne Fehlergrund (SIM-06) – den Wert mittragen, nicht nur den Schlüssel. */
    ...(e.harmlos ? {harmlos: true} : {}),
    /* alle Schlüssel des Ereignisses selbst – neue Felder sollen auffallen */
    schluessel: Object.keys(e).sort(),
  }));
}

/* Ergebnis kurz festhalten: Erfolg, Grund und die DHCP-Lease, falls eine zustande kam.
   Die Lease steht in r.lease; zur Sicherheit wird sonst im Netzzustand nachgesehen. */
function ergebnis(r) {
  const l = r.lease || null;
  return {
    ok: !!(r && r.ok),
    grund: r.grund ?? null,
    lease: l ? { ip: l.ip, maske: l.maske, gw: l.gw ?? "", server: l.server ?? null } : null,
    apipa: r.apipa ?? null,
  };
}

function aufnehmen() {
  const stand = {};
  for (const [name, f] of Object.entries(SZENARIEN)) {
    try {
      const r = f();
      stand[name] = { ereignisse: eindampfen(r.trace.ereignisse), ...ergebnis(r) };
    } catch (fehler) {
      stand[name] = { fehler: String(fehler && fehler.message || fehler) };
    }
  }
  return stand;
}

function kurz(e) {
  return `${e.art}${e.proto ? "/" + e.proto : ""}${e.grund ? " [" + e.grund + "]" : ""} ${e.geraet || ""}${e.nach ? "→" + e.nach : ""}`;
}

function vergleichen(alt, neu) {
  let abweichungen = 0;
  for (const name of Object.keys(neu)) {
    const a = alt[name], b = neu[name];
    if (!a) { console.log(`? ${name}: im Referenzstand nicht vorhanden`); abweichungen++; continue; }
    if (a.fehler || b.fehler) {
      if (a.fehler !== b.fehler) { console.log(`✗ ${name}: Fehler anders\n    alt: ${a.fehler}\n    neu: ${b.fehler}`); abweichungen++; }
      continue;
    }
    const ea = a.ereignisse, eb = b.ereignisse;
    const kopf = `${name}: ${ea.length} → ${eb.length} Ereignisse`;
    const gründeA = new Set(ea.map(e => e.grund).filter(Boolean)), gründeB = new Set(eb.map(e => e.grund).filter(Boolean));
    const neueGründe = [...gründeB].filter(g => !gründeA.has(g));
    const wegGründe = [...gründeA].filter(g => !gründeB.has(g));
    const protosA = new Set(ea.map(e => e.proto).filter(Boolean)), protosB = new Set(eb.map(e => e.proto).filter(Boolean));
    const neueProtos = [...protosB].filter(p => !protosA.has(p));

    /* erst die kurzen Ergebnisdaten (ok, grund, lease, apipa) – sie fallen sonst zwischen den Ereignissen unter */
    const felder = ["ok", "grund", "apipa"];
    let ergebnisAnders = null;
    for (const f of felder) if (JSON.stringify(a[f]) !== JSON.stringify(b[f])) { ergebnisAnders = `${f}: ${JSON.stringify(a[f])} → ${JSON.stringify(b[f])}`; break; }
    if (!ergebnisAnders && JSON.stringify(a.lease) !== JSON.stringify(b.lease)) {
      ergebnisAnders = `lease: ${JSON.stringify(a.lease)} → ${JSON.stringify(b.lease)}`;
    }

    /* erste Abweichung Stelle für Stelle */
    const n = Math.min(ea.length, eb.length);
    let erste = -1;
    for (let i = 0; i < n; i++) if (JSON.stringify(ea[i]) !== JSON.stringify(eb[i])) { erste = i; break; }
    const gleich = erste < 0 && ea.length === eb.length && !neueGründe.length && !wegGründe.length && !ergebnisAnders;

    if (gleich) { console.log(`✓ ${kopf}`); continue; }
    abweichungen++;
    console.log(`✗ ${kopf}${neueGründe.length ? ` · neue Gründe: ${neueGründe.join(", ")}` : ""}${wegGründe.length ? ` · weg: ${wegGründe.join(", ")}` : ""}${neueProtos.length ? ` · neue Protokolle: ${neueProtos.join(", ")}` : ""}${ergebnisAnders ? ` · ${ergebnisAnders}` : ""}`);
    if (erste >= 0) {
      console.log(`    erste Abweichung bei #${erste}:`);
      console.log(`      alt: ${kurz(ea[erste])}`);
      console.log(`      neu: ${kurz(eb[erste])}`);
    }
    if (ea.length !== eb.length) {
      const mehr = eb.slice(n).map(kurz).slice(0, 6);
      const weniger = ea.slice(n).map(kurz).slice(0, 6);
      if (mehr.length) console.log(`    neu dazu: ${mehr.join(" | ")}`);
      if (weniger.length) console.log(`    fehlt nun: ${weniger.join(" | ")}`);
    }
  }
  return abweichungen;
}

const args = process.argv.slice(2);
const schreiben = args.includes("--schreiben");
const pfad = args.find(a => !a.startsWith("--")) || STD;

if (schreiben) {
  const stand = aufnehmen();
  fs.mkdirSync(path.dirname(pfad), { recursive: true });
  fs.writeFileSync(pfad, JSON.stringify(stand, null, 1));
  const zahl = Object.values(stand).reduce((s, x) => s + (x.ereignisse ? x.ereignisse.length : 0), 0);
  console.log(`Referenzstand geschrieben: ${pfad}`);
  for (const [name, x] of Object.entries(stand)) {
    if (x.fehler) { console.log(`  ${name}: FEHLER ${x.fehler}`); continue; }
    const bei = [x.ok ? "ok" : "nicht ok", x.grund ? `Grund ${x.grund}` : null, x.lease ? `Lease ${x.lease.ip}` : null].filter(Boolean).join(", ");
    console.log(`  ${name}: ${x.ereignisse.length} Ereignisse (${bei})`);
  }
  console.log(`  zusammen ${zahl} Ereignisse`);
  process.exit(0);
}

if (!fs.existsSync(pfad)) {
  console.error(`Kein Referenzstand unter ${pfad} – erst mit --schreiben aufnehmen.`);
  process.exit(2);
}
const ab = vergleichen(JSON.parse(fs.readFileSync(pfad, "utf8")), aufnehmen());
console.log(ab ? `\n${ab} Szenario(en) verändert.` : "\nSimulation unverändert gegenüber dem Referenzstand.");
process.exit(ab ? 1 : 0);
