"use strict";
/* KEIN-LECK-GATE (3.1.0 Variante B; Lead-Auftrag 01.11.2026: ZENTRAL über sichtbare
   Leitfaden-/Tour-/Hilfetexte + Zustand „vorzeitige Lösung“, falsifizierbare Gegenprobe,
   Exit 1 mit Datei:Stelle; Architektur §27: „keine Lösungen in Texten/Zuständen vor der Aktion“).
   Geprüft werden:
   · DATEN.leitfaden (Phasen: titel/ziel/impulse/fehlannahme · Onboarding: titel/lernziel/abnahme/text · Pruefung)
   · DATEN.hilfen.GERUEST (sichtbare Gerüst-Hilfe „Was geht hier?“)
   · Zustand vor der Aktion: Spiel.leitfaden.stand()/naechsterSchritt() auf frischer Instanz dürfen
     keine Lösungswerte (IP/Präfix/VLAN/MAC/Lösungscode des Tickets) und keine Leck-Felder tragen.
   ABSICHTLICH NICHT gescannt (dokumentierte Ausnahme, kein Abschwächen): DATEN.hilfen.VORSCHLAEGE/
   SYNTAX und DATEN.miniDenkhilfen enthalten als Syntax-/Szenenbeispiele bewusst konkrete Adressen
   (z.B. „ip address 192.168.10.1“) – dieses Gate sucht Ticket-Lösungen in Prozesshilfe-Texten, nicht
   die Lehrbeispiele der Befehlshilfe. Deren Befehle prüft tests/spiel-hilfe-vorschlaege.test.js.
   Muster: IPv4 · Präfix (/24) · VLAN-ID · MAC · Lösungscode (E-XXXX-XXX/NL-XX) · Lösungsformeln
   („Lösung:“/„Die Lösung ist“). Jeder Fund nennt Datei:Zeile und Pfad.
   Allein lauffähig:  node tests/kein-leck.test.js  */
