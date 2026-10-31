---
tags: [FISI, Lernspiel, Netzwerk, Runde5, Gestaltungsvertrag, Leiste, Auftragsmappe, Inspektor]
erstellt: 2026-10-31
status: Arbeitsfassung — verbindlicher Vertrag für Runde 5 (Fassung 2.7.0); Bereichsteams arbeiten danach.
---

# Entwurf – Runde 5 „Leiste, Auftragsmappe, Inspektor" (31.10.2026)

**Auftrag des Nutzers (wörtlich, sinngemäß).** Nach der Abnahme von 2.6.0 zeigt der Nutzer drei
Bildschirmfotos aus dem laufenden Programm und schreibt: „unordentlich überlappende Elemente",
„manche Elemente sind nicht richtig ausgerichtet", „Minileiste sieht schlecht aus und vermittelt
visuell nicht ihren Nutzen, sondern overwhelmed den Nutzer nur", „das Zusammenfallen muss schöner
animiert werden von der Leiste", „die Aufträge zu simulieren im Minimodus funktioniert nicht richtig,
da viel zu wenig Kontext herrscht für die Lösung des Auftrags — das Konzept muss umgedacht werden".
Ausdrücklich verlangt: **Full Skill Usage und Agenten-Schwärme**.

**Rahmen.** Runde 5 folgt dem Projekt-Prozess user:projekte/netzwerk-labor-redesign (Vertrag → Welle
→ Abnahme → Doku/Stand/Fassung) und nutzt die Skills workflows (Schwarm) und computer-use (Abnahme
im echten Fenster). Veröffentlichung stützt sich auf die stehende Freigabe des Nutzers für Push, Tag
und Release (30.10.2026). Fassung: **2.7.0** (Konzeptänderung der Leiste + UX-Umbau; kein neues
Datenformat, keine neuen Spielzustände).

## 1 · Gemessener Befund (Audit 31.10.2026, Prüfbau 2.6.0, CDP, 1280×800 CSS)

Belege: Nachweise/runde5/audit.json und Nachweise/runde5/audit/01…06*.png.

**A · Auftragsmappe (Auftrag lesen, .am-mappe)**
- Die Mappe sitzt in #labor-auftrag (z-index 10) und kann dessen Stapelkontext nicht verlassen;
  die schwebende Werkzeugleiste (.lb-leiste-oben, z-index 20) malt deshalb **über** die Mappen-Reiter:
  „Brief/Ziele/Plan" liegen teils unter V/K/P, das „Lagebild"-Label der Fläche scheint durch die
  Mappen-Kopfzone. Der Kopfraum-Trick --am-kopfraum (padding-top 61 px) erzeugt genau diesen
  optisch überlappenden Streifen: Werkzeugleiste und Flächentitel stehen wie ein kaputter Kopf IN
  der Mappe.
- Ziele-Reiter: .sp-ziele trägt flex:2 1 320px — die Liste ist 326 px hoch, auch wenn nur **ein**
  Ziel da ist; die Mappe wird 515 px hoch (~300 px Leerraum über dem Fuß).
- Kein eigener Kopf (Kunde/Vorgang), Fuß nur eine Schaltfläche.

**B · Inspektor, Reiter Ports (.in-*)**
- .in-inhalt scrollt (scrollH 615 / clientH 429), aber die letzte Portzeile wird mitten im
  Zeilenkasten abgeschnitten; kein unterer Scroll-Rand, kein sichtbarer Scrollbalken im Dunkelmodus.
- .in-port-kopf ist ein 4-Spalten-Grid (78 px / auto / 1fr / 1fr) bei 378 px Panelbreite →
  „Modus" und „VLAN" werden gequetscht, Felder mit Trennstrichen wie eine kaputte Tabelle;
  Beschriftung „Modus" erscheint doppelt (Label + Steuerelement-Name).
- SVI-Karte: „IP-Adresse"/„Maske (auch /24)" zweispaltig, darunter „ip default-gateway" in Mono —
  gemischte Schreibweisen, ungleiche Feldbreiten, Schalter „an" unruhig; Kopf 135 px hoch.

