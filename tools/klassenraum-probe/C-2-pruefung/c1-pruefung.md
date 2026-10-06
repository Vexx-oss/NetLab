---
tags: [Netzwerk-Labor, Klassenraum, C1, Gegenprüfung]
erstellt: 2026-10-06
rolle: Gegenprüfer C1 (nicht der Autor)
geprüft: tools/klassenraum-probe/C-1-entwurf/c1-einbau.md (745 Zeilen)
status: Gegenprüfung abgeschlossen — 6 Befunde vor dem Einbau zwingend, 9 weitere Empfehlungen
---

# C1 · Gegenprüfung des Entwurfs `c1-einbau.md` gegen die Wirklichkeit

**Auftrag dieser Datei:** Prüfen, nicht bestätigen. Jede Aussage trägt `Datei:Zeile` aus **dieser**
Sitzung. Was ich nicht nachgelesen oder gemessen habe, steht als „nicht geprüft" da.

**Geschriebene Dateien in dieser Sitzung:** genau diese eine (`c1-pruefung.md`). Keine Änderung an
`shell/**`, `src/**`, `tests/**`, `bauen.py`, `.gitignore`, `docs/**`, bestehenden `tools/*.py`.
Kein `git commit/push/reset`, kein Zweigwechsel, kein Prozess beendet, nichts installiert.
`python tools/repo-verweise-flicken.py` **nicht** ausgeführt. `cargo build` in
`tools/klassenraum-probe/C-qr-rust` nicht angefasst (dort liegt nur `target/` von jemand anderem,
`tools/klassenraum-probe/C-qr-rust/target/release/C-qr-rust.exe`).

---

## 1 · Prüfschritte (Werkzeug und Befehl, alles in dieser Sitzung)

| # | Werkzeug/Befehl | Zweck |
|---|---|---|
| P1 | `read` (vollständig) `shell/src-tauri/src/main.rs` (202 Z.), `fenster.rs` (474 Z.), `tray.rs` (1–80), `capabilities/main.json`, `tauri.conf.json`, `Cargo.toml` | Zeilengenauigkeit des Entwurfs |
| P2 | `read` (vollständig) `tools/klassenraum/src/main.rs` (559 Z.), `http.rs` (299 Z.), `lager.rs` (190 Z.) | C2-Vertrag: Port, Pfade, Felder, Statuscodes, Falle |
| P3 | `read` `src/plattform/plattform-tauri.js` (86 Z.), `plattform-browser.js` (64 Z.), `src/ui/app.js` (Z. 255–374 + Kopf), `src/spiel/zustand.js` (Z. 1–40), `src/kern/basis.js` (Z. 1–100) | Plattform-/Oberflächenbehauptungen |
| P4 | `read` `tools/klassenraum-probe/C-1-entwurf/c2-endpunkte.md` (699 Z.) | zweites Vertragsdokument desselben Bereichs |
| P5 | `grep` (`*.json`, Pfad `shell/src-tauri`) nach `"speichern"\|"fenster_modus"\|…\|"selbsttest_ergebnis"` | Capabilities/Schemata |
| P6 | `grep` in `gen/schemas` nach `beenden\|speichern\|fenster_modus\|plattform_info\|selbsttest_ergebnis\|autostart_status` | dito, zweiter Lauf ohne Anführungszeichen |
| P7 | `grep` in `acl-manifests.json` nach den Manifest-Schlüsseln | dito |
| P8 | `powershell`: `ConvertFrom-Json` der `acl-manifests.json`, Dateigrößen aus `gen/schemas`, Teilstring-Zählung im `desktop-schema.json` | Zählungen unabhängig nachvollziehen |
| P9 | `powershell` + `python`: Bytes, `LF`, `CRLF`, BOM, Zeilenzahl von 16 Dateien | Zeilenenden und Zeilenzahlen |
| P10 | `powershell`: `Get-Item LastWriteTime`, `git rev-parse --abbrev-ref HEAD`, `git status --porcelain`, `.gitignore` | Stand und Alter der Quellen |
| P11 | `powershell`: `Select-String` in C2-`main.rs`/`http.rs` nach `1024`, `47112`, `set_nonblocking`, `192.0.2.1`, `WSAEWOULDBLOCK`, `ZEITLIMIT` … | genaue Zeilennummern der C2-Fallen |

**Bewusst nicht getan:** kein `cargo build`/`cargo test` (hätte `shell/src-tauri/target/` bzw. den
Quelltext geändert — beides außerhalb meines Auftrags), kein Start eines Servers, kein Netzaufruf.
Die Baubarkeit ist deshalb **statisch** geprüft (Signaturen, Makro-Muster), nicht durch Übersetzen.
Die genauen Zeilen aus P11 habe ich mit **beiden** Zählweisen geprüft (`read` und `Get-Content`) —
sie stimmen überein.

---

## 2 · Gefundene Fehler (nummeriert, mit Beleg)

### F1 — Der Entwurf ist älter als der Vertrag, den er spiegeln will (schwerster Befund)

`tools/klassenraum-probe/C-1-entwurf/c1-einbau.md` wurde **06.10.2026 23:21:35** geschrieben
(`Get-Item`), `tools/klassenraum/src/main.rs` **06.10.2026 23:45:20** — also **24 Minuten später**.
Der Entwurf behauptet in § 0 (Zeile 47): „`tools/klassenraum/src/main.rs` (**518 Zeilen**,
06.10.2026 23:19)". Die Datei hat heute **559 Zeilen** (P9: `LF=559`, letzte Zeile leer; `read`:
„total 559 lines"). Der Entwurf zitiert damit einen Stand, den es nicht mehr gibt.

