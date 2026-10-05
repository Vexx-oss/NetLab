"use strict";
/* ---------- Fehlerinjektoren (Konzept § 8.2) ----------
   Spiel.INJEKTOREN[name] = {name, titel, skills:[Haupt, …], gruende:[erwartete Grundcodes], vorlagen:[…],
     passt(netz, rollen) → [Kandidat {key, …}]   (auf dem GESUNDEN Netz; Reihenfolge deterministisch)
     anwenden(netz, kandidat, param, z)          setzt den Fehler (auch für def.fehler: auf = kandidat.key)
     loesung(gesund, kandidat, param, rollen)    → Lösungsschritte (aus dem gesunden Netz berechnet)
     hilfen(gesund, kandidat, param, rollen)     → {frage:[…], bereich:[…], konkret:[…]}
     erklaerung, quelle, ziele?(gesund, kandidat, rollen) → eigene Ziele (z. B. Ziel per IP statt Gerät)}
   "OFFEN" in gruende heißt: das gebrochene Ziel ist ein „blockiert“-Ziel (etwas ist erreichbar, das es nicht sein darf). */
Spiel.INJEKTOREN = (() => {
  const I = {};
  const neu = o => { I[o.name] = Object.assign({gruende: [], vorlagen: [], quelle: "Network – Lernfassung", param: () => ({})}, o); };
  const name = (n, id) => n.geraete[id]?.name || id;
  const lang = p => String(p).replace(/^Fa(?=\d)/, "FastEthernet").replace(/^Gi(?=\d)/, "GigabitEthernet");
  const cli = (...zeilen) => ["configure terminal", ...zeilen, "end"].join("\n");
  const hIf = (n, id) => n.geraete[id]?.running.if?.eth0 || {};
  const statisch = (n, ids) => (ids || []).filter(id => n.geraete[id] && !hIf(n, id).dhcp && hIf(n, id).ip);
  const amSwitch = (n, id) => { const k = Modell.kabelAn(n, id, "eth0"); return k && n.geraete[k.gegen.geraet]?.typ === "switch" ? k.gegen : null; };
  const alleVorlagen = ["lan", "buero", "praxis", "standorte", "dmz"];
  const routerVorlagen = ["lan", "buero", "praxis", "standorte"];

  /* ---------- Schicht 1: Kabel und Ports ---------- */
  neu({name: "kabel-fehlt", titel: "Kabel gezogen", skills: ["lab.link"], gruende: ["LINK_DOWN", "ARP_NO_REPLY", "DNS_NO_SERVER"], vorlagen: alleVorlagen,
    passt: (n, r) => (r.hosts || []).filter(id => amSwitch(n, id)).map(id => ({key: id, geraet: id, gegen: amSwitch(n, id)})),
    anwenden(n, k){ const ka = Modell.kabelAn(n, k.geraet || k.key, "eth0"); if (ka) Modell.trennen(n, ka.kabel.id); },
    loesung: (n, k) => [{aktion: "verbinden", a: {geraet: k.geraet, port: "eth0"}, b: {geraet: k.gegen.geraet, port: k.gegen.port},
      text: `Kabel von ${name(n, k.geraet)} (eth0) zu ${name(n, k.gegen.geraet)} ${k.gegen.port} stecken – auf der Fläche vom Gerät zum Switch ziehen.`}],
    hilfen: (n, k) => ({frage: [`Was zeigt der Anschluss von ${name(n, k.geraet)} auf der Fläche – ist da überhaupt eine Leitung?`],
      bereich: [{geraet: k.geraet}], konkret: [`An ${name(n, k.geraet)} steckt kein Kabel. Zieh vom Gerät zum Switch ${name(n, k.gegen.geraet)}.`]}),
    erklaerung: "Ohne Kabel gibt es keinen Link (Schicht 1). Solange die Bitübertragung fehlt, helfen weder IP-Adresse noch Gateway. Fehlersuche beginnt deshalb immer unten: Steckt das Kabel, leuchtet der Port?"});

  neu({name: "switchport-aus", titel: "Switchport abgeschaltet", skills: ["lab.link", "lab.switch", "lab.cli"], gruende: ["PORT_SHUTDOWN", "ARP_NO_REPLY", "DHCP_NO_OFFER"], vorlagen: alleVorlagen,
    passt: (n, r) => (r.hosts || []).map(id => ({id, s: amSwitch(n, id)})).filter(x => x.s).map(x => ({key: `${x.s.geraet}:${x.s.port}`, geraet: x.s.geraet, port: x.s.port, host: x.id})),
    anwenden(n, k){ const [sw, p] = k.key ? k.key.split(":") : [k.geraet, k.port]; Modell.setzen(n, sw, `ports.${p}.shutdown`, true); },
    loesung: (n, k) => [{geraet: k.geraet, cli: cli(`interface ${lang(k.port)}`, "no shutdown"), text: `${name(n, k.geraet)}: Port ${k.port} wieder einschalten (no shutdown).`}],
    hilfen: (n, k) => ({frage: [`Das Kabel steckt. Aber ist der Port am Switch auch eingeschaltet? Wie heißt der Befehl, der dir alle Ports mit Status zeigt?`],
      bereich: [{geraet: k.geraet, port: k.port}], konkret: [`${name(n, k.geraet)} ${k.port} steht auf „administratively down“: im Inspektor einschalten oder „interface ${k.port}“ → „no shutdown“.`]}),
    erklaerung: "Ein Port mit „shutdown“ ist administrativ abgeschaltet: Kabel steckt, aber kein Link. „show ip interface brief“ zeigt dann „administratively down“. Mit „no shutdown“ im Schnittstellenmodus geht er wieder an."});

  neu({name: "routerport-aus", titel: "Router-Schnittstelle abgeschaltet", skills: ["lab.link", "lab.cli", "lab.gateway"], gruende: ["PORT_SHUTDOWN", "GW_UNREACHABLE", "ARP_NO_REPLY", "DHCP_NO_OFFER"], vorlagen: ["lan", "buero", "standorte"],
    passt: (n, r) => [r.lanIf].filter(Boolean).map(p => ({key: `${r.router}:${p}`, geraet: r.router, port: p})),
    anwenden(n, k){ const [id, p] = k.key.split(":"); Modell.setzen(n, id, `if.${p}.shutdown`, true); },
    loesung: (n, k) => [{geraet: k.geraet, cli: cli(`interface ${lang(k.port)}`, "no shutdown"), text: `${name(n, k.geraet)}: ${k.port} einschalten.`}],
    hilfen: (n, k) => ({frage: ["Die Rechner erreichen sich untereinander. Was ist das erste Gerät auf dem Weg nach draußen – und antwortet es?"],
      bereich: [{geraet: k.geraet, port: k.port}], konkret: [`${name(n, k.geraet)} ${k.port} ist abgeschaltet (shutdown). „show ip interface brief“ auf dem Router zeigt es.`]}),
    erklaerung: "Router-Schnittstellen sind ab Werk abgeschaltet. Ist das Gateway-Interface aus, kommt im LAN niemand mehr hinaus: Das Gateway antwortet nicht einmal auf ARP."});

  /* ---------- Schicht 3 am Host ---------- */
  neu({name: "ip-tippfehler", titel: "Zahlendreher in der IP-Adresse", skills: ["lab.ip", "lab.netz"], gruende: ["GW_WRONG_SUBNET", "ARP_NO_REPLY", "WRONG_MASK", "NO_GATEWAY"], vorlagen: alleVorlagen,
    passt: (n, r) => statisch(n, r.clients).map(id => ({key: id, geraet: id, ip: hIf(n, id).ip})),
    param: (n, k, r, z) => { const o = k.ip.split(".").map(Number); o[2] = (o[2] + z.wahl([1, 10, 100])) % 256; return {ip: o.join(".")}; },
    anwenden(n, k, p){ Modell.setzen(n, k.geraet || k.key, "if.eth0.ip", p.ip); },
    loesung: (n, k) => [{geraet: k.geraet, setzen: {"if.eth0.ip": k.ip}, text: `${name(n, k.geraet)}: IP-Adresse auf ${k.ip} korrigieren (gleiches Netz wie das Gateway).`}],
    hilfen: (n, k) => ({frage: [`Vergleich die IP-Adresse von ${name(n, k.geraet)} mit denen seiner Nachbarn. Liegen alle im selben Netz?`],
      bereich: [{geraet: k.geraet}], konkret: [`Die Adresse von ${name(n, k.geraet)} liegt in einem anderen Netz. Richtig wäre ${k.ip}.`]}),
    erklaerung: "Ein Rechner entscheidet mit Adresse und Maske, wer im eigenen Netz liegt. Mit einer Adresse aus einem fremden Netz ist sogar das eigene Gateway „fremd“ – Windows meldet dann einen allgemeinen Fehler. Die Ebene „IP-Netze“ zeigt so etwas sofort."});

  neu({name: "maske-falsch", titel: "Falsche Subnetzmaske", skills: ["lab.netz", "lab.subnetz"], gruende: ["WRONG_MASK", "GW_WRONG_SUBNET", "ARP_NO_REPLY", "NO_IP"], vorlagen: alleVorlagen,
    passt: (n, r) => statisch(n, r.clients).map(id => ({key: id, geraet: id, maske: hIf(n, id).maske})),
    param: (n, k, r, z) => ({maske: z.wahl(["255.255.255.240", "255.255.255.248", "255.255.0.0", "255.255.255.128"])}),
    anwenden(n, k, p){ Modell.setzen(n, k.geraet || k.key, "if.eth0.maske", p.maske); },
    loesung: (n, k) => [{geraet: k.geraet, setzen: {"if.eth0.maske": k.maske}, text: `${name(n, k.geraet)}: Maske auf ${k.maske} (/${IP.praefix(k.maske)}) setzen – wie die anderen im Netz.`}],
    hilfen: (n, k, p) => ({frage: [`Rechne für ${name(n, k.geraet)} mit seiner Maske nach: Welche Adressen hält er für „eigenes Netz“? Gehört das Gateway dazu?`],
      bereich: [{geraet: k.geraet}], konkret: [`${name(n, k.geraet)} hat die Maske ${p.maske}, alle anderen ${k.maske}.`]}),
    erklaerung: "Die Maske entscheidet, welche Ziele direkt (per ARP) und welche über das Gateway erreicht werden. Zu klein: Nachbarn und Gateway wirken fremd. Zu groß: Ziele in anderen Netzen werden fälschlich direkt gesucht und niemand antwortet."});

  neu({name: "gateway-falsch", titel: "Falsches Standardgateway", skills: ["lab.gateway", "lab.ping"], gruende: ["GW_UNREACHABLE", "ARP_NO_REPLY"], vorlagen: alleVorlagen,
    passt: (n, r) => statisch(n, r.clients).filter(id => hIf(n, id).gw).map(id => ({key: id, geraet: id, gw: hIf(n, id).gw, ip: hIf(n, id).ip, maske: hIf(n, id).maske})),
    param: (n, k, r, z) => { const belegt = new Set(Object.values(n.geraete).flatMap(g => Modell.adressen(g).map(a => a.ip))); let x; do { x = IP.plus(IP.netz(k.ip, k.maske), 2 + z.zahl(200)); } while (belegt.has(x)); return {gw: x}; },
    anwenden(n, k, p){ Modell.setzen(n, k.geraet || k.key, "if.eth0.gw", p.gw); },
    loesung: (n, k) => [{geraet: k.geraet, setzen: {"if.eth0.gw": k.gw}, text: `${name(n, k.geraet)}: Gateway ${k.gw} eintragen – das ist die Adresse des Routers in diesem Netz.`}],
    hilfen: (n, k, p) => ({frage: [`Wem schickt ${name(n, k.geraet)} Pakete für fremde Netze? Gibt es ein Gerät mit genau dieser Adresse?`],
      bereich: [{geraet: k.geraet}], konkret: [`Als Gateway steht ${p.gw} drin – dort ist aber kein Router. Der Router hat ${k.gw}.`]}),
    erklaerung: "Das Standardgateway ist die Adresse des Routers im eigenen Netz. Steht dort eine Adresse, die niemand hat, bleibt die ARP-Anfrage für das Gateway unbeantwortet: Alles im eigenen Netz geht, alles dahinter nicht."});

  neu({name: "gateway-fehlt", titel: "Kein Standardgateway", skills: ["lab.gateway"], gruende: ["NO_GATEWAY"], vorlagen: alleVorlagen,
    passt: (n, r) => statisch(n, r.clients).filter(id => hIf(n, id).gw).map(id => ({key: id, geraet: id, gw: hIf(n, id).gw})),
    anwenden(n, k){ Modell.setzen(n, k.geraet || k.key, "if.eth0.gw", ""); },
    loesung: (n, k) => [{geraet: k.geraet, setzen: {"if.eth0.gw": k.gw}, text: `${name(n, k.geraet)}: Standardgateway ${k.gw} eintragen.`}],
    hilfen: (n, k) => ({frage: [`Im eigenen Netz klappt alles. Woher weiß ${name(n, k.geraet)}, wohin er Pakete für fremde Netze schicken soll?`],
      bereich: [{geraet: k.geraet}], konkret: [`Bei ${name(n, k.geraet)} ist kein Standardgateway eingetragen. Der Router ist ${k.gw}.`]}),
    erklaerung: "Ohne Standardgateway kennt ein Rechner nur sein eigenes Netz. Für jedes andere Ziel fehlt ihm der Weg – lokal geht alles, Internet und andere Netze nicht."});

  neu({name: "doppelte-ip", titel: "Doppelte IP-Adresse", skills: ["lab.ip", "lab.arp"], gruende: ["DUP_IP", "ARP_NO_REPLY", "TIMEOUT"], vorlagen: ["lan", "praxis", "standorte", "dmz"],
    passt(n, r){
      const s = statisch(n, r.hosts || r.clients), c = [];
      for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) {
        const a = hIf(n, s[i]), b = hIf(n, s[j]);
        if (IP.gleichesNetz(a.ip, b.ip, a.maske) && n.geraete[s[j]].typ === "pc") c.push({key: s[j], geraet: s[j], ip: b.ip, wie: s[i], andere: a.ip});
      }
      return c;
    },
    anwenden(n, k){ const s = k.geraet || k.key; Modell.setzen(n, s, "if.eth0.ip", k.andere || hIf(n, k.wie).ip); },
    loesung: (n, k) => [{geraet: k.geraet, setzen: {"if.eth0.ip": k.ip}, text: `${name(n, k.geraet)} bekommt wieder seine eigene Adresse ${k.ip}.`}],
    hilfen: (n, k) => ({frage: ["Zwei Geräte melden sich abwechselnd auf dieselbe ARP-Anfrage. Was verrät dir die Ebene „IP-Netze“ oder die Live-Prüfung?"],
      bereich: [{geraet: k.geraet}, {geraet: k.wie}], konkret: [`${name(n, k.geraet)} und ${name(n, k.wie)} haben dieselbe Adresse ${k.andere}.`]}),
    erklaerung: "Eine IP-Adresse darf im Netz nur einmal vorkommen. Sonst antworten zwei Geräte auf dieselbe ARP-Anfrage, und die Pakete landen mal hier, mal dort. Windows warnt beim Start vor einem Adresskonflikt."});

  neu({name: "drucker-umgezogen", titel: "Drucker hat eine neue Adresse", skills: ["lab.arp", "lab.ip"], gruende: ["ARP_NO_REPLY"], vorlagen: ["lan"],
    passt: (n, r) => r.drucker ? [{key: r.drucker, geraet: r.drucker, ip: hIf(n, r.drucker).ip, maske: hIf(n, r.drucker).maske}] : [],
    param: (n, k, r, z) => { const belegt = new Set(Object.values(n.geraete).flatMap(g => Modell.adressen(g).map(a => a.ip))); let x; do { x = IP.plus(IP.netz(k.ip, k.maske), 100 + z.zahl(100)); } while (belegt.has(x)); return {ip: x}; },
    anwenden(n, k, p){ Modell.setzen(n, k.geraet || k.key, "if.eth0.ip", p.ip); },
    ziele: (n, k, r) => [{typ: "erreichbar", von: r.clients[0], nach: k.ip, proto: "tcp", port: 9100, text: `${name(n, r.clients[0])} druckt auf ${k.ip} (so ist der Drucker eingerichtet)`}],
    loesung: (n, k) => [{geraet: k.geraet, setzen: {"if.eth0.ip": k.ip}, text: `Drucker wieder auf ${k.ip} stellen – dort suchen ihn alle Rechner.`}],
    hilfen: (n, k, p) => ({frage: [`Die Kasse fragt per ARP: „Wer hat ${k.ip}?“ Wer antwortet – und welche Adresse hat der Drucker gerade?`],
      bereich: [{geraet: k.geraet}], konkret: [`Der Drucker hat jetzt ${p.ip}, eingerichtet ist er überall als ${k.ip}.`]}),
    erklaerung: "ARP löst eine IP-Adresse im eigenen Netz in eine MAC-Adresse auf. Hat der Drucker eine andere Adresse bekommen, fragt die Kasse ins Leere: niemand antwortet auf „Wer hat …?“. Deshalb bekommen Drucker feste Adressen."});

  /* ---------- Dienste: DNS, DHCP, Ports ---------- */
  neu({name: "dns-fehlt", titel: "Kein DNS-Server eingetragen", skills: ["lab.dns"], gruende: ["DNS_NO_SERVER"], vorlagen: ["lan", "praxis", "standorte", "dmz"],
    passt: (n, r) => statisch(n, r.clients).filter(id => hIf(n, id).dns).map(id => ({key: id, geraet: id, dns: hIf(n, id).dns})),
    anwenden(n, k){ Modell.setzen(n, k.geraet || k.key, "if.eth0.dns", ""); },
    loesung: (n, k) => [{geraet: k.geraet, setzen: {"if.eth0.dns": k.dns}, text: `${name(n, k.geraet)}: DNS-Server ${k.dns} eintragen.`}],
    hilfen: (n, k) => ({frage: ["Per IP-Adresse klappt es, per Name nicht. Wer übersetzt Namen in Adressen – und kennt der Rechner ihn?"],
      bereich: [{geraet: k.geraet}], konkret: [`Bei ${name(n, k.geraet)} fehlt der DNS-Server. Richtig: ${k.dns}.`]}),
    erklaerung: "DNS übersetzt Namen wie www.beispiel.de in IP-Adressen. Ohne eingetragenen DNS-Server geht alles per Adresse, aber nichts per Name – ein klassisches Symptom: „Internet geht nicht, aber ping 198.51.100.10 klappt.“", quelle: "Network – Lernfassung"});

  neu({name: "dns-eintrag-fehlt", titel: "DNS-Eintrag fehlt", skills: ["lab.dns"], gruende: ["DNS_FAIL"], vorlagen: ["buero"],
    passt: (n, r) => r.server && (n.geraete[r.server].running.dienste.dns?.eintraege || []).length ? [{key: r.server, geraet: r.server, eintraege: n.geraete[r.server].running.dienste.dns.eintraege}] : [],
    anwenden(n, k){ const id = k.geraet || k.key, e = n.geraete[id].running.dienste.dns.eintraege.filter(x => !/^server\./.test(x.name)); Modell.setzen(n, id, "dienste.dns.eintraege", e); },
    loesung: (n, k) => [{geraet: k.geraet, setzen: {"dienste.dns.eintraege": k.eintraege}, text: `Auf dem Server den DNS-Eintrag ${k.eintraege[0].name} → ${k.eintraege[0].ip} wieder anlegen.`}],
    hilfen: (n, k) => ({frage: ["Der DNS-Server antwortet – aber was antwortet er auf die Frage nach dem Intranet-Namen?"],
      bereich: [{geraet: k.geraet}], konkret: [`Auf dem Server fehlt der Eintrag ${k.eintraege[0].name} → ${k.eintraege[0].ip} (Reiter Dienste).`]}),
    erklaerung: "Ein DNS-Server kennt nur die Namen, die in seiner Zone stehen. Fehlt der A-Record, meldet er „Name nicht gefunden“ – das Netz ist in Ordnung, nur die Übersetzung fehlt."});

  neu({name: "dienst-aus", titel: "Dienst gestoppt", skills: ["lab.ports", "lab.tcp"], gruende: ["SERVICE_OFF", "PORT_CLOSED"], vorlagen: ["lan", "buero", "praxis", "standorte", "dmz"],
    passt(n, r){
      const c = [];
      for (const id of Object.keys(n.geraete)) { const d = n.geraete[id].running.dienste || {}; for (const s of ["datei", "druck", "http", "https"]) if (d[s] && d[s].an) c.push({key: `${id}:${s}`, geraet: id, dienst: s}); }
      return c;
    },
    anwenden(n, k){ const [id, s] = k.key.split(":"); Modell.setzen(n, id, `dienste.${s}`, Object.assign({}, n.geraete[id].running.dienste[s], {an: false})); },
    loesung: (n, k) => [{geraet: k.geraet, setzen: {[`dienste.${k.dienst}`]: Object.assign({}, n.geraete[k.geraet].running.dienste[k.dienst], {an: true})},
      text: `${name(n, k.geraet)}: ${Modell.DIENSTPORTS[k.dienst].name} wieder starten (Port ${Modell.DIENSTPORTS[k.dienst].port}).`}],
    hilfen: (n, k) => ({frage: ["Ping geht, die Anwendung nicht. Auf welcher Schicht liegt das Problem, wenn der Server mit einem TCP-Reset antwortet?"],
      bereich: [{geraet: k.geraet}], konkret: [`Auf ${name(n, k.geraet)} ist ${Modell.DIENSTPORTS[k.dienst].name} (${Modell.DIENSTPORTS[k.dienst].proto.toUpperCase()}/${Modell.DIENSTPORTS[k.dienst].port}) gestoppt.`]}),
    erklaerung: "Ping prüft nur Schicht 3. Ob eine Anwendung erreichbar ist, entscheidet der Port: Lauscht kein Dienst, antwortet der Rechner auf das SYN mit RST – „Verbindung abgelehnt“. Netz gut, Dienst aus.", quelle: "TCP – Lernfassung"});

  neu({name: "dhcp-aus", titel: "DHCP-Dienst gestoppt", skills: ["lab.dhcp"], gruende: ["DHCP_NO_OFFER"], vorlagen: ["buero"],
    passt: (n, r) => r.server && n.geraete[r.server].running.dienste.dhcp?.an ? [{key: r.server, geraet: r.server}] : [],
    anwenden(n, k){ const id = k.geraet || k.key; Modell.setzen(n, id, "dienste.dhcp.an", false); },
    loesung: (n, k) => [{geraet: k.geraet, setzen: {"dienste.dhcp.an": true}, text: "Auf dem Server den DHCP-Dienst wieder einschalten."}],
    hilfen: (n, k) => ({frage: ["Welche Adresse hat PC-Albers gerade? Was bedeutet 169.254.x.x?"],
      bereich: [{geraet: k.geraet}], konkret: ["Der DHCP-Dienst auf dem Server ist aus. Ohne Angebot nimmt Windows eine APIPA-Adresse."]}),
    erklaerung: "Findet ein Rechner keinen DHCP-Server, vergibt Windows sich selbst eine APIPA-Adresse aus 169.254.0.0/16. Damit erreicht er niemanden außer anderen APIPA-Rechnern. 169.254 heißt also fast immer: DHCP klappt nicht."});

  neu({name: "helper-fehlt", titel: "DHCP-Relay fehlt", skills: ["lab.dhcp", "lab.cli"], gruende: ["DHCP_NO_OFFER"], vorlagen: ["buero"],
    passt: (n, r) => r.relayIf && (n.geraete[r.router].running.if[r.relayIf].helper || []).length ? [{key: `${r.router}:${r.relayIf}`, geraet: r.router, port: r.relayIf, helper: n.geraete[r.router].running.if[r.relayIf].helper}] : [],
    anwenden(n, k){ const [id, p] = k.key.split(":"); Modell.setzen(n, id, `if.${p}.helper`, []); },
    loesung: (n, k) => [{geraet: k.geraet, cli: cli(`interface ${lang(k.port)}`, `ip helper-address ${k.helper[0]}`), text: `Router: auf ${k.port} „ip helper-address ${k.helper[0]}“ setzen.`}],
    hilfen: (n, k) => ({frage: ["Ein DHCP-Discover ist ein Broadcast. Kommt ein Broadcast über einen Router hinweg?"],
      bereich: [{geraet: k.geraet, port: k.port}], konkret: [`Auf ${k.port} fehlt „ip helper-address ${k.helper[0]}“ – der Router leitet die DHCP-Anfragen sonst nicht an den Server weiter.`]}),
    erklaerung: "Router leiten Broadcasts nicht weiter. Steht der DHCP-Server in einem anderen Netz, braucht die Schnittstelle zu den Clients ein DHCP-Relay: „ip helper-address <Server>“. Der Router schickt die Anfrage dann gezielt (Unicast) an den Server; das giaddr-Feld sagt dem Server, aus welchem Netz sie kommt."});

  /* ---------- VLAN, Trunk, Router-on-a-Stick ---------- */
  neu({name: "vlan-falsch", titel: "Port im falschen VLAN", skills: ["lab.vlan", "lab.cli"], gruende: ["ARP_NO_REPLY", "DROP_VLAN", "GW_UNREACHABLE"], vorlagen: ["praxis"],
    passt: (n, r) => ["empfang", "behandlung"].filter(id => r.ports && r.ports[id]).map(id => ({key: id, geraet: r.switch, port: r.ports[id], host: id, vlan: n.geraete[r.switch].running.ports[r.ports[id]].accessVlan})),
    param: (n, k, r, z) => ({vlan: z.wahl(Object.values(r.vlans).filter(v => v !== k.vlan))}),
    anwenden(n, k, p){ Modell.setzen(n, "sw1", `ports.${k.port}.accessVlan`, p.vlan); },
    loesung: (n, k) => [{geraet: k.geraet, cli: cli(`interface ${lang(k.port)}`, `switchport access vlan ${k.vlan}`), text: `Switch: ${k.port} (${name(n, k.host)}) zurück in VLAN ${k.vlan}.`}],
    hilfen: (n, k, p) => ({frage: [`In welchem VLAN steckt ${name(n, k.host)} – und in welchem Netz liegt seine Adresse?`],
      bereich: [{geraet: k.geraet, port: k.port}], konkret: [`${k.port} ist in VLAN ${p.vlan}, ${name(n, k.host)} gehört aber in VLAN ${k.vlan}. „show vlan brief“ zeigt es.`]}),
    erklaerung: "Ein Access-Port gehört genau einem VLAN. Steckt ein Rechner im falschen VLAN, ist er in einer anderen Broadcast-Domäne: Seine ARP-Anfrage an das Gateway erreicht nur Geräte dieses anderen VLANs – niemand antwortet.", quelle: "VLAN – Lernfassung"});

  neu({name: "vlan-fehlt", titel: "VLAN fehlt in der VLAN-Datenbank", skills: ["lab.vlan"], gruende: ["DROP_VLAN"], vorlagen: ["praxis"],
    passt: (n, r) => r.vlans ? [{key: String(r.vlans.behandlung), geraet: r.switch, vlan: r.vlans.behandlung, name: n.geraete[r.switch].flash.vlans[r.vlans.behandlung].name}] : [],
    anwenden(n, k){ Modell.vlan(n, "sw1", k.vlan || +k.key, null); },
    loesung: (n, k) => [{geraet: k.geraet, cli: cli(`vlan ${k.vlan}`, `name ${k.name}`), text: `Switch: VLAN ${k.vlan} (${k.name}) wieder anlegen.`}],
    hilfen: (n, k) => ({frage: ["Der Port ist dem richtigen VLAN zugeordnet. Aber gibt es dieses VLAN auf dem Switch überhaupt?"],
      bereich: [{geraet: k.geraet}], konkret: [`VLAN ${k.vlan} fehlt in der VLAN-Datenbank (flash:vlan.dat). Ports darin sind inaktiv.`]}),
    erklaerung: "Ein Access-Port in einem VLAN, das nicht in der VLAN-Datenbank steht, ist inaktiv. Die VLANs liegen auf Cisco-Switches in flash:vlan.dat – nicht in der running-config. „show vlan brief“ zeigt, welche es gibt.", quelle: "VLAN – Lernfassung"});

  neu({name: "trunk-vlan-fehlt", titel: "VLAN auf dem Trunk nicht erlaubt", skills: ["lab.trunk", "lab.cli"], gruende: ["TRUNK_NOT_ALLOWED"], vorlagen: ["praxis"],
    passt: (n, r) => r.trunkPort ? [{key: String(r.vlans.behandlung), geraet: r.switch, port: r.trunkPort, vlan: r.vlans.behandlung, alle: Object.values(r.vlans)}] : [],
    anwenden(n, k){ Modell.setzen(n, "sw1", `ports.${k.port || "Gi0/1"}.trunkErlaubt`, [1, ...(k.alle || []).filter(v => v !== (k.vlan || +k.key))]); },
    loesung: (n, k) => [{geraet: k.geraet, cli: cli(`interface ${lang(k.port)}`, `switchport trunk allowed vlan add ${k.vlan}`), text: `Switch: VLAN ${k.vlan} auf dem Trunk ${k.port} erlauben.`}],
    hilfen: (n, k) => ({frage: ["Welche VLANs darf der Trunk zum Router tragen? Frag den Switch mit „show interfaces trunk“."],
      bereich: [{geraet: k.geraet, port: k.port}], konkret: [`Auf ${k.port} fehlt VLAN ${k.vlan} in der Liste der erlaubten VLANs.`]}),
    erklaerung: "Ein Trunk trägt mehrere VLANs, jedes Frame mit 802.1Q-Tag. Mit „switchport trunk allowed vlan“ lässt sich die Liste begrenzen – fehlt ein VLAN, verwirft der Switch dessen Frames am Trunk.", quelle: "VLAN – Lernfassung"});

  neu({name: "trunk-access", titel: "Uplink ist kein Trunk", skills: ["lab.trunk", "lab.rostick"], gruende: ["DROP_VLAN", "ARP_NO_REPLY"], vorlagen: ["praxis"],
    passt: (n, r) => r.trunkPort ? [{key: r.trunkPort, geraet: r.switch, port: r.trunkPort}] : [],
    anwenden(n, k){ Modell.setzen(n, "sw1", `ports.${k.port || k.key}.modus`, "access"); },
    loesung: (n, k) => [{geraet: k.geraet, cli: cli(`interface ${lang(k.port)}`, "switchport mode trunk"), text: `Switch: ${k.port} wieder als Trunk betreiben.`}],
    hilfen: (n, k) => ({frage: ["Der Router erwartet getaggte Frames für jedes VLAN. Was macht ein Access-Port mit Tags?"],
      bereich: [{geraet: k.geraet, port: k.port}], konkret: [`${k.port} ist ein Access-Port statt Trunk: „switchport mode trunk“.`]}),
    erklaerung: "Beim Router-on-a-Stick laufen alle VLANs über ein Kabel. Dafür muss der Switchport ein Trunk sein (802.1Q). Als Access-Port gehört er nur zu einem VLAN; getaggte Frames des Routers verwirft er.", quelle: "VLAN – Lernfassung"});

  neu({name: "subif-vlan-falsch", titel: "Subinterface mit falschem VLAN", skills: ["lab.rostick", "lab.cli"], gruende: ["DROP_VLAN", "ARP_NO_REPLY"], vorlagen: ["praxis"],
    passt: (n, r) => r.vlans ? [{key: String(r.vlans.behandlung), geraet: r.router, sub: `Gi0/0.${r.vlans.behandlung}`, vlan: r.vlans.behandlung}] : [],
    anwenden(n, k){ Modell.setzen(n, "r1", `if.Gi0/0.${k.vlan || +k.key}.vlan`, (k.vlan || +k.key) + 1); },
    loesung: (n, k) => [{geraet: k.geraet, cli: cli(`interface ${lang(k.sub)}`, `encapsulation dot1Q ${k.vlan}`), text: `Router: ${k.sub} wieder auf VLAN ${k.vlan} (encapsulation dot1Q ${k.vlan}).`}],
    hilfen: (n, k) => ({frage: [`Welches VLAN-Tag erwartet das Subinterface ${k.sub}? Vergleich mit dem VLAN der Rechner.`],
      bereich: [{geraet: k.geraet, port: "Gi0/0"}], konkret: [`${k.sub} hat „encapsulation dot1Q ${k.vlan + 1}“ – richtig ist ${k.vlan}.`]}),
    erklaerung: "Jedes Subinterface gehört über „encapsulation dot1Q <VLAN>“ zu genau einem VLAN. Stimmt die Nummer nicht, findet der Router für getaggte Frames kein Subinterface und verwirft sie. Die Subinterface-Nummer selbst ist nur ein Name.", quelle: "VLAN – Lernfassung"});

  /* ---------- ACL ---------- */
  const gastAcl = (n, r) => n.geraete[r.router]?.running.acls?.[r.gastAcl || "GAST"];
  neu({name: "acl-reihenfolge", titel: "ACL-Regeln in falscher Reihenfolge", skills: ["lab.acl"], gruende: ["OFFEN"], vorlagen: ["praxis"],
    passt: (n, r) => gastAcl(n, r) ? [{key: "GAST", geraet: r.router, regeln: gastAcl(n, r).regeln}] : [],
    anwenden(n, k){ const a = n.geraete.r1.running.acls.GAST.regeln; Modell.setzen(n, "r1", "acls.GAST.regeln", [a[a.length - 1], ...a.slice(0, -1)]); },
    loesung: (n, k) => [{geraet: k.geraet, setzen: {"acls.GAST.regeln": k.regeln}, text: "ACL GAST: erst die beiden deny-Regeln, zuletzt „permit ip any any“."}],
    hilfen: (n, k) => ({frage: ["Eine ACL wird von oben nach unten gelesen, die erste passende Regel gewinnt. Welche Regel trifft ein Paket vom Gast zum Server zuerst?"],
      bereich: [{geraet: k.geraet}], konkret: ["„permit ip any any“ steht ganz oben – dahinter kommt nie wieder eine Regel zum Zug."]}),
    erklaerung: "ACLs arbeiten „first match“: Die erste passende Regel entscheidet, danach wird nicht weitergelesen. Ein „permit any“ ganz oben macht alle Sperren darunter wirkungslos. Deshalb: spezielle Regeln nach oben, allgemeine nach unten."});

  neu({name: "acl-richtung", titel: "ACL in falscher Richtung", skills: ["lab.acl", "lab.cli"], gruende: ["OFFEN"], vorlagen: ["praxis"],
    passt: (n, r) => r.vlans ? [{key: "GAST", geraet: r.router, sub: `Gi0/0.${r.vlans.gaeste}`}] : [],
    anwenden(n, k){ const sub = k.sub || Object.keys(n.geraete.r1.running.if).find(p => n.geraete.r1.running.if[p].aclIn === "GAST"); Modell.setzen(n, "r1", `if.${sub}.aclIn`, null); Modell.setzen(n, "r1", `if.${sub}.aclOut`, "GAST"); },
    loesung: (n, k) => [{geraet: k.geraet, cli: cli(`interface ${lang(k.sub)}`, "no ip access-group GAST out", "ip access-group GAST in"), text: `Router: ACL GAST auf ${k.sub} eingehend statt ausgehend anwenden.`}],
    hilfen: (n, k) => ({frage: ["Die Regeln prüfen die Absenderadresse der Gäste. In welcher Richtung laufen Pakete MIT dieser Absenderadresse durch das Gäste-Subinterface?"],
      bereich: [{geraet: k.geraet, port: "Gi0/0"}], konkret: [`GAST hängt „out“ an ${k.sub}. Pakete der Gäste kommen dort aber herein: „ip access-group GAST in“.`]}),
    erklaerung: "„in“ prüft Pakete, die in die Schnittstelle hineinkommen, „out“ solche, die hinausgehen. Eine ACL auf die Absender der Gäste gehört eingehend an das Gäste-Interface – ausgehend sieht sie nur Antworten an die Gäste."});

  neu({name: "acl-zu-streng", titel: "ACL sperrt zu viel", skills: ["lab.acl"], gruende: ["ACL_DENY"], vorlagen: ["praxis"],
    passt: (n, r) => gastAcl(n, r) ? [{key: "GAST", geraet: r.router, regeln: gastAcl(n, r).regeln, netz: gastAcl(n, r).regeln[0].quelle}] : [],
    anwenden(n, k){ const a = n.geraete.r1.running.acls.GAST.regeln; const q = a[0].quelle; Modell.setzen(n, "r1", "acls.GAST.regeln", [{aktion: "deny", proto: "ip", quelle: q, ziel: {ip: "0.0.0.0", wc: "255.255.255.255"}, zielPort: null, quellPort: null, icmpTyp: null}, ...a]); },
    loesung: (n, k) => [{geraet: k.geraet, setzen: {"acls.GAST.regeln": k.regeln}, text: "ACL GAST: die Regel „deny … any“ ganz oben löschen."}],
    hilfen: (n, k) => ({frage: ["Die Gäste sollen ins Internet, nur nicht an Server und Behandlung. Welche Regel der ACL trifft ein Paket vom Gast zu www.beispiel.de?"],
      bereich: [{geraet: k.geraet}], konkret: ["Die oberste Regel verbietet den Gästen alles („deny … any“)."]}),
    erklaerung: "Eine zu allgemeine deny-Regel oben in der ACL sperrt mehr als gewollt. Sperren gehören so genau wie möglich formuliert: Quelle UND Ziel angeben, nicht „any“."});

  /* ---------- Routing ---------- */
  neu({name: "default-fehlt", titel: "Default-Route fehlt", skills: ["lab.route", "lab.ping", "lab.cli"], gruende: ["NO_ROUTE"], vorlagen: routerVorlagen,
    passt: (n, r) => (n.geraete[r.router]?.running.routen || []).filter(x => x.netz === "0.0.0.0").map(x => ({key: r.router, geraet: r.router, nh: x.nh})),
    anwenden(n, k){ const id = k.geraet || k.key; Modell.setzen(n, id, "routen", n.geraete[id].running.routen.filter(x => x.netz !== "0.0.0.0")); },
    loesung: (n, k) => [{geraet: k.geraet, cli: cli(`ip route 0.0.0.0 0.0.0.0 ${k.nh}`), text: `Router: Default-Route zum Provider ${k.nh} eintragen.`}],
    hilfen: (n, k) => ({frage: ["Der Router kennt seine eigenen Netze. Woher soll er wissen, wohin Pakete für das ganze Internet gehen?"],
      bereich: [{geraet: k.geraet}], konkret: [`Es fehlt „ip route 0.0.0.0 0.0.0.0 ${k.nh}“. „show ip route“ sagt: Gateway of last resort is not set.`]}),
    erklaerung: "Die Default-Route 0.0.0.0/0 ist die Route für „alles andere“. Fehlt sie, meldet der Router für jedes unbekannte Ziel „Destination unreachable“ – intern geht alles, das Internet nicht."});

  neu({name: "route-fehlt", titel: "Route zum anderen Standort fehlt", skills: ["lab.route", "lab.cli"], gruende: ["NO_RETURN_ROUTE", "NO_ROUTE", "HOST_UNREACHABLE", "TIMEOUT"], vorlagen: ["standorte"],
    passt: (n, r) => (n.geraete[r.router]?.running.routen || []).filter(x => x.netz !== "0.0.0.0").map(x => ({key: r.router, geraet: r.router, route: x})),
    anwenden(n, k){ const id = k.geraet || k.key; Modell.setzen(n, id, "routen", n.geraete[id].running.routen.filter(x => x.netz === "0.0.0.0")); },
    loesung: (n, k) => [{geraet: k.geraet, cli: cli(`ip route ${k.route.netz} ${k.route.maske} ${k.route.nh}`), text: `Zentrale: Route zum Filialnetz ${k.route.netz}/${IP.praefix(k.route.maske)} über ${k.route.nh}.`}],
    hilfen: (n, k) => ({frage: ["Die Filiale kann die Zentrale anpingen? Und umgekehrt? Schau in „show ip route“ der Zentrale: Kennt sie das Netz der Filiale?"],
      bereich: [{geraet: k.geraet}], konkret: [`Der Zentrale fehlt „ip route ${k.route.netz} ${k.route.maske} ${k.route.nh}“. Ohne sie gehen Pakete ins Filialnetz an die Default-Route – ins Internet.`]}),
    erklaerung: "Ein Router kennt nur direkt angeschlossene Netze und eingetragene Routen. Fehlt die Route zum anderen Standort, schickt er die Pakete über die Default-Route in Richtung Internet – dort verschwinden sie.", quelle: "04-AP1-Netzwerk"});

  neu({name: "rueckroute-fehlt", titel: "Rückroute fehlt", skills: ["lab.route", "lab.ping"], gruende: ["NO_RETURN_ROUTE", "NO_ROUTE"], vorlagen: ["standorte"],
    passt: (n, r) => (n.geraete[r.router2]?.running.routen || []).map(x => ({key: r.router2, geraet: r.router2, route: x})),
    anwenden(n, k){ Modell.setzen(n, k.geraet || k.key, "routen", []); },
    loesung: (n, k) => [{geraet: k.geraet, cli: cli(`ip route ${k.route.netz} ${k.route.maske} ${k.route.nh}`), text: `Filiale: Default-Route zur Zentrale (${k.route.nh}) eintragen.`}],
    hilfen: (n, k) => ({frage: ["Der Hinweg klappt – kommt die Antwort auch zurück? Welche Routen kennt der Filial-Router?"],
      bereich: [{geraet: k.geraet}], konkret: [`Der Filial-Router hat keine Route zurück: „ip route 0.0.0.0 0.0.0.0 ${k.route.nh}“.`]}),
    erklaerung: "Routing ist keine Einbahnstraße: Jedes Paket braucht einen Hinweg UND die Antwort einen Rückweg. Fehlt die Rückroute, kommt die Anfrage an, die Antwort aber nie – der Absender sieht nur „Zeitüberschreitung“, keine Fehlermeldung."});

  neu({name: "schleife", titel: "Routing-Schleife", skills: ["lab.ttl", "lab.route"], gruende: ["TTL_EXPIRED", "PORT_SHUTDOWN", "GW_UNREACHABLE", "ARP_NO_REPLY"], vorlagen: ["standorte"],
    passt: (n, r) => r.router2 ? [{key: r.router2, geraet: r.router2, port: "Gi0/0"}] : [],
    anwenden(n, k){ Modell.setzen(n, k.geraet || k.key, "if.Gi0/0.shutdown", true); },
    loesung: (n, k) => [{geraet: k.geraet, cli: cli("interface GigabitEthernet0/0", "no shutdown"), text: "Filial-Router: LAN-Schnittstelle Gi0/0 wieder einschalten."}],
    hilfen: (n, k) => ({frage: ["Mach ein traceroute von der Zentrale in die Filiale. Welche Router tauchen auf – und wie oft?"],
      bereich: [{geraet: k.geraet, port: "Gi0/0"}], konkret: ["Das Filial-LAN (Gi0/0) ist abgeschaltet. Der Filial-Router schickt Pakete dafür per Default zurück zur Zentrale, die wieder zur Filiale – bis die TTL 0 ist."]}),
    erklaerung: "Die TTL (Time to Live) sinkt an jedem Router um 1. Bei 0 wird das Paket verworfen und der Router meldet „Time exceeded“. So sterben Pakete in einer Routing-Schleife, statt ewig zu kreisen; traceroute nutzt genau diesen Mechanismus."});

  /* ---------- NAT ---------- */
  neu({name: "nat-vertauscht", titel: "NAT inside und outside vertauscht", skills: ["lab.nat", "lab.cli"], gruende: ["NAT_MISSING"], vorlagen: ["lan", "buero", "praxis", "standorte"],
    passt: (n, r) => r.wanIf && r.lanIf ? [{key: r.router, geraet: r.router, innen: r.lanIf, aussen: r.wanIf}] : [],
    anwenden(n, k){ const id = k.geraet || k.key; Modell.setzen(n, id, `if.${k.innen}.nat`, "outside"); Modell.setzen(n, id, `if.${k.aussen}.nat`, "inside"); },
    loesung: (n, k) => [{geraet: k.geraet, cli: cli(`interface ${lang(k.innen)}`, "ip nat inside", `interface ${lang(k.aussen)}`, "ip nat outside"), text: `Router: ${k.innen} = inside (LAN), ${k.aussen} = outside (Internet).`}],
    hilfen: (n, k) => ({frage: ["Welche Schnittstelle zeigt ins LAN, welche ins Internet? Und wie sind sie für NAT markiert?"],
      bereich: [{geraet: k.geraet}], konkret: [`inside und outside sind vertauscht: ${k.innen} muss „ip nat inside“ sein, ${k.aussen} „ip nat outside“.`]}),
    erklaerung: "NAT übersetzt nur Pakete, die von inside nach outside laufen. Sind die Rollen vertauscht, gehen die Pakete mit privater Absenderadresse unübersetzt ins Internet – und der Provider verwirft sie, denn private Adressen (RFC 1918) werden dort nicht geroutet."});

  neu({name: "nat-fehlt", titel: "NAT-Regel fehlt", skills: ["lab.nat", "lab.cli"], gruende: ["NAT_MISSING"], vorlagen: ["lan", "buero", "praxis", "standorte"],
    passt: (n, r) => (n.geraete[r.router]?.running.nat?.dynamisch || []).map(d => ({key: r.router, geraet: r.router, regel: d})),
    anwenden(n, k){ const id = k.geraet || k.key; Modell.setzen(n, id, "nat.dynamisch", []); },
    loesung: (n, k) => [{geraet: k.geraet, cli: cli(`ip nat inside source list ${k.regel.acl} interface ${lang(k.regel.aus)} overload`), text: `Router: PAT einschalten (list ${k.regel.acl}, overload auf ${k.regel.aus}).`}],
    hilfen: (n, k) => ({frage: ["Welche Absenderadresse haben die Pakete, wenn sie beim Provider ankommen?"],
      bereich: [{geraet: k.geraet}], konkret: [`Es fehlt „ip nat inside source list ${k.regel.acl} interface ${k.regel.aus} overload“.`]}),
    erklaerung: "PAT (NAT-Overload) ersetzt die privaten Absenderadressen durch die eine öffentliche Adresse des Routers und merkt sich die Zuordnung über Ports. Ohne diese Regel verlassen private Adressen das Netz – und werden im Internet verworfen."});

  neu({name: "nat-acl-falsch", titel: "NAT-ACL erfasst nicht alle Netze", skills: ["lab.nat", "lab.acl"], gruende: ["NAT_MISSING"], vorlagen: ["standorte"],
    passt: (n, r) => n.geraete[r.router]?.running.acls?.["1"] ? [{key: r.router, geraet: r.router, regeln: n.geraete[r.router].running.acls["1"].regeln, netzA: r.netzA}] : [],
    anwenden(n, k){ const id = k.geraet || k.key; const a = k.netzA || Modell.lesen(n.geraete[id].running, "if.Gi0/0.ip").replace(/\d+$/, "0");
      Modell.setzen(n, id, "acls.1.regeln", [{aktion: "permit", proto: "ip", quelle: {ip: a, wc: "0.0.0.255"}, ziel: null, zielPort: null, quellPort: null, icmpTyp: null}]); },
    loesung: (n, k) => [{geraet: k.geraet, setzen: {"acls.1.regeln": k.regeln}, text: `Zentrale: ACL 1 muss beide Standorte erfassen (${k.regeln[0].quelle.ip} ${k.regeln[0].quelle.wc}).`}],
    hilfen: (n, k) => ({frage: ["PAT übersetzt nur, was die ACL erlaubt. Welche Absender erlaubt ACL 1 – und aus welchem Netz kommt die Filiale?"],
      bereich: [{geraet: k.geraet}], konkret: [`ACL 1 erlaubt nur ${k.netzA}/24. Die Filiale fehlt.`]}),
    erklaerung: "Die ACL einer NAT-Regel legt fest, WELCHE inneren Adressen übersetzt werden. Fehlt ein Netz darin, gehen dessen Pakete unübersetzt hinaus und werden beim Provider verworfen – nur dieser Standort hat dann kein Internet."});

  neu({name: "gespeichert-kaputt", titel: "Nach Stromausfall fehlt eine Änderung", skills: ["lab.speichern", "lab.cli"], gruende: ["PORT_SHUTDOWN", "NO_ROUTE", "NAT_MISSING", "GW_UNREACHABLE", "ARP_NO_REPLY"], vorlagen: ["lan", "buero", "praxis"],
    passt: (n, r) => r.wanIf ? [{key: r.router, geraet: r.router, port: r.wanIf}] : [],
    anwenden(n, k){ const id = k.geraet || k.key; Modell.setzen(n, id, `if.${k.port || "Gi0/1"}.shutdown`, true); Modell.speichern(n.geraete[id]); },
    zusatzZiele: (n, k) => [{typ: "gespeichert", geraet: k.geraet, text: "Die Konfiguration ist gespeichert (übersteht den nächsten Stromausfall)"}],
    loesung: (n, k) => [{geraet: k.geraet, cli: cli(`interface ${lang(k.port)}`, "no shutdown") + "\ncopy running-config startup-config",
      text: `Router: ${k.port} einschalten UND speichern (copy running-config startup-config).`}],
    hilfen: (n, k) => ({frage: ["Nach einem Neustart lädt der Router die startup-config. Was steht darin – und was hattest du beim letzten Mal nur in der running-config geändert?"],
      bereich: [{geraet: k.geraet, port: k.port}], konkret: [`${k.port} ist nach dem Neustart wieder aus. Einschalten und mit „copy running-config startup-config“ speichern.`]}),
    erklaerung: "Konfigurationsänderungen landen zuerst in der running-config (RAM). Erst „copy running-config startup-config“ (oder „write memory“) schreibt sie ins NVRAM. Ungespeichertes ist nach einem Neustart oder Stromausfall weg.", quelle: "VLAN – Lernfassung"});

  /* ---------- Firewall, DMZ, Port-Weiterleitung ---------- */
  const fwRegeln = n => n.geraete.fw?.running.regeln || [];
  neu({name: "fw-regel-fehlt", titel: "Firewall-Regel fehlt", skills: ["lab.fw"], gruende: ["FW_DENY"], vorlagen: ["dmz"],
    passt: n => fwRegeln(n).filter(r => r.id === "r1" || r.id === "r2").map(r => ({key: r.id, geraet: "fw", regel: r, regeln: fwRegeln(n)})),
    anwenden(n, k){ Modell.setzen(n, "fw", "regeln", fwRegeln(n).filter(r => r.id !== (k.regel ? k.regel.id : k.key))); },
    loesung: (n, k) => [{geraet: "fw", setzen: {regeln: k.regeln}, text: `Firewall: Regel „${k.regel.text}“ (${k.regel.von} → ${k.regel.nach}, ${k.regel.proto}${k.regel.port ? "/" + k.regel.port : ""}) wieder anlegen.`}],
    hilfen: (n, k) => ({frage: ["Eine Firewall lässt nur durch, was eine Regel ausdrücklich erlaubt. Welche Regel müsste diesen Verkehr erlauben?"],
      bereich: [{geraet: "fw"}], konkret: [`Es fehlt die Regel ${k.regel.von} → ${k.regel.nach} (${k.regel.proto}${k.regel.port ? "/" + k.regel.port : ""}).`]}),
    erklaerung: "Firewalls arbeiten nach dem Grundsatz „Was nicht ausdrücklich erlaubt ist, ist verboten“ (implizites Verwerfen). Fehlt die Regel für einen Weg, ist er zu – auch wenn Routing und NAT stimmen."});

  neu({name: "fw-reihenfolge", titel: "Sperr-Regel steht zu weit oben", skills: ["lab.fw"], gruende: ["FW_DENY"], vorlagen: ["dmz"],
    passt: n => fwRegeln(n).length ? [{key: "fw", geraet: "fw", regeln: fwRegeln(n)}] : [],
    anwenden(n){ Modell.setzen(n, "fw", "regeln", [{id: "rx", von: "innen", nach: "dmz", proto: "ip", quelle: "any", ziel: "any", port: null, aktion: "verwerfen", aktiv: true, text: "Alles in die DMZ sperren"}, ...fwRegeln(n)]); },
    loesung: (n, k) => [{geraet: "fw", setzen: {regeln: k.regeln}, text: "Firewall: die Regel „Alles in die DMZ sperren“ entfernen oder unter die erlaubenden Regeln schieben."}],
    hilfen: () => ({frage: ["Die Regel für den Webshop ist da. Aber wird sie überhaupt erreicht? Lies die Regeln von oben."],
      bereich: [{geraet: "fw"}], konkret: ["Ganz oben steht „innen → dmz: ip verwerfen“ – sie trifft zuerst."]}),
    erklaerung: "Auch Firewall-Regeln gelten „first match“. Eine allgemeine Sperre über einer speziellen Erlaubnis macht die Erlaubnis wirkungslos."});

  neu({name: "portfwd-falsch", titel: "Port-Weiterleitung auf falschen Port", skills: ["lab.portfwd", "lab.ports"], gruende: ["PORT_CLOSED", "SERVICE_OFF", "FW_DENY"], vorlagen: ["dmz"],
    passt: n => (n.geraete.fw?.running.nat?.weiterleitung || []).map(w => ({key: "fw", geraet: "fw", nat: n.geraete.fw.running.nat, w})),
    anwenden(n){ const nat = tief(n.geraete.fw.running.nat); nat.weiterleitung = nat.weiterleitung.map(w => Object.assign({}, w, {zielPort: 80})); Modell.setzen(n, "fw", "nat", nat); },
    loesung: (n, k) => [{geraet: "fw", setzen: {nat: k.nat}, text: `Firewall: Weiterleitung von Port ${k.w.aussenPort} auf ${k.w.ziel}:${k.w.zielPort} (nicht Port 80).`}],
    hilfen: (n, k) => ({frage: ["Die Anfrage kommt auf Port 443 an. Auf welchen Port des Webshops leitet die Firewall weiter – und lauscht dort ein Dienst?"],
      bereich: [{geraet: "fw"}, {geraet: "web"}], konkret: [`Die Weiterleitung zeigt auf ${k.w.ziel}:80. Der Webshop spricht nur HTTPS (443).`]}),
    erklaerung: "Eine Port-Weiterleitung (statisches NAT mit Port) übersetzt Ziel-Adresse UND Ziel-Port. Stimmt der innere Port nicht, landet die Anfrage bei einem geschlossenen Port – der Server antwortet mit RST."});

  neu({name: "dmz-regel-fehlt", titel: "Von außen ist die DMZ zu", skills: ["lab.dmz", "lab.fw"], gruende: ["FW_DENY"], vorlagen: ["dmz"],
    passt: n => fwRegeln(n).filter(r => r.id === "r3").map(r => ({key: "r3", geraet: "fw", regel: r, regeln: fwRegeln(n)})),
    anwenden(n){ Modell.setzen(n, "fw", "regeln", fwRegeln(n).filter(r => r.id !== "r3")); },
    loesung: (n, k) => [{geraet: "fw", setzen: {regeln: k.regeln}, text: "Firewall: Regel außen → DMZ, TCP 443 zum Webshop wieder anlegen."}],
    hilfen: () => ({frage: ["Die Weiterleitung stimmt. Welche Regel erlaubt Verkehr von außen in die DMZ?"],
      bereich: [{geraet: "fw"}], konkret: ["Es fehlt „aussen → dmz, tcp/443, Ziel Webshop, erlauben“."]}),
    erklaerung: "Die DMZ ist eine eigene Zone zwischen Internet und LAN: Von außen darf nur genau das hinein, was die Dienste dort brauchen (hier HTTPS), und aus der DMZ darf nichts ins LAN. So bleibt das interne Netz geschützt, selbst wenn der Webserver angegriffen wird."});

  /* ---------- DHCP-Tiefe (D1, Architektur § 10) ---------- */
  /* Lage des DHCP im Netz ermitteln, ohne die Rollen zu brauchen: Wer vergibt Adressen, aus welchem Netz, an wen? */
  function dhcpLage(n){
    for (const g of Object.values(n.geraete)) {
      const d = (g.running && g.running.dhcp) || (g.running && g.running.dienste && g.running.dienste.dhcp);
      const pools = (d && d.pools) || [];
      const p = pools.find(x => IP.gueltig(x.netz) && IP.maskeGueltig(x.maske));
      if (p) return {server: g.id, pool: p, netz: IP.netz(p.netz, p.maske), maske: p.maske};
    }
    return null;
  }
  /* Der Switch, an dem die DHCP-Clients hängen – darüber läuft Snooping.
     Nur DIREKT am Switch: sonst bietet `passt` Fälle an, in denen der Fehler gar nicht ankommt (Entwürfe ohne Wirkung). */
  function clientSwitch(n){
    for (const g of Object.values(n.geraete)) {
      if (!Modell.HOST[g.typ] || !(g.running.if && g.running.if.eth0 && g.running.if.eth0.dhcp)) continue;
      const k = Modell.kabelAn(n, g.id, "eth0");
      if (k && n.geraete[k.gegen.geraet] && n.geraete[k.gegen.geraet].typ === "switch") return {switch: k.gegen.geraet, port: k.gegen.port};
    }
    return null;
  }
  const freiSwitchPort = (n, sw) => Object.keys(n.geraete[sw].running.ports).find(p => !Modell.kabelAn(n, sw, p)) || null;
  /* An welchem Port eines Switches hängt der DHCP-Server? (Für „vertrauter Port“ beim Snooping.) */
  function serverPort(n, sw, server){
    for (const p of Object.keys(n.geraete[sw].running.ports)) {
      const k = Modell.kabelAn(n, sw, p);
      if (!k) continue;
      /* direkt am Switch oder dahinter über einen weiteren Switch */
      if (k.gegen.geraet === server) return p;
      let g = k.gegen.geraet;
      for (let i = 0; i < 3; i++) {
        const gg = n.geraete[g];
        if (!gg || gg.typ !== "switch") break;
        let weiter = null;
        for (const q of Object.keys(gg.running.ports)) {
          const kk = Modell.kabelAn(n, g, q);
          if (!kk || kk.gegen.geraet === sw) continue;
          if (kk.gegen.geraet === server) return p;
          weiter = kk.gegen.geraet;
        }
        if (!weiter) break;
        g = weiter;
      }
    }
    return null;
  }

  neu({name: "fremder-dhcp", titel: "Zweiter DHCP-Server im Netz", skills: ["lab.dhcp"], gruende: ["NO_ROUTE", "TIMEOUT", "DHCP_ROGUE_OFFER", "NO_GATEWAY"],
    vorlagen: ["buero"],
    passt: (n, r) => {
      const l = dhcpLage(n), cs = clientSwitch(n);
      return l && cs && freiSwitchPort(n, cs.switch) ? [{key: "fremd", server: l.server, pool: l.pool, netz: l.netz, maske: l.maske, switch: cs.switch}] : [];
    },
    anwenden(n, k){
      const p3 = k.netz.split(".").slice(0, 3).join(".");
      Modell.geraet(n, "router", {id: "fremd1", name: "FRITZ-Router"});
      const v = Modell.verbinden(n, {geraet: "fremd1"}, {geraet: k.switch});
      if (v && v.fehler) throw new Error("fremder-dhcp: " + v.fehler);
      Modell.setzen(n, "fremd1", "if.Gi0/0.ip", p3 + ".254");
      Modell.setzen(n, "fremd1", "if.Gi0/0.maske", k.maske);
      Modell.setzen(n, "fremd1", "if.Gi0/0.shutdown", false);
      Modell.setzen(n, "fremd1", "dhcp", {an: true, ausgeschlossen: [],
        pools: [{name: "GAST", netz: k.netz + "0", maske: k.maske, gw: p3 + ".254", dns: "8.8.8.8", start: p3 + ".200", anzahl: 20}]});
    },
    /* EIN Schritt: den fremden Server abschalten. Der Rechner holt sich danach beim nächsten Senden die Adresse vom
       richtigen Server – er darf NICHT auf statisch umgestellt werden, sonst steht er ohne Adresse da. */
    loesung: () => [
      {geraet: "fremd1", cli: cli("interface Gi0/0", "shutdown"), text: "Den fremden Router abschalten: auf dem fremden Router „interface Gi0/0“ → „shutdown“ (im Inspektor: Schnittstelle abschalten). Danach „ipconfig /renew“, damit der Rechner die richtige Adresse holt."}],
    hilfen: (n, k) => ({frage: ["Der Rechner hat eine Adresse bekommen – aber kommt nicht hinaus. Sieh dir sein Standardgateway an: Ist das der Router, den du kennst?"],
      bereich: [{geraet: k.switch}], konkret: [`Im Netz antwortet ein zweiter DHCP-Server (${k.netz.split(".").slice(0, 3).join(".")}.254) und verteilt sich selbst als Gateway. Er hängt am Switch ${name(n, k.switch)}.`]}),
    erklaerung: "Ein Rechner nimmt das erste DHCP-Angebot, das ankommt – vom richtigen Server oder von einem fremden. Ein fremder („Rogue“) Server verteilt dann oft sich selbst als Gateway und einen fremden DNS-Server: Der Rechner hat eine gültige Adresse, kommt aber nicht ins Internet. Erkennbar an „ipconfig /all“: Dort steht ein DHCP-Server, den es im Netz nicht geben sollte. Abhilfe: den fremden Server abschalten oder DHCP-Snooping am Switch einschalten.",
    quelle: "RFC 2131 · IOS-ähnlich (Snooping ist eine Switch-Funktion, kein RFC-Verfahren)"});

  neu({name: "snooping-ohne-trust", titel: "DHCP-Snooping ohne vertrauten Port", skills: ["lab.dhcp", "lab.switch"], gruende: ["DHCP_NO_OFFER", "NO_IP"],
    vorlagen: ["buero"],
    passt: (n, r) => {
      const l = dhcpLage(n), cs = clientSwitch(n);
      return l && cs ? [{key: cs.switch, switch: cs.switch, server: l.server}] : [];
    },
    anwenden(n, k){ Modell.setzen(n, k.switch, "snooping", {an: true, vertraut: []}); },
    /* Lösung: den Port zum Server als vertraut eintragen. Lässt sich der Port nicht sicher bestimmen (Server hinter
       einem weiteren Switch), ist Snooping abzuschalten die richtige Antwort – beides heilt den Fehler. */
    loesung: (n, k) => {
      const p = serverPort(n, k.switch, k.server);
      return [{geraet: k.switch, setzen: {snooping: p ? {an: true, vertraut: [p]} : {an: false, vertraut: []}},
        text: p ? `Am Switch ${name(n, k.switch)} den Port ${p} (Richtung Server) als vertraut eintragen; Snooping bleibt an.`
                : `Am Switch ${name(n, k.switch)} DHCP-Snooping abschalten oder den Port Richtung Server als vertraut eintragen.`}];
    },
    hilfen: (n, k) => ({frage: ["Der Server läuft, der Pool hat Adressen – und trotzdem kommt kein Angebot an. Was könnte die Antwort auf dem Weg zum Client abfangen?"],
      bereich: [{geraet: k.switch}], konkret: [`Am Switch ${name(n, k.switch)} ist DHCP-Snooping an, aber kein Port als vertraut markiert – die Antwort des Servers wird verworfen.`]}),
    erklaerung: "DHCP-Snooping schützt vor fremden DHCP-Servern: Nur an „vertrauten“ Ports dürfen Server-Antworten (Offer, Ack) hereinkommen, alle anderen Ports dürfen nur Anfragen stellen. Ist der Port zum echten Server nicht als vertraut eingetragen, wirft der Switch dessen Antworten weg – die Clients bekommen keine Adresse, obwohl der Server läuft.",
    quelle: "RFC 2131 · IOS-ähnlich (Snooping ist eine Switch-Funktion)"});

  return I;
})();
