"use strict";
/* Simulation: Umfang und Abdeckung des versionierten Referenzstands (SIM-03, Tier 2).
   tests/sim-stand.json ist das einzige Gate, das zeigt, ob sich das Verhalten der Simulation
   geändert hat (AGENTS.md verlangt den Lauf nach jeder Änderung an src/sim/). Es muss deshalb die
   Flächen abdecken, an denen 3.0 baut: VLAN/Trunk, NAT/PAT, ACL/Firewall, TTL, /31, Sturm, Adressierung.
   Architektur § 16.3: Referenzstand wird nach bewusster Änderung neu erzeugt und im CHANGELOG begründet. */
gruppe("Sim Referenzstand", () => {
  const fs = require("fs"), path = require("path");
  const stand = () => JSON.parse(fs.readFileSync(path.join(__dirname, "sim-stand.json"), "utf8"));
  pruefe("Umfang: ≥ 20 Szenarien, ≥ 20 von 34 Grundcodes, Protokolle TCP und HTTP", () => {
    const ref = stand();
    const namen = Object.keys(ref);
    erwarte.wahr(namen.length >= 20, "Szenarien: " + namen.length + " (soll ≥ 20)");
    const kaputt = namen.filter(n => !ref[n] || ref[n].fehler || !Array.isArray(ref[n].ereignisse) || ref[n].ereignisse.length === 0);
    erwarte.gleich(kaputt, [], "Szenarien ohne Ereignisse oder mit Fehler");
    const codes = new Set(), protos = new Set();
    for (const n of namen) for (const e of ref[n].ereignisse) { if (e.grund) codes.add(e.grund); if (e.proto) protos.add(e.proto); }
    erwarte.wahr(codes.size >= 20, "Grundcodes: " + codes.size + " (soll ≥ 20 von 34)");
    for (const p of ["TCP", "HTTP"]) erwarte.wahr(protos.has(p), "Protokoll " + p + " fehlt");
    const muss = ["LINK_DOWN", "PORT_SHUTDOWN", "DEVICE_OFF", "NO_IP", "DROP_VLAN", "TRUNK_NOT_ALLOWED",
      "NATIVE_MISMATCH", "NO_GATEWAY", "GW_WRONG_SUBNET", "GW_UNREACHABLE", "WRONG_MASK", "NO_ROUTE",
      "NO_RETURN_ROUTE", "TTL_EXPIRED", "ACL_DENY", "FW_DENY", "NAT_MISSING", "DUP_IP", "PORT_CLOSED",
      "SERVICE_OFF", "STORM", "PORTSEC_VIOLATION", "DNS_FAIL", "HOST_UNREACHABLE"];
    erwarte.gleich(muss.filter(c => !codes.has(c)), [], "fehlende Grundcodes in der Referenz");
  });
  pruefe("Bewusste Änderung: jede der genannten Flächen hat ein eigenes Szenario", () => {
    const ref = stand(), namen = Object.keys(ref);
    const flaechen = ["vlan", "trunk", "nativ", "nat", "acl", "fw", "ttl", "31", "sturm", "portsec", "dhcp-relay", "http"];
    for (const f of flaechen) erwarte.wahr(namen.some(n => n.toLowerCase().includes(f)), "Szenario für " + f + " fehlt");
  });
});
