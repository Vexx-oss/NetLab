"use strict";
/* ---------- PDU-Inspektor (Konzept § 7 „Simulation“) ----------
   UI.pdu.zeigen(container, ereignis, vorigesEreignis)
     Zeigt den Frame eines Trace-Ereignisses (Architektur § 5.2) Schicht für Schicht, aufklappbar.
     Felder, die sich gegenüber der vorigen Etappe DESSELBEN Pakets geändert haben, sind markiert und
     kurz begründet (MAC wechselt am Router, IP nicht, TTL −1, 802.1Q-Tag auf dem Trunk, NAT).
   Nebenbei, auch für das Simulations-Panel:
     UI.pdu.chip(proto)     Protokoll-Chip (Farbe UND Text)
     UI.pdu.paket(frame)    Schlüssel „dasselbe Paket“ (für die Suche nach der vorigen Etappe)
     UI.pdu.mac(mac)        MAC im gewählten Format (Doppelpunkt oder Cisco-Punktschreibweise) */
UI.pdu = (() => {
  const PFARBE = {ARP: "--p-arp", ICMP: "--p-icmp", TCP: "--p-tcp", UDP: "--p-udp", DHCP: "--p-dhcp", DNS: "--p-dns", HTTP: "--p-http"};
  const NULLMAC = "00:00:00:00:00:00";
  const MACFELD = new Set(["eth.src", "eth.dst", "arp.senderMac", "arp.targetMac"]);
  const zu = {};                    /* Schicht → true, wenn zugeklappt (Wahl bleibt über Ereignisse hinweg) */
  let macArt = "doppelpunkt";       /* oder "cisco" */
  let zuletzt = null;               /* {container, e, vor} für das Umschalten des MAC-Formats */

  const niveau = () => (store.get("einst", {}) || {}).niveau || "E";
  const netz = () => (UI.labor && UI.labor.netz) || null;
  const geraetName = id => { const g = netz()?.geraete?.[id]; return g ? g.name : (id || "?"); };

  function chip(proto){
    const el = h("span", {class: "pdu-chip"}, proto || "–");
    if (PFARBE[proto]) el.style.setProperty("--c", `var(${PFARBE[proto]})`);
    return el;
  }

  function mac(m){
    if (m == null || m === "") return "–";
    const s = String(m).toLowerCase();
    return macArt === "cisco" ? IP.macCisco(s) : s;
  }
  /* Wem gehört eine MAC/IP im aktuellen Netz? (nur zur Orientierung, kein Rechnen) */
  function macBesitzer(m){
    const n = netz(); if (!n) return null; const s = String(m || "").toLowerCase();
    for (const g of Object.values(n.geraete || {})) for (const [p, x] of Object.entries(g.hw?.macs || {})) if (String(x).toLowerCase() === s) return `${g.name} ${p}`;
    return null;
  }
  function ipBesitzer(ip){
    const n = netz(); if (!n || !ip) return null;
    for (const g of Object.values(n.geraete || {})) {
      for (const a of Modell.adressen(g)) if (a.ip === ip) return `${g.name}${Modell.HOST[g.typ] ? "" : " " + a.port}`;
      for (const d of Object.values(n.zustand?.[g.id]?.dhcp || {})) if (d && d.ip === ip) return `${g.name} (per DHCP)`;
    }
    if (n.geraete) for (const g of Object.values(n.geraete)) if (g.typ === "internet") for (const s of g.running.server || []) if (s.ip === ip) return s.name;
    return null;
  }
  function macZusatz(m){
    const s = String(m || "").toLowerCase();
    if (s === IP.MAC_BROADCAST) return "Broadcast: an alle im Netzabschnitt";
    if (s === NULLMAC) return "noch unbekannt – genau das fragt ARP";
    return macBesitzer(s);
  }
  function ipZusatz(ip){
    if (!ip) return null;
    if (ip === "255.255.255.255") return "Broadcast (eingeschränkt)";
    if (ip === "0.0.0.0") return "noch keine Adresse";
    if (IP.apipa(ip)) return "APIPA – selbst vergeben, weil kein DHCP antwortete";
    const b = ipBesitzer(ip);
    return b ? b + (IP.privat(ip) ? " · privat" : "") : (IP.gueltig(ip) ? (IP.privat(ip) ? "private Adresse" : "öffentliche Adresse") : null);
  }

  const PORTNAMEN = {20: "FTP-Daten", 21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS", 67: "DHCP-Server", 68: "DHCP-Client",
    80: "HTTP", 110: "POP3", 123: "NTP", 143: "IMAP", 161: "SNMP", 443: "HTTPS", 445: "SMB", 3389: "RDP", 9100: "Druck (RAW)"};
  const portZusatz = p => p == null ? null : PORTNAMEN[p] || (p >= 49152 ? "dynamischer Port des Clients" : null);
  const ETHERTYP = {ARP: "0x0806", IPv4: "0x0800"};
  const IPPROTO = {ICMP: 1, TCP: 6, UDP: 17};
  const ICMPTYP = {"echo-request": [8, "Echo-Anfrage (Ping)"], "echo-reply": [0, "Echo-Antwort"], "unreachable": [3, "Ziel unerreichbar"], "time-exceeded": [11, "Zeit überschritten"]};
  const ICMPCODE = {
    unreachable: {net: [0, "Netz unerreichbar"], host: [1, "Host unerreichbar"], port: [3, "Port unerreichbar"], admin: [13, "administrativ verboten (Filter)"]},
    "time-exceeded": {null: [0, "TTL im Transit abgelaufen"]},
  };

  /* Wert aus einem Frame über einen Pfad wie "ip.ttl" */
  const lies = (f, k) => k.split(".").reduce((o, t) => o == null ? undefined : o[t], f);

  /* Die Schichten eines Frames als Daten: [{id, nr, titel, kurz, satz, felder:[{k, name, text, zusatz}]}] */
  function schichten(f, vf){
    const s = [];
    if (f.eth) {
      s.push({id: "eth", nr: "2", titel: "Ethernet II", kurz: `${mac(f.eth.src)} → ${mac(f.eth.dst)}`,
        satz: "Schicht 2: Der Rahmen trägt MAC-Adressen und gilt nur im eigenen Netzabschnitt – bis zum nächsten Router.",
        felder: [
          {k: "eth.dst", name: "Ziel-MAC", text: mac(f.eth.dst), zusatz: macZusatz(f.eth.dst)},
          {k: "eth.src", name: "Quell-MAC", text: mac(f.eth.src), zusatz: macZusatz(f.eth.src)},
          {k: "eth.typ", name: "Typ (EtherType)", text: `${ETHERTYP[f.eth.typ] || "?"} (${f.eth.typ || "?"})`, zusatz: f.eth.vlan != null ? "steht hinter dem 802.1Q-Tag" : null},
        ]});
      if (f.eth.vlan != null || (vf && vf.eth && vf.eth.vlan != null)) {
        const hat = f.eth.vlan != null;
        s.push({id: "dot1q", nr: "2", titel: "802.1Q-Tag (VLAN)", kurz: hat ? `VLAN ${f.eth.vlan}` : "kein Tag",
          satz: "Auf einem Trunk sagt das 4 Byte lange Tag, zu welchem VLAN der Rahmen gehört. Endgeräte am Access-Port sehen es nie.",
          felder: hat ? [
            {k: "eth.tpid", name: "TPID", text: "0x8100", zusatz: "kennzeichnet ein 802.1Q-Tag", fest: true},
            {k: "eth.vlan", name: "VLAN-ID", text: String(f.eth.vlan), zusatz: null},
          ] : [{k: "eth.vlan", name: "VLAN-ID", text: "– (ohne Tag)", zusatz: "Tag entfernt"}]});
      }
    }
    if (f.arp) {
      const a = f.arp;
      s.push({id: "arp", nr: "2–3", titel: "ARP", kurz: a.op === "request" ? `Wer hat ${a.targetIp}?` : `${a.senderIp} ist ${mac(a.senderMac)}`,
        satz: "ARP verbindet Schicht 3 mit Schicht 2: Die Anfrage geht per Broadcast („Wer hat diese IP?“), die Antwort kommt per Unicast mit der gesuchten MAC.",
        felder: [
          {k: "arp.op", name: "Operation", text: a.op === "request" ? "1 (Anfrage)" : a.op === "reply" ? "2 (Antwort)" : String(a.op)},
          {k: "arp.senderMac", name: "Absender-MAC", text: mac(a.senderMac), zusatz: macZusatz(a.senderMac)},
          {k: "arp.senderIp", name: "Absender-IP", text: a.senderIp || "–", zusatz: ipZusatz(a.senderIp)},
          {k: "arp.targetMac", name: "Gesuchte MAC", text: mac(a.targetMac), zusatz: macZusatz(a.targetMac)},
          {k: "arp.targetIp", name: "Gesuchte IP", text: a.targetIp || "–", zusatz: ipZusatz(a.targetIp)},
        ]});
    }
    if (f.ip) {
      const i = f.ip;
      s.push({id: "ip", nr: "3", titel: "IPv4", kurz: `${i.src} → ${i.dst} · TTL ${i.ttl}`,
        satz: "Schicht 3: Die IP-Adressen bleiben auf dem ganzen Weg gleich (außer bei NAT). Jeder Router zieht 1 von der TTL ab.",
        felder: [
          {k: "ip.src", name: "Quell-IP", text: i.src || "–", zusatz: ipZusatz(i.src)},
          {k: "ip.dst", name: "Ziel-IP", text: i.dst || "–", zusatz: ipZusatz(i.dst)},
          {k: "ip.ttl", name: "TTL", text: String(i.ttl ?? "–"), zusatz: "Lebensdauer in Router-Sprüngen"},
          {k: "ip.proto", name: "Protokoll", text: IPPROTO[i.proto] != null ? `${IPPROTO[i.proto]} (${i.proto})` : String(i.proto || "–")},
          {k: "ip.id", name: "Kennung (ID)", text: i.id != null ? String(i.id) : "–"},
        ]});
    }
    if (f.icmp) {
      const c = f.icmp, t = ICMPTYP[c.typ], cd = ICMPCODE[c.typ]?.[c.code];
      const felder = [{k: "icmp.typ", name: "Typ", text: t ? `${t[0]} (${t[1]})` : String(c.typ)}];
      if (c.typ === "unreachable" || c.typ === "time-exceeded") felder.push({k: "icmp.code", name: "Code", text: cd ? `${cd[0]} (${cd[1]})` : String(c.code ?? "–")});
      if (c.seq != null) felder.push({k: "icmp.seq", name: "Sequenznummer", text: String(c.seq)});
      s.push({id: "icmp", nr: "3", titel: "ICMP", kurz: t ? t[1] : c.typ,
        satz: "ICMP ist der Meldedienst von IP (Schicht 3): Echo-Anfrage und -Antwort sind der Ping, „Ziel unerreichbar“ und „Zeit überschritten“ melden Fehler.",
        felder});
    }
    if (f.tcp) {
      const t = f.tcp;
      s.push({id: "tcp", nr: "4", titel: "TCP", kurz: `${t.src} → ${t.dst} · ${(t.flags || []).join(", ") || "–"}`,
        satz: "Schicht 4: TCP baut mit SYN, SYN/ACK, ACK eine Verbindung auf und bestätigt, was ankommt. Der Zielport sagt, welcher Dienst gemeint ist.",
        felder: [
          {k: "tcp.src", name: "Quellport", text: String(t.src ?? "–"), zusatz: portZusatz(t.src)},
          {k: "tcp.dst", name: "Zielport", text: String(t.dst ?? "–"), zusatz: portZusatz(t.dst)},
          {k: "tcp.flags", name: "Flags", text: (t.flags || []).join(", ") || "–", zusatz: flagsText(t.flags)},
          {k: "tcp.seq", name: "Sequenznummer", text: String(t.seq ?? "–")},
          {k: "tcp.ack", name: "Bestätigungsnummer", text: String(t.ack ?? "–")},
        ]});
    }
    if (f.udp) {
      const u = f.udp;
      s.push({id: "udp", nr: "4", titel: "UDP", kurz: `${u.src} → ${u.dst}`,
        satz: "Schicht 4: UDP schickt ohne Verbindungsaufbau und ohne Bestätigung – schnell und schlank. Ports benennen den Dienst.",
        felder: [
          {k: "udp.src", name: "Quellport", text: String(u.src ?? "–"), zusatz: portZusatz(u.src)},
          {k: "udp.dst", name: "Zielport", text: String(u.dst ?? "–"), zusatz: portZusatz(u.dst)},
        ]});
    }
    if (f.app) {
      const a = f.app, SATZ = {
        DHCP: "Schicht 7: DHCP verteilt Adressen in vier Schritten – Discover, Offer, Request, Ack (DORA). Client-Port 68, Server-Port 67.",
        DNS: "Schicht 7: DNS übersetzt Namen in IP-Adressen. Die Anfrage geht an UDP-Port 53 des DNS-Servers.",
        HTTP: "Schicht 7: HTTP holt Webseiten. Der Browser schickt z. B. GET, der Server antwortet mit einem Statuscode wie 200 OK.",
      };
      const felder = [{k: "app.info", name: "Nachricht", text: a.info || "–"}];
      for (const [k, v] of Object.entries(a.felder || {})) felder.push({k: "app.felder." + k, name: k, text: typeof v === "object" ? JSON.stringify(v) : String(v)});
      s.push({id: "app", nr: "7", titel: a.proto || "Anwendung", kurz: a.info || "", satz: SATZ[a.proto] || "Schicht 7: Anwendungsdaten.", felder});
    }
    return s;
  }
  function flagsText(fl){
    const f = (fl || []).join("+");
    return {SYN: "Verbindungswunsch (Schritt 1 des Handshakes)", "SYN+ACK": "Zusage (Schritt 2)", ACK: "Bestätigung", "FIN+ACK": "Verbindung beenden",
            RST: "Abgewiesen: kein Dienst auf dem Port", "RST+ACK": "Abgewiesen: kein Dienst auf dem Port", "PSH+ACK": "Daten"}[f] || null;
  }

  /* Warum hat sich ein Feld geändert? Ein Satz je Grund, nicht je Feld. */
  function gruende(f, vf, geaendert){
    const r = [], g = new Set(geaendert);
    const ipGleich = f.ip && vf.ip && f.ip.src === vf.ip.src && f.ip.dst === vf.ip.dst;
    if ((g.has("eth.src") || g.has("eth.dst")) && f.ip && vf.ip)
      r.push({s: "eth", t: ipGleich
        ? "Neuer Abschnitt, neuer Rahmen: Der Router packt das IP-Paket in einen neuen Ethernet-Rahmen. Quell-MAC ist jetzt seine Ausgangsschnittstelle, Ziel-MAC der nächste Hop. Die IP-Adressen bleiben gleich."
        : "MAC-Adressen gelten nur im eigenen Netzabschnitt und werden an jedem Router neu gesetzt."});
    else if (g.has("eth.src") || g.has("eth.dst")) r.push({s: "eth", t: "Andere MAC-Adressen: Der Rahmen ist in einem anderen Netzabschnitt unterwegs."});
    if (g.has("eth.vlan")) {
      const a = vf.eth?.vlan, b = f.eth?.vlan;
      r.push({s: "dot1q", t: a == null ? `Der Switch schickt den Rahmen über einen Trunk und markiert ihn mit dem 802.1Q-Tag für VLAN ${b}.`
        : b == null ? "Das Tag ist weg: Am Access-Port (oder im Native VLAN des Trunks) geht der Rahmen ohne VLAN-Kennung hinaus."
        : `Das Tag wechselt von VLAN ${a} auf VLAN ${b}.`});
    }
    if (g.has("ip.ttl")) {
      const d = (vf.ip?.ttl ?? 0) - (f.ip?.ttl ?? 0);
      r.push({s: "ip", t: d === 1 ? "TTL −1: Jeder Router zieht 1 ab. Bei 0 verwirft er das Paket und meldet „Zeit überschritten“ – so kreisen Pakete bei Routing-Schleifen nicht ewig."
        : `TTL ${d > 0 ? "−" + d : "+" + (-d)} gegenüber der vorigen Etappe.`});
    }
    if (g.has("ip.src")) r.push({s: "ip", t: IP.privat(vf.ip.src) && !IP.privat(f.ip.src)
      ? "NAT: Der Router ersetzt die private Quelladresse durch seine öffentliche. Private Adressen werden im Internet nicht geroutet."
      : "NAT: Die Quelladresse wurde übersetzt."});
    if (g.has("ip.dst")) r.push({s: "ip", t: !IP.privat(vf.ip.dst) && IP.privat(f.ip.dst)
      ? "NAT zurück: Der Router übersetzt die öffentliche Zieladresse wieder in die private (Antwort oder Port-Weiterleitung)."
      : "NAT: Die Zieladresse wurde übersetzt."});
    for (const l4 of ["tcp", "udp"]) {
      if (g.has(l4 + ".src")) r.push({s: l4, t: "PAT: Der Router schreibt auch den Quellport um. So teilen sich viele Geräte eine öffentliche Adresse."});
      if (g.has(l4 + ".dst")) r.push({s: l4, t: "Der Zielport wurde übersetzt (PAT auf dem Rückweg oder Port-Weiterleitung)."});
    }
    return r;
  }

  /* Schlüssel „dasselbe Paket“: bleibt über Router und NAT hinweg gleich, unterscheidet Anfrage und Antwort */
  function paket(f){
    if (!f) return null;
    if (f.ip) {
      const i = f.ip;
      const l4 = f.icmp ? `icmp:${f.icmp.typ}:${f.icmp.seq ?? ""}` : f.tcp ? `tcp:${(f.tcp.flags || []).join("+")}:${f.tcp.seq ?? ""}` : f.udp ? "udp" : "";
      return i.id != null ? `ip#${i.id}|${i.proto}|${l4}|${f.app?.info || ""}` : `ip|${i.src}>${i.dst}|${i.proto}|${l4}|${f.app?.info || ""}`;
    }
    if (f.arp) return `arp|${f.arp.op}|${f.arp.senderIp}>${f.arp.targetIp}`;
    return `eth|${f.eth?.src}>${f.eth?.dst}|${f.eth?.typ}`;
  }

  const ARTTEXT = {senden: "sendet", empfangen: "empfängt", weiterleiten: "leitet weiter", fluten: "flutet", verwerfen: "verwirft", antworten: "antwortet", lernen: "lernt", info: "Hinweis"};

  function zeigen(container, e, vor){
    if (!container) return;
    zuletzt = {container, e, vor};
    container.classList.add("pdu");
    container.replaceChildren();
    if (!e || !e.frame) {
      container.append(h("div", {class: "pdu-leer"},
        h("p", {}, "Wähle eine Zeile in der Ereignisliste."),
        h("p", {class: "pdu-klein"}, "Dann siehst du hier den Rahmen Schicht für Schicht – und was sich unterwegs ändert.")));
      return;
    }
    const f = e.frame, vf = vor && vor !== e && vor.frame ? vor.frame : null, nv = niveau();
    const liste = schichten(f, vf);
    const geaendert = [];
    if (vf) for (const s of liste) for (const x of s.felder) {
      if (x.fest) continue;
      const oben = x.k.split(".")[0];
      if (oben !== "eth" && vf[oben] == null) continue;          /* Schicht neu: nichts zu vergleichen */
      const a = JSON.stringify(lies(vf, x.k) ?? null), b = JSON.stringify(lies(f, x.k) ?? null);
      if (a !== b) { x.vorher = lies(vf, x.k); geaendert.push(x.k); }
    }
    const warum = vf ? gruende(f, vf, geaendert) : [];

    const kopf = h("div", {class: "pdu-kopf"},
      h("div", {class: "pdu-titel"},
        h("strong", {}, `Etappe ${e.n ?? "?"}`),
        h("span", {}, ` · ${geraetName(e.geraet)}${e.port ? " " + e.port : ""} ${ARTTEXT[e.art] || e.art || ""}`),
        e.nach ? h("span", {class: "pdu-nach"}, ` → ${geraetName(e.nach.geraet)}${e.nach.port ? " " + e.nach.port : ""}`) : null),
      h("div", {class: "pdu-kopf-rechts"},
        chip(e.proto),
        h("div", {class: "pdu-format", role: "group", "aria-label": "MAC-Schreibweise"},
          h("button", {type: "button", "aria-pressed": String(macArt === "doppelpunkt"), title: "MAC wie in Linux/Wireshark: 00:1a:2b:…", onclick: () => format("doppelpunkt")}, "00:1a"),
          h("button", {type: "button", "aria-pressed": String(macArt === "cisco"), title: "MAC wie in IOS: 001a.2b3c.4d5e", onclick: () => format("cisco")}, "001a."))));
    container.append(kopf);
    if (e.text) container.append(h("p", {class: "pdu-text"}, e.text));
    if (vf && geaendert.length) {
      const teile = [];
      if (geaendert.some(k => k.startsWith("eth.src") || k.startsWith("eth.dst"))) teile.push("MAC neu");
      if (f.ip && vf.ip && !geaendert.includes("ip.src") && !geaendert.includes("ip.dst")) teile.push("IP gleich");
      if (geaendert.includes("ip.ttl")) teile.push(`TTL ${f.ip.ttl - vf.ip.ttl > 0 ? "+" : "−"}${Math.abs(f.ip.ttl - vf.ip.ttl)}`);
      if (geaendert.includes("eth.vlan")) teile.push(f.eth.vlan != null ? "Tag dazu" : "Tag weg");
      if (geaendert.includes("ip.src") || geaendert.includes("ip.dst")) teile.push("NAT");
      container.append(h("p", {class: "pdu-bilanz"}, h("span", {class: "pdu-sym", "aria-hidden": "true"}, "Δ"),
        `Gegenüber Etappe ${vor.n}: `, h("strong", {}, teile.join(" · ") || `${geaendert.length} Feld(er) geändert`)));
    } else if (vf) container.append(h("p", {class: "pdu-bilanz ruhig"}, `Unverändert gegenüber Etappe ${vor.n} – derselbe Rahmen, nur ein Stück weiter.`));

    for (const s of liste) {
      const d = h("details", {class: "pdu-schicht", "data-schicht": s.id});
      if (!zu[s.id]) d.open = true;
      d.addEventListener("toggle", () => { zu[s.id] = !d.open; });
      const n = s.felder.filter(x => x.vorher !== undefined).length;
      d.append(h("summary", {},
        h("span", {class: "pdu-nr", title: `OSI-Schicht ${s.nr}`}, s.nr),
        h("span", {class: "pdu-schicht-titel"}, s.titel),
        h("span", {class: "pdu-kurz"}, s.kurz),
        n ? h("span", {class: "pdu-mark"}, h("span", {"aria-hidden": "true"}, "Δ "), `${n} geändert`) : null));
      const koerper = h("div", {class: "pdu-felder"});
      if (nv === "E") koerper.append(h("p", {class: "pdu-satz"}, s.satz));
      const tab = h("dl", {class: "pdu-liste"});
      for (const x of s.felder) {
        const neu = x.vorher !== undefined;
        tab.append(h("div", {class: "pdu-feld" + (neu ? " geaendert" : "")},
          h("dt", {}, x.name),
          h("dd", {},
            h("span", {class: "pdu-wert"}, x.text),
            x.zusatz ? h("span", {class: "pdu-zusatz"}, x.zusatz) : null,
            neu ? h("span", {class: "pdu-vorher"}, h("span", {class: "pdu-sym", "aria-hidden": "true"}, "Δ"), " geändert, vorher ",
              h("s", {}, MACFELD.has(x.k) ? mac(x.vorher) : x.vorher == null ? "–" : String(Array.isArray(x.vorher) ? x.vorher.join(", ") : x.vorher))) : null)));
      }
      koerper.append(tab);
      for (const w of warum.filter(w => w.s === s.id)) koerper.append(h("p", {class: "pdu-warum"}, h("strong", {}, "Warum? "), w.t));
      d.append(koerper);
      container.append(d);
    }
  }
  function format(art){
    macArt = art;
    if (zuletzt && zuletzt.container.isConnected) zeigen(zuletzt.container, zuletzt.e, zuletzt.vor);
  }

  return {zeigen, chip, paket, mac, schichten};
})();
