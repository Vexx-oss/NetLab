# Stand — gemessen, nicht getippt

Die einzige Zahlenquelle des Projekts — bei jedem Lauf neu gemessen, nicht getippt.

*Erzeugt von tools/stand.py. Handarbeit wird beim naechsten Lauf ueberschrieben.*

Diese Seite ist die **einzige Zahlenquelle** des Projekts (Vertrag: [`Architektur.md`](Architektur.md) Abschnitt 16.1). [`README.md`](../README.md), [`Liesmich.md`](Liesmich.md), [`AGENTS.md`](../AGENTS.md), [`Bauen.md`](Bauen.md), [`SITZUNGSABSCHLUSS.md`](SITZUNGSABSCHLUSS.md) und der [`CHANGELOG`](CHANGELOG.md) nennen Zahlen nur noch ueber diese Seite. **Historische CHANGELOG-Abschnitte bleiben, wie sie geschrieben wurden** — sie werden nicht rueckdatiert und nicht korrigiert.

## Der Stand

| Groesse | Wert | Gemessen mit |
|---|---|---|
| Fassung (Quelle) | **2.3.0** | `bauen.py`, Zeile `VERSION = ...` (Regex) |
| Android-Bauzaehlung | `VERSION_CODE = 20300` | `android/bauen.py` (Regex) |
| Baukennung | **`b476a879`** (gebaut aus Fassung `2.3.0`) | `docs/index.html`, `LABOR_BAU` (Regex) |
| Tests | **873/873 grün** | echter Lauf `node tests/run.js`, Bilanzzeile |
| davon uebersprungen | **0** | Zeile „davon N uebersprungen“ (`tests/harness.js`: Test mit 0 Zusicherungen) |
| Exit-Code des Testlaufs | **0** | Rueckgabewert desselben Laufs |
| Testdateien | 103 | dieselbe Bilanzzeile |
| headless Module (Testlauf) | 95 | dieselbe Bilanzzeile |
| Bau-Module | 133 (davon 95 headless) | `python bauen.py --liste` (JSON, gezaehlt) |
| src/ | 132 JS-Dateien, 32.697 Zeilen | alle `src/**/*.js`, Zeilen = Summe `str.splitlines()` je Datei (inkl. Leerzeilen, CRLF = ein Umbruch) |
| Einzeldatei `Netzwerk-Labor.html` | **3.221.785 B** · SHA256 `CCDFD87C36CDCFF0BCD84AC38037965518C02B0D3981EA481F1A54AA85F89961` | Bytes zaehlen, `hashlib.sha256` ueber die Bytes |
| Einzeldatei `docs/index.html` | **3.221.785 B** · SHA256 `CCDFD87C36CDCFF0BCD84AC38037965518C02B0D3981EA481F1A54AA85F89961` | Bytes zaehlen, `hashlib.sha256` ueber die Bytes |
| Einzeldateien byte-gleich | **ja** | gleicher SHA256 |
| Tickets | 76 | `DATEN.tickets` (headless Module geladen wie `tests/run.js`) |
| Kunden | 7 | `Object.keys(DATEN.kunden)` (headless Module geladen wie `tests/run.js`) |
| Karrierestufen | 6 | `Spiel.KARRIERE_STUFEN` (headless Module geladen wie `tests/run.js`) |
| Projekte (Tickets mit art = projekt) | 4 | `gezaehlt in DATEN.tickets` (headless Module geladen wie `tests/run.js`) |
| Mini-Tickets | 150 | `DATEN.mini` (headless Module geladen wie `tests/run.js`) |
| Netzvorlagen | 5 | `Object.keys(Spiel.vorlagen)` (headless Module geladen wie `tests/run.js`) |
| Fehlerinjektoren | 55 | `Object.keys(Spiel.INJEKTOREN)` (headless Module geladen wie `tests/run.js`) |
| Trainings | 52 | `DATEN.trainings` (headless Module geladen wie `tests/run.js`) |
| Wiki-Seiten | 37 | `Object.keys(DATEN.wiki)` (headless Module geladen wie `tests/run.js`) |
| Fertigkeiten | 30 | `DATEN.skills` (headless Module geladen wie `tests/run.js`) |
| Abzeichen | 17 | `Spiel.ABZEICHEN` (headless Module geladen wie `tests/run.js`) |
| Fehlertexte | 82 | `Object.keys(DATEN.fehlertexte)` (headless Module geladen wie `tests/run.js`) |
| Doku-Seiten docs/doku | 51 HTML-Dateien (inkl. Uebersicht) | HTML-Dateien zaehlen |
| Doku-Quellen | 50 Markdown-Dokumente | was `tools/seite.py` veroeffentlicht: `README.md` + `AGENTS.md` + `docs/**/*.md` |
| Markdown-Dateien | 86 | `git ls-files` auf `*.md` + unversionierte `*.md` |
| Relative Verweise | 270 geprueft, **0 tot** | wie `tools/repo-verweise-flicken.py` |

