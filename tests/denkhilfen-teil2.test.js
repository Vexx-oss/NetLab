"use strict";
/* ---------- DENKHILFEN TEIL 2 (task-7): src/daten/mini-denkhilfen2.js ----------
   Die breite Prüfung über ALLE Einträge liegt in tests/spiel-mini-denktexte.test.js. Hier steht die
   Gegenprobe für diese Hälfte: die 31 zugeteilten Minis einzeln – Eintrag da, Pflichtfelder, nicht der
   Fertigkeitssatz, keine Lösung und keine wörtliche Option, eigener Ausschnitt wörtlich aus der
   Aufgabe, kein stiller Rückfall des Wächters, Stichwort fehlt auf der Wiki-Seite.

   Dazu die zwei Grenzen des Auftrags:
     · die 25 Einträge der Grunddatei (src/daten/mini-denkhilfen.js) sind unangetastet vorhanden –
       die Ergänzung hängt mit Object.assign an und überschreibt nichts,
     · `mini-link-2` bleibt OHNE eigenen Eintrag; tests/spiel-mini-denktexte.test.js:103-107
       verlangt mindestens ein Mini, das auf den Fertigkeitssatz zurückfällt.

   Alles steht im Rumpf der Gruppe: die Testdateien werden in EINEN Bereich geladen, ein `const` auf
   Dateiebene könnte mit einer anderen Testdatei zusammenstoßen. */

