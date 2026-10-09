"use strict";
/* ---------- Fragebezogene Denkanstöße, Teil 3 (task-53, Ausbau 3.0) ----------
   DATEN.miniDenkhilfen["mini-sto-2"] = {denkhilfe, ausschnitt?, stichwort}

   WARUM DIESE DATEI. Teil 1 (mini-denkhilfen.js, 25 Einträge) und Teil 2
   (mini-denkhilfen2.js, 31 Einträge) bleiben unangetastet. Hier stehen die Denkanstöße zu den
   24 Minis, die mit dem Inhaltsausbau dazugekommen sind. Angehängt wird IDEMPOTENT und
   reihenfolge-unabhängig — genau wie in Teil 2:
     DATEN.miniDenkhilfen = Object.assign(DATEN.miniDenkhilfen || {}, { … });
   Der Name sortiert hinter „mini-denkhilfen2.js" ('2' 0x32 < '3' 0x33) und vor „mini.js"
   ('-' 0x2D < '.' 0x2E), die Schicht `daten` lädt alphabetisch (bauen.py, tests/run.js) —
   dieselbe Begründung wie im Kopf von Teil 2.

   DREI REGELN (Kopfkommentar der Grunddatei, bindend):
     · DENKHILFE zeigt die Richtung, nie das Ergebnis — kein Lösungstext, keine wörtliche Option.
       Der Wächter `miniOhneLoesung` (src/spiel/mini.js) prüft das bei jedem Aufruf.
     · AUSSCHNITT ist die zweite Sprosse für azubi und muss ein WÖRTLICHER Ausschnitt aus `frage`
       oder `schnappschuss.inhalt` sein.
     · STICHWORT ist der Kernbegriff der Frage und kommt auf der Wiki-Seite der Fertigkeit NICHT
       vor (gemessen am sichtbaren Wiki-Text: titel, kurz, abschnitte, merksatz, pruefungstipp,
       quelle). Geprüft in tests/mini-ausbau.test.js.
   LF-Zeilenenden, kein DOM, deterministisch (reine Daten). */
