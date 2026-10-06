---
tags: [Netzwerk-Labor, Klassenraum, C1, Entwurf]
erstellt: 2026-10-06
status: Entwurf (umsetzungsreif, nichts davon gebaut)
---

# C1 – Einbau des optionalen HTTP-Servers in die Tauri-2-Hülle

**Auftrag:** `tools/auftraege/KLASSENRAUM.md:46` (Stufe C1) — die Desktop-`.exe` selbst hört im lokalen
Netz auf einem Port und hat **genau zwei** Endpunkte: `GET /liste` und `POST /ergebnis`. Einschalten in
den Einstellungen, **Standard aus**, ehrlicher Hinweis auf die Windows-Firewall-Abfrage. Nur die
Desktop-Fassung kann das.

**Zustand dieser Datei:** reiner Entwurf. Es wurde **nichts** an `shell/`, `src/`, `tests/`, `bauen.py`,
`.gitignore`, `docs/**` oder bestehenden `tools/*.py` geändert. Jede Änderung an `shell/` steht hier
nur als Vorschlag mit Datei:Zeile und Zitat des heutigen Textes.

## 0 · Abkürzungen und Belege

| Kürzel | Datei:Zeile | heutiger Text (Zitat) |
|---|---|---|
| M5–7 | `shell/src-tauri/src/main.rs:5-7` | `mod fenster;` / `mod speicher;` / `mod tray;` |
| M147 | `shell/src-tauri/src/main.rs:147` | `.invoke_handler(tauri::generate_handler![speichern, fenster_modus, fenster_groesse, fenster_ecke, fenster_zustand, immer_oben, abzeichen,` |
| M148 | `shell/src-tauri/src/main.rs:148` | `autostart, autostart_status, exportieren, importieren, plattform_info, ruhe, beenden, selbsttest_ergebnis])` |
| M199 | `shell/src-tauri/src/main.rs:199` | `})` (Ende von `.setup(...)`) |
| F444–468 | `shell/src-tauri/src/fenster.rs:444-468` | `pub fn info(st: &Labor, hotkey_ok: bool) -> Value {` … letzte `setze(...)`-Zeile |
| F469–473 | `shell/src-tauri/src/fenster.rs:469-473` | `json!({` … `"kann": kann, "gruende": gruende,` … `})` |
| CAP | `shell/src-tauri/capabilities/main.json:1-10` | `"description": "… Eigene Befehle sind ohne Freigabe erlaubt."`, `"permissions": ["core:default", "core:window:allow-start-dragging"]` |
| TCONF | `shell/src-tauri/tauri.conf.json:9-15` | `"withGlobalTauri": true`, `"windows": []`, `"csp": null` |
| CARGO | `shell/src-tauri/Cargo.toml:15-22` | `tauri = { version = "2", features = ["tray-icon", "image-png"] }` … `serde_json = "1"` |

**Werkzeuge, die ich benutzt habe (Ergebnisse in § 2 und § 9):** `read` (alle in der Aufgabe genannten
Dateien, vollständig), `Select-String`/rekursive Volltextsuche in `shell/src-tauri/` (ohne `target/`),
`git rev-parse`, `git status --porcelain`, `git ls-files --eol`, `cargo --version`, `cargo tauri --version`,
`Test-Path`, `Get-ChildItem`.

**Nicht ausgeführt (Auflage):** `python tools/repo-verweise-flicken.py` · kein `git commit/push/reset` ·
kein Zweigwechsel · kein Prozess beendet · nichts installiert · **kein** `cargo build`/`cargo test` ·
die Proben in `tools/klassenraum-probe/` nicht gestartet.

**Zweig (gemessen):** `git rev-parse --abbrev-ref HEAD` → `ausbau-1.2`.
`git status --porcelain` → nur unverfolgte Neueingänge, keine geänderte Datei:
`?? docs/entwicklung/Klassenraum – Umsetzungsreife Spezifikation.md`, `?? docs/entwicklung/Klassenraum/`,
`?? tools/auftraege/KLASSENRAUM.md`, `?? tools/klassenraum-probe/`, `?? tools/klassenraum/`.

> [!warning] Der Vertrag von C2 liegt seit heute Abend vor — C1 muss ihn spiegeln
> Beim Lesen entstanden (nicht durch mich): `tools/klassenraum/src/main.rs` (518 Zeilen, 06.10.2026 23:19),
> `http.rs`, `json.rs`, `lager.rs` — die **C2**-Fassung. Ihr Kopf sagt ausdrücklich: „gleiche Datenform wie
> die eingebaute Fassung (C1) in der Tauri-Hülle" (`tools/klassenraum/src/main.rs:3-4`). Deshalb sind Port,
> Endpunktpfade, Statuscodes, Feldnamen und Fehlertexte in § 4/§ 5 **wörtlich von dort übernommen**, damit
> beide Bauformen im Klassenzimmer austauschbar sind. Das ist die einzige Stelle, an der ich etwas
> „festlege", das ich nicht selbst gemessen habe — die Quelle ist Datei:Zeile angegeben.

**Warum die Zahlen in § 1 stimmen:** gelesen wurde `shell/src-tauri/src/main.rs` mit 202 Zeilen,
`fenster.rs` mit 474, `speicher.rs` mit 171, `tray.rs` mit 136 Zeilen (jeweils Kopfzeile der `read`-Ausgabe).
`git ls-files --eol` für alle neun gelesenen Dateien: `i/lf  w/lf  attr/text=auto eol=lf` — im Arbeitsbaum
liegt alles auf LF (`.gitattributes:3`: `* text=auto eol=lf`). Die neue Datei hier ist UTF-8 mit LF.

---

## 1 · Änderungsliste `shell/src-tauri/src/main.rs` (jede Zeile: heute → neu)

Der Vertrag aus § 0 verlangt: **eine** neue Datei `shell/src-tauri/src/klassenraum.rs`, keine Änderung an
`Labor`, keine Änderung an `setup()`. In `main.rs` sind dafür **genau drei** Stellen anzufassen:
eine neue `mod`-Zeile, die `invoke_handler`-Liste und (Empfehlung) `fn beenden`.

### 1.1 Neue `mod`-Zeile — nach `main.rs:7`

| | Zeile | Text |
|---|---|---|
| heute | 5 | `mod fenster;` |
| heute | 6 | `mod speicher;` |
| heute | 7 | `mod tray;` |
| **neu** | **8** | `mod klassenraum;` |

Alle bisherigen Zeilen 8–202 rutschen um **eine** Zeile nach unten. Alphabetisch gehört `klassenraum` zwischen
`fenster` (5) und `speicher` (6); ich setze es trotzdem **ans Ende** (nach 7), damit keine bestehende
Zeilennummer wandert — die Änderung bleibt dann ein reiner Anhang. Begründung im Code:
`shell/src-tauri/src/klassenraum.rs` liegt neben `fenster.rs`/`speicher.rs`/`tray.rs`; `Cargo.toml:8-10`
setzt `path = "src/main.rs"`, ein `mod klassenraum;` findet also `src/klassenraum.rs`.

