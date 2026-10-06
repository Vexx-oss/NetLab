# C2 · Die gemeinsame Netz-Schnittstelle beider Serverbauformen — Entwurf

**Gegenstand:** Der Vertrag für die zwei Endpunkte `GET /liste` und `POST /ergebnis`, den die
Desktop-`.exe` (Stufe C1, Server im Programm) und das eigenständige Binary unter
`tools/klassenraum/` (Stufe C2) **gemeinsam** erfüllen.
**Status:** Entwurf, kein Produktivcode. Diese Datei legt fest; sie baut nicht.
**Sprache/Form:** Deutsch, UTF-8, LF.
**Auftrag:** `tools/auftraege/KLASSENRAUM.md:45-49` (Stufe C), dort `:47` die zwei Endpunkte,
`:48` „Der Server ist in beiden Formen optional … keine Fehlermeldung, wenn nicht“,
`:49` „nur lokal … keine Klarnamen — nur Platz-Kennungen“, `:46` „Einschalten in den Einstellungen
(Standard: **aus**), mit ehrlichem Hinweis auf die Windows-Firewall-Abfrage“.

**Regel dieses Blattes:** Jede Festlegung trägt einen Beleg `Datei:Zeile`. Was in dieser Sitzung
nicht nachgelesen oder nicht gemessen werden konnte, steht ausdrücklich als
**„nicht geprüft“** da — es wird nicht gemutmaßt (`AGENTS.md`, Absolute Verbote Nr. 5).

---

## 1 · Was schon da ist (Grundlage des Entwurfs)

Der Entwurf erfindet die Datenformen nicht neu: für **C2 liegt bereits Quelltext** im
Arbeitsbaum (nicht in Git, `git status` zeigt `?? tools/klassenraum/`), und dieser Entwurf
schreibt fest, was davon Vertrag ist und was geändert werden muss.

| Baustein | Ort | Was dort schon festgelegt ist |
|---|---|---|
| Mini-HTTP, nur Standardbibliothek | `tools/klassenraum/src/http.rs:1-23` | Rumpf 4096 B (`:21`), Zeitlimit 5 s (`:23`), Anforderungszeile 8 KiB (`:15`), Kopfzeile 4 KiB (`:17`), 40 Kopfzeilen (`:19`), kein Keep-Alive (`:3-8`), Status 400/408/413/431 (`:121,:124,:151,:171,:184`) |
| CORS-Kopfzeilen | `tools/klassenraum/src/http.rs:210-220` | `Access-Control-Allow-Origin: *`, `-Methods: GET, POST, OPTIONS`, `-Headers: Content-Type`, `-Max-Age: 600`, `Access-Control-Allow-Private-Network: true`, bewusst **kein** `-Credentials` (`:211-212`) |
| Antwortkopf | `tools/klassenraum/src/http.rs:205-209` | `Content-Type`, `Content-Length`, `Cache-Control: no-store`, `Connection: close` |
| JSON von Hand | `tools/klassenraum/src/json.rs:1-9` | „Die Umgebung hat keinen Zugang zu crates.io“; `Wert`-Modell `:13-21`, Ganzzahlprüfung `:32-37` |
| Ergebnislager | `tools/klassenraum/src/lager.rs:1-16` | **Die Feldnamen des Vertrags**: `code`, `sitzung`, `platz`, `sterne`, `dauerS`, `eingegangenS` (`:19-26`, `:112-119`), Obergrenze 4096 (`:16`), idempotent über den Code (`:74-86`), Datensparsamkeits-Zusage `:4-6` |
| Ablagedatei | `tools/klassenraum/src/lager.rs:127-131` | `{"format":"klassenraum-ablage","v":1,"ergebnisse":[…]}` |
| C2-Projekt | `tools/klassenraum/Cargo.toml:8-14` | Binary `klassenraum`, `path = "src/main.rs"`, **keine** Abhängigkeiten — `src/main.rs` **fehlt** (nur `http.rs`, `json.rs`, `lager.rs` liegen dort) |

**Folgerung:** C2 ist zu etwa zwei Dritteln gebaut, aber **nicht lauffähig** (kein `main.rs`,
`Cargo.toml:10` zeigt darauf). C1 ist **nicht gebaut**: in `shell/src-tauri/src/` liegen nur
`fenster.rs`, `main.rs`, `speicher.rs`, `tray.rs` — **kein** `klassenraum.rs`, und `main.rs:148`
registriert keine Netz-Befehle. Die Suche nach `port|Port|127.0.0.1` in `shell/src-tauri/src/`
findet **nichts**.

---

## 2 · Frage 1 — Welche Origin hat die Tauri-Fassung wirklich?

**Antwort: unter Windows `http://tauri.localhost`, unter Linux `tauri://localhost`.**
Belegt aus der Rust-Seite und aus dem Quelltext der benutzten Tauri-Fassung — **nicht** in dieser
Sitzung am laufenden Programm gemessen (siehe § 13, Punkt 1).

1. Die Hülle lädt eingebettete Dateien, keine Netzadresse:
   `shell/src-tauri/src/main.rs:178` → `WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))`.
   Es wird **kein** `use_https_scheme` gesetzt; `use_https_scheme` ist damit `false`
   (Feld der Webview-Attribute, Vorgabe `false`).
2. `WebviewUrl::App` geht über `get_app_url`: `tauri-2.12.0/src/manager/webview.rs:468-486`
   → `:470` `app_manager.get_app_url(pending.webview_attributes.use_https_scheme)`; `:477-485`
   lässt den Pfad `index.html` weg („ignore `index.html` just to simplify the url“).
3. `get_app_url` fällt ohne `frontendDist`-URL auf das eingebaute Protokoll zurück:
   `tauri-2.12.0/src/manager/mod.rs:345-359`, insbesondere `:357` `self.tauri_protocol_url(https)`.
   `frontendDist` ist hier ein **Ordner** (`shell/src-tauri/tauri.conf.json:7` → `"../../web"`),
   also greift der Rückfall (`:349-352` prüft nur `FrontendDist::Url`).
4. Die Plattformregel steht wörtlich im Quelltext:
   `tauri-2.12.0/src/protocol/mod.rs:28-39` — „On Windows and Android custom protocols are served
   over `http(s)://{scheme}.localhost`; everywhere else they are served over `{scheme}://localhost`“.
   Mit `scheme = "tauri"` und `use_https = false` (`:32-38`): Windows/Android → `http://tauri.localhost`,
   sonst → `tauri://localhost`.
5. Gegenprobe im Testcode derselben Kiste: `tauri-2.12.0/src/manager/mod.rs:785-803` prüft genau das —
   `:789-793` `cfg!(windows) || cfg!(target_os = "android")` → `"http://tauri.localhost/"`, sonst
   `"tauri://localhost"`; `:795-802` dieselbe Fallunterscheidung mit `https`.
   Weitere Belege: `tauri-2.12.0/src/app.rs:342` („`https://tauri.localhost` instead of
   `http://tauri.localhost`“), `tauri-2.12.0/src/test/mod.rs:42-43` („alternatively use
   `tauri://localhost`“).
6. **Suchbegriff und Fund:** die Suche nach `tauri.localhost|tauri://localhost` in
   `C:\Users\Student\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\tauri-2.12.0\`
   liefert 25 Treffer in 7 Dateien (die Nummern oben sind daraus).

**Folgen für die Schnittstelle:**

- Der Ursprung der Tauri-Fassung ist **nicht** `file://` und **nicht** `https`, sondern eine
  **eigene Herkunft** `http://tauri.localhost` (Windows) bzw. `tauri://localhost` (Linux).
  `tauri.localhost` ist für den Browser eine **loopback-nahe** Herkunft (die Tauri-Kiste behandelt
  `http://tauri.localhost/` in `webview/mod.rs:2745-2748` ausdrücklich als *lokale* URL:
  `is_local_url`). Ob Chromium sie adressraummäßig wie `127.0.0.1` einstuft — für die Frage, ob
  Private Network Access greift —, ist **nicht geprüft** (siehe § 13, Punkt 4).
