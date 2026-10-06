"""Menüprobe: die TIEFER GENESTETEN Menüs der Oberfläche in einem echten Browser vermessen.

  python tools/menueprobe.py                                  # docs/index.html, Profil telefon-hoch
  python tools/menueprobe.py --lauf                           # alle vier Profile
  python tools/menueprobe.py --datei android/bau/assets/index.html --lauf
  python tools/menueprobe.py --json Datei.json --bild-ordner Nachweise/experten/bilder

Warum es dieses Werkzeug gibt: `tools/rauch.py` prüft die Ansichten in Schreibtischbreiten,
`android/werkzeuge/mobilprobe.py` prüft die Telefon-Anordnung — beide steigen in die tieferen
Menüebenen aber nur bis zum ersten Fach. Genau dort sind Fehler zu erwarten, weil jede Ebene
ihre eigene Positionierung, ihr eigenes Schließen und ihre eigene Ebene im Stapel mitbringt:

  1 Geräteblatt/Leiste → 2 Kategorie-Fach → 3 Gerät gewählt → 4 Popover „Gerät hier einsetzen“
  5 Kopf-⋯-Menü → 6 Dialog daraus → 7 Ansicht-Menü → 8 Zoom-Menü → 9 Dock-Blatt →
  10 Dock-Reiter/Inhalt → 11 Auftrags-⋯-Menü („Ticket“)

Gemessen wird je Ebene: Rechteck, liegt sie ganz im Bild, ist sie in einem scrollenden
Behälter eingesperrt (also sichtbar abgeschnitten), Trefferflächen unter 44 px, Überlauf,
Überdeckung durch eine spätere Ebene, und der Zustandsapparat (Escape, Klick daneben,
nacheinander öffnen). Rückgabewert 1, sobald ein Kriterium verletzt ist.

Es wird ausschließlich der Browser beendet, den dieses Werkzeug selbst gestartet hat
(AGENTS.md Regel 1). Alles nutzt die vorhandenen Bausteine aus tools/starttest.py.
"""
import argparse
import base64
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from starttest import FEHLERSAMMLER, WS, browser, warte_auf_port  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
HIER = Path(__file__).resolve().parent.parent

PROFILE = {
    "telefon-hoch": (412, 915, 2.625, "portraitPrimary", True),
    "telefon-quer": (915, 412, 2.625, "landscapePrimary", True),
    "klein-hoch": (360, 640, 3.0, "portraitPrimary", True),
    "tablet-hoch": (800, 1280, 2.0, "portraitPrimary", True),
    "schreibtisch": (1366, 768, 1.0, "portraitPrimary", False),
}

