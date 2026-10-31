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

### 5. Warum hängt im Release keine Android-APK?

Im Klon liegt keine `.apk`, und auch die 2.9.0-Veröffentlichung kam ohne APK (Beleg:
[CHANGELOG.md](CHANGELOG.md), Abschnitt 2.9.0). Ob eine künftige Veröffentlichung eine APK
anhängt, ist **nicht geprüft** — der Release-Ablauf tut es nur, wenn die Keystore-Secrets
gesetzt sind. Die APK baut man selbst: `python android/bauen.py` (Android-SDK mit
build-tools ≥ 35 und JDK 17+ nötig). **Nicht geprüft** ist ein Lauf auf einem echten Telefon
oder Emulator — ein Gerät stand nicht zur Verfügung. Details: [Bauen.md](Bauen.md),
Abschnitt Android, und [android/LIESMICH.md](../android/LIESMICH.md) (nicht Teil der Doku-Seite).

### 6. Läuft es auf Linux und macOS?

Im **Browser** ja — die Einzeldatei ist plattformunabhängig. Die Linux-Pakete unter
`Programm/linux/` sind **Stand 1.0** und enthalten die Neuerungen seit 1.1 nicht. Getestet
wurde Linux nur in **WSLg**, nicht auf einem echten GNOME/KDE — dort gibt es keinen
Tray-Dienst. macOS ist **nicht geprüft**.

### 7. Die Bilder im README zeigen eine ältere Version. Warum?

Die Screenshots stammen aus dem Abnahme-Nachweis der Fassung **2.5.0** (aufgenommen am
30.10.2026); die aktuelle Fassung ist **2.9.0**, und seither sind Ansichten hinzugekommen
(u. a. die Subnetting-Abteilung). Herkunft, Quellpfad und SHA256 jeder Aufnahme stehen in
[bilder/HERKUNFT.md](bilder/HERKUNFT.md). Eine Erneuerung aus dem 2.9.0-/3.0.0-Bau steht aus —
dass die Bilder den heutigen Stand vollständig zeigen, ist **nicht geprüft**.

## Unterricht, Lizenz, Weitergabe

### 8. Darf ich das im Unterricht oder in der Ausbildung einsetzen?

**Ja.** PolyForm Noncommercial 1.0.0 erlaubt Spielen, Üben und Unterricht — auch in Schulen
und Bildungseinrichtungen. Kein Konto, kein Server, keine Bewertung, kein Netz nötig.
Der Klassenraum (Lehrkraft sagt einen Code an, jedes Gerät baut denselben Auftrag) ist in
**Stufen A+B** gebaut; eine Bewertung gibt es nicht, Server und QR sind **3.1** und im Produkt
nicht gebaut — Stand in [Architektur.md](Architektur.md) § 12 (Datenform § 12.1, API § 12.2;
Server/QR: § 12.6/§ 12.7) und [CHANGELOG.md](CHANGELOG.md).

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
**Nicht paketweise simuliert** sind IPv6 und WLAN; sie werden inhaltlich über Wiki und
Trainings geübt (`docs/STAND.md`, bekannte Ausnahmen). **OSPF** und **802.1X** sind nicht
enthalten. Spanning Tree (`lab.stp`) ist dagegen abgedeckt: Wiki, Minis, Trainings und ein
eigener Handauftrag („Zwei Kabel, ein Ausfall"). Das ist **kein** 3.0-Kernpunkt — der
3.0-Plan ([Konzept – 3.0](<entwicklung/Konzept – 3.0.md>)) konzentriert sich auf
Klassenbetrieb, Diagnose und Messkette. Ein Wiki-Befehl, den das Labor nicht kann, ist dort
ausdrücklich als „echtes Gerät" gekennzeichnet (Architektur § 15.2, Punkt 5).

### 16. Funktioniert der Klassenraum ohne Server?

**Ja.** Stufe A (Auftragscode) und B (zwei Ansichten, Ampel, Export/Import) tragen den
Unterricht vollständig: Die Lehrkraft sagt einen Code an, jedes Gerät baut denselben Auftrag
selbst; Ergebnis- und Hilfecodes werden eingetippt. Server (Stufe C) und QR (Stufe D) sind
**3.1** und im Produkt nicht gebaut — Belege: [Architektur.md](Architektur.md) § 12.6/§ 12.7.
Ein Aufbau mit Klassennetz und Firewall-Freigabe ist **nicht geprüft**.

### 17. Ist die Oberfläche barrierefrei — und was ist R12?

Automatisch gemessen werden Kontrast, Trefferflächen und abgeschnittene Texte (Werkzeuge
`tools/rauch.py`, `tools/ethos.py`); im 2.9.0-Lauf ohne Kontrastverstöße und mit
„Bewegung aus" ohne Animationen. Die Rohziele unter der 44-px-Zielgröße sind ausschließlich
die Bit-Zellen des 32-Bit-Labors (Beleg: [CHANGELOG.md](CHANGELOG.md), Abschnitt 2.9.0).
Die Regel **R12** („höchstens sechs sichtbare Bedienelemente je Ansicht") wird nur mit
`ethos.py --dom` gemessen; dieser Lauf fehlt: **nicht gemessen**. Ein Screenreader-Audit ist
**nicht geprüft**.

### 18. Wie bekomme ich das Spiel auf ein Android-Gerät?

Im Browser: die Live-Seite oder die Einzeldatei. Als App: APK selbst bauen
(`python android/bauen.py`, Android-SDK und JDK nötig), aufs Telefon kopieren und dort
installieren. Ein Lauf auf einem echten Gerät oder Emulator ist **nicht geprüft** (kein Gerät
vorhanden); geprüft ist die Seite im Browser mit Telefonmaßen. Details:
[android/LIESMICH.md](../android/LIESMICH.md).

### 19. Welche Daten verlassen das Gerät?

**Keine** — das Labor ist offline, kontofrei und ohne Telemetrie. Die Einzeldatei lädt nichts
nach (0 Außenverweise, geprüft mit `python tools/einfach.py --pruefen`). Der Klassenraum
überträgt per Code nur Sitzung, Platz, Sterne, Fehlversuche und Dauer — keinen Namen, keine
Kennung; der Server (Stufe C) ist **3.1** und nicht gebaut ([Architektur.md](Architektur.md)
§ 12.6/§ 12.8). Spielstände bleiben lokal (Browser: `localStorage`, Windows:
`%APPDATA%`), siehe Frage 2.

### 20. Läuft das Spiel ohne Internet?

**Ja.** Die Einzeldatei enthält Programm und Schriften; sie lädt nichts nach (0 Außenverweise,
geprüft mit `python tools/einfach.py --pruefen`). Die Doku liegt im Browser-ZIP als Ordner
`doku/` bei und ist offline lesbar; nur die Live-Seite braucht eine Verbindung, um geladen
zu werden. Details: [Liesmich.md](Liesmich.md) und [README](../README.md).

---

**Wenn etwas hier fehlt:** Issue mit der Frage stellen. Was oft gefragt wird, wandert in
diese Datei — und was dabei als „nicht geprüft" herauskommt, bleibt genau so stehen.
