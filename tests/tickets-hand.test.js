"use strict";
/* Handgeschriebene Tickets: Pflichtfelder, Fehler bricht mit erwartetem Grund, Lösung heilt alles (ticketPruefen aus tickets-generator.test.js) */
gruppe("Tickets", () => {
  pruefe("mindestens 30 handgeschriebene Tickets, eindeutige IDs, keine Entwürfe", () => {
    const ids = DATEN.tickets.map(t => t.id);
    erwarte.wahr(ids.length >= 30, `nur ${ids.length}`);
    erwarte.gleich(ids.length, new Set(ids).size, "doppelte IDs");
    erwarte.gleich(DATEN.tickets.filter(t => t.entwurf).map(t => t.id), []);
  });
  pruefe("jedes Ticket: gültig, Fehler wirkt, Lösung heilt (inkl. Projekte per Konsole)", () => {
    const fehler = [];
    for (const def of DATEN.tickets) {
      const gruende = def.gruende && def.gruende.length ? def.gruende.flat() : null;
      for (const f of ticketPruefen(def, gruende)) fehler.push(`${def.id}: ${f}`);
    }
    if (fehler.length) console.log(fehler.join(String.fromCharCode(10)));
    erwarte.gleich(fehler.length, 0);
  });
  pruefe("Einstiegsreihe salon-01 … salon-06 in fester Reihenfolge, salon-01 in 60 Sekunden lösbar (ein Schritt)", () => {
    const reihe = Spiel.ticketReihe().map(t => t.id);
    erwarte.gleich(reihe.slice(0, 6), ["salon-01", "salon-02", "salon-03", "salon-04", "salon-05", "salon-06"]);
    const s1 = DATEN.tickets.find(t => t.id === "salon-01");
    erwarte.gleich(s1.loesung.length, 1); erwarte.gleich(s1.ziele.length, 1);
  });
  pruefe("jede Fertigkeit der Stufen 1–5 kommt in einem handgeschriebenen Ticket vor (außer Port-Security)", () => {
    const da = new Set(DATEN.tickets.flatMap(t => t.skills || []));
    erwarte.gleich(DATEN.skills.filter(s => s.stufe <= 5 && !da.has(s.id) && s.id !== "lab.portsec").map(s => s.id), []);
  });
});
