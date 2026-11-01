---
tags: [FISI, Lernspiel, Netzwerk, Übergabe, Release, 3.1.0]
erstellt: 2026-11-01
status: Fassung 3.1.0 gebaut — Release-Rebuild 11:32 im eingefrorenen Baum: Einzeldatei 4.219.830 B / `D50ED3A1…`, Bau df418002 (SHA256 in § 2; ZIP-Prüfsummen transient). Veröffentlichung folgt; Commit-/Live-Felder werden nach Commit/Deploy gefüllt.
---

# Übergabe — Fassung 3.1.0 (2026-11-01)

**Was diese Fassung ist.** 3.1.0 macht den Einstieg und das Arbeiten im Labor selbsterklärend:
vier Onboarding-Schritte beim ersten Start, ein **Analyse-Begleiter** (Leitfaden), der aus echten
Spielzuständen den nächsten sinnvollen Schritt benennt (ohne Lösungen zu verraten), **sichtbare
Kernaktionen** in der rechten Labor-Leiste, eine **ziehbare Inspektorbreite** und der
**Abnahme-Dialog im Bento-Stil**. Dazu QC-Gates (Kein-Leck, R12, 44 px, Layout). Die Fassung ist
**in einem Commit** umgesetzt; die Veröffentlichung ist gemäß Nutzerfreigabe „entwickle B bis zum deploy“ vorgesehen. Alle Zahlen in
[`STAND.md`](../STAND.md), der Verlauf in [`CHANGELOG.md`](../CHANGELOG.md) § 3.1.0.

## 1 · Was neu ist (Kurzfassung)

