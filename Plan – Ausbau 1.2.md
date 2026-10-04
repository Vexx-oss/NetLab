---
tags: [FISI, Lernspiel, Netzwerk, Plan]
erstellt: 2026-10-04
status: Phase 0 und A gebaut (04.10.2026, Zweig ausbau-1.2) – Haltepunkt, du spielst an; B–F offen
---

# 🗺️ Plan – Ausbau 1.2 „Übersichtlich, abwechslungsreich, mit echtem Terminal"

⬆️ [[10-Projekte/Lernprojekte/Netzwerk-Labor/Liesmich|Netzwerk-Labor]] · Vertrag: [[Architektur]] · Spezifikation: [[Konzept – Netzwerk-Labor]]

> [!success] Stand 04.10.2026: Phase 0 und A fertig, im echten Programm durchgespielt
> **Programm:** `Programm/Netzwerk-Labor.exe` (gebaut 04.10. 13:58, Versionsnummer noch 1.1.0, die kommt in F). Die bisherige 1.1-.exe liegt als Rückfall in `Programm/Endversion-1.1/`.
> **Git:** Zweig `ausbau-1.2`, 4 Commits (Kundenpost-Reparatur, Messwerkzeug, A1+A3, A2+A4). **Tests:** 126 grün (124 + 2 neue für die Kundenpost).
> **Abnahme A:** Startzustand „Kasse ohne Netz“ **12 Bedienelemente** (vorher 30), **32 Wörter** (vorher 120), **1 Hauptknopf**, in 1366×768 und schmal (960 px, Inspektor 320 px). Szenario bis zur bestandenen Abnahme ohne JS-Fehler. Einzelheiten: [[#Ergebnis Phase 0 und A]].
> **Haltepunkt:** Bitte anspielen und sagen, ob es stimmt. Phase B beginnt erst danach.

## 0 · Auf einen Blick

| Wunsch | Befund im echten Programm (4.10.2026 angesehen) | Antwort im Plan |
|---|---|---|
| Geräte als Dropdown statt alles auf einmal | 11 Gerätetypen stehen dauernd untereinander in der linken Leiste | **Phase A:** 4 Kategorien, Klick öffnet ein Fach (Flyout) |
| Zu viel Text, unklar wohin | Auftragsleiste (Titel, Symptom, Ziele, Coach, Hilfe, Abnahme) + 5 Ebenen-Reiter + 3 Werkzeuge + Inspektor + Simulation + Hinweiskasten – alles gleichzeitig | **Phase A:** je Zustand genau *ein* Hauptknopf, Details in der „Auftragsmappe“ |
| Aufträge brauchen einen Netzwerkplan | Das kaputte Netz liegt sofort auf der Fläche; es gibt keine Kundenunterlage | **Phase B:** Plan wird aus dem *gesunden* Netz erzeugt; Unterschied Plan ↔ Labor *ist* die Diagnose |
| CLI auf PC/Laptop | Gibt es schon, aber versteckt: 3. Reiter im schmalen Inspektor, nur 8 Befehle (`arp cls help hostname ipconfig nslookup ping tracert`), kein Linux, nichts ändert die Konfig | **Phase C:** eigenes Terminal-Fenster, Windows + Linux, ~25 Befehle, Terminal-Aufgaben |
| DHCP, DNS, „wie bei Cisco“ ausbauen | DHCP/DNS gibt es in Grundform (Pools, Relay, Einträge); IOS-Konsole hat wenige `show`-Befehle; kein STP/OSPF | **Phase D:** Funktionstiefe nach Prüfungsrelevanz, jede Funktion komplett (Modell → Sim → CLI → Oberfläche → Lehrtext → Fehler → Ticket → Test) |
| Loop zu stumpf, Zufallsevents | Postfach → Netz reparieren → Sterne; dazu Wartungs-Timer und Mini-Quiz | **Phase E:** 6 Auftragsformen, Ticket-Mischer, Zufallsereignisse mit Lerninhalt |

**Reihenfolge:** 0 Bestand klären → A Aufräumen → B Netzplan → C Terminal → D DHCP/DNS (mit CLI) → E Loop & Events → D-Rest (STP, IOS-`show`) → F Abschluss. **Eine Phase je Opus-Sitzung**, nach A, B und C spielst du kurz an und sagst, ob es stimmt (Haltepunkte).

---

## 1 · Leitplanken (gelten für jede Phase)

Aus dem Projekt und aus früheren Fehlschlägen – Opus liest das zuerst:

1. **Vertrag zuerst.** Jede Änderung an Datenformen steht zuerst in `Architektur.md`. `sim/` und `cli/` bleiben ohne DOM, Datum, Math.random (Seed!). Keine neuen Globals außer Namensräumen. Neue Dateien in `bauen.py` eintragen.
2. **Selbst bauen, nacheinander, kein Agentenschwarm.** Nach jedem Modul: `sh tools/test.sh`, dann Git-Commit. (Schwarm riss 2× das Limit.)
3. **Wirkung vor Grün.** Ein Baustein zählt erst, wenn er *im echten Programm* vorkommt (`python tools/cdp.py …`, Bildschirmfoto). Grüne Tests ohne Aufruf aus Ticket/Oberfläche = nicht fertig („Agent baut daneben“). Zu jeder Phase gehört ein **Spieler-Szenario**, das per `cdp.py` durchgespielt wird.
4. **Klassen ↔ CSS abgleichen.** Jede neue UI-Klasse im JS braucht eine Regel im CSS (in 1.0 fehlten ganze Stylesheets). Präfixe eindeutig: `pa-` Palette, `am-` Auftragsmappe, `np-` Netzplan, `tm-` Terminal, `ev-` Ereignis.
5. **Lehren vor Abfragen.** Jede neue Fehlerursache/jeder Befehl bekommt Lehrtext in drei Tiefen (E/AP1/AP2) mit Quelle; Unbelegtes heißt „IOS-ähnlich“/„Windows-ähnlich“. Keine Cisco-Logos.
6. **Spielstand bleibt lesbar.** Neue Felder optional mit Standardwert; `v:1 → v:2` mit Migration und Test „alter Spielstand lädt“.
7. **Windows bauen, Linux nicht.** Vor dem Build laufendes Programm stoppen.
8. **Ruhe bleibt Prinzip:** „Niemand kündigt“, Leiste ohne Ton und ohne Fokusklau, Ereignisse nie als Pop-up-Flut.
9. **Messbar statt „fühlt sich übersichtlich an“:** siehe Abnahme A.

---

## Phase 0 · Bestand klären (halbe Stunde)

> [!check] Erledigt 04.10.2026 – Ergebnis und Ist-Werte: [[#Ergebnis Phase 0 und A]]

- Im Git liegen ungespeicherte Änderungen: `src/spiel/abnahme.js`, `postfach.js`, `ui/spiel.js` geändert, `src/spiel/post.js` neu und nicht in Git. Erst prüfen, ob das ein angefangenes Stück ist (Diff lesen, Tests laufen lassen), dann committen oder sauber zurücknehmen. Nicht darauf weiterbauen, ohne es zu verstehen.
- Die Datei `Programm/Endversion-1.0/Cisco Packet Tracer 2 - Keine Viren.rar` gehört nicht ins Projekt-Git (nicht anfassen, nur aus dem Commit heraushalten).
- Basislinie festhalten: 124 Tests grün, Tag `v1.1`. Neuer Zweig `ausbau-1.2`.
- **Messwerte Ist** für Phase A erheben (per `cdp.py eval`): Anzahl sichtbarer bedienbarer Elemente im Labor-Startzustand eines Tickets, Wörter oberhalb der Falz. Diese Zahlen kommen in die Notiz, damit „besser“ prüfbar ist.

---

## Phase A · Aufräumen: weniger auf einmal, klarer Blick

> [!check] Gebaut 04.10.2026, Abnahme erfüllt (12 Elemente, 32 Wörter, 1 Hauptknopf) – [[#Ergebnis Phase 0 und A]]. **Haltepunkt: du spielst an.**

**Ziel:** Beim Öffnen eines Auftrags weiß man in 5 Sekunden, was zu tun ist.

**A1 Geräte-Fächer (Flyout).** `ui/editor.js` / `editor-werkzeuge.js` (Geräteleiste), `ui/geraetebilder.js` (`UI.GERAETE` bekommt `kategorie`).
- Schmale Leiste mit **4 Kategorie-Symbolen**: *Endgeräte* (PC, Laptop, Tablet, Kasse, Drucker) · *Server & Speicher* (Server, NAS) · *Netzwerk* (Switch, Router, Firewall) · *Außenwelt* (Internet). Platz für später: *Drahtlos* (Access Point), *Zubehör* (Kabeltester).
- Klick auf eine Kategorie öffnet ein **Fach** daneben (Liste mit Symbol, Name, Kurzzeile, Taste); zweiter Klick/Esc/Klick daneben schließt. Immer höchstens ein Fach offen. Geräte weiter per Ziehen *oder* Klick platzieren (Zeigerereignisse, kein HTML5-DnD). Platzieren schließt das Fach, außer Umschalt gehalten.
- Oben im Fach „Zuletzt benutzt“ (max. 3). Tastenkürzel 1–4 öffnen die Fächer, Suche über die Befehlspalette bleibt.
- Kontext: Bei Auftragsstart öffnet sich *kein* Fach; der Coach zeigt höchstens mit einem Puls auf die passende Kategorie. Im Shop gesperrte Geräte erscheinen ausgegraut *im* Fach mit einem Satz Begründung.

**A2 Auftragsleiste → eine Zeile + Mappe.** `ui/spiel.js` (Auftragsleiste).
- Standard: eine Zeile — Titel · Kunde · Ziele `0/1` · **[Auftrag lesen]** · **[Abnahme]**. Hilfe wandert in ein „…“-Menü (Hilfeleiter bleibt unverändert).
- **Auftragsmappe** (Schublade von oben/links, zugeklappt): Reiter *Brief* (Kundentext, max. ~60 Wörter sichtbar, Rest „mehr“) · *Ziele* (Liste mit Live-Haken) · *Plan* (Phase B). Beim ersten Öffnen eines neuen Auftrags klappt sie einmal auf, danach nie von selbst.
- **Coach:** genau *ein* Satz + *ein* Knopf, nie zwei Hinweise gleichzeitig; „Hinweise aus“ bleibt.

**A3 Ebenen & Inspektor ruhiger.**
- Die Ebenen-Reiter (Physik/VLAN/IP-Netze/MAC/Routen) werden ein einzelnes **Ansicht-Menü**; das Ticket legt die Standardansicht fest (Skill → Ebene). Einstiegsaufträge zeigen das Menü gar nicht.
- Inspektor: Standardreiter „Übersicht“; **Terminal** wird ein Knopf in der Kopfzeile des Inspektors (öffnet das Terminal-Fenster aus Phase C), nicht mehr ein Reiter.
- Simulations-Panel bleibt zu, bis eine Simulation läuft (öffnet sich dann einmal).

**A4 Textdiät.** Hinweiskästen auf eine Quelle der Wahrheit; Lehrtexte erscheinen als Stufe (E→AP1→AP2) erst auf Klick „Erklär mir das“; Toasts gebündelt (max. 1 gleichzeitig).

**Abnahme A (messbar + Szenario):**
- Sichtbare Bedienelemente im Labor-Startzustand: von *Ist* auf höchstens **12**; Wörter oberhalb der Falz höchstens **40**; genau **ein** hervorgehobener Primärknopf je Zustand (per `cdp.py eval` zählen, Wert in die Notiz).
- Szenario: Neuer Spielstand → Erster Auftrag → Fach „Endgeräte“ öffnen → PC platzieren → Mappe öffnen/schließen → Abnahme. Bildschirmfotos vorher/nachher in 1366×768 **und** schmal (Leiste 320 px).
- 124 Tests bleiben grün. **Haltepunkt: du spielst an.**

---

## Ergebnis Phase 0 und A

*Gebaut und geprüft am 04.10.2026. Alles unten ist im echten Programm gesehen (`python tools/cdp.py start --frisch` + `lauf`), nicht nur getestet.*

### Phase 0 · Bestand

- **Ungespeicherte Änderungen** waren ein fast fertiges Stück „Kundenpost“ (Lob vom Kunden nach dem 2. und 5. Ticket, Notiz vom Senior bei neuem Kunden). **Behalten und repariert:** In `ui/spiel.js` stand ein `"\n"` als echter Zeilenumbruch im String → Syntaxfehler, das Programm wäre gar nicht gestartet (die Tests laden `ui/` nicht, deshalb waren sie trotzdem grün). Dazu fehlten zwei CSS-Regeln. Zwei Tests ergänzt. Im Programm gesehen: Hinweis „✉ Neue Nachricht“, Abschnitt „Nachrichten“ im Postfach.
- Die `.rar` bleibt per `.gitignore` draußen (nicht angefasst). Zweig `ausbau-1.2` angelegt.
- **Neues Messwerkzeug:** `python tools/cdp.py lauf schritte.txt [mess.json]` spielt ein Szenario in einer Sitzung (feste Fenstergröße per Emulation, Klick/Ziehen per CSS-Selektor, `messen`, `shot`) und meldet JS-Fehler. Dazu `python tools/klassen.py` (Abgleich Klassen im JS ↔ CSS; 11 bekannte Altfälle, alles IDs/Bus-Namen).

**So wird gemessen** (Abnahme A): *Bedienelemente* = sichtbare, nicht gesperrte, wirklich anklickbare Knöpfe/Felder/Reiter; *Wörter* = sichtbarer Text im Fenster ohne Scrollen. Bereich **„Labor“** = alles außer Kopfzeile, Andock-Leiste und der Zeichnung selbst (Gerätenamen, IPs); in Klammern das **ganze Fenster**. Kopfzeile und Andock-Leiste (13 Knöpfe) hat Phase A nicht angefasst.

### Messwerte vorher → nachher

| Zustand („Kasse ohne Netz“, neuer Spielstand) | Bedienelemente Labor (Fenster) | Wörter Labor (Fenster) | Hauptknöpfe |
|---|---|---|---|
| **Ist 1.1**, Start, 1366×768 | 30 (43) | 120 (160) | 1 |
| **Ist 1.1**, Start, 960×768 | 30 (42) | 100 (121) | 1 |
| **Nachher**, Start, 1366×768 | **12** (25) | **32** (70) | **1** – Abnahme |
| **Nachher**, Start, 960×768 | **12** (24) | **32** (65) | **1** – Abnahme |
| Fach „Endgeräte“ offen | 15 | 55 | 1 |
| PC platziert (Inspektor erscheint) | 19 | 50 | 1 |
| Mappe offen | 20 | 112 | 1 – „Zurück ins Labor“ |
| Simulation offen (nach dem ersten Ping) | 34 | 168 | 1 |
| 2. Auftrag: Mappe klappt von selbst auf | 12 | 76 | 1 – „Los geht’s“ |
| 2. Auftrag nach dem Schließen | 11 | 17 | 1 |

Die Grenzen (≤ 12, ≤ 40, genau 1) gelten für den **Startzustand** und sind erfüllt. Fach, Mappe und Simulation sind Zustände zum Auswählen bzw. Lesen und haben mehr – aber auch dort genau einen Hauptknopf. Ehrlich dazu: Das **Freie Labor** hat keinen Hauptknopf (kein Ziel, also keine Abnahme).

### Was gebaut ist

- **A1 Geräte-Fächer:** 4 Kategorien links, Klick öffnet ein Fach (Symbol, Name, Kurzzeile, Taste), ziehen oder anklicken, Umschalt hält das Fach offen, „Zuletzt benutzt“ (max. 3), Tasten **1–4** öffnen Fächer, im Fach **1…n** wählt das Gerät; Befehlspalette kann „… einsetzen“.
- **A2 Auftragszeile + Mappe:** eine Zeile (Kunde · Titel · Ziele x/y · *Auftrag lesen* · *Abnahme* · ⋯). Hilfe steckt im ⋯-Menü (Hilfeleiter unverändert). Mappe mit **Brief** (max. ~60 Wörter, Rest „mehr lesen“, Symptom) und **Ziele** (Live-Haken); klappt beim ersten Öffnen eines Auftrags einmal auf.
- **A3:** Ebenen-Reiter → **Ansicht-Menü** (Ticket legt die Ebene fest, Einstieg zeigt das Menü nicht); Zoom → **ein** Knopf mit Menü; Rückgängig erst sichtbar, wenn es etwas gibt; **Inspektor** erscheint mit der ersten Auswahl, beginnt mit „Übersicht“, **Terminal/Konsole ist ein Knopf im Kopf**; **Simulation** bleibt unsichtbar bis zum ersten Ping und klappt dann einmal auf.
- **A4 Textdiät:** Coach = ein Satz + „Hinweise aus“; Werkzeughinweis schweigt, solange der Coach spricht; **höchstens ein Toast** gleichzeitig; Lehrtexte in Simulation und „Noch nicht ganz“ erst auf **„Erklär mir das“** (dann ausführlicher, zuletzt die Quelle).

### Entscheidungen, die du kennen solltest

- **Tastenkürzel geändert:** 1–4 öffnen jetzt die Fächer, die Ebenen liegen auf **Umschalt+1…5**.
- **Erster Auftrag ohne Mappe:** Willkommen + Coach übernehmen dort; ab dem 2. Auftrag klappt sie auf (Brief, oder Ziele, wenn du den Brief im Postfach schon gelesen hast). In der Prüfung keine Mappe.
- **Platzieren** kehrt danach zum vorherigen Werkzeug zurück (im Szenario gefunden: Sonst verschob der Coach-Schritt „Kabel ziehen“ nach dem Platzieren die Kasse).
- **Nicht gebaut, weil es keinen Auslöser gibt:** Puls auf eine Kategorie (kein Ticket verlangt ein neues Gerät) und ausgegraute „im Shop gesperrte“ Geräte (der Shop sperrt keine Geräte). Kommt, sobald es das gibt.
- **Terminal-Knopf** öffnet vorerst die bisherige Konsole im Inspektor; das eigene Terminal unten ist Phase C.

### Noch offen / aufgefallen

- Mit offener Simulation **und** Inspektor wird die Zeichenfläche in 1366×768 klein (Zoom ~35 %). Das war vorher genauso; passt gut zu Phase C (Terminal und Simulation unten als Reiter).
- Kopfzeile und Andock-Leiste sind unverändert (zusammen 13 Knöpfe im ganzen Fenster).
- Versionsnummer, Liesmich und Wiki kommen in Phase F.

### Bildschirmfotos

Vorher (1.1) und nachher, Startzustand – 1366×768:
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-Phase-A/vorher-1366-start.png|640]]
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-Phase-A/nachher-1366-1-start.png|640]]

Schmal (960 px, Inspektor 320 px) – vorher und nachher:
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-Phase-A/vorher-960-start.png|480]]
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-Phase-A/nachher-960-1-start.png|480]]

