---
tags: [FISI, Lernspiel, Netzwerk, Runde6, Gestaltungsvertrag, Kurzübung, Didaktik]
erstellt: 2026-10-31
status: Arbeitsfassung — verbindlicher Vertrag für Runde 6 (Fassung 2.7.1).
---

# Entwurf – Runde 6 „Kurzübung mit echtem Kontext" (31.10.2026)

**Auftrag des Nutzers (wörtlich).** Zum Screenshot der aufgeklappten Minileiste: „schon deutlich
besser, aber sowas hier meine ich, wie soll der Schüler das hier lösen? Hier fehlen doch vollkommen
die Kontextinfos, woher soll er wissen wie das Netz ist und ob der PC dazugehört? Das ist ein gutes
Beispiel für das Problem."

**Befund** (Bild: `Nachweise/runde6/befund-kurzuebung-kontextlos.png`). Die Leiste zeigt unter
„Kurzübung" eine generische Mini-Frage („Antwortet 10.0.0.1 auf einen Ping aus dem LAN?") mit einer
Kontextzeile, die nur Kunde und Auftragstitel nennt. Das Netz des Auftrags (Geräte, Adressen, Ports,
VLANs) ist nicht sichtbar, die Frage stammt aus einem allgemeinen Pool und ist mit dem gezeigten
Wissen nicht lösbar. Genau dieses Muster soll verschwinden.

## 1 · Zielbild

**Kurzübung = Frage aus dem laufenden Auftrag, mit sichtbarer Lage.** Die Frage wird aus dem echten
Netz des offenen Auftrags erzeugt; die Fakten, die zur Antwort nötig sind, stehen als **Lage-Block**
(2–4 Zeilen: Gerät · Adresse/Maske, Port · Modus · VLAN, Zustand) direkt über der Frage. Jede Frage
ist mit genau diesen Angaben beantwortbar; keine Frage ohne Lage. Passt keine Frage (kein offener
Auftrag, kein verwertbares Netz), zeigt die Leiste **keine unlösbare Frage**, sondern einen ruhigen
Denkanstoß mit Weg ins Labor.

**Kern:** neues, reines Modul `src/spiel/kurzfrage.js` erzeugt aus `inst` ein Frage-Objekt;
die Leiste rendert es im Kurzübung-Modul anstelle der generischen Mini-Frage. Die generische
Mini-Frage bleibt als „Kopf-/Grundlagenübung" im Mini-Ticket-Dialog erhalten, wird in der Leiste bei
offenem Auftrag aber nicht mehr gezeigt.

## 2 · Schnittstelle (verbindlich, additiv, headless)

```js
Spiel.kurzfrage.fuer(inst, {niveau} = {}) → frage | null
frage = {
  id:       "netz" | "maske" | "gateway" | "portmodus" | "zustand",
  titel:    "Gleiches Netz?" | …,
  frage:    "Können PC-Kasse und Drucker sich ohne Router direkt erreichen?",
  lage:     [{label: "PC-Kasse", wert: "192.168.110.36 /24"}, …],
  optionen: [{text: "Ja – beide liegen in 192.168.110.0/24", richtig: true}, …],
  erklaerung: "…",
  ort:      {art: "geraet", geraet} | {art: "port", geraet, port} | null
}
```

Regeln: deterministisch (Seed aus `inst.iid`, kein `Math.random` ohne Seed, keine Uhr);
genau eine richtige Option; jede Option anhand der `lage` und elementarem Netzwerk-Wissen
entscheidbar; nur echte Daten aus `inst.netz`/`Modell`/`IP`/`Sim`; **niemals die
Lösung des Auftrags verraten** (keine Injektor-Art, kein Grund-Code, keine Diagnose); Niveau:
E nur `netz`/`zustand`, AP1 zusätzlich `maske`/`gateway`, AP2 zusätzlich `portmodus`.

## 3 · Vorlagen (alle aus dem echten Netz)

1. **netz** — zwei Hosts mit gültiger Adresse (bevorzugt Geräte aus den Zielen). Lage: beide Namen
   + `ip / maske`. Frage: erreichen sie sich ohne Router? Antwort aus `IP.gleichesNetz`.
