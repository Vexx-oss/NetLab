"""Nachprobe zu drei Befunden aus dem Menü-Audit (Desktop und damit auch Android-Tablet).

Geprüft wird je Befund die WIRKUNG, nicht die CSS-Regel:
  1. Port-Menü (Befund 5): ein Menü mit 26 Einträgen, nahe der Unterkante geöffnet,
     muss ganz im Fenster liegen (Audit: 3–4 px darunter).
  2. Terminal-Reiter (Befund 4): bei drei Sitzungen muss der dritte Reiter ganz sichtbar
     und mit der Mitte treffbar sein (Audit: 720 × 640 lag er außerhalb).
  3. Auftragsmappe, Reiter „Plan" (Befund 6): nur EINE Bildlaufleiste — `.am-inhalt`
     scrollt, `.am-plan` darf keinen eigenen Bildlaufbereich mehr haben.

  python tools/nachprobe-menuefix.py
"""
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, r"C:\Users\Student\Documents\Joshua\10-Projekte\Lernprojekte\Netzwerk-Labor\tools")
from starttest import WS, browser, warte_auf_port  # noqa: E402

HIER = Path(r"C:\Users\Student\Documents\Joshua\10-Projekte\Lernprojekte\Netzwerk-Labor")
PORT = 9536

SKRIPT = r"""
(async () => {
  const warte = ms => new Promise(r => setTimeout(r, ms));
  const R = {};
  const kb = e => { if (!e) return null; const b = e.getBoundingClientRect();
    return {x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height),
            r: Math.round(b.right), u: Math.round(b.bottom)}; };
  const sichtbar = e => {
    if (!e) return false;
    const b = e.getBoundingClientRect();
    if (b.width <= 0 || b.height <= 0) return false;
    for (let k = e; k && k.nodeType === 1; k = k.parentElement) {
      const st = getComputedStyle(k);
      if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0) return false;
    }
    return true;
  };
  try {
    UI.app.ansicht('labor'); await warte(700);

    /* ---- 1. Menü mit vielen Einträgen nahe der Unterkante ---- */
    const eintraege = [];
    for (let i = 1; i <= 26; i++) eintraege.push({text: 'Eintrag ' + i, fn: () => {}});
    UI.menue(300, innerHeight - 20, eintraege, {titel: 'Port an SW-Salon wählen'});
    await warte(260);
    const m = document.querySelector('.menue:not(.popover)');
    R.menue = {fenster: {w: innerWidth, h: innerHeight}, masse: kb(m),
               drin: m ? (m.getBoundingClientRect().bottom <= innerHeight - 5.5) : null,
               ueberstandUnten: m ? Math.round(Math.max(0, m.getBoundingClientRect().bottom - (innerHeight - 6))) : null};
    UI.menue.zu(); await warte(200);

    /* ---- 2. Terminal-Reiter bei drei Sitzungen ---- */
    const ids = Object.keys(UI.labor.netz.geraete);
    /* Drei Sitzungen — aber nur auf Geräten MIT Terminal: `internet` ist eine Kulisse
       (`src/ui/inspektor.js`, „internet" wird dort ausgenommen) und wird von der
       Terminal-Verwaltung wieder verworfen (selbst gemessen: mit „inet" als drittem
       Gerät blieben nur 2 Reiter übrig). */
    const mitTerminal = ids.filter(id => UI.labor.netz.geraete[id].typ !== "internet").slice(0, 4);
    for (const id of mitTerminal) { try { UI.terminal.oeffnen(id); await warte(420); } catch (e) { R.terminalFehler = String(e); } }
    R.terminalSitzungen = (() => { try { return UI.terminal.sitzungen; } catch (e) { return String(e); } })();
    UI.labor.dock('terminal'); await warte(600);
    const reiter = [...document.querySelectorAll('.tm-tab')];
    const leiste = document.querySelector('.tm-reiter');
    /* Der AKTIVE Reiter muss ganz im Scrollfenster liegen und treffbar sein (das war der
       Befund: der dritte Reiter lag außerhalb, der Rollbalken war versteckt). Reiter, die
       links oder rechts aus dem Fenster ragen, sind bei vier Sitzungen normal — sie sind
       über den jetzt SICHTBAREN Rollbalken erreichbar. */
    R.terminalRollbalken = leiste ? {scrollbarWidth: getComputedStyle(leiste).scrollbarWidth} : null;
    R.terminal = {anzahl: reiter.length, leiste: kb(leiste),
      ueberlauf: leiste ? {scrollWidth: leiste.scrollWidth, clientWidth: leiste.clientWidth} : null,
      tabs: reiter.map(t => {
        const b = t.getBoundingClientRect();
        const s = leiste ? leiste.getBoundingClientRect() : null;
        const balken = leiste ? leiste.offsetHeight - leiste.clientHeight : 0;
        const rechts = s ? s.right - balken : 0;
        const p = document.elementFromPoint(Math.round(b.left + b.width / 2), Math.round(b.top + b.height / 2));
        return {text: t.textContent.trim().slice(0, 18), masse: kb(t), aktiv: t.classList.contains('an'),
                ganzImScrollfenster: s ? (b.left >= s.left - 1 && b.right <= rechts + 1) : null,
                mitteGetroffen: !!p && (p === t || t.contains(p))}; })};

    /* ---- 3. Auftragsmappe, Reiter „Plan" ---- */
    try { UI.spiel.mappeAuf('plan'); } catch (e) { R.mappeFehler = String(e); }
    await warte(700);
    const inhalt = document.querySelector('.am-inhalt');
    const plan = document.querySelector('.am-plan');
    R.mappe = {da: !!document.querySelector('.am-mappe'),
      inhalt: inhalt ? {overflowY: getComputedStyle(inhalt).overflowY, scrollH: inhalt.scrollHeight, clientH: inhalt.clientHeight} : null,
      plan: plan ? {overflowY: getComputedStyle(plan).overflowY, scrollH: plan.scrollHeight, clientH: plan.clientHeight,
                    eigenerBildlauf: getComputedStyle(plan).overflowY === 'auto' || getComputedStyle(plan).overflowY === 'scroll'} : null,
      anzahlScrollbereiche: [...document.querySelectorAll('.am-mappe, .am-mappe *')].filter(e => {
        const st = getComputedStyle(e);
        return /auto|scroll/.test(st.overflowY) && e.scrollHeight > e.clientHeight + 2; }).map(e => e.className)};
    R.jsFehler = (window.__nlFehler || []).slice(0, 4);
  } catch (e) { R.fehler = String(e && e.stack ? e.stack : e); }
  return R;
})()
"""

