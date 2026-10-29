---
beschreibung: Häufige Fragen und Troubleshooting — ehrlich beantwortet, mit Verweis auf die Stelle, an der es belegt ist.
erstellt: 2026-10-29
---

# Häufige Fragen und Troubleshooting

Hier stehen die Fragen, die beim Ausprobieren, im Unterricht und beim Beitragen
erfahrungsgemäß zuerst kommen — jeweils mit der **Stelle, an der es belegt ist**. Wo etwas
nicht gemessen wurde, steht das ausdrücklich so. Zahlen (Tests, Module, Größen) stehen
grundsätzlich nicht hier, sondern in [STAND.md](STAND.md) — sie werden bei jedem Lauf
gemessen, nicht abgeschrieben.

## Spielen und Starten

### 1. Muss ich für das Spiel ins Internet?

**Nein.** Die ausgelieferte Einzeldatei (`Netzwerk-Labor.html`) lädt nichts nach: Schriften
sind eingebettet, es gibt **0 Außenverweise**. Das prüft `python tools/einfach.py --pruefen`
über `<link>`, `<script src>`, `<img src>` und `url()`. Die Browser-Fassung im Netz braucht
natürlich einmal eine Verbindung, um geladen zu werden.

### 2. Wo liegt mein Spielstand — und warum ist er im Windows-Programm nicht da?

Browser und Windows-Programm speichern **getrennt**:

- Browser: `localStorage` der jeweiligen Adresse
- Windows: `%APPDATA%\de.fisi.netzwerklabor\spielstand.json`

Sie tauschen sich nicht aus. Ob ein Browser `localStorage` für eine per Doppelklick
geöffnete Datei (`file://`) dauerhaft behält, ist **nicht gemessen** — für den Unterricht ist
der Weg über den Browser oder das Windows-Programm verlässlicher.

### 3. Das Windows-Programm öffnet kein Fenster. Was ist los?

Gemessener Grund: ein **Integritätslabel „Niedrig"** auf dem Programmordner (Überrest einer
Werkzeug-Sandbox). Die `.exe` erbt es, läuft als Low-Prozess und darf `%LOCALAPPDATA%` nicht
beschreiben; die WebView2-Laufzeit kann ihr Profil nicht anlegen und bricht ab
(`failed to create webview`, `0x800700AA`).

**Abhilfe (ohne Administratorrechte, wiederholbar):** `Programm/Integritaet-reparieren.cmd`
doppelklicken. Der ausführliche Befund liegt in `Nachweise/1.2-Start/BEFUND.md` — **nicht im
Repo** (`Nachweise/` ist nicht versioniert); im Repo zusammengefasst in
[Architektur.md](Architektur.md) und [Bauen.md](Bauen.md).

### 4. SmartScreen warnt beim Start. Ist das ein Problem?

Die `.exe` ist **nicht signiert** — Windows zeigt deshalb beim ersten Start den
SmartScreen-Hinweis („Weitere Informationen" → „Trotzdem ausführen"). Das ist erwartbar und
kein Fehler des Programms. Eine Signatur kostet Geld und ist nicht Teil des Projekts.

### 5. Warum liegt im Release keine APK für Android?

In den Releases liegt **keine** APK (geprüft am 26.10.2026), und im Klon ist keine. Die APK
baut man selbst: `python android/bauen.py` (Android-SDK mit build-tools ≥ 35 und JDK 17+
nötig). **Nicht geprüft** ist ein Lauf auf einem echten Telefon oder Emulator — ein Gerät
stand nicht zur Verfügung. Details: [Bauen.md](Bauen.md), Abschnitt Android, und
[android/LIESMICH.md](../android/LIESMICH.md) (nicht Teil der Doku-Seite).

### 6. Läuft es auf Linux und macOS?

Im **Browser** ja — die Einzeldatei ist plattformunabhängig. Die Linux-Pakete unter
`Programm/linux/` sind **Stand 1.0** und enthalten die Neuerungen seit 1.1 nicht. Getestet
wurde Linux nur in **WSLg**, nicht auf einem echten GNOME/KDE — dort gibt es keinen
Tray-Dienst. macOS ist **nicht geprüft**.

### 7. Die Bilder im README zeigen eine ältere Version. Warum?

Die Screenshots stammen aus den Abnahme-Nachweisen der Fassung **1.1.0**; Oberfläche und
Aufbau sind gleich geblieben, nur die kleinen Ziffern in der Kopfzeile der Bilder sind
älter. Herkunft, Quellpfad und SHA256 jeder Aufnahme stehen in
[bilder/HERKUNFT.md](bilder/HERKUNFT.md). Ohne Browser wurden in der 2.1-Runde **keine**
neuen Bilder erzeugt — das ist ausdrücklich „nicht geprüft".

## Unterricht, Lizenz, Weitergabe

### 8. Darf ich das im Unterricht oder in der Ausbildung einsetzen?