### 1.2 `invoke_handler`-Liste — heute `main.rs:147-148`

Heute (wörtlich, zwei Zeilen):

```rust
        .invoke_handler(tauri::generate_handler![speichern, fenster_modus, fenster_groesse, fenster_ecke, fenster_zustand, immer_oben, abzeichen,
            autostart, autostart_status, exportieren, importieren, plattform_info, ruhe, beenden, selbsttest_ergebnis])
```

Neu (drei Zeilen; die zwei Befehlsnamen kommen **hinten** an, damit die Zeile 147 unverändert bleibt):

```rust
        .invoke_handler(tauri::generate_handler![speichern, fenster_modus, fenster_groesse, fenster_ecke, fenster_zustand, immer_oben, abzeichen,
            autostart, autostart_status, exportieren, importieren, plattform_info, ruhe, beenden, selbsttest_ergebnis,
            klassenraum_server, klassenraum_status])
```

Zeilenbilanz dieser Stelle: heute 147–148, neu 148–150 (weil § 1.1 eine Zeile davor einfügt).
Ab `main.rs:149` (`.setup(move |app| {`) verschiebt sich also alles um **zwei** Zeilen.

### 1.3 Muss `setup()` angefasst werden? **Nein.**

`setup()` (`main.rs:149-199`) braucht **keine** Zeile:

* Der Server ist **standardmäßig aus**. Es gibt nichts zu starten und nichts zu laden; ein Zustand „aus" ist
  in § 3 als `None` abgebildet und braucht keine Initialisierung.
* Es wird **kein** Feld in `Labor` (`main.rs:24-41`) ergänzt, und `app.manage(...)` (`main.rs:158-164`) bleibt
  unverändert. Der Serverzustand hängt an einem `static` in `klassenraum.rs` (§ 3).
* `fenster::info` wird in `setup()` zweimal gerufen (`main.rs:172` und `main.rs:124`). Die Signatur
  `info(&Labor, bool)` bleibt gleich (§ 4), die Aufrufe bleiben also gültig.
* Optional (nicht nötig): eine Zeile `let _ = klassenraum::stoppen();` vor `Ok(())` (`main.rs:198`) als
  „Gürtel und Hosenträger". Ich lasse sie weg — ein frischer Prozess hat nie einen laufenden Horcher.

### 1.4 Empfehlung: `fn beenden` — heute `main.rs:113-117`

Heute (wörtlich):

```rust
#[tauri::command]
fn beenden(app: AppHandle) {
    fenster::merker_schreiben(&app);
    app.exit(0);
}
```

Neu (eine Zeile mehr):

```rust
#[tauri::command]
fn beenden(app: AppHandle) {
    klassenraum::stoppen();
    fenster::merker_schreiben(&app);
    app.exit(0);
}
```

Warum nur hier: `beenden` ist der einzige **wirklich erreichbare** Beenden-Pfad, der über einen Befehl
läuft — `plattform-tauri.js:23` (Seite bei `labor-beenden`) und `:60` (`Plattform.fenster.beenden`) rufen
ihn. Der andere Pfad ist `fenster::beenden_anfragen` (`fenster.rs:331-342`): es sendet `labor-beenden`,
die Seite ruft darauf `beenden`, das ist genau der Aufruf oben; nach 4 s beendet
`a.exit(0)` (`fenster.rs:340`) den Prozess auch ohne Antwort. In diesem Notfall räumt das Betriebssystem die
Sockets ab (§ 7) — die Zeile ist also eine Verbesserung, keine Bedingung. Sie ist die **einzige** Zeile in
`beenden`, die ich vorschlage; alles andere an den Beenden-Pfaden bleibt unangetastet.

### 1.5 Was in `main.rs` **nicht** angefasst wird

* `use`-Zeilen `main.rs:9-21` — `klassenraum.rs` bringt seine eigenen `use`-Zeilen mit.
* `struct Labor` `main.rs:24-41`, `fn st` `main.rs:43-45`, alle 15 bestehenden Befehle `main.rs:48-131`.
* `.plugin(...)`-Kette `main.rs:141-146`, `.setup(...)` `main.rs:149-199`, `.run(...)` `main.rs:200-201`.
* `shell/src-tauri/Cargo.toml`: **keine** neue Abhängigkeit. `serde_json` (`Cargo.toml:22`) und `tauri`
  (`:16`) genügen; `std::net` und `std::sync` sind Standardbibliothek. Kein `tauri-plugin-*` nötig.
* `shell/src-tauri/tauri.conf.json`: **keine** Änderung. `"withGlobalTauri": true` (`:10`) und `"csp": null`
  (`:13`) bleiben; der Server spricht HTTP nach außen, nicht in die WebView hinein.

---

## 2 · Capabilities/Rechte: brauchen eigene `#[tauri::command]`-Befehle eine Freigabe? **Nein.**

**Klare Antwort: Änderung nötig — nein.** Weder `capabilities/main.json` noch sonst eine Datei unter
`capabilities/` muss angefasst werden. Drei Belege:

1. **Die Projektdatei sagt es selbst.** `capabilities/main.json:4` (wörtlich):
   `"description": "Hauptfenster: Ereignisse, Fenster ziehen (data-tauri-drag-region). Eigene Befehle sind ohne Freigabe erlaubt."`
   `capabilities/main.json:6-9`: `"permissions": ["core:default", "core:window:allow-start-dragging"]`.
   Die vorhandenen Freigaben sind ausschließlich Kern-Befehle des Fensters — keine eigenen Befehle.
2. **Kein eigener Befehlsname kommt irgendwo als Berechtigung vor.** Gemessen:
   * In `shell/src-tauri/gen/schemas/` (4 Dateien: `acl-manifests.json` 72631 B, `capabilities.json` 254 B,
     `desktop-schema.json` 127329 B, `windows-schema.json` 127329 B) suchte ich nach
     `speichern|fenster_modus|fenster_groesse|fenster_ecke|fenster_zustand|immer_oben|autostart_status|plattform_info|selbsttest_ergebnis|abzeichen`
     → **0 Treffer**.
   * Zählung der Zeichenketten `"speichern"`, `"fenster_modus"`, `"fenster_groesse"`, `"fenster_ecke"`,
     `"fenster_zustand"`, `"immer_oben"`, `"abzeichen"`, `"autostart_status"`, `"exportieren"`,
     `"importieren"`, `"plattform_info"`, `"ruhe"`, `"beenden"`, `"selbsttest_ergebnis"` in
     `gen/schemas/desktop-schema.json` → **je 0 Treffer** (ebenso die Probe `"klassenraum"` → 0). Die
     15 heute registrierten Befehle (`main.rs:147-148`) tauchen dort also **nicht** auf — und die Hülle
     läuft nachweislich (es gibt `Programm/Netzwerk-Labor.exe`; dass die Befehle wirken, zeigt jede Runde
     `pwsh -File shell/entwickeln.ps1`).
   * `gen/schemas/acl-manifests.json` enthält als Manifest-Schlüssel genau:
     `autostart · core · core:app · core:event · core:image · core:menu · core:path · core:resources ·
     core:tray · core:webview · core:window · dialog · global-shortcut` — nur Kern und **Plugins**, kein
     Anwendungsbefehl.
