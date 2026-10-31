"use strict";
/* ---------- Tests: Subnetting-Rechenkern (src/spiel/subnetz.js, Entwurf Runde 7 § 2.1) ----------
   Geprüft wird die MATHEMATIK gegen eine unabhängige Referenzimplementierung, die bewusst anders
   rechnet als der Kern: Bit-Arithmetik über >>> (Netz = IP & Maske, Broadcast = Netz | ~Maske).
   Dazu kommen die Randfälle /0, /31, /32, das Format-Toleranzverhalten von pruefen (wirft nie),
   der eigene Speicher store "subnetz" v:1 und die Modul-Achse (neu < gelesen < geuebt < sicher).

   Warum eine zweite Referenz: Ein Test, der dieselbe Formel noch einmal aus derselben Quelle zieht,
   beweist nichts. Hier stehen die Erwartungen als Bit-Rechnung; der Kern rechnet mit Division.

   Aufräumen: Jeder Test, der Lernstand oder Speicher schreibt, läuft in einer Kapsel (Vorbild
   tests/lernmotor-wache.test.js) — Store, L.st, Spiel._st/_einst/_trocken werden danach
   zurückgesetzt, damit kein späterer Test meinen Stand sieht. */
gruppe("Subnetz: Rechenkern", () => {
  const S = Spiel.subnetz;

  /* ================= unabhängige Referenz über Bit-Arithmetik ================= */
  const refIpZahl = text => {
    const o = String(text).trim().split(".");
    return ((Number(o[0]) << 24) | (Number(o[1]) << 16) | (Number(o[2]) << 8) | Number(o[3])) >>> 0;
  };
  const refZahlIp = n => [((n >>> 24) & 255), ((n >>> 16) & 255), ((n >>> 8) & 255), (n & 255)].join(".");
  const refMaske = p => p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0;
  const refNetz = (ip, p) => (refIpZahl(ip) & refMaske(p)) >>> 0;
  const refBroadcast = (ip, p) => (refNetz(ip, p) | (~refMaske(p) >>> 0)) >>> 0;
  const refHosts = p => p <= 30 ? Math.pow(2, 32 - p) - 2 : p === 31 ? 2 : 1;
  const refOktett = p => p >= 24 ? 4 : p >= 16 ? 3 : p >= 8 ? 2 : 1;

  /* ================= Kapsel für alle Schreib-Tests ================= */
  function kapsel(fn){
    return () => {
      const altSpeicher = store.alles(), altLern = tief(L.st);
      const altSt = Spiel._st, altEinst = Spiel._einst, altLz = Spiel._lz, altTrocken = Spiel._trocken;
      try { fn(); }
      finally {
        for (const k of Object.keys(SPEICHER.daten)) delete SPEICHER.daten[k];
        Object.assign(SPEICHER.daten, altSpeicher);
        const s = L.st;
        for (const k of Object.keys(s)) delete s[k];
        Object.assign(s, altLern);
        Spiel._st = altSt; Spiel._einst = altEinst; Spiel._lz = altLz; Spiel._trocken = altTrocken;
      }
    };
  }

  /* ================= 1. Schnittstelle und Aufgabentypen ================= */
  pruefe("Schnittstelle: VERSION, STUFEN, 11 ARTEN in der Reihenfolge aus § 6, alle Funktionen da", () => {
    erwarte.gleich(S.VERSION, 1, "VERSION");
    erwarte.gleich(S.STUFEN, ["E", "AP1", "AP2"], "STUFEN");
    erwarte.gleich(S.ARTEN.map(a => a.id),
      ["netzid", "broadcast", "hosts", "maske", "block", "subnetze", "vlsm", "zusammenfassen", "vlan-port", "vlan-erreichbar", "trunk"],
      "die 11 Aufgabentypen in der Reihenfolge aus § 6");
    erwarte.gleich(S.ARTEN.length, 11, "genau 11 Typen");
    const fehler = [];
    for (const a of S.ARTEN){
      if (!a.titel || typeof a.titel !== "string") fehler.push(a.id + ": Titel fehlt");
      if (!Array.isArray(a.skills) || !a.skills.length) fehler.push(a.id + ": skills fehlt");
      for (const sk of a.skills || []) if (!DATEN.skills.some(x => x.id === sk)) fehler.push(a.id + ": unbekannte Fertigkeit " + sk);
      if (!Array.isArray(a.stufen) || !a.stufen.length) fehler.push(a.id + ": stufen fehlt");
      for (const st of a.stufen || []) if (!S.STUFEN.includes(st)) fehler.push(a.id + ": unbekannte Stufe " + st);
    }
    erwarte.gleich(fehler, [], "ARTEN sind vollständig und verweisen nur auf vorhandene Fertigkeiten");
    for (const f of ["rechnen", "maskeZuPraefix", "praefixZuMaske", "gleichesNetz", "plan", "zusammenfassen",
                     "aufgabe", "satz", "pruefen", "antwort", "fortschritt", "modulSetzen", "zuruecksetzen"])
      erwarte.gleich(typeof S[f], "function", "Spiel.subnetz." + f);
  });

  /* ================= 2. rechnen() erschöpfend gegen die Bit-Referenz ================= */
  pruefe("rechnen(): alle Präfixe 0–32 × sieben Adressen gegen die Bit-Referenz (Maske, Netz, Broadcast, Hosts, Oktett)", () => {
    const ips = ["192.168.10.70", "10.0.0.1", "172.16.200.15", "0.0.0.0", "255.255.255.255", "192.168.1.0", "10.20.30.40"];
    const fehler = [];
    for (let p = 0; p <= 32; p++){
      for (const ip of ips){
        const r = S.rechnen(ip, p);
        if (!r){ fehler.push(`${ip}/${p}: null`); continue; }
        const block = Math.pow(2, 32 - p);
        if (r.praefix !== p) fehler.push(`${ip}/${p}: praefix ${r.praefix}`);
        if (r.maske !== refZahlIp(refMaske(p))) fehler.push(`${ip}/${p}: maske ${r.maske} statt ${refZahlIp(refMaske(p))}`);
        if (r.netz !== refZahlIp(refNetz(ip, p))) fehler.push(`${ip}/${p}: netz ${r.netz} statt ${refZahlIp(refNetz(ip, p))}`);
        if (r.broadcast !== refZahlIp(refBroadcast(ip, p))) fehler.push(`${ip}/${p}: broadcast ${r.broadcast}`);
        if (r.ip !== refZahlIp(refIpZahl(ip))) fehler.push(`${ip}/${p}: ip ${r.ip}`);
        if (r.blockGroesse !== block) fehler.push(`${ip}/${p}: blockGroesse ${r.blockGroesse} statt ${block}`);
        if (r.hostBits !== 32 - p || r.netzBits !== p) fehler.push(`${ip}/${p}: Bits ${r.hostBits}/${r.netzBits}`);
        if (r.hosts !== refHosts(p)) fehler.push(`${ip}/${p}: hosts ${r.hosts} statt ${refHosts(p)}`);
        if (r.oktett !== refOktett(p)) fehler.push(`${ip}/${p}: oktett ${r.oktett} statt ${refOktett(p)}`);
        const nz = refNetz(ip, p), bz = refBroadcast(ip, p), iz = refIpZahl(ip);
        if (!(nz <= iz && iz <= bz)) fehler.push(`${ip}/${p}: netz ≤ ip ≤ broadcast verletzt`);
        if (nz % block !== 0) fehler.push(`${ip}/${p}: netz nicht Blockgrenze`);
        if (bz - nz + 1 !== block) fehler.push(`${ip}/${p}: broadcast - netz + 1 ≠ block`);
        if (r.ersterHost !== refZahlIp(p >= 31 ? nz : nz + 1)) fehler.push(`${ip}/${p}: ersterHost ${r.ersterHost}`);
        if (r.letzterHost !== refZahlIp(p >= 31 ? bz : bz - 1)) fehler.push(`${ip}/${p}: letzterHost ${r.letzterHost}`);
        if (!Array.isArray(r.schritte) || r.schritte.length < 4 || r.schritte.length > 6) fehler.push(`${ip}/${p}: ${(r.schritte || []).length} Schritte`);
        else {
          r.schritte.forEach((s, i) => {
            if (s.n !== i + 1) fehler.push(`${ip}/${p}: Schritt ${i + 1} hat n=${s.n}`);
            if (!s.titel || !s.text || s.ergebnis === "") fehler.push(`${ip}/${p}: Schritt ${i + 1} unvollständig`);
          });
          if (r.schritte[r.schritte.length - 1].ergebnis !== r.broadcast) fehler.push(`${ip}/${p}: Rechenweg endet nicht beim Broadcast`);
          if (!r.schritte.some(s => s.text.includes(r.netz))) fehler.push(`${ip}/${p}: kein Schritt nennt die Netz-ID`);
        }
      }
    }
    erwarte.gleich(fehler.slice(0, 8), [], `rechnen()-Abweichungen (${fehler.length} gefunden)`);
    /* Gegenprobe: eine falsche Referenz muss auffallen — der Vergleich ist nicht blind. */
    erwarte.falsch(refNetz("192.168.10.70", 26) === refNetz("192.168.10.70", 25), "die Referenz unterscheidet /25 und /26");
  });

  pruefe("rechnen(): Randfälle /0, /31, /32 und ungültige Eingaben (null statt Absturz)", () => {
    const r0 = S.rechnen("10.20.30.40", 0);
    erwarte.gleich([r0.netz, r0.broadcast, r0.ersterHost, r0.letzterHost, r0.hosts, r0.blockGroesse],
      ["0.0.0.0", "255.255.255.255", "0.0.0.1", "255.255.255.254", 4294967294, 4294967296], "Präfix /0");
    const r31 = S.rechnen("192.168.10.71", 31);
    erwarte.gleich([r31.netz, r31.broadcast, r31.ersterHost, r31.letzterHost, r31.hosts],
      ["192.168.10.70", "192.168.10.71", "192.168.10.70", "192.168.10.71", 2], "Präfix /31 (RFC 3021: beide Adressen nutzbar)");
    const r32 = S.rechnen("192.168.10.71", 32);
    erwarte.gleich([r32.netz, r32.broadcast, r32.ersterHost, r32.letzterHost, r32.hosts, r32.blockGroesse],
      ["192.168.10.71", "192.168.10.71", "192.168.10.71", "192.168.10.71", 1, 1], "Präfix /32");
    for (const fall of ["", "192.168.10", "192.168.10.256", "192.168.10.-1", "1.2.3.4.5", "abc.def.ghi.jkl", "  ", null, undefined, 42, {}, []])
      erwarte.gleich(S.rechnen(fall, 24), null, "ungültige Adresse: " + JSON.stringify(fall));
    for (const p of [-1, 33, 1.5, "abc", "26x", null, {}, true])
      erwarte.gleich(S.rechnen("192.168.10.70", p), null, "ungültiger Präfix: " + JSON.stringify(p));
    erwarte.gleich(S.rechnen("192.168.10.70"), null, "ohne Präfix (und ohne /p in der Adresse) null");
    erwarte.gleich(S.rechnen("192.168.10.70/26"), S.rechnen("192.168.10.70", 26), "Adresse mit /p wird wie separater Präfix behandelt");
    erwarte.gleich(S.rechnen("192.168.10.70/26", 24).netz, "192.168.10.0", "der übergebene Präfix gewinnt gegen das /p in der Adresse");
    /* /31 ist kein Broadcast-Fall (RFC 3021, Review B1): der Rechenweg sagt das ausdrücklich,
       und die Aufgaben für Netz-ID/Broadcast erzeugen gar kein /31 (siehe subnetz-aufgaben.test.js). */
    const r31Text = r31.schritte.map(s => s.text).join(" ");
    erwarte.wahr(/RFC 3021/.test(r31Text), "der /31-Rechenweg nennt RFC 3021");
    erwarte.wahr(/keine Broadcastadresse/.test(r31Text), "der /31-Rechenweg sagt ausdrücklich: keine Broadcastadresse");
  });

  /* ================= 3. Maske ↔ Präfix ================= */
  pruefe("maskeZuPraefix/praefixZuMaske: alle 33 Präfixe, Umkehrschluss und ungültige Masken", () => {
    const fehler = [];
    for (let p = 0; p <= 32; p++){
      const maske = refZahlIp(refMaske(p));
      const zurueck = S.maskeZuPraefix(maske);
      if (S.praefixZuMaske(p) !== maske) fehler.push(`/${p}: praefixZuMaske ${S.praefixZuMaske(p)} statt ${maske}`);
      if (zurueck !== p) fehler.push(`${maske}: maskeZuPraefix ${zurueck} statt ${p}`);
    }
    erwarte.gleich(fehler, [], "Maske und Präfix sind über alle 33 Werte deckungsgleich");
    for (const unfug of ["255.255.255.1", "255.0.255.0", "0.0.255.0", "255.255.255.255.0", "256.0.0.0", "0.0.0.1", "-1.0.0.0", "", " ", "abc", null, undefined, 26, {}, []])
      erwarte.gleich(S.maskeZuPraefix(unfug), null, "keine gültige Maske: " + JSON.stringify(unfug));
    erwarte.gleich(S.maskeZuPraefix("  255.255.255.192  "), 26, "Leerzeichen werden getrimmt");
    erwarte.gleich(S.maskeZuPraefix("/26"), 26, "Schreibweise /26 wird toleriert");
    for (const p of [-1, 33, 2.5, null, undefined, {}])
      erwarte.gleich(S.praefixZuMaske(p), null, "ungültiger Präfix: " + JSON.stringify(p));
    erwarte.gleich(S.praefixZuMaske("26"), "255.255.255.192", "ein Präfix als String (z. B. vom Schieberegler) wird toleriert");
  });

  /* ================= 4. gleichesNetz ================= */
  pruefe("gleichesNetz: Netzgrenzen, Bit-Referenz über alle Präfixe und ungültige Eingaben", () => {
    erwarte.wahr(S.gleichesNetz("192.168.10.0", "192.168.10.63", 26), "erste und letzte Adresse eines /26 sind im selben Netz");
    erwarte.falsch(S.gleichesNetz("192.168.10.0", "192.168.10.64", 26), "die nächste Blockgrenze liegt im neuen Netz");
    erwarte.wahr(S.gleichesNetz("192.168.10.70", "192.168.10.70/26", 26), "Adresse mit /p wird toleriert");
    erwarte.falsch(S.gleichesNetz("192.168.10.70", "192.168.10.70", 33), "ungültiger Präfix → false");
    erwarte.falsch(S.gleichesNetz("abc", "192.168.10.1", 24), "ungültige Adresse → false");
    const paare = [["10.1.2.3", "10.1.2.200"], ["10.1.2.3", "10.1.3.3"], ["172.16.0.1", "172.16.0.1"], ["192.168.10.70", "192.168.11.70"]];
    const fehler = [];
    for (let p = 0; p <= 32; p++) for (const [a, b] of paare){
      const soll = refNetz(a, p) === refNetz(b, p);
      if (S.gleichesNetz(a, b, p) !== soll) fehler.push(`${a} / ${b} /${p}`);
    }
    erwarte.gleich(fehler, [], "gleichesNetz stimmt mit der Bit-Referenz überein");
  });

  /* ================= 5. plan() (VLSM) ================= */
  pruefe("plan(): Vergabe von groß nach klein, lückenlos, ohne Überlappung, Reserve bleibt übrig", () => {
    const r = S.plan("192.168.10.0/24", [{name: "Verwaltung", hosts: 100}, {name: "Lager", hosts: 50}, {name: "Werkstatt", hosts: 20}]);
    erwarte.wahr(r.ok, "der Plan passt in das /24" + (r.fehler ? ": " + r.fehler : ""));
    erwarte.gleich(r.zeilen.map(z => z.name), ["Verwaltung", "Lager", "Werkstatt"], "Vergabe-Reihenfolge: größter Bedarf zuerst");
    erwarte.gleich(r.zeilen.map(z => z.praefix), [25, 26, 27], "Präfixe aus hosts + 2 aufgerundet");
    erwarte.gleich(r.zeilen.map(z => z.netz), ["192.168.10.0", "192.168.10.128", "192.168.10.192"], "Netz-IDs");
    erwarte.gleich(r.zeilen.map(z => z.maske), ["255.255.255.128", "255.255.255.192", "255.255.255.224"], "Masken");
    erwarte.gleich(r.zeilen.map(z => z.broadcast), ["192.168.10.127", "192.168.10.191", "192.168.10.223"], "Broadcasts");
    erwarte.gleich(r.zeilen.map(z => z.ersterHost), ["192.168.10.1", "192.168.10.129", "192.168.10.193"], "erste Host-Adresse");
    erwarte.gleich(r.zeilen.map(z => z.letzterHost), ["192.168.10.126", "192.168.10.190", "192.168.10.222"], "letzte Host-Adresse");
    erwarte.gleich(r.karte.length, 3, "karte hat eine Zeile je Netz");
    /* Lückenlos und ohne Überlappung: jedes nächste netz beginnt direkt nach dem Broadcast. */
    for (let i = 1; i < r.karte.length; i++)
      erwarte.gleich(refIpZahl(r.karte[i].von), refIpZahl(r.karte[i - 1].bis) + 1, `karte ${i}: Lücke oder Überlappung`);
    for (const z of r.zeilen){
      const block = Math.pow(2, 32 - z.praefix);
      erwarte.gleich(refIpZahl(z.netz) % block, 0, z.name + ": Netz-ID liegt auf der Blockgrenze");
      erwarte.gleich(refIpZahl(z.broadcast) - refIpZahl(z.netz) + 1, block, z.name + ": Blockgröße");
      erwarte.wahr(z.hosts + 2 <= block, z.name + ": hosts + 2 passt in den Block");
    }
    const reserve = 256 - Math.pow(2, 32 - 25) - Math.pow(2, 32 - 26) - Math.pow(2, 32 - 27);
    erwarte.gleich(reserve, 32, "Reserve im /24: 256 − 128 − 64 − 32 = 32");
  });

  pruefe("plan(): Basisnetz tolerant (String und Objekt), /30 für zwei Hosts, Fehlerfälle mit Grund", () => {
    const alsObjekt = S.plan({ip: "10.0.0.0", praefix: 24}, [{name: "A", hosts: 10}, {name: "B", hosts: 5}]);
    erwarte.wahr(alsObjekt.ok, "Basisnetz als {ip, praefix} wird angenommen");
    erwarte.gleich(alsObjekt.zeilen[0].netz, "10.0.0.0", "erste Netz-ID");
    const punkt = S.plan("10.0.0.0/24", [{name: "Leitung", hosts: 2}]);
    erwarte.gleich(punkt.zeilen[0].praefix, 30, "zwei Hosts → /30 (Netz + Broadcast + 2 Hosts = 4 Adressen)");
    erwarte.gleich(punkt.zeilen[0].netz, "10.0.0.0", "erste Netz-ID bei /30");
    const voll = S.plan("192.168.10.0/24", [{name: "Alle", hosts: 254}]);
    erwarte.gleich([voll.ok, voll.zeilen[0].praefix], [true, 24], "254 Hosts füllen ein /24 genau aus");
    const zuGross = S.plan("192.168.10.0/24", [{name: "A", hosts: 200}, {name: "B", hosts: 100}]);
    erwarte.falsch(zuGross.ok, "384 Adressen Bedarf passen nicht in 256");
    erwarte.wahr(String(zuGross.fehler).length > 0, "ein gescheiterter Plan nennt einen Grund");
    erwarte.gleich(zuGross.zeilen, [], "kein halber Plan bei Überlauf");
    for (const [basis, bedarf] of [["192.168.10.0", [{hosts: 4}]], ["192.168.10.0/33", [{hosts: 4}]], ["quatsch", [{hosts: 4}]],
                                   ["192.168.10.0/24", []], ["192.168.10.0/24", [{name: "X", hosts: 0}]], ["192.168.10.0/24", [{name: "X", hosts: -3}]]])
      erwarte.falsch(S.plan(basis, bedarf).ok, "ungültiger Plan: " + JSON.stringify(basis) + " " + JSON.stringify(bedarf));
  });

  /* ================= 6. zusammenfassen ================= */
  pruefe("zusammenfassen: 2/4/8 gleich große Nachbarn, Grenzfälle und nicht zusammenfassbare Netze", () => {
    const zwei = S.zusammenfassen(["192.168.0.0/24", "192.168.1.0/24"]);
    erwarte.gleich([zwei.ok, zwei.praefix, zwei.netz], [true, 23, "192.168.0.0"], "zwei /24 → /23");
    const vier = S.zusammenfassen(["192.168.0.0/24", "192.168.1.0/24", "192.168.2.0/24", "192.168.3.0/24"]);
    erwarte.gleich([vier.ok, vier.praefix, vier.netz], [true, 22, "192.168.0.0"], "vier /24 → /22");
    const acht = S.zusammenfassen(["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24", "10.0.4.0/24", "10.0.5.0/24", "10.0.6.0/24", "10.0.7.0/24"]);
    erwarte.gleich([acht.ok, acht.praefix, acht.netz], [true, 21, "10.0.0.0"], "acht /24 → /21");
    const halbe = S.zusammenfassen(["10.0.0.0/25", "10.0.0.128/25"]);
    erwarte.gleich([halbe.ok, halbe.praefix, halbe.netz], [true, 24, "10.0.0.0"], "zwei /25 → /24");
    const faelle = [
      [["192.168.0.0/24", "192.168.2.0/24"], "Lücke zwischen den Netzen"],
      [["192.168.0.0/24", "192.168.1.0/25"], "unterschiedliche Präfixe"],
      [["192.168.1.0/24", "192.168.2.0/24"], "nicht an der Supernetz-Blockgrenze"],
      [["192.168.0.0/24"], "nur ein Netz"],
      [[], "keine Netze"],
      [["quatsch", "192.168.1.0/24"], "ungültige Angabe"],
      [["192.168.0.0/24", "192.168.0.0/24"], "doppeltes Netz"],
    ];
    for (const [netze, was] of faelle){
      const r = S.zusammenfassen(netze);
      erwarte.falsch(r.ok, "nicht zusammenfassbar (" + was + "): " + JSON.stringify(netze));
      erwarte.wahr(String(r.grund).length > 0, "Ablehnung nennt einen Grund: " + was);
      erwarte.gleich(r.netz, null, "kein Supernetz bei Ablehnung: " + was);
    }
  });

  /* ================= 7. pruefen: Formattoleranz, wirft nie ================= */
  pruefe("pruefen: IP- und Zahlenformat tolerant, Rechenweg/Erklärung/Hinweis werden zurückgegeben", () => {
    const netzAufgabe = S.aufgabe({art: "netzid", niveau: "E", seed: 2});
    erwarte.wahr(!!netzAufgabe, "Vorbedingung: eine netzid-Aufgabe entsteht");
    const gut = S.pruefen(netzAufgabe, netzAufgabe.loesung.wert);
    erwarte.wahr(gut.richtig, "die kanonische Lösung wird als richtig erkannt");
    erwarte.gleich(gut.soll, netzAufgabe.loesung.text, "soll zeigt die geforderte Lösung");
    erwarte.gleich(gut.rechenweg, netzAufgabe.rechenweg, "der Rechenweg kommt mit");
    erwarte.wahr(String(gut.erklaerung).length > 0, "die Erklärung kommt mit");
    erwarte.wahr(String(gut.hinweis).length > 0, "der Hinweis der E-Aufgabe kommt mit");
    erwarte.wahr(S.pruefen(netzAufgabe, "  " + netzAufgabe.loesung.wert + "  ").richtig, "Leerzeichen um die IP sind erlaubt");
    erwarte.wahr(S.pruefen(netzAufgabe, netzAufgabe.loesung.wert + "/26").richtig, "die IP mit angehängtem Präfix wird akzeptiert");
    erwarte.falsch(S.pruefen(netzAufgabe, "1.2.3.4").richtig, "eine andere IP ist falsch");
    erwarte.falsch(S.pruefen(netzAufgabe, "").richtig, "leere Antwort ist falsch, kein Wurf");

    const hostsAufgabe = S.aufgabe({art: "hosts", niveau: "E", seed: 4});
    erwarte.wahr(!!hostsAufgabe, "Vorbedingung: eine hosts-Aufgabe entsteht");
    const soll = Number(hostsAufgabe.loesung.wert);
    erwarte.wahr(S.pruefen(hostsAufgabe, String(soll)).richtig, "Zahl als Text wird erkannt");
    erwarte.wahr(S.pruefen(hostsAufgabe, " " + soll + " ").richtig, "Leerzeichen werden getrimmt");
    erwarte.wahr(S.pruefen(hostsAufgabe, soll + " Hosts").richtig, "„4 Hosts“ ist dieselbe Zahl");
    erwarte.wahr(S.pruefen(hostsAufgabe, "  " + soll + "   Hosts").richtig, "auch mit mehr Leerzeichen");
    /* Ausdrücke werden bewusst NICHT ausgerechnet (§ 2.1: „2^2“ gibt es hier nicht). */
    const falscherAusdruck = soll === 4 ? "2^3" : "2^2";
    erwarte.falsch(S.pruefen(hostsAufgabe, falscherAusdruck).richtig, "„" + falscherAusdruck + "“ wird nicht als Zahl gerechnet");
    erwarte.falsch(S.pruefen(hostsAufgabe, String(soll + 1)).richtig, "Nachbarzahl ist falsch");

    /* Maske und Auswahl mit synthetischen Aufgaben — pruefen arbeitet unabhängig vom Generator. */
    const maskeA = {eingabe: {art: "maske"}, loesung: {wert: "255.255.255.192", text: "255.255.255.192"}, rechenweg: [], erklaerung: "x", hinweis: ""};
    erwarte.wahr(S.pruefen(maskeA, "26").richtig, "Präfix 26 als Antwort auf die Dotted-Maske");
    erwarte.wahr(S.pruefen(maskeA, "/26").richtig, "Antwort /26");
    erwarte.wahr(S.pruefen(maskeA, " 255.255.255.192 ").richtig, "Dotted-Maske mit Leerzeichen");
    erwarte.falsch(S.pruefen(maskeA, "255.255.255.0").richtig, "/24-Maske ist falsch");
    const maskeB = {eingabe: {art: "maske"}, loesung: {wert: "26", text: "/26"}, rechenweg: [], erklaerung: "", hinweis: ""};
    erwarte.wahr(S.pruefen(maskeB, " 255.255.255.192 ").richtig, "Dotted-Maske als Antwort auf den Präfix");
    const auswahlA = {eingabe: {art: "auswahl", optionen: [{text: "A"}, {text: "B"}, {text: "C"}, {text: "D"}]}, loesung: {wert: "C", text: "C"}, rechenweg: [], erklaerung: "", hinweis: ""};
    erwarte.wahr(S.pruefen(auswahlA, "C").richtig, "Options-Text ist richtig");
    erwarte.wahr(S.pruefen(auswahlA, 2).richtig, "Options-Index (0-basiert) ist richtig");
    erwarte.wahr(S.pruefen(auswahlA, "C ").richtig, "Options-Text mit Leerzeichen");
    erwarte.falsch(S.pruefen(auswahlA, "A").richtig, "andere Option ist falsch");
    erwarte.falsch(S.pruefen(auswahlA, 0).richtig, "falscher Index ist falsch");
    erwarte.falsch(S.pruefen(auswahlA, "Z").richtig, "unbekannte Option ist falsch");
  });

  pruefe("pruefen: wirft bei keinem Unfug — immer die sechs Rückgabefelder", () => {
    const kaputt = [null, undefined, 42, "x", [], {}, {eingabe: null, loesung: null}];
    for (const auf of kaputt) for (const ant of [null, undefined, {}, [], 42, "x", Symbol("s")]){
      let r;
      try { r = S.pruefen(auf, ant); }
      catch (e){ throw new Error("pruefen warf bei " + String(auf) + " / " + String(ant) + ": " + e.message); }
      erwarte.gleich(typeof r.richtig, "boolean", "richtig ist bool");
      for (const f of ["soll", "angenommen", "erklaerung", "hinweis"]) erwarte.gleich(typeof r[f], "string", f + " ist Text");
      erwarte.wahr(Array.isArray(r.rechenweg), "rechenweg ist eine Liste");
    }
    const gut = S.pruefen(S.aufgabe({art: "netzid", niveau: "E", seed: 1}), {wert: S.aufgabe({art: "netzid", niveau: "E", seed: 1}).loesung.wert});
    erwarte.wahr(gut.richtig, "eine Antwort als {wert} wird angenommen");
  });

  /* ================= 8. Fortschritt: eigener Speicher v:1, Modul-Achse ================= */
  pruefe("fortschritt(): acht Module, alle neu, Gesamtzähler bei null — ohne Schreiben", kapsel(() => {
    store.set("subnetz", null);
    const f = S.fortschritt();
    erwarte.gleich(Object.keys(f.module).sort(), ["bits", "block", "maske", "netzid", "pruefung", "schneiden", "vlan", "vlsm"], "genau die 8 Module aus § 2.2");
    for (const id of Object.keys(f.module)) erwarte.gleich(f.module[id].status, "neu", "Modul " + id + " startet neu");
    erwarte.gleich(f.gesamt, {richtig: 0, falsch: 0, serie: 0}, "Gesamtzähler starten bei null");
    erwarte.gleich(f.spiele, {}, "keine Spiele gespeichert");
  }));

  pruefe("modulSetzen: Status setzen, unbekannte IDs/Status werden nicht geschrieben, Store ist v:1", kapsel(() => {
    store.set("subnetz", null);
    const f = S.modulSetzen("netzid", "gelesen");
    erwarte.gleich(f.module.netzid.status, "gelesen", "Rückgabe zeigt den neuen Status");
    erwarte.gleich(store.get("subnetz", null).v, 1, "store \"subnetz\" steht auf v:1");
    S.modulSetzen("gibtsnicht", "sicher");
    S.modulSetzen("netzid", "quatsch");
    erwarte.gleich(S.fortschritt().module.netzid.status, "gelesen", "ungültige Aufrufe ändern nichts");
    erwarte.gleich(S.fortschritt().module.vlan.status, "neu", "andere Module bleiben unberührt");
    S.modulSetzen("netzid", "sicher");
    erwarte.gleich(S.fortschritt().module.netzid.status, "sicher", "sicher lässt sich ausdrücklich setzen (Prüfrunde)");
  }));

  pruefe("zuruecksetzen: leert nur den eigenen Schlüssel, der Lernstand bleibt", kapsel(() => {
    store.set("subnetz", {v: 1, module: {netzid: {status: "sicher", richtig: 1, falsch: 0, serie: 1}}, spiele: {}, gesamt: {richtig: 1, falsch: 0, serie: 1}});
    store.set("eigenprobe", {x: 1});
    const vorher = L.box("lab.subnetz");
    const r = S.zuruecksetzen();
    erwarte.gleich(r, {ok: true}, "zuruecksetzen meldet ok");
    erwarte.gleich(store.get("subnetz", null), null, "der eigene Schlüssel ist leer");
    erwarte.gleich(store.get("eigenprobe", null), {x: 1}, "fremde Store-Schlüssel bleiben unangetastet");
    erwarte.gleich(S.fortschritt().module.netzid.status, "neu", "Fortschritt ist zurückgesetzt");
    erwarte.gleich(L.box("lab.subnetz"), vorher, "der Lernstand des Lernmotors bleibt");
  }));

  /* ================= 9. antwort(): Verbuchung nur über L.* und den eigenen Store ================= */
  pruefe("antwort(): richtig verbucht L.ueben, Module steigen mindestens auf geuebt, Gesamt-Serie zählt", kapsel(() => {
    store.set("subnetz", null);
    const auf = S.aufgabe({art: "netzid", niveau: "E", seed: 5});
    const vorher = L.box("lab.subnetz");
    const r = S.antwort(auf, true, {hilfe: false});
    erwarte.wahr(!!r.lern, "Lernverbuchung liefert vorher/nachher");
    erwarte.gleich(r.lern.vorher, vorher, "vorher ist der Kasten vor der Antwort");
    erwarte.wahr(r.lern.nachher >= r.lern.vorher, "ohne Hilfe steigt der Kasten (oder bleibt oben)");
    erwarte.wahr(L.box("lab.subnetz") >= vorher, "der Lernmotor kennt die Fertigkeit jetzt");
    const f = r.fortschritt;
    erwarte.gleich(f.gesamt, {richtig: 1, falsch: 0, serie: 1}, "Gesamtzähler nach einer richtigen Antwort");
    erwarte.gleich(f.module.netzid.status, "geuebt", "eine richtige Antwort hebt das Modul mindestens auf geuebt");
    erwarte.gleich(f.module.netzid.richtig, 1, "Modulzähler richtig");
    erwarte.wahr(r.neuereModule.includes("netzid"), "neuereModule nennt das aufgestiegene Modul");
  }));

  pruefe("antwort(): Fehler zählt falsch, senkt den Status von sicher auf geuebt und nie unter gelesen", kapsel(() => {
    store.set("subnetz", null);
    const auf = S.aufgabe({art: "netzid", niveau: "E", seed: 6});
    S.modulSetzen("netzid", "sicher");
    const r = S.antwort(auf, false, {});
    erwarte.wahr(!!r.lern, "auch ein Fehler wird im Lernmotor verbucht");
    erwarte.gleich(r.fortschritt.gesamt, {richtig: 0, falsch: 1, serie: 0}, "Gesamtzähler nach einem Fehler");
    erwarte.gleich(r.fortschritt.module.netzid.status, "geuebt", "sicher fällt auf geuebt zurück");
    /* Ein neues Modul fällt durch einen Fehler höchstens auf gelesen, nie darunter. */
    const hostsAufgabe = S.aufgabe({art: "hosts", niveau: "E", seed: 7});
    const r2 = S.antwort(hostsAufgabe, false, {});
    erwarte.gleich(r2.fortschritt.module.block.status, "gelesen", "neu → gelesen (nie unter gelesen)");
    erwarte.gleich(r2.fortschritt.module.bits.status, "gelesen", "auch das Nachbarmodul bleibt mindestens gelesen");
    /* Eine richtige Antwort auf ein „sicheres" Modul macht es nicht schlechter. */
    S.modulSetzen("netzid", "sicher");
    S.antwort(auf, true, {});
    erwarte.gleich(S.fortschritt().module.netzid.status, "sicher", "sicher bleibt sicher");
  }));

  pruefe("antwort(): Spiel-Bestwert (additive Option {spiel:{id, punkte}}), Hilfe wird durchgereicht", kapsel(() => {
    store.set("subnetz", null);
    const auf = S.aufgabe({art: "maske", niveau: "E", seed: 1});
    if (auf){
      const mitHilfe = S.antwort(auf, true, {hilfe: true});
      erwarte.wahr(!!mitHilfe.lern, "Hilfe-Antwort wird verbucht");
    } else {
      /* Solange der Typ noch fehlt, den Bestwert-Weg mit einer vorhandenen Aufgabe prüfen. */
      const ersatz = S.aufgabe({art: "hosts", niveau: "E", seed: 1});
      erwarte.wahr(S.antwort(ersatz, true, {hilfe: true}).lern !== null, "Hilfe-Antwort wird verbucht");
    }
    const a = S.aufgabe({art: "netzid", niveau: "AP1", seed: 3});
    S.antwort(a, true, {spiel: {id: "praefix-blitz", punkte: 7}});
    S.antwort(a, false, {spiel: {id: "praefix-blitz", punkte: 5}});
    const f = S.fortschritt();
    erwarte.gleich(f.spiele["praefix-blitz"], {bestwert: 7, runden: 2}, "Bestwert bleibt das Maximum, runden zählt die Runden");
    erwarte.gleich(S.fortschritt().module.schneiden.status, "geuebt", "Spiel-Buchung verändert die Modul-Achse wie jede Antwort (§ 2.2: netzid AP1 übt das Modul schneiden)");
  }));

  pruefe("antwort(): trocken schreibt nichts — kein Speicher, kein Lernstand, lern ist null", kapsel(() => {
    store.set("subnetz", null);
    Spiel._trocken = true;
    const auf = S.aufgabe({art: "netzid", niveau: "E", seed: 9});
    const lernVorher = JSON.stringify(L.st);
    const speicherVorher = JSON.stringify(store.get("subnetz", null));
    const r = S.antwort(auf, true, {});
    erwarte.gleich(r.lern, null, "im Testlauf wird nicht gelernt");
    erwarte.gleich(JSON.stringify(store.get("subnetz", null)), speicherVorher, "der eigene Store bleibt unberührt");
    erwarte.gleich(JSON.stringify(L.st), lernVorher, "der Lernmotor bleibt unberührt");
    erwarte.gleich(r.fortschritt.gesamt, {richtig: 0, falsch: 0, serie: 0}, "der Fortschritt bleibt leer");
    erwarte.falsch(S.pruefen(auf, auf.loesung.wert).richtig === false, "pruefen arbeitet auch trocken (nur lesend)");
  }));

  pruefe("antwort(): unbekannte Aufgabe wird nicht verbucht und wirft nicht", kapsel(() => {
    store.set("subnetz", null);
    const lernVorher = JSON.stringify(L.st);
    for (const auf of [null, undefined, {}, {art: "gibtsnicht", niveau: "E"}, "x", 42]){
      const r = S.antwort(auf, true, {});
      erwarte.gleich(r.lern, null, "keine Lernverbuchung ohne gültige Aufgabe");
      erwarte.gleich(r.fortschritt.gesamt, {richtig: 0, falsch: 0, serie: 0}, "kein Gesamtzähler ohne Aufgabe");
    }
    erwarte.gleich(JSON.stringify(L.st), lernVorher, "der Lernstand bleibt leer");
  }));
});
