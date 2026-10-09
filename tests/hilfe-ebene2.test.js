"use strict";
/* ---------- Hilfe-Vorschläge: Ebene 2 und die Fertigkeiten ohne Vorschlag (task-8) ----------
   NACHTRAG task-28 (09.10.2026): Die Gegenprüfung (task-23) hat vier WIRKUNGS-Befunde gemeldet, die hier
   jetzt mitgemessen werden – Datenabdeckung allein genügt nicht („Wirkung vor Grün"):
     A2 · Vier Ebene-2-Einträge erschienen NIE: `passend` filtert den Verlauf über den Befehlstext, ein
          Zwilling mit demselben Befehl ist entweder verdeckt (vor dem Tippen) oder mitgefiltert (danach).
     A3 · Zehn Fertigkeiten bekamen nie eine hervorgehobene Sprosse: `leiter` nahm je Sprosse nur den
          ersten Kandidaten, und UI.konsole zeichnet den Streifen ohne `skill`.
     A4 · In manchen Sichten stand derselbe Befehl zweimal im Streifen.
     A1 · `ip-ios-setzen` wurde am Switch angeboten, wo die CLI ihn ablehnt.
   Die Messung dafür: Abschnitt 4 unten – Geräte × Modi × vier Bildungsstände × mit/ohne Fehler × Verlauf.

   Der Vertrag steht in docs/Architektur.md § 13.2/§ 13.3 und in docs/entwicklung/Hilfestellung – Stufen
   und Schnittstellen.md § 4. Geprüft wird:
     1. die Datenform: Pflichtfelder, `bereich` ⊆ Spiel.LEITER, `ebene` ∈ {1,2,3}, `art` ∈ {pruefen,aendern},
     2. dass JEDE der 27 Fertigkeiten aus DATEN.skills mindestens einen Vorschlag hat,
     3. dass Ebene 2 existiert (vorher 0×) und nie eine Konfiguration ändert,
     4. die Staffelung je Bildungsstand (azubi 1 · azubi-plus 2 · geselle 1 nach Fehler · meister 0),
     5. „Wirkung vor Grün": JEDER Vorschlag läuft in der ECHTEN CLI – „pruefen" ändert nichts,
        „aendern" muss die Konfiguration ändern (dieselbe Bauart wie tests/spiel-hilfe-vorschlaege.test.js),
     6. die Sichtbarkeit über den echten Weg: UI.hilfe.zeichnen schreibt die Ebene in den Streifen,
        „genauer nachsehen" steht dort wirklich (eigener vm-Bereich mit nachgebildetem DOM),
     7. die Wirkung über alle Sichten (task-28): kein Vorschlag bleibt unsichtbar, jede Fertigkeit bekommt
        eine hervorgehobene Sprosse, kein Befehl steht zweimal, und kein Vorschlag bietet einen Befehl an,
        den die CLI auf diesem Gerät ablehnt.

   WAS `skills` BEDEUTET (gemessen): `skills` ist KEIN Filter. `kandidaten()` filtert nur über
   geraet/nurTyp/modus/art; `skills` wählt je Leiter-Sprosse den passenden Vorschlag und markiert ihn als
   `dran` (task-28). „Fertigkeit ohne Vorschlag" heißt deshalb: Für sie wird nie eine Sprosse hervorgehoben.

   Allein lauffähig:  node tests/hilfe-ebene2.test.js   (lädt die Schichten selbst in einen vm-Bereich;
   im Alleinlauf druckt Abschnitt 4 die Messzahlen – im Gesamtlauf nicht, dort zählt nur grün/rot) */
