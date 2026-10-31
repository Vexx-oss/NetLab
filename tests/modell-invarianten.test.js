"use strict";
/* KRN-06: INVARIANTEN DES MODELLS (task-75)
   Geprüft wird der ECHTE Weg: Modell.pruefen(netz) (Live-Prüfung im Inspektor) meldet strukturelle
   Verstöße als {geraet, feld, code, text}; saubere Netze melden NICHTS (keine Fehlalarme).
   Abgedeckt: doppelte MAC-Adressen, doppelte IP-Adressen (inkl. Switch-SVI mit richtigem Feld),
   Adress-Syntax auf Router/Firewall/Internet/SVI (nicht nur Hosts), Routen (Syntax, Ausgangs-
   Schnittstelle, Next Hop), VLAN-Verweise (Access/Native/Trunk/SVI) und Kabel (Gerät, Port,
   Doppelbelegung, Selbstverbindung). KRN-B08/KRN-B10 aus berichte/backend-kern.md. */
function ivNetz() {
  const n = Modell.neu();
  Modell.geraet(n, "pc", {id: "pc1", name: "PC1"});
  Modell.geraet(n, "pc", {id: "pc2", name: "PC2"});
  Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
  Modell.geraet(n, "router", {id: "r1", name: "R1"});
  Modell.verbinden(n, {geraet: "pc1"}, {geraet: "sw1"});
  Modell.verbinden(n, {geraet: "sw1"}, {geraet: "r1"});
  Modell.setzen(n, "pc1", "if.eth0.ip", "192.168.10.10");
  Modell.setzen(n, "pc1", "if.eth0.maske", "255.255.255.0");
  Modell.setzen(n, "pc1", "if.eth0.gw", "192.168.10.1");
  Modell.setzen(n, "r1", "if.Gi0/0.shutdown", false);
  Modell.setzen(n, "r1", "if.Gi0/0.ip", "192.168.10.1");
  Modell.setzen(n, "r1", "if.Gi0/0.maske", "255.255.255.0");
  return n;
}
function ivCodes(w, code) { return w.filter(x => x.code === code); }

