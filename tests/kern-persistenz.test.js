"use strict";
/* KRN-03: BROWSER-PERSISTENZ OHNE STILLEN VERLUST (task-84)
   Der Frühstart in src/kern/basis.js füllt den Speicher aus localStorage, BEVOR der Lernmotor liest.
   Geprüft wird in eigenen vm-Bereichen mit Fake-window/localStorage (Bauart
   tests/klassenraum-codec.test.js): kaputtes JSON, falsche Struktur (Array, "labor":42) und eine
   ZU NEUE Schemaversion werden NICHT still als Neustart behandelt — der Rohwert wird VOR dem ersten
   Schreiben unter "netzwerk-labor-beschaedigt" aufbewahrt, die Meldung nennt die Sicherung, der
   Speicher startet leer. Ein gültiger Stand wird unverändert übernommen (keine Sicherung).
   Zusätzlich: ein Schreibfehler ist über store.stand() und den Bus sichtbar (kein stilles Ja). */
const PS_WURZEL = require("path").join(__dirname, "..");
const PS_FS = require("fs"), PS_VM = require("vm");
function psBasis(lager, {schreibfehler = false} = {}) {
  const ereignisse = [];
  const speicher = {daten: lager};
  const window = {
    localStorage: {
      getItem(k){ return Object.prototype.hasOwnProperty.call(speicher.daten, k) ? speicher.daten[k] : null; },
      setItem(k, v){ if (schreibfehler) throw new Error("QuotaExceededError"); speicher.daten[k] = String(v); },
    },
  };
  const ctx = {
    console: {log(){}, warn(){}, error(){}}, window: window,
    setTimeout: () => 0, clearTimeout(){}, Date, Math, JSON, parseInt, parseFloat, isFinite, String, Number, Object, Array, Set, Promise,
  };
  PS_VM.createContext(ctx);
  const quelle = PS_FS.readFileSync(PS_WURZEL + "/src/kern/basis.js", "utf8");
  PS_VM.runInContext(quelle + "\n;globalThis.__STORE = store; globalThis.__SPEICHER = SPEICHER; globalThis.__BUS = Bus;", ctx, {filename: "kern/basis.js"});
  ctx.__BUS.an("speicher-fehler", e => ereignisse.push(["speicher-fehler", e]));
  ctx.__BUS.an("speicher-stand", e => ereignisse.push(["speicher-stand", e]));
  return {store: ctx.__STORE, SPEICHER: ctx.__SPEICHER, Bus: ctx.__BUS, lager: speicher.daten, ereignisse};
}
const PS_GUELTIG = JSON.stringify({labor: {v: 3, euro: 42}, einst: {klang: false}, lern: {units: {}}});
if (typeof require === "function") gruppe("Kern: Browser-Persistenz (KRN-03)", () => {
  pruefe("gültiger Stand wird geladen, keine Sicherung", () => {
    const p = psBasis({"netzwerk-labor": PS_GUELTIG});
    erwarte.gleich(p.store.get("labor").euro, 42, "Spielstand kommt an");
    erwarte.gleich(p.store.meldung, null, "keine Meldung");
    erwarte.gleich("netzwerk-labor-beschaedigt" in p.lager, false, "keine Sicherung bei gültigem Stand");
  });
  pruefe("kaputtes JSON: Rohwert gesichert, Meldung nennt „Sicherung“, Speicher leer", () => {
    const roh = "{kaputt";
    const p = psBasis({"netzwerk-labor": roh});
    erwarte.gleich(p.lager["netzwerk-labor-beschaedigt"], roh, "Rohwert liegt unter dem Sicherungsschlüssel");
    erwarte.enthaelt(String(p.store.meldung), "Sicherung", "Meldung nennt die Sicherung");
    erwarte.gleich(p.store.get("labor", null), null, "Speicher startet leer");
  });
  pruefe('falsche Struktur: Array und "labor":42 werden gesichert statt still übernommen', () => {
    const a = psBasis({"netzwerk-labor": "[]"});
    erwarte.gleich(a.lager["netzwerk-labor-beschaedigt"], "[]", "Array gesichert");
    erwarte.gleich(a.store.get("labor", null), null, "Array nicht übernommen");
    const b = psBasis({"netzwerk-labor": JSON.stringify({labor: 42})});
    erwarte.gleich(b.lager["netzwerk-labor-beschaedigt"], JSON.stringify({labor: 42}), "Zahl gesichert");
    erwarte.enthaelt(String(b.store.meldung), "Sicherung", "Meldung nennt die Sicherung");
  });
  pruefe("zu neue Schemaversion (labor.v=4) wird gesichert, nicht per Math.max übernommen", () => {
    const roh = JSON.stringify({labor: {v: 4, euro: 9}, einst: {}});
    const p = psBasis({"netzwerk-labor": roh});
    erwarte.gleich(p.lager["netzwerk-labor-beschaedigt"], roh, "zu neuer Stand gesichert");
    erwarte.gleich(p.store.get("labor", null), null, "nicht als Neustart übernommen");
    erwarte.enthaelt(String(p.store.meldung), "neueren Fassung", "Meldung nennt die zu neue Fassung");
  });
  pruefe("Sicherung bleibt nach dem ersten Schreiben erhalten", () => {
    const roh = "{kaputt";
    const p = psBasis({"netzwerk-labor": roh});
    p.store.set("labor", {v: 3, euro: 1});
    erwarte.gleich(p.lager["netzwerk-labor-beschaedigt"], roh, "Sicherung wird vom ersten Save nicht überschrieben");
  });
  pruefe("Schreibfehler ist über store.stand() und Bus sichtbar (kein stilles Ja)", () => {
    const p = psBasis({});
    p.store.schreiberSetzen(() => { throw new Error("QuotaExceededError"); });
    p.store.set("labor", {v: 3});
    p.store.markieren();
    const versprechen = p.store.sofort();
    versprechen.catch(() => {});
    erwarte.gleich(p.store.stand().art, "fehler", "stand() meldet den Fehler");
    erwarte.gleich(p.store.stand().fehler.name, "Error", "Fehlerart steht");
    erwarte.wahr(p.ereignisse.some(e => e[0] === "speicher-fehler"), "Bus meldet speicher-fehler");
    erwarte.gleich(p.SPEICHER.schmutzig, true, "nichts geht verloren: schmutzig bleibt stehen");
  });
});