Szenario (1366×768): Fach → PC platziert → Mappe → „Erklär mir das“ → Simulation → bestanden:
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-Phase-A/nachher-1366-2-fach.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-Phase-A/nachher-1366-3-pc.png|420]]
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-Phase-A/nachher-1366-4-mappe.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-Phase-A/nachher-1366-6-erklaer.png|420]]
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-Phase-A/nachher-1366-8-sim.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-Phase-A/nachher-1366-9-ergebnis.png|420]]

Außerdem gesehen: 2. Auftrag mit aufgeklappter Mappe, Terminal-Knopf, Kundenpost im Postfach, Ansicht-Menü im Freien Labor:
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-Phase-A/nachher-1366-10-ticket2-mappe.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-Phase-A/nachher-1366-12-terminal.png|420]]
![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-Phase-A/nachher-1366-14-postfach-post.png|420]] ![[10-Projekte/Lernprojekte/Netzwerk-Labor/Nachweise/1.2-Phase-A/nachher-1366-16-sandbox-ansicht.png|420]]

Alle Bilder und Messdateien (`*.json`): `Nachweise/1.2-Phase-A/` (liegt im Vault, nicht im Git).

---

## Phase B · Netzwerkplan zum Auftrag

**Kernidee:** Das Ticket baut schon heute ein *gesundes* Netz (`netz(z)`) und wendet danach die Fehler an. Aus dem gesunden Netz entsteht der **Plan** – ohne neue Handarbeit pro Ticket. Was im Labor vom Plan abweicht, ist der Fehler. Der Plan verrät die Ursache nie, weil er *vor* der Fehlerinjektion entsteht.

