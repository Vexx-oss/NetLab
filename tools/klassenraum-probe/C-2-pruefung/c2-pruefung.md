# C2 · Gegenprüfung des gebauten Klassenraum-Servers (`tools/klassenraum/`)

**Rolle:** Gegenprüfer C2 im Projekt Netzwerk-Labor, Zweig `ausbau-1.2`.
**Gegenstand:** der gebaute Server `tools/klassenraum/` (Rust-Binary `klassenraum.exe`, Stufe C2).
**Verfahren:** nachgebaut und nachgemessen — nicht nachgelesen und geglaubt. Gesucht wurden **Fehler**,
nicht Bestätigung.
**Sprache/Form:** Deutsch, UTF-8 **ohne BOM**, LF.
**Geschrieben:** 2026-10-06, 23:50–23:58 (Ortszeit des Rechners).
**Nicht ausgeführt (Auflage eingehalten):** `python tools/repo-verweise-flicken.py`; kein `git commit/push/reset`;
keine Änderung an `shell/**`, `src/**`, `tests/**`, `bauen.py`, `.gitignore`, `docs/**`, bestehenden `tools/*.py`;
nichts installiert; **kein** Prozess nach Namen beendet. Die einzigen von mir gestarteten Serverprozesse wurden
über ihr Selbstende (`--ende-nach`) beendet, nicht abgeschossen.
**Einzige von mir geschriebene Datei im Repo:** diese Datei.
**Hilfsskripte:** ausschließlich in `%TEMP%\dsh-8fvXO8\` (`c2-pruefung.ps1`, `c2-detail.ps1`, `c2-gesamt.ps1`,
`c2-protokoll.ps1`, `c2-final.ps1`, `c2-diagnose.ps1`, `c2-neben2.ps1`, Ausgaben `c2-*.txt`).

> [!warning] Die Vorlage bewegte sich während der Prüfung
> `Nachweise/Klassenraum/C-http.json` wurde **zweimal** neu geschrieben, während ich prüfte. Um 23:50:17 lag
> eine gültige JSON-Fassung vor (gemessen: `JSON.parse` mit Node v24.21.0 → `GEPARST`), um 23:44 hatte dieselbe
> Datei beim Lesen noch ein anderes Format. Ich prüfe **gegen den Stand von 23:50:17** und sage bei jeder Zahl,
> woher sie stammt.

---

## 1 · Bauen und Testen (Schritt 1)

### 1.1 `cargo build --release`

Erster Aufruf war ein reiner Cache-Treffer (`Finished ... in 0.02s`) — das ist **kein** Beleg für einen Bau.
Deshalb habe ich die vier Quelldateien auf einen Zeitstempel 5 Minuten in der Vergangenheit gesetzt und
**vollständig neu übersetzt**:

```powershell
Get-ChildItem "$d\src\*.rs" | ForEach-Object { $_.LastWriteTime = (Get-Date).AddMinutes(-5) }
cmd /c "cargo build --release 2>&1"
```

**Ergebnis (wörtlich):**

```
   Compiling klassenraum v0.1.0 (C:\Users\Student\Documents\Joshua\10-Projekte\Lernprojekte\Netzwerk-Labor\tools\klassenraum)
    Finished `release` profile [optimized] target(s) in 9.20s
EXITCODE=0  DAUER_S=9.3
```

Werkzeug: `cargo 1.97.1 (c980f4866 2026-06-30)`, `C:\Users\Student\.cargo\bin\cargo.exe`.
**Warnungen: keine.** Der Bau ist grün.

### 1.2 Größe und SHA256 der entstehenden `.exe`

```powershell
$f = Get-Item "$d\target\release\klassenraum.exe"
$f.Length
(Get-FileHash $f.FullName -Algorithm SHA256).Hash
```

| Messung | Wert |
|---|---|
| Größe | **330240 Bytes** |
| SHA256 | **6AE4E044431ADE6ED14501D5DEA6602593946F9802426E900B17A6DC3474E162** |
| Zeitstempel der Datei nach meinem Bau | 06.10.2026 23:49:51 |

**Wiederholbarkeit (eigene Messung, 2 volle Neubauten):** beide Läufe ergaben **denselben** Hash
`6AE4E044…` → der Bau ist auf diesem Rechner **reproduzierbar**.

**Abgleich mit dem vorhandenen Nachweis:** `C-http.json` (Stand 23:50:17) nennt `serverBytes = 330240` und
`serverSha256 = 6AE4E044431ADE6ED14501D5DEA6602593946F9802426E900B17A6DC3474E162` — **beide Werte stimmen
mit meinem Bau überein.** Die ältere Fassung derselben Datei (die ich um 23:44 gelesen habe) nannte
`00DF37AB4FD38364B623D6BB3015495BC6D133E23C8FC6B4F9AC2AF4E04C4C64` bei gleicher Größe; diese `.exe` liegt
**nirgends** mehr (Suche nach `klassenraum*.exe` im ganzen Repo: nur `target\release\` und `target\release\deps\`),
sie ist also **nicht mehr nachprüfbar**. Alle Zahlen dieses Berichts gelten für `6AE4E044…`.

### 1.3 `cargo test --release`

```powershell
cmd /c "cargo test --release 2>&1"
```

**Ergebnis (wörtlich, Auszug):**

```
running 9 tests
test http::tests::abfrage ... ok
test http::tests::prozent ... ok
test json::tests::lehnt_muell_ab ... ok
test json::tests::liest_und_schreibt ... ok
test lager::tests::idempotent_und_gefiltert ... ok
test lager::tests::zeit_ist_iso ... ok
test tests::lehnt_falsche_werte_ab ... ok
test tests::lehnt_klarnamen_und_fremde_felder_ab ... ok
test tests::nimmt_gueltiges_an ... ok