3. **`gen/schemas/` ist gar nicht bearbeitbar.** `.gitignore:3` führt `shell/src-tauri/gen/`; die Dateien
   werden bei jedem Bau aus `capabilities/` neu erzeugt. Eine Handänderung dort wäre beim nächsten
   `cargo build` weg. (Die Dateien sind da — ich habe sie gelesen —, aber sie sind Erzeugnisse.)

**Grenze dieser Aussage (ehrlich):** Ich habe die Tauri-Regel „Anwendungsbefehle brauchen keine
Capability" **nicht im Programm nachgemessen** — sie steht in `capabilities/main.json:4` und deckt sich mit
der Beobachtung, dass keiner der 15 eigenen Befehle in den erzeugten Schemata auftaucht. Ein Laufzeitbeweis
mit einem **neuen** Befehl fehlt (er wäre erst nach dem Einbau möglich) und steht in § 8.

**Sicherheitshinweis, der dazugehört:** `capabilities/main.json:5` bindet die Freigaben an
`"windows": ["main"]`. Das ist eine **Grenze für die Seite**, kein Schutz des Servers: Wer im Klassennetz
ist, darf lesen und schreiben — genau so steht es im C2-Kopf (`tools/klassenraum/src/main.rs:14-15`:
„Kein Zugriffsschutz: Wer im Klassennetz ist, darf lesen und schreiben."). C1 erbt diese bewusste Grenze.

---

## 3 · Serverzustand: `OnceLock<Mutex<Option<…>>>` in `klassenraum.rs`, Portgabe über `Drop`

### 3.1 Warum **nicht** als Feld in `struct Labor`

`struct Labor` (`main.rs:24-41`, 15 Felder) wird an genau drei Stellen gefüllt/benutzt: Definition,
`app.manage(Labor { … })` (`main.rs:158-164`) und `app.state::<Labor>()` (`main.rs:43-45`). Ein neues Feld
hieße: Feld deklarieren, im `manage`-Block initialisieren, und `klassenraum.rs` müsste über
`st(&app).klassenraum` an einen `Mutex` kommen, den es selbst nicht braucht. Drei Änderungen statt null —
und `Labor` ist ausdrücklich „Zustand der Hülle (für fenster.rs und tray.rs)" (`main.rs:23`).
Der Serverzustand gehört niemandem davon.

**Vorschlag:** ein `static` **in** `klassenraum.rs`. Damit bleibt `main.rs` bei den drei Stellen aus § 1,
und `fenster::info` kommt ohne `AppHandle` an den Zustand (es bekommt nur `&Labor`, `fenster.rs:444`).

### 3.2 Der Zustand (Vorschlag, vollständig)

```rust
// shell/src-tauri/src/klassenraum.rs  (neu)
use serde_json::{json, Value};
use std::{
    io::{BufRead, BufReader, ErrorKind, Read, Write},
    net::{IpAddr, Ipv4Addr, SocketAddr, TcpListener, TcpStream, UdpSocket},
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, AtomicUsize, Ordering::SeqCst},
        Arc, Mutex, OnceLock,
    },
    time::{Duration, SystemTime, UNIX_EPOCH},
};

/// Vorgabeport und Nachbarports – identisch zu C2 (`tools/klassenraum/src/main.rs:34-36,207-220`).
const PORT: u16 = 47112;
const PORT_VERSUCHE: u16 = 10;

/// Ein laufender Server. Es gibt höchstens einen je Programm.
struct Server {
    port: u16,
    bind: Ipv4Addr,
    sitzung: Option<String>,
    ablage: Option<PathBuf>,
    /// `true` = dieser Server hat den Horcher geschlossen; sein Faden beendet sich von selbst.
    stop: Arc<AtomicBool>,
    /// Läuft der Faden noch? (Zählwerk; § 3.4)
    lebt: Arc<AtomicBool>,
    anzahl: Arc<AtomicUsize>,
}

/// Der eine Zustand. `None` = aus (so startet das Programm: Standard aus).
static ZUSTAND: OnceLock<Mutex<Option<Server>>> = OnceLock::new();

fn zustand() -> &'static Mutex<Option<Server>> {
    ZUSTAND.get_or_init(|| Mutex::new(None))
}
```

### 3.3 Einschalten (`klassenraum_server` mit `an: true`)

```rust
fn starten(an: bool, port: Option<u16>, nur_lokal: Option<bool>, sitzung: Option<String>,
           ablage: Option<PathBuf>, anzahl: Arc<AtomicUsize>) -> Result<Value, String> {
    if !an {
        return stoppen_intern();
    }
    /* Doppelt einschalten ist kein Fehler: erst aus, dann neu binden (Port kann wechseln). */
    let _ = stoppen_intern();

    let bind = if nur_lokal.unwrap_or(false) { Ipv4Addr::LOCALHOST } else { Ipv4Addr::UNSPECIFIED };
    let start = port.unwrap_or(PORT).max(1024);
    let mut letzter = String::from("kein Versuch");
    let mut treffer = None;
    for p in start..start.saturating_add(PORT_VERSUCHE) {
        let adresse = SocketAddr::new(IpAddr::V4(bind), p);
        match TcpListener::bind(adresse) {
            Ok(l) => { treffer = Some((l, p)); break; }
            Err(f) => letzter = format!("{adresse}: {f}"),
        }
    }
    let Some((horcher, p)) = treffer else {
        return Err(format!("Kein freier Port in {start}..{} gefunden. Letzter Fehler: {letzter}",
                           start.saturating_add(PORT_VERSUCHE - 1)));
    };

    /* Nicht blockieren: der Annahme-Faden schläft 40 ms und sieht so das Abbruchflag. */
    horcher.set_nonblocking(true).map_err(|f| format!("set_nonblocking: {f}"))?;

    let stop = Arc::new(AtomicBool::new(false));
    let lebt = Arc::new(AtomicBool::new(true));
    let s = Server {
        port: p, bind, sitzung, ablage,
        stop: stop.clone(), lebt: lebt.clone(), anzahl: anzahl.clone(),
    };
    *zustand().lock().unwrap_or_else(|e| e.into_inner()) = Some(s);

    let (h, st, lb, lager) = (horcher, stop, lebt, anzahl);
    std::thread::spawn(move || annehmen(h, st, lb, lager));
    Ok(status_json())
}
```

**Der Port wird sichtbar:** Weil der tatsächlich gebundene Port zurückgemeldet wird, weiß die Oberfläche
sofort, welche Adresse sie an die Tafel schreibt — auch wenn 47112 belegt war und 47113 genommen wurde.
Ports unter 1024 lehnt der Befehl ab (wie C2, `tools/klassenraum/src/main.rs:182-184`).

### 3.4 Der Annahme-Faden

```rust
const MAX_VERBINDUNGEN: usize = 16;   /* wie C2: tools/klassenraum/src/main.rs:38 */
const WARTE_MS: u64 = 40;             /* wie C2: tools/klassenraum/src/main.rs:40 */

fn annehmen(horcher: TcpListener, stop: Arc<AtomicBool>, lebt: Arc<AtomicBool>, lager: Arc<AtomicUsize>) {
    let mut aktiv: usize = 0;
    while !stop.load(SeqCst) {
        match horcher.accept() {
            Ok((strom, _peer)) => {
                if aktiv >= MAX_VERBINDUNGEN {
                    /* 503 statt Warteschlange: der Klassenraum stellt ein Dutzend Anfragen. */
                    let mut s = strom;
                    let _ = http_antworten(&mut s, 503, "Service Unavailable",
                                           &fehler_json("Zu viele gleichzeitige Anfragen"), false,
                                           &[("Retry-After", "2")]);
                    continue;
                }
                aktiv += 1;
                let l = lager.clone();
                std::thread::spawn(move || { /* … */ });
            }
            Err(f) if f.kind() == ErrorKind::WouldBlock => std::thread::sleep(Duration::from_millis(WARTE_MS)),
            Err(f) => { let _ = f; std::thread::sleep(Duration::from_millis(WARTE_MS)); }
        }
    }
    lebt.store(false, SeqCst);   /* für § 7: „Port ist wieder frei" ist damit belegbar */
}
```

Das Zählwerk `aktiv` muss dabei vom Arbeitsfaden wieder **verringert** werden; sauber geht das mit einem
`Arc<AtomicUsize>` statt einer lokalen Variablen (im Beispiel oben zur Lesbarkeit als `usize` gezeigt).
`lebt` ist kein Beiwerk: es macht das Freigeben des Ports **nachprüfbar** (der Befehl `klassenraum_status`
kann so lange `"laeuft": true, "freiInKuerze": true` melden, bis der Faden wirklich weg ist).

### 3.5 Ausschalten — Port sofort frei (`stoppen_intern`)

```rust
/// Horcher schließen und Zustand leeren. Gibt zurück, was danach gilt.
fn stoppen_intern() -> Result<Value, String> {
    let alt = zustand().lock().unwrap_or_else(|e| e.into_inner()).take();
    if let Some(s) = alt {
        /* 1. Abbruchflag setzen: der Faden verlässt die Schleife beim nächsten Durchlauf. */
        s.stop.store(true, SeqCst);
        /* 2. Der Horcher fällt hier aus dem Server und wird geschlossen (Drop) → Port sofort frei.
              Ob der Faden schon fertig ist, spielt keine Rolle mehr. */
    }
    Ok(status_json())
}
```

**Warum das den Port wirklich freigibt — die vier Punkte der Reihe nach:**

1. `stop = true` → der Faden sieht das Flag spätestens nach `WARTE_MS` (40 ms) und verlässt `while`.
2. Der `TcpListener` liegt im `Server`. `take()` holt den Server aus dem `Option`, der `Server` wird am
   Ende des Blocks fallen gelassen, damit auch der `TcpListener` → `closesocket()`. **Der Port ist frei,
   sobald `Drop` gelaufen ist**, unabhängig davon, ob der Faden schon ausgestiegen ist.
3. `set_nonblocking(true)` ist die Voraussetzung dafür, dass Punkt 1 überhaupt greift: blockierte
   `accept()` würde das Flag nie sehen. Deshalb steht `set_nonblocking` **vor** dem Fadenstart.
4. Der **Drop allein** würde genügen, um den Port freizugeben — das Flag ist dafür da, dass der Faden
   nicht bis zum Programmende als Leiche weiterläuft und bei einem schnellen Aus-Ein `accept()`-Fehler
   ins Leere meldet.

**Was ich nicht behaupte:** ob nach einem harten Abbruch (Task-Manager) eine `TIME_WAIT`-Zeit auf dem Port
liegt, hängt von den offenen Verbindungen und vom Betriebssystem ab. `std::net::TcpListener` kann
`SO_REUSEADDR` nicht setzen (dafür bräuchte es `socket2` oder `windows-sys`; `Cargo.toml:25` hat
`windows-sys` bereits, aber ohne `Win32_Networking_WinSock`). Für den Regelfall (Port wird freiwillig
freigegeben) ist das ohne Bedeutung; im Fehlerfall probiert C1 die nächsten 9 Ports durch und sagt die
Nummer an. Das steht als offener Punkt in § 8.

### 3.6 Aus- und wieder Ein in einem Zug

`starten(an = true, …)` ruft zuerst `stoppen_intern()`. Läuft der alte Faden noch im 40-ms-Schlaf, kann
er **nicht** den neuen Server abwürgen: sein `stop`-Flag ist ein eigenes `Arc` und zeigt auf den alten
`Server`. Der neue Faden hat ein frisches Flag. Es gibt also keinen Zustand, in dem ein alter Faden den
neuen Horcher schließt.

---

## 4 · Vorschlag für `fenster.rs` `info()`: neue Fähigkeit `klassenraum`

### 4.1 Einfügestelle: `fenster.rs:468` / `:469`

Heute (wörtlich, `fenster.rs:468-469`):

```rust
    setze("benachrichtigen", false, Some("Systemmitteilungen sind nicht eingebaut. Neue Tickets zeigt der Punkt am Tray-Symbol – ohne Ton und ohne Pop-up."));
    json!({
```

Neu — **eine** Zeile dazwischen (alles andere bleibt):

```rust
    setze("benachrichtigen", false, Some("Systemmitteilungen sind nicht eingebaut. Neue Tickets zeigt der Punkt am Tray-Symbol – ohne Ton und ohne Pop-up."));
    let kr = crate::klassenraum::status();
    setze("klassenraum", kr.an, kr.grund.as_deref());
    json!({
```

### 4.2 Begründungstext (deutsch, ehrlich)

* `an = true` (Server läuft): **kein** Grund-Text. Muster der Datei: `setze("leiste", true, wayland.then_some(…))`
  (`fenster.rs:455`) — ein Grund erscheint nur, wenn etwas fehlt oder eingeschränkt ist.
* `an = false` (Standard): `"Der Live-Server für den Klassenraum ist aus. Du kannst ihn in den Einstellungen einschalten; nur das Desktop-Programm kann das — im Browser und auf Android gibt es keinen Server."`
* Läuft er, aber nicht im Klassennetz (nur lokal gebunden): `"Der Klassenraum-Server läuft, hört aber nur auf diesem Rechner (127.0.0.1). Andere Geräte im Klassennetz erreichen ihn nicht."`

`crate::klassenraum::status()` liefert dafür ein kleines `struct KlassenraumInfo { an: bool, grund: Option<String> }`.
`info()` behält seine Signatur `pub fn info(st: &Labor, hotkey_ok: bool) -> Value` (`fenster.rs:444`) —
deshalb bleiben alle drei Aufrufe gültig, ohne Änderung: `main.rs:107`, `main.rs:124`, `main.rs:172`.

### 4.3 Wirkt die neue Fähigkeit ohne Oberflächen-Änderung? **Nein — und das ist gut so.**

`plattform-tauri.js:76-80`:

```js
    kann(f){
      if (!info || !info.kann || !(f in info.kann)) return {ja: true, grund: null};
```

Ein unbekannter Fähigkeitsname gilt heute als „kann" — solange die Oberfläche die Zeile nicht selbst
abfragt, ändert die neue Zeile in `info()` also **nichts** am Verhalten. Erst der Einbau in den
Einstellungen (§ 6) liest `Plattform.kann("klassenraum")` und sperrt die Zeile mit Grund, genau wie
„Mit dem Computer starten" es über `Plattform.kann("autostart")` tut (`app.js:332-335`).

### 4.4 Die ehrliche Grenze — genau ein Satz für die Oberfläche

> **Nur das Desktop-Programm kann das.** Im Browser und auf Android gibt es keinen Server: Dort bleibt das
> Abtippen des Ergebnis-Codes der Weg. Wenn die Firewall die `.exe` nicht durchlässt, gibt es zusätzlich
> `tools/klassenraum/` als eigenständiges Programm mit denselben zwei Endpunkten (Stufe C2).

Das ist die Grenze aus `KLASSENRAUM.md:46` („Nur die Desktop-Fassung kann das — Browser und Android
nicht.") und `:48` („Ohne ihn müssen A und B vollständig funktionieren").

---

## 5 · Ehrlicher deutscher Text für die Windows-Firewall-Abfrage

Anzuzeigen **beim ersten Einschalten**, vor dem Klick auf den Schalter (ein Hinweis, keine Warnung), und
danach dauerhaft klein unter der Zeile. Wortlaut zum Abschreiben:

> **Windows fragt einmal nach.**
> Beim ersten Einschalten fragt Windows: *„Windows-Sicherheitshinweis für Netzwerk-Labor"* — mit dem Pfad
> der Programmdatei und zwei Schaltflächen. Klicke **„Zugriff zulassen"**. Dann darf das Programm im
> Klassennetz erreichbar sein; die Anfrage ist danach nicht mehr zu sehen.
> **Wenn du ablehnst:** Das Programm läuft normal weiter, aber kein Schülergerät kommt an. Der Server
> meldet keinen Fehler — er hört ja. Schalte den Server einmal aus und wieder ein, dann fragt Windows
> erneut. Bleibt es gesperrt, lösche die Regel in *Windows-Sicherheitscenter → Firewall und
> Netzwerkschutz → Apps durch die Firewall zulassen* und schalte erneut ein.
> **Zwei Stolpersteine:** Nimm nur **private Netzwerke** (das Schul-LAN). Ist das Netz in Windows als
> **„Öffentlich"** eingestuft, blockt Windows trotz erlaubter App — dann hilft nur, das Netz als privat
> einzustufen (macht die Schul-IT) oder Stufe C2 zu benutzen (`tools/klassenraum/`).

**Was im Fenster sonst noch stehen sollte (drei Zeilen, ehrlich):**

* „Der Server ist **standardmäßig aus**. Er läuft nur, solange du ihn eingeschaltet lässt, und nur im
  lokalen Netz — kein Internet, keine Cloud."
* „Gespeichert werden **nur Platzkennungen, Sterne, Dauer und der Ergebnis-Code**. Kein Name, keine
  Gerätekennung, keine IP-Adresse." (Quelle der Regel: `tools/klassenraum/src/main.rs:12-14`, erzwungen
  durch die Zeichensatzprüfung `:470-475`.)
