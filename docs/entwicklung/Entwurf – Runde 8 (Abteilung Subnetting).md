---
tags: [FISI, Lernspiel, Netzwerk, Runde7, Subnetting, VLAN, Gestaltungsvertrag, Didaktik]
erstellt: 2026-10-31
status: Arbeitsfassung — verbindlicher Vertrag für Runde 8 (Fassung 2.9.0).
---

# Entwurf – Runde 8 „Abteilung Subnetting" (31.10.2026)

**Auftrag des Nutzers (sinngemäß, wörtlich zitiert):** „NetLab braucht ein Subnetting abteil wo das
intensiv beigebracht, gelehrt mit visuellen Hilfselementen und Übungsaufgaben und tools / spielchen
sind nur zum lernen von subnetting und vLAN. Analysiere mit einem Experten Team zum coden und designen
wie das am besten in die bestehenden themes integriert wird und auch wo, ich denke ein eigenes abteil
wird dem gerecht. Generell sollen alle Aufgaben Inhaltlich und vom Lernschwierigkeitsgrad optimiert
werden. Mache das vollständig fertig und melde dich wenn der build und deploy fertig ist."

**Daraus verbindlich:**

1. **Eine eigene Abteilung** „Subnetting" (Ansicht `subnetz`) — kein Anbau an eine bestehende Ansicht.
2. **Intensiv lehren**: geführter Lehrpfad mit kurzen Erklärungen, Rechenweg, Merksätzen.
3. **Visuelle Hilfen**: interaktive Bit-/Block-/Masken-/VLAN-Darstellungen (keine Standbilder).
4. **Übungen**: generierte Aufgaben mit sofortiger Rückmeldung, Rechenweg und Lernstandsverbuchung.
5. **Werkzeuge und Lernspiele** ausschließlich zum Lernen von Subnetting und VLAN — kein Ablenkungsspiel.
6. **Integration in die bestehenden Themes**: alle 5 Zusatz-Themes + hell/dunkel, nur Tokens.
7. **Alle Aufgaben inhaltlich und im Lernschwierigkeitsgrad optimiert** — im neuen Bereich *und* an den
   vorhandenen Subnetting-/VLAN-Aufgaben, die dafür nachweislich schief liegen (§ 10).
8. **Vollständig fertig**: Code, Tests, Doku, Stand, Fassung, Build, Commit, Push, Tag, Release, Deploy.

**Befund (gemessen in dieser Sitzung, read-only):** Subnetting/VLAN sind breit, aber flach verankert:
`lab.subnetz` hat 2 Trainings (beide nur „falsche Maske reparieren"), 6 Mini-Tickets, 1 Fragen-Vorlage
auf E-Niveau und 2 Wiki-Rezepte, die **nur im letzten Oktett** funktionieren; VLSM, Bit-Sicht,
Blockgröße und Adressplan-Übungen fehlen. VLAN/Trunk sind solide, aber ohne Planungs- und
Tagging-Übungen und ohne Native-VLAN-Sicht. Detailbelege: `Nachweise/runde7/befund.md` und § 10.

---

## 1 · Zielbild und Ort

**Ansicht `subnetz`, Titel „Subnetting", Dock-Reihenfolge direkt nach „labor"** (Lernweg:
Labor = anwenden, Subnetting = verstehen und üben, Training = ganze Fälle). Der Eintrag bekommt ein
eigenes Symbol `subnetz` (Bit-Raster) und erscheint automatisch in Befehlspalette und Statusfuß.

**Vier Register** (eine sichtbare Registerleiste, je 44 px hoch):

| Register | Inhalt |
|---|---|
| **Lehrpfad** | 8 Module in 3 Stufen; Karte → Lektion (Text · visuelle Hilfe · geführtes Beispiel · Übungsrunde · Prüfrunde) |
| **Werkzeuge** | 6 interaktive Werkzeuge (§ 7), je mit „Aufgabe dazu"-Weg |
| **Üben & Spielen** | Übungsgenerator (Thema × Stufe × Anzahl) + 3 Lernspiele (§ 8) |
| **Formelsammlung** | Präfix-/Masken-/Host-Tabelle, Rechenweg in 5 Schritten, VLAN-/Trunk-Merkblatt, Fehlerfallen |

Zusätzlich im Kopf der Abteilung: **Stufenwahl** (E · AP1 · AP2, Voreinstellung aus
`Spiel.einst.niveau`), **Fortschrittsring** (8 Module) und eine Zeile „Nächster Schritt" (aus dem
eigenen Fortschritt). Kein Geld, kein Ruf, keine Karrierebelohnung — Lernen ist freiwillig und
kostet nichts (Abgrenzung zu Training/Aufträgen).

