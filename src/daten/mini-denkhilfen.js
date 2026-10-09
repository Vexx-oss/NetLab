"use strict";
/* ---------- Fragebezogene Denkanstöße für die Mini-Tickets (P1b, task-20) ----------
   DATEN.miniDenkhilfen["mini-ping-3"] = {denkhilfe, ausschnitt?, stichwort}

   WARUM. Bis hierher las `miniDenktext(m)` nur `m.skill` (SENIOR_FRAGEN/WERKZEUGE). 92 Mini-Tickets
   verteilen sich auf 27 Fertigkeiten, 26 davon mit mehreren Minis – alle bekamen denselben Satz.
   `lab.ping` hat sechs Minis; auf „Der Router-Ping zeigt U.U.U – was ist los?" antwortete die Hilfe
   „Ping-Werkzeug (P): von einem Gerät auf das andere ziehen". Der Satz erinnert an das Werkzeug,
   nicht an die Frage. Hier steht je Mini der Denkanstoß, der zu DIESER Frage führt.

   DENKHILFE zeigt die Richtung, nie das Ergebnis: kein Lösungstext, keine wörtliche Option.
   Der Wächter in src/spiel/mini.js (`miniOhneLoesung`) prüft das trotzdem bei jedem Aufruf und
   fällt auf den Fertigkeitssatz zurück, wenn ein Text durchrutscht.

   AUSSCHNITT (optional) ist die zweite Sprosse für azubi. Er muss ein wörtlicher Ausschnitt aus
   Frage oder Schnappschuss sein (das prüft tests/spiel-mini-hilfe.test.js) – deshalb hier nur
   Zeichenketten, die in `frage` oder `schnappschuss.inhalt` wirklich vorkommen. Ohne Angabe gilt
   wie bisher: Schnappschuss, sonst erster Satz der Frage.

   STICHWORT ist der Kernbegriff der Frage (für `Spiel.mini.anker.stichwort`, damit die Oberfläche
   später den passenden Wiki-Abschnitt aufschlagen kann). Aufgenommen wurden hier die Minis, deren
   Kernbegriff auf der Wiki-Seite ihrer Fertigkeit NICHT vorkommt – gemessen am sichtbaren Wiki-Text
   (titel, kurz, abschnitte, merksatz, pruefungstipp, quelle) am 09.10.2026: **alle 25** Einträge
   unten stehen dort nicht (Test: tests/spiel-mini-denktexte.test.js, Schwelle 20).
   Beispiel: „U.U.U“ fehlt auf `lab.ping`, steht aber in DATEN.lehrtexte.NO_ROUTE.AP2.

   Für alle übrigen Minis gilt weiter der Fertigkeitssatz aus Spiel.SENIOR_FRAGEN / Spiel.WERKZEUGE.
   Deterministisch, kein DOM, LF-Zeilenenden. */
