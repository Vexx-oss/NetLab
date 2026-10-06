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

`.github/workflows/seite.yml` stellt die fertige, versionierte `docs/index.html` bei jedem
Push auf `ausbau-1.2` auf GitHub Pages. Danach ist das Spiel unter
**https://vexx-oss.github.io/NetLab/** mit einem Klick spielbar.

**Die eine Einstellung, die nur im Browser geht:**
*Settings → Pages → Build and deployment → **Source: „GitHub Actions"***.
Solange Pages aus ist, wird der Deploy-Schritt übersprungen und der Lauf bleibt **grün** —
er meldet in einer Notiz, was fehlt. Nach dem Einschalten läuft er von selbst.

> **Wenn die Adresse trotzdem 404 liefert** (gemessen 06.10.2026): Die Antwort war
> `Site not found · GitHub Pages`, obwohl der Ablauf grün war und `deploy-pages`
> erfolgreich meldete. Diese Kombination heißt: Es wurde veröffentlicht, aber die
> **Quelle** in den Einstellungen ist nicht „GitHub Actions" — dann wird eine Seite aus
> einem Zweig erwartet.
>
> Deshalb funktioniert jetzt **beides**:
>
> | Quelle in den Einstellungen | Was veröffentlicht wird |
> |---|---|
> | „GitHub Actions" | `docs/index.html` aus dem Ablauf |
> | Ein Zweig, Ordner `/` | `index.html` im Wurzelverzeichnis — eine Weiterleitung auf `Netzwerk-Labor.html` |
>
> Ohne die Weiterleitung im Wurzelverzeichnis findet Pages bei einer Zweig-Quelle keine
> `index.html` und antwortet mit 404. Die Weiterleitung ist absichtlich doppelt
> abgesichert: `meta refresh`, `location.replace` und ein sichtbarer Link.

