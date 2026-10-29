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
  /* Welle 2 · S4 (Architektur § 17.3): Die Stufen 5 und 6 waren mit 4/3 Tickets zu dünn;
     Ziel ist ≥10/≥8 mit echten Themen (Firewall/Log, DMZ, Port-Security, NAS/Sicherung, STP). */
  /* Welle 3 · S7 (Architektur § 17.5): Zielzahl des 2.1-Plans ist 76 Handtickets. */
  pruefe("genau 76 handgeschriebene Tickets (2.1-Plan §4) – S7-Ausbau in tickets-3-5.js", () => {
    erwarte.gleich(DATEN.tickets.length, 76, "Handticket-Bestand");
    erwarte.gleich(new Set(DATEN.tickets.map(t => t.id)).size, 76, "IDs bleiben eindeutig");
  });
  pruefe("die drei S7-Tickets sind da, spielbar und tragen Lernziel, Quelle und Test", () => {
    const ids = ["storage-09", "storage-10", "storage-11"];
    for (const id of ids) {
      const def = DATEN.tickets.find(t => t.id === id);
      erwarte.wahr(!!def, "S7-Ticket fehlt: " + id);
      erwarte.wahr(String(def.erklaerung || "").length >= 120, id + ": Lernziel/Erklärung zu knapp");
      erwarte.wahr(String(def.quelle || "").length >= 10, id + ": Quelle fehlt");
      erwarte.wahr((def.injektoren || []).length >= 1, id + ": S7-Ticket soll einen echten Fehler auslösen");
    }
    const r = Spiel.testlauf({ids});
    erwarte.gleich(r.filter(x => !x.bestanden).map(x => x.id), [], "S7-Tickets nicht durchspielbar");
  });

  pruefe("Karriere-Stufen 5 und 6 sind ausgebaut: mindestens 10 und 8 Handtickets", () => {
    const stufe = n => DATEN.tickets.filter(t => t.karriere === n).length;
    erwarte.wahr(stufe(5) >= 10, "Stufe 5 hat nur " + stufe(5) + " Tickets (Ziel ≥10)");
    erwarte.wahr(stufe(6) >= 8, "Stufe 6 hat nur " + stufe(6) + " Tickets (Ziel ≥8)");
    erwarte.wahr(stufe(5) + stufe(6) >= 18, "zusammen nur " + (stufe(5) + stufe(6)));
  });
  pruefe("Die S4-Ausbau-Tickets sind echte Themen und spielfähig (voller Weg: Lösung → Abnahme → Abschluss)", () => {
    const ids = ["mittel-05", "mittel-06", "mittel-07", "mittel-08", "mittel-09", "mittel-10",
                 "storage-04", "storage-05", "storage-06", "storage-07", "storage-08"];
    erwarte.gleich(ids.filter(id => !DATEN.tickets.some(t => t.id === id)), [], "S4-Ticket fehlt");
    const r = Spiel.testlauf({ids});
    const kaputt = r.filter(x => !x.bestanden).map(x => x.id + ": " + (x.fehler || []).join(" | "));
    if (kaputt.length) console.log(kaputt.join(String.fromCharCode(10)));
    erwarte.gleich(kaputt, [], "S4-Tickets nicht durchspielbar");
  });

  pruefe("jede Fertigkeit der Stufen 1–5 kommt in einem handgeschriebenen Ticket vor – ohne Ausnahme", () => {
    const da = new Set(DATEN.tickets.flatMap(t => t.skills || []));
    erwarte.gleich(DATEN.skills.filter(s => s.stufe <= 5 && !da.has(s.id)).map(s => s.id), []);
  });
  pruefe("die vier Tickets der neuen Fertigkeiten (S6) sind da und tragen Arbeitsziele", () => {
    /* Architektur § 17.1: IPv6/Betrieb/WLAN werden ohne Simulation geübt – über Handtickets mit
       Arbeitsziel (notiz/tabelle/befehl/antwort), kein Injektor. tickets-3-0.js. */
    const ids = ["ipv6-01", "betrieb-01", "wlan-01", "wlan-02"];
    for (const id of ids) {
      const def = DATEN.tickets.find(t => t.id === id);
      erwarte.wahr(!!def, "S6-Ticket fehlt: " + id);
      erwarte.wahr((def.injektoren || []).length === 0, id + ": S6-Ticket darf keinen Injektor tragen");
      erwarte.wahr((def.ziele || []).some(Spiel.istArbeitsziel), id + ": kein Arbeitsziel");
    }
    const r = Spiel.testlauf({ids});
    erwarte.gleich(r.filter(x => !x.bestanden).map(x => x.id), [], "S6-Tickets nicht durchspielbar");
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
