"use strict";
/* ---------- Kurzübung mit echtem Kontext (Runde 6, W1; Entwurf „Kurzübung mit Kontext" § 2 und § 3) ----------
   Spiel.kurzfrage.fuer(inst, {niveau} = {}) → frage | null
   frage = {id, titel, frage, lage:[{label, wert}], optionen:[{text, richtig}], erklaerung, ort}

   WOZU. Die Leiste zeigte eine generische Mini-Frage ohne Netz („Antwortet 10.0.0.1 auf einen Ping aus
   dem LAN?"). Sie war mit dem gezeigten Wissen nicht lösbar, weil das Netz des Auftrags unsichtbar blieb.
   Diese Kurzübung entsteht deshalb aus dem ECHTEN Netz der offenen Instanz: Jede Frage trägt ihre Lage
   (2–4 Zeilen) selbst mit, und die richtige Antwort ist aus genau diesen Zeilen ableitbar.

   VORLAGEN (Entwurf § 3, alle aus inst.netz):
     netz      zwei Hosts – müssen ihre Pakete über einen Router?      (IP.gleichesNetz)
     maske     ein Host – wie lautet seine Netzadresse?                (IP.netz/Broadcast/Praefix)
     gateway   ein Host – liegt sein Gateway im eigenen Netz?          (IP.gleichesNetz(ip, gw, maske))
     portmodus Switch-Port – welches VLAN trägt er, was darf darüber?  (running.ports)
     zustand   Gerät/Port – was folgt aus dem gezeigten Zustand?       (g.an, Kabel, shutdown)
   Niveau: E nur netz/zustand, AP1 zusätzlich maske/gateway, AP2 zusätzlich portmodus.

   EHRLICH UND UNSCHÄDLICH.
   · Nur echte Daten: inst.netz, Modell (Kabel, Ports, adressen), IP.*, Sim.adresse, g.an,
     g.running.ports/.if, Spiel.defVon(inst).ziele, Spiel.niveauVon(inst).
   · NIE die Lösung des Auftrags: keine Injektor-Art, kein Grund-Code, keine Diagnose. Was nachweislich
     am Fehler steht (Spiel.plan.diff SOLL ↔ Startnetz, das Muster von Spiel.verdacht), ist kein Subjekt
     der Frage; betroffene Fragearten (Maske/Gateway) fallen dann aus. Fehlt der Plan, bleiben die
     Plausibilitätsregeln der Vorlagen (z. B. Gateway nur im eigenen Netz) – nie ein Lösungssatz.
   · DETERMINISTISCH: Samen aus inst.iid, Zufall ausschließlich über Zufall() (src/kern/basis.js);
     kein Math.random, keine Uhr. Zweimal gefragt = dieselbe Frage.
   · Kein verwertbares Netz (kein Auftrag, keine einzige gültige Host-Adresse) → null. Die Leiste zeigt
     dann keinen Quiz, sondern den Weg ins Labor (Entwurf § 2/§ 4).
   Reines Modul: kein DOM, keine Seiteneffekte, LF-Zeilenenden. */