**B1 Plan-Erzeuger** (neu `src/spiel/plan.js`, headless): `Plan.aus(netz, {sicht, detail, verdeckt})` → reines Datenobjekt (Knoten, Linien, Beschriftungen, Adresstabelle). Drei Detailstufen:
1. *Skizze* (Kunde): Geräte, Namen, Standort, Linien; wenige Adressen; bewusst unvollständig, handschriftlicher Look.
2. *Netzplan* (IT-Doku): Ports, IPs, VLANs, Netze.
3. *Adresstabelle* (nur Tabelle: Gerät · IP · Maske · Gateway · DNS · VLAN).
Ticketfeld `plan:{art:"skizze"|"netzplan"|"tabelle"|"soll"|"keiner", verdeckt:[geraet/feld], abweichung:false}`; Standard je Stufe (E: Netzplan, AP1: Skizze+Tabelle, AP2: nur Tabelle oder Skizze mit Lücken).

**B2 Darstellung** (neu `ui/netzplan.js`, Präfix `np-`): saubere, **automatisch ausgerichtete** SVG-Zeichnung (nicht die Laborfläche), Schriftgröße ≥ 14 px, Legende, Zoom. Anzeigen als Reiter *Plan* in der Mappe **oder angeheftet** neben dem Labor (geteilte Ansicht). Klick auf ein Plan-Gerät → springt/pulst im Labor und umgekehrt.

