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
  tools/               messen.ps1, linux-bauen.sh, cdp.py (Test im echten Programm), klassen.py (Klassen ↔ CSS), rauch.py (Rauchtest der Oberfläche), kiosk.py (Vorführ-Fassung)
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

**Nachtrag 31.10.2026 (KRN-01, aus dem Code gemessen).** Vollständige Kern-Oberfläche:

- `store.get(k, d)`/`set(k, v)` arbeiten mit **tiefen Kopien**; `markieren()`/`standMelden()` setzen
  „schmutzig" und starten die Entprellung; `sofort()` schreibt sofort und liefert ein immer erfülltes
  `Promise<boolean>` (Fehler über `stand()`/Bus); `stand()` →
  `{art:"schreibt"|"gesichert"|"fehler", fehler, zeit}`; `alles()` → tiefe Kopie des ganzen Speichers;
  `initialisieren(daten, schreiber, meldung)`; `schreiberSetzen(fn)`; `meldung`; `entprellungMs`.
  **Genau eine Entprellung:** `SPEICHER.entprellung = 1500` ms (`src/kern/basis.js:71-132`).
- `Bus.an(name, fn)` (Rückgabe = Abmeldefunktion), `Bus.aus(name, fn)`, `Bus.senden(name, daten)`;
  Hörer-Ausnahmen werden gefangen und geloggt (`src/kern/basis.js:28-39`).
- `jetzt()` — in Tests über `jetzt.setzen(ms)`/`weiter(ms)`/`frei()` steuerbar (`src/kern/basis.js:8-15`);
  `heute(d?)`, `plusTage(tag, n)`, `tageZwischen(a, b)`, `datumDe(tag)` (`:18-21`).
- `Zufall(seed)` → `{zahl(n), wahl(arr), mischen(arr), kommazahl(), zwischen(min, max), seed}`
  (mulberry32, deterministisch; `src/kern/basis.js:42-56`).
- `tief(x)`, `esc(s)` (`:24-25`); Anzeige-Helfer `eur(x)`, `zahlDe(x)`, `klemme(x, lo, hi)` (`:150-152`).
- `IP`: wie oben; zusätzlich `ausCidr(s)` → `{netz, maske, praefix}`, `istNetzadresse(ip,m)`,
  `istBroadcast(ip,m)`, `hostAdresse(ip,m)`, `wildcard(m)`, `plus(ip,k)`, `vergleich(a,b)`, `loopback(ip)`,
  `maskeZahl(p)`, `macAus(n)`, `MAC_BROADCAST` (`src/kern/netz.js:47-69`).
- Frühstart: `window.__LABOR_SPEICHER__` (Tauri, von der Hülle vor allen Seitenskripten gesetzt) hat Vorrang
  vor `localStorage["netzwerk-labor"]`; ein Lesefehler startet leer mit Meldung (`src/kern/basis.js:134-147`).

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

**Nachtrag 31.10.2026 (KRN-01, aus dem Code gemessen).**

- **Geräteform:** `os:"windows"|"linux"` nur bei `pc`/`server`/`nas`, gespeichert nur als Abweichung vom
  Standard (`OS_STANDARD`: pc windows, server/nas linux; `Modell.osVon`, `src/modell/geraete.js:25-33`);
  Switch: `snooping:{an, vertraut:[port]}` (`:56-58`); Router: `dhcp:{an, ausgeschlossen:[…], pools:[…]}` —
  fehlendes `an` gilt als an (`:62-64`).
- **Modell-API — vollständige exportierte Oberfläche (`src/modell/geraete.js:295-298`):** `TYPEN`, `NAMEN`,
  `PORTS`, `DIENSTPORTS`, `IOS`, `HOST`, `OS_STANDARD`, `osVon`, `werkszustand`, `subIf`, `switchPort`,
  `routerIf`, `hostIf`, `neu`, `geraet`, `entfernen`, `ports`, `kabelAn`, `freierPort`, `verbinden`,
  `trennen`, `portAn`, `linkOben`, `portStatus`, `pfad`, `lesen`, `setzen`, `loeschen`, `geraetSetzen`,
  `vlan`, `laufzeit`, `macsVergessen`, `speichern`, `neustart`, `startupLoeschen`, `kopie`, `gleich`,
  `ungespeichert`, `adressen`, `pruefen` → `[{geraet, feld, code, text}]`, `konfig` (= running).
  Rückgängig: `Modell.verlauf(netz)` → `{aendern, zurueck, vor, kannZurueck, kannVor, liste, leeren}`
  (`src/modell/verlauf.js:5-42`).
- **Werkszustand (Ist-Stand):** `pc` hat leeres `dienste` (`src/modell/geraete.js:43-53`); `internet`
  startet ohne `if`-Adressen und ohne Routen (`:70-76`). Die früheren Abweichungen „pc ohne dienste" und
  „internet ohne if/routen" sind damit **dokumentierter Ist-Stand**, kein Widerspruch mehr.
- **Bekannte Abweichungen (nicht Vertrag; gehören zu KRN-06):** `loeschen` prüft das Gerät nicht
  (`:210-215`); `geraetSetzen` schreibt andere Felder direkt (`:228-236`); `adressen` liefert auch
  abgeschaltete SVI (`:262`); `gleich` vergleicht per `JSON.stringify` (`:254`).

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
  warnung:true,                     // optional: nur bei Hinweisen (z. B. CDP NATIVE_MISMATCH) – keine Ursache; _erster/stelle/erklaere werten solche Ereignisse NICHT als entscheidende Stelle
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

Ereignis-Budget je Lauf 5000; gerissen → `abbruch:"STORM"`, Grund `STORM`.
Warnungen (`warnung:true`) sind Hinweise und dürfen die Diagnose nicht verfälschen: `Sim._erster`, `Sim.stelle` und `Sim.erklaere` überspringen sie (SIM-02, 31.10.2026); die Warnung bleibt vollständig in der Trace. Virtuelle Zeit: 1 ms je Kabel, Timeout Ping 2000 ms (IOS) bzw. 4000 ms (Windows).

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

### 6.1 running-config — Anzeige und Wiedereinspielen (verbindlich, 31.10.2026)

`CLI.runningConfig(geraet)` liefert den Text von der ersten `!`-Zeile bis einschließlich `end` (ohne die zwei
Kopfzeilen, die `show running-config` davor setzt). Geltungsbereich: **Router und Switch**. Firewall:
herstellerneutrale Anzeige, ausdrücklich **nicht** wiedereinspielbar und im Text als Kommentar gekennzeichnet.
Hosts (`pc`/`server`/`nas`): `null`.

**Wiedereinspiel-Invariante.** Jede Zeile von `CLI.runningConfig` ist über
`CLI.anwenden(netz, id, "configure terminal\n" + text)` fehlerfrei einlesbar — `ok:true`, `fehler:[]` —
inklusive `!`-Kommentaren und abschließendem `end`. Die Konsole betritt **keinen** Konfigurationsmodus von
selbst; der Wiedergabeweg beginnt ausdrücklich mit `configure terminal` (IOS-Weg). Nach dem Einspielen auf ein
Gerät desselben Typs gilt: (a) `CLI.runningConfig(kopie) === text` (zeichengleich, damit `entspricht:`- und
Show-Ausgaben stabil bleiben), (b) die Modell-Kernfelder sind tiefgleich: `running.if`, `running.ports`,
`running.svi`, `running.dhcp` (Pools samt `leaseS`, `domain`, `reservierungen`), `running.acls`,
`running.routen`, `running.nat`, `running.snooping`, `running.hostname`, `running.lines`, `running.banner`,
`running.benutzer`.

**VLAN-Datenbank.** `flash.vlans` gehört wie auf IOS **nicht** zur running-config. Sie wird separat angelegt
(`vlan 20`, `name …`), steht in `show flash:` als `vlan.dat` und überlebt `write erase`; weg ist sie erst mit
`delete flash:vlan.dat`.

**Anzeigeform (verbindlich).** Die running-config zeigt nur Zeilen, die das Gerät selbst wieder annimmt; reine
Komfort-Defaults ohne Befehl entfallen: `version …`, `service timestamps …`, `boot-start-marker`,
`boot-end-marker`, `no aaa new-model`, `system mtu routing 1500`, `spanning-tree mode pvst`,
`spanning-tree extend system-id`, `vlan internal allocation policy ascending`, `duplex auto`, `speed auto`,
`ip forward-protocol nd`, `no service pad`, `line aux 0`. `end` bleibt als Blockende zulässig.

**DHCP-Pools vollständig:** je Pool `ip dhcp pool NAME`, `network`, `default-router`, `dns-server`,
`lease …`, `domain-name …`; je Reservierung `host NAME`, `hardware-address …`, `ip …`, danach `exit`
(verlässt den Reservierungsmodus; nötig, weil aus `(dhcp-config-host)` sonst kein globales Kommando mehr
erreichbar ist).

**SSH (D3).** `ip ssh version 2` wird nicht als Befehl ausgegeben (der Parser kennt ihn heute nicht; Nachbau
CLI-05/3.1). Ist ein RSA-Schlüssel gesetzt, erscheint stattdessen die Kommentarzeile:
`! SSH aktiv – „ip ssh version 2“ folgt in 3.1 (CLI-05).` Das `crypto key generate rsa` ist wie auf IOS nicht
Teil der running-config. Folge: der bisherige Assert in `tests/cli-ios-ssh.test.js` („ip ssh version 2“ im
Text) wird auf diese ehrliche Kennzeichnung umgestellt; der SSH-Zustand bleibt über `running.sshSchluessel`
geprüft (keine Abschwächung).

### 6.2 Einleseformen und Grenzen (verbindlich, 31.10.2026)

**Geheimnisse.** Typ-Präfixe `0` (Klartext), `5` (MD5-artig), `7` (verschleiert) werden beim Einlesen
akzeptiert und unverändert wieder angezeigt — für `enable secret`, `username … secret|password` und
`password` in `line`. Gespeichert wird die eingegebene Form; reine Klartext-Eingaben erscheinen weiterhin in
der bisherigen Anzeigeform (Typ 5 für `secret`, Typ 0/7 für `password`). Erneutes Einlesen erzeugt dieselbe
Anzeige.

**`no ip domain lookup`** — Anzeige und Befehl sind deckungsgleich; die running-config schreibt die Tokenform
des Befehls (`no ip domain-lookup`), nicht die IOS-Kosmetik mit Leerzeichen.

**`CLI.anwenden(netz, id, text, {verlauf?})`** — Vertrag unverändert: beginnt im privilegierten Modus (`#`),
führt `!`-Kommentarzeilen und Leerzeilen aus, beantwortet nur automatische Rückfragen (Enter/confirm) selbst,
liefert `{ok, fehler:[{nr, zeile, meldung}]}`. Ein Block, der einen Konfigurationsmodus braucht, beginnt mit
`configure terminal`.

**Nicht wiedereinspielbar (Grenze, ehrlich):** Firewall-Konfiguration (herstellerneutral) und alles, was nur im
Inspektor konfigurierbar ist. Hosts haben keine IOS-running-config. Die `show running-config`-Kopfzeilen
gehören nicht zum Vertragstext.

**Vertrags-Test:** `tests/cli-runningconfig.test.js` (Roundtrip Router/Switch/Startup, Zustandsvergleich,
Phantomliste, absichtlich verlorenes Feld → rot).

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

*Der Lebenszyklus der Wiederholungs-Tickets im Postfach steht in § 7.5.*

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
| Schlüssel | `labor` (Spielstand), `einst` (Einstellungen), `sandbox` (freies Labor), `labor-sicherung` (rollierende Zweitsicherung), **`klassenraum`** (Klassenraum-Sitzungen, `fassung: 2` seit 3.0.0 — Nachtrag 09.10.2026, § 12.1). Geschrieben wird der **ganze** Speicher als ein JSON unter dem einen Schlüssel `netzwerk-labor` — im Browser und in der Android-Fassung in `localStorage`, im Desktop-Programm über Tauri in `spielstand.json`. Neue Schlüssel brauchen **keine** Änderung an `kern/basis.js` — die Speicher-Map ist frei |
| Entprellung | **genau eine**: `SPEICHER.entprellung = 1500 ms` (`kern/basis.js`). `Spiel.speichern()` markiert nur „schmutzig"; geschrieben wird 1500 ms nach der **letzten** Änderung. `Spiel.AUTOSPEICHERN_MS = 0` — die frühere zweite Schicht (400 ms in `spiel/ticket.js`) ist entfallen |
| Sofort schreiben | `store.sofort()`; im Spiel `Spiel.sofortSpeichern()` (Rückgabe immer erfüllt — ein Fehler ist bereits gemeldet). Aufrufer: Auftragsabschluss `spiel/abnahme.js` (bestanden **und** nicht bestanden), Ticket öffnen `spiel/ticket.js`, Käufe `spiel/wirtschaft.js` · `spiel/werkzeuge.js` · `spiel/playbooks.js`, Meilensteine `spiel/karriere.js` (Aufstieg, Fest gesehen), App in den Hintergrund `ui/start.js` (`pagehide`, `beforeunload`, `visibilitychange` → `hidden`) |
| Kennzeichen | `store.stand()` → `{art:"schreibt"\|"gesichert"\|"fehler", fehler, zeit}`. Der Bus meldet jede echte Änderung als `speicher-stand`, ein Fehler zusätzlich als `speicher-fehler`. Die Kopfzeile zeigt daraus „… sichert / ✓ gesichert / ⚠ nicht gesichert" (`ui/app.js`, `role="status"`, kein Klickziel, keine Animation; unter 380 px Breite Kurzform) |
| Fehler | Ein gescheiterter Schreibvorgang lässt `schmutzig` **stehen** (der nächste Versuch nimmt den Stand mit), füllt `SPEICHER.fehler` und meldet ihn über den Bus; der Entpreller fängt seine eigene Ablehnung ab. Vorher blieb ein voller Speicher stumm |
| Sicherung | `Spiel.SICHERUNG = "labor-sicherung"`, Inhalt `{v, zeit, stand}`. Angelegt **vor einer Migration** (`v < Spiel.VERSION`) und **vor einem Import** (`Spiel.sicherungAnlegen(roh, true)`); eine frische Sicherung bleibt `Spiel.SICHERUNG_FRISCH_MS = 60 s` unangetastet, damit die Migration nach dem Neuladen die Import-Sicherung nicht ersetzt |
| Import | `Spiel.importPruefen(d)`: fremdes Format (`format !== "netzwerk-labor"` oder fehlendes `speicher`) und **zu neue** Stände (`labor.v > Spiel.VERSION`) werden abgewiesen; **alte** Stände und Stände ganz ohne `v`-Feld sind erlaubt — die Migration holt sie herein. Geprüft wird die Schemaversion, nicht die Programmversion der Datei |
| Nicht im Stand | Laufzeit je Instanz (`Spiel._lz`: Verlauf, Startnetz, Ziele, `letzteArbeit`) und alles, was `ui/` nur anzeigt. Ein Neuladen holt den **Stand** zurück, nicht die Sitzung |