**Abgrenzung (bewusst nicht):** keine neuen Fertigkeiten (`DATEN.skills` bleibt 30 — Codec- und
Dichte-Tests sind eingefroren), keine Änderung an `src/sim/`, `src/modell/`, `src/kern/`, `src/cli/`,
keine neuen Tickets, keine Änderung an `src/ui/leiste.js`, `src/ui/karriere.js`,
`src/stil/leiste.css`, `src/stil/karriere.css`, `src/spiel/kurzfrage.js` (Parallel-Sitzung Runde 6).

---

## 2 · Schnittstellen (verbindlich, additiv, headless)

### 2.1 Rechenkern und Aufgabenmotor — `src/spiel/subnetz.js` (Owner W1)

```js
Spiel.subnetz.VERSION = 1;
Spiel.subnetz.STUFEN = ["E", "AP1", "AP2"];
Spiel.subnetz.ARTEN = [ {id, titel, skills:[…], stufen:[…]}, … ]   // § 6, genau diese Reihenfolge

Spiel.subnetz.rechnen(ip, praefix) → {
  ip, praefix, maske,                                    // "192.168.10.70", 26, "255.255.255.192"
  netz, broadcast, ersterHost, letzterHost, hosts,       // IP-Strings bzw. Anzahl
  blockGroesse, oktett, hostBits, netzBits,              // Zahlen
  schritte: [{n, titel, text, ergebnis}, …]              // 4–6 Schritte, immer vollständig
}
Spiel.subnetz.maskeZuPraefix("255.255.255.192") → 26 | null
Spiel.subnetz.praefixZuMaske(26) → "255.255.255.192"
Spiel.subnetz.gleichesNetz(ipA, ipB, praefix) → bool
Spiel.subnetz.plan(basis, [{name, hosts}]) → {ok, fehler?, zeilen:[{name, hosts, praefix, netz,
  maske, broadcast, ersterHost, letzterHost}], karte:[{name, von, bis, praefix}]}
Spiel.subnetz.zusammenfassen(netze) → {ok, praefix, netz, grund}

Spiel.subnetz.aufgabe({art, niveau, seed}) → aufgabe | null       // deterministisch aus seed
Spiel.subnetz.satz({arten?, niveau, anzahl, seed}) → [aufgabe]    // gemischt, ohne Doppelte
Spiel.subnetz.pruefen(aufgabe, antwort) → {richtig, soll, angenommen, rechenweg, erklaerung, hinweis}
Spiel.subnetz.antwort(aufgabe, richtig, {hilfe=false}) → {lern:{vorher,nachher}|null, fortschritt,
  neuereModule:[…]}                                              // einziger Schreibweg in L.* und Store
Spiel.subnetz.fortschritt() → {module:{[id]:{status,richtig,falsch,serie}}, spiele:{[id]:{bestwert,runden}}, gesamt:{richtig,falsch,serie}}
Spiel.subnetz.modulSetzen(id, status) → {…}                       // status: "neu"|"gelesen"|"geuebt"|"sicher"
Spiel.subnetz.zuruecksetzen() → {ok:true}                         // nur eigener Store-Schlüssel
```

**Aufgabe (Form, von W3/W4 verarbeitet):**

```js
{
  id: "netzid-AP1-0007", art: "netzid", niveau: "AP1", skill: "lab.subnetz",
  titel: "Netz-ID bestimmen", frage: "In welchem Netz liegt 192.168.10.70/26?",
  lage: [{label:"Adresse", wert:"192.168.10.70/26"}, …],          // 1–4 Zeilen, alle Angaben der Aufgabe
  eingabe: {art:"ip"|"zahl"|"auswahl"|"maske", optionen?:[{text}], platzhalter?:"…"},
  loesung: {wert, text},                                          // wert: kanonisch, text: Anzeige
  rechenweg: [{n, titel, text, ergebnis}, …],                     // 3–6 Schritte
  erklaerung: "…",  hinweis: "…",                                 // hinweis = Hilfe vor dem Antworten
  visual: {art:"bitlabor"|"blocklineal"|"vlan"|"maske", preset:{…}} | null,
  quelle: "RFC 4632 · Network – Lernfassung (§ 8)"
}
```

**Regeln für den Motor (prüfbar):**

- **Determinismus**: Zufall nur über einen eigenen gesäten Generator (z. B. mulberry32 aus `seed`);
  kein `Math.random`, kein `Date`, keine Uhr. Zweimal `aufgabe({…, seed:7})` ist byte-gleich.
- **Genau eine richtige Antwort**; jede Option ist nur mit den Angaben in `lage` und elementarem
  Netzwerk-Wissen entscheidbar (keine Fangfrage, kein Leserätsel).