**B3 Plan ↔ Ist.** Hilfeleiter bekommt eine Stufe „Plan mit Labor vergleichen“: blendet Abweichungen als Markierungen ein (Diff Plan ↔ Laborstand, nur *Konfigurations-/Kabel*abweichungen, nicht die Ursache). Das lehrt Dokumentation prüfen.

**B4 Neue Zielart `topologie`/`adresse` für Projekte:** Bauauftrag mit **Soll-Plan**; das Labor startet leer; auf Wunsch zeigt ein blasser **Geisterplan** hinter der Fläche, wo was hin soll (Hilfestufe). Abnahme prüft Topologie (Geräte/Kabel) und Adressplan.

**B5 „Plan stimmt nicht“-Aufträge (Audit):** Kundenplan hat 1–3 Fehler gegenüber dem Labor; der Spieler markiert Abweichungen (Prüfungsform, Wirkung auf Sterne).

**Tests:** Plan ist deterministisch (Seed); *für alle Tickets*: Plan enthält keinen injizierten Fehlerwert (Test über `fehler[]`); Plan-Layout ohne überlappende Beschriftungen (Geometrietest); Diff Plan ↔ Netz meldet genau die injizierten Abweichungen.
**Abnahme B:** Szenario „Kasse ohne Netz“: Plan neben dem Labor, Klick auf die Kasse, Plan zeigt Gateway `.254`, Labor zeigt `.1` → Spieler entdeckt es ohne Hilfe. Bildschirmfoto.

