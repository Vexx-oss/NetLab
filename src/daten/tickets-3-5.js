"use strict";
/* ---------- Handgeschriebene Tickets, Karriere-Stufen 3 bis 5 ----------
   Vorlagen-IDs: praxis = srv, empfang, behandlung, gast, sw1, r1, inet · standorte = srv, verkauf, werkstatt, annahme,
   sw1, sw2, r1 (Zentrale), r2 (Standort Süd), inet · dmz = pc1, pc2, web, kunde, sw1, sw2, fw, inet. */
(() => {
  const T = DATEN.ticketSpec;
  const t = spec => DATEN.tickets.push(T(spec));
  const lang = p => String(p).replace(/^Fa(?=\d)/, "FastEthernet").replace(/^Gi(?=\d)/, "GigabitEthernet");

  /* ===== Stufe 3 · Praxis Dr. Krämer (Sabine Krämer) ===== */
  t({id: "praxis-01", reihe: 1, kunde: "praxis", karriere: 3, stufe: "E", vorlage: "praxis", vSeed: 41, minuten: 5, vorhersage: true,
    injektoren: [{name: "vlan-falsch", ziel: "behandlung"}],
    titel: "Behandlungsraum ohne Akten",
    briefing: "Hallo,\nim Behandlungsraum 2 kommt der PC seit heute Morgen nicht mehr an die Patientenakten auf dem Server. Wir hatten gestern einen Kabelkanal neu verlegen lassen. Die anderen Räume gehen.\nFür das Protokoll bräuchte ich danach zwei Sätze, was los war.\n\nSabine Krämer",
    symptom: "Der PC im Behandlungsraum erreicht den Server nicht mehr.",
    lohn: {euro: 90, ruf: 2}});

  t({id: "praxis-02", reihe: 2, kunde: "praxis", karriere: 3, stufe: "AP1", vorlage: "praxis", vSeed: 42, minuten: 6,
    injektoren: [{name: "vlan-fehlt"}],
    titel: "Nach dem Switch-Reset",
    briefing: "Hallo,\nunser Hausmeister hat den Switch „zurückgesetzt“, weil er so warm war. Seitdem ist der Behandlungsraum offline. Empfang und Server laufen. Kommen jetzt eigentlich die Gäste an unsere Daten? Das wäre mir das Wichtigste.\n\nSabine Krämer",
    symptom: "Nach dem Switch-Reset ist der Behandlungsraum offline.",
    lohn: {euro: 100, ruf: 2}});

  t({id: "praxis-03", reihe: 3, kunde: "praxis", karriere: 3, stufe: "AP1", vorlage: "praxis", vSeed: 43, minuten: 6,
    injektoren: [{name: "trunk-vlan-fehlt"}],
    titel: "Trunk mit Lücke",
    briefing: "Hallo,\nein Dienstleister hat „die Sicherheit am Switch verbessert“. Seitdem kommt der Behandlungsraum weder an den Server noch ins Internet. Im Protokoll steht nur „allowed vlan angepasst“. Können Sie damit etwas anfangen?\n\nSabine Krämer",
    symptom: "Seit der „Sicherheitsverbesserung“ ist der Behandlungsraum abgeschnitten.",
    lohn: {euro: 100, ruf: 2}});

  t({id: "praxis-04", reihe: 4, kunde: "praxis", karriere: 3, stufe: "AP1", vorlage: "praxis", vSeed: 44, minuten: 6,
    injektoren: [{name: "acl-reihenfolge"}],
    titel: "Gäste im Patientennetz!",
    briefing: "Hallo,\ndas ist dringend: Ein Patient hat im Wartezimmer mit seinem Laptop im Gäste-WLAN unseren Server gesehen! Die Gäste dürfen ins Internet, aber auf gar keinen Fall an die Akten. Gestern hat jemand an der „Zugriffsliste“ gearbeitet.\n\nSabine Krämer",
    symptom: "Gäste erreichen den Praxisserver – das darf nicht sein.",
    erklaerung: "ACLs gelten „first match“: Die erste passende Regel entscheidet. Steht „permit ip any any“ ganz oben, kommen die Sperren darunter nie zum Zug. Datenschutz hängt hier an der Reihenfolge von drei Zeilen – deshalb nach jeder ACL-Änderung beide Richtungen testen: Was gehen soll, und was NICHT gehen darf.",
    lohn: {euro: 110, ruf: 3}});

  t({id: "praxis-05", reihe: 5, kunde: "praxis", karriere: 3, stufe: "AP2", vorlage: "praxis", vSeed: 45, minuten: 7,
    injektoren: [{name: "acl-richtung"}],
    titel: "Die Sperre wirkt nicht",
    briefing: "Hallo,\nnach dem Update des Routers kann der Gast-Laptop wieder auf den Server zugreifen. Die Zugriffsliste GAST sei „unverändert“, sagt der Dienstleister. Irgendetwas stimmt trotzdem nicht.\n\nSabine Krämer",
    symptom: "Die Gäste-Sperre ist da, wirkt aber nicht.",
    lohn: {euro: 120, ruf: 3}});

  t({id: "praxis-06", reihe: 6, kunde: "praxis", karriere: 3, stufe: "AP1", vorlage: "praxis", vSeed: 46, minuten: 5,
    injektoren: [{name: "acl-zu-streng"}],
    titel: "Wartezimmer ohne Internet",
    briefing: "Hallo,\njetzt ist es andersherum: Die Gäste kommen gar nicht mehr ins Internet, auch nicht auf harmlose Seiten. Die Patienten beschweren sich. An die Akten sollen sie natürlich weiterhin nicht.\n\nSabine Krämer",
    symptom: "Das Gäste-WLAN hat kein Internet mehr.",
    lohn: {euro: 100, ruf: 2}});

  t({id: "praxis-07", reihe: 7, kunde: "praxis", karriere: 3, stufe: "AP2", vorlage: "praxis", vSeed: 47, minuten: 7,
    injektoren: [{name: "subif-vlan-falsch"}],
    titel: "Behandlung hinter dem Router verschwunden",
    briefing: "Hallo,\nim Behandlungsraum erreichen die Geräte einander, aber weder Server noch Internet. Am Router wurde gestern „ein Tippfehler in einer Nummer korrigiert“. Ich fürchte, das war keiner.\n\nSabine Krämer",
    symptom: "Der Behandlungsraum kommt nicht über den Router hinaus.",
    lohn: {euro: 120, ruf: 3}});

  /* Arztpraxis-Projekt (Konzept § 11, Phase 2): drei VLANs, Router-on-a-Stick, Gäste per ACL getrennt – per Konsole UND per Panel lösbar */
  t({id: "praxis-projekt", reihe: 8, kunde: "praxis", karriere: 3, stufe: "AP1", art: "projekt", vorlage: "praxis", vSeed: 48, minuten: 20,
    injektoren: [], alleZiele: true,
    umbau(n){
      const sw = n.geraete.sw1;
      sw.flash.vlans = {"1": {name: "default"}};
      for (const p of Object.keys(sw.running.ports)) { sw.running.ports[p].modus = "access"; sw.running.ports[p].accessVlan = 1; sw.running.ports[p].trunkErlaubt = "all"; }
      const r = n.geraete.r1.running;
      for (const p of Object.keys(r.if)) if (p.includes(".")) delete r.if[p];
      delete r.acls.GAST;
      Modell.speichern(sw); Modell.speichern(n.geraete.r1);
    },
    loesungFn(n, r){
      const {verwaltung: v1, behandlung: v2, gaeste: v3} = r.vlans, net = v => `192.168.${v}`;
      return [
        {geraet: "sw1", text: "Switch: drei VLANs anlegen, Access-Ports zuordnen, Uplink zum Router als Trunk.", cli: [
          "configure terminal", `vlan ${v1}`, "name Verwaltung", `vlan ${v2}`, "name Behandlung", `vlan ${v3}`, "name Gaeste", "exit",
          `interface ${lang(r.ports.srv)}`, "switchport mode access", `switchport access vlan ${v1}`,
          `interface ${lang(r.ports.empfang)}`, "switchport mode access", `switchport access vlan ${v1}`,
          `interface ${lang(r.ports.behandlung)}`, "switchport mode access", `switchport access vlan ${v2}`,
          `interface ${lang(r.ports.gast)}`, "switchport mode access", `switchport access vlan ${v3}`,
          `interface ${lang(r.trunkPort)}`, "switchport mode trunk", "end", "copy running-config startup-config"].join("\n")},
        {geraet: "r1", text: "Router: je VLAN ein Subinterface mit Gateway-Adresse und NAT inside, ACL GAST eingehend auf dem Gäste-Subinterface.", cli: [
          "configure terminal",
          ...[v1, v2, v3].flatMap(v => [`interface GigabitEthernet0/0.${v}`, `encapsulation dot1Q ${v}`, `ip address ${net(v)}.1 255.255.255.0`, "ip nat inside"]),
          `interface GigabitEthernet0/0.${v3}`, "ip access-group GAST in", "exit",
          "ip access-list extended GAST", `deny ip ${net(v3)}.0 0.0.0.255 ${net(v1)}.0 0.0.0.255`, `deny ip ${net(v3)}.0 0.0.0.255 ${net(v2)}.0 0.0.0.255`, "permit ip any any",
          "end", "copy running-config startup-config"].join("\n")},
      ];
    },
    hilfen: {frage: ["Zeichne dir zuerst den Plan: Welches VLAN bekommt welches Netz, und welcher Port gehört in welches VLAN? Welche Adresse ist jeweils das Gateway der Rechner?"],
      bereich: [{geraet: "sw1"}, {geraet: "r1"}],
      konkret: ["Switch: vlan <nr> + name, Access-Ports mit „switchport access vlan“, Gi0/1 „switchport mode trunk“. Router: „interface Gi0/0.<vlan>“, „encapsulation dot1Q <vlan>“, „ip address …“, „ip nat inside“ – für die Gäste zusätzlich die ACL."]},
    titel: "Projekt: Drei Netze für die Praxis",
    briefing: "Hallo,\nwir bekommen eine Datenschutzprüfung. Bisher hängt alles in einem Netz: Verwaltung, Behandlungsräume und das Gäste-WLAN. Bitte trennen Sie das in drei Bereiche. Verwaltung und Behandlung sollen den Server nutzen und sich gegenseitig erreichen, die Gäste nur das Internet. Die Adressen an den Geräten sind schon passend eingestellt, sagt unser alter Dienstleister.\n\nSabine Krämer",
    symptom: "Verwaltung, Behandlung und Gäste sollen in drei getrennte Netze.",
    erklaerung: "VLANs trennen Broadcast-Domänen auf einem Switch: Jedes VLAN ist ein eigenes Netz. Der Router verbindet sie über einen einzigen Trunk (Router-on-a-Stick): je VLAN ein Subinterface mit „encapsulation dot1Q“. Die ACL am Gäste-Subinterface lässt Gäste nur ins Internet. Tipp: Das geht ebenso im Inspektor – dieselbe Konfiguration, andere Oberfläche.",
    quelle: "VLAN – Lernfassung", lohn: {euro: 250, ruf: 5}});

  /* ===== Stufe 4 · Autohaus Brenner (Timo Brenner) ===== */
  t({id: "autohaus-01", reihe: 1, kunde: "autohaus", karriere: 4, stufe: "AP1", vorlage: "standorte", vSeed: 51, minuten: 6,
    injektoren: [{name: "route-fehlt"}],
    titel: "Standort Süd ohne Zentrale",
    briefing: "Moin! Standort Süd kommt nicht mehr an die Auftragsdaten in der Zentrale. Internet läuft dort, das ist das Komische. Die Werkstatt steht still wie ein Motor ohne Zündkerze. Gestern hat jemand am Router der Zentrale „aufgeräumt“.\n\nTimo",
    symptom: "Standort Süd erreicht die Zentrale nicht mehr.",
    lohn: {euro: 130, ruf: 2}});

  t({id: "autohaus-02", reihe: 2, kunde: "autohaus", karriere: 4, stufe: "AP1", vorlage: "standorte", vSeed: 52, minuten: 6, vorhersage: true,
    injektoren: [{name: "rueckroute-fehlt"}],
    skills: ["lab.route", "lab.ping"],
    titel: "Anfrage raus, Antwort weg",
    briefing: "Moin! Neuer Router in Süd, frisch eingerichtet vom Provider. Jetzt geht in Süd nichts mehr raus: nicht in die Zentrale, nicht ins Internet. Kein Fehler, einfach nichts. Wie ein Anlasser, der dreht, aber der Motor springt nicht an.\n\nTimo",
    symptom: "Standort Süd erreicht nichts mehr – keine Fehlermeldung, nur Zeitüberschreitung.",
    lohn: {euro: 140, ruf: 3}});

  t({id: "autohaus-03", reihe: 3, kunde: "autohaus", karriere: 4, stufe: "AP2", vorlage: "standorte", vSeed: 53, minuten: 7,
    injektoren: [{name: "schleife"}],
    skills: ["lab.ttl", "lab.route"],
    titel: "Pakete im Kreisverkehr",
    briefing: "Moin! In der Zentrale sagt traceroute zu Süd immer abwechselnd dieselben zwei Adressen, dann „TTL expired“. Klingt für mich wie ein Kreisverkehr ohne Ausfahrt. In Süd selbst ist gerade niemand, der was prüfen könnte.\n\nTimo",
    symptom: "Pakete nach Süd kreisen zwischen den Routern.",
    lohn: {euro: 150, ruf: 3}});

  t({id: "autohaus-04", reihe: 4, kunde: "autohaus", karriere: 4, stufe: "AP1", vorlage: "standorte", vSeed: 54, minuten: 6,
    injektoren: [{name: "nat-acl-falsch"}],
    titel: "Süd ohne Internet",
    briefing: "Moin! Süd kommt an die Zentrale, aber nicht mehr ins Internet. Die Zentrale selbst surft ganz normal. Der Provider sagt, bei ihm kämen „private Adressen“ an. Ich verstehe nur Bahnhof.\n\nTimo",
    symptom: "Standort Süd kommt nicht ins Internet, die Zentrale schon.",
    lohn: {euro: 140, ruf: 3}});

  t({id: "autohaus-05", reihe: 5, kunde: "autohaus", karriere: 4, stufe: "AP2", vorlage: "standorte", vSeed: 55, minuten: 6,
    injektoren: [{name: "nat-vertauscht"}],
    skills: ["lab.nat", "lab.cli"],
    titel: "Beschwerde vom Provider",
    briefing: "Moin! Seit dem Routertausch in der Zentrale ist das Internet überall weg. Der Provider schreibt, wir würden „Pakete mit Absendern aus 10.0.0.0/8“ schicken, die er verwirft. Intern läuft alles wie geschmiert.\n\nTimo",
    symptom: "Kein Internet mehr, der Provider verwirft private Absender.",
    lohn: {euro: 150, ruf: 3}});

  t({id: "autohaus-06", reihe: 6, kunde: "autohaus", karriere: 4, stufe: "AP1", vorlage: "standorte", vSeed: 56, minuten: 5,
    injektoren: [{name: "default-fehlt"}],
    titel: "Internet weg, intern alles gut",
    briefing: "Moin! Nach dem Firmware-Update des Routers in der Zentrale: kein Internet, nirgends. Zentrale und Süd reden noch miteinander. Der Router meldet bei Pings „Destination unreachable“, sagt der Azubi.\n\nTimo",
    symptom: "Nach dem Update gibt es nirgends Internet.",
    lohn: {euro: 130, ruf: 2}});

  t({id: "autohaus-projekt", reihe: 7, kunde: "autohaus", karriere: 4, stufe: "AP1", art: "projekt", vorlage: "standorte", vSeed: 57, minuten: 20,
    injektoren: [], alleZiele: true,
    umbau(n){
      n.geraete.r2.running = Modell.werkszustand("router", n.geraete.r2.name);
      n.geraete.r1.running.routen = n.geraete.r1.running.routen.filter(r => r.netz === "0.0.0.0");
      Modell.speichern(n.geraete.r1); n.geraete.r2.startup = null;
    },
    loesungFn(n, r){
      const B = r.netzB.replace(/0$/, ""), T = r.transfer.replace(/0$/, "");
      return [
        {geraet: "r2", text: "Router Süd: LAN- und Standleitungs-Schnittstelle adressieren, einschalten, Default-Route zur Zentrale.", cli: [
          "configure terminal", "interface GigabitEthernet0/0", `ip address ${B}1 255.255.255.0`, "no shutdown",
          "interface GigabitEthernet0/1", `ip address ${T}2 255.255.255.252`, "no shutdown", "exit",
          `ip route 0.0.0.0 0.0.0.0 ${T}1`, "end", "copy running-config startup-config"].join("\n")},
        {geraet: "r1", text: "Zentrale: Route zum Netz von Süd über die Standleitung.", cli: [
          "configure terminal", `ip route ${r.netzB} 255.255.255.0 ${T}2`, "end", "copy running-config startup-config"].join("\n")},
      ];
    },
    hilfen: {frage: ["Welche Netze gibt es, und wer muss welches kennen? Zeichne: LAN Zentrale, Standleitung (/30), LAN Süd. Welche Route braucht jeder Router, damit Hin- UND Rückweg stimmen?"],
      bereich: [{geraet: "r2"}, {geraet: "r1"}],
      konkret: ["Süd: Gi0/0 = erste Adresse im Süd-Netz, Gi0/1 = .2 der Standleitung, Default-Route auf .1. Zentrale: „ip route <Süd-Netz> 255.255.255.0 <.2 der Standleitung>“."]},
    titel: "Projekt: Standort Süd anbinden",
    briefing: "Moin! Der neue Router für Standort Süd ist geliefert, verkabelt und nackt wie ein Neuwagen ohne Zulassung. Die PCs in Süd haben ihre Adressen schon. Bitte so einrichten, dass Süd an den Server in der Zentrale kommt und über die Zentrale ins Internet.\n\nTimo",
    symptom: "Ein neuer Standort-Router muss eingerichtet werden.",
    erklaerung: "Zwei Standorte brauchen Routen in beide Richtungen: Die Zentrale muss das Süd-Netz kennen (statische Route), Süd schickt alles Unbekannte per Default-Route zur Zentrale. Das Transfernetz ist ein /30 – genau zwei nutzbare Adressen, eine je Router. Ins Internet geht Süd über das NAT der Zentrale.",
    quelle: "04-AP1-Netzwerk", lohn: {euro: 260, ruf: 5}});

  /* ===== Stufe 5 · Kessler Präzisionsteile (Dr. Ines Kessler) ===== */
  t({id: "mittel-01", reihe: 1, kunde: "mittelstand", karriere: 5, stufe: "AP1", vorlage: "dmz", vSeed: 61, minuten: 6,
    injektoren: [{name: "fw-reihenfolge"}],
    titel: "Webshop intern nicht erreichbar",
    briefing: "Guten Abend.\nDer Vertrieb erreicht seit heute den eigenen Webshop nicht mehr, Kunden von außen hingegen schon. Laut Änderungsprotokoll wurde eine „Schutzregel für die DMZ“ ergänzt. Ich bitte um Korrektur und eine Zeile für das Betriebshandbuch.\n\nDr. Ines Kessler",
    symptom: "Der Vertrieb erreicht den eigenen Webshop nicht mehr.",
    lohn: {euro: 170, ruf: 3}});

  t({id: "mittel-02", reihe: 2, kunde: "mittelstand", karriere: 5, stufe: "AP1", vorlage: "dmz", vSeed: 62, minuten: 5,
    injektoren: [{name: "fw-regel-fehlt", ziel: "r1"}],
    titel: "Kein Internet im Büro",
    briefing: "Guten Abend.\nKein Arbeitsplatz im Büro kommt ins Internet. Der Webshop ist von außen erreichbar. Beim Aufräumen der Firewall wurden „überflüssige Regeln“ entfernt.\n\nDr. Ines Kessler",
    symptom: "Das Büro-LAN kommt nicht mehr ins Internet.",
    lohn: {euro: 160, ruf: 3}});

  t({id: "mittel-03", reihe: 3, kunde: "mittelstand", karriere: 5, stufe: "AP2", vorlage: "dmz", vSeed: 63, minuten: 6,
    injektoren: [{name: "dmz-regel-fehlt"}],
    skills: ["lab.dmz", "lab.fw"],
    titel: "Kunden stehen vor verschlossener Tür",
    briefing: "Guten Abend.\nUnsere Kunden erreichen den Webshop nicht. Intern ist er erreichbar. Die Weiterleitung auf Port 443 ist laut Konfiguration vorhanden. Bitte prüfen Sie die Regeln zwischen Internet und DMZ.\n\nDr. Ines Kessler",
    symptom: "Der Webshop ist von außen nicht erreichbar, intern schon.",
    lohn: {euro: 190, ruf: 3}});

  t({id: "mittel-04", reihe: 4, kunde: "mittelstand", karriere: 5, stufe: "AP2", vorlage: "dmz", vSeed: 64, minuten: 7,
    injektoren: [{name: "portfwd-falsch"}],
    titel: "Weiterleitung ins Leere",
    briefing: "Guten Abend.\nNach dem Firmware-Update meldet der Webshop Kunden „Verbindung abgelehnt“. Der Webshop läuft, intern funktioniert HTTPS. Mir fällt auf, dass in der Weiterleitung jetzt „80“ steht.\n\nDr. Ines Kessler",
    symptom: "Kunden bekommen „Verbindung abgelehnt“.",
    lohn: {euro: 190, ruf: 3}});
})();
