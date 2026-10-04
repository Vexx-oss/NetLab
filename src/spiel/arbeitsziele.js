"use strict";
/* ---------- Arbeitsziele: Zielarten „befehl“ und „antwort“ (Plan – Ausbau 1.2, C4; Architektur § 9.5) ----------
   Netzziele (erreichbar, dhcp, konfig …) prüft die Simulation am Netz. Arbeitsziele prüfen, was der Spieler im Auftrag
   GETAN hat: einen Terminalbefehl ausgeführt (inst.befehle, aus dem Terminal über Bus „befehl“) oder einen Wert aus einer
   Ausgabe abgelesen und in der Mappe eingetragen (inst.antworten).
     {typ:"befehl",  geraet, muster:"^ipconfig( /all)?$", beispiel:"ipconfig", text}
     {typ:"antwort", id, frage, pruefen:{art:"ip"|"maske"|"gw"|"dns"|"mac", geraet, port?}, text}
   Die richtige Antwort kommt immer aus dem aktuellen Netz (so, wie ipconfig sie zeigt) – nie als fester Wert aus dem
   Ticket. Ein falscher Wert verrät die richtige Antwort nicht (R1). */
Spiel.ARBEITSZIELE = {befehl: true, antwort: true, tabelle: true, audit: true, notiz: true};
Spiel.ANTWORT_ARTEN = {ip: "IP-Adresse", maske: "Subnetzmaske", gw: "Standardgateway", dns: "DNS-Server", mac: "MAC-Adresse"};
Spiel.istArbeitsziel = z => !!(z && Spiel.ARBEITSZIELE[z.typ]);
Spiel.antwortSchluessel = z => String(z.id || z.frage || z.text || "antwort");

Spiel.antwortSoll = function(netz, ziel){
  const p = (ziel && ziel.pruefen) || {}, g = netz && netz.geraete[p.geraet];
  if (!g) return null;
  const port = p.port || "eth0";
  if (p.art === "mac") return ((g.hw && g.hw.macs) || {})[port] || null;
  if (typeof Sim === "undefined" || typeof Sim.adresse !== "function") return null;
  const a = Sim.adresse(netz, p.geraet, port);
  return ({ip: a.ip, maske: a.maske, gw: a.gw, dns: a.dns})[p.art] || null;
};
/* Vergleich wie ein Mensch: Leerzeichen egal, MAC in jeder Schreibweise (00-1A-2B-…, 00:1a:2b:…, 001a.2b…) */
Spiel.antwortGleich = function(art, a, b){
  const n = x => String(x == null ? "" : x).trim().toLowerCase().replace(/\s+/g, "");
  if (art === "mac") { const m = x => n(x).replace(/[^0-9a-f]/g, ""); return m(a).length === 12 && m(a) === m(b); }
  return n(a) !== "" && n(a) === n(b);
};
/* Befehl normalisieren: Mehrfach-Leerzeichen zu einem, außen nichts */
Spiel.befehlNorm = b => String(b || "").trim().replace(/\s+/g, " ");

