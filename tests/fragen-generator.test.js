"use strict";
/* ---------- FRAGEN-GENERATOR (task-18): Beweis über 200 Seeds je Vorlage ----------
   Es gibt keinen Menschen, der eine generierte Frage vorher liest. Deshalb rechnet dieser Test
   jede Frage selbst nach – mit EIGENER Bit-Arithmetik (unten), nicht mit IP.* aus src/kern/netz.js
   und nicht mit den Rechenwegen der Vorlage. Drei Wege, ein Ergebnis:
     · die Vorlage rechnet `loesung` und `pruefe` unabhängig voneinander,
     · der Generator nimmt nur an, wenn genau EINE Option `pruefe` besteht,
     · dieser Test rechnet den erwarteten Text aus den Parametern der Frage nach.
   Geprüft wird je Vorlage über SEEDS = 200 Seeds:
     (1) Form: Pflichtfelder, Längen der Leiste (≤ 140 / ≤ 60), vier verschiedene Optionen,
         gültige Fertigkeit und Stufe, ID aus Vorlage und Seed,
     (2) Lösung: die als richtig markierte Option ist genau der nachgerechnete Wert – und die
         einzige, die der echte Mini-Weg (Spiel.mini.pruefen) als richtig bewertet,
     (3) Plausibilität: jede falsche Option stammt aus der Denkfehler-Menge, die dieser Test aus
         den Parametern ausrechnet (Nachbarblock, Broadcast, Off-by-one, Wildcard statt Maske …),
         und die Vorlage nennt zu jedem Ablenker eine Art aus DATEN.fragenDenkfehler,
     (4) Determinismus und Vielfalt: gleicher Seed ⇒ gleiche Frage; über 200 Seeds entstehen
         viele verschiedene Fragen (die gemessene Zahl steht im Protokoll).

   GEGENRECHNUNG IST PFLICHT: jede Vorlage in DATEN.fragenVorlagen braucht hier einen Eintrag
   (Fall 5) – eine neue Vorlage ohne Nachrechnung wird rot, nicht grün. */