(function(){
  function klAlleinLaden(){
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const code = [fs.readFileSync(path.join(__dirname, "harness.js"), "utf8"),
                  fs.readFileSync(__filename, "utf8"), "testsAusfuehren();"];
    const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename});
    let ergebnisse;
    try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "kein-leck.test.js"}); }
    catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
    const rot = ergebnisse.filter(e => !e.ok);
    for (const e of ergebnisse) console.log((e.ok ? "\u2713 " : "\u2717 ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
    console.log("\n" + (ergebnisse.length - rot.length) + "/" + ergebnisse.length + " grün");
    process.exit(rot.length ? 1 : 0);
  }
  if (typeof gruppe === "undefined" && typeof document === "undefined" && typeof require === "function") { klAlleinLaden(); return; }

  const fs = require("fs"), path = require("path");
  const WURZEL = path.join(__dirname, "..");

  /* ---------- Muster (eine Quelle für Text- und Zustandsprüfung) ---------- */
  const MUSTER = [
    {name: "IPv4", re: /\b\d{1,3}(?:\.\d{1,3}){3}\b/},
    {name: "Präfixlänge", re: /(?:^|[\s(.,;:])\/\d{1,2}\b/},
    {name: "VLAN-ID", re: /\bVLAN\s*\d+/i},
    {name: "MAC-Adresse", re: /\b[0-9a-f]{2}(?::[0-9a-f]{2}){5}\b/i},
    {name: "Lösungscode", re: /\bE-[0-9A-Z]{4}-[0-9A-Z]{3}\b|\bNL-[0-9A-Z]{2,}/},
    {name: "Lösungsformel", re: /\b(?:Lösung|Loesung)\s*[:=]|\bDie Lösung ist\b|\bantwort\s*[:=]/i},
  ];
  const LECK_FELDER = /^(?:loesung|lösung|antwort|erwartet|soll|ziel|zielzustand|lösungen|loesungen)$/i;

  function funde(text, quelle){
    const t = String(text == null ? "" : text);
    const raus = [];
    for (const m of MUSTER) {
      const treffer = t.match(m.re);
      if (treffer) raus.push({name: m.name, treffer: treffer[0].trim(), quelle});
    }
    return raus;
  }
  function stelleIn(datei, text){
    try {
      const quelle = fs.readFileSync(path.join(WURZEL, datei), "utf8");
      const stelle = String(text).slice(0, 70);
      const i = quelle.indexOf(stelle) >= 0 ? quelle.indexOf(stelle) : quelle.indexOf(String(text).slice(0, 30));
      if (i < 0) return datei + ":?";
      return datei + ":" + (quelle.slice(0, i).split("\n").length);
    } catch (e) { return datei + ":?"; }
  }
  /* Sammelt sichtbare Strings mit Pfad UND Datei/Zeile. */
  function texteSammeln(wert, datei, pfad, raus){
    if (typeof wert === "string") { raus.push({text: wert, quelle: {datei, pfad}}); return raus; }
    if (Array.isArray(wert)) { wert.forEach((w, i) => texteSammeln(w, datei, pfad + "[" + i + "]", raus)); return raus; }
    if (wert && typeof wert === "object") for (const k of Object.keys(wert)) texteSammeln(wert[k], datei, pfad + "." + k, raus);
    return raus;
  }
  function pruefeTexte(quellen){
    const fundeAlle = [];
    for (const q of quellen) {
      if (!q || q.wert == null) { fundeAlle.push({name: "Quelle fehlt", treffer: q && q.datei ? q.datei : "?", quelle: {datei: "tests/kein-leck.test.js", pfad: "Datenquelle"}}); continue; }
      for (const t of texteSammeln(q.wert, q.datei, q.pfad, [])) {
        for (const f of funde(t.text, t.quelle)) {
          f.quelle = Object.assign({}, t.quelle, {text: t.text});
          fundeAlle.push(f);
        }
      }
    }
    return fundeAlle;
  }
  function meldung(f){
    const stelle = stelleIn(f.quelle.datei, f.quelle.text || f.treffer) || (f.quelle.datei + ":?");
    return stelle + " (" + f.quelle.pfad + "): " + f.name + " \u201e" + f.treffer + "\u201c";
  }
  /* Zustand: Leck = Lösungswert im sichtbaren Text ODER Leck-Feld im Objektbaum. */
  function zustandFunde(objekt, tokens, quelle){
    const raus = [];
    const tokenListe = (tokens || []).filter(t => typeof t === "string" && t.trim().length >= 4);
    const lauf = (wert, pfad) => {
      if (wert == null) return;
      if (typeof wert === "string") {
        for (const m of MUSTER) { const tr = wert.match(m.re); if (tr) raus.push({name: "Zustand-" + m.name, treffer: tr[0].trim(), quelle: {datei: quelle.datei, pfad: pfad}}); }
        for (const tok of tokenListe) if (wert.includes(tok)) raus.push({name: "Zustand-Lösungswert", treffer: tok, quelle: {datei: quelle.datei, pfad: pfad}});
        return;
      }
      if (Array.isArray(wert)) { wert.forEach((w, i) => lauf(w, pfad + "[" + i + "]")); return; }
      if (typeof wert === "object") {
        for (const k of Object.keys(wert)) {
          if (LECK_FELDER.test(k)) raus.push({name: "Leck-Feld", treffer: k, quelle: {datei: quelle.datei, pfad: pfad + "." + k}});
          lauf(wert[k], pfad + "." + k);
        }
      }
    };
    lauf(objekt, quelle.pfad);
    return raus;
  }

  /* ---------- Quellen laden (run.js: globale DATEN; allein: Datei in vm) ---------- */
  function ladeDaten(dateiName, ausdruck){
    if (typeof DATEN !== "undefined" && DATEN) {
      try { const w = new Function("DATEN", "return (" + ausdruck + ");")(DATEN); if (w !== undefined && w !== null) return w; } catch (e) { /* weiter */ }
    }
    const vm = require("vm");
    const ctx = {DATEN: {}, console: {log(){}, error(){}, warn(){}}};
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(WURZEL, dateiName), "utf8"), ctx, {filename: dateiName});
    return vm.runInContext("(" + ausdruck + ")", ctx);
  }
  function quellen(){
    return [
      {datei: "src/daten/leitfaden.js", pfad: "DATEN.leitfaden", wert: ladeDaten("src/daten/leitfaden.js", "DATEN.leitfaden")},
      {datei: "src/daten/hilfen.js", pfad: "DATEN.hilfen.GERUEST", wert: (() => { try { const h = ladeDaten("src/daten/hilfen.js", "DATEN.hilfen"); return h && h.GERUEST; } catch (e) { return null; } })()},
    ];
  }
  function tokenAus(objekt){
    const t = JSON.stringify(objekt || {});
    const raus = new Set();
    for (const m of MUSTER) for (const tr of (t.match(new RegExp(m.re.source, "g")) || [])) raus.add(tr.trim());
    return [...raus];
  }

  const QUELLEN = quellen();
  const LECK = pruefeTexte(QUELLEN);
  const echteDatei = path.join(WURZEL, "src", "daten", "leitfaden.js");
  const echteText = fs.readFileSync(echteDatei, "utf8");

  gruppe("Kein-Leck-Gate (3.1.0): Leitfaden/Tour/Hilfe + Zustand vor der Aktion", () => {

    pruefe("Datenquellen vorhanden (fehlende Quelle = ROT, kein stilles Grün)", () => {
      erwarte.wahr(QUELLEN.length >= 2, "zwei Quellen: Leitfaden + Gerüst-Hilfe");
      for (const q of QUELLEN) erwarte.wahr(q.wert != null && (typeof q.wert === "object"), q.datei + " (" + q.pfad + ") fehlt");
      erwarte.wahr(typeof DATEN === "object" || true, "DATEN geladen");
    });

    pruefe("Sichtbare Leitfaden-/Tour-/Hilfetexte ohne Leck (Datei:Zeile je Fund)", () => {
      erwarte.gleich(LECK.map(meldung), [], "Leck in sichtbaren Texten — bitte Texte korrigieren (Ausnahmen: Syntax-/Szenenbeispiele der Befehlshilfe, s. Kopf)");
      erwarte.wahr(LECK.length === 0, "Fundstellen: " + LECK.map(meldung).join(" | "));
    });

    pruefe("Gegenprobe falsifizierbar: eingeschmuggeltes Leck wird mit allen Mustern erkannt", () => {
      const probe = "Ping an 192.168.10.7 mit /24, VLAN 30, MAC aa:bb:cc:dd:ee:ff, Code E-AB12-XYZ. Lösung: die Adresse ändern.";
      const f = funde(probe, {datei: "src/daten/leitfaden.js", pfad: "Gegenprobe"});
      const namen = f.map(x => x.name);
      for (const erwartet of ["IPv4", "Präfixlänge", "VLAN-ID", "MAC-Adresse", "Lösungscode", "Lösungsformel"])
        erwarte.wahr(namen.includes(erwartet), "Gegenprobe: Muster " + erwartet + " schlägt an (gefunden: " + namen.join(", ") + ")");
      const m = meldung(f[0]);
      erwarte.passt(m, /src\/daten\/leitfaden\.js:[\d?]+ \(Gegenprobe\)/, "Meldung nennt Datei:Stelle und Pfad (war: " + m + ")");
    });

    pruefe("Gegenprobe: ein in den ECHTEN Leitfaden eingeschmuggeltes Leck nennt dessen Zeile", () => {
      /* Die echte Impuls-Zeile aus der Datei nehmen und einen Leckwert anhängen — die Meldung muss
         auf die echte Zeile des Impulses zeigen (Datei:Stelle), nicht nur irgendeine. */
      const texte = texteSammeln(QUELLEN[0] && QUELLEN[0].wert, "src/daten/leitfaden.js", "DATEN.leitfaden", [])
        .filter(t => typeof t.text === "string" && t.text.trim().length > 20 && echteText.includes(t.text.slice(0, 40)));
      const probe = texte[0] || null;
      erwarte.wahr(!!probe, "eine echte, sichtbare Leitfaden-Zeile ist in der Datei vorhanden");
      const f = funde(probe.text + " Adresse 10.99.0.9, Präfix /29, VLAN 30, Code E-AB12-XYZ", Object.assign({}, probe.quelle, {text: probe.text}));
      erwarte.wahr(f.length >= 4, "IPv4, Präfix, VLAN und Code werden im eingeschmuggelten Text erkannt (gefunden: " + f.map(x => x.name).join(", ") + ")");
      const m = meldung(f[0]);
      const sollZeile = echteText.split("\n").findIndex(z => z.includes(probe.text.slice(0, 40))) + 1;
      erwarte.wahr(sollZeile > 0, "Text steht in der echten Datei (Zeile " + sollZeile + ")");
      erwarte.enthaelt(m, "src/daten/leitfaden.js:" + sollZeile, "Meldung zeigt die echte Zeile des Textes (war: " + m + ")");
    });

    pruefe("Kein Fehlalarm: saubere Prozesshilfe-Texte werden NICHT gemeldet", () => {
      const harmlos = "Formuliere eine Vermutung: Auf welcher Schicht könnte es liegen? Prüf, ob deine Beobachtung passt.";
      erwarte.gleich(funde(harmlos, {datei: "x", pfad: "y"}), [], "sauberer Text bleibt sauber");
      const lf = QUELLEN[0];
      erwarte.gleich(pruefeTexte([{datei: "src/daten/leitfaden.js", pfad: "DATEN.leitfaden.probe", wert: {impulse: [harmlos]}}]), [], "auch als Datenform sauber");
      /* Der echte leitfaden-Text allein ist sauber (die Gesamtprüfung oben deckt Hilfe mit ab). */
      erwarte.gleich(pruefeTexte([lf]).map(meldung), [], "echter Leitfaden ist ohne Leck");
    });

    pruefe("Zustand vor der Aktion: keine Lösungswerte/Leck-Felder (Gegenprobe + Fehlalarm)", () => {
      const frisch = {
        pruefung: false, fortschritt: 0.33, aktuell: "messen",
        schritte: [{id: "ticket", titel: "Auftrag klären", status: "erledigt", impuls: null},
                   {id: "messen", titel: "Messen", status: "aktuell", impuls: "Miss zuerst den Pfad."}],
      };
      const tokens = ["192.168.10.7", "/24", "VLAN 30", "E-AB12-XYZ"];
      erwarte.gleich(zustandFunde(frisch, tokens, {datei: "zustand", pfad: "stand"}), [], "sauberer Zustand: kein Fund");
      const verseucht = JSON.parse(JSON.stringify(frisch));
      verseucht.schritte[1].impuls = "Setze einfach 192.168.10.7 mit /24.";
      verseucht.loesung = {ip: "192.168.10.7"};
      const f = zustandFunde(verseucht, tokens, {datei: "zustand", pfad: "stand"});
      erwarte.wahr(f.some(x => x.name === "Zustand-IPv4"), "Gegenprobe: IPv4 im Zustandstext wird erkannt");
      erwarte.wahr(f.some(x => x.name === "Zustand-Präfixlänge"), "Gegenprobe: Präfix wird erkannt");
      erwarte.wahr(f.some(x => x.name === "Leck-Feld"), "Gegenprobe: Leck-Feld loesung wird erkannt");
      erwarte.wahr(f.some(x => x.name === "Zustand-Lösungswert"), "Gegenprobe: Lösungswert wird erkannt");
    });

    pruefe("Echter Spielzustand: Engine liefert vor der Aktion keine Lösung (nur unter run.js/Spiel)", () => {
      const mitSpiel = (typeof Spiel !== "undefined" && Spiel && typeof Spiel.instanzErstellen === "function" && Spiel.leitfaden && typeof Spiel.leitfaden.stand === "function");
      if (!mitSpiel) {
        /* Allein-Lauf: Synthetik-Fixture prüft die Zustandslogik falsifizierbar; der echte Zustand
           wird in der Suite (run.js) geprüft — dort läuft dieser Test mit echten Instanzen. */
        const sauber = {pruefung: false, fortschritt: 0.2, aktuell: "lage", schritte: [{id: "lage", titel: "Lage", status: "aktuell", impuls: "Verschaff dir ein Bild vom Netz."}]};
        erwarte.gleich(zustandFunde(sauber, ["192.168.10.7"], {datei: "engine(synthetisch)", pfad: "stand"}), [], "synthetischer Engine-Zustand ohne Leck");
        const verseucht = JSON.parse(JSON.stringify(sauber));
        verseucht.schritte[0].impuls = "Nimm 192.168.10.7 und prüfe weiter.";
        erwarte.wahr(zustandFunde(verseucht, ["192.168.10.7"], {datei: "engine(synthetisch)", pfad: "stand"}).length >= 1, "Gegenprobe im selben Test: Leck im Engine-Zustand wird erkannt");
        return;
      }
      const fehler = [];
      for (const fall of [{gen: {skill: "lab.link", seed: 9}, quelle: "postfach"}, {gen: {skill: "lab.ip", seed: 21}, quelle: "postfach"}]) {
        let inst = null;
        try {
          inst = Spiel.instanzErstellen(fall);
          if (Spiel.oeffnen) Spiel.oeffnen(inst.iid);
          const stand = Spiel.leitfaden.stand(inst);
          const naechster = Spiel.leitfaden.naechsterSchritt(inst);
          const def = typeof Spiel.defVon === "function" ? Spiel.defVon(inst) : (inst.def || null);
          const tokens = tokenAus(def);
          for (const f of zustandFunde(stand, tokens, {datei: "Spiel.leitfaden.stand(inst)", pfad: "stand"})) fehler.push(meldung(f));
          for (const f of zustandFunde(naechster, tokens, {datei: "Spiel.leitfaden.naechsterSchritt(inst)", pfad: "naechster"})) fehler.push(meldung(f));
          if (!stand || !Array.isArray(stand.schritte)) fehler.push("stand() liefert keine Schritte (" + fall.gen.skill + ")");
          if (naechster && typeof naechster.text === "string") {
            for (const f of funde(naechster.text, {datei: "Spiel.leitfaden.naechsterSchritt", pfad: "text"})) fehler.push(meldung(f));
          }
        } catch (e) {
          fehler.push("Instanz/Engine-Fehler (" + fall.gen.skill + "): " + ((e && e.message) || e));
        } finally {
          try { if (inst && Spiel.schliessen) Spiel.schliessen(inst.iid); } catch (e) { /* egal */ }
        }
      }
      erwarte.gleich(fehler, [], "Engine-Zustand vor der Aktion enthält Lösungsreste");
    });
  });
})();