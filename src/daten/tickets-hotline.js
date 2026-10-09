"use strict";
/* ---------- Hotline-Aufträge (Form „Hotline“; Plan – Ausbau 1.2, E1.4; Architektur § 9.6) ----------
   Der Kunde ruft an und beschreibt im Alltagston, was er sieht. Du hast drei Rückfragen. Gute Fragen grenzen ein
   (seit wann? was hat sich geändert? betrifft es alle? was zeigt das Lämpchen/die Meldung?), Fachbegriffe an Laien
   verschwenden eine Frage – das prüfst du ohnehin selbst. Danach geht es wie bei einer Störung im Labor weiter.
   Die Antworten passen zur Fehlerart des Auftrags; sie liegen als Karten in der Akte.
   Quelle (Fragetechnik): ITIL 4 Service Desk / Incident Management – Erfassung mit offenen, dann eingrenzenden Fragen;
   Fragen – Netzwerke planen (Fehlersuche von unten). */
(() => {
  const T = DATEN.ticketSpec;
  const t = spec => DATEN.tickets.push(T(spec));
  const F = (id, text, antwort, wert, warum) => ({id, text, antwort, wert, warum});

  /* ===== Salon: doppelte IP (Büro-PC hat die Adresse der Kasse) ===== */
  t({id: "salon-hotline", reihe: 6.5, kunde: "salon", karriere: 1, stufe: "E", form: "hotline", vorlage: "lan", vSeed: 25, minuten: 6,
    injektoren: [{name: "doppelte-ip", ziel: "buero"}],
    titel: "Mira ruft an: Mal geht’s, mal nicht",
    briefing: "Hallo, hier ist Mira vom Salon! Könnt ihr heute noch kommen? Die Kundschaft steht an der Kasse und ich werd noch verrückt!",
    symptom: "Mira vom Salon ruft an, atemlos und laut. ‚Bei uns spinnt seit gestern alles‘, sagt sie, ‚mal druckt die Kasse, mal nicht, und am Büro-PC ist das Internet weg‘. Sie hat es mit einem Neustart des Routers probiert, geholfen hat das nicht. Weil die Kundschaft an der Kasse steht, bittet sie uns, heute noch nachzusehen.",
    hotline: {max: 3, fragen: [
      F("seit", "Seit wann genau – und hat sich da etwas verändert?", "Seit gestern. Meine Nichte hat ihren alten Laptop als neuen Büro-PC aufgestellt und „die Netzwerkdaten vom alten PC abgeschrieben“.", "gut",
        "„Seit wann, was hat sich geändert?“ ist die stärkste Frage: Fast jede Störung beginnt mit einer Änderung."),
      F("wer", "Betrifft es nur einen Rechner oder mehrere?", "Komischerweise beide – mal die Kasse, mal den Büro-PC. Nie beide gleichzeitig.", "gut",
        "Wer ist betroffen? Abwechselnd zwei Geräte ist ein typisches Muster – zwei Geräte streiten sich um etwas."),
      F("meldung", "Zeigt der Bildschirm irgendeine Meldung?", "Ja! Heute früh stand unten rechts etwas von „Adresskonflikt“.", "gut",
        "Fehlermeldungen wörtlich erfragen – der Kunde liest sie vor, du deutest sie."),
      F("neustart", "Haben Sie den Router schon neu gestartet?", "Ja, zweimal. Danach ging’s kurz, dann wieder nicht.", "neutral",
        "Ein Neustart verschleiert oft nur das Muster – nützlich zu wissen, aber es grenzt nichts ein."),
      F("maske", "Welche IP-Adresse und Subnetzmaske hat der Rechner?", "Äh … wo sehe ich das? Ich bin Friseurin.", "schlecht",
        "Fachfragen kann ein Laie selten beantworten – Adresse und Maske prüfst du selbst mit ipconfig."),
      F("kabel", "Sind alle Kabel richtig eingesteckt?", "Ja, alle Lämpchen leuchten.", "neutral",
        "Gute Grundfrage – hier aber schon beantwortet: Wenn es mal geht, liegt es selten am Kabel."),
    ]},
    lohn: {euro: 45, ruf: 1}});

  /* ===== Bäckerei: Router-Port zum LAN abgeschaltet ===== */
  t({id: "baeckerei-hotline", reihe: 9.5, kunde: "baeckerei", karriere: 1, stufe: "AP1", form: "hotline", vorlage: "lan", vSeed: 26, minuten: 6,
    injektoren: [{name: "routerport-aus", ziel: "r1:Gi0/0"}],
    titel: "Kowalski ruft an: Internet weg",
    briefing: "Kowalski, Bäckerei. Internet ist weg. Überall. Die Kartenzahlung geht nicht, die Bestellungen gehen nicht raus. Machen Sie was.",
    symptom: "Kowalski von der Bäckerei ruft an, kurz angebunden. ‚Seit heute Morgen geht nichts mehr nach draußen‘, sagt er, ‚die Kartenzahlung fällt aus, und die Bestellungen gehen nicht raus‘. Im Laden druckt die Kasse weiter, nur ins Internet kommt kein einziges Gerät. Er hat einen Neustart probiert und alle Stecker nachgedrückt – ohne Erfolg, und ohne Kartenzahlung verdient er heute nichts.",
    hotline: {max: 3, fragen: [
      F("drinnen", "Geht im Laden selbst noch etwas – drucken, Kasse zum Büro-PC?", "Drucken geht, die Kasse findet den Bondrucker. Nur raus ins Internet nicht, an keinem Gerät.", "gut",
        "Grenzt sofort ein: Innen geht alles, also liegen Kabel, Switch und Adressen im LAN wohl richtig – es hakt am Weg nach draußen."),
      F("lampen", "Welche Lämpchen leuchten am Router?", "Das Internet-Lämpchen ist grün. Da, wo das Kabel zum grauen Verteiler geht, ist es dunkel.", "gut",
        "Lämpchen kann jeder beschreiben – und sie sind Schicht 1: Ein dunkler Port ist ein starker Hinweis."),
      F("aenderung", "Hat in den letzten Tagen jemand am Router gearbeitet?", "Der Techniker vom Kassensystem war gestern da. „Sicherheit einstellen“, hat er gesagt.", "gut",
        "Änderung erfragen – „gestern war jemand dran“ ist meistens die halbe Lösung."),
      F("dns", "Ist Ihr DNS-Server erreichbar?", "Mein was? Hören Sie, ich hab Teig im Ofen.", "schlecht",
        "Fachbegriffe verwirren und kosten Vertrauen. Ob DNS antwortet, prüfst du selbst."),
      F("browser", "Haben Sie es mit einem anderen Browser versucht?", "Es geht ja an keinem Gerät, auch an der Kasse nicht.", "neutral",
        "Wenn alle Geräte betroffen sind, liegt es nicht am Browser eines Rechners."),
      F("strom", "Hat der Router Strom?", "Ja, die Kiste blinkt wie immer.", "neutral",
        "Berechtigte Grundfrage – hier aber schnell erledigt."),
    ]},
    lohn: {euro: 55, ruf: 1}});

  /* ===== Schreibbüro: DHCP-Dienst auf dem Server aus ===== */
  t({id: "buero-hotline", reihe: 3.5, kunde: "schreibbuero", karriere: 2, stufe: "AP1", form: "hotline", vorlage: "buero", vSeed: 39, minuten: 7,
    injektoren: [{name: "dhcp-aus", ziel: "srv"}],
    titel: "Albers ruft an: Arbeitsplätze ohne Netz",
    briefing: "Albers, Schreibbüro Wortgenau, guten Morgen. Beide Arbeitsplätze haben seit heute früh weder Intranet noch Internet. Ich erwarte eine zügige Lösung.",
    symptom: "Albers vom Schreibbüro Wortgenau ruft an, betont sachlich. ‚Seit heute früh haben beide Arbeitsplätze weder Intranet noch Internet‘, sagt er, ‚auf dem Bildschirm steht eine Adresse, die mit 169 anfängt‘. Der Drucker druckt seine Testseiten, das Telefon läuft. Neu gestartet wurde schon, umgesteckt auch – ohne Erfolg, und zwei Kundinnen warten auf ihre Manuskripte.",
    hotline: {max: 3, fragen: [
      F("adresse", "Können Sie mir vorlesen, was bei „IPv4-Adresse“ steht? (Windows-Taste, cmd, ipconfig)", "169.254.31.7. Sagt Ihnen das etwas?", "gut",
        "Eine Anleitung mit Klickweg macht eine Fachfrage beantwortbar – und 169.254 heißt fast immer: DHCP klappt nicht."),
      F("server", "Ist am Server seit gestern etwas passiert?", "Unser Dienstleister hat gestern Abend Updates eingespielt und den Server neu gestartet.", "gut",
        "Änderung am zentralen Gerät erfragen – Dienste starten nach Updates nicht immer wieder."),
      F("alle", "Sind alle Geräte betroffen?", "Beide Arbeitsplätze. Der Drucker druckt allerdings noch Testseiten.", "gut",
        "Der Drucker hat eine feste Adresse und läuft – die Rechner mit automatischer Adresse nicht. Das grenzt ein."),
      F("relay", "Haben Sie die Lease erneuert und den Relay-Agent geprüft?", "Das sind Fragen für meinen Dienstleister, nicht für mich.", "schlecht",
        "Fachbegriffe an den Kunden zurückzugeben, wirkt wie Abwimmeln. Das prüfst du selbst."),
      F("neustart", "Haben Sie die Rechner neu gestartet?", "Selbstverständlich. Keine Änderung.", "neutral",
        "Eine Pflichtfrage, die hier nichts eingrenzt."),
      F("telefon", "Funktioniert das Telefon?", "Ja – sonst würde ich Sie kaum anrufen.", "neutral",
        "Höflich gemeint, bringt aber nichts."),
    ]},
    lohn: {euro: 70, ruf: 2}});

  /* ===== Praxis: Port des Behandlungsraums im falschen VLAN ===== */
  t({id: "praxis-hotline", reihe: 4.5, kunde: "praxis", karriere: 3, stufe: "AP1", form: "hotline", vorlage: "praxis", vSeed: 49, minuten: 8,
    injektoren: [{name: "vlan-falsch", ziel: "behandlung"}],
    titel: "Krämer ruft an: Behandlungsraum ohne Akten",
    briefing: "Krämer, Praxis Dr. Müller. Im Behandlungsraum geht seit heute Morgen nichts mehr – keine Patientenakte, kein Internet. Die nächste Patientin sitzt schon im Zimmer.",
    symptom: "Frau Krämer von der Praxis Müller ruft an, hörbar in Eile. ‚Seit heute Morgen geht im Behandlungsraum nichts mehr‘, sagt sie, ‚keine Patientenakte, kein Internet‘. Gestern wurde der Schreibtisch umgestellt und der Rechner an eine andere Dose gesteckt, geholfen hat das nicht. Sie bittet uns, sofort zu kommen, sonst warten die Patienten.",
    hotline: {max: 3, fragen: [
      F("umzug", "Was hat sich im Behandlungsraum verändert?", "Wir haben gestern den Schreibtisch umgestellt. Der Rechner hängt jetzt an der anderen Dose an der Wand.", "gut",
        "Änderung erfragen – eine andere Dose heißt ein anderer Switch-Port, und der kann anders eingestellt sein."),
      F("andere", "Geht es in den anderen Räumen?", "Ja, Empfang und Labor laufen ganz normal.", "gut",
        "Grenzt auf diesen einen Anschluss ein – Server und Internet laufen."),
      F("lampe", "Leuchtet am Rechner hinten das Lämpchen am Netzwerkkabel?", "Ja, grün, und es blinkt.", "gut",
        "Link ist da – Schicht 1 ist damit fast ausgeschlossen, du suchst weiter oben (VLAN, Adresse)."),
      F("vlan", "In welchem VLAN ist der Switchport?", "Ich weiß nicht mal, was ein Switch ist.", "schlecht",
        "Genau die richtige Vermutung – aber die falsche Frage an die falsche Person. Das schaust du selbst nach."),
      F("neustart", "Haben Sie den Rechner neu gestartet?", "Zweimal. Der Rechner startet, aber das Netz bleibt weg.", "neutral",
        "Pflichtfrage ohne neue Erkenntnis."),
      F("kabel", "Können Sie das alte Kabel wieder nehmen?", "Das reicht nicht bis zur neuen Dose.", "neutral",
        "Ein Kabeltausch ändert hier nichts – der Link ist ja da."),
    ]},
    lohn: {euro: 95, ruf: 2}});
})();