- Ein `Access-Control-Allow-Origin: http://tauri.localhost` wäre **falsch**: die Kopfzeile muss
  `*` sein oder widergespiegelt werden, sonst bricht die Linux-Fassung (`tauri://localhost`) und
  jede andere Herkunft. Siehe § 4.
- `Origin` ist im Programm also **vorhanden** (nicht `null`) — anders als bei der Einzeldatei.

---

## 3 · Frage 2 — Origin der Web-Einzeldatei und der GitHub-Pages-Fassung

**(a) Einzeldatei per Doppelklick → `file://`.**

- Der Prüfweg des Hauses lädt die Einzeldatei genau so: `tools/starttest.py:41` verweist auf
  `docs/index.html`, `:224` übergibt `probe.as_uri()`, und `:265` druckt „headless, ueber
  `file:///…`“ — der Kommentar `:209-213` erklärt, dass eine Arbeitskopie neben der Datei liegt.
  `Path.as_uri()` erzeugt ein `file://`-URL.
- Damit ist die Herkunft **opak**: der Browser schickt bei einem `fetch` **`Origin: null`**.
  Das ist die bekannte Eigenschaft opaker Herkünfte — **in dieser Sitzung nicht gemessen**
  (siehe § 13, Punkt 3); die Messung, die es belegen sollte, ist an der Umgebung gescheitert.

**(b) GitHub-Pages-Fassung → `https://vexx-oss.github.io` (Herkunft der Seite `…/NetLab/`).**

- `README.md:24` verweist als Browser-Weg auf `https://vexx-oss.github.io/NetLab/`; `:25` nennt
  daneben den Einzeldatei-Download. `git remote -v` in dieser Sitzung: `https://github.com/Vexx-oss/NetLab.git`.
- Die Herkunft (Origin) ist damit `https://vexx-oss.github.io` — **öffentlicher** Adressraum,
  Schema `https`, Port 443.

**(c) Folgen für `Access-Control-Allow-Origin`.**

| Ladeweg des Spiels | `Origin` der Anfrage | Server muss antworten |
|---|---|---|
| Tauri-`.exe` (Windows) | `http://tauri.localhost` | `Access-Control-Allow-Origin: *` (oder diesen Wert widerspiegeln) |
| Tauri (Linux) | `tauri://localhost` | dito (`*`; Widerspiegeln ginge auch) |
| Einzeldatei (`file://`, Doppelklick) | `null` | `*` — **nicht** „widerspiegeln“, denn `null` ist keine sinnvoll spiegelbare Herkunft |
| GitHub Pages | `https://vexx-oss.github.io` | `*` |

→ **Festlegung: immer `Access-Control-Allow-Origin: *`**, kein `Access-Control-Allow-Credentials`,
keine Herkunftsprüfung (die Kopfzeile ist keine Sicherheitsgrenze, siehe § 4 (d)).

**(d) Preflight (`OPTIONS`).**

- Nötig wird er durch `Content-Type: application/json` (nicht „safelisted“) und durch jeden
  eigenen Kopf; er entfällt bei `GET` ohne eigene Köpfe.
- **Stufe 1 des Entwurfs: `OPTIONS` auf beiden Pfaden → `204 No Content`**, mit
  `Allow`/`Access-Control-Allow-Methods: GET, POST, OPTIONS`,
  `Access-Control-Allow-Headers: Content-Type`,
  `Access-Control-Max-Age: 60` (**Vorschlag; heute 600**, `http.rs:216` — Begründung in § 4 (e)).
- Kopfzeilen des Servers auf **jeder** Antwort, auch auf Fehlern: CORS-Kopfzeilen. Sonst kann die
  Oberfläche einen Fehler nicht lesen (sie sieht nur „Failed to fetch“) und müsste ihn
  verschweigen — genau das soll sie laut Auftrag (`KLASSENRAUM.md:48`) tun, aber nur für
  „Server nicht erreichbar“, nicht für „Server hat geantwortet und abgelehnt“.

**(e) Private Network Access (Chrome/Edge; gemessen mit Edge 154.0.4258.53 vorhanden).**

- Sachstand: Chrome/Edge verlangen für Anfragen aus einem *öffentlichen* Kontext an eine *lokale*
  Adresse einen Preflight mit der Anforderungskopfzeile
  `Access-Control-Request-Private-Network: true` und erwarten darauf
  `Access-Control-Allow-Private-Network: true`. Die Kopfzeile heißt genau so; der Name ist
  belegt an einer anderen Kiste im Kistenlager: `tower-http-0.6.11/src/cors/mod.rs:416` und
  `…/cors/allow_private_network.rs:8` („Holds configuration for how to set the
  `Access-Control-Allow-Private-Network` header“), dazu `:66-67` („only relevant if the request has
  the `Access-Control-Request-Private-Network` header set“).
- **Betroffener Fall ist genau die GitHub-Pages-Fassung** (`https://…` = öffentlich) → `http://…`
  im Klassenraum-LAN (privat). Für `file://` (lokal) und `http://tauri.localhost` (loopback-nah)
  ist der Preflight nach dieser Regel **nicht** zu erwarten; ob Chromium das für
  `tauri.localhost` wirklich so einstuft, ist **nicht geprüft** (siehe § 13, Punkt 4).
- **Festlegung: der Server antwortet auf einem `OPTIONS` immer mit
  `Access-Control-Allow-Private-Network: true`** — unabhängig davon, ob die Anforderungskopfzeile
  da war (so steht es schon in `http.rs:217-219`). Das ist die einzige Stelle, an der der Entwurf
  bewusst großzügig ist: die Zeile kostet nichts, ihr Fehlen kostet die ganze Pages-Fassung.
- **Ehrlich dazugesagt:** PNA in seiner alten Form („blockieren“) wurde von Chromium zurückgenommen
  und durch eine Abfrage (Permission) ersetzt — „nicht geprüft“ in dieser Sitzung, und die
  Browserpolitik ändert sich. Deshalb bleibt die Regel: **die Zeile wird gesendet**; und die
  Oberfläche muss auch dann spielen, wenn die Pages-Fassung den Server nicht erreicht
  (Stufe B von Hand, `KLASSENRAUM.md:48`) — das ist der Rückfall, auf den der Auftrag baut.

---

## 4 · Frage 3 — Die exakten JSON-Formen, Beispiel, Statuscodes, Kopfzeilen

### 4.1 `GET /liste`

**Anfrage:** `GET /liste?sitzung=NL-4F7K HTTP/1.1` — `sitzung` ist syntaktisch Pflicht.
Ohne `sitzung` antwortet der Server `400`. Ein unbekannter Sitzungscode ist **kein** Fehler: die
Liste ist dann leer (`anzahl: 0`). Grund für die Pflicht: eine lückenlose Liste wäre die
Datensparsamkeit von `KLASSENRAUM.md:49` („nur Platz-Kennungen“) wertlos, sobald mehrere
Sitzungen im Lager liegen — sie zeigt sonst fremde Platzkennungen.

**Antwort 200:**

```json
{"art":"liste","sitzung":"NL-4F7K","ergebnisse":[{"code":"E-4F7K-2Q","platz":"P3","sterne":3,"dauerS":214,"eingegangenS":1759744351}],"anzahl":1,"moeglich":4096,"jetztS":1759745000}
```

Feld für Feld (Feldnamen aus `lager.rs:19-26` und `:112-119` übernommen, Reihenfolge in der
Ausgabe sortiert — so schreibt `json.rs:11-21` Objekte als `BTreeMap`):

