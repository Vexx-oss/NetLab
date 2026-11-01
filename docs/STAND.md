# Stand — gemessen, nicht getippt

Die einzige Zahlenquelle des Projekts — bei jedem Lauf neu gemessen, nicht getippt.

*Erzeugt von tools/stand.py. Handarbeit wird beim naechsten Lauf ueberschrieben.*

Diese Seite ist die **einzige Zahlenquelle** des Projekts (Vertrag: [`Architektur.md`](Architektur.md) Abschnitt 16.1). [`README.md`](../README.md), [`Liesmich.md`](Liesmich.md), [`AGENTS.md`](../AGENTS.md), [`Bauen.md`](Bauen.md), [`SITZUNGSABSCHLUSS.md`](SITZUNGSABSCHLUSS.md) und der [`CHANGELOG`](CHANGELOG.md) nennen Zahlen nur noch ueber diese Seite. **Historische CHANGELOG-Abschnitte bleiben, wie sie geschrieben wurden** — sie werden nicht rueckdatiert und nicht korrigiert.

## Der Stand

| Groesse | Wert | Gemessen mit |
|---|---|---|
| Fassung (Quelle) | **3.0.0** | `bauen.py`, Zeile `VERSION = ...` (Regex) |
| Android-Bauzaehlung | `VERSION_CODE = 30001` | `android/bauen.py` (Regex) |
| Baukennung | **`5752600c`** (gebaut aus Fassung `3.0.0`) | `docs/index.html`, `LABOR_BAU` (Regex) |
| Tests | **1.321/1.321 grün** | echter Lauf `node tests/run.js`, Bilanzzeile |
| davon uebersprungen | **0** | Zeile „davon N uebersprungen“ (`tests/harness.js`: Test mit 0 Zusicherungen) |
| Exit-Code des Testlaufs | **0** | Rueckgabewert desselben Laufs |
| Testdateien | 165 | dieselbe Bilanzzeile |
| headless Module (Testlauf) | 98 | dieselbe Bilanzzeile |
| Bau-Module | 143 (davon 98 headless) | `python bauen.py --liste` (JSON, gezaehlt) |
| src/ | 142 JS-Dateien, 42.692 Zeilen | alle `src/**/*.js`, Zeilen = Summe `str.splitlines()` je Datei (inkl. Leerzeilen, CRLF = ein Umbruch) |
| Einzeldatei `Netzwerk-Labor.html` | **4.169.775 B** · SHA256 `D86B905F0CE8A53571758E6D3D13C3434C6691BB2590CC89636B1609E98D9583` | Bytes zaehlen, `hashlib.sha256` ueber die Bytes |
| Einzeldatei `docs/index.html` | **4.169.775 B** · SHA256 `D86B905F0CE8A53571758E6D3D13C3434C6691BB2590CC89636B1609E98D9583` | Bytes zaehlen, `hashlib.sha256` ueber die Bytes |
| Einzeldateien byte-gleich | **ja** | gleicher SHA256 |
| Tickets | 76 | `DATEN.tickets` (headless Module geladen wie `tests/run.js`) |
| Kunden | 7 | `Object.keys(DATEN.kunden)` (headless Module geladen wie `tests/run.js`) |
| Karrierestufen | 6 | `Spiel.KARRIERE_STUFEN` (headless Module geladen wie `tests/run.js`) |
| Projekte (Tickets mit art = projekt) | 4 | `gezaehlt in DATEN.tickets` (headless Module geladen wie `tests/run.js`) |
| Mini-Tickets | 151 | `DATEN.mini` (headless Module geladen wie `tests/run.js`) |
| Netzvorlagen | 5 | `Object.keys(Spiel.vorlagen)` (headless Module geladen wie `tests/run.js`) |
| Fehlerinjektoren | 55 | `Object.keys(Spiel.INJEKTOREN)` (headless Module geladen wie `tests/run.js`) |
| Trainings | 52 | `DATEN.trainings` (headless Module geladen wie `tests/run.js`) |
| Wiki-Seiten | 37 | `Object.keys(DATEN.wiki)` (headless Module geladen wie `tests/run.js`) |
| Fertigkeiten | 30 | `DATEN.skills` (headless Module geladen wie `tests/run.js`) |
| Abzeichen | 17 | `Spiel.ABZEICHEN` (headless Module geladen wie `tests/run.js`) |
| Fehlertexte | 82 | `Object.keys(DATEN.fehlertexte)` (headless Module geladen wie `tests/run.js`) |
| Doku-Seiten docs/doku | 69 HTML-Dateien (inkl. Uebersicht) | HTML-Dateien zaehlen |
| Doku-Quellen | 68 Markdown-Dokumente | was `tools/seite.py` veroeffentlicht: `README.md` + `AGENTS.md` + `docs/**/*.md` |
| Markdown-Dateien | 105 | `git ls-files` auf `*.md` + unversionierte `*.md` |
| Relative Verweise | 364 geprueft, **0 tot** | wie `tools/repo-verweise-flicken.py` |
| R12 Bedienelemente | **Letztmessung: max 59 sichtbare Bedienelemente, 44 Messungen (Ansicht x Breite), 32 ueber der Grenze eingefroren** (`tests/r12-stand.json`, Stand 2026-10-31); Gate: Zuwachs je Ansicht×Breite = ROT | `tools/ethos.py --dom --r12 <roh> --festhalten` -> `tests/r12-stand.json` |

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