- **Der Rechenweg rechnet nach**, nicht vor: `rechenweg` endet mit `loesung.wert`; `pruefen` wirft nie.
- **Formattoleranz**: IP mit Leerzeichen getrimmt, Maske als `/26` oder `255.255.255.192` akzeptiert;
  Zahlen als `4`, `4 Hosts`, `2^2`? (nur `4`) — im Zweifel `soll` und `angenommen` zurückgeben.
- **Verbuchung nur über `L.*`** (nie direkt `store "lern"`): richtig → `L.ueben(skill, true, {hilfe})`;
  falsch → `L.ueben(skill, false)` und `L.fehler("labor-subnetz", skill, text)`; danach
  `Spiel.geaendert("subnetz")` + `Spiel.melden("subnetz-antwort", …)`. `Spiel._trocken` beachten.
- **Eigener Speicher** `store "subnetz"` (v:1) — nur über die API oben; Inhalt:
  `{v:1, module:{[id]:{status,richtig,falsch,serie,zuletzt}}, spiele:{[id]:{bestwert,runden}}, gesamt:{richtig,falsch,serie}}`.
  Kein Feld in `Spiel.st` (Spielstand v:3 bleibt unverändert — keine Migration).
- **Modul „sicher"** = Prüfrunde bestanden (≥ 4 von 5 richtig, ohne Hilfe); danach senkt ein Fehler
  den Status auf „geuebt" zurück, nie unter „gelesen".

### 2.2 Lehrplan und Texte — `src/daten/subnetz-lehrplan.js` (Owner W2)

```js
DATEN.subnetzLehrplan = {
  version: 1,
  formelsammlung: [{titel, saetze:[…], tabelle?:{spalten, zeilen}, merksatz?, visual?}],
  module: [{
    id:"bits", nr:1, stufe:"E", titel:"Bits und Oktette", kicker:"…", lead:"…",
    kern:[…], merksatz:"…",
    visuell:{art:"bitlabor", preset:{ip:"192.168.10.0", praefix:26}},
    beispiel:[{titel, aufgabe, schritte:[{text, ergebnis}], ergebnis}],
    uebung:{arten:["maske","hosts"], niveau:"E", anzahl:4},
    pruefung:{arten:["…"], niveau:"E", anzahl:4, bestehen:3},
    verweise:{wiki:"lab.subnetz", werkzeug:"rechner", training:"tr-subnetz-plan"},
    dauerMin:8
  }, …]
}
```

**8 Module, feste Reihenfolge (Inhalte dürfen geschärft, die Reihenfolge nicht gebrochen werden):**

| Nr | id | Stufe | Titel | Kern | Visuell | Übung |
|---|---|---|---|---|---|---|
| 1 | `bits` | E | Bits und Oktette | 8 Bit = 255; Stellenwerte 128…1 | bitlabor | maske, hosts |
| 2 | `maske` | E | Netzanteil und Hostanteil | Maske als Schablone; /p = p Einsen | maske | maske, netzid(E) |
| 3 | `block` | E | Blockgröße | 2^(32−p), 256−Maskenoktett | blocklineal | hosts, block |
| 4 | `netzid` | E | Netz-ID, Broadcast, Hosts | erste/letzte Adresse, nutzbare Hosts | blocklineal | netzid, broadcast |
| 5 | `schneiden` | AP1 | Netze schneiden | ein /24 → 4/8/16 Netze; Netz-ID zu beliebiger Adresse | blocklineal | netzid, broadcast, subnetze |
| 6 | `vlsm` | AP1 | Adressplan (VLSM) | vom größten zum kleinsten; Reserve | rechner | vlsm, hosts |
| 7 | `vlan` | AP1 | VLAN und Subnetz | VLAN = Broadcast-Domäne = eigenes Netz; Access | vlan | vlan-port, vlan-erreichbar |
| 8 | `pruefung` | AP2 | Prüfungsfälle | /30, /31, Zusammenfassen, Trunk/Native, typische Fehler | vlan + blocklineal | gemischt (§ 6) |

**Regeln:** Jede Lektion hat `kern` (3–6 Sätze), **genau einen** `merksatz`, **mindestens ein**
geführtes `beispiel` mit Schritten, `uebung` und `pruefung`; jede Textlänge bleibt in der
Bildschirmfläche (kein Scroll-Roman); Quellen werden als `quelle` in den Lektionen genannt
(RFC 4632 CIDR, RFC 1918, RFC 3021 /31, IEEE 802.1Q, `Network – Lernfassung`, `04-AP1-Netzwerk`,
`Fragen – Subnetting`, `07-Uebungen-Subnetting-Szenarien`). Sprache: Deutsch, Du-Form, gleiche
Stimme wie der Trainingsbereich; keine Emoji; keine erfundenen Zahlen.

