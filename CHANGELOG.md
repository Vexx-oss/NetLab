# Änderungsverlauf

Der Verlauf ist aus der echten Commit-Historie abgeleitet, nicht aus Erinnerung. Die
ausführlichen Begründungen, Messwerte und verworfenen Versuche stehen in
[`Design – Spielspaß 2.0.md`](Design%20%E2%80%93%20Spielspa%C3%9F%202.0.md) und
[`Plan – Ausbau 1.2.md`](Plan%20%E2%80%93%20Ausbau%201.2.md).

Zweig: `ausbau-1.2` (Standardzweig). Tags: `endversion-1.0`, `v1.1`.

---

## 1.2.0 — in Arbeit auf `ausbau-1.2`

105 Commits seit `v1.1`. Schwerpunkte:

**Versionsnummer nachgezogen**

- `VERSION` stand seit dem Tag `v1.1` unverändert auf `1.1.0`, obwohl `ausbau-1.2` seither
  105 Commits weiter ist — das gebaute Spiel nannte sich also weiter „v1.1.0". Jetzt
  `1.2.0` in `bauen.py`, `shell/src-tauri/Cargo.toml` und `shell/src-tauri/tauri.conf.json`.
  Kein Test hängt an der Nummer (geprüft: 213/213 unverändert grün).
- **Nicht** neu gebaut wurde die `.exe` — sie liegt weiter als Version 1.1.0 in
  `Programm/` und sagt das über ihre Dateieigenschaften auch selbst.

**Auslieferung (neu in dieser Fassung)**

- `docs/index.html` — das ganze Spiel als **eine Datei**, Schriften eingebettet, keine
  Außenverweise. Läuft per Doppelklick und über GitHub Pages.
- **Zeilenenden normalisiert:** die Quellen sind gemischt (61 Dateien CRLF, 101 LF). Der
  Bau erbte das und schrieb 23.838 CRLF in `docs/index.html` — Git hätte die Datei als
  „ständig geändert" geführt, und der Bau auf Linux wäre nicht byte-gleich zu Windows
  gewesen. `bauen.py`, `tools/einfach.py` und `tools/bilder.py` lesen jetzt normalisiert
  und schreiben LF. Nebeneffekt: die Einzeldatei ist rund 24 KB kleiner.
- `tools/paket.py` — baut ein Auslieferungspaket (Ordner + ZIP) und prüft es per CRC32
  gegen das Original zurück.
- `tools/starttest.py` — startet die Einzeldatei in einem echten Browser (headless Edge,
  `file://`) und misst `#app`, CSS-Regeln, geladene Schriften und JS-Fehler.
- `tools/einfach.py` — baut die Einzeldatei aus `web/` und verweigert den Bau, wenn ein
  Außenverweis übrig bleibt.
- `.github/workflows/` — Prüflauf bei jedem Push, Veröffentlichung auf GitHub Pages.
  Beide Abläufe sind auf einem frischen Klon nachgestellt (`tools/ci-nachbau.py`): ohne
  die Nachbar-Spielhalle, ohne `Nachweise/` und ohne Pillow — genau der Zustand auf
  GitHub. Drei Fehler fielen dabei auf und sind behoben:
  `tools/lernmotor-bau.py` und `tools/lernmotor-rueckfall.py` brachen ohne die Spielhalle
  ab; `tools/bilder.py` verlangte Pillow schon beim Prüfen (auf dem Runner nicht
  installiert) und riss den ganzen Lauf mit; und ein zweiter Job im
  Veröffentlichungs-Ablauf ließ GitHub nach 902 s den *gesamten* Lauf abbrechen.
- **`fremd/lernmotor.js`** — der Lernmotor lag bisher außerhalb des Repositoriums
  (`../FISI-Spielhalle`). Ein frischer Klon war deshalb weder baubar noch testbar. Jetzt
  liegt der Stand im Repo, mit Herkunft und Prüfsumme im Kopf. Drei Werkzeuge weisen es
  nach: `tools/lernmotor.py` (Kopie gegen Quelle), `tools/lernmotor-bau.py` (Bau mit und
  ohne Spielhalle byte-gleich), `tools/lernmotor-rueckfall.py` (Tests **und**
  Simulationsvergleich laufen ohne Spielhalle).