* „**Kein Schutz:** Wer im Klassennetz ist, kann Ergebnisse lesen und abgeben." (Quelle:
  `tools/klassenraum/src/main.rs:14-15`.) Das gehört in den Hinweis, nicht nur in den Quelltext.

**Nicht geprüft:** den genauen Wortlaut des Windows-Dialogs (Titel, Schaltflächenbeschriftung) habe ich in
dieser Sitzung **nicht** gesehen. Er hängt von Windows-Fassung und Anzeigesprache ab. Der Text oben
beschreibt den Ablauf so, wie er für eine nicht signierte `.exe` üblich ist — er ist als **Vorschlag**
markiert und muss beim ersten echten Einschalten am Bildschirm nachgezogen werden (§ 8, Punkt 1).

---

## 6 · Einbau in die Einstellungen (Standard: aus)

### 6.1 Zwei neue Befehle (Namen, Argumente, Rückgabe)

**`klassenraum_server`**

| Argument | Typ | Vorgabe | Bedeutung |
|---|---|---|---|
| `an` | `bool` | — | `true` = einschalten, `false` = ausschalten |
| `port` | `number?` | `47112` | Wunschport; belegt → die nächsten 9 Ports |
| `nurLokal` | `bool?` | `false` | `true` = nur `127.0.0.1` (Ausprobieren, keine Firewall-Abfrage) |
| `sitzung` | `string?` | `null` | nur diese Sitzung annehmen (andere → `409`) |
| `ablage` | `string?` | Datenordner/`klassenraum-lager.json` | Ergebnislager zusätzlich als Datei |