## Bekannte, begruendete Ausnahmen

Abweichungen, die **keine** Messung wegzaubert. Sie stehen im Vertrag, gelten bis zur
dort genannten Fassung — und der Pruefmodus prueft, dass ihre Bedingungen noch stimmen:
eine Ausnahme, die nicht mehr gilt, macht ihn rot.

| Bereich | Ausnahme | Begruendung |
|---|---|---|
| **Trainings** | lab.ipv6, lab.wlan | Kein Training fuer diese beiden Fertigkeiten: die Simulation fuehrt WLAN und IPv6 nicht paketweise aus (Architektur § 17.1, Abschnitt „Uebungsformen ohne Simulation“; der 2.1-Plan D4 erlaubt namentliche Ausnahmen). Geuebt wird inhaltlich ueber Handticket mit Arbeitsziel, Minis, Wiki, Lehrtext und Hilfe — nicht ueber ein Training. |
| **Klassenraum-Codec** | 58 von 76 Handtickets | Der Auftrags-Codec hat 6 Bit (0..63). TABELLE_AUFTRAEGE bleibt deshalb bei 58 eingefrorenen IDs; die neuen 2.1-Handtickets sind nicht klassenraum-adressierbar (Architektur § 17.9). Alte Codes bleiben gueltig, weil die Tabelle ein Literal ist; der Formatwechsel kommt erst 3.1. |
| **Quellen** | WLAN-Inhalte | Die Belege der Wiki-Seite lab.wlan nennen IEEE 802.11/802.11i/802.11w und die WPA3-Spezifikation der Wi-Fi Alliance. Das sind inhaltliche Quellen; eine Paket-Simulation oder eine Geraetezertifizierung ist damit nicht behauptet. |

**Gegenprobe (gemessen in diesem Lauf):**

- Trainings fuer `lab.ipv6` und `lab.wlan`: **`lab.ipv6`: 0, `lab.wlan`: 0** — die
  Ausnahme gilt also.
- Klassenraum-Codec: **58** eingefrorene Auftrags-IDs (Literal, § 17.9),
  derzeit **76** Handtickets — **18** davon sind per Code
  nicht aufrufbar (2.1-Ziel: 76 Handtickets, Formatwechsel erst 3.1).
- WLAN-Quellen: `Wi-Fi Alliance` ist in `src/daten/wiki.js` belegt
  (WPA3-Spezifikation; inhaltliche Quelle, keine Geraetezertifizierung).

## So wird gemessen

```bash
python tools/stand.py --zahlen    # die Messung als JSON, schreibt nichts
python tools/stand.py            # docs/STAND.md + Stand-Block in README.md schreiben
python tools/stand.py --pruefen  # Exit 0 oder 1 mit der betroffenen Zeile
```

