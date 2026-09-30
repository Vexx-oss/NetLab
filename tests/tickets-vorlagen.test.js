"use strict";
gruppe("Vorlagen", () => {
  for (const [name, v] of Object.entries(Spiel.vorlagen)) {
    pruefe(`${name}: 20 Seeds – gesund, alle Ziele erfüllt, Layout im Rahmen`, () => {
      const fehler = [];
      for (let seed = 1; seed <= 20; seed++) {
        const r = v.bauen(Zufall(seed * 7919), {});
        for (const ziel of r.ziele) {
          const e = Sim.pruefeZiel(r.netz, ziel);
          if (!e.ok) fehler.push(`seed ${seed}: ${ziel.text} → ${e.grund}: ${e.text}`);
        }
        for (const g of Object.values(r.netz.geraete)) if (g.x < 0 || g.x > 920 || g.y < 0 || g.y > 580) fehler.push(`seed ${seed}: ${g.id} außerhalb (${g.x},${g.y})`);
        if (Modell.pruefen(r.netz).length) fehler.push(`seed ${seed}: Warnungen ${Modell.pruefen(r.netz).map(w => w.text).join(" | ")}`);
        for (const g of Object.values(r.netz.geraete)) if (Modell.IOS[g.typ] && Modell.ungespeichert(g)) fehler.push(`seed ${seed}: ${g.id} ungespeichert`);
      }
      erwarte.gleich(fehler.slice(0, 5), []);
    });
  }
  pruefe("Deterministisch: gleicher Seed → gleiches Netz", () => {
    for (const v of Object.values(Spiel.vorlagen)) erwarte.gleich(JSON.stringify(v.bauen(Zufall(5), {}).netz), JSON.stringify(v.bauen(Zufall(5), {}).netz), v.name);
  });
});
