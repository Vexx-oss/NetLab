---
tags: [FISI, Lernspiel, Architektur]
erstellt: 2026-09-30
status: verbindlicher Vertrag zwischen den Bausteinen (Stand Bau 30.09./01.10.2026)
---

# 🧱 Architektur – Netzwerk-Labor

⬆️ [[10-Projekte/Lernprojekte/Netzwerk-Labor/Liesmich|Netzwerk-Labor]] · Spezifikation: [[Konzept – Netzwerk-Labor]]

Diese Notiz ist der **Vertrag** zwischen den Bausteinen. Wer ein Modul baut, hält sich an die Namen, Datenformen und Aufrufe hier. Wer etwas ändern muss, ändert es **hier zuerst**.

## 1 · Grundsätze

- **Eigenes Desktop-Programm** (Tauri 2). Die Spielhalle bleibt unberührt; nur `lernmotor.js` wird zur Bauzeit aus `../FISI-Spielhalle/src/` eingebunden (Konzept § 8.3).
- **Schlichtes JavaScript**, keine ES-Module, kein npm, kein Bundler. Jede Datei ist ein klassisches Skript. `bauen.py` hängt sie in fester Reihenfolge zusammen.
- **Namensräume statt Globals-Wildwuchs.** Jede Schicht hat genau ein globales Objekt, das ihre *erste* Datei anlegt, alle weiteren erweitern es:

| Schicht | Objekt | Erste Datei | DOM? | Zeit/Zufall? |
|---|---|---|---|---|
| Kern | `IP`, `Bus`, `Zufall`, `store`, `heute`, `plusTage`, `tageZwischen`, `tief`, `esc` | `kern/basis.js`, `kern/netz.js` | nein | nur `jetzt()` in basis |
| Modell | `Modell` | `modell/geraete.js` | nein | nein |
| Simulation | `Sim` | `sim/engine.js` | **nie** | **nie** (virtuelle Zeit, Seed) |
| Konsole | `CLI` | `cli/parser.js` | **nie** | **nie** |
| Spiel | `Spiel` | `spiel/zustand.js` | nein | nur über `jetzt()` |
| Daten | `DATEN` | `daten/lehrtexte.js` | nein | nein |
| Plattform | `Plattform` | `plattform/plattform.js` | ja | ja |
| Oberfläche | `UI` | `ui/dom.js` | ja | ja |
| Lernmotor | `L` | Spielhalle `lernmotor.js` | nein | Datum |

- `sim/`, `cli/`, `modell/`, `kern/`, `spiel/`, `daten/` laufen **headless in Node** (`tests/run.js`). Deshalb: kein `document`, kein `window`, kein `Date.now()`/`Math.random()` in `sim/` und `cli/`. Spiel nutzt `jetzt()` aus basis (in Tests ersetzbar).
- Deutsche Bezeichner wie in der Spielhalle. Anrede im Spiel „du“.

## 2 · Build und Ordner

```
Netzwerk-Labor/
  bauen.py             → web/index.html (Einzeldatei + web/schriften/), --paket → Browser-ZIP (Nebenprodukt)
  src/seite.html       Hülle mit /*STIL*/, /*SKRIPTE*/, <!--SCHRIFTEN-->
  src/stil/*.css       Reihenfolge in bauen.py (STILE)
  src/**/*.js          Reihenfolge in bauen.py (MODULE)
  shell/src-tauri/     Tauri-Projekt (frontendDist = ../../web)
  tests/               harness.js, run.js (Node), tests.html (Browser), *.test.js
  tools/               messen.ps1, linux-bauen.sh, cdp.py (Test im echten Programm), klassen.py (Klassen ↔ CSS), rauch.py (Rauchtest der Oberfläche)
  web/                 Build-Ausgabe
```

**Neue Datei?** In `bauen.py` in `MODULE` (bzw. `STILE`) an der richtigen Stelle eintragen, und – falls headless-fähig – in `tests/run.js` in `HEADLESS`. Eine Datei, die nicht in `MODULE` steht, existiert für das Programm nicht.

Tests: `sh tools/test.sh [filter]` (Node 24 portabel; früher WSL). Testdateien nutzen `pruefe(name, fn)` und `erwarte`-Hilfen aus `tests/harness.js`. Die Tests laden `ui/` nicht – dafür gibt es `sh tools/test.sh --rauch`: Node-Tests, `tools/klassen.py` (muss 0 melden) und `tools/rauch.py` (jede Ansicht in 1366/960/720 px in Edge headless: Hauptaktion sichtbar und anklickbar, kein waagerechter Überlauf, keine JS-Fehler; `--exe` prüft das echte Programm).

## 3 · Kern (`kern/basis.js`, `kern/netz.js`)

- `store.get(k, d)`, `store.set(k, v)` – synchron, Cache mit Durchschreiben (Konzept § 9.3). Schlüssel: `"lern"` (Lernmotor), `"labor"` (Spielstand), `"einst"` (Einstellungen).
- `heute()`, `plusTage(tag, n)`, `tageZwischen(a, b)` – wie Spielhalle (der Lernmotor braucht sie).
- `jetzt()` – Millisekunden; in Tests über `jetzt.setzen(ms)` steuerbar.
- `Bus.an(name, fn)`, `Bus.aus(name, fn)`, `Bus.senden(name, daten)`.
- `Zufall(seed)` → `{zahl(n), wahl(arr), mischen(arr), kommazahl()}` (deterministisch, mulberry32).
- `tief(x)` tiefe Kopie (JSON-sicher), `esc(s)` HTML-Escape.
- `IP`: `zuZahl(s)`, `zuText(n)`, `gueltig(s)`, `maskeGueltig(s)`, `praefix(maske)`, `maske(praefix)`, `netz(ip, maske)`, `broadcast(ip, maske)`, `gleichesNetz(a, b, maske)`, `imNetz(ip, netz, maske)`, `wildcardPasst(ip, basis, wc)`, `privat(ip)`, `apipa(ip)`, `cidr(ip, maske)` → `"192.168.1.0/24"`, `macCisco(mac)` → `"0060.2f3a.1b01"`, `macWindows(mac)` → `"00-60-2F-3A-1B-01"`.

## 4 · Modell (Konfiguration ist Daten)

Ein **Netz** ist reines JSON:

```js
{ v:1,
  geraete: { [id]: Geraet },
  kabel:   [ { id:"k1", a:{geraet:"pc1", port:"eth0"}, b:{geraet:"sw1", port:"Fa0/1"} } ],
  zustand: { _uhr:0, [id]: Laufzeit }      // Laufzeit der Simulation (ARP, MAC-Tabellen …), siehe § 5.4
}
```

**Geraet**

```js
{ id:"r1", typ:"pc"|"server"|"switch"|"router"|"firewall"|"internet"|"nas",
  skin:null|"laptop"|"drucker"|"kasse"|"tablet",      // nur Optik bei pc
  name:"R1", x:400, y:200, an:true,
  hw:{ macs:{ "Gi0/0":"00:1a:2b:3c:4d:01", … } },     // je physischem Port, fest
  running: Konfig, startup: Konfig|null,              // null = Werkszustand (kein startup-config)
  flash: { vlans:{ "1":{name:"default"}, "10":{name:"Verwaltung"} } }   // nur switch: vlan.dat
}
```

**Ports je Typ** (`Modell.PORTS`): pc/server `["eth0"]` · nas `["eth0","eth1"]` · switch `Fa0/1…Fa0/24, Gi0/1, Gi0/2` · router `Gi0/0, Gi0/1, Gi0/2` · firewall `Gi0/0…Gi0/3` · internet `wan0…wan3`. Subinterfaces (`Gi0/0.10`) sind nur Konfiguration, keine Ports.

**Konfig je Typ** (Werkszustand = `Modell.werkszustand(typ)`):

```js
// pc, server, nas
{ hostname:"PC1",
  if:{ eth0:{ an:true, dhcp:false, ip:"", maske:"", gw:"", dns:"" } },
  dienste:{ http:{an:true}, https:{an:false}, dns:{an:false, eintraege:[{name:"intranet.salon.local", ip:"192.168.1.5"}]},
            dhcp:{an:false, pools:[{name, netz, maske, gw, dns, start, anzahl}]}, datei:{an:false}, ssh:{an:false}, druck:{an:false} } }
// Dienst → Port: http tcp/80, https tcp/443, dns udp/53, dhcp udp/67, datei tcp/445, ssh tcp/22, druck tcp/9100 (Modell.DIENSTPORTS)

// switch  (VLANs stehen in geraet.flash.vlans, NICHT in der Konfig – wie vlan.dat)
{ hostname:"Switch", enableSecret:null, banner:"",
  ports:{ "Fa0/1":{ modus:"access"|"trunk", accessVlan:1, trunkErlaubt:"all"|[1,10,20], nativeVlan:1, shutdown:false, beschreibung:"",
                    portSecurity:null|{max:1, verstoss:"shutdown", macs:[]} }, … },
  svi:{ "1":{ ip:"", maske:"", shutdown:true } },
  defaultGateway:"" }

// router
{ hostname:"Router", enableSecret:null, banner:"",
  if:{ "Gi0/0":{ ip:"", maske:"", shutdown:true, beschreibung:"", nat:null|"inside"|"outside", aclIn:null, aclOut:null, helper:[] },
       "Gi0/0.10":{ vlan:10, nativ:false, ip:"", maske:"", shutdown:false, beschreibung:"", nat:null, aclIn:null, aclOut:null, helper:[] } },
  routen:[ { netz:"10.0.2.0", maske:"255.255.255.0", nh:"10.0.1.2"|null, aus:"Gi0/1"|null, ad:1 } ],
  acls:{ "10":{ typ:"standard", benannt:false, regeln:[Regel] }, "GAST":{ typ:"erweitert", benannt:true, regeln:[Regel] } },
  nat:{ statisch:[{ innen:"192.168.1.10", aussen:"203.0.113.10", proto:null|"tcp"|"udp", innenPort:null, aussenPort:null }],
        dynamisch:[{ acl:"1", aus:"Gi0/1", overload:true }] },
  dhcp:{ ausgeschlossen:[{von:"192.168.10.1", bis:"192.168.10.9"}], pools:[{ name:"LAN", netz:"192.168.10.0", maske:"255.255.255.0", gw:"192.168.10.1", dns:"" }] } }

// Regel (ACL)
{ aktion:"permit"|"deny", proto:"ip"|"tcp"|"udp"|"icmp",
  quelle:{ip:"192.168.1.0", wc:"0.0.0.255"}, ziel:{ip:"0.0.0.0", wc:"255.255.255.255"},   // any = 0.0.0.0/255.255.255.255, host = wc 0.0.0.0
  zielPort:null|{op:"eq"|"neq"|"gt"|"lt"|"range", ports:[80]}, quellPort:null|{…}, icmpTyp:null|"echo"|"echo-reply" }
// Standard-ACL: nur quelle, proto "ip". Implizites deny any am Ende.

// firewall (herstellerneutral)
{ hostname:"FW1",
  if:{ "Gi0/0":{ ip:"", maske:"", zone:"innen"|"aussen"|"dmz"|null, shutdown:false } },
  routen:[…wie router…],
  regeln:[ { id:"r1", von:"innen", nach:"aussen", proto:"ip"|"tcp"|"udp"|"icmp", quelle:"any"|"192.168.1.0/24", ziel:"any"|"cidr", port:null|443, aktion:"erlauben"|"verwerfen", aktiv:true, text:"" } ],
  nat:{ quellNat:[{von:"innen", nach:"aussen"}], weiterleitung:[{ proto:"tcp", aussenPort:443, ziel:"172.16.0.10", zielPort:443 }] } }
// Erste passende Regel gewinnt, am Ende implizit verwerfen, zustandsbehaftet (Rückverkehr erlaubt).

// internet (Kulisse, nicht konfigurierbar im Spiel)
{ hostname:"Internet",
  if:{ wan0:{ ip:"203.0.113.1", maske:"255.255.255.252" }, … },
  routen:[ {netz:"203.0.113.16", maske:"255.255.255.240", nh:"203.0.113.2"} ],
  server:[ { name:"www.beispiel.de", ip:"198.51.100.10", dienste:["http","https"] }, { name:"dns.beispiel.de", ip:"198.51.100.53", dienste:["dns"] } ] }
// Verwirft Pakete mit privater Quelladresse (Grund NAT_MISSING).
```

**Modell-API** (`modell/*.js`): `Modell.neu()`, `Modell.geraet(netz, typ, {id?, name?, x, y, skin?})` (legt an, vergibt MACs), `Modell.entfernen(netz, id)`, `Modell.ports(geraet)`, `Modell.verbinden(netz, a, b)` (`a`/`b` = `{geraet, port?}`; ohne Port → nächster freier passender) → Kabel oder `{fehler}`, `Modell.trennen(netz, kabelId)`, `Modell.kabelAn(netz, id, port)` → `{kabel, gegen:{geraet,port}}|null`, `Modell.freierPort(netz, id)`, `Modell.linkOben(netz, kabel)` → `{oben, grund}`, `Modell.konfig(geraet)` (= running), `Modell.setzen(netz, id, pfad, wert)` (Pfad wie `"if.eth0.gw"`), `Modell.speichern(geraet)` (running → startup), `Modell.neustart(netz, id)` (running := tief(startup) oder Werkszustand, Laufzeit leeren), `Modell.kopie(netz)`, `Modell.pruefen(netz)` → Warnungen `[{geraet, feld, text, code}]` (Live-Prüfung: „10.0.0.5/24 liegt nicht im Netz von Gateway 10.0.1.1“), `Modell.gleich(a, b)`.

**Rückgängig** (`modell/verlauf.js`): `Modell.verlauf(netz)` → `{aendern(beschreibung, fn), zurueck(), vor(), kannZurueck, kannVor, liste}`. Schnappschuss-basiert (Netz ist klein), höchstens 100 Schritte. **Jede** UI- und Konsolenänderung geht über `aendern`. Danach `Bus.senden("netz-geaendert", {netz, beschreibung})`.

## 5 · Simulation (`Sim`)

### 5.1 Aufrufe (verändern `netz.zustand`, nie die Konfig)

```js
Sim.ping(netz, vonId, ziel, {anzahl:4, ttl:null, quelle:null})   // ziel = IP oder Gerätename (DNS)
  → { ok, antworten:[{ok, grund|null, rtt, ttl, von}], trace, text }
Sim.traceroute(netz, vonId, zielIp, {maxHops:30})  → { hops:[{nr, ip|null, grund|null}], ok, trace }
Sim.tcp(netz, vonId, ziel, port)                  → { ok, grund, trace }       // Handshake SYN, SYN/ACK, ACK (+FIN)
Sim.http(netz, vonId, url)                        → { ok, status, grund, trace } // DNS + TCP 80/443 + GET
Sim.dns(netz, vonId, name)                        → { ok, ip, grund, trace }
Sim.dhcp(netz, vonId, port="eth0")                → { ok, lease|null, grund, trace } // DORA; bei Fehlschlag APIPA
Sim.adresse(netz, id, port)                       → { ip, maske, gw, dns, quelle:"statisch"|"dhcp"|"apipa"|"keine" }
Sim.pruefeZiel(netz, ziel)                         → { ok, grund, trace, text }   // Ziel siehe § 7.1; nutzt eine Kopie
Sim.GRUENDE[code] → { titel, skill, schicht }      // Lehrtexte in DATEN.lehrtexte[code]
```

Hosts mit `dhcp:true` und ohne gültige Lease holen sich zuerst per DHCP eine Adresse (sichtbar in derselben Trace). Scheitert das: APIPA 169.254.x.x und Grund `DHCP_NO_OFFER`.

### 5.2 Trace (reine Daten, die UI spielt nur ab)

```js
Trace = { start, ende, ereignisse:[Ereignis], abbruch:null|"STORM", zusammenfassung:"…" }
Ereignis = {
  n:1, t:0.8,                       // laufende Nr., virtuelle Zeit in ms
  art:"senden"|"empfangen"|"weiterleiten"|"fluten"|"verwerfen"|"antworten"|"lernen"|"info",
  geraet:"sw1", port:"Fa0/1"|null,
  nach:{geraet, port}|null,         // bei "senden": Gegenstelle des Kabels
  frame: Frame,                     // Kopie, unveränderlich
  proto:"ARP"|"ICMP"|"TCP"|"UDP"|"DHCP"|"DNS"|"HTTP",
  grund:null|"ARP_NO_REPLY"|…,      // bei verwerfen/info
  text:"SW1 kennt MAC 00:1a… noch nicht und flutet in VLAN 10"   // kurzer Klartext
}
Frame = {
  eth:{ src, dst, typ:"ARP"|"IPv4", vlan:null|10 },            // vlan = 802.1Q-Tag (nur auf Trunk sichtbar)
  arp:null|{ op:"request"|"reply", senderMac, senderIp, targetMac, targetIp },
  ip:null|{ src, dst, ttl, proto:"ICMP"|"TCP"|"UDP", id },
  icmp:null|{ typ:"echo-request"|"echo-reply"|"unreachable"|"time-exceeded", code:null|"net"|"host"|"port"|"admin", seq },
  udp:null|{ src, dst }, tcp:null|{ src, dst, flags:["SYN","ACK"], seq, ack },
  app:null|{ proto:"DHCP"|"DNS"|"HTTP", info:"DHCP Discover", felder:{…} }
}
```

Ereignis-Budget je Lauf 5000; gerissen → `abbruch:"STORM"`, Grund `STORM`. Virtuelle Zeit: 1 ms je Kabel, Timeout Ping 2000 ms (IOS) bzw. 4000 ms (Windows).

### 5.3 Gründe (Codes)

`LINK_DOWN, PORT_SHUTDOWN, NO_IP, ARP_NO_REPLY, DROP_VLAN, TRUNK_NOT_ALLOWED, NATIVE_MISMATCH, NO_GATEWAY, GW_WRONG_SUBNET, GW_UNREACHABLE, WRONG_MASK, NO_ROUTE, NO_RETURN_ROUTE, TTL_EXPIRED, ACL_DENY, FW_DENY, NAT_MISSING, DUP_IP, DHCP_NO_OFFER, DHCP_POOL_EMPTY, DNS_FAIL, DNS_NO_SERVER, PORT_CLOSED, SERVICE_OFF, STORM, PORTSEC_VIOLATION, DEVICE_OFF, HOST_UNREACHABLE, TIMEOUT`

`Sim.GRUENDE[code] = {titel, skill:"lab.*", schicht:1..7}`. Lehrtexte in drei Tiefen stehen in `DATEN.lehrtexte[code] = {E, AP1, AP2, quelle}` (E erklärt, AP1 knapp, AP2 nur, was das Gerät melden würde).

### 5.4 Laufzeit (`netz.zustand[id]`)

`{ arp:{ [ip]:{mac, bis} }, mac:{ [vlan]:{ [mac]:{port, bis} } }, leases:{ [ip]:{mac, bis} }, dhcp:{ [port]:{ip, maske, gw, dns, server, bis} }, nat:[…], fw:[…] }` plus `zustand._uhr` (virtuelle Zeit, läuft über Läufe weiter). MAC-Alterung 300 s, ARP 14400 s (Router) bzw. 120 s (Host, vereinfacht). Link down leert die MAC-Einträge dieses Ports; IP-Änderung leert den ARP-Cache des Geräts (`Modell.setzen` erledigt das).

## 6 · Konsole (`CLI`)

```js
CLI.sitzung(netz, geraetId, {verlauf?}) → Sitzung      // IOS für switch/router/firewall(Grundzüge), Windows-Terminal für pc/server/nas
CLI.eingabe(sitzung, zeile)  → { ausgabe:"…", prompt:"R1(config-if)#", geaendert:bool, befehl:"interface gigabitEthernet0/0" }
CLI.tab(sitzung, zeile)      → { zeile, vorschlaege:[] }
CLI.prompt(sitzung)          → "R1#"
CLI.runningConfig(geraet)    → Text (show running-config)
CLI.entspricht(geraet, pfad, wert) → "interface Gi0/0\n ip address 10.0.0.1 255.255.255.0" | null   // „entspricht:“-Zeile der GUI
CLI.anwenden(netz, geraetId, befehle) → { ok, fehler:[] }   // mehrzeiliger Block ab privilegiertem Modus, für Lösungen und Tests
CLI.vorschlag(sitzung)       → nächster sinnvoller Befehl (Einstieg) | null
```

Änderungen der Konsole laufen über `Modell.setzen`/Verlauf (eine Quelle der Wahrheit). `ping`/`traceroute`/`tracert`/`nslookup`/`ipconfig /renew` rufen `Sim` und formatieren wie IOS bzw. Windows (`.!!!!`, „Antwort von …“).

## 7 · Spiel (`Spiel`)

### 7.1 Ticket (Daten in `daten/tickets-*.js` → `DATEN.tickets`)

```js
{ id:"salon-01", art:"stoerung"|"projekt"|"wartung"|"mini", stufe:"E"|"AP1"|"AP2", karriere:1,
  kunde:"salon", titel:"Drucker nicht erreichbar", briefing:"Hallo, …", symptom:"Kasse druckt nicht",
  skills:["lab.gateway"],
  netz:(z) => Netz,                  // Fabrik; z = Zufall(seed) für Varianten; liefert das GESUNDE oder Start-Netz
  fehler:[{ injektor:"gw-falsch", auf:"pc-kasse", param:{} }],     // optional, auf das Netz angewendet
  ziele:[ { typ:"erreichbar", von:"pc-kasse", nach:"drucker", proto:"icmp"|"tcp"|"http"|"dns", port:null, text:"Kasse erreicht Drucker" },
          { typ:"blockiert",  von:"gast", nach:"server", proto:"tcp", port:445, text:"Gäste kommen nicht an die Dateifreigabe" },
          { typ:"dhcp", von:"pc2", text:"PC2 bekommt per DHCP eine Adresse" },
          { typ:"konfig", geraet:"sw1", pfad:"ports.Fa0/5.accessVlan", wert:20, text:"…" },
          { typ:"gespeichert", geraet:"r1", text:"Konfiguration gesichert" } ],
  hilfen:{ frage:["…"], bereich:[{geraet:"pc-kasse"}], konkret:["…"] },
  loesung:[ { geraet:"pc-kasse", setzen:{ "if.eth0.gw":"192.168.1.1" }, text:"Gateway korrigieren" },
            { geraet:"r1", cli:"conf t\ninterface Gi0/1\nno shutdown\nend", text:"Schnittstelle einschalten" } ],
  erklaerung:"…", quelle:"Network – Lernfassung", lohn:{ euro:40, ruf:1 } }
```

Pflicht (Test): Jede Lösung erfüllt alle Ziele; das Start-Netz verletzt mindestens ein Ziel, und zwar mit dem erwarteten Grund.

### 7.2 Spielstand (`store "labor"`, `v:3`)

`{ v, euro, ruf, stufe, kunden:{[id]:{vertrag, ampel, seit, sterne:[]}}, postfach:[TicketInstanz], aktiv:iid|null, erledigt:[{id, sterne, tag, hilfe}], playbooks:{slots, aktiv:[skill]}, tag:{…Arbeitstag…}, zuletzt:ms, einstieg:{…} }`
(Die Liste ist ein Auszug; weitere Felder u. a. `naechsteIid`, `buch`, `angebot`, `dex`, `tagesraetsel`, `tagebuch`. Die **Einstellungen** liegen NICHT hier, sondern unter dem eigenen Store-Schlüssel `"einst"` — `st.einst` gibt es nicht.)

`TicketInstanz = { iid, ticketId, seed, netz, hilfeStufe, hilfen:[], start, frist|null, quelle:"postfach"|"wartung"|"wiederholung"|"generiert"|"notfall"|"raetsel"|"pruefung"|"folge", vielfalt?, kuratiert?, kuratiertId?, klingelt? }`

**Onboarding, nachgetragen 06.10.2026 (`spiel/erstestunde.js`):** `st.einstieg = { fertig, coach:{}, begruessung?:"auftrag"|"umsehen", abschluss?:true }`.
`begruessung` setzt die Wahl der Begrüßungskarte — genau einmal, und nur in einem frischen Stand (`!fertig` **und** kein erledigter Auftrag). `abschluss` markiert die gezeigte Abschluss-Station und verlangt `begruessung` **und** `fertig`. Fehlt `einstieg` ganz oder steht `fertig: true`, sieht ein Altstand nichts davon (die Begrüßung entfällt, der Abschluss ebenso).

**Auftragsvielfalt (neu 06.10.2026, `spiel/postfach.js` · `spiel/generator.js` · `daten/basis.js`)**

Vorher war jeder handgeschriebene Auftrag starr: `def.netz` ignorierte den Instanz-Seed, das Netz war bei Seed 1 und Seed 987654321 in **46 von 46** Fällen byte-gleich. Jetzt:
- `def.fuerSeed(seed)` liefert die Fassung je Instanz-Seed — Adressen, Ziele, Lösung und Hilfen werden mit dem Seed gebaut und je `(id, seed)` gemerkt (≤ 32 Fassungen je Ticket). Alle Zufallsströme kommen aus `Zufall(seed)`; ohne Seed bleibt die Definition **byte-gleich** wie vorher.
- `def.fehlerstellen = [{injektor, stelle}]` — wo kein `ziel`/`wahl` festgeschrieben ist, wählt der Seed die Fehlerstelle; derselbe Fehler kommt nie zweimal im selben Auftrag vor.
- `Spiel.ticketGueltig(def)` ist die Selbstprüfung jeder Seed-Fassung (Startbruch mit erwartetem Grund, Lösung heilt, Vorlagen-Regression). Fällt eine Fassung durch, bleibt die **feste** Fassung spielbar — eine gewürfelte Variante darf nie unlösbar werden.
- Ausnahmen bleiben fest: Terminal-Aufträge (`spec.art === "terminal"`) und alles, was konkrete Werte in Lösung oder Befehlsmuster nennt, laufen weiter auf dem festen Netz.
- **Spielstand:** neue Instanzen tragen `vielfalt: true`. Eine Instanz **ohne** dieses Feld (Altstand) behält ihre feste Fassung — ein laufender Auftrag wechselt sein Netz nie. Gemessen: Altstand `salon-02`, Netzkennwert `ee287645:12368` vor und nach dem Umbau gleich, Auftrag spielbar. `v` bleibt `2`.
- Erreicht: 58 Handaufträge × 12 Seeds = **627 verschiedene Netze** (vorher 58), gleicher `(id, seed)` in 696/696 Paaren identisch, Massendurchspiel 696/696 grün.

