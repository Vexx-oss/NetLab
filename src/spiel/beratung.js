"use strict";
/* ---------- Form „Adressplan“ (Beratung; Plan – Ausbau 1.2, E1.3; Architektur § 9.6) ----------
   Ein Kunde will sein Netz für Abteilungen aufteilen. Einstieg: vier gleich große Netze (/26); AP1: VLSM mit 3–4
   Abteilungen in einem /24; AP2: VLSM mit 4–5 Abteilungen in einem /22, dazu eine Router-Verbindung (/30).
   Vergeben wird lückenlos ab der Basisadresse, größte Abteilung zuerst – so rechnet auch die Prüfung. Jede Zelle wird
   mit den IP-Helfern nachgerechnet, nie gegen feste Werte. Quelle: Fragen – Subnetting; RFC 4632 (CIDR). */
Spiel.beratung = {};
Spiel.beratung.SPALTEN = {netz: "Netzadresse", praefix: "Präfix", erster: "Erster Host", letzter: "Letzter Host", broadcast: "Broadcast"};
Spiel.beratung.ABTEILUNGEN = {
  salon: ["Kasse", "Büro", "Gäste-WLAN", "Kameras", "Technik"],
  baeckerei: ["Laden", "Backstube", "Büro", "Gäste-WLAN", "Kühlhaus-Sensoren"],
  schreibbuero: ["Schreibplätze", "Sekretariat", "Server", "Gäste", "Drucker"],
  praxis: ["Behandlung", "Empfang", "Labor", "Verwaltung", "Gäste-WLAN"],
  autohaus: ["Werkstatt", "Verkauf", "Lager", "Verwaltung", "Kunden-WLAN"],
  mittelstand: ["Produktion", "Entwicklung", "Vertrieb", "Verwaltung", "Server"],
};

/* Soll je Abteilung: Block = nächste Zweierpotenz ≥ Hosts + 2 (Netz- und Broadcastadresse), fortlaufend ab der Basis */
Spiel.beratung.praefixFuer = hosts => 32 - Math.ceil(Math.log2(hosts + 2));
Spiel.beratung.soll = function(ziel){
  const b = IP.ausCidr(ziel.basis);
  let cur = IP.zuZahl(b.netz);
  const rows = {};
  for (const z of ziel.zeilen) {
    const p = z.praefix ?? Spiel.beratung.praefixFuer(z.hosts), groesse = 2 ** (32 - p);
    const netz = IP.zuText(cur >>> 0), bc = IP.zuText((cur + groesse - 1) >>> 0);
    rows[z.name] = {netz, praefix: "/" + p, erster: IP.plus(netz, 1), letzter: IP.plus(bc, -1), broadcast: bc};
    cur += groesse;
  }
  return rows;
};
/* Eingabe wie ein Mensch: Leerzeichen egal; Präfix als „/26“, „26“ oder Maske 255.255.255.192 */
Spiel.beratung.gleich = function(spalte, ist, soll){
  let v = String(ist == null ? "" : ist).trim().replace(/\s+/g, "");
  if (!v) return false;
  if (spalte === "praefix") { if (IP.maskeGueltig(v)) v = "/" + IP.praefix(v); else if (/^\d{1,2}$/.test(v)) v = "/" + v; }
  return v === soll;
};
Spiel.beratung.pruefen = function(inst, ziel){
  const soll = Spiel.beratung.soll(ziel), werte = (inst && inst.tabelle) || {}, ok = [], falsch = [], leer = [];
  for (const z of ziel.zeilen) for (const s of ziel.spalten) {
    const key = z.name + "." + s, w = werte[key];
    if (w == null || String(w).trim() === "") leer.push(key);
    else (Spiel.beratung.gleich(s, w, soll[z.name][s]) ? ok : falsch).push(key);
  }
  return {ok, falsch, leer, richtig: ok.length, gesamt: ziel.zeilen.length * ziel.spalten.length};
};
Spiel.tabelleSetzen = function(inst, ziel, key, wert){
  inst.tabelle ||= {};
  const w = String(wert == null ? "" : wert).trim().slice(0, 40);
  if (w) inst.tabelle[key] = w; else delete inst.tabelle[key];
  inst.fortschritt = jetzt();
  Spiel.speichern();
  Spiel.melden("arbeit-geaendert", {inst});
  const [zeile, spalte] = key.split(".");
  return w ? Spiel.beratung.gleich(spalte, w, Spiel.beratung.soll(ziel)[zeile][spalte]) : null;
};

