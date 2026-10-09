"use strict";
/* R12: „Höchstens 6 Bedienelemente je Ansicht" — die Regel darf nicht stillschweigend grün sein.
   (task-42, Strom G; Bauart „grün ohne Wirkung", AGENTS.md.)

   DER BEFUND, DEN DIESE DATEI FESTHÄLT (gemessen, nicht vermutet):
   `python tools/ethos.py --dom` ohne laufendes Programm meldete
       R12 Höchstens 6 Bedienelemente je Ansicht     0 sichtbare Elemente   — eingehalten
   Ursache war der Fehlerpfad: `aus.stdout or "{}"` machte aus leerer Ausgabe ein leeres Objekt,
   `daten.get("sichtbar", 0)` daraus die Zahl 0, und `0 > 6` ist falsch → kein Treffer → grün.
   Ein Fehlerpfad, der GRÜN ergibt, ist genau die Bauart, vor der das Projekt warnt.

   WAS HIER GEPRÜFT WIRD: die Auswertung `r12_auswerten()` des WERKZEUGS — mit erfundenen
   Programm-Ausgaben. Kein Browser, kein Prozess: der Test ruft die echte Python-Funktion auf.
   Die Live-Zahlen je Ansicht (6 für `klasse`, 3 für `Auftrag`) brauchen ein laufendes Programm
   und stehen im Review, nicht hier. */

