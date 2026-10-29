---
beschreibung: Die vier Stufen im Programm — Karriere-Stufe, Bildungsstand, Erklärtiefe, Prüfungsstufe — plus Hilfe-Sprosse: je Datenfeld, Wertebereich, Quelle und Beispiel.
erstellt: 2026-10-29
---

# Terminologie — vier Stufen und eine Sprosse

**Warum diese Datei.** Das Wort „Stufe" steht im Programm für **vier verschiedene Dinge**, und
im Code heißt das Feld mehrfach `stufe`. Das ist keine Kleinigkeit: Ein Text „Stufe 4" kann je
nach Bildschirm die Karriere, den Bildungsstand, die Erklärtiefe oder die Hilfeleiter meinen.
Diese Datei hält die Achsen **einmal verbindlich** fest — mit Datenfeld, Wertebereich, Quelle
und Beispiel —, damit neue Texte und Screens nicht wieder raten müssen. Der Ist-Zustand der
Oberfläche (welche sichtbaren Texte heute noch unqualifiziert „Stufe" sagen) steht mit
Datei:Zeile im Audit: `analysis/NetLab/qa/S7b-Terminologie-Audit.md`.

> **Nichts hiervon ist umbenannt.** Diese Datei **dokumentiert** die Achsen; Umbenennungen im
> Code wären ein eigener Eingriff (Vorschläge am Ende, Entscheidung beim Lead). Kein
> `src/`-Code wurde für diese Datei geändert.

## 1 · Die vier Achsen auf einen Blick

| # | Achse | Feld im Code | Werte | Bedeutung | Sichtbar als |
|---|---|---|---|---|---|
| 1 | **Karriere-Stufe** | `Spiel.st.stufe` (1–6) | 1 Azubi · 2 Geselle · 3 Fachkraft · 4 Spezialist · 5 Senior · 6 Storage & Cloud | Fortschritt im Spielstand; steigt über Ruf und Können. **Nie** automatisch durch Hilfe. | „Karriere-Stufe", „Stufe 3 · Fachkraft", Fortschrittsbalken in der Kopfzeile |
| 2 | **Bildungsstand** | `Spiel.einst.stufe` (Rang 1–4) | `azubi` · `azubi-plus` · `geselle` · `meister` | Voreinstellung des **Menschen**: wie viel Hilfe und Erklärung er bekommt. Wird nie automatisch geändert. | „Bildungsstand" (Einstellungen), Freigabe-Hinweis im Lernstand |
| 3 | **Erklärtiefe** | `Spiel.einst.niveau` | `E` · `AP1` · `AP2` | Wie ausführlich Konsole, Simulation und Lehrtexte erklären. Folgt dem Bildungsstand, bleibt einzeln verstellbar. | „Erklärtiefe" (Einstellungen), Lehrtext-Stufen, Konsole |
| 4 | **Prüfungsstufe / -strenge** | `Spiel.einst.wahl` (`auto`\|`E`\|`AP1`\|`AP2`) und `inst.niveau` (aus dem Ticket) | `E` · `AP1` · `AP2` | Wie streng **ein einzelnes Ticket** bewertet wird (Prüfungstag, Abnahme, Tagesrätsel). | Prüfungsansicht, Ergebnis, Ticketkopf |
| 5 | **Hilfe-Sprosse** | `inst.hilfeStufe` (0–6) | 0 Symptom · 1 Checkliste · 2 Werkzeug · 3 Senior · 4 Bereich · 5 Hinweis · 6 Lösung | Wie weit die Hilfeleiter in **diesem Auftrag** geklettert ist; 4/5 kosten ½ Stern, 6 einen ganzen. | „Hilfe 3/6" neben der Leiter (bewusst **nicht** „Stufe 3/6") |

