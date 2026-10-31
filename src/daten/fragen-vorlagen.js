"use strict";
/* ---------- Fragen-Vorlagen: parametrische Aufgaben mit eigener Rechenregel (task-18) ----------
   DATEN.fragenVorlagen[id] = {
     id, titel, skill, stufe, art:"wahl", quelle, platzhalter:[…],
     zahlen(z)        → die Parameter DIESER Frage aus dem Seed (Zufall aus src/kern/basis.js)
     frage(p)         → Aufgabentext mit eingesetzten Zahlen
     loesung(p)       → die richtige Antwort, AUSGERECHNET
     pruefe(p, text)  → rechnet nach, ob dieser Text die richtige Antwort ist (kein Vergleich mit loesung)
     ablenker(p)      → [{text, art}] plausible FALSCHE Antworten aus typischen Denkfehlern
     erklaerung(p)    → Begründung mit den Zahlen dieser Frage
   }

   WARUM DIE VORLAGE SELBST RECHNET. Es gibt keinen Menschen, der eine generierte Frage vorher
   liest. Deshalb steht die Rechenregel hier bei den Daten – nicht im Generator: `loesung` und
   `pruefe` rechnen den Wert UNABHÄNGIG voneinander aus, und `Spiel.fragen.erzeuge` nimmt eine Frage
   nur an, wenn genau EINE Option `pruefe` besteht. Stimmen die beiden Rechenwege nicht überein,
   entsteht keine Frage (statt einer falschen). Denselben Wert rechnet tests/fragen-generator.test.js
   mit EIGENER Bit-Arithmetik nach – drei Wege, ein Ergebnis.

   WARUM DIE ZAHLEN AUS DEM SEED KOMMEN. Der Vertrag des Projekts (AGENTS.md, Architektur § 7.1):
   offline, kein Server, deterministisch. Kein Math.random, kein Sprachmodell: derselbe Seed ergibt
   dieselbe Frage, ein anderer Seed andere Zahlen, andere Reihenfolge der Optionen.

   WARUM DIE FALSCHEN ANTWORTEN TYPISCHE DENKFEHLER SIND. Eine erfundene Zufallszahl wäre keine
   Prüfung, sondern Raten. Jeder Ablenker trägt deshalb eine `art` aus DATEN.fragenDenkfehler, und
   der Test rechnet nach, dass der Wert wirklich zu dieser Denkfehler-Familie gehört (Nachbarblock,
   Broadcast statt Host, Off-by-one, Wildcard statt Maske …). Punkte, Schrägstrich und Bindestrich
   sind Teil der Werte – verglichen wird der fertige Text.

   LÄNGENGRENZEN DER LEISTE (tests/daten-mini.test.js:21-25): Frage ≤ 140 Zeichen, Option ≤ 60,
   höchstens vier Optionen. Der Generator prüft das und lehnt zu lange Fragen ab.

   Quellen sind die `quelle`-Felder der Wiki-Seiten derselben Fertigkeit (gemessen am 09.10.2026).
   LF-Zeilenenden, kein DOM. */
