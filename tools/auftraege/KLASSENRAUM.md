DEIN BAUSTEIN: der **Klassenraum** — die Lehrer-/Schüler-Instanz als Hobby-Fassung („Novelty-Ebene"). Es gilt zusätzlich COMMON.md (Regeln, Schichtordnung, Namensraum, Tests, Bericht).

ZIEL IN EINEM SATZ: Eine Lehrkraft sagt einen kurzen Code an — und auf jedem Gerät entsteht **derselbe** Auftrag, ohne Konto, ohne Server, ohne Netz. Danach sammelt sie die Ergebnisse ein und sieht eine Ampel.

WARUM DAS GEHT (nicht neu bauen, benutzen): Aufträge sind seit dem Umbau vom 06.10.2026 **deterministisch aus einem Seed** gebaut (`def.fuerSeed(seed)`, `Spiel.ticketGueltig(def)`, gemessen: 58 Aufträge × 12 Seeds = 616–627 Netze, gleicher `(id, seed)` in 696/696 Fällen identisch, 0 unlösbar). Ein Code muss also nur **Auftrag + Seed** transportieren — alles andere rechnet jedes Gerät selbst aus. Es gibt heute **keinen Netzwerkcode** im Projekt; das bleibt in dieser Ausbaustufe so.

ABGRENZUNG (das ist der Kern des Auftrags): Hobby-Ebene heißt, wir bauen die **Vorführung**, nicht das Geschäft. Ausdrücklich NICHT in diesem Auftrag: Konten, Anmeldung, Passwörter, Serverpflicht, Bezahlung, Lizenzverwaltung, Mandantenfähigkeit, Marktplatz, Datenschutzkonzept, Autorenwerkzeug, Fortschritts-Dashboards. Wer das will, liest `Konzept – Lernplattform für Betriebe und Schulen.md` (Stufen 1–4) — das ist ein anderer Auftrag.

WERKZEUGE (vom Nutzer freigegeben am 06.10.2026): Es dürfen **Rust und andere Werkzeuge** benutzt werden — die Regel „kein npm, kein Bundler" aus COMMON.md gilt für den **Spielkern**, nicht für Werkzeuge und Hüllen. Konkret bedeutet das für diesen Auftrag:
- **Spielkern bleibt JavaScript** (Begründung siehe unten) — `src/spiel/klassenraum.js` und `src/ui/klassenraum.js` wie beschrieben.
- **Server in Rust** statt Python: die Rust-Kette ist vorhanden (cargo 1.97.1; die Tauri-Hülle `shell/src-tauri/` existiert bereits mit Single-Instance, Dialog, `serde`, `windows-sys`).
- **QR-Code über eine Rust-Crate** (`qrcode` o. ä.) statt ~300 Zeilen handgeschriebenes JavaScript.

WARUM DER SPIELKERN NICHT NACH RUST WANDERT (Empfehlung, keine Regel — wenn der Nutzer es anders will, ist das ein eigener, großer Auftrag):
Das Spiel läuft aus **einer** Codebasis auf vier Wegen: Browser, Einzeldatei-HTML (kein Installationsweg — der wichtigste Vertriebskanal für Schulen), Tauri-.exe und Android-App (WebView). 251 automatisierte Tests, die Fehlerinjektoren, der deterministische Generator samt Selbstprüfung und die Abnahme-Logik hängen an dieser Basis. Ein Port wäre Monate Arbeit, würde die gesamte Prüfkette entwerten und bringt für den Nutzer **nichts Sichtbares**: die Simulation ist leicht (Test: 60 Geräte, Ping über den Router unter 50 ms Rechenzeit). Rust gehört dorthin, wo es echten Gewinn bringt — Server, Hülle, Installer, Lizenzwerkzeug, QR — nicht in den Kern.

DEINE DATEIEN (neu; bauen.py nimmt neue Dateien im Schichtordner automatisch mit):
- `src/spiel/klassenraum.js` — Logik: Code erzeugen/lesen, Sitzung, Ergebnis-Codes, Export/Import. Reine Rechnung, headless testbar, **kein DOM**.
- `src/ui/klassenraum.js` — zwei Ansichten: **Lehrer** (Sitzung anlegen, Code groß zeigen, Ampel, Ergebnisse, Export/Import) und **Schüler** (Code eingeben → Auftrag öffnen).
- `src/stil/klassenraum.css` — Stil, nur Tokens aus `basis.css`, im Haus-Look (dunkler Leitstand). Kein neues Farb-/Größensystem.
- `tests/klassenraum.test.js` — Tests (siehe PRÜFEN).
Erlaubt additiv: `src/ui/app.js` (Ansicht registrieren), `src/ui/start.js` (Code-Eingabe auf der Startseite), `src/spiel/zustand.js` (nur ein Store-Schlüssel). Fremde Dateien sonst nicht ändern; Änderungen an `Architektur.md` nur vorschlagen (im Bericht), nicht selbst machen.

SCHNITTSTELLE (genau so umsetzen — das ist der Vertrag, der in Architektur.md nachgetragen wird):
```
Spiel.klassenraum = {
  erzeugen({ticketId?, skill?, seed?, dauerMin?, titel?}) -> sitzung
  ausCode(code)                  -> {ticketId, seed, art} | {fehler:"..."} | null
  sitzung()                      -> aktuelle Sitzung aus store "klassenraum" | null
  ergebnisCode(inst, abnahme)    -> "E-…"      (kurz, abtippbar, mit Prüfsumme)
  ergebnisLesen(code)            -> {sitzung, platz?, sterne, dauerS, ok} | {fehler}
  ergebnisEintragen(code)        -> {ok, neu} | {fehler}      (idempotent: derselbe Code zweimal ändert nichts)
  exportieren()                  -> JSON-String der Sitzung samt Ergebnissen
  importieren(text)              -> {ok, sitzung} | {fehler}
}
```
- **Code-Format** (festlegen und im Kopf der Datei dokumentieren): Alphabet ohne Verwechslungsgefahr (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, also kein I, O, 0, 1), feste Länge, gedruckt in Gruppen (`NL-4F7K-2Q`), Prüfsumme (z. B. Summe mod 37) gegen Vertipper. Der Code muss **selbsttragend** sein: kein Nachschlagen nötig, um ihn zu lesen.
- **Determinismus ist Pflicht:** `ausCode(code)` muss auf jedem Gerät denselben Auftrag ergeben. Prüf es, statt es anzunehmen.
- **Ergebnis-Code** trägt: Sitzungskennung, Platz/Platzkennung (frei wählbar, **kein Klarname** — Datensparsamkeit), Sterne, Dauer, Prüfsumme. Kurz genug, um ihn abzutippen oder auf einen Zettel zu schreiben.
- **Sitzung liegt in `store "klassenraum"`**, nicht im Spielstand — ein Schulrechner braucht sie unabhängig vom Spieler-Fortschritt. Zusätzlich Export/Import als Datei, damit sie einen Neustart übersteht.

UMFANG in drei Stufen (jede einzeln vorführbar; A zuerst fertigstellen und melden):
**A · Verteilen (die Magie).** Lehrer-Ansicht: Auftrag wählen (aus `DATEN.tickets` oder generiert über Fertigkeit+Stufe), Sitzung anlegen, Code groß und lesbar anzeigen (Schriftgröße so, dass er aus drei Metern an der Tafel lesbar ist), Kopierknopf. Schüler-Weg: Eingabefeld „Auftragscode" auf der Startseite UND in der Klassenraum-Ansicht, mit Fehlerrückmeldung bei Tippfehlern („Prüfziffer stimmt nicht — hast du ein O statt 0 getippt?"). Nach Eingabe öffnet sich der Auftrag wie ein normaler Auftrag aus dem Postfach, mit Titel „Klassenraum-Auftrag". Kein Unterschied im Spielgefühl zum Einzelspieler — das ist Absicht.
**B · Einsammeln (die Ampel).** Nach bestandener Abnahme zeigt das Spiel den **Ergebnis-Code** (dezent, kopierbar, auch als Zettel abtippbar). In der Lehrer-Ansicht: Eingabefeld (mehrere Codes nacheinander oder als Block einfügen), Liste mit Platz, Sternen, Dauer, Fehlversuchen; oben die **Ampel** (wie viele fertig / wie viele offen / Median-Dauer); Export/Import der Sitzung als Datei. Doppelte Codes werden erkannt und nicht doppelt gezählt.
**C · Live (optional, nur wenn A und B stehen und grün sind) — in RUST.** Zwei Bauformen, die erste zuerst:
- **C1 · im Programm eingebaut (beste Fassung):** `shell/src-tauri/src/klassenraum.rs` — die Desktop-.exe selbst hört im lokalen Netz auf einem Port und hat genau zwei Endpunkte: `GET /liste` (Ergebnisse abholen) und `POST /ergebnis` (Ergebnis abgeben). Kein zweites Programm, kein Python, kein Runtime-Zwang. Einschalten in den Einstellungen (Standard: **aus**), mit ehrlichem Hinweis auf die Windows-Firewall-Abfrage beim ersten Start. Nur die Desktop-Fassung kann das — Browser und Android nicht.
- **C2 · eigenständiges Rust-Binary** `tools/klassenraum/` (eigenes Cargo-Projekt, `cargo build --release` → eine einzelne .exe von wenigen MB): für den Browser-/Android-Fall und als Rückfall, wenn die Firewall die .exe nicht durchlässt. Gleiche zwei Endpunkte, gleiche Datenform.
- **Der Server ist in beiden Formen optional.** Ohne ihn müssen A und B vollständig funktionieren (Ergebnis-Codes eintippen). Das Spiel fragt nur ab, wenn er erreichbar ist — keine Fehlermeldung, wenn nicht.
- Beide Formen sind **nur lokal** (kein Internet, keine Cloud, keine Konten) und liefern **keine Klarnamen** — nur Platz-Kennungen.
**D · QR-Code auf dem Beamer (Novelty-Verstärker) — in RUST.** Die Lehrkraft zeigt den Auftragscode als QR-Bild, Schüler scannen mit der Handykamera und landen direkt im Auftrag. In der Desktop-Fassung erzeugt Rust das Bild (Crate `qrcode`/`image`) und reicht es als Data-URI an die Oberfläche — damit entfallen die ~300 Zeilen handgeschriebenes JavaScript, die vorher dagegen sprachen. Der QR-Inhalt ist **genau der Auftragscode** (kein Link, keine Adresse, kein Konto), damit jeder handelsübliche Scanner funktioniert. Ohne Rust (Browser-Fassung) bleibt das Abtippen der Normalfall.

