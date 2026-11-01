---
tags: [FISI, Lernspiel, Netzwerk, Übergabe, Release, 3.0.0]
erstellt: 2026-11-01
status: Fassung 3.0.0 lokal fertig (Commit b23c4a4) — Push, Tag und Release brauchen die ausdrückliche Freigabe des Nutzers; nichts davon ist geschehen.
---

# Übergabe — Fassung 3.0.0 (Stand 01.11.2026)

**Was diese Fassung ist.** 3.0.0 macht aus dem Labor ein **Unterrichts-Werkzeug für eine ganze
Klasse** und schließt die Qualitätslücke: Jede der drei Bau-Wellen (W1–W3) wurde von einem eigenen
Prüf-Gate abgenommen, die Oberfläche gegen R12-Bedienelemente, 44-px-Ziele, Fokus und Kontrast
gemessen, die Sicht mit Screenshot-Matrizen belegt. Die Fassung ist **lokal fertig und committet**;
Push, Tag `v3.0.0` und Release stehen aus. Der ausführliche Änderungsverlauf steht in
[`CHANGELOG.md`](../CHANGELOG.md) § 3.0.0; alle Zahlen in [`STAND.md`](../STAND.md).

## 1 · Was neu ist (Kurzfassung)

- **Klassenraum 3.0:** mehrere Sitzungen je Gerät (Schema `fassung:2`, Migration verlustfrei),
  Sitzungsverwaltung mit Löschen nur auf Quittung, Ergebnis-Korrektur mit
  [Abbrechen][Ersetzen][Entfernen], **anonymes Diagnose-Histogramm** je Schritt, **20-Plätze-Übersicht**
  mit Restzeit und offenen Sitzplätzen, eine Definition für „abgegeben/offen"; rangfrei, ohne Namen.
- **Spiel und Lernen:** Sicherung wiederherstellen mit Knopf und Datum, Spielstand-Migration
  2.9 → 3.0, Prüfungs-Hilfe zentral gesperrt, IHK-Note exakt ohne Rundung, fehlende Prüfungsaufgabe
  zählt 0, Trainingskarten pinnen ihren Injektor.
- **Inhalte:** Dichte-Gate (30 Matrixzeilen, Wiki ≥ 4 Abschnitte je Zelle, mindestens ein Injektor je
  Fertigkeit), 15 neue Wiki-Abschnitte, /31 und /32 nach RFC 3021 nachgerechnet, STP-Injektoren ehrlich,
  Klassenraum-Server/QR ausdrücklich als **3.1** benannt.
- **Oberfläche und Barrierefreiheit:** nur adressierbare Aufträge, Antwort und „Prüfen“ im Sichtfeld
  (auch 960/720 px), Meldungen unter dem Feld, Fokus nach dem Neuzeichnen, Presets, Seed-Determinismus
  der Lernspiele, Sichturteile VIS-09, 44-px-Ziele mit belegten Ausnahmen, Theme-Parität/Kontrast.
- **Simulation, Konsole, Kern:** eigener Broadcast wird nicht mehr empfangen, jedes Verwerfen mit
  `grund` oder `harmlos`, Konsolen-Roundtrip/Fehlpfade, Plattform-Fähigkeitsmatrix, Persistenz-Schutz,
  Modell-Invarianten und Determinismus-Wache.
- **Doku:** Lehrkraft-Erste-Stunde und Schüler-Erste-fünf-Minuten neu, FAQ erweitert, Bauen/README/INHALT
  auf 3.0.0, Design § 44/§ 45, Architektur-Verträge § 6.1/§ 7.4/§ 7.5/§ 8/§ 12/§ 16.1/§ 17.2.
- **Gates/CI:** Namens-Gate, Werte-Gate `doku-claims.py` mit Gegenprobe, DoD-Gate
  `abnahme-3.0.py`, R12-Messweg mit versionierter Ratsche, `browser.yml`, `pruefen.yml` mit
  DOK-03/VIS-01, `release.yml` mit Pflicht-Keystore und SHA256SUMS.

