"use strict";
/* NETZPLAN (spiel/plan.js, Plan – Ausbau 1.2 Phase B; Architektur § 9.4): Für JEDES Ticket (handgeschrieben und
   generiert, jeder Injektor × passende Vorlage): Plan deterministisch · keine überlappenden Beschriftungen · der Plan
   enthält keinen injizierten Fehlerwert · Plan ↔ Startnetz weicht genau an den Geräten ab, die die Lösung anfasst. */
gruppe("Spiel: Netzplan", () => {
  const P = () => Spiel.PLAN;
  /* Beschriftungskasten eines Knotens: Symbol oben, darunter Name und Zeilen */
  const kasten = k => {
    const w = Math.max(k.name.length, ...k.zeigen.map(z => z.length)) * P().ZEICHEN_PX + 16, h = P().SYMBOL + (1 + k.zeigen.length) * P().ZEILE_PX;
    return {x1: k.x - w / 2, x2: k.x + w / 2, y1: k.y - P().SYMBOL / 2, y2: k.y - P().SYMBOL / 2 + h};
  };
  const ueberlappt = (a, b) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
  const loesungsGeraete = def => [...new Set((def.loesung || []).filter(s => s.aktion !== "speichern" && !s.nurLesen)
    .flatMap(s => s.aktion === "verbinden" ? [s.a.geraet, s.b.geraet] : s.geraet ? [s.geraet] : []))].sort();

  function planPruefen(def, wo, {streng = true} = {}){
    const fehler = [];
    let start, soll;
    try { start = Spiel.startNetz(def, 1); soll = Spiel.plan.sollNetzVon(def, 1); } catch (e) { return [`${wo}: ${e.message}`]; }
    for (const [art, breite] of [["netzplan", null], ["netzplan", 400], ["skizze", null], ["skizze", 300], ["tabelle", null]]) {
      const p = Spiel.plan.aus(soll, {art, verdeckt: art === "tabelle" ? "hosts-gw-dns" : null, breite});
      if (breite && p.breite / breite > 1.6) fehler.push(`${wo}/${art}/${breite}: Plan ${p.breite} px breit`);
      if (JSON.stringify(p) !== JSON.stringify(Spiel.plan.aus(Spiel.plan.sollNetzVon(def, 1), {art, verdeckt: art === "tabelle" ? "hosts-gw-dns" : null, breite}))) fehler.push(`${wo}/${art}: nicht deterministisch`);
      if (art !== "tabelle") {
        const k = p.knoten.map(kasten);
        for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) if (ueberlappt(k[i], k[j])) fehler.push(`${wo}/${art}: ${p.knoten[i].id} überlappt ${p.knoten[j].id}`);
        if (p.knoten.some(n => n.x < 0 || n.x > p.breite || n.y < 0 || n.y > p.hoehe)) fehler.push(`${wo}/${art}: Knoten außerhalb`);
      }
      /* kein injizierter Fehlerwert: was im Startnetz falsch ist, steht nie so im Plan */
      for (const d of Spiel.plan.diff(soll, start)) {
        if (d.kabel || typeof d.ist !== "string" || !d.ist || !/\.(ip|maske|gw|dns)$/.test(d.pfad)) continue;
        const feld = d.pfad.split(".").pop(), port = d.pfad.split(".")[1];
        if (p.tabelle.some(z => z.id === d.geraet && (z.port === port || !port) && z[feld] === d.ist)) fehler.push(`${wo}/${art}: Fehlerwert ${d.geraet} ${d.pfad}=${d.ist} im Plan`);
      }
    }
    const abw = Spiel.plan.geraeteAus(Spiel.plan.diff(soll, start));
    if (!abw.length && def.ziele.some(z => z.erwartet)) fehler.push(`${wo}: Plan und Startnetz sind gleich`);   /* reine Terminal-Übung: kein Fehler im Netz */
    if (streng && JSON.stringify(abw) !== JSON.stringify(loesungsGeraete(def))) fehler.push(`${wo}: Abweichungen ${abw} ≠ Lösung ${loesungsGeraete(def)}`);
    return fehler;
  }

  pruefe("alle handgeschriebenen Tickets: deterministisch, ohne Überlappung, ohne Fehlerwert, Abweichung = Lösung", () => {
    const fehler = [];
    const liste = (DATEN.tickets || []).filter(t => t && t.art !== "mini" && Array.isArray(t.ziele) && t.ziele.length);
    for (const def of liste) fehler.push(...planPruefen(def, def.id));
    erwarte.wahr(liste.length >= 37, `nur ${liste.length} Tickets`);
    erwarte.gleich(fehler, []);
  });

  pruefe("alle generierten Tickets (Injektor × Vorlage): dieselben Regeln", () => {
    const fehler = []; let n = 0;
    for (const inj of Object.values(Spiel.INJEKTOREN)) for (const v of inj.vorlagen) {
      let def = null;
      try { def = Spiel.ticketBauen({id: `pl-${inj.name}-${v}`, vorlage: v, vSeed: 101, injektoren: [{name: inj.name, wahl: 1}], stufe: "E"}); } catch (e) { continue; }
      if (!def) continue;
      n++; fehler.push(...planPruefen(def, `${inj.name}/${v}`));
    }
    erwarte.wahr(n > 60, `nur ${n} generierte Tickets`);
    erwarte.gleich(fehler, []);
  });

  pruefe("Salon: Ebenen Internet → Router → Switch → Endgeräte; Arten zeigen, was sie sollen; AP2 verdeckt Gateway/DNS", () => {
    const def = DATEN.tickets.find(t => t.id === "salon-02");
    const soll = Spiel.plan.sollNetzVon(def, 1);
    const p = Spiel.plan.aus(soll, {art: "netzplan"});
    const y = id => p.knoten.find(k => k.id === id).y;
    erwarte.wahr(y("inet") < y("r1") && y("r1") < y("sw1") && y("sw1") < y("kasse") && y("kasse") === y("drucker"), "Ebenen");
    const kasse = p.knoten.find(k => k.id === "kasse");
    erwarte.wahr(kasse.zeigen.some(z => /^\d+\.\d+\.\d+\.\d+\/\d+$/.test(z)), "Netzplan: Adresse mit Präfix");
    erwarte.wahr(p.linien.some(l => [l.a.id, l.b.id].includes("kasse")), "Kabel der Kasse im Plan (gesundes Netz)");
    const s = Spiel.plan.aus(soll, {art: "skizze"});
    erwarte.gleich(s.knoten.find(k => k.id === "kasse").zeigen, [], "Skizze: keine Adressen an Endgeräten");
    erwarte.wahr(s.knoten.find(k => k.id === "r1").zeigen.length === 1, "Skizze: Router mit einer Adresse");
    const t = Spiel.plan.aus(soll, {art: "tabelle", verdeckt: "hosts-gw-dns"});
    const z = t.tabelle.find(r => r.id === "kasse");
    erwarte.gleich([z.gw, z.dns], ["?", "?"], "AP2: Lücken");
    erwarte.wahr(t.tabelle.some(r => r.id === "r1" && r.ip), "Router-Adresse bleibt sichtbar (Gateway herleitbar)");
  });

  pruefe("Abweichungen im laufenden Auftrag: Startnetz → Fehlergerät, nach der Lösung → keine", () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {}; Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99; Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      const inst = Spiel.instanzErstellen({ticketId: "salon-02", quelle: "postfach"});
      Spiel.oeffnen(inst.iid);
      erwarte.gleich(Spiel.plan.abweichungen(inst), ["kasse"]);
      Spiel.loesung(inst.netz, Spiel.defVon(inst).loesung);
      erwarte.gleich(Spiel.plan.abweichungen(inst), []);
      erwarte.gleich(Spiel.plan.art(inst), "netzplan", "Einstieg: Netzplan");
      Spiel._einst.wahl = "AP2"; inst.niveau = null;
      erwarte.gleich(Spiel.plan.art(inst), "tabelle", "AP2: Tabelle");
    } finally { Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken; }
  });
});