WAS DIE VORFÜHRUNG ZEIGEN MUSS (das ist das Abnahmekriterium, nicht die Technik):
1. Rechner A (Lehrer): Sitzung anlegen → Code steht groß auf dem Schirm.
2. Rechner B und C (Schüler, notfalls zwei Browserfenster mit getrennten Profilen): Code eintippen → **beide bekommen denselben Auftrag** (gleiche Geräte, gleiche Adressen, gleiche Fehlerstelle). Das wird gemessen, nicht behauptet: Netzkennwert beider Seiten vergleichen.
3. B löst den Auftrag, bekommt einen Ergebnis-Code. Lehrer tippt ihn ein → Ampel zeigt 1/2 und die Sterne.
4. A löst ihn ebenfalls, anderer Platz → Ampel 2/2.
5. Neustart des Lehrerrechners: Sitzung aus der Datei importieren → Ampel unverändert.

PRÜFEN (alles belegen, nichts behaupten):
- Neue Tests in `tests/klassenraum.test.js`: Code-Round-Trip (`erzeugen` → `ausCode` → **identische Netzkennung**), Prüfsumme lehnt Vertipper ab (je ein Buchstabe/Ziffer getauscht, 20 Fälle), jeder lesbare Code liefert einen **lösbaren** Auftrag (`Spiel.ticketGueltig`), `ergebnisCode`/`ergebnisLesen`-Round-Trip, doppeltes Eintragen ändert die Sitzung nicht, Export/Import ist verlustfrei, und ein ungültiger/fremder Code erzeugt **keine** Ausnahme sondern `{fehler}`.
- `sh tools/test.sh` grün (heute 251/251) · `node tools/sim-stand.js` unverändert · `python tools/ethos.py` grün (deine CSS-Datei muss den eingefrorenen Stand halten) · `python tools/klassen.py` 0.
- `python tools/rauch.py` **36/36** — die neue Ansicht darf den ersten Auftrag nicht stören (der Rauchtest zieht mit echten Mausereignissen; wenn deine Ansicht die Startseite verändert, kann er rot werden).
- Die fünf Schritte der Vorführung oben wirklich durchspielen (zwei Profile!), Bilder und Netzkennwerte in den Bericht.
- Android: der Code muss auf einem Telefon eintippbar sein (Ziffern-/Buchstabenfeld, Großschreibung egal, `NL-4F7K-2Q` und `nl4f7k2q` müssen beide gehen).

