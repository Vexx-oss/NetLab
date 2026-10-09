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
   (titel, kurz, abschnitte, merksatz, pruefungstipp, quelle): am 09.10.2026 für die 25 Einträge aus
   task-20, in dieser Sitzung erneut nachgemessen für die 35 aus task-6 – **alle 60** Einträge dieser
   Datei stehen dort nicht (Tests: tests/spiel-mini-denktexte.test.js, Schwelle 20;
   tests/denkhilfen-teil1.test.js für die 35 aus task-6).
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

    /* ============ Teil 1 (task-6): 35 weitere Minis mit eigenem Denkanstoß ============
       Die 25 Einträge darüber stammen aus task-20; die folgenden 35 sind die erste Hälfte des
       Fahrplans 1.3/2.0, Schritt 2 (task-6). Aufbau, Regeln und Kurzschreiber D bleiben gleich;
       gegengelesen wird das in tests/denkhilfen-teil1.test.js.
       mini-link-2 bleibt bewusst ohne Eintrag (reserviert; tests/spiel-mini-denktexte.test.js
       braucht mindestens ein Mini, das auf den Fertigkeitssatz zurückfällt). */

    /* ---- lab.gateway: drei Modul-Minis und die beiden Terminal-Minis am Gateway ---- */
    "mini-gw-1": D("Im Schnappschuss ist eine Zeile leer geblieben. Vergleiche die drei Einträge: Welche Angabe fehlt – und wohin schickt ein PC ein Ziel, das nicht in seinem eigenen Netz liegt?",
      "kein Weg ins Internet", "Standardgateway :"),
    "mini-gw-2": D("Rechne die Maske aus: In welchem Netz steht der PC, in welchem das eingetragene Gerät – und kann der PC ein Gerät in einem fremden Netz überhaupt direkt ansprechen?",
      "Gateway außerhalb des eigenen Netzes", "mit Gateway 192.168.6.1"),
    "mini-gw-3": D("Der PC muss dieses Gerät ohne Umweg erreichen können. Welche Adresse des Routers liegt deshalb in seinem eigenen Netz – und welche Adressen im Netz sind schon für anderes reserviert?",
      "Router-Adresse im LAN", "an einem PC als Standardgateway"),
    "mini-cli-ipconfig-1": D("Lies die Ausgabe von oben nach unten: In welchem Netz steht dieser PC – und welche der drei Zeilen entscheidet, wer Pakete für ein fremdes Ziel übernimmt?",
      "Ziel außerhalb des eigenen Netzes", "Standardgateway . . : 192.168.1.1"),
    "mini-cli-netsh-1": D("Gesucht ist ein Befehl, der Adresse, Maske und den Weg nach draußen in einem Zug setzt. Welches Werkzeug verwaltet die Adapter-Einstellungen – und welches der genannten zeigt nur an?",
      "Gateway per Windows-Befehl setzen", "per Befehl das Standardgateway"),

    /* ---- lab.ip: zwei Modul-Minis und das Terminal-Mini zu den Linux-Gegenstücken ---- */
    "mini-ip-1": D("Eine Rechneradresse muss zwei Proben bestehen: Sie darf nicht für Netz oder Rundruf reserviert sein – und sie muss im Netz der Frage liegen. Prüf jede der vier Adressen an beiden Proben.",
      "vergebbare Hostadresse", "darf ein PC im Netz"),
    "mini-ip-2": D("Ein Konflikt entsteht nicht durch eine fehlende Einstellung, sondern durch eine Adresse, die zweimal vergeben wurde. Wie merkt ein Rechner, dass seine Adresse noch jemand anderes benutzt?",
      "doppelt vergebene Adresse", "meldet beim Start einen Adresskonflikt"),
    "mini-cli-linux-1": D("Drei Aufgaben, drei Paare: eigene Adresse ansehen, den Weg zum Ziel verfolgen, die Routentabelle zeigen. Welches Linux-Werkzeug übernimmt welche dieser Aufgaben?",
      "Linux-Gegenstück", "Linux-Gegenstück zu"),

    /* ---- lab.subnetz ---- */
    "mini-sub-1": D("Rechne die Maske in eine Blockgröße um: Wie viele Adressen umfasst jeder Block – und in welchem Block liegt die Adresse aus der Frage?",
      "Netzadresse im richtigen Block", "die Netzadresse von"),
    "mini-sub-3": D("Zähl zuerst die Hostbits hinter dem Präfix. Von den Adressen eines Blocks gehen zwei für Netz und Rundruf ab – wie viele bleiben für Rechner übrig?",
      "nutzbare Hosts pro Netz", "/28-Netz"),
    "mini-sub-4": D("Jede Stelle weniger im Präfix verdoppelt den Adressraum. Zähl die Hostbits hinter jedem Schrägstrich: Welcher Eintrag hat die meisten, welcher die wenigsten?",
      "meiste Hosts zuerst", "die meisten zuerst"),

    /* ---- lab.dhcp ---- */
    "mini-dhcp-1": D("Vier Nachrichten, zwei Rollen: Wer muss zuerst fragen – und wer darf erst nach dieser Frage antworten? Prüf jede Nachricht darauf, ob sie vom Kunden oder vom Server stammt.",
      "Ablauf der Adressvergabe", "die vier Nachrichten"),
    "mini-dhcp-2": D("Diese Adresse stammt nicht von einem Server: Der Bereich ist für den Notfall gedacht, in dem sich ein Rechner selbst eine Adresse gibt. Wen hat er vorher vergeblich gefragt?",
      "selbst vergebene Notadresse", "Adresse 169.254.12.7"),
    "mini-dhcp-3": D("Der Kunde sucht seinen Server per Rundruf, und ein Router reicht Rundrufe nicht weiter. Welche Aufgabe muss deshalb die Schnittstelle am Client-Netz übernehmen?",
      "Rundruf über die Netzgrenze", "in einem anderen Netz"),

    /* ---- lab.ports ---- */
    "mini-port-1": D("Ordne nicht nach der Zahl, sondern nach der Aufgabe: Welcher Dienst öffnet eine Shell, welcher überträgt Dateien, welcher liefert Webseiten – und welcher davon ist die verschlüsselte Fassung?",
      "Standardport der Dienste", "ihren Standardport"),
    "mini-port-2": D("Der Ping beweist, dass der Weg bis zum Server steht. Die Ablehnung kommt trotzdem – von wem also, und was fehlt dort auf der oberen Ebene?",
      "Dienst lauscht nicht auf dem Port", "der Browser meldet"),
    "mini-port-3": D("Ein geschlossener Port weist eine neue Verbindung sofort und aktiv ab. Welche der vier Antworten ist diese Abweisung – und welche käme von einem lauschenden Dienst oder von einer stummen Firewall?",
      "Reset auf geschlossenen Port", "wenn auf einem TCP-Port nichts lauscht"),

    /* ---- lab.cli ---- */
    "mini-cli-1": D("Vier Ebenen, zwei Fragen: Erst klärt sich, WIE VIEL du darfst, dann, WIE ENG dein Ziel ist. Frag bei jedem Prompt, welche der beiden Fragen er beantwortet.",
      "Reihenfolge der Modi", "die Modi von IOS"),
    "mini-cli-2": D("Anzeigebefehle gehören in die privilegierte Ebene. Was musst du voranstellen, damit ein solcher Befehl auch aus der Konfigurationsebene läuft?",
      "do-Präfix im Konfigurationsmodus", "und willst die Schnittstellen sehen"),
    "mini-cli-3": D("Drei IOS-Meldungen, drei Ursachen: Die eine heißt sinngemäß kenne ich nicht, die andere gib mehr ein – diese hier hat einen dritten Grund. Was ist an deiner Eingabe mehrdeutig?",
      "mehrdeutige Abkürzung", "\u201E% Ambiguous command\u201C"),

    /* ---- lab.speichern ---- */
    "mini-save-1": D("Zwei Fassungen der Konfiguration liegen an verschiedenen Orten: Die eine gilt nur, solange das Gerät läuft. Welche ist flüchtig – und welche überlebt einen Neustart?",
      "flüchtige Konfiguration im RAM", "Wo liegt die running-config"),
    "mini-save-2": D("Vier Befehle, vier Wirkungen: einer kopiert, einer startet neu, einer löscht, einer zeigt an. Welcher kopiert aus der laufenden in die dauerhafte Fassung?",
      "dauerhaft sichern", "sichert deine Änderungen dauerhaft"),
    "mini-save-3": D("Zwei Speicherorte, zwei Löschbefehle: Der eine wischt nur die gespeicherte Konfiguration weg. Was legt ein Switch an anderer Stelle ab – und erwischt der Löschbefehl das auch?",
      "VLAN-Datenbank überlebt write erase", "\u201Ewrite erase\u201C und \u201Ereload\u201C"),

    /* ---- lab.trunk ---- */
    "mini-trunk-1": D("Ein Kabel, viele Netze: Woran erkennt die Gegenstelle, zu welchem Netz ein Frame gehört – und wie viele Netze darf ein solcher Anschluss gleichzeitig tragen?",
      "Trunk gegen Access-Port", "einen Trunk-Port von einem Access-Port"),
    "mini-trunk-2": D("Auf jedem Trunk läuft genau ein Netz ohne Etikett – sonst wüsste die Gegenstelle nicht, wohin damit. Welches Netz ist das, wenn beide Enden nichts anderes vereinbart haben?",
      "ungetaggte Frames", "802.1Q-Trunk ohne Tag"),
    "mini-trunk-3": D("Vergleiche das Netz der PCs mit der Liste im Schnappschuss – und prüfe danach, ob die Ursache eher in dieser Liste oder in der Betriebsart des Anschlusses liegt.",
      "erlaubte VLAN-Liste am Trunk", "Vlans allowed on trunk"),

    /* ---- lab.rostick ---- */
    "mini-ros-1": D("Ein einziger Anschluss trägt mehrere Netze, und der Router bekommt für jedes Netz eine eigene logische Schnittstelle. Wie heißt dieses Verfahren – und was braucht der Anschluss am Switch dafür?",
      "Router mit Unterschnittstellen", "Was ist Router-on-a-Stick"),
    "mini-ros-2": D("Drei Befehle, drei Abhängigkeiten: Welcher schafft erst den Kontext, in dem der nächste überhaupt etwas bewirkt? Frag bei jedem, was IOS verweigert, solange er fehlt.",
      "Reihenfolge der Subinterface-Befehle", "Reihenfolge der Befehle"),
    "mini-ros-3": D("Der Name hinter dem Punkt ist nur ein Etikett. Entscheidend ist die Nummer, die in der Zeile selbst steht – und welche Nummer die Frames der PCs tragen. Passen beide zusammen?",
      "dot1Q-Zahl gegen VLAN-Nummer", "\u201Eencapsulation dot1Q 21\u201C"),

    /* ---- lab.acl ---- */
    "mini-acl-1": D("Eine ACL ist eine Liste mit einer festen Leserichtung. Was passiert mit den Zeilen, die nach dem ersten Treffer noch darunter stehen?",
      "Leserichtung der Regeln", "eine Access-Liste ausgewertet"),
    "mini-acl-2": D("Am Ende einer Liste steht eine Zeile, die niemand getippt hat – und sie ist nicht freundlich. Was macht eine ACL mit einem Paket, für das keine Zeile passt?",
      "implizites deny am Listenende", "unsichtbar am Ende jeder ACL"),
    "mini-acl-3": D("Eine Wildcard ist eine Vergleichsmaske: Eine 1 heißt, diese Stelle ist egal; eine 0 heißt, hier muss es passen. Zähl die egal-Stellen und ordne jeder Wildcard die passende Reichweite zu.",
      "Nullen und Einsen der Wildcard", "Welche Wildcard bedeutet was"),

    /* ---- lab.route ---- */
    "mini-route-1": D("Sie passt auf jedes Ziel, ist aber die ungenaueste Route von allen. Wann greift sie deshalb – und was gilt, wenn eine genauere Route vorhanden ist?",
      "Route für alle übrigen Ziele", "Was ist die Default-Route"),
    "mini-route-2": D("Drei Angaben gehören in eine statische Route: Zielnetz, Maske und der nächste Sprung. In welcher Reihenfolge erwartet das Gerät sie – und wo steht der nächste Sprung?",
      "Zielnetz, Maske und nächster Sprung", "Welcher Befehl schickt"),
    "mini-route-3": D("Die Anfrage kommt an – nur die Antwort findet keinen Weg. Was macht ein Router mit einem Paket, dessen Rückweg fehlt, und was merkt der Absender davon?",
      "fehlende Rückroute", "der Ziel-Router hat keine Rückroute"),
  };
})();
