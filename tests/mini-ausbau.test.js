"use strict";
/* ---------- Inhalt A (task-53): die 24 neuen Mini-Tickets und ihre Denkhilfen ----------
   Geprüft wird am echten Weg, nicht am Augenschein:
     (1) ANGEHÄNGT, nicht eingeschoben: die neuen IDs sind genau die LETZTEN Einträge von
         DATEN.mini (die IDs darüber stehen in eingefrorenen Tabellen),
     (2) Hausform: Pflichtfelder, Längen der Leiste, gültige Fertigkeit/Stufe/Art,
     (3) zu jedem neuen Mini ein Denkanstoß, der denkt statt verrät: eigener Text (nicht der
         Fertigkeitssatz), kein Lösungstext, keine wörtliche Option, `ausschnitt` wörtlich aus der
         Aufgabe, `stichwort` nicht auf der Wiki-Seite der Fertigkeit,
     (4) DIE ROTATION: 200 Züge über Spiel.mini.naechstes() + Spiel.mini.antworten() — die neuen
         Minis müssen dabei WIRKLICH vorkommen (nicht nur im Datenbestand liegen). Die Mechanik
         zieht über st.mini.zug/st.mini.zuletzt (Fenster Spiel.MINI.SPERRE = 25) und mischt
         generierte Fragen bei (Spiel.MINI.GENERIERT).

   Alles im Rumpf der Gruppe: die Testdateien werden in EINEN Bereich geladen. */

