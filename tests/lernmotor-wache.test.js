"use strict";
/* LERNMOTOR-WACHE — Fahrplan 1.3/2.0, Schritt 4. Gebaut 09.10.2026 (task-10).

   DIE FALLE, GEGEN DIE DIESE DATEI WACHT — gemessen, nicht nacherzählt:
   Der Lernmotor liest seinen Stand EINMAL beim Laden seines Skripts und hält ihn danach im Verschluss:
       fremd/lernmotor.js:39   let st = (() => { const s = store.get("lern", null); return s && s.v === 1 ? s : leer(); })();
       fremd/lernmotor.js:40   const save = () => store.set("lern", st);
   (In der auf diesem Rechner tatsächlich geladenen Spielhalle-Quelle stehen dieselben zwei Zeilen
   auf :13/:14 — die Nummern 39/40 zählen den Herkunftskopf der Kopie mit. Gemessen: siehe Test 4.)
   Daraus folgen zwei Dinge, die unsere Seite NICHT heilen kann:
     · `s.v === 1` ist streng und ohne Migration: ein Stand mit anderer Fassung wird STILL durch leer() ersetzt.
     · Wer den Speicher NACH dem Start von außen beschreibt, wird nicht gehört: `save()` schreibt das alte
       Objekt des Motors zurück. Deshalb ruft src/spiel/uebergabe.js:34 `L.reset()` und löscht NICHT den
       Speicherschlüssel (Begründung im Kopfkommentar :20-24 — genau diese Falle).

   WAS DIESE DATEI AUF UNSERER SEITE SICHERT:
     · Im ganzen `src/` greift NIEMAND direkt auf `store` "lern" zu. Der Lernstand geht ausschließlich über
       die L.*-API (L.ueben, L.reset, L.st lesend). Ein Verstoß macht Test 1 rot.
     · Eine Übergabe mit `lernstandBehalten:false` scheitert nicht still: entweder sie leert den Stand
       wirklich (Motor UND Speicher) oder sie lehnt mit einem Grund ab.
     · Motor und Speicher tragen danach denselben Stand — kein stilles Auseinanderlaufen.

   WAS SIE NICHT KANN (ehrlich): `fremd/lernmotor.js` ist eine KOPIE mit Herkunftskopf „FREMDE DATEI —
   NICHT HIER BEARBEITEN". Eine Änderung dort hätte auf diesem Rechner KEINE Wirkung, weil tests/run.js:13-20
   und bauen.py:92-95 der FISI-Spielhalle VORRANG geben, solange sie daneben liegt. Die strenge
   `v === 1`-Prüfung und der Verschluss sind deshalb nur in der Spielhalle zu beheben; der Befund samt
   Änderungsvorschlag steht in `docs/entwicklung/Befund – Lernmotor-Falle.md`. */
const LMW_HAT_FS = (() => { try { return typeof require === "function" && typeof __dirname === "string"; } catch (e) { return false; } })();
const LMW_ZUSATZ = LMW_HAT_FS ? "" : " (übersprungen: ohne require/__dirname nicht prüfbar – node tests/run.js)";