**`klassenraum_status`** — keine Argumente.

**Rückgabe (Zustand), beide Befehle, identisch:**

```json
{
  "an": true,
  "laeuft": true,
  "port": 47112,
  "bind": "0.0.0.0",
  "lokal": "http://127.0.0.1:47112/liste",
  "klassennetz": "http://192.168.1.23:47112/liste",
  "sitzung": "NL-4F7K",
  "anzahl": 3,
  "forderungen": 41,
  "letzterFehler": null
}
```

* `Klassennetz` darf `null` sein, wenn keine IPv4-Adresse außer `127.0.0.1` gefunden wird. Ermittlung wie
  in C2 (`tools/klassenraum/src/main.rs:222-231`): ein UDP-Socket wird nur **verbunden** (dabei geht kein
  Paket hinaus), danach kennt das System die benutzte Quelladresse. **Keine** neue Abhängigkeit.
* `letzterFehler` ist der Text der letzten fehlgeschlagenen Annahme oder des letzten abgelehnten
  Ergebnisses (für die Fehlersuche; `null`, wenn nichts vorfiel).
* Fehler (kein freier Port): der Befehl antwortet als **Ablehnung** (`Result<Value, String>`), die
  Oberfläche zeigt den Text als Hinweis — dasselbe Muster wie beim Autostart (`app.js:333`:
  `UI.toast(\`Autostart ließ sich nicht ändern: …\`, "fehler")`).

### 6.2 Plattform-Schicht (`src/plattform/plattform-tauri.js`)

