---
tags: [FISI, Lernspiel, Netzwerk, Klassenraum, Rust]
erstellt: 2026-10-06
aktualisiert: 2026-10-06
status: Entwurf geprüft und nachgemessen (Bereich C)
---

# C · Rust: Live-Server (C1/C2) und QR-Code (D)

Bereich C des Auftrags [`tools/auftraege/KLASSENRAUM.md`](../../../tools/auftraege/KLASSENRAUM.md)
(Stufen C1, C2, D). Dieser Text ist die **umsetzungsreife Festlegung**: Er beschreibt die
Änderungen Datei:Zeile-genau, nennt jede Zahl mit Befehl und Ergebnis und benennt offen, was
**nicht** geprüft ist. Umgesetzt wurde in dieser Runde nur, was außerhalb von `shell/` und `src/`
liegt (Auftrag: der Spielkern bleibt unverändert) – der Einbau in die `.exe` ist deshalb eine
Anleitung, der Server selbst und der QR-Encoder sind gebaut und gemessen.

## 0 · Kurzfassung

| Frage | Festlegung | Beleg |
|---|---|---|
| Server in der `.exe` (C1) | neue Datei `shell/src-tauri/src/klassenraum.rs`, **drei** Änderungen in `main.rs` (Zeile 8, 147–148, 114), **keine** Änderung an `capabilities/` | § 4, `capabilities/main.json:4` |
| Eigenständiges Binary (C2) | `tools/klassenraum/` – **gebaut**, 330.240 Bytes, ohne jede Abhängigkeit | § 2 |
| Zwei Endpunkte | `GET /liste`, `POST /ergebnis` – gleiche Datenform in C1 und C2 | § 3 |
| Port | Vorgabe **47112**, Bereich 47112–47121 | § 3.6 |
| Bind-Adresse | **0.0.0.0** (Klassennetz), Standard des Servers ist trotzdem **aus** | § 3.5 |
| CORS | `Access-Control-Allow-Origin: *` + Preflight 204 + `Allow-Private-Network` | § 3.4 |
| QR-Code (D) | eigener Encoder in Rust, **ohne Kiste**, Version 1–4, Stufe H für den Auftragscode, Rückgabe als SVG-Data-URI | § 5 |
| Nur Desktop | Browser- und Android-Fassung können weder Server noch QR | § 4.6, § 5.6 |

## 1 · Gemessene Randbedingung: keine neuen Kisten

Am 06.10.2026 in dieser Umgebung gemessen (nicht angenommen):

| Befehl | Ergebnis |
|---|---|
| `cargo --version` · `rustc --version` | `cargo 1.97.1 (c980f4866 2026-06-30)` · `rustc 1.97.1 (8bab26f4b 2026-07-14)` |
| `cargo fetch` in einer Probe-Kiste mit `qrcode = "0.14"` | **scheitert**, Rückgabewert 101: `warning: spurious network error … [35] SSL connect error (schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS (0x8009030e) …)` → `error: failed to get 'qrcode' as a dependency` |
| `(Get-ChildItem "$env:USERPROFILE\.cargo\registry\cache" -Recurse -File -Filter *.crate).Count` | **964** Dateien (tauri-Baum) |
| Suche nach `qrcode`/`qr` im Kisten-Cache und im Index-Cache | **0 Treffer** – `image-0.25.10` und `png-0.17.16/0.18.1` sind da, `qrcode` nicht |
| `python -c "import qrcode"` | `ModuleNotFoundError: No module named 'qrcode'` (ebenso `segno`; `cv2`/`pyzbar` fehlen) |

**Folgerung (die den ganzen Bereich C prägt):** Weder Server noch QR-Encoder dürfen eine fremde
Kiste brauchen. Beide sind deshalb mit **ausschließlich** der Rust-Standardbibliothek gebaut
(`Cargo.toml` ohne `[dependencies]`). Der Auftragstext nennt die Crate `qrcode` – sie ist hier
nicht holbar; der Weg über einen eigenen Encoder ist in § 5 begründet und mit einem
Differentialtest belegt. Sobald crates.io erreichbar ist, bleibt die Entscheidung gültig: die
Abhängigkeitsfreiheit ist billiger als eine Kiste (siehe § 5.1).

## 2 · C2: das eigenständige Binary (wirklich gebaut)

```
tools/klassenraum/
  Cargo.toml        keine [dependencies]
  Cargo.lock        nur das eigene Paket
  .gitignore        target/
  LIESMICH.md       Bedienung, Grenzen, Firewall-Text
  src/main.rs       Argumente, Annahmeschleife, Wegewahl, Prüfung, Antworten
  src/http.rs       Mini-HTTP/1.1 (nur die zwei Wege, kein Keep-Alive)
  src/json.rs       kleiner JSON-Leser/-Schreiber
  src/lager.rs      Ergebnislager (nur Platzkennungen) + Ablagedatei
```

| Befehl | Ergebnis |
|---|---|
| `cargo build --release` (in `tools\klassenraum`) | `Finished 'release' profile [optimized] target(s) in 7,5 s`, Rückgabewert 0 – **ausgeführt am 06.10.2026, mehrfach; ein erzwungener Neubau aller vier `.rs` brauchte 9,2 s** |
| Größe der `.exe` | **322.560 Bytes = 0,31 MB** (`Get-Item … \target\release\klassenraum.exe`), SHA256 `77A3260A…C6202` |
| `cargo test --release` | **10 von 10 grün** (`json`, `http`, `lager`, Prüfregeln, Grenzen von `sitzung` und `code`) |
| Probe `C-http-probe.ps1` | **20 Messungen, alle bestanden**; Server beendet sich selbst, Port danach wieder frei |

Die `.exe` ist deutlich kleiner als die im Auftrag erwarteten „wenigen MB“, weil keine
Laufzeitumgebung und keine fremde Kiste mitkommt. `target/` ist über
`tools/klassenraum/.gitignore` ausgenommen; für die Wurzel-`.gitignore` ist die Zeile
`tools/klassenraum/target/` **vorgeschlagen**, aber nicht eingetragen (§ 9).

### 2.1 Was der Server tut

* hört auf **0.0.0.0:47112** (Vorgabe), probiert bei Belegtheit 47113–47121 durch,
* nimmt je Verbindung genau eine Anfrage an (kein Keep-Alive) und bedient sie in einem Thread,
* hält die Ergebnisse im Speicher, optional zusätzlich in einer JSON-Datei (atomar geschrieben),
* beendet sich auf `q` + Eingabetaste, Strg+C **oder** `--ende-nach N` und gibt den Port frei,
* schreibt eine ehrliche Startanzeige mit lokaler Adresse, Adresse im Klassennetz, Sitzung,
  Ablage und Beenden-Hinweis.

### 2.2 Drei Windows-Fallen, die beim Bauen wirklich zugeschlagen haben

Alle drei sind gemessen, nicht vermutet – sie stehen als Kommentar im Quelltext, damit sie
niemand wieder hineinbaut:

1. **Ein angenommener Socket erbt den Nicht-Blockier-Modus des Horchers.** Der Horcher steht auf
   nonblocking, damit die Annahmeschleife das Abbruchflag sieht; unter Windows erbt `accept()`
   diesen Modus. Folge: Jedes Lesen, dessen Bytes noch nicht da sind, scheitert sofort mit
   `WSAEWOULDBLOCK … (os error 10035)`. Genau das passierte beim Rumpf hinter einer
   `100 Continue`-Zwischenantwort. Behebung: `strom.set_nonblocking(false)` am Anfang jeder
   Verbindung (`tools/klassenraum/src/http.rs`).
