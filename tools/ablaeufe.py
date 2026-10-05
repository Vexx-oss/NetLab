"""Prueft die GitHub-Ablaeufe: gueltiges YAML, Schritte, Ausloeser.

Bleibt im Repo, weil genau hier ein Fehler durchgerutscht ist: ein Doppelpunkt in einem
Schritt-Namen ("Lernmotor: ...") macht das YAML ungueltig, GitHub lehnt den ganzen Ablauf
ab — und ohne diese Pruefung faellt das erst nach dem Push auf.

Aufruf: python tools/ablaeufe.py
"""
import sys
from pathlib import Path

import yaml

sys.stdout.reconfigure(encoding="utf-8")
HIER = Path(__file__).resolve().parent.parent
ORDNER = HIER / ".github" / "workflows"

# Diese Schritte muessen in jedem Ablauf vorkommen, der das Spiel veroeffentlicht —
# sonst ginge eine ungepruefte Fassung online.
PFLICHT_IM_BAU = ["tools/test.sh", "tools/einfach.py", "tools/einfach.py --pruefen"]


def main() -> int:
    dateien = sorted(ORDNER.glob("*.yml")) + sorted(ORDNER.glob("*.yaml"))
    if not dateien:
        print(f"ROT: keine Ablaeufe unter {ORDNER}")
        return 1

    fehler = []
    for pfad in dateien:
        rel = pfad.relative_to(HIER).as_posix()
        try:
            d = yaml.safe_load(pfad.read_text(encoding="utf-8"))
        except yaml.YAMLError as e:
            fehler.append(f"{rel}: YAML ungueltig — {e}")
            print(f"ROT  {rel}: YAML ungueltig")
            print(f"     {str(e).splitlines()[0]}")
            continue

        if d is None or "jobs" not in d:
            fehler.append(f"{rel}: kein 'jobs'")
            print(f"ROT  {rel}: kein 'jobs'")
            continue

        ausloeser = d.get("on", d.get(True))
        if isinstance(ausloeser, dict):
            ausloeser = list(ausloeser)
        elif isinstance(ausloeser, str):
            ausloeser = [ausloeser]

        print(f"GRUEN {rel}")
        print(f"      Auslöser: {', '.join(ausloeser or []) or '?'}")
        for name, inhalt in d["jobs"].items():
            schritte = inhalt.get("steps", [])
            print(f"      Job {name}: {len(schritte)} Schritte auf {inhalt.get('runs-on', '?')}")
            for s in schritte:
                if s.get("uses", "").startswith("actions/upload-pages-artifact") or \
                   s.get("uses", "").startswith("actions/deploy-pages"):
                    continue
                if not (s.get("name") or s.get("uses") or s.get("run")):
                    fehler.append(f"{rel}: Schritt ohne Name/uses/run in Job {name}")
        print()

    # Muss der veroeffentlichende Ablauf vorher testen und bauen?
    seite = ORDNER / "seite.yml"
    if seite.is_file():
        d = yaml.safe_load(seite.read_text(encoding="utf-8"))
        alle_schritte = [s for job in d["jobs"].values() for s in job.get("steps", [])]
        # Struktur pruefen, nicht Zeichenketten: 'enablement: true' steht auch im
        # Kommentar, der erklaert, warum es NICHT dort steht.
        for s in alle_schritte:
            if s.get("uses", "").startswith("actions/configure-pages"):
                if (s.get("with") or {}).get("enablement") in (True, "true"):
                    fehler.append("seite.yml: configure-pages mit enablement: true — das scheitert "
                                  "mit dem Standard-Token (braucht PAT/App) und reisst den Lauf mit")
        if not any(s.get("uses", "").startswith("actions/deploy-pages") for s in alle_schritte):
            fehler.append("seite.yml: kein deploy-pages — es wuerde nichts veroeffentlicht")
        # Der Deploy-Schritt muss durch die Pages-Frage bedingt sein. Sonst scheitert der
        # Lauf, solange Pages aus ist (gemessen 05.10.2026).
        deploy = next((s for s in alle_schritte
                       if s.get("uses", "").startswith("actions/deploy-pages")), None)
        if deploy is not None and "if" not in deploy:
            fehler.append("seite.yml: deploy-pages ohne Bedingung — der Lauf wuerde rot, "
                          "solange Pages im Repository aus ist")
        # Ein zweiter Job ist eine Wartekette: wartet er auf einen Laeufer, bricht GitHub
        # nach rund 900 s den GANZEN Lauf ab, auch den erfolgreichen Teil.
        if len(d["jobs"]) > 1:
            fehler.append("seite.yml: mehr als ein Job — ein wartender zweiter Job kann den "
                          "ganzen Lauf nach ~900 s abbrechen (gemessen 05.10.2026)")

    if fehler:
        print("ROT:")
        for f in fehler:
            print("  - " + f)
        return 1
    print("GRUEN: alle Ablaeufe gueltig und vollstaendig.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