### 7.3 Spiel-API (Auswahl)

`Spiel.laden()`, `Spiel.st` (Zustand), `Spiel.postfach()`, `Spiel.oeffnen(iid)`, `Spiel.abnahme(inst)` → `[{ziel, ok, grund, trace}]` + Sterne, `Spiel.hilfe(inst)` → nächste Stufe, `Spiel.vorfuehren(inst)` → Lösungsschritte, `Spiel.tick(ms)` (Idle: Wartung, Einkommen, Ampeln), `Spiel.offlineBericht()`, `Spiel.mini()` → Mini-Ticket, `Spiel.generiere(skill, seed)` (Injektor-Generator), `Spiel.INJEKTOREN`.

Bus-Ereignisse: `netz-geaendert`, `ticket-neu`, `ticket-geloest`, `zustand-geaendert`, `trace`, `modus` (leiste/voll), `hilfe`.

### 7.4 Speichern — verbindlicher Vertrag (06.10.2026)

| Punkt | Vertrag |
|---|---|
| Schlüssel | `labor` (Spielstand), `einst` (Einstellungen), `sandbox` (freies Labor), `labor-sicherung` (rollierende Zweitsicherung), **`klassenraum`** (Klassenraum-Sitzung, `fassung: 1` — Nachtrag 09.10.2026, § 12.2). Geschrieben wird der **ganze** Speicher als ein JSON unter dem einen Schlüssel `netzwerk-labor` — im Browser und in der Android-Fassung in `localStorage`, im Desktop-Programm über Tauri in `spielstand.json`. Neue Schlüssel brauchen **keine** Änderung an `kern/basis.js` — die Speicher-Map ist frei |
| Entprellung | **genau eine**: `SPEICHER.entprellung = 1500 ms` (`kern/basis.js`). `Spiel.speichern()` markiert nur „schmutzig"; geschrieben wird 1500 ms nach der **letzten** Änderung. `Spiel.AUTOSPEICHERN_MS = 0` — die frühere zweite Schicht (400 ms in `spiel/ticket.js`) ist entfallen |
| Sofort schreiben | `store.sofort()`; im Spiel `Spiel.sofortSpeichern()` (Rückgabe immer erfüllt — ein Fehler ist bereits gemeldet). Aufrufer: Auftragsabschluss `spiel/abnahme.js` (bestanden **und** nicht bestanden), Ticket öffnen `spiel/ticket.js`, Käufe `spiel/wirtschaft.js` · `spiel/werkzeuge.js` · `spiel/playbooks.js`, Meilensteine `spiel/karriere.js` (Aufstieg, Fest gesehen), App in den Hintergrund `ui/start.js` (`pagehide`, `beforeunload`, `visibilitychange` → `hidden`) |
| Kennzeichen | `store.stand()` → `{art:"schreibt"\|"gesichert"\|"fehler", fehler, zeit}`. Der Bus meldet jede echte Änderung als `speicher-stand`, ein Fehler zusätzlich als `speicher-fehler`. Die Kopfzeile zeigt daraus „… sichert / ✓ gesichert / ⚠ nicht gesichert" (`ui/app.js`, `role="status"`, kein Klickziel, keine Animation; unter 380 px Breite Kurzform) |
| Fehler | Ein gescheiterter Schreibvorgang lässt `schmutzig` **stehen** (der nächste Versuch nimmt den Stand mit), füllt `SPEICHER.fehler` und meldet ihn über den Bus; der Entpreller fängt seine eigene Ablehnung ab. Vorher blieb ein voller Speicher stumm |
| Sicherung | `Spiel.SICHERUNG = "labor-sicherung"`, Inhalt `{v, zeit, stand}`. Angelegt **vor einer Migration** (`v < Spiel.VERSION`) und **vor einem Import** (`Spiel.sicherungAnlegen(roh, true)`); eine frische Sicherung bleibt `Spiel.SICHERUNG_FRISCH_MS = 60 s` unangetastet, damit die Migration nach dem Neuladen die Import-Sicherung nicht ersetzt |
| Import | `Spiel.importPruefen(d)`: fremdes Format (`format !== "netzwerk-labor"` oder fehlendes `speicher`) und **zu neue** Stände (`labor.v > Spiel.VERSION`) werden abgewiesen; **alte** Stände und Stände ganz ohne `v`-Feld sind erlaubt — die Migration holt sie herein. Geprüft wird die Schemaversion, nicht die Programmversion der Datei |
| Nicht im Stand | Laufzeit je Instanz (`Spiel._lz`: Verlauf, Startnetz, Ziele, `letzteArbeit`) und alles, was `ui/` nur anzeigt. Ein Neuladen holt den **Stand** zurück, nicht die Sitzung |

**Gemessen (06.10.2026, Edge headless, Einzeldatei-Fassung, 1366×768):** `Spiel.speichern()` 2010 → **1512 ms** bis zum Schreibvorgang, Netzwechsel 2415 → 1515 ms, Auftragsabschluss 2436 → **6,7 ms** (Gegenprobe des Prüfers: 22 ms), Kauf 3,8 ms (Prüfer: 24 ms), Verstecken der Seite 0 → 1 Schreibvorgang. Spielstand: **26.554 B** beim Start, 27.420 B nach einem Abschluss, 102.799 B bei 30 Postfach-Instanzen. Grenze: ein Prozess-Tod **ohne** `hidden`-Wechsel verliert die letzten ≤ 1500 ms.

## 8 · Plattform

```js
Plattform = { name:"tauri"|"browser", version,
  ladenSync() → { daten:Object|null, meldung:String|null },   // Tauri: window.__LABOR_SPEICHER__ (vom Rust-Initialisierungsskript gesetzt)
  speichern(daten) → Promise,                                 // Tauri: invoke("speichern", {json}) atomar + Sicherungen
  fenster:{ modus("leiste"|"voll"|"tray"), immerOben(b), position(ecke) },
  abzeichen(n, text),  benachrichtigen(text),  autostart(b) → Promise,
  datei:{ exportieren(name, text) → Promise, importieren() → Promise<String|null> },
  kann(funktion) → { ja, grund },   // "immerOben","tray","autostart","hotkey","leiste","klickdurch","vollbildErkennen","benachrichtigen"
  an(ereignis, fn) }                 // "tray-klick", "zweiter-start", "hotkey", "ruhe"
```

Rust-Befehle (Tauri `invoke`): `speichern{json}`, `fenster_modus{modus}`, `immer_oben{an}`, `abzeichen{n, text}`, `autostart{an}`, `autostart_status`, `exportieren{name, inhalt}`, `importieren`, `plattform_info` → `{os, sitzung:"x11"|"wayland"|"windows", kann:{…}}`.

## 9 · Oberfläche (`UI`)

- **Ein Fenster, zwei Ansichten**: `UI.modus("voll"|"leiste")`. Vollansicht: Kopfzeile (Euro, Ruf, Stufe, Postfach-Zähler) · Andock-Leiste links (Postfach · Labor · Kunden · Wiki · Lernstand · Shop) · Arbeitsfläche. Beim Wechsel zur Leiste wird das DOM der Vollansicht abgebaut.
- **Labor**: Geräteleiste · SVG-Fläche · Inspektor rechts · Simulation unten · Auftragsleiste oben (live ✓).
- Zeigerereignisse, kein HTML5-Drag-and-Drop. Farben immer mit Text/Symbol. `prefers-reduced-motion` respektieren. Hell- und Dunkelmodus.

### 9.1 Labor seit Ausbau 1.2 (Phase A „Aufräumen“)

- **Geräte-Fächer** (`ui/editor-fach.js`, Präfix `pa-`): `UI.KATEGORIEN = [{id, titel, kurz, typ, skin, taste, text}]` (endgeraete · server · netzwerk · aussen; Platz für drahtlos/zubehoer), jedes `UI.GERAETE`-Element trägt `kategorie` und `kurz`. Eine Kategorie öffnet ein Fach daneben, höchstens eins offen. Tasten: `1–4` Fach, im offenen Fach `1…n` Gerät, `Esc` zu. Zuletzt benutzt: `store "einst"` → `labor.zuletzt = [{typ, skin}]` (max. 3). Platzieren ist ein Zwischenwerkzeug: danach gilt wieder das Werkzeug davor.
- **Ebenen** sind ein Ansicht-Menü (`Umschalt+1…5`). `UI.ebenen.setzen(id, {merken})` – `merken:false` für Ticket-Vorgaben; `UI.ebenen.gemerkt()` (eigene Wahl, Freies Labor); `UI.ebenen.fuerSkills(skills)` → Standardansicht eines Tickets (erster Skill mit eigener Ebene, sonst `ip`).
- **`UI.labor.laden(netz, {titel, verlauf, auftrag, ebene?, ansichtMenue?, sandbox?})`**: `ebene` setzt die Ansicht ohne sie zu merken, `ansichtMenue:false` blendet das Menü aus (Einstiegsaufträge). Nach `laden` sind Inspektor und Simulation unsichtbar, bis zur ersten Auswahl bzw. ersten Aufzeichnung (die das Panel einmal öffnet). Neu: `UI.labor.einsetzen(typ, skin)` (Mitte der Fläche).
- **Auftragszeile + Auftragsmappe** (`ui/spiel.js`, Präfix `am-`): eine Zeile (Kunde · Titel · `Ziele x/y` · Auftrag lesen · Abnahme · ⋯), Mappe mit Reitern Brief/Ziele klappt beim ersten Öffnen einer Instanz einmal auf (nicht im Coach-Auftrag, nicht in der Prüfung). Hilfe steckt im „⋯“-Menü. **Genau ein `.primaer` je Zustand**: hat ein offenes Feld (Mappe, Hilfeleiter) einen eigenen Hauptknopf, verliert die Abnahme ihre Hervorhebung.
- **Eine Quelle für Hinweise**: Ein Element mit `data-hinweisquelle` in der Auftragszeile (Coach) schaltet den Werkzeug-Hinweis der Fläche stumm. Toasts: höchstens einer gleichzeitig; ein verdrängter Toast mit Aktion kommt einmal nach.
- **Lehrtexte auf Klick**: `UI.erklaeren(code, niveau)` (Präfix `ex-`) zeigt `DATEN.lehrtexte[code]` erst auf „Erklär mir das“, dann auf Wunsch ausführlicher (AP1 → E), zuletzt die Quelle.
- **Inspektor**: Reiter beginnen mit „Übersicht“; Terminal/Konsole ist ein Knopf im Kopf (`K.reiter = "konsole"` bleibt der interne Zustand, `UI.inspektor.reiter(c, "konsole")` gilt weiter).

### 9.2 Welle 1, Sitzung S1 „Sofortgefühl“ (Design – Spielspaß 2.0)

```js
Spiel.regeln(inst) → { niveau, warnungen:bool, liveHaken:bool, liveGrund:bool, versuchAbzug:0|0.5|1 }
  // Stufenregeln (Design § 6): E: Warnungen an, Haken mit Grund, Versuche frei
  //   AP1: Warnungen erst ab Hilfestufe 2, Haken ohne Grund, −½ ★ ab dem 2. Abnahmeversuch (einmalig)
  //   AP2: keine Warnungen, Haken erst bei der Abnahme, −1 ★ ab dem 2. Versuch (einmalig). Prüfung: wie AP2, ohne Abzug.
inst.abnahmen                     // Zahl der Abnahmeversuche (gab es schon); Spiel.abnahme zählt hoch
Spiel.szene(inst, abnahme) → [ { ziel, art:"druckt"|"seite"|"adresse"|"gesperrt"|"haken"|"sicherung",
                                  pfad:[geraeteId], von, ende:geraeteId, text } ]   // headless, aus der Trace der Abnahme
Spiel.geaenderteGeraete(inst) → [geraeteId]   // Diff gegen das Startnetz: Konfig, Strom, startup, Kabel, neu
Spiel.tonPegel(ton, {modus, fokus}) → 0..1    // "aus"→0; Leiste oder ohne Fokus → 0; "leise" 0.18, "normal" 0.4
store "einst".ton = "aus"|"leise"|"normal"    // Standard "leise" (Spiel.EINST_STANDARD)
Spiel.postfachZiel() → 2 | 3                  // bis zum 2. erledigten Auftrag zwei Angebote verschiedener Kunden (erste Wahl), dann 3
```

- **Funktionsprobe** (`ui/szene.js`, Präfix `sz-`): nach bestandener Abnahme 2–6 s im Labor – geänderte Geräte pulsieren, je Ziel (max. 4, AP1/AP2 max. 2) fährt ein Paket den Pfad, das Endgerät reagiert, der Kunde spricht an seinem Gerät. Überspringbar (Esc, Klick, Leertaste); bei reduzierter Bewegung eine Haken-Liste (1,2 s). Danach der Ergebnisdialog mit höchstens drei Blöcken (`.sp-block`): Sterne + Lohn · Dein Weg · Merke.
- **`UI.labor.laden(…, {warnungen: () => bool})`**: steuert die „!“-Warnungen auf der Fläche und im Inspektor (Kopf-Chip, Abschnitt Hinweise, gelbe Feldwarnungen). Ohne Angabe: an.
- **Spielgefühl**: `UI.juice(el, art)` setzt kurz die Klasse `jc-<art>` (nichts bei Bewegung „aus“); `UI.klang.spielen(name)` (`ui/klang.js`, WebAudio, keine Dateien) → `true`, wenn hörbar gespielt.
- **Bühne frei?** `UI.buehneFrei()` – Abzeichen, Kundenpost und Aufstiegsfeier warten, solange ein Dialog (`.sp-overlay`) oder die Funktionsprobe (`.sz-buehne`) läuft. `UI.toast.zu(id)` schließt eine Meldung. Einstieg: `UI.spiel.mess` = `{t0, ersteHandlung, erfolg}` (ms seit Seitenstart).

### 9.3 Welle 1, Sitzung S2 „Bogen“ (Hub, Tagesrätsel, Fehlerdex, Spieltagebuch)

Spielstand **`v:2`** (Migration: fehlende Felder bekommen ihren Standardwert, ein `v:1`-Stand lädt unverändert weiter).
*Aktueller Stand ist `v:3` — siehe § 13 (Feld `training`, 07.10.2026).*

```js
st.dex          = { [injektor]: { gesehen:"2026-10-04", verstanden:null|"2026-10-05" } }
                  // gesehen = Auftrag mit dieser Fehlerart bestanden; verstanden = bestanden ohne bezahlte Hilfe (Hilfestufe < 4).
                  // Erst beim Abschluss erfasst – ein offener Auftrag verrät seine Ursache nie über den Dex (R1).
st.tagesraetsel = { serie:0, [tag]: { nr, niveau, sterne, sek, hilfe, versuche, ziele:["g"|"y"|"w"], zeile } }
st.tagebuch     = [ { t, art:"sitzung", bis } | { t, art:"auftrag-ende", id, form, quelle, niveau, sek, sterne, hilfe, versuche, weiter:null|bool } ]  // höchstens 500
st.tag.aufwaermen = 0..n                                   // Mini-Karten im Aufwärmen heute
inst.zielErst   = [ versuchNr|null ]                       // je Ziel: in welchem Abnahmeversuch zuerst erfüllt (Spiel.abnahme)
inst.quelle     = … | "raetsel"                            // Tagesrätsel: nicht im Postfach, verfällt am Folgetag

Spiel.dex.liste() → [ {id, titel, gruppe, zustand:"unbekannt"|"gesehen"|"verstanden", ab:stufe, symptom, erkennen:[text], erklaerung, quelle, gesehen, verstanden} ]
Spiel.dex.gruppen() → [ {id, titel, ehrentitel, ids:[injektor], verstanden, gesamt, fertig} ]
Spiel.dex.erfassen(inst, def) → {neu:[{id, titel, zustand}], titel:[ehrentitel]}      // aus Spiel.abschliessen
Spiel.tagebuch.sitzung() · .auftragEnde(inst, def, abnahme) · .weiter() · .aktiv() · .auswertung() → Text (zum Kopieren)
Spiel.raetsel.nummer(tag) · .def(tag, niveau) · .heute() · .starten() → inst · .teilen(tag) → Text
Spiel.hub.stand() → { tag, serie:{tage, urlaub, frei, zurueck}, naechster, aufwaermen:{ziel, erledigt}, raetsel, post, tagesziel, feierabend:null|{bilanz, ausblick} }
Spiel.hub.serie(tageSet, heute) → { tage, urlaub, frei }   // Serie mit Urlaubstagen: 2 Tage je Kalenderwoche fehlen erlaubt
```

- **Tagesrätsel:** Fertigkeit und Netz hängen nur an Datum und Niveau: `Spiel.generiere(skill, seed, {stufe})` mit `skill = Zufall("raetsel:"+tag+":"+niveau).wahl(Spiel.RAETSEL.SKILLS[niveau])` und festem Seed je Tag/Niveau – alle in der Klasse bekommen dasselbe Netz, ohne Server. Nummer = Tage seit 01.10.2026 + 1. Teilen-Text verrät die Ursache nicht (🟩 erster Versuch, 🟨 späterer, ⬜ nicht erreicht – je Ziel).
- **Hub „Heute“** (`ui/hub.js`, Präfix `hb-`): Startansicht (außer im allerersten Auftrag). Datumszeile + Serie, eine Karte „Dein nächster Auftrag“ mit dem einzigen Hauptknopf, drei Kacheln (Aufwärmen · Tagesrätsel · Post bzw. Fehlerdex), nach dem Tagesziel Feierabend mit Bilanz und einem Ausblick auf morgen. Platzbudget: ≤ 40 Wörter, 1 Hauptknopf.
- **Fehlerdex** im Lernstand (Abschnitt `#dex`); **Spieltagebuch** zum Kopieren in Einstellungen und Lernstand. `UI.kopieren(text) → Promise<bool>` (Zwischenablage mit Rückfall).

### 9.4 Welle 2, Phase B „Netzplan, Dock, Akte, Verdacht“

```js
Spiel.plan.sollNetz(inst)      → Netz   // Startnetz + Referenzlösung = so soll es sein (Störung: gesund, Projekt: Ziel). Nie mit Fehler.
Spiel.plan.aus(netz, {art, verdeckt}) → Plan
Plan = { art:"netzplan"|"skizze"|"tabelle", breite, hoehe,
         knoten:[ {id, name, typ, skin, x, y, ebene, adressen:[{port, ip, maske, vlan}], zeigen:[text]} ],
         linien:[ {a:{id, port}, b:{id, port}, trunk:bool, vlan:null|n} ],
         netze:[ {cidr, vlan, geraete:[id]} ],
         tabelle:[ {id, name, port, ip, maske, gw, dns, vlan, dhcp:bool} ],   // verdeckte Felder = "?"
         verdeckt:[ {id, feld} ] }
Spiel.plan.art(inst) → "netzplan" (E) | "skizze" (AP1, Tabelle daneben) | "tabelle" (AP2, Gateway/DNS der Rechner verdeckt) | ticket.plan.art
Spiel.plan.fuer(inst) → Plan (gecacht je Instanz)
Spiel.plan.diff(a, b) → [ {geraet, pfad, soll, ist} | {geraet, kabel:"fehlt"|"zuviel", gegen} ]   // Konfig (running), Strom, VLAN-Datenbank, Kabel
Spiel.plan.abweichungen(inst) → [geraeteId]          // Plan ↔ Labor, für „Abweichungen markieren“ (kostet wie Hilfestufe 4)

inst.akte     = [ {n, t, art:"ping"|"trace"|"kabel"|"befehl"|"plan", von, nach, befund, schicht:null|1..7, grund:null|code, ok, wichtig:false} ]
Spiel.akte.ausPing(inst, {von, nach, ergebnis}) · .ausKabeltest(inst, {kabel, oben, grund}) · .stern(inst, n) · .liste(inst)
  // befund = was ein echtes Werkzeug zeigt („Zeitüberschreitung“, „Zielhost nicht erreichbar“); Grund/Schicht nur im Einstieg sichtbar
inst.verdacht = { schicht, ursache:injektor, geraet, t, vorEingriff:bool, treffer:null|"schicht"|"ursache"|"voll" }
Spiel.verdacht.optionen(inst) → { schichten:[{n, name, text}], ursachen:[{id, titel, schicht}] (4 Fehlerarten, eine richtig), geraete:[{id, name}] } | null
Spiel.verdacht.setzen(inst, {schicht, ursache, geraet}) · .bewerten(inst) → {treffer, gesetzt, vorEingriff, richtig:{ursache, schicht, geraete}, text}
  // Ursachen sind Fehlerarten (= Fehlerdex-Einträge), nicht Simulationsgründe: „Falsches Standardgateway“ statt „Gateway antwortet nicht“
  // E freiwillig (+10 % Lohn bei vollem Treffer vor dem Eingriff), AP1 ohne Verdacht −½ ★, AP2 −1 ★ (Spiel.regeln(inst).verdacht)
st.werkzeuge  = { kabeltester:bool, netzpruefer:bool }   // Shop „Werkzeuge“; inst.netzpruefer = true schaltet die „!“ im AP-Niveau zu
```

- **Dock** (`ui/editor.js`, Präfix `lb-dock`): ein Bereich rechts mit Reitern Inspektor · Simulation · Plan · Akte (Terminal folgt in C). Ein Reiter erscheint erst, wenn er Inhalt hat; ist keiner da, gibt es kein Dock (R5). Breite `clamp(260px, 40% − 72px, 440px)` der Laborbreite → die Fläche behält ≥ 60 %. Die Simulation liegt nicht mehr unten. `UI.labor.dock(reiter|null)`, `UI.labor.dockReiter(id, {titel, symbol, verfuegbar})`; `inspektor(zu)` und `simulation(zu)` gelten weiter.
- **Netzplan** (`ui/netzplan.js`, Präfix `np-`): Reiter „Plan“ im Dock und in der Auftragsmappe; Zeichnung automatisch in Ebenen ausgerichtet (Internet → Router/Firewall → Switches → Endgeräte), Schrift ≥ 14 px, Tabelle daneben. Klick auf ein Plan-Gerät hebt es im Labor hervor und wählt es.
- **Akte** (`ui/akte.js`, Präfix `ak-`): Reiter „Akte“ – Verdacht oben, darunter Beweiskarten (neueste zuerst, ★ markiert).

### 9.5 Welle 2, Phase C „Terminal“

```js
Modell.osVon(geraet) → "windows" | "linux" | "ios" | null     // pc → windows, server/nas → linux (geraet.os übersteuert), switch/router/firewall → ios
CLI.sitzung(netz, id, {verlauf, einstieg, tipps:"alle"|"fehler"|"keine"})   // Tipp-Zeilen: Einstieg alle, AP1 nur nach Fehlern, AP2 keine
CLI.eingabe(s, zeile) → { …, befund?:"eine Zeile für die Akte", ok?:bool }   // Diagnosebefehle (ipconfig, ping, nslookup, ip a, dig, systemctl status …)
CLI.host.*                                // gemeinsame Helfer (cli/host-terminal.js); Befehle: cli/host-windows.js, cli/host-linux.js
CLI.traceMerken(netz, trace)              // letzte Aufzeichnung je Netz – tcpdump zeigt sie
inst.befehle = [ {t, geraet, befehl, ok} ]                      // ausgeführte Terminalbefehle (für Zielart „befehl“, Abzeichen „Von unten nach oben“)
inst.antworten = { [ziel.id]: "eingetragener Wert" }             // Zielart „antwort“ (Eingabe in der Mappe)
```

**Arbeitsziele (C4, `spiel/arbeitsziele.js`):** Netzziele prüft die Simulation am Netz; Arbeitsziele prüfen, was der Spieler im Auftrag *getan* hat. `Sim.pruefeZiel` kennt sie nicht – nur `Spiel.zielPruefen(netz, ziel, inst)`.

```js
Ziel {typ:"befehl", geraet, muster:"^ipconfig( /all)?$", beispiel:"ipconfig", text}
     // erfüllt, wenn ein passender Befehl (Regex, ohne Groß/klein) im Auftrag auf dem Gerät fehlerfrei lief
Ziel {typ:"antwort", id:"ip", frage:"Welche IP-Adresse hat die Kasse?", pruefen:{art:"ip"|"maske"|"gw"|"dns"|"mac", geraet, port?:"eth0"}, text}
     // Soll kommt immer aus dem aktuellen Netz (Sim.adresse bzw. hw.macs) – nie aus dem Ticket; MAC in jeder Schreibweise
Spiel.istArbeitsziel(ziel) · Spiel.arbeitsziel(inst, ziel, netz?) → {ok, grund:null|"BEFEHL_FEHLT"|"ANTWORT_FEHLT"|"ANTWORT_FALSCH", text}
Spiel.antwortSoll(netz, ziel) → "192.168.1.10" | null · Spiel.antwortGleich(art, a, b) · Spiel.antwortSetzen(inst, ziel, wert) → Prüfergebnis (Bus „antwort“)
Spiel.arbeitszieleErfuellen(inst)            // Durchspiel-Test: Befehle aus ziel.beispiel im Terminal ausführen, Antworten aus dem Netz eintragen
Lösungsschritt {geraet, terminal:"netsh interface ip set address …", text}   // läuft in einer Terminal-Sitzung (Windows/Linux) auf dem Gerät
ticket.art = … | "terminal"                  // Terminal-Auftrag: Arbeitsziele + ggf. ein Netzziel; ohne Fehler im Netz erlaubt (nur Arbeitsziele)
```