2. **maske** — ein Host mit `ip/maske`. Frage: Wie lautet die Netzadresse? Optionen: richtige
   `IP.netz`-Adresse + zwei plausible falsche (Broadcast, Nachbarnetz).
3. **gateway** — Host mit `ip/maske/gw`. Lage: Adresse, Maske, Gateway. Frage: liegt das
   Gateway im eigenen Netz? Antwort aus `IP.gleichesNetz(ip, gw, maske)`.
4. **portmodus** — Switch-Port mit Kabel zu einem Host. Lage: Port · Modus · VLAN (bzw. Trunk).
   Frage: Access- oder Trunk-Port / darf ein Frame aus VLAN n über diesen Port? Antwort aus
   `running.ports[port]`.
5. **zustand** — Gerät mit `an:false` oder Port `shutdown`/Link unten an einem Ziel. Lage:
   Gerät, Zustand, ggf. Adresse. Frage: was folgt daraus? Optionen aus dem gezeigten Zustand.

Keine Vorlage anwendbar → `null` — die Leiste zeigt dann keinen Quiz, sondern Hinweis + Weg ins
Labor.

## 4 · Oberfläche (Leiste)

- **Zugeklappt (Ruhe 300 px):** eine Zeile `KURZÜBUNG · <Art>` links, `Antworten ▸` rechts;
  darunter die Kontextzeile („Zum Auftrag: <Kunde> · <Titel>"). Keine Frage im Ruhezustand.
- **Geöffnet (Karte wächst wie heute):** Kontextzeile, **Lage-Block** (2–4 Zeilen, Mikrolabel
  „LAGE ZUM AUFTRAG"), Frage (2–3 Zeilen), drei Antwortflächen ≥ 32 px; nach der Antwort Erklärung
  + feste Aktion „Im Labor prüfen" (nutzt `ort`, sonst Labor öffnen).
- **Ohne Frage:** statt Quiz der nächste Schritt aus `Spiel.naechster` bzw. ein ehrlicher Satz
  und „Im Labor öffnen" — nichts Unlösbares.
- Antwort-Zustand vollständig sichtbar (keine abgeschnittenen Sätze); Karte darf dafür wachsen;
  prüfen bei 1440/960/720, 5 Themes + hell, Bewegung aus.
- Testhaken bleiben: `.lk-zeile` mit exakt sechs Kindern, `.lk-mini`, `.lk-mini-hilfe`,
  `.lk-hilfe-knopf`, `.lk-oeffnen`, Maße 300×56 / 320×300; das generische Mini-System
  (`UI.karriere.miniZeichnen`, `UI.leiste.miniBereich`) bleibt funktionsfähig (Fallback).
- Die generische Mini-Frage bekommt im Mini-Ticket-Dialog (karriere.js, Leitung) das Mikrolabel
  „KOPFÜBUNG · unabhängig vom Auftrag" und einen einordnenden Satz.

## 5 · Tests

- **Neu** `tests/kurzfrage.test.js` (headless): für die Beispiel-Netze liefert `fuer(inst)`
  ein Objekt mit 2–4 Lage-Zeilen, genau einer richtigen Option, Erklärung, deterministisch (zweimal
  gleich), niveau-abhängig, `null` ohne Auftrag/Adresse; die richtige Option ist gegen
  `IP`/`Modell`/`inst.netz` nachgerechnet; kein Lösungstext (kein Injektor-Name/-Grund).
- Bestehende Tests bleiben grün; `tests/spiel-leiste-hilfe.test.js` (Struktur/Maße) nicht ändern.
  Neue DOM-Klassen mit `.lk-`-Präfix, Beleg in `tests/ui-kurzfrage.test.js` (DOM-Emulation).

## 6 · Schreibrechte

| Owner | Dateien |
|---|---|
| **W1 · Kurzfrage** | `src/spiel/kurzfrage.js` (neu), `tests/kurzfrage.test.js` (neu) |
| **W2 · Leisten-Modul** | `src/ui/leiste.js`, `src/stil/leiste.css` |
| **W3 · Mini-Dialog** | `src/ui/karriere.js` (nur `miniDialog`/`leisteMini`-Beschriftung) |
| **Leitung** | `src/stil/basis.css`, Tests, Doku, Fassung, Build, Commit, Release |
| **Prüfer 1** | read-only: Didaktik/Design (lösbar? Kontext sichtbar? Hierarchie) |
| **Prüfer 2** | read-only: Theme/A11y/Struktur (Fokus, Ziele ≥ 32/44 px, Themes, Testhaken) |

Regeln wie Runde 5: ein Schreiber je Datei; kein Commit/Push; kein `git add -A`; keine fremden
Dateien; Kiosk-Dateien der parallelen Sitzung tabu; private Vorschau/Fotos; keine Tests ändern.

## 7 · Abnahme und Fassung

Gates: `node tests/run.js` grün (0 übersprungen) · Rauchtest 45/45 · `klassen.py` 0 ·
`ethos.py` GRÜN (R4/R9/R10 nicht schlechter) · `umlaute.py` GRÜN · `sim-stand.js`
unverändert. Sichtprüfung 1440/960/720, 5 Themes + hell, Bewegung aus; Beleg: Screenshot der
geöffneten Kurzübung mit sichtbarer Lage und lösbarer Frage. Fassung **2.7.1** (Didaktik-Fix auf
2.7.0), Push/Tag/Release/Live-Nachweis wie in Runde 5 (stehende Freigabe).

## 8 · Ergebnis (31.10.2026, in einer sauberen Prüfkopie auf HEAD gemessen)

Die parallele Sitzung (Runde „Abteilung Subnetting") arbeitet im selben Arbeitsbaum; ihre
Testdateien waren zeitweise nicht ladbar. Für die Abnahme wurde deshalb eine **saubere Prüfkopie**
aus \`HEAD\` (f0db49b) mit genau den Runde-6-Dateien gebaut und dort gemessen — das ist der
belastbare Stand dieses Strangs:

- \`node tests/run.js\`: **950/950 grün**, 0 übersprungen, 111 Testdateien, 96 Module
  (932 → 950: +8 Kurzfrage-Tests, +10 DOM-Tests der Leiste).
- \`klassen.py\` **0** · \`ethos.py\` **GRÜN** (R1 23, R2 17, R3 4, R4 135, R9 58, R10 42; R12 nicht
  gemessen) · \`umlaute.py\` **GRÜN** · \`sim-stand.js\` **Simulation unverändert**.
- Erzeugt: **139 Module** (96 headless) — +1 Modul \`src/spiel/kurzfrage.js\`.
- Belegbilder (Vorschau der sauberen Kopie + Fotos aus der Arbeitskopie):
  \`Nachweise/bento/kurzfrage/kurzuebung-offen-1440.png\`, \`kurzuebung-antwort-1440.png\`,
  \`leiste-auf.png\` — geöffnete Kurzübung mit **Lage zum Auftrag** (Gerät, Adresse, Maske,
  Standardgateway), Frage, drei Antwortflächen, nach der Antwort Erklärung + „Im Labor prüfen".
- Der Befund aus \`Nachweise/runde6/befund-kurzuebung-kontextlos.png\` (generische 10.0.0.1-Frage
  ohne Netz) ist damit weg: bei offenem Auftrag zeigt die Leiste die Kontextfrage; ohne
  verwertbares Netz zeigt sie **keine** Frage, sondern den Weg ins Labor.
- Die generische Mini-Frage bleibt als **Kopfübung** im Mini-Ticket-Dialog und ist dort als
  „unabhängig vom laufenden Auftrag" eingeordnet (karriere.js, \`mk-einordnung\`).

**Nicht geprüft:** echte Maus im Tauri-Fenster, R12, Android-APK; die Leisten-Fensterhöhen im
Browser gemessen (Karte 616 px geöffnet / 736 px beantwortet), im Tauri-Fenster nicht durchgeklickt.