2. **`Expect: 100-continue` braucht eine echte Zwischenantwort.** Windows PowerShell 5.1 schickt
   die Kopfzeilen und wartet auf `HTTP/1.1 100 Continue`, bevor es den Rumpf sendet. Antwortet
   der Server nicht, läuft er in sein Leselimit und antwortet 400; der Client meldet
   „(400) Ungültige Anforderung“. Behebung: Zwischenantwort senden, bevor der Rumpf gelesen wird.
   Ein Schreiben über ein zweites Socket-Handle (`try_clone`) war dabei **falsch** – die
   Verbindung brach danach ab (ECONNRESET, gemessen); deshalb liest `http.rs` byteweise direkt
   vom Socket, statt einen `BufReader` zu halten.
3. **Ein zu großer Rumpf darf nicht sofort abgewiesen werden.** Antwortet der Server auf
   `Content-Length > 4096` und schließt, während der Client noch sendet, sieht der Client keine
   Antwort (curl meldet `000`). Behebung: bis zu 256 KiB weglesen, dann 413.

> **Nicht der Server, sondern die Messumgebung:** `Invoke-WebRequest` in Windows PowerShell 5.1
> braucht `-UseBasicParsing`, sonst parst die IE-Engine und wirft bei JSON-Antworten
> „Der Objektverweis wurde nicht auf eine Objektinstanz festgelegt“. Ebenso dreht
> `ConvertTo-Json -Depth 8` in dieser PowerShell-Fassung bei verschachtelten Ergebnisfeldern mit
> 100 % CPU durch, ohne fertig zu werden – die Probe baut ihr Nachweis-JSON deshalb von Hand und
> prüft es danach durch Wiedereinlesen. Und: In PowerShell bindet das **Komma stärker als `+`**,
> wodurch in `@(a + ":" + b, c + ":" + d)` die Trennkommas stillschweigend verschwinden
> (`{a:1 b:2}` statt `{a:1,b:2}`); jedes Element braucht eigene Klammern. Alle drei Punkte sind
> in der Probe berücksichtigt.

## 3 · Die gemeinsame Schnittstelle (Vertrag für C1 und C2)

Beide Bauformen liefern **dieselben** Wege, Feldnamen, Statuscodes und Kopfzeilen. C1 darf den
Rumpf mit `serde_json` bauen (die Hülle hat die Kiste schon), C2 mit dem eigenen Mini-JSON.

### 3.1 Endpunkte

| Weg | Methode | Erfolg | Wirkung |
|---|---|---|---|
| `/liste` | GET | 200 | Ergebnisse abholen, optional `?sitzung=NL-4F7K` |
| `/ergebnis` | POST | 201 (neu) / 200 (schon bekannt) | ein Ergebnis abgeben |
| beide | OPTIONS | 204 | Preflight |

Es gibt **genau diese zwei Wege**. Ein unbekannter Weg ergibt 404, ein bekannter Weg mit falscher
Methode 405 mit `Allow`-Kopfzeile.

> **Diese Fassung ist die verbindliche.** In der ersten Runde entstanden zwei Entwurfspapiere
> (`C-1-entwurf/c1-einbau.md`, `C-1-entwurf/c2-endpunkte.md`), die an mehreren Stellen **andere**
> Werte vorschlagen (dort u. a. Port 8780, acht gleichzeitige Verbindungen, 409 bei vollem Lager,
> Feld `art` statt `format`, Pflichtparameter `sitzung`). Gebaut und gemessen ist die Fassung
> dieses Abschnitts: **Port 47112**, **16** Verbindungen, **507** bei vollem Lager,
> **`format`**, `sitzung` optional. Wer C1 baut, hält sich an § 3 – sonst sind die beiden
> Bauformen nicht austauschbar.

### 3.2 `GET /liste` – Antwort (gekürzt, echtes Beispiel aus dem Nachweis)

```json
{
  "format": "klassenraum-liste", "v": 1,
  "sitzung": "NL-4F7K",
  "anzahl": 2,
  "ergebnisse": [
    {"platz":"P3","sterne":3,"dauerS":214,"sitzung":"NL-4F7K",
     "code":"E-4F7K-P3-3-214-7Q","eingegangen":"2026-10-06T21:43:06Z"}
  ]
}
```

**Die Sitzungskennung ist Pflicht** – entweder als Abfrageparameter (`?sitzung=NL-4F7K`) oder
beim Start des Servers (`--sitzung`). Fehlt sie in beiden Fällen, antwortet der Server **400** und
liefert **keine** Daten. Das ist eine Korrektur aus der Gegenprüfung: In der ersten Fassung
lieferte `GET /liste` ohne Parameter die Ergebnisse **aller** Sitzungen samt fremder Kennungen –
im Schulnetz ohne Anmeldung hätte das jede Klasse abrufen können. Das Feld `sitzungen` ist
deshalb entfallen; die Antwort enthält nur noch, was zu **einer** Sitzung gehört. Gemessen:
Server ohne `--sitzung` ⇒ `GET /liste` **400**, `GET /liste?sitzung=NL-4F7K` **200**
(`C-http.json`, Messungen „ohne Startsitzung …“).

### 3.3 `POST /ergebnis` – Anfrage und Antwort

Anfrage (`Content-Type: application/json`, **genau** diese fünf Felder):

```json
{"sitzung":"NL-4F7K","platz":"P3","sterne":3,"dauerS":214,"code":"E-4F7K-P3-3-214-7Q"}
```

Antwort 201 (neu) bzw. 200 (derselbe Code war schon da):

```json
{"format":"klassenraum-ergebnis","v":1,"ok":true,"neu":true,"anzahl":1,
 "platz":"P3","sitzung":"NL-4F7K","lagerVoll":false}
```

**Der Code ist der Schlüssel.** Derselbe Code zweimal ändert nichts (idempotent) – das ist die
Zusage aus `KLASSENRAUM.md:44` („Doppelte Codes werden erkannt und nicht doppelt gezählt“).
Derselbe Platz mit einem *anderen* Code zählt bewusst zweimal: der Auftrag verlangt keine
„bester Eintrag je Platz“-Regel.

Fehlerantworten haben immer dieselbe Form, mit `feld`, wenn ein Feld schuld ist:

```json
{"format":"klassenraum-fehler","v":1,"fehler":"Platzkennung: 1 bis 8 Zeichen aus A-Z, 0-9 und '-' - kein Name","feld":"platz"}
```

### 3.4 Statuscodes, Kopfzeilen, CORS

| Code | Wann | Anmerkung |
|---|---|---|
| 200 | `/liste`; `POST` mit bekanntem Code | |
| 201 | `POST` mit neuem Code | |
| 204 | `OPTIONS` | leerer Rumpf |
| 400 | JSON kaputt, Feld fehlt/ungültig, **unbekanntes Feld** | Datensparsamkeit wird erzwungen |
| 404 | unbekannter Weg | |
| 405 | bekannter Weg, falsche Methode | mit `Allow` |
| 408 | Zeitlimit beim Lesen | |
| 409 | Ergebnis gehört zu einer anderen Sitzung (nur mit `--sitzung`) | |
| 413 | Rumpf > 4096 Bytes | |
| 414 / 431 | Anforderungszeile > 8 KiB / Kopfzeilen zu lang | |
| 415 | `Content-Type` nicht `application/json` | |
| 503 | mehr als 16 gleichzeitige Verbindungen | `Retry-After: 2` |
| 507 | Lager voll (4096 Einträge) | |

Jede Antwort trägt `Content-Type: application/json; charset=utf-8`, `Content-Length`,
`Cache-Control: no-store` und `Connection: close` (kein Keep-Alive). Bei Fehlern steht der
JSON-Rumpf trotzdem im Körper – die Oberfläche kann die Meldung anzeigen.