Ein Lauf misst: Fassung, Android-Bauzaehlung, Baukennung, den **echten Testlauf** (kein gespeicherter Wert), die Modulliste des Baus, Dateien und Zeilen unter src/, beide Einzeldateien samt SHA256, den geladenen Datenbestand (Tickets, Minis, Injektoren, Trainings, Wiki, Fertigkeiten), die Doku-Seiten und alle relativen Verweise. **Bewusst ohne Datum und Uhrzeit:** ein Zeitstempel waere bei jedem Lauf anders, dann koennte der Pruefmodus nie gruen werden. Wann gemessen wurde, steht im Git-Log dieser Datei.

Nach einer Aenderung an den Dokumenten ist die Reihenfolge: `python tools/stand.py`, dann `python tools/seite.py`, dann noch einmal `python tools/stand.py` (die neue Seite zaehlt mit), dann `python tools/seite.py`.

## Abweichungen und ehrliche Grenzen

- **Browser, Android und die Windows-Datei werden hier nicht gemessen.** Ob die Live-Seite, ein Browser oder die .exe laufen, kann dieses Werkzeug ohne Browser und ohne die nicht im Git liegenden Nachweise nicht pruefen; solche Aussagen stehen in den Dokumenten ausdruecklich als nicht geprueft.
- **Der Testlauf misst den Arbeitsbaum im Moment des Laufs.** Aendert ein anderer Bearbeiter gleichzeitig src/ oder tests/, beschreibt der Stand genau diesen Moment — deshalb wird er nach jeder Aenderung neu erzeugt und in der CI geprueft.
- **Kein Datum, keine Uhr:** siehe oben; der Pruefmodus vergleicht Text gegen Messung, nicht Zeitstempel.

<div hidden>
<!-- STAND:ZAHLEN {"android_code": "20300", "bau": {"gesamt": 133, "headless": 95}, "codec": {"auftraege": 58}, "doku": {"quellen": 50, "seiten": 51}, "einzeldatei": {"dateien": [{"bau": "b476a879", "bytes": 3221785, "fassung": "2.3.0", "pfad": "Netzwerk-Labor.html", "sha256": "ccdfd87c36cdcff0bcd84ac38037965518c02b0d3981ea481f1a54aa85f89961"}, {"bau": "b476a879", "bytes": 3221785, "fassung": "2.3.0", "pfad": "docs/index.html", "sha256": "ccdfd87c36cdcff0bcd84ac38037965518c02b0d3981ea481f1a54aa85f89961"}], "gleich": true}, "fassung": "2.3.0", "inhalte": {"abzeichen": 17, "fehlertexte": 82, "fertigkeiten": 30, "injektoren": 55, "karrierestufen": 6, "kunden": 7, "minis": 150, "netzvorlagen": 5, "projekte": 4, "tickets": 76, "trainings": 52, "trainingsSkills": ["lab.link", "lab.link", "lab.ip", "lab.ip", "lab.netz", "lab.gateway", "lab.gateway", "lab.arp", "lab.ping", "lab.switch", "lab.subnetz", "lab.subnetz", "lab.dhcp", "lab.dns", "lab.ports", "lab.tcp", "lab.cli", "lab.speichern", "lab.vlan", "lab.vlan", "lab.trunk", "lab.rostick", "lab.acl", "lab.acl", "lab.route", "lab.route", "lab.ttl", "lab.nat", "lab.portfwd", "lab.fw", "lab.dmz", "lab.portsec", "lab.stp", "lab.storage", "lab.link", "lab.dhcp", "lab.dhcp", "lab.dhcp", "lab.route", "lab.dns", "lab.betrieb", "lab.netz", "lab.arp", "lab.ports", "lab.tcp", "lab.speichern", "lab.trunk", "lab.rostick", "lab.ttl", "lab.portfwd", "lab.fw", "lab.dmz"], "wikiSeiten": 37}, "src": {"dateien": 132, "zeilen": 32697}, "tests": {"exit": 0, "gesamt": 873, "gruen": 873, "headless": 95, "rot": 0, "testdateien": 103, "uebersprungen": 0}, "verweise": {"geprueft": 270, "md": 86, "tot": []}} -->
</div>
