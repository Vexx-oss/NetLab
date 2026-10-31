---
tags: [FISI, Lernspiel, Netzwerk, Runde7, Subnetting, VLAN, Didaktik, Lernstufen]
erstellt: 2026-10-31
status: Verbindliche Umsetzungsnotiz zu Runde 7 (Fassung 2.8.0), Owner W2.
---

# Subnetting – Lernstufen-Matrix (Runde 7)

**Zweck.** Diese Notiz hält die Lernstufen-Matrix der generierten Subnetting- und VLAN-Aufgaben
fest (Vertrag § 5), die Typ-Matrix aus § 6, die sieben Befunde aus § 10 mit Vorher/Nachher und
Testbeleg sowie die Stellen, die **bewusst nicht** geändert wurden. Sie ist die didaktische
Grundlage für `src/spiel/subnetz.js` (Aufgabenmotor, Owner W1), `src/daten/subnetz-lehrplan.js`
(Lehrplan, Owner W2) und `tests/subnetz-inhalte.test.js` (didaktische Invarianten, Owner W2).

**Quellen.** Verbindlich sind `docs/entwicklung/Entwurf – Runde 7 (Abteilung Subnetting).md`
§ 2.1, § 2.2, § 5, § 6, § 10 sowie die Vault-Notizen `Network – Lernfassung`,
`VLAN – Lernfassung`, `04-AP1-Netzwerk` und `Fragen – Subnetting`. Fachliche Belege:
RFC 4632 (CIDR), RFC 1918 (private Adressen), RFC 3021 (/31), IEEE 802.1Q (Tagging).

---

## 1 · Stufenmerkmale (Vertrag § 5, wörtlich übernommen)

Drei Stufen, angeschlossen an die vorhandene Achse `niveau` (E/AP1/AP2). Jede generierte Aufgabe
trägt genau eine Stufe; die Stufe bestimmt Zahlenraum, Schrittzahl und Hilfen.

