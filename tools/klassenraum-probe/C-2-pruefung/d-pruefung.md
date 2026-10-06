# Gegenprüfung D – QR-Encoder (Rust) und Differentialtest gegen die unabhängige Python-Referenz

- **Rolle:** Gegenprüfer D (QR-Code), Zweig `ausbau-1.2`, Auftrag KLASSENRAUM.md Stufe D
- **Datum/Uhrzeit der Messungen:** 07.10.2026, 00:06–00:20 (Systemzeit), Sitzung vom 06.10.2026 23:5x
- **Werkzeuge:** `cargo 1.97.1 (c980f4866 2026-06-30)`, `rustc 1.97.1 (8bab26f4f 2026-07-14)`, `Python 3.14.6`
- **Zweig:** `git branch --show-current` → `ausbau-1.2`
- **Gegenstand:** `tools/klassenraum-probe/C-qr-rust/` (Rust, abhängigkeitsfrei) und der Differentialtest `tools/klassenraum-probe/C-qr-python/vergleich.py` gegen `qr_referenz.py` / `qr_lesen.py`
- **Geschriebene Dateien:** nur diese Datei. Alle Hilfsskripte liegen in `%TEMP%\dsh-fEVPuX\D-gegenprobe-qr\` (`p_a.py` … `p_u.py`, `hilfen.py`, `regeln.py`), nicht im Repo.
- **Nicht angefasst:** `shell/**`, `src/**`, `tests/**`, `bauen.py`, `.gitignore`, `docs/**`, bestehende `tools/*.py`. Kein Commit, kein Push, kein Reset, nichts installiert, kein Prozess beendet, `tools/repo-verweise-flicken.py` nicht ausgeführt.
- **Zwei Anmerkungen zur Sauberkeit des Repos:**
  1. `vergleich.py` schreibt ohne Argument den Nachweis nach `Nachweise/Klassenraum/C-qr.json`. Da ich nur **eine** Datei schreiben darf, habe ich den Vergleich zweimal mit `--nachweis %TEMP%\...\lauf1.json` bzw. `lauf2.json` aufgerufen und den Repo-Nachweis nur **gelesen**. Der Nachweis ist unverändert (Größe 22 385 B, `LastWriteTime` 06.10.2026 23:48:39 – vor meiner Sitzung).
  2. Mein Nachbau hat beim Import von `qr_lesen.py` (für die Zählung der freien Module, Befund 5) ein `C-qr-python\__pycache__\qr_lesen.cpython-314.pyc` erzeugt (07.10.2026 00:08:30). Das habe ich wieder entfernt; der Ordner `C-qr-python` enthält wieder genau die vier `.py`-Dateien.
  `git status --short` ist vor und nach meiner Arbeit gleich (`?? docs/entwicklung/Klassenraum…`, `?? docs/entwicklung/Klassenraum/`, `?? tools/auftraege/KLASSENRAUM.md`, `?? tools/klassenraum-probe/`, `?? tools/klassenraum/`).

**Ergebnis in einem Satz:** Alle Kernfunktionen (Matrix, Formatbits, Dunkelmodul, Kapazität, SVG, Rückkodierung, Fehlerfälle) sind nachgerechnet und halten; **gefunden wurde ein echter Fehler in Strafregel 1** (Spalten laufen mit dem falschen Startmodul an), der in 15 von 788 gemessenen Fällen eine andere Maske wählt als die unabhängige Python-Referenz – der Differentialtest findet ihn nicht, weil keiner seiner 21 Fälle betroffen ist.

---

## 1. Bauen und Testen

### 1.1 `cargo build --release`

```
cd tools\klassenraum-probe\C-qr-rust
cargo build --release
```

Ergebnis: **Rückgabewert 0**, Ausgabe „`Finished `release` profile [optimized] target(s) in 0.02s`“ – also **nichts neu übersetzt**; cargo hält die `.exe` für aktuell zu den Quellen (Fingerabdruck stimmt). (Die Zeilen erscheinen in PowerShell rot als `NativeCommandError`, weil cargo nach stderr schreibt; das ist kein Fehler.)

### 1.2 `cargo test --release`

```
cargo test --release
```

Ergebnis: **Rückgabewert 0**, `running 5 tests` … `test result: ok. 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s`.
Einzelne Tests: `qr::tests::format_info_bekannte_werte`, `qr::tests::kapazitaet_v1h_ist_zehn`, `qr::tests::reed_solomon_bekanntes_beispiel`, `qr::tests::zehn_zeichen_passen_elf_nicht`, `qr::tests::takt_und_sucher_stehen`.

### 1.3 Erzeugte Datei

```
Get-Item target\release\C-qr-rust.exe
(Get-FileHash target\release\C-qr-rust.exe -Algorithm SHA256).Hash
```

- Größe: **164 864 Bytes**
- SHA256: **DAC4083173AA861AE7D5E4F1F043BE641E81637209265A8CA0BFCADDC5DCB379**
- `LastWriteTime`: 06.10.2026 23:48:23

### 1.4 Gehört die `.exe` wirklich zu diesen Quellen? (Zusatzprüfung)

Zweimal frisch außerhalb des Repos gebaut (Quellen aus dem Repo, Zielordner in `%TEMP%`):

```
cargo build --release --target-dir %TEMP%\...\rustbau  --manifest-path <Repo>\Cargo.toml
cargo build --release --target-dir %TEMP%\...\rustbau2 --manifest-path <Repo>\Cargo.toml
```

| Datei | Größe | SHA256 |
|---|---|---|
| frisch 1 | 164 864 | D399862AFD72D4193F73E69A00CDA139C9020CDFDC63AC165455006E9F0D7F3C |
| frisch 2 | 164 864 | B09BFB1324AA231D17AA1866619A653E11DEF18EF35940D4F4C8270C3E335D62 |
| im Repo | 164 864 | DAC4083173AA861AE7D5E4F1F043BE641E81637209265A8CA0BFCADDC5DCB379 |

Die drei Dateien unterscheiden sich in **genau 24 Bytes** an denselben Stellen (248/249 im PE-Kopf, 141 380…141 823 in `.rdata` = Debug-Verzeichnis/RSDS-PDB-Kennung). Der Codeabschnitt ist **bei allen drei byte-gleich**:

```
.text (1024..119808) SHA256 = 7c5fe74fe826814151d3a2e0a7a342af20ecc0b21be80761918f23675febb3fe  (frisch1, frisch2, Repo)
```

Damit ist die `.exe` im Repo code-identisch mit einem Frischbau aus den vorliegenden Quellen; die 24 Bytes sind reine Verbindungs-Zeitstempel (der Bau ist also nicht byte-reproduzierbar, aber code-reproduzierbar).

### 1.5 Eingebauter Selbsttest

```
target\release\C-qr-rust.exe --selbsttest
```

Rückgabewert **0**; JSON mit 7 Fällen, jeder `"ok":true` (Kantenlängen 21/21/21/25/29/33/33); stderr: `Kapazitaet V1-H: 10 Zeichen ok, 11 Zeichen abgelehnt: true`.
**Einschränkung (aus dem Quelltext, `main.rs:207`):** der Selbsttest prüft nur die Kantenlänge `17 + 4*version` – nicht die Matrix und nicht die Maskenwahl. Er kann den in Abschnitt 7 gefundenen Fehler nicht sehen.

---

## 2. Differentialtest Rust gegen Python-Referenz

```
python tools\klassenraum-probe\C-qr-python\vergleich.py --nachweis %TEMP%\...\lauf1.json      # Lauf 1
python tools\klassenraum-probe\C-qr-python\vergleich.py --nachweis %TEMP%\...\lauf2.json      # Lauf 2
```

Ergebnisse (beide Läufe identisch, jeweils **Rückgabewert 0**):

- 21 Fälle (`vergleich.py:37-64`), alle Zeilen `ok …`, jede mit `sha256 …`,
- Schlusszeilen: `Kapazitaet V1-H: 10 Zeichen ok, 11 abgelehnt (beide): True` und `Faelle: 21  alle Matrizen gleich und rueckkodiert: True`
- Lauf 1 gegen Lauf 2: **0 Unterschiede** in allen 21 Rust-Hashes, alle `alle_gleich=True`
- Lauf 1 gegen den Repo-Nachweis `Nachweise/Klassenraum/C-qr.json`: **0 Unterschiede** in allen 21 Rust-Hashes und allen 21 Python-Hashes

**Nachweis eigens nachgerechnet** (`p_a.py`): ich habe den Rust-Encoder für alle 21 Fälle selbst aufgerufen und den SHA256 **selbst** über `"\n".join(matrix)` gebildet (nicht die Hash-Funktion von `vergleich.py` benutzt):

```
Faelle geprueft: 21, Abweichungen: 0
```

Beispiel `NL-4F7K-2Q` H v1 m0 → `1f7b8e279a050e14f3f2a10c5447dbbb2c74b32db1e872903e730a122b3efb41` (gleich im Nachweis, in Lauf 1, in Lauf 2 und in meiner eigenen Rechnung). Auch die gemeldete Maske und Größe stimmen in allen 21 Fällen.

**Der Nachweis ist also reproduzierbar.** Er belegt aber nur diese 21 Fälle; siehe Befund 1: die Maskenwahl des Encoders weicht in anderen Fällen von der Referenz ab, ohne dass einer der 21 Testfälle das merkt.

**Zusatzprüfung Reed-Solomon (unabhängig, `p_u.py`):** eigenes GF(256) mit Primitivpolynom 0x11D, eigenes Generatorpolynom, eigene Polynomdivision. Für das Literaturbeispiel (Version 1-Q, 13 Datencodewörter `[32,91,11,120,209,114,220,77,67,64,236,17,236]`) erhalte ich **genau** die erwarteten Prüfcodewörter `[168,72,22,82,217,54,156,0,46,15,180,122,16]`; die 13 Syndrome des vollständigen Codeworts sind alle 0, mit einer absichtlichen Störung in Codewort 5 sind sie alle ≠ 0 (die Syndromprüfung ist also aussagekräftig). Generatorpolynome Grad 13/17 selbst gerechnet: `1,89,49,e3,11,b1,11,34,0d,2e,2b,53,84,78` bzw. `1,77,42,53,78,77,16,c5,53,f9,29,8f,86,55,35,7d,63,4f`.

---

## 3. Nachrechnen statt glauben

### 3a) Dunkelmodul (Zeile `4*Version+9`, Spalte 8) – `p_b.py`

Für **Version 1 und 2**, **alle vier Stufen L/M/Q/H** und **alle acht Masken 0–7** (64 Kombinationen) habe ich den Rust-Encoder und die Python-Referenz aufgerufen:

- Rust: Zelle `(4*version+9, 8)` ist in **64/64** Fällen dunkel (`1`). Version 1 → Zeile 13, Version 2 → Zeile 17.
- Python-Referenz: in **64/64** Fällen ebenfalls dunkel.
- Zusätzlich: die vollständigen Matrizen sind in **64/64** Fällen gleich.

### 3b) Formatbits selbst nachgerechnet – `p_c.py`

Eigene Rechnung: 5 Nutzbits `(Stufenbits<<3)|Maske`, Polynomdivision durch Generator `0x537`, dann XOR mit `0x5412`. Zusätzlich eine tabellenfreie Gegenprobe (der Wert XOR `0x5412` muss durch `0x537` teilbar sein) und sechs Ankerwerte der Normentabelle.

Ausgelesen habe ich die Bits an genau den vorgeschriebenen Stellen:
Kopie 1: Spalte 8, Zeilen 0–5, 7, 8 (Bits 0–7) und Zeile 8, Spalten 7, 5…0 (Bits 8–14);
Kopie 2: Zeile 8, Spalten n−1…n−8 (Bits 0–7) und Spalte 8, Zeilen n−7…n−1 (Bits 8–14).

Ergebnis für **alle 32 Kombinationen (L/M/Q/H × Maske 0–7)**, geprüft bei Version 1 **und** Version 2 (also 64 Matrizen, 128 gelesene Kopien):

```
Ver ECC M  eigen(BCH)      Kopie1        Kopie2        k1==k2==eigen  Restprobe
1   H   0  001011010001001  001011010001001  001011010001001  True           True    (Beispielzeile)
…
Fehler: 0
```

- Beide Kopien ergeben in **64/64** Fällen denselben Wert, und dieser Wert ist **identisch mit meiner eigenen BCH-Rechnung**.
- Die Restprobe (Teilbarkeit durch `0x537`) ist in **64/64** Fällen erfüllt → die Werte sind gültige Formatwörter.
- Anker gegen die Normentabelle: `M/0 = 101010000010010`, `L/0 = 111011111000100`, `H/0 = 001011010001001`, `Q/0 = 011010101011111`, `H/7 = 000100000111011`, `L/7 = 110100101110110` – alle sechs stimmen.
- Die Python-Referenz liefert in **64/64** Fällen dieselbe Matrix.

### 3c) Rückkodierung mit `qr_lesen.py` – `p_d.py`

| Text | Stufe | Version | Maske | gelesen | `syndrome_ok` | Version/ECC/Maske zurück | ok |
|---|---|---|---|---|---|---|---|
| `NL-4F7K-2Q` | H | 1 | 0 (fest) | `NL-4F7K-2Q` | true | 1/H/0 | ja |
| `Netzwerk-Labor` | Q | 3 | auto | `Netzwerk-Labor` | true | 3/Q/4 | ja |
| `NL-ABCD-12-EFGH-34-IJKL-56` | M | 3 | auto | derselbe Text | true | 3/M/1 | ja |
| `HALLO WELT 1234` | L | 4 | 5 (fest) | derselbe Text | true | 4/L/5 | ja |
| `NL-9Z8Y-7X` | H | 1 | auto | derselbe Text | true | 1/H/3 | ja |
| `""` (leer) | M | 1 | auto | `''` | true | 1/M/3 | ja |

**6/6 Fälle**: Text gleich, `syndrome_ok` true, Version/Stufe/Maske korrekt zurückgelesen. Der Pflichtfall `"NL-4F7K-2Q"` (H, V1, Maske 0) ist damit gegen die unabhängige Rückrichtung bestätigt; zusätzlich sind alle 21 Fälle des Differentialtests rückkodiert worden (`vergleich.py:194` prüft Text **und** `syndrome_ok`).

---

## 4. Kapazitätsgrenze Version 1, Stufe H – `p_e.py`

```
C-qr-rust.exe --text "NL-4F7K-2Q"  --ecc H --version 1 --maske auto   → rc=0, erfolgreich
C-qr-rust.exe --text "NL-4F7K-2QX" --ecc H --version 1 --maske auto   → rc=1
python qr_referenz.py --text "NL-4F7K-2QX" --ecc H --version 1        → rc=1
```

Wörtliche Meldungen bei 11 Zeichen:

- Rust: `Fehler: Text zu lang: 74 Nutzbits benoetigt, 72 Bit verfuegbar (Version 1, Stufe H).`
- Python: `qr_referenz.py: Text zu lang: 74 Nutzbits benoetigt, 72 Bit verfuegbar (Version 1, Stufe H).`

Beide Umsetzungen lehnen 11 Zeichen ab, beide nehmen 10 Zeichen an. Meine Bitrechnung: 4 Bit Modus + 9 Bit Länge + 5·11 Bit (fünf Paare) + 6 Bit (Einzelzeichen) = **74 Bit** > 72 Bit = 9 Datencodewörter × 8.

**Zusatzprüfung Kapazitätsformel** `kapazitaet_zeichen = (Datenbits − 13)·2/11` (wird für die Fehlermeldung benutzt) gegen eine Bitprobe für **alle 16 Kombinationen** Version 1–4 × L/M/Q/H:

```
V1-L: 152 Bit Formel 25 Bitprobe 25 | V1-H: 72 Bit Formel 10 Bitprobe 10 | V2-H: 128 Formel 20 Bitprobe 20
V3-Q: 272 Formel 47 Bitprobe 47   | V4-L: 640 Formel 114 Bitprobe 114 | V4-H: 288 Formel 50 Bitprobe 50
… alle 16 gleich=True, Fehler: 0
```

Zusätzlich habe ich für jede der 16 Kombinationen den Encoder selbst befragt: `n = Formel` Zeichen werden angenommen, `n+1` Zeichen abgelehnt – **16/16 ohne Abweichung**.

---

## 5. SVG für den Beamer – `p_f.py`

Erzeugt mit `--svg DATEI --modul N --ruhe R` (vier Varianten). Kantenlänge **selbst nachgerechnet** als `(Kantenlänge_Matrix + 2·Ruhe)·Modul`:

| Fall | Matrix | Modul | Ruhe | erwartete Kante | `width`/`height`/`viewBox` | Ruhezone dunkel | Rasterabweichungen |
|---|---|---|---|---|---|---|---|
| `NL-4F7K-2Q` H v1 m0 | 21 | 8 | 4 | (21+8)·8 = **232** | 232 / 232 / `0 0 232 232` | 0 von 400 Zellen | 0 |
| derselbe | 21 | 10 | 4 | (21+8)·10 = **290** | 290 / 290 / `0 0 290 290` | 0 von 400 | 0 |
| `Netzwerk-Labor` Q v3 | 29 | 6 | 2 | (29+4)·6 = **198** | 198 / 198 / `0 0 198 198` | 0 von 248 | 0 |
| `NL-4F7K-2Q` H v1 m0 | 21 | 8 | 0 | (21+0)·8 = **168** | 168 / 168 / `0 0 168 168` | 0 | 0 |

Weitere Befunde:

- **Scharfe Kanten:** `shape-rendering="crispEdges"` ist in allen vier Dateien im `<svg>`-Kopf vorhanden.
- **Schwarz auf Weiß:** `<rect width=… height=… fill="#ffffff"/>` als Grund, der Pfad hat `fill="#000000"` (jeweils geprüft).
- **Modulgenau:** ich habe den Pfad `d="M{x} {y}h{w}v{w}h-{w}z"` in ein Raster zerlegt und **Zelle für Zelle** gegen die JSON-Matrix verglichen → **0 Abweichungen** in allen vier Varianten; Segmentzahl = Zahl der dunklen Module (z. B. 218 bei `NL-4F7K-2Q` H v1 m0), jede Segmentgröße = Modulgröße, jede Koordinate auf dem Raster.
- **Ruhezone:** in der Vorgabe 4 Module = 32 px je Seite; im Raster sind alle Randzellen hell (0 dunkle Zellen). Mit `--ruhe 0` entsteht erwartungsgemäß keine Ruhezone (die Norm verlangt 4; die Vorgabe ist also richtig, der Schalter erlaubt aber einen normwidrigen Wert).
- **Daten-URI:** `--data-uri` schreibt `data:image/svg+xml;base64,…`; ich habe den Base64-Teil **selbst dekodiert** – Ergebnis ist byte-gleich mit der SVG-Datei (z. B. 4 738 Zeichen = gemeldete `data_uri_bytes` 4738). Auch `svg_bytes` stimmt in allen vier Fällen mit der Dateigröße überein.

---

## 6. Fehlerfälle und Rückgabewerte – `p_g.py`

| Aufruf | rc | Ausgabe (wörtlich) |
|---|---|---|
| `--text NL-4F7K-2Q --ecc H --version 7` | **1** | `Fehler: Version 7 wird nicht unterstuetzt (1 bis 4)` |
| `--version 5` | 1 | `Fehler: Version 5 wird nicht unterstuetzt (1 bis 4)` |
| `--version 0` | 1 | `Fehler: Version 0 wird nicht unterstuetzt (1 bis 4)` |
| `--version 255` | 1 | `Fehler: Version 255 wird nicht unterstuetzt (1 bis 4)` |
| `--version 300` | **2** | `Fehler: --version erwartet 1 bis 4` |
| `--version abc` | 2 | `Fehler: --version erwartet 1 bis 4` |
| `--maske 8` / `--maske 9` | 1 | `Fehler: Maske 8 gibt es nicht (0 bis 7)` / `… Maske 9 …` |
| `--ecc X` | 2 | `Fehler: --ecc erwartet L, M, Q oder H, bekam: X` |
| `--quatsch` | 2 | `Unbekannte Angabe: --quatsch` + Hilfe |
| ohne `--text` | 2 | `Fehler: --text fehlt` + Hilfe |
| `--hilfe` | 0 | Hilfe |
| `"A"*40 --ecc H` (ohne `--version`) | **0** | **kein Fehler**: JSON mit `"version":4`, `"maske":5`, `"auto":true`, `"groesse":33` |
| `"A"*40 --ecc H --version 1` | 1 | `Fehler: Text zu lang: 233 Nutzbits benoetigt, 72 Bit verfuegbar (Version 1, Stufe H).` |
| `"A"*51 --ecc H` (ohne `--version`) | 1 | `Fehler: Text zu lang fuer Version 4, Stufe H: 51 Zeichen. Hoechstlaenge ist 50 Zeichen.` |
| `"A"*51 --ecc H --version 4` | 1 | `Fehler: Text zu lang: 294 Nutzbits benoetigt, 288 Bit verfuegbar (Version 4, Stufe H).` |

Wichtig zur Aufgabenstellung „zu langer Inhalt, z. B. 40 Zeichen, Stufe H": **40 Zeichen sind nicht zu lang** – sie passen in die automatisch gewählte Version 4 (Grenze 50 Zeichen bei V4-H, siehe Abschnitt 4). Erst ab 51 Zeichen kommt die Auto-Meldung; mit fest vorgegebener Version 1 kommt die Bitmeldung.
Die Python-Referenz verhält sich gleich (`--version 7` → rc 1, `qr_referenz.py: Version 7 wird nicht unterstuetzt (1..4).`; 51 Zeichen V4-H → `qr_referenz.py: Text zu lang: 294 Nutzbits benoetigt, 288 Bit verfuegbar (Version 4, Stufe H).`).

**Kleine Unstimmigkeit (Befund 4):** ein unzulässiger Wert für `--version`/`--maske` (7, 0, 8 …) endet mit **rc 1** (Datenfehler), ein unparsbarer Wert (`300`, `abc`) mit **rc 2** (Aufruffehler). Beides ist harmlos, aber inkonsequent. Ebenfalls still: `--modul abc` fällt ohne Meldung auf 8 zurück (rc 0).

---

## 7. Strafregeln 1–4 und Maskenwahl – `p_h.py`, `p_i.py`, `p_k.py`, `p_l.py`, `p_t.py`

**Verfahren:** Der Encoder wird achtmal mit fester Maske 0…7 aufgerufen. Auf jeder der acht fertigen Matrizen rechne ich die vier Strafregeln **selbst** in Python nach (Regel 1 Lauflängen ab 5 → 3+(n−5); Regel 2 jeder einfarbige 2×2-Block → 3; Regel 3 Muster `1011101` mit vier hellen Modulen → 40; Regel 4 `floor(|Dunkelanteil−50 %|/5)·10`). Die Maske mit der kleinsten Summe (bei Gleichstand die kleinste Nummer) muss die automatische Wahl des Encoders sein.

Umfang: **17 handverlesene Fälle** plus ein **Schwung mit 788 Fällen** (Versionen 1–4 × L/M/Q/H, Texte `"A"*n` und deterministische Zufallstexte aus dem alphanumerischen Vorrat, n = 1…Kapazität, automatische Maske).

Ergebnis:

- **Regel 1:** Abweichung gefunden → **Befund 1** (in den 17 handverlesenen Fällen weicht meine normgerechte Nachrechnung in genau **1** Fall von der Wahl des Encoders ab, im Schwung in **15 von 788**).
- **Regel 2 und Regel 4:** keine Abweichung nachweisbar – mein Nachbau mit diesen beiden Regeln (und der Regel 1 **wie in `qr.rs`**) trifft die Wahl des Encoders in **788/788** Fällen; hätte ich Regel 2 oder Regel 4 anders gelesen als der Encoder, müsste der Nachbau in den Fällen abweichen, in denen diese Regeln entscheiden.
- **Regel 3:** zwei Lesarten, beide geprüft → **Befund 2**.

### Befund 1 (Fehler, mit Beleg): Regel 1 startet Spaltenläufe mit dem falschen Modul

**Stelle:** `tools/klassenraum-probe/C-qr-rust/src/qr.rs`, Funktion `strafe`, Zeilen 439–459, entscheidend **Zeile 441**:

```rust
for richtung in 0..2 {
    for i in 0..g {
        let mut letzte = m[i][0];      // Zeile 441
        let mut lauf = 1;
        for j in 1..g {
            let w = if richtung == 0 { m[i][j] } else { m[j][i] };
```

Für Zeilen (`richtung == 0`) ist `m[i][0]` das erste Modul der Zeile i – richtig. Für **Spalten** (`richtung == 1`) wird `m[j][i]` gelesen, das erste Modul der Spalte i ist aber `m[0][i]`. Der Lauf beginnt also mit dem Wert aus **Zeile i, Spalte 0**. Stimmen die beiden Werte nicht überein, wird der erste Lauf der Spalte um ein Modul zu kurz (oder zu lang) gezählt; ein Lauf der wahren Länge 5 wird dann als 4 gezählt und bringt **0 statt 3** Punkte, längere Läufe je 1 Punkt zu wenig. Mein Nachbau dieser Zeile in Python (Kopie der Rust-Logik) gegen eine normgerechte Regel 1:

```python
def regel1_korrekt(mm):          # farbe=-1, lauf=0, j ab 0  (Norm, wie qr_referenz.py:634-656)
def regel1_rustfehler(mm):       # letzte=mm[i][0], lauf=1, j ab 1  (wie qr.rs:439-459)
```

**Belege:**

1. **Minimalfall** `"AAAAAAAAA"` (9 × A), Stufe L, Version 1, automatische Maske:

   | Maske | Strafpunkte normgerecht | mit dem Rust-Fehler |
   |---|---|---|
   | 2 | 420 | 417 |
   | 5 | 326 | **323** ← so wählt Rust |
   | 6 | 390 | 387 |
   | 7 | **324** ← Optimum | 323 |

   Normgerecht gewinnt Maske 7 mit 324 gegen Maske 5 mit 326. Mit dem Fehler stehen Maske 5 und 7 gleichauf bei 323 → Gleichstand → kleinste Nummer → **Maske 5**.

   ```
   target\release\C-qr-rust.exe --text AAAAAAAAA --ecc L --version 1 --maske auto
     → {"maske":5,"auto":true,…};  auto == --maske 5  → True;  auto == --maske 7 → False
   python qr_referenz.py --text AAAAAAAAA --ecc L --version 1 --maske auto  → maske 7
   ```
   Beide Matrizen sind gültige QR-Codes (der Leser liest `AAAAAAAAA`, `syndrome_ok=true`, Formatbits nennen Maske 5) – der Fehler kostet nur die normgerechte Maskenwahl.

2. **Mechanik am Einzelmodul** (Matrix von `--maske 5`): Spalte 12 lautet `111110100111110001111`; `mm[0][12] = 1`, aber der Rust-Code startet mit `mm[12][0] = 0`. Der Fünf-Lauf oben wird deshalb als Vier-Lauf gezählt. Betroffene Spalten in diesem Fall: 8, 9, 10, 12 (Spalten mit `mm[i][0] ≠ mm[0][i]`).

3. **Der Nachbau erklärt die Rust-Wahl vollständig:** in allen **788/788** Fällen des Schwungs sagt der Nachbau **mit** dem Fehler die tatsächliche Maske des Rust-Encoders voraus; der Nachbau **ohne** den Fehler trifft nur **773/788** (genau die 15 Abweichungen fehlen).

4. **Rust gegen Python-Referenz:** in **15 von 788** Fällen (1,90 %) wählen beide verschiedene Masken (Matrizen damit ungleich). In **12** dieser 15 Fälle hat die von Rust gewählte Matrix nach normgerechter Rechnung **mehr** Strafpunkte als die der Referenz, in 3 Fällen Gleichstand:

| Text | n | Stufe | Ver | Rust-Maske (Strafpunkte) | Python-Maske (Strafpunkte) |
|---|---|---|---|---|---|
| `AAAAAAAAA` | 9 | L | 1 | 5 (326) | **7 (324)** |
| `US` | 2 | H | 1 | 1 (423) | **0 (421)** |
| `A47K7IDUPU6NCJHCF3CXJ4KT4FKI1FRI` | 32 | M | 2 | 0 (465) | **6 (462)** |
| `DBABEMSCKOY6W1FOTS8OCYP4Y` | 25 | Q | 2 | 0 (497) | **6 (493)** |
| `4Y1XDUEIQB` | 10 | L | 3 | 7 (585) | 0 (585) – Gleichstand |
| `"A"*70` | 70 | L | 3 | 2 (586) | **7 (585)** |
| `"A"*34` | 34 | M | 3 | 6 (617) | **4 (615)** |
| `AAAAAAA` | 7 | Q | 3 | 0 (591) | **6 (589)** |
| `AAAAAAAAAA` | 10 | H | 3 | 7 (659) | **5 (658)** |
| `DQCRREK` | 7 | L | 4 | 6 (684) | 1 (684) – Gleichstand |
| `"A"*25` | 25 | L | 4 | 2 (722) | **4 (721)** |
| `0PH7C0L9ZJHDOAE6SXH9RVR2HIVO9CR1OX0VM3QRBKD8YP8WDIS15QP0D32883HR5Y03TMB1R1W0` | 76 | M | 4 | 6 (712) | **3 (709)** |
| `QABQZWND9VYBOGGLWIOZ8ZF9XPXN3LE4TM99TDRY9BGQLH4URMQEP0RIGPN2GE69DQ8KQZ4ESAZDZJKRYQH5VI4RCG` | 90 | M | 4 | 3 (709) | **4 (708)** |
| `UZXWAM5313OIT7GXF1Z` | 19 | Q | 4 | 0 (714) | **4 (708)** |
| `MBYCL1R0C3MJ7IF9PDML3XA55MGRISKFJJ630YLL1UQUIZHD2` | 49 | Q | 4 | 7 (796) | 2 (796) – Gleichstand |

(Strafpunkte = meine normgerechte Summe der Matrix der jeweils gewählten Maske.)

5. **Umfang der Fehlwirkung:** über 3 904 geprüfte Matrizen (488 Texte × 8 Masken) weicht meine Regel-1-Nachrechnung in **1 952** Fällen (50,0 %) von der normgerechten ab; die Abweichung reicht von **−9 bis +12** Punkten je Matrix (Verteilung: 0 → 1952; ±1 → 578; ±2 → 184; ±3 → 797; ±4 bis ±9 → 390; +10 und +12 → 3; Summe 3904).

6. **Auswirkung auf den Auftragscode:** bei `"NL-4F7K-2Q"`, Stufe H, Version 1 bleibt die Wahl **gleich** (Maske 7, normgerecht 343 Punkte, Vorsprung 21 Punkte; mit dem Fehler 345 Punkte, Vorsprung 19 Punkte). Der ausgelieferte Code ist also nicht falsch – die Wahl ist nur knapp genug, dass sie in anderen Fällen kippt.

**Warum der Differentialtest das nicht findet:** keiner der 21 Fälle aus `vergleich.py:37-64` gehört zu den 15 abweichenden; in allen 21 Fällen wählen beide Umsetzungen dieselbe Maske. Die Referenz `qr_referenz.py` rechnet Regel 1 richtig (`lauf_farbe = -1; lauf = 0`, Schleife ab `j = 0`, Zeilen 634–656).

**Vergleich mit einer fremden Umsetzung (externe Quelle, in dieser Sitzung abgerufen, nicht lokal gemessen):** In [zxing `MaskUtil.java`](https://raw.githubusercontent.com/zxing/zxing/master/core/src/main/java/com/google/zxing/qrcode/encoder/MaskUtil.java) beginnt `applyMaskPenaltyRule1Internal` mit `prevBit = -1; numSameBitCells = 0;` und läuft ab `j = 0` – für Zeilen **und** Spalten korrekt, also wie die Python-Referenz und nicht wie `qr.rs`.

### Befund 2 (Risiko, kein bewiesener Fehler): Regel 3 liest nur Fenster innerhalb des Symbols

`qr.rs:470-482` sucht elf Module lange Fenster **innerhalb** des Symbols nach `10111010000` und `00001011101`. Die andere Lesart zählt die 4 Module breite Ruhezone am Rand als hell mit (Randlesart). Beide Lesarten habe ich implementiert und gegen die Wahl des Encoders geprüft:

- **Fensterlesart** (= das, was `qr.rs:470-482` und `qr_referenz.py:681-691` tun), zusammen mit der **normgerechten** Regel 1: stimmt in **16 von 17** handverlesenen Fällen und **773 von 788** Schwungfällen mit der Wahl des Encoders überein – die Abweichungen sind genau die Regel-1-Fälle aus Befund 1. Zusammen mit der Regel 1 **wie in `qr.rs`**: **788/788**.
- **Randlesart** (mit normgerechter Regel 1): weicht in **5 von 17** handverlesenen Fällen ab, und zwar in allen fünf um je eine andere Maske als die Fensterlesart – also auch als die des Encoders: `NL-ABCD-12-EFGH-34` H v2 (Randlesart → Maske 3 statt 0), `HALLO WELT 1234` M v3 (→ 4 statt 2), `HALLO WELT 1234` L v4 (→ 0 statt 4), `NL-ABCD-12` H v4 (→ 7 statt 2), `Hallo Welt 123` M v2 (→ 6 statt 2). Die Strafpunkte der Regel 3 unterscheiden sich in diesen fünf Fällen um **720 bis 880 Punkte** (gemessen, je Fall für beide gewählten Masken: 840/720, 880/720, 760/720, 800/760, 800/720).

Beide Umsetzungen des Projekts lesen Regel 3 **gleich**, deshalb kann der Differentialtest diesen Unterschied grundsätzlich nicht finden. Ob die Norm die Fenster- oder die Randlesart verlangt, konnte ich **nicht entscheiden** – der Normentext liegt mir nicht vor. Externe Quellen (in dieser Sitzung abgerufen, nicht lokal gemessen) sind sich uneins: [zxing](https://raw.githubusercontent.com/zxing/zxing/master/core/src/main/java/com/google/zxing/qrcode/encoder/MaskUtil.java) verlangt die vier hellen Module **innerhalb** (`isWhiteHorizontal` liefert `false`, wenn `from < 0`), [Nayuki QR-Code-generator](https://raw.githubusercontent.com/nayuki/QR-Code-generator/master/java/src/main/java/io/nayuki/qrcodegen/QrCode.java) addiert in `finderPenaltyAddHistory`/`finderPenaltyTerminateAndCount` ausdrücklich `size` als „light border" und zählt damit die Randlesart. Nach der Randlesart wäre die Maskenwahl dieses Encoders in etwa jedem dritten Fall eine andere – das ist der größte verbleibende Unsicherheitsposten, aber **kein nachgewiesener Fehler**.

*(Nebenbeobachtung aus derselben externen Quelle: Nayuki rechnet Regel 4 an exakten 5-%-Grenzen mit einer Aufrundungsformel und kommt dort auf einen anderen k-Wert als `qr.rs`, das mit `floor` arbeitet und damit mit zxing übereinstimmt. Bei Kantenlänge 25 (625 Module) ist ein Dunkelanteil von genau 60 % mit 375 dunklen Modulen erreichbar. Ich habe **nicht** geprüft, welche Lesart die Norm verlangt – der Norntext lag mir nicht vor.)*

### Befund 3 (klein, betrifft die Python-Werkzeuge, nicht den Rust-Encoder): JSON in der ANSI-Codepage

`qr_referenz.py:1101` und `qr_lesen.py:684/749` schreiben `json.dump(..., ensure_ascii=False)` direkt auf `sys.stdout`. In dieser Umgebung ist `sys.stdout` beim Aufruf über eine Pipe **cp1252**, deshalb kommt bei Nicht-ASCII-Inhalt kein gültiges UTF-8 heraus. Gemessen (`p_p.py`, `p_q.py`, `p_r.py`):

```
Rust   --text "Grüße" : stdout-Bytes 47 72 c3 bc c3 9f 65 = gültiges UTF-8, "text" == "Grüße", modus=byte
Python qr_referenz.py --text "Grüße": UnicodeDecodeError: 'utf-8' codec can't decode byte 0xfc in position 12
qr_lesen.py auf der Rust-Matrix von "Grüße": ebenfalls 0xfc -> JSON nicht als UTF-8 lesbar (syndrome_ok wäre true)
```

Mit `PYTHONIOENCODING=utf-8` stimmen Rust und Referenz für `"Grüße"`, `"ÄÖÜ-äöü"`, `"Straße 7"`, `"ä"` in **4/4** Fällen überein (Byte-Modus), und die Rückkodierung liefert den Text exakt zurück (`syndrome_ok=true`). **Der Rust-Encoder ist also UTF-8-sauber**; die Einschränkung betrifft den Transportweg der Python-Werkzeuge. Folge für den Differentialtest: keiner der 21 Fälle enthält Nicht-ASCII, und ein solcher Fall würde `vergleich.py` (das mit `encoding="utf-8"` liest) **abstürzen lassen** statt ihn zu prüfen. Inhaltlich geprüft ist der Byte-Modus mit Mehrbyte-Zeichen damit nur über meinen eigenen Lauf mit gesetzter IO-Codierung.

### Befund 5 (Hinweis, kein Fehler): stilles Auffüllen im Zickzack

`qr.rs:595` setzt `let wert = bits.get(nr).copied().unwrap_or(false);`. Wäre die Belegung der Datensätze zu klein, würden fehlende Bits **still** als hell aufgefüllt statt einen Fehler auszulösen. Dass das nicht passiert, habe ich nachgerechnet: die Zahl der freien (nicht reservierten) Module muss `8·Codewörter + Restbits` sein. Mit der Funktionsmuster-Karte des unabhängigen Lesers ergibt sich

```
V1: freie Module 208 = 8*26+0   V2: 359 = 8*44+7   V3: 567 = 8*70+7   V4: 807 = 8*100+7   (4/4 gleich)
```

und laut Quelltext (`qr.rs:574-582`) ist die Datenmenge des Encoders genau `8·(Daten+EC) + restbits(version)` – die Bitfolge füllt die Datensätze also exakt aus. Der Fehler ist damit für Version 1–4 nicht auslösbar (bleibt aber eine Stolperstelle).

---

## 8. Gefundene Fehler (nummeriert)

1. **Regel 1 der Strafregeln startet Spaltenläufe mit dem falschen Modul** – `qr.rs:441` (`let mut letzte = m[i][0];`, für Spalten müsste es `m[0][i]` sein). Beleg: Minimalfall `"AAAAAAAAA"` L V1 → Rust wählt Maske 5 (normgerecht 326 Punkte), richtig wäre Maske 7 (324); die Python-Referenz wählt 7. Nachbau mit dem Fehler trifft die Rust-Wahl in 788/788 Fällen, ohne den Fehler nur in 773/788. 15 von 788 gemessenen Fällen (1,90 %) bekommen eine andere Maske als die unabhängige Referenz, in 12 davon mit **höheren** Strafpunkten. Der Differentialtest (21 Fälle) findet das nicht; der Selbsttest prüft nur Kantenlängen. **Auswirkung auf den Auftragscode:** keine – bei `NL-4F7K-2Q` H V1 bleibt es bei Maske 7 (Vorsprung 21 Punkte).
2. **Regel 3 wird als reine Fensterlesart umgesetzt** (Randmodule zählen nicht als hell) – `qr.rs:470-482`. In 5 von 17 geprüften Fällen hätte die Randlesart eine andere Maske ergeben. Ob die Norm die Randlesart verlangt, konnte ich nicht entscheiden; zxing liest wie dieser Encoder, Nayuki anders. Kein bewiesener Fehler, aber ein offener Interpretationspunkt mit Wirkung auf die Maskenwahl.
3. **Die Python-Werkzeuge geben bei Nicht-ASCII ihr JSON in der ANSI-Codepage aus** – `qr_referenz.py:1101`, `qr_lesen.py:684/749`. Beleg: `UnicodeDecodeError: 0xfc` bei `"Grüße"`; mit `PYTHONIOENCODING=utf-8` stimmen alle vier geprüften Nicht-ASCII-Fälle überein. Der Rust-Encoder ist korrekt (UTF-8 geprüft). Folge: der Differentialtest deckt den Byte-Modus mit Mehrbyte-Zeichen nicht ab und würde bei einem solchen Fall abbrechen.
4. **Uneinheitliche Rückgabewerte** in `main.rs`: unzulässige `--version`/`--maske`-Werte (0, 5, 7, 8, 255) → **rc 1**, unparsbare (`abc`, `300`) → **rc 2**; `--modul abc` fällt still auf 8 zurück. Kosmetisch, keine Wirkung auf die Matrix.
5. **Hinweis:** stilles Auffüllen mit hellen Modulen in `qr.rs:595` (`unwrap_or(false)`) – für Version 1–4 nachgerechnet nicht auslösbar (208/359/567/807 freie Module = Bitmenge), aber eine Fehlerquelle für spätere Versionen.

**Nicht gefunden (ausdrücklich):** keine Abweichung bei Suchenmustern/Trennern, Taktmuster, Ausrichtungsmustern (Version 2–4), Dunkelmodul, Formatbits (beide Kopien, alle 32 Kombinationen, Version 1 und 2), Reed-Solomon (Literaturbeispiel selbst nachgerechnet, Syndrome 0), Blockbildung/Interleaving (Rückkodierung 6/6 plus 21 Fälle), Terminator/Füllbytes (Kapazitätsgrenzen 16/16), Kapazitätsformel (16/16), SVG-Geometrie (Zelle für Zelle, 4 Varianten), Maskenformeln 0–7 (über 805 geprüfte Fälle, davon 788 mit vollständigem Nachbau der Maskenwahl), Fehlerfälle und Rückgabewerte.

---

## 9. Was NICHT geprüft wurde

- **Norntext ISO/IEC 18004 lag nicht vor.** Deshalb konnte ich nicht entscheiden, welche Lesart von **Regel 3** (Rand oder Fenster) und welche Rechnung bei **Regel 4** an exakten 5-%-Grenzen die richtige ist (Befund 2 und die Nebenbeobachtung). Geprüft habe ich nur die Übereinstimmung mit meiner eigenen Lesart und mit zwei externen Umsetzungen (Web-Abruf, nicht lokal gemessen).
- **Kein echter Scan.** Es wurde kein Kamerabild, kein Druck, kein Beamer und kein fremder Decoder benutzt; ich habe keine Decoder-Bibliothek installiert. Ob der Code in der Praxis (auch skaliert auf der Leinwand) lesbar ist, ist damit **nicht** geprüft. Geprüft ist nur die Struktur und die Rückkodierung mit dem projekt-eigenen Leser `qr_lesen.py`.
- **Fehlerkorrektur-Wirkung** (echte Fehlerkorrektur): ich habe keine Module verfälscht und geprüft, ob der Leser sie korrigiert. Geprüft ist nur, dass die Syndrome der unverfälschten Codewörter 0 sind.
- **Versionen 5–40, Versionsinformation (BCH(18,6)), ungleiche Blockgruppen, ECI, Kanji-/Numeric-Modus, strukturierte Anhänge:** laut Entwurf nicht vorgesehen und nicht geprüft. `--version 5` bis `255` werden sauber abgelehnt (Abschnitt 6).
- **Die Python-Referenz als Ganzes** habe ich nicht Zeile für Zeile geprüft; ihr Reed-Solomon/Matrix-Aufbau ist nur insoweit belegt, wie er mit meinen eigenen Nachrechnungen (Dunkelmodul, Formatbits, Strafregeln, SVG, Kapazität) und den 21 Rückkodierungen übereinstimmt.
- **Byte-Modus mit Mehrbyte-Zeichen** nur mit gesetztem `PYTHONIOENCODING=utf-8` geprüft (Befund 3); mit der Vorgabe-Codepage dieser Umgebung ist die Prüfkette für Nicht-ASCII nicht benutzbar.
- **Nicht geprüft:** ob die 24 Byte Unterschiede zwischen Frischbau und Repo-`.exe` ausschließlich Debug-Metadaten sind – belegt ist, dass sie außerhalb von `.text` liegen (Kopf und `.rdata`) und dass `.text` in allen drei Fassungen byte-gleich ist.
- **Nicht ausgeführt (Auftragsregel):** `python tools/repo-verweise-flicken.py`.

---

## 10. Kurzfassung (max. 15 Zeilen)

1. `cargo build --release` rc 0 (nichts neu übersetzt), `cargo test --release` rc 0, **5/5 Tests grün**; `.exe` 164 864 B, SHA256 `DAC408…B379`; zwei Frischbauten außerhalb des Repos haben **byte-gleichen `.text`** (nur 24 Byte Debug-Metadaten unterscheiden sich) – die `.exe` gehört zu diesen Quellen.
2. `vergleich.py`: **21/21 Fälle gleich und rückkodiert**, rc 0; zweiter Lauf hash-gleich; alle 21 sha256-Werte des Nachweises `Nachweise/Klassenraum/C-qr.json` mit **eigenem** Encoder-Aufruf und **eigener** Hash-Bildung bestätigt (0 Abweichungen).
3. Dunkelmodul: **64/64** dunkel (V1/V2 × L/M/Q/H × Maske 0–7), Matrizen gleich der Referenz. Formatbits: **64/64** beide Kopien gleich meiner eigenen BCH-Rechnung (0x537/0x5412), Restprobe und 6 Normentabelle-Anker ok. Rückkodierung: **6/6** Text + `syndrome_ok`. RS-Literaturbeispiel selbst nachgerechnet: exakt gleich.
4. Kapazität V1-H: 10 Zeichen passen, 11 nicht – **bei beiden** Umsetzungen, identische Meldung `Text zu lang: 74 Nutzbits benoetigt, 72 Bit verfuegbar (Version 1, Stufe H).`; Kapazitätsformel 16/16 gegen Bitprobe. 40 Zeichen H sind **nicht** zu lang (werden V4, 50 Zeichen Grenze); 51 Zeichen → `Text zu lang fuer Version 4, Stufe H: 51 Zeichen. Hoechstlaenge ist 50 Zeichen.` (rc 1).
5. SVG: Kantenlänge `(g+2·ruhe)·modul` selbst nachgerechnet (232/290/198/168), `crispEdges`, weißer Grund, schwarzer Pfad, Pfad Zelle für Zelle = Matrix (0 Abweichungen), Ruhezone 4 Module hell, Daten-URI selbst dekodiert = SVG.
6. `--version 7` → rc 1 `Fehler: Version 7 wird nicht unterstuetzt (1 bis 4)`; `--version 300/abc` → rc 2; `--maske 8` → rc 1. Befund 4: rc 1 vs. rc 2 inkonsequent, `--modul abc` still auf 8.
7. **Befund 1 (echter Fehler):** `qr.rs:441` startet Spaltenläufe der Strafregel 1 mit `m[i][0]` statt `m[0][i]`. Minimalfall `--text AAAAAAAAA --ecc L --version 1 --maske auto` → Rust **Maske 5**, Python-Referenz **Maske 7** (normgerecht 324 < 326). Nachbau mit dem Fehler erklärt **788/788** Maskenwahlen des Encoders; **15 von 788** Schwungfällen (1,90 %) weichen von der Referenz ab, 12 davon mit höheren Strafpunkten. Der Differentialtest (21 Fälle) findet das nicht, `--selbsttest` auch nicht.
8. **Befund 2:** Regel 3 zählt nur Fenster innerhalb des Symbols (wie zxing, anders als Nayuki); in 5 von 17 Fällen hätte die Randlesart eine andere Maske ergeben. Ohne Norntext nicht entscheidbar – offener Punkt, kein bewiesener Fehler.
9. **Befund 3:** `qr_referenz.py`/`qr_lesen.py` schreiben Nicht-ASCII-JSON in der ANSI-Codepage (`0xfc`-Fehler bei `"Grüße"`); der Rust-Encoder ist UTF-8-sauber (mit `PYTHONIOENCODING=utf-8` stimmen 4/4 Nicht-ASCII-Fälle). Der Differentialtest deckt Nicht-ASCII nicht ab.
10. **Nicht geprüft:** echter Scan/Beamer, echte Fehlerkorrektur, Versionen ≥ 5, Norntext-Fragen; `tools/repo-verweise-flicken.py` bewusst nicht ausgeführt.
11. Repo unverändert: nur diese Datei geschrieben, Nachweis-Datei und Quellen mit unverändertem Zeitstempel, `git status` wie vor der Sitzung; ein von mir versehentlich erzeugtes `__pycache__` habe ich entfernt.
