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
    ablenker: p => p.andere.map(port => ({text: String(port), art: "dienst-vertauscht"})),
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

  /* ---------- Netzgröße je VLAN ---------- */
  neu({id: "vlan-netzgroesse", titel: "Netzgröße je VLAN", skill: "lab.vlan", stufe: "AP2", quelle: "VLAN – Lernfassung",
    platzhalter: ["basis", "n"],
    zahlen: z => { const n = z.wahl([2, 4, 8, 16]); const p = 24 + Math.round(Math.log(n) / Math.log(2)); return {basis: netzBasis(z), n, block: 256 / n, p, maske: IP.maske(p)}; },
    frage: p => `Das Netz ${p.basis}/24 wird auf ${p.n} VLANs aufgeteilt, jedes gleich groß. Welche Subnetzmaske bekommt jedes VLAN?`,
    loesung: p => IP.maske(p.p),
    pruefe: (p, t) => { const s = String(t).trim(); return IP.maskeGueltig(s) && IP.praefix(s) === 24 + Math.round(Math.log(p.n) / Math.log(2)); },
    ablenker: p => [
      {text: IP.maske(24), art: "ungeteiltes-netz"},
      {text: IP.maske(p.p - 1), art: "falscher-praefix"},
      {text: IP.maske(p.p + 1), art: "falscher-praefix"},
      {text: IP.maske(p.p + 2), art: "falscher-praefix"},   /* Ersatz, wenn p − 1 auf /24 fällt (zwei VLANs) */
    ],
    erklaerung: p => `256 Adressen im /24 geteilt durch ${p.n} VLANs sind ${p.block} Adressen je VLAN. ${p.block} Adressen entsprechen ${p.p} Präfixbits, also ${IP.maske(p.p)}.`});

  return V;
})();
