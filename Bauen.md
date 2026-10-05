# Bauen, Testen, Ausliefern

Alles, was du brauchst, um aus dem Quelltext ein spielbares Programm zu machen. Wenn du
nur **spielen** willst: [README](README.md) → *Sofort spielen*.

## Was du brauchst

| Werkzeug | Wofür | Bemerkung |
|---|---|---|
| **Python 3** | alle Bau- und Prüfwerkzeuge | keine Pakete nötig außer Pillow für `tools/bilder.py` |
| **Node 24** | Tests | portabel unter `%LOCALAPPDATA%\node-portable`, sonst aus dem `PATH` |
| **Rust + Tauri 2** | nur für die Windows-`.exe` | dazu WebView2 (bringt Windows 10/11 mit) |

`sh tools/test.sh` sucht Node in dieser Reihenfolge: `$NODE`, dann der portable Ordner,
dann `node` aus dem `PATH`. Auf GitHub läuft derselbe Befehl.

## Die vier Bausteine

```
src/ ──python bauen.py──▶ web/index.html ──python tools/einfach.py──▶ docs/index.html
                              │                                             │
                              │                                             └─▶ EINE Datei, überall spielbar
                              └─▶ Vorlage für die Rust-Hülle (shell/) ──▶ Netzwerk-Labor.exe
```

| Befehl | Ergebnis | Dauer |
|---|---|---|
| `python bauen.py` | `web/index.html` + `web/tests.html` (107 Module) | Sekunden |
| `python tools/einfach.py` | `docs/index.html` — das Spiel als **eine** Datei | Sekunden |
| `python tools/paket.py` | `dist/` — Ordner + ZIP für eine Release, geprüft | Sekunden |
| `cargo tauri build --no-bundle` | `netzwerk-labor.exe` (Rust-Hülle) | Minuten |

`python bauen.py` muss **immer vor** `cargo tauri build` laufen — die Hülle lädt `web/`.

## Die Einzeldatei

Der wichtigste Befehl für die Auslieferung. Er hängt die Schriften als Daten-URI in die
Seite und **verweigert den Bau**, wenn ein Außenverweis übrig bleibt (`<link>`,
`<script src>`, `<img src>`, `url()` auf eine Schriftdatei). Damit kann keine Fassung
entstehen, die heimlich nachlädt.

```bash
python tools/einfach.py                        # -> docs/index.html
python tools/einfach.py --pruefen              # nur prüfen
python tools/einfach.py --ziel /tmp/spiel.html # woandershin
```

Gemessener Stand: **2.193.460 Bytes (2,09 MB)**, 14 Schriften eingebettet,
**0 Außenverweise**. Zum Vergleich: ohne eingebettete Schriften wären es 1,6 MB plus ein
Ordner daneben — und genau dieser Ordner ist die Fehlerquelle, wenn jemand nur die
`index.html` weiterreicht.

> **Zeilenenden.** Der Bau liefert **LF**, auf jeder Plattform. Die Quellen sind gemischt
> (61 Dateien CRLF, 101 LF, so gewachsen und bewusst nicht angefasst), im Repositorium gilt
> laut `.gitattributes` aber LF. Ohne Normalisierung erbte `docs/index.html` 23.838 CRLF:
> Git führte die Datei als „ständig geändert", und der Bau auf Linux wäre nicht byte-gleich
> zum Bau auf Windows. Deshalb lesen `bauen.py`, `tools/einfach.py` und `tools/bilder.py`
> mit Normalisierung und schreiben mit `newline="\n"`.

### Beweisen, dass sie läuft

`--pruefen` sagt nur, dass die Datei eigenständig **ist**. Ob das Spiel darin startet,
sagt `tools/starttest.py`: es lädt die Datei in einem echten Browser über `file://`
(genau der Weg eines Doppelklicks) und misst am geladenen Dokument.

```bash
python tools/starttest.py                          # docs/index.html
python tools/starttest.py pfad/zur/datei.html --bild beweis.png
```

Gemessen werden `#app`-Inhalt, sichtbarer Textanfang, CSS-Blätter und -Regeln, ob jede
der drei Schriften **wirklich geladen und wirklich benutzt** wird, und JS-Fehler.

> **Eine Falle, die dokumentiert bleiben soll:** `document.fonts.check('16px "Bricolage
> Grotesque"')` meldet `false` — die Schrift gibt es nur in Gewicht 600 und 800, und die
> Abfrage ohne Gewicht fragt 400 ab. Ein Test, der das nicht weiß, meldet einen Fehler,
> den es nicht gibt. `tools/starttest.py` prüft darum je Familie das Gewicht, das es
> wirklich gibt (400 / 800 / 400).

### Automatisch veröffentlichen

`.github/workflows/seite.yml` baut die Einzeldatei bei jedem Push auf `ausbau-1.2`, prüft
sie und stellt sie auf GitHub Pages. Danach ist das Spiel unter
**https://vexx-oss.github.io/Side-Project/** mit einem Klick spielbar.

**Einmalige Einstellung, die nur im Browser geht:**
*Settings → Pages → Build and deployment → Source: **GitHub Actions***.
Ohne diesen Klick läuft der Prüflauf trotzdem, nur das Veröffentlichen entfällt.

