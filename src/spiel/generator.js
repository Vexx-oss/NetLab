"use strict";
/* ---------- Ticket-Bau und Generator (Konzept § 8.1/8.2) ----------
   Spiel.ticketBauen(spec, seed?) → Ticket-Definition (Architektur § 7.1) oder null (Fehler bricht kein Ziel).
     spec: {id, vorlage, vSeed, kunde, injektoren:[{name, ziel?:key, wahl?:zahl}], stufe, karriere, art,
            titel, briefing, symptom, erklaerung, quelle, hilfen, lohn, minuten, skills, vorhersage,
            ziele? (ersetzt die Vorlagen-Ziele), zusatzZiele? (auch Arbeitsziele befehl/antwort), maxZiele?, umbau?(netz, rollen, z), loesungExtra?[],
            loesung? (ersetzt die berechnete), loesungFn?(gesund, rollen), alleZiele?}
   OHNE seed baut die Netz-Fabrik die Vorlage mit spec.vSeed – alles bleibt wie bisher (Generator, Tests).
   MIT seed (P2 „Auftragsvielfalt“) entsteht das ganze Ticket aus diesem Seed: die Adressen der Vorlage, die
   Zufallsparameter der Injektoren und – wo kein ziel/wahl steht – auch die Fehlerstelle. Jede Instanz desselben
   Auftrags bekommt so ein eigenes Netz; dieselbe (id, seed) ergibt immer dasselbe Ticket (DATEN.ticketSpec merkt es).
   def.fehlerstellen nennt die gewählten Stellen nachprüfbar; derselbe Fehler landet nie zweimal im selben Auftrag.
   Spiel.generiere(skill, seed, {stufe, kunde, art, flow}) → generiertes Ticket, registriert in Spiel.generierte.
     flow "geruest": ein Niveau tiefer, nur ein Ziel · flow "verwicklung": ein zweiter Fehler, der ein weiteres Ziel bricht
     (Flow-Regler, spiel/flow.js) – eigene ID, damit die gewöhnliche Fassung erhalten bleibt. */
Spiel.generierte = Spiel.generierte || {};