test result: ok. 9 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
EXITCODE=0
```

**9 Tests, alle grün, 0 rot.** Zusätzlicher Befund aus dem Lesen des Testcodes: die Tests fassen **vier** Felder
an (`sitzung`, `platz`, `sterne`, `dauerS`); die Grenzen von `code` (1..64 Zeichen) und die Prüfung
`gueltig(s, 2, 12)` für `sitzung` selbst werden **von keinem Test** ausgeführt (Fehler 6).

---

## 2 · Eigener Lauf gegen den Nachweis (Schritt 2)

Start (jeder Lauf so, nur der Port wechselte):

```powershell
& $EXE --bind 127.0.0.1 --port 47155 --sitzung NL-4F7K --ende-nach 15 --still
```

Die Ports 47155 / 47157 / 47160 / 47161 / 47162 waren vorher frei (eigener `TcpListener`-Bind, Ergebnis `True`).
Alle `.exe`-Läufe endeten über ihr Selbstende (`Exitcode 0`), keiner wurde von mir beendet.

### 2.1 Die geforderten Anfragen — jede Statuszeile mit Befehl

| # | Befehl | Statuszeile | erwartet |
|---|---|---|---|
| 1 | `curl.exe -s -o NUL -D - -X POST -H "Content-Type: application/json" --data-binary @c2-rumpf-1.json http://127.0.0.1:47155/ergebnis` (Rumpf `{"sitzung":"NL-4F7K","platz":"P3","sterne":3,"dauerS":214,"code":"E-C2-P3-3-214"}`) | `HTTP/1.1 201 Created` | 201 ✓ |
| 2 | derselbe Befehl noch einmal (identischer Code) | `HTTP/1.1 200 OK` | 200 ✓ |
| 3 | `curl.exe -s -o NUL -D - -X GET http://127.0.0.1:47155/liste?sitzung=NL-4F7K` | `HTTP/1.1 200 OK` | 200 ✓ |
| 4 | `curl.exe -s -o NUL -D - -X OPTIONS -H "Origin: null" -H "Access-Control-Request-Method: POST" http://127.0.0.1:47155/ergebnis` | `HTTP/1.1 204 No Content` | 204 ✓ |
| 5 | `curl.exe -s -o NUL -D - -X POST -H "Content-Type: application/json" --data-binary @c2-rumpf-5.json …/ergebnis` (Rumpf `…"platz":"Anna Mueller"…`) | `HTTP/1.1 400 Bad Request` | 400 ✓ |
| 6 | `curl.exe -s -o NUL -D - -X GET http://127.0.0.1:47155/unbekannt` | `HTTP/1.1 404 Not Found` | 404 ✓ |
| 7 | `curl.exe -s -o NUL -D - -X DELETE http://127.0.0.1:47155/liste` | `HTTP/1.1 405 Method Not Allowed` | 405 ✓ |

**Alle sieben stimmen mit `C-http.json` (Stand 23:50:17) überein** — dort sind genau diese sieben als
Messungen 1–4, 6, 8, 11, 12 mit `status == erwartet` geführt.

**Kopfzeilen der Erfolgsantwort (Auszug, wörtlich):**

```
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Content-Length: 122
Cache-Control: no-store
Connection: close
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
Access-Control-Max-Age: 600
Access-Control-Allow-Private-Network: true
```

Bei `405` zusätzlich `Allow: GET, OPTIONS` (für `/liste`). Bei `OPTIONS` (204): dieselben CORS-Kopfzeilen,
`Content-Type: text/plain; charset=utf-8`, `Content-Length: 0`, **kein** `Allow`. Rumpfgröße der 204-Antwort
mit `curl -w "%{size_download}"` gemessen: **0** — die 204 ist wirklich leer.

### 2.2 Antwortrümpfe (Auszug, wörtlich)

```
201: {"anzahl":1,"format":"klassenraum-ergebnis","lagerVoll":false,"neu":true,"ok":true,"platz":"P3","sitzung":"NL-4F7K","v":1}
200: {"anzahl":1,"format":"klassenraum-ergebnis","lagerVoll":false,"neu":false,"ok":true,"platz":"P3","sitzung":"NL-4F7K","v":1}
200: {"anzahl":1,"ergebnisse":[{"code":"E-C2-P3-3-214","dauerS":214,"eingegangen":"2026-10-06T21:50:59Z","platz":"P3","sitzung":"NL-4F7K","sterne":3}],"format":"klassenraum-liste","sitzung":"NL-4F7K","sitzungen":["NL-4F7K"],"v":1}
400: {"fehler":"Platzkennung: 1 bis 8 Zeichen aus A-Z, 0-9 und '-' - kein Name","feld":"platz","format":"klassenraum-fehler","v":1}
409: {"fehler":"Dieser Server nimmt nur die Sitzung NL-4F7K an","feld":"sitzung","format":"klassenraum-fehler","v":1}
413: {"fehler":"Rumpf 4288 Bytes, erlaubt sind 4096","format":"klassenraum-fehler","v":1}
415: {"fehler":"Content-Type muss application/json sein","feld":"Content-Type","format":"klassenraum-fehler","v":1}
```

Die Feldnamen `format`, `v`, `anzahl`, `ergebnisse`, `code`, `dauerS`, `eingegangen`, `platz`, `sitzung`,
`sterne`, `sitzungen`, `neu`, `ok`, `lagerVoll`, `fehler`, `feld` sind mit der Vorlage deckungsgleich.

---

## 3 · Grenzen (Schritt 3)

| Prüfung | Befehl | Statuszeile / Rumpf | erwartet |
|---|---|---|---|
| (a) Rumpf > 4096 B | `curl.exe -s -o NUL -D - -X POST -H "Content-Type: application/json" --data-binary @c2a-8.json …/ergebnis` (Datei **4288 Bytes**) | `HTTP/1.1 413 Payload Too Large`, Rumpf `{"fehler":"Rumpf 4288 Bytes, erlaubt sind 4096",…}` | 413 ✓ |
| (b) `Content-Type: text/plain` | `curl.exe -s -o NUL -D - -X POST -H "Content-Type: text/plain" --data-binary @c2a-9.txt …/ergebnis` | `HTTP/1.1 415 Unsupported Media Type` | 415 ✓ |
| (c) fremdes Feld `name` | Rumpf `{"sitzung":"NL-4F7K","platz":"P5","sterne":2,"dauerS":10,"code":"E-NAME-1","name":"Anna"}` | `HTTP/1.1 400 Bad Request`, `{"fehler":"Unbekanntes Feld 'name' - erlaubt sind nur sitzung, platz, sterne, dauerS, code","feld":"name",…}` | 400 ✓ |
| (d) fremde Sitzung | Rumpf `{"sitzung":"NL-XXXX",…}` an Server mit `--sitzung NL-4F7K` | `HTTP/1.1 409 Conflict` | 409 ✓ |

**Zusatzbeobachtungen an denselben Grenzen (nicht erfragt, aber gemessen):**

* `Content-Type: application/json; charset=utf-8` → `201` (die Prüfung ist ein `starts_with("application/json")`,
  Parameter sind erlaubt). `Content-Type: application/vnd.api+json` → `415`.
* `GET /liste?sitzung=A` (zu kurz) → `400` mit `feld: "sitzung"`.
* `POST /rgebnis` gibt es nicht — jeder andere Pfad außer `/liste` und `/ergebnis` → `404`.
* Die 503-Obergrenze ist **erreichbar** (siehe § 6): 24 gleichzeitige Anfragen erzeugten in mehreren Läufen
  echte `HTTP/1.1 503 Service Unavailable`-Antworten mit `Retry-After: 2` und Rumpf
  `{"fehler":"Zu viele gleichzeitige Anfragen","format":"klassenraum-fehler","v":1}` (80 Bytes).
