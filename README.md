# Netzwerk-Labor

**Ein Netzwerk-Simulator zum Spielen: Du bist das Ein-Mann-Systemhaus.**
Kunden schicken Tickets („Die Kasse druckt nicht mehr"), du löst sie in einem echten
Simulator — Geräte verkabeln, IP, VLAN, Routen, ACL, NAT, DHCP, DNS, Firewall. Jedes Paket
ist wirklich unterwegs, Frame für Frame, und du siehst, wo und warum es verworfen wird.

Lernspiel für **Fachinformatiker Systemintegration (IHK AP1/AP2)**. Kein Cisco-Produkt.
Läuft lokal und offline; nichts wird gesendet.

![Tests](https://github.com/Vexx-oss/Side-Project/actions/workflows/pruefen.yml/badge.svg?branch=ausbau-1.2)
![Tests grün](https://img.shields.io/badge/Tests-213%2F213%20gr%C3%BCn-brightgreen)
![JavaScript ohne Bundler](https://img.shields.io/badge/JavaScript-ohne%20Bundler-blue)
![Läuft offline](https://img.shields.io/badge/l%C3%A4uft-offline-informational)

![Topologie der Arztpraxis mit Adressschildern, VLAN-Flächen und den drei Werkzeugen](docs/bilder/topologie.jpg)

---

## Sofort spielen

| Weg | Wie | Was du brauchst |
|---|---|---|
| **Im Browser** | **[vexx-oss.github.io/Side-Project](https://vexx-oss.github.io/Side-Project/)** öffnen | nur einen Browser |
| **Eine Datei** | [Netzwerk-Labor.html herunterladen](https://github.com/Vexx-oss/Side-Project/releases/latest), Doppelklick | nur einen Browser |
| **Windows-Programm** | Release-ZIP öffnen, `Netzwerk-Labor.exe` doppelklicken | Windows 10/11 |

> **Die beiden Wege sind nicht auf demselben Stand.** Der Browser-Weg liefert `1.2.0` —
> den ganzen Ausbau 1.2. Die mitgelieferte **`.exe` ist noch `1.1.0`**: sie bringt Leiste,
> Tray und globales Tastenkürzel, aber nicht die Neuerungen von 1.2. Eine neue `.exe` baut
> man selbst ([`Bauen.md`](Bauen.md)).

Die Einzeldatei ist das **ganze Spiel in einer Datei** — Schriften eingebettet, kein
Nachladen, kein Installieren, kein Internet. Windows, Linux, macOS: alles mit einem
Browser. Belegt: 2.193.460 Bytes (2,09 MB), **0 Außenverweise** (geprüft über `<link>`,
`<script src>`, `<img src>` und `url()`), Start im echten Browser über `file://` gemessen
(`python tools/starttest.py`).

Gegenüber dem Windows-Programm fehlen nur die Fenster-Funktionen: Leiste am
Bildschirmrand, Tray-Symbol, immer im Vordergrund, globales Tastenkürzel. Das Spiel sagt
das an der passenden Stelle selbst an.

> **Windows-Programm, falls kein Fenster erscheint:** `Integritaet-reparieren.cmd`
> doppelklicken. Der gemessene Grund ist ein Integritätslabel „Niedrig" auf dem Ordner
> (Überrest einer Werkzeug-Sandbox): die `.exe` erbt es, läuft als Low-Prozess und darf
> `%LOCALAPPDATA%` nicht beschreiben, worauf die WebView2-Laufzeit ihr Profil nicht anlegen
> kann (`failed to create webview`, `0x800700AA`). Details: [`Nachweise/1.2-Start/BEFUND.md`](Nachweise/1.2-Start/BEFUND.md).

Die **Spielstände von Browser- und Windows-Fassung sind getrennt** und werden nicht
geteilt: Browser im `localStorage`, Windows unter
`%APPDATA%\de.fisi.netzwerklabor\spielstand.json`.

---

## Die ersten fünf Minuten

1. **Postfach** öffnen und die erste Kundenmail lesen.
2. **„Auftrag annehmen"** — das Netz erscheint im Labor.
3. Ein Gerät **anklicken**: rechts zeigt der **Inspektor** Adressen, Ports, VLAN, Routen,
   ACL, NAT; der Reiter **Konsole** ist das IOS-ähnliche Terminal.
4. **Werkzeuge** oben links in der Laborfläche, Kurztaste in Klammern:
   **V** auswählen und verschieben · **K** Kabel verlegen · **P** Ping-Werkzeug
   (jeweils von Gerät zu Gerät ziehen). Gerät **doppelklicken** oder **T** öffnet sein
   Terminal.
5. Nach einem Ping unten **„In Simulation öffnen"**: das Paket Schritt für Schritt,
   Schicht für Schicht.
6. Zum Schluss **„Abnahme anfordern"** — der Kunde prüft selbst nach, auch ob du dabei
   etwas anderes kaputt gemacht hast.

**Fehler kosten nichts.** Die Hilfeleiter (Checkliste, Werkzeugtipp, Frage vom Senior) ist
am Anfang gratis und führt notfalls bis zur vorgeführten Lösung.

<table>
<tr>
<td width="50%"><img src="docs/bilder/einstieg.jpg" alt="Erster Auftrag mit Ticket, Zielen und Hinweis"><br><em>Der erste Auftrag: Ticket, Ziele, Senioren-Hinweis.</em></td>
<td width="50%"><img src="docs/bilder/konsole.jpg" alt="IOS-ähnliche Konsole und Windows-Terminal bei der Fehlersuche"><br><em>Konsole und Terminal bei der Fehlersuche.</em></td>
</tr>
<tr>
<td width="50%"><img src="docs/bilder/simulation.jpg" alt="Simulation auf Frame-Ebene mit Ereignisliste und PDU-Ansicht"><br><em>Simulation auf Frame-Ebene: 42 Ereignisse, Filter, PDU-Ansicht.</em></td>
<td width="50%"><img src="docs/bilder/hilfe.jpg" alt="Hilfeleiter mit sechs Stufen"><br><em>Die Hilfeleiter — Stufe 2 von 6, Senior fragen gratis.</em></td>
</tr>
</table>

Weitere Bilder und die Herkunft jeder Aufnahme: [`docs/bilder/HERKUNFT.md`](docs/bilder/HERKUNFT.md).

---

## Was drin ist

**Simulation auf Frame-Ebene.** ARP, Switching mit MAC-Lernen, VLAN und 802.1Q,
Router-on-a-Stick, statische Routen, ICMP (Timeout gegen unreachable, TTL), ACL, NAT/PAT,
DHCP mit Relay, Reservierung, Lease-Laufzeit und Snooping, DNS, TCP-Handshake, HTTP,
Firewall mit Zonen und Port-Weiterleitung, Internet als Kulisse, Broadcast-Sturm.
Jede Antwort ist aus Paketen hergeleitet, nichts ist vorgetäuscht.

**IOS-ähnliche Konsole.** Modi, Kurzformen, `?`, Tab-Vervollständigung, `do`,
running/startup-config, `write erase`. Dazu ein Windows-Terminal (`ipconfig`, `ping`,
`tracert`, `arp -a`, `nslookup`). Befehle, die nicht belegt sind, werden als solche
gekennzeichnet.

**Aufträge.** 37 handgeschriebene Tickets in 5 Karrierestufen (Salon, Bäckerei,
Schreibbüro, Arztpraxis, Autohaus, Mittelstand) inklusive 4 Projekten, dazu unbegrenzt
generierte Tickets aus 5 Netzvorlagen × 30 Fehlerinjektoren — jede Variante wird
automatisch geprüft. 83 Mini-Tickets für die Leiste.

**Spielschichten.** Hilfeleiter 0–6, Abnahme mit Regressions- und Neustart-Test (nur
Gespeichertes überlebt), Sterne, Euro und Ruf, Wartungsverträge, Playbooks,
Offline-Bericht, Prüfungstag nach IHK-Notenschlüssel.

**Lernen statt Klicken.** Können ist die Währung: Wer etwas sicher beherrscht, darf es
automatisieren. Wiederholungen kommen im richtigen Abstand zurück (Lernmotor: Leitner-Fächer,
1/3/7/14/30 Tage), Fehler landen im Fehlerheft, 15 Abzeichen belohnen Arbeitsweisen.

<table>
<tr>
<td width="50%"><img src="docs/bilder/postfach.jpg" alt="Postfach mit Kundenmails, Symptom aus Kundensicht"><br><em>Aufträge kommen als Kundenmail — Symptom, nicht Ursache.</em></td>
<td width="50%"><img src="docs/bilder/kompetenzkarte.jpg" alt="Kompetenzkarte mit Stufen und Fehlerheft"><br><em>Lernstand: Kompetenzkarte und Fehlerheft.</em></td>
</tr>
</table>

---

## Für Interessierte: wie es gebaut ist

Oberfläche und Logik in **schlichtem JavaScript ohne Bundler**; die Rust-Hülle ist dünn
(Tauri 2, Fenster, Leiste, Tray, Speichern, Autostart). `src/` ist in Schichten gelegt —
`kern` · `modell` · `sim` · `cli` · `daten` · `spiel` · `plattform` · `ui` · `stil`.
`sim/` und `cli/` laufen **headless**: kein DOM, keine Uhr, kein Zufall ohne Seed. Das ist
die Grundlage dafür, dass die Simulation reproduzierbar getestet werden kann.

```
107 Module · 20.706 Zeilen JavaScript · 30 Testdateien · 213/213 Tests grün
```

```bash
python bauen.py                      # src/ -> web/index.html (Einzeldatei-Bau des Programms)
python tools/einfach.py              # web/ -> docs/index.html (DAS Spiel als eine Datei)
sh tools/test.sh                     # Tests headless in Node — meldet 213/213 grün
node tools/sim-stand.js              # Simulation gegen den versionierten Referenzstand
python tools/klassen.py              # Abgleich: Klassen im JS <-> Regeln im CSS
python tools/starttest.py            # startet docs/index.html im echten Browser und misst
python tools/paket.py                # Auslieferungspaket -> dist/ (Ordner + ZIP, geprüft)
python tools/lernmotor.py            # Kopie des Lernmotors gegen die Spielhalle prüfen
python tools/abnahme.py              # die ganze Kette: 14 Prüfungen, ein Befehl
```

`python tools/abnahme.py` läuft in einem Durchgang durch alles: Tests, Klassen-Abgleich,
Simulations-Referenz, Lernmotor (drei Nachweise), beide Bauwege, Einzeldatei, Start im
echten Browser, Paketbau und die Gegenprobe am entpackten Paket. Gemessener Stand:
**14/14 grün** (rund 65 s).

`tools/test.sh` braucht Node. In eingeschränkten Umgebungen verlässlich:

```bash
& "C:\Program Files\Git\bin\bash.exe" -c 'export PATH=/usr/bin:/bin:$PATH; sh tools/test.sh'
```

Die **Windows-`.exe`** baut man selbst (Rust und WebView2 nötig, `python bauen.py` immer
zuerst):

```bash
cd shell/src-tauri
CARGO_TARGET_DIR=<schneller-Ordner>/target cargo tauri build --no-bundle
```

### Ein Hinweis zum Nachbauen

Seit dem Grundgerüst holten `bauen.py`, `tests/run.js` und `tools/sim-stand.js` den
Lernmotor aus `../FISI-Spielhalle/src/lernmotor.js` — also **von außerhalb dieses
Repositoriums**. Ein frischer Klon ließ sich damit weder bauen noch testen, und auf GitHub
schon gar nicht. Seit dem 05.10.2026 liegt der Stand als `fremd/lernmotor.js` im Repo, mit
Herkunft und Prüfsumme im Kopf. Liegt die Spielhalle daneben, hat sie Vorrang. Drei
Werkzeuge weisen das nach:

| Befehl | Was er beweist |
|---|---|
| `python tools/lernmotor.py` | die Kopie entspricht der Quelle Zeile für Zeile (oder meldet die Abweichung) |
| `python tools/lernmotor-bau.py` | der Bau ist **mit und ohne** Spielhalle byte-gleich |
| `python tools/lernmotor-rueckfall.py` | Tests **und** Simulationsvergleich laufen auch ohne Spielhalle |

---

## Dokumente

Die Notizen sind Obsidian-Dateien (Wikilinks); als Text sind sie ebenso lesbar.

| Datei | Inhalt |
|---|---|
| [`Liesmich.md`](Liesmich.md) | Übersicht, Startanleitung, was in 1.1 neu ist |
| [`Konzept – Netzwerk-Labor.md`](Konzept%20%E2%80%93%20Netzwerk-Labor.md) | Spezifikation |
| [`Architektur.md`](Architektur.md) | verbindlicher Vertrag zwischen den Bausteinen |
| [`Plan – Ausbau 1.2.md`](Plan%20%E2%80%93%20Ausbau%201.2.md) | Phasen, Stand, Messwerte |
| [`Design – Spielspaß 2.0.md`](Design%20%E2%80%93%20Spielspa%C3%9F%202.0.md) | Befunde, zwölf Hebel, Scorecard |
| [`CHANGELOG.md`](CHANGELOG.md) | was sich wann geändert hat |
| [`Bauen.md`](Bauen.md) | Bauen, Testen, Messen, Ausliefern im Detail |
| [`Mitmachen.md`](Mitmachen.md) | Arbeitsweise und Regeln für Beiträge |
| [`AGENTS.md`](AGENTS.md) | Betriebsregeln für Mensch und Modell |
| [`LIZENZ.md`](LIZENZ.md) | Lizenz (offener Punkt) und Schriftenlizenzen |

## Stand

| Zweig / Tag | Inhalt |
|---|---|
| `ausbau-1.2` ← **Standardzweig** | Version 1.2.0 in Arbeit: Ausbau 1.2 (Geräte-Fächer, Auftragsmappe, DHCP-Tiefe), dazu die Auslieferung als Einzeldatei. **Hier spielt die Browser-Fassung.** |
| `master`, Tag `v1.1` | Version 1.1 |
| Tag `endversion-1.0` | Rückfallstand 1.0 |

Die `.exe` in `Programm/` stammt aus `v1.1`. Sie ist die einzige Fassung mit Leiste, Tray
und globalem Tastenkürzel — aber nicht auf dem Stand von `ausbau-1.2`.

## Ehrliche Grenzen

- **Die Windows-`.exe` ist Version 1.1.0**, nicht 1.2.0 — sie wurde in dieser Fassung
  nicht neu gebaut. Die Browser-Fassung ist die aktuellere. Ihr Start wurde in dieser
  Sitzung **nicht gemessen**: es lief bereits eine Instanz, und fremde Prozesse werden
  hier nicht angefasst. Belegter Stand vom 05.10.2026: sie startet
  ([`Nachweise/1.2-Start/BEFUND.md`](Nachweise/1.2-Start/BEFUND.md)).
- Die Windows-`.exe` ist **nicht signiert** → SmartScreen-Hinweis beim ersten Start.
- **Die Linux-Pakete sind Stand 1.0** und enthalten die Neuerungen von 1.1 und 1.2 nicht.
- Arbeitsspeicher im Leerlauf rund **0,5 GB** (WebView2 mit GPU-, Netzwerk- und
  Renderprozessen); die CPU ist praktisch null. Gemessen, nicht geschätzt.
- Linux wurde nur in **WSLg** getestet, nicht auf einem echten GNOME/KDE — dort gibt es
  keinen Tray-Dienst.
- Ob ein Browser `localStorage` für eine per Doppelklick geöffnete Datei (`file://`)
  dauerhaft behält, ist **nicht gemessen**.
- Die Lizenz ist ein **offener Punkt** (alle Rechte vorbehalten) und braucht eine
  Entscheidung — siehe [`LIZENZ.md`](LIZENZ.md).

Schriften: Atkinson Hyperlegible, Bricolage Grotesque, JetBrains Mono — SIL Open Font
License 1.1, Lizenztexte liegen bei. Inhalte nach bestem Wissen aus den Lernnotizen einer
FISI-Umschulung geprüft; im Zweifel gilt euer Unterricht.
