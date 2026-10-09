"use strict";
/* ---------- Hilfe für den Klassenraum: was ist da? (Messung 09.10.2026) ----------
   AUFTRAG: „Hat der Klassenraum eine Hilfe?“ — und die Regel dazu: eine Lücke zu erfinden, um Arbeit
   zu haben, ist verboten. Deshalb steht hier ZUERST das gemessene Ergebnis, und dieser Test hält es fest.

   MESSUNG (vier Häuser, in denen Hilfe wohnen könnte):
     1. WIKI — die Zusatzseite `DATEN.wiki.klassenraum` (src/daten/wiki.js:734-772) ist da und deckt
        BEIDE Ansichten und die Startseiten-Zeile ab: „Ansagen: die Lehrkraft“ (Ansicht Klasse),
        „Öffnen: der Azubi“ (Startseiten-Zeile UND Ansicht Auftrag, „Enter genügt“), „Der Ergebnis-Code“,
        „Die Ampel der Lehrkraft“ (woher die Ergebnis-Codes kommen: blockweise ins Feld „Ergebnis-Codes“),
        „Grenzen und was nicht passiert“. Die Ansicht führt sie als Zusatzseite ohne Stufenkopf.
        NACHTRAG 10.10.2026 (selbst nachgemessen): Es gibt inzwischen ZWEI Zusatzseiten —
        `DATEN.wikiZusatz = ["klassenraum", "uebergabe"]` (src/daten/wiki.js:820), also 27 Fertigkeiten
        + 2 Zusatzseiten = **29** Wiki-Seiten; `src/ui/karriere.js:299-305` liest diese Liste aus den
        DATEN (eine Quelle der Wahrheit) und hängt beide ohne Stufenkopf an.
     2. FLÄCHEN — beide Ansichten erklären sich selbst (src/ui/klassenraum.js): Startseiten-Zeile mit
        Label „Klassenraum-Code“; Azubi-Ansicht mit „Auftragscode eintippen – der Auftrag öffnet sich wie
        aus dem Postfach.“ und „Kein Auftrag offen – tippe den Code ein, den deine Lehrkraft ansagt.“;
        Lehrkraft-Ansicht mit „Der Code ist die Ansage: jedes Gerät baut denselben Fall.“ und dem Feld
        „Ergebnis-Codes“ samt Platzhalter „Einen Code je Zeile oder alles auf einmal einfügen.“
     3. FÜHRUNG — `Spiel.naechster` (src/spiel/naechster.js:127-138) arbeitet über `inst.netz` und
        `Spiel.zieleStatus(inst)`; es gibt KEINEN Ausschluss der Quelle „klassenraum“. Die Führung steht
        einem Klassenraum-Auftrag also genauso zur Verfügung wie jedem anderen (Testfall 7 misst das).
     4. HILFE-VORSCHLÄGE — hier gehört der Klassenraum NICHT hin: `DATEN.hilfen.VORSCHLAEGE` sind
        Terminal-Befehle (`bereich` ∈ Spiel.LEITER, jeder `befehl` wird in der echten CLI ausgeführt,
        tests/spiel-hilfe-vorschlaege.test.js). Der Klassenraum hat keinen Konsolenbefehl; ein Eintrag
        dort wäre ein Vertragsbruch. Die 44 Vorschläge bleiben deshalb unberührt (Testfall 5).

   ERGEBNIS: KEINE LÜCKE — es wurde nichts geändert. Dieser Test hält nur fest, dass die Deckung da ist,
   damit sie nicht still verschwindet. Er prüft bewusst NICHT das Rendern der Wiki-LISTE: das ist die
   Zusicherung des Wiki-Stroms (tests/wiki-klassenraum.test.js, derzeit rot) — hier steht nur der
   Quelltext-Beleg, dass die Zusatzseite in der Liste geführt wird.

   Keine Zusicherung im Gruppenrumpf, kein `wirftNicht`. Geändert wird nichts. */
