"use strict";
/* ---------- Akte: Beweiskarten aus der Diagnose (Design – Spielspaß 2.0, Hebel 2; Architektur § 9.4) ----------
   Jede Diagnose legt eine Karte ab: Quelle · Befund in einer Zeile · (Schicht). Der Befund ist, was ein echtes Werkzeug
   zeigt („Zeitüberschreitung“, „Zielhost nicht erreichbar“) – den inneren Grund der Simulation zeigt die Oberfläche nur
   im Einstieg (R1). Gleiche Messung noch einmal = dieselbe Karte, „2×“. Höchstens 60 Karten je Auftrag (★ bleiben). */
Spiel.akte = {};
Spiel.AKTE_MAX = 60;

Spiel.akte.liste = inst => { if (!Array.isArray(inst.akte)) inst.akte = []; return inst.akte; };
Spiel.akte.hinzu = function(inst, karte){
  const l = Spiel.akte.liste(inst);
  const gleich = l.find(k => k.art === karte.art && k.von === karte.von && k.nach === karte.nach && k.befund === karte.befund);
  if (gleich) { gleich.anzahl = (gleich.anzahl || 1) + 1; gleich.t = jetzt(); Spiel.speichern(); return gleich; }
  const n = l.reduce((m, k) => Math.max(m, k.n || 0), 0) + 1;
  const neu = Object.assign({n, t: jetzt(), wichtig: false, anzahl: 1, grund: null, schicht: null}, karte);
  l.push(neu);
  while (l.length > Spiel.AKTE_MAX) { const i = l.findIndex(k => !k.wichtig); if (i < 0) break; l.splice(i, 1); }
  Spiel.speichern();
  return neu;
};
Spiel.akte.stern = function(inst, n){
  const k = Spiel.akte.liste(inst).find(x => x.n === n);
  if (k) { k.wichtig = !k.wichtig; Spiel.speichern(); }
  return k;
};
Spiel.akte.schicht = code => (code && typeof Sim !== "undefined" && Sim.GRUENDE[code] && Sim.GRUENDE[code].schicht) || null;

/* Ping → Karte. Befund wie die Windows-Ausgabe, Grund/Schicht aus der Trace (nur Einstieg zeigt sie). */
Spiel.akte.ausPing = function(inst, {von, nach, ergebnis, netz}){
  if (!ergebnis) return null;
  netz = netz || inst.netz;
  const name = id => (netz.geraete[id] && netz.geraete[id].name) || id;
  const antw = Array.isArray(ergebnis.antworten) ? ergebnis.antworten : [];
  const n = antw.length || 4, ok = antw.filter(a => a && a.ok).length;
  const ereignisse = (ergebnis.trace && ergebnis.trace.ereignisse) || [];
  const meldung = ereignisse.find(e => e.frame && e.frame.icmp && (e.frame.icmp.typ === "unreachable" || e.frame.icmp.typ === "time-exceeded"));
  const grund = antw.find(a => a && !a.ok && a.grund)?.grund || [...ereignisse].reverse().find(e => e.art === "verwerfen" && e.grund)?.grund || null;
  let befund;
  if (ok === n && ok > 0) befund = `${ok}/${n} Antworten`;
  else if (ok > 0) befund = `${ok}/${n} Antworten, Rest verloren`;
  else if (meldung) befund = meldung.frame.icmp.typ === "time-exceeded" ? `TTL abgelaufen (Meldung von ${meldung.frame.ip?.src || "einem Router"})`
    : `Zielhost nicht erreichbar (Meldung von ${meldung.frame.ip?.src || "einem Router"})`;
  else befund = "Zeitüberschreitung – keine Antwort";
  const ziel = nach && netz.geraete[nach] ? name(nach) : String(nach || "?");
  return Spiel.akte.hinzu(inst, {art: "ping", von, nach, titel: `Ping ${name(von)} → ${ziel}`, befund, ok: ok > 0 && ok === n,
    grund: ok === n ? null : grund, schicht: ok === n ? null : Spiel.akte.schicht(grund)});
};
/* Terminalbefehl (Phase C) → Karte: „PC-Kasse: ipconfig“ · Befund aus der CLI */
Spiel.akte.ausBefehl = function(inst, {geraet, befehl, befund, ok, netz}){
  netz = netz || inst.netz;
  const name = (netz.geraete[geraet] && netz.geraete[geraet].name) || geraet;
  const kurz = String(befehl).replace(/\s+/g, " ").slice(0, 48);
  return Spiel.akte.hinzu(inst, {art: "befehl", von: geraet, nach: kurz, titel: `${name}: ${kurz}`, befund, ok: !!ok});
};
/* Ausgeführte Terminalbefehle je Auftrag (Ziel „befehl“, Abzeichen „Von unten nach oben“) */
Spiel.befehle = {};
Spiel.befehle.liste = inst => { if (!Array.isArray(inst.befehle)) inst.befehle = []; return inst.befehle; };
Spiel.befehle.merken = function(inst, {geraet, befehl, ok}){
  const l = Spiel.befehle.liste(inst);
  l.push({t: jetzt(), geraet, befehl: String(befehl).slice(0, 120), ok: ok !== false});
  if (l.length > 100) l.splice(0, l.length - 100);
  Spiel.speichern();
  Spiel.melden("befehl-gemerkt", {inst});
  return l;
};
/* Diagnoseleiter im Terminal (C5): Adresse → Weg → Name, in dieser Reihenfolge. Zählt nur fehlerfrei gelaufene Befehle.
   Für das Abzeichen „Von unten nach oben“ und den Hinweis der Hilfestufe 2 – nie ein Zwang. */
