"use strict";
/* ---------- Terminal-Hilfe (Baustein B): Vertrag „Hilfestellung – Stufen und Schnittstellen" § 2 und § 4 ----------
   Geprüft wird dreierlei:
     1. die Datenform (DATEN.hilfen.VORSCHLAEGE / GERUEST / SYNTAX) nach § 4,
     2. die Wirkung je Bildungsstand (§ 2: azubi 1 Vorschlag, azubi-plus 2, geselle nur nach Fehler, meister keiner),
     3. „Wirkung vor Grün": JEDER Vorschlag wird in der ECHTEN CLI ausgeführt – „pruefen" ändert keine
        Konfiguration, „aendern" ändert sie wirklich.
   Stufenprüfungen laufen in einer Kapsel: die Einstellungen (store „einst") werden danach wiederhergestellt.
   Baustein A (Spiel.stufe) wird benutzt, wenn er da ist; fehlt er, prüft dieselbe Erwartung den Rückfall. */
/* ===================================================================================================
   UI-TEIL: der Vorschlagsstreifen (Vertrag § 4.1) – über den ECHTEN Weg, nicht nur den eigenen Aufruf
   tests/run.js lädt src/ui/* nicht (die UI-Schicht braucht `document`). Dieser Abschnitt lädt
   src/ui/dom.js + src/ui/hilfe.js + src/ui/konsole.js in einem eigenen vm-Bereich mit nachgebildetem DOM
   und prüft genau den Weg aus § 4.1: UI.konsole.oeffnen hängt den Streifen UNTER den Schirm, eine
   Enter-Zeile im Textfeld löst ausfuehren → UI.hilfe.aktualisieren aus, ein Mausklick setzt den Befehl
   in die Eingabe bzw. führt ihn aus – und beim Zeichnen wird kein Fokus geklaut.
   Steht `require` nicht zur Verfügung, sagen die Testnamen das ausdrücklich (kein stilles Grün).
   Allein lauffähig:  node tests/spiel-hilfe-vorschlaege.test.js */
function hlHatRequire(){ try { return typeof require === "function"; } catch (e) { return false; } }
const HL_KANN_LADEN = (() => {
  try { return hlHatRequire() && typeof document === "undefined" && typeof Spiel === "object" && Spiel !== null; } catch (e) { return false; }
})();
const HL_ZUSATZ = HL_KANN_LADEN ? "" : " (kein require im Testbereich – nur allein lauffähig: node tests/spiel-hilfe-vorschlaege.test.js)";

/* Dieselbe Ladereihenfolge wie tests/run.js; danach läuft dieselbe Datei noch einmal – dann mit DOM-Ersatz. */
function hlAlleinLaden(){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const W = path.resolve(__dirname, ".."), SRC = path.join(W, "src");
  const SCH = [["kern", ["basis.js", "netz.js"]], ["@lernmotor", []], ["modell", ["geraete.js"]], ["sim", ["engine.js"]],
               ["cli", ["parser.js"]], ["daten", ["basis.js"]], ["spiel", ["zustand.js"]]];
  const LM = [path.resolve(W, "..", "FISI-Spielhalle", "src", "lernmotor.js"), path.join(W, "fremd", "lernmotor.js")].find(f => fs.existsSync(f));
  const KOPF = /^\/\*\s*=+[\s\S]*?=+\s*\*\/\s*/;
  const code = ['"use strict"; const LABOR_VERSION = "test";'];
  for (const [ordner, kopf] of SCH) {
    if (ordner === "@lernmotor") { let t = fs.readFileSync(LM, "utf8"); if (LM.includes("fremd")) t = t.replace(KOPF, ""); code.push(t); continue; }
    const d = path.join(SRC, ordner), alle = fs.readdirSync(d).filter(n => n.endsWith(".js")).sort();
    for (const n of [...kopf.filter(x => alle.includes(x)), ...alle.filter(x => !kopf.includes(x))]) code.push(fs.readFileSync(path.join(d, n), "utf8"));
  }
  code.push(fs.readFileSync(path.join(__dirname, "harness.js"), "utf8"));
  code.push(fs.readFileSync(__filename, "utf8"));
  code.push("testsAusfuehren();");
  const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename});
  let ergebnisse;
  try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "spiel-hilfe-vorschlaege.test.js"}); }
  catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
  const rot = ergebnisse.filter(e => !e.ok);
  for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
  console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
  process.exit(rot.length ? 1 : 0);
}
if (typeof Spiel === "undefined" && typeof document === "undefined" && hlHatRequire()) hlAlleinLaden();

