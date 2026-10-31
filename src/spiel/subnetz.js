"use strict";
/* ---------- Spiel: Subnetting — Rechenkern und Aufgabenmotor (Runde 7, Entwurf § 2.1) ----------
   Headless: kein DOM, keine Uhr, kein Math.random. Alles hängt an einem gesäten Zufall (eigene
   mulberry32-Kopie, gleiche Bauart wie kern/basis.js:Zufall) — derselbe Seed ergibt byte-gleich
   dieselbe Aufgabe. Verbindlich: docs/entwicklung/Entwurf – Runde 7 (Abteilung Subnetting).md
   §§ 2.1, 2.2, 5, 6. Schnittstelle (W3/W4 programmieren dagegen):

     Spiel.subnetz.VERSION / STUFEN / ARTEN
     rechnen(ip, praefix)                 Rechenweg 4–6 Schritte, alle Felder
     maskeZuPraefix(maske) → 0…32 | null
     praefixZuMaske(p) → "255.…" | null
     gleichesNetz(ipA, ipB, praefix) → bool
     plan(basis, [{name, hosts}])          VLSM von groß nach klein
     zusammenfassen(netze)                 Supernetz zu 2/4/8 gleich großen Netzen
     aufgabe({art, niveau, seed}) → aufgabe | null
       · rechenweg: 3–6 Schritte (§ 2.1); `loesungsschritte` = didaktische Lösungstiefe
         nach § 5 (E 1 · AP1 2–3 · AP2 3–5), additiv, von der Anzeige unabhängig
       · visual.art nutzt die Werkzeug-IDs von W4: bitlabor · maskenleiste · blocklineal ·
         rechner · vlsm · vlan (kein Eigenname „maske")
     satz({arten?, niveau, anzahl, seed}) → [aufgabe] ohne Doppelte
     pruefen(aufgabe, antwort)             wirft nie; Formattoleranz
     antwort(aufgabe, richtig, {hilfe})    einziger Schreibweg in L.* und store "subnetz"
     fortschritt() / modulSetzen(id, status) / zuruecksetzen()

   SPEICHER (nur über die API): store "subnetz", v:1 —
     {v:1, module:{[id]:{status,richtig,falsch,serie,zuletzt}}, spiele:{[id]:{bestwert,runden}},
      gesamt:{richtig,falsch,serie}}
   `zuletzt` ist der Bezeichner der zuletzt beantworteten Aufgabe (keine Uhr: deterministisch).

   STATUS: neu < gelesen < geuebt < sicher. Eine richtige Antwort hebt ein Modul mindestens auf
   „geuebt"; ein Fehler senkt „sicher" auf „geuebt" zurück und fällt nie unter „gelesen".
   „sicher" setzt die Oberfläche nach einer bestandenen Prüfrunde (≥ 4 von 5, ohne Hilfe) über
   modulSetzen(id, "sicher") — der Einzelantwort fehlt der Blick auf die ganze Runde. */