---

## Phase C · Terminal als Kernfunktion

**C1 Terminal-Fenster** (`ui/konsole.js` umbauen, Präfix `tm-`): Das Terminal liegt **unten angedockt** als Reiter neben „Simulation“ (nicht mehr im 300-px-Inspektor), lässt sich vergrößern/lösen. **Doppelklick auf ein Gerät** oder Taste `T` öffnet es für dieses Gerät; mehrere Sitzungen als Tabs; Verlauf `↑`, `Tab`, `Strg+C`, Kopieren, „Pakete ansehen“-Link nach `ping`/`tracert` springt in die Simulation. Eingabevorschlag bleibt als einklappbare Zeile (Einsteiger).

**C2 Betriebssystem je Gerät.** Modell: `geraet.os` = `"windows"|"linux"|"ios"` (Standard pc/laptop/kasse → windows, server/nas → linux, Rest → ios); Migration, Inspektor zeigt/ändert es (Server: Windows Server oder Linux). Neu `cli/host-windows.js` (aus `host-terminal.js`), neu `cli/host-linux.js`. Gemeinsame Basis bleibt `CLI.hostEingabe`.

**Befehlsumfang** (Priorität = Prüfungs- und Alltagsrelevanz; was nicht belegt ist, kennzeichnen):
- *Windows (cmd):* `ipconfig` (`/all /release /renew /flushdns /displaydns`) · `ping` (`-n -t -l -4`) · `tracert` · `pathping` (kurz) · `arp -a/-d` · `nslookup` (**interaktiv**: `server`, `set type=`, Name) · `netstat -an` · `route print` / `route add` · `getmac` · `hostname` · `type C:\Windows\System32\drivers\etc\hosts` · `curl` · `telnet`/Portprüfung · `net view`/`net use` (Datei) · **`netsh interface ip set address … / show config`** (statische Adresse *per Befehl* setzen, ändert die Konfig über `Modell.setzen` + Verlauf) · `whoami`, `systeminfo` (gekürzt) · PowerShell-Auszug: `Test-NetConnection`, `Resolve-DnsName`, `Get-NetIPConfiguration`.
- *Linux (bash):* `ip a`, `ip r`, `ip link`, `ip addr add`/`ip route add` · `ping -c` · `traceroute` · `dig`/`nslookup`/`host` · `ss -tulpn` · `curl` · `cat /etc/resolv.conf`, `/etc/hosts` · `sudo` · `systemctl status|start|stop|restart` für `dhcpd`, `named`/`dnsmasq`, `apache2`, `smbd`, `ssh` (**Dienste an/aus per Befehl**) · `hostnamectl` · `tcpdump -n` (zeigt die Pakete der letzten Simulation – starke Brücke zur PDU-Ansicht) · `man`-Kurzhilfe (`befehl --help`).
- *Alle:* `help`/`--help`, Tab-Vervollständigung, **jeder Fehler mit „Was bedeutet das?“-Link** (vorhandene Tipps beibehalten, Windows/Linux-Wortlaut belegen).

