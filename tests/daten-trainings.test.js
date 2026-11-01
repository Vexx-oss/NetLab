"use strict";
/* Trainingsszenarien (Baustein G, Vertrag „Hilfestellung – Stufen und Schnittstellen" § 6).

   Geprüft wird DATEN.trainings (src/daten/trainings.js) – Form, Abdeckung und Belegbarkeit.
   Zwei Prüfungen messen gegen den echten Bestand statt zu behaupten:
   · „quelle“: jeder Teil der Quellenangabe muss wörtlich in den Quellen DERSELBEN Fertigkeit stehen
     (DATEN.lehrtexte je Grundcode oder DATEN.wiki[skill].quelle/.belege).
   · „geraet“: die Geräteklasse wird aus den Injektoren der Fertigkeit gemessen (Spiel.INJEKTOREN ×
     Spiel.vorlagen × inj.passt) – dieselbe Messung wie in tests/spiel-training.test.js.
   Zuletzt der Beweis der Wirkung: jedes Szenario wird über den echten Weg (Spiel.instanzErstellen mit
   quelle „training“) wirklich gebaut. Ausnahme sind genau die Fertigkeiten ohne Injektor – sie sind
   Vorratseinträge und stehen als solche namentlich im Test. Reine Daten, kein DOM. */
