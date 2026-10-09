"use strict";
/* DENKTEXTE TEIL 1 (task-6) – die 35 Minis der ersten Hälfte mit eigenem Denkanstoß.
   Datenpaket: src/daten/mini-denkhilfen.js (DATEN.miniDenkhilfen) · Vorrang, Wächter und Sprossen: src/spiel/mini.js

   Die allgemeinen Regeln prüft tests/spiel-mini-denktexte.test.js für das ganze Paket. Hier steht die
   namentliche Liste der 35 Minis aus task-6, damit ein fehlender oder verwässerter Eintrag genau benannt
   wird:
     · je Mini: Eintrag vorhanden, nur die drei Felder, denkhilfe und stichwort gefüllt, eigener Ausschnitt,
     · die gelieferte Sprosse 1 ist der eigene Text – nicht der Fertigkeitssatz und nicht der Rückfall,
     · kein Text verrät die Lösung und nennt keine Option wörtlich,
     · jeder `ausschnitt` steht wörtlich in Frage oder Schnappschuss und erscheint als zweite Sprosse,
     · die 35 Texte sind untereinander verschieden,
     · die Kernbegriffe fehlen auf der Wiki-Seite ihrer Fertigkeit. Gemessen wird wie in der Projektregel
       (Kopf von mini-denkhilfen.js): mindestens 20 der 35 dürfen dort nicht vorkommen. Wird diese Zahl
       kleiner, nennt die Fehlermeldung die betroffenen Begriffe – dann hat entweder ein Stichwort den
       falschen Kernbegriff, oder die Wiki-Seite wurde so umgeschrieben, dass sie den Begriff jetzt nennt.

   mini-link-2 bleibt bewusst ohne Eintrag: tests/spiel-mini-denktexte.test.js verlangt mindestens ein
   Mini, das auf den Fertigkeitssatz zurückfällt. */