# ---------------------------------------------------------------- Messskript (läuft im Browser)
MESSUNG = r"""
(async () => {
  const R = n => Math.round(n);
  const kb = e => { const b = e.getBoundingClientRect();
    return {x: R(b.x), y: R(b.y), w: R(b.width), h: R(b.height), r: R(b.right), u: R(b.bottom)}; };
  const kl = e => (e.getAttribute('class') || '').trim();
  const txt = e => (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 44);
  const warte = ms => new Promise(r => setTimeout(r, ms));
  const sichtbar = e => {
    if (!e || e.nodeType !== 1) return false;
    const b = e.getBoundingClientRect();
    if (b.width <= 0 || b.height <= 0) return false;
    for (let k = e; k && k.nodeType === 1; k = k.parentElement) {
      const st = getComputedStyle(k);
      if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0) return false;
    }
    return true;
  };
  /* Maßstab ist der BILDSCHIRM, nicht das Layout-Fenster. Unter Geräte-Emulation gilt
     „shrink to fit": `innerWidth` ist dann größer als die Anzeige — gemessen hier 569 bei
     412 px Soll (Faktor 1,38), dieselbe Beobachtung steht in mobilprobe.py (innerWidth 494
     auf einem 412er Bildschirm). Das Spiel positioniert Menüs zwar mit `innerWidth`
     (src/ui/editor-werkzeuge.js:36-37), sichtbar ist aber die Anzeige: nur was innerhalb von
     visualViewport liegt, sieht der Nutzer. Geprüft wird deshalb gegen die Anzeige; die
     innerWidth-Werte werden zum Vergleich mitberichtet. */
  const vv = window.visualViewport;
  const VX = vv ? R(vv.offsetLeft) : 0, VY = vv ? R(vv.offsetTop) : 0;
  const BW = vv ? R(vv.width) : R(document.documentElement.clientWidth);
  const BH = vv ? R(vv.height) : R(document.documentElement.clientHeight);
  const drin = e => { const b = e.getBoundingClientRect();
    return b.left - VX >= -2 && b.right - VX <= BW + 2 && b.top - VY >= -2 && b.bottom - VY <= BH + 2; };
  /* Eingesperrt = liegt in einem Vorfahren mit overflow auto/scroll/hidden, über dessen
     Innenkante hinaus. WICHTIG für die Bewertung: `hidden` heißt „absichtlich beschnitten“
     (z. B. das Geräteblatt schneidet seine Umgebung ab) — erst `auto`/`scroll` heißt
     „der Nutzer kommt nicht heran“, weil dort auch kein Bildlauf hinführt. */
  const eingesperrt = e => {
    const b = e.getBoundingClientRect();
    for (let k = e.parentElement; k && k.nodeType === 1; k = k.parentElement) {
      const st = getComputedStyle(k);
      if (!/auto|scroll|hidden|clip/.test(st.overflowX + st.overflowY)) continue;
      const s = k.getBoundingClientRect();
      const kanten = {links: b.left < s.left - 2, rechts: b.right > s.right + 2,
                      oben: b.top < s.top - 2, unten: b.bottom > s.bottom + 2};
      if (kanten.links || kanten.rechts || kanten.oben || kanten.unten)
        return {behaelter: kl(k) || k.tagName, kanten,
                rollbar: /auto|scroll/.test(st.overflowX + st.overflowY),
                ueberstandRechts: R(Math.max(0, b.right - s.right)),
                ueberstandUnten: R(Math.max(0, b.bottom - s.bottom)), behaelterMasse: kb(k)};
    }
    return null;
  };
  const knoepfe = w => [...w.querySelectorAll('button, [role="button"], [role="menuitem"], [role="tab"]')].filter(sichtbar);
  /* Ist das Element aus seinem Bildbereich heraus erreichbar? Ein Knopf unterhalb des
     sichtbaren Bereichs IN einem scrollenden Behälter ist kein Fehler — der Nutzer scrollt
     hin. Nicht erreichbar ist er nur, wenn kein Vorfahre scrollen kann. */
  const erreichbar = e => {
    for (let k = e.parentElement; k && k.nodeType === 1; k = k.parentElement) {
      const st = getComputedStyle(k);
      if (/auto|scroll/.test(st.overflowY) && k.scrollHeight > k.clientHeight + 2) return true;
      if (/auto|scroll/.test(st.overflowX) && k.scrollWidth > k.clientWidth + 2) return true;
    }
    return false;
  };
  const ebene = (nr, name, auswahl) => {
    const el = typeof auswahl === 'string' ? document.querySelector(auswahl) : auswahl;
    if (!el || !sichtbar(el)) return {nr, name, offen: false};
    const k = knoepfe(el);
    const b = el.getBoundingClientRect();
    /* Liegt eine SPÄTER im DOM stehende, sichtbare Ebene über der Mitte dieser Ebene? */
    let verdecktVon = null;
    const mitte = document.elementFromPoint(R(b.left + b.width / 2), R(b.top + b.height / 2));
    if (mitte && mitte !== el && !el.contains(mitte) && !mitte.contains(el)) {
      const lage = knoepfe(document.body).filter(x => x === mitte || mitte.contains(x));
      verdecktVon = {tag: mitte.tagName, klasse: kl(mitte), text: txt(mitte),
                     zindex: getComputedStyle(mitte).zIndex, ueberEchtemKnopf: lage.length > 0};
    }
    return {nr, name, offen: true, klasse: kl(el), masse: kb(el), drin: drin(el),
      abgeschnitten: eingesperrt(el),
      ueberlauf: {x: R(el.scrollWidth - el.clientWidth), y: R(el.scrollHeight - el.clientHeight)},
      knoepfe: k.length, verdecktVon,
      zuKlein: k.filter(x => { const r = x.getBoundingClientRect(); return r.width < 44 || r.height < 44; })
               .map(x => ({text: txt(x), w: R(x.getBoundingClientRect().width), h: R(x.getBoundingClientRect().height)})),
      ausserhalb: k.filter(x => !drin(x)).map(x => ({text: txt(x), masse: kb(x), erreichbar: erreichbar(x)})),
      unerreichbar: k.filter(x => !drin(x) && !erreichbar(x)).map(x => ({text: txt(x), masse: kb(x)}))};
  };
  const stand = () => ({
    menues: [...document.querySelectorAll('.menue')].filter(sichtbar).map(e => ({klasse: kl(e), masse: kb(e)})),
    faecher: [...document.querySelectorAll('.pa-fach')].filter(sichtbar).length,
    dialoge: [...document.querySelectorAll('.dialog-huelle, .sp-overlay, .pal-huelle')].filter(sichtbar).length,
    blattGeraete: document.documentElement.classList.contains('nl-geraete-auf')});
  /* Escape MUSS vom fokussierten Element kommen: das Spiel hängt seinen Tastenhörer an das
     Menüelement selbst (src/ui/editor-werkzeuge.js:24), und ein Ereignis, das direkt am
     `document` ausgelöst wird, läuft nicht durch die Nachfahren — es erreicht das Menü nie.
     Gemessen 06.10.2026: `document.dispatchEvent(...)` ließ das Menü offen, ein Ereignis vom
     fokussierten Menüpunkt schloss es. */
  const esc = async () => {
    const ziel = document.activeElement || document.body;
    ziel.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
    await warte(160);
    if (document.querySelector('.menue')) {
      document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
      await warte(240);
    }
  };
  const daneben = async () => { document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, clientX: 2, clientY: 2}));
                               document.body.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, clientX: 2, clientY: 2})); await warte(240); };
  const aus = {breite: BW, hoehe: BH, anzeige: VX === 0 && VY === 0 ? "deckungsgleich" : `verschoben um ${VX}/${VY}`,
               innerBreite: R(innerWidth), innerHoehe: R(innerHeight),
               layoutBreite: R(document.documentElement.clientWidth),
               grob: matchMedia('(pointer: coarse)').matches, ebenen: [], fehler: [], notizen: []};

  try {
    if (typeof UI === 'undefined' || !UI.app) { aus.fehler.push('kein UI'); return aus; }
    /* Freies Labor über die Spiel-APIs: ohne Ticket, aber mit Geräteleiste und Werkzeugen. */
    UI.app.ansicht('labor'); await warte(500);
    try { UI.sandbox && UI.sandbox.laden && UI.sandbox.laden(); } catch (e) { aus.notizen.push('sandbox.laden: ' + e); }
    await warte(700);
    try { UI.labor.einpassen(false); } catch (e) {}
    aus.netz = (() => { try { return {geraete: Object.keys(UI.labor.netz.geraete).length, kabel: UI.labor.netz.kabel.length}; }
                        catch (e) { return null; } })();

    /* --- 1. Geräteblatt --- */
    let oeffnerG = [...document.querySelectorAll('.nl-fab-geraete')].filter(sichtbar)[0] || null;
    let standalone = false;
    if (oeffnerG) { oeffnerG.click(); await warte(420); }
    else { standalone = [...document.querySelectorAll('.pa-kat')].filter(sichtbar).length > 0; }
    aus.geraeteOeffner = oeffnerG ? {klasse: kl(oeffnerG), masse: kb(oeffnerG)} : null;
    aus.ebenen.push(Object.assign(ebene(1, standalone ? 'Geräteleiste (ohne Blatt)' : 'Geräteblatt', '.lb-geraete'),
                                  {oeffnerGefunden: !!oeffnerG, standalone}));

    /* --- 2. Kategorie-Fach --- */
    const kat = [...document.querySelectorAll('.pa-kat')].filter(sichtbar)[0];
    if (!kat) aus.fehler.push('keine .pa-kat sichtbar');
    else {
      kat.click(); await warte(420);
      aus.ebenen.push(Object.assign(ebene(2, 'Kategorie-Fach', '.pa-fach'),
        {fachKnoepfe: knoepfe(document.querySelector('.pa-fach') || document.body).map(txt).slice(0, 20)}));

      /* --- 3. Gerät wählen (Werkzeug „platzieren“) --- */
      const teil = [...document.querySelectorAll('.pa-fach .pa-teil')].filter(sichtbar)[0];
      if (teil) {
        teil.click(); await warte(340);
        aus.ebenen.push(Object.assign(ebene(3, 'Fach nach Gerätewahl', '.pa-fach'),
          {werkzeug: (() => { try { return UI.labor.werkzeug(); } catch (e) { return null; } })()}));
        aus.nachWahl = stand();

        /* --- 4. Auf der Fläche ablegen → Gerät gesetzt; dann Rechtsklick = Kontextmenü --- */
        const flaeche = document.querySelector('.lb-svg') || document.querySelector('.lb-leinwand');
        if (flaeche) {
          const r = flaeche.getBoundingClientRect();
          const x = R(r.left + r.width * 0.42), y = R(r.top + r.height * 0.55);
          flaeche.dispatchEvent(new MouseEvent('pointerdown', {clientX: x, clientY: y, bubbles: true, button: 0, buttons: 1}));
          flaeche.dispatchEvent(new MouseEvent('pointerup', {clientX: x, clientY: y, bubbles: true, button: 0}));
          await warte(420);
          aus.gesetzt = (() => { try { return Object.keys(UI.labor.netz.geraete).length; } catch (e) { return null; } })();

          /* Kontextmenü eines Geräts: echtes contextmenu-Ereignis auf dem Gerät. */
          const gruppe = [...document.querySelectorAll('.lb-svg g[data-id]')].pop();
          if (gruppe) {
            const gb = gruppe.getBoundingClientRect();
            const gx = R(gb.left + gb.width / 2), gy = R(gb.top + gb.height / 2);
            gruppe.dispatchEvent(new MouseEvent('contextmenu', {clientX: gx, clientY: gy, bubbles: true, button: 2}));
            await warte(360);
            aus.ebenen.push(ebene(4, 'Kontextmenü eines Geräts', '.menue:not(.popover)'));
            aus.kontextZiele = [...document.querySelectorAll('.menue:not(.popover) .menue-punkt')].filter(sichtbar).map(txt);
            /* Port-Eintrag öffnet ein zweites Menü — das ist die tiefste Stelle im Netz. */
            const portPunkt = [...document.querySelectorAll('.menue .menue-punkt')].filter(sichtbar)
              .find(b => /port/i.test(txt(b)));
            if (portPunkt) {
              portPunkt.click(); await warte(380);
              aus.ebenen.push(ebene(5, 'Port-Menü (zweite Menüebene)', '.menue-ports, .menue'));
            } else { await esc(); }
          }
        }
      } else aus.fehler.push('kein .pa-teil im Fach sichtbar');
      const zu = [...document.querySelectorAll('.pa-zu')].filter(sichtbar)[0];
      if (zu) { zu.click(); await warte(280); }
    }
    await esc();
    aus.nachFach = stand();

    /* --- 6. Kopf-⋯-Menü --- */
    const mehr = [...document.querySelectorAll('.nl-mehr')].filter(sichtbar)[0] || null;
    if (mehr) {
      mehr.click(); await warte(380);
      aus.ebenen.push(Object.assign(ebene(6, 'Kopf-⋯-Menü', '.nl-menue'),
        {ziele: [...document.querySelectorAll('.nl-menue .menue-punkt')].filter(sichtbar).map(txt)}));
      const p = [...document.querySelectorAll('.nl-menue .menue-punkt')].filter(sichtbar).find(b => /Einstellung/i.test(txt(b)));
      if (p) {
        p.click(); await warte(560);
        aus.ebenen.push(ebene(7, 'Dialog aus dem ⋯-Menü', '.dialog-huelle, .sp-overlay'));
        aus.nachDialog = stand();
        /* Schließen: das × im Dialogkopf, sonst Escape, sonst Klick daneben. */
        const zuKnopf = [...document.querySelectorAll('.dialog-huelle .dialog-zu, .dialog-huelle [aria-label*="chlie"], '
          + '.sp-overlay .sp-zu, .sp-overlay [aria-label*="chlie"]')].filter(sichtbar)[0];
        if (zuKnopf) { zuKnopf.click(); await warte(420); }
        if (stand().dialoge) { await esc(); }
        if (stand().dialoge) { await daneben(); }
        aus.nachDialogZu = stand();
        aus.dialogSchliesser = zuKnopf ? txt(zuKnopf) : null;
      } else { await esc(); }
    } else aus.notizen.push('kein .nl-mehr sichtbar (Querformat blendet es aus — gewollt)');

    /* --- 8. Ansicht- und Zoom-Menü --- */
    const ansicht = [...document.querySelectorAll('.lb-ansicht')].filter(sichtbar)[0];
    if (ansicht) {
      ansicht.click(); await warte(340);
      aus.ebenen.push(Object.assign(ebene(8, 'Ansicht-Menü', '.menue:not(.popover)'),
        {ziele: [...document.querySelectorAll('.menue:not(.popover) .menue-punkt')].filter(sichtbar).map(txt)}));
      await esc();
      aus.nachEscapeAnsicht = stand();
      if (!aus.nachEscapeAnsicht.menues.length) {
        ansicht.click(); await warte(300); await daneben(); aus.nachKlickDaneben = stand();
      }
    } else aus.fehler.push('kein .lb-ansicht sichtbar');
    const zoom = [...document.querySelectorAll('.lb-zoomtext')].filter(sichtbar)[0];
    if (zoom) {
      zoom.click(); await warte(340);
      aus.ebenen.push(ebene(9, 'Zoom-Menü', '.menue:not(.popover)'));
      await esc();
    }

    /* --- 10. Dock-Blatt und Reiter ---
       Achtung Reihenfolge: ein Klick auf den Reiter des BEREITS offenen Bereichs klappt ihn
       ein (src/ui/editor.js:156 — `onclick: () => an ? dockZu() : dockZeigen(r.id)`).
       Der Zustand muss deshalb NACH dem Klick gemessen werden, sonst misst man das Zuklappen
       als leeren Inhalt. */
    const fabDock = [...document.querySelectorAll('.nl-fab-dock')].filter(sichtbar)[0] || null;
    let reiterJetzt = [...document.querySelectorAll('.lb-dock-tab')].filter(sichtbar);
    aus.reiterVorOeffnen = reiterJetzt.map(t => txt(t));
    if (reiterJetzt.length === 0 && fabDock) { fabDock.click(); await warte(520); reiterJetzt = [...document.querySelectorAll('.lb-dock-tab')].filter(sichtbar); }
    aus.ebenen.push(Object.assign(ebene(10, 'Dock-Blatt', '.lb-dock'), {oeffner: fabDock ? kl(fabDock) : null}));
    aus.reiter = [];
    aus.dockSpur = [];
    for (const t of reiterJetzt) {
      const vorher = {dockSichtbar: sichtbar(document.querySelector('.lb-dock')), tabAn: t.classList.contains('an')};
      /* Den Reiter des BEREITS offenen Bereichs NICHT anklicken: das ist laut
         src/ui/editor.js:156 der Schalter zum Einklappen (`an ? dockZu() : dockZeigen(id)`) —
         ein Klick misst dann das Zuklappen, nicht den Inhalt. Nur inaktive Reiter klicken;
         ist der gesuchte Bereich schon offen, wird er unmittelbar gemessen. */
      let alleKinder = [...document.querySelectorAll('.lb-dock-inhalt > *')];
      let inhalt = (vorher.tabAn ? alleKinder.filter(sichtbar)[0] : null) || null;
      let geklickt = false;
      if (!inhalt) {
        t.click(); geklickt = true; await warte(380);
        /* Nach dem Klick kann der Reiterknoten ersetzt sein (layoutAnwenden baut die Reiter neu) —
           deshalb für einen zweiten Versuch frisch suchen, nie den alten Knoten erneut klicken. */
        if (![...document.querySelectorAll('.lb-dock-inhalt > *')].some(sichtbar)) {
          const frisch = [...document.querySelectorAll('.lb-dock-tab')].filter(sichtbar)
            .find(x => !x.classList.contains('an'));
          if (frisch) { frisch.click(); await warte(380); }
        }
      }
      alleKinder = [...document.querySelectorAll('.lb-dock-inhalt > *')];
      inhalt = alleKinder.filter(sichtbar)[0] || null;
      aus.dockSpur.push({name: txt(t), vorher, geklickt,
                         offeneKinder: alleKinder.filter(k => !k.hasAttribute('hidden')).map(k => kl(k)),
                         nachher: {dockSichtbar: sichtbar(document.querySelector('.lb-dock')),
                                   inhalt: inhalt ? kl(inhalt) : null}});
      aus.reiter.push({name: txt(t), inhalt: inhalt ? kl(inhalt) : null, masse: inhalt ? kb(inhalt) : null,
        drin: inhalt ? drin(inhalt) : null, abgeschnitten: inhalt ? eingesperrt(inhalt) : null,
        ueberlauf: inhalt ? {x: R(inhalt.scrollWidth - inhalt.clientWidth), y: R(inhalt.scrollHeight - inhalt.clientHeight)} : null,
        knoepfe: inhalt ? knoepfe(inhalt).length : 0,
        zuKlein: inhalt ? knoepfe(inhalt).filter(x => { const r = x.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).length : 0,
        /* Wenn kein Inhalt sichtbar ist: warum? Das macht den Unterschied zwischen „leer,
           weil nichts gewählt ist“ und „Reiter zeigt wirklich nichts an“. */
        kinder: alleKinder.map(k => ({klasse: kl(k), hidden: k.hasAttribute('hidden'), masse: kb(k),
                                      sichtbar: sichtbar(k),
                                      text: (k.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60)}))});
    }
    aus.ebenen.push(ebene(11, 'Dock-Inhalt (letzter Reiter)', '.lb-dock-inhalt'));
    /* Dock wieder schließen: den Schließen-Knopf nehmen, sonst den Öffner. */
    const einklappen = [...document.querySelectorAll('.lb-dock-einklappen')].filter(sichtbar)[0];
    if (einklappen) { einklappen.click(); await warte(340); }
    else if (fabDock && sichtbar(document.querySelector('.lb-dock'))) { fabDock.click(); await warte(340); }

    /* --- 12. Auftrags-⋯-Menü („Ticket“) und die Auftragsmappe --- */
    const amMehr = [...document.querySelectorAll('.am-mehr')].filter(sichtbar)[0] || null;
    if (amMehr) {
      amMehr.click(); await warte(380);
      aus.ebenen.push(Object.assign(ebene(12, 'Auftrags-⋯ („Ticket“)', '.menue:not(.popover)'),
        {ziele: [...document.querySelectorAll('.menue:not(.popover) .menue-punkt')].filter(sichtbar).map(txt)}));
      await esc();
      aus.nachEscapeTicket = stand();
    } else aus.notizen.push('kein .am-mehr sichtbar (kein Auftrag geladen — für die Menüprobe nicht nötig)');

    /* --- 13. Auftragsmappe: verdeckt sie die Werkzeugleiste? ---
       Die Mappe hat `z-index:30` INNERHALB von `.lb-auftrag` (z-index:5); die
       Werkzeugleiste liegt in `.lb-leinwand` ohne eigene Ebene in einem anderen Zweig
       desselben Rasters. Ohne z-index an der Leiste treffen ihre Knöpfe auf die Mappe.
       Gemessen von „menu-auditor“ am 06.10.2026: alle vier Knöpfe der oberen Leiste
       trafen `div.am-reiter`/`button.am-tab`, der Klick auf „Ansicht“ öffnete nichts.
       Weg wie beim Nutzer: der Knopf „Auftrag lesen“ (`.am-lesen`) öffnet die Mappe.
       Geprüft wird mit `elementFromPoint` auf der Knopfmitte — trifft der Knopf sich
       selbst (oder ein Kind von ihm), ist er bedienbar. */
    /* Weg wie beim Nutzer ist der Knopf „Auftrag lesen“ (`.am-lesen`); damit die Messung
       nicht davon abhängt, ob der Auftrag gerade in einem anderen Reiter steht, wird
       dieselbe Spiel-API benutzt, die der Knopf aufruft (src/ui/spiel.js:117-118, 862).
       Im FREIEN LABOR (`.auftrag-sandbox`) gibt es keine Mappe — dann wird die Ebene
       ausgelassen und das ehrlich vermerkt, statt sie als Fehler zu zählen. */
    const lesen = [...document.querySelectorAll('.am-lesen')].filter(sichtbar)[0] || null;
    const hatMappe = () => !!document.querySelector('.am-mappe');
    if (lesen && !hatMappe()) { lesen.click(); await warte(450); }
    if (!hatMappe() && !document.querySelector('.auftrag-sandbox')) {
      try { UI.spiel.mappeAuf('brief'); } catch (e) { aus.notizen.push('mappeAuf: ' + e); }
      await warte(450);
    }
    const mappe = [...document.querySelectorAll('.am-mappe')].filter(sichtbar)[0] || null;
    aus.mappe = {gefunden: !!mappe, masse: mappe ? kb(mappe) : null, treffer: []};
    if (mappe) {
      for (const b of [...document.querySelectorAll('.lb-leiste-oben button, .lb-leiste-unten button')].filter(sichtbar)) {
        const r = b.getBoundingClientRect();
        const p = document.elementFromPoint(R(r.left + r.width / 2), R(r.top + r.height / 2));
        aus.mappe.treffer.push({text: txt(b), masse: kb(b),
          trifftSichSelbst: !!p && (p === b || b.contains(p)),
          darueber: p ? (kl(p) || p.tagName) : null});
      }
      /* Gegenprobe: öffnet ein Klick auf „Ansicht“ wirklich ein Menü? */
      const ansicht = [...document.querySelectorAll('.lb-ansicht')].filter(sichtbar)[0];
      if (ansicht) {
        const r = ansicht.getBoundingClientRect();
        const p = document.elementFromPoint(R(r.left + r.width / 2), R(r.top + r.height / 2));
        ansicht.click(); await warte(360);
        aus.mappe.ansichtMenueOeffnet = [...document.querySelectorAll('.menue')].filter(sichtbar).length > 0;
        aus.mappe.ansichtTreffer = p ? (kl(p) || p.tagName) : null;
        await esc();
      }
    } else aus.notizen.push('keine .am-mappe sichtbar (freies Labor ohne Auftragsmappe — Ebene 13 wird ausgelassen)');

    /* --- Was am Ende offen geblieben ist? --- */
    await esc();
    aus.endstand = stand();
    aus.jsFehler = (window.__nlFehler || []).slice(0, 6);
  } catch (e) { aus.fehler.push(String(e && e.stack ? e.stack : e)); }
  return aus;
})()
"""