**C3 Cisco-IOS-Inventur und Ausbau** (siehe auch D-Rest): zuerst Inventur-Test „Befehl × Modus × vorhanden“, dann Lücken füllen in dieser Reihenfolge: `show ip route`, `show vlan brief`, `show interfaces trunk`, `show mac address-table`, `show ip arp`, `show ip dhcp binding|pool|conflict`, `show ip nat translations|statistics`, `show cdp neighbors`, `show version`, `show clock`, `show users`; Konfig: `ip routing`, `ip domain-name`, `crypto key generate rsa` + `transport input ssh` (SSH-Zugang zum Switch aus dem PC-Terminal: `ssh -l admin 10.0.0.2`), `service password-encryption`, `banner`, `enable secret` (vorhanden prüfen). Immer „IOS-ähnlich“-Hinweis, kein Cisco-Nachbau behaupten.

**C4 Üben im Terminal – neue Zielarten** (`Spiel.abnahme`): `befehl` (Befehl wurde ausgeführt, z. B. „Sieh dir die Adresse mit `ipconfig` an“) und **`antwort`** („Lies aus der Ausgabe die Gateway-Adresse ab und trag sie ein“ – Eingabefeld, geprüft gegen die echte Simulation). Dazu **Mini-Tickets „Terminal“** (Befehl vorhersagen, Ausgabe deuten, Befehl für Aufgabe wählen) im Lernmotor als Skills `lab.cli.*`.

**C5 Diagnoseleiter als Gewohnheit:** Abzeichen „Von unten nach oben“ (ipconfig → Gateway → extern → nslookup), kein Zwang. Hilfestufe nennt die nächste sinnvolle Diagnose, nicht die Lösung.

**Tests:** Ausgabe-Schnappschüsse je Befehl (Format stabil); Eingabe-Fuzz (nie Exception, unbekannter Befehl → Hilfe); `netsh`/`ip addr add` ändern Konfig *und* Verlauf (Rückgängig geht); Befehl-Inventur als Test.
**Abnahme C:** Szenario „Rechner ohne Internet“: nur über das Terminal diagnostizieren (`ipconfig` → `ping` Gateway → `nslookup` → `netsh`-Korrektur → Abnahme grün). Bildschirmfoto. **Haltepunkt: du spielst an.**

---

## Phase D · Funktionstiefe der Geräte

**Definition „fertig“ je Funktion (Pflichtliste):** ① Modell/Konfig (in `Architektur.md`) ② Sim-Verhalten + neue Gründe/Codes ③ CLI (IOS *und* Host) ④ Oberfläche im Inspektor ⑤ Lehrtext E/AP1/AP2 + Quelle ⑥ 3–5 Fehlerinjektoren ⑦ mindestens 1 Ticket pro Stufe, automatisch validiert ⑧ Tests ⑨ Wiki-Eintrag + Skill im Lernmotor. Wird eins davon ausgelassen, gilt die Funktion nicht als eingebaut.

**D1 DHCP (zuerst):** Lease-Zeit mit Ablauf in virtueller Zeit und Erneuerung bei 50 % · Reservierung (MAC → IP) · Optionen (Gateway, DNS, Domain) · Ausschlussbereiche (vorhanden) · Adresskonflikt-Erkennung · Pool-Erschöpfung (vorhanden, vertiefen) · **Rogue-DHCP** (zweiter Server verteilt falsches Gateway) und **DHCP-Snooping** (Trusted-Ports am Switch) · Relay (vorhanden). Oberfläche: Server-/Router-Panel mit **Lease-Tabelle**. CLI: `show ip dhcp binding|pool|conflict`, `ip dhcp excluded-address`, `ip dhcp pool`, `ipconfig /all` mit Lease-Zeiten, Linux `dhclient`/`journalctl`-Auszug. Fehler: falscher Pool, Relay fehlt, Snooping blockt, doppelter Server, Pool leer, Lease abgelaufen.

