"""Zweiter Schritt beim Aufräumen: die relativen Verweise der bewegten Dateien geradeziehen.

Im ersten Schritt sind die Dateien umgezogen, aber ihre eigenen Verweise zeigten weiter relativ
zur alten Stelle (aus `docs/Bauen.md` wurde `README.md` gesucht, statt `../README.md`). Dieses
Skript setzt vor jeden toten Verweis so viele `..`, bis er wieder trifft — und prüft danach
jeden relativen Verweis in jeder Markdown-Datei.

  python tools/repo-verweise-flicken.py
"""
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote, quote

sys.stdout.reconfigure(encoding="utf-8")
HIER = Path(__file__).resolve().parents[1]


def git(*args: str) -> str:
    r = subprocess.run(["git"] + list(args), cwd=str(HIER), capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        raise SystemExit(f"git {' '.join(args)} gescheitert: {r.stderr.strip()}")
    return r.stdout


def dateien() -> list[Path]:
    return [Path(p) for p in git("ls-files", "*.md").splitlines() if p.strip()]


def scannen() -> list[tuple[Path, int, str, str]]:
    """Alle relativen Verweise, die ins Leere zeigen: (Datei, Zeile, roher Zieltext, entkodiert)."""
    tot = []
    for datei in dateien():
        voll = HIER / datei
        if not voll.is_file():
            continue
        text = voll.read_text(encoding="utf-8", errors="replace")
        for m in re.finditer(r"\]\((<[^>]*>|[^)\s]+)\)", text):
            roh = m.group(1)
            ziel = unquote(roh.strip("<>").split("#")[0])
            if not ziel or ziel.startswith(("http://", "https://", "#", "mailto:", "C:", "dsh:")):
                continue
            if not (datei.parent / ziel).resolve().exists():
                tot.append((datei, text[: m.start()].count("\n") + 1, roh, ziel))
    return tot


def flicken(tot) -> int:
    """Vor jeden toten Verweis `..` setzen, bis er trifft — höchstens bis zur Wurzel."""
    gruppen: dict[tuple[Path, str], str] = {}
    for datei, _zeile, roh, ziel in tot:
        tiefe = len(datei.parent.parts)  # 0 = Wurzel, 1 = docs/, 2 = docs/entwicklung/
        neu = None
        for n in range(1, 4):
            kandidat = Path(*([".."] * n)) / ziel
            if (datei.parent / kandidat).resolve().exists():
                neu = kandidat.as_posix()
                break
        if neu is None:
            print(f"  ! {datei}: kein Ziel gefunden für {ziel} (Tiefe {tiefe})")
            continue
        in_spitz = roh.startswith("<")
        if any(z in neu for z in ("–", "—", " ")):
            neuer_link = f"<{quote(neu, safe='/.–—')}>"
        else:
            neuer_link = quote(neu, safe="/.")
        gruppen[(datei, roh)] = neuer_link
    for (datei, roh), neu in gruppen.items():
        voll = HIER / datei
        text = voll.read_text(encoding="utf-8")
        text = text.replace(f"](<{roh}>)", f"]({neu})").replace(f"]({roh})", f"]({neu})")
        voll.write_text(text, encoding="utf-8", newline="")
    return len(gruppen)


if __name__ == "__main__":
    tot = scannen()
    print(f"1) Tote Verweise gefunden: {len(tot)}")
    for datei, zeile, _roh, ziel in tot:
        print(f"   {datei}:{zeile} -> {ziel}")
    n = flicken(tot)
    print(f"\n2) {n} Verweis(e) neu gesetzt")
    rest = scannen()
    print(f"\n3) Nach der Prüfung: {len(rest)} tote(r) Verweis(e)")
    for datei, zeile, _roh, ziel in rest:
        print(f"   ✗ {datei}:{zeile} -> {ziel}")
    print("\n" + ("GRÜN: alle relativen Verweise treffen" if not rest else "ROT: es bleiben tote Verweise"))
    raise SystemExit(1 if rest else 0)