(Spiel.formGeneratoren ||= {}).beratung = function(seed, opts = {}, id){
  const z = Zufall("beratung:" + seed);
  const kunde = opts.kunde || "salon", K = Spiel.kundenDaten(kunde);
  const vName = Spiel.vorlagen._fuerKunde[kunde] || "lan", V = Spiel.vorlagen[vName];
  const niveau = opts.stufe || (V.stufe >= 4 ? "AP2" : V.stufe >= 2 ? "AP1" : "E");
  const namen = (Spiel.beratung.ABTEILUNGEN[kunde] || Spiel.beratung.ABTEILUNGEN.salon).slice();
  const von = (a, b) => a + z.zahl(b - a + 1);
  let basis, zeilen, spalten = Object.keys(Spiel.beratung.SPALTEN);
  if (niveau === "E") {
    basis = `192.168.${von(10, 99)}.0/24`;
    zeilen = namen.slice(0, 4).map(name => ({name, hosts: von(20, 60), praefix: 26}));
    spalten = ["netz", "erster", "letzter", "broadcast"];
  } else if (niveau === "AP1") {
    basis = `192.168.${von(10, 99)}.0/24`;
    const n = 3 + z.zahl(2), bereiche = [[33, 62], [17, 30], [7, 14], [3, 6]];
    zeilen = bereiche.slice(0, n).map((b, i) => ({name: namen[i], hosts: von(b[0], b[1])}));
  } else {
    basis = `10.${von(10, 200)}.${4 * von(0, 60)}.0/22`;
    const n = 4 + z.zahl(2), bereiche = [[257, 500], [129, 250], [65, 120], [33, 60]];
    zeilen = bereiche.slice(0, n - 1).map((b, i) => ({name: namen[i], hosts: von(b[0], b[1])}));
    zeilen.push({name: "Router-Verbindung", hosts: 2});
  }
  const ziel = {typ: "tabelle", id: "adressplan", basis, zeilen, spalten, text: "Adressplan vollständig und richtig"};
  const soll = Spiel.beratung.soll(ziel), erste = zeilen[0], p1 = soll[erste.name];
  const liste = zeilen.map(r => `${r.name}: ${r.hosts} Geräte`).join(", ");
  const ap = K.ansprechpartner || {};
  const def = Spiel.ticketBauen({id, vorlage: vName, vSeed: 1 + z.zahl(1000000), kunde, injektoren: [], ziele: [], zusatzZiele: [ziel],
    stufe: niveau, karriere: V.stufe, skills: ["lab.subnetz", "lab.netz"], minuten: niveau === "E" ? 6 : 9,
    titel: `Adressplan für ${zeilen.length} Bereiche`,
    briefing: `${z.wahl(["Hallo,", "Guten Tag,", "Hi,"])} wir wollen unser Netz aufteilen – jeder Bereich bekommt sein eigenes Netz. Zur Verfügung steht ${basis}. ${liste}. ${niveau === "E" ? "Am einfachsten vier gleich große Netze, oder?" : "Bitte so knapp wie möglich, wir wollen Platz für später."} Kannst du uns den Adressplan machen?\n\n${ap.name || K.name}, ${K.name}`,
    symptom: `${K.name} braucht einen Adressplan für ${zeilen.length} Bereiche aus ${basis}.`,
    erklaerung: "Jedes Netz braucht so viele Adressen wie Geräte plus zwei (Netzadresse und Broadcast), aufgerundet auf die nächste Zweierpotenz – daraus folgt das Präfix: 2^(32 − Präfix) Adressen. Wer die großen Blöcke zuerst vergibt, bekommt lückenlose Netze, die alle an ihren Blockgrenzen beginnen (VLSM).",
    quelle: "Fragen – Subnetting · RFC 4632 (CIDR)",
    loesung: zeilen.map(r => { const s = soll[r.name]; return {aktion: "erklaeren", text: `${r.name} (${r.hosts}): ${s.netz}${s.praefix} · Hosts ${s.erster} – ${s.letzter} · Broadcast ${s.broadcast}`}; }),
    hilfen: {frage: [`Wie viele Adressen braucht „${erste.name}“ mit ${erste.hosts} Geräten – und welche Zweierpotenz passt?`], bereich: [],
      konkret: [`${erste.name}: ${erste.hosts} + 2 = ${erste.hosts + 2} Adressen → Block ${2 ** (32 - Number(p1.praefix.slice(1)))} → ${p1.praefix}. Es beginnt bei ${p1.netz}.`]},
    lohn: Spiel.lohnFuer(V.stufe, niveau)});
  if (def) { def.blatt = "adressplan"; def.regression = false; }
  return def;
};
