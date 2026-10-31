"use strict";
/* ---------- Lehrplan der Abteilung Subnetting (Runde 7, Owner W2) ----------
   DATEN.subnetzLehrplan = {version, formelsammlung, module}

   Verbindlicher Vertrag: docs/entwicklung/Entwurf – Runde 7 (Abteilung Subnetting).md § 2.2.
   · 8 Module in fester Reihenfolge: bits, maske, block, netzid, schneiden, vlsm, vlan, pruefung.
   · Jedes Modul: kern (3–6 Sätze, Deutsch, Du-Form), GENAU ein merksatz, mindestens ein
     geführtes Beispiel mit Schritten (die im ausgerechneten Ergebnis enden), visuell, uebung,
     pruefung, verweise (wiki/werkzeug/training), dauerMin, quelle.
   · `visuell.preset` ist die Optionsliste für UI.subnetzwerkzeuge.zeichnen(container, art, preset)
     (Vertrag § 2.4: ip?, praefix?, niveau?). W3 darf sie unverändert durchreichen.
   · Fachlich belegt durch RFC 4632 (CIDR), RFC 1918 (private Netze), RFC 3021 (/31),
     IEEE 802.1Q (VLAN-Tagging) und die Vault-Quellen (Network – Lernfassung, VLAN – Lernfassung,
     04-AP1-Netzwerk, Fragen – Subnetting, Übungs-Szenarien).
   · Quellenangaben nennen die Vault-Dokumente in lesbarer Schreibweise (z. B. 07-Übungen-
     Subnetting-Szenarien); die Dateien im Vault tragen die ASCII-Namen (07-Uebungen-…), die
     tools/umlaute.py als Zitat-Ausnahme führt.
   · Keine erfundenen Zahlen; jede Beispielrechnung wird in tests/subnetz-lehrplan.test.js
     unabhängig nachgerechnet. Keine Emoji. Reine Daten, LF-Zeilenenden, kein DOM. */
