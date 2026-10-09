---
typ: befund
erstellt: 2026-10-09
aktualisiert: 2026-10-09
status: fertig — die Behauptung „27 von 27" ist vierfach unabhängig belegt (432/432 · 1728/1728 · 54/54 · Tabelle gegen Messung); B1 ist während dieser Arbeit behoben worden, B2/B3 bleiben datierte Belege und Protokolle, B4 (Vertragsanker) wird nachgezogen
tags: [FISI, Lernspiel, Netzwerk, Klassenraum, Befund, Messung]
---

# 🔬 Befund – „27 von 27": jede Fertigkeit ist als Klassenraum-Auftrag lösbar

> [!danger] Kurzfassung
> **Die Behauptung hält.** Alle **27** Fertigkeiten aus `DATEN.skills` sind als Klassenraum-Auftrag
> adressierbar, haben einen Fehlerinjektor, sind im Startnetz **wirklich** gebrochen und mit der
> hinterlegten Lösung **wirklich** heilbar — gemessen über den vertraglichen Weg (432/432 über
> Seeds 1..16; 1728/1728 über das volle Kanonisierungsfenster 1..64) und über den echten Weg der
> Lehrkraft mit Code (54/54 bestanden, bei Wahl **E** und **AP2**). Die frühere Angabe „24 von 27"
> ist überholt; sie stammt aus der Zeit vor den drei Injektoren `portsec-fremde-mac`, `stp-doppelkabel`
> und `nas-ohne-adresse` (Ausbau 1.3 / task-5).
> **Fünf Befunde betreffen nur das Drumherum** (§ 5): das Beweismittel `A-codec-probe.js` rechnete noch
> mit 24 (**während dieser Arbeit behoben** — es leitet die Zahl jetzt aus der Messung ab), der eingefrorene
> Beleg `A-codec.json` trägt den alten Stand, die Dokumente A/D nennen 24 (bewusst Protokolle), **der
> Vertragsanker fehlt** (Architektur § 12.2 hat keinen Tauglichkeits-Punkt), und drei eingefrorene Indizes
> haben ihre Bedeutung gewechselt (24/25/26: von „abgelehnt" zu „echter Auftrag"). Keiner dieser fünf Punkte
> berührt die Zahl selbst.

## 1 · Die Frage

Zwei Aussagen stehen gegeneinander:

| Quelle | Aussage |
|---|---|
| Fahrplan 1.3/2.0, Umsetzung | alle **27** Fertigkeiten sind tauglich, weil `lab.portsec`, `lab.stp` und `lab.storage` seit task-5 Injektoren haben |
| Frühphase (Spezifikation, A – Codec, Werkzeugliste) | **24 von 27** — drei Fertigkeiten sind nicht adressierbar |

„Adressierbar" heißt im Vertrag **nicht** „kommt in der Liste vor", sondern: es gibt einen Code, aus dem
auf **jedem** Gerät derselbe **spielbare** Auftrag entsteht. Der Weg dahin ist gemessen nachlesbar:

1. `src/spiel/klassenraum.js:50-65` — die eingefrorene Fertigkeitstabelle (`TABELLE_SKILLS`), 27 Einträge
   in `DATEN.skills`-Reihenfolge.
2. `src/spiel/klassenraum.js:146-151` — `erzeugen({skill})` lehnt ab, wenn die Tabelle `tauglich: false`
   sagt **oder** `hatInjektor(skill)` (`:79`) keinen Injektor findet.
3. `src/spiel/klassenraum.js:100-110` (`kanonGeneriert`) — sucht im Kanonisierungsfenster
   (`KANON_FENSTER = 64`, `src/spiel/klassenraum-codec.js:255-259`) nach einem Seed, dessen Fall
   `Spiel.ticketGueltig(d)` besteht (`src/spiel/generator.js:126-151`). Findet sie keinen, lautet die
   Antwort `{fehler:"auftrag"}`.
