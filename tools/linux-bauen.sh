#!/bin/bash
# Linux-Fassung des Netzwerk-Labors in der WSL-Ubuntu bauen (Konzept § 9.5: jedes System baut nativ).
#   wsl -d Ubuntu -u root -- bash /mnt/c/Users/Student/Documents/Joshua/10-Projekte/Lernprojekte/Netzwerk-Labor/tools/linux-bauen.sh
# Voraussetzungen (einmalig, als root): apt-get install build-essential pkg-config libwebkit2gtk-4.1-dev libgtk-3-dev
#   librsvg2-dev libayatana-appindicator3-dev libssl-dev file; Rust über rustup; optional: cargo install tauri-cli --version "^2" --locked
# Ergebnis: Programm/linux/netzwerk-labor (Binary), *.deb und – wenn möglich – *.AppImage
set -e
QUELLE="$(cd "$(dirname "$0")/.." && pwd)"
ARBEIT=/root/nl-build
source /root/.cargo/env
python3 "$QUELLE/bauen.py" >/dev/null 2>&1 || true            # web/ frisch (falls python3 da ist; sonst den Windows-Stand nehmen)
rm -rf "$ARBEIT"; mkdir -p "$ARBEIT"
cp -r "$QUELLE/shell" "$QUELLE/web" "$ARBEIT/"
rm -rf "$ARBEIT/shell/src-tauri/gen" "$ARBEIT/shell/src-tauri/target"
export CARGO_TARGET_DIR=/root/netzwerk-labor-target
cd "$ARBEIT/shell/src-tauri"
if command -v cargo-tauri >/dev/null 2>&1; then
  cargo tauri build --bundles deb,appimage || cargo tauri build --bundles deb || cargo tauri build --no-bundle
else
  cargo build --release --features custom-protocol
fi
AUS="$QUELLE/Programm/linux"
mkdir -p "$AUS"
cp "$CARGO_TARGET_DIR/release/netzwerk-labor" "$AUS/"
cp "$CARGO_TARGET_DIR"/release/bundle/deb/*.deb "$AUS/" 2>/dev/null || true
cp "$CARGO_TARGET_DIR"/release/bundle/appimage/*.AppImage "$AUS/" 2>/dev/null || true
( cd "$AUS" && tar czf netzwerk-labor-linux-x86_64.tar.gz netzwerk-labor )
ls -la "$AUS"