Heute endet `plattform-tauri.js:70-71` mit

```js
    autostart: an => invoke("autostart", {an: !!an}),
    autostartStatus: () => invoke("autostart_status"),
```

Vorschlag: direkt darunter zwei Zeilen, exakt im selben Muster (nichts Bestehendes ändern):

```js
    klassenraum: (an, o) => invoke("klassenraum_server", Object.assign({an: !!an}, o || {})),
    klassenraumStatus: () => invoke("klassenraum_status"),
```

Und in der **Browser**-Fassung (`src/plattform/plattform-browser.js` — von mir **nicht gelesen**)
sinngemäß: `klassenraum: () => Promise.reject(new Error("Nur im Desktop-Programm")),` und
`klassenraumStatus: () => Promise.resolve({an: false, laeuft: false, port: null})`.
**Nicht geprüft:** wie die Browser-Fassung heute aufgerufene, aber fehlende Methoden behandelt.

### 6.3 Einstellungen (`src/ui/app.js`)

Vorbild ist der Autostart-Block `app.js:332-335` (Häkchen erst per `autostartStatus()` nachziehen — sonst
zeigt der Schalter beim Öffnen den falschen Zustand). Neuer Abschnitt **„Klassenraum"** in
`eigeneAbschnitte()` (`app.js:299-338`), hinter dem Block „Leiste" (ab `:336`):

```js
    l.push({titel: "Klassenraum", fn: c => {
      const kann = Plattform.kann("klassenraum");
      if (!kann.ja) { c.append(h("p", {class: "einst-grund"}, kann.grund)); return; }
      const k = einst();                                  /* Standard: aus */
      const anfangsAn = !!(k.klassenraum && k.klassenraum.an);
      const firewallText = "Windows fragt beim ersten Einschalten einmal nach: „Zugriff zulassen“ wählen (nur private Netzwerke).";
      const stand = h("span", {}, firewallText);   /* Zustandszeile: Adresse oder Hinweis (Muster: `prozent`, app.js:322) */
      const sch = schalter(anfangsAn, v => {
        if (v) UI.toast("Windows fragt jetzt einmal nach: bitte „Zugriff zulassen“ wählen.", "info");
        einstSetzen({klassenraum: Object.assign({port: 47112}, k.klassenraum, {an: v})});
        Promise.resolve(Plattform.klassenraum(v, {port: (k.klassenraum && k.klassenraum.port) || 47112}))
          .then(st => {                           /* echten Zustand übernehmen: Port kann gewandert sein */
            const x = einst(); x.klassenraum = Object.assign({}, x.klassenraum, {an: !!st.an, port: st.port});
            store.set("einst", x);
            sch.setAttribute("aria-checked", String(!!st.an)); sch.classList.toggle("an", !!st.an);
            stand.textContent = st.an ? `Adresse für die Schüler: ${st.klassennetz || st.lokal}` : firewallText;
          })
          .catch(err => {
            sch.setAttribute("aria-checked", "false"); sch.classList.toggle("an", false);
            stand.textContent = firewallText;
            UI.toast(`Server ließ sich nicht einschalten: ${err.message || err}`, "fehler");
          });
      }, "Klassenraum-Server");
      /* Adresse/Fehler beim Öffnen aus dem echten Zustand nachziehen (wie autostartStatus) */
      Promise.resolve(Plattform.klassenraumStatus()).then(st => {
        sch.setAttribute("aria-checked", String(!!st.an)); sch.classList.toggle("an", !!st.an);
        stand.textContent = st.an ? `Adresse für die Schüler: ${st.klassennetz || st.lokal}` : firewallText;
      }).catch(() => {});
      c.append(zeile("Ergebnisse im Klassenzimmer einsammeln",
        "Genau zwei Endpunkte: GET /liste und POST /ergebnis. Nur im lokalen Netz, kein Internet, keine Konten.",
        h("div", {class: "einst-steuer-senkrecht"}, sch, stand), kann));
      c.append(h("p", {class: "einst-grund"}, firewallText));   /* Firewall- und Datensparsamkeits-Hinweis aus § 5 */
    }});
```

Drei Festlegungen dazu:

1. **`Standard aus`** wird an drei Stellen gleich gehalten: im Schalter-Startwert (`anfangsAn` aus
   `einst.klassenraum`, das es nicht gibt → `false`), in `klassenraum.rs` (`static ZUSTAND` startet mit
   `None`) und in `fenster::info` (§ 4.2, `an = false`). `Spiel.EINST_STANDARD`
   (`src/spiel/zustand.js:23`) wird **nicht** erweitert — das ist eine Aufgabe für Bereich B, und ein
   fehlender Schlüssel ist hier genau richtig (`false`).
2. **Der Zustand wird erst gefragt, dann geglaubt.** Der Schalter folgt der Antwort von Rust
   (`st.an`, `st.port`), nicht dem Klick. Nur so stimmt er, wenn der Port gewandert ist oder das Binden
   scheiterte.
3. **Die Einstellung „an" liegt im Spielstand** (`store "einst"` → `spielstand.json`, gespeichert über
   `Plattform.speichern`, `plattform-tauri.js:52`). Beim Programmstart ist die Hülle trotzdem **aus**
   (Standard aus, § 1.3) — die Oberfläche schaltet auf Wunsch nach. Das ist bewusst: Ein Server, der ohne
   Zutun nach einem Neustart wieder lauscht, wäre eine Überraschung. Die Zeile im Einstellungsdialog sagt
   es darum ausdrücklich: „Nach einem Neustart ist er wieder aus; einschalten wie beim ersten Mal."

### 6.4 Bedienprobe (geht erst nach dem Einbau)

Zuerst über die Oberfläche einschalten, dann die abgelesene Klassennetz-Adresse einsetzen (Beispiel
`http://192.168.1.23:47112/liste`). Die vier Aufrufe hier laufen gegen den eigenen Rechner:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:47112/liste"                       # GET /liste  → 200, JSON mit "ergebnisse":[]
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:47112/ergebnis" `
  -ContentType "application/json" `
  -Body '{"sitzung":"NL-4F7K","platz":"P3","sterne":3,"dauerS":214,"code":"E-1"}'   # → 201, "neu":true
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:47112/ergebnis" `
  -ContentType "application/json" `
  -Body '{"sitzung":"NL-4F7K","platz":"P3","sterne":3,"dauerS":214,"code":"E-1"}'   # → 200, "neu":false (idempotent)
Invoke-RestMethod -Uri "http://127.0.0.1:47112/liste?sitzung=NL-4F7K"       # → 200, "anzahl":1
```

---

## 7 · Verhalten beim Ausschalten und beim Schließen der App (Port frei)

### 7.1 Der Vertrag des Servers (einmal, wörtlich aus C2 übernommen)

Gültig für **beide** Endpunkte, damit C1 und C2 austauschbar sind
(`tools/klassenraum/src/main.rs:275-302, 327-431`):

