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

  /* ===== Stufe 3 · Arztpraxis, zweite Reihe (Sabine Krämer) =====
     Drei Störungen, die vorher kein Auftrag auslöste: Port-Security am Gästeport, erschöpfter DHCP-Pool,
     Adresskonflikt im Pool. Jeder Fall hat einen echten Startbruch mit eigenem Grundcode. */

  t({id: "praxis-08", reihe: 8, kunde: "praxis", karriere: 3, stufe: "AP1", vorlage: "praxis", vSeed: 81, minuten: 7,
    injektoren: [],
    skills: ["lab.portsec", "lab.switch"],
    umbau(n){
      const port = "Fa0/21";
      const falsch = String(n.geraete.gast.hw.macs.eth0).replace(/.$/, c => (parseInt(c, 16) ^ 1).toString(16));
      /* Der IT-Dienstleister hat den Gastport auf die MAC des alten Leihgeräts festgelegt. */
      Modell.setzen(n, "sw1", `ports.${port}.portSecurity`, {max: 1, macs: [falsch], verstoss: "shutdown"});
    },
    zieleFn: (n) => [
      {typ: "erreichbar", von: "gast", nach: "www.beispiel.de", proto: "http",
       text: "Das Gäste-Laptop kommt ins Internet"}],
    loesungFn: (n) => [
      {aktion: "errdisable", geraet: "sw1", port: "Fa0/21", text: "SW-Praxis: Port Fa0/21 wieder freigeben (shutdown / no shutdown)."},
      {geraet: "sw1", setzen: {"ports.Fa0/21.portSecurity": {max: 1, macs: [n.geraete.gast.hw.macs.eth0], verstoss: "shutdown"}},
       text: "SW-Praxis: Port-Security auf die MAC des Gäste-Laptops umtragen."}],
    hilfen: {frage: ["Der Gast hat Kabel und Adresse, der Port ist nicht abgeschaltet – und trotzdem kommt kein einziges Paket durch. Was kann einen Switchport sonst noch dichtmachen?"],
      bereich: [{geraet: "sw1"}],
      konkret: ["Auf SW-Praxis steht am Port Fa0/21 „Port-Security“ mit einer festen MAC-Adresse. Der Laptop hat eine andere MAC – der Switch schaltet den Port deshalb ab (err-disabled)."]},
    titel: "Gäste-WLAN: Kabel ja, Netz nein",
    briefing: "Hallo,\nunser Gäste-Laptop kommt nicht mehr ins Internet, obwohl das Kabel steckt und die Adresse stimmt. Der Techniker der Praxis-Software war letzte Woche da und hat „den Port abgesichert“. Seitdem geht am Gästeplatz nichts mehr. Bitte schauen Sie nach.\n\nSabine Krämer",
    symptom: "Der Gäste-Laptop hat Kabel und Adresse, bekommt aber keine Verbindung.",
    erklaerung: "Port-Security merkt sich, welche MAC-Adressen an einem Switchport erlaubt sind. Eine fremde MAC führt je nach Einstellung zum Verwerfen oder – wie hier – zum Abschalten des Ports (err-disabled). Der Port bleibt aus, bis er wieder freigegeben und der Eintrag berichtigt wird. Fachlich richtig ist die Funktion trotzdem: Sie verhindert, dass jemand ein fremdes Gerät an einen festen Platz hängt.",
    quelle: "VLAN – Lernfassung (§ 3: Port-Security) · IEEE 802.1X (Zugangskontrolle am Port)", lohn: {euro: 90, ruf: 3}});

  t({id: "praxis-09", reihe: 9, kunde: "praxis", karriere: 3, stufe: "AP1", vorlage: "praxis", vSeed: 82, minuten: 7,
    injektoren: [],
    umbau(n){
      /* Der Dienstleister hat den Gästepool auf die Gateway-Adresse gelegt – dort ist nichts zu vergeben. */
      const gip = n.geraete.gast.running.if.eth0.ip, g3 = +gip.split(".")[2], G = gip.replace(/\d+$/, "");
      Modell.setzen(n, "gast", "if.eth0.ip", ""); Modell.setzen(n, "gast", "if.eth0.dhcp", true);
      Modell.setzen(n, "r1", "dhcp", {ausgeschlossen: [], pools: [{name: "GAESTE", netz: G + "0", maske: "255.255.255.0",
        gw: G + "1", dns: n.geraete.gast.running.if.eth0.dns, start: G + "1", anzahl: 1}]});
      Modell.setzen(n, "r1", `if.Gi0/0.${g3}.helper`, [n.geraete.srv.running.if.eth0.ip]);
    },
    zieleFn: (n) => [
      {typ: "erreichbar", von: "gast", nach: "www.beispiel.de", proto: "http",
       text: "Das Gäste-Laptop kommt ins Internet"}],
    loesungFn: (n) => {
      const gip = n.geraete.gast.running.if.eth0.ip, G = gip.replace(/\d+$/, "");
      return [{geraet: "r1", setzen: {"dhcp.pools": [{name: "GAESTE", netz: G + "0", maske: "255.255.255.0", gw: G + "1",
          dns: n.geraete.gast.running.if.eth0.dns, start: G + "100", anzahl: 50}]},
        text: `R-Praxis: Gästepool auf freie Adressen legen (${G}100 bis ${G}149).`}];
    },
    hilfen: {frage: ["Der Server läuft, das Relay ist eingetragen, und der Gast fragt brav an. Warum bekommt er trotzdem nichts? Schau in den Pool: Welche Adresse darf der Server überhaupt vergeben?"],
      bereich: [{geraet: "r1"}],
      konkret: ["Der Pool „GAESTE“ umfasst genau eine Adresse – und das ist die Gateway-Adresse des Gästenetzes, die der Router selbst trägt. Der Server findet also nichts Freies und schickt kein Angebot."]},
    titel: "Gäste bekommen keine Adresse mehr",
    briefing: "Hallo,\nseit der Umstellung bekommt der Gäste-Laptop keine Adresse mehr, er zeigt so eine 169.254er Nummer. Vorher ging das. Der Server läuft, unsere Rechner haben alle ihre Adressen. Der neue Dienstleister hat am Router „den Gästebereich angelegt“.\n\nSabine Krämer",
    symptom: "Das Gäste-Laptop zeigt eine 169.254er-Adresse statt einer aus dem Gästenetz.",
    erklaerung: "Ein DHCP-Server vergibt nur Adressen, die in seinem Pool liegen und frei sind. Ist der Pool zu klein – oder liegt er auf Adressen, die fest vergeben sind – findet er nichts und schweigt. Der Client wartet, bekommt kein Angebot und gibt sich selbst eine APIPA-Adresse (169.254.x.x); damit erreicht er nur andere APIPA-Geräte, kein Gateway, kein Internet.",
    quelle: "RFC 2131 (DHCP) · RFC 3927 (APIPA)", lohn: {euro: 95, ruf: 3}});

  t({id: "praxis-10", reihe: 10, kunde: "praxis", karriere: 3, stufe: "AP2", vorlage: "praxis", vSeed: 83, minuten: 8,
    injektoren: [],
    umbau(n){
      /* Ein Kollege hat dem Empfangs-PC die Adresse des Gästepools gegeben; der Pool liegt auf dieser Adresse. */
      const eip = n.geraete.empfang.running.if.eth0.ip, E = eip.replace(/\d+$/, "");
      const gip = n.geraete.gast.running.if.eth0.ip, g3 = +gip.split(".")[2], G = gip.replace(/\d+$/, "");
      const doppelt = G + eip.split(".")[3];
      Modell.setzen(n, "empfang", "if.eth0.ip", doppelt);
      Modell.setzen(n, "empfang", "if.eth0.gw", G + "1");
      Modell.setzen(n, "gast", "if.eth0.ip", ""); Modell.setzen(n, "gast", "if.eth0.dhcp", true);
      Modell.setzen(n, "r1", "dhcp", {ausgeschlossen: [], pools: [{name: "GAESTE", netz: G + "0", maske: "255.255.255.0",
        gw: G + "1", dns: n.geraete.gast.running.if.eth0.dns, start: doppelt, anzahl: 1}]});
      Modell.setzen(n, "r1", `if.Gi0/0.${g3}.helper`, [n.geraete.srv.running.if.eth0.ip]);
    },
    zieleFn: (n) => [
      {typ: "erreichbar", von: "gast", nach: "www.beispiel.de", proto: "http",
       text: "Das Gäste-Laptop kommt ins Internet"},
      {typ: "erreichbar", von: "behandlung", nach: "empfang", proto: "icmp",
       text: "Behandlung und Empfang erreichen sich"}],
    loesungFn: (n) => {
      const eip = n.geraete.empfang.running.if.eth0.ip, E = eip.replace(/\d+$/, "");
      const gip = n.geraete.gast.running.if.eth0.ip, G = gip.replace(/\d+$/, "");
      return [{geraet: "empfang", setzen: {"if.eth0.ip": E + eip.split(".")[3], "if.eth0.gw": E + "1"},
        text: `PC-Empfang: eigene Adresse ${E}${eip.split(".")[3]} im Verwaltungsnetz statt der doppelten ${eip} eintragen.`},
        {geraet: "r1", setzen: {"dhcp.pools": [{name: "GAESTE", netz: G + "0", maske: "255.255.255.0", gw: G + "1",
          dns: n.geraete.gast.running.if.eth0.dns, start: G + "100", anzahl: 50}]},
         text: `R-Praxis: Gästepool auf freie Adressen legen (${G}100 bis ${G}149).`}];
    },
    hilfen: {frage: ["Der Gästepool hat genau eine Adresse. Wer trägt die sonst noch – und was macht ein Server mit einer Pooladresse, die er doppelt im Netz sieht?"],
      bereich: [{geraet: "r1"}, {geraet: "empfang"}, {geraet: "gast"}],
      konkret: ["Der Empfangs-PC trägt jetzt eine Adresse aus dem Gästenetz – dieselbe, die der Gästepool anbietet. Der Server prüft jede Pooladresse, findet sie belegt und vergibt sie nicht; außerdem antworten auf die doppelte Adresse zwei Geräte."]},
    titel: "Zwei Rechner, eine Nummer",
    briefing: "Hallo,\nbei uns spinnt es: Mal antwortet der Empfangs-PC nicht, mal der im Behandlungsraum, und der Gäste-Laptop bekommt gar keine Adresse mehr. Wir haben gestern einen Rechner umgestellt und dabei „nur die Nummer abgeschrieben“.\n\nSabine Krämer",
    symptom: "Zwei Behandlungsplätze antworten unregelmäßig, der Gast bekommt keine Adresse.",
    erklaerung: "Eine IP-Adresse darf im Netz nur einmal vorkommen. Tragen zwei Geräte dieselbe, antwortet mal das eine, mal das andere (ARP-Konflikt), und ein DHCP-Server, der diese Adresse in seinem Pool findet, überspringt sie als belegt. Die Doppelvergabe am Arbeitsplatz ist die Ursache, der leere Gästepool nur die Folge – beides gehört berichtigt.",
    quelle: "RFC 5227 (IPv4 Address Conflict Detection) · RFC 2131 (DHCP)", lohn: {euro: 110, ruf: 4}});

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
    injektoren: [], alleZiele: true, werkszustand: ["r2"],
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

  /* ===== Stufe 4 · Autohaus, zweite Reihe: zwei Switches, ein Konflikt, eine Schleife ===== */

  t({id: "autohaus-08", reihe: 8, kunde: "autohaus", karriere: 4, stufe: "AP1", vorlage: "standorte", vSeed: 58, minuten: 7,
    injektoren: [],
    skills: ["lab.vlan", "lab.trunk"],
    umbau(n){
      /* Zweiter Switch im Lager; die Strecke zwischen den Switches ist an beiden Enden ein Trunk. */
      Modell.geraet(n, "switch", {id: "sw3", name: "SW-Lager", x: 470, y: 320});
      Modell.geraet(n, "pc", {id: "lager", name: "PC-Lager", x: 470, y: 470, skin: null});
      Modell.verbinden(n, {geraet: "sw3", port: "Gi0/1"}, {geraet: "sw2", port: "Gi0/2"});
      for (const [sw, p] of [["sw3", "Gi0/1"], ["sw2", "Gi0/2"]]) Modell.setzen(n, sw, `ports.${p}.modus`, "trunk");
      Modell.vlan(n, "sw3", 70, "Lager");
      /* Fehler: SW-Lager hat am Trunk Native VLAN 70, SW-Filiale bleibt bei 1. */
      Modell.setzen(n, "sw3", "ports.Gi0/1.nativeVlan", 70);
      /* Der neue Lager-PC hängt an SW-Lager und muss über die Filiale in die Zentrale. */
      const B = Modell.lesen(n.geraete.werkstatt.running, "if.eth0.ip").replace(/\d+$/, "");
      Modell.setzen(n, "lager", "if.eth0.ip", B + "31");
      Modell.setzen(n, "lager", "if.eth0.maske", "255.255.255.0");
      Modell.setzen(n, "lager", "if.eth0.gw", B + "1");
      Modell.setzen(n, "lager", "if.eth0.dns", "");
      Modell.verbinden(n, {geraet: "lager", port: "eth0"}, {geraet: "sw3", port: "Fa0/1"});
    },
    zieleFn: (n) => [
      {typ: "erreichbar", von: "lager", nach: "srv", proto: "tcp", port: 445,
       text: "Der Lager-PC öffnet die Auftragsdaten in der Zentrale"}],
    loesungFn: () => [
      {geraet: "sw3", setzen: {"ports.Gi0/1.nativeVlan": 1},
       text: "SW-Lager: Native VLAN am Trunk auf 1 setzen (switchport trunk native vlan 1)."}],
    hilfen: {frage: ["Zwischen den beiden Switches läuft ein Trunk. Ungetaggte Frames – wer entscheidet, in welchem VLAN die ankommen? Und gilt diese Entscheidung auf beiden Seiten gleich?"],
      bereich: [{geraet: "sw3"}, {geraet: "sw2"}],
      konkret: ["Am Trunk von SW-Lager steht Native VLAN 70, auf der Gegenseite 1. Ungetaggte Frames aus VLAN 1 landen damit im Lager-VLAN und umgekehrt – der Lager-PC und die Zentrale sprechen über zwei verschiedene Netze."]},
    titel: "Zwei Switches, zwei Meinungen",
    briefing: "Moin! Wir haben im Lager einen zweiten Switch gesetzt, weil dort ein Arbeitsplatz und später Kameras dazukommen. Der Lager-PC kommt nicht an die Auftragsdaten in der Zentrale, alle anderen Plätze laufen. Beide Switches leuchten grün, Kabel sind neu.\n\nTimo",
    symptom: "Der neue Lager-PC erreicht die Zentrale nicht, alle anderen Plätze laufen.",
    erklaerung: "Ein Trunk kann ungetaggte Frames nur dann richtig weitergeben, wenn beide Seiten dasselbe Native VLAN verwenden. Ist es verschieden, landet ein ungetaggter Frame auf der einen Seite in einem anderen VLAN als auf der anderen – der Lager-PC ist damit in einem anderen Netz als die Zentrale, obwohl die Leitung steht. Ein Blick in die Konfiguration beider Trunk-Enden zeigt den Unterschied; CDP meldet ihn sogar.",
    quelle: "VLAN – Lernfassung (§ 3: Native VLAN am Trunk) · IEEE 802.1Q", lohn: {euro: 140, ruf: 4}});


  t({id: "autohaus-09", reihe: 9, kunde: "autohaus", karriere: 4, stufe: "AP1", vorlage: "standorte", vSeed: 60, minuten: 6,
    injektoren: [],
    umbau(n){ Modell.geraetSetzen(n, "srv", "an", false); },
    zieleFn: (n) => [
      {typ: "erreichbar", von: "verkauf", nach: "srv", proto: "tcp", port: 445,
       text: "Der Verkauf öffnet die Auftragsdaten auf dem Server"},
      {typ: "erreichbar", von: "annahme", nach: "srv", proto: "tcp", port: 445,
       text: "Die Annahme öffnet die Auftragsdaten auf dem Server"}],
    loesungFn: () => [
      {aktion: "an", geraet: "srv", text: "Server in der Zentrale einschalten (Netzschalter prüfen)."}],
    hilfen: {frage: ["Kein Gerät im Netz hat sich geändert – und trotzdem kommt niemand an den Server. Was nützt die beste Verkabelung, wenn ein Gerät gar nicht arbeitet?"],
      bereich: [{geraet: "srv"}],
      konkret: ["Der Server ist ausgeschaltet: Sein Switchport hat keinen Link mehr, deshalb kommt kein Frame an. Erst einschalten, dann weiter suchen."]},
    titel: "Der Server ist einfach weg",
    briefing: "Moin! Seit heute Morgen kommt niemand mehr an die Auftragsdaten. Internet geht, Drucken geht, nur der Server ist wie vom Erdboden verschluckt. Gestern hat der Reinigungstrupp im Serverraum gesaugt, vielleicht hat da einer den Schalter erwischt.\n\nTimo",
    symptom: "Kein Arbeitsplatz erreicht mehr den Server, alles andere läuft.",
    erklaerung: "Ein ausgeschaltetes Gerät ist am Switch nicht mehr vorhanden: Die Leitung hat keinen Link, Frames kommen dort nicht an. Vor jeder Fehlersuche auf höheren Schichten prüft man deshalb Schicht 1 – Strom, Kabel, Link-LED. Ein ausgeschalteter Server sieht im Netz genauso aus wie ein gezogenes Kabel; der Unterschied ist nur vor Ort zu sehen.",
    quelle: "04-AP1-Netzwerk (Schichtenmodell, Fehlersuche von unten)", lohn: {euro: 130, ruf: 4}});

  t({id: "autohaus-10", reihe: 10, kunde: "autohaus", karriere: 4, stufe: "AP2", vorlage: "standorte", vSeed: 61, minuten: 7,
    injektoren: [],
    umbau(n){
      /* Der Werkstatt-PC hat eine feste Adresse, der neue DHCP-Pool beginnt genau dort. */
      const ip = n.geraete.werkstatt.running.if.eth0.ip, B = ip.replace(/\d+$/, "");
      Modell.setzen(n, "r2", "dhcp", {ausgeschlossen: [], pools: [{name: "FILIALE", netz: B + "0", maske: "255.255.255.0",
        gw: B + "1", dns: Modell.lesen(n.geraete.werkstatt.running, "if.eth0.dns"), start: ip, anzahl: 1}]});
      Modell.geraet(n, "pc", {id: "azubi", name: "PC-Azubi", x: 760, y: 540});
      Modell.verbinden(n, {geraet: "azubi", port: "eth0"}, {geraet: "sw2", port: "Fa0/3"});
      Modell.setzen(n, "azubi", "if.eth0.dhcp", true);
    },
    zieleFn: (n) => [
      {typ: "dhcp", von: "azubi", text: "Der neue Ausbildungsplatz bekommt automatisch eine Adresse"}],
    loesungFn: (n) => {
      const ip = n.geraete.werkstatt.running.if.eth0.ip, B = ip.replace(/\d+$/, "");
      return [{geraet: "r2", setzen: {"dhcp.pools": [{name: "FILIALE", netz: B + "0", maske: "255.255.255.0", gw: B + "1",
        dns: Modell.lesen(n.geraete.werkstatt.running, "if.eth0.dns"), start: B + "100", anzahl: 50}]},
        text: "R-Filiale: Pool auf einen freien Bereich legen (start …100, 50 Adressen)."}];
    },
    hilfen: {frage: ["Der Pool hat eine Adresse. Wer trägt die noch – und was macht der Server mit einer Adresse, die schon vergeben ist?"],
      bereich: [{geraet: "r2"}, {geraet: "werkstatt"}],
      konkret: ["Der PC-Werkstatt trägt genau die Adresse, mit der der Pool beginnt und endet. Der Server findet nichts Freies und schickt kein Angebot."]},
    titel: "Der Ausbildungsplatz bekommt keine Adresse",
    briefing: "Moin! Wir haben einen Ausbildungsplatz eingerichtet. Der Rechner bekommt keine Adresse, er zeigt so eine 169.254er Nummer. Der Router in der Filiale verteilt die Adressen, der läuft. Am Pool hat der Kollege „nur schnell was eingetragen“.\n\nTimo",
    symptom: "Der neue Ausbildungsplatz zeigt 169.254.x.x statt einer Adresse aus dem Filialnetz.",
    erklaerung: "Ein DHCP-Pool muss einen Bereich freier Adressen umfassen. Beginnt und endet er auf einer Adresse, die ein Gerät fest trägt, ist nichts zu vergeben: Der Server prüft die Adresse, findet sie belegt und schweigt. Der Client fällt nach mehreren Versuchen auf APIPA zurück (169.254.x.x) und erreicht damit kein Gateway.",
    quelle: "RFC 2131 (DHCP) · RFC 3927 (APIPA)", lohn: {euro: 150, ruf: 4}});

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

  /* ===== Stufe 6 · Planwerk Konstruktion (Jana Wolff) – Storage & Cloud =====
     Der Kunde war bis 1.2 angelegt, aber nicht erreichbar (KARRIERE_MAX = 5). Ab hier ist er erreichbar:
     drei Aufträge am NAS; sie schließen die Fertigkeit „lab.storage“ an, die bisher nur im Wiki stand. */

  t({id: "storage-01", reihe: 1, kunde: "storage", karriere: 6, stufe: "AP2", vorlage: "buero", vSeed: 71, minuten: 8,
    injektoren: [],
    skills: ["lab.storage", "lab.link"],
    umbau(n){
      /* Das NAS steht im Serverraum; sein Netzteil hängt in einer abschaltbaren Steckdosenleiste. */
      Modell.geraet(n, "nas", {id: "nas", name: "NAS-Projekte", x: 760, y: 540});
      const S1 = Modell.lesen(n.geraete.srv.running, "if.eth0.ip").replace(/\d+$/, "");
      Modell.verbinden(n, {geraet: "nas", port: "eth0"}, {geraet: "sw2", port: "Fa0/2"});
      Modell.setzen(n, "nas", "if.eth0.ip", S1 + "40"); Modell.setzen(n, "nas", "if.eth0.maske", "255.255.255.0");
      Modell.setzen(n, "nas", "if.eth0.gw", S1 + "1"); Modell.setzen(n, "nas", "if.eth0.dns", n.geraete.srv.running.if.eth0.ip);
      Modell.setzen(n, "nas", "dienste.datei", {an: true});
      Modell.geraetSetzen(n, "nas", "an", false);
    },
    zieleFn: (n) => [
      {typ: "erreichbar", von: "pc2", nach: "nas", proto: "tcp", port: 445,
       text: "PC-Sekretariat erreicht die Projektablage auf dem NAS"}],
    loesungFn: () => [
      {aktion: "an", geraet: "nas", text: "NAS einschalten (Netzschalter und Steckdosenleiste prüfen)."}],
    hilfen: {frage: ["Kein Gerät wurde umkonfiguriert, die Ablage ist trotzdem weg. Was sieht ein Switch von einem Gerät, das gar nicht arbeitet?"],
      bereich: [{geraet: "nas"}, {geraet: "sw2"}],
      konkret: ["Das NAS hat keinen Strom: Sein Switchport hat keinen Link, Frames kommen dort nicht an. Schicht 1 zuerst – Strom, Kabel, Link-LED."]},
    titel: "Die Projektablage ist verschwunden",
    briefing: "Guten Morgen,\nseit heute früh erreichen wir unsere Projektablage nicht mehr. Der Server läuft, das Internet geht. Gestern Abend hat der Hausmeister im Serverraum die Steckdosenleiste „aufgeräumt“, weil das Kabel im Weg war.\n\nJana Wolff",
    symptom: "Die Projektablage auf dem NAS ist für alle unerreichbar.",
    erklaerung: "Ein ausgeschaltetes Gerät ist im Netz nicht vorhanden: Am Switch erlischt der Link, Frames kommen nicht mehr an. Ein fehlendes NAS sieht für den Anwender genauso aus wie ein Kabelbruch – der Unterschied ist nur vor Ort zu sehen. Deshalb prüft man vor jeder Fehlersuche auf höheren Schichten erst Strom, Kabel und Link.",
    quelle: "04-AP1-Netzwerk (Schichtenmodell) · BSI IT-Grundschutz, INF.1 (Serverraum)", lohn: {euro: 200, ruf: 4}});

  t({id: "storage-02", reihe: 2, kunde: "storage", karriere: 6, stufe: "AP2", vorlage: "buero", vSeed: 72, minuten: 7,
    injektoren: [],
    skills: ["lab.storage", "lab.ports"],
    umbau(n){
      Modell.geraet(n, "nas", {id: "nas", name: "NAS-Projekte", x: 760, y: 540});
      const S1 = Modell.lesen(n.geraete.srv.running, "if.eth0.ip").replace(/\d+$/, "");
      Modell.verbinden(n, {geraet: "nas", port: "eth0"}, {geraet: "sw2", port: "Fa0/2"});
      Modell.setzen(n, "nas", "if.eth0.ip", S1 + "40"); Modell.setzen(n, "nas", "if.eth0.maske", "255.255.255.0");
      Modell.setzen(n, "nas", "if.eth0.gw", S1 + "1"); Modell.setzen(n, "nas", "if.eth0.dns", n.geraete.srv.running.if.eth0.ip);
      /* Nach dem Update läuft der Dateidienst nicht mehr: pingbar, aber die Freigabe ist zu. */
      Modell.setzen(n, "nas", "dienste.datei", {an: false});
    },
    zieleFn: (n) => [
      {typ: "erreichbar", von: "pc1", nach: "nas", proto: "tcp", port: 445,
       text: "PC-Albers öffnet die Projektablage auf dem NAS"},
      {typ: "erreichbar", von: "pc1", nach: "nas", proto: "icmp",
       text: "PC-Albers erreicht das NAS (Ping)"}],
    loesungFn: () => [
      {geraet: "nas", setzen: {"dienste.datei.an": true},
       text: "NAS: Dateidienst (SMB, Port 445) wieder starten."}],
    hilfen: {frage: ["Der Ping kommt an, die Freigabe aber nicht. Was ist auf einem Gerät noch zu prüfen, wenn der Weg dorthin steht?"],
      bereich: [{geraet: "nas"}],
      konkret: ["Auf dem NAS läuft der Dateidienst nicht mehr. Das Gerät antwortet auf Ping (Schicht 3), aber an Port 445 lauscht niemand – der Verbindungsaufbau wird abgelehnt."]},
    titel: "Ping geht, Freigabe nicht",
    briefing: "Hallo,\nauf dem NAS laufen die Sicherungen, und seit dem Update gestern kommen wir nicht mehr an die Freigaben. Anpingen kann ich es, das habe ich probiert. Unsere CAD-Dateien liegen dort, bitte schnell.\n\nJana Wolff",
    symptom: "Das NAS antwortet auf Ping, die Dateifreigabe ist aber nicht erreichbar.",
    erklaerung: "Ein Gerät kann auf Schicht 3 erreichbar sein, während der Dienst auf Schicht 7 steht. Ein Ping prüft nur, ob Pakete hin und zurückkommen – nicht, ob der Dienst lauscht. Antwortet der Port nicht, wird die Verbindung abgelehnt (RST) oder läuft in eine Zeitüberschreitung; der Dienst gehört neu gestartet.",
    quelle: "04-AP1-Netzwerk (Schichten) · RFC 793 (TCP-Verbindungsaufbau)", lohn: {euro: 210, ruf: 4}});

  t({id: "storage-03", reihe: 3, kunde: "storage", karriere: 6, stufe: "AP2", vorlage: "buero", vSeed: 73, minuten: 8,
    injektoren: [],
    skills: ["lab.storage", "lab.ip"],
    umbau(n){
      /* Das NAS ist ausgepackt und angekabelt, aber noch nicht eingerichtet: keine Adresse eingetragen. */
      Modell.geraet(n, "nas", {id: "nas", name: "NAS-Projekte", x: 760, y: 540});
      Modell.verbinden(n, {geraet: "nas", port: "eth0"}, {geraet: "sw2", port: "Fa0/2"});
      Modell.setzen(n, "nas", "if.eth0.ip", ""); Modell.setzen(n, "nas", "if.eth0.maske", "");
      Modell.setzen(n, "nas", "if.eth0.gw", ""); Modell.setzen(n, "nas", "if.eth0.dns", "");
      Modell.setzen(n, "nas", "dienste.datei", {an: true});
    },
    zieleFn: (n) => [
      {typ: "erreichbar", von: "pc2", nach: "nas", proto: "tcp", port: 445,
       text: "PC-Sekretariat erreicht die Projektablage auf dem NAS"}],
    loesungFn: (n) => {
      const S1 = Modell.lesen(n.geraete.srv.running, "if.eth0.ip").replace(/\d+$/, "");
      return [{geraet: "nas", setzen: {"if.eth0.ip": S1 + "40", "if.eth0.maske": "255.255.255.0", "if.eth0.gw": S1 + "1", "if.eth0.dns": S1 + "5"},
        text: "NAS: eigene Adresse " + S1 + "40 mit Maske, Gateway und DNS eintragen."}];
    },
    hilfen: {frage: ["Das Kabel steckt, der Switch leuchtet – und trotzdem ist das NAS nicht erreichbar. Was fehlt einem Gerät, das frisch aus der Schachtel kommt?"],
      bereich: [{geraet: "nas"}, {geraet: "srv"}],
      konkret: ["Auf dem NAS ist keine IP-Adresse eingetragen: Ohne Adresse gibt es kein Ziel, an das ein Frame gehen könnte. Adresse, Maske, Gateway und DNS gehören eingetragen wie bei jedem festen Gerät im Servernetz."]},
    titel: "Das neue NAS ist nicht erreichbar",
    briefing: "Hallo,\nwir haben das neue NAS in den Serverraum gestellt und ans Netz gesteckt. Es leuchtet auch, aber kein Rechner findet es. Beim alten NAS musste man „nichts einstellen“, hat der Kollege gesagt. Können Sie es einrichten?\n\nJana Wolff",
    symptom: "Das neue NAS ist angekabelt, aber für keinen Rechner erreichbar.",
    erklaerung: "Ein Gerät im LAN braucht drei Einträge, damit es mitspielt: eine freie Adresse aus dem eigenen Netz, dieselbe Maske wie die anderen und – für fremde Netze – das Gateway; dazu den DNS-Server, wenn Namen aufgelöst werden sollen. Ein Server oder NAS bekommt eine feste Adresse, damit alle es immer unter derselben Nummer finden; Arbeitsplätze holen ihre Adresse per DHCP. Ohne Adresse hat ein Gerät im Netz kein Ziel.",
    quelle: "04-AP1-Netzwerk (Adressierung im LAN) · RFC 1918 (private Adressen)", lohn: {euro: 220, ruf: 5}});

})();
