"""Rauchtest der Oberfläche (Design – Spielspaß 2.0, § 20 F8): jede Ansicht in 1366, 960 und 720 px Breite.

  python tools/rauch.py              baut web/index.html und prüft es in Edge (headless, frischer Spielstand) – ohne Rust-Build
  python tools/rauch.py --exe        prüft stattdessen das echte Programm (Programm/Netzwerk-Labor.exe, über tools/cdp.py)
  python tools/rauch.py --sichtbar   Edge mit Fenster (zum Zuschauen)
  sh tools/test.sh --rauch           Node-Tests, Klassen-Abgleich und dieser Rauchtest nacheinander

Geprüft wird je Breite und Ansicht:
  1. die Hauptaktion ist ohne Scrollen sichtbar und anklickbar (elementFromPoint trifft sie);
     im schmalen Postfach erst nach dem Klick auf eine Karte (Blatt von unten)
  2. kein waagerechter Überlauf: die Seite scrollt nicht seitlich, und kein sichtbares Element ragt rechts aus dem
     Fenster (ausgenommen Bereiche, die absichtlich waagerecht scrollen, und Abgeschnittenes)
  3. keine JS-Fehler
Ausgabe: eine Zeile je Fall, am Ende die Summe. Exit-Code 0 = alles grün.
Nur Python-Standardbibliothek; der WebSocket-Client kommt aus tools/cdp.py.
"""
import http.server
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
from functools import partial
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HIER = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HIER / "tools"))
import cdp  # noqa: E402  (WebSocket-Client, start/stop des echten Programms)