| Fall | Antwort |
|---|---|
| `GET /liste` (optional `?sitzung=CODE`) | `200` + `{"format":"klassenraum-liste","v":1,"sitzung":…,"anzahl":…,"sitzungen":[…],"ergebnisse":[{"platz","sterne","dauerS","sitzung","code","eingegangen"}]}` |
| `POST /ergebnis` neu | `201` + `{"format":"klassenraum-ergebnis","v":1,"ok":true,"neu":true,"anzahl":…,"platz":…,"sitzung":…,"lagerVoll":…}` |
| `POST /ergebnis` schon bekannt | `200` (idempotent, `"neu":false`) |
| Rumpf kein Objekt / Feld fehlt / Wert unzulässig | `400` + `{"format":"klassenraum-fehler","v":1,"fehler":…,"feld":…}` |
| `Content-Type` nicht `application/json` | `415` |
| falsche Methode auf richtigem Pfad | `405` + `Allow` |
| unbekannter Pfad | `404` |
| Sitzungsfilter greift nicht | `409` |
| Lager voll (4096 Einträge) | `507` |
| zu viele Verbindungen (16) | `503` + `Retry-After: 2` |
| Grenzen | Anforderungszeile 8 KiB, Kopfzeile 4 KiB, 40 Köpfe, Rumpf 4096 B, Zeitlimit 5 s (`tools/klassenraum/src/http.rs:15-23`) |
| Felder im POST | **genau** `sitzung` (2–12), `platz` (1–8), `sterne` (0–5), `dauerS` (0–86400), `code` (1–64); Zeichen nur `A-Za-z0-9-` (Großschreibung erzwungen) — dadurch ist ein Klarname nicht abgebbar |
| CORS | `Access-Control-Allow-Origin: *` + Preflight `OPTIONS` → `204` mit `Access-Control-Allow-Private-Network: true` (nötig für die Browser-Fassung auf GitHub Pages) |

C1 darf den Rumpf mit `serde_json` bauen statt mit dem handgeschriebenen Schreiber aus C2
(`tools/klassenraum/src/json.rs`) — die **Feldnamen und -reihenfolgen** der Antworten sind der Vertrag,
nicht der Schreiber. `serde_json` liegt bereits in `Cargo.toml:22`, es kommt keine neue Kiste dazu.

### 7.2 Ausschalten über die Einstellungen

1. `klassenraum_server { an: false }` → `stoppen_intern()` (§ 3.5).
2. `stop = true`; der `TcpListener` fällt aus dem `static` und wird geschlossen → **Port frei**, typisch in
   unter einer Millisekunde.
3. Der Annahme-Faden verlässt die Schleife nach höchstens 40 ms und setzt `lebt = false`.
4. Eine Anfrage, die **gerade** bedient wird, läuft zu Ende (Zeitlimit 5 s, `http.rs:23`). Ein Schüler, der
   in genau diesem Moment abgibt, bekommt also noch eine Antwort — oder einen Verbindungsfehler und tippt
   den Code später ein. Beides ist unschädlich: `POST /ergebnis` ist idempotent, und der Ergebnis-Code
   bleibt als Zettel gültig (`KLASSENRAUM.md:48`).
5. Der Zustand ist danach `{an:false, laeuft:false, port:null}`; die Oberfläche setzt den Schalter zurück
   und zeigt wieder den Firewall-Hinweis.

### 7.3 Schließen der App

* **Normalfall (Fenster schließen, Tray → Beenden, Strg+Alt+L → …):** Alle Wege enden in
  `fenster::beenden_anfragen` (`fenster.rs:331-342`) → Ereignis `labor-beenden` → die Seite schreibt den
  Spielstand und ruft `beenden` (`plattform-tauri.js:23`) → `main.rs:114` `fn beenden` → mit § 1.4 steht
  dort `klassenraum::stoppen()` **vor** `app.exit(0)`: Horcher zu, Port frei, dann Programmende.
* **Notfall (Seite antwortet nicht):** `fenster.rs:340` beendet den Prozess nach 4 s hart. Dann werden die
  Sockets vom Betriebssystem beim Prozesstod geschlossen. Ergebnis für den Nutzer: **derselbe** — der Port
  ist frei, sobald der Prozess weg ist. Der Unterschied ist nur, dass ein laufender Faden nicht mehr
  freundlich beendet wird; das ist bei einem sterbenden Prozess ohne Belang.
* **Programmende über das Tray-Menü:** `tray.rs:66` `"beenden" => fenster::beenden_anfragen(app)` — derselbe
  Weg.
* **Was der Schüler merkt:** nichts Bleibendes. Sein Gerät bekommt beim nächsten Versuch einen
  Verbindungsfehler; die Oberfläche fragt nur ab, wenn der Server erreichbar ist, und meldet **keinen**
  Fehler, wenn nicht (`KLASSENRAUM.md:48`).
* **Was ich nicht behaupte:** dass beim harten Prozesstod **sofort** alle Sockets weg sind, habe ich nicht
  gemessen. Gemessen ist nur der Code-Pfad; die 4-s-Notbremse steht in `fenster.rs:338-341`.

### 7.4 Ablage (Ergebnislager) — Vorschlag