* **Nicht geprüft:** die exakte Grenze (4096 vs. 4097 Bytes), die Zu-Grenze der Anforderungszeile
  (`http.rs:14` behauptet im Kommentar 414, der Code liefert 431), die Kopfzeilengrenzen (4 KiB / 40 Köpfe),
  das volle Lager (4096 Einträge → 507) und der `Expect: 100-continue`-Weg. Siehe § 9.

---

## 4 · Datensparsamkeit (Schritt 4)

### 4.1 Kann man einen Klarnamen unterbringen? — Acht gemessene Wege

| # | Weg | Rumpf | Antwort | durchgelassen? |
|---|---|---|---|---|
| 1 | Leerzeichen in `platz` | `"platz":"Anna Mueller"` | `400`, `feld: platz` | nein |
| 2 | Umlaut in `platz` (echtes UTF-8) | `"platz":"Müller"` (Datei nachweislich mit `C3 BC`) | `400`, `feld: platz` | nein |
| 3 | zusätzliches Feld | `…,"schueler":"Anna"` | `400`, `feld: schueler` | nein |
| 4 | Klarname in `sitzung` | `"sitzung":"Anna"` | **`409`** (Sitzungsfilter), nicht 400 | nein |
| 5 | Klarname in `code` | `"code":"Anna Mueller"` | `400`, `feld: code` | nein |
| 6 | Umlaut als Fluchtzeichen | `"platz":"M\u00fcller"` | `400`, `feld: platz` | nein |
| 7 | 12 Zeichen in `platz` | `"platz":"ANNAMUELLER"` | `400`, `feld: platz` (Grenze 8) | nein |
| 8 | Unterstrich in `platz` | `"platz":"ANNA_M"` | `400`, `feld: platz` | nein |

**Ergebnis: kein Weg führte durch.** Der Zeichensatz `A-Za-z0-9-` und die Längengrenze `platz` 1–8 schließen
einen Klarnamen wirksam aus. **Ehrliche Grenze:** `platz` ist mit 8 Zeichen aus `A-Z0-9-` nicht *beweisbar*
namensfrei — „ANNAMUE" wäre gültig. Das ist die bewusste Grenze des Verfahrens, keine Lücke des Codes (es gibt
kein Freitextfeld). Weg 4 zeigt, dass eine Klarname-Eingabe in `sitzung` nicht als 400, sondern als 409 endet —
das ist nur deshalb kein Datenleck, weil der Server ohnehin nur eine Sitzung annimmt.

### 4.2 Quelltextprüfung: IP-Adresse, User-Agent, Klarname

```powershell
rg -n "(?i)(peer|remote_addr|ip_addr|user-agent|user_agent|klarname|schuelername|spielername|log|eprintln|println)" tools/klassenraum/src
rg -n "(409|413|415|414|431|507|503|204|401|403|500)" tools/klassenraum/src
```

**Ergebnis:**

* `main.rs:144` lautet `Ok((strom, _peer)) => {` — die Gegenstelle wird ausdrücklich **verworfen** (Unterstrich).
  Es gibt keine Variable, die die Peer-Adresse hält.
* Das Wort `user-agent` / `User-Agent` kommt im ganzen Quelltext **nicht vor** (0 Treffer). `Anfrage.kopf(name)`
  wird nur für `content-type` und `expect` aufgerufen (`main.rs:409`, `http.rs:225`).
* Die einzigen `println!`/`eprintln!`-Aufrufe sind Startanzeige, Hilfe, Lebensdauer-Ende, Beenden-Zeile und
  Fehler beim Binden/Annehmen (`main.rs:85,94,99,115,181,190,271-294`). **Kein** Aufruf gibt Anfragedaten,
  Kennungen oder Adressen aus. In zwei vollen Läufen war die stderr-Ausgabe leer (gemessen: „=== stderr ===“
  ohne Inhalt).
* Das gespeicherte Modell `lager::Eintrag` (`lager.rs:19-26`) hat genau sechs Felder: `code`, `sitzung`, `platz`,
  `sterne`, `dauer_s`, `eingegangen`. Die Ablagedatei schreibt genau diese (`lager.rs:112-119`) — **keine** IP,
  **kein** User-Agent, **kein** Name.
* `GET /liste` gibt genau `platz`, `sterne`, `dauerS`, `sitzung`, `code`, `eingegangen` heraus (§ 2.2) — die
  gemessene Antwort von 225 Bytes enthält keine IP-Adresse und keine Gerätekennung.

**Bewertung:** Die Zusage „keine IP, kein User-Agent, kein Klarname" ist im **Quelltext** belegt (verworfenes
`_peer`, kein Zugriff auf den Kopf, kein Protokoll je Anfrage). **Nicht geprüft** ist ein Laufzeit-Argument
(z. B. Sysinternals-Procmon oder Wireshark): ich habe nur den Quelltext und die Ausgaben gelesen, nicht den
Speicher beobachtet.

---

## 5 · Nebenläufigkeit (Schritt 5)

Befehl (genau wie verlangt, je URL ein eigenes `-o NUL`):

