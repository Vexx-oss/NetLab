---
tags: [FISI, Lernspiel, Netzwerk, Redesign, Übergabe, Kontext]
erstellt: 2026-10-29
status: Übergabezettel für die nächste Sitzung — Stand v2.1.0, Redesign-Vorlage A favorisiert, Frontend noch nicht umgebaut; Plugin-Ausbau aus paralleler Sitzung dokumentiert, Workflow-Prompt in § 11.
---

# Übergabe — Stand nach der Sitzung vom 29.10.2026 (Frontend-Redesign)

> **Warum diese Datei existiert.** Diese Sitzung hat den Auftrag „komplettes Redesign des
> Frontends" vorbereitet, aber absichtlich **noch keine Zeile Produktcode** angefasst. Ein neuer
> Lauf soll in einer Minute wissen, was entschieden ist, was gemessen wurde, wo die Bild-Vorlagen
> liegen und was als Nächstes zu tun ist — mit Verweisen statt Wiederholungen.

## 1 · Auftrag und Entscheidungen des Nutzers

| Frage | Entscheidung |
|---|---|
| Auftrag | „Ich will ein komplettes Redesign des Frontends." Zuerst **visuelle Prototypen als Bilder**, nicht als Code. |
| Stilwunsch (wörtlich) | „Dunkel, modern, sleek, Cyberpunkig aber nicht kitschig, Matrix, elegant, professionell" |
| Umfang | **Optik + Shell** — neues Design-System plus Kopfzeile/Navigation/Karten/Dock; Bedienlogik und Ansichten bleiben erhalten |
| Qualitätsgates | Kontrast, Trefferflächen, keine Überläufe, 0 tote Links **bleiben Pflicht**; Stil-Tests, die die alte Optik festschreiben, werden **bewusst neu geschrieben, nicht abgeschwächt** |
| Git | **Committen ja, Push nur auf Zuruf** (entspricht `AGENTS.md` § 17.6) |
| Richtung | **A „Matrix-Elegant" gefällt dem Nutzer „am besten bisher"** — noch keine endgültige Freigabe, B und C bleiben Alternativen |
| Agenten | Ausdrücklich erlaubt („verwende agents"); drei Design-Agenten arbeiteten parallel, je ein Ordner, keine Kollision |

## 2 · Wo wir stehen (in einem Satz)

Das lokale Repo steht auf **v2.1.0** (`fb7e0bc`, Zweig `ausbau-1.2`, Arbeitsbaum sauber), die
Werkzeugkette ist geprüft, drei **Bild-Vorlagen** liegen unter `Nachweise/Prototypen-Redesign/` —
**am Frontend-Code ist nichts geändert**, kein Vertrag geschrieben, kein Test angepasst.

## 3 · Was in dieser Sitzung entstanden ist (alles gemessen)

### 3.1 Repo und Zugang

- `Vexx-oss/NetLab` ist **öffentlich**; Schreibzugriff über die gespeicherten Windows-Anmeldedaten
  (`Vexx-oss`) — mit `git push --dry-run` gegen einen Wegwerf-Zweig belegt, es wurde nichts angelegt.
- Lokaler Checkout war 2 Commits hinter origin (`1a24a66`) und ist per `git pull --ff-only` auf
  **`fb7e0bc` = Tag `v2.1.0`** gezogen worden.
- Release `v2.1.0` („Netzwerk-Labor 2.1.0") trägt drei Anhänge: `Netzwerk-Labor.html`,
  `Netzwerk-Labor.exe`, `Netzwerk-Labor-2.1.0-Browser.zip`.

### 3.2 Werkzeugkette

- git 2.55.0 · rustc/cargo 1.97.1 · MSVC 14.44 (VS 2022 Community, Linkerprobe ok) ·
  cargo-tauri 2.12.0 · Python 3.14.6 (+ Pillow 12.3.0) · WebView2 156.0.4314.50 · JDK 21 · Git-Bash.
- **Node lag nur portabel vor**: `%LOCALAPPDATA%\node-portable\node-v24.21.0-win-x64` (v24.21.0);
  der Ordner steht jetzt im **Benutzer-PATH**.
  **Falle:** Die Aussage in `AGENTS.md`, Node liege unter `C:\Program Files\nodejs`, stimmt auf
  diesem Rechner **nicht** (dort ist keine `node.exe`; gemessen 29.10.2026).
- **Nicht installiert:** Android-SDK (fehlt; APK-Bau braucht build-tools ≥ 35 und den
  Signaturschlüssel, der nicht im Git liegt). Für Code/Tests/Web/Windows-Programm nicht nötig.

### 3.3 Nachgemessene Prüfläufe

| Prüfung | Ergebnis |
|---|---|
| `sh tools/test.sh` (Git-Bash) | **873/873 grün**, 103 Testdateien, 95 Module, **0 übersprungen**, Exit 0, 112,2 s |
| `python bauen.py` | Exit 0, 133 Module, 2534 KB → `web/index.html` (Version 2.1.0); `git status` danach sauber |
| `cargo build --release --features custom-protocol` | Exit 0 in 5 min 58 s → `shell/src-tauri/target/release/netzwerk-labor.exe`, **8 821 248 B**, ProductVersion **2.1.0** |
| `python tools/stand.py --pruefen` (nach dieser Übergabe) | grün; die aktuellen Zahlen stehen in [STAND.md](../STAND.md) |

**Nicht geprüft:** die gebaute `.exe` wurde **nicht gestartet**; die Lesbarkeit im echten
Programm ist offen. Die `.exe` wurde **nicht** nach `Programm/` kopiert (Auslieferung nur mit Freigabe).

### 3.4 Vault (nicht Teil des Repos)

- `Agents/Memories/User.md`: Abschnitt „Projekt Netzwerk-Labor — verbindlicher Arbeitsstand"
  (v2.1.0 ist der Arbeitsstand, Installations-Ausnahme vom 29.10.2026).
- `90-Werkstatt/Logs/2026-10-29.md`: Sitzungsprotokoll.
- `.vaultignore`: `…/shell/src-tauri/target` ergänzt — sonst meldet der Vault-Prüfindex hunderte
  Rust-Fingerprint-Dateien als „neu".

## 4 · Die drei Bild-Vorlagen

Ablage (nicht versioniert, weil `Nachweise/` in der `.gitignore` steht):

```
Nachweise/Prototypen-Redesign/
├── BRIEF.md                  ← verbindliches Briefing (Inhalte, Maße, Renderbefehle)
├── matrix/                   ← A · MATRIX-ELEGANT   (vom Nutzer favorisiert)
├── holo/                     ← B · HOLO-SUITE
└── blueprint/                ← C · NEON-BLUEPRINT
```

Jeder Ordner enthält: `mockup.html` (Renderhilfe), `<slug>-board.png` (1366 × 2048),
`<slug>-hub.png` (1366 × 768), `<slug>-labor.png` (1366 × 768), `<slug>-stil.png` (1366 × 420),
`NOTIZ.md`. Alle Boards sind am Pixel geprüft (Maße stimmen, Schriften geladen, keine Überläufe,
keine Netzabrufe). Rendern/Zuschneiden: siehe `BRIEF.md` § 6 — **Schriftenpfad korrigiert auf
`../../../schriften/`** (die ursprüngliche Angabe `../../schriften/` zeigte auf `Nachweise/schriften`).

| | A · Matrix-Elegant | B · Holo-Suite | C · Neon-Blueprint |
|---|---|---|---|
| Charakter | Kontrollraum: Punktraster, Hairlines, Mono-Mikrolabels | Glas, Gradient-Kanten, viel Luft, sleek | Schaltplan: Raster, Eckmarken, Maßketten, Annotationen |
| Grund / Fläche | `#04070A` / `#08100C` | `#05070F` / `#101829` | `#060A12` / `#0A1422` |
| Akzent | Emerald `#30E58B`, Cyan `#22D3EE` sparsam | Cyan `#5EEBFF`, Violett `#8B7CFF` | Cyan `#46D9FF`, Amber `#FFB454` |
| Stärke | trifft „Matrix + elegant + professionell" am direktesten | hochwertigste, modernste Anmutung | fachlich glaubwürdigstes Laborbild |
| Schwäche | bewusst leise | „Matrix" kaum erkennbar, eher Premium-SaaS | dichteste Vorlage, kleinste Labels 7 px |

### 4.1 Favorit A — die Tokens für den Vertrag

- **Farben:** Grund `#04070A` · Fläche `#08100C` · Linie `rgba(163,255,214,.10)` (Swatch `#1A2B23`) ·
  Text `#E8F4ED` · Nebentext `#97AC9F` · gedämpft `#7C9386` · Akzent `#30E58B` ·
  Sekundär `#22D3EE` · OK `#54E6A8` · Warnung `#F2C14E` · Fehler `#FF6B8A`.
- **Typografie:** Bricolage Grotesque 600/800 (Wortmarke, H1 44/46, Kartentitel, Knöpfe);
  Atkinson Hyperlegible 400/700 (Fließtext); JetBrains Mono 400/600 (Labels, IPs, Status).
- **Shell:** Kopfzeile 56 px (Marke + `v2.1`, vier Werte-Chips, Suche mit `Strg+K`, Theme/Zahnrad/Hilfe) ·
  linke Leiste 88 px mit allen sieben Wegen · Statusfuß 28 px · Radien 4/8/12, Schatten nur am Hauptknopf.
- **Gemessene Kontraste (am Prototyp):** Text/Grund 17,9:1 · Nebentext 8,4:1 · gedämpft 6,1:1
  (Grund) bzw. 5,9:1 (Fläche) · Akzent 12,2:1 · Warnung 11,5:1 — alle ≥ 4,5:1.

## 5 · Was als Nächstes zu tun ist (Reihenfolge ist verbindlich)

**0 · Lesen, bevor gebaut wird.** Diese Datei · `Nachweise/Prototypen-Redesign/matrix/matrix-board.png`
und `-hub/-labor/-stil.png` · `matrix/NOTIZ.md` · `BRIEF.md` · [Architektur § 16.4](../Architektur.md)
(Design-Tokens und Bewegung) · `AGENTS.md` und [SITZUNGSABSCHLUSS](../SITZUNGSABSCHLUSS.md).

**1 · Gestaltungsvertrag zuerst** (Projektregel „Vertrag zuerst"): neuer Abschnitt in
[Architektur.md](../Architektur.md) (z. B. § 18 „Frontend-Redesign — Gestaltungsvertrag") mit
Farbtokens dunkel **und** die Ableitung für hell, Typo-Skala, Shell-Maßen, Komponenten-Inventar,
Zuordnung zu den bestehenden Dateien (`src/stil/basis.css` Tokens, `aussehen.css` Shop-Farben,
`rahmen.css`/`leiste.css` Shell, `hub.css`, `spiel.css`, `editor.css`, `inspektor.css`, `konsole.css` …),
Nicht-Ziele (z. B. keine neuen Ansichten) und Test-Strategie.

**2 · Gates bewusst anpassen** (nur nach dem Vertrag, nie „nebenbei"):
- `tools/ethos.py`: Skalen (Schrift, Abstände, Radien, Schatten, Zeiten) auf das neue System ziehen.
  **Achtung:** der Prototyp nutzt H1 44 px und Radien 4/8/12 px — beides liegt außerhalb der
  heutigen Skalen (Schrift max. 28, Radien 6/10/999/50 %).
- `tests/stil-stand.json` mit `python tools/ethos.py --neu --stand tests/stil-stand.json` neu
  einfrieren — **nur nach** bewusster Entscheidung, nicht um Rot zu verstecken.
- Stil-/UI-Tests, die die alte Optik festschreiben (`ui-typografie`, `ui-kontrast`,
  `ui-trefferflaechen`, `ui-symbole`, `ui-leiste-ueberlappung`, `klassen-20`, `texte-stil`, …)
  neu schreiben bzw. auf das neue System ziehen; **Verhaltenstests unangetastet**.

**3 · Welle 1 bauen**: Tokens + Shell + Hub + Labor-Chrome + Leiste im Stil von A.
Nach **jedem** Schritt: `python bauen.py`, `sh tools/test.sh`, Sichtkontrolle per Screenshot
(`python tools/starttest.py docs/index.html --bild …` bzw. `python tools/rauch.py`), erst dann
weiter. Die App muss nach jedem Schritt lauffähig sein. Commits lokal auf `ausbau-1.2`; **kein Push**.

**4 · Welle 2**: restliche Ansichten (Postfach, Kunden, Wiki, Lernstand, Shop, Einstellungen,
Klassenraum, Editor-Dock, Inspektor, Terminal/Konsole) auf das neue System ziehen — eine Ansicht
vollständig, dann die nächste („senkrechter Schnitt vor Breite").

**5 · Welle 3**: Doku und Stand nachziehen (`python tools/stand.py` → `python tools/seite.py` →
nochmal beide), CHANGELOG, Screenshots, `sh tools/test.sh --rauch`, `tools/ethos.py --dom`,
`node tools/sim-stand.js`; danach erst Freigabe für Auslieferung/Fassung.

## 6 · Prüfstand und Befehle (auf diesem Rechner verifiziert)

```powershell
cd 10-Projekte\Lernprojekte\Netzwerk-Labor
git status -sb                    # ausbau-1.2, nach dieser Übergabe 1 Commit vor origin (kein Push)
$env:PATH = "$env:LOCALAPPDATA\node-portable\node-v24.21.0-win-x64;" + $env:PATH
& "C:\Program Files\Git\bin\bash.exe" -c 'export PATH=/usr/bin:/bin:/c/Users/Student/AppData/Local/node-portable/node-v24.21.0-win-x64:$PATH; sh tools/test.sh'
python bauen.py                   # 133 Module, Version 2.1.0
python tools/stand.py --pruefen   # Exit 0
python tools/seite.py --pruefen   # Exit 0
python tools/ethos.py             # GRÜN gegen tests/stil-stand.json
sh tools/test.sh --rauch          # zusätzlich 45/45 mit echtem Edge
```

## 7 · Fallen, Grenzen und offene Punkte

- **Mikrolabels:** Die Prototypen nutzen 7–9-px-Beschriftungen. Das Projekt-Gate verlangt für
  funktionale Beschriftung **≥ 11 px** (`ui-typografie.test.js`) — in der Umsetzung anheben; die
  Dichte sinkt dadurch leicht. Die Bilder sind Stimmungsvorlage, **keine 1:1-Implementierung**.
- **Hellmodus fehlt** in allen Vorlagen (bewusst nur dunkel entworfen); muss aus den Tokens
  abgeleitet und in beiden Schemata geprüft werden.
- **Nicht gemockt:** Leistenmodus 300 × 56, Breiten 960/720 (die prüft `tools/rauch.py`), Hover-/
  Fokus-/Ladezustände, Shop-Akzentfarben (`data-akzent`) und Leistenstile (`data-leiste`) —
  alle müssen erhalten bleiben.
- **Icon-Regel:** UI-Chrome nutzt `UI.symbol` (SVG), Emoji nur in Fließtext-Copy; C hat das
  vorbildlich als Inline-SVG umgesetzt.
- **Prototypen sind nicht versioniert** (`Nachweise/` steht in der `.gitignore`). Sie liegen nur
  auf diesem Rechner; wer sie behalten will, kopiert den Ordner oder regeneriert ihn aus
  `mockup.html` + `BRIEF.md`.
- **Android-SDK fehlt** (siehe § 3.2) — für das Redesign nicht nötig.

## 8 · Was nur der Nutzer entscheiden kann

1. **A als Basis bestätigen** („bisher" am besten) oder Mischung: z. B. A als Grundlage,
   B für mehr Luft, C für Netz-Annotationen im Labor?
2. **Akzentfarbe:** Emerald `#30E58B` neu einführen, oder beim bestehenden Cyan bleiben
   (`--accent:#4FC3F7`)? Die Shop-Akzentfarben (bernstein/minze/koralle/violett) müssen dazu passen.
3. **Dichte:** Kontrollraum-dicht (wie A) oder luftiger (wie B)?
4. **Hellmodus:** gleichwertig mitdenken oder erst nach der dunklen Fassung?
5. **Reihenfolge Welle 1:** Hub + Labor + Leiste zuerst — oder eine andere Ansicht als Aushängeschild?

## 9 · Womit man neu anfängt

```powershell
cd 10-Projekte\Lernprojekte\Netzwerk-Labor
git log --oneline -3              # letzter Commit muss die Übergabe vom 29.10.2026 sein
$env:PATH = "$env:LOCALAPPDATA\node-portable\node-v24.21.0-win-x64;" + $env:PATH
& "C:\Program Files\Git\bin\bash.exe" -c 'export PATH=/usr/bin:/bin:/c/Users/Student/AppData/Local/node-portable/node-v24.21.0-win-x64:$PATH; sh tools/test.sh'
```

Dann **eine** Datei lesen, je nach Auftrag: diese Übergabe (Redesign), `matrix/NOTIZ.md`
(Tokens und Begründungen), [Architektur § 16](../Architektur.md) (was heute schon als Design-Vertrag
gilt), [SITZUNGSABSCHLUSS](../SITZUNGSABSCHLUSS.md) (wie eine Sitzung endet).

## 10 · Plugin-Ausbau aus der parallelen Sitzung (29.10.2026)

Eine **zweite Sitzung** hat auf Nutzerwunsch („suche breit und researche sowie installiere die
besten Plugins für dieses Harness") das Profil **`desktop`** erweitert. Das ist das Profil, in dem
diese App und alle ihre Sitzungen laufen; `profiles/web` bleibt unberührt. Installierte
DSH-Fassung: **0.2.1-rc.3**.

| Plugin | Version | Was es im Alltag bringt |
|---|---|---|
| `@deepseek-ai/dsh-plugin-market` (+ Web-UI) | 0.2.1-rc.3 | **Discover-Tab** auf der Plugins-Seite + `plugin_market`-Agent-Werkzeug; Format-1-Index bereits vorkonfiguriert (~3.900 Plugins) |
| `@deepseek-ai/dsh-experimental-session-search` | 0.2.1-rc.3 | **5 Lese-Werkzeuge**: frühere Sessions dieses Workspace durchsuchen und nachlesen (Index entsteht bei der ersten Suche) |
| `@deepseek-ai/dsh-experimental-terminal-bundle` | 0.2.1-rc.3 | **6 Werkzeuge**: persistente PowerShell-Terminals, die über Tool-Aufrufe hinweg leben |
| `@deepseek-ai/dsh-experimental-tool-worktree` | 0.2.1-rc.3 | Agent-Werkzeug für **Git-Worktrees** (isolierte Experimente) |
| [`dshmarket`](https://github.com/dsh-market/dsh-market) | 1.73.3 | **Plugin-Market-Tab** (4.200+ Plugins): Suche, Favoriten, Gruppen, Updates, Themes, Backup/Restore, Diagnose |
| [`dsh-mcp-skill-manage`](https://github.com/sunChargedd/dsh-plugins) | 0.5.5 | Sidebar-Seite **„MCP & Skills"**: Skills/MCP-Server verwalten, bearbeiten, sichern |
| [`@goodandready/dsh-plugin-notify`](https://npmjs.com/package/@goodandready/dsh-plugin-notify) | 0.4.7 | **Benachrichtigungen**: Ton, sessionübergreifende Toasts, Desktop-Push, IM-Webhooks, Web-Push — **Standard aus**, in Einstellungen aktivieren |

**Wichtig — Neustart nötig:** Die Desktop-App komponiert ihr Profil beim Start. Solange sie nicht
vollständig beendet und neu gestartet wurde, sind die neuen Tabs/Seiten/Agent-Werkzeuge **nicht**
aktiv; gespeicherte Sessions bleiben erhalten.

**Verifiziert (von der parallelen Sitzung, hier nachgeprüft):** `package.json` listet 11 Bundles,
die drei Community-Pakete liegen in `…\.dsh\profiles\desktop\node_modules`,
`cordis.patch.yml` ist nur um den Markt-Index ergänzt, Backup:
`cordis.patch.yml.bak-2026-10-29`. Die Sitzung selbst meldet zusätzlich: Kompositions-Dump
(11 Bundles, 49 Layer) Exit 0; Test-Boot in isoliertem DSH-Home HTTP 200 ohne Warnungen.

**Bewusst nicht installiert:** Voice-Input (SenseVoice ohne Deutsch), CoT-Übersetzung
(Datenschutz/Kosten), Ralph/Badge/Inspector/Subagent-Claude/Codex (Nischen), `dsh-plugin-health`,
`dsh-plugin-guide`, `dshbase-catalog` (jung bzw. redundant), Werkzeuge mit festgenagelten
0.1.x-Peers sowie `@ebony-vinyl/dsh-our-free-model` und `dsh-deepseek-web-login` (ToS-/Sicherheitsrisiko).

## 11 · Optimaler Workflow-Prompt für die nächste Sitzung

Der folgende Text ist als **erste Nachricht** einer neuen Sitzung gedacht (vollständig einfügen).
Er setzt auf dieser Übergabe auf, nennt die neuen Werkzeuge und hält die Projektregeln ein.

````text
# Auftrag: Frontend-Redesign, Welle 1 (Netzwerk-Labor, Basis v2.1.0)

Lies zuerst vollständig `docs/entwicklung/Übergabe – Stand 29.10.2026 – Frontend-Redesign.md`
und danach `AGENTS.md`, `docs/SITZUNGSABSCHLUSS.md` und `docs/Architektur.md` § 16.4. Sieh dir
die Bild-Vorlagen an: `Nachweise/Prototypen-Redesign/matrix/` (Favorit A „Matrix-Elegant") —
`matrix-board.png` sowie `-hub/-labor/-stil.png`; B und C liegen daneben als Alternativen.
Vorgabe: **Optik + Shell neu, Bedienlogik und Ansichten bleiben.**

## Werkzeuge, die dir neu zur Verfügung stehen (seit 29.10.2026)
- **Sitzungssuche** (read-only Werkzeuge): durchsuche frühere Sessions dieses Workspace, bevor
  du die 214 KB Design-Doku liest — z. B. nach „Redesign", „Design-Tokens", „Prototyp", „2.1.0",
  „Frontend". Die erste Suche baut den Index auf (kann kurz dauern).
- **Persistente Terminals**: EIN PowerShell-Terminal für die lange Prüfschleife offen halten
  (Testlauf ~5 min, stand.py ~2 min), statt für jeden Befehl einen neuen Prozess zu starten.
- **Git-Worktrees**: nur für isolierte Experimente (z. B. zwei CSS-Richtungen vergleichen), nicht
  parallel in den Hauptbaum committen; nach dem Vergleich entfernen.
- **Plugin-Markt/Discover**: nur nachsehen, ob es für fehlende Fähigkeiten etwas Geprüftes gibt.
  **Keine Installation ohne ausdrückliche Freigabe** (Profiländerung braucht Neustart).
- **MCP & Skills** (Sidebar): nur anfassen, wenn der Nutzer danach fragt.
- **Benachrichtigungen**: einmal in Einstellungen → Plugins aktivieren (Ton/Toast), damit lange
  Läufe sichtbar werden; Standard ist aus.
- Fehlen Sitzungssuche/Terminal-/Worktree-Werkzeuge: Die App wurde noch nicht neu gestartet.
  Bitte den Nutzer um einen Neustart und arbeite bis dahin ohne diese Werkzeuge weiter.
- **Agenten-Team**: Projektregel ist „selbst und nacheinander" (`AGENTS.md`); Schwärme nur mit
  ausdrücklicher Freigabe. Wenn freigegeben: max. 3–5 Schreiber, ein Schreiber je Datei,
  gemeinsame Tasks mit Write-Scopes, Lead integriert und prüft.

## Ist-Check (vor allem anderen)
1. `git status -sb` → Zweig `ausbau-1.2`, lokal vor `origin` (Übergabe + dieser Nachtrag;
   **nicht pushen**), Arbeitsbaum sauber.
2. Prüfstand messen: `git describe --tags --exact-match` → `v2.1.0`;
   `sh tools/test.sh` → **873/873 grün, 0 übersprungen**.
3. Kurz mit dem Nutzer bestätigen: **A als Basis?** Akzentfarbe (Emerald `#30E58B` oder
   bestehendes Cyan)? Dichte (kontrollraumhaft vs. luftiger)? Hellmodus gleich mitdenken?
   Reihenfolge Welle 1 (Hub + Labor + Leiste zuerst)? Ohne Antwort nicht mit dem Vertrag
   beginnen — außer der Nutzer sagt „entscheide du".
4. Grundsatzentscheidungen aus § 1 gelten unverändert: Optik + Shell; Qualitätsgates halten
   (Stil-Tests bewusst ersetzen, nicht abschwächen); committen ja, Push nur auf Zuruf.

## Reihenfolge (verbindlich)
1. **Vertrag zuerst**: neuer Abschnitt in `docs/Architektur.md` — Tokens dunkel/hell, Typo-Skala
   (funktionale Labels ≥ 11 px!), Shell-Maße, Komponenten, Zuordnung zu `src/stil/*.css` und
   `src/ui/*.js`, Nicht-Ziele, Teststrategie. Keine Zeile CSS davor.
2. **Gates**: `tools/ethos.py`-Skalen und `tests/stil-stand.json` bewusst neu einfrieren; die
   Stil-Tests `ui-typografie`, `ui-kontrast`, `ui-trefferflaechen`, `ui-symbole`,
   `ui-leiste-ueberlappung`, `klassen-20`, `texte-stil` auf das neue System ziehen.
   Verhaltenstests bleiben unangetastet.
3. **Welle 1**: Tokens + Shell (Kopfzeile, linke Leiste, Statusfuß) + Hub + Labor-Chrome + Leiste
   in A. Nach jedem Teil: `python bauen.py` → `sh tools/test.sh` → Screenshot
   (`python tools/starttest.py docs/index.html --bild …`) → erst dann weiter. App bleibt lauffähig.
4. **Welle 2/3** nach § 5 dieser Übergabe.
5. **Abschluss**: `python tools/stand.py` → `python tools/seite.py` → beide nochmal;
   `stand.py --pruefen`, `seite.py --pruefen`, `ethos.py --dom`, `sh tools/test.sh --rauch`,
   `node tools/sim-stand.js`; Übergabe fortschreiben, Log/Memory in der Vault, Stand nachziehen;
   **lokaler Commit**, kein Push.

## Definition of Done für Welle 1
- `docs/Architektur.md` enthält den Gestaltungsvertrag; `ethos.py` und `stil-stand.json` passen dazu.
- Hub, Labor und Leiste sehen sichtbar nach A „Matrix-Elegant" aus — Screenshots 1366/960/720 in
  `Nachweise/`, am Bild geprüft: keine abgeschnittenen Texte, keine Überläufe.
- `sh tools/test.sh` **873/873 grün, 0 übersprungen**; `sh tools/test.sh --rauch` grün;
  `python tools/stand.py --pruefen` und `python tools/seite.py --pruefen` grün.
- Ein lokaler Commit auf `ausbau-1.2` mit ehrlichem Bericht: was gemacht, was gemessen, was offen.

## Bericht am Ende
Deutsch, ehrlich, mit gemessenen Zahlen. Keine Behauptung ohne Beleg aus dieser Sitzung.
Weder Push noch Auslieferung ohne ausdrückliche Freigabe.
````