**D2 DNS:** Zonen und Einträge **A/CNAME/MX/PTR/NS** · rekursiv vs. autoritativ, **Forwarder**, Cache mit TTL (`ipconfig /displaydns`, `/flushdns` wirkt) · **hosts-Datei hat Vorrang** · DNS-Suffix-Suche · Internet-Kulisse als Root/Autorität. Trace zeigt die Kette Client → lokaler DNS → Forwarder → Autorität. CLI: `nslookup` interaktiv, `dig`, `Resolve-DnsName`. Fehler: falscher DNS-Server, fehlender Eintrag, veralteter Cache, Tippfehler in hosts, Forwarder weg, falsche Zone.

**D3 Switching: STP/RSTP-light** (Root-Bridge-Wahl, blockierte Ports, Schleife *mit* und *ohne* STP – der Broadcast-Sturm existiert schon als Vergleich) · `show spanning-tree` · optional EtherChannel später.

**D4 Routing:** OSPF Einzelbereich (Nachbarn, Netze, Default-Route verteilen) *erst nach* D1–D3 und E; `show ip ospf neighbor`. HSRP/IPv6 bleiben Backlog.

**D5 Geräte-Erweiterung (nutzt die Fächer aus A1):** Access Point + WLAN-Client (SSID, WPA2, Kanal) · optional VPN-Gateway. Backlog, nur wenn D1–D3 stehen.

**Gewichtung nach Prüfungsrelevanz:** DHCP/DNS/VLAN/NAT/ACL/Subnetting vor STP vor OSPF. Für jede Funktion vorab mit `Network – Lernfassung`, `VLAN – Lernfassung`, `TCP – Lernfassung` und den AP-Fragen im Vault abgleichen (Quelle in den Lehrtext).

**Wichtig – Regressionsschutz:** Die Simulation verändert Traces (neue Ereignisse). Vor D1 die Golden-Tests (`sim-golden`) einfrieren, nach jeder Änderung diffen; PDU-/Simulationsansicht im Programm prüfen.

---

## Phase E · Spielschleife: Abwechslung und Zufall

**E1 Sechs Auftragsformen** (neben „Störung beheben“ und „Projekt“), jede mit eigenem Rhythmus und eigener Fertigkeit:
1. **Terminal-Forensik:** Netz ist unsichtbar; nur ein Rechner per Terminal („Fernwartung“). Befehle üben (nutzt Phase C).
2. **Plan-Audit:** Kundenplan hat Fehler, markiere Abweichungen (Phase B5).
3. **Adressplan/Beratung:** Subnetting-Auftrag, Tabelle ausfüllen, geprüft (Prüfungsnähe AP1/AP2).
4. **Hotline:** Kunde beschreibt im Alltagston; du wählst Rückfragen (Textbaum, reine Daten) und bekommst dadurch Hinweise/den Plan; danach Störung. Übt Fragetechnik.
5. **Sicherheitsvorfall:** Rogue-DHCP, fremdes Gerät am Port, offener Dienst (nutzt D1/Port-Security).
6. **Inbetriebnahme/Rollout:** mehrere gleiche Arbeitsplätze nach Plan (Tempo-Aufgabe, nur Zeitdruck wenn der Spieler es einschaltet).

**E2 Ticket-Mischer** (`Spiel.postfach`): Auswahl nach *Zeit seit letzter Form*, Lernstand (fällige Fertigkeiten, Lernmotor) und Stufe; **nie dieselbe Form mehr als zweimal hintereinander**; Postfach zeigt Formen als kleine Marken (Symbol + Wort). Test: 1000 simulierte Postfächer → Mindestvielfalt eingehalten.

**E3 Zufallsereignisse** (`spiel/ereignisse.js`, deterministisch über Seed + Zeitstempel; Datenformat in der Architektur):
- *Negativ, aber lehrreich:* **Stromausfall** beim Kunden → alle Geräte starten neu, **nicht gespeicherte Konfig ist weg** (lehrt `copy run start`) · **Kabelschaden** (Marder/Putzkraft) → Link down · **Provider-Störung** → Internet weg, *nicht dein Fehler* (Ursache erkennen und dem Kunden sagen) · **„Der Praktikant hat nur kurz …“** (Umkonfiguration).
- *Positiv:* Weiterempfehlung → neuer Kunde · Lob/Ruf · Fördergeld/Rabatt im Shop.
- *Entscheidung:* **Notfall-Anruf** — zwei Dinge gleichzeitig, du wählst die Reihenfolge (Priorisierung; SLA-Frist sichtbar), jede Wahl hat Folgen, aber **nie Verlust von Fortschritt**.
- Regeln: höchstens ein Ereignis je ~15 Minuten aktiver Zeit, Abklingzeit, einstellbare Häufigkeit (aus / selten / normal), in der Leiste nur als Zähler/Punkt, jedes Ereignis mit Erklärsatz („Das passiert in echt, weil …“).

**E4 Tagesbogen (klein):** „Heute dran“ bekommt eine Reihenfolge-Entscheidung statt Pflichtliste; Bonus nur für kluge Priorisierung. Meta-Ausbau (Spezialisierung, Büroausstattung) bleibt Backlog.