- **Windows (cmd):** ipconfig (/all /release /renew /flushdns /displaydns) · ping (-n -l -t) · tracert · pathping · arp -a/-d · nslookup (auch interaktiv) · getmac · route print/add/delete · netstat -an · curl · telnet · netsh interface ip show config / set address … static|dhcp / set dns · hostname · whoami · systeminfo · type …\hosts · **powershell** (Test-NetConnection, Resolve-DnsName, Get-NetIPConfiguration).
- **Linux (bash):** ip a/r/link · sudo ip addr add|flush · sudo ip route add|replace|del default · sudo ip link set eth0 up|down · ping -c · traceroute · dig · nslookup · host · ss -tulpn · curl · cat /etc/resolv.conf|hosts|hostname · systemctl status|start|stop|restart|is-active (apache2, named, isc-dhcp-server, smbd, ssh, cups) · sudo tcpdump -n · hostnamectl · whoami.
- Ändern geht nur über netsh/route bzw. sudo ip/systemctl – immer über den Verlauf (Rückgängig). **Simulation:** Ist der eingetragene DNS-Server das Gerät selbst, antwortet der eigene Dienst lokal (Loopback) statt per ARP ins Leere.
- **Terminal im Dock** (`ui/terminal.js`, Präfix `tm-`): Reiter „Terminal“ mit einer Sitzung je Gerät (Reiterchen oben), Doppelklick auf ein Gerät oder Taste `T` öffnet sie; „Pakete ansehen ▸“ nach Befehlen mit Aufzeichnung; Diagnosebefehle legen Beweiskarten in die Akte (Bus `befehl`).

### 9.6 Welle 3, E1 „Formen, Wahl, Ereignisse, Provisorium“

**Auftragsformen** (`spiel/formen.js`): `Spiel.FORMEN[form] = {titel, sym, text}` für `stoerung`, `projekt`, `terminal`, `forensik` (Fernwartung: Netz unsichtbar, nur das Terminal eines Rechners), `audit` (Kundenplan prüfen), `beratung` (Adressplan rechnen), `hotline` (Rückfragen am Telefon, dann Störung). `Spiel.formVon(def)` → `def.form || def.art` (wartung → stoerung). Generierte Formen:

```js
inst.gen = {skill, seed, opts} | {form:"forensik"|"audit"|"beratung", seed, opts:{stufe, kunde}}
Spiel.generiereForm(form, seed, opts) → def      // deterministisch, id "form-<form>-<kunde>-<stufe|auto>-<seed>", registriert in Spiel.generierte
Spiel.risikoVon(def) → {stufe:1..3, text:"gering"|"mittel"|"hoch"}   // aus dem Niveau: Abzüge je Versuch (E 0, AP1 ½, AP2 1 ★)
```

**Neue Arbeitsziele** (wie `befehl`/`antwort`, geprüft mit `inst`):

```js
Ziel {typ:"tabelle", id, basis:"192.168.20.0/24", zeilen:[{name, hosts}], spalten:["netz","praefix","erster","letzter","broadcast"], text}
inst.tabelle  = { ["zeile.spalte"]: "Eingabe" }     // Soll aus den IP-Helfern (Spiel.beratung.soll(ziel)), Vergleich ohne Leerzeichen; Präfix „/26“ oder „26“
Ziel {typ:"audit", fehler:["id.feld"], text}        // die 1–3 Abweichungen im Kundenplan (def.kundenplan)
inst.audit    = ["id.feld", …]                       // markierte Zellen; erfüllt = alle gefunden, nichts Falsches markiert
def.kundenplan = Plan (wie Spiel.plan.aus) mit 1–3 geänderten Tabellenwerten
Ziel {typ:"notiz", min:20, text}                     // Änderungsnotiz für den Kunden (Variante „sauber“)
inst.notiz    = "…"
def.hotline   = { anruf:"…", max:3, fragen:[{id, text, antwort, wert:"gut"|"neutral"|"schlecht", warum}] }
inst.hotline  = { gefragt:[id], fertig:bool }       // Bewertung: gute Fragen → Ruf; Antworten als Karten in der Akte (art "hotline")
```

**Postfach als Wahl** (`spiel/mischer.js`): nach der Einstiegs-Wahl 3 Angebote (ab Stufe 2: 4), möglichst verschiedene Formen und Kunden. Je Form ist höchstens ein Angebot neu im Postfach; die Story-Reihenfolge der Handtickets bleibt je Form erhalten.

```js
Spiel.mischer.waehlen({kandidaten:[{form, kunde, gewicht, schluessel}], offen:[{form, kunde}], verlauf:[form], n, z}) → [kandidat]   // rein, ohne Ticketbau
Spiel.mischer.gesperrt(verlauf) → form|null          // die Form der letzten zwei Abschlüsse, wenn gleich
Spiel.postfach()                                     // gesperrte Form steht unten – der Hub schlägt sie nie als nächstes vor
st.erledigt[i].form                                  // Form jedes Abschlusses (Mischer, Tagebuch)
```

**Provisorium oder sauber?** (`spiel/varianten.js`): Handtickets mit Änderungen an IOS-Geräten (Liste `Spiel.VARIANTEN_TICKETS`) bieten beim ersten Öffnen eine Wahl. *Provisorium:* nur die Netzziele, kein Neustart-Test, Lohn × 0,6, Schuld → nach 3 weiteren Abschlüssen kommt der Folgeauftrag („Das Provisorium von neulich …“: dasselbe Netz, der Fehler ist nach einem Neustart zurück, Ziele + Sicherung). *Sauber:* Netzziele + „gespeichert“ je geändertem IOS-Gerät + Änderungsnotiz (`notiz`), Lohn × 1,2.

```js
inst.variante = null|"provisorium"|"sauber"          // ohne Wahl gelten die Grundziele
Spiel.varianten.fuer(def) → [{id, titel, text, lohnFaktor}] | null
Spiel.varianten.ziele(inst) → Ziele der gewählten Variante · Spiel.varianten.waehlen(inst, id)
st.schulden = [ {id, ticket, kunde, seit:erledigtAnzahl, faellig:erledigtAnzahl+3, folge:iid|null, erledigt:bool} ]
Folgeauftrag-id "<ticket>-folge" (Spiel.varianten.folgeDef(def))
```

**Ereignisse** (`spiel/ereignisse.js`, Einstellung `st.einst.ereignisse = "aus"|"selten"|"normal"`, Standard „selten“): höchstens eines je 15 (normal) bzw. 30 (selten) Minuten aktiver Zeit; deterministisch aus Spielstand-Seed und Zähler; jedes mit Erklärsatz; nie Fortschrittsverlust (Stufe, Aufträge, Kunden bleiben; Netzänderungen laufen über den Verlauf).

```js
Spiel.EREIGNISSE[id] = {titel, sym, bedingung(ctx) → bool, ausloesen(ctx) → {text, warum, aktion?}}
   // stromausfall (offener Auftrag mit IOS-Gerät: alle IOS-Geräte neu starten – nur Gespeichertes bleibt), kabelschaden,
   // provider (Internet beim Kunden aus, bis „Provider anrufen“), praktikant (zweiter kleiner Fehler), weiterempfehlung (neuer Kunde
   // bietet einen Auftrag an), notfall (Notfall-Auftrag mit Frist – du wählst die Reihenfolge)
st.ereignisse = { aktivMs, letzteMs, n, liste:[{t, id, kunde, text}] }
Spiel.ereignisse.tick(ms) → Ereignis|null · .ausloesen(id, ctx) (Tests) · .aktivZaehlen(ms)
```

### 9.7 Welle 3, E2 „Kundenakte und Kompetenzkarte“

**Kundenakte** (`spiel/kundenakte.js`, Oberfläche in der Ansicht „Kunden“, Präfix `ka-`):

```js
st.kundenakte = { [kunde]: { punkte:0, atlas:[geraeteId], kapitel:0..3, gelesen:[nr], antworten:{[nr]: index} } }
Spiel.kundenakte.daten(kunde) · .vertrauen(kunde) → 1..5          // aus Punkten: ★ ≥ 4,5 +1 · „sauber“ +1 · Notfall rechtzeitig +1 · Provisorium 0
Spiel.kundenakte.atlasNetz(kunde) → Netz                           // das dokumentierte Netz des Kunden (Vorlage mit festem Seed) für den Plan-Erzeuger
Spiel.kundenakte.atlas(kunde) → {plan, hell:[id], gesamt, komplett}  // Geräte leuchten, an denen man gearbeitet hat (geändert oder geprüft)
Spiel.kundenakte.nachAbschluss(inst, def, abnahme, {geaendert, variante}) → {neuHell:[id], vertrauen:{vorher, nachher}, kapitel:nr|null}
Spiel.kundenakte.kapitel(kunde) → [{nr, titel, frei:bool, ab:vertrauen, gelesen}] · .lesen(kunde, nr) · .antworten(kunde, nr, i) → {richtig, erklaerung}
Spiel.kundenakte.baustellen(kunde) → offene Schulden (Provisorium, Folgeauftrag noch nicht erledigt)
DATEN.geschichten[kunde] = [ {nr:1..3, ab:2..4, titel, text, senior, frage:{text, optionen, richtig, erklaerung}, quelle} ]
```

Kapitel 1 öffnet bei Vertrauen 2, Kapitel 2 bei 3, Kapitel 3 bei 4. Jedes Kapitel: kurze Szene beim Kunden mit kleiner Wendung, ein Satz des Seniors (Haltung: Gegenfrage statt Lösung, trocken-warm), eine Frage mit Erklärung, Quelle für die fachliche Aussage.

**Kompetenzkarte** (`spiel/kompetenz.js`, im Lernstand statt der Fertigkeiten-Liste, Präfix `kk-`):

```js
Spiel.KOMPETENZ_REGIONEN = [ {id, titel, skills:[id…]} ]          // 6 Regionen, zusammen genau die 27 Fertigkeiten aus DATEN.skills
Spiel.kompetenz.karte() → { regionen:[{id, titel, felder:[{id, name, zustand, box, nachbarn:[id]}]}], sichtbar, gesamt:27 }
   // zustand: "nebel" (weder geübt noch neben einem geübten Feld noch freigeschaltet) | "offen" | Lernmotor-Stufe („angefangen“ … „gemeistert ★“)
```

### 9.8 Auftrag P „Politur und Bindung“ (Design – Spielspaß 2.0, § 20/§ 21)

**Erste Stunde** (`spiel/erstestunde.js`, § 20 F3): Ein neuer Spielstand bekommt statt Zufall eine gestaltete Folge der ersten sechs Aufträge; danach füllt der Mischer.

```js
Spiel.ERSTE_STUNDE = [ {id:"kabel", ticket:"salon-01"}, {id:"stoerung", ticket:"salon-02"}, {id:"hotline", ticket:"salon-hotline", klingelt:true},
                       {id:"fernwartung", form:"forensik", opts:{kunde:"salon"}}, {id:"variante", ticket:"salon-05"},
                       {id:"empfehlung", form:"audit", ereignis:"weiterempfehlung", opts:{kunde:"baeckerei"}} ]
st.ersteStunde = { fertig:bool, ereignis:bool }      // nur ein NEUER Stand beginnt mit fertig:false (Spiel.ergaenzer.ersteStunde);
                                                     // fehlt das Feld (alter Stand, Tests mit leererStand): vorbei
inst.kuratiert = 1..6 · inst.kuratiertId = "hotline" … · inst.klingelt = true   // Postfach-Reihenfolge, Anruf
Spiel.ersteStunde.aktiv() · .auffuellen() → [inst] · .ruhig() · .abholen() → Karte|null · .stand() → {aktiv, geschafft, gesamt, naechster}
ergebnis.ereignis = {id:"anruf"|"weiterempfehlung", sym, titel, text, warum?, aktion:"abheben"|"neu", iid}   // Spiel.abschliessen
Spiel.ereignisse.ausloesen(id, {inst?, form?, kunde?, stufe?})   // ohne inst gilt der offene Auftrag; form/kunde/stufe sind Wünsche
```

- `Spiel.postfachAuffuellen` legt während der ersten Stunde die **nächsten zwei offenen Schritte** bereit (die Reihenfolge bleibt eine Wahl) und ruft weder Mischer noch Geschichtsreihe. Die Weiterempfehlung löst aus, sobald sie einer der nächsten zwei Schritte ist (nach dem vierten Abschluss) und bringt den Plan-Audit; zufällige Ereignisse ruhen bis dahin (`ruhig()`). Fehlen die Aufträge der Folge (andere Daten, Testtickets), gilt die erste Stunde als vorbei.
- `Spiel.postfach()` sortiert nach Frist, dann `kuratiert`, dann wie bisher. Der Hub zeigt einen klingelnden Anruf als Hauptkarte („Mira Kaya ruft an“, „Rangehen ▸“).
- Oberfläche: `UI.ereignisse.vormerken(e)` zeigt die Karte, sobald kein Dialog und keine Funktionsprobe mehr läuft (Anruf mit grünem „Rangehen ▸“ und Klang `klingeln`, Weiterempfehlung mit „Ansehen ▸“ → `UI.spiel.imPostfach(iid)`); Postfach-Karte mit Marke „☎ klingelt“.

**Probe je Form** (`spiel/szene.js` + `ui/szene.js`, § 20 F4): eigene, höchstens rund 3 s lange Funktionsprobe für die neuen Formen, überspringbar wie die Paket-Szene.

```js
Spiel.szeneForm(inst) → null (Störung, Projekt, Terminal: Paket-Szene genügt)
  | {art:"hotline", person, symbol, farbe, satz, minuten}          // Hörer wird aufgelegt, Dank, Gesprächsdauer (statt Sprechblase)
  | {art:"fernwartung", geraet, name}                              // Sitzungsfenster: ✓ auf dem Bildschirm, „Verbindung getrennt“, „online ✓“ – dann das Netz
  | {art:"audit", kunde, korrigiert, tag}                          // Stempel „GEPRÜFT ✓“ mit Datum auf der Skizze des Netzes
  | {art:"adressplan", basis, bereiche:[{name, netz, praefix, links, breite}]}   // Bereiche leuchten nacheinander im Adressraum (Prozent)
UI.szene.abspielen(zeilen, {…, form, aufdecken})   // Hotline/Fernwartung: höchstens 1 Paketweg; Audit/Adressplan: keine Paketfahrt
UI.labor.fernFertig()                               // Sitzungsfenster in den Zustand „getrennt“; aufdecken() hebt die Fernwartung auf (auch beim Überspringen)
```

**Vertrauen zahlt aus** (`spiel/kundenakte.js`, § 20 F5 – R4 „jede Belohnung öffnet etwas“):

```js
Spiel.VERTRAUEN_LOHN = {empfehlung:3, rabatt:4, rabattAnteil:0.2}
st.empfehlungen = { [kunde]: {von, tag} }           // durch Empfehlung eine Stufe früher offen
st.kundenakte[kunde].empfohlen = true                // dieser Kunde hat seine (einmalige) Empfehlung ausgesprochen
inst.empfehlung = "salon"                           // Auftrag, den eine Empfehlung gebracht hat
Spiel.kundenakte.empfehlen(von) → Karte {id:"empfehlung", sym, titel, text, warum, aktion:"neu", iid, kunde, von, neu}
Spiel.kundenakte.empfohlen(id) · .rabatt(kunde) → 0|0.2 (ohne Nebenwirkung) · .belohnungen(kunde) → [{ab, art, da, text}]
Spiel.kundenakte.nachAbschluss(…) → {…, empfehlung:Karte|null, rabatt:bool}
Spiel.karriere.kunde(id) → {…, vertragPreisVoll, vertragRabatt, vertragPreis (mit Rabatt)}
Spiel.karriere.kundeOffen(id)                       // empfohlen: Ruf der Stufe davor genügt
ergebnis.karten = [Ereignis der ersten Stunde, Empfehlung]   // UI.ereignisse.vormerken – nacheinander, nie zwei auf einmal
Spiel.hub.ausblick()                                // „Morgen: …“ Folgeauftrag → Notfall → Kapitel (eine saubere Arbeit entfernt) → Postfach → Fertigkeit → Rätsel
```

- Ab Vertrauen 3 empfiehlt der Kunde einmal weiter: Der nächste noch verschlossene Kunde kommt eine Stufe früher und schickt sofort einen generierten Auftrag; sind alle offen, kommt ein Auftrag des Kunden mit den wenigsten Abschlüssen. In der ersten Stunde wartet die Empfehlung, bis die Folge durch ist. Der Mischer nimmt empfohlene Kunden eine Stufe früher in die Generatoren auf.
- Ab Vertrauen 4 kostet der Wartungsvertrag bei diesem Kunden 20 % weniger (Shop-Eintrag, Kauf, Kundenkarte).

**Flow-Regler** (`spiel/flow.js`, § 20 F6 / Hebel 12):

```js
Spiel.FLOW = {GERUEST_NACH:2, VERWICKLUNG_NACH:3, MERKEN:5}
st.flow = { [skill]: {letzte:["f"|"n"|"g"], stand:"normal"|"geruest"|"verwicklung"} }
einst.anpassung = "auto" (Standard) | "manuell"
inst.flow = "geruest"|"verwicklung"|null            // beim Erstellen festgehalten (Hauptfertigkeit def.skills[0])
Spiel.flow.bewerten(inst, sterne) → "f" (bezahlte Hilfe ≥ Stufe 4 oder ≥ 2 Abnahmen) | "g" (5 ★, erste Abnahme, Senior nicht gefragt) | "n"
Spiel.flow.merken(skill, art) · .fuer(def) · .anpassen(gen, def, stand) → {gen, def}|null · .nachAbschluss(inst, def, {sterne}) → {skill, vorher, stand, art}
Spiel.generiere(skill, seed, {…, flow})              // "geruest": ein Niveau tiefer, ein Ziel · "verwicklung": zweiter Injektor, der ein weiteres Ziel bricht
Spiel.regeln(inst) → {…, flow}                       // Gerüst: Warnungen, Haken, Grund wie im Einstieg, kein Versuchsabzug · Verwicklung: keine Warnungen
ergebnis.flow                                         // Zeile im Ergebnis, wenn sich der Stand ändert
```

- `Spiel.instanzErstellen` hält `inst.flow` fest und baut Generiertes neu: Formen ein Niveau tiefer/höher (`gen.opts.stufe`, z. B. Plan-Audit 1 statt 2 Fehler), Störungen über `gen.opts.flow` – beides steht in `gen.opts`, das Neuladen baut dieselbe Fassung. Handgeschriebene Aufträge ändern nur Begleitung (Tipp, Regeln), nie ihren Fehler.
- Oberfläche: Gerüst – die Frage des Seniors steht in Brief und Zielen der Mappe; Marken „🧭 mit Gerüst“ / „🔥 kniffliger“ im Postfach; Verwicklung – kein Hilfsangebot des Seniors (`Spiel.seniorFaellig`). Einstellung „Anpassung“ unter Darstellung.

**Hub-Wahl und Wochenziel** (`spiel/hub.js`, `spiel/woche.js`, § 20 F7):

```js
Spiel.hub.weitere(n=2) → [{iid, titel (≤ 3 Wörter + „…“), voll, form, klingelt}]   // neben der Hauptkarte; Spiel.hub.stand().weitere
Spiel.WOCHENZIELE = [ {id, text, kurz, soll, ist(st, montag)} ]                  // dex · ohneHilfe · formen · raetsel · glanz
st.wochenziel = {woche:"2026-10-05" (Montag), id, erreicht}                      // gilt nur in dieser Kalenderwoche
Spiel.woche.vorschlaege() → 3 (Seed = Montag, für alle gleich) · .waehlen(id) · .stand() → {…, ist, soll, erreicht}|null · .pruefen() → {text, ruf:1}|null
ergebnis.woche                                                                     // „🎯 Wochenziel geschafft: … · +1 Ruf“
```

Der Hub bleibt bei einem Hauptknopf und ≤ 40 Wörtern: „oder:“ mit zwei kleinen Zeilen (Formsymbol + Titelanfang), Fußzeile „Heute 1/3 · Woche 0/3 Rätsel“ bzw. „Wochenziel wählen“ (Dialog mit drei Vorschlägen und „Später“).

**Rauchtest der Oberfläche** (`tools/rauch.py`, § 20 F8): siehe § 2.

---

## 10 · DHCP-Tiefe (D1 aus `Plan – Ausbau 1.2.md`) — verbindlicher Vertrag

*Festgelegt 05.10.2026 vor der ersten Zeile Code. Datenformen zuerst hier, dann im Code (Leitplanke 1).*

**Regressionsschutz zuerst:** `tools/sim-stand.js` friert die Ereignisse der Simulation ein (`Nachweise/sim-stand.json`). Nach **jeder** Änderung an `src/sim/` und `src/modell/` laufen lassen:
`node tools/sim-stand.js` → muss „Simulation unverändert" melden, außer der Änderungsteil ist gewollt und im Bericht benannt. Zusätzlich bleiben die 207 Tests grün.

### 10.1 Konfiguration (`geraet.running`, wandert in den Spielstand) — ERWEITERT

```js
/* Router/Firewall als DHCP-Server: running.dhcp */
dhcp = {
  an: false,                       // NEU: Server an/aus (bisher immer an, sobald Pools existieren)
  pools: [{
    name, netz, maske, gw, dns,    // vorhanden
    start: "", anzahl: 50,         // NEU beim Router (Host kennt sie schon) – wie host.js
    domain: "",                    // NEU: Option 15
    leaseS: 86400,                 // NEU: Lease-Dauer in Sekunden; 0/fehlend = Sim.T.LEASE
    reservierungen: [              // NEU: feste Zuordnung MAC → IP
      { mac:"02:00:...", ip:"192.168.10.20", name:"drucker" }
    ]
  }],
  ausgeschlossen: [{von, bis}],    // vorhanden
}
/* Host (pc/server/nas) als DHCP-Server: running.dienste.dhcp – bekommt dieselben Pool-Felder
   (start, anzahl, domain, leaseS, reservierungen). `ausgeschlossen` gilt auch hier (heute nicht). */
/* Switch: running.snooping */
snooping = { an:false, vertraut:["Gi0/1"] }   // NEU: DHCP-Snooping, vertraute Ports (Richtung Server)
```

**Einheitlichkeit ist Pflicht:** Ein Router-Pool und ein Host-Pool haben dieselbe Form. Die heute unterschiedliche Feldliste (Router ohne `start`/`anzahl`, Host ohne `ausgeschlossen`) wird zusammengeführt. Fehlende Felder werden **defensiv** gelesen (Standard), damit alte Spielstände laden.

### 10.2 Laufzeit (`netz.zustand[id]`) — ERWEITERT

```js
leases: { [ip]: { mac, bis, t1, t2, hostname, abgelaufen:false } }   // t1/t2 NEU (ms), abgelaufen NEU
dhcp:   { [port]: { ip, maske, gw, dns, server, bis, t1, t2, domain } }  // t1/t2/domain NEU (Client-Sicht)
snooping: { [port]: { verworfen:0 } }                                 // NEU: Zähler je Switch-Port
```
`t1 = bis - leaseDauer/2` (Erneuerung bei 50 %), `t2 = bis - leaseDauer/8` (Rebind, nur Anzeige). Alte Leases ohne `t1/t2` werden als „kein T1 bekannt" behandelt, nicht als Fehler.

### 10.3 Verhalten (Simulation)

1. **Ablauf in virtueller Zeit.** Ist `L.t > l.bis`, gilt die Lease als abgelaufen: `Sim.adresse` liefert `quelle:"keine"`, und der nächste `Sim.ping`/`Sim.dhcp` holt neu (bestehendes `brauchtDhcp`). **Kein** neues Ereignis, kein Timer, keine neue `art` – der Ablauf wird beim Zugriff festgestellt, nicht nebenher. Damit bleibt der Trace für bestehende Läufe unverändert.
2. **Erneuerung bei 50 %.** `dhcpHolen` unterscheidet: gültige Lease vorhanden und `L.t >= t1` → **Renew** (Unicast Request an den Server, danach Ack; Typ `request`/`ack` wie bisher, damit die Feldmenge `["discover","offer","request","ack"]` erhalten bleibt). Sonst wie heute Discover.
3. **Reservierung.** Passt die Client-MAC auf einen Eintrag, wird **diese** IP angeboten (auch wenn sie außerhalb `start..anzahl` liegt), aber nur, wenn sie frei ist. Nicht freie Reservierung → kein Angebot, Grund `DHCP_RESERVED_BUSY`.
4. **Optionen.** Der Ack trägt zusätzlich `domain` (Option 15). `leaseS` kommt aus dem Pool.
5. **Adresskonflikt.** Vor dem Angebot prüft der Server die Adresse gegen alle Geräte und fremden Leases; ist sie doppelt belegt → nächste Adresse, und der Konflikt wird vermerkt: `leases[ip].konflikt = true` mit Zeitpunkt. `show ip dhcp conflict` gibt diese Zeilen aus (heute feste Kopfzeile ohne Daten).
6. **Rogue-DHCP.** Ein zweiter DHCP-Server im selben LAN ist erlaubt; der Client nimmt das **erste** Angebot. Der fremde Server kann ein falsches Gateway/DNS verteilen. Erkennbar an `show ip dhcp binding` (unbekannte MAC) und am Symptom „falsches Gateway". Neuer Grund `DHCP_ROGUE_OFFER` (Schicht 7) für den Fall, dass ein Angebot von einem nicht vorgesehenen Server kommt und der Client es annimmt.
7. **DHCP-Snooping.** Am Switch mit `snooping.an`: DHCP-**Server**-Nachrichten (UDP 67 → 68, Offer/Ack) von einem **nicht vertrauten** Port werden verworfen; der Zähler steigt, der Client bekommt kein Angebot. Neuer Grund `DHCP_SNOOPING_BLOCKED` (Schicht 2). Client-Nachrichten (Discover/Request, Port 68 → 67) sind immer erlaubt.