gruppe("Terminal-Hilfe: Vorschläge", () => {
  const LEITER = ["link", "vlan", "ip", "gateway", "route", "dienst"];
  const ARTEN = ["ios", "host-windows", "host-linux", "fw", "alle"];
  const MODI = ["user", "priv", "config", "if", "subif", "range", "vlan", "line", "std", "ext", "dhcp",
                "fwUser", "fwPriv", "host", ""];
  const KONFIG_STUFEN = {
    "azubi":      {rang: 1, vorschlaege: 1, leiter: "immer",      tipps: "alle"},
    "azubi-plus": {rang: 2, vorschlaege: 2, leiter: "immer",      tipps: "fehler"},
    "geselle":    {rang: 3, vorschlaege: 1, leiter: "nachfehler", tipps: "fehler"},
    "meister":    {rang: 4, vorschlaege: 0, leiter: "nein",       tipps: "keine"},
  };
  /* Ein Befund wie „kein DNS-Server" ist kein Syntaxfehler – nur echte Tippfehler zählen hier. */
  const SYNTAXFEHLER = /Invalid input|Incomplete command|Ambiguous command|Unrecognized command|Unrecognized host|nicht gefunden|command not found|No such file|Folgender Befehl wurde nicht gefunden|falsch geschrieben/i;

  const artVon = g => g.typ === "firewall" ? "fw" : Modell.IOS[g.typ] ? "ios" :
    Modell.HOST[g.typ] ? (Modell.osVon(g) === "linux" ? "host-linux" : "host-windows") : null;

  const kapsel = fn => {
    const altEinst = store.get("einst", {}), altIntern = Spiel._einst, altStufe = Spiel.stufe;
    try { fn(); }
    finally { store.set("einst", altEinst); Spiel._einst = altIntern; Spiel.stufe = altStufe; }
  };
  /* Bildungsstand setzen – über Baustein A, wenn vorhanden, sonst über eine Attrappe mit denselben Zahlen. */
  const mitStufe = (id, fn) => kapsel(() => {
    if (Spiel.stufe && typeof Spiel.stufe.setzen === "function") { Spiel.stufe.setzen(id, {still: true}); fn(); return; }
    const alt = Spiel.stufe, k = KONFIG_STUFEN[id];
    Spiel.stufe = {id: () => id, rang: () => k.rang, kann: f => k[f], def: () => ({id, kurz: id}),
      erklaerung: () => id === "meister" ? "nurcodes" : id === "geselle" ? "knapp" : "ausfuehrlich", konto: () => null};
    try { fn(); } finally { Spiel.stufe = alt; }
  });
  /* Rückfallpfad: kein Baustein A und keine Einstellung -> „azubi" (Vertrag § 3 Regel 1). */
  const ohneStufe = fn => kapsel(() => {
    const alt = Spiel.stufe;
    Spiel.stufe = undefined; Spiel._einst = null; store.set("einst", {});
    try { fn(); } finally { Spiel.stufe = alt; }
  });

  /* Netz mit Adressen: alles erreichbar, was die prüfenden Vorschläge ansprechen. */
  function netzMitAdressen(){
    const n = Modell.neu();
    Modell.geraet(n, "router", {id: "r1", name: "R1"});
    Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
    Modell.geraet(n, "pc", {id: "pc1", name: "PC1"});
    Modell.geraet(n, "server", {id: "srv1", name: "SRV1"});
    Modell.geraet(n, "firewall", {id: "fw1", name: "FW1"});
    Modell.verbinden(n, {geraet: "sw1", port: "Gi0/1"}, {geraet: "r1", port: "Gi0/0"});
    Modell.verbinden(n, {geraet: "pc1"}, {geraet: "sw1", port: "Fa0/1"});
    Modell.verbinden(n, {geraet: "srv1"}, {geraet: "sw1", port: "Fa0/2"});
    Modell.verbinden(n, {geraet: "fw1", port: "Gi0/0"}, {geraet: "r1", port: "Gi0/1"});
    for (const [id, ip, gw] of [["pc1", "192.168.10.10", "192.168.10.1"], ["srv1", "192.168.10.20", "192.168.10.1"]]) {
      Modell.setzen(n, id, "if.eth0.ip", ip); Modell.setzen(n, id, "if.eth0.maske", "255.255.255.0"); Modell.setzen(n, id, "if.eth0.gw", gw);
    }
    Modell.setzen(n, "r1", "if.Gi0/0.ip", "192.168.10.1"); Modell.setzen(n, "r1", "if.Gi0/0.maske", "255.255.255.0"); Modell.setzen(n, "r1", "if.Gi0/0.shutdown", false);
    Modell.setzen(n, "sw1", "svi.1.ip", "192.168.10.2"); Modell.setzen(n, "sw1", "svi.1.maske", "255.255.255.0");
    Modell.setzen(n, "fw1", "if.Gi0/0.ip", "192.168.20.1"); Modell.setzen(n, "fw1", "if.Gi0/0.maske", "255.255.255.0");
    return n;
  }
  /* Frisches Netz ohne Adressen: für die ändernden Vorschläge, sonst kollidiert das Beispiel
     „ip address 192.168.10.1 …" mit einer schon vergebenen Adresse. */
  function netzFrisch(){
    const n = Modell.neu();
    Modell.geraet(n, "router", {id: "r1", name: "R1"});
    Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
    Modell.geraet(n, "pc", {id: "pc1", name: "PC1"});
    Modell.geraet(n, "server", {id: "srv1", name: "SRV1"});
    Modell.geraet(n, "firewall", {id: "fw1", name: "FW1"});
    Modell.verbinden(n, {geraet: "sw1", port: "Gi0/1"}, {geraet: "r1", port: "Gi0/0"});
    Modell.verbinden(n, {geraet: "pc1"}, {geraet: "sw1", port: "Fa0/1"});
    return n;
  }
  /* Die Konfiguration aller Geräte – genau das, was ein „pruefen"-Vorschlag nicht anfassen darf. */
  const konfiguration = n => JSON.stringify(Object.values(n.geraete).map(g => [g.running, g.startup, g.flash || null]));

  const geraetFuer = (n, v) => Object.values(n.geraete).find(g => (v.geraet === "alle" || v.geraet === artVon(g)) && (!v.nurTyp || v.nurTyp.includes(g.typ))) || null;
  const modusFuer = (v) => v.modus && v.modus.length ? v.modus[0] : (v.geraet === "fw" ? "fwPriv" : v.geraet === "ios" ? "priv" : "host");
  /* In den Modus kommen, den der Vorschlag nennt – über die echten CLI-Befehle, nicht am Modell vorbei. */
  function sitzungIn(n, id, modus){
    const s = CLI.sitzung(n, id), g = n.geraete[id];
    if (["priv", "config", "if", "subif", "range", "vlan", "fwPriv"].includes(modus)) CLI.eingabe(s, "enable");
    if (["config", "if", "subif", "range", "vlan"].includes(modus)) CLI.eingabe(s, "configure terminal");
    if (modus === "if") CLI.eingabe(s, g.typ === "switch" ? "interface Fa0/1" : "interface Gi0/1");
    if (modus === "subif") CLI.eingabe(s, "interface Gi0/1.10");
    if (modus === "range") CLI.eingabe(s, "interface range fa0/1 - 2");
    if (modus === "vlan") CLI.eingabe(s, "vlan 10");
    return s;
  }

  pruefe("§ 4: Pflichtfelder, Bereiche, Ebenen – mindestens 12 Vorschläge über alle sechs Leiter-Sprossen", () => {
    const V = DATEN.hilfen.VORSCHLAEGE;
    erwarte.wahr(Array.isArray(V), "DATEN.hilfen.VORSCHLAEGE ist eine Liste");
    erwarte.wahr(V.length >= 12, "mindestens 12 Vorschläge, sind " + V.length);
    const ids = new Set(), bereiche = new Set();
    for (const v of V) {
      erwarte.wahr(typeof v.id === "string" && /^[a-z][a-z0-9-]+$/.test(v.id), "id: " + v.id);
      erwarte.falsch(ids.has(v.id), "id doppelt: " + v.id);
      ids.add(v.id); bereiche.add(v.bereich);
      erwarte.wahr(LEITER.includes(v.bereich), v.id + ": bereich „" + v.bereich + "“ ist keine Spiel.LEITER-id");
      erwarte.wahr(Array.isArray(v.skills) && v.skills.length > 0, v.id + ": skills fehlen");
      for (const s of v.skills) erwarte.wahr(DATEN.skills.some(x => x.id === s), v.id + ": unbekannte Fertigkeit " + s);
      erwarte.wahr(typeof v.befehl === "string" && v.befehl.trim().length > 0, v.id + ": befehl fehlt");
      erwarte.wahr(typeof v.erklaerung === "string" && v.erklaerung.length >= 20, v.id + ": erklaerung zu kurz");
      erwarte.wahr(typeof v.syntax === "string" && v.syntax.length >= 3, v.id + ": syntax fehlt");
      erwarte.wahr(ARTEN.includes(v.geraet), v.id + ": geraet „" + v.geraet + "“");
      erwarte.wahr(Array.isArray(v.modus), v.id + ": modus ist keine Liste");
      for (const m of v.modus) erwarte.wahr(MODI.includes(m), v.id + ": unbekannter Modus " + m);
      erwarte.wahr([1, 2, 3].includes(v.ebene), v.id + ": ebene " + v.ebene);
      erwarte.wahr(["pruefen", "aendern"].includes(v.art), v.id + ": art " + v.art);
      if (v.nurTyp) for (const t of v.nurTyp) erwarte.wahr(Modell.TYPEN.includes(t), v.id + ": unbekannter Gerätetyp " + t);
      /* Das Muster darf Platzhalter haben, der Befehl nicht: er muss so im Terminal stehen können. */
      erwarte.falsch(/[<>]/.test(v.befehl), v.id + ": befehl enthält noch einen Platzhalter");
    }
    erwarte.gleich([...bereiche].sort(), [...LEITER].sort(), "alle sechs Bereiche sind belegt");
    erwarte.wahr(V.some(v => v.art === "aendern"), "mindestens ein Vorschlag ändert etwas");
    erwarte.wahr(V.some(v => v.art === "pruefen"), "mindestens ein Vorschlag prüft nur");
  });

  pruefe("§ 4: Gerüst je CLI-Modus (Text, kein Befehl) und mindestens sechs Syntax-Brücken", () => {
    const G = DATEN.hilfen.GERUEST;
    for (const art of ["ios", "host-windows", "host-linux", "fw"]) {
      erwarte.wahr(G[art] && typeof G[art] === "object", "GERUEST." + art + " fehlt");
      for (const [modus, text] of Object.entries(G[art]))
        erwarte.wahr(typeof text === "string" && text.length > 20, "GERUEST." + art + "." + modus + " zu kurz");
    }
    for (const modus of ["user", "priv", "config", "if", "vlan", "dhcp"])
      erwarte.wahr(typeof G.ios[modus] === "string", "GERUEST.ios." + modus + " fehlt");
    erwarte.wahr(typeof G["host-windows"].host === "string" && typeof G["host-linux"].host === "string", "Gerüst der beiden Host-Arten");
    erwarte.gleich(Object.keys(G.fw).sort(), ["fwPriv", "fwUser"], "Firewall-Gerüst für beide Modi");

    const S = DATEN.hilfen.SYNTAX;
    const bruecken = Object.keys(S);
    erwarte.wahr(bruecken.length >= 6, "mindestens 6 Syntax-Brücken, sind " + bruecken.length);
    for (const key of bruecken) {
      const e = S[key];
      erwarte.wahr(typeof e.titel === "string" && e.titel.length > 3, key + ": titel fehlt");
      erwarte.wahr(typeof e.erkennt === "string" && e.erkennt.length > 2, key + ": erkennt (Suchmuster) fehlt");
      erwarte.wahr(typeof e.hinweis === "string" && e.hinweis.length > 10, key + ": hinweis fehlt");
      erwarte.wahr(e.ios || e.host || e["host-linux"], key + ": kein Muster für eine Geräteart");
      for (const m of [e.ios, e.host, e["host-linux"], e.fw]) if (m != null) erwarte.gleich(typeof m, "string", key + ": Muster ist kein Text");
    }
  });

  pruefe("§ 2: azubi 1 Vorschlag · azubi-plus 2 · geselle nur nach Fehler · meister keiner", () => {
    const n = netzMitAdressen();
    const zahl = (id, o) => Spiel.hilfe.passend(Object.assign({netz: n, id: "r1", modus: "priv"}, o)).length;
    mitStufe("azubi", () => {
      erwarte.gleich(zahl("r1"), 1, "azubi sieht genau einen Vorschlag");
      const p = Spiel.hilfe.passend({netz: n, id: "r1", modus: "priv"});
      erwarte.wahr(LEITER.includes(p[0].bereich), "bereich aus der Leiter");
      erwarte.wahr(typeof p[0].warum === "string" && p[0].warum.length > 10, "warum fehlt: " + p[0].warum);
      erwarte.wahr(typeof p[0].syntax === "string" && p[0].syntax.length > 3, "syntax fehlt");
    });
    mitStufe("azubi-plus", () => erwarte.gleich(zahl("r1"), 2, "azubi-plus sieht bis zu zwei Vorschläge"));
    mitStufe("geselle", () => {
      erwarte.gleich(zahl("r1"), 0, "geselle sieht vor dem Fehler keinen Vorschlag");
      erwarte.gleich(zahl("r1", {letzterFehler: {fehler: true}}), 1, "nach dem Fehler genau einen");
      erwarte.gleich(zahl("r1", {letzterFehler: {fehler: false, prompt: "R1#"}}), 0, "ein Erfolg ist kein Fehler");
    });
    mitStufe("meister", () => {
      erwarte.gleich(zahl("r1"), 0, "meister bekommt keinen Vorschlag");
      erwarte.gleich(zahl("r1", {letzterFehler: {fehler: true}}), 0, "auch nicht nach einem Fehler");
    });
    mitStufe("azubi", () => mitStufe("meister", () => erwarte.wahr(true, "Stufenwechsel möglich")));
    /* azubi sieht mehr als meister – die Kernaussage des Auftrags. */
    let azubi = 0, meister = 0;
    mitStufe("azubi", () => { azubi = zahl("r1"); });
    mitStufe("meister", () => { meister = zahl("r1"); });
    erwarte.wahr(azubi > meister, "azubi " + azubi + " > meister " + meister);
  });

  pruefe("§ 3: ohne Baustein A (Spiel.stufe fehlt) gilt der Rückfall azubi", () => {
    const n = netzMitAdressen();
    ohneStufe(() => {
      erwarte.gleich(Spiel.hilfe.passend({netz: n, id: "r1", modus: "priv"}).length, 1, "Rückfall azubi");
      erwarte.gleich(Spiel.hilfe.passend({netz: n, id: "r1", modus: "priv", max: 1}).length, 1);
      erwarte.wahr(typeof Spiel.hilfe.geruest({netz: n, id: "r1", modus: "priv"}) === "string", "Gerüst trotz fehlender Stufe");
      erwarte.gleich(Spiel.hilfe.leiter({netz: n, id: "r1", modus: "priv"}).length, 6, "alle sechs Sprossen");
    });
    /* max begrenzt nur nach unten – die Vertragszahl bleibt die Obergrenze. */
    mitStufe("azubi", () => erwarte.gleich(Spiel.hilfe.passend({netz: n, id: "r1", modus: "priv", max: 5}).length, 1, "max hebt die Stufenzahl nicht an"));
    mitStufe("meister", () => erwarte.gleich(Spiel.hilfe.passend({netz: n, id: "r1", modus: "priv", max: 5}).length, 0, "meister bleibt bei 0"));
  });

  pruefe("Vorschläge passen zu Gerät, Modus und Typ (kein Befehl für das falsche Gerät)", () => {
    const n = netzMitAdressen();
    mitStufe("azubi", () => {
      for (const [id, modus] of [["r1", "user"], ["r1", "priv"], ["r1", "config"], ["r1", "if"], ["sw1", "priv"], ["sw1", "if"],
                                 ["sw1", "range"], ["pc1", "host"], ["srv1", "host"], ["fw1", "fwUser"], ["fw1", "fwPriv"]]) {
        const g = n.geraete[id], art = artVon(g);
        for (const v of Spiel.hilfe.passend({netz: n, id, modus, max: 2})) {
          erwarte.wahr(v.geraet === "alle" || v.geraet === art, v.id + " gehört zu " + v.geraet + ", nicht zu " + art);
          erwarte.wahr(!v.modus.length || v.modus.includes(modus), v.id + " gilt nicht im Modus " + modus);
          erwarte.wahr(!v.nurTyp || v.nurTyp.includes(g.typ), v.id + " gilt nicht für " + g.typ);
        }
      }
    });
    mitStufe("azubi-plus", () => {
      const vorschlag = (id, modus, bereich) => (Spiel.hilfe.leiter({netz: n, id, modus}).find(s => s.id === bereich) || {}).vorschlag || null;
      erwarte.gleich(vorschlag("r1", "priv", "vlan"), null, "show vlan brief kennt nur ein Switch");
      erwarte.gleich(vorschlag("sw1", "priv", "vlan").befehl, "show vlan brief");
      erwarte.gleich(vorschlag("pc1", "host", "ip").befehl, "ipconfig /all", "Windows-Rechner");
      erwarte.gleich(vorschlag("srv1", "host", "ip").befehl, "ip r", "Linux-Server – kein ipconfig");
      erwarte.gleich(vorschlag("r1", "config", "gateway"), null, "ip default-gateway gibt es nur am Switch");
      erwarte.gleich(vorschlag("sw1", "config", "gateway").befehl, "ip default-gateway 192.168.10.1");
      erwarte.gleich(vorschlag("r1", "config", "route").befehl, "ip route 192.168.20.0 255.255.255.0 192.168.10.2");
      erwarte.gleich(vorschlag("r1", "user", "link").befehl, "enable", "im Benutzermodus zuerst enable");
      erwarte.gleich(vorschlag("fw1", "fwPriv", "dienst").befehl, "show running-config", "Firewall nur Anzeige");
    });
  });

  pruefe("geruest(): azubi ausführlich, azubi-plus knapp, geselle und meister nichts", () => {
    const n = netzMitAdressen();
    mitStufe("azubi", () => {
      for (const [id, modus] of [["r1", "user"], ["r1", "priv"], ["r1", "config"], ["r1", "if"], ["sw1", "vlan"], ["pc1", "host"], ["srv1", "host"], ["fw1", "fwPriv"]]) {
        const t = Spiel.hilfe.geruest({netz: n, id, modus});
        erwarte.wahr(typeof t === "string" && t.length > 20, id + "/" + modus + ": kein Gerüst");
      }
      erwarte.wahr(Spiel.hilfe.geruest({netz: n, id: "r1", modus: "priv"}).includes("\n"), "azubi sieht den ausführlichen Text");
    });
    mitStufe("azubi-plus", () => {
      const t = Spiel.hilfe.geruest({netz: n, id: "r1", modus: "priv"});
      erwarte.wahr(typeof t === "string" && t.length > 10, "azubi-plus sieht einen knappen Text");
      erwarte.falsch(t.includes("\n"), "azubi-plus bekommt nur die Kurzfassung");
    });
    mitStufe("geselle", () => erwarte.gleich(Spiel.hilfe.geruest({netz: n, id: "r1", modus: "priv"}), null, "geselle: kein Gerüst"));
    mitStufe("meister", () => erwarte.gleich(Spiel.hilfe.geruest({netz: n, id: "r1", modus: "priv"}), null, "meister: kein Gerüst"));
  });

  pruefe("leiter(): sechs Sprossen mit passendem Befehl – die bestehende Hilfeleiter bleibt unverändert", () => {
    const n = netzMitAdressen();
    erwarte.gleich(typeof Spiel.hilfe, "function", "Spiel.hilfe bleibt die Hilfeleiter-Funktion");
    erwarte.gleich(Spiel.HILFE.length, 7, "sieben Hilfestufen");
    erwarte.gleich(Spiel.LEITER.map(s => s.id), LEITER, "die sechs Leiter-Sprossen");
    erwarte.gleich(typeof Spiel.naechsteHilfe, "function");
    erwarte.gleich(typeof Spiel.hilfeInhalt, "function");
    mitStufe("azubi", () => {
      const l = Spiel.hilfe.leiter({netz: n, id: "r1", modus: "priv"});
      erwarte.gleich(l.map(s => s.id), LEITER, "alle sechs Sprossen, in Leiter-Reihenfolge");
      for (const s of l) {
        erwarte.wahr(typeof s.frage === "string" && s.frage.length > 10, s.id + ": Frage fehlt");
        erwarte.wahr(typeof s.werkzeug === "string" && s.werkzeug.length > 5, s.id + ": Werkzeug fehlt");
        erwarte.wahr(s.vorschlag === null || s.vorschlag.bereich === s.id, s.id + ": Vorschlag gehört zum falschen Bereich");
      }
      erwarte.wahr(l.find(s => s.id === "link").vorschlag !== null, "für Link gibt es einen Prüfbefehl");
      const dran = Spiel.hilfe.leiter({netz: n, id: "r1", modus: "priv", skill: "lab.link"});
      erwarte.wahr(dran.find(s => s.id === "link").dran, "die Fertigkeit markiert ihre Sprosse");
    });
    mitStufe("geselle", () => {
      erwarte.gleich(Spiel.hilfe.leiter({netz: n, id: "r1", modus: "priv"}).length, 0, "geselle: Leiter erst nach Fehler");
      erwarte.gleich(Spiel.hilfe.leiter({netz: n, id: "r1", modus: "priv", letzterFehler: {fehler: true}}).length, 6);
    });
    mitStufe("meister", () => erwarte.gleich(Spiel.hilfe.leiter({netz: n, id: "r1", modus: "priv"}).length, 0, "meister: keine Leiter"));
  });

  pruefe("syntaxBruecke(): Tippfehler → Muster der richtigen Geräteart; ungefragt nur bei azubi", () => {
    const n = netzMitAdressen();
    const f = {fehler: true};
    mitStufe("azubi", () => {
      const ios = Spiel.hilfe.syntaxBruecke({netz: n, id: "r1", modus: "config", text: "ip adress 10.0.0.1", fehler: f});
      erwarte.gleich(ios.titel, "IP-Adresse setzen");
      erwarte.gleich(ios.muster, "ip address <IP> <Maske>");
      erwarte.wahr(typeof ios.beispiel === "string" && ios.beispiel.length > 5, "azubi bekommt ein Beispiel");
      const win = Spiel.hilfe.syntaxBruecke({netz: n, id: "pc1", modus: "host", text: "ip adresse setzen", fehler: f});
      erwarte.passt(win.muster, /netsh interface ip set address/, "Windows-Muster");
      const lin = Spiel.hilfe.syntaxBruecke({netz: n, id: "srv1", modus: "host", text: "ip adresse setzen", fehler: f});
      erwarte.passt(lin.muster, /ip addr add/, "Linux-Muster");
      erwarte.gleich(Spiel.hilfe.syntaxBruecke({netz: n, id: "r1", modus: "config", text: "vlan 10", fehler: f}).muster, "switchport access vlan <VLAN>");
      erwarte.gleich(Spiel.hilfe.syntaxBruecke({netz: n, id: "pc1", modus: "host", text: "irgendwas völlig anderes", fehler: f}), null, "kein Muster für Unbekanntes");
      erwarte.gleich(Spiel.hilfe.syntaxBruecke({netz: n, id: "pc1", modus: "host", text: "", fehler: f}), null, "ohne Text keine Brücke");
      /* „ich will X" ohne Fehler: der Azubi darf die Brücke sehen. */
      erwarte.wahr(Spiel.hilfe.syntaxBruecke({netz: n, id: "pc1", modus: "host", text: "ich will die ip adresse setzen", fehler: null}) !== null);
    });
    mitStufe("azubi-plus", () => {
      const b = Spiel.hilfe.syntaxBruecke({netz: n, id: "pc1", modus: "host", text: "ip adresse setzen", fehler: f});
      erwarte.gleich(b.beispiel, null, "azubi-plus: knapp, ohne Beispiel");
      erwarte.gleich(Spiel.hilfe.syntaxBruecke({netz: n, id: "pc1", modus: "host", text: "ip adresse setzen", fehler: null}), null, "azubi-plus: nur nach Fehler");
    });
    mitStufe("geselle", () => erwarte.wahr(Spiel.hilfe.syntaxBruecke({netz: n, id: "r1", modus: "priv", text: "route anlegen", fehler: f}) !== null, "geselle: knapp nach Fehler"));
    mitStufe("meister", () => erwarte.gleich(Spiel.hilfe.syntaxBruecke({netz: n, id: "r1", modus: "priv", text: "ip adress", fehler: f}), null, "meister: keine ungefragte Hilfe"));
  });

  pruefe("Wirkung: jeder „pruefen\"-Vorschlag läuft in der echten CLI und ändert keine Konfiguration", () => {
    const V = DATEN.hilfen.VORSCHLAEGE.filter(v => v.art === "pruefen");
    erwarte.wahr(V.length >= 10, "geprüft werden " + V.length + " Vorschläge");
    for (const v of V) {
      const n = netzMitAdressen();
      const g = geraetFuer(n, v);
      erwarte.wahr(!!g, v.id + ": kein passendes Gerät im Testnetz");
      const vorher = konfiguration(n);
      const r = CLI.eingabe(sitzungIn(n, g.id, modusFuer(v)), v.befehl);
      const ausgabe = String(r.ausgabe || "");
      erwarte.falsch(SYNTAXFEHLER.test(ausgabe), v.id + " kennt die CLI nicht (" + v.befehl + "): " + ausgabe.slice(0, 120));
      erwarte.falsch(r.geaendert, v.id + " meldet eine Konfigurationsänderung");
      erwarte.gleich(konfiguration(n), vorher, v.id + " hat die Konfiguration verändert");
      /* Ein Befund („kein DNS-Server") ist erlaubt – er ist das Ergebnis der Prüfung. */
      if (r.fehler) erwarte.passt(ausgabe, /Standardserver sind nicht verfügbar|kein DNS-Server|no servers could be reached|connection timed out|Destination Host Unreachable|Zielhost nicht erreichbar/i,
        v.id + " meldet einen unerwarteten Fehler: " + ausgabe.slice(0, 160));
    }
  });

  pruefe("Wirkung: jeder „aendern\"-Vorschlag ändert die Konfiguration wirklich", () => {
    const V = DATEN.hilfen.VORSCHLAEGE.filter(v => v.art === "aendern");
    erwarte.wahr(V.length >= 3, "geprüft werden " + V.length + " Vorschläge");
    for (const v of V) {
      const n = netzFrisch();
      const g = geraetFuer(n, v);
      erwarte.wahr(!!g, v.id + ": kein passendes Gerät im Testnetz");
      const vorher = konfiguration(n);
      const r = CLI.eingabe(sitzungIn(n, g.id, modusFuer(v)), v.befehl);
      const ausgabe = String(r.ausgabe || "");
      erwarte.falsch(SYNTAXFEHLER.test(ausgabe), v.id + " kennt die CLI nicht (" + v.befehl + "): " + ausgabe.slice(0, 120));
      erwarte.falsch(r.fehler, v.id + " wurde abgelehnt: " + ausgabe.slice(0, 120));
      erwarte.wahr(konfiguration(n) !== vorher, v.id + " hat nichts geändert");
    }
  });
});


