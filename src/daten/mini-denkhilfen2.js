"use strict";
/* ---------- Fragebezogene Denkanstöße, Teil 2 (task-7) – Ergänzung zur Grunddatei ----------
   DATEN.miniDenkhilfen["mini-ttl-1"] = {denkhilfe, ausschnitt?, stichwort}

   WARUM DIESE DATEI SO HEISST. bauen.py:60 und tests/run.js:32 laden die Schicht `daten`
   alphabetisch. „mini-denkhilfen.js" steht vor „mini-denkhilfen2.js", weil an Position 15
   '.' (0x2E) vor '2' (0x32) sortiert. Eine Datei mit Bindestrich im Zusatz (z. B.
   `mini-denkhilfen-b.js`) lädt DAVOR und würde von der Grunddatei überschrieben.

   WARUM Object.assign UND NICHT EINE ZWEITE ZUWEISUNG. Die Grunddatei setzt
   `DATEN.miniDenkhilfen = {…}` — nach dem Nachzug der 35 Einträge aus task-6 sind es
   60 Einträge (25 waren es vorher; die Zahl steht hier, damit der nächste Leser sie
   nicht aus dem Kopf überschätzt). Ein zweites `=` hier würde sie ersetzen.
   Der Aufruf unten hängt deshalb IDEMPOTENT an: fehlt das Paket, entsteht es; ist es da,
   bleibt es und wird nur ergänzt. Reihenfolge-unabhängig, deterministisch, kein DOM.

   DREI REGELN (Kopfkommentar der Grunddatei, bindend):
     · DENKHILFE zeigt die Richtung, nie das Ergebnis – kein Lösungstext, keine wörtliche
       Option. Der Wächter `miniOhneLoesung` (src/spiel/mini.js:182-193) prüft das bei jedem
       Aufruf und fällt sonst still auf den Fertigkeitssatz zurück.
     · AUSSCHNITT (optional) ist die zweite Sprosse für azubi und muss ein WÖRTLICHER
       Ausschnitt aus `frage` oder `schnappschuss.inhalt` sein.
     · STICHWORT ist der Kernbegriff der Frage (Lernanker) und kommt auf der Wiki-Seite der
       Fertigkeit NICHT vor – gemessen am sichtbaren Wiki-Text (titel, kurz, abschnitte,
       merksatz, pruefungstipp, quelle) am 09.10.2026. Geprüft in tests/denkhilfen-teil2.test.js.

   UMFANG. 31 Minis aus 14 Fertigkeiten (task-7, zweite Hälfte der 66 Lücken).
   `mini-link-2` bleibt bewusst OHNE Eintrag: tests/spiel-mini-denktexte.test.js:103-107
   verlangt mindestens ein Mini, das auf den Fertigkeitssatz zurückfällt.
   LF-Zeilenenden. */