(function(){
  const KANN_LADEN = (() => {
    try { return typeof DATEN === "object" && DATEN !== null && typeof Spiel === "object" && Spiel !== null; }
    catch (e) { return false; }
  })();
  const ZUSATZ = KANN_LADEN ? "" : " (kein DATEN im Testbereich)";

  /* Ohne Testbereich (z. B. von Hand gestartet) die Schichten selbst laden – Reihenfolge wie tests/run.js. */
  function hkAlleinLaden(){
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
    const ctx = vm.createContext({console, setTimeout, clearTimeout, Date, Math, JSON, Intl, require, __dirname, __filename});
    let ergebnisse;
    try { ergebnisse = vm.runInContext(code.join("\n;\n"), ctx, {filename: "hilfe-klassenraum.test.js"}); }
    catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
    const rot = ergebnisse.filter(e => !e.ok);
    for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
    console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
    const ueb = ergebnisse.filter(e => e.ok && e.zusicherungen === 0).length;
    if (ueb) console.log(`davon ${ueb} übersprungen (Test ohne eine einzige Zusicherung)`);
    process.exit(rot.length ? 1 : 0);
  }
  if (!KANN_LADEN && typeof require === "function") { hkAlleinLaden(); return; }
  const quelle = (() => {
    try { return require("fs").readFileSync(require("path").join(__dirname, "..", "src", "ui", "klassenraum.js"), "utf8"); }
    catch (e) { return ""; }
  })();
  const karriereQuelle = (() => {
    try { return require("fs").readFileSync(require("path").join(__dirname, "..", "src", "ui", "karriere.js"), "utf8"); }
    catch (e) { return ""; }
  })();
  const wikiText = seite => JSON.stringify(seite || {});

  gruppe("Hilfe: Klassenraum" + ZUSATZ, () => {
    pruefe("1 · Die Wiki-Zusatzseite steht da und trägt die Pflichtfelder (ohne Stufe, ohne AP)" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const w = DATEN.wiki && DATEN.wiki.klassenraum;
      erwarte.wahr(!!w, "DATEN.wiki.klassenraum existiert (src/daten/wiki.js:734)");
      if (!w) return;
      erwarte.gleich(w.titel, "Klassenraum", "der Titel");
      erwarte.wahr(String(w.kurz).length >= 40, "die Kurzfassung erklärt den Kern: " + String(w.kurz).slice(0, 60));
      erwarte.wahr(Array.isArray(w.abschnitte) && w.abschnitte.length >= 6, "mindestens sechs Abschnitte, sind " + (w.abschnitte || []).length);
      for (const a of w.abschnitte) { erwarte.wahr(!!a.titel, "jeder Abschnitt hat einen Titel"); erwarte.wahr(String(a.html).length > 80, "und Inhalt: " + a.titel); }
      for (const f of ["merksatz", "pruefungstipp", "quelle", "belege"]) erwarte.wahr(String(w[f] || "").length > 10, "Feld " + f + " ist gefüllt");
      /* Eine Zusatzseite hat keine Fertigkeit – also auch keinen Stufenkopf (karriere.js:295-296). */
      erwarte.gleich(w.stufe, undefined, "keine Stufe (sonst käme der Rückfall „Stufe 1 · AP1“)");
      erwarte.gleich(w.ap, undefined, "kein AP");
      erwarte.gleich(DATEN.skills.some(s => s.id === "klassenraum"), false, "und keine neue Fertigkeit in der gesperrten 27er-Tabelle");
      for (const s of (w.siehe || [])) erwarte.wahr(DATEN.skills.some(x => x.id === s), "siehe-Verweis zeigt auf eine echte Fertigkeit: " + s);
    });

    pruefe("2 · Die Seite nennt beide Ansichten und die Startseiten-Zeile wörtlich" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const t = wikiText(DATEN.wiki.klassenraum);
      for (const wort of ["Klasse", "Klassenraum", "Auftrag", "Mitarbeit", "Klassenraum-Code", "Auftragscode", "Auftrag öffnen", "Platz"])
        erwarte.enthaelt(t, wort, "die Seite nennt „" + wort + "“ – genau das, was auf dem Schirm steht");
      /* Der Startseiten-Weg samt Tastatur steht ausdrücklich da. */
      erwarte.passt(t, /Enter genügt/, "und sagt, dass Enter genügt (Startseiten-Zeile)");
      erwarte.enthaelt(t, "Zwei Wege", "beide Wege zum selben Auftrag stehen nebeneinander");
    });

    pruefe("3 · Die Seite erklärt Herkunft und Rückweg des Codes (Lehrkraft → Azubi → Ergebnis)" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const t = wikiText(DATEN.wiki.klassenraum);
      for (const wort of ["Lehrkraft", "Beamer", "Code anzeigen", "Code kopieren", "Ergebnis-Code", "Für die Lehrkraft", "Ergebnis-Codes", "Eintragen", "Ampel", "Median", "Klassenraum-Abdruck"])
        erwarte.enthaelt(t, wort, "die Seite nennt „" + wort + "“");
      erwarte.passt(t, /NL-XXXX-XX/, "das Muster des Auftragscodes steht da");
      erwarte.passt(t, /E-XXXX-XXX/, "das Muster des Ergebnis-Codes steht da");
      erwarte.passt(t, /kein Geld, kein Ruf/, "und die Folge: keine Bewertung");
      /* Woher die Ergebnis-Codes kommen (der zweite Sorgenpunkt des Auftrags): blockweise ins Feld. */
      erwarte.passt(t, /blockweise/, "die Seite sagt, wie die Codes zurückkommen");
    });

    pruefe("4 · Die Wiki-Ansicht führt die Zusatzseiten in der Liste (29 Einträge)" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const seiten = Object.keys(DATEN.wiki || {});
      erwarte.gleich(seiten.length, 29, "27 Fertigkeiten + 2 Zusatzseiten, sind " + seiten.length);
      const zusatz = seiten.filter(id => !DATEN.skills.some(s => s.id === id));
      erwarte.gleich(zusatz, ["klassenraum", "uebergabe"], "genau zwei Seiten ohne Fertigkeit (gemessen, nicht übernommen)");
      /* EINE Quelle der Wahrheit: die Liste steht in den DATEN (wiki.js:820); karriere.js liest sie
         von dort und hängt jede Zusatzseite ohne Stufenkopf an. Das RENDERN prüft der Wiki-Strom
         (tests/wiki-klassenraum.test.js) – hier wird es bewusst nicht doppelt zugesichert. */
      erwarte.gleich(DATEN.wikiZusatz, ["klassenraum", "uebergabe"], "DATEN.wikiZusatz nennt beide (src/daten/wiki.js:820)");
      erwarte.enthaelt(karriereQuelle, "DATEN.wikiZusatz", "karriere.js:299 liest die Liste aus den DATEN");
      erwarte.enthaelt(karriereQuelle, "zusatz: true", "und markiert sie als Zusatz (kein Stufenkopf)");
      for (const id of zusatz) {
        erwarte.gleich(DATEN.wiki[id].stufe, undefined, "keine Stufe auf der Zusatzseite: " + id);
        erwarte.wahr(String(DATEN.wiki[id].titel || "").length > 2, "und ein Titel: " + id + " = " + DATEN.wiki[id].titel);
      }
      erwarte.gleich(DATEN.wiki.uebergabe.titel, "Übergabe", "die zweite Zusatzseite heißt „Übergabe“ (wiki-2, 10.10.2026)");
      /* Auffindbar über die Suchwörter der Seite selbst. */
      const suche = (DATEN.wiki.klassenraum.suche || []).join(" ");
      for (const w of ["Klassenraum", "Auftragscode", "Ergebnis-Code", "Lehrkraft", "Azubi"])
        erwarte.enthaelt(suche, w, "Suchwort „" + w + "“ ist hinterlegt");
    });

    pruefe("5 · Die 44 Hilfe-Vorschläge bleiben unberührt – und tragen keinen Klassenraum-Eintrag" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      const V = DATEN.hilfen.VORSCHLAEGE;
      erwarte.gleich(V.length, 44, "weiterhin 44 Vorschläge (nichts ergänzt, nichts entfernt)");
      erwarte.gleich(V.filter(v => v.ebene === 2).length, 15, "weiterhin 15 auf Ebene 2");
      erwarte.gleich(DATEN.skills.filter(s => !V.some(v => (v.skills || []).includes(s.id))).length, 0, "jede der 27 Fertigkeiten bleibt versorgt");
      /* Der Klassenraum hat keinen Konsolenbefehl – ein Vorschlag dort wäre ein Vertragsbruch.
         Deshalb: gemessen KEIN Eintrag, und das bleibt so. */
      const treffer = V.filter(v => /klassenraum|klasse\b|auftrag öffnen|auftragscode/i.test(v.id + " " + v.befehl + " " + v.erklaerung));
      erwarte.gleich(treffer, [], "kein Vorschlag nennt den Klassenraum (VORSCHLAEGE sind Terminal-Befehle)");
      for (const v of V) erwarte.wahr(String(v.befehl || "").trim().length > 0, "und jeder Vorschlag bleibt ein echter Befehl: " + v.id);
    });

    pruefe("6 · Die Flächen erklären den Code selbst (die Hinweistexte stehen im Quelltext)" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      erwarte.wahr(quelle.length > 1000, "src/ui/klassenraum.js ist lesbar");
      /* Diese vier Sätze sind das, was der Azubi bzw. die Lehrkraft auf dem Schirm liest.
         DASS sie gerendert werden, prüft tests/ui-klassenraum-tastatur.test.js (baut beide Ansichten). */
      for (const satz of [
        "Auftragscode eintippen – der Auftrag öffnet sich wie aus dem Postfach.",
        "Kein Auftrag offen – tippe den Code ein, den deine Lehrkraft ansagt.",
        "Der Code ist die Ansage: jedes Gerät baut denselben Fall.",
        "Einen Code je Zeile oder alles auf einmal einfügen.",
      ]) erwarte.enthaelt(quelle, satz, "Hinweis im Quelltext: „" + satz.slice(0, 40) + "…“");
      erwarte.enthaelt(quelle, '"Klassenraum-Code"', "die Startseiten-Zeile ist beschriftet");
      erwarte.enthaelt(quelle, '"Ergebnis-Codes"', "das Feld der Lehrkraft ist beschriftet");
      erwarte.enthaelt(quelle, "Auftrag öffnen", "und der Knopf der Azubi-Ansicht heißt wie in der Wiki-Seite");
      /* Die Ansichten melden sich beim Rahmen an – sonst wären sie nicht erreichbar. */
      erwarte.enthaelt(quelle, 'UI.app.registrieren("klassenraum"', "die Ansicht „Klasse“ ist angemeldet");
      erwarte.enthaelt(quelle, 'UI.app.registrieren("mitarbeit"', "die Ansicht „Auftrag“ ist angemeldet");
      erwarte.enthaelt(quelle, "UI.app.einstellungAbschnitt", "und der Einstellungs-Abschnitt hängt im Rahmen");
    });

    pruefe("7 · Die Führung schließt den Klassenraum nicht aus (Spiel.naechster liefert einen Schritt)" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      erwarte.gleich(typeof Spiel.naechster, "function", "Spiel.naechster ist die öffentliche Fläche (src/spiel/naechster.js:127)");
      const alt = Spiel.zieleStatus;
      try {
        /* Der Eingang der Führung ist der Zielstatus der Instanz – hier gestellt, damit kein echter
           Auftrag gebaut werden muss. Alles andere ist das echte Modul. */
        Spiel.zieleStatus = () => [{ok: false, ziel: {typ: "konfig", geraet: "r1", text: "Adresse eintragen"}, text: "Adresse eintragen"}];
        const inst = {iid: "kr-1", quelle: "klassenraum", netz: {geraete: {r1: {id: "r1", name: "R1", typ: "router"}}}, klassenraum: {sitzung: 1, platz: 3, code: "NL-4F7K-2Q"}};
        const s = Spiel.naechster(inst);
        erwarte.wahr(!!s, "die Führung liefert für einen Klassenraum-Auftrag einen Schritt (kein Ausschluss)");
        if (s) {
          erwarte.enthaelt(String(s.text), "Adresse eintragen", "mit dem Text des offenen Ziels: " + s.text);
          erwarte.gleich(s.bereich, "labor", "und dem Anzeigeort des Ziels");
        }
        /* Gegenprobe: ohne offenes Ziel sagt sie ehrlich null. */
        Spiel.zieleStatus = () => [];
        erwarte.gleich(Spiel.naechster(inst), null, "nichts offen: nichts zeigen");
      } finally { Spiel.zieleStatus = alt; }
      /* Und die Quelle selbst kennt keinen Sonderfall: kein Ausschluss im Quelltext. */
      const nq = require("fs").readFileSync(require("path").join(__dirname, "..", "src", "spiel", "naechster.js"), "utf8");
      erwarte.falsch(/quelle\s*===\s*["']klassenraum/.test(nq), "naechster.js filtert die Quelle „klassenraum“ nicht heraus");
    });

    pruefe("Vollständigkeit: geprüfte Häuser und die Zahlen" + ZUSATZ, () => {
      if (!KANN_LADEN) return;
      /* Vier Häuser geprüft: Wiki, Flächen, Führung, Vorschläge. Keine Lücke → nichts ergänzt. */
      erwarte.gleich([DATEN.wiki.klassenraum ? 1 : 0, quelle.length > 0 ? 1 : 0, typeof Spiel.naechster === "function" ? 1 : 0, DATEN.hilfen.VORSCHLAEGE.length].join("/"),
        "1/1/1/44", "Wiki da · Flächen lesbar · Führung da · 44 Vorschläge unverändert");
      erwarte.gleich(Object.keys(DATEN.wiki).length, 29, "29 Wiki-Seiten (27 Fertigkeiten + Klassenraum, Übergabe)");
      erwarte.gleich(DATEN.wikiZusatz.length, 2, "zwei Zusatzseiten (klassenraum, uebergabe)");
      erwarte.gleich(DATEN.skills.length, 27, "27 Fertigkeiten – die Tabelle ist gesperrt");
    });
  });
})();
