"use strict";
/* ---------- Injektoren-Matrix (2.1 S7 · WIS-04, Architektur § 17.5) ----------
   Zusicherungen:
     (a) Jede SIMULIERBARE Fertigkeit hat mindestens drei Injektor-Zuordnungen. IPv6 und WLAN werden
         inhaltlich geübt, nicht paketweise simuliert – für sie gibt es bewusst keinen Injektor (§17.1);
         die Ausnahmen sind namentlich geführt und dürfen keine Zuordnung haben.
         lab.stp ist eine dritte, BENANNTE Ausnahme: Das Modell kennt kein Spanning Tree
         (src/sim/switch.js:5); ehrlich sind nur zwei Fälle – die Doppelverkabelung mit echtem
         Broadcast-Sturm (stp-doppelkabel) und der BPDU-Guard-Endzustand als „nicht nachgebaut“
         markierter Portabschaltung. Die beiden früher zusätzlich gelisteten L3-Routing-Schleifen
         (schleife, route-kreis-ttl) sind KEINE STP-Fälle und zählen deshalb nicht mehr.
     (b) Kein Injektor ist ein Duplikat eines anderen: Die Wirkung wird gemessen, nicht beschrieben.
         Fingerabdruck = Diff zwischen gesundem und gebautem Netz (Spiel.plan.diff) über Vorlage und
         Seed. Zwei Namen mit demselben Abdruck sind derselbe Fehler – das war der Befund an
         stp-doppelkabel/stp-rootfalsch (WIS-04, beides Doppelverkabelung) und ist jetzt rot.
     (c) Die zehn S7-Injektoren brechen das Startnetz wirklich (Grund aus ihrer gruende-Liste) und ihre
         Lösung heilt jedes Netz-Ziel. Gemessen über den echten Weg
         (Spiel.ticketBauen → Sim.pruefeZiel → Spiel.loesungAnwenden), nicht über die Beschreibung.
   Kein neuer Sim-Grund, keine Änderung an src/sim/ – alle Gründe stehen in Sim.GRUENDE. */
