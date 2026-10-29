# Pull Request

## Warum

<!-- Der Grund, nicht nur die Änderung. Was ist danach spielbar anders? -->

## Art der Änderung

- [ ] Fehler behoben
- [ ] Neue Funktion / Inhalt
- [ ] Dokumentation / Werkzeug
- [ ] Aufräumen ohne Verhaltensänderung

## Belege

- [ ] `sh tools/test.sh` grün (Ausgabe unten) — **0 übersprungen**
- [ ] Bei `src/sim/` oder `src/modell/`: `node tools/sim-stand.js` unverändert oder Abweichung begründet
- [ ] Wirkung im Programm belegt (nicht nur ein grüner Test ohne Aufruf)
- [ ] Zahlen stehen in `docs/STAND.md` (nicht von Hand in Prosa) — `python tools/stand.py --pruefen` grün
- [ ] Bei Doku-Änderungen: `python tools/seite.py` + `--pruefen` grün, `git diff docs/doku` nur erwartet
- [ ] Keine Secrets, keine Binärdateien, keine Spielstände mit Klarnamen
- [ ] Zeilenenden unverändert (LF), Diff gelesen

## Prüf-Ausgabe

```text
<!-- Ausgabe der Befehle, kurz und aussagekräftig -->
```

## Offen / nicht geprüft

<!-- Was ist bewusst offen geblieben? Ehrlich benennen. -->

## Hinweis

Kein Commit auf `master`, kein Push ohne Absprache; veröffentlicht wird nur mit
ausdrücklicher Freigabe. Regeln: [AGENTS.md](../AGENTS.md), Ablauf:
[docs/Mitmachen.md](../docs/Mitmachen.md).