**CORS** – dieselben Kopfzeilen auf **jeder** Antwort, auch auf Fehlern:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
Access-Control-Max-Age: 600
Access-Control-Allow-Private-Network: true
```

*Kein* `Access-Control-Allow-Credentials` – mit `*` wäre das unzulässig, und der Server braucht
keine Kekse.

**Welche Origin hat welche Fassung wirklich?**

| Fassung | Origin | Beleg |
|---|---|---|
| Desktop-`.exe` (Tauri 2, Windows) | **`http://tauri.localhost`** | `main.rs:178` baut das Fenster mit `WebviewUrl::App("index.html")`; `tauri.conf.json:7` zeigt auf den **Ordner** `../../web`; der Cargo-Quelltext sagt wörtlich: „On Windows and Android custom protocols are served over `http(s)://{scheme}.localhost`; everywhere else they are served over `{scheme}://localhost`“ (`%USERPROFILE%\.cargo\registry\src\…\tauri-2.12.0\src\protocol\mod.rs:30-38`, Funktion `origin` ab Zeile 32). Schema ist `tauri`, `use_https` ist nicht gesetzt ⇒ `http://tauri.localhost` |
| Desktop-`.exe` (Linux) | `tauri://localhost` | dieselbe Stelle, „everywhere else“ |
| Einzeldatei `docs/index.html` (Doppelklick) | **`null`** (undurchsichtige Herkunft) | `tools/starttest.py:224` lädt die Datei über `datei.as_uri()`, also `file://`; `docs/Bauen.md:69-79` nennt genau diesen Weg „der Weg eines Doppelklicks“ |
| GitHub Pages | `https://vexx-oss.github.io` (öffentlicher Adressraum) | `docs/Bauen.md:93` (Adresse) |
| Android-App (WebView) | keine HTTP-Herkunft; die Seite liegt unter `https://netzwerk-labor.local/` | `docs/Bauen.md:256-257` |

Daraus folgt die Festlegung: **`*` statt Spiegeln** (die Herkunft `null` lässt sich nicht
spiegeln), **Preflight für jeden Weg**, und `Access-Control-Allow-Private-Network: true`, weil
die Pages-Fassung aus dem öffentlichen Adressraum auf eine lokale Adresse zugreift (Private
Network Access in Chrome/Edge). Nebenbei: `https → http://127.0.0.1` ist **kein** Mixed Content,
weil `127.0.0.1` als potenziell vertrauenswürdig gilt.