Spiel.arbeitsziel = function(inst, ziel, netz){
  netz = netz || (inst && inst.netz);
  if (ziel.typ === "befehl") {
    let re;
    try { re = new RegExp(ziel.muster || "^$", "i"); } catch (e) { return {ok: false, grund: "FEHLER", trace: null, text: "Ungültiges Befehlsmuster im Ticket."}; }
    const lief = ((inst && inst.befehle) || []).some(b => (!ziel.geraet || b.geraet === ziel.geraet) && b.ok !== false && re.test(Spiel.befehlNorm(b.befehl)));
    const wo = ziel.geraet ? Spiel.geraetName(netz, ziel.geraet) : "einem Gerät";
    return lief ? {ok: true, grund: null, trace: null, text: ziel.text || "Befehl ausgeführt"}
      : {ok: false, grund: "BEFEHL_FEHLT", trace: null, text: `Im Terminal von ${wo} noch nicht ausgeführt.`};
  }
  if (ziel.typ === "antwort") {
    const wert = ((inst && inst.antworten) || {})[Spiel.antwortSchluessel(ziel)];
    if (wert == null || String(wert).trim() === "") return {ok: false, grund: "ANTWORT_FEHLT", trace: null, text: "Noch keine Antwort eingetragen."};
    const soll = Spiel.antwortSoll(netz, ziel);
    const ok = soll != null && Spiel.antwortGleich((ziel.pruefen || {}).art, wert, soll);
    return {ok, grund: ok ? null : "ANTWORT_FALSCH", trace: null,
      text: ok ? (ziel.text || "Antwort stimmt") : `„${String(wert).trim()}“ passt nicht zu dem, was das Gerät gerade zeigt.`};
  }
  if (ziel.typ === "notiz") {                                 /* Änderungsnotiz (E1, Variante „sauber“) */
    const n = String((inst && inst.notiz) || "").trim().length, ok = n >= (ziel.min || 20);
    return {ok, grund: ok ? null : "NOTIZ_FEHLT", trace: null, text: ok ? (ziel.text || "Notiz geschrieben") : n ? "Die Notiz ist noch zu knapp – ein ganzer Satz: was, wo, warum." : "Noch keine Notiz geschrieben."};
  }
  if (ziel.typ === "audit") {                                 /* Plan-Audit (E1, spiel/audit.js) */
    const p = Spiel.audit.pruefen(inst, ziel);
    return {ok: p.ok, grund: p.ok ? null : "AUDIT_OFFEN", trace: null,
      text: p.ok ? (ziel.text || "Alle Fehler markiert") : `${p.gefunden} von ${p.gesamt} falschen Werten markiert${p.zuviel ? `, ${p.zuviel} richtige${p.zuviel === 1 ? "r Wert" : " Werte"} zu Unrecht markiert` : ""}.`};
  }
  if (ziel.typ === "tabelle") {                               /* Adressplan (E1, spiel/beratung.js) */
    const p = Spiel.beratung.pruefen(inst, ziel), ok = p.richtig === p.gesamt;
    return {ok, grund: ok ? null : "TABELLE_OFFEN", trace: null, text: ok ? (ziel.text || "Tabelle stimmt") : `${p.richtig} von ${p.gesamt} Feldern richtig.`};
  }
  return {ok: false, grund: null, trace: null, text: `Unbekanntes Arbeitsziel „${ziel.typ}“.`};
};

/* Antwort aus der Mappe eintragen → Prüfergebnis (die Mappe zeigt ✓ nur, wo das Niveau Live-Haken erlaubt) */
Spiel.antwortSetzen = function(inst, ziel, wert){
  if (!inst || !ziel || ziel.typ !== "antwort") return null;
  inst.antworten ||= {};
  const w = String(wert == null ? "" : wert).trim().slice(0, 60);
  if (w) inst.antworten[Spiel.antwortSchluessel(ziel)] = w;
  else delete inst.antworten[Spiel.antwortSchluessel(ziel)];
  inst.fortschritt = jetzt();
  Spiel.speichern();
  Spiel.melden("arbeit-geaendert", {inst, ziel});
  return Spiel.arbeitsziel(inst, ziel);
};

/* Durchspiel-Test: Was ein Spieler täte – jeden geforderten Befehl (ziel.beispiel) im Terminal des Geräts ausführen
   (über den Verlauf, also rückgängig machbar) und jede Antwort so eintragen, wie das Netz sie zeigt. */
Spiel.arbeitszieleErfuellen = function(inst){
  const def = Spiel.defVon(inst);
  for (const z of Spiel.varianten ? Spiel.varianten.ziele(inst, def) : def.ziele || []) {
    if (z.typ === "befehl" && !Spiel.arbeitsziel(inst, z).ok) {
      if (!z.beispiel) throw new Error(`Ziel „${z.text}“: beispiel fehlt`);
      const s = CLI.sitzung(inst.netz, z.geraet, {verlauf: Spiel.verlaufVon(inst)});
      let r = null;
      for (const zeile of String(z.beispiel).split("\n").filter(x => x.trim())) r = CLI.eingabe(s, zeile);
      Spiel.befehle.merken(inst, {geraet: z.geraet, befehl: String(z.beispiel).split("\n").pop(), ok: Spiel.befehle.gelaufen(r)});
    }
    if (z.typ === "antwort") (inst.antworten ||= {})[Spiel.antwortSchluessel(z)] = Spiel.antwortSoll(inst.netz, z) || "";
    if (z.typ === "audit") inst.audit = (z.fehler || []).slice();
    if (z.typ === "notiz") inst.notiz = "Geändert und gesichert (copy running-config startup-config), Grund im Auftrag beschrieben.";
    if (z.typ === "tabelle") { const soll = Spiel.beratung.soll(z); inst.tabelle ||= {}; for (const r of z.zeilen) for (const s of z.spalten) inst.tabelle[r.name + "." + s] = soll[r.name][s]; }
  }
  return inst;
};