### 2.3 Abteilungs-Oberfläche — `src/ui/subnetz.js` + `src/stil/subnetz.css` (Owner W3)

```js
UI.subnetz = { zeichnen(container), wieder(container), verlassen(), register() }
```

- Registrierung über `(UI.startHaken ||= []).push(...)` + `UI.app.registrieren("subnetz",
  {titel:"Subnetting", symbol:"subnetz", zeigen, wieder, verlassen})`.
- Präfixe: HTML-Klassen `sn-*`; eine CSS-Regel je Klasse (`tools/klassen.py` = 0).
- Kein Top-Level-Zugriff auf andere UI-Module (Ladereihenfolge: `subnetz.js` lädt vor
  `geraetebilder.js`/`bento.js`); alles in Funktionen.
- Nutzt `UI.subnetzwerkzeuge` (2.4) für visuelle Flächen; eigene Werkzeug-Duplikate sind verboten.
- Fortschritt/Speicherung ausschließlich über `Spiel.subnetz.*` (2.1), nie über `store` direkt.
- Der Kopf zeigt Stufenwahl und „Nächster Schritt"; Register wechseln ohne Ansichtswechsel.

### 2.4 Werkzeuge und Spiele — `src/ui/subnetz-werkzeuge.js` + `src/stil/subnetz-werkzeuge.css` (Owner W4)

```js
UI.subnetzwerkzeuge = {
  liste() → [{id, titel, kicker, lead, skill, stufe}],        // § 7, genau 6 Einträge
  zeichnen(container, id, opts = {}) → {zerstoeren()},
    // opts: {ip?, praefix?, niveau?, kompakt?, onErgebnis?(ereignis)}
    // ereignis: {art:"werkzeug", id, skill, geloest:bool, hilfe:bool}
  spiele: {
    liste() → [{id, titel, kicker, lead, skill, stufe, dauerText}],     // § 8, genau 3 Einträge
    starten(container, id, opts = {}) → {zerstoeren()},
    // opts: {niveau?, onEnde?(ergebnis), onErgebnis?(ereignis)}
    // ergebnis: {id, punkte, richtig, falsch, serie, dauerSek, aufgaben:[{frage, richtig, soll}]}
  }
}
```

- Präfixe `sw-*` (Werkzeuge) bzw. `sg-*` (Spiele); eine CSS-Regel je Klasse.
- Werkzeuge sind **visuell und bedienbar**, nicht nur Text: Bits klickbar, Regler/Slider,
  Adressbalken, Ports klickbar. Tastaturbedienbar, Ziele ≥ 44 px, `aria-live` für berechnete Werte.
- Jede Berechnung kommt aus `Spiel.subnetz.*` (keine zweite Rechenquelle im UI).
- Ein Spiel endet mit einem **Lern-Ergebnis** (was saß, was nicht) und verbucht über
  `Spiel.subnetz.antwort(...)`; kein Arcade-Effekt ohne Lernbezug, kein Zufall ohne Seed.
- `onErgebnis` meldet an W3, damit die Abteilung den Fortschritt nachziehen kann.

### 2.5 Integration (Owner Leitung)

| Ort | Änderung |
|---|---|
| `src/ui/app.js` | `REIHE = ["heute","postfach","labor","subnetz","training",…]` |
| `src/ui/geraetebilder.js` | ein Glyph `subnetz` (Bit-Raster) in der Symboltabelle (W3 liefert) |
| `tools/rauch.py` | ein Fall „Subnetting" (Register sichtbar, Werkzeug öffnet, Übungsrunde startet) → 48/48 |
| `src/ui/hub.js` | **eine** Zeile/Kachel im Lernbereich „Weiterlernen: Subnetting" mit Fortschritt (nur wenn Platz messbar frei ist, sonst Befehlspalette + Dock) |
| Befehlspalette | automatisch über `UI.app.liste()`; zusätzlich Befehl „Subnetting: Werkzeug <name>" (W3 registriert über `UI.palette.befehl`) |
| Abteilung intern | Verweise zu Wiki (`UI.wiki.oeffnen`), Labor, Training (Knöpfe, die die Ansicht wechseln) |

---

## 3 · Gestaltung — Einfügung in die bestehenden Themes

Verbindlich ist der Gestaltungsvertrag § 22 (Bento 2.5) und der Themes-Vertrag:

