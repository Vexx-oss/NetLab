"""Repo-Angaben setzen: Beschreibung, Homepage, Themen — und ein Release anlegen.

Warum es das gibt: Diese Angaben und ein Release lassen sich nicht per `git push` setzen,
sondern nur ueber die GitHub-API mit einem Token. Auf dem Entwicklungsrechner liegt keines
(die API antwortet dort mit 401, gemessen 06.10.2026). Die Pruef- und Veroeffentlichungs-
ablaeufe und das Anlegen des Releases sind deshalb in `.github/workflows/` gewandert.

Fuer die reinen Repo-Angaben gibt es keinen Ablauf — die setzt man einmal. Dieses Werkzeug
macht das mit einem Token, das du einmal bereitstellst:

    Windows (Git Bash / WSL / Linux/macOS):
        GH_TOKEN=ghp_xxx python tools/repo-angaben.py

    PowerShell:
        $env:GH_TOKEN = 'ghp_xxx'; python tools/repo-angaben.py

Token anlegen: GitHub -> Settings -> Developer settings -> Personal access tokens ->
Fine-grained token -> Repository access: nur `NetLab` -> Permissions:
  * Administration: Read and write   (fuer Beschreibung und Homepage)
  * Contents: Read and write         (nur falls --release benutzt wird)

Aufruf:
    python tools/repo-angaben.py                nur zeigen, was gesetzt wuerde (Trockenlauf)
    python tools/repo-angaben.py --setzen       Beschreibung, Homepage und Themen setzen
    python tools/repo-angaben.py --release      zusaetzlich ein Release fuer einen Tag anlegen
                                                (Tag mit --tag <name>, Standard v1.2.0)

Das Token wird nur an api.github.com gesendet und nirgends gespeichert.
"""
import argparse
import json
import math
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

REPO = "Vexx-oss/NetLab"
DIST = Path(__file__).resolve().parent.parent / "dist"
BESCHREIBUNG = ("Lernspiel fuer FISI (IHK AP1/AP2): Netzwerk-Simulator auf Frame-Ebene, "
                "IOS-aehnliche Konsole, 37 Tickets plus Generator, laeuft offline.")
HOMEPAGE = "https://vexx-oss.github.io/NetLab/"
THEMEN = ["fisi", "netzwerk", "lernspiel", "simulator", "ihk", "ap1", "ap2",
          "ausbildung", "javascript", "offline"]
API = "https://api.github.com"


def token() -> str:
    for name in ("GH_TOKEN", "GITHUB_TOKEN"):
        t = os.environ.get(name)
        if t:
            return t.strip()
    raise SystemExit(
        "FEHLER: kein Token gefunden.\n"
        "  Setze GH_TOKEN (siehe Kopf dieser Datei) — ohne Token antwortet die API mit 401.\n"
        "  Nur ansehen, was gesetzt wuerde: dieses Skript ohne --setzen aufrufen."
    )


def rufen(methode: str, pfad: str, daten: dict | None, tok: str | None):
    körper = json.dumps(daten).encode("utf-8") if daten is not None else None
    kopf = {"User-Agent": "dsh", "Accept": "application/vnd.github+json"}
    if tok:
        kopf["Authorization"] = f"Bearer {tok}"
    anfrage = urllib.request.Request(API + pfad, data=körper, headers=kopf, method=methode)
    try:
        with urllib.request.urlopen(anfrage, timeout=45) as r:
            roh = r.read()
            return r.status, (json.loads(roh) if roh else {})
    except urllib.error.HTTPError as e:
        return e.code, {"fehler": e.read().decode("utf-8", "replace")[:300]}


def zeigen() -> None:
    status, d = rufen("GET", f"/repos/{REPO}", None, None)
    if status != 200:
        raise SystemExit(f"FEHLER: Repo nicht abrufbar (HTTP {status}).")
    print(f"Repo {REPO} — Ist-Stand")
    print(f"  Beschreibung : {d.get('description') or '(LEER)'}")
    print(f"  Homepage     : {d.get('homepage') or '(LEER)'}")
    print(f"  Themen       : {', '.join(d.get('topics') or []) or '(keine)'}")
    print(f"  Lizenz       : {(d.get('license') or {}).get('spdx_id') or '(keine)'}")
    print()
    print("Würde gesetzt:")
    print(f"  Beschreibung : {BESCHREIBUNG}")
    print(f"  Homepage     : {HOMEPAGE}")
    print(f"  Themen       : {', '.join(THEMEN)}")


def setzen() -> int:
    tok = token()
    status, d = rufen("PATCH", f"/repos/{REPO}",
                      {"description": BESCHREIBUNG, "homepage": HOMEPAGE, "topics": THEMEN}, tok)
    if status != 200:
        print(f"ROT: HTTP {status}")
        print("  " + str(d.get("fehler", d))[:400])
        print("  Haeufigste Ursache: dem Token fehlt 'Administration: Read and write'.")
        return 1
    print("GRUEN: Repo-Angaben gesetzt.")
    print(f"  Beschreibung : {d.get('description')}")
    print(f"  Homepage     : {d.get('homepage')}")
    print(f"  Themen       : {', '.join(d.get('topics') or [])}")
    return 0


