"use strict";
/* ---------- Klassenraum: der Codec (Stufe A1) ----------
   Vertrag: docs/entwicklung/Klassenraum/A – Codec und Determinismus.md § 1 (Format, Prüfsumme,
   Fehlerklassen), § 2 (Bit-Budget, eingefrorene Tabellen), § 3.1 (Seed-Kanonisierung),
   § 4.2 (Netzkennwert), § 6 (Ergebnis-Code). Architektur § 12.
   Diese Datei ist REIN: kein DOM, kein `Spiel`, kein Store, kein `Date`, keine Uhr, kein
   `Math.random`, keine Ausnahme nach außen und KEINE Seiteneffekte beim Laden. Sie liest die
   eingefrorenen Tabellen NICHT selbst — die ID-Listen übergibt der Aufrufer an `tabellen()`
   (sie liegen als Literale in `src/spiel/klassenraum.js`, § 2.3 Regel 1). Nur die LÄNGEN der
   Tabellen sind hier eingefroren, weil sie das Format bestimmen (Indizes 58..63 / 27..63 sind
   „andere Fassung", § 2.3).

   Auftragscode  NL-XXXX-XX   20 Bit Nutzlast + 10 Bit Prüfsumme = 30 Bit = 6 Zeichen, gedruckt 10
     n = (sitzung << 15) | (art << 14) | (index << 8) | variante
     sitzung 5 Bit (0..31) · art 1 Bit (0 hand / 1 generiert) · index 6 Bit (0..63) · variante 8 Bit
   Ergebnis-Code E-XXXX-XXX   25 Bit Nutzlast + 10 Bit Prüfsumme = 35 Bit = 7 Zeichen, gedruckt 10
     n = (sitzung << 20) | (platz << 15) | (sterne << 11) | (versuche << 9) | dauer
     sitzung 5 · platz 5 · sterne 4 (HALBE Sterne 0..10) · versuche 2 (0..3) · dauer 9 (10-s-Einheiten)
   Prüfsumme über die Nutzzeichen (Werte 0..31):
     C1 = (1·v0 + 2·v1 + 3·v2 + …) mod 31     31 ist prim  → fängt Einzel-Ersetzungen
     C2 = (1·v0 + 3·v1 + 5·v2 + …) mod 32     ungerade Gewichte → fängt Nachbarvertauschungen

   ALPHABET: 32 Zeichen, kein I, kein O, keine 0, keine 1 (Verwechslungsgefahr). 5 Bit je Zeichen.
   Normalisierung: Großschreibung → alles außer [0-9A-Z] weg → führendes NL (bzw. E) NUR abschneiden,
   wenn danach genau 6 (bzw. 7) Zeichen übrig bleiben (§ 1.1). Das ist die Präfix-Falle: der gültige
   Code NL-NLHW-K3 beginnt selbst mit NL und bleibt trotzdem lesbar.
   Rückgabe bei Fehlern ist IMMER {ok:false, fehler:"klasse", grund:"Satz für die Oberfläche"} —
   nie eine Ausnahme; bei leerer Eingabe null („nichts getippt = keine Fehlermeldung", § 1.5).

   Sterne-Einheit: § 6.1 trägt im Code HALBE Sterne (4 Bit, 0..10). Diese Datei nimmt und gibt an
   der Schnittstelle die ANZEIGE-Sterne (0..5 in 0,5-Schritten, also 4.5 = vier-einhalb), weil genau
   so der Spielstand und der gemessene Beispiel-Round-Trip aussehen (§ 5.1: „sterne = 5 →
   E-KFWS-HZM → gelesen {sitzung 9, platz 5, sterne 5, versuche 1, dauerS 70}"). Der Rohwert steht
   als `sterneHalbe` daneben. */
