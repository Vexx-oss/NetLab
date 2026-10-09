"use strict";
/* ---------- Spiel: der nächste nötige Schritt (Führung im Labor und im Baucanvas) ----------
   NUTZERAUFTRAG: „Im Labor bzw. dem Baucanvas sollte einem bei Bedarf der nächste benötigte
   Schritt angezeigt werden, z. B. indem ein Computer oder der Menüpunkt pulsiert oder ein Pfeil
   darauf zeigt."

   KEINE NEUE WAHRHEIT — diese Datei liest nur, was schon da ist:
     · Spiel.zieleStatus(inst)        src/spiel/ticket.js:106        → [{ziel, ok, grund, text}]
     · Spiel.arbeitsziel(inst, ziel)  src/spiel/arbeitsziele.js:33  → Status eines Arbeitsziels
     · Spiel.plan.abweichungen(inst)  src/spiel/plan.js:193         → Geräte, an denen das Netz abweicht
     · Spiel.plan.geraeteAus(diff)    src/spiel/plan.js:192
     · Spiel.geraetName               src/spiel/abnahme.js:10
   Offen ist, was `zieleStatus` NICHT mit `ok: true` meldet (die Reihenfolge der Ziele im Auftrag ist
   die Reihenfolge der Arbeit).

   DER TEXT VERÄT NICHTS (Architektur § 13.3 Punkt 4). Deshalb zwei Quellen, je nach Zielart:
     · ARBEITSZIEL (befehl/antwort/notiz/audit/tabelle): der Status-Text aus
       `src/spiel/arbeitsziele.js:40-62` — „Im Terminal von … noch nicht ausgeführt“, „Noch keine
       Antwort eingetragen“. Er sagt, WAS der Azubi noch tun muss, und nennt keinen Wert.
     · NETZ-ZIEL: NICHT der Status-Text der Simulation. Der nennt die URSACHE (gemessen an
       `salon-01`: „An PC-Kasse eth0 steckt kein Kabel. PC-Kasse kann nichts senden („Medium
       getrennt“).“) — das ist die Lösung des Falls. Der Fingerzeig zeigt nur, WO es hakt:
       Gerätename + „das Ziel ist noch nicht erreicht“, mit dem Text des Ziels, den der Auftrag
       ohnehin zeigt.

   DETERMINISTISCH: kein Math.random, kein Date.now, kein jetzt(). Die Wartezeit kommt als Zahl
   herein (`Spiel.naechsterWartezeit(inst, jetztMs)`, Anker wie beim Senior-Angebot
   src/spiel/hilfe.js:224) — die Uhr liest nur die Oberfläche.

   NUR AUF BEDARF: `Spiel.naechsterBedarf` beantwortet, ob die Führung JETZT ungefragt erscheinen
   darf. `meister` bekommt sie nie ungefragt (§ 13.3 Punkt 3, „Nichts wird ungefragt verraten“),
   `geselle` erst nach einem Fehler, `azubi`/`azubi-plus` nach einer Weile ohne Fortschritt. Auf
   ausdrücklichen Knopfdruck bekommt sie jeder — gefragt ist nicht verraten.

   ÖFFENTLICHE FLÄCHE: Spiel.naechster(inst) · Spiel.naechsterBedarf(inst, {…}) ·
   Spiel.naechsterWartezeit(inst, jetztMs) · Spiel.naechsterWann(id?) · Spiel.naechsterStufe() ·
   Spiel.FUEHRUNG_NACH_MS · Spiel.FUEHRUNG_ZEIGEN_MS */

/* Nach dieser Zeit ohne Fortschritt darf die Führung ungefragt kommen. Kürzer als das
   Senior-Angebot (Spiel.SENIOR_NACH_MS = 4 min, src/spiel/hilfe.js:17), damit der Azubi nicht
   erst nach vier Minuten einen Fingerzeig bekommt. */
Spiel.FUEHRUNG_NACH_MS = 90 * 1000;
/* So lange bleibt sie stehen, wenn sie einmal da ist (Anzeigedauer, nicht Wartezeit). */
Spiel.FUEHRUNG_ZEIGEN_MS = 15 * 1000;