`klassenraum-lager.json` im Datenordner (`main.rs:133-136`, `LABOR_DATEN` beachten — im Test zeigt es auf
einen eigenen Ordner). Form wie C2 (`tools/klassenraum/src/lager.rs:127-131`):
`{"format":"klassenraum-ablage","v":1,"ergebnisse":[…]}`. Geschrieben wird **nur** beim Eintragen, atomar
(`tmp` + Umbenennen, Muster aus `speicher.rs:85-91`), gelesen beim Einschalten. Obergrenze 4096 Einträge
wie C2 (`lager.rs:16`). Damit übersteht die Ampel einen Neustart des Lehrerrechners — was die Vorführung in
`KLASSENRAUM.md:57` („Neustart … Ampel unverändert") auch für den Serverweg trägt.

---

## 8 · Offene Punkte (als solche markiert)

1. **Firewall-Dialog nicht gesehen.** Der Wortlaut in § 5 ist ein Vorschlag. Beim ersten echten Einschalten
   muss jemand den Dialog fotografieren und den Text danach nachziehen (Nachweis nach `Nachweise/Klassenraum/`).
   Ebenfalls ungeprüft: ob Windows die Abfrage **nur** beim Binden an `0.0.0.0` zeigt (nicht bei `127.0.0.1`).
2. **Ob `Cargo.toml` eine Änderung braucht: nein, behauptet auf Grund von Lesen, nicht von Bauen.** Ich habe
   **nicht** übersetzt (`cargo build` wäre eine Änderung an `shell/src-tauri/target/` und in dieser Sitzung
   nicht erlaubt). Die Aussage stützt sich auf `Cargo.toml:15-25` (`std::net`, `std::sync`, `serde_json`,
   `tauri`) — der erste Übersetzungslauf kann Überraschungen zeigen.
3. **Capability-Frage nur durch Lesen belegt** (§ 2): ein Laufzeitbeweis mit einem **neuen** eigenen Befehl
   fehlt. Er ist erst nach dem Einbau möglich (`cargo build` + `klassenraum_status` über die Oberfläche).
4. **Argumentnamen der Befehle** (`an`, `port`, `nurLokal`, `sitzung`, `ablage`): Tauri 2 erwartet laut
   `plattform-tauri.js:52-61` die Argumente in der Schreibweise der Rust-Parameter
   (`speichern` ← `json`, `fenster_modus` ← `modus`, `fenster_groesse` ← `b`, `h`). Ob ein Rust-Parameter
   `nur_lokal` als `nurLokal` ankommt, habe ich **nicht nachgemessen** (`#[tauri::command(rename_all = "camelCase")]`
   wäre der feste Weg). Beim ersten Übersetzungslauf prüfen; im Zweifel alle Argumente mit
   `rename_all = "camelCase"` festnageln.
5. **C1 und C2 haben zwei getrennte HTTP-Umsetzungen.** C2s `http.rs`/`json.rs`/`lager.rs` liegen in der
   eigenen Kiste `tools/klassenraum/` (`tools/klassenraum/Cargo.toml:1-10`) und sind für `shell/src-tauri`
   nicht erreichbar; C1 muss die ~300 Zeilen HTTP nachbilden. **Vorschlag zur Entscheidung:** entweder
   bewusst doppelt führen (zwei Bauformen, gleiche Datenform — die Doppelung ist dann der Preis für die
   Unabhängigkeit) oder später ein gemeinsames Modul über `include!`/einen Pfad in `Cargo.toml` teilen.
   Das ist eine Architekturentscheidung, keine Nebensache.
6. **Zugriffsschutz: keiner.** Wer im Klassennetz ist, darf lesen und schreiben (bewusst, C2-Kopf
   `tools/klassenraum/src/main.rs:14-15`). Nicht geprüft: ob die Schule ein offenes WLAN teilt, in dem auch
   fremde Geräte mitlesen könnten. Für die Hobby-Ebene laut Auftrag hinnehmbar, sollte aber im Hinweis
   stehen (§ 5, dritte Zeile).
7. **Sitzungsfilter setzt eine Sitzungskennung voraus**, die die Oberfläche kennt (Bereich B/A liefert sie).
   Bis dahin läuft C1 ohne Filter (`sitzung: null`) — dann nimmt er Ergebnisse **jeder** Sitzung an.
8. **`beenden` ist heute womöglich toter Code.** Gemessen: `.invoke_handler` (`main.rs:147-148`) registriert
   `beenden`; die Seite ruft es nur in `plattform-tauri.js:23` und `:60`. Ob dieser Weg in der Praxis
   ankommt, ist nicht gemessen. Für § 7.3 ist das ohne Risiko (die Notbremse greift in jedem Fall).
9. **Nicht geprüft:** Tauri 2.12.0 bringt ein Plugin `tauri-plugin-localhost` mit, das einen Server für die
   WebView bereitstellt — es liegt **nicht** im `Cargo.lock` (Suche nach `tauri-plugin-localhost`: 0 Treffer)
   und ist für zwei eigene Endpunkte auch nicht gedacht. Erwähnt nur, damit die Entscheidung bewusst ist.
10. **Nicht geprüft:** ob `Programm/Netzwerk-Labor.exe` ein Installer-Paket ist oder ein einfacher
    Dateikopie-Start (`tauri.conf.json:18` nennt als Bündelziele nur `deb`/`appimage`, für Windows also kein
    MSI/NSIS). Für die Firewall ist das gleichgültig, für die Anleitung („wo liegt die .exe") nicht.
11. **Testweg fehlt noch.** Vorschlag: die Prüfungen aus C2 nachziehen
    (`tools/klassenraum/src/main.rs:477-517`: gültiges Ergebnis, Klarname abgelehnt, falsche Werte
    abgelehnt) als `#[cfg(test)] mod tests` in `klassenraum.rs`, dazu ein Test für „aus → Port wieder frei"
    (binden, `stoppen`, erneut binden). **Nicht ausgeführt** — `cargo test` in `shell/src-tauri` müsste
    erst erlaubt werden; die Tauri-Hülle hat heute **keine** Testdatei (Suche nach `#[cfg(test)]` in
    `shell/src-tauri/src/`: 0 Treffer außer in `tools/`, das nicht zur Hülle gehört).
12. **Kein Zugriffsschutz auf die Ports 47112–47121** gegen andere Programme auf demselben Rechner: Wer
    zuerst bindet, gewinnt. C1 meldet dann den belegten Port bis hin zum Fehler „Kein freier Port"; die
    Oberfläche muss diesen Text zeigen (§ 6.1).

---

## 9 · Was ich gemessen habe (Kurzbeleg)

| Messung | Befehl | Ergebnis |
|---|---|---|
| Zeilenzahlen der gelesenen Dateien | `read` (Kopfzeile „total N lines") | `main.rs` 202 · `fenster.rs` 474 · `speicher.rs` 171 · `tray.rs` 136 · `klassenraum-probe`-Dateien 57/… |
| Eigene Befehlsnamen als Berechtigung? | rekursive Volltextsuche in `shell/src-tauri/` ohne `target/` nach `speichern|fenster_modus|fenster_groesse|fenster_ecke|fenster_zustand|immer_oben|abzeichen|autostart_status|exportieren|importieren|plattform_info|ruhe|beenden|selbsttest_ergebnis` | Treffer **nur** in `src/main.rs:65,120,147,148` (die Definitionen) — in `capabilities/` und `gen/schemas/` **0** |
| `gen/schemas`-Inhalt | Suche nach denselben Namen in `gen/schemas/` | 0 Treffer; `acl-manifests.json` kennt nur `autostart`, `core*`, `dialog`, `global-shortcut` |
| Zeilenenden | `git ls-files --eol` (9 Dateien) | überall `i/lf  w/lf  attr/text=auto eol=lf` |
| Zweig | `git rev-parse --abbrev-ref HEAD` | `ausbau-1.2` |
| Arbeitsbaum | `git status --porcelain` | 5 unverfolgte Einträge, **keine** geänderte Datei |
| Rust-Kette | `cargo --version`, `cargo tauri --version` | cargo 1.97.1 · tauri-cli 2.12.0 (`tauri` selbst 2.12.0 laut `Cargo.lock`) |
| C2-Vertrag | `read` von `tools/klassenraum/src/{main,http,json,lager}.rs` | Port 47112, Pfade, Statuscodes, Felder, Grenzen (§ 7.1) |

**Nicht gemessen:** ob die Vorschläge übersetzen, ob sie laufen, ob Windows den Dialog so zeigt, ob der
Port nach dem Ausschalten sofort neu bindbar ist. Alles davon braucht den Einbau und einen erlaubten
`cargo`-Lauf.
