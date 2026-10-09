---
tags: [FISI, Lernspiel, Netzwerk, Fahrplan, Entscheidung]
erstellt: 2026-10-09
status: Entscheidungsvorlage — fünf unabhängige Expertenentwürfe zusammengeführt; **nichts davon ist gebaut**
---

# Fahrplan 1.3 / 2.0 — was zu entscheiden ist

> **Was diese Datei ist.** Am 09.10.2026 haben **fünf unabhängige Prüfer** je einen Entwurf geschrieben
> (zusammen 1 454 Zeilen, alle unter [`docs/entwicklung/Entwurf – *.md`](.)). Diese Datei führt sie
> zusammen: was gemessen ist, wo sie sich widersprechen, was **nichts** von ihnen abdeckt, und was ich
> als Nächstes bauen würde. **Gebaut ist nichts davon** — Stand bleibt Fassung 1.2.4, 461 Tests grün.
>
> **Die Einzelentwürfe** (jeder mit eigenen Belegen, Messungen und „nicht geprüft"-Abschnitten):
> · [Klassenraum-Umsetzung](<Entwurf – Klassenraum-Umsetzung.md>) · [Tutor auf Sprachmodell](<Entwurf – Tutor auf Sprachmodell.md>)
> · [Mitnehmbarer Lernstand](<Entwurf – Mitnehmbarer Lernstand.md>) · [Inhaltslücken](<Entwurf – Inhaltslücken.md>)
> · [Gegenprüfung und Lehrersicht](<Entwurf – Gegenprüfung und Lehrersicht.md>)

## 1 · Das Kurzurteil

**Die richtige nächste Fassung ist nicht der Klassenraum-Server und nicht der Tutor.** Es ist die
**Übergabe**: ein Rechner, viele Azubis. Ein Übergabeknopf („Neuer Azubi an diesem Rechner") und ein
„Ergebnis kopieren" im Abschluss-Fenster. Ein halber Tag Arbeit, kein Server, kein Netz, keine
Datenschutzfrage — und die **Voraussetzung für jeden** größeren Schritt.

Der Grund ist unbequem einfach: **ohne Übergabe ist das Spiel in der zweiten Unterrichtsstunde
unbrauchbar.** `src/ui/spiel.js:857` lädt beim Start den offenen Auftrag des Vorgängers; `Spiel.neu()`
existiert (`zustand.js:174`), ruft aber keine Oberfläche auf. Der zweite Azubi am selben Rechner steckt
im Auftrag des ersten — und niemand kann das im Spiel beheben.

## 2 · Was die fünf Prüfer gefunden haben (jeder Fund mit Beleg)

### Zwei Fehler, die heute im Code stehen

**2.1 Ein Lernstand wird still weggeworfen — auch bei der eigenen Fassung.**
`fremd/lernmotor.js:39` liest:
```js
let st = (() => { const s = store.get("lern", null); return s && s.v === 1 ? s : leer(); })();
```
`s.v === 1` ist streng und **ohne Migration**. Der Spielstand macht es richtig (`zustand.js:46` hebt an,
`:126-134` lehnt mit Satz ab); der Lernmotor **wirft weg**. Wer je eine Fassung 2.0 baut, die den
Lernstand anfasst, löscht den Fortschritt jedes Azubis — lautlos.

**2.2 Und er hält ihn im Verschluss.** `:40` `const save = () => store.set("lern", st)`. Wer einen
importierten Lernstand **nach** dem Start in den Speicher legt, verliert ihn beim nächsten `save()` —
der Motor schreibt sein altes Objekt zurück. **Diese Abhängigkeit stand in keinem der vier Entwürfe**;
die Gegenprüfung hat sie gefunden.

### Ein Fehler, der erst im Klassenzimmer auftritt

**2.3 Ein Klassenraum-Auftrag verfälscht die Karriere.** Für `quelle:"pruefung"` und `"raetsel"` gibt es
**elf** Filterstellen (`woche.js:10,12,16` · `abzeichen.js:13` · `formen.js:43` · `erstestunde.js:26` ·
`tag.js:45` · `hub.js:54` · `verdacht.js:20` · `karriere.js:103` · `postfach.js:79` · `ui/spiel.js:69,475`).
`abnahme.js:118` leitet **nur** `training` um. Für einen Klassenraum-Auftrag filtert **nichts** —
`kundenakte.js:54` zählt sogar ganz ohne Quellfilter.

**Gemessen an einem Lauf** (`salon-01`, Seed 7, ohne Hilfe, Bildungsstand E):
**+33 € · +1 Ruf · `erledigt`-Eintrag · Wochenziel „ohne Hilfe" erfüllt · Kundensterne `[] → [5]` · Kundenampel „grün"**.
Zwanzig Azubis mit demselben Code = eine Woche Karriere gratis. Die Lösung ist **symmetrisch zum
Trainingsweg** — eine Zeile neben `abnahme.js:118`; der Klassenraum-Zweig muss `Spiel.lernenNachAbnahme`
dann selbst rufen, wie `Spiel.training.abnehmen` es tut (`training.js:230`), damit der Lernwert bleibt.
**Ohne diese Zeile darf der Klassenraum nicht in eine Klasse.**

### Ein Fehler, den die Spezifikation selbst nicht kennt

**2.4 Derselbe Code ergibt je Gerät einen anderen Auftrag.** `postfach.js:79` baut den Flow nur ohne
`ohneFlow`. Gemessen: derselbe Code (`lab.vlan`, Seed 5) ergibt je lokalem Flow-Stand
`gen-lab.vlan-5` (2 Ziele) / `-geruest` (1 Ziel) / `-verwicklung`. Der Azubi bekäme einen anderen
Auftrag als seine Nachbarin.
**Und schärfer als zunächst gedacht:** Geräte und Kabelliste bleiben in allen drei Fällen **gleich** —
der **Netzkennwert** (§ 2.7, der „Klassenraum-Abdruck") würde die Abweichung **nicht bemerken**. Es
braucht darum einen `def.id`-Vergleich im Testplan (neuer Fall Nr. 41).

### Eine stille Falle bei der Hilfe

**2.5 Der Hilfevorrat ist für ein Klassenraum-Ticket still immer „azubi-6".** Gemessen:
`Spiel.stufe.konto(inst)` = `{frei:6, gesamt:6}` — auch wenn der Mensch auf „meister" steht
(`stufensystem.js:95`, `alsTicketId` fällt auf `EINST_STANDARD` zurück). Sechs Sprossen landen alle auf
`def.skills[0]`, `Spiel.hilfeAbzuege` bleibt leer. Die Ticket-Stufe muss ausdrücklich gesetzt werden —
sonst ist **derselbe Code je Gerät verschieden teuer**.

### Was im Stoff fehlt (gemessen, nicht geschätzt)

| Lücke | Zahl | Wirkung |
|---|---|---|
| **Denkhilfen** | **67 von 92** Minis ohne eigenen Anstoß, verteilt auf **26 Fertigkeiten**; nur `lab.ping` ist vollständig (6/6), `lab.gateway` hat **0** bei 5 Minis | greift in **jeder** Sitzung; ~3 Sitzungen |
| **Hilfe-Vorschläge** | **10 von 27** Fertigkeiten haben **keinen**; **Ebene 2 existiert 0×** (die Leiter springt von „ansehen" direkt zu „ändern"); Firewall hat **1** | greift bei jedem Fehler; 2–3 Sitzungen |
| **Lehrtexte** | **9 von 27** Fertigkeiten ohne | Nachschlagen erklärt den Fehler nicht |
| **Drei gesperrte Trainingskarten** | `lab.portsec`, `lab.stp`, `lab.storage` haben **keinen Injektor** | sichtbarer Defekt: anklickbar, geht nie auf |
| **IPv6** | **0 Treffer** im ganzen Quelltext | ganzes Prüfungsgebiet fehlt |
| **WLAN/Access Point** | nur Erzähltext (30 Treffer, alle Geschichte/Beratung) | ganzes Prüfungsgebiet fehlt |
| **Virtualisierung** | **ein Halbsatz** | Prüfungsthema fehlt |
| **Dünnste Fertigkeit** | `lab.storage` — 2 Wiki-Abschnitte, 0 Lehrtexte, 1 Mini, 0 Denkhilfen, 0 Vorschläge, Training **gesperrt** | und die vier dünnsten sind **alle AP2** |

### Und die Kosten, ehrlich nach oben korrigiert

Die Spezifikation veranschlagte den Klassenraum mit **4,5–5,5 Sitzungen**. Nach der Prüfung sind es
**8–11,5** — Stufe A allein „≈ 1" veranschlagt, gebraucht **2–3**; dazu zwei Sitzungen, die in **keiner**
Liste der Spezifikation stehen (Nachziehen E, Übergabe/Fassung F). Und der Encoder ist mit
„0,5 Sitzung" **um Faktor 2–3** zu klein geschätzt (die Proben im Repo: 1 318 und 1 977 Zeilen).

## 3 · Wo die Entwürfe sich widersprechen

* **Zwei Codes — Doppelarbeit?** **Nein.** Der Vorführ-Code `E-XXXX-XXX` (25 Bit, für den Beamer) und ein
  Lernstand-Code `L-…` sind sauber getrennt: die 25 Bit fassen nur **2–4** Fertigkeiten, nicht 27. Ein
  gemeinsamer Code wäre 56 Zeichen lang und damit für den Vorführzweck unbrauchbar. Empfehlung: **ein
  Codec, zwei Nutzlasten** — Alphabet, Prüfsumme und die eingefrorene Fertigkeitstabelle werden geteilt.
  **Die Naht**, die vor Stufe A in die Spezifikation gehört: `ergebnisEintragen(code)` ist für **einen**
  Code gebaut, der Lernstand-Entwurf braucht **zwei** Felder je Platz.
* **Der Tutor gehört hinten angestellt.** Sein Hauptbeleg sind die **67 Fälle, in denen die Tabelle
  versagt**. Stehen die 67 Texte, verliert er seinen Beleg — und die Prüfer haben gezeigt, dass er
  **denselben** Mangel behebt, den die Denkhilfen schon adressieren.
* **Reihenfolge klar:** erst Inhaltslücken (Punkte 0–3, ~7 Sitzungen, kein Vertragsrisiko), dann
  Klassenraum (8–11,5). Zusammen 15–18,5 Sitzungen — nicht in eine Woche.

## 4 · Was in keinem Entwurf stand (und jetzt drin ist)

1. **Die Lernmotor-Falle** (§ 2.2) — gefunden von der Gegenprüfung.
2. **Die Übergabe an den nächsten Azubi** (§ 1) — der Kernbefund der Lehrersicht, gegen alle vier geprüft.
3. **Die Differenzierung fehlt.** Das [Konzept – Lernplattform](../entwicklung/Konzept%20–%20Lernplattform%20für%20Betriebe%20und%20Schulen.md)
   nennt sie (§ 108, 261), die Spezifikation kennt nur **eine** Sitzung für alle: 20 Azubis, alle
   derselbe Auftrag. Für starke und schwache Azubis im selben Raum ist das zu wenig.
4. **Drei Entwürfe nannten drei Testzahlen** (434 / 395 / keine) — heute sind es **461**. Eine Messung
   vor dem Bau; im Projekt ist schon mehrfach gegen veraltete Zahlen gebaut worden.

## 5 · Was ich als Nächstes bauen würde — in dieser Reihenfolge

| | Schritt | Aufwand | Warum zuerst |
|---|---|---|---|
| **0** | **Übergabe + Ergebnis zurückgeben** („Neuer Azubi", „Ergebnis kopieren") | **0,5–1 Sitzung** | Ohne das ist das Spiel ab der zweiten Stunde unbenutzbar; kein Server, kein Netz, keine Datenschutzfrage. Die Voraussetzung für alles Weitere. |
| **1** | **Karriere-Filter für Klassenraum** (§ 2.3) — eine Zeile + Test | **0,5 Sitzung** | Eine Zeile verhindert, dass 20 Azubis sich eine Woche Fortschritt schenken. Muss **vor** dem ersten echten Unterrichtseinsatz stehen. |
| **2** | **Die 67 Denkhilfen + Hilfe-Vorschläge** (Ebene 2, Firewall, Symptom-Einstieg) | **~7 Sitzungen** | Greift in jeder Sitzung, kein Vertragsrisiko, kein Sim-Risiko. Der größte Nutzen je Sitzung. |
| **3** | **Die drei gesperrten Trainingskarten** (Injektoren für `portsec`, `stp`, `storage`) | **1–2 Sitzungen** | Ein sichtbarer Defekt: die Karten sind anklickbar und gehen nie auf. |
| **4** | **Lernmotor-Falle entschärfen** (§ 2.1/2.2) — Migration statt Wegwerfen, Import vor dem ersten Lesen | **0,5 Sitzung** | Klein, aber es ist die Stelle, an der eine 2.0 den Fortschritt aller löschen würde. |
| **5** | **Klassenraum** — Stufen A/B/E/F, ohne QR und ohne Server-in-der-`.exe` | **6–9 Sitzungen** | Erst jetzt: es braucht die Entscheidungen E1–E8 und die Karriere-Regel aus Schritt 1. |
| **6** | **Inhaltliche Breite**: IPv6 → WLAN/AP → Virtualisierung | **je 3–6 Sitzungen** | Deckt ganze Prüfungsgebiete ab, braucht aber vorher Vertragsarbeit in [Architektur.md](../Architektur.md). |
| **7** | **Tutor auf Sprachmodell** — nur als Zugabe, nur nach B1–B4 | **offen** | Sein Hauptbeleg („67 Fälle") ist nach Schritt 2 weg. Vertagen. |

## 6 · Was **nicht** gebaut werden sollte

* **Kein Signaturschutz für Codes.** Eine 64-Byte-Signatur macht aus 29 Zeichen **132**; das Geheimnis
  läge im offenen Repositorium, und eine Serverprüfung widerspricht dem Vertrag „ein Code, kein Server,
  kein Konto". Prüfsumme (Tippfehler), Plausibilität (markieren statt ablehnen) und Ehrlichkeit genügen
  für ein Lernspiel **ohne Noten**.
* **Kein Tutor dort, wo die Lösung ein einzelner Fakt ist** (Mini-Tickets, Prüfungsfragen). Die Prüfkette
  fängt die **wörtliche** Lösung sicher ab — eine **Paraphrase** besteht jede Textprüfung. Dagegen hilft
  kein Filter, nur diese Regel.
* **Kein lokales Modell** in der 2,5-MB-Einzeldatei. Auf dem Papier plausibel, **nicht gemessen**, und
  die Gewichte passen nicht zur Datei.
* **Nichts, was Determinismus, Offline-Betrieb oder die 461 Tests aufgibt.** Eine 2.0, die davon etwas
  verliert, ist ein Rückschritt mit größerer Nummer.

## 7 · Was nur der Nutzer entscheiden kann

Die acht Entscheidungen aus [§ 8 des Klassenraum-Entwurfs](<Entwurf – Klassenraum-Umsetzung.md>), die
wichtigsten vier:

| | Frage | Empfehlung der Prüfer |
|---|---|---|
| **E1** | Zählt ein Klassenraum-Ticket im Postfach und im Offen-Zähler mit? | **Filtern wie `training`** — sonst blockiert es seine eigene `ticketId` (`postfach.js:156`, gemessen) |
| **E2** | Verfälscht der Klassenraum die Karriere? | **Umleiten** — eine Zeile neben `abnahme.js:118`, Lernwert über `lernenNachAbnahme` erhalten |
| **E3** | Überstimmt die Lehreransage den Bildungsstand? | **Nein.** Der Bildungsstand ist die Voreinstellung des Menschen (Vertrag § 1); höchstens anzeigen |
| **E4** | Wessen Hilfevorrat gilt? | **Der des Schülers auf seinem Gerät** — aber die Ticket-Stufe muss ausdrücklich gesetzt werden, sonst ist derselbe Code je Gerät verschieden teuer |

**Und eine Frage, die keine Technik ist:** Ob ein Klassenraum-Auftrag **bewertet** werden soll. Wenn ja,
braucht es eine eigene Auswertung statt eines Filters — und dann stellt sich die Frage nach Noten, die
dieses Spiel bisher bewusst nicht stellt.

## 8 · Prüfstand

| Prüfung | Ergebnis |
|---|---|
| `node tests/run.js` | **461/461 grün** (53 Testdateien, 83 Module, exit 0, 0 übersprungen) |
| `python tools/ethos.py` | GRÜN · `python tools/klassen.py` **0** |
| `node tools/sim-stand.js` | Simulation unverändert |
| `python tools/seite.py --pruefen` | **GRÜN** — 34 Dokumente, kein toter Verweis |
| `python bauen.py` | 118 Module → `web/index.html` (Version 1.2.4) |
| `cargo test --release` in `tools/klassenraum` | **10/10** · `C-qr-rust` **5/5** · `klassenraum.exe` 322 560 B |

**Nicht geprüft — ehrlich.** Kein Browser, keine Bildschirmfotos, **keine echte Unterrichtsstunde**.
Die Codec-Zahlen der Spezifikation wurden nicht nachgerechnet. Die HTTP-Probe des Rust-Servers lief in
dieser Umgebung **nicht durch** — der erste neue Ergebnis-POST antwortet **507** statt 201, weil der
Server seine Ablagedatei nicht schreiben kann (Sandbox-Schreibrecht vermutet, **kein** Serverfehler
nachgewiesen; nach dem Lauf waren keine `klassenraum`-Prozesse und die Ports frei). Der Sollwert 20/20
ist erst außerhalb dieser Sandbox belegbar. **Der Unterrichtserfolg ist nicht messbar — nur die Lücken
sind belegt.**