```powershell
curl.exe -s --parallel --parallel-max 24 -o NUL -w "%{http_code}`n <24 x http://127.0.0.1:47162/liste?sitzung=NL-4F7K>
```

**Ergebnis: 24 Anfragen → 24 Antworten, aber die Verteilung schwankt stark.**

| Lauf | Port | 24 Antworten? | 200 | 503 |
|---|---|---|---|---|
| A (Suite 1) | 47157 | **nein — nur 10 Statuszeilen** | 5 | 5 |
| B (Suite 1) | 47157 | nein — 15 Statuszeilen | 12 | 3 |
| C (Suite 1) | 47157 | nein — 15 Statuszeilen | 15 | 0 |
| D (Suite 2, Rümpfe gezählt) | 47160 | **ja, 24 Rümpfe** | 22 | 0 |
| E (Suite 2) | 47160 | ja — 18 + 4 = 22 Rümpfe + Sonderfälle | 18 | 4 |
| F (Suite 2) | 47160 | ja — 21 + 1 | 21 | 1 |
| G (Suite 2) | 47160 | ja — 19 + 3 | 19 | 3 |
| H (Diagnose) | 47161 | ja — 22 + 0 | 22 | 0 |
| I (Dateien) | 47162 | ja — 16 + 7 (+1 in Datei) | 16 | 7 |
| J (Dateien) | 47162 | ja — 21 + 2 (+1) | 21 | 2 |
| K (Dateien) | 47162 | ja — 19 + 4 (+1) | 19 | 4 |
| L (Dateien) | 47162 | 34 Statuszeilen bei 40 Anfragen | – | – |

**Was daran belastbar ist:**

1. **Alle 24 Anfragen werden beantwortet.** In den Läufen D–K summieren sich die im Antwortrumpf gezählten
   Antworten (`klassenraum-liste` = 200, `Zu viele gleichzeitige Anfragen` = 503) auf **genau 24**. Kein
   Client bekam eine Verbindung ohne Antwort, kein `000`, kein Abbruch.
2. **Es gibt genau zwei Ergebnisse: 200 oder 503.** Andere Codes kamen in 12 Läufen nicht vor.
3. **Die Zahl der 503 schwankt zwischen 0 und 7 von 24** (rund 0 % bis 29 %). Die Obergrenze
   `MAX_VERBINDUNGEN = 16` (`main.rs:38`) greift also wirklich, aber **wie oft, ist nicht vorhersagbar**.

**Fehler 1 (Nachweis):** `C-http.json` führt als Messung 16 „24 gleichzeitige Anfragen" mit
`status = "beantwortet:24 200:23 503:1"` und `erwartet = "beantwortet=24, nur 200 oder 503"`. In der älteren
Fassung derselben Datei stand `200:22 503:2`. Meine 12 Läufe ergaben `22:0, 18:4, 21:1, 19:3, 22:0, 16:7, 21:2,
19:4` — **die im Nachweis genannte Aufteilung 23:1 ist eine Einzelstichprobe, kein reproduzierbarer Wert.**
Ein Nachweis, der eine schwankende Zahl als festen Messwert führt, ist irreführend; richtig wäre
„24/24 beantwortet, 503-Anteil gemessen zwischen 0/24 und 7/24".

**Fehler 2 (eigenes Messwerkzeug, in der Vorlage genauso):** Mit `-o NUL` gilt die Ausgabeumleitung nur für die
**erste** URL. Die Antwortrümpfe der übrigen 23 Anfragen landen auf stdout und **verschmelzen mit den
`%{http_code}`-Zeilen** zu einer einzigen Zeile. Deshalb lieferte mein erster Lauf nur 10 „Statuszeilen" — nicht,
weil Antworten fehlten, sondern weil die Zählung am verschmutzten Strom scheiterte. Dasselbe Muster steckt im
vorhandenen Prüfwerkzeug: `C-http-lauf.txt` (Sibling-Lauf 23:50:03) meldet „beantwortet: 24/24 200: 23 503: 1",
also ebenfalls aus einem Strom gezählt, in dem Rümpfe und Codes vermischt sind. **Beide Zahlen sind mit diesem
Aufruf nicht sauber trennbar.** Verlässlich ist nur die Zählung über die Antwortrümpfe (wie in Lauf D–K).

**Nicht geprüft:** die Nebenläufigkeit mit `Invoke-WebRequest` (nur mit `curl.exe`), die Dauerlast über Minuten,
und ob die 503-Schwelle bei mehr als 16 *gleichzeitig schreibenden* POST-Anfragen anders aussieht.

---

## 6 · Portfreigabe nach dem Selbstende (Schritt 6)

| Prüfung | Befehl | Ergebnis |
|---|---|---|
| Selbstende | `WaitForExit(120000)` | `True`, **Exitcode 0** |
| Ausgabe | stdout | `Lebensdauer von 75 s abgelaufen - der Server beendet sich.` / `Server beendet. 0 Ergebnis(se) im Lager. Port 47157 ist wieder frei.` |
| Port bindbar | `$l = New-Object System.Net.Sockets.TcpListener([IPAddress]::Parse("127.0.0.1"),47157); $l.Start(); $l.Stop()` | **`True`** (für 47155, 47157, 47160, 47161, 47162 je gemessen) |
| Gegenprobe mit echtem Dienst | neuer Server auf **demselben** Port 47157, dann `curl.exe -s -o NUL -w "%{http_code}" …/liste?sitzung=NL-4F7K` | **HTTP 200** (PID 5876), danach Selbstende `True` |

**Ergebnis: der Port wird nach dem Selbstende tatsächlich frei** — nicht nur „bindbar" laut Listener, sondern
durch einen zweiten, antwortenden Server auf demselben Port belegt. Damit ist auch die Zusage aus
`main.rs:190` nachgemessen.

**Nicht geprüft:** ob nach **hartem** Prozesstod (Task-Manager) oder nach vielen offenen Verbindungen eine
`TIME_WAIT`-Zeit auf dem Port bleibt. Mein Weg war immer das freundliche Selbstende.

---

## 7 · Widersprüche zum C1-Entwurf (`tools/klassenraum-probe/C-1-entwurf/c1-einbau.md`)

Der C1-Entwurf übernimmt den C2-Vertrag „wörtlich" (§ 0, Warnhinweis). Gemessen am gebauten C2 stimmt das
**weitgehend**, mit diesen Abweichungen:

| # | C1-Entwurf (`c1-einbau.md`) | gebauter C2 (gemessen) | Bewertung |
|---|---|---|---|
| 1 | § 7.1: Lager voll → **`507`** | `main.rs:455` → **507** | **deckungsgleich**, beide außerhalb der sonst üblichen Codes. Wer 409 erwartet (wie der c2-Entwurf, § 4.4), irrt. |
| 2 | § 7.1: `409` nur für „Sitzungsfilter greift nicht" | gemessen: 409 genau für fremde Sitzung | deckungsgleich |
| 3 | § 7.1: „zu viele Verbindungen (16) → 503 + `Retry-After: 2`" | `main.rs:38` = 16; gemessen `Retry-After: 2` | deckungsgleich; **der c2-Entwurf sagt 8 und `Retry-After: 1`** (§ 6/§ 4.4) — dort ist der Entwurf falsch |
| 4 | § 6.1: Vorgabeport **47112**, „belegt → die nächsten 9 Ports" | `main.rs:34,36` = 47112 und 10 Versuche (47112–47121) | deckungsgleich; **c2-endpunkte § 8.1/8.2 sagt 8780 / 8780–8789** — siehe § 8 |
| 5 | § 7.1: Felder `sitzung` (2–12), `platz` (1–8), `sterne` (0–5), `dauerS` (0–86400), `code` (1–64) | `main.rs:488-507` genau so; gemessen (§ 3, § 4.1) | deckungsgleich; **c2-endpunkte § 5.1 sagt 1..16 / 1..16 / 1..24** — dort zu weit |
| 6 | § 6.1 Rückgabe-Felder des Befehls (`an`, `laeuft`, `port`, `bind`, `lokal`, `klassennetz`, `sitzung`, `anzahl`, `forderungen`, `letzterFehler`) | **nicht prüfbar für C1** — die Tauri-Befehle gibt es nicht; C2 hat keine solchen Felder | offen (C1 ist nicht gebaut) |
| 7 | § 7.1: Antwortform `{"format":"klassenraum-liste","v":1,"sitzung":…,"anzahl":…,"sitzungen":[…],"ergebnisse":[…]}`; je Eintrag `platz, sterne, dauerS, sitzung, code, eingegangen` | gemessen **genau so** (§ 2.2) | deckungsgleich |
| 8 | § 7.1: `POST` neu `{"format":"klassenraum-ergebnis","v":1,"ok":true,"neu":true,"anzahl":…,"platz":…,"sitzung":…,"lagerVoll":…}` | gemessen **genau so** | deckungsgleich |
| 9 | § 7.1: Fehlerform `{"format":"klassenraum-fehler","v":1,"fehler":…,"feld":…}` | gemessen **genau so** | deckungsgleich; **c2-endpunkte § 4.3 sagt `{fehler, feld, grund}` mit Kurzarten** — dort falsch |
| 10 | § 7.1: `Content-Type` nicht `application/json` → 415; falsche Methode → 405 + `Allow`; unbekannter Pfad → 404 | alle drei gemessen so | deckungsgleich |
| 11 | § 7.1: „Grenzen: Anforderungszeile 8 KiB" | `http.rs:15` = 8 KiB, **aber** der Code antwortet auf eine zu lange Zeile mit **431** (`http.rs:130`), der Kommentar `http.rs:14` behauptet **414** | **innerer Widerspruch im Code selbst** (Fehler 3) — der c2-Entwurf (§ 12 Punkt 3) hat diesen Punkt schon benannt und nicht entschieden |
| 12 | § 3.4: `MAX_VERBINDUNGEN = 16` „wie C2: `main.rs:38`" | 16, gemessen wirksam (0–7 von 24 → 503) | deckungsgleich |
| 13 | § 3.3: „Ports unter 1024 lehnt der Befehl ab (wie C2, `main.rs:182-184`)" | `main.rs:211-213` — lehnt ab, aber der Fehler kommt beim **Argumentelesen** (`--port`), nicht beim Binden | kleine Ungenauigkeit der Belegstelle; Verhalten stimmt |

**Fazit § 7:** Der C1-Entwurf beschreibt den gebauten C2 **korrekt** (11 von 11 prüfbaren Punkten deckungsgleich).
Die Widersprüche liegen zwischen **c1-einbau.md und c2-endpunkte.md**, nicht zwischen Entwurf und Code — siehe § 8.

---

## 8 · Entwurf `c2-endpunkte.md` gegen den GEBAUTEN Server (Schritt 8)

Der Entwurf `c2-endpunkte.md` ist der **Vertrag**; gebaut ist etwas anderes. Jede Abweichung mit Bewertung:

| # | Entwurf `c2-endpunkte.md` | gebauter C2 (gemessen/belegt) | Wer ist besser — und warum |
|---|---|---|---|
| 1 | **Port 8780**, Scan 8780–8789 (§ 8.1/8.2) | **47112**, Scan 47112–47121 (`main.rs:34,36`; Startanzeige „hoert auf 127.0.0.1:47142/47143/47155/…") | **Der Code.** Beide liegen im Bereich 1024–49151 (Ephemeralbereich beginnt laut Entwurf bei 49152), aber 47112 liegt **höher** und damit weiter weg von den häufigen Dienstports; 8780 ist zudem im IANA-Bereich als „User Port" nicht reserviert, aber auch nicht geprüft. Der Grund des Entwurfs („merkbar und vorlesbar: acht-sieben-acht-null") ist ein Vortragsvorteil, kein technischer. **Wichtiger als die Zahl: Entwurf und Code müssen dieselbe nennen** — heute nennt der C1-Entwurf 47112, der C2-Entwurf 8780. |
| 2 | Erkennungsfeld **`art`** (`"liste"`/`"ergebnis"`, § 4.1/4.2) | **`format`** (`"klassenraum-liste"`/`"klassenraum-ergebnis"`/`"klassenraum-fehler"`, gemessen) | **Der Code.** `format` ist selbsterklärend und trägt bei Fehlern denselben Schlüssel; `art` mit dem Wert `"liste"` doppelt nur den Pfad. Der Entwurf nennt als Zweck die Erkennung eines Fremddienstes (§ 8.4) — dafür genügt `format` genauso. **Aber:** ein Vertrag, der `art` verlangt, und ein Server, der `format` liefert, sind nicht austauschbar; die Oberfläche muss sich entscheiden. C1 (`c1-einbau.md` § 7.1) folgt dem Code — also ist der C2-Entwurf hier der Ausreißer. |
| 3 | **`sitzung` ist bei `GET /liste` Pflicht → sonst 400** (§ 4.1) | `sitzung` ist **optional**: ohne Parameter `HTTP/1.1 200 OK` mit **allen** Ergebnissen aller Sitzungen (gemessen; `main.rs:369-379`, `lager.rs:88-93`) | **Der Entwurf.** Genau hier liegt der **einzige ernste Datenschutzbefund** (Fehler 4). Ohne Sitzungsfilter zeigt `GET /liste` die Platzkennungen **fremder** Sitzungen aus demselben Lager — im Schulnetz kann das jede andere Klasse lesen. Der Code hat den Filter (`--sitzung`), macht ihn aber zur Betreiberentscheidung statt zur Pflicht. Der Entwurf hat den Grund selbst benannt („eine lückenlose Liste wäre die Datensparsamkeit wertlos"). |
| 4 | **8 gleichzeitige Verbindungen**, darüber `503` + **`Retry-After: 1`** (§ 6, § 4.4) | **16** (`main.rs:38`), gemessen `Retry-After: 2` (`main.rs:167`) | **Der Code** — mit Vorbehalt. 16 ist für einen Klassensatz realistischer als 8, und die Messung (§ 5) zeigt: bei 24 gleichzeitigen Anfragen kamen **0 bis 7** abgewiesene an, nie alle. Mit 8 statt 16 wären es deutlich mehr Abweisungen für denselben Klassensatz. `Retry-After: 2` ist ehrlicher als `1` (die Verbindung wird sofort beendet; 2 s deckt die Annahmeschleife mit 40 ms Wartezeit sicher ab). **Aber:** bei einem echten Gleichzeit-Sturm (40 Anfragen, davon 34 Statuszeilen) sinkt der Durchsatz spürbar — die Grenze ist der Engpass, nicht die JSON-Erzeugung. |
| 5 | Lager voll → **409** mit `{fehler:"voll"}` (§ 4.4, § 5.3) | **507** `Insufficient Storage` (`main.rs:455`); **nicht gemessen** (Lager wurde nicht gefüllt) | **507**, wenn man den Code fragt: „Insufficient Storage" ist genau die Lage. Der Entwurf wollte 409 (Konflikt) — vertretbar, aber 507 ist die passendere Semantik. **Offen: beide Codes fehlen in der Prüfliste des Entwurfs § 4.4**, dort steht 409. Kein Messbeleg von mir. |
| 6 | Fehlerform `{"fehler":"feld","feld":"sterne","grund":"…"}` mit **Kurzarten** `methode|pfad|typ|json|feld|zu_gross|voll|ausgelastet|kopf` (§ 4.3) | `{"format":"klassenraum-fehler","v":1,"fehler":"<ganzer deutscher Satz>","feld":"…"}`; **kein** `grund` (gemessen, § 2.2) | **Der Code.** Ein fertiger deutscher Satz ist für die Fehlersuche nützlicher als eine Kurzart, die die Oberfläche erst übersetzen muss. Der Entwurf wollte `grund` ausdrücklich „für die Fehlersuche, nicht für Schüler" — genau das liefert `fehler` jetzt, nur ohne zweiten Schlüssel. **Folge:** Eine Oberfläche, die `art === "liste"` oder `fehler === "voll"` prüft, versteht den gebauten Server **nicht**. |
| 7 | `antwort` enthält **`moeglich`** (4096) und **`jetztS`** (§ 4.1/4.2) | **fehlen**; dafür `sitzungen` (Liste der Sitzungen) und `v` (Formfassung) | **Gemischt.** `jetztS` fehlt zu Recht — der Server schickt je Eintrag `eingegangen` als ISO-Zeit, eine zweite Uhr ist überflüssig. `moeglich` (Obergrenze) fehlt dagegen **schmerzlich**: `lagerVoll: false` sagt „nicht voll", aber nicht „wie voll" — bei 4096 Einträgen ist die Ampel blind. `sitzungen` ist ein **Zusatzrisiko**: es verrät fremde Sitzungskennungen (siehe # 3). |
| 8 | **`quelle: "c1"|"c2"`** in jeder `/liste`-Antwort (§ 10 Punkt 3, § 11) | **fehlt** (gemessen: 11 Felder, kein `quelle`) | **Der Entwurf.** Genau der Fall, für den das Feld gedacht war, ist heute ungelöst: laufen C1 und C2 gleichzeitig (verschiedene Ports), kann der Lehrer nicht sehen, welcher antwortet — und beim Wechsel fehlen Ergebnisse (zwei Lager). Das Feld kostet 12 Bytes. |
| 9 | `Access-Control-Max-Age: **60**` (§ 4.5, mit Begründung) | **600** (`http.rs:260`, gemessen) | **Der Entwurf.** Die Begründung („mit Portscan und `Connection: close` ist ein 10-Minuten-Cache eine Falle: der Schülerrechner merkt 10 Minuten nicht, dass der Server auf einem anderen Port läuft") ist stichhaltig und trifft einen echten Fall — der Port kann laut `main.rs:36` wandern. Kein Messbeleg nötig, die Kopfzeile ist gemessen. |
| 10 | `X-Content-Type-Options: nosniff` *(Vorschlag)* (§ 4.5) | **fehlt** (gemessen: `Vary` = False, `X-Content-Type-Options` = False) | **Der Entwurf, schwach.** Der Server liefert nur JSON mit korrektem `Content-Type`; `nosniff` wäre billige Härte, aber ohne konkreten Angriffsweg in diesem Aufbau. Kein Fehler, eine Auslassung. |
| 11 | `OPTIONS` → 204 **auf beiden Pfaden** (§ 3 (d)) | **204 für jeden Pfad** — auch `/unbekannt` und `/` (gemessen `OPTIONS /unbekannt` → 204) | **Der Code, praktisch.** Ein Preflight wird von fremden Herkünften auf beliebige Pfade geschickt; pauschal 204 erspart dem Browser eine Fehlermeldung. Die Regel des Entwurfs („unbekannter Pfad → 404", § 4.4) gilt damit **nur für GET/POST**, nicht für OPTIONS. Wer den Entwurf wörtlich prüft, findet hier 204 statt 404. |
| 12 | `OPTIONS`-Antwort **ohne** `Content-Type` (§ 4.4: „leer, kein Content-Type") | **`Content-Type: text/plain; charset=utf-8`** + `Content-Length: 0` (gemessen) | **Kein Sieger.** Die RFC erlaubt bei 204 keinen Rumpf, aber Kopfzeilen sind erlaubt; `Content-Type` auf einer rumpflosen Antwort ist lediglich überflüssig. Reine Geschmacksfrage — aber eine Abweichung vom Wortlaut. |
| 13 | Felder `sitzung` **1..16**, `platz` **1..16**, `code` **1..24** (§ 5.1) | `sitzung` **2..12**, `platz` **1..8**, `code` **1..64** (`main.rs:489-507`; `platz` 12 Zeichen → 400 gemessen) | **Der Code bei `platz`**, **der Entwurf bei `code`.** `platz` 1..8 ist strenger und damit datensparsamer (weniger Raum für „ANNAMUE"); `code` 1..64 ist großzügiger als 24 und risikofrei, weil nur `A-Z0-9-` erlaubt ist. Die im Entwurf genannte Codeform („zwei Gruppen, höchstens 10 Zeichen") wird von beiden erfüllt. **Aber:** alle drei Zahlen sind nirgends begründet, und C1 muss sie spiegeln — die Uneinigkeit ist das eigentliche Problem. |
| 14 | Anforderungszeile zu lang → **414** (§ 6, § 12 Punkt 3) | Code antwortet **431** (`http.rs:130`), Kommentar `http.rs:14` sagt **414** | **Kein Sieger, aber ein Fehler:** Code und Kommentar widersprechen sich in **derselben Datei** (Fehler 3). Der Entwurf hat den Streit benannt und nicht entschieden. |
| 15 | `--bind 0.0.0.0` als Festlegung; `127.0.0.1` nur über Umgebungsvariable `KLASSENRAUM_NUR_LOKAL=1` (§ 7) | Vorgabe ist `0.0.0.0` (`main.rs:198`), Umschalten per **Kommandozeilen-Flag** `--nur-lokal`; eine Umgebungsvariable gibt es **nicht** (im Quelltext kein `env::var` außer `args()`) | **Der Code.** Ein Flag ist sichtbar, dokumentiert (`--hilfe`) und im Prozess-Argument nachprüfbar; eine Umgebungsvariable ist unsichtbar. Für eine Schulstunde ist das Flag der bessere Weg. |
| 16 | „Höchstens **40** Kopfzeilen, **4 KiB** je Kopfzeile, **8 KiB** Anforderungszeile, **5 s** Zeitlimit, Rumpf **4096 B**" (§ 6) | `http.rs:15-25`: 8 KiB, 4 KiB, 40, 4096, 5 s — **deckungsgleich** | beide gleich; **nicht gemessen** (außer Rumpf 4096 → 413) |

### 8.1 Kurzurteil

* **Der Entwurf ist an drei Stellen besser als der Code:** `sitzung` als Pflicht (§ 8 # 3), `quelle` (# 8),
  `Access-Control-Max-Age: 60` (# 9). Die erste ist ein Datenschutzpunkt, die zweite ein Betriebspunkt.
* **Der Code ist an drei Stellen besser:** `format` statt `art` (# 2), 16 statt 8 Verbindungen (# 4),
  `Retry-After: 2` (# 4), fertiger Fehlertext statt Kurzart (# 6), Flag statt Umgebungsvariable (# 15).
* **Echte Fehler, die keine Geschmacksfrage sind:** der innere Widerspruch 414/431 (# 14, Fehler 3), die
  fehlende Pflicht `sitzung` (# 3, Fehler 4), und die **Portuneinigkeit** 8780 gegen 47112 zwischen den beiden
  Entwürfen selbst (# 1).
* **Was der Entwurf verlangt und der Code gar nicht hat:** `art`, `moeglich`, `jetztS`, `quelle`,
  `Access-Control-Max-Age: 60`, `X-Content-Type-Options`, die Fehler-Kurzarten, der 409-bei-vollem-Lager.
  Der C1-Entwurf folgt dem **Code** — damit ist der C2-Entwurf der Ausreißer, nicht der Server.

---

## 9 · Gefundene Fehler (nummeriert, jeder mit Beleg)

1. **Der Nachweis führt eine schwankende Zahl als festen Messwert.**
   `C-http.json` (Stand 23:50:17) Messung 16: `status = "beantwortet:24 200:23 503:1"`. Meine 12 Läufe mit
   demselben Befehl ergaben 503-Anteile von **0/24 bis 7/24**; die frühere Fassung derselben Datei nannte
   `200:22 503:2`. Die Aufteilung hängt von der Thread-Planung ab und ist **nicht reproduzierbar**.
   *Beleg:* § 5, Tabelle A–L. *Folge:* Der Nachweis belegt „24/24 beantwortet" (richtig), aber nicht „23:1".

2. **Das Prüfwerkzeug zählt Statuscodes aus einem verschmutzten Strom.**
   `curl.exe --parallel --parallel-max 24 -o NUL -w "%{http_code}\n" <24 URLs>`: die Ausgabeumleitung gilt nur
   für die **erste** URL; die Rümpfe der übrigen 23 landen auf stdout und verschmelzen mit den Statuscodes.
   Gemessen: von 24 Anfragen lieferten nur **10** bzw. **15** Zeilen einen Statuscode, während die Rumpfzählung
   **24** Antworten ergab. *Folge:* Jede Zahl, die aus diesem Strom gezählt wird — auch „beantwortet: 24/24" in
   `C-http-lauf.txt` — ist ein Zufallsergebnis der Zeilenverschmelzung. *Beleg:* § 5, Läufe A–C.

3. **Innerer Widerspruch im Quelltext: 414 gegen 431.**
   `http.rs:14` sagt im Kommentar „Groesste Anfragezeile (inkl. Zeilenende). Laenger => **414**"; der Code
   wirft an `http.rs:130` **431** (`folge(431, "Request Header Fields Too Large", …)`) — für jede zu lange Zeile,
   auch für die Anforderungszeile. Der Entwurf `c2-endpunkte.md` § 6 verlangt **414** und hat den Streit in
   § 12 Punkt 3 ausdrücklich offen gelassen. *Nicht gemessen* (kein Lauf mit >8 KiB Zeile); der Widerspruch ist
   aus dem Quelltext belegt. *Folge:* Zwei Umsetzungen (C1/C2) können verschiedene Codes liefern.

4. **`GET /liste` ohne `?sitzung` gibt Ergebnisse ALLER Sitzungen heraus — der Datenschutzpunkt des Entwurfs ist nicht umgesetzt.**
   Gemessen: `curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:PORT/liste` → **200** (nicht 400), und der
   Rumpf enthält die Einträge ohne Filter (`main.rs:369-379`, `lager.rs:88-93`).
   Der Entwurf `c2-endpunkte.md` § 4.1 verlangt `sitzung` als **Pflicht** mit genau dieser Begründung:
   „eine lückenlose Liste wäre die Datensparsamkeit von `KLASSENRAUM.md:49` … wertlos, sobald mehrere Sitzungen
   im Lager liegen — sie zeigt sonst fremde Platzkennungen." Im Schulnetz ohne Anmeldung (bewusste Grenze)
   kann damit **jede andere Klasse** die Platzkennungen aller Sitzungen lesen. Die Antwort enthält zusätzlich
   das Feld `sitzungen` mit den Kennungen fremder Sitzungen.
   *Nicht geprüft:* ob die Oberfläche den Parameter immer mitschickt (sie ist nicht Teil dieser Prüfung).

5. **`C-http.json` war zwischenzeitlich kein gültiges JSON.**
   Beim ersten Lesen (23:44) lieferte die Datei Paare der Form `"schluessel" "wert"` ohne Doppelpunkt; sowohl
   `ConvertFrom-Json` als auch `JSON.parse` (Node v24.21.0) brachen ab. Die Fassung von 23:50:17 ist gültig
   (beide Parser: `GEPARST`). *Folge:* Ein Nachweis, der beim Schreiben ungültig ist, kann von einem fremden
   Werkzeug nicht gelesen werden — die Prüfung „Nachweis wieder eingelesen" hat das nicht bemerkt, weil sie mit
   demselben nachsichtigen Leser arbeitet, der ihn geschrieben hat. *Beleg:* § 9 dieses Berichts, Messbefehl im
   Anhang.

6. **Die Tests fassen die Feldgrenzen von `code` und `sitzung` nicht an.**
   `main.rs:518-558` prüft `platz` (Name, leer), `sterne` (9, 3.5), `dauerS` (-1), fehlende Felder und ein
   Leerzeichen in `sitzung`. **Kein** Test prüft `code` gegen die Grenze 1..64, **kein** Test prüft
   `gueltig(s, 2, 12)` für `sitzung` an der Grenze (1 Zeichen, 13 Zeichen), und **kein** Test prüft die
   Zeichenmengen `A-Z0-9-` gegen `_` oder `.`. Gemessen: `platz` 12 Zeichen → 400 (in Ordnung), aber das ist
   **meine** Messung, nicht die des Testlaufs. *Folge:* 9 grüne Tests belegen weniger, als die Zahl vermuten lässt.

7. **Die Portnummern der beiden Entwürfe widersprechen sich, und beide weichen nicht vom Code ab, sondern voneinander.**
   `c1-einbau.md` § 6.1/§ 7.1: **47112**; `c2-endpunkte.md` § 8.1: **8780**. Der gebaute Code: **47112**
   (`main.rs:34`). *Folge:* Wer nach `c2-endpunkte.md` baut (C1), bindet auf einem anderen Port als der
   gebaute C2 — die Portscan-Erkennung des Entwurfs (§ 8.2, 8780–8789) findet den gebauten C2 **nie**.

8. **`--sitzung` normalisiert vor der Prüfung, die Fehlermeldung behauptet aber A–Z.**
   `main.rs:222-225`: `let v = v.to_uppercase();` **vor** `gueltig(&v, 2, 12)`. Damit wird `--sitzung nl-4f7k`
   angenommen, obwohl die Fehlermeldung „erlaubt sind 2 bis 12 Zeichen aus A-Z, 0-9 und '-'" sagt und
   `gueltig` auch `a-z` durchlässt (`main.rs:515`). Verhalten und Zusage stimmen nicht überein.
   *Nicht gemessen* (ich habe nur Großbuchstaben benutzt); aus dem Quelltext belegt.
   *Folge:* harmlos für die Funktion, irreführend für den Leser — und `POST` mit `"sitzung":"nl-4f7k"` wird
   ebenfalls angenommen (`main.rs:488`), was gewollt sein kann, aber nirgends steht.

---

## 10 · Was NICHT geprüft wurde (ehrlich, ohne Beschönigung)

1. **Kein Browser, keine Oberfläche, kein CORS-Wirklauf.** Ich habe die CORS-Kopfzeilen **gelesen**, aber keinen
   echten Preflight aus `file://`, aus `http://tauri.localhost` oder von GitHub Pages gemessen. Ob Edge die
   Anfrage durchlässt (Private Network Access), ist **nicht geprüft**.
