# Netzwerk-Labor – spielen (Browser-Fassung)

Kurzanleitung bis zum ersten Auftrag. Die **vollständige** Anleitung für die Klasse ist
`Programm\LIESMICH.txt` – dieses Blatt ersetzt sie nicht, es widerspricht ihr nicht.

## 1 · Starten

1. **Entpacken:** Rechtsklick auf `Netzwerk-Labor-Browser.zip` → „Alle extrahieren …“ → eigenen Ordner wählen.
2. Im entpackten Ordner **`index.html` doppelklicken** – oder Rechtsklick → „Öffnen mit“ → deinen Browser.
   Das Spiel braucht keine Installation, keine Anmeldung und kein Internet: `index.html` verweist nur auf
   `schriften.css` im selben Ordner, und im Spiel gibt es keinen einzigen Netzwerkaufruf (kein `fetch`,
   kein `XMLHttpRequest`, kein `WebSocket` – im gebauten `index.html` nachgezählt).

Bitte wirklich erst entpacken: Im ZIP liegen `index.html`, `schriften.css` und der Ordner `schriften/`
nebeneinander, und das Spiel holt sich die Typografie über den relativen Pfad `schriften.css`
(bzw. darin `schriften/…`). Nur entpackt liegen diese Teile so beieinander, wie das Spiel sie erwartet.

`tests.html` („Netzwerk-Labor – Tests“) ist die Selbsttest-Seite des Spiels – zum Spielen nicht nötig.

*Nicht geprüft:* Ich habe in dieser Sitzung keinen Browser geöffnet. Gemessen ist nur das Paket selbst
(Abschnitt 5); wie das Spiel auf diesem Rechner im Browser aussieht, habe ich **nicht** nachgesehen.
Der Oberflächen-Rauchtest (12 Ansichten × 3 Breiten, erster Auftrag mit echter Maus, Abnahme 5 ★) war laut
Auftrag 36/36 grün – wiederholt habe ich ihn nicht.

## 2 · Die ersten fünf Minuten

Alle Bezeichnungen unten stehen genau so im gebauten Spiel (`web/index.html`).

1. **Postfach** öffnen und die erste Kundenmail lesen („Die Kasse druckt nicht mehr“).
2. **„Auftrag annehmen“** klicken – das Netz erscheint im Labor.
3. Ein Gerät **anklicken**: rechts zeigt der **Inspektor** Adressen, Ports, VLAN, Routen, ACL, NAT; der
   Reiter **Konsole** ist das IOS-ähnliche Terminal.
4. Oben stehen die **Ziele** des Tickets. Im Einstieg springen sie live auf ✓, während du arbeitest.
5. **Werkzeuge** oben links in der Laborfläche – die Kurztaste steht in Klammern:
   - „Auswählen und verschieben (V)“ – Geräte anfassen und ziehen
   - „Kabel verlegen (K)“ – vom Gerät zum Gerät ziehen
   - „Ping-Werkzeug (P)“ – von Gerät A auf Gerät B ziehen
6. Ein Gerät **doppelklicken** (oder Taste **T**) öffnet sein Terminal.
7. Nach einem Ping unten **„In Simulation öffnen“**: das Paket Schritt für Schritt, Schicht für Schicht (PDU).
8. **🛟 Hilfe** (Checkliste, Werkzeugtipp, Frage vom Senior) ist am Anfang gratis; **Fehler kosten nichts**.
9. Zum Schluss **„Abnahme anfordern“** – der Kunde prüft selbst nach, auch ob du dabei etwas anderes kaputt
   gemacht hast.

Danach: Lernstand (Ringe, Abzeichen, Fehlerheft, Prüfungstag), Tagesziel 3 Tickets mit Feierabend-Bilanz,
Wiederholungen im richtigen Abstand. Einzelheiten in `LIESMICH.txt`.

## 3 · Browser-Fassung gegen Desktop-Programm

Im Browser fehlen die Fenster-Funktionen. Das Spiel sagt das selbst an, z. B.
„Globale Tastenkürzel gibt es nur im Desktop-Programm.“ Ebenso Autostart und Klick-Durchlässigkeit;
Tray-Symbol und Leiste gehören zum Desktop-Programm.

Der Spielstand liegt im Browser unter dem Schlüssel `netzwerk-labor` im `localStorage` – **nicht** in
`%APPDATA%\de.fisi.netzwerklabor\spielstand.json` wie beim Desktop-Programm. Wer die Websitedaten löscht,
löscht den Spielstand. Ob dein Browser `localStorage` für eine per Doppelklick geöffnete Datei (`file://`)
dauerhaft behält, habe ich **nicht** getestet.

Die Schriften haben Rückfallketten (`--body: "Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif`),
der Text bleibt also lesbar, falls ein Browser die Dateien aus `schriften/` nicht lädt.

## 4 · Die Desktop-Fassung startet auf diesem Rechner derzeit nicht

`Programm\Netzwerk-Labor.exe` (05.10.2026 14:37) bricht beim Start mit einem WebView2-Fehler ab:
`failed to create webview`, `HRESULT(0x800700AA)` („Die angeforderte Ressource wird bereits verwendet.“),
gemessen am 05.10.2026 um 16:11:40 und 16:14:18. Vermutete Ursache: Beim Aufräumen wurden 13
`msedgewebview2.exe` zwangsweise beendet, darunter Hosts der Windows-Shell. Einzelheiten in
`Design – Spielspaß 2.0.md` § 25 und in `AGENTS.md`.

**Deshalb diese ZIP:** Die Browser-Fassung zeigt dasselbe Spiel ohne WebView2. Damit die `.exe` wieder läuft,
wäre ein Windows-Neustart nötig – der erfolgt in dieser Sitzung nicht. Die Angaben in Abschnitt 4 sind aus
`AGENTS.md` und `Design – Spielspaß 2.0.md` § 25 übernommen, **nicht** von mir neu gemessen.

## 5 · Paket in Zahlen (gemessen beim Packen, 05.10.2026)

| Prüfung | Ergebnis |
|---|---|
| `Netzwerk-Labor-Browser.zip` | 1.252.929 Bytes (≈ 1,2 MB), 05.10.2026 17:09 |
| Einträge | 21 = 20 Dateien + Verzeichniseintrag `schriften/` |
| Inhalt entpackt | 3.362.296 Bytes – genau so viel wie `web/` (20 Dateien) |
| Vergleich mit `web/` | keine Datei fehlt, keine überzählig; Größe und CRC32 aller 20 Dateien gleich |
| `index.html` | im ZIP-Wurzelverzeichnis (kein Eintrag mit Präfix `web/`), SHA256 `f91af895…9a67` |
| `schriften/` | enthalten: 17 Dateien (14 `.woff2` + 3 OFL-Lizenztexte), 396.090 Bytes |
| Alle Schriften aus `schriften.css` | im ZIP vorhanden |
| Gelesen mit | Python `zipfile` (CRC-Test ohne Beanstandung) und dem eingebauten .NET-ZIP-Leser (Explorer) |

Kurz: Das ZIP ist vollständig und inhaltlich identisch mit `web/`. **Nicht** geprüft: der Start im Browser
und die Darstellung auf einem Bildschirm.