### 10.4 Neue Gründe (Codes) — genau diese fünf, keine weiteren

| Code | Titel | Schicht | Ausgelöst wenn |
|---|---|---|---|
| `DHCP_LEASE_EXPIRED` | DHCP-Lease abgelaufen | 7 | `L.t > l.bis` **und** kein neues Angebot: die Lease ist abgelaufen und der Client bekommt in diesem Lauf keine neue |
| `DHCP_RESERVED_BUSY` | Reservierte Adresse belegt | 7 | Die Reservierung (MAC → IP) zeigt auf eine nicht freie Adresse (vergeben, doppelt belegt oder Gateway). Der Server lehnt ab und gibt **kein** Angebot — auch nicht aus dem freien Bereich |
| `DHCP_ROGUE_OFFER` | Angebot von fremdem DHCP-Server | 7 | Client nimmt ein Angebot eines unerwarteten Servers |
| `DHCP_SNOOPING_BLOCKED` | DHCP-Snooping blockiert | 2 | Server-Antwort an einem nicht vertrauten Switch-Port |
| `DHCP_CONFLICT` | Adresskonflikt im Pool | 7 | Der Server prüft eine Adresse vor der Vergabe und findet sie auf **mehr als einem** Gerät; er überspringt sie und nennt diesen Grund. Bleibt dadurch keine Adresse frei, bleibt es bei DIESEM Grund — nicht bei `DHCP_POOL_EMPTY` |

**Vorrang, wenn mehrere zutreffen** (der erste zutreffende gewinnt, in der Reihenfolge ihres Auftretens in der Trace):
1. `DHCP_RESERVED_BUSY` — die Reservierung schlägt den Bereich, also auch dessen Gründe
2. `DHCP_CONFLICT` — der Server hat eine doppelt belegte Adresse gefunden
3. `DHCP_POOL_EMPTY` — der Pool ist erschöpft, ohne dass ein Konflikt im Spiel war
4. `DHCP_LEASE_EXPIRED` — sonst: keine gültige Lease mehr und kein neues Angebot
5. `DHCP_NO_OFFER` — sonst (kein Server, kein Pool für das Netz, keine Antwort)

**Zwei Genauigkeiten, die beim Lesen der Trace helfen** (umgesetzt 06.10.2026, belegt durch `tests/sim-dhcp-gruende.test.js`, `tools/sim-stand.js` unverändert):
- Der Client wiederholt den Discover bis zu 3×. Ein Grund des Servers steht deshalb einmal **je Versuch** in der Trace (im Referenzstand gilt das schon für `DHCP_POOL_EMPTY`, 4×). Das Ergebnis `grund` des Aufrufs ist genau einer.
- `DHCP_CONFLICT` steht auch dann in der Trace, wenn danach noch eine andere Adresse vergeben wird — der Vertrag knüpft den Grund an das FINDEN, nicht an das Scheitern. Tickets, die den Konflikt als Fehler werten, prüfen deshalb zusätzlich `ok=false`.
- Vor dem 06.10.2026 gab die Simulation diese drei Codes **nie** aus, obwohl sie hier standen: eine belegte Reservierung bekam still eine andere Adresse, ein Adresskonflikt erschien als `DHCP_POOL_EMPTY`, eine abgelaufene Lease als `DHCP_NO_OFFER`. Drei fertige Lehrtexte in `DATEN.lehrtexte` waren dadurch im Spiel unerreichbar.

