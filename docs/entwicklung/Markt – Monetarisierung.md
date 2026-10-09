# 💰 Markt und Monetarisierung – kann das Netzwerk-Labor Geld verdienen?

> **Stand:** 09.10.2026 · **Auftrag:** task-48 (Marktrecherche, vom Nutzer ausdrücklich verlangt) ·
> **Verfasser:** wiki-2 · **Regel dieses Dokuments:** Jede Marktaussage trägt eine URL. Jede Schätzung
> ist als Schätzung mit Rechenweg gekennzeichnet. Wo nichts Belastbares gefunden wurde, steht das in
> § 11 — nicht eine plausibel klingende Zahl.

---

## 0 · Das Wichtigste in sieben Sätzen

1. Die Zielgruppe ist real und groß: In Deutschland gab es 2024 **rund 1,6 Mio. Auszubildende** und
   **396.800 Ausbildungsbetriebe** ([BIBB](https://www.bibb.de/de/214719.php)).
2. Bezahlt wird in diesem Markt **nicht vom Azubi, sondern von der Schule, dem Träger oder der Firma**:
   Das Geschäftsmodell der BiBox verlangt ausdrücklich, dass **die Schule** die Schülerkonten einrichtet
   ([Westermann](https://www.bibox.schule/preise)).
3. Der **Preisanker für digitale Lerninhalte in Deutschland ist niedrig**: 7–12 € je Schüler und Schuljahr,
   150 € je Klasse und Schuljahr, 170–220 € für eine Kollegiumslizenz ([Westermann](https://www.bibox.schule/preise)).
4. **Simulatoren sind in diesem Markt gratis** (Packet Tracer, Filius, GNS3) — verkauft werden kann also nicht
   die Engine, sondern **fertiges deutsches Unterrichtsmaterial, Störungsfälle und die Zeit der Lehrkraft**.
5. Mein Preisvorschlag: **Standortlizenz 390 €/Jahr** (Schule/Träger), **Firmenlizenz 290 €/Jahr**,
   **Einzelplatz 9 €/Jahr**, **Bezahlpakete 39 €** — hergeleitet in § 8, nicht geraten.
6. **Zuerst verkauft wird die heutige Einzeldatei als Standortlizenz mit Rechnung** — ohne eine Zeile Code
   zu ändern; alles andere (Pakete, Auswertung, Shop) braucht Bau.
7. Was **nicht** funktionieren wird, steht in § 10 — und dieser Abschnitt ist der wichtigste.

---

## 1 · Das Produkt in Verkaufszahlen (selbst gemessen am 09.10.2026)

| Merkmal | Messwert | Warum das für den Verkauf zählt |
|---|---|---|
| Einzeldatei `Netzwerk-Labor.html` | **2.829.477 B** | Ein Link, keine Installation, läuft offline |
| Externe Ladungen darin | **0** (`src=`/`href=` auf `http(s)` = 0; 13 reine URL-**Text**stellen in Belegen) | „Kein Netz nötig" ist im Schulnetz ein Argument |
| Windows-`.exe` (Tauri) | **8.630.272 B** | für Firmenrechner ohne Browser-Zugang |
| Android-APK | **1,15 MB** | Beifang, kein Hauptkanal (siehe § 10) |
| Handaufträge (`DATEN.tickets`) | **58** | das ist der Inhalt, den man verkauft |
| Fehlerinjektoren | **39** | die Störungssuche — das Alleinstellungsmerkmal |
| Fertigkeiten / Wiki-Seiten | **27 / 29** | Lehrplanbezug, Nachschlagewerk |
| Mini-Tickets / Fragen-Vorlagen | **92 / 11** (2.200 generierte Fragen laut Testlauf) | Wiederholung ohne Nachladen |
| Tests | **731 von 733 grün**, 0 übersprungen (82 Testdateien, gemessen 09.10.2026; die 2 roten betreffen die Seitenerzeugung der Doku, nicht das Spiel) | Reife-Verkaufsargument gegenüber Schule/Firma |
| Klassenraum | Code ansagen, **ohne Server, Konto, Netz** | Computerraum-Betrieb ohne IT-Abteilung |
| Anmeldung / Telemetrie | **keine** | Datenschutz-Argument (siehe § 7 und § 9) |

**Verkäuferische Folge:** Der Gegenstand des Verkaufs ist **nicht** Software im engeren Sinn (die ist hier
billig und kopierbar), sondern **Unterrichtsvorbereitung**: 58 fertige Aufträge, 39 Störungen, ein
Klassenraum-Verfahren ohne Infrastruktur.

---

## 2 · Der Markt: wie groß ist die Zielgruppe?

### 2.1 Deutschland (belegt)

| Zahl | Jahr | Quelle |
|---|---|---|
| **rund 1,6 Mio. Auszubildende** (sozialversicherungspflichtig Beschäftigte in Ausbildung), Ausbildungsquote 4,6 % | 2024 | [BIBB, Betriebliche Ausbildungsbeteiligung](https://www.bibb.de/de/214719.php) |
| **rund 396.800 Ausbildungsbetriebe** von knapp 2,1 Mio. Betrieben (Ausbildungsbetriebsquote 18,7 %; 2007: 24,1 %) | 2024 | [BIBB](https://www.bibb.de/de/214719.php) |
| Betriebe mit 250+ Beschäftigten bilden zu **81,7 %** aus, Kleinstbetriebe nur zu **9,7 %** | 2024 | [BIBB](https://www.bibb.de/de/214719.php) |
| Zahl der sozialversicherungspflichtig Beschäftigten insgesamt: **35,0 Mio.** | 2024 | [BIBB](https://www.bibb.de/de/214719.php) |

Für den Vertrieb heißt das: **Großbetriebe** sind die leichter erreichbaren Zahler (81,7 % bilden aus),
Kleinstbetriebe sind der lange Schwanz.

### 2.2 IT-Anteil, Berufsschulen, DACH (nicht belegt — nur Fundstellen)

* **IT-Berufe in Zahlen:** Die Statistik der Bundesagentur für Arbeit hat eine eigene Auswertung
  „Anzahl der dualen IKT-Ausbildungen sinkt wieder"
  ([Arbeitsagentur, AM-kompakt IKT](https://statistik.arbeitsagentur.de/DE/Statischer-Content/Statistiken/Themen-im-Fokus/Berufe/Generische-Publikationen/AM-kompakt-IKT.pdf)).
  **Die Zahl daraus habe ich nicht** — die Quelle liegt als PDF vor, das mein Abrufwerkzeug nicht lesen
  konnte. Deshalb steht hier keine Zahl.
* **Berufsbildende Schulen:** Fundstellen sind der Statistische Bericht „Berufliche Schulen" (Destatis/KMK,
  [Anhang](https://www.kmk.org/fileadmin/Dateien/pdf/Eurydice/DE/anhang.pdf)) und der
  [Berufsbildungsbericht 2026](https://www.bmbfsfj.bund.de/resource/blob/285644/38be499c91a9d292b6f619800515afa6/berufsbildungsbericht-2026-data.pdf).
  **Auch hier: keine abgerufene Zahl.**
* **Österreich:** Statistik Austria / WKO führen Lehrlingszahlen
  ([WKO-Branchendaten](https://www.wko.at/statistik/BranchenFV/b-601.pdf)) — **nicht abgerufen** (PDF).
* **Schweiz:** Das Bundesamt für Statistik hat die Seite „Vocational education and training (VET) — Schools"
  ([BFS](https://www.bfs.admin.ch/bfs/en/home/statistics/education-science/pupils-students/upper-secondary/vocational-training.html));
  die abgerufene Seite enthielt **keine Zahl** im Text.

**Schätzung (Rechenweg offen, Grundlage ist NICHT belegt):** Wenn die IT-Berufe einen Anteil von 4–6 % an
allen Auszubildenden hätten (Annahme; der Anteil ist **nicht** recherchiert), dann wären das
`1,6 Mio. × 4–6 % = 64.000–96.000` IT-Auszubildende im Bestand. Diese Spanne ist eine **Annahme zur
Größenordnung**, keine Marktzahl. Wer den Vertrieb plant, muss die Arbeitsagentur-Auswertung auswerten —
sie liegt vor, ich konnte sie nur nicht lesen (§ 11).

---

## 3 · Wer zahlt heute für Ausbildungssoftware?

Vier Zahler, jeweils mit Beleg oder ausdrücklich als Einschätzung:

1. **Die Schule (bzw. der Schulträger) — belegt.** Die BiBox-Preisseite regelt ausdrücklich, dass
   **Schülerkonten durch die Schule** eingerichtet werden müssen, wenn die BiBox mit der Klasse genutzt wird,
   und nennt Preise je Klasse: **Klassenlizenz Premium 150 € / Schuljahr**, Kollegiumslizenz 170–220 €,
   Einzellizenz Lehrkraft 40–50 € ([Westermann](https://www.bibox.schule/preise)).
2. **Eltern/der Azubi privat — belegt, aber klein.** Dieselbe Seite beschreibt den Privatkauf durch Eltern
   („Schnellregistrierung" mit E-Mail) mit **7–12 € je Schuljahr** ([Westermann](https://www.bibox.schule/preise)).
   Es gibt also einen Privatmarkt — aber zu Taschenbuchpreisen.
3. **Der Bildungsträger (Umschulung) — nicht belegt.** Dass Umschulungen über Bildungsgutscheine der
   Bundesagentur finanziert werden, ist allgemein bekannt, aber in dieser Sitzung **keine Quelle abgerufen**
   (§ 11). Vertriebsweg: Bildungsträger kaufen Lehrmittel aus Sachkostenbudgets der Maßnahme.
4. **Die Firma (Ausbildungsbetrieb) — mittelbar belegt.** Dass 396.800 Betriebe ausbilden, ist belegt
   ([BIBB](https://www.bibb.de/de/214719.php)); **dass** und **wie viel** sie für Lernsoftware zahlen, ist
   **nicht recherchiert**. Einschätzung: Firmen zahlen für Ausbildungsmaterial aus dem Ausbildungsbudget,
   wenn es die Prüfungsvorbereitung stützt — belegen kann ich das hier nicht.

**Plattformkäufer (zur Abgrenzung):** Wer eine Lernplattform will, zahlt für **Betrieb**, nicht für Inhalt:
Moodle selbst ist Open Source, die gehosteten Pläne kosten **150 €/Jahr (50 Nutzer) bis 1.870 €/Jahr
(750 Nutzer)** in Euro ([MoodleCloud](https://www.moodlecloud.com/standard-plans/)). Das ist der
Vergleichsmaßstab für „Software im Schulbetrieb" — nicht für Inhalte.

---

## 4 · Die Wettbewerber (Preismodell und Beleg)

| # | Anbieter | URL | Preismodell | Preis — belegt? |
|---|---|---|---|---|
| 1 | **Cisco Packet Tracer / Networking Academy** | [netacad.com/cisco-packet-tracer](https://www.netacad.com/cisco-packet-tracer) | kostenloser Download + kostenlose Trainings; Bindung an das NetAcad-Ökosystem | „Free Training and Download" (Seitentitel) — **belegt** |
| 2 | **Filius** (Universität Siegen) | [lernsoftware-filius.de](https://www.lernsoftware-filius.de/) · Bericht: [heise](https://www.heise.de/ratgeber/Informatik-in-der-Schule-Netzwerkgrundlagen-lernen-mit-Filius-7490404.html) | kostenlos, Open Source, für den Informatikunterricht | **belegt** (heise: „Netzwerkgrundlagen lernen mit Filius") |
| 3 | **GNS3** | [gns3.com/pricing](https://www.gns3.com/pricing) | Software kostenlos (Open Source) + kostenpflichtige Zusatzangebote | **nicht belegt** — die Preisseite lieferte beim Abruf keinen lesbaren Text (JS) |
| 4 | **EVE-NG** | [eve-ng.net → Buy](https://www.eve-ng.net/index.php/buy/) | Community-Edition kostenlos, **„PRO Base"** als bezahlte Lizenz (Abruf nur mit Lizenz-Request, Kauf über Checkout) | **Preis nicht belegt** — auf Buy/FAQ/Startseite keine Zahl; Version „7.2.0-18, 6. Oktober 2026" steht dort |
| 5 | **Cisco Modeling Labs (CML)** | [cisco.com → CML](https://www.cisco.com/site/us/en/learn/training-certifications/training/modeling-labs/index.html) | kommerzieller On-Premises-Simulator, Personal-/Enterprise-Stufen | **Preis nicht belegt** — die abgerufene Seite nennt keine Zahl |
| 6 | **Boson NetSim** | [boson.com/netsim-cisco-network-simulator](https://boson.com/netsim-cisco-network-simulator) | kommerzieller Simulator + Prüfungsvorbereitung (Einmalkauf) | **Preis nicht belegt** — im abgerufenen Text keine Zahl |
| 7 | **Moodle / MoodleCloud** | [moodlecloud.com/standard-plans](https://www.moodlecloud.com/standard-plans/) | Open Source (selbst hosten: 0 € Software) **oder** SaaS-Abo | **belegt**: 150 €/240 €/440 €/1.060 €/1.870 € pro Jahr (50/100/200/500/750 Nutzer) |
| 8 | **Westermann BiBox** (digitales Lehrwerk) | [bibox.schule/preise](https://www.bibox.schule/preise) | Lizenz je Schüler/Jahr, je Klasse/Jahr, Kollegium | **belegt**: 7–12 €/Schüler/Jahr, 150 €/Klassenlizenz/Jahr, 170–220 € Kollegium, 40–50 € Lehrkraft |
| 9 | **itslearning / LMS-Anbieter** | [itslearning.com](https://itslearning.com/support/contact-us) | „Preis auf Anfrage" (Angebot) | **Modell belegt** (keine Preisseite), Zahl nicht |

**Was die Tabelle zeigt:** In der Spalte „Preis" stehen vier belegte Modelle (kostenlos, Open Source,
SaaS-Abo, Lizenz je Schüler) und vier **nicht belegte** Zahlen. Genau so steht es hier — nicht gerundet,
nicht geschätzt.

---

## 5 · Wo die Lücke ist

**Meine Analyse** (keine Quelle, sondern Abgleich der belegten Angebote):

| Was der Markt hat | Was ihm fehlt |
|---|---|
| Gratis-Simulatoren (Packet Tracer, Filius, GNS3) — englisch geprägt, erklärungsbedürftig, oft Installation/VM | **deutsche, fertige Unterrichtsaufträge** mit Störungssuche und Bewertung ohne Note |
| Digitale Lehrwerke (BiBox) — Inhalte, Aufgaben, aber **keine Simulation** | eine **spielbare** Umgebung, in der ein Fehler diagnostiziert wird |
| Lernplattformen (Moodle & Co.) — Abgabe, Verwaltung, aber **keine Aufträge** | fertige Inhalte, die ohne Plattform laufen |
| Kommerzielle Simulatoren (EVE-NG PRO, CML, Boson) — Profi-Werkzeuge, Lizenzen, Rechenleistung | **kein Computerraum-Betrieb ohne Vorbereitung** |

**Die Lücke in einem Satz:** *Deutsche, prüfungsnahe Netzwerk-Aufträge mit Fehlersuche, die als eine Datei
ohne Installation, Konto und Server im Computerraum laufen — inklusive Klassenraum-Ansage per Code.*

Das ist gleichzeitig die **Schwäche** des Produkts: Es füllt eine Lücke zwischen zwei kostenlosen
Alternativen (Simulator und Lehrwerk) — und muss deshalb den Mehrwert *pro Unterrichtsstunde* verkaufen,
nicht die Technik.

---

## 6 · Vier Monetarisierungswege — mit Rechnung und Risiko

Alle Rechnungen unten sind **Szenarien** mit offengelegten Annahmen, keine Prognosen. Zahlen-Anker stehen
jeweils dabei.

### (a) Schullizenz je Standort und Jahr

* **Zielgruppe:** Berufsschulen, Berufskollegs, Bildungsträger (jeder Standort mit IT-Klassen).
* **Preisanker (belegt):** 150 €/Klasse/Jahr und 170–220 €/Kollegiumslizenz
  ([Westermann](https://www.bibox.schule/preise)).
* **Preis:** **390 €/Jahr je Standort**, unbegrenzte Azubis (Herleitung § 8).
* **Rechnung:** `1 Standort × 390 €`. Szenarien: 5 Standorte = **1.950 €/Jahr**; 20 = **7.800 €/Jahr**;
  50 = **19.500 €/Jahr**. (Annahme: 50 verkaufte Standorte — das ist eine Annahme, kein Marktanteil.)
* **Warum jemand zahlt:** Ein Werkzeug für *alle* IT-Klassen ist billiger als ein Klassensatz Lehrbücher;
  der Klassenraum läuft ohne IT-Abteilung.
* **Risiko:** Haushaltszyklen (Beschaffung dauert), fehlende Referenzen, Kopierbarkeit (eine Datei,
  kein Kopierschutz) und die Gratis-Alternativen.

### (b) Einzelplatz je Azubi

* **Zielgruppe:** Azubis/Eltern privat, Umschüler.
* **Preisanker (belegt):** 7–12 €/Schüler/Jahr ([Westermann](https://www.bibox.schule/preise)).
* **Preis:** **9 €/Jahr** (oder 19 € dauerhaft).
* **Rechnung:** 1.000 Käufer × 9 € = **9.000 €/Jahr**; 100 Käufer = **900 €/Jahr**.
* **Warum jemand zahlt:** Eigener Fortschritt zu Hause, Prüfungsvorbereitung, läuft offline auf dem
  eigenen Rechner.
* **Risiko:** Zahlungsabwicklung und Rechnung an Privatpersonen (Aufwand je 9 €-Verkauf), Kaufkanal fehlt,
  Kopie wird sofort weitergegeben, und ein Pflichtlehrwerk ist dieses Produkt nicht.

### (c) Firmenlizenz für Ausbildungsbetriebe

* **Zielgruppe:** Ausbildungsbetriebe, besonders die **81,7 % der Großbetriebe (250+)**, die ausbilden
  ([BIBB](https://www.bibb.de/de/214719.php)).
* **Preisanker:** 390 €-Standortlizenz (a) als Obergrenze, Kleinbetriebs-Rabatt.
* **Preis:** **290 €/Jahr je Betrieb** bis 25 Azubis, danach **10 €/Azubi/Jahr**.
* **Rechnung:** 100 Betriebe × 290 € = **29.000 €/Jahr**; 20 Betriebe = **5.800 €/Jahr**.
  (Annahme: 100 verkaufte Betriebe — Annahme, kein Marktanteil.)
* **Warum jemand zahlt:** Ausbilder sparen Vorbereitungszeit; „keine Installation, keine Cloud, keine
  Anmeldung" passt in Firmennetze, in denen nichts installiert werden darf; eine Rechnung ist für Firmen
  leicht zu bezahlen (kein Beschaffungsverfahren wie bei Schulen).
* **Risiko:** Firmen verlangen Rechnung, Support und Reife-Nachweise; ein Einzelanbieter wirkt riskant;
  Ausbilder binden Inhalte lieber selbst.

### (d) Kostenlos + Bezahlinhalte

* **Zielgruppe:** alle oben — die Basis bleibt gratis (heutiger Stand), bezahlt werden **Pakete**.
* **Preisanker:** keine belastbare Quelle für „Lernpaket-Preise" gefunden → **Setzung**:
  **39 € je Paket** (z. B. AP1-Prüfungsvorbereitung, AP2-Projektpaket) oder **99 €/Jahr** für alle Pakete.
  Zur Einordnung: eine Einzelplatzlizenz BiBox kostet 7–12 €/Jahr
  ([Westermann](https://www.bibox.schule/preise)) — 39 € ist also **deutlich** über Lehrwerkpreis und muss
  durch Umfang gerechtfertigt werden.
* **Rechnung:** 2.000 Downloads × **2 % Kaufquote** (Annahme) × 39 € = **1.560 €/Jahr**.
  Bei 5 % Quote: `2.000 × 5 % × 39 € = 3.900 €/Jahr`.
* **Warum jemand zahlt:** Prüfungsangst und Zeitdruck vor AP1/AP2 — dafür wird eher gezahlt als für ein Spiel.
* **Risiko:** Die Kaufquote ist **unbekannt** und in diesem Dokument nicht belegt; Gratisnutzer zahlen
  erfahrungsgemäß selten; jedes Paket muss inhaltlich neu gebaut und gepflegt werden; ohne Shop/Bezahlweg
  (Codeänderung!) ist dieser Weg heute nicht bedienbar.

---

## 7 · Was den Verkauf bremst — ehrlich gewichtet

| Bremse | Wie schwer wiegt sie? | Begründung |
|---|---|---|
| **Gratis-Konkurrenz** (Packet Tracer, Filius, GNS3) | **sehr schwer** | belegt: Packet Tracer „Free Training and Download" ([NetAcad](https://www.netacad.com/cisco-packet-tracer)), Filius kostenlos ([heise](https://www.heise.de/ratgeber/Informatik-in-der-Schule-Netzwerkgrundlagen-lernen-mit-Filius-7490404.html)) |
| **Kopierbarkeit** (eine HTML-Datei, kein Kopierschutz) | **sehr schwer** | technische Eigenschaft des Produkts (§ 1); Kopierschutz in einer Einzeldatei ist nicht wirksam umsetzbar → der Preis muss niedrig genug sein, dass Kopieren unattraktiv ist |
| **Beschaffung in Schule/Träger** | **schwer**, aber **nicht belegt** | Haushalts- und Vergabewege sind in dieser Sitzung nicht recherchiert (§ 11); Erfahrungswissen sagt „langsam" — belegen kann ich es nicht |
| **„Keine Daten" als Argument** | **Vorteil** | kein Konto, keine Telemetrie → keine Auftragsverarbeitung, keine Nutzerverwaltung, kein Server ([BIBB-ähnliche Vorgaben der Träger sind hier nicht geprüft]) |
| **„Keine Daten" als Hürde** | **mittel** | Schulen wollen oft Nutzerverwaltung, Auswertung und Nachweisbarkeit — das Produkt liefert bewusst keine (Klassenraum-Ampel nur lokal als Datei) |
| **Fehlende Referenzen/Zulassung** | **mittel** | Digitale Lehrwerke kommen von Verlagen mit Zulassungswegen; ein Einzelprodukt hat keine |
| **Einzelanbieter-Risiko** | **mittel** | Firmen/Schulen fragen nach Support, Fortbestand, Rechnung — Einschätzung, nicht belegt |

---

## 8 · Preisvorschlag und was zuerst verkauft wird

### 8.1 Der Preisvorschlag (mit Herleitung, nicht geraten)

| Angebot | Preis | Herleitung |
|---|---|---|
| **Standortlizenz Schule/Träger** | **390 €/Jahr** (unbegrenzte Azubis am Standort) | BiBox: 150 € Klassenlizenz **+** 170–220 € Kollegiumslizenz = **320–370 €** für *ein* Fach; ein Werkzeug für alle IT-Klassen liegt knapp darüber → **390 €** ([Westermann](https://www.bibox.schule/preise)) |
| **Firmenlizenz** | **290 €/Jahr** bis 25 Azubis, danach 10 €/Azubi/Jahr | unter der Standortlizenz, weil Firmen leichter zahlen und weniger Nutzer haben; Preisschild bleibt unter der Schwelle, ab der ein Beschaffungsverfahren nötig wird (**Schwelle nicht recherchiert**) |
| **Einzelplatz** | **9 €/Jahr** | Mitte des belegten Lehrwerk-Korridors 7–12 € ([Westermann](https://www.bibox.schule/preise)) |
| **Pilotangebot** | **0 €** für ein Schulhalbjahr, eine Klasse | Verkaufsinstrument, keine Preisstufe |
| **Bezahlpakete** | **39 €/Paket**, 99 €/Jahr alle Pakete | Setzung mangels belastbarer Quelle (§ 6d), bewusst über Lehrwerkpreis |

**Erlös-Szenarien (Annahmen offen):** 5 Standorte + 10 Firmen + 200 Einzelplätze = `1.950 + 2.900 + 1.800`
= **6.650 €/Jahr**. 20 Standorte + 50 Firmen + 1.000 Einzelplätze = `7.800 + 14.500 + 9.000` =
**31.300 €/Jahr**. Beides sind **Rechenbeispiele**, keine Prognose — die Zahl der Verkäufe ist die Annahme.

### 8.2 Was zuerst verkauft wird — ohne eine Zeile Code zu ändern

**Verkauft wird der heutige Stand als Standortlizenz, geliefert als Datei.**

1. **Verkaufsgegenstand:** `Netzwerk-Labor.html` (2.829.477 B) + `Programm/Netzwerk-Labor.exe` +
   die vorhandene Doku-Auswahl als PDF/Markdown — **fertig, nichts zu bauen**.
2. **Angebot:** „Pilotklasse kostenlos, danach 390 €/Jahr je Standort, Rechnung, keine Anmeldung,
   keine Daten." Das ist mit dem heutigen Code vollständig bedienbar.
3. **Der Klassenraum-Code ist das Verkaufsargument** — er funktioniert bereits ohne Server; das kann
   kein Wettbewerber mit Konto-Zwang so zeigen.
4. **Erste fünf Pilotstandorte** aus dem eigenen Umfeld (Berufsschule, Bildungsträger, Ausbildungsbetrieb),
   mit der Bitte um einen Satz Rückmeldung; danach Preisliste.
5. **Was dafür noch geschrieben werden muss, ist kein Code:** eine einseitige Lizenz-/Nutzungsvereinbarung,
   eine Rechnungsvorlage, eine Anleitung für die Lehrkraft (1–2 Seiten), eine Verkaufsseite mit Impressum.

---

## 9 · Rechtliche Mindestfragen (KEINE Rechtsberatung — nur offene Punkte)

> Ich bin kein Anwalt; das sind Fragen, die vor dem ersten Verkauf zu klären sind — nicht Antworten.

1. **Impressum:** § 5 DDG verlangt für **geschäftsmäßige, in der Regel gegen Entgelt angebotene digitale
   Dienste** u. a. Namen, Anschrift und Angaben für schnelle elektronische Kontaktaufnahme
   ([Gesetzestext](https://www.gesetze-im-internet.de/ddg/__5.html)). Offene Frage: Gilt das schon für eine
   einfache Verkaufsseite mit Bestellformular, und welche Angaben genau?
2. **Rechnung/Umsatzsteuer:** § 19 UStG (Kleinunternehmer) befreit, solange der Gesamtumsatz im
   **Vorjahr 25.000 €** nicht überschritt und im **laufenden Jahr 100.000 €** nicht überschreitet
   ([Gesetzestext](https://www.gesetze-im-internet.de/ustg_1980/__19.html)). Offene Fragen: Gewerbeanmeldung,
   Pflichtangaben der Rechnung (§ 14 UStG — **nicht geprüft**), Hinweis „keine Umsatzsteuer nach § 19 UStG".
3. **Datenschutz:** Das Produkt erhebt **keine Daten** und sendet nichts (§ 1, 0 externe Ladungen).
   Offene Punkte: (a) Der lokale Speicher im Browser (Spielstand, Einstellungen) ist eine Verarbeitung
   *auf dem Gerät* — braucht es dafür eine Erklärung? (b) Eine **Verkaufsseite** hat Server-Logfiles →
   Datenschutzerklärung/Informationspflichten. (c) Bei Schulen: Der Schulträger wird nach
   Auftragsverarbeitung fragen — die Antwort „es gibt keine Daten" ist stark, muss aber belegbar sein.
4. **Haftung für Lerninhalte:** offene Punkte: Haftungsausschluss/„keine Gewähr" in AGB oder Lizenz,
   Haftung für Folgen falscher Konfigurationsbeispiele, Kennzeichnung als Lernumgebung (nicht für
   Produktivnetze).
5. **Marke und Name:** „Netzwerk-Labor" — Verwechslungsgefahr/DPMA-Recherche und Domain sind **nicht
   durchgeführt**. Zusätzlich: Die Inhalte nutzen IOS-ähnliche Befehle und nennen Herstellernamen
   (Cisco, IEEE, RFC, BSI) — ob und wie man damit werben darf, ist eine offene Marken-/Wettbewerbsfrage.
6. **Inhaltsrechte:** Die Inhalte sind selbst geschrieben; im Repo liegen **keine** IHK-Prüfungsfragen
   (so die Projekt-Doku). Bei Bezahlinhalten also „prüfungsnah" formulieren, nie „Original-Prüfungsfragen".

---

## 10 · Was NICHT funktionieren wird — und warum

> Der wichtigste Abschnitt. Hier steht, wovon ich abrate, auch wenn es weh tut.

1. **Einzelverkauf an Azubis als Hauptkanal wird nicht funktionieren.** Der belegte Privatpreis für digitale
   Lehrwerke liegt bei **7–12 €/Jahr** ([Westermann](https://www.bibox.schule/preise)); ein *Spiel* ist
   kein Pflichtlehrwerk. Bei 9 € fressen Zahlungsabwicklung und Support den Erlös.
2. **App-Store-Verkauf wird nicht funktionieren.** Schulen kaufen nicht im Store, die APK ist Beifang
   (1,15 MB, § 1), und für Minderjährige kommen Konten-/Einwilligungsfragen dazu. (Store-Provisionen habe
   ich in dieser Sitzung **nicht** belegt — sie stehen deshalb hier nicht als Zahl.)
3. **Ein Server-/Abo-Modell wird nicht funktionieren — es zerstört den Kern.** „Kein Server, kein Konto,
   kein Netz" ist das Verkaufsargument (§ 5, § 7) und passt zum Computerraum. Ein SaaS-Modell erzeugt
   Betriebslast, Auftragsverarbeitung und Datenschutzfragen — für ein Produkt, das heute in **einer Datei**
   läuft und deshalb überhaupt keine Infrastruktur braucht.
4. **Werbung oder Telemetrie als Erlösquelle wird nicht funktionieren.** Sie widersprechen dem
   Versprechen „keine Daten", zerstören die Schulakzeptanz und den einzigen harten Vorteil gegenüber
   Cloud-Angeboten.
5. **Kopierschutz/DRM wird nicht funktionieren.** Eine HTML-Einzeldatei ist offen lesbar; jeder Schutz
   lässt sich entfernen. Er würde nur ehrliche Käufer ärgern. Konsequenz: niedriger Preis + Vertrauen +
   Mehrwert (Inhalte, Aktualisierungen, Klassenraum-Ampel).
6. **„Die Simulation verkaufen" wird nicht funktionieren.** Packet Tracer, Filius und GNS3 sind kostenlos
   (§ 4). Verkauft werden müssen **Aufträge, Störungen, Klassenraum-Verfahren, deutsche Texte**.
7. **Eine Schulbuchzulassung anzustreben, wird nicht funktionieren** (Einschätzung, nicht recherchiert):
   Länderverfahren sind lang und teuer; für ein Werkzeug, das kein Lehrwerk ersetzt, ist der Weg
   unverhältnismäßig. Besser: als **Ergänzung** positionieren, die jede Lehrkraft ohne Genehmigung nutzen kann.
8. **Freemium ohne echten Mehrwert wird nicht funktionieren.** Wenn die Bezahlpakete nur „mehr vom Gleichen"
   sind, bleibt die Kaufquote bei ~0 (vgl. § 6d: 2 % sind schon optimistisch).
9. **Ein Preis über ~500 €/Standort/Jahr wird ohne Referenzen nicht funktionieren** (Setzung auf Basis des
   belegten Lehrwerkankers 150–370 €; die Zahl der Schulen ist nicht recherchiert).
10. **Verkauf aus dem Budget einzelner Lehrkräfte wird nicht funktionieren** — Lehrkräfte haben in der
    Regel kein Sachbudget; gekauft wird über Schule/Träger (Einschätzung, nicht belegt).

---

## 11 · Nicht recherchiert (Pflichtabschnitt)

Hier steht **keine** Zahl, weil ich keine belastbare Quelle abrufen konnte:

* **Zahl der IT-Auszubildenden in Deutschland** — die Auswertung existiert (Arbeitsagentur, „AM-kompakt
  IKT"), liegt aber als PDF vor; mein Abrufwerkzeug kann keine PDFs lesen.
* **Zahl der IT-Ausbildungsbetriebe**, der **Fachinformatiker-Azubis** je Jahrgang.
* **Zahl der berufsbildenden Schulen/Berufsschulen** in Deutschland (Destatis/KMK nur als PDF) — damit ist
  auch die Zahl der erreichbaren Standorte **unbekannt**; die Szenarien in § 6/§ 8 sind reine Annahmen.
* **Österreich und Schweiz**: keine belastbare Zahl (Statistik Austria/WKO: PDF; BFS-Seite abgerufen,
  aber ohne Zahl im Text). Die DACH-Aussage stützt sich daher **nur auf Deutschland**.
* **Umschulung/Bildungsgutschein**: Teilnehmerzahlen und Sachkostenbudgets nicht abgerufen.
* **Preise von EVE-NG PRO, GNS3-Zusatzangeboten, Boson NetSim, Cisco CML**: auf den abgerufenen Seiten
  **nicht genannt** (EVE-NG nennt den Preis erst im Checkout).
* **Beschaffungs-/Vergabewege der Schulträger**, Haushaltszyklen, Schwellenwerte: keine Quelle.
* **Zahlungsbereitschaft von Firmen** für Ausbildungssoftware: keine Quelle.
* **App-Store-Provisionen** und **Zulassungsverfahren für Bildungsmedien**: keine Quelle in dieser Sitzung.
* **Markenrecherche (DPMA) und Domainverfügbarkeit** für „Netzwerk-Labor": nicht durchgeführt.
* **Wettbewerbsangebote im deutschen Berufsschulmarkt** (Verlage außer Westermann, z. B. Europa-Lehrmittel
  „click & study"): nicht abgerufen.

---

## 12 · Quellen (alle abgerufen am 09.10.2026)

1. BIBB — Betriebliche Ausbildungsbeteiligung (Zahlen 2024) — https://www.bibb.de/de/214719.php
2. Westermann BiBox — Preise und Lizenzmodelle — https://www.bibox.schule/preise
3. MoodleCloud — Standard-Plans und Preise (EUR) — https://www.moodlecloud.com/standard-plans/
4. Cisco Networking Academy — Packet Tracer („Free Training and Download") — https://www.netacad.com/cisco-packet-tracer
5. heise — „Informatik in der Schule: Netzwerkgrundlagen lernen mit Filius" — https://www.heise.de/ratgeber/Informatik-in-der-Schule-Netzwerkgrundlagen-lernen-mit-Filius-7490404.html
6. Filius (Universität Siegen) — https://www.lernsoftware-filius.de/
7. GNS3 — Preisseite (Inhalt beim Abruf nicht lesbar) — https://www.gns3.com/pricing
8. EVE-NG — Buy (Preis erst im Checkout) — https://www.eve-ng.net/index.php/buy/
9. EVE-NG — FAQ (Lizenzprüfung) — https://www.eve-ng.net/index.php/faq/
10. Cisco — Modeling Labs (Produktübersicht, ohne Preis) — https://www.cisco.com/site/us/en/learn/training-certifications/training/modeling-labs/index.html
11. Boson — NetSim Network Simulator — https://boson.com/netsim-cisco-network-simulator
12. itslearning — Kontakt/Support (Preis auf Anfrage) — https://itslearning.com/support/contact-us
13. Bundesagentur für Arbeit — „AM-kompakt IKT" (Titel belegt, Zahl nicht abrufbar) — https://statistik.arbeitsagentur.de/DE/Statischer-Content/Statistiken/Themen-im-Fokus/Berufe/Generische-Publikationen/AM-kompakt-IKT.pdf
14. Berufsbildungsbericht 2026 (PDF, nicht abrufbar) — https://www.bmbfsfj.bund.de/resource/blob/285644/38be499c91a9d292b6f619800515afa6/berufsbildungsbericht-2026-data.pdf
15. BIBB — Datenreport zum Berufsbildungsbericht 2026 (PDF, nicht abrufbar) — https://www.bibb.de/dienst/publikationen/download/21037
16. KMK/Eurydice — Anhang: Berufliche Schulen, Schuljahr 2024/2025 (PDF) — https://www.kmk.org/fileadmin/Dateien/pdf/Eurydice/DE/anhang.pdf
17. BFS Schweiz — Vocational education and training (VET) — Schools (abgerufen, ohne Zahl) — https://www.bfs.admin.ch/bfs/en/home/statistics/education-science/pupils-students/upper-secondary/vocational-training.html
18. WKO — Branchendaten (PDF, nicht abgerufen) — https://www.wko.at/statistik/BranchenFV/b-601.pdf
19. § 5 DDG — Allgemeine Informationspflichten — https://www.gesetze-im-internet.de/ddg/__5.html
20. § 19 UStG — Besteuerung der Kleinunternehmer — https://www.gesetze-im-internet.de/ustg_1980/__19.html

**Quellenlage in Zahlen:** 20 Quellen gelistet, **13 davon in dieser Sitzung erfolgreich abgerufen**,
davon **7 mit belastbaren Zahlen** (BIBB ×4 Zahlenblöcke, BiBox, MoodleCloud, Gesetzestexte ×2) — die
übrigen sind Fundstellen ohne abgerufene Zahl oder Produktseiten ohne Preisangabe. Alle Produktangaben in
§ 1 sind eigene Messungen aus dieser Sitzung.

---

## 13 · Anhang: Rechenwege der Schätzungen

* **IT-Azubis (Bestand):** `1,6 Mio. × 4 % = 64.000` bis `1,6 Mio. × 6 % = 96.000`.
  Grundlage: BIBB-Zahl 1,6 Mio. ([Quelle 1](https://www.bibb.de/de/214719.php)); **der Anteil 4–6 % ist
  nicht belegt** und nur zur Größenordnung gedacht.
* **Erlös Szenario A (klein):** `5 × 390 € + 10 × 290 € + 200 × 9 € = 1.950 + 2.900 + 1.800 = 6.650 €/Jahr`.
* **Erlös Szenario B (mittel):** `20 × 390 € + 50 × 290 € + 1.000 × 9 € = 7.800 + 14.500 + 9.000 = 31.300 €/Jahr`.
* **Freemium:** `2.000 Downloads × 2 % × 39 € = 1.560 €/Jahr`; bei 5 % Quote `3.900 €/Jahr`.
  Die Kaufquote ist eine **Annahme**; die Downloadzahl ist eine **Annahme**.
* **Preisanker Standortlizenz:** `150 € (Klassenlizenz) + 170–220 € (Kollegium) = 320–370 €` →
  aufgerundet **390 €** ([Quelle 2](https://www.bibox.schule/preise)).
* **Kleinunternehmer-Grenze im Verhältnis zum Szenario B:** 31.300 € liegen **über** der 25.000-€-Grenze
  des § 19 UStG für das Vorjahr — dann greift die Regelung nicht mehr und Umsatzsteuer wird fällig
  ([Quelle 20](https://www.gesetze-im-internet.de/ustg_1980/__19.html)). Das ist ein **Rechenbeispiel**,
  keine Steuerberatung.

---

*Dieses Dokument ändert keinen Code. Es liefert die Entscheidungsgrundlage für den ersten Verkauf und
benennt ausdrücklich, was nicht belegt ist.*
