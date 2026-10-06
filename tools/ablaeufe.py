"""Prueft die GitHub-Ablaeufe: Ausloeser, Jobs, Schritte und die verbotenen Muster.

Bleibt im Repo, weil hier zwei echte Fehler durchgerutscht sind:

* Ein Doppelpunkt in einem Schritt-Namen ("Lernmotor: Kopie, Bau, Rueckfall") macht das
  YAML ungueltig; GitHub lehnt den ganzen Ablauf ab — gemerkt erst nach dem Push.
* `configure-pages` mit `enablement: true` scheitert mit dem Standard-Token und riss den
  ganzen Lauf mit, sodass nicht einmal die Tests liefen.

Warum ohne PyYAML: Die Pruefung laeuft auch auf dem GitHub-Runner, und dort ist PyYAML
nicht installiert. Mit `import yaml` scheiterte genau dieser Schritt (gemessen
05.10.2026). Deshalb liest dieses Werkzeug die Ablaeufe mit einem kleinen eigenen Leser,
der fuer Ablaeufe ausreicht: Einrueckung, Schluessel, Listen, Bloecke.

Aufruf: python tools/ablaeufe.py
"""
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HIER = Path(__file__).resolve().parent.parent
ORDNER = HIER / ".github" / "workflows"

# Schluessel, die ein Schritt haben muss (eines davon).
SCHRITT_SCHLUESSEL = ("name", "uses", "run")


# ---------------------------------------------------------------- kleiner YAML-Leser
def _einrueckung(zeile: str) -> int:
    return len(zeile) - len(zeile.lstrip(" "))


def _ohne_kommentar(zeile: str) -> str:
    """Kommentar am Zeilenende entfernen — aber '#' in Anfuehrungszeichen behalten."""
    in_einfach = in_doppelt = False
    for i, z in enumerate(zeile):
        if z == "'" and not in_doppelt:
            in_einfach = not in_einfach
        elif z == '"' and not in_einfach:
            in_doppelt = not in_doppelt
        elif z == "#" and not in_einfach and not in_doppelt and (i == 0 or zeile[i - 1] in " \t"):
            return zeile[:i]
    return zeile


def _wert(text: str):
    t = text.strip()
    if not t:
        return None
    if t[0] in "'\"" and t[-1] == t[0] and len(t) >= 2:
        return t[1:-1]
    if t in ("true", "True"):
        return True
    if t in ("false", "False"):
        return False
    if t.startswith("[") and t.endswith("]"):
        innen = t[1:-1].strip()
        return [x.strip().strip("'\"") for x in innen.split(",")] if innen else []
    return t


