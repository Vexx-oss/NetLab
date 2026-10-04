"use strict";
/* ---------- Spiel: Hilfeleiter (Konzept § 4) ----------
   0 Symptom/Ziel (immer sichtbar) · 1 Fehlersuche-Leiter · 2 Werkzeughinweis · 3 Frage des Seniors  – frei
   4 Bereich markieren (−½ Stern) · 5 konkreter Hinweis (−½ Stern) · 6 Lösung vorführen (−1 Stern, kein Scheitern)
   Nach dem Vorführen: Wiederholung im Lernmotor (L.ueben(skill, false, {hilfe:true})) und eine Variante als
   Ticket mit quelle "wiederholung", die später im Postfach erscheint. */

Spiel.HILFE = [
  {stufe: 0, name: "Symptom und Ziel", kosten: 0, knopf: "Auftrag"},
  {stufe: 1, name: "Fehlersuche-Leiter", kosten: 0, knopf: "Checkliste"},
  {stufe: 2, name: "Werkzeughinweis", kosten: 0, knopf: "Welches Werkzeug?"},
  {stufe: 3, name: "Frage des Seniors", kosten: 0, knopf: "Senior fragen"},
  {stufe: 4, name: "Bereich markieren", kosten: 0.5, knopf: "Bereich zeigen"},
  {stufe: 5, name: "Konkreter Hinweis", kosten: 0.5, knopf: "Konkreter Hinweis"},
  {stufe: 6, name: "Lösung vorführen", kosten: 1, knopf: "Lösung vorführen"},
];
Spiel.SENIOR_NACH_MS = 4 * 60 * 1000;

/* Fehlersuche von unten nach oben. Quelle: Fragen – Netzwerke planen (Betrieb und Fehlersuche: „Nach OSI von unten:
   Kabel/Link → IP-Konfiguration → Gateway (ping) → DNS (nslookup) → Dienst“), hier um VLAN, Route und ACL ergänzt. */
Spiel.LEITER = [
  {id: "link", titel: "Link", frage: "Steckt das Kabel, sind beide Ports eingeschaltet, ist das Gerät an?",
   werkzeug: "Ebene „Physik“ (Portstatus mit Symbol), am Switch oder Router: show ip interface brief"},
  {id: "vlan", titel: "VLAN", frage: "Liegen Quelle und Ziel im selben VLAN? Lässt der Trunk das VLAN durch?",
   werkzeug: "show vlan brief, show interfaces trunk"},
  {id: "ip", titel: "IP und Maske", frage: "Hat jedes Gerät eine Adresse im richtigen Netz, und passt die Maske?",
   werkzeug: "ipconfig am PC, Ebene „IP-Netze“"},
  {id: "gateway", titel: "Gateway", frage: "Ist ein Standardgateway eingetragen, liegt es im eigenen Netz, antwortet es auf ping?",
   werkzeug: "ipconfig, ping zum Gateway"},
  {id: "route", titel: "Route", frage: "Kennt jeder Router den Weg zum Ziel – und den Weg zurück?",
   werkzeug: "show ip route, tracert bzw. traceroute"},
  {id: "dienst", titel: "ACL und Dienst", frage: "Verwirft eine Regel das Paket? Läuft der Dienst auf dem Zielgerät, stimmt der Name (DNS)?",
   werkzeug: "show running-config (access-list, ip access-group), nslookup, Ereignisliste der Simulation"},
];