- **Onboarding:** vier Schritte mit [Überspringen][Weiter][Los geht's], einmalig beim ersten Start,
  wiederholbar über die Einstellungen; Overlay ohne Einfluss auf die R12-Zahl.
- **Analyse-Begleiter:** sechs Leitfaden-Schritte der vollständigen Handlung (IHK); Fortschritt nur
  aus echten Spielzuständen, Impulse statt Lösungen, im Prüfungsmodus neutral, keine Sternkosten.
- **Sichtbare Labor-Aktionen:** Prüfen/Messen/Konfigurieren/Dokumentieren/Abnahme direkt in der rechten
  Leiste; das ⋯-Menü behält Selten-Aktionen (Discoverability-Test).
- **Layout:** Inspektorbreite 280–560 px, ziehbar und persistent, Doppelklick/Einstellungen = Reset,
  Alt+←/→ als Tastaturweg; kein fokussierbares Handle (R12 unverändert).
- **Abnahme-Dialog im Bento-Stil:** Bento-Raster mit Hero (Titel nach Sternen, sichtbare Abzüge),
  Lohn-/Ruf-/Kennzahlen-/Weg-/Merke-Karten; nicht bestandene Dialoge bleiben im alten Stil.
- **QC-Gates:** Kein-Leck-Gate, R12-/44-px-Prüfungen, Rauchtest, Menüprobe, R12-Ratsche, volle Suite,
  `stand`/`seite`/`doku-claims`/`fassung`/`abnahme-3.0` grün — Gate-Protokolle unter `Nachweise/3.1/gates/` (R12-Vorcheck/Festhalten 10:22–10:50), finale Kette nach Build.

## 2 · Artefakte und SHA256 (Release-Rebuild 11:32, eingefrorener Baum)

Maßgeblich ist der **Release-Build 11:32**. **ZIP-Prüfsummen sind transient** (der Bau packt nach
Doku-Änderungen neu) — die endgültigen ZIP-SHA256 stehen im Release; die versionierte Doku nennt den
Stand dieses Builds.

| Artefakt | SHA256 | Anmerkung |
|---|---|---|
| `Netzwerk-Labor.html` | `D50ED3A1A8D5A0EAECCBFB939D6BB7F0955C3B4FD3CE47D41ED9642A9461F713` | 4.219.830 B; byte-gleich mit `docs/index.html`; Größe/Prüfsumme auch in [`STAND.md`](../STAND.md) |
| `docs/index.html` | `D50ED3A1A8D5A0EAECCBFB939D6BB7F0955C3B4FD3CE47D41ED9642A9461F713` | 4.219.830 B; dasselbe Erzeugnis (GitHub-Pages-Datei), 0 Außenverweise |
| `Netzwerk-Labor-3.1.0-Browser.zip` | `E90F9883074D273ED050504FD81AA4DC0A0ADDF1DE27FBCEF2A4A24805C92B64` | 2.376.304 B; SHA256 des Release-Builds 11:32 (**transient** — siehe Release) |
| `Programm/Netzwerk-Labor.exe` | `0100025AA212FC820D850EA3E9839C71CF085A4E94F3006D537DE8B999B43356` | 13.267.968 B; ProductVersion/FileVersion **3.1.0**; Hash nicht reproduzierbar (B5) |
| `Programm/Netzwerk-Labor-3.1.0-Android.apk` | `8D71F6C315219FEE6E42E55D95012CB2013F41A70CE5831FF32395A7F28BAB1D` | 1.529.372 B; `versionName 3.1.0` / `versionCode 30101`, signiert |
| `Netzwerk-Labor-3.1.0-Windows.zip` | `E87FC8BF79B513DF8FCBE8DD2ACA5C0DB5F42A219565C27B84754039F9A4CCC4` | 10.727.192 B; SHA256 des Release-Builds 11:32 (**transient** — siehe Release) |

Baueingang: `web/index.html` 3.680.326 B, SHA256
`4D2EAD764E442B4B93C25D004C954720C4FD18E84B79C505FEB3FE82C46484EC` (`LABOR_VERSION 3.1.0`,
`LABOR_BAU df418002`) — nicht ausgeliefert. Die SHA256 der lokalen Artefakte wurden mit
`Get-FileHash` gemessen; die in `docs/STAND.md` geführte Einzeldatei nennt Größe und Prüfsumme dort
(eine Zahlenquelle, hier nicht wiederholt).

## 3 · Installationswege

- **Im Browser:** [vexx-oss.github.io/NetLab](https://vexx-oss.github.io/NetLab/) — ein Klick, keine
  Installation; zeigt den 3.1.0-Stand nach der Veröffentlichung.
- **Eine Datei:** `Netzwerk-Labor.html` herunterladen, Doppelklick; Schriften eingebettet, offline.
- **Browser-ZIP:** entpacken — Einzeldatei, Doku als Ordner `doku/`, Anleitungen, Lizenztexte.
- **Windows:** `Netzwerk-Labor.exe` aus dem Release; SmartScreen ggf. „Weitere Informationen →
  Trotzdem ausführen“; erscheint kein Fenster: `Programm/Integritaet-reparieren.cmd`.
- **Android:** APK selbst bauen (`python android/bauen.py`, Android-SDK + JDK), aufs Telefon kopieren;
  kein Play Store, kein Konto, keine Berechtigung.

## 4 · Bekannte Grenzen (ehrlich)

- **APK/SHA256SUMS-Lücke:** Ohne die Keystore-Secrets bleibt der Android-APK-Anhang und damit die
  `SHA256SUMS`-Prüfung im Release-Ablauf rot — wie bei 3.0.0; das wird im Release-Bericht benannt.
- **EXE nicht reproduzierbar (B5, bekannt):** Der Release-Rebuild 11:32 hat einen anderen SHA256
  als der Vorlauf 11:04 (`0100025A…` statt `DC84A956…`) — gleiche Größe und Version, aber kein
  reproduzierbarer Hash; das ist im Release-Bericht benannt.
- **CI/Live:** CI-Läufe und Live-Prüfsumme nach Veröffentlichung in `Nachweise/3.1` und den
  Release-Notizen; was nicht gemessen wurde, steht dort ausdrücklich.
- **Nicht geprüft:** echter Gerätelauf Android, Tauri-Fenster auf fremder Hardware, Screenreader,
  Fremd-Hardware-/Browser-Test; Sicht nur über Matrizen.
- **Nicht in 3.1.0:** Server/QR (weiterhin 3.1-Stufe, nicht gebaut), R12-Reduktion der Bestandsansichten,
  44-px-DOM als Gate.

## 5 · Veröffentlichungsschritte (einzeln)

1. Push von `ausbau-1.2` — mit der Veröffentlichung erfolgt (Zeit siehe Git-Historie).
2. Tag `v3.1.0` anlegen und pushen — Zeit siehe Release.
3. Release prüfen — Anhänge: `Netzwerk-Labor.html`, `…-Browser.zip`, `…exe`, `SHA256SUMS`;
   `Content-Disposition`; APK-Lücke benannt — Prüfung nach der Veröffentlichung.
4. Nachmessen — Live-Seite SHA256 gegen `docs/index.html` — Live-Prüfsumme nach Veröffentlichung in
   `Nachweise/3.1` und Release-Notizen.
5. Ehrlicher Abschluss — offene Punkte und APK/SHA256SUMS-Lücke im Endbericht nach der Veröffentlichung.

## 6 · Prüfbelege

- Gate-Protokolle: `Nachweise/3.1/gates/` (R12-Vorcheck 03–11, Baseline-Diff/Festhalten 13–17);
  Prüfungen: `Nachweise/3.1/pruefungen/R-ARCH-3.1B-VORPRUEFUNG.md`; Sicht: `Nachweise/3.1/sicht/31B-SICHT-FINAL.md`
  (Vorprüfung/Zwischenstand, Abschluss nach gates) + Feature-/Review-Belege `Nachweise/3.0/sicht/31b/nachher/`
  (26 PNG + matrix.json, **nicht** HERKUNFT).
- Plan: [`Plan 3.1.0 — Variante B`](<../superpowers/plans/2026-11-01-variante-b-onboarding-analyse-begleiter.md>).
- Stand: [`STAND.md`](../STAND.md) · Verlauf: [`CHANGELOG.md`](../CHANGELOG.md) § 3.1.0 ·
  Arbeitsregeln: [`SITZUNGSABSCHLUSS.md`](../SITZUNGSABSCHLUSS.md).

Verwandt: [`INHALT.md`](../INHALT.md) · [`README.md`](../../README.md) · [`Liesmich.md`](../Liesmich.md)