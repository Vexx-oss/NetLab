"use strict";
/* GEGENPRÜFUNG „WIRKUNG VOR GRÜN" (V2, task-12) — hängen die vier Bausteine der Hilfestellung
   wirklich im echten Weg? AGENTS.md: „Ein Baustein zählt erst, wenn er im Programm vorkommt. Grüne Tests
   ohne Aufruf aus Ticket oder Oberfläche gelten als NICHT FERTIG." Ein Modul, das existiert und getestet
   ist, aber nirgends aufgerufen wird, ist danach nicht fertig — genau das prüft diese Datei.

   Verfahren: Jede Behauptung wird an der QUELLE gemessen, nicht vermutet. Der Test liest die Datei mit
   fs.readFileSync und sucht den Aufruf IM CODE — Block- und Zeilenkommentare werden vorher durch
   Leerzeichen ersetzt (dieselbe Idee wie tools/ethos.py). Ohne das findet man Sätze ÜBER den Aufruf
   statt den Aufruf: der erste Lauf dieser Prüfung meldete z. B. src/spiel/mini.js:119 (Kommentarzeile)
   statt :124 (Code). tests/run.js gibt dem Testbereich seit dem 07.10.2026 `require`, `__dirname` und
   `__filename` mit; fehlen sie (reine Browserseite), sagen die Testnamen ausdrücklich, dass übersprungen
   wurde. Allein lauffähig:  node tests/pruefung-wirkung.test.js

   ERGEBNIS DER MESSUNG (07.10.2026, zur Laufzeit neu gesucht — die Dateien von B und C werden noch
   bearbeitet, darum sind die Nummern hier Momentaufnahmen und keine Zusicherungen):
   · A Kern-Stufensystem — FERTIG: src/ui/stufensystem.js:74 hängt den Abschnitt „Bildungsstand" über
     UI.app.einstellungAbschnitt in die Einstellungen; geschrieben wird über Spiel.stufe.setzen (:32).
     Gelesen wird die Stufe aus dem echten Weg in src/ui/konsole.js:33/40, src/ui/hilfe.js:20/28/36,
     src/spiel/mini.js:124/135/145, src/spiel/training.js:104, src/spiel/erstestunde.js:148.
   · B Terminal-Hilfe — FERTIG: src/ui/konsole.js:80 ruft UI.hilfe.aktualisieren (Wächter :78), :229
     zieht den Streifen nach JEDER Zeile nach (Vertrag § 4.1), :340 holt den Vorschlag aus
     Spiel.hilfe.passend (eine Quelle). Die Kette ist geschlossen: aktualisieren (src/ui/hilfe.js:146)
     ruft zeichnen(K.hilfeEl) (:155), zeichnen baut den `hl-streifen`. Der Streifen hängt mit
     src/ui/konsole.js:115 (`class: "hl-huelle"`) und :123 (container.append … K.hilfeEl) im Aufbau;
     src/ui/terminal.js:64 öffnet dieselbe Konsole (Streifen fährt mit).
   · C Leiste/Mini — FERTIG, mit einem BEFUND: Spiel.mini.hilfe wird aus src/ui/karriere.js:336 und :345
     gerufen, Spiel.mini.anker aus :355. src/ui/leiste.js ruft Spiel.mini.hilfe NICHT selbst — es liefert
     nur den DOM-Bereich `lk-mini-hilfe` (:17, eingehängt :49, öffentlich :118). Der zweite Weg läuft über
     denselben Zeichner: src/ui/karriere.js:397 `miniZeichnen(UI.leiste.miniBereich, {hilfeZiel:
     UI.leiste.miniHilfe})`, aufgerufen aus :522 und :531. § 5 verlangt, dass BEIDE Wege den Knopf zeigen —
     das tun sie; die Funktion wird aber nur aus EINER Datei gerufen.
   · D Trainingsbereich — FERTIG: src/ui/training.js:94 ruft Spiel.training.starten, :105 Spiel.training.
     abnehmen, :90 UI.spiel.oeffnen, :133 meldet die Ansicht über UI.app.registrieren("training", …) an.
   · ERGEBNIS: „Wirkung vor Grün" ist für alle vier Bausteine eingehalten. Kein Baustein ohne Aufruf aus
     dem echten Weg; der einzige Befund ist die eine Aufrufstelle in C (siehe oben). */