Spiel.kurzfrage = (() => {
  const K = {};
  /* Die fünf Vorlagen des Vertrags und die Niveau-Zuordnung (Entwurf § 2/§ 3). */
  K.VORLAGEN = ["netz", "maske", "gateway", "portmodus", "zustand"];
  K.NIVEAU = {
    E: ["netz", "zustand"],
    AP1: ["netz", "maske", "gateway", "zustand"],
    AP2: ["netz", "maske", "gateway", "portmodus", "zustand"],
  };
  /* Grenzen der Leiste (Entwurf § 4: Frage 2–3 Zeilen, drei Antwortflächen, alles vollständig sichtbar). */
  K.GRENZEN = {LAGE: [2, 4], FRAGE: 170, OPTION: 120, ERKLAERUNG: 340};

  const text = x => String(x == null ? "" : x).trim();
  const nummer = x => typeof x === "number" && isFinite(x) ? x : null;

  /* Determinismus: der Samen kommt aus der Instanz-ID (Vertrag § 2), nie aus der Uhr. */
  function saat(inst){
    if (inst && inst.iid != null && inst.iid !== "") return "kurzfrage:" + inst.iid;
    const ticket = inst && inst.ticketId != null ? inst.ticketId : "";
    const seed = inst && inst.seed != null ? inst.seed : "";
    return "kurzfrage:" + ticket + ":" + seed;
  }

  function geraet(netz, id){
    return netz && netz.geraete && id != null ? netz.geraete[id] || null : null;
  }
  function istHost(g){ return !!(g && typeof Modell !== "undefined" && Modell.HOST && Modell.HOST[g.typ]); }
  function nameVon(g, id){ return g && text(g.name) ? text(g.name) : text(id); }
  function defVon(inst){
    try { return typeof Spiel.defVon === "function" ? Spiel.defVon(inst) : null; } catch (e) { return null; }
  }

  /* ---------- Adressen: nur echte, gültige Host-Adressen ----------
     Sim.adresse kennt die Laufzeit (DHCP, ungültige Maske); die Konfiguration ist der Rückfall. */
  function adresse(netz, id){
    const g = geraet(netz, id);
    if (!g || !istHost(g)) return null;
    let a = null;
    try { if (typeof Sim !== "undefined" && typeof Sim.adresse === "function") a = Sim.adresse(netz, id); } catch (e) { a = null; }
    if (a && IP.gueltig(a.ip) && IP.maskeGueltig(a.maske)) return {ip: a.ip, maske: a.maske, gw: text(a.gw)};
    let liste = [];
    try { liste = typeof Modell !== "undefined" && Modell.adressen ? Modell.adressen(g) : []; } catch (e) { liste = []; }
    const k = liste.find(x => x && IP.gueltig(x.ip) && IP.maskeGueltig(x.maske));
    if (!k) return null;
    const ifc = (g.running && g.running.if && g.running.if[k.port]) || {};
    return {ip: k.ip, maske: k.maske, gw: text(ifc.gw)};
  }
  function hosts(netz){
    const liste = [];
    for (const g of Object.values((netz && netz.geraete) || {})) {
      if (!istHost(g)) continue;
      const a = adresse(netz, g.id);
      if (a) liste.push({g, a});
    }
    return liste.sort((x, y) => String(x.g.id).localeCompare(String(y.g.id)));
  }
  function hatAdresse(netz){
    for (const g of Object.values((netz && netz.geraete) || {})) if (istHost(g) && adresse(netz, g.id)) return true;
    return false;
  }

  /* Ziele des Auftrags (Vertrag § 3: „bevorzugt Ziel-Geräte"). Namen oder IPs, die kein Gerät sind, fallen weg. */
  function zielSet(inst, netz){
    const def = defVon(inst), s = new Set();
    for (const z of (def && Array.isArray(def.ziele) ? def.ziele : [])) {
      for (const id of [z && z.von, z && z.nach]) if (id && geraet(netz, id)) s.add(id);
    }
    return s;
  }

  /* ---------- Fehlerlage (nur zum AUSKLAMMERN, nie zum Verraten) ----------
     Spiel.plan.diff(SOLL, Startnetz) zeigt wie Spiel.verdacht, welche Geräte/Ports vom gesunden Netz
     abweichen. Diese Stellen werden nicht Subjekt einer Frage; wurde die Maske oder das Gateway
     verbrochen, fällt die betroffene Frageart ganz aus (sie könnte die richtige Zahl zeigen).
     Ohne Spiel.plan bleibt die Lage leer – dann schützen die Plausibilitätsregeln der Vorlagen. */
  const FEHLER_CACHE = typeof WeakMap === "function" ? new WeakMap() : null;
  function leereLage(){ return {adr: new Set(), l1: new Set(), l1Ports: new Set(), portKonfig: new Set(), flags: {gw: false, maske: false}}; }
  function fehlerLage(inst){
    if (FEHLER_CACHE && inst && typeof inst === "object" && FEHLER_CACHE.has(inst)) return FEHLER_CACHE.get(inst);
    const lage = leereLage();
    try {
      const P = typeof Spiel !== "undefined" ? Spiel.plan : null;
      const start = typeof Spiel.startNetzVon === "function" ? Spiel.startNetzVon(inst) : null;
      if (P && typeof P.sollNetz === "function" && typeof P.diff === "function" && start) {
        for (const d of (P.diff(P.sollNetz(inst), start) || [])) {
          if (!d || !d.geraet) continue;
          /* Kabel fehlt/zuviel: beide Enden sind auf Schicht 1 betroffen. */
          if (d.kabel) {
            lage.l1.add(d.geraet);
            if (d.gegen && d.gegen.geraet) lage.l1.add(d.gegen.geraet);
            if (d.port) lage.l1Ports.add(d.geraet + ":" + d.port);
            if (d.gegen && d.gegen.port) lage.l1Ports.add(d.gegen.geraet + ":" + d.gegen.port);
            continue;
          }
          const pfad = text(d.pfad);
          if (pfad === "an") { lage.l1.add(d.geraet); continue; }
          const mPort = /^ports\.([^.]+)\.([^.]+)$/.exec(pfad);
          if (mPort) {
            const schluessel = d.geraet + ":" + mPort[1];
            if (mPort[2] === "shutdown") lage.l1Ports.add(schluessel);
            else lage.portKonfig.add(schluessel);
            continue;
          }
          /* Adressfelder: IP, Maske, Gateway (auch Subinterfaces wie if.Gi0/0.10.gw). */
          if (/\.ip$/.test(pfad) || /\.maske$/.test(pfad) || /\.gw$/.test(pfad)) lage.adr.add(d.geraet);
          if (/\.gw$/.test(pfad)) lage.flags.gw = true;
          if (/\.maske$/.test(pfad)) lage.flags.maske = true;
        }
      }
    } catch (e) { /* Headless ohne Plan: leere Lage, kein Wurf in die Leiste */ }
    if (FEHLER_CACHE) { try { FEHLER_CACHE.set(inst, lage); } catch (e) { /* eingefrorene Instanz */ } }
    return lage;
  }

  /* ---------- Bausteine der Frage ---------- */
  function optionen(richtig, falsche, z){
    const liste = [{text: text(richtig), richtig: true}];
    for (const f of falsche) liste.push({text: text(f), richtig: false});
    const sauber = liste.every(o => o.text) && new Set(liste.map(o => o.text)).size === liste.length;
    return sauber ? z.mischen(liste) : null;
  }

  /* Prüft die Vertragsform und gibt die Frage aus – oder null (eine unfertige Frage ist kein Feature). */
  function bauen(o){
    const lage = (o.lage || []).map(z => ({label: text(z && z.label), wert: text(z && z.wert)})).filter(z => z.label && z.wert);
    const frage = {
      id: text(o.id), titel: text(o.titel), frage: text(o.frage), lage,
      optionen: Array.isArray(o.optionen) ? o.optionen : [], erklaerung: text(o.erklaerung), ort: o.ort || null,
    };
    if (!K.VORLAGEN.includes(frage.id) || !frage.titel || !frage.frage || !frage.erklaerung) return null;
    if (lage.length < K.GRENZEN.LAGE[0] || lage.length > K.GRENZEN.LAGE[1]) return null;
    if (frage.optionen.length !== 3 || frage.optionen.filter(o => o && o.richtig === true).length !== 1) return null;
    if (frage.optionen.some(o => !o || !text(o.text))) return null;
    if (new Set(frage.optionen.map(o => text(o.text))).size !== 3) return null;
    if (frage.frage.length > K.GRENZEN.FRAGE || frage.erklaerung.length > K.GRENZEN.ERKLAERUNG) return null;
    if (frage.optionen.some(o => text(o.text).length > K.GRENZEN.OPTION)) return null;
    if (frage.ort) {
      if (!geraet(o.netz, frage.ort.geraet)) return null;
      if (frage.ort.art === "port") { if (!text(frage.ort.port)) return null; }
      else if (frage.ort.art !== "geraet") return null;
    }
    return frage;
  }

  const maskeText = m => IP.maskeGueltig(m) ? m + " (/" + IP.praefix(m) + ")" : text(m);
  const adrKurz = a => a.ip + " / " + a.maske;

  /* ---------- 1 · netz: zwei Hosts, ein Netz? ---------- */
  function baueNetz(inst, netz, lage, z){
    const def = defVon(inst), ziele = zielSet(inst, netz);
    const kandidaten = hosts(netz).filter(h => !lage.adr.has(h.g.id) && !lage.l1.has(h.g.id));
    const paare = [];
    for (let i = 0; i < kandidaten.length; i++) {
      for (let j = i + 1; j < kandidaten.length; j++) {
        const A = kandidaten[i], B = kandidaten[j];
        /* Ungleiche Masken: die Antwort wäre richtungsabhängig – solche Paare bleiben außen vor. */
        if (A.a.maske !== B.a.maske) continue;
        if (A.a.ip === B.a.ip) continue;
        const wert = (ziele.has(A.g.id) ? 2 : 0) + (ziele.has(B.g.id) ? 2 : 0);
        paare.push({A, B, wert});
      }
    }
    if (!paare.length) return null;
    const best = Math.max(...paare.map(p => p.wert));
    const reihe = paare.filter(p => p.wert === best).sort((x, y) =>
      (x.A.g.id + "|" + x.B.g.id).localeCompare(y.A.g.id + "|" + y.B.g.id));
    const {A, B} = reihe[z.zahl(reihe.length)];
    const cidrA = IP.cidr(A.a.ip, A.a.maske), cidrB = IP.cidr(B.a.ip, B.a.maske);
    if (!cidrA || !cidrB) return null;
    const gleich = IP.gleichesNetz(A.a.ip, B.a.ip, A.a.maske);
    const opt = gleich
      ? optionen("Nein – beide liegen in " + cidrA + ", ein Router ist dafür nicht nötig",
        ["Ja – der Router ist an jedem Paket zwischen zwei Rechnern beteiligt",
         "Ja – ohne Standardgateway erreicht kein Rechner den anderen"], z)
      : optionen("Ja – " + B.g.name + " liegt in " + cidrB + ", also außerhalb von " + cidrA,
        ["Nein – der Switch verbindet beide Netze direkt miteinander",
         "Nein – gleiche Maske heißt immer auch gleiches Netz"], z);
    if (!opt) return null;
    const erklaerung = gleich
      ? "Mit der Maske " + A.a.maske + " gehören beide Adressen zu " + cidrA + ". Ein Ziel im eigenen Netz wird direkt per ARP angesprochen – ein Router ist nicht im Weg."
      : "Die Maske " + A.a.maske + " schneidet " + cidrA + " aus. " + B.g.name + " liegt mit " + B.a.ip + " in " + cidrB + " – dafür braucht der Versand das Standardgateway.";
    return bauen({
      id: "netz", titel: "Gleiches Netz?", netz,
      frage: "Müssen Pakete von " + nameVon(A.g, A.g.id) + " zu " + nameVon(B.g, B.g.id) + " über einen Router laufen?",
      lage: [
        {label: nameVon(A.g, A.g.id), wert: adrKurz(A.a)},
        {label: nameVon(B.g, B.g.id), wert: adrKurz(B.a)},
      ],
      optionen: opt, erklaerung, ort: {art: "geraet", geraet: A.g.id},
    });
  }

  /* ---------- 2 · maske: Netzadresse eines Hosts ---------- */
  function baueMaske(inst, netz, lage, z){
    if (lage.flags.maske) return null;                       /* Fehler an einer Maske: nicht die Maske üben */
    const kandidaten = hosts(netz).filter(h => !lage.adr.has(h.g.id) && !lage.l1.has(h.g.id) && IP.praefix(h.a.maske) > 0);
    if (!kandidaten.length) return null;
    const h = kandidaten[z.zahl(kandidaten.length)];
    const a = h.a, p = IP.praefix(a.maske);
    const netzAdr = IP.netz(a.ip, a.maske), broadcast = IP.broadcast(a.ip, a.maske);
    if (!netzAdr || !broadcast) return null;
    /* Zwei glaubwürdige falsche Netze: Broadcast und (bei /24+) das Nachbarnetz, sonst das /24-Netz. */
    let falsch = broadcast;
    if (p !== 24) {
      const n24 = IP.netz(a.ip, IP.maske(24));
      if (n24 && n24 !== netzAdr && n24 !== falsch) falsch = n24;
    }
    const nachbar = IP.plus(netzAdr, 256);
    const zweite = nachbar !== falsch && nachbar !== netzAdr ? nachbar : IP.plus(netzAdr, -256);
    if (!zweite || zweite === netzAdr || zweite === falsch) return null;
    const opt = optionen(netzAdr, [falsch, zweite], z);
    if (!opt) return null;
    return bauen({
      id: "maske", titel: "Netzadresse berechnen", netz,
      frage: "Welche Netzadresse gehört zu " + a.ip + "/" + p + "?",
      lage: [
        {label: nameVon(h.g, h.g.id), wert: "Adresse " + a.ip},
        {label: "Subnetzmaske", wert: maskeText(a.maske)},
      ],
      optionen: opt,
      erklaerung: "Die Netzadresse entsteht aus Adresse UND Maske: Bei " + a.maske + " bleiben die ersten " + p + " Bit der Adresse stehen, der Rest wird 0 – das ergibt " + netzAdr + "/" + p + ". " + broadcast + " ist die Broadcastadresse (alle Host-Bit 1); sie ist für keinen Rechner vergebbar.",
      ort: {art: "geraet", geraet: h.g.id},
    });
  }

  /* ---------- 3 · gateway: liegt das Gateway im eigenen Netz? ---------- */
  function baueGateway(inst, netz, lage, z){
    if (lage.flags.gw) return null;                          /* Fehler am Gateway: nicht das Gateway üben */
    /* Nur Geräte, deren Gateway nachweislich im eigenen Netz liegt: dann ist „Ja" ableitbar und die
       Frage zeigt nie eine Adresse, die im Auftrag fehlt (Plausibilitätsregel statt Fehlerwissen). */
    const kandidaten = hosts(netz).filter(h => !lage.adr.has(h.g.id) && !lage.l1.has(h.g.id) &&
      IP.gueltig(h.a.gw) && h.a.gw !== h.a.ip && IP.gleichesNetz(h.a.ip, h.a.gw, h.a.maske));
    if (!kandidaten.length) return null;
    const h = kandidaten[z.zahl(kandidaten.length)];
    const a = h.a, cidr = IP.cidr(a.ip, a.maske);
    if (!cidr) return null;
    const opt = optionen("Ja – " + a.gw + " gehört zu " + cidr + " und ist damit direkt erreichbar",
      ["Nein – das Standardgateway muss immer außerhalb des eigenen Netzes liegen",
       "Nur wenn " + a.gw + " zusätzlich als DNS-Server eingetragen ist"], z);
    if (!opt) return null;
    return bauen({
      id: "gateway", titel: "Gateway im eigenen Netz?", netz,
      frage: "Liegt das Standardgateway von " + nameVon(h.g, h.g.id) + " im eigenen Netz?",
      lage: [
        {label: nameVon(h.g, h.g.id), wert: "Adresse " + a.ip},
        {label: "Subnetzmaske", wert: maskeText(a.maske)},
        {label: "Standardgateway", wert: a.gw},
      ],
      optionen: opt,
      erklaerung: "Adresse und Maske ergeben " + cidr + ". " + a.gw + " hat dieselben führenden Bit und liegt damit im eigenen Netz: Der Rechner erreicht das Gateway direkt per ARP. Ein Gateway außerhalb des eigenen Netzes könnte er gar nicht direkt ansprechen.",
      ort: {art: "geraet", geraet: h.g.id},
    });
  }

  function kabelAn(netz, id, port){
    try { return typeof Modell !== "undefined" && Modell.kabelAn ? Modell.kabelAn(netz, id, port) : null; } catch (e) { return null; }
  }
  function portStatus(netz, id, port){
    try {
      if (typeof Modell !== "undefined" && typeof Modell.portStatus === "function") return Modell.portStatus(netz, id, port);
    } catch (e) { /* ohne Modell bleibt unten nur der vorsichtige Zweig */ }
    return null;
  }
  function vlanListe(sw){
    const s = new Set();
    for (const [p, c] of Object.entries((sw.running && sw.running.ports) || {})) if (c && c.modus !== "trunk") s.add(String(c.accessVlan || 1));
    for (const v of Object.keys((sw.flash && sw.flash.vlans) || {})) s.add(String(v));
    return [...s].map(Number).filter(n => Number.isInteger(n) && n > 0).sort((a, b) => a - b);
  }
  function erlaubtText(x){
    if (x === "all") return "alle VLANs";
    if (Array.isArray(x)) return x.length ? x.map(String).join(", ") : "keine";
    return "VLAN " + text(x);
  }

  /* ---------- 4 · portmodus: Modus und VLAN eines Switch-Anschlusses ---------- */
  function bauePortmodus(inst, netz, lage, z){
    const kandidaten = [];
    for (const sw of Object.values(netz.geraete || {})) {
      if (!sw || sw.typ !== "switch" || lage.l1.has(sw.id)) continue;
      for (const [port, cfg] of Object.entries((sw.running && sw.running.ports) || {})) {
        if (!cfg) continue;
        const schluessel = sw.id + ":" + port;
        if (lage.l1Ports.has(schluessel) || lage.portKonfig.has(schluessel)) continue;
        const ka = kabelAn(netz, sw.id, port);
        if (!ka || !ka.gegen) continue;
        const gegen = geraet(netz, ka.gegen.geraet);
        if (!gegen || !istHost(gegen) || lage.l1.has(gegen.id)) continue;
        const st = portStatus(netz, sw.id, port);
        if (st && st.status !== "oben") continue;            /* Zustandsfälle gehören zur Vorlage zustand */
        kandidaten.push({sw, port, cfg, host: gegen, schluessel});
      }
    }
    if (!kandidaten.length) return null;
    const k = kandidaten[z.zahl(kandidaten.length)];
    const cfg = k.cfg, vlan = Number(cfg.accessVlan || 1);
    if (cfg.modus === "trunk") {
      const erlaubt = cfg.trunkErlaubt;
      const liste = erlaubt === "all" ? vlanListe(k.sw) : (Array.isArray(erlaubt) ? erlaubt.map(Number) : []);
      const kandidatenVlan = liste.filter(v => Number.isInteger(v) && v > 0);
      if (!kandidatenVlan.length) return null;
      const frageVlan = kandidatenVlan[z.zahl(kandidatenVlan.length)];
      const erlaubtWert = erlaubt === "all" || (Array.isArray(erlaubt) && erlaubt.map(Number).includes(frageVlan));
      const native = Number(cfg.nativeVlan || 1);
      const opt = erlaubtWert
        ? optionen("Ja – " + (erlaubt === "all" ? "der Trunk erlaubt alle VLANs" : "VLAN " + frageVlan + " steht in der Liste der erlaubten VLANs") + " (getaggt nach 802.1Q)",
          ["Nein – ein Trunk trägt nur ungetaggte Frames", "Nein – über einen Trunk läuft immer nur das native VLAN " + native], z)
        : optionen("Nein – VLAN " + frageVlan + " fehlt in der Liste der erlaubten VLANs",
          ["Ja – ein Trunk trägt jedes VLAN unabhängig von der Liste", "Ja, aber nur ungetaggt"], z);
      if (!opt) return null;
      return bauen({
        id: "portmodus", titel: "Access oder Trunk?", netz,
        frage: "Darf ein getaggter Frame aus VLAN " + frageVlan + " über Port " + k.port + " laufen?",
        lage: [
          {label: nameVon(k.sw, k.sw.id), wert: "Port " + k.port + " · Modus trunk"},
          {label: "Erlaubte VLANs", wert: erlaubtText(erlaubt)},
          {label: "Native VLAN", wert: String(native)},
        ],
        optionen: opt,
        erklaerung: "Ein Trunk trägt mehrere VLANs, jedes Frame mit 802.1Q-Tag. „" + erlaubtText(erlaubt) + "“ steht in running-config des Ports – nur diese VLANs dürfen den Uplink passieren; das native VLAN läuft ungetaggt.",
        ort: {art: "port", geraet: k.sw.id, port: k.port},
      });
    }
    /* Access-Port: er gehört genau einem VLAN. */
    const alle = vlanListe(k.sw);
    const andere = alle.filter(v => v !== vlan);
    const frageVlan = andere.length ? andere[z.zahl(andere.length)] : vlan;
    const gleich = frageVlan === vlan;
    const opt = gleich
      ? optionen("Ja – der Access-Port " + k.port + " gehört zu VLAN " + vlan + " und nimmt dessen Frames an",
        ["Nein – über einen Access-Port läuft jedes VLAN getaggt", "Nein – Access-Ports tragen nur das native VLAN 1"], z)
      : optionen("Nein – ein Access-Port trägt nur das VLAN " + vlan + ", nicht VLAN " + frageVlan,
        ["Ja – der Switch leitet jedes VLAN über jeden Port", "Ja, aber nur getaggt mit 802.1Q"], z);
    if (!opt) return null;
    return bauen({
      id: "portmodus", titel: "Access oder Trunk?", netz,
      frage: "Darf ein Frame aus VLAN " + frageVlan + " über Port " + k.port + " laufen?",
      lage: [
        {label: nameVon(k.sw, k.sw.id), wert: "Port " + k.port + " · Modus access"},
        {label: "Port-VLAN", wert: "VLAN " + vlan},
        {label: "Angeschlossen", wert: nameVon(k.host, k.host.id) + (adresse(netz, k.host.id) ? " · " + adresse(netz, k.host.id).ip : "")},
        {label: "VLANs am Switch", wert: alle.length ? alle.join(", ") : String(vlan)},
      ],
      optionen: opt,
      erklaerung: "Ein Access-Port gehört genau einem VLAN. Frames verlassen ihn ungetaggt; Frames aus einem fremden VLAN gehören zu einer anderen Broadcast-Domäne und werden an diesem Port nicht weitergegeben.",
      ort: {art: "port", geraet: k.sw.id, port: k.port},
    });
  }

  /* ---------- 5 · zustand: was folgt aus Gerät-/Port-Zustand? ---------- */
  function naechsterSwitch(netz, hostId){
    const h = geraet(netz, hostId); if (!h || !h.running || !h.running.if) return null;
    for (const port of Object.keys(h.running.if)) {
      const ka = kabelAn(netz, hostId, port);
      if (!ka || !ka.gegen) continue;
      const sw = geraet(netz, ka.gegen.geraet);
      if (sw && sw.typ === "switch") return {art: "host", host: h, port, sw, swPort: ka.gegen.port};
    }
    for (const id of Object.keys(netz.geraete || {})) {
      const sw = geraet(netz, id);
      if (!sw || sw.typ !== "switch") continue;
      for (const [p, cfg] of Object.entries((sw.running && sw.running.ports) || {})) {
        const ka = kabelAn(netz, sw.id, p);
        if (ka && ka.gegen && ka.gegen.geraet === hostId) return {art: "switch", host: h, port: ka.gegen.port, sw, swPort: p};
      }
    }
    return null;
  }
  function baueZustand(inst, netz, lage, z){
    /* A) auffälliger Zustand, der nachweislich NICHT die Fehlerstelle ist (Gerät aus, Port abgeschaltet) */
    const auffaellig = [];
    for (const g of Object.values(netz.geraete || {})) {
      if (!g || lage.l1.has(g.id)) continue;
      const hatKabel = ["eth0", "Gi0/0", "Gi0/1", "Gi0/2", "Gi0/3", "wan0"].some(p => kabelAn(netz, g.id, p));
      if (g.an === false && hatKabel) auffaellig.push({art: "geraet", g});
      if (g.typ === "switch") {
        for (const [p, c] of Object.entries((g.running && g.running.ports) || {})) {
          if (!c || !c.shutdown || lage.l1Ports.has(g.id + ":" + p)) continue;
          auffaellig.push({art: "port", g, port: p, kabel: kabelAn(netz, g.id, p)});
        }
      } else if (g.typ === "router" || g.typ === "firewall") {
        for (const [p, c] of Object.entries((g.running && g.running.if) || {})) {
          if (!c || !c.shutdown || text(c.ip)) continue;      /* bestückte Schnittstelle: eher Fehlerbild */
          auffaellig.push({art: "port", g, port: p, kabel: kabelAn(netz, g.id, p)});
        }
      }
    }
    const mitKabel = auffaellig.filter(x => x.art === "geraet" || x.kabel);
    if (mitKabel.length) {
      const c = mitKabel[z.zahl(mitKabel.length)];
      if (c.art === "geraet") {
        const ka = ["eth0", "Gi0/0", "Gi0/1", "Gi0/2", "wan0"].map(p => ({p, k: kabelAn(netz, c.g.id, p)})).find(x => x.k);
        const gegen = ka ? geraet(netz, ka.k.gegen.geraet) : null;
        const opt = optionen("Kein Link – ein ausgeschaltetes Gerät ist im Netz nicht vorhanden und antwortet auf nichts",
          ["Der Link bleibt oben – der Switch merkt die Abschaltung nicht",
           "Das Gerät sendet nur noch Broadcasts, alles andere kommt an"], z);
        if (!opt) return null;
        return bauen({
          id: "zustand", titel: "Zustand lesen", netz,
          frage: "Was folgt daraus für " + nameVon(c.g, c.g.id) + "?",
          lage: [
            {label: nameVon(c.g, c.g.id), wert: "Gerät: ausgeschaltet"},
            {label: "Kabel", wert: gegen ? "gesteckt · " + nameVon(gegen, gegen.id) + " " + ka.p : "kein Kabel angeschlossen"},
          ],
          optionen: opt,
          erklaerung: "Ohne Strom hat das Gerät keinen Link und ist im Netz nicht vorhanden: Am Switch erlischt die Leitung, Frames kommen nicht an. Deshalb prüft die Fehlersuche zuerst Strom, Kabel und Link – vor allem anderen.",
          ort: {art: "geraet", geraet: c.g.id},
        });
      }
      const gegen = c.kabel && c.kabel.gegen ? geraet(netz, c.kabel.gegen.geraet) : null;
      const opt = optionen("Kein Link – der Port ist abgeschaltet, obwohl ein Kabel gesteckt ist",
        ["Link oben – shutdown betrifft nur Frames aus VLAN 1",
         "Der Anschluss bleibt nutzbar, der Switch verwirft nur Broadcasts"], z);
      if (!opt) return null;
      return bauen({
        id: "zustand", titel: "Zustand lesen", netz,
        frage: "Was folgt daraus für den Anschluss " + c.port + "?",
        lage: [
          {label: nameVon(c.g, c.g.id), wert: "Port " + c.port + " · administratively down (shutdown)"},
          {label: "Kabel", wert: gegen ? "gesteckt · Gegenstelle " + nameVon(gegen, gegen.id) : "kein Kabel angeschlossen"},
        ],
        optionen: opt,
        erklaerung: "Ein Port mit shutdown ist administrativ abgeschaltet: Er sendet und empfängt nichts, auch wenn das Kabel steckt. Am Switch zeigt „show ip interface brief“ dann „administratively down“; erst „no shutdown“ gibt dem Port wieder Link.",
        ort: {art: "port", geraet: c.g.id, port: c.port},
      });
    }
    /* B) gesunder Anschluss eines Ziel-Geräts: Gerät an + Kabel + Port nicht abgeschaltet → Link oben */
    const ziele = zielSet(inst, netz);
    const gesund = [];
    for (const h of hosts(netz)) {
      if (lage.l1.has(h.g.id) || lage.adr.has(h.g.id)) continue;
      const g = geraet(netz, h.g.id);
      if (!g || g.an === false) continue;
      const anschluss = naechsterSwitch(netz, h.g.id);
      if (!anschluss) continue;
      if (lage.l1Ports.has(anschluss.sw.id + ":" + anschluss.swPort) || lage.portKonfig.has(anschluss.sw.id + ":" + anschluss.swPort)) continue;
      gesund.push({h, g, anschluss, wert: ziele.has(h.g.id) ? 2 : 0});
    }
    if (!gesund.length) return null;
    const best = Math.max(...gesund.map(x => x.wert));
    const reihe = gesund.filter(x => x.wert === best).sort((x, y) => String(x.h.g.id).localeCompare(String(y.h.g.id)));
    const s = reihe[z.zahl(reihe.length)];
    const a = s.h.a;
    const opt = optionen("Link oben – Gerät an, Kabel gesteckt und Port nicht abgeschaltet: Schicht 1 ist in Ordnung",
      ["Kein Link – der Port ist administratively down (shutdown)",
       "Kein Link – am Port steckt kein Kabel"], z);
    if (!opt) return null;
    return bauen({
      id: "zustand", titel: "Zustand lesen", netz,
      frage: "Ist der Anschluss von " + nameVon(s.g, s.g.id) + " auf Schicht 1 in Ordnung?",
      lage: [
        {label: nameVon(s.g, s.g.id), wert: "Gerät: an"},
        {label: nameVon(s.anschluss.sw, s.anschluss.sw.id), wert: "Port " + s.anschluss.swPort + " · kein shutdown · Kabel gesteckt"},
        {label: "Adresse", wert: a.ip + " / " + a.maske},
      ],
      optionen: opt,
      erklaerung: "Ein Link entsteht nur, wenn beide Enden Strom haben, das Kabel steckt und kein Port administratively down ist. Hier stimmt alles: Der Port ist oben, und Frames können die Leitung passieren – Fehlersuche auf Schicht 2 und 3 kann anschließen.",
      ort: {art: "port", geraet: s.anschluss.sw.id, port: s.anschluss.swPort},
    });
  }

  /* ---------- Auswahl ---------- */
  const BAUEN = {netz: baueNetz, maske: baueMaske, gateway: baueGateway, portmodus: bauePortmodus, zustand: baueZustand};

  function niveauWahl(inst, o){
    const gewaehlt = o && typeof o === "object" ? o.niveau : null;
    if (gewaehlt != null && K.NIVEAU[gewaehlt]) return gewaehlt;
    try {
      const eigen = typeof Spiel.niveauVon === "function" ? Spiel.niveauVon(inst) : null;
      if (eigen && K.NIVEAU[eigen]) return eigen;
    } catch (e) { /* ohne Lernmotor gilt E */ }
    return "E";
  }

  K.fuer = function(inst, o = {}){
    try {
      if (!inst || typeof inst !== "object") return null;
      const netz = inst.netz;
      if (!netz || !netz.geraete || typeof netz.geraete !== "object") return null;
      if (!hatAdresse(netz)) return null;                     /* kein verwertbares Netz → hinsehen statt raten */
      const niveau = niveauWahl(inst, o);
      const erlaubt = K.NIVEAU[niveau] || K.NIVEAU.E;
      const lage = fehlerLage(inst);
      /* Deterministische Reihenfolge: eine Zahl aus dem Samen wählt den Einstieg, danach wird der
         erlaubte Kreis abgelaufen, bis eine Vorlage Daten findet. */
      const zufall = Zufall(saat(inst) + ":wahl");
      const einstieg = zufall.zahl(erlaubt.length);
      for (let i = 0; i < erlaubt.length; i++) {
        const art = erlaubt[(einstieg + i) % erlaubt.length];
        const z = Zufall(saat(inst) + ":" + art);
        const frage = BAUEN[art](inst, netz, lage, z);
        if (frage) return frage;
      }
      return null;
    } catch (e) { return null; }                             /* die Leiste darf nie am Quiz scheitern */
  };

  return K;
})();
