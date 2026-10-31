---
tags: [FISI, Lernspiel, Netzwerk, Runde7, Gestaltungsvertrag, Flugschreiber, Aufmerksamkeitsführung]
erstellt: 2026-10-31
status: Arbeitsfassung — verbindlicher Vertrag für Runde 7 (Flugschreiber-Aufmerksamkeit).
---

# Entwurf – Runde 7 „Der Flugschreiber führt das Auge" (31.10.2026)

**Auftrag des Nutzers (wörtlich).** „Der Design ethos ist noch shitty und unübersichtlich, warum sind
die Buttons so groß? Das Auge sollte auf die Infos hingezogen werden. Achte auf die
Aufmerksamkeitsführung im UI und verbessere es mit." — Bild: `Nachweise/runde7/befund-flugschreiber-laut.png`
(Simulations-Panel im Dock: „Hilfe an", „Ergebnis"/„Schritt für Schritt", „Zum Fundort",
„Gerät zeigen" konkurrieren mit dem Inhalt; viele gleich laute Boxen und große Flächen).

**Befund (aus dem Bild abgelesen).**
1. Vier bis fünf Knöpfe sind optisch gleich laut: „Hilfe an" (groß, outline), „Ergebnis"/„Schritt für
   Schritt" (zwei große Flächen, eine grün gefüllt), „Zum Fundort" (große gefüllte Fläche im
   Warnbanner), „Gerät zeigen" (großer Outline-Knopf). Kein Knopf ist erkennbar der Hauptweg.
2. Vier Boxen mit Rahmen/Grundflächen direkt untereinander (Ergebnis, Warnbanner, Hilfe, Transport) —
   das Auge bekommt keine ruhige Lesespalte.
3. Der Inhalt ist klein gesetzt und wird von den Flächen erschlagen; Hierarchie entsteht nur über
   Farbe (rot/grün), nicht über Größe, Gewicht und Abstand.
4. Hinweise stehen als Fließtext/Bullets ohne hängenden Einzug; „Erster Fehler · PC-Buero
   PORT_SHUTDOWN" ist eine Zeile, der eigentliche Satz darunter wirkt wie ein Anhang.

## 1 · Zielbild (Aufmerksamkeitsführung)

**Eine Lesespalte, drei Ebenen, ein Hauptweg.**
- **Ebene 1 – Ergebnis:** Mikrolabel (FLUGSCHREIBER · <Kunde>), eine große Zeile (Urteil, 24–28 px,
  nicht lauter als heute), darunter EINE ruhige Zeile mit den harten Zahlen (Ereignisse · Geräte ·
  virtuelle Zeit). Kein Knopf auf dieser Ebene außer dem Format-Umschalter.
- **Ebene 2 – Befund:** der erste echte Fehler als Anker: Symbol, Mikrolabel „ERSTER FEHLER",
  Gerät · Code, darunter EIN Erklärungssatz (nicht der ganze Hinweis), rechts daneben der leise
  Sprung „Zum Fundort →" (Ghost, 32 px). Kein Warnbanner mit eigener Fläche, sondern eine ruhige
  Zeile mit links einem 2-px-Balken in der Fehlerfarbe (Bento-Rail) — Farbe nur dort.
- **Ebene 3 – nächster Schritt:** die Anfänger-Hilfe ist Inhalt, kein Kasten: kleine
  Schrittliste (1., 2., 3.) mit hängendem Einzug, „Nächste Diagnose"/„Prüfen" als Mikrolabels,
  darunter EIN leiser Verweis „Gerät zeigen →". „Hilfe an/aus" wird ein kleiner Schalter im Kopf
  (28–32 px, Ghost mit Punkt), kein zweiter Hauptknopf.

**Regeln (prüfbar):**
- Pro Zustand **höchstens EIN** visuell primärer Knopf; alle anderen sind Ghost/Klein (32 px hoch,
  keine Füllfläche), Trefferfläche bleibt ≥ 32 px (Panel ist Maus; Dock 380 px).
- **Keine zwei gleich lauten Flächen untereinander:** Boxen nur noch für (a) Fehler-Rail-Zeile,
  (b) den Hilfe-Bereich als ruhige Liste — Ergebnis und Transport rahmenlos auf dem Panel.
- Format-Umschalter „Ergebnis | Schritt für Schritt" wird eine **Segment-Leiste** (28 px, Text,
  aktives Segment über Token-Fläche, nicht grün gefüllt).
- Transport: Icon-Knöpfe 28–32 px, Abspielzustand als Text, Zeitachse bleibt; keine große Fläche.
- **Hierarchie nur über Größe/Gewicht/Abstand**, Farbe sparsam (Fehlerrail rot, aktives Segment
  Akzent, sonst neutral). Mikrolabels in Mono/Versalien wie in den anderen Flächen.
- Lesespalte: 16-px-Raster, hängender Einzug für Listen, max. 2 Schriftgrößen pro Ebene.
- Zustände: „kein Lauf" ruhig mit Weg zum Start; „läuft" mit Fortschritt statt Knopfwand.
- Testhaken und Verhalten unverändert: `.si-*`-Klassen bleiben (mindestens die, die Tests
  prüfen), `UI.simpanel.anfaengerHilfe`, `modusKnopf`/`si-knopf`-Verhalten, Transport-
  Bedienung, Zeitachse, `data-*`-Hooks. PDU-Inspektor (`pdu.js`) bleibt unberührt.
- 5 Themes + hell/dunkel, 1440/960/720, Bewegung aus: kein Überlauf, keine abgeschnittenen Texte.

## 2 · Schreibrechte

| Owner | Dateien |
|---|---|
| **W4 · Flugschreiber** | `src/ui/simpanel.js`, `src/stil/simulation.css` |
| **Leitung** | `src/ui/pdu.js` nur falls nötig (nicht geplant), Tests, Doku, Fassung, Build/Release |
| **Prüfer** | read-only: Design/Aufmerksamkeitsführung, Theme/A11y |

Regeln wie Runde 5/6: ein Schreiber je Datei, kein Commit/Push, kein `git add -A`, keine
fremden Dateien (besonders nicht die der parallelen Subnetting-Sitzung), keine Tests ändern.

## 3 · Abnahme

Sichtprüfung: Vorher/Nachher bei 1440/960/720 in Standard und hell, dazu 380-px-Dockbreite (die
echte Fläche), Hilfe an/aus, Ergebnis/Schritt-Modus, Fehler- und Leerlauf-Zustand. Beleg:
Vier Bilderpaare unter `Nachweise/runde7/`. Messung: Knopfhöhen, Anzahl primärer Flächen je
Zustand, Zahl der Rahmen-Boxen, Kontrast der Mikrolabels, Überlauf 0. Gates wie immer.