/* Welches Werkzeug zeigt, wo es hängt – je Fertigkeit (Stufe 2). Befehle wie in Konzept § 6. */
Spiel.WERKZEUGE = {
  "lab.link": "Schalte die Ebene „Physik“ ein: Jeder Port zeigt seinen Status. Am Switch oder Router listet show ip interface brief alle Schnittstellen mit Status und Protokoll.",
  "lab.ip": "ipconfig am PC zeigt Adresse, Maske und Gateway. Die Ebene „IP-Netze“ färbt jedes Subnetz als Zone.",
  "lab.netz": "Die Ebene „IP-Netze“ zeigt sofort, wer im selben Netz liegt. ipconfig zeigt die Maske des PCs.",
  "lab.subnetz": "Ebene „IP-Netze“ und ipconfig: Liegen Adresse und Gateway im selben Subnetz?",
  "lab.gateway": "Ping vom PC zum eigenen Gateway: Antwortet es? ipconfig zeigt, welches Gateway eingetragen ist.",
  "lab.arp": "arp -a am PC zeigt die bekannten MAC-Adressen. In der Simulation siehst du die ARP-Anfrage als Broadcast.",
  "lab.ping": "Ping-Werkzeug (P): von einem Gerät auf das andere ziehen und die Ereignisliste in der Simulation lesen.",
  "lab.switch": "show mac address-table am Switch zeigt, welche MAC-Adresse an welchem Port gelernt wurde.",
  "lab.dhcp": "ipconfig /renew am PC und in der Simulation die vier DHCP-Pakete (Discover, Offer, Request, Ack).",
  "lab.dns": "nslookup mit dem Namen am PC: Welche Adresse kommt zurück, und von welchem Server?",
  "lab.ports": "In der Simulation den Verbindungsaufbau verfolgen: RST heißt, auf dem Port lauscht kein Dienst.",
  "lab.tcp": "In der Simulation den Handshake verfolgen: SYN, SYN/ACK, ACK.",
  "lab.cli": "? zeigt an jeder Stelle der Konsole, was möglich ist; Tab vervollständigt.",
  "lab.speichern": "show running-config und show startup-config vergleichen: Was fehlt in der gespeicherten Fassung?",
  "lab.vlan": "show vlan brief am Switch zeigt, welcher Port in welchem VLAN ist.",
  "lab.trunk": "show interfaces trunk am Switch zeigt Trunk-Ports, erlaubte VLANs und das Native VLAN.",
  "lab.rostick": "show ip interface brief am Router (Subinterfaces) und show interfaces trunk am Switch.",
  "lab.acl": "show running-config am Router: access-list und ip access-group. Die Simulation zeigt, wo verworfen wird.",
  "lab.route": "show ip route am Router; traceroute zeigt, an welchem Router der Weg endet.",
  "lab.ttl": "traceroute bzw. tracert: Jede Zeile ist ein Router auf dem Weg.",
  "lab.nat": "show running-config am Router: Stehen ip nat inside und ip nat outside an den richtigen Schnittstellen?",
  "lab.portfwd": "show running-config am Router: Gibt es die statische NAT-Regel mit Protokoll und Port?",
  "lab.fw": "Regeltabelle der Firewall im Inspektor: Die erste passende Regel gewinnt.",
  "lab.dmz": "Regeltabelle der Firewall: Von welcher Zone in welche ist der Verkehr erlaubt?",
  "lab.portsec": "Inspektor des Switch-Ports: Port-Security und Status.",
  "lab.stp": "Simulation: Bricht der Lauf mit „Broadcast-Sturm“ ab, gibt es eine Schleife.",
  "lab.storage": "Ping und die Ereignisliste der Simulation zwischen Server und Speicher.",
};

/* Fragen des Seniors, falls das Ticket keine eigene hat (Stufe 3) */
Spiel.SENIOR_FRAGEN = {
  "lab.link": "Bevor du konfigurierst: Ist das Gerät überhaupt verbunden, und ist der Port an?",
  "lab.ip": "Welche Adresse und welche Maske hat das Gerät gerade – und welche müsste es haben?",
  "lab.netz": "Wende die Maske auf beide Adressen an: Kommt dasselbe Netz heraus?",
  "lab.gateway": "Wohin schickt ein PC ein Paket, dessen Ziel nicht im eigenen Netz liegt?",
  "lab.arp": "Nach welcher IP-Adresse fragt der PC per ARP, wenn das Ziel in einem anderen Netz liegt?",
  "lab.dhcp": "Wie findet ein PC ohne Adresse den DHCP-Server – und kommt sein Broadcast dort an?",
  "lab.dns": "Kennt der PC einen DNS-Server, und kennt der Server den Namen?",
  "lab.vlan": "In welchem VLAN ist der Port des PCs – und in welchem der Port des Ziels?",
  "lab.trunk": "Welche VLANs dürfen über den Trunk – und ist deins dabei?",
  "lab.route": "Kennt der Router das Zielnetz? Und kennt der Router auf der anderen Seite den Rückweg?",
  "lab.acl": "Welche Regel der Liste trifft das Paket zuerst?",
  "lab.nat": "Mit welcher Absenderadresse kommt das Paket im Internet an?",
  "lab.speichern": "Was passiert mit der running-config, wenn der Strom ausfällt?",
};

Spiel.hilfeInfo = stufe => Spiel.HILFE[Math.max(0, Math.min(6, stufe))];
Spiel.naechsteHilfe = inst => (inst.hilfeStufe || 0) >= 6 ? null : Spiel.HILFE[(inst.hilfeStufe || 0) + 1];

/* Inhalt einer (schon freigeschalteten) Stufe, ohne Kosten */
Spiel.hilfeInhalt = function(inst, stufe){
  const def = Spiel.defVon(inst);
  const h = def.hilfen || {};
  const erster = (def.skills || [])[0];
  const info = Spiel.hilfeInfo(stufe);
  const r = {stufe, name: info.name, kosten: info.kosten};
  switch (stufe) {
    case 0: r.symptom = def.symptom || ""; r.ziele = (def.ziele || []).map(z => z.text || z.typ); break;
    case 1: r.leiter = Spiel.LEITER.map(s => Object.assign({}, s, {erledigt: !!(inst.leiter && inst.leiter[s.id])})); break;
    case 2: r.werkzeuge = [...new Set((def.skills || []).map(s => Spiel.WERKZEUGE[s]).filter(Boolean))];
            if (!r.werkzeuge.length) r.werkzeuge = [Spiel.WERKZEUGE["lab.ping"]];
            r.simulation = "Die Simulation zeigt jede Etappe eines Pakets mit Grund, wenn es verworfen wird."; break;
    case 3: r.fragen = (h.frage && h.frage.length ? h.frage : [Spiel.SENIOR_FRAGEN[erster] || "Wo auf dem Weg vom Absender zum Ziel bleibt das Paket hängen?"]).slice(); break;
    case 4: r.bereich = (h.bereich && h.bereich.length ? h.bereich : (def.fehler || []).filter(f => f.auf).map(f => ({geraet: f.auf}))).slice();
            r.namen = r.bereich.map(b => Spiel.geraetName(inst.netz, b.geraet) + (b.port ? " " + b.port : "")); break;
    case 5: r.konkret = (h.konkret && h.konkret.length ? h.konkret : (def.loesung || []).map(s => s.text).filter(Boolean)).slice(); break;
    case 6: r.schritte = Spiel.vorfuehren(inst); break;
  }
  return r;
};