- `tests/run.js` und `tools/sim-stand.js` hatten dieselbe Außenabhängigkeit und greifen
  jetzt ebenfalls auf die Kopie zurück — sonst wäre der Prüflauf auf GitHub gescheitert.
- `tools/test.sh` sucht Node jetzt auch im `PATH` (vorher war ein Windows-Pfad
  festgenagelt) — dasselbe Skript läuft damit auf GitHub.

**Ausbau 1.2, Phase 0 und A**

- Geräte-Fächer, Ansicht-Menü, Inspektor und Simulation erst bei Bedarf.
- Auftragszeile und Auftragsmappe, Textdiät, „Erklär mir das".

**Auftrag R — DHCP-Tiefe und Sicherheitsvorfälle**

- Lease-Laufzeit, Erneuerung bei 50 %, `domain`-Option, Reservierung, Adresskonflikt,
  Lease-Liste und die fünf Grundcodes (DHCP DORA, NAK, DECLINE).
- Rogue-DHCP und DHCP-Snooping über die Konsole (`ip dhcp snooping`).
- Zwei DHCP-Injektoren (fremder Server, Snooping ohne Trust).
- *Behobener Befund:* Der gesamte DHCP-Pool-Modus der Konsole war seit 1.0
  **wirkungslos** — der Test prüfte nur den Prompt. Ein Test, der nur den Prompt prüft,
  ist kein Test.

**Lesbarkeit der Topologie**

- Adressschilder weichen Geräten aus, Beschriftungen größer, Zoom gestaffelt,
  Tooltip mit allen Adressen, Klick auf eine Adresse kopiert sie (für Routing von Hand).
- Werkzeug-Kurztasten stehen jetzt sichtbar im Knopf (es gab sie schon, man fand sie nicht).
- Simulationsansicht: inhaltstragende Beschriftungen auf mindestens 12 px.

**Startprobleme (Befund, berichtigt)**

- Die `.exe` startete nicht (`failed to create webview`, `0x800700AA`). Erste Deutung
  (zwangsweise beendete `msedgewebview2.exe`) war **falsch**. Gemessene Ursache:
  Das Integritätslabel „Niedrig" auf dem Vault vererbt sich auf die `.exe`, die dadurch
  als Low-Prozess läuft und `%LOCALAPPDATA%` nicht beschreiben darf.
  `Programm/Integritaet-reparieren.cmd` setzt das Label ohne Administratorrechte zurück.

## 1.1.0 — Tag `v1.1` (01.10.2026)

- Konsole, Simulations-Panel und PDU-Ansicht richtig gestaltet — **in 1.0 fehlten diese
  Stylesheets ganz**.
- Einstieg: Coach-Hinweis erscheint sofort und wählt das passende Werkzeug vor.
- 15 Abzeichen, Fortschrittsbalken zur nächsten Stufe, Feierabend-Bilanz mit den morgen
  fälligen Themen.
- Prüfungstag und generierte Tickets nennen das **Symptom aus Kundensicht** statt der Ursache.
- Leiste aufgeklappt 320 × 300, Ecke aus den Einstellungen wirkt.
- Spielstand: zusätzlich „vorheriger Stand" (alle 15 min), wird bei beschädigter Datei
  zuerst geladen.
- Linux-Pakete bleiben auf Stand 1.0.

## 1.0.0 — Tag `endversion-1.0` (01.10.2026)

Erste vollständige Fassung: 37 handgeschriebene Tickets, 83 Mini-Tickets, 115 Tests grün,
Windows-`.exe` sowie Linux-Pakete (`.deb`, AppImage, `.tar.gz`).

## 2026-09-30 — Grundgerüst

`8769e8d` Grundgerüst, Architektur und Zwischenstände. Zwei Anläufe, beide am
Nutzungslimit abgebrochen.
