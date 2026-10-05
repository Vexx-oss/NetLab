"""Auftrag Q im ECHTEN Programm (Design § 22): G1 (Maus trifft den Switch), G3 (Sprechblase verdeckt nichts),
erster Auftrag mit echter Maus, Bildschirmfotos. Aufruf:  python tools/q-echt.py

Gegenstück zu tools/rauch.py: der prüft web/index.html in Edge, dieser das gebaute Programm (Programm/Netzwerk-Labor.exe).
Die App dient die Seite über das Tauri-Protokoll aus, deshalb wird hier nichts navigiert – gearbeitet wird im laufenden
Spiel, die Bilder kommen aus Page.captureScreenshot.
"""
import json
import sys
import time
from pathlib import Path

HIER = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HIER / "tools"))
import cdp  # noqa: E402

BILDER = HIER / "Nachweise" / "1.2-Q"
BILDER.mkdir(parents=True, exist_ok=True)
FOTO = []


def js(ausdruck, ws=None):
    w = ws or cdp.WS(cdp.seite())
    w.rufen("Runtime.enable")
    r = w.rufen("Runtime.evaluate", {"expression": f"(async () => {{ return {ausdruck} }})()",
                                     "awaitPromise": True, "returnByValue": True})
    if "exceptionDetails" in r:
        d = r["exceptionDetails"]
        raise RuntimeError((d.get("exception", {}).get("description") or d.get("text") or "?")[:300])
    return r.get("result", {}).get("value")


def foto(name, ws=None):
    w = ws or cdp.WS(cdp.seite())
    r = w.rufen("Page.captureScreenshot", {"format": "png"})
    import base64
    pfad = BILDER / name
    pfad.write_bytes(base64.b64decode(r["data"]))
    FOTO.append(name)
    return pfad


def maus(art, *punkte, ws=None):
    w = ws or cdp.WS(cdp.seite())

    def ev(typ, x, y, knoepfe=0, anzahl=0):
        w.rufen("Input.dispatchMouseEvent", {"type": typ, "x": x, "y": y,
                                             "button": "left" if typ != "mouseMoved" or knoepfe else "none",
                                             "buttons": knoepfe, "clickCount": anzahl, "pointerType": "mouse"})
    if art == "klick":
        x, y = punkte
        ev("mouseMoved", x, y); ev("mousePressed", x, y, 1, 1); ev("mouseReleased", x, y, 0, 1)
    elif art == "ziehen":
        x1, y1, x2, y2 = punkte
        ev("mouseMoved", x1, y1)
        time.sleep(0.15)
        ev("mousePressed", x1, y1, 1, 1)
        for i in range(1, 15):
            ev("mouseMoved", x1 + (x2 - x1) * i / 14, y1 + (y2 - y1) * i / 14, 1)
            time.sleep(0.02)
        time.sleep(0.05)
        ev("mouseReleased", x2, y2, 0, 1)


HELFER = r"""
window.__q = {
  mitte(sel){ const el = document.querySelector(sel); if (!el) return null;
    const r = el.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; },
  /* Was fängt die Maus in der Gerätemitte? (G1) */
  treffer(id){ const el = document.querySelector(`.lb-svg g.ger[data-id="${id}"] .ger-treffer`);
    if (!el) return {fehlt: id}; const r = el.getBoundingClientRect();
    const t = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
    const g = t && t.closest ? t.closest('g.ger') : null;
    return {id, oben: t ? (t.tagName + (t.className && t.className.baseVal != null ? '.' + String(t.className.baseVal).split(/\s+/)[0] : (t.className ? '.' + String(t.className).split(/\s+/)[0] : ''))) : 'nichts',
            trifft: !!(g && g.dataset.id === id)}; },
  /* Liegt etwas Unsichtbares über der Fläche? (G1-Ursache) */
  verstecktSichtbar(){ return [...document.querySelectorAll('[hidden]')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.className); },
  blase(){ const b = document.querySelector('.sz-blase'); if (!b) return null;
    const schnitt = (a, c) => { const x = Math.min(a.right, c.right) - Math.max(a.left, c.left), y = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
      return (x > 1 && y > 1) ? {x: Math.round(x), y: Math.round(y)} : null; };
    const pillen = [...document.querySelectorAll('.sz-reaktion')];
    return {links: Math.round(b.getBoundingClientRect().left), breite: Math.round(b.getBoundingClientRect().width),
            pillen: pillen.length,
            treffer: pillen.map(p => ({pille: p.className, ueber: schnitt(b.getBoundingClientRect(), p.getBoundingClientRect())})).filter(t => t.ueber)}; },
  kabel(){ return UI.labor.netz.kabel.length; }
};
true
"""


