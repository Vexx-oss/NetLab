# CI-Gates 3.0.0 — Browser, R12, DoD und Release (BAU-11)

Stand: 31.10.2026, W5-Vorarbeit. Entwurf, **kein Commit**. Diese Datei beschreibt, welche
Gates in welchem Ablauf haengen, was davon **lokal** belegt ist und was ausdruecklich
**nicht** gemessen wurde (GitHub Actions laufen lokal nicht).

## 1 · Die Ablaeufe und ihre Gates

| Ablauf | Runner | Gate / Schritt | Befehl (exakt) | Erwartung |
|---|---|---|---|---|
| pruefen.yml | ubuntu-latest | JS-Syntax (QUA-01) | node tools/syntax.js | Exit 0 |
| pruefen.yml | ubuntu-latest | Tests | sh tools/test.sh | N/N gruen, 0 uebersprungen |
| pruefen.yml | ubuntu-latest | Doku-Werte (DOK-03) | python tools/doku-claims.py --pruefen --gegenprobe | Exit 0; --gegenprobe 4/4 |
| pruefen.yml | ubuntu-latest | Doku-Seite frisch | python tools/seite.py + git diff --exit-code docs/doku | diff leer |
| pruefen.yml | ubuntu-latest | Abnahme 3.0 (VIS-01) | python tools/abnahme-3.0.py --schnell | Exit 0, kein Browser noetig |
| browser.yml | windows-latest | Edge vorhanden | PowerShell: msedge.exe/Chrome pruefen | Browser gefunden |
| browser.yml | windows-latest | Rauch-Gegenprobe | python tools/rauch.py --gegenprobe | Exit 0 = Rauchtest WURDE rot; Pflichtzeile "Gegenprobe: rot wie erwartet" |
| browser.yml | windows-latest | Rauchtest + R12-Rohmessung | python tools/rauch.py --r12 Nachweise/rauch/r12.json | Exit 0; Summenzeile N/N gruen; r12.json gemessen=true |
| browser.yml | windows-latest | R12-Zahl + Ratsche | python tools/ethos.py --r12 Nachweise/rauch/r12.json --r12-ausgabe Nachweise/3.0/r12.json | Exit 0; Pflichtzeilen R12-ZAHL und R12-RATSCHE; keine Ratsche-Verstoesse |
| browser.yml | windows-latest | Menueebenen | python tools/menueprobe.py --lauf --ohne-bild | Exit 0; "5 von 5 Profilen gemessen", "0 verletzt" |
| release.yml | ubuntu-latest | Fassungs-Gate | python tools/fassung-ziehen.py --pruefen + Tag==VERSION + stand/seite + doku-claims | Exit 0, VOR dem Release |
| release.yml | ubuntu-latest | Anhaenge + SHA256SUMS | gh release download; sha256sum; sha256sum -c | 4 Anhaenge exakt + SHA256SUMS, keine fremden Namen |
| release.yml | windows-latest | Windows-EXE | cargo build; ProductVersion == Tag | Exit 0, sonst kein Anhang |
| release.yml | ubuntu-latest | Android-APK | python android/bauen.py; Dateiname traegt Fassung | Exit 0; **fehlende Keystore-Secrets = ROT** |

## 2 · Lokal belegt (31.10.2026)

- YAML-Parse aller vier Ablaeufe (PyYAML 6.0.3): OK — Jobs/Schritte: browser.yml 1/8,
  pruefen.yml 1/18, release.yml 5/38, seite.yml 1/6.
- bash -n fuer alle bash-Schritte (ohne shell: pwsh): 0 Syntaxfehler.
- browser.yml-PowerShell-Bloecke mit dem PowerShell-Parser geparst (UTF-8): 5/5 OK.
  (Maschine hat PowerShell 5.1; GitHub nutzt pwsh 7 — Parser-Ergebnis ist ein Vorbehalt,
  kein Beweis fuer den Runner.)
