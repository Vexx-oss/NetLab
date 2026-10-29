# Sicherheit

Dieses Projekt ist ein **offline laufendes Lernspiel** ohne Server, ohne Konten und ohne
Cloud. Es gibt keine Benutzerverwaltung und keine personenbezogenen Daten im Programm.
Trotzdem gilt: Sicherheitslücken bitte **privat** melden, nicht als öffentliches Issue.

## Wie melden

1. Auf GitHub: Reiter **Security** → **Report a vulnerability** (Security Advisories).
   Das ist der einzige offizielle Weg; eine E-Mail-Adresse wird bewusst nicht genannt.
2. Beschreibe: betroffene Fassung (siehe [docs/STAND.md](docs/STAND.md)), Betriebssystem,
   Browser bzw. Windows-Programm, Schritte, mögliche Auswirkung.
3. **Keine** Zugangsdaten, Schlüssel oder Spielstände mit Klarnamen mitschicken.

## Was erwartet werden darf — und was nicht

- Das Projekt wird **ehrenamtlich** gepflegt. Es gibt **keine** zugesagte Reaktionszeit und
  **kein** Bug-Bounty-Programm; das ist ehrlich so und keine Formalie.
- Gemeldete Lücken werden nach Schwere und Aufwand eingeordnet; behoben wird in der
  laufenden Ausbaurunde, nicht als Notfallprozess.
- Öffentlich gemacht wird eine Lücke erst nach einem Fix oder in Absprache.

## Was hier bewusst nicht gilt

- **Keine Secrets im Repo.** `.gitignore` schließt Zugangsdaten-Dateien aus
  (`*SECRETS*.txt`, `*secret*.txt`, `*passwoerter*.txt`, `*zugang*.txt`); der letzte Commit
  vor 2.1 dokumentiert einen Beinahe-Unfall und ist bereinigt.
- **Keine Signatur der Windows-`.exe`.** Sie ist nicht signiert; SmartScreen warnt beim
  ersten Start. Das ist eine bekannte, dokumentierte Grenze, keine Lücke.
- **Kein Netzwerkzugriff des Spiels.** Die Einzeldatei hat 0 Außenverweise
  (`python tools/einfach.py --pruefen`); das Android-Programm fordert keine Berechtigung an.

## Unterstützte Fassungen

Gepflegt wird der Stand des Zweigs `ausbau-1.2` (Standardzweig) und die jeweils neueste
Veröffentlichung. Ältere Stände werden nicht rückwirkend mit Sicherheitsfixes versorgt.