4. `src/spiel/postfach.js:62-111` — der Öffnungsweg `Spiel.instanzErstellen({gen:{skill,seed}, …})`;
   `Spiel.abnahme` (`src/spiel/abnahme.js:13-45`) prüft am Ende Ziele, Regression und Neustart.

Die eine Frage dieses Befunds: **Gibt es für jede der 27 Fertigkeiten einen Fall, der baubar ist, einen
Injektor hat, gültig ist und lösbar ist?** Und stimmt die eingefrorene Tabelle mit dem überein, was
messbar ist?

## 2 · Die Antwort in vier Messungen

| # | Behauptung | Wie geprüft | Ergebnis | Restzweifel |
|---|---|---|---|---|
| **1** | Jede Fertigkeit liefert über den vertraglichen Weg einen echten, gültigen, lösbaren Auftrag | 27 Fertigkeiten × Seeds **1..16** = 432 Instanzen über `Spiel.instanzErstellen({gen:{skill,seed}, quelle:"klassenraum", ohneFlow:true})` | **432/432 in Ordnung**, **27/27 Skills mit vollem Feld**, **0 Befunde** | nur Seeds 1..16, nicht 1..256 (Messung 2 deckt das Fenster ab) |
| **2** | In keinem Fall des Kanonisierungsfensters scheitert die Suche | 27 × Seeds **1..64** (genau `KANON_FENSTER`) | **1728/1728 in Ordnung**, **0 Befunde** | Fenster für Varianten > 0 beginnt später (`variante + 1 + k`); gemessen ist das Basisfenster 1..64 |
| **3** | Der echte Weg der Lehrkraft führt bis zur Abnahme | `erzeugen({skill})` → Code → `ausCode(code)` → `instanzErstellen` → `Spiel.loesung` + `arbeitszieleErfuellen` → `Spiel.abnahme` → `ergebnisCode`; je Fertigkeit 2 Varianten, **einmal mit Wahl E, einmal mit Wahl AP2** | **54/54 bestanden**, 0 Befunde, in allen 54 Fällen `schritte = 0` (kein Kanonisierungsschritt nötig) | 2 Varianten je Fertigkeit, nicht alle 256 |
| **4** | Die eingefrorene Tabelle sagt die Wahrheit | `Spiel.klassenraum.tabellen()` und `tauglicheFertigkeiten()` gegen `hatInjektor` je Fertigkeit | 27 Einträge, Reihenfolge = `DATEN.skills`, **tauglich ⇔ Injektor** (0 ohne Deckung, 0 unnötig gesperrt), `ersterSeed: 1` bestätigt | die Tabelle ist ein Literal; der Test wacht über Reihenfolge und Merker |

**Was je Fall in Messung 1 geprüft wurde** (fünf Zusicherungen, jede einzeln):

1. `Spiel.instanzErstellen` wirft nicht und `Spiel.defVon(inst)` liefert eine Definition.
2. `def.injektoren.length ≥ 1` — es gibt einen Fehlerinjektor, sonst gäbe es nichts zu finden.
3. `def.ziele.length ≥ 1` und **mindestens ein erwartetes Ziel ist im Startnetz wirklich gebrochen**
   (`Sim.pruefeZiel(inst.netz, ziel).ok === false`) — der Fehler wirkt, er steht nicht nur im Feld.
4. `Spiel.ticketGueltig(def) === true` — das Haus-Gate: Start bricht, Lösung heilt, die gesunden Ziele
   der Vorlage gelten danach weiter.
5. Unabhängig davon nachgerechnet: auf einer **Netzkopie** heilt `Spiel.loesungAnwenden(kopie, def.loesung)`
   **jedes** Netz-Ziel (`Sim.pruefeZiel`). Punkt 4 und Punkt 5 sind zwei verschiedene Rechenwege
   (Gate gegen eigene Kopie) — beide grün.

In Messung 3 kommen die Teile hinzu, die das Gate **nicht** prüft: Arbeitsziele (`befehl`/`antwort`),
Regression (`Spiel.basisMessen`/`regressionPruefen`), der Neustart-Test und der Ergebnis-Code.