def lies(pfad: Path) -> dict:
    """Liest die Struktur, die fuer Ablaeufe zaehlt: Block-Mappings und Listen.

    Der Kern ist eine Regel: eine Zeile auf Einrueckung N gehoert zum Block auf
    Einrueckung < N. Ist der erste Eintrag eines Blocks ein "- ", ist es eine Liste, und
    dann bleiben ALLE Eintraege auf dieser Einrueckung Listeneintraege — auch die mit
    Unterblock. Genau daran ist der erste Versuch gescheitert: er hat nach dem ersten
    Eintrag mit Unterblock die Liste verlassen und nur 2 statt 12 Schritte gesehen.
    """
    roh = []
    for nr, zeile in enumerate(pfad.read_text(encoding="utf-8").splitlines(), 1):
        zeile = _ohne_kommentar(zeile.rstrip())
        if zeile.strip():
            roh.append((nr, _einrueckung(zeile), zeile.strip()))
    if not roh:
        return {}

    def block(i: int, einrueckung: int, ist_liste: bool):
        ergebnis = [] if ist_liste else {}
        while i < len(roh):
            nr, ein, text = roh[i]
            if ein < einrueckung:
                break
            if ein > einrueckung:
                # Tiefer als erwartet, ohne Einleitung: ueberspringen statt aussteigen.
                i += 1
                continue

            if ist_liste:
                if not text.startswith("- "):
                    break
                rest = text[2:].strip()
                if not rest:
                    unter = roh[i + 1][1] if i + 1 < len(roh) else ein + 2
                    unter_liste = i + 1 < len(roh) and roh[i + 1][2].startswith("- ")
                    wert, i = block(i + 1, unter, unter_liste)
                    ergebnis.append(wert)
                    continue
                if ":" in rest:
                    schluessel, _, wert_text = rest.partition(":")
                    eintrag = {}
                    if wert_text.strip():
                        eintrag[schluessel.strip()] = _wert(wert_text)
                        i += 1
                    else:
                        i += 1
                        if i < len(roh) and roh[i][1] > ein:
                            unter_liste = roh[i][2].startswith("- ")
                            # Ein Block-Skalar (| oder >) hat keine Struktur, die uns
                            # interessiert — als leeren Block lesen, nicht als Text.
                            wert, i = block(i, roh[i][1], unter_liste)
                            eintrag[schluessel.strip()] = wert
                        else:
                            eintrag[schluessel.strip()] = None
                    # Folgezeilen desselben Eintrags stehen tiefer als der "- "-Strich.
                    while (i < len(roh) and roh[i][1] > ein and not roh[i][2].startswith("- ")):
                        _, _, z_text = roh[i]
                        if ":" not in z_text:
                            i += 1
                            continue
                        s, _, w = z_text.partition(":")
                        s = s.strip()
                        i += 1
                        if w.strip():
                            eintrag[s] = _wert(w)
                        elif i < len(roh) and roh[i][1] > ein:
                            unter_liste = roh[i][2].startswith("- ")
                            wert, i = block(i, roh[i][1], unter_liste)
                            eintrag[s] = wert
                        else:
                            eintrag[s] = None
                    ergebnis.append(eintrag)
                else:
                    ergebnis.append(_wert(rest))
                    i += 1
                continue

            if text.startswith("- "):
                break
            if ":" not in text:
                i += 1
                continue
            schluessel, _, wert_text = text.partition(":")
            schluessel = schluessel.strip()
            i += 1
            if wert_text.strip():
                ergebnis[schluessel] = _wert(wert_text)
            elif i < len(roh) and roh[i][1] > ein:
                unter_liste = roh[i][2].startswith("- ")
                wert, i = block(i, roh[i][1], unter_liste)
                ergebnis[schluessel] = wert
            else:
                ergebnis[schluessel] = None
        return ergebnis, i

    wert, _ = block(0, roh[0][1], roh[0][2].startswith("- "))
    return wert if isinstance(wert, dict) else {}


def _schritte(d: dict) -> list[dict]:
    return [s for job in (d.get("jobs") or {}).values()
            if isinstance(job, dict) for s in (job.get("steps") or []) if isinstance(s, dict)]


# ---------------------------------------------------------------------------- Pruefung
def pruefe(pfad: Path) -> tuple[list[str], list[str]]:
    """Gibt (Meldungen, Fehler) zurueck."""
    meldungen, fehler = [], []
    rel = pfad.relative_to(HIER).as_posix()
    try:
        d = lies(pfad)
    except Exception as e:                                    # noqa: BLE001
        return [f"ROT  {rel}"], [f"{rel}: nicht lesbar — {e}"]

    if not d.get("jobs"):
        return [f"ROT  {rel}"], [f"{rel}: kein 'jobs'"]
    if not d.get("on"):
        fehler.append(f"{rel}: kein Auslöser ('on')")

    ausloeser = d["on"]
    namen = list(ausloeser) if isinstance(ausloeser, dict) else ([ausloeser] if ausloeser else [])
    meldungen.append(f"GRUEN {rel}")
    meldungen.append(f"      Auslöser: {', '.join(namen) or '?'}")
    for name, job in d["jobs"].items():
        if not isinstance(job, dict):
            fehler.append(f"{rel}: Job {name} ist kein Block")
            continue
        schritte = job.get("steps") or []
        meldungen.append(f"      Job {name}: {len(schritte)} Schritte auf {job.get('runs-on', '?')}")
        for s in schritte:
            if not isinstance(s, dict):
                fehler.append(f"{rel}: Schritt ohne Block in Job {name}")
                continue
            if not any(k in s for k in SCHRITT_SCHLUESSEL):
                fehler.append(f"{rel}: Schritt ohne name/uses/run in Job {name}")
    return meldungen, fehler