| Feld | Typ | Bedeutung | Beleg/Zwang |
|---|---|---|---|
| `art` | Text, immer `"liste"` | Erkennungsmerkmal für die Oberfläche | neu; nötig, weil ein fremder Dienst auf dem Port sonst als „Server“ gälte (§ 9) |
| `sitzung` | Text | die erfragte Sitzung (Widerspiegelung) | `lager.rs:21` |
| `ergebnisse` | Liste von Objekten | je Eintrag **nur** die fünf Felder `code`, `platz`, `sterne`, `dauerS`, `eingegangenS` | `lager.rs:112-119`; `sitzung` steht bereits außen und wird **nicht** je Eintrag wiederholt |
| `anzahl` | Ganzzahl | `ergebnisse.length` — die Zahl für die Ampel | `lager.rs:66-68` (`anzahl()`) |
| `moeglich` | Ganzzahl | Obergrenze des Lagers = 4096 | `lager.rs:16`, `:70-72` (`voll()`) |
| `jetztS` | Ganzzahl | Serveruhr, Sekunden seit 1970 (UTC) | `lager.rs:143-146` (`jetzt_s`); die Oberfläche rechnet ohne eigene Uhr („Dauer“ bleibt vergleichbar) |

**Reihenfolge:** Eingangsreihenfolge (so liegt es im Lager, `lager.rs:29` `eintraege: Vec<Eintrag>`).
Nicht sortieren — der Lehrer sieht dann, wer zuletzt abgegeben hat.

### 4.2 `POST /ergebnis`

**Anfrage** (Rumpf, `Content-Type: application/json; charset=utf-8`, höchstens 4096 Bytes):

```json
{"sitzung":"NL-4F7K","platz":"P3","sterne":3,"dauerS":214,"code":"E-4F7K-2Q"}
```

**Antwort 201 (neu)** — und **200 (derselbe Code nochmal, idempotent)**:

```json
{"art":"ergebnis","neu":true,"code":"E-4F7K-2Q","platz":"P3","sterne":3,"dauerS":214,"anzahl":1,"moeglich":4096,"jetztS":1759745004}
```

```json
{"art":"ergebnis","neu":false,"code":"E-4F7K-2Q","platz":"P3","sterne":3,"dauerS":214,"anzahl":1,"moeglich":4096,"jetztS":1759745060}
```

| Feld | Typ | Bedeutung |
|---|---|---|
| `art` | Text, immer `"ergebnis"` | Erkennungsmerkmal |
| `neu` | Wahrheitswert | `true` = frisch eingetragen (201), `false` = war schon da (200) — **die einzige** Aussage, die den Unterschied trägt. Bei `false` gibt der Server die **ursprünglichen** Werte zurück, nicht die neu gesendeten (Idempotenz, `lager.rs:74-78`) |
| `code` | Text | der Ergebniscode, wie er im Lager steht (in Versalien normalisiert, `lager.rs:59-61`) |
| `platz`,`sterne`,`dauerS` | wie Anfrage | die **gespeicherten** Werte (bei `neu:false` die ersten) |
| `anzahl`,`moeglich` | Ganzzahl | Stand des Lagers für die Ampel (Antwort auf „hat es geklappt?“ ohne zweite Anfrage) |
| `jetztS` | Ganzzahl | Serveruhr |

**Der Server zählt den Code als Schlüssel, nicht den Menschen:** derselbe Code zweimal ändert
nichts (`lager.rs:76-78`, Test `lager.rs:172-176`), ein zweiter Code desselben Platzes ist ein
zweiter Eintrag. Folge, die ausdrücklich offen benannt wird: löst derselbe Platz den Auftrag
zweimal mit **unterschiedlicher Dauer**, entstehen zwei Codes und damit zwei Einträge
(siehe § 12, offener Punkt 2).

### 4.3 Fehlerform (eine Form für alles)

```json
{"fehler":"feld","feld":"sterne","grund":"Ganzzahl 0..5 erwartet"}
```

- `fehler` — Kurzart, einer von `"methode"`, `"pfad"`, `"typ"`, `"json"`, `"feld"`, `"zu_gross"`,
  `"voll"`, `"ausgelastet"`, `"kopf"`.
- `feld` — nur bei `fehler:"feld"`, sonst weggelassen.
- `grund` — ein Satz **für die Fehlersuche**, nicht für Schüler (die Oberfläche zeigt ihn nie an,
  § 11). Keine Echtdaten hineinschreiben (kein Rumpf-Zitat über 40 Zeichen, keine Kennungen).

Diese Form ist die des Hauses: `Spiel.klassenraum` liefert `{fehler:"…"}` (`KLASSENRAUM.md:31-34`),
und C2 prüft schon so (`http.rs:96-104`, `lager.rs:75-86`).

### 4.4 Statuscodes (vollständig, mit Begründung und Beispiel)

| Code | Wann | Rumpf | Beispielauslöser |
|---|---|---|---|
| **200** | `GET /liste` erfolgreich | Liste (4.1) | Lehreransicht fragt ab |
| **200** | `POST /ergebnis`, Code war schon da | `neu:false` (4.2) | Schüler drückt zweimal „Abgeben“ |
| **201** | `POST /ergebnis`, neu eingetragen | `neu:true` (4.2) | erste Abgabe |
| **204** | `OPTIONS` (Preflight) auf beiden Pfaden | **leer**, kein `Content-Type`, `Content-Length: 0` | Browser vor dem POST |
| **400** | Anfrage nicht lesbar oder Feld verletzt: kaputtes JSON, fehlendes/zu langes Feld, `sterne` außerhalb 0..5, `dauerS` außerhalb 0..86400, `sitzung` fehlt bei `GET`, **unbekanntes Feld im Rumpf** | `{fehler:"json"\|"feld"\|"kopf",…}` | `{"sitzung":"NL-4F7K","platz":"P3","sterne":9,"dauerS":214,"code":"E-1"}` |
| **404** | Pfad unbekannt (`/`, `/favicon.ico`, `/liste/x`) | `{fehler:"pfad"}` | Tippfehler in der Oberfläche |
| **405** | Pfad bekannt, Methode falsch (`PUT /liste`, `DELETE /ergebnis`, `GET /ergebnis`) + Kopfzeile `Allow: GET, OPTIONS` bzw. `Allow: POST, OPTIONS` | `{fehler:"methode"}` | fremdes Werkzeug probiert |
| **409** | Lager voll (`anzahl == moeglich == 4096`), **nur** für einen *neuen* Code — ein bekannter Code wird weiterhin mit 200 beantwortet | `{fehler:"voll",grund:"Lager voll (4096 Eintraege)"}` | Scherzkeks schreibt 5000 Codes (Beleg: `lager.rs:70-72`, `:79-81`) |
| **413** | `Content-Length > 4096` | leer oder `{fehler:"zu_gross"}`; der Rumpf wird **nicht** gelesen, die Verbindung geschlossen | kaputter Client, aufgeblähter Block |
| **415** | `POST` ohne `Content-Type: application/json…` (z. B. `text/plain`, `application/x-www-form-urlencoded`) | `{fehler:"typ"}` | Formular aus einer fremden Seite |
| **503** | Nebenläufigkeitsgrenze erreicht (§ 8) **und** Lager nicht verfügbar/nicht schreibbar | `{fehler:"ausgelastet"}` + `Retry-After: 1` | 40 Geräte gleichzeitig, 8 Plätze belegt |
| **431** *(Zusatz)* | Kopfzeile > 4 KiB oder > 40 Kopfzeilen — schon gebaut, `http.rs:19,121,171` | leer | kaputter Client |
| **414** *(Zusatz)* | Anforderungszeile > 8 KiB — schon gebaut, `http.rs:15` | leer | kaputter Client |
| **408** *(Zusatz)* | Zeitlimit beim Lesen — schon gebaut, `http.rs:124`; wird **nur** gesendet, wenn der Lesefehler vor dem Antwortbeginn auftritt, sonst wird einfach geschlossen (ehrlicher, weil ein 408 nach Ablauf nicht mehr ankommt) | leer | halb offene Verbindung |

**Nicht** in diesem Vertrag: `401`/`403` (es gibt keine Anmeldung — § 7 sagt die Folge ehrlich),
`301`/`302` (kein Umleiten), `500` (jeder Fehler ist benannt; ein unerwarteter Fehler wird als
`503` mit `{fehler:"ausgelastet"}` gemeldet — die Oberfläche zeigt beides gleich: nichts).