## 3 · Die Tabelle aller 27 Fertigkeiten

Reihenfolge wie `DATEN.skills`. „Grundcodes" = alle im Startnetz gebrochenen **erwarteten** Ziele,
vereinigt über Seeds 1..16 (Messung 1); `OFFEN` ist der Grundcode eines `blockiert`-Ziels, das aufgeht.

| # | Skill | Injektor | lösbar | gemessene Grundcodes |
|---|---|---|---|---|
| 1 | `lab.link` | ja | ja | PORT_SHUTDOWN, LINK_DOWN, ARP_NO_REPLY, DNS_NO_SERVER, DHCP_NO_OFFER, NO_ROUTE |
| 2 | `lab.ip` | ja | ja | GW_WRONG_SUBNET, ARP_NO_REPLY, DUP_IP, NO_IP, OFFEN, PORT_CLOSED, NO_ROUTE |
| 3 | `lab.netz` | ja | ja | WRONG_MASK, GW_WRONG_SUBNET, NO_ROUTE, NO_IP |
| 4 | `lab.gateway` | ja | ja | GW_UNREACHABLE, NO_GATEWAY, PORT_SHUTDOWN, NO_ROUTE, DHCP_NO_OFFER |
| 5 | `lab.arp` | ja | ja | ARP_NO_REPLY, DUP_IP, PORT_CLOSED |
| 6 | `lab.ping` | ja | ja | GW_UNREACHABLE, NO_ROUTE |
| 7 | `lab.switch` | ja | ja | PORT_SHUTDOWN, PORTSEC_VIOLATION, STORM, DHCP_NO_OFFER |
| 8 | `lab.subnetz` | ja | ja | WRONG_MASK, DROP_VLAN |
| 9 | `lab.dhcp` | ja | ja | NO_ROUTE, DHCP_NO_OFFER |
| 10 | `lab.dns` | ja | ja | DNS_FAIL, DNS_NO_SERVER |
| 11 | `lab.ports` | ja | ja | FW_DENY, SERVICE_OFF |
| 12 | `lab.tcp` | ja | ja | SERVICE_OFF |
| 13 | `lab.cli` | ja | ja | NO_ROUTE, PORT_SHUTDOWN, DHCP_NO_OFFER, NAT_MISSING, TRUNK_NOT_ALLOWED, GW_UNREACHABLE, OFFEN |
| 14 | `lab.speichern` | ja | ja | NO_ROUTE |
| 15 | `lab.vlan` | ja | ja | DROP_VLAN, GW_UNREACHABLE |
| 16 | `lab.trunk` | ja | ja | TRUNK_NOT_ALLOWED, DROP_VLAN |
| 17 | `lab.rostick` | ja | ja | DROP_VLAN |
| 18 | `lab.acl` | ja | ja | NAT_MISSING, OFFEN, ACL_DENY |
| 19 | `lab.route` | ja | ja | NO_ROUTE, TIMEOUT, NO_RETURN_ROUTE, PORT_SHUTDOWN |
| 20 | `lab.ttl` | ja | ja | PORT_SHUTDOWN |
| 21 | `lab.nat` | ja | ja | NAT_MISSING |
| 22 | `lab.portfwd` | ja | ja | FW_DENY |
| 23 | `lab.fw` | ja | ja | FW_DENY |
| 24 | `lab.dmz` | ja | ja | FW_DENY |
| 25 | `lab.portsec` | ja | ja | PORTSEC_VIOLATION |
| 26 | `lab.stp` | ja | ja | STORM |
| 27 | `lab.storage` | ja | ja | NO_IP |

Die letzten drei Zeilen sind die des Ausbaus 1.3: `portsec-fremde-mac` (Port geht wirklich in
err-disabled), `stp-doppelkabel` (Lauf bricht wirklich mit `abbruch === "STORM"` ab), `nas-ohne-adresse`
(das NAS steht wirklich ohne Adresse da) — ihre Wirkung ist in
[tests/injektoren-neu.test.js](<../../tests/injektoren-neu.test.js>) im Netz nachgewiesen, nicht nur im
Ticket.

