"use strict";
/* ---------- Mini-Testrahmen, gleich in Node (tests/run.js) und Browser (tests/tests.html) ----------
   pruefe("Name", () => { erwarte.gleich(a, b); ... })   – wirft bei Fehler
   Gruppen: gruppe("Sim: ARP", () => { pruefe(...) })

   SELBSTÜBERSPRINGER SICHTBAR MACHEN (task-23, B)
   Viele Tests steigen früh aus, wenn ihre Umgebung fehlt (`if (!kannLaden) return;`, „im Browser
   ohne require …"). Sie meldeten bisher GRÜN – nicht unterscheidbar von einem Test, der wirklich
   geprüft hat. Genau diese Bauart meldete schon einmal sieben Gruppen grün, ohne etwas zu prüfen.

   Deshalb zählt hier jede Zusicherung (`erwarte.*`): ein Test mit 0 Zusicherungen hat nichts
   geprüft und wird als `uebersprungen` geführt. Die Zahl steht in der Schlusszeile:
     · wer selbst druckt, nimmt `uebersprungenText(ergebnisse)` (oder `uebersprungen(ergebnisse)`),
     · `tests/run.js` gehört einem anderen Auftrag und wird NICHT angetastet – dieser Rahmen hängt
       sich stattdessen an die gedruckte Summenzeile „N/M grün" und schreibt die Zahl darunter.
   Die Zählung stört nie: schlägt eine Zusicherung fehl, ist der Test ohnehin rot. */
const TESTS = {liste: [], gruppe: "", zusicherungen: 0, ergebnisse: [], _summeGemeldet: false};
function gruppe(name, fn){ const alt = TESTS.gruppe; TESTS.gruppe = name; try { fn(); } finally { TESTS.gruppe = alt; } }
function pruefe(name, fn){ TESTS.liste.push({name: (TESTS.gruppe ? TESTS.gruppe + " › " : "") + name, fn}); }

/* Jede Zusicherung zählt – daran erkennt der Rahmen, ob ein Test wirklich etwas geprüft hat. */
function zugesichert(){ TESTS.zusicherungen++; }
const erwarte = {
  wahr(x, text){ zugesichert(); if (!x) throw new Error(text || "erwartet: wahr"); },
  falsch(x, text){ zugesichert(); if (x) throw new Error(text || "erwartet: falsch"); },
  gleich(ist, soll, text){
    zugesichert();
    const a = JSON.stringify(ist), b = JSON.stringify(soll);
    if (a !== b) throw new Error((text ? text + ": " : "") + `ist ${a?.slice(0, 400)} – soll ${b?.slice(0, 400)}`);
  },
  enthaelt(text, teil, hinweis){ zugesichert(); if (!String(text).includes(teil)) throw new Error((hinweis ? hinweis + ": " : "") + `„${teil}“ fehlt in:\n${String(text).slice(0, 800)}`); },
  passt(text, re, hinweis){ zugesichert(); if (!re.test(String(text))) throw new Error((hinweis ? hinweis + ": " : "") + `${re} passt nicht auf:\n${String(text).slice(0, 800)}`); },
  wirft(fn, text){ zugesichert(); let ok = false; try { fn(); } catch { ok = true; } if (!ok) throw new Error(text || "erwartet: Ausnahme"); },
};
function testsAusfuehren(){
  const ergebnisse = [];
  for (const t of TESTS.liste) {
    TESTS.zusicherungen = 0;
    const t0 = Date.now();
    try { t.fn(); ergebnisse.push({name: t.name, ok: true, zusicherungen: TESTS.zusicherungen, uebersprungen: TESTS.zusicherungen === 0, ms: Date.now() - t0}); }
    catch (e) { ergebnisse.push({name: t.name, ok: false, zusicherungen: TESTS.zusicherungen, fehler: e && e.stack ? String(e.stack).split("\n").slice(0, 4).join("\n") : String(e), ms: Date.now() - t0}); }
  }
  TESTS.ergebnisse = ergebnisse;
  return ergebnisse;
}
/* Wie viele Tests haben nichts zugesichert (also sich selbst übersprungen)? */
function uebersprungen(ergebnisse){
  return (ergebnisse || []).filter(e => e && e.ok && e.uebersprungen).length;
}
/* Fertiger Text für eine selbst gedruckte Schlusszeile. */
function uebersprungenText(ergebnisse){
  const n = uebersprungen(ergebnisse);
  return `davon ${n} übersprungen` + (n ? " (Test ohne eine einzige Zusicherung – den Grund nennt sein Name)" : "");
}

/* ---------- Die Zahl in die Schlusszeile hängen ----------
   `tests/run.js` druckt „N/M grün …" und gehört einem anderen Auftrag; statt daran zu schreiben,
   erkennt dieser Rahmen die Zeile und schreibt die Zahl direkt darunter. Im Browser (tests.html)
   druckt die Seite ihre Summe selbst – dort passiert schlicht nichts. */
(function schlusszeileHaengen(){
  try {
    if (typeof console === "undefined" || typeof console.log !== "function") return;
    const alt = console.log.bind(console);
    const neu = function(...a){
      alt(...a);
      try {
        const erste = String(a[0] == null ? "" : a[0]);
        if (TESTS._summeGemeldet || !/^\s*\d+\/\d+ grün/.test(erste)) return;
        TESTS._summeGemeldet = true;
        alt(uebersprungenText(TESTS.ergebnisse));
      } catch (e) { /* die Anzeige darf den Lauf nie stören */ }
    };
    console.log = neu;
  } catch (e) { /* ohne console bleibt es beim reinen Zähler */ }
})();