**Wie sicher ist der Zeitschluss?** Die Uhrzeiten sind gemessen (P10), die **Deutung** ist es
nicht: Ein späterer Schreibvorgang kann Inhalt geändert haben, muss aber nicht. Was **ohne** die
Uhrzeiten trägt, ist die Zeilenzahl (518 gegen 559) und die Stichprobe in der Tabelle unten — dort
treffen mehrere Zitate um 24 bis 41 Zeilen daneben, was zu einer um 41 Zeilen gewachsenen Datei
passt. Sollte sich die Abweichung als reine Zeilenverschiebung ohne Bedeutungsänderung erweisen,
bleibt F1 trotzdem gültig: **die Belege des Entwurfs zeigen nicht auf die heutige Datei**.

Belegte Folgen dieser Alterung (jede Zeile einzeln nachgelesen):

| Entwurfsstelle | Behauptung | Wirklichkeit |
|---|---|---|
| `c1-einbau.md:229` | „identisch zu C2 (`tools/klassenraum/src/main.rs:34-36,207-220`)" | Die **Zeilen** stimmen (Konstante 34, Bereich 207-220 = nur `--port`), aber die **Namen** nicht: C2 heißt `VORGABE_PORT` (`main.rs:34`), nicht `PORT` |
| `c1-einbau.md:300` | „wie C2, `tools/klassenraum/src/main.rs:182-184`" (Ports unter 1024) | wirklich `main.rs:211-213` |
| `c1-einbau.md:461` | „Zeichensatzprüfung `:470-475`" | wirklich `pruefen` `main.rs:476-509`, Zeichensatz `gueltig` `main.rs:513-516` |
| `c1-einbau.md:194-195` | Zitat „Kein Zugriffsschutz …" aus `:14-15` | Text steht auf `main.rs:14-15` (stimmt), Datenregel aus `:12-14` steht auf `main.rs:12-13` |
| `c1-einbau.md:507` | Adressermittlung „wie in C2 (`:222-231`)" | Der zitierte **Satz** steht auf `main.rs:259-260`, die Funktion auf `:261-268` — die Zeilenangabe des Entwurfs trifft keine der beiden Stellen. Zieladresse ist `192.0.2.1:9` (`:263`), **nicht** der im Parallelentwurf genannte Rundruf zu `10.255.255.255` (`c2-endpunkte.md:485`) |
| `c1-einbau.md:718-720` | „Prüfungen aus C2 nachziehen (`:477-517`)" | Tests stehen in `main.rs:518-559` |

**Folge:** Der Entwurf ist inhaltlich nah dran, aber jede Zusage „wörtlich von dort übernommen" ist
gegen einen Stand gerichtet, der 41 Zeilen kürzer war. Vor dem Einbau muss § 4/§ 7 des Entwurfs
**neu** gegen `tools/klassenraum/src/*.rs` abgeglichen werden (das ist die eigentliche Empfehlung).

### F2 — Zwei Vertragsdokumente desselben Bereichs widersprechen sich, und der Entwurf merkt es nicht

`tools/klassenraum-probe/C-1-entwurf/c2-endpunkte.md` (23:27:17, also **nach** `c1-einbau.md`)
legt einen **anderen** Vertrag fest als die gebaute C2-Fassung, die `c1-einbau.md` zitiert:

| Punkt | `c2-endpunkte.md` | gebautes C2 (`tools/klassenraum/src/`) |
|---|---|---|
| Port | **8780–8789** (`:421`, `:437`) | **47112–47121** (`main.rs:34,36`) |
| Gleichzeitigkeit | **8**, darüber 503 + `Retry-After: 1` (`:359`) | **16**, darüber 503 + `Retry-After: 2` (`main.rs:38`, `main.rs:167`) |
| Erkennungsfeld | `art` (`:173`, `:202`), `quelle: "c1"\|"c2"` (`:544`) | `format` (`main.rs:396`, `main.rs:461`) — **kein** `quelle` |
| Lagervoll | **409** (`:250`, `:335`) | **507** (`main.rs:455`) |
| `GET /liste` ohne `sitzung` | **400** (Pflicht, `:164-168`) | **200**, ohne Filter alle Sitzungen (`main.rs:369-379`, `lager.rs:88-93`) |
| Felder je Eintrag | `eingegangenS` (`:173`) | `eingegangen` als ISO-Text (`main.rs:391`) |
| Zeitstempel | `jetztS`, `moeglich` (`:173`) | nicht vorhanden |
| Fehlerform | `{fehler, feld, grund}` (`:227`) | `{format, v, fehler}` bzw. `+feld` (`main.rs:349-364`) |
| Nebenläufigkeit | „C2 hat noch keine Annahmeschleife" (`:359`) | Annahmeschleife vorhanden (`main.rs:142-185`) |

`c1-einbau.md` nennt `c2-endpunkte.md` **nirgends** (keine Zeile). Der Leiter will C1 und C2
austauschbar halten — solange zwei Papiere und der Code drei Fassungen des Vertrags sind, ist das
nicht erreichbar. Das ist eine **Entscheidung des Leiters**, kein Codefehler.

### F3 — Der Annahme-Faden kann so nicht übersetzen (`http_antworten` gibt es nicht, und die Parameterzahl stimmt nicht)

`c1-einbau.md:316-318` ruft
`http_antworten(&mut s, 503, "Service Unavailable", &fehler_json(…), false, &[("Retry-After", "2")])`
— sechs Argumente, ohne Inhaltstyp. Die reale Funktion ist
`pub fn antworten(strom, status, grund, typ, rumpf, cors, extra)` (`tools/klassenraum/src/http.rs:239-247`)
mit **sieben** Parametern; die 503-Antwort in C2 übergibt ausdrücklich
`"application/json; charset=utf-8"` (`tools/klassenraum/src/main.rs:160-168`). Mit der Signatur aus
`http.rs:239-247` fehlt dem Aufruf ein Argument → **Übersetzungsfehler**. `http_antworten` und
`fehler_json` sind außerdem nirgends in `c1-einbau.md` definiert (nur benutzt: `:316`, `:317`).

### F4 — Die im Bereich C **gemessene** Windows-Falle fehlt im Entwurf (genau der Punkt aus der Aufgabe)

Die Falle steht wörtlich im gebauten C2:

* `tools/klassenraum/src/http.rs:147-153`: „WICHTIG (gemessen am 06.10.2026): Auf Windows erbt ein
  von `accept()` gelieferter Socket den Nicht-Blockier-Modus des Horchers … sonst scheitert jedes
  Lesen … mit WSAEWOULDBLOCK (os error 10035)" → `let _ = strom.set_nonblocking(false);`
* zweiter, ebenso gemessener Teil: vor der Abweisung muss die Anfrage **gelesen** werden, sonst
  schickt Windows ein RST und der Client sieht gar keine Antwort
  (`tools/klassenraum/src/main.rs:149-158`; Kommentar „gemessen am 06.10.2026: curl meldete 000 statt 503").

**Im Entwurf:** `set_nonblocking(true)` steht nur auf dem **Horcher** (`c1-einbau.md:282`) und wird
in § 3.4 als Voraussetzung für das Abbruchflag begründet (`:360-361`). Ein `set_nonblocking(false)`
auf dem **angenommenen** Socket kommt in der ganzen Datei **nicht** vor (keine Zeile). Die
503-Abweisung in § 3.4 liest die Anfrage nicht (`:313-320`) — sie schreibt sofort und schließt.
Damit würde C1 auf Windows (dem einzigen System, auf dem die `.exe` laut Auftrag zählt,
`KLASSENRAUM.md:46`) genau die zwei Fehler wiederholen, die C2 schon gemessen und behoben hat.
**Das ist der zentrale inhaltliche Befund.**

### F5 — Die vorgeschlagene Schnittstelle ist in sich widersprüchlich (drei Fassungen derselben Funktion)

| Stelle | Was dort steht |
|---|---|
| `c1-einbau.md:132` (§ 1.4) | `klassenraum::stoppen();` — Rückgabewert wird verworfen |
| `c1-einbau.md:294` (§ 3.3) | `Ok(status_json())` — Rückgabe ist JSON, `status_json` **nicht definiert** |
| `c1-einbau.md:397-398` (§ 4.1) | `let kr = crate::klassenraum::status(); setze("klassenraum", kr.an, kr.grund.as_deref());` |
| `c1-einbau.md:409` (§ 4.2) | `status()` liefert `struct KlassenraumInfo { an: bool, grund: Option<String> }` |
| `c1-einbau.md:488` (§ 6.1) | „**Rückgabe (Zustand), beide Befehle, identisch**" — das Zustands-JSON aus `:490-503` |
| `c1-einbau.md:526` (§ 6.2) | `klassenraum: (an, o) => invoke("klassenraum_server", {an: !!an, …})`, Argument `nurLokal` (`:482`) |
| `c1-einbau.md:257` (§ 3.3) | `fn starten(an: bool, port: Option<u16>, nur_lokal: Option<bool>, sitzung: Option<String>, ablage: Option<PathBuf>, anzahl: Arc<AtomicUsize>)` |

Vier Widersprüche auf einmal: (a) `stoppen`/`stoppen_intern`/`status`/`status_json` sind vier Namen,
von denen zwei nie definiert werden; (b) `status()` soll `KlassenraumInfo` liefern, während beide
Befehle laut § 6.1 das Zustands-JSON liefern sollen — `klassenraum::status()` in `fenster::info`
(`fenster.rs:444-473`) kann nicht beides sein; (c) § 6.1/§ 6.2 versprechen eine
Befehlsunterschrift `(an, port, nurLokal, sitzung, ablage)`, § 3.3 zeigt eine andere
(`anzahl: Arc<AtomicUsize>` als Parameter, `sitzung`/`ablage` als `Option`); (d) § 8.2 (`:510`)
nennt Fehler als `Result<Value, String>`, § 6.1 (`:510-512`) beschreibt die Oberfläche, die den Text
aus `err.message` liest — das passt, aber nur wenn der Befehl wirklich `Result` liefert und nicht
`Value`.

### F6 — Der Verbindungszähler im gezeigten Code zählt nie herunter

`c1-einbau.md:308-309`: `let mut aktiv: usize = 0;` — eine **lokale** Variable im Annahme-Faden.
In `:321` wird sie erhöht, ein Herunterzählen gibt es im gezeigten Code nicht (nur in der
Arbeitsfaden-Hülle `std::thread::spawn(move || { /* … */ })`, `:323`). Der Entwurf gibt das in
`:333-334` selbst zu („muss dabei vom Arbeitsfaden wieder verringert werden; sauber geht das mit
einem `Arc<AtomicUsize>`"), liefert die Korrektur aber nicht. Wer den Block abschreibt, baut einen
Server, der nach 16 Verbindungen **dauerhaft** 503 antwortet. Für einen Klassensatz (30–40 Geräte,
`main.rs:14-15` im Kommentar zu MAX_VERBINDUNGEN) ist das der Regelfall, nicht der Randfall.

### F7 — Der Verbindungszähler wird abweichend von C2 gezählt: C2 zählt **vor** der Prüfung, der Entwurf danach

C2: `if aktiv.fetch_add(1, SeqCst) >= MAX_VERBINDUNGEN { … aktiv.fetch_sub(1, SeqCst); continue; }`
(`tools/klassenraum/src/main.rs:148-171`) — der Zähler wird also **atomar** erhöht und im
Abweisungsfall wieder erniedrigt; der Entwurf prüft erst `if aktiv >= MAX_VERBINDUNGEN` (`:313`)
und erhöht danach (`:321`), mit einer nicht-atomaren lokalen Variablen. Zwei Bauformen, die sich
„austauschbar" nennen, dürfen die Grenze nicht unterschiedlich zählen (F6 ist die Folge).

### F8 — Der Firewall-Text ist an zwei Stellen nicht ehrlich

`c1-einbau.md:447-450` behauptet: „**Wenn du ablehnst:** … Schalte den Server einmal aus und wieder
ein, dann fragt Windows erneut." Das ist **nicht geprüft** und nach der Windows-Regel auch falsch:
Windows legt beim Ablehnen eine **Blockregel** für die Programmdatei an; der Dialog erscheint nur
wieder, wenn die Regel entfernt oder die Datei geändert/verschoben wird. Ein Aus-Ein-Schalter im
Programm kann das nicht auslösen. Der Entwurf verkauft hier eine Vermutung als Anweisung — und
derselbe Entwurf räumt in § 5 (`:465-468`) ein, den Dialog nie gesehen zu haben. Zweite Stelle:
`c1-einbau.md:443` „Windows fragt **einmal** nach" steht unvermittelt neben `:448` „dann fragt
Windows erneut" — zwei Aussagen, die sich ausschließen. Richtig und belegbar wäre: Der Dialog kommt
**einmal je Programmdatei**; ist er abgelehnt, führt der Weg über *Windows-Sicherheitscenter →
Firewall und Netzwerkschutz → Apps durch die Firewall zulassen* (Regel suchen, Häkchen setzen).

Ein zweiter Punkt derselben Stelle: `:451-453` sagt „Nimm nur **private Netzwerke**" und beschreibt
das öffentliche Profil richtig, erwähnt aber den Fall nicht, dass Windows den Dialog für ein als
**öffentlich** eingestuftes Netz gar nicht erst zeigt bzw. die Regel dann für „Öffentlich" gilt.
Das ist als „nicht geprüft" markiert (`:684`) und damit zulässig — es gehört aber in § 5 als
Vorbehalt, nicht nur in § 8.

### F9 — § 4.3 beruhigt falsch: die neue Zeile kann sehr wohl etwas ändern

`c1-einbau.md:413-425` behauptet, ein unbekannter Fähigkeitsname ändere „**nichts** am Verhalten",
solange die Oberfläche ihn nicht abfragt; das Muster `kann(f)` in `plattform-tauri.js:76-80` belege
das. Nachgelesen: Die Datei **liest** `info.kann` an mindestens zwei Stellen selbst —
`plattform-tauri.js:67` (`!(info && info.kann && info.kann.benachrichtigen)`) und
`src/ui/app.js:321` (`Plattform.kann("leiste")`), `:330` (`"immerOben"`), `:332` (`"autostart"`).
Die Zeile aus `fenster.rs:444-473` ist außerdem die einzige Quelle für `window.__LABOR_PLATTFORM__`
(`main.rs:172-177`, `plattform-tauri.js:11`). „Ändert nichts" ist damit eine **Behauptung ohne
Beleg**; richtig ist: sie ändert nichts, **solange** kein Aufrufer `kann("klassenraum")` liest —
und genau das soll § 6.3 ja einführen.

### F10 — Die Browser-Fassung würde den Schalter **zeigen und dann scheitern**

`c1-einbau.md:530-532` schlägt für `plattform-browser.js` vor, `klassenraum` als abgelehntes
Versprechen einzubauen und räumt ein, die Datei „**nicht gelesen**" zu haben. Nachgelesen (P3):
`src/plattform/plattform-browser.js` hat heute **weder** `klassenraum` noch `klassenraumStatus`
(`:17-63`), und `kann(f)` liefert für **unbekannte** Namen `{ja: true}` (`:60`) — die Ausnahmeliste
`NEIN` (`:8-15`) kennt nur `immerOben`, `tray`, `autostart`, `hotkey`, `klickdurch`,
`vollbildErkennen`. Folge mit dem Entwurfscode aus § 6.3: `Plattform.kann("klassenraum")` →
`ja: true` → der Schalter wird **angezeigt**; ein Klick ruft `Plattform.klassenraum(v, …)`, was es
im Browser nicht gibt → `TypeError`, gefangen in `:559-563` → Fehlermeldung „Server ließ sich nicht
einschalten". Der Auftrag verlangt das Gegenteil (`KLASSENRAUM.md:46`: „Nur die Desktop-Fassung kann
das"; `:48`: keine Fehlermeldung). Nötig ist ein Eintrag in `NEIN` (`:8-15`) **plus** die beiden
Methoden — nicht nur die Methoden.

### F11 — Der Entwurf widerspricht sich beim `beenden`-Pfad (toter Code?)

`c1-einbau.md:138-139` sagt richtig: `beenden` ist über `plattform-tauri.js:23` und `:60`
erreichbar. `c1-einbau.md:709-711` (§ 8 Punkt 8) schreibt dagegen: „**`beenden` ist heute womöglich
toter Code** … Ob dieser Weg in der Praxis ankommt, ist nicht gemessen." Beides zusammen ist ein
Widerspruch; die Aufrufe stehen nachgelesen in `plattform-tauri.js:23` (`invoke("beenden")` im
`labor-beenden`-Hörer) und `:60` (`Plattform.fenster.beenden`). „Toter Code" ohne Messung zu
behaupten, verstößt gegen die Hausregel („Behaupte nichts, was du nicht gemessen hast").

### F12 — Ungenauer bzw. falscher Verweis auf `http.rs:23`

`c1-einbau.md:630` und `:644` zitieren „Zeitlimit 5 s (`tools/klassenraum/src/http.rs:23`)". Zeile
23 ist `pub const DRAIN_MAX: usize = 256 * 1024;`; das Zeitlimit steht in **`http.rs:25`**
(`pub const ZEITLIMIT: Duration = Duration::from_secs(5);`). Der Wert stimmt, der Beleg nicht.
Ebenso ist die Grenzen-Zeile `c1-einbau.md:630` („Anforderungszeile 8 KiB, Kopfzeile 4 KiB, 40
Köpfe, Rumpf 4096 B, Zeitlimit 5 s (`http.rs:15-23`)") unvollständig belegt: `MAX_RUMPF` steht in
`http.rs:21`, `DRAIN_MAX` in `:23`, `ZEITLIMIT` in `:25`.

### F13 — Der Vertrag in § 7.1 lässt drei Dinge weg, die C2 wirklich tut

Alles drei in `tools/klassenraum/src/main.rs`/`http.rs` nachgelesen:

1. **Kein Keep-Alive:** jede Antwort trägt `Connection: close` (`http.rs:253`), jede Verbindung
   bedient genau eine Anfrage (`http.rs:3-4`). Der Entwurf nennt das in § 7.1 nicht — für ein
   „austauschbares" Paar ist das eine Vertragszeile, nicht ein Detail.
2. **`Expect: 100-continue`:** C2 antwortet mit `HTTP/1.1 100 Continue`, bevor der Rumpf gelesen
   wird (Prüfung `will_100` `http.rs:223-225`, Zwischenantwort `:226-231`), sonst hängt z. B. Windows PowerShell 5.1 (Kommentar `:218-222`,
   gemessen). C1 müsste das genauso tun; im Entwurf fehlt es. Der Entwurf benutzt in § 6.4
   ausgerechnet `Invoke-RestMethod` (`c1-einbau.md:599-606`) — also genau den Client-Typ, für den
   C2 diese Zwischenantwort braucht.
3. **Fehlerstatus aus dem Leser:** `http::lesen` liefert eigene Status (400/408/413/431,
   `http.rs:130,133,166,180,186,195,214`) und C2 sendet sie (`main.rs:300-307`). Der Entwurf kennt
   nur 400 und nennt 413/431/408/414 nirgends — obwohl er in § 7.1 „vollständig" wirken will.

### F14 — Fehlerform: der Entwurf verspricht ein Feld, das nur manchmal kommt

`c1-einbau.md:623`: „Rumpf kein Objekt / Feld fehlt / Wert unzulässig → `400` +
`{"format":…,"v":1,"fehler":…,"feld":…}`". In C2 hat `fehler_json` **kein** `feld`
(`tools/klassenraum/src/main.rs:349-355`), nur `fehler_feld` hat es (`:357-364`, benutzt z. B.
`:373`, `:415`, `:434`). Für den Client ist der Unterschied relevant (er darf `feld` nicht als
vorhanden annehmen) — und `c2-endpunkte.md:232` beschreibt es korrekt als „nur bei `fehler:"feld"`".
Nebenbei: `c2-endpunkte.md:227` zeigt als Beispiel zusätzlich ein `grund`-Feld, das C2 **nicht**
sendet (`main.rs:357-364`) — der Widerspruch aus F2 schlägt hier bis in die Fehlerform durch.

### F15 — „typisch in unter einer Millisekunde" ist eine Messbehauptung ohne Messung

`c1-einbau.md:641-642`: „der `TcpListener` fällt aus dem `static` und wird geschlossen → **Port
frei**, typisch in unter einer Millisekunde." Der Entwurf erklärt in § 9 (`:743-745`) selbst, dass
nichts gemessen wurde, und C2 gibt den Port erst nach `drop(listener)` und dem Verlassen der
Annahmeschleife frei (`main.rs:185-190`) — mit einem Kommentar, der den Erfolg **ausgibt**, statt
ihn zu messen. In § 3.5 fehlt außerdem der Hinweis, dass der Annahme-Faden zu diesem Zeitpunkt noch
im 40-ms-Schlaf liegen kann (`c1-einbau.md:325`): der Horcher ist dann aus dem `static` weg, der
Faden aber noch nicht fertig. Die Aussage „Port frei" ist wahrscheinlich richtig — sie ist aber
**nicht gemessen** und darf nicht als Messwert auftreten.

---

## 3 · Bestätigte Punkte (was der Entwurf richtig sagt)

| Punkt des Entwurfs | Nachweis in dieser Sitzung |
|---|---|
| `mod fenster;/speicher;/tray;` = `main.rs:5,6,7` | `main.rs:5-7` gelesen (P1) |
| `invoke_handler` = `main.rs:147-148`, 15 Befehle, Wortlaut stimmt | `main.rs:147-148`; Zählung der Namen: 15 |
| `fn beenden` = `main.rs:113-117`, Rumpf wörtlich wie zitiert | `main.rs:113-117` |
| `struct Labor` = `main.rs:24-41` (15 Felder) | `main.rs:24-41`; Felder gezählt: 15 |
| `setup()` = `main.rs:149-199`, `app.manage` = `:158-164` | `main.rs:149-199`, `:158-164` |
| `main.rs` 202 Z., `fenster.rs` 474 Z., `speicher.rs` 171 Z., `tray.rs` 136 Z. | P9 (Bytes/LF): 202/474/171/136, **kein CRLF, kein BOM** |
| `fenster.rs:444` `pub fn info(st: &Labor, hotkey_ok: bool) -> Value`, `:455` `setze("leiste", …)`, `:468` `setze("benachrichtigen", …)`, `:469` `json!({` | `fenster.rs:444,455,468,469` wörtlich |
| `beenden_anfragen` = `fenster.rs:331-342`, 4-s-Notbremse `:338-341` | `fenster.rs:331-342` (`thread::sleep(Duration::from_secs(4))` `:339`, `a.exit(0)` `:340`) |
| `tray.rs:66` `"beenden" => fenster::beenden_anfragen(app)` | `tray.rs:66` wörtlich |
| `plattform-tauri.js:23` und `:60` rufen `beenden` | `plattform-tauri.js:23`, `:60` |
| `plattform-tauri.js:52-61` Argumentnamen (`json`, `modus`, `b`, `h`) | `plattform-tauri.js:52,54,56` — genau so |
| `plattform-tauri.js:70-71` `autostart`/`autostartStatus`, `:76-80` `kann(f)` | `plattform-tauri.js:70,71,76-80` wörtlich |
| `app.js:322` `prozent`, `:332-335` Autostart-Block, `:299-338` `eigeneAbschnitte`, „Leiste" ab `:336` | `app.js:322`, `:332-335`, `:299`, `:318-336` |
| `einstSetzen()` existiert, Vorbild `Plattform.kann("autostart")` | `app.js:38` `function einstSetzen(teil)`, `:332` |
| `store` ist global (aus `src/kern/basis.js`), `store.set` schreibt entprellt | `src/kern/basis.js:73-84`; in `app.js` **keine** lokale `store`-Deklaration (P11-Suche: 0 Treffer) |
| `Spiel.EINST_STANDARD` = `src/spiel/zustand.js:23`, Erweiterung ist Sache des Bereichs B | `zustand.js:23` wörtlich |
| `Cargo.toml`: `tauri` mit `tray-icon`/`image-png` `:16`, `serde_json = "1"` `:22`, `windows-sys` `:25` **ohne** `Win32_Networking_WinSock` | `Cargo.toml:16,22,25` wörtlich (Features: `Win32_UI_Shell`, `Win32_Foundation`, `Win32_UI_WindowsAndMessaging`) |
| `tauri.conf.json`: `withGlobalTauri` `:10`, `"windows": []` `:11`, `csp: null` `:13`, Bündelziele nur `deb`/`appimage` `:18` | `tauri.conf.json:10,11,13,18` |
| `capabilities/main.json:4` enthält den Satz „Eigene Befehle sind ohne Freigabe erlaubt.", `:5` `"windows": ["main"]`, `:6-9` die zwei Rechte | `capabilities/main.json:1-10` wörtlich |
| **Capabilities: kein eigener Befehlsname kommt vor** | P5 (`*.json` unter `shell/src-tauri`): **0 Treffer**. P6 (`gen/schemas`): **0 Treffer**. P8: `beenden`/`speichern`/`klassenraum` je **1** Vorkommen = die Datei selbst bzw. 0 im Text. `acl-manifests.json` hat genau die 13 Schlüssel `autostart, core, core:app, core:event, core:image, core:menu, core:path, core:resources, core:tray, core:webview, core:window, dialog, global-shortcut` (P8, `ConvertFrom-Json`) — wie im Entwurf behauptet |
| Dateigrößen `gen/schemas`: `acl-manifests.json` 72631, `capabilities.json` 254, `desktop-schema.json` 127329, `windows-schema.json` 127329 | P8 (`Get-ChildItem`) — **alle vier Zahlen stimmen** |
| `.gitignore:3` = `shell/src-tauri/gen/`; Zweig `ausbau-1.2`; `git status --porcelain` = 5 unverfolgte Einträge, keine geänderte Datei | P10 — genau so, Text identisch mit `c1-einbau.md:42-44` |
| C2-Port 47112, 10 Versuche (47112–47121), Bind `0.0.0.0`, `--nur-lokal` → `127.0.0.1`, Ports < 1024 abgelehnt | `main.rs:34,36,198,211-213,246,219` |
| C2-Pfade/Statuscodes: `GET /liste` 200, `POST /ergebnis` 201/200, 400, 405+`Allow`, 404, 409, 415, 507, 503+`Retry-After`, `OPTIONS` 204 | `main.rs:310-341,368-404,408-472,455,160-168,311` |
| C2-Felder: `/liste` `format,v,sitzung,anzahl,sitzungen,ergebnisse`, Eintrag `platz,sterne,dauerS,sitzung,code,eingegangen`; `/ergebnis` `format,v,ok,neu,anzahl,platz,sitzung,lagerVoll` | `main.rs:385-402,460-469` — **exakt** die Feldnamen des Entwurfs (`:620-621`), `eingegangen` als ISO-Text (`:391`) |
| Grenzen: Rumpf 4096 B, Anforderungszeile 8 KiB, Kopfzeile 4 KiB, 40 Köpfe, 16 Verbindungen, 40 ms Wartezeit | `http.rs:15,17,19,21`, `main.rs:38,40` |
| CORS: `Allow-Origin: *`, `Allow-Private-Network: true` | `http.rs:254-264` (`:257`, `:263`) |
| Ablagedatei `{"format":"klassenraum-ablage","v":1,"ergebnisse":[…]}` atomar geschrieben | `lager.rs:127-139` |
| Obergrenze 4096 Einträge | `lager.rs:16` |
| Argumentnamen camelCase (`nurLokal`) sind mit Tauri 2 vereinbar; `rename_all = "camelCase"` als Absicherung ist zulässig | **nicht nachgemessen** — im Baum gibt es kein `rename_all` (P11-Suche in `*.rs`: 15 × `#[tauri::command]`, 0 × `rename_all`); Aussage stützt sich nur auf die C2-Vorlage `--nur-lokal`/`nur_lokal` und die Tauri-Dokumentation, nicht auf einen Lauf |
| „`python tools/repo-verweise-flicken.py` nicht ausgeführt", keine Änderung an `shell/**` | **teilweise prüfbar**: `git status --porcelain` (P10) zeigt **keine** geänderte verfolgte Datei — die Auflage des Entwurfs ist insoweit eingehalten. Ob ein einzelnes Werkzeug gelaufen ist, kann ich nicht feststellen (es hinterlässt keine Spur); das bleibt eine Selbstauskunft des Autors |

**Fazit zu Punkt 2 der Aufgabe (Capabilities):** Die Aussage „eigene `#[tauri::command]`-Befehle
brauchen keine Freigabe in `capabilities/*.json`" ist durch die Dateien **belegt**: kein eigener
Befehlsname steht in `capabilities/` oder `gen/schemas/` (P5/P6/P8), `acl-manifests.json` kennt nur
Kern und Plugins (P8), und die Hülle läuft mit 15 so registrierten Befehlen. Der Entwurf markiert
die Grenze dieser Aussage selbst (§ 2 letzter Absatz `:187-190`, § 8 Punkt 3 `:689-690`). Das ist
ehrlich. Ein **Laufzeitbeweis** fehlt weiterhin — er ist vor dem Einbau nachzuholen (ein neuer
Befehl genügt, siehe Empfehlung E3).

---

## 4 · Was der Entwurf als „nicht geprüft" kennzeichnet — ehrlich oder nicht?

| Als „nicht geprüft" markiert | Bewertung |
|---|---|
| Firewall-Dialog nicht gesehen (`:465-468`, `:682-684`) | **ehrlich** — und der Vorbehalt ist nötig, siehe F8 |
| `Cargo.toml` braucht keine Änderung, „behauptet auf Grund von Lesen, nicht von Bauen" (`:685-688`) | **ehrlich**; zusätzlich: „`cargo build` wäre eine Änderung an `shell/src-tauri/target/`" — für mich nachvollziehbar, ich habe es ebenso gehalten |
| Capability-Frage nur durch Lesen belegt (`:689-690`) | **ehrlich** (und durch P5-P8 gestützt) |
| Argumentnamen `nurLokal` nicht nachgemessen (`:691-696`) | **ehrlich** |
| Zwei getrennte HTTP-Umsetzungen (`:697-702`) | **ehrlich**; die dort zitierte Kiste `tools/klassenraum/Cargo.toml:1-10` habe ich **nicht** gelesen → für mich „nicht geprüft" |
| Zugriffsschutz keiner (`:703-706`) | **ehrlich** und deckungsgleich mit `main.rs:14-15` |
| Sitzungsfilter ohne Sitzungskennung (`:707-708`) | **ehrlich** |
| `beenden` womöglich toter Code (`:709-711`) | **nicht ehrlich im Sinne der Hausregel**: es ist keine Messung, sondern eine Vermutung, und sie widerspricht `:138-139` desselben Dokuments (F11) |
| `tauri-plugin-localhost` nicht im `Cargo.lock` (`:712-714`) | **belegt**: Suche nach `tauri-plugin-localhost` im ganzen Baum trifft **nur** diese beiden Entwurfszeilen (P8/P11) |
| `.exe` Installer oder Dateikopie (`:715-717`) | **ehrlich** |
| Testweg fehlt (`:718-723`) | **ehrlich**; die Suche nach `#[cfg(test)]` in `shell/src-tauri/src/` ergibt 0 Treffer — meine Suche nach `tauri::command` (15 Treffer) und die Lektüre aller vier Dateien bestätigen: keine Tests in der Hülle |
| Kein Schutz der Ports 47112–47121 (`:724-726`) | **ehrlich** |
| § 9 „Nicht gemessen: ob die Vorschläge übersetzen, ob sie laufen …" (`:743-745`) | **ehrlich** — aber siehe F3/F4: zwei der Vorschläge übersetzen **nachweislich nicht**; „nicht gemessen" ist hier zu schwach, es ist „durch Lesen widerlegt" |
| **Nicht als „nicht geprüft" markiert, obwohl unbewiesen:** | |
| „Port ist frei, typisch in unter einer Millisekunde" (`:641-642`) | **Mangel** (F15) |
| „Ein unbekannter Fähigkeitsname gilt heute als kann — die neue Zeile ändert nichts" (`:413-425`) | **Mangel** (F9) |
| „Schalte den Server einmal aus und wieder ein, dann fragt Windows erneut" (`:448`) | **Mangel** — steht im Fließtext der Oberfläche, obwohl der Autor den Dialog nie gesehen hat (F8) |
| „Ab … verschiebt sich alles um zwei Zeilen" / Zeilenbilanz `:99-100` | **nicht nachgeprüft, aber plausibel**: die eigene Rechnung des Entwurfs ist in sich stimmig (eine neue `mod`-Zeile + zwei neue Zeilen im Handler = +3 Zeilen; die Aussage „ab `main.rs:149` um zwei Zeilen" ist damit **falsch gezählt** — nach der Einfügung liegt `setup()` bei 151, also +2, und die drei neuen Zeilen sind 8, 148, 149 → `setup` verschiebt sich um 2. Die Aussage stimmt doch; ich nenne sie hier nur, weil sie nicht belegt ist, sondern gerechnet. |

---

## 5 · Empfehlungen — was vor dem Einbau geändert werden muss

**Zwingend (sonst scheitert der Einbau oder C1 weicht von C2 ab):**

* **E1** (§ 3.3/3.4 neu schreiben) — `set_nonblocking(false)`, `set_read_timeout`,
  `set_write_timeout`, `set_nodelay(true)` **auf dem angenommenen Socket**, und vor jeder
  Abweisung die Anfrage **lesen**. Beleg: `tools/klassenraum/src/http.rs:153-156` und
  `tools/klassenraum/src/main.rs:155-159`. Ohne das: WSAEWOULDBLOCK 10035 bzw. RST statt 503.
* **E2** (F3) — Aufruf und Signatur der Antwortfunktion an `http.rs:239-247` angleichen
  (7 Parameter, Inhaltstyp dabei) oder in `klassenraum.rs` eine eigene Funktion **definieren**,
  statt `http_antworten` zu benutzen, als gäbe es sie.
* **E3** (F5) — **eine** Schnittstelle festschreiben: `starten(...) -> Result<Value, String>`,
  `stoppen() -> Result<Value, String>`, `status() -> KlassenraumInfo`, `status_json() -> Value`
  — und dann § 1.4, § 4.1, § 4.2, § 6.1, § 6.2, § 8.2 darauf umstellen. Vorher ist der Entwurf
  nicht abschreibbar.
* **E4** (F6/F7) — den Zähler als `Arc<AtomicUsize>` **im gezeigten Code** führen, mit
  `fetch_add`/`fetch_sub` genau wie `tools/klassenraum/src/main.rs:148,169,174`, und den Abweisungs-
  pfad mitzählen (C2 zählt vor der Prüfung).
* **E5** (F8) — den Firewall-Text korrigieren: Dialog kommt **einmal je Programmdatei**; Ablehnung
  erzeugt eine Blockregel; der Weg zurück führt über die Firewall-Regelliste, **nicht** über
  Aus-Ein im Programm. Den Satz „dann fragt Windows erneut" streichen. Den öffentlichen-Profil-Fall
  in § 5 aufnehmen (oder ausdrücklich als ungeprüft kennzeichnen).
* **E6** (F4/F9/F10) — § 4.3 richtigstellen (die neue Fähigkeitszeile **kann** Verhalten ändern) und
  § 6.2 für den Browser um einen Eintrag in `NEIN` (`plattform-browser.js:8-15`) ergänzen, damit
  `kann("klassenraum")` im Browser `{ja:false}` liefert, statt den Schalter zu zeigen.

**Dringend empfohlen:**

* **E7** (F1/F2) — § 4/§ 7 **neu** gegen `tools/klassenraum/src/*.rs` abgleichen (Stand 23:45:20)
  und mit dem Leiter klären, welches der beiden Papiere gilt (`c1-einbau.md` folgt dem **Code**,
  `c2-endpunkte.md:421,437,359,250,544` folgt einem **anderen** Vertrag: 8780, 8 Verbindungen, 409,
  `art`/`quelle`). Ohne diese Entscheidung ist „C1 und C2 austauschbar" nicht prüfbar.
* **E8** (F13) — `Connection: close`, `Expect: 100-continue` und die Leser-Fehlerstatus
  (400/408/413/431) in den Vertrag § 7.1 aufnehmen — sie sind Teil der C2-Wirklichkeit und für den
  in § 6.4 vorgeschlagenen `Invoke-RestMethod`-Aufruf sogar nötig.
* **E9** (F14) — Fehlerform präzisieren: `feld` **nur** bei Feldverletzungen (`main.rs:357-364`),
  sonst `{format,v,fehler}` (`main.rs:349-355`).
* **E10** (F11) — § 8 Punkt 8 („toter Code") streichen oder durch die Aufrufstellen
  `plattform-tauri.js:23,60` ersetzen.
* **E11** (F15) — „unter einer Millisekunde" als **Vermutung** kennzeichnen und die Nachprüfung
  (binden → stoppen → erneut binden, mit Zeiten) in § 8 als offenen Messpunkt aufnehmen.
* **E12** (F12) — die Belege `http.rs:23` → `http.rs:25` und `main.rs:182-184` → `main.rs:211-213`
  richtigstellen; F1-Tabelle als Prüfliste nehmen.
* **E13** (zu § 2) — den Laufzeitbeweis der Capability-Frage **vor** dem Einbau führen: einen
  trivialen neuen Befehl registrieren, über die Oberfläche aufrufen, danach wieder entfernen. Das
  ist der einzige fehlende Beleg für die (im Übrigen gut gestützte) Aussage des Entwurfs.

**Was ich nicht empfehle:** den Einbau „erst einmal zu probieren". § 3.3/3.4 des Entwurfs sind
kein lauffähiger Code (F3/F5/F6), und die zwei Windows-Fallen (F4) sind der Unterschied zwischen
„Server antwortet" und „Schüler sieht nur einen Verbindungsabbruch".

---

## 6 · Kurzfassung (max. 15 Zeilen)

1. Zeilengenauigkeit **gut**: `main.rs:5-7/147-148/113-117/24-41/149-199` und `fenster.rs:444/455/468/469` stimmen wörtlich; Zeilenzahlen 202/474/171/136 bestätigt (LF, kein BOM).
2. **F1:** Der Entwurf ist 24 min älter als C2 (`main.rs` 23:21 vs. 23:45; 518 → **559** Zeilen) — alle C2-Zitate sind gegen einen verschwundenen Stand gerichtet.
3. **F2:** `c2-endpunkte.md` legt einen **anderen** Vertrag fest (8780, 8 Verbindungen, 409, `art`/`quelle`) als die gebaute C2 (47112, 16, 507, `format`). C1 nennt dieses Papier nicht.
4. **F3:** `http_antworten(...)` mit 6 Argumenten existiert nicht; C2 hat `antworten(...)` mit 7 (`http.rs:239-247`) → übersetzt nicht.
5. **F4:** Die **gemessene** Windows-Falle (accept-Socket erbt nonblocking → 10035, `http.rs:147-153`; erst lesen, sonst RST, `main.rs:149-158`) **fehlt vollständig**.
6. **F5:** Vier Namen für eine Funktion, `status()` mal `KlassenraumInfo`, mal Zustands-JSON, Befehlssignatur in § 3.3 ≠ § 6.1/6.2.
7. **F6/F7:** Zähler lokal und ohne Herunterzählen → nach 16 Verbindungen dauerhaft 503; C2 zählt atomar vor der Prüfung.
8. **F8:** „Aus und wieder ein, dann fragt Windows erneut" ist falsch (Blockregel bleibt); „einmal" und „erneut" widersprechen sich im selben Abschnitt.
9. **F9:** „unbekannte Fähigkeit ändert nichts" stimmt nicht — `plattform-tauri.js:67` liest `info.kann` selbst.
10. **F10:** Browser hat kein `klassenraum`, `kann()` liefert `{ja:true}` (`plattform-browser.js:60`) → Schalter sichtbar, Klick endet im Fehler-Toast; Eintrag in `NEIN` fehlt.
11. **F11–F15:** „beenden ist toter Code" (widerlegt: `plattform-tauri.js:23,60`), `http.rs:23` ≠ Zeitlimit (richtig: `:25`), Keep-Alive/100-continue/413/431 fehlen, `feld` nur manchmal, „unter 1 ms" ungemessen.
12. **Capabilities (Aufgabe 2): bestätigt** — 0 Treffer für alle 15 Befehlsnamen in `capabilities/` und `gen/schemas/`; `acl-manifests.json` nur Kern + Plugins; die vier Dateigrößen stimmen. Laufzeitbeweis fehlt (ehrlich benannt).
13. **Ehrlichkeit:** Firewall-, Bau-, Argument- und Capability-Vorbehalte sind sauber markiert; als „gemessen" verkleidet sind nur „unter 1 ms", „ändert nichts" und der Windows-Wiederholungsdialog.
14. **Vor dem Einbau zwingend:** E1 (nonblocking/lesen), E2 (Signatur), E3 (eine Schnittstelle), E4 (Zähler), E5 (Firewall-Text), E6 (Browser-`NEIN`).
15. **Danach:** E7 (Vertrag mit dem Leiter auf **eine** Fassung festlegen) — sonst ist „C1 und C2 austauschbar" nicht prüfbar.
