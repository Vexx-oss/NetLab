"use strict";
/* ---------- Sicherheitsvorfälle (Form „Sicherheitsvorfall“; Plan – Ausbau 1.2, E1.5; Architektur § 10.3/§ 10.4) ----------
   Zwei Fälle, beide im Netz des Schreibbüros (Vorlage buero, dort gibt es einen echten DHCP-Server):

   1. „Fremder Router im Netz“ – ein zweites Gerät verteilt Adressen und zeigt sich selbst als Gateway. Der Rechner hat
      eine gültige Adresse, kommt aber nicht mehr hinaus. Erkennungsweg: ipconfig /all zeigt einen DHCP-Server, den es
      im Netz nicht geben darf; die Akte sammelt das als Beweiskarte. Lösung: den fremden Server abschalten.
   2. „Das Gästenetz bekommt keine Adresse“ – am Switch ist DHCP-Snooping eingeschaltet, aber kein Port als vertraut
      markiert; der Switch verwirft die Antworten des echten Servers. Lösung: den Port Richtung Server vertrauen.

   Quelle: RFC 2131 (DHCP) · IOS-ähnlich für Snooping (Switch-Funktion, kein RFC-Verfahren). */
(() => {
  const T = DATEN.ticketSpec;
  const t = spec => DATEN.tickets.push(T(spec));

  /* ===== 1 · Fremder Router im Netz (Rogue-DHCP) ===== */
  t({id: "buero-sicherheit-1", reihe: 3.7, kunde: "schreibbuero", karriere: 2, stufe: "AP1",
    form: "sicherheitsvorfall", vorlage: "buero", vSeed: 41, minuten: 8,
    injektoren: [{name: "fremder-dhcp", ziel: "fremd"}],
    titel: "Fremder Router im Netz",
    briefing: "Albers, Schreibbüro Wortgenau. Bei uns steht seit gestern die Arbeit; ich will wissen, was da los ist. Bitte heute melden, ich trage es ins Wartungsbuch ein.",
    symptom: "Albers vom Schreibbüro meldet sich besorgt: Seit gestern hat jeder Rechner eine Adresse, kommt aber nicht mehr ins Internet. Neben dem Switch steht ein Kasten mit Antennen, den niemand von ihnen angeschlossen hat. Geändert wurde nichts, die Arbeit steht, und in der Akte liegen Mandantendaten. Er hat den Router neu aufgesetzt und gefragt, ob jemand etwas angeschlossen hat.",
    erklaerung: "Ein fremder Router hängt im LAN und verteilt per DHCP Adressen. Weil ein Rechner das erste Angebot nimmt, bekommt er ein Gateway, das nicht der echte Router ist: Über dieses Gateway führt kein Weg nach draußen. Der Rechner selbst merkt davon nichts – seine Adresse ist gültig, nur der Weg stimmt nicht. Erkennbar an „ipconfig /all“: Als DHCP-Server steht dort ein Gerät, das im Netz nichts zu suchen hat.",
    quelle: "RFC 2131 · IOS-ähnlich (Snooping ist eine Switch-Funktion)",
    lohn: {euro: 75, ruf: 2}});

  /* ===== 2 · Das Gästenetz bekommt keine Adresse (Snooping ohne vertrauten Port) ===== */
  t({id: "buero-sicherheit-2", reihe: 4.7, kunde: "schreibbuero", karriere: 2, stufe: "AP1",
    form: "sicherheitsvorfall", vorlage: "buero", vSeed: 42, minuten: 7,
    injektoren: [{name: "snooping-ohne-trust", ziel: "sw1"}],
    titel: "Nach der Schulung: keine Adresse mehr",
    briefing: "Albers, Schreibbüro Wortgenau. Seit der Schulung kommen zwei Plätze nicht mehr ins Netz; ich brauche heute Vormittag eine Erklärung. Zwei Manuskripte warten.",
    symptom: "Albers vom Schreibbüro Wortgenau ruft an, verärgert. Nach der Sicherheitsschulung hat der Dienstleister am Switch etwas nachgetragen, seitdem zeigen beide Arbeitsplätze eine Adresse, die mit 169 anfängt. Der Server läuft nachweislich, der Drucker druckt. Er hat es mit einem Neustart probiert und will heute Vormittag eine Erklärung, weil zwei Manuskripte warten.",
    erklaerung: "DHCP-Snooping ist eine Schutzfunktion am Switch: Nur an „vertrauten“ Ports dürfen DHCP-Antworten (Offer, Ack) hereinkommen, alle anderen Ports dürfen nur Anfragen stellen. So kann kein fremder Server Adressen verteilen. Ist aber der Port zum echten Server nicht als vertraut markiert, wirft der Switch dessen Antworten weg – die Clients bekommen keine Adresse, obwohl der Server läuft und der Pool frei ist.",
    quelle: "RFC 2131 · IOS-ähnlich (Snooping ist eine Switch-Funktion)",
    lohn: {euro: 70, ruf: 2}});

  /* ===== 3 · Reservierung zeigt auf eine belegte Adresse (DHCP_RESERVED_BUSY) ===== */
  t({id: "buero-sicherheit-3", reihe: 5.7, kunde: "schreibbuero", karriere: 2, stufe: "AP1",
    form: "sicherheitsvorfall", vorlage: "buero", vSeed: 43, minuten: 6,
    injektoren: [],
    umbau(n){
      /* Der neue Dienstleister hat die Reservierung für PC-Albers auf eine Adresse gelegt, die der Drucker fest trägt. */
      const sip = n.geraete.srv.running.if.eth0.ip, C = Modell.lesen(n.geraete.r1.running, "if.Gi0/0.ip").replace(/\d+$/, "");
      const mac = n.geraete.pc1.hw.macs.eth0, besetzt = n.geraete.drucker.running.if.eth0.ip;
      Modell.setzen(n, "pc1", "if.eth0.dhcp", true); Modell.setzen(n, "pc1", "if.eth0.ip", "");
      Modell.setzen(n, "srv", "dienste.dhcp.pools", [{name: "CLIENTS", netz: C + "0", maske: "255.255.255.0",
        gw: C + "1", dns: sip, start: C + "100", anzahl: 50, reservierungen: [{mac, ip: besetzt, name: "PC-Albers"}]}]);
    },
    zieleFn: (n) => [
      {typ: "dhcp", von: "pc1", text: "PC-Albers bekommt automatisch eine Adresse"}],
    loesungFn: (n) => {
      const sip = n.geraete.srv.running.if.eth0.ip, C = Modell.lesen(n.geraete.r1.running, "if.Gi0/0.ip").replace(/\d+$/, "");
      const mac = n.geraete.pc1.hw.macs.eth0;
      return [{geraet: "srv", setzen: {"dienste.dhcp.pools": [{name: "CLIENTS", netz: C + "0", maske: "255.255.255.0",
          gw: C + "1", dns: sip, start: C + "100", anzahl: 50, reservierungen: [{mac, ip: C + "150", name: "PC-Albers"}]}]},
        text: `Server: reservierte Adresse für PC-Albers auf eine freie Adresse legen (${C}150).`}];
    },
    hilfen: {frage: ["Der Pool hat freie Adressen, der Server läuft – und der eine Rechner bekommt trotzdem nichts. Was ist an diesem Rechner anders als an den anderen?"],
      bereich: [{geraet: "srv"}],
      konkret: ["Für die MAC von PC-Albers ist eine feste Adresse reserviert – und die trägt schon der Drucker. Eine Reservierung schlägt den ganzen Pool: Ist sie belegt, gibt der Server gar nichts, auch nichts aus dem freien Bereich."]},
    titel: "Der neue Rechner bekommt keine Adresse",
    briefing: "Albers, Schreibbüro Wortgenau. Der getauschte Platz läuft heute noch nicht; bitte sehen Sie sich das an. Für das Wartungsbuch zwei Zeilen.\n\nAlbers",
    symptom: "Albers vom Schreibbüro schreibt am Vormittag: Wir haben einen Arbeitsplatz getauscht, seitdem bekommt der neue Rechner keine Adresse. Er zeigt eine Adresse, die mit 169 anfängt, die Kollegin daneben arbeitet normal. Der Dienstleister hat am Server etwas umgestellt, seither geht es nicht mehr. Am Platz geht nichts, und einen Neustart hat Albers schon probiert.",
    erklaerung: "Eine DHCP-Reservierung (MAC → feste IP) hat Vorrang vor dem ganzen Pool. Zeigt sie auf eine Adresse, die schon vergeben ist, lehnt der Server ab – er vergibt dann auch keine andere Adresse aus dem freien Bereich, sondern gar keine. Der Client fällt nach mehreren Versuchen auf APIPA zurück (169.254.x.x). Die Reservierung gehört auf eine freie Adresse außerhalb des DHCP-Bereichs.",
    quelle: "RFC 2131 (DHCP, „manual allocation“)", lohn: {euro: 80, ruf: 2}});

  /* ===== 4 · Dieselbe Adresse auf zwei Geräten (DHCP_CONFLICT) ===== */
  t({id: "buero-sicherheit-4", reihe: 6.7, kunde: "schreibbuero", karriere: 2, stufe: "AP2",
    form: "sicherheitsvorfall", vorlage: "buero", vSeed: 44, minuten: 7,
    injektoren: [],
    umbau(n){
      const sip = n.geraete.srv.running.if.eth0.ip, C = Modell.lesen(n.geraete.r1.running, "if.Gi0/0.ip").replace(/\d+$/, "");
      const doppelt = C + "100";
      Modell.geraet(n, "pc", {id: "doppelt", name: "PC-Aushilfe", x: 640, y: 540});
      Modell.verbinden(n, {geraet: "doppelt", port: "eth0"}, {geraet: "sw1", port: "Fa0/9"});
      for (const id of ["drucker", "doppelt"]) {
        Modell.setzen(n, id, "if.eth0.ip", doppelt); Modell.setzen(n, id, "if.eth0.maske", "255.255.255.0");
        Modell.setzen(n, id, "if.eth0.gw", C + "1");
      }
      Modell.setzen(n, "srv", "dienste.dhcp.pools", [{name: "CLIENTS", netz: C + "0", maske: "255.255.255.0",
        gw: C + "1", dns: sip, start: doppelt, anzahl: 1}]);
    },
    zieleFn: (n) => [
      {typ: "dhcp", von: "pc1", text: "PC-Albers bekommt automatisch eine Adresse"}],
    loesungFn: (n) => {
      const sip = n.geraete.srv.running.if.eth0.ip, C = Modell.lesen(n.geraete.r1.running, "if.Gi0/0.ip").replace(/\d+$/, "");
      return [{geraet: "drucker", setzen: {"if.eth0.ip": C + "30"}, text: `Drucker: eigene Adresse ${C}30 statt der doppelten ${C}100 eintragen.`},
        {geraet: "doppelt", setzen: {"if.eth0.ip": C + "31"}, text: `PC-Aushilfe: eigene Adresse ${C}31 eintragen.`},
        {geraet: "srv", setzen: {"dienste.dhcp.pools": [{name: "CLIENTS", netz: C + "0", maske: "255.255.255.0",
          gw: C + "1", dns: sip, start: C + "100", anzahl: 50}]}, text: `Server: Pool wieder auf freie Adressen legen (${C}100 bis ${C}149).`}];
    },
    hilfen: {frage: ["Der Server prüft jede Adresse, bevor er sie anbietet. Was findet er hier – eine belegte Adresse oder etwas Schlimmeres?"],
      bereich: [{geraet: "srv"}, {geraet: "drucker"}, {geraet: "doppelt"}],
      konkret: ["Zwei Geräte tragen dieselbe Adresse. Der Server erkennt das als Konflikt, überspringt sie und protokolliert ihn („show ip dhcp conflict“); bleibt keine andere Adresse, bekommt der Client nichts."]},
    titel: "Zwei Geräte, eine Adresse",
    briefing: "Albers, Schreibbüro Wortgenau. Seit gestern wechseln sich die Störungen ab; die Kolleginnen warten auf ihre Ausdrucke. Bitte kommen Sie heute vorbei.\n\nAlbers",
    symptom: "Albers vom Schreibbüro meldet sich am Nachmittag: Seit die Aushilfe neben dem Drucker sitzt, spinnt es im Netz. Mal ist der Drucker nicht erreichbar, mal der neue Rechner, und ein dritter Arbeitsplatz hat gar keine Adresse mehr. Neustart und Kabelprüfung haben nichts gebracht. So darf es nicht weitergehen, denn die Kolleginnen warten auf ihre Ausdrucke.",
    erklaerung: "Eine IP-Adresse darf im Netz nur einmal vorkommen. Tragen zwei Geräte dieselbe, antwortet mal das eine, mal das andere. Ein DHCP-Server prüft jede Pooladresse vor der Vergabe: Findet er sie auf mehr als einem Gerät, gilt sie als Konflikt – er überspringt sie und meldet den Grund („show ip dhcp conflict“). Ist der Pool dadurch leer, bleibt der nächste Client ohne Adresse und fällt auf APIPA zurück.",
    quelle: "RFC 5227 (IPv4 Address Conflict Detection) · RFC 2131 (DHCP)", lohn: {euro: 85, ruf: 2}});

  /* ===== 5 · Lease abgelaufen, kein neues Angebot (DHCP_LEASE_EXPIRED) ===== */
  t({id: "buero-sicherheit-5", reihe: 7.7, kunde: "schreibbuero", karriere: 2, stufe: "AP2",
    form: "sicherheitsvorfall", vorlage: "buero", vSeed: 45, minuten: 6,
    injektoren: [],
    umbau(n){
      const sip = n.geraete.srv.running.if.eth0.ip, C = Modell.lesen(n.geraete.r1.running, "if.Gi0/0.ip").replace(/\d+$/, "");
      /* Kurze Lease, dann läuft die Uhr darüber: die Adresse ist weg, und der Server hat keinen Bereich mehr. */
      Modell.setzen(n, "srv", "dienste.dhcp.pools", [{name: "CLIENTS", netz: C + "0", maske: "255.255.255.0",
        gw: C + "1", dns: sip, start: C + "100", anzahl: 50, leaseS: 60}]);
      Sim.dhcp(n, "pc1", "eth0");
      Sim.vergehen(n, 61 * 1000);
      Modell.setzen(n, "srv", "dienste.dhcp.pools", []);
    },
    zieleFn: (n) => [
      {typ: "dhcp", von: "pc1", text: "PC-Albers bekommt automatisch eine Adresse"}],
    loesungFn: (n) => {
      const sip = n.geraete.srv.running.if.eth0.ip, C = Modell.lesen(n.geraete.r1.running, "if.Gi0/0.ip").replace(/\d+$/, "");
      return [{geraet: "srv", setzen: {"dienste.dhcp.pools": [{name: "CLIENTS", netz: C + "0", maske: "255.255.255.0",
          gw: C + "1", dns: sip, start: C + "100", anzahl: 50, leaseS: 86400}]},
        text: `Server: Adressbereich für die Clients wieder anlegen (${C}100 bis ${C}149, Lease 1 Tag).`}];
    },
    hilfen: {frage: ["Der Rechner hatte heute früh eine Adresse. Was passiert mit einer Adresse, wenn die Leihfrist abläuft und der Server gerade keine mehr hergibt?"],
      bereich: [{geraet: "srv"}, {geraet: "pc1"}],
      konkret: ["Die Lease von PC-Albers ist abgelaufen, und der Server hat keinen Bereich mehr – der Client bekommt kein neues Angebot und hat damit keine gültige Adresse mehr. Er gibt sich selbst eine APIPA-Adresse."]},
    titel: "Die Adresse ist abgelaufen",
    briefing: "Albers, Schreibbüro Wortgenau. An einem Platz geht seit heute früh nichts mehr; zwei Firmen warten dort auf ihre Post. Bitte zeitnah.\n\nAlbers",
    symptom: "Albers vom Schreibbüro berichtet am Vormittag: Ein Arbeitsplatz hatte heute früh eine Adresse, jetzt zeigt er eine mit 169. Der Server läuft, die anderen Rechner arbeiten normal, nur dieser eine kommt nicht mehr ins Intranet. Gestern wurde am Server aufgeräumt, und einen Neustart hat Albers schon probiert. Er bittet um Hilfe, weil an diesem Platz zwei Firmen auf ihre Post warten.",
    erklaerung: "Eine per DHCP bezogene Adresse ist geliehen: Nach Ablauf der Lease (Standard 1 Tag) muss der Client sie erneuern – bei der Hälfte der Laufzeit fragt er nach. Bekommt er keine Antwort und gibt es auch kein neues Angebot, verliert er die Adresse und vergibt sich selbst eine APIPA-Adresse (169.254.x.x). Damit erreicht er nur noch Geräte im selben APIPA-Bereich, kein Gateway, kein Server. Ursache ist hier der fehlende Adressbereich, nicht der Client.",
    quelle: "RFC 2131 (DHCP: Lease, T1/T2, Renew) · RFC 3927 (APIPA)", lohn: {euro: 90, ruf: 2}});
})();