BEWUSSTE VEREINFACHUNGEN (Hobby-Ebene, im Bericht nennen): kein Schutz gegen Abschreiben (wer den Code hat, hat den Auftrag — gewollt), keine Identität (nur Platz-Kennungen), keine Zeit- oder Sperrlogik, keine Serverpflicht, kein QR-Code in der Browser-Fassung (Stufe D liefert ihn nur in der Desktop-Fassung), keine Auswertung über die Ampel hinaus, keine Mehrfach-Sitzungen gleichzeitig.

STOLPERSTEINE, die ich vorab benenne:
1. **Der Code darf nicht zu lang werden.** Ziel: höchstens 10 Zeichen in zwei Gruppen. Wenn Auftrag + Seed + Prüfsumme nicht hineinpassen, den Auftrag **nicht** voll kodieren, sondern eine kleine, feste Auftragsliste (`DATEN.tickets`-Reihenfolge) über einen Index adressieren — die Liste ist auf allen Geräten identisch, weil sie im Programm steckt.
2. **Kein Klarname im Code.** Nur Sitzungskennung + Platznummer. Sonst wird aus dem Hobby sofort ein Datenschutzthema.
3. **Determinismus nicht annehmen, messen.** Zwei getrennte Browserprofile müssen denselben Netzkennwert liefern; wenn nicht, ist der Seed nicht vollständig im Code gelandet.
4. **Die Startseite ist heikel.** Sie ist der erste Eindruck und der Rauchtest hängt daran. Die Code-Eingabe gehört sichtbar, aber untergeordnet dorthin (eine Zeile, kein zweiter Hauptknopf).

AUFWAND (Schätzung, nicht gemessen): A ≈ 1 Sitzung, B ≈ 1–2 Sitzungen, C1 (Server in der .exe) ≈ 1 Sitzung, C2 (eigenständiges Binary) ≈ ½ Sitzung zusätzlich, D (QR über Crate) ≈ ½ Sitzung. Der Mechanismus (Determinismus) ist fertig und getestet; die Arbeit liegt in Code-Format, Oberfläche und Belegen. Die Rust-Teile brauchen zusätzlich `cargo tauri build` bzw. `cargo build --release` — Zeit für den ersten Übersetzungslauf einplanen.

BERICHT (wie COMMON.md): gebaute Dateien, tatsächliche öffentliche API, Code-Format mit Beispiel, was geprüft wurde (wie, mit welchem Ergebnis), die fünf Vorführschritte mit Netzkennwerten, bewusste Vereinfachungen, offene Punkte, Vorschläge für Architektur.md.