(() => {
  /* Kurzschreiber: D(denkhilfe, stichwort, ausschnitt?) */
  const D = (denkhilfe, stichwort, ausschnitt) => ausschnitt
    ? {denkhilfe, ausschnitt, stichwort}
    : {denkhilfe, stichwort};

  DATEN.miniDenkhilfen = {
    /* ---- lab.ping: sechs Minis, sechs verschiedene Anstöße (vorher: sechsmal derselbe Satz) ---- */
    "mini-ping-1": D("Drei Meldungen, drei Ursachen: Welche entsteht, weil niemand antwortet, welche meldet ein Gerät ausdrücklich – und welche ist gar keine Fehlermeldung?",
      "keine Antwort"),
    "mini-ping-2": D("Achte auf die Reihenfolge der Zeichen: Der erste Versuch verhält sich anders als alle folgenden. Was muss ein Router direkt vor dem ersten erfolgreichen Ping noch klären?",
      "Ausrufezeichen", "Ein Router-Ping zeigt \u201E.!!!!\u201C"),
    "mini-ping-3": D("Was bedeutet ein Punkt, was ein U in dieser Ausgabe – und wer schreibt die Zeichen: das Ziel selbst oder ein Gerät auf dem Weg?",
      "U.U.U", "Der Router-Ping zeigt \u201EU.U.U\u201C"),
    "mini-ping-4": D("Sortier die vier Prüfungen nach der Schicht, in der ein Fehler steckt: ganz unten das, was du anfassen kannst, ganz oben das, was du fragst.",
      "Schicht für Schicht", "Fehlersuche von unten nach oben"),
    "mini-cli-ping-1": D("Die Meldung sagt nur, dass gewartet wurde – nicht, warum. Welche der vier Antworten bleibt wahr, egal welche Ursache dahintersteckt?",
      "keine Antwort", "\u201EZeitüberschreitung der Anforderung\u201C"),
    "mini-cli-ping-2": D("Lies die Absenderadresse in der Meldung: Wer redet da mit wem? Die Antwort kommt nicht vom Router, sondern vom PC selbst.",
      "Zielhost nicht erreichbar"),

    /* ---- Terminal-Ausgaben deuten ---- */
    "mini-cli-tracert-1": D("Zähl die Zeilen: Welcher Hop hat geantwortet, und ab wann kommt keine Antwort mehr? Ein Sternchen ist keine Antwort, sondern Stille.",
      "Sternchen"),
    "mini-cli-systemctl-1": D("Der Auszug zeigt den Zustand des Dienstes. Fehlt Wissen über den Zustand oder der Zustand selbst – und wer darf ihn ändern?",
      "systemctl"),
    "mini-cli-befehle-1": D("Drei Fragen, drei Werkzeuge. Achte auf die Wortstämme: Wer zeigt die eigene Konfiguration, wer verfolgt den Weg, wer schlägt einen Namen nach?",
      "tracert"),

    /* ---- Link, Adresse, Netz ---- */
    "mini-link-1": D("Die Meldung kommt von der untersten Schicht. Welche der vier Möglichkeiten liegt auf derselben Schicht wie die Meldung?",
      "Netzwerkkabel nicht angeschlossen", "Ein PC meldet \u201ENetzwerkkabel nicht angeschlossen\u201C"),
    "mini-link-3": D("Zwei Spalten, zwei Fragen: Arbeitet Schicht 1 – und hat jemand von Hand abgeschaltet? Das Wort \u201Eadministratively\u201C kommt nicht von der Leitung.",
      "down / down"),
    "mini-ip-3": D("Zähl die möglichen Werte eines Oktetts durch: Von wo bis wo reicht eine IPv4-Zahl? Fällt diese Adresse schon beim Eintippen durch?",
      "256", "192.168.10.256 mit /24"),
    "mini-netz-3": D("Bei /25 zählt das letzte Bit mit: Wie viele Adressen passen in eine Hälfte des letzten Oktetts, und wo liegt die Grenze zwischen den beiden Hälften?",
      "/25", "172.16.5.130/25 und 172.16.5.100/25"),
    "mini-sub-2": D("Erst die Blockgröße aus der Maske bestimmen, dann den Block, in dem die Adresse liegt – und dann die letzte Adresse dieses Blocks.",
      "Broadcastadresse", "10.0.0.50/27"),
    "mini-arp-2": D("ARP reicht nur bis zum nächsten Gerät im eigenen Netz. Liegt das Ziel im eigenen Netz – und wenn nicht, wen muss der PC dann fragen?",
      "Gateway-MAC", "Nach welcher IP fragt er per ARP?"),

    /* ---- Switch, VLAN, ACL, Route ---- */
    "mini-sw-1": D("Der Switch hat zwei Möglichkeiten: wegwerfen oder breit verteilen. Welche passt zu einem Gerät, das Adressen erst lernen muss?",
      "unbekannte MAC", "eine MAC, die er nicht kennt"),
    "mini-vlan-3": D("Auf welches VLAN zeigt der Port – und gibt es dieses VLAN auf dem Switch überhaupt?",
      "VLAN-Datenbank", "VLAN 40, das es in der VLAN-Datenbank nicht gibt"),
    "mini-acl-4": D("Eine ACL wird nicht nach Genauigkeit ausgewertet, sondern in einer festen Reihenfolge. Welche Zeile gewinnt – und was steht darin?",
      "permit any"),
    "mini-route-4": D("Beide Routen passen auf das Ziel. Welche beschreibt es genauer – und welche Regel entscheidet, wenn mehrere passen?",
      "längster Präfix", "Routen: 10.0.0.0/8 über A, 10.1.0.0/16 über B."),
    "mini-nat-4": D("Drei private Bereiche gibt es. Einer davon ist ein ganzer Block, nicht nur ein einzelnes Netz – wo liegt seine Obergrenze?",
      "172.16.0.0/12"),

    /* ---- Dienste, Ports, Firewall ---- */
    "mini-dns-2": D("Trenne zwei Dinge: Wer hat geantwortet – und was hat er geantwortet? Bei einem unerreichbaren Server sähe die Ausgabe anders aus.",
      "NXDOMAIN"),
    "mini-dns-3": D("Drei Dienste, drei Ports: Wer übersetzt Namen, wer verteilt Adressen, wer verschlüsselt Webseiten? Die Zahlen dazu sind 53, 67 und 443.",
      "UDP 67"),
    "mini-tcp-2": D("Drei Pakete laufen vor den ersten Daten. Was müssen zwei Rechner klären, bevor sie mitzählen können, was ankommt?",
      "Drei-Wege-Handshake"),
    "mini-fwd-3": D("Die Weiterleitung stimmt und der Server läuft. Auf welchem Port klopft der Kunde an – und was tut ein Server, an dessen Tür niemand steht?",
      "RST", "der Server lauscht nur auf 443"),
    "mini-fw-3": D("In welcher Reihenfolge liest eine Firewall ihre Regeln – und welche Zeile trifft den Verkehr aus dem LAN zuerst?",
      "first match"),
  };
})();
