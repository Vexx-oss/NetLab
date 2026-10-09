"use strict";
/* ---------- Handgeschriebene Tickets, Karriere-Stufen 1 und 2 ----------
   Bauplan: Vorlage (spiel/vorlagen.js) + Injektor (spiel/injektoren.js) + Texte in Kundenstimme.
   Geräte-IDs der Vorlagen: lan = kasse, buero, drucker, sw1, r1, inet · buero = pc1, pc2, drucker, srv, sw1, sw2, r1, inet.
   Validierung: tests/tickets-hand.test.js (Fehler bricht mit erwartetem Grund, Lösung heilt alles).

   TEXTE: `symptom` folgt docs/entwicklung/Stilfaden – Auftragstexte.md (vier Bausteine: Anlass mit
   Zeit · Beobachtung in Kundensprache · Folge für den Betrieb · was schon versucht wurde; 2–4 Sätze,
   180–420 Zeichen, keine Ursache). Stimme je Kunde: Salon herzlich, Bäckerei knapp und direkt,
   Schreibbüro höflich und sachlich. Technik (id, netz, ziele, skills, injektoren, reihenfolge) bleibt. */
(() => {
  const T = DATEN.ticketSpec;
  const t = spec => DATEN.tickets.push(T(spec));

  /* ===== Stufe 1 · Salon Lockenwerk (Mira Kaya) ===== */
  t({id: "salon-01", reihe: 1, kunde: "salon", karriere: 1, stufe: "E", vorlage: "lan", vSeed: 11, minuten: 1,
    injektoren: [{name: "kabel-fehlt", ziel: "kasse"}],
    ziele: [{typ: "erreichbar", von: "kasse", nach: "drucker", proto: "tcp", port: 9100, text: "Die Kasse druckt Belege auf dem Drucker"}],
    titel: "Kasse ohne Netz",
    briefing: "Hi! Bei uns klemmt es an der Kasse – kannst du heute Vormittag kurz vorbeikommen? Es eilt, um neun kommt die erste Kundin.\n\nLiebe Grüße aus dem Salon, Mira",
    symptom: "Wir haben heute früh den Tresen umgestellt, seitdem druckt die Kasse keine Belege mehr. Auf ihrem Display steht nur, dass sie den Drucker nicht findet, obwohl er läuft und der Büro-PC weiter drucken kann. Ich habe die Kasse schon zweimal aus- und wieder eingeschaltet. Um neun kommt die erste Kundin – ohne Beleg geht hier nichts.",
    erklaerung: "Beim Umstellen ist das Netzwerkkabel der Kasse herausgerutscht. Ohne Kabel gibt es keinen Link (Schicht 1) – dann hilft keine Einstellung. Deshalb beginnt jede Fehlersuche unten: Steckt das Kabel, leuchtet der Port?",
    lohn: {euro: 30, ruf: 1}});

  t({id: "salon-02", reihe: 2, kunde: "salon", karriere: 1, stufe: "E", vorlage: "lan", vSeed: 12, minuten: 3,
    injektoren: [{name: "ip-tippfehler", ziel: "kasse"}],
    titel: "Die Kasse findet niemanden",
    briefing: "Hallo! Lea, meine Nichte, war gestern an der Kasse – seitdem geht dort nichts mehr richtig. Schaffst du es heute noch? Ich brauche die Kartenzahlung.\n\nLiebe Grüße aus dem Salon, Mira",
    symptom: "Meine Nichte Lea war gestern kurz an der Kasse und hat dort nur „etwas nachgeschaut“. Seitdem findet die Kasse weder den Drucker noch die Kartenzahlung. Das Kabel habe ich extra nachgedrückt, das sitzt, und neu gestartet habe ich sie auch schon zweimal. Wenn das heute nicht läuft, können wir nur noch bar kassieren.",
    lohn: {euro: 35, ruf: 1}});

  t({id: "salon-03", reihe: 3, kunde: "salon", karriere: 1, stufe: "E", vorlage: "lan", vSeed: 13, minuten: 4,
    injektoren: [{name: "maske-falsch", ziel: "buero", param: {maske: "255.255.255.248"}}],
    skills: ["lab.netz", "lab.subnetz"],
    titel: "Nur der Büro-PC ist beleidigt",
    briefing: "Hi! Der Mann vom Kassenhersteller war gestern noch bei uns – seitdem zickt der Rechner im Büro herum. Kannst du das heute prüfen? Ich trau dem Frieden nicht.\n\nLiebe Grüße aus dem Salon, Mira",
    symptom: "Gestern war ein Techniker vom Kassenhersteller da und hat am Büro-PC nur „die Netzwerkeinstellungen angeschaut“. Seitdem antwortet der Büro-PC der Kasse nicht mehr, und ins Internet kommt er auch nicht. Die Kasse selbst ist unauffällig: Sie sieht den Büro-PC, bekommt aber keine Antwort. Zweimal neu gestartet habe ich den Rechner schon, und das Kabel steckt an einem anderen Platz – ohne Wirkung.",
    lohn: {euro: 40, ruf: 1}});

  t({id: "salon-04", reihe: 4, kunde: "salon", karriere: 1, stufe: "E", vorlage: "lan", vSeed: 14, minuten: 3, vorhersage: true,
    injektoren: [{name: "gateway-fehlt", ziel: "buero"}],
    skills: ["lab.gateway", "lab.ping"],
    titel: "Drucker ja, Internet nein",
    briefing: "Hallo! Der Büro-PC druckt ganz normal, aber ins Internet kommt er nicht. Ich muss heute noch die Farbbestellung abschicken! Die Kasse kommt übrigens rein, nur der Büro-PC nicht.\n\nLiebe Grüße aus dem Salon, Mira",
    symptom: "Seit gestern Nachmittag kommen wir vom Büro-PC nicht mehr ins Internet – drucken geht weiterhin. Auf dem Bildschirm steht „Kein Internet“. Ich habe den Rechner neu gestartet und das Kabel an einen anderen Platz im Switch gesteckt, das hat nichts geändert. Ohne Internet können wir die Farbbestellung nicht rausschicken.",
    lohn: {euro: 40, ruf: 1}});

  t({id: "salon-05", reihe: 5, kunde: "salon", karriere: 1, stufe: "E", vorlage: "lan", vSeed: 15, minuten: 4,
    injektoren: [{name: "switchport-aus", ziel: "sw1:Fa0/2"}],
    skills: ["lab.link", "lab.switch"],
    titel: "Das Lämpchen blinkt nicht",
    briefing: "Hi! Am grauen Kasten leuchtet eine Lampe nicht mehr – genau die, die du mir letztes Mal gezeigt hast. Kannst du heute nachsehen? Ohne den Rechner daneben kann ich nichts vorbereiten.\n\nLiebe Grüße aus dem Salon, Mira",
    symptom: "Am grauen Kasten, wo alle Kabel reingehen, ist bei einem Anschluss das Lämpchen aus; genau dort hängt der Büro-PC. Der Rechner ist damit komplett offline – keine Termine, keine Bestellungen. Ich habe das Kabel schon zweimal abgezogen und neu gesteckt und auch ein anderes Kabel probiert. Der Kasten wurde letzte Woche von jemandem „aufgeräumt“, seitdem ist das so.",
    lohn: {euro: 45, ruf: 1}});

  t({id: "salon-06", reihe: 6, kunde: "salon", karriere: 1, stufe: "E", vorlage: "lan", vSeed: 16, minuten: 4, vorhersage: true,
    injektoren: [{name: "drucker-umgezogen"}],
    titel: "Der Drucker ist umgezogen",
    briefing: "Hi! Der Service war gestern wegen der Patronen da – seitdem kommt hinten nichts mehr heraus. Kannst du das heute richten? Wir brauchen die Belege.\n\nLiebe Grüße aus dem Salon, Mira",
    symptom: "Der Drucker hat neue Patronen bekommen, dabei hat der Servicemann „etwas zurückgesetzt“. Seitdem druckt die Kasse nicht mehr, der Auftrag bleibt einfach liegen. Auf dem Druckerdisplay steht eine andere Nummer als vorher – die hatte ich mir zum Glück notiert. Kasse und Drucker habe ich schon neu gestartet, ohne Erfolg; wir brauchen die Belege für die Kundschaft.",
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
    briefing: "Hi! Der neue Drucker steht schon da, ich habe ihn aber nicht angerührt – trau mich nicht. Kannst du ihn heute einrichten, wenn im Laden wenig los ist? Und den alten danach wegräumen?\n\nLiebe Grüße aus dem Salon, Mira",
    symptom: "Wir haben einen zweiten Drucker gekauft, der alte kommt ins Lager. Der neue steht schon neben der Kasse, angeschlossen habe ich ihn aber nicht – da traue ich mich nicht ran. Er soll von der Kasse und vom Büro-PC aus erreichbar sein, damit beide darauf drucken können. Am besten wäre es heute Vormittag, da ist der Laden ruhig.",
    erklaerung: "Ein Gerät im LAN braucht Link (Kabel), eine freie Adresse aus dem Netz, dieselbe Maske wie die anderen und – für fremde Netze – das Gateway. Drucker bekommen feste Adressen, damit alle Rechner sie immer unter derselben Nummer finden.",
    lohn: {euro: 60, ruf: 2}});

  /* ===== Stufe 1 · Bäckerei Kowalski (Heinz Kowalski) ===== */
  t({id: "baeckerei-01", reihe: 8, kunde: "baeckerei", karriere: 1, stufe: "AP1", vorlage: "lan", vSeed: 21, minuten: 4,
    injektoren: [{name: "gateway-falsch", ziel: "kasse"}],
    titel: "Kartenzahlung tot",
    briefing: "Das Kartending an der Theke ist tot. Bitte heute noch. Um sechs kommen die ersten Kunden.\n\nH. Kowalski",
    symptom: "Kartenterminal an der Theke geht nicht, seit heute Morgen. Bargeld geht, der Bondrucker geht auch, die Kiste blinkt wie immer. Um sechs stehen die Leute Schlange, und ohne Kartenzahlung geht die Hälfte wieder. Neu gestartet habe ich das Terminal schon, das Kabel sitzt auch.",
    lohn: {euro: 45, ruf: 1}});

  t({id: "baeckerei-02", reihe: 9, kunde: "baeckerei", karriere: 1, stufe: "AP1", vorlage: "lan", vSeed: 22, minuten: 5,
    injektoren: [{name: "doppelte-ip"}],
    titel: "Mal geht's, mal nicht",
    briefing: "Der Junge hat gestern am Rechner in der Backstube rumgestellt. Seitdem zickt die Kasse. Bitte kommt heute vorbei, ich hab keine Zeit für sowas.\n\nH. Kowalski",
    symptom: "Seit der Neffe den Backstuben-PC neu eingerichtet hat, spinnt die Theke. Mal druckt der Bon, mal kommt eine Fehlermeldung von wegen Adresskonflikt; der Junge sagt, er habe nur „das Netzwerk gemacht“. Ich habe beide Rechner neu gestartet, danach ging es kurz und dann wieder nicht. Um sieben muss die erste Ladung raus.",
    lohn: {euro: 50, ruf: 1}});

  t({id: "baeckerei-03", reihe: 10, kunde: "baeckerei", karriere: 1, stufe: "AP1", vorlage: "lan", vSeed: 23, minuten: 5,
    injektoren: [{name: "routerport-aus"}],
    skills: ["lab.link", "lab.cli"],
    titel: "Die Kiste lässt niemanden raus",
    briefing: "Seit dem Stromausfall geht nichts mehr raus. Bitte heute früh kommen, die Karte muss laufen.\n\nH. Kowalski",
    symptom: "Nach dem Stromausfall heute Nacht geht im Laden gar nichts mehr ins Internet. Drinnen reden die Geräte noch miteinander, der Bondrucker geht. Die Kiste hat ihre Lämpchen an, bis auf eins, das ist aus. Ich habe sie einmal aus- und wieder eingeschaltet, es bleibt dabei – und die Kartenzahlung hängt da mit dran.",
    lohn: {euro: 55, ruf: 1}});

  /* ===== Stufe 2 · Schreibbüro Albers (Konrad Albers) ===== */
  t({id: "buero-01", reihe: 1, kunde: "schreibbuero", karriere: 2, stufe: "E", vorlage: "buero", vSeed: 31, minuten: 4, vorhersage: true,
    injektoren: [{name: "dhcp-aus"}],
    titel: "169.254 – was heißt das?",
    briefing: "Guten Tag,\nich bitte um zügige Durchsicht; im Büro steht die Arbeit. Ein Anruf genügt, ich bin den ganzen Vormittag erreichbar.\nP.S. Der Vorgang kommt ins Wartungsbuch.\n\nKonrad Albers",
    symptom: "Guten Tag, seit heute Morgen zeigen beide Arbeitsplätze eine Adresse, die mit 169.254 beginnt; weder Intranet noch Internet sind erreichbar. Der Drucker druckt weiterhin. Ich habe beide Rechner neu gestartet, ohne Erfolg. Der Server wurde gestern neu gestartet – ich bitte um zügige Durchsicht.",
    lohn: {euro: 60, ruf: 1}});

  t({id: "buero-02", reihe: 2, kunde: "schreibbuero", karriere: 2, stufe: "E", vorlage: "buero", vSeed: 32, minuten: 4,
    injektoren: [{name: "dns-eintrag-fehlt"}],
    titel: "Das Intranet ist verschwunden",
    briefing: "Guten Tag,\nbitte sehen Sie sich das heute an; ohne den Zugriff steht die Arbeit.\nP.S. Für das Wartungsbuch hätte ich gern zwei Zeilen.\n\nKonrad Albers",
    symptom: "Guten Tag, das Intranet unter server.buero.local ist seit dem Wochenende nicht mehr aufrufbar; die Seite meldet, der Name sei unbekannt. Die Dateifreigabe auf demselben Server funktioniert hingegen einwandfrei, aber ohne das Intranet kommen wir an die Mandantenakten nicht heran. Wir haben am Wochenende den Server aufgeräumt und danach neu gestartet. Ich habe es auch mit einem anderen Browser versucht.",
    lohn: {euro: 60, ruf: 1}});

  t({id: "buero-03", reihe: 3, kunde: "schreibbuero", karriere: 2, stufe: "AP1", vorlage: "buero", vSeed: 33, minuten: 5,
    injektoren: [{name: "dienst-aus", ziel: "srv:datei"}],
    titel: "Laufwerk S: meldet sich nicht",
    briefing: "Guten Tag,\n1. Das Netzlaufwerk mit den Mandantenakten ist nicht erreichbar;\n2. der Server antwortet aber auf Ping, das habe ich selbst probiert;\n3. das Intranet geht.\nWie kann das sein?\n\nKonrad Albers",
    symptom: "Guten Tag, das Netzlaufwerk mit den Mandantenakten (S:) ist seit heute früh nicht erreichbar. Der Server ist aber ansprechbar – das habe ich selbst probiert –, und das Intranet geht. Neu gestartet habe ich den Rechner schon, und das Laufwerk habe ich einmal getrennt und wieder verbunden. Ohne die Akten können wir keine Fristen bearbeiten.",
    lohn: {euro: 65, ruf: 1}});

  t({id: "buero-04", reihe: 4, kunde: "schreibbuero", karriere: 2, stufe: "AP1", vorlage: "buero", vSeed: 34, minuten: 6,
    injektoren: [{name: "helper-fehlt"}],
    skills: ["lab.dhcp", "lab.cli"],
    titel: "Nach dem Routertausch keine Adressen",
    briefing: "Guten Tag,\nnach dem Termin heute Vormittag geht im Haus nichts mehr; bitte sehen Sie es sich an.\nP.S. Für das Wartungsbuch hätte ich gern zwei Zeilen.\n\nKonrad Albers",
    symptom: "Guten Tag, der Provider hat heute den Router getauscht und die alte Konfiguration „übernommen“. Seitdem erhalten die Arbeitsplätze keine Adressen mehr; sie zeigen Werte, die mit 169.254 beginnen. Der Server selbst hat seine feste Adresse und läuft. Ich habe zwei Arbeitsplätze neu gestartet und den Vorgang ins Wartungsbuch eingetragen – bitte prüfen Sie, woran es liegt.",
    lohn: {euro: 75, ruf: 2}});

  t({id: "buero-05", reihe: 5, kunde: "schreibbuero", karriere: 2, stufe: "AP1", vorlage: "buero", vSeed: 35, minuten: 5,
    injektoren: [{name: "dienst-aus", ziel: "drucker:druck"}],
    skills: ["lab.tcp", "lab.ports"],
    titel: "Der Drucker ist beleidigt",
    briefing: "Guten Tag,\nim Sekretariat bleibt heute die Post liegen; bitte sehen Sie sich den Drucker an.\nP.S. Für das Wartungsbuch hätte ich gern zwei Zeilen.\n\nKonrad Albers",
    symptom: "Guten Tag, seit heute Morgen kommt kein Druckauftrag mehr an; Windows meldet „Verbindung abgelehnt“. Der Drucker ist eingeschaltet, zeigt „Bereit“ und ist vom Rechner aus ansprechbar. Ich habe ihn neu gestartet, die Warteschlange geleert und den Auftrag erneut geschickt. Die Mandantenpost bleibt liegen.",
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
    briefing: "Guten Tag,\nfür unsere neue Kollegin fehlt noch der Anschluss; bitte richten Sie ihn diese Woche ein.\nP.S. Duzen ist natürlich weiterhin in Ordnung.\n\nKonrad Albers",
    symptom: "Guten Tag, zum Ersten beginnt Frau Yilmaz bei uns; ihr PC steht seit gestern im Sekretariat, ist aber noch nicht angeschlossen. Er soll wie die anderen Plätze arbeiten: Intranet und Drucken müssen gehen. Ich habe bisher nur den Bildschirm aufgestellt und den Rechner eingeschaltet. Ein Netzwerkkabel liegt noch im Schrank, falls Sie eines brauchen.",
    erklaerung: "Mit DHCP braucht ein neuer Rechner nur Kabel und die Einstellung „automatisch beziehen“: Er schickt ein Discover, der Router leitet es per ip helper-address an den Server, der bietet Adresse, Maske, Gateway und DNS an (DORA).",
    lohn: {euro: 70, ruf: 2}});

  t({id: "buero-07", reihe: 7, kunde: "baeckerei", karriere: 2, stufe: "AP1", vorlage: "lan", vSeed: 37, minuten: 4,
    injektoren: [{name: "dns-fehlt", ziel: "buero"}],
    titel: "Internet nur mit Nummern",
    briefing: "Der Rechner in der Backstube macht Ärger. Bitte heute vorbeikommen, ich muss bestellen.\n\nH. Kowalski",
    symptom: "Backstuben-PC: Die Webseiten gehen nicht mehr auf, seit heute Morgen. Der Neffe sagt, mit der Nummer 198.51.100.10 kommt er durch – mit Nummern kann ich aber keine Mehlbestellung aufgeben. Ich habe den Rechner neu gestartet und eine andere Seite probiert. Der Bondrucker an der Theke läuft.",
    lohn: {euro: 60, ruf: 1}});

  t({id: "salon-07", reihe: 8, kunde: "salon", karriere: 2, stufe: "AP2", vorlage: "lan", vSeed: 18, minuten: 6,
    injektoren: [{name: "gespeichert-kaputt"}],
    skills: ["lab.speichern", "lab.cli"],
    titel: "Nach jedem Gewitter dasselbe",
    briefing: "Hallo! Du hattest das Internet doch letzten Monat repariert – nach dem Gewitter gestern ist es wieder weg! Kannst du es diesmal so machen, dass es auch nach dem nächsten Stromausfall noch geht?\n\nLiebe Grüße aus dem Salon, Mira",
    symptom: "Nach dem Gewitter gestern Abend ist das Internet wieder weg. Du hattest es letzte Woche schon einmal gerichtet – und der Router hat dabei neu gestartet. Diesmal soll es bitte auch den nächsten Stromausfall überstehen, sonst stehen wir wieder ohne Kartenzahlung da. Ich habe ihn schon einmal vom Strom genommen und wieder eingeschaltet; es bleibt weg.",
    lohn: {euro: 80, ruf: 2}});
})();