Spiel.subnetz = (() => {
  const VERSION = 1;
  const STUFEN = ["E", "AP1", "AP2"];

  /* § 6: genau diese 11 Typen in genau dieser Reihenfolge. */
  const ARTEN = [
    {id: "netzid",         titel: "Netz-ID bestimmen",      skills: ["lab.subnetz"], stufen: ["E", "AP1", "AP2"]},
    {id: "broadcast",      titel: "Broadcast bestimmen",    skills: ["lab.subnetz"], stufen: ["E", "AP1", "AP2"]},
    {id: "hosts",          titel: "Nutzbare Hosts",         skills: ["lab.subnetz"], stufen: ["E", "AP1"]},
    {id: "maske",          titel: "Maske und Präfix",       skills: ["lab.subnetz"], stufen: ["E", "AP1"]},
    {id: "block",          titel: "Blockgröße und Raster",  skills: ["lab.subnetz"], stufen: ["E", "AP1", "AP2"]},
    {id: "subnetze",       titel: "Netze schneiden und zählen", skills: ["lab.subnetz"], stufen: ["AP1", "AP2"]},
    {id: "vlsm",           titel: "Adressplan (VLSM)",      skills: ["lab.subnetz"], stufen: ["AP1", "AP2"]},
    {id: "zusammenfassen", titel: "Zusammenfassen (Route)", skills: ["lab.subnetz"], stufen: ["AP2"]},
    {id: "vlan-port",      titel: "VLAN am Port",           skills: ["lab.vlan"],    stufen: ["E", "AP1"]},
    {id: "vlan-erreichbar", titel: "Gleiches VLAN",         skills: ["lab.vlan"],    stufen: ["AP1", "AP2"]},
    {id: "trunk",          titel: "Trunk und Tagging",      skills: ["lab.trunk"],   stufen: ["AP2"]},
  ];

  /* § 2.2: die acht Module des Lehrpfads, feste Reihenfolge. */
  const MODULE_IDS = ["bits", "maske", "block", "netzid", "schneiden", "vlsm", "vlan", "pruefung"];
  const STATUS = ["neu", "gelesen", "geuebt", "sicher"];
  const STORE_SCHLUESSEL = "subnetz";
  const STANDARD_HINWEIS = "Bestimme zuerst die Blockgröße (2^Hostbits) und suche dann das passende Vielfache der Blockgröße.";

  /* ======================================================================
     1 · Kleine Helfer
     ====================================================================== */

  /* Eigener gesäter Generator (mulberry32 wie kern/basis.js) — unabhängig von der Ladeumgebung. */
  function rng(seed){
    let a = (typeof seed === "string"
      ? [...seed].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0, 1779033703)
      : (seed >>> 0)) || 1;
    const kommazahl = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const zahl = n => Math.floor(kommazahl() * n);
    const mischen = arr => { const b = arr.slice(); for (let i = b.length - 1; i > 0; i--) { const j = zahl(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };
    return {kommazahl, zahl, mischen, wahl: arr => arr[zahl(arr.length)]};
  }

  const IP_MUSTER = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

  /* IPv4 → Zahl (0 … 2^32−1) oder null. Bewusst reine Arithmetik, keine 32-Bit-Vorzeichenfalle. */
  function ipZuZahl(text){
    if (typeof text !== "string") return null;
    const m = IP_MUSTER.exec(text.trim());
    if (!m) return null;
    const o = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
    if (o.some(x => x > 255)) return null;
    return o[0] * 16777216 + o[1] * 65536 + o[2] * 256 + o[3];
  }
  function zahlZuIp(n){
    n = Math.floor(n);
    if (!(n >= 0 && n <= 4294967295)) return null;
    return [Math.floor(n / 16777216) % 256, Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join(".");
  }
  /* "192.168.10.70" oder "192.168.10.70/26" → {zahl, praefix|null} oder null. */
  function ipMitPraefix(text){
    if (typeof text !== "string") return null;
    const m = /^(\d{1,3}(?:\.\d{1,3}){3})(?:\s*\/\s*(\d{1,2}))?$/.exec(text.trim());
    if (!m) return null;
    const zahl = ipZuZahl(m[1]);
    if (zahl === null) return null;
    let praefix = null;
    if (m[2] != null) { praefix = Number(m[2]); if (!(praefix >= 0 && praefix <= 32)) return null; }
    return {zahl, praefix};
  }
  function praefixZahl(x){
    if (typeof x === "number") return Number.isInteger(x) && x >= 0 && x <= 32 ? x : null;
    if (typeof x === "string") {
      const t = x.trim().replace(/^\//, "");
      if (!/^\d{1,2}$/.test(t)) return null;
      const p = Number(t);
      return p >= 0 && p <= 32 ? p : null;
    }
    return null;
  }
  const blockGroesse = p => Math.pow(2, 32 - p);
  const maskenWert = p => p === 0 ? 0 : 4294967296 - Math.pow(2, 32 - p);
  /* 0-basiert: 1 = erstes, 4 = letztes Oktett (das „interessante" Oktett, in dem der Block springt). */
  const oktettNummer = p => p >= 24 ? 4 : p >= 16 ? 3 : p >= 8 ? 2 : 1;
  /* Raster im interessanten Oktett: 256 − Maskenoktett (bei /24 also 256 = ganzes Oktett). */
  function oktettRaster(p){
    const pos = oktettNummer(p);
    const einheit = Math.pow(256, 4 - pos);
    const oktettWert = Math.floor(maskenWert(p) / einheit) % 256;
    return {oktett: pos, oktettWert, raster: 256 - oktettWert};
  }
  const oktettWort = pos => ["", "ersten", "zweiten", "dritten", "vierten"][pos];
  function oktettVon(zahl, pos){ const einheit = Math.pow(256, 4 - pos); return Math.floor(zahl / einheit) % 256; }
  /* Netz-ID oktettweise erklären (§ 5: kein 32-Bit-Dezimalwert im Rechenweg). */
  function netzIdText(ipZahl, netz, p){
    const o = oktettRaster(p);
    if (p === 0) return "Ohne Netzanteil (/0) beginnt das einzige Netz bei 0.0.0.0 — die Netz-ID ist 0.0.0.0.";
    if (p === 32) return `Bei /32 gehört die ganze Adresse zum Netzanteil; die Netz-ID ist die Adresse selbst: ${netz}.`;
    if (o.raster >= 256) return `Im ${oktettWort(o.oktett)} Oktett gehört alles zum Hostanteil (Maskenwert 0, Blockgröße 256); die Netz-ID hat dort 0. Die Netz-ID lautet ${netz}.`;
    const adr = oktettVon(ipZahl, o.oktett);
    const unten = Math.floor(adr / o.raster) * o.raster;
    return `Die Maske ${praefixZuMaske(p)} hat im ${oktettWort(o.oktett)} Oktett den Wert ${o.oktettWert}; daraus folgt die Blockgröße 256 − ${o.oktettWert} = ${o.raster}. Die Adresse hat dort ${adr}, das größte Vielfache von ${o.raster} darunter ist ${unten} (Block ${unten} bis ${unten + o.raster - 1}). Die Netz-ID lautet ${netz}.`;
  }
  const geradeZahl = x => typeof x === "number" && isFinite(x) ? x : 0;

  /* ======================================================================
     2 · Rechenkern (§ 2.1)
     ====================================================================== */

  /* Netzangabe normalisieren: liefert Netzadresse (nicht die Host-Adresse) einer IP/Präfix-Angabe. */
  function netzAngabe(text){
    const t = ipMitPraefix(text);
    if (!t || t.praefix === null) return null;
    return {zahl: Math.floor(t.zahl / blockGroesse(t.praefix)) * blockGroesse(t.praefix), praefix: t.praefix};
  }

  /* Vollständiger Rechenweg: 5 Schritte, für alle Präfixe 0–32 vollständig. null bei ungültiger Eingabe. */
  function rechnen(ip, praefix){
    try {
      const t = ipMitPraefix(ip);
      if (!t) return null;
      const p = praefix == null ? t.praefix : praefixZahl(praefix);
      if (p === null) return null;
      const block = blockGroesse(p);
      const netzZahl = Math.floor(t.zahl / block) * block;
      const broadcastZahl = netzZahl + block - 1;
      const hosts = p <= 30 ? block - 2 : p === 31 ? 2 : 1;
      const ersterHost = p >= 31 ? netzZahl : netzZahl + 1;
      const letzterHost = p >= 31 ? broadcastZahl : broadcastZahl - 1;
      const netz = zahlZuIp(netzZahl), broadcast = zahlZuIp(broadcastZahl);
      const maske = praefixZuMaske(p);
      const hostBits = 32 - p;
      const okt = oktettRaster(p);
      const hostText = p === 31
        ? "Bei /31 sind beide Adressen nutzbar (RFC 3021); es gibt keine Broadcastadresse."
        : p === 32
          ? "Bei /32 gibt es genau eine Adresse; Netz-ID und Broadcast fallen zusammen."
          : `Nutzbare Hosts: ${block} − 2 = ${hosts}.`;
      const schritte = [
        {n: 1, titel: "Präfix und Maske",
         text: `Der Präfix /${p} bedeutet ${p} Netz-Bits von links. Als Subnetzmaske geschrieben: ${maske}.`,
         ergebnis: maske},
        {n: 2, titel: "Hostbits",
         text: `32 − ${p} = ${hostBits} Bit bleiben für die Hosts.`,
         ergebnis: String(hostBits)},
        {n: 3, titel: "Blockgröße",
         text: `2^${hostBits} = ${block} Adressen umfasst ein Netz.`,
         ergebnis: String(block)},
        {n: 4, titel: "Netz-ID",
         text: netzIdText(t.zahl, netz, p),
         ergebnis: netz},
        {n: 5, titel: "Broadcast und Hosts",
         text: `Der Broadcast ist die letzte Adresse im Block (Netz-ID + Blockgröße − 1): ${broadcast}. ${hostText}`,
         ergebnis: broadcast},
      ];
      return {
        ip: zahlZuIp(t.zahl), praefix: p, maske,
        netz, broadcast, ersterHost: zahlZuIp(ersterHost), letzterHost: zahlZuIp(letzterHost), hosts,
        blockGroesse: block, oktett: okt.oktett, hostBits, netzBits: p,
        schritte,
      };
    } catch (e) { return null; }
  }

  /* "255.255.255.192" → 26 | null. Nicht zusammenhängende Masken und Unsinn ergeben null. */
  function maskeZuPraefix(maske){
    try {
      if (typeof maske !== "string") return null;
      const t = maske.trim();
      if (!t) return null;
      const kurz = /^\/?(\d{1,2})$/.exec(t);
      if (kurz) { const p = Number(kurz[1]); return p >= 0 && p <= 32 ? p : null; }
      const o = t.split(".");
      if (o.length !== 4) return null;
      let wert = 0;
      for (const teil of o) {
        if (!/^\d{1,3}$/.test(teil)) return null;
        const x = Number(teil);
        if (x > 255) return null;
        wert = wert * 256 + x;
      }
      let p = 0;
      for (let i = 0; i < 32; i++) {
        if (Math.floor(wert / Math.pow(2, 31 - i)) % 2 === 1) p++;
        else break;
      }
      const erwartet = p === 0 ? 0 : 4294967296 - Math.pow(2, 32 - p);
      return wert === erwartet ? p : null;
    } catch (e) { return null; }
  }

  function praefixZuMaske(p){
    try {
      const x = praefixZahl(p);
      if (x === null) return null;
      return zahlZuIp(maskenWert(x));
    } catch (e) { return null; }
  }

  function gleichesNetz(ipA, ipB, praefix){
    try {
      const p = praefixZahl(praefix);
      if (p === null) return false;
      const a = ipMitPraefix(ipA), b = ipMitPraefix(ipB);
      if (!a || !b) return false;
      const block = blockGroesse(p);
      return Math.floor(a.zahl / block) === Math.floor(b.zahl / block);
    } catch (e) { return false; }
  }

  /* Basisnetz tolerant annehmen: "192.168.10.0/24", {ip, praefix} oder {netz, praefix} (W4-Absprache). */
  function basisAngabe(x){
    if (typeof x === "string") return x;
    if (x && typeof x === "object" && !Array.isArray(x)) {
      const ip = typeof x.ip === "string" ? x.ip : typeof x.netz === "string" ? x.netz : typeof x.wert === "string" ? x.wert : null;
      if (!ip) return null;
      if (/\/\s*\d{1,2}\s*$/.test(ip)) return ip;
      const p = x.praefix != null ? x.praefix : x.praefixZahl != null ? x.praefixZahl : null;
      return p != null ? ip.trim() + "/" + p : null;
    }
    return null;
  }

  /* VLSM: vom größten Bedarf nach unten, jeder Block an der nächsten freien Blockgrenze.
     zeilen in Vergabe-Reihenfolge (größte zuerst), karte mit von/bis als IP-Strings. */
  function plan(basis, bedarf){
    const leer = {ok: false, fehler: "", zeilen: [], karte: []};
    try {
      const b = netzAngabe(basisAngabe(basis));
      if (!b) return Object.assign(leer, {fehler: "Das Basisnetz muss als IP/Präfix angegeben werden, zum Beispiel 192.168.10.0/24."});
      const reihen = Array.isArray(bedarf) ? bedarf : [];
      if (!reihen.length) return Object.assign(leer, {fehler: "Für den Adressplan fehlt mindestens eine Bedarfszeile."});
      const mitBlock = [];
      for (let i = 0; i < reihen.length; i++) {
        const e = reihen[i] || {};
        const hosts = Math.floor(Number(e.hosts));
        if (!(hosts >= 1)) return Object.assign(leer, {fehler: `Bedarfszeile ${i + 1} braucht eine ganze Host-Anzahl von mindestens 1.`});
        if (hosts + 2 > Math.pow(2, 32)) return Object.assign(leer, {fehler: "Der Bedarf ist größer als der gesamte IPv4-Adressraum."});
        let block = 1;
        while (block < hosts + 2) block *= 2;
        if (block > blockGroesse(b.praefix)) return Object.assign(leer, {fehler: `Der Bedarf „${e.name || "Netz " + (i + 1)}" ist größer als das Basisnetz.`});
        const praefix = 32 - Math.round(Math.log2(block));
        mitBlock.push({name: e.name != null ? String(e.name) : "Netz " + (i + 1), hosts, block, praefix, i});
      }
      const summe = mitBlock.reduce((s, e) => s + e.block, 0);
      if (summe > blockGroesse(b.praefix)) {
        return Object.assign(leer, {fehler: `Der Bedarf (${summe} Adressen) passt nicht in das Basisnetz mit ${blockGroesse(b.praefix)} Adressen.`});
      }
      mitBlock.sort((x, y) => y.block - x.block || y.hosts - x.hosts || x.i - y.i);
      const zeilen = [], karte = [];
      let cursor = b.zahl;
      for (const e of mitBlock) {
        const bcast = cursor + e.block - 1;
        zeilen.push({
          name: e.name, hosts: e.hosts, praefix: e.praefix,
          netz: zahlZuIp(cursor), maske: praefixZuMaske(e.praefix), broadcast: zahlZuIp(bcast),
          ersterHost: zahlZuIp(e.block >= 4 ? cursor + 1 : cursor),
          letzterHost: zahlZuIp(e.block >= 4 ? bcast - 1 : bcast),
        });
        karte.push({name: e.name, von: zahlZuIp(cursor), bis: zahlZuIp(bcast), praefix: e.praefix});
        cursor += e.block;
      }
      return {ok: true, zeilen, karte};
    } catch (e) {
      return Object.assign(leer, {fehler: "Der Adressplan konnte nicht berechnet werden."});
    }
  }

  /* Supernetz zu gleich großen, lückenlos benachbarten Netzen (2, 4, 8 …). */
  function zusammenfassen(netze){
    const nein = grund => ({ok: false, praefix: null, netz: null, grund});
    try {
      const liste = [];
      for (const n of (Array.isArray(netze) ? netze : [])) {
        const text = typeof n === "string" ? n : n && typeof n === "object" ? (n.netz || n.wert || "") : "";
        const a = netzAngabe(text);
        if (!a) return nein("Mindestens eine Netzangabe ist ungültig (erwartet IP/Präfix).");
        liste.push(a);
      }
      if (liste.length < 2) return nein("Zum Zusammenfassen brauchst du mindestens zwei Netze.");
      const p = liste[0].praefix;
      if (!liste.every(x => x.praefix === p)) return nein("Die Netze haben unterschiedliche Präfixe; hier werden gleich große Netze zusammengefasst.");
      liste.sort((a, b) => a.zahl - b.zahl);
      for (let i = 1; i < liste.length; i++) if (liste[i].zahl === liste[i - 1].zahl) return nein("Ein Netz kommt doppelt vor.");
      const n = liste.length;
      if ((n & (n - 1)) !== 0) return nein("Lückenlos zusammenfassen lassen sich nur 2, 4, 8 … gleich große Netze.");
      const block = blockGroesse(p);
      for (let i = 0; i < n; i++) {
        if (liste[i].zahl !== liste[0].zahl + i * block) return nein("Die Netze liegen nicht lückenlos hintereinander.");
      }
      const k = Math.round(Math.log2(n));
      const superPraefix = p - k;
      if (superPraefix < 0) return nein("Die Netze lassen sich nicht zu einem gültigen Supernetz zusammenfassen.");
      const superNetz = Math.floor(liste[0].zahl / blockGroesse(superPraefix)) * blockGroesse(superPraefix);
      if (superNetz !== liste[0].zahl) return nein("Die Netze beginnen nicht an einer Blockgrenze des Supernetzes.");
      return {ok: true, praefix: superPraefix, netz: zahlZuIp(superNetz), grund: ""};
    } catch (e) { return nein("Die Netze konnten nicht zusammengefasst werden."); }
  }

  /* ======================================================================
     3 · Fortschritt und Speicher (eigener Schlüssel, nur über diese API)
     ====================================================================== */

  let ersatzDaten = null;

  function trocken(){
    try { return typeof Spiel !== "undefined" && Spiel._trocken === true; } catch (e) { return false; }
  }
  function speicherLesen(){
    try {
      if (typeof store !== "undefined" && store && typeof store.get === "function") return store.get(STORE_SCHLUESSEL, null);
    } catch (e) { /* ohne Speicher gilt der Ersatz */ }
    return ersatzDaten;
  }
  function speicherSchreiben(d){
    try {
      if (typeof store !== "undefined" && store && typeof store.set === "function") { store.set(STORE_SCHLUESSEL, d); return; }
    } catch (e) { /* Fällt auf den Ersatz zurück */ }
    ersatzDaten = d;
  }
  const istObjekt = x => !!x && typeof x === "object" && !Array.isArray(x);

  /* Gespeicherten Stand lesen und in die verbindliche Form bringen (kaputte Teile werden leer). */
  function daten(){
    const roh = speicherLesen();
    const d = istObjekt(roh) && roh.v === 1 ? roh : {};
    const module = istObjekt(d.module) ? d.module : {};
    const spiele = istObjekt(d.spiele) ? d.spiele : {};
    const g = istObjekt(d.gesamt) ? d.gesamt : {};
    return {
      v: 1, module, spiele,
      gesamt: {
        richtig: Math.max(0, Math.floor(geradeZahl(g.richtig, 0))),
        falsch: Math.max(0, Math.floor(geradeZahl(g.falsch, 0))),
        serie: Math.max(0, Math.floor(geradeZahl(g.serie, 0))),
      },
    };
  }
  function datenSchreiben(d){
    speicherSchreiben(d);
    try { if (typeof Spiel.geaendert === "function") Spiel.geaendert("subnetz"); } catch (e) { /* Anzeige-Schicht fehlt im Test */ }
  }

  const statusRang = s => { const i = STATUS.indexOf(s); return i < 0 ? 0 : i; };

  function fortschritt(){
    try {
      const d = daten();
      const module = {};
      for (const id of MODULE_IDS) {
        const m = istObjekt(d.module[id]) ? d.module[id] : {};
        module[id] = {
          status: STATUS.includes(m.status) ? m.status : "neu",
          richtig: Math.max(0, Math.floor(geradeZahl(m.richtig, 0))),
          falsch: Math.max(0, Math.floor(geradeZahl(m.falsch, 0))),
          serie: Math.max(0, Math.floor(geradeZahl(m.serie, 0))),
        };
      }
      const spiele = {};
      for (const id of Object.keys(d.spiele)) {
        const s = istObjekt(d.spiele[id]) ? d.spiele[id] : {};
        spiele[id] = {bestwert: Math.max(0, geradeZahl(s.bestwert, 0)), runden: Math.max(0, Math.floor(geradeZahl(s.runden, 0)))};
      }
      return {module, spiele, gesamt: d.gesamt};
    } catch (e) {
      const module = {};
      for (const id of MODULE_IDS) module[id] = {status: "neu", richtig: 0, falsch: 0, serie: 0};
      return {module, spiele: {}, gesamt: {richtig: 0, falsch: 0, serie: 0}};
    }
  }

  /* Status eines Moduls ausdrücklich setzen (Lehrpfad: gelesen; Prüfrunde: sicher). */
  function modulSetzen(id, status){
    try {
      if (MODULE_IDS.includes(id) && STATUS.includes(status) && !trocken()) {
        const d = daten();
        const m = istObjekt(d.module[id]) ? d.module[id] : {status: "neu", richtig: 0, falsch: 0, serie: 0};
        m.status = status;
        d.module[id] = m;
        datenSchreiben(d);
        try { if (typeof Spiel.melden === "function") Spiel.melden("subnetz-modul", {id, status}); } catch (e) { /* stumm */ }
      }
    } catch (e) { /* nie werfen */ }
    return fortschritt();
  }

  /* Nur der eigene Schlüssel wird geleert — der Lernstand (L.*) bleibt.
     Wichtig: danach wird KEIN leerer Fortschritt zurückgeschrieben (sonst läge wieder {v:1,…} im
     Speicher und ein späteres fortschritt() würde einen „Stand" vortäuschen, den es nicht gibt). */
  function zuruecksetzen(){
    try {
      if (!trocken()) {
        speicherSchreiben(null);
        try { if (typeof Spiel.geaendert === "function") Spiel.geaendert("subnetz"); } catch (e) { /* stumm */ }
        try { if (typeof Spiel.melden === "function") Spiel.melden("subnetz-zurueckgesetzt", {}); } catch (e) { /* stumm */ }
      }
    } catch (e) { /* nie werfen */ }
    return {ok: true};
  }

  /* Welche Lehrpfad-Module eine Aufgabe übt (§ 2.2: die Module nennen ihre Übungsarten). */
  const MODUL_JE_ART = {
    netzid:          {E: ["netzid"], AP1: ["schneiden"], AP2: ["schneiden", "pruefung"]},
    broadcast:       {E: ["netzid"], AP1: ["schneiden"], AP2: ["schneiden", "pruefung"]},
    hosts:           {E: ["bits", "block"], AP1: ["vlsm"], AP2: []},
    maske:           {E: ["bits", "maske"], AP1: ["maske"], AP2: []},
    block:           {E: ["block"], AP1: ["block"], AP2: ["block"]},
    subnetze:        {E: [], AP1: ["schneiden"], AP2: ["schneiden", "pruefung"]},
    vlsm:            {E: [], AP1: ["vlsm"], AP2: ["vlsm"]},
    zusammenfassen:  {E: [], AP1: [], AP2: ["pruefung"]},
    "vlan-port":     {E: ["vlan"], AP1: ["vlan"], AP2: []},
    "vlan-erreichbar": {E: [], AP1: ["vlan"], AP2: ["vlan", "pruefung"]},
    trunk:           {E: [], AP1: [], AP2: ["pruefung"]},
  };
  function moduleFuer(art, niveau){
    const m = MODUL_JE_ART[art];
    return m && Array.isArray(m[niveau]) ? m[niveau].slice() : [];
  }

  /* ======================================================================
     4 · Aufgabenmotor — Hilfen, dann die 11 Typen (§ 6) und die Stufenmatrix (§ 5)
     ====================================================================== */

  /* Fragen und Erklärungen: Deutsch, Du-Form, keine Emoji, keine Fangfrage. */
  const QUELLE_RFC = "RFC 4632 · Network – Lernfassung";
  const QUELLE_VLAN = "IEEE 802.1Q · Network – Lernfassung";
  const QUELLE_RFC3021 = "RFC 3021 · Network – Lernfassung";

  function rw(liste){
    return liste.map((s, i) => ({n: i + 1, titel: String(s[0]), text: String(s[1]), ergebnis: String(s[2])}));
  }
  function eingabeText(art, platzhalter){
    return art === "ip" ? {art: "ip", platzhalter: platzhalter || "z. B. 192.168.10.0"}
      : art === "zahl" ? {art: "zahl", platzhalter: platzhalter || "z. B. 64"}
      : {art: "maske", platzhalter: platzhalter || "/26 oder 255.255.255.192"};
  }
  /* Auswahlaufgabe: genau eine richtige Option, drei typische Denkfehler, zufällige Reihenfolge. */
  function auswahl(richtig, andere, z){
    const texte = [String(richtig)];
    for (const a of andere) { const s = String(a); if (s !== texte[0] && !texte.includes(s)) texte.push(s); }
    const gemischt = z.mischen(texte.slice(0, 4));
    return {
      eingabe: {art: "auswahl", optionen: gemischt.map(text => ({text}))},
      loesung: {wert: String(richtig), text: String(richtig)},
    };
  }

  /* Netz-Basisadresse passend zum Präfix-Stil (E/AP1: letztes oder vorletztes Oktett; AP2 frei). */
  function basisNetz(p, z){
    if (p >= 24) return "192.168." + z.zahl(256) + ".0";
    if (p >= 16) return z.zahl(2) === 0 ? "10." + z.zahl(256) + ".0.0" : "172." + (16 + z.zahl(16)) + ".0.0";
    if (p >= 8) return "172." + (16 + z.zahl(16)) + ".0.0";
    return "10.0.0.0";
  }
  /* Zufällige Adresse in einem Netz: 0 = typische Host-Adresse, 1 = Netz-ID, 2 = Broadcast, 3 = letzter Host. */
  function ipFuerPraefix(z, p, variante){
    const block = blockGroesse(p);
    const basis = ipZuZahl(basisNetz(p, z));
    let offset;
    switch (variante % 4) {
      case 1: offset = 0; break;
      case 2: offset = block - 1; break;
      case 3: offset = Math.max(0, block - 2); break;
      default: offset = block > 2 ? 1 + z.zahl(block - 2) : z.zahl(block);
    }
    return zahlZuIp(basis + offset);
  }
  function praefixStufe(z, niveau){
    return niveau === "E" ? 25 + z.zahl(4) : niveau === "AP1" ? 20 + z.zahl(11) : 16 + z.zahl(16);
  }
  /* Für Netz-ID und Broadcast höchstens /30: bei /31 (RFC 3021) gibt es keine Netz- und keine
     Broadcastadresse, beide Adressen sind gleichwertige Endpunkte. Solche Aufgaben dürfen nicht
     entstehen — sonst lehrt der Motor das Gegenteil des Lehrplans (Review B1). */
  function praefixAdressArt(z, niveau){
    return niveau === "E" ? 25 + z.zahl(4) : niveau === "AP1" ? 20 + z.zahl(11) : 16 + z.zahl(15);
  }
  /* Niveau-abhängiger Hilfetext: E immer, AP1 optional (jede zweite Variante), AP2 nie. */
  function hinweisFuer(niveau, z, text){
    if (niveau === "E") return text;
    if (niveau === "AP1") return z.zahl(2) === 0 ? text : "";
    return "";
  }

  const schrittMaske = p => ["Maske aus dem Präfix", `Der Präfix /${p} steht für ${p} Netz-Bits von links; die Subnetzmaske lautet ${praefixZuMaske(p)}.`, praefixZuMaske(p)];
  const schrittHostbits = p => ["Hostbits zählen", `32 − ${p} = ${32 - p} Hostbits.`, 32 - p];
  const schrittBlock = (p, block) => ["Blockgröße berechnen", `2^${32 - p} = ${block} Adressen je Netz.`, block];
  const schrittOktett = p => {
    const o = oktettRaster(p);
    const posText = ["", "ersten", "zweiten", "dritten", "vierten"][o.oktett];
    return ["Interessantes Oktett", `Der Block springt im ${posText} Oktett; dort hat die Maske den Wert ${o.oktettWert}, das Raster ist ${o.raster}.`, `Raster ${o.raster}`];
  };
  const schrittNetzId = (ip, netz) => ["Netz-ID bestimmen", `Die Netz-ID ist der Beginn des Blocks, in dem ${ip} liegt: ${netz}.`, netz];
  const schrittBroadcast = (netz, block, broadcast) => ["Broadcast berechnen", `Broadcast = Netz-ID + Blockgröße − 1 = ${netz} + ${block} − 1 = ${broadcast}.`, broadcast];

  /* --- 1 netzid (§ 6: E/AP1/AP2, Eingabe ip) --- */
  function aufgabeNetzid({z, niveau}){
    const p = praefixAdressArt(z, niveau);
    const variante = z.zahl(4);
    const ip = ipFuerPraefix(z, p, variante);
    const r = rechnen(ip, p);
    if (!r) return null;
    const o = oktettRaster(p);
    const ipZ = ipZuZahl(ip);
    const adrOkt = oktettVon(ipZ, o.oktett);
    const netzOkt = oktettVon(ipZuZahl(r.netz), o.oktett);
    const vielfache = o.raster > 0 ? Math.floor(adrOkt / o.raster) * o.raster : 0;
    const frage = niveau === "E"
      ? `Wie lautet die Netz-ID von ${ip}/${p}?`
      : niveau === "AP1"
        ? `In welchem Netz liegt die Adresse ${ip}/${p}? Gib die Netz-ID an.`
        : `Bestimme die Netz-ID zu ${ip}/${p}; prüfe das Ergebnis anschließend gegen den Broadcast.`;
    const kern = [
      schrittBlock(p, r.blockGroesse),
      ["Oktett ablesen",
       o.raster >= 256
         ? `Im ${oktettWort(o.oktett)} Oktett gehört alles zum Hostanteil (Maskenwert 0, Blockgröße 256); die Netz-ID hat dort 0.`
         : `Im ${oktettWort(o.oktett)} Oktett steht die Adresse bei ${adrOkt}. Die Blockgröße im Oktett ist 256 − ${o.oktettWert} = ${o.raster}; das größte Vielfache von ${o.raster} darunter ist ${vielfache}.`,
       `${adrOkt} im ${oktettWort(o.oktett)} Oktett`],
      ["Netz-ID", `Im ${oktettWort(o.oktett)} Oktett lautet die Netz-ID ${netzOkt}; alle Oktette rechts davon werden 0. Die Netz-ID lautet ${r.netz}.`, r.netz],
    ];
    const netzKurz = o.raster >= 256
      ? `Im ${oktettWort(o.oktett)} Oktett gehört alles zum Hostanteil; die Netz-ID hat dort 0. Die Netz-ID lautet ${r.netz}.`
      : `Im ${oktettWort(o.oktett)} Oktett steht die Adresse bei ${adrOkt}; das größte Vielfache von ${o.raster} darunter ist ${vielfache}. Alle Oktette rechts davon werden 0. Die Netz-ID lautet ${r.netz}.`;
    let schritte;
    if (niveau === "E") schritte = kern;
    else if (niveau === "AP1") schritte = [schrittMaske(p), kern[0], ["Netz-ID", netzKurz, r.netz]];
    else schritte = [schrittMaske(p), schrittOktett(p), ...kern.slice(0, 2), ["Netz-ID und Gegenprobe", `Die Netz-ID lautet ${r.netz}. Der Broadcast ${r.broadcast} bestätigt den Block; die Adresse ${ip} liegt dazwischen.`, r.netz]];
    return {
      titel: "Netz-ID bestimmen", frage,
      lage: [{label: "Adresse", wert: `${ip}/${p}`}],
      eingabe: eingabeText("ip"),
      loesung: {wert: r.netz, text: r.netz},
      rechenweg: rw(schritte),
      erklaerung: o.raster >= 256
        ? `Du erkennst es am Oktett: Die Maske ${r.maske} hat im ${oktettWort(o.oktett)} Oktett den Wert 0 — dort beginnt ein neuer Block. Alles rechts davon gehört zu den Hosts; die Netz-ID endet dort mit 0: ${r.netz}.`
        : `Du suchst das Oktett, in dem die Maske nicht 255 ist: ${r.maske}. Dort gilt Blockgröße = 256 − ${o.oktettWert} = ${o.raster}. Die Adresse ${ip} liegt im Block ${vielfache} bis ${vielfache + o.raster - 1} dieses Oktetts; die Netz-ID ist ${r.netz}.`,
      hinweis: hinweisFuer(niveau, z, `Rechne zuerst 2^${r.hostBits} = ${r.blockGroesse}. Suche dann im ${oktettWort(r.oktett)} Oktett das passende Vielfache.`),
      visual: {art: "blocklineal", preset: {ip, praefix: p}},
      quelle: p >= 31 ? QUELLE_RFC3021 : QUELLE_RFC,
    };
  }

  /* --- 2 broadcast (§ 6: E/AP1/AP2, Eingabe ip) --- */
  function aufgabeBroadcast({z, niveau}){
    const p = praefixAdressArt(z, niveau);
    const variante = z.zahl(4);
    const ip = ipFuerPraefix(z, p, variante);
    const r = rechnen(ip, p);
    if (!r) return null;
    const frage = niveau === "E"
      ? `Wie lautet die Broadcastadresse von ${ip}/${p}?`
      : niveau === "AP1"
        ? `Bestimme die Broadcastadresse zu ${ip}/${p}.`
        : `Bestimme die Broadcastadresse zu ${ip}/${p}; prüfe sie gegen die nutzbaren Hosts.`;
    const kern = [
      schrittBlock(p, r.blockGroesse),
      schrittNetzId(ip, r.netz),
      schrittBroadcast(r.netz, r.blockGroesse, r.broadcast),
    ];
    let schritte;
    if (niveau === "E") schritte = kern;
    else if (niveau === "AP1") schritte = [schrittMaske(p), kern[0], ["Broadcast", `Die Netz-ID ist ${r.netz}; die letzte Adresse dieses Blocks ist der Broadcast ${r.broadcast}.`, r.broadcast]];
    else schritte = [schrittMaske(p), schrittOktett(p), ...kern.slice(0, 2), ["Broadcast und Gegenprobe", `Die Broadcastadresse lautet ${r.broadcast}. Sie ist die letzte Adresse des Blocks; ${r.hosts} Hosts sind nutzbar.`, r.broadcast]];
    return {
      titel: "Broadcast bestimmen", frage,
      lage: [{label: "Adresse", wert: `${ip}/${p}`}],
      eingabe: eingabeText("ip"),
      loesung: {wert: r.broadcast, text: r.broadcast},
      rechenweg: rw(schritte),
      erklaerung: `Du rechnest: Der Broadcast ist die letzte Adresse im Block — Netz-ID ${r.netz} plus Blockgröße ${r.blockGroesse} minus 1 ergibt ${r.broadcast}.`,
      hinweis: hinweisFuer(niveau, z, `Bestimme zuerst die Netz-ID (${r.netz}) und addiere dann die Blockgröße ${r.blockGroesse} − 1.`),
      visual: {art: "blocklineal", preset: {ip, praefix: p}},
      quelle: p >= 31 ? QUELLE_RFC3021 : QUELLE_RFC,
    };
  }

  /* --- 3 hosts (§ 6: E/AP1, Eingabe zahl) --- */
  function aufgabeHosts({z, niveau}){
    const p = niveau === "E" ? 25 + z.zahl(4) : 20 + z.zahl(11);
    const r = rechnen("10.20.30.40", p);
    if (!r) return null;
    const frage = niveau === "E"
      ? `Wie viele nutzbare Host-Adressen hat ein Netz mit dem Präfix /${p}?`
      : `Wie viele nutzbare Host-Adressen bleiben in einem /${p}-Netz übrig?`;
    const kern = [
      schrittHostbits(p),
      schrittBlock(p, r.blockGroesse),
      ["Nutzbare Hosts", `Von den ${r.blockGroesse} Adressen gehen Netz-ID und Broadcast ab: ${r.blockGroesse} − 2 = ${r.hosts}.`, r.hosts],
    ];
    const schritte = niveau === "E" ? kern : [schrittMaske(p), kern[0], kern[2]];
    return {
      titel: "Nutzbare Hosts", frage,
      lage: [{label: "Präfix", wert: `/${p}`}],
      eingabe: eingabeText("zahl"),
      loesung: {wert: String(r.hosts), text: String(r.hosts)},
      rechenweg: rw(schritte),
      erklaerung: `Du rechnest mit den Hostbits: 2^${r.hostBits} = ${r.blockGroesse} Adressen. Netz-ID und Broadcast sind selbst nicht an Endgeräte vergebbar, deshalb bleiben ${r.hosts} nutzbare Hosts.`,
      hinweis: hinweisFuer(niveau, z, `Ziehe von 2^Hostbits zwei Adressen ab: Netz-ID und Broadcast.`),
      visual: {art: "maskenleiste", preset: {praefix: p}},
      quelle: QUELLE_RFC,
    };
  }

  /* --- 4 maske (§ 6: E/AP1, Eingabe maske, beide Richtungen) --- */
  function aufgabeMaske({z, niveau}){
    const p = niveau === "E" ? 25 + z.zahl(4) : 20 + z.zahl(11);
    const maske = praefixZuMaske(p);
    const okt = [1, 2, 3, 4].map(i => oktettVon(maskenWert(p), i));
    const volle = Math.floor(p / 8), rest = p % 8;
    const restBitsHost = rest === 0 ? 0 : 8 - rest;
    const restOktett = rest === 0 ? 0 : 256 - Math.pow(2, restBitsHost);
    const richtung = z.zahl(2);
    const schritte = [];
    let frage, loesung, hinweis, erklaerung;
    if (richtung === 0){
      frage = niveau === "E" ? `Welche Subnetzmaske gehört zum Präfix /${p}?` : `Trage die Subnetzmaske zum Präfix /${p} ein.`;
      loesung = {wert: maske, text: maske};
      const teil = ["Präfix in Bits", `Der Präfix /${p} heißt: die ersten ${p} Bit der Maske sind 1, die übrigen ${32 - p} Bit sind 0.`, `${p} Einsen`];
      const voll = ["Volle Oktette", `${volle} volle Oktette à 8 Bit ergeben ${volle} × 255${rest ? `; dazu kommen ${rest} Bit im ${oktettWort(volle + 1)} Oktett` : "; die übrigen Oktette sind 0"}.`, volle * 8];
      const zusammensetzen = ["Maske zusammensetzen", `Die Oktette ${okt.join(".")} ergeben die Subnetzmaske ${maske}.`, maske];
      schritte.push(teil, voll, zusammensetzen);
      hinweis = hinweisFuer(niveau, z, "Acht Einsen von links sind ein volles Oktett (255); zähle die restlichen Einsen im nächsten Oktett.");
      erklaerung = `Du schreibst die Subnetzmaske als vier Oktette: ${p} Einsen von links, der Rest Nullen. ${volle} volle Oktette sind 255; ${rest ? `das ${oktettWort(volle + 1)} Oktett trägt die restlichen ${rest} Bit und hat den Wert ${restOktett}` : "die übrigen Oktette sind 0"}.`;
    } else {
      frage = niveau === "E" ? `Welcher Präfix gehört zur Subnetzmaske ${maske}?` : `Bestimme den Präfix zur Subnetzmaske ${maske}.`;
      loesung = {wert: "/" + p, text: "/" + p};
      const oktZeile = ["Oktette der Maske", `Die Maske ${maske} besteht aus den Oktetten ${okt.join(", ")}; volle Oktette haben den Wert 255.`, okt.join(".")];
      const voll = ["Netzbits der vollen Oktette", `${volle} volle Oktette sind ${volle} × 8 = ${volle * 8} Bit.`, volle * 8];
      const restZeile = ["Restbits zählen", rest === 0
        ? `Nach den vollen Oktetten folgen nur Nullen; es kommen keine Restbits dazu.`
        : `Im ${oktettWort(volle + 1)} Oktett steht ${okt[volle]}; daraus folgt 256 − ${okt[volle]} = ${Math.pow(2, restBitsHost)} = 2^${restBitsHost}, also ${rest} Netzbits.`,
        rest === 0 ? 0 : rest];
      const praefixZeile = ["Präfix", rest === 0
        ? `Der Präfix ist ${volle * 8} (${volle} volle Oktette): /${p}.`
        : `${volle * 8} + ${rest} = ${p}: Der Präfix lautet /${p}.`, "/" + p];
      schritte.push(oktZeile, ["Volle Oktette und Rest", `${volle} × 8 = ${volle * 8} Bit${rest ? `, dazu ${rest} Bit im ${oktettWort(volle + 1)} Oktett` : ""}.`, `${volle * 8}${rest ? ` + ${rest}` : ""}`], praefixZeile);
      hinweis = hinweisFuer(niveau, z, "Vergleiche die Oktette mit 255; der letzte Wert ungleich 0 verrät die restlichen Netzbits.");
      erklaerung = `Du liest die Maske von links: Jedes volle Oktett (255) sind 8 Netzbits. ${rest ? `Das ${oktettWort(volle + 1)} Oktett (${okt[volle]}) liefert ${rest} weitere Netzbits, denn 256 − ${okt[volle]} = 2^${restBitsHost}.` : "Danach folgen keine weiteren Netzbits."} Zusammen: /${p}.`;
    }
    return {
      titel: "Maske und Präfix", frage,
      lage: richtung === 0 ? [{label: "Präfix", wert: `/${p}`}] : [{label: "Subnetzmaske", wert: maske}],
      eingabe: eingabeText("maske"),
      loesung,
      rechenweg: rw(schritte),
      erklaerung,
      hinweis,
      visual: {art: "maskenleiste", preset: {praefix: p, maske}},
      quelle: QUELLE_RFC,
    };
  }

  /* --- 5 block (§ 6: E/AP1/AP2, Eingabe zahl: 2^(32−p) und Raster im Oktett) --- */
  function aufgabeBlock({z, niveau}){
    const p = praefixStufe(z, niveau);
    const block = blockGroesse(p);
    const o = oktettRaster(p);
    const frage = niveau === "E"
      ? `Wie viele Adressen umfasst der Block eines /${p}-Netzes?`
      : niveau === "AP1"
        ? `Wie groß ist der Adressblock eines /${p}-Netzes (Netz-ID bis Broadcast)?`
        : `Bestimme die Blockgröße des /${p}-Netzes und rechne sie gegen die Maske nach.`;
    const sonder = p === 31 ? " Bei /31 sind beide Adressen nutzbar (RFC 3021); der Block umfasst trotzdem 2 Adressen."
      : p === 32 ? " Bei /32 gehört die eine Adresse vollständig zum Netz." : "";
    const kern = [
      schrittHostbits(p),
      ["Blockgröße", `2^${32 - p} = ${block} Adressen je Netz.${sonder}`, block],
      ["Block im Oktett", `Die Maske ${praefixZuMaske(p)} hat im ${oktettWort(o.oktett)} Oktett den Wert ${o.oktettWert}; dort springt der Block um 256 − ${o.oktettWert} = ${o.raster}.`, block],
    ];
    const schritte = niveau === "E" ? kern
      : niveau === "AP1" ? [schrittMaske(p), ...kern.slice(1)]
        : [schrittMaske(p), schrittHostbits(p), schrittOktett(p), ...kern.slice(1)];
    return {
      titel: "Blockgröße und Raster", frage,
      lage: [{label: "Präfix", wert: `/${p}`}],
      eingabe: eingabeText("zahl"),
      loesung: {wert: String(block), text: String(block)},
      rechenweg: rw(schritte),
      erklaerung: `Du rechnest mit der Blockgröße: 2^Hostbits. Bei /${p} bleiben ${32 - p} Hostbits, also 2^${32 - p} = ${block} Adressen. Im ${oktettWort(o.oktett)} Oktett springt der Block um 256 − ${o.oktettWert} = ${o.raster}.`,
      hinweis: hinweisFuer(niveau, z, "Die Blockgröße steht in der Maske: 256 − Maskenoktett im Oktett, in dem die Maske nicht 255 ist."),
      visual: {art: "blocklineal", preset: {ip: basisNetz(p, z), praefix: p}},
      quelle: p >= 31 ? QUELLE_RFC3021 : QUELLE_RFC,
    };
  }

  /* --- 6 subnetze (§ 6: AP1/AP2, Eingabe zahl: schneiden und zählen) --- */
  function aufgabeSubnetze({z, niveau}){
    let p0, k;
    if (niveau === "AP1") { p0 = 20 + z.zahl(7); k = 1 + z.zahl(3); }
    else { p0 = 16 + z.zahl(11); k = 1 + z.zahl(5); }
    const p1 = p0 + k;
    const anzahl = Math.pow(2, k);
    const variante = z.zahl(2);
    const block0 = blockGroesse(p0), block1 = blockGroesse(p1);
    const frageBasis = variante === 0
      ? `Ein /${p0}-Netz wird in ${anzahl} gleich große Netze geteilt. Welchen Präfix haben die Teilnetze?`
      : `Wie viele gleich große /${p1}-Netze passen in ein /${p0}-Netz?`;
    const frage = niveau === "AP2" ? `${frageBasis} Prüfe das Ergebnis mit der Gegenprobe.` : frageBasis;
    const kern = [
      ["Ausgangsblock", `Ein /${p0}-Netz hat ${block0} Adressen.`, block0],
      ["Teilungen als Bits", `${anzahl} = 2^${k}: jede Halbierung kostet ein Präfix-Bit, also ${k} Bit mehr.`, `${anzahl} = 2^${k}`],
      ["Teilnetzgröße", `Jedes Teilnetz hat ${block1} Adressen (2^${32 - p1}).`, block1],
    ];
    const gegenprobe = `Gegenprobe: ${anzahl} × ${block1} = ${block0} Adressen.`;
    const ergebnis = variante === 0
      ? ["Ergebnis", `/${p0} + ${k} Bit = /${p1}. Jedes Teilnetz hat ${block1} Adressen; der Präfix lautet /${p1}. ${gegenprobe}`, String(p1)]
      : ["Ergebnis", `${block0} Adressen geteilt durch ${block1} Adressen je Teilnetz ergibt ${anzahl}. Es passen ${anzahl} Teilnetze in das Ausgangsnetz. ${gegenprobe}`, String(anzahl)];
    const schritte = niveau === "AP1" ? [kern[0], kern[1], ergebnis] : [schrittMaske(p0), ...kern, ergebnis];
    return {
      titel: "Netze schneiden und zählen", frage,
      lage: [
        {label: "Ausgangsnetz", wert: `/${p0}`},
        {label: "Teilung", wert: variante === 0 ? `${anzahl} gleiche Netze` : `Teilnetze mit /${p1}`},
      ],
      eingabe: eingabeText("zahl"),
      loesung: {wert: variante === 0 ? String(p1) : String(anzahl), text: variante === 0 ? String(p1) : String(anzahl)},
      rechenweg: rw(schritte),
      erklaerung: `Du halbierst den Block: Jede Halbierung ist ein Präfix-Bit mehr. Aus /${p0} werden bei ${k} zusätzlichen Bit ${anzahl} Netze mit dem Präfix /${p1}; jedes Teilnetz hat ${block1} Adressen. ${gegenprobe}`,
      hinweis: hinweisFuer(niveau, z, "Jede Teilung halbiert den Block — das ist genau ein Präfix-Bit mehr."),
      visual: {art: "blocklineal", preset: {ip: basisNetz(p0, z), praefix: p0}},
      quelle: QUELLE_RFC,
    };
  }

  /* --- 7 vlsm (§ 6: AP1/AP2, Eingabe auswahl; vom größten zum kleinsten, Reserve) --- */
  const VLSM_NAMEN = ["Verwaltung", "Lager", "Werkstatt", "Buchhaltung", "Empfang", "Technik", "Produktion", "Schulung"];
  const VLSM_AP1 = [[100, 50, 20], [120, 60, 25], [50, 30, 10], [100, 25, 12], [60, 30, 25], [40, 20, 10]];
  const VLSM_AP2 = [
    {basisP: 22, werte: [500, 200, 100, 50, 20]},
    {basisP: 22, werte: [400, 200, 100, 50]},
    {basisP: 21, werte: [500, 200, 100, 50, 20]},
    {basisP: 20, werte: [1000, 500, 200, 100, 50]},
    {basisP: 22, werte: [300, 150, 60, 25, 10]},
    {basisP: 21, werte: [600, 300, 120, 60, 25]},
  ];
  function aufgabeVlsm({z, niveau}){
    const ap2 = niveau === "AP2";
    const kombi = ap2 ? VLSM_AP2[z.zahl(VLSM_AP2.length)] : {basisP: 24, werte: VLSM_AP1[z.zahl(VLSM_AP1.length)]};
    const basis = ap2
      ? (z.zahl(2) === 0 ? `10.${z.zahl(256)}.0.0/${kombi.basisP}` : `172.${16 + z.zahl(16)}.0.0/${kombi.basisP}`)
      : `192.168.${10 + z.zahl(200)}.0/24`;
    const namen = z.mischen(VLSM_NAMEN).slice(0, kombi.werte.length);
    const bedarf = kombi.werte.map((hosts, i) => ({name: namen[i], hosts}));
    const p = plan(basis, bedarf);
    if (!p.ok || !p.zeilen.length) return null;
    const basisSize = blockGroesse(kombi.basisP);
    const sumBlocks = p.zeilen.reduce((s, e) => s + blockGroesse(e.praefix), 0);
    const sumHosts = kombi.werte.reduce((s, h) => s + h, 0);
    const reserve = basisSize - sumBlocks;
    const anzahl = p.zeilen.length;
    const bas = netzAngabe(basis);
    const basisStart = bas ? zahlZuIp(bas.zahl) : p.zeilen[0].netz;

    /* Frageart je Stufe (§ 5: AP2 mit Reihenfolge und Reserve). */
    const variante = z.zahl(3);
    let artDerFrage, zielIndex;
    if (!ap2) {
      artDerFrage = variante === 1 ? "maske" : "netz";
      zielIndex = variante === 2 ? anzahl - 1 : 0;
    } else if (variante === 0) {
      artDerFrage = "reserve";
      zielIndex = 0;
    } else {
      artDerFrage = "netz";
      zielIndex = variante === 1 ? z.zahl(anzahl) : 0;
      if (variante === 2) { artDerFrage = "maske"; zielIndex = anzahl - 1; }
    }
    const ziel = p.zeilen[zielIndex];
    const zielName = ziel.name;
    const kleinsterBlock = Math.min(...p.zeilen.map(e => blockGroesse(e.praefix)));
    let frage, loesungWert, andere;
    if (artDerFrage === "reserve") {
      frage = `Wie viele Adressen bleiben im Basisnetz ${basis} nach dem VLSM-Plan als Reserve übrig?`;
      loesungWert = String(reserve);
      andere = [String(basisSize - sumHosts), String(reserve + kleinsterBlock), String(basisSize), String(sumBlocks)];
    } else if (artDerFrage === "netz") {
      frage = ap2
        ? `Der VLSM-Plan verteilt ${basis} auf ${anzahl} Netze. Welche Netz-ID bekommt „${zielName}"?`
        : `Der Adressplan verteilt ${basis} auf ${anzahl} Abteilungen. Welche Netz-ID bekommt „${zielName}"?`;
      loesungWert = ziel.netz;
      const halb = Math.floor(blockGroesse(ziel.praefix) / 2);
      andere = p.zeilen.filter(e => e.name !== zielName).map(e => e.netz);
      andere.push(basisStart, zahlZuIp(ipZuZahl(ziel.netz) + Math.max(1, halb)));
    } else {
      frage = ap2
        ? `Der VLSM-Plan verteilt ${basis} auf ${anzahl} Netze. Welche Subnetzmaske bekommt das kleinste Netz „${zielName}"?`
        : `Der Adressplan verteilt ${basis}. Welche Subnetzmaske bekommt „${zielName}"?`;
      loesungWert = ziel.maske;
      andere = [
        praefixZuMaske(Math.max(0, ziel.praefix - 1)),
        praefixZuMaske(Math.min(32, ziel.praefix + 1)),
        praefixZuMaske(kombi.basisP),
      ];
    }
    const bau = auswahl(loesungWert, andere, z);

    const sortiert = p.zeilen;
    const schrittSortieren = ["Bedarfe sortieren", `Von groß nach klein: ${sortiert.map(e => `${e.name} (${e.hosts} Hosts)`).join(", ")}.`, sortiert.map(e => e.name).join(", ")];
    const schrittBloecke = ["Blockgröße je Bedarf", `Hosts + 2, dann auf die nächste Zweierpotenz aufrunden: ${sortiert.map(e => `${e.name}: ${e.hosts} + 2 → ${blockGroesse(e.praefix)}`).join("; ")}.`, "Zweierpotenzen"];
    const schrittPlatz = ["Blöcke platzieren", `Der größte Block beginnt bei ${basisStart}; jeder folgende Block beginnt direkt hinter dem Broadcast des vorigen.`, `Start ${basisStart}`];
    const ergebnisText = artDerFrage === "reserve"
      ? `Belegt sind ${sumBlocks} von ${basisSize} Adressen; die Reserve beträgt ${reserve} Adressen.`
      : artDerFrage === "netz"
        ? `„${zielName}" braucht ${ziel.hosts} Hosts (Block ${blockGroesse(ziel.praefix)}); der Block beginnt bei ${ziel.netz}.`
        : `„${zielName}" braucht ${ziel.hosts} Hosts (Block ${blockGroesse(ziel.praefix)}); daraus folgt die Maske ${ziel.maske}.`;
    const ergebnisSchritt = ["Ergebnis", ergebnisText, loesungWert];
    const schritte = ap2
      ? [schrittSortieren, schrittBloecke, schrittPlatz,
         ["Reserve prüfen", `Belegt sind ${sumBlocks} von ${basisSize} Adressen; als Reserve bleiben ${reserve}.`, reserve],
         ergebnisSchritt]
      : [schrittSortieren, schrittBloecke, ergebnisSchritt];
    return {
      titel: "Adressplan (VLSM)", frage,
      lage: [
        {label: "Basisnetz", wert: basis},
        {label: "Bedarf", wert: bedarf.map(e => `${e.name}: ${e.hosts} Hosts`).join(" · ")},
      ],
      ...bau,
      rechenweg: rw(schritte),
      erklaerung: `Du planst vom größten Bedarf nach unten: Jede Abteilung bekommt hosts + 2 Adressen (Netz-ID und Broadcast), aufgerundet auf die nächste Zweierpotenz. Die Blöcke werden lückenlos ab ${basisStart} vergeben; was übrig bleibt, ist Reserve. ${artDerFrage === "reserve" ? `Hier bleiben ${reserve} Adressen Reserve.` : `Für „${zielName}" ergibt sich ${loesungWert}.`}`,
      hinweis: hinweisFuer(niveau, z, "Plane vom größten Bedarf nach unten: hosts + 2, dann auf die nächste Zweierpotenz aufrunden und den Block an die nächste freie Blockgrenze legen."),
      visual: {art: "vlsm", preset: {basis, bedarf}},
      quelle: QUELLE_RFC,
    };
  }

  /* --- 8 zusammenfassen (§ 6: AP2, Eingabe auswahl: Supernetz zu n Netzen) --- */
  function aufgabeZusammenfassen({z, niveau}){
    const variante = z.zahl(3);
    let netze;
    if (variante === 2){
      const a = z.zahl(256), b = z.zahl(256);
      netze = [`10.${a}.${b}.0/25`, `10.${a}.${b}.128/25`];
    } else if (variante === 1){
      const x = 4 * z.zahl(50);
      netze = [0, 1, 2, 3].map(i => `192.168.${x + i}.0/24`);
    } else {
      const x = 2 * z.zahl(100);
      netze = [`192.168.${x}.0/24`, `192.168.${x + 1}.0/24`];
    }
    const r = zusammenfassen(netze);
    if (!r.ok) return null;
    const superNetz = `${r.netz}/${r.praefix}`;
    const letzteAdresse = netze[netze.length - 1].split("/")[0];
    const ersteAdresse = netze[0].split("/")[0];
    const erstePraefix = Number(netze[0].split("/")[1]);
    const andere = [
      netze[0],
      `${letzteAdresse}/${r.praefix}`,
      `${r.netz}/${Math.max(0, r.praefix - 2)}`,
      `${r.netz}/${Math.min(32, r.praefix + 1)}`,
    ];
    const bau = auswahl(superNetz, andere, z);
    const frage = variante === 2
      ? "Welche Route fasst die beiden /25-Netze genau zu einem Supernetz zusammen?"
      : variante === 1
        ? "Welche Route fasst die vier /24-Netze genau zusammen?"
        : `Welche Route fasst die Netze ${netze[0]} und ${netze[1]} genau zusammen?`;
    const schritte = [
      ["Netzadressen vergleichen", `Die Netz-IDs ${netze.map(n => n.split("/")[0]).join(", ")} unterscheiden sich erst in den Bit, die nicht mehr gemeinsam sind.`, `${netze.length} Netze`],
      ["Gemeinsame Bits", `Alle Netze teilen sich die ersten ${r.praefix} Bit; deshalb gehört die Route zum Präfix /${r.praefix}.`, `/${r.praefix}`],
      ["Supernetz-Maske", `/${r.praefix} bedeutet die Maske ${praefixZuMaske(r.praefix)}.`, praefixZuMaske(r.praefix)],
      ["Netzadresse prüfen", `Das Supernetz beginnt bei ${r.netz}; alle genannten Netze liegen darin.`, r.netz],
      ["Ergebnis", `Die Route ${superNetz} fasst die Netze genau zusammen.`, superNetz],
    ];
    const abdeckung = netze.length / 2;
    const abdeckungText = abdeckung === 1 ? "ein Netz" : abdeckung === 2 ? "zwei Netze" : `${abdeckung} Netze`;
    return {
      titel: "Zusammenfassen (Route)", frage,
      lage: netze.map((n, i) => ({label: `Netz ${i + 1}`, wert: n})),
      ...bau,
      rechenweg: rw(schritte),
      erklaerung: `Du fasst nur gleich große, lückenlos benachbarte Netze zusammen. Jede Verdopplung der Netzanzahl kostet ein Präfix-Bit: aus zwei /24 wird /23, aus vier /24 wird /22. Hier ergibt sich ${superNetz}; eine Route mit ${r.praefix + 1} Bit würde nur ${abdeckungText} tragen, eine mit weniger Bit wäre zu weit.`,
      hinweis: "",
      visual: {art: "blocklineal", preset: {ip: ersteAdresse, praefix: erstePraefix}},
      quelle: QUELLE_RFC,
    };
  }

  /* --- 9 vlan-port (§ 6: E/AP1, Eingabe auswahl: Access-Port → VLAN) --- */
  function aufgabeVlanPort({z, niveau}){
    const vlanPool = z.mischen([10, 20, 30, 40]);
    const ports = [
      {port: "Fa0/2", vlan: vlanPool[0]},
      {port: "Fa0/5", vlan: vlanPool[1]},
      {port: "Fa0/8", vlan: vlanPool[2]},
    ];
    const lagePorts = ports.map(p => ({label: `Port ${p.port}`, wert: `Access-Port, VLAN ${p.vlan}`}));
    let frage, bau, schritte, hinweis, erklaerung, lage;
    if (niveau === "E"){
      const variante = z.zahl(3);
      if (variante === 0){
        const ziel = ports[z.zahl(3)];
        frage = `Am Switch SW1 ist jeder Access-Port genau einem VLAN zugeordnet. Welcher Port gehört zu VLAN ${ziel.vlan}?`;
        bau = auswahl(ziel.port, ports.filter(p => p !== ziel).map(p => p.port), z);
        schritte = [
          ["Access-Port", "Ein Access-Port gehört zu genau einem VLAN; alle Geräte an diesem Port liegen in derselben Broadcast-Domäne.", "ein VLAN"],
          ["Zuordnung lesen", `In der Tabelle steht ${ziel.port} als Access-Port in VLAN ${ziel.vlan}; die anderen Ports gehören zu anderen VLANs.`, `VLAN ${ziel.vlan}`],
          ["Ergebnis", `Der PC im VLAN ${ziel.vlan} hängt am Port ${ziel.port}.`, ziel.port],
        ];
      } else if (variante === 1){
        const p = ports[z.zahl(3)];
        frage = `In welchem VLAN läuft der Traffic am Access-Port ${p.port}?`;
        bau = auswahl(String(p.vlan), [String(1)].concat(vlanPool.filter(v => v !== p.vlan).map(String)), z);
        schritte = [
          ["Access-Port", "Ein Access-Port gehört zu genau einem VLAN; Frames verlassen den Port ohne Tag.", "ein VLAN"],
          ["Zuordnung lesen", `In der Tabelle steht ${p.port} als Access-Port in VLAN ${p.vlan}.`, `VLAN ${p.vlan}`],
          ["Ergebnis", `Der Traffic am Port ${p.port} läuft in VLAN ${p.vlan}.`, String(p.vlan)],
        ];
      } else {
        const zielVlan = vlanPool[3];
        frage = `Welches Access-VLAN trägst du am Port Fa0/9 ein, damit der PC im VLAN ${zielVlan} landet?`;
        bau = auswahl(String(zielVlan), [String(1)].concat(vlanPool.slice(0, 3).map(String)), z);
        schritte = [
          ["Access-Port", "Ein Access-Port gehört zu genau einem VLAN; das VLAN bestimmt die Broadcast-Domäne.", "ein VLAN"],
          ["Ziel lesen", `Der PC soll im VLAN ${zielVlan} liegen; also muss der Access-Port dieses VLAN tragen.`, `VLAN ${zielVlan}`],
          ["Ergebnis", `Am Port Fa0/9 trägst du die VLAN-ID ${zielVlan} ein.`, String(zielVlan)],
        ];
        /* Ziel-Port und Ziel-VLAN gehören in die lage (§ 5: lage trägt alle Angaben, Review S8). */
        lage = [{label: "Switch", wert: "SW1"}, {label: "Ziel-Port", wert: "Fa0/9"}, {label: "Ziel-VLAN", wert: `VLAN ${zielVlan}`}];
      }
      if (!lage) lage = [{label: "Switch", wert: "SW1"}].concat(lagePorts);
      hinweis = "Lies in der Port-Tabelle die Spalte VLAN: Dort steht die VLAN-ID des Access-Ports.";
      erklaerung = "Du liest die Port-Tabelle: Ein Access-Port gehört zu genau einem VLAN. Geräte an Ports desselben VLANs liegen in derselben Broadcast-Domäne; ein Port in einem anderen VLAN trennt sie.";
    } else {
      const v = vlanPool[0];
      const variante = z.zahl(3);
      if (variante === 0){
        frage = `Welche zwei Einstellungen gehören an Port Fa0/6, damit der PC dort im VLAN ${v} landet?`;
        bau = auswahl(`switchport mode access und switchport access vlan ${v}`, [
          `switchport mode trunk und switchport access vlan ${v}`,
          "switchport mode access und switchport access vlan 1",
          `switchport mode trunk und switchport native vlan ${v}`,
        ], z);
        schritte = [
          ["Port konfigurieren", `switchport mode access setzt den Port als Access-Port; switchport access vlan ${v} trägt das VLAN ein. Ein Trunk-Port gehört nicht an einen PC.`, `access vlan ${v}`],
          ["VLAN-Datenbank", `VLAN ${v} muss in der VLAN-Datenbank vorhanden sein.`, `VLAN ${v}`],
          ["Ergebnis", `Beide Befehle zusammen bringen den PC an Fa0/6 in VLAN ${v}.`, `switchport mode access und switchport access vlan ${v}`],
        ];
        lage = [{label: "Switch", wert: "SW1"}, {label: "Port", wert: "Fa0/6"}, {label: "Ziel", wert: `PC im VLAN ${v}`}];
      } else if (variante === 1){
        lage = [{label: "Bisher", wert: "PC an Fa0/3, Access-VLAN 10"}, {label: "Ziel", wert: "PC an Fa0/6, gleiches VLAN wie vorher"}];
        frage = "Ein PC zieht von Port Fa0/3 auf Port Fa0/6 um und soll im selben VLAN bleiben. Was konfigurierst du an Fa0/6?";
        bau = auswahl("Access-Port in VLAN 10", ["Access-Port in VLAN 1", "Trunk-Port mit Native VLAN 10", "Access-Port in VLAN 20"], z);
        schritte = [
          ["VLAN übernehmen", "Am Port Fa0/3 steht das Access-VLAN 10; dieses VLAN muss der PC behalten. Fa0/6 wird deshalb Access-Port in VLAN 10.", "VLAN 10"],
          ["VLAN-Datenbank", "VLAN 10 ist bereits vorhanden; es muss nur zugeordnet werden.", "VLAN 10 vorhanden"],
          ["Ergebnis", "Fa0/6 wird Access-Port in VLAN 10; der PC bleibt in seiner Broadcast-Domäne.", "Access-Port in VLAN 10"],
        ];
      } else {
        lage = [{label: "Port", wert: "Fa0/7"}, {label: "VLAN-Datenbank", wert: `VLAN ${v} fehlt`}];
        frage = `Am Port Fa0/7 soll VLAN ${v} als Access-VLAN stehen; VLAN ${v} fehlt in der VLAN-Datenbank. Was ist der richtige nächste Schritt?`;
        bau = auswahl(`VLAN ${v} in der VLAN-Datenbank anlegen und danach den Port als Access-Port zuordnen`, [
          "Den Port als Trunk konfigurieren, dann entsteht das VLAN automatisch",
          `Am Port die native VLAN ${v} setzen`,
          "Nichts tun, der Access-Port erzeugt das VLAN selbst",
        ], z);
        schritte = [
          ["VLAN anlegen", `Ein Access-Port gehört zu einem VLAN; das VLAN muss in der VLAN-Datenbank vorhanden sein. Deshalb legst du zuerst VLAN ${v} in der VLAN-Datenbank an.`, `VLAN ${v} anlegen`],
          ["Port zuordnen", `Danach wird Fa0/7 Access-Port in VLAN ${v}.`, `access vlan ${v}`],
          ["Ergebnis", `Erst VLAN ${v} anlegen, dann den Port zuordnen.`, `VLAN ${v} in der VLAN-Datenbank anlegen und danach den Port als Access-Port zuordnen`],
        ];
      }
      hinweis = hinweisFuer(niveau, z, "Ein Access-Port braucht zwei Angaben: den Modus access und die VLAN-ID.");
      erklaerung = "Du baust den Access-Port in Schritten: Er gehört zu genau einem VLAN. Der Modus access ist Pflicht, und das VLAN muss in der VLAN-Datenbank vorhanden sein; erst dann trägt der Port die richtige Broadcast-Domäne.";
    }
    return {
      titel: "VLAN am Port", frage,
      lage,
      ...bau,
      rechenweg: rw(schritte),
      erklaerung,
      hinweis,
      visual: {art: "vlan", preset: {ports: ports.map(p => ({port: p.port, modus: "access", vlan: p.vlan}))}},
      quelle: QUELLE_VLAN,
    };
  }

  /* --- 10 vlan-erreichbar (§ 6: AP1/AP2, Eingabe auswahl: Broadcast-Domäne/Erreichbarkeit) --- */
  function aufgabeVlanErreichbar({z, niveau}){
    const alle = [10, 20, 30, 40];
    let lage, frage, bau, schritte, hinweis, erklaerung, visual;
    if (niveau === "AP1"){
      const v = z.wahl(alle);
      const variante = z.zahl(3);
      if (variante === 2){
        const w = z.wahl(alle.filter(x => x !== v));
        lage = [
          {label: "PC A", wert: `192.168.${v}.11/24 · Fa0/1 · Access-VLAN ${v}`},
          {label: "PC B", wert: `192.168.${v}.12/24 · Fa0/4 · Access-VLAN ${v}`},
          {label: "PC C", wert: `192.168.${w}.13/24 · Fa0/7 · Access-VLAN ${w}`},
        ];
        frage = "Welche PCs können sich am selben Switch direkt erreichen?";
        bau = auswahl("PC A und PC B", ["PC A und PC C", "PC B und PC C", "alle drei PCs"], z);
        schritte = [
          ["VLAN je Port", `PC A und PC B liegen in VLAN ${v}, PC C in VLAN ${w}.`, `VLAN ${v} und VLAN ${w}`],
          ["Broadcast-Domäne", "Nur Ports im selben VLAN liegen in derselben Broadcast-Domäne.", "gleiches VLAN"],
          ["Ergebnis", "PC A und PC B erreichen sich direkt; PC C bleibt getrennt.", bau.loesung.wert],
        ];
      } else {
        const gleich = variante === 0;
        const vB = gleich ? v : z.wahl(alle.filter(x => x !== v));
        lage = [{label: "PC A", wert: `192.168.${v}.11/24 · Fa0/1 · Access-VLAN ${v}`}, {label: "PC B", wert: `192.168.${vB}.12/24 · Fa0/4 · Access-VLAN ${vB}`}];
        frage = "Können sich PC A und PC B direkt über den Switch erreichen?";
        bau = gleich
          ? auswahl("Ja, beide Ports liegen im selben VLAN.", [
              "Nein, verschiedene VLANs trennen die Ports.",
              "Ja, der Switch verbindet alle Ports unabhängig vom VLAN.",
              "Nein, für die Verbindung fehlt ein Trunk.",
            ], z)
          : auswahl("Nein, die Ports liegen in verschiedenen VLANs.", [
              "Ja, beide Ports hängen am selben Switch.",
              "Ja, ein Access-Port kann zwei VLANs gleichzeitig tragen.",
              "Nein, Access-Ports haben keine VLAN-Zuordnung.",
            ], z);
        schritte = [
          ["VLAN je Port", `PC A liegt in VLAN ${v}, PC B in VLAN ${vB}.`, `VLAN ${v} und VLAN ${vB}`],
          ["Broadcast-Domäne", "Nur Ports im selben VLAN liegen in derselben Broadcast-Domäne; ein Switch trennt VLANs.", "gleiches VLAN"],
          ["Ergebnis", gleich ? "Beide Ports liegen im selben VLAN → direkte Verbindung." : "Verschiedene VLANs → keine direkte Verbindung.", bau.loesung.wert],
        ];
      }
      hinweis = hinweisFuer(niveau, z, "Vergleiche die VLAN-IDs der beiden Ports: Gleiches VLAN = gleiche Broadcast-Domäne.");
      erklaerung = "Du vergleichst die VLAN-IDs: Jedes VLAN ist eine eigene Broadcast-Domäne. Zwei Geräte erreichen sich direkt nur, wenn ihre Access-Ports im selben VLAN liegen; für den Weg zwischen VLANs braucht es ein Gerät der Schicht 3.";
    } else {
      const v = z.wahl([10, 20, 30]);
      const variante = z.zahl(3);
      let allowed, vB;
      if (variante === 0){
        allowed = [v, 20, 30].filter((x, i, a) => a.indexOf(x) === i);
        vB = v;
      } else if (variante === 1){
        allowed = [10, 20, 30].filter(x => x !== v);
        vB = v;
      } else {
        allowed = [v];
        vB = [10, 20, 30].filter(x => x !== v)[0];
        allowed = [v, vB];
      }
      lage = [
        {label: "Trunk SW1–SW2", wert: `G0/1 · Allowed VLANs ${allowed.join(", ")} · Native VLAN 1`},
        {label: "PC A", wert: `SW1 Fa0/1 · Access-VLAN ${v}`},
        {label: "PC B", wert: `SW2 Fa0/2 · Access-VLAN ${vB}`},
      ];
      frage = `Können sich PC A (VLAN ${v}) und PC B (VLAN ${vB}) über den Trunk direkt erreichen?`;
      if (variante === 0) bau = auswahl(`Ja, VLAN ${v} ist auf der Allowed-Liste und liegt an beiden Enden an.`, [
        "Nein, das Native VLAN muss dafür gleich sein.",
        "Nein, ein Trunk trägt immer nur ein VLAN.",
        "Ja, der Trunk trägt jedes VLAN ohne Allowed-Liste.",
      ], z);
      else if (variante === 1) bau = auswahl(`Nein, VLAN ${v} ist auf dem Trunk nicht erlaubt.`, [
        "Ja, der Trunk trägt alle VLANs.",
        "Ja, Access-Ports tunneln das VLAN über den Trunk.",
        "Nein, der Trunk ist im Access-Modus.",
      ], z);
      else bau = auswahl("Nein, die VLANs trennen die Broadcast-Domänen.", [
        `Ja, der Trunk verbindet VLAN ${v} und VLAN ${vB}.`,
        "Ja, beide VLANs sind auf dem Trunk erlaubt.",
        "Nein, beide VLANs sind auf dem Trunk nicht erlaubt.",
      ], z);
      schritte = [
        ["Access-Port am ersten Switch", `PC A liegt in VLAN ${v}; der Frame verlässt SW1 mit 802.1Q-Tag für VLAN ${v}.`, `Tag VLAN ${v}`],
        ["Tag auf dem Trunk", "Auf einem Trunk-Port werden Frames mit dem Tag ihres VLANs übertragen.", "Tag bleibt"],
        ["Allowed-Liste prüfen", `Erlaubt sind ${allowed.join(", ")}.`, allowed.join(", ")],
        ["Gegenstelle", `PC B hängt in VLAN ${vB}.`, `VLAN ${vB}`],
        ["Ergebnis", variante === 0
          ? `VLAN ${v} ist erlaubt und liegt auf beiden Seiten an → direkte Verbindung.`
          : variante === 1
            ? `VLAN ${v} fehlt in der Allowed-Liste → der Frame kommt nicht durch.`
            : `Verschiedene VLANs (${v} und ${vB}) → getrennte Broadcast-Domänen.`,
         bau.loesung.wert],
      ];
      hinweis = "";
      erklaerung = "Du verfolgst den Frame über den Trunk: Getaggte Frames laufen nur, wenn ihr VLAN in der erlaubten Liste steht; und selbst dann bleiben verschiedene VLANs getrennte Broadcast-Domänen.";
    }
    return {
      titel: "Gleiches VLAN", frage,
      lage,
      ...bau,
      rechenweg: rw(schritte),
      erklaerung,
      hinweis,
      visual: {art: "vlan", preset: {ports: (niveau === "AP1" ? lage : lage.slice(1)).map((r, i) => ({port: `Fa0/${i + 1}`, modus: "access"}))}},
      quelle: QUELLE_VLAN,
    };
  }

  /* --- 11 trunk (§ 6: AP2, Eingabe auswahl: Tag/Native/allowed) --- */
  function aufgabeTrunk({z, niveau}){
    const native = z.wahl([1, 10, 20, 30]);
    const pool = z.mischen([10, 20, 30, 40, 50]);
    /* Typischer Cisco-Zustand: das Native VLAN steht auch in der Allowed-Liste (Review S7). */
    const allowed = [native].concat(pool.filter(x => x !== native).slice(0, 3)).sort((a, b) => a - b);
    /* Optionen immer kanonisch als „VLAN n“ (Review B3: „1“ und „VLAN 1“ dürfen nicht zweimal
       dasselbe bedeuten); „wird verworfen“ ist der einzige Nicht-VLAN-Fall. */
    const vlanText = v => "VLAN " + v;
    const trunkZeile = () => `Native VLAN ${native} · Allowed VLANs ${allowed.join(", ")}`;
    const bauFuer = (richtigVlan, extraVlans) => {
      const richtig = typeof richtigVlan === "number" ? vlanText(richtigVlan) : "wird verworfen";
      const andere = [];
      for (const v of [native].concat(allowed).concat(extraVlans || [])) {
        const t = vlanText(v);
        if (t !== richtig && !andere.includes(t)) andere.push(t);
      }
      if (!andere.includes("wird verworfen")) andere.push("wird verworfen");
      return auswahl(richtig, andere, z);
    };
    const variante = z.zahl(4);
    let lage, frage, bau, schritte;
    if (variante === 0){
      frage = "In welchem VLAN landet ein ungetaggter Frame am Trunk-Port G0/1?";
      lage = [
        {label: "Trunk G0/1", wert: trunkZeile()},
        {label: "Frame", wert: "ungetaggt (ohne 802.1Q-Tag)"},
      ];
      bau = bauFuer(native, [1]);
      schritte = [
        ["Access und Trunk", "Ein Access-Port schickt Frames ohne Tag; ein Trunk-Port taggt Frames mit ihrer VLAN-ID.", "Tag je VLAN"],
        ["Tag prüfen", "Der Frame kommt ohne Tag an.", "kein Tag"],
        ["Allowed-Liste", `Erlaubt sind ${allowed.join(", ")}.`, allowed.join(", ")],
        ["Native VLAN", `Frames ohne Tag gehören zum Native VLAN ${native}.`, `Native VLAN ${native}`],
        ["Ergebnis", `Der ungetaggte Frame läuft in VLAN ${native}.`, vlanText(native)],
      ];
    } else if (variante === 1){
      const tagged = allowed[z.zahl(allowed.length)];
      frage = `Ein Frame mit 802.1Q-Tag für VLAN ${tagged} kommt am Trunk G0/1 an. In welchem VLAN läuft er weiter?`;
      lage = [
        {label: "Trunk G0/1", wert: trunkZeile()},
        {label: "Frame", wert: `getaggt für VLAN ${tagged}`},
      ];
      bau = bauFuer(tagged, [1]);
      schritte = [
        ["Access und Trunk", "Auf einem Trunk tragen Frames ein 802.1Q-Tag mit ihrer VLAN-ID.", "Tag je VLAN"],
        ["Tag prüfen", `Der Frame trägt das Tag für VLAN ${tagged}.`, `Tag VLAN ${tagged}`],
        ["Allowed-Liste", `Erlaubt sind ${allowed.join(", ")}; VLAN ${tagged} ist dabei.`, `VLAN ${tagged} erlaubt`],
        ["Native VLAN", "Das Native VLAN gilt nur für Frames ohne Tag; dieser Frame ist getaggt.", `Native VLAN ${native}`],
        ["Ergebnis", `Der Frame läuft in VLAN ${tagged} weiter.`, vlanText(tagged)],
      ];
    } else if (variante === 2){
      const tagged = [60, 70, 80].find(x => !allowed.includes(x) && x !== native) || 70;
      frage = `Ein Frame mit 802.1Q-Tag für VLAN ${tagged} kommt am Trunk G0/1 an. Was macht der Switch damit?`;
      lage = [
        {label: "Trunk G0/1", wert: trunkZeile()},
        {label: "Frame", wert: `getaggt für VLAN ${tagged}`},
      ];
      bau = bauFuer("wird verworfen", [tagged]);
      schritte = [
        ["Access und Trunk", "Auf einem Trunk tragen Frames ein 802.1Q-Tag mit ihrer VLAN-ID.", "Tag je VLAN"],
        ["Tag prüfen", `Der Frame trägt das Tag für VLAN ${tagged}.`, `Tag VLAN ${tagged}`],
        ["Allowed-Liste", `Erlaubt sind ${allowed.join(", ")}; VLAN ${tagged} fehlt.`, `VLAN ${tagged} nicht erlaubt`],
        ["Native VLAN", "Das Native VLAN gilt nur für ungetaggte Frames.", `Native VLAN ${native}`],
        ["Ergebnis", `VLAN ${tagged} ist nicht erlaubt — der Frame wird verworfen.`, "wird verworfen"],
      ];
    } else {
      const n1 = native, n2 = z.wahl([1, 10, 20, 30].filter(x => x !== native));
      frage = "In welchem VLAN landet ein ungetaggter Frame von SW1 auf SW2?";
      lage = [
        {label: "SW1 Trunk G0/1", wert: `Native VLAN ${n1}`},
        {label: "SW2 Trunk G0/1", wert: `Native VLAN ${n2}`},
        {label: "Frame", wert: "ungetaggt von SW1 nach SW2"},
      ];
      bau = bauFuer(n2, [n1, 1]);
      schritte = [
        ["Access und Trunk", "Ein ungetaggter Frame gehört auf dem Trunk zum Native VLAN des sendenden Switches.", `Native VLAN ${n1}`],
        ["Tag prüfen", "Der Frame trägt kein Tag.", "kein Tag"],
        ["Allowed-Liste", "Für ungetaggte Frames spielt die Allowed-Liste keine Rolle.", "ohne Tag"],
        ["Native VLAN der Gegenstelle", `SW2 legt ungetaggte Frames in sein Native VLAN ${n2}.`, `Native VLAN ${n2}`],
        ["Ergebnis", `Der Frame landet auf SW2 in VLAN ${n2} — die Native VLANs passen nicht zusammen.`, vlanText(n2)],
      ];
    }
    return {
      titel: "Trunk und Tagging", frage,
      lage,
      ...bau,
      rechenweg: rw(schritte),
      erklaerung: "Du verfolgst den Frame: Ein Trunk überträgt mehrere VLANs; jeder Frame trägt seine VLAN-ID als 802.1Q-Tag. Frames ohne Tag gehören zum Native VLAN — beide Seiten müssen dasselbe Native VLAN haben. Getaggte Frames kommen nur durch, wenn ihr VLAN in der Allowed-Liste steht.",
      hinweis: "",
      visual: {art: "vlan", preset: {trunk: {native, allowed}}},
      quelle: QUELLE_VLAN,
    };
  }

  /* Die 11 Typen; je Eintrag eine reine Funktion, die nur vom gesäten Zufall abhängt. */
  const GENERATOREN = {
    netzid: aufgabeNetzid,
    broadcast: aufgabeBroadcast,
    hosts: aufgabeHosts,
    maske: aufgabeMaske,
    block: aufgabeBlock,
    subnetze: aufgabeSubnetze,
    vlsm: aufgabeVlsm,
    zusammenfassen: aufgabeZusammenfassen,
    "vlan-port": aufgabeVlanPort,
    "vlan-erreichbar": aufgabeVlanErreichbar,
    trunk: aufgabeTrunk,
  };

  /* Eine Aufgabe bauen — deterministisch aus (art, niveau, seed), ohne Speicher, Uhr oder L.* */
  function aufgabe(optionen){
    try {
      const o = optionen && typeof optionen === "object" ? optionen : {};
      const info = ARTEN.find(a => a.id === o.art);
      if (!info) return null;
      const niveau = STUFEN.includes(o.niveau) ? o.niveau : "E";
      if (!info.stufen.includes(niveau)) return null;
      const seed = typeof o.seed === "number" && isFinite(o.seed) ? (o.seed >>> 0) : 1;
      const g = GENERATOREN[info.id];
      if (typeof g !== "function") return null;
      const teile = g({z: rng(seed), niveau, seed});
      if (!teile || !teile.loesung) return null;
      const idx = String(seed % 10000).padStart(4, "0");
      /* § 5 „Schritte bis zur Lösung": E = 1, AP1 = 2–3, AP2 = 3–5. Das ist die didaktische
         Lösungstiefe (additives Feld); der angezeigte Rechenweg bleibt davon getrennt 3–6 Schritte
         nach § 2.1. Beides zusammen widerspricht sich nicht — der Rechenweg erklärt mehr, als zur
         Lösung nötig ist. */
      const loesungsschritte = niveau === "E" ? 1 : niveau === "AP1" ? 2 + (seed % 2) : 3 + (seed % 3);
      const hinweis = niveau === "E"
        ? (teile.hinweis || STANDARD_HINWEIS)
        : niveau === "AP1" ? (teile.hinweis || "") : "";
      return {
        id: `${info.id}-${niveau}-${idx}`,
        art: info.id, niveau, skill: info.skills[0],
        titel: teile.titel || info.titel,
        frage: teile.frage,
        lage: teile.lage,
        eingabe: teile.eingabe,
        loesung: teile.loesung,
        rechenweg: teile.rechenweg,
        loesungsschritte,
        erklaerung: teile.erklaerung,
        hinweis,
        visual: teile.visual || null,
        quelle: teile.quelle || QUELLE_RFC,
      };
    } catch (e) { return null; }
  }

  /* Mehrere Aufgaben gemischt, ohne Doppelte. Reihenfolge und Inhalt nur aus dem Seed. */
  function satz(optionen){
    try {
      const o = optionen && typeof optionen === "object" ? optionen : {};
      const niveau = STUFEN.includes(o.niveau) ? o.niveau : "E";
      const anzahl = Math.max(0, Math.min(40, Math.floor(geradeZahl(o.anzahl, 6))));
      const arten = Array.isArray(o.arten) && o.arten.length ? o.arten : null;
      const seed = typeof o.seed === "number" && isFinite(o.seed) ? (o.seed >>> 0) : 1;
      if (anzahl === 0) return [];
      const kandidaten = ARTEN.filter(a => a.stufen.includes(niveau) && (!arten || arten.includes(a.id)));
      if (!kandidaten.length) return [];
      const z = rng(seed);
      const reihe = [];
      const liste = [], gesehen = new Set();
      let versuche = 0;
      while (liste.length < anzahl && versuche < anzahl * 80) {
        if (!reihe.length) reihe.push(...z.mischen(kandidaten.map(a => a.id)));
        const art = reihe.shift();
        const s = (seed + versuche * 7919 + 1) >>> 0;
        versuche++;
        const auf = aufgabe({art, niveau, seed: s});
        if (!auf) continue;
        const sig = auf.id + "|" + JSON.stringify(auf.lage) + "|" + auf.loesung.wert;
        if (gesehen.has(sig)) continue;
        gesehen.add(sig);
        liste.push(auf);
      }
      return liste;
    } catch (e) { return []; }
  }

  /* ======================================================================
     5 · Prüfen (wirft nie, Formattoleranz) und Verbuchen (einziger Schreibweg)
     ====================================================================== */

  function anzeige(x){
    if (x == null) return "";
    if (typeof x === "string") return x.trim();
    if (typeof x === "number" && isFinite(x)) return String(x);
    return String(x);
  }
  /* Zahl aus "4", " 4 ", "4 Hosts" — Ausdrücke wie "2^2" werden bewusst nicht gerechnet. */
  function zahlAusText(x){
    if (typeof x === "number") return isFinite(x) ? x : null;
    if (typeof x !== "string") return null;
    const t = x.trim().replace(/\s+/g, " ");
    if (/^[+-]?\d+$/.test(t)) return Number(t);
    const m = /^[+-]?\d+ ?(hosts?|host-adressen?|adressen|netze?|subnetze?|teilnetze?|bits?)$/i.exec(t);
    return m ? Number(m[0].match(/[+-]?\d+/)[0]) : null;
  }
  /* Maske aus "/26", "26", " 255.255.255.192 " — sonst null. */
  function maskeAusText(x){
    if (typeof x === "number") return Number.isInteger(x) && x >= 0 && x <= 32 ? x : null;
    if (typeof x !== "string") return null;
    const t = x.trim();
    if (!t) return null;
    if (/^\/?\d{1,2}$/.test(t)) return maskeZuPraefix(t);
    return maskeZuPraefix(t);
  }
  function auswahlIndex(aufgabe, x){
    const optionen = aufgabe && aufgabe.eingabe && Array.isArray(aufgabe.eingabe.optionen) ? aufgabe.eingabe.optionen : [];
    if (!optionen.length) return null;
    if (typeof x === "number" && Number.isInteger(x)) {
      if (x >= 0 && x < optionen.length) return x;
      if (x >= 1 && x <= optionen.length) return x - 1;
      return null;
    }
    if (typeof x !== "string") return null;
    const t = x.trim();
    const direkt = optionen.findIndex(o => anzeige(o && o.text) === t);
    if (direkt >= 0) return direkt;
    const buchstabe = /^([A-Za-z])$/.exec(t);
    if (buchstabe) { const i = buchstabe[1].toUpperCase().charCodeAt(0) - 65; if (i >= 0 && i < optionen.length) return i; }
    if (/^\d+$/.test(t)) { const i = Number(t); if (i >= 0 && i < optionen.length) return i; }
    return null;
  }

  function pruefen(aufgabeWert, antwortWert){
    const leer = {richtig: false, soll: "", angenommen: "", rechenweg: [], erklaerung: "", hinweis: ""};
    try {
      const auf = aufgabeWert && typeof aufgabeWert === "object" ? aufgabeWert : null;
      if (!auf) return leer;
      const loesung = auf.loesung && typeof auf.loesung === "object" ? auf.loesung : {};
      const eingabe = auf.eingabe && typeof auf.eingabe === "object" ? auf.eingabe : {};
      const ergebnis = {
        richtig: false,
        soll: anzeige(loesung.text != null ? loesung.text : loesung.wert),
        angenommen: "",
        rechenweg: Array.isArray(auf.rechenweg) ? auf.rechenweg : [],
        erklaerung: anzeige(auf.erklaerung),
        hinweis: anzeige(auf.hinweis),
      };
      let antwort = antwortWert;
      if (antwort && typeof antwort === "object" && !Array.isArray(antwort))
        antwort = antwort.wert != null ? antwort.wert : antwort.antwort != null ? antwort.antwort : antwort.text != null ? antwort.text : "";
      if (eingabe.art === "auswahl") {
        const index = auswahlIndex(auf, antwort);
        const optionen = Array.isArray(eingabe.optionen) ? eingabe.optionen : [];
        ergebnis.angenommen = index != null && optionen[index] ? anzeige(optionen[index].text) : anzeige(antwort);
        const sollIndex = optionen.findIndex(o => anzeige(o && o.text) === anzeige(loesung.wert) || anzeige(o && o.text) === anzeige(loesung.text));
        ergebnis.richtig = !!(index != null && sollIndex >= 0 && index === sollIndex);
        return ergebnis;
      }
      ergebnis.angenommen = anzeige(antwort);
      if (eingabe.art === "ip") {
        const soll = ipMitPraefix(anzeige(loesung.wert));
        const a = ipMitPraefix(anzeige(antwort));
        ergebnis.richtig = !!(soll && a && soll.zahl === a.zahl);
        return ergebnis;
      }
      if (eingabe.art === "zahl") {
        const soll = zahlAusText(loesung.wert);
        const a = zahlAusText(antwort);
        ergebnis.richtig = soll != null && a != null && soll === a;
        return ergebnis;
      }
      if (eingabe.art === "maske") {
        const soll = maskeAusText(loesung.wert);
        const a = maskeAusText(antwort);
        ergebnis.richtig = soll != null && a != null && soll === a;
        /* Anzeige der kanonischen Form: Präfix oder Dotted, je nach Lösung. */
        return ergebnis;
      }
      ergebnis.richtig = anzeige(antwort) === anzeige(loesung.wert);
      return ergebnis;
    } catch (e) { return leer; }
  }

  /* Einziger Schreibweg: L.ueben/L.fehler (Lernstand) und store "subnetz" (Fortschritt). */
  function antwort(aufgabeWert, richtig, optionen){
    let lern = null;
    const neuereModule = [];
    try {
      const auf = aufgabeWert && typeof aufgabeWert === "object" && typeof aufgabeWert.art === "string" ? aufgabeWert : null;
      if (!auf) return {lern: null, fortschritt: fortschritt(), neuereModule};
      const info = ARTEN.find(a => a.id === auf.art);
      if (!info) return {lern: null, fortschritt: fortschritt(), neuereModule};
      const niveau = STUFEN.includes(auf.niveau) ? auf.niveau : "E";
      const skill = info.skills[0];
      const hilfe = !!(optionen && optionen.hilfe);
      const ok = !!richtig;
      if (!trocken()) {
        if (typeof L !== "undefined" && L && typeof L.ueben === "function") {
          try {
            if (typeof Spiel.skillsRegistrieren === "function") Spiel.skillsRegistrieren();
            const r = L.ueben(skill, ok, {hilfe});
            lern = {vorher: geradeZahl(r && r.vorher, 0), nachher: geradeZahl(r && r.nachher, 0)};
            if (!ok && typeof L.fehler === "function") L.fehler("labor-subnetz", skill, `${auf.titel || info.titel} (${auf.id || "ohne-ID"})`);
          } catch (e) { /* Lernmotor fehlt oder klemmt: Verbuchung darf die Aufgabe nicht abbrechen */ }
        }
        const d = daten();
        d.gesamt.richtig += ok ? 1 : 0;
        d.gesamt.falsch += ok ? 0 : 1;
        d.gesamt.serie = ok ? d.gesamt.serie + 1 : 0;
        for (const id of moduleFuer(auf.art, niveau)) {
          const m = istObjekt(d.module[id]) ? d.module[id] : {status: "neu", richtig: 0, falsch: 0, serie: 0};
          const vorher = statusRang(STATUS.includes(m.status) ? m.status : "neu");
          let status = STATUS.includes(m.status) ? m.status : "neu";
          m.richtig = Math.max(0, Math.floor(geradeZahl(m.richtig, 0))) + (ok ? 1 : 0);
          m.falsch = Math.max(0, Math.floor(geradeZahl(m.falsch, 0))) + (ok ? 0 : 1);
          m.serie = ok ? Math.max(0, Math.floor(geradeZahl(m.serie, 0))) + 1 : 0;
          m.zuletzt = String(auf.id || "");
          if (ok) { if (statusRang(status) < statusRang("geuebt")) status = "geuebt"; }
          else if (status === "sicher") status = "geuebt";
          else if (statusRang(status) < statusRang("gelesen")) status = "gelesen";
          m.status = status;
          d.module[id] = m;
          if (statusRang(status) > vorher) neuereModule.push(id);
        }
        /* Lernspiele (§ 2.4/§ 8): Bestwert und Rundenzahl gehören in denselben Store, aber nicht in die
           Modul-Achse. W4 übergibt dafür optional {spiel:{id, punkte}} — additive Option, die
           verbindliche Signatur antwort(aufgabe, richtig, {hilfe}) bleibt unverändert gültig. */
        const spielOpts = optionen && optionen.spiel && typeof optionen.spiel === "object" && !Array.isArray(optionen.spiel) ? optionen.spiel : null;
        if (spielOpts && typeof spielOpts.id === "string" && spielOpts.id) {
          const s = istObjekt(d.spiele[spielOpts.id]) ? d.spiele[spielOpts.id] : {bestwert: 0, runden: 0};
          const punkte = Number(spielOpts.punkte);
          if (isFinite(punkte)) s.bestwert = Math.max(Math.max(0, geradeZahl(s.bestwert, 0)), punkte);
          s.runden = Math.max(0, Math.floor(geradeZahl(s.runden, 0))) + 1;
          d.spiele[spielOpts.id] = s;
        }
        datenSchreiben(d);
      }
      try { if (typeof Spiel.melden === "function") Spiel.melden("subnetz-antwort", {id: auf.id || "", art: auf.art, niveau, richtig: ok, hilfe, skill}); } catch (e) { /* stumm */ }
    } catch (e) { /* nie werfen */ }
    return {lern, fortschritt: fortschritt(), neuereModule};
  }

  return {
    VERSION, STUFEN, ARTEN,
    rechnen, maskeZuPraefix, praefixZuMaske, gleichesNetz, plan, zusammenfassen,
    aufgabe, satz, pruefen, antwort, fortschritt, modulSetzen, zuruecksetzen,
  };
})();
