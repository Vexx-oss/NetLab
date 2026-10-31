"use strict";
/* ---------- Inhalt: Korrekturen 3.0 (W1 · INH-02/INH-03) ----------
   Warum diese Datei: Die Audit-Berichte `inhalt-tickets` (F2/F3) fanden zwei Stellen, an denen
   Text und Datenbestand bzw. Wiki und Mini-Ticket einander widersprechen. Beide Stellen waren
   grün, weil kein Test den Text gegen die Messung hielt:
     · praxis-10 erzählte „zwei Rechner, eine Nummer“ – das Startnetz zeigt aber ein anderes
       Fehlerbild (Empfangs-PC steht im Gästenetz, der Gästepool hat genau eine belegte Adresse).
       Der Lösungstext nannte Ziel- und „Doppel“-Adresse beide als dieselbe Zahl.
     · mini-ipv6-2 lehrte „nur die vollständig ausgeschriebene Form ist gültig“ und widersprach
       damit dem eigenen Wiki (:: darf EINMAL kürzen).
   Geprüft wird Wirkung, nicht Grün: Die Erwartungen werden aus dem gebauten Netz gemessen
   (Modell/Sim) und mit dem ausgelieferten Text verglichen. */
gruppe("Inhalt: Korrekturen 3.0", () => {
  const ticket = id => (DATEN.tickets || []).find(t => t.id === id);
  const ipAdressen = text => [...new Set(String(text || "").match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) || [])];

  pruefe("praxis-10: Titel/Symptom/Erklärung passen zum gemessenen Startnetz (falsches Netz + belegter Ein-Adress-Pool)", () => {
    const def = ticket("praxis-10");
    erwarte.wahr(!!def, "praxis-10 fehlt");
    const start = def.netz(Zufall(1));
    /* Ursache MESSEN statt behaupten: der Empfangs-PC trägt die einzige Adresse des Gästepools. */
    const empfangStart = start.geraete.empfang.running.if.eth0.ip;
    const pool = (start.geraete.r1.running.dhcp.pools || []).find(p => p.name === "GAESTE");
    erwarte.wahr(!!pool, "Gästepool GAESTE fehlt im Startnetz");
    erwarte.gleich(pool.start, empfangStart, "Pooladresse = Adresse des Empfangs-PC (gemessene Ursache)");
    erwarte.gleich(pool.anzahl, 1, "der Gästepool hat genau eine Adresse");
    /* Kein zweites Gerät mit dieser Adresse – die Erzählung darf keine Doppelvergabe behaupten. */
    const ips = Object.values(start.geraete)
      .map(g => (g.running && g.running.if && g.running.if.eth0 ? g.running.if.eth0.ip : null))
      .filter(Boolean);
    erwarte.gleich(ips.filter(ip => ip === empfangStart).length, 1, "die Pooladresse trägt genau ein Gerät");
    /* Fehlerbild: Empfang aus den Behandlungsräumen bricht (VLAN), Gäste bekommen keine Adresse. */
    const netzZiele = def.ziele.filter(z => !Spiel.istArbeitsziel(z));
    const gruende = netzZiele.map(z => Sim.pruefeZiel(start, z).grund);
    erwarte.wahr(gruende.includes("DROP_VLAN"), "Start bricht den Empfang mit DROP_VLAN (gemessen: " + gruende.join(", ") + ")");
    const gastZiel = netzZiele.find(z => z.von === "gast");
    erwarte.wahr(!!gastZiel, "Gästeziel fehlt");
    erwarte.wahr(!Sim.pruefeZiel(start, gastZiel).ok, "das Gästeziel bricht im Startnetz");
    const hilfen = [def.hilfen && def.hilfen.frage ? def.hilfen.frage.join(" ") : "",
                    def.hilfen && def.hilfen.konkret ? def.hilfen.konkret.join(" ") : ""].join(" ");
    const text = [def.titel, def.symptom, def.erklaerung, hilfen].join(" ");
    erwarte.falsch(/zwei\s+(rechner|geräte|geräten)\b[^.]{0,40}(eine|dieselbe|die gleiche|gleichen)\s+(nummer|adresse)/i.test(text),
      "keine Zwei-Geräte-eine-Adresse-Behauptung (das Startnetz hat keine Doppelvergabe)");
    erwarte.passt(def.symptom, /Gäste/i, "Symptom nennt die Gäste");
    erwarte.passt(def.symptom, /keine Adresse|169\.254/i, "Symptom nennt die fehlende Adresse");
    erwarte.passt(def.symptom, /Empfang/i, "Symptom nennt den Empfang");
  });

  pruefe("praxis-10: Lösungstext nennt Ziel- und belegte Pooladresse verschieden", () => {
    const def = ticket("praxis-10");
    const start = def.netz(Zufall(1));
    const empfangStart = start.geraete.empfang.running.if.eth0.ip;
    const kopie = Modell.kopie(start);
    Spiel.loesungAnwenden(kopie, (def.loesung || []).map(x => Object.assign({}, x)));
    const empfangZiel = kopie.geraete.empfang.running.if.eth0.ip;
    erwarte.wahr(empfangStart !== empfangZiel, "die Lösung ändert die Adresse des Empfangs-PC (" + empfangStart + " → " + empfangZiel + ")");
    const schritt = (def.loesung || []).find(x => x.geraet === "empfang");
    erwarte.wahr(!!schritt, "Lösungsschritt für den Empfang fehlt");
    const ips = ipAdressen(schritt.text);
    erwarte.wahr(ips.includes(empfangStart), "Lösungstext nennt die belegte Pooladresse " + empfangStart + " (gefunden: " + (ips.join(", ") || "keine") + ")");
    erwarte.wahr(ips.includes(empfangZiel), "Lösungstext nennt die Zieladresse " + empfangZiel + " (gefunden: " + (ips.join(", ") || "keine") + ")");
    erwarte.wahr(ips.length >= 2, "zwei verschiedene Adressen im Lösungstext (" + ips.join(", ") + ")");
  });

  /* ---------- INH-03: mini-ipv6-2 gegen das eigene Wiki (F3) ----------
     Der Mini lehrte „nur die vollständig ausgeschriebene Form ist gültig“ und widersprach damit
     dem eigenen Wiki (lab.ip: „ein einziges Mal darf eine Folge von Nullblöcken durch :: ersetzt
     werden“). Geprüft wird die Regel im TEXT und die Gültigkeit der vier Optionen – beides direkt
     an den Daten, nicht an einer Behauptung. */
  const ipv6Gueltig = text => {
    const s = String(text || "").trim();
    if (!/^[0-9a-f:]+$/i.test(s)) return false;
    if (s.includes(":::")) return false;
    const doppelt = (s.match(/::/g) || []).length;
    if (doppelt > 1) return false;
    const teile = s.split("::");
    const links = teile[0] ? teile[0].split(":") : [];
    const rechts = teile.length > 1 && teile[1] ? teile[1].split(":") : [];
    const bloecke = [...links, ...rechts];
    if (bloecke.some(b => !/^[0-9a-f]{1,4}$/i.test(b))) return false;
    return doppelt ? bloecke.length < 8 : bloecke.length === 8;
  };

  pruefe("mini-ipv6-2: Erklärung deckt sich mit dem Wiki (:: höchstens einmal) und genau eine Option ist gültig", () => {
    const mini = (DATEN.mini || []).find(m => m.id === "mini-ipv6-2");
    erwarte.wahr(!!mini, "mini-ipv6-2 fehlt");
    erwarte.gleich(mini.skill, "lab.ipv6", "Mini gehört zu lab.ipv6");
    const optionen = mini.optionen || [];
    erwarte.gleich(optionen.length, 4, "vier Antwortoptionen");
    const gueltig = optionen.map((o, i) => (ipv6Gueltig(o) ? i : -1)).filter(i => i >= 0);
    erwarte.gleich(gueltig, [mini.richtig], "genau die als richtig markierte Option ist eine gültige IPv6-Adresse");
    const wiki = ((DATEN.wiki["lab.ip"] || {}).abschnitte || []).map(a => a.html).join(" ");
    erwarte.enthaelt(wiki, "ein einziges Mal", "Wiki lab.ip nennt die ::-Regel");
    erwarte.enthaelt(mini.erklaerung, "ein einziges Mal", "Mini-Erklärung nennt dieselbe ::-Regel wie das Wiki");
    erwarte.falsch(/Nur die vollständig ausgeschriebene Form ist gültig/i.test(mini.erklaerung),
      "keine falsche Absolut-Regel (vollständig ausgeschrieben sei Pflicht)");
  });
});