### 4.5 Kopfzeilen jeder Antwort

| Kopfzeile | Wert | Begründung/Beleg |
|---|---|---|
| `Content-Type` | `application/json; charset=utf-8` (nur wenn ein Rumpf da ist) | `http.rs:206`; UTF-8 ist bei „nur ASCII“ streng genommen unnötig, schadet aber nicht und ist ehrlich |
| `Content-Length` | Bytelänge des Rumpfes, auch `0` | `http.rs:207`; **Pflicht**, weil kein Keep-Alive und keine Chunked-Übertragung (`http.rs:3-8`) |
| `Cache-Control` | `no-store` | `http.rs:208`; die Ampel muss live sein |
| `Connection` | `close` | `http.rs:209`; eine Verbindung, eine Anfrage |
| `Access-Control-Allow-Origin` | `*` | § 3 (c) |
| `Access-Control-Allow-Methods` | `GET, POST, OPTIONS` | § 3 (d) |
| `Access-Control-Allow-Headers` | `Content-Type` | dito |
| `Access-Control-Max-Age` | **`60`** (heute `600`, `http.rs:216`) | **Vorschlag zur Änderung:** mit Portscan (§ 9) und `Connection: close` ist ein 10-Minuten-Preflight-Cache eine Falle — der Schülerrechner merkt zehn Minuten nicht, dass der Server auf einem anderen Port läuft |
| `Access-Control-Allow-Private-Network` | `true` | § 3 (e) |
| `Vary` | **nicht nötig** | `*` ist nicht herkunftsabhängig; kein `Vary: Origin` |
| `X-Content-Type-Options` | `nosniff` *(Vorschlag)* | der Server liefert nur JSON; verhindert, dass ein Browser eine Fehlerseite als HTML deutet |

Auf Fehlerantworten **dieselben** CORS-Kopfzeilen wie auf Erfolgsantworten (§ 3 (d)).

---

## 5 · Frage 4 — Datensparsamkeit

**Grundsatz (Auftrag `KLASSENRAUM.md:49`):** „liefern **keine Klarnamen** — nur Platz-Kennungen“.
Durchgesetzt wird das **im Server**, nicht durch guten Willen (`lager.rs:4-6` sagt das schon so).

### 5.1 Erlaubte Felder — mehr nicht

| Feld | Pflicht | Typ | Länge | Zeichensatz | Normalisierung |
|---|---|---|---|---|---|
| `sitzung` | ja (POST, GET-Parameter) | Text | 1..16 | `A-Z a-z 0-9 -` (ASCII) | Großbuchstaben |
| `platz` | ja (POST) | Text | 1..16 | `A-Z a-z 0-9 -` | Großbuchstaben |
| `sterne` | ja (POST) | Ganzzahl | 0..5 | — | keine |
| `dauerS` | ja (POST) | Ganzzahl | 0..86400 | — | keine |
| `code` | ja (POST) | Text | 1..24 | `A-Z a-z 0-9 -` | Großbuchstaben |
| `eingegangenS` | nein, **nur Server** | Ganzzahl | ≥ 0 | — | Serveruhr (`lager.rs:143-146`) |

Als Muster in einem Satz, wie vorgeschlagen und hier bestätigt:

```
^(sitzung|platz)$ = ^[A-Z0-9-]{1,16}$     (nach Großschreibung)
^code$             = ^[A-Z0-9-]{1,24}$
sterne            = Ganzzahl 0..5
dauerS            = Ganzzahl 0..86400
```

Praktisch prüft der Server also **`^[A-Za-z0-9-]{1,16}$`** und schreibt dann groß; `{1..}` aus dem
Vorschlag wird zu **{1,16}**, weil ein unbegrenztes Feld ein Angriffsweg ist und 16 Zeichen für
`NL-4F7K` und `P3` mit sehr viel Luft reichen (das Codeformat des Auftrags: zwei Gruppen, höchstens
10 Zeichen, `KLASSENRAUM.md:37`, `:69`).

### 5.2 Verbotene Felder — Abweisung, nicht Schweigen

- **Unbekannte Felder im Rumpf → `400 {fehler:"feld",feld:"<name>"}`.** Nicht ignorieren:
  Ein Client, der versehentlich `{"name":"Anna"}` schickt, muss es **merken**. Das ist die einzige
  Stelle, an der der Vertrag strenger ist als „sein lassen“ — und der Grund, warum C2 hier
  nachziehen muss (heute liest `lager.rs` nur bekannte Felder, es gibt noch keine Rumpfprüfung).
- Ausdrücklich verboten und **nie** gespeichert oder beantwortet: Klarname, Spielername,
  Klassencode/Zeugnisnummer, E-Mail, Gerätekennung, Sitzungs-Kennung des Spielstands,
  Dateipfade, Standortdaten.
- **IP-Adresse:** wird nicht gespeichert und nicht protokolliert (`lager.rs:4-6`). Sie steht
  technisch unvermeidlich in der TCP-Verbindung; das Lager kennt sie nicht. `list` gibt sie nicht
  heraus.
- **Kein `User-Agent`-Auswerten, kein Zählen von Aufrufen je Herkunft** — sonst entsteht genau die
  Fortschritts-/Verhaltensspur, die `KLASSENRAUM.md:7` ausschließt.
- **Keine freien Textfelder** — es gibt in diesem Vertrag **kein** Feld, das beliebigen Text
  aufnimmt. Das ist die stärkste Datensparsamkeits-Maßnahme: wo kein Textfeld ist, kann kein Name
  hineingeraten.
- **Nicht in der Antwort:** `sitzung` je Eintrag (steht außen), keine Liste fremder Sitzungen auf
  `GET /liste` (Pflichtparameter, § 4.1). Die Ablagedatei führt nur die Sitzung je Eintrag
  (`lager.rs:112-119`) — das ist nötig, um die Datei nach einem Neustart wieder zuordenbar zu machen.

### 5.3 Grenzen des Lagers

- Höchstens **4096** Einträge (`lager.rs:16`), danach **409** für neue Codes (§ 4.4).
- Ein Eintrag ist höchstens ~120 Bytes JSON; 4096 Einträge ≈ 0,5 MB. Der Server hält sie im
  Speicher und schreibt die Ablagedatei atomar (`lager.rs:125-140`: `.tmp` schreiben, dann
  `rename`) — Format `{"format":"klassenraum-ablage","v":1,"ergebnisse":[…]}` (`lager.rs:127-131`).
- **Abgelegt wird neben dem Binary** (`tools/klassenraum/…`) bzw. — für C1 — im Datenordner des
  Programms, den `plattform_info` schon nennt (`fenster.rs:471` `"datenordner"`, gespeist aus
  `speicher.rs`/`main.rs:171`). Beide Bauformen brauchen **denselben** Dateinamen, damit der
  Wechsel C1 ↔ C2 das Lager nicht zerreißt: `klassenraum-ablage.json`. Für C1 bedeutet das
  ausdrücklich **nicht** den Spielstand: die Sitzung liegt laut Auftrag im `store`-Schlüssel
  `"klassenraum"` (`KLASSENRAUM.md:40`), nicht im Spielstand — und der Live-Server darf den
  `store` nicht anfassen (der `store` schreibt 1500 ms entprellt, `src/kern/basis.js:61-66`,
  `:82`; ein Server, der darauf wartet, wäre unerwartet langsam).

---

## 6 · Frage 5 — Grenzen (Rumpf, Köpfe, Zeit, Nebenläufigkeit)