- Werkzeug-Selbsttests: tools/doku-claims.py --gegenprobe -> 4/4 (Exit 0);
  tools/abnahme-3.0.py --gegenprobe -> 7/7 (Exit 0); tools/abnahme-3.0.py --schnell ->
  Exit 0 in 1,9 s, 18 Gates gruen / 0 rot / 9 nicht gemessen, KEIN Browser.
- Release-Bash-Logik mit Attrappe fuer gh (kein echtes Release) simuliert:
  saubere Anhaenge -> Exit 0; fremder Alt-Anhang -> Exit 1 ("Unerwartete ...");
  fehlende APK -> Exit 1 ("Anhang fehlt ..."); SHA256SUMS-Schritt mit vier Attrappen ->
  Exit 0, vier Zeilen, sha256sum -c 4x OK. (Dabei gefunden und behoben: sha256sum
  schreibt auf MSYS "hash *name" — der Eintragstest akzeptiert beide Formen.)
- CI-Selbstpruefung tools/ablaeufe.py: vorher ROT (Job-Rechte von release.yml wurden nicht
  erkannt), jetzt GRUEN; sie prueft zusaetzlich, dass browser.yml die vier Gates und die
  drei Pflichtzeilen enthaelt und pruefen.yml QUA-01/DOK-03/VIS-01 nicht verliert.

## 3 · NICHT gemessen (ehrlich)

- Kein GitHub-Actions-Lauf: keine der vier Workflow-Dateien wurde ausgefuehrt.
- browser.yml ist **nie gelaufen**: Edge-Start, 48 Rauchfaelle, R12-Rohmessung, Ratsche und
  Menueprobe auf dem Runner sind unbelegt. Der erste CI-Lauf entscheidet.
- Kein Android-Bau in CI; Keystore-Secrets sind im Repo nicht vorhanden.
- Kein echtes Release: gh-Aufrufe nur gegen eine Attrappe getestet, nicht gegen GitHub.
- Keine Aussage ueber Laufzeiten/Warteschlange der Runner.

## 4 · Bekannte rote Stellen zum Zeitpunkt dieses Entwurfs

- DOK-03 in pruefen.yml und im Release-Fassungs-Gate ist ROT: R3 Bildstand — HERKUNFT.md
  nennt 2.5.0, Fassung ist 2.9.0. Wird durch DOK-04 (Screenshots 3.0.0 + HERKUNFT) gruen;
  **vor dem W5-Push muessen alle DOK-Fixes drin sein.**
- release.yml/Android ist ohne Keystore-Secrets absichtlich ROT (BAU-02: 3.0.0 ohne APK
  ist ein Mangel; 2.9.0 war still gruen, Lauf #23: 11 s ohne APK).
- browser.yml ist ungemessen; ob der Rauchtest auf dem Runner 48/48 erreicht, ist offen.

## 5 · W5-Release-Checkliste (nach Freigabe des Nutzers)

1. Fassung: python tools/fassung-ziehen.py --pruefen; dann --neu 3.0.0 (Trockenlauf) und
   --setzen; VERSION_CODE in android/bauen.py von Hand auf 30001.
2. Dokumente: DOK-01/02/04/05/07/08 fertig, HERKUNFT 3.0.0; dann doku-claims --pruefen
   Exit 0 (DOK-03), stand.py --pruefen, seite.py --pruefen, git diff docs/doku leer.
3. Gates: sh tools/test.sh (N/N gruen, 0 uebersprungen), ethos/klassen/sim-stand,
   abnahme-3.0.py --schnell Exit 0; browser.yml in CI gruen.
4. Secrets vor dem Tag setzen: ANDROID_KEYSTORE_B64 (base64 der lokalen .jks) und
   ANDROID_KEYSTORE_PASSWORT; ohne sie ist das Release-Gate rot.
5. Tag v3.0.0 erst nach ausdruecklicher Freigabe; Push und Release je einzeln freigeben.
6. Nachmessen: 5 Anhaenge (ZIP, HTML, EXE, APK, SHA256SUMS); SHA256SUMS herunterladen und
   gegen die Anhaenge rechnen; EXE-ProductVersion 3.0.0; Live-Seite hashen.