Spiel.LEITER_BEFEHLE = {
  adresse: /^(ipconfig|ifconfig|ip (a|addr|address)( show)?|get-netipconfiguration)\b/i,
  weg: /^(ping|tracert|traceroute|pathping|test-netconnection)\s+(-\S+\s+(\d+\s+)?)*\d+\.\d+\.\d+\.\d+$/i,
  name: /^(nslookup|dig|host|resolve-dnsname)\b|^(ping|test-netconnection)\s+(\S+\s+)*[a-z][\w-]*(\.[\w-]+)+$/i,
};
Spiel.befehle.leiter = function(inst){
  const stufen = ["adresse", "weg", "name"], erreicht = [];
  for (const b of Spiel.befehle.liste(inst)) {
    const s = stufen[erreicht.length];
    if (s && b.ok !== false && Spiel.LEITER_BEFEHLE[s].test(Spiel.befehlNorm(b.befehl))) erreicht.push(s);
  }
  return {erreicht, vollstaendig: erreicht.length === stufen.length, naechste: stufen[erreicht.length] || null};
};
/* Hilfestufe 2: die nächste sinnvolle Diagnose im Terminal – nie die Lösung. Bezugsgerät: das erste Ziel mit einem Rechner als Absender. */
Spiel.naechsteDiagnose = function(inst){
  const def = Spiel.defVon(inst), netz = inst.netz;
  const host = id => id && netz.geraete[id] && Modell.HOST[netz.geraete[id].typ];
  const z = (def.ziele || []).find(x => host(x.von) || host(x.geraet));
  if (!z) return null;
  const g = netz.geraete[host(z.von) ? z.von : z.geraet], win = Modell.osVon(g) !== "linux";
  switch (Spiel.befehle.leiter(inst).naechste) {
    case "adresse": return `Fang unten an: Öffne das Terminal von ${g.name} (Doppelklick) und sieh dir mit ${win ? "ipconfig" : "ip a"} Adresse, Maske und Gateway an.`;
    case "weg": return `Eine Stufe höher: Antwortet das Standardgateway? ${win ? "ping" : "ping -c 4"} mit der Gateway-Adresse aus ${win ? "ipconfig" : "ip r"}.`;
    case "name": return `Der Weg ist geprüft – jetzt der Name: ${win ? "nslookup" : "dig"} mit dem Namen zeigt, ob DNS antwortet.`;
    default: return "Adresse, Weg und Name sind geprüft. Jetzt das Ziel selbst: Läuft der Dienst, lässt eine Regel durch? Die Frage des Seniors (Stufe 3) hilft weiter.";
  }
};
/* Kabeltester (Werkzeug aus dem Shop) → Karte */
Spiel.akte.ausKabeltest = function(inst, {a, b, oben, grund, netz}){
  netz = netz || inst.netz;
  const name = x => (netz.geraete[x.geraet] && netz.geraete[x.geraet].name) || x.geraet;
  return Spiel.akte.hinzu(inst, {art: "kabel", von: a.geraet + ":" + a.port, nach: b.geraet + ":" + b.port,
    titel: `Kabeltest ${name(a)} ${a.port} ↔ ${name(b)} ${b.port}`,
    befund: oben ? "Link oben – Signal auf beiden Seiten" : "Kein Link",
    ok: !!oben, grund: oben ? null : grund || "LINK_DOWN", schicht: 1});
};
