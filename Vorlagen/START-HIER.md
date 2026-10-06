# Netzwerk-Labor — starten

Lernspiel für Fachinformatiker Systemintegration (IHK AP1/AP2). Kein Cisco-Produkt.
Alles läuft lokal und offline; nichts wird gesendet.

---

## Weg 1 — läuft überall, nichts zu installieren

**Doppelklick auf `Netzwerk-Labor.html`.**

Das ist das ganze Spiel in einer Datei. Die Schriften sind eingebettet, es wird nichts
nachgeladen, kein Internet gebraucht. Windows, Linux, macOS — alles mit einem Browser.

Es fehlen gegenüber dem Windows-Programm nur die Fenster-Funktionen: Leiste am
Bildschirmrand, Tray-Symbol, immer im Vordergrund, globales Tastenkürzel. Das Spiel sagt
das an der passenden Stelle selbst an.

## Weg 2 — Windows-Programm

**Doppelklick auf `Netzwerk-Labor.exe`.** Nichts installieren, kein Internet nötig.
Windows 10/11 bringt die nötige WebView2-Laufzeit mit.

Erscheint „Der Computer wurde durch Windows geschützt" (SmartScreen, weil das Programm
nicht signiert ist): **„Weitere Informationen" → „Trotzdem ausführen"**.

Startet es nicht und es erscheint kein Fenster: **Doppelklick auf
`Integritaet-reparieren.cmd`** und danach noch einmal starten. Was das Skript tut und
warum, steht ausführlich im Feld unten — es ist gemessen, nicht geraten.

---

## Die ersten fünf Minuten

1. **Postfach** öffnen und die erste Kundenmail lesen.
2. **„Auftrag annehmen"** — das Netz erscheint im Labor.
3. Ein Gerät **anklicken**: rechts zeigt der **Inspektor** Adressen, Ports, VLAN, Routen,
   ACL, NAT; der Reiter **Konsole** ist das IOS-ähnliche Terminal.
4. **Werkzeuge** oben links in der Laborfläche, Kurztaste in Klammern:
   - **V** — Auswählen und verschieben
   - **K** — Kabel verlegen (vom Gerät zum Gerät ziehen)
   - **P** — Ping-Werkzeug (von Gerät A auf Gerät B ziehen)
5. Ein Gerät **doppelklicken** (oder Taste **T**) öffnet sein Terminal.
6. Nach einem Ping unten **„In Simulation öffnen"**: das Paket Schritt für Schritt,
   Schicht für Schicht.
7. **Hilfe** ist am Anfang gratis; **Fehler kosten nichts**.
8. Zum Schluss **„Abnahme anfordern"** — der Kunde prüft nach, auch ob du dabei etwas
   anderes kaputt gemacht hast.

---

## Zwei getrennte Spielstände

| Fassung | Wo der Spielstand liegt |
|---|---|
| `Netzwerk-Labor.html` | im Browser (`localStorage`, Schlüssel `netzwerk-labor`) |
| `Netzwerk-Labor.exe` | `%APPDATA%\de.fisi.netzwerklabor\spielstand.json` |

**Die beiden Fassungen teilen sich den Spielstand nicht.** Wer im Browser anfängt und
später die `.exe` nimmt, fängt dort neu an. Wer die Websitedaten löscht, löscht den
Browser-Spielstand.

Das Windows-Programm legt täglich eine Sicherung an (5 werden behalten) und hält
zusätzlich einen „vorherigen Stand" (höchstens eine Viertelstunde zurück).
Einstellungen → Spielstand → Exportieren/Importieren für einen anderen Rechner.

---

## Was in diesem Ordner liegt

| Datei | Wozu |
|---|---|
| `Netzwerk-Labor.html` | das Spiel als Einzeldatei — **Weg 1** |
| `Netzwerk-Labor.exe` | das Windows-Programm — **Weg 2** (falls im Paket enthalten) |
| `Integritaet-reparieren.cmd` | falls die `.exe` kein Fenster zeigt |
| `LIESMICH.txt` | dieselbe Anleitung als reiner Text, ausführlicher |
| `START-HIER.md` | dieses Blatt |
| `LICENSE` | Lizenz des Programms (PolyForm Noncommercial 1.0.0) — der verbindliche Text |
| `LIZENZ.md` | dieselbe Lizenz auf Deutsch, mit den Ausnahmen |
| `LIZENZEN/` | Lizenztexte der drei mitgelieferten Schriften (SIL OFL 1.1) |

---

## Wenn etwas nicht geht

**Die `.exe` zeigt kein Fenster.** Der gemessene Grund (05.10.2026): Liegt der Ordner auf
dem Integritätslabel „Niedrig" — ein Überrest einer Werkzeug-Sandbox —, dann erbt die
`.exe` dieses Label, läuft als Low-Prozess und darf `%LOCALAPPDATA%` nicht beschreiben.
Die WebView2-Laufzeit kann ihr Profil dann nicht anlegen und bricht ab
(`failed to create webview`, `0x800700AA`). `Integritaet-reparieren.cmd` setzt das Label
auf „Mittel" zurück; es braucht keine Administratorrechte und ist wiederholbar.

**Kein Ton / keine Leiste.** Beides gibt es nur im Windows-Programm, nicht in der
Browser-Fassung.

**Der Browser behält den Spielstand nicht.** Ob ein Browser `localStorage` für eine per
Doppelklick geöffnete Datei (`file://`) dauerhaft behält, ist nicht gemessen. Wenn dir das
wichtig ist, nimm das Windows-Programm.

---

Schriften: Atkinson Hyperlegible, Bricolage Grotesque, JetBrains Mono (SIL OFL 1.1).
Inhalte nach bestem Wissen aus den Lernnotizen einer FISI-Umschulung geprüft — im Zweifel
gilt euer Unterricht.
