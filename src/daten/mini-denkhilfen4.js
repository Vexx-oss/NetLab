"use strict";
/* ---------- Fragebezogene Denkanstöße, Teil 4 (Welle 2, S6a/S6b) ----------
   DATEN.miniDenkhilfen["mini-ipv6-1"] = {denkhilfe, ausschnitt?, stichwort}

   WARUM DIESE DATEI. Teil 1–3 bleiben unangetastet. Hier stehen die Denkanstöße zu den 20 Minis
   der am 29.10.2026 angehängten Fertigkeiten lab.ipv6 (6), lab.betrieb (6) und lab.wlan (8).
   Angehängt wird IDEMPOTENT und reihenfolge-unabhängig wie in Teil 2/3:
     DATEN.miniDenkhilfen = Object.assign(DATEN.miniDenkhilfen || {}, { … });
   Der Name sortiert hinter „mini-denkhilfen3.js" ('3' 0x33 < '4' 0x34) und vor „mini.js";
   die Schicht `daten` lädt alphabetisch (bauen.py, tests/run.js) – dieselbe Begründung wie dort.

   DREI REGELN (Kopfkommentar der Grunddatei, bindend):
     · DENKHILFE zeigt die Richtung, nie das Ergebnis – kein Lösungstext, keine wörtliche Option.
       Der Wächter `miniOhneLoesung` (src/spiel/mini.js) prüft das bei jedem Aufruf.
     · AUSSCHNITT ist die zweite Sprosse für azubi und muss ein WÖRTLICHER Ausschnitt aus `frage`
       oder `schnappschuss.inhalt` sein (hier nur bei einem Mini gesetzt).
     · STICHWORT ist der Kernbegriff der Frage und kommt auf der Wiki-Seite der Fertigkeit NICHT
       vor (am sichtbaren Wiki-Text gemessen: titel, kurz, abschnitte, merksatz, pruefungstipp,
       quelle). Geprüft in tests/inhalte-s6.test.js.
   LF-Zeilenenden, kein DOM, deterministisch (reine Daten). */
(() => {
  /* Kurzschreiber wie in den Grunddateien: D(denkhilfe, stichwort, ausschnitt?) */
  const D = (denkhilfe, stichwort, ausschnitt) => ausschnitt
    ? {denkhilfe, ausschnitt, stichwort}
    : {denkhilfe, stichwort};

  DATEN.miniDenkhilfen = Object.assign(DATEN.miniDenkhilfen || {}, {
    /* ---- lab.ipv6: Adressen, Präfixe, NDP ---- */
    "mini-ipv6-1": D("Zähl die Bits eines Blocks zusammen: Wie viele Blöcke hat die Adresse, und wie viele Bit stecken in einem Block?",
      "Adresslänge", "Wie lang ist eine IPv6-Adresse?"),
    "mini-ipv6-2": D("Prüf zuerst, wie oft die abkürzende Zeichenfolge vorkommen darf – und ob die ausgeschriebene Form nicht schon vollständig ist.",
      "Doppelpunkt-Kürzung"),
    "mini-ipv6-3": D("Nicht der Hostteil entscheidet, sondern der Anfang der Adresse: Welcher reservierte Bereich steht für welchen Zweck?",
      "Präfixbereich"),
    "mini-ipv6-4": D("Rechne die Differenz der beiden Präfixlängen aus: So viele Bit bleiben für Netze übrig. Zwei Nibbles sind ein Byte.",
      "Subnetzanzahl"),
    "mini-ipv6-5": D("Vergleich nur den Netzanteil beider Adressen: Wie weit reicht das Präfix, und unterscheiden sich die Adressen dahinter?",
      "gleiches Präfix"),
    "mini-ipv6-6": D("Zwei Nachrichtentypen kommen vom Router, zwei betreffen die Nachbarschaft. Welcher Typ trägt die Netzinformationen?",
      "Routerankündigung"),

    /* ---- lab.betrieb: Syslog, Schwellwert, Backup, Uptime ---- */
    "mini-betrieb-1": D("Die Skala ist eine Zählung von dringend nach harmlos. Welche Zahl steht für den schlimmsten Fall?",
      "Schweregrad"),
    "mini-betrieb-2": D("Zwei Schwellen statt einer: Was passiert mit einer Anzeige, die genau an einer einzigen Grenze klebt?",
      "Rückschwelle"),
    "mini-betrieb-3": D("Achte auf den Bezugspunkt: Ab welchem Stand werden die Änderungen gezählt – ab jeder Sicherung oder ab der letzten vollständigen?",
      "Sicherungsfolge"),
    "mini-betrieb-4": D("Rechne den Prozentsatz in Stunden um: Ein Jahr hat 8760 Stunden, ein Prozent davon ist schon viel.",
      "Jahresausfall"),
    "mini-betrieb-5": D("Nach einem Neustart liest ein Router nicht den Zwischenspeicher, sondern einen gespeicherten Stand. Welcher Schritt fehlte vorher?",
      "Konfigurationsspeicher"),
    "mini-betrieb-6": D("Die Reihenfolge folgt dem Denken: erst wahrnehmen, dann messen, dann beweisen, dann handeln und aufschreiben.",
      "Störungsweg"),

    /* ---- lab.wlan: SSID, VLAN, Sicherheit, Gastnetz ---- */
    "mini-wlan-1": D("Zwei Kennungen werden oft verwechselt: Die eine ist der Name, die andere die Hardware-Kennung des Funkteils. Welche ist welche?",
      "Funkmodul-Adresse"),
    "mini-wlan-2": D("Denk an ein Zimmer, in dem alle gleichzeitig reden: Was teilen sich die Geräte, wenn nur einer senden kann?",
      "Luftzeit"),
    "mini-wlan-3": D("Für jede Funkzelle gibt es genau ein Netz. Welche Zeile der Planungstabelle sagt, wohin ein Gast gehört?",
      "Zuordnungstabelle"),
    "mini-wlan-4": D("Der Unterschied liegt nicht im Passwort, sondern in der Stelle, die die Anmeldung prüft. Wer kennt die einzelnen Konten?",
      "Anmeldeserver"),
    "mini-wlan-5": D("Gast und Mitarbeiter liegen in getrennten Netzen. Wer entscheidet, ob zwischen ihnen Pakete fließen dürfen?",
      "Firmennetz-Zugriff"),
    "mini-wlan-6": D("Vereinfachung ist hier ein Risiko: Welche Anmeldehilfe lässt sich mit wenigen Versuchen erraten?",
      "Kopplungsknopf"),
    "mini-wlan-7": D("Die Schritte bauen aufeinander auf: Erst die Zelle, dann die Anmeldung, dann die Adresse – was kann erst nach der Verschlüsselung kommen?",
      "Anmeldekette"),
    "mini-wlan-8": D("Ein Trunk trägt getaggte und ungetaggte Frames. Welche Einstellung bestimmt, wohin die ungetaggten gehören – und was passiert bei ungleichen Enden?",
      "Uplink-Tag"),
  });
})();