gruppe("Lernmotor-Wache", () => {
  const FS = LMW_HAT_FS ? require("fs") : null;
  const PATH = LMW_HAT_FS ? require("path") : null;
  const WURZEL = LMW_HAT_FS ? PATH.resolve(__dirname, "..") : null;
  const SRC = LMW_HAT_FS ? PATH.join(WURZEL, "src") : null;

  /* ---------- Der Detektor ----------
     Kommentare weg, Zeilen bleiben: sonst findet die Wache den SATZ über den Aufruf statt den Aufruf.
     Blockkommentare werden zu Leerzeichen (Zeilenumbrüche bleiben), eine Zeile, die mit `//` beginnt,
     gilt ganz als Kommentar, und ein `//` hinter Code schneidet den Rest der Zeile ab — aber nur, wenn es
     nicht in einer Zeichenkette steht. Was hier NICHT erkannt würde: ein Verstoß, der hinter einem
     Zeilenkommentar steht. Das ist kein Verstoß, sondern Prosa. */
  function ohneKommentar(text){
    let aus = "", i = 0, t = String(text).replace(/\r\n/g, "\n");
    while (i < t.length) {
      if (t.startsWith("/*", i)) {
        const j = t.indexOf("*/", i + 2), e = j === -1 ? t.length : j + 2;
        aus += t.slice(i, e).replace(/[^\n]/g, " ");
        i = e;
      } else { aus += t[i]; i++; }
    }
    return aus.split("\n").map(zeile => {
      if (/^\s*\/\//.test(zeile)) return "";
      let q = null;
      for (let k = 0; k < zeile.length; k++) {
        const c = zeile[k];
        if (q) { if (c === "\\") k++; else if (c === q) q = null; continue; }
        if (c === '"' || c === "'" || c === "`") { q = c; continue; }
        if (c === "/" && zeile[k + 1] === "/") return zeile.slice(0, k);
      }
      return zeile;
    }).join("\n");
  }
  /* Die vier Muster, mit denen man an der L.*-API vorbei an den Lernstand käme (der Kontrolltext unten
     enthält fünf Zugriffe, weil `store.get` und `store.set` zwei verschiedene sind). */
  const MUSTER = [
    /store\s*\.\s*(?:get|set)\s*\(\s*["'`]lern["'`]/,      /* store.get("lern", …) / store.set("lern", …) */
    /store\s*\[\s*["'`]lern["'`]\s*\]/,                    /* store["lern"] */
    /SPEICHER\s*\.\s*daten\s*\.\s*lern\b/,                 /* SPEICHER.daten.lern */
    /SPEICHER\s*\.\s*daten\s*\[\s*["'`]lern["'`]\s*\]/,    /* SPEICHER.daten["lern"] */
  ];
  /* Alle Fundstellen als „Datei:Zeile" — höchstens max, damit eine Meldung lesbar bleibt. */
  function verstoesse(datei, text, max = 8){
    const z = ohneKommentar(text).split("\n"), treffer = [];
    for (let i = 0; i < z.length && treffer.length < max; i++)
      if (MUSTER.some(re => re.test(z[i]))) treffer.push(`${datei}:${i + 1}`);
    return treffer;
  }
  function sammeln(ordner){
    const aus = [];
    for (const e of FS.readdirSync(ordner, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = PATH.join(ordner, e.name);
      if (e.isDirectory()) aus.push(...sammeln(p));
      else if (e.name.endsWith(".js")) aus.push(p);
    }
    return aus;
  }
  const rel = p => PATH.relative(WURZEL, p).replace(/\\/g, "/");
  const motorQuelle = () => PATH.resolve(WURZEL, "..", "FISI-Spielhalle", "src", "lernmotor.js");
  const motorKopie = () => PATH.join(WURZEL, "fremd", "lernmotor.js");
  const melde = (titel, belege) => console.log(`${titel} → ` + belege.filter(Boolean).join(" · "));

  /* ---------- 1. Die Wache selbst ---------- */
  pruefe("Wächter: im ganzen src/ geht der Lernstand nur über die L.*-API" + LMW_ZUSATZ, () => {
    if (!LMW_HAT_FS) return;
    const dateien = sammeln(SRC);
    /* Gegen ein stilles Grün: eine leere oder halbe Liste würde nichts beweisen. */
    erwarte.wahr(dateien.length >= 100, `nur ${dateien.length} Dateien in src/ gefunden — die Wache hat nichts zu prüfen`);
    erwarte.wahr(dateien.some(p => rel(p) === "src/spiel/uebergabe.js"), "src/spiel/uebergabe.js liegt im Suchlauf");
    const funde = [];
    for (const p of dateien) funde.push(...verstoesse(rel(p), FS.readFileSync(p, "utf8")));
    if (funde.length) throw new Error(
      "Direkter Zugriff auf den Lernstand im Speicher — der geht AUSSCHLIESSLICH über die L.*-API\n" +
      "    (Vorbild src/spiel/uebergabe.js:34: L.reset() VOR Spiel.laden(), weil der Motor seinen Stand\n" +
      "    im Verschluss hält und fremde Schreibvorgänge beim nächsten save() überschreibt):\n      " +
      funde.join("\n      "));
    erwarte.gleich(funde, [], "kein direkter Zugriff auf store \"lern\" in src/");
    melde("Wache src/", [`${dateien.length} Dateien geprüft`, "0 Verstöße"]);
  });

  /* ---------- 2. Gegenprobe am echten Verstoß: der Motor selbst ----------
     Ohne diese Probe wäre ein grünes Test 1 nicht von einem kaputten Detektor zu unterscheiden. */
  pruefe("Gegenprobe: der Detektor findet den echten Zugriff im Lernmotor — mit Datei:Zeile" + LMW_ZUSATZ, () => {
    if (!LMW_HAT_FS) return;
    const quelle = motorQuelle(), kopie = motorKopie();
    const datei = FS.existsSync(quelle) ? quelle : kopie;
    const funde = verstoesse(rel(datei), FS.readFileSync(datei, "utf8"));
    erwarte.gleich(funde.length, 2, `genau zwei Zugriffe erwartet (lesen beim Laden, schreiben in save()) – gefunden: ${funde.join(", ") || "keine"}. ` +
      "Ändert die FISI-Spielhalle den Motor, ist dieser Befund überholt: erst `python tools/lernmotor.py` laufen lassen, " +
      "dann docs/entwicklung/Befund – Lernmotor-Falle.md und diese Wache nachziehen.");
    const z = ohneKommentar(FS.readFileSync(datei, "utf8")).split("\n");
    const lesen = z.findIndex(x => /store\.get\("lern"/.test(x)) + 1;
    const schreiben = z.findIndex(x => /store\.set\("lern"/.test(x)) + 1;
    erwarte.wahr(lesen > 0 && schreiben > 0, "beide Zugriffe stehen im Code (nicht nur im Kommentar)");
    erwarte.passt(z[lesen - 1], /s\.v\s*===\s*1/, "die strenge, migrationslose Prüfung steht in der Lesezeile — migriert sie eines Tages, ist dieser Befund behoben");
    erwarte.passt(z[schreiben - 1], /const\s+save\s*=\s*\(\)\s*=>/, "die Schreibzeile ist der Verschluss-save");
    melde("Gegenprobe Motor", [`${rel(datei)}:${lesen} liest`, `${rel(datei)}:${schreiben} schreibt`]);
  });

  /* ---------- 3. Gegenprobe am eingeschleusten Verstoß ---------- */
  pruefe("Gegenprobe: ein eingeschleuster Verstoß wird rot — in jeder Schreibweise" + LMW_ZUSATZ, () => {
    if (!LMW_HAT_FS) return;
    const boese = 'const x = store.get("lern", null);\nstore.set("lern", x);\nconst y = store["lern"];\nconst z = SPEICHER.daten.lern;\nSPEICHER.daten["lern"] = 1;';
    erwarte.gleich(verstoesse("probe.js", boese).length, 5, "alle fünf Zugriffe werden gefunden");
    const gut = 'L.reset();\nL.ueben("lab.link", true);\nconst u = L.st.units;\nstore.set("labor", Spiel._st);\n/* store.get("lern", null) steht hier NUR als Prosa */\n// store.set("lern", x)\n';
    erwarte.gleich(verstoesse("probe.js", gut), [], "sauberer Code und Prosa lösen keinen Fehlalarm aus");
    melde("Gegenprobe eingeschleust", ["5/5 Schreibweisen gefunden", "0 Fehlalarm in Prosa und Kommentar"]);
  });

  /* ---------- 4. Welche Datei lädt der Testlauf wirklich? ---------- */
  pruefe("Gemessen: der Testlauf lädt die Spielhalle-Quelle, nicht die Kopie — eine Änderung an der Kopie wäre wirkungslos" + LMW_ZUSATZ, () => {
    if (!LMW_HAT_FS) return;
    const quelle = motorQuelle(), kopie = motorKopie();
    const quelleDa = FS.existsSync(quelle), kopieDa = FS.existsSync(kopie);
    /* Nachbau der Auswahl aus tests/run.js:13-20 — dieselbe Reihenfolge, kein eigener Vorrang. */
    const geladen = quelleDa ? quelle : (kopieDa ? kopie : null);
    erwarte.wahr(!!geladen, "ohne Motor gäbe tests/run.js mit LADEFEHLER auf (run.js:18)");
    if (quelleDa) {
      erwarte.gleich(geladen, quelle, "run.js:16 gibt der danebenliegenden Spielhalle den Vorrang");
      erwarte.wahr(geladen !== kopie, "die Kopie fremd/lernmotor.js wird NICHT gelesen");
    } else {
      erwarte.gleich(geladen, kopie, "Rückfall ohne Spielhalle: die Kopie (run.js:17)");
    }
    /* Derselbe Vorrang steht im Bau — beide Wege nehmen dieselbe Quelle. */
    const bauen = FS.readFileSync(PATH.join(WURZEL, "bauen.py"), "utf8");
    erwarte.passt(bauen, /if LERNMOTOR_QUELLE\.is_file\(\):\s*\n\s*return LERNMOTOR_QUELLE, False/, "bauen.py:92-93 gibt der Quelle ebenfalls Vorrang");
    melde("Geladener Lernmotor", [rel(geladen), quelleDa ? "Spielhalle liegt daneben → sie hat Vorrang" : "Spielhalle fehlt → Kopie"]);
  });

  /* ---------- 5. bis 7. Der Fall aus dem Fahrplan, auf unserer Seite ---------- */
  const kapsel = fn => () => {
    const altSpeicher = store.alles(), altLern = tief(L.st), altSt = Spiel._st, altEinst = Spiel._einst, uhr = jetzt();
    try { fn(); }
    finally {
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, altSpeicher);
      const s = L.st; for (const k of Object.keys(s)) delete s[k]; Object.assign(s, altLern);
      Spiel._st = altSt; Spiel._einst = altEinst; Spiel._lz = {};
      jetzt.setzen(uhr); jetzt.frei();
    }
  };
  const lernen = () => { Spiel.skillsRegistrieren(); L.ueben("lab.link", true); return L.box("lab.link") > 0; };

  pruefe("Übergabe mit lernstandBehalten:false scheitert nicht still", kapsel(() => {
    erwarte.wahr(lernen(), "Vorbedingung: der Motor hat einen Kasten gehoben");
    const r = Spiel.uebergabe({lernstandBehalten: false});
    const speicher = store.get("lern", null);
    if (r.ok) {
      erwarte.gleich(Object.keys(L.st.units), [], "Motor: keine Einheiten mehr");
      erwarte.gleich(speicher && speicher.units, {}, "Speicher: keine Einheiten mehr");
      erwarte.gleich(r.lernstandBehalten, false, "die Übergabe meldet die Entscheidung");
    } else {
      erwarte.wahr(!!r.grund && String(r.grund).length > 0, "eine Ablehnung MUSS einen Grund nennen (src/spiel/uebergabe.js:27-31)");
    }
    const uebrig = Object.keys((speicher && speicher.units) || {}).length;
    erwarte.wahr(!(r.ok && uebrig > 0), `stiller Teilerfolg: ok:true, aber ${uebrig} Einheiten stehen noch im Speicher`);
  }));

  pruefe("Nach dem Zurücksetzen schreibt der Motor weiter — der alte Stand kommt nicht zurück", kapsel(() => {
    erwarte.wahr(lernen(), "Vorbedingung: Lernstand da");
    /* Eine Marke, die nur im Verschluss des Motors lebt: wer den Speicherschlüssel von außen löscht,
       statt L.reset() zu rufen, bekommt sie beim nächsten save() zurück. */
    L.fehler("labor", "lab.link", "MARKE-der-Wache");
    erwarte.gleich(L.st.fehler.length, 1, "die Marke steht im Motor");
    const r = Spiel.uebergabe({lernstandBehalten: false});
    erwarte.wahr(r.ok, "die Übergabe gelingt");
    erwarte.gleich(L.st.fehler, [], "L.reset() hat den Motor selbst geleert");
    L.ueben("lab.link", true);                     /* der nächste Azubi lernt → save() */
    const s = store.get("lern", null);
    erwarte.gleich((s && s.fehler) || [], [], "kein Wiederauferstehen der Marke im Speicher");
    erwarte.gleich((s && s.units && Object.keys(s.units)) || [], ["lab.link"], "Motor und Speicher führen denselben neuen Stand");
    erwarte.gleich((s && s.units && s.units["lab.link"] && s.units["lab.link"].r) || 0, L.st.units["lab.link"].r, "derselbe Zähler in beiden");
  }));

  pruefe("Falle (gemessen): ein von außen gesetzter Lernstand wird nie halb übernommen", kapsel(() => {
    erwarte.wahr(lernen(), "Vorbedingung: Lernstand da");
    /* Ein „importierter" Stand, wie ihn eine Datei-Übernahme in den Speicher legen würde. */
    const fremd = {v: 1, units: {"lab.fremd": {box: 3, due: null, r: 9, f: 0, last: null, sf: 0}}, log: [], fehler: [], tage: {}, tests: []};
    store.set("lern", fremd);
    Spiel.laden();
    const motorSieht = !!(L.st.units && L.st.units["lab.fremd"]);
    L.ueben("lab.link", true);                     /* der nächste save() des Motors */
    const s = store.get("lern", null);
    const speicherHaelt = !!(s && s.units && s.units["lab.fremd"]);
    /* Die Zusage, die unsere Seite halten kann: entweder der Motor übernimmt den Stand GANZ oder
       er ignoriert ihn GANZ. Halb — der Motor sieht ihn nicht, der Speicher behält ihn — wäre die
       stille Lüge, die dieses Projekt nicht will. */
    erwarte.gleich(motorSieht, speicherHaelt, "halb übernommener Lernstand: Motor und Speicher sind sich uneins");
    melde("Falle von außen", [`Motor sieht den Fremdstand: ${motorSieht}`, `Speicher hält ihn nach save(): ${speicherHaelt}`,
                              motorSieht ? "Motor übernimmt ihn" : "der Import ist nach dem nächsten save() verloren — nur in der FISI-Spielhalle zu beheben"]);
  }));
});
