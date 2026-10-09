"use strict";
/* HILFECODE `H-XXXX-XX` (Architektur § 12.4, Säule 5 des 3.0-Konzepts) — Codec und Spiel-API.

   Der Azubi liest einen Code ab, die Lehrkraft tippt ihn in ihr BESTEHENDES Feld „Ergebnis-Codes";
   er trägt Sitzung, Platz und zwei Zählerstände und sonst nichts — kein Name, keine Bewertung, keine
   Rangfolge. Form und Prüfsumme sind dieselben wie bei `NL-` und `E-`: 4 Nutzzeichen + 2 Prüfzeichen
   (Gewichte 1..4, mod 31 / mod 32), Nutzlast 20 Bit = sitzung 5 · platz 5 · schritt 5 · offen 5.

   Geprüft wird erschöpfend: JEDE der 2²⁰ Nutzlasten geht bauen → lesen → unverändert zurück
   (1.015.808 gültige; die 32.768 mit `sitzung = 0` werden abgewiesen, weil Sitzungen 1..31 sind) —
   dazu Tippfehler, fremde Codes, die Zähler aus `Spiel.zieleStatus` und der Beweis, dass der Code
   nichts Personenbezogenes tragen KANN (zwei verschiedene Aufträge mit gleichen Zählern ergeben
   denselben Code).

   Die Ampel/Ansicht lädt der Node-Lauf nicht; geprüft werden Codec und Spiel-API. */