(function(){
  const EB2_HAT_REQUIRE = (() => { try { return typeof require === "function"; } catch (e) { return false; } })();
  const EB2_IM_TESTBEREICH = (() => { try { return typeof Spiel === "object" && Spiel !== null; } catch (e) { return false; } })();
  const EB2_ZUSATZ = EB2_IM_TESTBEREICH ? "" : " (nicht prüfbar: kein Spiel im Testbereich und kein require)";

  /* Ohne Testbereich (z. B. von Hand gestartet) die Schichten selbst laden – Reihenfolge wie tests/run.js. */
  function eb2AlleinLaden(){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const W = path.resolve(__dirname, ".."), SRC = path.join(W, "src");
    const SCH = [["kern", ["basis.js", "netz.js"]], ["@lernmotor", []], ["modell", ["geraete.js"]], ["sim", ["engine.js"]],
                 ["cli", ["parser.js"]], ["daten", ["basis.js"]], ["spiel", ["zustand.js"]]];
    const LM = [path.resolve(W, "..", "FISI-Spielhalle", "src", "lernmotor.js"), path.join(W, "fremd", "lernmotor.js")].find(f => fs.existsSync(f));
    if (!LM) { console.error("LADEFEHLER: kein Lernmotor gefunden"); process.exit(2); }
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
    const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename, MESSUNG: true});
    let ergebnisse;
    try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "hilfe-ebene2.test.js"}); }
    catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
    const rot = ergebnisse.filter(e => !e.ok);
    for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
    console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
    const uebersprungen = ergebnisse.filter(e => e.ok && e.zusicherungen === 0).length;
    if (uebersprungen) console.log(`davon ${uebersprungen} übersprungen (Test ohne eine einzige Zusicherung)`);
    process.exit(rot.length ? 1 : 0);
  }
  if (!EB2_IM_TESTBEREICH) {
    if (EB2_HAT_REQUIRE) { eb2AlleinLaden(); return; }
  }

  /* ---------- Konstanten (gemessen: Spiel.LEITER, CLI.MODI, Modell.TYPEN) ---------- */
  const LEITER = ["link", "vlan", "ip", "gateway", "route", "dienst"];
  const ARTEN = ["ios", "host-windows", "host-linux", "fw", "alle"];
  const MODI = [...Object.keys(CLI.MODI), "host", ""];
  /* Die zehn Fertigkeiten, die laut Auftrag bis zum 09.10.2026 KEINEN Vorschlag hatten. */
  const OHNE_VORHER = ["lab.netz", "lab.arp", "lab.subnetz", "lab.dhcp", "lab.tcp",
                       "lab.rostick", "lab.portfwd", "lab.portsec", "lab.stp", "lab.storage"];
  const STUFEN_ZAHL = {"azubi": 1, "azubi-plus": 2, "geselle": 1, "meister": 0};

  /* ---------- Kapsel: Bildungsstand setzen und danach alles wiederherstellen ---------- */
  const kapsel = fn => {
    const altEinst = store.get("einst", {}), altIntern = Spiel._einst, altStufe = Spiel.stufe;
    try { fn(); }
    finally { store.set("einst", altEinst); Spiel._einst = altIntern; Spiel.stufe = altStufe; }
  };
  const mitStufe = (id, fn) => kapsel(() => {
    if (Spiel.stufe && typeof Spiel.stufe.setzen === "function") { Spiel.stufe.setzen(id, {still: true}); fn(); return; }
    /* Baustein A fehlt: Attrappe mit denselben Zahlen aus Vertrag § 2. */
    const alt = Spiel.stufe;
    const zahl = STUFEN_ZAHL[id], rang = {azubi: 1, "azubi-plus": 2, geselle: 3, meister: 4}[id];
    Spiel.stufe = {id: () => id, rang: () => rang, def: () => ({id, kurz: id}), konto: () => null,
      kann: f => f === "vorschlaege" ? zahl : f === "rang" ? rang : f === "geruest" ? (rang >= 3 ? "nein" : rang >= 2 ? "knapp" : "ausfuehrlich") : "immer",
      wannPasst: (flaeche, o) => ({ja: rang < 3 || (rang === 3 && !!o.fehler), grund: "Attrappe"})};
    try { fn(); } finally { Spiel.stufe = alt; }
  });

  /* ---------- Testnetze (wie in tests/spiel-hilfe-vorschlaege.test.js: dort belegt und für alle
       Vorschläge ausreichend – Adressen, Kabel, Firewall, Subinterfaces) ---------- */
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
  const konfiguration = n => JSON.stringify(Object.values(n.geraete).map(g => [g.running, g.startup, g.flash || null]));
  const SYNTAXFEHLER = /Invalid input|Incomplete command|Ambiguous command|Unrecognized command|Unrecognized host|nicht gefunden|command not found|No such file|Folgender Befehl wurde nicht gefunden|falsch geschrieben/i;
  const artVon = g => g.typ === "firewall" ? "fw" : Modell.IOS[g.typ] ? "ios" :
    Modell.HOST[g.typ] ? (Modell.osVon(g) === "linux" ? "host-linux" : "host-windows") : null;
  const geraetFuer = (n, v) => Object.values(n.geraete).find(g => (v.geraet === "alle" || v.geraet === artVon(g)) && (!v.nurTyp || v.nurTyp.includes(g.typ))) || null;
  const modusFuer = v => v.modus && v.modus.length ? v.modus[0] : (v.geraet === "fw" ? "fwPriv" : v.geraet === "ios" ? "priv" : "host");
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

  /* ===================================================================================================
     1 · Datenform (§ 4) und die drei Ebenen
     =================================================================================================== */
  gruppe("Hilfe-Vorschläge: Ebene 2" + EB2_ZUSATZ, () => {
    pruefe("§ 4: Pflichtfelder, Bereiche und Ebenen – `bereich` nur aus Spiel.LEITER" + EB2_ZUSATZ, () => {
      if (!EB2_IM_TESTBEREICH) return;
      const V = DATEN.hilfen.VORSCHLAEGE;
      erwarte.wahr(Array.isArray(V), "DATEN.hilfen.VORSCHLAEGE ist eine Liste");
      erwarte.wahr(V.length >= 44, "mindestens 44 Vorschläge (29 alte + 15 neue), sind " + V.length);
      const ids = new Set();
      for (const v of V) {
        erwarte.wahr(typeof v.id === "string" && /^[a-z][a-z0-9-]+$/.test(v.id), "id: " + v.id);
        erwarte.falsch(ids.has(v.id), "id doppelt: " + v.id);
        ids.add(v.id);
        erwarte.wahr(LEITER.includes(v.bereich), v.id + ": bereich „" + v.bereich + "“ ist keine Spiel.LEITER-id");
        erwarte.wahr(Array.isArray(v.skills) && v.skills.length > 0, v.id + ": skills fehlen");
        for (const s of v.skills) erwarte.wahr(DATEN.skills.some(x => x.id === s), v.id + ": unbekannte Fertigkeit " + s);
        erwarte.wahr(typeof v.befehl === "string" && v.befehl.trim().length > 0, v.id + ": befehl fehlt");
        erwarte.falsch(/[<>]/.test(v.befehl), v.id + ": befehl enthält noch einen Platzhalter");
        erwarte.wahr(typeof v.syntax === "string" && v.syntax.length >= 3, v.id + ": syntax fehlt");
        erwarte.wahr(typeof v.erklaerung === "string" && v.erklaerung.length >= 20, v.id + ": erklaerung zu kurz");
        erwarte.wahr(ARTEN.includes(v.geraet), v.id + ": geraet „" + v.geraet + "“");
        erwarte.wahr(Array.isArray(v.modus), v.id + ": modus ist keine Liste");
        for (const m of v.modus) erwarte.wahr(MODI.includes(m), v.id + ": unbekannter Modus " + m);
        erwarte.wahr([1, 2, 3].includes(v.ebene), v.id + ": ebene " + v.ebene);
        erwarte.wahr(["pruefen", "aendern"].includes(v.art), v.id + ": art " + v.art);
        if (v.nurTyp) for (const t of v.nurTyp) erwarte.wahr(Modell.TYPEN.includes(t), v.id + ": unbekannter Gerätetyp " + t);
      }
      for (const b of LEITER) erwarte.wahr(V.some(v => v.bereich === b), "Bereich " + b + " ist belegt");
    });

    pruefe("Ebene 2 gibt es (nicht mehr 0×) und sie ändert nie eine Konfiguration" + EB2_ZUSATZ, () => {
      if (!EB2_IM_TESTBEREICH) return;
      const V = DATEN.hilfen.VORSCHLAEGE;
      const e1 = V.filter(v => v.ebene === 1), e2 = V.filter(v => v.ebene === 2), e3 = V.filter(v => v.ebene === 3);
      /* Vorher (gemessen 09.10.2026): 22 · 0 · 7. Jetzt darf keine Sprosse mehr leer sein. */
      erwarte.wahr(e1.length > 0, "Ebene 1 ist belegt: " + e1.length);
      erwarte.wahr(e2.length > 0, "Ebene 2 existiert: " + e2.length + " Vorschläge (vorher 0)");
      erwarte.wahr(e3.length > 0, "Ebene 3 ist belegt: " + e3.length);
      erwarte.gleich(e1.length + e2.length + e3.length, V.length, "jede Ebene ist eine der drei Stufen");
      /* Vertrag § 4: 1 = harmlos ansehen, 3 = ändert etwas. Also: nur Ebene 3 ändert, 1 und 2 prüfen. */
      for (const v of e1) erwarte.gleich(v.art, "pruefen", v.id + ": Ebene 1 („ansehen“) muss prüfen");
      for (const v of e2) erwarte.gleich(v.art, "pruefen", v.id + ": Ebene 2 („genauer nachsehen“) darf nichts ändern");
      for (const v of e3) erwarte.gleich(v.art, "aendern", v.id + ": Ebene 3 („ändert etwas“) muss ändern");
    });

    pruefe("Alle 27 Fertigkeiten haben mindestens einen Vorschlag – die 10 vormals leeren sind dabei" + EB2_ZUSATZ, () => {
      if (!EB2_IM_TESTBEREICH) return;
      const V = DATEN.hilfen.VORSCHLAEGE;
      const skills = DATEN.skills.map(s => s.id);
      erwarte.gleich(skills.length, 27, "DATEN.skills führt 27 Fertigkeiten");
      const ohne = skills.filter(s => !V.some(v => (v.skills || []).includes(s)));
      erwarte.gleich(ohne, [], "keine Fertigkeit ohne Vorschlag mehr (vorher 10: " + OHNE_VORHER.join(", ") + ")");
      for (const s of OHNE_VORHER) erwarte.wahr(V.some(v => (v.skills || []).includes(s)), "die vormals leere Fertigkeit " + s + " hat jetzt einen Vorschlag");
    });

    pruefe("`skills` filtert nicht – es wählt je Sprosse den passenden Vorschlag (`dran`)" + EB2_ZUSATZ, () => {
      if (!EB2_IM_TESTBEREICH) return;
      const n = netzMitAdressen();
      mitStufe("azubi", () => {
        const ohne = Spiel.hilfe.leiter({netz: n, id: "sw1", modus: "priv"});
        const mitLink = Spiel.hilfe.leiter({netz: n, id: "sw1", modus: "priv", skill: "lab.link"});
        const mitStp = Spiel.hilfe.leiter({netz: n, id: "sw1", modus: "priv", skill: "lab.stp"});
        const mitFw = Spiel.hilfe.leiter({netz: n, id: "sw1", modus: "priv", skill: "lab.fw"});
        /* `skills` filtert nicht: dieselben Sprossen und dieselben Befehle – nur die WAHL je Sprosse
           richtet sich nach der Fertigkeit (task-28/Befund A3). */
        erwarte.gleich(ohne.length, 6, "alle sechs Sprossen, unabhängig von skills");
        erwarte.gleich(mitStp.length, 6, "auch mit skill bleiben es sechs Sprossen");
        erwarte.gleich(mitFw.map(x => x.vorschlag && x.vorschlag.id), ohne.map(x => x.vorschlag && x.vorschlag.id),
          "eine Fertigkeit ohne Switch-Vorschlag ändert keinen einzigen Vorschlag");
        /* Die Sprosse, deren Vorschlag die Fertigkeit nennt, wird hervorgehoben und zeigt IHREN Vorschlag. */
        const stpDran = mitStp.filter(x => x.dran);
        erwarte.gleich(stpDran.length, 1, "lab.stp hebt genau eine Sprosse hervor");
        erwarte.gleich(stpDran[0].vorschlag.id, "link-switch-schleife", "und zeigt den Vorschlag der Fertigkeit");
        const linkDran = mitLink.filter(x => x.dran);
        erwarte.gleich(linkDran.length, 1, "lab.link hebt genau eine Sprosse hervor");
        erwarte.wahr((linkDran[0].vorschlag.skills || []).includes("lab.link"), "ihr Vorschlag nennt die Fertigkeit");
        erwarte.falsch(mitFw.some(x => x.dran), "lab.fw hat am Switch keinen Vorschlag – nichts wird hervorgehoben");
        /* Ohne skill wird nichts hervorgehoben – die Wahl je Sprosse bleibt der erste Kandidat. */
        erwarte.falsch(ohne.some(x => x.dran), "ohne Fertigkeit wird keine Sprosse hervorgehoben");
        /* Und passend() kennt gar keinen skill-Parameter: die Zahl hängt nur an der Stufe. */
        erwarte.gleich(Spiel.hilfe.passend({netz: n, id: "sw1", modus: "priv", skill: "lab.stp"}).length, 1, "azubi: eine Zahl, unabhängig von skills");
      });
    });

    pruefe("Staffelung je Bildungsstand: azubi 1 · azubi-plus 2 · geselle 1 nach Fehler · meister 0" + EB2_ZUSATZ, () => {
      if (!EB2_IM_TESTBEREICH) return;
      const n = netzMitAdressen();
      const OHNE_FEHLER = {"azubi": 1, "azubi-plus": 2, "geselle": 0, "meister": 0};
      const zahl = o => Spiel.hilfe.passend(Object.assign({netz: n, id: "r1", modus: "priv"}, o)).length;
      mitStufe("azubi", () => erwarte.gleich(zahl(), 1, "azubi sieht genau einen Vorschlag"));
      mitStufe("azubi-plus", () => erwarte.gleich(zahl(), 2, "azubi-plus sieht zwei"));
      mitStufe("geselle", () => {
        erwarte.gleich(zahl(), 0, "geselle vor dem Fehler: keiner");
        erwarte.gleich(zahl({letzterFehler: {fehler: true}}), 1, "geselle nach dem Fehler: einer");
      });
      mitStufe("meister", () => {
        erwarte.gleich(zahl(), 0, "meister: keiner");
        erwarte.gleich(zahl({letzterFehler: {fehler: true}}), 0, "meister auch nach dem Fehler: keiner");
      });
      /* Dieselben Zahlen stehen im Vertrag (Spiel.stufe.kann("vorschlaege")); `max` hebt sie nie an. */
      for (const id of Object.keys(STUFEN_ZAHL)) {
        mitStufe(id, () => {
          if (Spiel.stufe && typeof Spiel.stufe.kann === "function") erwarte.gleich(Number(Spiel.stufe.kann("vorschlaege")), STUFEN_ZAHL[id], id + ": Vertragszahl");
          erwarte.gleich(Spiel.hilfe.passend({netz: n, id: "r1", modus: "priv", max: 9}).length, OHNE_FEHLER[id], id + ": max hebt die Stufenzahl nicht an");
        });
      }
      /* Ebene 2 ist auch in der ersten Zeile angekommen: für azubi-plus steht ein Ebene-2-Vorschlag dabei. */
      mitStufe("azubi-plus", () => {
        const z = Spiel.hilfe.passend({netz: n, id: "r1", modus: "priv"});
        erwarte.wahr(z.some(v => v.ebene === 2), "azubi-plus bekommt einen Ebene-2-Vorschlag: " + z.map(v => v.id + "/E" + v.ebene).join(", "));
      });
    });
  });

  /* ===================================================================================================
     2 · Wirkung vor Grün: JEDER Vorschlag in der echten CLI
     =================================================================================================== */
  gruppe("Hilfe-Vorschläge: Wirkung in der echten CLI" + EB2_ZUSATZ, () => {
    pruefe("Jeder „pruefen“-Vorschlag läuft und ändert keine Konfiguration" + EB2_ZUSATZ, () => {
      if (!EB2_IM_TESTBEREICH) return;
      const V = DATEN.hilfen.VORSCHLAEGE.filter(v => v.art === "pruefen");
      erwarte.wahr(V.length >= 30, "geprüft werden " + V.length + " Vorschläge");
      for (const v of V) {
        const n = netzMitAdressen();
        const g = geraetFuer(n, v);
        erwarte.wahr(!!g, v.id + ": kein passendes Gerät im Testnetz");
        if (!g) continue;
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

    pruefe("Jeder „aendern“-Vorschlag ändert die Konfiguration wirklich" + EB2_ZUSATZ, () => {
      if (!EB2_IM_TESTBEREICH) return;
      const V = DATEN.hilfen.VORSCHLAEGE.filter(v => v.art === "aendern");
      erwarte.wahr(V.length >= 3, "geprüft werden " + V.length + " Vorschläge");
      for (const v of V) {
        const n = netzFrisch();
        const g = geraetFuer(n, v);
        erwarte.wahr(!!g, v.id + ": kein passendes Gerät im Testnetz");
        if (!g) continue;
        const vorher = konfiguration(n);
        const r = CLI.eingabe(sitzungIn(n, g.id, modusFuer(v)), v.befehl);
        const ausgabe = String(r.ausgabe || "");
        erwarte.falsch(SYNTAXFEHLER.test(ausgabe), v.id + " kennt die CLI nicht (" + v.befehl + "): " + ausgabe.slice(0, 120));
        erwarte.falsch(r.fehler, v.id + " wurde abgelehnt: " + ausgabe.slice(0, 120));
        erwarte.wahr(konfiguration(n) !== vorher, v.id + " hat nichts geändert");
      }
    });

    pruefe("Die neuen Ebene-2-Vorschläge tragen jeden Modus, den sie nennen, auch wirklich" + EB2_ZUSATZ, () => {
      if (!EB2_IM_TESTBEREICH) return;
      const n = netzMitAdressen();
      const e2 = DATEN.hilfen.VORSCHLAEGE.filter(v => v.ebene === 2);
      erwarte.wahr(e2.length >= 10, "geprüft werden " + e2.length + " Ebene-2-Vorschläge");
      mitStufe("azubi-plus", () => {
        for (const v of e2) {
          const g = geraetFuer(n, v);
          if (!g) continue;
          /* Der Vorschlag muss in JEDEM seiner Modi ausführbar sein – nicht nur im ersten. */
          for (const modus of (v.modus.length ? v.modus : [modusFuer(v)])) {
            const n2 = netzMitAdressen();
            const r = CLI.eingabe(sitzungIn(n2, g.id, modus), v.befehl);
            erwarte.falsch(SYNTAXFEHLER.test(String(r.ausgabe || "")), v.id + " im Modus " + modus + ": " + String(r.ausgabe || "").slice(0, 120));
          }
        }
      });
    });
  });

  /* ===================================================================================================
     3 · Sichtbarkeit: die Ebene steht im Vorschlagsstreifen (echter Weg über UI.hilfe)
     =================================================================================================== */
  let EB2_DOC = null;
  const eb2Klassen = el => String(el.className || (el.attrs && el.attrs.class) || "").split(/\s+/).filter(Boolean);
  function eb2Finde(el, sel){
    const klassen = String(sel).split(".").filter(Boolean), treffer = [];
    const lauf = k => {
      for (const x of k.kinder || []) if (x && typeof x === "object" && x.nodeType === 1) {
        if (klassen.every(c => eb2Klassen(x).includes(c))) treffer.push(x);
        lauf(x);
      }
    };
    lauf(el);
    return treffer;
  }
  const eb2Text = k => k == null ? "" : typeof k === "string" ? k : (k.nodeType === 3 ? k.text : (k.textContent || ""));
  function eb2Knoten(tag){
    const el = {tag, nodeType: 1, kinder: [], attrs: {}, className: "", value: "", hidden_: false,
      isConnected: true, listeners: {}, style: {setProperty(){}}, _text: ""};
    el.classList = {
      add(...c){ const s = new Set(eb2Klassen(el)); for (const x of c) s.add(x); el.className = [...s].join(" "); },
      remove(...c){ const s = new Set(eb2Klassen(el)); for (const x of c) s.delete(x); el.className = [...s].join(" "); },
      toggle(c, an){ const will = an === undefined ? !eb2Klassen(el).includes(c) : !!an; if (will) el.classList.add(c); else el.classList.remove(c); },
      contains: c => eb2Klassen(el).includes(c),
    };
    el.append = (...k) => {
      for (const x of k.flat(Infinity)) {
        if (x == null || x === false) continue;
        const kind = typeof x === "object" && x.nodeType ? x : {nodeType: 3, text: String(x)};
        if (kind.nodeType === 1) kind.eltern = el;
        el.kinder.push(kind);
      }
    };
    el.replaceChildren = (...k) => { el.kinder = []; el.append(...k); };
    el.setAttribute = (k, v) => { el.attrs[k] = String(v); if (k === "class") el.className = String(v); };
    el.getAttribute = k => (k in el.attrs ? el.attrs[k] : null);
    el.addEventListener = (art, fn) => { (el.listeners[art] ||= []).push(fn); };
    el.feuern = (art, ev) => { for (const fn of (el.listeners[art] || []).slice()) fn(Object.assign({currentTarget: el, target: el, preventDefault(){}, stopPropagation(){}}, ev)); };
    el.click = () => el.feuern("click", {});
    el.focus = () => { if (EB2_DOC) EB2_DOC.activeElement = el; };
    el.setSelectionRange = () => {};
    el.querySelector = sel => eb2Finde(el, sel)[0] || null;
    el.querySelectorAll = sel => eb2Finde(el, sel);
    Object.defineProperty(el, "hidden", {configurable: true,
      get: () => el.attrs.hidden !== undefined, set: v => { if (v) el.attrs.hidden = ""; else delete el.attrs.hidden; }});
    Object.defineProperty(el, "textContent", {configurable: true,
      get: () => el.kinder.length ? el.kinder.map(eb2Text).join("") : el._text, set: v => { el._text = String(v); el.kinder = []; }});
    return el;
  }
  /* src/ui/* braucht `document`; dieser Bereich lädt genau die zwei Dateien, die den Streifen bauen. */
  function eb2Pruefstand(){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    EB2_DOC = {activeElement: null, createElement: t => eb2Knoten(t), createTextNode: t => ({nodeType: 3, text: String(t)}),
      querySelector: () => null, querySelectorAll: () => [], body: eb2Knoten("body")};
    const bereich = {console, setTimeout: () => {}, clearTimeout: () => {}, Date, Math, JSON, Intl,
      document: EB2_DOC, Bus: {an: () => () => {}, aus: () => {}, senden: () => {}}, Spiel, CLI, Modell, DATEN, store};
    vm.createContext(bereich);
    const quellen = ["src/ui/dom.js", "src/ui/hilfe.js"].map(rel => fs.readFileSync(path.join(__dirname, "..", rel), "utf8"));
    const UI_OBJ = vm.runInContext(quellen.join("\n;\n") + "\n;UI", bereich, {filename: "ui-hilfe.js"});
    return {document: EB2_DOC, UI: UI_OBJ};
  }

  gruppe("Hilfe-Vorschläge: Ebene im Streifen sichtbar" + EB2_ZUSATZ, () => {
    pruefe("Der Streifen nennt die Ebene: ansehen · genauer nachsehen · ändern" + EB2_ZUSATZ, () => {
      if (!EB2_IM_TESTBEREICH || typeof require !== "function") return;
      const n = netzMitAdressen();
      mitStufe("azubi", () => {
        const p = eb2Pruefstand();
        const zeichne = o => {
          const c = p.document.createElement("div");
          p.UI.hilfe.zeichnen(c, Object.assign({netz: n, geraetId: "r1", modus: "priv"}, o));
          return c.querySelector(".hl-bereich");
        };
        /* Ebene 1: unverändert „ansehen" – der erste Vorschlag im privilegierten Modus ist show ip interface brief. */
        const s1 = Spiel.hilfe.passend({netz: n, id: "r1", modus: "priv"})[0];
        erwarte.gleich(s1.ebene, 1, "der erste Vorschlag ist Ebene 1");
        erwarte.gleich(zeichne({}).textContent, s1.bereich + " · ansehen", "Ebene 1 steht als „ansehen“ da");
        /* Ebene 2: sichtbar. Mit dem Verlauf von Ebene 1 rückt der Ebene-2-Vorschlag nach vorn. */
        const s2 = Spiel.hilfe.passend({netz: n, id: "r1", modus: "priv", verlauf: [s1.befehl]})[0];
        erwarte.gleich(s2.ebene, 2, "danach kommt ein Ebene-2-Vorschlag: " + s2.id);
        erwarte.gleich(zeichne({verlauf: [s1.befehl]}).textContent, s2.bereich + " · genauer nachsehen", "Ebene 2 wird sichtbar benannt");
        /* Ebene 3: unverändert „ändern". */
        const p3 = p.document.createElement("div");
        p.UI.hilfe.zeichnen(p3, {netz: n, geraetId: "r1", modus: "config"});
        const s3 = Spiel.hilfe.passend({netz: n, id: "r1", modus: "config"})[0];
        erwarte.gleich(s3.ebene, 3, "im Konfigurationsmodus führt ein ändernder Vorschlag");
        erwarte.gleich(p3.querySelector(".hl-bereich").textContent, s3.bereich + " · ändern", "Ebene 3 steht als „ändern“ da");
      });
    });

    pruefe("Für jedes Gerät und jeden Modus steht genau die Ebene des Vorschlags im Streifen" + EB2_ZUSATZ, () => {
      if (!EB2_IM_TESTBEREICH || typeof require !== "function") return;
      const WORT = {1: " · ansehen", 2: " · genauer nachsehen", 3: " · ändern"};
      const n = netzMitAdressen();
      mitStufe("azubi", () => {
        const p = eb2Pruefstand();
        let geprueft = 0, ebenen = {};
        for (const [id, modus] of [["r1", "user"], ["r1", "priv"], ["r1", "config"], ["r1", "if"], ["sw1", "priv"],
                                   ["sw1", "range"], ["pc1", "host"], ["srv1", "host"], ["fw1", "fwUser"], ["fw1", "fwPriv"]]) {
          const soll = Spiel.hilfe.passend({netz: n, id, modus})[0];
          erwarte.wahr(!!soll, id + "/" + modus + ": es gibt einen Vorschlag");
          if (!soll) continue;
          const c = p.document.createElement("div");
          p.UI.hilfe.zeichnen(c, {netz: n, geraetId: id, modus});
          const bereich = c.querySelector(".hl-bereich");
          erwarte.wahr(!!bereich, id + "/" + modus + ": der Vorschlag steht im Streifen");
          if (!bereich) continue;
          erwarte.gleich(bereich.textContent, soll.bereich + WORT[soll.ebene], id + "/" + modus + ": Ebene " + soll.ebene + " im Streifen");
          ebenen[soll.ebene] = (ebenen[soll.ebene] || 0) + 1;
          geprueft++;
          /* azubi-plus sieht zwei Vorschläge: zweimal derselbe Befehl wäre ein doppelter Knopf im Streifen.
             (Mehrere Einträge im Katalog tragen bewusst denselben Befehl – hier wird gemessen, dass sie sich
             in der Anzeige für azubi-plus/azubi nicht überlagern.) */
          mitStufe("azubi-plus", () => {
            const z = Spiel.hilfe.passend({netz: n, id, modus});
            erwarte.wahr(z.length >= 1 && z.length <= 2, id + "/" + modus + ": azubi-plus sieht ein bis zwei Vorschläge (" + z.length + ")");
            if (z.length > 1) erwarte.falsch(String(z[0].befehl).trim() === String(z[1].befehl).trim(), id + "/" + modus + ": zweimal derselbe Befehl");
          });
        }
        erwarte.wahr(geprueft >= 8, "geprüft wurden " + geprueft + " Gerät/Modus-Paare");
        /* Ebene 2 kommt auch im echten Betrieb vor – nicht nur in der Datentabelle. */
        erwarte.wahr((ebenen[2] || 0) >= 1, "mindestens ein Gerät/Modus zeigt einen Ebene-2-Vorschlag: " + JSON.stringify(ebenen));
      });
    });

    pruefe("A3 im echten Weg: der Streifen hebt die Sprosse der offenen Aufgabe hervor" + EB2_ZUSATZ, () => {
      if (!EB2_IM_TESTBEREICH || typeof require !== "function") return;
      const n = netzMitNAS();
      const alt = Spiel.stufeInstanz;
      erwarte.gleich(typeof alt, "function", "Spiel.stufeInstanz ist die öffentliche Fläche für das offene Ticket");
      try {
        /* Ein offenes Ticket wird hier nicht angelegt (das würde Postfach und Spielstand anfassen),
           sondern nur die öffentliche Abfrage gestellt: „welches Ticket ist offen?" – genau der Weg,
           den UI.hilfe.zeichnen geht (src/ui/hilfe.js, skillJetzt). */
        Spiel.stufeInstanz = () => ({ticketId: "storage-01"});
        const def = Spiel.defVon({ticketId: "storage-01"});
        erwarte.gleich(def.skills[0], "lab.storage", "storage-01 übt lab.storage");
        mitStufe("azubi", () => {
          const p = eb2Pruefstand();
          const c = p.document.createElement("div");
          p.UI.hilfe.zeichnen(c, {netz: n, geraetId: "nas1", modus: "host"});
          const dran = c.querySelectorAll(".hl-dran");
          /* lab.storage hat zwei Vorschläge in zwei Sprossen (link-linux-nas und dienst-linux-datei) –
             beide werden hervorgehoben. Vorher war es KEINE (task-28, Befund A3). */
          erwarte.wahr(dran.length >= 1, "mindestens eine Sprosse ist hervorgehoben");
          const texte = dran.map(x => x.textContent).join(" | ");
          erwarte.enthaelt(texte, "Link", "die Link-Sprosse ist dabei (link-linux-nas gehört zu lab.storage)");
          erwarte.enthaelt(texte, "ACL und Dienst", "und die Dienst-Sprosse (dienst-linux-datei gehört zu lab.storage)");
        });
      } finally { Spiel.stufeInstanz = alt; }
    });
  });

  /* ===================================================================================================
     4 · Wirkung über ALLE Sichten (task-28, Befund A2/A3/A4 des Zweitlesers)
     Sicht = Gerät × Modus × Verlauf-Variante × Bildungsstand × mit/ohne Fehler. Gemessen wird je Sicht,
     welche Vorschläge im Streifen erscheinen (A2/A4) und für welche Fertigkeit eine Sprosse
     hervorgehoben ist (A3). Die Verlauf-Varianten entstehen, indem der Streifen der Reihe nach
     abgetippt wird – so arbeitet ein Azubi die Leiter wirklich ab.
     =================================================================================================== */
  const EB2_MESSUNG = (() => { try { return typeof MESSUNG !== "undefined" && MESSUNG === true; } catch (e) { return false; } })();
  const MODI_JE_ART = {
    "ios": ["user", "priv", "config", "if", "subif", "range", "vlan", "line", "std", "ext", "dhcp"],
    "host-windows": ["host"], "host-linux": ["host"], "fw": ["fwUser", "fwPriv"],
  };
  const STUFEN_MESSUNG = ["azubi", "azubi-plus", "geselle", "meister"];
  const GERAETE_MESSUNG = [["r1", "ios"], ["sw1", "ios"], ["pc1", "host-windows"], ["srv1", "host-linux"],
                           ["nas1", "host-linux"], ["fw1", "fw"]];

  function netzMitNAS(){
    const n = netzMitAdressen();
    Modell.geraet(n, "nas", {id: "nas1", name: "NAS1"});
    Modell.verbinden(n, {geraet: "nas1", port: "eth0"}, {geraet: "sw1", port: "Fa0/3"});
    Modell.setzen(n, "nas1", "if.eth0.ip", "192.168.10.30");
    Modell.setzen(n, "nas1", "if.eth0.maske", "255.255.255.0");
    Modell.setzen(n, "nas1", "if.eth0.gw", "192.168.10.1");
    return n;
  }
  function verlaufKetten(n, id, modus){
    const ketten = [[]];
    mitStufe("azubi", () => {
      /* So tief, dass die ganze Leiter abgelaufen ist: der Windows-PC hat 11 Kandidaten (dienst zuletzt),
         und ein Vorschlag gilt erst als sichtbar, wenn er irgendwann in den Streifen kommt. */
      for (let i = 0; i < 14; i++) {
        const v = ketten[ketten.length - 1];
        const p = Spiel.hilfe.passend({netz: n, id, modus, verlauf: v});
        if (!p.length) break;
        const b = String(p[0].befehl).trim();
        if (v.some(x => x.trim().toLowerCase() === b.toLowerCase())) break;
        ketten.push([...v, b]);
      }
    });
    return ketten;
  }
  function messung(){
    const n = netzMitNAS();
    const eintraege = new Map(), skills = new Map();
    let sichten = 0, mitVorschlag = 0, doppel = 0;
    const doppelBeispiele = [];
    for (const [id, art] of GERAETE_MESSUNG) for (const modus of MODI_JE_ART[art]) for (const verlauf of verlaufKetten(n, id, modus))
      for (const stufe of STUFEN_MESSUNG) for (const fehler of [false, true]) {
        sichten++;
        const o = {netz: n, id, modus, verlauf, letzterFehler: fehler ? {fehler: true} : null};
        mitStufe(stufe, () => {
          const p = Spiel.hilfe.passend(o);
          if (p.length) mitVorschlag++;
          for (const v of p) eintraege.set(v.id, (eintraege.get(v.id) || 0) + 1);
          const texte = p.map(v => String(v.befehl).trim().toLowerCase());
          if (new Set(texte).size !== texte.length) {
            doppel++;
            if (doppelBeispiele.length < 6) doppelBeispiele.push(id + "/" + modus + "/" + stufe + (fehler ? "/Fehler" : "") + " → " + texte.join(" + "));
          }
          for (const s of DATEN.skills) if (Spiel.hilfe.leiter(Object.assign({}, o, {skill: s.id})).some(x => x.dran)) skills.set(s.id, (skills.get(s.id) || 0) + 1);
        });
      }
    return {sichten, mitVorschlag, eintraege, skills, doppel, doppelBeispiele,
      alleIds: DATEN.hilfen.VORSCHLAEGE.map(v => v.id), alleSkills: DATEN.skills.map(s => s.id)};
  }
  let EB2_M = null;
  const messungEinmal = () => (EB2_M = EB2_M || messung());

  gruppe("Hilfe-Vorschläge: Wirkung über alle Sichten (task-28)" + EB2_ZUSATZ, () => {
    pruefe("A2: kein Vorschlag bleibt im Streifen unsichtbar" + EB2_ZUSATZ, () => {
      if (!EB2_IM_TESTBEREICH) return;
      const m = messungEinmal();
      const ohne = m.alleIds.filter(id => !m.eintraege.get(id));
      const selten = [...m.eintraege.entries()].sort((a, b) => a[1] - b[1]).slice(0, 6).map(x => x[0] + "=" + x[1]).join(", ");
      const vier = ["ip-ios-subif", "link-linux-nas", "ip-fw-schnittstellen", "link-switch-schleife"].map(id => id + "=" + (m.eintraege.get(id) || 0)).join(", ");
      if (EB2_MESSUNG) console.log(`MESSUNG A2 · Sichten ${m.sichten} · mit Vorschlag ${m.mitVorschlag} · nie erschienen ${ohne.length}${ohne.length ? ": " + ohne.join(", ") : ""} · die vier vormals unsichtbaren: ${vier} · seltenste: ${selten}`);
      erwarte.wahr(m.sichten >= 400, "gemessen wurden " + m.sichten + " Sichten (mit Vorschlag: " + m.mitVorschlag + ")");
      erwarte.gleich(ohne, [], "Vorschläge, die NIE im Streifen erscheinen (vorher 4: ip-ios-subif, ip-linux-nas, dienst-fw-zonen, link-switch-schleife)");
    });

    pruefe("A3: jede Fertigkeit bekommt in mindestens einer Sicht eine hervorgehobene Sprosse" + EB2_ZUSATZ, () => {
      if (!EB2_IM_TESTBEREICH) return;
      const m = messungEinmal();
      const ohne = m.alleSkills.filter(s => !m.skills.get(s));
      const kleinste = [...m.skills.entries()].sort((a, b) => a[1] - b[1]).slice(0, 6).map(x => x[0] + "=" + x[1]).join(", ");
      if (EB2_MESSUNG) console.log(`MESSUNG A3 · Fertigkeiten ${m.alleSkills.length} · ohne Sprosse ${ohne.length}${ohne.length ? ": " + ohne.join(", ") : ""} · seltenste: ${kleinste}`);
      erwarte.gleich(ohne, [], "Fertigkeiten ohne hervorgehobene Sprosse (vorher 10: lab.switch, lab.subnetz, lab.dhcp, lab.tcp, lab.trunk, lab.rostick, lab.portfwd, lab.portsec, lab.stp, lab.storage)");
    });

    pruefe("A4: in keiner Sicht steht derselbe Befehl zweimal" + EB2_ZUSATZ, () => {
      if (!EB2_IM_TESTBEREICH) return;
      const m = messungEinmal();
      if (EB2_MESSUNG) console.log(`MESSUNG A4 · Sichten mit doppeltem Befehl ${m.doppel}${m.doppel ? " · z. B. " + m.doppelBeispiele.join(" | ") : ""}`);
      erwarte.gleich(m.doppel, 0, "Sichten mit demselben Befehl zweimal (vorher 13): " + m.doppelBeispiele.join(" | "));
    });

    pruefe("A1: kein Vorschlag bietet einen Befehl an, den die CLI auf DIESEM Gerät ablehnt" + EB2_ZUSATZ, () => {
      if (!EB2_IM_TESTBEREICH) return;
      const n = netzMitNAS();
      let geprueft = 0;
      const abgelehnt = [];
      for (const v of DATEN.hilfen.VORSCHLAEGE) {
        for (const [id, art] of GERAETE_MESSUNG) {
          const g = n.geraete[id];
          if (!(v.geraet === "alle" || v.geraet === art) || (v.nurTyp && !v.nurTyp.includes(g.typ))) continue;
          for (const modus of (v.modus.length ? v.modus : MODI_JE_ART[art]).filter(m => MODI_JE_ART[art].includes(m))) {
            const n2 = netzMitNAS();
            const r = CLI.eingabe(sitzungIn(n2, id, modus), v.befehl);
            const ausgabe = String(r.ausgabe || "");
            geprueft++;
            if (SYNTAXFEHLER.test(ausgabe)) abgelehnt.push(v.id + " auf " + id + "/" + modus + ": " + ausgabe.slice(0, 70).replace(/\n/g, " "));
          }
        }
      }
      erwarte.wahr(geprueft >= 60, "geprüft wurden " + geprueft + " Gerät/Modus-Kombinationen");
      erwarte.gleich(abgelehnt, [], "Befehle, die die CLI auf diesem Gerät ablehnt (vorher: ip-ios-setzen auf dem Switch)");
    });
  });
})();
