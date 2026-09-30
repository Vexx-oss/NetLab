"use strict";
/* ---------- Mini-Testrahmen, gleich in Node (tests/run.js) und Browser (tests/tests.html) ----------
   pruefe("Name", () => { erwarte.gleich(a, b); ... })   – wirft bei Fehler
   Gruppen: gruppe("Sim: ARP", () => { pruefe(...) }) */
const TESTS = {liste: [], gruppe: ""};
function gruppe(name, fn){ const alt = TESTS.gruppe; TESTS.gruppe = name; try { fn(); } finally { TESTS.gruppe = alt; } }
function pruefe(name, fn){ TESTS.liste.push({name: (TESTS.gruppe ? TESTS.gruppe + " › " : "") + name, fn}); }
const erwarte = {
  wahr(x, text){ if (!x) throw new Error(text || "erwartet: wahr"); },
  falsch(x, text){ if (x) throw new Error(text || "erwartet: falsch"); },
  gleich(ist, soll, text){
    const a = JSON.stringify(ist), b = JSON.stringify(soll);
    if (a !== b) throw new Error((text ? text + ": " : "") + `ist ${a?.slice(0, 400)} – soll ${b?.slice(0, 400)}`);
  },
  enthaelt(text, teil, hinweis){ if (!String(text).includes(teil)) throw new Error((hinweis ? hinweis + ": " : "") + `„${teil}“ fehlt in:\n${String(text).slice(0, 800)}`); },
  passt(text, re, hinweis){ if (!re.test(String(text))) throw new Error((hinweis ? hinweis + ": " : "") + `${re} passt nicht auf:\n${String(text).slice(0, 800)}`); },
  wirft(fn, text){ let ok = false; try { fn(); } catch { ok = true; } if (!ok) throw new Error(text || "erwartet: Ausnahme"); },
};
function testsAusfuehren(){
  const ergebnisse = [];
  for (const t of TESTS.liste) {
    const t0 = Date.now();
    try { t.fn(); ergebnisse.push({name: t.name, ok: true, ms: Date.now() - t0}); }
    catch (e) { ergebnisse.push({name: t.name, ok: false, fehler: e && e.stack ? String(e.stack).split("\n").slice(0, 4).join("\n") : String(e), ms: Date.now() - t0}); }
  }
  return ergebnisse;
}