**Gemessen (06.10.2026, Edge headless, Einzeldatei-Fassung, 1366×768):** `Spiel.speichern()` 2010 → **1512 ms** bis zum Schreibvorgang, Netzwechsel 2415 → 1515 ms, Auftragsabschluss 2436 → **6,7 ms** (Gegenprobe des Prüfers: 22 ms), Kauf 3,8 ms (Prüfer: 24 ms), Verstecken der Seite 0 → 1 Schreibvorgang. Spielstand: **26.554 B** beim Start, 27.420 B nach einem Abschluss, 102.799 B bei 30 Postfach-Instanzen. Grenze: ein Prozess-Tod **ohne** `hidden`-Wechsel verliert die letzten ≤ 1500 ms.

### 7.5 Postfach-Lebenszyklus (3.0.0, SPL-01) — verbindlicher Vertrag (31.10.2026)

Tickets mit `quelle:"wiederholung"` entstehen an zwei Stellen: `Spiel.tag.bereitschaftStarten()` (Tages-Bereitschaft)
und `Spiel.wiederholungAnlegen()` (nach „Lösung vorführen"). Verbindlich:

- **Dedup je Fertigkeit:** je Fertigkeit (`inst.gen.skill` bzw. erste `def.skills`) bleibt höchstens **ein** offenes
  Wiederholungs-Ticket; ist schon eines offen, legt keiner der beiden Erzeuger ein zweites an.
- **Verfall:** ein offenes Wiederholungs-Ticket, dessen `start` älter als `Spiel.TAG.WIEDERHOLUNG_VERFALL_TAGE = 7`
  Kalendertage ist, wird entfernt.
- **Obergrenze:** höchstens `Spiel.TAG.BEREITSCHAFT_MAX = 3` offene Tickets mit `quelle:"wiederholung"`; darüber
  werden die ältesten entfernt.
- **Aufräumorte:** `Spiel.postfachAuffuellen()` (läuft auch in `Spiel.laden()`), `Spiel.tag.bereitschaftStarten()`
  (vor Neuanlage) und `Spiel.wiederholungAnlegen()`. Beim Entfernen wird `Spiel._lz[iid]` gelöscht, `st.aktiv`
  geleert, falls betroffen, und `st.tag.bereitschaft` auf lebende iids bereinigt.
- **Altstände:** ein 2.9.0-Spielstand mit vielen Wiederholungen wird beim nächsten `Spiel.laden()` bereinigt
  (≤ 3, ≤ 1 je Fertigkeit); sonst ändert das Aufräumen nichts am Stand.
- **Größe/Latenz (Abnahme):** 10 simulierte Tage ergeben **≤ 3** sichtbare Wiederholungen,
  `JSON.stringify(Spiel.st).length < 120000` und `store.set("labor", Spiel.st)` im Median **≤ 2 ms**
  (Zielwert < 1 ms; Lead-Beschluss 31.10.2026, weil CI-Maschinen langsamer sein können).

## 8 · Plattform

```js
Plattform = { name:"tauri"|"browser", version,
  impl,                                        // beim ersten Zugriff gewählt: Tauri nur bei window.__TAURI__,
                                               // sonst Browser (src/plattform/plattform.js:6-9)
  ladenSync() → { daten, meldung },            // Altvertrag, 0 Aufrufer (KRN-02)
  speichern(daten) → Promise,                  // Tauri: invoke("speichern", {json}), atomar + Sicherungen
  fenster:{ modus(m), immerOben(b), position(ecke), groesse(b, hoehe), zeigen(), verstecken(),
            beenden(), zustand() },
  abzeichen(n, text), benachrichtigen(text),   // benachrichtigen: 0 Aufrufer (KRN-02)
  autostart(b) → Promise, autostartStatus() → Promise,
  datei:{ exportieren(name, text) → Promise, importieren() → Promise<String|null> },
  kann(funktion) → { ja, grund },              // bekannte Funktionen: immerOben, tray, autostart,
                                               // hotkey, leiste, klickdurch, vollbildErkennen,
                                               // benachrichtigen; unbekannt → ja:false (KRN-02)
  an(ereignis, fn),
  info() → { os, sitzung, kann?, gruende?, selbsttest? } }
```

**Ereignisse, die die Tauri-Hülle tatsächlich liefert:** `modus-extern`, `zweiter-start`, `ruhe`,
`labor-beenden` (`src/plattform/plattform-tauri.js:19-24`). Der Vertrag nennt **keine** `tray-klick`- oder
`hotkey`-Brücke: die Abos in `src/ui/start.js:102-105` feuern nicht (KRN-02).

**Rust-Befehle (invoke):** `speichern{json}`, `fenster_modus{modus}`, `fenster_groesse{b,h}`,
`fenster_ecke{ecke}`, `fenster_zustand`, `fenster_knopf`, `immer_oben{an}`, `abzeichen{n,text}`,
`autostart{an}`, `autostart_status`, `exportieren{name,inhalt}`, `importieren`, `plattform_info`,
`ruhe{an}`, `beenden`, `selbsttest_ergebnis{json}` (`shell/src-tauri/src/main.rs:154-155`).

**Bekannte Abweichungen (nicht Vertrag; KRN-04/KRN-02):** Browser-`importieren` löst bei Abbruch nie auf
(`src/plattform/plattform-browser.js:52-58`); Browser-`exportieren` meldet `true` ohne Dateinachweis
(`:44-51`); Browser-`kann` liefert für Unbekanntes `ja:true` (`:60`), Tauri-`kann` ebenfalls (`:76-79`);
`benachrichtigen` ist in beiden Adaptern wirkungslos.


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
```

## 10 · DHCP-Tiefe (D1 aus `Plan – Ausbau 1.2.md`) — verbindlicher Vertrag (05.10.2026, Stand 2.9.0)

*Wiederhergestellt am 31.10.2026 für 3.0.0 (Commit `9716b08` hatte § 10–§ 18 gelöscht). Datenformen zuerst
hier, dann im Code; Zahlen ausschließlich aus `docs/STAND.md`.*

**Regressionsschutz.** Nach jeder Änderung an `src/sim/` oder `src/modell/`: `node tools/sim-stand.js` —
„Simulation unverändert" oder die Abweichung ist ausdrücklich als gewollt benannt (mit Begründung). Die
Testzahl misst `docs/STAND.md`, nicht dieser Abschnitt.

### 10.1 Konfiguration (`geraet.running`, wandert in den Spielstand)

```js
/* Router/Firewall als DHCP-Server: running.dhcp */
dhcp = {
  an: false,                       // Server an/aus
  pools: [{
    name, netz, maske, gw, dns,    // vorhanden
    start: "", anzahl: 50,         // Adressbereich wie host.js
    domain: "",                    // Option 15
    leaseS: 86400,                 // Lease-Dauer in Sekunden; 0/fehlend = Sim.T.LEASE
    reservierungen: [{ mac:"02:00:…", ip:"192.168.10.20", name:"drucker" }],
  }],
  ausgeschlossen: [{von, bis}],
}
/* Host (pc/server/nas) als DHCP-Server: running.dienste.dhcp – dieselben Pool-Felder
   (start, anzahl, domain, leaseS, reservierungen); ausgeschlossen gilt auch hier. */
/* Switch: running.snooping */
snooping = { an:false, vertraut:["Gi0/1"] }   // vertraute Ports (Richtung Server)
```

**Einheitlichkeit ist Pflicht:** Router-Pool und Host-Pool haben dieselbe Form; fehlende Felder werden
**defensiv** gelesen (Standard), damit alte Spielstände laden.

### 10.2 Laufzeit (`netz.zustand[id]`)

```js
leases:   { [ip]: { mac, bis, t1, t2, hostname, abgelaufen:false } }
dhcp:     { [port]: { ip, maske, gw, dns, server, bis, t1, t2, domain } }  // Client-Sicht
snooping: { [port]: { verworfen:0 } }
```

`t1 = bis - leaseDauer/2` (Erneuerung bei 50 %), `t2 = bis - leaseDauer/8` (Rebind, nur Anzeige). Alte
Leases ohne `t1/t2` gelten als „kein T1 bekannt", nicht als Fehler.

### 10.3 Verhalten (Simulation)

1. **Ablauf in virtueller Zeit.** Ist `L.t > l.bis`, gilt die Lease als abgelaufen: `Sim.adresse` liefert
   `quelle:"keine"`, der nächste Zugriff holt neu. **Kein neuer Timer, kein neues Ereignis** — Ablauf wird
   beim Zugriff festgestellt.
2. **Erneuerung bei 50 %.** Gültige Lease und `L.t >= t1`: Renew (Unicast Request/Ack); sonst Discover.
3. **Reservierung.** Passt die Client-MAC, wird diese IP angeboten (auch außerhalb `start..anzahl`), aber nur
   wenn frei; sonst kein Angebot, Grund `DHCP_RESERVED_BUSY`.
4. **Optionen.** Der Ack trägt `domain` (Option 15); `leaseS` kommt aus dem Pool.
5. **Adresskonflikt.** Vor dem Angebot prüft der Server gegen Geräte und fremde Leases; doppelt belegt →
   nächste Adresse, Konflikt wird vermerkt (`leases[ip].konflikt` mit Zeitpunkt). `show ip dhcp conflict`
   gibt echte Zeilen aus.
6. **Rogue-DHCP.** Ein zweiter Server im LAN ist erlaubt; der Client nimmt das erste Angebot und kann falsches
   Gateway/DNS erhalten. Grund `DHCP_ROGUE_OFFER` (Schicht 7).
7. **DHCP-Snooping.** Bei `snooping.an` werden Server-Nachrichten (UDP 67 → 68) von nicht vertrauten Ports
   verworfen; Zähler steigt, Client bekommt kein Angebot. Grund `DHCP_SNOOPING_BLOCKED` (Schicht 2).
   Client-Nachrichten (68 → 67) sind immer erlaubt.

### 10.4 Neue Gründe (Codes) — genau diese fünf, keine weiteren

| Code | Schicht | Ausgelöst wenn |
|---|---|---|
| `DHCP_LEASE_EXPIRED` | 7 | Lease abgelaufen und in diesem Lauf kein neues Angebot |
| `DHCP_RESERVED_BUSY` | 7 | Reservierung zeigt auf eine nicht freie Adresse — der Server gibt kein Angebot |
| `DHCP_ROGUE_OFFER` | 7 | Client nimmt ein Angebot eines unerwarteten Servers |
| `DHCP_SNOOPING_BLOCKED` | 2 | Server-Antwort an einem nicht vertrauten Switch-Port |
| `DHCP_CONFLICT` | 7 | Eine Adresse liegt auf mehr als einem Gerät; der Server überspringt sie und nennt diesen Grund |

**Vorrang, wenn mehrere zutreffen:** `DHCP_RESERVED_BUSY` → `DHCP_CONFLICT` → `DHCP_POOL_EMPTY` →
`DHCP_LEASE_EXPIRED` → `DHCP_NO_OFFER`. Der Client wiederholt den Discover bis zu 3×; ein Server-Grund steht
einmal je Versuch in der Trace, das Ergebnis `grund` des Aufrufs ist genau einer. Jeder Code braucht Eintrag in
`Sim.GRUENDE`, Lehrtext in drei Tiefen mit Quelle, Injektor, mindestens ein Ticket je Stufe und Aufnahme in die
Grundcode-Liste der Tests.

### 10.5 Trace — unverändert im Format

Keine neue `art`, kein neues Pflichtfeld im Ereignisobjekt (das optionale Warnfeld `warnung` aus § 5.2 bleibt
die einzige Ergänzung). Renew nutzt die vorhandenen Typen `request`/`ack`; neue `app.felder` sind erlaubt
(PDU-Ansicht). `tests/sim-gruende.test.js` prüft die Schlüsselmenge eines Ereignisses exakt.

### 10.6 Oberfläche und Konsole

- **Lease-Tabelle** im Inspektor (Router- und Server-Reiter): Gerät · IP · MAC · Restlaufzeit · Zustand.
  Quelle ist `Sim.leases(netz, id)`.
- **Pool-Formular** um `start`, `anzahl`, `domain`, `leaseS`, `reservierungen` erweitern (Router **und** Host).
- **Switch-Reiter:** Schalter „DHCP-Snooping" und die vertrauten Ports.
- `show ip dhcp binding|pool|conflict` gilt **auch auf Server-Hosts**; `binding` zeigt Restzeit/Zustand,
  `conflict` echte Konflikte, `pool` rechnet `start`/`anzahl` und Ausschlüsse korrekt.
- Windows `ipconfig /all`: Lease erhalten/erstellt/ablauf aus `t1/t2/bis`, plus DHCP-Server. Linux:
  `dhclient`/`ip a` mit echter Restlaufzeit.
- IOS-Poolmodus: `lease`, `domain-name`, `network`, `default-router`, `dns-server`,
  `host`/`hardware-address` (Reservierung).

## 12 · Klassenraum (Lehrer/Schüler, Hobby-Ebene) — Vertrag

*Stand 2.9.0, fortgeschrieben 31.10.2026 für 3.0.0.* Dieses Kapitel ersetzt den am 30.10.2026 mit
Commit `9716b08` gelöschten Abschnitt § 12 und führt ihn auf den gemessenen Code-Stand fort. Quellen:
`docs/entwicklung/Klassenraum/` A–D, historischer Stand `32cf209`, `src/spiel/klassenraum.js`,
`src/spiel/klassenraum-codec.js`, `src/ui/klassenraum.js`, `src/spiel/abnahme.js`,
`tests/klassenraum*.test.js`, `tests/ui-klassenraum*.test.js`.

**Kern in drei Sätzen.** Die Lehrkraft sagt einen kurzen **Auftragscode** an; jedes Gerät baut daraus
**denselben** Auftrag, weil Aufträge deterministisch aus einem Seed entstehen. Es gibt **keine
Bewertung**: der Ergebnis-Code trägt Sterne, Fehlversuche und Dauer für den Lernstand des Einzelnen,
keine Note, keine Rangfolge, keinen Vergleich. Ohne Konto, ohne Server, ohne Netz — Stufe A (Codec und
Determinismus) und B (Oberfläche, Ampel, Export/Import) tragen den Unterricht vollständig; C (lokaler
Server) und D (QR) sind **nicht gebaut** und bleiben 3.1 (§ 12.6/§ 12.7).

| Gegenstand | Festlegung |
|---|---|
| Auftragscode | `NL-XXXX-XX` — 10 Zeichen, 30 Bit Nutzteil + 2 Prüfzeichen (mod 31 / mod 32), Alphabet ohne I, O, 0, 1 |
| Ergebnis-Code | `E-XXXX-XXX` — 9 Zeichen, 25 Bit (Sitzung 5 · Platz 5 · halbe Sterne 4 · Fehlversuche 2 · Dauer 9) + 2 Prüfzeichen |
| Hilfecode | `H-XXXX-XX` — 9 Zeichen, 20 Bit (Sitzung 5 · Platz 5 · erfüllte Ziele 5 · offene Ziele 5) + 2 Prüfzeichen (§ 12.5) |
| Speicher | eigener Schlüssel **`klassenraum`** neben `labor`, `einst`, `sandbox`, `labor-sicherung`; `fassung: 2` seit 3.0.0 (§ 12.1) |
| Öffnungsweg | `Spiel.klassenraum.ausCode(code)` → `Spiel.instanzErstellen({…, quelle:"klassenraum", ohneFlow:true})` → `inst.klassenraum = {sitzung, platz, code}` → `Spiel.oeffnen(iid)` |
| Abnahme | `Spiel.klassenraum.abnehmen(inst)` (delegiert an `Spiel.abnahme`), Ergebnis-Code nur bei bestanden; die Instanz wird danach entfernt, Geld/Ruf/Karriere bleiben unberührt (`src/spiel/abnahme.js`) |
| Bewertung | **keine** — ausdrücklich Nutzerentscheidung 09.10.2026; wer später bewerten will, ändert einen Vertrag, nicht eine Einstellung |

### 12.1 Datenform — `store "klassenraum"`, `fassung: 2`

Die Sitzung liegt **nicht** im Spielstand (`store "labor"`), sondern unter einem eigenen Schlüssel: ein
Schulrechner braucht sie unabhängig vom Spieler-Fortschritt. Geschrieben wird entprellt (1500 ms,
`src/kern/basis.js`); `erzeugen` und `ergebnisEintragen` rufen zusätzlich `store.sofort()`.

```js
/* store "klassenraum" — Wurzel. Ab 3.0.0: mehrere Sitzungen, eine aktive (KLR-01a). */
Speicher = {
  fassung: 2,                     // Schemaversion dieses Teils; 1 = Altstand (eine sitzung)
  programm: "<LABOR_VERSION>",
  platz: null,                    // eigener Platz dieses Geräts, 0..31, null = keiner
  zuletzt: 1759706400000,         // ms, jetzt()
  sitzungen: [Sitzung, …],        // alle Sitzungen dieses Geräts, Reihenfolge = Anlage
  aktiv: 7,                       // id der aktiven Sitzung | null
  letzte: null,                   // zuletzt gelesener Code/Ergebnis (Anzeige)
  zaehler: 3                      // monoton, speist Sitzungskennung und Wunsch-Variante
}
/* Jede Sitzung hat genau diese 15 Felder: */
Sitzung = {
  id: 7,                          // Sitzungskennung 1..31 (5 Bit im Auftragscode)
  titel: "Klassenraum-Auftrag",
  art: "hand",                    // "hand" | "generiert"
  ticketId: "salon-01",           // genau eines von ticketId | (skill + seed)
  skill: null,                    // Fertigkeit aus DATEN.skills, wenn generiert
  index: 0,                       // Index in TABELLE_AUFTRAEGE bzw. TABELLE_SKILLS
  variante: 42,                   // 8 Bit; seed = variante + 1
  seed: 43,                       // 1..256
  eigene: true,                   // Kanonisierung: eigene Fassung ja/nein
  schritte: 5,                    // Lösungsschritte aus der Kanonisierung (additives Feld)
  code: "NL-BAAA-BB",             // gedruckter Auftragscode
  dauerMin: 10,                   // geschätzte Dauer in Minuten
  plaetze: 20,                    // Klassengröße, 0 = nicht eingestellt, sonst 1..31
  erstellt: 1759706400000,        // ms, jetzt()
  ergebnisse: {}                  // Abbildung platz → {platz, sterne, dauerS, versuche, code, zeit, quelle}
}
```

**Migration `fassung: 1 → 2` (3.0.0, verbindlich).** Ein Altstand mit `sitzung: Sitzung | null` wird
beim Lesen verlustfrei übernommen: `sitzungen = sitzung ? [sitzung] : []`, `aktiv = sitzung ? sitzung.id : null`;
alle übrigen Felder bleiben. Ein fehlendes oder unbekanntes `fassung` wird wie 1 behandelt. Ein **zu
neuer** Stand (`fassung > 2`) wird abgewiesen, nicht umgeschrieben.

**Export/Import** als Datei: `{"format":"netzwerk-labor/klassenraum","fassung":2,"programm":…,"zeit":…,
"sitzungen":[Sitzung,…],"aktiv":id}`. Der Import nimmt auch `fassung: 1` (`{…,"sitzung":…}`) an und
migriert; unbekannte Felder bleiben erhalten (verlustfrei, `Object.assign`-Verhalten aus 2.9.0).
Beide Richtungen **werfen nie** — fremdes/beschädigtes JSON ergibt `{fehler:"format", grund}`.

### 12.2 API — `Spiel.klassenraum`

**18 Namen (Stand 2.9.0, gemessen an der Rückgabe von `src/spiel/klassenraum.js:448-450`):**
`erzeugen` · `ausCode` · `sitzung` · `ergebnisCode` · `ergebnisLesen` · `ergebnisEintragen` ·
`hilfeCode` · `hilfeLesen` · `exportieren` · `importieren` · `netzkennwert` · `tauglicheFertigkeiten` ·
`platz` · `platzSetzen` · `plaetze` · `plaetzeSetzen` · `abnehmen` · `tabellen`.

| Aufruf | Rückgabe | Zusicherung |
|---|---|---|
| `erzeugen({ticketId?, skill?, seed?, dauerMin?, titel?, plaetze?, bestaetigen?})` | `sitzung` \| `{warnung, sitzung?}` | legt eine Sitzung an und schreibt sofort; fehlender Seed wird gezogen und steht im Code; hat die **aktive** Sitzung bereits Ergebnisse, wird sie **ohne `bestaetigen: true` nicht ersetzt** — Rückgabe `{warnung:"sitzung-hat-ergebnisse"}` (3.0.0) |
| `ausCode(code)` | `{ticketId, seed, art, sitzung, index, variante, skill, eigene, schritte, …}` \| `{fehler, grund}` \| `null` | wirft nie; `null` nur bei leerer Eingabe; normalisiert Groß-/Kleinschreibung und Trennstriche |
| `sitzung()` | aktive `Sitzung` \| `null` | liest nur `store "klassenraum"`, nie den Spielstand |
| `sitzungen()` | `[{id, titel, art, code, erstellt, plaetze, ergebnisse, aktiv}]` | **neu 3.0.0 (KLR-01a):** Übersicht aller Sitzungen, Kopien, keine Innenreferenzen |
| `sitzungWaehlen(id)` | `{ok, sitzung}` \| `{fehler:"sitzung", grund}` | **neu 3.0.0:** setzt `aktiv`; unbekannte id ist ein Fehler, kein stilles Ersetzen |
| `ergebnisCode(inst, abnahme)` | `"E-…"` \| `{fehler, grund}` | trägt Sitzung, Platz, halbe Sterne, Fehlversuche, Dauer und Prüfsumme; nur bei bestandener Abnahme |
| `ergebnisLesen(code)` | `{ok, sitzung, platz, sterne, dauerS, versuche, code}` \| `{fehler, grund}` | wirft nie; prüft Prüfsumme und Codewert |
| `ergebnisEintragen(code)` | `{ok, neu, platz, sterne}` \| `{fehler, grund}` | **idempotent** (derselbe Code ändert nichts, `neu:false`); fremde Sitzung ist ein Fehler |
| `hilfeCode(inst)` · `hilfeLesen(code)` | `"H-…"` \| `{fehler, grund}` · `{ok, sitzung, platz, schritt, offen, code}` | siehe § 12.5; wirft nie |
| `exportieren()` · `importieren(text)` | JSON-String · `{ok, sitzungen, aktiv}` \| `{fehler, grund}` | verlustfrei, überstehen Neustart; 3.0.0: **alle** Sitzungen (§ 12.1) |
| `netzkennwert(netz)` | 6 Zeichen \| `""` | siehe § 12.4; keine Ausnahme |
| `tauglicheFertigkeiten()` | `[{skill, index, ersterSeed}]` | nur Fertigkeiten, für die hier wirklich ein Auftrag baubar ist |
| `platz()` · `platzSetzen(z)` · `plaetze()` · `plaetzeSetzen(z)` | `0..31` · `{ok}` \| `{fehler:"wahl"}` | eigener Platz · Klassengröße der aktiven Sitzung (0 = nicht eingestellt) |
| `abnehmen(inst)` | `{ok, klassenraum, bestanden, sterne, abnahme, lernen, def, inst, …}` | Spiel erhält kein Geld/keinen Ruf; `lernen` läuft über den normalen Lernmotor |
| `tabellen()` | `{auftraege, skills, …}` | Prüffläche; eingefrorene Tabellen (§ 12.8) |

**Öffnungsweg (verbindlich).** Ein neuer Auftrag entsteht **nur** über
`Spiel.instanzErstellen({ticketId | gen:{skill, seed}, seed, quelle:"klassenraum", ohneFlow:true})` —
vorher prüfen, denn der Aufruf wirft bei unbekanntem Ticket. `ohneFlow: true` ist Pflicht, sonst macht
der lokale Flow-Regler denselben Code auf zwei Geräten verschieden. Eine Klassenraum-Instanz belegt
**keinen** Postfach-Platz und ist im Postfach **unsichtbar** (Entscheidung E1).

### 12.3 Fehlerformen

Alle Fehler sind **Daten**, keine Ausnahmen: `{fehler:<Klasse>, grund:<Satz>}`. Verbindliche Klassen
(Stand 2.9.0, gemessen im Code): `länge` · `zeichen` · `prüfziffer` · `auftrag` · `fassung` · `sitzung` ·
`wahl` · `format` · `abnahme` · `bereich`. `null` **nur** aus `ausCode`/`ergebnisLesen`, wenn gar nichts
eingegeben wurde. Der Satz ist Anzeigetext und gehört der Oberfläche; wörtlich vorgegeben ist nur
„Prüfziffer stimmt nicht — hast du ein O statt 0 getippt?".

### 12.4 Der Netzkennwert (Messform)

Der Determinismus wird **gemessen, nicht behauptet**: `Spiel.klassenraum.netzkennwert(netz)` liefert
**6 Zeichen** aus dem Alphabet, FNV-1a-32 über das **kanonische** Netz (`geraete` und `kabel` sortiert,
`netz.zustand` bleibt draußen), höchstwertige 5 Bit zuerst. Gleicher Abdruck = derselbe Auftrag;
ungleicher Abdruck = Alarm, dann ist der Seed nicht vollständig im Code gelandet. Geprüft in
`tests/klassenraum-determinismus.test.js` (zwei getrennte Prozesse, zeichengleich).

### 12.5 Hilfecode `H-XXXX-XX`

Der Azubi kann der Lehrkraft sagen, **wo** er hängt, ohne Server, Konto oder Bewertung. Form: 9 Zeichen —
`H` + Bindestrich + **4** Nutzzeichen + Bindestrich + **2** Prüfzeichen; dasselbe 32-Zeichen-Alphabet und
dieselben Prüfzeichen wie oben. Nutzteil **20 Bit**: `sitzung` 5 (1..31) · `platz` 5 (0..31) ·
`schritt` 5 (erfüllte Ziele) · `offen` 5 (offene Ziele). Ungültige Bitlage: `sitzung = 0` (erzeugt der
Encoder nie). Die Lehrkraft tippt den Code in ihr **bestehendes** Feld „Ergebnis-Codes" (mehrere Codes
passen hinein) — **kein neues Bedienelement**, R12 bleibt bei sechs sichtbaren Elementen (Leitungs­entscheidung O1).
Der Hilfecode ist **kein** Bewertungssignal; er beschreibt nur Ziele, die schon erfüllt bzw. offen sind.

### 12.6 Lokaler Server (Stufe C) — **3.1**, im Produkt nicht gebaut

Ehrlicher Stand 2.9.0: `shell/src-tauri` enthält **keinen** Server, `src/` enthält **keinen** QR; der
Schalter „Klassenraum-Server" in den Einstellungen hat deshalb **keine Wirkung** und wird in 3.0
entweder entfernt oder als „nicht in dieser Fassung" umtextet (VIS-04). Die **Bauform** der Stufe C
steht fest und ist belegt: C1 in der Desktop-`.exe` (Rust), C2 als eigenständiges Binary in
`tools/klassenraum` (eigenes Cargo-Projekt, `cargo build --release`, `cargo test` 10/10,
`pwsh -File tools\klassenraum-probe\C-http-probe.ps1` 20/20 — selbst gemessen am 31.10.2026 laut
`docs/STAND.md`/AGENTS.md). Beide Endpunkte, **nur lokal**, keine Klarnamen, Standard **aus**:

- `GET /liste?auftrag=<Auftragscode>` → `200` + `{"format":"klassenraum-liste","v":1,"sitzung":…,"anzahl":…,"sitzungen":[…],"ergebnisse":[…]}`
- `POST /ergebnis` → `201` (neu) / `200` (idempotent) + `{"format":"klassenraum-ergebnis","v":1,"ok":…,"neu":…,"anzahl":…,"platz":…,"sitzung":…,"lagerVoll":…}`
- Fehler → `400`/`409`/`413`/`415` + `{"format":"klassenraum-fehler","v":1,"fehler":…,"feld":…}`

Der Einbau von C1 ist **nicht** 3.0-Bestandteil: er braucht eine gemessene 2-Rechner-Umgebung
(KLR-06 → 3.1). Ohne Server bleibt die Klasse arbeitsfähig (Codes eintippen).

### 12.7 QR-Code (Stufe D) — **3.1**, im Produkt nicht gebaut

Inhalt wäre **genau** der Auftragscode — kein Link, keine Adresse, kein Konto, damit jeder handelsübliche
Scanner funktioniert; die Desktop-Fassung würde das Bild in Rust erzeugen und als Data-URI an die
Oberfläche reichen. In der Browser-Fassung bleibt Abtippen der Normalfall. Der Wiki-Text darf keinen
gebauten QR behaupten (VIS-04); die UI folgt erst nach dem JS-Port (KLR-07 → 3.1).

### 12.8 Grenzen (bewusst) und 3.0/3.1-Schnitt

| Grenze | Festlegung | Wo belegt |
|---|---|---|
| Adressierbare Aufträge | **58** von 76 Handtickets — der Auftragscode hat 6 Bit (0..63); die 2.1-Tickets sind nicht klassenraum-adressierbar, der Formatwechsel kommt erst **3.1** mit Migrationsweg | `src/spiel/klassenraum.js` TABELLE_AUFTRAEGE, `docs/STAND.md` Ausnahme „Klassenraum-Codec" |
| Fertigkeiten | 30 in `DATEN.skills`, davon 28 mit Injektor; `lab.ipv6`/`lab.wlan` stehen ehrlich auf `tauglich:false` (inhaltlich geübt, nicht paketweise simuliert) | TABELLE_SKILLS, § 17.1 |
| Sitzungen (3.0.0) | mehrere Sitzungen je Gerät, **eine aktiv**; keine still ersetzte Sitzung mit Ergebnissen (KLR-01a/b); Sitzungskennung 1..31, Plätze 0..31 | dieser Abschnitt, § 12.1/§ 12.2 |
| Kein Schutz gegen Abschreiben | wer den Code hat, hat den Auftrag — gewollt | — |
| Keine Identität, keine Zeit-/Sperrlogik, keine Serverpflicht, kein QR im Browser, keine Auswertung über die Ampel hinaus | 2.x/3.0 | D § 8 |
| 3.1 | C1-Server, QR-UI, Codec-Formatwechsel mit Migration, Diagnose bleibt anonym (§ KLR-05 in `docs/entwicklung/Konzept – 3.0.md`) | Konzept 3.0 §5 |

**Abgrenzung zu älteren Dokumenten.** `docs/entwicklung/Klassenraum/` A–D bleiben Protokolle; wo sie sich
widersprechen, gilt dieser Abschnitt (Leitungsentscheidungen L1–L7 und O1 vom 09.10.2026). Insbesondere:
E1 (unsichtbar im Postfach), keine Bewertung, `plaetze` gehört zur Sitzung, R12 misst je Ansicht und wird
für die Klassenraum-Ansichten nicht aufgeweicht.

---

## 13 · Hilfestellung — Stufen und Schnittstellen (07.10.2026) — verbindlicher Vertrag

*Wiederhergestellt 31.10.2026. Vollständiger Vertragstext:
[`entwicklung/Hilfestellung – Stufen und Schnittstellen.md`](<entwicklung/Hilfestellung – Stufen und Schnittstellen.md>);
bei Widerspruch gilt der Vertragstext. Dieser Abschnitt hält fest, was für den ganzen Bau gilt.*

**Anlass (Auftrag des Nutzers, 07.10.2026).** Ein Azubi kann die Syntaxen nicht kennen, hat im Spielflow aber
keinen Zugriff auf eine Lernnotiz. Die Hilfe muss dorthin, wo er steht: ins **Terminal**, in die **Leiste**
und in einen **Trainingsbereich abseits der Aufträge** — schrittweise mit dem Bildungsstand wachsend.

### 13.1 Die drei Achsen (nicht verwechseln)

| Achse | Feld | Werte | Bedeutung |
|---|---|---|---|
| **Bildungsstand** | `Spiel.einst.stufe` | `azubi` \| `azubi-plus` \| `geselle` \| `meister` | Voreinstellung des **Menschen**; wird nie automatisch geändert |
| Erklärtiefe | `Spiel.einst.niveau` | `E` \| `AP1` \| `AP2` | Wie ausführlich Konsole und Simulation erklären |
| Prüfungsstrenge | `Spiel.einst.wahl`, `inst.niveau` | `auto` \| `E` \| `AP1` \| `AP2` | Wie streng ein einzelnes Ticket bewertet wird |

`Spiel.stufe.setzen(id)` zieht `einst.niveau` nach, lässt es aber einzeln verstellbar.

### 13.2 Neue und geänderte Datenformen

| Gegenstand | Festlegung |
|---|---|
| Rang | `Spiel.stufe.rang(id)` → 1…4; verglichen wird **immer** über den Rang, nie über den Namen; Rückfall `azubi` (kein Wurf) |
| Hilfekonto je Ticket | `Spiel.HILFE_KONTO = {azubi:6, "azubi-plus":4, geselle:2, meister:0}`; gezählt **je Ticket** über `Spiel.stufe.hilfeZiehen(inst)`; ein leerer Vorrat sperrt nicht — die nächste Sprosse kostet Sterne |
| Vorschläge | `DATEN.hilfen.VORSCHLAEGE`; `bereich` ist **immer** eine `Spiel.LEITER[].id` (`link`, `vlan`, `ip`, `gateway`, `route`, `dienst`); `art` ∈ {`pruefen`, `aendern`} |
| Entscheidung | `Spiel.hilfe.passend/geruest/leiter/syntaxBruecke` (nur angefügt); die Oberfläche entscheidet nichts selbst |
| Fehlertexte | `Spiel.fehlertext({netz, id, modus, art, eingabe, ausgabe, fehler})`, Tiefe aus `Spiel.stufe.text(...)` |
| Mini-Anker | `Spiel.mini.hilfe(id)` (Denkhilfe, **nie** die Lösung) und `Spiel.mini.anker(id)` → `{titel, text, quelle, wiki}` |
| Training | `Spiel.st.training = {je: {[szenarioId]: {versucht, bestanden, bestes}}}` — Spielstand `v:3`; Szenarien `DATEN.trainings`, Logik `Spiel.training` |

### 13.3 Verhalten, das vertraglich feststeht

1. **Training zahlt nichts.** Kein Geld, kein Ruf, kein Karrierefortschritt, kein Eintrag in `st.erledigt`, keine
   Wochenwertung, kein Postfach; es zählt nur für den Lernmotor (`L.ueben`) und den Trainingsstand. Durchgesetzt
   an **einer** Stelle: erste Zeile von `Spiel.abschliessen` leitet `quelle === "training"` um.
2. **`quelle: "training"` ist unsichtbar.** `Spiel.postfach()` filtert sie heraus (wie `pruefung`/`raetsel`).
3. **Die Hilfe ist schrittweise.** Je Stufe 0/1/2 Vorschläge (`meister` 0), Denkhilfe bei jedem Mini
   (`azubi`/`azubi-plus`), nach falscher Antwort (`geselle`), gar nicht (`meister`).
4. **Nichts wird ungefragt verraten.** `Spiel.mini.hilfe` liefert **nie** den Lösungstext; ein Test prüft das
   gegen `Spiel.mini.loesungText`.
5. **Kein Baustein ohne Aufruf.** Jede Fläche wird aus dem echten Weg gerufen (Terminal-Zeile, Leisten-Knopf,
   Ansicht) — grüne Tests ohne Aufruf gelten als **nicht fertig**.

## 15 · Nachtrag des Nutzers: Wiederholungssperre, Führung, generierte Fragen (09.10.2026) — Vertrag

*Wiederhergestellt am 31.10.2026 für 3.0.0.*

**Anlass.** Nach dem Fahrplan-Auftrag verlangte der Nutzer vier Dinge: (1) Aufträge dürfen sich in einer Sitzung
nicht schnell wiederholen, (2) im Labor soll bei Bedarf der nächste nötige Schritt gezeigt werden („pulsiert oder
ein Pfeil darauf zeigt"), (3) Fragen sollen möglichst immer neu generiert werden, (4) alles bis zum Production
Release ausarbeiten.

### 15.1 Neue und geänderte Datenformen

| Gegenstand | Festlegung |
|---|---|
| Wiederholungssperre | `Spiel.st.mini` trägt `zug` (Zugnummer) und `gespielt` (Mini-id → Zugnummer); `zuletzt` bleibt das Sperrfenster (25). Pro Fertigkeit kommt jedes Mini einmal, danach das am längsten nicht gespielte. Alte/beschädigte Stände werden rekonstruiert, nie geworfen |
| Mischung | `Spiel.MINI.GENERIERT = 3` — jede dritte Frage darf generiert sein |
| Generierte Fragen | `DATEN.fragenVorlagen` (11 Vorlagen) und `DATEN.fragenDenkfehler` (20 Arten); `Spiel.fragen.erzeuge/erzeugeVoll/fuerSkill/merken/von/ausId/alle`; Id `gf-<vorlage>-<seed>`, aus sich selbst wiederherstellbar; generierte Fragen stehen **nicht** in `Spiel.mini.alle()` |
| Nächster Schritt | `Spiel.naechster(inst)` → `{geraet, ziel, text, bereich}` oder ehrlich `null`; dazu `Spiel.naechsterBedarf/-Wartezeit/-Wann/-Stufe`, `FUEHRUNG_NACH_MS` 90 s, `FUEHRUNG_ZEIGEN_MS` 15 s, `NAECHSTER_WANN` (`azubi`/`azubi-plus` „nachzeit", `geselle` „nachfehler", `meister` „nein") |
| Vierte Quelle | `quelle: "klassenraum"` ist aus Postfach, Offen-Zähler und „Heute"-Kachel ausgenommen (wie `training`) und nimmt am Ereignistakt **nicht** teil |

### 15.2 Verhalten, das vertraglich feststeht

1. **Rotation statt Filter.** Jedes Mini einer Fertigkeit kommt einmal dran, bevor sich eines wiederholt; bei
   echter Erschöpfung das am längsten nicht gespielte. Alles deterministisch über `Zufall` — kein
   `Math.random`, kein Datum.
2. **Die Führung verrät nichts.** Der Statustext der Simulation *ist* die Lösung; bei Netz-Zielen zeigt der
   Fingerzeig deshalb nur Gerätename und Zieltext, nie die Ursache. Er erscheint **nur auf Bedarf** (Knopfdruck
   oder 90 s ohne Fortschritt), einmal je Stillstand, und verschwindet, sobald der Schritt getan ist; `meister`
   bekommt sie nie ungefragt.
3. **Generierte Fragen sind bewiesen richtig.** Die Vorlage rechnet ihre Lösung selbst, der Generator lässt nur
   Fragen durch, bei denen genau **eine** Option besteht; der Test rechnet mit eigener Arithmetik nach und prüft
   jede falsche Option gegen die dokumentierte Denkfehler-Menge.
4. **§ 13.3.1 gilt auch über den Ereignisweg.** Der 20-Sekunden-Ereignistakt nimmt `training` und
   `klassenraum` aus — vorher zahlten beide über `weiterempfehlung` Ruf und legten neue Tickets an.
5. **Die Wiki zeigt nur, was das Spiel kann** — oder kennzeichnet den Befehl ausdrücklich als echtes Gerät
   („Echtes IOS, nicht das Labor"). Ein Wächter führt jede Rezeptzeile mit Prompt in der echten CLI aus.

## 16 · Welle 1 (2.1 + 3.0-Gerüst) — verbindlicher Vertrag (26.10.2026)

*Wiederhergestellt am 31.10.2026 für 3.0.0.*

**Anlass.** Diese Session baut das Maximal-Programm 3.0 in Wellen. Welle 1 umfasst 2.1 S1/S2 (Wahrheit,
Korrektheit) sowie parallel UX-P1 und das Werkstatt-Gerüst. Damit Code und Doku nicht auseinanderlaufen, steht
hier zuerst die Datenform.

### 16.1 Eine Zahlenquelle: `docs/STAND.md` (generiert)

| Gegenstand | Festlegung |
|---|---|
| Erzeuger | `tools/stand.py` erzeugt `docs/STAND.md` und einen markierten Block in `README.md`; Quelle sind **Messungen** (Testlauf, Modulliste des Baus, Dateisystem ort), keine getippten Zahlen |
| Blockmarker | `<!-- STAND:ANFANG -->` … `<!-- STAND:ENDE -->`; Handarbeit in diesem Bereich wird überschrieben |
| Prüfmodus | `python tools/stand.py --pruefen` vergleicht erzeugten Text mit den Dateien; Abweichung → Exit 1 mit betroffener Zeile |
| Pflichtfelder | Fassung, Baukennung, Tests (grün/gesamt/übersprungen), Testdateien, headless Module, Bau-Module, `src/`-Dateien und -Zeilen (Methode benannt), Einzeldatei Bytes + SHA256, Inhalte (Tickets, Minis, Injektoren, Trainings, Wiki-Seiten, Fertigkeiten), `docs/doku`-Seiten |
| Geltung | README, Liesmich, AGENTS, Bauen, SITZUNGSABSCHLUSS und CHANGELOG nennen diese Zahlen nur noch über `STAND.md`; historische Abschnitte bleiben unangetastet |

### 16.2 Skip-Gate (2.1 S1)

`tests/run.js` endet mit Exit 1, wenn `uebersprungen(ergebnisse) > 0`. Ein Test ohne Zusicherung gilt damit als
**rot**, nicht als grün. `tools/test.sh` reicht den Exit-Code unverändert durch; die Bilanzzeile bleibt im Text.
Die Definition „übersprungen = 0 Zusicherungen" (`tests/harness.js`) bleibt unverändert.

### 16.3 TTL und Probe-Art je Betriebssystem (2.1 S2)

| Gegenstand | Festlegung |
|---|---|
| TTL-Startwerte | `src/sim/l3.js`: Windows-Ziele 128, Linux-Ziele (Server/NAS mit Linux-Betriebssystem) **64**. Genau ein Startwert je **Endgerätetyp** (PC/Server/NAS); Router, Switch und Internet führen ihre eigenen TTL-Konstanten in ihren Modulen |
| Traceroute | Windows-Endgeräte senden ICMP-Echo; Linux-Endgeräte senden UDP-Proben auf hohe Ports, wie im Wiki gelehrt. Die sichtbare Ausgabe bleibt gleich; nur Sim-Gründe dürfen abweichen |
| Referenzstand | `tests/sim-stand.json` wird nach der Änderung bewusst neu erzeugt; die Abweichung wird im CHANGELOG begründet. Danach ist `node tools/sim-stand.js` grün |

### 16.4 Design-Tokens und Bewegung (UX-P1)

| Gegenstand | Festlegung |
|---|---|
| Dauer-Tokens | `--dauer-kurz:80ms` · `--dauer:160ms` · `--dauer-mittel:240ms` · `--dauer-lang:320ms`; Zähler `--dauer-zaehler:700ms`; Easings `--ease-standard`, `--ease-out`, `--ease-pop` |
| JS-Zugriff | genau eine Funktion `UI.zeit()` liest Tokens per `getComputedStyle`; Animations-/Wartepfade in `src/ui/` enthalten keine ms-Literale mehr. `SCHRITT_MS` bleibt Datenkonstante, wird aber an das Tempo gekoppelt |
| Lesbarkeit | alle Text-Tokens ≥ 4,5:1 auf `--bg`/`--panel`/`--panel-2` in beiden Schemata |
| Press | genau **eine** `.knopf:active`-Transform-Regel; Druck 80 ms |
| Icons | UI-Chrome (Knöpfe, Überschriften, Chips) nutzt `UI.symbol`; Emoji nur in Klartext-Copy außerhalb der Chrome |

### 16.5 Werkstatt-Gerüst (3.0, Welle 1)

**Wichtig:** Ein freies Labor existiert bereits (`UI.sandbox` in `src/ui/start.js`, Store `"sandbox"`, `v:1`,
Autosave bei `netz-geaendert`, erreichbar über „Freies Labor"). Die Werkstatt **erweitert** diesen Weg, sie
erfindet keinen zweiten.

| Gegenstand | Festlegung |
|---|---|
| Datenform | Speicher `"sandbox"` bleibt `{v:1, netz}`; neue **optionale** Felder (`name`, `vorlage`) sind erlaubt, alte Stände tolerieren sie (nie werfen). Die Karriere (`"labor"`) wird nie berührt |
| Netzform | unverändert `{geraete:{id:{…}}, kabel:[…]}` wie `UI.labor.laden(netz, …)`; keine neuen Gerätetypen in Welle 1 |
| Module | `src/spiel/werkstatt.js` → `Spiel.werkstatt` (reine Logik), `src/ui/werkstatt.js` → `UI.werkstatt` (Gerüst), `src/stil/werkstatt.css`; `bauen.py` lädt `src/spiel/*.js` und `src/ui/*.js` alphabetisch |
| Editor-Mengen | Auswahl-Erweiterung ausschließlich UI-Zustand: `Z.auswahl` bleibt für Einzelgerät; neu `Z.auswahlSet` + `UI.labor.auswahlMehr()`; Duplizieren erzeugt **einen** Verlaufsschritt, Namen mit Suffix `-2`/`-3`, Kabel werden nicht mitdupliziert |
| Minimap | reine Ansicht (SVG-Vorschau), keine Datenform, kein Speicher |
| Wirkung vor Grün | Das Gerüst zählt erst als gebaut, wenn es aus dem echten Weg erreichbar ist (`UI.sandbox.laden()` → Werkstatt-Leiste, Beleg `tests/ui-werkstatt.test.js`) |
| Nicht in Welle 1 | Vorlagen-Inhalte, Challenge-Karten, PDU/PCAP, Export, neue Gerätetypen, Zonen |

### 16.6 Schreibrechte Welle 1 (historischer Auszug)

Ein Schreiber je Datei; die damalige Aufteilung steht im Git-Stand `9716b08^`. Für 3.0.0 gilt die
10-Owner-Ordnung aus `AGENTS.md` A1.

## 17 · Welle 2+3 (2.1 S3–S8) — verbindlicher Vertrag (29.10.2026, Stand 2.9.0)

*Wiederhergestellt am 31.10.2026 für 3.0.0 (Commit `9716b08` hatte § 10–§ 18 gelöscht). Der Abschnitt
beschreibt den Vertrag der Welle 2+3; Zahlen stehen ausschließlich in `docs/STAND.md`, historische
Sollzahlen sind als solche benannt.*

**Anlass.** Nach Welle 1 (S1 Wahrheit, S2 Korrektheit) wurde 2.1 zu Ende gebaut: S3 Prüfungsnähe/Generator,
S4 Hilfeleiter/Doku-Ziele, S5 Lehrtexte/Fragen/Dichte, S6a/S6b IPv6/Betrieb/WLAN, S7 Volumen/Terminologie,
S8 Fassung 2.1.0. Es gilt weiter: ein Schreiber je Datei, keine halbfertigen Beiträge, Wirkung vor Grün.

### 17.1 Drei neue Fertigkeiten (S6a/S6b) — **append-only**

| Index | id | Name | ap | Pflichtinhalte |
|---:|---|---|---|---|
| 27 | `lab.ipv6` | IPv6: Adressen, Präfixe, NDP | AP1 | Wiki-Seite (≥4 Abschnitte, Quellen), Lehrtext E/AP1/AP2, 6 Minis, 1 Ticket, 1 Hilfe, Senior-Frage, Prüfungsfrage, ≥1 Injektor; **kein Training** (namentliche Ausnahme, `docs/STAND.md`) |
| 28 | `lab.betrieb` | Betrieb und Überwachung (Syslog, Schwellwert, Backup, Uptime) | AP2 | wie oben, 6 Minis, 1 Training, 1 Ticket, 1 Hilfe, ≥1 Injektor |
| 29 | `lab.wlan` | WLAN: SSID, VLAN, Sicherheit, Gastnetz | AP1 | wie oben, 8 Minis, 2 Tickets, 1 Hilfe, ≥2 Injektoren; **kein Training** (namentliche Ausnahme, `docs/STAND.md`) |

- **Anhängeregel:** ausschließlich ans **Ende** von `DATEN.skills`; bestehende Indizes 0–26 bleiben unverändert.
  `src/spiel/klassenraum-codec.js`: `TABELLE_SKILLS_LAENGE = 30`. Alte Codes bleiben gültig (Index < 27).
- **Ehrliche Grenze:** IPv6/Betrieb/WLAN werden **inhaltlich** geübt (Adressierung, Planung, Konfiguration,
  Bewertung), nicht paketweise simuliert. Jeder Lehrtext/Wiki-Abschnitt sagt das ausdrücklich.
- **Übungsformen ohne Simulation (verbindlich):** Wo die Simulation das Thema nicht ausführen kann, gibt es
  **kein** Training und **keinen** generierten Prüfungsfall. Stattdessen: Handticket mit Arbeitsziel
  (`notiz`/`tabelle`/`audit`/`befehl`/`antwort`) auf einem vorhandenen Netz, Minis, Wiki, Lehrtext, Hilfe,
  Senior-Frage. Fehlende Trainings sind **namentliche Ausnahmen in `docs/STAND.md`**.
- **Neue Sim-Gründe** sind nur zulässig, wenn sie in § 5.3 dokumentiert werden und `tests/sim-stand.json`
  bewusst aktualisiert wird; Standard ist: keine neuen Gründe.

### 17.2 Generator, Prüfung, Abnahme (S3)

| Gegenstand | Festlegung |
|---|---|
| Generierte Tickets | `symptomText`/`briefingText` liefern vier Bausteine (Anlass mit Zeit · Beobachtung in Kundensprache · Folge · was schon versucht wurde), 180–420 Zeichen, 2–4 Sätze, **0 Ursachenwörter** (`docs/entwicklung/Stilfaden – Auftragstexte.md`), Titel 15–46 Zeichen, deterministisch über `Zufall` (kein `Math.random`, kein Datum) |
| Stil-Gate | `tools/texte-messen.js --pruefen` prüft 100 Seeds je Form (Prüfung, Tagesrätsel, Postfach) und die Handtickets; Exit 1 bei Verstoß |
| Prüfung | Alle **30** Fertigkeiten erreichbar (auch Stufe 6 und `lab.portsec`); Blueprint je AP1/AP2 (Fertigkeitssets), 3 Aufgaben/25 min und IHK-Notenschlüssel unverändert |
| Abnahme-Regression | Basis-Paare zusätzlich zu ICMP: **Dienste** (HTTP, DNS, DHCP, Druckfreigabe/Port 445) und **Drucker-Endgeräte**; mindestens **5** Dienst-/Drucker-Fälle in den Tests; `REGRESSION_MAX` darf dafür angehoben werden; keine neue Datenform |

### 17.3 Hilfeleiter und Doku-Ziele (S4)

| Gegenstand | Festlegung |
|---|---|
| SENIOR_FRAGEN | Schlüssel = `DATEN.skills`-id; **30/30** vorhanden |
| Stufe 5 | Ohne eigenes `hilfen`-Feld **kein Lösungstext-Fallback**: nur Handlungshinweise („Prüfe zuerst, ob …"); Stufe 6 bleibt „Lösung vorführen" |
| Doku-Ziel | Vorhandene Formen `notiz` (≥ 20 Zeichen) / `tabelle` / `audit` wiederverwenden; die 17 Briefings, die Protokoll/Wartungsbuch fordern, bekommen ein Ziel; **kein neuer Zieltyp**, keine neue Datenform |
| Stufen 5/6 | ≥ 10 / ≥ 8 Handtickets mit echten Themen (Firewall/Log, NAS-Rechte/Backup, Port-Security in der Halle, …); alle Texte im Stilfaden, Symptom ohne Ursachenwörter |

### 17.4 Lehrtexte, Fragen, Dichte (S5)

- `lehrtexte.js`: 12 neue Texte — 9 fehlende Fertigkeiten (`lab.switch, lab.subnetz, lab.tcp, lab.cli,
  lab.speichern, lab.rostick, lab.portfwd, lab.dmz, lab.storage`) + 3 neue (`lab.ipv6, lab.betrieb, lab.wlan`)
  → Texte auf 30/30 Fertigkeiten; Quellen nur Whitelist. **Datenform (append-only):** `DATEN.lehrtexte` bleibt
  für die Sim-Codes unverändert; die Skill-Texte kommen als zusätzliche Schlüssel mit der Skill-id dazu
  (`DATEN.lehrtexte["lab.switch"] = {titel, skill, E, AP1, AP2, quelle}`). `DATEN.lehrtextFuer(skill, niveau)`
  liefert den Text (Skill-Text hat Vorrang, sonst `null`); Consumer ist der Ergebnis-/Erklärdialog („Erklär mir
  das"). Der Dichte-Test zählt beide Quellen (Code-Text **oder** Skill-Text).
- `fragen-vorlagen.js`: **20** Vorlagen auf **≥15** Fertigkeiten, je ≥2 Denkfehler-Familien; Lösung und Prüfung
  rechnen unabhängig (kein Vergleich mit dem Lösungstext), deterministisch.
- **Zulässige Quellen (Content):** RFC, IEEE, ISO/IEC, BSI, ETSI, ITIL, SNIA, DSGVO/EU-Recht, Cisco-Dokumentation,
  IHK-Rahmen (FIAusbV, KMK) — und ausdrücklich die **Wi-Fi Alliance** (WPA3-Spezifikation). Der Wächter-Test
  `tests/wiki-2.0.test.js` akzeptiert „Wi-Fi" bereits.
- `tests/inhaltsdichte.test.js`: Matrix **30 Fertigkeiten × 8 Zeilen** — Wiki (≥3 Abschnitte, Ziel ≥4),
  Lehrtext, ≥3 Minis, ≥1 Training, ≥1 Ticket, ≥1 Hilfe, ≥1 Senior-Frage, ≥1 Prüfungsfrage. Ausnahmen nur
  namentlich mit Begründung im Test; Ziel 30/30.

### 17.5 Volumen, Welle 3 (S7)

Sollzahlen der Welle 3 (Summenprobe): Tickets 76 · Minis 150 · Trainings 52 · Injektoren 55 · jede Fertigkeit
≥3 Injektor-Zuordnungen · Hilfe-Vorschläge 47 · Wiki 37 · Fragen 20/15 · Lehrtexte 46 · Doku-Ziele 17/17. Der
**gemessene** Stand steht ausschließlich in `docs/STAND.md`. Dazu: Terminologie (Karriere-Stufe vs. Erklärtiefe
vs. Niveau; „Broadcast-Domäne" einheitlich) dokumentiert; 5 Wiki-Vertiefungsseiten (VPN/IPsec, TLS/Zertifikate,
802.1X, Backup, Virtualisierung) mit ≥4 Abschnitten und Quellen; unabhängiger Faktencheck 100 Aussagen = 0 Fehler
oder benannte Ausnahmen. Jede Einheit mit Lernziel, Quelle, Test.

### 17.6 Fassung 2.1.0 und Auslieferung (S8) — **historisch, überholt**

Welle 3 zog 2.1.0 (Trockenlauf `tools/fassung-ziehen.py --neu 2.1.0`, dann `--setzen`; `VERSION_CODE` von Hand
über dem abgeleiteten Wert). Seitdem sind 2.2–2.9 erschienen; die Auslieferung ist in § 23–§ 26 und
`docs/entwicklung/Übergabe – Stand 31.10.2026 – Runde 8.md` dokumentiert. Für 3.0.0 gilt der Fassungszug in
`docs/SITZUNGSABSCHLUSS.md` (3.0.0, `VERSION_CODE 30001`). **Kein Commit, kein Push, keine Veröffentlichung
ohne ausdrückliche Nutzerfreigabe** — unverändert.

### 17.7 Zahlenkopplung und Tests

Tests, die Zählungen hart codieren, werden auf die Vertragswerte gezogen — **ohne** Abschwächung. Neue Tests je
Owner in eigenen Dateien; nichts gelöscht; 0 übersprungen (Skip-Gate). Die **Testzahl und alle Zählungen stehen
ausschließlich in `docs/STAND.md`** (erzeugt von `tools/stand.py`); `docs/STAND.md` wird am Ende jeder Welle neu
erzeugt. Handgeschriebene Zahlen in Doku/CHANGELOG sind Befunde.

### 17.8 Schreibrechte Welle 2 (historisch, 29.10.2026)

Ein Schreiber je Datei; die damalige Owner-Tabelle (O1–O5 + Lead) ist im Git-Stand `9716b08^` nachlesbar
(`git show 9716b08^:docs/Architektur.md`). Für 3.0.0 gilt die 10-Owner-Ordnung aus `AGENTS.md` A1 und dem
PROMPT-Roster; Kollisionen werden dem Lead gemeldet statt still gelöst.

### 17.9 Klassenraum-Tabellen und Ticketwachstum (Entscheidung 29.10.2026)

**Befund.** Das Auftrags-Codec hat 6 Bit Auftragsindex (0..63, Format § 12). 2.1 wuchs von 58 auf 76 Handtickets.
Die Tabelle `TABELLE_AUFTRAEGE` in `src/spiel/klassenraum.js` ist ein **Literal** (eingefrorene Bindung); alte
Codes bleiben dadurch gültig, auch wenn neue Tickets an anderer Stelle der lebenden Reihenfolge stehen.

**Entscheidung.**
1. **Kein Formatwechsel** in 2.1 (keine 7-Bit-Indizes). Die 6-Bit-Grenze bleibt; das Format wird erst in **3.1**
   angehoben (dann mit Fassungs-/Migrationsweg, vgl. § 12.8).
2. `TABELLE_AUFTRAEGE` bleibt **unverändert die 58 IDs in historischer Reihenfolge**;
   `TABELLE_AUFTRAEGE_LAENGE = 58` bleibt. Die 2.1-Handtickets sind **nicht klassenraum-adressierbar**; das wird
   im Codec-Kopf und in § 12.8 dokumentiert.
3. **Keine Umsortierung** bestehender oder neuer Tickets, um eine „lebende Reihenfolge" zu erzwingen.
4. **Test-Invariante statt Gleichheit:** (a) alle 58 IDs existieren genau einmal in `DATEN.tickets`,
   (b) die Tabelle ist 58 lang und duplikatfrei, (c) alte Codes bleiben stabil (Beispielcodes für Index 55/56/57
   → `storage-01/02/03`), (d) Fertigkeitentabelle = 30, (e) die lebende `ticketReihe()` darf wachsen und wird
   nicht mit der Codec-Tabelle gleichgesetzt.
5. Ehrliche Grenze: 3.1 muss vor dem Klassenraum-Feldtest das Format anheben — sonst sind nur 58 von 76 Aufträgen
   per Code aufrufbar.

## 18 · Frontend-Redesign — Gestaltungsvertrag (29.10.2026) — verbindlicher Vertrag

*Wiederhergestellt am 31.10.2026 für 3.0.0. Der vollständige Gestaltungsvertrag mit allen Farbtabellen,
Komponenten- und Shell-Maßen steht im Git-Stand `9716b08^:docs/Architektur.md` und in
[`entwicklung/Design – Spielspaß 2.0.md`](<entwicklung/Design – Spielspaß 2.0.md>); für 3.0.0 gelten die dort
festgehaltenen Tokens und Regeln, ergänzt durch die Abschnitte 21–26.*

**Anlass.** Der Nutzer hat ein „komplettes Redesign des Frontends" beauftragt: **Optik + Shell neu, Bedienlogik
und Ansichten bleiben**. Basis ist die Bildvorlage **A · „Matrix-Elegant"** unter
`Nachweise/Prototypen-Redesign/` (nicht versioniert). Dieser Abschnitt ist die eine Quelle für Farbtokens,
Typo-Skala, Shell-Maße, Komponenten und die Zuordnung zu den Dateien — „Vertrag zuerst".

### 18.1 Geltung und Nicht-Ziele

| Gegenstand | Festlegung |
|---|---|
| Gilt für | alle sichtbaren Flächen des Web-/Windows-/Einzeldatei-Baus: Tokens, Typo, Shell (Kopfzeile, linke Leiste, Statusfuß), Karten, Knöpfe, Dialoge, Toasts, Netzfläche, Werkzeuge, alle Ansichten |
| Gilt **nicht** für | Bedienlogik, DOM-Verträge, Datenformen, Simulation, Tests mit Verhaltenszusicherung, Inhaltstexte — diese bleiben unangetastet |
| Basis-Vorlage | **A · Matrix-Elegant**; B (Holo-Suite) und C (Neon-Blueprint) bleiben Stimmungshilfen, kein Vertragsbestandteil |
| Nicht-Ziele | keine neuen Ansichten, keine neuen Gerätetypen, keine neuen Inhalte/Tickets, kein Umbau der Android-Eigenheiten über die gemeinsamen Tokens hinaus, keine Änderung an `tests/sim-stand.json` |
| Grundsatz | die Vorlage ist **Stimmungsvorlage**, keine 1:1-Implementierung: Mikrolabels 8–9 px werden auf ≥ 11 px gehoben (§ 18.5) |
| Veraltet | § 16.4 bleibt in Kraft (Bewegung, Icon-Regel, Press-Regel) und wird durch § 18.5–18.9 ergänzt; bei Widerspruch gilt § 18 |

### 18.5 Typografie

**Schriften** (unverändert, in `basis.css` und im Projektstamm `schriften/`): `--display: Bricolage Grotesque`
(600/800 — Wortmarke, H1, Kartentitel, Knöpfe), `--body: Atkinson Hyperlegible` (400/700 — Fließtext, Zeilen),
`--mono: JetBrains Mono` (400/600 — Mikrolabels, IPs, Messwerte, Statuszeile). **Keine neuen Schriftdateien,
keine Netzschriften.**

| Token | px | Verwendung |
|---|---|---|
| `--fs-1` | **11** | Mikrolabels (Mono, Versalien, Sperrung `.08em`), SVG-Beschriftung, Chips, Statuszeile — **Untergrenze für funktionale Beschriftung** |
| `--fs-2` | **12.5** | dichte Zeilen, Tabellen, Hinweise |
| `--fs-3` | **14** | Standard-Fließtext in Karten und Formularen |
| `--fs-4` | **16** | Grundtext (`body`) |
| `--fs-5` | **20** | Kartentitel, Abschnittsüberschriften |
| `--fs-6` | **28** | H2/Ansichtstitel |
| `--fs-7` | **34** | H1 klein / große Zahlen |
| `--fs-8` | **44** | H1 der Vorlage A (44/46) |

**Regeln:** Funktionale Beschriftung **nie unter 11 px** (Gate `ui-typografie.test.js`). Mono nur für **Daten**
(IPs, Ports, Messwerte, Status, Mikrolabels), nicht für Fließtext. **13 px und 15 px** sind Altlasten aus
v2.1.0 — `ethos.py` erlaubt sie bis zur Umstellung, neu entstehen dürfen sie nicht. H1/H2 mit
`line-height: 1.1–1.15`, `text-wrap: balance`; Satzbreite max. **72 Zeichen** je Spalte, Karten mit Fließtext
≥ 320 px.

## 21 · Runde 3b — Audit-Umsetzung, Ambient und lebende Zonen (30.10.2026) — verbindlicher Vertrag

**Auftrag (Nutzer, wörtlich).** „dann fixe diese doch, warum hast du das nicht gleich gemacht?"
(bezogen auf die 13 Audit-Signale), „Wenn ein PC aus der Zone geschoben wird muss die zone sich mit ihm
verschieben", „es fehlen noch so die ganzen ambient, atmenden, pulsierenden effekte".
Beleg: Nachweise/Prototypen-Runde3/audit/NOTIZ.md (13 Signale mit Messwerten) und audit-umsetzung/NOTIZ.md.

**Umsetzung (Dateien, je ein Schreiber).**
- hub.css / karriere.css / spiel.css: Heute-Datenflächen 10 → 2 (Rahmen gesamt 12 → 7, Rest = Buttons),
  Typo-Hierarchie statt 11-px-Monokultur (Anteil <= 12,5 px: 87 % → 77 %, >= 14 px: 12 → 22 Knoten),
  Messing-Versalien 41 → 0; Lernstand 119 → 79 Rahmen, Kompetenzbereich kartenlos; Shop von 4 auf 2
  Rahmen, Regal zweispaltig, Akzentwand weg; Einstellungen als eine Segmentfläche; Postfach-Neon-Reste
  (Kundenkante, Icon-Platte, Pillen) entfernt, Kacheln gestreckt, Aktionsleiste 44 px unten.
- zz-polaris.css / editor.css / inspektor.css / basis.css: die Doppel-Schrägstrich-Labels aus allen
  UI-Beschriftungen entfernt (Ersatz: 2-px-Akzentlinie oder Satzlabel); Labor-Kopf Kunde unter dem Titel
  (gemessen: POLARIS 1440 Titel 253 x 39 / Kunde 103 x 18, Abstand 4 px, kein Overlap; Messing 231 x 36 /
  101 x 16); Versalien reduziert, Sperrsatz <= .06em; neue Tokens --dauer-atmen 5000 ms,
  --dauer-licht 6000 ms, --dauer-lauflicht 700 ms.
- Theme-Dateien: Ambient sichtbar (Fläche atmet: Messing 9 s, Pulsar 7 s + Sternenpunkte, Keramik 12 s,
  Nordlicht Aurora, Papier Papierkorn; Deckkraft .12–.20), Interaktion: Dock-Knopf atmet, Primärknopf-
  Schein, Auswahlring pulsiert 320 ms, Live-Kabel mit laufendem Lichtpunkt; „Bewegung aus" = Standbild
  (basis.css zentral). Heute-Kontrastblock für alle Themes (Messing 8,38:1, Pulsar 12,29:1, Keramik 5,93:1,
  Nordlicht 14,18:1, Papier 6,83:1; alle >= 4,5:1); Ursache der schwarzen Messing-Knöpfe war eine
  Ambient-Sheen-Regel, die die Primärfläche überschrieb — behoben (Schein animiert nur box-shadow).
- editor.js: Zonen wandern live — geraetBewegt() ruft zonenNeu(); Hülle und Chip werden während des
  Ziehens pro Frame neu berechnet, die Zone folgt dem Gerät bzw. wächst mit.
- Leisten-Labels (Runde 3a) und Umlaute bleiben unverändert gültig.

**Gates (letzte Messung).** 873/873 Tests, ethos GRÜN (R4 169, R6 7, R9 58, R10 40 — besser als Stand),
klassen 0, umlaute GRÜN, Rauchtest 45/45 (letzter Lauf), starttest GRÜN. R12 nicht gemessen (--dom).
Ambient im Build per CDP-Frames belegt (16,5 % Pixel sichtbar verändert; „Bewegung aus" = 0 Animationen).

## 22 · Bento 2.5 „Arbeitsplatz" (30.10.2026) — verbindlicher Gestaltungsvertrag

**Auftrag (Nutzer, sinngemäß).** Postfach „lieblos und unpersönlich", Kunden „zu kindlich statt
Job-Simulation mit Kundenprofil", Dashboard „einzelnes unordentliches Objekt" (Ziele, Sitzung,
Klassenraum), Training „Kaskade an Einheiten" und „altes Design", minimierte Leiste „komplett
überarbeiten: viel interaktiver, bessere und innovativere Inhalte"; dazu der Hilfeleiter-Slogan aus
dem ersten Screenshot. Ziel: eine ruhige, dichte Arbeitsoberfläche eines IT-Dienstleisters in
Bento-Form — echte Hierarchie, glaubwürdige Daten, wenig Farbe, keine Emoji-Deko, keine
Riesen-Slogans in Funktionsflächen.

**Vertrag.** Vollfassung: [`Entwurf – Bento 2.5 (Arbeitsplatz).md`](<entwicklung/Entwurf – Bento 2.5 (Arbeitsplatz).md>).
Die Leitsätze:

1. **Bedienlogik, Datenwege und Spielzustand bleiben unverändert.** Keine Änderung an
   `src/sim/`, `src/modell/`, `src/kern/`, `src/cli/`; Ansichten rufen dieselben `Spiel.*`-Wege.
2. **Test-Haken bleiben** (Klassen und Bedeutung): `.sp-postfach/.sp-pf-liste/.sp-leser/.sp-mail/
   .sp-brief/.sp-knoepfe/.sp-blatt/.sp-hilfe/.sp-leiter`, `.hb-seite`, `.kr-seite/.kr-kopf/
   .kr-raster/.kr-kunde/.ka-block`, `.tr-seite/.tr-liste/.tr-karte/.tr-geruest/.tr-quelle/
   .tr-ergebnis/.tr-offen/.tr-grund/.tr-lernen/.tr-fehler*`, Leisten-Haken siehe Test
   `spiel-leiste-hilfe.test.js` (`.lk-zeile` mit exakter Kindfolge, `.lk-auf`, `.lk-mini`,
   `.lk-mini-hilfe`, `Mini`-Zeichen, Hilfe-Knopf).
3. **Nur Tokens.** Neue Flächen nutzen ausschließlich `basis.css`-Tokens. Schrift nur
   `var(--fs-*)`, Abstand nur {0,4,8,12,16,24,32}px, Radius nur Tokens, keine Farb-Literale,
   kein `!important` außerhalb `basis.css` (Gates: `tools/ethos.py`, `tools/klassen.py`,
   `ui-typografie`, `ui-symbole`). Die fünf Theme-Dateien `zzz-thema-*.css` bleiben unangetastet;
   bestehende Klassennamen bleiben, damit ihre Regeln weiter greifen.
4. **Keine erfundenen Zahlen, keine Emoji in der UI-Chrome.** Anzeige nur aus `Spiel.*`/`DATEN`;
   Kunden-Emoji (`DATEN.kunden[*].symbol`) wird in den Kundenflächen durch Monogramme ersetzt.
5. **Gemeinsame Bausteine der Leitung:** `src/stil/bento.css` (12-Spalten-Raster `.bn-raster`,
   Kachel `.bn-k` mit Varianten `flach|akzent|iris|geld`, `.bn-kopf/.bn-kicker/.bn-titel/.bn-lead/
   .bn-meta/.bn-fuss/.bn-zeile/.bn-wert/.bn-chips/.bn-chip/.bn-marke/.bn-trenner/.bn-leer`,
   Spalten `.bn-s3…s12`) und `src/ui/bento.js` (`UI.bento.monogramm/initialen/kachel/kopf`).
6. **Ein Schreiber je Datei.** Postfach: `spiel.js` + `spiel.css`; Kunden: `karriere.js` (nur
   Kunden/Kundenakte) + `karriere.css` + `kundenakte.css`; Dashboard: `hub.js` + `hub.css`;
   Training: `training.js` + `training.css`; Leiste: `leiste.js` + `leiste.css`; Grundlage und
   Integration: Leitung (`bento.*`, Doku, Werkzeuge, Nachweise).
7. **Abnahme je Bereich:** private Vorschau `python tools/vorschau.py --name <bereich>` +
   `python Nachweise/bento/foto.py --html vorschau-<bereich>.html --marke <bereich>` (Bilder
   1440/960/720), Sichtprüfung, mindestens zwei Iterationen; `node tests/run.js` grün,
   `klassen.py` 0, `ethos.py` GRÜN (R4/R9/R10 dürfen nicht steigen), `umlaute.py` GRÜN.
8. **Nicht Teil des Umbaus:** neue Ansichten, Änderungen an Simulation/Netz/Codec/Spielstand,
   Themes, Fassung, Push/Release. Die Leitung committet, zieht Doku/Stand nach und legt die
   Abnahme vor.

**Stand (30.10.2026).** Umgesetzt von fünf parallelen Bereichsteams (ein Schreiber je Datei), danach
von der Leitung integriert und von zwei unabhängigen Prüfungen (Design; Theme/Struktur) gegengelesen.
Gates: `node tests/run.js` **878/878 grün**, 0 übersprungen · `sh tools/test.sh --rauch` **45/45** ·
`python tools/klassen.py` **0** · `python tools/ethos.py` **GRÜN** (R2 20→19, R4 169→153, R9 62→58,
R10 42→39) · `python tools/umlaute.py` **GRÜN** · `node tools/sim-stand.js` **unverändert** ·
`python tools/seite.py --pruefen` **GRÜN** (54 Dokumente). Sichtprüfung je Bereich bei 1440/960/720,
Theme-Prüfung 7 Zustände × 7 Ansichten ohne harten Kontrastbruch, 0 Emoji in `src/ui/**`/`src/stil/**`.
**Nicht gemessen:** R12 (`--dom`), Lauf in Android, Hover-/Tastaturzustände im Vollbild. Die
Windows-`.exe` wurde dagegen gebaut, mit `tools/q-echt.py` echt bedient und gestartet. Fassung
**2.5.0** ist gezogen; Zweig `ausbau-1.2`, Tag `v2.5.0` und GitHub-Release wurden am 30.10.2026
mit ausdrücklicher Nutzerfreigabe veröffentlicht. **Patch 2.5.1** (31.10.2026) verkürzt den
Zuklapp-Timer der Leiste von 5 s auf 1 s. Einzelheiten:
[`Übergabe – Stand 30.10.2026 – Bento 2.5`](<entwicklung/Übergabe – Stand 30.10.2026 – Bento 2.5.md>).
## 23 · Runde 4 — Jobdoku, Flugschreiber, Fenster (31.10.2026) — verbindlicher Vertrag

**Auftrag (Nutzer, sinngemäß).** Die noch alten Flächen (Verdacht/Akte, Lernstand, Simulator,
Inspektor, Shop, Fenster, Interaktion) sollen eine eigenständige Bento-2.5-Sprache bekommen und zu
einer glaubwürdigen Job-Simulation mit didaktischer Hilfe professionalisiert werden — kreativ neu
gedacht, nicht poliert; ausgeliefert als Fassung 2.6.0 inklusive Push, Tag, Release und Live-Seite.
Vollfassung: [`Entwurf – Runde 4 (Jobdoku & QoL)`](<entwicklung/Entwurf – Runde 4 (Jobdoku & QoL).md>).

**Neue und getrennte Oberflächen-Dateien (Phase 0, Verhalten unverändert).**
- `src/ui/lernstand.js` (`UI.lernstand`: Ansicht, Kompetenzkarte, Prüfungstag, Training) und
  `src/ui/shop.js` (`UI.shop`: Werkstattregal, Kauf) sind aus `src/ui/karriere.js`
  ausgelagert; `src/stil/lernstand.css` und `src/stil/shop.css` aus `karriere.css`.
- `UI.karriere._helfer` stellt `overlay` bereit (für die ausgelagerten Ansichten).
  `UI.karriere.lernstandAnsicht/shopAnsicht/training/pruefungUebersicht/pruefungAbgeben` bleiben
  als Alias erhalten. Ansicht-IDs (`lernstand`, `shop`) und `UI.startHaken` unverändert.
- `src/ui/naechster.js` (`UI.naechster`) und `src/ui/fehlerziel.js` (`UI.fehlerziel`) neu.

**Datenformen und Schnittstellen (nur additiv).**
- `Spiel.akte`: `Spiel.akte.schichten(inst) → [{n, name, text, karten}]`,
  `Spiel.akte.fundort(karte, inst) → ziel|null`, `Spiel.akte.fortschritt(inst) → {…}`,
  `Spiel.akte.bericht(inst) → Text (ohne Lösung)`; `Spiel.akte.FORTSCHRITT` = die sechs Stufen
  (beobachten · messen · eingrenzen · Hypothese · handeln · dokumentieren).
- `UI.fehlerziel.springen(ziel) → {ok, schritte, grund, ort}` mit
  `ziel = {art:"geraet"|"port"|"kabel"|"frame"|"ebene"|"zone", geraet, port, kabel:{a,b}|id, frame, ebene, werkzeug, dock, leise, ms, zentrieren}`:
  EIN Resolver für Akte, Simulations-Panel und Inspektor; öffnet Labor, wechselt Ebene, wählt
  Gerät/Port/Kabel, zeigt den Inspektor, zentriert und hebt hervor. Er wirft nie, ruft kein
  `focus()`, respektiert `UI.bewegung()`. Hilfen: `zielAusEreignis`, `kabelEnden`,
  `ortText`, `istProblem`.
- `einst.anfaengerHilfe: bool` (store `"einst"`). Fehlt der Wert, gilt Standard **an** bei
  Karrierestufe ≤ 2, sonst aus. Lese-/Schreib-API: `UI.simpanel.anfaengerHilfe()` und
  `UI.simpanel.anfaengerHilfeSetzen(bool)`; Bedienung im Panel-Kopf und in den Einstellungen
  (`src/ui/karriere.js`, Abschnitt „Lernen").
- `Spiel.hilfe.anfaengerSchritte(inst)` und `Spiel.naechsterOrt(inst)`: additive
  Anzeigehilfen (keine Änderung an Schwellen, Vorrat oder Bezahlwegen).

**Oberfläche (Präfixe bleiben, Testhaken bleiben).**
- Einsatzakte `ak-` (Reiter `akte` im Dock; `.ak-karten/.ak-karte/.ak-verdacht/.ak-chip`
  bleiben), Ausbildungs-Cockpit `lern-`/`nst-`/`kk-` (`.kr-kopf`/`.kr-seite` bleiben),
  Flugschreiber `si-` (`.si-kopf`, `.si-warn`, `.si-hilfe` neu; `.si-zeile` bleibt),
  Inspektor `in-` (Steckbriefe; `[data-reiter]` bleibt), Fensterkopf `fenster-knopf` in
  `src/stil/rahmen.css` (nur `Plattform.name === "tauri"`), Werkstattregal `wr-`/`kr-ware`.
- Fenster: `shell/src-tauri/src/fenster.rs` schaltet im Modus „voll" `set_decorations(false)`
  (Leiste/Tray unverändert) und bietet den Befehl `fenster_knopf("minimieren"|"maximieren"|"schliessen")`;
  `src/ui/app.js` baut die Kopfzeile mit `data-tauri-drag-region="deep"` und drei 44-px-Knöpfen.
- `src/stil/bento.css`: `.bn-s12`/`.bn-k.breit` fallen im ≤-900-px-Raster auf eine Spalte
  zurück (Reparatur des 720-px-Befunds aus Strang B).

**Gates (gemessen 31.10.2026).** `node tests/run.js` **930/930 grün**, 0 übersprungen ·
`sh tools/test.sh --rauch` **45/45** · `klassen.py` **0** · `ethos.py` **GRÜN**
(R1 23, R2 17, R4 140, R9 58, R10 42) · `umlaute.py` **GRÜN** · `sim-stand.js` unverändert ·
Bau 138 Module. Sichtprüfung/Rollen: fünf Bereichs-Owner, zwei unabhängige Prüfungen (Design;
Theme/Struktur/A11y), Leitung integriert, committet und veröffentlicht. **Nicht gemessen:** R12
(`--dom`), Android-APK, echte Maus im ausgelieferten Tauri-Fenster (Prüfbau mit eigener Kennung,
weil eine fremde Instanz lief). Einzelheiten:
[`Übergabe – Stand 31.10.2026 – Runde 4`](<entwicklung/Übergabe – Stand 31.10.2026 – Runde 4.md>).

## 24 · Runde 5 — Auftragsbogen, Inspektor, Leiste als Begleiter (31.10.2026) — verbindlicher Vertrag

**Auftrag (Nutzer, sinngemäß).** Nach 2.6.0 meldet der Nutzer drei Bildschirmfotos zurück:
„unordentlich überlappende Elemente", „manche Elemente sind nicht richtig ausgerichtet", die
Minileiste „vermittelt visuell nicht ihren Nutzen, sondern overwhelmed", das Zusammenfallen der
Leiste müsse „schöner animiert" werden, und „die Aufträge zu simulieren im Minimodus funktioniert
nicht richtig, da viel zu wenig Kontext herrscht … das Konzept muss umgedacht werden". Verlangt:
Full Skill Usage und Agenten-Schwärme. Vollfassung:
[`Entwurf – Runde 5 (Leiste & Auftragsmappe)`](<entwicklung/Entwurf – Runde 5 (Leiste & Auftragsmappe).md>).

**Auftragsbogen (A).**
- `UI.spiel.mappeAuf(reiter="brief", erstes=false, mitFokus=true)` — optionaler dritter Parameter;
  `mappeZu()` unverändert. Fokus geht in die Mappe und beim Schließen zurück zum Auslöser.
- Zustand: solange die Mappe offen ist, trägt `.labor` die Klasse `mappe-an`; `editor.css`
  blendet `.lb-leiste-oben`, `lb-leiste-unten` und `.lb-leinwand::before` aus
  (`visibility:hidden`, Platz bleibt) und hebt `.lb-auftrag` auf `z-index:30`.
  Die Klasse wird bei jedem Neuzeichnen gesetzt/entfernt (Schließen, Ticketende, Ansichtswechsel).
- Die Mappe bleibt Kind von `#labor-auftrag` (Testhaken unverändert); Höchsthöhe
  `max-height:var(--am-max, min(70vh,560px))` (spiel.js setzt `--am-max` aus dem freien Platz),
  `--am-links` richtet die Blattkante an der Auftragszeile aus; ≤900 px als Blatt von unten.
- Der frühere Kopfraum-Hack (`--am-kopfraum`/`padding-top`) ist entfallen; die
  `--leiste-h`-Messung in editor.js bleibt.

**Karte (D).** Knoten-Labels: Baselines Name/Rolle/IP bei `ikonH+18/33/48` (15 px), Box bis
`+62`, `line-height:1.15`; Decluttering (`labelUeber`) gilt auch für `.ger-ip`; die
Adresse erscheint nur bei Hover/Auswahl oder Zoom `≥ IP_ZOOM (0,85)`.

**Inspektor (B).** Kopf kompakt (Mikrolabel · Name · Rollenzeile · eine Kennzahlenzeile). Ports:
2-zeiliger Block je Port (Zeile 1 Name + Link-Chip + Modus-Chip; Zeile 2 zwei gleich breite Felder
`Modus`/`VLAN` mit je einer Beschriftung, ≥44 px); die Portliste scrollt in sich, ihre Höhe
wird auf ganze Portzeilen gerundet (rAF + ResizeObserver) — keine angeschnittene Zeile. Die
SVI-Verwaltungskarte liegt im VLAN-Reiter.

**Mini-Leiste (C) — Konzept „Begleiter".** Die Leiste löst keine Aufträge; sie begleitet:
- zugeklappt 300×56: Stufe · Rolle vollständig, drei Werte in einer Zeile (`€/h · Ruf · offen`),
  Deckkraft Standard `0.92` (`store "einst".leiste.deckkraft`, geklemmt 0,6–1; Regler in app.js
  60–100 %), Hover 1;
- aufgeklappt 320×300: „Jetzt dran" (Kunde · Auftrag + nächster Schritt aus `Spiel.naechsterOrt`/
  `Spiel.naechsteDiagnose`, Primär „Im Labor fortsetzen", Sekundär „Auftrag lesen" über
  `UI.spiel.mappeAuf`), „Kurzübung (freiwillig)" (bestehende Mini-Frage mit Kontextzeile aus dem
  aktiven Auftrag), „Lage" (Verträge/Serie/offen), Schnellaktionen;
- Animation: 320 ms `cubic-bezier(.22,1,.36,1)` für Höhe/Breite, Inhalt gestaffelt 40/80/120 ms;
  Zuklappen Inhalt zuerst, Karte danach, Fenstergröße (`Plattform.fenster.groesse`) erst nach der
  Karten-Animation; „Bewegung aus" = sofort. Maße und `.lk-*`-Haken bleiben Testvertrag.

**Gates (gemessen 31.10.2026).** `node tests/run.js` **932/932 grün**, 0 übersprungen ·
Rauchtest **45/45** · `klassen.py` **0** · `ethos.py` **GRÜN** (R1 23, R2 17, R3 4, R4 135,
R9 58, R10 42; R12 nicht gemessen) · `umlaute.py` **GRÜN** · Simulation unverändert · 138 Module.
Ein Test wurde umgestellt (nicht abgeschwächt): `tests/ui-leiste-ueberlappung.test.js` prüft die
neue Mechanik (`mappe-an`/`visibility:hidden` statt Kopfraum) mit 6 statt 4 Fällen.
**Nicht gemessen:** R12 (`--dom`), Android-APK, echte Maus im ausgelieferten Tauri-Fenster
(nur Prüfbau), Screenreader.

## 25 · Runde 6/7 — Kurzübung mit Kontext und Flugschreiber-Aufmerksamkeit (31.10.2026)

**Runde 6 (Kurzübung).** Neues Modul `src/spiel/kurzfrage.js`:
`Spiel.kurzfrage.fuer(inst, {niveau}) → {id,titel,frage,lage:[{label,wert}],optionen:[{text,richtig}],
erklaerung,ort} | null`. Fünf Vorlagen (netz/maske/gateway/portmodus/zustand) aus `inst.netz`,
`Modell.adressen`, `Sim.adresse`, `IP.*`, `g.running.ports/.if`, Kabeln und `g.an`;
deterministisch aus `inst.iid` (Zufall ohne Uhr); genau eine richtige Option; Niveau E/AP1/AP2;
Lage 2–4 Zeilen; kein Lösungstext (Fehlerstellen nach `Spiel.plan.diff` ausgeklammert). Die
Leiste (`src/ui/leiste.js`, `leiste.css`) rendert bei offenem Auftrag diese Frage mit
Lage-Block; ohne verwertbares Netz zeigt sie keine Frage, sondern den Weg ins Labor. Das generische
Mini-Ticket bleibt als Kopfübung im Dialog (karriere.js/mk-einordnung).

**Runde 7 (Flugschreiber).** `src/ui/simpanel.js` + `simulation.css`: eine Lesespalte mit drei
Ebenen — Ergebnis (Urteil 28 px, eine Zahlenzeile, Segmentleiste), Befund (erster Fehler als
2-px-Rail-Zeile, ein Erklärungssatz, leiser Weg „Zum Fundort →"), nächster Schritt (numerierte
Hilfe, hängender Einzug, leiser Verweis „Gerät zeigen →"). Höchstens EIN gefüllter Hauptweg je
Zustand, alle übrigen Ghost 32 px; sichtbare 44-px-Trefferflächen für Transport/Filter bleiben
unsichtbar erhalten. Hilfe an/aus als Ghost-Schalter, Format als Textsegment. Testhaken `.si-*`,
Transport, Zeitachse, `UI.simpanel.anfaengerHilfe` und PDU unverändert.

**Messung (31.10.2026).** Runde 6: 950/950 Tests in der abgetrennten Prüfkopie; 228/228 Fragen über
76 Handtickets × 3 Niveaus; Lösungstext-Scan 0 Treffer. Runde 7: Dock 380 px, laute Knöpfe 11→2,
primäre 3→0 (Fehler+Hilfe an), Flächen 4→1; 10→2/3→0/3→1 (Hilfe aus); 6→2/4→1/2→0 (Ergebnis);
Überlauf 0; Mikrolabel 6,08:1. Im gemeinsamen Arbeitsbaum 1033/1033 grün (dieser Commit enthält nur
Runde-6/7-Dateien). R12 nicht gemessen.

## 26 · Runde 8 — Abteilung „Subnetting" (31.10.2026) — verbindlicher Vertrag

**Auftrag (Nutzer, wörtlich).** „NetLab braucht ein Subnetting abteil wo das intensiv beigebracht,
gelehrt mit visuellen Hilfselementen und Übungsaufgaben und tools / spielchen sind nur zum lernen von
subnetting und vLAN. … wie das am besten in die bestehenden themes integriert wird und auch wo, ich
denke ein eigenes abteil wird dem gerecht. Generell sollen alle Aufgaben Inhaltlich und vom
Lernschwierigkeitsgrad optimiert werden. Mache das vollständig fertig und melde dich wenn der build und
deploy fertig ist." Vollfassung:
[`Entwurf – Runde 7 (Abteilung Subnetting)`](<entwicklung/Entwurf – Runde 8 (Abteilung Subnetting).md>).

**Neue Ansicht `subnetz` („Subnetting").** Eigene Registrierung über `UI.startHaken` +
`UI.app.registrieren("subnetz", …)`; Dock-Reihenfolge in `app.js` `REIHE` direkt nach „labor"
(`UI.app.liste()` überspringt unbekannte Namen, der Eintrag ist damit auch ohne Ansicht unschädlich).
Vier Register: Lehrpfad (8 Module), Werkzeuge (6), Üben & Spielen (Generator + 3 Lernspiele),
Formelsammlung. Kein Geld, kein Ruf, kein Spielstand-Feld.

**Datenformen (nur additiv, headless).**

- `Spiel.subnetz` (`src/spiel/subnetz.js`): `VERSION`, `STUFEN` (`E|AP1|AP2`), `ARTEN` (11 Typen:
  `netzid, broadcast, hosts, maske, block, subnetze, vlsm, zusammenfassen, vlan-port,
  vlan-erreichbar, trunk`), `rechnen(ip, praefix)`, `maskeZuPraefix`, `praefixZuMaske`,
  `gleichesNetz`, `plan(basis, bedarf)`, `zusammenfassen(netze)`, `aufgabe({art, niveau, seed})`,
  `satz({arten?, niveau, anzahl, seed})`, `pruefen(aufgabe, antwort)`,
  `antwort(aufgabe, richtig, {hilfe?, spiel?})`, `fortschritt()`, `modulSetzen(id, status)`,
  `zuruecksetzen()`. Deterministisch über einen gesäten Generator; **kein** `Math.random`, keine
  Uhr, kein Datum.
- Aufgabe: `{id, art, niveau, skill, titel, frage, lage[], eingabe{art, optionen?}, loesung{wert, text},
  rechenweg[{n, titel, text, ergebnis}], erklaerung, hinweis, visual{art, preset}, quelle}`.
  `rechenweg` endet in `loesung.wert`; genau eine richtige Antwort; alle Angaben in `lage`.
- `DATEN.subnetzLehrplan` (`src/daten/subnetz-lehrplan.js`): `version`, `formelsammlung[]`,
  `module[8]` (feste Reihenfolge `bits, maske, block, netzid, schneiden, vlsm, vlan, pruefung`) mit
  `stufe, titel, kicker, lead, kern[], merksatz, visuell{art, preset}, beispiel[{titel, aufgabe,
  schritte[], ergebnis}], uebung{arten, niveau, anzahl}, pruefung{arten, niveau, anzahl, bestehen},
  verweise{wiki, werkzeug, training}, dauerMin, quelle`.
- `UI.subnetzwerkzeuge` (`src/ui/subnetz-werkzeuge.js`): `liste()` (6 Werkzeuge), `zeichnen(container,
  id, opts)` → `{zerstoeren()}`, `spiele.liste()` (3 Spiele), `spiele.starten(container, id, opts)`.
  Werkzeuge: `bitlabor, maskenleiste, blocklineal, rechner, vlsm, vlan`. Spiele: `praefix-blitz,
  netz-sortierer, vlan-patcher`.
- Eigener Speicher `store "subnetz"` **v:1**, ausschließlich über die API:
  `{v:1, module:{[id]:{status:"neu"|"gelesen"|"geuebt"|"sicher", richtig, falsch, serie}},
  spiele:{[id]:{bestwert, runden}}, gesamt:{richtig, falsch, serie}}`. `Spiel.st` (v:3) bleibt
  unverändert — keine Migration, alte Stände bleiben gültig.

**Lernen und Verbuchung.** Ausschließlich über `L.ueben(skill, ok, {hilfe})` / `L.fehler("labor-subnetz",
skill, text)`; Werkzeuge, die die Lösung zeigen, verbuchen `{hilfe:true}` (Karte steigt nicht).
Module: `neu < gelesen < geuebt < sicher`; „sicher" = Prüfrunde bestanden (≥4 von 5, ohne Hilfe);
ein Fehler senkt „sicher" auf „geuebt", nie unter „gelesen". Kein Geld/Ruf.

**Lernstufen (verbindlich, Prüfmaßstab).** E: /24–/28, letztes Oktett, 1 Schritt, `hinweis` immer;
AP1: /20–/30, 2–3 Schritte; AP2: /16–/31, 3–5 Schritte, optional Zeitdruck. VLSM: E –, AP1 2–3 Netze,
AP2 4–5 Netze inkl. Reserve. VLAN: E ein Access-Port, AP1 zwei Ports/Erreichbarkeit, AP2 Trunk/Tagging/
Native/allowed. Formulierungsregeln und die Vorher/Nachher-Liste der optimierten Bestandsaufgaben:
[`Subnetting – Lernstufen-Matrix`](<entwicklung/Subnetting – Lernstufen-Matrix.md>) und Entwurf § 10.

**Optimierte Bestandsaufgaben (belegt, Tests grün).** `vlan-netzgroesse` lehrt jetzt Hosts je VLAN →
Präfix statt „/24 auf n VLANs"; `mini-sub-1`/`mini-sub-3` Stufen getauscht (Netzadresse /26 = AP1,
Hosts /28 = E; Stufen-Multiset unverändert); `mini-trunk-5` mit ausdrücklichem Native-Kontext;
Denkhilfen für `mini-vlan-6`, `mini-trunk-5`, `mini-rostick-4`; doppelte Trainings unterscheidbar
(`tr-trunk-erlauben`/`tr-trunk-allowed`, `tr-netz-maske`/`tr-netz-nachbar`); `tr-subnetz-plan` auf
E-Niveau gestützt (Teiltabelle) ohne die Format-Regel `niveau = f(art)` zu brechen.

**Einfügung in die Themes.** Nur Tokens aus `basis.css` und Bausteine `bento.css`
(`.bn-raster/.bn-k/…`); eigene Klassen `sn-*` (Abteilung), `sw-*` (Werkzeuge), `sg-*` (Spiele).
Alle 5 Zusatz-Themes + hell/dunkel/system bei 1440/960/720 geprüft; VLAN-Farben `--vlan-1…8` nur mit
Nummer; 44-px-Ziele scopen (global `.knopf` = 40 px); Fokusring zentral, kein eigener
Reduced-Motion-Block; keine Emoji.

**Einfügung in die Navigation.** Dock (`REIHE`, Kurzform „Subnetz" gegen den Wortumbruch bei 76 px),
Befehlspalette (automatisch über `UI.app.liste()`, dazu sechs Befehle „Subnetting: Werkzeug …"),
`tools/rauch.py` (ein Fall „Subnetting" → **48/48**), Querverweis am Ende der Trainingsliste
(„Zur Abteilung Subnetting") und interne Verweise zu Wiki (`UI.wiki.oeffnen`), Labor und Training.
**Kein Hub-Umbau:** das „Heute"-Raster hat eine feste 12-Spalten-Belegung; eine zusätzliche Kachel
hätte die gemessene Bento-Ordnung gebrochen (im Entwurf § 2.5 als „nur wenn messbar Platz frei"
vorgesehen, hier bewusst verworfen).

**Nicht Teil der Runde:** neue `DATEN.skills` (30 — Codec- und Dichte-Tests eingefroren), neue
Tickets, Änderungen an `spiel/injektoren.js`/`spiel/mini.js`-Mechanik/Lernmotor, `src/sim|modell|kern|cli`.

**Stand (gemessen am 31.10.2026).** `node tests/run.js` **1049/1049 grün**, 0 übersprungen
(118 Testdateien, 98 headless Module) · Rauchtest **48/48** · `klassen.py` **0** · `ethos.py` **GRÜN**
(R1 23, R2 17, R3 4, R4 134, R5 0, R6 7, R7 0, R8 0, R9 58, R10 41, R11 0; R12 nicht gemessen) ·
`umlaute.py` **GRÜN** · Simulation unverändert · Bau **143 Module** (98 headless) · Einzeldatei
**4.080.274 B**, SHA256 `49fc2fa5…`, `docs/index.html` und `Netzwerk-Labor.html` byte-gleich ·
Doku 65 Dokumente, 0 tote Verweise, `seite.py`/`stand.py --pruefen` grün · Sichtprüfung
1440/960/720 × 7 Theme-Zustände: 0 seitlich scrollende Seiten, 0 JS-Fehler, 0 Kontrastverstöße,
„Bewegung aus" = 0 Animationen (3 abgeschnittene Textknoten nur in der VLSM-Balkenbeschriftung
kleiner Blöcke — die Legende nennt den vollen Namen; Bit-Zellen sind die begründete Ausnahme der
44-px-Regel). Fassung **2.9.0** (`VERSION_CODE` 20901), veröffentlicht mit Tag `v2.9.0`.
Einzelheiten: [`docs/STAND.md`](STAND.md), [`CHANGELOG`](CHANGELOG.md),
[`Übergabe – Stand 31.10.2026 – Runde 8`](<entwicklung/Übergabe – Stand 31.10.2026 – Runde 8.md>)
und [`Subnetting – Lernstufen-Matrix`](<entwicklung/Subnetting – Lernstufen-Matrix.md>).
**Nicht gemessen:** R12 (`--dom`), Android-APK, Screenreader, echte Maus im ausgelieferten
Tauri-Fenster.
