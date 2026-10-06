---
typ: vertrag
aktualisiert: 2026-10-07
status: umsetzungsreif (Code, Oberfläche, Rust, Abnahme belegt; Umsetzung selbst noch nicht begonnen)
tags: [Netzwerk-Labor, Klassenraum, Vertrag]
---

# Klassenraum – Umsetzungsreife Spezifikation

**Wozu dieser Text da ist.** [`tools/auftraege/KLASSENRAUM.md`](../../tools/auftraege/KLASSENRAUM.md)
sagt, *was* gebaut werden soll. Hier steht, *wie genau*: Code-Format, API, Datenformen, Oberfläche,
Rust-Teile, Testplan, Abnahme und Reihenfolge – so, dass beim Bauen keine Entscheidung mehr offen ist und
jede Zahl nachprüfbar ist.

**Rangfolge bei Widersprüchen:** `KLASSENRAUM.md` (Auftrag) → `docs/Architektur.md` (verbindlicher Vertrag)
→ dieser Text → die vier Teil-Dokumente (unten). Jede Abweichung wird im Bericht genannt.

**Die vier Teildokumente** (Belege, Messprotokolle, Datei:Zeile-Nachweise stehen dort vollständig):

| Teil | Datei | Inhalt |
|---|---|---|
| A | [A – Codec und Determinismus.md](Klassenraum/A%20%E2%80%93%20Codec%20und%20Determinismus.md) | Code-Format, Prüfsumme, Bit-Budget, Kanonisierung, API, Ergebnis-Code, Speicherform, Netzkennwert |
| B | [B – Oberfläche und Ablauf.md](Klassenraum/B%20%E2%80%93%20Oberfl%C3%A4che%20und%20Ablauf.md) | Ansichten, DOM, Klassennamen, Tokens, alle Texte, Startseite, Beamer, Ampel, Export/Import, Schalter |
| C | [C – Rust, Live und QR.md](Klassenraum/C%20%E2%80%93%20Rust,%20Live%20und%20QR.md) | C1 Einbauanleitung, C2 gebauter Server, Endpunkte, CORS, Ports, QR ohne neue Kisten |
| D | [D – Prüfung, Abnahme und Reihenfolge.md](Klassenraum/D%20%E2%80%93%20Pr%C3%BCfung,%20Abnahme%20und%20Reihenfolge.md) | 40 Testfälle, Abnahmebefehle mit Sollzahlen, Vorführdrehbuch, Risiken, DoD, Architektur-Vorschlag |

**Stand der Belege:** gemessen in der Nacht 06./07.10.2026 auf diesem Rechner, Zweig `ausbau-1.2`
(HEAD `59c6ccf`). Der Spielkern `src/**`, `tests/**`, `bauen.py` und die bestehenden Werkzeuge sind
**unverändert** – dieser Auftrag liefert die Spezifikation, nicht die Umsetzung.

> [!warning] Was in dieser Umgebung **nicht** messbar war
> Edge startet in der Werkzeug-Sandbox nicht (eigene Prozess-Sandbox: `FATAL:mojo … platform_channel.cc:187
> … Zugriff verweigert (0x5)`). Deshalb: **kein** Rauchtest (`36/36`), **keine** Menüprobe
> (`5 Profile, 49 Kriterien, 0 verletzt`), **keine** echte Vorführung, **keine** Bildschirmfotos,
> **kein** Handy-Scan. Ebenso scheitert `sh tools/test.sh` an der Sandbox (`bash: couldn't create signal
> pipe, Win32 error 5`) – Ersatzweg ist `node tests/run.js`. Der Determinismusbeweis ist trotzdem
> geführt: über **zwei getrennte Node-Prozesse**, nicht über zwei Browser.

---

## 0 · Ausgangslage (in dieser Sitzung gemessen)

| Prüfung | Befehl | Ergebnis |
|---|---|---|
| Tests | `node tests/run.js` | **251/251 grün**, 35 Testdateien, 76 Module |
| Minimalismus | `python tools/ethos.py` | `GRUEN` (21 Dateien, 1938 Zeilen, 1614 Regelblöcke) |
| Klassen ↔ CSS | `python tools/klassen.py` | `0 Klassen ohne CSS-Regel` |
| Simulation | `node tools/sim-stand.js` | „Simulation unverändert gegenüber dem Referenzstand" |
| Baukette | `python bauen.py` · `python tools/einfach.py` | 0,17 s · 1,22 s; `docs/index.html` und `Netzwerk-Labor.html` **byte-gleich**, SHA256 `E44E4C6B…13FD` vor **und** nach dem Bau |
| Handaufträge | `grep -c '^\s*t({id:' src/daten/tickets-*.js` | **58**; `Spiel.ticketReihe()` ebenfalls 58 |
| Fertigkeiten | `DATEN.skills` | **27**; davon **24** über einen Code adressierbar |
| Rust-Kette | `cargo --version` | cargo/rustc **1.97.1** |
| Kisten-Nachschub | `cargo fetch` in einer Probe-Kiste | **scheitert** (`SSL connect error`, `SEC_E_NO_CREDENTIALS`) – 964 `.crate` im Cache, `image`/`png` da, **kein `qrcode`** |
| Netzwerkcode im Spiel | Suche `fetch`/`XMLHttpRequest`/`WebSocket`/`EventSource` in `src/` | **0 Treffer** – der Klassenraum ist der erste Netzwerkpfad des Projekts |