BREITEN = [(1366, 768), (960, 700), (720, 640)]
EDGE = [Path(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")) / "Microsoft/Edge/Application/msedge.exe",
        Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Microsoft/Edge/Application/msedge.exe",
        Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Google/Chrome/Application/chrome.exe"]

# Helfer im Programm: Zustand je Fall vorbereiten (frischer Spielstand, Einstieg übersprungen, Stufe 3 → alle Formen)
HELFER = r"""
window.__rauch = {
  warte: ms => new Promise(r => setTimeout(r, ms)),
  zu(){ document.querySelectorAll(".sp-overlay").forEach(o => o.remove()); },
  basis(){
    this.zu();
    const st = Spiel.st; st.einstieg = st.einstieg || {}; st.einstieg.fertig = true;
    if ((st.stufe || 1) < 3) st.stufe = 3;
    Spiel._einst.wahl = "AP1";
  },
  ansicht(n){ this.basis(); UI.app.ansicht(n); },
  ticket(id){ this.basis(); const i = Spiel.instanzErstellen({ticketId: id, quelle: "postfach"}); UI.spiel.oeffnen(i.iid); },
  form(f){
    this.basis();
    const opts = {kunde: "salon", stufe: "AP1"}, def = Spiel.generiereForm(f, 5, opts);
    const i = Spiel.instanzErstellen({gen: {form: f, seed: 5, opts}, ticketId: def.id, quelle: "postfach"});
    UI.spiel.oeffnen(i.iid);
  },
  /* Hauptaktion: erste sichtbare Übereinstimmung, ganz im Fenster, und der Klickpunkt trifft sie */
  haupt(sels){
    const W = innerWidth, H = innerHeight;
    for (const sel of sels) {
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none") continue;
        const drin = r.left >= -1 && r.top >= -1 && r.right <= W + 1 && r.bottom <= H + 1;
        const t = document.elementFromPoint(Math.min(W - 1, r.left + r.width / 2), Math.min(H - 1, r.top + r.height / 2));
        const trifft = !!t && (el === t || el.contains(t));
        return {sel, text: (el.textContent || el.getAttribute("aria-label") || el.placeholder || "").replace(/\s+/g, " ").trim().slice(0, 40),
                ok: drin && trifft, drin, trifft, verdeckt: trifft ? null : (t ? (t.className && t.className.baseVal == null ? String(t.className) : t.tagName) : null)};
      }
    }
    return {sel: sels.join(" | "), ok: false, fehlt: true};
  },
  /* Waagerechter Überlauf: (1) Bereiche, die seitlich scrollen müssen, obwohl sie es nicht sollen – absichtlich seitlich
     scrollende stehen in ABSICHT; (2) sichtbare Elemente, die rechts aus dem Fenster ragen; (3) die Seite selbst. */
  ABSICHT: ".bl-rahmen, .lb-blatt, .lb-dock-reiter, .tm-reiter, .ka-atlas-rahmen, .np-flaeche, .am-plan, .ko-schirm, .si-liste, .si-pdu, .in-ent-code, pre",
  name(el){ const k = el.className && el.className.baseVal != null ? el.className.baseVal : el.className; return el.tagName.toLowerCase() + (k ? "." + String(k).trim().split(/\s+/).slice(0, 2).join(".") : ""); },
  ueberlauf(){
    const W = innerWidth, raus = [];
    const seite = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > W + 1;
    for (const el of document.querySelectorAll("body *")) {
      if (raus.length >= 4) break;
      const cs = getComputedStyle(el);
      if (!/(auto|scroll)/.test(cs.overflowX) || !el.clientWidth || el.scrollWidth <= el.clientWidth + 1 || !el.getClientRects().length) continue;
      if (cs.visibility === "hidden" || el.matches(this.ABSICHT)) continue;
      raus.push(`${this.name(el)} scrollt seitlich (+${el.scrollWidth - el.clientWidth} px)`);
    }
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.right <= W + 1 || r.left >= W) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || cs.position === "fixed" && r.left >= W) continue;
      let weg = false;
      for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
        const ps = getComputedStyle(e);
        if (/(auto|scroll)/.test(ps.overflowX)) { weg = true; break; }                       /* scrollt absichtlich */
        if (/(hidden|clip)/.test(ps.overflowX) && e.getBoundingClientRect().right <= W + 1) { weg = true; break; }   /* abgeschnitten */
        if (ps.display === "none" || ps.visibility === "hidden") { weg = true; break; }
      }
      if (weg) continue;
      raus.push(`${this.name(el)} (rechts ${Math.round(r.right)} > ${W})`);
      if (raus.length >= 4) break;
    }
    return {ok: !seite && !raus.length, seite, raus};
  },
};
"""

# Fälle: (Name, Vorbereitung, Hauptaktion(en), Sonderablauf)
FAELLE = [
    ("Heute", "__rauch.ansicht('heute')", [".hb-annehmen", ".hb .primaer"], None),
    ("Postfach", "__rauch.ansicht('postfach')", [".sp-pf-teile > .sp-leser .knopf.primaer"], "postfach"),
    ("Labor · Störung", "__rauch.ticket('salon-02')", [".sp-abnahme"], None),
    ("Labor · Fernwartung", "__rauch.form('forensik')", [".sp-abnahme"], "fern"),
    ("Labor · Adressplan", "__rauch.form('beratung')", [".sp-abnahme"], None),
    ("Labor · Plan-Audit", "__rauch.form('audit')", [".sp-abnahme"], None),
    ("Labor · Hotline", "__rauch.ticket('salon-hotline')", [".sp-abnahme"], None),
    ("Kunden", "__rauch.ansicht('kunden')", [".kr-kunde .ka-zeile .knopf", ".kr-kunde h3"], None),
    ("Wiki", "__rauch.ansicht('wiki')", ["input[type=search]"], None),
    ("Lernstand", "__rauch.ansicht('lernstand')", [".kr-kopf .knopf", ".kr-kopf h2"], None),
    ("Shop", "__rauch.ansicht('shop')", [".kr-ware .knopf.primaer", ".kr-ware", ".kr-kopf h2"], None),
]


class Leise(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


class Seite:
    """Eine CDP-Sitzung mit Fehlerprotokoll (Runtime.exceptionThrown, console.error)."""

    def __init__(self, ws_url):
        self.ws = cdp.WS(ws_url)
        self.ws.fehler = []
        self.ws.rufen("Runtime.enable")
        self.ws.rufen("Page.enable")

    def js(self, ausdruck):
        r = self.ws.rufen("Runtime.evaluate", {"expression": f"(async () => {{ return {ausdruck} }})()", "awaitPromise": True, "returnByValue": True})
        if "exceptionDetails" in r:
            d = r["exceptionDetails"]
            raise RuntimeError((d.get("exception", {}).get("description") or d.get("text") or "?")[:300])
        return r.get("result", {}).get("value")

    def groesse(self, b, h):
        self.ws.rufen("Emulation.setDeviceMetricsOverride", {"width": b, "height": h, "deviceScaleFactor": 1, "mobile": False})
        time.sleep(0.3)

    def klick(self, x, y):
        for typ, knoepfe in (("mouseMoved", 0), ("mousePressed", 1), ("mouseReleased", 0)):
            self.ws.rufen("Input.dispatchMouseEvent", {"type": typ, "x": x, "y": y, "button": "left" if typ != "mouseMoved" else "none",
                                                      "buttons": knoepfe, "clickCount": 1 if typ != "mouseMoved" else 0, "pointerType": "mouse"})

    def neu_laden(self, url=None):
        if url:
            self.ws.rufen("Page.navigate", {"url": url})
        else:
            self.ws.rufen("Page.reload", {"ignoreCache": True})
        for _ in range(60):
            time.sleep(0.25)
            try:
                if self.js("typeof Spiel !== 'undefined' && !!Spiel._st && typeof UI !== 'undefined' && !!UI.app"):
                    break
            except RuntimeError:
                pass
        time.sleep(0.6)
        self.js(HELFER.strip().rstrip(";") + ", true")


def freier_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def seite_auf(port):
    for _ in range(80):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=2) as r:
                for z in json.loads(r.read()):
                    if z.get("type") == "page" and "webSocketDebuggerUrl" in z:
                        return z["webSocketDebuggerUrl"]
        except Exception:
            pass
        time.sleep(0.25)
    raise SystemExit("Browser meldet sich nicht auf dem Fernsteuerungs-Port")


def fall_pruefen(s, name, vorbereitung, haupt, sonder, breite):
    s.js(f"(async () => {{ {vorbereitung}; await __rauch.warte(1100); return true; }})()")
    if sonder == "postfach" and breite < 900:
        # schmal: der Leser hat keinen Platz – Karte anklicken, dann muss das Blatt mit „Annehmen“ kommen
        p = s.js("(() => { const k = document.querySelector('.sp-mail'); if (!k) return null; const r = k.getBoundingClientRect(); return [r.left + r.width / 2, r.top + Math.min(24, r.height / 2)]; })()")
        if p:
            s.klick(*p)
            time.sleep(0.7)
        haupt = [".sp-overlay.blatt .knopf.primaer"]
    a = s.js(f"__rauch.haupt({json.dumps(haupt)})")
    zusatz = None
    if sonder == "fern":
        zusatz = s.js("(() => { const f = document.querySelector('.lb-fern-schild'), t = document.querySelector('.tm .ko-eingabe'), lab = document.querySelector('.labor'), d = document.querySelector('.lb-dock');"
                      " const sf = f && f.getBoundingClientRect(), anteil = d && lab ? d.getBoundingClientRect().width / lab.getBoundingClientRect().width : 0;"
                      " return {fenster: !!sf && sf.width > 100 && sf.left >= 0 && sf.right <= innerWidth, eingabe: __rauch.haupt(['.tm .ko-eingabe']).ok, anteil: Math.round(anteil * 100)}; })()")
    u = s.js("__rauch.ueberlauf()")
    s.js("(() => { __rauch.zu(); return true; })()")
    fehler = []
    if not a.get("ok"):
        fehler.append("Hauptaktion " + ("fehlt" if a.get("fehlt") else ("außerhalb" if not a.get("drin") else f"verdeckt von {a.get('verdeckt')}")) + f" [{a.get('sel')}]")
    if zusatz is not None:
        if not zusatz["fenster"]:
            fehler.append("Sitzungsfenster nicht ganz sichtbar")
        if not zusatz["eingabe"]:
            fehler.append("Terminal-Eingabe nicht anklickbar")
        if zusatz["anteil"] < 55:
            fehler.append(f"Terminal nur {zusatz['anteil']} % breit")
    if not u["ok"]:
        fehler.append(("Seite scrollt seitlich; " if u["seite"] else "") + ", ".join(u["raus"]))
    return fehler, a


def main():
    a = sys.argv[1:]
    exe = "--exe" in a
    sichtbar = "--sichtbar" in a
    if not exe and "--ohne-bau" not in a:
        r = subprocess.run([sys.executable, str(HIER / "bauen.py")], cwd=HIER, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if r.returncode:
            raise SystemExit("bauen.py ist fehlgeschlagen:\n" + r.stdout + r.stderr)
    server = browser = profil = None
    try:
        if exe:
            cdp.start(None, True)
            s = Seite(cdp.seite())
            url = None
        else:
            port = freier_port()
            server = http.server.ThreadingHTTPServer(("127.0.0.1", port), partial(Leise, directory=str(HIER / "web")))
            threading.Thread(target=server.serve_forever, daemon=True).start()
            edge = next((p for p in EDGE if p.exists()), None)
            if not edge:
                raise SystemExit("Edge/Chrome nicht gefunden – oder mit --exe gegen das echte Programm prüfen.")
            profil = Path(tempfile.mkdtemp(prefix="labor-rauch-"))
            dport = freier_port()
            argumente = [str(edge), f"--remote-debugging-port={dport}", f"--user-data-dir={profil}", "--no-first-run", "--no-default-browser-check",
                         "--disable-extensions", "--window-size=1366,768", "about:blank"]
            if not sichtbar:
                argumente.insert(1, "--headless=new")
            browser = subprocess.Popen(argumente, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            s = Seite(seite_auf(dport))
            url = f"http://127.0.0.1:{port}/index.html"
        s.neu_laden(url)
        gesamt, rot = 0, 0
        print(f"Rauchtest {'echtes Programm' if exe else 'web/index.html in Edge'} · {len(FAELLE)} Ansichten × {len(BREITEN)} Breiten")
        for b, h in BREITEN:
            s.groesse(b, h)
            for name, vorbereitung, haupt, sonder in FAELLE:
                gesamt += 1
                try:
                    fehler, akt = fall_pruefen(s, name, vorbereitung, haupt, sonder, b)
                except RuntimeError as e:
                    fehler, akt = [f"JS: {e}"], {}
                if fehler:
                    rot += 1
                print(f"{'✓' if not fehler else '✗'} {b:>4} px  {name:<22} {('„' + akt.get('text', '') + '“') if akt.get('text') else ''}{'  ← ' + ' · '.join(fehler) if fehler else ''}")
        js_fehler = [f for f in s.ws.fehler if "Tauri" not in f and "__TAURI" not in f]
        if js_fehler:
            rot += 1
            print("✗ JS-Fehler:", *js_fehler[:5], sep="\n  ")
        print(f"\n{gesamt - min(rot, gesamt)}/{gesamt} grün" + ("" if not rot else f" – {rot} rot"))
        return 1 if rot else 0
    finally:
        if exe:
            cdp.stop()
        if browser:
            browser.terminate()
            try:
                browser.wait(5)
            except Exception:
                browser.kill()
        if server:
            server.shutdown()
        if profil:
            shutil.rmtree(profil, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
