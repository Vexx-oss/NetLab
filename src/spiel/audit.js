"use strict";
/* ---------- Form „Plan-Audit“ (Plan – Ausbau 1.2, B5/E1.2; Architektur § 9.6) ----------
   Das Netz läuft – aber stimmt die Dokumentation des Kunden? Sein Netzplan enthält 1 (E), 2 (AP1) oder 3 (AP2) falsche
   Werte (IP, Maske, Gateway, DNS eines Rechners oder eine Router-Adresse). Man vergleicht Plan und Labor (Inspektor,
   ipconfig, show ip interface brief) und markiert in der Plan-Tabelle jeden Wert, der nicht stimmt.
   def.planFehler = [{geraet, port, feld, wert(falsch)}] – Spiel.plan.sollNetzVon setzt sie in den Plan, nie ins Netz. */
Spiel.audit = {};
Spiel.audit.schluessel = f => `${f.geraet}.${f.port}.${f.feld}`;
Spiel.audit.markieren = function(inst, key, an){
  const l = (inst.audit ||= []), i = l.indexOf(key);
  const neu = an == null ? i < 0 : !!an;
  if (neu && i < 0) l.push(key); else if (!neu && i >= 0) l.splice(i, 1);
  inst.fortschritt = jetzt();
  Spiel.speichern();
  Spiel.melden("arbeit-geaendert", {inst});
  return neu;
};
Spiel.audit.pruefen = function(inst, ziel){
  const markiert = new Set((inst && inst.audit) || []), soll = new Set(ziel.fehler || []);
  const gefunden = [...soll].filter(k => markiert.has(k)).length, zuviel = [...markiert].filter(k => !soll.has(k)).length;
  return {gefunden, zuviel, gesamt: soll.size, ok: gefunden === soll.size && zuviel === 0};
};

(Spiel.formGeneratoren ||= {}).audit = (() => {
  const HOST = {pc: true, server: true, nas: true};
  /* Ein glaubwürdig falscher Wert: Zahlendreher, Nachbaradresse, verwechselte Maske, Gateway „.1 statt .254“ */
  function falsch(z, feld, wert, belegt){
    if (feld === "maske") return z.wahl(["255.255.0.0", "255.255.255.128", "255.255.255.192", "255.0.0.0"].filter(m => m !== wert));
    const teile = wert.split("."), letzte = +teile[3];
    const kandidaten = [letzte + 1, letzte - 1, letzte + 10, letzte - 10, +String(letzte).split("").reverse().join(""), letzte === 1 ? 254 : letzte === 254 ? 1 : 100 + (letzte % 50)]
      .filter(x => x > 0 && x < 255 && x !== letzte).map(x => [...teile.slice(0, 3), x].join("."));
    const frei = kandidaten.filter(ip => !belegt.has(ip) || feld === "dns" || feld === "gw");
    return z.wahl(frei.length ? frei : kandidaten);
  }
  return function(seed, opts = {}, id){
    const z = Zufall("audit:" + seed);
    const kunde = opts.kunde || "salon", K = Spiel.kundenDaten(kunde);
    const vName = Spiel.vorlagen._fuerKunde[kunde] || "lan", V = Spiel.vorlagen[vName];
    const niveau = opts.stufe || (V.stufe >= 3 ? "AP1" : "E");
    const anzahl = {E: 1, AP1: 2, AP2: 3}[niveau] || 1;
    const vSeed = 1 + z.zahl(1000000);
    const netz = V.bauen(Zufall(vSeed), {kunde}).netz;
    const belegt = new Set(), zellen = [];
    for (const g of Object.values(netz.geraete)) for (const [port, a] of Object.entries((g.running && g.running.if) || {})) if (a && a.ip) belegt.add(a.ip);
    for (const g of Object.values(netz.geraete).sort((a, b) => a.id < b.id ? -1 : 1)) {
      const ifs = (g.running && g.running.if) || {};
      if (HOST[g.typ]) { const a = ifs.eth0; if (a && !a.dhcp && a.ip) for (const f of ["ip", "maske", "gw", "dns"]) if (a[f]) zellen.push({geraet: g.id, port: "eth0", feld: f, richtig: a[f]}); }
      else if (g.typ === "router") for (const [port, a] of Object.entries(ifs)) if (a && a.ip && !/\./.test(port.replace(/^\D+\d+\/\d+/, ""))) zellen.push({geraet: g.id, port, feld: "ip", richtig: a.ip});
    }
    const gewaehlt = [], geraete = new Set();
    for (const c of z.mischen(zellen)) {
      if (gewaehlt.length >= anzahl) break;
      if (geraete.has(c.geraet)) continue;                                    /* je Gerät höchstens ein Fehler */
      gewaehlt.push(Object.assign({}, c, {wert: falsch(z, c.feld, c.richtig, belegt)}));
      geraete.add(c.geraet);
    }
    if (gewaehlt.length < anzahl) return null;
    const FELD = {ip: "IP-Adresse", maske: "Maske", gw: "Gateway", dns: "DNS-Server"};
    const name = gid => netz.geraete[gid].name;
    const ziel = {typ: "audit", fehler: gewaehlt.map(Spiel.audit.schluessel), text: "Alle falschen Werte im Kundenplan markiert"};
    const ap = K.ansprechpartner || {};
    const def = Spiel.ticketBauen({id, vorlage: vName, vSeed, kunde, injektoren: [], ziele: [], zusatzZiele: [ziel], stufe: niveau, karriere: V.stufe,
      skills: ["lab.ip", "lab.netz"], minuten: 4 + 2 * anzahl,
      titel: "Stimmt unsere Netzdokumentation?",
      briefing: `${z.wahl(["Hallo,", "Guten Tag,", "Hi,"])} bevor nächste Woche ein neuer Dienstleister übernimmt, soll unsere Netzdokumentation stimmen. Laufen tut alles – aber ich traue dem Plan nicht.${niveau === "AP2" ? "" : ` Ich glaube, ${anzahl === 1 ? "ein Wert stimmt" : anzahl + " Werte stimmen"} nicht.`} Kannst du ihn mit dem echten Netz abgleichen und markieren, was falsch ist?\n\n${ap.name || K.name}, ${K.name}`,
      symptom: `${K.name} will wissen, welche Angaben im Netzplan nicht stimmen.`,
      erklaerung: "Eine Netzdokumentation ist nur so gut wie ihr letzter Abgleich mit der Wirklichkeit. Geprüft wird am Gerät selbst – ipconfig, show ip interface brief, Inspektor –, nicht am Plan. Wer nach jeder Änderung den Plan nachzieht, spart dem Nächsten Stunden.",
      quelle: "Plan – Ausbau 1.2 (B5) · ITIL: Configuration Management",
      loesung: gewaehlt.map(f => ({aktion: "erklaeren", text: `${name(f.geraet)} ${f.port}: ${FELD[f.feld]} im Plan ${f.wert}, im Netz ${f.richtig}`})),
      hilfen: {frage: ["Vergleiche Gerät für Gerät: Was zeigt das Gerät selbst – und was steht im Plan?"], bereich: gewaehlt.map(f => ({geraet: f.geraet})),
        konkret: gewaehlt.map(f => `${name(f.geraet)}: Schau dir ${FELD[f.feld]} an.`)},
      lohn: Spiel.lohnFuer(V.stufe, niveau)});
    if (!def) return null;
    def.planFehler = gewaehlt.map(f => ({geraet: f.geraet, port: f.port, feld: f.feld, wert: f.wert}));
    def.plan = {art: "netzplan"};
    def.regression = false;
    return def;
  };
})();
