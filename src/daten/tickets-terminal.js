"use strict";
/* ---------- Terminal-Aufträge (Plan – Ausbau 1.2, C4; Architektur § 9.5 „Arbeitsziele“) ----------
   Die Arbeit passiert im Terminal des Rechners: Befehle ausführen (Zielart „befehl“), Werte aus der Ausgabe ablesen und in
   der Mappe eintragen (Zielart „antwort“). salon-terminal kommt ohne Fehler im Netz aus – ein reiner Übungsauftrag.
   Befehle und Ausgaben wie in Windows (ipconfig, ping, netsh) bzw. Debian/Ubuntu mit systemd (systemctl).
   Quellen: Microsoft Learn „ipconfig“, „netsh interface ip“; systemctl(1) (freedesktop.org); Network – Lernfassung. */
(() => {
  const T = DATEN.ticketSpec;
  const t = spec => DATEN.tickets.push(T(spec));

  /* ===== Stufe 1 · Salon: Werte ablesen (Einstieg, kein Fehler im Netz) ===== */
  t({id: "salon-terminal", reihe: 7.5, kunde: "salon", karriere: 1, stufe: "E", art: "terminal", vorlage: "lan", vSeed: 19, minuten: 3,
    injektoren: [], ziele: [],
    zusatzZiele: [
      {typ: "befehl", geraet: "kasse", muster: "^ipconfig( /all)?$", beispiel: "ipconfig", text: "An der Kasse ipconfig ausgeführt"},
      {typ: "antwort", id: "ip", frage: "IPv4-Adresse der Kasse", pruefen: {art: "ip", geraet: "kasse"}, text: "IPv4-Adresse der Kasse notiert"},
      {typ: "antwort", id: "gw", frage: "Standardgateway der Kasse", pruefen: {art: "gw", geraet: "kasse"}, text: "Standardgateway der Kasse notiert"},
    ],
    loesung: [{geraet: "kasse", terminal: "ipconfig", nurLesen: true,
      text: "Kasse: ipconfig – die Zeilen „IPv4-Adresse“ und „Standardgateway“ ablesen und in der Mappe unter „Ziele“ eintragen"}],
    hilfen: {frage: ["Welcher Windows-Befehl zeigt Adresse, Maske und Gateway eines Rechners?"], bereich: [{geraet: "kasse"}],
      konkret: ["Doppelklick auf die Kasse öffnet ihr Terminal. Tipp ipconfig und lies die Zeilen „IPv4-Adresse“ und „Standardgateway“ ab."]},
    skills: ["lab.ip", "lab.gateway"],
    titel: "Zwei Zahlen für den Kassenhersteller",
    briefing: "Hi! Der Kassenhersteller richtet nächste Woche die Fernwartung ein und will vorher „die IP-Adresse der Kasse und das Standardgateway“ wissen. Ich hab keine Ahnung, wo das steht. Kannst du an der Kasse nachschauen und mir beides aufschreiben?\n\nLiebe Grüße aus dem Salon, Mira",
    symptom: "Mira braucht die IP-Adresse und das Standardgateway der Kasse.",
    erklaerung: "ipconfig zeigt unter Windows die IP-Konfiguration jedes Netzwerkadapters: IPv4-Adresse, Subnetzmaske und Standardgateway. Das Standardgateway ist der Router im eigenen Netz – an ihn schickt der Rechner alles, was nicht im eigenen Netz liegt. Mit ipconfig /all kommen MAC-Adresse, DHCP und DNS-Server dazu.",
    quelle: "Microsoft Learn: ipconfig · Network – Lernfassung",
    lohn: {euro: 30, ruf: 1}});

  /* ===== Stufe 1 · Bäckerei: Fernwartung, Gateway per netsh (AP1) ===== */
  t({id: "baeckerei-terminal", reihe: 10.5, kunde: "baeckerei", karriere: 1, stufe: "AP1", art: "terminal", vorlage: "lan", vSeed: 24, minuten: 6,
    injektoren: [{name: "gateway-falsch", ziel: "buero"}], maxZiele: 1,
    zusatzZiele: [
      {typ: "befehl", geraet: "buero", muster: "^ipconfig( /all)?$", beispiel: "ipconfig", text: "An PC-Backstube die Adressen angesehen (ipconfig)"},
      {typ: "befehl", geraet: "buero", muster: "^ping( -[a-z]+( \\d+)?)* 192\\.168\\.10\\.254$", beispiel: "ping 192.168.10.254", text: "Den Router angepingt (seine Adresse steht im Netzplan)"},
      {typ: "befehl", geraet: "buero", muster: "^(netsh interface ip(v4)? set address\\b.*|route( -p)? (add|change) 0\\.0\\.0\\.0\\b.*)$",
       beispiel: "netsh interface ip set address \"Ethernet\" static 192.168.10.17 255.255.255.0 192.168.10.254", text: "Gateway per Befehl korrigiert (netsh)"},
    ],
    loesung: [{geraet: "buero", terminal: "netsh interface ip set address \"Ethernet\" static 192.168.10.17 255.255.255.0 192.168.10.254",
      text: "PC-Backstube: Standardgateway per netsh auf den Router setzen (192.168.10.254)"}],
    hilfen: {frage: ["ipconfig zeigt das eingetragene Standardgateway. Ist das wirklich der Router? Vergleich mit dem Netzplan – und frag den Router selbst per ping."],
      bereich: [{geraet: "buero"}],
      konkret: ["Im Terminal von PC-Backstube: netsh interface ip set address \"Ethernet\" static 192.168.10.17 255.255.255.0 192.168.10.254"]},
    skills: ["lab.gateway", "lab.ping"],
    titel: "Backstube offline – nur per Fernwartung",
    briefing: "Der PC in der Backstube kommt nicht ins Internet, die Bestellungen für morgen hängen. Ich steh im Laden. Die Fernwartung auf den Rechner hab ich dir freigeschaltet, da kommst du nur mit Befehlen ran. Bitte nicht wieder irgendwas umbauen, nur reparieren.\n\nH. Kowalski",
    symptom: "PC-Backstube kommt nicht ins Internet; der Rest im Laden läuft.",
    lohn: {euro: 50, ruf: 1}});

  /* ===== Stufe 2 · Schreibbüro: Linux-Server, Dienst per systemctl (AP1) ===== */
  t({id: "buero-terminal", reihe: 5.5, kunde: "schreibbuero", karriere: 2, stufe: "AP1", art: "terminal", vorlage: "buero", vSeed: 38, minuten: 6,
    injektoren: [{name: "dienst-aus", ziel: "srv:http"}], maxZiele: 1,
    zusatzZiele: [
      {typ: "befehl", geraet: "srv", muster: "^(sudo )?systemctl (status|is-active) apache2(\\.service)?$", beispiel: "systemctl status apache2", text: "Auf dem Server nachgesehen, ob der Webdienst läuft (systemctl status)"},
      {typ: "befehl", geraet: "srv", muster: "^sudo systemctl (start|restart) apache2(\\.service)?$", beispiel: "sudo systemctl start apache2", text: "Webdienst im Terminal gestartet"},
    ],
    loesung: [{geraet: "srv", terminal: "sudo systemctl start apache2", text: "Server: sudo systemctl start apache2"}],
    hilfen: {frage: ["Der Name wird aufgelöst und der Server antwortet auf ping – welcher Teil fehlt dann noch für eine Webseite?"],
      bereich: [{geraet: "srv"}],
      konkret: ["Im Terminal des Servers: systemctl status apache2 zeigt „inactive (dead)“. sudo systemctl start apache2 startet ihn."]},
    skills: ["lab.ports", "lab.dns"],
    titel: "Intranet weg nach dem Update",
    briefing: "Guten Tag,\n1. das Intranet (server.buero.local) lädt seit dem Update gestern Abend nicht mehr;\n2. Dateiablage und Drucken funktionieren;\n3. der Server antwortet auf Ping.\nDer Server ist ein Linux-Rechner; Sie erreichen ihn über sein Terminal.\n\nKonrad Albers",
    symptom: "Das Intranet lädt nicht; Dateien und Drucken gehen.",
    lohn: {euro: 55, ruf: 1}});
})();