gruppe("Klassenraum: Hilfecode", () => {
  const K = () => Spiel.klassenraum;
  const C = () => KlassenraumCodec;
  const BASIS = Date.UTC(2026, 9, 9, 9, 0, 0);
  /* Ein gültiger H-Code wird von Hand gebaut — für Bitlagen, die `hilfeBauen` nie erzeugt
     (namentlich `sitzung = 0`). Nutzt dieselben Bausteine wie der Codec (wert/zeichen/pruefsummen). */
  const roh = (sitzung, platz, schritt, offen) => {
    const n = ((sitzung << 15) | (platz << 10) | (schritt << 5) | offen) >>> 0;
    const werte = [(n >>> 15) & 31, (n >>> 10) & 31, (n >>> 5) & 31, n & 31];
    const p = C().pruefsummen(werte);
    return "H-" + werte.map(C().zeichen).join("") + "-" + p.z1 + p.z2;
  };

  function kapsel(fn){
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
      gen: Object.assign({}, Spiel.generierte), speicher: store.alles(), uhr: jetzt()};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      jetzt.setzen(BASIS);
      return fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      for (const k of Object.keys(Spiel.generierte)) if (!(k in alt.gen)) delete Spiel.generierte[k];
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, alt.speicher);
      jetzt.setzen(alt.uhr); jetzt.frei();
    }
  }

  /* ---------- 1 · Der erschöpfende Round-Trip ---------- */
  pruefe("Erschöpfend: alle 2²⁰ Nutzlasten gehen bauen → lesen → unverändert zurück", () => {
    const t0 = Date.now();
    let geprueft = 0;
    const abweichung = [];
    for (let sitzung = 1; sitzung <= 31; sitzung++)
      for (let platz = 0; platz < 32; platz++)
        for (let schritt = 0; schritt < 32; schritt++)
          for (let offen = 0; offen < 32; offen++){
            const code = C().hilfeBauen({sitzung, platz, schritt, offen});
            const r = code ? C().hilfeLesen(code) : null;
            geprueft++;
            if (!r || r.ok !== true || r.sitzung !== sitzung || r.platz !== platz || r.schritt !== schritt
                || r.offen !== offen || r.code !== code){
              if (abweichung.length < 5) abweichung.push([sitzung, platz, schritt, offen, code, r && (r.fehler || r.grund)]);
            }
          }
    const ms = Date.now() - t0;
    erwarte.gleich(abweichung, [], "keine Abweichung im Round-Trip");
    erwarte.gleich(geprueft, 1015808, "31 · 32 · 32 · 32 = 1.015.808 gültige Nutzlasten (2²⁰ minus die 32.768 mit sitzung 0)");
    console.log(`MESSUNG H-Round-Trip: ${geprueft} Nutzlasten bauen+lesen in ${ms} ms · Abweichungen ${abweichung.length}`);
  });

  /* ---------- 2 · Die Bitlage, die der Encoder nie erzeugt ---------- */
  pruefe("sitzung 0 wird von allen 32.768 Nutzlasten abgewiesen (fassung), der Encoder gibt dort null", () => {
    let falsch = 0, fassung = 0;
    for (let platz = 0; platz < 32; platz++)
      for (let schritt = 0; schritt < 32; schritt++)
        for (let offen = 0; offen < 32; offen++){
          const r = C().hilfeLesen(roh(0, platz, schritt, offen));
          if (r && r.ok === false && r.fehler === "fassung") fassung++;
          else falsch++;
        }
    erwarte.gleich([fassung, falsch], [32768, 0], "alle 32.768 sitzung-0-Nutzlasten ergeben fassung");
    erwarte.gleich(C().hilfeBauen({sitzung: 0, platz: 1, schritt: 0, offen: 1}), null, "der Encoder gibt für sitzung 0 null");
    const beispiel = C().hilfeLesen(roh(0, 1, 0, 1));
    erwarte.gleich([beispiel.ok, beispiel.fehler], [false, "fassung"]);
    erwarte.enthaelt(beispiel.grund, "keine gültige Sitzung (0)", "wörtlicher Grund");
    console.log(`MESSUNG sitzung 0: ${fassung} Codes abgewiesen · Beispiel ${beispiel.code} → ${beispiel.fehler}`);
  });

  /* ---------- 3 · Prüfzeichen und Vertauschungen ---------- */
  pruefe("Tippfehler und Vertauschungen werden erkannt (Prüfzeichen, Gewichte 1..4)", () => {
    const codes = [C().hilfeBauen({sitzung: 1, platz: 0, schritt: 0, offen: 0}),
      C().hilfeBauen({sitzung: 31, platz: 31, schritt: 31, offen: 31}),
      "H-HDCE-EY"];
    let geprueft = 0, erkannt = 0, durchgelassen = [];
    for (const code of codes){
      const zeichen = [...code];
      for (let i = 0; i < zeichen.length; i++){
        if (zeichen[i] === "-") continue;
        for (const ersatz of ["A", "Z", "7", "Q"]){
          if (ersatz === zeichen[i]) continue;
          const kopie = zeichen.slice(); kopie[i] = ersatz;
          const r = C().hilfeLesen(kopie.join(""));
          geprueft++;
          if (r && r.ok === false) erkannt++;
          else if (durchgelassen.length < 3) durchgelassen.push(kopie.join("") + " → " + JSON.stringify(r && r.gelesen));
        }
      }
      for (let i = 0; i < zeichen.length - 1; i++){
        if (zeichen[i] === "-" || zeichen[i + 1] === "-" || zeichen[i] === zeichen[i + 1]) continue;
        const kopie = zeichen.slice();
        const h = kopie[i]; kopie[i] = kopie[i + 1]; kopie[i + 1] = h;
        const r = C().hilfeLesen(kopie.join(""));
        geprueft++;
        if (r && r.ok === false) erkannt++;
        else if (durchgelassen.length < 3) durchgelassen.push(kopie.join("") + " (vertauscht)");
      }
    }
    erwarte.gleich(durchgelassen, [], "kein Tippfehler kommt durch");
    erwarte.gleich([erkannt, geprueft], [geprueft, geprueft], "alle erkannt");
    /* Der Grund nennt die Klasse und, wo es geht, die erwarteten Prüfzeichen. */
    const falsch = C().hilfeLesen(codes[0].slice(0, -1) + (codes[0].slice(-1) === "A" ? "B" : "A"));
    erwarte.gleich([falsch.ok, falsch.fehler], [false, "prüfziffer"]);
    erwarte.gleich([typeof falsch.erwartet, typeof falsch.gefunden], ["string", "string"], "erwartet/gefunden stehen dabei");
    console.log(`MESSUNG Tippfehler: ${erkannt}/${geprueft} erkannt · Beispiel ${codes[0]} → ${falsch.erwartet} statt ${falsch.gefunden}`);
  });

  /* ---------- 4 · Leer, fremde Codes, Zeichen ---------- */
  pruefe("Leer ist null, fremde Codes kommen mit sauberem Fehler und Hinweis zurück", () => {
    for (const leer of [null, undefined, "", "   "])
      erwarte.gleich(C().hilfeLesen(leer), null, "leer → null: " + JSON.stringify(leer));
    /* Ein einsamer Bindestrich ist KEIN leeres Feld, sondern ein Längenfehler — genau wie bei NL/E. */
    const strich = C().hilfeLesen("-");
    erwarte.gleich([strich.ok, strich.fehler, strich.länge], [false, "länge", 0], "ein Bindestrich allein ist ein Längenfehler");
    const auftrag = C().hilfeLesen("NL-HC3L-CS");
    erwarte.gleich([auftrag.ok, auftrag.fehler, auftrag.art], [false, "länge", "hilfe"]);
    erwarte.enthaelt(auftrag.grund, "Der Hilfecode hat 8 Zeichen – er braucht 6 (gedruckt z. B. H-XXXX-XX).", "wörtlicher Längentext");
    erwarte.enthaelt(auftrag.hinweis, "Auftragscode", "Hinweis auf den Auftragscode");
    const ergebnis = C().hilfeLesen("E-KFWS-HZM");
    erwarte.gleich([ergebnis.fehler, ergebnis.art], ["länge", "hilfe"]);
    erwarte.enthaelt(ergebnis.hinweis, "Ergebnis-Code", "Hinweis auf den Ergebnis-Code");
    const fremdzeichen = C().hilfeLesen("H-AAAO-AA");
    erwarte.gleich([fremdzeichen.fehler, fremdzeichen.zeichen], ["zeichen", "O"], "I, O, 0 und 1 kommen nicht vor");
    console.log(`MESSUNG fremde Codes: NL→${auftrag.fehler}/${auftrag.hinweis.slice(0, 24)}… · E→${ergebnis.fehler} · H-AAAO-AA→${fremdzeichen.fehler}`);
  });

  /* ---------- 5 · Der Code trägt nichts Personenbezogenes ---------- */
  pruefe("Kein Personenbezug: nur vier Zahlen passen hinein, alles andere wird ignoriert", () => {
    const nur = C().hilfeBauen({sitzung: 5, platz: 2, schritt: 1, offen: 1});
    const mit = C().hilfeBauen({sitzung: 5, platz: 2, schritt: 1, offen: 1,
      name: "Anna", schueler: "Anna", note: 1, rang: 3, bewertung: "sehr gut", punkte: 99});
    erwarte.gleich(mit, nur, "zusätzliche Felder ändern den Code nicht — sie haben keinen Platz darin");
    /* Die gedruckte Form `H-XXXX-XX` hat 9 Zeichen (1 + 1 + 4 + 1 + 2) — ein Zeichen weniger als
       `NL-XXXX-XX`, weil das Präfix nur ein Zeichen ist. Im Vertrag stand „10 Zeichen"; das war die
       Länge des Auftragscodes. Form, Prüfsummen-Gewichte 1..4 und der 2²⁰-Round-Trip sagen 4 Nutzzeichen. */
    erwarte.gleich(nur.length, 9, "9 Zeichen: " + nur);
    const zeichen = [...nur.replace(/-/g, "")].slice(1);
    erwarte.gleich(zeichen.filter(z => C().ALPHABET.indexOf(z) < 0), [], "nur Zeichen des Codes-Alphabets (kein I, O, 0, 1)");
    /* Vier Zahlen hinein, vier Zahlen heraus — mehr trägt der Code nicht. */
    const gelesen = C().hilfeLesen(nur);
    erwarte.gleich([gelesen.sitzung, gelesen.platz, gelesen.schritt, gelesen.offen].map(x => typeof x), ["number", "number", "number", "number"]);
    const verboten = /name|schueler|schüler|note|zensur|rang|bewertung|punkte/i;
    erwarte.gleich(Object.keys(gelesen).filter(k => verboten.test(k)), [], "kein Feld des gelesenen Codes ist personenbezogen: " + Object.keys(gelesen).join(", "));
    erwarte.gleich(Object.keys(gelesen).sort().join("|"), "C1|C2|code|nutzzeichen|offen|ok|platz|prüfzeichen|schritt|sitzung", "genau diese Felder kommen zurück");
    erwarte.gleich(C().hilfeLesen(nur).code, nur, "und der Code selbst ist die kanonische Druckform");
    console.log(`MESSUNG Zusage: ${nur} aus vier Zahlen · Felder ${Object.keys(gelesen).length} · kein Name/Note/Rang-Feld`);
  });

  /* ---------- 6 · Die Spiel-API: Zähler aus Spiel.zieleStatus ---------- */
  pruefe("hilfeCode liefert die Zähler aus Spiel.zieleStatus, nach der Lösung steht alles auf geschafft", () => kapsel(() => {
    const s = K().erzeugen({ticketId: "salon-06", seed: 7});
    const c = K().ausCode(s.code);
    const inst = Spiel.instanzErstellen({ticketId: c.ticketId, seed: c.seed, quelle: "klassenraum", ohneFlow: true});
    inst.klassenraum = {sitzung: c.sitzung, platz: 4, code: c.code};
    Spiel.oeffnen(inst.iid);
    const status = Spiel.zieleStatus(inst);
    erwarte.wahr(status.length >= 1, "der Auftrag hat Ziele: " + status.length);
    const code = K().hilfeCode(inst);
    erwarte.passt(code, /^H-[A-Z0-9]{4}-[A-Z0-9]{2}$/, "Form H-XXXX-XX: " + code);
    erwarte.gleich(code.length, 9, "9 Zeichen (das Präfix ist ein Zeichen, nicht zwei wie bei NL-)");
    const r = K().hilfeLesen(code);
    erwarte.gleich([r.ok, r.sitzung, r.platz], [true, c.sitzung, 4], "Sitzung und Platz dieses Geräts");
    erwarte.gleich([r.schritt, r.offen], [0, status.length], "frisch geöffnet: nichts geschafft, alles offen");
    erwarte.gleich(r.schritt + r.offen, status.length, "schritt + offen = gesamt");
    Spiel.loesung(inst.netz, Spiel.defVon(inst).loesung);
    if (typeof Spiel.arbeitszieleErfuellen === "function") Spiel.arbeitszieleErfuellen(inst);
    const nach = K().hilfeLesen(K().hilfeCode(inst));
    erwarte.gleich([nach.schritt, nach.offen], [status.length, 0], "nach der Lösung: alles geschafft");
    erwarte.wahr(K().hilfeCode(inst) !== code, "der Code ändert sich mit dem Fortschritt");
    console.log(`MESSUNG API: ${code} (schritt 0/offen ${status.length}) → ${K().hilfeCode(inst)} (schritt ${status.length}/offen 0) · Sitzung ${c.sitzung} · Platz 4`);
  }));

  /* ---------- 7 · Fehlerfälle der API ---------- */
  pruefe("hilfeCode weist fremde Aufträge, fehlende Sitzung und falsche Plätze ab", () => kapsel(() => {
    erwarte.gleich(K().hilfeCode(null).fehler, "auftrag");
    erwarte.gleich(K().hilfeCode(null).grund, "Kein Auftrag übergeben.");
    const fremd = Spiel.instanzErstellen({ticketId: "salon-06", seed: 7, quelle: "postfach"});
    erwarte.gleich([K().hilfeCode(fremd).fehler, K().hilfeCode(fremd).grund], ["auftrag", "Dieser Auftrag kam nicht über einen Klassenraum-Code."]);
    const s = K().erzeugen({ticketId: "salon-06", seed: 7});
    const c = K().ausCode(s.code);
    const inst = Spiel.instanzErstellen({ticketId: c.ticketId, seed: c.seed, quelle: "klassenraum", ohneFlow: true});
    inst.klassenraum = {sitzung: c.sitzung, platz: 1, code: c.code};
    Spiel.oeffnen(inst.iid);
    inst.klassenraum.platz = 32;
    erwarte.gleich(K().hilfeCode(inst).fehler, "auftrag", "Platz 32 gibt es nicht");
    inst.klassenraum.platz = 1;
    inst.klassenraum.sitzung = 0;
    erwarte.gleich(K().hilfeCode(inst).fehler, "sitzung", "Sitzung 0 gibt es nicht");
    erwarte.gleich(K().hilfeLesen(""), null, "leere Eingabe bleibt null");
    console.log(`MESSUNG API-Fehler: fremd→auftrag · Platz 32→auftrag · Sitzung 0→sitzung`);
  }));

  /* ---------- 8 · Determinismus: zweiter Kontext und ein gemessenes Literal ---------- */
  pruefe("Determinismus: derselbe Eingang ergibt in einem zweiten Kontext denselben Code", () => {
    /* Gemessen in einem eigenen Prozess (A-Lader der Probe, 09.10.2026):
       hilfeBauen({sitzung 7, platz 3, schritt 2, offen 4}) → dieses Literal. */
    const gemessen = "H-HDCE-EY";
    erwarte.gleich(C().hilfeBauen({sitzung: 7, platz: 3, schritt: 2, offen: 4}), gemessen, "Literal aus einem anderen Prozess");
    const fs = require("fs"), path = require("path"), vm = require("vm");
    const quelle = fs.readFileSync(path.join(__dirname, "..", "src", "spiel", "klassenraum-codec.js"), "utf8");
    const fremd = vm.createContext({});
    vm.runInContext(quelle + "\n;globalThis.K = KlassenraumCodec;", fremd, {filename: "codec-fremd.js"});
    erwarte.gleich(fremd.K.hilfeBauen({sitzung: 7, platz: 3, schritt: 2, offen: 4}), gemessen, "zweiter Kontext, gleicher Code");
    erwarte.gleich(fremd.K.hilfeBauen({sitzung: 1, platz: 0, schritt: 0, offen: 0}), C().hilfeBauen({sitzung: 1, platz: 0, schritt: 0, offen: 0}), "auch der Nullfall stimmt überein");
    console.log(`MESSUNG Determinismus: ${gemessen} in beiden Kontexten identisch`);
  });
});
