"use strict";
/* BEWEGUNG AUS: Die Endzustände der Szene dürfen nicht an einer Animation hängen (Nachtrag zum Befund aus task-38).

   BEFUND (in task-38 gemeldet, im Nachtrag behoben): `basis.css:93` setzt für die Einstellung „Bewegung: aus"
   `animation:none !important`. Fünf Zustände trugen ihren Endwert aber NUR in der Animation
   (`forwards`/`both`) — mit abgeschalteter Bewegung blieben sie im Grundzustand stehen:
     .sz-balken i               width:0     → der Balken blieb leer
     .sz-adressen i             opacity:.12 → die Bereiche blieben gedimmt
     .sz-legende li             opacity:.25 → die Legende blieb blass
     .sz-audit.gestempelt .sz-stempel opacity:0 → der Stempel blieb unsichtbar
     .sz-hoerer                 ohne Lage  → der Hörer blieb aufrecht statt aufgelegt
   Jetzt steht der Endwert in der Zustandsregel; die @keyframes beschreiben nur den Weg dorthin (`from`).

   Geprüft wird je Zustand BEIDES (Wirkung vor Grün, nicht nur eine Hälfte):
     · der Endwert steht in der Regel selbst — also auch mit „aus" sichtbar,
     · die Animation ist weiterhin gesetzt und ihr `from` unterscheidet sich vom Endwert — also läuft
       die Bewegung mit „voll" unverändert,
     · bei einer Verzögerung hält `both` den Startwert, sonst spränge die Anzeige erst auf den
       Endwert und fiele beim Start der Animation zurück.
   Dazu die zwei äußeren Bedingungen: szene.css hat keinen eigenen prefers-reduced-motion-Block mehr
   (R8), und die zentralen Schalter in basis.css sind vorhanden (91: 1 ms, 93: animation/transition
   none) — ohne sie prüfte diese Datei eine Mechanik, die es nicht gibt.

   NICHT geprüft (ehrlich): das gerechnete Ergebnis im Browser. Ein Programm war nicht erreichbar
   (tools/ethos.py meldet R12 „übersprungen"); geprüft ist der Quelltext, den der Browser auswertet. */

