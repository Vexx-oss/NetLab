---
tags: [FISI, Lernspiel, Netzwerk, Konzept, 3.0, Planung]
erstellt: 2026-10-09
aktualisiert: 2026-10-31
status: Konzept — Plan mit Aufwand, Risiko und messbaren Fertig-Kriterien. Ist-Zahlen in §1 sind Stand 09.10.2026 (Fassung 2.0); der heutige Stand (2.9.0) steht in §1a und in docs/STAND.md. Kein Wunschzettel.
---

# Konzept – Netzwerk-Labor 3.0

> **Stand-Banner (31.10.2026).** Dieses Konzept wurde am **09.10.2026** gegen die damals
> ausgelieferte **Fassung 2.0** geschrieben. Alle Ist-Zahlen in §1 und alle unmarkierten
> Messwerte in §2–§6 sind **Stand 09.10.2026**; sie stehen hier als Planungsgrundlage und
> sind **nicht** der heutige Stand. Was am **31.10.2026** in Fassung **2.9.0** gemessen ist,
> steht in **§1a**; die einzige Zahlenquelle ist [`docs/STAND.md`](../STAND.md).

> **Wie dieses Dokument zu lesen ist.** Es beschreibt **fünf Säulen**, jede mit Ist-Stand (gemessen),
> Aufwand in Sitzungen, Risiko und einem **messbaren** Fertig-Kriterium — und am Ende, was ausdrücklich
> **nicht** hineingehört. Die Aufwände sind **Schätzungen**, keine Messungen; sie stehen als Spanne und mit
> ihrem Anker. Alles andere ist eine Zahl aus dem Bestand oder in dieser Sitzung nachgezählt.

## 0 · In einem Satz

**3.0 macht das Labor unterrichtstauglich für eine Klasse von 20 — nicht größer im Code, sondern
verlässlicher im Ablauf:** Inhalte, die nicht ausgehen, eine Lehrkraft, die sieht, *wo* es hakt (ohne
jemanden zu bewerten), und Server und QR nur dort, wo sie den Ablauf wirklich tragen.

## 1 · Was 2.0 am 09.10.2026 war (gemessen — historisch)

| Größe | Stand | Quelle |
|---|---|---|
| Tests | **733/733 grün**, 82 Testdateien, 91 Module, 0 übersprungen | `sh tools/test.sh`, selbst gemessen |
| Handgeschriebene Aufträge | **58** | `TABELLE_AUFTRAEGE_LAENGE` in `src/spiel/klassenraum-codec.js` |
| Fertigkeiten | **27** (Tabelle für den Codec eingefroren) | `DATEN.skills` |
| Fehlerinjektoren | **39** | `Spiel.INJEKTOREN` |
| Trainings-Szenarien | **34** | `DATEN.trainings` |
| Auftragsformen | **8** (Störung, Projekt, Terminal, Fernwartung, Audit, Adressplan, Hotline, Sicherheitsvorfall) | `Spiel.FORMEN` |
| Mini-Tickets | **92**, davon **91** mit eigenem Denkanstoß | `DATEN.mini`, `DATEN.miniDenkhilfen` |
| Hilfe-Vorschläge | **44** (Ebene 1 = 22, Ebene 2 = 15, Ebene 3 = 7) | `DATEN.hilfen.VORSCHLAEGE` |
| Wiki | **29 Seiten / 107 Abschnitte** | `DATEN.wiki`, selbst gezählt |
| Menüprobe | **45 erfüllt / 0 verletzt** (Web), **49/0** (Android), je 5 von 5 Profilen | selbst gemessen |
| Rauchtest | **45/45** (14 Ansichten + Erstabnahme × 3 Breiten) | Leitung; Aufbau im Quelltext nachgezählt |
| Klassenraum | Stufe **A+B gebaut** (`Spiel.klassenraum`, 16 Namen, zwei Ansichten) | `docs/CHANGELOG.md` § 2.0.0 |
| Live-Server (C2) | **gebaut**, 322.560 B, ohne jede Abhängigkeit, 20/20 HTTP-Proben, `cargo test` 10/10 | `tools/klassenraum/`, `AGENTS.md` |
| QR-Encoder (D) | **gebaut** in Rust, Version 1–4, Stufe H, Rückgabe als SVG-Data-URI | `docs/entwicklung/Klassenraum/C – Rust, Live und QR.md` § 5 |

**Der ehrliche Kern:** 2.0 ist funktional weit — aber **es gibt keinen einzigen gemessenen Unterricht mit
20 Geräten**, kein Klassennetz, keine Firewall-Freigabe, keinen Browser-Test des Servers (C § 9). Alles, was
3.0 über Unterricht behauptet, muss zuerst **messbar** werden.

## 1a · Was 2.9.0 am 31.10.2026 ist (gemessen)

Die einzige Zahlenquelle ist `docs/STAND.md` — dieser Abschnitt zitiert sie nur.
Selbst nachgezählt wurden hier zusätzlich nur die **21** Git-Tags (`git tag --list`) und das
Zeilenende von `src/stil/inspektor.css` (`git ls-files --eol`: `i/lf w/lf`).