**C · Mini-Leiste (.leiste-karte)**
- Zugeklappt 300 × 56, Standard-Deckkraft **0,55** (--leiste-deckkraft) → ausgewaschen und beliebig;
  .lk-werte auf 78 px begrenzt und **zweizeilig** (€/h · Ruf / „2 offen"), Stufen-Label wird zu
  „Stufe 1 · A" abgeschnitten.
- Aufgeklappt 320 × 300: derselbe gequetschte Kopf; Module „Jetzt dran" (eine Zeile), „Mini-Ticket"
  (losgelöste Frage ohne Auftragskontext: „Antwortet 10.0.0.1 auf einen Ping aus dem LAN?" plus
  CLI-Schnipsel), „Status und Verträge" (eine abgeschnittene Zeile), Schnellaktionen. Der Auftrag
  ist hier nicht lösbar — Karte, Geräte, Ziele fehlen.
- Animation: nur opacity/height/width 0.16 s ease; beim Zuklappen springt die Karte auf 56 px, der
  Inhalt verschwindet ohne Übergang; zusätzlich ändert sich die OS-Fenstergröße hart (300×56 ↔ 320×300).

**D · Karte (Lagebild)**
- Knoten-Beschriftung: Name/Rolle/IP stehen mit line-height 1 in 2–3 px überlappenden Zeilen
  (9 gemessene Paare, z. B. „Internet" × „Internet · Provider" 3 px, „SW-Salon" × „Switch · L2" 2 px);
  bei dichten Netzen berühren sich Label-Blöcke benachbarter Geräte.

## 2 · Zielbild und Konzept

### A · Auftragsmappe → „Auftragsbogen" (kein überlappender Streifen)
- **Eigenes Blatt mit Kopf:** Kicker AUFTRAG · <Kunde>, Titel = Auftrag, Meta = Ziele x/y · Niveau;
  Reiter Brief / Ziele / Plan; Schließen per X und Esc, Fokus zurück zum Auslöser.
- **Stapelkontext lösen:** Mappe aus #labor-auftrag heraus als eigenes Overlay in die Laborfläche
  legen (oder Auftragsbereich bei offener Mappe anheben). Solange sie offen ist, werden
  **Werkzeugleiste und Flächentitel der Karte ausgeblendet** (Klasse mappe-an am Labor) — kein
  zweiter, überlappender Kopf. Der --am-kopfraum-Hack entfällt; normaler Innenabstand.
- **Höhe folgt Inhalt:** keine 515-px-Hülle bei einem Ziel; .sp-ziele im Mappenkontext auf Inhalt
  stellen (flex:0 1 auto), Höchsthöhe min(70vh, 560px) mit innerem Scrollen; stabile Scrollränder.
- Fuß: genau **eine** Hauptaktion (Los geht's / Zurück ins Labor) + ruhige Sekundäraktion
  (Ziele ansehen beim ersten Öffnen). Bei ≤900 px volle Breite, unten verankert, kein Überlauf.
- Testhaken bleiben: .am-*, #labor-auftrag, .am-zu (Esc/Fokus), am-rein-Animation.

### B · Inspektor entzerrt (Ports/VLAN/SVI)
- Kopf kompakter (max. ~112 px): Mikrolabel + Name + Rollenzeile, Kennzahlen als eine ruhige Zeile.
- **SVI:** eine Karte, zweispaltiges Raster für IP/Maske (gleiche Feldbreiten), Gateway darunter volle
  Breite, einheitliche Beschriftung („IP-Adresse", „Maske (auch /24)", „Gateway (ip default-gateway)"),
  Schalter „an" rechts oben; Hilfetext leiser, höchstens zwei Zeilen.
- **Ports:** Portzeile als 2-zeiliger Block statt gequetschter Tabelle: Zeile 1 Portname (Mono) +
  Link-Chip + Modus-Chip; Zeile 2 zwei gleich breite Felder „Modus" (Auswahl) und „VLAN" (Eingabe)
  mit Beschriftung **über** dem Feld, kein doppelter Name, keine vertikalen Trennstriche.
  Ab 4 Ports scrollt die Liste **mit unterem Rand**; letzte Zeile nie angeschnitten, Scrollbalken
  sichtbar. Trefferflächen ≥44 px, Fokusring; Reiter unverändert.

### C · Mini-Leiste: Konzept „Begleiter" (statt Auftrag im Minimodus)
**Grundsatz:** Die Leiste löst **keine Aufträge**. Sie begleitet den laufenden Auftrag mit Kontext
und führt in die Vollansicht. Damit fällt die Erwartung weg, im 320-px-Fenster ein Netz zu
diagnostizieren.
- **Zugeklappt (300 × 56):** feste, ruhige Statuskapsel: links Stufe · Rolle (vollständig, notfalls
  „Stufe 1"), Mitte drei Werte **in einer Zeile** (€/h · Ruf · offen), rechts „öffnen" und ein
  erkennbarer Weg zum Aufklappen (Zeiger, .lk-griff bleibt). Deckkraft Standard **0,92**
  (einstellbar 0,6–1), Hover 1; Kontrast aller Werte ≥ 4,5:1.
- **Aufgeklappt (320 × 300):**
  1. **Jetzt dran** — Kunde · Auftrag **plus nächster Schritt in einem Satz** aus echten Daten
     (Spiel.naechster / Spiel.naechsteDiagnose, nie die Lösung), Primär „Im Labor fortsetzen"
     (öffnet Labor am Gerät), Sekundär „Auftrag lesen" (öffnet den Auftragsbogen in der Vollansicht).
  2. **Kurzübung (freiwillig)** — die bisherige Mini-Frage, aber **mit Kontext**: Kicker
     „Kurzübung · <Fertigkeit>", Kontextzeile aus dem aktiven Auftrag (Ziel/Kunde, echte Daten),
     dann Frage + Antworten; nach der Antwort kurze Erklärung + „Im Labor prüfen". Klar beschriftet,
     dass sie den Auftrag **nicht** löst („nebenbei üben"). Ohne Auftrag ehrlicher Leerzustand;
     die Frage kommt weiter aus UI.karriere.miniZeichnen.
  3. **Lage** — Verträge/Serie/offene Tickets in einer ruhigen Zeile; Schnellaktionen Postfach /
     Labor / ausblenden bleiben.
- **Animation:** Aufklappen 320 ms (Token --dauer-lang) cubic-bezier(.22,1,.36,1) für height/width, Inhalt (.lk-auf,
  Module) mit 8 px Versatz und gestaffeltem Fade (40 ms je Modul); Zuklappen: Inhalt zuerst ausblenden
  (140 ms), Höhe/Breite danach (220 ms), **Fenstergröße zieht nach** (Plattform.fenster.groesse erst
  nach der Karten-Animation); „Bewegung aus"/reduced motion = sofort. Kein Fokusklau, nur Maus.
- Testhaken bleiben: .lk-zeile mit exakt sechs Kindern, .lk-auf, .lk-mini, .lk-mini-hilfe,
  Mini-Zeichen, .lk-hilfe-knopf, .lk-oeffnen, Maße 300×56 / 320×300.
- **Testanpassung (Leitung):** tests/ui-leiste-ueberlappung.test.js pinnt heute den --am-kopfraum-Hack;
  wird auf „keine Überlappung, Werkzeugleiste bei offener Mappe ausgeblendet" umgestellt.
  tests/spiel-leiste-hilfe.test.js bleibt in Struktur/Haken gültig.

### D · Karte: ruhige Beschriftung
- Zeilenabstände der Knoten-Labels vergrößern (Name/Rolle/IP je ≥13 px bei fs-2/fs-1), line-height
  ≥1,15; IP-Zeile nur bei ausreichender Zoomstufe oder Auswahl/Hover (Ruhe statt Zahlenregen).
- Bestehende Decluttering-Logik (labelUeber) auf die IP-Zeile ausdehnen, damit Label-Blöcke
  benachbarter Geräte sich nicht berühren; keine erfundenen Geräte/Verschiebungen.

## 3 · Schreibrechte (ein Schreiber je Datei)

| Owner | Dateien |
|---|---|
| **W1 · Auftragsbogen + Karte** | src/ui/spiel.js (nur Auftragszeile/Mappe; Postfach/Hilfeleiter tabu), src/stil/spiel.css (nur .am-*), src/ui/editor.js (nur Label-/Kopf-Ausblendung, Klickpfad unverändert), src/stil/editor.css (nur .ger-*/.lb-leiste*) |
| **W2 · Inspektor** | src/ui/inspektor.js (nur Reiter Ports/VLAN/SVI), src/stil/inspektor.css |
| **W3 · Mini-Leiste** | src/ui/leiste.js, src/stil/leiste.css |
| **Leitung** | src/stil/bento.css, src/stil/basis.css, src/ui/app.js, Themes (zz-*), Tests, Doku, Fassung, Build, Commit, Release |
| **Prüfer 1** | read-only: Bento-Design/Professionalität |
| **Prüfer 2** | read-only: Theme/A11y/Interaktion (Themes, Fokus, 44 px, Esc/Enter, reduced motion) |

**Regeln:** ein Schreiber je Datei; kein Commit/Push durch Writer; kein "git add -A"; keine Prozesse
nach Namen beenden; keine Software installieren; Kiosk-Dateien der parallelen Sitzung tabu.
Private Vorschau mit python tools/vorschau.py --name <bereich> und
python Nachweise/bento/foto.py --html vorschau-<bereich>.html --marke <bereich> --nur <ansichten>;
**niemals** python bauen.py parallel. Bestehende Tests nicht ändern — die Leitung passt die zwei
genannten Testdateien an.

## 4 · Abnahme

Sichtprüfung 1440/960/720 + 5 Themes + Hell/Dunkel + „Bewegung aus"; je Fläche: keine
abgeschnittenen Texte, kein horizontaler Überlauf, 44-px-Ziele, sichtbarer Fokus, eine Hauptaktion,
keine erfundenen Zahlen, Testhaken erhalten.

**Gates:** node tests/run.js grün (0 übersprungen) · sh tools/test.sh --rauch 45/45 ·
python tools/klassen.py 0 · python tools/ethos.py GRÜN (R4/R9/R10 nicht schlechter) ·
python tools/umlaute.py GRÜN · node tools/sim-stand.js unverändert.

Nach der ersten Runde zwei unabhängige Lesungen (Design; Theme/A11y), Fix-Runde je Strang,
Lead-Abnahme, dann Fassung 2.7.0 (Doku, Stand, Einzeldatei, .exe, Release, Live-Seite nachmessen).

## 5 · Entscheidungen der Leitung

1. **Die Leiste löst keine Aufträge mehr** — sie ist Begleiter mit Kontext und Weg in die
   Vollansicht; die Kurzübung bleibt als freiwillige Übung mit Kontextzeile.
2. **Mappe bleibt ein Blatt über der Karte**, kein Vollbild-Modal: lesen/Ziele prüfen, während das
   Labor sichtbar bleibt; Werkzeugleiste ruht, solange sie offen ist.
3. **Maße der Leiste bleiben** (300×56 / 320×300); Fläche, Deckkraft, Inhalt und Animation ändern sich.
4. **Version 2.7.0**, stehende Release-Freigabe wird genutzt; Doku-Nachzug wie in Runde 4.
5. **Skill-/Prozessnutzung:** Projekt-Prozess netzwerk-labor-redesign als Rahmen, workflows für den
   Schwarm, computer-use für die Abnahme im echten Fenster.

## 6 · Ergebnis (31.10.2026, gemessen) — alle Gates grün

| Prüfung | Ergebnis |
|---|---|
| node tests/run.js | **932/932 grün**, 0 übersprungen (109 Testdateien, 95 headless Module) |
| sh tools/test.sh --rauch | **45/45** |
| python tools/klassen.py | **0** |
| python tools/ethos.py | **GRÜN** (R1 23, R2 17, R3 4, R4 169→135, R9 62→58, R10 42 = Stand; R12 nicht gemessen) |
| python tools/umlaute.py | **GRÜN**, 0 offene Befunde |
| node tools/sim-stand.js | **Simulation unverändert** |
| Bau | **138 Module** (95 headless) — keine neue Datei, der Umbau blieb im Bestand |
| Auftragsbogen | Ziele-Reiter mit einem Ziel **315 px** (vorher 515), Leerraum **16 px** (vorher ~300); Werkzeugleiste/Flächentitel bei offener Mappe `visibility:hidden`; Karte **0** überlappende Label-Paare (vorher 9); Esc/Fokus/Ansichtswechsel belegt |
| Inspektor | Kopf **102 px** (vorher 135); Portfelder **136–141 px × 44 px** (vorher 62–73 × 30); Portliste scrollt mit ganzem Zeilenraster, **0** angeschnittene Zeilen; SVI im VLAN-Reiter |
| Mini-Leiste | zugeklappt **300 × 56**, Deckkraft **0,92**, drei Werte einzeilig, kein Überlauf; aufgeklappt **320 × 300** mit Kontextzeile aus dem Auftrag; Animation **320 ms** `cubic-bezier(.22,1,.36,1)`, Zuklappen Inhalt→Karte (160/240 ms) → Fenstergröße; Bewegung aus ohne Animation; Kontrast ≥ 4,5:1 in allen Themes (min. 4,71 Hell) |
| Unabhängige Prüfungen | Bento-Design und Theme/Struktur/A11y nach der Umsetzung; Befunde im Abschnitt 5/6 der Übergabe |

**Testanpassung (Leitung):** `tests/ui-leiste-ueberlappung.test.js` prüft statt des entfernten
Kopfraum-Hacks die neue Mechanik (`mappe-an` am `.labor`, `visibility:hidden` für Leisten
und Flächentitel, z-index 30, kein `--am-kopfraum`) mit **6 statt 4 Fällen** — die Abdeckung ist
größer, nicht kleiner.

**Nicht gemessen:** R12 (`ethos --dom`), Android-APK (kein SDK), echte Maus im ausgelieferten
Tauri-Fenster (Prüfbau), Screenreader, alle Themes in jedem Strang flächendeckend.