| Grenze | Wert | Verhalten bei Überschreitung | Beleg/Herkunft |
|---|---|---|---|
| **Rumpf** | **4096 Bytes** | `Content-Length > 4096` → **413**, Rumpf wird nicht gelesen, `Connection: close` | Vorschlag des Auftrags, schon gebaut: `http.rs:21`, `:183-185` |
| **Anforderungszeile** | 8192 Bytes | **414** (C2 heute: 431, `http.rs:121` — siehe § 12, offener Punkt 3) | `http.rs:15` |
| **einzelne Kopfzeile** | 4096 Bytes | **431** | `http.rs:17`, `:120-122` |
| **Zahl der Kopfzeilen** | 40 | **431** | `http.rs:19`, `:170-172` |
| **Zeitlimit je Verbindung** | **5 s** Lese- und Schreibzeitlimit, gesetzt beim Annehmen | Verbindung wird geschlossen; ein noch nicht begonnener Antwortkopf wird als **408** versucht, danach still | Vorschlag des Auftrags, gebaut: `http.rs:22-23`, `:138-140` |
| **Nebenläufigkeit** | **1 Thread je Verbindung**, Obergrenze **8 gleichzeitig**; Annahmeschlange (`listen(backlog)`) **16** | über 8: **503** + `Retry-After: 1`, keine stille Warteschlange; über die Schlange hinaus weist das Betriebssystem ab (Verbindung kommt nicht zustande → in der Oberfläche wie „nicht erreichbar“, also kein Fehlerdialog) | neu festgelegt; C2 hat noch keine Annahmeschleife (`main.rs` fehlt) |
| **Kopfdauer** | Der Server darf **nie** ohne Zeitlimit auf einen Rumpf warten | `read_exact` mit 5-s-Zeitlimit → sonst 408/close | `http.rs:138-139` |

**Warum 5 s und 8 Plätze:** Ein Klassensatz ist 30–40 Geräte; jede Abgabe ist eine Anfrage von
wenigen hundert Bytes. 8 gleichzeitige Verbindungen mit `Connection: close` und einem
Millisekunden-JSON sind reichlich; die Grenze existiert, damit ein hängender Client (halboffene
Verbindung, Klassenzimmer-WLAN) nicht unbegrenzt Threads erzeugt. **4096** ist die Grenze, bei der
ein normaler Rumpf (≈ 90 Bytes) um den Faktor 45 Luft hat und ein Angriff keinen Sinn mehr ergibt.

---

## 7 · Frage 6 — Bind-Adresse: `127.0.0.1` oder `0.0.0.0`?

**Festlegung: `0.0.0.0:<port>`** — also auf allen Schnittstellen, **aber** nur, wenn der Lehrer den
Server in den Einstellungen einschaltet (Standard **aus**, `KLASSENRAUM.md:46`).

**Begründung aus dem Auftrag:** Der Zweck der Stufe C ist, dass „auf jedem Gerät derselbe Auftrag“
entsteht und die Ergebnisse **live** zusammenlaufen (`KLASSENRAUM.md:3`, `:45-47`). Die
Schülerrechner stehen im **Klassenraum-LAN** und müssen den Lehrer-Rechner erreichen. Mit
`127.0.0.1` erreicht **nur der Lehrer-Rechner selbst** den Server — die Live-Stufe wäre dann ein
Selbstgespräch, und der Auftrag würde in genau dem Punkt verfehlt, für den er gebaut wird.
`0.0.0.0` ist deshalb nicht Bequemlichkeit, sondern die einzige Adresse, die den Auftrag erfüllt.
Für Tests auf einem Rechner (und für „ich will nur mal sehen“) bleibt `127.0.0.1:<port>` als
**Schalter** möglich (Umgebungsvariable `KLASSENRAUM_NUR_LOKAL=1`) — dann funktioniert die
Live-Stufe aber erwartungsgemäß nur im selben Rechner, und das muss die Oberfläche sagen.

**Die Sicherheitsfolge, ehrlich und ohne Beschönigung:**

1. **Keine Anmeldung, kein Kennwort, keine Verschlüsselung.** Wer im LAN den Port kennt, darf
   **lesen** (`GET /liste`) und **schreiben** (`POST /ergebnis`). Der einzige „Schlüssel“ ist der
   Sitzungscode — und der steht absichtlich groß an der Tafel (`KLASSENRAUM.md:43`). Er schützt
   nichts; er ordnet nur zu.
2. **Kein TLS.** Der Verkehr ist im Klartext; im Schul-WLAN kann ihn jeder im selben Netz
   mitlesen. Inhalt: Platzkennungen, Sterne, Dauer. Kein Personenbezug (§ 5), deshalb ist das
   vertretbar — aber es ist eine Eigenschaft, die im Hinweis an den Lehrer stehen muss.
3. **`Access-Control-Allow-Origin: *` schützt nicht.** CORS ist keine Zugangskontrolle: `POST`
   ohne Preflight (einfache Anfrage) wird von einer fremden Seite im selben Browser **gesendet**,
   nur die *Antwort* bleibt ihr verborgen. Wer wirklich Schaden will, schreibt mit `curl`. Der
   Server ist also gegen „jeder im LAN darf schreiben“ **nicht** verteidigt — das ist der bewusste
   Preis für „keine Konten, keine Anmeldung“ (`KLASSENRAUM.md:7`, `:66`).
4. **Was der Entwurf trotzdem tut:** nur zwei Pfade (`404` sonst, § 4.4), nur fünf Felder
   (§ 5.1), 4096 Bytes, 4096 Einträge, 8 Verbindungen, 5 s, kein Dateizugriff über HTTP, keine
   Auskunft über die Umgebung (keine Version, kein Pfad, kein Hostname in der Antwort), kein
   Protokoll mit IP-Adressen.
5. **Windows-Firewall:** Beim ersten Start fragt Windows (`.exe`) bzw. das Binary nach der Freigabe
   für **private Netze**. Das ist erwartet und muss im Hinweis stehen (`KLASSENRAUM.md:46`).
   **Wichtig:** Die Tauri-Bündelung erzeugt hier nur `deb`/`appimage`
   (`shell/src-tauri/tauri.conf.json:18` `"targets": ["deb", "appimage"]`) — für die Windows-`.exe`
   wird ausdrücklich `--no-bundle` gebaut (`docs/Bauen.md:213`, `:31`). Es gibt also **keine**
   Installer-Regel, die die Firewall-Freigabe vorwegnimmt; die Abfrage kommt bei jedem neuen
   Binary erneut. Das ist in der Oberfläche als **ehrlicher Hinweis** zu zeigen (Auftrag), und die
   Live-Stufe darf **nicht** davon abhängen (Rückfall: Codes eintippen).
6. **Empfehlung für die Oberfläche:** Beim Einschalten einen Satz zeigen, der beides nennt —
   „Der Server ist jetzt für alle Geräte im Klassennetz erreichbar. Er hat keine Anmeldung:
   wer die Adresse kennt, kann Ergebnisse sehen und eintragen. Schalte ihn nach der Stunde aus.“
   Und danach **keine** weitere Warnung (der Auftrag verbietet Fehlermeldungen für „nicht
   erreichbar“, nicht für das Einschalten).

---

## 8 · Frage 7 — Portwahl und Erkennung

### 8.1 Vorgabeport: **8780**

**Warum genau diese Zahl:**

- **> 1024:** Ports unter 1024 sind unter Windows/Linux bevorzugt; ein Programm ohne
  Administratorrechte darf sie nicht binden. Der Server muss aber „einfach so“ starten.
- **unterhalb des Windows-Ephemeralbereichs:** `netsh int ipv4 show dynamicport tcp` in dieser
  Sitzung (gemessen): **Startport 49152, Anzahl 16384** → der Bereich ist **49152–65535**. Ein
  Serverport darin würde mit den Quellports eigener ausgehender Verbindungen kollidieren (dann
  scheitert mal der Serverstart, mal eine ausgehende Verbindung — unangenehm schwer zu erklären).
  Mit 8780 liegt der Server weit darunter und weit über 1024. Im IANA-Bereich „User Ports“
  (1024–49151) ist 8780 nicht als bekannter Dienst vergeben — **nicht geprüft**, sondern aus der
  Bereichslogik abgeleitet; die Prüfung ist ein Befehl (`netstat -ano | findstr :8780`), der beim
  ersten Bau zu wiederholen ist.
