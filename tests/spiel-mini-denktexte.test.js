"use strict";
/* FRAGEBEZOGENE MINI-DENKHILFE (P1b, task-20)
   Datenpaket: src/daten/mini-denkhilfen.js (DATEN.miniDenkhilfen)
   Vorrang + Rückfall + Anker-Stichwort: src/spiel/mini.js

   Vorher las `miniDenktext(m)` nur `m.skill`: 92 Minis, 27 Fertigkeiten, 26 davon mit mehreren Minis –
   alle bekamen denselben Satz. Geprüft wird hier, dass der Denkanstoß zu DIESER Frage kommt, dass er
   die Lösung nicht verrät, dass der Rückfall greift und dass der Anker den Kernbegriff mitgibt. */

gruppe("Mini: fragebezogene Denktexte", () => {
  /* Kapsel wie in tests/spiel-*.test.js: eigener Stand, eigene Einstellungen, danach alles zurück. */
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
      speicher: store.get("einst", null), paket: DATEN.miniDenkhilfen};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand();
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      if (typeof Spiel.stufe !== "undefined" && Spiel.stufe) Spiel.stufe.setzen("azubi", {still: true});
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      DATEN.miniDenkhilfen = alt.paket;
      store.set("einst", alt.speicher || {});
    }
  };
  const klein = x => String(x == null ? "" : x).toLowerCase().replace(/\s+/g, " ").trim();
  /* Der sichtbare Wiki-Text: genau das, was UI.karriere.wikiAnsicht rendert (Titel, Kurz, Abschnitte,
     Merksatz, Prüfungstipp, Quelle). `belege` steht nicht auf der Seite und zählt deshalb nicht. */
  const wikiSichtbar = sk => {
    const w = (DATEN.wiki || {})[sk];
    if (!w) return "";
    return [w.titel, w.kurz, w.merksatz, w.pruefungstipp, w.quelle,
      ...(w.abschnitte || []).map(a => (a.titel || "") + " " + (a.html || ""))].filter(Boolean).join(" ").toLowerCase();
  };
  const optionen = m => m.art === "zuordnen" ? [...m.optionen.links, ...m.optionen.rechts] : m.optionen;
  const erstenText = id => { Spiel.mini.stand().hilfen = []; const h = Spiel.mini.hilfe(id); return h ? h.text : null; };
  const fertigkeitssatz = m => String((Spiel.SENIOR_FRAGEN && Spiel.SENIOR_FRAGEN[m.skill]) || (Spiel.WERKZEUGE && Spiel.WERKZEUGE[m.skill]) || Spiel.MINI.DENKANSTOSS);

  pruefe("Das Paket ist vollständig: bekannte IDs, Pflichtfelder, nur die drei Felder", kapsel(() => {
    const P = DATEN.miniDenkhilfen;
    erwarte.wahr(P && typeof P === "object", "DATEN.miniDenkhilfen fehlt");
    const ids = new Set(Spiel.mini.alle().map(m => m.id));
    const fehler = [];
    for (const [id, e] of Object.entries(P)) {
      if (!ids.has(id)) fehler.push(`${id}: keine solche Mini-ID`);
      if (!e || typeof e !== "object") { fehler.push(`${id}: kein Objekt`); continue; }
      if (typeof e.denkhilfe !== "string" || !e.denkhilfe.trim()) fehler.push(`${id}: denkhilfe fehlt`);
      if (typeof e.stichwort !== "string" || !e.stichwort.trim()) fehler.push(`${id}: stichwort fehlt`);
      if (e.ausschnitt != null && (typeof e.ausschnitt !== "string" || !e.ausschnitt.trim())) fehler.push(`${id}: ausschnitt ist leer`);
      for (const k of Object.keys(e)) if (!["denkhilfe", "ausschnitt", "stichwort"].includes(k)) fehler.push(`${id}: unbekanntes Feld ${k}`);
    }
    erwarte.gleich(fehler, []);
    erwarte.wahr(Object.keys(P).length >= 20, `mindestens 20 Minis abgedeckt (${Object.keys(P).length})`);
  }));

  pruefe("Mindestens 20 Kernbegriffe fehlen auf der Wiki-Seite ihrer Fertigkeit", kapsel(() => {
    const ohne = [];
    for (const [id, e] of Object.entries(DATEN.miniDenkhilfen)) {
      const m = Spiel.mini.von(id);
      if (!m) continue;
      if (!wikiSichtbar(m.skill).includes(klein(e.stichwort))) ohne.push(`${id} (${m.skill}): ${e.stichwort}`);
    }
    erwarte.wahr(ohne.length >= 20, `nur ${ohne.length} Kernbegriffe fehlen im Wiki: ${ohne.join(" · ")}`);
  }));

  pruefe("Kein Denkanstoß verrät die Lösung oder nennt eine Option wörtlich", kapsel(() => {
    const fehler = [];
    for (const [id, e] of Object.entries(DATEN.miniDenkhilfen)) {
      const m = Spiel.mini.von(id);
      if (!m) continue;
      const loesung = klein(Spiel.mini.loesungText(m));
      if (loesung && klein(e.denkhilfe).includes(loesung)) fehler.push(`${id}: Denkhilfe enthält „${Spiel.mini.loesungText(m)}“`);
      if (loesung && e.ausschnitt && klein(e.ausschnitt).includes(loesung)) fehler.push(`${id}: Ausschnitt enthält die Lösung`);
      for (const o of optionen(m)) {
        const w = klein(o);
        if (w.length > 3 && klein(e.denkhilfe).includes(w)) fehler.push(`${id}: Denkhilfe nennt die Option „${o}“`);
      }
    }
    erwarte.gleich(fehler, []);
  }));

  pruefe("Der Wächter lässt jeden der 25 Texte durch – kein Text wird still ersetzt", kapsel(() => {
    const ersetzt = [];
    for (const [id, e] of Object.entries(DATEN.miniDenkhilfen)) {
      const t = erstenText(id);
      if (t !== e.denkhilfe) ersetzt.push(`${id}: „${String(t).slice(0, 60)}…“`);
    }
    erwarte.gleich(ersetzt, [], "miniOhneLoesung hat einen eigenen Text abgelehnt und den Rückfall genommen");
  }));

  pruefe("Die Frage gewinnt gegen die Fertigkeit: kein abgedecktes Mini bekommt noch den Fertigkeitssatz", kapsel(() => {
    const gleich = [];
    for (const id of Object.keys(DATEN.miniDenkhilfen)) {
      const m = Spiel.mini.von(id);
      if (!m) continue;
      const t = erstenText(id);
      if (t === fertigkeitssatz(m)) gleich.push(id);
    }
    erwarte.gleich(gleich, [], "diese Minis bekommen weiter den Fertigkeitssatz");
  }));

  pruefe("Ein Mini ohne eigenen Eintrag fällt auf den Fertigkeitssatz zurück", kapsel(() => {
    const ohne = Spiel.mini.alle().find(m => !Object.prototype.hasOwnProperty.call(DATEN.miniDenkhilfen, m.id));
    erwarte.wahr(!!ohne, "es gibt Minis ohne eigenen Eintrag (sonst prüft dieser Fall nichts)");
    erwarte.gleich(erstenText(ohne.id), fertigkeitssatz(ohne), "Rückfall auf SENIOR_FRAGEN/WERKZEUGE");
  }));

  pruefe("Ohne DATEN.miniDenkhilfen: kein Wurf, Rückfall wie vorher", kapsel(() => {
    const m = Spiel.mini.von("mini-ping-3");
    DATEN.miniDenkhilfen = undefined;
    /* Vorschau zuerst: sie fragt Sprosse 1 ab, ohne sie zu verbrauchen. */
    erwarte.gleich(Spiel.mini.hilfe(m.id, {nurSehen: true}).text, fertigkeitssatz(m), "die Vorschau greift auf den Fertigkeitssatz zurück");
    const h = Spiel.mini.hilfe(m.id);
    erwarte.wahr(!!h, "hilfe() liefert trotzdem etwas");
    erwarte.gleich(h.text, fertigkeitssatz(m), "und zwar den Fertigkeitssatz");
    const h2 = Spiel.mini.hilfe(m.id);
    erwarte.gleich(h2.art, "ausschnitt", "Sprosse 2 bleibt der Ausschnitt aus der Aufgabe");
    erwarte.wahr(!!h2.text && h2.text.trim().length > 0, "und ist nicht leer");
    const a = Spiel.mini.anker(m.id);
    erwarte.gleich(a.stichwort, Spiel.skill(m.skill).name, "das Stichwort fällt auf den Fertigkeitsnamen zurück");
    DATEN.miniDenkhilfen = {};
    Spiel.mini.stand().hilfen = [];                       /* Sprossen zurücksetzen: sonst ist die Frage erschöpft */
    erwarte.gleich(Spiel.mini.hilfe(m.id, {nurSehen: true}).text, fertigkeitssatz(m), "leeres Paket: ebenfalls Rückfall");
  }));

  pruefe("Die sechs lab.ping-Minis bekommen sechs verschiedene Texte", kapsel(() => {
    const ping = Spiel.mini.alle().filter(m => m.skill === "lab.ping");
    erwarte.gleich(ping.length, 6, "lab.ping hat sechs Minis");
    const texte = ping.map(m => erstenText(m.id));
    for (const t of texte) erwarte.wahr(!!t && t.trim().length > 20, "jeder Text sagt etwas: " + t);
    erwarte.gleich(new Set(texte).size, 6, "alle sechs Texte sind verschieden");
  }));

  pruefe("Der eigene Ausschnitt ist ein wörtlicher Ausschnitt aus Frage oder Schnappschuss", kapsel(() => {
    const fehler = [];
    let mit = 0;
    for (const [id, e] of Object.entries(DATEN.miniDenkhilfen)) {
      if (!e.ausschnitt) continue;
      mit++;
      const m = Spiel.mini.von(id);
      const aufgabe = klein([m.frage, m.schnappschuss ? m.schnappschuss.inhalt : ""].join(" \n "));
      if (!aufgabe.includes(klein(e.ausschnitt))) fehler.push(`${id}: „${e.ausschnitt}“ steht nicht in der Aufgabe`);
    }
    erwarte.gleich(fehler, []);
    erwarte.wahr(mit >= 5, `mindestens fünf eigene Ausschnitte (${mit})`);
  }));

  pruefe("Der Anker gibt den Kernbegriff mit – für jedes der 92 Minis", kapsel(() => {
    const fehler = [];
    let eigene = 0;
    for (const m of Spiel.mini.alle()) {
      const a = Spiel.mini.anker(m.id);
      if (!a || typeof a.stichwort !== "string" || !a.stichwort.trim()) { fehler.push(`${m.id}: kein Stichwort`); continue; }
      const eigen = (DATEN.miniDenkhilfen || {})[m.id];
      if (eigen) { eigene++; if (a.stichwort !== eigen.stichwort) fehler.push(`${m.id}: ${a.stichwort} statt ${eigen.stichwort}`); }
      else if (a.stichwort !== Spiel.skill(m.skill).name) fehler.push(`${m.id}: Rückfall ist ${a.stichwort}`);
    }
    erwarte.gleich(fehler, []);
    erwarte.gleich(eigene, Object.keys(DATEN.miniDenkhilfen).length, "jedes abgedeckte Mini liefert sein Stichwort");
  }));

  pruefe("Deterministisch: zweimal gefragt, derselbe Text – das Paket bleibt unberührt", kapsel(() => {
    const vorher = JSON.stringify(DATEN.miniDenkhilfen);
    for (const id of Object.keys(DATEN.miniDenkhilfen)) {
      const a = erstenText(id);
      const b = erstenText(id);
      erwarte.gleich(a, b, `${id}: zwei Aufrufe, zwei Texte`);
    }
    erwarte.gleich(JSON.stringify(DATEN.miniDenkhilfen), vorher, "das Datenpaket wird nicht verändert");
  }));

  pruefe("Die zweite Sprosse (azubi) zeigt den fragebezogenen Ausschnitt", kapsel(() => {
    const m = Spiel.mini.von("mini-ping-3");
    const h1 = Spiel.mini.hilfe(m.id);
    erwarte.gleich(h1.art, "denkhilfe", "Sprosse 1 ist der Denkanstoß");
    const h2 = Spiel.mini.hilfe(m.id);
    erwarte.gleich(h2.art, "ausschnitt", "Sprosse 2 ist der Ausschnitt");
    erwarte.gleich(h2.text, DATEN.miniDenkhilfen[m.id].ausschnitt, "und zwar der eigene Ausschnitt dieser Frage");
  }));
});
