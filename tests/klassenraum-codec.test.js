"use strict";
/* KLASSENRAUM-CODEC (Stufe A1) — Vertrag: `docs/entwicklung/Klassenraum/A – Codec und Determinismus.md`
   § 1 (Format, Prüfsumme, Fehlerklassen), § 2 (Bit-Budget, eingefrorene Tabellen), § 3.1 (Seed-Fenster),
   § 4.2 (Netzkennwert), § 6 (Ergebnis-Code).

   WORAN DIESE DATEI MISST: an den WORTLaut-Beispielen und Sollzahlen des Dokuments A — nicht an der
   Probe. Die Probe weicht belegbar ab (K.zeichen ohne Modulo, localeCompare im Kennwert, `fassung`
   statt `auftrag` im erschöpften Fenster); wo sie sich widersprechen, gilt A.

   Die Prüfsumme ist der Kern: C1 über die Gewichte 1..n mod 31 (31 ist prim) fängt jede
   Einzel-Ersetzung, C2 über die ungeraden Gewichte 1,3,5,… mod 32 fängt jede Nachbarvertauschung.
   Beides wird hier NICHT nur behauptet, sondern über den ganzen Zeichenraum nachgerechnet. */
gruppe("Klassenraum: Codec (A1)", () => {
  const K = typeof KlassenraumCodec !== "undefined" ? KlassenraumCodec : null;

  /* Quelldatei lesen (das Testgerüst gibt `require`/`__dirname` mit, tests/run.js:42-48) — für die
     Reinheits- und Determinismus-Prüfungen in einem FRISCHEN, leeren Kontext. */
  const quelle = () => {
    try {
      const fs = require("fs"), path = require("path");
      return fs.readFileSync(path.join(__dirname, "..", "src", "spiel", "klassenraum-codec.js"), "utf8");
    } catch (e) { return null; }
  };
  const frisch = () => {
    const q = quelle();
    if (!q) return null;
    const vm = require("vm"), ctx = vm.createContext({});
    vm.runInContext(q + ";globalThis.__K = KlassenraumCodec;", ctx);
    return ctx.__K;
  };
  /* Ein Ergebnis-Code mit ROHEM Sterne-Bitwert — `ergebnisBauen` klemmt bei 10 (§ 1.5), für die
     Bereichsprüfung braucht der Test deshalb einen eigenen, unabhängigen Packer (Nutzzeichen und
     Prüfsumme kommen aus dem Codec selbst, die Bitfolge setzt dieser Packer). */
  const packErgebnis = f => {
    const n = ((f.sitzung << 20) | (f.platz << 15) | (f.sterneHalbe << 11) | (f.versuche << 9) | f.dauer) >>> 0;
    const w = [(n >>> 20) & 31, (n >>> 15) & 31, (n >>> 10) & 31, (n >>> 5) & 31, n & 31];
    const p = K.pruefsummen(w);
    const zk = w.map(v => K.ALPHABET[v]).concat([p.z1, p.z2]);
    return "E-" + zk.slice(0, 4).join("") + "-" + zk.slice(4, 7).join("");
  };
  /* Ein kleines, aber vollständiges Netz (Geräte, Kabel, Laufzeitzustand). */
  const netzBauen = () => ({
    v: 1,
    geraete: {
      sw1: {id: "sw1", typ: "switch", name: "SW1", an: true, running: {hostname: "SW1", if: {}}, startup: null, x: 10, y: 20},
      pc1: {id: "pc1", typ: "pc", name: "PC1", an: true, running: {hostname: "PC1", if: {eth0: {ip: "192.168.10.11"}}}, startup: null, x: 30, y: 40},
    },
    kabel: [{id: "k1", a: {geraet: "pc1", port: "eth0"}, b: {geraet: "sw1", port: "Fa0/1"}},
            {id: "k2", a: {geraet: "sw1", port: "Gi0/1"}, b: {geraet: "sw1", port: "Gi0/2"}}],
    zustand: {_uhr: 0, sw1: {macs: {"Fa0/1": "AA:BB:CC:DD:EE:01"}}},
  });

  pruefe('Die Beispiele aus A § 1.3/§ 1.4/§ 6.1: Rechenweg, Prüfzeichen und Kodierung stimmen Zeichen für Zeichen', () => {
    erwarte.wahr(K, "KlassenraumCodec ist geladen");
    erwarte.gleich(K.auftragBauen({sitzung: 7, art: 0, index: 11, variante: 42}), "NL-HC3L-CS", "Beispiel 1 (handgeschrieben)");
    erwarte.gleich(K.auftragBauen({sitzung: 20, art: 1, index: 5, variante: 200}), "NL-WTQJ-EF", "Beispiel 2 (generiert)");
    const a = K.auftragLesen("NL-HC3L-CS");
    erwarte.gleich([a.ok, a.sitzung, a.artBit, a.art, a.index, a.variante, a.seed, a.C1, a.C2], [true, 7, 0, "hand", 11, 42, 43, 2, 16]);
    const b = K.auftragLesen("NL-WTQJ-EF");
    erwarte.gleich([b.sitzung, b.artBit, b.art, b.index, b.variante], [20, 1, "generiert", 5, 200]);
    erwarte.gleich(K.ergebnisBauen({sitzung: 9, platz: 5, sterne: 5, versuche: 1, dauerS: 70}), "E-KFWS-HZM", "§ 6.1-Beispiel");
    const e = K.ergebnisLesen("E-KFWS-HZM");
    erwarte.gleich([e.ok, e.sitzung, e.platz, e.sterne, e.sterneHalbe, e.versuche, e.dauerS, e.C1, e.C2], [true, 9, 5, 5, 10, 1, 70, 23, 11]);
    /* § 1.4: das FORMMUSTER des Auftrags ist kein gültiger Code — richtig wäre NL-4F7K-E3. */
    const form = K.auftragLesen("NL-4F7K-2Q");
    erwarte.gleich([form.ok, form.fehler, form.erwartet, form.gesucht === undefined ? form.gefunden : form.gesucht], [false, "prüfziffer", "E3", "2Q"]);
    erwarte.gleich(K.auftragLesen("NL-4F7K-E3").ok, true, "die richtige Prüfziffer wird angenommen");
    /* § 1.2: das erste Prüfzeichen ist nie 9 (C1 liegt in 0..30) */
    let neun = 0;
    for (let v = 0; v < 256; v++) for (let i = 0; i < 64; i++) if (K.auftragBauen({sitzung: 0, art: 0, index: i, variante: v}).slice(8, 9) === "9") neun++;
    erwarte.gleich(neun, 0, "erstes Prüfzeichen nie 9");
  });

  pruefe('Erschöpfender Round-Trip Auftragscode: ALLE 2^20 Nutzlasten (§ 2.1) bauen → lesen → gleiche Felder', () => {
    erwarte.wahr(K, "KlassenraumCodec ist geladen");
    let faelle = 0, gueltig = 0, fassung = 0, falsch = 0, laengeFalsch = 0, erster = null;
    for (let sitzung = 0; sitzung < 32; sitzung++) for (let art = 0; art < 2; art++)
      for (let index = 0; index < 64; index++) for (let variante = 0; variante < 256; variante++) {
        faelle++;
        const code = K.auftragBauen({sitzung, art, index, variante});
        if (code.length !== 10) { laengeFalsch++; continue; }
        const r = K.auftragLesen(code);
        const grenze = art === 0 ? K.TABELLE_AUFTRAEGE_LAENGE : K.TABELLE_SKILLS_LAENGE;
        if (index >= grenze) {                                  /* § 2.3: reservierte Indizes = andere Fassung */
          if (r && r.ok === false && r.fehler === "fassung") fassung++; else { falsch++; erster = erster || code; }
          continue;
        }
        gueltig++;
        if (!r || r.ok !== true || r.sitzung !== sitzung || r.artBit !== art || r.index !== index || r.variante !== variante || r.seed !== variante + 1) {
          falsch++; erster = erster || code;
        }
      }
    erwarte.gleich(faelle, 1048576, "alle 2^20 Nutzlasten");
    erwarte.gleich([laengeFalsch, falsch], [0, 0], "keine Abweichung" + (erster ? " (erste: " + erster + ")" : ""));
    erwarte.gleich(gueltig, 32 * (58 + 27) * 256, "einlösbare Nutzlasten (58 Aufträge, 27 Fertigkeiten)");
    erwarte.gleich(fassung, 1048576 - 32 * (58 + 27) * 256, "der Rest ist `fassung` — kein anderer Fehler");
  });

  pruefe('Erschöpfender Round-Trip Ergebnis-Code: jedes Sterne-/Versuchs-/Dauer-Bit und beide Ränder', () => {
    erwarte.wahr(K, "KlassenraumCodec ist geladen");
    let faelle = 0, gueltig = 0, bereich = 0, falsch = 0, erster = null;
    const pruefeFall = (sitzung, platz, sterneHalbe, versuche, dauer) => {
      faelle++;
      /* Gültige Sterne über den Produktweg, unerlaubte über den unabhängigen Packer (er klemmt nicht). */
      const code = sterneHalbe <= 10
        ? K.ergebnisBauen({sitzung, platz, sterne: sterneHalbe / 2, versuche, dauerS: dauer * 10})
        : packErgebnis({sitzung, platz, sterneHalbe, versuche, dauer});
      if (code.length !== 10) { falsch++; erster = erster || code; return; }
      const r = K.ergebnisLesen(code);
      if (sterneHalbe > 10) {                                   /* § 1.5: 4 Bit können 11..15 tragen → `bereich` */
        if (r && r.ok === false && r.fehler === "bereich" && r.sterneHalbe === sterneHalbe) bereich++; else { falsch++; erster = erster || code; }
        return;
      }
      gueltig++;
      if (!r || r.ok !== true || r.sitzung !== sitzung || r.platz !== platz || r.sterneHalbe !== sterneHalbe ||
          r.sterne !== sterneHalbe / 2 || r.versuche !== versuche || r.dauerS !== dauer * 10) { falsch++; erster = erster || code; }
    };
    /* (a) alle 32 Sitzungen × alle 32 Plätze × alle 16 Sterne-Stufen × alle 4 Versuchs-Stufen bei drei Dauern */
    for (const dauer of [0, 255, 511])
      for (let s = 0; s < 32; s++) for (let p = 0; p < 32; p++) for (let st = 0; st < 16; st++) for (let v = 0; v < 4; v++) pruefeFall(s, p, st, v, dauer);
    /* (b) alle 512 Dauer-Stufen für die Randpaare (Sitzung/Platz 0 und 31) × alle Sterne × Versuche 0 und 3 */
    for (const s of [0, 31]) for (const p of [0, 31]) for (let st = 0; st < 16; st++) for (const v of [0, 3]) for (let d = 0; d < 512; d++) pruefeFall(s, p, st, v, d);
    erwarte.gleich(faelle, 196608 + 65536, "geprüfte Ergebnis-Fälle (jede Sterne-, Versuchs- und Dauer-Stufe erschöpfend)");
    erwarte.gleich([falsch, erster], [0, null], "keine Abweichung");
    erwarte.gleich(gueltig, (196608 + 65536) * 11 / 16, "gültige Fälle: nur die Sterne-Stufen 0..10");
    erwarte.gleich(bereich, faelle - gueltig, "der Rest ist `bereich` — kein anderer Fehler");
    /* Der Grenzwert selbst bleibt gültig (§ 1.5) */
    const grenze = K.ergebnisLesen(packErgebnis({sitzung: 3, platz: 7, sterneHalbe: 10, versuche: 1, dauer: 5}));
    erwarte.gleich([grenze.ok, grenze.sterne], [true, 5], "10 halbe Sterne = fünf Sterne, gültig");
  });

  pruefe('Prüfsumme: jede Ein-Zeichen-Ersetzung und jede Vertauschung zweier Nutzzeichen wird markiert, nie geworfen', () => {
    erwarte.wahr(K, "KlassenraumCodec ist geladen");
    const proben = [];
    for (let i = 0; i < 24; i++) proben.push(K.auftragBauen({sitzung: (i * 7) % 32, art: i % 2, index: (i * 5) % 27, variante: (i * 37) % 256}));
    for (let i = 0; i < 24; i++) proben.push(K.ergebnisBauen({sitzung: (i * 3) % 32, platz: (i * 11) % 32, sterne: (i % 11) / 2, versuche: i % 4, dauerS: (i * 211) % 5110}));
    const setzen = (istAuftrag, rumpf) => istAuftrag
      ? "NL-" + rumpf.slice(0, 4) + "-" + rumpf.slice(4)
      : "E-" + rumpf.slice(0, 4) + "-" + rumpf.slice(4);
    const lies = (istAuftrag, text) => istAuftrag ? K.auftragLesen(text) : K.ergebnisLesen(text);
    let ersetzungen = 0, ersetztErkannt = 0, vertauschungen = 0, vertauschtErkannt = 0, pruefzeichenTausch = 0, pruefzeichenTauschOk = 0, geworfen = 0, kreuze = 0, kreuzUnbemerkt = 0;
    for (const code of proben) {
      const istAuftrag = code.startsWith("NL");
      const rumpf = code.replace(/-/g, "").slice(istAuftrag ? 2 : 1);      /* Nutzzeichen + Prüfzeichen */
      const nutz = istAuftrag ? 4 : 5;
      /* (1) jede Position gegen jedes andere Alphabet-Zeichen */
      for (let p = 0; p < rumpf.length; p++) for (const c of K.ALPHABET) {
        if (c === rumpf[p]) continue;
        ersetzungen++;
        try { const r = lies(istAuftrag, setzen(istAuftrag, rumpf.slice(0, p) + c + rumpf.slice(p + 1))); if (r && r.ok === false && r.fehler === "prüfziffer") ersetztErkannt++; }
        catch (e) { geworfen++; }
      }
      /* (2) zwei NUTZZEICHEN vertauscht (nicht benachbart eingeschlossen) */
      for (let a = 0; a < nutz; a++) for (let b = a + 1; b < nutz; b++) {
        if (rumpf[a] === rumpf[b]) continue;
        vertauschungen++;
        const z = [...rumpf]; const t = z[a]; z[a] = z[b]; z[b] = t;
        try { const r = lies(istAuftrag, setzen(istAuftrag, z.join(""))); if (r && r.ok === false && r.fehler === "prüfziffer") vertauschtErkannt++; }
        catch (e) { geworfen++; }
      }
      /* (3) die beiden PRÜFZEICHEN getauscht: gleicher Code (wenn gleich) oder erkannt (§ 1.2) */
      pruefzeichenTausch++;
      const z = [...rumpf]; const t = z[nutz]; z[nutz] = z[nutz + 1]; z[nutz + 1] = t;
      const neu = setzen(istAuftrag, z.join(""));
      if (neu === code) pruefzeichenTauschOk++;
      else { const r = lies(istAuftrag, neu); if (r && r.ok === false) pruefzeichenTauschOk++; }
      /* (4) über die Gruppengrenze: letztes Nutzzeichen mit erstem Prüfzeichen — die EINZIGE gemessene
         Lücke des Verfahrens (A § 1.2: 167 von 1.015.808 unbemerkt). Wird gemessen, nicht behauptet. */
      kreuze++;
      const y = [...rumpf]; const s = y[nutz - 1]; y[nutz - 1] = y[nutz]; y[nutz] = s;
      const kreuzText = setzen(istAuftrag, y.join(""));
      const kr = lies(istAuftrag, kreuzText);
      if (kreuzText !== code && kr && kr.ok === true) kreuzUnbemerkt++;
    }
    erwarte.gleich(geworfen, 0, "keine Ausnahme, nie");
    erwarte.gleich([ersetztErkannt, ersetzungen], [ersetzungen, ersetzungen], "jede Ein-Zeichen-Ersetzung ist `prüfziffer`");
    erwarte.gleich([vertauschtErkannt, vertauschungen], [vertauschungen, vertauschungen], "jede Nutzzeichen-Vertauschung ist `prüfziffer`");
    erwarte.gleich([pruefzeichenTauschOk, pruefzeichenTausch], [pruefzeichenTausch, pruefzeichenTausch], "Prüfzeichen-Tausch: gleicher Code oder erkannt");
    erwarte.wahr(kreuzUnbemerkt <= Math.ceil(kreuze * 0.01), "Gruppengrenzen-Tausch: gemessene Lücke bleibt unter 1 % (" + kreuzUnbemerkt + " von " + kreuze + ")");
  });

  pruefe('Normalisierung (§ 1.1/§ 1.5): Schreibweisen, Präfix-Falle, Fremdzeichen, Längen, leere Eingabe', () => {
    erwarte.wahr(K, "KlassenraumCodec ist geladen");
    const felder = t => { const r = K.auftragLesen(t); return [r.sitzung, r.artBit, r.index, r.variante]; };
    const soll = [4, 0, 12, 7];
    erwarte.gleich(["NL-EDAH-H8", "nl-edah-h8", "NLEDAHH8", " nl edah-h8 ", "NL.EDAH.H8", "nl.edah.h8"].map(felder),
      [soll, soll, soll, soll, soll, soll], "fünf Schreibweisen, dieselben Felder (§ 1.1 gemessen)");
    /* Präfix-Falle: der Nutzteil beginnt selbst mit NL */
    const falle = ["NL-NLHW-K3", "NLNLHWK3", "nl nlhw k3"].map(t => { const r = K.auftragLesen(t); return [r.sitzung, r.artBit, r.index, r.variante]; });
    erwarte.gleich(falle, [[12, 0, 40, 244], [12, 0, 40, 244], [12, 0, 40, 244]], "NL-NLHW-K3 bleibt lesbar");
    erwarte.gleich(K.auftragLesen("nl4f7k2q"), K.auftragLesen("NL-4F7K-2Q"), "Kleinbuchstaben und fehlende Striche sind gleichwertig");
    const e1 = K.ergebnisLesen("E-KFWS-HZM"), e2 = K.ergebnisLesen("ekfwshzm"), e3 = K.ergebnisLesen("E.KFWS.HZM");
    erwarte.gleich([e2.sitzung, e2.platz, e2.sterne, e2.dauerS], [e1.sitzung, e1.platz, e1.sterne, e1.dauerS]);
    erwarte.gleich([e3.sitzung, e3.versuche], [e1.sitzung, e1.versuche]);
    /* Fremdzeichen (I, O, 0, 1) */
    const o = K.auftragLesen("NL-AAAO-AA");
    erwarte.gleich([o.ok, o.fehler, o.zeichen], [false, "zeichen", "O"]);
    erwarte.gleich(K.auftragLesen("NL-AAA0-AA").fehler, "zeichen");
    /* Längen mit den gemessenen Texten (§ 1.5) */
    const l1 = K.auftragLesen("NL-ABC");
    erwarte.gleich([l1.fehler, l1.länge, l1.erwartet], ["länge", 5, 6]);
    erwarte.enthaelt(l1.grund, "Der Code hat 5 Zeichen – er braucht 6");
    const l2 = K.auftragLesen("E-EDSB-6SA");                  /* Ergebnis-Code im Auftragsfeld */
    erwarte.gleich([l2.fehler, l2.länge], ["länge", 8]);
    erwarte.enthaelt(l2.hinweis, "Ergebnis-Code");
    const l3 = K.ergebnisLesen("E-ABC");
    erwarte.gleich([l3.fehler, l3.länge, l3.erwartet], ["länge", 4, 7]);
    const l4 = K.ergebnisLesen("NL-FA2D-5U");                 /* Auftragscode im Ergebnisfeld */
    erwarte.gleich([l4.fehler, l4.länge], ["länge", 8]);
    /* Nichts getippt = keine Fehlermeldung (§ 1.5) */
    erwarte.gleich([K.auftragLesen(""), K.auftragLesen(null), K.auftragLesen(undefined), K.auftragLesen("   "), K.ergebnisLesen(""), K.ergebnisLesen(null)], [null, null, null, null, null, null]);
    /* Unsinn wirft nie (§ 5: „reine Rechnung, KEINE Ausnahme") */
    const unsinn = [42, {}, [], true, "???", "N", "NL-", "E-", "NL-4F7K-2Q-extra"].map(t => { try { const a = K.auftragLesen(t), b = K.ergebnisLesen(t); return (a === null || a.ok === false) && (b === null || b.ok === false); } catch (e) { return "WURF"; } });
    erwarte.gleich(unsinn, [true, true, true, true, true, true, true, true, true], "kein Wurf, immer ein Ergebnis");
  });

  pruefe('Bereich, Fassung, Auftrag: die Fehlerklassen aus § 1.5 mit ihren wörtlichen Sollwerten', () => {
    erwarte.wahr(K, "KlassenraumCodec ist geladen");
    /* bereich — von Hand gepackt, weil der Encoder klemmt (§ 1.5) */
    const r15 = K.ergebnisLesen(packErgebnis({sitzung: 3, platz: 7, sterneHalbe: 15, versuche: 1, dauer: 5}));
    erwarte.gleich([r15.ok, r15.fehler, r15.sterneHalbe], [false, "bereich", 15]);
    erwarte.gleich(r15.grund, "Der Sterne-Wert im Code liegt außerhalb des Bereichs (0..10 halbe Sterne): 15.");
    /* fassung — reservierte Indizes, ohne Tabellen gelten die eingefrorenen Längen 58/27 (§ 2.3) */
    const f1 = K.auftragLesen("NL-FRJD-KR");
    erwarte.gleich([f1.ok, f1.fehler, f1.index, f1.tabellenlänge], [false, "fassung", 61, 58]);
    erwarte.gleich(f1.grund, "Auftragsindex 61 liegt hinter dem Ende der Auftragstabelle (58 Einträge).");
    const f2 = K.auftragLesen("NL-F4AD-HJ");
    erwarte.gleich([f2.ok, f2.fehler, f2.index, f2.tabellenlänge], [false, "fassung", 40, 27]);
    erwarte.gleich(f2.grund, "Fertigkeitsindex 40 liegt hinter dem Ende der Fertigkeitstabelle (27 Einträge).");
    /* auftrag — die gemessenen Fälle aus § 1.5: Tabelleneintrag entfernt (ID gibt es nicht mehr),
       Eintrag fehlt ganz, und eine Fertigkeit ohne Injektor (§ 3.3). */
    const weg = K.tabellen({ticketIds: [{id: "gibt-es-nicht", vorhanden: false}], skillIds: []});
    const a0 = K.auftragLesen("NL-FAAD-T4", weg);
    erwarte.gleich([a0.ok, a0.fehler], [false, "auftrag"]);
    erwarte.gleich(a0.grund, "Den Auftrag Nr. 0 (gibt-es-nicht) gibt es in dieser Fassung nicht.");
    const geloescht = K.tabellen({ticketIds: [null], skillIds: []});
    const a1 = K.auftragLesen("NL-FAAD-T4", geloescht);
    erwarte.gleich([a1.fehler, a1.grund], ["auftrag", "Den Auftrag Nr. 0 gibt es in dieser Fassung nicht."]);
    erwarte.gleich(K.auftragLesen("NL-FAAD-T4", K.tabellen({ticketIds: [], skillIds: []})).fehler, "fassung", "leere Tabelle = andere Fassung, nicht `auftrag`");
    const s26 = K.auftragLesen("NL-FYSD-SN");
    erwarte.gleich([s26.ok, s26.artBit, s26.index], [true, 1, 26], "art 1, Fertigkeitsindex 26 (lab.storage)");
    const s26t = K.auftragLesen("NL-FYSD-SN", K.tabellen({ticketIds: [], skillIds: Array.from({length: 27}, (_, i) => i === 26 ? {id: "lab.storage", tauglich: false} : {id: "f" + i})}));
    erwarte.gleich([s26t.ok, s26t.fehler, s26t.skill], [false, "auftrag", "lab.storage"]);
    erwarte.gleich(s26t.grund, "Für die Fertigkeit lab.storage liefert kein Seed im Fenster (64) einen spielbaren Auftrag.");
  });

  pruefe('Eingefrorene Tabellen (§ 2.3): Reihenfolge bindend, Auflösung Index ↔ ID, taugliche Fertigkeiten', () => {
    erwarte.wahr(K, "KlassenraumCodec ist geladen");
    const ticketIds = Spiel.ticketReihe().map(t => t.id);
    const mitInjektor = new Set(Object.values(Spiel.INJEKTOREN).flatMap(i => i.skills || []));
    const skillIds = DATEN.skills.map(s => ({id: s.id, tauglich: mitInjektor.has(s.id)}));
    const T = K.tabellen({ticketIds, skillIds});
    /* Die eingefrorenen Längen des Codec stimmen mit der Wirklichkeit dieser Fassung überein (§ 2.2/§ 3.3) */
    erwarte.gleich([T.auftraege.laenge, T.skills.laenge], [K.TABELLE_AUFTRAEGE_LAENGE, K.TABELLE_SKILLS_LAENGE], "58 Aufträge, 27 Fertigkeiten");
    erwarte.gleich([ticketIds.length, DATEN.skills.length], [58, 27]);
    erwarte.gleich(T.auftraege.ids[0], "salon-01", "Anfang der Tabelle (§ 2.3)");
    /* A § 3.3 nennt „24 von 27" — das ist ÜBERHOLT: seit task-5 (Injektoren für lab.portsec, lab.stp,
       lab.storage) hat jede der 27 Fertigkeiten einen Injektor. Hier gemessen; die eingefrorenen
       `tauglich`-Merker der Tabelle gehören deshalb alle auf true. */
    erwarte.gleich(T.tauglicheFertigkeiten().length, 27, "heute ist jede der 27 Fertigkeiten adressierbar");
    erwarte.gleich(T.tauglicheFertigkeiten().length, skillIds.filter(s => s.tauglich).length, "gezählt wird über die Merker der übergebenen Liste");
    erwarte.gleich(T.tauglicheFertigkeiten().filter(f => f.tauglich !== undefined).length, 0, "die Liste trägt nur skill/index/ersterSeed");
    /* Auflösung: derselbe Code, einmal roh und einmal mit Tabellen */
    const code = K.auftragBauen({sitzung: 1, art: 0, index: 5, variante: 0});
    erwarte.gleich(K.auftragLesen(code).ticketId, undefined, "ohne Tabellen nur die Felder");
    erwarte.gleich(K.auftragLesen(code, T).ticketId, ticketIds[5]);
    const gcode = K.auftragBauen({sitzung: 1, art: 1, index: 3, variante: 0});
    erwarte.gleich(K.auftragLesen(gcode, T).skill, skillIds[3].id);
    erwarte.gleich(K.auftragLesen(gcode, T).tauglich, true);
    /* Reihenfolge ist bindend: umgedrehte Liste wird NICHT umsortiert, sondern 1:1 übernommen */
    const R = K.tabellen({ticketIds: ticketIds.slice().reverse(), skillIds: []});
    erwarte.gleich(R.auftraege.ids, ticketIds.slice().reverse(), "keine Sortierung");
    erwarte.gleich(R.auftraege.index(ticketIds[0]), ticketIds.length - 1);
    erwarte.gleich(R.auftraege.id(0), ticketIds[ticketIds.length - 1]);
    erwarte.gleich([R.auftraege.index("gibt-es-nicht"), R.auftraege.hat("gibt-es-nicht")], [-1, false]);
    erwarte.gleich(R.auftraege.eintraege[0].index, 0, "eintraege tragen ihren Index");
  });

  pruefe('Seed-Fenster (§ 3.1): kanonSeed ist der k-te Kandidat, das Fenster ist 64 Seeds groß', () => {
    erwarte.wahr(K, "KlassenraumCodec ist geladen");
    erwarte.gleich(K.KANON_FENSTER, 64);
    erwarte.gleich([K.kanonSeed(7, 0), K.kanonSeed(0, 0), K.kanonSeed(255, 0), K.kanonSeed(7, 63)], [8, 1, 256, 71]);
    erwarte.gleich(Array.from({length: K.KANON_FENSTER}, (_, k) => K.kanonSeed(7, k)).length, 64);
    erwarte.gleich(K.kanonSeed(7, 64), K.kanonSeed(7, 63), "k wird in das Fenster geklemmt");
    erwarte.gleich(K.kanonSeed(7, -5), K.kanonSeed(7, 0), "negative k ebenso");
    /* Der Startseed ist genau der Seed, den der gelesene Code nennt (§ 2.1: variante + 1) */
    erwarte.gleich(K.auftragLesen("NL-HC3L-CS").seed, K.kanonSeed(42, 0));
  });

  pruefe('Netzkennwert (§ 4.2): 6 Zeichen, reihenfolge- und laufzeitblind, aber adressempfindlich', () => {
    erwarte.wahr(K, "KlassenraumCodec ist geladen");
    const netz = netzBauen();
    const a = K.abdruck(netz);
    erwarte.gleich(a.length, 6, "6 Zeichen");
    erwarte.gleich([...a].filter(c => !K.ALPHABET.includes(c)), [], "nur Zeichen des Alphabets");
    erwarte.gleich(K.abdruck(tief(netz)), a, "dasselbe Netz zweimal");
    /* Schlüsselreihenfolge der Geräte und Felder umgedreht */
    const gedreht = {zustand: {}, v: 1, kabel: netz.kabel.slice().reverse(),
      geraete: Object.fromEntries(Object.keys(netz.geraete).reverse().map(id => [id, Object.fromEntries(Object.keys(netz.geraete[id]).reverse().map(k => [k, netz.geraete[id][k]]))]))};
    erwarte.gleich(K.abdruck(gedreht), a, "Schlüssel- und Kabelreihenfolge sind egal");
    /* netz.zustand (Laufzeit) bleibt draußen */
    const laufzeit = JSON.parse(JSON.stringify(netz));
    laufzeit.zustand = {_uhr: 987654, sw1: {macs: {"Fa0/1": "FF:FF:FF:FF:FF:FF"}}};
    erwarte.gleich(K.abdruck(laufzeit), a, "Laufzeitzustand zählt nicht");
    /* Eine geänderte IP ändert den Kennwert */
    const ipAnders = JSON.parse(JSON.stringify(netz));
    ipAnders.geraete.pc1.running.if.eth0.ip = "192.168.10.99";
    erwarte.falsch(K.abdruck(ipAnders) === a, "eine IP-Adresse ändert den Kennwert");
    /* netz.v gehört zur Abbildung (§ 4.2 netzAbbild: {v, geraete, kabel}) */
    const anderesV = JSON.parse(JSON.stringify(netz)); anderesV.v = 2;
    erwarte.falsch(K.abdruck(anderesV) === a, "die Schemaversion steckt in der Abbildung");
    /* FNV-1a-Gegenrechnung aus A:459 */
    erwarte.gleich(K.fnv1a("A"), 3289118412);
    erwarte.gleich(K.netzkennwert, K.abdruck, "netzkennwert ist derselbe Weg (§ 5)");
    erwarte.gleich(K.abdruck({}), K.abdruck({geraete: {}, kabel: []}), "leeres Netz ist deterministisch statt ein Wurf");
  });

  pruefe('Reinheit und Determinismus: Laden ohne Seiteneffekt, gleicher Eingang → gleicher Code', () => {
    const q = quelle();
    erwarte.wahr(q, "Quelldatei gelesen");
    /* Kommentare weg — geprüft wird der CODE, nicht die Dokumentation (die nennt die Verbote selbst). */
    const nurCode = q.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
    erwarte.falsch(/\bMath\.random\b/.test(nurCode), "kein Math.random");
    erwarte.falsch(/\bstore\s*\./.test(nurCode), "kein Store");
    erwarte.falsch(/\bdocument\b|\bwindow\./.test(nurCode), "kein DOM");
    erwarte.falsch(/\bDate\b/.test(nurCode), "keine Uhr, kein Datum");
    erwarte.falsch(/\bSpiel\s*\.|\bDATEN\s*\./.test(nurCode), "kein Zugriff auf Spiel oder Daten (reine Datei)");
    /* Der harte Beweis: in einem LEEREN Kontext (kein Spiel, kein DATEN, kein store) lädt die Datei
       und stellt genau die zugesagte Schnittstelle bereit — sie greift beim Laden auf nichts zu. */
    const fremd = frisch();
    erwarte.wahr(fremd, "in leerem Kontext geladen");
    erwarte.gleich(["auftragBauen", "auftragLesen", "ergebnisBauen", "ergebnisLesen", "abdruck", "kanonSeed", "tabellen"].filter(n => typeof fremd[n] !== "function"), [], "die zugesagte Schnittstelle ist vollständig");
    /* Der Spielstand des laufenden Prozesses bleibt beim Laden unberührt */
    const vorher = JSON.stringify(store.alles());
    frisch();
    erwarte.gleich(JSON.stringify(store.alles()), vorher, "kein Store-Schlüssel verändert");
    /* Determinismus: wiederholt im selben Lauf und in einem frisch geladenen zweiten Kontext */
    const felder = {sitzung: 11, art: 1, index: 9, variante: 137};
    const codes = [K.auftragBauen(felder), K.auftragBauen(felder), K.auftragBauen(felder)];
    erwarte.gleich([...new Set(codes)], [codes[0]], "Auftragscode dreimal gleich");
    const efelder = {sitzung: 11, platz: 3, sterne: 4.5, versuche: 2, dauerS: 1230};
    const ecodes = [K.ergebnisBauen(efelder), K.ergebnisBauen(efelder), K.ergebnisBauen(efelder)];
    erwarte.gleich([...new Set(ecodes)], [ecodes[0]], "Ergebnis-Code dreimal gleich");
    erwarte.gleich(fremd.auftragBauen(felder), codes[0], "zweiter Kontext, gleicher Auftragscode");
    erwarte.gleich(fremd.ergebnisBauen(efelder), ecodes[0], "zweiter Kontext, gleicher Ergebnis-Code");
    erwarte.gleich(fremd.abdruck(netzBauen()), K.abdruck(netzBauen()), "zweiter Kontext, gleicher Kennwert");
    /* Klemmverhalten der beiden ENCODER (§ 1.5: der Encoder klemmt still, der Decoder weist ab) */
    erwarte.gleich(K.ergebnisBauen({sitzung: 99, platz: -3, sterne: 9, versuche: 9, dauerS: 99999}), K.ergebnisBauen({sitzung: 31, platz: 0, sterne: 5, versuche: 3, dauerS: 5110}));
    erwarte.gleich([K.auftragBauen({sitzung: 32, art: 0, index: 0, variante: 0}), K.auftragBauen({sitzung: 0, art: 2, index: 0, variante: 0}), K.auftragBauen({sitzung: 0, art: 0, index: 64, variante: 0}), K.auftragBauen({sitzung: 0, art: 0, index: 0, variante: 256}), K.auftragBauen({})],
      [null, null, null, null, null], "Auftragscode: außerhalb der Bitbreite gibt es null statt eines falschen Codes");
  });
});
