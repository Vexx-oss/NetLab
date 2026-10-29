"use strict";
/* ---------- Injektoren-Matrix (2.1 S7, Architektur § 17.5) ----------
   Zwei Zusicherungen:
     (a) Jede SIMULIERBARE Fertigkeit hat mindestens drei Injektor-Zuordnungen. IPv6 und WLAN werden
         inhaltlich geübt, nicht paketweise simuliert – für sie gibt es bewusst keinen Injektor (§17.1);
         die Ausnahmen sind namentlich geführt und dürfen keine Zuordnung haben.
     (b) Jeder der zehn neuen S7-Injektoren bricht das Startnetz wirklich (mit einem Grund aus seiner
         gruende-Liste) und seine Lösung heilt jedes Netz-Ziel. Gemessen wird über den echten Weg
         (Spiel.ticketBauen → Sim.pruefeZiel → Spiel.loesungAnwenden), nicht über die Beschreibung.
   Kein neuer Sim-Grund, keine Änderung an src/sim/ – alle Gründe stehen in Sim.GRUENDE. */
gruppe("Injektoren: Matrix S7", () => {
  const AUSNAHME = { "lab.ipv6": "§17.1: kein Paket-Sim-Modell", "lab.wlan": "§17.1: kein Funk-Modell" };
  const zuordnung = () => {
    const z = {};
    for (const inj of Object.values(Spiel.INJEKTOREN || {})) for (const s of inj.skills || []) z[s] = (z[s] || 0) + 1;
    return z;
  };

  pruefe("S7: jede simulierbare Fertigkeit hat >=3 Injektor-Zuordnungen (ipv6/wlan namentliche Ausnahme)", () => {
    const z = zuordnung();
    const zuWenig = DATEN.skills.map(s => s.id).filter(id => !AUSNAHME[id] && (z[id] || 0) < 3).map(id => id + " (" + (z[id] || 0) + ")");
    erwarte.gleich(zuWenig, [], "Fertigkeiten mit weniger als drei Injektor-Zuordnungen");
    for (const id of Object.keys(AUSNAHME)) erwarte.gleich(z[id] || 0, 0, id + " ist namentliche Ausnahme und hat keinen Injektor");
    erwarte.gleich(Object.keys(Spiel.INJEKTOREN).length, 55, "55 Injektoren (45 + 10 aus S7)");
  });

  /* Die zehn neuen Fälle mit dem GEMESSENEN Grund (Messskript analysis/NetLab/drafts/s7/messung.js). */
  const NEU = [
    {name: "subif-aus", vorlagen: ["praxis"], grund: "PORT_SHUTDOWN"},
    {name: "datei-dienst-aus", vorlagen: ["buero", "praxis"], grund: "SERVICE_OFF"},
    {name: "dhcp-gateway-falsch", vorlagen: ["buero"], grund: "GW_WRONG_SUBNET"},
    {name: "fw-zone-falsch", vorlagen: ["dmz"], grund: "FW_DENY"},
    {name: "nat-acl-zu-klein", vorlagen: ["lan", "buero", "praxis"], grund: "NAT_MISSING"},
    {name: "portsec-max-falsch", vorlagen: ["lan", "praxis", "standorte"], grund: "PORTSEC_VIOLATION"},
    {name: "route-kreis-ttl", vorlagen: ["standorte"], grund: "ARP_NO_REPLY"},
    {name: "helper-falsch", vorlagen: ["buero"], grund: "DHCP_NO_OFFER"},
    {name: "nas-rechte-falsch", vorlagen: ["standorte"], grund: "SERVICE_OFF"},
    {name: "stp-rootfalsch", vorlagen: ["standorte"], grund: "STORM"},
  ];

  for (const f of NEU) {
    pruefe("S7-Injektor " + f.name + ": bricht wirklich (" + f.grund + ") und die Lösung heilt", () => {
      const inj = Spiel.INJEKTOREN[f.name];
      erwarte.wahr(!!inj, f.name + " ist nicht angemeldet");
      erwarte.wahr((inj.gruende || []).includes(f.grund), f.name + ": " + f.grund + " steht nicht in gruende");
      let gebaut = 0;
      for (const vorlage of f.vorlagen) for (const seed of [1, 2, 3]) {
        const wo = f.name + "/" + vorlage + "/Seed " + seed;
        const def = Spiel.ticketBauen({id: "matrix-" + f.name + "-" + vorlage + "-" + seed, vorlage,
          vSeed: seed * 101, injektoren: [{name: f.name, wahl: seed}], stufe: "E"});
        erwarte.wahr(!!def, wo + ": kein Ticket gebaut");
        if (!def) continue;
        const erwartet = def.ziele.filter(z => z.erwartet);
        erwarte.wahr(erwartet.length >= 1, wo + ": kein gebrochenes Ziel");
        if (erwartet.length) {
          const start = def.netz(Zufall(1));
          const r = Sim.pruefeZiel(start, erwartet[0]);
          erwarte.falsch(r.ok, wo + ": Startnetz bricht das erste Ziel nicht");
          erwarte.gleich(r.grund, f.grund, wo + ": gemessener Grund");
        }
        const heil = def.netz(Zufall(1));
        Spiel.loesungAnwenden(heil, def.loesung);
        const offen = def.ziele.filter(z => !Spiel.istArbeitsziel(z)).filter(z => { try { return !Sim.pruefeZiel(heil, z).ok; } catch (e) { return true; } }).map(z => z.text);
        erwarte.gleich(offen, [], wo + ": Lösung heilt nicht");
        gebaut++;
      }
      erwarte.gleich(gebaut, f.vorlagen.length * 3, f.name + ": geprüfte Fälle");
    });
  }
});