gruppe("Werkzeug: R12 misst je Ansicht", () => {
  const {execFileSync} = require("child_process");
  const fs = require("fs"), path = require("path");
  const WURZEL = path.join(__dirname, "..");
  const PY = (typeof process !== "undefined" && process.env && process.env.PYTHON) || "python";

  /* Ruft die ECHTE Funktion `r12_auswerten()` aus tools/ethos.py auf. */
  function r12(ausgabe){
    const programm = [
      "import importlib.util, json, sys",
      "spec = importlib.util.spec_from_file_location('ethos', " + JSON.stringify(path.join(WURZEL, "tools", "ethos.py")) + ")",
      "m = importlib.util.module_from_spec(spec)",
      "spec.loader.exec_module(m)",
      "daten = json.load(sys.stdin)",
      "befunde, zahlen = m.r12_auswerten(daten['ausgabe'])",
      "print(json.dumps({'befunde': befunde, 'zahlen': zahlen}, ensure_ascii=False))",
    ].join("\n");
    const aus = execFileSync(PY, ["-c", programm], {
      cwd: WURZEL, input: JSON.stringify({ausgabe}), encoding: "utf8", timeout: 60000,
      env: {...(typeof process !== "undefined" && process.env ? process.env : {}), PYTHONIOENCODING: "utf-8"}, stdio: ["pipe", "pipe", "pipe"],
    });
    return JSON.parse(aus);
  }
  const antwort = (ansichten, extra = {}) =>
    JSON.stringify(Object.assign({ansichten, grenze: 6, grenzen: {mitarbeit: 3}}, extra));

  pruefe("Ohne Ausgabe (kein Programm) ist das ein BEFUND — nicht 0 und nicht eingehalten", () => {
    const r = r12("");
    erwarte.wahr(r.befunde.length > 0, "leere Ausgabe muss einen Befund ergeben");
    erwarte.enthaelt(r.befunde[0], "nicht gemessen", "der Befund sagt es ausdrücklich");
    erwarte.gleich(r.zahlen, [], "keine Zahl erfunden");
  });

  pruefe('Meldet das Programm einen Fehler, wird er als „nicht gemessen" durchgereicht', () => {
    const r = r12(JSON.stringify({fehler: "UI.app fehlt - Programm nicht erreichbar"}));
    erwarte.enthaelt(r.befunde[0], "nicht gemessen", "Fehler ≠ eingehalten");
    erwarte.enthaelt(r.befunde[0], "UI.app fehlt", "der Grund steht da");
  });

  pruefe("Je Ansicht eine echte Zahl: 6 für klasse, 3 für Auftrag — und keine erfundene 0", () => {
    const r = r12(antwort([
      {name: "heute", titel: "Heute", zahl: 2},
      {name: "klasse", titel: "Klasse", zahl: 6},
      {name: "mitarbeit", titel: "Auftrag", zahl: 3},
    ]));
    erwarte.gleich(r.befunde, [], "6 und 3 halten ihre Grenzen ein");
    erwarte.gleich(r.zahlen.map(z => [z[1], z[2], z[3]]), [
      ["heute", 2, 6], ["klasse", 6, 6], ["mitarbeit", 3, 3],
    ], "drei Ansichten, drei Zahlen, je mit eigener Grenze");
  });

  pruefe("Die Azubi-Ansicht hat 3, nicht 6: 4 Elemente sind dort ein Befund", () => {
    const r = r12(antwort([{name: "mitarbeit", titel: "Auftrag", zahl: 4}]));
    erwarte.gleich(r.befunde.length, 1, "genau ein Befund");
    erwarte.enthaelt(r.befunde[0], "Auftrag", "die Ansicht wird genannt");
    erwarte.enthaelt(r.befunde[0], "4 sichtbare", "die Zahl wird genannt");
    erwarte.enthaelt(r.befunde[0], "erlaubt 3", "die Grenze wird genannt");
  });

  pruefe("Sieben Elemente in der Lehrkraft-Ansicht sind ein Befund mit Zahl und Grenze", () => {
    const r = r12(antwort([{name: "klasse", titel: "Klasse", zahl: 7}]));
    erwarte.gleich(r.befunde.length, 1, "genau ein Befund");
    erwarte.enthaelt(r.befunde[0], "7 sichtbare Bedienelemente", "Zahl");
    erwarte.enthaelt(r.befunde[0], "erlaubt 6", "Grenze");
  });

  pruefe("Eine nicht erreichbare Ansicht ist „nicht gemessen“ — und reißt die Regel", () => {
    const r = r12(antwort([
      {name: "heute", titel: "Heute", zahl: 1},
      {name: "klasse", titel: "Klasse", zahl: null, fehler: "Ansicht nicht aufgebaut"},
    ]));
    erwarte.gleich(r.befunde.length, 1, "der Ausfall ist ein Befund");
    erwarte.enthaelt(r.befunde[0], "nicht gemessen", "er heißt so");
    erwarte.enthaelt(r.befunde[0], "klasse", "und nennt die Ansicht");
    erwarte.gleich(r.zahlen[1][2], null, "keine 0 statt „nicht gemessen“");
  });

  pruefe("Meldet das Programm gar keine Ansicht, ist das ein Befund", () => {
    const r = r12(JSON.stringify({ansichten: [], grenze: 6, grenzen: {mitarbeit: 3}}));
    erwarte.wahr(r.befunde.length > 0, "keine Ansicht = kein Grün");
    erwarte.enthaelt(r.befunde[0], "nicht gemessen", "Klarheit statt stiller 0");
  });

  pruefe("Der alte Fehlerpfad ist im Quelltext verschwunden (`or \"{}\"` maskierte den Ausfall)", () => {
    const quelle = fs.readFileSync(path.join(WURZEL, "tools", "ethos.py"), "utf8");
    /* Nur den CODE prüfen: der R12-Kopfkommentar nennt die alten Muster absichtlich als Befund. */
    const code = quelle.split("\n").filter(z => !z.trim().startsWith("#")).join("\n");
    erwarte.falsch(code.includes('stdout or "{}"'), "die maskierende Vorgabe ist weg");
    erwarte.falsch(/daten\.get\(\s*"sichtbar"\s*,\s*0\s*\)/.test(code), "kein stiller Rückfall auf 0");
  });

  pruefe("Das Messprogramm öffnet JEDE angemeldete Ansicht und stellt die alte wieder her", () => {
    const programm = [
      "import importlib.util, json",
      "spec = importlib.util.spec_from_file_location('ethos', " + JSON.stringify(path.join(WURZEL, "tools", "ethos.py")) + ")",
      "m = importlib.util.module_from_spec(spec)",
      "spec.loader.exec_module(m)",
      "print(m.r12_js())",
    ].join("\n");
    const js = execFileSync(PY, ["-c", programm], {cwd: WURZEL, encoding: "utf8", timeout: 60000,
      env: {...(typeof process !== "undefined" && process.env ? process.env : {}), PYTHONIOENCODING: "utf-8"}, stdio: ["pipe", "pipe", "pipe"]});
    erwarte.enthaelt(js, "UI.app.liste()", "die Ansichten kommen aus dem Programm, nicht aus einer Liste im Werkzeug");
    erwarte.enthaelt(js, "UI.app.ansicht(a.name)", "jede Ansicht wird wirklich geöffnet");
    erwarte.enthaelt(js, "UI.app.ansicht(vorher)", "die vorher offene Ansicht wird wiederhergestellt");
    erwarte.enthaelt(js, "UI.app.modus", "ohne Vollmodus wird nicht gemessen, sondern gemeldet");
  });
});
