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
  tools/               messen.ps1, linux-bauen.sh, cdp.py (Test im echten Programm)
  web/                 Build-Ausgabe
```

**Neue Datei?** In `bauen.py` in `MODULE` (bzw. `STILE`) an der richtigen Stelle eintragen, und – falls headless-fähig – in `tests/run.js` in `HEADLESS`. Eine Datei, die nicht in `MODULE` steht, existiert für das Programm nicht.

Tests: `wsl -d Ubuntu -- node tests/run.js` (Node 22 in der WSL; Pfad über `/mnt/c/...`). Testdateien nutzen `pruefe(name, fn)` und `erwarte`-Hilfen aus `tests/harness.js`.

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

### 7.2 Spielstand (`store "labor"`, `v:1`)

`{ v, euro, ruf, stufe, kunden:{[id]:{vertrag, ampel, seit, sterne:[]}}, postfach:[TicketInstanz], aktiv:iid|null, erledigt:[{id, sterne, tag, hilfe}], playbooks:{slots, aktiv:[skill]}, tag:{…Arbeitstag…}, zuletzt:ms, einst:{…} }`

`TicketInstanz = { iid, ticketId, seed, netz, hilfeStufe, hilfen:[], start, frist|null, quelle:"postfach"|"wartung"|"wiederholung"|"generiert" }`

### 7.3 Spiel-API (Auswahl)

`Spiel.laden()`, `Spiel.st` (Zustand), `Spiel.postfach()`, `Spiel.oeffnen(iid)`, `Spiel.abnahme(inst)` → `[{ziel, ok, grund, trace}]` + Sterne, `Spiel.hilfe(inst)` → nächste Stufe, `Spiel.vorfuehren(inst)` → Lösungsschritte, `Spiel.tick(ms)` (Idle: Wartung, Einkommen, Ampeln), `Spiel.offlineBericht()`, `Spiel.mini()` → Mini-Ticket, `Spiel.generiere(skill, seed)` (Injektor-Generator), `Spiel.INJEKTOREN`.

Bus-Ereignisse: `netz-geaendert`, `ticket-neu`, `ticket-geloest`, `zustand-geaendert`, `trace`, `modus` (leiste/voll), `hilfe`.

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
Ziel {typ:"befehl", geraet, muster:"^ipconfig( /all)?$", text}   // erfüllt, wenn der Befehl im Auftrag auf dem Gerät lief
Ziel {typ:"antwort", frage, pruefen:{art:"gw"|"ip"|"dns"|"mac", geraet}, text}   // Eingabe in der Mappe, geprüft gegen die echte Simulation
```

- **Windows (cmd):** ipconfig (/all /release /renew /flushdns /displaydns) · ping (-n -l -t) · tracert · pathping · arp -a/-d · nslookup (auch interaktiv) · getmac · route print/add/delete · netstat -an · curl · telnet · netsh interface ip show config / set address … static|dhcp / set dns · hostname · whoami · systeminfo · type …\hosts · **powershell** (Test-NetConnection, Resolve-DnsName, Get-NetIPConfiguration).
- **Linux (bash):** ip a/r/link · sudo ip addr add|flush · sudo ip route add|replace|del default · sudo ip link set eth0 up|down · ping -c · traceroute · dig · nslookup · host · ss -tulpn · curl · cat /etc/resolv.conf|hosts|hostname · systemctl status|start|stop|restart|is-active (apache2, named, isc-dhcp-server, smbd, ssh, cups) · sudo tcpdump -n · hostnamectl · whoami.
- Ändern geht nur über netsh/route bzw. sudo ip/systemctl – immer über den Verlauf (Rückgängig). **Simulation:** Ist der eingetragene DNS-Server das Gerät selbst, antwortet der eigene Dienst lokal (Loopback) statt per ARP ins Leere.
- **Terminal im Dock** (`ui/terminal.js`, Präfix `tm-`): Reiter „Terminal“ mit einer Sitzung je Gerät (Reiterchen oben), Doppelklick auf ein Gerät oder Taste `T` öffnet sie; „Pakete ansehen ▸“ nach Befehlen mit Aufzeichnung; Diagnosebefehle legen Beweiskarten in die Akte (Bus `befehl`).