gruppe("Mini: Denkhilfe Teil 1 (task-6): Denktexte der 35 Minis", () => {
  /* Die Zuteilung des Auftrags – genau diese 35, keine anderen. */
  const MEINE = [
    "mini-gw-1", "mini-gw-2", "mini-gw-3", "mini-cli-ipconfig-1", "mini-cli-netsh-1",
    "mini-ip-1", "mini-ip-2", "mini-cli-linux-1",
    "mini-sub-1", "mini-sub-3", "mini-sub-4",
    "mini-dhcp-1", "mini-dhcp-2", "mini-dhcp-3",
    "mini-port-1", "mini-port-2", "mini-port-3",
    "mini-cli-1", "mini-cli-2", "mini-cli-3",
    "mini-save-1", "mini-save-2", "mini-save-3",
    "mini-trunk-1", "mini-trunk-2", "mini-trunk-3",
    "mini-ros-1", "mini-ros-2", "mini-ros-3",
    "mini-acl-1", "mini-acl-2", "mini-acl-3",
    "mini-route-1", "mini-route-2", "mini-route-3",
  ];

  /* Kapsel wie in tests/spiel-*.test.js: eigener Stand, eigene Einstellungen, danach alles zurück. */
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
      speicher: store.get("einst", null)};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand();
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      if (typeof Spiel.stufe !== "undefined" && Spiel.stufe) Spiel.stufe.setzen("azubi", {still: true});
      fn();
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      store.set("einst", alt.speicher || {});
      if (typeof Spiel.stufe !== "undefined" && Spiel.stufe && Spiel.stufe.setzen) Spiel.stufe.setzen("azubi", {still: true});
    }
  };

  const klein = x => String(x == null ? "" : x).toLowerCase().replace(/\s+/g, " ").trim();
  const eintrag = id => ((typeof DATEN !== "undefined" && DATEN.miniDenkhilfen) || {})[id] || null;
  const mini = id => Spiel.mini.von(id);
  const optionen = m => m.art === "zuordnen" ? [...(m.optionen.links || []), ...(m.optionen.rechts || [])] : (Array.isArray(m.optionen) ? m.optionen : []);
  const fertigkeitssatz = m => String((Spiel.SENIOR_FRAGEN && Spiel.SENIOR_FRAGEN[m.skill]) || (Spiel.WERKZEUGE && Spiel.WERKZEUGE[m.skill]) || Spiel.MINI.DENKANSTOSS);
  /* Sprosse 1 über den echten Weg: hilfe() mit leerem Sprossenspeicher dieser Frage. */
  const erstenText = id => { Spiel.mini.stand().hilfen = []; const h = Spiel.mini.hilfe(id); return h ? h.text : null; };
  /* Der sichtbare Wiki-Text: genau das, was die Wiki-Ansicht rendert (wie in tests/spiel-mini-denktexte.test.js). */
  const wikiSichtbar = sk => {
    const w = (DATEN.wiki || {})[sk];
    if (!w) return "";
    return [w.titel, w.kurz, w.merksatz, w.pruefungstipp, w.quelle,
      ...(w.abschnitte || []).map(a => (a.titel || "") + " " + (a.html || ""))].filter(Boolean).join(" ").toLowerCase();
  };

  pruefe("Alle 35 zugeteilten Minis haben einen vollständigen Eintrag", kapsel(() => {
    erwarte.gleich(MEINE.length, 35, "die Zuteilung umfasst 35 Minis");
    erwarte.gleich(new Set(MEINE).size, 35, "keine Mini-ID steht doppelt in der Liste");
    const fehler = [];
    for (const id of MEINE) {
      const m = mini(id), e = eintrag(id);
      if (!m) { fehler.push(`${id}: keine solche Mini-ID in DATEN.mini`); continue; }
      if (!e) { fehler.push(`${id}: kein Eintrag in DATEN.miniDenkhilfen`); continue; }
      if (typeof e.denkhilfe !== "string" || !e.denkhilfe.trim()) fehler.push(`${id}: denkhilfe fehlt`);
      if (typeof e.stichwort !== "string" || !e.stichwort.trim()) fehler.push(`${id}: stichwort fehlt`);
      if (!e.ausschnitt) fehler.push(`${id}: eigener ausschnitt fehlt (zweite Sprosse für azubi)`);
      if (e.ausschnitt != null && (typeof e.ausschnitt !== "string" || !e.ausschnitt.trim())) fehler.push(`${id}: ausschnitt ist leer`);
      for (const k of Object.keys(e)) if (!["denkhilfe", "ausschnitt", "stichwort"].includes(k)) fehler.push(`${id}: unbekanntes Feld ${k}`);
    }
    erwarte.gleich(fehler, []);
  }));

  pruefe("Keiner der 35 bekommt noch den Fertigkeitssatz – die Frage gewinnt", kapsel(() => {
    const gleich = [], leer = [];
    for (const id of MEINE) {
      const m = mini(id), e = eintrag(id);
      if (!m || !e) { leer.push(`${id}: Eintrag oder Mini fehlt`); continue; }
      const t = erstenText(id);
      if (t == null) leer.push(`${id}: hilfe() liefert nichts`);
      else if (t === fertigkeitssatz(m)) gleich.push(`${id} (${m.skill})`);
    }
    erwarte.gleich(leer, []);
    erwarte.gleich(gleich, [], "diese Minis bekommen weiter den Fertigkeitssatz");
  }));

  pruefe("Der Wächter lässt alle 35 eigenen Texte durch – keiner wird still ersetzt", kapsel(() => {
    const ersetzt = [];
    for (const id of MEINE) {
      const e = eintrag(id);
      if (!e) { ersetzt.push(`${id}: kein Eintrag`); continue; }
      const t = erstenText(id);
      if (t !== e.denkhilfe) ersetzt.push(`${id}: geliefert „${String(t).slice(0, 60)}…“ statt des eigenen Textes`);
    }
    erwarte.gleich(ersetzt, [], "miniOhneLoesung hat einen eigenen Text abgelehnt und den Rückfall genommen");
  }));

  pruefe("Kein Text verrät die Lösung und nennt keine Option wörtlich", kapsel(() => {
    const fehler = [];
    for (const id of MEINE) {
      const m = mini(id), e = eintrag(id);
      if (!m || !e) continue;
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

  pruefe("Jeder Ausschnitt steht wörtlich in Frage oder Schnappschuss", kapsel(() => {
    const fehler = [];
    let mit = 0;
    for (const id of MEINE) {
      const m = mini(id), e = eintrag(id);
      if (!m || !e || !e.ausschnitt) continue;
      mit++;
      const aufgabe = klein([m.frage, m.schnappschuss ? m.schnappschuss.inhalt : ""].join(" \n "));
      if (!aufgabe.includes(klein(e.ausschnitt))) fehler.push(`${id}: „${e.ausschnitt}“ steht nicht in der Aufgabe`);
    }
    erwarte.gleich(fehler, []);
    erwarte.gleich(mit, 35, "alle 35 haben einen eigenen Ausschnitt");
  }));

  pruefe("Die zweite Sprosse zeigt genau diesen Ausschnitt", kapsel(() => {
    const fehler = [];
    for (const id of MEINE) {
      const e = eintrag(id);
      if (!e) continue;
      Spiel.mini.stand().hilfen = [];
      const h1 = Spiel.mini.hilfe(id), h2 = Spiel.mini.hilfe(id);
      if (!h1 || h1.art !== "denkhilfe") fehler.push(`${id}: Sprosse 1 ist ${h1 ? h1.art : "leer"}`);
      else if (h1.text !== e.denkhilfe) fehler.push(`${id}: Sprosse 1 zeigt nicht den eigenen Text`);
      if (!h2 || h2.art !== "ausschnitt") fehler.push(`${id}: Sprosse 2 ist ${h2 ? h2.art : "leer"}`);
      else if (h2.text !== e.ausschnitt) fehler.push(`${id}: Sprosse 2 zeigt „${h2.text}“ statt „${e.ausschnitt}“`);
    }
    erwarte.gleich(fehler, []);
  }));

  pruefe("Die 35 Denkanstöße sind untereinander verschieden", kapsel(() => {
    const texte = MEINE.map(id => { const e = eintrag(id); return e ? e.denkhilfe : `FEHLT:${id}`; });
    erwarte.gleich(new Set(texte).size, MEINE.length, "jede Frage hat ihren eigenen Denkanstoß");
  }));

  pruefe("Die Kernbegriffe fehlen auf der Wiki-Seite ihrer Fertigkeit", kapsel(() => {
    const ohne = [], drin = [];
    for (const id of MEINE) {
      const m = mini(id), e = eintrag(id);
      if (!m || !e) continue;
      (wikiSichtbar(m.skill).includes(klein(e.stichwort)) ? drin : ohne).push(`${id} (${m.skill}): ${e.stichwort}`);
    }
    erwarte.wahr(ohne.length >= 20,
      `nur ${ohne.length} der 35 Kernbegriffe fehlen im sichtbaren Wiki-Text (Schwelle 20). Dort stehen sie schon: ${drin.join(" · ")}`);
  }));

  pruefe("mini-link-2 bleibt ohne eigenen Eintrag (reserviert)", kapsel(() => {
    erwarte.falsch(Object.prototype.hasOwnProperty.call(DATEN.miniDenkhilfen || {}, "mini-link-2"),
      "mini-link-2 hat einen Eintrag bekommen – der Rückfall-Test braucht ein Mini ohne Eintrag");
    const m = mini("mini-link-2");
    erwarte.wahr(!!m, "mini-link-2 gibt es in DATEN.mini");
    erwarte.gleich(erstenText("mini-link-2"), fertigkeitssatz(m), "es fällt auf den Fertigkeitssatz zurück");
  }));
});
