"use strict";
/* Simulation: die drei DHCP-Gründe, die kein Codepfad je ausgelöst hat (Architektur § 10.4).
   DHCP_CONFLICT · DHCP_RESERVED_BUSY · DHCP_LEASE_EXPIRED.

   Je Grund: die im Vertrag beschriebene Situation herstellen, dann prüfen
     * genau dieser Code kommt als Ergebnis,
     * in der Trace steht KEIN anderer Grundcode (Fehlzuordnung ausgeschlossen),
     * und die Gegenprobe ohne die Situation bleibt ohne Grundcode bzw. beim alten Code.

   Testnetze aus sim-golden.test.js (Sim._test). Die Datei lädt vor sim-golden.test.js –
   deshalb wird Sim._test erst beim Ausführen geholt (wie in sim-gruende.test.js). */
gruppe("Sim DHCP-Gründe", () => {
  const T = () => Sim._test;
  const gruendeIn = tr => (tr && tr.ereignisse ? tr.ereignisse : []).filter(e => e.grund).map(e => e.grund);
  /* Alle vorkommenden Grundcodes (ohne Wiederholung) müssen genau der erwartete sein. */
  const nurDieser = (tr, code, hinweis) =>
    erwarte.gleich([...new Set(gruendeIn(tr))], [code], (hinweis || "") + " – Grundcodes in der Trace");
  const pool = extra => Object.assign({name: "LAN2", netz: "10.0.2.0", maske: "255.255.255.0", gw: "10.0.2.1", dns: ""}, extra || {});
  /* Ein Gerät am LAN2 des Testnetzes anschließen (sw2 hat Gi0/1 zu R1 und Fa0/1 zu PCB belegt). */
  const anLan2 = (t, n, id, ip, port) => { t.host(n, id, ip); t.kabel(n, id, "eth0", "sw2", port); return n.geraete[id]; };

  pruefe("DHCP_RESERVED_BUSY: reservierte Adresse ist belegt → kein Angebot, genau dieser Grund", () => {
    const t = T(), n = t.zweiNetze();
    const mac = n.geraete.pcb.hw.macs.eth0;
    /* Ein anderes Gerät trägt die reservierte Adresse bereits fest – die Reservierung zeigt ins Leere. */
    anLan2(t, n, "pcd", "10.0.2.240", "Fa0/4");
    Modell.setzen(n, "pcb", "if.eth0.dhcp", true);
    Modell.setzen(n, "r1", "dhcp", {ausgeschlossen: [], pools: [pool({start: "10.0.2.100", anzahl: 10,
      reservierungen: [{mac, ip: "10.0.2.240", name: "drucker"}]})]});
    const r = Sim.dhcp(n, "pcb");
    erwarte.falsch(r.ok, "die reservierte Adresse ist belegt – es darf kein Angebot geben: " + r.text);
    erwarte.gleich(r.grund, "DHCP_RESERVED_BUSY", "Ergebnis-Grund");
    nurDieser(r.trace, "DHCP_RESERVED_BUSY", "Reservierung belegt");
    erwarte.wahr(IP.apipa(Sim.adresse(n, "pcb").ip), "der Client fällt auf APIPA zurück");
    /* Die reservierte Adresse darf auch nicht anderweitig vergeben worden sein. */
    erwarte.falsch(Sim.leases(n, "r1").some(l => l.ip === "10.0.2.240" && l.mac === mac && l.bis > 0), "keine Lease auf die reservierte Adresse");

    /* Gegenprobe: dieselbe Reservierung, aber frei → sie wird vergeben, kein Grundcode. */
    const m2 = t.zweiNetze();
    const mac2 = m2.geraete.pcb.hw.macs.eth0;
    Modell.setzen(m2, "pcb", "if.eth0.dhcp", true);
    Modell.setzen(m2, "r1", "dhcp", {ausgeschlossen: [], pools: [pool({start: "10.0.2.100", anzahl: 10,
      reservierungen: [{mac: mac2, ip: "10.0.2.240", name: "drucker"}]})]});
    const ok = Sim.dhcp(m2, "pcb");
    erwarte.wahr(ok.ok && ok.lease.ip === "10.0.2.240", "freie Reservierung wird weiterhin vergeben: " + ok.text);
    erwarte.gleich(gruendeIn(ok.trace), [], "freie Reservierung: kein Grundcode");
  });

  pruefe("DHCP_CONFLICT: doppelt belegte Adresse ist der Grund – nicht DHCP_POOL_EMPTY", () => {
    const t = T(), n = t.zweiNetze();
    /* ZWEI Geräte tragen dieselbe Adresse .100 – erst dadurch ist es ein echter Konflikt. */
    anLan2(t, n, "pcd", "10.0.2.100", "Fa0/4");
    anLan2(t, n, "pce", "10.0.2.100", "Fa0/5");
    anLan2(t, n, "pcc", null, "Fa0/2");
    Modell.setzen(n, "pcc", "if.eth0.dhcp", true);
    Modell.setzen(n, "r1", "dhcp", {ausgeschlossen: [], pools: [pool({start: "10.0.2.100", anzahl: 1})]});
    const r = Sim.dhcp(n, "pcc");
    erwarte.falsch(r.ok, r.text);
    erwarte.gleich(r.grund, "DHCP_CONFLICT", "Ergebnis-Grund – ein Konflikt ist kein leerer Pool");
    nurDieser(r.trace, "DHCP_CONFLICT", "Adresse doppelt belegt, Pool damit leer");
    erwarte.wahr(Sim.leases(n, "r1").some(l => l.ip === "10.0.2.100" && l.konflikt), "der Konflikt bleibt in der Lease-Liste vermerkt");

    /* Zweite Lage: der Konflikt wird gefunden, eine ANDERE Adresse ist noch frei –
       der Client bekommt sie, der Grund steht trotzdem genau einmal in der Trace
       (Vertrag: „Server findet eine doppelt belegte Adresse“). */
    const m2 = t.zweiNetze();
    anLan2(t, m2, "pcd", "10.0.2.100", "Fa0/4");
    anLan2(t, m2, "pce", "10.0.2.100", "Fa0/5");
    anLan2(t, m2, "pcc", null, "Fa0/2");
    Modell.setzen(m2, "pcc", "if.eth0.dhcp", true);
    Modell.setzen(m2, "r1", "dhcp", {ausgeschlossen: [], pools: [pool({start: "10.0.2.100", anzahl: 2})]});
    const ok = Sim.dhcp(m2, "pcc");
    erwarte.wahr(ok.ok, "mit einer freien Adresse im Pool muss ein Angebot kommen: " + ok.text);
    erwarte.gleich(ok.lease.ip, "10.0.2.101", "die doppelt belegte .100 wird übersprungen");
    nurDieser(ok.trace, "DHCP_CONFLICT", "Konflikt gefunden, trotzdem vergeben");
  });

  pruefe("DHCP_LEASE_EXPIRED: abgelaufene Lease ohne neues Angebot → genau dieser Grund", () => {
    const t = T(), n = t.zweiNetze();
    Modell.setzen(n, "pcb", "if.eth0.dhcp", true);
    Modell.setzen(n, "r1", "dhcp", {ausgeschlossen: [], pools: [pool({start: "10.0.2.100", anzahl: 10, leaseS: 60})]});
    const a = Sim.dhcp(n, "pcb");
    erwarte.wahr(a.ok, a.text);
    erwarte.gleich(gruendeIn(a.trace), [], "erster Bezug ohne Grundcode");
    const ip = a.lease.ip;
    /* Der Server verliert seinen Pool, und die Lease läuft ab (60 s). */
    Modell.setzen(n, "r1", "dhcp", {ausgeschlossen: [], pools: []});
    Sim.vergehen(n, 61000);
    erwarte.gleich(Sim.adresse(n, "pcb").ip, "", "die abgelaufene Lease gilt nicht mehr");
    const b = Sim.dhcp(n, "pcb");
    erwarte.falsch(b.ok, b.text);
    erwarte.gleich(b.grund, "DHCP_LEASE_EXPIRED", "Ergebnis-Grund");
    nurDieser(b.trace, "DHCP_LEASE_EXPIRED", "Lease abgelaufen, kein neues Angebot");
    erwarte.enthaelt(b.text, ip, "der Text nennt die abgelaufene Adresse");
    erwarte.wahr(IP.apipa(Sim.adresse(n, "pcb").ip), "der Client fällt auf APIPA zurück");

    /* Gegenprobe: OHNE vorherige Lease bleibt es beim alten Grund. */
    const m2 = t.zweiNetze();
    Modell.setzen(m2, "pcb", "if.eth0.dhcp", true);
    Modell.setzen(m2, "r1", "dhcp", {ausgeschlossen: [], pools: []});
    const c = Sim.dhcp(m2, "pcb");
    erwarte.falsch(c.ok, c.text);
    erwarte.gleich(c.grund, "DHCP_NO_OFFER", "ohne abgelaufene Lease bleibt NO_OFFER");
    nurDieser(c.trace, "DHCP_NO_OFFER", "kein Server, keine Lease");

    /* Gegenprobe: die abgelaufene Lease wird erneuert, sobald der Server wieder kann. */
    Modell.setzen(n, "r1", "dhcp", {ausgeschlossen: [], pools: [pool({start: "10.0.2.100", anzahl: 10, leaseS: 60})]});
    const d = Sim.dhcp(n, "pcb");
    erwarte.wahr(d.ok, "nach dem Ablauf muss ein neuer Bezug möglich sein: " + d.text);
    erwarte.gleich(gruendeIn(d.trace), [], "erfolgreicher Neubezug: kein Grundcode");
  });
});
