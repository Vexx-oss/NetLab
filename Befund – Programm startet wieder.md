---
typ: befund
erstellt: 2026-10-05
aktualisiert: 2026-10-05
status: fertig
tags: [FISI, Lernspiel, Netzwerk, Betrieb]
---

# 🖧 Befund – das Netzwerk-Labor startet wieder

> [!success] ✅ Kurzfassung (05.10.2026, abends)
> Das Desktop-Programm `Programm/Netzwerk-Labor.exe` startet wieder: Fenster „Netzwerk-Labor“, Laboransicht
> v1.1.0, eigenes Profil unter `%LOCALAPPDATA%\de.fisi.netzwerklabor\EBWebView`, **0** Abstürze der
> WebView2-Laufzeit. Ursache war **nicht** das Programm und **nicht** WebView2, sondern das **Integritätslabel
> „Niedrig“** des Vaults. Reparatur: eine Sekunde `icacls`, ohne Administratorrechte.

![[N1 Integritätsstufen.excalidraw]]

## 1 · Was kaputt war

| Beobachtung | Messwert |
|---|---|
| Start bricht ab | `failed to create webview`, `HRESULT(0x800700AA)` (16:11 und 16:14) bzw. `0x8000FFFF` |
| Ereignisprotokoll | **53** „Application Error“ (Id 1000) seit 14:00 – **alle** `msedgewebview2.exe`, **keiner** zu `Netzwerk-Labor.exe` |
| Speicherabbild | `Failed to create directory …\de.fisi.netzwerklabor\EBWebView, last error is 5` (Fehler 5 = Zugriff verweigert) |
| Ausnahme | `0x80000003` (STATUS_BREAKPOINT) an stets derselben Offset – ein fatales Chromium-CHECK |

> [!note]- 📖 Begriffe
> **Integritätslabel (Mandatory Integrity Control, MIC):** Windows hängt an Objekte (Dateien, Ordner, Prozesse) eine
> Stufe: Niedrig · Mittel · Hoch · System. Ein Prozess darf nur auf Objekte **bis zu seiner Stufe** schreiben.
> **Niedrig-Prozess:** Läuft eine `.exe` aus einer niedrig gelabelten Datei, startet Windows sie selbst als
> Niedrig-Prozess – deshalb war auch der über den Aufgabenplaner gestartete Prozess Niedrig, obwohl `cmd.exe`
> Mittel war.
> **WebView2:** Die Chromium-Laufzeit, mit der Tauri-Programme ihre Oberfläche zeichnen. Sie legt beim Start ein
> Profil (`EBWebView`) an – genau das scheiterte.
> **DACL ist nicht Integrität:** Die Zugriffsliste (DACL) gab `Student` Vollzugriff – geprüft, in Ordnung.
> Die Sperre kam von der **Integritätsstufe**. Das ist der klassische Stolperstein.

## 2 · Ursache (belegt) – die Herkunft ist Vermutung

**Belegt:** Der Vault `C:\Users\Student\Documents\Joshua` trägt das Integritätslabel **„Niedrig“**
(`SYSTEM_MANDATORY_LABEL_ACE`, Policy-Maske `0x1` = *no write up*). Das Label vererbt sich auf alle
Dateien darin – auch auf `Programm\Netzwerk-Labor.exe`. Der Prozess startet dadurch als **Niedrig** und darf
`%LOCALAPPDATA%` (Mittel) nicht beschreiben; `msedgewebview2.exe` konnte sein Profil nicht anlegen und
brach ab.

