"use strict";
/* ---------- CSS-02: R12-Vorprüfung im Rauchtest (3.0.0) ----------
   BEFUND (Frontend-Audit 2.9.0, berichte/frontend-design.md § CSS-02/F-14): tools/rauch.py prüfte
   nur 1366/960/720 px, und R12 ("höchstens 6 Bedienelemente je Ansicht") existierte nur als
   DOM-Messung in tools/ethos.py (--dom) — ohne Zahl je Ansicht+Breite in einer Vorprüfung.
   AUFTRAG: rauch misst zusätzlich R12 je Ansicht und Breite (4. Breite 1440) und schreibt
   Nachweise/rauch/r12.json. EINE QUELLE BLEIBT ethos --dom: Wähler, Grenzen und Auswertung
   kommen aus tools/ethos.py; diese Datei hält nur den Schreibweg und die Vorprüfung fest.
   Norm (Lead-Beschluss W1/W2): gemessene Ratsche — keine Ansicht darf schlechter werden,
   hart sind klasse 6 und mitarbeit 3.
   GRENZE (ehrlich): der Rauchtest braucht Edge/Chrome; ohne Browser schreibt r12.json
   ausdrücklich "gemessen": false mit Grund, nie eine 0. Live-Zahlen prüft gates im Messfenster. */