**Trägt schon heute:** deterministischer Zufall `Zufall(seed)` (`src/kern/basis.js:41-56`), Start-Netz aus
Seed (`src/spiel/ticket.js:14-23`), Seed-Fassung je Auftrag mit Selbstprüfung
(`src/daten/basis.js:107-178` + `src/spiel/generator.js:126`), Instanz mit `seed`/`quelle`/`ohneFlow`
(`src/spiel/postfach.js:62-105`), freie Store-Schlüssel (`src/kern/basis.js:73-132`), Ansichten anmelden
(`src/ui/app.js:11,59-61`).

---

## 1 · Der Vertrag in Kurzform

**Ein Code, kein Server, kein Konto.** Die Lehrkraft erzeugt lokal eine Sitzung und sagt einen **10 Zeichen
langen Auftragscode** an. Jedes Gerät baut daraus **denselben** Auftrag selbst – weil Aufträge
deterministisch aus einem Seed entstehen. Nach der Abnahme zeigt das Spiel einen **Ergebnis-Code**, den die
Lehrkraft eintippt oder (optional, Stufe C) live einsammelt. Alles funktioniert ohne Netz.

**Der Beweis der Kernbehauptung** (gemessen, A § 4.1): derselbe Code in zwei getrennten Node-Prozessen
(pid 9888/13904) → **12/12 Codes identisch** in Seed, Netzkennwert und Instanz-Kennwert, 0 Abweichungen.

---

## 2 · Codec (Vertrag)

### 2.1 Auftragscode

```
Alphabet   ABCDEFGHJKLMNPQRSTUVWXYZ23456789      (32 Zeichen = 5 Bit; kein I, O, 0, 1)
gedruckt   NL-XXXX-XX                            immer genau 10 Zeichen, 2 Gruppen
Nutzlast   20 Bit:  sitzung 5 | art 1 | index 6 | variante 8
Prüfsumme  10 Bit:  C1 = (1v₀+2v₁+3v₂+4v₃) mod 31 → Zeichen
                    C2 = (1v₀+3v₁+5v₂+7v₃) mod 32 → Zeichen
```

* `sitzung` 1..31 (`erzeugen` würfelt), `art` 0 = handgeschrieben / 1 = generiert, `index` in die
  **eingefrorene Tabelle**, `variante` 0..255 → Startseed ist **immer `variante + 1`** (1..256).
* **Groß/Klein, Bindestriche, Punkte und Leerzeichen sind egal**: `toUpperCase()`, alles außer `[0-9A-Z]`
  weg, führendes `NL` nur abschneiden, wenn danach genau 6 Zeichen bleiben.
* **Die Prüfsumme fängt jeden Einzelfehler**: 92/92 gebaute Vertipper abgelehnt (48 ersetzt, 20 Nachbarn
  vertauscht, 24 Buchstabe↔Ziffer); unabhängige Gegenprüfung über den ganzen Raum: **130.023.424
  Ersetzungen und 3.047.424 Vertauschungen, 0 unbemerkt**. 10.000 wohlgeformte Zufallscodes → **99,84 %
  abgelehnt**.
* **Beispiele (nachgerechnet):** Sitzung 7, art 0, Index 11, Variante 42 → `NL-HC3L-CS`; Sitzung 20, art 1,
  Index 5, Variante 200 → `NL-WTQJ-EF`.
* **Das Formbeispiel des Auftrags `NL-4F7K-2Q` ist kein gültiger Code** (richtig wäre `NL-4F7K-E3`; der
  Leiter hat es nachgerechnet: `4F7K` = `[26,5,29,9]`, `C1 = 159 mod 31 = 4 → E`, `C2 = 249 mod 32 = 25 → 3`).
  Es bleibt als **Formmuster** im Platzhalter der Eingabefelder; ein Eingabefeld, das es ablehnt, arbeitet
  richtig. Ein Test prüft das ausdrücklich.

### 2.2 Ergebnis-Code

```
gedruckt   E-XXXX-XXX       immer genau 10 Zeichen
Nutzlast   25 Bit: sitzung 5 | platz 5 | sterne 4 | versuche 2 | dauer 9
```

