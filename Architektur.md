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