Spiel.ticketBauen = function(spec, seed){
  const V = Spiel.vorlagen[spec.vorlage];
  if (!V) throw new Error("Unbekannte Vorlage: " + spec.vorlage);
  const vSeed = spec.vSeed ?? 1;
  /* saat = der Seed, aus dem dieses Ticket entsteht: ohne seed der feste vSeed (wie bisher), mit seed der
     Instanz-Seed (P2). Alle Zufallsströme hängen an saat, damit die Netz-Fabrik dasselbe Ticket wieder baut. */
  const saat = seed == null ? vSeed : ((seed >>> 0) || 1);
  const bauen = () => V.bauen(Zufall(saat), {kunde: spec.kunde});
  const gesund = bauen();
  /* Fehler wählen: Kandidat je Injektor (fest per key, per wahl oder – mit Instanz-Seed – per Zufall).
     belegt merkt sich je Injektor die schon verwendeten Stellen: derselbe Fehler kommt nicht zweimal vor. */
  const gewaehlt = [];
  const belegt = new Map();
  for (const [i, s] of (spec.injektoren || []).entries()) {
    const inj = Spiel.INJEKTOREN[s.name];
    if (!inj) throw new Error("Unbekannter Injektor: " + s.name);
    const kand = inj.passt(gesund.netz, gesund.rollen) || [];
    if (!kand.length) return null;
    const schon = belegt.get(s.name) || new Set();
    let k = null;
    if (s.ziel != null) k = kand.find(c => c.key === s.ziel);
    else if (s.wahl != null) k = kand[(s.wahl || 0) % kand.length];
    else if (seed != null) {
      const frei = kand.filter(c => !schon.has(c.key));
      if (!frei.length) return null;                                   /* jede Stelle dieses Injektors ist schon belegt */
      k = frei[Zufall("stelle:" + saat + ":" + i).zahl(frei.length)];
    } else k = kand[0];
    if (!k) throw new Error(`Injektor ${s.name}: Ziel ${s.ziel} passt nicht (möglich: ${kand.map(c => c.key).join(", ")})`);
    schon.add(k.key); belegt.set(s.name, schon);
    const param = Object.assign({}, inj.param(gesund.netz, k, gesund.rollen, Zufall(saat * 31 + i + 7)), s.param || {});
    gewaehlt.push({inj, k, param});
  }
  const fabrik = () => {
    const w = bauen();
    if (spec.umbau) spec.umbau(w.netz, w.rollen, Zufall(saat + 99));
    for (const g of gewaehlt) g.inj.anwenden(w.netz, g.k, g.param, Zufall(saat + 5));
    /* Startzustand ist gespeichert (running = startup): Der Fehler übersteht einen Neustart, ungespeichert ist nur, was der Spieler ändert */
    for (const g of Object.values(w.netz.geraete)) if (Modell.IOS[g.typ] && (g.startup || !spec.werkszustand?.includes(g.id))) Modell.speichern(g);
    return w.netz;
  };
  const kaputt = fabrik();
  /* Ziele: Vorlage (oder eigene) + Zusatzziele der Injektoren; nur gebrochene zählen, außer alleZiele */
  let basis = spec.ziele ? spec.ziele.slice() : gesund.ziele.slice();
  if (spec.zieleFn) basis = spec.zieleFn(gesund.netz, gesund.rollen);
  for (const g of gewaehlt) if (g.inj.ziele) basis = g.inj.ziele(gesund.netz, g.k, gesund.rollen);
  if (spec.ziele) basis = spec.ziele.slice();
  if (spec.zieleFn) basis = spec.zieleFn(gesund.netz, gesund.rollen);
  const zusatz = [...(spec.zusatzZiele || []), ...gewaehlt.flatMap(g => g.inj.zusatzZiele ? g.inj.zusatzZiele(gesund.netz, g.k, gesund.rollen) : [])];
  const ziele = [];
  for (const z of basis) {
    const r = Sim.pruefeZiel(kaputt, z);
    if (!r.ok) ziele.push(Object.assign({}, z, {erwartet: z.typ === "blockiert" ? "OFFEN" : (r.grund || "TIMEOUT")}));
    else if (spec.alleZiele) ziele.push(Object.assign({}, z));
  }
  /* Terminal-Aufträge (C4) dürfen ohne Fehler im Netz auskommen: dann tragen allein die Arbeitsziele den Auftrag */
  if (!ziele.some(z => z.erwartet) && !zusatz.some(z => Spiel.istArbeitsziel(z))) return null;
  /* Ein Fehler, der NICHTS bricht, ist kein Auftrag: er hätte eine Erklärung, die nicht zum Netz passt („der Fehler
     steckt hier“) – und der Spieler sucht etwas, das es nicht zu finden gibt. Kommt vor, wenn ein Injektor in einer
     Vorlage wirkungslos bleibt (Beispiel: eine /25-Maske, die Gateway UND Ziel noch umfasst). Solche Kombinationen
     werden hier zu „ohne Wirkung“ – dieselbe Behandlung wie ein Injektor, der gar keinen Kandidaten anbietet.
     Geprüft wird gegen das GESUNDE Netz, damit nur die Wirkung des Fehlers zählt, nicht ein schon vorher offenes Ziel. */
  if (gewaehlt.length) {
    const wirklich = basis.some(z => {
      if (Spiel.istArbeitsziel(z)) return false;                       /* Arbeitsziele prüfen kein Netz */
      return !Sim.pruefeZiel(kaputt, z).ok && Sim.pruefeZiel(gesund.netz, z).ok;
    });
    if (!wirklich) return null;
  }
  const max = spec.maxZiele || 3;
  /* Ziele mit dem direkten Grund des Fehlers zuerst (das ist das Symptom, das der Kunde meldet) */
  const direkt = new Set(gewaehlt.flatMap(g => g.inj.gruende));
  const gebrochen = ziele.filter(z => z.erwartet).sort((a, b) => (direkt.has(b.erwartet) ? 1 : 0) - (direkt.has(a.erwartet) ? 1 : 0)).slice(0, max);
  const endZiele = spec.alleZiele ? ziele : gebrochen;
  endZiele.push(...zusatz);
  /* Lösung, Hilfen, Texte */
  const loesung = (spec.loesung || (spec.loesungFn ? spec.loesungFn(gesund.netz, gesund.rollen) : null) || [...gewaehlt.flatMap(g => g.inj.loesung(gesund.netz, g.k, g.param, gesund.rollen)), ...(spec.loesungExtra || [])]).slice();
  /* Zum Schluss speichern, was an IOS-Geräten geändert wurde (im Betrieb Pflicht, bei AP2 prüft es der Neustart-Test) */
  const gespeichert = new Set(loesung.filter(x => x.aktion === "speichern" || /copy running-config startup-config|write memory/.test(x.cli || "")).map(x => x.geraet));
  const iosGeaendert = [...new Set(loesung.filter(x => (x.cli || x.setzen) && Modell.IOS[kaputt.geraete[x.geraet]?.typ]).map(x => x.geraet))].filter(id => !gespeichert.has(id));
  for (const id of iosGeaendert) loesung.push({aktion: "speichern", geraet: id, text: `${kaputt.geraete[id].name}: Konfiguration speichern (copy running-config startup-config) – sonst ist die Änderung nach dem nächsten Neustart weg.`});
  const hilfen = {frage: [], bereich: [], konkret: []};
  for (const g of gewaehlt) { const x = g.inj.hilfen ? g.inj.hilfen(gesund.netz, g.k, g.param, gesund.rollen) : {}; for (const f of ["frage", "bereich", "konkret"]) hilfen[f].push(...(x[f] || [])); }
  if (spec.hilfen) for (const f of ["frage", "bereich", "konkret"]) if (spec.hilfen[f]) hilfen[f] = spec.hilfen[f];
  const erster = gewaehlt[0] ? gewaehlt[0].inj : null;
  const skills = spec.skills || [...new Set(gewaehlt.map(g => g.inj.skills[0]))];
  const karriere = spec.karriere || V.stufe;
  const stufe = spec.stufe || "E";
  const kunde = spec.kunde || V.kunde;
  const symptom = spec.symptom || Spiel.symptomText(gebrochen[0], gesund.netz, Zufall("symptom:" + saat));
  return {
    id: spec.id, art: spec.art || "stoerung", stufe, karriere, kunde, reihe: spec.reihe,
    titel: spec.titel || Spiel.titelKunde(gebrochen[0], Zufall("titel:" + saat)),   /* Kundensicht – der Injektor-Titel verriete die Ursache */
    briefing: spec.briefing || Spiel.briefingText(kunde, symptom, Zufall("briefing:" + saat)),
    symptom, skills, netz: fabrik, ziele: endZiele, hilfen, loesung,
    erklaerung: spec.erklaerung || gewaehlt.map(g => g.inj.erklaerung).filter(Boolean).join(" "),
    quelle: spec.quelle || (erster ? erster.quelle : "Network – Lernfassung"),
    lohn: spec.lohn || Spiel.lohnFuer(karriere, stufe), minuten: spec.minuten || (spec.art === "projekt" ? 15 : 3 + 2 * karriere),
    vorhersage: !!spec.vorhersage, generiert: !!spec.generiert,
    injektoren: gewaehlt.map(g => g.inj.name), gruende: gewaehlt.map(g => g.inj.gruende),
    fehlerstellen: gewaehlt.map(g => ({injektor: g.inj.name, stelle: g.k.key})),   /* P2: nachprüfbar, welche Stelle je Injektor sitzt */
    vorlage: spec.vorlage, regressionOhne: spec.regressionOhne, regression: spec.regression,
  };
};