## Das Auslieferungspaket

```bash
python tools/paket.py               # -> dist/Netzwerk-Labor-1.2.0-Windows.zip
python tools/paket.py --ohne-exe    # nur die Browser-Fassung (klein)
python tools/paket.py --nur-ordner  # Ordner bauen, kein ZIP
```

Das Werkzeug baut die Einzeldatei frisch, sammelt alles Nötige ein, schreibt ein
`SIZES.txt` mit Prüfsummen und **liest das ZIP danach zurück**: CRC32 für jeden Eintrag,
und jede Datei Byte für Byte gegen den Ordner. Ein Paket, das sich nicht öffnen lässt,
fällt hier auf und nicht beim Nutzer.

Gebaut wird `dist/Netzwerk-Labor-<version>-Windows.zip` mit dem Inhalt `Netzwerk-Labor-<version>/`:

```
Netzwerk-Labor.html            das Spiel als Einzeldatei (überall spielbar)
Netzwerk-Labor.exe             Windows-Programm mit Leiste und Tray
Integritaet-reparieren.cmd     falls die .exe kein Fenster zeigt
START-HIER.md / LIESMICH.txt   Anleitung zum Losspielen
LIZENZ.md / LIZENZEN/          Lizenz des Programms und der Schriften
SIZES.txt                      Inhalt, Größen, Prüfsummen
```

Die Anleitungen kommen aus `Vorlagen/` — **eine** Quelle, kein zweiter Ort zum Pflegen.

### Eine Release anlegen

```bash
git tag -a v1.2.0 -m "Netzwerk-Labor 1.2.0"
git push origin ausbau-1.2 --tags
```

Dann auf GitHub: *Releases → Draft a new release* → Tag `v1.2.0` → das ZIP aus `dist/`
anhängen. Die README verlinkt `releases/latest`, es muss also nichts nachgezogen werden.

## Die Windows-`.exe`

```bash
python bauen.py                                    # zuerst!
cd shell/src-tauri
CARGO_TARGET_DIR=<schneller-Ordner>/target cargo tauri build --no-bundle
# Ergebnis kopieren nach Programm/Netzwerk-Labor.exe
```

Die fertigen Programme und die Bildschirmfoto-Nachweise liegen **bewusst nicht im Git**
(`.gitignore`): 8 MB `.exe` und 22 MB Beweismaterial gehören nicht in die Historie.

## Messen im echten Programm

```bash
python tools/cdp.py start --frisch     # startet die .exe mit Fernsteuerungs-Port
python tools/cdp.py eval "<js>"        # JavaScript auswerten
python tools/cdp.py shot bild.png      # Bildschirmfoto
python tools/cdp.py stop               # beendet nur die eigene Instanz
```

`python tools/q-echt.py` fährt damit eine vollständige Abnahme im echten Programm:
erster Auftrag per echter Maus, Sprechblase, Fernwartung, Bildschirmfotos.

> **Wenn das Programm schon läuft**, bricht `tools/cdp.py` mit einer Meldung ab und beendet
> **nichts**. Das ist Absicht (AGENTS.md Regel 1): Fremde Prozesse werden nicht angefasst.
> Also erst das laufende Programm über das Tray-Symbol beenden.

## Der Lernmotor

Das Netzwerk-Labor und die FISI-Spielhalle teilen sich **einen** Lernmotor.

```bash
python tools/lernmotor.py                  # Kopie gegen Quelle prüfen
python tools/lernmotor.py --neu-einlesen   # Kopie bewusst erneuern
python tools/lernmotor-bau.py              # Bau mit und ohne Spielhalle byte-gleich?
```

`fremd/lernmotor.js` liegt im Repo und macht es allein baubar. Liegt die Spielhalle
daneben, hat sie Vorrang. Der Herkunftskopf in der Kopie wird beim Bau **abgeschnitten**,
damit beide Wege byte-gleich bauen — sonst hätte die Kopie 1.000 Bytes mehr Inhalt im
Spiel als die Quelle.

## Wenn etwas klemmt

| Bild | Ursache und Abhilfe |
|---|---|
| `kein Node gefunden` | Node 24 installieren oder `NODE=/pfad/zu/node sh tools/test.sh` |
| `sh tools/test.sh` bricht mit `dirname`-Fehler ab | Git-`/usr/bin` fehlt im `PATH`: `& "C:\Program Files\Git\bin\bash.exe" -c 'export PATH=/usr/bin:/bin:$PATH; sh tools/test.sh'` |
| `.exe` zeigt kein Fenster | `Programm/Integritaet-reparieren.cmd` (Details in [`Nachweise/1.2-Start/BEFUND.md`](Nachweise/1.2-Start/BEFUND.md)) |
| `einfach.py`: „Aussenverweise uebrig geblieben" | Eine neue Datei wird von außen geladen. Entweder einbetten oder bewusst im Spiel belassen und die Prüfliste in `tools/einfach.py` anpassen — **nicht** die Prüfung abschalten. |
| `lernmotor.py` meldet ABWEICHUNG | Die Spielhalle ist weiter. `--neu-einlesen`, dann Tests und `node tools/sim-stand.js`. |