# ---------------------------------------------------------------- Prüfungen

def pruefe(aus: dict) -> tuple[list, list, list]:
    """(gruen, rot, hinweise) — jedes Kriterium mit Namen und Messwert.

    Die 44-px-Regel gilt den FINGERN (Android-Richtlinie, `@media (pointer: coarse)` in
    mobil.css). Ein Profil ohne Berührung („schreibtisch“) wird mit Maus gemessen: dort
    ist ein 38 px hoher Menüpunkt kein Fehler, sondern wird als Hinweis geführt. Ehrlich
    bleibt es trotzdem: unter Geräte-Emulation meldet `matchMedia('(pointer: coarse)')`
    wahr, die mobilen Regeln greifen also wirklich."""
    grob = bool(aus.get("beruehrung"))
    gruen, rot, hinweise = [], [], []

    def satz(name, ok, wert):
        (gruen if ok else rot).append((name, wert))

    def zu_klein(e):
        if not grob:
            hinweise.append((f"Ebene {e['nr']} {e['name']}: {len(e['zuKlein'])} Knöpfe unter 44 px "
                             f"(Maus-Browser — die Fingerregel gilt hier nicht)", e["zuKlein"][:3]))
        else:
            rot.append((f"Ebene {e['nr']} {e['name']}: {len(e['zuKlein'])} Knöpfe unter 44 px", e["zuKlein"][:4]))

    def beschnitten(e):
        a = e.get("abgeschnitten")
        if not a:
            return
        ueber = max(a.get("ueberstandRechts", 0), a.get("ueberstandUnten", 0))
        if not ueber:
            for wert in (a.get("kanten") or {}).values():
                if wert:
                    ueber = 3      # nur „links/oben“ überstehend: Betrag steckt nicht im Messwert
                    break
        if a.get("rollbar") and ueber > 4:
            rot.append((f"Ebene {e['nr']} {e['name']}: Inhalt ragt aus dem scrollenden Behälter "
                        f"{a['behaelter']} (rechts {a['ueberstandRechts']} px, unten {a['ueberstandUnten']} px)", a))
        elif ueber > 4:
            hinweise.append((f"Ebene {e['nr']} {e['name']}: von {a['behaelter']} beschnitten "
                             f"(overflow hidden — mutmaßlich gewollt)", a.get("kanten")))
        else:
            hinweise.append((f"Ebene {e['nr']} {e['name']}: {ueber} px über die Kante von {a['behaelter']} — "
                             f"unter der Messschwelle, kein Befund", a.get("kanten")))

    for e in aus.get("ebenen", []):
        if not e.get("offen"):
            if e.get("nr") in (1, 2, 6, 8, 9, 10, 12) and not e.get("standalone"):
                rot.append((f"Ebene {e['nr']} {e['name']}: nicht geöffnet", "-"))
            continue
        satz(f"Ebene {e['nr']} {e['name']}: ganz im Bild", bool(e.get("drin")), e.get("masse"))
        beschnitten(e)
        if e.get("verdecktVon"):
            v = e["verdecktVon"]
            rot.append((f"Ebene {e['nr']} {e['name']}: verdeckt von {v['tag']}.{v['klasse']} (z-index {v['zindex']})", v))
        if e.get("zuKlein"):
            zu_klein(e)
        if e.get("unerreichbar"):
            rot.append((f"Ebene {e['nr']} {e['name']}: {len(e['unerreichbar'])} Knöpfe außerhalb des Bildes und "
                        f"nicht erscrollbar", e["unerreichbar"][:3]))
        elif e.get("ausserhalb"):
            hinweise.append((f"Ebene {e['nr']} {e['name']}: {len(e['ausserhalb'])} Knöpfe außerhalb des Bildes, "
                             f"aber im scrollenden Behälter erreichbar", [x["text"] for x in e["ausserhalb"][:3]]))
    if aus.get("jsFehler"):
        rot.append(("JS-Fehler", aus["jsFehler"]))
    if aus.get("fehler"):
        rot.append(("Fehler im Messskript", aus["fehler"]))
    if aus.get("endstand", {}).get("menues"):
        rot.append(("Am Ende ist noch ein Menü offen", aus["endstand"]["menues"]))
    if aus.get("endstand", {}).get("dialoge"):
        rot.append(("Am Ende ist noch ein Dialog offen", aus["endstand"]["dialoge"]))
    for r in aus.get("reiter", []):
        satz(f"Dock-Reiter „{r['name']}“: Inhalt da", bool(r.get("inhalt")), r.get("masse"))
        if r.get("abgeschnitten"):
            if r["abgeschnitten"].get("rollbar"):
                rot.append((f"Dock-Reiter „{r['name']}“: Inhalt ragt aus {r['abgeschnitten']['behaelter']}",
                            r["abgeschnitten"]))
            else:
                hinweise.append((f"Dock-Reiter „{r['name']}“: von {r['abgeschnitten']['behaelter']} beschnitten "
                                 f"(overflow hidden)", r["abgeschnitten"].get("kanten")))
        if r.get("zuKlein") and grob:
            rot.append((f"Dock-Reiter „{r['name']}“: {r['zuKlein']} Knöpfe unter 44 px", "-"))
    mappe = aus.get("mappe") or {}
    if mappe.get("gefunden"):
        verdeckt = [t for t in mappe.get("treffer", []) if not t.get("trifftSichSelbst")]
        if verdeckt:
            rot.append((f"Auftragsmappe verdeckt {len(verdeckt)} Knöpfe der Werkzeugleiste "
                        f"(Treffer landet auf {verdeckt[0].get('darueber')})", verdeckt[:4]))
        else:
            gruen.append(("Auftragsmappe: alle Knöpfe der Werkzeugleiste bleiben treffbar",
                          len(mappe.get("treffer", []))))
        if mappe.get("ansichtMenueOeffnet") is False:
            rot.append(("Auftragsmappe: Klick auf „Ansicht“ öffnet kein Menü", mappe.get("ansichtTreffer")))
    else:
        hinweise.append(("Auftragsmappe in diesem Zustand nicht offen (freies Labor) — Ebene 13 ausgelassen", "-"))
    return gruen, rot, hinweise


