---
name: Sitzungsabschluss Netzwerk-Labor
wann: Am Ende jeder Arbeitssitzung im Netzwerk-Labor — vor allem, wenn etwas ausgeliefert werden soll
---

# Sitzungsabschluss: von der Änderung zur veröffentlichten Fassung

Diese Reihenfolge ist am 06.10.2026 (Fassung 1.2.2) und erneut am 07.10.2026 (Fassung 1.2.3) **ganz**
durchlaufen worden und hat beim ersten Mal drei Fehler aufgedeckt, die sonst erst nach dem Push
aufgefallen wären. Sie gilt für jede Sitzung, die den Zweig `ausbau-1.2` verändert.

## Voraussetzungen

- `AGENTS.md` gelesen. Sie verbietet `git push`, Tags und Zweigwechsel **ohne ausdrückliche
  Freigabe des Nutzers** — jede dieser Handlungen einzeln erfragen, nicht pauschal.
- Kein Prozess wird nach Namen beendet. Nur, was diese Sitzung selbst gestartet hat (PID).
- Der Nutzer entscheidet, ob überhaupt veröffentlicht wird. Ohne ihn: lokal committen, Ende.

## Die acht Schritte

### 1. Aufräumen, bevor irgendetwas gebaut wird

Ein einziges Suchen-und-Ersetzen ist **verboten**, seit `cargo check`/Änderungen passiert sind,
ist nichts mehr sicher. Stattdessen:

```powershell
git status --porcelain                 # was ist überhaupt offen?
git ls-files | Measure-Object          # Bestand zählen, nicht schätzen
```

- Erzeugnisse gehören nicht ins Git (`web/`, `dist/`, `android/bau/`, `shell/src-tauri/target/`,
  `Programm/*.exe`, `Programm/*.apk`, `Nachweise/`) — prüfen, dass sie draußen sind.
- Beim Verschieben von Dateien **`git mv`** benutzen (die Versionsgeschichte bleibt erhalten)
  und danach **jeden** relativen Verweis prüfen, nicht nur die offensichtlichen. Zwei Werkzeuge
  dafür liegen in `tools/`: `repo-aufraeumen.py` (verschiebt und schreibt Verweise
  neu) und `repo-verweise-flicken.py` (setzt tote Verweise gerade und prüft am Ende jede
  Markdown-Datei gegen die Wirklichkeit).

### 2. Fassung ziehen — an allen Stellen, und vorsichtig im `Cargo.lock`

```powershell
python tools/fassung-ziehen.py            # Trockenlauf
python tools/fassung-ziehen.py --setzen
```

> Alle hier genannten Werkzeuge liegen in `tools/` und sind damit **versioniert** — in einem
> frischen Klon also vorhanden. Wer ein neues Werkzeug baut, legt es ebenfalls dorthin und trägt es
> in die Befehlstabelle in `AGENTS.md` ein. Unter `Nachweise/` liegt nichts, was Git kennt.

Betroffene Stellen: `bauen.py` (`VERSION`), `shell/src-tauri/Cargo.toml`,
`shell/src-tauri/tauri.conf.json`, `shell/src-tauri/Cargo.lock` (**nur** der eigene Block —
im `Cargo.lock` tragen fremde Pakete dieselbe Nummer; ein blindes Ersetzen beschädigt die
Sperrdatei), dazu die Doku: README (ZIP-Name, Fassungsangaben), `docs/Bauen.md` (Tag-Beispiel),
`android/LIESMICH.md` und `docs/Liesmich.md` (APK-Dateiname), `android/huelle/AndroidManifest.xml`
(Kommentar), `.github/workflows/release.yml` (Beispielbefehl).

Nicht anfassen: der `CHANGELOG`-Verlauf alter Fassungen, `Design`/`Plan`-Notizen (das sind
Protokolle), und `versionCode` in `android/bauen.py` — Bauzählung und Spielversion sind zwei
Zahlen.

### 3. Prüfen und bauen, in dieser Reihenfolge

```powershell
sh tools/test.sh                       # erwartet: 707/707 grün, 0 übersprungen (Stand 09.10.2026)
python tools/ethos.py                  # GRUEN gegen tests/stil-stand.json
python tools/klassen.py                # 0 Klassen ohne CSS-Regel
node tools/sim-stand.js                # Simulation unverändert
python bauen.py                        # src/ -> web/
python tools/einfach.py                # web/ -> docs/index.html
python tools/einfach.py --ziel Netzwerk-Labor.html
python tools/seite-pruefen.py          # docs/index.html eigenständig und mit Schriften
python android/bauen.py                # ~5 s, endet GRUEN
```

Danach **gegenprüfen**, dass die Fassung wirklich drinsteckt:

```powershell
Select-String -Path docs\index.html -Pattern 'const LABOR_VERSION'   # muss die neue Nummer zeigen
(Get-FileHash docs\index.html).Hash
(Get-FileHash Netzwerk-Labor.html).Hash                              # muss gleich sein
```

Die letzte Zeile ist keine Kleinigkeit: `docs/index.html` ist das, was GitHub Pages ausliefert,
`Netzwerk-Labor.html` ist der Ein-Klick-Download. **Beide müssen byte-gleich sein.**

