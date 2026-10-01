"use strict";
/* Mini-Tickets: Form, Längen (Leiste 320×220), gültige Antworten, Verteilung und Gegenrechnung der Zahlen */
gruppe("Mini", () => {
  const alle = DATEN.mini;
  const skillIds = new Set(DATEN.skills.map(s => s.id));
  pruefe("mindestens 80, eindeutige IDs, Pflichtfelder, gültige Fertigkeiten", () => {
    erwarte.wahr(alle.length >= 80, `nur ${alle.length}`);
    erwarte.gleich(new Set(alle.map(m => m.id)).size, alle.length, "doppelte IDs");
    const f = [];
    for (const m of alle) {
      for (const k of ["id", "skill", "stufe", "art", "frage", "optionen", "erklaerung", "quelle"]) if (m[k] == null || m[k] === "") f.push(`${m.id}: ${k}`);
      if (!skillIds.has(m.skill)) f.push(`${m.id}: Fertigkeit ${m.skill}`);
      if (!["E", "AP1", "AP2"].includes(m.stufe)) f.push(`${m.id}: Stufe ${m.stufe}`);
      if (!["wahl", "vorhersage", "reihenfolge", "zuordnen"].includes(m.art)) f.push(`${m.id}: Art ${m.art}`);
    }
    erwarte.gleich(f, []);
  });
  pruefe("Längen passen in die Leiste", () => {
    const f = [];
    for (const m of alle) {
      if (m.frage.length > 140) f.push(`${m.id}: Frage ${m.frage.length}`);
      const opts = m.art === "zuordnen" ? [...m.optionen.links, ...m.optionen.rechts] : m.optionen;
      const max = m.art === "zuordnen" ? 40 : 60;
      for (const o of opts) if (o.length > max) f.push(`${m.id}: Option „${o}“ ${o.length}`);
      if (m.art !== "zuordnen" && m.optionen.length > 4) f.push(`${m.id}: ${m.optionen.length} Optionen`);
      if (m.schnappschuss) {
        const z = m.schnappschuss.inhalt.split("\n");
        if (z.length > 7) f.push(`${m.id}: ${z.length} Zeilen`);
        for (const l of z) if (l.length > 44) f.push(`${m.id}: Zeile ${l.length} „${l}“`);
      }
    }
    erwarte.gleich(f, []);
  });
  pruefe("richtige Antworten sind gültig und lösbar", () => {
    const f = [];
    for (const m of alle) {
      if (m.art === "wahl" || m.art === "vorhersage") { if (!(Number.isInteger(m.richtig) && m.richtig >= 0 && m.richtig < m.optionen.length)) f.push(m.id); }
      else if (m.art === "reihenfolge") { const s = [...m.richtig].sort((a, b) => a - b); if (JSON.stringify(s) !== JSON.stringify(m.optionen.map((_, i) => i))) f.push(m.id); }
      else {
        const L = m.optionen.links.length, R = m.optionen.rechts.length;
        const li = new Set(m.richtig.map(p => p[0])), re = new Set(m.richtig.map(p => p[1]));
        if (m.richtig.length !== Math.min(L, R) || li.size !== m.richtig.length || re.size !== m.richtig.length || m.richtig.some(([a, b]) => a >= L || b >= R)) f.push(m.id);
      }
      if (!Spiel.mini.pruefen(m, m.richtig)) f.push(m.id + " (pruefen)");
    }
    erwarte.gleich(f, []);
  });
  pruefe("Verteilung: jede Fertigkeit der Stufen 1–5 mit ≥ 3, alle Arten ausreichend", () => {
    const n = {}, arten = {};
    for (const m of alle) { n[m.skill] = (n[m.skill] || 0) + 1; arten[m.art] = (arten[m.art] || 0) + 1; }
    erwarte.gleich(DATEN.skills.filter(s => s.stufe <= 5 && (n[s.id] || 0) < 3).map(s => s.id), []);
    erwarte.wahr(arten.reihenfolge >= 8 && arten.zuordnen >= 8 && arten.vorhersage >= 12, JSON.stringify(arten));
  });
  pruefe("Gegenrechnung der Zahlen mit den IP-Helfern", () => {
    const f = [];
    for (const m of alle.filter(x => x.pruef)) {
      const p = m.pruef; let ist;
      if (p.art === "netz") ist = IP.netz(p.ip, p.maske);
      else if (p.art === "broadcast") ist = IP.broadcast(p.ip, p.maske);
      else if (p.art === "hosts") ist = Math.pow(2, 32 - IP.praefix(p.maske)) - 2;
      else if (p.art === "gleich") ist = IP.gleichesNetz(p.ip, p.ip2, p.maske);
      else if (p.art === "host") ist = IP.hostAdresse(p.ip, p.maske);
      else if (p.art === "privat") ist = IP.privat(p.ip);
      if (ist !== p.erwartet) f.push(`${m.id}: ${p.art} ist ${ist}, erwartet ${p.erwartet}`);
      /* die als richtig markierte Option muss den gerechneten Wert enthalten (bei Zahlenaufgaben) */
      if (["netz", "broadcast", "hosts"].includes(p.art) && String(m.optionen[m.richtig]) !== String(p.erwartet)) f.push(`${m.id}: richtige Option „${m.optionen[m.richtig]}“ ≠ ${p.erwartet}`);
    }
    erwarte.gleich(f, []);
  });
  pruefe("Auswahl und Antwort laufen über Spiel.mini (Lohn nur bei richtig)", () => {
    const alt = Spiel._st; Spiel._st = Spiel.leererStand(); Spiel._trocken = true;
    try {
      const m = Spiel.mini.naechstes(); erwarte.wahr(!!m, "kein Mini");
      const r = Spiel.mini.antworten(m.id, m.richtig); erwarte.wahr(r.richtig); erwarte.wahr(r.lohn > 0);
      const m2 = Spiel.mini.naechstes(); erwarte.wahr(m2 && m2.id !== m.id, "gleiches Mini direkt nochmal");
    } finally { Spiel._st = alt; Spiel._trocken = false; }
  });
});