/* P2 „Auftragsvielfalt“: Selbstprüfung einer gebauten Definition – dieselben Kriterien, mit denen die Tests
   Tickets prüfen (tests/tickets-generator.test.js): Start bricht die erwarteten Ziele, die Lösung heilt alle
   Netzziele, und die gesunden Ziele der Vorlage gelten danach weiter. Die Seed-Fassung eines Handauftrags wird
   nur übernommen, wenn sie das besteht; sonst bleibt die feste Fassung (vSeed) spielbar. Reine Prüfung. */
Spiel.ticketGueltig = function(def){
  if (!def || typeof def.netz !== "function" || !Array.isArray(def.ziele) || !Array.isArray(def.loesung)) return false;
  const zielOk = (netz, z) => {
    try {
      const r = typeof Sim !== "undefined" && Sim.pruefeZiel ? Sim.pruefeZiel(netz, z) : Spiel.zielPruefen(netz, z, null);
      return !!(r && r.ok);
    } catch (e) { return false; }
  };
  try {
    const start = def.netz(Zufall(1));
    const erwartet = def.ziele.filter(z => z.erwartet);
    const netzZiele = def.ziele.filter(z => !Spiel.istArbeitsziel(z));
    for (const z of erwartet) if (zielOk(start, z)) return false;                      /* Fehler wirkt nicht */
    if (!erwartet.length && netzZiele.length === def.ziele.length && !def.ziele.some(z => !zielOk(start, z))) return false;
    const kopie = def.netz(Zufall(1));
    if (typeof Spiel.loesungAnwenden === "function") Spiel.loesungAnwenden(kopie, def.loesung);
    else for (const s of def.loesung) Spiel.schrittAnwendenRueckfall(kopie, s);
    for (const z of netzZiele) if (!zielOk(kopie, z)) return false;                    /* Lösung heilt nicht alles */
    const V = def.vorlage && Spiel.vorlagen[def.vorlage];
    if (V) for (const z of V.bauen(Zufall(1), {kunde: def.kunde}).ziele) {              /* nichts, was vorher ging, darf kaputt sein */
      if (/^\d/.test(String(z.nach))) continue;                                        /* Ziel per IP: die Adresse wechselt mit dem Seed */
      if (!zielOk(kopie, z)) return false;
    }
    return true;
  } catch (e) { return false; }
};