Ein Lauf misst: Fassung, Android-Bauzaehlung, Baukennung, den **echten Testlauf** (kein gespeicherter Wert), die Modulliste des Baus, Dateien und Zeilen unter src/, beide Einzeldateien samt SHA256, den geladenen Datenbestand (Tickets, Minis, Injektoren, Trainings, Wiki, Fertigkeiten), die Doku-Seiten, alle relativen Verweise und (falls vorhanden) die verbindliche R12-Zahl aus Nachweise/3.0/r12.json. **Bewusst ohne Datum und Uhrzeit:** ein Zeitstempel waere bei jedem Lauf anders, dann koennte der Pruefmodus nie gruen werden. Wann gemessen wurde, steht im Git-Log dieser Datei.

Nach einer Aenderung an den Dokumenten ist die Reihenfolge: `python tools/stand.py`, dann `python tools/seite.py`, dann noch einmal `python tools/stand.py` (die neue Seite zaehlt mit), dann `python tools/seite.py`.

## Abweichungen und ehrliche Grenzen

- **Browser, Android und die Windows-Datei werden hier nicht gemessen.** Ob die Live-Seite, ein Browser oder die .exe laufen, kann dieses Werkzeug ohne Browser und ohne die nicht im Git liegenden Nachweise nicht pruefen; solche Aussagen stehen in den Dokumenten ausdruecklich als nicht geprueft.
- **Der Testlauf misst den Arbeitsbaum im Moment des Laufs.** Aendert ein anderer Bearbeiter gleichzeitig src/ oder tests/, beschreibt der Stand genau diesen Moment — deshalb wird er nach jeder Aenderung neu erzeugt und in der CI geprueft.
- **Kein Datum, keine Uhr:** siehe oben; der Pruefmodus vergleicht Text gegen Messung, nicht Zeitstempel.