gruppe("UI: Bewegung aus (Endzustände)", () => {
  const hatRequire = (() => { try { return typeof require === "function"; } catch (e) { return false; } })();
  const stil = f => {
    const fs = require("fs"), path = require("path");
    return fs.readFileSync(path.join(__dirname, "..", "src", "stil", f), "utf8");
  };
  const ohneKommentar = t => t.replace(/\/\*[\s\S]*?\*\//g, " ");
  /* Der Block zu einem Selektor (erste Fundstelle, bis zur schließenden Klammer). */
  const bisKlammer = (css, auf) => {
    let tiefe = 0;
    for (let i = auf; i < css.length; i++) {
      if (css[i] === "{") tiefe++;
      else if (css[i] === "}") { tiefe--; if (!tiefe) return css.slice(auf, i + 1); }
    }
    return "";
  };
  const block = (css, sel) => { const i = css.indexOf(sel + "{"); return i < 0 ? null : bisKlammer(css, css.indexOf("{", i)); };
  const dekl = (css, sel) => {
    const b = block(css, sel);
    if (!b) return null;
    const o = {};
    for (const teil of b.slice(1, -1).split(";")) {
      const k = teil.indexOf(":");
      if (k < 0) continue;
      const p = teil.slice(0, k).trim();
      if (p) o[p] = teil.slice(k + 1).trim();
    }
    return o;
  };
  const keyframes = (css, name) => { const i = css.indexOf("@keyframes " + name + "{"); return i < 0 ? null : bisKlammer(css, css.indexOf("{", i)); };
  const schritt = (kf, name) => { const m = kf && kf.match(new RegExp("(?:^|[\\s,{])" + name + "\\s*\\{([^}]*)\\}")); return m ? m[1].trim() : null; };
  const wert = (text, prop) => { const m = text && text.match(new RegExp("(?:^|;)\\s*" + prop + "\\s*:\\s*([^;]+)")); return m ? m[1].trim() : null; };
  /* Spezifität grob: Anzahl der Klassen/Pseudoklassen im Selektor (für „gewinnt im Kaskadenvergleich"). */
  const klassen = sel => (sel.match(/[.#][A-Za-z0-9_-]+|\[[^\]]+\]|:[a-z-]+/g) || []).length;

  /* Die fünf Zustände aus dem Befund: Regel, Keyframes und je Eigenschaft Endwert + Startwert.
     Beim Hörer sind ZWEI Eigenschaften zu belegen (Lage und Deckkraft). */
  const FAELLE = [
    {was: "Balken voll", sel: ".sz-balken i", kf: "sz-laden", werte: [{prop: "width", ende: "100%", start: "0"}]},
    {was: "Bereiche hell", sel: ".sz-adressen i", kf: "sz-leuchten", werte: [{prop: "opacity", ende: "1", start: ".12"}]},
    {was: "Legende hell", sel: ".sz-legende li", kf: "sz-leuchten-text", werte: [{prop: "opacity", ende: "1", start: ".25"}]},
    {was: "Stempel sichtbar", sel: ".sz-audit.gestempelt .sz-stempel", kf: "sz-stempeln", werte: [{prop: "opacity", ende: "1", start: "0"}]},
    {was: "Hörer aufgelegt", sel: ".sz-hoerer", kf: "sz-auflegen", werte: [
      {prop: "transform", ende: "rotate(-135deg) translateY(4px)", start: "none"},
      {prop: "opacity", ende: ".55", start: "1"},
    ]},
  ];

  pruefe("Szene: Der Endwert steht in der Regel — die Bewegung bleibt daneben erhalten", () => {
    if (!hatRequire) return;                                  /* im Browser (tests.html) ohne Dateizugriff */
    const css = ohneKommentar(stil("szene.css"));
    for (const f of FAELLE) {
      const d = dekl(css, f.sel);
      erwarte.wahr(!!d, `${f.was}: Regel ${f.sel} fehlt`);
      const kf = keyframes(css, f.kf);
      erwarte.wahr(!!kf, `${f.was}: @keyframes ${f.kf} fehlt`);
      for (const w of f.werte) {
        erwarte.gleich(d[w.prop], w.ende, `${f.was}: ${w.prop} steht nicht im Endzustand (Regel selbst)`);
        const von = wert(schritt(kf, "from"), w.prop);
        erwarte.wahr(!!von, `${f.was}: ${f.kf} hat kein from mit ${w.prop}`);
        erwarte.falsch(von === w.ende, `${f.was}: from und Endwert von ${w.prop} sind gleich — dann gäbe es keine Bewegung`);
      }
      const an = String(d["animation"] || "");
      erwarte.enthaelt(an, f.kf, `${f.was}: die Animation ${f.kf} ist nicht mehr gesetzt`);
      if (d["animation-delay"]) {
        erwarte.enthaelt(an, "both", `${f.was}: mit Verzögerung muss both den Startwert halten`);
      }
    }
  });

  pruefe("Szene: Der gestempelte Stempel gewinnt gegen den Grundzustand", () => {
    if (!hatRequire) return;
    const css = ohneKommentar(stil("szene.css"));
    const grund = dekl(css, ".sz-stempel");
    erwarte.wahr(!!grund, "die Grundregel .sz-stempel fehlt");
    erwarte.gleich(grund["opacity"], "0", "ohne .gestempelt bleibt der Stempel unsichtbar");
    erwarte.wahr(klassen(".sz-audit.gestempelt .sz-stempel") > klassen(".sz-stempel"),
      "die Zustandsregel ist nicht spezifischer als der Grundzustand");
    erwarte.gleich(dekl(css, ".sz-audit.gestempelt .sz-stempel")["opacity"], "1", "der Stempel bleibt unsichtbar");
  });

  pruefe("Szene: kein eigener prefers-reduced-motion-Block mehr (R8)", () => {
    if (!hatRequire) return;
    const css = ohneKommentar(stil("szene.css"));
    erwarte.falsch(/@media\s*\(prefers-reduced-motion/.test(css), "szene.css hat wieder einen eigenen Bewegungsblock");
    /* Auch keine Ersatzregel, die den Endwert nur unter einer Bedingung setzt. */
    erwarte.falsch(/@media[^{]*\{[^}]*\.sz-(balken|adressen|legende|stempel)/.test(css),
      "eine Ersatzregel für die Endzustände steckt in einem @media-Block");
  });

  pruefe("Die zentralen Schalter in basis.css sind da (91: 1 ms, 93: animation none)", () => {
    if (!hatRequire) return;
    const basis = ohneKommentar(stil("basis.css"));
    const ruhig = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/.exec(basis);
    erwarte.wahr(!!ruhig, "der zentrale prefers-reduced-motion-Block fehlt");
    const mBlock = bisKlammer(basis, basis.indexOf("{", ruhig.index));
    erwarte.enthaelt(mBlock, "animation-duration:1ms", "die zentrale Regel setzt die Dauer nicht auf 1 ms");
    const aus = dekl(basis, "html[data-bewegung=\"aus\"] *, html[data-bewegung=\"aus\"] *::before, html[data-bewegung=\"aus\"] *::after");
    erwarte.wahr(!!aus, "die Regel für html[data-bewegung=aus] fehlt");
    erwarte.enthaelt(String(aus["animation"]), "none", "die Einstellung aus schaltet die Animation nicht ab");
    erwarte.enthaelt(String(aus["transition"]), "none", "die Einstellung aus schaltet den Übergang nicht ab");
  });
});