2. **414 gegen 431, Kopfzeilengrenzen (4 KiB / 40 Köpfe), 408 (Zeitlimit), `Expect: 100-continue`:** nicht
   gemessen. Mein Protokollskript lief nicht durch (eigener Skriptfehler, siehe unten), und ich habe es nicht
   wiederholt.
3. **Das volle Lager (4096 Einträge → 507) und die Duplikatregel bei zwei Codes desselben Platzes:** nicht
   gemessen. 4097 POST-Anfragen waren im Zeitrahmen nicht vertretbar.
4. **Die Ablagedatei (`--ablage`):** nicht gemessen. Ich habe alle Läufe **ohne** `--ablage` gefahren
   (Lager nur im Speicher). Ob die Datei atomar geschrieben wird, ob ein Neustart die Einträge lädt und ob die
   Form `{"format":"klassenraum-ablage","v":1,"ergebnisse":[…]}` stimmt, ist **gelesen, nicht gemessen**.
5. **Kein Laufzeitbeweis zur Datensparsamkeit** (kein Procmon, kein Netz-Mitschnitt): belegt ist der Quelltext
   (`_peer` verworfen, kein User-Agent-Zugriff, keine IP im Modell) und die gemessenen Antwortrümpfe — **nicht**
   der Speicherinhalt des Prozesses.
