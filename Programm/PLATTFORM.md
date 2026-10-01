---
tags: [FISI, Lernspiel, Netzwerk-Labor, Plattform]
erstellt: 2026-10-01
---

# Netzwerk-Labor – Plattform-Ergebnisse (Version 1.0)

⬆️ [[10-Projekte/Lernprojekte/Netzwerk-Labor/Liesmich|Netzwerk-Labor]] · Konzept § 9.4 und § 11 (Phase 0)

## Was wirklich geht (getestet, nicht angenommen)

Getestet am 30.09./01.10.2026 auf diesem Rechner (Windows 11 Pro, 1920×1200, Skalierung 125 %) und in der WSL-Ubuntu 26.04 mit WSLg. **WSLg ist kein echtes GNOME oder KDE** – auf einem echten Linux-Desktop kann es anders aussehen (Tray, Fensterplatzierung).

| Funktion | Windows 11 | WSLg X11 (`GDK_BACKEND=x11`) | WSLg Wayland |
|---|---|---|---|
| Programm startet, Spiel lädt, keine JS-Fehler | ✅ | ✅ | ✅ |
| Leiste: rahmenlos, 300×56 / 320×300 (bis 1.0: 320×220) | ✅ gemessen | ✅ (gemeldet) | ✅ (gemeldet) |
| Leiste ohne Fokus, ohne Ton, ohne Pop-up | ✅ (Fokus und Vordergrund nachgeprüft: nein) | – nicht geprüft | – nicht geprüft |
| Immer im Vordergrund | ✅ | ✅ | ❌ Wayland erlaubt es Programmen nicht |
| Leiste selbst positionieren (unten rechts, je Monitor gemerkt) | ✅ | – nicht geprüft | ❌ der Compositor platziert |
| Tray-Symbol mit Punkt und Tooltip | ✅ | ❌ in WSLg kein Tray-Dienst | ❌ in WSLg kein Tray-Dienst |
| Globales Tastenkürzel Strg+Alt+L | ✅ registriert | ✅ registriert | ❌ unter Wayland nicht möglich |
| Autostart (still im Tray) | ✅ Schalter vorhanden (nicht eingeschaltet getestet) | ✅ ~/.config/autostart | ✅ ~/.config/autostart |
| Klick-Durchlässigkeit | ❌ nicht eingebaut | ❌ | ❌ |
| Vollbild/Präsentation blendet die Leiste aus | ✅ eingebaut (SHQueryUserNotificationState), nicht mit echter Präsentation getestet | ❌ | ❌ |
| Systembenachrichtigungen | ❌ bewusst nicht eingebaut (Punkt am Tray statt Pop-up) | ❌ | ❌ |
| Einzelinstanz (zweiter Start holt das Fenster) | ✅ geprüft (ein Prozess bleibt) | – nicht geprüft | – nicht geprüft |
| Spielstand atomar + Sicherungen | ✅ geprüft | ✅ (gleicher Code) | ✅ |
| Beschädigte Datei → Sicherung + Meldung | ✅ geprüft (beschädigte Datei bleibt als `spielstand.beschaedigt-…json`) | – | – |

Wo etwas fehlt, zeigt das Programm es in den Einstellungen ausgegraut mit einem Satz Begründung (`Plattform.kann()`); ohne Tray beendet „Schließen“ das Programm, statt es unsichtbar weiterlaufen zu lassen.

## Leerlauf (Windows, 30–45 s gemessen, `tools/messen.ps1`)

| Zustand | Prozesse | CPU (alle Kerne) | Arbeitsspeicher (Working Set) | privat |
|---|---|---|---|---|
| Leiste | 7 | 0,01 % | 551 MB | 280 MB |
| Tray (versteckt) | 7 | 0,10 % | 479 MB | 207 MB |
| Vollansicht | 7 | 0,02 % | 609 MB | 337 MB |

**Ehrlich:** Die CPU ist im Leerlauf praktisch null (Ziel erreicht). Der Speicher ist deutlich höher als „minimal“ – das ist die WebView2 (Chromium) mit GPU-, Netzwerk- und Renderprozessen; das Working Set zählt geteilte Seiten mehrfach. Gemessen mit eingeschaltetem Fernsteuerungs-Port (Testaufbau). Möglicher späterer Hebel: WebView2 ohne GPU-Prozess starten (geringerer Speicher, langsamere Grafik) – nicht eingebaut.

Linux: nicht gemessen (WSLg ist dafür nicht aussagekräftig).

## Bauen

| Was | Befehl |
|---|---|
| Web-Teil (immer zuerst) | `python bauen.py` → `web/index.html` |
| Tests | `sh tools/test.sh` (Node 24 portabel) bzw. `web/tests.html` im Browser |
| Windows | `cd shell/src-tauri` · `CARGO_TARGET_DIR=C:/Users/Student/AppData/Local/netzwerk-labor/target cargo tauri build --no-bundle` → `netzwerk-labor.exe` nach `Programm/Netzwerk-Labor.exe` kopieren |
| Linux | `wsl -d Ubuntu -u root -- bash /mnt/c/…/Netzwerk-Labor/tools/linux-bauen.sh` → `Programm/linux/` (.deb, AppImage, Binary, .tar.gz) |
| Linux-Selbsttest | `wsl -d Ubuntu -- bash /mnt/c/…/Netzwerk-Labor/tools/linux-selbsttest.sh` |
| Test im echten Windows-Programm | `python tools/cdp.py start --frisch` · `python tools/cdp.py eval "…"` · `python tools/cdp.py shot bild.png` · `python tools/cdp.py stop` |
| Browser-Fassung (Nebenprodukt) | `python bauen.py --paket` → `Dokumente/Lernpakete/Netzwerk-Labor-Browser_<Datum>.zip` |

Hinweis Git-Bash: Für `wsl … /mnt/c/…` vorher `MSYS_NO_PATHCONV=1` setzen, sonst schreibt Git-Bash den Pfad um.

## Installiert (mit Version)

- Windows: tauri-cli 2.12.0 (`cargo install`), Node 24.21.0 portabel unter `%LOCALAPPDATA%\node-portable` (SHA256 gegen nodejs.org geprüft). Rust 1.97.1, MSVC 14.44 und WebView2 waren schon da.
- WSL-Ubuntu 26.04 (als root): build-essential, pkg-config, libwebkit2gtk-4.1-dev 2.52.6, libgtk-3-dev, librsvg2-dev, libayatana-appindicator3-dev, libssl-dev, nodejs, curl, wget, file, xdotool, wmctrl, imagemagick; Rust über rustup (stable, minimal); tauri-cli 2 (`cargo install`). Beim AppImage-Bau lädt tauri-cli linuxdeploy und AppRun von GitHub (tauri-apps, linuxdeploy).

## Linux-Pakete

- `Netzwerk-Labor_1.0.0_amd64.deb` (Ubuntu/Debian): `sudo apt install ./Netzwerk-Labor_1.0.0_amd64.deb` – zieht WebKitGTK als Abhängigkeit.
- `Netzwerk-Labor_1.0.0_amd64.AppImage` (bringt fast alles mit): ausführbar machen (`chmod +x`), starten. Auf neueren Ubuntu-Versionen ggf. `libfuse2` installieren oder mit `--appimage-extract-and-run` starten (nicht auf einem echten Desktop geprüft).
- `netzwerk-labor` / `.tar.gz`: nacktes Binary, braucht `libwebkit2gtk-4.1-0` auf dem System.
