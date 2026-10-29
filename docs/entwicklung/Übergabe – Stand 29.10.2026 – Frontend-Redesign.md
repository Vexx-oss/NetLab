---
tags: [FISI, Lernspiel, Netzwerk, Redesign, Übergabe, Kontext]
erstellt: 2026-10-29
status: Redesign gebaut und abgenommen — Fassung 2.2.0, Welle 1+2 fertig, Doku/Stand/CHANGELOG nachgezogen; offen nur R12-Entscheidung und die Veröffentlichungs-Freigaben (§ 13).
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
| `@deepseek-ai/dsh-plugin-market` (+ Web-UI) | 0.2.1-rc.3 | **Discover-Tab** auf der Plugins-Seite + `plugin_market`-Agent-Werkzeug; **zwei** Format-1-Indexe vorkonfiguriert: awesome-dsh-plugin (~3.900) und Silentforfar (Windows-Werkzeuge, Side-Task) |
| `@deepseek-ai/dsh-experimental-session-search` | 0.2.1-rc.3 | **5 Lese-Werkzeuge**: frühere Sessions dieses Workspace durchsuchen und nachlesen (Index beim ersten Aufruf; Timeout auf 300 s erhöht) |
| `@deepseek-ai/dsh-experimental-terminal-bundle` | 0.2.1-rc.3 | **6 Werkzeuge**: persistente PowerShell-Terminals, die über Tool-Aufrufe hinweg leben |
| `@deepseek-ai/dsh-experimental-tool-worktree` | 0.2.1-rc.3 | Agent-Werkzeug für **Git-Worktrees** (isolierte Experimente) |
| [`dshmarket`](https://github.com/dsh-market/dsh-market) | 1.73.3 | **Plugin-Market-Tab** (4.200+ Plugins): Suche, Favoriten, Gruppen, Updates, Themes, Backup/Restore, Diagnose |
| [`dsh-mcp-skill-manage`](https://github.com/sunChargedd/dsh-plugins) | 0.5.5 | Sidebar-Seite **„MCP & Skills"**: Skills/MCP-Server verwalten, bearbeiten, sichern |
| [`@goodandready/dsh-plugin-notify`](https://npmjs.com/package/@goodandready/dsh-plugin-notify) | 0.4.7 | **Benachrichtigungen**: Ton, sessionübergreifende Toasts, Desktop-Push, IM-Webhooks, Web-Push — **jetzt eingeschaltet** (Ton/Toast/Desktop; Webhooks aus) |
| [`dsh-cool-theme`](https://www.npmjs.com/package/dsh-cool-theme) | 0.10.0 | 34 **Harness-Themes** (u. a. Matrix, Dracula, Tokyo Night), hell/dunkel, eigene Themes — betrifft nur die Harness-Oberfläche |
| [`@silentforfar/dsh-side-task`](https://github.com/Silentforfar/dsh-side-task) | Commit `2843fa4…` | **Side-Task**: temporäre Parallel-Sitzung in der Seitenleiste, eigener Kontext, gleicher Workspace |
| `@deepseek-ai/dsh-mcp-client` + **Context7** | 0.2.1-rc.3 / MCP 4.4.3 | **MCP-Server `context7`** (Streamable HTTP): aktuelle Doku zu Bibliotheken/Frameworks/APIs direkt im Agent |

**Neustart:** Die Desktop-App komponiert ihr Profil beim Start. Die Installationen liefen in zwei
Schritten; der nötige **Neustart ist erfolgt** (zuletzt 29.10.2026 ~15:30, GUI
`127.0.0.1:64030`). Seitdem sind Tabs, Seiten und Agent-Werkzeuge aktiv. Weitere Profiländerungen
brauchen wieder einen vollständigen Neustart; gespeicherte Sessions bleiben dabei erhalten.

**Verifiziert (hier nachgeprüft, Stand 16:00):** `package.json` listet inzwischen **20 Bundles** und
zwölf Dependencies; die Community-Pakete liegen in `…\.dsh\profiles\desktop\node_modules`;
`cordis.patch.yml` enthält Markt-Indexe, Sitzungssuche-Timeout (300 s), Notify-Schalter und den
Context7-MCP-Server; Backup: `cordis.patch.yml.bak-2026-10-29`. Beim Test in dieser Sitzung:
persistentes Terminal, `mcp_skill_manager.overview` und `session_search` antworten, **Context7**
ist als MCP-Server verbunden; die 工艺-Bibliothek ist aktiv (unten).

**Bewusst nicht installiert:** Voice-Input (SenseVoice ohne Deutsch), CoT-Übersetzung
(Datenschutz/Kosten), Badge/Inspector/Subagent-Claude/Codex (Nischen), `dsh-plugin-health`,
`dshbase-catalog` (jung bzw. redundant), Werkzeuge mit festgenagelten 0.1.x-Peers sowie
`@ebony-vinyl/dsh-our-free-model` und `dsh-deepseek-web-login` (ToS-/Sicherheitsrisiko).

### Workflow-Ebene: 工艺-Bibliothek (seit 29.10.2026 ~16:00 aktiv)

Für mehrphasige Arbeit ist jetzt die **工艺-Bibliothek** installiert (`@weibaohui/dsh-process` 0.6.10,
Werkzeuge `process_list`/`process_get`/`process_validate`/`process_save`, UI-Seitenleiste „工艺").
Dazu kamen:

| Neu | Version | Nutzen |
|---|---|---|
| `@weibaohui/dsh-process` | 0.6.10 | **Prozess-Templates** mit Phasen, Links, Gates und Rework — der Fahrplan für das Redesign |
| `@deepseek-ai/dsh-experimental-ralph-bundle` | 0.2.1-rc.3 | **Ralph-Loop** (frische Agenten-Runden) — nur auf ausdrückliche Ansage |
| `@silentforfar/dsh-computer-use` | Commit `adda1f3…` | **Windows-Desktop-Steuerung** (Fenster beobachten, klicken, tippen) für echte Sichtprüfungen |
| `@liustack/modlens` | 3.27.2 | Bild-/Screenshot-Analyse als Vision-Brücke (`modlens_read_image`) |
| `dsh-plugin-guide` | 0.3.39 | DSH-Plugin-Entwicklung/Review als Skill `dsh-plugin-guide` |
| `dsh-context` | 0.78.1 | Kontext-Werkzeuge; die Skill `workflows` erklärt die Workflow-Ebenen |
| `dsh-session-manager` | 0.7.5 | Sitzungsverwaltung in der Oberfläche |

**Für dieses Projekt neu angelegt:** die 工艺
`user:projekte/netzwerk-labor-redesign.yaml` — Anzeigename „Netzwerk-Labor-Frontend redesignen und
abschliessen", **4 Phasen, 13 Links, Gates, Rework**. Sie führt von Vertrag und Gates über Welle 1
und Welle 2 bis Doku, Fassung und Abschluss — inklusive Abnahmebelegen und explizitem Verbot von
Push/Release ohne Freigabe. Einzusehen mit `process_get` (siehe § 12) oder in der UI unter „工艺".

## 11 · Workflow-Prompt, Fassung 1 (nur noch Nachschlagewerk — gültig ist § 12)

Der folgende Text ist als **erste Nachricht** einer neuen Sitzung gedacht (vollständig einfügen).
Er setzt auf dieser Übergabe auf, nennt die neuen Werkzeuge und hält die Projektregeln ein.

````text
# Auftrag: Frontend-Redesign, Welle 1 (Netzwerk-Labor, Basis v2.1.0)

Lies zuerst vollständig `docs/entwicklung/Übergabe – Stand 29.10.2026 – Frontend-Redesign.md`
und danach `AGENTS.md`, `docs/SITZUNGSABSCHLUSS.md` und `docs/Architektur.md` § 16.4. Sieh dir
die Bild-Vorlagen an: `Nachweise/Prototypen-Redesign/matrix/` (Favorit A „Matrix-Elegant") —
`matrix-board.png` sowie `-hub/-labor/-stil.png`; B und C liegen daneben als Alternativen.
Vorgabe: **Optik + Shell neu, Bedienlogik und Ansichten bleiben.**

## Werkzeuge, die dir zur Verfügung stehen (seit 29.10.2026 aktiv)
- **Sitzungssuche** (read-only Werkzeuge): durchsuche frühere Sessions dieses Workspace, bevor
  du die 214 KB Design-Doku liest — z. B. nach „Redesign", „Design-Tokens", „Prototyp", „2.1.0",
  „Frontend". Der **erste** Aufruf baut einen In-Memory-Index über ~155 MB Logs (Timeout ist auf
  300 s erhöht); danach antwortet die Suche schnell. Findet eine Suche nichts: kürzer und
  wörtlicher suchen (z. B. `dshmarket`, `Prototyp`, `v2.1.0`).
- **Persistente Terminals**: EIN PowerShell-Terminal für die lange Prüfschleife offen halten
  (Testlauf ~5 min, stand.py ~2 min), statt für jeden Befehl einen neuen Prozess zu starten.
- **Git-Worktrees**: nur für isolierte Experimente (z. B. zwei CSS-Richtungen vergleichen), nicht
  parallel in den Hauptbaum committen; nach dem Vergleich entfernen.
- **MCP Context7** (`context7`, Streamable HTTP): aktuelle Doku zu Web-APIs/CSS/JS und
  Bibliotheken — nutzen, wenn du bei einer API unsicher bist. Keine vertraulichen Inhalte in
  Anfragen; für den Vault gilt: erst Vault/Repo lesen, Context7 nur für Fremd-Doku.
- **Side-Task** (rechte Seitenleiste): temporäre Parallel-Sitzung mit eigenem Kontext, gleicher
  Arbeitsordner — **nur mit Freigabe** (Schreibkonflikte!), sonst selbst und nacheinander arbeiten.
- **Plugin-Markt/Discover**: nur nachsehen, ob es für fehlende Fähigkeiten etwas Geprüftes gibt.
  **Keine Installation ohne ausdrückliche Freigabe** (Profiländerung braucht Neustart).
- **MCP & Skills** (Sidebar): nur anfassen, wenn der Nutzer danach fragt.
- **Benachrichtigungen**: sind jetzt aktiv (Ton, Toast, Windows-Hinweis) — bei langen Läufen
  entfällt das Nachfragen; Webhooks/Web-Push bleiben aus.
- **Theme** (`dsh-cool-theme`): Einstellungen → Theme, 34 Presets inkl. **Matrix** — betrifft nur
  die Harness-Oberfläche, nicht das Spiel.
- Fehlen Sitzungssuche/Terminal-/Worktree-/Context7-Werkzeuge: Die App wurde noch nicht neu
  gestartet. Bitte den Nutzer um einen Neustart und arbeite bis dahin ohne sie weiter.
- **Agenten-Team**: Projektregel ist „selbst und nacheinander" (`AGENTS.md`); Schwärme nur mit
  ausdrücklicher Freigabe. Wenn freigegeben: max. 3–5 Schreiber, ein Schreiber je Datei,
  gemeinsame Tasks mit Write-Scopes, Lead integriert und prüft.

## Ist-Check (vor allem anderen)
1. `git status -sb` → Zweig `ausbau-1.2`, lokal **mehrere Commits vor `origin`** (Übergaben;
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

## 12 · Workflow-Prompt 2.0 — Projekt vollständig abschließen (mit der 工艺-Bibliothek)

**Gültig ab 29.10.2026, 16:00. Ersetzt den Prompt in § 11** (der bleibt als Fassung 1 stehen).
Voraussetzung: Die App wurde nach dem Plugin-Einbau neu gestartet, die Werkzeuge sind aktiv
(geprüft: `process_*`, `ralph`, `computer_*`, Goal, Context7). Zum Einfügen als erste Nachricht
einer neuen Sitzung:

````text
# Auftrag: Netzwerk-Labor-Frontend vollständig redesignen und das Projekt abschließen

## 1 · Einstieg
Lies vollständig `AGENTS.md`, `docs/SITZUNGSABSCHLUSS.md` und
`docs/entwicklung/Übergabe – Stand 29.10.2026 – Frontend-Redesign.md` (besonders § 5, § 8, § 10,
§ 11). Sieh dir die Bild-Vorlagen unter `Nachweise/Prototypen-Redesign/matrix/` an (A ist Favorit;
B und C sind Alternativen). Lade die Skill `workflows` — sie sagt, welche Workflow-Ebene wofür da
ist.

## 2 · Fahrplan: die 工艺 „user:projekte/netzwerk-labor-redesign.yaml"
1. `process_get` mit `ref: "user:projekte/netzwerk-labor-redesign.yaml"` und `format: "summary"`.
   Der Prozess hat 4 Phasen und 13 Links; jeder Link ist ein Deliverable mit eigenem Prompt,
   erwarteten Artefakten und Gate.
   **Bekannter Werkzeugfehler (29.10.2026):** `process_get` kann „invalid output: value is not
   lossless JSON" melden. Dann lies die Datei direkt:
   `C:\Users\Student\.ntd\processes\projekte\netzwerk-labor-redesign.yaml` (dasselbe YAML);
   `process_list` funktioniert und zeigt den Prozess an.
2. Lege ein Goal an (`create_goal`): „Frontend-Redesign Netzwerk-Labor vollständig umsetzen:
   Vertrag, Gates, Welle 1–3, Doku, Fassung, Abschlussbericht." Das Goal hält die Arbeit über
   mehrere Runden am Laufen, bis das Projekt fertig ist.
3. Arbeite die Links der Reihe nach ab. Führe je Link den Prompt aus, erzeuge die erwarteten
   Artefakte, prüfe die Gate-Kriterien (die AI-Gates sind zusätzliche Prüfungen); bei
   Nichtbestehen laut `on_gate_fail` und `max_rework` zurückgehen. Nichts abschwächen.
4. Der Prozess kann alternativ in der UI gestartet werden (Sidebar „工艺" → ▶ 按工艺执行).
   Dann startet jeder Link eine neue Session und liest die Übergabe als Kontext. Standard hier:
   du arbeitest die Links selbst in dieser Sitzung ab.
5. Wirst du in einer Runde nicht fertig: Fortschritt in die Übergabe schreiben (welcher Link,
   was fehlt, nächster Schritt) und mit dem Goal weiterarbeiten. Ralph nur, wenn der Nutzer es
   ausdrücklich verlangt.

## 3 · Werkzeuge (alle aktiv)
- **工艺-Bibliothek**: `process_*` — Fahrplan, Gates, Rework (dein Prozess oben).
- **Goal**: `create_goal`/`update_goal` — automatische Fortsetzung bis zum Abschluss.
- **Ralph**: frische Agenten-Runden — nur auf ausdrückliche Ansage, `maxRounds` setzen.
- **Sitzungssuche**: frühere Sessions durchsuchen (auch Prototyp- und Plugin-Sitzung); der erste
  Aufruf baut den Index, Timeout 300 s.
- **Persistente Terminals**: EIN PowerShell-Terminal für die Prüfschleife (Tests ~5 min).
- **Git-Worktrees**: isolierte Experimente, nicht parallel im Hauptbaum committen.
- **MCP Context7**: aktuelle Doku zu Web-APIs/CSS/JS/Bibliotheken, wenn du unsicher bist.
- **Computer-Use** (Skill `computer-use`) + `modlens_read_image`: echte Fenster/Screenshots
  ansehen und prüfen; nur selbst gestartete Prozesse, niemals fremde beenden.
- **Notify**: aktiv (Ton/Toast/Desktop) — lange Läufe melden sich.
- **Side-Task/Agent-Team**: nur mit ausdrücklicher Freigabe (gleicher Arbeitsordner!).
- **Plugin-Markt/Discover**: keine Installation ohne Freigabe (Profiländerung braucht Neustart).

## 4 · Projektregeln (verbindlich)
- Zweig `ausbau-1.2`; **Committen ja, Push nur auf Zuruf**; kein Release und keine
  Veröffentlichung ohne ausdrückliche Freigabe.
- Qualitätsgates halten: Kontrast, Trefferflächen, keine Überläufe, 0 tote Links. Stil-Tests
  bewusst auf das neue System ziehen, **nicht abschwächen**; Verhaltenstests unangetastet.
- „Vertrag zuerst", senkrechter Schnitt, App bleibt nach jedem Schritt lauffähig, ehrlich messen
  (`stand.py`, `seite.py`, `test.sh`, `ethos.py`, `rauch.py`).
- Keine Prozesse beenden (außer selbst gestarteten), keine Software installieren, Zeilenenden
  bewahren, deutsch und ehrlich berichten.
- Übergabe, Vault-Log und Memory nach jedem Meilenstein nachziehen.

## 5 · Definition of Done (Gesamtprojekt)
Das Projekt ist fertig, wenn alle 13 Links abgearbeitet sind und:
- alle Ansichten sichtbar im Stil A sind; Screenshots bei 1366/960/720 px vorliegen und am Bild
  geprüft wurden — keine abgeschnittenen Texte, keine Überläufe;
- `sh tools/test.sh` 873/873 grün, 0 übersprungen; `sh tools/test.sh --rauch` grün;
  `python tools/ethos.py --dom`, `python tools/stand.py --pruefen` und
  `python tools/seite.py --pruefen` grün; `node tools/sim-stand.js` unverändert;
- Doku, `docs/STAND.md`, CHANGELOG und der Architektur-Vertrag aktuell sind;
- die Fassung gebaut ist (Vorschlag 2.2.0 — vom Nutzer bestätigen lassen): Einzeldatei
  byte-gleich, `.exe` mit passender ProductVersion, Paket bereit — aber **nicht gepusht und
  nicht veröffentlicht**;
- die Übergabe fortgeschrieben, lokal committet und der Abschlussbericht mit den offenen
  Nutzerfreigaben (Push, Release) vorgelegt ist.

## 6 · Erste Antwort an den Nutzer
Kurz und konkret: Ist-Check (Zweig sauber, v2.1.0, Tests 873/873), Prozess-Outline (4 Phasen,
13 Links), die offenen Entscheidungen aus § 8 der Übergabe — **A bestätigen**, Akzentfarbe,
Dichte, Hellmodus, Fassung (2.2.0 oder 3.0.0) — und dann sofort mit Link 1 (Vertrag) beginnen,
sobald er bestätigt oder „entscheide du" sagt.
````


## 13 · Ergebnis der Redesign-Sitzung (29.10.2026, 19:00–20:45)

**Kurz:** Der Gestaltungsvertrag steht (§ 18), Welle 1 und 2 sind gebaut und abgenommen,
die Doku ist nachgezogen, die Fassung **2.2.0** ist gezogen und gebaut. **Nicht** gepusht,
**nicht** veröffentlicht, die `.exe` **nicht** nach `Programm/` kopiert (nur mit Freigabe).

### 13.1 Was fertig ist

| Link (工艺) | Ergebnis |
|---|---|
| 1 · Vertrag | `docs/Architektur.md` **§ 18** (Tokens dunkel/hell, Typo, Shell, Komponenten, Dateizuordnung, Teststrategie, offene Nutzerentscheidungen) |
| 2 · Gates | `ethos.py`-Skala auf § 18.5; `tests/stil-stand.json` neu eingefroren (R2 113→**23**, R4 514→**128**, R10 **0**) |
| 3–5 · Welle 1 | Tokens, Shell (Kopf **56**, Leiste **88**, Statusfuß **28**), Komponenten (§ 18.8), Hub „Heute", Labor-Chrome; Schatten nur als neutraler Overlay-Schatten, Glow nur am Hauptknopf |
| 6 · Welle-1-Abnahme | `Nachweise/redesign/welle1-abnahme.md` |
| 7–10 · Welle 2 | alle Ansichten/Werkzeuge über Tokens, Altlast-Literale ersetzt; `Nachweise/redesign/welle2-abnahme.md` |
| 11 · Doku/Stand | `stand.py`/`seite.py` gelaufen, `--pruefen` beides **GRÜN**, CHANGELOG-Abschnitt 2.2.0 geschrieben |
| 12 · Fassung | **2.2.0** gesetzt (`fassung-ziehen.py --setzen`, `VERSION_CODE = 20201`), Einzeldatei byte-gleich, `.exe` ProductVersion **2.2.0** |

**Gemessen am 29.10.2026** ([`STAND.md`](../STAND.md) ist die Quelle): 873/873 Tests grün,
0 übersprungen · Rauchtest **45/45** · `ethos.py` grün (R1 22 · R2 23 · R3 4 · R4 128 · R5–R11 0) ·
`klassen.py` 0 · Simulation **unverändert** · Einzeldatei 3.163.368 B, SHA256 `3BFE278C…3A4C94`,
0 Außenverweise · Baukennung `02885212` · 50 Doku-Dokumente.

### 13.2 Nebenfund, behoben (war blockierend)

`tools/einfach.py` setzte den Lizenzblock am ersten `</body>` ein; der App-Code enthält in
`H.seite` selbst ein simuliertes HTML-Dokument als String. Der Block landete dadurch **im
JavaScript** — die Einzeldatei war **seit v2.1.0 nicht lauffähig** (`#app` blieb leer). Neu:
Einbau nach dem letzten `</script>`, Lage-Prüfung in `--pruefen`.

### 13.3 Offen — Entscheidung des Nutzers

1. **R12** („max. 6 Bedienelemente je Ansicht"): Altbefund, nie durchgesetzt; mit `ethos.py --dom`
   gemessen überschritten (Heute 8 · Labor 22 · Training 40 · Wiki 34 · Lernstand 31).
   **Einfrieren** (dann zählt sie künftig mit) oder Oberfläche reduzieren (eigenes Vorhaben)?
2. **Freigaben:** `.exe` nach `Programm/` kopieren, Commit (lokal bereits erlaubt), `git push`,
   Tag `v2.2.0`, Release — alles **nur auf ausdrückliche Freigabe**.
3. **Android-APK:** nicht gebaut (Android-SDK fehlt auf diesem Rechner, siehe § 3.2).
4. **`ethos.py --dom`** braucht ein laufendes Programm am CDP-Port; der Startversuch der neuen
   `.exe` über `tools/cdp.py start` meldete sich nicht am Port (Ursache **nicht geprüft**).

### 13.4 Nächster Schritt

R12 entscheiden; danach – auf Zuruf – veröffentlichen (Schritte 7/8 aus
[`SITZUNGSABSCHLUSS.md`](../SITZUNGSABSCHLUSS.md)): Push, Tag `v2.2.0`, Release mit den drei
Anhängen, Live-Seite hashen.