6. **Kein `Invoke-WebRequest`-Lauf** (die Vorlage hat einen): ich habe nur `curl.exe` benutzt.
7. **Kein Dauerlauf, keine Langzeitstabilität, kein Speicherwachstum.**
8. **Die Windows-Firewall-Abfrage** (Auftrag `KLASSENRAUM.md:46`) ist nicht geprüft — ich habe nur
   `127.0.0.1` gebunden, nie `0.0.0.0`.
9. **C1 (Tauri-Hülle) ist nicht Gegenstand dieser Prüfung** und wurde nicht gebaut; ob `shell/src-tauri`
   denselben Vertrag erfüllt, ist offen (siehe § 7 Punkt 6).
10. **Mein eigenes Protokollskript `c2-protokoll.ps1` ist fehlerhaft** (`$T` ist in PowerShell ein Alias für
    `[System.Net.Sockets.TcpClient]`, deshalb landeten Dateipfade in einem Fantasieordner). Ich habe es nicht
    repariert; die Punkte aus Nr. 2 bleiben damit ungemessen. Die übrigen Skripte habe ich gegen diesen Fehler
    geprüft (`$TMP` statt `$T`) und ihre Ausgaben mit den Rohdaten in `%TEMP%` abgeglichen.

---

## 11 · Anhang: Übersicht der Messläufe