Spiel.lohnFuer = (karriere, stufe) => ({euro: 20 + 15 * (karriere || 1) + ({E: 0, AP1: 10, AP2: 25}[stufe] || 0), ruf: karriere >= 3 ? 2 : 1});

/* Tickettitel aus Kundensicht: das erste gebrochene Ziel, verneint. Nie die Ursache („Falsche Subnetzmaske“) –
   die herauszufinden ist die Aufgabe, gerade am Prüfungstag. null, wenn kein Muster passt (dann Rückfall). */
Spiel.titelAusZiel = function(ziel){
  if (!ziel || !ziel.text) return null;
  const t = String(ziel.text).trim();
  if (ziel.typ === "gespeichert") return "Nach dem Stromausfall ist etwas weg";
  if (ziel.typ === "dhcp") { const m = t.match(/^(.+?) bekommt (automatisch )?eine Adresse/); return m ? `${m[1]} bekommt keine Adresse` : null; }
  if (ziel.typ === "blockiert") return "Sicherheitslücke: " + t.replace(/ NICHT\b/, "").replace(/\bniemand\b/, "jemand");
  if (ziel.typ !== "erreichbar") return null;
  let m;
  if ((m = t.match(/^(.+?) (kommt|kommen) ins (.+)$/))) return `${m[1]} ${m[2]} nicht ins ${m[3]}`;
  if ((m = t.match(/^(.+?) druckt Belege(.*)$/))) return `${m[1]} druckt keine Belege${m[2]}`;
  if ((m = t.match(/^(.+?) druckt(.*)$/))) return `${m[1]} druckt nicht${m[2]}`;
  if ((m = t.match(/^(.+?) (erreicht|erreichen|öffnet|öffnen) (.+)$/))) return `${m[1]} ${m[2]} ${m[3]} nicht`;
  return null;
};

/* ---------- Stilfaden (docs/entwicklung/Stilfaden – Auftragstexte.md § 1/§ 2/§ 5): EINE Quelle der Textregeln ----------
   Gilt für GENERIERTE Tickets (Prüfung, Tagesrätsel, Postfach-Nachschub). Handtickets liefern ihre Texte selbst und
   bleiben unverändert. tools/texte-messen.js --pruefen liest die Muster von hier (Spiel.STIL), damit Tor und
   Generator dieselbe Regel kennen; die Zahlen sind die Sollwerte des Stilfadens. */
