"use strict";
/* FUNKTIONSPROBE (spiel/szene.js, Design – Spielspaß 2.0 Hebel 1): Für JEDES Ticket – handgeschrieben und generiert
   (jeder Injektor × passende Vorlage, jede generierbare Fertigkeit) – liefert Spiel.szene nach der Lösung je Ziel
   eine Zeile mit gültiger Art, existierenden Geräten und einem Pfad, dessen Stationen per Kabel verbunden sind. */
gruppe("Spiel: Funktionsprobe", () => {
  const ARTEN = new Set(["druckt", "seite", "adresse", "gesperrt", "haken", "sicherung"]);
  const verbunden = (netz, a, b) => netz.kabel.some(k => (k.a.geraet === a && k.b.geraet === b) || (k.a.geraet === b && k.b.geraet === a));
  function szenePruefen(def, wo){
    const fehler = [];
    const netz = def.netz(Zufall(1));
    try { Spiel.loesungAnwenden(netz, def.loesung); } catch (e) { return [`${wo}: Lösung wirft ${e.message}`]; }
    const ergebnisse = def.ziele.map(z => Object.assign({ziel: z}, Spiel.istArbeitsziel(z) ? {ok: true} : Sim.pruefeZiel(netz, z)));
    if (ergebnisse.some(e => !e.ok)) return [];          /* Lösbarkeit prüfen andere Tests; hier nur bestandene Abnahmen */
    const zeilen = Spiel.szene(netz, {ergebnisse});
    if (zeilen.length !== def.ziele.length) fehler.push(`${wo}: ${zeilen.length} Szenenzeilen für ${def.ziele.length} Ziele`);
    for (const z of zeilen) {
      if (!ARTEN.has(z.art)) fehler.push(`${wo}: Art ${z.art}`);
      if (!z.text) fehler.push(`${wo}: Zeile ohne Text`);
      if (!z.pfad.length || z.pfad.some(id => !netz.geraete[id]) || !netz.geraete[z.ende]) fehler.push(`${wo}: Gerät fehlt in ${z.pfad.join("→")} / ${z.ende}`);
      for (let i = 1; i < z.pfad.length; i++) if (!verbunden(netz, z.pfad[i - 1], z.pfad[i])) fehler.push(`${wo}: ${z.pfad[i - 1]}→${z.pfad[i]} ohne Kabel`);
      if (z.pfad[z.pfad.length - 1] !== z.ende && z.ziel.typ !== "konfig" && z.ziel.typ !== "gespeichert") fehler.push(`${wo}: Pfad endet nicht am Endgerät (${z.pfad.join("→")} / ${z.ende})`);
    }
    return fehler;
  }

  pruefe("alle handgeschriebenen Tickets: eine gültige Szenenzeile je Ziel", () => {
    const fehler = [];
    const liste = (DATEN.tickets || []).filter(t => t && t.art !== "mini" && Array.isArray(t.ziele) && t.ziele.length);
    for (const def of liste) fehler.push(...szenePruefen(def, def.id));
    erwarte.wahr(liste.length >= 37, `nur ${liste.length} Tickets`);
    erwarte.gleich(fehler, []);
  });

  pruefe("alle generierten Tickets (Injektor × Vorlage, jede Fertigkeit): eine gültige Szenenzeile je Ziel", () => {
    const fehler = []; let n = 0;
    for (const inj of Object.values(Spiel.INJEKTOREN)) for (const v of inj.vorlagen) {
      let def = null;
      try { def = Spiel.ticketBauen({id: `sz-${inj.name}-${v}`, vorlage: v, vSeed: 101, injektoren: [{name: inj.name, wahl: 1}], stufe: "E"}); } catch (e) { continue; }
      if (!def) continue;
      n++; fehler.push(...szenePruefen(def, `${inj.name}/${v}`));
    }
    for (const s of DATEN.skills.filter(x => x.stufe <= 5 && x.id !== "lab.portsec")) {
      let def = null; try { def = Spiel.generiere(s.id, 42); } catch (e) { continue; }
      n++; fehler.push(...szenePruefen(def, `generiere ${s.id}`));
    }
    erwarte.wahr(n > 60, `nur ${n} generierte Tickets`);
    erwarte.gleich(fehler, []);
  });

  pruefe("Arten passen zum Gerät: Drucker druckt, Internet/HTTP lädt, DHCP zeigt die Adresse, Sperre am sperrenden Gerät", () => {
    const def = DATEN.tickets.find(t => t.id === "salon-01");
    const netz = def.netz(Zufall(1)); Spiel.loesungAnwenden(netz, def.loesung);
    const z = Spiel.szene(netz, {ergebnisse: def.ziele.map(x => Object.assign({ziel: x}, Sim.pruefeZiel(netz, x)))});
    erwarte.gleich(z.map(x => [x.art, x.pfad.join(">")]), [["druckt", "kasse>sw1>drucker"]]);
    const b = DATEN.tickets.find(t => t.id === "buero-01");
    const nb = b.netz(Zufall(1)); Spiel.loesungAnwenden(nb, b.loesung);
    const zb = Spiel.szene(nb, {ergebnisse: b.ziele.map(x => Object.assign({ziel: x}, Sim.pruefeZiel(nb, x)))}).find(x => x.ziel.typ === "dhcp");
    erwarte.wahr(zb && zb.art === "adresse" && /^Adresse \d/.test(zb.text), "DHCP-Zeile mit Adresse: " + (zb && zb.text));
    const p = DATEN.tickets.find(t => t.id === "praxis-04");
    const np = p.netz(Zufall(1)); Spiel.loesungAnwenden(np, p.loesung);
    const zp = Spiel.szene(np, {ergebnisse: p.ziele.map(x => Object.assign({ziel: x}, Sim.pruefeZiel(np, x)))}).filter(x => x.art === "gesperrt");
    erwarte.wahr(zp.length > 0 && zp.every(x => np.geraete[x.ende].typ === "router" || np.geraete[x.ende].typ === "firewall"), "Sperre am Router/an der Firewall");
  });

  pruefe("geänderte Geräte: Kabel, Adresse – unverändertes bleibt draußen", () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      const a = Spiel.instanzErstellen({ticketId: "salon-01", quelle: "postfach"});
      erwarte.gleich(Spiel.geaenderteGeraete(a), [], "frisch: nichts geändert");
      Spiel.loesung(a.netz, Spiel.defVon(a).loesung);
      erwarte.gleich(Spiel.geaenderteGeraete(a).sort(), ["kasse", "sw1"], "Kabel an Kasse und Switch");
      const b = Spiel.instanzErstellen({ticketId: "salon-02", quelle: "postfach"});
      Spiel.loesung(b.netz, Spiel.defVon(b).loesung);
      erwarte.gleich(Spiel.geaenderteGeraete(b), ["kasse"], "Adresse der Kasse");
    } finally { Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken; }
  });
});