gruppe("Modell: Invarianten (KRN-06)", () => {
  pruefe("sauberes Labor-Netz meldet keine Warnung", () => {
    erwarte.gleich(Modell.pruefen(Modell.neu()), [], "frisches Netz");
    const n = ivNetz();
    erwarte.gleich(Modell.pruefen(n).map(w => w.code), [], "aufgebautes, konsistentes Netz");
    for (const vorlage of ["salon", "praxis"]) {
      const netz = DATEN.beispiele[vorlage]();
      erwarte.gleich(Modell.pruefen(netz).map(w => w.code), [], "Vorlage " + vorlage);
    }
  });
  pruefe("doppelte MAC-Adresse wird erkannt (DUP_MAC)", () => {
    const n = ivNetz();
    const mac = n.geraete.pc1.hw.macs.eth0;
    n.geraete.pc2.hw.macs.eth0 = mac;
    const w = ivCodes(Modell.pruefen(n), "DUP_MAC");
    erwarte.gleich(w.length, 2, "beide Geräte werden genannt");
    erwarte.wahr(w.some(x => x.geraet === "pc2" && String(x.feld).startsWith("hw.macs.")), "Feld zeigt auf die MAC");
  });
  pruefe("doppelte IP-Adresse wird erkannt; Switch-SVI nennt svi.1.ip", () => {
    const n = ivNetz();
    Modell.setzen(n, "pc2", "if.eth0.ip", "192.168.10.10");
    Modell.setzen(n, "pc2", "if.eth0.maske", "255.255.255.0");
    const w = ivCodes(Modell.pruefen(n), "DUP_IP");
    erwarte.gleich(w.length, 2, "beide Adressen werden genannt");
    erwarte.wahr(w.some(x => x.geraet === "pc2" && x.feld === "if.eth0.ip"), "Host-Feld");
    const s = ivNetz();
    Modell.setzen(s, "sw1", "svi.1.ip", "192.168.10.10");
    Modell.setzen(s, "sw1", "svi.1.maske", "255.255.255.0");
    const svi = ivCodes(Modell.pruefen(s), "DUP_IP").find(x => x.geraet === "sw1");
    erwarte.gleich(svi.feld, "svi.1.ip", "Switch-SVI trägt das richtige Feld (früher doppelt if.Vlan1.ip)");
  });
  pruefe("Adress-Syntax wird AUCH auf Router/Firewall/Internet/SVI geprüft (nicht nur Hosts)", () => {
    const n = ivNetz();
    Modell.setzen(n, "r1", "if.Gi0/1.ip", "300.1.2.3");
    Modell.setzen(n, "r1", "if.Gi0/1.maske", "255.255.0.255");
    const codes = Modell.pruefen(n).map(w => w.code);
    erwarte.wahr(codes.includes("IP_SYNTAX"), "ungültige Router-IP gemeldet");
    erwarte.wahr(codes.includes("MASK_SYNTAX"), "ungültige Router-Maske gemeldet");
    const s = ivNetz();
    Modell.setzen(s, "sw1", "svi.1.maske", "255.0.255.0");
    erwarte.wahr(Modell.pruefen(s).some(w => w.code === "MASK_SYNTAX" && w.geraet === "sw1"), "SVI-Maske gemeldet");
  });
  pruefe("Route mit fehlender Ausgangsschnittstelle wird erkannt (ROUTE_AUS)", () => {
    const n = ivNetz();
    n.geraete.r1.running.routen.push({netz: "10.9.0.0", maske: "255.255.0.0", nh: null, aus: "Gi9/9", ad: 1});
    const w = ivCodes(Modell.pruefen(n), "ROUTE_AUS");
    erwarte.gleich(w.length, 1, "genau eine Meldung");
    erwarte.gleich(w[0].geraet, "r1", "Gerät der Route");
  });
  pruefe("Route mit ungültigem Netz/Next Hop wird erkannt (ROUTE_SYNTAX/ROUTE_NH)", () => {
    const n = ivNetz();
    n.geraete.r1.running.routen.push({netz: "10.0.0.0", maske: "255.0.255.0", nh: "10.0.0.1", aus: null, ad: 1});
    n.geraete.r1.running.routen.push({netz: "10.1.0.0", maske: "255.255.0.0", nh: "999.1.1.1", aus: null, ad: 1});
    const codes = Modell.pruefen(n).map(w => w.code);
    erwarte.wahr(codes.includes("ROUTE_SYNTAX"), "ungültige Maske in der Route gemeldet");
    erwarte.wahr(codes.includes("ROUTE_NH"), "ungültiger Next Hop gemeldet");
  });
  pruefe("VLAN-Port ohne existierendes VLAN wird erkannt (VLAN_MISSING)", () => {
    const n = ivNetz();
    Modell.setzen(n, "sw1", "ports.Fa0/5.accessVlan", 99);
    Modell.setzen(n, "sw1", "ports.Fa0/6.trunkErlaubt", [10]);
    const w = ivCodes(Modell.pruefen(n), "VLAN_MISSING");
    erwarte.wahr(w.some(x => x.feld === "ports.Fa0/5.accessVlan"), "Access-VLAN gemeldet");
    erwarte.wahr(w.some(x => x.feld === "ports.Fa0/6.trunkErlaubt"), "Trunk-Liste gemeldet");
    Modell.vlan(n, "sw1", 10, "Zehn");
    erwarte.falsch(Modell.pruefen(n).some(x => x.code === "VLAN_MISSING" && x.feld === "ports.Fa0/6.trunkErlaubt"), "mit angelegtem VLAN ist die Trunk-Liste in Ordnung");
  });
  pruefe("Kabel an unbekanntem Gerät/Port und Doppelbelegung werden erkannt (KABEL_*)", () => {
    const n = ivNetz();
    n.kabel.push({id: "k99", a: {geraet: "pc1", port: "eth9"}, b: {geraet: "gibtsnicht", port: "eth0"}});
    n.kabel.push({id: "k98", a: {geraet: "pc1", port: "eth0"}, b: {geraet: "sw1", port: "Fa0/24"}});
    const w = Modell.pruefen(n);
    erwarte.wahr(ivCodes(w, "KABEL_PORT").some(x => x.feld === "kabel.k99.a"), "unbekannter Port am Kabel");
    erwarte.wahr(ivCodes(w, "KABEL_GERAET").some(x => x.feld === "kabel.k99.b"), "unbekanntes Gerät am Kabel");
    erwarte.wahr(ivCodes(w, "KABEL_DOPPELT").some(x => x.feld === "port.eth0"), "doppelt belegter Port");
  });
  pruefe("Kabel eines Geräts mit sich selbst wird erkannt (KABEL_SELBST)", () => {
    const n = ivNetz();
    n.kabel.push({id: "k97", a: {geraet: "sw1", port: "Fa0/20"}, b: {geraet: "sw1", port: "Fa0/21"}});
    erwarte.wahr(Modell.pruefen(n).some(x => x.code === "KABEL_SELBST"), "Selbstverbindung gemeldet");
  });
  pruefe("Modell.loeschen wirft bei unbekanntem Gerät einen sprechenden Fehler", () => {
    const n = ivNetz();
    erwarte.wirft(() => Modell.loeschen(n, "fehlt", "routen"), "Gerät nicht gefunden");
  });
  pruefe("Umkehrprobe: Verletzung behoben → Warnung verschwindet (kein Dauerfeuer)", () => {
    const n = ivNetz();
    n.geraete.pc2.hw.macs.eth0 = n.geraete.pc1.hw.macs.eth0;
    erwarte.wahr(Modell.pruefen(n).some(x => x.code === "DUP_MAC"), "Verletzung ist da");
    n.geraete.pc2.hw.macs.eth0 = "02:00:aa:bb:cc:dd";
    erwarte.gleich(Modell.pruefen(n).filter(x => x.code === "DUP_MAC"), [], "nach der Reparatur weg");
  });
});