gruppe("Mini: Denkhilfen Teil 2 (task-7)", () => {
  /* Die 31 Minis dieses Auftrags – genau diese, keine anderen. */
  const MEINE = [
    "mini-ttl-1", "mini-ttl-2", "mini-ttl-3",
    "mini-nat-1", "mini-nat-2", "mini-nat-3",
    "mini-dmz-1", "mini-dmz-2", "mini-dmz-3",
    "mini-psec-1", "mini-psec-2", "mini-psec-3",
    "mini-netz-1", "mini-netz-2",
    "mini-arp-1", "mini-arp-3",
    "mini-sw-2", "mini-sw-3",
    "mini-dns-1", "mini-cli-nslookup-1",
    "mini-tcp-1", "mini-tcp-3",
    "mini-vlan-1", "mini-vlan-2",
    "mini-fwd-1", "mini-fwd-2",
    "mini-fw-1", "mini-fw-2",
    "mini-stp-1", "mini-stp-2",
    "mini-sto-1",
  ];
  /* Die 25 Einträge der Grunddatei (Stand 09.10.2026, nachgezählt). */
  const GRUND = [
    "mini-ping-1", "mini-ping-2", "mini-ping-3", "mini-ping-4", "mini-cli-ping-1", "mini-cli-ping-2",
    "mini-cli-tracert-1", "mini-cli-systemctl-1", "mini-cli-befehle-1",
    "mini-link-1", "mini-link-3", "mini-ip-3", "mini-netz-3", "mini-sub-2", "mini-arp-2",
    "mini-sw-1", "mini-vlan-3", "mini-acl-4", "mini-route-4", "mini-nat-4",
    "mini-dns-2", "mini-dns-3", "mini-tcp-2", "mini-fwd-3", "mini-fw-3",
  ];

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
     Merksatz, Prüfungstipp, Quelle). `belege` steht nicht auf der Seite und zählt deshalb nicht.
     Gleiche Messung wie tests/spiel-mini-denktexte.test.js:30-35. */
  const wikiSichtbar = sk => {
    const w = (DATEN.wiki || {})[sk];
    if (!w) return "";
    return [w.titel, w.kurz, w.merksatz, w.pruefungstipp, w.quelle,
      ...(w.abschnitte || []).map(a => (a.titel || "") + " " + (a.html || ""))].filter(Boolean).join(" ").toLowerCase();
  };
  const optionen = m => m.art === "zuordnen" ? [...m.optionen.links, ...m.optionen.rechts] : m.optionen;
  /* Sprosse 1 über den echten Weg – genau der Text, den der Spieler sieht. */
  const erstenText = id => { Spiel.mini.stand().hilfen = []; const h = Spiel.mini.hilfe(id); return h ? h.text : null; };
  const fertigkeitssatz = m => String((Spiel.SENIOR_FRAGEN && Spiel.SENIOR_FRAGEN[m.skill]) || (Spiel.WERKZEUGE && Spiel.WERKZEUGE[m.skill]) || Spiel.MINI.DENKANSTOSS);
  const eintrag = id => (DATEN.miniDenkhilfen || {})[id] || null;

  pruefe("Denkhilfen Teil 2: die 31 zugeteilten Minis haben einen Eintrag mit genau den drei Feldern", kapsel(() => {
    const fehler = [];
    for (const id of MEINE) {
      const m = Spiel.mini.von(id);
      if (!m) { fehler.push(`${id}: keine solche Mini-ID`); continue; }
      const e = eintrag(id);
      if (!e) { fehler.push(`${id}: kein Eintrag`); continue; }
      if (typeof e.denkhilfe !== "string" || !e.denkhilfe.trim()) fehler.push(`${id}: denkhilfe fehlt`);
      if (typeof e.stichwort !== "string" || !e.stichwort.trim()) fehler.push(`${id}: stichwort fehlt`);
      if (e.ausschnitt != null && (typeof e.ausschnitt !== "string" || !e.ausschnitt.trim())) fehler.push(`${id}: ausschnitt ist leer`);
      for (const k of Object.keys(e)) if (!["denkhilfe", "ausschnitt", "stichwort"].includes(k)) fehler.push(`${id}: unbekanntes Feld ${k}`);
    }
    erwarte.gleich(fehler, []);
    erwarte.gleich(MEINE.length, 31, "31 zugeteilte Minis");
    erwarte.gleich(new Set(MEINE).size, MEINE.length, "keine ID doppelt");
    erwarte.gleich(MEINE.filter(id => GRUND.includes(id)), [], "keine ID aus der Grunddatei dabei");
  }));

  pruefe("Denkhilfen Teil 2: keine verrät die Lösung oder nennt eine Option wörtlich", kapsel(() => {
    const fehler = [];
    for (const id of MEINE) {
      const m = Spiel.mini.von(id), e = eintrag(id);
      if (!m || !e) { fehler.push(`${id}: Eintrag oder Mini fehlt`); continue; }
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

  pruefe("Denkhilfen Teil 2: jeder eigene Ausschnitt steht wörtlich in Frage oder Schnappschuss", kapsel(() => {
    const fehler = [];
    let mit = 0;
    for (const id of MEINE) {
      const m = Spiel.mini.von(id), e = eintrag(id);
      if (!m || !e || !e.ausschnitt) continue;
      mit++;
      const aufgabe = klein([m.frage, m.schnappschuss ? m.schnappschuss.inhalt : ""].join(" \n "));
      if (!aufgabe.includes(klein(e.ausschnitt))) fehler.push(`${id}: „${e.ausschnitt}“ steht nicht in der Aufgabe`);
      /* Der Wächter prüft die zweite Sprosse gegen die erste Zeile (tests/spiel-mini-hilfe.test.js:146). */
      if (!aufgabe.includes(klein(String(e.ausschnitt).split("\n")[0]))) fehler.push(`${id}: erste Zeile des Ausschnitts steht nicht in der Aufgabe`);
    }
    erwarte.gleich(fehler, []);
    erwarte.wahr(mit >= 10, `eigene Ausschnitte in dieser Hälfte (${mit})`);
  }));

  pruefe("Denkhilfen Teil 2: der Wächter lässt alle 31 Texte durch – keiner wird still ersetzt", kapsel(() => {
    const ersetzt = [], gleich = [];
    for (const id of MEINE) {
      const m = Spiel.mini.von(id), e = eintrag(id);
      if (!m || !e) { ersetzt.push(`${id}: Eintrag oder Mini fehlt`); continue; }
      const t = erstenText(id);
      if (t !== e.denkhilfe) ersetzt.push(`${id}: „${String(t).slice(0, 60)}…“ statt „${String(e.denkhilfe).slice(0, 60)}…“`);
      if (t === fertigkeitssatz(m)) gleich.push(id);
    }
    erwarte.gleich(ersetzt, [], "miniOhneLoesung hat einen eigenen Text abgelehnt oder der Rückfall griff");
    erwarte.gleich(gleich, [], "diese Minis bekommen weiter den Fertigkeitssatz");
  }));

  pruefe("Denkhilfen Teil 2: alle 31 Stichwörter fehlen auf der Wiki-Seite ihrer Fertigkeit", kapsel(() => {
    const fehler = [], ohneWiki = [];
    for (const id of MEINE) {
      const m = Spiel.mini.von(id), e = eintrag(id);
      if (!m || !e) { fehler.push(`${id}: Eintrag oder Mini fehlt`); continue; }
      const seite = wikiSichtbar(m.skill);
      if (!seite) { ohneWiki.push(`${id} (${m.skill})`); continue; }
      if (seite.includes(klein(e.stichwort))) fehler.push(`${id} (${m.skill}): „${e.stichwort}“ steht im Wiki`);
    }
    erwarte.gleich(fehler, []);
    erwarte.gleich(ohneWiki, [], "jede Fertigkeit dieser Hälfte hat eine Wiki-Seite");
  }));

  pruefe("Denkhilfen Teil 2: die 25 Einträge der Grunddatei sind unangetastet vorhanden", kapsel(() => {
    const P = DATEN.miniDenkhilfen || {};
    const fehler = [];
    for (const id of GRUND) {
      if (!Object.prototype.hasOwnProperty.call(P, id)) { fehler.push(`${id}: verschwunden`); continue; }
      const e = P[id];
      if (!e || typeof e.denkhilfe !== "string" || !e.denkhilfe.trim()) fehler.push(`${id}: denkhilfe fehlt`);
      if (!e || typeof e.stichwort !== "string" || !e.stichwort.trim()) fehler.push(`${id}: stichwort fehlt`);
    }
    erwarte.gleich(fehler, []);
    erwarte.gleich(GRUND.length, 25, "25 Einträge in der Grunddatei");
    erwarte.gleich(GRUND.filter(id => MEINE.includes(id)), [], "die Grunddatei-Einträge sind nicht meine");
    erwarte.wahr(Object.keys(P).length >= GRUND.length + MEINE.length,
      `zusammengezählt mindestens ${GRUND.length + MEINE.length} Einträge (${Object.keys(P).length})`);
  }));

  pruefe("Denkhilfen Teil 2: mini-link-2 bleibt der reservierte Mini ohne Eintrag", kapsel(() => {
    const P = DATEN.miniDenkhilfen || {};
    const m = Spiel.mini.von("mini-link-2");
    erwarte.wahr(!!m, "mini-link-2 gibt es");
    erwarte.falsch(Object.prototype.hasOwnProperty.call(P, "mini-link-2"), "mini-link-2 hat keinen eigenen Eintrag (Reserve für den Rückfall-Test)");
    erwarte.falsch(MEINE.includes("mini-link-2"), "mini-link-2 steht nicht in meiner Liste");
    erwarte.gleich(erstenText("mini-link-2"), fertigkeitssatz(m), "Rückfall auf SENIOR_FRAGEN/WERKZEUGE");
  }));
});