const PW_HAT_FS = (() => { try { return typeof require === "function" && typeof __dirname === "string"; } catch (e) { return false; } })();
const PW_ZUSATZ = PW_HAT_FS ? "" : " (übersprungen: ohne require/__dirname nicht prüfbar – node tests/run.js)";

/* ---------------- Allein lauffähig ----------------
   Nur den Testrahmen nachladen und diese Datei ein zweites Mal ausführen; dort ist PW_IM_LADER gesetzt,
   also lädt sie sich nicht erneut. */
if (PW_HAT_FS && typeof gruppe === "undefined" && typeof PW_IM_LADER === "undefined") {
  const fs0 = require("fs"), path0 = require("path"), vm0 = require("vm");
  const code = fs0.readFileSync(path0.join(__dirname, "harness.js"), "utf8") + "\n;\n"
    + fs0.readFileSync(__filename, "utf8") + "\n;\ntestsAusfuehren();";
  let ergebnisse;
  try { ergebnisse = vm0.runInContext(code, vm0.createContext({console, require, __dirname, __filename, PW_IM_LADER: true}), {filename: "pruefung-wirkung.test.js"}); }
  catch (e) { console.error("LADEFEHLER:", (e && e.stack) || e); process.exit(2); }
  const rot = ergebnisse.filter(e => !e.ok);
  for (const e of ergebnisse) console.log((e.ok ? "✓ " : "✗ ") + e.name + (e.ok ? "" : "\n    " + String(e.fehler).replace(/\n/g, "\n    ")));
  console.log(`\n${ergebnisse.length - rot.length}/${ergebnisse.length} grün`);
  process.exit(rot.length ? 1 : 0);
}