- **Nur Tokens** aus `basis.css` (Farben, Typo `--fs-*`, Abstände {0,4,8,12,16,24,32}, Radien,
  `--dauer-*`). Keine Farb-/Radius-/Schrift-/Abstands-/Dauer-Literale, kein `!important`,
  kein eigener Reduced-Motion-Block, keine doppelten Selektoren.
- **Bausteine der Leitung nutzen**: `.bn-raster`, `.bn-k`, `.bn-kopf`, `.bn-kicker`, `.bn-titel`,
  `.bn-lead`, `.bn-meta`, `.bn-fuss`, `.bn-zeile`, `.bn-wert`, `.bn-chips`, `.bn-chip`, `.bn-leer`,
  `.bn-s3…s12`; keine Kopie dieser Bausteine. Eigene Klassen nur, wo Bento nichts hat.
- **Themes**: alle 5 Zusatz-Themes + dunkel/hell/system, geprüft bei 1440, 960 und 720 px;
  Fließtext ≥ 7:1, `--muted/--faint` ≥ 4,5:1 auf `--bg`/`--panel`; Akzente nur als Paar mit
  `--accent-ink`. **Hell-Falle beachten**: zwei helle Wege (`prefers-color-scheme`-Block und
  `[data-theme="light"]`); bei „system" setzt `app.js` kein `data-theme`.
- **Semantik der Signalfarben**: `--mint` Handlung/richtig, `--iris` Wissen/Struktur,
  `--amber` Zeit/Hinweis, `--koralle` Fehler. VLAN-Farben `--vlan-1…8` **nur mit Nummer/Beschriftung**.
  Subnetz-Bits: Netzanteil `--accent`, Hostanteil `--panel-3`/`--muted`, Rueckmeldung ok/bad.
- **Ziele und Bedienung**: Bedienelemente ≥ 44 px (global `.knopf` ist 40 px → scopen),
  Fokusring aus `basis.css` nicht überschreiben, `Esc`/Tab sauber, `aria-live` für Ergebnisse,
  Bewegung nur über Tokens und mit `UI.bewegung()`-Rücksicht.
- **Typografie**: Deutsch mit echten Umlauten; Mikrolabels in `--mono` klein, Titel in `--display`;
  keine Emoji in der Bedienoberfläche; keine erfundenen Kennzahlen.

---

## 4 · Speicher und Fortschritt (ein Ort)

- Eigener Schlüssel `store "subnetz"`, `v:1` (2.1). Kein Feld im Spielstand (`Spiel.st`, v:3) —
  dessen Migration bleibt unangetastet, alte Stände sind kompatibel.
- **Lernstands-Verbuchung nur über `L.ueben`/`L.fehler`** (Wache: `tests/lernmotor-wache.test.js`).
  Werkzeug zeigt Lösung → `{hilfe:true}`; Spiel/Übung ohne Hilfe → `{hilfe:false}`.
- Kein Geld/Ruf; die Abteilung ist freiwillig und kostenlos.
- Fortschritt in der Abteilung: Module (8) × Status; Kopf zeigt `sicher/8`; „Nächster Schritt"
  aus erstem Modul mit Status < „sicher" in Stufenreihenfolge (E → AP1 → AP2).
- `Spiel.subnetz.zuruecksetzen()` löscht nur `store "subnetz"` (nicht den Lernstand).

---

## 5 · Lernstufen-Matrix (Inhalt und Schwierigkeit — verbindlich)

Drei Stufen, an die vorhandene Achse `niveau` (E/AP1/AP2) angeschlossen. Jede generierte Aufgabe
trägt genau eine Stufe; die Stufe bestimmt Zahlenraum, Schrittzahl und Hilfen:

| Merkmal | E | AP1 | AP2 |
|---|---|---|---|
| Präfixe | /24–/28 | /20–/30 | /16–/31 (inkl. /30, /31) |
| Schritte bis zur Lösung | 1 | 2–3 | 3–5 |
| Oktett-Lage | letztes Oktett, Blockgröße ≤ 128 | letztes oder vorletztes Oktett | beliebiges Oktett |
| Hilfen in der Aufgabe | `hinweis` immer gesetzt, Rechenweg anforderbar | `hinweis` optional | kein `hinweis` |
| VLSM | – | 2–3 Netze, ein Schritt | 4–5 Netze, Reihenfolge + Reserve |
| VLAN | ein Access-Port | zwei Ports/VLAN, Erreichbarkeit | Trunk, Tagging, Native, allowed-Liste |
| Zeitdruck | keiner | keiner | optional (Spiel „Präfix-Blitz" nur AP1/AP2) |
| Formulierung | „Wie lautet …" ohne Zusatzbedingung | eine Bedingung | Bedingung + Gegenprobe/Falle benannt |

**Wortregeln (testbar):** Frage ≤ 140 Zeichen wie bei Minis? Nein — Abteilungsaufgaben dürfen länger
sein (bis 220), aber `lage` trägt alle Angaben; **keine** unbestimmten Wörter („irgendwie", „vielleicht"),
keine Abkürzung ohne Auflösung beim ersten Vorkommen, keine negativen Fangfragen auf E, genau eine
richtige Option, Distraktoren sind typische Denkfehler (nicht offensichtlich falsch), jede Erklärung
nennt den Rechenweg in Worten.

**Optimierung der vorhandenen Aufgaben (§ 10)** — jede Änderung wird belegt und getestet.

---

## 6 · Aufgabentypen (genau diese 11)

| id | Titel | skill | Stufen | Eingabe | Kern |
|---|---|---|---|---|---|
| `netzid` | Netz-ID bestimmen | lab.subnetz | E/AP1/AP2 | ip | Netz-ID zu Adresse/Präfix |
| `broadcast` | Broadcast bestimmen | lab.subnetz | E/AP1/AP2 | ip | letzte Adresse des Blocks |
| `hosts` | Nutzbare Hosts | lab.subnetz | E/AP1 | zahl | 2^Hostbits − 2 (bei /31 Hinweis) |
| `maske` | Maske ↔ Präfix | lab.subnetz | E/AP1 | maske | beide Richtungen |
| `block` | Blockgröße und Raster | lab.subnetz | E/AP1/AP2 | zahl | 2^(32−p), Raster im Oktett |
| `subnetze` | Netze schneiden/zählen | lab.subnetz | AP1/AP2 | zahl | Anzahl Netze einer Teilung |
| `vlsm` | Adressplan-Schritt (VLSM) | lab.subnetz | AP1/AP2 | auswahl | nächster Block/Maske im Plan |
| `zusammenfassen` | Zusammenfassen (Route) | lab.subnetz | AP2 | auswahl | Supernetz zu n Netzen |
| `vlan-port` | VLAN am Port | lab.vlan | E/AP1 | auswahl | Access-Port → VLAN |
| `vlan-erreichbar` | Gleiches VLAN? | lab.vlan | AP1/AP2 | auswahl | Broadcast-Domäne/Erreichbarkeit |
| `trunk` | Trunk und Tagging | lab.trunk | AP2 | auswahl | Tag/Native/allowed |

Jeder Typ hat Vorlagen für alle genannten Stufen, mindestens 3 Varianten je Stufe, und liefert
`rechenweg`, `erklaerung`, `hinweis` gemäß § 5.

---

## 7 · Werkzeuge (genau diese 6)

| id | Werkzeug | Lernen | Bedienung |
|---|---|---|---|
| `bitlabor` | 32-Bit-Labor | Bit-Sicht, Oktette, Maskenschablone | Bits klickbar/umschaltbar, Oktett-Dezimalwert live, Maske überlagert (Netz-/Hostbits), Ergebnis Netz-ID/Broadcast/Hosts |
| `maskenleiste` | Masken-Schieber | Präfix ↔ Maske ↔ Block ↔ Hosts | Regler 0–32, Anzeige Dotted + Binär + Tabelle |
| `blocklineal` | Blocklineal | Blockgrenzen, Netz-ID im Raster | Präfixwahl, Adressleiste 0–255 (bzw. Oktettwahl), Marker, „einrasten" |
| `rechner` | Rechenweg-Assistent | Rechenweg sicher anwenden | IP + Präfix eingeben; „Schritt zeigen"; optional Selbstrechnen mit Schrittprüfung |
| `vlsm` | Adressplaner | VLSM planen | Basisnetz + Bedarfszeilen; Plan erzeugen; Balken zeigt Auslastung/Reserve |
| `vlan` | VLAN-Werkzeug | Access/Trunk, Broadcast-Domäne, Tagging | 8-Port-Switch, Ports klickbar (Access/Trunk, VLAN), Frames mit Tag, Erreichbarkeitsmatrix |

Jedes Werkzeug: Titel, Mikrolabel, 1 Satz Lernziel, Bedienung, Ergebnisanzeige, Knopf
„Aufgabe dazu" (führt in eine passende Übungsrunde) und „Zurück" — alles über `UI.subnetzwerkzeuge`.

## 8 · Lernspiele (genau diese 3)

| id | Spiel | Lernen | Ablauf |
|---|---|---|---|
| `praefix-blitz` | Präfix-Blitz | Fluency Präfix↔Maske↔Hosts | 60 s, Karten mit 4 Antworten, Serie + Bestwert, am Ende Fehlerauswertung (AP1/AP2) |
| `netz-sortierer` | Netz-Sortierer | Adressen sicher einem Netz zuordnen | 8 Adressen auf 3 Netze ziehen/klicken, Auflösung mit Rechenweg (E/AP1) |
| `vlan-patcher` | VLAN-Patcher | Ports, Access/Trunk, Erreichbarkeit | Szenario mit Anforderung, Ports konfigurieren, „Prüfen" zeigt Differenz (AP1/AP2) |

Alle Spiele: deterministischer Aufgaben-Seed, Ergebnisverbuchung über `Spiel.subnetz.antwort`,
Bestwert in `store "subnetz"`, klare Lernziele, kein Spiel ohne Subnetting/VLAN-Bezug, kein
Punktesystem, das Fehler belohnt.

---

## 9 · Schreibrechte (ein Schreiber je Datei; Leitung integriert)

| Owner | Dateien (neu → **fett**) |
|---|---|
| **W1 Rechenkern** | **`src/spiel/subnetz.js`**, **`tests/subnetz-kern.test.js`**, **`tests/subnetz-aufgaben.test.js`** |
| **W2 Lehrplan/Inhalte** | **`src/daten/subnetz-lehrplan.js`**, **`tests/subnetz-lehrplan.test.js`**, **`tests/subnetz-inhalte.test.js`**, **`docs/entwicklung/Subnetting – Lernstufen-Matrix.md`**; Änderungen: `src/daten/trainings.js`, `src/daten/mini.js`, `src/daten/fragen-vorlagen.js`, `src/daten/mini-denkhilfen*.js` (nur § 10); `tests/fragen-generator.test.js` nur für den `GEGEN`-Eintrag der geänderten Vorlage. Zwingt eine Änderung einen weiteren bestehenden Test, wird **nur die betroffene Erwartung fachlich begründet** nachgezogen (nie abgeschwächt), im Bericht genannt. |
| **W3 Oberfläche** | **`src/ui/subnetz.js`**, **`src/stil/subnetz.css`**, **`tests/ui-subnetz.test.js`**; Änderung: `src/ui/geraetebilder.js` (ein Symbol `subnetz`, ans Ende der Tabelle) |
| **W4 Werkzeuge/Spiele** | **`src/ui/subnetz-werkzeuge.js`**, **`src/stil/subnetz-werkzeuge.css`**, **`tests/ui-subnetz-werkzeuge.test.js`**, **`tests/subnetz-spiele.test.js`** |
| **Leitung** | `src/ui/app.js`, `src/ui/hub.js`, `tools/rauch.py`, `docs/**`, `README.md`, `AGENTS.md`, `bauen.py`-Fassung, `android/bauen.py`, `android/bauen.py VERSION_CODE`, `src/seite.html` nur falls nötig, Build, Commit, Push, Tag, Release |

**Regeln:** kein `git add/Push` für Owner; keine fremden Dateien; Zeilenenden bewahren
(`git ls-files --eol`), neue Dateien LF; keine Tests abschwächen (nur fachlich begründet
nachziehen); keine neue Fertigkeit; keine Änderung an Parallel-Sitzungs-Dateien; keine Software
installieren; Antworten auf Deutsch.

**Abnahme-Gates (Leitung, am Ende):** `node tests/run.js` grün, 0 übersprungen ·
`sh tools/test.sh --rauch` **48/48** · `python tools/klassen.py` **0** · `python tools/ethos.py`
**GRÜN** (R4/R9/R10 nicht schlechter) · `python tools/umlaute.py` GRÜN · `node tools/sim-stand.js`
unverändert · `python tools/seite.py --pruefen` GRÜN · `python tools/stand.py --pruefen` 0 ·
`python tools/einfach.py` beide byte-gleich · Sichtprüfung 1440/960/720 × 7 Theme-Zustände ×
Bewegung aus, Belege unter `Nachweise/runde7/`.

---

## 10 · Optimierung der vorhandenen Subnetting-/VLAN-Aufgaben (belegt)

Diese Befunde stammen aus der read-only-Analyse; W2 setzt die fachlich sicheren um, jede Änderung
mit Testbeleg. Was nicht umgesetzt wird, steht begründet im Bericht.

1. **`vlan-netzgroesse` (AP2, `fragen-vorlagen.js`)** — fragt „/24 auf n VLANs ⇒ welche Maske" und
   lehrt damit das falsche Planungsmodell. Ersetzen durch **Hosts je VLAN ⇒ Präfix** (VLSM-Denken)
   und `GEGEN`-Rechnung im Test nachziehen.
2. **`mini-sub-1` (E) / `mini-sub-3` (AP2)** — Schwierigkeit invertiert: Netzadresse /26 ist AP1-Stoff,
   „Hosts in /28" ist E. **Stufen tauschen** (Multiset bleibt gleich, Testbilanz unverändert).
3. **`mini-trunk-5` (AP2)** — „Im Native VLAN" gegen „Immer in VLAN 1" ist ohne Native-Angabe
   doppeldeutig. Kontext ins Ticket/Schnappschuss (Native VLAN ausdrücklich nennen), genau eine
   richtige Antwort.
4. **Fehlende Denkhilfen** für `mini-vlan-6`, `mini-trunk-5`, `mini-rostick-4` ergänzen
   (Fallback auf Fertigkeitssatz ist für Transferaufgaben zu schwach).
5. **Doppelte Trainings** `tr-trunk-erlauben`/`tr-trunk-allowed` und gleicher Titel
   `tr-netz-maske`/`tr-netz-nachbar` — Titel/Beschreibung unterscheidbar machen (keine
   Progression vortäuschen).
6. **`tr-subnetz-plan` (E-Format, AP1-Inhalt)** — Beschreibung/Schritte auf E-Niveau stützen
   (Teiltabelle vorgeben, ein Schritt), ohne das Trainingsformat (`art`) zu ändern (Testregel
   `niveau = f(art)` bleibt).
7. **VLSM/Blockgröße im Wiki** — der Rechenweg gilt nur im letzten Oktett; im Lehrplan (§ 2.2) wird
   die Bit-/Block-Brücke für alle Präfixe gelehrt (Wiki bleibt unangetastet: `wiki.js` gehört der
   Leitung, Änderung dort nur bei Bedarf in dieser Runde).

**Nicht Teil dieser Runde** (begründet): neue `DATEN.skills` (Codec-/Dichte-Tests eingefroren), neue
Tickets, Änderungen an `spiel/injektoren.js`, `spiel/mini.js`-Mechanik, Lernmotor.

---

## 11 · Abnahme und Fassung

- Fassung **2.9.0** (neue Abteilung = Feature auf 2.8.0; die Fassung 2.8.0 der Parallel-Sitzung
  mit Kurzübung und Flugschreiber bleibt als eigener Commit davor). `VERSION_CODE = 20901` in
  `android/bauen.py`.
- Doku: dieser Entwurf; `docs/Architektur.md` § 26; `docs/entwicklung/Design – Spielspaß 2.0.md`
  § 43; `docs/CHANGELOG.md`; `docs/STAND.md`/`README.md` über `tools/stand.py`; Doku-Seite über
  `tools/seite.py`; `Übergabe – Stand 31.10.2026 – Runde 8.md`.
- Build: `python bauen.py`, `python tools/einfach.py` (beide Ziele), `cargo tauri build --no-bundle`
  (echte `.exe`), `python tools/seite.py`, `python tools/stand.py`.
- Deploy: Commit auf `ausbau-1.2`, Push des Zweigs, Tag `v2.9.0`, Push des Tags — stehende
  Nutzerfreigabe für Push/Tag/Release (30.10.2026, gilt weiter). Danach **messen**: Live-Seite
  SHA256 gegen `docs/index.html`, Release-Anhänge, ProductVersion, CI-Läufe. Der Bericht nennt
  Live-URL, Release-URL, Prüfsummen und alles, was nicht geprüft wurde.

## 12 · Risiken und Gegenmaßnahmen

- **Parallel-Sitzung (Runde 6)** arbeitet im selben Arbeitsbaum (`leiste.js`, `leiste.css`,
  `karriere.js`, `kurzfrage.js`, deren Tests). Diese Dateien sind tabu; vor Commit/Push wird geprüft,
  dass die Parallel-Arbeit committet ist (sonst nicht bauen/veröffentlichen).
- **Testlaufdauer**: `node tests/run.js` führt immer alle Testdateien aus. Für die Entwicklung
  `node Nachweise/runde7/schnelltest.js tests/<datei>.test.js` (nur eine Datei, gleiche Module);
  Gesamtlauf bleibt das Abnahme-Gate.
- **Dock-Breite**: 76 px, bei 720 px schmaler; Titel „Subnetting" wird geprüft, notfalls im Dock
  „Subnetz" und Titel „Subnetting" (Messung, keine Annahme).
- **R12** (max. 6 Bedienelemente) ist ohne `--dom` nicht gemessen; die Abteilung bleibt ruhig
  (Register + Kopf, keine Knopfwüste).
- **Kein Bau/Release, solange die Parallel-Sitzung uncommittet arbeitet** (sonst enthielte der
  Einzeldatei-Bau fremden, unfertigen Code).