`sterne` = halbe Sterne (`round(sterne·2)`, 0..10), `versuche` = Fehlversuche (`abnahmen − 1`, ab 3 als
„3+"), `dauer` in 10-s-Einheiten (0..5110 s ≈ 1:25:10). Beispiel: `E-KFWS-HZM` → Sitzung 9, Platz 5,
5 Sterne, 1 Fehlversuch, 70 s. Round-Trip über **335.168** geprüfte Fälle verlustfrei, Länge min = max = 10.
**Kein Klarname ist möglich** – der Codec kennt kein Namensfeld; der Platz ist eine Zahl 0..31.

### 2.3 Seed-Kanonisierung (macht jeden Code spielbar)

```
KANON_FENSTER = 64
seedStart = variante + 1
für k = 0…63:  s = seedStart + k;  d = def.fuerSeed(s)
               wenn Spiel.ticketGueltig(d) UND d !== def  →  eigene Fassung gefunden
Rückfall:      d = def.fuerSeed(seedStart)   (feste Fassung – deterministisch auf allen Geräten)
sonst:         {fehler:"auftrag"}
```
Die Unterscheidung „eigene Fassung ↔ Rückfall" gelingt über den **Objektvergleich** (`fuerSeed` gibt im
Rückfall dasselbe Objekt zurück, `src/daten/basis.js:159-176`).

Gemessen: 58 Aufträge × 64 Varianten = **3.712 Paare**, davon **3.520 (94,83 %) eigene Fassung bei k = 0**;
192 Rückfälle = genau die **3 Terminal-Aufträge** (`salon-terminal`, `baeckerei-terminal`, `buero-terminal` –
gewollt, `src/daten/basis.js:114-116`); `Spiel.ticketGueltig` **3.712/3.712** wahr. Generiert: 27 Fertigkeiten
× 64 = 1.728 Paare, 1.536 bei k = 0, **192 Fehlschläge = die 3 Fertigkeiten ohne Injektor**
(`lab.portsec`, `lab.stp`, `lab.storage`) → nur **24 von 27** werden angeboten. Der Zweig `0 < k < 64` trat
nie auf – er ist Versicherung gegen Fassungsunterschiede, **nicht** gemessener Pfad (ehrlich so benannt).

### 2.4 Index-Tabellen (Stabilität der Codes)

`TABELLE_AUFTRAGE` (58 IDs in `Spiel.ticketReihe()`-Reihenfolge) und `TABELLE_SKILLS` (27 IDs in
`DATEN.skills`-Reihenfolge, 24 mit `tauglich: true`) liegen als **Literal** in `src/spiel/klassenraum.js` –
zur Laufzeit wird **nichts** berechnet. Regeln: **nur anhängen**, nie einschieben; fehlt eine ID, gibt der
Index `{fehler:"auftrag"}`; freie Indizes (58..63 bzw. 27..63) geben `{fehler:"fassung"}`. Ein Test wacht
darüber, dass die eingefrorene Liste Element für Element zur heutigen Reihenfolge passt.

### 2.5 API `Spiel.klassenraum`

Die acht Funktionen des Auftrags, unverändert in Namen und Rückgabeform, plus vier Zusatzfunktionen
(im Vertrag mitgeführt, weil die Oberfläche sie braucht):

| Funktion | Rückgabe bei Erfolg | bei Fehler |
|---|---|---|
| `erzeugen({ticketId?, skill?, seed?, dauerMin?, titel?})` | Sitzung (Kopie) | `{fehler:"wahl"｜"auftrag"｜"fassung", grund}` |
| `ausCode(code)` | `{ticketId, seed, art, sitzung, index, variante, skill, eigene, schritte, code}` | `{fehler, grund}` · **`null`** = nichts eingetippt |
| `sitzung()` | Sitzung aus `store "klassenraum"` (tiefe Kopie) | `null` |
| `ergebnisCode(inst, abnahme)` | `"E-XXXX-XXX"` | `{fehler:"abnahme"｜"auftrag", grund}` |
| `ergebnisLesen(code)` | `{sitzung, platz, sterne, dauerS, versuche, ok:true}` | `{fehler, grund}` · `null` bei leer |
| `ergebnisEintragen(code)` | `{ok:true, neu:true｜false, platz, sterne}` | `{fehler, grund}` |
| `exportieren()` | JSON-String | `{fehler:"sitzung", grund}` |
| `importieren(text)` | `{ok:true, sitzung}` | `{fehler:"format"｜"fassung", grund}` |
| `netzkennwert(netz)` *(Zusatz)* | `"XXXXXX"` | – |
| `tauglicheFertigkeiten()` *(Zusatz)* | 24 Einträge `{skill, index}` | – |
| `platz()` / `platzSetzen(n)` *(Zusatz)* | `0..31` / `{ok:true}` | – / `{fehler:"wahl"}` |
| `plaetze()` / `plaetzeSetzen(n)` *(Zusatz, **neu vom Leiter**)* | `1..31｜null` / `{ok:true}` | – / `{fehler:"wahl"}` |

**Keine dieser Funktionen wirft jemals.** Fehlerklassen: `länge · zeichen · prüfziffer · bereich · auftrag ·
fassung · sitzung · abnahme · wahl · format`.

**`erzeugen` schreibt nur in `store "klassenraum"`** (`zaehler`, `sitzung`, `platz`, `plaetze`, `letzte`,
`zuletzt`) – der Spielstand bleibt unberührt. `ergebnisEintragen` ist **idempotent**: Schlüssel ist der
**Platz**, der erste Eintrag gewinnt; derselbe Code noch einmal → `{ok:true, neu:false, grund:"doppelt"}`,
Speicherinhalt byte-identisch; anderer Code für denselben Platz → `grund:"platz-schon-da"`; fremde Sitzung →
`{fehler:"sitzung"}`.

