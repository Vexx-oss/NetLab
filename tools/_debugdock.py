"""Kurzprobe: Was passiert mit dem Dock-Blatt, wenn es eingeklappt ist?

Befund von „mobil-verifier“ (Bericht audit-android.md): Das eingeklappte Blatt bleibt
412 × 520 px groß und deckend über der Leinwand, und vier Rückwege sollen nicht
zurückführen. Diese Probe misst den Zustand und JEDEN Rückweg einzeln.

  python Nachweise/experten/_debugdock.py
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
QUELLE = HIER / "android" / "bau" / "assets" / "index.html"
PORT = 9535

skript = r"""
(async () => {
  const warte = ms => new Promise(r => setTimeout(r, ms));
  const R = {schritte: []};
  const notiz = (k, v) => R.schritte.push({k, v});
  const kb = e => { if (!e) return null; const b = e.getBoundingClientRect();
    return {x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height)}; };
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
  const zustand = () => {
    const dock = document.querySelector('.lb-dock');
    const reiter = [...document.querySelectorAll('.lb-dock-tab')];
    const kinder = [...document.querySelectorAll('.lb-dock-inhalt > *')].filter(sichtbar).map(k => k.className);
    return {dock: kb(dock), dockSichtbar: sichtbar(dock), reiterText: reiter.map(t => t.textContent.trim()),
            reiterAn: reiter.filter(t => t.classList.contains('an')).length, inhaltSichtbar: kinder,
            dockZuKlasse: !!(document.querySelector('.labor') && document.querySelector('.labor').classList.contains('dock-zu'))};
  };
  try {
    UI.app.ansicht('labor'); await warte(600);
    const fab = document.querySelector('.nl-fab-dock');
    notiz('fabVorhanden', !!fab);
    if (fab) { fab.click(); await warte(600); }
    notiz('A_offen', zustand());

    /* Rückweg 1: Einklapp-Knopf im Reiterstreifen */
    const klapp = document.querySelector('.lb-dock-einklappen');
    notiz('einklappKnopfVorhanden', !!klapp);
    if (klapp) { klapp.click(); await warte(600); }
    notiz('B_eingeklappt', zustand());
    const reiterTextEingeklappt = [...document.querySelectorAll('.lb-dock-tab')].map(t => t.textContent.trim());
    notiz('C_nullTextImReiterstreifen', reiterTextEingeklappt.some(t => t === 'null'));
    notiz('C_reiterstreifenKinder', [...document.querySelectorAll('.lb-dock-reiter > *')].map(k => ({
      tag: k.tagName, klasse: k.className, text: (k.textContent || '').slice(0, 20)})));

    /* Rückweg 1: den eingeklappten Reiter antippen */
    const tab1 = document.querySelector('.lb-dock-tab');
    if (tab1) { tab1.click(); await warte(600); }
    notiz('D_nachReiterTippen', zustand());
    const fabNachOeffnen = document.querySelector('.nl-fab-dock');
    notiz('J_fabNachWiederOeffnen', {vorhanden: !!fabNachOeffnen, sichtbar: sichtbar(fabNachOeffnen)});

    /* Rückweg 2: der Dock-Knopf */
    if (fab) { fab.click(); await warte(600); }
    notiz('E_nachDockKnopfKlick', zustand());

    /* Rückweg 3: der Griff */
    const griff = document.querySelector('.nl-griff');
    notiz('griffVorhanden', !!griff);
    if (griff) { griff.click(); await warte(600); }
    notiz('F_nachGriffKlick', zustand());

    /* Rückweg 4: Ansicht wechseln und zurück */
    const heute = [...document.querySelectorAll('[data-ansicht]')].find(b => b.dataset.ansicht !== 'labor' && sichtbar(b));
    if (heute) { heute.click(); await warte(700); }
    const labor = [...document.querySelectorAll('[data-ansicht="labor"]')].filter(sichtbar)[0];
    if (labor) { labor.click(); await warte(700); }
    notiz('G_nachAnsichtwechsel', zustand());

    /* Rückweg 5: liegt das Blatt über den schwebenden Knöpfen? */
    const treffer = [];
    for (const k of [...document.querySelectorAll('.nl-fab, .lb-leiste-oben button, .lb-leiste-unten button')].filter(sichtbar)) {
      const b = k.getBoundingClientRect();
      const p = document.elementFromPoint(Math.round(b.left + b.width / 2), Math.round(b.top + b.height / 2));
      treffer.push({knopf: (k.getAttribute('aria-label') || k.textContent || '').trim().slice(0, 24),
                    trifftSichSelbst: !!p && (p === k || k.contains(p)), darueber: p ? (p.className || p.tagName) : null});
    }
    notiz('H_trefferprobe', treffer);

    /* FAB bei offenem Blatt: er liegt dann unter dem Blatt und darf nicht als toter
       Knopf stehenbleiben. Gemessen wird: sichtbar? (nach der Reparatur: nein) und
       trifft er sich selbst? */
    const fabJetzt = document.querySelector('.nl-fab-dock');
    notiz('I_fabBeiOffenemBlatt', {imDom: !!fabJetzt, sichtbar: sichtbar(fabJetzt),
      display: fabJetzt ? getComputedStyle(fabJetzt).display : null});
    if (fabJetzt && sichtbar(fabJetzt)) {
      const b = fabJetzt.getBoundingClientRect();
      const p = document.elementFromPoint(Math.round(b.left + b.width / 2), Math.round(b.top + b.height / 2));
      notiz('I_fabTreffer', {trifftSichSelbst: !!p && (p === fabJetzt || fabJetzt.contains(p)),
                             darueber: p ? (p.className || p.tagName) : null});
    }
    const fabOeffnen = document.querySelector('.nl-fab-dock');
    notiz('J_fabNachWiederOeffnen', {vorhanden: !!fabOeffnen, sichtbar: sichtbar(fabOeffnen)});
  } catch (e) { R.fehler = String(e && e.stack ? e.stack : e); }
  return R;
})()
"""

ordner = HIER / "Nachweise" / "experten" / "_debugprofil5"
p = subprocess.Popen(
    [str(browser()), "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
     "--disable-sync", "--disable-extensions", "--disable-component-update", "--no-service-autorun",
     "--disable-background-networking", "--window-size=412,915",
     f"--remote-debugging-port={PORT}", f"--user-data-dir={ordner}", "about:blank"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    ws = WS(warte_auf_port(PORT))
    ws.fehler = []
    ws.rufen("Runtime.enable")
    ws.rufen("Page.enable")
    ws.rufen("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    ws.rufen("Emulation.setDeviceMetricsOverride", {"width": 412, "height": 915, "deviceScaleFactor": 2.625,
                                                    "mobile": True, "screenWidth": 412, "screenHeight": 915,
                                                    "screenOrientation": {"type": "portraitPrimary", "angle": 0}})
    ws.rufen("Page.navigate", {"url": QUELLE.as_uri()})
    time.sleep(2.8)
    for _ in range(30):
        r = ws.rufen("Runtime.evaluate", {"expression": "document.getElementById('app')?.children.length || 0", "returnByValue": True})
        if (r.get("result", {}).get("value") or 0) > 0:
            break
        time.sleep(0.5)
    r = ws.rufen("Runtime.evaluate", {"expression": skript, "awaitPromise": True, "returnByValue": True})
    if "exceptionDetails" in r:
        print("JS-FEHLER:", json.dumps(r["exceptionDetails"], ensure_ascii=False)[:600])
    print(json.dumps(r["result"]["value"], ensure_ascii=False, indent=1))
finally:
    p.terminate()
    try:
        p.wait(timeout=15)
    except subprocess.TimeoutExpired:
        p.kill()
    shutil.rmtree(ordner, ignore_errors=True)
