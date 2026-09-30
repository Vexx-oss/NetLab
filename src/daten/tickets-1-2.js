"use strict";
/* ---------- Handgeschriebene Tickets, Karriere-Stufen 1 und 2 ----------
   Bauplan: Vorlage (spiel/vorlagen.js) + Injektor (spiel/injektoren.js) + Texte in Kundenstimme.
   Geräte-IDs der Vorlagen: lan = kasse, buero, drucker, sw1, r1, inet · buero = pc1, pc2, drucker, srv, sw1, sw2, r1, inet.
   Validierung: tests/tickets-hand.test.js (Fehler bricht mit erwartetem Grund, Lösung heilt alles). */
(() => {
  const T = DATEN.ticketSpec;
  const t = spec => DATEN.tickets.push(T(spec));

  /* ===== Stufe 1 · Salon Lockenwerk (Mira Kaya) ===== */
  t({id: "salon-01", reihe: 1, kunde: "salon", karriere: 1, stufe: "E", vorlage: "lan", vSeed: 11, minuten: 1,
    injektoren: [{name: "kabel-fehlt", ziel: "kasse"}],
    ziele: [{typ: "erreichbar", von: "kasse", nach: "drucker", proto: "tcp", port: 9100, text: "Die Kasse druckt Belege auf dem Drucker"}],
    titel: "Kasse ohne Netz",
    briefing: "Hi! Wir haben heute früh den Tresen umgestellt, und seitdem druckt die Kasse keine Belege mehr. Der Drucker selbst läuft, der Büro-PC kann drucken. Kannst du schnell draufschauen? Um neun kommt die erste Kundin.\n\nLiebe Grüße aus dem Salon, Mira",
    symptom: "Die Kasse druckt nicht mehr, seit der Tresen umgestellt wurde.",
    erklaerung: "Beim Umstellen ist das Netzwerkkabel der Kasse herausgerutscht. Ohne Kabel gibt es keinen Link (Schicht 1) – dann hilft keine Einstellung. Deshalb beginnt jede Fehlersuche unten: Steckt das Kabel, leuchtet der Port?",
    lohn: {euro: 30, ruf: 1}});

  t({id: "salon-02", reihe: 2, kunde: "salon", karriere: 1, stufe: "E", vorlage: "lan", vSeed: 12, minuten: 3,
    injektoren: [{name: "ip-tippfehler", ziel: "kasse"}],
    titel: "Die Kasse findet niemanden",
    briefing: "Hallo du! Meine Nichte hat gestern „nur kurz“ an der Kasse was eingestellt. Jetzt findet die Kasse weder den Drucker noch das Internet für die Kartenzahlung. Kabel steckt, das hab ich extra geprüft!\n\nLiebe Grüße aus dem Salon, Mira",
    symptom: "Seit gestern findet die Kasse weder Drucker noch Internet.",
    lohn: {euro: 35, ruf: 1}});

  t({id: "salon-03", reihe: 3, kunde: "salon", karriere: 1, stufe: "E", vorlage: "lan", vSeed: 13, minuten: 4,
    injektoren: [{name: "maske-falsch", ziel: "buero", param: {maske: "255.255.255.248"}}],
    skills: ["lab.netz", "lab.subnetz"],
    titel: "Nur der Büro-PC ist beleidigt",
    briefing: "Hi! Komische Sache: Die Kasse sieht den Büro-PC, aber der Büro-PC antwortet ihr nicht und kommt auch nicht mehr ins Internet. Ein Techniker vom Kassenhersteller war gestern da und hat „nur die Netzwerkeinstellungen angeschaut“.\n\nLiebe Grüße aus dem Salon, Mira",
    symptom: "Der Büro-PC antwortet der Kasse nicht und kommt nicht ins Internet.",
    lohn: {euro: 40, ruf: 1}});

  t({id: "salon-04", reihe: 4, kunde: "salon", karriere: 1, stufe: "E", vorlage: "lan", vSeed: 14, minuten: 3, vorhersage: true,
    injektoren: [{name: "gateway-fehlt", ziel: "buero"}],
    skills: ["lab.gateway", "lab.ping"],
    titel: "Drucker ja, Internet nein",
    briefing: "Hallo! Der Büro-PC druckt ganz normal, aber ins Internet kommt er nicht. Ich muss heute noch die Farbbestellung abschicken! Die Kasse kommt übrigens rein, nur der Büro-PC nicht.\n\nLiebe Grüße aus dem Salon, Mira",
    symptom: "Der Büro-PC druckt, kommt aber nicht ins Internet.",
    lohn: {euro: 40, ruf: 1}});

  t({id: "salon-05", reihe: 5, kunde: "salon", karriere: 1, stufe: "E", vorlage: "lan", vSeed: 15, minuten: 4,
    injektoren: [{name: "switchport-aus", ziel: "sw1:Fa0/2"}],
    skills: ["lab.link", "lab.switch"],
    titel: "Das Lämpchen blinkt nicht",
    briefing: "Hi! Am grauen Kasten, wo alle Kabel reingehen, ist bei einem Anschluss das Lämpchen aus. Genau da hängt der Büro-PC dran. Kabel hab ich schon zweimal neu gesteckt. Der Kasten wurde letzte Woche von jemandem „aufgeräumt“.\n\nLiebe Grüße aus dem Salon, Mira",
    symptom: "Der Büro-PC ist komplett offline, am Switch leuchtet sein Anschluss nicht.",
    lohn: {euro: 45, ruf: 1}});

  t({id: "salon-06", reihe: 6, kunde: "salon", karriere: 1, stufe: "E", vorlage: "lan", vSeed: 16, minuten: 4, vorhersage: true,
    injektoren: [{name: "drucker-umgezogen"}],
    titel: "Der Drucker ist umgezogen",
    briefing: "Hallo du! Der Drucker hat neue Patronen bekommen und dabei hat der Mann vom Service irgendwas „zurückgesetzt“. Seitdem druckt die Kasse nicht mehr. Der Drucker zeigt auf seinem Display eine andere Nummer als vorher, falls das hilft.\n\nLiebe Grüße aus dem Salon, Mira",
    symptom: "Nach dem Service druckt die Kasse nicht mehr.",
    lohn: {euro: 45, ruf: 1}});

  t({id: "salon-projekt", reihe: 7, kunde: "salon", karriere: 1, stufe: "E", art: "projekt", vorlage: "lan", vSeed: 17, minuten: 8,
    injektoren: [],
    umbau(n){
      const k = Modell.kabelAn(n, "drucker", "eth0"); if (k) Modell.trennen(n, k.kabel.id);
      for (const f of ["ip", "maske", "gw", "dns"]) Modell.setzen(n, "drucker", "if.eth0." + f, "");
      n.geraete.drucker.name = "Neuer Drucker"; n.geraete.drucker.x = 640; n.geraete.drucker.y = 470;
    },
    zieleFn: (n) => [
      {typ: "erreichbar", von: "kasse", nach: "drucker", proto: "tcp", port: 9100, text: "Die Kasse druckt auf dem neuen Drucker"},
      {typ: "erreichbar", von: "buero", nach: "drucker", proto: "icmp", text: "Der Büro-PC erreicht den neuen Drucker"}],
    loesungFn: (n, r) => [
      {aktion: "verbinden", a: {geraet: "drucker", port: "eth0"}, b: {geraet: "sw1", port: "Fa0/3"}, text: "Neuen Drucker per Kabel an den Switch (Fa0/3) anschließen."},
      {geraet: "drucker", setzen: {"if.eth0.ip": n.geraete.drucker.running.if.eth0.ip, "if.eth0.maske": r.maske, "if.eth0.gw": r.gw},
       text: `Feste Adresse im Salon-Netz geben: ${n.geraete.drucker.running.if.eth0.ip}, Maske ${r.maske}, Gateway ${r.gw}.`}],
    hilfen: {frage: ["Was braucht ein neues Gerät, damit es im Netz mitspielt? Denk an Kabel und an die drei Einträge Adresse, Maske, Gateway."],
      bereich: [{geraet: "drucker"}], konkret: ["Kabel zum Switch ziehen, dann im Inspektor eine freie Adresse aus dem Netz der Kasse eintragen – gleiche Maske, gleiches Gateway."]},
    titel: "Ein neuer Drucker",
    briefing: "Hi! Wir haben einen zweiten Drucker gekauft, der alte kommt ins Lager. Der neue steht schon neben der Kasse, aber angeschlossen hab ich nichts, da trau ich mich nicht ran. Kannst du ihn einrichten, sodass Kasse und Büro darauf drucken?\n\nLiebe Grüße aus dem Salon, Mira",
    symptom: "Ein neuer Drucker soll eingerichtet werden.",
    erklaerung: "Ein Gerät im LAN braucht Link (Kabel), eine freie Adresse aus dem Netz, dieselbe Maske wie die anderen und – für fremde Netze – das Gateway. Drucker bekommen feste Adressen, damit alle Rechner sie immer unter derselben Nummer finden.",
    lohn: {euro: 60, ruf: 2}});

  /* ===== Stufe 1 · Bäckerei Kowalski (Heinz Kowalski) ===== */
  t({id: "baeckerei-01", reihe: 8, kunde: "baeckerei", karriere: 1, stufe: "AP1", vorlage: "lan", vSeed: 21, minuten: 4,
    injektoren: [{name: "gateway-falsch", ziel: "kasse"}],
    titel: "Kartenzahlung tot",
    briefing: "Kartenterminal an der Theke geht nicht. Bargeld geht. Bondrucker geht. Die Kiste blinkt wie immer. Um sechs stehen die Leute Schlange.\n\nH. Kowalski",
    symptom: "An der Theke geht keine Kartenzahlung, Bons drucken klappt.",
    lohn: {euro: 45, ruf: 1}});

  t({id: "baeckerei-02", reihe: 9, kunde: "baeckerei", karriere: 1, stufe: "AP1", vorlage: "lan", vSeed: 22, minuten: 5,
    injektoren: [{name: "doppelte-ip"}],
    titel: "Mal geht's, mal nicht",
    briefing: "Seit der Neffe den Backstuben-PC neu eingerichtet hat, spinnt die Theke. Mal druckt der Bon, mal kommt eine Fehlermeldung von wegen Adresse. Hat der Junge was verstellt?\n\nH. Kowalski",
    symptom: "Theke und Backstube stören sich gegenseitig, Fehlermeldung zu einer Adresse.",
    lohn: {euro: 50, ruf: 1}});

  t({id: "baeckerei-03", reihe: 10, kunde: "baeckerei", karriere: 1, stufe: "AP1", vorlage: "lan", vSeed: 23, minuten: 5,
    injektoren: [{name: "routerport-aus"}],
    skills: ["lab.link", "lab.cli"],
    titel: "Die Kiste lässt niemanden raus",
    briefing: "Nach dem Stromausfall heute Nacht geht im Laden gar nichts mehr ins Internet. Drinnen reden die Geräte miteinander, der Bondrucker geht. Die Kiste hat ihre Lämpchen, aber eins ist aus.\n\nH. Kowalski",
    symptom: "Nach dem Stromausfall kommt kein Gerät mehr ins Internet.",
    lohn: {euro: 55, ruf: 1}});

  /* ===== Stufe 2 · Schreibbüro Albers (Konrad Albers) ===== */
  t({id: "buero-01", reihe: 1, kunde: "schreibbuero", karriere: 2, stufe: "E", vorlage: "buero", vSeed: 31, minuten: 4, vorhersage: true,
    injektoren: [{name: "dhcp-aus"}],
    titel: "169.254 – was heißt das?",
    briefing: "Guten Tag,\n1. Beide Arbeitsplätze zeigen eine Adresse mit 169.254 am Anfang;\n2. weder Intranet noch Internet sind erreichbar;\n3. der Drucker druckt aber noch.\nIch bitte um zügige Durchsicht.\n\nKonrad Albers\nP.S. Der Server wurde gestern neu gestartet.",
    symptom: "Die Arbeitsplätze haben 169.254-Adressen und kommen nirgends hin.",
    lohn: {euro: 60, ruf: 1}});

  t({id: "buero-02", reihe: 2, kunde: "schreibbuero", karriere: 2, stufe: "E", vorlage: "buero", vSeed: 32, minuten: 4,
    injektoren: [{name: "dns-eintrag-fehlt"}],
    titel: "Das Intranet ist verschwunden",
    briefing: "Guten Tag,\ndas Intranet (server.buero.local) ist nicht mehr aufrufbar. Die Dateifreigabe auf dem Server funktioniert hingegen. Die Seite meldet, der Name sei unbekannt.\n\nKonrad Albers\nP.S. Wir haben am Wochenende den Server aufgeräumt.",
    symptom: "Das Intranet ist unter seinem Namen nicht mehr erreichbar.",
    lohn: {euro: 60, ruf: 1}});

  t({id: "buero-03", reihe: 3, kunde: "schreibbuero", karriere: 2, stufe: "AP1", vorlage: "buero", vSeed: 33, minuten: 5,
    injektoren: [{name: "dienst-aus", ziel: "srv:datei"}],
    titel: "Laufwerk S: meldet sich nicht",
    briefing: "Guten Tag,\n1. Das Netzlaufwerk mit den Mandantenakten ist nicht erreichbar;\n2. der Server antwortet aber auf Ping, das habe ich selbst probiert;\n3. das Intranet geht.\nWie kann das sein?\n\nKonrad Albers",
    symptom: "Die Dateifreigabe auf dem Server ist weg, der Server antwortet aber.",
    lohn: {euro: 65, ruf: 1}});

  t({id: "buero-04", reihe: 4, kunde: "schreibbuero", karriere: 2, stufe: "AP1", vorlage: "buero", vSeed: 34, minuten: 6,
    injektoren: [{name: "helper-fehlt"}],
    skills: ["lab.dhcp", "lab.cli"],
    titel: "Nach dem Routertausch keine Adressen",
    briefing: "Guten Tag,\nder Provider hat heute den Router getauscht und die alte Konfiguration „übernommen“. Seitdem erhalten die Arbeitsplätze keine Adressen mehr (169.254). Der Server selbst hat seine feste Adresse und läuft.\n\nKonrad Albers\nP.S. Ich habe es ins Wartungsbuch eingetragen.",
    symptom: "Nach dem Routertausch bekommen die Arbeitsplätze keine Adressen.",
    lohn: {euro: 75, ruf: 2}});

  t({id: "buero-05", reihe: 5, kunde: "schreibbuero", karriere: 2, stufe: "AP1", vorlage: "buero", vSeed: 35, minuten: 5,
    injektoren: [{name: "dienst-aus", ziel: "drucker:druck"}],
    skills: ["lab.tcp", "lab.ports"],
    titel: "Der Drucker ist beleidigt",
    briefing: "Guten Tag,\nder Drucker ist eingeschaltet, zeigt „Bereit“ und antwortet auf Ping. Trotzdem kommt kein Druckauftrag an; Windows meldet „Verbindung abgelehnt“.\n\nKonrad Albers",
    symptom: "Der Drucker ist erreichbar, nimmt aber keine Aufträge an.",
    lohn: {euro: 65, ruf: 1}});

  t({id: "buero-06", reihe: 6, kunde: "schreibbuero", karriere: 2, stufe: "E", art: "projekt", vorlage: "buero", vSeed: 36, minuten: 8,
    injektoren: [],
    umbau(n){ Modell.geraet(n, "pc", {id: "pc3", name: "PC-Neu", x: 240, y: 540}); },
    zieleFn: () => [
      {typ: "dhcp", von: "pc3", text: "Der neue Arbeitsplatz bekommt automatisch eine Adresse"},
      {typ: "erreichbar", von: "pc3", nach: "server.buero.local", proto: "http", text: "Der neue Arbeitsplatz öffnet das Intranet"}],
    loesung: [
      {aktion: "verbinden", a: {geraet: "pc3", port: "eth0"}, b: {geraet: "sw1", port: "Fa0/4"}, text: "PC-Neu per Kabel an den Client-Switch (Fa0/4)."},
      {geraet: "pc3", setzen: {"if.eth0.dhcp": true}, text: "Bei PC-Neu „Adresse automatisch beziehen (DHCP)“ einschalten."}],
    hilfen: {frage: ["Wie bekommen die anderen Arbeitsplätze ihre Adresse – von Hand oder automatisch?"],
      bereich: [{geraet: "pc3"}, {geraet: "sw1"}], konkret: ["Kabel von PC-Neu zum Switch der Clients, dann DHCP einschalten – den Rest macht der Server über das Relay."]},
    titel: "Ein neuer Arbeitsplatz",
    briefing: "Guten Tag,\nzum Ersten beginnt Frau Yilmaz bei uns. Ihr PC steht bereits im Sekretariat, ist aber noch nicht angeschlossen. Bitte richten Sie ihn so ein wie die anderen Plätze: Intranet muss gehen.\n\nKonrad Albers\nP.S. Duzen ist natürlich weiterhin in Ordnung.",
    symptom: "Ein neuer Arbeitsplatz soll ins Netz.",
    erklaerung: "Mit DHCP braucht ein neuer Rechner nur Kabel und die Einstellung „automatisch beziehen“: Er schickt ein Discover, der Router leitet es per ip helper-address an den Server, der bietet Adresse, Maske, Gateway und DNS an (DORA).",
    lohn: {euro: 70, ruf: 2}});

  t({id: "buero-07", reihe: 7, kunde: "baeckerei", karriere: 2, stufe: "AP1", vorlage: "lan", vSeed: 37, minuten: 4,
    injektoren: [{name: "dns-fehlt", ziel: "buero"}],
    titel: "Internet nur mit Nummern",
    briefing: "Backstuben-PC: Webseiten gehen nicht auf. Der Neffe sagt, mit der Nummer 198.51.100.10 geht es. Mit Nummern kann ich aber keine Mehlbestellung aufgeben.\n\nH. Kowalski",
    symptom: "Webseiten gehen nur mit Zahlen, nicht mit Namen.",
    lohn: {euro: 60, ruf: 1}});

  t({id: "salon-07", reihe: 8, kunde: "salon", karriere: 2, stufe: "AP2", vorlage: "lan", vSeed: 18, minuten: 6,
    injektoren: [{name: "gespeichert-kaputt"}],
    skills: ["lab.speichern", "lab.cli"],
    titel: "Nach jedem Gewitter dasselbe",
    briefing: "Hallo! Du hattest das Internet doch letzten Monat repariert – nach dem Gewitter gestern ist es wieder weg! Kannst du es diesmal so machen, dass es auch nach dem nächsten Stromausfall noch geht?\n\nLiebe Grüße aus dem Salon, Mira",
    symptom: "Nach jedem Stromausfall ist das Internet weg.",
    lohn: {euro: 80, ruf: 2}});
})();