Für die Fassung der Oberfläche (Android + Telefonmaße):

```powershell
python tools/menueprobe.py --datei android/bau/assets/index.html --lauf   # 5 Profile, 49 Kriterien, 0 verletzt
python android/werkzeuge/mobilprobe.py --geraet pixel7 --ausrichtung hoch,quer --lauf --mit-ansichten --port 0
```

### 4. Die `.exe` — nur wenn du die Minuten hast, dann aber **messen**

Die `.exe` liegt nicht im Git und wird vom Release-Ablauf **nicht** gebaut; sie muss auf dem
Entwicklungsrechner entstehen (06.10.2026: 4 m 25 s).

```powershell
cd shell/src-tauri
cargo tauri build --no-bundle
cd ../..
Copy-Item "shell\src-tauri\target\release\netzwerk-labor.exe" "Programm\Netzwerk-Labor.exe" -Force
python tools/q-echt.py                 # MUSS laufen: Fenster offen, erster Auftrag gelöst, 0 Fehler
```

Die Fassung in der Binärdatei gegenprüfen (nicht behaupten, nachsehen):

```powershell
(Get-Item "Programm\Netzwerk-Labor.exe").VersionInfo | Select-Object ProductVersion, FileVersion
```

Wenn `icacls Programm\Netzwerk-Labor.exe` **kein** Integritätslabel zeigt, ist alles gut
(Standard ist Mittel). Steht dort „Niedrig", startet die WebView2 nicht — dann
`Programm\Integritaet-reparieren.cmd`.

### 5. Stand nachziehen — kein Commit ohne Stand

Pflicht laut `AGENTS.md`:

- `docs/CHANGELOG.md`: neuer Abschnitt mit **gemessenen** Zahlen, und am Ende die erzeugten
  Dateien mit Bytes und SHA256.
- `docs/Architektur.md`: Stand-Tabelle und, wenn sich ein Vertrag geändert hat, der Vertrag.
- `docs/entwicklung/Design – Spielspaß 2.0.md`: neuer Abschnitt — auch die **verworfenen**
  Versuche gehören hinein, sonst tritt der nächste Mensch in dasselbe Loch.
- `docs/INHALT.md`, wenn Dateien umgezogen sind.

Zahlen **nachzählen**, nicht schätzen. Wenn sich eine Datei geändert hat, ändert sich ihr
SHA256 — dann steht in der Doku der alte Wert und niemand merkt es.

### 6. Committen (lokal, ohne Freigabe)

```powershell
git add <die geänderten Dateien>       # keine Erzeugnisse, keine fremden Dateien
git status --short                     # prüfen, was wirklich im Index liegt
git -c i18n.commitEncoding=UTF-8 commit -F <Nachrichtendatei>
```

- Die Nachrichtendatei nach UTF-8 schreiben und mit `-F` übergeben — `-m` verstümmelt Umlaute.
- **Vor** dem Commit prüfen, ob die Bearbeitung die **Zeilenenden** umgestellt hat. Die Falle:
  `git diff --numstat` und `--ignore-cr-at-eol` können **identisch** aussehen, obwohl der ganze
  Dateiinhalt von LF auf CRLF gedreht wurde. Verlässlich ist ein Byte-Vergleich:

  ```powershell
  python -c "import subprocess,sys; p=r'<Projekt>'; f='src/ui/datei.js'; a=open(p+'/'+f,'rb').read(); k=subprocess.run(['git','-C',p,'show','HEAD:'+f],capture_output=True).stdout; z=lambda b:(b.count(b'\r\n'), b.count(b'\n')-b.count(b'\r\n')); print('Arbeitsbaum',z(a),'HEAD',z(k))"
  ```

  Weichen die Zahlen ab, mit `roh.replace(b'\r\n', b'\n')` bzw. umgekehrt zurückstellen und die
  Datei **nicht** aus Git wiederherstellen (die eigenen Änderungen wären weg).

### 7. Veröffentlichen — **nur mit ausdrücklicher Freigabe**

```powershell
git push origin ausbau-1.2
git tag -a v1.2.2 -m "Netzwerk-Labor 1.2.2"      # Nummer aus bauen.py — hier steht sie als Beispiel
git push origin v1.2.2
```

Drei Abläufe laufen dann von selbst — und man sollte wissen, was sie tun:

| Ablauf | Auslöser | Wirkung |
|---|---|---|
| `pruefen.yml` | Push auf `ausbau-1.2` | Tests auf GitHub |
| `seite.yml` | Push auf `ausbau-1.2` | **veröffentlicht die Seite** (nur `docs/index.html` + `docs/bilder/`) |
| `release.yml` | **Tag** | prüft, baut das Paket, legt das Release mit den Anhängen an; ein zweiter Job auf `windows-latest` baut die `.exe` und hängt sie ebenfalls an |

