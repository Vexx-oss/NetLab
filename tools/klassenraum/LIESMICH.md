# Klassenraum-Live-Server (Stufe C2)

Ein eigenständiges Programm, das Ergebnisse im Klassenzimmer einsammelt: **zwei** Endpunkte,
keine fremden Kisten, kein Python, kein Runtime-Zwang. Es ist die Rückfall-Fassung zu Stufe C1
(Server in der Desktop-`.exe`) und die Fassung für Browser- und Android-Geräte.

Die vollständige Festlegung steht in [`docs/entwicklung/Klassenraum/C – Rust, Live und QR.md`](../../docs/entwicklung/Klassenraum/C%20%E2%80%93%20Rust,%20Live%20und%20QR.md).

## Bauen

```powershell
cd tools\klassenraum
cargo build --release      # -> target\release\klassenraum.exe
cargo test  --release      # 10 Tests
```

Gemessen am 06.10.2026 (cargo 1.97.1, rustc 1.97.1): Übersetzung **in 7,5 s**, `.exe`
**322.560 Bytes (0,31 MB)**, `cargo test --release` **10 von 10 grün**. Es gibt **keine**
Abhängigkeiten – `cargo fetch` scheitert in dieser Umgebung an SSL/schannel
(`SEC_E_NO_CREDENTIALS`), und die Kiste `qrcode` liegt nicht im Cache; alles Nötige steckt in
der Standardbibliothek.

## Starten

```
klassenraum [--port N] [--bind ADRESSE] [--nur-lokal] [--sitzung CODE]
            [--ablage DATEI] [--ende-nach N] [--still]
```

| Angabe | Bedeutung |
|---|---|
| `--port N` | Vorgabe **47112**; ist der Port belegt, werden 47112–47121 durchprobiert |
| `--bind A` | Vorgabe **0.0.0.0** (alle Schnittstellen), damit Schülergeräte im Klassennetz den Lehrer-Rechner erreichen |
| `--nur-lokal` | Kurzform für `--bind 127.0.0.1` (nur zum Ausprobieren) |
| `--sitzung C` | nur Ergebnisse dieser Sitzung annehmen (andere ⇒ 409) |
| `--ablage D` | Ergebnisse zusätzlich als JSON-Datei sichern (atomar); ohne: nur im Speicher |
| `--ende-nach N` | beendet sich nach N Sekunden selbst (Proben, oder „nur diese Schulstunde“) |
| `--still` | keine Startanzeige |

Beenden: `q` + Eingabetaste, Strg+C – **oder** `--ende-nach`. Der Port wird dabei freigegeben.
Das Ende der Eingabe (kein Terminal) beendet den Server **nicht**, er läuft dann als
Hintergrundprozess weiter.

## Die zwei Endpunkte

```
GET  /liste[?sitzung=NL-4F7K]   Ergebnisse abholen (200; ohne Sitzungskennung 400)
POST /ergebnis                  Ergebnis abgeben (201 neu, 200 schon bekannt)
OPTIONS <beliebig>              Preflight (204)
```

Die **Sitzungskennung ist Pflicht** – entweder als `?sitzung=…` oder beim Start mit
`--sitzung`. Ohne sie gibt der Server keine Daten heraus (400); sonst könnte im Schulnetz jede
Klasse die Platzkennungen aller Sitzungen abrufen.

`POST /ergebnis` nimmt **genau** diese fünf Felder, alles in `A–Z a–z 0–9 -`:

```json
{"sitzung":"NL-4F7K","platz":"P3","sterne":3,"dauerS":214,"code":"E-4F7K-P3-3-214-7Q"}
```

Jedes weitere Feld (z. B. `name`) wird mit **400** abgewiesen – damit ist Datensparsamkeit
erzwungen und nicht bloß erbeten. Der `code` ist der Schlüssel: derselbe Code zweimal ändert
nichts (idempotent). Statuscodes: 200, 201, 204, 400, 404, 405, 409, 413, 415, 503, 507.

## Grenzen (ehrlich)

* Rumpf **4096 Bytes** (darüber 413), Anforderungszeile 8 KiB, Kopfzeile 4 KiB, 40 Kopfzeilen.
* **5 s** Lese-/Schreibzeitlimit je Verbindung, **kein** Keep-Alive (eine Anfrage je Verbindung).
* **16** gleichzeitige Verbindungen, darüber 503 mit `Retry-After`.
* Lager: **4096** Ergebnisse, darüber 507.
* **Kein Zugriffsschutz, kein TLS.** Wer im Klassennetz ist, darf lesen und schreiben. CORS ist
  keine Zugangskontrolle. Das ist die bewusste Grenze der Hobby-Ebene: nur lokales Netz,
  keine Konten, keine Klarnamen.
* Bei einem Rumpf weit über dem Limit werden bis zu 256 KiB wegelesen, dann kommt 413 – sonst
  sieht der Client statt der Antwort nur einen Verbindungsabbruch.

Windows-Firewall: Beim ersten Start fragt Windows, ob das Programm in **privaten** Netzwerken
erreichbar sein darf. Für ein Klassenzimmer ist „Zugriff zulassen“ für private Netze richtig,
für öffentliche Netze nicht. Wird die Abfrage abgelehnt, funktioniert alles außer dem
Live-Einsammeln – Ergebnisse lassen sich weiterhin abtippen. **Ehrlich dazu:** Windows fragt
**einmal**; wer ablehnt (oder die Regel später zurücknimmt), bekommt die Abfrage nicht von
selbst wieder – dann hilft nur die Windows-Firewall-Einstellung.

## Probe

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools\klassenraum-probe\C-http-probe.ps1
```

Startet die `.exe`, stellt 18 echte Anfragen (curl.exe und Invoke-WebRequest), lässt den Server
sich selbst beenden und prüft, dass der Port wieder frei ist. Ergebnis:
`Nachweise/Klassenraum/C-http.json` und `C-http.txt`.