gruppe("Injektoren: Matrix S7", () => {
  /* Zwei namentliche Ausnahmen ohne jeden Injektor (§ 17.1: kein Paket-/Funk-Modell). */
  const AUSNAHME_KEIN = { "lab.ipv6": "§17.1: kein Paket-Sim-Modell", "lab.wlan": "§17.1: kein Funk-Modell" };
  /* Eine benannte Ausnahme von der Drei-Zuordnungen-Regel: ehrlich sind nur zwei L2-Fälle. */
  const AUSNAHME_DRITTE = {
    "lab.stp": "Modell kennt kein STP (src/sim/switch.js:5) – ehrlich sind nur die Doppelverkabelung (STORM) und der als „nicht nachgebaut“ markierte BPDU-Guard-Fall; L3-Routing-Schleifen zählen nicht als STP.",
  };
  const zuordnung = () => {
    const z = {};
    for (const inj of Object.values(Spiel.INJEKTOREN || {})) for (const s of inj.skills || []) z[s] = (z[s] || 0) + 1;
    return z;
  };

  pruefe("S7: jede simulierbare Fertigkeit hat >=3 Injektor-Zuordnungen (ipv6/wlan ohne, lab.stp benannt)", () => {
    const z = zuordnung();
    const zuWenig = DATEN.skills.map(s => s.id)
      .filter(id => !AUSNAHME_KEIN[id] && !AUSNAHME_DRITTE[id] && (z[id] || 0) < 3)
      .map(id => id + " (" + (z[id] || 0) + ")");
    erwarte.gleich(zuWenig, [], "Fertigkeiten mit weniger als drei Injektor-Zuordnungen");
    for (const id of Object.keys(AUSNAHME_KEIN)) erwarte.gleich(z[id] || 0, 0, id + " ist namentliche Ausnahme und hat keinen Injektor");
    erwarte.wahr(Object.values(AUSNAHME_DRITTE).every(g => String(g).trim().length > 20), "Ausnahme lab.stp ist begründet");
    erwarte.gleich(Object.keys(Spiel.INJEKTOREN).length, 55, "55 Injektoren (45 + 10 aus S7; WIS-04 ersetzt, zählt nicht neu)");
  });

  pruefe("S7/WIS-04: lab.stp hat genau zwei ehrliche L2-Fälle und keine falsch zugeordneten L3-Schleifen", () => {
    const stp = Object.values(Spiel.INJEKTOREN).filter(i => (i.skills || []).includes("lab.stp")).map(i => i.name).sort();
    erwarte.gleich(stp, ["stp-doppelkabel", "stp-rootfalsch"], "lab.stp-Injektoren");
    const erklaerung = String((Spiel.INJEKTOREN["stp-rootfalsch"] || {}).erklaerung || "");
    erwarte.passt(erklaerung, /BPDU Guard/i, "stp-rootfalsch erklärt den BPDU-Guard-Fall");
    erwarte.passt(erklaerung, /nicht nachgebaut/i, "und markiert ihn ausdrücklich als im Modell nicht nachgebaut");
    for (const l3 of ["schleife", "route-kreis-ttl"]) {
      const inj = Spiel.INJEKTOREN[l3] || {};
      erwarte.falsch((inj.skills || []).includes("lab.stp"), l3 + " ist eine Routing-Schleife und nennt lab.stp nicht mehr");
    }
  });

  /* (b) Duplikat-Probe: Wirkung als Diff gesund → kaputt, über Vorlage und Seed. */
  const wirkung = () => {
    const abdruecke = new Map();
    for (const inj of Object.values(Spiel.INJEKTOREN)) {
      const sigs = [];
      for (const vorlage of inj.vorlagen || []) {
        for (const seed of [1, 2]) {
          let def = null;
          try {
            def = Spiel.ticketBauen({id: "matrix-wirkung-" + inj.name + "-" + vorlage + "-" + seed, vorlage,
              vSeed: seed * 101, injektoren: [{name: inj.name, wahl: seed}], stufe: "E"});
          } catch (e) { continue; }
          if (!def || !(def.injektoren || []).includes(inj.name)) continue;
          const gesund = Spiel.vorlagen[vorlage].bauen(Zufall(seed * 101), {}).netz;
          const kaputt = def.netz(Zufall(1));
          sigs.push(JSON.stringify(Spiel.plan.diff(gesund, kaputt)));
        }
      }
      if (sigs.length) abdruecke.set(inj.name, JSON.stringify(sigs.slice().sort()));
    }
    return abdruecke;
  };

  pruefe("WIS-04: kein Injektor ist ein Duplikat eines anderen (Wirkungs-Fingerabdruck)", () => {
    const abdruecke = wirkung();
    erwarte.wahr(abdruecke.size >= 50, "genug Injektoren gemessen: " + abdruecke.size);
    const gruppen = new Map();
    for (const [name, sig] of abdruecke) {
      if (!gruppen.has(sig)) gruppen.set(sig, []);
      gruppen.get(sig).push(name);
    }
    const doppelt = [...gruppen.values()].filter(g => g.length > 1).map(g => g.sort()).sort();
    if (doppelt.length) console.log("Injektoren-Matrix · gleiche Wirkung: " + JSON.stringify(doppelt));
    erwarte.gleich(doppelt, [], "Injektor-Paare mit identischer Wirkung");
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
    /* WIS-04: stp-rootfalsch war die zweite Doppelverkabelung. Er ist jetzt der ehrliche
       BPDU-Guard-Endzustand: Das Modell schaltet den Port ab (PORT_SHUTDOWN), die Erklärung
       sagt ausdrücklich, dass STP/BPDU Guard nicht nachgebaut sind. */
    {name: "stp-rootfalsch", vorlagen: ["standorte"], grund: "PORT_SHUTDOWN"},
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