| Größe | Stand 2.9.0 | Herkunft |
|---|---|---|
| Fassung / Android-Bauzählung | **2.9.0** / `VERSION_CODE = 20901` | STAND.md |
| Tests | **1.049/1.049 grün**, **0** übersprungen, **118** Testdateien, **98** headless Module (Exit 0) | STAND.md |
| Bau-Module / `src/` | **143** Module (**98** headless) / **142** Dateien, **41.630** Zeilen | STAND.md |
| Einzeldatei | **4.080.274 B**, SHA256 `49FC…D89E`; `docs/index.html` und `Netzwerk-Labor.html` byte-gleich | STAND.md |
| Handtickets / klassenraum-adressierbar | **76** (davon **4** Projekte) / **58** — **18** nicht per Code aufrufbar | STAND.md (Ausnahme „Klassenraum-Codec") |
| Inhalte | **150** Minis · **55** Fehlerinjektoren · **52** Trainings · **37** Wiki-Seiten · **30** Fertigkeiten · **17** Abzeichen · **82** Fehlertexte · **7** Kunden · **6** Karrierestufen | STAND.md |
| Doku | **66** HTML-Seiten aus **65** Markdown-Quellen, **283** relative Verweise, **0** tot | STAND.md |
| Git-Tags | **21** (`endversion-1.0` … `v2.9.0`) | eigene Messung |

**Was seit dem 09.10.2026 dazukam** (Differenz der belegten Stände; die **linke** Zahl ist der
09.10.-Stand aus §1, die **rechte** der 31.10.-Stand aus §1a): **+316** Tests (733 → 1.049),
**+18** Handtickets (58 → 76), **+58** Minis (92 → 150), **+16** Fehlerinjektoren (39 → 55),
**+18** Trainings (34 → 52), **+8** Wiki-Seiten (29 → 37). Das ist vor allem
**Säule 2**; die Säulen 1, 3 und 5 sind davon nur teilweise berührt (Einordnung: der 3.0-Audit
`berichte/vision.md` der Vorbereitungssitzung, dort § 3.1 „Säulen-Abgleich").

**Nicht in `STAND.md` — und deshalb hier ausdrücklich nicht als Zahl behauptet:** Hilfe-Vorschläge,
Wiki-Abschnitte, Menüprobe- und Rauchtest-Zahlen. Sie werden bei Bedarf neu gemessen, nicht abgeschrieben.

## 2 · Die fünf Säulen

> **Lesehilfe:** Der Fließtext je Säule ist der **Plan vom 09.10.2026** (Ist-Stand, Messwerte,
> „Fertig, wenn"-Zahlen). Unter jeder Säule steht **Stand 2.9.0 (31.10.2026)** — was davon
> heute erledigt, offen oder anders ist. Die Aufwände bleiben Schätzungen von damals.

### Säule 1 — Unterricht mit 20 Azubis

**Ist-Stand.** Eine Lehrkraft legt eine Sitzung an, zeigt den Code groß, kopiert ihn; die Ampel zählt
eingetippte Ergebnis-Codes und zeigt den Median. Je Gerät läuft **genau eine** Sitzung — eine neue ersetzt
die alte (gesichert wird über den Export). Aufträge und Ergebnisse wandern als **Codes**, nicht über ein
Netz. Die Hilfestellung richtet sich nach dem Bildungsstand **des Azubis** (E3), nicht nach der Ansage.

**Was fehlt.**
1. **Mehrere Klassen / mehrere Sitzungen** nebeneinander: heute ersetzt die nächste Sitzung die vorige.
2. **Der Trockenlauf mit 20 ist seit dem 09.10.2026 da** (`tests/klassen-20.test.js`: 20 Geräte aus *einem*
   Code, Ampel **20/20**, 349 ms) — und er hat **drei Grenzen aufgedeckt**, die 3.0 schließen muss (Befund
   unten).
3. **Der Ablauf in der Stunde**: Wer hat welchen Platz? Wer hat noch nichts abgegeben? Das steht heute
   nirgends (die Ampel kennt nur „eingegangen").
4. **Zeit**: `dauerMin` ist geplant, aber es gibt keinen Stunden-Bezug („noch 10 Minuten").

**Aufwand: 2–3 Sitzungen.** (Sitzungsverwaltung + die drei Grenzfälle + Platz-/Abgabeübersicht.)

**Befund aus dem 20-Geräte-Lauf (09.10.2026, `tests/klassen-20.test.js`).**
* **`platz` > 31 wird still auf 31 geklemmt** — die Obergrenze je Sitzung ist hart, und niemand erfährt es.
* **Ein doppelter Platz lässt den ersten Eintrag gewinnen** — der zweite Code verschwindet **ohne Meldung**.
* **Zwei Sitzungen gleichzeitig gehen nicht:** `sitzung` ist ein **Einzelfeld** im Store; eine neue Sitzung
  ersetzt die alte, und nur **Export/Import** holt sie zurück.
Alle drei sind **Anforderungen für 3.0**, keine Kleinigkeiten: der erste Fall verfälscht still eine
Ergebnistabelle, der zweite verschluckt eine Rückmeldung, der dritte verhindert zwei Klassen am selben
Rechner.

**Risiko.** Mittel. Der Codec ist eingefroren — Sitzungsverwaltung darf das **Format** nicht ändern, nur die
Ablage. Das größere Risiko ist ein **falsches Gefühl von Sicherheit**: ein Trockenlauf mit 20 simulierten
Geräten beweist die Software, **nicht** das Klassennetz.

**Fertig, wenn (messbar):**
* `tests/klassen-20.test.js` **ist da** (20 Geräte, ein Code, Ampel **20/20**, 349 ms) — **offen**: er deckt
  auch die drei Grenzfälle ab, und der Code **klemmt nicht mehr still**, sondern **meldet** (`platz` > 31
  wird abgewiesen, ein doppelter Platz gemeldet).
* Zwei Sitzungen sind gleichzeitig ablegbar; ein Export enthält **beide**, und ein Import stellt **beide** her.
* `python tools/menueprobe.py --datei web/index.html --lauf` bleibt **45/0**, R12 `klasse` **6/6**.

**Stand 2.9.0 (31.10.2026) — selbst an Code und Test gelesen.**
* Der **Trockenlauf mit 20 ist da:** `tests/klassen-20.test.js` prüft 20 Geräte aus einem Code,
  die Ampel **20 von 20** und 20 verschiedene Plätze (`:87–131`).
* **Doppelplatz:** Der zweite Code wird inzwischen **mit Grund `platz-schon-da` abgewiesen**
  (`tests/klassen-20.test.js:150–173`) — die Formulierung „verschwindet ohne Meldung" aus dem
  09.10.-Befund ist damit überholt.
* **Still geklemmt** wird nur noch im **Codec** (`platz 32 → 31`, `tests/klassen-20.test.js:134–140`);
  die **API weist Platz 32 ab**, bevor ein Code entsteht (`:141–146`).
* **Zwei Sitzungen verdrängen sich weiterhin:** `sitzung` ist ein Einzelfeld im Store
  (`src/spiel/klassenraum.js:125`); der Test dokumentiert die Verdrängung ausdrücklich als
  Befund für 3.0 (`tests/klassen-20.test.js:176–199`). Der Vertrag für 3.0 (mehrere Sitzungen,
  eine aktive) steht in `docs/Architektur.md` § 12.1/§ 12.2 — der Code folgt in W1 (KLR-01a).
* **Platz-/Abgabeübersicht und Stundenbezug:** die Lehrkräfte-Ansicht hat Ampel und anonyme
  Fortschrittszeile (`src/ui/klassenraum.js:74–118`), aber **keine Platzliste** und **keinen
  Restzeit-Bezug** (selbst gesucht: 0 Treffer für `Platzliste`/`Restzeit` im Klassenraum-Modul);
  das bleibt 3.0 (Säule 1).

### Säule 2 — Inhalte, die nicht ausgehen

**Ist-Stand (Stand 2.9.0, 31.10.2026).** **76** Handaufträge (**58** davon klassenraum-adressierbar),
**30** Fertigkeiten, **55** Injektoren, **52** Trainingskarten, **150** Minis, **37** Wiki-Seiten —
alle Zahlen aus `docs/STAND.md`. Die Rotation sorgt dafür, dass sich Minis nicht schnell
wiederholen; der Mischer hält offene Inhalte aus dem Topf.
*(Stand 09.10.2026: die damaligen Zahlen stehen in §1.)*

**Was fehlt.** Nicht „mehr vom Gleichen", sondern **Dichte je Fertigkeit**: die dünnsten Fertigkeiten haben
wenige Minis und wenige Injektoren; ein Azubi, der zwei Stunden am selben Thema arbeitet, sieht heute
schnell alles. Ausbau je Größe, mit Ankern aus dieser Sitzung:

| Ausbau | Aufwand | Anker / Begründung |
|---|---|---|
| **Mini + Denkhilfe** (je 10) | ~0,5 Sitzung | in dieser Sitzung: **66** Denkhilfen von **zwei** Schreibern in einer Runde (25 → 91) |
| **Injektor + Trainingskarte** (je 3) | ~0,5–1 Sitzung | in dieser Sitzung: **3** Injektoren (36 → 39), davon einer erst nach einer negativen Messung (`lab.stp`) |
| **Wiki-Seite** (je 3) | ~0,5 Sitzung | in dieser Runde: **2** Seiten + IPv6/WLAN-Abschnitte in acht Seiten |
| **Handauftrag** (je 5) | ~1–2 Sitzungen | **kein Messanker** — in dieser Sitzung wurde kein Handauftrag gebaut; ein Auftrag braucht Topologie, Fehler, Lösung, Erklärung, Test |
| **Neue Fertigkeit** (je 1) | ~1–2 Sitzungen **plus** Folgekosten | die Skill-Tabelle ist für den Codec **eingefroren** (nur anhängen); mehrere Testzeilen prüfen die Zahl 27 (Stichprobe: 11 Zeilen im Umfeld von `skills` und `27`), dazu Wiki-Seite, Minis, Injektor, Trainingskarte |

**Aufwand gesamt: 4–7 Sitzungen** für einen spürbaren Ausbau (z. B. +10 Handaufträge, +6 Injektoren,
+20 Minis samt Denkhilfen, +6 Wiki-Seiten, **keine** neue Fertigkeit).

**Risiko.** Gering technisch, **hoch fachlich**: erfundene Fehlerbilder, die es in der Prüfung nicht gibt,
schaden mehr als sie nützen. Jeder neue Injektor muss den Fehler **wirklich** ins Netz bringen, und jede
neue Karte muss ohne Lösungstext auskommen (Wächter `miniOhneLoesung`).

**Fertig, wenn (messbar):** jede Fertigkeit hat **mindestens** 3 Minis, **mindestens** 1 Injektor und eine
Wiki-Seite mit **≥ 4** Abschnitten; ein Test zählt das je Fertigkeit auf (`tests/inhaltsdichte.test.js`);
`tests/tickets-generator.test.js` fährt weiter jeden Injektor × Vorlage × 8 Seeds; Testlauf bleibt grün.

**Stand 2.9.0 (31.10.2026) — selbst an Test und STAND.md geprüft.**
* Der Ausbau ist **geliefert:** die Differenz der belegten Stände (§1 → §1a) sind **+18**
  Handtickets, **+58** Minis, **+16** Fehlerinjektoren, **+18** Trainings und **+8** Wiki-Seiten.
* Das Dichte-Gate prüft je Fertigkeit **acht Zeilen** mit harter Grenze Wiki **≥ 3** Abschnitte,
  Minis **≥ 3**, Training **≥ 1** (zwei benannte Ausnahmen), Handticket, Hilfe, Senior und
  Prüfung (`tests/inhaltsdichte.test.js:107–126`); **Wiki ≥ 4** wird nur protokolliert
  (`:153–154`) und **ein Injektor je Fertigkeit** ist gar keine Zeile der Matrix — beides ist
  damit noch **nicht** harte Zusage.
* Die Codec-Schere wächst mit: **18** der **76** Handtickets sind nicht klassenraum-adressierbar
  (`docs/STAND.md`, Ausnahme „Klassenraum-Codec"; Vertrag: `docs/Architektur.md` § 12.8,
  Formatwechsel erst **3.1**).

### Säule 3 — Stufe C und D: ehrlich eingeordnet

**Ist-Stand (Stand 09.10.2026).** Der **Server (C2)** ist fertig gebaut: eigenständiges Rust-Binary
(damals **322.560 B**, §1), **ohne jede Abhängigkeit**, zwei Endpunkte (`GET /liste`, `POST /ergebnis`),
Portvorgabe **47112** (Bereich 47112–47121), Bind **0.0.0.0**, CORS `*` mit Preflight und
`Allow-Private-Network`, Datensparsamkeit **erzwungen** (der Server transportiert nur Codes, deutet
nichts). **In der `.exe` (C1) ist er nicht** — dort fehlen drei Änderungen in `main.rs` und eine neue
Datei; `shell/` wurde bewusst nicht angefasst.

**Was er wirklich bringt.** Die Lehrkraft muss 20 Ergebnis-Codes **nicht mehr abtippen**; die Ampel füllt
sich beim Abgeben. Das ist der einzige echte Gewinn — und er wird erst ab etwa **15–20** Azubis größer als
der Aufwand des Abtippens (die Block-Eingabe schafft heute viele Codes in einem Zug).

**Was er kostet.**
* **Ein Prozess mehr** (Start, Stopp, Absturz, Neustart) und **ein Port**, der belegt sein kann
  (C § 8.5: dann weicht der Server aus, und die Oberfläche **muss** die echte Portnummer zeigen).
* **Eine Firewall-Freigabe** — der Windows-Dialog ist im Bestand **nie gesehen** worden (C § 8.1).
* **Datenschutz:** übertragen werden nur Sitzung, Platz, halbe Sterne, Fehlversuche und Dauer — **kein
  Name, keine Kennung**. Das ist die gute Nachricht; die schlechte ist: ein Gerät im Klassennetz, das
  mitschreibt, sieht diese Codes. Die Datensparsamkeit ist erzwungen, nicht erbeten (C § 3.7).
* **Wartung:** zwei Umsetzungen (C1 in der `.exe`, C2 als Binary), zwei Lager, die **nicht** zusammengeführt
  werden; kein Keep-Alive (C § 8.9).
* **Nur Desktop:** Browser- und Android-Fassung können weder Server noch QR (C § 4.6, § 5.6).

**QR (D)** ist billiger: der Encoder ist **als Probe** gebaut und getestet (Rust
`tools/klassenraum-probe/C-qr-rust/`, dazu Python-Vergleichsproben unter `C-qr-python/`).
Es fehlt die Einbettung in die Lehrkräfte-Ansicht (Knopf, Größe für den Beamer, Ruhezone) —
**0,5–1 Sitzung (Schätzung 09.10.2026)**. Der 3.0-Vertrag ordnet Server und QR inzwischen **3.1** zu
(`docs/Architektur.md` § 12.6/§ 12.7).

**Aufwand: 2–4 Sitzungen** (C1 in der `.exe` 1–2 · QR-Oberfläche 0,5–1 · Messungen: Firewall, Browser,
echtes Klassennetz 1).

**Wann er sich lohnt — und wann nicht.**

| Lohnt sich | Lohnt sich **nicht** |
|---|---|
| ≥ 15 Azubis, die Ergebnisse abgeben | kleine Gruppen (≤ 10): Abtippen ist schneller als Aufbau und Freigabe |
| ein Raum mit **einem** gemeinsamen WLAN ohne Client-Isolation | Gäste-WLAN mit Client-Isolation oder strenge Firewall (dann trägt der Code-Weg) |
| wenn die Lehrkraft live sehen soll, wer fertig ist | wenn nur **ein** Gerät je Azubi ohne Netz läuft (Tablet/Android: kein Server) |
| wenn die Klasse den Code per **Beamer/QR** bekommt | wenn ein gedruckter Code reicht |

**Risiko.** Hoch für C1 (Eingriff in die Hülle, Firewall, Port, echte Netze — alles im Bestand **nicht**
gemessen), niedrig für D (reine Rechnung, bereits differenzgetestet). Der klassische Fehler wäre, den Server
**standardmäßig einzuschalten** — der Bestand entscheidet ausdrücklich: **Standard aus** (C § 4.5).

**Fertig, wenn (messbar):** zwei **getrennte** Rechner im selben WLAN — A startet den Server, B öffnet den
Auftrag; A sieht B **ohne Zutun** in der Ampel; die Oberfläche zeigt die tatsächliche Portnummer; „Server
aus" lässt A und B unverändert weiterarbeiten; `cargo test` 10/10 und die 20 HTTP-Proben bleiben grün.

**Stand 2.9.0 (31.10.2026) — selbst im Repo geprüft.**
* **C2** liegt weiterhin als eigenes Cargo-Projekt vor (`tools/klassenraum/`); das gebaute Binary ist
  nicht versioniert, lag aber am 31.10.2026 unter `tools/klassenraum/target/release/klassenraum.exe`
  (**322.560 B**, selbst gemessen — dieselbe Größe wie §1).
* **C1 fehlt:** `shell/src-tauri/src/` enthält `main.rs`, `fenster.rs`, `speicher.rs`, `tray.rs` —
  **kein** Server-Modul (selbst gesehen). Der Vertrag sagt es ausdrücklich: § 12.6 ist **3.1**.
* **QR ist nicht im Produkt:** `src/` enthält **keinen** QR-Encoder (selbst gesucht; der einzige
  Encoder ist die Probe `tools/klassenraum-probe/C-qr-rust/`). § 12.7 ist **3.1**.
* Der Schalter „Klassenraum-Server" in den Einstellungen ist im 2.9.0-Stand **wirkungslos**: der Wert
  `einst.klassenraumServer` wird nur von der Schalter-Zeile selbst gelesen (`src/ui/klassenraum.js:479–499`,
  selbst gesucht: nur 2 Treffer in `src/`). VIS-04 entscheidet in 3.0, ob der Schalter entfernt oder
  ehrlich umtextet wird.

### Säule 4 — Technische Schulden, die 3.0 erben würde

**Ist-Stand am 09.10.2026 (gemessen).** `tests/stil-stand.json` fror damals ein: **R1 22 · R2 113 ·
R3 195 · R4 514** (Farb-Literale, Radien, Schrift- und Abstandswerte außerhalb der Skalen) —
R5–R12 standen auf **0**. Dokumentiert war außerdem **ein R8-Verlust**: zwei Selektoren (`.ger[class*="jc-"] .gb`,
`.kabel[class*="jc-"] *`) haben im ganzen `src/stil/` **keine Regel** mehr, obwohl `UI.juice` sie anspricht
— die Animationen laufen für „Bewegung reduzieren" jetzt in 1 ms statt gar nicht; sichtbar ist das
**nicht gemessen**. Dazu: **`inspektor.css` ist für git binär** (`i/-text w/-text`, 149 CRLF-Zeilen) — eine
Zeilenenden-Umstellung wäre im `git diff` **unsichtbar**. Und `.kl-lehrer`/`.kl-schueler` haben beim
Zusammenschluss eine `overflow`-Eigenschaft verloren (außerhalb der 14 Dateien dieser Runde, nicht geprüft,
ob gewollt).

**Was davon muss vor 3.0 weg?**

| Schuld | Muss weg? | Aufwand |
|---|---|---|
| `inspektor.css` binär für git | **Ja, zwingend** — unsichtbare Diffs sind eine Falle für jede künftige Zeilenenden-Prüfung | 0,25–0,5 Sitzung |
| R8-Verlust | **Ja** — entweder Regel wiederherstellen oder „1 ms ist gewollt" belegen, **mit** Browser-Messung | 0,5 Sitzung |
| `.kl-lehrer`/`.kl-schueler` `overflow` | Prüfen, ob gewollt; wenn nicht: eine Zeile | 0,25 Sitzung |
| R1–R4 (844 Deklarationen) | **Nicht zwingend.** Sie sind eingefroren, nicht kaputt. Aber: eine **Ratsche** einführen (kein neuer Verstoß, jeder berührte Block wandert auf Tokens) | 0,5 Sitzung Regel + 1–2 Sitzungen Abtragung |
| R12 ohne `--dom` | **Ja** — heute steht „NICHT GEMESSEN" im grünen Lauf; ein Messweg gehört in den Prüflauf | 0,5 Sitzung |

**Aufwand: 1,5–3 Sitzungen**, davon **0,5–1 unverzichtbar** (die drei „Ja, zwingend"-Zeilen).

**Risiko.** Gering — aber der **R8-Fall zeigt die eigentliche Gefahr**: eine Altlast „verschwindet", indem
man sie löscht, und der Zähler wird grün. Deshalb: jede Aufräumrunde braucht eine **Gegenprobe**, die
prüft, dass nichts Wirkung verloren hat (die Output-Runde hat sieben solcher Proben gefahren).

**Fertig, wenn (messbar):** `git ls-files --eol src/stil/inspektor.css` meldet `i/lf w/lf` (Text, nicht
binär) · der R8-Fall hat eine Regel und einen Test, der sie prüft · `ethos.py` meldet R1–R4 **unter** dem
heutigen Stand und die neuen Werte stehen in `stil-stand.json` · `ethos.py --dom` läuft im Prüflauf und
liefert eine Zahl statt „NICHT GEMESSEN".

**Stand 2.9.0 (31.10.2026) — selbst gemessen.**
* **`inspektor.css` ist Text, nicht binär:** `git ls-files --eol src/stil/inspektor.css` meldet
  `i/lf w/lf` — die Falle für Zeilenenden-Prüfungen ist **weg**.
* **Der R8-Verlust ist behoben:** die zwei Selektoren haben wieder Regeln (`src/stil/juice.css:9–28`),
  und ein Test hält sie fest (`tests/ui-bewegung-aus.test.js:130`).
* **Die Messlatte wurde neu eingefroren:** `tests/stil-stand.json` (selbst gelesen am 31.10.2026)
  nennt jetzt R1 **24** · R2 **20** · R3 **4** · R4 **169** · R6 **7** · R9 **62** · R10 **42**;
  R5 · R7 · R8 · R11 · R12 = 0. Die Zahlen sind **nicht 1:1** mit dem 09.10.-Stand vergleichbar
  (die Regeln wurden seither umgestellt); den laufenden Ist-Stand misst `python tools/ethos.py` —
  hier wird er nicht abgeschrieben.
* **R12 bleibt ungemessen:** der 2.9.0-Abschnitt im CHANGELOG nennt `--dom` ausdrücklich als
  „nicht gemessen" (`docs/CHANGELOG.md`, Abschnitt 2.9.0). Der Messweg ist weiter offen.
* `.kl-lehrer`/`.kl-schueler` `overflow`: **nicht geprüft** (unverändert offen).

### Säule 5 — Diagnose ohne Bewertung („wer hängt wo")

**Ist-Stand.** Der Nutzer hat entschieden: **Lehreraufträge werden nicht bewertet** — keine Note, keine
Punkte, keine Rangfolge, kein Vergleich zwischen Azubis. Die Lehrkräfte-Ansicht zeigt heute die **Ampel**
(Eingegangenes je Platz, Median) — sonst nichts. Die E5-Entscheidung sagt ausdrücklich: die Lehrkraft sieht
**nicht**, wie viel Hilfe nötig war. Der Azubi hat die Führung „nächster Schritt", die offenen Arbeitsziele
und den Plan-Abgleich — **lokal**.

**Was fehlt.** Die Frage der Lehrkraft im Unterricht lautet nicht „wie gut ist einer?", sondern **„wo steht
die Klasse?"** — welcher Schritt hängt bei vielen. Diese Information existiert heute **nirgends**:
Ergebnis-Codes tragen Sitzung, Platz, Sterne, Versuche, Dauer — **nicht** das offene Ziel.

**Zwei Wege, ehrlich benannt:**

| Weg | Wie | Aufwand | Preis |
|---|---|---|---|
| **A · ohne Server** | Der Azubi drückt „Ich hänge" → die Ansicht erzeugt einen kurzen **Status-Code** (Sitzung, Platz, Schritt); die Lehrkraft tippt die Codes wie Ergebnis-Codes ein | 1–2 Sitzungen | funktioniert offline und auf Android; kostet Abtippen je Meldung |
| **B · mit Server (Säule 3)** | Der Server nimmt je Meldung ein **Ziel** entgegen und liefert der Lehrkraft ein Histogramm | 1–2 Sitzungen **auf** Säule 3 | nur Desktop; erweitert die übertragene Datenform (Datenschutz prüfen) |

**Wie die Anzeige aussehen muss** (damit sie nicht zur Bewertung wird): **nur Zahlen je Schritt**, z. B.
„Schritt 3 · 7 von 20 offen" — **kein** Name, **kein** Platz in der Rangfolge, **keine** Sterne, **keine**
Zeit pro Person, **kein** Vergleich zwischen Azubis. Platz-Nummern dürfen nur dort stehen, wo sie zur
Zuordnung im Raum nötig sind (die Ampel nutzt sie heute schon).

**Risiko.** **Das höchste im ganzen Konzept** — nicht technisch, sondern in der Wirkung: Sobald eine
Lehrkraft sieht, *wer* hängt, ist die Bewertung nur noch ein kleiner Schritt. Die Nutzerentscheidung ist
eindeutig; ein Test muss sie schützen, nicht eine Vereinbarung.

**Fertig, wenn (messbar):** die Lehrkräfte-Ansicht zeigt für jedes offene Ziel des laufenden Auftrags eine
**anonyme Zahl** und sonst nichts; ein Test prüft, dass **kein** personenbezogenes Feld (Name, Kennung,
Rang, Punktzahl) im DOM der Ansicht vorkommt (`tests/klassen-diagnose.test.js`, mit Gegenprobe: ein
eingeschmuggeltes Namensfeld macht den Test rot).

**Stand 2.9.0 (31.10.2026) — selbst im Code geprüft.**
* **H-Code und „Ich hänge" sind gebaut:** der Hilfecode (Architektur § 12.5) wird erkannt, bevor er in
  den Ergebnissatz läuft (`src/ui/klassenraum.js:55–61, 235–245`), und der Knopf „Ich hänge" erzeugt
  und kopiert ihn (`:398–413`); die Lehrkraft tippt ihn in ihr bestehendes Code-Feld.
* **Die anonyme Fortschrittszeile ist gebaut:** „offen / in den letzten 5 Minuten / letzte Abgabe"
  ausschließlich als Zahlen, ohne Namen, Rang oder Sterne je Person (`src/ui/klassenraum.js:66–118`).
* **Das Ziel-Histogramm fehlt weiterhin:** die Zeile zählt Abgaben und offene Plätze, nicht
  „Schritt 3 · 7 von 20 offen"; ein `tests/klassen-diagnose.test.js` gibt es **nicht** (selbst geprüft).
  Die Zusage aus „Fertig, wenn" ist damit offen.

## 3 · Aufwand in einer Tabelle

> **Schätzungen Stand 09.10.2026** — keine Messungen. Sie bleiben als Planungsgrundlage stehen;
> die Ist-Seite steht in §1a.

| Säule | Aufwand (Sitzungen) | davon unverzichtbar |
|---|---|---|
| 4 · Technische Schulden | **1,5–3** | 0,5–1 (inspektor.css, R8-Fall, R12-Messweg) |
| 2 · Inhalte | **4–7** | 2 (Injektoren + Minis für die dünnsten Fertigkeiten) |
| 1 · Unterricht mit 20 | **2–3** | 1 (Trockenlauf-Test mit 20) |
| 5 · Diagnose ohne Bewertung | **1,5–3** | 1 (Weg A, ohne Server) |
| 3 · Stufe C/D | **2–4** | 0,5–1 (QR-Oberfläche) — C1 nur, wenn die Bedingungen passen |
| **Summe** | **11–20** | **4,5–6,5** |

**Anker der Schätzung.** Die drei Runden dieser Sitzung (Fundament, Klassenraum A+B, Output-Runde) liefen
**je in rund einer Stunde Wanduhr** mit 7–15 parallelen Schreibern (gemessen an den Dateizeiten). Eine
„Sitzung" in diesem Konzept ist ein **Arbeitstag** mit Abnahme, Messung und Stand-Nachzug — deshalb sind die
kleinen Säulen mit dem Tempo dieser Sitzung an **einem** Tag zu schaffen, mit Sorgfalt und echten Messungen
aber nicht. Der größte Unsicherheitsfaktor ist Säule 2 (Handaufträge haben **keinen** Messanker).

## 4 · Reihenfolge (Vorschlag, Stand 09.10.2026)

1. **Schulden zuerst** (1,5–3 Sitzungen): billig, senkt das Risiko jeder späteren Runde, und
   `inspektor.css` ist eine Falle, die schon heute jede Zeilenenden-Prüfung täuscht.
   *Stand 2.9.0: `inspektor.css` ist Text, der R8-Fall hat Regel und Test — **offen** bleibt der
   R12-Messweg (Säule 4).*
2. **Trockenlauf mit 20** (1 Sitzung): bevor irgendwer von „20 Azubis" redet, muss die Software das
   können — als Test, nicht als Behauptung.
   *Stand 2.9.0: Test ist da; Doppelplatz und API-Grenze sind eingegrenzt, die Sitzungsverwaltung
   bleibt offen (Säule 1).*
3. **Inhalte** (4–7 Sitzungen): der größte Hebel für den Unterricht; hier entscheidet sich, ob das Labor
   nach zwei Stunden noch etwas zu bieten hat.
   *Stand 2.9.0: teilweise geliefert; die Dichte-Zusage je Fertigkeit (Wiki ≥ 4, ≥ 1 Injektor) ist
   noch nicht hart geprüft (Säule 2).*
4. **Diagnose Weg A** (1–2 Sitzungen): der Nutzen im Unterricht ist größer als der des Servers.
   *Stand 2.9.0: H-Code und anonyme Fortschrittszeile sind gebaut; Ziel-Histogramm und DoD-Test
   fehlen (Säule 5).*
5. **Stufe C/D** (2–4 Sitzungen): erst wenn ein Raum mit ≥ 15 Geräten und ein gemessenes Klassennetz
   vorhanden sind. Vorher lohnt nur **QR** (0,5–1 Sitzung) — es macht den Code sichtbar, ohne Prozess,
   Port oder Firewall.
   *Stand 2.9.0/3.0-Vertrag: C2 ist als Binary gebaut, aber nicht im Produkt; QR nur als Probe.
   Der 3.0-Vertrag führt Server und QR als **3.1** (`docs/Architektur.md` § 12.6/§ 12.7).*
6. **Danach**: Fassung ziehen (3.0.0), Erzeugnisse, Veröffentlichung — nach dem Protokoll in
   [`SITZUNGSABSCHLUSS.md`](../SITZUNGSABSCHLUSS.md).

## 5 · Was ausdrücklich NICHT in 3.0 gehört

> **Gilt unverändert (Stand 2.9.0).** Der 3.0-Vertrag bestätigt die Liste; der Klassenraum-Kern
> („keine Bewertung") steht ausdrücklich in `docs/Architektur.md` § 12.

* **Keine Bewertung.** Keine Noten, Punkte, Rangfolgen, Bestenlisten, Vergleiche zwischen Azubis — nicht
  einmal „freiwillig". Die Entscheidung des Nutzers vom 09.10.2026 steht.
* **Keine Konten, keine Cloud, keine zentrale Ablage.** Das Labor ist offline und kontofrei; der Lernstand
  bleibt auf dem Gerät des Menschen. Der Server transportiert **nur Codes**, nie Identität.
* **Kein Sprachmodell im Hauptweg.** Der Entwurf „Tutor auf Sprachmodell" nennt Bedingungen (Offline-Bruch,
  Datenschutz, Prüfkette gegen das Lösungsverbot) — das ist ein eigenes Projekt, kein Fundament.
* **Keine Massen neuer Fertigkeiten.** Die Tabelle ist für den Codec eingefroren; jede neue Fertigkeit
  zieht Wiki, Minis, Injektor, Trainingskarte und Testzeilen nach. Höchstens **eine**, bewusst gewählt.
* **Kein Umbau der Werkzeuge.** Kein npm, kein Framework, keine neuen Kisten (die Hausregel „Node portabel,
  keine Software installieren" gilt).
* **Kein Umbau der Dokumente.** Befunde, Reviews und datierte Protokolle bleiben, wie sie sind — nur
  „Stand:"-Angaben wandern.
* **Keine Dauerlast-Features.** Kein Keep-Alive, keine Cluster, keine Live-Synchronisation mehrerer
  Lehrkräfte. Für 20 Azubis reicht eine Anfrage je Verbindung (gemessen bis 24 gleichzeitige Anfragen,
  C § 9).
* **Nichts, was nur auf einer Plattform geht, ohne dass die anderen es merken.** Der Server ist Desktop;
  Browser und Android müssen **ohne** ihn vollständig funktionieren (heute tun sie das).

## 6 · Was ich nicht beurteilen konnte

* **Ob 20 Geräte im selben Schul-WLAN zusammenkommen** — kein Klassennetz gemessen, keine
  Client-Isolation geprüft (C § 9). Das ist die Kernannahme von Säule 3 und **nicht** belegt.
* **Ob Windows die Firewall-Freigabe zeigt und wie der Dialog aussieht** — nie gesehen (C § 8.1).
* **Ob Browser Anfragen aus `file://` oder von GitHub Pages durchlassen** (Private Network Access) —
  nicht gemessen (C § 8.3).
* **Ob eine echte Klasse mit dem Labor arbeitet** — keine Unterrichtsstunde, kein Mensch, kein
  Bildschirmfoto eines Unterrichts.
* **Der Aufwand für Handaufträge** — in dieser Sitzung wurde **keiner** gebaut; die Schätzung ist eine
  Analogie aus drei Injektoren und zwei Wiki-Seiten, keine Messung.
* **Ob die R1–R4-Ratsche den Code auf Dauer verbessert oder nur bremst** — eine Annahme, kein Messwert.
* **Ob „wer hängt wo" didaktisch hilft** — die Anzeige ist messbar (Test), ihr Nutzen im Unterricht nicht.

**Stand 2.9.0 (31.10.2026):** Keine dieser Grenzen ist seither gemessen. Neu dazugekommen sind nur
der gebaute C2-Server (Säule 3) und der H-Code samt anonymer Fortschrittszeile (Säule 5) — ein
Klassennetz, eine Firewall-Freigabe, ein Browser-Test des Servers und eine echte Unterrichtsstunde
bleiben **nicht geprüft**.

## 7 · Belege

* **Zahlen Stand 2.9.0:** `docs/STAND.md` — die einzige Zahlenquelle; §1a zitiert sie.
  Am 31.10.2026 selbst nachgezählt: **21** Git-Tags (`git tag --list`) und `i/lf w/lf` für
  `src/stil/inspektor.css` (`git ls-files --eol`).
* **Zahlen Stand 09.10.2026 (2.0):** [`Übergabe – Stand 2.0-Fundament.md`](<Übergabe – Stand 2.0-Fundament.md>),
  [`CHANGELOG.md`](../CHANGELOG.md) (drei Abschnitte zu 2.0.0), [`INHALT.md`](../INHALT.md).
* Verträge: [`Architektur.md`](../Architektur.md) § 12 (Klassenraum) mit **§ 12.1 Datenform**,
  **§ 12.2 API**, **§ 12.3 Fehlerformen**, **§ 12.4 Netzkennwert**, **§ 12.5 Hilfecode** und
  **§ 12.8 Grenzen**; die Leitungsentscheidungen E1 und L1–L7 stehen im einleitenden Text von § 12
  und in der Abgrenzung am Ende. **Server (§ 12.6) und QR (§ 12.7) sind 3.1** und im Produkt nicht
  gebaut.
* Stufe C/D: [`Klassenraum/C – Rust, Live und QR.md`](<Klassenraum/C – Rust, Live und QR.md>) § 0 (Kurzfassung),
  § 3.7 (Datensparsamkeit), § 4.5 (Standard aus), § 8 (offene Punkte), § 9 (nicht geprüft).
* Altlasten: [`Befund – Output-Runde.md`](<Befund – Output-Runde.md>) § 1–§ 3, § 11–§ 13;
  `tests/stil-stand.json` (eingefrorener Stand).
* **Entscheidung des Nutzers (keine Bewertung):** [`Architektur.md`](../Architektur.md) § 12 — die
  Tabelle im Kern sagt „Bewertung: **keine** — ausdrücklich Nutzerentscheidung 09.10.2026"; § 12.8
  begrenzt die Auswertung ausdrücklich auf die Ampel („keine Auswertung über die Ampel hinaus").
