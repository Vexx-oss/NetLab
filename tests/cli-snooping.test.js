"use strict";
/* CLI-SNOOPING (CLI-03, W2/Tier 2, 31.10.2026): DHCP-Snooping sichtbar und wieder-einlesbar.
   running-config zeigt „ip dhcp snooping“ und je vertrautem Port „ip dhcp snooping trust“;
   show ip dhcp snooping nennt Zustand, vertraute Ports und den Laufzeit-Zähler.
   Aufrufpfade: Konfig src/cli/ios-befehle.js:490-510,:542-543,:741-742; Anzeige src/cli/ios-ausgaben.js;
   Zähler src/sim/switch.js:64-69 → netz.zustand[id].snooping[port].verworfen (Architektur § 5.4).
   Vertrag: docs/Architektur.md § 6.1 (running-config nur mit wieder-einlesbaren Zeilen). */
gruppe("CLI: DHCP-Snooping", () => {
  const e = (s, ...zeilen) => { let r; for (const z of zeilen) r = CLI.eingabe(s, z); return r; };
  const tief = x => JSON.parse(JSON.stringify(x));
  /* Minimales echtes Netz: PC und DHCP-Server an einem Switch. Die Server-Antwort kommt über Fa0/2
     herein – ohne Vertrauen muss Snooping sie verwerfen und den Zähler hochziehen. */
  const snoopNetz = (vertraut) => {
    const n = Modell.neu();
    Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
    Modell.geraet(n, "pc", {id: "pc1", name: "PC1"});
    Modell.geraet(n, "server", {id: "srv1", name: "SRV1"});
    Modell.verbinden(n, {geraet: "pc1"}, {geraet: "sw1", port: "Fa0/1"});
    Modell.verbinden(n, {geraet: "srv1"}, {geraet: "sw1", port: "Fa0/2"});
    Modell.setzen(n, "srv1", "if.eth0.ip", "192.168.7.10");
    Modell.setzen(n, "srv1", "if.eth0.maske", "255.255.255.0");
    Modell.setzen(n, "srv1", "dienste.dhcp", {an: true, pools: [{name: "LAN", netz: "192.168.7.0", maske: "255.255.255.0", gw: "192.168.7.1", dns: "", start: "192.168.7.100", anzahl: 10}]});
    Modell.setzen(n, "pc1", "if.eth0.dhcp", true);
    Modell.setzen(n, "sw1", "snooping", {an: true, vertraut: vertraut || []});
    return n;
  };
  const replay = (quelle, id) => {
    const text = CLI.runningConfig(quelle.geraete[id]);
    const frisch = Modell.neu(); Modell.geraet(frisch, "switch", {id, name: quelle.geraete[id].name});
    const r = CLI.anwenden(frisch, id, "configure terminal\n" + text);
    return {text, frisch, g: frisch.geraete[id], r};
  };

  pruefe("Konfiguration wirkt: ip dhcp snooping und trust setzen running.snooping", () => {
    const n = snoopNetz([]), s = CLI.sitzung(n, "sw1");
    const rAn = e(s, "enable", "configure terminal", "ip dhcp snooping");
    erwarte.falsch(rAn.fehler, "ip dhcp snooping wird angenommen");
    erwarte.gleich(n.geraete.sw1.running.snooping.an, true, "global eingeschaltet");
    const rTrust = e(s, "interface Fa0/2", "ip dhcp snooping trust", "exit", "end");
    erwarte.falsch(rTrust.fehler, "trust im Schnittstellenmodus wird angenommen");
    erwarte.gleich(n.geraete.sw1.running.snooping.vertraut, ["Fa0/2"], "Fa0/2 ist vertraut");
  });

  pruefe("running-config zeigt global und trust je Port; Replay stellt den Zustand wieder her", () => {
    const n = snoopNetz([]), s = CLI.sitzung(n, "sw1");
    e(s, "enable", "configure terminal", "ip dhcp snooping", "interface Fa0/2", "ip dhcp snooping trust", "exit", "end");
    const text = CLI.runningConfig(n.geraete.sw1);
    erwarte.passt(text, /^ip dhcp snooping$/m, "globale Snooping-Zeile fehlt in der running-config");
    erwarte.passt(text, /^ ip dhcp snooping trust$/m, "trust-Zeile fehlt im Schnittstellenblock");
    const {g, r, text: text2} = replay(n, "sw1");
    erwarte.gleich([r.ok, r.fehler.length], [true, 0], "Replay ist fehlerfrei: " + JSON.stringify(r.fehler.map(x => x.toString())).slice(0, 500));
    erwarte.gleich(g.running.snooping, {an: true, vertraut: ["Fa0/2"]}, "Replay setzt den Snooping-Zustand");
    erwarte.gleich(CLI.runningConfig(g), text2, "Text bleibt nach dem Replay gleich");
  });

  pruefe("show ip dhcp snooping: Zustand, vertraute Ports und echter Zähler aus der Simulation", () => {
    const n = snoopNetz([]);
    const dhcp = Sim.dhcp(n, "pc1");
    erwarte.falsch(dhcp.ok, "ohne vertrauten Port kommt keine Adresse an");
    const z = n.zustand.sw1 && n.zustand.sw1.snooping && n.zustand.sw1.snooping["Fa0/2"];
    const verloren = z && z.verworfen;
    erwarte.wahr(verloren >= 1, "die Simulation hat mindestens eine Server-Antwort verworfen: " + verloren);
    const s = CLI.sitzung(n, "sw1");
    e(s, "enable");
    const show = e(s, "show ip dhcp snooping").ausgabe;
    erwarte.enthaelt(show, "enabled", "Snooping ist an");
    erwarte.passt(show, new RegExp("Fa0/2\\s+verworfen:\\s+" + verloren), "Zähler Fa0/2 = " + verloren + " steht in der Anzeige");
    /* Port vertrauen → zweiter Versuch kommt durch; der Zähler bleibt stehen, kein neuer Verlust. */
    e(s, "configure terminal", "interface Fa0/2", "ip dhcp snooping trust", "exit", "end");
    const dhcp2 = Sim.dhcp(n, "pc1");
    erwarte.wahr(dhcp2.ok, "mit vertrautem Server-Port kommt die Adresse an: " + (dhcp2.text || ""));
    const show2 = e(s, "show ip dhcp snooping").ausgabe;
    erwarte.passt(show2, new RegExp("Fa0/2\\s+verworfen:\\s+" + verloren), "Zähler bleibt bei " + verloren + " (kein weiterer Verlust)");
    erwarte.passt(show2, /Fa0\/2\s+yes/, "Fa0/2 ist als vertraut aufgeführt");
  });

  pruefe("show ip dhcp snooping ohne Snooping: disabled mit ehrlichem Hinweis", () => {
    const n = Modell.neu(); Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
    const s = CLI.sitzung(n, "sw1"); e(s, "enable");
    const show = e(s, "show ip dhcp snooping").ausgabe;
    erwarte.enthaelt(show, "disabled", "Snooping ist aus");
    erwarte.enthaelt(show, "ip dhcp snooping", "der Hinweis nennt den Befehl zum Einschalten");
  });

  pruefe("trust im globalen Konfigurationsmodus wird abgewiesen (CLI-08)", () => {
    /* Snooping ist hier AUS: der abgewiesene Befehl darf es nicht heimlich einschalten. */
    const n = Modell.neu(); Modell.geraet(n, "switch", {id: "sw1", name: "SW1"});
    Modell.setzen(n, "sw1", "snooping", {an: false, vertraut: []});
    const s = CLI.sitzung(n, "sw1");
    e(s, "enable", "configure terminal");
    const r = e(s, "ip dhcp snooping trust");
    erwarte.wahr(!!r.fehler, "globales trust ist ein Fehler");
    erwarte.enthaelt(r.ausgabe, "Schnittstellenmodus", "der Hinweis nennt den richtigen Modus");
    erwarte.gleich(n.geraete.sw1.running.snooping, {an: false, vertraut: []}, "globales trust ändert den Snooping-Zustand nicht");
  });

  pruefe("Gegenprobe: vergessenes trust in der running-config wird als Verlust erkannt", () => {
    const n = snoopNetz([]), s = CLI.sitzung(n, "sw1");
    e(s, "enable", "configure terminal", "ip dhcp snooping", "interface Fa0/2", "ip dhcp snooping trust", "exit", "end");
    const text = CLI.runningConfig(n.geraete.sw1);
    const ohneTrust = text.split("\n").filter(z => z.trim() !== "ip dhcp snooping trust").join("\n");
    erwarte.falsch(ohneTrust === text, "Testaufbau: trust-Zeile wurde entfernt");
    const frisch = Modell.neu(); Modell.geraet(frisch, "switch", {id: "sw1", name: "SW1"});
    CLI.anwenden(frisch, "sw1", "configure terminal\n" + ohneTrust);
    erwarte.gleich(frisch.geraete.sw1.running.snooping.vertraut, [], "ohne trust-Zeile fehlt der vertraute Port");
    erwarte.falsch(JSON.stringify(tief(frisch.geraete.sw1.running.snooping)) === JSON.stringify(tief(n.geraete.sw1.running.snooping)),
      "der Zustandsvergleich erkennt den Verlust (sonst wäre die Prüfung blind)");
  });

  pruefe("no ip dhcp snooping und no ip dhcp snooping trust nehmen zurück", () => {
    const n = snoopNetz(["Fa0/2"]), s = CLI.sitzung(n, "sw1");
    e(s, "enable", "configure terminal", "ip dhcp snooping", "interface Fa0/2", "ip dhcp snooping trust", "exit", "end");
    e(s, "configure terminal", "interface Fa0/2", "no ip dhcp snooping trust", "exit", "end");
    erwarte.gleich(n.geraete.sw1.running.snooping.vertraut, [], "trust entfernt");
    erwarte.gleich(n.geraete.sw1.running.snooping.an, true, "global bleibt an");
    e(s, "configure terminal", "no ip dhcp snooping", "end");
    erwarte.gleich(n.geraete.sw1.running.snooping.an, false, "global aus");
    erwarte.falsch(/^ip dhcp snooping$/m.test(CLI.runningConfig(n.geraete.sw1)), "ausgeschaltet erscheint keine globale Zeile");
  });
});