DATEN.subnetzLehrplan = {
  version: 1,

  /* ---------- Formelsammlung: Register 4 der Abteilung (§ 1: Präfix-/Masken-/Host-Tabelle,
     Rechenweg in fünf Schritten, VLAN-/Trunk-Merkblatt, Fehlerfallen). ---------- */
  formelsammlung: [
    {
      titel: "Präfix, Maske, Blockgröße und nutzbare Hosts",
      saetze: [
        "Der Präfix zählt die Einsen von links; die Subnetzmaske schreibt dieselben Bits als vier Oktette.",
        "Die Blockgröße ist 2 hoch (32 minus Präfix) – so viele Adressen umfasst jeder Block.",
        "Nutzbare Hostadressen sind Blockgröße minus 2: Netzadresse und Broadcastadresse gehören nicht den Hosts.",
        "Ausnahmen: Ein /31 hat nach RFC 3021 zwei nutzbare Endpunkte, ein /32 genau eine Adresse.",
        "CIDR (Classless Inter-Domain Routing) erlaubt beliebige Präfixlängen; Blockgröße und Maske folgen aus dem Präfix.",
      ],
      tabelle: {
        spalten: ["Präfix", "Maske", "Blockgröße", "Nutzbare Hosts"],
        zeilen: [
          ["/16", "255.255.0.0", "65536", "65534"],
          ["/17", "255.255.128.0", "32768", "32766"],
          ["/18", "255.255.192.0", "16384", "16382"],
          ["/19", "255.255.224.0", "8192", "8190"],
          ["/20", "255.255.240.0", "4096", "4094"],
          ["/21", "255.255.248.0", "2048", "2046"],
          ["/22", "255.255.252.0", "1024", "1022"],
          ["/23", "255.255.254.0", "512", "510"],
          ["/24", "255.255.255.0", "256", "254"],
          ["/25", "255.255.255.128", "128", "126"],
          ["/26", "255.255.255.192", "64", "62"],
          ["/27", "255.255.255.224", "32", "30"],
          ["/28", "255.255.255.240", "16", "14"],
          ["/29", "255.255.255.248", "8", "6"],
          ["/30", "255.255.255.252", "4", "2"],
          ["/31", "255.255.255.254", "2", "2"],
          ["/32", "255.255.255.255", "1", "1"],
        ],
      },
      merksatz: "Blockgröße ist 2 hoch (32 minus Präfix) – das ist die Zahl aller Adressen, nicht die Zahl der Hosts.",
      visual: {art: "maskenleiste", preset: {praefix: 26}},
    },
    {
      titel: "Rechenweg in fünf Schritten",
      saetze: [
        "Schritt 1: Präfix notieren und die Hostbits zählen, denn Hostbits sind 32 minus Präfix.",
        "Schritt 2: Blockgröße berechnen, denn 2 hoch Hostbits ergibt die Adressen je Block.",
        "Schritt 3: Die Adresse durch die Blockgröße teilen; der ganzzahlige Anteil mal Blockgröße ergibt die Netz-ID.",
        "Schritt 4: Die Broadcastadresse ist Netz-ID plus Blockgröße minus 1; nutzbare Hosts sind Blockgröße minus 2 – das gilt für /0 bis /30. Bei /31 gibt es nach RFC 3021 zwei nutzbare Endpunkte, bei /32 genau eine Adresse.",
        "Schritt 5: Erste Hostadresse ist Netz-ID plus 1, letzte Hostadresse ist Broadcastadresse minus 1; bei /31 entfällt diese Trennung, denn beide Adressen sind Endpunkte der Punkt-zu-Punkt-Strecke – die Gegenprobe mit der Blockgröße bleibt Pflicht.",
      ],
      merksatz: "Netz-ID, Broadcast und Hostspanne folgen alle aus derselben Blockgröße.",
      visual: {art: "rechner", preset: {ip: "192.168.10.70", praefix: 26}},
    },
    {
      titel: "Blockgröße im Oktett ablesen",
      saetze: [
        "Ab /24 ändert sich nur das letzte Oktett; die Blockgröße ist dort 256 minus Maskenoktett.",
        "Die Netz-IDs liegen auf Vielfachen der Blockgröße: bei 64 also 0, 64, 128 und 192.",
        "Bei /25 bis /30 steht die Blockgröße direkt im letzten Oktett; bei kleineren Präfixen wandert die Grenze ein Oktett nach links.",
        "Wer die Blockgröße kennt, liest Netz-ID und Broadcast im Raster ab, ohne Bit für Bit zu rechnen.",
      ],
      tabelle: {
        spalten: ["Letztes Maskenoktett", "Blockgröße", "Präfix", "Netz-IDs im Oktett"],
        zeilen: [
          ["192", "64", "/26", "0, 64, 128, 192"],
          ["224", "32", "/27", "0, 32, 64, ... 224"],
          ["240", "16", "/28", "0, 16, 32, ... 240"],
          ["248", "8", "/29", "0, 8, 16, ... 248"],
          ["252", "4", "/30", "0, 4, 8, ... 252"],
          ["254", "2", "/31", "0, 2, 4, ... 254"],
          ["255", "1", "/32", "jede Adresse für sich"],
        ],
      },
      merksatz: "Blockgröße gleich 256 minus letztes Maskenoktett – das gilt ab /24.",
      visual: {art: "blocklineal", preset: {ip: "192.168.10.70", praefix: 27}},
    },
    {
      titel: "VLAN und Trunk: Merkblatt",
      saetze: [
        "Ein VLAN ist eine eigene Broadcast-Domäne; jede Broadcast-Domäne braucht ein eigenes Subnetz und in der Regel ein eigenes Gateway – ein Layer-3-Switch kann mehrere Netze über virtuelle Schnittstellen bedienen.",
        "Ein Access-Port gehört zu genau einem VLAN; ein Trunk-Port trägt mehrere VLANs und taggt die Frames nach IEEE 802.1Q.",
        "Das 802.1Q-Tag ist 4 Byte lang, enthält die VLAN-ID und wird zwischen Quell-MAC-Adresse und Typfeld eingefügt.",
        "Frames ohne Tag gehören am Trunk zum Native VLAN; beide Trunk-Enden müssen dasselbe Native VLAN tragen.",
      ],
      tabelle: {
        spalten: ["Begriff", "Bedeutung", "Prüfen mit"],
        zeilen: [
          ["Access-Port", "gehört zu genau einem VLAN", "show vlan brief"],
          ["Trunk-Port", "trägt mehrere VLANs, Frames getaggt", "show interfaces trunk"],
          ["802.1Q-Tag", "4 Byte mit VLAN-ID am Frame", "show interfaces trunk"],
          ["Native VLAN", "ungetaggte Frames am Trunk", "show interfaces trunk"],
        ],
      },
      merksatz: "VLANs trennen Broadcast-Domänen – ohne Router oder Layer-3-Switch kommen sie nicht zusammen.",
      visual: {art: "vlan", preset: {niveau: "AP1"}},
    },
    {
      titel: "Typische Fehlerfallen",
      saetze: [
        "Blockgröße mit Hostzahl verwechseln: 2 hoch Hostbits sind alle Adressen, nicht die nutzbaren.",
        "Netz- und Broadcastadresse als Hosts vergeben: Bei /24 bis /30 bleiben beide für die Netzwerkfunktion reserviert; /31 ist nach RFC 3021 die Ausnahme mit zwei nutzbaren Endpunkten, /32 hat genau eine Adresse.",
        "Maske und Wildcard verwechseln: Die Wildcard ist das Spiegelbild der Maske und gehört in Access-Listen.",
        "VLSM vom kleinsten Bedarf aus planen: Dann bleibt am Ende oft kein zusammenhängender Block für die größte Anforderung.",
        "Am Trunk die erlaubte VLAN-Liste ersetzen statt ergänzen: „allowed vlan 20“ löscht die anderen Einträge.",
        "/31 wie ein normales Netz behandeln: Nach RFC 3021 gibt es dort keine Netz- und Broadcastadresse, sondern zwei Endpunkte.",
      ],
      merksatz: "Erst rechnen, dann eintragen – und zum Schluss die Gegenprobe mit der Blockgröße machen.",
      visual: {art: "blocklineal", preset: {ip: "192.168.10.70", praefix: 26}},
    },
  ],

  /* ---------- Die acht Module in fester Reihenfolge (§ 2.2) ---------- */
  module: [
    {
      id: "bits", nr: 1, stufe: "E",
      titel: "Bits und Oktette",
      kicker: "Stufe E · Grundlage",
      lead: "Eine IPv4-Adresse besteht aus 32 Bit. Du lernst, wie vier Oktette zu je 8 Bit eine Adresse bilden und wie du eine Dezimalzahl in Bit umrechnest.",
      kern: [
        "Eine IPv4-Adresse hat 32 Bit und wird als vier Oktette geschrieben – jedes Oktett ist eine Dezimalzahl von 0 bis 255.",
        "Acht Bit ergeben 255, weil die Stellenwerte 128, 64, 32, 16, 8, 4, 2 und 1 zusammen 255 sind.",
        "Ein gesetztes Bit zählt seinen Stellenwert, ein nicht gesetztes Bit zählt null; die Summe der gesetzten Stellenwerte ist der Dezimalwert.",
        "Die Maske ist ein zweites 32-Bit-Muster: Die vorderen Bits gehören zum Netzanteil, die hinteren zum Hostanteil.",
        "Du liest ein Oktett von links nach rechts: Ist der Stellenwert enthalten, schreibst du eine 1, sonst eine 0.",
      ],
      merksatz: "Acht Bit sind ein Oktett – 128 plus 64 plus 32 plus 16 plus 8 plus 4 plus 2 plus 1 ergibt 255.",
      visuell: {art: "bitlabor", preset: {ip: "192.168.10.70", praefix: 26}},
      beispiel: [
        {
          titel: "Oktett 10 in Bit",
          aufgabe: "Schreibe das dritte Oktett der Adresse 192.168.10.0 als 8 Bit.",
          schritte: [
            {text: "Stellenwerte des Oktetts aufschreiben: 128, 64, 32, 16, 8, 4, 2, 1.", ergebnis: "Stellenwerte bereit"},
            {text: "10 ist kleiner als 128, 64, 32 und 16 – diese vier Bits bleiben 0.", ergebnis: "0000"},
            {text: "10 enthält die 8: 10 minus 8 ergibt 2, also Bit 8 auf 1.", ergebnis: "00001000"},
            {text: "2 enthält die 2: 2 minus 2 ergibt 0, also Bit 2 auf 1.", ergebnis: "00001010"},
            {text: "Prüfsumme: 8 plus 2 ergibt 10.", ergebnis: "00001010"},
          ],
          ergebnis: "00001010",
        },
        {
          titel: "Oktett 255 in Bit",
          aufgabe: "Warum ist 255 das größte Oktett?",
          schritte: [
            {text: "Alle acht Stellenwerte auf 1 setzen.", ergebnis: "11111111"},
            {text: "128 plus 64 plus 32 plus 16 plus 8 plus 4 plus 2 plus 1 addieren.", ergebnis: "255"},
          ],
          ergebnis: "255",
        },
      ],
      uebung: {arten: ["maske", "hosts"], niveau: "E", anzahl: 4},
      pruefung: {arten: ["maske", "netzid"], niveau: "E", anzahl: 5, bestehen: 4},
      verweise: {wiki: "lab.subnetz", werkzeug: "bitlabor", training: "tr-subnetz-plan"},
      dauerMin: 8,
      quelle: "04-AP1-Netzwerk · Network – Lernfassung (§ 7 IPv4-Adressen) · RFC 791",
    },
    {
      id: "maske", nr: 2, stufe: "E",
      titel: "Netzanteil und Hostanteil",
      kicker: "Stufe E · Schablone",
      lead: "Die Subnetzmaske sagt, wo der Netzanteil endet und der Hostanteil beginnt. Du rechnest zwischen Präfix und Dotted-Decimal-Maske in beide Richtungen.",
      kern: [
        "Die Subnetzmaske ist eine Schablone: Sie markiert mit einer 1 die Netzbits und mit einer 0 die Hostbits.",
        "Ein Präfix von /p bedeutet: Die ersten p Bit der Maske sind 1, die restlichen 32 minus p Bit sind 0.",
        "Eine gültige Maske hat alle Einsen vorn und alle Nullen hinten; gemischte Muster wie 255.0.255.0 sind keine gültige Maske.",
        "Die Maske selbst vergibt keine Adresse – sie sagt nur, wo der Netzanteil endet.",
        "Du rechnest in beide Richtungen: aus einer Maske den Präfix und aus einem Präfix die Dotted-Decimal-Maske.",
      ],
      merksatz: "Maske und Präfix sind zwei Schreibweisen derselben Information: /p heißt p Einsen von links.",
      visuell: {art: "maskenleiste", preset: {praefix: 26}},
      beispiel: [
        {
          titel: "Maske 255.255.255.192 als Präfix",
          aufgabe: "Wie lautet der Präfix zur Maske 255.255.255.192?",
          schritte: [
            {text: "Das erste Oktett 255 hat acht Einsen.", ergebnis: "8"},
            {text: "Zweites und drittes Oktett sind ebenfalls 255 – zusammen 24 Einsen.", ergebnis: "24"},
            {text: "Viertes Oktett 192 ist 128 plus 64, also zwei Einsen.", ergebnis: "2"},
            {text: "8 plus 8 plus 8 plus 2 ergibt 26 Einsen – der Präfix lautet /26.", ergebnis: "/26"},
          ],
          ergebnis: "/26",
        },
        {
          titel: "Präfix /28 als Maske",
          aufgabe: "Welche Subnetzmaske gehört zu /28?",
          schritte: [
            {text: "28 Bit sind drei volle Oktette mit 24 Bit und vier Bit im vierten Oktett.", ergebnis: "drei Oktette plus 4 Bit"},
            {text: "Die vier Bit im vierten Oktett sind 128 plus 64 plus 32 plus 16, also 240.", ergebnis: "240"},
            {text: "Die restlichen Bits werden 0, die ersten drei Oktette sind 255.", ergebnis: "255.255.255.240"},
          ],
          ergebnis: "255.255.255.240",
        },
      ],
      uebung: {arten: ["maske", "netzid"], niveau: "E", anzahl: 4},
      pruefung: {arten: ["maske", "hosts"], niveau: "E", anzahl: 5, bestehen: 4},
      verweise: {wiki: "lab.subnetz", werkzeug: "maskenleiste", training: "tr-subnetz-plan"},
      dauerMin: 8,
      quelle: "04-AP1-Netzwerk · Network – Lernfassung (§ 8 Subnetting) · RFC 4632",
    },
    {
      id: "block", nr: 3, stufe: "E",
      titel: "Blockgröße",
      kicker: "Stufe E · Raster",
      lead: "Die Blockgröße bestimmt, wie die Netze im Adressraum liegen. Du rechnest sie aus dem Präfix aus und liest die Netz-IDs im Raster ab.",
      kern: [
        "Die Blockgröße sagt, wie viele Adressen ein Block umfasst: Sie ist 2 hoch (32 minus Präfix).",
        "Bei /26 sind das 2 hoch 6, also 64 Adressen; bei /28 sind es 2 hoch 4, also 16 Adressen.",
        "Ab /24 liest du die Blockgröße direkt am letzten Maskenoktett ab: Blockgröße gleich 256 minus Maskenoktett.",
        "Die Netz-IDs liegen auf Vielfachen der Blockgröße; bei 64 also bei 0, 64, 128 und 192 im letzten Oktett.",
        "Bei kleineren Präfixen wandert die Blockgrenze in ein früheres Oktett – dann zählst du dort in Blöcken weiter.",
      ],
      merksatz: "Blockgröße ist 2 hoch (32 minus Präfix) – die Zahl der Adressen, nicht der Hosts.",
      visuell: {art: "blocklineal", preset: {ip: "192.168.10.70", praefix: 26}},
      beispiel: [
        {
          titel: "Blockgröße /27",
          aufgabe: "Wie groß ist der Block bei /27, und wo liegen die Netz-IDs im letzten Oktett?",
          schritte: [
            {text: "Hostbits zählen: 32 minus 27 ergibt 5.", ergebnis: "5 Hostbits"},
            {text: "2 hoch 5 berechnen.", ergebnis: "32 Adressen je Block"},
            {text: "Netz-IDs auf Vielfachen von 32 ablesen.", ergebnis: "0, 32, 64, 96, 128, 160, 192, 224"},
            {text: "Gegenprobe über das Maskenoktett: 256 minus 224 ergibt 32.", ergebnis: "32"},
            {text: "Ergebnis zusammenfassen: Blockgröße 32, Netz-IDs bei jedem Vielfachen von 32.", ergebnis: "Blockgröße 32; Netz-IDs 0, 32, 64, 96, 128, 160, 192, 224"},
          ],
          ergebnis: "Blockgröße 32; Netz-IDs 0, 32, 64, 96, 128, 160, 192, 224",
        },
        {
          titel: "Blockgröße /28",
          aufgabe: "Wie viele Adressen umfasst ein /28-Block?",
          schritte: [
            {text: "32 minus 28 ergibt 4 Hostbits.", ergebnis: "4"},
            {text: "2 hoch 4 ergibt 16 Adressen.", ergebnis: "16 Adressen"},
          ],
          ergebnis: "16 Adressen",
        },
      ],
      uebung: {arten: ["hosts", "block"], niveau: "E", anzahl: 4},
      pruefung: {arten: ["block", "maske", "hosts"], niveau: "E", anzahl: 5, bestehen: 4},
      verweise: {wiki: "lab.subnetz", werkzeug: "blocklineal", training: "tr-subnetz-plan"},
      dauerMin: 8,
      quelle: "04-AP1-Netzwerk · Fragen – Subnetting · RFC 4632",
    },
    {
      id: "netzid", nr: 4, stufe: "E",
      titel: "Netz-ID, Broadcast, Hosts",
      kicker: "Stufe E · Blockgrenzen",
      lead: "Aus Adresse und Präfix bestimmst du Netzadresse, Broadcastadresse und die Hostspanne. Danach kannst du jede Adresse im Block richtig einordnen.",
      kern: [
        "Die Netzadresse ist die erste Adresse eines Blocks: Alle Hostbits sind dort 0.",
        "Die Broadcastadresse ist die letzte Adresse eines Blocks: Alle Hostbits sind dort 1.",
        "Zwischen beiden liegen die nutzbaren Hostadressen: erste Hostadresse gleich Netzadresse plus 1, letzte Hostadresse gleich Broadcastadresse minus 1.",
        "Ein Block mit zwei Adressen für Netz und Broadcast hat Blockgröße minus 2 nutzbare Hosts.",
        "Netz- und Broadcastadresse dürfen bei /24 bis /30 nicht an einen Rechner vergeben werden; /31 ist nach RFC 3021 die Ausnahme, dort sind beide Adressen nutzbare Endpunkte.",
      ],
      merksatz: "Erste Adresse gleich Netz, letzte Adresse gleich Broadcast – dazwischen liegen die Hosts.",
      visuell: {art: "blocklineal", preset: {ip: "192.168.10.70", praefix: 26}},
      beispiel: [
        {
          titel: "192.168.10.70/26",
          aufgabe: "Bestimme Netzadresse, Broadcastadresse und die Hostspanne zu 192.168.10.70/26.",
          schritte: [
            {text: "Hostbits: 32 minus 26 ergibt 6; die Blockgröße ist 2 hoch 6 gleich 64.", ergebnis: "Blockgröße 64"},
            {text: "70 durch 64 teilen: 1 Rest 6; der Block beginnt bei 1 mal 64 gleich 64.", ergebnis: "Netzadresse 192.168.10.64"},
            {text: "Broadcastadresse: 64 plus 64 minus 1 gleich 127.", ergebnis: "192.168.10.127"},
            {text: "Erste Hostadresse 65, letzte Hostadresse 126.", ergebnis: "192.168.10.65 bis 192.168.10.126"},
            {text: "Nutzbare Hosts: 64 minus 2 gleich 62.", ergebnis: "62 Hosts"},
            {text: "Ergebnis zusammenfassen: Netzadresse, Broadcastadresse und Hostspanne gehören zusammen.", ergebnis: "Netz 192.168.10.64, Broadcast 192.168.10.127, Hosts 192.168.10.65 bis 192.168.10.126"},
          ],
          ergebnis: "Netz 192.168.10.64, Broadcast 192.168.10.127, Hosts 192.168.10.65 bis 192.168.10.126",
        },
        {
          titel: "192.168.10.30/28",
          aufgabe: "Bestimme Netzadresse, Broadcastadresse und die Zahl der nutzbaren Hosts zu 192.168.10.30/28.",
          schritte: [
            {text: "Blockgröße bei /28: 2 hoch 4 gleich 16.", ergebnis: "16 Adressen"},
            {text: "30 liegt im Block 16 bis 31; die Netzadresse ist 192.168.10.16.", ergebnis: "Netzadresse 192.168.10.16"},
            {text: "Broadcastadresse ist 16 plus 16 minus 1 gleich 31.", ergebnis: "192.168.10.31"},
            {text: "Hosts 17 bis 30, also 16 minus 2 gleich 14 nutzbare Adressen.", ergebnis: "14 Hosts"},
            {text: "Ergebnis zusammenfassen: Netzadresse, Broadcastadresse und nutzbare Hosts.", ergebnis: "Netz 192.168.10.16, Broadcast 192.168.10.31, 14 nutzbare Hosts"},
          ],
          ergebnis: "Netz 192.168.10.16, Broadcast 192.168.10.31, 14 nutzbare Hosts",
        },
      ],
      uebung: {arten: ["netzid", "broadcast"], niveau: "E", anzahl: 4},
      pruefung: {arten: ["netzid", "broadcast", "hosts"], niveau: "E", anzahl: 5, bestehen: 4},
      verweise: {wiki: "lab.subnetz", werkzeug: "blocklineal", training: "tr-subnetz-plan"},
      dauerMin: 10,
      quelle: "04-AP1-Netzwerk · Fragen – Subnetting · Network – Lernfassung (§ 8)",
    },
    {
      id: "schneiden", nr: 5, stufe: "AP1",
      titel: "Netze schneiden",
      kicker: "Stufe AP1 · Teilen",
      lead: "Du teilst ein vorhandenes Netz in gleich große Teilnetze und bestimmst zu jeder beliebigen Adresse die Netz-ID im neuen Raster.",
      kern: [
        "Ein Netz zu schneiden heißt: Du leihst dir Bits vom Hostanteil und machst daraus Netzbits.",
        "Ein /24 lässt sich in 4 Netze teilen, dann lautet der neue Präfix /26; jede zusätzliche Halbierung erhöht den Präfix um 1.",
        "Vier Netze brauchen 2 Leihbits, denn 2 hoch 2 ergibt 4; acht Netze brauchen 3 Leihbits, sechzehn Netze brauchen 4 Leihbits.",
        "Die Netz-IDs liegen danach im Raster der neuen Blockgröße: aus /24 werden bei /26 die Blöcke 0, 64, 128 und 192.",
        "Zu einer beliebigen Adresse bestimmst du die Netz-ID, indem du die Adresse durch die neue Blockgröße teilst.",
      ],
      merksatz: "Jede Halbierung erhöht den Präfix um 1 und halbiert die Blockgröße.",
      visuell: {art: "blocklineal", preset: {ip: "192.168.10.0", praefix: 24}},
      beispiel: [
        {
          titel: "192.168.10.0/24 in vier Netze",
          aufgabe: "Teile 192.168.10.0/24 in vier gleich große Netze.",
          schritte: [
            {text: "Vier Netze brauchen 2 Leihbits, weil 2 hoch 2 gleich 4 ist.", ergebnis: "2 Leihbits"},
            {text: "Neuer Präfix: 24 plus 2 ergibt 26.", ergebnis: "/26"},
            {text: "Neue Blockgröße: 2 hoch 6 gleich 64.", ergebnis: "64 Adressen je Netz"},
            {text: "Netz-IDs im letzten Oktett ablesen.", ergebnis: "192.168.10.0/26, .64/26, .128/26, .192/26"},
          ],
          ergebnis: "192.168.10.0/26, .64/26, .128/26, .192/26",
        },
        {
          titel: "Adresse 172.16.5.130/25",
          aufgabe: "Bestimme Netz-ID, Broadcastadresse und Hostspanne zu 172.16.5.130/25.",
          schritte: [
            {text: "Blockgröße bei /25 ist 2 hoch 7 gleich 128.", ergebnis: "128 Adressen"},
            {text: "130 durch 128 teilen: 1 Rest 2; der Block beginnt bei 128.", ergebnis: "172.16.5.128"},
            {text: "Broadcastadresse: 128 plus 128 minus 1 gleich 255.", ergebnis: "172.16.5.255"},
            {text: "Hosts 129 bis 254, also 126 nutzbare Adressen.", ergebnis: "126 Hosts"},
            {text: "Ergebnis zusammenfassen: Netz, Broadcast und Hostspanne im /25-Block.", ergebnis: "Netz 172.16.5.128, Broadcast 172.16.5.255, 126 nutzbare Hosts"},
          ],
          ergebnis: "Netz 172.16.5.128, Broadcast 172.16.5.255, 126 nutzbare Hosts",
        },
      ],
      uebung: {arten: ["netzid", "broadcast", "subnetze"], niveau: "AP1", anzahl: 5},
      pruefung: {arten: ["subnetze", "netzid", "broadcast"], niveau: "AP1", anzahl: 5, bestehen: 4},
      verweise: {wiki: "lab.subnetz", werkzeug: "blocklineal", training: "tr-subnetz-plan"},
      dauerMin: 10,
      quelle: "04-AP1-Netzwerk · Fragen – Subnetting · 07-Übungen-Subnetting-Szenarien · RFC 4632",
    },
    {
      id: "vlsm", nr: 6, stufe: "AP1",
      titel: "Adressplan (VLSM)",
      kicker: "Stufe AP1 · Planen",
      lead: "VLSM (Variable Length Subnet Masking) heißt: Netze unterschiedlicher Größe aus einem Vorrat planen. Du gehst vom größten Bedarf zum kleinsten und hältst eine Reserve frei.",
      kern: [
        "VLSM heißt: Netze unterschiedlicher Größe aus einem Adressvorrat planen; jede Abteilung bekommt nur so viele Adressen, wie sie braucht.",
        "Du planst vom größten Bedarf zum kleinsten, weil der große Block am wenigsten Spielraum hat.",
        "Zu jedem Bedarf rechnest du die kleinste Blockgröße, die den Bedarf samt Netz- und Broadcastadresse deckt.",
        "Die Blöcke werden aufsteigend im Adressvorrat verteilt; zwischen zwei Blöcken bleibt kein Loch, wenn du die Blockgrößen sauber aneinanderreihst.",
        "Am Ende notierst du die Reserve – der übrige Platz bleibt für spätere Erweiterungen.",
      ],
      merksatz: "VLSM plant vom größten zum kleinsten Bedarf – so bleibt am Ende die Reserve übrig.",
      visuell: {art: "rechner", preset: {ip: "192.168.100.0", praefix: 24}},
      beispiel: [
        {
          titel: "Drei VLANs aus 192.168.100.0/24",
          aufgabe: "Plane 192.168.100.0/24 für drei VLANs mit 100, 50 und 20 benötigten Hosts.",
          schritte: [
            {text: "Bedarfe absteigend sortieren: 100, 50, 20.", ergebnis: "100, 50, 20"},
            {text: "Kleinste passende Präfixe: 100 braucht /25 mit 126 Hosts, 50 braucht /26 mit 62 Hosts.", ergebnis: "/25 und /26"},
            {text: "Weiter: 20 braucht /27 mit 30 Hosts.", ergebnis: "/27"},
            {text: "Blöcke aufsteigend verteilen: .0/25, .128/26, .192/27.", ergebnis: "192.168.100.0/25, .128/26, .192/27"},
            {text: "Reserve ablesen: .224 bis .255 bleiben als ein /27 übrig.", ergebnis: "Reserve 192.168.100.224/27"},
            {text: "Plan aufschreiben: drei Blöcke absteigend geplant, aufsteigend verteilt, Reserve benannt.", ergebnis: "192.168.100.0/25, .128/26, .192/27; Reserve .224/27"},
          ],
          ergebnis: "192.168.100.0/25, .128/26, .192/27; Reserve .224/27",
        },
      ],
      uebung: {arten: ["vlsm", "hosts"], niveau: "AP1", anzahl: 5},
      pruefung: {arten: ["vlsm", "hosts", "subnetze"], niveau: "AP1", anzahl: 5, bestehen: 4},
      verweise: {wiki: "lab.subnetz", werkzeug: "vlsm", training: "tr-subnetz-plan"},
      dauerMin: 12,
      quelle: "Fragen – Subnetting · 07-Übungen-Subnetting-Szenarien · Network – Lernfassung (§ 8 Subnetting) · RFC 1918 · RFC 4632",
    },
    {
      id: "vlan", nr: 7, stufe: "AP1",
      titel: "VLAN und Subnetz",
      kicker: "Stufe AP1 · Trennen",
      lead: "Ein VLAN ist eine eigene Broadcast-Domäne und braucht deshalb ein eigenes Subnetz. Du ordnest Access-Ports zu und erkennst, wann ein Router zwischen VLANs vermitteln muss.",
      kern: [
        "Ein VLAN (Virtual Local Area Network) ist eine eigene Broadcast-Domäne; ein Broadcast bleibt in seinem VLAN und erreicht die anderen VLANs nicht.",
        "Weil jede Broadcast-Domäne ein eigenes Subnetz braucht, bekommt jedes VLAN eine eigene Netz-ID und ein eigenes Gateway.",
        "Ein Access-Port gehört zu genau einem VLAN – das Gerät an diesem Port merkt von den anderen VLANs nichts.",
        "Ein Trunk-Port trägt mehrere VLANs; die Frames bekommen nach IEEE 802.1Q ein Tag mit der VLAN-ID.",
        "Zwischen zwei VLANs vermittelt ein Router oder ein Layer-3-Switch; der Switch allein leitet nicht zwischen ihnen weiter.",
      ],
      merksatz: "Ein VLAN gleich eine Broadcast-Domäne gleich ein eigenes Subnetz.",
      visuell: {art: "vlan", preset: {niveau: "AP1"}},
      beispiel: [
        {
          titel: "Zwei VLANs, zwei Netze",
          aufgabe: "Port 3 liegt in VLAN 10 mit 192.168.10.0/24, Port 10 in VLAN 20 mit 192.168.20.0/24. Was brauchen die beiden PCs, um sich zu erreichen?",
          schritte: [
            {text: "Ports prüfen: Port 3 gehört zu VLAN 10, Port 10 gehört zu VLAN 20.", ergebnis: "zwei Broadcast-Domänen"},
            {text: "Netze prüfen: 192.168.10.0/24 und 192.168.20.0/24 sind verschiedene Subnetze.", ergebnis: "verschiedene Subnetze"},
            {text: "Folge: Der Switch leitet Frames nicht zwischen den VLANs weiter, eine Ping-Antwort bleibt aus.", ergebnis: "kein Weg über den Switch"},
            {text: "Lösung: Router oder Layer-3-Switch mit einem Bein je VLAN einsetzen.", ergebnis: "Router oder Layer-3-Switch zwischen den VLANs"},
          ],
          ergebnis: "Router oder Layer-3-Switch zwischen den VLANs",
        },
      ],
      uebung: {arten: ["vlan-port", "vlan-erreichbar"], niveau: "AP1", anzahl: 4},
      pruefung: {arten: ["vlan-erreichbar", "vlan-port"], niveau: "AP1", anzahl: 5, bestehen: 4},
      verweise: {wiki: "lab.vlan", werkzeug: "vlan", training: "tr-vlan-trennung"},
      dauerMin: 10,
      quelle: "VLAN – Lernfassung · IEEE 802.1Q · VLAN – Visuelle Lernnotiz",
    },
    {
      id: "pruefung", nr: 8, stufe: "AP2",
      titel: "Prüfungsfälle",
      kicker: "Stufe AP2 · Anwenden",
      lead: "Hier kommen die Fälle, die in der Abschlussprüfung typisch sind: /30 und /31, Zusammenfassen, Trunk und Native VLAN – immer mit Gegenprobe.",
      kern: [
        "Ein /30 hat vier Adressen: Netzadresse, zwei nutzbare Hosts und Broadcastadresse – er ist die klassische Wahl für Punkt-zu-Punkt-Strecken.",
        "Ein /31 hat nach RFC 3021 zwei Adressen, die beide als Endpunkte einer Punkt-zu-Punkt-Verbindung genutzt werden; Netz- und Broadcastadresse fallen dort weg.",
        "Beim Zusammenfassen fasst du mehrere benachbarte Netze zu einem größeren Block zusammen; die Netze müssen lückenlos aufeinander folgen und am Blockanfang ausgerichtet sein.",
        "Vier /24-Netze ab 192.168.0.0 ergeben zusammen ein /22 mit 1024 Adressen.",
        "Am Trunk prüfst du erlaubte VLAN-Liste, Tagging und Native VLAN; ein ungleiches Native VLAN schickt ungetaggte Frames in das falsche Netz.",
        "Typische Prüfungsfehler sind Netz- und Broadcastadresse als Hosts, verwechselte Maske und Wildcard sowie vom kleinsten Bedarf aus geplantes VLSM.",
      ],
      merksatz: "Prüfungsfälle immer mit der Blockgröße gegenrechnen – und bei /31 die RFC-3021-Ausnahme im Kopf behalten.",
      visuell: {art: "vlan", preset: {niveau: "AP2"}},
      beispiel: [
        {
          titel: "/30 für eine Punkt-zu-Punkt-Strecke",
          aufgabe: "Welche Adressen sind in einem /30-Block nutzbar, und wie viele Hosts bleiben?",
          schritte: [
            {text: "Hostbits: 32 minus 30 ergibt 2; die Blockgröße ist 2 hoch 2 gleich 4 Adressen.", ergebnis: "4 Adressen"},
            {text: "Die erste Adresse ist die Netzadresse, die letzte der Broadcast.", ergebnis: "2 reserviert"},
            {text: "Nutzbar bleiben die beiden Adressen dazwischen.", ergebnis: "2 Hosts"},
            {text: "Ergebnis festhalten: je /30 bleiben zwei nutzbare Hostadressen.", ergebnis: "2 nutzbare Hostadressen je /30"},
          ],
          ergebnis: "2 nutzbare Hostadressen je /30",
        },
        {
          titel: "/31 nach RFC 3021",
          aufgabe: "Warum hat ein /31 nach RFC 3021 zwei nutzbare Adressen?",
          schritte: [
            {text: "Bei /31 bleibt 1 Hostbit und damit 2 Adressen pro Block.", ergebnis: "2 Adressen"},
            {text: "Auf einer Punkt-zu-Punkt-Strecke braucht niemand eine Broadcastadresse; beide Adressen sind Endpunkte.", ergebnis: "keine Broadcastadresse nötig"},
            {text: "RFC 3021 erlaubt deshalb beide Adressen als Hostadressen.", ergebnis: "2 nutzbare Adressen"},
          ],
          ergebnis: "2 nutzbare Adressen",
        },
        {
          titel: "Vier /24 zu einem /22 zusammenfassen",
          aufgabe: "Fasse 192.168.0.0/24 bis 192.168.3.0/24 zu einem Netz zusammen.",
          schritte: [
            {text: "Prüfen: Die vier Netze folgen lückenlos aufeinander und beginnen am Blockanfang.", ergebnis: "zusammenfassbar"},
            {text: "Beim Zusammenfassen werden Netzbits wieder Hostbits: Der Präfix sinkt um 2, denn aus dem /22 werden umgekehrt vier /24, indem zwei Bits vom Host- in den Netzanteil wandern.", ergebnis: "/22"},
            {text: "Gegenprobe: 24 minus 2 ergibt 22; vier /24 entsprechen 2 hoch 2 Netzen.", ergebnis: "2 Netzbits weniger"},
            {text: "Blockgröße bei /22 ist 2 hoch 10 gleich 1024 Adressen.", ergebnis: "1024 Adressen"},
            {text: "Gemeinsame Netzadresse ist 192.168.0.0/22.", ergebnis: "192.168.0.0/22"},
          ],
          ergebnis: "192.168.0.0/22",
        },
      ],
      uebung: {
        arten: ["netzid", "broadcast", "block", "subnetze", "vlsm", "zusammenfassen", "vlan-erreichbar", "trunk"],
        niveau: "AP2", anzahl: 6,
      },
      pruefung: {
        arten: ["netzid", "broadcast", "block", "subnetze", "vlsm", "zusammenfassen", "vlan-erreichbar", "trunk"],
        niveau: "AP2", anzahl: 5, bestehen: 4,
      },
      verweise: {wiki: "lab.subnetz", werkzeug: "rechner", training: "tr-subnetz-plan"},
      dauerMin: 15,
      quelle: "RFC 3021 (/31) · RFC 1918 · IEEE 802.1Q · Fragen – Subnetting · 07-Übungen-Subnetting-Szenarien · 04-AP1-Netzwerk",
    },
  ],
};