- Merkbar und vorlesbar: „acht-sieben-acht-null“.

### 8.2 Scanbereich: **10 Ports, 8780–8789**

Der Server bindet den **ersten freien** Port aus diesem Bereich (`TcpListener::bind` der Reihe nach,
`AddrInUse` → nächster). Damit sind zwei Fälle abgedeckt, die es wirklich gibt: eine alte Instanz
läuft noch (Tray, zweiter Start) oder ein Port ist belegt. Nach dem zehnten Port startet der
Server **nicht**, sondern schreibt eine Zeile in sein Protokoll — ohne Dialog (er läuft als
Hintergrundprozess).

### 8.3 Zeitlimit der Erkennung: **400 ms je Port, alle Ports gleichzeitig**

Die Oberfläche klopft **parallel** an alle zehn Ports (nicht nacheinander), jeder Versuch mit
eigenem `AbortController` und 400 ms. Gesamtdauer damit ~400 ms, nicht 4 s. Gewählt wurde der
untere Rand des vom Auftrag vorgeschlagenen Fensters (400–800 ms): im LAN antwortet ein
JavaScript-Server in unter 5 ms; 400 ms sind 80-fache Reserve und halten den Spielstart flott.

### 8.4 Woran die Oberfläche den Server erkennt (ohne Fehlermeldung)

**Keine Portsondierung mit TCP-Mitteln** (aus dem Browser gibt es kein „ist der Port offen?“, und
ein `fetch` auf einen *fremden* Dienst darf nicht als Treffer gelten). Deshalb:

1. Anfrage: `GET /liste?sitzung=<eigene Sitzung>` auf `http://<lehreradresse>:<port>`.
2. **Treffer ist nur**, wenn **alle drei** zutreffen:
   - HTTP-Status `200`,
   - Antwort ist gültiges JSON **und** `art === "liste"`,
   - `ergebnisse` ist eine Liste **und** jeder Eintrag hat `platz`, `sterne`, `dauerS`
     (die Pflichtfelder aus § 4.1).
3. Erster Treffer in aufsteigender Reihenfolge (8780 zuerst) gewinnt und wird **gemerkt**
   (im Speicher, nicht im Spielstand; Befristung 30 s).
4. Danach wird bei jeder Live-Aktion nur noch dieser Port benutzt; scheitert die Anfrage
   (Timeout/Netzfehler), läuft **genau einmal** ein leiser Nachscan, danach ist der Server für
   30 s „nicht da“.
5. Der Scan läuft **einmal beim Öffnen der Lehreransicht** und danach nur auf ausdrückliche
   Handlung („Server suchen“) — nicht im Hintergrundintervall. Ein Dauerpoller wäre Last ohne
   Nutzen und würde im Schul-WLAN auffallen.

**Kosten und Nebenwirkung:** Zehn Anfragen, davon neun Fehlschläge, stehen als Fehlversuche in der
Netzwerk-Konsole des Browsers (rote Zeilen, die der Browser nicht abschaltbar macht). Der Auftrag
verlangt „keine Fehlermeldung“ **in der Oberfläche** — das ist erfüllt; die Konsole ist kein Teil
der Oberfläche. Das gehört in den Bericht, damit es niemanden überrascht.

### 8.5 Adresse des Lehrer-Rechners — die offene Flanke, klar benannt

Der Browser darf die **eigene** LAN-Adresse nicht auslesen (und die des Lehrers schon gar nicht),
und der Auftrag will den QR-Code **ohne Adresse** (`KLASSENRAUM.md:50`: „Der QR-Inhalt ist genau
der Auftragscode (kein Link, keine Adresse, kein Konto)“). `plattform_info` liefert heute
**keine** Adresse: `shell/src-tauri/src/fenster.rs:469-473` gibt `os`, `sitzung`, `version`,
`datenordner`, `test`, `selbsttest`, `kann`, `gruende` heraus — kein Netzwerk. Daraus folgt
zwingend: **C1 muss die Adresse selbst ermitteln und anzeigen** (eine UDP-„Verbindung“ zu
10.255.255.255 legt die lokale Absenderadresse offen, ohne ein Paket zu senden; C2 genauso), und
die Oberfläche zeigt sie dem Lehrer groß neben dem Auftragscode („Schüler öffnen
`http://192.168.1.23:8780`“). Die Schüleradresse wird **einmal** von Hand eingetippt und für die
Sitzung gemerkt (`store`-Schlüssel `"klassenraum"`, `KLASSENRAUM.md:40`) — oder sie kommt aus einem
Vorschlag, den der Lehrer ansagt. Eine automatische Erkennung über einen Rundruf (UDP-Broadcast)
ist **möglich, aber nicht Teil dieses Entwurfs** (sie wäre ein eigener Punkt; das Fenster
„Netzwerk-Bibliothek“ der Standardbibliothek ist da, ein Broadcast-Server wäre aber neu).

---

## 9 · Frage 8 — Verhalten ohne Server

**Festlegung: das Spiel läuft ohne Server normal weiter. Es gibt keine Fehlermeldung, keinen
Hinweisbalken, keinen roten Punkt, kein blockierendes Warten.**

- **Wie die Oberfläche es merkt:** `fetch` mit `AbortController` je Anfrage, Frist **600 ms**
  (Innerhalb des vorgeschlagenen Fensters 400–800 ms; 600 ms ist reserviert genug für ein müdes
  Schul-WLAN und zu kurz für ein spürbares Hängen). Der Fristablauf ruft `controller.abort()`,
  der `catch`-Zweig ist der Normalfall „kein Server“ — **derselbe** Zweig wie bei
  `ECONNREFUSED`/`Failed to fetch`, damit es genau einen Ort gibt, an dem „nichts“ passiert.
  `AbortSignal.timeout(600)` wäre kürzer, ist aber in älteren WebView2/Android-WebViews nicht
  überall vorhanden — deshalb die Schreibweise mit eigenem Controller.
- **Was die Oberfläche stattdessen tut:** sie benutzt den lokalen Weg (Stufe B: Ergebniscodes
  eintippen, `KLASSENRAUM.md:48`). Sichtbarer Zustand: keine Änderung. Wer vorher schon
  Ergebnisse abgegeben hat, sieht sie weiter — die Anzeige kommt aus der Sitzung im `store`
  (`"klassenraum"`), nicht aus dem Netz.
- **Höchstens ein Ort zeigt die Wahrheit:** in den **Einstellungen** darf der Zustand einmal
  stehen („Live-Server: nicht erreichbar“ — als Zeile, ohne Dialog). Im Spiel- und
  Lehrerfenster steht er **nicht**. Diese Regel ist der Grund, warum die Erkennung
  (Treffererkennung § 8.4) so streng ist: nur ein echter Treffer schaltet Live-Funktionen ein,
  und ein Fehlschlag schaltet sie still wieder aus.
- **Kein `console.error`, kein `window.onerror`-Beitrag** im Fehlerfall — sonst füllt die
  Fehlerliste des Selbsttests sich mit Rauschen (`plattform-tauri.js:29-42` sammelt
  `error`/`unhandledrejection` und meldet sie in den Selbsttest).
- **Kein Wiederholen im Hintergrund.** Jede Live-Handlung ist ein einzelner Versuch; erst die
  nächste Handlung versucht es erneut.
- **Schreibversuch ohne Server:** `POST /ergebnis` scheitert still; der Ergebniscode bleibt
  sichtbar und wird lokal eingetragen (die Sitzung im `store` ist die Wahrheit, der Server ist
  eine Beschleunigung). Damit ist die Ampel **nie** vom Server abhängig — genau die Zusage aus
  `KLASSENRAUM.md:48`.

---

## 10 · Frage 9 — Was macht die Oberfläche, wenn zwei Server laufen (C1 und C2)?