/* ---------- DOM-Ersatz (nur für den vm-Bereich) ---------- */
const hlKlassen = el => String(el.className || (el.attrs && el.attrs.class) || "").split(/\s+/).filter(Boolean);
function hlFinde(el, sel){
  const klassen = String(sel).split(".").filter(Boolean), treffer = [];
  const lauf = k => {
    for (const x of k.kinder || []) if (x && typeof x === "object" && x.nodeType === 1) {
      if (klassen.every(c => hlKlassen(x).includes(c))) treffer.push(x);
      lauf(x);
    }
  };
  lauf(el);
  return treffer;
}
const hlTextwert = k => k == null ? "" : typeof k === "string" ? k : (k.nodeType === 3 ? k.text : (k.textContent || ""));
function hlKnoten(tag){
  const el = {tag, nodeType: 1, kinder: [], attrs: {}, className: "", value: "", disabled: false, rows: 1,
    isConnected: true, scrollTop: 0, scrollHeight: 0, eltern: null, listeners: {}, style: {setProperty(){}}, _text: ""};
  el.classList = {
    add(...c){ const s = new Set(hlKlassen(el)); for (const x of c) s.add(x); el.className = [...s].join(" "); },
    remove(...c){ const s = new Set(hlKlassen(el)); for (const x of c) s.delete(x); el.className = [...s].join(" "); },
    toggle(c, an){ const will = an === undefined ? !hlKlassen(el).includes(c) : !!an; if (will) el.classList.add(c); else el.classList.remove(c); },
    contains: c => hlKlassen(el).includes(c),
  };
  el.append = (...k) => {
    for (const x of k.flat(Infinity)) {
      if (x == null || x === false) continue;
      const kind = typeof x === "object" && x.nodeType ? x : {nodeType: 3, text: String(x)};
      if (kind.nodeType === 1) kind.eltern = el;
      el.kinder.push(kind);
    }
  };
  el.appendChild = k => { el.append(k); return k; };
  el.replaceChildren = (...k) => { el.kinder = []; el.append(...k); };
  el.remove = () => { if (el.eltern) el.eltern.kinder = el.eltern.kinder.filter(x => x !== el); el.eltern = null; };
  el.setAttribute = (k, v) => { el.attrs[k] = String(v); if (k === "class") el.className = String(v); };
  el.getAttribute = k => (k in el.attrs ? el.attrs[k] : null);
  el.addEventListener = (art, fn) => { (el.listeners[art] ||= []).push(fn); };
  el.feuern = (art, ev) => { for (const fn of (el.listeners[art] || []).slice()) fn(Object.assign({currentTarget: el, target: el, preventDefault(){}, stopPropagation(){}}, ev)); };
  el.click = () => el.feuern("click", {});
  el.focus = () => { if (HL_DOC) HL_DOC.activeElement = el; };
  el.setSelectionRange = () => {};
  el.querySelector = sel => hlFinde(el, sel)[0] || null;
  el.querySelectorAll = sel => hlFinde(el, sel);
  Object.defineProperty(el, "hidden", {configurable: true,
    get: () => el.attrs.hidden !== undefined, set: v => { if (v) el.attrs.hidden = ""; else delete el.attrs.hidden; }});
  Object.defineProperty(el, "textContent", {configurable: true,
    get: () => el.kinder.length ? el.kinder.map(hlTextwert).join("") : el._text, set: v => { el._text = String(v); el.kinder = []; }});
  Object.defineProperty(el, "firstChild", {configurable: true, get: () => el.kinder[0] || null});
  return el;
}
let HL_DOC = null;
const hlDocument = () => (HL_DOC = {activeElement: null, createElement: t => hlKnoten(t),
  createTextNode: t => ({nodeType: 3, text: String(t)}), querySelector: () => null, querySelectorAll: () => [], body: hlKnoten("body")});