<div hidden>
<!-- STAND:ZAHLEN {"android_code": "30001", "bau": {"gesamt": 143, "headless": 98}, "codec": {"auftraege": 58}, "doku": {"quellen": 68, "seiten": 69}, "einzeldatei": {"dateien": [{"bau": "5752600c", "bytes": 4169775, "fassung": "3.0.0", "pfad": "Netzwerk-Labor.html", "sha256": "d86b905f0ce8a53571758e6d3d13c3434c6691bb2590cc89636b1609e98d9583"}, {"bau": "5752600c", "bytes": 4169775, "fassung": "3.0.0", "pfad": "docs/index.html", "sha256": "d86b905f0ce8a53571758e6d3d13c3434c6691bb2590cc89636b1609e98d9583"}], "gleich": true}, "fassung": "3.0.0", "inhalte": {"abzeichen": 17, "fehlertexte": 82, "fertigkeiten": 30, "injektoren": 55, "karrierestufen": 6, "kunden": 7, "minis": 151, "netzvorlagen": 5, "projekte": 4, "tickets": 76, "trainings": 52, "trainingsSkills": ["lab.link", "lab.link", "lab.ip", "lab.ip", "lab.netz", "lab.gateway", "lab.gateway", "lab.arp", "lab.ping", "lab.switch", "lab.subnetz", "lab.subnetz", "lab.dhcp", "lab.dns", "lab.ports", "lab.tcp", "lab.cli", "lab.speichern", "lab.vlan", "lab.vlan", "lab.trunk", "lab.rostick", "lab.acl", "lab.acl", "lab.route", "lab.route", "lab.ttl", "lab.nat", "lab.portfwd", "lab.fw", "lab.dmz", "lab.portsec", "lab.stp", "lab.storage", "lab.link", "lab.dhcp", "lab.dhcp", "lab.dhcp", "lab.route", "lab.dns", "lab.betrieb", "lab.netz", "lab.arp", "lab.ports", "lab.tcp", "lab.speichern", "lab.trunk", "lab.rostick", "lab.ttl", "lab.portfwd", "lab.fw", "lab.dmz"], "wikiSeiten": 37}, "r12": {"ansichten": {"heute": {"1366": 16, "1440": 16, "720": 16, "960": 16}, "klassenraum": {"1366": 6, "1440": 6, "720": 6, "960": 6}, "kunden": {"1366": 4, "1440": 4, "720": 4, "960": 4}, "labor": {"1366": 17, "1440": 17, "720": 7, "960": 11}, "lernstand": {"1366": 39, "1440": 39, "720": 39, "960": 39}, "mitarbeit": {"1366": 3, "1440": 3, "720": 3, "960": 3}, "postfach": {"1366": 10, "1440": 10, "720": 9, "960": 10}, "shop": {"1366": 12, "1440": 12, "720": 12, "960": 12}, "subnetz": {"1366": 13, "1440": 13, "720": 13, "960": 13}, "training": {"1366": 59, "1440": 59, "720": 59, "960": 59}, "wiki": {"1366": 42, "1440": 42, "720": 42, "960": 42}}, "gemessen": true, "grenzen": {"mitarbeit": 3, "standard": 6}, "grund": null, "max": 59, "messungen": 44, "verstoesse": ["Heute (heute) @1366px: 16 sichtbare Bedienelemente - erlaubt 6", "Heute (heute) @1440px: 16 sichtbare Bedienelemente - erlaubt 6", "Heute (heute) @720px: 16 sichtbare Bedienelemente - erlaubt 6", "Heute (heute) @960px: 16 sichtbare Bedienelemente - erlaubt 6", "Labor (labor) @1366px: 17 sichtbare Bedienelemente - erlaubt 6", "Labor (labor) @1440px: 17 sichtbare Bedienelemente - erlaubt 6", "Labor (labor) @720px: 7 sichtbare Bedienelemente - erlaubt 6", "Labor (labor) @960px: 11 sichtbare Bedienelemente - erlaubt 6", "Lernstand (lernstand) @1366px: 39 sichtbare Bedienelemente - erlaubt 6", "Lernstand (lernstand) @1440px: 39 sichtbare Bedienelemente - erlaubt 6", "Lernstand (lernstand) @720px: 39 sichtbare Bedienelemente - erlaubt 6", "Lernstand (lernstand) @960px: 39 sichtbare Bedienelemente - erlaubt 6", "Postfach (postfach) @1366px: 10 sichtbare Bedienelemente - erlaubt 6", "Postfach (postfach) @1440px: 10 sichtbare Bedienelemente - erlaubt 6", "Postfach (postfach) @720px: 9 sichtbare Bedienelemente - erlaubt 6", "Postfach (postfach) @960px: 10 sichtbare Bedienelemente - erlaubt 6", "Shop (shop) @1366px: 12 sichtbare Bedienelemente - erlaubt 6", "Shop (shop) @1440px: 12 sichtbare Bedienelemente - erlaubt 6", "Shop (shop) @720px: 12 sichtbare Bedienelemente - erlaubt 6", "Shop (shop) @960px: 12 sichtbare Bedienelemente - erlaubt 6", "Subnetting (subnetz) @1366px: 13 sichtbare Bedienelemente - erlaubt 6", "Subnetting (subnetz) @1440px: 13 sichtbare Bedienelemente - erlaubt 6", "Subnetting (subnetz) @720px: 13 sichtbare Bedienelemente - erlaubt 6", "Subnetting (subnetz) @960px: 13 sichtbare Bedienelemente - erlaubt 6", "Training (training) @1366px: 59 sichtbare Bedienelemente - erlaubt 6", "Training (training) @1440px: 59 sichtbare Bedienelemente - erlaubt 6", "Training (training) @720px: 59 sichtbare Bedienelemente - erlaubt 6", "Training (training) @960px: 59 sichtbare Bedienelemente - erlaubt 6", "Wiki (wiki) @1366px: 42 sichtbare Bedienelemente - erlaubt 6", "Wiki (wiki) @1440px: 42 sichtbare Bedienelemente - erlaubt 6", "Wiki (wiki) @720px: 42 sichtbare Bedienelemente - erlaubt 6", "Wiki (wiki) @960px: 42 sichtbare Bedienelemente - erlaubt 6"], "zeit": "2026-10-31T22:52:09+01:00"}, "src": {"dateien": 142, "zeilen": 42692}, "tests": {"exit": 0, "gesamt": 1321, "gruen": 1321, "headless": 98, "rot": 0, "testdateien": 165, "uebersprungen": 0}, "verweise": {"geprueft": 364, "md": 105, "tot": []}} -->
</div>
