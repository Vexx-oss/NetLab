"use strict";
/* ---------- Stil-Gate der Auftragstexte (2.1 S3, Architektur § 17.2) ----------
   Der Stilfaden (docs/entwicklung/Stilfaden – Auftragstexte.md § 1/§ 2/§ 5) war bisher NICHT erzwungen:
   tools/texte-messen.js maß nur von Hand, kein Test und kein CI-Schritt rief es auf (D-Bericht C3.2).
   Diese Datei ist die Verdrahtung: sie führt tools/texte-messen.js --pruefen im ECHTEN Node-Prozess aus.
   Das Werkzeug prüft 100 Seeds je Form (Prüfung, Tagesrätsel, Postfach-Nachschub) und alle Handtickets:
   Symptom 180–420 Zeichen, 2–4 Sätze, 0 Ursachenwörter, Titel 15–46, Bausteine (Zeit · Beobachtung ·
   Folge · Versuch) bei generierten Texten, Determinismus.
   GEGENPROBE: derselbe Lauf mit --gegentest hängt einen absichtlich schlechten Text an – er MUSS rot werden.
   Läuft im Standardlauf von tests/run.js (require vorhanden) und damit in CI über sh tools/test.sh. */
gruppe("Inhalt: Stil-Gate Auftragstexte", () => {
  const fs = require("fs"), path = require("path"), cp = require("child_process");
  const prozess = require("process");
  const WURZEL = path.resolve(__dirname, "..");
  const WERKZEUG = path.join(WURZEL, "tools", "texte-messen.js");

  function gate(zusatz){
    const args = [WERKZEUG, "--pruefen"].concat(zusatz || []);
    try {
      const aus = cp.execFileSync(prozess.execPath, args, {cwd: WURZEL, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 300000, maxBuffer: 16 * 1024 * 1024});
      return {code: 0, aus: String(aus || "")};
    } catch (e) {
      return {code: e.status == null ? -1 : e.status, aus: String((e.stdout || "") + "\n" + (e.stderr || ""))};
    }
  }
  let einmal = null;
  const messung = () => (einmal ||= gate([]));

  pruefe("Gate grün: 100/100 Seeds je Form im Stilfaden, alle Handtickets im Stil, Exit 0", () => {
    const r = messung();
    erwarte.gleich(r.code, 0, "Exit-Code des Stil-Gates:\n" + r.aus.slice(-2500));
    for (const form of ["Pruefung", "Tagesraetsel", "Postfach"])
      erwarte.passt(r.aus, new RegExp("Form " + form + "\\s*: 100/100 Seeds im Stilfaden"), form + ": 100 Seeds im Stilfaden");
    const m = r.aus.match(/Handtickets\s*: (\d+)\/(\d+) im Stilfaden/);
    erwarte.wahr(!!m, "Zeile ‚Handtickets: …‘ fehlt im Bericht");
    erwarte.gleich(m[1], m[2], "alle Handtickets bestehen die harten Stilregeln");
    erwarte.wahr(Number(m[2]) >= 58, "Handtickets gemessen: " + m[2]);
    erwarte.passt(r.aus, /Determinismus: 9\/9 Proben identisch/, "derselbe Seed ergibt denselben Text");
    erwarte.passt(r.aus, /Ergebnis: GRUEN/, "Gesamtergebnis grün");
  });

  pruefe("Gegenprobe: ein künstlicher Stilverstoß macht das Gate rot (Exit ≠ 0, Verstoß benannt)", () => {
    const r = gate(["--gegentest"]);
    erwarte.wahr(r.code !== 0, "Gate blieb grün, obwohl ein Stilverstoß eingeschleust war — das Tor wäre blind");
    erwarte.enthaelt(r.aus, "GEGENTEST", "der eingeschleuste Verstoß wird benannt");
    erwarte.passt(r.aus, /Ergebnis: ROT/, "Gesamtergebnis rot");
    /* Und die eingebaute Selbst-Gegenprobe des Werkzeugs (künstlicher Text gegen den Checker) ist grün. */
    erwarte.passt(messung().aus, /Gegenprobe\s*: künstlicher Stilverstoß rot erkannt/, "Selbst-Gegenprobe des Gate-Werkzeugs");
  });

  pruefe("Generierte Texte direkt gemessen: Symptomlänge/Satzzahl/Titel/Ursachenwörter über 100 Seeds", () => {
    /* Unabhängige Gegenrechnung zu den Zahlen des Werkzeugs – dieselben Regeln, direkt an DATEN/Spiel.
       Kein Abhaken von Werkzeug-Ausgaben: hier laufen die Generatoren selbst. */
    const ST = Spiel.STIL;
    erwarte.wahr(!!ST, "Spiel.STIL existiert (eine Quelle der Textregeln)");
    const saetze = t => String(t || "").replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/).filter(s => s.length > 1);
    const fehler = [];
    let n = 0, ersatz = 0;
    for (const s of DATEN.skills || []) {
      for (let seed = 1; seed <= 4; seed++) {
        let def = null;
        try { def = Spiel.generiere(s.id, seed); } catch (e) { /* ohne Injektor (S6): Prüfung mischt Handtickets bei */ }
        if (!def) { ersatz++; continue; }
        n++;
        const sy = String(def.symptom || ""), ti = String(def.titel || "");
        if (sy.length < ST.SYMPTOM_MIN || sy.length > ST.SYMPTOM_MAX) fehler.push(def.id + ": Symptom " + sy.length + " Zeichen");
        const ss = saetze(sy);
        if (ss.length < ST.SAETZE_MIN || ss.length > ST.SAETZE_MAX) fehler.push(def.id + ": " + ss.length + " Sätze");
        if (ti.length < ST.TITEL_MIN || ti.length > ST.TITEL_MAX) fehler.push(def.id + ": Titel " + ti.length + " Zeichen");
        if (ST.URSACHE.test(sy)) fehler.push(def.id + ": Ursachenwort im Symptom: " + sy.match(ST.URSACHE)[0]);
        if (ST.URSACHE.test(ti)) fehler.push(def.id + ": Ursachenwort im Titel: " + ti.match(ST.URSACHE)[0]);
        for (const [name, re] of [["Zeitmarke", ST.ZEIT], ["Folge", ST.FOLGE], ["Versuch", ST.VERSUCH]])
          if (!re.test(sy)) fehler.push(def.id + ": Baustein " + name + " fehlt");
        if (!String(def.briefing || "").includes(sy)) fehler.push(def.id + ": Briefing enthält das Symptom nicht");
      }
    }
    erwarte.wahr(n >= 60, "direkt gemessene generierte Tickets: " + n + " (ohne Injektor: " + ersatz + ")");
    erwarte.gleich(fehler.slice(0, 8), [], "Verstöße in generierten Texten");
  });
});