const KlassenraumCodec = (() => {

  /* ---------- Alphabet und Zeichenrechnung (§ 1.1) ---------- */
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const BASIS = 32;
  const wert = c => ALPHABET.indexOf(c);
  /* A:36: `zeichen(v) = ALPHABET[v % 32]` — MIT Modulo. (Die Probe `A-api.js` ließ den Modulo weg;
     A gewinnt.) Nicht-Zahlen geben null statt eines stillen `undefined`. */
  const zeichen = v => Number.isInteger(v) ? ALPHABET[((v % BASIS) + BASIS) % BASIS] : null;

  /* ---------- Eingefrorene Formatgrenzen (§ 2.3, § 3.3) ----------
     58 handgeschriebene Aufträge (gemessen § 2.2), 27 Fertigkeiten, davon 24 mit Injektor.
     Die LÄNGE gehört zum Format: ein Code mit Auftragsindex 58..63 bzw. Fertigkeitsindex 27..63
     stammt aus einer anderen Fassung. Wächst eine Tabelle, übergibt der Aufrufer seine Liste an
     `tabellen()` — dann gilt SEINE Länge (Anhängeregel § 2.3). */
  const TABELLE_AUFTRAEGE_LAENGE = 58;
  const TABELLE_SKILLS_LAENGE = 27;
  const KANON_FENSTER = 64;              /* § 3.1: höchstens 64 Seeds je Variante durchsuchen */

  /* ---------- Prüfsumme (§ 1.2) ---------- */
  function pruefsummen(werte){
    let c1 = 0, c2 = 0;
    for (let i = 0; i < werte.length; i++) { c1 += (i + 1) * werte[i]; c2 += (2 * i + 1) * werte[i]; }
    c1 %= 31; c2 %= 32;
    return {C1: c1, C2: c2, z1: ALPHABET[c1], z2: ALPHABET[c2]};
  }

  /* ---------- Meldungstexte (§ 1.5, Wortlaut der Oberfläche) ---------- */
  const TEXT = {
    laenge: n => `Der Code hat ${n} Zeichen – er braucht 6 (gedruckt z. B. NL-4F7K-2Q).`,
    laengeErgebnis: n => `Der Ergebnis-Code hat ${n} Zeichen – er braucht 7 (gedruckt z. B. E-KFWS-HZM).`,
    zeichen: "Im Code kommt kein I, kein O, keine 0 und keine 1 vor – hast du 0 statt O oder 1 statt I getippt?",
    pruefziffer: "Die Prüfziffer passt nicht – hast du dich vertippt?",
    bereich: n => `Der Sterne-Wert im Code liegt außerhalb des Bereichs (0..10 halbe Sterne): ${n}.`,
    fassungAuftrag: (i, l) => `Auftragsindex ${i} liegt hinter dem Ende der Auftragstabelle (${l} Einträge).`,
    fassungSkill: (i, l) => `Fertigkeitsindex ${i} liegt hinter dem Ende der Fertigkeitstabelle (${l} Einträge).`,
    keinAuftrag: (i, id) => `Den Auftrag Nr. ${i}${typeof id === "string" && id ? " (" + id + ")" : ""} gibt es in dieser Fassung nicht.`,
    keinSeed: id => `Für die Fertigkeit ${id} liefert kein Seed im Fenster (${KANON_FENSTER}) einen spielbaren Auftrag.`,
    hinweisErgebnis: "Das sieht nach einem Ergebnis-Code aus (E-…). Hier gehört der Auftragscode hin (NL-…).",
    hinweisAuftrag: "Das sieht nach einem Auftragscode aus (NL-…). Hier gehört der Ergebnis-Code hin (E-…).",
    /* Hilfecode (§ 12.4): dieselbe Form und dieselbe Prüfsumme, andere Bedeutung der Nutzzeichen. */
    laengeHilfe: n => `Der Hilfecode hat ${n} Zeichen – er braucht 6 (gedruckt z. B. H-XXXX-XX).`,
    hinweisAuftragHilfe: "Das sieht nach einem Auftragscode aus (NL-…). Hier gehört der Hilfecode hin (H-…).",
    hinweisErgebnisHilfe: "Das sieht nach einem Ergebnis-Code aus (E-…). Hier gehört der Hilfecode hin (H-…).",
    sitzungNull: "Dieser Hilfecode trägt keine gültige Sitzung (0) – er stammt aus einer anderen Fassung.",
  };

  /* ---------- Normalisierung (§ 1.1) ----------
     Gibt {rest, ohneTrenner, praefixWeg, roh} | null (leere Eingabe). Prüft NICHT die Länge:
     die Fehlermeldung nennt die Länge NACH dem Abschneiden des Präfix, aber VOR der Präfix-Regel —
     so sind die gemessenen Texte aus § 1.5 reproduzierbar („NL-ABC" → 5 Zeichen, „E-ABC" → 4). */
  function entkernen(roh, praefix, nutzlaenge){
    if (roh === null || roh === undefined) return null;
    const s0 = String(roh);
    if (s0.trim() === "") return null;
    const ohneTrenner = s0.toUpperCase().replace(/[^0-9A-Z]/g, "");
    let rest = ohneTrenner, praefixWeg = false;
    if (rest.startsWith(praefix) && rest.length - praefix.length === nutzlaenge) { rest = rest.slice(praefix.length); praefixWeg = true; }
    return {roh: s0, ohneTrenner, rest, praefixWeg};
  }
  /* Fremdzeichen (I, O, 0, 1) im Nutzteil — nach der Längenprüfung, sonst nennt die Meldung sie nicht. */
  const fremdzeichen = rest => [...new Set([...rest].filter(c => wert(c) < 0))];

  /* ---------- Auftragscode bauen (§ 2.1) ----------
     Felder außerhalb ihrer Bitbreite ergeben null (nie ein falscher Code, nie eine Ausnahme). */
  function auftragBauen(felder){
    const f = felder || {};
    const ganz = (v, max) => (Number.isInteger(v) && v >= 0 && v <= max) ? v : null;
    const sitzung = ganz(f.sitzung, 31), index = ganz(f.index, 63), variante = ganz(f.variante, 255);
    const art = f.art === "hand" ? 0 : f.art === "generiert" ? 1 : ganz(f.art, 1);
    if (sitzung === null || index === null || variante === null || art === null) return null;
    const n = ((sitzung << 15) | (art << 14) | (index << 8) | variante) >>> 0;
    const werte = [(n >>> 15) & 31, (n >>> 10) & 31, (n >>> 5) & 31, n & 31];
    const p = pruefsummen(werte);
    return "NL-" + werte.map(zeichen).join("") + "-" + p.z1 + p.z2;
  }

  /* ---------- Auftragscode lesen (§ 1.1, § 1.2, § 2.3) ----------
     `tabellen` ist optional und kommt aus `tabellen({ticketIds, skillIds})`. Ohne Tabellen gelten
     die eingefrorenen Längen (58/27) für die Klasse „fassung"; mit Tabellen werden zusätzlich die ID
     aufgelöst (Feld `ticketId` bzw. `skill`) und die Fehlerklassen „fassung"/„auftrag" vergeben.
     Reihenfolge der Prüfungen: Länge → Fremdzeichen → Prüfsumme → freier Index → ID/Brauchbarkeit. */
  function auftragLesen(roh, tabellenArg){
    const k = entkernen(roh, "NL", 6);
    if (k === null) return null;
    if (k.rest.length !== 6) {
      const r = {ok: false, fehler: "länge", grund: TEXT.laenge(k.rest.length), art: "auftrag", länge: k.rest.length, erwartet: 6};
      if (k.rest.length === 8 && k.rest[0] === "E") r.hinweis = TEXT.hinweisErgebnis;
      return r;
    }
    const fremd = fremdzeichen(k.rest);
    if (fremd.length) return {ok: false, fehler: "zeichen", grund: TEXT.zeichen, art: "auftrag", zeichen: fremd.join(""), fremdzeichen: fremd.join(""), länge: 6};

    const nz = k.rest.slice(0, 4), pz = k.rest.slice(4, 6);
    const werte = [...nz].map(wert);
    const p = pruefsummen(werte);
    if (p.z1 !== pz[0] || p.z2 !== pz[1]) {
      const falsch = [];
      if (p.z1 !== pz[0]) falsch.push("C1");
      if (p.z2 !== pz[1]) falsch.push("C2");
      return {ok: false, fehler: "prüfziffer", grund: TEXT.pruefziffer, art: "auftrag", erwartet: p.z1 + p.z2, gefunden: pz, falsch, C1: p.C1, C2: p.C2};
    }

    const n = ((werte[0] << 15) | (werte[1] << 10) | (werte[2] << 5) | werte[3]) >>> 0;
    const sitzung = (n >>> 15) & 31, artBit = (n >>> 14) & 1, index = (n >>> 8) & 63, variante = n & 255;
    const art = artBit === 0 ? "hand" : "generiert";
    const code = "NL-" + nz + "-" + pz;
    const t = tabellenArg || null;
    const laenge = t ? (art === "hand" ? t.auftraege.laenge : t.skills.laenge)
                     : (art === "hand" ? TABELLE_AUFTRAEGE_LAENGE : TABELLE_SKILLS_LAENGE);
    if (index >= laenge) {
      return {ok: false, fehler: "fassung", art: "auftrag", code, sitzung, artName: art, artBit, index, variante,
        freierIndex: index, tabellenlänge: laenge, tabelle: art === "hand" ? "TABELLE_AUFTRAEGE" : "TABELLE_SKILLS",
        grund: art === "hand" ? TEXT.fassungAuftrag(index, laenge) : TEXT.fassungSkill(index, laenge)};
    }

    const treffer = {ok: true, sitzung, art, artBit, index, variante, seed: variante + 1, code,
      nutzzeichen: nz, prüfzeichen: pz, C1: p.C1, C2: p.C2};
    if (!t) return treffer;

    const id = art === "hand" ? t.auftraege.id(index) : t.skills.id(index);
    const vorhanden = art === "hand" ? t.auftraege.vorhanden(index) : t.skills.vorhanden(index);
    if (typeof id !== "string" || !id || !vorhanden) {
      return {ok: false, fehler: "auftrag", grund: TEXT.keinAuftrag(index, id), art: "auftrag", code, sitzung, artName: art, artBit, index, variante,
        tabelle: art === "hand" ? "TABELLE_AUFTRAEGE" : "TABELLE_SKILLS", unbekannteId: id || null};
    }
    if (art === "hand") { treffer.ticketId = id; return treffer; }
    treffer.skill = id;
    treffer.tauglich = t.skills.tauglich(index);
    if (!treffer.tauglich) {
      return {ok: false, fehler: "auftrag", grund: TEXT.keinSeed(id), art: "auftrag", code, sitzung, artName: art, artBit, index, variante,
        skill: id, tauglich: false, tabelle: "TABELLE_SKILLS"};
    }
    return treffer;
  }

  /* ---------- Ergebnis-Code bauen (§ 6.1) ----------
     `sterne` sind ANZEIGE-Sterne (0..5, halbe Schritte) → im Code `round(sterne·2)` (0..10).
     Geklemmt statt geworfen: die Werte kommen aus dem Spiel (§ 1.5, Encoder klemmt still). */
  const klemme = (v, max) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0; };
  function ergebnisBauen(felder){
    const f = felder || {};
    const sitzung = klemme(f.sitzung, 31), platz = klemme(f.platz, 31);
    const sterneHalbe = klemme(Number(f.sterne) * 2, 10);
    const versuche = klemme(f.versuche, 3);
    const dauer = klemme(Number(f.dauerS) / 10, 511);          /* 10-s-Einheiten (§ 6.1) */
    const n = ((sitzung << 20) | (platz << 15) | (sterneHalbe << 11) | (versuche << 9) | dauer) >>> 0;
    const werte = [(n >>> 20) & 31, (n >>> 15) & 31, (n >>> 10) & 31, (n >>> 5) & 31, n & 31];
    const p = pruefsummen(werte);
    const zk = werte.map(zeichen).concat([p.z1, p.z2]);
    return "E-" + zk.slice(0, 4).join("") + "-" + zk.slice(4, 7).join("");
  }

  /* ---------- Ergebnis-Code lesen (§ 6.1, § 1.5 „bereich") ---------- */
  function ergebnisLesen(roh){
    const k = entkernen(roh, "E", 7);
    if (k === null) return null;
    if (k.rest.length !== 7) {
      const r = {ok: false, fehler: "länge", grund: TEXT.laengeErgebnis(k.rest.length), art: "ergebnis", länge: k.rest.length, erwartet: 7};
      if (k.rest.length === 8 && k.rest.startsWith("NL")) r.hinweis = TEXT.hinweisAuftrag;
      return r;
    }
    const fremd = fremdzeichen(k.rest);
    if (fremd.length) return {ok: false, fehler: "zeichen", grund: TEXT.zeichen, art: "ergebnis", zeichen: fremd.join(""), fremdzeichen: fremd.join(""), länge: 7};

    const nz = k.rest.slice(0, 5), pz = k.rest.slice(5, 7);
    const werte = [...nz].map(wert);
    const p = pruefsummen(werte);
    if (p.z1 !== pz[0] || p.z2 !== pz[1]) {
      const falsch = [];
      if (p.z1 !== pz[0]) falsch.push("C1");
      if (p.z2 !== pz[1]) falsch.push("C2");
      return {ok: false, fehler: "prüfziffer", grund: TEXT.pruefziffer, art: "ergebnis", erwartet: p.z1 + p.z2, gefunden: pz, falsch, C1: p.C1, C2: p.C2};
    }

    const n = ((werte[0] << 20) | (werte[1] << 15) | (werte[2] << 10) | (werte[3] << 5) | werte[4]) >>> 0;
    const sterneHalbe = (n >>> 11) & 15;
    const code = "E-" + nz.slice(0, 4) + "-" + nz.slice(4) + pz;
    if (sterneHalbe > 10) {
      return {ok: false, fehler: "bereich", grund: TEXT.bereich(sterneHalbe), art: "ergebnis", code,
        sitzung: (n >>> 20) & 31, platz: (n >>> 15) & 31, sterneHalbe, versuche: (n >>> 9) & 3, dauerS: (n & 511) * 10};
    }
    return {ok: true, sitzung: (n >>> 20) & 31, platz: (n >>> 15) & 31,
      sterne: sterneHalbe / 2, sterneHalbe, versuche: (n >>> 9) & 3, dauerS: (n & 511) * 10,
      code, nutzzeichen: nz, prüfzeichen: pz, C1: p.C1, C2: p.C2};
  }

  /* ---------- Hilfecode `H-XXXX-XX` (§ 12.4, „wo hängt der Azubi") ----------
     Form und Prüfsumme wie der Auftragscode: 4 Nutzzeichen + 2 Prüfzeichen, Gewichte 1..4, mod 31/32.
     Nutzlast 20 Bit: `sitzung` 5 · `platz` 5 · `schritt` 5 (erfüllte Ziele) · `offen` 5 (offene Ziele).
     KEIN Name, KEINE Bewertung, keine Punkte — der Code trägt vier Zahlen und sonst nichts.
     `sitzung` 0 ist ungültig (Sitzungen sind 1..31): der Encoder gibt dort `null`, der Leser `fassung`. */
  function hilfeBauen(felder){
    const f = felder || {};
    const ganz = (v, max, min) => (Number.isInteger(v) && v >= min && v <= max) ? v : null;
    const sitzung = ganz(f.sitzung, 31, 1), platz = ganz(f.platz, 31, 0);
    const schritt = ganz(f.schritt, 31, 0), offen = ganz(f.offen, 31, 0);
    if (sitzung === null || platz === null || schritt === null || offen === null) return null;
    const n = ((sitzung << 15) | (platz << 10) | (schritt << 5) | offen) >>> 0;
    const werte = [(n >>> 15) & 31, (n >>> 10) & 31, (n >>> 5) & 31, n & 31];
    const p = pruefsummen(werte);
    return "H-" + werte.map(zeichen).join("") + "-" + p.z1 + p.z2;
  }

  /* Hilfecode lesen (§ 1.5): nie eine Ausnahme, leer → null, jeder Fehler → {fehler, grund}.
     Reihenfolge wie bei den anderen Lesern: Länge → Fremdzeichen → Prüfsumme → Feldbereiche. */
  function hilfeLesen(roh){
    const k = entkernen(roh, "H", 6);
    if (k === null) return null;
    if (k.rest.length !== 6) {
      const r = {ok: false, fehler: "länge", grund: TEXT.laengeHilfe(k.rest.length), art: "hilfe", länge: k.rest.length, erwartet: 6};
      if (k.rest.length === 8 && k.rest.startsWith("NL")) r.hinweis = TEXT.hinweisAuftragHilfe;
      else if (k.rest.length === 8 && k.rest.startsWith("E")) r.hinweis = TEXT.hinweisErgebnisHilfe;
      return r;
    }
    const fremd = fremdzeichen(k.rest);
    if (fremd.length) return {ok: false, fehler: "zeichen", grund: TEXT.zeichen, art: "hilfe", zeichen: fremd.join(""), fremdzeichen: fremd.join(""), länge: 6};

    const nz = k.rest.slice(0, 4), pz = k.rest.slice(4, 6);
    const werte = [...nz].map(wert);
    const p = pruefsummen(werte);
    if (p.z1 !== pz[0] || p.z2 !== pz[1]) {
      const falsch = [];
      if (p.z1 !== pz[0]) falsch.push("C1");
      if (p.z2 !== pz[1]) falsch.push("C2");
      return {ok: false, fehler: "prüfziffer", grund: TEXT.pruefziffer, art: "hilfe", erwartet: p.z1 + p.z2, gefunden: pz, falsch, C1: p.C1, C2: p.C2};
    }

    const n = ((werte[0] << 15) | (werte[1] << 10) | (werte[2] << 5) | werte[3]) >>> 0;
    const sitzung = (n >>> 15) & 31, platz = (n >>> 10) & 31, schritt = (n >>> 5) & 31, offen = n & 31;
    const code = "H-" + nz + "-" + pz;
    if (sitzung === 0)
      return {ok: false, fehler: "fassung", grund: TEXT.sitzungNull, art: "hilfe", code, sitzung, platz, schritt, offen};
    return {ok: true, sitzung, platz, schritt, offen, code, nutzzeichen: nz, prüfzeichen: pz, C1: p.C1, C2: p.C2};
  }

  /* ---------- Netzkennwert (§ 4.2, „Klassenraum-Abdruck") ----------
     Kanonische JSON-Abbildung (Objektschlüssel rekursiv sortiert, UTF-16-Reihenfolge → locale-frei),
     FNV-1a über UTF-16-Codeeinheiten (bewusst ohne Buffer/TextEncoder: Browser, Einzeldatei und
     headless rechnen identisch), 30 Bit → 6 Zeichen. `netz.zustand` (Laufzeit) bleibt draußen.
     Kabel werden mit `<`/`>` verglichen, NICHT mit localeCompare (sonst hinge die Reihenfolge an ICU). */
  function kanonisch(x){
    if (Array.isArray(x)) return "[" + x.map(kanonisch).join(",") + "]";
    if (x && typeof x === "object")
      return "{" + Object.keys(x).sort().map(k => JSON.stringify(k) + ":" + kanonisch(x[k])).join(",") + "}";
    return JSON.stringify(x === undefined ? null : x);
  }
  function fnv1a(text){
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function netzAbbild(netz){
    const n = netz && typeof netz === "object" ? netz : {};
    const geraete = {};
    for (const id of Object.keys(n.geraete || {}).sort()) geraete[id] = n.geraete[id];
    const schluessel = k => [k.a.geraet, k.a.port, k.b.geraet, k.b.port, k.id].join("\u0000");
    const kabel = (n.kabel || []).map(k => ({id: k.id, a: {geraet: k.a.geraet, port: k.a.port},
                                             b: {geraet: k.b.geraet, port: k.b.port}}))
      .sort((x, y) => { const a = schluessel(x), b = schluessel(y); return a < b ? -1 : a > b ? 1 : 0; });
    return {v: n.v, geraete, kabel};
  }
  function abdruck(netz){
    const h = fnv1a(kanonisch(netzAbbild(netz))) & 0x3fffffff;
    let s = "";
    for (let i = 5; i >= 0; i--) s += zeichen((h >>> (i * 5)) & 31);
    return s;
  }

  /* ---------- Seed-Kanonisierung (§ 3.1) ----------
     Reine Arithmetik: der k-te Kandidat des Fensters ist `variante + 1 + k`. Die SUCHE (welcher
     Kandidat eine gültige Fassung ergibt) braucht `def.fuerSeed` und `Spiel.ticketGueltig`; sie
     gehört in `src/spiel/klassenraum.js`, nicht hierher. */
  const klemmeByte = v => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(255, n)) : 0; };
  function kanonSeed(variante, k){
    const schritt = Math.round(Number(k));
    const kk = Number.isFinite(schritt) ? Math.max(0, Math.min(KANON_FENSTER - 1, schritt)) : 0;
    return klemmeByte(variante) + 1 + kk;
  }

  /* ---------- Eingefrorene Indextabellen (§ 2.3) ----------
     Baut NUR Nachschlagewerke über die ÜBERGEBENEN Listen — in der gegebenen Reihenfolge, ohne
     Sortierung, ohne Kopie der IDs zu verändern (Regel 1 und 2: einfrieren, nur anhängen).
     Einträge dürfen Strings sein oder {id, tauglich?, ersterSeed?}. */
  function eineTabelle(roh){
    const eintraege = (Array.isArray(roh) ? roh : []).map((e, index) => {
      const o = typeof e === "string" ? {id: e} : (e && typeof e === "object" ? e : {});
      return {index, id: typeof o.id === "string" && o.id ? o.id : null,
        /* `vorhanden:false` meldet der Aufrufer, wenn die eingefrorene ID es in DIESER Fassung nicht
           mehr gibt (§ 2.3 Regel 3: beim Laden prüfen). Dann liefert der Codec `auftrag` statt eines
           falschen Auftrags — mit der ID im Text, wie § 1.5 es gemessen zeigt. */
        vorhanden: o.vorhanden !== false,
        tauglich: o.tauglich !== false,
        ersterSeed: Number.isInteger(o.ersterSeed) ? o.ersterSeed : null};
    });
    const nachId = new Map();
    for (const e of eintraege) if (e.id !== null && !nachId.has(e.id)) nachId.set(e.id, e.index);
    const gueltig = i => Number.isInteger(i) && i >= 0 && i < eintraege.length;
    return {
      laenge: eintraege.length,
      ids: eintraege.map(e => e.id),
      eintraege,
      id: i => (gueltig(i) ? eintraege[i].id : null),
      index: id => (nachId.has(id) ? nachId.get(id) : -1),
      hat: id => nachId.has(id),
      vorhanden: i => (gueltig(i) ? eintraege[i].vorhanden : false),
      tauglich: i => (gueltig(i) ? eintraege[i].tauglich : false),
      ersterSeed: i => (gueltig(i) ? eintraege[i].ersterSeed : null),
    };
  }
  function tabellen(o){
    const q = o || {};
    const auftraege = eineTabelle(q.ticketIds);
    const skills = eineTabelle(q.skillIds);
    return {
      auftraege, skills,
      /* § 3.3: nur die Fertigkeiten mit Injektor dürfen angeboten werden. A hat dort „24 von 27"
         gemessen — das war VOR den Injektoren aus task-5. Heute sind alle 27 adressierbar
         (gemessen: 27/27 liefern bei Seed 1 einen gültigen Auftrag, 0 Kanonisierungsschritte);
         die Tabelle trägt deshalb für alle 27 `tauglich: true`. Siehe Architektur § 12.2. */
      tauglicheFertigkeiten: () => skills.eintraege.filter(e => e.tauglich && e.id)
        .map(e => ({skill: e.id, index: e.index, ersterSeed: e.ersterSeed})),
    };
  }

  return {
    ALPHABET, BASIS, KANON_FENSTER, TABELLE_AUFTRAEGE_LAENGE, TABELLE_SKILLS_LAENGE,
    wert, zeichen, pruefsummen, entkernen,
    auftragBauen, auftragLesen, ergebnisBauen, ergebnisLesen,
    hilfeBauen, hilfeLesen,                  /* § 12.4: der Hilfecode H-XXXX-XX */
    abdruck, netzkennwert: abdruck,          /* § 5 nennt die API-Funktion `netzkennwert` */
    kanonSeed, tabellen,
    kanonisch, fnv1a,                        /* für Nachrechnungen (A:459: fnv1a("A") = 3289118412) */
  };
})();