> **Warum der Ablauf nicht selbst baut und keinen zweiten Job hat** (gemessen 05.10.2026):
> Zwei Dinge gingen schief, beide nachgestellt und behoben.
>
> 1. `actions/configure-pages` mit `enablement: true` sollte Pages selbst einschalten.
>    Laut Aktionsquelle braucht das ein Token **jenseits** des Standard-`GITHUB_TOKEN`
>    (PAT mit `repo`-Recht oder GitHub App mit `administration:write`). Der Schritt
>    scheiterte und riss den ganzen Lauf mit — die Tests liefen nicht einmal.
> 2. Ein zweiter Job („Ist Pages eingeschaltet?") wartete auf einen freien Läufer. Die
>    Läufe brauchten an diesem Abend 5–11 Minuten Anlauf; nach **902 Sekunden** brach
>    GitHub den *gesamten* Lauf ab, auch den bereits erfolgreichen Teil. Deshalb ist die
>    Prüfung jetzt ein Schritt im selben Job, und der Ablauf baut nicht mehr selbst —
>    das macht `pruefen.yml`.
>
> `python tools/ablaeufe.py` prüft beides dauerhaft: kein `enablement: true`, keine
> unbedingte Veröffentlichung, kein zweiter Job.

### Wenn ein Prüflauf als „cancelled" mit 0 Schritten dasteht

Gemessen am 05.10.2026: Mehrere Läufe von `pruefen.yml` bekamen **keinen Läufer** zugeteilt,
blieben rund 15 Minuten in der Warteschlange und wurden dann von GitHub abgebrochen —
Status `cancelled`, 0 Schritte, kein Runner. Das ist Verhalten der Plattform, **kein
Testergebnis**: es wurde nichts gemessen, also ist auch nichts rot.

Der Gegenbeweis liegt vor: Lauf `37367258747` (Job „Bauen und prüfen") hatte **alle 13
Schritte erfolgreich**, einschließlich Einzeldatei und Bilderprüfung. Derselbe Stand ist
zusätzlich hier nachgestellt und grün: `python tools/ci-nachbau.py`.

Nachholen von Hand: *Actions → Prüfen → Run workflow*. Damit sich nichts staut, hat der
Ablauf eine Concurrency-Gruppe je Zweig; zusätzlich läuft er nachts um 03:17 UTC.

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

**Das macht ein Ablauf** ([`.github/workflows/release.yml`](.github/workflows/release.yml)):
Sobald ein Versions-Tag gepusht wird, prüft er den Stand, baut das Auslieferungspaket und
legt das Release mit den Anhängen an.

```bash
git tag -a v1.2.1 -m "Netzwerk-Labor 1.2.1"
git push origin v1.2.1
```

Nach etwa einer Minute steht das Release unter
*Releases* — mit dem ZIP und der Einzeldatei `Netzwerk-Labor.html` als Anhänge.

> **Warum ein Ablauf und nicht von Hand:** Ein Release über die API anzulegen braucht ein
> Token mit Schreibrecht. Auf dem Entwicklungsrechner liegt keines (die API antwortet dort
> mit 401, gemessen 06.10.2026). Ein Ablauf bekommt von GitHub ein `GITHUB_TOKEN` und darf
> mit `permissions: contents: write` Releases anlegen.

> **Die `.exe` ist nicht im Release**, weil sie nicht im Git liegt (8 MB). Im Paket steht
> dann der Browser-Hinweis. Wer die Windows-Fassung anhängen will: `.exe` bauen
> (siehe unten), `python tools/paket.py` laufen lassen und das entstandene
> `dist/Netzwerk-Labor-<Version>-Windows.zip` im Release-Bildschirm von Hand hineinziehen.

Ein Tag allein ist noch kein Release: **GitHub legt Releases nie von selbst an.** Der
Reiter „Releases" bleibt leer, bis ein Ablauf oder ein Mensch einen anlegt. Die älteren
Tags `endversion-1.0` und `v1.1` haben aus demselben Grund bis heute kein Release.

> **Warum `Netzwerk-Labor.html` zusätzlich im Repositorium liegt** (2,2 MB, gegen die
> Regel „keine gebauten Dateien im Git"): Ein Download-Weg muss **einen** Klick brauchen,
> und ein Release-Anhang braucht eine Person, die ihn anlegt. Die Datei ist textbasiert
> und damit diffbar, wird bei inhaltlichen Änderungen mitgebaut und ist mit
> `docs/index.html` byte-identisch. Die 8-MB-`.exe` bleibt weiter draußen — sie gehört
> an eine Release.

## Die Windows-`.exe`

```bash
python bauen.py                                    # zuerst!
cd shell/src-tauri
CARGO_TARGET_DIR=<schneller-Ordner>/target cargo tauri build --no-bundle
# Ergebnis kopieren nach Programm/Netzwerk-Labor.exe
```

Die fertigen Programme und die Bildschirmfoto-Nachweise liegen **bewusst nicht im Git**
(`.gitignore`): 8 MB `.exe` und 22 MB Beweismaterial gehören nicht in die Historie.

## Repo-Angaben setzen (Beschreibung, Homepage, Themen)

Diese drei Angaben lassen sich **nicht** per `git push` setzen, sondern nur über die
GitHub-API mit einem Token — auf dem Entwicklungsrechner liegt keines (die API antwortet
dort mit 401, gemessen 06.10.2026). Dafür gibt es ein Werkzeug:

```bash
python tools/repo-angaben.py              # Trockenlauf: zeigt nur, was gesetzt würde
GH_TOKEN=ghp_xxx python tools/repo-angaben.py --setzen
```

Nötig ist ein **Fine-grained Token** mit Repository-Zugriff nur auf `NetLab` und der
Berechtigung **Administration: Read and write** (GitHub → Settings → Developer settings →
Personal access tokens). Das Token wird nur an `api.github.com` gesendet und nirgends
gespeichert. Die Homepage ist bereits gesetzt; Beschreibung und Themen fehlen noch.

Dasselbe Werkzeug kann die **Windows-Fassung an ein Release hängen** — die 8-MB-`.exe`
liegt nicht im Git und kann deshalb vom Release-Ablauf nicht mitgebaut werden:

```bash
python tools/paket.py                                        # erzeugt dist/*-Windows.zip
GH_TOKEN=ghp_xxx python tools/repo-angaben.py --hochladen    # hängt sie an das Release
```

Dafür braucht das Token zusätzlich **Contents: Read and write**.

Alles andere ist in Abläufe gewandert und braucht kein Token von Hand: Prüfen
(`pruefen.yml`), Veröffentlichen (`seite.yml`) und das Anlegen des Releases
(`release.yml`).

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