DATEN.fragenVorlagen = (() => {
  const V = {};

  /* Die Denkfehler-Familien. Der Test kennt genau diese Liste und rechnet je Familie nach; ein
     neuer Ablenker ohne Eintrag hier fällt im Test auf, statt still durchzurutschen. */
  DATEN.fragenDenkfehler = [
    "nachbar-block",        /* die Netzadresse des Blocks davor oder danach */
    "naechstes-netz",       /* die erste Adresse des nächsten Blocks */
    "netzadresse",          /* die Netzadresse statt der gesuchten Adresse */
    "broadcast",            /* die Broadcastadresse statt einer Hostadresse */
    "letzte-hostadresse",   /* die letzte nutzbare Adresse statt der Broadcastadresse */
    "host-adresse",         /* die eigene Adresse statt der Netz-/Broadcastadresse */
    "eigene-adresse",       /* die eigene IP, obwohl ein anderes Gerät gefragt ist */
    "ohne-abzug",           /* Netz- und Broadcastadresse nicht abgezogen (2^n statt 2^n − 2) */
    "ohne-einen-abzug",     /* nur die Netzadresse abgezogen */
    "nachbar-praefix",      /* die Hostzahl des Nachbarpräfixes */
    "falscher-praefix",     /* eine gültige Maske mit einem anderen Präfix */
    "umgedrehter-praefix",  /* 32 − p als Präfixlänge */
    "zaehlfehler",          /* eine Eins daneben */
    "off-by-one",           /* ein Schritt daneben */
    "ttl-unveraendert",     /* die TTL bleibt angeblich gleich */
    "wildcard-statt-maske", /* Wildcard und Maske verwechselt */
    "maske-statt-wildcard", /* Maske und Wildcard verwechselt */
    "ungeteiltes-netz",     /* die Maske vor der Aufteilung */
    "dienst-vertauscht",    /* der Port eines anderen Dienstes */
    "falsche-seite",        /* Ziel und Gateway vertauscht (ARP) */
    /* Welle 2 · S5 (Architektur § 17.4): Familien der neun neuen Vorlagen. */
    "falsche-adressfamilie",/* A statt AAAA oder umgekehrt (v4/v6 verwechselt) */
    "falsche-richtung",     /* Hin- und Rückauflösung verwechselt (PTR statt A) */
    "syn-nicht-gezaehlt",   /* das SYN als Byte vergessen */
    "ohne-vlan",            /* System-ID-Anteil (VLAN) der Bridge-ID vergessen */
    "falsche-prioritaet",   /* Priorität mit 4096 verrechnet statt VLAN addiert */
    "ohne-paritaet",        /* RAID ohne Paritätsplatte gerechnet */
    "eine-platte",          /* nur eine Platte als Nutzkapazität */
    "nur-obergrenze",       /* nur die obere Portgrenze als Anzahl */
    "falsche-regel",        /* eine andere Regel der Liste gewählt */
    "implizites-deny",      /* Standard-deny übersehen, obwohl eine Regel passt */
    "falscher-modus",       /* falscher IOS-Modus nach dem Befehl */
    "falsche-ebene",        /* eine Ebene zu hoch oder zu tief */
  ];

  const neu = o => { V[o.id] = Object.assign({art: "wahl", platzhalter: []}, o); };

  /* ---------- Rechen-Helfer (dieselben Wege wie src/kern/netz.js, hier lesbar benannt) ---------- */
  const zz = ip => IP.zuZahl(ip);
  const zt = n => IP.zuText(n >>> 0);
  const groesse = p => Math.pow(2, 32 - p);                 /* Adressen je Block */
  const hostZahl = p => Math.pow(2, 32 - p) - 2;            /* nutzbare Hosts */
  const netzVon = (ip, maske) => zt(zz(ip) & zz(maske));
  const broadcastVon = (ip, maske) => zt((zz(ip) & zz(maske)) | (~zz(maske) >>> 0));
  const weiter = (ip, k) => zt(zz(ip) + k);

  /* Ein privates Netz als Blockanfang – dieselben Bereiche wie in den Beispielnetzen. */
  const netzBasis = z => {
    const a = z.zwischen(1, 30), b = z.zwischen(1, 30);
    return z.wahl(["192.168." + a + ".0", "10." + a + "." + b + ".0", "172." + (16 + a % 12) + "." + b + ".0", "10.10." + a + ".0"]);
  };
  /* Eine gültige Hostadresse in diesem Block (nicht Netz-, nicht Broadcastadresse). */
  const adresseImBlock = (z, p) => {
    const basis = netzBasis(z), g = groesse(p);
    return {ip: weiter(basis, 1 + z.zahl(g - 2)), netz: basis, p, maske: IP.maske(p), groesse: g};
  };

  /* ---------- Netzadresse ---------- */
  neu({id: "netzadresse", titel: "Netzadresse aus Adresse und Präfix", skill: "lab.subnetz", stufe: "E", quelle: "04-AP1-Netzwerk",
    platzhalter: ["ip", "p"],
    zahlen: z => adresseImBlock(z, z.wahl([25, 26, 27, 28, 29, 30])),
    frage: p => `Wie lautet die Netzadresse von ${p.ip}/${p.p}?`,
    loesung: p => netzVon(p.ip, p.maske),
    pruefe: (p, t) => { const n = zz(String(t).trim()); return n !== null && n === ((zz(p.ip) & zz(p.maske)) >>> 0); },
    ablenker: p => [
      {text: weiter(p.netz, p.groesse), art: "nachbar-block"},
      {text: weiter(p.netz, -p.groesse), art: "nachbar-block"},
      {text: broadcastVon(p.ip, p.maske), art: "broadcast"},
      {text: p.ip, art: "host-adresse"},
    ],
    erklaerung: p => `Die Netzadresse ist die erste Adresse des Blocks: Adresse und Maske Bit für Bit verknüpft, alle Hostbits werden 0. ${p.ip} liegt im Block ${p.netz} bis ${broadcastVon(p.ip, p.maske)} – das sind ${p.groesse} Adressen.`});

  /* ---------- Broadcastadresse ---------- */
  neu({id: "broadcastadresse", titel: "Broadcastadresse aus Adresse und Präfix", skill: "lab.subnetz", stufe: "AP1", quelle: "04-AP1-Netzwerk",
    platzhalter: ["ip", "p"],
    zahlen: z => adresseImBlock(z, z.wahl([25, 26, 27, 28, 29, 30])),
    frage: p => `Wie lautet die Broadcastadresse von ${p.ip}/${p.p}?`,
    loesung: p => broadcastVon(p.ip, p.maske),
    pruefe: (p, t) => { const n = zz(String(t).trim()); return n !== null && n === (((zz(p.ip) & zz(p.maske)) | (~zz(p.maske) >>> 0)) >>> 0); },
    ablenker: p => [
      {text: p.netz, art: "netzadresse"},
      {text: weiter(broadcastVon(p.ip, p.maske), -1), art: "letzte-hostadresse"},
      {text: weiter(p.netz, p.groesse), art: "naechstes-netz"},
      {text: p.ip, art: "host-adresse"},
    ],
    erklaerung: p => `Die Broadcastadresse ist die letzte Adresse des Blocks: alle Hostbits auf 1. Bei /${p.p} sind das ${p.groesse} Adressen – ${p.groesse} − 2 davon sind nutzbare Hosts, weil Netz- und Broadcastadresse wegfallen.`});

  /* ---------- Nutzbare Hosts ---------- */
  neu({id: "hostanzahl", titel: "Nutzbare Hosts eines Präfixes", skill: "lab.subnetz", stufe: "AP1", quelle: "04-AP1-Netzwerk",
    platzhalter: ["netz", "p"],
    zahlen: z => { const p = z.wahl([26, 27, 28, 29, 30]); return {netz: netzBasis(z), p, groesse: groesse(p), hosts: hostZahl(p)}; },
    frage: p => `Das Netz ${p.netz}/${p.p} soll geplant werden. Wie viele nutzbare Hostadressen hat es?`,
    loesung: p => String(hostZahl(p.p)),
    pruefe: (p, t) => { const n = Number(String(t).trim()); return Number.isInteger(n) && n === Math.pow(2, 32 - p.p) - 2; },
    ablenker: p => [
      {text: String(p.groesse), art: "ohne-abzug"},
      {text: String(p.groesse - 1), art: "ohne-einen-abzug"},
      {text: String(hostZahl(p.p - 1)), art: "nachbar-praefix"},
    ],
    erklaerung: p => `Ein /${p.p}-Block hat ${p.groesse} Adressen (2 hoch ${32 - p.p}). Netz- und Broadcastadresse sind keine Hosts, also bleiben ${p.groesse} − 2 = ${hostZahl(p.p)} nutzbare Adressen.`});

  /* ---------- Maske zum Präfix ---------- */
  neu({id: "maske-aus-praefix", titel: "Subnetzmaske zu einem Präfix", skill: "lab.ip", stufe: "E", quelle: "Network – Lernfassung",
    platzhalter: ["ip", "p"],
    zahlen: z => adresseImBlock(z, z.wahl([24, 25, 26, 27, 28, 29, 30])),
    frage: p => `Der Rechner ${p.ip}/${p.p} meldet sich im Netz. Welche Subnetzmaske trägt er?`,
    loesung: p => IP.maske(p.p),
    pruefe: (p, t) => { const s = String(t).trim(); return IP.maskeGueltig(s) && IP.praefix(s) === p.p; },
    ablenker: p => [
      {text: IP.wildcard(IP.maske(p.p)), art: "wildcard-statt-maske"},
      {text: IP.maske(p.p + 1), art: "falscher-praefix"},
      {text: IP.maske(p.p - 1), art: "falscher-praefix"},
    ],
    erklaerung: p => `Ein /${p.p} heißt: die ersten ${p.p} Bits sind 1. Von links aufgefüllt ergibt das ${IP.maske(p.p)}. Die Wildcard ${IP.wildcard(IP.maske(p.p))} ist das Spiegelbild und gehört in ACLs, nicht in die Netzwerkkarte.`});

  /* ---------- Präfix zur Maske ---------- */
  neu({id: "praefix-aus-maske", titel: "Präfixlänge zu einer Maske", skill: "lab.ip", stufe: "AP1", quelle: "Network – Lernfassung",
    platzhalter: ["netz", "maske"],
    zahlen: z => { const p = z.wahl([24, 25, 26, 27, 28, 29, 30]); return {netz: netzBasis(z), p, maske: IP.maske(p)}; },
    frage: p => `Für das Netz ${p.netz} ist die Maske ${p.maske} eingetragen. Wie lautet die Präfixlänge?`,
    loesung: p => String(p.p),
    pruefe: (p, t) => { const n = Number(String(t).trim().replace(/^\//, "")); return Number.isInteger(n) && n === IP.praefix(p.maske); },
    ablenker: p => [
      {text: String(p.p - 1), art: "zaehlfehler"},
      {text: String(p.p + 1), art: "zaehlfehler"},
      {text: String(32 - p.p), art: "umgedrehter-praefix"},
    ],
    erklaerung: p => `Die Präfixlänge zählt die Einsen von links: ${p.maske} hat ${p.p} Einsen, also /${p.p}. ${32 - p.p} wäre die Zahl der Nullen – die Wildcard-Länge, nicht das Präfix.`});

  /* ---------- Wildcard für eine ACL ---------- */
  neu({id: "wildcard-maske", titel: "Wildcard-Maske für eine ACL", skill: "lab.acl", stufe: "AP2", quelle: "Infrastruktur & Sicherheit – Visuelle Lernnotiz",
    platzhalter: ["netz", "p"],
    zahlen: z => { const p = z.wahl([24, 25, 26, 27, 28]); return {netz: netzBasis(z), p, maske: IP.maske(p)}; },
    frage: p => `Eine ACL soll genau das Netz ${p.netz}/${p.p} erfassen. Welche Wildcard-Maske gehört dazu?`,
    loesung: p => IP.wildcard(IP.maske(p.p)),
    pruefe: (p, t) => { const n = zz(String(t).trim()); return n !== null && n === ((~zz(IP.maske(p.p))) >>> 0); },
    ablenker: p => [
      {text: IP.maske(p.p), art: "maske-statt-wildcard"},
      {text: IP.wildcard(IP.maske(p.p + 1)), art: "falscher-praefix"},
      {text: IP.wildcard(IP.maske(p.p - 1)), art: "falscher-praefix"},
    ],
    erklaerung: p => `In einer ACL heißt Bit 1: dieses Bit ist egal. Die Wildcard ist das Spiegelbild der Maske – ${IP.maske(p.p)} wird zu ${IP.wildcard(IP.maske(p.p))}. Wer beide verwechselt, lässt die falschen Adressen durch.`});

  /* ---------- Letzte nutzbare Hostadresse ---------- */
  neu({id: "letzter-host", titel: "Letzte nutzbare Hostadresse", skill: "lab.netz", stufe: "AP1", quelle: "Network – Lernfassung",
    platzhalter: ["ip", "p"],
    zahlen: z => adresseImBlock(z, z.wahl([25, 26, 27, 28, 29, 30])),
    frage: p => `Wie lautet die letzte nutzbare Hostadresse im Netz von ${p.ip}/${p.p}?`,
    loesung: p => weiter(broadcastVon(p.ip, p.maske), -1),
    pruefe: (p, t) => { const n = zz(String(t).trim()); const bc = (zz(p.ip) & zz(p.maske)) | (~zz(p.maske) >>> 0); return n !== null && n === ((bc - 1) >>> 0); },
    ablenker: p => [
      {text: broadcastVon(p.ip, p.maske), art: "broadcast"},
      {text: p.netz, art: "netzadresse"},
      {text: weiter(p.netz, p.groesse), art: "naechstes-netz"},
      {text: p.ip, art: "host-adresse"},
    ],
    erklaerung: p => `Zwischen Netzadresse (${p.netz}) und Broadcastadresse (${broadcastVon(p.ip, p.maske)}) liegen die Hosts. Die letzte nutzbare ist die Broadcastadresse minus 1 – sie selbst ist kein Host.`});

  /* ---------- ARP: nach welcher IP wird gefragt? ---------- */
  neu({id: "arp-ziel", titel: "Nach welcher IP fragt ARP?", skill: "lab.arp", stufe: "AP1", quelle: "Network – Lernfassung",
    platzhalter: ["ip", "p", "ziel"],
    zahlen: z => {
      const a = adresseImBlock(z, z.wahl([24, 25, 26, 27, 28])), g = a.groesse;
      const offIp = 1 + z.zahl(g - 2);
      const ohneIp = [];
      for (let i = 1; i <= g - 2; i++) if (i !== offIp) ohneIp.push(i);
      const ip = weiter(a.netz, offIp), gw = weiter(a.netz, ohneIp[z.zahl(ohneIp.length)]);
      const eigenerRest = ohneIp.filter(i => weiter(a.netz, i) !== gw);
      const imNetz = z.kommazahl() < 0.5;
      const ziel = imNetz ? weiter(a.netz, eigenerRest[z.zahl(eigenerRest.length)]) : z.wahl(["198.51.100.10", "203.0.113.7", "8.8.8.8", "1.1.1.1"]);
      return {ip, netz: a.netz, p: a.p, maske: a.maske, groesse: g, gw, ziel, gleich: IP.gleichesNetz(ziel, ip, a.maske)};
    },
    frage: p => `PC ${p.ip}/${p.p} (Gateway ${p.gw}) will ${p.ziel} erreichen. Nach welcher IP fragt er per ARP?`,
    loesung: p => IP.gleichesNetz(p.ziel, p.ip, p.maske) ? p.ziel : p.gw,
    pruefe: (p, t) => { const s = String(t).trim(); return s === (IP.gleichesNetz(p.ziel, p.ip, p.maske) ? p.ziel : p.gw); },
    ablenker: p => [
      {text: IP.gleichesNetz(p.ziel, p.ip, p.maske) ? p.gw : p.ziel, art: "falsche-seite"},
      {text: broadcastVon(p.ip, p.maske), art: "broadcast"},
      {text: p.ip, art: "eigene-adresse"},
    ],
    erklaerung: p => `ARP arbeitet nur im eigenen Netz. ${p.ziel} liegt ${IP.gleichesNetz(p.ziel, p.ip, p.maske) ? "im selben Netz – also wird direkt danach gefragt" : "in einem anderen Netz – also wird nach der MAC des Gateways " + p.gw + " gefragt"}.`});

  /* ---------- Standardport eines Dienstes ---------- */
  neu({id: "port-eines-dienstes", titel: "Standardport eines Dienstes", skill: "lab.ports", stufe: "E", quelle: "04-AP1-Netzwerk",
    platzhalter: ["dienst", "host"],
    zahlen: z => {
      const liste = DIENSTE();
      const i = z.zahl(liste.length);
      return {dienst: liste[i][0], port: liste[i][1], host: z.wahl(HOSTS()),
        andere: z.mischen(liste.filter((d, k) => k !== i)).slice(0, 3).map(d => d[1])};
    },
    frage: p => `Auf ${p.host} läuft der Dienst ${p.dienst}. Auf welchem Port ist er standardmäßig erreichbar?`,
    loesung: p => String(p.port),
    pruefe: (p, t) => { const n = Number(String(t).trim()); return Number.isInteger(n) && n === p.port; },
    ablenker: p => p.andere.map(port => ({text: String(port), art: "dienst-vertauscht"})).concat([{text: String(p.port + 1), art: "off-by-one"}]),
    erklaerung: p => `${p.dienst} ist standardmäßig über Port ${p.port} erreichbar. Die anderen Zahlen gehören zu anderen Diensten – wer Ports verwechselt, öffnet an der Firewall die falsche Tür.`});

  /* Dienst-Tabelle und Hostnamen: eigene Funktionen, damit sie nicht bei jedem Aufruf neu entstehen. */
  function DIENSTE(){ return [["HTTP", 80], ["HTTPS", 443], ["SSH", 22], ["SMB (Dateifreigabe)", 445], ["DNS", 53], ["DHCP-Server", 67], ["RDP", 3389], ["SMTP", 25]]; }
  function HOSTS(){ return ["srv-01", "srv-07", "nas-2", "web-1", "fileserver", "gateway", "pc-14", "drucker-3"]; }

  /* ---------- TTL nach mehreren Routern ---------- */
  neu({id: "ttl-unterwegs", titel: "TTL nach mehreren Routern", skill: "lab.ttl", stufe: "AP2", quelle: "Network – Lernfassung",
    platzhalter: ["ziel", "n", "k"],
    zahlen: z => { const n = z.wahl([32, 64, 128, 255]); return {n, k: z.zwischen(2, 6), ziel: z.wahl(["198.51.100.10", "203.0.113.7", "10.1.5.9", "172.16.4.20", "8.8.8.8"])}; },
    frage: p => `Ein Paket zu ${p.ziel} startet mit TTL ${p.n} und läuft über ${p.k} Router. Mit welcher TTL kommt es an?`,
    loesung: p => String(p.n - p.k),
    pruefe: (p, t) => { const n = Number(String(t).trim()); return Number.isInteger(n) && n === p.n - p.k; },
    ablenker: p => [
      {text: String(p.n), art: "ttl-unveraendert"},
      {text: String(p.n - p.k + 1), art: "off-by-one"},
      {text: String(p.n - p.k - 1), art: "off-by-one"},
    ],
    erklaerung: p => `Jeder Router zieht 1 ab, bevor er weiterschickt: ${p.n} − ${p.k} = ${p.n - p.k}. Bei 0 wird das Paket verworfen und der Absender bekommt eine Meldung – die TTL ist ein Lebenszähler, keine Uhr.`});

  /* ---------- Netzgröße je VLAN: Hosts je VLAN bestimmen den Präfix (VLSM-Denken) ----------
     Befund § 10 Nr. 1 (Runde 7): Die alte Frage „/24 auf n VLANs, jedes gleich groß" lehrte das
     falsche Planungsmodell – in Wirklichkeit hat jedes VLAN einen eigenen Bedarf und bekommt den
     KLEINSTEN Präfix, der ihn deckt. Der Denkfehler wird hier zum Ablenker: das ungeteilte /24
     „reicht ja auch", ist aber nicht die kleinste Maske. */
  neu({id: "vlan-netzgroesse", titel: "Netzgröße je VLAN", skill: "lab.vlan", stufe: "AP2",
    quelle: "VLAN – Lernfassung · Network – Lernfassung (§ 8 Subnetting) · RFC 4632",
    platzhalter: ["vlan", "hosts"],
    zahlen: z => {
      const hosts = z.wahl([10, 20, 25, 30, 40, 50, 60, 100]);
      const p = 32 - Math.ceil(Math.log2(hosts + 2));
      return {vlan: z.zwischen(10, 99), hosts, p, maske: IP.maske(p), block: Math.pow(2, 32 - p)};
    },
    frage: p => `Im VLAN ${p.vlan} brauchen ${p.hosts} Hosts eine Adresse. Welche Maske ist die kleinste, die reicht?`,
    loesung: p => IP.maske(p.p),
    pruefe: (p, t) => {
      const s = String(t).trim();
      return IP.maskeGueltig(s) && IP.praefix(s) === 32 - Math.ceil(Math.log2(p.hosts + 2));
    },
    ablenker: p => [
      {text: IP.maske(24), art: "ungeteiltes-netz"},          /* ein /24 je VLAN: reicht, ist aber nicht die kleinste */
      {text: IP.maske(p.p + 1), art: "falscher-praefix"},    /* ein Präfix zu groß: zu wenige Hosts */
      {text: IP.maske(p.p + 2), art: "falscher-praefix"},    /* zwei Präfixe zu groß */
    ],
    erklaerung: p => `Nutzbar sind 2 hoch Hostbits minus 2 Adressen. ${p.hosts} Hosts brauchen den Block mit ${p.block} Adressen: Bei /${p.p} bleiben ${p.block - 2} nutzbare Hosts, bei /${p.p + 1} wären es nur ${Math.pow(2, 31 - p.p) - 2}, das reicht nicht. Das ungeteilte /24 hätte ${Math.pow(2, 32 - 24) - 2} Hosts und verschenkte Platz. Die kleinste Maske, die reicht, ist ${IP.maske(p.p)}.`});


  /* ---------- Welle 2 · S5: neun Vorlagen (Architektur § 17.4, 20 Vorlagen / 17 Fertigkeiten) ----------
     Gleiche Bauform wie oben: zahlen() zieht die Parameter aus dem Seed, loesung() und pruefe() rechnen
     unabhängig, jeder Ablenker trägt eine Denkfehler-Familie aus DATEN.fragenDenkfehler. */
  const TYPEN_DNS = ["A", "AAAA", "MX", "PTR"];
  const ARTEN_DNS = {
    A:    {AAAA: "falsche-adressfamilie", MX: "dienst-vertauscht", PTR: "falsche-richtung"},
    AAAA: {A: "falsche-adressfamilie", MX: "dienst-vertauscht", PTR: "falsche-richtung"},
    MX:   {A: "dienst-vertauscht", AAAA: "dienst-vertauscht", PTR: "falsche-richtung"},
    PTR:  {A: "falsche-richtung", AAAA: "falsche-adressfamilie", MX: "dienst-vertauscht"},
  };
  const NAMEN_DNS = ["server-01.buero.local", "mail-2.firma.local", "nas-3.lager.local", "drucker-4.etage.local",
    "web-5.kunde.de", "vpn-6.standort.local", "db-7.rechenzentrum.local", "proxy-8.filiale.local",
    "kamera-9.halle.local", "router-10.zentrale.local", "fileserver-11.schule.local", "portal-12.praxis.local"];
  const PORTS_FW = ["80", "443", "22", "3389", "25"];
  const CLI_FAELLE = [
    {modus: "Anwender-Modus", von: "user", cmd: "enable", nach: "priv"},
    {modus: "Privileg-Modus", von: "priv", cmd: "configure terminal", nach: "config"},
    {modus: "Konfigurationsmodus", von: "config", cmd: "interface Gi0/1", nach: "if"},
    {modus: "Schnittstellenmodus", von: "if", cmd: "exit", nach: "config"},
    {modus: "Konfigurationsmodus", von: "config", cmd: "exit", nach: "priv"},
    {modus: "Privileg-Modus", von: "priv", cmd: "disable", nach: "user"},
  ];
  const CLI_NAMEN = ["Router-1", "Switch-2", "Router-3", "Switch-4", "Router-7", "Switch-8", "Router-9", "Switch-10", "Router-11", "Switch-12"];
  const cliPrompt = (name, stufe) => stufe === "user" ? name + ">" : stufe === "priv" ? name + "#" :
    stufe === "config" ? name + "(config)#" : name + "(config-if)#";

  /* Standardgateway: die erste Hostadresse im Netz. */
  neu({id: "gateway-adresse", titel: "Standardgateway im Netz", skill: "lab.gateway", stufe: "E", quelle: "Network – Lernfassung (§ 9 Gateway)",
    platzhalter: ["netz", "p", "ip"],
    zahlen: z => { const a = adresseImBlock(z, z.wahl([24, 25, 26, 27, 28, 29])); return {netz: a.netz, p: a.p, maske: a.maske, ip: a.ip, gw: weiter(a.netz, 1), bc: broadcastVon(a.ip, a.maske), zwei: weiter(a.netz, 2)}; },
    frage: p => `Der Rechner ${p.ip}/${p.p} im Netz ${p.netz} braucht ein Standardgateway. Welche Adresse ist im Netz üblich?`,
    loesung: p => p.gw,
    pruefe: (p, t) => { const n = zz(String(t).trim()); return n !== null && n === zz(p.gw); },
    ablenker: p => [{text: p.netz, art: "netzadresse"}, {text: p.bc, art: "broadcast"}, {text: p.zwei, art: "off-by-one"}],
    erklaerung: p => `Das Gateway ist ein Host im selben Netz; die Konvention ist die erste Hostadresse: Netzadresse + 1 = ${p.gw}. ${p.netz} ist die Netzadresse und nicht vergebbar, ${p.bc} ist der Broadcast. ${p.zwei} wäre eine andere Hostadresse – möglich, aber nicht die übliche.`});

  /* DHCP: ein Bereich von Start bis Ende; jede Adresse darin ist vergebbar. */
  neu({id: "dhcp-pool-groesse", titel: "Größe eines DHCP-Bereichs", skill: "lab.dhcp", stufe: "AP1", quelle: "Network – Lernfassung (§ 9 DORA) · RFC 2131",
    platzhalter: ["start", "ende"],
    zahlen: z => { const a = adresseImBlock(z, 24); const s = z.zwischen(20, 150), len = z.zwischen(20, 80); return {netz: a.netz, start: weiter(a.netz, s), ende: weiter(a.netz, s + len - 1), len}; },
    frage: p => `Der DHCP-Bereich reicht von ${p.start} bis ${p.ende}. Wie viele Adressen kann der Server aus diesem Bereich vergeben?`,
    loesung: p => String(p.len),
    pruefe: (p, t) => { const n = Number(String(t).trim()); return Number.isInteger(n) && n === p.len; },
    ablenker: p => [{text: String(p.len - 1), art: "off-by-one"}, {text: String(p.len + 1), art: "off-by-one"}, {text: String(255 - p.len), art: "zaehlfehler"}],
    erklaerung: p => `Von ${p.start} bis ${p.ende} sind es ${p.len} Adressen (Ende − Start + 1). Alle liegen im DHCP-Bereich und sind vergebbar; die Netz- und Broadcastadresse des /24 liegen außerhalb. ${p.len - 1} vergisst den ersten Tag, ${p.len + 1} zählt einen Tag zu viel.`});

  /* DNS: welcher Eintragstyp beantwortet welche Frage? */
  neu({id: "dns-eintragstyp", titel: "DNS-Eintragstyp wählen", skill: "lab.dns", stufe: "AP1", quelle: "Network – Lernfassung (§ 9 DNS) · RFC 1034 · RFC 1035",
    platzhalter: ["name"],
    zahlen: z => { const typen = TYPEN_DNS, variant = z.zahl(typen.length); return {variant, name: z.wahl(NAMEN_DNS), typ: typen[variant]}; },
    frage: p => ["Welcher Eintragstyp liefert zu einem Namen die IPv4-Adresse?",
      "Welcher Eintragstyp liefert zu einem Namen die IPv6-Adresse?",
      "Welcher Eintragstyp nennt den Mailserver eines Namens?",
      "Welcher Eintragstyp löst eine IP-Adresse zurück zu einem Namen auf?"][p.variant] + ` (Beispiel: ${p.name})`,
    loesung: p => p.typ,
    pruefe: (p, t) => String(t).trim() === p.typ,
    ablenker: p => Object.entries(ARTEN_DNS[p.typ]).map(([text, art]) => ({text, art})),
    erklaerung: p => `Für diese Frage ist ${p.typ} der passende Typ. A liefert IPv4-Adressen, AAAA IPv6-Adressen, MX den Mailserver, PTR die Rückauflösung von Adresse zu Name – wer die Typen verwechselt, fragt am Ziel vorbei.`});

  /* TCP: das SYN verbraucht eine Sequenznummer, die ACK-Nummer zeigt auf das nächste Byte. */
  neu({id: "tcp-ack-nummer", titel: "ACK-Nummer nach dem Handshake", skill: "lab.tcp", stufe: "AP2", quelle: "TCP – Lernfassung (§ 2 Aufbau mit Nummern) · RFC 9293",
    platzhalter: ["isn", "nbytes"],
    zahlen: z => ({isn: z.zwischen(1000, 90000), nbytes: z.zwischen(500, 5000)}),
    frage: p => `Das SYN trug die Sequenznummer ${p.isn}. Im ersten Segment kommen ${p.nbytes} Datenbytes. Welche ACK-Nummer bestätigt der Server?`,
    loesung: p => String(p.isn + p.nbytes + 1),
    pruefe: (p, t) => { const n = Number(String(t).trim()); return Number.isInteger(n) && n === p.isn + p.nbytes + 1; },
    ablenker: p => [{text: String(p.isn + p.nbytes), art: "syn-nicht-gezaehlt"}, {text: String(p.isn + p.nbytes + 2), art: "off-by-one"}, {text: String(p.isn + 1), art: "zaehlfehler"}],
    erklaerung: p => `Das SYN zählt als ein Byte: erwartet wird ab ${p.isn + 1}, plus ${p.nbytes} Datenbytes, also ${p.isn + p.nbytes + 1}. ${p.isn + p.nbytes} vergisst das SYN, ${p.isn + 1} ignoriert die Daten.`});

  /* STP: die Bridge-ID enthält Priorität plus System-ID (VLAN). */
  neu({id: "stp-bridge-id", titel: "Bridge-ID aus Priorität und VLAN", skill: "lab.stp", stufe: "AP2", quelle: "IEEE 802.1D · Fragen – Netzwerke planen (Wozu STP?)",
    platzhalter: ["prio", "vid"],
    zahlen: z => ({prio: z.wahl([4096, 8192, 16384, 24576, 32768]), vid: z.zwischen(1, 100)}),
    frage: p => `Ein Switch hat die Priorität ${p.prio}, das VLAN ist ${p.vid}. Welchen Prioritätswert zeigt „show spanning-tree“ in der Bridge-ID?`,
    loesung: p => String(p.prio + p.vid),
    pruefe: (p, t) => { const n = Number(String(t).trim()); return Number.isInteger(n) && n === p.prio + p.vid; },
    ablenker: p => [{text: String(p.prio), art: "ohne-vlan"}, {text: String(p.prio + p.vid + 1), art: "zaehlfehler"}, {text: String(p.prio + 4096), art: "falsche-prioritaet"}],
    erklaerung: p => `Die Bridge-ID setzt sich aus Priorität und System-ID zusammen; die System-ID enthält die VLAN-Nummer. ${p.prio} + ${p.vid} = ${p.prio + p.vid}. ${p.prio} vergisst das VLAN, ${p.prio + 4096} verwechselt die VLAN-Nummer mit einem Prioritätsschritt.`});

  /* Storage: RAID 5 verliert eine Platte an Parität, RAID 6 zwei. */
  neu({id: "storage-raid-nutz", titel: "Nutzbare Kapazität eines RAID", skill: "lab.storage", stufe: "AP2", quelle: "SNIA Dictionary (RAID) · BSI IT-Grundschutz-Kompendium, CON.3 Datensicherungskonzept",
    platzhalter: ["level", "n", "groesse"],
    zahlen: z => { const level = z.wahl([5, 6]), n = z.zwischen(4, 8), groesse = z.wahl([1, 2, 3, 4, 6, 8, 10, 12]); return {level, n, groesse, nutz: (level === 5 ? n - 1 : n - 2) * groesse}; },
    frage: p => `Ein RAID ${p.level} aus ${p.n} Platten zu je ${p.groesse} TB. Wie viel Nutzkapazität steht zur Verfügung?`,
    loesung: p => `${p.nutz} TB`,
    pruefe: (p, t) => { const m = String(t).trim().match(/^(\d+)\s*TB$/i); return !!m && Number(m[1]) === p.nutz; },
    ablenker: p => [{text: `${p.n * p.groesse} TB`, art: "ohne-paritaet"}, {text: `${p.nutz + (p.level === 5 ? -p.groesse : p.groesse)} TB`, art: "zaehlfehler"}, {text: `${p.groesse} TB`, art: "eine-platte"}],
    erklaerung: p => `Bei RAID ${p.level} gehen ${p.level === 5 ? "eine Platte" : "zwei Platten"} für die Parität verloren: (${p.n} − ${p.level === 5 ? 1 : 2}) × ${p.groesse} TB = ${p.nutz} TB. ${p.n * p.groesse} TB sind die Rohkapazität, ${p.groesse} TB wäre nur eine Platte.`});

  /* NAT/PAT: der Portbereich einer öffentlichen Adresse begrenzt die gleichzeitigen Verbindungen. */
  neu({id: "nat-pat-portbereich", titel: "Wie viele PAT-Verbindungen passen?", skill: "lab.nat", stufe: "AP2", quelle: "Cisco IOS NAT Configuration Guide · RFC 3022 · Network – Lernfassung (§ 7)",
    platzhalter: ["von", "bis"],
    zahlen: z => { const von = z.wahl([1024, 2048, 4096, 8192, 10240, 16384]); const bis = z.zwischen(50000, 65535); return {von, bis, len: bis - von + 1}; },
    frage: p => `PAT vergibt Ports von ${p.von} bis ${p.bis}. Wie viele gleichzeitige Verbindungen kann eine öffentliche Adresse damit unterscheiden?`,
    loesung: p => String(p.len),
    pruefe: (p, t) => { const n = Number(String(t).trim()); return Number.isInteger(n) && n === p.len; },
    ablenker: p => [{text: String(p.len - 1), art: "off-by-one"}, {text: String(p.bis), art: "nur-obergrenze"}, {text: String(p.len + 1), art: "zaehlfehler"}],
    erklaerung: p => `Von ${p.von} bis ${p.bis} sind es ${p.bis} − ${p.von} + 1 = ${p.len} Ports und damit höchstens ${p.len} gleichzeitige Verbindungen je öffentlicher Adresse. ${p.bis} wäre nur die obere Grenze.`});

  /* Firewall: first match – die erste passende Regel entscheidet. */
  neu({id: "fw-erste-regel", titel: "Welche Firewall-Regel entscheidet?", skill: "lab.fw", stufe: "AP2", quelle: "05-AP2-Infrastruktur-Sicherheit (Firewall-Grundregeln) · BSI IT-Grundschutz-Kompendium, NET.3.2 Firewall",
    platzhalter: ["port", "r1", "r2", "r3"],
    zahlen: z => {
      const port = z.wahl(PORTS_FW), treffer = z.zwischen(1, 3), andere = z.mischen(PORTS_FW.filter(x => x !== port));
      let k = 0; const regeln = [];
      for (let i = 1; i <= 3; i++) {
        if (i === treffer) regeln.push("permit tcp " + port);
        else regeln.push((z.kommazahl() < 0.5 ? "deny" : "permit") + " tcp " + andere[k++]);
      }
      return {port, treffer, r1: regeln[0], r2: regeln[1], r3: regeln[2], richtig: "Regel " + treffer};
    },
    frage: p => `Regel 1: ${p.r1} · Regel 2: ${p.r2} · Regel 3: ${p.r3} · Welche Regel entscheidet für Port ${p.port}?`,
    loesung: p => p.richtig,
    pruefe: (p, t) => String(t).trim() === p.richtig,
    ablenker: p => { const andere = [1, 2, 3].filter(i => i !== p.treffer).map(i => ({text: "Regel " + i, art: "falsche-regel"})); return andere.concat([{text: "Keine – Standard deny", art: "implizites-deny"}]); },
    erklaerung: p => `Nur Regel ${p.treffer} passt zu Port ${p.port}; die Regeln davor passen nicht, also entscheidet die erste passende. Der Standard-deny greift erst, wenn keine Regel passt – hier passt eine.`});

  /* IOS-Modi: der Prompt zeigt die Ebene nach dem Befehl. */
  neu({id: "cli-prompt", titel: "IOS-Prompt nach einem Befehl", skill: "lab.cli", stufe: "AP2", quelle: "Cisco IOS Configuration Fundamentals Configuration Guide: Using the Command-Line Interface · VLAN – Lernfassung",
    platzhalter: ["name", "modus", "cmd"],
    zahlen: z => { const f = CLI_FAELLE[z.zahl(CLI_FAELLE.length)]; return {name: z.wahl(CLI_NAMEN), modus: f.modus, von: f.von, cmd: f.cmd, nach: f.nach}; },
    frage: p => `Du bist an „${p.name}“ im ${p.modus} und gibst „${p.cmd}“ ein. Welcher Prompt steht danach da?`,
    loesung: p => cliPrompt(p.name, p.nach),
    pruefe: (p, t) => String(t).trim() === cliPrompt(p.name, p.nach),
    ablenker: p => { const andere = ["user", "priv", "config", "if"].filter(k => k !== p.nach); return [{text: cliPrompt(p.name, andere[0]), art: "falscher-modus"}, {text: cliPrompt(p.name, andere[1]), art: "falscher-modus"}, {text: cliPrompt(p.name, andere[2]), art: "falsche-ebene"}]; },
    erklaerung: p => `„${p.cmd}“ wechselt vom ${p.modus} eine Ebene weiter; der Prompt zeigt den neuen Modus. ${cliPrompt(p.name, p.nach)} ist richtig – die anderen Prompts gehören zu Modi, die dieser Befehl nicht erreicht.`});
  return V;
})();
