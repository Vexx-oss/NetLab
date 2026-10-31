"use strict";
/* Simulation: SVI-Selbstempfang und begründetes Verwerfen (SIM-05/06, Tier 2).
   Architektur § 5.2: Warnungen sind keine Ursache; Verwerfen ohne Fehlergrund trägt harmlos:true.
   Die Referenz tests/sim-stand.json ist der versionierte Beleg, dass jede Verwerfen-Stelle erklärt ist. */
gruppe("Sim Verwerfen", () => {
  const fs = require("fs"), path = require("path");
  const STAND = path.join(__dirname, "sim-stand.json");
  pruefe("SIM-05: SVI empfängt den eigenen Broadcast nicht als Fremdverkehr", () => {
    const n = Sim._test.lan();
    Modell.setzen(n, "sw1", "svi.1", {ip: "192.168.1.2", maske: "255.255.255.0", shutdown: false});
    const r = Sim.ping(n, "sw1", "192.168.1.12", {anzahl: 5});
    erwarte.wahr(r.antworten.some(a => a.ok), "Ping vom Switch kommt an: " + r.text);
    const selbst = r.trace.ereignisse.filter(e => e.art === "verwerfen" && e.geraet === "sw1" && e.port === "Vlan1" && /nicht gemeint/.test(e.text || ""));
    erwarte.gleich(selbst.length, 0, "Selbstempfang: " + selbst.map(e => e.text).join(" | "));
    const hin = Sim.ping(n, "pc1", "192.168.1.2");
    erwarte.wahr(hin.ok, "Ping auf die SVI bleibt grün: " + hin.text);
  });
  pruefe("SIM-06: jedes Verwerfen in der Referenz hat grund oder harmlos", () => {
    const ref = JSON.parse(fs.readFileSync(STAND, "utf8"));
    const offen = [];
    for (const [name, sz] of Object.entries(ref)) for (const e of sz.ereignisse || []) if (e.art === "verwerfen" && !e.grund && !e.harmlos) offen.push(name + ": " + (e.geraet || "?") + "/" + (e.port || "?"));
    erwarte.gleich(offen.slice(0, 15), [], "Verwerfen ohne grund/harmlos (gesamt " + offen.length + ")");
  });
  pruefe("SIM-06: IOS-ARP-Verwurf ist harmlos, der Fehlergrund bleibt TIMEOUT", () => {
    const n = Sim._test.zweiNetze();
    const r = Sim.ping(n, "pca", "10.0.2.10");
    const verwurf = r.trace.ereignisse.filter(e => e.art === "verwerfen" && !e.grund && /IOS-Verhalten/.test(e.text || ""));
    erwarte.wahr(verwurf.length >= 1, "IOS-Verwurf in der Trace");
    erwarte.wahr(verwurf.every(e => e.harmlos === true), "als harmlos markiert");
    erwarte.gleich(r.antworten[0].grund, "TIMEOUT", "erster Pfad bleibt TIMEOUT (kein neuer Code)");
  });
});
