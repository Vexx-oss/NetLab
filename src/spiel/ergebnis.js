"use strict";
/* ---------- Spiel: Ergebnis eines Auftrags als kopierbarer Text (Fahrplan 1.3/2.0, Schritt 0) ----------
   ZUGESAGTE SCHNITTSTELLE (der Knopf „Ergebnis kopieren" ruft sie):
     Spiel.ergebnisText(inst, erg?) → string   vollständiger Klartext, mehrzeilig
     Spiel.ergebnisKurz(inst, erg?) → string   eine Zeile
   Beide sind REIN: kein DOM, kein Zufall, keine Uhr, keine Nebenwirkung an der Instanz. `erg` ist das
   Ergebnis aus `Spiel.abschliessen` (src/spiel/abnahme.js:169-183); es darf fehlen.
   Die einzige Zeitangabe stammt aus `abnahme.zeit` — dem Zeitpunkt der Abnahme, nicht dem des Kopierens.
   Fehlt es, wird NICHTS ERFUNDEN: ohne Abnahme gibt es keine Sterne, keinen Lohn und kein „Gelöst" —
   dann steht dort nur, wie viele Ziele wirklich erfüllt sind (`Spiel.zieleStatus`, gemessen
   nebenwirkungsfrei; `Spiel.abnahme` selbst zählt `inst.abnahmen` hoch und wird hier NICHT gerufen).
   Nicht brauchbarer Eingang (null, fremdes Objekt, unbekanntes Ticket) → "" (kein Wurf) — der Aufrufer
   erkennt das leere Ergebnis und kopiert nichts, statt Unsinn in die Zwischenablage zu legen.

   Aufbau (Zeilen nur, wenn es sie wirklich gibt):
     Netzwerk-Labor · Fassung 1.2.4
     Auftrag: „Kabel fehlt" · Schreibbüro Nord · Einstieg
     Thema: Netzwerkkabel
     Ergebnis: Gelöst · ★★★★½ (4,5 von 5) · +12,50 € · +3 Ruf
     Abzüge: −½ ★ Hilfe: Bereich markiert
     Fehler: keine
     Hilfen: 1 gezogen · höchste Stufe 4
     Dauer: 4:12 · Versuche: 1
     Fertig: 09.10.2026, 11:12

   Die Sternenschreibweise ist dieselbe wie im Teilen-Text des Tagesrätsels (`Spiel.raetsel.teilen`,
   src/spiel/tagesraetsel.js:87) — dafür gibt es hier `Spiel.ergebnis.sterneText`. */
Spiel.ergebnis = {};

/* Ergebnis und Instanz auseinanderhalten. `erg` ist vorrangig; ein Aufruf, der das ERGEBNIS an Stelle
   der Instanz bekommt (`Spiel.ergebnisText(erg)`), wird toleriert — erkennbar an `erg.inst` + `erg.abnahme`.
   Keine Instanz hat ein Feld `abnahme` (nur `abnahmen`, der Zähler) — geprüft, deshalb ist die Probe eindeutig. */
Spiel.ergebnis.lage = function(inst, erg){
  const e = erg || (inst && inst.abnahme && inst.inst ? inst : null);
  const i = (e && e.inst) || inst;
  return {i: i && typeof i === "object" ? i : null, e: e || null};
};

/* Sterne wie im Teilen-Text: ★ ★ ★ ★ ½ und ☆ für das, was fehlt. 4,5 → „★★★★½", 3 → „★★★☆☆". */
Spiel.ergebnis.sterneText = s => {
  const n = Math.max(0, Math.min(5, +s || 0));
  return "★".repeat(Math.floor(n)) + (n % 1 ? "½" : "") + "☆".repeat(Math.max(0, 5 - Math.ceil(n)));
};

/* Zahl mit deutschem Komma, ohne überflüssige Null: 4.5 → „4,5", 5 → „5" (bewusst nicht `eur`, das rundet auf 2 Stellen) */
Spiel.ergebnis.zahl = x => String(Math.round((+x || 0) * 100) / 100).replace(".", ",");