def main():
    fehler, notizen = [], []
    cdp.start(None, True)
    ws = cdp.WS(cdp.seite())
    ws.rufen("Runtime.enable")
    ws.rufen("Page.enable")
    js(HELFER, ws)

    # 1 · Erster Auftrag muss stehen (Einstieg „Kasse ohne Netz“)
    lage = js("""(async () => {
      for (let i = 0; i < 60 && !(document.querySelector('.lb-svg g.ger[data-id="kasse"]')); i++) await new Promise(r => setTimeout(r, 150));
      await new Promise(r => setTimeout(r, 1200));
      const inst = UI.spiel.inst;
      if (!inst) return {fehlt: 'kein Auftrag'};
      const sw = Object.values(UI.labor.netz.geraete).find(g => g.typ === 'switch');
      return {ticket: Spiel.defVon(inst).id, sw: sw && sw.id, kabel: window.__q.kabel(),
              sichtbarTrotzHidden: window.__q.verstecktSichtbar(),
              fernSichtbar: (() => { const f = document.querySelector('.lb-fern-schild'); if (!f) return 'fehlt';
                const cs = getComputedStyle(f); return cs.display === 'none' ? false : true; })()};
    })()""", ws)
    notizen.append(f"Auftrag {lage.get('ticket')}, Switch {lage.get('sw')}, Kabel {lage.get('kabel')}")
    if lage.get("ticket") != "salon-01":
        fehler.append(f"Erster Auftrag ist nicht salon-01, sondern {lage.get('ticket')}")
    if lage.get("sichtbarTrotzHidden"):
        fehler.append("hidden, aber sichtbar: " + ", ".join(lage["sichtbarTrotzHidden"]))
    if lage.get("fernSichtbar") is not False:
        fehler.append("Fernwartungs-Schild ist ohne Fernwartung sichtbar (G1!)")
    foto("q-1366-1-einstieg.png", ws)

    # 2 · G1: trifft die Maus in der Mitte jedes Geräts das Gerät selbst?
    frei = js("""(() => {
      const ids = Object.keys(UI.labor.netz.geraete);
      const raus = ids.map(id => window.__q.treffer(id)).filter(t => t.fehlt || !t.trifft);
      return {n: ids.length, verdeckt: raus};
    })()""", ws)
    notizen.append(f"{frei['n']} Geräte geprüft, {len(frei['verdeckt'])} verdeckt")
    if frei["verdeckt"]:
        fehler.append("verdeckt: " + ", ".join(f"{t.get('id')} unter {t.get('oben')}" for t in frei["verdeckt"]))

    # 3 · Erster Auftrag mit echter Maus: Kabel Kasse → Switch
    p = js("""(() => { const k = window.__q.mitte('.lb-svg g.ger[data-id="kasse"] .ger-treffer'),
                        s = window.__q.mitte('.lb-svg g.ger[data-id="' + Object.values(UI.labor.netz.geraete).find(g => g.typ === 'switch').id + '"] .ger-treffer');
                        return {kasse: k, switch: s, kabel: window.__q.kabel()}; })()""", ws)
    maus("ziehen", p["kasse"][0], p["kasse"][1], p["switch"][0], p["switch"][1], ws=ws)
    time.sleep(0.6)
    nach = js("window.__q.kabel()", ws)
    notizen.append(f"Kabel vorher {p['kabel']} → nachher {nach}")
    if nach <= p["kabel"]:
        fehler.append(f"Kabel nicht entstanden ({p['kabel']} → {nach}) – die Maus trifft den Switch nicht")
    foto("q-1366-2-kabel-maus.png", ws)

    # 4 · Abnahme per Mausklick, dann sofort das Bild der Funktionsprobe (G3)
    q = js("window.__q.mitte('.sp-abnahme')", ws)
    if not q:
        fehler.append("Abnahme-Knopf nicht gefunden")
    else:
        maus("klick", q[0], q[1], ws=ws)
        blase = None
        for _ in range(30):
            blase = js("window.__q.blase()", ws)
            if blase:
                break
            time.sleep(0.05)
        if not blase:
            fehler.append("keine Sprechblase in der Funktionsprobe gesehen")
        else:
            notizen.append(f"Sprechblase links {blase['links']}, {blase['breite']} px breit, {blase['pillen']} Pillen")
            foto("q-1366-3-probe-blase.png", ws)
            if blase["treffer"]:
                fehler.append("Sprechblase verdeckt " + ", ".join(
                    f"{t['pille']} ({t['ueber']['x']}×{t['ueber']['y']} px)" for t in blase["treffer"]))
        erg = js("""(async () => { for (let i = 0; i < 90; i++) { const e = Spiel.st.erledigt.find(x => x.id === 'salon-01');
                     if (e) return {sterne: e.sterne}; await new Promise(r => setTimeout(r, 200)); }
                     return {nicht: true}; })()""", ws)
        if "sterne" not in erg:
            fehler.append("Auftrag nicht bestanden (Abnahme per Maus)")
        else:
            notizen.append(f"Auftrag bestanden: {erg['sterne']:g} ★")
        time.sleep(2.5)
        foto("q-1366-4-ergebnis.png", ws)

    # 5 · Fernwartung: das Schild muss hier erscheinen (G1 darf es nicht mitentfernt haben)
    fern = js("""(async () => {
      const w = UI.app.wechsle || UI.app.ansicht; UI.app.ansicht('labor');
      await new Promise(r => setTimeout(r, 400));
      UI.labor.fernwartung('sw1');
      await new Promise(r => setTimeout(r, 600));
      const f = document.querySelector('.lb-fern-schild');
      if (!f) return {fehlt: 'kein Schild'};
      const r = f.getBoundingClientRect(), cs = getComputedStyle(f);
      return {display: cs.display, breite: Math.round(r.width), hoehe: Math.round(r.height), imFenster: r.left >= 0 && r.right <= innerWidth};
    })()""", ws)
    notizen.append(f"Fernwartung: Schild {fern.get('breite')}×{fern.get('hoehe')}, display {fern.get('display')}")
    if not fern.get("breite") or fern.get("display") == "none":
        fehler.append(f"Fernwartungs-Schild erscheint nicht ({fern})")
    foto("q-1366-5-fernwartung.png", ws)

    jsfehler = [f for f in getattr(ws, "fehler", []) if "Tauri" not in f and "__TAURI" not in f]
    if jsfehler:
        fehler.append("JS-Fehler: " + " | ".join(jsfehler[:3]))

    print(json.dumps({"fehler": fehler, "notizen": notizen, "fotos": FOTO,
                      "exe": str(cdp.EXE), "exe_stand": time.strftime("%d.%m.%Y %H:%M", time.localtime(cdp.EXE.stat().st_mtime))},
                     ensure_ascii=False, indent=1))
    cdp.stop()
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
