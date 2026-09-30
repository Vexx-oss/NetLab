"use strict";
/* Durchspiel-Lauf (Konzept § 10.5), headless: jedes handgeschriebene Ticket über den echten Ticketfluss
   (Instanz → öffnen → Lösung → Abnahme mit Neustart-Test → abschließen) in einem Wegwerf-Spielstand. */
gruppe("Durchspiel", () => {
  pruefe("alle handgeschriebenen Tickets bestehen die Abnahme mit der hinterlegten Lösung (AP2 inkl. Neustart-Test)", () => {
    const r = Spiel.testlauf({niveau: "AP2"});
    const schlecht = r.filter(x => !x.bestanden);
    if (schlecht.length) console.log(schlecht.map(x => `${x.id}: ${JSON.stringify(x.fehler).slice(0, 300)}`).join(String.fromCharCode(10)));
    erwarte.gleich(schlecht.map(x => x.id), []);
    erwarte.wahr(r.length >= 30, `nur ${r.length} durchgespielt`);
  });
  pruefe("Start-Netz ohne Lösung besteht die Abnahme nicht", () => {
    const def = DATEN.tickets.find(t => t.id === "salon-02");
    const netz = def.netz(Zufall(1));
    const ok = def.ziele.every(z => Sim.pruefeZiel(netz, z).ok);
    erwarte.falsch(ok);
  });
  pruefe("Neustart ist keine Lösung: Fehler stehen auch in der startup-config", () => {
    const schlecht = [];
    for (const def of DATEN.tickets) {
      const n = def.netz(Zufall(1));
      for (const g of Object.values(n.geraete)) if (Modell.IOS[g.typ]) Modell.neustart(n, g.id);
      if (def.ziele.filter(z => z.erwartet).every(z => Sim.pruefeZiel(n, z).ok)) schlecht.push(def.id);
    }
    erwarte.gleich(schlecht, []);
  });
  pruefe("AP2: Lösung ohne Speichern fällt beim Neustart-Test durch", () => {
    const r = Spiel.testlauf({ids: ["salon-05", "praxis-03", "autohaus-01"], niveau: "AP2"});
    erwarte.gleich(r.map(x => x.bestanden), [true, true, true], "mit Speichern");
    const alt = {};
    for (const id of ["salon-05", "praxis-03", "autohaus-01"]) { const d = DATEN.tickets.find(t => t.id === id); alt[id] = d.loesung; Object.defineProperty(d, "loesung", {value: alt[id].filter(x => x.aktion !== "speichern"), configurable: true, enumerable: true}); }
    const r2 = Spiel.testlauf({ids: ["salon-05", "praxis-03", "autohaus-01"], niveau: "AP2"});
    for (const id of Object.keys(alt)) Object.defineProperty(DATEN.tickets.find(t => t.id === id), "loesung", {value: alt[id], configurable: true, enumerable: true});
    erwarte.gleich(r2.map(x => x.bestanden), [false, false, false], "ohne Speichern");
  });
});