def js(ws, ausdruck, warten=True, versuche=1):
    for i in range(versuche):
        params = {"expression": ausdruck, "returnByValue": True}
        if warten:
            params["awaitPromise"] = True
        r = ws.rufen("Runtime.evaluate", params)
        if "exceptionDetails" not in r:
            return r.get("result", {}).get("value"), None
        d = r["exceptionDetails"]
        if i == versuche - 1:
            return None, ((d.get("exception", {}) or {}).get("description") or d.get("text") or "?")
        time.sleep(0.6)
    return None, "?"


def fenster_setzen(ws, breite: int, hoehe: int):
    """Das echte Fenster auf die Sollmaße ziehen (Bestätigung, nicht die einzige Quelle).

    Gemessen 06.10.2026: `Emulation.setDeviceMetricsOverride` allein genügt in dieser
    Edge-Fassung nicht immer — bei einem 1366×1280 großen Fenster kam für ein 412-px-Profil
    569 px innerWidth heraus (Verhältnis 1,38). Deshalb zusätzlich das Fenster setzen und in
    `messe_profil` gegenprüfen, ob die Fläche wirklich stimmt."""
    try:
        r = ws.rufen("Browser.getWindowForTarget")
        if r.get("windowId") is not None:
            ws.rufen("Browser.setWindowBounds",
                     {"windowId": r["windowId"], "bounds": {"width": breite, "height": hoehe}})
            return True
    except SystemExit:
        pass
    return False