ordner = HIER / "Nachweise" / "experten" / "_profil-menuefix"


def lauf(breite: int, hoehe: int, name: str) -> dict:
    p = subprocess.Popen(
        [str(browser()), "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
         "--disable-sync", "--disable-extensions", "--disable-component-update", "--no-service-autorun",
         "--disable-background-networking", f"--window-size={breite},{hoehe}",
         f"--remote-debugging-port={PORT}", f"--user-data-dir={ordner}-{name}", "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        ws = WS(warte_auf_port(PORT))
        ws.fehler = []
        ws.rufen("Runtime.enable")
        ws.rufen("Page.enable")
        ws.rufen("Emulation.setDeviceMetricsOverride",
                 {"width": breite, "height": hoehe, "deviceScaleFactor": 1.0, "mobile": False,
                  "screenWidth": breite, "screenHeight": hoehe})
        ws.rufen("Page.navigate", {"url": (HIER / "docs" / "index.html").as_uri()})
        time.sleep(2.8)
        for _ in range(30):
            r = ws.rufen("Runtime.evaluate", {"expression": "document.getElementById('app')?.children.length || 0", "returnByValue": True})
            if (r.get("result", {}).get("value") or 0) > 0:
                break
            time.sleep(0.5)
        r = ws.rufen("Runtime.evaluate", {"expression": SKRIPT, "awaitPromise": True, "returnByValue": True})
        if "exceptionDetails" in r:
            return {"fehler": json.dumps(r["exceptionDetails"], ensure_ascii=False)[:400]}
        return r["result"]["value"]
    finally:
        p.terminate()
        try:
            p.wait(timeout=15)
        except subprocess.TimeoutExpired:
            p.kill()
        shutil.rmtree(f"{ordner}-{name}", ignore_errors=True)


def main() -> int:
    fehler = 0
    for breite, hoehe, name in ((1280, 800, "1280"), (720, 640, "720")):
        d = lauf(breite, hoehe, name)
        print(f"\n=== {breite} × {hoehe} ===")
        m = d.get("menue") or {}
        print(f"1 Menü 26 Einträge: {m.get('masse')}  ganz im Bild: {m.get('drin')}  "
              f"Überstand unten: {m.get('ueberstandUnten')} px")
        if m.get("drin") is False:
            fehler += 1
            print("   ✗ Befund 5 NICHT behoben")
        t = d.get("terminal") or {}
        print(f"2 Terminal: Sitzungen {d.get('terminalSitzungen')}, {t.get('anzahl')} Reiter, "
              f"Leiste {t.get('leiste')}, Überlauf {t.get('ueberlauf')}")
        for tab in t.get("tabs", []):
            print(f"   {tab['text']:<20} {tab['masse']}  aktiv: {tab['aktiv']}  "
                  f"ganz im Scrollfenster: {tab['ganzImScrollfenster']}  Mitte getroffen: {tab['mitteGetroffen']}")
        print(f"   Rollbalken: {d.get('terminalRollbalken')}")
        aktiv = [x for x in t.get("tabs", []) if x.get("aktiv")]
        if len(aktiv) != 1 or not (aktiv[0].get("mitteGetroffen") and aktiv[0].get("ganzImScrollfenster")):
            fehler += 1
            print("   ✗ Befund 4 NICHT behoben (aktiver Reiter nicht ganz sichtbar/treffbar)")
        if (d.get("terminalRollbalken") or {}).get("scrollbarWidth") == "none":
            fehler += 1
            print("   ✗ Rollbalken weiterhin versteckt — der Überlauf ist nicht auffindbar")
        mp = d.get("mappe") or {}
        print(f"3 Mappe: {mp.get('da')}, .am-inhalt {mp.get('inhalt')}")
        print(f"   .am-plan {mp.get('plan')}")
        print(f"   Scrollbereiche in der Mappe: {mp.get('anzahlScrollbereiche')}")
        if (mp.get("plan") or {}).get("eigenerBildlauf"):
            fehler += 1
            print("   ✗ Befund 6 NICHT behoben")
        if len(mp.get("anzahlScrollbereiche") or []) > 1:
            fehler += 1
            print("   ✗ immer noch mehr als ein scrollender Bereich")
        if d.get("jsFehler"):
            print(f"   ✗ JS-Fehler: {d['jsFehler']}")
            fehler += 1
        if d.get("fehler"):
            print(f"   ✗ Abbruch: {d['fehler'][:200]}")
            fehler += 1
    print(f"\n{'GRÜN: alle drei Befunde behoben' if not fehler else f'ROT: {fehler} Verletzung(en)'}")
    return 1 if fehler else 0


if __name__ == "__main__":
    raise SystemExit(main())
