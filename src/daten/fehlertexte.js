"use strict";
/* ---------- Daten: Fehlertexte (Baustein E) ----------
   Die Tabelle hinter Spiel.fehlertext: je Meldung ein Titel, ein Klartext je Bildungsstand, das
   richtige Muster und ein Beispiel. Reine Daten – kein DOM, kein Spielzustand, kein Zufall.
   Die Tiefe (ausfuehrlich · knapp · nurcodes) wertet src/spiel/fehlertexte.js über
   Spiel.stufe.text(a, k, n) aus; hier steht nur, WAS je Stufe dasteht.

   Verbindlich: docs/entwicklung/Hilfestellung – Stufen und Schnittstellen.md § 2 und § 4.
   Aufbau eines Eintrags und die Bedeutung jedes Feldes: siehe src/spiel/fehlertexte.js.
   `beispiel` darf eine Funktion (lage) => string sein; die Lage liefert der Auswerter (u. a. `port`,
   den Port, den es auf diesem Gerätetyp wirklich gibt).

   Öffentliche Fläche: DATEN.fehlertexte (Array; Reihenfolge = Vorrang, erster Treffer gewinnt). */

DATEN.fehlertexte = [

    /* ============ IOS: Lage des Geräts und der Sitzung ============ */
    {
      id: "ios-geraet-aus", titel: "Das Gerät ist ausgeschaltet", art: ["ios", "fw"], modus: [],
      erkennung: /Gerät ist ausgeschaltet/,
      text: {
        ausfuehrlich: "Das Gerät hat keinen Strom, also nimmt es keine Befehle an. Schalte es im Inspektor ein (Schalter „An“) – erst dann antwortet die Konsole.",
        knapp: "Gerät ist aus – im Inspektor einschalten.",
        nurcodes: "(Das Gerät ist ausgeschaltet. Schalte es im Inspektor ein.)",
      },
      muster: "Inspektor → Gerät → An",
      beispiel: "Danach: show ip interface brief",
      quelle: "src/cli/parser.js:484", probe: "(Das Gerät ist ausgeschaltet. Schalte es im Inspektor ein.)",
    },
    {
      id: "ios-geraet-weg", titel: "Das Gerät gibt es nicht mehr", art: ["ios", "fw"], modus: [],
      erkennung: /Dieses Gerät gibt es nicht mehr/,
      text: {
        ausfuehrlich: "Das Gerät wurde aus dem Netz gelöscht, während die Konsole noch offen war. Schließe den Terminal-Reiter und öffne das Gerät neu aus dem Netzplan.",
        knapp: "Gerät wurde gelöscht – Terminal neu öffnen.",
        nurcodes: "% Dieses Gerät gibt es nicht mehr.",
      },
      muster: "Terminal schließen und das Gerät neu anklicken",
      beispiel: "Netzplan → Gerät doppelklicken",
      quelle: "src/cli/parser.js:483", probe: "% Dieses Gerät gibt es nicht mehr.",
    },
    {
      id: "ios-sim-fehlt", titel: "Die Simulation ist nicht geladen", art: ["ios", "fw", "host-windows", "host-linux"], modus: [],
      erkennung: /Die Simulation ist noch nicht geladen/,
      text: {
        ausfuehrlich: "Dieser Befehl braucht die Paket-Simulation (ping, DNS, DHCP, TCP). Sie ist in diesem Programmlauf nicht geladen – lade die Seite neu; die Konfiguration selbst funktioniert weiter.",
        knapp: "Simulation fehlt – Seite neu laden, dann noch einmal.",
        nurcodes: "% Die Simulation ist noch nicht geladen.",
      },
      muster: "Seite neu laden, dann den Befehl wiederholen",
      beispiel: "ping 192.168.1.1",
      quelle: "src/cli/ios-ausgaben.js:756 · src/cli/host-windows.js:16", probe: "% Die Simulation ist noch nicht geladen.",
    },
    {
      id: "ios-interner-fehler", titel: "Interner Fehler der Konsole", art: [], modus: [],
      erkennung: /Interner Fehler der Konsole|Interner Fehler des Terminals/,
      text: {
        ausfuehrlich: "Das ist kein Bedienfehler, sondern ein Fehler im Programm: Der Befehl hat eine Ausnahme ausgelöst. Die Konfiguration ist unverändert. Melde den Befehl mit dem Text in Klammern – und arbeite mit „show running-config“ weiter.",
        knapp: "Programmfehler, nicht dein Fehler – Konfiguration ist unverändert.",
        nurcodes: "% Interner Fehler der Konsole: <Meldung>",
      },
      muster: "Anderen Weg nehmen (z. B. Inspektor) und den Fehler melden",
      beispiel: "show running-config",
      quelle: "src/cli/parser.js:340 · src/cli/host-terminal.js:148", probe: "% Interner Fehler der Konsole: x is not a function",
    },

    /* ============ IOS: Modus und Zugang ============ */
    {
      id: "ios-passwort-falsch", titel: "Passwort dreimal falsch", art: ["ios", "fw"], modus: [],
      erkennung: /^% Bad (passwords|secrets)$/m,
      text: {
        ausfuehrlich: "Nach drei Fehlversuchen bricht IOS die Anmeldung ab. Warte auf „Press RETURN to get started.“ (Enter), dann beginnt die Anmeldung von vorn. Groß- und Kleinschreibung zählen.",
        knapp: "Drei Fehlversuche – mit Enter neu anmelden, auf Groß-/Kleinschreibung achten.",
        nurcodes: "% Bad passwords / % Bad secrets",
      },
      muster: "Enter → Passwort erneut eingeben",
      beispiel: "enable → Password: <enable secret>",
      quelle: "src/cli/parser.js:306 · src/cli/ios-befehle.js:46", probe: "% Bad passwords",
    },
    {
      id: "ios-setup-antwort", titel: "Antwort ja oder nein erwartet", art: ["ios"], modus: [],
      erkennung: /Please answer 'yes' or 'no'/,
      text: {
        ausfuehrlich: "Der Setup-Dialog fragt nach einer Entscheidung und nimmt nur „yes“ oder „no“ an. Antworte mit „no“, dann geht es normal weiter – der Dialog ist hier nicht nachgebaut.",
        knapp: "Mit „no“ antworten, dann weiter.",
        nurcodes: "% Please answer 'yes' or 'no'.",
      },
      muster: "no",
      beispiel: "no",
      quelle: "src/cli/ios-befehle.js:134", probe: "% Please answer 'yes' or 'no'.",
    },
    {
      id: "ios-nur-terminal", titel: "Nur „terminal“ ist nachgebaut", art: ["ios"], modus: [],
      erkennung: /Nur „terminal“ ist in dieser Konsole nachgebaut/,
      text: {
        ausfuehrlich: "„configure“ fragt, woher die Konfiguration kommen soll. Im Labor gibt es nur „terminal“, also die Eingabe von Hand. Am schnellsten: „conf t“ mit Enter.",
        knapp: "„terminal“ wählen – oder gleich „conf t“ tippen.",
        nurcodes: "% Nur „terminal“ ist in dieser Konsole nachgebaut.",
      },
      muster: "configure terminal   (kurz: conf t)",
      beispiel: "conf t",
      quelle: "src/cli/ios-befehle.js:59", probe: "% Nur „terminal“ ist in dieser Konsole nachgebaut.",
    },
    {
      id: "ios-user-erst-enable", titel: "Dafür fehlt der privilegierte Modus", art: ["ios", "fw"], modus: ["user", "fwUser"],
      eingabe: /^(sh|show|ping|traceroute|copy|write|reload|clear|erase|delete|conf|configure|en|enable)/i,
      erkennung: /Invalid input detected/,
      text: {
        ausfuehrlich: "Im Benutzermodus (Prompt endet auf „>“) sind nur wenige Befehle erlaubt. Tippe „enable“, dann endet der Prompt auf „#“ und der Befehl funktioniert.",
        knapp: "Erst „enable“ – der Prompt muss auf „#“ enden.",
        nurcodes: "% Invalid input detected at '^' marker.",
      },
      muster: "enable   →   <Name>#   →   <Befehl>",
      beispiel: "enable",
      quelle: "src/cli/parser.js:570", probeEingabe: "conf t", probe: "                    ^\n% Invalid input detected at '^' marker.",
    },
    {
      id: "ios-config-erst-do", titel: "Anzeigebefehl im Konfigurationsmodus", art: ["ios", "fw"],
      modus: ["config", "if", "subif", "range", "vlan", "line", "std", "ext", "dhcp", "dhcpHost"],
      eingabe: /^(sh|show|ping|traceroute|copy|write|reload|clear|erase|delete)/i,
      erkennung: /Invalid input detected/,
      text: {
        ausfuehrlich: "„show“ und die anderen Exec-Befehle gehören nicht in den Konfigurationsmodus. Stelle „do“ voran: „do show ip interface brief“ – du bleibst dabei im Konfigurationsmodus.",
        knapp: "„do“ voranstellen: „do show ip interface brief“.",
        nurcodes: "% Invalid input detected at '^' marker.",
      },
      muster: "do show <Befehl>",
      beispiel: "do show ip interface brief",
      quelle: "src/cli/parser.js:572", probeEingabe: "show ip interface brief", probe: "R1(config)#     ^\n% Invalid input detected at '^' marker.",
    },

    /* ============ IOS: Zerlegen der Zeile ============ */
    {
      id: "ios-invalid", titel: "Falsches Wort an der markierten Stelle", art: ["ios", "fw"], modus: [],
      erkennung: /Invalid input detected at '\^' marker/,
      text: {
        ausfuehrlich: "Das Gerät kennt das Wort über dem ^ nicht. Tippe an dieser Stelle ein Leerzeichen und dann das Fragezeichen „?“, dann listet es auf, was hier erlaubt ist. Häufigste Ursache: ein Tippfehler im Befehlswort oder ein Befehl aus dem falschen Modus.",
        knapp: "Über dem ^ steht etwas Unbekanntes – das Fragezeichen „?“ an dieser Stelle zeigt die erlaubten Wörter.",
        nurcodes: "% Invalid input detected at '^' marker.",
      },
      muster: "<angefangener Befehl> ?   (Leerzeichen, dann Fragezeichen)",
      /* Beispiel mit einem Port, den es auf DIESEM Gerät wirklich gibt (Switch: Fa0/1, Router: Gi0/0). */
      beispiel: lage => "interface " + (lage.port || "GigabitEthernet0/0") + " ?",
      quelle: "src/cli/parser.js:370 · src/cli/ios-befehle.js:284", probe: "        ^\n% Invalid input detected at '^' marker.",
    },
    {
      /* Erreichbar – aber nur mit dem Fragezeichen OHNE Leerzeichen davor: „quatsch?“.
         Mit Leerzeichen („quatsch ?“) endet die Zeile vor dem „?“, und der Parser bricht schon in
         parser.js:400–402 mit „% Invalid input detected at '^' marker.“ ab; der Hilfe-Zweig (Zeile 423/428)
         wird dann nie erreicht. Gemessen am 09.10.2026 in den Modi user, priv und config (siehe Test
         „unbekannter Modus“). Der Eintrag bleibt also – er erklärt eine echte, erreichbare Ausgabe. */
      id: "ios-unrecognized", titel: "Unbekanntes Wort in der Hilfe", art: ["ios", "fw"], modus: [],
      erkennung: /^% Unrecognized command$/m,
      text: {
        ausfuehrlich: "Der Teil vor dem „?“ passt auf keinen Befehl dieses Modus. Prüfe das Befehlswort (oder kürze es richtig ab) und hänge wieder „?“ an.",
        knapp: "Das Wort vor dem „?“ gibt es hier nicht – Schreibweise prüfen.",
        nurcodes: "% Unrecognized command",
      },
      muster: "<Befehlswort> ?",
      beispiel: "show ip ?",
      quelle: "src/cli/parser.js:423", probe: "% Unrecognized command",
    },
    {
      id: "ios-unknown-exec", titel: "Unbekanntes Kommando im Exec-Modus", art: ["ios", "fw"], modus: ["user", "priv", "fwUser", "fwPriv"],
      erkennung: /Unknown command or computer name/,
      text: {
        ausfuehrlich: "IOS hält das erste Wort für einen Rechnernamen und fragt dafür den DNS – deshalb die Zeile „Translating …“. Das kostet nur Wartezeit. Richtig ist ein Befehl von hier: „?\" zeigt die Liste. Mit „no ip domain-lookup“ (Konfigurationsmodus) entfällt die DNS-Frage ganz.",
        knapp: "Kein Befehl: IOS sucht darin einen Rechnernamen. „?“ zeigt die Befehle.",
        nurcodes: "% Unknown command or computer name, or unable to find computer address",
      },
      muster: "?   →  Liste der Befehle dieses Modus",
      beispiel: "show ip interface brief",
      quelle: "src/cli/parser.js:552", probe: 'Translating "hallo"...domain server (255.255.255.255)\n% Unknown command or computer name, or unable to find computer address',
    },
    {
      id: "ios-unbekannter-host", titel: "Unbekannter Host oder unbekannte Adresse", art: ["ios", "fw"], modus: [],
      erkennung: /Unrecognized host or address, or protocol not running/,
      text: {
        ausfuehrlich: "Das Ziel von ping oder traceroute lässt sich nicht auflösen: weder als IP-Adresse noch als Name. Prüfe die Schreibweise. Für Namen muss ein DNS-Server eingetragen sein und den Namen kennen („nslookup <Name>“).",
        knapp: "Ziel unbekannt – IP-Adresse oder Namen prüfen.",
        nurcodes: "% Unrecognized host or address, or protocol not running.",
      },
      muster: "ping <IP-Adresse>   oder   ping <Name mit DNS-Eintrag>",
      beispiel: "ping 192.168.1.1",
      quelle: "src/cli/ios-ausgaben.js:754", probe: 'Translating "gibtsnicht"...domain server (255.255.255.255)\n% Unrecognized host or address, or protocol not running.',
    },
    {
      id: "ios-ambiguous", titel: "Abkürzung passt auf mehrere Befehle", art: ["ios", "fw"], modus: [],
      erkennung: /^% Ambiguous command:/m,
      text: {
        ausfuehrlich: "Die Abkürzung ist nicht eindeutig: Mehrere Befehle beginnen so. Tippe ein paar Buchstaben mehr – oder hänge „?“ an, dann siehst du die Kandidaten. „i“ allein passt z. B. auf „interface“ und „ip“.",
        knapp: "Abkürzung nicht eindeutig – mehr Buchstaben tippen oder „?“ anhängen.",
        nurcodes: '% Ambiguous command:  "<Eingabe>"',
      },
      muster: "<eindeutige Kurzform>   (z. B. int für interface)",
      beispiel: "int g0/0",
      quelle: "src/cli/parser.js:371", probe: '% Ambiguous command:  "i"',
    },
    {
      id: "ios-ip-ohne-maske", titel: "Bei „ip address“ fehlt die Maske", art: ["ios"], modus: ["if", "subif", "range", "config"],
      eingabe: /^\s*(no\s+)?ip\s+address\s+\S+\s*$/i,
      erkennung: /^% Incomplete command\.$/m,
      text: {
        ausfuehrlich: "Zu einer IP-Adresse gehört immer die Subnetzmaske – ohne sie ist die Adresse nicht vollständig. Schreibe beides: „ip address <IP> <Maske>“. Die Maske darf auch als Präfix gedacht werden: /24 = 255.255.255.0.",
        knapp: "Die Maske fehlt: „ip address <IP> <Maske>“.",
        nurcodes: "% Incomplete command.",
      },
      muster: "ip address <IP> <Maske>",
      beispiel: "ip address 192.168.1.1 255.255.255.0",
      quelle: "src/cli/parser.js:372", probeEingabe: "ip address 10.0.0.1", probe: "% Incomplete command.",
    },
    {
      id: "ios-incomplete", titel: "Die Zeile ist noch nicht vollständig", art: ["ios", "fw"], modus: [],
      erkennung: /^% Incomplete command\.$/m,
      text: {
        ausfuehrlich: "Der Befehl ist angefangen, aber es fehlt noch ein Teil (Adresse, Maske, Name …). Tippe ein Leerzeichen und dann „?“, dann zeigt das Gerät, was an dieser Stelle erwartet wird.",
        knapp: "Es fehlt noch etwas – Leerzeichen und „?“ zeigt, was kommt.",
        nurcodes: "% Incomplete command.",
      },
      muster: "<Befehl> ?   →  zeigt die nächsten Wörter",
      beispiel: "ip address ?",
      quelle: "src/cli/parser.js:372", probe: "% Incomplete command.",
    },

    /* ============ IOS: Adressen, Masken, VLANs ============ */
    {
      id: "ios-bad-mask", titel: "Die Maske ist keine gültige Netzmaske", art: ["ios"], modus: ["if", "subif"],
      erkennung: /Bad mask/,
      text: {
        ausfuehrlich: "Eine Subnetzmaske besteht aus Einsen und danach aus Nullen – 255.255.255.0 ist gültig, 255.0.255.0 nicht. Prüfe außerdem, ob die Adresse selbst Host ist: Netz- und Broadcastadresse sind nicht vergebbar (/31 hat keine zwei Hosts).",
        knapp: "Maske prüfen (Einsen, dann Nullen) und eine Host-Adresse nehmen.",
        nurcodes: "Bad mask <Hex> for address <IP>",
      },
      muster: "ip address <Host-Adresse> <gültige Maske>",
      beispiel: "ip address 192.168.1.1 255.255.255.0",
      quelle: "src/cli/ios-befehle.js:612,617", probe: "Bad mask 0xFF00FF00 for address 192.168.1.1",
    },
    {
      id: "ios-netz-ueberlappt", titel: "Zwei Schnittstellen im selben Netz", art: ["ios"], modus: ["if", "subif"],
      erkennung: /overlaps with/,
      text: {
        ausfuehrlich: "Jede Schnittstelle eines Routers braucht ihr eigenes Netz – sonst weiß er nicht, wohin er ein Paket schicken soll. Wähle für die zweite Schnittstelle ein anderes Netz oder eine passendere Maske.",
        knapp: "Netz schon vergeben – andere Schnittstelle braucht ein eigenes Netz.",
        nurcodes: "% <Netz> overlaps with <Schnittstelle>",
      },
      muster: "ip address <IP aus einem freien Netz> <Maske>",
      beispiel: "ip address 192.168.2.1 255.255.255.0",
      quelle: "src/cli/ios-befehle.js:623", probe: "% 192.168.1.0 overlaps with GigabitEthernet0/1",
    },
    {
      id: "ios-subif-ohne-vlan", titel: "Subinterface ohne VLAN", art: ["ios"], modus: ["subif"],
      erkennung: /LAN subinterface is only allowed/,
      text: {
        ausfuehrlich: "Ein Subinterface ist der Aufgang für genau ein VLAN – ohne VLAN-Zuordnung weiß es nicht, welche Pakete ihm gehören. Setze zuerst „encapsulation dot1Q <VLAN>“ und dann die Adresse.",
        knapp: "Erst „encapsulation dot1Q <VLAN>“, dann die Adresse.",
        nurcodes: "% Configuring IP routing on a LAN subinterface is only allowed if that …",
      },
      muster: "encapsulation dot1Q <VLAN>",
      beispiel: "encapsulation dot1Q 10",
      quelle: "src/cli/ios-befehle.js:615", probe: "% Configuring IP routing on a LAN subinterface is only allowed if that\nsubinterface is already configured as part of an IEEE 802.10, IEEE 802.1Q,\nor ISL vLAN.",
    },
    {
      id: "ios-hostname-illegal", titel: "Hostname enthält unerlaubte Zeichen", art: ["ios"], modus: ["config"],
      erkennung: /Hostname contains one or more illegal characters/,
      text: {
        ausfuehrlich: "Ein Hostname beginnt mit einem Buchstaben und enthält nur Buchstaben, Ziffern und Bindestriche – keine Leerzeichen, keine Punkte, keine Sonderzeichen.",
        knapp: "Nur Buchstaben, Ziffern, Bindestrich; vorne ein Buchstabe.",
        nurcodes: "% Hostname contains one or more illegal characters.",
      },
      muster: "hostname <Name>",
      beispiel: "hostname R-EG",
      quelle: "src/cli/ios-befehle.js:237", probe: "% Hostname contains one or more illegal characters.",
    },
    {
      id: "ios-domain-ungueltig", titel: "Domänenname ist ungültig", art: ["ios"], modus: ["config"],
      erkennung: /^% Invalid domain name$/m,
      text: {
        ausfuehrlich: "Der Domänenname besteht aus Buchstaben, Ziffern, Punkten und Bindestrichen – z. B. „labor.local“. Ohne ihn lässt sich kein SSH-Schlüssel erzeugen, denn der Schlüssel heißt nach Name und Domäne.",
        knapp: "Form: labor.local",
        nurcodes: "% Invalid domain name",
      },
      muster: "ip domain-name <name.tld>",
      beispiel: "ip domain-name labor.local",
      quelle: "src/cli/ios-befehle.js:248", probe: "% Invalid domain name",
    },
    {
      id: "ios-ssh-name-fehlt", titel: "SSH braucht Hostname und Domäne", art: ["ios"], modus: ["config"],
      erkennung: /Please define a (hostname|domain-name)/,
      text: {
        ausfuehrlich: "Der RSA-Schlüssel für SSH trägt den Namen des Geräts mit Domäne. Deshalb erst „hostname <Name>“ (nicht der Werksname) und „ip domain-name <name.tld>“ setzen – danach „crypto key generate rsa“.",
        knapp: "Erst hostname und ip domain-name setzen, dann den Schlüssel erzeugen.",
        nurcodes: "% Please define a hostname other than <Werksname>. / % Please define a domain-name first.",
      },
      muster: "hostname <Name>  ·  ip domain-name <name.tld>  ·  crypto key generate rsa",
      beispiel: "ip domain-name labor.local",
      quelle: "src/cli/ios-befehle.js:261,262", probe: "% Please define a domain-name first.",
    },
    {
      id: "ios-modulus", titel: "Schlüssellänge außerhalb 360 bis 4096", art: ["ios"], modus: ["config"],
      erkennung: /Invalid modulus size/,
      text: {
        ausfuehrlich: "Der RSA-Schlüssel darf 360 bis 4096 Bit lang sein. Üblich sind 1024 oder 2048; für SSH Version 2 müssen es mindestens 768 Bit sein.",
        knapp: "1024 oder 2048 Bit nehmen.",
        nurcodes: "% Invalid modulus size (360–4096).",
      },
      muster: "crypto key generate rsa modulus 2048",
      beispiel: "crypto key generate rsa modulus 2048",
      quelle: "src/cli/ios-befehle.js:267", probe: "% Invalid modulus size (360–4096).",
    },
    {
      id: "ios-vlan-bereich", titel: "Dieses VLAN lässt sich hier nicht anlegen", art: ["ios"], modus: ["config", "vlan", "if"],
      erkennung: /Extended VLAN|does not exist and can not be created/,
      text: {
        ausfuehrlich: "VLANs ab 1006 sind „erweiterte“ VLANs und nur im VTP-Modus „transparent“ erlaubt. Für das Labor reichen 2 bis 1001 – nimm eine Nummer aus diesem Bereich.",
        knapp: "VLAN 2–1001 nehmen; 1006+ gehen nur im VTP-Modus transparent.",
        nurcodes: "% Access VLAN <Nr> does not exist and can not be created in the current VTP mode.",
      },
      muster: "vlan <2–1001>",
      beispiel: "vlan 10",
      quelle: "src/cli/ios-befehle.js:306,650", probe: "% Access VLAN 1006 does not exist and can not be created in the current VTP mode.",
    },
    {
      id: "ios-vlan-standard", titel: "Ein Standard-VLAN lässt sich nicht löschen", art: ["ios"], modus: ["config"],
      erkennung: /Default VLAN \d+ may not be deleted/,
      text: {
        ausfuehrlich: "VLAN 1 sowie 1002 bis 1005 sind fest eingebaut und können nicht gelöscht werden. Lege stattdessen ein eigenes VLAN an und ordne die Ports dorthin um.",
        knapp: "VLAN 1 und 1002–1005 sind fest – eigenes VLAN anlegen.",
        nurcodes: "%Default VLAN <Nr> may not be deleted.",
      },
      muster: "vlan <eigene Nummer>  ·  switchport access vlan <Nr>",
      beispiel: "vlan 20",
      quelle: "src/cli/ios-befehle.js:301", probe: "%Default VLAN 1 may not be deleted.",
    },
    {
      id: "ios-acl-name", titel: "Access-Liste mit diesem Namen gibt es schon", art: ["ios"], modus: ["config"],
      erkennung: /IP access list with this name already exists/,
      text: {
        ausfuehrlich: "Der Name ist schon an eine Liste des anderen Typs vergeben: einmal „standard“, einmal „erweitert“ geht nicht. Nimm einen anderen Namen – oder arbeite mit der bestehenden Liste weiter.",
        knapp: "Name doppelt belegt – anderen Namen wählen.",
        nurcodes: "% A named <Typ> IP access list with this name already exists",
      },
      muster: "ip access-list <standard|extended> <neuer Name>",
      beispiel: "ip access-list extended GAST-NEU",
      quelle: "src/cli/ios-befehle.js:353", probe: "% A named standard IP access list with this name already exists",
    },
    {
      id: "ios-route-maske", titel: "Netz und Maske passen nicht zusammen", art: ["ios"], modus: ["config"],
      erkennung: /Inconsistent address and mask/,
      text: {
        ausfuehrlich: "Bei „ip route“ muss das Ziel eine Netzadresse sein: Alle Host-Bits sind 0. Aus 192.168.2.5/24 wird also 192.168.2.0 255.255.255.0.",
        knapp: "Ziel als Netzadresse schreiben (Host-Bits 0).",
        nurcodes: "%Inconsistent address and mask",
      },
      muster: "ip route <Netzadresse> <Maske> <Next-Hop>",
      beispiel: "ip route 192.168.2.0 255.255.255.0 10.0.0.2",
      quelle: "src/cli/ios-befehle.js:317", probe: "%Inconsistent address and mask",
    },
    {
      id: "ios-route-loeschen", titel: "Keine passende Route zum Löschen", art: ["ios"], modus: ["config"],
      erkennung: /No matching route to delete|Invalid next hop address/,
      text: {
        ausfuehrlich: "Zum Löschen muss die Route genau so dastehen, wie sie angelegt wurde – Netz, Maske und Next-Hop. „do show ip route“ zeigt den echten Stand. Und: Next-Hop ist der nächste Router, nie die eigene Adresse.",
        knapp: "Route zum Löschen genau so schreiben wie angelegt; „do show ip route“ hilft.",
        nurcodes: "%No matching route to delete / %Invalid next hop address (it's this router)",
      },
      muster: "no ip route <Netzadresse> <Maske> <Next-Hop>",
      beispiel: "no ip route 192.168.2.0 255.255.255.0 10.0.0.2",
      quelle: "src/cli/ios-befehle.js:321,324", probe: "%No matching route to delete",
    },

    /* ============ IOS: DHCP ============ */
    {
      id: "ios-lease-dauer", titel: "Leasedauer ist ungültig", art: ["ios"], modus: ["dhcp"],
      erkennung: /Invalid lease duration/,
      text: {
        ausfuehrlich: "Die Leasedauer wird in Tagen, Stunden und Minuten angegeben: Tage 0–365, Stunden 0–23, Minuten 0–59. „lease 0 8 0“ heißt zum Beispiel acht Stunden.",
        knapp: "Tage 0–365, Stunden 0–23, Minuten 0–59.",
        nurcodes: "% Invalid lease duration",
      },
      muster: "lease <Tage> <Stunden> <Minuten>",
      beispiel: "lease 0 8 0",
      quelle: "src/cli/ios-befehle.js:870", probe: "% Invalid lease duration",
    },
    {
      id: "ios-dhcp-maske", titel: "Maske im DHCP-Pool ist ungültig", art: ["ios"], modus: ["dhcp"],
      erkennung: /^% Invalid mask$/m,
      text: {
        ausfuehrlich: "Der Pool braucht eine gültige Subnetzmaske – als Maske (255.255.255.0) oder als Präfix (/24). Sie muss zum angegebenen Netz passen.",
        knapp: "Maske wie 255.255.255.0 oder /24 angeben.",
        nurcodes: "% Invalid mask",
      },
      muster: "network <Netzadresse> <Maske|/Präfix>",
      beispiel: "network 192.168.1.0 255.255.255.0",
      quelle: "src/cli/ios-befehle.js:885", probe: "% Invalid mask",
    },
    {
      id: "ios-pool-fehlt", titel: "Diesen DHCP-Pool gibt es nicht", art: ["ios"], modus: ["config", "dhcp"],
      erkennung: /Pool .* does not exist|Diesen Pool gibt es nicht mehr/,
      text: {
        ausfuehrlich: "Der Pool-Name stimmt nicht (Groß- und Kleinschreibung zählen) oder der Pool wurde gelöscht. Lege ihn neu an: „ip dhcp pool <Name>“, danach „network <Netz> <Maske>“ und „default-router <Gateway>“.",
        knapp: "Pool-Namen prüfen oder mit „ip dhcp pool <Name>“ neu anlegen.",
        nurcodes: "%Pool <Name> does not exist.",
      },
      muster: "ip dhcp pool <Name>   →   network <Netz> <Maske>   →   default-router <Gateway>",
      beispiel: "ip dhcp pool LAN",
      quelle: "src/cli/ios-befehle.js:342,866", probe: "%Pool GAST does not exist.",
    },
    {
      id: "ios-reservierung", titel: "Reservierung: Name oder MAC-Adresse passt nicht", art: ["ios"], modus: ["dhcp", "dhcpHost"],
      erkennung: /Erst „host NAME“ wählen|Die Reservierung .* gibt es in diesem Pool nicht|Ungültige Hardware-Adresse|Name der Reservierung darf höchstens/,
      text: {
        ausfuehrlich: "Eine Reservierung hat zwei Schritte: erst „host <Name>“ wählen, dann „hardware-address <MAC>“ und „ip address <IP>“ setzen. Die MAC-Adresse schreibst du wie im IOS: 0200.aabb.cc01 (12 Hex-Ziffern, Punkte oder Doppelpunkte).",
        knapp: "Erst „host <Name>“, dann MAC (0200.aabb.cc01) und IP setzen.",
        nurcodes: "% Erst „host NAME“ wählen. / % Ungültige Hardware-Adresse: <Eingabe>",
      },
      muster: "host <Name>  ·  hardware-address 0200.aabb.cc01  ·  ip address <IP>",
      beispiel: "hardware-address 0200.aabb.cc01",
      quelle: "src/cli/ios-befehle.js:894–915", probe: "% Erst „host NAME“ wählen.",
    },
    {
      id: "ios-dhcp-dienst-aus", titel: "Auf diesem Gerät läuft kein DHCP-Server", art: ["ios"], modus: [],
      erkennung: /läuft kein DHCP-Server/,
      text: {
        ausfuehrlich: "Der DHCP-Dienst dieses Geräts ist ausgeschaltet – deshalb kann es keine Adressen vergeben. Schalte ihn im Inspektor ein (Reiter „Dienste“) oder lege auf einem Router einen Pool an („ip dhcp pool <Name>“).",
        knapp: "DHCP-Dienst im Inspektor einschalten oder Pool auf dem Router anlegen.",
        nurcodes: "% Auf <Gerät> läuft kein DHCP-Server (Dienst ist aus).",
      },
      muster: "ip dhcp pool <Name>   ·   oder: Inspektor → Dienste → DHCP an",
      beispiel: "ip dhcp pool LAN",
      quelle: "src/cli/ios-ausgaben.js:271,382,429", probe: "% Auf R1 läuft kein DHCP-Server (Dienst ist aus).",
    },
    {
      id: "ios-kein-dhcp-pool", titel: "Kein DHCP-Pool eingerichtet", art: ["ios"], modus: [],
      erkennung: /Kein DHCP-Pool eingerichtet/,
      text: {
        ausfuehrlich: "Der DHCP-Dienst läuft, hat aber noch keinen Adressbereich. Lege einen Pool an: „ip dhcp pool <Name>“, darin „network <Netz> <Maske>“ und „default-router <Gateway>“.",
        knapp: "Pool anlegen: „ip dhcp pool <Name>“ mit network und default-router.",
        nurcodes: "% Kein DHCP-Pool eingerichtet.",
      },
      muster: "ip dhcp pool <Name>   →   network <Netz> <Maske>   →   default-router <Gateway>",
      beispiel: "network 192.168.1.0 255.255.255.0",
      quelle: "src/cli/ios-ausgaben.js:431", probe: "% Kein DHCP-Pool eingerichtet. Anlegen mit „ip dhcp pool NAME“ (Router) bzw. im Inspektor unter „Dienste“.",
    },

    /* ============ IOS: Line, Port-Security, Firewall ============ */
    {
      id: "ios-line-ohne-passwort", titel: "„login“ ohne Passwort", art: ["ios"], modus: ["line"],
      erkennung: /Login disabled on line/,
      text: {
        ausfuehrlich: "„login“ schaltet die Passwortabfrage ein – ohne gesetztes Passwort bleibt die Leitung gesperrt. Setze zuerst „password <Passwort>“, dann „login“.",
        knapp: "Erst „password <Passwort>“, dann „login“.",
        nurcodes: "% Login disabled on line 0, until 'password' is set",
      },
      muster: "password <Passwort>   →   login",
      beispiel: "password konsole",
      quelle: "src/cli/ios-befehle.js:810", probe: "% Login disabled on line 0, until 'password' is set",
    },
    {
      id: "ios-portsec-max", titel: "Port-Security: zu viele MAC-Adressen", art: ["ios"], modus: ["if"],
      erkennung: /Total secure mac-addresses/,
      text: {
        ausfuehrlich: "Der Port darf nur so viele MAC-Adressen lernen, wie „maximum“ erlaubt. Erhöhe zuerst den Wert („switchport port-security maximum <Zahl>“) oder lösche eine eingetragene Adresse („no switchport port-security mac-address <MAC>“).",
        knapp: "Erst „maximum“ erhöhen oder eine MAC-Adresse löschen.",
        nurcodes: "Total secure mac-addresses on interface <Port> has reached maximum limit.",
      },
      muster: "switchport port-security maximum <Zahl>",
      beispiel: "switchport port-security maximum 3",
      quelle: "src/cli/ios-befehle.js:695,704", probe: "Total secure mac-addresses on interface FastEthernet0/1 has reached maximum limit.",
    },
    {
      id: "ios-portsec-trunk", titel: "Port-Security gehört nicht auf einen Trunk", art: ["ios"], modus: ["if"],
      erkennung: /is a trunk port/,
      text: {
        ausfuehrlich: "Auf einem Trunk-Port laufen viele VLANs – dort lässt sich nicht auf eine MAC-Adresse begrenzen. Stelle den Port zuerst auf Access: „switchport mode access“ (und „switchport access vlan <Nr>“).",
        knapp: "Erst „switchport mode access“, dann Port-Security.",
        nurcodes: "Command rejected: <Port> is a trunk port.",
      },
      muster: "switchport mode access",
      beispiel: "switchport mode access",
      quelle: "src/cli/ios-befehle.js:688", probe: "Command rejected: GigabitEthernet0/1 is a trunk port.",
    },
    {
      id: "ios-fw-neutral", titel: "Firewall nur über den Inspektor", art: ["fw"], modus: ["config", "fwUser", "fwPriv"],
      erkennung: /herstellerneutral/,
      text: {
        ausfuehrlich: "Diese Firewall ist herstellerneutral aufgebaut: Regeln, Zonen und NAT stellst du im Inspektor ein. In der Konsole gibt es nur Anzeige- und Testbefehle (show, ping, traceroute).",
        knapp: "Regeln im Inspektor einstellen; die Konsole zeigt nur an.",
        nurcodes: "% Diese Firewall ist herstellerneutral: Regeln, Zonen und NAT stellst du im Inspektor ein.",
      },
      muster: "Inspektor → Firewall → Regeln · Zonen · NAT",
      beispiel: "show running-config",
      quelle: "src/cli/ios-befehle.js:976", probe: "% Diese Firewall ist herstellerneutral: Regeln, Zonen und NAT stellst du im Inspektor ein.\n% Hier gibt es nur Anzeige- und Testbefehle (show, ping, traceroute).",
    },
    {
      id: "ios-kein-routing", titel: "Router routet im Labor immer", art: ["ios"], modus: ["config"],
      erkennung: /Im Labor routet ein Router immer/,
      text: {
        ausfuehrlich: "„no ip routing“ ist hier nicht nachgebaut: Ein Router ohne Routing wäre ein Host – dafür gibt es im Labor PCs und Server. Lass die Einstellung, wie sie ist.",
        knapp: "Nicht nachgebaut – Router routet im Labor immer.",
        nurcodes: "% Im Labor routet ein Router immer – „no ip routing“ ist nicht nachgebaut.",
      },
      muster: "—", beispiel: "show ip route",
      quelle: "src/cli/ios-befehle.js:547", probe: "% Im Labor routet ein Router immer – „no ip routing“ ist nicht nachgebaut.",
    },

    /* ============ Windows-Terminal (host-windows.js) ============ */
    {
      id: "win-befehl-unbekannt", titel: "Diesen Befehl kennt die Eingabeaufforderung nicht", art: ["host-windows"], modus: [],
      erkennung: /ist entweder falsch geschrieben oder/,
      text: {
        ausfuehrlich: "Das Wort ist kein Windows-Befehl – oder es ist ein IOS-Befehl von Router/Switch. „help“ zeigt die Befehle dieses Terminals. Für Adressen: ipconfig. Für Erreichbarkeit: ping.",
        knapp: "Kein Windows-Befehl – „help“ zeigt die Liste.",
        nurcodes: 'Der Befehl "<Wort>" ist entweder falsch geschrieben oder konnte nicht gefunden werden.',
      },
      muster: "help",
      beispiel: "ipconfig /all",
      quelle: "src/cli/host-terminal.js:155", probe: 'Der Befehl "show" ist entweder falsch geschrieben oder\nkonnte nicht gefunden werden.',
    },
    {
      id: "win-ps-befehl", titel: "PowerShell-Befehl in der Eingabeaufforderung", art: ["host-windows"], modus: [],
      erkennung: /wurde nicht als Name eines Cmdlet/,
      text: {
        ausfuehrlich: "Das ist ein PowerShell-Cmdlet, keine cmd-Zeile. Tippe zuerst „powershell“ – danach funktionieren Test-NetConnection, Resolve-DnsName und Get-NetIPConfiguration. „exit“ führt zurück.",
        knapp: "Erst „powershell“ tippen, dann das Cmdlet.",
        nurcodes: 'Die Benennung "<Wort>" wurde nicht als Name eines Cmdlet … erkannt.',
      },
      muster: "powershell   →   Test-NetConnection <Ziel> -Port <Port>",
      beispiel: "Test-NetConnection www.beispiel.de -Port 80",
      quelle: "src/cli/host-terminal.js:154", probe: 'Test-NetConnection : Die Benennung "Test-NetConnection" wurde nicht als Name eines Cmdlet, einer Funktion, einer Skriptdatei oder eines ausführbaren Programms erkannt.',
    },
    {
      id: "win-ipconfig-option", titel: "Unbekannte ipconfig-Option", art: ["host-windows"], modus: [],
      erkennung: /Unbekannte oder unvollständige Befehlszeilenoption/,
      text: {
        ausfuehrlich: "ipconfig kennt nur fünf Schalter: /all, /release, /renew, /flushdns und /displaydns. Für Adresse, Maske, Gateway und DNS nimm „ipconfig /all“.",
        knapp: "Erlaubt: /all /release /renew /flushdns /displaydns",
        nurcodes: "Fehler: Unbekannte oder unvollständige Befehlszeilenoption.",
      },
      muster: "ipconfig [/all | /release | /renew | /flushdns | /displaydns]",
      beispiel: "ipconfig /all",
      quelle: "src/cli/host-windows.js:94", probe: "Fehler: Unbekannte oder unvollständige Befehlszeilenoption.\n\nSyntax: ipconfig [/all | /release | /renew | /flushdns | /displaydns]",
    },
    {
      id: "win-kein-adapter", titel: "Kein Adapter für /release oder /renew", art: ["host-windows"], modus: [],
      erkennung: /kein Adapter in einem für diesen Vorgang zulässigen Status/,
      text: {
        ausfuehrlich: "/release und /renew gibt es nur bei einer Adresse per DHCP – dieser Rechner hat eine feste (statische) Adresse. Stelle im Inspektor „automatisch (DHCP)“ ein oder setze sie per Befehl: „netsh interface ip set address \"Ethernet\" dhcp“.",
        knapp: "Nur bei DHCP: „netsh interface ip set address \"Ethernet\" dhcp“.",
        nurcodes: "Der Vorgang ist fehlgeschlagen, da sich kein Adapter in einem für diesen Vorgang zulässigen Status befindet.",
      },
      muster: 'netsh interface ip set address "Ethernet" dhcp',
      beispiel: 'netsh interface ip set address "Ethernet" dhcp',
      quelle: "src/cli/host-windows.js:54,71", probe: "Der Vorgang ist fehlgeschlagen, da sich kein Adapter in einem für diesen Vorgang zulässigen Status befindet.",
    },
    {
      id: "win-ping-syntax", titel: "ping ohne Ziel", art: ["host-windows"], modus: [],
      erkennung: /^Syntax: ping \[-t\]/m,
      text: {
        ausfuehrlich: "Zu ping gehört immer ein Ziel: eine IP-Adresse oder ein Name. „ping <Ziel>“ sendet vier Pakete; mit „-n <Zahl>“ mehr oder weniger, mit „-t“ bis zum Abbruch.",
        knapp: "Ziel fehlt: „ping <IP oder Name>“.",
        nurcodes: "Syntax: ping [-t] [-n Anzahl] [-l Größe] [-4] Zielname",
      },
      muster: "ping [-n <Anzahl>] <Ziel>",
      beispiel: "ping 192.168.1.1",
      quelle: "src/cli/host-windows.js:109", probe: "Syntax: ping [-t] [-n Anzahl] [-l Größe] [-4] Zielname\n\nOptionen:\n    -t             Sendet bis zum Abbruch (Strg+C).",
    },
    {
      id: "win-ping-option", titel: "Ungültiger Wert für eine ping-Option", art: ["host-windows"], modus: [],
      erkennung: /Ungültiger Wert für Option/,
      text: {
        ausfuehrlich: "Hinter „-n“ steht die Anzahl der Pakete (1 und mehr), hinter „-l“ die Paketgröße (0 bis 65500 Byte). Zwischen Option und Wert gehört ein Leerzeichen.",
        knapp: "-n = Anzahl (≥1), -l = Größe (0–65500), mit Leerzeichen davor.",
        nurcodes: "Ungültiger Wert für Option -n. / -l. Gültiger Bereich: 0 bis 65500.",
      },
      muster: "ping -n <Anzahl> <Ziel>   ·   ping -l <Größe> <Ziel>",
      beispiel: "ping -n 2 192.168.1.1",
      quelle: "src/cli/host-windows.js:102,103", probe: "Ungültiger Wert für Option -n.",
    },
    {
      id: "win-arp-liste", titel: "arp braucht -a oder -d", art: ["host-windows"], modus: [],
      erkennung: /^Zeigt und ändert die IP-zu-Physikalisch-Adressübersetzungstabellen/m,
      text: {
        ausfuehrlich: "„arp“ allein zeigt nur die Hilfe. Die Tabelle der gelernten MAC-Adressen siehst du mit „arp -a“; „arp -d“ löscht sie. Einträge entstehen erst, wenn der Rechner etwas im eigenen Netz angepingt hat.",
        knapp: "Tabelle zeigen: „arp -a“ · löschen: „arp -d“",
        nurcodes: "ARP -a      Zeigt die aktuellen ARP-Einträge an.",
      },
      muster: "arp -a   ·   arp -d",
      beispiel: "arp -a",
      quelle: "src/cli/host-windows.js:181", probe: "Zeigt und ändert die IP-zu-Physikalisch-Adressübersetzungstabellen, die vom\nAddress Resolution Protocol (ARP) verwendet werden.",
    },
    {
      id: "win-arp-leer", titel: "Der ARP-Cache ist leer", art: ["host-windows"], modus: [],
      erkennung: /Keine ARP-Einträge gefunden/,
      text: {
        ausfuehrlich: "Noch hat dieser Rechner keine MAC-Adresse gelernt – oder er hat gar keine IP-Adresse. Pinge zuerst etwas im eigenen Netz an (Gateway), dann füllt sich der Cache.",
        knapp: "Erst etwas im eigenen Netz anpingen, dann „arp -a“.",
        nurcodes: "Keine ARP-Einträge gefunden.",
      },
      muster: "ping <Gateway>   →   arp -a",
      beispiel: "ping 192.168.1.1",
      quelle: "src/cli/host-windows.js:183", probe: "Keine ARP-Einträge gefunden.",
    },
    {
      id: "win-name-nicht-aufloesbar", titel: "Der Name lässt sich nicht auflösen", art: ["host-windows"], modus: [],
      erkennung: /Ping-Anforderung konnte Host|konnte nicht aufgelöst werden|curl: \(6\) Could not resolve host|Name resolution of .* failed/,
      text: {
        ausfuehrlich: "Der Name wurde nicht in eine IP-Adresse übersetzt. Prüfe mit „ipconfig /all“, ob ein DNS-Server eingetragen ist, und frage ihn direkt: „nslookup <Name>“. Ein Tippfehler im Namen ist die häufigste Ursache.",
        knapp: "Name unbekannt – „ipconfig /all“ (DNS-Server) und „nslookup <Name>“ prüfen.",
        nurcodes: 'Ping-Anforderung konnte Host "<Name>" nicht finden. / curl: (6) Could not resolve host: <Name>',
      },
      muster: "nslookup <Name>   ·   ping <IP-Adresse> zum Gegentest",
      beispiel: "nslookup www.beispiel.de",
      quelle: "src/cli/host-windows.js:112,146,331", probe: 'Ping-Anforderung konnte Host "www.gibtsnicht.de" nicht finden. Überprüfen Sie den Namen, und versuchen Sie es erneut.',
    },
    {
      id: "win-dns-kein-server", titel: "Es ist kein DNS-Server eingetragen", art: ["host-windows"], modus: [],
      erkennung: /Standardserver sind nicht verfügbar|Es ist kein DNS-Server konfiguriert/,
      text: {
        ausfuehrlich: "Ohne DNS-Server lassen sich nur IP-Adressen erreichen, keine Namen. Trage einen ein: „netsh interface ip set dns \"Ethernet\" static <DNS-IP>“ – oder hole die Adresse per DHCP („ipconfig /renew“).",
        knapp: "DNS-Server setzen: „netsh interface ip set dns \"Ethernet\" static <DNS-IP>“.",
        nurcodes: "*** Standardserver sind nicht verfügbar. / Resolve-DnsName : … Es ist kein DNS-Server konfiguriert.",
      },
      muster: 'netsh interface ip set dns "Ethernet" static <DNS-IP>',
      beispiel: 'netsh interface ip set dns "Ethernet" static 192.168.1.10',
      quelle: "src/cli/host-windows.js:201,373", probe: "*** Standardserver sind nicht verfügbar.\nServer:  UnKnown\nAddress:  127.0.0.1",
    },
    {
      id: "win-dns-nxdomain", titel: "Der DNS-Server kennt den Namen nicht", art: ["host-windows"], modus: [],
      erkennung: /Non-existent domain|DNS-Name ist nicht vorhanden/,
      text: {
        ausfuehrlich: "Der DNS-Server antwortet – er kennt diesen Namen aber nicht (NXDOMAIN). Prüfe die Schreibweise. Soll der Name neu dazukommen, muss der Eintrag auf dem DNS-Server angelegt werden.",
        knapp: "Server antwortet, kennt den Namen nicht – Schreibweise oder Eintrag prüfen.",
        nurcodes: "*** <Server> kann <Name> nicht finden: Non-existent domain",
      },
      muster: "nslookup <Name>   →  Eintrag auf dem DNS-Server anlegen",
      beispiel: "nslookup www.beispiel.de",
      quelle: "src/cli/host-windows.js:207,378", probe: "*** UnKnown kann www.gibtsnicht.de nicht finden: Non-existent domain",
    },
    {
      id: "win-dns-timeout", titel: "Der DNS-Server antwortet nicht", art: ["host-windows"], modus: [],
      erkennung: /Zeitüberschreitung bei DNS-Anforderung|Timeoutzeitraum für den Vorgang abgelaufen|Zeitüberschreitung bei Anforderung an/,
      text: {
        ausfuehrlich: "Die DNS-Anfrage läuft in die Zeitüberschreitung – der eingetragene Server ist nicht erreichbar. Pinge ihn: „ping <DNS-IP>“. Antwortet er nicht, stimmen Adresse, VLAN oder Kabel nicht; läuft dort kein DNS-Dienst, muss er eingeschaltet werden.",
        knapp: "DNS-Server nicht erreichbar – erst „ping <DNS-IP>“, dann Dienst prüfen.",
        nurcodes: "Zeitüberschreitung bei DNS-Anforderung. / *** Zeitüberschreitung bei Anforderung an UnKnown.",
      },
      muster: "ping <DNS-IP>   →   Dienst „DNS“ auf dem Server prüfen",
      beispiel: "ping 192.168.1.10",
      quelle: "src/cli/host-windows.js:209", probe: "Zeitüberschreitung bei DNS-Anforderung.\n    Das Zeitlimit beträgt 2 Sekunden.",
    },
    {
      id: "win-netsh-schnittstelle", titel: "Schnittstelle „Ethernet“ nicht gefunden", art: ["host-windows"], modus: [],
      erkennung: /Es wurde keine Schnittstelle/,
      text: {
        ausfuehrlich: "Der Name hinter „set address“ muss genau der Schnittstellenname aus „ipconfig“ sein – im Labor heißt er „Ethernet“. Im Zweifel erst „netsh interface ip show config“ aufrufen.",
        knapp: 'Der Adapter heißt „Ethernet“ – Namen aus ipconfig übernehmen.',
        nurcodes: "Es wurde keine Schnittstelle „<Name>“ gefunden.",
      },
      muster: 'netsh interface ip set address "Ethernet" static <IP> <Maske> [<Gateway>]',
      beispiel: 'netsh interface ip set address "Ethernet" static 192.168.1.5 255.255.255.0 192.168.1.1',
      quelle: "src/cli/host-windows.js:279", probe: "Es wurde keine Schnittstelle „Ethernet 5“ gefunden.",
    },
    {
      id: "win-netsh-ip-ungueltig", titel: "IP, Maske oder Gateway sind ungültig", art: ["host-windows"], modus: [],
      erkennung: /Die angegebene (IP-Adresse|Subnetzmaske) ist ungültig|Das angegebene Gateway ist ungültig|Syntax: netsh interface ip set (address|dns)/,
      text: {
        ausfuehrlich: "Die Adresse muss aus vier Zahlen von 0 bis 255 bestehen (192.168.1.5), die Maske eine gültige Netzmaske sein (255.255.255.0), und das Gateway muss im eigenen Netz liegen. Ein Schreibfehler in einer Zahl genügt für diese Meldung.",
        knapp: "Adresse 192.168.1.5, Maske 255.255.255.0, Gateway im eigenen Netz.",
        nurcodes: "Die angegebene IP-Adresse ist ungültig: <Eingabe>",
      },
      muster: 'netsh interface ip set address "Ethernet" static <IP> <Maske> <Gateway>',
      beispiel: 'netsh interface ip set address "Ethernet" static 192.168.1.5 255.255.255.0 192.168.1.1',
      quelle: "src/cli/host-windows.js:286,288,289,290,303", probe: "Die angegebene IP-Adresse ist ungültig: 192.168.1.300",
    },
    {
      id: "win-netsh-befehl", titel: "Diesen netsh-Befehl gibt es nicht", art: ["host-windows"], modus: [],
      erkennung: /Folgender Befehl wurde nicht gefunden/,
      text: {
        ausfuehrlich: "netsh arbeitet in Stufen: netsh interface ip <show|set> … Im Labor gibt es nur „show config“ und „set address“ bzw. „set dns“. Zeig dir den Stand mit „netsh interface ip show config“.",
        knapp: "Nur: netsh interface ip show config · … set address · … set dns",
        nurcodes: "Folgender Befehl wurde nicht gefunden: <Eingabe>",
      },
      muster: "netsh interface ip show config",
      beispiel: "netsh interface ip show config",
      quelle: "src/cli/host-windows.js:270,273,307", probe: "Folgender Befehl wurde nicht gefunden: netsh interface ip quatsch",
    },
    {
      id: "win-route-ungueltig", titel: "Der Routenbefehl ist ungültig", art: ["host-windows"], modus: [],
      erkennung: /Der Routenbefehl ist ungültig/,
      text: {
        ausfuehrlich: "Für die Standardroute schreibst du: „route add 0.0.0.0 mask 0.0.0.0 <Gateway>“. Ziel und Gateway müssen gültige Adressen sein; ohne Gateway fehlt der Weg.",
        knapp: "route add 0.0.0.0 mask 0.0.0.0 <Gateway>",
        nurcodes: "Der Routenbefehl ist ungültig. / Der Routenbefehl ist ungültig: Gateway fehlt.",
      },
      muster: "route add 0.0.0.0 mask 0.0.0.0 <Gateway>",
      beispiel: "route add 0.0.0.0 mask 0.0.0.0 192.168.1.1",
      quelle: "src/cli/host-windows.js:250,252", probe: "Der Routenbefehl ist ungültig.\nSyntax: route add 0.0.0.0 mask 0.0.0.0 <Gateway>  ·  route delete 0.0.0.0",
    },
    {
      id: "win-route-nur-standard", titel: "Im Labor wirkt nur die Standardroute", art: ["host-windows"], modus: [],
      erkennung: /Im Labor wirkt nur die Standardroute/,
      text: {
        ausfuehrlich: "Am PC ist nur die eine Route ins Internet nachgebaut (0.0.0.0 / 0.0.0.0). Einzelne Wege zu anderen Netzen gehören auf einen Router – dort trägst du sie mit „ip route“ ein.",
        knapp: "Am PC gibt es nur die Standardroute; Einzelrouten gehören auf den Router.",
        nurcodes: "Im Labor wirkt nur die Standardroute 0.0.0.0 – weitere Routen am Rechner sind nicht nachgebaut.",
      },
      muster: "route add 0.0.0.0 mask 0.0.0.0 <Gateway>   ·   Router: ip route <Netz> <Maske> <Next-Hop>",
      beispiel: "route add 0.0.0.0 mask 0.0.0.0 192.168.1.1",
      quelle: "src/cli/host-windows.js:251", probe: " OK! (Windows-ähnlich: Im Labor wirkt nur die Standardroute 0.0.0.0 – weitere Routen am Rechner sind nicht nachgebaut.)",
    },
    {
      id: "win-telnet-port", titel: "Keine Verbindung auf diesen Port", art: ["host-windows"], modus: [],
      erkennung: /Es konnte keine Verbindung mit dem Host hergestellt werden/,
      text: {
        ausfuehrlich: "Der Rechner antwortet nicht auf diesem TCP-Port: Entweder läuft dort kein Dienst, oder eine Firewall verwirft die Pakete, oder der Weg dorthin fehlt. Prüfe zuerst die Erreichbarkeit („ping <Ziel>“), dann den Port („telnet <Ziel> <Port>“).",
        knapp: "Kein Dienst auf dem Port, oder Firewall/Weg – erst pingen, dann Port prüfen.",
        nurcodes: "Es konnte keine Verbindung mit dem Host hergestellt werden, auf Port <Port>: Verbinden fehlgeschlagen",
      },
      muster: "telnet <Ziel> <Port>",
      beispiel: "telnet 192.168.1.10 80",
      quelle: "src/cli/host-windows.js:345", probe: "Verbindung zu 192.168.1.10 wird hergestellt...Es konnte keine Verbindung mit dem Host hergestellt werden, auf Port 80: Verbinden fehlgeschlagen",
    },
    {
      id: "win-datei-fehlt", titel: "Das System kann die Datei nicht finden", art: ["host-windows"], modus: [],
      erkennung: /Das System kann die angegebene Datei nicht finden/,
      text: {
        ausfuehrlich: "Den Pfad gibt es nicht. Im Labor ist nur die Hosts-Datei vorhanden – und die schreibt man klein: „type C:\\Windows\\System32\\drivers\\etc\\hosts“.",
        knapp: "Nur die Hosts-Datei gibt es: „type C:\\Windows\\System32\\drivers\\etc\\hosts“",
        nurcodes: "Das System kann die angegebene Datei nicht finden.",
      },
      muster: "type C:\\Windows\\System32\\drivers\\etc\\hosts",
      beispiel: "type C:\\Windows\\System32\\drivers\\etc\\hosts",
      quelle: "src/cli/host-windows.js:416", probe: "Das System kann die angegebene Datei nicht finden.",
    },

    /* ============ Linux-Shell (host-linux.js) ============ */
    {
      id: "lin-befehl-unbekannt", titel: "Diesen Befehl kennt die Shell nicht", art: ["host-linux"], modus: [],
      erkennung: /(^|\n)(-bash: )?[^:\n]+: command not found/,
      text: {
        ausfuehrlich: "Das Wort ist kein Befehl dieser Shell – oder es ist ein IOS-Befehl von Router/Switch. „help“ zeigt die Befehle hier. Statt des veralteten „ifconfig“ nimmt man heute „ip a“.",
        knapp: "Kein Befehl – „help“ zeigt die Liste; statt ifconfig: „ip a“.",
        nurcodes: "<Wort>: command not found",
      },
      muster: "ip a   ·   help",
      beispiel: "ip a",
      quelle: "src/cli/host-linux.js:278 · src/cli/host-terminal.js:152", probe: "-bash: ifconfig: command not found",
    },
    {
      id: "lin-sudo-fehlt", titel: "Ändern braucht Root-Rechte", art: ["host-linux"], modus: [],
      erkennung: /RTNETLINK answers: Operation not permitted/,
      text: {
        ausfuehrlich: "Adresse, Route und Link darf nur root ändern. Stelle „sudo“ voran: „sudo ip addr add <IP>/<Präfix> dev eth0“. Im Labor fragt sudo nicht nach einem Passwort.",
        knapp: "„sudo“ voranstellen.",
        nurcodes: "RTNETLINK answers: Operation not permitted",
      },
      muster: "sudo ip addr add <IP>/<Präfix> dev eth0",
      beispiel: "sudo ip addr add 192.168.1.5/24 dev eth0",
      quelle: "src/cli/host-linux.js:59,81,94", probe: "RTNETLINK answers: Operation not permitted",
    },
    {
      id: "lin-service-root", titel: "Dienst steuern braucht Root-Rechte", art: ["host-linux"], modus: [],
      erkennung: /Interactive authentication required/,
      text: {
        ausfuehrlich: "Dienste startet und stoppt nur root. Mit „sudo systemctl restart apache2“ (oder named, isc-dhcp-server, smbd, ssh, cups) geht es. Ansehen darfst du alles: „systemctl status apache2“.",
        knapp: "„sudo systemctl restart <Dienst>“",
        nurcodes: "Failed to <Verb> <Dienst>.service: Interactive authentication required.",
      },
      muster: "sudo systemctl restart <Dienst>",
      beispiel: "sudo systemctl restart apache2",
      quelle: "src/cli/host-linux.js:235", probe: "Failed to start apache2.service: Interactive authentication required.\nSee system logs and 'systemctl status apache2.service' for details.",
    },
    {
      id: "lin-tcpdump-root", titel: "Mitschneiden braucht Root-Rechte", art: ["host-linux"], modus: [],
      erkennung: /You don't have permission to perform this capture/,
      text: {
        ausfuehrlich: "Pakete mitschneiden darf nur root. Nimm „sudo tcpdump -n“ – im Labor zeigt er die Pakete der letzten Simulation an diesem Gerät.",
        knapp: "„sudo tcpdump -n“",
        nurcodes: "tcpdump: eth0: You don't have permission to perform this capture on that device",
      },
      muster: "sudo tcpdump -n",
      beispiel: "sudo tcpdump -n",
      quelle: "src/cli/host-linux.js:252", probe: "tcpdump: eth0: You don't have permission to perform this capture on that device\n(socket: Operation not permitted)",
    },
    {
      id: "lin-praefix-fehlt", titel: "Bei „ip addr add“ fehlt das Präfix", art: ["host-linux"], modus: [],
      erkennung: /any valid prefix is expected rather than/,
      text: {
        ausfuehrlich: "Linux erwartet Adresse und Präfix in einem Wort: 192.168.1.5/24. Das Präfix sagt, wie groß das Netz ist (/24 = 255.255.255.0). Danach kommt „dev eth0“.",
        knapp: "Schreibweise: „sudo ip addr add 192.168.1.5/24 dev eth0“.",
        nurcodes: 'Error: any valid prefix is expected rather than "<Eingabe>".',
      },
      muster: "sudo ip addr add <IP>/<Präfix> dev eth0",
      beispiel: "sudo ip addr add 192.168.1.5/24 dev eth0",
      quelle: "src/cli/host-linux.js:65", probe: 'Error: any valid prefix is expected rather than "192.168.1.5".',
    },
    {
      id: "lin-device-fehlt", titel: "Diese Schnittstelle gibt es nicht", art: ["host-linux"], modus: [],
      erkennung: /Cannot find device/,
      text: {
        ausfuehrlich: "Der Name hinter „dev“ muss eine vorhandene Schnittstelle sein. Im Labor hat jeder Server genau „eth0“ (und „lo“). „ip link“ zeigt die Liste.",
        knapp: "„dev eth0“ – „ip link“ zeigt die Schnittstellen.",
        nurcodes: 'Cannot find device "<Name>"',
      },
      muster: "sudo ip addr add <IP>/<Präfix> dev eth0",
      beispiel: "sudo ip addr add 192.168.1.5/24 dev eth0",
      quelle: "src/cli/host-linux.js:67", probe: 'Cannot find device "eth1"',
    },
    {
      id: "lin-ip-unbekannt", titel: "Unbekanntes ip-Kommando oder Objekt", art: ["host-linux"], modus: [],
      erkennung: /is unknown, try "ip (address|route)? ?help"|Object ".*" is unknown/,
      text: {
        ausfuehrlich: "„ip“ arbeitet in zwei Stufen: erst das Objekt (address, route, link), dann das Kommando (show, add, set). „ip help“ zeigt die Objekte, „ip address help“ die Kommandos.",
        knapp: "Objekte: address · route · link. „ip help“ zeigt sie.",
        nurcodes: 'Command "<Kommando>" is unknown, try "ip address help".',
      },
      muster: "ip <address|route|link> <show|add|set|help>",
      beispiel: "ip address show",
      quelle: "src/cli/host-linux.js:75,90,101", probe: 'Command "quatsch" is unknown, try "ip address help".',
    },
    {
      id: "lin-route-prefix", titel: "Route: Präfix oder Gateway fehlt", art: ["host-linux"], modus: [],
      erkennung: /inet prefix is expected rather than/,
      text: {
        ausfuehrlich: "Eine Route braucht ein Ziel und ein Gateway: „sudo ip route add default via <Gateway>“. Im Labor ist nur die Default-Route nachgebaut.",
        knapp: "„sudo ip route add default via <Gateway>“",
        nurcodes: 'Error: inet prefix is expected rather than "".',
      },
      muster: "sudo ip route add default via <Gateway>",
      beispiel: "sudo ip route add default via 192.168.1.1",
      quelle: "src/cli/host-linux.js:85", probe: 'Error: inet prefix is expected rather than "".',
    },
    {
      id: "lin-route-existiert", titel: "Es gibt schon eine Default-Route", art: ["host-linux"], modus: [],
      erkennung: /RTNETLINK answers: File exists/,
      text: {
        ausfuehrlich: "Eine Default-Route ist schon gesetzt – „add“ legt keine zweite an. Nimm „sudo ip route replace default via <Gateway>“ oder lösche sie zuerst mit „sudo ip route del default“.",
        knapp: "„replace“ statt „add“ – oder erst „del default“.",
        nurcodes: "RTNETLINK answers: File exists",
      },
      muster: "sudo ip route replace default via <Gateway>",
      beispiel: "sudo ip route replace default via 192.168.2.1",
      quelle: "src/cli/host-linux.js:86", probe: "RTNETLINK answers: File exists",
    },
    {
      id: "lin-ziel-fehlt", titel: "Ziel fehlt (ping oder traceroute)", art: ["host-linux"], modus: [],
      erkennung: /ping: usage error: Destination address required|^Usage: traceroute \[ -n \] host/m,
      text: {
        ausfuehrlich: "Zu ping und traceroute gehört ein Ziel. „ping -c 4 <Ziel>“ sendet vier Pakete; ohne „-c“ pingt Linux bis zum Abbruch (Strg+C).",
        knapp: "Ziel angeben: „ping -c 4 <Ziel>“",
        nurcodes: "ping: usage error: Destination address required / Usage: traceroute [ -n ] host",
      },
      muster: "ping -c 4 <Ziel>   ·   traceroute <Ziel>",
      beispiel: "ping -c 4 192.168.1.1",
      quelle: "src/cli/host-linux.js:112,137", probe: "ping: usage error: Destination address required",
    },
    {
      id: "lin-ping-argument", titel: "Ungültiger Wert für -c", art: ["host-linux"], modus: [],
      erkennung: /ping: invalid argument/,
      text: {
        ausfuehrlich: "Hinter „-c“ steht die Anzahl der Pakete – eine ganze Zahl ab 1. Zwischen Option und Zahl gehört ein Leerzeichen.",
        knapp: "„-c 4“ – ganze Zahl ab 1.",
        nurcodes: "ping: invalid argument: '<Wert>'",
      },
      muster: "ping -c <Anzahl> <Ziel>",
      beispiel: "ping -c 4 192.168.1.1",
      quelle: "src/cli/host-linux.js:108", probe: "ping: invalid argument: 'null'",
    },
    {
      id: "lin-name-nicht-aufloesbar", titel: "Der Name lässt sich nicht auflösen (Linux)", art: ["host-linux"], modus: [],
      erkennung: /Temporary failure in name resolution|Cannot handle "host" cmdline arg/,
      text: {
        ausfuehrlich: "Der Name wurde nicht in eine Adresse übersetzt. Prüfe den eingetragenen Server mit „cat /etc/resolv.conf“ – steht dort kein „nameserver“, kommt die Adresse per DHCP oder muss gesetzt werden. Zum Gegentest die IP-Adresse direkt pingen.",
        knapp: "„cat /etc/resolv.conf“ prüfen; Gegentest mit der IP-Adresse.",
        nurcodes: "<Name>: Temporary failure in name resolution",
      },
      muster: "cat /etc/resolv.conf   ·   ping <IP-Adresse>",
      beispiel: "cat /etc/resolv.conf",
      quelle: "src/cli/host-linux.js:115,140", probe: "ping: www.gibtsnicht.de: Temporary failure in name resolution",
    },
    {
      id: "lin-netz-nicht-erreichbar", titel: "Network is unreachable", art: ["host-linux"], modus: [],
      erkennung: /Network is unreachable/,
      text: {
        ausfuehrlich: "Der Rechner kann das Paket gar nicht losschicken: Entweder fehlt die eigene Adresse, oder das Ziel liegt in einem anderen Netz und es gibt keine Default-Route. „ip a“ zeigt die Adresse, „ip r“ die Route.",
        knapp: "Adresse und Default-Route prüfen: „ip a“ und „ip r“.",
        nurcodes: "ping: connect: Network is unreachable",
      },
      muster: "sudo ip addr add <IP>/<Präfix> dev eth0   ·   sudo ip route add default via <Gateway>",
      beispiel: "ip r",
      quelle: "src/cli/host-linux.js:117", probe: "ping: connect: Network is unreachable",
    },
    {
      id: "lin-dns-name-fehlt", titel: "DNS-Abfrage ohne Namen", art: ["host-linux"], modus: [],
      erkennung: /^(?:;; Usage: dig|Im Labor bitte mit Namen)/m,
      text: {
        ausfuehrlich: "dig und nslookup brauchen einen Namen: „dig www.beispiel.de“ oder „nslookup www.beispiel.de“. Ohne Namen zeigen sie nur ihre Syntax.",
        knapp: "Namen angeben: „dig <Name>“",
        nurcodes: ";; Usage: dig [@server] name [type]",
      },
      muster: "dig <Name>   ·   nslookup <Name>   ·   host <Name>",
      beispiel: "dig www.beispiel.de",
      quelle: "src/cli/host-linux.js:163,178", probe: ";; Usage: dig [@server] name [type]",
    },
    {
      id: "lin-dns-kein-server", titel: "Kein DNS-Server erreichbar", art: ["host-linux"], modus: [],
      erkennung: /no servers could be reached|communications error to .*#53/,
      text: {
        ausfuehrlich: "Die Abfrage kam nicht durch: Entweder ist kein DNS-Server eingetragen („cat /etc/resolv.conf“) oder er antwortet nicht („ping <DNS-IP>“, Dienst „named“ prüfen).",
        knapp: "resolv.conf prüfen, DNS-Server anpingen, Dienst „named“ prüfen.",
        nurcodes: ";; connection timed out; no servers could be reached",
      },
      muster: "cat /etc/resolv.conf   ·   ping <DNS-IP>   ·   sudo systemctl start named",
      beispiel: "cat /etc/resolv.conf",
      quelle: "src/cli/host-linux.js:166,173,181,185,192", probe: ";; communications error to 192.168.1.10#53: timed out",
    },
    {
      id: "lin-dns-nxdomain", titel: "Der DNS-Server kennt den Namen nicht (Linux)", art: ["host-linux"], modus: [],
      erkennung: /NXDOMAIN/,
      text: {
        ausfuehrlich: "Der Server antwortet mit NXDOMAIN: Diesen Namen gibt es dort nicht. Prüfe die Schreibweise – oder lege den Eintrag auf dem DNS-Server an.",
        knapp: "NXDOMAIN: Name unbekannt – Schreibweise prüfen.",
        nurcodes: "** server can't find <Name>: NXDOMAIN",
      },
      muster: "dig <Name>   →   Eintrag auf dem DNS-Server anlegen",
      beispiel: "dig www.beispiel.de",
      quelle: "src/cli/host-linux.js:172,184,193", probe: "** server can't find www.gibtsnicht.de: NXDOMAIN",
    },
    {
      id: "lin-unit-fehlt", titel: "Diesen Dienst (Unit) gibt es nicht", art: ["host-linux"], modus: [],
      erkennung: /Unit .*\.service could not be found/,
      text: {
        ausfuehrlich: "Der Dienstname stimmt nicht. Im Labor gibt es: apache2 (Web), named (DNS), isc-dhcp-server (DHCP), smbd (Dateien), ssh, cups (Druck). „systemctl list-units“ zeigt alle mit Status.",
        knapp: "Dienstnamen prüfen: „systemctl list-units“.",
        nurcodes: "Unit <Name>.service could not be found.",
      },
      muster: "systemctl status <apache2|named|isc-dhcp-server|smbd|ssh|cups>",
      beispiel: "systemctl status apache2",
      quelle: "src/cli/host-linux.js:228", probe: "Unit apache3.service could not be found.",
    },
    {
      id: "lin-verb-unbekannt", titel: "systemctl: unbekanntes Verb", art: ["host-linux"], modus: [],
      erkennung: /Unknown command verb/,
      text: {
        ausfuehrlich: "Vor dem Dienstnamen steht das Verb. Erlaubt sind: status, start, stop, restart, enable, disable, is-active. Zum Ansehen „status“ – zum Ändern mit „sudo“.",
        knapp: "Verben: status · start · stop · restart · enable · disable · is-active",
        nurcodes: "Unknown command verb <Verb>.",
      },
      muster: "systemctl <status|start|stop|restart> <Dienst>",
      beispiel: "systemctl status apache2",
      quelle: "src/cli/host-linux.js:225", probe: "Unknown command verb quatsch.",
    },
    {
      id: "lin-argumente-fehlt", titel: "systemctl: Dienstname fehlt", art: ["host-linux"], modus: [],
      erkennung: /^Too few arguments\.$/m,
      text: {
        ausfuehrlich: "Zu systemctl gehören Verb und Dienst: „systemctl status apache2“. Ohne Dienstnamen weiß es nicht, was gemeint ist.",
        knapp: "Dienstnamen anhängen: „systemctl status apache2“.",
        nurcodes: "Too few arguments.",
      },
      muster: "systemctl <Verb> <Dienst>",
      beispiel: "systemctl restart named",
      quelle: "src/cli/host-linux.js:226", probe: "Too few arguments.",
    },
    {
      id: "lin-cat-datei", titel: "Diese Datei gibt es nicht", art: ["host-linux"], modus: [],
      erkennung: /cat: .*: No such file or directory/,
      text: {
        ausfuehrlich: "Den Pfad gibt es nicht. Im Labor liest du „/etc/resolv.conf“ (DNS-Server), „/etc/hosts“ (lokale Namen) und „/etc/hostname“ (Rechnername) – mit führendem Schrägstrich.",
        knapp: "Nur /etc/resolv.conf, /etc/hosts, /etc/hostname gibt es hier.",
        nurcodes: "cat: <Pfad>: No such file or directory",
      },
      muster: "cat /etc/resolv.conf",
      beispiel: "cat /etc/resolv.conf",
      quelle: "src/cli/host-linux.js:293", probe: "cat: /etc/passwd: No such file or directory",
    },

    /* ============ curl: gleiche Meldung auf beiden Endgeräten ============ */
    {
      id: "curl-ohne-adresse", titel: "curl ohne Adresse", art: ["host-windows", "host-linux"], modus: [],
      erkennung: /curl: try 'curl --help'/,
      text: {
        ausfuehrlich: "Zu curl gehört eine Adresse: „curl http://www.beispiel.de“. Mit „-I“ holst du nur die Kopfzeilen (Status 200 oder Fehler).",
        knapp: "Adresse angeben: „curl http://<Name>“",
        nurcodes: "curl: try 'curl --help' for more information",
      },
      muster: "curl [-I] http://<Name>",
      beispiel: "curl http://www.beispiel.de",
      quelle: "src/cli/host-windows.js:326 · src/cli/host-linux.js:207", probe: "curl: try 'curl --help' for more information",
    },
    {
      id: "curl-port-zu", titel: "Port geschlossen – Verbindung abgelehnt", art: ["host-windows", "host-linux"], modus: [],
      erkennung: /curl: \(7\) Failed to connect/,
      text: {
        ausfuehrlich: "Der Rechner ist erreichbar, aber auf diesem Port nimmt niemand Verbindungen an – der Webdienst läuft nicht. Starte ihn („sudo systemctl start apache2“) und prüfe den Port mit „curl -I http://<Name>“.",
        knapp: "Kein Dienst auf dem Port – Webdienst starten.",
        nurcodes: "curl: (7) Failed to connect to <Host> port <Port> after 2 ms: Couldn't connect to server",
      },
      muster: "sudo systemctl start apache2   →   curl -I http://<Name>",
      beispiel: "curl -I http://www.beispiel.de",
      quelle: "src/cli/host-windows.js:333 · src/cli/host-linux.js:214", probe: "curl: (7) Failed to connect to www.beispiel.de port 80 after 2 ms: Couldn't connect to server",
    },
    {
      id: "curl-timeout", titel: "Keine Antwort auf die Verbindung", art: ["host-windows", "host-linux"], modus: [],
      erkennung: /curl: \(28\) Failed to connect/,
      text: {
        ausfuehrlich: "Es kam keine Antwort – kein RST, sondern Stille. Das ist typisch für eine Firewall, die die Pakete verwirft. Prüfe zuerst die Erreichbarkeit („ping <Ziel>“), dann den Weg und die Regeln der Firewall.",
        knapp: "Keine Antwort – Firewall oder Weg prüfen, erst pingen.",
        nurcodes: "curl: (28) Failed to connect to <Host> port <Port> after 21000 ms: Timed out",
      },
      muster: "ping <Ziel>   →   Firewall-Regeln im Inspektor prüfen",
      beispiel: "ping 192.168.1.10",
      quelle: "src/cli/host-windows.js:333 · src/cli/host-linux.js:214", probe: "curl: (28) Failed to connect to 10.0.0.5 port 80 after 21000 ms: Timed out",
    },

    /* ============ Auffang: Fehler, deren Meldung der Katalog (noch) nicht kennt ============ */
    {
      id: "alle-unbekannt", titel: "Meldung ohne Katalogeintrag", art: ["alle"], modus: [], nurFehler: true,
      erkennung: /[\s\S]/,
      text: {
        ausfuehrlich: "Diese Meldung steht noch nicht im Fehlerkatalog. Lies sie genau: Sie nennt meist Gerät, Schnittstelle oder Befehl. Tippe an dieser Stelle das Fragezeichen „?“ – damit siehst du, was hier erlaubt ist.",
        knapp: "Unbekannte Meldung – „?“ zeigt, was hier erlaubt ist.",
        nurcodes: (lage, ausgabe) => (String(ausgabe).split("\n").find(z => z.trim()) || "Unbekannte Meldung").trim(),
      },
      muster: "?   (zeigt die erlaubten Wörter an dieser Stelle)",
      beispiel: "help",
      quelle: "Auffang – keine bestimmte Fundstelle", probe: "Irgendeine neue Meldung, die noch niemand erklärt hat.",
    },
  ];