/* WANN ungefragt? Rückfall-Tabelle in der Bauart von src/spiel/hilfe.js:241-246: gefragt wird
   zuerst Baustein A (Spiel.stufe), diese Tabelle gilt nur, wenn er fehlt oder unbekannt ist.
   Verglichen wird über die Id aus `Spiel.stufe.id()` — das ist die eine Quelle der Wahrheit. */
Spiel.NAECHSTER_WANN = Object.freeze({
  "azubi":      "nachzeit",      /* sobald eine Weile kein Fortschritt kam */
  "azubi-plus": "nachzeit",
  "geselle":    "nachfehler",    /* erst wenn etwas schiefging */
  "meister":    "nein",          /* nie ungefragt */
});

/* Wo der Schritt stattfindet — Anzeigeorte der Oberfläche (Dock-Reiter, Auftragsmappe). Alles,
   was hier nicht steht (die Netz-Ziele: erreichbar, dhcp, konfig, gespeichert …), gehört ins
   Labor selbst: dort wird gebaut und konfiguriert. */
Spiel.NAECHSTER_BEREICH = Object.freeze({
  befehl: "terminal", antwort: "mappe", notiz: "mappe", tabelle: "plan", audit: "plan",
});

/* Der Bildungsstand, ohne je zu werfen (Vertrag § 3 Regel 1: unbekannt -> azubi). Fragt zuerst
   Baustein A; fehlt er, gilt die Einstellung des Menschen (`Spiel.einst.stufe`) — aber nur, wenn
   die Stufe bekannt ist. Alles Unbekannte ist azubi, nie ein geratener Wert. */
const naechsterBekannt = id => {
  if (!id) return false;
  try { if (Array.isArray(Spiel.STUFE) && Spiel.STUFE.length) return Spiel.STUFE.some(s => s && s.id === id); } catch (e) { /* dann die eigene Tabelle */ }
  return Object.prototype.hasOwnProperty.call(Spiel.NAECHSTER_WANN, id);
};
Spiel.naechsterStufe = function(){
  const rueckfall = Spiel.STUFE_RUECKFALL || "azubi";
  try {
    const s = Spiel.stufe;
    if (s && typeof s.id === "function") { const id = s.id(); if (naechsterBekannt(id)) return String(id); }
  } catch (e) { /* Baustein A fehlt – dann der Rückfall unten */ }
  try { const e = Spiel.einst; if (e && naechsterBekannt(e.stufe)) return String(e.stufe); } catch (e) { /* nichts */ }
  return rueckfall;
};
Spiel.naechsterWann = function(id){
  const rueckfall = Spiel.STUFE_RUECKFALL || "azubi";
  return Spiel.NAECHSTER_WANN[id || Spiel.naechsterStufe()] || Spiel.NAECHSTER_WANN[rueckfall] || "nachzeit";
};

/* Wie lange kommt der Azubi schon nicht weiter? Reine Rechnung — die Uhr liest der Aufrufer.
   Ohne Zahl (oder ohne Anker) gilt 0: dann ist die Führung NICHT fällig. */
Spiel.naechsterWartezeit = function(inst, jetztMs){
  const anker = inst && (inst.fortschritt || inst.geoeffnet);
  return (typeof jetztMs === "number" && typeof anker === "number") ? Math.max(0, jetztMs - anker) : 0;
};

/* ---------- Der Schritt selbst ---------- */
const naechsterStatus = inst => {
  try { return (typeof Spiel.zieleStatus === "function" ? Spiel.zieleStatus(inst) : []) || []; }
  catch (e) { return []; }
};
const naechsterAbweichende = inst => {
  try {
    if (!Spiel.plan || typeof Spiel.plan.abweichungen !== "function") return [];
    return Spiel.plan.abweichungen(inst) || [];
  } catch (e) { return []; }
};
/* Das Gerät, an dem das Ziel hängt — „befehl“/„konfig“/„gespeichert“ nennen es direkt,
   „antwort“ in `pruefen.geraet` (src/spiel/arbeitsziele.js:7). */
