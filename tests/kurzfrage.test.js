"use strict";
/* KURZFRAGE MIT ECHTEM KONTEXT (Runde 6, Strang W1; Entwurf „Kurzübung mit Kontext" § 2, § 3, § 5)
   Headless: Spiel.kurzfrage.fuer(inst, {niveau}) muss zu echten Netzen eine lösbare Frage mit Lage
   liefern. Geprüft wird, was der Vertrag verlangt: Form, 2–4 Lage-Zeilen, genau eine richtige von drei
   Optionen, die richtige Option gegen IP/Modell/inst.netz NACHGERECHNET, Determinismus, Niveau-Grenzen
   (E nur netz/zustand, AP1 +maske/gateway, AP2 +portmodus), null ohne verwertbares Netz und kein
   verräterischer Lösungstext (Injektor-Titel, Grund-Codes).
   Die Instanzen entstehen wie in tests/spiel-akte.test.js über Spiel.instanzErstellen mit festem Seed –
   kein Zufall aus der Uhr, damit die Fragen reproduzierbar sind. */
gruppe("Spiel: Kurzfrage mit Kontext", () => {
  const kapsel = fn => () => {
    const alt = {st: Spiel._st, einst: Spiel._einst, lz: Spiel._lz, trocken: Spiel._trocken};
    try {
      Spiel._trocken = true; Spiel._lz = {};
      Spiel._st = Spiel.leererStand(); Spiel._st.stufe = 99;
      Spiel._einst = Object.assign({}, Spiel.EINST_STANDARD);
      fn();
    } finally { Spiel._st = alt.st; Spiel._einst = alt.einst; Spiel._lz = alt.lz; Spiel._trocken = alt.trocken; }
  };
  const instanz = (id, niveau = "E", seed = 42) => {
    Spiel._einst.wahl = niveau;
    return Spiel.instanzErstellen({ticketId: id, seed, quelle: "postfach"});
  };
  const KURZ = Spiel.kurzfrage;
  const VORLAGEN = ["netz", "maske", "gateway", "portmodus", "zustand"];
  const TICKETS = ["salon-01", "salon-02", "salon-03", "salon-04", "salon-05", "baeckerei-01", "buero-01", "praxis-04"];
  const sammle = (tickets, niveau) => tickets.map(id => {
    const inst = instanz(id, niveau);
    return {id, inst, q: KURZ.fuer(inst, {niveau})};
  });
  const zahl = t => Number(String(t).replace(/[^0-9]/g, "")) || 0;

  pruefe("Kurzfrage: jedes Beispiel-Ticket liefert ein vollständiges Frageobjekt nach Vertrag § 2", kapsel(() => {
    for (const niveau of ["E", "AP1", "AP2"]) {
      for (const {id, inst, q} of sammle(TICKETS, niveau)) {
        erwarte.wahr(q && typeof q === "object", id + "/" + niveau + ": keine Frage");
        erwarte.wahr(VORLAGEN.includes(q.id), id + "/" + niveau + ": unbekannte Art " + q.id);
        erwarte.wahr(typeof q.titel === "string" && q.titel.length > 0, id + "/" + niveau + ": Titel fehlt");
        erwarte.wahr(typeof q.frage === "string" && q.frage.length > 0, id + "/" + niveau + ": Frage fehlt");
        erwarte.wahr(typeof q.erklaerung === "string" && q.erklaerung.length > 0, id + "/" + niveau + ": Erklärung fehlt");
        erwarte.wahr(Array.isArray(q.lage) && q.lage.length >= 2 && q.lage.length <= 4,
          id + "/" + niveau + ": Lage nicht 2–4 Zeilen – " + JSON.stringify(q.lage));
        for (const z of q.lage) {
          erwarte.wahr(typeof z.label === "string" && z.label.length > 0 && typeof z.wert === "string" && z.wert.length > 0,
            id + "/" + niveau + ": leere Lage-Zeile – " + JSON.stringify(z));
        }
        erwarte.wahr(Array.isArray(q.optionen) && q.optionen.length === 3, id + "/" + niveau + ": nicht drei Optionen");
        erwarte.gleich(q.optionen.filter(o => o && o.richtig === true).length, 1, id + "/" + niveau + ": nicht genau eine richtige Option");
        erwarte.gleich(new Set(q.optionen.map(o => o.text)).size, 3, id + "/" + niveau + ": doppelte Optionen");
        erwarte.wahr(q.optionen.every(o => typeof o.text === "string" && o.text.length > 0), id + "/" + niveau + ": leere Option");
        /* ort zeigt auf echte Daten des Netzes (art geraet oder port). */
        if (q.ort) {
          const g = inst.netz.geraete[q.ort.geraet];
          erwarte.wahr(!!g, id + "/" + niveau + ": ort-Gerät fehlt im Netz");
          erwarte.wahr(q.ort.art === "geraet" || q.ort.art === "port", id + "/" + niveau + ": unbekannte ort-Art");
          if (q.ort.art === "port") {
            erwarte.gleich(typeof q.ort.port, "string", id + "/" + niveau + ": Port fehlt im ort");
            const cfg = (g.running.ports && g.running.ports[q.ort.port]) || (g.running.if && g.running.if[q.ort.port]);
            erwarte.wahr(!!cfg, id + "/" + niveau + ": Port " + q.ort.port + " gibt es an " + q.ort.geraet + " nicht");
          }
        }
      }
    }
  }));

  pruefe("Kurzfrage: netz, maske und gateway sind gegen IP/inst.netz nachgerechnet", kapsel(() => {
    const fragen = [];
    for (const niveau of ["AP1", "AP2"]) for (const {id, inst, q} of sammle(TICKETS, niveau)) if (q) fragen.push({id, niveau, q});
    const arten = x => fragen.filter(f => f.q.id === x);
    erwarte.wahr(arten("netz").length > 0 && arten("maske").length > 0 && arten("gateway").length > 0,
      "nicht alle drei Arten kamen vor: " + JSON.stringify([...new Set(fragen.map(f => f.q.id))]));

    for (const {id, niveau, q} of arten("netz")) {
      const [a, b] = q.lage.map(z => ({ip: (z.wert.match(/^([0-9.]+) /) || [])[1], maske: (z.wert.match(/\/ ([0-9.]+)$/) || [])[1]}));
      erwarte.wahr(a.ip && a.maske && b.ip && b.maske, id + "/" + niveau + ": Lage nicht lesbar – " + JSON.stringify(q.lage));
      const gleich = IP.gleichesNetz(a.ip, b.ip, a.maske);
      const richtig = q.optionen.find(o => o.richtig).text;
      if (gleich) {
        erwarte.passt(richtig, /^Nein – beide liegen in /, id + "/" + niveau + ": gleiches Netz nicht als Nein beantwortet");
        erwarte.enthaelt(richtig, IP.cidr(a.ip, a.maske), id + "/" + niveau + ": falsche Netzadresse in der richtigen Option");
      } else {
        erwarte.passt(richtig, /^Ja – /, id + "/" + niveau + ": fremdes Netz nicht als Ja beantwortet");
        erwarte.enthaelt(richtig, IP.cidr(b.ip, b.maske), id + "/" + niveau + ": Netz von B fehlt in der richtigen Option");
      }
    }
    for (const {id, niveau, q} of arten("maske")) {
      const ip = ((q.lage[0] || {}).wert || "").replace(/^Adresse /, "");
      const zeile = (q.lage[1] || {}).wert || "";
      const m = zeile.match(/^([0-9.]+)/);
      const praefix = Number((zeile.match(/\/(\d+)/) || [])[1]);
      erwarte.wahr(IP.gueltig(ip) && m && IP.maskeGueltig(m[1]) && praefix > 0,
        id + "/" + niveau + ": Adresse/Maske nicht lesbar – " + JSON.stringify(q.lage));
      erwarte.gleich(q.optionen.find(o => o.richtig).text, IP.netz(ip, m[1]), id + "/" + niveau + ": richtige Netzadresse falsch");
      erwarte.gleich(IP.praefix(m[1]), praefix, id + "/" + niveau + ": Präfix in der Lage falsch");
      erwarte.enthaelt(q.frage, "/" + praefix + "?", id + "/" + niveau + ": Präfix fehlt in der Frage");
    }
    for (const {id, niveau, q} of arten("gateway")) {
      const ip = ((q.lage[0] || {}).wert || "").replace(/^Adresse /, "");
      const m = ((q.lage[1] || {}).wert || "").match(/^([0-9.]+)/);
      const gw = (q.lage.find(z => z.label === "Standardgateway") || {}).wert;
      erwarte.wahr(IP.gueltig(ip) && m && IP.maskeGueltig(m[1]) && IP.gueltig(gw), id + "/" + niveau + ": Gateway-Lage nicht lesbar");
      erwarte.wahr(IP.gleichesNetz(ip, gw, m[1]), id + "/" + niveau + ": Gateway liegt gar nicht im Netz");
      const richtig = q.optionen.find(o => o.richtig).text;
      erwarte.passt(richtig, /^Ja – /, id + "/" + niveau + ": Gateway im Netz nicht als Ja beantwortet");
      erwarte.enthaelt(richtig, gw, id + "/" + niveau + ": Gateway-Adresse fehlt in der richtigen Option");
    }
  }));

  pruefe("Kurzfrage: portmodus rechnet Modus/VLAN aus g.running.ports nach", kapsel(() => {
    const fragen = [];
    for (const niveau of ["AP2"]) for (const {id, inst, q} of sammle(TICKETS, niveau)) if (q && q.id === "portmodus") fragen.push({id, inst, q});
    erwarte.wahr(fragen.length >= 3, "zu wenige portmodus-Fragen im Beispiel: " + fragen.length);
    for (const {id, inst, q} of fragen) {
      const swName = q.lage[0].label;
      const sw = Object.values(inst.netz.geraete).find(g => g.name === swName && g.typ === "switch");
      erwarte.wahr(!!sw, id + ": Switch " + swName + " nicht im Netz");
      const port = (q.lage[0].wert.match(/^Port (\S+) · Modus (access|trunk)$/) || []);
      erwarte.wahr(port.length === 3, id + ": Port/Modus nicht lesbar – " + q.lage[0].wert);
      const cfg = sw.running.ports[port[1]];
      erwarte.wahr(!!cfg, id + ": Port " + port[1] + " fehlt im Switch");
      erwarte.gleich(cfg.modus, port[2], id + ": Modus in der Lage ist falsch");
      const frageVlan = zahl((q.frage.match(/VLAN (\d+)/) || [])[1]);
      erwarte.wahr(frageVlan > 0, id + ": kein VLAN in der Frage");
      const richtig = q.optionen.find(o => o.richtig).text;
      if (cfg.modus === "trunk") {
        const erlaubt = cfg.trunkErlaubt === "all" || (Array.isArray(cfg.trunkErlaubt) && cfg.trunkErlaubt.map(Number).includes(frageVlan));
        erwarte.gleich(/^Ja/.test(richtig), erlaubt, id + ": Trunk-Antwort passt nicht zu trunkErlaubt");
        erwarte.enthaelt(q.lage.map(z => z.wert).join(" | "), String(cfg.nativeVlan || 1), id + ": Native VLAN fehlt in der Lage");
      } else {
        const portVlan = Number(cfg.accessVlan || 1);
        erwarte.gleich(/^Ja/.test(richtig), frageVlan === portVlan, id + ": Access-Antwort passt nicht zum Port-VLAN");
        erwarte.enthaelt(q.lage.map(z => z.wert).join(" | "), "VLAN " + portVlan, id + ": Port-VLAN fehlt in der Lage");
      }
    }
  }));

  pruefe("Kurzfrage: zustand folgt aus Gerät-an/Kabel/Port-shutdown, nie aus einer Behauptung", kapsel(() => {
    const fragen = [];
    for (const niveau of ["E", "AP1", "AP2"]) for (const {id, inst, q} of sammle(TICKETS, niveau)) if (q && q.id === "zustand") fragen.push({id, inst, q});
    erwarte.wahr(fragen.length >= 3, "zu wenige zustand-Fragen im Beispiel: " + fragen.length);
    const gesehen = new Set();
    for (const {id, q} of fragen) {
      const lage = q.lage.map(z => z.wert).join(" | ");
      const richtig = q.optionen.find(o => o.richtig).text;
      if (lage.includes("Gerät: ausgeschaltet")) {
        erwarte.passt(richtig, /^Kein Link – ein ausgeschaltetes Gerät/, id + ": ausgeschaltetes Gerät nicht als Kein Link beantwortet");
        gesehen.add("aus");
      } else if (lage.includes("administratively down")) {
        erwarte.passt(richtig, /^Kein Link – der Port ist abgeschaltet/, id + ": shutdown-Port nicht als Kein Link beantwortet");
        gesehen.add("shutdown");
      } else if (lage.includes("kein shutdown · Kabel gesteckt")) {
        erwarte.passt(richtig, /^Link oben – /, id + ": gesunder Anschluss nicht als Link oben beantwortet");
        gesehen.add("oben");
      } else {
        erwarte.wahr(false, id + ": Zustand nicht erkannt – " + lage);
      }
    }
    erwarte.wahr(gesehen.size >= 1, "kein Zustandsfall erkannt");
  }));

  pruefe("Kurzfrage: deterministisch und ohne Seiteneffekt auf das Netz", kapsel(() => {
    for (const id of ["salon-01", "salon-03", "baeckerei-01", "praxis-04"]) {
      const inst = instanz(id, "AP2");
      const netzVorher = JSON.stringify(inst.netz);
      const a = JSON.stringify(KURZ.fuer(inst, {niveau: "AP2"}));
      const b = JSON.stringify(KURZ.fuer(inst, {niveau: "AP2"}));
      erwarte.gleich(a, b, id + ": zwei Aufrufe liefern verschiedene Fragen");
      erwarte.gleich(JSON.stringify(inst.netz), netzVorher, id + ": die Frage verändert das Netz");
      erwarte.wahr(a && a.length > 20, id + ": leere Frage");
    }
    /* Ohne niveau-Parameter gilt das Niveau der Instanz (Spiel.niveauVon). */
    const inst = instanz("salon-02", "AP1");
    erwarte.gleich(JSON.stringify(KURZ.fuer(inst)), JSON.stringify(KURZ.fuer(inst, {niveau: "AP1"})), "Standard-Niveau weicht vom Instanz-Niveau ab");
  }));

  pruefe("Kurzfrage: niveau-abhängig – E nur netz/zustand, AP1 +maske/gateway, AP2 +portmodus", kapsel(() => {
    const erlaubt = {
      E: ["netz", "zustand"],
      AP1: ["netz", "maske", "gateway", "zustand"],
      AP2: VORLAGEN,
    };
    const gesehen = {E: new Set(), AP1: new Set(), AP2: new Set()};
    for (const niveau of ["E", "AP1", "AP2"]) {
      for (const {id, q} of sammle(TICKETS, niveau)) {
        erwarte.wahr(q, id + "/" + niveau + ": keine Frage");
        erwarte.wahr(erlaubt[niveau].includes(q.id), id + "/" + niveau + ": Art " + q.id + " ist für dieses Niveau nicht erlaubt");
        gesehen[niveau].add(q.id);
      }
    }
    erwarte.wahr(gesehen.AP2.has("portmodus"), "AP2 zeigt nie portmodus: " + JSON.stringify([...gesehen.AP2]));
    erwarte.wahr(gesehen.AP1.has("maske") || gesehen.AP1.has("gateway"), "AP1 zeigt weder maske noch gateway: " + JSON.stringify([...gesehen.AP1]));
    erwarte.falsch(gesehen.E.has("portmodus") || gesehen.E.has("maske") || gesehen.E.has("gateway"), "E zeigt eine AP-Art: " + JSON.stringify([...gesehen.E]));
    /* Dieselbe Instanz, zwei Niveaus: mindestens einmal verschiedene Art. */
    let anders = 0;
    for (const id of TICKETS) {
      const inst = instanz(id, "E");
      const e = KURZ.fuer(inst, {niveau: "E"}), a = KURZ.fuer(inst, {niveau: "AP2"});
      if (e && a && e.id !== a.id) anders++;
    }
    erwarte.wahr(anders > 0, "das Niveau ändert nie die Art der Frage");
  }));

  pruefe("Kurzfrage: null ohne Auftrag oder ohne verwertbares Netz – nie eine geratene Frage", kapsel(() => {
    erwarte.gleich(KURZ.fuer(null), null, "null-Instanz");
    erwarte.gleich(KURZ.fuer(undefined), null, "undefined-Instanz");
    erwarte.gleich(KURZ.fuer({}), null, "leeres Objekt");
    erwarte.gleich(KURZ.fuer({iid: "x", netz: {geraete: {}, kabel: []}}), null, "leeres Netz");
    /* Hosts ohne eine einzige gültige Adresse (leere Schnittstellen) → null. */
    const leer = {iid: "ileer", netz: {geraete: {
      pc: {id: "pc", typ: "pc", name: "PC-Leer", an: true, running: {if: {eth0: {ip: "", maske: "", gw: ""}}, ports: {}, dienste: {}}, hw: {macs: {}}},
    }, kabel: []}};
    erwarte.gleich(KURZ.fuer(leer), null, "Netz ohne Adresse");
    /* Ohne Instanz-Niveau und ohne Wahl bleibt es bei E statt bei einer Ausnahme. */
    const inst = instanz("salon-01", "E");
    Spiel._einst.wahl = "auto";
    const q = KURZ.fuer(inst, {niveau: "unbekannt"});
    erwarte.wahr(q && ["netz", "zustand"].includes(q.id), "unbekanntes Niveau muss auf E zurückfallen: " + (q && q.id));
  }));

  pruefe("Kurzfrage: kein Lösungstext – keine Injektor-Titel, keine Grund-Codes, keine Diagnose", kapsel(() => {
    const texte = [];
    for (const t of DATEN.tickets) {
      if (!t || !t.id) continue;
      const inst = Spiel.instanzErstellen({ticketId: t.id, seed: 42, quelle: "postfach"});
      const q = KURZ.fuer(inst, {niveau: "AP2"});
      if (q) texte.push({id: t.id, blob: JSON.stringify(q)});
    }
    erwarte.wahr(texte.length >= 40, "zu wenige Fragen für die Prüfung: " + texte.length);
    const verbote = [
      ...Object.values(Spiel.INJEKTOREN).map(i => "Titel " + i.titel),
      ...Object.keys(Sim.GRUENDE).map(c => "Code " + c),
      "Wort Injektor", "Wort Fehlerursache", "Wort Diagnose", "Wort Lösung",
    ];
    for (const {id, blob} of texte) {
      for (const v of verbote) {
        const [art, wert] = v.split(" ");
        const wort = v.slice(art.length + 1);
        erwarte.falsch(blob.includes(wort), id + ": Frage verrät die Lösung (" + art + "): " + wort);
      }
    }
  }));
});