def messe_profil(ws, datei: Path, name: str, breite: int, hoehe: int, dpr: float, ausrichtung: str,
                 beruehrung: bool = True) -> dict:
    # Das echte Fenster auf die Sollmaße ziehen, BEVOR die Emulation greift. Gemessen
    # 06.10.2026: bei einem 1366×1280 großen Fenster war die Anzeige 412×915, das Layout
    # aber 569×1264 — die Anzeige war also kleiner als das Layout, und der Kopf eines
    # zentrierten Dialogs lag außerhalb des sichtbaren Ausschnitts. Das ist dann ein
    # Messfehler, kein Befund. Nach dem Setzen des Fensters sind Anzeige und Layout gleich.
    fenster_setzen(ws, breite, hoehe)
    time.sleep(0.5)
    # `mobile: true` ist Pflicht: sonst setzt Edge die Seite wie am Schreibtisch um und
    # skaliert sie auf die Fensterbreite → man misst eine andere Seite als die auf dem Telefon.
    # Dieselbe Einstellung benutzt android/werkzeuge/mobilprobe.py, setze_masse().
    ws.rufen("Emulation.setDeviceMetricsOverride",
             {"width": breite, "height": hoehe, "deviceScaleFactor": dpr, "mobile": True,
              "screenWidth": breite, "screenHeight": hoehe,
              "screenOrientation": {"type": ausrichtung, "angle": 0 if ausrichtung == "portraitPrimary" else 90}})
    ws.rufen("Page.navigate", {"url": datei.as_uri()})
    time.sleep(2.6)
    for _ in range(40):
        v, _ = js(ws, "document.getElementById('app')?.children.length || 0", warten=False)
        if (v or 0) > 0:
            break
        time.sleep(0.5)
    wert, fehler = js(ws, MESSUNG, warten=True)
    if wert is None:
        return {"profil": name, "fehler": ["Messskript abgebrochen: " + str(fehler)]}
    wert["profil"] = name
    wert["soll"] = {"breite": breite, "hoehe": hoehe, "dpr": dpr}
    wert["beruehrung"] = beruehrung
    return wert