Spiel.STIL = {
  TITEL_MIN: 15, TITEL_MAX: 46, SYMPTOM_MIN: 180, SYMPTOM_MAX: 420, SAETZE_MIN: 2, SAETZE_MAX: 4,
  /* Ursachenwörter (§ 2): Der Kunde deutet nicht – er beschreibt, was er sieht. */
  URSACHE: /\b(VLAN|Subnetzmaske|Subnet|Präfix|Gateway|Standardgateway|Route|Routing|DNS-Eintrag|DNS-Server|Trunk|Spanning Tree|STP|DHCP-Pool|DHCP-Server|Lease|Reservierung|Portsicherheit|Port-Security|ACL|NAT|Firewall-Regel|Doppelvergabe|Adresskonflikt|falsche Maske|Port ist down|VLAN-Fehler|Konfigurationsfehler)\b/i,
  FUELLWORT: /\b(irgendwie|quasi|halt|eben mal|sozusagen|gewissermaßen|eventuell vielleicht|wie gesagt)\b/i,
  /* Bausteine 1–4 (§ 1). Die festen Sätze sind bewusst kurz und im Kundenton gehalten. */
  ZEIT: /\b(seit|gestern|heute|heute morgen|heute früh|heute nachmittag|heute vormittag|vorgestern|nach dem|nach der|beim|letzte woche|letzten|am wochenende|über nacht|seitdem|vorhin|eben|gerade eben|nacht|zum ersten|am montag|am dienstag|am mittwoch|am donnerstag|am freitag)\b/i,
  FOLGE: /\b(können|kann|können wir|kann ich|können keine|können so keine|steht still|warten|müssen warten|geht nicht raus|kommt nicht raus|geht nichts|keine (?:karten)?zahlung|fällt aus|geht nur noch|müssen (?:wir )?(?:per hand|von hand|händisch)|keine bestellungen|kommt nicht (?:mehr )?(?:durch|raus|rein)|bleibt (?:die )?arbeit liegen|arbeit liegen|bleibt liegen|verdienen kein geld|läuft nicht mehr|keine termine|keine besprechungen|schlange|die hälfte|geht die hälfte|ohne (?:die|das|den) \w+ geht|sonst steht|steht die \w+ still|liegen bleibt|nicht rausschicken|nicht raus|kommt nicht an|nicht mehr an die|kostet|kostet uns|verlieren|fällt die \w+ aus|hält [^.]{0,30}auf|brauchen das)\b/i,
  VERSUCH: /\b(neu(?:ge)?startet|neu gestartet|neu starten|neustart|neu eingerichtet|neu aufgesetzt|probiert|versucht|getauscht|umgesteckt|gezogen|abgezogen|gesteckt|eingesteckt|angeschlossen|gefragt|nachgesehen|nachgeschaut|ausprobiert|resettet|zurückgesetzt|an- und ausgeschaltet|ab- und wieder angeschaltet|aus- und wieder eingeschaltet|eingeschaltet|ausgeschaltet|nachgetragen|zweimal|dreimal|mehrmals|extra)\b/i,
  ZEIT_BAUSTEIN: [
    "Seit heute Morgen", "Seit gestern Nachmittag", "Seit gestern früh", "Nach dem Umbau am Wochenende",
    "Beim Öffnen heute früh", "Seit letzter Woche", "Seit heute Vormittag", "Nach dem Stromausfall in der Nacht",
  ],
  MELDUNG_BAUSTEIN: [
    "Auf dem Bildschirm steht: „Kein Internet“.",
    "Auf dem Bildschirm steht: „Netzwerk nicht verfügbar“.",
    "Die Anzeige sagt nur: „Keine Verbindung“.",
    "Auf dem Bildschirm steht: „Server nicht gefunden“.",
    "Es erscheint nur die Meldung: „Zeitüberschreitung“.",
  ],
  FOLGE_BAUSTEIN: [
    "Ohne das geht bei uns die Arbeit liegen, und die Zeit läuft uns davon.",
    "Das hält den ganzen Betrieb auf; wir brauchen das heute wieder.",
    "Wir können so keine Kartenzahlung annehmen, die Kundschaft wird ungeduldig.",
    "Wir müssen die Leute wegschicken, das kostet uns den ganzen Tag.",
    "Der Betrieb steht still, bitte schauen Sie heute noch danach.",
  ],
  VERSUCH_BAUSTEIN: [
    "Ich habe den Rechner schon neu gestartet und das Kabel an einen anderen Platz gesteckt – ohne Erfolg.",
    "Wir haben das Gerät aus- und wieder eingeschaltet und einen Kollegen gefragt, das hat nichts geändert.",
    "Ich habe schon dreimal neu gestartet und ein anderes Kabel probiert; es bleibt dabei.",
    "Der Kollege hat nachgesehen und alles einmal aus- und eingeschaltet, geholfen hat es nicht.",
  ],
  TITEL_FALLBACK: ["Störung im Betrieb", "Problem im Betrieb", "Etwas funktioniert nicht", "Wir brauchen Unterstützung", "Bei uns hakt es gerade"],
};
/* Titelregel für generierte Tickets: 15–46 Zeichen, ohne Ursachenwort und ohne Füllwort (§ 2/§ 3). */
Spiel.stilTitelOk = function(t){
  const s = String(t == null ? "" : t).trim();
  if (s.length < Spiel.STIL.TITEL_MIN || s.length > Spiel.STIL.TITEL_MAX) return false;
  return !Spiel.STIL.URSACHE.test(s) && !Spiel.STIL.FUELLWORT.test(s);
};
/* Kundensicht-Titel: aus dem gebrochenen Ziel, sonst ein neutraler Fallback. Nie der Injektor-Titel (der verrät die Ursache). */
Spiel.titelKunde = function(ziel, z){
  z = z || Zufall("titel");
  const kandidaten = [];
  const ausZiel = Spiel.titelAusZiel(ziel);
  if (ausZiel) kandidaten.push(ausZiel);
  if (ziel && ziel.typ === "dhcp") kandidaten.push("Es kommt keine Adresse an");
  if (ziel && ziel.typ === "gespeichert") kandidaten.push("Nach dem Stromausfall fehlt etwas");
  if (ziel && ziel.typ === "blockiert") kandidaten.push("Da kommt jemand zu weit");
  for (const t of kandidaten) if (Spiel.stilTitelOk(t)) return t;
  return z.wahl(Spiel.STIL.TITEL_FALLBACK);
};
/* Vier Bausteine in Kundensprache: Anlass mit Zeit · Beobachtung · Folge für den Betrieb · was schon versucht wurde.
   Deterministisch über den übergebenen Zufall; 2–4 Sätze, 180–420 Zeichen, 0 Ursachenwörter (Stilfaden § 1/§ 2). */