(() => {
  /* Kurzschreiber wie in der Grunddatei: D(denkhilfe, stichwort, ausschnitt?) */
  const D = (denkhilfe, stichwort, ausschnitt) => ausschnitt
    ? {denkhilfe, ausschnitt, stichwort}
    : {denkhilfe, stichwort};

  DATEN.miniDenkhilfen = Object.assign(DATEN.miniDenkhilfen || {}, {
    /* ---- lab.ttl: TTL, Traceroute, Schleife ---- */
    "mini-ttl-1": D("Jeder Router auf dem Weg zieht eins ab, bevor er weiterschickt. Was bleibt am Ende übrig – und was tut ein Router damit, wenn sich nichts mehr abziehen lässt?",
      "Hüpfzähler", "wenn die TTL eines Pakets 0 erreicht"),
    "mini-ttl-2": D("Jeder Router auf dem Weg soll sich einmal melden, ohne dass das Paket je ankommt. Wie bringst du es dazu, unterwegs genau beim ersten, dann beim zweiten anzuklopfen?",
      "steigende TTL", "Wie findet traceroute die Router auf dem Weg?"),
    "mini-ttl-3": D("Lies die Adressen von oben nach unten: Wer antwortet – und wer taucht mehrfach auf? Vergleiche die Zeilen miteinander, nicht die Zeiten.",
      "Schleifenbildung", "1  10.1.255.1\n2  10.1.255.2\n3  10.1.255.1"),

    /* ---- lab.nat: private Adressen, PAT, inside/outside ---- */
    "mini-nat-1": D("Drei Adressbereiche sind für den Hausgebrauch reserviert und dürfen sich überall wiederholen. Was folgt daraus für Router draußen im weltweiten Netz – und wer muss deshalb die Absenderadresse austauschen?",
      "nicht routbar", "Warum braucht ein LAN mit 192.168.x.x NAT für das Internet?"),
    "mini-nat-2": D("Eine einzige Außenadresse soll für einen ganzen Haufen Rechner reichen. Woran kann der Router dann noch auseinanderhalten, welche Antwort zu welchem Rechner gehört?",
      "Portnummern", "Was macht PAT (NAT-Overload)?"),
    "mini-nat-3": D("Auf welcher Seite sitzen die privaten Adressen, auf welcher die öffentliche? Ordne die beiden Befehle nach dieser Frage – nicht nach der Reihenfolge im Skript.",
      "Schnittstellenrolle", "Wohin gehören die NAT-Rollen?"),

    /* ---- lab.dmz: Zone zwischen außen und innen ---- */
    "mini-dmz-1": D("Der Name stammt aus dem Militär und meint einen Streifen zwischen zwei Bereichen. Welche Server stellt man dorthin – und wovor soll der Streifen das übrige Hausnetz schützen?",
      "Pufferzone"),
    "mini-dmz-2": D("Die Zone ist absichtlich angreifbar. Wird ein Server dort übernommen, soll er nicht weiterkommen: Wie sieht die Regel in diese Richtung deshalb aus – und was ist die begründete Ausnahme?",
      "Übernahme", "Was darf aus der DMZ ins interne LAN?"),
    "mini-dmz-3": D("Drei Zonen, drei Aufgaben: Was muss von überall erreichbar sein, was braucht nur die Belegschaft, und was ist der unsichere Rest? Sortiere die Geräte nach dieser Frage.",
      "Zonenmodell", "Was gehört in welche Zone?"),

    /* ---- lab.portsec: MAC-Bindung am Port ---- */
    "mini-psec-1": D("Der Switch soll nicht jedem Gerät glauben, das an einer Dose hängt. Woran erkennt er überhaupt, welches Gerät dort sitzt – und was tut er, wenn ein fremdes auftaucht?",
      "Zugangskontrolle"),
    "mini-psec-2": D("Ein Verstoß bleibt nicht folgenlos: Der Switch zieht die Notbremse. Arbeitet der Port danach noch normal – und wer muss ihn wieder freigeben?",
      "Fehlerzustand", "In welchem Zustand ist der Port?"),
    "mini-psec-3": D("Ein Port in der Notbremse lässt sich nicht mit einem einzigen Schritt lösen: Er steht im Fehlerzustand und muss erst wieder in den Normalbetrieb. Welche zwei Befehle sind das – und was muss vorher geklärt sein?",
      "Reaktivierung"),

    /* ---- lab.netz: Maske anwenden ---- */
    "mini-netz-1": D("Bei /24 zählt das dritte Oktett noch zur Netzadresse. Vergleiche die beiden Adressen in genau diesem Oktett – und frage dich, welche Rolle ein Gateway für diese Frage überhaupt spielt.",
      "Oktett"),
    "mini-netz-2": D("Die Maske sagt, wie viele der führenden Bits zum Netz gehören. Zähl bei /16 nach, welche Oktette dann noch zum Geräteteil zählen – und vergleiche nur die.",
      "Hostteil"),

    /* ---- lab.arp: auflösen, Cache ---- */
    "mini-arp-1": D("In dieser Liste stecken zwei Paare: eine Auflösung und eine Übertragung. Welches Paar muss vor dem anderen laufen – und in welchem Paar fragt wer zuerst?",
      "Auflösung", "Erster Ping im eigenen Netz"),
    "mini-arp-3": D("Die Tabelle hat zwei Spalten: links die logische, rechts die physische Adresse. Welches Gerät füllt sie – und gilt sie nur für das eigene Netz oder für die ganze Welt?",
      "Zuordnungstabelle", "10.0.0.1   00-1a-2b-3c-4d-5e  dynamisch"),

    /* ---- lab.switch: Lernen und Weiterleiten ---- */
    "mini-sw-2": D("Der Eintrag trägt das Wort DYNAMIC – eingetippt hat ihn also niemand. Wann und woraus trägt der Switch ihn selbst ein?",
      "Lernvorgang", "1 0060.2f3a.1b01 DYNAMIC Fa0/3"),
    "mini-sw-3": D("Der Switch entscheidet für jeden Frame neu und weiß nur, was er bis dahin gesehen hat. Frag bei jedem Schritt: Was weiß er in diesem Moment schon – und was fehlt ihm noch?",
      "Verarbeitungsschritte", "Bring die Schritte in Reihenfolge"),

    /* ---- lab.dns: Namensauflösung ---- */
    "mini-dns-1": D("Per Adresse klappt es, per Name nicht. Die Verbindung nach draußen steht also – welche Übersetzung fehlt dann noch?",
      "Namensdienst", "ping 198.51.100.10 klappt, ping www.beispiel.de nicht"),
    "mini-cli-nslookup-1": D("Diese Abfrage hat genau eine Frage beantwortet: Sie hat einem Namen eine Adresse zugeordnet. Ist damit bewiesen, dass auf dem Ziel auch jemand auf Anfragen wartet?",
      "DNS-Antwort", "Name:    www.beispiel.de\nAddress: 198.51.100.10"),

    /* ---- lab.tcp: Aufbau und Charakter ---- */
    "mini-tcp-1": D("Drei Nachrichten, zwei Richtungen: Wer klopft zuerst an – und wer darf erst danach antworten? Ordne die drei danach, wer handelt und wer nur bestätigt.",
      "Verbindungsaufbau"),
    "mini-tcp-3": D("Beide Protokolle transportieren Daten, aber nur eines klopft vorher an und lässt sich jedes Stück bestätigen. Welches passt dann zu einer kurzen Abfrage, die mit einer einzigen Antwort erledigt ist?",
      "Zuverlässigkeit"),

    /* ---- lab.vlan: Trennung und Portzuordnung ---- */
    "mini-vlan-1": D("Ein Switch ist kein flacher Stern: Jede Gruppe bildet ihr eigenes Netz. Was fehlt den beiden Rechnern, um zueinander zu finden – auch wenn sie am selben Gerät hängen?",
      "VLAN-Trennung", "Fa0/1 in VLAN 10, Fa0/2 in VLAN 20"),
    "mini-vlan-2": D("Dieser Befehl gehört in den Schnittstellenmodus, nicht in den globalen. Zwei Angaben stehen darin: die Rolle des Ports und die Nummer des Netzes. Welcher Befehl bringt beide zusammen?",
      "Schnittstellenmodus", "den Port Fa0/5 in VLAN 30"),

    /* ---- lab.portfwd: von außen nach innen ---- */
    "mini-fwd-1": D("Von draußen kommt eine Anfrage an die öffentliche Adresse. Sie soll bei einem bestimmten Rechner im eigenen Netz landen – was muss der Router dafür wissen, und wozu ist das gut?",
      "Portfreigabe"),
    "mini-fwd-2": D("Die Übersetzung allein öffnet keine Tür: Der Router weiß nun, wohin das Paket soll. Ob es überhaupt durch darf, entscheidet aber eine andere Instanz – welche, und was muss dort stehen?",
      "Erlaubnisregel", "Was braucht die Firewall noch?"),

    /* ---- lab.fw: Grundsatz, Zustand, Reihenfolge ---- */
    "mini-fw-1": D("Eine Firewall führt eine Liste dessen, was hindurch darf. Was geschieht mit Verkehr, der auf dieser Liste nicht steht – und warum ist diese Richtung die sichere?",
      "Whitelist"),
    "mini-fw-2": D("Die Firewall führt Buch über laufende Verbindungen. Was heißt das für ein Paket, das als Antwort auf eine erlaubte Anfrage zurückkommt – muss es die Prüfung erneut durchlaufen?",
      "Zustandstabelle", "Musst du Antworten eigens erlauben?"),

    /* ---- lab.stp: Schleife und Baum ---- */
    "mini-stp-1": D("Zwei Wege zwischen denselben Geräten klingen nach Sicherheit. Was aber geschieht mit einem Rundruf, den beide Wege gleichzeitig führen – wird er weniger, oder wird es immer mehr?",
      "Endlosschleife", "Spanning Tree ist aus"),
    "mini-stp-2": D("Ein Netz mit Ersatzwegen braucht eine Instanz, die entscheidet, welcher Weg gerade ruhen muss. Wer wählt aus, welcher Anschluss still bleibt – und was geschieht, wenn ein aktiver Weg ausfällt?",
      "Baumstruktur"),

    /* ---- lab.storage: NAS oder SAN ---- */
    "mini-sto-1": D("Zwei Abkürzungen, zwei Ebenen: Das eine System gibt fertige Dateien heraus, das andere rohe Blöcke wie eine eingebaute Platte. Welches passt zu einer gemeinsamen Ablage, welches zu einer Datenbank?",
      "Zugriffsebene"),
  });
})();