**Lage:** Der Lehrer-Rechner kann beide Formen gleichzeitig laufen haben (die `.exe` mit
eingeschaltetem Server **und** das Binary `klassenraum.exe` aus `tools/klassenraum/`). Aus dem
Browser ist **nicht** unterscheidbar, *wer* auf einem Port antwortet — nur, *dass* jemand
antwortet (Web-Schnittstellen kennen keinen Prozessnamen).

**Festlegungen:**

1. **Reihenfolge: aufsteigend nach Port, 8780 zuerst.** Der erste Port mit einem gültigen
   `/liste` (§ 8.4) gewinnt. Kein Zufall, keine zweite Runde, kein Umschalten während einer
   laufenden Abfrage.
2. **Kollision ist auf demselben Port ausgeschlossen** — beide Formen binden nach *derselben*
   Regel (§ 8.2): der zweite bekommt `AddrInUse` und nimmt den nächsten freien Port. Sie können
   sich also nur auf **verschiedene** Ports setzen, nie auf denselben.
3. **Erkennungsmerkmal, damit der Mensch es weiß:** jede `/liste`-Antwort trägt
   `"quelle":"c1"|"c2"` (Zusatzfeld neben `art`; C1 setzt `"c1"`, C2 `"c2"`). Die Oberfläche kann
   damit in den Einstellungen eine Zeile zeigen: „Live-Server: an (Programm, Port 8780)“ oder
   „(eigenständig, Port 8781)“.
4. **Wenn beide laufen, gilt der niedrigere Port** — praktisch also fast immer C1 (die `.exe`
   bindet zuerst, wenn sie zuerst gestartet wurde; startet das Binary zuerst, ist es C2). Ein
   automatisches Bevorzugen von C1 wäre eine Lüge gegenüber der Wirklichkeit (die Oberfläche
   *kann* es nicht feststellen, ohne beide Ports abzufragen): sie fragt **alle** Ports im Scan ab
   und darf dann aus dem `quelle`-Feld **C1 bevorzugen** — das ist die eine Ausnahme von der
   Reihenfolge und ausdrücklich erlaubt, weil sie auf einer belegten Angabe beruht, nicht auf
   einer Vermutung. Sie schaltet aber **nicht** mitten in einer Sitzung um: erst der nächste
   Scan (30-s-Frist oder „Server suchen“).
5. **Kein Fehler bei zwei Servern, keine Warnung.** Zwei Server sind kein Defekt, sondern der
   dokumentierte Rückfallweg (`KLASSENRAUM.md:47`: „als Rückfall, wenn die Firewall die .exe
   nicht durchlässt“). Es wird nichts gemeldet.
6. **Zwei Lager, zwei Wahrheiten — die ehrliche Folge:** C1 und C2 haben **je eine eigene
   Ablagedatei** (§ 5.3). Wer auf C1 abgibt und später C2 fragt, sieht nur C2s Einträge. Deshalb:
   – die Oberfläche fragt **immer nur einen** Server ab (den gewählten), nie beide und addiert
     nichts; – der Lehrer kann in den Einstellungen **eine** Zeile sehen, welcher Server antwortet,
   damit „warum fehlen Ergebnisse?“ eine Antwort hat; – für die Vorführung (`KLASSENRAUM.md:52-57`)
   wird **einer** der beiden empfohlen (C1), der andere bleibt der Rückfall. Ein Zusammenführen
   zweier Lager ist **nicht** Teil dieses Entwurfs (offener Punkt 4, § 12).
7. **Zwei Lehrer, ein WLAN:** Starten zwei Lehrerrechner ihren Server auf 8780, könnten
   Schülerrechner beim falschen landen. Dagegen wirkt schon der Vertrag, wenn die Oberfläche
   **nur die eigene Sitzung** anzeigt: die Fremdliste hat `anzahl: 0` für die eigene Sitzung
   (§ 4.1, Pflichtparameter) — der Schüler sieht keinen fremden Eintrag. Ein falsch adressierter
   Schreibvorgang landet dagegen im fremden Lager (er wird dort als fremde Sitzung geführt; das
   ist der Preis der fehlenden Anmeldung, § 7) — die Oberfläche erfährt davon nichts, weil sie
   keine Fehlermeldung zeigt. Dieser Punkt wird im Bericht genannt, nicht behoben.

---

## 11 · Prüfliste für die Umsetzung (C1 und C2)

**Gemeinsam (Vertrag):**

- [ ] Zwei Pfade, keine dritten: `/liste` (GET, OPTIONS), `/ergebnis` (POST, OPTIONS); alles andere 404.
- [ ] Antwortformen aus § 4.1/4.2/4.3, Statuscodes aus § 4.4, Kopfzeilen aus § 4.5.
- [ ] Grenzen aus § 6, Bind aus § 7, Portlogik aus § 8.2, kein Server = kein Fehler (§ 9).
- [ ] Nur fünf Felder (§ 5.1), unbekannte Felder abweisen, nichts anderes speichern (§ 5.2).
- [ ] `quelle` in jeder `/liste`-Antwort (`"c1"`/`"c2"`), `art` auf beiden Endpunkten.

**C2 (`tools/klassenraum/`) muss geändert werden:**

| Was | Heute | Vertrag |
|---|---|---|
| `src/main.rs` | **fehlt**, `Cargo.toml:10` zeigt darauf | Annahmeschleife, 8 Verbindungen, Verteilung auf `http.rs`/`lager.rs`, Portwahl 8780–8789, `0.0.0.0`, Adressanzeige |
| `Access-Control-Max-Age` | `600` (`http.rs:216`) | `60` (§ 4.5) |
| `GET /liste` | `sitzung` optional (`http.rs:48-59`; `lager.rs:88-93` liefert ohne Filter alles) | `sitzung` Pflicht → sonst 400; ohne Filter **nie** fremde Kennungen ausgeben |
| Antwortformen | freie Objekte beim Aufrufer | `art`, `anzahl`, `moeglich`, `jetztS`, `quelle`, Fehlerform § 4.3 |
| Rumpfprüfung | keine (nur JSON-Lesen) | Pflicht-/Längen-/Zeichensatzprüfung, unbekannte Felder → 400, `Content-Type`-Prüfung → 415 |
| Status 409 | nicht vorhanden (`lager.rs:79-81` liefert nur `Err(String)`) | 409 mit `{fehler:"voll"}` |
| Nebenläufigkeit | keine Annahmeschleife | 8 gleichzeitig, darüber 503 + `Retry-After: 1` |
| Anforderungszeile zu groß | 431 (`http.rs:121`) | 414 |
| Rumpf zu groß | 413 vor dem Lesen (`http.rs:183-185`) | unverändert (gut) |

**C1 (`shell/src-tauri/src/klassenraum.rs`, neu) muss liefern:**

- [ ] denselben Vertrag, **ohne** neue Abhängigkeit (Rumpf/Köpfe/Threads aus der
      Standardbibliothek; die Netz-Kisten `axum`/`hyper`/`tokio` liegen zwar im Kistenlager
      dieser Umgebung, sind aber **kein** Teil des Tauri-Baums und `cargo fetch` scheitert,
      `docs/entwicklung/Klassenraum – Umsetzungsreife Spezifikation.md:33`).
- [ ] Einschalten in den Einstellungen (Standard **aus**), Zustand über `plattform_info`/`kann`
      melden (`fenster.rs:443-473` ist die Stelle), Firewall-Hinweis (§ 7 Punkt 5).
- [ ] Server-Thread darf den `store` **nicht** anfassen (§ 5.3); Sitzung bleibt im
      `store`-Schlüssel `"klassenraum"` (`KLASSENRAUM.md:40`), Lager in einer eigenen Datei.
- [ ] Beim Beenden des Programms: Annahmeschleife schließen (`fenster.rs` hat die
      Beenden-Wege schon; `plattform-tauri.js:22-24` ruft `invoke("beenden")`).

**Oberfläche (Bereich B) braucht aus diesem Entwurf:**