Spiel.symptomText = function(ziel, netz, z){
  z = z || Zufall("symptom");
  const zeit = z.wahl(Spiel.STIL.ZEIT_BAUSTEIN);
  /* Beobachtung: aus dem Kundensicht-Titel, wenn er die Stilregel erfüllt – sonst neutral, ohne Deutung. */
  const titel = ziel ? Spiel.titelAusZiel(ziel) : null;
  let beobachtung;
  if (ziel && ziel.typ === "gespeichert") beobachtung = "Nach dem Stromausfall von gestern Abend ist bei uns etwas weg, das vorher da war.";
  else if (ziel && ziel.typ === "blockiert") beobachtung = `${zeit} erreichen bei uns Leute Dinge, die sie nicht erreichen dürfen.`;
  else if (titel && Spiel.stilTitelOk(titel)) beobachtung = `${zeit} klappt es nicht mehr: ${titel}.`;
  else beobachtung = `${zeit} geht bei uns etwas nicht mehr, was sonst immer funktioniert hat.`;
  const folge = z.wahl(Spiel.STIL.FOLGE_BAUSTEIN);
  const versuch = z.wahl(Spiel.STIL.VERSUCH_BAUSTEIN);
  const mitMeldung = z.zahl(2) === 0;
  const saetze = mitMeldung ? [beobachtung, z.wahl(Spiel.STIL.MELDUNG_BAUSTEIN), folge, versuch] : [beobachtung, folge, versuch];
  return saetze.join(" ");
};
/* Briefing in Kundenstimme: Anrede + Symptom (enthält alle vier Bausteine) + ein echter Dringend-Satz + Gruß.
   Ein Dringend-Satz mit Ursachenwort wird verworfen – der Kunde deutet nicht (Stilfaden § 2). */