| Zweck | Port | exe | Ergebnis |
|---|---|---|---|
| Bau + Test | – | `6AE4E044…` | 9.20 s, 9/9 Tests grün |
| Sieben Pflichtanfragen + Grenzen + Datensparsamkeit | 47155 | `6AE4E044…` | 7/7 wie erwartet, 413/415/400/409 wie erwartet |
| Wiederholung mit vollständigen Rümpfen | 47157/47160/47161 | `6AE4E044…` | Datensparsamkeit 8 Wege alle abgewiesen |
| Nebenläufigkeit (12 Messungen) | 47157, 47160, 47162 | `6AE4E044…` | 24/24 beantwortet; 503-Anteil 0–7 von 24 |
| Portfreigabe | 47155, 47157, 47160, 47161, 47162 | `6AE4E044…` | nach Selbstende bindbar + zweiter Server mit HTTP 200 |
| Nachweisvergleich | – | `6AE4E044…` | `C-http.json` nennt **denselben** Hash und dieselben Bytes |

**Rohdaten meiner Läufe** (außerhalb des Repos, in `%TEMP%\dsh-8fvXO8\`): `c2-ausgabe.txt`,
`c2-gesamt.txt`, `c2-detail.txt`, `c2-final.txt`, `c2-diagnose.txt`, `c2-neben.txt`, `c2-neben2.txt`,
`c2-protokoll.txt`, dazu die Skripte `c2-*.ps1`. Sie sind Zwischenstände dieser Prüfung und **kein**
Repobestandteil.

**Befehl zum Nachprüfen der JSON-Gültigkeit (Fehler 5):**

```powershell
& "$env:LOCALAPPDATA\node-portable\node-v24.21.0-win-x64\node.exe" -e "const fs=require('fs');try{JSON.parse(fs.readFileSync(process.argv[1],'utf8'));console.log('GEPARST')}catch(e){console.log('FEHLER: '+e.message)}" "Nachweise\Klassenraum\C-http.json"
```