/* ---------- Prüfstand: die echten UI-Dateien in einem eigenen Bereich ---------- */
function hlPruefstand(){
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const doc = hlDocument();
  const bereich = {console, setTimeout: () => {}, clearTimeout: () => {}, Date, Math, JSON, Intl,
    document: doc, Bus: {an: () => () => {}, aus: () => {}, senden: () => {}},
    Spiel, CLI, Modell, DATEN, store};
  vm.createContext(bereich);
  const quellen = ["src/ui/dom.js", "src/ui/hilfe.js", "src/ui/konsole.js"]
    .map(rel => fs.readFileSync(path.join(__dirname, "..", rel), "utf8"));
  const UI_OBJ = vm.runInContext(quellen.join("\n;\n") + "\n;UI", bereich, {filename: "ui-konsole.js"});
  vm.runInContext("UI.labor = {netz: null, zeigeTrace: function(){}, dock: function(){}};", bereich);
  return {document: doc, UI: UI_OBJ};
}

gruppe("UI: Vorschlagsstreifen", () => {
  /* Eigene Helfer dieses Abschnitts (blockgebunden, damit nichts mit anderen Testdateien kollidiert):
     dieselben Zahlen und dieselbe Kapsel wie oben, plus das Netz mit Adressen und die Konfigurationssicht. */
  const STUFEN_UI = {
    "azubi":      {rang: 1, vorschlaege: 1, leiter: "immer",      tipps: "alle"},
    "azubi-plus": {rang: 2, vorschlaege: 2, leiter: "immer",      tipps: "fehler"},
    "geselle":    {rang: 3, vorschlaege: 1, leiter: "nachfehler", tipps: "fehler"},
    "meister":    {rang: 4, vorschlaege: 0, leiter: "nein",       tipps: "keine"},
  };
  const kapsel = fn => {
    const altEinst = store.get("einst", {}), altIntern = Spiel._einst, altStufe = Spiel.stufe;
    try { fn(); }
    finally { store.set("einst", altEinst); Spiel._einst = altIntern; Spiel.stufe = altStufe; }
  };
  const mitStufe = (id, fn) => kapsel(() => {
    if (Spiel.stufe && typeof Spiel.stufe.setzen === "function") { Spiel.stufe.setzen(id, {still: true}); fn(); return; }
    const alt = Spiel.stufe, k = STUFEN_UI[id];
    Spiel.stufe = {id: () => id, rang: () => k.rang, kann: f => k[f], def: () => ({id, kurz: id}),
      erklaerung: () => "ausfuehrlich", konto: () => null};
    try { fn(); } finally { Spiel.stufe = alt; }
  });
  const uiNetz = () => {
    const n = Modell.neu();
    Modell.geraet(n, "router", {id: "r1", name: "R1"});
    Modell.setzen(n, "r1", "if.Gi0/0.ip", "192.168.10.1");
    Modell.setzen(n, "r1", "if.Gi0/0.maske", "255.255.255.0");
    Modell.setzen(n, "r1", "if.Gi0/0.shutdown", false);
    return n;
  };
  const uiKonfiguration = n => JSON.stringify(Object.values(n.geraete).map(g => [g.running, g.startup, g.flash || null]));
  const oeffnen = (p, n) => {
    const container = p.document.createElement("div");
    p.UI.konsole.oeffnen(container, n, "r1", null, {fokus: false});
    return container;
  };
  const tippen = (container, zeile) => {
    const eingabe = container.querySelector(".ko-eingabe");
    eingabe.value = zeile;
    eingabe.feuern("keydown", {key: "Enter", shiftKey: false});
    return eingabe;
  };

  pruefe("Streifen hängt unter dem Schirm: azubi sieht Vorschlag, Gerüst und alle sechs Sprossen" + HL_ZUSATZ, () => {
    if (!HL_KANN_LADEN) return;
    mitStufe("azubi", () => {
      const p = hlPruefstand(), n = uiNetz(), container = oeffnen(p, n);
      const idx = cls => container.kinder.findIndex(k => hlKlassen(k).includes(cls));
      erwarte.wahr(idx("ko-schirm") >= 0, "der Schirm steht");
      erwarte.wahr(idx("hl-huelle") > idx("ko-schirm"), "der Streifen hängt UNTER dem Schirm");
      const streifen = container.querySelector(".hl-streifen");
      erwarte.wahr(!!streifen, "der Streifen wird gezeichnet");
      erwarte.gleich(container.querySelector(".hl-huelle").hidden, false, "die Hülle ist sichtbar");
      const soll = Spiel.hilfe.passend({netz: n, id: "r1", modus: "user"})[0];
      erwarte.gleich(streifen.querySelectorAll(".hl-vorschlag").length, 1, "azubi: genau ein Vorschlag");
      erwarte.gleich(streifen.querySelector(".hl-knopf").textContent, soll.befehl, "der Vorschlag kommt aus Spiel.hilfe");
      erwarte.enthaelt(streifen.querySelector(".hl-geruest").textContent, "Was geht hier?", "das Gerüst ist benannt");
      erwarte.gleich(streifen.querySelectorAll(".hl-sprosse").length, 6, "alle sechs Sprossen der Werkzeugleiter");
      /* Das Muster steht genau dann dabei, wenn es sich vom Befehl unterscheidet (kein doppelter Text). */
      if (soll.syntax !== soll.befehl) erwarte.enthaelt(streifen.textContent, "Muster: " + soll.syntax, "das Muster steht dabei");
      else erwarte.gleich(streifen.querySelectorAll(".hl-syntax").length, 0, "Befehl und Muster gleich → keine zweite Zeile");
      erwarte.wahr(!!streifen.querySelector(".hl-erklaerung"), "die Erklärung steht dabei");
      /* Der E-Vorschlag in der Zeile hat dieselbe eine Quelle: Spiel.hilfe. */
      const zeile = container.querySelector(".ko-vorschlag");
      erwarte.gleich(zeile.hidden, false, "die Vorschlagszeile ist sichtbar");
      erwarte.gleich(zeile.querySelector(".ko-vorschlag-knopf").textContent, soll.befehl, "eine Vorschlagsquelle für Zeile und Streifen");
    });
  });

  pruefe("Maus: Klick setzt den Befehl in die Eingabe – das Zeichnen klaut keinen Fokus" + HL_ZUSATZ, () => {
    if (!HL_KANN_LADEN) return;
    mitStufe("azubi", () => {
      const p = hlPruefstand(), n = uiNetz(), container = oeffnen(p, n);
      const sinnbild = p.document.createElement("button");
      p.document.activeElement = sinnbild;
      const eingabe = tippen(container, "");
      erwarte.wahr(p.document.activeElement === sinnbild, "das Zeichnen nach einer Zeile klaut keinen Fokus");
      const knopf = container.querySelector(".hl-knopf");
      knopf.click();
      erwarte.gleich(eingabe.value, knopf.textContent, "der Klick setzt den Befehl in die Eingabe");
      erwarte.wahr(p.document.activeElement === eingabe, "erst der Klick legt den Fokus in die Eingabe");
    });
  });

  pruefe("Nach jeder Zeile zieht der Streifen nach: Erfolg → neuer Vorschlag, Fehler → Muster und Erklärung" + HL_ZUSATZ, () => {
    if (!HL_KANN_LADEN) return;
    mitStufe("azubi", () => {
      const p = hlPruefstand(), n = uiNetz(), container = oeffnen(p, n);
      tippen(container, "enable");
      const echos = container.querySelectorAll(".ko-echo");
      erwarte.enthaelt(echos[echos.length - 1].textContent, "enable", "die Zeile steht im Echo");
      erwarte.gleich(container.querySelectorAll(".hl-bruecke").length, 0, "nach einer gültigen Zeile kein Muster");
      erwarte.gleich(container.querySelectorAll(".hl-fehler").length, 0, "nach einer gültigen Zeile kein Fehlerkasten");
      tippen(container, "show ip interface brief");
      const soll = Spiel.hilfe.passend({netz: n, id: "r1", modus: "priv", verlauf: ["enable", "show ip interface brief"]})[0];
      erwarte.gleich(container.querySelector(".hl-knopf").textContent, soll.befehl, "nach der Zeile ein neuer Vorschlag");
      /* Fehlerzeile: Konsole meldet, der Streifen erklärt – Muster (Syntax-Brücke) und Text (Baustein E). */
      tippen(container, "ip adress 10.0.0.1");
      const bruecke = container.querySelector(".hl-bruecke");
      erwarte.wahr(!!bruecke, "die Syntax-Brücke steht im Streifen");
      erwarte.enthaelt(bruecke.textContent, "ip address <IP> <Maske>", "mit dem Muster aus DATEN.hilfen.SYNTAX");
      const bloecke = container.querySelectorAll(".ko-block");
      const ausgabe = bloecke.length ? bloecke[bloecke.length - 1].textContent : "";
      const text = typeof Spiel.fehlertext === "function"
        ? Spiel.fehlertext({netz: n, id: "r1", modus: "priv", eingabe: "ip adress 10.0.0.1", fehler: {fehler: true, ausgabe}}) : null;
      const kasten = container.querySelector(".hl-fehler");
      if (text) { erwarte.wahr(!!kasten, "die Erklärung aus Spiel.fehlertext steht im Streifen"); erwarte.enthaelt(kasten.textContent, text.titel); }
      else erwarte.wahr(!kasten, "ohne Erklärung von Baustein E kein Fehlerkasten");
      /* Ein parameterisierter Vorschlag zeigt sein Muster (im if-Modus: ip address <IP> <Maske>) –
         und ein „ändern"-Vorschlag hat bewusst KEINEN Ausführen-Knopf (er darf nicht auf Klick konfigurieren). */
      tippen(container, "configure terminal");
      tippen(container, "interface Gi0/1");
      const musterZeile = container.querySelector(".hl-syntax");
      erwarte.wahr(!!musterZeile, "im Schnittstellenmodus steht ein Vorschlag mit Muster");
      erwarte.enthaelt(musterZeile.textContent, "ip address <IP> <Maske>", "das Muster zum Befehl");
      erwarte.gleich(container.querySelectorAll(".hl-lauf").length, 0, "ein „ändern“-Vorschlag hat keinen Ausführen-Knopf");
      /* Zurück in den privilegierten Modus: dort steht ein prüfender Vorschlag mit Ausführen-Knopf. */
      tippen(container, "end");
      const befehlJetzt = container.querySelector(".hl-knopf").textContent;
      const lauf = container.querySelector(".hl-lauf");
      erwarte.wahr(!!lauf, "ein prüfender Vorschlag hat einen Ausführen-Knopf");
      const vorher = uiKonfiguration(n);
      lauf.click();
      erwarte.gleich(uiKonfiguration(n), vorher, "„Ausführen“ ändert keine Konfiguration");
      erwarte.enthaelt(container.querySelectorAll(".ko-echo").slice(-1)[0].textContent, befehlJetzt, "der Klick hat wirklich ausgeführt");
    });
  });

  pruefe("geselle sieht den Streifen erst nach einem Fehler, meister sieht gar nichts" + HL_ZUSATZ, () => {
    if (!HL_KANN_LADEN) return;
    mitStufe("geselle", () => {
      const p = hlPruefstand(), container = oeffnen(p, uiNetz());
      erwarte.gleich(container.querySelector(".hl-huelle").hidden, true, "geselle: vor dem Fehler kein Streifen");
      erwarte.gleich(container.querySelector(".ko-vorschlag").hidden, true, "geselle: vor dem Fehler kein Vorschlag");
      tippen(container, "hallo");
      const streifen = container.querySelector(".hl-streifen");
      erwarte.wahr(!!streifen, "nach dem Fehler steht der Streifen");
      erwarte.gleich(streifen.querySelectorAll(".hl-vorschlag").length, 1, "genau ein Vorschlag nach dem Fehler");
      erwarte.gleich(streifen.querySelectorAll(".hl-sprosse").length, 6, "die Werkzeugleiter ist sichtbar");
      erwarte.gleich(streifen.querySelectorAll(".hl-geruest").length, 0, "geselle bekommt kein Gerüst");
      erwarte.gleich(container.querySelector(".ko-vorschlag").hidden, false, "der Vorschlag steht auch in der Zeile");
    });
    mitStufe("meister", () => {
      const p = hlPruefstand(), container = oeffnen(p, uiNetz());
      erwarte.gleich(container.querySelector(".hl-huelle").hidden, true, "meister: kein Streifen");
      erwarte.gleich(container.querySelector(".ko-vorschlag").hidden, true, "meister: kein Vorschlag");
      tippen(container, "hallo");
      erwarte.wahr(container.querySelector(".hl-huelle").hidden, "meister: auch nach einem Fehler kein Streifen");
      erwarte.gleich(container.querySelector(".ko-vorschlag").hidden, true, "meister: auch nach einem Fehler kein Vorschlag");
    });
  });
});