### 2.6 Der Öffnungsweg (so, und nur so)

```js
const c = Spiel.klassenraum.ausCode(eingabe);
if (!c) return;                                     // nichts eingetippt
if (c.fehler) return hinweis(c.grund);              // Tippfehler, fremde Fassung …
if (!Spiel._st) Spiel.laden();                      // frischer Schulrechner
const inst = c.skill
  ? Spiel.instanzErstellen({gen: {skill: c.skill, seed: c.seed}, quelle: "klassenraum", ohneFlow: true})
  : Spiel.instanzErstellen({ticketId: c.ticketId, seed: c.seed, quelle: "klassenraum", ohneFlow: true});
inst.klassenraum = {sitzung: c.sitzung, platz: Spiel.klassenraum.platz() ?? 0, code: c.code};
UI.spiel.oeffnen(inst.iid);                         // nicht Spiel.oeffnen allein: das lädt das Labor
```

Zwingend: **`ohneFlow: true`** (sonst baut der Flow-Regler den Auftrag um – gemessen:
`gen-lab.link-5-verwicklung`/`FFKP5X` statt `gen-lab.link-5`/`LPKNCW`) und **`Spiel.generiere` ohne
`opts.stufe`** (eine lokale Einstellung würde den Auftrag je Gerät ändern). `quelle:"klassenraum"` zählt
**nicht** als reguläres Postfach-Ticket (`src/spiel/postfach.js:152`), ist aber im Postfach **sichtbar**
(`:124`); das Postfach-Ziel bleibt unberührt (`:14`).

### 2.7 Netzkennwert („Klassenraum-Abdruck")

6 Zeichen aus demselben Alphabet, FNV-1a über eine **kanonisch sortierte JSON-Abbildung** von
`{v, geraete, kabel}` – **ohne** `netz.zustand` (Laufzeit), damit Reihenfolgen und MAC-Tabellen den Vergleich
nicht stören. Der fertige Funktionstext steht in A § 4.2 und ist wortgleich die Vorlage für
`src/spiel/klassenraum.js`. Gemessen: gleiches Netz → gleicher Kennwert (`YYBR4E`), vertauschte Schlüssel/
Kabel und geänderter Laufzeitzustand → **gleich**, eine geänderte IP → **anders** (`RB46A7`).

### 2.8 Speicherform und Export/Import

`store "klassenraum"` = `{fassung: 1, programm, sitzung{id, titel, art, ticketId, skill, index, variante,
seed, eigene, schritte, code, dauerMin, plaetze, erstellt, ergebnisse{platz → {platz, sterne, dauerS,
versuche, code, zeit, quelle}}}, platz, letzte, zuletzt, zaehler}`.
Export: `{format:"netzwerk-labor/klassenraum", fassung:1, programm, zeit, sitzung}` – **verlustfrei**
(gemessen), Fassungsprüfung beim Import (`fassung > 1` → `{fehler:"fassung"}`), unbekannte Felder bleiben
erhalten, kaputter/fremder Text lässt die laufende Sitzung stehen.

---

## 3 · Oberfläche und Ablauf

**Zwei Ansichten, ein Start-Haken** (`heute`, `postfach`, `labor` … bleiben unverändert in `REIHE`; die
neuen Knöpfe hängen hinten an):

| Ansicht | Titel im Dock | Symbol | Rolle |
|---|---|---|---|
| `klassenraum` | „Klasse" | `kunden` | Lehrkraft: Auftrag wählen, Code groß zeigen, kopieren, Ampel, Ergebnis-Codes, Datei |
| `mitarbeit` | „Auftrag" | `akte` | Schülerin: Platz wählen, Code eintippen, Auftrag öffnen, Abdruck ablesen |

* **DOM/CSS:** ausschließlich `h()`/`$()` aus `src/ui/dom.js`, Klassenpräfix **`kl-`**, jede Klasse hat eine
  Regel in `src/stil/klassenraum.css` (sonst wird `tools/klassen.py` rot), Farben/Größen **nur** aus den
  Tokens in `src/stil/basis.css` (21 Tokens, in B § 2.4 mit Zeilennummer belegt). Beide Ansichten bauen
  einen Wurzelknoten wie `src/ui/hub.js:24-26`.
* **Startseite** ist die Ansicht **`heute`** (der Hub) – *nicht* `start.js`: dort läuft nur der Startvorgang.
  Die Code-Eingabe ist **eine untergeordnete Zeile** unter der Auftragskarte: Etikett „Klassenraum-Code",
  Platzhalter `NL-4F7K-2Q`, Knopf „Öffnen" – **kein** `.primaer`, **kein** `input[type=search]`, **kein**
  `.hb-annehmen` (sonst bricht der Rauchtest; die vier gefährdeten Stellen sind in B § 4.3 mit Zeilennummer
  benannt). Einbau **ohne Fremdeingriff**: Haken auf das Bus-Ereignis `ansicht` (nach dem Aufbau der
  Hub-Ansicht) und die Zeile idempotent in den vorhandenen DOM hängen.