**Commits der Sitzung (in dieser Reihenfolge):**

| Commit | Inhalt |
|---|---|
| `dd42723` | W0: Messbasis, Ausnahmen A1–A3, § 12 des Vertrags wiederhergestellt |
| `aa08057` | W1: Klassenbetrieb-Grundlage, Simulation, Inhalte, Oberfläche, Gates |
| `d0785d6` | W1-Hotfix: Antwort-Platzhalter verrät die Lösung nicht mehr (Z-07) |
| `ff06834` | W2: Klassenraum 3.0 (Sitzungen, Korrektur, Diagnose, Übersicht), Spiel/Lernkern, R12 messbar |
| `1a177b4` | W3: Klassenraum-Betrieb rund, Sichturteile, Gates/CI gehärtet |
| (W4) | Sicht-Matrix 12 × 3 × 7 Themes in `Nachweise/3.0/sicht/w4/matrix` — **kein Commit** (Messung) |
| `b23c4a4` | W5: Fassungszug 3.0.0, Bildstand 3.0.0, Doku und Stand nachgezogen |

## 2 · Artefakte und SHA256 (lokal, in dieser Sitzung gemessen)

| Artefakt | SHA256 | Anmerkung |
|---|---|---|
| `Netzwerk-Labor.html` | `D86B905F0CE8A53571758E6D3D13C3434C6691BB2590CC89636B1609E98D9583` | byte-gleich mit `docs/index.html`; Größe und Prüfsumme stehen in [`STAND.md`](../STAND.md) |
| `docs/index.html` | `D86B905F0CE8A53571758E6D3D13C3434C6691BB2590CC89636B1609E98D9583` | dasselbe Erzeugnis (GitHub-Pages-Datei) |
| `dist/Netzwerk-Labor-3.0.0-Browser.zip` | `0606CC5027ABD81A9524A1BCF517E35503298ED95921EC6FA11EBEB2A5D9A70C` | Browser-Paket für das Release |
| `Programm/Netzwerk-Labor.exe` | `A53BA7708602F3971B881AE02D541E71B7D4F7CDA3EAAEE5CEF94DDF111AD73A` | ProductVersion **3.0.0** |
| `Programm/Netzwerk-Labor-3.0.0-Android.apk` | `0A35E2C40A9741B671F46237A079C78881E99B124E1756E84FFA292B79E57C30` | `versionCode 30001`, signiert (laut W5-Commit) |
| `dist/Netzwerk-Labor-3.0.0-Windows.zip` | `80A7931E…` (laut W5-Commit) | lag beim Prüfen **nicht mehr** im Arbeitsbaum — **nicht geprüft**; entsteht beim Release neu |

Die SHA256 der lokalen Artefakte wurden am 01.11.2026 mit `Get-FileHash` gemessen; die in
`docs/STAND.md` geführte Einzeldatei nennt Größe und Prüfsumme dort (eine Zahlenquelle, hier nicht
wiederholt).

## 3 · Installationswege