**Ein Release erneut auslösen** — z. B. um die Anhänge zu erneuern, ohne ein neues Tag zu setzen:
Actions → „Release anlegen" → *Run workflow* → Tag angeben; oder
`gh workflow run release.yml -f tag=v1.2.3`. Der Ablauf ist idempotent (er ersetzt die Anhänge).
**Gemessene Falle:** `gh release upload --clobber` scheitert beim Ersetzen gleichnamiger Anhänge mit
`HTTP 404` auf `uploads.github.com`; der Ablauf löscht sie deshalb vorher ausdrücklich, wartet 5 s und
wiederholt den Upload. Der zweite Job läuft nur, wenn der erste grün ist (`needs`) — ein rotes
Release-Ergebnis heißt also: erst den Linux-Job ansehen.

### 8. Nachmessen, was wirklich online steht

Nicht annehmen, dass ein grüner Ablauf das Richtige ausgeliefert hat:

```powershell
# Ergebnis der Abläufe (ohne Token möglich)
Invoke-RestMethod "https://api.github.com/repos/Vexx-oss/NetLab/actions/runs?per_page=10" -Headers @{ "User-Agent" = "NetLab" }
# Release und Anhänge
Invoke-RestMethod "https://api.github.com/repos/Vexx-oss/NetLab/releases/latest" -Headers @{ "User-Agent" = "NetLab" }
# die veröffentlichte Seite gegen die eigene Datei
Invoke-WebRequest "https://vexx-oss.github.io/NetLab/index.html" -OutFile "$env:TEMP\live.html" -Headers @{ "User-Agent" = "NetLab" }
(Get-FileHash "$env:TEMP\live.html").Hash
(Get-FileHash docs\index.html).Hash          # muss gleich sein
```

Zum Prüfen der Ladelinks `System.Net.Http.HttpClient` benutzen, nicht `Invoke-WebRequest -Method
Head`: das fragt in dieser Umgebung nach Eingaben und bricht ab. Erwartet wird
`Content-Disposition: attachment` — sonst ist der „Ein-Klick-Download" keiner.

## Harte Regeln, die aus Fehlern stammen

1. **Ein grüner Ablauf ist kein Beweis.** Nach dem Aufräumen vom 06.10.2026 scheiterte
   `seite.yml` einmalig im letzten Schritt (`deploy-pages`), obwohl an den veröffentlichten
   Dateien nichts geändert worden war. Erst prüfen (`git diff` gegen den Vorgänger-Commit,
   Live-Seite hashen), dann handeln. Ohne Token hilft kein Re-Run über die API — dann einen
   **leeren Commit mit Begründung** pushen, der den Ablauf erneut auslöst.
2. **Den Zustand nach dem Klick messen, nicht davor.** Ein Klick auf den Reiter des *bereits
   offenen* Bereichs klappt ihn ein. Wer vor dem Klick misst, hält das Zuklappen für leeren
   Inhalt. (Hat in dieser Sitzung zweimal zu falschen Befunden geführt.)
3. **`display:none` heißt „nicht messbar".** Ein unsichtbares Element liefert für jedes Rechteck
   0. Zum Messen `visibility:hidden` und Animationen aus.
4. **Nichts behaupten, was nicht in dieser Sitzung gemessen wurde.** „Nicht geprüft" darf
   dastehen — es ist ehrlicher als eine geglättete Zusammenfassung.
5. **Der Nutzer entscheidet über Veröffentlichung.** Push, Tag und Release je einzeln freigeben
   lassen; im Zweifel nur lokal committen und fragen.
6. **Zwei Zähler, zwei Bedeutungen — nicht verwechseln** (09.10.2026). Der Schalter in der
   Oberfläche heißt **„Subagent parallelism limit"** und steuert `maxActiveSubagents` (gleichzeitige
   Subagenten, Profilwert **16**). Die **Team-Größe** ist etwas anderes: `maxMembers` im Bundle
   `@deepseek-ai/dsh-experimental-agent-team`. Das Profil-Bundle setzte ihn hart auf **8** (der
   Standard des Plugins wäre 16), deshalb waren in der Sitzung vom 09.10.2026 nur acht
   Teammitglieder möglich — und die waren schnell belegt, weil Plätze **dauerhaft** sind (inaktive
   Mitglieder zählen weiter). Wer den einen Wert verdoppelt, ändert am anderen nichts.
   Der Patch steht seit 09.10.2026 in `~/.dsh/profiles/desktop/cordis.patch.yml` (`maxMembers: 16`).
   **`maxMembers` wird beim START gelesen und ist danach unveränderlich** („maximum immutable
   roster entries per Team") — die Änderung wirkt erst nach einem Neustart, nicht durch einen
   Profil-Neuladen. Der Menüpunkt dafür heißt **Application → „Restart App and Host"**.

## Was am Ende dastehen muss

Ein Satz je Punkt, mit Zahl:

- Fassung in allen Erzeugnissen (Browser-Einzeldatei, `.exe`, `.apk`) — mit SHA256 bzw. Versionsangabe.
- Testergebnis (`N/N grün`), `ethos`, `klassen`, `sim-stand`, `seite-pruefen`.
- Was **nicht** geprüft werden konnte, ausdrücklich.
- Die Adressen, an denen es steht: Seite, Release, Anhänge.