gruppe("Gegenprüfung: Wirkung vor Grün", () => {
  const WURZEL = PW_HAT_FS ? require("path").resolve(__dirname, "..") : null;
  /* Kommentare weg, Zeilen bleiben: sonst findet die Suche den Satz über den Aufruf statt den Aufruf. */
  function ohneKommentare(text){
    let aus = "", i = 0;
    while (i < text.length) {
      if (text.startsWith("/*", i)) {
        const j = text.indexOf("*/", i + 2), e = j === -1 ? text.length : j + 2;
        aus += text.slice(i, e).replace(/[^\n]/g, " ");
        i = e;
      } else { aus += text[i]; i++; }
    }
    return aus;
  }
  const zeilen = rel => ohneKommentare(require("fs").readFileSync(require("path").join(WURZEL, rel), "utf8")).split(/\r?\n/);
  const istZeilenkommentar = z => /^\s*(\/\/|--)/.test(z);
  /* ALLE Fundstellen eines Musters im Code, als „Datei:Zeile" (höchstens max). */
  function funde(rel, muster, max = 8){
    const re = muster instanceof RegExp ? muster : new RegExp(muster);
    const treffer = [], z = zeilen(rel);
    for (let i = 0; i < z.length && treffer.length < max; i++) if (!istZeilenkommentar(z[i]) && re.test(z[i])) treffer.push(`${rel}:${i + 1}`);
    return treffer;
  }
  const fund = (rel, muster) => funde(rel, muster, 1)[0] || null;
  /* Wie fund, aber ein fehlender Aufruf ist ein Befund: „FEHLT: …" */
  function beleg(rel, muster, was){
    const f = fund(rel, muster);
    erwarte.wahr(!!f, `FEHLT: ${was} – kein Aufruf in ${rel} (Muster ${muster})`);
    return f;
  }
  const melde = (titel, belege) => console.log(`${titel} → ` + belege.filter(Boolean).join(" · "));

  pruefe("A · Kern-Stufensystem: der Abschnitt hängt in den Einstellungen und die Stufe wird aus dem echten Weg gelesen" + PW_ZUSATZ, () => {
    if (!PW_HAT_FS) return;
    const e = [
      beleg("src/ui/stufensystem.js", /UI\.app\.einstellungAbschnitt\("Bildungsstand"/, "der Einstellungs-Abschnitt"),
      beleg("src/ui/stufensystem.js", /Spiel\.stufe\.setzen\(/, "Schreiben über den offiziellen Setter (§ 3 Regel 3)"),
      beleg("src/ui/stufensystem.js", /Spiel\.stufe\.alle\(\)/, "die vier Stufen kommen aus Spiel.STUFE"),
      beleg("src/ui/konsole.js", /Spiel\.stufe\b/, "Leser Terminal (Bildungsstand der Tipps)"),
      beleg("src/ui/hilfe.js", /Spiel\.stufe\b/, "Leser Vorschlagsstreifen"),
      beleg("src/spiel/mini.js", /Spiel\.stufe\b/, "Leser Mini-Ticket"),
      beleg("src/spiel/training.js", /Spiel\.stufe\b/, "Leser Trainingsbereich"),
      beleg("src/spiel/erstestunde.js", /Spiel\.stufe\b/, "Leser Einstieg (Stufenwahl)"),
    ];
    melde("Baustein A", e);
  });

  pruefe("B · Terminal-Hilfe: UI.konsole ruft UI.hilfe.aktualisieren und Spiel.hilfe.passend" + PW_ZUSATZ, () => {
    if (!PW_HAT_FS) return;
    const nachzug = funde("src/ui/konsole.js", /hilfeStreifen\(K, S\.letzterFehler\)/);
    const e = [
      beleg("src/ui/hilfe.js", /function aktualisieren\(/, "der Zeichner UI.hilfe.aktualisieren"),
      beleg("src/ui/hilfe.js", /return \{zeichnen, aktualisieren\}/, "aktualisieren wird nach außen gegeben"),
      beleg("src/ui/hilfe.js", /zeichnen\(K\.hilfeEl/, "aktualisieren zeichnet in den Streifen der Konsole"),
      beleg("src/ui/konsole.js", /UI\.hilfe\.aktualisieren\(/, "der Aufruf aus der Konsole"),
      beleg("src/ui/konsole.js", /Spiel\.hilfe\.passend\(/, "die eine Quelle des Vorschlags"),
      beleg("src/ui/konsole.js", /function hilfeUndVorschlag\(/, "Vorschlag und Streifen hängen an einem Weg"),
    ];
    erwarte.wahr(nachzug.length >= 1, "der Streifen wird nach einer ausgeführten Zeile nachgezogen (§ 4.1)");
    console.log("Baustein B · Nachzug des Streifens (§ 4.1) → " + funde("src/ui/konsole.js", /hilfeStreifen\(/).join(" · "));
    melde("Baustein B · Terminal-Hilfe", e.concat(nachzug));
  });

  pruefe("B · Vorschlagsstreifen: ein hl--Element hängt im Aufbau der Konsole (und im Dock-Terminal)" + PW_ZUSATZ, () => {
    if (!PW_HAT_FS) return;
    const e = [
      beleg("src/ui/konsole.js", /class:\s*"hl-huelle"/, "das hl-Element im Aufbau"),
      beleg("src/ui/konsole.js", /container\.append\([^)]*K\.hilfeEl/, "das Einhängen in die Konsole"),
      beleg("src/ui/hilfe.js", /class:\s*"hl-streifen"/, "der gezeichnete Streifen"),
      beleg("src/ui/hilfe.js", /class:\s*"hl-vorschlag"/, "ein Vorschlag im Streifen"),
      beleg("src/ui/terminal.js", /UI\.konsole\.oeffnen\(/, "das Dock-Terminal öffnet dieselbe Konsole"),
    ];
    melde("Baustein B · Vorschlagsstreifen", e);
  });

  pruefe("C · Mini-Hilfe: karriere.js ruft Spiel.mini.hilfe und -anker; die Leiste liefert den Bereich" + PW_ZUSATZ, () => {
    if (!PW_HAT_FS) return;
    const e = [
      beleg("src/ui/karriere.js", /Spiel\.mini\.hilfe\(/, "Spiel.mini.hilfe"),
      beleg("src/ui/karriere.js", /Spiel\.mini\.anker\(/, "Spiel.mini.anker"),
      beleg("src/ui/leiste.js", /class:\s*"lk-mini-hilfe"/, "der DOM-Bereich der Leiste"),
      beleg("src/ui/karriere.js", /hilfeZiel:\s*UI\.leiste\.miniHilfe/, "die Leiste als Ziel des Zeichners"),
      beleg("src/ui/karriere.js", /leisteMini\(\)/, "der Weg der Leiste"),
    ];
    /* BEFUND: die Leiste selbst ruft Spiel.mini.hilfe nicht. § 5 verlangt, dass beide Wege den Knopf zeigen —
       das ist über denselben Zeichner mit hilfeZiel erfüllt (karriere.js:397). */
    const direkt = fund("src/ui/leiste.js", /Spiel\.mini\.hilfe\(/);
    const ueberKarriere = fund("src/ui/karriere.js", /hilfeZiel:\s*UI\.leiste\.miniHilfe/);
    erwarte.wahr(!!direkt || !!ueberKarriere, "der Leisten-Weg muss die Mini-Hilfe erreichen – weder direkt noch über den Zeichner");
    console.log("BEFUND C: src/ui/leiste.js ruft Spiel.mini.hilfe " + (direkt ? "selbst (" + direkt + ")" : "NICHT selbst") +
      " – der Leisten-Weg läuft über " + ueberKarriere);
    melde("Baustein C · Mini-Hilfe", e);
  });

  pruefe("D · Trainingsbereich: UI.training startet, nimmt ab und ist als Ansicht angemeldet" + PW_ZUSATZ, () => {
    if (!PW_HAT_FS) return;
    const e = [
      beleg("src/ui/training.js", /Spiel\.training\.starten\(/, "Spiel.training.starten"),
      beleg("src/ui/training.js", /Spiel\.training\.abnehmen\(/, "Spiel.training.abnehmen"),
      beleg("src/ui/training.js", /UI\.spiel\.oeffnen\(/, "der Durchgang öffnet im Labor"),
      beleg("src/ui/training.js", /UI\.app\.registrieren\("training"/, "die Ansicht wird angemeldet"),
      beleg("src/ui/training.js", /UI\.startHaken/, "Anmeldung über den bestehenden Start-Weg"),
      beleg("src/ui/training.js", /zaehler:\s*offene/, "der Andock-Knopf zeigt offene Durchgänge"),
    ];
    const reihe = fund("src/ui/app.js", /"labor",\s*"training"/);
    melde("Baustein D · Trainingsbereich", e.concat([reihe || "app.js: „training“ steht nicht in der REIHE (die Ansicht erschiene trotzdem am Ende der Leiste)"]));
  });

  pruefe("Ergebnis: alle vier Bausteine hängen im echten Weg — kein Aufruf fehlt" + PW_ZUSATZ, () => {
    if (!PW_HAT_FS) return;
    const TABELLE = [
      ["A", "Einstellungs-Abschnitt", "src/ui/stufensystem.js", /UI\.app\.einstellungAbschnitt\("Bildungsstand"/],
      ["B", "Terminal-Hilfe zeichnen", "src/ui/konsole.js", /UI\.hilfe\.aktualisieren\(/],
      ["B", "Vorschlagsstreifen im Aufbau", "src/ui/konsole.js", /class:\s*"hl-huelle"/],
      ["B", "eine Quelle für den Vorschlag", "src/ui/konsole.js", /Spiel\.hilfe\.passend\(/],
      ["C", "Mini-Denkhilfe", "src/ui/karriere.js", /Spiel\.mini\.hilfe\(/],
      ["C", "Mini-Anker", "src/ui/karriere.js", /Spiel\.mini\.anker\(/],
      ["C", "Bereich der Leiste", "src/ui/leiste.js", /lk-mini-hilfe/],
      ["D", "Training starten", "src/ui/training.js", /Spiel\.training\.starten\(/],
      ["D", "Trainings-Ansicht angemeldet", "src/ui/training.js", /UI\.app\.registrieren\("training"/],
    ];
    const fehlt = [], belege = [];
    for (const [b, was, rel, muster] of TABELLE) {
      const f = fund(rel, muster);
      if (f) belege.push(`${b}:${was} → ${f}`); else fehlt.push(`${b}:${was} → FEHLT in ${rel}`);
    }
    console.log("Wirkung vor Grün · Belege: " + belege.join(" | "));
    erwarte.gleich(fehlt, [], "Bausteine ohne Aufruf aus dem echten Weg (nicht fertig)");
  });
});
