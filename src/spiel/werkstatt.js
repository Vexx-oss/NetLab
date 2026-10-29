"use strict";
/* ---------- Werkstatt: freier Modus als erweiterbare Sandbox (Architektur § 16.5) ----------
   Reine Logik: kein DOM, kein Math.random, keine Uhr. Zwei Aufrufe mit demselben Netz liefern dasselbe
   Ergebnis. Das Gerüst erweitert das vorhandene „Freie Labor“ (UI.sandbox, store "sandbox", v:1) –
   es legt keinen zweiten Modus und keine zweite Datenform an.

   Vertrag (docs/Architektur.md § 16.5):
     vorlagen()               → [{id, titel, kurz, text, bauen()}] in fester Reihenfolge; bauen() liefert ein
                                FRISCHES Netz der bestehenden Form {geraete, kabel}. Vorlagen stammen aus
                                vorhandenen Netzen (DATEN.beispiele, Spiel.vorlagen) – nichts neues erfunden.
     netzGueltig(netz)        → true/false. Prüft nur die Form und die Verweise (unbekannte Felder stören
                                nicht, alte Stände bleiben lesbar); wirft nie.
     freierName(netz, basis)  → erster freier Name: "PC-Kasse", sonst "PC-Kasse-2", "PC-Kasse-3", …
                                Eine vorhandene Endung -2/-3 gilt als Zähler und wird fortgesetzt
                                (Duplikat eines Duplikats heißt …-3, nicht …-2-2).
     dupliziere(netz, ids)    → {netz, ids, geraete}: NEUES Netz (tiefe Kopie der Vorlage) mit den Kopien.
                                Kopien erhalten neue IDs, frische MACs der neuen ID, Namen mit Suffix -2/-3
                                und einen Versatz im Raster. Konfiguration (running/startup/flash) wird
                                mitgenommen, Kabel NICHT: das Ergebnisnetz hat genau so viele Kabel wie die
                                Vorlage, die Kopien hängen an keinem. „Internet“ wird nicht dupliziert
                                (das Modell lässt genau eines zu).
     kennwerte(netz)          → {geraete, kabel, vlans}: Zahlen für die Werkstatt-Leiste. VLANs zählen
                                konfigurierte VLANs > 1 (VLAN 1 = Standard) an Switches und Access-Ports.
   Ein Verlaufsschritt entsteht erst in der Oberfläche: editor.js ruft dupliziere() und schreibt die
   gelieferten Geräte in EINEM verlauf.aendern() ins laufende Netz. */
