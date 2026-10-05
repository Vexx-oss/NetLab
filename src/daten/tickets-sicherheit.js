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
    briefing: "Albers, Schreibbüro Wortgenau. Seit gestern hat jeder Rechner eine Adresse, aber niemand kommt mehr ins Internet – und unser Intranet geht auch nicht. Der Server läuft, wir haben nichts geändert. Ich will wissen, was da los ist.",
    symptom: "Alle Rechner haben eine Adresse, kommen aber weder ins Intranet noch ins Internet.",
    erklaerung: "Ein fremder Router hängt im LAN und verteilt per DHCP Adressen. Weil ein Rechner das erste Angebot nimmt, bekommt er ein Gateway, das nicht der echte Router ist: Über dieses Gateway führt kein Weg nach draußen. Der Rechner selbst merkt davon nichts – seine Adresse ist gültig, nur der Weg stimmt nicht. Erkennbar an „ipconfig /all“: Als DHCP-Server steht dort ein Gerät, das im Netz nichts zu suchen hat.",
    quelle: "RFC 2131 · IOS-ähnlich (Snooping ist eine Switch-Funktion)",
    lohn: {euro: 75, ruf: 2}});

  /* ===== 2 · Das Gästenetz bekommt keine Adresse (Snooping ohne vertrauten Port) ===== */
  t({id: "buero-sicherheit-2", reihe: 4.7, kunde: "schreibbuero", karriere: 2, stufe: "AP1",
    form: "sicherheitsvorfall", vorlage: "buero", vSeed: 42, minuten: 7,
    injektoren: [{name: "snooping-ohne-trust", ziel: "sw1"}],
    titel: "Nach der Sicherheitsschulung bekommt keiner mehr eine Adresse",
    briefing: "Albers, Schreibbüro Wortgenau. Nach der Sicherheitsschulung hat unser Dienstleister am Switch „DHCP-Snooping“ eingeschaltet – seitdem bekommen die Arbeitsplätze keine Adresse mehr und zeigen 169.254er-Adressen. Der Server läuft nachweislich. Bitte prüfen Sie das.",
    symptom: "Beide Arbeitsplätze zeigen eine 169.254er-Adresse, der DHCP-Server läuft.",
    erklaerung: "DHCP-Snooping ist eine Schutzfunktion am Switch: Nur an „vertrauten“ Ports dürfen DHCP-Antworten (Offer, Ack) hereinkommen, alle anderen Ports dürfen nur Anfragen stellen. So kann kein fremder Server Adressen verteilen. Ist aber der Port zum echten Server nicht als vertraut markiert, wirft der Switch dessen Antworten weg – die Clients bekommen keine Adresse, obwohl der Server läuft und der Pool frei ist.",
    quelle: "RFC 2131 · IOS-ähnlich (Snooping ist eine Switch-Funktion)",
    lohn: {euro: 70, ruf: 2}});
})();