**Tests:** Mischer-Vielfalt; Ereignisse reproduzierbar mit Seed; jedes Ereignis erzeugt ein gültiges (validiertes) Ticket oder einen gültigen Zustandswechsel; Offline-Bericht berücksichtigt Ereignisse nicht rückwirkend.
**Abnahme E:** Szenario „Vormittag“: 6 Aufträge nacheinander zeigen mindestens 4 Formen; ein Stromausfall-Ereignis löst aus, zeigt, dass ungesicherte Änderungen weg sind, und lässt sich per `write memory` vermeiden. Bildschirmfotos.

---

## Phase F · Abschluss 1.2

- Wiki-Einträge und Lernstand-Skills (`lab.cli.*`, `lab.dhcp.*`, `lab.dns.*`, `lab.plan.*`, `lab.stp.*`), Abzeichen (Terminal, Plan lesen, Ereignis gemeistert).
- Spielstand-Migration `v:2` getestet, alter Spielstand und „vorheriger Stand“ laden.
- `Architektur.md`, `Liesmich.md`, Version 1.2.0, `Programm/Endversion-1.1/` als Rückfall kopieren, Git-Tag `v1.2`, Windows-Build, **Gesamtdurchspiel im echten Programm** mit Bildschirmfotos.

---

## 2 · Wie die zwei Iterationen den Plan verändert haben

**Iteration 1 (Entwurf → Kritik):**
- *Zu groß, Cisco-Tiefe unbegrenzt* → Prioritätsregel (Prüfungsrelevanz), Definition „fertig“ mit neun Pflichtpunkten je Funktion (D), STP/OSPF/Geräte-Erweiterung ans Ende.
- *Plan könnte die Lösung verraten* → Plan entsteht aus dem *gesunden* Netz vor der Fehlerinjektion; Test, dass kein Fehlerwert im Plan steht (B).
- *Terminal-Befehle ohne Betriebssystem im Modell* → `geraet.os` mit Migration (C2).
- *Zufallsereignisse können nerven oder bestrafen* → Frequenzgrenze, Aus-Schalter, nie Fortschrittsverlust, jedes Ereignis lehrt etwas (E3).

**Iteration 2 (Kritik der Fassung 1):**
- *„Übersichtlich“ war nicht prüfbar* → harte Messwerte (≤ 12 Elemente, ≤ 40 Wörter, ein Primärknopf) mit Messung vorher/nachher (0, A).
- *Grüne Tests ohne Wirkung sind schon einmal passiert* → je Phase ein Spieler-Szenario per `cdp.py` plus „Klassen ↔ CSS“-Abgleich und Pflicht, dass jede neue Funktion aus Ticket/Oberfläche aufgerufen wird (Leitplanken 3–4).
- *Simulationsänderungen könnten PDU-Ansicht und alte Tickets brechen* → Golden-Tests einfrieren, Diff nach jeder Änderung (D).
- *Reihenfolge* → Aufräumen (A) zuerst, weil es sofort sichtbar ist und Plan/Terminal die neue Struktur (Mappe, unteres Fach) benutzen; Events (E) nach B–D, weil sie deren Inhalte brauchen.
- *Ungespeicherte Änderungen im Git* → Phase 0.
- *Haltepunkte* → nach A, B, C spielst du an; erst dann weiter (Rückmeldung früh, weniger Nacharbeit).

---

## 3 · Entscheidungen (Standard gilt, außer du widersprichst)

| Frage | Standard |
|---|---|
| Geräte-Auswahl: Aufklapp-Liste oder Fach daneben? | **Fach daneben** (Flyout), spart dauernd Platz |
| Terminal: Fenster oder Reiter? | **Unten angedockt als Reiter** neben Simulation, lösbar |
| Cisco-Tiefe | Nach Prüfungsrelevanz; „IOS-ähnlich“, kein Nachbau |
| Zufallsereignisse | Standard „selten“, abschaltbar, nie Fortschrittsverlust |
| Linux-Build | weiter nicht; nur Windows |
| Kunden-Netzplan | Skizze (E: voller Netzplan), immer aus dem gesunden Netz |

## 4 · Startblock für Opus (je Sitzung eine Phase kopieren)

````text
Du arbeitest am „Netzwerk-Labor“ (Ordner Joshua/10-Projekte/Lernprojekte/Netzwerk-Labor). Lies zuerst
„Plan – Ausbau 1.2.md“ (Abschnitte 1 und die Phase PHASE vollständig), dann „Architektur.md“ und die in der
Phase genannten Dateien. Baue SELBST und nacheinander (keine Agenten). Nach jedem Modul: sh tools/test.sh,
dann Git-Commit auf Zweig ausbau-1.2. Ändere Datenformen zuerst in Architektur.md. Fertig ist eine Phase erst,
wenn ihr Spieler-Szenario im echten Programm (python tools/cdp.py …) durchgespielt ist, Bildschirmfotos
vorliegen und die Messwerte der Abnahme stimmen. Berichte ehrlich, auch was nicht klappt. Windows bauen, Linux nicht.

PHASE: 0 und A
````

Verwandt: [[Konzept – Netzwerk-Labor]] · [[Architektur]] · [[Opus-Auftrag – Netzwerk-Labor]]
