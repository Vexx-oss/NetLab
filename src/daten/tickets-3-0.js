"use strict";
/* ---------- Handgeschriebene Tickets für die neuen Fertigkeiten (Welle 2 · S6, Architektur § 17.1/§ 17.3) ----------
   Drei Themen, die im Simulator NICHT paketweise ausgeführt werden (ehrliche Grenze § 17.1): IPv6,
   Betrieb/Überwachung und WLAN. Geübt wird, was ohne Engine-Umbau ehrlich geht: Planung, Bestandsaufnahme,
   Dokumentation und Bewertung auf einem vorhandenen Netz.
   Deshalb: KEIN Injektor (kein Fehlerbild, das die Simulation nicht kennt), sondern Arbeitsziele
   (notiz/tabelle/befehl/antwort, Architektur § 9.5) – die Abnahme prüft das Ergebnis der Arbeit.
   Stil: docs/entwicklung/Stilfaden – Auftragstexte.md (Symptom 180–420 Zeichen, 2–4 Sätze, keine Ursachenwörter);
   Gate: <node> tools/texte-messen.js --tor. Keine neue Datenform: zusatzZiele + vorhandene Zielarten. */
(() => {
  const T = DATEN.ticketSpec;
  const t = spec => DATEN.tickets.push(T(spec));

  /* ===== IPv6 (lab.ipv6, AP1, Karriere-Stufe 5): Planung für die neue Halle ===== */
  t({id: "ipv6-01", reihe: 11, kunde: "mittelstand", karriere: 5, stufe: "AP1", vorlage: "standorte", vSeed: 81, minuten: 6,
    injektoren: [], ziele: [],
    skills: ["lab.ipv6", "lab.ip"],
    zusatzZiele: [
      {typ: "notiz", id: "ipv6-konzept", min: 20, text: "IPv6-Konzept für die Halle notiert (Adressbereich, /64-Netze, Übergangsweg)"},
      {typ: "befehl", geraet: "verkauf", muster: "^ipconfig( /all)?$", beispiel: "ipconfig /all", text: "Bestand der Rechneradressen aufgenommen (ipconfig /all)"},
    ],
    hilfen: {frage: ["Wie lang ist eine IPv6-Adresse, und wie viele Host-Bits bleiben bei einem /64-Netz?"],
      bereich: [{geraet: "verkauf"}],
      konkret: ["Schreib in die Notiz: ein /64-Netz hat 64 Host-Bits – daraus ergibt sich die Zahl der Netze aus dem Adressbereich. Im Labor wird IPv6 geplant, nicht paketweise simuliert."]},
    titel: "IPv6-Konzept für die neue Halle",
    briefing: "Hallo,\nwir planen die neue Halle und wollen die Adressierung dort mit IPv6 aufsetzen; ein kurzes Konzept genügt mir.\n\nDr. Ines Kessler",
    symptom: "Guten Tag, für die neue Halle wollen wir die Adressierung mit IPv6 planen; bisher läuft im Haus alles über IPv4. Vom Provider bekommen wir einen Adressbereich, die Unterlagen liegen mir noch nicht vor. Unser Dienstleister fragt nach einem kurzen Konzept, bevor er die Technik bestellt. Ich habe zwei Abkürzungen auf einem Datenblatt gelesen, die ich nicht sicher zuordnen kann.",
    erklaerung: "Eine IPv6-Adresse ist 128 Bit lang; ein /64-Netz lässt 64 Bit für Hosts und ist die übliche Größe je LAN. Ein Konzept hält Adressbereich, Netzaufteilung, den Übergang (dual-stack) und die Dokumentation fest. Im Labor wird IPv6 gelesen, geplant und bewertet – nicht paketweise simuliert.",
    quelle: "RFC 4291 (IPv6-Adressarchitektur) · BSI IT-Grundschutz (Netzplanung) – inhaltlich geübt, nicht simuliert",
    loesung: [{aktion: "erklaeren", text: "Konzept notieren: Adressbereich des Providers, Aufteilung in /64-Netze je LAN, dual-stack als Übergang und die Übergabe an die Dokumentation."}],
    lohn: {euro: 170, ruf: 3}});

  /* ===== Betrieb/Überwachung (lab.betrieb, AP2, Karriere-Stufe 5): Übergabe dokumentieren ===== */
  t({id: "betrieb-01", reihe: 12, kunde: "mittelstand", karriere: 5, stufe: "AP2", vorlage: "standorte", vSeed: 82, minuten: 6,
    injektoren: [], ziele: [],
    skills: ["lab.betrieb", "lab.ports"],
    zusatzZiele: [
      {typ: "notiz", id: "betriebsnotiz", min: 20, text: "Übergabenotiz für die Frühschicht geschrieben (Stand, offene Punkte, Schwellwert)"},
      {typ: "befehl", geraet: "werkstatt", muster: "^netstat$", beispiel: "netstat", text: "Offene Verbindungen des Werkstatt-Rechners angesehen (netstat)"},
    ],
    hilfen: {frage: ["Was gehört in eine Übergabe: aktueller Stand, offene Punkte – und was passiert, wenn ein Wert die Schwelle überschreitet?"],
      bereich: [{geraet: "werkstatt"}],
      konkret: ["Notiere in der Übergabe drei Dinge: welcher Dienst gerade spricht (netstat), welche Schwelle gilt und wer bei Überschreitung informiert wird."]},
    titel: "Übergabe an die Frühschicht",
    briefing: "Hallo,\nich übergebe den Betrieb nächste Woche an einen Kollegen; eine kurze Übergabenotiz genügt mir.\n\nDr. Ines Kessler",
    symptom: "Guten Tag, ich übergebe den Betrieb nächste Woche an einen Kollegen und möchte ihm den aktuellen Stand der Überwachung schriftlich mitgeben. Unser Dienstleister hat die Schwellwerte im letzten Jahr zweimal angepasst, die Notizen dazu sind verloren. Ich habe versucht, die Werte aus alten Mails zusammenzusuchen, das ist lückenhaft geblieben. Können Sie den Stand prüfen und mir daraus eine kurze Übergabenotiz machen?",
    erklaerung: "Betriebsdokumentation hält fest, was läuft, wer es überwacht und ab welchem Wert jemand eingreift. Ein Blick auf die offenen Verbindungen (netstat) gehört dazu, weil er den Ist-Stand belegt; Schwellwerte und Zuständigkeiten stehen daneben in der Notiz. Das Labor übt das Dokumentieren, nicht das Paket-Monitoring.",
    quelle: "ITIL 4 (Incident/Service Management) · BSI IT-Grundschutz (Betrieb) – inhaltlich geübt, nicht simuliert",
    loesung: [{aktion: "erklaeren", text: "Übergabenotiz schreiben: Ist-Stand der Verbindungen (netstat), geltende Schwellwerte, offene Punkte und wer bei Überschreitung informiert."}],
    lohn: {euro: 190, ruf: 3}});

  /* ===== WLAN (lab.wlan, AP1, Karriere-Stufe 5): Gästenetz planen ===== */
  t({id: "wlan-01", reihe: 13, kunde: "mittelstand", karriere: 5, stufe: "AP1", vorlage: "standorte", vSeed: 83, minuten: 7,
    injektoren: [], ziele: [],
    skills: ["lab.wlan", "lab.vlan"],
    zusatzZiele: [
      {typ: "notiz", id: "wlan-plan", min: 20, text: "WLAN-Plan notiert (SSID, eigenes VLAN, Gästenetz vom Firmennetz getrennt)"},
      {typ: "tabelle", id: "adressplan", basis: "192.168.40.0/24",
       zeilen: [{name: "Gäste", hosts: 40}, {name: "Empfang", hosts: 6}],
       spalten: ["netz", "erster", "letzter", "broadcast"], text: "Adressplan für das Gästenetz vollständig ausgefüllt"},
    ],
    hilfen: {frage: ["Welche drei Dinge braucht ein Gäste-WLAN mindestens: Name (SSID), eigenes Netz – und was noch, damit Gäste nicht ins Firmennetz kommen?"],
      bereich: [],
      konkret: ["Notiere: SSID „Gast“, eigenes VLAN/Adressnetz und die Trennung vom Firmennetz. Für den Adressplan gilt wie überall: Geräte + 2 Adressen, aufgerundet auf eine Zweierpotenz."]},
    titel: "Gäste-WLAN für den Empfang",
    briefing: "Hallo,\nwir richten im Empfang ein Gäste-WLAN ein und brauchen dafür nur einen kurzen Plan.\n\nDr. Ines Kessler",
    symptom: "Guten Tag, im Empfang sollen Besucher künftig ein eigenes WLAN nutzen können, getrennt vom Firmennetz. Die Geschäftsführung hat dafür ein Gästenetz freigegeben, die Technik ist noch nicht beauftragt. Ich habe zwei Angebote verglichen und drei Rückfragen gesammelt, komme ohne Plan aber nicht weiter. Können Sie mir die Eckpunkte für den Empfang aufschreiben?",
    erklaerung: "Ein Gästenetz trennt Besucher technisch vom Firmennetz: eigenes VLAN, eigener Adressbereich und eine Regel, die nur ins Internet lässt. Ein WLAN-Konzept hält SSID, Netz, Zugang und Verantwortliche fest. Im Labor wird WLAN geplant und dokumentiert, nicht gefunkt.",
    quelle: "IEEE 802.11 (WLAN-Grundlagen) · BSI IT-Grundschutz (WLAN, Gästenetze) – inhaltlich geübt, nicht simuliert",
    loesung: [{aktion: "erklaeren", text: "Plan schreiben: SSID „Gast“, eigenes VLAN mit eigenem Adressnetz, Trennung vom Firmennetz, Adressplan für das Gästenetz ausfüllen."}],
    lohn: {euro: 175, ruf: 3}});

  /* ===== WLAN/Sicherheit (lab.wlan + lab.portsec, AP2, Karriere-Stufe 6): Fremdzugang bewerten ===== */
  t({id: "wlan-02", reihe: 9, kunde: "storage", karriere: 6, stufe: "AP2", vorlage: "standorte", vSeed: 84, minuten: 7,
    injektoren: [], ziele: [],
    skills: ["lab.wlan", "lab.portsec"],
    zusatzZiele: [
      {typ: "notiz", id: "wlan-freigabe", min: 20, text: "Freigabe-Notiz geschrieben (SSID, VLAN, erlaubte Geräte, nächster Prüftermin)"},
      {typ: "befehl", geraet: "sw1", muster: "^show port-security$", beispiel: "show port-security", text: "Port-Security des Switches angesehen (show port-security)"},
    ],
    hilfen: {frage: ["Wo ist der Zugang eines Geräts festgelegt – am Funk oder am Port des Switches – und wo steht, welche Geräte erlaubt sind?"],
      bereich: [{geraet: "sw1"}],
      konkret: ["Vergleiche zwei Dinge: die erlaubten Geräte am Switchport (show port-security) und den geplanten Gastzugang im WLAN-Konzept. Was nicht in beiden steht, ist nicht freigegeben."]},
    titel: "Fremdzugang im Besprechungsraum",
    briefing: "Hallo,\nim Besprechungsraum war ein fremdes Gerät im Netz; eine kurze Rückmeldung genügt mir.\n\nJana Wolff",
    symptom: "Guten Tag, im Besprechungsraum hat gestern ein externes Notebook Zugang zum Firmennetz bekommen, ohne dass es jemand angekündigt hat. Der Besucher sagte, das WLAN sei offen; ich habe das Gerät selbst nicht gesehen. Unser Dienstleister hat die Liste der erlaubten Geräte zuletzt vor einem halben Jahr angepasst. Für die Übergabe an die Technik brauchen wir einen belastbaren Stand.",
    erklaerung: "Ein WLAN-Zugang ist ein Netzzugang wie ein Kabelport: SSID und VLAN werden geplant, Geräte werden freigegeben, und am Switch lässt sich mit Port-Security nachweisen, welche MAC-Adressen erlaubt sind. Ein Gastnetz gehört dabei in ein eigenes VLAN ohne Weg ins Firmennetz. Im Labor ohne Funk: geplant und am Switch geprüft.",
    quelle: "IEEE 802.11 · BSI IT-Grundschutz (WLAN, Zutrittskontrolle) · Cisco Port-Security – inhaltlich geübt, nicht simuliert",
    loesung: [{aktion: "erklaeren", text: "Notiz schreiben: SSID und VLAN des Gastes, erlaubte Geräte laut Switchport prüfen, Trennung vom Firmennetz und nächster Prüftermin."}],
    lohn: {euro: 240, ruf: 5}});
})();