**Ja.** PolyForm Noncommercial 1.0.0 erlaubt Spielen, Üben und Unterricht — auch in Schulen
und Bildungseinrichtungen. Kein Konto, kein Server, keine Bewertung, kein Netz nötig.
Der Klassenraum (Lehrkraft sagt einen Code an, jedes Gerät baut denselben Auftrag) ist in
**Stufen A+B** gebaut; Bewertung, Server und QR stehen aus — Stand in
[Architektur.md](Architektur.md) § 12 und [CHANGELOG.md](CHANGELOG.md).

### 9. Darf ich es verkaufen oder kommerziell nutzen?

**Nein**, nicht ohne gesonderte Erlaubnis. Verkaufen, kommerzielles Nutzen und Weitergeben
unter eigener Flagge sind untersagt; der verbindliche Text ist `LICENSE`, die deutsche
Erklärung mit Ausnahmen (Schriften, Inhalte, Marken) steht in `LIZENZ.md`. Beide Texte
liegen dem Auslieferungspaket bei und sind seit 2.1.0 **auch in der Einzeldatei** als
Lizenzblock enthalten (PolyForm + die drei OFL-Texte der eingebetteten Schriften).

### 10. Ist die Doku öffentlich?

**Ja** — seit 07.10.2026 wird die gesamte Doku als HTML unter
[vexx-oss.github.io/NetLab/doku/](https://vexx-oss.github.io/NetLab/doku/) ausgeliefert
(erzeugt von `python tools/seite.py` aus den Markdown-Dateien, versioniert in `docs/doku/`).
Das umfasst auch die langen Entwicklungsnotizen. Wer etwas Internes nicht öffentlich haben
will, legt es nicht in `docs/` ab.

## Beitragen und Bauen

### 11. Wie baue ich das Spiel selbst?

Voraussetzung: Node (für Tests) und Python 3 (für die Werkzeuge).

```bash
git clone https://github.com/Vexx-oss/NetLab.git
cd NetLab
python bauen.py            # src/ -> web/index.html
python tools/einfach.py    # web/ -> docs/index.html und Netzwerk-Labor.html (byte-gleich)
sh tools/test.sh           # Tests headless in Node
python tools/stand.py --pruefen   # die Zahlen in STAND.md/README gegen die Messung
```

Die Reihenfolge ist wichtig (`bauen.py` zuerst). Für die Windows-Hülle kommt Rust dazu
(`cargo tauri build`), für Android das Android-SDK. Details: [Bauen.md](Bauen.md).

### 12. Warum stehen im README keine Testzahlen?

Weil sie zu oft falsch abgeschrieben wurden: Bis 2.1 standen **fünf** verschiedene
Testzahlen im selben Repo (aus fünf Fassungen). Seit 2.1 gibt es genau **eine** Quelle:
[STAND.md](STAND.md), erzeugt von `python tools/stand.py` aus einem echten Testlauf;
`--pruefen` meldet jede Abweichung. Zahlen in README und Doku werden nicht mehr getippt.

### 13. Ein Test schlägt fehl. Wie melde ich das?

Ein **Issue** im Repo (Vorlage: `.github/ISSUE_TEMPLATE/bug_report.md`) mit: Befehl,
vollständiger Ausgabe, Betriebssystem, Node-Fassung und ob die FISi-Spielhalle daneben liegt
(`../FISI-Spielhalle`). Keine Zugangsdaten, keine Spielstände mit Klarnamen anhängen.
**Sicherheitslücken** bitte nicht als öffentliches Issue: siehe `SECURITY.md`.

### 14. Ich will etwas beitragen — was gilt?

Arbeite auf dem Zweig `ausbau-1.2`, halte dich an [../AGENTS.md](../AGENTS.md) (kurz: keine
Prozesse nach Namen beenden, kein Push ohne Absprache, nichts behaupten, was nicht gemessen
ist) und an [Mitmachen.md](Mitmachen.md). Ein Beitrag zählt erst, wenn er **im Programm
wirkt** („Wirkung vor Grün") und die Tests grün bleiben. Fehlt eine Zahl, gehört sie in
`STAND.md` — nicht in Prosa wiederholt.

### 15. Was fehlt noch (IPv6, OSPF, WLAN, STP)?

Die Simulation deckt IPv4 mit VLAN, Routing, ACL, NAT, DHCP, DNS, TCP/HTTP und Firewall ab.
**Nicht enthalten** sind derzeit STP, OSPF, IPv6, WLAN und 802.1X — sie stehen im
3.0-Programm. Ein Wiki-Befehl, den das Labor nicht kann, ist dort ausdrücklich als „echtes
Gerät" gekennzeichnet (Architektur § 15.2, Punkt 5).

---

**Wenn etwas hier fehlt:** Issue mit der Frage stellen. Was oft gefragt wird, wandert in
diese Datei — und was dabei als „nicht geprüft" herauskommt, bleibt genau so stehen.