function naechsterZielGeraet(ziel){
  if (!ziel) return null;
  const g = ziel.geraet || (ziel.pruefen && ziel.pruefen.geraet) || null;
  return typeof g === "string" && g ? g : null;
}
function naechsterText(inst, status, geraet){
  const ziel = (status && status.ziel) || {};
  const arbeitsziel = typeof Spiel.istArbeitsziel === "function" && Spiel.istArbeitsziel(ziel);
  /* Arbeitsziel: der Status-Text sagt, was noch zu TUN ist (nie einen Wert).
     Netz-Ziel: der Status-Text der Simulation nennt die Ursache — die wird hier NICHT verraten,
     nur der Ort. Deshalb der Text des Ziels, den der Auftrag ohnehin zeigt. */
  let t = arbeitsziel ? String((status && status.text) || ziel.text || "").trim()
    : ziel.text ? `„${String(ziel.text).trim()}“ ist noch nicht erreicht.` : "";
  if (!t) t = "Hier ist noch etwas offen.";
  const name = geraet && typeof Spiel.geraetName === "function" ? String(Spiel.geraetName(inst.netz, geraet)) : "";
  if (name && !t.includes(name)) t = name + ": " + t;
  return t;
}

/* Der nächste nötige Schritt oder ehrlich `null`, wenn nichts offen ist.
   Rückgabe: {geraet, ziel, text, bereich} — `ziel` ist das offene Ziel selbst (oder null),
   `geraet` die Geräte-Id (oder null, wenn der Schritt an keinem Gerät hängt). */
Spiel.naechster = function(inst){
  if (!inst || !inst.netz || !inst.netz.geraete) return null;
  const offen = naechsterStatus(inst).filter(s => s && s.ok !== true);   /* ok:true ist erledigt; false und null sind offen */
  if (!offen.length) return null;                                       /* nichts offen: nichts zeigen */
  const erster = offen[0];
  const ziel = erster.ziel || null;
  const art = String((ziel && ziel.typ) || "");
  /* Ohne eigenes Gerät am Ziel (Netz-Ziele wie „erreichbar“) zeigt der Plan, wo es hakt:
     `geraeteAus` liefert genau die Geräte, an denen etwas fehlt (sortiert, also deterministisch). */
  const geraet = naechsterZielGeraet(ziel) || naechsterAbweichende(inst)[0] || null;
  return {geraet, ziel, text: naechsterText(inst, erster, geraet), bereich: Spiel.NAECHSTER_BEREICH[art] || "labor"};
};

/* Darf die Führung JETZT ungefragt erscheinen? `angefordert` schlägt alles andere: wer den Knopf
   drückt, hat gefragt. `jetztMs` und `fehler` sind Zustand des Aufrufers — hier wird nichts gelesen. */
Spiel.naechsterBedarf = function(inst, {jetztMs, angefordert = false, fehler = false} = {}){
  const schritt = Spiel.naechster(inst);
  if (!schritt) return {ja: false, grund: "Nichts offen – dieser Auftrag ist fertig.", schritt: null};
  if (angefordert) return {ja: true, grund: "Der Azubi hat danach gefragt.", schritt};
  const wann = Spiel.naechsterWann();
  if (wann === "nein") return {ja: false, grund: "Diese Stufe bekommt keine ungefragte Führung.", schritt};
  if (wann === "nachfehler" && !fehler) return {ja: false, grund: "Diese Stufe sieht die Führung erst nach einem Fehler.", schritt};
  const wartete = Spiel.naechsterWartezeit(inst, jetztMs);
  if (wartete < Spiel.FUEHRUNG_NACH_MS) {
    return {ja: false, grund: `Erst, wenn es hakt (noch ${Math.ceil((Spiel.FUEHRUNG_NACH_MS - wartete) / 1000)} s).`, schritt};
  }
  return {ja: true, grund: "Eine Weile kein Fortschritt.", schritt};
};