| Pfad | Label vorher | Label nachher |
|---|---|---|
| `Programm\Netzwerk-Labor.exe` | **NIEDRIG** (0x1) | Mittel |
| `Programm\` (Ordner) | **NIEDRIG** (0x1) | Mittel |
| `Programm\Endversion-1.1\Netzwerk-Labor.exe` | **NIEDRIG** (0x1) | Mittel (mitrepariert) |
| Vault-Wurzel | **NIEDRIG** (0x1) | unverändert |
| `%LOCALAPPDATA%\de.fisi.netzwerklabor` | kein Label | kein Label |
| Kontrolle `C:\Windows\System32\notepad.exe` | kein Label | kein Label |

**Vermutung (nicht bewiesen):** Das Label stammt aus einer Werkzeug-Sandbox (`workspace-write`), die den
Arbeitsordner für sich beschreibbar labelt. Indizien: am Vault stehen die Nicht-Standard-ACEs
`S-1-4-871264674-728394573:(W,D,DC)` und `Jeder:(DENY)(DC)`. Wer sie gesetzt hat und wann, ist **nicht**
gemessen.

## 3 · Reparatur (ohne Administratorrechte, etwa eine Sekunde)

```
icacls "<Projekt>\Programm" /setintegritylevel (OI)(CI)Medium /T /C
icacls "<Projekt>\Programm\Netzwerk-Labor.exe" /setintegritylevel Medium
```

Als Doppelklick: `Programm\Integritaet-reparieren.cmd`.

> [!warning] ⚠️ Wiederholungsgefahr
> Die Vault-Wurzel bleibt „Niedrig“ – jede **neu** im Vault angelegte Datei erbt das. Ein künftig im Vault
> gebautes Programm wäre wieder betroffen; eine Kopie nach `Programm\` erbt dagegen „Mittel“. Tritt dasselbe
> Bild erneut auf, genügt derselbe Doppelklick.

## 4 · Was ausgeschlossen wurde (jeweils gemessen)

| Vermutung | Messung | Ergebnis |
|---|---|---|
| „Die Werkzeug-Sandbox blockiert nur den Agenten“ | Start über `explorer.exe` (wie Doppelklick) und über den **Aufgabenplaner** | scheiterte genauso |
| „Das WebView2-Profil ist gesperrt oder kaputt“ | Rename-Probe (niemand hält den Ordner), Profil beiseitegelegt, frisches Profil | nicht die Ursache |
| „Schreibrechte fehlen“ | DACL geprüft; Schreibprobe mit normalem Token legte `…\mappe-task\EBWebView` an | **OK** – Rechte sind es nicht |
| „Die WebView2-Laufzeit ist defekt“ | Windows-Suche und Teams nutzen sie seit 14:40 bzw. 15:06 ununterbrochen weiter | Laufzeit ist in Ordnung |
| „Die zwangsweise beendeten `msedgewebview2.exe` waren es“ (früherer Befund) | 53 Abstürze, aber **0** zu `Netzwerk-Labor.exe` | **widerlegt** – ein Windows-Neustart war nie nötig |
| „Chromium-Argumente, GPU, Code-Integrität“ | Matrix mit `--disable-gpu`, `--no-sandbox`, `--in-process-gpu`, älterer Runtime | alle wirkungslos |

## 5 · Prüfung

**Abnahmelauf im echten Programm** (`python tools/q-echt.py`, Exit-Code **0**, 10 s, **0** WebView2-Abstürze):

| Prüfung | Messwert |
|---|---|
| Erster Auftrag | `salon-01`, Switch `sw1`, 4 Kabel |
| Trifft die Maus jedes Gerät? | **6 Geräte geprüft, 0 verdeckt** |
| Kabel mit echter Maus ziehen | Kabel 4 → **5** |
| Sprechblase verdeckt nichts? | links 272 px, 216 px breit, **0 überdeckt** |
| Abnahme | **5 ★** |
| Fernwartungs-Schild | 400 × 351 px, nur während der Fernwartung sichtbar |

**Unabhängige Prüfung** durch ein zweites Agentenmitglied: Labels mit `icacls` nachgemessen, Wirkungskette
selbst reproduziert (Kopie von `cmd.exe` in den niedrigen Ordner → `whoami` zeigt `S-1-16-4096` →
`mkdir %LOCALAPPDATA%\…` verweigert), Neustart über die Desktop-Verknüpfung, Regelprüfung (kein Prozess nach
Namen beendet). Ergebnis: **bestanden mit Beanstandungen, alle abgearbeitet.**

**Stand:** Commits `7c1523a` und `6057b05` auf `ausbau-1.2` (kein Push). Nachgezogen in
`AGENTS.md`, `Architektur.md`, `Design – Spielspaß 2.0.md` § 27 und `Programm/SPIELEN.md` § 4.

## 6 · Was man daraus für die Prüfung mitnimmt

- **Zwei getrennte Türen:** DACL (wer darf) und Integritätsstufe (bis wohin darf). „Vollzugriff“ heißt nicht „darf schreiben“.
- `icacls` zeigt Rechte, aber **nicht** das Integritätslabel; dafür gibt es `icacls /setintegritylevel`
  bzw. den Blick in die SACL (hier per `GetNamedSecurityInfoW`, siehe `Nachweise/1.2-Start/tools/integritaet-messen.ps1`).
- **Fehlercodes lesen:** 5 = Zugriff verweigert · `0x800700AA` = ERROR_BUSY · `0x8000FFFF` = E_UNEXPECTED.
  Der Code zeigt die Schicht, nicht die Ursache.
- **Erst messen, dann glauben:** Der Vorbefund „Windows-Neustart nötig“ stand in zwei Dokumenten und war falsch.

## 7 · Nicht geprüft / offen

- ein **echter menschlicher Doppelklick** (der Start wurde über `explorer.exe` und den Aufgabenplaner nachgestellt),
- Verhalten nach einem **Windows-Neustart**,
- Spielbarkeit über die Abnahme hinaus.

## Verwandt

- [[10-Projekte/Lernprojekte/Netzwerk-Labor/Liesmich|🖧 Netzwerk-Labor]]
- [[10-Projekte/Lernprojekte/Netzwerk-Labor/Design – Spielspaß 2.0|Design – Spielspaß 2.0]] – § 27 ist dieser Befund
- [[10-Projekte/Lernprojekte/Netzwerk-Labor/Architektur|Architektur]] · [[10-Projekte/Lernprojekte/Netzwerk-Labor/Programm/SPIELEN|SPIELEN]]
- [[90-Werkstatt/Logs/2026-10-05|Log vom 05.10.2026]]
- Beweise (nicht im Git): `Nachweise/1.2-Start/BEFUND.md`, `forensik/BEFUND.md`, `pruefung/PRUEFUNG.md`, Bilder in `Nachweise/1.2-Q/`