| Merkmal | E | AP1 | AP2 |
|---|---|---|---|
| Präfixe | /24–/28 | /20–/30 | /16–/31 (inklusive /30, /31) |
| Schritte bis zur Lösung (kognitiv) | 1 | 2–3 | 3–5 |
| Oktett-Lage | letztes Oktett, Blockgröße ≤ 128 | letztes oder vorletztes Oktett | beliebiges Oktett |
| Hilfen in der Aufgabe | `hinweis` immer gesetzt, Rechenweg anforderbar | `hinweis` optional | kein `hinweis` |
| VLSM | – | 2–3 Netze, ein Schritt | 4–5 Netze, Reihenfolge + Reserve |
| VLAN | ein Access-Port | zwei Ports/VLAN, Erreichbarkeit | Trunk, Tagging, Native, allowed-Liste |
| Zeitdruck | keiner | keiner | optional (Spiel „Präfix-Blitz" nur AP1/AP2) |
| Formulierung | „Wie lautet …" ohne Zusatzbedingung | eine Bedingung | Bedingung + Gegenprobe/Falle benannt |

**Zwei verschiedene Größen — nicht verwechseln.** „Schritte bis zur Lösung" in der Tabelle meint
die **kognitiven Lösungsschritte** einer Aufgabe (E 1, AP1 2–3, AP2 3–5). Die **angezeigte
Rechenweg-Länge** ist davon unabhängig und laut Vertrag § 2.1 immer **3–6 Schritte**: Der
Rechenweg zeigt den vollständigen Weg, die Stufe bestimmt, wie viel davon die Lernenden selbst
leisten müssen.

**Umsetzungsstand dieser Größe (gemessen am 31.10.2026 gegen `Spiel.subnetz`, 460 Aufgaben je
23 Art×Stufen × 20 Seeds):** Die angezeigte Rechenweg-Länge ist **E 3 · AP1 3 · AP2 5** Schritte
(kein E mit 1, kein AP1 mit 2 oder 4, kein AP2 mit 4). Das ist mit § 2.1 (3–6 Schritte) vereinbar,
aber die Stufenmatrix aus § 5 (Lösungsschritte) ist im Generator **nicht** umgesetzt. Der Generator
wird in dieser Runde nicht umgebaut (Owner W1, Auftrag auf Rechenkern und API begrenzt); die
Abweichung ist hier ehrlich dokumentiert und an die Leitung gemeldet. Eine Umsetzung hieße:
E-Aufgaben mit genau 1 Lösungsschritt (z. B. nur Netz-ID ablesen) und AP1 mit 2, ohne die
Vertragsregel „Rechenweg 3–6 Schritte" zu brechen.

**Auslegung für den Zahlenraum E.** Der Vertrag nennt /24–/28 und gleichzeitig „Blockgröße ≤ 128"
(das ist /25 oder länger). Für Rechenaufgaben mit Adressen wird deshalb /25–/28 erzeugt; /24 bleibt
als Netzgröße zulässig, wo nur gezählt wird. Der Test lässt für E /24–/28 zu und prüft, dass
E-Aufgaben nicht über /30 oder /31 sprechen – einzige Ausnahme ist die ausdrückliche
RFC-3021-Ausnahme in Modul 4 (Didaktik-Review S4), die als Satz mit „RFC 3021" klar markiert ist
und die absoluten „nie"-Regeln für /31 korrigiert.

**Wortregeln (testbar).** Frage bis 220 Zeichen, alle Angaben zusätzlich in `lage`; keine
unbestimmten Wörter („irgendwie", „vielleicht", „eventuell"); keine Abkürzung ohne Auflösung beim
ersten Vorkommen in Lehrmaterial; keine negativen Fangfragen auf E; genau eine richtige Option;
Distraktoren sind typische Denkfehler (nicht offensichtlich falsch); jede Erklärung nennt den
Rechenweg in Worten. Der Lehrplan (Modultexte) wird zusätzlich in Du-Form, ohne Emoji und ohne
Füllwörter geprüft.

---

## 2 · Typ-Matrix: 11 Aufgabenarten × E/AP1/AP2 (Vertrag § 6)

Zellen nennen **Zahlenraum · Lösungsschritte (kognitiv) · Hilfe · Formulierungsregel**; „–" heißt:
Diese Art gibt es auf dieser Stufe nicht. Grundlage ist die Stufenmatrix aus § 1; typspezifische
Abweichungen stehen in der Zelle. Eingabeart je Typ nach § 6. Die **angezeigte Rechenweg-Länge**
ist in jeder Zelle 3–6 Schritte (§ 2.1, siehe § 1 „Zwei verschiedene Größen").

| Art | Eingabe | E | AP1 | AP2 |
|---|---|---|---|---|
| `netzid` – Netz-ID bestimmen | ip | /24–/28 · 1 Schritt · `hinweis` immer · „Wie lautet die Netz-ID von …?" | /20–/30 · 2–3 · `hinweis` optional · eine Bedingung („In welchem Netz liegt …? Gib die Netz-ID an.") | /16–/31 · 3–5 · kein `hinweis` · Bedingung + Gegenprobe („prüfe gegen den Broadcast") |
| `broadcast` – Broadcast bestimmen | ip | /24–/28 · 1 · `hinweis` immer · „Wie lautet …" | /20–/30 · 2–3 · optional · eine Bedingung | /16–/31 · 3–5 · kein `hinweis` · mit Gegenprobe zu den nutzbaren Hosts |
| `hosts` – Nutzbare Hosts | zahl | /24–/28 · 1 · `hinweis` immer · „Wie viele …?" | /20–/30 · 2–3 · optional · eine Bedingung | – |
| `maske` – Maske ↔ Präfix | maske | /24–/28 · 1 · `hinweis` immer · „Wie lautet …" | /20–/30 · 2–3 · optional · eine Bedingung | – |
| `block` – Blockgröße und Raster | zahl | /24–/28 · 1 · `hinweis` immer · „Wie viele Adressen …" | /20–/30 · 2–3 · optional · eine Bedingung | /16–/31 · 3–5 · kein `hinweis` · Bedingung + Gegenprobe (Raster im Oktett) |
| `subnetze` – Netze schneiden/zählen | zahl | – | /20–/30 · 2–3 · optional · „Wie viele Netze entstehen …" | /16–/31 · 3–5 · kein `hinweis` · mit Leihbits und Gegenprobe |
| `vlsm` – Adressplan-Schritt | auswahl | – | 2–3 Netze, ein Schritt · 2–3 · optional · „Welcher Block kommt als Nächstes?" | 4–5 Netze, Reihenfolge + Reserve · 3–5 · kein `hinweis` · Falle benannt (vom größten zum kleinsten) |
| `zusammenfassen` – Supernetz | auswahl | – | – | /16–/31 · 3–5 · kein `hinweis` · Bedingung + Falle (lückenlos, am Blockanfang) |
| `vlan-port` – VLAN am Port | auswahl | ein Access-Port · 1 · `hinweis` immer · „In welchem VLAN liegt …?" | zwei Ports/VLAN · 2–3 · optional · eine Bedingung | – |
| `vlan-erreichbar` – Gleiches VLAN? | auswahl | – | zwei Ports/VLAN, Erreichbarkeit · 2–3 · optional · eine Bedingung | Trunk, Tagging, Native, allowed-Liste · 3–5 · kein `hinweis` · Falle benannt |
| `trunk` – Trunk und Tagging | auswahl | – | – | Trunk, Tagging, Native, allowed-Liste · 3–5 · kein `hinweis` · Falle benannt |

**Zusätzliche Regeln für Auswahlaufgaben (§ 2.1, § 5).** Genau eine richtige Option; jede Option
ist nur mit den Angaben in `lage` und elementarem Netzwerk-Wissen entscheidbar; drei Distraktoren
sind typische Denkfehler (Nachbarblock, Broadcast statt Host, Off-by-one, Wildcard statt Maske,
falscher Präfix, ungeteiltes Netz …); der Rechenweg (3–6 Schritte in `rechenweg`) endet mit
`loesung.wert`; `pruefen` wirft nie; Formattoleranz: Maske als `/26` oder `255.255.255.192`,
Zahlen als `62` (auch `62 Hosts`).

---

## 3 · Die sieben Befunde aus § 10 mit Vorher/Nachher und Testbeleg

Alle Änderungen liegen ausschließlich in den W2-Dateien aus § 9. Testbelege sind die schnellen
Einzeltests (`node Nachweise/runde7/schnelltest.js tests/<datei>.test.js`); der Gesamtlauf
`node tests/run.js` bleibt das Abnahme-Gate.

### Befund 1 — `vlan-netzgroesse` lehrte das falsche Planungsmodell

- **Vorher (AP2, `src/daten/fragen-vorlagen.js`):** „Das Netz X/24 wird auf n VLANs aufgeteilt,
  jedes gleich groß. Welche Subnetzmaske bekommt jedes VLAN?" – Antwort aus
  `24 + log2(n)`. Das ist ein Gleichverteilungsmodell; in der Praxis hat jedes VLAN einen eigenen
  Bedarf, und geplant wird vom Bedarf zum Präfix (VLSM-Denken).
- **Nachher:** „Im VLAN v brauchen h Hosts eine Adresse. Welche Maske ist die kleinste, die
  reicht?" – Antwort aus `32 − ceil(log2(h + 2))`, also der kleinste Präfix mit
  `2^(32−p) − 2 ≥ h`. Distraktoren: ungeteiltes /24 („reicht ja auch" – typischer Planungsfehler)
  sowie ein und zwei Präfixe zu groß. `GEGEN`-Eintrag in `tests/fragen-generator.test.js`
  rechnet den Präfix unabhängig aus `hosts` nach und prüft, dass die drei Ablenker verschiedene,
  gültige Masken sind.
- **Testbeleg:** `tests/fragen-generator.test.js` **7/7 grün** (20 Vorlagen, 4000 Fragen über
  200 Seeds; `vlan-netzgroesse` 175/200 verschiedene Fragetexte). Keine Testabschwächung: der
  `GEGEN`-Eintrag wurde fachlich ersetzt, nicht gelockert.

### Befund 2 — `mini-sub-1` / `mini-sub-3`: Schwierigkeit invertiert

- **Vorher:** `mini-sub-1` (E) fragte die Netzadresse zu /26 (AP1/AP2-Stoff),
  `mini-sub-3` (AP2) fragte die Hostzahl eines /28-Netzes (E-Stoff).
- **Nachher:** Die beiden Stufen wurden getauscht: `mini-sub-1` ist jetzt **AP2**,
  `mini-sub-3` jetzt **E**. Das Multiset der Stufen bleibt exakt gleich
  ({E: 1, AP1: 2, AP2: 1} unter `mini-sub-1` bis `mini-sub-4`), die Fragen selbst sind unverändert.
- **Testbeleg:** `tests/daten-mini.test.js` **6/6 grün**; `tests/inhalte-s6.test.js` **6/6**
  (Rotations- und Stufenregeln) und `tests/mini-wiederholung.test.js` **17/17** bleiben grün.

### Befund 3 — `mini-trunk-5` war ohne Native-Angabe doppeldeutig

- **Vorher:** „Ein Frame kommt UNGETAGGT an einem Trunk-Port an. In welchem VLAN landet er?" –
  Optionen „Im Native VLAN des Ports" / „Immer in VLAN 1" / „Er wird verworfen". Ohne Angabe des
  Native VLAN ist nicht entscheidbar, ob VLAN 1 stimmt; die Frage war ein Leserätsel.
- **Nachher:** Der Schnappschuss nennt den Kontext ausdrücklich
  (`SW1#show interfaces trunk` – Native VLAN **20**, erlaubte VLANs 10, 20, 30). Die Optionen
  lauten „Im Native VLAN (VLAN 20)", „Immer in VLAN 1", „Im ersten erlaubten VLAN (10)" – genau
  eine ist mit dem Schnappschuss entscheidbar. Die dritte Option ist jetzt ein echter Denkfehler
  („erlaubtes VLAN" mit „Native VLAN" verwechseln); „Er wird verworfen" war fachlich falsch und
  als Ablenker unbrauchbar.
- **Testbeleg:** `tests/daten-mini.test.js` **6/6 grün** (Frage-/Options-/Schnappschussgrenzen),
  `tests/inhalte-s6.test.js` **6/6**, `tests/spiel-mini-denktexte.test.js` **12/12**.

### Befund 4 — fehlende Denkhilfen für drei Transferaufgaben

- **Vorher:** `mini-vlan-6`, `mini-trunk-5` und `mini-rostick-4` hatten keinen eigenen Eintrag in
  `DATEN.miniDenkhilfen`; `Spiel.mini.hilfe` fiel auf den Fertigkeitssatz zurück. Für
  Transferaufgaben („was brauchen sie", „in welchem VLAN landet er", „wie viele Subinterfaces") ist
  der Fertigkeitssatz zu schwach.
- **Nachher:** Drei eigene Denkanstöße in `src/daten/mini-denkhilfen4.js` (Teil 4 lädt nach
  Teil 1–3 und hängt idempotent an; Teil 1–3 bleiben unverändert). Jeder Eintrag hat
  `denkhilfe`, `stichwort` und – wo sinnvoll – einen wörtlichen `ausschnitt`; keiner nennt eine
  Option oder die Lösung; die Stichwörter stehen nicht auf der Wiki-Seite ihrer Fertigkeit.
- **Testbeleg:** `Spiel.mini.hilfe` liefert für alle drei den eigenen Text, nicht den
  Fertigkeitssatz. `tests/spiel-mini-denktexte.test.js` **12/12 grün** (Wächter, Ausschnitt,
  Stichwort, Rückfall-Test mit `mini-link-2`), `tests/denkhilfen-teil1.test.js` **9/9**,
  `tests/denkhilfen-teil2.test.js` **7/7**.

### Befund 5 — doppelte Trainings ohne Unterschied

- **Vorher:** `tr-netz-maske` und `tr-netz-nachbar` hießen beide „Gleiches Netz oder nicht?" und
  beschrieben denselben Ablauf. `tr-trunk-erlauben` und `tr-trunk-allowed` behandelten beide die
  erlaubte VLAN-Liste (einmal als Störung mit Reparatur, einmal als zweite Störung derselben
  Ursache).
- **Nachher:** `tr-netz-maske` heißt „Gleiches Netz? Maske auf beide Adressen anwenden" und
  arbeitet am /16-Beispiel im dritten Oktett; `tr-netz-nachbar` heißt „Gleiches Netz? Prüfung an
  der Blockgrenze" und arbeitet an 192.168.10.62/26 gegen 192.168.10.65/26 (Blockgrenze im letzten
  Oktett). `tr-trunk-erlauben` bleibt die Allowed-Liste mit der `add`-Falle (VLAN 20 fehlt);
  `tr-trunk-allowed` ist jetzt „Uplink am Switch ist kein Trunk" (Access- statt Trunk-Modus,
  `show interfaces switchport`, `switchport mode trunk`). Beide Trainings behalten `art`,
  `niveau` und `minuten` – es wird keine Progression vorgetäuscht; die Typen bleiben
  `stoerung`/`AP1` bzw. `basis`/`E`, die Testregel `niveau = f(art)` bleibt unberührt.
- **Testbeleg:** `tests/daten-trainings.test.js` **10/10 grün** (Form, art↔niveau, Quellen,
  Geräteklasse, echte Baubarkeit); `tests/spiel-training.test.js` bleibt unverändert.

### Befund 6 — `tr-subnetz-plan`: E-Format mit AP1-Inhalt

- **Vorher:** Das Training war `basis`/E, verlangte aber die eigene Rechnung
  /24 → vier /26-Netze inklusive Netz-ID, Broadcast und Hostspanne aus dem Kopf – ein
  AP1-Inhalt. Die Stufenmatrix sagt für E: ein Schritt, Hilfe anforderbar.
- **Nachher:** Die Teiltabelle ist **vorgegeben** („.0 bis .63, .64 bis .127, .128 bis .191,
  .192 bis .255"); die Lernenden lesen je Block Netzadresse, Broadcast und erste Hostadresse ab
  und tragen die Router-Adresse ein. Vier geführte Schritte, davon ein Rechenschritt je Block.
  `art: "basis"` und `niveau: "E"` wurden **nicht** geändert (die Testregel `niveau = f(art)` aus
  `tests/daten-trainings.test.js` bleibt erfüllt).
- **Testbeleg:** `tests/daten-trainings.test.js` **10/10 grün** (Titel/Beschreibung/Schritte,
  art↔niveau, Quelle, Baubarkeit).

### Befund 7 — Bit-/Block-Brücke im Lehrplan statt Wiki-Umbau

- **Vorher:** Die Wiki-Rezepte rechnen nur im letzten Oktett; der Rechenweg gilt damit nicht für
  beliebige Präfixe (Befund der read-only-Analyse).
- **Nachher:** Der Lehrplan (`src/daten/subnetz-lehrplan.js`) lehrt die Brücke ausdrücklich:
  Modul 3 „Blockgröße" (2 hoch (32 minus Präfix), 256 minus Maskenoktett, Raster) und Modul 5
  „Netze schneiden" (Leihbits, beliebige Adresse → Netz-ID über die Blockgröße); die
  Formelsammlung hat einen eigenen Eintrag „Blockgröße im Oktett ablesen" mit dem Satz „Bei
  kleineren Präfixen wandert die Grenze ein Oktett nach links." Die Wiki-Datei `src/daten/wiki.js`
  bleibt unangetastet (Owner Leitung; § 10 Nr. 7 verlangt die Brücke im Lehrplan, keinen
  Wiki-Umbau).
- **Testbeleg:** `tests/subnetz-lehrplan.test.js` **12/12 grün** (u. a. Blockgrößen-Tabelle
  zellenweise nachgerechnet, Pflichtaussagen der Module, Stufenfolge).

---

## 3a · Nachbesserung aus der unabhängigen Didaktik-Prüfung (31.10.2026)

Die unabhängige Prüfung (`Nachweise/runde7/review-didaktik.md`, S1–S5 und K2/K7) fand fachliche
Schwächen im Lehrplan. Alle betroffenen Stellen liegen in `src/daten/subnetz-lehrplan.js` und
wurden in einer eigenen Fix-Runde korrigiert; die angezeigte Rechenweg-Länge (S1) bleibt bewusst
als Ist-Stand dokumentiert (§ 1).

| Nr | Vorher | Nachher |
|---|---|---|
| S2 · Modul 6 (AP1) | VLSM-Beispiel mit **vier** Netzen (100/50/25/10 Hosts) – das ist AP2-Stoff, die Matrix erlaubt AP1 nur 2–3 Netze. | Beispiel „Drei VLANs aus 192.168.100.0/24" mit 100/50/20 Hosts: /25 (126), /26 (62), /27 (30), Reserve .224/27. Ergebnis und Reserve bleiben nachgerechnet. |
| S3 · Modul 8 | „Vier Netze brauchen 2 zusätzliche Netzbits: 24 minus 2 ergibt 22." – widersprüchlich: „zusätzliche" Bits würden /26 ergeben. | „Beim Zusammenfassen werden Netzbits wieder Hostbits: Der Präfix sinkt um 2, denn aus dem /22 werden umgekehrt vier /24, indem zwei Bits vom Host- in den Netzanteil wandern." Dazu eine Gegenprobe-Zeile „24 minus 2 = 22; vier /24 = 2 hoch 2 Netze". |
| S4 · Modul 4 + Fehlerfallen | Absolut „Netz- und Broadcastadresse dürfen nie …" bzw. „Beide bleiben reserviert" – für /31 falsch. | „Bei /24 bis /30 …; /31 ist nach RFC 3021 die Ausnahme, dort sind beide Adressen nutzbare Endpunkte." In der Fehlerfallen-Zeile zusätzlich /32 (genau eine Adresse). |
| S5 · Rechenweg-Formel | Schritt 4/5 sagten ohne Vorbehalt „Hosts = Block − 2" und „Hostbereich = Netz+1 … Broadcast−1" – für /31 falsch. | Schritt 4 nennt den Geltungsbereich /0–/30 und die RFC-3021-Ausnahmen /31 (zwei Endpunkte) und /32 (eine Adresse); Schritt 5 erklärt, dass bei /31 die Netz-/Broadcast-Trennung entfällt. |
| S1 · Schrittzahl | Matrix nennt Lösungsschritte E 1 / AP1 2–3 / AP2 3–5; der Generator liefert überall 3–6 angezeigte Rechenweg-Schritte. | § 1 unterscheidet jetzt ausdrücklich „Lösungsschritte (kognitiv)" und „angezeigte Rechenweg-Länge (3–6, § 2.1)" und dokumentiert den Ist-Stand **3/3/5** samt Begründung – ein Umbau des Generators (Owner W1) war nicht Teil dieser Runde. |
| K2 · Quelle | „07-Uebungen-Subnetting-Szenarien" fehlte im Lehrplan. | Modul 5, 6 und 8 nennen die Quelle jetzt in Modul-`quelle`; Schreibweise im Datenbestand „07-Übungen-Subnetting-Szenarien" (lesbare Form), der ASCII-Dateiname des Vault-Dokuments steht im Kopfkommentar. Grund: `tools/umlaute.py` führt die ASCII-Form „Uebungen" nur für `trainings.js`/`wiki.js` als Zitat-Ausnahme – und eine Ausnahme dort einzutragen lag außerhalb der W2-Schreibzone. |
| K7 · Formelsammlung | „jede Broadcast-Domäne braucht ein eigenes Gateway" – zu absolut (isoliertes VLAN, Layer-3-Switch). | „… braucht ein eigenes Subnetz und in der Regel ein eigenes Gateway – ein Layer-3-Switch kann mehrere Netze über virtuelle Schnittstellen bedienen." |

**Testbelege der Fix-Runde:** `tests/subnetz-lehrplan.test.js` **12/12 grün** (der Test verlangt
die RFC-3021-Ausnahme in Modul 4; E-Module bleiben sonst im Raster /24–/28, Sätze mit „RFC 3021"
sind ausdrücklich als Ausnahme markiert), `tests/subnetz-inhalte.test.js` **7/7 grün**,
`python tools/umlaute.py` GRÜN. Keine bestehende Zusicherung wurde abgeschwächt; die einzige
Teständerung ist die begründete Ausnahme für den RFC-3021-Satz in Modul 4.

---

## 4 · Bewusst nicht geändert (mit Begründung)

| Stelle | Warum nicht |
|---|---|
| `src/daten/wiki.js` | Owner Leitung, § 10 Nr. 7 verlangt die Bit-/Block-Brücke im Lehrplan. Ein Wiki-Umbau wäre eine fremde Datei und in dieser Runde nicht beauftragt. |
| `tr-trunk-erlauben` (Inhalt) | Die Allowed-Liste mit der `add`-Falle bleibt als eigenes Szenario erhalten – sie ist die häufigste Prüfungsfalle und von `tr-trunk-allowed` (Betriebsart) jetzt klar getrennt. Nur `tr-trunk-allowed` wurde umbenannt und umgeschrieben. |
| Weitere Mini-Tickets außerhalb § 10 | Kein Bedarf belegt; der Auftrag ist auf die sieben Befunde begrenzt. `mini-link-2` bleibt bewusst ohne Denkhilfe (Rückfall-Test in `tests/spiel-mini-denktexte.test.js`). |
| `DATEN.skills` | Codec- und Dichte-Tests sind eingefroren (§ 1, § 10 „Nicht Teil dieser Runde"). Keine neue Fertigkeit. |
| Tickets, `src/spiel/mini.js`-Mechanik, Lernmotor, Spiellogik, UI | § 10 „Nicht Teil dieser Runde"; diese Runde ergänzt Inhalte und Abteilung, nicht die Mechanik. |
| Stufe/Art der geänderten Aufgaben | `vlan-netzgroesse` bleibt AP2/`wahl`, `tr-subnetz-plan` bleibt `basis`/E, `tr-trunk-allowed` bleibt `stoerung`/AP1 – die Stufenmatrix und die Testregel `niveau = f(art)` werden nicht durch Datenänderungen ausgehebelt. |
| Antwortoption „Er wird verworfen" bei `mini-trunk-5` | Fachlich falsch: Ein ungetaggter Frame am Trunk wird nicht verworfen, sondern dem Native VLAN zugeordnet. Als Ablenker war sie damit unbrauchbar; ersetzt durch „Im ersten erlaubten VLAN (10)". |
| Testabschwächungen | Keine. Die einzige nachgezogene bestehende Erwartung ist der `GEGEN`-Eintrag zu `vlan-netzgroesse`, weil sich die Rechenregel der Vorlage fachlich geändert hat; er rechnet jetzt strenger (kleinster reichender Präfix aus dem Bedarf). |

---

## 5 · Prüfbelege (gemessen am 31.10.2026)

Schnelle Einzeltests über `node Nachweise/runde7/schnelltest.js tests/<datei>.test.js`:

| Test | Ergebnis |
|---|---|
| `tests/subnetz-lehrplan.test.js` | 12/12 grün, 0 übersprungen |
| `tests/subnetz-inhalte.test.js` | 7/7 grün (276 Aufgaben, alle 23 Art×Stufen-Kombinationen) |
| `tests/fragen-generator.test.js` | 7/7 grün |
| `tests/daten-mini.test.js` | 6/6 grün |
| `tests/daten-trainings.test.js` | 10/10 grün |
| `tests/spiel-mini-denktexte.test.js` | 12/12 grün |
| `tests/denkhilfen-teil1.test.js` / `-teil2` | 9/9 / 7/7 grün |
| `tests/mini-wiederholung.test.js` | 17/17 grün |
| `tests/inhalte-s6.test.js` | 6/6 grün |

**Gesamtlauf** `node tests/run.js` (31.10.2026, nach der Fix-Runde aus § 3a): **1047/1049 grün,
0 übersprungen** (118 Testdateien, 98 Module). Die beiden roten Fälle sind die Doku-Seitenbau-Tests
(Seitenzahl gegen die Quellzahl: „ist 63 – soll 66" bzw. „ist 62 – soll 65"), weil nach dem letzten
`python tools/seite.py` noch Dokumente hinzukamen; der Bau ist ein Schritt der Leitung (`docs/**`).
Mit dem W2-Lehrplan, den W2-Tests und allen § 10-Änderungen sind das die einzigen roten Fälle –
kein Befund aus dieser Datei. Nach `python tools/seite.py` ist der Lauf voraussichtlich 1049/1049.

`tests/subnetz-inhalte.test.js` prüft die didaktischen Invarianten der generierten Aufgaben
read-only gegen `Spiel.subnetz` (Zahlenraum je Stufe, `lage` vollständig, genau eine richtige
Option, Distraktoren, `rechenweg` endet in `loesung.wert`, `hinweis`-Regel je Stufe, keine
verbotenen Formulierungen). Der Test prüft **jede vorhandene** Art×Stufe und nennt fehlende
Kombinationen im Protokoll. Gemessen beim Schreiben dieser Notiz: alle 23 in § 6 vorgesehenen
Art×Stufen-Kombinationen liefern Aufgaben (276 Aufgaben über die Seeds 1–12, davon 96 mit Auswahl;
`tests/subnetz-inhalte.test.js` **7/7 grün**). Fehlende Kombinationen nennt der Test im Protokoll,
statt den Lauf leer zu beenden. Beim ersten Lauf gefunden und an W1 gemeldet und behoben: `eingabe`
fehlte in den Generatoren und der letzte `rechenweg`-Schritt von `vlan-erreichbar` endete nicht in
`loesung.wert`; beides ist im gelieferten Stand korrigiert und durch den Test abgesichert.