gruppe("Stil: R12-Messweg im Rauchtest (CSS-02)", () => {
  const {execFileSync} = require("child_process");
  const fs = require("fs"), path = require("path"), os = require("os");
  const WURZEL = path.join(__dirname, "..");
  const RAUCH = path.join(WURZEL, "tools", "rauch.py");
  const PY = (typeof process !== "undefined" && process.env && process.env.PYTHON) || "python";

  /* Lädt das ECHTE Modul tools/rauch.py (importlib, Bauart von tests/ethos-r12.test.js) und führt
     Python-Zeilen darin aus; das Ergebnis muss JSON sein. Kein Browser, kein Prozess. */
  function py(code) {
    const programm = [
      "import importlib.util, json, sys",
      "spec = importlib.util.spec_from_file_location('rauch', " + JSON.stringify(RAUCH) + ")",
      "m = importlib.util.module_from_spec(spec)",
      "spec.loader.exec_module(m)",
      "eth = sys.modules.get('ethos')",
    ].concat(code.split("\n")).join("\n");
    const aus = execFileSync(PY, ["-c", programm], {
      cwd: WURZEL, encoding: "utf8", timeout: 120000, maxBuffer: 8 * 1024 * 1024,
      env: {...(typeof process !== "undefined" && process.env ? process.env : {}), PYTHONIOENCODING: "utf-8"},
      stdio: ["ignore", "pipe", "pipe"],
    });
    return JSON.parse(aus);
  }

  pruefe("Eine Quelle: rauch misst mit ethos.r12_js (gleicher Wähler, gleiche Grenzen)", () => {
    const r = py([
      "js = m.r12_js()",
      "print(json.dumps({",
      "  'gleich': js == eth.r12_js(),",
      "  'waehler': 'button,[role=button],input,select,textarea,a[href]' in js,",
      "  'liste': 'UI.app.liste()' in js,",
      "  'grenze': m.r12_grenzen()['grenze'],",
      "  'mitarbeit': m.r12_grenzen()['grenzen'].get('mitarbeit'),",
      "  'ethos_grenze': eth.R12_GRENZE,",
      "  'ethos_mitarbeit': eth.R12_GRENZEN.get('mitarbeit'),",
      "}))",
    ].join("\n"));
    erwarte.wahr(r.gleich, "r12_js() ist NICHT ethos.r12_js() — das waere eine zweite Messquelle");
    erwarte.wahr(r.waehler, "der R12-Waehler fehlt im Messprogramm");
    erwarte.wahr(r.liste, "die Ansichten kommen nicht aus UI.app.liste()");
    erwarte.gleich(r.grenze, 6, "allgemeine R12-Grenze");
    erwarte.gleich(r.mitarbeit, 3, "harte Grenze der Azubi-Ansicht");
    erwarte.gleich(r.grenze, r.ethos_grenze, "rauch-Grenze == ethos-Grenze");
    erwarte.gleich(r.mitarbeit, r.ethos_mitarbeit, "rauch-Grenze mitarbeit == ethos-Grenze");
  });

  pruefe("Antwort-Auswertung: Zahlen bleiben Zahlen, Fehler werden nicht zu 0", () => {
    const ok = py("print(json.dumps(m.r12_aus_antwort({'ansichten':[{'name':'klasse','titel':'Klasse','zahl':6},{'name':'mitarbeit','titel':'Auftrag','zahl':3}],'grenze':6,'grenzen':{'mitarbeit':3}})))");
    erwarte.wahr(ok.messbar, "zwei gemessene Ansichten sind messbar");
    erwarte.gleich(ok.ansichten.map((a) => [a.name, a.zahl]), [["klasse", 6], ["mitarbeit", 3]], "Zahlen unveraendert");
    erwarte.gleich(ok.grund, null, "kein Grund bei vollstaendiger Messung");
    const kaputt = py("print(json.dumps(m.r12_aus_antwort({'fehler':'UI.app fehlt - Programm nicht erreichbar'})))");
    erwarte.falsch(kaputt.messbar, "Fehler ist NICHT messbar");
    erwarte.enthaelt(kaputt.grund, "nicht gemessen", "der Zustand heisst nicht gemessen");
    erwarte.enthaelt(kaputt.grund, "UI.app fehlt", "der Grund steht da");
    erwarte.gleich(kaputt.ansichten, [], "keine erfundene Ansicht");
    const leer = py("print(json.dumps(m.r12_aus_antwort(None)))");
    erwarte.falsch(leer.messbar, "ohne Antwort nicht messbar");
    erwarte.enthaelt(leer.grund, "nicht gemessen", "ohne Antwort heisst nicht gemessen");
    const unvoll = py("print(json.dumps(m.r12_aus_antwort({'ansichten':[{'name':'heute','titel':'Heute','zahl':None,'fehler':'Ansicht nicht aufgebaut'}]})))");
    erwarte.falsch(unvoll.messbar, "eine fehlende Zahl macht die Zeile nicht messbar");
    erwarte.gleich(unvoll.ansichten[0].zahl, null, "keine 0 statt einer fehlenden Zahl");
    erwarte.enthaelt(unvoll.grund, "nicht gemessen", "Grund benannt");
  });

  pruefe("r12.json: je Ansicht und Breite eine Zahl; fehlende Messung ist gemessen=false", () => {
    const ziel = path.join(os.tmpdir(), "stil-r12-probe-" + Date.now() + ".json");
    try {
      py([
        "ziel = " + JSON.stringify(ziel),
        "zeilen = [",
        "  m.r12_zeile(1440, {'ansichten':[{'name':'heute','titel':'Heute','zahl':2},{'name':'klasse','titel':'Klasse','zahl':6}]}),",
        "  m.r12_zeile(1366, {'ansichten':[{'name':'heute','titel':'Heute','zahl':5},{'name':'klasse','titel':'Klasse','zahl':6}]}),",
        "]",
        "daten = m.r12_json_schreiben(__import__('pathlib').Path(ziel), zeilen)",
        "print(json.dumps({'gemessen': daten['gemessen'], 'grund': daten['grund']}))",
      ].join("\n"));
      const datei = JSON.parse(fs.readFileSync(ziel, "utf8"));
      erwarte.gleich(datei.fassung, 1, "Fassung des Formats");
      erwarte.gleich(datei.quelle, "tools/rauch.py", "Quelle");
      erwarte.wahr(datei.gemessen, "zwei vollstaendige Breiten sind gemessen");
      erwarte.gleich(datei.grund, null, "kein Grund bei vollstaendiger Messung");
      erwarte.gleich(datei.grenze, 6, "allgemeine Grenze steht in der Datei");
      erwarte.gleich(datei.grenzen.mitarbeit, 3, "harte Grenze steht in der Datei");
      erwarte.gleich(datei.breiten, [1440, 1366], "beide Breiten");
      erwarte.gleich(datei.messungen.length, 2, "eine Zeile je Breite");
      erwarte.gleich(datei.messungen[0].breite, 1440, "erste Breite");
      erwarte.gleich(datei.messungen[0].ansichten.map((a) => [a.name, a.zahl]), [["heute", 2], ["klasse", 6]], "Zahlen je Ansicht 1440");
      erwarte.gleich(datei.messungen[1].ansichten.map((a) => [a.name, a.zahl]), [["heute", 5], ["klasse", 6]], "Zahlen je Ansicht 1366");
      py([
        "ziel = " + JSON.stringify(ziel),
        "daten = m.r12_json_schreiben(__import__('pathlib').Path(ziel), [], grund='ohne Browser nicht gemessen: Edge/Chrome nicht gefunden')",
        "print(json.dumps({'gemessen': daten['gemessen']}))",
      ].join("\n"));
      const ohne = JSON.parse(fs.readFileSync(ziel, "utf8"));
      erwarte.falsch(ohne.gemessen, "ohne Messung gemessen=false");
      erwarte.enthaelt(ohne.grund, "nicht gemessen", "Grund nennt den Zustand");
      erwarte.enthaelt(ohne.grund, "Edge/Chrome", "Grund nennt die Ursache");
      erwarte.gleich(ohne.messungen, [], "keine erfundene Zeile ohne Messung");
    } finally {
      try { fs.unlinkSync(ziel); } catch (e) { /* Temp-Datei darf liegen bleiben */ }
    }
  });

  pruefe("Ziel-Datei: Standard Nachweise/rauch/r12.json, --r12 <pfad> ueberschreibt", () => {
    const r = py("print(json.dumps({'standard': list(m.r12_ziel([]).parts[-3:]), 'override': m.r12_ziel(['--r12','C:/tmp/probe.json']).as_posix()}))");
    erwarte.gleich(r.standard, ["Nachweise", "rauch", "r12.json"], "Standardziel");
    erwarte.gleich(r.override, "C:/tmp/probe.json", "--r12 ueberschreibt das Ziel");
  });

  pruefe("Vier Breiten inkl. 1440 (die fehlende vierte Breite aus F-14)", () => {
    const r = py("print(json.dumps({'breiten': m.BREITEN, 'n': len(m.BREITEN)}))");
    erwarte.gleich(r.n, 4, "vier Breiten");
    erwarte.gleich(r.breiten[0][0], 1440, "1440 kommt zuerst");
    erwarte.gleich(r.breiten.map((b) => b[0]), [1440, 1366, 960, 720], "1440/1366/960/720");
  });

  pruefe("Anschluss an VIS-05: ethos.r12_auswerten liest die Vorpruefung (7 in klasse = Befund)", () => {
    const r = py([
      "zeile = m.r12_zeile(1440, {'ansichten':[{'name':'klasse','titel':'Klasse','zahl':7},{'name':'mitarbeit','titel':'Auftrag','zahl':3}]})",
      "befunde, zahlen = eth.r12_auswerten(json.dumps({'ansichten': zeile['ansichten'], 'grenze': 6, 'grenzen': {'mitarbeit': 3}}))",
      "print(json.dumps({'befunde': befunde, 'zahlen': zahlen}, ensure_ascii=False))",
    ].join("\n"));
    erwarte.gleich(r.zahlen.map((z) => [z[0], z[1], z[2], z[3]]), [["Klasse", "klasse", 7, 6], ["Auftrag", "mitarbeit", 3, 3]], "Zahlen und Grenzen");
    erwarte.gleich(r.befunde.length, 1, "genau ein Befund (klasse 7 > 6, mitarbeit 3 = 3 ist in Ordnung)");
    erwarte.enthaelt(r.befunde[0], "7 sichtbare", "Zahl im Befund");
    erwarte.enthaelt(r.befunde[0], "erlaubt 6", "Grenze im Befund");
  });
});