(() => {
  /* Kurzschreiber wie in den Grunddateien: D(denkhilfe, stichwort, ausschnitt?) */
  const D = (denkhilfe, stichwort, ausschnitt) => ausschnitt
    ? {denkhilfe, ausschnitt, stichwort}
    : {denkhilfe, stichwort};

  DATEN.miniDenkhilfen = Object.assign(DATEN.miniDenkhilfen || {}, {
    /* ---- lab.storage: NAS, SAN, iSCSI ---- */
    "mini-sto-2": D("Speicher gibt es auf drei Ebenen: Einer gibt fertige Dateien heraus, einer gibt rohe Blöcke heraus, einer hängt direkt am Rechner. Welcher verwaltet das Dateisystem selbst?",
      "Dateidienst"),
    "mini-sto-3": D("Ein Server soll seine Platten über das vorhandene Netz anbieten. Welche Ebene wird dabei übertragen — fertige Dateien oder rohe Blöcke — und welches Protokoll trägt sie?",
      "Blockprotokoll", "Blockspeicher über das normale LAN"),
    "mini-sto-4": D("Zwei Arten, Speicher anzubieten: Die eine gibt fertige Dateien heraus, die andere überlässt die Formatierung dem Rechner. Welche Beschreibung passt zu welcher Abkürzung?",
      "Speicherart", "Welche Aufgabe gehört zu welcher Speicherart?"),

    /* ---- lab.stp: Wurzel und Nachrichten ---- */
    "mini-stp-3": D("Einer muss die Rechnung machen: Wer hat die kleinste Kennung — und von wem aus werden dann alle Wege gemessen?",
      "Wurzelwahl", "Wer berechnet bei Spanning Tree den Baum?"),
    "mini-stp-4": D("Bevor der erste Nutzframe läuft, müssen sich die Switches einig sein: Wer ist der Chef, und welche Leitung darf ruhen? Wie redet man darüber, wenn noch kein Nutzverkehr fließt?",
      "STP-Nachrichten", "vor dem ersten Nutzverkehr"),

    /* ---- lab.nat: Zuordnung ---- */
    "mini-nat-5": D("Viele innere Adressen teilen sich eine äußere. Woran erkennt der Router später, welcher Rechner gemeint ist, wenn die Antwort zurückkommt?",
      "NAT-Zuordnung", "Wo findet der Router die Antwort auf eine übersetzte Verbindung wieder?"),

    /* ---- lab.tcp: Verzicht und Verlust ---- */
    "mini-tcp-4": D("Für Sprache zählt jede Millisekunde Wartezeit. Welches Transportprotokoll verzichtet deshalb auf Anklopfen und Bestätigungen — und was nimmt es dafür in Kauf?",
      "Echtzeit", "die keine Verzögerung verträgt"),
    "mini-tcp-5": D("Der Empfänger wiederholt dieselbe Bestätigungsnummer. Was sagt er damit — und warum ist sofort neu senden besser als abwarten?",
      "Sofortwiederholung", "Ein Segment fehlt, danach kommen drei gleiche Bestätigungen"),

    /* ---- lab.dns: Richtung und Erreichbarkeit ---- */
    "mini-dns-4": D("Einträge gibt es in beide Richtungen: einmal sucht man zu einem Namen die Adresse, einmal umgekehrt. Welche Richtung braucht ein Mailserver, um zu prüfen, wer da schreibt?",
      "Reverse-Zone", "Wozu dient ein PTR-Eintrag im DNS?"),
    "mini-dns-5": D("Der Name kommt nicht an. Bevor du beim Dienst suchst: Kann der Rechner den Server überhaupt erreichen, den er fragen soll?",
      "Erreichbarkeitsprüfung", "Was prüfst du zuerst?"),

    /* ---- lab.dhcp: geliehene Adresse ---- */
    "mini-dhcp-4": D("Die Adresse ist geliehen, nicht geschenkt. Wer verlängert wann — und was macht der Server mit einer Adresse, deren Zeit abgelaufen ist?",
      "Leihfrist", "Ein Client erneuert seine Lease nicht"),

    /* ---- lab.arp: Meldung ohne Frage ---- */
    "mini-arp-4": D("Eigentlich antwortet man nur auf eine Frage. Hier meldet sich ein Gerät von selbst — warum tut es das, und wem nützt diese Meldung?",
      "Selbstankündigung", "ohne dass jemand gefragt hat"),

    /* ---- lab.subnetz: /30 und Zusammenfassen ---- */
    "mini-sub-5": D("Zwei Router, eine Leitung: Wie viele Adressen braucht der Block wirklich — Netzadresse und Rundruf zählen mit?",
      "Punkt-zu-Punkt", "einer Leitung zwischen genau zwei Routern"),
    "mini-sub-6": D("Zwei benachbarte /24 sollen zu einer einzigen Zeile werden. Wie viele führende Bits haben beide gemeinsam — und was bedeutet das für den Präfix?",
      "Supernetting", "sollen als EINE Route stehen"),

    /* ---- lab.vlan: Werkszustand und Umstecken ---- */
    "mini-vlan-4": D("Ein frischer Switch hat noch keine Konfiguration. Ist ein nicht eingerichteter Port deshalb wirklich abgeschaltet — oder gehört er längst zu einem Netz?",
      "Werkskonfiguration", "den niemand eingerichtet hat"),
    "mini-vlan-5": D("Steckt die Gruppenzugehörigkeit im Gerät oder im Anschluss? Wenn der PC den Anschluss wechselt, wer muss dann angepasst werden?",
      "Portbindung", "Ein PC zieht von Fa0/1"),

    /* ---- lab.trunk: ungleiche Enden ---- */
    "mini-trunk-4": D("Ein Trunk trägt getaggte Frames — und eine Gruppe läuft ohne Tag mit. Was passiert, wenn die beiden Enden dabei nicht dasselbe meinen?",
      "Mismatch-Meldung", "doch es fließen kaum Frames"),

    /* ---- lab.portsec: wer trägt ein ---- */
    "mini-psec-4": D("Wer trägt die erlaubten Adressen ein — der Mensch oder der Switch? Was spart der Zusatz, wenn das erste Gerät an diesem Port ein neues ist?",
      "Selbstlernen am Port", "Was bewirkt der Zusatz sticky"),

    /* ---- lab.switch: Domänen ---- */
    "mini-sw-4": D("Rundrufe stoppen an der Gruppengrenze. Wie viele solcher Grenzen gibt es, wenn drei Gruppen nebeneinander liegen — und was verbindet sie erst wieder?",
      "Domänengrenze"),

    /* ---- lab.ip: reservierte Bereiche ---- */
    "mini-ip-4": D("Drei Bereiche sind für den Hausgebrauch reserviert und tauchen deshalb nie im weltweiten Netz auf. Gehört die Adresse der Frage dazu?",
      "reservierte Bereiche", "Welche Adresse ist nach RFC 1918 privat?"),

    /* ---- lab.netz: Blockgrenze ---- */
    "mini-netz-4": D("Rechne mit der Maske nach: In welchem Block liegt jede der beiden Adressen? Erst wenn beide im selben Block liegen, fragt der PC direkt.",
      "Netzgrenze", "PC 172.16.5.10/26 pingt 172.16.5.70/26"),

    /* ---- lab.route: Herkunft der Route ---- */
    "mini-route-5": D("Beide Wege führen zum Ziel und passen gleich genau. Gibt es eine Zahl, die die Herkunft der Route bewertet — und wer gewinnt bei Gleichstand?",
      "Routeherkunft", "Was entscheidet?"),

    /* ---- lab.fw: laufende Verbindungen ---- */
    "mini-fw-4": D("Die Firewall kennt die Verbindungen, die gerade laufen. Muss die Antwort auf eine erlaubte Anfrage deshalb noch einmal eigens erlaubt werden?",
      "Zustandstabelle", "Welche Regel braucht eine zustandsbehaftete Firewall NICHT?"),

    /* ---- lab.ports: zwei Portnummern ---- */
    "mini-port-4": D("Zwei Portnummern stecken in jedem Paket: die des Dienstes und die des Absenders. Welche davon steht im Ziel, wenn ein Client eine Webseite öffnet?",
      "Quellport", "Welcher Port steht im Ziel des ersten Pakets?"),
  });
})();
