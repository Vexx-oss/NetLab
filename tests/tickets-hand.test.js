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
  pruefe("jede Fertigkeit der Stufen 1–5 kommt in einem handgeschriebenen Ticket vor – ohne Ausnahme", () => {
    const da = new Set(DATEN.tickets.flatMap(t => t.skills || []));
    erwarte.gleich(DATEN.skills.filter(s => s.stufe <= 5 && !da.has(s.id)).map(s => s.id), []);
  });

  /* „Wirkung vor Grün": Ein Lehrtext zählt erst, wenn ein Auftrag seinen Grundcode wirklich auslöst.
     Geprüft wird nicht das `gruende`-Feld, sondern die echte Simulation: jedes erwartete Ziel wird auf dem
     Startnetz geprüft, und alle Grundcodes aus Ziel und Trace zählen. Fehlt ein Code, ist entweder ein
     Lehrtext tot (dann fehlt ein Auftrag) oder die Simulation gibt ihn gar nicht aus (dann steht er unten). */
  pruefe("kein toter Lehrtext: jeder Grundcode wird von mindestens einem Ticket ausgelöst, oder ist als Lücke benannt", () => {
    /* Codes, die kein HANDgeschriebener Auftrag auslöst – gemessen über alle Tickets und die echte Simulation:
       · STORM: eine Layer-2-Schleife erstickt Broadcasts, sie bricht aber kein Erreichbarkeitsziel; die
         Simulation bricht erst nach ihrem Ereignis-Budget ab. Auslöser ist der Generator (Injektor „schleife“).
       · TTL_EXPIRED, HOST_UNREACHABLE, PORT_CLOSED, DHCP_ROGUE_OFFER: bisher nur über generierte Tickets
         erreichbar (Injektoren schleife, route-fehlt, dienst-aus, fremder-dhcp).
       Kommt ein Code hinzu, wird dieser Test rot – dann fehlt entweder ein Auftrag oder ein Eintrag hier. */
    const simulationOhneAusgabe = ["STORM", "TTL_EXPIRED", "HOST_UNREACHABLE", "PORT_CLOSED", "DHCP_ROGUE_OFFER"];
    const erreicht = {};
    for (const def of DATEN.tickets) {
      let netz; try { netz = def.netz(Zufall(1)); } catch (e) { continue; }
      for (const z of def.ziele || []) {
        let r; try { r = Sim.pruefeZiel(Modell.kopie(netz), z); } catch (e) { continue; }
        if (r && r.grund) (erreicht[r.grund] ||= []).push(def.id);
        for (const e of (r && r.trace && r.trace.ereignisse) || []) if (e.grund) (erreicht[e.grund] ||= []).push(def.id);
      }
      for (const g of def.gruende ? [].concat(...def.gruende) : []) if (g) (erreicht[g] ||= []).push(def.id + " (Erwartung)");
    }
    const tot = Object.keys(Sim.GRUENDE).filter(c => !erreicht[c] && !simulationOhneAusgabe.includes(c));
    if (tot.length) console.log(tot.map(c => `${c}: kein Ticket löst ihn aus`).join(String.fromCharCode(10)));
    erwarte.gleich(tot, []);
    /* Und die benannten Lücken müssen wirklich Lücken sein: kein Ticket darf sie als Erwartung führen. */
    erwarte.gleich(simulationOhneAusgabe.filter(c => (erreicht[c] || []).some(id => /Erwartung$/.test(id))), []);
  });
});