Gemessen wurde das **Serververhalten**: `OPTIONS /ergebnis` mit `Origin: null`,
`Access-Control-Request-Method: POST`, `Access-Control-Request-Headers: content-type` und
`Access-Control-Request-Private-Network: true` ergibt 204 mit allen fünf Kopfzeilen
(`Nachweise/Klassenraum/C-http.json`, Messung „Preflight aus file:// (Origin null)“). **Nicht
gemessen** ist, ob ein echter Browser die Anfrage danach wirklich ausführt – es stand kein
Browser zur Verfügung (§ 8).

### 3.5 Bind-Adresse

**Vorgabe `0.0.0.0`**, also alle Schnittstellen. Begründung: Der Auftrag will, dass
Schülergeräte im Klassenraum den Lehrer-Rechner erreichen (`KLASSENRAUM.md:46-49`). Bindet der
Server nur an `127.0.0.1`, ist er für andere Geräte unsichtbar und C1/C2 wären wirkungslos.
„Nur lokal“ im Auftrag meint: kein Internet, keine Cloud, keine Konten – nicht „nur dieser
Rechner“. Für Proben gibt es `--nur-lokal`.

Ehrliche Folge: **Es gibt keine Anmeldung und kein TLS.** Wer im selben Netz ist, darf lesen und
schreiben; CORS schützt nicht (es ist keine Zugangskontrolle). Deshalb: Server nur einschalten,
solange er gebraucht wird (Standard **aus**), und nur die Platzkennung übertragen. Die
Windows-Firewall fragt beim ersten Start – es gibt keinen Installer, der das vorwegnähme
(`tauri.conf.json:18` bündelt nur `deb`/`appimage`; `docs/Bauen.md:213` baut ohne Bündel).

### 3.6 Portwahl und Erkennung

| Punkt | Festlegung | Begründung |
|---|---|---|
| Vorgabeport | **47112** | über 1024 (kein privilegierter Port) und **unter** 49152 – darunter beginnt der Windows-Bereich, aus dem sich das System Quellports für ausgehende Verbindungen nimmt; ein Server darin käme sich mit sich selbst ins Gehege. 47112 ist keinem bekannten Dienst zugeordnet |
| Bei Belegtheit | 47113 … 47121 (10 Versuche) | kein Abbruch, nur weil ein Fremdprogramm den Port hat |
| Erkennung durch die Oberfläche | Es gibt **keinen** dritten Weg. Die Oberfläche ruft `GET /liste` mit **400–800 ms** Zeitlimit je Kandidatenport; ist die Antwort 200 **und** enthält `"format":"klassenraum-liste"`, ist es unser Server, und der Zustand wird gemerkt | ein Gesundheits-Endpunkt wäre ein dritter Weg und damit Vertragsbruch |
| Kein Server erreichbar | **keine Fehlermeldung**, kein `console.error`; die Live-Fläche bleibt einfach aus, A und B funktionieren unverändert (`KLASSENRAUM.md:48`) | |

Die Portnummer ist bewusst **nicht** im QR-Code und nicht im Auftragscode – der Code bleibt ein
reiner Auftragscode (Stufe A). Die Adresse zeigt die Lehrer-Ansicht als Text an.

### 3.7 Datensparsamkeit (erzwungen, nicht erbeten)

Erlaubt sind **genau fünf** Felder; der Zeichensatz ist auf `A–Z a–z 0–9 -` begrenzt:

| Feld | Grenze | Prüfung |
|---|---|---|
| `sitzung` | 2–12 Zeichen | Zeichensatz wie oben |
| `platz` | 1–8 Zeichen | „Platzkennung … kein Name“ |
| `sterne` | ganze Zahl 0–5 | keine Kommazahl |
| `dauerS` | ganze Zahl 0–86 400 | |
| `code` | 1–64 Zeichen | Schlüssel, idempotent |

Ein **unbekanntes Feld wird mit 400 abgewiesen**. Damit kann kein Klarname und kein Spielername
mitgeschickt werden, auch nicht versehentlich. Gemessen: `"platz":"Anna Müller"` ⇒ 400,
`"name":"Anna"` zusätzlich ⇒ 400 (`C-http.json`). Zusätzlich gespeichert wird nur der
Eingangszeitpunkt; **nicht** gespeichert werden IP-Adresse, User-Agent, Gerätekennung oder
Sitzungsdauer. Das Lager ist auf 4096 Einträge begrenzt.

## 4 · C1: der Server in der `.exe` (Einbauanleitung, Datei:Zeile)

Diese Änderungen sind **nicht** ausgeführt (Auftrag: `shell/` bleibt unangetastet). Sie sind
gegen die heute vorliegenden Dateien geprüft.

### 4.1 `shell/src-tauri/src/main.rs` – genau drei Stellen

**(a) Modulzeile.** Heute:

```rust
5: mod fenster;
6: mod speicher;
7: mod tray;
```

Neu **nach Zeile 7**:

```rust
mod klassenraum;
```

**(b) Befehle anmelden.** Heute:

```rust
147:        .invoke_handler(tauri::generate_handler![speichern, fenster_modus, fenster_groesse, fenster_ecke, fenster_zustand, immer_oben, abzeichen,
148:            autostart, autostart_status, exportieren, importieren, plattform_info, ruhe, beenden, selbsttest_ergebnis])
```

Neu: in Zeile 148 die beiden Namen `klassenraum_server, klassenraum_status` **vor** der
schließenden Klammer ergänzen – die Liste darf umbrechen, die Zeilennummern verschieben sich
entsprechend. Muster ist identisch zu `fn autostart` (Zeilen 76–83) und `fn immer_oben`
(Zeilen 68–71).

**(c) Port beim Beenden freigeben (Empfehlung).** Heute:

```rust
113: #[tauri::command]
114: fn beenden(app: AppHandle) {
115:     fenster::merker_schreiben(&app);
116:     app.exit(0);
117: }
```

Neu eine Zeile `klassenraum::stoppen();` vor `app.exit(0);`. **Nötig ist sie nicht** – das
Betriebssystem räumt die Sockets beim Prozesende ab –, aber sie macht das Verhalten sichtbar und
deckt den Fall ab, dass `beenden` aus der Seite kommt, während der Server läuft.

**Nicht** anzufassen: `struct Labor` (24–41), `setup()` (149–199) und die Fensterereignisse
(186–191). Der Serverzustand liegt in `klassenraum.rs`, nicht im Anwendungszustand.

### 4.2 `shell/src-tauri/src/klassenraum.rs` – neue Datei

Aufbau (die HTTP- und Vorratslogik ist wörtlich aus `tools/klassenraum/src/*.rs` übernehmbar,
damit C1 und C2 nicht auseinanderlaufen):

* `static ZUSTAND: OnceLock<Mutex<Option<Server>>>` – **kein** neues Feld in `Labor`.
* `struct Server { port: u16, bind: String, sitzung: Option<String>, stop: Arc<AtomicBool>, lager: Arc<Mutex<Lager>> }`.
* Annahmeschleife in einem eigenen Faden: `TcpListener::set_nonblocking(true)`, alle 40 ms
  `accept()`, Abbruchflag prüfen, je Verbindung ein Faden (Obergrenze 16).
* Der Verbindungszähler ist **atomar und gemeinsam** (`Arc<AtomicUsize>`), und er wird **vor** der
  Prüfung hochgezählt und nach der Verbindung wieder heruntergezählt. Ein lokaler Zähler ohne
  Herunterzählen führt dazu, dass der Server nach 16 Verbindungen **dauerhaft** 503 antwortet –
  eine Falle, die im Entwurf der ersten Runde steckte (Befund der Gegenprüfung).
* Über der Obergrenze: **erst die Anfrage lesen**, dann 503 antworten. Schließt der Server mit
  ungelesenen Daten im Eingangspuffer, schickt Windows ein RST, und der Client sieht **gar keine**
  Antwort (gemessen am C2-Binary: curl meldete `000` statt 503).
* **`strom.set_nonblocking(false)` am Anfang jeder Verbindung** (Windows-Falle 1 aus § 2.2) und
  `set_read_timeout(5 s)`.
* `#[tauri::command] pub fn klassenraum_server(app: AppHandle, an: bool, port: Option<u16>, nur_lokal: Option<bool>, sitzung: Option<String>, ablage: Option<String>) -> Result<Value, String>`
* `#[tauri::command] pub fn klassenraum_status() -> Value`
* `pub fn stoppen()` – Flag setzen, Horcher fallen lassen (Drop), Port frei; wartet höchstens
  500 ms auf das Ende der Fäden und meldet das Ergebnis.
* Die Antwortform ist die gemeinsame Zustandsform:

```json
{"an":false,"port":null,"bind":"0.0.0.0","lokal":"http://127.0.0.1:47112/liste",
 "klassennetz":"http://192.168.1.5:47112/liste","sitzung":null,"anzahl":0,
 "fehler":null,"firewall":"Windows fragt beim ersten Einschalten …"}
```

Grund für die Auslagerung: `main.rs` wächst um drei Zeilen statt um eine Serverimplementierung;
`klassenraum.rs` ist für sich lesbar und lässt sich gegen `tools/klassenraum/` abgleichen.

### 4.3 Capabilities/Rechte – **keine Änderung nötig**

`shell/src-tauri/capabilities/main.json` hat heute genau vier Einträge: `identifier`, `windows`,
`permissions` mit `core:default` und `core:window:allow-start-dragging`. Der Kommentar in
Zeile 4 sagt es selbst: **„Eigene Befehle sind ohne Freigabe erlaubt.“** Die ACL von Tauri 2
regelt **Plugin- und Kernbefehle**; Befehle, die die Anwendung über `invoke_handler` selbst
anmeldet, stehen dort nicht. Beleg: keiner der **15** heute registrierten Befehlsnamen
(`speichern`, `fenster_modus`, `fenster_groesse`, `fenster_ecke`, `fenster_zustand`,
`immer_oben`, `abzeichen`, `autostart`, `autostart_status`, `exportieren`, `importieren`,
`plattform_info`, `ruhe`, `beenden`, `selbsttest_ergebnis`) kommt in `capabilities/main.json`
oder in `gen/schemas/*.json` vor. Zusätzlich ist `gen/` per `.gitignore:3` ausgenommen und wird
bei jedem Bau neu erzeugt.

**Also:** `klassenraum_server` und `klassenraum_status` brauchen **keinen** Eintrag. Wer später
ein Plugin ergänzt (z. B. `tauri-plugin-localhost`), braucht sehr wohl eine Freigabe.

### 4.4 `shell/src-tauri/src/fenster.rs` – eine Zeile in `info()`

Heute steht am Ende der Fähigkeitsliste:

```rust
467:    let vb = s == "windows";
468:    setze("vollbildErkennen", vb, (!vb).then_some("Unter Linux erkennt das Programm Vollbild und Präsentation nicht. Blende die Leiste bei Bedarf aus."));
469:    setze("benachrichtigen", false, Some("Systemmitteilungen sind nicht eingebaut. …"));
```

Neu **zwischen 468 und 469**:

```rust
let kr = crate::klassenraum::status();
setze("klassenraum", kr["an"].as_bool().unwrap_or(false), Some("Der Live-Server läuft nur in der Desktop-Fassung. Im Browser und auf dem Telefon gibt es ihn nicht; dort werden Ergebnis-Codes eingetippt."));
```

Die Signatur `pub fn info(st: &Labor, hotkey_ok: bool) -> Value` bleibt damit unverändert, ebenso
alle drei Aufrufe (`main.rs:107`, `main.rs:124`, `main.rs:172`). Die Oberfläche fragt die
Fähigkeit über `Plattform.kann("klassenraum")` ab (`plattform-tauri.js:76-80`).

> **Achtung, geprüft und korrigiert:** Die Browser-Fassung meldet **nicht** von selbst „nein“.
> `plattform-browser.js:60` gibt für jede Fähigkeit, die nicht in der `NEIN`-Liste steht,
> `{ja: true}` zurück – und `klassenraum` steht dort nicht (die Liste hat heute sechs Einträge,
> Zeilen 8–15). Ohne Ergänzung zeigt die Browser-Fassung den Schalter also an, und der Klick
> endet in einem Fehler. **Vorschlag für Bereich B/A:** in `plattform-browser.js` einen Eintrag
> `klassenraum: "Den Live-Server gibt es nur im Desktop-Programm. Im Browser werden
> Ergebnis-Codes eingetippt."` aufnehmen. Das ist eine Änderung an `src/` und deshalb hier nur
> vorgeschlagen, nicht ausgeführt.

### 4.5 Einstellungen: Standard **aus**, ehrlicher Firewall-Text

Der Schalter liegt bei den übrigen Schaltern (`plattform-tauri.js` kennt `autostart` und
`ruhe` als Muster). **Drei Stellen müssen denselben Standard halten**, sonst zeigt die
Oberfläche „an“, während nichts läuft:

1. der Einstellungswert fehlt im Spielstand ⇒ `false` (nie „true“ als Vorgabe),
2. `ZUSTAND` ist beim Start `None`,
3. `klassenraum_status()` meldet `an: false`.

Text für die Einstellungen (ehrlich, ohne Schönfärberei):

> **Live-Einsammeln im Klassenzimmer** (nur Desktop)
> Schaltet einen kleinen Server in diesem Programm ein. Er nimmt im **lokalen Netz** Ergebnisse
> entgegen, damit du sie nicht abtippen musst. Standard: **aus**.
> * Beim ersten Einschalten fragt Windows: „Windows-Firewall hat einige Funktionen von
>   Netzwerk-Labor blockiert“. Erlaube den Zugriff für **private Netzwerke** (das Klassenzimmer
>   ist ein privates Netz). Für **öffentliche** Netzwerke ist „Nein“ richtig.
> * Lehnt Windows ab, funktioniert alles andere weiter – du tippst die Ergebnis-Codes dann ein.
>   **Ehrlich dazu:** Windows fragt **einmal**. Wer die Abfrage ablehnt (oder sie später im
>   Firewall-Fenster zurücknimmt), bekommt sie nicht von selbst wieder – die Blockregel bleibt
>   stehen, und ein Aus- und wieder Einschalten im Programm ändert daran nichts. Dann hilft nur
>   die Windows-Firewall-Einstellung („Netzwerk-Labor“ von „blockieren“ auf „zulassen“ für
>   private Netze) – oder die zweite Bauform, das eigenständige Programm C2, das Windows
>   ebenfalls einmal fragt.
> * Es gibt keine Anmeldung: Wer im selben Netz ist, kann die Liste abrufen und Ergebnisse
>   abgeben. Übertragen werden nur Platzkennungen, **keine Namen**.
> * Nur die Desktop-Fassung kann das. Browser und Telefon können es nicht – dort bleibt das
>   Eintippen der Normalfall.

### 4.6 Verhalten beim Schließen

* Schalter aus ⇒ Flag setzen, Horcher fallen lassen, Port sofort frei; die Oberfläche bekommt
  `{"an":false}`.
* Fenster schließen ⇒ `fenster::schliessen` (heute: ins Tray, `main.rs:188`) – der Server läuft
  weiter, solange das Programm läuft (gewollt: die Sitzung soll einen geschlossenen Fenster- oder
  Tray-Zustand überleben).
* Programm beenden ⇒ `beenden` (Zeilen 113–117) mit `klassenraum::stoppen();`; danach räumt
  ohnehin das Betriebssystem ab. Der Port ist in jedem Fall nach dem Prozesende frei (am C2-Binary
  gemessen: „Port nach Beenden frei: True“).
* Kein Server, keine Fehlermeldung: Der Zustandsbefehl antwortet immer, auch wenn nie gestartet
  wurde.

### 4.7 Warum C1 und C2 zwei Umsetzungen haben

C1 kann `serde_json` benutzen (die Hülle hat die Kiste schon, `Cargo.toml:21-22`), C2 darf nichts
benutzen. Die HTTP-Maschine ist in beiden Fällen ähnlich (rund 250 Zeilen). Drei Wege wären
denkbar: (a) C2 als Bibliothek in die Hülle holen – scheitert daran, dass `tools/klassenraum`
kein `lib`-Ziel hat und die Hülle kein Pfad-Abhängigkeit auf `tools/` bekommen soll; (b) C2
bleibt die einzige Umsetzung, die `.exe` startet sie als Kindprozess – widerspricht C1 („kein
zweites Programm“); (c) beide getrennt, dafür mit gemeinsamem Vertrag. **Empfehlung: (c)** – der
Vertrag in § 3 ist die Klammer, Änderungen werden an beiden Stellen nachgezogen. Ein
gemeinsamer Codekern wäre ein eigener kleiner Auftrag.

## 5 · D: QR-Code ohne neue Kisten

### 5.1 Weg und Empfehlung

Der Auftrag nennt die Crate `qrcode`. Sie ist hier nicht holbar (§ 1). Deshalb entstand ein
**eigener Encoder** `tools/klassenraum-probe/C-qr-rust/` (nur `std`, rund 600 Zeilen):

```
C-qr-rust --text "NL-4F7K-2Q" --ecc H --version 1 --maske auto [--svg datei] [--data-uri datei]
```

Ergebnis: `.exe` **164.864 Bytes (0,16 MB)**, SHA256 `A3C2D6A4…A547`, `cargo build --release` in
4,0 s, `cargo test --release` **5 von 5 grün** (Formatinformation, Kapazität, Dunkelmodul,
Sucher/Takt, ein bekanntes Reed-Solomon-Beispiel).

**Empfehlung:** den eigenen Encoder nehmen, **nicht** auf die Crate warten. Gründe: (1) er ist
gebaut, gemessen und gegen eine unabhängige zweite Umsetzung geprüft (§ 6); (2) er braucht keine
Kiste, also auch keinen Nachschub, keine Lizenzdatei und keinen Bruch, wenn crates.io fehlt;
(3) die Crate müsste ebenfalls erst geprüft werden. Kosten: Der Encoder kann **nur** Version 1–4
und die Modi alphanumerisch und Byte – für einen Auftragscode reicht das mit großem Abstand,
für beliebige Inhalte (lange Links, Kanji) nicht.

### 5.2 Modus, Version, Stufe, Maske für den Auftragscode

| Frage | Festlegung | Begründung |
|---|---|---|
| Modus | **alphanumerisch** (`0010`) | Der Code besteht nur aus `0-9 A-Z -`; diese Zeichen brauchen **5,5 Bit** statt 8. Zeichen außerhalb des Vorrats (kleine Buchstaben, Umlaute) schalten automatisch auf Byte (UTF-8) um |
| Version | **1** (21×21 Module) für `NL-4F7K-2Q` | 10 alphanumerische Zeichen = 68 Nutzbits; Version 1 hat bei Stufe H 72 Bit |
| Fehlerkorrektur | **H** (30 %) | Ein Beamerbild wird schräg und unscharf fotografiert; H verzeiht am meisten und passt hier **genau** (10 Zeichen ist die Höchstlänge von Version 1 mit H) |
| Maske | automatisch nach den vier Strafregeln der Norm | Für `NL-4F7K-2Q`, Stufe H, Version 1 wählt der Encoder **Maske 7** (gemessen) |
| Rückfall | passt der Code nicht in Version 1-H, nimmt der Encoder automatisch Version 2–4 (Stufe H: 16 / 26 / 36 Zeichen) | „zu lang“ ist damit erst jenseits von 36 Zeichen ein Fehler |

Gemessene Kapazitätsgrenze (beide Umsetzungen): 10 Zeichen ⇒ ok, 11 Zeichen ⇒ Abbruch mit
`Text zu lang: 74 Nutzbits benoetigt, 72 Bit verfuegbar (Version 1, Stufe H).`

### 5.3 Rückgabe an die Oberfläche

Empfohlen: **SVG als Data-URI**, zusätzlich die Matrix als Zeilen aus `0`/`1`.

| Form | Größe (gemessen) | Wofür |
|---|---|---|
| SVG-Data-URI | `data:image/svg+xml;base64,…` – Beispiel `NL-4F7K-2Q` V1-H: **3.592 Bytes** SVG | Beamer: beliebig skalierbar, scharfe Kanten, keine Kompression, kein Bilddecoder nötig |
| Matrix (21 Zeilen) | 21 × 21 Zeichen | Die Oberfläche kann selbst zeichnen (Canvas/DOM) und die Farben des Hauses benutzen |
| PNG-Data-URI | nicht eingebaut | Wäre über die im Cache liegende Kiste `png` möglich; für den Beamer unnötig, weil SVG schärfer skaliert. `qr_bild.py` erzeugt PNG nur zum Ansehen (Pillow) |

Der Tauri-Befehl lautet damit:

```rust
#[tauri::command]
fn klassenraum_qr(text: String) -> Result<Value, String>
// -> {"svg":"data:image/svg+xml;base64,…","version":1,"ecc":"H","maske":7,"module":21,
//     "matrix":["0101…", …]}
```

Es ist **kein** Link und **keine** Adresse im Code – nur der Auftragscode selbst, damit jeder
handelsübliche Scanner ihn liest (Auftrag, Stufe D).

### 5.4 Größe und Ruhezone für den Beamer

* Ruhezone **4 Module** auf allen Seiten (Normvorgabe). Fehlt sie, finden Scanner das Symbol oft
  nicht. Im SVG sind es (21 + 8) × 8 px = **232 × 232 px** bei 8 px je Modul.
* Das SVG trägt `viewBox` und `shape-rendering="crispEdges"` – es lässt sich ohne Qualitätsverlust
  auf jede Beamergröße ziehen. Kantenlänge im Beispiel bei 14 px je Modul: 406 × 406 px.
* Schwarz auf Weiß, **nicht invertiert**, keine abgerundeten Ecken, kein Logo im Symbol.
* Faustregel: Kantenlänge ≥ Betrachtungsabstand / 10. Für 8 m Abstand also ≥ 80 cm; bei 29
  Modulen (21 + Ruhezone) ist ein Modul dann rund 2,8 cm groß – mit 1 024 px Breite reichlich
  erfüllt.
* Die Lehrer-Ansicht zeigt den Code „aus drei Metern an der Tafel lesbar“ (`KLASSENRAUM.md:43`);
  der QR-Code ist die Zugabe für die Handykamera, nicht der Ersatz für die große Schrift.

### 5.5 Fehlerfall „zu langer Inhalt“

Der Encoder bricht mit Rückgabewert 1 und einer klaren Meldung auf stderr ab; die Oberfläche
zeigt dann **keinen** QR-Code, sondern nur den Text (und den Hinweis, dass der Code zu lang für
ein Bild ist). Kein stilles Falschkodieren: Der Rückgabewert ist Teil des Vertrags, und die
Kapazitätsgrenze wird vorher geprüft. `--version 7` wird mit
`Version 7 wird nicht unterstuetzt (1 bis 4)` abgelehnt.

### 5.6 Nur die Desktop-Fassung

Der QR-Encoder liegt in Rust, also **nur** in der `.exe`. Browser- und Android-Fassung zeigen
den Code weiter als Text zum Abtippen; die Einzeldatei bleibt ohne Bild (Auftrag,
`KLASSENRAUM.md:50` und die Vereinfachungen in Zeile 66). Die Browser-Fassung kann das auch
nicht nachholen, ohne den Spielkern zu vergrößern – genau das war die Begründung für Rust.

## 6 · Belege: was gebaut, ausgeführt und nachgerechnet wurde

### 6.1 Server (C2)

`tools/klassenraum-probe/C-http-probe.ps1` startet die `.exe`, stellt **20** echte Anfragen und
lässt den Server sich selbst beenden. Ergebnis in `Nachweise/Klassenraum/C-http.json` und
`C-http.txt` – **20 von 20 bestanden**, darunter:

| Prüfung | Ergebnis |
|---|---|
| `POST /ergebnis` (neu) | **201** |
| `POST /ergebnis` (derselbe Code) | **200**, `"neu":false` (idempotent) |
| `GET /liste?sitzung=NL-4F7K` | **200** |
| `OPTIONS /ergebnis` aus `file://` (`Origin: null`) | **204** mit allen CORS-Kopfzeilen |
| `GET /liste` mit `Origin: http://tauri.localhost` | **200** |
| `"platz":"Anna Müller"` | **400** (Datensparsamkeit) |
| zusätzliches Feld `"name"` | **400** |
| fremde Sitzung | **409** |
| `Content-Type: text/plain` | **415** |
| Rumpf > 4096 Bytes | **413** |
| unbekannter Weg | **404** |
| `DELETE /liste` | **405** mit `Allow` |
| 24 gleichzeitige Anfragen (`curl --parallel`) | **24 von 24 beantwortet**, in diesem Lauf 23 × 200 und 1 × 503. **Ehrlich dazu:** Der 503-Anteil schwankt von Lauf zu Lauf – die Gegenprüfung hat in 12 Läufen Werte zwischen **0 und 7 von 24** gemessen. Die Obergrenze von 16 greift also, aber wie oft, hängt davon ab, wie schnell die Verbindungen bedient werden. Ein einzelner Wert ist **kein** fester Kennwert des Servers |
| Server **ohne** `--sitzung`: `GET /liste` ohne Parameter | **400** – ohne Sitzungskennung gibt es keine Daten (Datensparsamkeit, s. § 3.2) |
| Server **ohne** `--sitzung`: `GET /liste?sitzung=NL-4F7K` | **200** |
| Selbstende + Portfreigabe | **True**, Port danach wieder bindbar |

Zweiter Client: `Invoke-WebRequest` (Windows PowerShell 5.1) liefert für POST **201** und für GET
**200** – der Server bedient also nicht nur `curl`. Ein `tcpdump`-Mitschnitt wurde **nicht**
gemacht; die Belege sind die Antworten der beiden Clients.

### 6.2 QR-Code (D) – Differentialtest und Rückkodierung

Zwei **unabhängig** geschriebene Umsetzungen derselben Norm werden Zelle für Zelle verglichen:

* Rust: `tools/klassenraum-probe/C-qr-rust/` (nur `std`)
* Python: `tools/klassenraum-probe/C-qr-python/qr_referenz.py` (nur Standardbibliothek)

```powershell
python tools\klassenraum-probe\C-qr-python\vergleich.py
```

Ergebnis: **25 von 25 Fällen** liefern dieselbe Matrix (SHA256 über `"\n".join(matrix)`), und
**jede** Rust-Matrix wird mit dem unabhängig geschriebenen Leser `qr_lesen.py` **wieder in die
Nutzlast zurückverwandelt** – Text stimmt, `syndrome_ok: true`. Beispiele aus
`Nachweise/Klassenraum/C-qr.json`:

| Nutzlast | Stufe | Version | Maske | Matrix-SHA256 | Rückkodierung |
|---|---|---|---|---|---|
| `NL-4F7K-2Q` | H | 1 | 0 | `1f7b8e279a050e14…` | `NL-4F7K-2Q`, Syndrome 0 |
| `NL-4F7K-2Q` | H | 1 | 7 (auto) | `d860df988d39cd97…` | `NL-4F7K-2Q`, Syndrome 0 |
| `NL-ABCD-12` | L | 1 | 3 | `efee9fa06ba49b45…` | `NL-ABCD-12`, Syndrome 0 |

Der Differentialtest hat **drei echte Fehler** gefunden – das ist sein Zweck:

1. **Rust, Suchermuster:** Für das obere rechte und das untere linke Suchermuster fehlte der
   Trenner; die achte Spalte war dunkel, wo sie hell sein muss.
2. **Rust, Reed-Solomon:** Das Schieberegister wurde mit `rotate_left` + `push` verschoben und
   wuchs bei jedem Datenbyte; die Prüfcodewörter waren falsch (die Nutzlast stimmte, die Syndrome
   nicht). Jetzt ist ein bekanntes Beispiel als Test verankert („HELLO WORLD“, Version 1-Q:
   `[32,91,…,236]` → `[168,72,22,82,217,54,156,0,46,15,180,122,16]`).
3. **Python-Referenz, zweite Formatinformation:** Kopie 2 war **transponiert** (Bits 0–7 in
   Spalte 8 statt in Zeile 8). Beleg, der es entscheidet: Bit 7 landete dadurch in der Zelle
   `(4·Version+9, 8)` – dem **Dunkelmodul**, das laut Norm immer dunkel ist. Gemessen war das
   Dunkelmodul bei den Stufen **M und Q hell** (dort ist Bit 7 der Formatinformation 0), z. B.
   `NL-4F7K-2Q`, Stufe M, Version 1, Maske 0 → Matrix[13][8] = 0 statt 1. Beide Dateien wurden
   korrigiert; die Korrektur steht mit Begründung im Quelltext.

Daraus folgt: Die früher vom Entwurfs-Agenten hinterlegten Prüfanker (7 SHA256-Werte) sind
**überholt** – sie entstanden vor den Korrekturen. Maßgeblich sind die Werte in
`Nachweise/Klassenraum/C-qr.json` und die dort beschriebenen Befehle.

Ein **vierter** Fehler kam erst in der Gegenprüfung der zweiten Runde heraus, weil der
21-Fälle-Test ihn nicht berührte:

4. **Rust, Strafregel 1 der Maskenwahl:** Der Spaltenlauf begann mit `m[i][0]` statt `m[0][i]`
   (`qr.rs`, Funktion `strafe`). Dadurch zählten Fünferläufe als Vierer (0 statt 3 Strafpunkte),
   und in rund **2 %** der Fälle (15 von 788 gemessenen) wählte der Encoder eine andere Maske als
   die Referenz – die Matrix blieb lesbar, war aber nicht normgerecht optimal. Behebung: eine
   Zeile (`letzte` je Richtung). Vier betroffene Fälle stehen jetzt als Regressionsproben im
   Differentialtest: `AAAAAAAAA` (L, V1) ⇒ Maske **7**, `US` (H, V1) ⇒ **0**,
   25 × `A` (L, V4) ⇒ **4**, `4Y1XDUEIQB` (L, V3) ⇒ **0**. **Der Auftragscode war nie betroffen**
   (`NL-4F7K-2Q`, Stufe H, Version 1 bleibt bei Maske 7) – deshalb fiel der Fehler erst der
   Gegenprüfung auf.

Ein **echter Scanner** stand nicht zur Verfügung (§ 9): `qrcode`/`segno` fehlen in Python,
`cv2`/`pyzbar`/`zbarimg`/ZXing fehlen, der Nachladeversuch scheitert an derselben Netzsperre.
Der Nachweis ist deshalb strukturell (Normkonformität, Dunkelmodul, Format-BCH, Syndrome) und
durch Rückkodierung belegt – **nicht** durch ein Foto mit dem Handy.

## 7 · Gegenprüfung der zweiten Runde – und was sie geändert hat

Drei Gegenprüfer haben die Entwürfe und die gebauten Teile **durch Bauen und Ausführen** geprüft
(Berichte in `tools/klassenraum-probe/C-2-pruefung/`). Was sie gefunden haben, wurde eingearbeitet
– nicht weggeredet:

| Befund | Quelle | Was daraus wurde |
|---|---|---|
| `GET /liste` ohne Sitzungskennung lieferte **alle** Ergebnisse **aller** Sitzungen samt fremder Kennungen – im Schulnetz ohne Anmeldung ein Datenleck | C2-Gegenprüfung (Punkt 4) | Sitzung ist jetzt **Pflicht** (Parameter oder `--sitzung`), sonst 400; Feld `sitzungen` entfallen; zwei neue Messungen in der Probe (§ 3.2) |
| Der 503-Anteil bei 24 gleichzeitigen Anfragen schwankt zwischen **0 und 7 von 24** (12 Läufe) – ein einzelner Wert ist kein Kennwert | C2-Gegenprüfung (Punkt 1) | Die Tabelle in § 6.1 nennt den Wert dieses Laufs **und** die Schwankungsbreite |
| Kommentar in `http.rs` sagte 414, der Code liefert 431 | C2-Gegenprüfung (Punkt 3) | Kommentar korrigiert; § 3.4 nennt 414/431 ausdrücklich als „zu lang“ |
| Die 10 Tests fassten die Grenzen von `sitzung` (2–12) und `code` (1–64) nicht an | C2-Gegenprüfung (Punkt 6) | neuer Test `grenzen_von_sitzung_und_code` (7 Fälle), damit **10** Tests |
| `--sitzung` normalisiert auf Großbuchstaben, die Fehlermeldung behauptete aber nur `A-Z` | C2-Gegenprüfung (Punkt 8) | Meldung nennt jetzt `A-Z, a-z, 0-9` und die Umwandlung |
| Die Windows-Falle (Nonblocking erbt sich, 503 erst nach dem Lesen) fehlte im C1-Entwurf | C1-Gegenprüfung (F4) | ausdrücklich in § 4.2 aufgenommen – samt Zähler als `Arc<AtomicUsize>` |
| „Aus und wieder ein, dann fragt Windows erneut“ war falsch | C1-Gegenprüfung (F8) | Firewall-Text in § 4.5 und in `LIESMICH.md` richtiggestellt: Windows fragt **einmal**, eine Ablehnung bleibt |
| „Im Browser meldet `kann("klassenraum")` ohnehin nein“ war falsch – die `NEIN`-Liste kennt den Schlüssel nicht, also meldet sie `ja` | C1-Gegenprüfung (F9/F10) | in § 4.4 richtiggestellt und als Vorschlag an Bereich B/A aufgenommen (§ 9) |
| Der C1-Entwurf nannte teils veraltete Zeilennummern im C2-Quelltext (Ports, Zeichensatz, Tests) | C1-Gegenprüfung (F1) | dieser Text zitiert nur Stellen, die der Leiter selbst nachgelesen hat; die C2-Zeilen sind hier nicht zitiert |
| Die zwei Entwurfspapiere widersprechen sich (8780 gegen 47112, `art` gegen `format`, 8 gegen 16 Verbindungen) | beide Gegenprüfungen | § 3 stellt klar: **verbindlich ist der gebaute Vertrag**, die Papiere sind Entwürfe |
| `C-http.json` war zwischenzeitlich **ungültiges** JSON (fehlende Trennkommas) | C2-Gegenprüfung (Punkt 5) | Ursache war PowerShells Komma-Vorrang; die Probe baut das JSON jetzt mit Klammern und **liest es zur Kontrolle wieder ein** (§ 2.2) |
| **Rust-Encoder: Strafregel 1** begann den Spaltenlauf bei `m[i][0]` statt `m[0][i]` – rund 2 % der Maskenwahlen wichen von der Norm ab (15 von 788 geprüften Fällen) | D-Gegenprüfung (Punkt 7) | eine Zeile in `qr.rs`; vier betroffene Fälle als Regressionsproben in den Differentialtest aufgenommen (jetzt **25** Fälle), § 6.2 |
| Die Python-Referenz und der Leser schreiben Nicht-ASCII-JSON in der ANSI-Codepage (`UnicodeDecodeError` bei „Grüße“) | D-Gegenprüfung (Punkt 9) | **offen** – betrifft nur Prüfwerkzeuge, nicht den Rust-Encoder (der ist UTF-8-sauber). `vergleich.py` prüft heute nur ASCII-Fälle; für Umlaute müsste `PYTHONIOENCODING=utf-8` gesetzt werden |
| Rückgabewerte der Probe sind uneinheitlich (`--version 7` ⇒ 1, `--version 300` ⇒ 2, `--modul abc` ⇒ still 8) | D-Gegenprüfung (Punkt 4) | **offen**, als Einschränkung vermerkt: die Oberfläche darf sich nicht auf einen bestimmten Wert verlassen, sondern auf die Fehlermeldung |
| Regel 3 der Strafregeln wird als reine Fensterlesart umgesetzt (wie zxing, anders als Nayuki) – in 5 von 17 Fällen hätte die andere Lesart eine andere Maske ergeben | D-Gegenprüfung (Punkt 2) | **offen** und ohne Norntext nicht entscheidbar; beide Umsetzungen lesen gleich, das Ergebnis ist in jedem Fall ein gültiger Code |

Was die Gegenprüfung **bestätigt** hat: die Zeilengenauigkeit des C1-Entwurfs (`main.rs:5-7`,
`:147-148`, `:113-117`, `:24-41`, `:149-199`; `fenster.rs:444/455/468/469`), die
Capability-Aussage (kein einziger der 15 Befehlsnamen in `capabilities/` oder `gen/schemas/`),
die Datensparsamkeit (acht Umgehungsversuche, keiner kam durch), die Reproduzierbarkeit des
Baus (zweimal derselbe SHA256) und alle sieben Pflichtantworten des Servers in einem
unabhängigen Lauf auf anderen Ports. Für den QR-Teil: Bausumme und `.text`-Gleichheit über zwei
Frischbauten, **64 von 64** Dunkelmodulen dunkel (V1/V2 × L/M/Q/H × Maske 0–7), **64 von 64**
Formatbits beider Kopien gleich der eigenen BCH-Nachrechnung (0x537/0x5412), Rückkodierung
**6 von 6**, Reed-Solomon-Literaturbeispiel exakt, Kapazitätsformel 16 von 16, und der
SVG-Pfad Zelle für Zelle gleich der Matrix (0 Abweichungen).

## 8 · Offene Punkte

1. **Firewall-Dialog nicht gesehen.** Der Text in § 4.5 ist aus dem Verhalten von Windows
   abgeleitet, aber in dieser Sitzung nicht am Bildschirm nachgezogen. Wortlaut und Knöpfe können
   je Windows-Fassung abweichen.
2. **C1 ist nicht gebaut.** Die Änderungen in § 4 sind gelesen und geprüft, aber nicht übersetzt
   (der Auftrag verbietet Eingriffe in `shell/`). Der Laufzeitbeweis, dass ein neuer Befehl ohne
   Capability-Eintrag erreichbar ist, fehlt damit; belegt ist nur die ACL-Regel über den
   Quelltext und die 15 vorhandenen Befehle.
3. **Browser-Messung fehlt.** Ob Chrome/Edge die Anfrage aus `file://` (Herkunft `null`) und von
   GitHub Pages (Private Network Access) wirklich durchlassen, ist **nicht gemessen**; es stand
   kein Browser zur Verfügung. Gemessen ist nur die Serverantwort auf den Preflight.
4. **Kein Scan mit einem echten Fremdleser.** Siehe § 6.2.
5. **Ports 47112–47121** können von Fremdprogrammen belegt sein; der Server weicht dann aus, aber
   die Oberfläche muss die tatsächliche Portnummer anzeigen (sonst tippen Schüler auf den
   falschen Port). Die Adressanzeige ist die offene Flanke in der Oberfläche.
6. **Adressermittlung im Klassennetz** nutzt den UDP-Verbindungskniff (kein Paket verlässt den
   Rechner). Auf Rechnern mit mehreren Netzen (WLAN + Kabel) kann die angezeigte Adresse die
   falsche sein – nicht geprüft, weil nur ein Netz vorhanden war.
7. **Zwei Server gleichzeitig** (C1 und C2) würden sich den Port streitig machen; C2 weicht dann
   auf 47113 aus, und die Oberfläche findet den ersten passenden. Zwei getrennte Lager werden
   **nicht** zusammengeführt.
8. **Der Ergebnis-Code wird vom Server nicht gedeutet.** Er ist Schlüssel und wird verbatim
   gespeichert; `platz`, `sterne` und `dauerS` liefert der Client mit. Sobald Bereich A den
   Ergebnis-Code fertig definiert hat, kann der Server die Felder daraus selbst lesen – dann
   sollten sie aus der Anfrage verschwinden (kleinere Form, weniger Vertrauen nötig).
9. **Kein Keep-Alive** und eine Anfrage je Verbindung: Für einen Klassensatz reicht das gemessen
   aus, für Dauerlast wäre es die erste Baustelle.

## 9 · Nicht geprüft (ausdrücklich)

* keine Messung am laufenden Tauri-Programm (`shell/` unangetastet, `.exe` nicht neu gebaut),
* keine Browser-Messung (Herkunft `null`, Private Network Access, `http://tauri.localhost`),
* kein Handy-Scan, kein Fremdscanner, kein Druck, keine Beamer-Aufnahme,
* kein Test mit mehr als 24 gleichzeitigen Anfragen und keiner über 4096 Ergebnissen,
* keine Messung über echte Netzwerkgrenzen (nur `127.0.0.1`; das Klassennetz wurde nicht
  aufgespannt),
* keine Messung der Firewall-Abfrage,
* keine Messung der echten Fehlerkorrektur (nur Syndrome 0, kein Bitfehler eingestreut),
* QR nur für Versionen 1–4, Modi alphanumerisch und Byte – höhere Versionen, Kanji und
  strukturierte Anhänge sind nicht umgesetzt,
* Auslegung der Strafregel 3 (Fenster- gegen Ruhezonen-Lesart) ist nicht entschieden; beide
  Umsetzungen lesen gleich, das Ergebnis ist in jedem Fall ein gültiger Code,
* die Python-Prüfwerkzeuge geben Nicht-ASCII-JSON in der ANSI-Codepage aus (§ 7) – die
  Prüffälle sind deshalb ASCII.

## 10 · Vorschläge für die anderen Dateien (nicht selbst geändert)

* **`src/plattform/plattform-browser.js`**: einen Eintrag `klassenraum` in die `NEIN`-Liste
  (Zeilen 8–15) aufnehmen, sonst zeigt die Browser-Fassung den Schalter an und der Klick läuft in
  einen Fehler (§ 4.4).
* **`.gitignore`** (Wurzel): Zeile `tools/klassenraum/target/` ergänzen. Bis dahin fängt
  `tools/klassenraum/.gitignore` den Bauabfall auf. Ebenso wäre
  `tools/klassenraum-probe/C-qr-rust/target/` sinnvoll.
* **`docs/Architektur.md`**: einen Abschnitt „Klassenraum-Live (optional)“ mit den zwei Wegen,
  den fünf Feldern, den Statuscodes und der Regel „Server nur lokal, keine Klarnamen,
  Standard aus“ aufnehmen. Der Vertrag aus § 3 ist die Vorlage.
* **`docs/Bauen.md`**: um den C2-Bau ergänzen:
  `cd tools/klassenraum; cargo build --release` (7,5 s, 0,31 MB) – kein `python bauen.py` nötig,
  weil das Binary die Web-Fassung nicht braucht.
* **`shell/src-tauri/Cargo.toml`**: **keine** neue Abhängigkeit nötig; die Hülle hat `serde_json`
  bereits (Zeilen 21–22).
* **`tools/auftraege/KLASSENRAUM.md`**: Zeile 12 („QR-Code über eine Rust-Crate (`qrcode` o. ä.)“)
  ist in dieser Umgebung nicht erfüllbar; Zeile 74 („D (QR über Crate) ≈ ½ Sitzung“) unterschätzt
  den eigenen Encoder. Vorschlag: „QR-Code über einen eigenen, abhängigkeitsfreien Encoder
  (Rust) – Crate nur, wenn erreichbar“.

## 11 · Dateien dieses Bereichs

| Datei | Inhalt |
|---|---|
| `tools/klassenraum/` | C2-Server (Cargo-Projekt, `Cargo.lock`, `.gitignore`, `LIESMICH.md`) |
| `tools/klassenraum-probe/C-http-probe.ps1` | Probe: startet die `.exe`, 18 echte Anfragen, Selbstende, Portprüfung |
| `tools/klassenraum-probe/C-roh-test.ps1`, `C-iwr-test.ps1` | die beiden Rohdiagnosen zu den Windows-Fallen aus § 2.2 |
| `tools/klassenraum-probe/C-qr-rust/` | QR-Encoder (nur `std`), 5 Tests |
| `tools/klassenraum-probe/C-qr-python/qr_referenz.py` | unabhängige Python-Referenz (Encoder) |
| `tools/klassenraum-probe/C-qr-python/qr_lesen.py` | unabhängiger Leser (Matrix → Nutzlast, Syndromprüfung) |
| `tools/klassenraum-probe/C-qr-python/vergleich.py` | Differentialtest + Rückkodierung + SVG-Prüfung |
| `tools/klassenraum-probe/C-qr-python/qr_bild.py` | Matrix als PNG (nur zum Ansehen/Beamer) |
| `tools/klassenraum-probe/C-1-entwurf/c1-einbau.md`, `c2-endpunkte.md` | die beiden Entwürfe der ersten Runde |
| `tools/klassenraum-probe/C-2-pruefung/*.md` | die Gegenprüfungen der zweiten Runde |
| `Nachweise/Klassenraum/C-http.json`, `C-http.txt`, `C-http-lauf.txt` | Messprotokolle des Servers |
| `Nachweise/Klassenraum/C-qr.json` | Differentialtest, Matrix-Hashes, Rückkodierung |
| `Nachweise/Klassenraum/C-qr-beispiel.svg`, `C-qr-beispiel.png` | der Auftragscode als Bild |