/* Nächste Hilfestufe freischalten (kostet ggf. Sterne) → Inhalt der neuen Stufe */
Spiel.hilfe = function(inst){
  const neu = Math.min(6, (inst.hilfeStufe || 0) + 1);
  if (neu > (inst.hilfeStufe || 0)) {
    inst.hilfeStufe = neu;
    inst.hilfen.push({stufe: neu, t: jetzt()});
  }
  if (neu === 6) Spiel.wiederholungAnlegen(inst);
  const inhalt = Spiel.hilfeInhalt(inst, neu);
  Spiel.speichern();
  Spiel.melden("hilfe", {inst, stufe: neu, inhalt});
  return inhalt;
};

/* Leiter-Schritt abhaken (frei, nur Merkhilfe) */
Spiel.leiterHaken = function(inst, id, an){
  inst.leiter ||= {};
  if (an) inst.leiter[id] = true; else delete inst.leiter[id];
  Spiel.speichern();
};

/* Lösungsschritte für die Vorführung aufbereiten */
Spiel.vorfuehren = function(inst){
  const def = Spiel.defVon(inst);
  return (def.loesung || []).map((s, i) => {
    const art = s.cli ? "cli" : s.terminal ? "terminal" : s.setzen ? "setzen" : "aktion";
    const r = {nr: i + 1, art, schritt: s, geraet: s.geraet || null, geraetName: s.geraet ? Spiel.geraetName(inst.netz, s.geraet) : "", text: s.text || ""};
    if (art === "cli" || art === "terminal") r.zeilen = String(s.cli || s.terminal).split("\n").map(z => z.trimEnd()).filter(z => z.length);
    if (art === "setzen") r.felder = Object.entries(s.setzen).map(([pfad, wert]) => {
      let entspricht = null;
      try { const g = inst.netz.geraete[s.geraet]; if (g && typeof CLI !== "undefined" && CLI.entspricht) entspricht = CLI.entspricht(g, pfad, wert); } catch (e) { /* nur Anzeige */ }
      return {pfad, wert, entspricht};
    });
    return r;
  });
};

/* Einen Vorführschritt im Instanz-Netz ausführen (über den Verlauf, also rückgängig machbar) */
Spiel.vorfuehrenSchritt = function(inst, i){
  const s = Spiel.vorfuehren(inst)[i];
  if (!s) return null;
  Spiel.aendern(inst, "Vorführung: " + (s.text || "Schritt " + s.nr), netz => Spiel.schritt(netz, s.schritt));
  return s;
};

/* Nach „Lösung vorführen“: Wiederholung im Lernmotor und ein Variantenticket, das später erscheint (einmal je Instanz) */
Spiel.wiederholungAnlegen = function(inst){
  if (inst.wiederholung) return null;
  inst.wiederholung = true;
  const def = Spiel.defVon(inst);
  if (!Spiel._trocken && typeof L !== "undefined") {
    Spiel.skillsRegistrieren();
    for (const id of def.skills || []) L.ueben(id, false, {hilfe: true});
  }
  const ab = jetzt() + Spiel.WIEDERHOLUNG_NACH_MS;
  const skill = (def.skills || [])[0];
  let neu = null;
  if (typeof Spiel.generiere === "function" && skill) {
    try { neu = Spiel.instanzErstellen({gen: {skill, seed: Spiel.neuerSeed("wdh" + inst.iid), opts: {stufe: def.stufe, kunde: def.kunde, art: def.art}}, quelle: "wiederholung", kunde: def.kunde, ab}); }
    catch (e) { neu = null; }
  }
  if (!neu && (DATEN.tickets || []).some(t => t.id === def.id)) {
    neu = Spiel.instanzErstellen({ticketId: def.id, quelle: "wiederholung", ab});
  }
  return neu;
};

/* Soll der Senior jetzt (einmal je Ticket) Hilfe anbieten? */
Spiel.seniorFaellig = function(inst){
  if (!inst || inst.seniorAngeboten || (inst.hilfeStufe || 0) >= 6) return false;
  return jetzt() - (inst.fortschritt || inst.geoeffnet || jetzt()) >= Spiel.SENIOR_NACH_MS;
};
Spiel.seniorAngeboten = function(inst){ inst.seniorAngeboten = true; Spiel.speichern(); };