Jeder Code braucht: Eintrag in `Sim.GRUENDE`, Lehrtext in drei Tiefen in `DATEN.lehrtexte` **mit Quelle** (RFC 2131/2132, „IOS-ähnlich" kennzeichnen, wo es kein echtes Vorbild gibt), Injektor in `spiel/injektoren.js`, mindestens ein Ticket je Stufe, und Aufnahme in die Grundcode-Liste in `tests/sim-gruende.test.js` (sonst rot).

### 10.5 Trace — unverändert im Format

Keine neue `art`, kein neues Feld im Ereignisobjekt. `tests/sim-gruende.test.js` prüft die Schlüsselmenge eines Ereignisses **exakt** (Zeile ~244) und führt `ARTEN`/`PROTOS` als geschlossene Listen. Neue DHCP-Nachrichten (Renew) nutzen die vorhandenen Typen `request`/`ack`; neue `app.felder` sind erlaubt (sie erscheinen in der PDU-Ansicht und sind dort gewollt).

### 10.6 Oberfläche und Konsole

- **Lease-Tabelle** (neu, `ui/inspektor.js`, Router- und Server-Reiter „NAT/DHCP" bzw. „Dienste"): Gerät · IP · MAC · Restlaufzeit · Zustand (aktiv/abgelaufen/reserviert). Quelle ist `Sim.leases(netz, id)` – heute vorhanden, aber von keiner UI benutzt.
- **Pool-Formular** um `start`, `anzahl`, `domain`, `leaseS`, `reservierungen` erweitern (Router **und** Host gleich).
- **Switch-Reiter**: Schalter „DHCP-Snooping" und die vertrauten Ports.
- `show ip dhcp binding|pool|conflict` gilt **auch auf Server-Hosts** (heute nur Router), `binding` zeigt Restzeit und Zustand, `conflict` die echten Konflikte, `pool` rechnet `start`/`anzahl` und Ausschlüsse korrekt (heute „ganzes Subnetz").
- Windows `ipconfig /all`: Lease erhalten/erstellt/ablauf (aus `t1/t2/bis`), DHCP-Server. Linux: `dhclient` und `ip a` mit echter Restlaufzeit (heute fest `86234sec`).
- IOS-Poolmodus: `lease`, `domain-name`, `network`, `default-router`, `dns-server`, `host`/`hardware-address` (Reservierung).

### 10.7 Definition „fertig" (neun Punkte aus Phase D)

① Architektur (dieser Abschnitt) ② Sim-Verhalten + Gründe ③ CLI (IOS *und* Host) ④ Oberfläche ⑤ Lehrtext E/AP1/AP2 mit Quelle ⑥ 3–5 Fehlerinjektoren ⑦ mindestens ein Ticket je Stufe, automatisch validiert ⑧ Tests ⑨ Wiki-Eintrag + Skill im Lernmotor. Fehlt einer, gilt D1 als nicht eingebaut.

### 10.8 Arbeitsteilung (Schreibrechte, damit sich niemand überschreibt)

| Wer | Dateien (nur diese) |
|---|---|
| Simulation | `src/modell/**`, `src/sim/**` |
| Konsole | `src/cli/**` |
| Oberfläche | `src/ui/**`, `src/stil/**` |
| Inhalte | `src/daten/**`, `src/spiel/**` |
| Lead | `Architektur.md`, `bauen.py`, `tools/**`, Tests, Commits |

Änderungen an einer fremden Datei gehen über den Lead. Kein Mitglied committet selbst.

### 10.9 Stand der Umsetzung (05.10.2026, abends nachgetragen)

| Punkt aus § 10.7 | Stand |
|---|---|
| ① Vertrag | fertig (dieser Abschnitt) |
| ② Sim-Verhalten und Gründe | **fertig** – alle sieben Punkte aus § 10.3 gebaut, fünf Grundcodes angelegt und ausgelöst (`src/sim/`) |
| ③ Konsole | **fertig** – `show ip dhcp binding\|pool\|conflict` auch auf Server-Hosts, `lease`, `domain-name`, `hardware-address`; der Pool-Modus war bis 05.10. wirkungslos (siehe unten) |
| ④ Oberfläche | **offen** – Lease-Tabelle, erweiterte Pool-Felder und Snooping-Schalter fehlen |
| ⑤ Lehrtexte | **fertig** – drei Tiefen mit Quelle je Code (`src/daten/lehrtexte.js`) |
| ⑥ Fehlerinjektoren | **offen** |
| ⑦ Tickets je Stufe | **offen** |
| ⑧ Tests | **teilweise** – sieben neue Fälle in `tests/sim-gruende.test.js`, ein Regressionsfall für den Pool-Modus in `tests/cli-ios-ssh.test.js`; 213 grün |
| ⑨ Wiki + Lernmotor-Skill | **offen** |

**Nachtrag 05.10.2026, 19:40 – Lauf im echten Programm:** `Programm/Netzwerk-Labor.exe` startet wieder. Ursache der Blockade war das Integritätslabel „Niedrig" des Vaults (nicht WebView2, kein Windows-Neustart nötig); Reparatur und Messwerte in `Design – Spielspaß 2.0.md` § 27, Beweise in `Nachweise/1.2-Start/BEFUND.md`. Die Punkte ④–⑨ bleiben wie sie sind; alle Prüfungen, die bisher nur im Rauchtest liefen, sind ab jetzt im echten Programm möglich.

**Wichtiger Befund zur Konsole:** Der gesamte DHCP-Pool-Modus war wirkungslos. Jeder Handler las den Zustand in einen
Klon, änderte den Klon und schrieb danach erneut einen frischen Klon zurück — also den unveränderten Stand. Dazu fehlte
den Positionsargumenten das `n`, sodass die Werte nicht einmal in `a` landeten. Aufgefallen ist das nie, weil der
vorhandene Test nur den **Prompt** prüfte, nicht die Wirkung. Behoben mit `dhcpArbeiten()` (einmal lesen, ändern,
einmal schreiben) und einem Test, der den Zustand nach jedem Befehl prüft.

**Noch offen in der Konsole:** `ip address` im Reservierungs-Untermodus wird nicht erkannt (der `ip`-Zweig am
Konfigurationsmodus fängt es ab). Die reservierte IP ist über die Datenform und den Oberflächen-Inspektor setzbar.

**Lauf im echten Programm:** wieder möglich (gemessen 05.10.2026, 19:26). `Programm/Netzwerk-Labor.exe` startet mit
Standardprofil, Fenster „Netzwerk-Labor“, 0 Abstürze der WebView2-Laufzeit. Die frühere Blockade kam vom
Integritätslabel „Niedrig“ des Vaults (Überrest der Werkzeug-Sandbox), nicht vom Programm; Einzelheiten und Beweise
in `Nachweise/1.2-Start/BEFUND.md`, Reparatur wiederholbar über `Programm/Integritaet-reparieren.cmd`.
`tools/q-echt.py` ist für den Lauf fertig; die Bilder gehören nach `Nachweise/1.2-Q/`.
**Regressionsschutz:** `node tools/sim-stand.js` vergleicht die Simulation gegen `Nachweise/sim-stand.json`
(12 Szenarien, 403 Ereignisse) und meldet jede Abweichung mit Stelle und Art. Nach jeder Änderung an `src/sim/`
oder `src/modell/` laufen lassen — zusammen mit `node tests/run.js`.
**Betriebsregeln und Werkzeuge (Auftrag R, Schritt 1, 05.10.2026):** Die verbindlichen Regeln für jede weitere Arbeit
stehen in `AGENTS.md` im Projektordner. Kurz: keine Prozesse nach Namen beenden (nur eigene PIDs), kein Push, kein
Zweigwechsel, keine Dateien außerhalb des Projekts ändern, nichts behaupten, was nicht gemessen ist. Dazu die
Zeilenenden-Regel (`git ls-files --eol`, danach `git diff --stat` gegen `--ignore-cr-at-eol`) und „senkrechter Schnitt
vor Breite“.

Die **Simulations-Referenz liegt versioniert** in `tests/sim-stand.json` (vorher `Nachweise/`, das nicht im Git liegt –
Befund M3). `node tools/sim-stand.js` vergleicht gegen diese Datei. Die **Zeilenenden** sind über `.gitattributes`
(`* text=auto eol=lf`, Binärdateien ausgenommen) vereinheitlicht.

**Betriebsbefund (Design § 25) – überholt:** `python tools/q-echt.py` startet die `.exe` wieder. Der Befund
`failed to create webview`, `HRESULT(0x800700AA)` (16:11:40 und 16:14:18) hatte als Ursache das Integritätslabel
„Niedrig“ des Vaults; ein Windows-Neustart war nie nötig (gemessen 05.10.2026, 19:26–19:35).
Beweise: `Nachweise/1.2-Start/BEFUND.md`.

## 11 · Tiefe Menüebenen und Bau (06.10.2026) — Vertrag für die Anpassungsschicht

Neu gefasst nach einer Sitzung, in der ein Expertenteam die Oberfläche in einem echten Browser
und im echten WebView2-Fenster vermessen hat. Die Zahlen stehen in `CHANGELOG.md` (Abschnitt
1.2.2), in `android/LIESMICH.md` (Nachtrag) und in `Nachweise/experten/`; hier steht **was gilt**.

### 11.1 Menüplatzierung: in zwei Durchgängen messen

`UI.menue(x, y, eintraege, {oben})` und `UI.menue.popover(...)` hängen das Element an `document.body`
und klemmen `left`/`top` gegen `innerWidth`/`innerHeight` (Rand 6 px). **Vertrag:** Gemessen wird
mit der Klasse `.nl-messend` (`animation:none; visibility:hidden`) — **nicht** mit `hidden`
(`display:none`) und **nicht** mit laufender Einblend-Animation.

- `display:none` liefert für jedes Rechteck 0. Die Klemmung rechnet dann mit Höhe 0, und ein
  26-zeiliges Menü lief 506 px aus dem Fenster (selbst gemessen 06.10.2026; der erste, verworfene
  Versuch dieser Reparatur).
- Die Animation `menue-auf` beginnt mit `scale(.98)` und verschiebt das Rechteck — gemessen würde
  die Klemmung 2 % zu klein rechnen.
- **Vorher** (bis 06.10.2026) wurde ohne Messklasse gerechnet; ein Port-Menü mit 26 Einträgen ragte
  3–4 px unten heraus (menu-auditor, 1280 × 800 und 720 × 640 — je gemessen). Mit der Messklasse:
  **0 px** in beiden Fenstern (`python tools/nachprobe-menuefix.py`).

### 11.2 Dock-Blatt (`ui/editor.js`, `android/mobil/mobil.css`)

- Der Reiter des **bereits offenen** Bereichs ist der Einklapp-Schalter
  (`onclick: () => an ? dockZu() : dockZeigen(id)`). Wer den Inhalt messen will, darf ihn nicht
  anklicken, sondern muss ihn messen, wie er ist.
- Eingeklappt ist nicht „leer“: `dockZu()` setzt `dock-zu` am `.labor`; die Anpassungsschicht
  nimmt dann den Inhalt aus dem Fluss (`display:none`) und schrumpft das Blatt auf die Reiterleiste
  (`height:auto; bottom:auto`). Vorher blieb eine 412 × 520 px große, deckende Fläche stehen — die
  Trefferprobe auf die Werkzeugknöpfe landete auf `lb-dock`. Jetzt 412 × 109 px, 6 Knöpfe, 0 nicht
  treffbar.
- Der Reiterstreifen wird ohne `null`-Kinder gebaut: `replaceChildren(null)` erzeugt den **Text
  „null“**. Deshalb `.filter(Boolean)`.
- Der Dock-Knopf (`.nl-fab-dock`) liegt bei offenem Blatt darunter (`z-index` 9 gegen 45) und wird
  in der Anpassungsschicht ausgeblendet, statt als toter Knopf stehenzubleiben.

### 11.3 Terminal-Reiter (`ui/terminal.js`, `stil/terminal.css`)

Bei mehr Sitzungen als Platz: der Streifen ist `overflow-x:auto` mit **sichtbarem** Rollbalken
(`scrollbar-width:thin`), und nach jedem Neuaufbau wird der **aktive** Reiter ausdrücklich ins Bild
gesetzt (`scrollLeft` aus `offsetLeft`/`offsetWidth`, mit `Math.max(0, …)` nach links begrenzt).
`scrollIntoView({inline:"nearest"})` allein genügte nicht — selbst gemessen blieb der vierte Reiter
bei 1280 × 800 rechts draußen.

### 11.4 Nur EINE Bildlaufleiste je Blatt

In der Auftragsmappe scrollt `.am-inhalt`; der Netzplan darin hat keinen eigenen Bildlaufbereich mehr
(`.am-plan{max-height:none; overflow:visible}`). Zwei ineinander begrenzte Bereiche ergaben zwei
Leisten nebeneinander (menu-auditor, 1280 × 800).

### 11.5 Trefferflächen auf Fingergeräten

`mobil.css` sichert **jede** Fläche auf 44 px. `button:not(.sp-mail){min-height:44px !important}`
deckt nur die **Höhe** — Breiten aus Klassen (`width:40px` in `.dialog-zu`, `.pa-zu`, `.wahl-knopf`,
`.lb-dock-einklappen`) schlagen den Element-Selektor und müssen einzeln gehoben werden. Der Griff am
Dock-Blatt (`.nl-griff`) ist ein `div` mit `role=button` und wird von `button{…}` gar nicht erfasst.
Wer eine neue Fläche baut, prüft sie mit `tools/menueprobe.py` — nicht am Augenschein.

### 11.6 Werkzeuge für diese Schicht

| Zweck | Befehl | Erwartung |
|---|---|---|
| Tiefe Menüebenen (Web und Android) | `python tools/menueprobe.py --datei android/bau/assets/index.html --lauf` | 5 Profile, 49 Kriterien, 0 verletzt |
| Dock und Auftragsmappe | `python Nachweise/experten/dock-pruefung.py` | Reparatur bestätigt |
| Die drei Randbefunde | `python tools/nachprobe-menuefix.py` | GRÜN, alle drei behoben |
| Telefonmaße | `python android/werkzeuge/mobilprobe.py --lauf --port 0` | 12 von 12 gewerteten Profilen grün |

**Wichtig beim Messen mit `mobilprobe`/`menueprobe`:** ohne `Emulation.setTouchEmulationEnabled`
ist `(pointer: coarse)` falsch und **keine** Mobil-Regel greift. Der superviser hat sich mit dieser
Falle zuerst selbst ein falsches Ergebnis gemessen (14 Flächen unter 44 px) und es widerrufen.

### 11.7 Bau

- `python bauen.py` → `web/`, **0,14 s**; `python tools/einfach.py` → `docs/index.html`, **1,3 s**;
  `python android/bauen.py` (7 Schritte, mit Spiel) → **5,1 s** (Median mehrerer Läufe: 5,59 s;
  Zeitfresser d8 1,36 s, javac 1,00 s).
- Die Schrift-Einbettung nimmt den MIME-Typ aus `tools/einfach.py` `FESTE_TYPEN`, nicht aus
  `mimetypes.guess_type` (Windows-Registry): sonst `application/octet-stream` statt `font/woff2`,
  14-mal, 196 Bytes größer und nicht byte-gleich zu einem Bau auf Linux.
- PC-Hülle: Auslieferung `cargo tauri build` (241 s, mit `cargo build --release` davor 661 s);
  Entwicklungsrunde `pwsh -File shell/entwickeln.ps1 -NurBauen` → Debug-Profil, **4,2 s** je Runde
  (erster Lauf 3 m 11 s für die Abhängigkeiten).
- `docs/index.html` und `Netzwerk-Labor.html` im Wurzelverzeichnis sind **dieselbe** Datei und
  müssen denselben SHA256 tragen.

## 12 · Klassenraum — Spezifikation (07.10.2026; **Annahmehälfte gebaut, Öffnungsweg offen**)

Der Auftrag [`../tools/auftraege/KLASSENRAUM.md`](../tools/auftraege/KLASSENRAUM.md) beschreibt die
Lehrer-/Schüler-Instanz als Hobby-Ebene: die Lehrkraft sagt einen Code an, jedes Gerät baut denselben
Auftrag selbst — ohne Konto, ohne Server, ohne Netz. Die **umsetzungsreife Fassung** liegt in
[`entwicklung/Klassenraum – Umsetzungsreife Spezifikation.md`](<entwicklung/Klassenraum – Umsetzungsreife Spezifikation.md>)
samt vier Teil-Dokumenten in `entwicklung/Klassenraum/`. **Gebaut ist die Annahmehälfte** — ein Auftrag
mit `quelle: "klassenraum"` wird richtig behandelt (§ 12.1, E1/E2/E4/E8, `src/spiel/klassenraum.js`).
**Nicht gebaut ist der Öffnungsweg**: es gibt im Produkt noch keine Code-Erzeugung, keine Lehrkräfte-Ansicht
und keinen Weg „Code eingeben". Bis dahin ist dieser Abschnitt für den Öffnungsweg eine Ankündigung,
für die Annahmehälfte ein geltender Vertrag.

| Gegenstand | Festlegung (gemessen belegt in der Spezifikation) |
|---|---|
| Auftragscode | `NL-XXXX-XX`, immer 10 Zeichen; 30 Bit (Sitzung 5 · Art 1 · Index 6 · Variante 8) + 2 Prüfzeichen (mod 31 / mod 32) |
| Ergebnis-Code | `E-XXXX-XXX`; 25 Bit (Sitzung 5 · Platz 5 · halbe Sterne 4 · Fehlversuche 2 · Dauer 9 in 10-s-Einheiten) + 2 Prüfzeichen |
| Speicher | **neuer Store-Schlüssel `klassenraum`** (neben `lern`, `labor`, `einst`, `sandbox`) mit Feld `fassung: 1`; Export `{format:"netzwerk-labor/klassenraum", …}` |
| API | `Spiel.klassenraum` mit den acht Funktionen aus dem Auftrag plus `netzkennwert`, `tauglicheFertigkeiten`, `platz`/`platzSetzen`, `plaetze`/`plaetzeSetzen` |
| Öffnungsweg | `Spiel.instanzErstellen({ticketId｜gen, seed, quelle:"klassenraum", ohneFlow:true})` → `inst.klassenraum = {sitzung, platz, code}` → `UI.spiel.oeffnen(iid)` |
| Klassenraum-Abdruck | 6 Zeichen, FNV-1a über die kanonisch sortierte JSON-Abbildung von `{v, geraete, kabel}` (ohne `netz.zustand`) |
| Live-Server (optional, Stufe C) | `GET /liste?auftrag=<Auftragscode>` und `POST /ergebnis` mit `{auftrag, code}` — der Server transportiert nur Codes, deutet nichts und ist in den Einstellungen **abschaltbar, Standard aus**; ohne ihn müssen A und B vollständig laufen |
| QR-Code (Stufe D) | eigener Encoder ohne neue Kisten (alphanumerisch, Version 1, Stufe H), Rückgabe als SVG-Data-URI; Inhalt ist **genau** der Auftragscode |

Die Dateien der Umsetzung: `src/spiel/klassenraum.js`, `src/ui/klassenraum.js`, `src/stil/klassenraum.css`,
`tests/klassenraum.test.js`; additiv erlaubt sind `src/ui/app.js`, `src/ui/start.js` und der Store-Schlüssel
in `src/spiel/zustand.js`. Erwartete Abnahme nach dem Einbau: 291/291 Tests grün, Filter `--klassenraum`
40/40, `ethos.py` GRÜN, `klassen.py` 0, `sim-stand.js` unverändert.

### 12.1 Entscheidungen des Nutzers (09.10.2026)

Die acht Entscheidungen E1–E8 aus [`Entwurf – Klassenraum-Umsetzung.md`](<entwicklung/Entwurf – Klassenraum-Umsetzung.md>) § 8
sind damit entschieden: sieben folgen der Empfehlung der Prüfer, die achte hat der Nutzer selbst beantwortet.

| | Frage | Entscheidung | Stand |
|---|---|---|---|
| **E1** | Ist der Klassenraum-Auftrag im Postfach sichtbar? | **herausfiltern** wie `training` | **umgesetzt** (`postfach.js:137`, `hub.js:58`, Ereignistakt `ereignisse.js:138`) |
| **E2** | Verfälscht er die Karriere? | **nein** — Umleitung wie beim Training | **umgesetzt** (`abnahme.js:126`, `src/spiel/klassenraum.js`) |
| **E3** | Überstimmt die Lehreransage den Bildungsstand? | **nein** — der Bildungsstand ist die Voreinstellung des Menschen | offen (mit Stufe B) |
| **E4** | Wessen Hilfevorrat gilt? | Ticket-Stufe **ausdrücklich** setzen | **umgesetzt** (`Spiel.stufe.ticketStufeSetzen`) |
| **E5** | Sieht die Lehrkraft, wie viel Hilfe nötig war? | **nein für 1.3** | entschieden, nicht gebaut |
| **E6** | Live-Server (C) und QR (D) jetzt? | **später** — A und B tragen den Unterricht ohne Netz | offen |
| **E7** | Sollzahlen nach dem Einbau | seinerzeit 461 + 41 ≈ 502 | überholt: heute **620/620** (70 Testdateien, 90 Module) |
| **E8** | Beweist der Netzkennwert „alle haben denselben Auftrag"? | **nein** — über `def.id` vergleichen | **umgesetzt** (`tests/klassenraum-determinismus.test.js`) |

**Und die Frage, die keine Technik ist — entschieden am 09.10.2026: Ein Klassenraum-Auftrag wird NICHT
bewertet.** Keine Note, keine Punkte, keine Rangfolge, kein Vergleich zwischen Azubis; der Auftrag zählt
ausschließlich für den Lernstand des Einzelnen. Damit entfällt die „eigene Auswertung statt eines Filters",
die der Fahrplan als Alternative genannt hatte — **die Umleitung nach E2 ist die ganze Lösung.** Das
ausgelieferte Verhalten 2.0.0 erfüllt diese Entscheidung bereits; wer später doch bewerten will, ändert
einen Vertrag und nicht eine Einstellung.

### 12.2 Bau-Entscheidungen (09.10.2026)

Für den Bau der Stufen A und B hat die Leitung fünf Punkte entschieden, an denen die Dokumente sich
widersprechen oder älter sind als der Code. Sie gelten für die Umsetzung; die Dokumente A–D werden
**nicht** nachgezogen (sie sind Protokolle), sondern hier zusammengeführt.

| | Streitpunkt | Entscheidung | Begründung |
|---|---|---|---|
| **L1** | `A – Codec…` § 5 sagt „Auftrag ist trotzdem im Postfach sichtbar" | **E1 gilt: unsichtbar** | E1 ist jünger (Fahrplan § 7) und im Code umgesetzt (`postfach.js:137`, `hub.js:58`, Ereignistakt). `Spiel.instanz(iid)` und `Spiel.oeffnen(iid)` finden den Auftrag weiterhin |
| **L2** | `plaetze` steht in Spez. § 2.5 + L6, aber **nicht** in `A § 7.1` („genau diese 14 Felder") | **`plaetze` kommt dazu** (`sitzung.plaetze`, `0`/`null` = nicht eingestellt, sonst 1..31) | Die Ampel der Lehrkraft braucht den Nenner „wie viele Plätze"; ohne ihn kann sie nie grün werden |
| **L3** | `ohneFlow: true` (A, Spez. § 2.6, § 12) gegen `postfach.js:84`, das die Quelle selbst ausnimmt | **beides setzen** | Der Schalter schadet nicht und hält den geschriebenen Vertrag; die Quelle bleibt zusätzlich geschützt |
| **L4** | Dokument **B** und **D** widersprechen sich beim Ablauf der Lehrkraft (Knopf „Code anzeigen" vs. „Sitzung anlegen"; ein `textarea` vs. Einzelfeld; ein Knopf „Datei…" vs. zwei) | **B gilt** | D's Drehbuch ist mit der Regel R12 (höchstens 6 sichtbare Bedienelemente je Ansicht) nicht darstellbar; B ist die baubare Fassung |
| **L5** | Wo der Ergebnis-Code erscheint | **als Toast mit Kopierknopf**, geankert am Bus-Kanal `klassenraum` — **keine** Änderung an `sp-ergebnis` | `B § 7.2` verbietet die dauerhafte Zeile ausdrücklich; der Kanal ist gebaut (`klassenraum.js:51`) |
| **L6** | Wie viele Fertigkeiten sind tauglich — A misst **24 von 27** | **alle 27** (`tauglich: true`), Indizes 0..26 gültig, **27..63** → `{fehler:"fassung"}` | A maß **vor** den Injektoren aus task-5. Nachgemessen (`tests/klassenraum-loesbarkeit.test.js`, `docs/entwicklung/Befund – 27 von 27.md`): 27 Skills × Seeds 1..16 = **432/432**, volles Fenster Seeds 1..64 = **1728/1728**, echter Lehrkraft-Weg = **54/54**, jedes Mal mit Injektor, gebrochenem Ziel und Lösungsweg. Kein Index rückt (Anhängeregel unverletzt); die drei neuen (`lab.portsec`, `lab.stp`, `lab.storage`) liefern echte Aufträge statt `{fehler:"auftrag"}` — **gewollt** |
| **L7** | Was die Regel **R12** („höchstens 6 Bedienelemente je Ansicht") bedeutet | Sie **misst je Ansicht** — und die Grenze **6** bindet die **Zusatzansichten** (Lehrkraft `klasse` = 6, Azubi `Auftrag` = 3). Die Hauptansichten werden **gemessen und als Stand festgehalten**, nicht auf 6 gebogen | R12 meldete bis 09.10. „0 sichtbare Elemente — eingehalten", weil der Messweg `null` lieferte (`cdp.py` verpackte den Ausdruck als Rumpf) — ein **grünes Nichts**. Repariert: `ethos.py` zählt je Ansicht im eigenen Kasten und sagt „nicht gemessen", wenn etwas nicht messbar ist. Ergebnis am alten Bau: `Heute 6 · Postfach 6 · Labor 15 · Kunden 4 · Wiki 31 · Lernstand 31 · Shop 4`. Eine Wiki-Seite mit 31 Verweisen auf 6 zu kürzen wäre kein Minimalismus, sondern ein Rückschritt — deshalb die Trennung |

Dazu die Dateiaufteilung für den Bau (ein Schreiber je Datei): **`src/spiel/klassenraum-codec.js`**
(reine Rechnung: Formate, Prüfzeichen, Kanonisierung, Abdruck, eingefrorene Tabellen) ·
**`src/spiel/klassenraum.js`** (die **elf** Funktionen der Vertragstabelle § 12 + `plaetze`/`plaetzeSetzen`
nach L6 + das vorhandene `abnehmen` + die Prüffläche `tabellen()` — zusammen **16 Namen**, gemessen an der
Rückgabe der Datei) · **`src/ui/klassenraum.js`** + `src/stil/klassenraum.css` (die zwei Ansichten
`klassenraum` und `mitarbeit`, Startseiten-Zeile, Einstellungsabschnitt, Toast) ·
`tests/klassenraum-codec.test.js`, `tests/klassenraum.test.js`, `tests/ui-klassenraum.test.js`,
`tests/klassenraum-abnahme.test.js`.

**O1 — die Klassenstärke und das sechste Bedienelement (entschieden am 09.10.2026).** Dokument B § 2.1
gibt der Lehrkräfte-Ansicht **sechs** sichtbare Bedienelemente (Regel R12 prüft höchstens sechs), B § 9.4
verlangt für die Ampel zusätzlich die **Klassenzahl** — das wäre ein siebtes und würde `ethos.py --dom`
rot machen. Entscheidung: **die Platzzahl sitzt im Datei-Dialog**, nicht als eigenes Element in der
Ansicht; ist sie nicht gesetzt, sagt die Ampel ausdrücklich „Plätze nicht eingestellt", statt eine Zahl zu
erfinden. Die Regel R12 wird **nicht** für diese Ansicht aufgeweicht.

**Kein Server (Stufe C), kein QR (Stufe D), keine Bewertung** — so bleibt 2.0 ohne Netz und ohne Konto
benutzbar. Die Startseiten-Zeile hängt an einem **Bus-Haken** (`Bus.an("ansicht")`), nicht an einem
Eingriff in `src/ui/hub.js`.

### 12.3 Stand der Umsetzung (09.10.2026, gemessen)

| Prüfung | Ergebnis |
|---|---|
| `sh tools/test.sh` | **Exit 0** — `726/726 grün (81 Testdateien, 91 Module)`, `davon 0 übersprungen` |
| `sh tools/test.sh --rauch` | **45/45** — 14 Ansichten (die zwei Klassenraum-Ansichten sind neu) × 3 Breiten, echte Maus |
| `node tests/run.js klassenraum` | grün · Achtung: `--klassenraum` prüft **0 Fälle** (Filter nimmt das Argument wörtlich) |
| `python tools/ethos.py` · `klassen.py` | **GRÜN** (neuer Stand eingefroren) · **0 Klassen ohne CSS-Regel** (auch für `kl-`) |
| `node tools/sim-stand.js` | Simulation unverändert gegenüber dem Referenzstand |
| `python tools/seite.py --pruefen` | GRÜN — 42 Dokumente, kein toter Verweis |
| `python tools/menueprobe.py` | **Web 45 erfüllt / 0 verletzt**, **Android 49 erfüllt / 0 verletzt** — jeweils **5 von 5 Profilen gemessen** |
| **R12 im laufenden Programm** | **`klasse` 6/6 ✓ · `Auftrag` 3/3 ✓** — Vorschrift unverändert aus `ethos.py`, drei Breiten, zwei Zustände, vier Gegenproben |
| `python bauen.py` | **128 Module**, 2238 KB → `web/index.html`, Fassung **2.0.0** |
| `docs/index.html` = `Netzwerk-Labor.html` | **byte-gleich**, 2 829 477 B, SHA256 `C3C51EDA…828E`, 0 Außenverweise |
| Android | `Netzwerk-Labor-2.0.0-Android.apk`, 1 164 828 B — **die APK ist nicht byte-reproduzierbar**: derselbe Quellstand ergibt dieselbe Größe, aber bei jedem Bau einen anderen SHA256. Deshalb wird hier **kein Hash** zitiert (die früher genannten `A9526120…`, `2208C08A…` und `CF5F2905…` sind drei Bauten desselben Standes); die Signatur ist mit dem Originalschlüssel vom 06.10.2026 gültig. Der Release-Ablauf hängt sie seit 09.10.2026 als **vierten** Anhang an und bricht ohne die zwei Repository-Secrets ab, damit keine fremd signierte Fassung entsteht |
| Desktop (Auslieferung) | **Release**-Bau `Programm/Netzwerk-Labor.exe`, 8 630 272 B, 2.0.0; Sonden: 10 Ansichten, `klassenraum`+`mitarbeit` da, `.st-knopf` 44 px, `.menue` z-index 50 |

**Der Codec ist erschöpfend belegt** (gemessen von der Umsetzung, nicht abgeleitet): Auftragscode
**1 048 576/1 048 576** Nutzlasten (2²⁰) bauen-lesen-rund, 0 Abweichungen; Ergebnis-Code
**33 554 432/33 554 432** (2²⁵), 0 Abweichungen; 9 672 Ein-Zeichen-Ersetzungen und 384 Vertauschungen
werden **ausnahmslos** als Prüfziffer-Fehler markiert. Die drei dokumentierten Beispiele `NL-HC3L-CS`,
`NL-WTQJ-EF` und `E-KFWS-HZM` stimmen zeichengleich; das Formbeispiel `NL-4F7K-2Q` wird abgewiesen
(richtig wäre `NL-4F7K-E3`). Determinismus: 274 Codes in zwei getrennten Prozessen identisch.
Der Beweislauf der Kanonisierung ist **vollständig**: 58 von 58 Handaufträgen, `kanonHandK0` **3520**,
**3712** Varianten, Rückfall 192 (die drei Terminal-Aufträge), `abgebrochen: false` — und ein Abbruch
wäre an drei Stellen sichtbar (Befundtext, Konsole, JSON), nachgewiesen mit einem absichtlich auf 60 s
gesetzten Budget.

**Die Output-Runde (09.10.2026) hat den gemessenen Stil-Stand verbessert** — alles in
`tests/stil-stand.json` eingefroren: **R1 23→22 · R2 122→113 · R3 206→195 · R4 539→514 · R5 70→0 ·
R6 11→0 · R8 5→0 · R10 87→0**. Trefferflächen: **44 px drei → elf** Flächen; die zwei Menü-Überdeckungen
hatten eine Ursache (`.menue` mit `z-index:40` unter dem Android-Dock-Blatt mit 45) und sind behoben.
Unabhängig gegengeprüft in `docs/entwicklung/Befund – Output-Runde.md` mit **sieben Gegenproben**
(Zeilenenden, Regeln gegen HEAD, Werkzeug-Hashes gegen „Regel abgeschaltet", Bewegung 36/54/41,
Trefferfläche gegen „Inhalt verkleinert", Löschen gegen Ändern, Tokens) — dabei wurden drei Annahmen
**widerlegt**, u. a. dass R8 „verschoben" statt gelöscht wurde (`basis.css` ist byte-identisch).
Ein Verlust ist benannt und dokumentiert: `.ger[class*="jc-"] .gb` und `.kabel[class*="jc-"] *` haben
keine eigene Regel mehr (Wirkung gedeckt durch `basis.css:91/93`, in `juice.css` kommentiert).

**Nicht geprüft — ehrlich:** kein Browserlauf (damit auch **nicht** die Regel „höchstens 6 sichtbare
Bedienelemente" im laufenden Programm; sie ist nur im Test am DOM gezählt), keine Bildschirmfotos, keine
zwei echten Edge-Profile, keine echte Unterrichtsstunde, `.exe` nicht neu gebaut, Stufe C (Server) und
D (QR) offen, Kennwert-Kollisionen (30 Bit) nicht gemessen. Die zwei Befunde der Gegenprüfung
(`docs/entwicklung/Review – Klassenraum A+B.md`) sind aufgenommen: der Kommentar „24 von 27" im Codec ist
richtiggestellt, der Abnahmebefehl ist hier korrekt genannt.

### 12.4 Hilfecode `H-XXXX-XX` (09.10.2026) — verbindlicher Vertrag

**Wozu.** Die Lehrkraft sieht seit 2.0.2 **anonyme Fortschrittszahlen der Klasse** („Fortschritt: 7 von 20
offen · 3 Abgaben in den letzten 5 Minuten"). Was fehlte: der Azubi konnte nicht sagen, **wo** er hängt.
Der Hilfecode schließt genau diese Lücke — **ohne Server, ohne Konto, ohne Bewertung**. Der Azubi liest ihn
ab, die Lehrkraft tippt ihn in ihr **bestehendes** Feld „Ergebnis-Codes"; dort passen mehrere Codes hinein,
also entsteht **kein neues Bedienelement** und die Regel R12 bleibt bei 6.

| Punkt | Festlegung |
|---|---|
| Form | **`H-XXXX-XX`** — **9 Zeichen**: `H` + Bindestrich (**2**) + **4** Nutzzeichen + Bindestrich (**1**) + **2** Prüfzeichen. *Korrektur vom 09.10.2026 (zweite):* die erste Fassung sagte „immer 10 Zeichen" — das ist die Länge von `NL-XXXX-XX`, weil dort das Präfix **zweistellig** ist. Der Hilfecode ist ein Zeichen kürzer und wird genauso normalisiert (führendes `H` nur abschneiden, wenn danach genau **6** Zeichen bleiben) |
| Alphabet | dasselbe 32-Zeichen-Alphabet (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, **kein I, O, 0, 1**) |
| Prüfzeichen | **dieselben zwei** wie bei den anderen Codes: `C1 = Σ i·v(i) mod 31`, `C2 = Σ (2i+1)·v(i) mod 32` |
| Nutzteil | **20 Bit = 4 Zeichen × 5 Bit**: `sitzung` 5 (1..31) · `platz` 5 (0..31) · `schritt` 5 (erfüllte Ziele, 0..31) · `offen` 5 (offene Ziele, 0..31). Dazu die **zwei Prüfzeichen** = zusammen die bekannten **6 Zeichen** (`H-XXXX-XX`). *Korrektur vom 09.10.2026:* die erste Fassung dieses Absatzes sprach von „30 Bit Nutzteil … reserviert 10" — das war ein Rechenfehler der Leitung, denn 10 Zeichen sind 6 Zeichen = 4 Nutz- + 2 Prüfzeichen. Die Form gewinnt (sie ist an allen Stellen dieselbe und passt zu `NL-`), der Round-Trip ist **2²⁰**, nicht 2³⁰ |
| Ungültige Bitlage | **`sitzung = 0`** ist die einzige Lage, die der Encoder nie erzeugt (Sitzungen sind 1..31) → beim Lesen `{fehler:"fassung"}` mit dem Grund „…trägt keine gültige Sitzung (0) – er stammt aus einer anderen Fassung." Das ersetzt das gestrichene reservierte Feld: es ist der einzige Bitraum, den diese Form für eine spätere Fassung offenlässt, und er wird **erschöpfend** geprüft (alle 32 768 Nutzlasten mit `sitzung = 0`) |
| Normalisierung | wie bei den anderen Codes: Großbuchstaben, alles außer `[0-9A-Z]` weg, führendes `H` nur abschneiden, wenn danach **genau 6** Zeichen bleiben |
| Fehlerverhalten | **nie eine Ausnahme**; leer/`null` → `null`; ungültig → `{fehler, grund}` mit den wörtlichen Texten aus `A – Codec…md` § 1.5 |
| API | `Spiel.klassenraum.hilfeCode(inst)` → `"H-XXXX-XX"` · `Spiel.klassenraum.hilfeLesen(code)` → `{ok, sitzung, platz, schritt, offen}` |
| **Kein Personenbezug** | Der Code trägt **Sitzung, Platz und Zählerstände** — keinen Namen, keine Note, keinen Rang, keine Sterne. Das ist die Nutzerentscheidung („Lehreraufträge werden NICHT bewertet") in einer Datenform; ein Test wacht darüber |
| Ein `H`-Code ist **kein** Ergebnis | `ergebnisEintragen(code)` weist ihn mit `{fehler:"länge"}` ab und **ändert nichts** — gemessen. Er kann also nie in die Ampel laufen; er erscheint dort nur als Klartextzeile |

**Gemessen bei der Umsetzung (09.10.2026):** Round-Trip erschöpfend über **1 015 808** gültige Nutzlasten
(31 · 32 · 32 · 32 = 2²⁰ minus der 32 768 mit `sitzung = 0`) — **0 Abweichungen**, 1 842 ms; alle
**32 768** `sitzung = 0`-Fälle → `{fehler:"fassung"}`; **86/86** Tippfehler und Vertauschungen erkannt;
`name`, `note`, `rang`, `punkte` am Eingangsobjekt ändern den Code **nicht** (belegt mit zwei Codes);
Determinismus über einen zweiten Prozess und einen zweiten vm-Kontext.

*Zwei Korrekturen der Leitung an diesem Abschnitt (Bit-Rechnung, Zeichenlänge) sind absichtlich stehen
gelassen: sie zeigen, dass der Vertrag vor dem Bau geschrieben wurde **und** dass der Bau ihn prüft —
beide Fehler hat die Umsetzung gefunden, nicht die Leitung.*

| Anzeige bei der Lehrkraft | Klartext in der bestehenden Ausgabe, z. B. „**Platz 7 hängt: 2 von 5 Zielen erfüllt**" — **kein** neues Feld. Ein `H`-Code ist **kein** Ergebnis und darf nicht als solches eingetragen werden |

## 13 · Hilfestellung — Stufen und Schnittstellen (07.10.2026) — verbindlicher Vertrag

Der vollständige Vertrag steht in
[`entwicklung/Hilfestellung – Stufen und Schnittstellen.md`](<entwicklung/Hilfestellung – Stufen und Schnittstellen.md>).
Dieser Abschnitt hält nur fest, was **für den ganzen Bau** gilt; bei Widerspruch gilt der Vertragstext.

**Anlass (Auftrag des Nutzers, 07.10.2026):** Ein Azubi kann die Syntaxen nicht kennen, hat aber im
Spielflow keinen Zugriff auf eine Lernnotiz. Die Hilfe muss dorthin, wo er steht: ins **Terminal**, in die
**Leiste** (die kleinen Mails) und in einen **Trainingsbereich abseits der Aufträge** — und sie muss
**schrittweise** mit dem Bildungsstand wachsen.

### 13.1 Die drei Achsen (nicht verwechseln)

| Achse | Feld | Werte | Bedeutung |
|---|---|---|---|
| **Bildungsstand** (neu) | `Spiel.einst.stufe` | `azubi` \| `azubi-plus` \| `geselle` \| `meister` | Voreinstellung des **Menschen**. Wird nie automatisch geändert. |
| Erklärtiefe | `Spiel.einst.niveau` | `E` \| `AP1` \| `AP2` | Wie ausführlich Konsole und Simulation erklären. |
| Prüfungsstrenge | `Spiel.einst.wahl`, `inst.niveau` | `auto` \| `E` \| `AP1` \| `AP2` | Wie streng ein einzelnes Ticket bewertet wird. |

`Spiel.stufe.setzen(id)` zieht `einst.niveau` nach, lässt es aber einzeln verstellbar.

### 13.2 Neue und geänderte Datenformen

| Gegenstand | Festlegung |
|---|---|
| Rang | `Spiel.stufe.rang(id)` → 1…4; verglichen wird **immer** über den Rang, nie über den Namen. Rückfall bei fehlendem/unbekanntem Wert: `azubi` (kein Wurf). |
| Hilfekonto je Ticket | `Spiel.HILFE_KONTO = {azubi:6, "azubi-plus":4, geselle:2, meister:0}`; gezählt wird **je Ticket** über `Spiel.stufe.hilfeZiehen(inst)`. Ein leerer Vorrat **sperrt nicht** — die nächste Sprosse kostet dann Sterne wie bisher. Ein Azubi darf nie in einer Sackgasse landen. |
| Vorschläge | `DATEN.hilfen.VORSCHLAEGE` (`src/daten/hilfen.js`); `bereich` ist **immer** eine `Spiel.LEITER[].id` (`link`, `vlan`, `ip`, `gateway`, `route`, `dienst`), damit Leiter und Vorschlag dieselbe Sprache sprechen. `art` ∈ {`pruefen`, `aendern`}. |
| Entscheidung | `Spiel.hilfe.passend/geruest/leiter/syntaxBruecke` (`src/spiel/hilfe.js`, **nur angefügt**). Die Oberfläche entscheidet nichts selbst. |
| Fehlertexte | `Spiel.fehlertext({netz, id, modus, art, eingabe, ausgabe, fehler})` (`src/spiel/fehlertexte.js`), Tiefe aus `Spiel.stufe.text(...)`. |
| Mini-Anker | `Spiel.mini.hilfe(id)` (Denkhilfe, **nie** die Lösung) und `Spiel.mini.anker(id)` (`{titel, text, quelle, wiki}`), beides in `src/spiel/mini.js`. |
| Training | `Spiel.st.training = {je: {[szenarioId]: {versucht, bestanden, bestes}}}` — **Spielstand `v:3`** (Migration ergänzt das Feld). Szenarien: `DATEN.trainings` (`src/daten/trainings.js`), Logik `Spiel.training` (`src/spiel/training.js`). |

### 13.3 Verhalten, das vertraglich feststeht

1. **Training zahlt nichts.** Kein Geld, kein Ruf, kein Karrierefortschritt, kein Eintrag in `st.erledigt`,
   keine Wochenwertung, kein Postfach. Es zählt nur für den Lernmotor (`L.ueben`) und den Trainingsstand.
   Durchgesetzt an **einer** Stelle: erste Zeile von `Spiel.abschliessen` leitet `quelle === "training"` um.
2. **`quelle: "training"` ist unsichtbar.** `Spiel.postfach()` filtert sie heraus (wie `pruefung` und
   `raetsel`), damit `Spiel.offen()`, die Kopfzeile und die Postfach-Ansicht sie nicht mitzählen.
3. **Die Hilfe ist schrittweise.** Je Stufe 0/1/2 Vorschläge (`meister` 0), Denkhilfe bei jedem Mini
   (`azubi`/`azubi-plus`), nach falscher Antwort (`geselle`), gar nicht (`meister`).
4. **Nichts wird ungefragt verraten.** `Spiel.mini.hilfe` liefert **nie** den Lösungstext; ein Test prüft das
   gegen `Spiel.mini.loesungText`.
5. **Kein Baustein ohne Aufruf.** Jede neue Fläche wird aus dem echten Weg gerufen (Terminal-Zeile,
   Leisten-Knopf, Ansicht) — grüne Tests ohne Aufruf gelten als **nicht fertig** (AGENTS.md).

### 13.4 Dateien der Umsetzung

`src/spiel/stufensystem.js` · `src/ui/stufensystem.js` · `src/stil/stufensystem.css` ·
`src/daten/hilfen.js` · `src/spiel/hilfe.js` (nur angefügt) · `src/ui/hilfe.js` · `src/stil/hilfe.css` ·
`src/spiel/fehlertexte.js` · `src/ui/konsole.js` · `src/cli/parser.js` · `src/cli/entspricht.js` ·
`src/spiel/mini.js` · `src/ui/leiste.js` · `src/ui/karriere.js` · `src/stil/leiste.css` ·
`src/daten/trainings.js` · `src/spiel/training.js` · `src/ui/training.js` · `src/stil/training.css` ·
`src/ui/lernstand-hilfe.js` · `src/ui/start.js` · `src/spiel/erstestunde.js` ·
additiv in `src/ui/app.js`, `src/spiel/zustand.js`, `src/spiel/abnahme.js`, `src/spiel/postfach.js`,
`src/ui/geraetebilder.js`.

### 13.5 Stand der Umsetzung (07.10.2026)

**Fertig und gemessen** (Fassung **1.2.4**, Zahlen aus `node tests/run.js`, `python tools/ethos.py`,
`python tools/klassen.py`, `node tools/sim-stand.js`, `python tools/rauch.py`):

| Prüfung | Ergebnis |
|---|---|
| `node tests/run.js` | **434/434 grün**, 50 Testdateien, 83 Module, exit 0, **0 übersprungen** |
| `python tools/ethos.py` | **GRÜN** · `python tools/klassen.py` **0** |
| `node tools/sim-stand.js` | Simulation unverändert |
| `python tools/rauch.py` | **39/39** (echter Edge, 12 Ansichten × 3 Breiten — mit „Training") |
| `python bauen.py` | 118 Module → `web/index.html` (Version 1.2.4) |
| `docs/index.html` = `Netzwerk-Labor.html` | byte-gleich, 0 Außenverweise |

Umgesetzt sind A–J aus § 13.4 sowie die Nacharbeit aus einer unabhängigen Gegenprüfung mit fünf Prüfern
(Berichte: `docs/entwicklung/Review – *.md`). Über den Vertrag hinaus entstanden:

* **Streifen entlasten**: im Fehlerfall nur Fehlertext + ersten Vorschlag, Rest aufklappbar
  (`aria-expanded`) — vorher standen 1 279 Zeichen gleichzeitig da.
* **Leiste**: Hilfe-Knopf in der Statuszeile (vorher hinter `overflow:hidden`/`opacity:0`, erreichbar erst
  nach 280 ms Mausberührung) und ein Zeichen für ein wartendes Mini-Ticket.
* **Trainingsergebnis** erklärt je offenem Ziel über `UI.erklaeren` und gruppiert die Gründe über
  `Spiel.fehlschlaege` je Fertigkeit.
* **`src/spiel/fehlertexte.js`** ist von 1 176 auf 158 Zeilen geschrumpft; die 82 Tabellenzeilen liegen als
  `DATEN.fehlertexte` in `src/daten/fehlertexte.js` (Schichtregel § 7). `Spiel.FEHLERTEXTE` bleibt öffentlich.
* **`tests/harness.js`** zählt Zusicherungen: ein Test mit 0 Zusicherungen gilt als **übersprungen** und wird
  in der Schlusszeile als „davon N übersprungen" gemeldet — die Bauart, die schon einmal sieben Testgruppen
  grün meldete, ohne dass sie etwas prüften.
* **`tools/rauch.py`** hat jetzt einen Fall „Training". Vorher führte die feste Liste 11 Ansichten und die
  neue war nicht dabei: 36/36 grün, ohne sie je zu öffnen.

**Nicht geprüft:** das Pixelbild in einem Browser ist nicht angesehen (kein Bildschirmfoto); die
Android-Fassung wurde nicht gebaut (`VERSION_CODE 10204` ist nachgezogen, die APK auf 1.2.3 bleibt gültig);
`tools/menueprobe.py --datei web/index.html` ist **rot** (36/43, 44-px-Trefferflächen in den Editor-Menüs) —
gemessen identisch zu `HEAD~1`, also **vorbestehend** und nicht aus diesem Bau.

## 14 · 2.0-Fundament — Übergabe, Ergebnis, Klassenraum (09.10.2026) — verbindlicher Vertrag

**Anlass.** Der [Fahrplan 1.3/2.0](<entwicklung/Fahrplan – 1.3 und 2.0.md>) nennt die Schritte 0–4 als das,
was vor jedem Klassenzimmer-Einsatz stehen muss. Diese Sitzung baut sie mit 15 getrennt schreibenden
Teammitgliedern; die Schreibrechte stehen als Shared Tasks im Sitzungsprotokoll und in
`docs/entwicklung/Übergabe – Stand 2.0-Fundament.md`. Dieser Abschnitt hält fest, was **für den ganzen Bau**
gilt; bei Widerspruch gilt der Einzelvertrag des jeweiligen Bausteins.

### 14.1 Neue und geänderte Datenformen

| Gegenstand | Festlegung |
|---|---|
| Übergabe | `Spiel.uebergabe({lernstandBehalten = true})` → `{ok, lernstandBehalten, vorher, nachher}` in `src/spiel/uebergabe.js`. Schreibt `Spiel.st.uebergabe = {t, lernstandBehalten}` in den Spielstand; `Spiel.uebergabeLetzte()` liefert denselben Eintrag oder `null`. Kein DOM (Schichtregel § 7). |
| Ergebnis | `Spiel.ergebnisText(inst, erg?)` und `Spiel.ergebnisKurz(inst, erg?)` in `src/spiel/ergebnis.js` — reiner, kopierbarer Klartext bzw. eine Zeile. Beide sind **zugesagte Schnittstelle** für den Knopf „Ergebnis kopieren" im Abschlussfenster. |
| Klassenraum | Vierte Quelle `quelle: "klassenraum"`, behandelt in `Spiel.klassenraum.abnehmen(inst, abnahme)` (`src/spiel/klassenraum.js`), aufgerufen über **eine** Umleitung in `Spiel.abschliessen` neben dem Trainingszweig. |
| Denkhilfen | `DATEN.miniDenkhilfen` bleibt die eine Tabelle. Ergänzungen aus einer zweiten Datei geschehen **idempotent** (`Object.assign(DATEN.miniDenkhilfen \|\| {}, {…})`); der Dateiname muss **nach** `mini-denkhilfen.js` sortieren, weil `bauen.py:60` und `tests/run.js:32` die Schicht alphabetisch laden. |
| Lernmotor | Der Lernstand (`store "lern"`) wird ausschließlich über die `L.*`-API gelesen und geschrieben. Kein Modul unter `src/` ruft `store.get("lern")` oder `store.set("lern")` direkt auf. |

### 14.2 Verhalten, das vertraglich feststeht

1. **Die Übergabe lässt den Lernstand stehen** (er gehört dem Lernmotor, nicht dem Spielstand). Mit
   `lernstandBehalten: false` wird er gelöscht — und zwar über `L.reset()` **vor** `Spiel.laden()`, weil der
   Motor seinen Stand im Verschluss hält und ein von außen geleerter Speicher bei ihm unbemerkt bliebe.
   Einstellungen (`store "einst"`) bleiben in jedem Fall. Nach der Übergabe ist **kein** offener Auftrag mehr da.
2. **Der Klassenraum zahlt nichts** — kein Geld, kein Ruf, kein `st.erledigt`, keine Wochenwertung, keine
   Abzeichen —, aber der **Lernwert bleibt**: der Klassenraum-Zweig ruft `Spiel.lernenNachAbnahme` selbst, wie
   es der Trainingsweg tut. Eine Umleitung an **einer** Stelle statt elf Filter an elf Stellen; die Umleitung
   steht vor jedem Nebeneffekt, also auch vor dem `st.erledigt.push`.
3. **Derselbe Code ergibt denselben Auftrag.** Code + Seed bestimmen den Auftrag bis auf `def.id`; der lokale
   Flow-Stand darf ihn nicht verändern, sonst bekäme der Nachbar am Nebentisch einen anderen Auftrag.
4. **Der Hilfevorrat folgt dem eingestellten Bildungsstand.** Die Ticket-Stufe wird ausdrücklich gesetzt; der
   Rückfall auf den Standard ist kein stiller Ersatz. Ein leerer Vorrat sperrt weiterhin nicht (§ 13.2).
5. **Der Lernmotor bleibt fremd.** Änderungen an `fremd/lernmotor.js` sind verboten (Kopf der Datei); die
   Quelle liegt außerhalb des Projektordners und hat beim Laden Vorrang. Unsere Seite sichert ein Wächtertest.
6. **Kein Baustein ohne Aufruf.** Jede neue Fläche wird aus dem echten Weg gerufen — grüne Tests ohne Aufruf
   gelten als **nicht fertig** (AGENTS.md).

### 14.3 Dateien der Umsetzung

`src/spiel/uebergabe.js` · `src/spiel/ergebnis.js` · `src/ui/uebergabe.js` · `src/stil/uebergabe.css` ·
`src/spiel/klassenraum.js` · `src/spiel/abnahme.js` · `src/spiel/postfach.js` · `src/spiel/flow.js` ·
`src/spiel/stufensystem.js` · `src/spiel/hilfe.js` · `src/spiel/injektoren.js` · `src/sim/engine.js` ·
`src/daten/trainings.js` · `src/daten/lehrtexte.js` · `src/daten/mini-denkhilfen.js` ·
`src/daten/mini-denkhilfen2.js` · `src/daten/hilfen.js` · `src/daten/wiki.js` · `src/ui/hilfe.js` ·
`src/ui/spiel.js`

### 14.4 Stand der Umsetzung (09.10.2026, gemessen)

| Prüfung | Ergebnis |
|---|---|
| `node tests/run.js` | **620/620 grün**, 70 Testdateien, 90 Module, **0 übersprungen** |
| `python tools/ethos.py` | **GRÜN** · `python tools/klassen.py` **0 Klassen ohne CSS-Regel** |
| `node tools/sim-stand.js` | Simulation unverändert gegenüber dem Referenzstand |
| `python tools/seite.py --pruefen` | **GRÜN** — 39 Dokumente, kein toter Verweis |
| `python bauen.py` | 126 Module, 2133 KB → `web/index.html`, Fassung **2.0.0** |
| `docs/index.html` = `Netzwerk-Labor.html` | **byte-gleich**, SHA256 `3822D6B5…95F6`, 0 Außenverweise |
| Android | `Netzwerk-Labor-2.0.0-Android.apk`, 1 127 964 B, SHA256 `db11bf88…FAC1`, Signatur gültig |

Nullmessung VOR dieser Sitzung: **471/479 grün, 8 rot** (alle acht `UI: Übergabe › …`, Hinterlassenschaft
eines abgebrochenen Laufs), 55 Testdateien, 84 Module, Fassung 1.2.4. Die Sitzung hat die acht roten
zuerst auf 0 gebracht und danach 141 Prüfungen ergänzt (479 → von 55 auf 70 Testdateien, 84 → 90 Module).

**Nicht geprüft — ehrlich:** kein Browserlauf (`tools/rauch.py`, `tools/menueprobe.py`), keine echte
Unterrichtsstunde, die `.exe` wurde **nicht** neu gebaut (Rust-Bau, nicht Teil dieses Auftrags), und die
veröffentlichte Seite ist unverändert **1.2.4**, weil nicht gepusht wurde.

## 15 · Nachtrag des Nutzers: Wiederholungssperre, Führung, generierte Fragen (09.10.2026) — Vertrag

**Anlass.** Nach dem Fahrplan-Auftrag verlangte der Nutzer vier Dinge: (1) Aufträge dürfen sich in einer
Sitzung nicht schnell wiederholen („wenn man mehrere Mini-Tickets abarbeitet, kommt sehr schnell mehrmals
dasselbe"), (2) im Labor/Baucanvas soll bei Bedarf der nächste nötige Schritt gezeigt werden — „indem ein
Computer oder der Menüpunkt pulsiert oder ein Pfeil darauf zeigt", (3) Fragen sollen möglichst immer neu
generiert werden, „so dass tendenziell jeder User eine sehr eigene Experience haben kann", (4) alles bis zum
Production Release ausarbeiten.

### 15.1 Neue und geänderte Datenformen

| Gegenstand | Festlegung |
|---|---|
| Wiederholungssperre | `Spiel.st.mini` trägt zwei neue Felder: `zug` (Zugnummer) und `gespielt` (Mini-id → Zugnummer). `zuletzt` bleibt das Sperrfenster (25). Pro Fertigkeit kommt jedes Mini einmal, danach das am längsten nicht gespielte. Alte oder beschädigte Stände werden rekonstruiert, nie geworfen. |
| Mischung | `Spiel.MINI.GENERIERT = 3` — jede dritte Frage darf generiert sein, damit die feste Rotation wirksam bleibt. |
| Generierte Fragen | `DATEN.fragenVorlagen` (11 Vorlagen) und `DATEN.fragenDenkfehler` (20 Denkfehler-Arten) in `src/daten/fragen-vorlagen.js`; `Spiel.fragen.erzeuge/erzeugeVoll/fuerSkill/merken/von/ausId/alle` in `src/spiel/fragen.js`. Id: `gf-<vorlage>-<seed>`, aus sich selbst wiederherstellbar. Generierte Fragen stehen **nicht** in `Spiel.mini.alle()`. |
| Nächster Schritt | `Spiel.naechster(inst)` → `{geraet, ziel, text, bereich}` oder ehrlich `null`; dazu `Spiel.naechsterBedarf/-Wartezeit/-Wann/-Stufe`, `FUEHRUNG_NACH_MS` 90 s, `FUEHRUNG_ZEIGEN_MS` 15 s, `NAECHSTER_WANN` (`azubi`/`azubi-plus` „nachzeit", `geselle` „nachfehler", `meister` „nein"). |
| Vierte Quelle | `quelle: "klassenraum"` ist aus dem sichtbaren Postfach, dem Offen-Zähler und der „Heute"-Kachel ausgenommen (wie `training`) und nimmt am Ereignistakt **nicht** teil. |

### 15.2 Verhalten, das vertraglich feststeht

1. **Rotation statt Filter.** Jedes Mini einer Fertigkeit kommt einmal dran, bevor sich eines wiederholt;
   bei echter Erschöpfung das am längsten nicht gespielte. Der Sprung auf „alle Kandidaten", der die
   Wiederholung erzeugte, ist entfernt. Alles deterministisch über `Zufall`, kein `Math.random`, kein Datum.
2. **Die Führung verrät nichts.** Der Statustext der Simulation *ist* die Lösung („An PC-Kasse eth0 steckt
   kein Kabel."). Bei Netz-Zielen zeigt der Fingerzeig deshalb nur Gerätename und Zieltext, nie die Ursache.
   Sie erscheint **nur auf Bedarf** (Knopfdruck oder 90 s ohne Fortschritt), einmal je Stillstand, und
   verschwindet, sobald der Schritt getan ist; `meister` bekommt sie nie ungefragt (§ 13.3 Punkt 3).
3. **Generierte Fragen sind bewiesen richtig.** Es gibt keinen Menschen, der sie vorher liest: die Vorlage
   rechnet ihre Lösung selbst, der Generator lässt nur Fragen durch, bei denen genau **eine** Option besteht,
   und der Test rechnet mit eigener Arithmetik nach und prüft jede falsche Option gegen die dokumentierte
   Denkfehler-Menge.
4. **§ 13.3.1 gilt auch über den Ereignisweg.** Der 20-Sekunden-Ereignistakt nimmt `training` und
   `klassenraum` aus — vorher zahlten beide über `weiterempfehlung` Ruf und legten neue Tickets an.
5. **Die Wiki zeigt nur, was das Spiel kann** — oder kennzeichnet den Befehl ausdrücklich als echtes Gerät
   („Echtes IOS, nicht das Labor"). Ein Wächter führt jede Rezeptzeile mit Prompt in der echten CLI aus.

### 15.3 Dateien der Umsetzung

`src/spiel/mini.js` · `src/spiel/mischer.js` · `src/daten/fragen-vorlagen.js` · `src/spiel/fragen.js` ·
`src/spiel/naechster.js` · `src/ui/netzplan.js` · `src/stil/naechster.css` · `src/spiel/ereignisse.js` ·
`src/spiel/hub.js` · `src/daten/hilfen.js` · `src/spiel/hilfe.js` · `src/ui/hilfe.js` ·
`src/daten/mini-denkhilfen.js` · `src/daten/mini-denkhilfen2.js` · `src/daten/wiki.js` ·
`src/ui/spiel.js` · `src/spiel/dex.js`

### 15.4 Stand

Vollständig umgesetzt und gemessen; die Zahlen stehen in § 14.4. Einzelbelege je Baustein:
`docs/entwicklung/Review – 2.0-Fundament.md` (unabhängige Gegenprüfung), `docs/CHANGELOG.md` und
`docs/entwicklung/Übergabe – Stand 2.0-Fundament.md`.

**Offen und bewusst so gelassen:** `Spiel.hilfe.passend` ist nicht skill-abhängig (der Streifen zeigt den
ersten sortierten Vorschlag; die zur Fertigkeit passende Sprosse wird über `leiter` hervorgehoben); die
`ticketId`-Blockade beim Nachfüllen gilt symmetrisch für alle unsichtbaren Quellen; die `.exe` ist nicht
neu gebaut.

## 16 · Welle 1 (2.1 + 3.0-Gerüst) — verbindlicher Vertrag (26.10.2026)

**Anlass.** Diese Session baut das Maximal-Programm 3.0 in Wellen. Welle 1 umfasst 2.1 S1/S2 (Wahrheit,
Korrektheit) sowie parallel UX-P1 und das Werkstatt-Gerüst. Damit Code und Doku nicht auseinanderlaufen,
steht hier zuerst die Datenform.

### 16.1 Eine Zahlenquelle: `docs/STAND.md` (generiert)

| Gegenstand | Festlegung |
|---|---|
| Erzeuger | `tools/stand.py` erzeugt `docs/STAND.md` und einen markierten Block in `README.md`. Quelle sind **Messungen** (Testlauf, Modulliste des Baus, Dateisystem), keine getippten Zahlen. |
| Blockmarker | `<!-- STAND:ANFANG -->` … `<!-- STAND:ENDE -->`. Handarbeit in diesem Bereich wird überschrieben. |
| Prüfmodus | `python tools/stand.py --pruefen` vergleicht den erzeugten Text mit den Dateien; Abweichung → Exit 1 mit betroffener Zeile. |
| Pflichtfelder | Fassung, Baukennung, Tests (grün/gesamt/übersprungen), Testdateien, headless Module, Bau-Module, `src/`-Dateien und -Zeilen (Methode benannt), Einzeldatei Bytes + SHA256, Inhalte (Tickets, Minis, Injektoren, Trainings, Wiki-Seiten, Fertigkeiten), `docs/doku`-Seiten. |
| Geltung | README, Liesmich, AGENTS, Bauen, SITZUNGSABSCHLUSS und CHANGELOG nennen diese Zahlen nur noch über `STAND.md`; historische Abschnitte bleiben unangetastet (nicht rückdatieren). |

### 16.2 Skip-Gate (2.1 S1; Code in Track B, weil `tests/*` dort liegt)

`tests/run.js` endet mit Exit 1, wenn `uebersprungen(ergebnisse) > 0`. Ein Test ohne Zusicherung gilt damit
als **rot**, nicht als grün. `tools/test.sh` reicht den Exit-Code unverändert durch; die Bilanzzeile bleibt
im Text. Die Definition „übersprungen = 0 Zusicherungen" (`tests/harness.js`) bleibt unverändert.

### 16.3 TTL und Probe-Art je Betriebssystem (2.1 S2)

| Gegenstand | Festlegung |
|---|---|
| TTL-Startwerte | `src/sim/l3.js`: Windows-Ziele 128, Linux-Ziele (Server/NAS mit Linux-Betriebssystem) **64**. Genau ein Startwert je **Endgerätetyp** (PC/Server/NAS), zentral in `l3.js`; Router, Switch und Internet führen ihre eigenen TTL-Konstanten in ihren Modulen (`router.js`, `switch.js`, `internet.js`) — das sind Gerätewerte, keine Endgerät-Startwerte. |
| Traceroute | Windows-Endgeräte senden ICMP-Echo; Linux-Endgeräte senden UDP-Proben auf hohe Ports, wie im Wiki gelehrt. Die sichtbare Ausgabe bleibt gleich; nur Sim-Gründe dürfen abweichen. |
| Referenzstand | `tests/sim-stand.json` wird nach der Änderung bewusst neu erzeugt; die Abweichung wird im CHANGELOG begründet. Danach ist `node tools/sim-stand.js` grün. |

### 16.4 Design-Tokens und Bewegung (UX-P1)

| Gegenstand | Festlegung |
|---|---|
| Dauer-Tokens | `--dauer-kurz:80ms` · `--dauer:160ms` · `--dauer-mittel:240ms` · `--dauer-lang:320ms`; Zähler `--dauer-zaehler:700ms` (Audit §4.1); Easings `--ease-standard`, `--ease-out`, `--ease-pop`. |
| JS-Zugriff | genau eine Funktion `UI.zeit()` liest Tokens per `getComputedStyle`; Animations-/Wartepfade in `src/ui/` enthalten keine ms-Literale mehr. Die Schrittweite der Simulation (`SCHRITT_MS`) bleibt Datenkonstante, wird aber an das Tempo gekoppelt. |
| Lesbarkeit | alle Text-Tokens ≥ 4,5:1 auf `--bg`/`--panel`/`--panel-2` in beiden Schemata; `--faint` wird angehoben, nicht nur dokumentiert. |
| Press | genau **eine** `.knopf:active`-Transform-Regel; Druck 80 ms. |
| Icons | UI-Chrome (Knöpfe, Überschriften, Chips) nutzt `UI.symbol`; Emoji nur in Klartext-Copy außerhalb der Chrome. |

### 16.5 Werkstatt-Gerüst (3.0, Welle 1; Track D)

**Wichtig:** Ein freies Labor existiert bereits (`UI.sandbox` in `src/ui/start.js`, Store `"sandbox"`,
`v:1`, Autosave bei `netz-geaendert`, erreichbar über „Freies Labor"). Die Werkstatt **erweitert** diesen Weg,
sie erfindet keinen zweiten.

| Gegenstand | Festlegung |
|---|---|
| Datenform | Speicher `"sandbox"` bleibt: `{v:1, netz}`. Neue **optionale** Felder (`name`, `vorlage`) dürfen ergänzt werden und müssen von alten Ständen toleriert werden (unbekannte Felder ignorieren, nie werfen). Die Karriere (`"labor"`) wird nie berührt. |
| Netzform | unverändert `{geraete:{id:{…}}, kabel:[…]}` wie `UI.labor.laden(netz, …)`; keine neuen Gerätetypen in Welle 1. |
| Module | neu `src/spiel/werkstatt.js` → `Spiel.werkstatt` (reine Logik: Vorlagen aus vorhandenen Netzen, `netzGueltig`, Namensvergabe, Duplizier-Helfer ohne UI). Neu `src/ui/werkstatt.js` → `UI.werkstatt` (Gerüst: Werkstatt-Leiste, Palette-Suche, Vorlagenliste). Neu `src/stil/werkstatt.css`. `bauen.py` lädt `src/spiel/*.js` und `src/ui/*.js` automatisch alphabetisch. |
| Editor-Mengen | Auswahl-Erweiterung ausschließlich UI-Zustand: `Z.auswahl` bleibt für Einzelgerät (Kompatibilität); neu `Z.auswahlSet` (Set von Geräte-ids) + `UI.labor.auswahlMehr()`. Duplizieren erzeugt **einen** Verlaufsschritt; Namen erhalten Suffix `-2`, `-3`; Kabel werden nicht mitdupliziert. |
| Minimap | reine Ansicht (SVG-Vorschau), keine Datenform, kein Speicher. |
| Wirkung vor Grün | Das Gerüst zählt erst als gebaut, wenn es aus dem echten Weg erreichbar ist: `UI.sandbox.laden()` → Werkstatt-Leiste, Beleg über `tests/ui-werkstatt.test.js`. Die Verdrahtung in `app.js`/`spiel.js` macht der Lead/Integrator (ein Schreiber). |
| Nicht in Welle 1 | Vorlagen-Inhalte (Track E), Challenge-Karten, PDU/PCAP, Export, neue Gerätetypen, Zonen. |

### 16.6 Schreibrechte Welle 1 (Auszug aus dem Task-Board)

Ein Schreiber je Datei. Geteilte Dateien (`src/daten/*`, Verdrahtung in `app.js`/`spiel.js`,
`docs/Architektur.md`) gehören dem Integrator (Lead). Kollision → nicht schreiben, Lead melden.

## 17 · Welle 2+3 (2.1 S3–S8) — verbindlicher Vertrag (29.10.2026)

**Anlass.** Nach Welle 1 (S1 Wahrheit, S2 Korrektheit) wird 2.1 zu Ende gebaut: S3 Prüfungsnähe/Generator,
S4 Hilfeleiter/Doku-Ziele, S5 Lehrtexte/Fragen/Dichte, S6a/S6b IPv6/Betrieb/WLAN, S7 Volumen/Terminologie,
S8 Fassung 2.1.0. Es gilt weiter: ein Schreiber je Datei, keine halbfertigen Beiträge, Wirkung vor Grün.

### 17.1 Drei neue Fertigkeiten (S6a/S6b) — **append-only**

| Index | id | Name | ap | stufe | Pflichtinhalte |
|---:|---|---|---|---:|---|
| 27 | `lab.ipv6` | IPv6: Adressen, Präfixe, NDP | AP1 | 5 | Wiki-Seite (≥4 Abschnitte, Quellen), Lehrtext E/AP1/AP2, 6 Minis, 1 Training, 1 Ticket, 1 Hilfe, Senior-Frage, Prüfungsfrage, ≥1 Injektor |
| 28 | `lab.betrieb` | Betrieb und Überwachung (Syslog, Schwellwert, Backup, Uptime) | AP2 | 5 | wie oben, 6 Minis, 1 Training, 1 Ticket, 1 Hilfe, ≥1 Injektor |
| 29 | `lab.wlan` | WLAN: SSID, VLAN, Sicherheit, Gastnetz | AP1 | 5 | wie oben, 8 Minis, 2 Trainings, 2 Tickets, 1 Hilfe, ≥2 Injektoren |

- **Anhängeregel:** ausschließlich ans **Ende** von `DATEN.skills`; bestehende Indizes 0–26 bleiben unverändert.
  `src/spiel/klassenraum-codec.js`: `TABELLE_SKILLS_LAENGE = 30`. Alte Codes bleiben gültig (Index < 27).
  Codec-Tests und Klassenraum-Tests müssen danach grün sein — **Go/No-Go nach 1 h Arbeit**; bricht der Codec,
  wird nicht weitergebaut, sondern der Lead informiert (Fallback: Inhalte unter bestehenden Fertigkeiten).
- **Ehrliche Grenze:** IPv6/Betrieb/WLAN werden **inhaltlich** geübt (Adressierung, Planung, Konfiguration,
  Bewertung), nicht paketweise simuliert. Jeder Lehrtext/Wiki-Abschnitt sagt das ausdrücklich.
- **Übungsformen ohne Simulation (verbindlich):** Wo die Simulation das Thema nicht ausführen kann, gibt es
  **kein** Training (Trainings erzeugen eine Sim-Instanz über einen Injektor) und **keinen** generierten
  Prüfungsfall. Stattdessen: Handticket mit Arbeitsziel (`notiz`/`tabelle`/`audit`/`befehl`/`antwort`) auf einem
  vorhandenen Netz, Minis, Wiki, Lehrtext, Hilfe, Senior-Frage. Prüfungs-Erreichbarkeit wird über den
  Handticket-Pool hergestellt (S3-Blueprint mischt generierte und handgeschriebene Tickets). Fehlende Trainings
  sind **namentliche Ausnahmen in `docs/STAND.md`** (2.1-Plan D4 erlaubt Ausnahmen mit Begründung) — keine
  Scheinbegründung, keine Umdeutung bestehender Injektoren. `lab.betrieb` darf vorhandene Störungs-Injektoren
  nutzen (Baustein „Störung erkennen und dokumentieren"), wenn das Ticket den Betriebsbezug ehrlich trägt.
- **Neue Sim-Gründe** sind nur zulässig, wenn sie in §5.3 dokumentiert werden und `tests/sim-stand.json`
  bewusst aktualisiert wird (mit Begründung im CHANGELOG); Standard ist: keine neuen Gründe.

### 17.2 Generator, Prüfung, Abnahme (S3)

| Gegenstand | Festlegung |
|---|---|
| Generierte Tickets | `symptomText`/`briefingText` liefern vier Bausteine (Anlass mit Zeit · Beobachtung in Kundensprache · Folge · was schon versucht wurde), **180–420 Zeichen**, 2–4 Sätze, **0 Ursachenwörter** (`docs/entwicklung/Stilfaden – Auftragstexte.md`), Titel 15–46 Zeichen, deterministisch über `Zufall` (kein `Math.random`, kein Datum). |
| Stil-Gate | `tools/texte-messen.js --pruefen` prüft 100 Seeds je Form (Prüfung, Tagesrätsel, Postfach) und die Handtickets; Exit 1 bei Verstoß. Wird als Test/CI-Schritt aufgerufen. |
| Prüfung | Alle **30** Fertigkeiten erreichbar (auch Stufe 6 und `lab.portsec`); keine Ausschlüsse `Math.min(5, …)`/Portsec mehr. Blueprint je AP1/AP2 (Fertigkeitssets), 3 Aufgaben/25 min und IHK-Notenschlüssel bleiben unverändert. |
| Abnahme-Regression | Basis-Paare zusätzlich zu ICMP: **Dienste** (HTTP, DNS, DHCP, Druckfreigabe/Port 445) und **Drucker-Endgeräte**; mindestens **5** Dienst-/Drucker-Fälle in den Tests; `REGRESSION_MAX` darf dafür angehoben werden. Keine neue Datenform. |

### 17.3 Hilfeleiter und Doku-Ziele (S4)

| Gegenstand | Festlegung |
|---|---|
| SENIOR_FRAGEN | Schlüssel = `DATEN.skills`-id; **30/30** vorhanden (heute 13/27). |
| Stufe 5 | Ohne eigenes `hilfen`-Feld **kein Lösungstext-Fallback**: nur Handlungshinweise (z. B. „Prüfe zuerst, ob …"); Stufe 6 bleibt „Lösung vorführen". |
| Doku-Ziel | Vorhandene Formen `notiz` (≥ 20 Zeichen) / `tabelle` / `audit` wiederverwenden; die 17 Briefings, die Protokoll/Wartungsbuch fordern, bekommen ein Ziel; Abnahme/Tests prüfen es. **Kein neuer Zieltyp**, keine neue Datenform. |
| Stufen 5/6 | Ausbau auf **≥10 / ≥8** Handtickets mit echten Themen (Firewall/Log, NAS-Rechte/Backup, Port-Security in der Halle, …); alle Texte im Stilfaden, Symptom ohne Ursachenwörter. |

### 17.4 Lehrtexte, Fragen, Dichte (S5)

- `lehrtexte.js`: **12** neue Texte — 9 fehlende Fertigkeiten (`lab.switch, lab.subnetz, lab.tcp, lab.cli,
  lab.speichern, lab.rostick, lab.portfwd, lab.dmz, lab.storage`) + 3 neue (`lab.ipv6, lab.betrieb, lab.wlan`)
  → **46** Texte auf 30/30 Fertigkeiten; Quellen nur Whitelist. **Datenform (append-only):** `DATEN.lehrtexte`
  bleibt für die 34 Sim-Codes unverändert; die 12 Skill-Texte kommen als zusätzliche Schlüssel mit der
  Skill-id dazu (`DATEN.lehrtexte["lab.switch"] = {titel, skill, E, AP1, AP2, quelle}`). `DATEN.lehrtextFuer(skill,
  niveau)` liefert den Text (Skill-Text hat Vorrang, sonst `null`). Der echte Consumer wird vom Lead verdrahtet
  (Ergebnis-/Erklärdialog: „Erklär mir das" zeigt den Skill-Text; kein toter Text). Der Dichte-Test zählt beide
  Quellen (Code-Text, der auf die Fertigkeit zeigt, **oder** Skill-Text).
- `fragen-vorlagen.js`: **20** Vorlagen auf **≥15** Fertigkeiten, je ≥2 Denkfehler-Familien; Lösung und Prüfung
  rechnen unabhängig (kein Vergleich mit dem Lösungstext), deterministisch.
**Zulässige Quellen (Content):** RFC, IEEE, ISO/IEC, BSI, ETSI, ITIL, SNIA, DSGVO/EU-Recht, Cisco-Dokumentation,
IHK-Rahmen (FIAusbV, KMK) — und ausdrücklich die **Wi-Fi Alliance** (WPA3-Spezifikation, Standardisierungsallianz).
Der Wächter-Test `tests/wiki-2.0.test.js` akzeptiert „Wi-Fi" bereits; die frühere Whitelist-Liste im
Staging-Dokument (`analysis/NetLab/drafts/INDEX.md`) ist damit überholt und keine Vertragsquelle.
- `tests/inhaltsdichte.test.js` (neu): Matrix **30 Fertigkeiten × 8 Zeilen** — Wiki (≥3 Abschnitte, Ziel ≥4),
  Lehrtext, ≥3 Minis, ≥1 Training, ≥1 Ticket, ≥1 Hilfe, ≥1 Senior-Frage, ≥1 Prüfungsfrage. Ausnahmen nur
  namentlich mit Begründung im Test (Vorbild: toter-Lehrtext-Test); Ziel 30/30.

### 17.5 Volumen, Welle 3 (S7)

Zielzahlen (Summenprobe aus 2.1-Plan §4): Tickets **76** · Minis **150** · Trainings **52** · Injektoren **55**
+ jede Fertigkeit ≥3 Injektor-Zuordnungen (23 fehlende Links) · Hilfe-Vorschläge **47** · Wiki **37** ·
Fragen **20/15** · Lehrtexte **46** · Doku-Ziele **17/17**. Dazu: Terminologie (Karriere-Stufe vs. Erklär­tiefe vs.
Niveau; „Broadcast-Domäne" einheitlich) dokumentiert; 5 Wiki-Vertiefungsseiten (VPN/IPsec, TLS/Zertifikate,
802.1X, Backup, Virtualisierung) mit ≥4 Abschnitten und Quellen; unabhängiger Faktencheck 100 Aussagen = 0 Fehler
oder benannte Ausnahmen. Jede Einheit mit Lernziel, Quelle, Test.

### 17.6 Fassung 2.1.0 und Auslieferung (S8; **nur nach Freigabe**)

- Fassung **2.1.0** erst, wenn alle Gates grün sind: `python tools/fassung-ziehen.py --neu 2.1.0` **Trockenlauf**,
  dann `--setzen`; `VERSION_CODE` in `android/bauen.py` von Hand **über** dem abgeleiteten Wert (Doku: 20006 → neu).
- Einzeldatei: Lizenzblock (PolyForm Noncommercial 1.0.0 + OFL-Hinweis mit Quellen) in den Bau aufnehmen
  (`tools/einfach.py`), `docs/index.html` und `Netzwerk-Labor.html` neu bauen, **byte-gleich**, 0 Außenverweise;
  `tools/stand.py` erneut erzeugen; `tools/seite.py` neu bauen.
- README als Produktseite (5-Minuten-Einstieg, FAQ/Troubleshooting, ehrliche Grenzen, Doku-Link), CHANGELOG 2.1.0,
  GitHub-Metadaten/Issue-/PR-Vorlagen/SECURITY/CONTRIBUTING als Dateien (kein Netz-Abruf, keine Release-API).
- Screenshots nur mit Browser; sonst 1.1.0 kennzeichnen und „nicht geprüft" schreiben.
- **Kein Commit, kein Push, keine Veröffentlichung** ohne ausdrückliche Nutzerfreigabe.

### 17.7 Zahlenkopplung und Tests

Tests, die Zählungen hart codieren (27 Fertigkeiten, 29 Wiki-Seiten, 45 Injektoren, 771/823 Tests, 5 Vorlagen …),
werden auf die Vertragswerte gezogen — **ohne** Abschwächung. Neue Tests je Owner in eigenen Dateien; nichts
gelöscht; 0 übersprungen (Skip-Gate). `docs/STAND.md` wird am Ende der Welle neu erzeugt.

### 17.8 Schreibrechte Welle 2 (ein Schreiber je Datei)

| Owner | Dateien (nur diese) | Nicht anfassen |
|---|---|---|
| **O1 · S3** | `src/spiel/generator.js`, `pruefung.js`, `abnahme.js`, `ticket.js`, `tools/texte-messen.js`, `tests/tickets-generator.test.js`, `tests/pruefung.test.js`, `tests/abnahme*.test.js`, neue `tests/texte-stil.test.js` | `src/daten/`, `src/ui/`, `src/sim/` |
| **O2 · S4** | `src/daten/hilfen.js`, `src/spiel/hilfe.js`, `src/daten/tickets-1-2.js`, `tickets-3-5.js`, `tickets-hotline.js`, `tickets-sicherheit.js`, `tickets-terminal.js`, neu `src/daten/tickets-3-0.js`, `tests/tickets-hand.test.js`, neue `tests/tickets-doku.test.js`, `tests/hilfe*.test.js` | `abnahme.js`, `src/ui/`, `src/sim/` |
| **O3 · S5** | `src/daten/lehrtexte.js`, `src/daten/fragen-vorlagen.js`, neu `tests/inhaltsdichte.test.js`, `tests/lehrtexte*.test.js`, `tests/fragen-vorlagen*.test.js` | `wiki.js`, `mini.js`, `basis.js` |
| **O4 · S6** | `src/daten/basis.js`, `wiki.js`, `mini.js`, `mini-denkhilfen*.js`, `trainings.js`, `src/spiel/klassenraum-codec.js`, `src/spiel/injektoren.js`, `tests/wiki-*.test.js`, `tests/daten-mini.test.js`, `tests/daten-trainings.test.js`, `tests/injektoren-*.test.js`, `tests/klassenraum-codec*.test.js`, `tests/mini-ausbau*.test.js` | `lehrtexte.js` (O3), `tickets-*.js` (O2), `generator/pruefung/abnahme` (O1) |
| **O5 · S8-Vorbereitung** | `README.md`, `docs/CHANGELOG.md`, neu `docs/FAQ.md`, `docs/Mitmachen.md`, `docs/Liesmich.md`, `docs/Bauen.md`, `docs/SITZUNGSABSCHLUSS.md`, `docs/bilder/HERKUNFT.md`, `tools/einfach.py`, `tools/fassung-ziehen.py` (Prüfmodus), `.github/**` (nur Doku/Templates) | `src/`, `tests/`, `docs/Architektur.md`, `docs/STAND.md` |
| **Lead** | `docs/Architektur.md`, Integration, S7-Dateien (Welle 3), Fassungszug/Bau nach Freigabe | – |

Kollision → nicht schreiben, Lead melden. Welle 3 (S7/S8-Endlauf) wird nach den Welle-2-Gates neu vergeben.

**Nachtrag 29.10.2026 (Integrationsänderungen, in § 17.8 noch nicht gelistet):** `src/daten/tickets-3-0.js`,
`src/spiel/szene.js`, `tests/spiel-szene.test.js`, `tests/spiel-ereignisse.test.js`, `tests/spiel-varianten.test.js`
(O2); `src/spiel/klassenraum.js`, `src/spiel/kompetenz.js`, `tests/klassenraum*.test.js`,
`tests/spiel-kundenakte.test.js` (O4); `src/ui/erklaeren.js`, `src/ui/spiel.js` (Lehrtext-Consumer, § 17.4),
`src/stil/spiel.css` (Klasse `sp-lehrtexte`), `tests/ui-spiel-ergebnis.test.js` (Lead-Integration);
`docs/entwicklung/Terminologie.md` (O5). Alle übrigen Dateien des Arbeitsbaums liegen in den Scopes der
Tabelle. Die QA führt diese Liste als „Integrationsänderungen" und prüft sie in der Stichprobe.

### 17.9 Klassenraum-Tabellen und Ticketwachstum (Entscheidung 29.10.2026)

**Befund.** Das Auftrags-Codec hat 6 Bit Auftragsindex (0..63, Format § 1.2). 2.1 waechst von 58 auf 76
Handtickets. Die Tabelle TABELLE_AUFTRAEGE in src/spiel/klassenraum.js ist ein **Literal** (eingefrorene
Bindung, § 2.3 Regel 1) - alte Codes bleiben dadurch gueltig, auch wenn neue Tickets an anderer Stelle der
lebenden Reihenfolge stehen. Die lebende Reihenfolge (Spiel.ticketReihe()) ist **nicht** die Codec-Tabelle;
ein Neu-Einfrieren aus der lebenden Reihenfolge waere ein Bruch.

**Entscheidung.**
1. **Kein Formatwechsel** in 2.1 (keine 7-Bit-Indizes). Die 6-Bit-Grenze bleibt; das Format wird erst in 3.1
   angehoben (dann mit Fassungs-/Migrationsweg, vgl. § 12.4).
2. TABELLE_AUFTRAEGE bleibt **unveraendert die 58 IDs in historischer Reihenfolge**;
   TABELLE_AUFTRAEGE_LAENGE = 58 bleibt. Die 15 neuen 2.1-Handtickets (S4/S6) sind **nicht
   klassenraum-adressierbar**; das wird im Codec-Kopf und in § 12.2/3.1 dokumentiert. Fuer 3.1 werden sie
   beim Formatwechsel hinten angehaengt.
3. **Keine Umsortierung** bestehender oder neuer Tickets, um eine "lebende Reihenfolge" zu erzwingen
   (neue Stufe-5-Tickets koennen nicht hinter alten Stufe-6-Tickets sortieren, ohne die Karriere-Reihenfolge
   zu verbiegen).
4. **Test-Invariante statt Gleichheit:** die Tests pruefen (a) alle 58 IDs der Tabelle existieren genau
   einmal in DATEN.tickets, (b) die Tabelle ist unveraendert 58 lang und hat keine Duplikate, (c) **alte
   Codes bleiben stabil**: Beispielcodes fuer Index 55/56/57 dekodieren weiterhin zu storage-01/02/03
   (Regressionsfall), (d) Fertigkeitentabelle = 30, (e) die lebende ticketReihe() darf wachsen (73 -> 76)
   und wird nicht mit der Codec-Tabelle gleichgesetzt.
5. Ehrliche Grenze: 3.1 muss vor dem Klassenraum-Feldtest das Format anheben und die neuen Tickets
   anhaengen - sonst sind nur 58 von 76 Auftraegen per Code aufrufbar.







## 18 · Frontend-Redesign — Gestaltungsvertrag (29.10.2026) — verbindlicher Vertrag

**Anlass.** Der Nutzer hat ein „komplettes Redesign des Frontends" beauftragt: **Optik + Shell neu,
Bedienlogik und Ansichten bleiben** (Übergabe 29.10.2026 § 1). Drei Bild-Vorlagen liegen unter
`Nachweise/Prototypen-Redesign/` (nicht versioniert, weil `Nachweise/` in der `.gitignore` steht);
Basis ist **A · „Matrix-Elegant"**. Dieser Abschnitt ist die **eine Quelle** für Farbtokens, Typo-Skala,
Shell-Maße, Komponenten und die Zuordnung zu den Dateien — nach der Projektregel „Vertrag zuerst"
(`AGENTS.md`): erst diese Datenform, dann Code.

**Belege.** Alle hier genannten Werte stammen entweder aus `matrix/NOTIZ.md` (Prototyp, dort am Pixel
geprüft) oder aus `BRIEF.md`; abgeleitete Werte sind ausdrücklich als **abgeleitet** gekennzeichnet und
werden im Umbau gemessen. Nichts hier ist eine Behauptung über den heutigen Code, ohne dass es an
`src/stil/basis.css` dieser Sitzung geprüft wurde.

### 18.1 Geltung und Nicht-Ziele

| Gegenstand | Festlegung |
|---|---|
| Gilt für | alle sichtbaren Flächen des Web-/Windows-/Einzeldatei-Baus: Tokens, Typo, Shell (Kopfzeile, linke Leiste, Statusfuß), Karten, Knöpfe, Dialoge, Toasts, Netzfläche, Werkzeuge, alle Ansichten |
| Gilt **nicht** für | Bedienlogik, DOM-Verträge, Datenformen, Simulation, Tests mit Verhaltenszusicherung, Inhaltstexte. Diese bleiben **unangetastet** (§ 18.11) |
| Basis-Vorlage | **A · Matrix-Elegant** (`Nachweise/Prototypen-Redesign/matrix/`, `matrix-board.png`, `-hub`, `-labor`, `-stil`) |
| Alternativen | B · Holo-Suite und C · Neon-Blueprint bleiben als Stimmungshilfen liegen; einzelne Ideen (z. B. C für Netz-Annotationen) sind **kein** Vertragsbestandteil |
| Nicht-Ziele | keine neuen Ansichten, keine neuen Gerätetypen, keine neuen Inhalte/Tickets, kein Umbau der Android-Eigenheiten (`android/mobil/mobil.css`) über die gemeinsamen Tokens hinaus, keine Änderung an `tests/sim-stand.json` |
| Grundsatz | Die Vorlage ist **Stimmungsvorlage**, keine 1:1-Implementierung: Mikrolabels 8–9 px werden auf ≥ 11 px gehoben (§ 18.5), die Dichte sinkt dadurch leicht — gewollt |
| Veraltet | § 16.4 bleibt in Kraft (Bewegung, Icon-Regel, Press-Regel), wird aber durch § 18.5–18.9 ergänzt. Bei Widerspruch gilt § 18 |

### 18.2 Farbtokens — dunkel (Standard)

Der Grund ist **schwarzgrün, nicht blau**: A ersetzt die alte Blau-Leitstand-Palette. Spalten:
Token · heutiger Wert (v2.1.0, gemessen in `basis.css`) · neuer Wert (A) · Bedeutung.

| Token | v2.1.0 | A (neu) | Bedeutung / Verwendung |
|---|---|---|---|
| `--bg` | `#0E131B` | **`#04070A`** | Fläche hinter allem; Grund der App |
| `--bg-raster` | `#16202D` | **`rgba(163,255,214,.06)`** | 24-px-**Punktraster** als Textur (Punkte 1 px, Abstand 24 px) — ersetzt die Linienraster-Optik |
| `--panel` | `#141B26` | **`#08100C`** | Paneele: Inspektor, Dock, Kopfzeile, Leiste, Kartenflächen |
| `--panel-2` | `#1B2433` | **`#0B160F`** *(abgeleitet)* | abgesetzte Felder (Chips, Eingaben, Listenzeilen) |
| `--panel-3` | `#233047` | **`#101D16`** *(abgeleitet)* | Hover, aktive Reiter, gedrückte Flächen |
| `--line` | `#2A3649` | **`rgba(163,255,214,.10)`** (Swatch `#1A2B23`) | **Haarlinien**: 1 px, Rahmen, Trenner |
| `--line-2` | `#3A4A62` | **`rgba(163,255,214,.18)`** *(abgeleitet)* | betonte Linien: Fokusrahmen, aktive Kante, Tabellenkopf |
| `--ink` | `#E6ECF5` | **`#E8F4ED`** | Text |
| `--muted` | `#93A1B8` | **`#97AC9F`** | Nebentext |
| `--faint` | `#8A98AD` | **`#7C9386`** | gedämpft (bleibt ≥ 4,5:1, § 18.12) |
| `--accent` | `#4FC3F7` | **`#30E58B`** | **Handlungsfarbe**: genau ein Hauptknopf, aktiver Weg, Fokus — sonst nichts |
| `--accent-ink` | `#06121C` | **`#04120A`** | Text auf Akzentfläche |
| `--accent-soft` | `#12324A` | **`#0E2A1C`** *(abgeleitet)* | Akzent-Hauch: aktive Fläche, Auswahl |
| `--ok` | `#4ADE80` | **`#54E6A8`** | Erfolg/Ziel erreicht (Semantik) |
| `--ok-soft` | `#0F3322` | **`#0B2A1B`** *(abgeleitet)* | Erfolgsfläche, sparsam |
| `--warn` | `#FBBF24` | **`#F2C14E`** | Warnung (Semantik, nie Fläche) |
| `--warn-soft` | `#3A2D0B` | **`#2E2410`** *(abgeleitet)* | Warnzeile, 2-px-Kante (§ 18.8) |
| `--bad` | `#F87171` | **`#FF6B8A`** | Fehler (Semantik, nie Fläche) |
| `--bad-soft` | `#3B1515` | **`#33121C`** *(abgeleitet)* | Fehlerfläche, sparsam |
| `--info` | `#A78BFA` | **`#22D3EE`** | Zusatzinfo / seltener **Daten**-Akzent (Sekundärfarbe A) |
| `--info-soft` | `#271D45` | **`#0A2630`** *(abgeleitet)* | Info-Fläche |
| `--glas` | `rgba(20,27,38,.82)` | **`rgba(4,7,10,.82)`** | halbdurchsichtige Werkzeugleisten über der Netzfläche |
| `--leiste-bg` | `rgba(20,27,38,.94)` | **`rgba(4,7,10,.94)`** | linke Leiste |
| `--schatten` | `0 10px 30px rgba(0,0,0,.45)` | **`0 12px 32px rgba(0,0,0,.55)`** — nur Overlays (Dialog, Menü, Toast); **`--glow: 0 0 0 1px rgba(48,229,139,.35), 0 0 24px rgba(48,229,139,.18)`** — nur Hauptknopf `.knopf.primaer` | A: keine Karten-Schatten, Tiefe kommt aus Haarlinien; Glow ist Handlungsfarbe |

**Akzent-Disziplin (verbindlich, aus A):** Emerald `#30E58B` ist **eine** Handlungsfarbe je Bildschirm
(ein Hauptknopf, aktiver Weg, Fokus). Cyan `#22D3EE` erscheint nur als seltener Daten-Akzent.
Warnung/Fehler bleiben **Semantik** (Text, Kante, Punkt) und werden **nie** flächig.
Keine Scanlines, keine Glitches, kein Matrix-Zeichenregen — die Anmutung kommt aus Raster, Haarlinien
und Disziplin.

### 18.3 Farbtokens — hell (Ableitung)

Hell war in **keiner** Vorlage entworfen (nur dunkel). Es wird aus den A-Tokens abgeleitet, damit die
Bedeutung wandert und nicht die Optik: gleiche Hue-Familie (grünlich-neutral), Emerald wird zum
**dunklen** Handlungsgrün, damit der Kontrast auf hellem Grund trägt.

| Token | hell (abgeleitet) | Begründung |
|---|---|---|
| `--bg` | `#F2F6F3` | helles Grün-Grau, kein reines Weiß |
| `--bg-raster` | `rgba(11,90,58,.10)` | Punktraster bleibt sichtbar, aber leise |
| `--panel` | `#FFFFFF` | Paneele heben sich vom Grund |
| `--panel-2` | `#F7FAF8` | abgesetzte Felder |
| `--panel-3` | `#E8EFEA` | Hover/aktiv |
| `--line` | `#D2DED7` | Haarlinien |
| `--line-2` | `#B4C6BB` | betonte Linien |
| `--ink` | `#0B1512` | Text |
| `--muted` | `#4C5F56` | Nebentext |
| `--faint` | `#5C7066` | gedämpft (≥ 4,5:1 auf `--bg`/`--panel`) |
| `--accent` | `#0B7A4B` | Handlungsgrün dunkel; auf Weiß ≥ 4,5:1 (im Umbau gemessen) |
| `--accent-ink` | `#FFFFFF` | Text auf Akzentfläche |
| `--accent-soft` | `#DDF3E7` | Akzent-Hauch |
| `--ok` | `#0F7A3E` · `--ok-soft` `#DDF3E7` | Erfolg |
| `--warn` | `#8A5A00` · `--warn-soft` `#FBF0D6` | Warnung |
| `--bad` | `#A81E42` · `--bad-soft` `#FBE4EA` | Fehler |
| `--info` | `#0E7490` · `--info-soft` `#DDF1F5` | Info |
| `--glas` / `--leiste-bg` | `rgba(255,255,255,.86)` / `rgba(255,255,255,.95)` | Werkzeugleisten |
| `--schatten` | `0 12px 32px rgba(20,32,51,.18)` (nur Overlays) | Tiefenschatten bleibt neutral |
| `--glow` | `0 0 0 1px rgba(11,122,75,.25), 0 0 24px rgba(11,122,75,.12)` (nur Hauptknopf) | Glow bleibt Handlungssache |

**Pflicht:** Hell wird **gleichwertig** geprüft (beide Schemata, `ui-kontrast.test.js`, Screenshots).
Kein Token darf nur im dunklen Schema existieren.

### 18.4 Semantik- und Datenfarben, die **nicht** wandern

Diese Farben tragen **Bedeutung** und werden aus A **nicht** umgefärbt; sie werden nur an die neuen
Flächen geprüft (Kontrast/Haarlinien):

- Protokollfarben `--p-arp … --p-http`, VLAN-Farben `--vlan-1 … --vlan-8`, Zonen `--zone-a … --zone-e`
  (samt `-linie`): unverändert (jede Farbe erscheint immer **mit** Beschriftung).
- Gerätetyp-Farben `--typ-router … --typ-internet`: unverändert.
- Shop-Akzentfarben (`data-akzent`: bernstein/minze/koralle/violett) in `aussehen.css`: **unverändert**,
  inklusive der Regel, dass sie nur Shop-Flächen färben; sie müssen auf `--panel`/`--panel-2` lesbar bleiben.
- Leistenstile (`data-leiste`) in `leiste.css`: **unverändert** erhalten (Auswahl bleibt sichtbar).
- `--geld` (Gold) und `--ruf` (Ruf): bleiben Datenfarben und werden nicht zu Akzentfarben.

### 18.5 Typografie

**Schriften** (unverändert, bereits in `basis.css` und im Projektstamm `schriften/`):
`--display: Bricolage Grotesque` (600/800 — Wortmarke, H1, Kartentitel, Knöpfe),
`--body: Atkinson Hyperlegible` (400/700 — Fließtext, Zeilen),
`--mono: JetBrains Mono` (400/600 — Mikrolabels, IPs, Messwerte, Statuszeile).
**Keine neuen Schriftdateien, keine Netzschriften.**

**Skala (verbindlich, ersetzt die sechs Stufen aus § 16.4):**

| Token | px | Verwendung in A |
|---|---|---|
| `--fs-1` | **11** | Mikrolabels (Mono, Versalien, Sperrung `.08em`, `//`-Präfix), SVG-Beschriftung, Chips, Statuszeile — **Untergrenze für funktionale Beschriftung** |
| `--fs-2` | **12.5** | dichte Zeilen, Tabellen, Hinweise |
| `--fs-3` | **14** | Standard-Fließtext in Karten und Formularen |
| `--fs-4` | **16** | Grundtext (`body`) |
| `--fs-5` | **20** | Kartentitel, Abschnittsüberschriften |
| `--fs-6` | **28** | H2/Ansichtstitel |
| `--fs-7` | **34** | *(neu)* H1 klein / große Zahlen |
| `--fs-8` | **44** | *(neu)* H1 der Vorlage A (44/46) |

**Regeln:**
- Funktionale Beschriftung **nie unter 11 px** (Projekt-Gate `ui-typografie.test.js`); die 7–10-px-Labels
  der Vorlage werden auf `--fs-1` gehoben. Die Bilder sind Stimmungsvorlage, keine 1:1-Implementierung.
- Mono nur für **Daten** (IPs, Ports, Messwerte, Status, Mikrolabels) — nicht für Fließtext.
- **13 px und 15 px** sind Altlasten aus v2.1.0 (`--fs-`-Nachbarwerte); sie werden beim Umbau ersetzt.
  Bis eine Datei umgestellt ist, bleiben sie in `ethos.py` erlaubt, dürfen aber **nicht** neu entstehen.
- H1/H2 mit `line-height: 1.1–1.15`, `text-wrap: balance` (bestehende Regel bleibt).
- Satzbreite: Fließtext max. **72 Zeichen** (`ch`) je Spalte; Karten mit Fließtext ≥ 320 px.

### 18.6 Raster, Abstände, Radien, Schatten

| Gegenstand | Festlegung |
|---|---|
| Abstands-Skala | **4 · 8 · 12 · 16 · 24 · 32 px** (unverändert aus § 16.4; die Vorlage nutzt genau dieses Raster) |
| Grundraster | 8-px-Grundraster, 4-px-Halbschritte; Shell-Breiten in § 18.7 |
| Radien | **4 / 8 / 12 px** — `--radius-xs:4px` · `--radius-s:8px` · `--radius:12px`; Kreise `999px`/`50%`. Die alten Werte **6 px und 10 px entfallen** |
| Schatten | **nur** am Hauptknopf (`--glow`); Karten und Paneele **ohne** Schlagschatten (Trennung über Haarlinien/Flächen); nur Overlays (Dialog, Menü, Toast, Leistenkarte im Browser) dürfen den neutralen `--schatten` tragen |
| Rahmen | 1 px Haarlinie (`--line`); betonte Kante 2 px (`--accent` aktiv, `--warn` Warnzeile, `--bad` Fehler) |
| Textur | 24-px-Punktraster im Hintergrund der Arbeitsfläche (`--bg-raster`), **max. eine** Textur je Bildschirm; keine Scanlines |
| Kontrast | alle Text-Tokens ≥ **4,5:1** auf `--bg`/`--panel`/`--panel-2` in **beiden** Schemata; Nicht-Text (Linien, Icons) ≥ 3:1 |

### 18.7 Shell — Kopfzeile, linke Leiste, Statusfuß

A ersetzt die v2.1.0-Shell (Kopf 54 px, `--kopf-h`; Dock 76 px, `--dock-b`) durch:

| Bauteil | Maß | Inhalt und Verhalten (Optik neu, Bedienung gleich) |
|---|---|---|
| Kopfzeile | **56 px** (`--kopf-h`) | links Wortmarke **Netzwerk-Labor** + Fassungs-Chip `v2.1`→`v2.2` (aus `STAND.md`, nicht getippt); Mitte **vier Werte-Chips** (bestehende Werte, keine neuen Daten); rechts Suche mit `Strg+K`, Theme/Umschalter, Zahnrad (Einstellungen), Hilfe. Rechte Seite ist eine **ruhige Werkzeugleiste** (Symbolknöpfe 40×40) |
| Linke Leiste | **88 px** (`--leiste-w`) | **alle sieben Wege** (unverändert in Anzahl, Reihenfolge und Ziel): Symbol + Text untereinander; aktiver Weg mit **2-px-Emerald-Kante links** und leichtem Flächenhauch (`--accent-soft`); Weg-Höhe 80 px, Trefferfläche volle Breite |
| Statusfuß | **28 px** (`--fuss-h`, neu) | reine **Anzeige** (Serie, SIM-Werte, Verbindung): Mono `--fs-1`, `--muted`; keine Knöpfe, keine Trefferflächen |
| Arbeitsfläche | Rest | Layout-Raster unverändert (Leiste + Inhalt + Dock); Dock bleibt **76 px** (`--dock-b`), Reiter 44 px hoch |
| Kopfzeilen-Hintergrund | — | `--panel` mit unterer Haarlinie; **kein** Verlauf, keine Unschärfe außer `--glas` über der Netzfläche |
| Mobile/Leistenmodus | 300 × 56 | Leistenmodus bleibt erhalten und wird in `tools/rauch.py` bei 1366/960/720 geprüft |

**Wichtig:** Die Shell ist **Optik + Anordnung**, keine neue Navigation. Jeder heutige Weg bleibt
erreichbar, jede heutige Taste (`Strg+K`, `Esc`, Reiterwechsel) behält ihre Wirkung.

### 18.8 Komponenten-Inventar (verbindlich)

Jede Komponente existiert **einmal** als Klasse in `basis.css` (Grundform) bzw. in der Datei ihres
Bereichs; Bereichsdateien dürfen sie nur über Tokens einfärben, nicht neu erfinden.

| Komponente | Klasse/Vertrag | Maße und Regeln |
|---|---|---|
| Mikrolabel | `.mikro` | Mono `--fs-1`, Versalien, Sperrung `.08em`, `--muted`/`--faint`, optional `//`-Präfix; **keine** 8-px-Labels |
| Karte | `.karte` | `--panel`, 1-px-`--line`, Radius `--radius`, Innenabstand 12/16 px, **kein** Schatten |
| Chip | `.chip` | `--panel-2`, Radius `--radius-xs`, Höhe 24 px, Mono `--fs-1`, Zahl + Bezug als Text |
| Knopf (Standard) | `.knopf` | Höhe 40 px, Radius `--radius-s`, `--panel-2` + Haarlinie, Text `--fs-3`; Hover `--panel-3` |
| Hauptknopf | `.knopf-haupt` | Höhe 44 px, `--accent`-Fläche, `--accent-ink`-Text, **einziger** Glow (`--schatten`); **genau einer** je Bildschirm |
| Symbolknopf | `.knopf-symbol` | 40 × 40 px, Symbol aus `UI.symbol` (SVG), `aria-label` Pflicht |
| Reiter | `.reiter` | Höhe 44 px, aktiver Reiter: `--accent`-Unterkante 2 px + `--panel-3`; Trefferfläche volle Reiterbreite |
| Leistenweg | `.weg` | Höhe 80 px, Symbol + Text, aktiver Weg: 2-px-Kante `--accent` links, Fläche `--accent-soft` |
| Warnzeile | `.warnzeile` | `--warn-soft`-Fläche, **2-px-`--warn`-Kante links**, Text `--warn`/`--ink`, max. zwei Zeilen |
| Statuspunkt | `.punkt` | 8 px, `--ok`/`--warn`/`--bad`, **immer mit Text** daneben (nie nur Farbe) |
| Wertanzeige | `.wert` | Mono `--fs-1`, Label + Wert, in Chips/Statusfuß |
| Dialog/Toast | bestehende Klassen in `spiel.css`/`toast.js` | Fläche `--panel`, Haarlinien, Radius `--radius`, ohne Schatten; Toast oben rechts, 160 ms (§ 18.9) |
| Feld/Eingabe | bestehende Klassen | `--panel-2`, Haarlinie, Fokus 2 px `--accent`, Höhe 36 px |
| Rastertextur | `.raster` (Arbeitsfläche) | 24-px-Punktraster, `--bg-raster`, nur Hintergrund |

**Trefferflächen (Gates):** Knöpfe 40–44 px, Symbolknöpfe 40 × 40, Reiter 44 px, Leistenwege 80 px;
auf Fingergeräten (Android) ≥ 44 px (`ui-trefferflaechen.test.js`, § 11.5 bleibt in Kraft).
Die Statuszeile (28 px) ist **reine Anzeige** und hat bewusst keine Trefferfläche.

### 18.9 Bewegung

Unverändert aus § 16.4 (vier Stufen `--dauer-kurz:80ms`, `--dauer:160ms`, `--dauer-mittel:240ms`,
`--dauer-lang:320ms`, Zähler `--dauer-zaehler:700ms`; Easings `--ease-standard`, `--ease-out`,
`--ease-pop`; genau **eine** `.knopf:active`-Regel; `UI.zeit()` bleibt der einzige JS-Zugriff).
Neu ist nur die **Zuordnung**: Hover/Fokus 80–160 ms, Reiter/Leiste 160 ms, Dialog/Toast 160–240 ms,
Glow am Hauptknopf 240 ms. `prefers-reduced-motion` und `html[data-bewegung="aus"]` gelten unverändert.

### 18.10 Zuordnung — Datei, Aufgabe, Reihenfolge

| Datei | Aufgabe in A | Welle |
|---|---|---|
| `src/stil/basis.css` | **Tokens** (§ 18.2/18.3), Typo-Skala (§ 18.5), Raster/Radien/Schatten, Grundformen `.mikro .karte .chip .knopf .knopf-haupt .knopf-symbol .reiter .warnzeile .punkt` | 1 |
| `src/stil/rahmen.css` | Shell: Kopfzeile 56, Statusfuß 28, Layout, Dock-Rahmen | 1 |
| `src/stil/leiste.css` | linke Leiste 88 px, sieben Wege, aktive Kante | 1 |
| `src/stil/hub.css` | Hub: Hauptaktion, „Dein nächster Auftrag", drei Kacheln | 1 |
| `src/stil/szene.css` | Netzfläche: Punktraster, Geräte-Karten, Kabel, gestrichelte Amber-Linie als einziger „Defekt" | 1 |
| `src/stil/spiel.css` | Dialoge, Auftragszeile, Toasts, Ergebnisflächen | 1/2 |
| `src/stil/inspektor.css` | Inspektor-Karten, Reiter, Listenzeilen | 1/2 |
| `src/ui/app.js` | Kopfzeilen-Markup (Werte-Chips, Suche, Symbolknöpfe) — **nur Optik/Markup**, keine Bedienlogik | 1 |
| `src/ui/leiste.js` | Weg-Anordnung (sieben Wege, Symbole) — Ziele unverändert | 1 |
| `src/ui/hub.js` | Hub-Struktur (Hauptaktion, Kacheln) — Funktionen unverändert | 1 |
| `src/stil/aussehen.css` | Shop-Akzentfarben **unverändert**, an neue Flächen prüfen | 2 |
| `src/stil/akte.css` · `karriere.css` · `hilfe.css` | Postfach, Kunden, Wiki | 2 |
| `src/stil/start.css` · `lernstand-hilfe.css` · `klassenraum.css` | Shop, Lernstand, Klassenraum | 2 |
| `src/stil/editor.css` · `terminal.css` · `konsole.css` · `simulation.css` | Dock, Terminal, Konsole, PDU | 2 |
| `android/mobil/mobil.css` | nur gemeinsame Tokens; **kein** Layout-Umbau | 2 |
| `tools/ethos.py`, `tests/stil-stand.json` | Gates auf das neue System ziehen (§ 18.12) | 1, **nach** diesem Vertrag |

**Ein Schreiber je Datei** (§ 16.6/§ 17.8 bleibt in Kraft). `docs/Architektur.md`, `basis.css` und die
Verdrahtung in `app.js` gehören dem Integrator; Kollision → nicht schreiben, melden.

### 18.11 Verhalten und Verträge, die **unverändert** bleiben

1. **Datenformen** aus § 10–§ 17 (Speicherstände, Codecs, Ticket-IDs, Klassenraum, Lernstand) — keine Änderung.
2. **DOM-/Klassen-Verträge**, die Tests und Bedienung nutzen (IDs, `data-*`, Rollen, Tastaturwege,
   `Strg+K`, `Esc`, Reiter-Reihenfolge, Dock-Reihenfolge). Neue Klassen sind erlaubt, bestehende dürfen
   **nicht umbenannt** oder entfernt werden, solange Tests sie prüfen.
3. **Ansichten und Wege**: 14 Ansichten, sieben Leistenwege, Dock-Reiter unverändert in Anzahl, Reihenfolge
   und Ziel (kein toter Weg, `tools/stand.py --pruefen` 0 tote Verweise).
4. **Shop-Akzente** (`data-akzent`) und **Leistenstile** (`data-leiste`) unverändert sichtbar.
5. **Emoji-Regel** (§ 16.4): UI-Chrome nutzt `UI.symbol` (SVG); Emoji nur in Klartext-Copy.
6. **Determinismus** und Simulation unberührt: `node tools/sim-stand.js` unverändert.
7. **Bewegung aus** (`data-bewegung="aus"`, `prefers-reduced-motion`) wirkt weiterhin auf **alle** neuen
   Übergänge.
8. **Android** bleibt lauffähig; gemeinsame Tokens dürfen mobil nur über `basis.css` wirken.

### 18.12 Teststrategie und Gestaltungs-Gates

Die Gates werden **bewusst auf das neue System gezogen, nicht abgeschwächt** (Nutzerentscheidung § 1).
Reihenfolge: erst Vertrag (dieser Abschnitt), dann Gates, dann Code — nie „nebenbei".

**A · Gates anpassen (nur nach diesem Vertrag):**

| Gate | Änderung | Bedingung |
|---|---|---|
| `tools/ethos.py` `SCHRIFT_SKALA` | `{11,12,13,15,20,28}` → **`{11,12.5,13,14,15,16,20,28,34,44}`** (13/15 als sinkende Altlast) | Skala deckt § 18.5; keine neuen Ausreißer |
| `tools/ethos.py` `RADIUS_ERLAUBT` | **unverändert** (`999px`, `50%`, `0`): die neuen Radien laufen **ausschließlich** über die Tokens `--radius-xs` 4 / `--radius-s` 8 / `--radius` 12; Radius-Literale (heute u. a. 6/10 px) werden beim Umbau zu Tokens | Radien-Skala § 18.6, Token-Disziplin |
| `tools/ethos.py` `ABSTAND_SKALA`, `DAUER_SKALA` | **unverändert** (4·8·12·16·24·32; 1/160/320 ms) | A passt in die bestehende Skala |
| `tests/stil-stand.json` | mit **`python tools/ethos.py --neu --stand tests/stil-stand.json`** neu einfrieren — **erst wenn** der Umbau steht und die Zahlen **nicht steigen** | Einfrieren ist Dokumentation, kein Verstecken |
| `tests/ui-typografie.test.js` | auf acht Stufen und `--fs-1` = 11 px ziehen; SVG-Beschriftung ≥ `--fs-1` bleibt Pflicht | funktionale Labels ≥ 11 px |
| `tests/ui-kontrast.test.js` | auf die neuen Tokens paaren; `--faint` ≥ 4,5:1 auf `--bg`/`--panel`/`--panel-2` in beiden Schemata | § 18.6 |
| `tests/ui-trefferflaechen.test.js` | neue Komponentenmaße (§ 18.8) als Soll; Leistenweg 80, Reiter 44, Symbolknopf 40 | § 18.8 |
| `tests/ui-symbole.test.js` | unverändert (SVG-Chrome, Emoji-Regel) | § 16.4 |
| `tests/ui-leiste-ueberlappung.test.js` | auf Leiste 88 px / sieben Wege ziehen; **keine** Überlappung | Shell |
| `tests/klassen-20.test.js` | unverändert (Klasse ↔ CSS); neue Klassen brauchen Regeln | `python tools/klassen.py` = 0 |
| `tests/texte-stil.test.js` | unverändert (Textstil, keine Optik) | — |

**B · Verhaltenstests unangetastet:** alle übrigen Tests (Simulation, Tickets, Klassenraum, Lernmotor,
Hilfe, Inhalte) werden **nicht** angepasst, um Rot zu verdecken. Ändert sich ein Verhaltenstest, ist das
ein **Befund** und wird im Bericht benannt.

**C · Messpflicht nach jedem Schritt** (App bleibt lauffähig):
`python bauen.py` → `sh tools/test.sh` (**873/873 grün, 0 übersprungen** als Ausgangsstand; die aktuelle
Zahl steht in `docs/STAND.md`) → `python tools/ethos.py` → Sichtkontrolle per Screenshot
`python tools/starttest.py docs/index.html --bild …` bei **1366 / 960 / 720 px**:
keine abgeschnittenen Texte, keine Überläufe, Raster und Kontraste passen.

**D · Abnahme Gates (Welle-Abschluss):** `sh tools/test.sh --rauch` (45/45), `python tools/ethos.py --dom`,
`node tools/sim-stand.js` (unverändert), `python tools/stand.py --pruefen`,
`python tools/seite.py --pruefen`, `python tools/klassen.py`, `python tools/stand.py --pruefen`
(0 tote Verweise). Belege in `Nachweise/redesign/welle1-abnahme.md` bzw. `welle2-abnahme.md`.

**E · Screenshot-Belege** (nicht versioniert): `Nachweise/redesign/1366/…`, `960/…`, `720/…` je Ansicht;
je Bild geprüft und im Beleg mit Pfad und Datum genannt.

### 18.13 Umsetzung und Definition of Done

| Welle | Inhalt | Done-Kriterium |
|---|---|---|
| 1 | Tokens, Typo, Shell (Kopf 56, Leiste 88, Statusfuß 28), Hub, Labor-Chrome | Hub, Labor und Leiste sichtbar in A; Tests 873/873; Screenshots 1366/960/720; `welle1-abnahme.md` |
| 2 | restliche Ansichten und Werkzeuge (Postfach, Kunden, Wiki, Lernstand, Shop, Einstellungen, Klassenraum, Dock, Inspektor, Terminal, Konsole, PDU) | alle Ansichten in A; Rauchtest 45/45; `ethos.py --dom` grün; `welle2-abnahme.md` |
| 3 | Doku, Stand, Screenshots, Fassung, Abschluss | Doku/STAND/CHANGELOG aktuell; Fassung (Vorschlag **2.2.0**, vom Nutzer zu bestätigen); Einzeldatei byte-gleich; `.exe` mit passender ProductVersion; **kein Push, kein Release** |

**Definition of Done (Redesign):**
1. `docs/Architektur.md` enthält diesen Vertrag; `ethos.py` und `stil-stand.json` passen dazu.
2. Alle Flächen sichtbar in A; Bedienlogik und Ansichten unverändert; Hell gleichwertig.
3. `sh tools/test.sh` 873/873 (0 übersprungen), `--rauch` 45/45, `ethos.py --dom` grün,
   `stand.py --pruefen` und `seite.py --pruefen` grün, `sim-stand.js` unverändert, `klassen.py` 0.
4. Screenshots 1366/960/720 je Ansicht liegen vor und sind am Bild geprüft (keine Überläufe,
   keine abgeschnittenen Texte, Trefferflächen ≥ 40/44 px, Kontraste ≥ 4,5:1).
5. Kein Push, kein Release ohne ausdrückliche Freigabe; ehrlicher Abschlussbericht mit gemessenen Zahlen.

### 18.14 Offene Entscheidungen (nur der Nutzer)

Diese Sitzung arbeitet mit den **Vorgaben dieses Vertrags** (Basis A, Emerald `#30E58B`,
kontrollraum-dichte, Hell abgeleitet, Fassung 2.2.0). Sie kann der Nutzer jederzeit ändern; dann wird
**zuerst** dieser Abschnitt geändert, dann der Code.

| Frage | Vorgabe in diesem Vertrag | Wirkung bei Änderung |
|---|---|---|
| Basis-Vorlage | **A · Matrix-Elegant** | B/C: § 18.2–18.8 neu |
| Akzentfarbe | **Emerald `#30E58B`** (Cyan nur Daten-Akzent) | anderes `--accent` + Kontrastnachweis |
| Dichte | **kontrollraum-dicht** (A) | luftiger (B): Abstände 4/8/12/16/24/32 nur nach oben |
| Hellmodus | **gleichwertig mitgeführt** (§ 18.3) | „erst später": § 18.3 bleibt, Abnahme reduziert |
| Reihenfolge Welle 1 | **Hub + Labor + Leiste zuerst** | andere Ansicht zuerst: § 18.13 tauschen |
| Fassungsnummer | **2.2.0** (Vorschlag) | 3.0.0: `tools/fassung-ziehen.py --neu …` |

### 18.15 POLARIS v4 — Ablösung von „Matrix-Elegant" (29.10.2026)

Der Nutzer hat die A-Richtung (Matrix-Elegant) nach zwei Wellen verworfen: zu nah am Alten,
zu blockig, Farben stumpf. POLARIS ist der dritte Vertragsentwurf und **gilt ab jetzt**;
die Tabellen 18.2–18.7 bleiben als Herkunft stehen, werden aber von diesem Abschnitt überstimmt.

**Farben (dunkel, Standard).** Grund `#0B0C0F`; Paneele dreistufig `#14161B` / `#191C22` / `#1F232B`;
Haarlinien `rgba(255,255,255,.08)` und `.16`; Text `#F3F4F1` / `#B0B4AD` / `#6E726C`.
Vier semantische Signalfarben, gleiche Helligkeit, je eine Aufgabe:
**Minze `#7DF3C0`** Handlung/Erfolg/Live · **Iris `#9C8CFF`** Wissen/Reputation ·
**Amber `#FFC46B`** Geld/Zeit · **Koralle `#FF8A7A`** Störung.
Farbe erscheint nur als Punkt, 1-px-Kante, dünne Linie, Zahlenverlauf oder 6–10-%-Tönung — nie als Fläche.
Die helle Ableitung ist mitgeführt (18.3-Struktur), aber nicht gesondert abgenommen.

**Form.** Radien `--radius 14 / --radius-s 10 / --radius-xs 6`; Pille 999, Kreis 50 %.
Weiche Elevation statt harter Blöcke: `--schatten` (0 30px 70px −50px) und 1-px-Innenlichtkante.
Geräte-Karten: `rx 10`, Kante `--line`, Schatten nur bei Hover/Auswahl.

**Shell.** Kopf 60 px, linke Leiste 76 px, Statusfuß 34 px, Dock-Vorgabe 76 px.
Statusfuß ist eine Tickermonate: Live-Punkt, Ansicht, Ebene (Bus „ebene"), Version.

**Kabel (neu).** Leitungen sind Patchkabel, keine Linien: Mantel `8 px` in
`color-mix(--ink 16 %)`, Seele `3,2 px` in `--kf`, RJ45-Steckergehäuse `18 × 10` an beiden Enden
(Rastnase, Kontaktfeld), leichter Durchhang als Quadratik (`Q`-Pfad, Bogen ≤ 20 Einheiten).
Status-Symbole sitzen näher an den Karten (28/48 statt 38/66), damit sie die Stecker nicht überdecken.
Das alte `<line>`-Paar bleibt als Logik/Trefferfläche erhalten; gezeichnet werden `path`-Elemente.

**Bewegung.** Nur `transform`/`opacity`/`filter`; Dauer 160/320 ms bzw. `--dauer*`;
Ruhige Reveals (6 px), Hover-Lift 1–2 px, Lichtschein am Hauptknopf, fließende Punkte nur am
gestörten Kabel. Reduzierte Bewegung zentral in `basis.css` (ein Block, R8).

**Stildateien.** Neu: `src/stil/zz-polaris.css` (lädt zuletzt, Overrides für Shell/Paneele/Hub/Kabel)
und der Editorial-Block am Ende von `hub.css`. `basis.css` trägt die Tokens.
`tests/stil-stand.json` wurde auf die POLARIS-Messung gezogen: R2 23 → 15, R4 128 → 109 (besser),
R10 durch Blockzusammenlegungen 0. Ethos ist GRÜN gegen den neuen Stand.

**Nicht geändert.** Datenformen, Simulation, Tests, Bedienlogik, Trefferflächen (`ger-treffer` 116 × 80,
`kabel-treffer` 14), Tastenkürzel, Klassenraum, Kontrastregeln der Semantikfarben (18.4).



**Nachtrag POLARIS-Struktur (§ 18.15).** Karten 168 × 112 (schmal 116 × 80), Band als Paneel mit
28-px-Titel, Inspektor als Paneel mit Reiterzeile und Vorauswahl des ersten Infrastruktur-Geräts auf
breiten Flächen, „// LAGEBILD"-Kopf, `ResizeObserver` für erneutes Einpassen. Schmale Breiten:
Werkzeugleiste aus, Band flach — sonst liegt die Fläche unter der Falz.