def schuss(ws, ziel: Path):
    r = ws.rufen("Page.captureScreenshot", {"format": "png"})
    ziel.parent.mkdir(parents=True, exist_ok=True)
    ziel.write_bytes(base64.b64decode(r["data"]))


def drucke(aus: dict, breite_konsole: int = 100) -> tuple[int, int]:
    gruen, rot, hinweise = pruefe(aus)
    print(f"\n  Profil {aus.get('profil')}  Anzeige {aus.get('breite')}×{aus.get('hoehe')} px "
          f"(Layout {aus.get('layoutBreite')}, innerWidth {aus.get('innerBreite')}), "
          f"{'grob (Finger)' if aus.get('grob') else 'fein (Maus)'}"
          + (f", Netz {aus['netz']['geraete']} Geräte/{aus['netz']['kabel']} Kabel" if aus.get("netz") else ""))
    for e in aus.get("ebenen", []):
        if not e.get("offen"):
            print(f"    Ebene {e['nr']:>2} {e['name']:<38} NICHT GEÖFFNET")
            continue
        m = e["masse"]
        zusatz = []
        if e.get("abgeschnitten"):
            zusatz.append("ABGESCHNITTEN in " + e["abgeschnitten"]["behaelter"])
        if e.get("verdecktVon"):
            zusatz.append("VERDECKT von " + e["verdecktVon"]["tag"] + "." + e["verdecktVon"]["klasse"])
        if e.get("zuKlein"):
            zusatz.append(f"{len(e['zuKlein'])} unter 44 px")
        if e.get("ueberlauf", {}).get("x"):
            zusatz.append(f"Überlauf x {e['ueberlauf']['x']}")
        print(f"    Ebene {e['nr']:>2} {e['name']:<38} x{m['x']:>4} y{m['y']:>4} {m['w']:>4}×{m['h']:<4} "
              f"drin={'ja' if e.get('drin') else 'NEIN'}  {' · '.join(zusatz)}")
    for r in aus.get("reiter", []):
        print(f"    Reiter „{r['name']}“: {r['inhalt']} {r['masse'] if r['masse'] else ''} "
              f"{'ABGESCHNITTEN' if r.get('abgeschnitten') else 'ok'}")
    for n in aus.get("notizen", []):
        print(f"    Hinweis: {n}")
    print(f"  {'GRÜN' if not rot else 'ROT'}: {len(gruen)} Kriterien erfüllt, {len(rot)} verletzt, "
          f"{len(hinweise)} Hinweis(e)")
    for name, wert in rot:
        print(f"    ✗ {name}  {json.dumps(wert, ensure_ascii=False)[:breite_konsole]}")
    for name, wert in hinweise:
        print(f"    · {name}  {json.dumps(wert, ensure_ascii=False)[:breite_konsole]}")
    return len(gruen), len(rot)