- [ ] Scan/Timeout/Zustandsregeln aus § 8.3/8.4/§ 9, kein Fehlerdialog, ein Ort für den Zustand.
- [ ] Adressanzeige für Schüler (§ 8.5) und die `quelle`-Zeile (§ 10 Punkt 3).

---

## 12 · Offene Punkte (ehrlich, nicht versteckt)

1. **Adressermittlung des Lehrer-Rechners** (§ 8.5) ist entworfen, aber nicht in Code belegt:
   `plattform_info` liefert heute keine Adresse (`fenster.rs:469-473`). Ohne sie ist Stufe C im
   LAN nicht benutzbar. Der UDP-Kniff ist ein Vorschlag, **nicht gemessen**.
2. **Doppelte Einträge desselben Platzes:** Idempotenz gilt nur über den Code (`lager.rs:74-78`).
   Zwei Lösungen desselben Platzes mit verschiedener Dauer ergeben zwei Einträge. Der Auftrag
   verlangt genau diese Idempotenz (`KLASSENRAUM.md:44`: „Doppelte Codes werden erkannt und nicht
   doppelt gezählt“) — die Folge (Ampel zählt 2/1) ist im Bericht zu nennen; eine Regel
   „je Platz der beste Eintrag“ wäre eine **Änderung des Auftrags** und ist hier **nicht** verfügt.
3. **414 gegen 431** für die zu lange Anforderungszeile: der bestehende C2-Code liefert 431
   (`http.rs:121`), dieser Entwurf sagt 414 (die Anforderungszeile ist keine Kopfzeile). Eine der
   beiden Stellen muss nachziehen — die kleinere Änderung ist, den Entwurf auf **431** zu setzen.
   Entscheidung gehört in den Bericht, nicht in den Code beider Formen auseinanderlaufend.
4. **Zwei Lager** (C1 und C2) werden nicht zusammengeführt (§ 10 Punkt 6). Für die Vorführung
   reicht ein Server; ein Zusammenführen wäre ein eigener Auftrag.
5. **PNA-Politik** der Browser ändert sich (§ 3 (e)) — die Kopfzeile wird gesendet, aber ob
   GitHub Pages auf einem aktuellen Edge ohne Zusatzabfrage durchkommt, ist **nicht geprüft**.
6. **Port 8780 frei?** Auf diesem Rechner nicht geprüft (kein `netstat`-Lauf in dieser Sitzung).
   Erste Amtshandlung beim Bauen: `netstat -ano | findstr :878`.
7. **Kein `main.rs` in C2, kein `klassenraum.rs` in C1** — beide Bauformen sind nach diesem
   Entwurf zu bauen; der Vertrag ist damit vor dem Code da (`AGENTS.md`: „Vertrag zuerst“).

---

## 13 · Was in dieser Sitzung NICHT geprüft wurde

1. **Die Tauri-Origin am laufenden Programm.** Der Versuch, die `.exe` über `tools/cdp.py start`
   zu starten und `location.origin` auszulesen, ist **gescheitert**: „Programm meldet sich nicht
   auf dem Fernsteuerungs-Port“; es blieb kein Prozess zurück (gemessen: keine
   `Netzwerk-Labor.exe`, keine neue `msedgewebview2.exe`). Die Antwort in § 2 stützt sich deshalb
   **nur** auf den Quelltext von Tauri 2.12.0 und der Hülle.
2. **Kein einziger Browser-Messlauf.** Headless Edge 154.0.4258.53 bricht in dieser Umgebung ab
   (`FATAL:mojo\public\cpp\platform\platform_channel.cc:187 Check failed: Zugriff verweigert`,
   danach `OpenProcess: Zugriff verweigert`); die DevTools-Zeile erschien, der Prozess endete
   sofort. Ein Messskript für `Origin`, Preflight und PNA war geschrieben und lief nicht.
3. **`Origin: null` bei `file://`** ist damit **nicht gemessen**, sondern die bekannte
   Eigenschaft opaker Herkünfte. Die Messung ist mit einer Umgebung ohne Sandbox nachzuholen
   (Edge headless, `tools/cdp.py`-Muster); sie ist die Grundlage dafür, dass `*` und nicht
   Widerspiegeln festgelegt ist.
4. **Private Network Access im Detail** (ob `http://tauri.localhost` als lokal gilt, ob Edge 154
   überhaupt noch blockiert oder nur abfragt) — **nicht gemessen**, nur die Kopfzeilennamen sind
   aus `tower-http-0.6.11` belegt.
5. **Kein Serverlauf, kein Request gegen einen echten Endpunkt.** C2 ist nicht übersetzbar
   (`src/main.rs` fehlt), C1 existiert nicht. Alle Zahlen (4096, 5 s, 8, 8780–8789, 400/600 ms)
   sind **Festlegungen**, keine Messwerte.
6. **Der Windows-Ephemeralbereich ist gemessen** (`netsh int ipv4 show dynamicport tcp`:
   49152 + 16384), die Freiheit des Ports 8780 **nicht**.
7. **Schreibweise dieser Datei:** UTF-8, LF (so verlangt; `.gitattributes:3` `* text=auto eol=lf`
   gilt auch hier).

---

## 14 · Belegte Quellen (nur diese)

- `tools/auftraege/KLASSENRAUM.md:24-50` (Schnittstelle, Stufe C, Datensparsamkeit, Endpunkte)
- `src/plattform/plattform.js:1-37` (Kern kennt nur `Plattform`), `plattform-tauri.js:1-86`
  (Tauri-Weg, Fehlersammlung `:29-42`), `plattform-browser.js:1-64` (Browser-Weg, `localStorage`
  `:19-30` — kein Netz)
- `shell/src-tauri/tauri.conf.json:2-30` (`withGlobalTauri: true` `:10`, `frontendDist` `:7`,
  Bundle-Ziele `:18`, `csp: null` `:13`)
- `shell/src-tauri/src/main.rs:148` (Befehlsliste ohne Netz), `:171-185` (Initialisierungsskript,
  `WebviewUrl::App("index.html")` `:178`)
- `shell/src-tauri/src/fenster.rs:443-473` (`plattform_info`), `:469-473` (Felder ohne Adresse)
- `shell/src-tauri/Cargo.toml:15-32` (Abhängigkeiten: kein HTTP, kein Netz)
- `docs/Bauen.md:17-33` (Bauwege, `--no-bundle`), `:35-51` (Einzeldatei), `:208-231` (`.exe`, APK)
- `tools/starttest.py:41` (`docs/index.html`), `:195-225` (`file://`-Last), `:265`
- `src/kern/basis.js:58-72` (`store`-Zusage, Entprellung), `:73-132` (`store.get/set`),
  `:137-147` (Frühstart), `:41-56` (deterministischer Zufall)
- `src/spiel/zustand.js:84-90` (`Spiel.st`/`Spiel.einst`), `:104-118` (`SICHERUNG`), `:138-163`
- `tools/klassenraum/src/http.rs`, `src/json.rs`, `src/lager.rs`, `Cargo.toml` (Zeilennummern oben)
- `tauri-2.12.0/src/protocol/mod.rs:28-39`, `src/manager/mod.rs:334-359`, `:785-803`,
  `src/manager/webview.rs:455-500`, `src/app.rs:339-343`, `src/test/mod.rs:33-48`,
  `src/webview/mod.rs:2745-2748`
- `tower-http-0.6.11/src/cors/mod.rs:416`, `.../cors/allow_private_network.rs:8,66-67`
  (nur als Beleg für den Kopfzeilennamen)
- `README.md:24-25` (GitHub-Pages-Adresse, Einzeldatei-Download), `.gitattributes:1-3`
- Messungen dieser Sitzung: `git remote -v` (`https://github.com/Vexx-oss/NetLab.git`, Zweig
  `ausbau-1.2`), `netsh int ipv4 show dynamicport tcp` (49152/16384), Edge-Version
  `154.0.4258.53`, `git status --porcelain` (fünf unverfolgte Einträge, darunter
  `tools/klassenraum/` und `tools/klassenraum-probe/`)