* **Beamer:** `font: 800 clamp(28px, 5vw, 118px)/1.05 var(--mono)` → 1366 px ⇒ 68 px, 960 ⇒ 48 px,
  720 ⇒ 36 px. Ehrlich: aus 3 m ist der Code nur **mit Projektor** (2 m Bild) lesbar, nicht auf einem
  68-cm-Monitor; die Rechnung steht in B § 5.
* **Ampel:** fertig = belegte Plätze; offen = `plaetze − fertig`, ohne eingestellte Platzzahl
  „Plätze nicht eingestellt"; Median = **oberer** Median (`floor(n/2)`) der gültigen Dauern > 0, auf ganze
  Sekunden gerundet, Anzeige `M:SS`; Farben: 0 Ergebnisse `--faint`, teilweise `--warn`, alles `--ok`,
  `--bad` nur bei Importfehler.
* **Ergebnis-Code im Spiel:** erscheint im Ergebnis-Fenster nach der Abnahme (`abnahmeAnfordern()` →
  `Spiel.abnahme` → `Spiel.abschliessen` → `ergebnisZeigen`), eine Zeile, kopierbar, beim zweiten Ansehen
  dezent; der Haken ist `Spiel.abschliessen`/`ticket-geloest`.
* **Lehrer-Eingabe:** ein Feld, Block oder einzeln; je Zeile eine Rückmeldung; Doppelte werden erkannt;
  Zusammenfassung „18 eingetragen · 2 doppelt · 1 fremde Sitzung · 1 unlesbar".