/* Dauer als m:ss — dieselbe Form wie im Tagesrätsel (src/spiel/tagesraetsel.js:88) */
Spiel.ergebnis.dauer = ms => {
  const s = Math.max(0, Math.round((+ms || 0) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/* Zeitpunkt aus Millisekunden, in LOKALER Zeit (dieselbe Quelle wie `heute`: jetzt()) */
Spiel.ergebnis.zeitpunkt = ms => {
  if (typeof ms !== "number" || !isFinite(ms)) return "";
  const d = new Date(ms);
  return `${datumDe(heute(d))}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

Spiel.ergebnis.kundeName = i => {
  const id = (i && i.kunde) || null;
  return id ? (Spiel.kundenDaten(id).name || id) : "";
};

/* Thema = die Fertigkeiten des Auftrags, in der Reihenfolge der Definition, ohne Doppelte */
Spiel.ergebnis.thema = def => {
  const namen = [];
  for (const id of (def && def.skills) || []) {
    const n = id && typeof Spiel.skill === "function" ? (Spiel.skill(id).name || id) : id;
    if (n && !namen.includes(n)) namen.push(n);
  }
  return namen.join(", ");
};

/* Niveau NUR lesen. `Spiel.niveauVon` wäre die kanonische Quelle, schreibt aber `inst.niveau` und
   `inst.niveauWahl` (lernen.js:34) — ein Textbauer darf die Instanz nicht anfassen. Fehlt das
   Niveau (Instanz nie geöffnet, kein `erg`), bleibt es weg, statt geraten zu werden. */
Spiel.ergebnis.niveau = (i, ab) => (ab && ab.niveau) || i.niveau || null;

/* Ziele: aus der Abnahme, wenn es eine gibt — sonst frisch geprüft (nebenwirkungsfrei).
   `Spiel.zieleStatus` liefert ohne Simulation ein EINZELNES Objekt statt einer Liste (ticket.js:100);
   deshalb die Array-Probe, sonst stürzte der Textbau in einem Rumpfprogramm ab. */
Spiel.ergebnis.ziele = (i, ab) => {
  if (ab && Array.isArray(ab.ergebnisse)) return ab.ergebnisse;
  const roh = typeof Spiel.zieleStatus === "function" ? Spiel.zieleStatus(i) : [];
  return Array.isArray(roh) ? roh : [];
};

/* Die eine Zeile „Ergebnis" — hier, damit Text und Kurzfassung nicht auseinanderlaufen können. */
Spiel.ergebnis.ergebnisTeil = function(i, e, ab, ziele){
  const bestanden = typeof e?.bestanden === "boolean" ? e.bestanden : ab ? ab.bestanden === true : null;
  const treffer = ziele.filter(z => z && z.ok === true).length;
  const teile = [];
  if (bestanden === true) teile.push("Gelöst");
  else if (bestanden === false) teile.push("Noch nicht bestanden");
  if (ziele.length) teile.push(`${treffer} von ${ziele.length} Zielen erfüllt`);
  /* Sterne nur, wenn sie gemessen sind: `erg.sterne` oder eine bestandene Abnahme. Ein Fehlversuch
     bekommt keine Sterne-Zeile — „0 von 5" wäre eine Behauptung, die niemand gemessen hat. */
  let sterne = e && typeof e.sterne === "number" ? e.sterne : null;
  if (sterne == null && bestanden === true && ab) sterne = ab.sterne || 0;
  if (sterne != null && bestanden !== false) teile.push(`${Spiel.ergebnis.sterneText(sterne)} (${Spiel.ergebnis.zahl(sterne)} von 5)`);
  if (bestanden === true && e && typeof e.euro === "number") teile.push(`+${eur(e.euro)} €`);
  if (bestanden === true && e && typeof e.ruf === "number") teile.push(`+${e.ruf} Ruf`);
  return {text: teile.join(" · "), bestanden, sterne, treffer};
};

Spiel.ergebnisText = function(inst, erg){
  const {i, e} = Spiel.ergebnis.lage(inst, erg);
  if (!i) return "";
  const def = typeof Spiel.defVon === "function" ? Spiel.defVon(i) : null;
  if (!def) return "";
  const ab = (e && e.abnahme) || null;
  const ziele = Spiel.ergebnis.ziele(i, ab);
  const r = Spiel.ergebnis.ergebnisTeil(i, e, ab, ziele);
  const niveau = Spiel.ergebnis.niveau(i, ab);
  const kunde = Spiel.ergebnis.kundeName(i);
  const thema = Spiel.ergebnis.thema(def);

  const zeilen = [`Netzwerk-Labor · Fassung ${typeof LABOR_VERSION !== "undefined" ? LABOR_VERSION : "dev"}`];
  zeilen.push(`Auftrag: „${def.titel || def.id}“` + (kunde ? ` · ${kunde}` : "") + (niveau ? ` · ${Spiel.NIVEAU_NAME[niveau] || niveau}` : ""));
  if (thema) zeilen.push(`Thema: ${thema}`);
  if (r.text) zeilen.push(`Ergebnis: ${r.text}`);

  /* Was Sterne gekostet hat (nur was die Abnahme wirklich gemeldet hat) */
  const abzuege = ab && Array.isArray(ab.abzuege) ? ab.abzuege : [];
  if (abzuege.length) zeilen.push("Abzüge: " + abzuege.map(a => `−${a.sterne === 0.5 ? "½" : a.sterne} ★ ${a.text}`).join(" · "));

  /* Fehler: nicht erfüllte Ziele mit Kurzgrund, Kollateralschaden, Neustart-Verlust.
     Nur die Kurzform (`Spiel.grundTitel`) — die Erklärung steht auf dem Ergebnisbildschirm. */
  const fehler = ziele.filter(z => !z || z.ok !== true).map(z => {
    const name = (z && z.ziel && (z.ziel.text || z.ziel.typ)) || "Ziel";
    return name + (z && z.grund ? ` (${Spiel.grundTitel(z.grund)})` : "");
  });
  for (const k of (ab && ab.kollateral) || []) fehler.push(`Kollateralschaden: ${k.vonName} erreicht ${k.nachName} nicht mehr`);
  if (ab && ab.neustart && ab.neustart.verlust) fehler.push("Nach dem Neustart weg: " + (ab.neustart.geraete || []).map(g => g.name).join(", "));
  if (fehler.length) zeilen.push("Fehler: " + fehler.join(" · "));
  else if (ziele.length) zeilen.push("Fehler: keine");

  /* Hilfen: gezogene Sprossen und die höchste Stufe. Beides steht an der Instanz, nicht im Ergebnis. */
  const hilfen = Array.isArray(i.hilfen) ? i.hilfen : [];
  const hStufe = Math.max(0, +i.hilfeStufe || 0, ...hilfen.map(h => +h?.stufe || 0));
  zeilen.push(hilfen.length ? `Hilfen: ${hilfen.length} gezogen · höchste Stufe ${hStufe}` : "Hilfen: keine");

  /* Dauer und Versuche: nur, was gemessen ist (`zeitMs` ist 0, solange nichts gemessen wurde) */
  const teile = [];
  if (typeof i.zeitMs === "number" && i.zeitMs > 0) teile.push(`Dauer: ${Spiel.ergebnis.dauer(i.zeitMs)}`);
  const versuche = Math.max(0, +i.abnahmen || 0);
  if (versuche) teile.push(`Versuche: ${versuche}`);
  if (teile.length) zeilen.push(teile.join(" · "));

  /* „Fertig" nur mit echter Abnahme — ihr `zeit` ist der Zeitpunkt der Abnahme, nicht der des Kopierens. */
  if (ab && typeof ab.zeit === "number") zeilen.push(`Fertig: ${Spiel.ergebnis.zeitpunkt(ab.zeit)}`);

  return zeilen.join("\n");
};

Spiel.ergebnisKurz = function(inst, erg){
  const {i, e} = Spiel.ergebnis.lage(inst, erg);
  if (!i) return "";
  const def = typeof Spiel.defVon === "function" ? Spiel.defVon(i) : null;
  if (!def) return "";
  const ab = (e && e.abnahme) || null;
  const ziele = Spiel.ergebnis.ziele(i, ab);
  const r = Spiel.ergebnis.ergebnisTeil(i, e, ab, ziele);
  const kunde = Spiel.ergebnis.kundeName(i);
  const hilfen = Array.isArray(i.hilfen) ? i.hilfen : [];
  const hStufe = Math.max(0, +i.hilfeStufe || 0, ...hilfen.map(h => +h?.stufe || 0));

  const teile = ["Netzwerk-Labor", `„${def.titel || def.id}“`];
  if (kunde) teile.push(kunde);
  if (r.bestanden === true) teile.push(`Gelöst ${Spiel.ergebnis.sterneText(r.sterne)}`);
  else if (r.bestanden === false) teile.push(`Noch nicht bestanden (${r.treffer}/${ziele.length} Ziele)`);
  else teile.push(ziele.length ? `${r.treffer}/${ziele.length} Ziele erfüllt` : "kein Ziel geprüft");
  if (typeof i.zeitMs === "number" && i.zeitMs > 0) teile.push(Spiel.ergebnis.dauer(i.zeitMs));
  teile.push(`Hilfe ${hStufe}`);
  return teile.join(" · ");
};