def pruefe_seite(fehler: list[str]) -> None:
    """Zusatzregeln fuer den veroeffentlichenden Ablauf."""
    pfad = ORDNER / "seite.yml"
    if not pfad.is_file():
        return
    d = lies(pfad)
    alle = _schritte(d)

    for s in alle:
        if str(s.get("uses", "")).startswith("actions/configure-pages"):
            if (s.get("with") or {}).get("enablement") in (True, "true"):
                fehler.append("seite.yml: configure-pages mit enablement: true — das scheitert "
                              "mit dem Standard-Token (braucht PAT/App) und reisst den Lauf mit")

    deploy = next((s for s in alle if str(s.get("uses", "")).startswith("actions/deploy-pages")), None)
    if deploy is None:
        fehler.append("seite.yml: kein deploy-pages — es wuerde nichts veroeffentlicht")
    elif "if" not in deploy:
        fehler.append("seite.yml: deploy-pages ohne Bedingung — der Lauf wuerde rot, "
                      "solange Pages im Repository aus ist")

    # Ein zweiter Job ist eine Wartekette: wartet er auf einen Laeufer, bricht GitHub nach
    # rund 900 s den GANZEN Lauf ab, auch den erfolgreichen Teil (gemessen 05.10.2026).
    if len(d.get("jobs") or {}) > 1:
        fehler.append("seite.yml: mehr als ein Job — ein wartender zweiter Job kann den "
                      "ganzen Lauf nach ~900 s abbrechen (gemessen 05.10.2026)")

    # Kein Pfadfilter: Wer Pages einschaltet, aendert nichts an docs/. Mit Pfadfilter laeuft
    # der Ablauf dann nicht an, und die Seite bleibt 404 (gemessen 06.10.2026).
    ausloeser = d.get("on") or {}
    push = ausloeser.get("push") if isinstance(ausloeser, dict) else None
    if isinstance(push, dict) and push.get("paths"):
        fehler.append("seite.yml: Pfadfilter unter 'push' — dann laeuft der Ablauf beim "
                      "Einschalten von Pages nicht an und die Seite bleibt 404")


def pruefe_release(fehler: list[str]) -> None:
    """Zusatzregeln fuer den Ablauf, der Releases anlegt."""
    pfad = ORDNER / "release.yml"
    if not pfad.is_file():
        return
    d = lies(pfad)

    # Ohne Schreibrecht darf der Ablauf kein Release anlegen.
    rechte = d.get("permissions")
    if not isinstance(rechte, dict) or rechte.get("contents") != "write":
        fehler.append("release.yml: 'permissions: contents: write' fehlt — ohne das darf "
                      "der Ablauf kein Release anlegen")

    # Der Ausloeser muss Tags enthalten, sonst laeuft er beim Tag-Push nicht an.
    ausloeser = d.get("on") or {}
    push = ausloeser.get("push") if isinstance(ausloeser, dict) else None
    hat_tags = isinstance(push, dict) and bool(push.get("tags"))
    if not hat_tags:
        fehler.append("release.yml: kein Tag-Ausloeser unter 'push' — beim Setzen eines "
                      "Versions-Tags liefe kein Release an")

    # Vor dem Veroeffentlichen pruefen.
    texte = " ".join((s.get("run") or "") for s in _schritte(d))
    for pflicht in ("tools/test.sh", "tools/paket.py"):
        if pflicht not in texte:
            fehler.append(f"release.yml: '{pflicht}' fehlt — es wuerde ungepruefte oder "
                          "unvollstaendige Ware veroeffentlicht")


def main() -> int:
    dateien = sorted(ORDNER.glob("*.yml")) + sorted(ORDNER.glob("*.yaml"))
    if not dateien:
        print(f"ROT: keine Ablaeufe unter {ORDNER}")
        return 1

    fehler, meldungen = [], []
    for pfad in dateien:
        m, f = pruefe(pfad)
        meldungen += m
        fehler += f
        print("\n".join(m))
        print()
    pruefe_seite(fehler)
    pruefe_release(fehler)

    if fehler:
        print("ROT:")
        for f in fehler:
            print("  - " + f)
        return 1
    print("GRUEN: alle Ablaeufe gueltig und vollstaendig.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