* **Alle Texte wörtlich** (Anrede „du") stehen in **B § 3** – inklusive der Fehlersätze des Codecs. Die
  Abweichung zum Auftragssatz („Prüfziffer stimmt nicht — hast du ein O statt 0 getippt?") ist aufgelöst:
  der Auftragssatz beschreibt zwei Lagen; das Spiel zeigt **zwei** präzise Sätze (Fremdzeichen bzw.
  Prüfziffer) aus dem Codec – eine zweite Wahrheit in der Oberfläche wäre schlechter.
* **Datei (Export/Import)** über die vorhandenen Plattform-APIs (in B § 10 mit Signatur belegt), Vorschlag
  `klassenraum-<datum>.json`; abgebrochener Dialog = **keine** Meldung.
* **Server-Schalter** „Klassenraum-Server (nur Desktop)" in einem eigenen Einstellungsabschnitt, Standard
  **aus**, mit dem wörtlichen Firewall-Hinweis aus B § 3.5; in Browser/Android erscheint nur der Ersatztext
  („Nur das Desktop-Programm kann das."). **Kein** Fremdeingriff in `plattform-browser.js` nötig – die
  Ansicht entscheidet selbst über `Plattform.name`.

---

## 4 · Rust: Live-Server und QR-Code

**Randbedingung (gemessen):** neue Kisten sind **nicht** holbar (`cargo fetch` scheitert) → Server **und**
QR-Encoder laufen **nur mit `std`**.

### 4.1 C1 – der Server in der `.exe` (Anleitung, noch nicht gebaut)

Genau **drei** Stellen in `shell/src-tauri` (Details C § 4):
1. `main.rs:8` → `mod klassenraum;`
2. `main.rs:147-148` → `klassenraum_server`, `klassenraum_status` in den `invoke_handler`
3. optional `klassenraum::stoppen();` beim Schließen (`main.rs:113-117`)

Zustand über `OnceLock<Mutex<Option<Server>>>`; `struct Labor`/`setup()` bleiben unberührt.
**Capabilities: keine Änderung nötig** – belegt: keiner der 15 eigenen Befehlsnamen steht in
`capabilities/` oder `gen/schemas/` (Laufzeitbeweis fehlt, ehrlich benannt). Einschalten nur in den
Einstellungen (Standard aus), Port wird beim Ausschalten/Schließen freigegeben.

### 4.2 C2 – eigenständiges Binary (**gebaut und gemessen**)

`tools/klassenraum/` (eigenes Cargo-Projekt, `Cargo.toml` **ohne jede Abhängigkeit**, eigene `Cargo.lock`,
`.gitignore` für `target/`): `cargo build --release` → **`klassenraum.exe`, 322.560 B**, `cargo test`
**10/10 grün**; HTTP-Probe `C-http-probe.ps1` → **20/20 Messungen bestanden** (201/200/204/400/404/405/409/
413/415/507, 24 parallele Anfragen, Datensparsamkeitsfälle), Port danach frei.

### 4.3 Die gemeinsame Schnittstelle (verbindlich – **Leiterfassung**)

```
GET  /liste?auftrag=NL-XXXX-XX   → 200 {format:"klassenraum-liste", v:1, auftrag, anzahl,
                                        ergebnisse:[{code:"E-…", eingegangen:"<ISO>"}]}
POST /ergebnis                   ← {"auftrag":"NL-XXXX-XX","code":"E-XXXX-XXX"}
                                 → 201 neu / 200 bekannt / 400 / 409 / 413 / 507
OPTIONS beide                    → 204 (Preflight)
```

**Entscheidung des Leiters:** der Server transportiert **nur Codes** – kein `platz`, keine `sterne`, keine
`dauerS`. Der Ergebnis-Code trägt alles (Sitzung, Platz, Sterne, Fehlversuche, Dauer), das Lehrergerät liest
ihn ohnehin mit `ergebnisLesen`. Damit gibt es **eine** Quelle der Wahrheit, keine widersprüchlichen Felder
und keine Möglichkeit, Klarnamen einzuschmuggeln. Der gebaute Entwurf benutzt noch `sitzung`/`platz`/
`sterne`/`dauerS` – **beim Einbau umstellen** (Feld `auftrag` = vollständiger Auftragscode, `code` als
einziges Nutzfeld) und die HTTP-Probe erneut laufen lassen; die Datensparsamkeits-Regeln, Grenzen,
Statuscodes und die Idempotenz des Entwurfs bleiben unverändert gültig.

Feste Werte: Port **47112** (Scan 47113…47121, unterhalb des Windows-Ephemeralbereichs), Bind **0.0.0.0**
(Klassennetz; `--nur-lokal` für Proben), Rumpf ≤ **4096 B** (sonst 413), **5 s** je Verbindung, kein
Keep-Alive, **16** gleichzeitig (503), Lager **4096** (507), CORS `*` + Preflight + 
`Access-Control-Allow-Private-Network: true` (die Einzeldatei hat die Herkunft `null`, die Tauri-Fassung
`http://tauri.localhost` – beide belegt, C § 3.4). **Ohne Server keine Fehlermeldung** – die Live-Fläche
bleibt aus, A und B laufen vollständig.

### 4.4 D – QR-Code auf dem Beamer

Abhängigkeitsfreier eigener Encoder (**alphanumerisch, Version 1, Stufe H**, Maske automatisch), Rückgabe
als **SVG-Data-URI** plus Matrix an die Oberfläche; Inhalt = **genau der Auftragscode** (kein Link, keine
Adresse). Machbarkeit belegt: `cargo build --release` exit 0, `cargo test` **5/5**, Differentialtest gegen
eine unabhängig geschriebene Python-Referenz **25/25 Matrizen gleich und rückkodiert**. Ruhezone 4 Module,
232 px bei 8 px/Modul; zu langer Inhalt ⇒ Abbruch mit Meldung statt stiller Falschkodierung. Nur die
Desktop-Fassung; in Browser/Android bleibt Abtippen der Normalfall. Die Kiste `qrcode` wird **nicht**
gebraucht (und ist derzeit nicht holbar).

---

## 5 · Prüfung und Abnahme

### 5.1 Testplan (40 Fälle, `tests/klassenraum.test.js`)

Eine Gruppe `gruppe("Klassenraum", …)`, jeder Fall genau ein `pruefe(...)`; Hilfen **nur im Rückruf**
(oberste Ebene = LADEFEHLER für alle Tests); Kapsel K rettet `store`/`Spiel._st`/`jetzt` und stellt sie im
`finally` wieder her. Die 40 Fälle im Einzelnen stehen in **D § 1.2**, darunter: Code-Round-Trip mit
identischem Netzkennwert · Seed erreicht wirklich das Netz (Kennwert ≠ feste Fassung) · Determinismus bei
zweimaligem Lesen · **20 Vertipper** (10 Buchstaben-, 10 Ziffernstellen) · 12 × lösbarer Auftrag
(`Spiel.ticketGueltig`) · generierter Auftrag über `skill` · Ergebnis-Code-Round-Trip (inkl. halber Sterne,
Fehlversuche, 10-s-Dauer) · gekippte Prüfsumme abgewiesen · doppeltes Eintragen ändert nichts · fremde
Sitzung abgewiesen · Export/Import verlustfrei und über einen „Neustart" · `{fehler}` statt Ausnahme (17
Unsinnsfälle) · `nl4f7k2q` ≡ `NL-4F7K-2Q` · kein Klarname · eingefrorene Tabellen passen zu
`Spiel.ticketReihe()` (58) und `DATEN.skills` (27).

**Erwartetes Ergebnis: 251 + 40 = 291/291 grün (36 Testdateien, 77 Module); Filter `--klassenraum` 40/40.**

### 5.2 Abnahmebefehle (heute gemessen – keiner darf schlechter werden)

| Befehl | heute | nach dem Einbau |
|---|---|---|
| `node tests/run.js` | 251/251 | **291/291** |
| `node tests/run.js --klassenraum` | 0/0 (erwartet) | **40/40** |
| `python tools/ethos.py` | GRUEN | GRUEN, Dateizahl 21 → 22 erlaubt, keine Regel schlechter |
| `python tools/klassen.py` | 0 | **0** (jede neue Klasse braucht eine CSS-Regel) |
| `node tools/sim-stand.js` | unverändert | unverändert |
| `python bauen.py` · `tools/einfach.py` | Exit 0, byte-gleich | 0 Außenverweise; `docs/index.html` = `Netzwerk-Labor.html` |
| `python tools/einfach.py --pruefen docs/index.html` | GRUEN | GRUEN |
| `sh tools/test.sh --rauch` | **36/36** (Sollwert; hier nicht lauffähig) | 36/36 – die neue Startseiten-Zeile darf keinen Fall treffen |
| `python tools/menueprobe.py … --lauf` | 5 Profile, 49 Kriterien, 0 verletzt (Sollwert) | unverändert |
| `python android/bauen.py` | 7 Schritte, GRUEN (Sollwert; hier scheitert `Programm/` an `DENY (DC)`) | unverändert |

### 5.3 Vorführung (fünf Schritte) und Nachweise

Drehbuch in **D § 3**: Einzeldatei `Netzwerk-Labor.html` per `file://`, **drei** getrennte Edge-Profile
(`--user-data-dir`, Steuerports 9331/9332/9334 – 9333 gehört `starttest.py`), je Schritt Abdruck, Sterne und
Code protokolliert, Fotos nach `Nachweise/Klassenraum/D-vorfuehrung-*.png`, sechs harte Abbruchkriterien.
Der Vergleich der **Klassenraum-Abdrucke** beider Schülergeräte ist der Beweis für „beide bekommen denselben
Auftrag". **In dieser Umgebung nicht ausführbar** (Edge-Sandbox).

### 5.4 Definition of Done

Technisch: die vier neuen Dateien existieren; die drei erlaubten additiven Eingriffe sind im Bericht genannt;
die acht API-Aufrufe stimmen; `ausCode` wirft nie; Determinismus ist über **≥ 20 Seeds × alle
adressierbaren Aufträge × zwei Läufe** gemessen – über den Weg `Spiel.instanzErstellen({…, ohneFlow:true})`;
291/291 und 40/40; Ergebnis-Round-Trip inkl. halber Sterne und Fehlversuche; Idempotenz; fremde Sitzung
abgewiesen; Sitzung in `store "klassenraum"`, Export/Import verlustfrei; `NL-…` klein ohne Striche ≡ groß
mit; **keine Klarnamen**. Sichtbar: alle fünf Vorführschritte **wirklich** durchgespielt, Abdrucke wörtlich
im Bericht, Fotos abgelegt, Startseiten-Eingabe eine untergeordnete Zeile.

---

## 6 · Umsetzung in fünf Sitzungen

| Sitzung | Eingang | Ergebnis | Abnahme | Dauer |
|---|---|---|---|---|
| **A · Verteilen** | heutiger Stand | `src/spiel/klassenraum.js`, `src/ui/klassenraum.js`, `src/stil/klassenraum.css`, `tests/klassenraum.test.js`, Startseiten-Zeile | 291/291 · 40/40 · ethos · klassen 0 · sim-stand | ≈ 1 Sitzung |
| **B · Einsammeln** | A grün | Ergebnis-Code nach der Abnahme, Lehrer-Eingabe (Block, Doppelte), Liste (Platz/Sterne/Dauer/Fehlversuche), Ampel, Export/Import | wie A + Vorführschritte 3–5 | ≈ 1–2 Sitzungen |
| **C1 · Server in der `.exe`** | A und B grün | `shell/src-tauri/src/klassenraum.rs`, zwei Befehle, Schalter (Standard aus) | `cargo tauri build --no-bundle` · `python tools/q-echt.py` · ohne Server alles grün | ≈ 1 Sitzung |
| **C2 · eigenes Binary** | A und B grün (nicht durch C1 bedingt) | `tools/klassenraum/` mit denselben zwei Wegen | `cargo build --release` + HTTP-Probe | ≈ ½ Sitzung |
| **D · QR** | A und B grün | QR als SVG-Data-URI auf dem Beamer, Inhalt = Auftragscode | Encoder-Test + Vergleich mit Referenz | ≈ ½ Sitzung |

**Die drei größten Risiken** (vollständig 18 in D § 4): (1) Startseiten-Zeile bricht den Rauchtest →
Verbote einhalten, `tools/rauch.py` vor dem Melden laufen lassen; (2) Flow-Regler/Einstellungen verändern den
Auftrag je Gerät → `ohneFlow: true`, `Spiel.generiere` ohne `opts.stufe`, Test 3/4; (3) neue CSS-Klasse ohne
Regel → `klassen.py` rot, Klassenliste vor dem Bau abgleichen.

---

## 7 · Entscheidungen des Leiters (aufgelöste offene Punkte)

| # | Frage | Entscheidung |
|---|---|---|
| L1 | Code-Format | A's Fassung ist verbindlich (`NL-XXXX-XX`, `E-XXXX-XXX`, Prüfsumme mod 31/mod 32) |
| L2 | `NL-4F7K-2Q` | Formmuster, **kein** gültiger Code (richtig: `NL-4F7K-E3`); bleibt Platzhalter, Tests weisen es ab |
| L3 | Server-Feldform | **Nur Codes** über die Leitung (`auftrag` + `code`); der gebaute C2-Entwurf wird beim Einbau darauf umgestellt (Kapitel 4.3) |
| L4 | Karriere-Wirkung | **Hauptweg: zulassen** (kein Fremdeingriff, sofort umsetzbar) und im Bericht benennen. *Verschärfung (empfohlen für den Unterricht, **braucht eine Freigabe**): vier Zeilen früher Ausstieg in `src/spiel/abnahme.js` – dann zählt der Klassenraum-Auftrag nicht als erledigt und zahlt keinen Lohn.* |
| L5 | Code-Eingabe auf der Startseite | Haken auf das Bus-Ereignis `ansicht` aus der neuen Datei (kein Fremdeingriff in `hub.js`); die Ein-Zeilen-Variante in `hub.js` bleibt als Option |
| L6 | Platzzahl für die Ampel | Zusatzfunktionen `plaetze()`/`plaetzeSetzen(n)` + Feld `sitzung.plaetze` (1..31｜null) – ohne sie kann die Ampel nie „offen" zeigen |
| L7 | Server-Schalter im Browser | Ansicht entscheidet selbst über `Plattform.name`; `plattform-browser.js` bleibt unangetastet |
| L8 | Tippfehler-Satz | Zwei präzise Sätze (Fremdzeichen / Prüfziffer) statt eines Sammelsatzes; der Auftragssatz bleibt als Zitat dokumentiert |
| L9 | Zusatzfunktionen | `netzkennwert`, `tauglicheFertigkeiten`, `platz/platzSetzen`, `plaetze/plaetzeSetzen` gehören in den Architektur-Vertrag (die acht Auftragsfunktionen bleiben unverändert) |

**Erlaubte Eingriffe in fremde Dateien** (Auftrag + Entscheidungen des Leiters):
`src/ui/app.js` und `src/ui/start.js` additiv, `src/spiel/zustand.js` (nur der Store-Schlüssel), sowie
**nur mit ausdrücklicher Freigabe** vier Zeilen in `src/spiel/abnahme.js` (L4-Verschärfung). Alles andere
bleibt unberührt.

---

## 8 · Was nicht geprüft ist (ehrlich)

* **Keine echte Vorführung, kein Rauchtest, keine Menüprobe, keine Screenshots** – Edge läuft in dieser
  Sandbox nicht (Kapitel 0). Der Beweis „zwei Geräte, gleicher Auftrag" ist über zwei getrennte
  **Node-Prozesse** geführt, nicht über zwei Browser oder ein Telefon.
* **C1 ist nicht gebaut** (nur Anleitung): der Laufzeitbeweis der Capability-Regel und das
  Firewall-Verhalten fehlen; der echte Browser-/CORS-Wirklauf fehlt; nur `127.0.0.1`, kein Klassennetz.
* **Kein Handy-Scan** des QR-Codes (kein Fremdscanner verfügbar); die Strafregel-Auslegung des QR-Standards
  ist nicht abschließend entschieden; Versionen ≥ 5 und Kanji sind nicht abgedeckt.
* **Nicht gemessen:** Kollisionswahrscheinlichkeit des 6-Zeichen-Abdrucks, Kanonisierungszweig
  `0 < k < 64` (nie aufgetreten), nicht benachbarte Zeichenvertauschungen, `erzeugen` mit Zufallsvariante
  über viele Sitzungen, `Spiel.generiereForm`.
* **Android-Bau** scheitert hier an `Programm/` (`icacls`: `Jeder:(I)(CI)(DENY)(DC)`) – nicht am Klassenraum.

---

## 9 · Vorschläge für `Architektur.md` und `CHANGELOG.md`

Fertig zitierfähig in **D § 8 und § 9**: neuer Paragraph **§ 12 „Klassenraum (Lehrer/Schüler, Hobby-Ebene)"**
hinter Zeile 815 (nach § 11.7), mit Datenform `store "klassenraum"`, API-Tabelle (acht + Zusatzfunktionen),
Fehlerformen, Messform des Abdrucks, den zwei Endpunkten, QR-Weg und den bewussten Grenzen; dazu ein
Nachtrag zu **§ 7.4** (fünfter Store-Schlüssel). Changelog-Eintrag als `## 1.2.3 — Klassenraum (in Arbeit)`.
Beides ist **nicht** eingetragen – Vorschläge, keine Änderungen.

**Bewusste Vereinfachungen** (Auftrag, geschärft): kein Schutz gegen Abschreiben (wer den Code hat, hat den
Auftrag – gewollt), keine Identität (nur Platz-Kennungen, keine Klarnamen), keine Zeit-/Sperrlogik, keine
Serverpflicht, kein QR in der Browser-Fassung, keine Auswertung über die Ampel hinaus, keine
Mehrfach-Sitzungen gleichzeitig, nur 24 von 27 Fertigkeiten adressierbar, 3 Terminal-Aufträge ohne
Varianten, 32 Sitzungskennungen, 32 Plätze.
