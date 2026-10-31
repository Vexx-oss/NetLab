"use strict";
/* SPL-01 (3.0.0): Postfach-Lebenszyklus — Dedup je Fertigkeit, Verfall, harte Obergrenze.
   Vertrag: docs/Architektur.md § 7.2 (Lebenszyklus der Wiederholungs-Tickets). Messung wie im Audit:
   headless, jetzt.setzen, je Tag Spiel.tag.bereitschaftStarten(), kein Lösen dazwischen — genau so wächst
   das Postfach in 2.9.0 unbegrenzt. Soll (Lead-Gate 31.10.2026): ≤ 3 sichtbare Wiederholungen, je Fertigkeit
   höchstens EINE, Spielstand < 120.000 B, store.set im Median ≤ 2 ms (Ziel < 1 ms, protokolliert). */
gruppe("Spiel: Postfach-Lebenszyklus", () => {
  const K = () => Spiel;
  const WIEDERHOLUNG_MAX = 3;
  const eintraege = () => Spiel.postfach().filter(i => i && i.quelle === "wiederholung");

  function kapsel(fn){
    const alt = {st: Spiel._st, lz: Spiel._lz, trocken: Spiel._trocken, einst: Spiel._einst,
      speicher: store.alles(), uhr: jetzt(), faellig: L.faelligeIds, tag: Spiel.TAG};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      return fn();
    } finally {
      Spiel.TAG = alt.tag;
      L.faelligeIds = alt.faellig;
      for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
      Object.assign(SPEICHER.daten, alt.speicher);
      Spiel._st = alt.st; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken; Spiel._einst = alt.einst;
      jetzt.setzen(alt.uhr); jetzt.frei();
    }
  }

  pruefe("10 simulierte Tage: höchstens 3 sichtbare Wiederholungen, je Fertigkeit höchstens EINE, Spielstand < 120 KB", () => kapsel(() => {
    const skills = ["lab.link", "lab.ip", "lab.netz", "lab.dhcp"];
    L.faelligeIds = () => skills.slice();                    /* jeden Tag dieselben 4 Fertigkeiten fällig */
    const t0 = Date.UTC(2026, 9, 1, 8, 0, 0);
    for (let tag = 0; tag < 10; tag++){
      jetzt.setzen(t0 + tag * 86400000);
      Spiel.tag.bereitschaftStarten();
    }
    const sichtbar = eintraege();
    const jeSkill = new Map();
    for (const i of sichtbar){
      const skill = (i.gen && i.gen.skill) || ((Spiel.defVon(i) || {}).skills || [])[0] || i.ticketId;
      jeSkill.set(skill, (jeSkill.get(skill) || 0) + 1);
    }
    const doppelt = [...jeSkill.entries()].filter(([, n]) => n > 1);
    erwarte.wahr(sichtbar.length <= WIEDERHOLUNG_MAX, "sichtbare Wiederholungen: " + sichtbar.length + " (soll ≤ " + WIEDERHOLUNG_MAX + "): " + JSON.stringify(sichtbar.map(i => ((i.gen || {}).skill || i.ticketId))));
    erwarte.gleich(doppelt, [], "je Fertigkeit höchstens EINE offene Wiederholung");
    const bytes = JSON.stringify(Spiel.st).length;
    erwarte.wahr(bytes < 120000, "Spielstand " + bytes + " B (soll < 120000 B)");
    /* store.set-Latenz: Median UND Mittel über 50 echte Aufrufe (Deep-Copy im Store). */
    const zeiten = [];
    for (let n = 0; n < 50; n++){
      const a = Date.now();
      store.set("labor", Spiel.st);
      zeiten.push(Date.now() - a);
    }
    zeiten.sort((a, b) => a - b);
    const median = zeiten[Math.floor(zeiten.length / 2)];
    const mittel = Math.round((zeiten.reduce((a, b) => a + b, 0) / zeiten.length) * 100) / 100;
    erwarte.wahr(median <= 2, "store.set-Median " + median + " ms (Gate ≤ 2 ms; Ziel < 1 ms)");
    console.log(`MESSUNG Postfach-Lebenszyklus: ${sichtbar.length} sichtbare Wiederholungen nach 10 Tagen · ${JSON.stringify([...jeSkill])} · ${bytes} B · store.set Median ${median} ms / Mittel ${mittel} ms über 50 Aufrufe`);
  }));

  pruefe("Altstand (2.9.0) mit 20 offenen Wiederholungen wird beim Laden auf ≤ 3 / ≤ 1 je Fertigkeit bereinigt", () => kapsel(() => {
    const t0 = Date.UTC(2026, 9, 1, 8, 0, 0);
    jetzt.setzen(t0);
    const inst = n => ({iid: "i" + n, ticketId: n % 2 ? "salon-01" : "salon-02", seed: 1 + n,
      netz: {geraete: {}, kabel: []}, quelle: "wiederholung", hilfeStufe: 0, hilfen: [], leiter: {},
      start: t0 - n * 1000, frist: null, zeitMs: 0});
    const alt = Spiel.leererStand();
    alt.stufe = 99;
    alt.postfach = Array.from({length: 20}, (_, n) => inst(n));
    store.set("labor", alt);
    store.set(Spiel.SICHERUNG, null);
    Spiel._st = null;
    Spiel.laden();
    const sichtbar = Spiel.postfach().filter(i => i.quelle === "wiederholung");
    const sk = new Set(sichtbar.map(i => ((i.gen || {}).skill) || ((Spiel.defVon(i) || {}).skills || [])[0] || i.ticketId));
    erwarte.wahr(sichtbar.length <= WIEDERHOLUNG_MAX, "nach dem Laden: " + sichtbar.length + " Wiederholungen (soll ≤ 3)");
    erwarte.gleich(sichtbar.length, sk.size, "und je Fertigkeit höchstens EINE: " + JSON.stringify([...sk]));
    erwarte.wahr(JSON.stringify(Spiel.st).length < 120000, "bereinigter Spielstand " + JSON.stringify(Spiel.st).length + " B");
    console.log(`MESSUNG Migration: 20 offene Wiederholungen → ${sichtbar.length} nach Spiel.laden() · ${JSON.stringify(Spiel.st).length} B`);
  }));
});