gruppe("Fragen-Generator", () => {
  const SEEDS = 200;

  /* ---------- Eigene Bit-Arithmetik (unabhängig von src/kern/netz.js) ---------- */
  const zz = s => {
    const teile = String(s == null ? "" : s).trim().split(".");
    if (teile.length !== 4) return null;
    let n = 0;
    for (const t of teile) { if (!/^\d{1,3}$/.test(t) || +t > 255) return null; n = ((n * 256) + (+t)) >>> 0; }
    return n;
  };
  const zt = n => [Math.floor(n / 16777216) % 256, Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join(".");
  const maskeAus = p => { let n = 0; for (let i = 0; i < 32; i++) n = ((n * 2) + (i < p ? 1 : 0)) >>> 0; return zt(n); };
  const einsenVorn = m => { const n = zz(m); if (n === null) return -1; let c = 0; for (let i = 31; i >= 0; i--) { if ((n >>> i) & 1) c++; else break; } return c; };
  const wildcardAus = p => zt((~zz(maskeAus(p))) >>> 0);
  const gross = p => Math.pow(2, 32 - p);
  const netzZahl = p => (zz(p.ip) & zz(p.maske)) >>> 0;
  const bcText = p => zt(netzZahl(p) + gross(p.p) - 1);
  const letzterHostText = p => zt(netzZahl(p) + gross(p.p) - 2);

  /* Die bekannten Ports – unabhängig von der Dienst-Tabelle der Vorlage. Kommt dort ein neuer
     Dienst dazu, wird dieser Test rot und die Tabelle hier muss nachgezogen werden. */
  const PORT_TABELLE = {"HTTP": 80, "HTTPS": 443, "SSH": 22, "SMB (Dateifreigabe)": 445,
    "DNS": 53, "DHCP-Server": 67, "RDP": 3389, "SMTP": 25};

  /* ---------- Die Gegenrechnung je Vorlage ----------
     p(params)   prüft die Zahlen der Frage auf Konsistenz (Rückgabe: Liste von Fehlern)
     richtig     der erwartete Text, aus den Parametern gerechnet
     falsch      die Menge der plausiblen Denkfehler-Werte, aus den Parametern gerechnet */
  const GEGEN = {
    "netzadresse": {
      p: p => {
        const f = [];
        if (p.maske !== maskeAus(p.p)) f.push(`maske ${p.maske} ≠ ${maskeAus(p.p)}`);
        if (p.groesse !== gross(p.p)) f.push(`groesse ${p.groesse} ≠ ${gross(p.p)}`);
        if (netzZahl(p) !== zz(p.netz)) f.push(`ip ${p.ip} liegt nicht im Block ${p.netz}`);
        if (!(zz(p.ip) > zz(p.netz) && zz(p.ip) < zz(p.netz) + p.groesse)) f.push(`ip ${p.ip} ist keine Hostadresse im Block`);
        return f;
      },
      richtig: p => zt(netzZahl(p)),
      falsch: p => [zt(zz(p.netz) + p.groesse), zt(zz(p.netz) - p.groesse), bcText(p), p.ip],
    },
    "broadcastadresse": {
      p: p => {
        const f = [];
        if (p.maske !== maskeAus(p.p)) f.push(`maske ${p.maske} ≠ ${maskeAus(p.p)}`);
        if (netzZahl(p) !== zz(p.netz)) f.push(`ip ${p.ip} liegt nicht im Block ${p.netz}`);
        return f;
      },
      richtig: p => bcText(p),
      falsch: p => [p.netz, letzterHostText(p), zt(zz(p.netz) + p.groesse), p.ip],
    },
    "hostanzahl": {
      p: p => {
        const f = [];
        if (p.groesse !== gross(p.p)) f.push(`groesse ${p.groesse} ≠ ${gross(p.p)}`);
        if (p.hosts !== gross(p.p) - 2) f.push(`hosts ${p.hosts} ≠ ${gross(p.p) - 2}`);
        if (zz(p.netz) === null) f.push(`netz ${p.netz} ist keine Adresse`);
        return f;
      },
      richtig: p => String(gross(p.p) - 2),
      falsch: p => [String(gross(p.p)), String(gross(p.p) - 1), String(gross(p.p - 1) - 2)],
    },
    "maske-aus-praefix": {
      p: p => (p.maske === maskeAus(p.p) ? [] : [`maske ${p.maske} ≠ ${maskeAus(p.p)}`]).concat(
        netzZahl(p) === zz(p.netz) ? [] : [`ip ${p.ip} liegt nicht im Block ${p.netz}`]),
      richtig: p => maskeAus(p.p),
      falsch: p => [wildcardAus(p.p), maskeAus(p.p + 1), maskeAus(p.p - 1)],
    },
    "praefix-aus-maske": {
      p: p => (p.maske === maskeAus(p.p) && einsenVorn(p.maske) === p.p ? [] : [`maske ${p.maske} passt nicht zu /${p.p}`]),
      richtig: p => String(p.p),
      falsch: p => [String(p.p - 1), String(p.p + 1), String(32 - p.p)],
    },
    "wildcard-maske": {
      p: p => (p.maske === maskeAus(p.p) ? [] : [`maske ${p.maske} ≠ ${maskeAus(p.p)}`]),
      richtig: p => wildcardAus(p.p),
      falsch: p => [maskeAus(p.p), wildcardAus(p.p + 1), wildcardAus(p.p - 1)],
    },
    "letzter-host": {
      p: p => {
        const f = [];
        if (p.maske !== maskeAus(p.p)) f.push(`maske ${p.maske} ≠ ${maskeAus(p.p)}`);
        if (netzZahl(p) !== zz(p.netz)) f.push(`ip ${p.ip} liegt nicht im Block ${p.netz}`);
        return f;
      },
      richtig: p => letzterHostText(p),
      falsch: p => [bcText(p), p.netz, zt(zz(p.netz) + p.groesse), p.ip],
    },
    "arp-ziel": {
      p: p => {
        const f = [];
        if (p.maske !== maskeAus(p.p)) f.push(`maske ${p.maske} ≠ ${maskeAus(p.p)}`);
        if (zz(p.gw) === null || zz(p.ziel) === null) { f.push("gw oder ziel ist keine Adresse"); return f; }
        if (netzZahl({ip: p.gw, maske: p.maske}) !== zz(p.netz)) f.push(`gw ${p.gw} liegt nicht im Block ${p.netz}`);
        if (p.gw === p.ip || p.ziel === p.ip || p.gw === p.ziel) f.push("ip, gw und ziel müssen verschieden sein");
        const gleich = (zz(p.ziel) & zz(p.maske)) >>> 0 === (zz(p.ip) & zz(p.maske)) >>> 0;
        if (gleich && netzZahl({ip: p.ziel, maske: p.maske}) !== zz(p.netz)) f.push(`ziel ${p.ziel} liegt nicht im Block`);
        if (p.gleich !== gleich) f.push(`gleich ${p.gleich} ≠ ${gleich}`);
        return f;
      },
      richtig: p => ((zz(p.ziel) & zz(p.maske)) >>> 0 === (zz(p.ip) & zz(p.maske)) >>> 0 ? p.ziel : p.gw),
      falsch: p => [((zz(p.ziel) & zz(p.maske)) >>> 0 === (zz(p.ip) & zz(p.maske)) >>> 0 ? p.gw : p.ziel), bcText(p), p.ip],
    },
    "port-eines-dienstes": {
      p: p => {
        const f = [];
        if (PORT_TABELLE[p.dienst] === undefined) f.push(`unbekannter Dienst ${p.dienst} – Port-Tabelle im Test nachziehen`);
        else if (PORT_TABELLE[p.dienst] !== p.port) f.push(`${p.dienst} hat ${PORT_TABELLE[p.dienst]}, die Frage sagt ${p.port}`);
        if (!Array.isArray(p.andere) || p.andere.length !== 3) f.push("drei andere Ports erwartet");
        else for (const x of p.andere) if (x === p.port) f.push("ein Ablenker ist der richtige Port");
        return f;
      },
      richtig: p => String(p.port),
      falsch: p => Object.values(PORT_TABELLE).filter(x => x !== p.port).map(String),
    },
    "ttl-unterwegs": {
      p: p => {
        const f = [];
        if (!Number.isInteger(p.n) || p.n < 2) f.push(`TTL ${p.n} unbrauchbar`);
        if (!Number.isInteger(p.k) || p.k < 2 || p.k >= p.n) f.push(`Routerzahl ${p.k} unbrauchbar – bei k=1 wäre ein Ablenker die Start-TTL`);
        if (p.n - p.k - 1 < 1) f.push("ein Ablenker wäre 0 oder negativ");
        const d = [String(p.n), String(p.n - p.k + 1), String(p.n - p.k - 1)];
        if (new Set(d).size !== 3) f.push(`die drei Ablenker sind nicht verschieden: ${d.join(", ")}`);
        return f;
      },
      richtig: p => String(p.n - p.k),
      falsch: p => [String(p.n), String(p.n - p.k + 1), String(p.n - p.k - 1)],
    },
    "vlan-netzgroesse": {
      p: p => {
        const f = [], q = 24 + Math.round(Math.log(p.n) / Math.log(2));
        if (p.p !== q) f.push(`praefix ${p.p} ≠ ${q} für ${p.n} VLANs`);
        if (p.block !== 256 / p.n) f.push(`block ${p.block} ≠ ${256 / p.n}`);
        if (p.maske !== maskeAus(q)) f.push(`maske ${p.maske} ≠ ${maskeAus(q)}`);
        return f;
      },
      richtig: p => maskeAus(24 + Math.round(Math.log(p.n) / Math.log(2))),
      falsch: p => { const q = 24 + Math.round(Math.log(p.n) / Math.log(2)); return [maskeAus(24), maskeAus(q - 1), maskeAus(q + 1), maskeAus(q + 2)]; },
    },
  };

  const ids = () => Object.keys(DATEN.fragenVorlagen || {}).sort();
  const skillIds = () => new Set((DATEN.skills || []).map(s => s.id));

  pruefe("Fragen-Generator: jede Vorlage liefert über 200 Seeds eine gültige Frage (Form, Längen, Optionen)", () => {
    const fehler = [];
    let gebaut = 0;
    for (const id of ids()) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const m = Spiel.fragen.erzeuge(id, seed);
        if (!m) { fehler.push(`${id}/${seed}: keine Frage`); continue; }
        gebaut++;
        for (const k of ["id", "skill", "stufe", "art", "frage", "optionen", "richtig", "erklaerung", "quelle"]) {
          if (m[k] == null || m[k] === "") fehler.push(`${id}/${seed}: Feld ${k} fehlt`);
        }
        if (m.id !== `gf-${id}-${seed}`) fehler.push(`${id}/${seed}: ID ${m.id}`);
        if (m.art !== "wahl") fehler.push(`${id}/${seed}: Art ${m.art}`);
        if (!["E", "AP1", "AP2"].includes(m.stufe)) fehler.push(`${id}/${seed}: Stufe ${m.stufe}`);
        if (!skillIds().has(m.skill)) fehler.push(`${id}/${seed}: unbekannte Fertigkeit ${m.skill}`);
        if (m.frage.length > 140) fehler.push(`${id}/${seed}: Frage ${m.frage.length} Zeichen`);
        if (!Array.isArray(m.optionen) || m.optionen.length !== 4) { fehler.push(`${id}/${seed}: ${m.optionen && m.optionen.length} Optionen`); continue; }
        for (const o of m.optionen) {
          if (typeof o !== "string" || !o.trim()) fehler.push(`${id}/${seed}: leere Option`);
          else if (o.length > 60) fehler.push(`${id}/${seed}: Option ${o.length} Zeichen (${o})`);
        }
        if (new Set(m.optionen).size !== 4) fehler.push(`${id}/${seed}: Optionen nicht verschieden (${m.optionen.join(" | ")})`);
        if (!Number.isInteger(m.richtig) || m.richtig < 0 || m.richtig > 3) fehler.push(`${id}/${seed}: richtig=${m.richtig}`);
        if (m.generiert !== true || m.vorlage !== id) fehler.push(`${id}/${seed}: Herkunft fehlt`);
      }
      /* Fällt eine Vorlage bei einzelnen Seeds aus, ist das kein Zufall, sondern ein Datenfehler. */
      if (!GEGEN.hasOwnProperty(id)) fehler.push(`${id}: keine Gegenrechnung im Test (GEGEN-Eintrag fehlt)`);
    }
    erwarte.gleich(fehler.slice(0, 8), []);
    erwarte.gleich(gebaut, ids().length * SEEDS, `${gebaut} Fragen aus ${ids().length} Vorlagen`);
    erwarte.wahr(ids().length >= 10, `nur ${ids().length} Vorlagen`);
  });

  pruefe("Fragen-Generator: die als richtig markierte Option ist nachgerechnet richtig – 200 Seeds je Vorlage", () => {
    const fehler = [];
    let geprueft = 0;
    for (const id of ids()) {
      const G = GEGEN[id];
      if (!G) { fehler.push(`${id}: keine Gegenrechnung`); continue; }
      for (let seed = 1; seed <= SEEDS; seed++) {
        const x = Spiel.fragen.erzeugeVoll(id, seed);
        if (!x) { fehler.push(`${id}/${seed}: keine Frage`); continue; }
        const {mini, parameter: p} = x;
        const pFehler = G.p(p);
        if (pFehler.length) { fehler.push(`${id}/${seed}: Zahlen unbrauchbar – ${pFehler.join("; ")}`); continue; }
        const richtig = G.richtig(p);
        const markiert = mini.optionen[mini.richtig];
        if (markiert !== richtig) fehler.push(`${id}/${seed}: markiert „${markiert}“ statt „${richtig}“ (${mini.frage})`);
        if (mini.optionen.filter(o => o === richtig).length !== 1) fehler.push(`${id}/${seed}: „${richtig}“ kommt mehrfach vor`);
        /* Der echte Mini-Weg muss dieselbe Antwort für richtig halten. */
        if (Spiel.mini.pruefen(mini, mini.richtig) !== true) fehler.push(`${id}/${seed}: Spiel.mini.pruefen hält die markierte Option nicht für richtig`);
        for (let i = 0; i < mini.optionen.length; i++) if (i !== mini.richtig && Spiel.mini.pruefen(mini, i) !== false) fehler.push(`${id}/${seed}: Option ${i} gilt auch als richtig`);
        if (Spiel.mini.loesungText(mini) !== richtig) fehler.push(`${id}/${seed}: loesungText „${Spiel.mini.loesungText(mini)}“`);
        geprueft++;
      }
    }
    erwarte.gleich(fehler.slice(0, 8), []);
    erwarte.gleich(geprueft, ids().length * SEEDS, `${geprueft} Lösungen nachgerechnet`);
  });

  pruefe("Fragen-Generator: jede falsche Option ist ein typischer Denkfehler, keine Zufallszahl", () => {
    const fehler = [];
    const arten = new Set((DATEN.fragenDenkfehler || []).map(String));
    const benutzt = new Set();
    let ablenker = 0;
    for (const id of ids()) {
      const V = DATEN.fragenVorlagen[id];
      const G = GEGEN[id];
      if (!G) { fehler.push(`${id}: keine Gegenrechnung`); continue; }
      for (let seed = 1; seed <= SEEDS; seed++) {
        const x = Spiel.fragen.erzeugeVoll(id, seed);
        if (!x) { fehler.push(`${id}/${seed}: keine Frage`); continue; }
        const {mini, parameter: p} = x;
        if (G.p(p).length) continue;                                  /* schon in Fall 2 gemeldet */
        const falschMenge = G.falsch(p);
        for (let i = 0; i < mini.optionen.length; i++) {
          if (i === mini.richtig) continue;
          ablenker++;
          const o = mini.optionen[i];
          if (!falschMenge.includes(o)) fehler.push(`${id}/${seed}: „${o}“ ist kein typischer Denkfehler (erwartet aus ${falschMenge.join(" | ")})`);
        }
        /* Die Vorlage muss zu jedem Ablenker sagen, WELCHER Denkfehler er ist. */
        const roh = V.ablenker(p) || [];
        for (const d of roh) {
          const art = d && typeof d === "object" ? d.art : null;
          if (!art || !arten.has(String(art))) fehler.push(`${id}/${seed}: Ablenker ohne gültige Denkfehler-Art (${art})`);
          else benutzt.add(String(art));
        }
      }
    }
    erwarte.gleich(fehler.slice(0, 8), []);
    erwarte.wahr(ablenker > 6000, `nur ${ablenker} Ablenker geprüft`);
    /* Jede dokumentierte Denkfehler-Art wird wirklich benutzt – sonst steht sie nur in der Liste. */
    erwarte.gleich([...arten].filter(a => !benutzt.has(a)), [], "Denkfehler-Arten ohne Anwendung");
  });

  pruefe("Fragen-Generator: gleicher Seed ⇒ gleiche Frage, verschiedene Seeds ⇒ andere Inhalte", () => {
    const fehler = [];
    const zeilen = [];
    let gesamt = 0, sigs = new Set(), texte = new Set();
    for (const id of ids()) {
      const eigen = new Set(), texteigen = new Set();
      for (let seed = 1; seed <= SEEDS; seed++) {
        const a = Spiel.fragen.erzeuge(id, seed), b = Spiel.fragen.erzeuge(id, seed);
        if (!a) { fehler.push(`${id}/${seed}: keine Frage`); continue; }
        if (JSON.stringify(a) !== JSON.stringify(b)) fehler.push(`${id}/${seed}: nicht deterministisch`);
        const nochmal = Spiel.fragen.ausId(a.id);
        if (!nochmal || JSON.stringify(nochmal) !== JSON.stringify(a)) fehler.push(`${id}/${seed}: ausId baut die Frage nicht nach`);
        eigen.add(JSON.stringify(a)); texteigen.add(a.frage);
        gesamt++; sigs.add(id + "|" + JSON.stringify(a)); texte.add(id + "|" + a.frage);
      }
      if (texteigen.size < 40) fehler.push(`${id}: nur ${texteigen.size} verschiedene Fragetexte über ${SEEDS} Seeds`);
      zeilen.push(`${id}: ${texteigen.size}/${SEEDS} Fragetexte, ${eigen.size}/${SEEDS} verschiedene Fragen`);
    }
    console.log("Fragen-Generator · Vielfalt → " + zeilen.join(" · "));
    erwarte.gleich(fehler.slice(0, 8), []);
    /* Gemessen am 09.10.2026 über 200 Seeds: 2200 verschiedene Fragen und 1882 verschiedene
       Fragetexte; die schwächste Vorlage (port-eines-dienstes) hat 62 Fragetexte, weil ihre
       Dienst-Tabelle endlich ist. Die Schwellen liegen darunter, aber deutlich über null. */
    erwarte.wahr(sigs.size >= 1500, `nur ${sigs.size} verschiedene Fragen aus ${gesamt}`);
    erwarte.wahr(texte.size >= 800, `nur ${texte.size} verschiedene Fragetexte`);
    console.log(`Fragen-Generator · Ergebnis → ${ids().length} Vorlagen, ${gesamt} Fragen, ${sigs.size} verschiedene Fragen, ${texte.size} verschiedene Fragetexte`);
  });

  pruefe("Fragen-Generator: jede Vorlage hat eine Gegenrechnung, und der Datenbestand bleibt unberührt", () => {
    const vorher = JSON.stringify(DATEN.mini);
    const miniZahl = DATEN.mini.length;
    const vIds = ids(), gIds = Object.keys(GEGEN).sort();
    erwarte.gleich(vIds.filter(id => !gIds.includes(id)), [], "Vorlagen ohne Gegenrechnung");
    erwarte.gleich(gIds.filter(id => !vIds.includes(id)), [], "Gegenrechnung ohne Vorlage");
    for (const id of vIds) {
      const V = DATEN.fragenVorlagen[id];
      for (const f of ["id", "titel", "skill", "stufe", "art", "quelle"]) if (!V[f]) erwarte.wahr(false, `${id}: Feld ${f} fehlt`);
      erwarte.wahr(skillIds().has(V.skill), `${id}: unbekannte Fertigkeit ${V.skill}`);
      erwarte.wahr(["E", "AP1", "AP2"].includes(V.stufe), `${id}: Stufe ${V.stufe}`);
      erwarte.wahr(typeof V.zahlen === "function" && typeof V.frage === "function" && typeof V.loesung === "function" &&
        typeof V.pruefe === "function" && typeof V.ablenker === "function" && typeof V.erklaerung === "function",
        `${id}: Rechenregel unvollständig`);
      /* Die Platzhalter der Vorlage müssen wirklich im Fragetext stehen. */
      for (let seed = 1; seed <= 5; seed++) {
        const x = Spiel.fragen.erzeugeVoll(id, seed);
        if (!x) { erwarte.wahr(false, `${id}/${seed}: keine Frage`); continue; }
        for (const k of (V.platzhalter || [])) {
          const wert = String(x.parameter[k]);
          if (!x.mini.frage.includes(wert)) erwarte.wahr(false, `${id}/${seed}: Platzhalter ${k}=${wert} steht nicht in der Frage`);
        }
      }
    }
    Spiel.fragen.erzeuge(vIds[0], 7);
    erwarte.gleich(DATEN.mini.length, miniZahl, "der Generator hängt nichts in DATEN.mini");
    erwarte.gleich(JSON.stringify(DATEN.mini), vorher, "DATEN.mini bleibt unverändert");
    erwarte.gleich(Spiel.fragen.anzahl(), vIds.length, "anzahl() zählt die Vorlagen");
    erwarte.gleich(Spiel.fragen.erzeuge("gibtsnicht", 1), null, "unbekannte Vorlage → null");
    erwarte.gleich(Spiel.fragen.erzeugeVoll("gibtsnicht", 1), null, "unbekannte Vorlage → null (voll)");
  });

  pruefe("Fragen-Generator: die Anbindung ist bereit – fuerSkill, merken, von – ohne src/spiel/mini.js anzufassen", () => {
    const mitVorlage = [...new Set(ids().map(id => DATEN.fragenVorlagen[id].skill))].sort();
    erwarte.wahr(mitVorlage.length >= 8, `nur ${mitVorlage.length} Fertigkeiten mit Vorlage`);
    for (const skill of mitVorlage) {
      const a = Spiel.fragen.fuerSkill(skill, {seed: 3});
      erwarte.wahr(!!a, `${skill}: keine generierte Frage`);
      erwarte.gleich(a.skill, skill, `${skill}: falsche Fertigkeit`);
      const b = Spiel.fragen.fuerSkill(skill, {seed: 3});
      erwarte.gleich(JSON.stringify(a), JSON.stringify(b), `${skill}: nicht deterministisch`);
      const c = Spiel.fragen.fuerSkill(skill, {ohne: [a.id], seed: 3});
      erwarte.wahr(!!c && c.id !== a.id, `${skill}: ohne[] wird nicht beachtet`);
      erwarte.gleich(Spiel.fragen.merken(a), a, "merken() gibt die Frage zurück");
      erwarte.gleich(Spiel.fragen.von(a.id), a, "von() findet die gemerkte Frage");
      erwarte.gleich(JSON.stringify(Spiel.fragen.von(a.id)), JSON.stringify(a), "von() liefert dieselbe Frage");
    }
    /* Eine Fertigkeit ohne Vorlage: null statt Wurf. */
    const ohne = (DATEN.skills || []).map(s => s.id).find(id => !mitVorlage.includes(id));
    erwarte.wahr(!!ohne, "es gibt eine Fertigkeit ohne Vorlage");
    erwarte.gleich(Spiel.fragen.fuerSkill(ohne, {seed: 1}), null, `${ohne}: null erwartet`);
    /* Die generierte Frage läuft durch den vorhandenen Mini-Weg – ohne dass mini.js sie kennen muss. */
    const g = Spiel.fragen.fuerSkill(mitVorlage[0], {seed: 5});
    erwarte.gleich(Spiel.mini.pruefen(g, g.richtig), true, "der Mini-Weg bewertet die richtige Option als richtig");
    erwarte.gleich(Spiel.mini.loesungText(g), g.optionen[g.richtig], "loesungText passt zur markierten Option");
    erwarte.wahr(typeof Spiel.mini.passtNiveau(g) === "boolean", "passtNiveau() verträgt die generierte Frage");
    erwarte.gleich(Spiel.fragen.von("gf-gibtsnicht-1"), null, "unbekannte ID → null");
    erwarte.gleich(Spiel.fragen.alle().length, ids().length, "alle() listet jede Vorlage");
  });
});