Spiel.briefingText = function(kundeId, symptom, z){
  z = z || Zufall("briefing");
  const k = (DATEN.kunden || {})[kundeId];
  const anrede = k ? z.wahl(["Hallo!", "Hi,", "Guten Morgen,", "Hallo du,"]) : "Hallo,";
  const pool = k && k.saetze && k.saetze.dringend ? k.saetze.dringend.filter(s => !Spiel.STIL.URSACHE.test(s)) : [];
  const dringend = pool.length ? z.wahl(pool) : "";
  const gruss = k ? `\n\n${k.ansprechpartner.name}, ${k.name}` : "";
  return `${anrede} ${symptom} ${dringend}`.trim() + gruss;
};

/* Generator: Fertigkeit → passender Injektor → passende Vorlage (bevorzugt die des Kunden) */
Spiel.generiere = function(skill, seed, opts = {}){
  const flow = opts.flow === "geruest" || opts.flow === "verwicklung" ? opts.flow : null;
  const id = `gen-${skill}-${seed}` + (flow ? "-" + flow : "");
  if (Spiel.generierte[id]) return Spiel.generierte[id];
  const z = Zufall(`gen:${skill}:${seed}`);
  const injs = Object.values(Spiel.INJEKTOREN).filter(i => i.skills.includes(skill));
  if (!injs.length) throw new Error("Kein Injektor für " + skill);
  const kundeVorlage = opts.kunde ? Spiel.vorlagen._fuerKunde[opts.kunde] : null;
  const niveau = ["E", "AP1", "AP2"].includes(opts.stufe) ? opts.stufe : null;
  for (let versuch = 0; versuch < 16; versuch++) {
    const inj = injs[(z.zahl(injs.length) + versuch) % injs.length];
    const vorlagen = inj.vorlagen.filter(v => Spiel.vorlagen[v]);
    if (!vorlagen.length) continue;
    const vName = vorlagen.includes(kundeVorlage) && versuch < 8 ? kundeVorlage : z.wahl(vorlagen);
    const V = Spiel.vorlagen[vName];
    const kunde = kundeVorlage === vName ? opts.kunde : V.kunde;
    const skillInfo = (DATEN.skills || []).find(s => s.id === skill) || {};
    const grund = niveau || (skillInfo.ap === "AP2" ? "AP1" : "E");
    const stufe = flow === "geruest" && Spiel.flow ? Spiel.flow.schieben(grund, -1) : grund;
    const vSeed = 1 + z.zahl(1e6), erster = {name: inj.name, wahl: z.zahl(1000)};
    const spec = injektoren => ({id, vorlage: vName, vSeed, kunde, injektoren, stufe, karriere: V.stufe, art: opts.art === "wartung" ? "wartung" : "stoerung", generiert: true,
      skills: [skill, ...inj.skills.filter(s => s !== skill)].slice(0, 2), maxZiele: flow === "geruest" ? 1 : flow === "verwicklung" ? 4 : undefined});
    let def = null;
    try {
      def = Spiel.ticketBauen(spec([erster]));
      if (def && flow === "verwicklung") {
        /* zweiter Fehler: ein anderer Injektor derselben Vorlage, der mindestens ein WEITERES Ziel bricht (sonst ließe er sich übersehen) */
        const gebrochen = d => new Set(d.ziele.filter(x => x.erwartet).map(x => x.text));
        const eins = gebrochen(def), andere = z.mischen(Object.values(Spiel.INJEKTOREN).filter(i => i !== inj && i.vorlagen.includes(vName) && i.skills[0] !== inj.skills[0]));
        let zwei = null;
        for (const i2 of andere.slice(0, 12)) {
          let d2 = null;
          try { d2 = Spiel.ticketBauen(spec([erster, {name: i2.name, wahl: z.zahl(1000)}])); } catch (e) { d2 = null; }
          if (d2 && [...eins].every(t => gebrochen(d2).has(t)) && gebrochen(d2).size > eins.size) { zwei = d2; break; }
        }
        def = zwei;
      }
    } catch (e) { def = null; }
    if (def) { Spiel.generierte[id] = def; return def; }
  }
  throw new Error(`Kein Ticket für ${skill} erzeugbar (Seed ${seed})`);
};