## 4 · Zwei Auffälligkeiten ohne Defektcharakter

Beides sind **Beobachtungen**, keine Fehler — sie stehen hier, damit niemand sie später für einen Befund hält:

> [!note] `lab.ttl` meldet als ersten Grund `PORT_SHUTDOWN`, nicht `TTL_EXPIRED`
> Der Injektor `schleife` (`src/spiel/injektoren.js`, skills `["lab.ttl","lab.route"]`) schaltet die
> LAN-Schnittstelle des Filial-Routers ab; das Paket läuft danach im Kreis. Der **erste** gebrochene Ziel
> meldet deshalb die abgeschaltete Schnittstelle, nicht den TTL-Ablauf. Die Fertigkeit ist adressiert
> (Ziel, Titel und Erklärung gehören zu TTL/Traceroute), nur der sichtbare Erstgrund ist ein anderer.
> Über Seeds 1..16 war `PORT_SHUTDOWN` der **einzige** beobachtete Code.

> [!note] `lab.cli` und `lab.acl` melden in manchen Seeds `OFFEN`
> `OFFEN` ist kein Fehlercode im engeren Sinn, sondern der erwartete Zustand eines `blockiert`-Ziels, das
> im Startnetz **aufgeht** („etwas ist erreichbar, das es nicht sein darf"). Genau das ist der Fehler der
> ACL-Injektoren (`acl-reihenfolge`, `acl-zu-streng`, `acl-richtung`): Die Sperre wirkt nicht. Dass der
> Erstgrund je Seed zwischen `ACL_DENY`/`NAT_MISSING` und `OFFEN` wechselt, ist die Auswahl der Fehlerstelle
> — kein Widerspruch zur Tauglichkeit.

## 5 · Fünf Befunde zum Drumherum

| # | Befund | Wie geprüft | Ergebnis |
|---|---|---|---|
| **B1** | Das Beweismittel rechnete noch mit der alten Welt — **behoben** | `tools/klassenraum-probe/A-codec-probe.js` gelesen (zuerst `:722-725`, nach der Korrektur `:730-742`) | **Vorher:** `zaehl.tauglicheIndizes = tab.skills.length - 3` → **24**, `untauglicheIndizes = 3`, `unerreichbareCodesFertigkeit = 3 * 32 * 256` → **24.576**. **Jetzt** (Auftrag `determinismus`, noch während dieser Arbeit): die drei Felder werden aus `messFertigkeitstauglichkeit` **abgeleitet**, mit dem Kommentar „Die frühere Annahme ‚3 untauglich, also 24 von 27' war der Stand VOR den drei Injektoren aus task-5 … Ohne Messung wird NICHT geraten: dann bleibt das Feld null." Gemessen ist: 27 tauglich, 0 untauglich, **0** unerreichbare Codes. **Von mir gelesen, nicht nachgerechnet** — der Probelauf dauert laut Haus ~250 s und schreibt nach `Nachweise/` |
| **B2** | Der eingefrorene Beleg trägt den Stand vor task-5 | `Nachweise/Klassenraum/A-codec.json` gelesen; Dateidatum geprüft | `messungen.fertigkeitstauglichkeit: 24/27`; die Datei ist zuletzt **07.10.2026, 00:29:47** geschrieben — also vor den Injektoren aus task-5. Das Review nennt ihn korrekt „Stand vor task-5" (`docs/entwicklung/Review – Klassenraum A+B.md:65`), die Datei selbst sagt es nicht. **Nicht angefasst** — Belege sind datierte Momentaufnahmen |
| **B3** | Dokumente nennen weiter 24 | Textstellen gesucht | `docs/entwicklung/Klassenraum – Umsetzungsreife Spezifikation.md:138,159` · `docs/entwicklung/Klassenraum/A – Codec und Determinismus.md:220,258,271-274,354-357,499,511,758` · `tools/auftraege/KLASSENRAUM-umsetzungsreif.md:55`. Laut `docs/Architektur.md:871-873` sind A–D **bewusst Protokolle** und werden nicht nachgezogen — dann ist es ein Preis, kein Fehler |
| **B4** | **Der Vertragsanker fehlt** | `docs/Architektur.md:869-901` (§ 12.2) und `:903-928` (§ 12.3) gelesen | § 12.2 enthält **L1–L5** (Postfach, `plaetze`, `ohneFlow`, B gilt, Ergebnis-Toast) — **keinen** Tauglichkeits-Punkt. § 12.3 sagt nur, dass der Kommentar „24 von 27" richtiggestellt ist (`:927`). Die 27 stehen im [CHANGELOG](../CHANGELOG.md) (`:94`), in den Kommentaren `src/spiel/klassenraum.js:28-32` und `src/spiel/klassenraum-codec.js:297-300` sowie in `tests/klassenraum-codec.test.js:251-262` — **nicht** im Vertragsabschnitt. **Wird nachgezogen** (Leitung) |
| **B5** | Drei eingefrorene Indizes haben ihre Bedeutung gewechselt | `KlassenraumCodec.auftragBauen({sitzung:5, art:"generiert", index, variante:3})` + `Spiel.klassenraum.ausCode(code)` | Index 23 → `lab.dmz` · **24 → `lab.portsec`** · **25 → `lab.stp`** · **26 → `lab.storage`** (vorher `{fehler:"auftrag"}`) · Index 27 und 63 → `{fehler:"fassung"}`. Die Anhängeregel ist **nicht** verletzt (kein Index rückt), aber ein alter Code mit Index 24..26 liefert jetzt einen echten Auftrag. Die Aussage der A-Spezifikation („24.576 Codes aus 3 untauglichen Fertigkeiten ergeben `auftrag`") ist damit messbar falsch: **0** |

## 6 · Der Test im Haus

[tests/klassenraum-loesbarkeit.test.js](<../../tests/klassenraum-loesbarkeit.test.js>) (neu) hält die
Behauptung dauerhaft fest — schlank, damit die Suite nicht minutenlang läuft:

| Fall | Umfang | Laufzeit |
|---|---|---|
| alle 27 Fertigkeiten: Injektor + Ziel, wirklich gebrochen, `ticketGueltig`, Lösung heilt | 27 × Seeds 1,2 = 54 Instanzen | 6 609 ms |
| eingefrorene Tabelle gegen Messung (27, Reihenfolge, tauglich ⇔ Injektor, `ersterSeed 1`) | rein lesend | < 1 s |
| der echte Weg der Lehrkraft: erzeugen → Code → `ausCode` → lösen → Abnahme → Ergebnis-Code | 27 Läufe | 3 411 ms |

Die **vollen** Messungen (432 · 1728 · 54) laufen bewusst **nicht** in der Suite, sondern nur in diesem
Befund — sie sind zu langsam für jeden Testlauf. Die drei Fälle arbeiten mit einer Kapsel (eigener
Speicherstand, eigener Store, vollständige Rückgabe danach), damit `erzeugen` keine Sitzung hinterlässt.

> [!warning] Was unterwegs schiefging
> Die Testdatei ging in einem ersten Zwischenstand mit **zwei** Fehlern in den Schwarm: eine Klammer zu
> viel (`}));` statt `});`) erzeugte einen `LADEFEHLER`, der den ganzen Lauf anhielt, und die Kapsel gab
> das **Ergebnis** statt einer Hülle zurück (`t.fn is not a function`). Beides ist behoben und belegt:
> `node --check tests/klassenraum-loesbarkeit.test.js` → Syntax OK, danach **688/690 grün**, und die zwei
> roten Zeilen waren die beiden `Doku: Markdown-Konverter und Seitenbau`-Zeilen (Zählung nach dem
> Doku-Neubau), nicht die neuen Fälle.

## 7 · Nicht geprüft

* **Die 32 × 256-Matrix ist nicht einzeln durchgemessen.** Der Pfad hängt nur am Tabellenmerker
  (`tauglich` je Eintrag), nicht an Sitzung oder Variante — geprüft wurden die Indizes 24, 25, 26, 27 und
  63 mit **Variante 3**. Dass jede der 256 Varianten jeder der 27 Fertigkeiten einen Auftrag ergibt, ist
  damit **nicht** einzeln belegt; belegt ist das volle Fenster 1..64 (Messung 2) und Variante 0/1 (Messung 3).
* **Die vollen Messungen laufen nicht in der Suite** (§ 6). Die 432/1728/54 sind Einzelläufe dieser
  Sitzung, kein Testlauf-Artefakt; ein späterer Testlauf kann sie nicht reproduzieren, ohne die Laufzeit
  zu sprengen.
* **Kein Browser.** Alle Messungen laufen über `tests/run.js` in einem vm-Zusammenhang. Ob die Ansicht
  `klassenraum` in einem echten Browser dieselben Fälle öffnet, ist **nicht** gemessen.
* **Die gebaute Fassung ist nicht geprüft.** `bauen.py`, `tools/seite.py` und `tools/einfach.py` wurden
  **nicht** ausgeführt; ob `web/index.html`, `Netzwerk-Labor.html` und `docs/doku/` nach diesem Befund
  nachgezogen sind, ist offen. Dieses Dokument zählt beim nächsten Seitenbau **eine Karte mehr** —
  die Zahl wird dort gezählt, nicht geschrieben (`tests/doku-seite.test.js:116-126`).
* **`A-codec-probe.js` wurde nicht ausgeführt** (B1): die Zeilen sind **gelesen**, nicht nachgerechnet — vor
  und nach der Korrektur. Dass die abgeleiteten Zähler im echten Probelauf wirklich 27 / 0 / 0 ergeben, ist
  damit **nicht** von mir gemessen. Der Lauf dauert laut Haus ~250 s und schreibt nach `Nachweise/`; das ist
  Sache des Auftrags `determinismus`.
* **Der eingefrorene Beleg wurde nicht neu erzeugt** (B2): nur die Zahl `24/27` und das Dateidatum gelesen.
  Ob die übrigen Zahlen in `A-codec.json` (Rundläufe über 2²⁰ bzw. 2²⁵ Nutzlasten) noch zum heutigen Code
  passen, ist **nicht** geprüft.
* **Der neue Befund ist noch nicht in die Doku-Seite gebaut.** `python tools/seite.py` wurde **nicht**
  ausgeführt (fremder Schreibbereich). Gemessen: Quelle **42** Dokumente (`README.md`, `AGENTS.md`,
  `docs/**/*.md`), gebaut `docs/doku/**/*.html` **42** — die Seitenbau-Prüfung erwartet `42 + 1 = 43`. Bis
  zum nächsten Seitenbau sind die zwei `Doku: Markdown-Konverter und Seitenbau`-Fälle deshalb rot; die Zahl
  wird dort **gezählt, nicht geschrieben** (`tests/doku-seite.test.js:116-126`).
* **Andere Rechner sind nicht gemessen.** Ob dort dieselbe Tabelle und dieselben Injektoren liegen, ist
  hier nicht feststellbar.
* **Der fremde Zwischenstand:** Während dieser Arbeit waren zwei Roten außerhalb meines Auftrags zu sehen
  (`Doku: Markdown-Konverter und Seitenbau`, `Wiki: Klassenraum`) und ein fremder `LADEFEHLER` aus einer
  parallel bearbeiteten Testdatei. Sie gehören **nicht** zu diesem Befund; der letzte eigene Lauf vor
  Abgabe war **688/690 grün** mit genau den zwei Doku-Zeilen rot.

## 8 · Belege (in dieser Sitzung ausgeführt)

| Zweck | Befehl / Handlung | Ergebnis |
|---|---|---|
| Messung 1 | Node-Lauf mit dem Ladepfad aus `tests/run.js` (alle `src/`-Schichten), 27 Skills × Seeds 1..16 | `432/432 in Ordnung`, `27/27 Skills mit vollem Feld`, `0 Befunde`, 41,1 s |
| Messung 2 | derselbe Aufbau, 27 × Seeds 1..64 (`KANON_FENSTER`) | `1728/1728 in Ordnung`, `0 Befunde`, 261,3 s |
| Messung 3 | `erzeugen({skill, seed})` → `ausCode` → `instanzErstellen` → lösen → `Spiel.abnahme` → `ergebnisCode`, je Skill mit Wahl `E` und `AP2` | `54/54 bestanden`, `0 Befunde`, 24,5 s |
| Messung 4 | `Spiel.klassenraum.tabellen()` / `tauglicheFertigkeiten()` gegen `hatInjektor` | 27 tauglich, Indizes 0..26, `ohneDeckung = []`, `unnoetigGesperrt = []` |
| B5 | `KlassenraumCodec.auftragBauen` + `ausCode` für Index 23/24/25/26/27/63 | 24/25/26 liefern `lab.portsec`/`lab.stp`/`lab.storage`; 27 und 63 → `fassung` |
| B1 | `tools/klassenraum-probe/A-codec-probe.js` gelesen — vorher `:722-725`, nach der Korrektur `:730-742` | `- 3` / `3` / `3 * 32 * 256` gegen gemessen 27 / 0 / 0; danach Ableitung aus `messFertigkeitstauglichkeit` mit Kommentar zur überholten Annahme |
| B2 | `Nachweise/Klassenraum/A-codec.json` gelesen, Dateidatum geprüft | `fertigkeitenTauglich: 24/27`, zuletzt geschrieben 07.10.2026, 00:29:47 |
| Testdatei | `node --check tests/klassenraum-loesbarkeit.test.js` | Syntax OK (Exit 0); Zeilenenden **LF**, wie die übrigen Testdateien |
| Testlauf | `node tests/run.js` (voller Lauf) | `688/690 grün`, 2 rot (beide `Doku: Markdown-Konverter und Seitenbau`), 0 übersprungen |
| Randbedingung | `node tools/sim-stand.js` (vor diesem Befund, nach den Injektoren aus task-5) | „Simulation unverändert gegenüber dem Referenzstand" — `src/sim/` blieb unangetastet |

## 9 · Was aus diesem Befund folgt

1. **Die 27 bleiben stehen.** Keine Fertigkeit muss auf `tauglich: false` zurückgesetzt werden; die
   Tabelle ist gedeckt.
2. **B1 ist behoben** (Auftrag `determinismus`): die drei Zähler im Beweismittel werden jetzt aus
   `messFertigkeitstauglichkeit` abgeleitet (`A-codec-probe.js:730-742`) — ein fester Wert veraltet wieder.
   Nachgerechnet habe ich das **nicht** (der Probelauf schreibt nach `Nachweise/`); der nächste Beleg sollte
   27 / 0 / 0 tragen.
3. **B4 ist nachzuziehen** (Leitung): ein Tauglichkeits-Punkt in `docs/Architektur.md` § 12.2 — sonst
   hängt die Entscheidung „27 von 27" an Kommentaren, einem Test und dem CHANGELOG, nicht am Vertrag.
4. **B5 ist zu benennen, wenn je ein alter Auftragscode mit Index 24..26 auftaucht:** er ist **nicht**
   mehr ungültig, sondern liefert jetzt einen Auftrag. Wer alte Codes ausgestellt hat, sollte das wissen.
5. **B2 und B3 bleiben, wie sie sind** — datierte Belege und bewusste Protokolle —, solange niemand sie
   als aktuellen Stand liest. Dieser Befund ist die Stelle, an der der aktuelle Stand steht.