gruppe("Daten: Trainings", () => {
  const alle = Array.isArray(DATEN.trainings) ? DATEN.trainings : [];
  const skillIds = new Set(DATEN.skills.map(s => s.id));
  const ARTEN = ["basis", "stoerung", "pruefung"];
  const NIVEAU = {basis: "E", stoerung: "AP1", pruefung: "AP2"};
  /* Feldnamen sind der Vertrag: genau diese Felder liest src/spiel/training.js. */
  const PFLICHT = ["id", "titel", "beschreibung", "skill", "geraet", "art", "minuten", "geruest", "niveau", "tipp", "quelle", "injektor"];
  const ERLAUBT = new Set([...PFLICHT, "schritte"]);

  pruefe("mindestens 12 Szenarien, eindeutige IDs mit Präfix tr-", () => {
    erwarte.wahr(alle.length >= 12, `nur ${alle.length} Szenarien`);
    const f = [];
    const ids = new Set();
    for (const t of alle) {
      if (!t || typeof t !== "object") { f.push("kein Objekt: " + JSON.stringify(t)); continue; }
      if (ids.has(t.id)) f.push("doppelte ID: " + t.id);
      ids.add(t.id);
      if (!/^tr-[a-z0-9-]+$/.test(String(t.id))) f.push(`${t.id}: ID ohne Präfix tr- oder mit Sonderzeichen`);
    }
    erwarte.gleich(f, []);
  });

  pruefe("Feldnamen stimmen: jedes Pflichtfeld vorhanden, kein unbekanntes Feld", () => {
    const f = [];
    for (const t of alle) {
      for (const k of PFLICHT) if (!(k in t)) f.push(`${t.id}: ${k} fehlt`);
      for (const k of Object.keys(t)) if (!ERLAUBT.has(k)) f.push(`${t.id}: unbekanntes Feld „${k}“`);
    }
    erwarte.gleich(f, []);
  });

  /* Namentliche Ausnahmen (Architektur § 17.1): Wo die Simulation das Thema nicht ausführen kann,
     gibt es KEIN Training – ein Training erzeugt eine Sim-Instanz über einen Injektor. IPv6 und WLAN
     werden inhaltlich geübt (Adressierung, Planung, Bewertung), nicht paketweise simuliert. Die
     Begründung ist zugleich im Dichte-Test (tests/inhaltsdichte.test.js, AUSNAHME_TRAINING) geführt. */
  const AUSNAHME_TRAINING = {
    "lab.ipv6": "§17.1: IPv6 wird inhaltlich geübt, nicht paketweise simuliert – ein Training bräuchte eine Sim-Instanz.",
    "lab.wlan": "§17.1: WLAN wird inhaltlich geübt, nicht paketweise simuliert – Funk hat kein Sim-Modell.",
  };
  pruefe("jede Fertigkeit aus DATEN.skills kommt mindestens einmal vor – keine erfundene, Ausnahmen namentlich", () => {
    const f = [];
    for (const t of alle) if (!skillIds.has(t.skill)) f.push(`${t.id}: unbekannte Fertigkeit ${t.skill}`);
    const genutzt = new Set(alle.map(t => t.skill));
    erwarte.gleich(f, []);
    erwarte.gleich(DATEN.skills.filter(s => !genutzt.has(s.id) && !AUSNAHME_TRAINING[s.id]).map(s => s.id), [], "Fertigkeit ohne Szenario (außer den namentlichen Ausnahmen)");
    /* Gegenprobe: Die Ausnahmen sind echt – kein Training, gültige Begründung, echte Fertigkeit. */
    const ausnahmenFalsch = [];
    for (const id of Object.keys(AUSNAHME_TRAINING)) {
      if (!skillIds.has(id)) ausnahmenFalsch.push(id + ": keine Fertigkeit");
      if (String(AUSNAHME_TRAINING[id]).trim().length < 20) ausnahmenFalsch.push(id + ": Begründung zu knapp");
      if (genutzt.has(id)) ausnahmenFalsch.push(id + ": hat inzwischen ein Training – Ausnahme entfernen");
    }
    erwarte.gleich(ausnahmenFalsch, [], "Trainings-Ausnahmen sind echt und begründet");
    erwarte.wahr(DATEN.skills.length >= 30, `DATEN.skills hat nur ${DATEN.skills.length} Einträge`);
  });

  pruefe("art, minuten, niveau und geruest stehen im erlaubten Bereich", () => {
    const f = [];
    const arten = new Set();
    for (const t of alle) {
      if (!ARTEN.includes(t.art)) f.push(`${t.id}: art ${t.art}`);
      arten.add(t.art);
      if (!Number.isInteger(t.minuten) || t.minuten < 3 || t.minuten > 15) f.push(`${t.id}: minuten ${t.minuten}`);
      if (typeof t.geruest !== "boolean") f.push(`${t.id}: geruest ${typeof t.geruest}`);
      if (!["E", "AP1", "AP2"].includes(t.niveau)) f.push(`${t.id}: niveau ${t.niveau}`);
      if (NIVEAU[t.art] && t.niveau !== NIVEAU[t.art]) f.push(`${t.id}: niveau ${t.niveau} passt nicht zu art ${t.art}`);
      if (t.art === "pruefung" && t.geruest) f.push(`${t.id}: Prüfung mit Gerüst`);
      if (t.art !== "pruefung" && !t.geruest) f.push(`${t.id}: ${t.art} ohne Gerüst`);
    }
    erwarte.gleich(f, []);
    erwarte.gleich(ARTEN.filter(a => !arten.has(a)), [], "Art ohne Szenario");
  });

  pruefe("Titel und Beschreibung sind gefüllt, die Beschreibung ist der E-Satz", () => {
    const f = [];
    for (const t of alle) {
      if (typeof t.titel !== "string" || t.titel.trim().length < 5 || t.titel.length > 70) f.push(`${t.id}: titel „${t.titel}“`);
      if (typeof t.beschreibung !== "string" || t.beschreibung.trim().length < 80) f.push(`${t.id}: beschreibung zu knapp`);
      if (typeof t.tipp !== "string") f.push(`${t.id}: tipp fehlt`);
      if (t.geruest && t.tipp.trim().length < 20) f.push(`${t.id}: Gerüst ohne Denkanstoß`);
      if (!t.geruest && t.tipp.trim() !== "") f.push(`${t.id}: Prüfung mit Denkanstoß`);
    }
    erwarte.gleich(f, []);
  });

  pruefe("Gerüst und Schritte gehören zusammen: geführte Übung mit Schritten, Prüfung ohne", () => {
    const f = [];
    for (const t of alle) {
      const s = t.schritte;
      if (t.geruest) {
        if (!Array.isArray(s) || s.length < 3) { f.push(`${t.id}: keine Schritte`); continue; }
        for (const z of s) if (typeof z !== "string" || z.trim().length < 10) f.push(`${t.id}: Schritt „${z}“ zu knapp`);
      } else if (s !== undefined) f.push(`${t.id}: Prüfungsszenario mit Schritten`);
    }
    erwarte.gleich(f, []);
  });

  pruefe("jede Quelle ist gefüllt und aus dem Bestand DERSELBEN Fertigkeit belegbar", () => {
    const bestand = skill => [
      ...Object.values(DATEN.lehrtexte).filter(l => l.skill === skill).map(l => l.quelle || ""),
      (DATEN.wiki[skill] || {}).quelle || "",
      (DATEN.wiki[skill] || {}).belege || "",
    ].join(" · ");
    const f = [];
    for (const t of alle) {
      if (typeof t.quelle !== "string" || t.quelle.trim().length < 20) { f.push(`${t.id}: Quelle fehlt oder ist zu knapp`); continue; }
      for (const teil of t.quelle.split(" · ")) if (!bestand(t.skill).includes(teil)) f.push(`${t.id}: „${teil}“ steht in keiner Quelle zu ${t.skill}`);
    }
    erwarte.gleich(f, []);
  });

  pruefe("jede Fertigkeit löst im echten Weg auf: Spiel.skill liefert Name und Karriere-Stufe", () => {
    const f = [];
    for (const t of alle) {
      let s = null;
      try { s = Spiel.skill(t.skill); } catch (e) { f.push(`${t.id}: Spiel.skill wirft (${e && e.message ? e.message : e})`); continue; }
      if (!s || !s.name) { f.push(`${t.id}: Spiel.skill(${t.skill}) ohne Namen`); continue; }
      if (!(s.stufe >= 1)) f.push(`${t.id}: Karriere-Stufe ${s.stufe}`);
    }
    erwarte.gleich(f, []);
  });

  /* Geräteklassen der Fertigkeit aus den Injektoren messen – dieselbe Rechnung wie in
     tests/spiel-training.test.js: „host“ = Endgerät (Spiel.HOSTTYPEN), sonst der Gerätetyp. */
  const klassen = (() => {
    const merker = new Map();
    return skill => {
      if (merker.has(skill)) return merker.get(skill);
      const gefunden = new Set();
      for (const inj of Object.values(Spiel.INJEKTOREN || {}).filter(i => (i.skills || []).includes(skill))) {
        for (const name of inj.vorlagen || []) {
          const V = (Spiel.vorlagen || {})[name];
          if (!V) continue;
          let w = null, kands = [];
          try { w = V.bauen(Zufall(1), {}); } catch (e) { continue; }
          try { kands = inj.passt(w.netz, w.rollen) || []; } catch (e) { kands = []; }
          for (const k of kands) { const g = w.netz.geraete[k.geraet || k.key]; if (g && g.typ) gefunden.add(Spiel.HOSTTYPEN[g.typ] ? "host" : g.typ); }
        }
      }
      merker.set(skill, gefunden);
      return gefunden;
    };
  })();

  pruefe("geraet passt zu dem, was die Injektoren der Fertigkeit wirklich treffen (gemessen)", () => {
    const abweichung = [];
    for (const t of alle) {
      const k = klassen(t.skill);
      const soll = k.size === 0 ? null : (k.size === 1 ? [...k][0] : "alle");
      if (t.geraet !== soll) abweichung.push(`${t.id} (${t.skill}): geraet „${t.geraet}“, gemessen ${k.size ? [...k].sort().join(",") : "keine Injektoren"}`);
    }
    erwarte.gleich(abweichung, []);
  });

  /* ---------- WIS-02 (W3, 31.10.2026): Karte an ihren Injektor binden ----------
     Befund aus W2 (r-didaktik): training.starten baute nur aus Skill+Seed; der Injektor war Zufall.
     Beschreibung und Schritte der Karte konnten damit einen anderen Fall zeigen als den Übungsfall.
     Jede Karte trägt deshalb den Namen ihres Fehlerbilds; geprüft wird die WIRKUNG über den echten
     Bauweg (Spiel.ticketBauen), nicht das Feld allein. */
  const injektorenVon = skill => Object.values(Spiel.INJEKTOREN || {})
    .filter(i => (i.skills || []).includes(skill)).map(i => i.name);

  pruefe("WIS-02: jede Karte pinnt genau einen Injektor ihrer Fertigkeit", () => {
    const f = [];
    for (const t of alle) {
      if (typeof t.injektor !== "string" || !t.injektor.trim()) { f.push(`${t.id}: injektor fehlt`); continue; }
      if (!Spiel.INJEKTOREN[t.injektor]) f.push(`${t.id}: unbekannter Injektor ${t.injektor}`);
      else if (!(Spiel.INJEKTOREN[t.injektor].skills || []).includes(t.skill))
        f.push(`${t.id}: ${t.injektor} gehört nicht zu ${t.skill}`);
    }
    erwarte.gleich(f, []);
  });

  pruefe("WIS-02: der gepinnte Injektor ist der ERSTE gebrochene Fall (3 Seeds je Karte)", () => {
    const f = [];
    for (const t of alle) {
      const inj = Spiel.INJEKTOREN[t.injektor];
      if (!inj) { f.push(`${t.id}: unbekannter Injektor`); continue; }
      const vorlagen = (inj.vorlagen || []).filter(v => Spiel.vorlagen[v]);
      if (!vorlagen.length) { f.push(`${t.id}: keine Vorlage`); continue; }
      let gebaut = 0;
      for (const seed of [1, 2, 3, 4, 5]) {
        let def = null;
        for (const vorlage of vorlagen) {
          try {
            def = Spiel.ticketBauen({id: "bind-" + t.id + "-" + seed + "-" + vorlage, vorlage, vSeed: seed * 101,
              injektoren: [{name: t.injektor, wahl: seed}], stufe: t.niveau});
          } catch (e) { def = null; }
          if (def) break;
        }
        /* Ein Seed kann für eine Vorlage ohne passende Fehlerstelle leer ausgehen – das ist der
           normale Rückfall von training.starten (nächster Versuch). Entscheidend ist: JEDER
           gebaute Fall trägt den gepinnten Injektor, und es gibt bau bare Fälle. */
        if (!def) continue;
        gebaut++;
        const erste = (def.fehlerstellen || [])[0];
        if (!erste || erste.injektor !== t.injektor)
          f.push(`${t.id}/${seed}: erster Fall ${erste && erste.injektor}, gepinnt ${t.injektor}`);
      }
      if (!gebaut) f.push(`${t.id}: kein Seed baubar`);
    }
    erwarte.gleich(f.slice(0, 8), []);
  });

  /* ---------- WIS-03 (W3, 31.10.2026): Textfehler und Dopplung ---------- */
  pruefe("WIS-03: ipconfig prüft keine freie Adresse – Schritt technisch korrigiert", () => {
    const t = alle.find(x => x.id === "tr-ip-setzen");
    erwarte.wahr(!!t, "tr-ip-setzen fehlt");
    const text = (t.schritte || []).join(" ");
    erwarte.falsch(/ipconfig[^.]{0,80}frei/i.test(text), "kein „mit ipconfig prüfen, dass frei“ mehr");
    erwarte.passt(text, /ping|arp/i, "die Freiheit wird per ping/arp geprüft (oder der Schritt entfällt)");
  });

  pruefe("WIS-03: bei fester Adresse hilft release/renew nicht – Konflikt löst die Adressänderung", () => {
    const t = alle.find(x => x.id === "tr-ip-konflikt");
    erwarte.wahr(!!t, "tr-ip-konflikt fehlt");
    const text = (t.schritte || []).join(" ");
    erwarte.falsch(/ipconfig\s*\/release|ipconfig\s*\/renew/i.test(text), "kein release/renew als Konflikt-Fix");
    erwarte.passt(text, /Adresse[^.]{0,80}(änder|neu|frei)/i, "die Lösung nennt die Adressänderung");
  });

  pruefe("WIS-03: tr-betrieb-startconfig und tr-speichern-neustart lehren nicht dasselbe Fehlerbild", () => {
    const a = alle.find(x => x.id === "tr-betrieb-startconfig"), b = alle.find(x => x.id === "tr-speichern-neustart");
    erwarte.wahr(!!a && !!b, "Karten fehlen");
    erwarte.wahr(a.injektor !== b.injektor, "beide Karten pinnen denselben Injektor (" + a.injektor + ")");
  });

  /* Dopplungsregel: innerhalb EINER Fertigkeit pinnt keine zwei Karten denselben Injektor.
     Fertigkeitsübergreifend ist die Bindung nicht immer injektiv möglich (gemessen: maximales
     Matching 50/52, weil z. B. lab.ip und lab.arp denselben Kandidatenkreis teilen). Übergreifende
     Dopplungen sind deshalb nur namentlich begründet erlaubt – mit genau den hier gelisteten IDs. */
  const AUSNAHME_DOPPELT = {
    "ip-tippfehler":          {ids: ["tr-arp-gateway", "tr-ip-setzen"], grund: "Beide zeigen eine falsch gesetzte Adresse: einmal beim Einrichten, einmal als Ursache für ein unerreichbares Gateway (ARP sucht den falschen Nachbarn)."},
    "maske-falsch":           {ids: ["tr-netz-maske", "tr-subnetz-plan"], grund: "Dieselbe Fehlerart für zwei Lernwege: Netzgrenze nachrechnen (lab.netz) und Adressplan bauen (lab.subnetz)."},
    "route-maske-falsch":     {ids: ["tr-netz-nachbar", "tr-route-maske"], grund: "Falsche Maske einmal am Host (Blockgrenze) und einmal in der Route (lab.route) – gleicher Ursachenbegriff, anderer Ort."},
    "rueckroute-fehlt":       {ids: ["tr-ping-meldungen", "tr-route-rueckweg"], grund: "„Nur der Rückweg fehlt“ ist das Lehrziel beider Karten: Ping-Deutung (lab.ping) und Routing (lab.route)."},
    "dhcp-pool-zu-klein":     {ids: ["tr-dhcp-pool-leer", "tr-subnetz-pruefung"], grund: "Ein zu kleiner Adressbereich ist in beiden Fällen das Fehlerbild; lab.dhcp zeigt den Pool, lab.subnetz den Plan."},
    "dienst-aus":             {ids: ["tr-ports-dienst", "tr-tcp-abbruch"], grund: "Ein ausgeschalteter Dienst erklärt sowohl den geschlossenen Port als auch den abgebrochenen Handshake."},
    "portfwd-falsch":         {ids: ["tr-portfwd-dmz", "tr-tcp-handshake"], grund: "Die Weiterleitung zeigt ins Leere; die Karte lab.tcp nutzt denselben Bauweg, um den Verbindungsaufbau zu beobachten."},
    "gespeichert-kaputt":     {ids: ["tr-config-speichern", "tr-speichern-neustart"], grund: "Innerhalb von lab.speichern: die Basis-Karte übt das Sichern als Vorgang, die Störungskarte den Verlust nach dem Neustart – gleicher Injektor, zwei Lernziele."},
    "geraet-stromlos":        {ids: ["tr-betrieb-startconfig", "tr-strom-aus"], grund: "Stromausfall aus zwei Blickwinkeln: lab.link zeigt Schicht 1 (kein Link), lab.betrieb die Verfügbarkeit/Uptime und die Betriebsdokumentation."},
    "fw-zone-falsch":         {ids: ["tr-dmz-weg", "tr-fw-regel"], grund: "Eine Schnittstelle in der falschen Zone erklärt sowohl die zu strenge Firewall-Regel als auch den falschen DMZ-Grenzverlauf."},
  };
  /* Gemessen: eine vollständig injektive Zuordnung ist nicht möglich (maximales Matching aller
     Kandidaten 50/52; mit fachlich passenden Kandidaten kleiner). Deshalb gilt: KEINE Dopplung
     innerhalb einer Fertigkeit, und übergreifend nur die hier namentlich begründeten Paare.
     Falsifizierbar in beide Richtungen: ein neues Doppel-Paar ohne Eintrag ist rot, ein Eintrag,
     der nicht mehr doppelt ist, ebenfalls. */
  pruefe("WIS-03: keine Dopplung innerhalb einer Fertigkeit, übergreifend nur namentlich", () => {
    const proSkill = new Map(), proInj = new Map();
    for (const t of alle) {
      const s = t.skill + "|" + t.injektor;
      proSkill.set(s, (proSkill.get(s) || []).concat(t.id));
      proInj.set(t.injektor, (proInj.get(t.injektor) || []).concat(t.id));
    }
    const f = [];
    for (const [schluessel, ids] of proSkill) {
      if (ids.length <= 1) continue;
      const inj = schluessel.split("|")[1];
      if (!AUSNAHME_DOPPELT[inj]) f.push("Dopplung in einer Fertigkeit: " + ids.join(" + "));
    }
    for (const [inj, ids] of proInj) {
      if (ids.length <= 1) continue;
      const e = AUSNAHME_DOPPELT[inj];
      if (!e) { f.push(inj + ": " + ids.join(" + ")); continue; }
      if (JSON.stringify(ids.slice().sort()) !== JSON.stringify(e.ids.slice().sort()))
        f.push(inj + ": Eintrag " + e.ids.join(" + ") + ", gemessen " + ids.join(" + "));
      if (String(e.grund || "").trim().length < 40) f.push(inj + ": Begründung zu knapp");
    }
    for (const [inj, e] of Object.entries(AUSNAHME_DOPPELT)) {
      if ((proInj.get(inj) || []).length <= 1) f.push(inj + ": Ausnahme nicht mehr nötig");
    }
    erwarte.gleich(f, []);
  });

  /* Der entscheidende Wirkungsbeweis für WIS-02: Über den ECHTEN Weg (training.starten) muss
     derselbe Injektor im gebauten Fall stehen – 20 Seeds je Karte, weil der Seed den Fall baut. */
  /* WIS-02a (task-110): Der Abnahmetest startet jede Karte 20×. Die Seeds müssen dabei WIRKLICH
     verschieden sein (20 verschiedene Seeds je Karte), und jede gebaute Instanz muss den gepinnten
     Injektor als ersten Fall tragen – 52 × 20 = 1040/1040. Zusätzlich werden 20 explizite Seeds
     direkt über den Generator gebaut (Seed ist dort der Eingabewert, keine Ableitung). */
  pruefe("WIS-02a: 20 verschiedene Seeds je Karte, 1040/1040 gepinnt", () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken,
      speicher: store.alles(), gen: Object.assign({}, Spiel.generierte)};
    const f = [];
    let geprueft = 0, verschieden = 0;
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      Spiel._st.stufe = 99;
      /* (1) echter Startweg: 20 Starts je Karte, Seeds müssen 20 verschiedene sein */
      for (const t of alle) {
        const seeds = new Set();
        for (let i = 0; i < 20; i++) {
          const r = Spiel.training.starten(t.id);
          if (!r || !r.ok) { f.push(t.id + ": starten scheitert (" + (r && r.grund) + ")"); break; }
          const inst = Spiel.instanz(r.iid);
          const seed = inst && inst.gen ? inst.gen.seed : null;
          if (seed == null) { f.push(t.id + "/" + i + ": Seed nicht sichtbar"); break; }
          seeds.add(String(seed));
          const def = Spiel.defVon(inst);
          const erste = def && (def.fehlerstellen || [])[0];
          if (!erste || erste.injektor !== t.injektor)
            f.push(t.id + "/Seed" + seed + ": gebaut " + (erste && erste.injektor) + ", gepinnt " + t.injektor);
          geprueft++;
        }
        if (seeds.size !== 20) f.push(t.id + ": nur " + seeds.size + " verschiedene Seeds (soll 20)");
        verschieden += seeds.size;
      }
      /* (2) 20 explizite Seeds direkt über den Generator (Eingabewert, keine Ableitung) */
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel.generierte = {};
      for (const t of alle) {
        for (let seed = 1; seed <= 20; seed++) {
          let def = null;
          try { def = Spiel.generiere(t.skill, seed, {stufe: t.niveau, injektoren: [{name: t.injektor, wahl: seed}]}); }
          catch (e) { f.push(t.id + "/explizit " + seed + ": wirft " + (e && e.message)); continue; }
          const erste = def && (def.fehlerstellen || [])[0];
          if (!erste || erste.injektor !== t.injektor)
            f.push(t.id + "/explizit " + seed + ": " + (erste && erste.injektor));
        }
      }
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, alt.speicher);
      for (const k of Object.keys(Spiel.generierte)) if (!(k in alt.gen)) delete Spiel.generierte[k];
    }
    erwarte.gleich(f.slice(0, 10), []);
    erwarte.gleich(geprueft, 52 * 20, "geprüfte Start-Bauten (52 Karten × 20 Seeds)");
    erwarte.gleich(verschieden, 52 * 20, "verschiedene Seeds über alle Karten");
  });

  /* WIS-02a: Die gemessene Lücke (22 von 1040 direkten Seed-Bauten) entsteht, wenn der gepinnte
     Injektor für eine Vorlage/Seed-Kombination eine LEERE Zielmenge hat (passt() leer). Der
     Generator muss dann mit DEMSELBEN gepinnten Injektor weiterbauen (andere Vorlage/anderer
     Versuch), statt auf einen anderen Injektor der Fertigkeit auszuweichen – sonst zeigt die
     Trainingskarte einen fremden Fall. Simuliert durch einen Bauweg, der die ersten 20 Versuche
     ohne Fall zurückgibt (genau die gemessene Lage). */
  pruefe("WIS-02a: Generator-Fallback hält den gepinnten Injektor bei leerer Zielmenge", () => {
    const altBau = Spiel.ticketBauen, altGen = Spiel.generierte;
    try {
      for (const id of ["tr-netz-maske", "tr-subnetz-plan", "tr-dns-name"]) {
        const t = alle.find(x => x.id === id);
        erwarte.wahr(!!t, id + " fehlt");
        let aufrufe = 0;
        const gesehen = [];
        Spiel.ticketBauen = function(spec){
          aufrufe++;
          for (const x of (spec && spec.injektoren) || []) gesehen.push(x && x.name);
          if (aufrufe <= 20) return null;          /* leere Zielmenge: 20 Versuche ohne Fall */
          return altBau.apply(Spiel, arguments);
        };
        Spiel.generierte = {};
        let def = null, wurf = null;
        try { def = Spiel.generiere(t.skill, 7, {stufe: t.niveau, injektoren: [{name: t.injektor, wahl: 7}]}); }
        catch (e) { wurf = e && e.message; }
        erwarte.falsch(!!wurf, id + ": Generator gab nach 16 Versuchen auf (" + wurf + ")");
        if (!def) continue;
        const f0 = (def.fehlerstellen || [])[0];
        erwarte.gleich(f0 && f0.injektor, t.injektor, id + ": erster Fall nicht gepinnt");
        erwarte.wahr(gesehen.length > 0 && gesehen.every(n => n === t.injektor), id + ": Generator hat den Injektor gewechselt (" + [...new Set(gesehen)].join(", ") + ")");
        erwarte.wahr(aufrufe > 16, id + ": kein Fallback über die 16 Standardversuche hinaus (" + aufrufe + " Aufrufe)");
      }
    } finally { Spiel.ticketBauen = altBau; Spiel.generierte = altGen; }
  });

  /* WIS-02b: Die 6 von r-didaktik belegten Karten nannten konkrete Beispielwerte, die der
     generierte Fall nie zeigt (andere Netze/Vorlagen). Konsequenz: Texte arbeiten mit den Werten
     aus dem Auftrag; geprüft wird: KEINE konkreten IPv4-Adressen (und bei der Betriebs-Karte kein
     festes Gerät „Server“, das die lan-Vorlage nicht hat). */
  /* WIS-02b-Rest (task-110): Die sechs W3-Karten waren nur die Stichprobe. Geprüft wird jetzt
     GLOBAL über alle 52 Karten: kein konkretes IPv4- oder VLAN-Literal im sichtbaren Text (die
     gepinnten Fälle zeigen andere Netze/VLANs), dafür ein Bezug auf die Werte des Auftrags.
     Falsifizierbar: die Gegenprobe schiebt ein Literal ein und erwartet rot; ein neues Literal in
     einer Karte macht den Lauf rot. */
  const LITERAL_IPV4 = /\b\d{1,3}(?:\.\d{1,3}){3}\b/;
  const LITERAL_VLAN = /\bVLAN\s*\d+|\bVLAN\s*\d+\s*(?:\/|,|und)\s*\d+/i;
  const textVerstoesse = (titel, beschreibung, tipp, schritte) => {
    const text = [titel, beschreibung, tipp, ...(schritte || [])].join(" ");
    const f = [];
    const ip = text.match(LITERAL_IPV4);
    if (ip) f.push("IPv4-Literal „" + ip[0] + "“");
    const vlan = text.match(LITERAL_VLAN);
    if (vlan) f.push("VLAN-Literal „" + vlan[0] + "“");
    if (!/Auftrag|Aufgabe|\\bFall\\b|Szenario/i.test(text)) f.push("kein Bezug auf die Werte des Auftrags");
    return f;
  };
  pruefe("WIS-02b global: alle 52 Karten ohne konkrete IPv4-/VLAN-Literale, mit Auftragsbezug", () => {
    const f = [];
    for (const t of alle) {
      for (const grund of textVerstoesse(t.titel, t.beschreibung, t.tipp, t.schritte)) f.push(t.id + ": " + grund);
    }
    erwarte.gleich(f.slice(0, 12), []);
    /* Gegenprobe: der Prüfer erkennt ein eingeschmuggeltes Literal wirklich. */
    const probe = textVerstoesse("Probe", "Im Netz 192.168.7.0/24 liegt VLAN 10 im Auftrag.", "Tipp", []);
    erwarte.gleich(probe.length >= 2, true, "Gegenprobe erkennt IPv4 und VLAN");
    erwarte.gleich(textVerstoesse("Probe", "Die Werte stehen im Auftrag.", "Tipp", []), []);
  });

  pruefe("jedes Szenario mit Injektoren ist über Spiel.instanzErstellen baubar; ohne Injektor ist es Vorrat", () => {
    /* Am 09.10.2026 gemessen: für diese drei Fertigkeiten gab es noch keinen Injektor (Spiel.INJEKTOREN).
       Ihre Szenarien standen als Vorrat in der Liste, starten() konnte sie erst mit Injektor bauen.
       Seit dem Ausbau 1.3 hat jede Fertigkeit einen Injektor (src/spiel/injektoren.js: portsec-fremde-mac,
       stp-doppelkabel, nas-ohne-adresse) – die Liste ist deshalb leer. Kommt eine Fertigkeit ohne Injektor
       hinzu, gehört sie hier namentlich eingetragen UND ihr „geraet“ auf null zurückgesetzt. */
    const OHNE_INJEKTOR = [];
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      const f = [], vorrat = [];
      for (const t of alle) {
        const ohne = klassen(t.skill).size === 0;
        let ok = false, grund = "";
        try {
          const inst = Spiel.instanzErstellen({gen: {skill: t.skill, seed: 1, opts: {stufe: t.niveau}}, quelle: "training", ohneFlow: true});
          ok = !!(inst && inst.netz && Spiel.defVon(inst));
          if (!ok) grund = "keine auflösbare Instanz";
        } catch (e) { grund = e && e.message ? e.message : String(e); }
        if (ok && ohne) f.push(`${t.id}: baubar, obwohl kein Injektor gemessen wurde – geraet darf dann nicht null sein`);
        if (!ok && !ohne) f.push(`${t.id} (${t.skill}): nicht baubar – ${grund}`);
        if (!ok && ohne) vorrat.push(t.id);
      }
      erwarte.gleich(f, []);
      erwarte.gleich(vorrat.map(id => alle.find(t => t.id === id).skill), OHNE_INJEKTOR, "Vorratseinträge ohne Injektor");
      erwarte.wahr(alle.length - vorrat.length >= 12, `nur ${alle.length - vorrat.length} baubare Szenarien`);
    } finally {
      Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken;
    }
  });
});