def main() -> int:
    ap = argparse.ArgumentParser(description="Tiefe Menüebenen in einem echten Browser vermessen")
    ap.add_argument("--datei", type=Path, default=HIER / "docs" / "index.html")
    ap.add_argument("--profil", default="telefon-hoch", choices=sorted(PROFILE))
    ap.add_argument("--lauf", action="store_true", help="alle Profile")
    ap.add_argument("--port", type=int, default=0, help="Steuerport (0 = freier Port)")
    ap.add_argument("--json", type=Path, help="Ergebnisse zusätzlich als JSON schreiben")
    ap.add_argument("--bild-ordner", type=Path, help="je Profil ein Bildschirmfoto hierhin")
    ap.add_argument("--ohne-bild", action="store_true")
    a = ap.parse_args()

    datei = a.datei.resolve()
    if not datei.is_file():
        print(f"FEHLER: {datei} fehlt.")
        return 2
    port = a.port or _freier_port()
    profile = sorted(PROFILE) if a.lauf else [a.profil]

    arbeits = HIER / "Nachweise" / "experten"
    arbeits.mkdir(parents=True, exist_ok=True)
    seite = arbeits / "_menueprobe-seite.html"
    seite.write_text(datei.read_text(encoding="utf-8").replace("<head>", "<head>" + FEHLERSAMMLER, 1),
                     encoding="utf-8", newline="\n")
    profilordner = arbeits / f"_menueprobe-profil-{port}"

    print("Menüprobe — tiefer genestete Menüs, in einem echten Browser gemessen")
    print(f"  Datei  {datei}")
    print(f"  Profil(e)  {', '.join(profile)}")
    p = subprocess.Popen(
        [str(browser()), "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
         "--disable-sync", "--disable-extensions", "--disable-component-update", "--no-service-autorun",
         "--disable-background-networking", "--disable-client-side-phishing-detection",
         f"--window-size={max(b for b, *_ in PROFILE.values())},{max(h for _, h, *_ in PROFILE.values())}",
         f"--remote-debugging-port={port}", f"--user-data-dir={profilordner}", "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    ergebnisse, gruen, rot = [], 0, 0
    try:
        ws = WS(warte_auf_port(port))
        ws.fehler = []
        ws.rufen("Runtime.enable")
        ws.rufen("Page.enable")
        ws.rufen("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
        for name in profile:
            breite, hoehe, dpr, ausrichtung, beruehrung = PROFILE[name]
            try:
                ws.rufen("Emulation.setTouchEmulationEnabled",
                         {"enabled": beruehrung, "maxTouchPoints": 5 if beruehrung else 1})
            except SystemExit as e:
                print(f"  (Hinweis: Berührung konnte nicht gesetzt werden: {e})")
            try:
                aus = messe_profil(ws, seite, name, breite, hoehe, dpr, ausrichtung, beruehrung)
            except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, OSError) as e:
                print(f"\nROT: Verbindung zum Browser abgebrochen ({e}).")
                return 1
            ergebnisse.append(aus)
            g, r = drucke(aus)
            gruen += g
            rot += r
            if a.bild_ordner and not a.ohne_bild:
                schuss(ws, Path(a.bild_ordner) / f"menue-{name}.png")
    finally:
        p.terminate()
        try:
            p.wait(timeout=15)
        except subprocess.TimeoutExpired:
            p.kill()
        shutil.rmtree(profilordner, ignore_errors=True)
        seite.unlink(missing_ok=True)

    if a.json:
        Path(a.json).parent.mkdir(parents=True, exist_ok=True)
        Path(a.json).write_text(json.dumps(ergebnisse, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"\n  JSON {a.json}")
    print(f"\n  {'GRÜN' if not rot else 'ROT'}: {len(profile)} Profil(e), {gruen} Kriterien erfüllt, {rot} verletzt")
    return 1 if rot else 0


def _freier_port() -> int:
    import socket
    s = socket.socket()
    try:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]
    finally:
        s.close()


if __name__ == "__main__":
    raise SystemExit(main())