- **Im Browser:** [vexx-oss.github.io/NetLab](https://vexx-oss.github.io/NetLab/) — ein Klick, keine
  Installation. **Achtung:** Die Live-Seite zeigt erst nach Push/Tag den 3.0.0-Stand (Freigabe offen).
- **Eine Datei:** `Netzwerk-Labor.html` herunterladen, Doppelklick; Schriften eingebettet, kein
  Nachladen, kein Internet nötig.
- **Browser-ZIP:** `Netzwerk-Labor-3.0.0-Browser.zip` entpacken — Einzeldatei, die Doku als Ordner
  `doku/`, Anleitungen, Lizenztexte.
- **Windows:** `Netzwerk-Labor.exe` (Release-Anhang, stabiler Link
  [/releases/latest/download/Netzwerk-Labor.exe](https://github.com/Vexx-oss/NetLab/releases/latest/download/Netzwerk-Labor.exe));
  SmartScreen ggf. „Weitere Informationen → Trotzdem ausführen“. Erscheint kein Fenster:
  `Programm/Integritaet-reparieren.cmd` (Integritätslabel „Niedrig“).
- **Android:** APK selbst bauen (`python android/bauen.py`, Android-SDK + JDK nötig), aufs Telefon
  kopieren, „Unbekannte Apps installieren“ erlauben; kein Play Store, kein Konto, keine Berechtigung.
  **Nicht geprüft:** Lauf auf einem echten Gerät/Emulator.

## 4 · Bekannte Grenzen (ehrlich)

- **Kein Push, kein Tag, kein Release:** In dieser Sitzung nicht geschehen; die Live-Seite, die
  Release-Anhänge und die GitHub-Abläufe sind **nicht gemessen**.
- **CI nicht gelaufen:** Die Workflows sind geschrieben und geprüft (`tools/ablaeufe.py`), aber in
  dieser Sitzung nicht auf GitHub ausgeführt.
- **R12:** Die starre 6er-Norm ist nicht erreicht; die Bestandswerte über der Grenze sind als
  `tests/r12-stand.json` eingefroren (kein Zuwachs erlaubt). Das ist „eingefrorener Bestand“, nicht
  „grün“ im Sinne der Norm.
- **Nicht geprüft:** echter Klassennetz-/Firewall-Aufbau mit 20 Geräten, echte Unterrichtsstunde,
  Server/QR (sind **3.1**), Geräteinstallation Android, Tauri-Fenster auf fremder Hardware,
  Screenreader, 44-px-DOM-Messung als Gate.
- **Sicht:** Die W4-Matrix (12 Ansichten × 3 Breiten × 7 Themes) und die 11 Schlüsselbilder belegen
  die Optik; sie ersetzen keinen Browser-/Gerätetest auf fremder Hardware.
- **Keystore-Secrets:** Der Release-Ablauf verlangt sie; ob sie im Repository gesetzt sind, ist
  **nicht geprüft** (die Android-APK wurde lokal gebaut und signiert).

## 5 · Offene Freigaben (je einzeln vom Nutzer zu erteilen)

1. **Push** von `ausbau-1.2` (lokal ahead, kein Push).
2. **Tag** `v3.0.0` anlegen und pushen.
3. **Release anlegen/prüfen** — Anhänge: `Netzwerk-Labor.html`, `…-Browser.zip`, `.exe`,
   `SHA256SUMS`; APK nur anhängen, wenn gebaut und geprüft (Entscheid des Nutzers).
4. **Nachmessen** von Live-Seite und Release-Anhängen (SHA256, `Content-Disposition`).

## 6 · Abnahme- und Prüfbelege

- Vertrag und Stand: [`Architektur.md`](../Architektur.md) (Stand-Zeile 3.0.0),
  [`STAND.md`](../STAND.md) (einzige Zahlenquelle), [`CHANGELOG.md`](../CHANGELOG.md) § 3.0.0.
- Protokolle: `Nachweise/3.0/00-Messbasis.md` § 17–19, `Nachweise/3.0/gates/` (W0–W3),
  `Nachweise/3.0/W2-PRUEFPUNKTE.md`, `W3-PRUEFPUNKTE.md`, `Nachweise/3.0/w3-pruefungen/BEFUNDE-W3.md`.
- Sicht: `Nachweise/3.0/sicht/w4/matrix` (252 Aufnahmen) und `Nachweise/3.0/sicht/w5/doku`
  (11 Schlüsselbilder, `matrix.json` mit Quelle/Prüfsummen).
- Arbeitsregeln: [`SITZUNGSABSCHLUSS.md`](../SITZUNGSABSCHLUSS.md) — die acht Schritte, auf 3.0.0
  fortgeschrieben.

Verwandt: [`INHALT.md`](../INHALT.md) · [`README.md`](../../README.md) · [`Liesmich.md`](../Liesmich.md)