gruppe("Mini-Ausbau 3.0: neue Minis und Denkhilfen (task-53)", () => {
  /* Die 24 neuen Minis dieses Auftrags — genau diese, in dieser Reihenfolge. */
  const NEU = [
    "mini-sto-2", "mini-sto-3", "mini-sto-4",
    "mini-stp-3", "mini-stp-4",
    "mini-nat-5",
    "mini-tcp-4", "mini-tcp-5",
    "mini-dns-4", "mini-dns-5",
    "mini-dhcp-4",
    "mini-arp-4",
    "mini-sub-5", "mini-sub-6",
    "mini-vlan-4", "mini-vlan-5",
    "mini-trunk-4",
    "mini-psec-4",
    "mini-sw-4",
    "mini-ip-4",
    "mini-netz-4",
    "mini-route-5",
    "mini-fw-4",
    "mini-port-4",
  ];
  /* Stand vor diesem Auftrag (gemessen): 92 Minis, 91 Denkhilfen, nur mini-link-2 ohne Eintrag.
     Der letzte Eintrag dieser 92 war `mini-cli-systemctl-1` — er ist der Anker für „angehängt". */
  const VORHER = 92;
  const ANKER = "mini-cli-systemctl-1";

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
  const wikiSichtbar = sk => {
    const w = (DATEN.wiki || {})[sk];
    if (!w) return "";
    return [w.titel, w.kurz, w.merksatz, w.pruefungstipp, w.quelle,
      ...(w.abschnitte || []).map(a => (a.titel || "") + " " + (a.html || ""))].filter(Boolean).join(" ").toLowerCase();
  };
  const optionen = m => m.art === "zuordnen" ? [...m.optionen.links, ...m.optionen.rechts] : m.optionen;
  const erstenText = id => { Spiel.mini.stand().hilfen = []; const h = Spiel.mini.hilfe(id); return h ? h.text : null; };
  const fertigkeitssatz = m => String((Spiel.SENIOR_FRAGEN && Spiel.SENIOR_FRAGEN[m.skill]) || (Spiel.WERKZEUGE && Spiel.WERKZEUGE[m.skill]) || Spiel.MINI.DENKANSTOSS);
  const eintrag = id => (DATEN.miniDenkhilfen || {})[id] || null;
  const skillIds = new Set((DATEN.skills || []).map(s => s.id));

  pruefe("Mini-Ausbau: die 24 neuen Minis sind ANGEHÄNGT und haben die Hausform", kapsel(() => {
    const fehler = [];
    /* (1) Angehängt: die neuen Minis stehen in dieser Reihenfolge DIREKT hinter dem Anker —
       kein alter Eintrag wurde verschoben, und ein späterer Ausbau darf ruhig weiter anhängen. */
    const ids = DATEN.mini.map(m => m.id);
    const anker = ids.indexOf(ANKER);
    erwarte.wahr(anker >= 0, `der Anker ${ANKER} ist noch da`);
    erwarte.gleich(ids.slice(anker + 1, anker + 1 + NEU.length), NEU, "die neuen Minis stehen direkt hinter dem Anker");
    erwarte.wahr(DATEN.mini.length >= VORHER + NEU.length, `Bestand gewachsen (${DATEN.mini.length})`);
    erwarte.gleich(ids.filter(id => NEU.includes(id)).length, NEU.length, "keine ID doppelt");
    /* (2) Hausform (dieselben Grenzen wie tests/daten-mini.test.js). */
    for (const id of NEU) {
      const m = Spiel.mini.von(id);
      if (!m) { fehler.push(`${id}: nicht in DATEN.mini`); continue; }
      for (const k of ["id", "skill", "stufe", "art", "frage", "optionen", "erklaerung", "quelle"]) {
        if (m[k] == null || m[k] === "") fehler.push(`${id}: Feld ${k} fehlt`);
      }
      if (!skillIds.has(m.skill)) fehler.push(`${id}: unbekannte Fertigkeit ${m.skill}`);
      if (!["E", "AP1", "AP2"].includes(m.stufe)) fehler.push(`${id}: Stufe ${m.stufe}`);
      if (!["wahl", "vorhersage", "reihenfolge", "zuordnen"].includes(m.art)) fehler.push(`${id}: Art ${m.art}`);
      if (m.frage.length > 140) fehler.push(`${id}: Frage ${m.frage.length} Zeichen`);
      const max = m.art === "zuordnen" ? 40 : 60;
      for (const o of optionen(m)) if (o.length > max) fehler.push(`${id}: Option ${o.length} Zeichen (${o})`);
      if (m.art !== "zuordnen" && m.optionen.length > 4) fehler.push(`${id}: ${m.optionen.length} Optionen`);
      if (!Spiel.mini.pruefen(m, m.richtig)) fehler.push(`${id}: die markierte Antwort ist nicht lösbar`);
      if (m.schnappschuss) {
        const z = m.schnappschuss.inhalt.split("\n");
        if (z.length > 7) fehler.push(`${id}: ${z.length} Zeilen im Schnappschuss`);
        for (const l of z) if (l.length > 44) fehler.push(`${id}: Zeile ${l.length} Zeichen`);
      }
    }
    erwarte.gleich(fehler.slice(0, 8), []);
  }));

  pruefe("Mini-Ausbau: jedes neue Mini hat eine Denkhilfe, die denkt statt verrät", kapsel(() => {
    const fehler = [];
    for (const id of NEU) {
      const m = Spiel.mini.von(id), e = eintrag(id);
      if (!m) { fehler.push(`${id}: kein Mini`); continue; }
      if (!e) { fehler.push(`${id}: kein Denkanstoß`); continue; }
      if (typeof e.denkhilfe !== "string" || !e.denkhilfe.trim()) fehler.push(`${id}: denkhilfe leer`);
      if (typeof e.stichwort !== "string" || !e.stichwort.trim()) fehler.push(`${id}: stichwort fehlt`);
      for (const k of Object.keys(e)) if (!["denkhilfe", "ausschnitt", "stichwort"].includes(k)) fehler.push(`${id}: unbekanntes Feld ${k}`);
      /* Der Wächter darf den Text nicht still ersetzen, und es darf nicht der Fertigkeitssatz sein. */
      const t = erstenText(id);
      if (t !== e.denkhilfe) fehler.push(`${id}: der Wächter hat den Text ersetzt („${String(t).slice(0, 50)}…“)`);
      if (t === fertigkeitssatz(m)) fehler.push(`${id}: das ist der Fertigkeitssatz, kein eigener Text`);
      /* Kein Lösungstext, keine wörtliche Option. */
      const loesung = klein(Spiel.mini.loesungText(m));
      if (loesung && klein(e.denkhilfe).includes(loesung)) fehler.push(`${id}: Denkhilfe enthält die Lösung`);
      for (const o of optionen(m)) { const w = klein(o); if (w.length > 3 && klein(e.denkhilfe).includes(w)) fehler.push(`${id}: Denkhilfe nennt die Option „${o}“`); }
      /* Der eigene Ausschnitt muss wörtlich in der Aufgabe stehen. */
      if (e.ausschnitt) {
        const aufgabe = klein([m.frage, m.schnappschuss ? m.schnappschuss.inhalt : ""].join(" \n "));
        if (!aufgabe.includes(klein(e.ausschnitt))) fehler.push(`${id}: Ausschnitt „${e.ausschnitt}“ steht nicht in der Aufgabe`);
        if (loesung && klein(e.ausschnitt).includes(loesung)) fehler.push(`${id}: Ausschnitt enthält die Lösung`);
      }
    }
    erwarte.gleich(fehler.slice(0, 8), []);
  }));

  pruefe("Mini-Ausbau: jedes Stichwort fehlt auf der Wiki-Seite seiner Fertigkeit", kapsel(() => {
    const fehler = [], ohneWiki = [];
    for (const id of NEU) {
      const m = Spiel.mini.von(id), e = eintrag(id);
      if (!m || !e) { fehler.push(`${id}: Mini oder Eintrag fehlt`); continue; }
      const seite = wikiSichtbar(m.skill);
      if (!seite) { ohneWiki.push(`${id} (${m.skill})`); continue; }
      if (seite.includes(klein(e.stichwort))) fehler.push(`${id} (${m.skill}): „${e.stichwort}“ steht im Wiki`);
    }
    erwarte.gleich(fehler, []);
    erwarte.gleich(ohneWiki, []);
  }));

  pruefe("Mini-Ausbau: 200 Züge der Rotation — die neuen Minis kommen wirklich vor", kapsel(() => {
    /* Ein Spieler auf Stufe 6: alle 27 Fertigkeiten sind freigegeben (naechstes() filtert darüber).
       Niveau AP2: die Vorliebe `passtNiveau` lässt den GANZEN Vorrat zu — bei „E" fallen AP2-Minis
       absichtlich heraus, solange eine Fertigkeit auch E-/AP1-Minis hat (eigener Fall unten). */
    Spiel._st.stufe = 6;
    Spiel._einst.wahl = "AP2";
    const gesehen = new Map();            /* feste Mini-ID → Zugnummer des ersten Auftretens */
    const neue = new Set();
    let zuege = 0, generiert = 0, wiederholt = 0, kleinsterAbstand = 999;
    for (let i = 0; i < 200; i++) {
      const m = Spiel.mini.naechstes();
      if (!m) break;
      zuege++;
      if (m.generiert) generiert++;
      else {
        if (gesehen.has(m.id)) {
          wiederholt++;
          const abstand = i + 1 - (gesehen.get(m.id) || 0);
        } else gesehen.set(m.id, i + 1);
        if (NEU.includes(m.id)) neue.add(m.id);
      }
      Spiel.mini.antworten(m.id, m.richtig);
    }
    const fehlend = NEU.filter(id => !neue.has(id));
    console.log(`Mini-Ausbau · Rotation (Stufe 6, Niveau AP2) → ${zuege} Züge · ${gesehen.size} verschiedene feste Minis · ` +
      `${generiert} generierte Fragen · ${wiederholt} Wiederholungen · neue Minis: ${neue.size}/${NEU.length}`);
    if (fehlend.length) console.log("   nicht vorgekommen: " + fehlend.join(", "));
    erwarte.gleich(zuege, 200, "200 Züge gelaufen");
    erwarte.wahr(gesehen.size >= 90, `nur ${gesehen.size} verschiedene feste Minis in 200 Zügen`);
    /* Jedes neue Mini muss in 200 Zügen mindestens einmal dran gewesen sein. */
    erwarte.gleich(fehlend, [], "diese neuen Minis kamen in 200 Zügen nicht vor");
    erwarte.gleich(neue.size, NEU.length, "alle neuen Minis kamen vor");
  }));

  pruefe("Mini-Ausbau: die Niveau-Vorliebe filtert AP2-Minis — und lässt sie zu, wenn nichts anderes da ist", kapsel(() => {
    /* Niveau E: `paasstNiveau` (Spiel.mini.passtNiveau) ist eine VORLIEBE, kein Zwang. Für
       lab.storage gibt es mit sto-2 ein E-Mini, also bleiben sto-3/sto-4 (AP2) außen vor. Für
       lab.stp gibt es NUR AP2-Minis; dort greift der Rückfall auf den ganzen Bestand
       (src/spiel/mini.js: „nichts Passendes" heißt nicht „nichts"). Geprüft wird direkt an
       `fuerSkill` — das hängt nicht daran, welche Fertigkeit die Warteschlange gerade erreicht. */
    Spiel._st.stufe = 6;
    Spiel._einst.wahl = "E";
    const storage = Spiel.mini.fuerSkill("lab.storage");
    erwarte.wahr(!!storage, "lab.storage liefert ein Mini");
    erwarte.falsch(storage.stufe === "AP2", "lab.storage hat ein E-Mini (sto-2) — ein AP2-Mini wäre gegen die Vorliebe");
    erwarte.gleich(storage.id, "mini-sto-2", "die Vorliebe liefert das E-Mini");
    const stp = Spiel.mini.fuerSkill("lab.stp");
    erwarte.wahr(!!stp, "lab.stp liefert ein Mini");
    erwarte.gleich(stp.stufe, "AP2", "lab.stp hat nur AP2-Minis — der Rückfall liefert sie trotzdem");
    /* Und über den echten Zugweg: bei Niveau E darf kein AP2-Mini kommen, das eine E-/AP1-Alternative hat. */
    const hatAlternative = m => Spiel.mini.alle().some(x => x.skill === m.skill && x.stufe !== "AP2");
    const verstoesse = [];
    let gesehen = new Set();
    for (let i = 0; i < 80; i++) {
      const m = Spiel.mini.naechstes();
      if (!m) break;
      if (!m.generiert) {
        gesehen.add(m.id);
        if (m.stufe === "AP2" && hatAlternative(m)) verstoesse.push(`${m.id} (${m.skill})`);
      }
      Spiel.mini.antworten(m.id, m.richtig);
    }
    console.log(`Mini-Ausbau · Rotation (Stufe 6, Niveau E) → ${gesehen.size} verschiedene feste Minis · ` +
      `AP2-Verstöße gegen die Vorliebe: ${verstoesse.length}`);
    erwarte.wahr(gesehen.size > 10, "es wurde überhaupt rotiert");
    erwarte.gleich(verstoesse, [], "AP2-Mini bei Niveau E, obwohl die Fertigkeit ein E-/AP1-Mini hat");
  }));
});
