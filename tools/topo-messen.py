"""Messsonde fuer die Lesbarkeit der Topologie: rendert eine Vorlage in Edge und misst
   (a) Textueberlappungen, (b) Schriftgroessen der Beschriftungen, (c) ob Labels von Geraeten ueberdeckt werden.

   Aufruf: python tools/topo-messen.py [vorlage] [breite] [hoehe]      z. B. praxis 1366 768
   Ausgabe: JSON mit den Messwerten (Vergleich vorher/nachher).
"""
import json
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
import http.server
from functools import partial
from pathlib import Path

HIER = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HIER / "tools"))
import cdp  # noqa: E402

EDGE = [Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
        Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe")]


class Leise(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


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
    raise SystemExit("Browser meldet sich nicht")


MESSUNG = r"""
(() => {
  const svg = document.querySelector('.lb-svg');
  if (!svg) return {fehler: 'keine Flaeche'};
  const s = svg.getBoundingClientRect();
  /* SVG kennt kein Layout fuer Text: die gemalte Breite ueber getBBox() holen und
     selbst in Bildschirmkoordinaten umrechnen. getBoundingClientRect liefert bei
     SVG-Text haeufig 0 breit - deshalb war die erste Messung falsch. */
  const kasten = el => {
    let b;
    try { b = el.getBBox(); } catch (e) { return null; }
    if (!b || b.width <= 0 || b.height <= 0) return null;
    const m = el.getScreenCTM ? el.getScreenCTM() : null;
    if (!m) return null;
    const punkte = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
      .map(([x, y]) => ({x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f}));
    const xs = punkte.map(p => p.x), ys = punkte.map(p => p.y);
    return {x: Math.min(...xs), y: Math.min(...ys), b: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys)};
  };
  const texte = [...svg.querySelectorAll('text')].map(t => {
    const k = kasten(t);
    const cs = getComputedStyle(t);
    return k && {klasse: t.getAttribute('class') || '', inhalt: (t.textContent || '').slice(0, 44), ...k,
                 schrift: parseFloat(cs.fontSize) || 0, fuellung: cs.fill};
  }).filter(Boolean);
  const ueberlappt = (a, c) => {
    const x = Math.min(a.x + a.b, c.x + c.b) - Math.max(a.x, c.x);
    const y = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
    return x > 1 && y > 1 ? {x: Math.round(x), y: Math.round(y)} : null;
  };
  const paare = [], verdeckt = [];
  for (let i = 0; i < texte.length; i++) for (let j = i + 1; j < texte.length; j++) {
    const u = ueberlappt(texte[i], texte[j]);
    if (!u) continue;
    const a = texte[i], c = texte[j];
    /* Text ueber Text = beide unlesbar. Text ueber Geraetekachel = auch schlecht. */
    (a.klasse.includes('ger-') || c.klasse.includes('ger-') ? verdeckt : paare)
      .push({a: a.klasse + ' „' + a.inhalt + '“', b: c.klasse + ' „' + c.inhalt + '“', x: u.x, y: u.y});
  }
  /* Geraetekacheln: liegt Text darueber? */
  const kacheln = [...svg.querySelectorAll('.ger')].map(g => {
    const k = kasten(g.querySelector('.ger-treffer') || g);
    return k && {id: g.getAttribute('data-id'), ...k};
  }).filter(Boolean);
  const aufKachel = [];
  for (const t of texte) for (const k of kacheln) {
    const u = ueberlappt(t, k);
    if (u && u.x > 4 && u.y > 4) aufKachel.push({text: t.klasse + ' „' + t.inhalt + '“', geraet: k.id, x: u.x, y: u.y});
  }
  const groessen = {};
  for (const t of texte) groessen[t.klasse] = Math.min(groessen[t.klasse] ?? 99, t.schrift);
  /* Engste Abstaende zwischen zwei Texten: kleiner als 2 px heisst "klebt aneinander",
     auch wenn sich die Kaesten formal nicht schneiden. */
  const abstand = (a, c) => Math.max(0, Math.max(a.x - (c.x + c.b), c.x - (a.x + a.b)))
                        + Math.max(0, Math.max(a.y - (c.y + c.h), c.y - (a.y + a.h)));
  const eng = [];
  for (let i = 0; i < texte.length; i++) for (let j = i + 1; j < texte.length; j++) {
    const d = abstand(texte[i], texte[j]);
    if (d < 2) eng.push({a: texte[i].klasse + ' „' + texte[i].inhalt + '“',
                         b: texte[j].klasse + ' „' + texte[j].inhalt + '“', abstand: +d.toFixed(1)});
  }
  const kabel = [...svg.querySelectorAll('.kabel-port')].map(t => t.textContent);
  const zonen = [...svg.querySelectorAll('.zone-text')].map(t => t.textContent);
  return {
    texte: texte.length,
    ueberlappungen: paare.length,
    beispiele: paare.slice(0, 6),
    aufGeraetekachel: aufKachel.length,
    beispieleKachel: aufKachel.slice(0, 6),
    kleinsteSchrift: groessen,
    schriftUnter12: texte.filter(t => t.schrift < 12).length,
    klebtAneinander: eng.length,
    beispieleEng: eng.slice(0, 6),
    kabelPorts: kabel.length,
    kabelPortDoppelt: kabel.length - new Set(kabel).size,
    textListe: texte.map(t => ({klasse: t.klasse, schrift: t.schrift, inhalt: t.inhalt})),
    zonen: zonen.length, zonenTexte: zonen,
    geraete: Object.keys(UI.labor.netz.geraete).length
  };
})()
"""


def main():
    vorlage = sys.argv[1] if len(sys.argv) > 1 else "praxis"
    breite = int(sys.argv[2]) if len(sys.argv) > 2 else 1366
    hoehe = int(sys.argv[3]) if len(sys.argv) > 3 else 768
    server = browser = profil = None
    try:
        port = freier_port()
        server = http.server.ThreadingHTTPServer(("127.0.0.1", port), partial(Leise, directory=str(HIER / "web")))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        edge = next((p for p in EDGE if p.exists()), None)
        if not edge:
            raise SystemExit("Edge nicht gefunden")
        profil = Path(tempfile.mkdtemp(prefix="labor-topo-"))
        dport = freier_port()
        browser = subprocess.Popen([str(edge), "--headless=new", f"--remote-debugging-port={dport}",
                                    f"--user-data-dir={profil}", "--no-first-run", "--no-default-browser-check",
                                    "--disable-extensions", "about:blank"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        ws = cdp.WS(seite_auf(dport))
        ws.rufen("Runtime.enable")
        ws.rufen("Page.enable")
        ws.rufen("Emulation.setDeviceMetricsOverride", {"width": breite, "height": hoehe, "deviceScaleFactor": 1, "mobile": False})

        def js(ausdruck):
            # ausdruck ist ein vollstaendiger Ausdruck (z. B. ein sofort aufgerufener IIFE)
            r = ws.rufen("Runtime.evaluate", {"expression": f"(async () => ({ausdruck}))()",
                                              "awaitPromise": True, "returnByValue": True})
            if "exceptionDetails" in r:
                raise RuntimeError(str(r["exceptionDetails"])[:400])
            if "error" in r:
                raise RuntimeError(str(r["error"])[:400])
            if not isinstance(r, dict) or "result" not in r:
                raise RuntimeError("unerwartete CDP-Antwort: " + json.dumps(r, ensure_ascii=False)[:300])
            return r["result"].get("value")

        ws.rufen("Page.navigate", {"url": f"http://127.0.0.1:{port}/index.html"})
        time.sleep(3)
        # Vorlage laden und Labor zeigen, IP-Ebene an (dort stehen die Adressen)
        lage = js(f"""(async () => {{
          for (let i = 0; i < 50 && !(typeof Spiel !== 'undefined' && Spiel.st); i++) await new Promise(r => setTimeout(r, 100));
          Spiel.neu(); store.sofort();
          const n = DATEN.beispiele.{vorlage} ? DATEN.beispiele.{vorlage}() : null;
          if (!n) return {{fehler: 'Vorlage {vorlage} nicht gefunden'}};
          UI.labor.laden(n, {{titel: 'Messung', sandbox: true}});
          await new Promise(r => setTimeout(r, 1200));
          if (UI.ebenen && UI.ebenen.setzen) UI.ebenen.setzen('ip');
          await new Promise(r => setTimeout(r, 1200));
          return {{ok: true, geraete: Object.keys(UI.labor.netz.geraete).length}};
        }})()""")
        erg = js(MESSUNG)
        if "--texte" in sys.argv:
            print("Klasse                 px   Inhalt")
            for t in erg.get("textListe", []):
                print(f"  {t['klasse']:22s} {t['schrift']:5.1f}  {t['inhalt']}")
        erg.pop("textListe", None)
        print(json.dumps({"vorlage": vorlage, "fenster": f"{breite}x{hoehe}", **erg}, ensure_ascii=False, indent=1))
        return 0
    finally:
        if browser:
            browser.terminate()
        if server:
            server.shutdown()
        if profil:
            shutil.rmtree(profil, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