Spiel.werkstatt = (() => {
  const KURZ = {pc: "pc", server: "srv", switch: "sw", router: "r", firewall: "fw", internet: "inet", nas: "nas"};
  const VERSATZ = 60;                       /* Kopien stehen sichtbar neben dem Original (Raster 20) */

  function freieId(netz, typ){
    const kurz = KURZ[typ] || "g";
    let i = 1; while (netz.geraete[kurz + i]) i++; return kurz + i;
  }

  function namen(netz){
    const s = new Set();
    for (const g of Object.values(netz && netz.geraete ? netz.geraete : {})) if (g && typeof g.name === "string") s.add(g.name);
    return s;
  }

  /* Endung -2, -3, … wird als Zähler gelesen: Basis ohne Suffix, dann die erste freie Zahl ab 2. */
  function freierName(netz, basis){
    const roh = String(basis == null ? "" : basis).trim() || "Gerät";
    const stamm = roh.replace(/-\d+$/, "");
    const vergeben = namen(netz);
    if (!vergeben.has(stamm)) return stamm;
    for (let i = 2; ; i++) { const n = stamm + "-" + i; if (!vergeben.has(n)) return n; }
    /* Ende nie erreicht: die Namen sind endlich, irgendwann ist einer frei (kein Datum, kein Zufall). */
  }

  function netzGueltig(netz){
    try {
      if (!netz || typeof netz !== "object" || Array.isArray(netz)) return false;
      const g = netz.geraete;
      if (!g || typeof g !== "object" || Array.isArray(g)) return false;
      if (!Array.isArray(netz.kabel)) return false;
      for (const [id, d] of Object.entries(g)) {
        if (!d || typeof d !== "object" || Array.isArray(d)) return false;
        if (!d.typ || !KURZ[d.typ]) return false;
        if (d.id != null && d.id !== id) return false;
        if (typeof d.name !== "string" || !d.name) return false;
        if (!Number.isFinite(d.x) || !Number.isFinite(d.y)) return false;
        if (!d.running || typeof d.running !== "object" || Array.isArray(d.running)) return false;
      }
      const kabels = new Set();
      for (const k of netz.kabel) {
        if (!k || typeof k !== "object") return false;
        if (typeof k.id !== "string" || !k.id || kabels.has(k.id)) return false;
        kabels.add(k.id);
        for (const seite of [k.a, k.b]) {
          if (!seite || typeof seite.geraet !== "string" || typeof seite.port !== "string") return false;
          if (!g[seite.geraet]) return false;
        }
      }
      if (netz.zustand != null && (typeof netz.zustand !== "object" || Array.isArray(netz.zustand))) return false;
      return true;
    } catch (e) { return false; }
  }

  /* Konfiguration einer Kopie übernehmen: ohne id/hw (MACs hängen an der neuen ID), Name = neuer Name,
     Laufzeit (zustand) wird nicht mitkopiert – die gehört zur Sitzung, nicht zur Vorlage. */
  function konfigurationUebernehmen(kopie, quelle, neuerName){
    kopie.running = tief(quelle.running);
    if (kopie.running && typeof kopie.running === "object") kopie.running.hostname = neuerName;
    kopie.startup = quelle.startup ? tief(quelle.startup) : null;
    if (kopie.startup && typeof kopie.startup === "object") kopie.startup.hostname = neuerName;
    kopie.flash = tief(quelle.flash);
    if (quelle.os) kopie.os = quelle.os;
  }

  function dupliziere(netz, ids){
    if (!netzGueltig(netz)) throw new Error("Netz ist nicht gültig – duplizieren nicht möglich.");
    const neu = Modell.kopie(netz);
    const gesehen = new Set();
    const kopien = [];
    for (const id of Array.isArray(ids) ? ids : []) {
      if (gesehen.has(id)) continue;
      gesehen.add(id);
      const quelle = netz.geraete[id];
      if (!quelle) continue;
      if (quelle.typ === "internet") continue;                 /* genau ein Internet je Netz (Modell-Invariante) */
      const neuId = freieId(neu, quelle.typ);
      const name = freierName(neu, quelle.name);
      const kopie = Modell.geraet(neu, quelle.typ, {id: neuId, name, x: quelle.x + VERSATZ, y: quelle.y + VERSATZ, skin: quelle.skin || null, an: quelle.an !== false});
      konfigurationUebernehmen(kopie, quelle, name);
      kopien.push(kopie);
    }
    return {netz: neu, ids: kopien.map(g => g.id), geraete: kopien};
  }

  function vlanzahl(netz){
    const s = new Set();
    for (const g of Object.values(netz && netz.geraete ? netz.geraete : {})) {
      const vl = g && g.flash && g.flash.vlans;
      if (vl && typeof vl === "object") for (const nr of Object.keys(vl)) if (+nr > 1) s.add(String(+nr));
      const ports = g && g.running && g.running.ports;
      if (ports && typeof ports === "object") for (const p of Object.values(ports)) if (p && +p.accessVlan > 1) s.add(String(+p.accessVlan));
    }
    return s.size;
  }

  function kennwerte(netz){
    const liste = netz && netz.geraete ? Object.values(netz.geraete) : [];
    return {
      geraete: liste.length,
      kabel: Array.isArray(netz && netz.kabel) ? netz.kabel.length : 0,
      vlans: vlanzahl(netz),
    };
  }

  function vorlagen(){
    const buero = () => {
      const v = Spiel.vorlagen && Spiel.vorlagen.buero;
      if (!v || typeof v.bauen !== "function") return Modell.neu();
      return v.bauen(Zufall("werkstatt:buero"), {kunde: "schreibbuero"}).netz;   /* fester Seed: immer dasselbe Netz */
    };
    return [
      {id: "leer", titel: "Leeres Netz", kurz: "von null bauen", text: "Nur die Fläche. Jedes Gerät setzt du selbst – gut zum Üben und für eigene Ideen.",
        bauen: () => Modell.neu()},
      {id: "salon", titel: "Salon", kurz: "LAN, Router, NAT", text: "Fünf Geräte, ein LAN, ein Router mit NAT ins Internet. Alles gesund – zum Ausprobieren und Kaputtmachen.",
        bauen: () => DATEN.beispiele.salon()},
      {id: "buero", titel: "Schreibbüro", kurz: "DHCP, DNS, zwei Netze", text: "Clients und Server in zwei Netzen, DHCP, DNS, Dateifreigabe. Die mittlere Größe für echte Umbauten.",
        bauen: buero},
      {id: "praxis", titel: "Arztpraxis", kurz: "drei VLANs", text: "Drei VLANs mit Router-on-a-Stick, Server im Verwaltungsnetz, Gäste per ACL getrennt.",
        bauen: () => DATEN.beispiele.praxis()},
    ];
  }

  return {vorlagen, netzGueltig, freierName, dupliziere, kennwerte};
})();
