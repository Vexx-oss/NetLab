"use strict";
/* ---------- Ticket-Bau und Generator (Konzept § 8.1/8.2) ----------
   Spiel.ticketBauen(spec) → Ticket-Definition (Architektur § 7.1) oder null (Fehler bricht kein Ziel).
     spec: {id, vorlage, vSeed, kunde, injektoren:[{name, ziel?:key, wahl?:zahl}], stufe, karriere, art,
            titel, briefing, symptom, erklaerung, quelle, hilfen, lohn, minuten, skills, vorhersage,
            ziele? (ersetzt die Vorlagen-Ziele), zusatzZiele?, maxZiele?, umbau?(netz, rollen, z), loesungExtra?[],
            loesung? (ersetzt die berechnete), loesungFn?(gesund, rollen), alleZiele?}
   Die Netz-Fabrik baut die Vorlage mit vSeed immer gleich und setzt dieselben Fehler: deterministisch.
   Spiel.generiere(skill, seed, {stufe, kunde, art}) → generiertes Ticket, registriert in Spiel.generierte. */
Spiel.generierte = Spiel.generierte || {};

Spiel.ticketBauen = function(spec){
  const V = Spiel.vorlagen[spec.vorlage];
  if (!V) throw new Error("Unbekannte Vorlage: " + spec.vorlage);
  const vSeed = spec.vSeed ?? 1;
  const bauen = () => V.bauen(Zufall(vSeed), {kunde: spec.kunde});
  const gesund = bauen();
  /* Fehler wählen: Kandidat je Injektor (fest per key oder per wahl) */
  const gewaehlt = [];
  for (const [i, s] of (spec.injektoren || []).entries()) {
    const inj = Spiel.INJEKTOREN[s.name];
    if (!inj) throw new Error("Unbekannter Injektor: " + s.name);
    const kand = inj.passt(gesund.netz, gesund.rollen) || [];
    if (!kand.length) return null;
    const k = s.ziel != null ? kand.find(c => c.key === s.ziel) : kand[(s.wahl || 0) % kand.length];
    if (!k) throw new Error(`Injektor ${s.name}: Ziel ${s.ziel} passt nicht (möglich: ${kand.map(c => c.key).join(", ")})`);
    const param = Object.assign({}, inj.param(gesund.netz, k, gesund.rollen, Zufall(vSeed * 31 + i + 7)), s.param || {});
    gewaehlt.push({inj, k, param});
  }
  const fabrik = () => {
    const w = bauen();
    if (spec.umbau) spec.umbau(w.netz, w.rollen, Zufall(vSeed + 99));
    for (const g of gewaehlt) g.inj.anwenden(w.netz, g.k, g.param, Zufall(vSeed + 5));
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
  if (!ziele.some(z => z.erwartet)) return null;
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
  const symptom = spec.symptom || Spiel.symptomText(gebrochen[0], gesund.netz);
  return {
    id: spec.id, art: spec.art || "stoerung", stufe, karriere, kunde, reihe: spec.reihe,
    titel: spec.titel || Spiel.titelAusZiel(gebrochen[0]) || (erster ? erster.titel : "Störung"),   /* Kundensicht – der Injektor-Titel verriete die Ursache */
    briefing: spec.briefing || Spiel.briefingText(kunde, symptom, Zufall(vSeed + 3)),
    symptom, skills, netz: fabrik, ziele: endZiele, hilfen, loesung,
    erklaerung: spec.erklaerung || gewaehlt.map(g => g.inj.erklaerung).filter(Boolean).join(" "),
    quelle: spec.quelle || (erster ? erster.quelle : "Network – Lernfassung"),
    lohn: spec.lohn || Spiel.lohnFuer(karriere, stufe), minuten: spec.minuten || (spec.art === "projekt" ? 15 : 3 + 2 * karriere),
    vorhersage: !!spec.vorhersage, generiert: !!spec.generiert,
    injektoren: gewaehlt.map(g => g.inj.name), gruende: gewaehlt.map(g => g.inj.gruende),
    vorlage: spec.vorlage, regressionOhne: spec.regressionOhne, regression: spec.regression,
  };
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

/* Laien-Symptom aus einem gebrochenen Ziel */
Spiel.symptomText = function(ziel, netz){
  if (!ziel) return "Irgendetwas stimmt im Netz nicht.";
  const t = ziel.text || "";
  if (ziel.typ === "blockiert") return `Das darf nicht sein: ${t.replace(/ NICHT| nicht/, "")} – das geht gerade.`;
  if (ziel.typ === "dhcp") return `${t.replace(/ bekommt.*/, "")} bekommt keine Adresse mehr.`;
  if (ziel.typ === "gespeichert") return "Nach jedem Stromausfall ist etwas weg.";
  return `„${t}“ klappt nicht mehr.`;
};
/* Briefing in Kundenstimme: Einstieg aus den Kundensätzen + Symptom */
Spiel.briefingText = function(kundeId, symptom, z){
  const k = (DATEN.kunden || {})[kundeId];
  const anrede = k ? z.wahl(["Hallo!", "Hi,", "Guten Morgen,", "Hallo du,"]) : "Hallo,";
  const dringend = k && k.saetze && k.saetze.dringend && k.saetze.dringend.length ? z.wahl(k.saetze.dringend) : "";
  const gruss = k ? `\n\n${k.ansprechpartner.name}, ${k.name}` : "";
  return `${anrede} ${symptom} ${dringend}`.trim() + gruss;
};

/* Generator: Fertigkeit → passender Injektor → passende Vorlage (bevorzugt die des Kunden) */
Spiel.generiere = function(skill, seed, opts = {}){
  const id = `gen-${skill}-${seed}`;
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
    const stufe = niveau || (skillInfo.ap === "AP2" ? "AP1" : "E");
    let def = null;
    try {
      def = Spiel.ticketBauen({id, vorlage: vName, vSeed: 1 + z.zahl(1e6), kunde, injektoren: [{name: inj.name, wahl: z.zahl(1000)}],
        stufe, karriere: V.stufe, art: opts.art === "wartung" ? "wartung" : "stoerung", generiert: true,
        skills: [skill, ...inj.skills.filter(s => s !== skill)].slice(0, 2)});
    } catch (e) { def = null; }
    if (def) { Spiel.generierte[id] = def; return def; }
  }
  throw new Error(`Kein Ticket für ${skill} erzeugbar (Seed ${seed})`);
};