**Quellen:** Achsen 2–4: [`Architektur.md`](../Architektur.md) § 13.1 („Die drei Achsen, nicht
verwechseln") und der Vertrag [`Hilfestellung – Stufen und Schnittstellen.md`](<Hilfestellung – Stufen und Schnittstellen.md>).
Achse 1: `src/spiel/karriere.js` (`KARRIERE_STUFEN`, Nr. 22–30). Achse 5: `src/spiel/hilfe.js`
(`Spiel.HILFE`, Nr. 8–16).

## 2 · Die Achsen einzeln — mit Beispielen

### 2.1 Karriere-Stufe (1–6)

- **Feld:** `Spiel.st.stufe` im Spielstand; Anzeige über `Spiel.stufeInfo()`.
- **Definition:** `Spiel.KARRIERE_STUFEN` in `src/spiel/karriere.js` — je Stufe Name, Ruf-Schwelle
  und freigeschaltete Geräte. `Spiel.KARRIERE_MAX = 6`.
- **Beispiel:** „Stufe 3 · Fachkraft → Spezialist: Ruf 30/55 · Können 8/12".
- **Abgrenzung:** Hat **nichts** mit Hilfe zu tun. Ein Meister (Achse 2) kann Karriere-Stufe 1
  haben — und umgekehrt.

### 2.2 Bildungsstand (4 Werte, Rang 1–4)

- **Feld:** `Spiel.einst.stufe`; Vergleich **immer** über `Spiel.stufe.rang(id)` (1–4), nie über
  den Namen (Architektur § 13.2).
- **Wirkung:** Hilfe-Vorrat **je Ticket** `Spiel.HILFE_KONTO = {azubi: 6, "azubi-plus": 4, geselle: 2, meister: 0}`;
  Freischaltungen in Leiste, Postfach und Lernstand (`src/ui/lernstand-hilfe.js`).
- **Beispiel:** „Stufe 2 von 4 · Azubi+ — Lernanker nach der Antwort" (Freigabe-Hinweis).
- **Abgrenzung:** Eine **Voreinstellung**, kein Fortschritt. Der Mensch stellt sie ein; das
  Programm ändert sie nie selbst.

### 2.3 Erklärtiefe (E · AP1 · AP2)

- **Feld:** `Spiel.einst.niveau`. `Spiel.stufe.setzen(id)` zieht sie nach, lässt sie aber
  einzeln verstellbar (Architektur § 13.1).
- **Wirkung:** Lehrtexte (`DATEN.lehrtexte[code][niveau]`), Erklärungen in Konsole und
  Simulation (`src/ui/simpanel.js`, `src/ui/erklaeren.js`).
- **Beispiel:** „E erklärt, AP1 knapp, AP2 nur Gerätemeldung" (Kopf von `src/ui/simpanel.js`).
- **Abgrenzung:** Steuert nur **wie viel Text** erscheint — nicht, wie bewertet wird (Achse 4).

### 2.4 Prüfungsstufe / Prüfungsstrenge (E · AP1 · AP2)

- **Feld:** `Spiel.einst.wahl` (`auto` = folgt dem Ticket) und `inst.niveau` (aus
  `DATEN.tickets[].stufe`); Logik in `src/spiel/pruefung.js`.
- **Wirkung:** Bewertungsmaßstab eines Tickets, Prüfungstag nach IHK-Notenschlüssel, Abnahme.
- **Beispiel:** Ein Ticket mit `stufe: "AP1"` wird im Prüfungstag als AP1-Aufgabe gewertet.
- **Abgrenzung:** Gleiche **Werte** wie die Erklärtiefe, aber andere Achse. Ein AP1-Ticket kann
  mit Erklärtiefe `E` gespielt werden.

### 2.5 Hilfe-Sprosse (0–6)

- **Feld:** `inst.hilfeStufe` (0–6) plus `inst.hilfen[]` (was gezogen wurde).
- **Leiter:** `Spiel.HILFE` (`src/spiel/hilfe.js`):
  0 Symptom und Ziel (frei) · 1 Fehlersuche-Leiter (frei) · 2 Werkzeughinweis (frei) ·
  3 Frage des Seniors (frei) · 4 Bereich markieren (−½ ★) · 5 Konkreter Hinweis (−½ ★) ·
  6 Lösung vorführen (−1 ★, kein Scheitern danach).
- **Beispiel:** „Hilfe 3/6" im Hilfe-Streifen; „Vorrat leer – ab jetzt kostet es Sterne
  (Stufe 4/5: −½, Stufe 6: −1)" neben dem Hilfekonto (siehe Audit, P2).
- **Abgrenzung:** Misst die Hilfe **in einem Auftrag**, nicht den Bildungsstand des Menschen.
  Die Sprossen sind fest, der Vorrat hängt am Bildungsstand (Achse 2).

## 3 · Weitere „Stufen", die nicht zu den vier Achsen gehören

| Begriff | Wo | Werte | Nicht verwechseln mit |
|---|---|---|---|
| **Fertigkeitsstufe** | `DATEN.skills[].stufe` (`src/daten/basis.js`) | 1–6 (Anforderung einer Fertigkeit) | Karriere-Stufe: gleiche Zahlen, andere Bedeutung. Sichtbar z. B. als „Aufträge ab Stufe X" bei einer Fertigkeit. |
| **Leitner-Fach** | Lernmotor (`fach` 1–5) | 1–5 | Hilfe-Sprosse: „Leitner-Stufe 2 von 5" ist eine Wiederholungsbox. |
| **Erreichbarkeits-Stufe** | `Spiel.pruefung` / Erklärtiefe-Tabellen | s. o. | — |

## 4 · Schreibregeln für neue Texte und Screens

1. **Nie nackt „Stufe"**, wenn auf demselben Bildschirm zwei Achsen vorkommen können. Qualifizieren:
   „Karriere-Stufe", „Bildungsstand", „Erklärtiefe", „Prüfungsstufe", „Hilfe X/6".
2. **Zahl ohne Bezug ist verboten:** „Stufe 4" allein sagt nichts. Immer Achse + Zahl + ggf. Name:
   „Karriere-Stufe 4 · Spezialist", „Stufe 2 von 4 (Azubi+)", „Hilfe 4/6".
3. **Bildungsstand immer über den Rang** vergleichen (1–4), nie über den Namen (Architektur § 13.2).
4. **Prüfungsstufe nur an Tickets** (`inst.niveau`), nicht an Personen.
5. **Bestehende Sonderfälle sind Vorbilder:** Die Leiste zeigt bewusst „**Hilfe 3/6**" statt
   „Stufe 3/6" (`src/ui/spiel.js`, Kommentar bei `ticketLeiste`), und der Trainingsbereich schreibt
   „**Bildungsstand**" statt „Stufe" (`src/ui/training.js`, Kommentar). Diese beiden Entscheidungen
   sind der Maßstab für neue Stellen.

## 5 · Ist-Stand und Vorschläge (nur genannt, nicht umgesetzt)

Der grep-Audit (Datei:Zeile, Klassifikation, Risiko) steht vollständig in
[`analysis/NetLab/qa/S7b-Terminologie-Audit.md`](../../../analysis/NetLab/qa/S7b-Terminologie-Audit.md).
Kurz: von 37 sichtbaren „Stufe"-Strings in `src/ui/**` sind 11 eindeutig Karriere und 4 Hilfe;
**21 sind ohne Qualifier** und damit Kandidaten für Klarstellung. Die zwei heikelsten:

- `src/ui/lernstand-hilfe.js` „Stufe X von 4 · …" — sichtbarer **Bildungsstand** ohne das Wort.
- `src/ui/karriere.js` „Aufträge ab Stufe X" und „Stufe X: <Fertigkeit>" — dort ist es die
  **Fertigkeitsstufe**, im selben Fenster wie die Karriere.

**Umbenennungs-Vorschläge (Entscheidung: Lead; kein Code geändert):**
`st.stufe` → `karriere` · `einst.stufe` → `bildungsstand` · `einst.niveau` → `erklaertiefe` ·
`DATEN.tickets[].stufe` → `pruefungsniveau` · `inst.hilfeStufe` → `hilfeSprosse`.
Alle Umbenennungen berühren Spielstände, Codec und Tests — deshalb bewusst nur Vorschlag.

## 6 · Verwandte Dokumente

- [`Architektur.md`](../Architektur.md) § 13 (Hilfestellung, drei Achsen) und § 3–4 (Datenformen)
- [`Hilfestellung – Stufen und Schnittstellen.md`](<Hilfestellung – Stufen und Schnittstellen.md>) (Vertrag)
- [`CHANGELOG.md`](../CHANGELOG.md) 2.0.5/2.1.0 (wo die Achsen entstanden sind)
- Audit: [`S7b-Terminologie-Audit.md`](../../../analysis/NetLab/qa/S7b-Terminologie-Audit.md)