def release(tag: str) -> int:
    tok = token()
    status, d = rufen("GET", f"/repos/{REPO}/releases/tags/{tag}", None, tok)
    if status == 200:
        print(f"Release {tag} existiert bereits: {d.get('html_url')}")
        return 0
    status, d = rufen("POST", f"/repos/{REPO}/releases",
                      {"tag_name": tag, "name": f"Netzwerk-Labor {tag.lstrip('v')}",
                       "generate_release_notes": True}, tok)
    if status not in (200, 201):
        print(f"ROT: HTTP {status}\n  " + str(d.get("fehler", d))[:400])
        return 1
    print(f"GRUEN: Release angelegt: {d.get('html_url')}")
    print("  Anhaenge fehlen noch — die legt der Ablauf .github/workflows/release.yml an,")
    print(f"  sobald der Tag gepusht wird. Oder im Browser: {d.get('html_url')}/edit")
    return 0


def hochladen(tag: str, dateien: list[str]) -> int:
    """Haengt fertige Pakete an ein bestehendes Release — z. B. die Windows-Fassung.

    Die .exe liegt bewusst nicht im Git, kann also vom Release-Ablauf nicht gebaut werden.
    Wer sie im Release haben will, laesst hier `dist/Netzwerk-Labor-<Version>-Windows.zip`
    hochladen. Vorhandene Anhaenge gleichen Namens werden ersetzt.
    """
    tok = token()
    status, d = rufen("GET", f"/repos/{REPO}/releases/tags/{tag}", None, tok)
    if status != 200:
        print(f"ROT: Release {tag} nicht gefunden (HTTP {status}). Erst anlegen (--release).")
        return 1
    release_id = d["id"]
    vorhanden = {a["name"]: a["id"] for a in d.get("assets", [])}
    print(f"Release {tag} (id {release_id}) — {len(vorhanden)} Anhang/Anhaenge vorhanden")

    fehler = 0
    for pfad_text in dateien:
        pfad = Path(pfad_text)
        if not pfad.is_file():
            print(f"  ROT   {pfad} fehlt — erst bauen (python tools/paket.py)")
            fehler = 1
            continue
        if pfad.name in vorhanden:
            # Ersetzen: alten Anhang loeschen, dann neu laden.
            s, _ = rufen("DELETE", f"/repos/{REPO}/releases/assets/{vorhanden[pfad.name]}", None, tok)
            print(f"  alt   {pfad.name} entfernt (HTTP {s})")
        daten = pfad.read_bytes()
        kopf = {
            "User-Agent": "dsh",
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {tok}",
            "Content-Type": "application/zip" if pfad.suffix == ".zip" else "text/html",
        }
        # name-Parameter fuer die URL; der Dateiname kommt aus dem Kopf nicht mit.
        url = (f"https://uploads.github.com/repos/{REPO}/releases/{release_id}/assets"
               f"?name={urllib.parse.quote(pfad.name)}")
        anfrage = urllib.request.Request(url, data=daten, headers=kopf, method="POST")
        try:
            with urllib.request.urlopen(anfrage, timeout=300) as r:
                antwort = json.loads(r.read())
            print(f"  GRUEN {pfad.name}  {math.ceil(len(daten)/1024)} KB  "
                  f"-> {antwort.get('browser_download_url')}")
        except urllib.error.HTTPError as e:
            print(f"  ROT   {pfad.name}: HTTP {e.code} — {e.read().decode('utf-8', 'replace')[:200]}")
            fehler = 1
    return fehler


def main() -> int:
    ap = argparse.ArgumentParser(description="Repo-Angaben und Release ueber die GitHub-API setzen")
    ap.add_argument("--setzen", action="store_true", help="Beschreibung, Homepage und Themen wirklich setzen")
    ap.add_argument("--release", action="store_true", help="zusaetzlich ein Release fuer den Tag anlegen")
    ap.add_argument("--tag", default="v1.2.0", help="Tag fuer --release/--hochladen (Standard v1.2.0)")
    ap.add_argument("--hochladen", nargs="*", metavar="DATEI",
                    help="Dateien an das Release haengen (Standard: dist/*-Windows.zip)")
    a = ap.parse_args()

    if not a.setzen and not a.release and a.hochladen is None:
        zeigen()
        print()
        print("Nichts geaendert. Zum Setzen: --setzen   (braucht GH_TOKEN)")
        return 0

    fehler = 0
    if a.setzen:
        fehler |= setzen()
    if a.release:
        fehler |= release(a.tag)
    if a.hochladen is not None:
        dateien = a.hochladen
        if not dateien:
            kandidaten = sorted(DIST.glob("*Windows.zip")) if DIST.is_dir() else []
            if not kandidaten:
                print("ROT: kein dist/*-Windows.zip gefunden — erst `python tools/paket.py` laufen lassen.")
                return 1
            dateien = [str(k) for k in kandidaten]
        print()
        fehler |= hochladen(a.tag, dateien)
    return fehler


if __name__ == "__main__":
    sys.exit(main())
